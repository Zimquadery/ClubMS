# ClubMS — Software Design Document

## 1. Project Overview

**ClubMS** is a self-hosted, white-label University Club Management Platform enabling universities to manage clubs, events, and memberships. Deployed via Docker, branded via environment variables.

**Stack:** React (Vite) + Node.js/Express + PostgreSQL + Prisma + Docker + shadcn/ui + Tailwind CSS

**Scope:** MVP limited to three core features — Club Directory, Event Calendar, Membership & Alumni Workflow.

---

## 2. Core Architectural Constraints

1. **White-Label Ready:** Application relies on environment variables (`UNIVERSITY_NAME`, `PRIMARY_BRAND_COLOR`, `LOGO_URL`) so universities can brand deployments without altering source code.
2. **Self-Hosted:** Docker Compose spins up Node backend, React frontend, and PostgreSQL simultaneously. Suitable for on-premise or university cloud deployment.
3. **SSO Preparedness:** JWT authentication for MVP. Auth controllers structured so enterprise SAML/OAuth integration (Shibboleth, Azure AD) can be swapped in later without rewriting controllers.

---

## 3. Role-Based Access Control (RBAC)

| Role | Description | Capabilities |
|------|-------------|--------------|
| `PLATFORM_ADMIN` | University IT staff | Create/delete clubs, manage global settings |
| `CLUB_ADMIN` | Club officers | Create events, approve/reject membership requests, update members to alumni, transfer admin role |
| `STUDENT` | General authenticated user | Browse directory, view calendar, request to join clubs |

---

## 4. Technology Stack & Rationale

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React (Vite) | Fast builds, modern DX, HMR |
| UI Components | shadcn/ui (new-york) + Tailwind CSS (v4) | Accessible, customizable, lightweight, CSS-first theming via `@theme` |
| Notifications | sonner | Lightweight toast notifications, accessible, zero config |
| Backend | Node.js + Express | Minimal, well-understood, fast to scaffold |
| Database | PostgreSQL | Robust, relational, widely supported by universities |
| ORM | Prisma (v7) | Type-safe, excellent migration system, readable schema |
| Containerization | Docker + Docker Compose | Single-command deployment, reproducible environments |

---

## 5. Project Structure

```
ClubMS/
├── docker-compose.yml
├── .env.example
├── SDD.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma.config.mjs    # Prisma v7 config: datasource URL via process.env
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js           # Manual seed: node prisma/seed.js
│   │   └── deseed.js         # Manual deseed: node prisma/deseed.js
│   │
│   └── src/
│       ├── index.js          # Express entry point
│       ├── config/
│       │   └── env.js        # Centralized env var access
│       ├── lib/
│       │   └── prisma.js     # PrismaClient with @prisma/adapter-pg
│       ├── middleware/
│       │   ├── auth.js       # JWT verification → req.user
│       │   └── rbac.js       # requireRole() with role hierarchy
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.controller.js
│       │   │   ├── auth.service.js
│       │   │   └── auth.routes.js
│       │   ├── clubs/
│       │   │   ├── clubs.controller.js
│       │   │   ├── clubs.service.js
│       │   │   ├── clubs.routes.js
│       │   │   └── clubs.constants.js  # CLUB_CATEGORIES array
│       │   ├── events/
│       │   │   ├── events.controller.js
│       │   │   ├── events.service.js
│       │   │   └── events.routes.js
│       │   └── memberships/
│       │       ├── memberships.controller.js
│       │       ├── memberships.service.js
│       │       └── memberships.routes.js  # Exports router + adminRouter
│       └── utils/
│           ├── errors.js     # Centralized error handling (AppError)
│           └── asyncHandler.js # Async error wrapper for controllers
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf            # Serves static + proxies /api → backend:4000
    ├── components.json       # shadcn/ui config (new-york style, slate base)
    ├── vite.config.js        # Vite + React + @tailwindcss/vite, @ alias
    ├── index.html            # Vite entry point
    ├── .env                  # VITE_ prefixed branding variables (gitignored)
    │
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css         # Tailwind v4 @theme + shadcn CSS + brand variables
        ├── api/
        │   └── client.js     # Axios instance with JWT interceptor
        ├── context/
        │   └── AuthContext.jsx # Auth state, login/logout, role helpers
        ├── components/
        │   ├── Layout.jsx     # App shell with navbar, branding
        │   ├── ProtectedRoute.jsx # Role-guarded route wrapper
        │   └── ui/            # shadcn/ui generated components
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── ClubDirectory.jsx
        │   ├── ClubDetail.jsx
        │   ├── EventCalendar.jsx
        │   ├── NotFound.jsx            # 404 catch-all page
        │   └── admin/
        │       ├── ManageClubs.jsx    # PLATFORM_ADMIN
        │       ├── ClubMembers.jsx    # CLUB_ADMIN + PLATFORM_ADMIN
        │       └── PendingRequests.jsx # CLUB_ADMIN + PLATFORM_ADMIN
        ├── hooks/
            └── useAuth.js
        └── lib/
            ├── utils.js       # shadcn cn() utility (clsx + tailwind-merge)
            └── format.js      # Date/time formatting helpers
```

