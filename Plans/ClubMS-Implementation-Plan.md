# ClubMS — Complete Implementation Plan

**Project:** ClubMS — Self-hosted, white-label University Club Management Platform  
**Stack:** React (Vite) + Node.js/Express + PostgreSQL + Prisma + Docker + shadcn/ui + Tailwind CSS

---

## Phase Overview

| Phase | Name | Goal | Key Deliverables |
|-------|------|------|------------------|
| 1 | Foundation | Project scaffolding | Docker Compose, Prisma schema, Express skeleton, Dockerfiles |
| 2 | Auth | Authentication | Register/login endpoints, JWT middleware, auth service |
| 3 | RBAC + Frontend Shell | Access control + UI | RBAC middleware, React app, AuthContext, Login/Register/Dashboard |
| 4 | Clubs | Club directory | Club CRUD, ClubDirectory, ClubDetail, ManageClubs |
| 5 | Memberships | Member lifecycle | Join requests, approve/reject/alumni, transfer, PendingRequests, ClubMembers |
| 6 | Events | Event calendar | Event CRUD, EventCalendar, club-scoped creation |
| 7 | Branding + Seed | Deployment readiness | White-label theming, seed.js, deseed.js, integration test |

---

## Dependency Chain

```
Phase 1 (Foundation)
  └─→ Phase 2 (Auth)
       └─→ Phase 3 (RBAC + Frontend Shell)
            ├─→ Phase 4 (Clubs)
            │    ├─→ Phase 5 (Memberships)
            │    │    └─→ Phase 6 (Events)
            │    │         └─→ Phase 7 (Branding + Seed)
            │    └─→ Phase 6 (Events) [can start in parallel with Phase 5]
            └─→ Phase 7 (Branding + Seed) [partial, theming only]
```

---

## MVP Feature Coverage

| Feature | Primary Phase | Supporting Phases |
|---------|---------------|-------------------|
| Club Directory | Phase 4 | Phase 5 (member count), Phase 6 (events on detail) |
| Event Calendar | Phase 6 | Phase 4 (club context), Phase 5 (joined filter) |
| Membership Workflow | Phase 5 | Phase 3 (auth), Phase 4 (club context) |

## RBAC Coverage

| Role | Phase Introduced | Capabilities Built |
|------|------------------|--------------------|
| STUDENT | Phase 2 | Register, login, browse |
| CLUB_ADMIN | Phase 3 | ProtectedRoute ready; Phase 5-6 for actual capabilities |
| PLATFORM_ADMIN | Phase 3 | ProtectedRoute ready; Phase 4 for club management |

## Key Design Principles (across all phases)

1. **White-Label:** All branding from env vars, never hardcoded
2. **SSO Preparedness:** Auth service layer abstracted for future swap
3. **Defense in Depth:** Backend middleware + frontend route protection
4. **Cascade Deletes:** Database cleanup automatic on club deletion
5. **UUIDs:** No sequential ID leakage
6. **Consistent Errors:** Centralized error handling utility

---
---

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

---
---

# Phase 2: Authentication

**Goal:** Implement JWT-based authentication with register/login endpoints, password hashing, and an auth service layer structured for future SSO swap-in.

---

## Context

Building on Phase 1 (foundation). The database schema exists, Express runs, but there's no way to create users or authenticate. This phase adds the complete auth flow.

**SSO Preparedness:** The auth service is a separate layer from the controller. To integrate SSO later (Shibboleth, Azure AD), replace internals of `auth.service.js` — controllers and routes stay untouched.

---

## Scope

### Must Complete
1. **`auth.service.js`** — Business logic: `register()`, `login()`, `getMe()`
2. **`auth.controller.js`** — HTTP layer: request parsing, response formatting
3. **`auth.routes.js`** — Express router: 3 endpoints
4. **`middleware/auth.js`** — JWT verification middleware → attaches `req.user`
5. **Password hashing** — bcryptjs with salt rounds
6. **JWT generation** — 24-hour expiry (simple for MVP; add refresh tokens for production), payload: `{ userId, email, role }`

### Out of Scope
- RBAC middleware (Phase 3)
- Frontend auth UI (Phase 3)
- Password reset / forgot password (explicit MVP exclusion)

---

## Deliverables & File Manifest

```
backend/src/
├── modules/
│   └── auth/
│       ├── auth.service.js
│       ├── auth.controller.js
│       └── auth.routes.js
└── middleware/
    └── auth.js
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new student account |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user profile |

---

## Key Implementation Details

### auth.service.js

```js
// Interface (swap internals for SSO later):
async register(email, password, name)
  → validates email uniqueness
  → hashes password with bcryptjs (10 salt rounds)
  → creates User with role: 'STUDENT'
  → returns user object (no passwordHash)

async login(email, password)
  → finds user by email
  → compares password with bcrypt
  → throws if invalid
  → generates JWT: { userId: user.id, email: user.email, role: user.role }
  → returns { token, user }

async getMe(userId)
  → finds user by ID
  → returns user object (no passwordHash)
  → throws if not found
```

### auth.controller.js

```js
// register(req, res, next)
  → extracts { email, password, name } from req.body
  → calls authService.register()
  → returns 201 with user object

// login(req, res, next)
  → extracts { email, password } from req.body
  → calls authService.login()
  → returns 200 with { token, user }

// getMe(req, res, next)
  → uses req.user.userId from auth middleware
  → calls authService.getMe()
  → returns 200 with user object
