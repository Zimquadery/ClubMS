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