---

## 6. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  PLATFORM_ADMIN
  CLUB_ADMIN
  STUDENT
}

enum MembershipStatus {
  PENDING
  ACTIVE
  ALUMNI
  REJECTED
}

enum MemberRole {
  MEMBER
  OFFICER
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  role          UserRole @default(STUDENT)
  name          String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  memberships   ClubMembership[]
}

model Club {
  id            String   @id @default(uuid())
  name          String   @unique
  description   String?
  category      String
  logoUrl       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  memberships   ClubMembership[]
  events        Event[]
}

model ClubMembership {
  id        String           @id @default(uuid())
  userId    String
  clubId    String
  status    MembershipStatus @default(PENDING)
  role      MemberRole       @default(MEMBER)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  club      Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([userId, clubId])
}

model Event {
  id          String   @id @default(uuid())
  clubId      String
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  location    String?
  bannerUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
}
```

### Schema Design Decisions

| Decision | Rationale |
|----------|-----------|
| UUIDs for all IDs | No sequential ID leakage, safe for self-hosted deployments |
| `@@unique([userId, clubId])` | Prevents duplicate memberships per club |
| `MembershipStatus` enum | Clear lifecycle: PENDING → ACTIVE → ALUMNI (or REJECTED) |
| `MemberRole` in membership | Tracks MEMBER vs OFFICER within a club context |
| Cascade deletes | Removing a club cleans up memberships and events automatically |
| Category as string on Club | Flexible; validated against `CLUB_CATEGORIES` constant array |
| `bannerUrl` on Event | Optional, URL-based — avoids file upload complexity in MVP |
| `updatedAt` on all models | Auto-timestamp via `@updatedAt` for audit trail |
| Club `name` unique | `@unique` constraint prevents duplicate club names; service layer provides user-friendly error messages |
| `prisma-client-js` generator | Standard generator; Prisma v7 datasource URL in `prisma.config.mjs` |

---

## 7. API Endpoints

### Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | Public | Returns `{ status: 'ok', db: 'connected' }` with DB connectivity check; returns 503 if DB is unreachable |

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register a new student account |
| POST | `/api/auth/login` | Public | Login, returns JWT access token |
| GET | `/api/auth/me` | JWT | Get current authenticated user profile |

### Clubs

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/clubs/categories` | JWT | Any | List valid club categories |
| GET | `/api/clubs` | JWT | Any | List all clubs, supports `?search=` and `?category=` query params |
| GET | `/api/clubs/:id` | JWT | Any | Club detail with members, events, and user's membership status |
| POST | `/api/clubs` | JWT | PLATFORM_ADMIN | Create a new club (optionally assign `adminUserId` as OFFICER) |
| PATCH | `/api/clubs/:id` | JWT | PLATFORM_ADMIN | Update club name, description, category, or logo URL |
| DELETE | `/api/clubs/:id` | JWT | PLATFORM_ADMIN | Delete a club (cascades memberships + events) |