```

### auth.routes.js

```js
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
```

### middleware/auth.js

```js
// Extracts Bearer token from Authorization header
// Verifies with jsonwebtoken using JWT_SECRET
// Attaches decoded payload to req.user: { userId, email, role }
// Returns 401 if no token or invalid token
```

### JWT Token Structure
- **Header:** `{ "alg": "HS256", "typ": "JWT" }`
- **Payload:** `{ "userId": "uuid", "email": "...", "role": "STUDENT", "iat": ..., "exp": ... }`
- **Expiry:** 24 hours (simple for MVP; refresh tokens for production)
- **Secret:** `process.env.JWT_SECRET`

### Error Handling
- 400: Missing fields (email, password, name)
- 401: Invalid credentials (login), missing/invalid token (middleware)
- 409: Email already registered (register)
- 500: Internal server error

---

## Dependencies

All from Phase 1 `package.json`:
- bcryptjs (password hashing)
- jsonwebtoken (JWT sign/verify)
- @prisma/client (database access)

---

## Acceptance Criteria

1. `POST /api/auth/register` with `{ email, password, name }` creates user, returns 201
2. `POST /api/auth/login` with valid credentials returns `{ token, user }`
3. `POST /api/auth/login` with invalid credentials returns 401
4. `GET /api/auth/me` with valid JWT returns user profile
5. `GET /api/auth/me` without JWT returns 401
6. Duplicate email registration returns 409
7. Password is hashed in database (not plaintext)
8. JWT expires after 24 hours

---

## Verification Commands

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'
# → Save the token from response

# Get Me
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Duplicate register (expect 409)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test User"}'
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Service/controller separation | SSO swap-in only changes service internals |
| 24-hour JWT expiry | Simple for MVP; refresh tokens added for production |
| bcrypt salt rounds: 10 | Standard security/performance balance |
| Role defaults to STUDENT | Only PLATFORM_ADMIN can elevate roles (future) |
| No password in responses | Never return passwordHash to client |

---
---

# Phase 3: RBAC + Frontend Shell

**Goal:** Implement role-based access control middleware on the backend, and scaffold the React frontend with auth context, protected routes, layout, and login/register pages.

---

## Context

Building on Phases 1-2. Auth works — users can register/login and get JWTs. Now we need:
- Backend: Middleware to enforce role-based restrictions
- Frontend: Full React app shell with routing, auth state, and protected pages

---

## Scope

### Must Complete

#### Backend
1. **`middleware/rbac.js`** — `requireRole(...roles)` middleware factory
2. **Mount rbac on existing routes** — No routes use it yet, but it's ready

#### Frontend
3. **Vite + React setup** — `npm create vite@latest`, React + JS
4. **Tailwind CSS v4** — CSS-first config via `@theme` directive in `index.css` (no `tailwind.config.js`)
5. **shadcn/ui v4 init** — `npx shadcn@latest init -t vite` (JS mode, CSS variables enabled, base-nova style), add Button, Input, Card, Label, DropdownMenu, Avatar
6. **`api/client.js`** — Axios instance with JWT interceptor, base URL `/api`
7. **`context/AuthContext.jsx`** — Auth state, login/logout/register, role helpers
8. **`hooks/useAuth.js`** — Convenience hook for AuthContext
9. **`components/Layout.jsx`** — App shell with navbar, branding (university name, logo)
10. **`components/ProtectedRoute.jsx`** — Role-guarded route wrapper
11. **`pages/Login.jsx`** — Email/password form with branding
12. **`pages/Register.jsx`** — Registration form
13. **`pages/Dashboard.jsx`** — Placeholder dashboard (shows user info)
14. **`App.jsx`** — React Router setup with all routes
15. **`main.jsx`** — Entry point, renders App

### Out of Scope
- Club pages (Phase 4)
- Event pages (Phase 6)
- Membership pages (Phase 5)
- Admin pages (Phases 4-5)

---

## Deliverables & File Manifest

```
backend/src/
└── middleware/
    └── rbac.js

frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── api/
│   │   └── client.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ui/  (shadcn generated)
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Dashboard.jsx
│   └── hooks/
│       └── useAuth.js
├── vite.config.js
└── components.json
```

---

## Key Implementation Details

### Backend: middleware/rbac.js

```js
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { requireRole };
```

**Usage pattern (for future phases):**
```js
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), controller.create);
```

### Frontend: api/client.js

```js
import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

### Frontend: context/AuthContext.jsx

```js
// Provides:
// - user: { id, email, role, name } | null
// - token: string | null
// - loading: boolean
// - login(email, password) → calls POST /auth/login, stores token
// - register(email, password, name) → calls POST /auth/register
// - logout() → clears token, sets user to null
// - isAuthenticated: boolean
// - hasRole(...roles) → boolean

// On mount: checks localStorage for token, calls GET /auth/me to restore session
```

### Frontend: components/ProtectedRoute.jsx

```jsx
// Props: { roles?: string[], children }
// Guard order (MUST check loading first to prevent flash-redirect on page refresh):
// 1. If loading (AuthContext restoring session) → render null or a spinner
// 2. If not authenticated → redirect to /login
// 3. If roles provided and user's role not in roles → redirect to /dashboard
// 4. Otherwise → render children

// Example:
// const { user, loading } = useAuth();
// if (loading) return null;
// if (!user) return <Navigate to="/login" replace />;
// if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
// return children;
```

### Frontend: components/Layout.jsx

```jsx
// App shell:
// - Top navbar with:
//   - Logo (from VITE_LOGO_URL or default)
//   - University name (from VITE_UNIVERSITY_NAME)
//   - Nav links (Dashboard, Clubs, Events — if authenticated)
//   - User menu (name, role, logout button)
// - Main content area: <Outlet /> from react-router-dom (required for React Router v6 nested routes)
// - Brand color applied via CSS variable
```

> **Note:** `App.jsx` uses React Router v6 nested routes (`<Route element={<Layout />}>`). Layout **must** render `<Outlet />` — not `{children}` — for nested routes to display. Import `Outlet` from `react-router-dom`.

### Frontend: pages/Login.jsx

```jsx
// - Logo + university name header
// - Email input
// - Password input
// - Login button (uses brand-primary color)
// - Link to /register
// - Error display for invalid credentials
// - Redirect to /dashboard on success
```

### Frontend: pages/Register.jsx

```jsx
// - Logo + university name header
// - Name input
// - Email input
// - Password input
// - Register button
// - Link to /login
// - Error display for duplicate email
// - Redirect to /login on success
```

### Frontend: pages/Dashboard.jsx

```jsx
// - Welcome message with user name
// - Placeholder sections:
//   - "Your Clubs" (empty for now)
//   - "Upcoming Events" (empty for now)
// - Role-specific admin links (if PLATFORM_ADMIN or CLUB_ADMIN)
```

### Frontend: App.jsx Routes

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/" element={<Layout />}>
    <Route index element={<Navigate to="/dashboard" />} />
    <Route path="dashboard" element={
      <ProtectedRoute><Dashboard /></ProtectedRoute>
    } />
    {/* Phase 4+ routes will be added here */}
  </Route>
</Routes>
```

### Frontend: vite.config.js

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
```

### White-Label Variables (Frontend)

| Variable | Usage |
|----------|-------|
| `VITE_UNIVERSITY_NAME` | Navbar, login header |
| `VITE_PRIMARY_BRAND_COLOR` | CSS variable `--brand-primary` |
| `VITE_LOGO_URL` | Navbar, login header logo |

