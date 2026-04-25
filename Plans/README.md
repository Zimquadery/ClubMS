# ClubMS — Implementation Roadmap

**Project:** ClubMS — Self-hosted, white-label University Club Management Platform
**Stack:** React (Vite) + Node.js/Express + PostgreSQL + Prisma + Docker + shadcn/ui + Tailwind CSS

---

## Phase Overview

| Phase | Name | Goal | Key Deliverables |
|-------|------|------|------------------|
| 1 | [Foundation](./Phase-1-Foundation.md) | Project scaffolding | Docker Compose, Prisma schema, Express skeleton, Dockerfiles |
| 2 | [Auth](./Phase-2-Auth.md) | Authentication | Register/login endpoints, JWT middleware, auth service |
| 3 | [RBAC + Frontend Shell](./Phase-3-RBAC-Frontend-Shell.md) | Access control + UI | RBAC middleware, React app, AuthContext, Login/Register/Dashboard |
| 4 | [Clubs](./Phase-4-Clubs.md) | Club directory | Club CRUD, ClubDirectory, ClubDetail, ManageClubs |
| 5 | [Memberships](./Phase-5-Memberships.md) | Member lifecycle | Join requests, approve/reject/alumni, transfer, PendingRequests, ClubMembers |
| 6 | [Events](./Phase-6-Events.md) | Event calendar | Event CRUD, EventCalendar, club-scoped creation |
| 7 | [Branding + Seed](./Phase-7-Branding-Seed.md) | Deployment readiness | White-label theming, seed.js, deseed.js, integration test |

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

## Time-Independent Execution

Each phase file is self-contained with:
- Full context and scope
- Complete file manifest
- Implementation details with code snippets
- Database queries
- Error handling specifications
- Acceptance criteria
- Verification commands

**Phases are time-independent** — they can be executed at any pace, by any developer, in any session. Each phase document provides enough context to resume work without prior conversation history.

---

## Parallel Execution Opportunities

- **Phase 4 + Phase 5 backend:** Clubs endpoints and membership endpoints can be built simultaneously (different modules)
- **Phase 5 + Phase 6:** Memberships and events are independent features
- **Phase 7 theming:** Can start verifying branding as early as Phase 3 (once frontend exists)

---

## MVP Feature Coverage

| Feature | Primary Phase | Supporting Phases |
|---------|---------------|-------------------|
| Club Directory | Phase 4 | Phase 5 (member count), Phase 6 (events on detail) |
| Event Calendar | Phase 6 | Phase 4 (club context), Phase 5 (joined filter) |
| Membership Workflow | Phase 5 | Phase 3 (auth), Phase 4 (club context) |

---

## RBAC Coverage

| Role | Phase Introduced | Capabilities Built |
|------|------------------|--------------------|
| STUDENT | Phase 2 | Register, login, browse |
| CLUB_ADMIN | Phase 3 | ProtectedRoute ready; Phase 5-6 for actual capabilities |
| PLATFORM_ADMIN | Phase 3 | ProtectedRoute ready; Phase 4 for club management |

---

## Key Design Principles (across all phases)

1. **White-Label:** All branding from env vars, never hardcoded
2. **SSO Preparedness:** Auth service layer abstracted for future swap
3. **Defense in Depth:** Backend middleware + frontend route protection
4. **Cascade Deletes:** Database cleanup automatic on club deletion
5. **UUIDs:** No sequential ID leakage
6. **Consistent Errors:** Centralized error handling utility
