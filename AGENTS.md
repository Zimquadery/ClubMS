# Follow these guidelines

- Proactively log your learning to AGENTS.md . Ensure who ever has this file will avoid any mistakes and gain desired success easily in this codebase. Similar mistakes shall not be made twice in this codebase.
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
| `/api/clubs` | `clubRoutes` | `clubs/clubs.routes.js` | **Yes: `GET /:id`, `PATCH /:id`, `DELETE /:id`** | Only multi-segment (`/:id/action`) |
| `/api/clubs` | `membershipsRoutes` | `memberships/memberships.routes.js` | Yes: `/:clubId/join`, `/:clubId/leave`, `/:clubId/members/*`, `/:clubId/transfer` | Only multi-segment |
| `/api/events` | `eventsRoutes` | `events/events.routes.js` | **Yes: `GET /:id`, `PATCH /:id`, `DELETE /:id`** | Only multi-segment (`/:id/action`) |
| `/api/events` | `rsvpRoutes` | `rsvp/rsvp.routes.js` | Yes: `/:id/rsvp`, `/:id/rsvps`, `/:id/rsvps/export` | Only multi-segment |
| `/api/memberships` | `membershipsAdminRouter` | `memberships/memberships.routes.js` | No | **Any — this is the safe mount for literal paths** |
| `/api/stats` | `statsRoutes` | `stats/stats.routes.js` | No | Any |
| `/api/audit-logs` | `auditRoutes` | `audit/audit.routes.js` | No | Any |
| `/api/upload` | `uploadRoutes` | `upload/upload.routes.js` | No | Any |

**Collision zones:** `/api/clubs` and `/api/events` each have TWO routers. On `/api/clubs`, `clubRoutes` registers `GET /:id` which swallows ANY single-segment GET path. On `/api/events`, `eventsRoutes` registers `GET /:id` — but `rsvpRoutes` only uses multi-segment paths (`/:id/rsvp`, `/:id/rsvps`) so no collision occurs. Adding a single-segment literal path to `rsvpRoutes` would collide with `eventsRoutes` `/:id`.

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

### Transactional Operations

Multi-step DB operations (e.g., club creation: create club + create membership + update user role) MUST be wrapped in `prisma.$transaction()`. Non-transactional multi-step operations cause data corruption on partial failure.

### Date Validation

`new Date(garbage)` returns `Invalid Date` (NaN). `NaN < NaN` is `false`, so `end < start` checks pass for invalid input. Always validate with `isNaN(date.getTime())` before comparison.

### Rejected User Re-application

REJECTED users can re-apply by updating their membership status back to PENDING (not creating a new record, since `@@unique([userId, clubId])` prevents duplicates). The requestJoin service handles this automatically.

### Security Middleware Stack

Backend uses: `helmet()` for headers, `cors({ origin: FRONTEND_URL })`, `express.json({ limit: '10kb' })`, `express-rate-limit` (auth: 20/15min, general: 100/min). `JWT_SECRET` has no fallback — throws at startup if missing.

### Input Validation (Zod)

All endpoints use Zod schemas for input validation via `validate()` and `validateQuery()` middleware from `middleware/validate.js`. Each module has its own `*.schemas.js` file. The `validate` middleware strips unknown fields by replacing `req.body` with `result.data`.

### Pagination

All list endpoints return `{ items, total, page, limit, totalPages }`. Default page size is 20 (clubs/events) or 50 (members). Max limit is 100. Frontend uses the `Pagination` component from `components/Pagination.jsx`. Backward compatibility: existing code that doesn't pass page/limit gets default pagination.

### Frontend API Response Handling

Backend list endpoints now return paginated objects. Frontend pages use `res.data.items || res.data` for backward compatibility. When fetching without pagination (e.g., dropdowns), pass `limit=100`.

### Profile Management

`PATCH /api/auth/profile` (name, email) and `PATCH /api/auth/password` (currentPassword, newPassword). AuthContext provides `refreshUser()` to update the user state after profile changes. Profile page at `/profile` with both forms.

### Event Detail

`GET /api/events/:id` returns event with club info and user membership. EventDetail.jsx at `/events/:id` shows full event details with edit/delete for authorized users. EventCalendar cards link to event detail pages.

### Past Events

`GET /events?timeRange=past|upcoming|all` — default is `upcoming`. Past events are sorted `startTime: 'desc'`. EventCalendar has a dropdown to switch between upcoming/past/all.

### Event RSVP

`EventRsvp` model with `@@unique([eventId, userId])`. Upsert pattern: `prisma.eventRsvp.upsert({ where: { eventId_userId: { eventId, userId } } })`. Routes mounted at `/api/events` via `rsvpRoutes` — uses multi-segment paths (`/:id/rsvp`, `/:id/rsvps`) to avoid collision with `eventsRoutes` `/:id`.

