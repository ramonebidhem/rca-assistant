"""Local RAG assistant.

Retrieves over the bundled knowledge base with BM25 and composes a grounded
answer. Everything runs in-process: no external LLM API, no network calls.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Literal

from . import data
from .retrieval import Bm25Index, IndexedDoc, expand_query_tokens, tokenize

Intent = Literal["causes", "steps", "checks", "overview"]

MAX_ROOT_CAUSES = 3
MAX_ITEMS = 4


@dataclass
class Source:
    label: str
    sublabel: str | None = None
    kind: str = "failure_type"  # or "category"
    target_id: int | None = None


@dataclass
class Answer:
    matched: bool
    text: str
    sources: list[Source] = field(default_factory=list)
    suggestions: list[dict[str, Any]] = field(default_factory=list)


def _detect_intent(raw: str) -> Intent:
    q = raw.lower()
    if re.search(r"\b(check|checks|verify|verifi|inspect|control|confirm)\b", q):
        return "checks"
    if re.search(
        r"\b(fix|repair|solve|solution|correct|action|remedy|how\s+do|how\s+to|step|steps|procedure)\b",
        q,
    ):
        return "steps"
    if re.search(r"\b(cause|causes|reason|reasons|why|root)\b", q):
        return "causes"
    return "overview"


def _is_listy(raw: str) -> bool:
    return bool(re.search(r"\b(list|all|every|types|kinds|categor|defects|overview|which)\b", raw.lower()))


def _bulletize(items: list[str], max_items: int = MAX_ITEMS) -> str:
    shown = [f"- {s}" for s in items[:max_items]]
    if len(items) > max_items:
        shown.append(f"- …and {len(items) - max_items} more")
    return "\n".join(shown)


@lru_cache(maxsize=1)
def _index() -> Bm25Index[tuple[str, int]]:
    """Build the retrieval index once (cached for the process lifetime)."""
    docs: list[IndexedDoc[tuple[str, int]]] = []

    for cat in data.categories():
        names = [f["name"] for f in data.failure_types_of(cat["id"])]
        text = " \n ".join([cat["name"], cat.get("description") or "", *names])
        docs.append(IndexedDoc(("category", cat["id"]), tokenize(text)))

    for ft in data.failure_types():
        # Repeat the name so its terms carry weight, and include the category.
        text = " \n ".join(
            [ft["name"], ft["name"], ft.get("categoryName") or "", ft.get("description") or ""]
        )
        docs.append(IndexedDoc(("failure_type", ft["id"]), tokenize(text)))

    for rc in data.root_causes():
        ft = data.failure_type(rc["failureTypeId"]) or {}
        text = " \n ".join(
            [
                rc["title"],
                ft.get("name") or "",
                ft.get("categoryName") or "",
                rc.get("description") or "",
                *[s["instruction"] for s in rc.get("steps", [])],
                *[m.get("caption") or "" for m in rc.get("media", [])],
            ]
        )
        docs.append(IndexedDoc(("root_cause", rc["id"]), tokenize(text)))

    return Bm25Index(docs)


def ask(question: str) -> Answer:
    raw = (question or "").strip()
    results = _index().search(expand_query_tokens(tokenize(raw)))

    cat_score: dict[int, float] = {}
    ft_score: dict[int, float] = {}
    rc_score: dict[int, float] = {}
    for (kind, ref_id), score in results:
        if kind == "category":
            cat_score[ref_id] = score
        elif kind == "failure_type":
            ft_score[ref_id] = score
        else:
            rc_score[ref_id] = score

    # A failure type scores on its own match plus its best root cause.
    best_ft_id, best_ft_agg = -1, 0.0
    for ft in data.failure_types():
        child_best = max(
            (rc_score.get(rc["id"], 0.0) for rc in data.root_causes_of(ft["id"])),
            default=0.0,
        )
        agg = ft_score.get(ft["id"], 0.0) + child_best
        if agg > best_ft_agg:
            best_ft_id, best_ft_agg = ft["id"], agg

    best_cat_id, best_cat_score = -1, 0.0
    for cat_id, score in cat_score.items():
        if score > best_cat_score:
            best_cat_id, best_cat_score = cat_id, score

    if best_ft_agg == 0 and best_cat_score == 0:
        return _no_match()

    use_category = best_cat_score > 0 and (
        best_ft_agg == 0 or (_is_listy(raw) and best_cat_score >= best_ft_agg)
    )
    if use_category and data.failure_types_of(best_cat_id):
        return _category_overview(best_cat_id)

    if best_ft_id != -1 and best_ft_agg > 0:
        return _failure_type_answer(best_ft_id, rc_score, _detect_intent(raw))

    return _no_match()


def _no_match() -> Answer:
    cats = ", ".join(c["name"] for c in data.categories())
    examples = [f'*"{f["name"]}"*' for f in data.failure_types()[:2]]
    example_line = (
        f"\n\nTry naming a specific defect, for example {' or '.join(examples)}."
        if examples
        else ""
    )
    return Answer(
        matched=False,
        text=(
            "I couldn't find anything matching that in the defect library. I can answer "
            "questions grounded in the documented failure types and their root causes"
            + (f" across **{cats}**." if cats else ".")
            + example_line
        ),
        suggestions=[
            {"label": f["name"], "id": f["id"]} for f in data.failure_types()[:6]
        ],
    )


def _category_overview(category_id: int) -> Answer:
    cat = data.category(category_id) or {}
    fts = data.failure_types_of(category_id)
    listing = "\n".join(
        f"- **{f['name']}** — {f.get('rootCauseCount', 0)} documented root cause(s)" for f in fts
    )
    plural = "" if len(fts) == 1 else "s"
    return Answer(
        matched=True,
        text=(
            f"**{cat.get('name')}** covers {len(fts)} failure type{plural}:\n\n{listing}\n\n"
            "Open any of them to see the root causes, steps and OK/NG references."
        ),
        sources=[Source(label=cat.get("name", ""), sublabel="Category", kind="category", target_id=category_id)],
        suggestions=[{"label": f["name"], "id": f["id"]} for f in fts],
    )


def _failure_type_answer(failure_type_id: int, rc_score: dict[int, float], intent: Intent) -> Answer:
    ft = data.failure_type(failure_type_id) or {}
    causes = sorted(
        data.root_causes_of(failure_type_id),
        key=lambda r: (-rc_score.get(r["id"], 0.0), r["rank"]),
    )
    category_name = ft.get("categoryName", "")

    if not causes:
        return Answer(
            matched=True,
            text=f"**{ft.get('name')}** ({category_name}) is documented, but it has no root causes recorded yet.",
            sources=[Source(label=ft.get("name", ""), sublabel=category_name, target_id=failure_type_id)],
        )

    plural = "" if len(causes) == 1 else "s"
    if intent == "checks":
        lead = f"Here are the checks to perform for **{ft.get('name')}** ({category_name}):"
    elif intent == "steps":
        lead = f"Here's how to address **{ft.get('name')}** ({category_name}), by root cause:"
    elif intent == "causes":
        lead = f"**{ft.get('name')}** ({category_name}) has {len(causes)} documented root cause{plural}:"
    else:
        lead = (
            f"For **{ft.get('name')}** ({category_name}), the platform documents "
            f"{len(causes)} root cause{plural}. The most relevant:"
        )

    blocks: list[str] = []
    shown = causes[:MAX_ROOT_CAUSES]
    for i, rc in enumerate(shown, start=1):
        parts = [f"**{i}. {rc['title']}**"]
        if rc.get("description"):
            parts.append(rc["description"])
        steps = data.steps_of(rc)
        checks = data.checks_of(rc)
        if intent in ("steps", "overview") and steps:
            parts.append("Steps to follow:\n" + _bulletize(steps))
        if intent in ("checks", "overview") and checks:
            parts.append("Checks to do:\n" + _bulletize(checks))
        if intent == "checks" and not checks and steps:
            parts.append("Steps to follow:\n" + _bulletize(steps))
        blocks.append("\n\n".join(parts))

    text = lead + "\n\n" + "\n\n".join(blocks)
    if len(causes) > len(shown):
        rest = len(causes) - len(shown)
        text += (
            f"\n\n…and {rest} more root cause{'' if rest == 1 else 's'}. "
            "Open the failure type to see them all with OK/NG photos."
        )

    return Answer(
        matched=True,
        text=text,
        sources=[
            Source(
                label=ft.get("name", ""),
                sublabel=f"{category_name} · {len(causes)} root causes",
                target_id=failure_type_id,
            )
        ],
    )
