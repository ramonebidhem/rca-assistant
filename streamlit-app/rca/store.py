"""Read/write access to the bundled knowledge base.

The whole platform lives in `data/knowledge.json` plus image files under
`assets/uploads/`. That keeps the app self-contained (no database), while still
allowing the admin pages to create and edit content.

Derived fields (codes, child counts) are recomputed on every save so they can
never drift from the underlying records.
"""

from __future__ import annotations

import json
import shutil
import threading
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "knowledge.json"
UPLOAD_DIR = ROOT / "assets" / "uploads"
FALLBACK_LOGO = ROOT / "assets" / "logo.png"

_lock = threading.Lock()
_cache: dict[str, Any] | None = None
_version = 0

DEFAULT_SETTINGS = {
    "siteName": "RCA Assistant",
    "slogan": "Quality Defects & Root Cause Knowledge Platform",
    "logoPath": None,
    "logoScale": 100,
}


# --------------------------------------------------------------------------- #
# Load / save
# --------------------------------------------------------------------------- #
def load() -> dict[str, Any]:
    """Return the knowledge base, reading from disk on first use."""
    global _cache
    if _cache is None:
        with _lock:
            if _cache is None:
                with DATA_FILE.open(encoding="utf-8") as fh:
                    _cache = json.load(fh)
                _cache.setdefault("settings", dict(DEFAULT_SETTINGS))
                for key in ("categories", "failureTypes", "rootCauses"):
                    _cache.setdefault(key, [])
    return _cache


def invalidate() -> None:
    global _cache, _version
    _cache = None
    _version += 1


def version() -> int:
    """Bumped on every write; lets callers cache derived structures."""
    return _version


def save(kb: dict[str, Any] | None = None) -> None:
    """Recompute derived fields and persist to disk atomically."""
    kb = kb if kb is not None else load()
    _recompute(kb)
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(kb, fh, indent=2, ensure_ascii=False)
    tmp.replace(DATA_FILE)
    global _cache, _version
    _cache = kb
    _version += 1


def _recompute(kb: dict[str, Any]) -> None:
    """Re-derive codes, ordering and counts from the records themselves."""
    cats = sorted(kb.get("categories", []), key=lambda c: c.get("sortOrder", 0))
    for ci, cat in enumerate(cats, start=1):
        cat["sortOrder"] = ci
        cat["code"] = f"CAT-{ci:02d}"

        fts = sorted(
            [f for f in kb.get("failureTypes", []) if f["categoryId"] == cat["id"]],
            key=lambda f: f.get("sortOrder", 0),
        )
        for fi, ft in enumerate(fts, start=1):
            ft["sortOrder"] = fi
            ft["code"] = f"FT-{ci:02d}{fi}"
            ft["categoryName"] = cat["name"]

            rcs = sorted(
                [r for r in kb.get("rootCauses", []) if r["failureTypeId"] == ft["id"]],
                key=lambda r: r.get("rank", 0),
            )
            for ri, rc in enumerate(rcs, start=1):
                rc["rank"] = ri
                rc["code"] = f"RC-{ri:03d}"
            ft["rootCauseCount"] = len(rcs)

        cat["failureTypeCount"] = len(fts)

    kb["categories"] = cats


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _next_id(items: list[dict[str, Any]]) -> int:
    return (max((i["id"] for i in items), default=0)) + 1


