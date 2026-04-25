# Phase 1: Foundation

**Goal:** Establish project scaffolding, Docker infrastructure, database schema, and Express skeleton so all subsequent phases have a runnable base.

---

## Context

ClubMS is a self-hosted, white-label University Club Management Platform. This phase creates the ground layer — no features work yet, but the app boots, connects to PostgreSQL, and serves a placeholder frontend.

**Stack:** React (Vite) + Node.js/Express + PostgreSQL + Prisma (v7) + Docker + shadcn/ui (v4) + Tailwind CSS (v4)

---

## Scope

### Must Complete
1. **Root `docker-compose.yml`** — 3 services: `db` (postgres:16-alpine), `backend`, `frontend`
2. **`.env.example`** — All env vars documented with placeholders
3. **Backend Dockerfile** — node:20-alpine, prisma generate, auto-migrate on start
4. **Frontend Dockerfile** — Multi-stage: build with node, serve with nginx:alpine
5. **`nginx.conf`** — SPA fallback + `/api/` reverse proxy to backend:4000
6. **Prisma schema** — All 4 models (User, Club, ClubMembership, Event) with enums
7. **Express entry point** (`src/index.js`) — Listens on PORT, health check endpoint
8. **`config/env.js`** — Centralized env var access
9. **`utils/errors.js`** — Centralized error handling utility
10. **Backend `package.json`** — Dependencies: express, @prisma/client, bcryptjs, jsonwebtoken, cors, dotenv
11. **Frontend `package.json`** — Vite + React + react-router-dom + axios + tailwindcss (v4, CSS-first) + shadcn/ui (v4) deps
12. **Vite config** — Proxy `/api` to backend in dev mode
13. **Tailwind v4 CSS config** — `@theme` directive in `index.css` for brand color (no `tailwind.config.js`)
14. **`index.css`** — Tailwind v4 `@import "tailwindcss"` + `@theme` directive + `--brand-primary` CSS variable

### Out of Scope
- Auth logic (Phase 2)
- RBAC middleware (Phase 3)
- Any feature endpoints (Phases 4-6)
- Seed scripts (Phase 7)

---

## Deliverables & File Manifest

```
ClubMS/
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/   ← created by prisma migrate dev; must be committed
│   └── src/
│       ├── index.js
│       ├── config/
│       │   └── env.js
│       └── utils/
│           └── errors.js
│
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

---

## Key Implementation Details

### docker-compose.yml
- `db`: postgres:16-alpine, named volume `pgdata`, env from `.env`; add a healthcheck: `pg_isready -U postgres -d clubms`, interval 5s, timeout 5s, retries 10
- `backend`: builds `./backend`, depends_on db **with `condition: service_healthy`** (not just container start), port 4000, env_file .env
- `frontend`: build uses `context: ./frontend` with `args:` passing `VITE_UNIVERSITY_NAME`, `VITE_PRIMARY_BRAND_COLOR`, `VITE_LOGO_URL` from the root `.env` values; depends_on backend, port 80

Example docker-compose.yml structure:
```yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    env_file: .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d clubms"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "4000:4000"
    env_file: .env

  frontend:
    build:
      context: ./frontend
      args:
        VITE_UNIVERSITY_NAME: ${UNIVERSITY_NAME}
        VITE_PRIMARY_BRAND_COLOR: ${PRIMARY_BRAND_COLOR}
        VITE_LOGO_URL: ${LOGO_URL}
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
```

### .env.example
```
UNIVERSITY_NAME=State University
PRIMARY_BRAND_COLOR=#1E40AF
LOGO_URL=https://cdn.uni.edu/logo.png
DATABASE_URL=postgresql://postgres:postgres@db:5432/clubms
JWT_SECRET=change-me-to-a-random-secret
PORT=4000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=clubms
```

### Prisma Schema
- Enums: `UserRole` (PLATFORM_ADMIN, CLUB_ADMIN, STUDENT), `MembershipStatus` (PENDING, ACTIVE, ALUMNI, REJECTED), `MemberRole` (MEMBER, OFFICER)
- Models: User, Club, ClubMembership, Event — all with UUID `@id @default(uuid())`
- Relations: User ↔ ClubMembership (1:N), Club ↔ ClubMembership (1:N), Club ↔ Event (1:N)
- Constraint: `@@unique([userId, clubId])` on ClubMembership
- Cascade deletes on all foreign keys

### Express Entry Point
- Import express, cors, dotenv
- Mount a `GET /api/health` route returning `{ status: 'ok' }`
- Listen on `process.env.PORT || 4000`
- Parse JSON body via `express.json()`

### Backend Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```

