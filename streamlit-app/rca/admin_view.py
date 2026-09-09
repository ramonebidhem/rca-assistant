"""Admin — manage the defect library and branding.

Access control
--------------
With an OIDC provider configured under `[auth]` in secrets, sign-in uses
`st.login()` and access is limited to `admin_emails`. Without a provider the
admin is only reachable from localhost, so a published deployment is never
left editable by anonymous visitors.
"""

from __future__ import annotations

import streamlit as st

from . import data, store, ui

IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]


# --------------------------------------------------------------------------- #
# Access control
# --------------------------------------------------------------------------- #
def _auth_configured() -> bool:
    try:
        return "auth" in st.secrets
    except Exception:
        return False


def _is_local() -> bool:
    try:
        host = (st.context.headers or {}).get("host", "")
    except Exception:
        return False
    return host.startswith(("localhost", "127.0.0.1", "0.0.0.0", "[::1]"))


def _allowed_emails() -> list[str]:
    try:
        return [e.lower() for e in st.secrets.get("admin_emails", [])]
    except Exception:
        return []


def _gate() -> bool:
    if _auth_configured():
        if not st.user.is_logged_in:
            ui.eyebrow("Restricted")
            st.header("Admin sign-in")
            st.write("Sign in with your organisation account to manage the library.")
            st.button("Sign in", type="primary", icon=":material/login:", on_click=st.login)
            return False

        allowed = _allowed_emails()
        if allowed and (st.user.email or "").lower() not in allowed:
            st.error(f"{st.user.email} is not authorised to administer this platform.")
            st.button("Sign out", icon=":material/logout:", on_click=st.logout)
            return False

        with st.container(horizontal=True, vertical_alignment="center"):
            st.caption(f"Signed in as **{st.user.email}**")
            st.button("Sign out", icon=":material/logout:", on_click=st.logout)
        return True

    if _is_local():
        st.warning(
            "Running locally without an identity provider — the admin is "
            "unauthenticated. Configure `[auth]` in secrets before exposing it.",
            icon=":material/warning:",
        )
        return True

    ui.eyebrow("Restricted")
    st.header("Admin is disabled")
    st.write(
        "This deployment has no identity provider configured, so editing is "
        "disabled to keep the published library read-only."
    )
    st.markdown(
        "To enable it, add an OIDC provider under `[auth]` in "
        "`.streamlit/secrets.toml` (plus `admin_emails`), then redeploy — or run "
        "the app locally, where the admin is available."
    )
    return False


def _saved(message: str) -> None:
    st.toast(message, icon=":material/check_circle:")
    st.rerun()


def _reorder_row(prefix: str, item_id: int, move) -> None:
    with st.container(horizontal=True):
        if st.button("Move up", key=f"{prefix}u-{item_id}", icon=":material/arrow_upward:"):
            move(item_id, -1)
            st.rerun()
        if st.button("Move down", key=f"{prefix}d-{item_id}", icon=":material/arrow_downward:"):
            move(item_id, 1)
            st.rerun()


def _delete_row(prefix: str, item_id: int, label: str, warning: str, delete) -> None:
    confirm = st.checkbox(warning, key=f"{prefix}chk-{item_id}")
    if st.button(
        label, key=f"{prefix}btn-{item_id}", disabled=not confirm, icon=":material/delete:"
    ):
        delete(item_id)
        _saved(f"{label.split()[-1].capitalize()} deleted")


# --------------------------------------------------------------------------- #
# Content levels
# --------------------------------------------------------------------------- #
def _categories_admin() -> None:
    for cat in data.categories(False):
        label = f"{cat['code']} · {cat['name']}"
        if not cat.get("isActive", True):
            label += "  (hidden)"
        with st.expander(label):
            with st.form(f"cat-{cat['id']}"):
                name = st.text_input("Name", value=cat["name"])
                description = st.text_area("Description", value=cat.get("description") or "")
                active = st.toggle("Visible in the library", value=cat.get("isActive", True))
                image = st.file_uploader(
                    "Replace image", type=IMAGE_TYPES, key=f"cat-img-{cat['id']}"
                )
                if st.form_submit_button("Save", type="primary", icon=":material/save:"):
                    fields = {"name": name, "description": description, "isActive": active}
                    if image is not None:
                        fields["imagePath"] = store.save_image(image)
                    store.update_category(cat["id"], **fields)
                    _saved("Category saved")

            _reorder_row("c", cat["id"], store.move_category)
            _delete_row(
                "cdel", cat["id"], "Delete category",
                "Confirm deletion (removes its failure types and root causes)",
                store.delete_category,
            )

    st.divider()
    with st.form("new-category", clear_on_submit=True):
        st.markdown("**Add a category**")
        name = st.text_input("Name", key="nc-name")
        description = st.text_area("Description", key="nc-desc")
        image = st.file_uploader("Image", type=IMAGE_TYPES, key="nc-img")
        if st.form_submit_button("Create", type="primary", icon=":material/add:"):
            if not name.strip():
                st.error("A name is required.")
            else:
                path = store.save_image(image) if image is not None else None
                store.add_category(name.strip(), description.strip(), path)
                _saved("Category created")


