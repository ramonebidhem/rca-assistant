"""Library views: home, category and failure-type detail."""

from __future__ import annotations

import streamlit as st

from . import data, ui


def _tile(record: dict, kind: str) -> None:
    with st.container(border=True):
        img = data.image_path(record.get("imagePath"))
        if img:
            st.image(str(img), width="stretch")
        ui.code_tag(record["code"])
        st.markdown(f"**{record['name']}**")
        if kind == "category":
            st.caption(f"{record.get('failureTypeCount', 0)} failure types")
            target = {"view": "category", "id": record["id"]}
        else:
            st.caption(f"{record.get('rootCauseCount', 0)} root causes")
            target = {"view": "failure_type", "id": record["id"]}
        if st.button(
            "Explore", key=f"{kind}-{record['id']}", width="stretch",
            icon=":material/arrow_forward:",
        ):
            ui.goto(**target)


def _grid(records: list[dict], kind: str) -> None:
    if not records:
        st.info("Nothing published here yet.")
        return
    columns = st.columns(3)
    for i, record in enumerate(records):
        with columns[i % 3]:
            _tile(record, kind)


def _media(root_cause: dict) -> None:
    media = {m["kind"]: m for m in root_cause.get("media", [])}
    if not media:
        return
    left, right = st.columns(2)
    for column, kind, css, sub in (
        (left, "OK", "yz-okbar", "Conform"),
        (right, "NG", "yz-ngbar", "Non-conform"),
    ):
        with column:
            st.html(f'<div class="{css}"><span>{kind}</span><span>{sub}</span></div>')
            item = media.get(kind)
            img = data.image_path(item.get("filePath")) if item else None
            if img:
                st.image(str(img), width="stretch")
            else:
                st.caption(f"No {kind} image")
            if item and item.get("caption"):
                st.caption(item["caption"])


def home() -> None:
    cfg = data.settings()
    ui.hero(
        cfg.get("slogan") or "Find the cause. Fix it right.",
        "Validated root causes for wire-harness manufacturing defects — "
        "crimping, sealing and stripping.",
        label="Root cause analysis",
    )

    counts = data.counts()
    with st.container(horizontal=True):
        st.metric("Categories", counts["categories"], border=True)
        st.metric("Failure types", counts["failureTypes"], border=True)
        st.metric("Root causes", counts["rootCauses"], border=True)

    st.write("")
    query = st.text_input(
        "Search", placeholder="Search a failure type, e.g. bellmouth",
        icon=":material/search:", label_visibility="collapsed",
    )
    if query:
        matches = data.search_failure_types(query)
        if not matches:
            st.caption("No matching failure type.")
        for ft in matches:
            if st.button(
                f"{ft['name']}  ·  {ft.get('categoryName', '')}",
                key=f"search-{ft['id']}", width="stretch",
            ):
                ui.goto(view="failure_type", id=ft["id"])

    st.write("")
    ui.eyebrow("Process categories")
    _grid(data.categories(), "category")


def category(category_id: int) -> None:
    cat = data.category(category_id)
    if not cat:
        st.error("Category not found.")
        return

    ui.crumb(f"Library › {cat['name']}")
    if st.button("Back to library", icon=":material/arrow_back:"):
        ui.goto(view="home")

    ui.eyebrow(cat["code"])
    st.header(cat["name"])
    if cat.get("description"):
        st.caption(cat["description"])
    st.write("")
    _grid(data.failure_types_of(category_id), "failure_type")


def failure_type(failure_type_id: int) -> None:
    ft = data.failure_type(failure_type_id)
    if not ft:
        st.error("Failure type not found.")
        return

    ui.crumb(f"Library › {ft.get('categoryName', '')} › {ft['name']}")
    if st.button(
        f"Back to {ft.get('categoryName', 'category')}", icon=":material/arrow_back:"
    ):
        ui.goto(view="category", id=ft["categoryId"])

    ui.eyebrow(f"{ft.get('categoryName', '')} · {ft['code']}")
    st.header(ft["name"])
    if ft.get("description"):
        st.caption(ft["description"])

    causes = data.root_causes_of(failure_type_id)
    st.markdown(f"**{len(causes)} documented root cause(s)**")
    st.write("")

    for i, rc in enumerate(causes, start=1):
        with st.container(border=True):
            with st.container(horizontal=True, vertical_alignment="center"):
                st.subheader(str(i))
                with st.container():
                    ui.code_tag(rc["code"])
                    st.markdown(f"**{rc['title']}**")
            if rc.get("description"):
                st.write(rc["description"])

            steps, checks = data.steps_of(rc), data.checks_of(rc)
            if steps or checks:
                col_a, col_b = st.columns(2)
                with col_a:
                    if steps:
                        st.markdown("**:material/list_alt: Steps to follow**")
                        for n, step in enumerate(steps, start=1):
                            st.markdown(f"{n}. {step}")
                with col_b:
                    if checks:
                        st.markdown("**:material/task_alt: Checks to do**")
                        for check in checks:
                            st.markdown(f"- {check}")
            _media(rc)