### Frontend Dockerfile
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_UNIVERSITY_NAME
ARG VITE_PRIMARY_BRAND_COLOR
ARG VITE_LOGO_URL
ENV VITE_UNIVERSITY_NAME=$VITE_UNIVERSITY_NAME
ENV VITE_PRIMARY_BRAND_COLOR=$VITE_PRIMARY_BRAND_COLOR
ENV VITE_LOGO_URL=$VITE_LOGO_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf
- Listen 80
- `location /api/` → proxy_pass http://backend:4000
- `location /` → try_files $uri $uri/ /index.html (SPA fallback)

### Tailwind v4 CSS Configuration

Tailwind v4 uses CSS-first configuration — no `tailwind.config.js` file needed. All customization is done via the `@theme` directive in `index.css`.

### index.css
```css
@import "tailwindcss";

@theme inline {
  --color-brand-primary: var(--brand-primary, #1E40AF);
}

:root {
  --brand-primary: #1E40AF;
}
```

Components use `bg-brand-primary`, `text-brand-primary`, etc. The `--brand-primary` value is overridden at build time via `VITE_PRIMARY_BRAND_COLOR`.

### .gitignore

```
.env
node_modules/
backend/node_modules/
frontend/node_modules/
frontend/dist/
```

### .dockerignore (backend and frontend — same content for both)

```
node_modules
.env
dist
```

---

## Dependencies (npm)

### Backend
- express, cors, dotenv, @prisma/client, bcryptjs, jsonwebtoken
- prisma (v7 CLI — must be in `dependencies`, not `devDependencies`, so `npm ci --omit=dev` includes it for `prisma generate` and `prisma migrate deploy`)

### Frontend
- react, react-dom, react-router-dom, axios
- Dev: vite, @vitejs/plugin-react, tailwindcss (v4, no postcss/autoprefixer needed — v4 uses Lightning CSS)
- UI: shadcn/ui (initialized via npx shadcn@latest init)

---

## First-Time Setup (Required Before First Docker Deploy)

`prisma migrate deploy` (run inside Docker on every start) applies pre-existing migration files — it does **not** create them. Before running `docker compose up` for the first time, generate the initial migration locally:

```bash
cd backend
npm install
npx prisma migrate dev --name init
```

This creates `prisma/migrations/` with the initial SQL. **Commit this directory to source control.** Every subsequent `docker compose up` will apply it automatically.

> This only needs to be done once per fresh clone. After that, new schema changes follow the same pattern: run `migrate dev --name <description>` locally, commit the new migration file, and `migrate deploy` in Docker applies it.

---

## Acceptance Criteria

1. `docker compose up` starts all 3 services without errors
2. `http://localhost:4000/api/health` returns `{ "status": "ok" }`
3. `http://localhost:80` serves the React app (even if just a placeholder)
4. Prisma schema is valid — `npx prisma validate` passes
5. Database tables are created after container start — requires `prisma/migrations/` to exist (see First-Time Setup above)
6. `.env.example` contains all required variables

---

## Verification Commands

```bash
# ── First-Time Setup (once per clone) ──────────────────────────────────────
cd backend && npm install
npx prisma migrate dev --name init   # Creates prisma/migrations/ — commit this
cd ..

# ── Copy and configure environment ─────────────────────────────────────────
cp .env.example .env
# Edit .env: set UNIVERSITY_NAME, PRIMARY_BRAND_COLOR, LOGO_URL, JWT_SECRET

# ── Start stack ────────────────────────────────────────────────────────────
docker compose up -d

# ── Verify ─────────────────────────────────────────────────────────────────
curl http://localhost:4000/api/health
curl http://localhost:80
docker compose exec backend npx prisma validate
docker compose exec backend npx prisma db pull   # Verify tables exist
docker compose down
```
