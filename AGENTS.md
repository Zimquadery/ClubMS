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

### Before writing or modifying backend tests

1. **Never assert on Prisma call shapes.** Don't write `expect(prisma.X.create).toHaveBeenCalledWith({ data: ..., include: { ... } })`. These tests are biased by the implementation: they break on benign refactors (renaming an `include`) and pass on behavior-breaking bugs that preserve the call shape. Assert on **HTTP behavior** instead (status, body, headers, side-effect DB rows).
2. **HTTP integration tests are the default.** Use `request(createApp()).method(path).set('Authorization', tokenFor(user))`. Tests live in `tests/api/*.test.js`. The full app is mounted (real middleware chain: RBAC, Zod, error handler, audit, JWT verify, rate limiter bypassed via `SKIP_RATE_LIMIT=1`).
3. **Real Postgres via testcontainers, NOT mocked Prisma.** `globalSetup` spins up a `postgres:16-alpine` container, runs `prisma migrate deploy`, writes the URL to `tests/.pg.url`. `tests/setup.js` reads that file and sets `DATABASE_URL` before any test imports `src/lib/prisma`. `tests/afterEach.js` calls `resetDb()` (TRUNCATE ... CASCADE) between every test.
4. **Pure unit tests for pure functions only.** `validate.test.js`, `dbRetry.test.js`, `imageExt.test.js`, `uploadsStatic.test.js` test functions with no I/O collaborators — no DB, no Prisma, no mocks of internals. Keep this layer pure; do not add Prisma-mock tests here.
5. **Use `tests/fixtures/index.js` factories**, not the seed script. `makeUser`, `makeClub`, `makeOfficer`, `makeActiveMember`, `makeEvent`, `makeAnnouncement`, `makeRsvp`, `tokenFor`, `expiredTokenFor`, `waitFor`. Each test declares exactly the state it needs — no shared global seed.
6. **`makeOfficer` flips `User.role` to `CLUB_ADMIN`** (mirrors what `promoteMember` does) so RBAC middleware passes. To test defense-in-depth service guards behind a `requireRole('STUDENT')` route, insert a CLUB_MEMBERSHIP row directly with `role: 'OFFICER'` while keeping the global `User.role: 'STUDENT'`.
7. **Audit logs are fire-and-forget.** `middleware/auditLog.js` writes via `auditService.log(...).catch(() => {})` without awaiting before `res.end`. Tests querying the audit table immediately after the response will race the write. Use `waitFor(() => prisma.auditLog.findFirst(...))` (polls up to 1500ms).
8. **`npm test` = full suite (Docker required). `npm run test:unit` = pure unit tests only, no Docker (sets `JEST_NO_DB=1`, skips `tests/api/`). `npm run test:integration` = HTTP integration tests only.**
9. **`createApp({ skipRateLimit })` from `src/app.js`** builds the full Express app without calling `listen`. `src/index.js` requires `createApp()` and listens. Tests use `createApp()` directly. Production startup (`npm start`, Dockerfile CMD) is unchanged.

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
| `/api/venues` | `venueRoutes` | No | Any |
| `/api/departments` | `departmentRoutes` | No | Any |
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
- **Upload:** `multer` `memoryStorage` in `config/upload.js` → validated by magic bytes (`utils/imageExt.js`) before any disk write → `backend/uploads/`, 5MB, images only. The on-disk extension is derived from detected content (never the client filename). `POST /api/upload` returns `{ url }` (relative `/uploads/<uuid>.<ext>`). `/uploads` is served with `Content-Security-Policy: default-src 'none'` (`uploadsStaticHeaders`) so no uploaded content can execute scripts. `OPTIONAL_URL` (in `middleware/validate.js`) accepts both `http(s):` URLs and same-origin `/uploads/...` paths. The single image-persistence helper is `saveUploadedImage(buffer)` in `src/lib/imageStore.js` (used by both `/api/upload` and register) — do not re-inline this logic. Multer `LIMIT_*` errors map to 400 in `errorHandler`. `POST /auth/register` is **multipart/form-data**: text fields + `idCard` file part; middleware order is `upload.single('idCard')` BEFORE `validate(registerSchema)` (multer parses text fields into `req.body`; validate is parser-agnostic; `express.json` 10kb skips multipart). `User.studentId` is `@unique` (1–8 digits); `User.idCardUrl` accepts `/uploads/...` paths only (no external URLs). `User.department` is optional free text (max 100, public — visible in the ClubDetail roster to roster-authorized viewers, officer member/pending lists, members CSV, searchable; profile PATCH `department: null` clears; register never sets it). Seed image assets live in `backend/prisma/seed-assets/` (uploads/ is gitignored); seed copies them into `backend/uploads/` idempotently.
- **Club detail roster tiers:** `GET /api/clubs/:id` (`clubs.service.getById`) embeds `memberships` ONLY for ACTIVE members + privileged roles (`isPrivilegedRole`); non-members/pending viewers get no roster (frontend `club?.memberships || []` tolerates absence; `totalMembers` count stays public). User fields per member: base `id, name, department, studentId`; `email`+`phone` added only for ACTIVE OFFICERS + privileged roles. `idCardUrl` is NEVER in club detail — officer-only via `/clubs/:clubId/members`. Frontend: member rows in ClubDetail are buttons opening `MemberDetailDialog` (`components/club/`), which renders contact rows purely on field presence — no duplicated auth flag; backend tiers + tests are the guard.
- **CSV:** `exportMembersCsv`/`exportRsvpsCsv` → blob download.
- **Code splitting:** `React.lazy()` + `Suspense` for all pages.
- **Axios:** `api/client.js` — 15s timeout, 1 retry on timeout, 401 → hard reload `/login`.