---

## Dependencies

### Frontend (new)
- react, react-dom, react-router-dom, axios
- tailwindcss (v4, CSS-first — no postcss/autoprefixer needed)
- shadcn/ui v4 components — add individually: `npx shadcn@latest add button input card label dropdown-menu avatar`

---

## Acceptance Criteria

1. `POST /api/auth/register` still works (no regression)
2. `requireRole('PLATFORM_ADMIN')` middleware exists and is importable
3. Frontend loads at `http://localhost:80`
4. `/login` page renders with email/password form
5. `/register` page renders with name/email/password form
6. Login stores JWT in localStorage, redirects to /dashboard
7. `/dashboard` shows user info when authenticated
8. `/dashboard` redirects to /login when not authenticated
9. Navbar shows university name from env var
10. Brand color applies to buttons/links
11. Logout clears token and redirects to /login

---

## Verification

```bash
# Backend rbac middleware exists
docker compose exec backend ls src/middleware/rbac.js

# Frontend builds
docker compose exec frontend npm run build

# Manual browser test:
# 1. Visit /login → form renders
# 2. Register new user → redirects to /login
# 3. Login → redirects to /dashboard
# 4. Dashboard shows user name and role
# 5. Logout → redirects to /login
# 6. Visit /dashboard → redirects to /login
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| AuthContext on frontend | Centralized auth state, accessible everywhere |
| Axios interceptor for JWT | Auto-attaches token, auto-logout on 401 |
| ProtectedRoute component | Declarative role guarding in JSX |
| Layout as route wrapper | Consistent shell across all authenticated pages |
| shadcn/ui v4 + Tailwind v4 | Accessible, customizable, CSS-first theming via `@theme` |
| localStorage for token | Simple for MVP; httpOnly cookies for production |

---
---

# Phase 4: Clubs — Club Directory Feature

**Goal:** Implement the searchable club directory — backend CRUD endpoints and frontend pages for browsing, viewing, and admin-managing clubs.

---

## Context

Building on Phases 1-3. Auth works, RBAC middleware exists, frontend shell is up. This phase adds the first MVP feature: a searchable club directory.

**Roles involved:**
- PLATFORM_ADMIN: Create/delete clubs
- Any authenticated user: Browse, search, filter, view details

---

## Scope

### Must Complete

#### Backend
1. **`clubs.service.js`** — Business logic: list, getById, create, delete
2. **`clubs.controller.js`** — HTTP layer
3. **`clubs.routes.js`** — Express router with RBAC

#### Frontend
4. **`pages/ClubDirectory.jsx`** — Searchable, filterable club list
5. **`pages/ClubDetail.jsx`** — Club info, member count, events list
6. **`pages/admin/ManageClubs.jsx`** — PLATFORM_ADMIN: create/delete clubs
7. **Route registration in App.jsx**

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/clubs` | JWT | Any | List all clubs, `?search=` and `?category=` |
| GET | `/api/clubs/:id` | JWT | Any | Club detail with member count |
| POST | `/api/clubs` | JWT | PLATFORM_ADMIN | Create a new club; optional `adminUserId` assigns the initial CLUB_ADMIN |
| DELETE | `/api/clubs/:id` | JWT | PLATFORM_ADMIN | Delete a club (cascades) |

---

## Deliverables & File Manifest

```
backend/src/modules/clubs/
├── clubs.service.js
├── clubs.controller.js
└── clubs.routes.js

frontend/src/pages/
├── ClubDirectory.jsx
├── ClubDetail.jsx
└── admin/
    └── ManageClubs.jsx
```

---

## Key Implementation Details

### clubs.service.js

```js
// list({ search, category })
  → builds Prisma where clause
  → search: { name: { contains: search, mode: 'insensitive' } }
  → category: { category } (exact match)
  → returns clubs with _count: { memberships: where status=ACTIVE }
  → ordered by name ASC

// getById(id)
  → finds club by ID
  → includes: memberships (where ACTIVE), events (future only, ordered by startTime)
  → returns club with memberCount, upcomingEvents
  → throws 404 if not found

// create({ name, description, category, logoUrl, adminUserId })
  → validates name uniqueness
  → creates club
  → if adminUserId provided:
      → verifies user exists
      → creates ClubMembership: { userId: adminUserId, clubId, status: ACTIVE, role: OFFICER }
      → updates User.role to CLUB_ADMIN for that user
  → returns created club
  → note: without adminUserId the club has no admin; use the seed script or assign one via the database

// delete(id)
  → verifies club exists
  → deletes club (cascade handles memberships + events)
  → returns success
```

### clubs.controller.js

```js
// list(req, res, next)
  → extracts search, category from req.query
  → calls clubsService.list()
  → returns 200 with clubs array

// getById(req, res, next)
  → extracts id from req.params
  → calls clubsService.getById()
  → returns 200 with club object

// create(req, res, next)
  → extracts { name, description, category, logoUrl, adminUserId } from req.body
  → calls clubsService.create()
  → returns 201 with created club

// delete(req, res, next)
  → extracts id from req.params
  → calls clubsService.delete()
  → returns 200 with success message
```

### clubs.routes.js

```js
router.get('/', authMiddleware, clubsController.list);
router.get('/:id', authMiddleware, clubsController.getById);
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.create);
router.delete('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.delete);
```

### Valid Category Values

The `category` field is a free-form string but both the frontend dropdown and seed data must use these exact values for filtering to work:

```js
const CLUB_CATEGORIES = ['Academic', 'Sports', 'Cultural', 'Technology', 'Arts', 'Community', 'Other'];
```

Define this constant in `backend/src/modules/clubs/clubs.constants.js` and import it in the service (for validation) and expose it via `GET /api/clubs/categories` if needed. The frontend dropdown must use these same strings.

### PLATFORM_ADMIN Bootstrap Note

The first PLATFORM_ADMIN user cannot be created via the API (registration always creates a STUDENT). Options:
1. **Development:** Use the seed script (`node prisma/seed.js`) — creates `admin@university.edu`
2. **Production:** After first deploy, run a one-time database update:
   ```sql
   UPDATE "User" SET role = 'PLATFORM_ADMIN' WHERE email = 'your-admin@university.edu';
   ```
   Then that user can log in and manage clubs via the API.

### Frontend: ClubDirectory.jsx