### Memberships

**Mounted at `/api/clubs`** (parametric routes under `/:clubId`):

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/clubs/:clubId/join` | JWT | STUDENT | Send a join request (creates PENDING membership) |
| POST | `/api/clubs/:clubId/leave` | JWT | STUDENT | Leave a club (OFFICERs must transfer role first) |
| GET | `/api/clubs/:clubId/members` | JWT | CLUB_ADMIN | List all members + pending requests, supports `?status=` filter |
| PATCH | `/api/clubs/:clubId/members/:userId/approve` | JWT | CLUB_ADMIN | Approve a pending request → ACTIVE |
| PATCH | `/api/clubs/:clubId/members/:userId/reject` | JWT | CLUB_ADMIN | Reject a pending request → REJECTED |
| PATCH | `/api/clubs/:clubId/members/:userId/alumni` | JWT | CLUB_ADMIN | Update active member status → ALUMNI |
| DELETE | `/api/clubs/:clubId/members/:userId` | JWT | CLUB_ADMIN | Remove a member from the club (OFFICERs cannot be removed) |
| POST | `/api/clubs/:clubId/transfer` | JWT | CLUB_ADMIN | Transfer admin role to another member |

**Mounted at `/api/memberships`** (literal paths — safe from route collision):

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/memberships/my-clubs` | JWT | Any | List clubs the user is ACTIVE or PENDING in |
| GET | `/api/memberships/my-admin-clubs` | JWT | CLUB_ADMIN | List clubs where user is an OFFICER |

### Events

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/events` | JWT | Any | List upcoming events, supports `?clubId=` and `?joined=true` filters |
| PATCH | `/api/events/:id` | JWT | CLUB_ADMIN | Update an event (must own the club; PLATFORM_ADMIN bypasses check) |
| POST | `/api/clubs/:clubId/events` | JWT | CLUB_ADMIN | Create an event for the club |
| DELETE | `/api/events/:id` | JWT | CLUB_ADMIN | Delete an event (must own the club; PLATFORM_ADMIN bypasses check) |

---

## 8. Authentication & SSO Strategy

### HTTP Security Middleware

Applied globally in `index.js` before all routes:

| Middleware | Configuration | Purpose |
|-----------|---------------|---------|
| `helmet()` | Default | Sets security HTTP headers (CSP, X-Frame-Options, etc.) |
| `cors()` | `{ origin: FRONTEND_URL, credentials: true }` | Restricts API access to the frontend origin |
| `express-rate-limit` | Auth routes: 20 req/15min, General: 100 req/min | Prevents brute-force and abuse |
| `express.json()` | `{ limit: '10kb' }` | Parses JSON bodies with payload size limit |

`FRONTEND_URL` is read from `process.env` (defaults to `http://localhost:5173`). `JWT_SECRET` has no default — throws at startup if missing.

### JWT Implementation
- **Token type:** Access token only (24-hour expiry for MVP simplicity; add refresh tokens for production)
- **Payload:** `{ userId, email, role }`
- **Storage:** Frontend stores in localStorage; sent via `Authorization: Bearer <token>` header
- **Middleware:** `auth.js` decodes and verifies token, attaches `req.user`

### SSO Preparedness Architecture

```
┌─────────────────────────────────┐
│        auth.controller.js       │  ← HTTP layer (request/response)
│    calls authService methods    │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│         auth.service.js         │  ← Business logic layer
│  authenticate(email, password)  │  ← MVP: local bcrypt comparison
│  register(email, password, ...) │
│                                 │  ← FUTURE: authenticateWithSAML()
└─────────────────────────────────┘  ← FUTURE: authenticateWithOAuth()
```

**Swap strategy:** To integrate SSO, replace the internals of `auth.service.js`. Controllers and routes remain untouched. The service interface stays the same — `authenticate()` returns a user object or throws.

### RBAC Middleware

