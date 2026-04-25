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
| UI Components | shadcn/ui (v4) + Tailwind CSS (v4) | Accessible, customizable, lightweight, CSS-first theming via `@theme` |
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
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js    # Manual seed: node prisma/seed.js
│   │   └── deseed.js  # Manual deseed: node prisma/deseed.js
│   │
│   └── src/
│       ├── index.js    # Express entry point
│       ├── config/
│       │   └── env.js  # Centralized env var access
│       ├── middleware/
│       │   ├── auth.js # JWT verification → req.user
│       │   └── rbac.js # requireRole('PLATFORM_ADMIN')
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.controller.js
│       │   │   ├── auth.service.js
│       │   │   └── auth.routes.js
│       │   ├── clubs/
│       │   │   ├── clubs.controller.js
│       │   │   ├── clubs.service.js
│       │   │   └── clubs.routes.js
│       │   ├── events/
│       │   │   ├── events.controller.js
│       │   │   ├── events.service.js
│       │   │   └── events.routes.js
│       │   └── memberships/
│       │       ├── memberships.controller.js
│       │       ├── memberships.service.js
│       │       └── memberships.routes.js
│       └── utils/
│           └── errors.js # Centralized error handling
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf      # Serves static + proxies /api → backend:4000
    ├── components.json # shadcn/ui v4 configuration (base-nova style)
    ├── .env.example    # VITE_ prefixed branding variables (copy to .env, gitignored)
    │
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css # Tailwind v4 @theme + shadcn CSS + brand variables
        ├── api/
        │   └── client.js # Axios instance with JWT interceptor
        ├── context/
        │   └── AuthContext.jsx # Auth state, login/logout, role helpers
        ├── components/
        │   ├── Layout.jsx # App shell with navbar, branding
        │   ├── ProtectedRoute.jsx # Role-guarded route wrapper
        │   └── ui/ # shadcn/ui generated components
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── ClubDirectory.jsx
        │   ├── ClubDetail.jsx
        │   ├── EventCalendar.jsx
        │   └── admin/
        │       ├── ManageClubs.jsx # PLATFORM_ADMIN
        │       ├── ClubMembers.jsx # CLUB_ADMIN
        │       └── PendingRequests.jsx # CLUB_ADMIN
        └── hooks/
            └── useAuth.js
```

---

## 6. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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
  id           String           @id @default(uuid())
  email        String           @unique
  passwordHash String
  role         UserRole         @default(STUDENT)
  name         String
  createdAt    DateTime         @default(now())
  memberships  ClubMembership[]
}

model Club {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  category    String
  logoUrl     String?
  createdAt   DateTime         @default(now())
  memberships ClubMembership[]
  events      Event[]
}

model ClubMembership {
  id        String           @id @default(uuid())
  userId    String
  clubId    String
  status    MembershipStatus @default(PENDING)
  role      MemberRole       @default(MEMBER)
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  club      Club             @relation(fields: [clubId], references: [id], onDelete: Cascade)

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
| Category as string on Club | Flexible; no rigid enum needed for diverse university ecosystems |
| `bannerUrl` on Event | Optional, URL-based — avoids file upload complexity in MVP |

---

## 7. API Endpoints

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register a new student account |
| POST | `/api/auth/login` | Public | Login, returns JWT access token |
| GET | `/api/auth/me` | JWT | Get current authenticated user profile |

### Clubs

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/clubs` | JWT | Any | List all clubs, supports `?search=` and `?category=` query params |
| GET | `/api/clubs/:id` | JWT | Any | Club detail with member count |
| POST | `/api/clubs` | JWT | PLATFORM_ADMIN | Create a new club |
| DELETE | `/api/clubs/:id` | JWT | PLATFORM_ADMIN | Delete a club (cascades memberships + events) |

### Memberships

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/clubs/:clubId/join` | JWT | STUDENT | Send a join request (creates PENDING membership) |
| GET | `/api/clubs/:clubId/members` | JWT | CLUB_ADMIN | List all members + pending requests |
| PATCH | `/api/clubs/:clubId/members/:userId/approve` | JWT | CLUB_ADMIN | Approve a pending request → ACTIVE |
| PATCH | `/api/clubs/:clubId/members/:userId/reject` | JWT | CLUB_ADMIN | Reject a pending request → REJECTED |
| PATCH | `/api/clubs/:clubId/members/:userId/alumni` | JWT | CLUB_ADMIN | Update active member status → ALUMNI |
| POST | `/api/clubs/:clubId/transfer` | JWT | CLUB_ADMIN | Transfer CLUB_ADMIN role to another member |

### Events

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/events` | JWT | Any | List upcoming events, supports `?clubId=` and `?joined=true` filters |
| POST | `/api/clubs/:clubId/events` | JWT | CLUB_ADMIN | Create an event for the club |
| DELETE | `/api/events/:id` | JWT | CLUB_ADMIN | Delete an event (must own the club) |

