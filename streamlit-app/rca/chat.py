"""Floating AI assistant: a pinned launcher plus a chat dialog.

Mirrors the React build's bottom-right "Ask AI" affordance. Answers come from
the local retrieval assistant — no external service and no API key.
"""

from __future__ import annotations

import streamlit as st

from . import assistant as rag
from . import ui

OPENERS = [
    "How do I fix strands out of the crimp?",
    "What checks should I do for a damaged seal?",
    "List all defects in stripping",
]


def _init() -> None:
    st.session_state.setdefault("chat", [])
    st.session_state.setdefault("chat_focus", None)
    st.session_state.setdefault("chat_pending", None)


def _answer(question: str) -> None:
    """Resolve a question and append both turns to the transcript."""
    st.session_state.chat.append({"role": "user", "content": question})
    result = rag.ask(question, focus_id=st.session_state.chat_focus)
    if result.focus_id is not None:
        st.session_state.chat_focus = result.focus_id
    st.session_state.chat.append(
        {
            "role": "assistant",
            "content": result.text,
            "followups": result.followups,
            "sources": [
                {
                    "label": s.label,
                    "sublabel": s.sublabel,
                    "view": "category" if s.kind == "category" else "failure_type",
                    "id": s.target_id,
                }
                for s in result.sources
                if s.target_id is not None
            ],
        }
    )


@st.dialog("AI assistant", width="large")
def _dialog() -> None:
    _init()

    # Resolve anything queued by a click in the previous fragment run.
    if st.session_state.chat_pending:
        _answer(st.session_state.chat_pending)
        st.session_state.chat_pending = None

    st.caption(
        "Grounded in this platform's defect library — no external AI service is used."
    )

    if not st.session_state.chat:
        st.write("Ask about any documented defect, or start with:")
        for opener in OPENERS:
            if st.button(opener, key=f"open-{opener}", width="stretch"):
                st.session_state.chat_pending = opener
                st.rerun(scope="fragment")

    for i, message in enumerate(st.session_state.chat):
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

            for j, source in enumerate(message.get("sources", [])):
                if st.button(
                    source["label"],
                    key=f"src-{i}-{j}",
                    icon=":material/description:",
                    help=source.get("sublabel"),
                ):
                    ui.goto(view=source["view"], id=source["id"])

            for j, followup in enumerate(message.get("followups", [])):
                if st.button(followup, key=f"fu-{i}-{j}"):
                    st.session_state.chat_pending = followup
                    st.rerun(scope="fragment")

    with st.form("chat-form", clear_on_submit=True, border=False):
        question = st.text_input(
            "Your question",
            placeholder="Ask about a defect…",
            label_visibility="collapsed",
        )
        left, right = st.columns([3, 1])
        with left:
            sent = st.form_submit_button(
                "Send", type="primary", icon=":material/send:", width="stretch"
            )
        with right:
            cleared = st.form_submit_button("Clear", width="stretch")

    if sent and question.strip():
        st.session_state.chat_pending = question.strip()
        st.rerun(scope="fragment")
    if cleared:
        st.session_state.chat = []
        st.session_state.chat_focus = None
        st.rerun(scope="fragment")


def floating_button() -> None:
    """Render the pinned launcher (styled by `.st-key-fab_ask` in ui.py)."""
    _init()
    if st.button("Ask AI", key="fab_ask", type="primary", icon=":material/smart_toy:"):
        _dialog()
