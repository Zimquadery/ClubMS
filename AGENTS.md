# Guidelines

- proactively log learnings to AGENTS.md to prevent repeated mistakes.
- Be super brief. Work autonomously until success.
- Follow YAGNI and DRY principles.
- After finding an issue, check if similar exists elsewhere.

---

## Rules (MUST follow before acting)

### Before adding any backend route

1. Check the **Route Mount Point Map** below.
2. If the mount point has **multiple routers**, check ALL for parametric routes (`/:id`, `/:clubId`).
3. If any could match your path, use a **different mount point**. Do NOT rely on registration order.
4. Only multi-segment paths (`/:resourceId/action`) are safe on shared mount points.

### Before adding/modifying seed data

1. Validate every record against Prisma schema — all required fields must be explicit.
2. All `UserRole` enum values need at least one user.
3. Deseed order: EventRsvp → Announcement → AuditLog → EventHost → Event → ClubMembership → Club → User.
4. Cover all enum statuses: PENDING (6), ACTIVE, ALUMNI (3), REJECTED (3) for memberships; GOING, MAYBE, NOT_GOING for RSVPs.
5. Every club: 1+ OFFICER, 1+ MEMBERs, 1+ events.

### Before modifying authorization

1. `requireRole()` hierarchy: PLATFORM_ADMIN inherits CLUB_ADMIN; FACULTY inherits CLUB_ADMIN + STUDENT.
2. CLUB_ADMIN endpoints: `requireRole('CLUB_ADMIN')` then `requireClubAdmin` for per-resource checks.
3. `requireClubAdmin` auto-bypasses PLATFORM_ADMIN and FACULTY — no manual check needed.
4. Both live in `middleware/rbac.js`.
5. `requireClubAdmin` reads `req.params.clubId` — only works with `:clubId` param. Otherwise check in service/controller.
6. Frontend `ProtectedRoute` has NO hierarchy — list all allowed roles explicitly.

### Before modifying frontend data fetching

1. Prefer extending existing endpoints with optional params over creating new ones.
2. Check if a backend endpoint already exists before creating new ones for hardcoded/static data.

### Before using any existing component

1. Read the component file to confirm its prop signature.
2. Match prop names exactly — do not guess or assume conventions.

### Before writing JSX in ternary/map expressions

1. Multiple sibling elements inside `(...)` or ternary branches must be wrapped in `<>...</>`.
2. After editing JSX, verify the nesting is valid (no adjacent unwrapped elements).

### Before rendering any page/section with member-only data

1. **Enumerate all viewer states** for the page: not-logged-in, logged-in non-member, pending/rejected/alumni member, active member, officer, admin. Decide what each sees.
2. **Every data fetch must be gated** behind the condition that allows the viewer to see it. If the backend would 403, the frontend must not make the request at all.
3. **Every UI section must be conditionally rendered** based on viewer state — hide the entire section (card, list, etc.) for unauthorized viewers, not just disable it.
4. **Grid layouts must adapt** when sections are hidden — use dynamic col counts or restructure so there's no empty space.
5. **Error toasts from expected authorization failures are bugs.** If a 403 is expected for some viewers, the fetch should never happen; a toast means the frontend didn't gate correctly.

---

## Reference

### Route Mount Point Map

| Mount Point | Router | Parametric? | Safe Paths |
|---|---|---|---|
| `/api/auth` | `authRoutes` | No | Any |
| `/api/clubs` | `clubRoutes` | **`/:id` (GET/PATCH/DELETE)** | Multi-segment only |
| `/api/clubs` | `announcementsRoutes` | `/:clubId/announcements/*` | Multi-segment only |
| `/api/clubs` | `membershipsRoutes` | `/:clubId/*` | Multi-segment only |
| `/api/events` | `eventsRoutes` | **`/:id` (GET/PATCH/DELETE)**, `/:id/cohosts`, `/:id/cohosts/:clubId` | Multi-segment only |
| `/api/events` | `rsvpRoutes` | `/:id/rsvp`, `/:id/rsvps` | Multi-segment only |
| `/api/memberships` | `membershipsAdminRouter` | No | **Any — safe for literal paths** |
| `/api/announcements` | `announcementsRecentRouter` | No | **Any — safe for literal paths** |
| `/api/stats` | `statsRoutes` | No | Any |
| `/api/audit-logs` | `auditRoutes` | No | Any |
| `/api/upload` | `uploadRoutes` | No | Any |

