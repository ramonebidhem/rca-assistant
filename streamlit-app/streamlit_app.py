"""RCA Assistant — Streamlit edition.

A read-only viewer over the wire-harness defect knowledge base, plus a local
RAG assistant. Everything is bundled: no database, no external LLM API.
"""

from __future__ import annotations

from typing import Any

import streamlit as st

from rca import assistant, data

st.set_page_config(
    page_title=f"{data.settings().get('siteName', 'RCA Assistant')}",
    page_icon="🔧",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --------------------------------------------------------------------------- #
# Styling — industrial, high contrast, generous tap targets for shop floor use
# --------------------------------------------------------------------------- #
st.markdown(
    """
    <style>
      .block-container { padding-top: 2rem; max-width: 1200px; }
      .id-tag {
        display:inline-block; background:#EDF0F3; color:#64748B;
        font-family: ui-monospace, monospace; font-size:11px; font-weight:600;
        letter-spacing:.06em; padding:2px 8px; border-radius:6px;
      }
      .rc-card {
        border:1px solid #E2E8F0; border-radius:14px; background:#fff;
        padding:18px 20px; margin-bottom:18px;
      }
      .rc-head { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
      .rc-num {
        width:38px; height:38px; border-radius:12px; background:#1450E0; color:#fff;
        display:flex; align-items:center; justify-content:center; font-weight:800;
        flex:0 0 auto;
      }
      .rc-title { font-size:1.05rem; font-weight:700; color:#0F1419; }
      .panel-steps { background:#F8FAFC; border:1px solid #E8EDF3; border-radius:10px; padding:12px 14px; }
      .panel-checks { background:#E7F4EC; border:1px solid #C6E5D2; border-radius:10px; padding:12px 14px; }
      .panel-title { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; margin-bottom:8px; }
      .steps-t { color:#1450E0; } .checks-t { color:#17843F; }
      .ok-bar, .ng-bar {
        color:#fff; font-weight:800; font-size:11px; letter-spacing:.08em;
        padding:5px 10px; border-radius:8px 8px 0 0; text-transform:uppercase;
        display:flex; justify-content:space-between;
      }
      .ok-bar { background:#17843F; } .ng-bar { background:#C21807; }
      .eyebrow { color:#1450E0; font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
      .muted { color:#64748B; }
    </style>
    """,
    unsafe_allow_html=True,
)


# --------------------------------------------------------------------------- #
# Navigation helpers (query params keep views shareable/bookmarkable)
# --------------------------------------------------------------------------- #
def goto(view: str, item_id: int | None = None) -> None:
    st.query_params.clear()
    st.query_params["view"] = view
    if item_id is not None:
        st.query_params["id"] = str(item_id)
    st.rerun()


def current_view() -> tuple[str, int | None]:
    view = st.query_params.get("view", "home")
    raw_id = st.query_params.get("id")
    try:
        item_id = int(raw_id) if raw_id is not None else None
    except (TypeError, ValueError):
        item_id = None
    return view, item_id


# --------------------------------------------------------------------------- #
# Sidebar — branding, search, navigation
# --------------------------------------------------------------------------- #
def render_sidebar() -> None:
    cfg = data.settings()
    logo = data.logo_path()
    if logo:
        st.sidebar.image(str(logo), width=170)
    st.sidebar.markdown(f"### {cfg.get('siteName', 'RCA Assistant')}")
    if cfg.get("slogan"):
        st.sidebar.caption(cfg["slogan"])
    st.sidebar.divider()

    if st.sidebar.button("🏠  Browse library", width="stretch"):
        goto("home")
    if st.sidebar.button("💬  Ask the assistant", width="stretch"):
        goto("assistant")

    st.sidebar.divider()
    query = st.sidebar.text_input("Search a failure type", placeholder="e.g. bellmouth")
    if query:
        matches = data.search_failure_types(query)
        if not matches:
            st.sidebar.caption("No matching failure type.")
        for ft in matches:
            if st.sidebar.button(
                f"{ft['name']}", key=f"search-{ft['id']}", width="stretch"
            ):
                goto("failure_type", ft["id"])

    st.sidebar.divider()
    st.sidebar.caption(
        f"{len(data.categories())} categories · {len(data.failure_types())} failure types · "
        f"{len(data.root_causes())} root causes"
    )


# --------------------------------------------------------------------------- #
# Views
# --------------------------------------------------------------------------- #
def render_home() -> None:
    cfg = data.settings()
    st.markdown('<div class="eyebrow">Root cause analysis</div>', unsafe_allow_html=True)
    st.title(cfg.get("slogan") or "Find the cause. Fix it right.")
    st.markdown(
        '<p class="muted">Browse validated root causes for wire-harness manufacturing defects.</p>',
        unsafe_allow_html=True,
    )
    st.subheader("Select a process category")

    cats = data.categories()
    columns = st.columns(min(3, max(1, len(cats))))
    for i, cat in enumerate(cats):
        with columns[i % len(columns)]:
            with st.container(border=True):
                img = data.image_path(cat.get("imagePath"))
                if img:
                    st.image(str(img), width="stretch")
                st.markdown(f'<span class="id-tag">{cat["code"]}</span>', unsafe_allow_html=True)
                st.markdown(f"**{cat['name']}**")
                st.caption(f"{cat.get('failureTypeCount', 0)} failure types")
                if st.button("Open", key=f"cat-{cat['id']}", width="stretch"):
                    goto("category", cat["id"])


def render_category(category_id: int) -> None:
    cat = data.category(category_id)
    if not cat:
        st.error("Category not found.")
        return

    st.caption("Home  ›  " + cat["name"])
    st.markdown(f'<span class="id-tag">{cat["code"]}</span>', unsafe_allow_html=True)
    st.title(cat["name"])
    if cat.get("description"):
        st.markdown(f'<p class="muted">{cat["description"]}</p>', unsafe_allow_html=True)

    fts = data.failure_types_of(category_id)
    columns = st.columns(min(3, max(1, len(fts))))
    for i, ft in enumerate(fts):
        with columns[i % len(columns)]:
            with st.container(border=True):
                img = data.image_path(ft.get("imagePath"))
                if img:
                    st.image(str(img), width="stretch")
                st.markdown(f'<span class="id-tag">{ft["code"]}</span>', unsafe_allow_html=True)
                st.markdown(f"**{ft['name']}**")
                st.caption(f"{ft.get('rootCauseCount', 0)} root causes")
                if st.button("Open", key=f"ft-{ft['id']}", width="stretch"):
                    goto("failure_type", ft["id"])


def _render_media(root_cause: dict[str, Any]) -> None:
    media = {m["kind"]: m for m in root_cause.get("media", [])}
    ok_media, ng_media = media.get("OK"), media.get("NG")
    if not ok_media and not ng_media:
        return
    left, right = st.columns(2)
    for column, item, css, label, sub in (
        (left, ok_media, "ok-bar", "OK", "Conform"),
        (right, ng_media, "ng-bar", "NG", "Non-conform"),
    ):
        with column:
            st.markdown(
                f'<div class="{css}"><span>{label}</span><span>{sub}</span></div>',
                unsafe_allow_html=True,
            )
            img = data.image_path(item.get("filePath")) if item else None
            if img:
                st.image(str(img), width="stretch")
            else:
                st.caption(f"No {label} image")
            if item and item.get("caption"):
                st.caption(item["caption"])


def render_failure_type(failure_type_id: int) -> None:
    ft = data.failure_type(failure_type_id)
    if not ft:
        st.error("Failure type not found.")
        return

    st.caption(f"Home  ›  {ft.get('categoryName', '')}  ›  {ft['name']}")
    st.markdown(f'<span class="id-tag">{ft["code"]}</span>', unsafe_allow_html=True)
    st.title(ft["name"])
    if ft.get("description"):
        st.markdown(f'<p class="muted">{ft["description"]}</p>', unsafe_allow_html=True)

    if st.button("← Back to " + (ft.get("categoryName") or "category")):
        goto("category", ft["categoryId"])

    causes = data.root_causes_of(failure_type_id)
    st.markdown(f"**{len(causes)} documented root cause(s)**")

    for i, rc in enumerate(causes, start=1):
        with st.container(border=True):
            st.markdown(
                f'<div class="rc-head"><div class="rc-num">{i}</div>'
                f'<div><span class="id-tag">{rc["code"]}</span>'
                f'<div class="rc-title">{rc["title"]}</div></div></div>',
                unsafe_allow_html=True,
            )
            if rc.get("description"):
                st.write(rc["description"])

            steps, checks = data.steps_of(rc), data.checks_of(rc)
            if steps or checks:
                col_a, col_b = st.columns(2)
                with col_a:
                    if steps:
                        st.markdown(
                            '<div class="panel-title steps-t">Steps to follow</div>',
                            unsafe_allow_html=True,
                        )
                        for n, step in enumerate(steps, start=1):
                            st.markdown(f"{n}. {step}")
                with col_b:
                    if checks:
                        st.markdown(
                            '<div class="panel-title checks-t">Checks to do</div>',
                            unsafe_allow_html=True,
                        )
                        for check in checks:
                            st.markdown(f"- ☑ {check}")

            _render_media(rc)


def render_assistant() -> None:
    st.markdown('<div class="eyebrow">Local · grounded in platform data</div>', unsafe_allow_html=True)
    st.title("AI Assistant")
    st.caption(
        "Ask about any documented defect. Answers are retrieved from this platform's "
        "root-cause library — no external AI service is used."
    )

    if "chat" not in st.session_state:
        st.session_state.chat = []

    with st.expander("Example questions", expanded=not st.session_state.chat):
        examples = [
            "How do I fix strands out of the crimp?",
            "What checks should I do for a damaged seal?",
            "List all defects in stripping",
        ]
        for example in examples:
            if st.button(example, key=f"ex-{example}", width="stretch"):
                st.session_state.pending = example
                st.rerun()

    for message in st.session_state.chat:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            for source in message.get("sources", []):
                if st.button(
                    f"📄 {source['label']}",
                    key=f"src-{source['key']}",
                    help=source.get("sublabel"),
                ):
                    goto(source["view"], source["id"])

    question = st.chat_input("Ask about a defect…")
    if not question and st.session_state.get("pending"):
        question = st.session_state.pop("pending")

    if question:
        st.session_state.chat.append({"role": "user", "content": question})
        answer = assistant.ask(question)
        sources = [
            {
                "label": s.label,
                "sublabel": s.sublabel,
                "view": "category" if s.kind == "category" else "failure_type",
                "id": s.target_id,
                "key": f"{len(st.session_state.chat)}-{s.target_id}",
            }
            for s in answer.sources
            if s.target_id is not None
        ]
        st.session_state.chat.append(
            {"role": "assistant", "content": answer.text, "sources": sources}
        )
        st.rerun()


# --------------------------------------------------------------------------- #
# Router
# --------------------------------------------------------------------------- #
render_sidebar()
view, item_id = current_view()

if view == "category" and item_id is not None:
    render_category(item_id)
elif view == "failure_type" and item_id is not None:
    render_failure_type(item_id)
elif view == "assistant":
    render_assistant()
else:
    render_home()