def _failure_types_admin() -> None:
    cats = data.categories(False)
    if not cats:
        st.info("Create a category first.")
        return
    chosen = st.selectbox(
        "Category", cats, format_func=lambda c: f"{c['code']} · {c['name']}"
    )

    for ft in data.failure_types_of(chosen["id"], active_only=False):
        label = f"{ft['code']} · {ft['name']}"
        if not ft.get("isActive", True):
            label += "  (hidden)"
        with st.expander(label):
            with st.form(f"ft-{ft['id']}"):
                name = st.text_input("Name", value=ft["name"])
                description = st.text_area("Description", value=ft.get("description") or "")
                active = st.toggle("Visible in the library", value=ft.get("isActive", True))
                image = st.file_uploader(
                    "Replace image", type=IMAGE_TYPES, key=f"ft-img-{ft['id']}"
                )
                if st.form_submit_button("Save", type="primary", icon=":material/save:"):
                    fields = {"name": name, "description": description, "isActive": active}
                    if image is not None:
                        fields["imagePath"] = store.save_image(image)
                    store.update_failure_type(ft["id"], **fields)
                    _saved("Failure type saved")

            _reorder_row("f", ft["id"], store.move_failure_type)
            _delete_row(
                "fdel", ft["id"], "Delete failure type",
                "Confirm deletion (removes its root causes)",
                store.delete_failure_type,
            )

    st.divider()
    with st.form("new-ft", clear_on_submit=True):
        st.markdown(f"**Add a failure type to {chosen['name']}**")
        name = st.text_input("Name", key="nf-name")
        description = st.text_area("Description", key="nf-desc")
        image = st.file_uploader("Image", type=IMAGE_TYPES, key="nf-img")
        if st.form_submit_button("Create", type="primary", icon=":material/add:"):
            if not name.strip():
                st.error("A name is required.")
            else:
                path = store.save_image(image) if image is not None else None
                store.add_failure_type(chosen["id"], name.strip(), description.strip(), path)
                _saved("Failure type created")