### Rejected User Re-application

`@@unique([userId, clubId])` prevents duplicates. REJECTED → PENDING via `requestJoin` (updates existing record).

### Club Join Rules (department-based)

- `Club.joinRuleMode` (`ALL` | `ALLOW` | `BLOCK`, default `ALL`) + `Club.joinDepartments String[]` (max 10). `ALL` stores `[]`. Matching is case-insensitive; `ALLOW` blocks users with no department (BLOCK lets them through).
- Enforcement lives ONLY in `memberships.service.requestJoin`, AFTER the existing-membership 409 checks but BEFORE both the REJECTED→PENDING re-apply and the create — rules gate re-applications too. `clubs.service.getById` spreads the full club row, so the frontend gets both fields for free.
- `PATCH /api/clubs/:clubId/join-rules` (clubs module): `requireRole('CLUB_ADMIN')` + `requireClubAdmin` (route param MUST be `:clubId`, not `:id`), Zod `joinRules` (refine: non-ALL needs ≥1 department). Audit: `CLUB_JOIN_RULES_UPDATE`. Officers manage join rules + description + rules text — name/category/logo stays platform-admin via `PATCH /:id`.
- `GET /api/departments` (`modules/departments/`, auth-only): distinct trimmed case-deduped sorted departments from User rows — suggestion source for the picker; free-text entry covers unseen names (User.department is free text, no registry).
- Frontend: `useClubDetail` derives `joinBlocked`/`joinBlockedNote` (client-side gate so no 403 toast ever fires); `MembershipAction` replaces Join/Re-apply with a quiet muted notice (profile link for the no-department case). Editor = `JoinRulesDialog` (mode Select + `TagInput` chips + quick-add badges) opened from Pending Requests, which fetches `GET /clubs/:id` once for the current rule and shows a summary badge.
- `TagInput` is generic (`normalize`/`hint`/`placeholder`/`maxLength` props, defaults = legacy lowercase tags); departments pass `normalize={(s) => s.trim()}` to keep casing.

### Club Profile (description + rules) & Join Agreement