**Collision zones:** `/api/clubs` and `/api/events` each have TWO routers. `GET /:id` swallows any single-segment GET. Literal-path membership endpoints go on `membershipsAdminRouter` (`/api/memberships`), NOT `membershipsRoutes` (`/api/clubs`).

### Before modifying Prisma schema

1. **After any schema change, run `npx prisma generate` (from `backend/`) before seeding or running code that uses the new model.** `migrate dev` auto-runs generate, but `migrate reset` does NOT.
2. Full sequence for schema changes: edit schema → `npx prisma migrate dev --name <desc>` (from `backend/`) → seed.
3. If reset needed: `npx prisma migrate reset --force` (from `backend/`) → `npx prisma generate` → seed.
4. All Prisma commands MUST run from `backend/` directory (where `prisma.config.mjs` lives).

### Prisma v7

- `schema.prisma`: only `provider = "postgresql"` (no `url`).
- `prisma.config.mjs`: `defineConfig({ datasource: { url: process.env.DATABASE_URL ?? '' } })`. ESM — use `import.meta.url` + `fileURLToPath`.
- PrismaClient requires `@prisma/adapter-pg` with `pg`.
- `prisma.config.mjs` must be in Docker image before `prisma generate`/`migrate deploy`.
- Offline migration: `npx prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script`.

### Frontend Build

- Entry: `frontend/index.html`. Brand color: `--brand-primary` from `VITE_PRIMARY_BRAND_COLOR` env in `main.jsx`.

### Tech Stack Quick Ref

- **Validation:** Zod schemas per module (`*.schemas.js`), `validate()`/`validateQuery()` from `middleware/validate.js`. Strips unknown fields.
- **Controllers:** Use `asyncHandler` from `utils/asyncHandler.js` — no manual try/catch.
- **Transactions:** Multi-step DB ops MUST use `prisma.$transaction()`.
- **Date validation:** `isNaN(date.getTime())` before comparison — `new Date(garbage)` is `Invalid Date`, `NaN < NaN` is `false`.
- **Cross-module auth:** Controllers must NOT import other modules' services for auth. Use `requireClubAdmin` middleware or check in service layer.
- **Duplicate functions:** Extract shared helpers for status-update variants (approve/reject/alumni).
- **Security:** `helmet()`, `cors({ origin: FRONTEND_URL })`, `express.json({ limit: '10kb' })`, `express-rate-limit` (auth: 20/15min, general: 100/min). `JWT_SECRET` has no fallback.
- **Logging:** `pino-http` + `pino` at `lib/logger.js`. `LOG_LEVEL` env (default: `info`).
- **Pagination:** All lists return `{ items, total, page, limit, totalPages }`. Defaults: 20 (clubs/events), 50 (members). Max 100. Frontend: `res.data.items || res.data`.
- **Search:** Server-side only for paginated lists. Debounced 300ms input → backend `search` param. Client-side `useMemo` filter only searches current page.
- **Aggregate stats:** Backend returns via `groupBy` alongside paginated items. Never compute from page slice.
- **Tests:** Jest + supertest, `backend/tests/`, `backend/jest.config.js`. CI via GitHub Actions.
- **API Docs:** `swagger-jsdoc` + `swagger-ui-express` at `/api/docs`.
- **Email:** `lib/notifications.js` — console provider default, `setProvider()` to swap.
- **Upload:** `multer` in `config/upload.js` → `backend/uploads/`, 5MB, images only. `POST /api/upload` returns `{ url }`.
- **CSV:** `exportMembersCsv`/`exportRsvpsCsv` → blob download.
- **Code splitting:** `React.lazy()` + `Suspense` for all pages.
- **Axios:** `api/client.js` — 15s timeout, 1 retry on timeout, 401 → hard reload `/login`.

### Rejected User Re-application

`@@unique([userId, clubId])` prevents duplicates. REJECTED → PENDING via `requestJoin` (updates existing record).

### Audit Logging

`AuditLog` model: action, actorId, targetType, targetId, metadata (JSON), ipAddress. Middleware in `middleware/auditLog.js`. Applied to club/event CRUD + membership actions. Query: `GET /api/audit-logs` (PLATFORM_ADMIN). Frontend: `/admin/audit-logs`. **New admin actions must add `auditLog` middleware + update `ACTIONS` array in `AuditLog.jsx`.**

