"""Read helpers over the knowledge base.

Thin, read-only accessors on top of `store`, so pages never touch the raw JSON.
Everything reflects admin edits immediately because `store` owns the cache.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from . import store

UPLOAD_DIR = store.UPLOAD_DIR
FALLBACK_LOGO = store.FALLBACK_LOGO


def settings() -> dict[str, Any]:
    return store.load().get("settings", dict(store.DEFAULT_SETTINGS))


def categories(active_only: bool = True) -> list[dict[str, Any]]:
    items = store.load().get("categories", [])
    if active_only:
        items = [c for c in items if c.get("isActive", True)]
    return sorted(items, key=lambda c: c.get("sortOrder", 0))


def failure_types(active_only: bool = True) -> list[dict[str, Any]]:
    items = store.load().get("failureTypes", [])
    if active_only:
        items = [f for f in items if f.get("isActive", True)]
    return sorted(items, key=lambda f: (f.get("categoryId", 0), f.get("sortOrder", 0)))


def root_causes(active_only: bool = True) -> list[dict[str, Any]]:
    items = store.load().get("rootCauses", [])
    if active_only:
        items = [r for r in items if r.get("isActive", True)]
    return sorted(items, key=lambda r: (r.get("failureTypeId", 0), r.get("rank", 0)))


def category(category_id: int) -> dict[str, Any] | None:
    return next((c for c in categories(False) if c["id"] == category_id), None)


def failure_type(failure_type_id: int) -> dict[str, Any] | None:
    return next((f for f in failure_types(False) if f["id"] == failure_type_id), None)


def failure_types_of(category_id: int, active_only: bool = True) -> list[dict[str, Any]]:
    return [f for f in failure_types(active_only) if f["categoryId"] == category_id]


def root_causes_of(failure_type_id: int, active_only: bool = True) -> list[dict[str, Any]]:
    return [r for r in root_causes(active_only) if r["failureTypeId"] == failure_type_id]


def steps_of(root_cause: dict[str, Any]) -> list[str]:
    return [s["instruction"] for s in root_cause.get("steps", []) if s.get("type") == "step"]


def checks_of(root_cause: dict[str, Any]) -> list[str]:
    return [s["instruction"] for s in root_cause.get("steps", []) if s.get("type") == "check"]


def image_path(stored_path: str | None) -> Path | None:
    """Map a stored path like '/uploads/<name>.webp' to a local file."""
    return store.resolve_image(stored_path)


def logo_path() -> Path | None:
    """Branding logo, falling back to the bundled placeholder."""
    return image_path(settings().get("logoPath")) or (
        FALLBACK_LOGO if FALLBACK_LOGO.exists() else None
    )


def search_failure_types(query: str, limit: int = 10) -> list[dict[str, Any]]:
    needle = (query or "").strip().lower()
    if not needle:
        return []
    matches = [f for f in failure_types() if needle in f["name"].lower()]
    return sorted(matches, key=lambda f: f["name"])[:limit]


def counts() -> dict[str, int]:
    return {
        "categories": len(categories(False)),
        "failureTypes": len(failure_types(False)),
        "rootCauses": len(root_causes(False)),
    }
