"""RCA Assistant — wire-harness defect knowledge platform.

Single-page app: the library is browsed via query parameters, the assistant
lives behind a floating launcher, and the admin is reached from the brand bar.

Self-contained — content is `data/knowledge.json` plus images on disk, and the
assistant retrieves locally, so there is no database and no external AI service.
"""

from __future__ import annotations

import streamlit as st

from rca import admin_view, chat, data, ui

cfg = data.settings()
logo = data.logo_path()

st.set_page_config(
    page_title=cfg.get("siteName", "RCA Assistant"),
    page_icon=str(logo) if logo else ":material/build:",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ui.inject_css()


def _route() -> tuple[str, int | None]:
    view = st.query_params.get("view", "home")
    raw = st.query_params.get("id")
    try:
        item_id = int(raw) if raw is not None else None
    except (TypeError, ValueError):
        item_id = None
    return view, item_id


view, item_id = _route()
ui.brand_bar(admin=view == "admin")

if view == "admin":
    admin_view.render()
else:
    # Imported lazily so the admin never pays for the library view's work.
    from rca import views

    if view == "category" and item_id is not None:
        views.category(item_id)
    elif view == "failure_type" and item_id is not None:
        views.failure_type(item_id)
    else:
        views.home()

    # Floating assistant, mirroring the React build's bottom-right launcher.
    chat.floating_button()