---

## 8. Authentication & SSO Strategy

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
// rbac.js
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Usage in routes:
router.post('/', requireRole('PLATFORM_ADMIN'), clubsController.create);
router.patch('/:id/members/:userId/approve', requireRole('CLUB_ADMIN'), membershipsController.approve);
```

### Frontend Route Protection

```jsx
<ProtectedRoute roles={['PLATFORM_ADMIN']}>
  <ManageClubs />
</ProtectedRoute>
```

`ProtectedRoute` checks `AuthContext.user.role` against allowed roles. Redirects to `/dashboard` if unauthorized.

---

## 9. White-Label Theming

### Environment Variables

| Variable | Example | Scope | Usage |
|----------|---------|-------|-------|
| `UNIVERSITY_NAME` | "State University" | Both | Navbar, login page, emails |
| `PRIMARY_BRAND_COLOR` | "#1E40AF" | Frontend | CSS variable `--brand-primary` |
| `LOGO_URL` | "https://cdn.uni.edu/logo.png" | Both | Navbar, login page |
| `DATABASE_URL` | "postgresql://..." | Backend | Prisma connection |
| `JWT_SECRET` | "super-secret-key" | Backend | Token signing |
| `PORT` | "4000" | Backend | Express listen port |

### Frontend Theme Injection

Frontend reads `VITE_*` prefixed variables via `import.meta.env`. Tailwind v4 uses CSS-first configuration — no `tailwind.config.js` needed.

```css
/* index.css — Tailwind v4 + shadcn/ui v4 */
@import "tailwindcss";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* shadcn/ui semantic tokens */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

/* Brand override — applied at build time via VITE_ env vars */
:root {
  --brand-primary: #1E40AF; /* Overridden by Vite at build time */
}

Components use `var(--brand-primary)` for buttons, links, highlights.

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
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "4000:4000"
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

  frontend:
    build: ./frontend
    restart: unless-stopped
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
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```

> **Note:** `prisma` must be listed in `dependencies` (not `devDependencies`) in `package.json` so that `npm ci --omit=dev` includes it.

### Frontend Dockerfile (Multi-stage)

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf (Reverse Proxy)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
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
| Multi-stage frontend build | Final image is ~20MB nginx vs ~800MB+ Node |
| nginx SPA fallback | `try_files` ensures React Router works on refresh |
| Backend runs `prisma migrate deploy` | DB schema applied automatically on container start |

---

## 11. Seed & Deseed Scripts

### seed.js (Manual: `node prisma/seed.js`)

Creates development data:

| Entity | Details |
|--------|---------|
| 1 PLATFORM_ADMIN | admin@university.edu / password123 |
| 2 CLUB_ADMINs | officer1@university.edu, officer2@university.edu |
| 5 STUDENTs | student1–5@university.edu |
| 3 Clubs | Academic ("Coding Club"), Sports ("Basketball Club"), Cultural ("Drama Club") |
| Memberships | Mix of ACTIVE, PENDING, ALUMNI across clubs |
| 5 Events | Spread across clubs, future dates |

All passwords hashed with bcrypt. Uses Prisma Client for inserts.

### deseed.js (Manual: `node prisma/deseed.js`)

Deletes all records in reverse dependency order:

```
Event → ClubMembership → Club → User
```

Uses `prisma.event.deleteMany()`, then `prisma.clubMembership.deleteMany()`, etc. Does not drop tables — only clears data.

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
| Club Members | `/admin/clubs/:id/members` | JWT | CLUB_ADMIN | View members, set alumni, transfer role |
| Pending Requests | `/admin/clubs/:id/requests` | JWT | CLUB_ADMIN | Approve/reject join requests |

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
| UI Framework | shadcn/ui (v4) + Tailwind CSS (v4) | Accessible, customizable, CSS-first theming via `@theme`, easy white-label theming |
| Testing | Skipped for MVP | Faster delivery; add later |
| Seed Scripts | Manual seed.js + deseed.js | User controls when to seed; not auto-triggered |
| IDs | UUIDs | No sequential leakage, safe for self-hosted |
| Auth Storage | localStorage | Simple for MVP; httpOnly cookies for production hardening |
| SSO Strategy | Service layer abstraction | Swap internals without touching controllers |
| File Uploads | URL-only | Avoids storage complexity; logos/banners linked externally |
| Error Handling | Centralized error utility | Consistent API error responses |
| Route Protection | Middleware (backend) + ProtectedRoute (frontend) | Defense in depth |
| Docker | 3-service compose | Single `docker compose up` for full stack |
| nginx | Frontend + API proxy | SPA routing + backend forwarding in one config |
