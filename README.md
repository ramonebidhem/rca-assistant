# Défauthèque

A consultation-oriented **root cause analysis platform** for wire-harness manufacturing defects.

Shop-floor viewers (anonymous, tablet-friendly) browse a strict three-level defect
library — **Category → Failure Type → Root Cause** — and read validated fixes with
step/check instructions and OK/NG reference photos. Admins manage the content tree
and triage viewer-submitted suggestions. There are deliberately **no viewer ratings
or feedback controls**.

> Find the cause. Fix it right.

---

## Tech stack

| Layer     | Stack                                                                 |
| --------- | --------------------------------------------------------------------- |
| Frontend  | React + TypeScript + Vite + Tailwind CSS, React Router, TanStack Query |
| Backend   | Node.js + Express + TypeScript (REST API), zod validation             |
| Database  | PostgreSQL via Prisma ORM (migrations + seed)                         |
| Images    | Uploaded to disk, compressed to WebP (~500 KB) with sharp, served statically |
| Auth      | JWT for admin only, bcrypt password hashing; viewers are anonymous    |

Monorepo layout:

```
.
├── backend/            Express API, Prisma schema/seed, tests
├── frontend/           React + Vite SPA
├── Dockerfile          Single-service production image (API + built SPA)
├── render.yaml         One-click deploy blueprint
└── docker-compose.yml  postgres + app
```

In production the API also serves the built frontend, so the whole app runs as a
**single service behind one URL**. Uploaded images are stored **in PostgreSQL**
(table `uploaded_files`), so they survive restarts and redeploys without needing
a persistent volume.

---

## Quick start with Docker (recommended)

Requires Docker + Docker Compose.

```bash
docker compose up --build
```

On boot the app applies migrations and, **only if the database is empty**, seeds
the knowledge base (an existing database is never wiped).

- **App (UI + API)** → http://localhost:8080
- **PostgreSQL** → internal, plus host port `5432`

Database data persists in the `pgdata` volume.

---

## Local development (without Docker)

You need Node 20+ and a reachable PostgreSQL instance.

### 1. Start PostgreSQL

Any Postgres works. For example, with Docker:

```bash
docker run -d --name defautheque-pg \
  -e POSTGRES_USER=defautheque -e POSTGRES_PASSWORD=defautheque -e POSTGRES_DB=defautheque \
  -p 5432:5432 postgres:16-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # adjust DATABASE_URL to match your Postgres
npm install
npx prisma migrate dev        # create the schema
npm run seed                  # load categories, failure types, root causes, admin
npm run dev                   # API on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env          # leave VITE_API_URL empty for dev (uses Vite proxy)
npm install
npm run dev                   # app on http://localhost:5173
```

Vite proxies `/api` and `/uploads` to `http://localhost:4000`, so no CORS setup is
needed in development.

---

## Environment variables

### Backend (`backend/.env`)

| Variable        | Default                                   | Description                                   |
| --------------- | ----------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`  | `postgresql://…@localhost:5432/defautheque` | Postgres connection string                  |
| `JWT_SECRET`    | `change-this-jwt-secret-in-production`    | Secret used to sign admin JWTs — **change it** |
| `JWT_EXPIRES_IN`| `12h`                                     | Admin token lifetime                          |
| `PORT`          | `4000`                                     | API port                                      |
| `UPLOAD_DIR`    | `../uploads`                               | Where uploaded images are written             |
| `CORS_ORIGIN`   | `http://localhost:5173`                    | Comma-separated allowed frontend origins      |

### Frontend (`frontend/.env`)

| Variable       | Default | Description                                                        |
| -------------- | ------- | ----------------------------------------------------------------- |
| `VITE_API_URL` | *(empty)* | API origin for production builds. Empty in dev (Vite proxy used). |

---

## Default admin

The seed creates one admin user:

```
username: admin
password: ChangeMe123!
```

⚠ **Change this password immediately after the first login.** The seed prints a
reminder as well.

Log in at `/admin` (the discreet "Admin" link in the header).

---

## AI assistant (local RAG — no external LLM)

The app includes a **retrieval-augmented assistant** that answers questions grounded
in the platform's own data. It runs **100% locally with zero external API calls and no
model download** — retrieval is a self-contained BM25 lexical engine over the active
content tree (categories → failure types → root causes → steps → checks → captions).

- A floating **“Ask AI”** widget on every viewer page opens a chat panel.
- Ask about a defect (e.g. *“how do I fix strands out of the crimp?”*, *“what checks
  for a missing seal?”*, *“list defects in stripping”*) and the assistant retrieves the
  most relevant failure type, composes a grounded answer (root causes, steps, checks),
  and links to the source page. It answers **only** from documented content and says so
  when nothing matches.
- Intent-aware: emphasises steps for “how to fix”, checks for “what to verify”, causes
  for “why”.
- API: `POST /api/assistant/ask { question }` and `GET /api/assistant/status` (public).
- Implementation: `backend/src/rag/` (`knowledge.ts`, `retrieval.ts`,
  `assistant.service.ts`). No new dependencies.

## Deploying (shareable public URL)

The app deploys as **one web service + one Postgres database**. No persistent
disk is needed because images live in the database.

### Render (blueprint — easiest)