```
- Search input (by name)
- Category filter dropdown (Academic, Sports, Cultural, etc.)
- Grid/list of club cards showing:
  - Logo (or placeholder)
  - Name
  - Category badge
  - Member count
  - "View Details" link
- Pagination (optional for MVP, can be simple scroll)
```

### Frontend: ClubDetail.jsx

```
- Club logo + name + category
- Description
- Member count
- "Join Club" button (if not a member) — sends POST /clubs/:id/join (Phase 5)
- Upcoming events list (cards with title, date, location)
- Back to directory link
```

### Frontend: ManageClubs.jsx (PLATFORM_ADMIN)

```
- Table/list of all clubs
- "Create Club" button → modal/form with: name, description, category, logoUrl
- Delete button per club (with confirmation)
- Shows club name, category, member count
```

### Route Registration (App.jsx additions)

```jsx
<Route path="clubs" element={
  <ProtectedRoute><ClubDirectory /></ProtectedRoute>
} />
<Route path="clubs/:id" element={
  <ProtectedRoute><ClubDetail /></ProtectedRoute>
} />
<Route path="admin/clubs" element={
  <ProtectedRoute roles={['PLATFORM_ADMIN']}><ManageClubs /></ProtectedRoute>
} />
```

---

## Database Queries

### List Clubs
```prisma
prisma.club.findMany({
  where: { /* search + category filters */ },
  include: {
    _count: {
      select: { memberships: { where: { status: 'ACTIVE' } } }
    }
  },
  orderBy: { name: 'asc' }
});
```

### Club Detail
```prisma
prisma.club.findUnique({
  where: { id },
  include: {
    memberships: { where: { status: 'ACTIVE' } },
    events: {
      where: { startTime: { gte: new Date() } },
      orderBy: { startTime: 'asc' }
    }
  }
});
```

---

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Missing required fields (create) |
| 401 | No token |
| 403 | Wrong role (create/delete) |
| 404 | Club not found (getById, delete) |
| 409 | Duplicate club name (create) |

---

## Acceptance Criteria

1. `GET /api/clubs` returns all clubs with member count
2. `GET /api/clubs?search=coding` filters by name
3. `GET /api/clubs?category=Academic` filters by category
4. `GET /api/clubs/:id` returns club detail with members and upcoming events
5. `POST /api/clubs` creates club (PLATFORM_ADMIN only, 403 for others)
6. `DELETE /api/clubs/:id` deletes club (PLATFORM_ADMIN only)
7. ClubDirectory page shows searchable, filterable list
8. ClubDetail page shows club info, member count, events
9. ManageClubs page allows create/delete (PLATFORM_ADMIN)
10. Non-admin users get 403 on create/delete endpoints

---

## Verification

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"password123"}' | jq -r .token)

# List clubs
curl http://localhost:4000/api/clubs -H "Authorization: Bearer $TOKEN"

# Create club
curl -X POST http://localhost:4000/api/clubs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Club","category":"Academic"}'

# Delete club
curl -X DELETE http://localhost:4000/api/clubs/<id> \
  -H "Authorization: Bearer $TOKEN"
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Member count via `_count` | Efficient, no N+1 queries |
| Category as filter, not enum | Flexible for diverse universities |
| Search case-insensitive | Better UX |
| Logo URL-only | No file upload complexity in MVP |
| Cascading delete | Deleting club removes memberships + events |

---
---

# Phase 5: Memberships — Member Lifecycle Workflow

**Goal:** Implement the complete membership workflow — students request to join clubs, admins approve/reject/set-alumni, and role transfer.

---

## Context

Building on Phases 1-4. Clubs exist and are browsable. Now we need the membership lifecycle: join requests, approval, alumni status, and admin transfer.

**Lifecycle:** PENDING → ACTIVE → ALUMNI (or PENDING → REJECTED)

---

## Scope

### Must Complete

#### Backend
1. **`memberships.service.js`** — Business logic for all membership operations
2. **`memberships.controller.js`** — HTTP layer
3. **`memberships.routes.js`** — Express router with RBAC

#### Frontend
4. **`pages/admin/PendingRequests.jsx`** — CLUB_ADMIN: view/approve/reject requests
5. **`pages/admin/ClubMembers.jsx`** — CLUB_ADMIN: view members, set alumni, transfer role
6. **Update `pages/ClubDetail.jsx`** — Add working "Join Club" button
7. **Route registration in App.jsx**

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/clubs/:clubId/join` | JWT | STUDENT | Send join request (PENDING) |
| GET | `/api/clubs/:clubId/members` | JWT | CLUB_ADMIN | List all members + pending |
| PATCH | `/api/clubs/:clubId/members/:userId/approve` | JWT | CLUB_ADMIN | PENDING → ACTIVE |
| PATCH | `/api/clubs/:clubId/members/:userId/reject` | JWT | CLUB_ADMIN | PENDING → REJECTED |
| PATCH | `/api/clubs/:clubId/members/:userId/alumni` | JWT | CLUB_ADMIN | ACTIVE → ALUMNI |
| POST | `/api/clubs/:clubId/transfer` | JWT | CLUB_ADMIN | Transfer admin role |

---

## Deliverables & File Manifest

```
backend/src/modules/memberships/
├── memberships.service.js
├── memberships.controller.js
└── memberships.routes.js

frontend/src/pages/admin/
├── PendingRequests.jsx
└── ClubMembers.jsx
```

---

## Key Implementation Details

### memberships.service.js

```js
// requestJoin(clubId, userId)
  → verifies club exists
  → checks no existing membership (any status)
  → creates ClubMembership with status: PENDING, role: MEMBER
  → returns membership
  → throws 409 if already member/pending

// listMembers(clubId, { status })
  → finds all memberships for club
  → optional filter by status (PENDING, ACTIVE, ALUMNI)
  → includes user details (name, email)
  → ordered by createdAt ASC

// approve(clubId, userId)
  → finds PENDING membership
  → updates status to ACTIVE
  → throws 404 if not found, 400 if not PENDING

// reject(clubId, userId)
  → finds PENDING membership
  → updates status to REJECTED
  → throws 404 if not found, 400 if not PENDING

// setAlumni(clubId, userId)
  → finds ACTIVE membership
  → updates status to ALUMNI
  → throws 404 if not found, 400 if not ACTIVE

