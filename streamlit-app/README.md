# RCA Assistant — Streamlit edition

A Python/Streamlit build of the wire-harness defect knowledge platform: browse
the defect library and ask a **local RAG assistant** questions about it.

Self-contained by design — the knowledge base ships as JSON and the images as
files, so there is **no database, no API keys and no external LLM service**.

```
streamlit-app/
├── streamlit_app.py        UI + routing
├── requirements.txt
├── .streamlit/config.toml  theme
├── data/knowledge.json     exported content + branding
├── assets/uploads/         images (246 files)
└── rca/
    ├── data.py             knowledge-base loader
    ├── retrieval.py        BM25 (pure Python, no dependencies)
    └── assistant.py        grounded answer composition
```

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
- **The assistant is fully local.** Retrieval is BM25 implemented in pure
  Python — it ranks identically to the TypeScript version used by the React build.