1. Push this repository to GitHub.
2. In [Render](https://render.com): **New → Blueprint**, connect the repo.
   Render reads `render.yaml` and creates the web service + database, wiring
   `DATABASE_URL` and generating `JWT_SECRET` automatically.
3. When prompted, set **`ADMIN_PASSWORD`** to a strong password (used only when
   the admin user is first created).
4. Deploy. First boot runs migrations and seeds the knowledge base.

Your public URL will look like `https://rca-assistant.onrender.com`.

> On Render's free plan the service sleeps after ~15 minutes idle (first request
> then takes ~30–60 s to wake), and free Postgres instances expire after 30 days.
> Upgrade the instance/database for a permanently warm deployment.

### Any other Docker host

The root `Dockerfile` is self-contained — it works on Railway, Fly.io, Google
Cloud Run, a VPS, etc. Provide these environment variables:

| Variable         | Required | Notes                                                |
| ---------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL`   | yes      | PostgreSQL connection string                          |
| `JWT_SECRET`     | yes      | Long random string                                    |
| `ADMIN_PASSWORD` | no       | Sets the admin password at first seed                 |
| `PORT`           | no       | Defaults to `4000`                                    |
| `CLIENT_DIR`     | no       | Defaults to `/app/client` in the image                |
| `CORS_ORIGIN`    | no       | Leave empty for a same-origin deployment              |

The container entrypoint runs `prisma migrate deploy`, seeds only when the
database is empty, then starts the server.

### Before sharing publicly

- **Change the admin password** (or set `ADMIN_PASSWORD`) — the default
  `ChangeMe123!` is for local development only.
- Viewers are anonymous and read-only; only `/admin` is protected.

---

## Branding (admin-managed)

The **site name**, **slogan**, and **logo** are editable from the admin panel under
**Branding** (`/admin/settings`). Changes apply everywhere immediately — the viewer
header/footer, the home hero, the browser tab title, and the admin login + sidebar.

- The logo is uploaded as a PNG (transparency preserved), resized and stored under
  `/uploads`. When no custom logo is set, the app falls back to the static
  `frontend/public/logo.png` placeholder.
- Settings are stored in a singleton `settings` row (seeded with the defaults
  “Défauthèque” / “Find the cause. Fix it right.”).
- API: `GET /api/settings` (public), `PATCH /api/admin/settings`,
  `POST /api/admin/settings/logo` (admin).

## Seed data

- **Categories:** Crimping, Seal, Stripping (with generated placeholder images).
- **Failure types** under each category (e.g. Crimping → *Strands out of the crimp*,
  *Strands on the crimp*, *Crimp height out of spec*, *Bellmouth non-conform*).
- **Root causes** for *Strands out of the crimp* — 5 ranked entries, each with two
  steps, one check, and OK/NG placeholder photos.

The `/public/logo.png` header logo is a generated placeholder — replace the file with
your real logo (same filename) to rebrand.

---

## Data model & rules

Strict 1:N hierarchy: `categories → failure_types → root_causes → {root_cause_steps, media}`,
plus `suggestions` and admin `users`.

Key enforced rules (see `backend/src/services/*.service.ts`):

- **A parent that has children can never be hard-deleted** — the API returns
  **409 Conflict** and the parent must be *deactivated* (`is_active = false`) instead.
- Foreign keys use `RESTRICT`; steps and media cascade with their root cause.
- Viewer endpoints only ever return **active** records; the admin API sees everything.
- Human-friendly monospace codes (`CAT-01`, `FT-011`, `RC-005`) are derived from sort
  order / rank and returned by the API.

---

## Suggestion workflow

1. A viewer opens a failure type and clicks **"Suggest a missing root cause"** →
   submits text (+ optional photo). Stored as a `pending` suggestion; a confirmation
   toast is shown.
2. An admin sees it under **Suggestions**.
   - **Approve** → the suggestion is marked approved and the admin is taken to a
     **pre-filled root-cause form** under the correct failure type.
   - **Reject** → requires a comment (enforced by the API).

---

## Tests

Backend tests (Vitest) cover the hierarchy business rules — active-only filtered
queries, deactivation-instead-of-deletion (409 on delete of a parent with children),
the suggestion approval flow, and the local RAG assistant.

```bash
cd backend
npm test
```

> Tests are **isolated** to a dedicated `test` Postgres schema (configured in
> `vitest.config.ts`, migrations applied automatically via `tests/globalSetup.ts`), so
> running them never touches your development/production data in the `public` schema.

---

## API surface (summary)

Public (no auth):

```
GET  /api/categories
GET  /api/categories/:id
GET  /api/failure-types/:id
GET  /api/search?q=…
POST /api/suggestions            (multipart: failureTypeId, text, photo?)
GET  /api/settings               (branding)
GET  /api/assistant/status
POST /api/assistant/ask          { question }
```

Auth:

```
POST /api/auth/login             { username, password } → { token }
GET  /api/auth/me
```

Admin (Bearer JWT), under `/api/admin`:

```
GET    /dashboard
CRUD   /categories, /failure-types, /root-causes   (+ /active, /reorder, /image, /media)
GET    /suggestions?status=…
POST   /suggestions/:id/approve
POST   /suggestions/:id/reject   { adminComment }
```
