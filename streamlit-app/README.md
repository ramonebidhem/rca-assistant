# RCA Assistant — Streamlit edition

A Python/Streamlit build of the wire-harness defect knowledge platform: browse
the defect library and ask a **local RAG assistant** questions about it.

Self-contained by design — the knowledge base ships as JSON and the images as
files, so there is **no database, no API keys and no external LLM service**.

```
streamlit-app/
├── streamlit_app.py        single-page router (no sidebar, no nav bar)
├── requirements.txt
├── .streamlit/config.toml  Yazaki theme; hides the Deploy toolbar
├── data/knowledge.json     content + branding
├── assets/uploads/         images
└── rca/
    ├── store.py            read/write persistence + derived fields
    ├── data.py             read helpers
    ├── retrieval.py        BM25 (pure Python, no dependencies)
    ├── assistant.py        conversational grounded answers
    ├── chat.py             floating assistant launcher + dialog
    ├── views.py            library views
    ├── admin_view.py       admin (content + branding)
    └── ui.py               brand bar and shared styling
```

## Design

Styled after the Yazaki corporate site: brand red **#E60012** (sampled from the
logo), white ground, squared industrial edges and uppercase section labels with
a red rule. The brand bar is dark because the logo artwork is white.

There is **no sidebar and no navigation bar** — the library is browsed inline,
the assistant lives behind a floating launcher (bottom-right, like the React
build) and the admin is reached from the link in the brand bar. Streamlit's
Deploy toolbar is hidden via `toolbarMode = "viewer"`.

## Admin

`?view=admin`, or the **Admin** link in the brand bar. It offers the same
capabilities as the React admin: dashboard counters, full CRUD for categories,
failure types and root causes (with reordering, visibility toggles, a steps &
checks editor and OK/NG image uploads) and branding (site name, slogan, logo,
logo size).

Access is gated:

- With an OIDC provider under `[auth]` in `.streamlit/secrets.toml`, sign-in
  uses `st.login()` and is restricted to the addresses in `admin_emails`.
- Without a provider the admin is reachable **only from localhost**, so a
  published deployment stays read-only.

Edits are written back to `data/knowledge.json` and `assets/uploads/`. On
Streamlit Community Cloud the filesystem is ephemeral, so edit locally and push
the updated files.

---

## Run locally

```bash
cd streamlit-app
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/streamlit run streamlit_app.py
```

Opens at http://localhost:8501.

---

## Publish free on Streamlit Community Cloud

Streamlit Community Cloud hosts public apps for free, with **no credit card**.
You need a Streamlit account (sign in with GitHub — one click).

### 1. Push this repo to GitHub

Already done if you are using `ramonebidhem/rca-assistant`. Otherwise:

```bash
git add -A && git commit -m "Add Streamlit app" && git push
```

### 2. Create the app

1. Go to **https://share.streamlit.io** and click **Sign in with GitHub**.
   Authorise Streamlit to read your repositories.
2. Click **Create app** → **Deploy a public app from GitHub**.
3. Fill in:

   | Field | Value |
   | --- | --- |
   | Repository | `ramonebidhem/rca-assistant` |
   | Branch | `main` |
   | Main file path | `streamlit-app/streamlit_app.py` |

4. (Optional) Click **Advanced settings** and pick **Python 3.12**.
5. Click **Deploy**.

The first build takes 1–3 minutes while it installs `streamlit`.

Your app will be live at a URL like:

```
https://rca-assistant.streamlit.app
```

You can rename it under **Settings → General → App URL**.

### 3. Updating the app

Streamlit Cloud redeploys automatically on every push to `main`:

```bash
git add -A && git commit -m "Update content" && git push
```

---

## Refreshing the content

The bundled knowledge base is exported from the main app's database. After
editing content in the React admin panel, re-export and copy it here:

```bash
# from the repository root, with the database running
cd backend && npx tsx prisma/export-static.ts
cd ..
cp frontend/src/data/knowledge.json streamlit-app/data/knowledge.json
cp frontend/public/uploads/* streamlit-app/assets/uploads/
```

Then commit and push — Streamlit Cloud redeploys on its own.

---

## Notes and limits

- **Read-only.** Streamlit Community Cloud has an ephemeral filesystem, so
  edits made at runtime would not survive a restart. Content is managed in the
  React admin panel and exported here.
- **Public.** Community Cloud apps are publicly reachable. Private apps require
  a paid Streamlit plan.
- **Sleeps when idle.** Free apps go to sleep after a period of inactivity and
  wake on the next visit (a few seconds).
- **The assistant is fully local.** Retrieval is BM25 in pure Python — no model
  download, no API key, no external service. It handles greetings, remembers the
  topic so short follow-ups ("what about the checks?") work, and suggests next
  questions. Because it composes answers from your documented steps and checks,
  it cannot hallucinate.
