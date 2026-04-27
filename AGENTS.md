# Follow these guidelines

- Log your learning to AGENTS.md . Ensure who ever has this file will avoid any mistakes and gain desired success easily in this codebase. Similar mistakes shall not be made twice in this codebase.
- You Dont have to communicate with the user. User will provide prompt, You will complete the work autonomously and say just "Done" at the end.
- After finding an issue check if similar issue exists elsewhere. Though not all issues worth resolving at once.

---

## Rules (MUST follow before acting)

### Before adding any backend route

1. Check the **Route Mount Point Map** below.
2. Identify which mount point your new route will live on.
3. If that mount point has **more than one router**, check ALL other routers at that same mount point for parametric routes (e.g., `/:id`, `/:clubId`).
4. If any other router has a parametric route that could match your new route's path, you **MUST** put your route on a different mount point. Do NOT rely on registration order.
5. The only safe routes on a shared mount point are multi-segment paths like `/:resourceId/action` — these cannot collide with single-segment `/:id`.

### Before adding/modifying seed data

1. Cross-check every record against the Prisma schema — every required field (non-nullable, no `?`) must be explicitly provided.
2. Ensure all `UserRole` enum values have at least one user.
3. Deletion order must be reverse dependency: Event → ClubMembership → Club → User.

### Before modifying authorization

1. `requireRole()` uses hierarchy: PLATFORM_ADMIN inherits CLUB_ADMIN (not STUDENT).
2. CLUB_ADMIN-scoped endpoints need `requireClubAdmin` after `requireRole('CLUB_ADMIN')` for per-resource checks.
3. `requireClubAdmin` auto-bypasses PLATFORM_ADMIN — do not add manual checks for this.
4. `requireClubAdmin` lives in `middleware/rbac.js` alongside `requireRole` — import both from the same file.
5. `requireClubAdmin` reads `req.params.clubId` — only works on routes with `:clubId` param. For other resources (e.g., event delete where only `:id` is available), do the ownership check inside the service/controller.
6. Frontend `ProtectedRoute` has NO hierarchy awareness — always list all allowed roles explicitly (e.g., `roles={['CLUB_ADMIN', 'PLATFORM_ADMIN']}`).

### Before modifying frontend data fetching

1. If a page needs small extra context (e.g., user's membership status for a club), prefer extending an existing endpoint with an optional parameter over creating a new endpoint.
2. If data shown to the user is hardcoded or static, check whether a backend endpoint already exists to fetch real data before creating a new one.

---

## Reference

### Route Mount Point Map

| Mount Point | Router | File | Has Parametric Routes | Safe Literal Paths |
|---|---|---|---|---|
| `/api/auth` | `authRoutes` | `auth/auth.routes.js` | No | Any |
| `/api/clubs` | `clubRoutes` | `clubs/clubs.routes.js` | **Yes: `GET /:id`, `DELETE /:id`** | Only multi-segment (`/:id/action`) |
| `/api/clubs` | `membershipsRoutes` | `memberships/memberships.routes.js` | Yes: `/:clubId/join`, `/:clubId/members/*`, `/:clubId/transfer` | Only multi-segment |
| `/api/events` | `eventsRoutes` | `events/events.routes.js` | Yes: `DELETE /:id` | Any (only one router here) |
| `/api/memberships` | `membershipsAdminRouter` | `memberships/memberships.routes.js` | No | **Any — this is the safe mount for literal paths** |

**Collision zone:** `/api/clubs` has TWO routers. `clubRoutes` registers `GET /:id` which swallows ANY single-segment GET path (e.g., `/my-clubs`, `/categories`, `/stats`). `GET /categories` works only because it is registered BEFORE `/:id` **within the same router**. Adding a literal path to the OTHER router (`membershipsRoutes`) will always fail — Express already consumed the request in `clubRoutes`.

**Rule:** When adding a new endpoint to the memberships module with a literal path (like `/my-clubs`, `/stats`, `/search`), add it to `membershipsAdminRouter` (mounted at `/api/memberships`). Do NOT add it to `membershipsRoutes` (mounted at `/api/clubs`).

### Prisma v7 Setup

- `schema.prisma` datasource: only `provider = "postgresql"` (no `url`).
- `prisma.config.mjs` at backend root: `defineConfig({ datasource: { url: process.env.DATABASE_URL ?? '' } })`.
- PrismaClient requires `@prisma/adapter-pg` adapter with `pg` package.
- `prisma.config.mjs` is ESM — use `import.meta.url` + `fileURLToPath`, not `__dirname`.
- `prisma.config.mjs` uses `process.env.DATABASE_URL ?? ''` (not `env()`) because `env()` throws if missing.
- `prisma.config.mjs` must be in Docker image before `prisma generate` or `prisma migrate deploy`.

### Frontend Build

- `frontend/index.html` is the Vite entry point — must exist.
- Brand color: `main.jsx` sets `--brand-primary` CSS variable from `VITE_PRIMARY_BRAND_COLOR` env.
- Migrations without live DB: `npx prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script`. Commit `prisma/migrations/` to source control.

---

## Learnings

### Express Route Collision — happened twice

First `/my-admin-clubs`, then `/my-clubs` were added to `membershipsRoutes` (mounted at `/api/clubs`) where `clubRoutes` already had `GET /:id`. Both were swallowed by `/:id`. Root cause: the learning was passive prose, not an actionable rule. See **Rules → Before adding any backend route** above for the mandatory checklist.

### Per-Resource Authorization

`requireRole()` is global RBAC — insufficient for CLUB_ADMIN who should only manage their own clubs. Use `requireClubAdmin` middleware (queries `ClubMembership` for ACTIVE OFFICER membership) after `requireRole('CLUB_ADMIN')`. PLATFORM_ADMIN is auto-bypassed in `requireClubAdmin`.

### Role Hierarchy

`requireRole` uses `ROLE_INHERITS` map: PLATFORM_ADMIN inherits CLUB_ADMIN but not STUDENT. Frontend `ProtectedRoute` has no hierarchy — list all roles explicitly.

### Extending Endpoints vs. Creating New Ones

Prefer extending existing endpoints with optional params (e.g., `getById(id, userId)`) over creating separate endpoints for context like user membership status.

### Seed Data Pitfalls

Missing required fields (`endTime` on `Event`) and missing roles (no CLUB_ADMIN users) both caused seed failures. Always validate against schema and cover all `UserRole` enum values.

### Deseed Deletion Order

Foreign key constraints require reverse dependency order: Event → ClubMembership → Club → User. Explicit deletion is safer than relying on `onDelete: Cascade`.

### Controller Boilerplate — asyncHandler

All controller functions use `asyncHandler` wrapper from `utils/asyncHandler.js` instead of manual try/catch blocks. New controllers MUST use `asyncHandler` — do not re-introduce try/catch boilerplate.

### Cross-Module Dependencies

Controllers must NOT import services from other modules for authorization checks. Use `requireClubAdmin` middleware from `middleware/rbac.js` instead. If `requireClubAdmin` cannot be used (no `:clubId` param), do the check in the service layer — never import another module's service into a controller for auth.

### Duplicate Service Functions

When multiple service functions differ only in an expected-status/new-status pair (e.g., approve/reject/setAlumni), extract a shared private helper (`updateMembershipStatus`). Do not copy-paste function bodies with minor token changes.
