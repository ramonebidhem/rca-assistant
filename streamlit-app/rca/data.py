"""Loads the bundled knowledge base (content + branding).

The JSON is exported from the main app's database, so this app needs no
database of its own and can be hosted as a plain Streamlit deployment.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "knowledge.json"
UPLOAD_DIR = ROOT / "assets" / "uploads"
FALLBACK_LOGO = ROOT / "assets" / "logo.png"


@lru_cache(maxsize=1)
def load() -> dict[str, Any]:
    with DATA_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


def settings() -> dict[str, Any]:
    return load().get("settings", {})


def categories() -> list[dict[str, Any]]:
    return load().get("categories", [])


def failure_types() -> list[dict[str, Any]]:
    return load().get("failureTypes", [])


def root_causes() -> list[dict[str, Any]]:
    return load().get("rootCauses", [])


def category(category_id: int) -> dict[str, Any] | None:
    return next((c for c in categories() if c["id"] == category_id), None)


def failure_type(failure_type_id: int) -> dict[str, Any] | None:
    return next((f for f in failure_types() if f["id"] == failure_type_id), None)


def failure_types_of(category_id: int) -> list[dict[str, Any]]:
    return [f for f in failure_types() if f["categoryId"] == category_id]


def root_causes_of(failure_type_id: int) -> list[dict[str, Any]]:
    return sorted(
        (r for r in root_causes() if r["failureTypeId"] == failure_type_id),
        key=lambda r: r["rank"],
    )


def steps_of(root_cause: dict[str, Any]) -> list[str]:
    return [s["instruction"] for s in root_cause.get("steps", []) if s["type"] == "step"]


def checks_of(root_cause: dict[str, Any]) -> list[str]:
    return [s["instruction"] for s in root_cause.get("steps", []) if s["type"] == "check"]


def image_path(stored_path: str | None) -> Path | None:
    """Map a stored path like '/uploads/<id>.webp' to a local file."""
    if not stored_path:
        return None
    candidate = UPLOAD_DIR / Path(stored_path).name
    return candidate if candidate.exists() else None


def logo_path() -> Path | None:
    """The branding logo, falling back to the bundled placeholder."""
    return image_path(settings().get("logoPath")) or (
        FALLBACK_LOGO if FALLBACK_LOGO.exists() else None
    )


def search_failure_types(query: str, limit: int = 10) -> list[dict[str, Any]]:
    needle = (query or "").strip().lower()
    if not needle:
        return []
    matches = [f for f in failure_types() if needle in f["name"].lower()]
    return sorted(matches, key=lambda f: f["name"])[:limit]