- `Club.rules String?` (max 4000 via Zod, empty string clears to null) — disclosed separately from `description` in a public "Club Rules" card on ClubDetail (needed pre-join).
- `PATCH /api/clubs/:clubId/profile` (officer-managed, same middleware chain as join-rules): body `{ description?, rules? }`, key-conditional update (absent keys untouched). Audit: `CLUB_PROFILE_UPDATE` (metadata: which fields were sent). Platform admin can also set `rules` via `PATCH /:id` and at create — ManageClubs `ClubFormFields` has the field.
- Join agreement: enforcement-only, nothing persisted. In `requestJoin`, after the department gate and before re-apply/create: club with non-blank `rules` + no `agreedToRules: true` body → 400 `'You must agree to the club rules to join this club'`. Gates REJECTED re-apply too; 409 checks take precedence. Empty/whitespace rules = no gate.
- Join route has `validate(join)` (`agreedToRules: boolean.optional()`); `middleware/validate.js` parses `req.body ?? {}` so no-body POSTs pass.
- Frontend: `MembershipAction` takes a `rules` prop — Join/Re-apply open `JoinAgreementDialog` (scrollable rules + checkbox, confirm disabled until checked) only when rules are non-empty; otherwise direct join. `handleJoin` always sends `{ agreedToRules: true }` (backend ignores it when no rules). Officer editor = `EditClubProfileDialog` on ClubDetail (gated `canManageEvents`), `onSaved` → `fetchClub()` background refresh.
- Rules display: Collapsible card (`ui/collapsible.jsx`, Radix), collapsed by default, whole header is the trigger with a `ChevronRight` that rotates 90° on open. Field explanations in the editor live in tooltips (`ui/tooltip.jsx`, Radix, `t-tooltip` animation in index.css) instead of visible subtext; dialog keeps an `sr-only` `DialogDescription` for screen readers.
- Seed: every club carries 3-line rules (join-agreement + re-apply demoable everywhere). Deseed needs no rules handling — column on Club, removed with `club.deleteMany()`.

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
- **Shared helpers live in `modules/eventHosts/eventHosts.service.js`:** `isHostOfficer`, `isPrimaryHostOfficer`, `isActiveMemberOfAnyHost`, `assertHostOfficer`, `isPrimaryHostClub`, `removeCoHost`. (`resolveHostClubs`/`getHostClubIds`/`getPrimaryClubId` are internal-only — not exported.) Import this — do NOT re-derive `event.clubId` (it doesn't exist). `clubs.service.deleteClub` consumes `isPrimaryHostClub` for the 409 primary-host guard.
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
- **Routes:** `DELETE /api/events/:id/cohosts/:clubId` — multi-segment, safe on the `/api/events` collision zone. Audit action: `EVENT_COHOST_REMOVE`. (All co-host *additions* go through the consent-based invite flow below; the old no-consent `POST /cohosts` was removed because it bypassed the consent invariant — the invite flow's privileged create+accept covers the admin-override case. Detachment needs no consent, so `DELETE /cohosts/:clubId` stays.)
- **`clubs.service.getById` no longer uses `Club.events` relation** (removed from schema). It now queries events via `prisma.event.findMany({ where: { hosts: { some: { clubId } } } })` and maps each to a synthetic `{ ...event, club, clubId }` for frontend compatibility.

### Co-host Invites (consent-based cross-club collaboration)

The original `coHostClubIds` created `EventHost` rows directly and the picker only showed clubs the *creator* officers — useless for real collaboration between different clubs' officers. Replaced with a **consent-based invitation model** mirroring the membership PENDING→ACTIVE flow.

- **`EventHostInvite` table holds ONLY pending rows** (`{ id, eventId, clubId, createdAt }`, `@@unique([eventId, clubId])`, `@@index([clubId])`). No status enum, no User relations. **Accept** = create `EventHost{isPrimary:false}` + delete invite (in one tx, race-safe via in-tx host re-check + `deleteMany`). **Reject/Cancel** = delete invite. Re-invite after reject just inserts fresh (unique constraint blocks only concurrent duplicates). Keeping pending state OUT of `EventHost` means **host-based authz (`isHostOfficer`, `isActiveMemberOfAnyHost`, event list filter) never sees un-accepted invites** — zero edits to the proven read paths, zero privilege-leak risk. This is why invites live in a separate table rather than a `status` column on `EventHost`.
- **`events.service.create`** body field is `inviteClubIds` (was `coHostClubIds`); it creates pending invite rows (via `tx.eventHostInvite.createMany`), NOT hosts. Primary `EventHost` creation unchanged. Max 10 invitees.
- **Module:** `modules/cohostInvites/` (service/controller/schemas/routes) — separate from `eventHosts` (which owns accepted-host predicates). Service has a local `assertClubOfficer(userId, clubId)` (DB-backed) for accept/reject authorization.
- **Routes:** event-scoped on the `/api/events` collision zone (all multi-segment, safe): `POST /api/events/:id/cohost-invites`, `GET /api/events/:id/cohost-invites`, `DELETE /api/events/:id/cohost-invites/:inviteId`. User-scoped on collision-free mount: `GET /api/cohost-invites/incoming` (optional `?clubId=`), `POST /api/cohost-invites/:id/accept`, `POST /api/cohost-invites/:id/reject`.
- **Permission matrix:** create/cancel/list-for-event = officer of ANY host club (`assertHostOfficer`, bypassed by FACULTY/PLATFORM_ADMIN via `isPrivilegedRole`). accept/reject = officer of the INVITED club (`assertClubOfficer`, also bypassed by privileged roles). `/incoming` returns ONLY invites for clubs where the caller is OFFICER (a CLUB_ADMIN of club X never sees club Y's invites) — defense in depth, and the silent-catch in `useCohostInvites` means no 403 toast.
- **Audit:** `EVENT_COHOST_INVITE`, `EVENT_COHOST_INVITE_ACCEPT`, `EVENT_COHOST_INVITE_REJECT`, `EVENT_COHOST_INVITE_CANCEL` (targetType `event`; accept/reject capture the eventId via `req.auditEventId` set in the controller, since the route param is the invite id). Added to `ACTIONS` in `AuditLog.jsx`.
- **Frontend:** `ClubSearchPicker` (`components/event/`) = debounced combobox over `GET /api/clubs?search=&limit=8`, multi-use (create dialog multi-select + manage-dialog single invite); excludes primary/already-hosted/already-invited via `excludeIds`. `useCohostInvites(clubId?)` hook (omit clubId = all officer clubs). `ManageCoHostsDialog` shows Primary badge + Accepted co-hosts (Remove) + Pending invites (Cancel) + search-to-invite. Discovery: `ClubCoHostInvitesCard` (renders nothing when empty) on the Dashboard (all officer clubs) AND on the club detail page (single club, officer-only) — reuses the shared `CoHostInvitesList`. Create dialog uses `addInvitee`/`removeInvitee` chips in `useClubDetail` (state: `newEvent.invitedClubs: [{id,name,...}]`, submitted as `inviteClubIds`).

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

- **Overflow fixes belong in shared primitives, not per-instance:** Create-event dialog overflowed viewport; the same `max-h-[90vh] overflow-y-auto` was already copy-pasted on 3 dialogs while 16 others lacked it (ManageClubs/ClubAnnouncements forms also overflow on short screens). Fix: bake `max-h-[90vh] overflow-y-auto` into `DialogContent` in `components/ui/dialog.jsx` and delete per-instance duplicates. Grep `DialogContent className` to confirm zero remain.

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
- **Prisma `where.<relation>` key collision:** Two optional filters writing to the same relation key silently clobber each other. `events.service.list` had `if (clubId) where.hosts = {...}` then `if (joined) where.hosts = {...}` — the second overwrote the first, so passing both query params made `clubId` a no-op. Fix: when combining multiple filters on the same relation, use `where.AND = [ { hosts: { some: ... } }, { hosts: { some: ... } } ]`. Always grep for repeated `where.<key> =` assignments when adding a new filter to an existing list service.
- **FACULTY bypasses service-layer event checks too, not just middleware:** `requireRole('CLUB_ADMIN')` passes for FACULTY via inheritance, AND `events.controller.js` passes `isPrivilegedRole(req.user.role)` as `skipOwnershipCheck` to `events.service.update/remove`, AND `rsvp.service.assertCanViewRsvps`/`upsert` early-return for `isPrivilegedRole`. So FACULTY can manage/RSVP/view-RSVPs on ANY event. Frontend hooks MUST include FACULTY in `canManage`/`canRsvp`/`canDelete`/`localCanManage` (used to gate the attendee-count fetch). Symptom of drift: `useEventDetail.js` had `localCanManage` (line ~34) excluding FACULTY while `canManage` (line ~154) included them → FACULTY saw admin controls but "X attending" always showed 0 because the count fetch was gated on the wrong flag. Meta-lesson: when aligning two divergent permission flags, FIRST read the actual backend service code to determine which direction is correct — don't reason from AGENTS.md generalizations alone.
- **Prisma `@@unique` column order matters for index usage:** `@@unique([userId, clubId])` gives a composite index usable for `where: { userId, clubId? }` but NOT for `where: { clubId, ... }` (clubId is second column, can't lead). The dominant admin query pattern is club-first (`memberships.service.listMembers`, `setAlumni`, `demoteMember`, `clubs.service.getById` all filter by `clubId`). Add explicit `@@index([clubId, status, role])` for those. Same logic: `Event` lacked a `startTime` index despite being the primary sort+filter column; `AuditLog` had zero indexes despite admin pagination. Always check existing indexes before adding filter/sort columns to a list query — Postgres will full-scan otherwise.
- **`isPrivilegedRole` lives in `utils/roles.js` (resolved circular import):** Previously `middleware/rbac.js` line 1 requires `memberships.service.js` (for `requireClubAdmin`), so `memberships.service.js` re-declared `isPrivilegedRole` locally to avoid a require cycle. Fix applied: the predicate now lives in `backend/src/utils/roles.js` (a leaf layer with no module/middleware deps), and all 5 consumers (`rbac` no longer exports it; `memberships`/`announcements`/`rsvp`/`events.controller`/`clubs` services) import from there. Lesson for any future shared predicate needed by both middleware and services: put it in `utils/roles.js` from the start — don't re-declare, don't route through `rbac`.
- **shadcn UI primitive files accumulate dead exports:** The default-shipped `dropdown-menu.jsx` exports 12 primitives; consumers in this app use only 6 (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`). Similarly `Dialog{Portal,Overlay,Close}` and `buttonVariants` are exported but unused outside their own files, and `ErrorBoundary.jsx` had `export default ErrorBoundary` alongside `export function RouteErrorBoundary` with only the named export used. After dropping shadcn primitives, grep consumers (`from '@/components/ui/<file>'`) and prune both the export AND the unused forwardRef wrappers above it.
- **Upload stored-XSS — never trust client mimetype/extension:** `file.mimetype` and `path.extname(originalname)` are both trivially spoofable in a multipart request (curl `evil.html` with `Content-Type: image/jpeg` passes a mimetype-only `fileFilter`). Two independent layers, both required: (1) validate file *content* via magic bytes (`utils/imageExt.js`) and derive the on-disk extension from the detected type — never from `originalname` (defeats `x.png.html`, spoofed mimetypes, `.svg`, polyglots); validate on the in-memory buffer (`memoryStorage`) *before* any disk write so nothing hostile is ever persisted. (2) Serve `/uploads` with `Content-Security-Policy: default-src 'none'` (`uploadsStaticHeaders` in `config/upload.js`) — this overrides helmet's global `script-src 'self'` (which *allows* same-origin scripts and is itself the vulnerability) and blocks ALL script execution plus `<meta refresh>` open-redirects from any uploaded resource, retroactively protecting pre-existing files. `<img src="/uploads/...">` embedding is unaffected (governed by the embedding page's `img-src`, not the asset's own CSP). Symptom if missing: any logged-in user uploads `.html`+`.js`, victim navigates to the `.html`, `<script src="/uploads/x.js">` runs in the API origin and steals the JWT from localStorage → full account takeover.
- **DB retry must be reads-only:** `lib/prisma.js`'s `$allOperations` extension used to retry EVERY operation on transient connection errors (`ECONNRESET`/`P1001`/`57P02`…). That re-executes non-idempotent writes: if Postgres committed the write but the connection dropped before the client read the result, the retry double-applies it (duplicate `create` where no unique guard — `Event`/`AuditLog`; double `updateMany`/`deleteMany`; re-run of `$transaction` bodies in promote/transfer/alumni). Fix: gate retry to read operations only via the `operation` param (`lib/dbRetry.js` `READ_OPERATIONS` = `findUnique/findFirst/findMany/count/aggregate/groupBy` + `*OrThrow`). Writes, `upsert`, raw queries (`$queryRaw`/`$executeRaw`, `model=undefined`), and `$transaction` inner ops are NEVER auto-retried. The health-check `$queryRaw\`SELECT 1\`` therefore may flap during a blip — that is honest signal, not worth special-casing. `error.meta?.code` is a fallback when `error.code` is unset.
- **`OPTIONAL_URL` must accept relative upload paths:** `z.string().url()` rejects relative paths (verified: `safeParse('/uploads/x.png') → false`), but the upload endpoint returns relative `/uploads/<uuid>.<ext>`. So a plain `z.string().url()` for `logoUrl`/`bannerUrl` made the upload→form-save flow 400. `OPTIONAL_URL` now uses a refine (`isUrlOrUploadPath`) accepting `http(s):` URLs OR `/uploads/...` same-origin paths, rejecting `//host` (protocol-relative), non-`/uploads/` same-origin paths, and `javascript:`/`data:` schemes. When adding any field that stores an uploaded-image URL, reuse `OPTIONAL_URL` — do not re-add `z.string().url()`.
- **Mock-the-collaborator service tests are an anti-pattern (rebuilt as HTTP integration tests):** The previous `*.service.test.js` files mocked Prisma and asserted on internal call shapes (`expect(prisma.X.create).toHaveBeenCalledWith({ data: ..., include: { user: { select: {...} } } })`) and on internal sequencing (`mockResolvedValueOnce` chains modeling two internal `findUnique` calls). These tests verified the implementation's choice of Prisma calls, NOT the behavior — they broke on benign refactors and passed on behavior-breaking bugs that preserved the call shape, while never exercising RBAC middleware, route collisions, Zod validation, error handler, audit, or rate limiter. Replaced wholesale with `tests/api/*.test.js` HTTP integration tests: real Postgres via testcontainers, real middleware chain via `createApp()`, real JWTs via `tokenFor()`, per-test TRUNCATE reset. Assert only on HTTP status/body/headers and side-effect DB rows. **If you find yourself writing `jest.mock('../src/lib/prisma')` for a service test, stop — write an HTTP integration test in `tests/api/` instead.**
- **`requireRole('STUDENT')` blocks the "officer cannot leave" service-guard via the API:** The leave-club route is `authMiddleware, requireRole('STUDENT'), controller`. An OFFICER always has global `User.role: 'CLUB_ADMIN'` (flipped by `promoteMember`/`makeOfficer`). So calling `/leave` as an officer returns **403 from the middleware**, never reaching the service-layer 400 branch. The 400 branch is reachable only via direct DB manipulation (insert `ClubMembership { role: 'OFFICER' }` while keeping `User.role: 'STUDENT'`). Test BOTH layers in `memberships.test.js`: realistic officer → 403 (middleware), and edge-case STUDENT-with-officer-membership → 400 (service defense-in-depth). Same pattern likely applies to other "X role cannot do Y" service guards behind role-restricted routes — grep for the asymmetry before assuming the service branch is API-reachable.
- **Audit log middleware is fire-and-forget, not awaited:** `middleware/auditLog.js` patches `res.end` to call `auditService.log(...).catch(() => {})` WITHOUT awaiting before `originalEnd.apply(res, args)`. The response is sent to the client before the audit row is committed. Tests querying the audit table immediately after the response race the write and intermittently see `null`. Use `waitFor(() => prisma.auditLog.findFirst(...))` (polls up to 1500ms, in `tests/fixtures/index.js`). This is also a production concern — lost audits on transient DB errors with no retry — but existing behavior, not in scope for the test rewrite.
- **`app.js` extraction is the canonical way to make the Express app testable:** `src/index.js` previously called `app.listen()` at module top-level — tests couldn't `require()` it without starting a server. Extraction: lines 1–64 moved to `src/app.js` wrapped in `createApp({ skipRateLimit })` (returns app, NO `listen`); `src/index.js` becomes 5 lines that call `createApp()` and `app.listen(PORT)`. Consumers verified safe: `package.json` `main`/`start`/`dev` and `Dockerfile CMD` all still reference `src/index.js` (unchanged entry point), no other file in the repo requires `src/index.js` (grep-verified), `app.listen` is the only occurrence. `skipRateLimit` opt defaults from `process.env.SKIP_RATE_LIMIT === '1'` so `tests/setup.js` setting it propagates to all test files without each passing the opt explicitly. Rollback is a single revert commit.
- **`transferAdmin` privileged-caller P2025 bug:** the `isPrivilegedRole(callerRole)` bypass at `memberships.service.js:130` skipped the caller's `currentMembership` lookup, but the transaction unconditionally tried to demote the caller's ClubMembership at L163 — which fails with Prisma `P2025` ("No record found for an update") → HTTP 500 for any PLATFORM_ADMIN or FACULTY who calls `/transfer` without being an officer of the club (e.g. appointing an officer for an unmanaged club). Fix: always look up `currentMembership` (don't gate it on privileged role), then in the transaction only push the demote/User.role-revert ops when `currentMembership` exists. Symptom: integration test for the PA-bypass returned 500 instead of 200. General lesson: any code path gated on "privileged bypass skips the lookup" MUST NOT then unconditionally use the would-have-been-looked-up record — the privileged caller may legitimately not have one. Same pattern risk: any future privileged-bypass where the transaction body assumes the bypassed lookup result.
- **Venue = snapshot string (`Event.venue`) + optional FK (`Event.venueId`), NOT a live join:** `Event.venue` stores the display name (either a managed-venue snapshot taken at create/update time, OR free-text custom location). `Event.venueId` is an optional FK to the `Venue` table used ONLY for filtering (`onDelete: SetNull`). The Prisma relation is named `managedVenue` (not `venue`) because the scalar `venue` occupies the lowercase slot. Rationale: unifying managed + custom into one display field keeps every read site a trivial `event.venue` (was `event.location`), so renaming was a pure find-replace with no join needed. `events.service.resolveVenue(venueId, venueText)` resolves create/update payloads: venueId wins (lookups the Venue, snapshots `venue.name`, 400 if missing); else custom text (sets `venue`, nulls `venueId`). The events-page filter accepts `venueId=<uuid>` (managed) OR `venueId=none` (custom/other → `where.venueId=null AND where.venue != null`); the schema is `z.union([z.string().uuid(), z.literal('none')])`. Frontend `VenuePicker` (`components/event/VenuePicker.jsx`) renders a Select (managed venues + a `__custom__` sentinel) and conditionally a text Input; both event create dialogs and `EditEventDialog` use it. Hooks build the payload as `venueId ? {...rest, venueId} : {...rest, venue}` so an empty-string venueId is never sent (would fail the UUID schema). Trade-off accepted: renaming/deleting a Venue does NOT update historical events' displayed name (snapshot is immutable) — re-save an event to refresh. Venues module: `modules/venues/` mounted at `/api/venues` (collision-free), `GET /` = any-auth (dropdown/filter), mutations = PLATFORM_ADMIN + `auditLog('VENUE_*')`.
- **Zero external consumers ≠ dead code (intra-file usage trap):** When pruning `select.jsx`, a grep for `\b<SelectPrimitive>\b` across `frontend/src` *excluding the file itself* reported `SelectScrollUpButton`/`SelectScrollDownButton` as 0-consumer dead code. Both were actually used INSIDE `select.jsx` by `SelectContent` (the scroll buttons render at lines 63/73). Removing them would have broken the built Select. Rule: before deleting any export, read its definition file and grep WITHIN that file for self-references — external-consumer count alone is insufficient. `SelectGroup`/`SelectLabel`/`SelectSeparator` were genuinely dead (no internal or external use) and were removed. Same hazard exists for any module that composes its own helpers (e.g. `eventHosts.service.js` where `getHostClubIds`/`getPrimaryClubId`/`resolveHostClubs` are used internally by `isHostOfficer`/`isPrimaryHostOfficer` but were needlessly exported).
- **Detail-page hooks must split initial-load vs background-refresh (single-`loading` boolean = full-page skeleton flash):** `useClubDetail` and `useEventDetail` both gated the whole page on `DetailSkeleton` from one `loading` state set true on EVERY refetch — every debounced search keystroke, tab toggle, page change, or post-mutation refresh flashed the entire page to skeleton. Fixed pattern (both hooks): `loadedRef = useRef(false)`; fetch fn takes `isCancelled` and branches — `!loadedRef.current` → full `setLoading(true)`, else background `setRefreshing(true)`; success sets `loadedRef.current = true`; failure: initial → `setError` (page error UI), background → `toast.error` with stale content kept (page error guard becomes `vm.error && !vm.data`); nav to another id resets via the React-sanctioned render-phase `prevId !== id` block (clear data + ALL section state — search/page/status/rsvp — so effects see final values in one commit, single clean fetch). Page dims in place (`opacity-60 pointer-events-none transition-opacity` + `aria-busy`) instead of swapping to skeleton; Radix dialogs are portaled to body so they ignore the dim. Also fixed in `useEventDetail`: the effect had NO cancellation guard at all, and the three fire-and-forget sub-fetches (rsvp/attendeeCount/cohost-invites) could overwrite the next event's data after rapid nav — all now gated on `isCancelled()`. Remaining known instance (deliberately unfixed, YAGNI unless it annoys): all `usePaginatedFetch` consumers crossfade the list back to skeleton on every page/search/filter change via `SkeletonReveal` (content layer gets `opacity: 0` while loading) — softer, section-scoped, no layout shift.
- **Theme switch uses View Transitions API, NOT a global CSS color transition:** The dark/light toggle (`ThemeContext.jsx` `applyTheme`) wraps the `classList.toggle('dark', ...)` call in `document.startViewTransition(() => mutate())` with feature detection (`if (document.startViewTransition)`) + `prefers-reduced-motion` JS guard + CSS `::view-transition-old/new(root)` reduced-motion rule. Three deliberate choices, each verified against MDN/web.dev: (1) VT over `* { transition: background-color ... }` — the latter makes every hover/focus mushy and only animates declared properties, while VT crossfades the whole page snapshot. (2) The apply effect uses `useLayoutEffect`, NOT `useEffect` — this guarantees VT snapshots the pre-change frame before any intermediate paint (which would otherwise flash new-icon + old-colors for one frame). The class is mutated synchronously inside the VT callback, matching MDN's documented pattern, so no `flushSync` is needed. (3) The toggle icon morph is a live CSS `transition-[opacity,transform]` on stacked absolutely-positioned SVGs, NOT inside the VT snapshot — VT rasterizes elements into image pairs, so an icon inside VT would crossfade as a blurry blob; live CSS keeps the 16px vector icon crisp. Browser support is universal as of 2026 (Chrome 111+, Safari 18+, Firefox 144+ SPA); the `if (!document.startViewTransition)` fallback covers the long tail. The FOUC inline script in `index.html` duplicates `ThemeContext`'s default-theme logic and must stay in sync if defaults change — it intentionally does NOT use VT (one-time pre-React, no prior state to crossfade).
- **Integration test files must run serialized on multi-core dev machines:** all workers share ONE testcontainer Postgres (`tests/.pg.url`) and `afterEach` runs `resetDb()` (TRUNCATE ALL tables) — parallel Jest workers truncate each other's mid-test rows. Symptom: mass failures across every suite (Prisma P2025 in fixtures, `waitFor: condition not met` on audit rows) that all pass individually. CI passes only because 2-core runners get 1 worker. Run targeted files with `npx jest --runInBand --forceExit tests/api/<files>` locally.
- **Verify data after `prisma migrate reset --force` — don't trust truncated CLI output:** reset printed the migration list and exited 0, but a follow-up count query found 0 users even though `package.json` has `prisma.seed` configured. Running `node prisma/seed.js` explicitly populated everything. After any reset, verify with a count query (one-shot script via `require('./src/lib/prisma')`) before assuming the DB is seeded.
- **Input-anchored dropdowns inside dialogs MUST be portaled — `components/ui/popover.jsx` is the primitive:** `ClubSearchPicker` originally rendered its results list as `position: absolute` (not portaled); `DialogContent` bakes in `max-h-[90vh] overflow-y-auto`, so the abs list became the dialog's scrollable overflow — the dropdown "lived inside" the modal and was only reachable by dialog scroll. Fixed by rebuilding on Radix Popover (`PopoverAnchor asChild` around the input wrapper + `PopoverContent`). Combobox-over-input recipe (copy for any future picker): `onOpenAutoFocus={(e) => e.preventDefault()}` keeps caret in the input while typing; `onPointerDownOutside={(e) => { if (anchorRef.current?.contains(e.target)) e.preventDefault(); }}` stops clicks on the input itself from dismissing; width/height via CSS vars Radix sets on content — `w-[var(--radix-popover-trigger-width)]` (resolves to the ANCHOR's width when using `PopoverAnchor`, mapped internally from `--radix-popper-anchor-width`) and `max-h-[min(15rem,var(--radix-popover-content-available-height))]` (hard cap + viewport-aware; collision flip opens it above the input). Escape then closes only the list (topmost Radix layer), not the dialog.
- **Duplicate `@radix-ui/react-dismissable-layer` module instances = Escape closes ALL overlay layers at once:** Radix layers (Dialog/Popover/DropdownMenu/Select) share ONE module-level layer stack; only the highest layer attaches a document keydown listener. If npm resolves two copies (newest radix package pulls a newer dismissable-layer than the lockfile has at root → nested `node_modules/@radix-ui/react-popover/node_modules/...`), each copy keeps its own stack, every layer thinks it's topmost, and one Escape closes the popover AND the dialog. Fix: `"overrides": { "@radix-ui/react-dismissable-layer": "^1.1.19" }` in `frontend/package.json` (dedupes to one copy; only this package matters — other radix internals are per-instance stateless). SECOND trap: a long-running Vite dev server keeps its old `optimizeDeps` cache across `npm install` — it serves the dialog from a stale pre-bundle with an INLINED old dismissable-layer while the new package loads from source, recreating the two-instance bug even after dedupe (browser URL hash `?v=` unchanged is the tell). After changing node_modules structure, `rm -rf frontend/node_modules/.vite` and restart the dev server before concluding anything about layered-overlay behavior.
- **Swagger JSDoc lines must keep the ` * ` prefix; quote flow-map descriptions containing commas:** a doc line that lost its ` * ` comment prefix (raw-space indent inside the `/** */` block) makes swagger-jsdoc's dedent emit `YAMLSyntaxError: All collection items must start at the same column` — the whole endpoint block silently vanishes from `/api/docs` while the app still boots; the only hint is a `console.error` report in test output prefixed by "Not all input has been taken into account". Same failure class: unquoted `description: text (a, b)` — the comma splits the YAML flow mapping; write `description: 'text (a, b)'`. Regression check: `npx jest --runInBand --forceExit tests/api/health.test.js` must print NO "Not all input" warning.
- **Role-shared pages must not hardcode nav targets gated to a subset of the page's viewers:** `/admin/clubs/:id/{requests,members}` render for CLUB_ADMIN + PLATFORM_ADMIN + FACULTY, but their `BackLink` hardcoded `/admin/clubs` (PLATFORM_ADMIN-only route) — officers clicked "Back to Clubs" and got bounced to `/dashboard` by `ProtectedRoute`. Fix: compute the target from `useAuth().user?.role` so the predicate mirrors the target route's `allowedRoles` exactly (`backTo` in `PendingRequests.jsx`/`ClubMembers.jsx`). When auditing, grep the raw path (`grep -rn "admin/clubs" frontend/src`), not just the component name — and check each hit's surrounding gate, not just obvious ones.