```js
// rbac.js — role hierarchy + requireRole()
const ROLE_INHERITS = {
  PLATFORM_ADMIN: ['PLATFORM_ADMIN', 'CLUB_ADMIN'],
  CLUB_ADMIN: ['CLUB_ADMIN'],
  STUDENT: ['STUDENT'],
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const effectiveRoles = ROLE_INHERITS[req.user.role] || [req.user.role];
  const hasRole = roles.some((role) => effectiveRoles.includes(role));
  if (!hasRole) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

**Role hierarchy:** `PLATFORM_ADMIN` inherits `CLUB_ADMIN` privileges. This means `requireRole('CLUB_ADMIN')` also passes for `PLATFORM_ADMIN`.

**Per-resource authorization:** For CLUB_ADMIN-scoped endpoints (e.g., approve member, transfer admin), `requireClubAdmin` middleware is chained after `requireRole('CLUB_ADMIN')`. It queries `ClubMembership` to verify the user has an ACTIVE OFFICER membership for the specific club. PLATFORM_ADMIN is auto-bypassed (does not need club membership).

```js
// memberships.routes.js — requireClubAdmin middleware
async function requireClubAdmin(req, res, next) {
  if (req.user.role === 'PLATFORM_ADMIN') return next();
  const isAdmin = await membershipsService.isClubAdmin(req.user.userId, req.params.clubId);
  if (!isAdmin) throw new AppError('Not an admin of this club', 403);
  next();
}

// Usage in routes:
router.post('/', requireRole('PLATFORM_ADMIN'), clubsController.create);
router.patch('/:clubId/members/:userId/approve', requireRole('CLUB_ADMIN'), requireClubAdmin, membershipsController.approve);
```

### Frontend Route Protection

```jsx
<ProtectedRoute roles={['PLATFORM_ADMIN']}>
  <ManageClubs />
</ProtectedRoute>
<ProtectedRoute roles={['CLUB_ADMIN', 'PLATFORM_ADMIN']}>
  <ClubMembers />
</ProtectedRoute>
```

`ProtectedRoute` checks `AuthContext.user.role` against allowed roles. It has **no hierarchy awareness** — all allowed roles must be listed explicitly. Redirects to `/dashboard` if unauthorized.

---

## 9. White-Label Theming

### Environment Variables

| Variable | Example | Scope | Usage |
|----------|---------|-------|-------|
| `UNIVERSITY_NAME` | "State University" | Both | Navbar, login page, emails |
| `PRIMARY_BRAND_COLOR` | "#1E40AF" | Frontend | CSS variable `--brand-primary` |
| `LOGO_URL` | "https://cdn.uni.edu/logo.png" | Both | Navbar, login page |
| `DATABASE_URL` | "postgresql://..." | Backend | Prisma connection (also used by `prisma.config.mjs`) |
| `JWT_SECRET` | "super-secret-key" | Backend | Token signing |
| `FRONTEND_URL` | "http://localhost:5173" | Backend | CORS allowed origin (must match frontend URL) |
| `PORT` | "4000" | Backend | Express listen port |
| `POSTGRES_USER` | "postgres" | Backend (Docker) | PostgreSQL user |
| `POSTGRES_PASSWORD` | "postgres" | Backend (Docker) | PostgreSQL password |
| `POSTGRES_DB` | "clubms" | Backend (Docker) | PostgreSQL database name |

### Frontend Theme Injection

Frontend reads `VITE_*` prefixed variables via `import.meta.env`. Tailwind v4 uses CSS-first configuration — no `tailwind.config.js` needed.

```css
/* index.css — Tailwind v4 + shadcn/ui (new-york style, slate base) */
@import "tailwindcss";

@theme inline {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  --color-popover: #ffffff;
  --color-popover-foreground: #0f172a;
  --color-primary: #0f172a;
  --color-primary-foreground: #f8fafc;
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-accent: #f1f5f9;
  --color-accent-foreground: #0f172a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #f8fafc;
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-ring: #94a3b8;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --color-brand-primary: var(--brand-primary, #1E40AF);
}

:root {
  --brand-primary: #1E40AF;
}

