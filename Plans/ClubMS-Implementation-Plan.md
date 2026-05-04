# ClubMS — Implementation Plan

**Stack:** React (Vite) + Node.js/Express + PostgreSQL + Prisma + Docker + shadcn/ui + Tailwind CSS

---

## Phase Overview

| Phase | Name | Key Deliverables |
|-------|------|------------------|
| 1 | Foundation | Docker Compose, Prisma schema, Express skeleton, Dockerfiles |
| 2 | Auth | Register/login endpoints, JWT middleware, auth service |
| 3 | RBAC + Frontend Shell | RBAC middleware, React app, AuthContext, Login/Register/Dashboard |
| 4 | Clubs | Club CRUD, ClubDirectory, ClubDetail, ManageClubs |
| 5 | Memberships | Join requests, approve/reject/alumni, transfer, PendingRequests, ClubMembers |
| 6 | Events | Event CRUD, EventCalendar, club-scoped creation |
| 7 | Branding + Seed | White-label theming, seed.js, deseed.js |

**Dependency chain:** 1 → 2 → 3 → (4 → 5 → 6 → 7) with 6 parallel to 5

---

## Key Design Principles

1. **White-label:** All branding from env vars, never hardcoded
2. **SSO Preparedness:** Auth service layer abstracted for future swap
3. **Defense in Depth:** Backend middleware + frontend route protection
4. **UUIDs:** No sequential ID leakage
5. **Consistent Errors:** Centralized error handling

---

# Phase 1: Foundation

**Goal:** Project scaffolding — app boots, connects to PostgreSQL, serves placeholder frontend.

**Must Complete:**
1. `docker-compose.yml` — 3 services: `db` (postgres:16-alpine), `backend`, `frontend`
2. `.env.example` — All env vars documented
3. `backend/Dockerfile` — node:20-alpine, prisma generate, auto-migrate on start (`CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]`)
4. `frontend/Dockerfile` — Multi-stage: build with node, serve with nginx:alpine
5. `nginx.conf` — SPA fallback + `/api/` reverse proxy to backend:4000
6. Prisma schema — User, Club, ClubMembership, Event (all UUID, enums: UserRole, MembershipStatus, MemberRole)
7. Express entry (`src/index.js`) — Health check at `GET /api/health`
8. `config/env.js` — Centralized env var access
9. `utils/errors.js` — Centralized error handling
10. Backend `package.json` — express, @prisma/client, bcryptjs, jsonwebtoken, cors, dotenv
11. Frontend `package.json` — Vite + React + react-router-dom + axios + tailwindcss v4 + shadcn/ui v4
12. Vite config — Proxy `/api` to backend in dev
13. `index.css` — `@import "tailwindcss"` + `@theme inline { --color-brand-primary: var(--brand-primary, #1E40AF); }`

**Out of scope:** Auth, RBAC, features, seeds.

**First-time setup:** `cd backend && npm install && npx prisma migrate dev --name init` (creates `prisma/migrations/` — commit it).

**AC:** `docker compose up` starts all 3 services; `localhost:4000/api/health` returns `{ status: 'ok' }`; frontend serves at `localhost:80`.

---

# Phase 2: Authentication

**Goal:** JWT auth — register/login endpoints, password hashing, SSO-ready service layer.

**Files:**
```
backend/src/modules/auth/{auth.service.js,auth.controller.js,auth.routes.js}
backend/src/middleware/auth.js
```

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register student (role: STUDENT) |
| POST | `/api/auth/login` | Public | Login, returns `{ token, user }` |
| GET | `/api/auth/me` | JWT | Current user profile |

**Key details:**
- `auth.service.js` — `register()`, `login()`, `getMe()`. Service/controller separation enables SSO swap.
- bcryptjs, 10 salt rounds
- JWT payload: `{ userId, email, role }`, 24h expiry, secret from `JWT_SECRET`
- `middleware/auth.js` — Extracts Bearer token, verifies, attaches `req.user`

**Error codes:** 400 (missing fields), 401 (bad creds/token), 409 (duplicate email).

**AC:** Register creates user (201), login returns token (200), invalid creds return 401, duplicate email returns 409, password is hashed in DB.

---

# Phase 3: RBAC + Frontend Shell

**Goal:** Backend RBAC middleware + full React frontend shell.

**Files:**
```
backend/src/middleware/rbac.js
frontend/src/{api/client.js,context/AuthContext.jsx,hooks/useAuth.js,components/{Layout.jsx,ProtectedRoute.jsx,ui/},pages/{Login.jsx,Register.jsx,Dashboard.jsx},App.jsx,main.jsx,index.css}
```

**Backend:**
- `middleware/rbac.js` — `requireRole(...roles)` returns 401 if no user, 403 if wrong role. Usage: `router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), controller.create)`

**Frontend:**
- `api/client.js` — Axios instance, JWT interceptor (Bearer token from localStorage), 401 auto-logout
- `AuthContext.jsx` — `{ user, token, loading, login(), register(), logout(), isAuthenticated, hasRole() }`. On mount: checks localStorage for token, calls `GET /auth/me`
- `ProtectedRoute.jsx` — Guards: loading → null, !authenticated → redirect /login, wrong role → redirect /dashboard, else → children
- `Layout.jsx` — Navbar (logo, university name, nav links, user menu) + `<Outlet />`
- Pages: `Login.jsx`, `Register.jsx`, `Dashboard.jsx` (placeholder)
- Routes: `/login`, `/register`, `/` → Layout → `/dashboard`