### Member Roles

- **promote:** MEMBER → OFFICER (transactional: ClubMembership + User role → CLUB_ADMIN).
- **demote:** OFFICER → MEMBER (checks remaining officer count).
- **remove:** Deletes membership (blocks OFFICER — transfer first).
- **Self-action guard:** `demote`/`remove` take `callerId` (3rd arg), reject `userId === callerId`. Always pass `req.user.userId` — omitting silently no-ops.
- Routes: `PATCH /:clubId/members/:userId/promote|demote`, `DELETE /:clubId/members/:userId`. Requires CLUB_ADMIN + `requireClubAdmin`.
- **Bulk:** `bulkApprove`/`bulkReject` accept `{ userIds: string[] }`, use `updateMany` in transaction. Max 100. Frontend: checkboxes + sticky bar.

### RSVP

`EventRsvp` with `@@unique([eventId, userId])`. Upsert: `prisma.eventRsvp.upsert({ where: { eventId_userId: { eventId, userId } } })`. Multi-segment routes to avoid collision. `EventRsvps.jsx` at `/events/:id/rsvps` — CLUB_ADMIN + PLATFORM_ADMIN only. Backend `listByEvent` requires auth, returns `{ items, total, counts }`.

### Event Hosts (primary + co-host collaboration)

Events no longer have a `clubId` column. Instead an `EventHost` join table (`@@unique([eventId, clubId])`, `isPrimary Boolean`, `addedById String?`) is the single source of truth for hosting.