@layer base {
  * {
    border-color: var(--color-border);
  }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

`main.jsx` overrides `--brand-primary` at runtime: `document.documentElement.style.setProperty('--brand-primary', import.meta.env.VITE_PRIMARY_BRAND_COLOR || '#1E40AF')`. Components use `var(--brand-primary)` for buttons, links, highlights.

### Branding Injection Points
- **Login/Register page:** Logo + university name in header
- **Navbar:** Logo + university name
- **Buttons/Links:** `--brand-primary` color
- **Favicon:** Configurable via env var (optional)

---

## 10. Docker Architecture

### docker-compose.yml (3 Services)

```yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    env_file: .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
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

### Backend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY prisma.config.mjs ./
RUN npx prisma generate
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```

> **Note:** `prisma` must be listed in `dependencies` (not `devDependencies`) in `package.json` so that `npm ci --omit=dev` includes it. `prisma.config.mjs` must be copied before `prisma generate`. `openssl` is needed for Prisma v7's pg adapter.

### Frontend Dockerfile (Multi-stage)

```dockerfile
# Build stage
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

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

> **Note:** Build args pass branding env vars into the Vite build stage so `import.meta.env.VITE_*` values are baked into the static bundle.

### nginx.conf (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name localhost;

    location /api/ {
        proxy_pass http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker Decisions

| Decision | Rationale |
|----------|-----------|
| `postgres:16-alpine` | Lightweight, latest stable PostgreSQL |
| Named volume `pgdata` | Data persists across container restarts |
| `npm ci --omit=dev` | Deterministic installs, no dev dependencies in prod (replaces deprecated `--production`) |
| `apk add --no-cache openssl` | Required by Prisma v7's `@prisma/adapter-pg` |
| `prisma.config.mjs` copied before generate | Prisma v7 needs config file to resolve datasource URL |
| DB healthcheck + `condition: service_healthy` | Backend waits for PostgreSQL to be ready before starting |
| Frontend build args | Passes `VITE_*` branding vars into Docker build for static bundling |
| Multi-stage frontend build | Final image is ~20MB nginx vs ~800MB+ Node |
| nginx SPA fallback | `try_files` ensures React Router works on refresh |

---

## 11. Seed & Deseed Scripts

### seed.js (Manual: `node prisma/seed.js`)

Creates development data using `@prisma/adapter-pg` (PrismaPg adapter with pg package):

| Entity | Details |
|--------|---------|
| 1 PLATFORM_ADMIN | admin@university.edu / password123 |
| 2 CLUB_ADMINs | officer1@university.edu, officer2@university.edu |
| 5 STUDENTs | student1–5@university.edu |
| 6 Clubs | Technology ("Coding Club"), Sports ("Basketball Team"), Arts ("Drama Society"), Academic ("Science Olympiad"), Cultural ("Cultural Exchange"), Community ("Volunteer Corps") |
| Memberships | Admin as OFFICER of Coding Club, officer1 OFFICER of Coding Club, officer2 OFFICER of Basketball Team, mix of ACTIVE/PENDING/ALUMNI across clubs |
| 5 Events | Spread across first 3 clubs, future dates |

All passwords hashed with bcrypt. Users created with `upsert` (idempotent). Clubs/events only created if no clubs exist. Uses `PrismaClient` with `PrismaPg` adapter (not plain PrismaClient).

### deseed.js (Manual: `node prisma/deseed.js`)

Deletes all records in reverse dependency order:

```
Event → ClubMembership → Club → User
```

Uses `prisma.event.deleteMany()`, then `prisma.clubMembership.deleteMany()`, etc. Does not drop tables — only clears data. Also uses `PrismaPg` adapter (not plain PrismaClient).

Both scripts are **manually invoked**, not auto-triggered by migrations or Docker.

---

## 12. Frontend Page Structure

| Page | Route | Auth | Role | Description |
|------|-------|------|------|-------------|
| Login | `/login` | Public | — | Email/password form, branding |
| Register | `/register` | Public | — | Student registration |
| Dashboard | `/dashboard` | JWT | Any | Summary of user's clubs + upcoming events |
| Club Directory | `/clubs` | JWT | Any | Searchable, filterable list of clubs |
| Club Detail | `/clubs/:id` | JWT | Any | Club info, member count, join button, events list |
| Event Calendar | `/events` | JWT | Any | Calendar view of all/joined club events |
| Manage Clubs | `/admin/clubs` | JWT | PLATFORM_ADMIN | Create/delete clubs |
| Club Members | `/admin/clubs/:id/members` | JWT | CLUB_ADMIN, PLATFORM_ADMIN | View members, set alumni, transfer role |
| Pending Requests | `/admin/clubs/:id/requests` | JWT | CLUB_ADMIN, PLATFORM_ADMIN | Approve/reject join requests |
| Not Found | `*` (catch-all) | — | — | 404 page for unmatched routes |

Root path (`/`) redirects to `/dashboard`.

---

## 13. Implementation Phases

| Phase | Scope | Deliverables |
|-------|-------|--------------|
| **1. Foundation** | Project scaffolding | `docker-compose.yml`, `.env.example`, Prisma schema, Express skeleton, Dockerfiles, nginx config |
| **2. Auth** | Authentication | Register/login endpoints, JWT middleware, auth service, password hashing |
| **3. RBAC + Frontend Shell** | Access control + UI foundation | rbac middleware, Vite setup, Tailwind v4 (`@theme`) + shadcn/ui v4, AuthContext, ProtectedRoute, Layout, Login/Register pages |
| **4. Clubs** | Club directory feature | Club CRUD endpoints, ClubDirectory page (search + filter), ClubDetail page, ManageClubs admin page |
| **5. Memberships** | Member lifecycle | Join request endpoint, approve/reject/alumni endpoints, PendingRequests page, ClubMembers page, transfer role |
| **6. Events** | Event calendar feature | Event CRUD endpoints, EventCalendar page, club-scoped event creation |
| **7. Branding + Seed** | Deployment readiness | White-label env injection across all pages, seed.js, deseed.js, final Docker Compose integration test |

---

## 14. Explicit MVP Exclusions

The following are **out of scope** for this MVP and should not be implemented:

- Real-time notifications or websockets
- File uploads (logos and banners are URL-only)
- Password reset / forgot password flow
- Email notifications
- SSO implementation (structure only, not the actual SAML/OAuth integration)
- Analytics dashboards or reporting
- Multi-language / i18n support
- Mobile app
- Club messaging / chat
- Event RSVP / attendance tracking
- Payment or dues management

---

## 15. Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Framework | shadcn/ui (new-york) + Tailwind CSS (v4) | Accessible, customizable, CSS-first theming via `@theme`, easy white-label theming |
| Testing | Skipped for MVP | Faster delivery; add later |
| Seed Scripts | Manual seed.js + deseed.js | User controls when to seed; not auto-triggered |
| IDs | UUIDs | No sequential leakage, safe for self-hosted |
| Auth Storage | localStorage | Simple for MVP; httpOnly cookies for production hardening |
| SSO Strategy | Service layer abstraction | Swap internals without touching controllers |
| File Uploads | URL-only | Avoids storage complexity; logos/banners linked externally |
| Error Handling | Centralized error utility (AppError + P2002 handler) | Consistent API error responses, duplicate-key errors return 409 |
| Route Protection | Middleware (backend) + ProtectedRoute (frontend) | Defense in depth |
| Docker | 3-service compose | Single `docker compose up` for full stack |
| nginx | Frontend + API proxy | SPA routing + backend forwarding in one config |
| Prisma v7 Adapter | `@prisma/adapter-pg` with `pg` package | Required by Prisma v7; datasource URL in `prisma.config.mjs` not schema |
| Notifications | sonner toast library | Lightweight, accessible toast notifications across all pages |
| HTTP Security | helmet + cors + rate-limit | Defense in depth at the HTTP layer before auth middleware |
| Route Mounting | Two separate routers at `/api/clubs` | `clubRoutes` for clubs CRUD, `membershipsRoutes` for parametric `/:clubId` routes; literal paths go to `/api/memberships` to avoid collision with `GET /:id` |