// transferAdmin(clubId, currentAdminId, newAdminId)
  → verifies currentAdminId is CLUB_ADMIN for the club (ACTIVE OFFICER membership)
  → verifies newAdminId is ACTIVE MEMBER for the club
  → counts currentAdmin's remaining OFFICER memberships in OTHER clubs (excluding this clubId)
  → runs prisma.$transaction:
      → updates currentAdmin membership role to MEMBER
      → updates newAdmin membership role to OFFICER
      → updates User.role for newAdmin to CLUB_ADMIN
      → ONLY IF remainingOfficerCount === 0: updates User.role for currentAdmin to STUDENT
        (if they are still an OFFICER in other clubs, their global role stays CLUB_ADMIN)
  → returns success

// isClubAdmin(userId, clubId)
  → checks if user has ACTIVE membership with role OFFICER
  → returns boolean
```

### memberships.controller.js

```js
// requestJoin(req, res, next)
  → extracts clubId from req.params
  → uses req.user.userId
  → calls membershipsService.requestJoin()
  → returns 201 with membership

// listMembers(req, res, next)
  → extracts clubId from req.params, status from req.query
  → calls membershipsService.listMembers()
  → returns 200 with members array

// approve(req, res, next)
  → extracts clubId, userId from req.params
  → calls membershipsService.approve()
  → returns 200 with updated membership

// reject(req, res, next)
  → extracts clubId, userId from req.params
  → calls membershipsService.reject()
  → returns 200 with updated membership

// setAlumni(req, res, next)
  → extracts clubId, userId from req.params
  → calls membershipsService.setAlumni()
  → returns 200 with updated membership

// transferAdmin(req, res, next)
  → extracts clubId from req.params, newAdminId from req.body
  → uses req.user.userId as currentAdminId
  → calls membershipsService.transferAdmin()
  → returns 200 with success
```

### memberships.routes.js

```js
router.post('/:clubId/join', authMiddleware, requireRole('STUDENT'), membershipsController.requestJoin);
router.get('/:clubId/members', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.listMembers);
router.patch('/:clubId/members/:userId/approve', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.approve);
router.patch('/:clubId/members/:userId/reject', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.reject);
router.patch('/:clubId/members/:userId/alumni', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.setAlumni);
router.post('/:clubId/transfer', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.transferAdmin);
```

### Route Mounting in src/index.js

Membership routes are mounted under `/api/clubs` (since all paths start with `/:clubId/...`). In `backend/src/index.js`, add:

```js
const membershipsRoutes = require('./modules/memberships/memberships.routes');

// Mount under /api/clubs — membership paths are /:clubId/join, /:clubId/members, etc.
app.use('/api/clubs', membershipsRoutes);
```

> **Note:** Both `clubsRoutes` and `membershipsRoutes` are mounted at `/api/clubs`. Express resolves them in registration order — register clubs routes first, then memberships routes. They handle different sub-paths so there is no conflict.

### CLUB_ADMIN Authorization Check

For approve/reject/alumni/transfer endpoints, verify the requesting user is actually a CLUB_ADMIN **for that specific club** (not just any club):

```js
// In service or middleware:
const membership = await prisma.clubMembership.findUnique({
  where: { userId_clubId: { userId: req.user.userId, clubId } }
});
if (!membership || membership.role !== 'OFFICER' || membership.status !== 'ACTIVE') {
  throw { status: 403, message: 'Not an admin of this club' };
}
```

### Frontend: PendingRequests.jsx (CLUB_ADMIN)

```
- Select club (if admin of multiple)
- List of PENDING memberships:
  - User name, email, request date
  - "Approve" button → PATCH /approve
  - "Reject" button → PATCH /reject
- Refresh after action
- Empty state: "No pending requests"
```

### Frontend: ClubMembers.jsx (CLUB_ADMIN)

```
- Select club (if admin of multiple)
- Tabs: Active Members | Alumni
- Active Members list:
  - User name, email, role (MEMBER/OFFICER), join date
  - "Set Alumni" button → PATCH /alumni
  - "Transfer Admin" button (if OFFICER) → POST /transfer
- Alumni list:
  - User name, email, graduation date
  - Read-only
```

### Frontend: ClubDetail.jsx Update

```
- Add "Join Club" button (visible if not a member)
- Button calls POST /clubs/:id/join
- After request:
  - Show "Request Pending" state
  - Disable button
- If already ACTIVE member:
  - Show "Member" badge
  - Show "View Members" link (if CLUB_ADMIN)
- If already ALUMNI:
  - Show "Alumni" badge
```

### Route Registration (App.jsx additions)

```jsx
<Route path="admin/clubs/:id/requests" element={
  <ProtectedRoute roles={['CLUB_ADMIN']}><PendingRequests /></ProtectedRoute>
} />
<Route path="admin/clubs/:id/members" element={
  <ProtectedRoute roles={['CLUB_ADMIN']}><ClubMembers /></ProtectedRoute>
} />
```

---

## Database Queries

### Request Join
```prisma
prisma.clubMembership.create({
  data: { userId, clubId, status: 'PENDING', role: 'MEMBER' }
});
```

### List Members
```prisma
prisma.clubMembership.findMany({
  where: { clubId, status: statusFilter },
  include: { user: { select: { id: true, name: true, email: true } } },
  orderBy: { createdAt: 'asc' }
});
```

### Approve/Reject/Alumni
```prisma
prisma.clubMembership.update({
  where: { userId_clubId: { userId, clubId } },
  data: { status: newStatus }
});
```

### Transfer Admin
```js
// Check remaining admin clubs BEFORE the transaction
const remainingOfficerCount = await prisma.clubMembership.count({
  where: {
    userId: currentAdminId,
    clubId: { not: clubId },
    role: 'OFFICER',
    status: 'ACTIVE'
  }
});

const transactionOps = [
  prisma.clubMembership.update({
    where: { userId_clubId: { userId: currentAdminId, clubId } },
    data: { role: 'MEMBER' }
  }),
  prisma.clubMembership.update({
    where: { userId_clubId: { userId: newAdminId, clubId } },
    data: { role: 'OFFICER' }
  }),
  prisma.user.update({
    where: { id: newAdminId },
    data: { role: 'CLUB_ADMIN' }
  }),
];

// Only demote globally if this was the admin's only club
if (remainingOfficerCount === 0) {
  transactionOps.push(
    prisma.user.update({
      where: { id: currentAdminId },
      data: { role: 'STUDENT' }
    })
  );
}

