"""Fully-local lexical retrieval (BM25).

No model, no network, no external services — pure Python. This mirrors the
TypeScript implementation used by the React build so both apps rank the same way.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Generic, Iterable, TypeVar

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "was",
    "were", "be", "been", "it", "its", "this", "that", "these", "those", "with", "as",
    "at", "by", "from", "how", "what", "why", "when", "which", "who", "do", "does",
    "did", "i", "we", "you", "my", "me", "can", "could", "should", "would", "will",
    "have", "has", "get", "got", "there", "about", "into", "out", "if", "so", "not",
    "no", "any", "some", "please", "help", "need", "want", "tell", "show", "give",
    "they", "them",
}

# Domain synonyms so "crimping" also matches "crimp", "wire" matches "strand", etc.
SYNONYM_GROUPS: list[list[str]] = [
    ["crimp", "crimping", "crimped"],
    ["strand", "strands", "wire", "wires", "conductor"],
    ["seal", "sealing", "sealed", "gasket"],
    ["strip", "stripping", "stripped"],
    ["insulation", "insulator", "sheath", "jacket"],
    ["terminal", "terminals", "contact", "pin"],
    ["applicator", "applicators", "tooling", "die"],
    ["bellmouth", "bell", "mouth"],
    ["height", "dimension", "spec", "specification", "tolerance"],
    ["splay", "splayed", "spread", "loose"],
    ["cut", "cutting", "nicked", "nick", "damaged", "damage"],
    ["position", "positioning", "alignment", "aligned", "centered", "center"],
    ["missing", "absent", "without"],
    ["cause", "causes", "reason", "reasons", "root"],
    ["fix", "fixing", "repair", "solve", "solution", "correct", "action", "remedy"],
    ["check", "checks", "verify", "inspect", "inspection", "control"],
    ["step", "steps", "procedure", "instruction", "instructions", "process"],
]

_SYNONYM_INDEX: dict[str, list[str]] = {}
for _group in SYNONYM_GROUPS:
    for _word in _group:
        _SYNONYM_INDEX[_word] = _group

_WORD_RE = re.compile(r"[^a-z0-9\s]")


def _singularise(word: str) -> str:
    """Light singularisation: trims a trailing 's' on longer words."""
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def tokenize(text: str) -> list[str]:
    raw = _WORD_RE.sub(" ", (text or "").lower()).split()
    tokens: list[str] = []
    for token in raw:
        if token in STOPWORDS or len(token) < 2:
            continue
        tokens.append(token)
        singular = _singularise(token)
        if singular != token:
            tokens.append(singular)
    return tokens


# Synonyms broaden recall, but must never outweigh the words actually typed —
# otherwise "damaged seal" scores higher on "strands cut/nicked" (damaged→cut)
# than on "Seal damaged".
SYNONYM_WEIGHT = 0.3


def expand_query_tokens(tokens: Iterable[str]) -> dict[str, float]:
    """Map query terms to weights: 1.0 for typed words, less for synonyms."""
    weights: dict[str, float] = {}
    for token in tokens:
        weights[token] = 1.0
        group = _SYNONYM_INDEX.get(token) or _SYNONYM_INDEX.get(_singularise(token))
        for candidate in group or []:
            # Keep the higher weight if a word is both typed and a synonym.
            weights[candidate] = max(weights.get(candidate, 0.0), SYNONYM_WEIGHT)
    return weights


T = TypeVar("T")


@dataclass
class IndexedDoc(Generic[T]):
    ref: T
    tokens: list[str] = field(default_factory=list)


class Bm25Index(Generic[T]):
    """A BM25 index over an arbitrary set of documents."""

    K1 = 1.5
    B = 0.75

    def __init__(self, docs: list[IndexedDoc[T]]) -> None:
        self.docs = docs
        self.tf: list[dict[str, int]] = []
        self.df: dict[str, int] = {}
        total = 0
        for doc in docs:
            counts: dict[str, int] = {}
            for token in doc.tokens:
                counts[token] = counts.get(token, 0) + 1
            self.tf.append(counts)
            for token in counts:
                self.df[token] = self.df.get(token, 0) + 1
            total += len(doc.tokens)
        self.avgdl = (total / len(docs)) if docs else 0.0

    def _idf(self, term: str) -> float:
        n = len(self.docs)
        df = self.df.get(term, 0)
        if df == 0:
            return 0.0
        return math.log(1 + (n - df + 0.5) / (df + 0.5))

    def search(self, query_terms: dict[str, float]) -> list[tuple[T, float]]:
        """Return every doc with a positive score, ranked high → low.

        `query_terms` maps each term to a weight (see `expand_query_tokens`).
        """
        results: list[tuple[T, float]] = []
        for i, doc in enumerate(self.docs):
            counts = self.tf[i]
            dl = len(doc.tokens)
            score = 0.0
            for term, weight in query_terms.items():
                freq = counts.get(term)
                if not freq:
                    continue
                denom = freq + self.K1 * (1 - self.B + (self.B * dl) / (self.avgdl or 1))
                score += weight * self._idf(term) * ((freq * (self.K1 + 1)) / denom)
            if score > 0:
                results.append((doc.ref, score))
        results.sort(key=lambda pair: pair[1], reverse=True)
        return results