### Dashboard Analytics

`GET /api/stats/dashboard` returns role-specific stats. PLATFORM_ADMIN sees global counts. CLUB_ADMIN sees their clubs' counts. STUDENT sees their own counts. Frontend `StatCard` component renders metric cards. Stats module is a standalone module at `modules/stats/`.

### Structured Logging

`pino-http` middleware logs all requests. `pino` logger at `lib/logger.js`. Error handler logs 5xx with full error object, 4xx with status + message. `LOG_LEVEL` env var controls verbosity (default: `info`).

### Frontend Loading States

All pages use `Skeleton` component variants from `components/ui/skeleton.jsx` instead of spinner divs. Variants: `Skeleton` (base), `CardSkeleton`, `EventCardSkeleton`, `ListSkeleton`, `DetailSkeleton`. Each page imports the appropriate variant.

### Frontend Axios Configuration

`api/client.js` has 15s timeout and 1 retry on timeout (ECONNABORTED). 401 interceptor does hard reload to `/login` (acceptable trade-off since interceptors are outside React's component tree).

### Frontend Form Validation

Register: confirm password field + password strength meter (Weak/Fair/Strong based on length, uppercase, numbers, symbols). Event create/edit: frontend date validation (end > start) before API call. All backend validation via Zod remains the source of truth.

### Audit Logging

`AuditLog` model in Prisma stores action, actorId, targetType, targetId, metadata (JSON string), ipAddress. `auditLog` middleware in `middleware/auditLog.js` monkey-patches `res.end` to log successful operations. Applied to club CRUD, event CRUD, membership approve/reject/alumni/remove/transfer/promote/demote/bulk-approve/bulk-reject routes. Query endpoint at `GET /api/audit-logs` (PLATFORM_ADMIN only). Frontend page at `/admin/audit-logs`. When adding new admin actions, always add `auditLog` middleware and update the `ACTIONS` array in `AuditLog.jsx`.

### Member Role Management

`promoteMember` promotes MEMBER → OFFICER (transactional: updates ClubMembership + User role to CLUB_ADMIN). `demoteMember` demotes OFFICER → MEMBER (checks remaining officer count before downgrading user role). Routes: `PATCH /:clubId/members/:userId/promote`, `PATCH /:clubId/members/:userId/demote`. Both require CLUB_ADMIN + requireClubAdmin.

### Bulk Actions

`bulkApprove`/`bulkReject` accept `{ userIds: string[] }` and use `updateMany` in a transaction. Schemas validate array is non-empty with max 100 items. Frontend uses checkboxes + sticky bulk action bar in PendingRequests.

### File Upload

`multer` configured in `config/upload.js` — disk storage to `backend/uploads/`, 5MB limit, image-only filter (JPEG/PNG/GIF/WebP). Upload endpoint at `POST /api/upload` returns `{ url }`. Static serving at `/uploads`. Frontend proxy and nginx config both proxy `/uploads` to backend. Docker volume `uploads` persists files. File upload UI replaces URL-only inputs in club create/edit and event create/edit forms.

### CSV Export

`exportMembersCsv` and `exportRsvpsCsv` build CSV strings from DB queries. Endpoints return CSV with Content-Disposition header. Frontend uses blob download pattern (createObjectURL + link.click).

### Dark Mode

Tailwind v4 `@custom-variant dark` uses `.dark` class. `ThemeContext` + `useTheme` hook manages state, persists to localStorage. Toggle button in Layout header (Sun/Moon icons). CSS variables override all theme colors in `.dark` block.

### Code Splitting

All page components use `React.lazy()` with `Suspense` fallback (spinner). Each page is a separate chunk. Main bundle reduced from ~557KB to ~456KB.

### Swagger API Docs

`swagger-jsdoc` + `swagger-ui-express` at `/api/docs`. All routes annotated with OpenAPI JSDoc comments. Tags: Auth, Clubs, Events, Memberships, RSVP, Stats, Audit, Upload.

### Test Suite

Jest + supertest. 64 tests in `backend/tests/`. Service unit tests (memberships, events, auth) mock prisma. Integration tests (auth) use Express app via supertest. Config in `backend/jest.config.js`. CI runs tests via GitHub Actions.

### Email Notifications (Scaffold)

`lib/notifications.js` provides `sendNotification`, `notifyMembershipApproved`, `notifyMembershipRejected`, `notifyNewEvent`. Uses console provider by default. `setProvider(name, provider)` allows swapping to email service (SendGrid/Resend).