await prisma.$transaction(transactionOps);
```

---

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Membership not in expected status (e.g., approve non-PENDING) |
| 401 | No token |
| 403 | Not CLUB_ADMIN for this club |
| 404 | Club or membership not found |
| 409 | Already a member or pending request exists |

---

## Acceptance Criteria

1. `POST /api/clubs/:id/join` creates PENDING membership
2. Duplicate join request returns 409
3. `GET /api/clubs/:id/members` returns all members with user details
4. `PATCH .../approve` changes PENDING → ACTIVE
5. `PATCH .../reject` changes PENDING → REJECTED
6. `PATCH .../alumni` changes ACTIVE → ALUMNI
7. `POST .../transfer` transfers admin role between members
8. CLUB_ADMIN can only manage their own club's memberships
9. PendingRequests page shows pending requests with approve/reject
10. ClubMembers page shows active members with alumni option
11. ClubDetail shows working "Join Club" button

---

## Verification

```bash
# Student joins club
curl -X POST http://localhost:4000/api/clubs/<clubId>/join \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# Admin lists pending
curl http://localhost:4000/api/clubs/<clubId>/members?status=PENDING \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Admin approves
curl -X PATCH http://localhost:4000/api/clubs/<clubId>/members/<userId>/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Admin sets alumni
curl -X PATCH http://localhost:4000/api/clubs/<clubId>/members/<userId>/alumni \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate CLUB_ADMIN check per club | Can't manage clubs you don't admin |
| PENDING → ACTIVE → ALUMNI lifecycle | Clear state machine |
| Transfer uses transaction | Atomic role swap |
| User.role updated on transfer | Global role reflects actual admin status |
| STUDENT can only request, not self-approve | Prevents privilege escalation |

---
---

# Phase 6: Events — Event Calendar Feature

**Goal:** Implement event CRUD endpoints and a unified calendar view where students see upcoming events from all clubs or filtered by their joined clubs.

---

## Context

Building on Phases 1-5. Clubs and memberships work. Now we need events — clubs post events, and students view them in a calendar.

**Roles involved:**
- CLUB_ADMIN: Create/delete events for their club
- Any authenticated user: View events

---

## Scope

### Must Complete

#### Backend
1. **`events.service.js`** — Business logic: list, create, delete
2. **`events.controller.js`** — HTTP layer
3. **`events.routes.js`** — Express router with RBAC

#### Frontend
4. **`pages/EventCalendar.jsx`** — Calendar view of events
5. **Update `pages/ClubDetail.jsx`** — Show club's events
6. **Route registration in App.jsx**

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/events` | JWT | Any | List upcoming events, `?clubId=` and `?joined=true` |
| POST | `/api/clubs/:clubId/events` | JWT | CLUB_ADMIN | Create event for club |
| DELETE | `/api/events/:id` | JWT | CLUB_ADMIN | Delete event (must own club) |

---

## Deliverables & File Manifest

```
backend/src/modules/events/
├── events.service.js
├── events.controller.js
└── events.routes.js

frontend/src/pages/
└── EventCalendar.jsx
```

---

## Key Implementation Details

### events.service.js

```js
// list({ clubId, joined, userId })
  → base query: where startTime >= now, orderBy startTime ASC
  → if clubId: filter by clubId
  → if joined: get user's ACTIVE memberships, filter events by those clubIds
  → includes: club (name, logoUrl)
  → returns events array

// create(clubId, { title, description, startTime, endTime, location, bannerUrl })
  → verifies club exists
  → creates event with clubId
  → returns created event with club

// delete(eventId, userId)
  → finds event with club
  → verifies userId is CLUB_ADMIN (OFFICER) of that club
  → deletes event
  → throws 403 if not admin, 404 if not found

// getById(eventId)
  → finds event by ID
  → includes club details
  → returns event
```

### events.controller.js

```js
// list(req, res, next)
  → extracts clubId from req.query
  → extracts joined as boolean: const joinedBool = req.query.joined === 'true'
    (req.query values are always strings; '=== true' would always be false)
  → uses req.user.userId for joined filter
  → calls eventsService.list({ clubId, joined: joinedBool, userId })
  → returns 200 with events array

// create(req, res, next)
  → extracts clubId from req.params
  → extracts { title, description, startTime, endTime, location, bannerUrl } from req.body
  → verifies CLUB_ADMIN for this club
  → calls eventsService.create()
  → returns 201 with created event

// delete(req, res, next)
  → extracts id from req.params
  → calls eventsService.delete(id, req.user.userId)
  → returns 200 with success
```

### events.routes.js

```js
// events.routes.js — mounted at /api/events in index.js
router.get('/', authMiddleware, eventsController.list);
router.delete('/:id', authMiddleware, requireRole('CLUB_ADMIN'), eventsController.delete);
```

```js
// clubs.routes.js — add this route alongside existing club routes
// Event creation is club-scoped, so it lives in the clubs router
router.post('/:clubId/events', authMiddleware, requireRole('CLUB_ADMIN'), eventsController.create);
```

### Route Mounting in src/index.js

```js
const eventsRoutes = require('./modules/events/events.routes');
const clubsRoutes  = require('./modules/clubs/clubs.routes');

app.use('/api/events', eventsRoutes);  // GET /api/events, DELETE /api/events/:id
app.use('/api/clubs', clubsRoutes);    // includes POST /api/clubs/:clubId/events
```

> `eventsController` must be imported in both `events.routes.js` and `clubs.routes.js`.

### CLUB_ADMIN Authorization for Events

Verify the requesting user is an OFFICER of the club:

```js
const membership = await prisma.clubMembership.findUnique({
  where: { userId_clubId: { userId, clubId } }
});
if (!membership || membership.role !== 'OFFICER' || membership.status !== 'ACTIVE') {
  throw { status: 403, message: 'Not an admin of this club' };
}
```

### Frontend: EventCalendar.jsx

```
- Filter controls:
  - "All Clubs" / "My Clubs" toggle (joined=true filter)
  - Club dropdown (optional, filter by specific club)
- Event list/cards:
  - Title, club name, date, time, location
  - Club logo thumbnail
  - Banner image (if bannerUrl provided)
- Simple list view (calendar grid optional for MVP)
- Click event → expand/show details
- Empty state: "No upcoming events"
```

### Frontend: ClubDetail.jsx Update

```
- Add "Events" section showing club's upcoming events
- Event cards with title, date, time, location
- If CLUB_ADMIN for this club:
  - "Create Event" button → modal/form with:
    - Title (required)
    - Description (optional)
    - Start time (required)
    - End time (required)
    - Location (optional)
    - Banner URL (optional)
  - Delete button per event