- **Primary host:** exactly one `EventHost` per event with `isPrimary: true`. Always exists (seed/migration backfill guarantees it). Cannot be removed via API.
- **Co-hosts:** zero or more `EventHost` rows with `isPrimary: false`.
- **Shared helpers live in `modules/eventHosts/eventHosts.service.js`:** `isHostOfficer`, `isPrimaryHostOfficer`, `isActiveMemberOfAnyHost`, `assertHostOfficer`, `getPrimaryClubId`, `getHostClubIds`, `addCoHost`, `removeCoHost`, `isPrimaryHostClub`. Import this — do NOT re-derive `event.clubId` (it doesn't exist).
- **Permission matrix:**
  | Action | Allowed |
  |---|---|
  | Edit event | Officer of ANY host club |
  | Delete event | Officer of PRIMARY host club only |
  | Add/remove co-host | Officer of ANY host club (primary cannot be removed) |
  | RSVP | Active member of ANY host club |
  | View/export RSVPs | Officer of ANY host club |
- **API responses** (`getById`/`list`) attach computed `club` (primary), `clubId` (primary), `primaryClubId` for backward compat with frontend reads like `event.club.name`. The actual host list is in `hosts: [{ clubId, isPrimary, club }]`.
- **Club deletion guard:** `clubs.service.deleteClub` checks `isPrimaryHostClub` and throws 409 if the club is primary of any event. Co-host clubs can be deleted (their EventHost rows cascade, event survives on remaining hosts).
- **Routes:** `POST /api/events/:id/cohosts` (body `{ clubId }`), `DELETE /api/events/:id/cohosts/:clubId` — multi-segment, safe on the `/api/events` collision zone. Audit actions: `EVENT_COHOST_ADD`, `EVENT_COHOST_REMOVE`.
- **Frontend co-host picker source:** existing `GET /api/memberships/my-admin-clubs` (returns clubs where current user is OFFICER+ACTIVE). Do NOT create a new endpoint. Hook `useAdminClubSelector` already wraps it.
- **`clubs.service.getById` no longer uses `Club.events` relation** (removed from schema). It now queries events via `prisma.event.findMany({ where: { hosts: { some: { clubId } } } })` and maps each to a synthetic `{ ...event, club, clubId }` for frontend compatibility.

### Frontend Styling (Dashboard = gold standard)

1. **No hardcoded Tailwind colors.** Use semantic tokens: `bg-background`, `text-muted-foreground`, `bg-destructive`, `bg-status-green`, `bg-status-yellow`, `border-input`, `text-brand-primary`.
2. **Typography:** `<h1>` = `text-2xl font-bold`. Subtitles = `text-sm text-muted-foreground`. List items = `text-sm font-medium`. Metadata = `text-xs text-muted-foreground`.
3. **Cards:** Always `CardHeader` + `CardTitle` + `CardContent`. Title = icon + label: `<CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-brand-primary" />Title</CardTitle>`.
4. **Status badges:** `bg-status-green/15 text-status-green` (active), `bg-status-yellow/15 text-status-yellow` (pending), `bg-brand-primary/10 text-brand-primary` (alumni).
5. **RSVP buttons:** `bg-status-green`/`bg-status-yellow`/`bg-destructive` + `hover:*/90` + `text-white`.
6. **Lists in cards:** `divide-y` + `py-2 first:pt-0 last:pb-0`. Not `space-y-2` sub-boxes.
7. **Loading:** `ListSkeleton` for lists, `DetailSkeleton` for details, `CardSkeleton`/`EventCardSkeleton` for cards. From `components/ui/skeleton.jsx`.
8. **Forms:** shadcn components (`Input`, `Textarea`, `Select`, `Label`). Never raw `<textarea>`.
9. **Grids:** `grid gap-4 md:grid-cols-2`.

### ARIA

Filter tab groups: `role="tablist"` on container, `role="tab" aria-selected={isActive}` on buttons.

### Radix Dialog Animations

Use `@keyframes` with `data-state` selectors, NOT CSS transitions (transitions don't fire on mount). Applies to ALL Radix primitives with `data-state`. shadcn classes: `t-modal`, `t-modal-overlay` in `index.css`.

```css
.t-modal-overlay[data-state="open"] { animation: overlayShow 250ms cubic-bezier(0.25, 1, 0.5, 1); }
.t-modal-overlay[data-state="closed"] { animation: overlayHide 187ms cubic-bezier(0.25, 1, 0.5, 1); }
@keyframes overlayShow { from { opacity: 0; } to { opacity: 1; } }
@keyframes overlayHide { from { opacity: 1; } to { opacity: 0; } }
```

---

## Learnings (historical context)

- **Route collision happened twice:** `/my-admin-clubs`, `/my-clubs` swallowed by `/:id` on `membershipsRoutes`. See Rules.
- **Per-resource auth:** `requireRole()` is global; CLUB_ADMIN needs `requireClubAdmin` for own-club checks.
- **Seed pitfalls:** Missing required fields + missing enum role users → seed failures.
- **Deseed order:** EventRsvp → Announcement → AuditLog → EventHost → Event → ClubMembership → Club → User. Explicit deletion required — AuditLog `onDelete: SetNull` can orphan logs; EventHost cascades on Event/Club but explicit deletion keeps counts accurate and survives schema changes.
- **Prisma generate required after schema changes:** `migrate reset` does NOT auto-run `generate`. Running seed before generate causes `TypeError: Cannot read properties of undefined (reading 'create')`. Always `npx prisma generate` from `backend/` after any schema edit.
- **REJECTED re-apply:** Update status to PENDING, don't create new record (`@@unique` prevents it).
- **Viewer-state blindness:** ClubDetail page rendered member-only sections (announcements, members list) for all visitors, causing 403 toasts. Root cause: never enumerated viewer states (non-member, pending, rejected, alumni, active, admin) before building the page. Every page with member-only data MUST gate both the fetch and the UI section per the "Before rendering any page/section" rule.
- **Component prop mismatch:** Pagination component uses `page` prop; subagent passed `currentPage`. Always read the component source before using it.
- **JSX adjacency in ternaries:** Adjacent JSX elements inside a ternary's else branch (`(a ? b : c d)`) cause a compile error. Wrap siblings in `<>...</>`.
- **FACULTY role revert on demote/transfer:** When demoting an OFFICER or transferring admin away, check the user's current `User.role` — FACULTY users should revert to `'FACULTY'` not `'STUDENT'`. Use `tx.user.findUnique({ select: { role: true } })` inside the transaction.
- **FACULTY inherits CLUB_ADMIN + STUDENT:** `requireRole('STUDENT')` and `requireRole('CLUB_ADMIN')` both pass for FACULTY. Use `requireRole('PLATFORM_ADMIN')` for platform-only actions (e.g., `PATCH /memberships/users/:userId/role`).
- **Role promotion endpoint:** `PATCH /api/memberships/users/:userId/role` on `membershipsAdminRouter` — PLATFORM_ADMIN only. Cannot change PLATFORM_ADMIN role.
- **Tailwind v4 `@theme inline` prevents dark mode:** `@theme inline` hardcodes color values directly into utility classes (e.g., `.bg-background{background-color:#fff}`) instead of using `var(--color-*)` references. CSS variable overrides via `.dark {}` have no effect because the utilities never read them. Use `@theme` (without `inline`) when you need runtime theme switching via CSS custom properties.
- **Self-action guard silent no-op:** `demoteMember`/`removeMember` take `callerId` as 3rd service arg (controller passes `req.user.userId`). If a future caller omits it, `userId === undefined` → guard passes silently. Plain JS doesn't enforce arity. Same pattern as `transferAdmin`'s `currentAdminId === newAdminId` check.
- **Prisma `migrate dev --create-only` requires interactive shell:** On non-interactive terminals it errors before writing the migration file. Hand-write the `migration.sql` (timestamped folder) following the init-migration format conventions, then `prisma migrate deploy` to apply.
- **Migration backfill ordering:** When dropping a column that needs to seed a new join table first, write the `INSERT INTO ... SELECT ... FROM` BEFORE the `ALTER TABLE DROP COLUMN`. Idempotency via `WHERE NOT EXISTS` (or `ON CONFLICT DO NOTHING` once the unique index exists) makes re-runs safe.
- **`gen_random_uuid()` available in Postgres 13+:** Use `REPLACE(gen_random_uuid()::text, '-', '')` for backfilling TEXT-id rows. Avoids needing `pgcrypto` extension.
- **`requireRole('CLUB_ADMIN')` middleware vs service-layer `assertHostOfficer`:** The middleware only checks the user's global role (passes for any CLUB_ADMIN). Service-layer checks (`isHostOfficer`, `isPrimaryHostOfficer`) enforce per-resource ownership. Both run in sequence: middleware first (cheap global gate), service second (precise resource check).
- **React TDZ with derived `const` in deps:** A `useEffect` whose deps array references a `const canManageEvents` declared further down the function body throws a temporal-dead-zone ReferenceError at render time. Move derived const declarations ABOVE any effect that depends on them.
- **Seed `mem()` helper bypasses `promoteMember`:** The seed's `mem(userId, clubId, status, role)` inserts a `ClubMembership` row directly — it does NOT flip the `User.role` global field. Any user seeded with an OFFICER membership MUST also have `role: 'CLUB_ADMIN'` in the `userData` array, or every `requireRole('CLUB_ADMIN')` route (announcement pin/create/delete, event manage, member approve, etc.) will 403 despite the UI showing them as officer. Symptom surfaced as "pin toggle not working" for student8. Compare officer1/2/3 (correctly CLUB_ADMIN) vs student8 (was STUDENT).
- **Seed is re-run-safe but NOT self-healing:** `prisma.user.upsert({ update: {} })` (seed.js line ~44) means existing users are never updated on re-run, and the seed bails early if clubs already exist (line ~71). So a seed.js edit alone does NOT fix an existing dev DB — you must also patch the live row (e.g. `npx prisma db execute --file <sql>` with `UPDATE "User" SET role = ... WHERE email = ...`). Note: `prisma db execute` takes `--file`/`--stdin` and reads config from `prisma.config.mjs` (no `--schema` flag). It executes DDL/DML but does NOT return SELECT results — verify via a one-shot node script using `require('./src/lib/prisma')` (Prisma v7 needs the pg adapter; bare `new PrismaClient()` fails).
- **Hook-returned binding referenced inside the same hook's own options → TDZ crash:** `const { items, searchParams } = usePaginatedFetch({ deps: [clubId, searchParams.get('tab')] })` throws `ReferenceError: Cannot access 'searchParams' before initialization` on EVERY render. The options object is the argument — evaluated before the call returns, so the destructured `const` is still in the temporal dead zone. Arrow-function bodies (e.g. `fetchFn`) are safe (lazy closure); only eagerly-evaluated fields (`deps`, `enabled`) crash. Fix: get the value from an independent earlier hook call (e.g. call `useSearchParams()` directly at the top, compute the primitive, then pass it in). Symptom: page goes blank, browser back doesn't recover, only a full refresh fixes OTHER pages, and the broken page stays blank on refresh too — because there's no error boundary. The app now has `RouteErrorBoundary` wrapping `<Outlet/>` in `Layout.jsx`; any future render error degrades to a recoverable fallback instead of unmounting the whole tree.