def _root_causes_admin() -> None:
    cats = data.categories(False)
    if not cats:
        st.info("Create a category first.")
        return
    chosen_cat = st.selectbox(
        "Category", cats, format_func=lambda c: f"{c['code']} · {c['name']}", key="rc-cat"
    )
    fts = data.failure_types_of(chosen_cat["id"], active_only=False)
    if not fts:
        st.info("Create a failure type in this category first.")
        return
    chosen_ft = st.selectbox(
        "Failure type", fts, format_func=lambda f: f"{f['code']} · {f['name']}", key="rc-ft"
    )

    for rc in data.root_causes_of(chosen_ft["id"], active_only=False):
        label = f"{rc['code']} · {rc['title']}"
        if not rc.get("isActive", True):
            label += "  (hidden)"
        with st.expander(label):
            with st.form(f"rc-{rc['id']}"):
                title = st.text_input("Title", value=rc["title"])
                description = st.text_area("Description", value=rc.get("description") or "")
                steps = st.text_area(
                    "Steps to follow (one per line)",
                    value="\n".join(data.steps_of(rc)), height=140,
                )
                checks = st.text_area(
                    "Checks to do (one per line)",
                    value="\n".join(data.checks_of(rc)), height=100,
                )
                active = st.toggle("Visible in the library", value=rc.get("isActive", True))
                col_ok, col_ng = st.columns(2)
                with col_ok:
                    ok_img = st.file_uploader(
                        "OK reference image", type=IMAGE_TYPES, key=f"ok-{rc['id']}"
                    )
                with col_ng:
                    ng_img = st.file_uploader(
                        "NG reference image", type=IMAGE_TYPES, key=f"ng-{rc['id']}"
                    )
                if st.form_submit_button("Save", type="primary", icon=":material/save:"):
                    store.update_root_cause(
                        rc["id"], title=title, description=description,
                        steps=steps.splitlines(), checks=checks.splitlines(),
                        is_active=active,
                    )
                    if ok_img is not None:
                        store.set_media(rc["id"], "OK", store.save_image(ok_img), "Conform reference")
                    if ng_img is not None:
                        store.set_media(rc["id"], "NG", store.save_image(ng_img), chosen_ft["name"])
                    _saved("Root cause saved")

            _reorder_row("r", rc["id"], store.move_root_cause)
            _delete_row(
                "rdel", rc["id"], "Delete root cause", "Confirm deletion",
                store.delete_root_cause,
            )

    st.divider()
    with st.form("new-rc", clear_on_submit=True):
        st.markdown(f"**Add a root cause to {chosen_ft['name']}**")
        title = st.text_input("Title", key="nr-title")
        description = st.text_area("Description", key="nr-desc")
        steps = st.text_area("Steps to follow (one per line)", key="nr-steps")
        checks = st.text_area("Checks to do (one per line)", key="nr-checks")
        if st.form_submit_button("Create", type="primary", icon=":material/add:"):
            if not title.strip():
                st.error("A title is required.")
            else:
                store.add_root_cause(
                    chosen_ft["id"], title.strip(), description.strip(),
                    steps.splitlines(), checks.splitlines(),
                )
                _saved("Root cause created")


def _branding_admin() -> None:
    cfg = data.settings()
    left, right = st.columns([1, 2])
    with left:
        st.markdown("**Logo**")
        ui.logo_preview(180)
        st.caption(
            "PNG with a transparent background works best. Shown on a dark tile "
            "because the artwork is white."
        )
    with right:
        with st.form("branding"):
            site_name = st.text_input("Site name", value=cfg.get("siteName", ""))
            slogan = st.text_input("Slogan", value=cfg.get("slogan", ""))
            scale = st.slider(
                "Logo size (%)", min_value=40, max_value=240,
                value=int(cfg.get("logoScale", 100) or 100), step=5,
            )
            new_logo = st.file_uploader("Replace logo", type=IMAGE_TYPES, key="logo-up")
            if st.form_submit_button("Save changes", type="primary", icon=":material/save:"):
                fields = {"siteName": site_name, "slogan": slogan, "logoScale": scale}
                if new_logo is not None:
                    fields["logoPath"] = store.save_image(new_logo)
                store.update_settings(**fields)
                _saved("Branding updated")


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
def render() -> None:
    if not _gate():
        return

    tab_overview, tab_content, tab_branding = st.tabs(
        ["Overview", "Content manager", "Branding"]
    )

    with tab_overview:
        ui.eyebrow("Overview")
        st.header("Library at a glance")
        counts = data.counts()
        with st.container(horizontal=True):
            st.metric("Categories", counts["categories"], border=True)
            st.metric("Failure types", counts["failureTypes"], border=True)
            st.metric("Root causes", counts["rootCauses"], border=True)

        hidden = [c for c in data.categories(False) if not c.get("isActive", True)]
        if hidden:
            st.caption(f"{len(hidden)} category(ies) hidden from the public library.")

        st.divider()
        st.markdown("**Backup**")
        st.caption("Write a copy of the knowledge base next to the original.")
        if st.button("Create backup", icon=":material/save:"):
            path = store.backup()
            st.success(f"Saved to `{path.name}`")

    with tab_content:
        ui.eyebrow("Content manager")
        st.header("Categories, failure types and root causes")
        level = st.segmented_control(
            "Level", ["Categories", "Failure types", "Root causes"],
            default="Categories", label_visibility="collapsed",
        )
        if level == "Failure types":
            _failure_types_admin()
        elif level == "Root causes":
            _root_causes_admin()
        else:
            _categories_admin()

    with tab_branding:
        ui.eyebrow("Configure")
        st.header("Branding")
        _branding_admin()