```

### Route Registration (App.jsx additions)

```jsx
<Route path="events" element={
  <ProtectedRoute><EventCalendar /></ProtectedRoute>
} />
```

---

## Database Queries

### List Events
```js
// joined is a boolean (already converted from string in controller)
// Do NOT use the raw req.query.joined string here
prisma.event.findMany({
  where: {
    startTime: { gte: new Date() },
    ...(clubId && { clubId }),
    ...(joined && {   // joined is true (boolean), not 'true' (string)
      club: {
        memberships: {
          some: {
            userId: userId,
            status: 'ACTIVE'
          }
        }
      }
    })
  },
  include: {
    club: { select: { id: true, name: true, logoUrl: true } }
  },
  orderBy: { startTime: 'asc' }
});
```

### Create Event
```prisma
prisma.event.create({
  data: { clubId, title, description, startTime, endTime, location, bannerUrl },
  include: { club: true }
});
```

### Delete Event
```prisma
prisma.event.delete({ where: { id: eventId } });
```

---

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Missing required fields (title, startTime, endTime) |
| 401 | No token |
| 403 | Not CLUB_ADMIN for the club |
| 404 | Event or club not found |
| 422 | endTime before startTime |

---

## Acceptance Criteria

1. `GET /api/events` returns upcoming events with club info
2. `GET /api/events?clubId=<id>` filters by club
3. `GET /api/events?joined=true` shows only events from user's clubs
4. `POST /api/clubs/:clubId/events` creates event (CLUB_ADMIN only)
5. `DELETE /api/events/:id` deletes event (CLUB_ADMIN of owning club only)
6. EventCalendar page shows filterable event list
7. ClubDetail page shows club's upcoming events
8. CLUB_ADMIN can create events via ClubDetail page modal
9. CLUB_ADMIN can delete events they own
10. Events show club name, date, time, location

---

## Verification

```bash
# Create event
curl -X POST http://localhost:4000/api/clubs/<clubId>/events \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Meeting","startTime":"2026-05-01T18:00:00Z","endTime":"2026-05-01T19:00:00Z","location":"Room 101"}'

# List all events
curl http://localhost:4000/api/events -H "Authorization: Bearer $TOKEN"

# List joined club events
curl "http://localhost:4000/api/events?joined=true" -H "Authorization: Bearer $STUDENT_TOKEN"

# Delete event
curl -X DELETE http://localhost:4000/api/events/<eventId> \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Events filtered by startTime >= now | Only show upcoming events by default |
| Joined filter uses membership query | Shows relevant events for the student |
| Banner URL-only | No file upload in MVP |
| CLUB_ADMIN verified per club | Can't create events for clubs you don't admin |
| Simple list view | Calendar grid is complex; list is sufficient for MVP |
| End time required | Prevents ambiguous event duration |

---
---

# Phase 7: Branding + Seed — Deployment Readiness

**Goal:** Finalize white-label theming across all pages, create seed/deseed scripts, and verify the complete Docker Compose deployment works end-to-end.

---

## Context

Building on Phases 1-6. All features are implemented. This phase ensures:
1. White-label branding is consistently applied everywhere
2. Development data can be seeded/deseeded
3. Docker deployment is fully functional

---

## Scope

### Must Complete

#### Branding
1. **Verify all pages use brand variables** — Login, Register, Dashboard, ClubDirectory, ClubDetail, EventCalendar, ManageClubs, ClubMembers, PendingRequests
2. **Navbar branding** — Logo + university name from env vars
3. **CSS variable consistency** — `--brand-primary` used for all accent colors
4. **Favicon** — Configurable via env var (optional)

#### Seed Scripts
5. **`prisma/seed.js`** — Creates development data
6. **`prisma/deseed.js`** — Clears all data

#### Docker Verification
7. **Full integration test** — `docker compose up` from clean state
8. **Verify all endpoints work** through nginx proxy
9. **Verify frontend serves** correctly

---

## Deliverables & File Manifest

```
backend/prisma/
├── seed.js
└── deseed.js
```

---

## Key Implementation Details

### Branding Verification Checklist

| Page | Variable Used | Location |
|------|---------------|----------|
| Login | VITE_UNIVERSITY_NAME, VITE_LOGO_URL, VITE_PRIMARY_BRAND_COLOR | Header, form |
| Register | VITE_UNIVERSITY_NAME, VITE_LOGO_URL, VITE_PRIMARY_BRAND_COLOR | Header, form |
| Layout/Navbar | VITE_UNIVERSITY_NAME, VITE_LOGO_URL, VITE_PRIMARY_BRAND_COLOR | Top bar |
| Dashboard | VITE_PRIMARY_BRAND_COLOR | Accent colors |
| ClubDirectory | VITE_PRIMARY_BRAND_COLOR | Cards, buttons |
| ClubDetail | VITE_PRIMARY_BRAND_COLOR | Buttons, links |
| EventCalendar | VITE_PRIMARY_BRAND_COLOR | Cards, filters |
| ManageClubs | VITE_PRIMARY_BRAND_COLOR | Buttons, table |
| ClubMembers | VITE_PRIMARY_BRAND_COLOR | Buttons, badges |
| PendingRequests | VITE_PRIMARY_BRAND_COLOR | Buttons |

### CSS Variable Application (Tailwind v4)

```css
/* index.css — Tailwind v4 CSS-first configuration */
@import "tailwindcss";

@theme inline {
  --color-brand-primary: var(--brand-primary, #1E40AF);
}

:root {
  --brand-primary: #1E40AF; /* Overridden by VITE_PRIMARY_BRAND_COLOR at build */
}
```

Components use `bg-brand-primary`, `text-brand-primary`, etc. via Tailwind v4 utility classes.

```js
// In vite.config.js or index.html:
// Vite injects VITE_ vars at build time via import.meta.env
// Apply to CSS variable in main.jsx or index.css:
document.documentElement.style.setProperty(
  '--brand-primary',
  import.meta.env.VITE_PRIMARY_BRAND_COLOR || '#1E40AF'
);
```

### VITE_ Variables — Build-Time Injection via Docker Build Args

`VITE_` variables are compiled into the JavaScript bundle at build time by Vite. They are **not** available at runtime. The `docker-compose.yml` passes them as build args (configured in Phase 1):