**White-label:** `VITE_UNIVERSITY_NAME`, `VITE_PRIMARY_BRAND_COLOR`, `VITE_LOGO_URL` from env.

**AC:** Login/register pages render, login stores JWT and redirects to dashboard, unauthenticated /dashboard redirects to /login, navbar shows branding, logout works.

---

# Phase 4: Clubs — Club Directory

**Goal:** Searchable club directory — CRUD + frontend pages.

**Files:**
```
backend/src/modules/clubs/{clubs.service.js,clubs.controller.js,clubs.routes.js}
frontend/src/pages/{ClubDirectory.jsx,ClubDetail.jsx,admin/ManageClubs.jsx}
```

**Endpoints:**

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/clubs?search=&category=` | Any | List clubs with member count |
| GET | `/api/clubs/:id` | Any | Club detail with ACTIVE members + upcoming events |
| POST | `/api/clubs` | PLATFORM_ADMIN | Create club (optional adminUserId) |
| DELETE | `/api/clubs/:id` | PLATFORM_ADMIN | Delete club (cascades) |

**Categories:** `['Academic', 'Sports', 'Cultural', 'Technology', 'Arts', 'Community', 'Other']`

**Key details:**
- `create()` — if `adminUserId` provided, also creates ACTIVE OFFICER membership + sets user role to CLUB_ADMIN (transactional)
- PLATFORM_ADMIN bootstrap: seed script or direct DB update

**AC:** List/search/filter clubs, detail page with members + events, PLATFORM_ADMIN create/delete (403 for others), non-admin 403 on create/delete.

---

# Phase 5: Memberships — Lifecycle Workflow

**Goal:** Join requests → approve/reject → alumni + admin transfer.

**Files:**
```
backend/src/modules/memberships/{memberships.service.js,memberships.controller.js,memberships.routes.js}
frontend/src/pages/admin/{PendingRequests.jsx,ClubMembers.jsx}
```

**Endpoints:**

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/clubs/:clubId/join` | STUDENT | Send join request (PENDING) |
| GET | `/api/clubs/:clubId/members?status=` | CLUB_ADMIN | List members |
| PATCH | `/api/clubs/:clubId/members/:userId/approve` | CLUB_ADMIN | PENDING → ACTIVE |
| PATCH | `/api/clubs/:clubId/members/:userId/reject` | CLUB_ADMIN | PENDING → REJECTED |
| PATCH | `/api/clubs/:clubId/members/:userId/alumni` | CLUB_ADMIN | ACTIVE → ALUMNI |
| POST | `/api/clubs/:clubId/transfer` | CLUB_ADMIN | Transfer admin role |

**Key details:**
- Mounted at `/api/clubs` (after clubRoutes — no collision since paths differ)
- CLUB_ADMIN authorization per-club: verify ACTIVE OFFICER membership
- `transferAdmin()` — transactional: swap OFFICER role, update User.role (demote current admin to STUDENT only if they have no other OFFICER memberships)
- Frontend: ClubDetail gets working "Join Club" button

**State machine:** PENDING → ACTIVE → ALUMNI (or PENDING → REJECTED)

**AC:** Join creates PENDING (409 on duplicate), approve/reject/alumni work per status, transfer swaps roles atomically, CLUB_ADMIN scoped to own clubs, PendingRequests + ClubMembers pages work.

---

# Phase 6: Events — Calendar

**Goal:** Event CRUD + calendar view.

**Files:**
```
backend/src/modules/events/{events.service.js,events.controller.js,events.routes.js}
frontend/src/pages/EventCalendar.jsx
```

**Endpoints:**

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/events?clubId=&joined=true` | Any | List upcoming events |
| POST | `/api/clubs/:clubId/events` | CLUB_ADMIN | Create event |
| DELETE | `/api/events/:id` | CLUB_ADMIN | Delete event (must own club) |
| GET | `/api/events/:id` | Any | Event detail |

**Key details:**
- Events router mounted at `/api/events`; event creation route on clubs router
- `joined=true` filter: events from user's ACTIVE membership clubs
- Default: `startTime >= now`, ordered ASC
- CLUB_ADMIN verification per-club for create/delete
- Frontend: EventCalendar with "All Clubs"/"My Clubs" toggle + club filter; ClubDetail gets events section + create modal

**AC:** List events (filter by club/joined + getById), CLUB_ADMIN create/delete (scoped), EventCalendar page, ClubDetail shows club events.

---

# Phase 7: Branding + Seed — Deployment Readiness

**Goal:** Consistent theming + dev data scripts.

**Files:**
```
backend/prisma/{seed.js,deseed.js}
```

**Branding:** All pages use `--brand-primary`, `VITE_UNIVERSITY_NAME`, `VITE_LOGO_URL`. No hardcoded values. Rebuild frontend image to change branding.

**seed.js:**
- 1 PLATFORM_ADMIN, 2 CLUB_ADMINs, 5 STUDENTs
- 3 clubs (Academic, Sports, Cultural)
- Memberships covering all statuses (PENDING, ACTIVE, ALUMNI, REJECTED) and roles (MEMBER, OFFICER)
- 5 future events across clubs

**deseed.js:** `deleteMany` in reverse dependency order: EventRsvp → AuditLog → Event → ClubMembership → Club → User

**AC:** All pages show branding from env, seed/deseed run without errors, Docker deploy works, full user flow (register → browse → join → approve → events), no hardcoded branding.

---

## Post-MVP (Explicitly Out of Scope)

Refresh tokens, httpOnly cookies, password reset, file uploads, SSO, notifications, analytics, i18n, mobile app, tests.
