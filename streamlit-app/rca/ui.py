"""Shared UI shell for the Yazaki-inspired look.

Colours, fonts and radii come from `.streamlit/config.toml`. The CSS here is
limited to things Streamlit has no native equivalent for: the dark brand bar
(the logo artwork is white and needs a dark ground), the red section rules and
the floating assistant button.
"""

from __future__ import annotations

import base64
import mimetypes
from pathlib import Path

import streamlit as st

from . import data

BRAND_RED = "#E60012"
INK = "#0E1116"

_CSS = f"""
<style>
  /* Streamlit's default top padding is too generous for a brand bar. */
  .block-container {{ padding-top: 1.2rem; max-width: 1180px; }}

  .yz-topbar {{
    display: flex; align-items: center; gap: 1.25rem;
    background: {INK}; padding: 0.85rem 1.4rem;
    border-bottom: 3px solid {BRAND_RED}; margin-bottom: 1.6rem;
  }}
  .yz-topbar img {{ display: block; height: auto; }}
  .yz-name {{ color: #fff; font-weight: 800; font-size: 1.02rem; line-height: 1.2; }}
  .yz-slogan {{
    color: #98A2AE; font-size: 0.68rem; letter-spacing: 0.14em;
    text-transform: uppercase; margin-top: 2px;
  }}
  .yz-topbar .yz-actions {{ margin-left: auto; display: flex; gap: 0.6rem; }}
  .yz-topbar a {{
    color: #C9D1DA; text-decoration: none; font-size: 0.78rem; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.18); padding: 0.42rem 0.85rem;
  }}
  .yz-topbar a:hover {{ color: #fff; border-color: rgba(255,255,255,0.45); }}

  .yz-eyebrow {{
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: {BRAND_RED}; margin-bottom: 0.3rem;
  }}
  .yz-rule {{ width: 52px; height: 4px; background: {BRAND_RED}; margin-bottom: 1rem; }}

  .yz-hero {{
    background: {INK}; padding: 2.5rem 2.3rem; margin-bottom: 1.6rem;
    border-left: 6px solid {BRAND_RED};
  }}
  .yz-hero h1 {{
    color: #fff; font-size: 2.2rem; line-height: 1.14; font-weight: 800;
    margin: 0.15rem 0 0.55rem 0;
  }}
  .yz-hero p {{ color: #B4BCC6; margin: 0; font-size: 1rem; }}

  .yz-code {{
    display: inline-block; font-family: ui-monospace, monospace;
    font-size: 0.66rem; font-weight: 700; letter-spacing: 0.08em;
    color: #5A6472; background: #F0F2F5; padding: 2px 8px;
    border: 1px solid #E1E5EA;
  }}
  .yz-crumb {{ font-size: 0.8rem; color: #6B7480; margin-bottom: 0.5rem; }}

  .yz-okbar, .yz-ngbar {{
    display: flex; justify-content: space-between; color: #fff;
    font-size: 0.66rem; font-weight: 700; letter-spacing: 0.09em;
    text-transform: uppercase; padding: 5px 10px;
  }}
  .yz-okbar {{ background: #17843F; }}
  .yz-ngbar {{ background: {BRAND_RED}; }}

  .yz-logo-preview {{
    display: inline-flex; align-items: center; justify-content: center;
    background: {INK}; padding: 14px 18px; border: 1px solid #E1E5EA;
  }}

  /* Floating assistant launcher, pinned bottom-right like the React build. */
  .st-key-fab_ask {{
    position: fixed; right: 26px; bottom: 26px; z-index: 1000; width: auto;
  }}
  .st-key-fab_ask button {{
    border-radius: 999px !important;
    padding: 0.8rem 1.35rem !important;
    box-shadow: 0 12px 30px rgba(14,17,22,0.28);
    font-weight: 700 !important;
  }}
</style>
"""


def _data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def inject_css() -> None:
    st.html(_CSS)


def eyebrow(text: str) -> None:
    st.html(f'<div class="yz-eyebrow">{text}</div><div class="yz-rule"></div>')


def hero(title: str, subtitle: str = "", label: str = "") -> None:
    label_html = f'<div class="yz-eyebrow">{label}</div>' if label else ""
    sub_html = f"<p>{subtitle}</p>" if subtitle else ""
    st.html(f'<div class="yz-hero">{label_html}<h1>{title}</h1>{sub_html}</div>')


def code_tag(text: str) -> None:
    st.html(f'<span class="yz-code">{text}</span>')


def crumb(text: str) -> None:
    st.html(f'<div class="yz-crumb">{text}</div>')


def brand_bar(admin: bool = False) -> None:
    """Dark brand bar with a discreet entry point to the other area."""
    cfg = data.settings()
    logo = data.logo_path()
    width = max(60, int(150 * int(cfg.get("logoScale", 100) or 100) / 100))

    logo_html = f'<img src="{_data_uri(logo)}" width="{width}" alt="" />' if logo else ""
    slogan = cfg.get("slogan") or ""
    slogan_html = f'<div class="yz-slogan">{slogan}</div>' if slogan else ""
    link = (
        '<a href="?view=home" target="_self">Library</a>'
        if admin
        else '<a href="?view=admin" target="_self">Admin</a>'
    )

    st.html(
        f'<div class="yz-topbar">{logo_html}'
        f'<div><div class="yz-name">{cfg.get("siteName", "RCA Assistant")}</div>'
        f"{slogan_html}</div>"
        f'<div class="yz-actions">{link}</div></div>'
    )


def logo_preview(width: int = 180) -> None:
    """Show the branding logo on a dark tile (the artwork is white)."""
    logo = data.logo_path()
    if not logo:
        st.caption("No logo set.")
        return
    st.html(
        f'<div class="yz-logo-preview"><img src="{_data_uri(logo)}" '
        f'width="{width}" alt="" /></div>'
    )


def goto(**params: object) -> None:
    st.query_params.clear()
    for key, value in params.items():
        if value is not None:
            st.query_params[key] = str(value)
    st.rerun()