```yaml
frontend:
  build:
    context: ./frontend
    args:
      VITE_UNIVERSITY_NAME: ${UNIVERSITY_NAME}
      VITE_PRIMARY_BRAND_COLOR: ${PRIMARY_BRAND_COLOR}
      VITE_LOGO_URL: ${LOGO_URL}
```

The `frontend/Dockerfile` receives them via `ARG`/`ENV` instructions before `npm run build` (configured in Phase 1). This means:
- **Changing branding requires rebuilding the frontend image** (`docker compose build frontend && docker compose up -d frontend`)
- The `.env` file must have both `UNIVERSITY_NAME` (for backend) and `VITE_UNIVERSITY_NAME` (for frontend build) set to the same value

### seed.js

```js
// Creates:
// - 1 PLATFORM_ADMIN: admin@university.edu / password123
// - 2 CLUB_ADMINs: officer1@university.edu, officer2@university.edu
// - 5 STUDENTs: student1-5@university.edu
// - 3 Clubs:
//   - "Coding Club" (Academic)
//   - "Basketball Club" (Sports)
//   - "Drama Club" (Cultural)
// - Memberships:
//   - officer1 → Coding Club (ACTIVE, OFFICER)
//   - officer2 → Basketball Club (ACTIVE, OFFICER)
//   - student1 → Coding Club (ACTIVE, MEMBER)
//   - student2 → Coding Club (PENDING)
//   - student3 → Basketball Club (ACTIVE, MEMBER)
//   - student4 → Drama Club (ALUMNI)
//   - student5 → Coding Club (ACTIVE, MEMBER)
// - 5 Events (future dates, spread across clubs)

// Usage: node prisma/seed.js
// Passwords: all "password123", hashed with bcrypt
```

### deseed.js

```js
// Deletes in reverse dependency order:
// 1. prisma.event.deleteMany()
// 2. prisma.clubMembership.deleteMany()
// 3. prisma.club.deleteMany()
// 4. prisma.user.deleteMany()

// Usage: node prisma/deseed.js
// Does NOT drop tables — only clears data
```

### Docker Integration Test

```bash
# Clean start
docker compose down -v  # Remove volumes
docker compose up -d

# Wait for services
sleep 10

# Verify backend
curl http://localhost:4000/api/health

# Seed data
docker compose exec backend node prisma/seed.js

# Verify API through nginx
curl http://localhost/api/health

# Test auth flow
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"password123"}'

# Verify frontend
curl -s http://localhost | grep -q "ClubMS" && echo "Frontend OK"

# Deseed
docker compose exec backend node prisma/deseed.js

# Verify empty
curl http://localhost/api/clubs -H "Authorization: Bearer $TOKEN"
# Should return []
```

---

## Environment Variables Final Checklist

### .env.example (complete)

```bash
# ── University Branding ─────────────────────────────────────────────────────
UNIVERSITY_NAME=State University
PRIMARY_BRAND_COLOR=#1E40AF
LOGO_URL=https://cdn.uni.edu/logo.png

# ── Database ────────────────────────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=clubms
# NOTE: .env files do NOT support shell variable interpolation (${VAR}).
# Write the full DATABASE_URL explicitly using the same values as above.
DATABASE_URL=postgresql://postgres:postgres@db:5432/clubms

# ── Auth ────────────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=change-me-to-a-random-secret

# ── Backend ─────────────────────────────────────────────────────────────────
PORT=4000

# ── Frontend (passed as Docker build args — see docker-compose.yml) ─────────
# .env files do NOT support ${VAR} interpolation, so repeat values explicitly.
# These must match UNIVERSITY_NAME, PRIMARY_BRAND_COLOR, LOGO_URL above.
VITE_UNIVERSITY_NAME=State University
VITE_PRIMARY_BRAND_COLOR=#1E40AF
VITE_LOGO_URL=https://cdn.uni.edu/logo.png
```

---

## Acceptance Criteria

1. All pages display university name from env var
2. All pages display logo from env var
3. Brand color applies to buttons, links, accents across all pages
4. `node prisma/seed.js` creates all test data without errors
5. `node prisma/deseed.js` clears all data without errors
6. `docker compose up` from clean state works
7. All API endpoints accessible through nginx proxy (`localhost/api/*`)
8. Frontend serves at `localhost:80`
9. Full user flow works: register → login → browse clubs → join → admin approves → view events
10. No hardcoded branding values in source code (all from env vars)

---

## Verification Script

```bash
#!/bin/bash
# Full integration test

set -e

echo "=== Clean Start ==="
docker compose down -v
docker compose up -d
sleep 10

echo "=== Health Check ==="
curl -f http://localhost:4000/api/health

echo "=== Seed Data ==="
docker compose exec backend node prisma/seed.js

echo "=== Auth Flow ==="
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"password123"}' | jq -r .token)
echo "Token: ${TOKEN:0:20}..."

echo "=== List Clubs ==="
curl -f http://localhost:4000/api/clubs -H "Authorization: Bearer $TOKEN"

echo "=== List Events ==="
curl -f http://localhost:4000/api/events -H "Authorization: Bearer $TOKEN"

echo "=== Frontend ==="
curl -f -s http://localhost | head -5

echo "=== Deseed ==="
docker compose exec backend node prisma/deseed.js

echo "=== All Tests Passed ==="
```

---

## Post-MVP Notes

These are explicitly out of scope but noted for future reference:

- **Refresh tokens:** Add refresh token rotation for better security
- **httpOnly cookies:** Move JWT storage from localStorage to httpOnly cookies
- **Password reset:** Add forgot password flow with email
- **File uploads:** Replace URL-only logos/banners with actual file upload
- **SSO:** Replace auth.service.js internals with SAML/OAuth
- **Notifications:** Add real-time notifications via WebSocket
- **Analytics:** Add club/event analytics dashboard
- **i18n:** Add multi-language support
- **Mobile app:** React Native or PWA
- **Testing:** Add unit and integration tests

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Manual seed/deseed | User controls when to seed; not auto-triggered |
| bcrypt for seed passwords | Consistent with auth flow |
| Env vars for all branding | True white-label; no code changes needed |
| VITE_ prefix convention | Vite requires this prefix for client-side access |
| Integration test script | Verifies full stack works together |
| No auto-seeding in Docker | Dev controls data; fresh prod deploys start clean |