def save_image(uploaded_file: Any) -> str:
    """Persist an uploaded image and return its stored path."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(uploaded_file.name).suffix.lower() or ".png"
    if suffix not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        suffix = ".png"
    name = f"upload-{uuid.uuid4()}{suffix}"
    (UPLOAD_DIR / name).write_bytes(uploaded_file.getbuffer())
    return f"/uploads/{name}"


def resolve_image(stored_path: str | None) -> Path | None:
    if not stored_path:
        return None
    candidate = UPLOAD_DIR / Path(stored_path).name
    return candidate if candidate.exists() else None


def backup() -> Path:
    """Copy the current knowledge base next to the original (safety net)."""
    target = DATA_FILE.with_name("knowledge.backup.json")
    shutil.copyfile(DATA_FILE, target)
    return target


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
def update_settings(**fields: Any) -> None:
    kb = load()
    kb.setdefault("settings", dict(DEFAULT_SETTINGS)).update(
        {k: v for k, v in fields.items() if v is not None}
    )
    save(kb)


# --------------------------------------------------------------------------- #
# Categories
# --------------------------------------------------------------------------- #
def add_category(name: str, description: str = "", image_path: str | None = None) -> int:
    kb = load()
    new_id = _next_id(kb["categories"])
    kb["categories"].append(
        {
            "id": new_id,
            "name": name,
            "description": description,
            "imagePath": image_path,
            "sortOrder": len(kb["categories"]) + 1,
            "isActive": True,
            "failureTypeCount": 0,
        }
    )
    save(kb)
    return new_id


def update_category(category_id: int, **fields: Any) -> None:
    kb = load()
    for cat in kb["categories"]:
        if cat["id"] == category_id:
            cat.update({k: v for k, v in fields.items() if v is not None})
    save(kb)


def delete_category(category_id: int) -> None:
    """Remove a category and everything beneath it."""
    kb = load()
    ft_ids = [f["id"] for f in kb["failureTypes"] if f["categoryId"] == category_id]
    kb["rootCauses"] = [r for r in kb["rootCauses"] if r["failureTypeId"] not in ft_ids]
    kb["failureTypes"] = [f for f in kb["failureTypes"] if f["categoryId"] != category_id]
    kb["categories"] = [c for c in kb["categories"] if c["id"] != category_id]
    save(kb)


def move_category(category_id: int, delta: int) -> None:
    kb = load()
    cats = sorted(kb["categories"], key=lambda c: c.get("sortOrder", 0))
    idx = next((i for i, c in enumerate(cats) if c["id"] == category_id), None)
    if idx is None:
        return
    new_idx = max(0, min(len(cats) - 1, idx + delta))
    cats.insert(new_idx, cats.pop(idx))
    for i, cat in enumerate(cats, start=1):
        cat["sortOrder"] = i
    save(kb)


# --------------------------------------------------------------------------- #
# Failure types
# --------------------------------------------------------------------------- #
def add_failure_type(
    category_id: int, name: str, description: str = "", image_path: str | None = None
) -> int:
    kb = load()
    new_id = _next_id(kb["failureTypes"])
    siblings = [f for f in kb["failureTypes"] if f["categoryId"] == category_id]
    kb["failureTypes"].append(
        {
            "id": new_id,
            "categoryId": category_id,
            "name": name,
            "description": description,
            "imagePath": image_path,
            "sortOrder": len(siblings) + 1,
            "isActive": True,
            "rootCauseCount": 0,
        }
    )
    save(kb)
    return new_id


def update_failure_type(failure_type_id: int, **fields: Any) -> None:
    kb = load()
    for ft in kb["failureTypes"]:
        if ft["id"] == failure_type_id:
            ft.update({k: v for k, v in fields.items() if v is not None})
    save(kb)


def delete_failure_type(failure_type_id: int) -> None:
    kb = load()
    kb["rootCauses"] = [r for r in kb["rootCauses"] if r["failureTypeId"] != failure_type_id]
    kb["failureTypes"] = [f for f in kb["failureTypes"] if f["id"] != failure_type_id]
    save(kb)


def move_failure_type(failure_type_id: int, delta: int) -> None:
    kb = load()
    target = next((f for f in kb["failureTypes"] if f["id"] == failure_type_id), None)
    if target is None:
        return
    siblings = sorted(
        [f for f in kb["failureTypes"] if f["categoryId"] == target["categoryId"]],
        key=lambda f: f.get("sortOrder", 0),
    )
    idx = next(i for i, f in enumerate(siblings) if f["id"] == failure_type_id)
    new_idx = max(0, min(len(siblings) - 1, idx + delta))
    siblings.insert(new_idx, siblings.pop(idx))
    for i, ft in enumerate(siblings, start=1):
        ft["sortOrder"] = i
    save(kb)


# --------------------------------------------------------------------------- #
# Root causes
# --------------------------------------------------------------------------- #
def add_root_cause(
    failure_type_id: int,
    title: str,
    description: str = "",
    steps: list[str] | None = None,
    checks: list[str] | None = None,
) -> int:
    kb = load()
    new_id = _next_id(kb["rootCauses"])
    siblings = [r for r in kb["rootCauses"] if r["failureTypeId"] == failure_type_id]
    kb["rootCauses"].append(
        {
            "id": new_id,
            "failureTypeId": failure_type_id,
            "title": title,
            "description": description,
            "rank": len(siblings) + 1,
            "isActive": True,
            "steps": _build_steps(steps or [], checks or []),
            "media": [],
        }
    )
    save(kb)
    return new_id


def _build_steps(steps: list[str], checks: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    n = 1
    for text in [s for s in steps if s.strip()]:
        rows.append({"id": n, "stepNo": n, "instruction": text.strip(), "type": "step"})
        n += 1
    for text in [c for c in checks if c.strip()]:
        rows.append({"id": n, "stepNo": n, "instruction": text.strip(), "type": "check"})
        n += 1
    return rows


def update_root_cause(
    root_cause_id: int,
    title: str | None = None,
    description: str | None = None,
    steps: list[str] | None = None,
    checks: list[str] | None = None,
    is_active: bool | None = None,
) -> None:
    kb = load()
    for rc in kb["rootCauses"]:
        if rc["id"] != root_cause_id:
            continue
        if title is not None:
            rc["title"] = title
        if description is not None:
            rc["description"] = description
        if is_active is not None:
            rc["isActive"] = is_active
        if steps is not None or checks is not None:
            rc["steps"] = _build_steps(steps or [], checks or [])
    save(kb)


def delete_root_cause(root_cause_id: int) -> None:
    kb = load()
    kb["rootCauses"] = [r for r in kb["rootCauses"] if r["id"] != root_cause_id]
    save(kb)


def move_root_cause(root_cause_id: int, delta: int) -> None:
    kb = load()
    target = next((r for r in kb["rootCauses"] if r["id"] == root_cause_id), None)
    if target is None:
        return
    siblings = sorted(
        [r for r in kb["rootCauses"] if r["failureTypeId"] == target["failureTypeId"]],
        key=lambda r: r.get("rank", 0),
    )
    idx = next(i for i, r in enumerate(siblings) if r["id"] == root_cause_id)
    new_idx = max(0, min(len(siblings) - 1, idx + delta))
    siblings.insert(new_idx, siblings.pop(idx))
    for i, rc in enumerate(siblings, start=1):
        rc["rank"] = i
    save(kb)


def set_media(root_cause_id: int, kind: str, file_path: str, caption: str = "") -> None:
    """Set (or replace) the OK / NG reference image for a root cause."""
    kb = load()
    for rc in kb["rootCauses"]:
        if rc["id"] != root_cause_id:
            continue
        media = [m for m in rc.get("media", []) if m["kind"] != kind]
        media.append(
            {
                "id": max((m["id"] for m in rc.get("media", [])), default=0) + 1,
                "kind": kind,
                "filePath": file_path,
                "caption": caption or None,
            }
        )
        rc["media"] = media
    save(kb)
