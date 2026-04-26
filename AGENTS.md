# Follow these guidelines

- Log your learning to AGENTS.md . Ensure who ever has this file will avoid any mistakes and gain desired success easily in this codebase. Similar mistakes shall not be made twice in this codebase.
- You Dont have to communicate with the user. User will provide prompt, You will complete the work autonomously and say just "Done" at the end.
- After finding an issue check if similar issue exists elsewhere. Though not all issues worth resolving at once.

---

## Learnings

### Prisma v7 Breaking Changes (Phase 1)

**Issue:** The project uses Prisma ORM v7 (currently 7.8.0). Prisma v7 removed the `url` property from the `datasource` block in `schema.prisma`. Attempting to use `url = env("DATABASE_URL")` in the schema causes a validation error: `The datasource property 'url' is no longer supported in schema files.`

**Solution implemented:**
1. `schema.prisma` datasource block contains **only** `provider = "postgresql"` (no `url`).
2. `prisma.config.mjs` (at backend root) defines the datasource URL via `defineConfig({ datasource: { url: process.env.DATABASE_URL ?? '' } })`.
3. PrismaClient runtime requires a driver adapter. We use `@prisma/adapter-pg` with the `pg` package:
   ```js
   const { PrismaPg } = require('@prisma/adapter-pg');
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   const prisma = new PrismaClient({ adapter });
   ```
4. Both `@prisma/adapter-pg` and `pg` must be in `backend/package.json` dependencies.
5. The `prisma.config.mjs` file must be copied into the Docker image **before** running `npx prisma generate` or `npx prisma migrate deploy`.

**Commands that work with this setup:**
- `npx prisma validate` — validates schema without needing a database
- `npx prisma generate` — generates client without needing a database
- `npx prisma migrate deploy` — applies migrations using config URL

**Note:** `prisma.config.mjs` uses `process.env.DATABASE_URL ?? ''` instead of `env('DATABASE_URL')` because the `env()` helper throws if the variable is missing, breaking `prisma generate` in CI/environments where only client generation is needed.

**Note (ESM in prisma.config.mjs):** The file has a `.mjs` extension and runs as ESM. `__dirname` is not available in ESM. Use `import.meta.url` with `fileURLToPath` instead:
```js
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
```
Prisma's CLI loader may provide CJS shims, making `__dirname` appear to work — but this is fragile and not portable across Node.js versions.

### Frontend Build Requirement

**Issue:** The Phase 1 file manifest omitted `frontend/index.html`, but Vite requires it as the build entry point.

**Solution:** `frontend/index.html` was added with a root `<div id="root"></div>` and a script tag pointing to `/src/main.jsx`.

### White-Label Branding

**Issue:** Tailwind v4 CSS-first configuration uses `@theme inline` and CSS custom properties, but `import.meta.env.VITE_PRIMARY_BRAND_COLOR` cannot be accessed directly in `.css` files.

**Solution:** `frontend/src/main.jsx` sets `document.documentElement.style.setProperty('--brand-primary', import.meta.env.VITE_PRIMARY_BRAND_COLOR || '#1E40AF')` before rendering. This overrides the fallback value defined in `index.css` and makes branding functional without CSS preprocessor hacks.

### First-Time Setup (Migrations)

**Issue:** `npx prisma migrate dev --name init` requires a live database, which may not be available in all environments (e.g., Docker Desktop not running).

**Solution:** Migration SQL can be generated via `npx prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script` and placed manually in `prisma/migrations/<timestamp>_init/migration.sql`. `prisma migrate deploy` will apply it normally when the database is available.

**Critical:** The `prisma/migrations/` directory must be committed to source control.

### Express Route Mounting — Avoiding Path Collisions

**Issue:** When multiple routers are mounted at the same base path (e.g., `/api/clubs`), Express matches routes in the first registered router. If the first router has a parametric route like `GET /:id`, it will capture requests intended for specific paths in the second router (e.g., `GET /my-admin-clubs` would be matched as `GET /:id` with `id="my-admin-clubs"`).

**Solution:** Split routes that could collide into separate mount points. For example, the memberships module exports two routers: `router` (mounted at `/api/clubs` for `/:clubId/join`, `/:clubId/members`, etc.) and `adminRouter` (mounted at `/api/memberships` for `/my-admin-clubs`). Specific literal paths must never share a mount point with parametric routes from another router registered earlier.

### Per-Resource Authorization Beyond RBAC

**Issue:** The global `requireRole()` middleware checks `User.role` (STUDENT, CLUB_ADMIN, PLATFORM_ADMIN), but a CLUB_ADMIN should only manage clubs they actually admin — not all clubs. Global RBAC alone is insufficient.

**Solution:** For CLUB_ADMIN-scoped endpoints, add a second middleware (`requireClubAdmin`) that queries `ClubMembership` to verify the requesting user has an ACTIVE OFFICER membership for the specific `clubId`. This middleware runs after `requireRole('CLUB_ADMIN')` for defense-in-depth.

### Extending Existing Endpoints for Context

**Issue:** Frontend pages like `ClubDetail` need to know the current user's membership status for a club, but the existing `GET /clubs/:id` endpoint only returns the club's public data.

**Solution:** Modify `clubs.service.getById(id)` to accept an optional `userId` parameter. When provided, it queries the user's `ClubMembership` for that club and attaches it to the response as `club.userMembership`. The controller passes `req.user?.userId` (safe because the route already uses `authMiddleware`). This avoids creating a separate endpoint just for membership status.

### Role Hierarchy in requireRole Middleware

**Issue:** The `requireRole()` middleware in `rbac.js` used exact string matching. A PLATFORM_ADMIN calling a `requireRole('CLUB_ADMIN')` endpoint would be blocked, even though PLATFORM_ADMIN is the highest privileged role and should be able to manage any club's memberships.

**Solution:** Introduce a `ROLE_INHERITS` map in `rbac.js`:
```js
const ROLE_INHERITS = {
  PLATFORM_ADMIN: ['PLATFORM_ADMIN', 'CLUB_ADMIN'],
  CLUB_ADMIN: ['CLUB_ADMIN'],
  STUDENT: ['STUDENT'],
};
```
`requireRole` now resolves the user's role to an array of effective roles and checks if ANY requested role is in that set. PLATFORM_ADMIN inherits CLUB_ADMIN permissions but NOT STUDENT (admins don't join clubs as students).

**Note:** The frontend `ProtectedRoute` uses a flat `roles.includes()` check without hierarchy awareness. To avoid mismatches, `App.jsx` must explicitly list both roles (e.g., `roles={['CLUB_ADMIN', 'PLATFORM_ADMIN']}`) on routes where both should have access.

### PLATFORM_ADMIN Bypass in requireClubAdmin

**Issue:** The `requireClubAdmin` middleware checks the database for an ACTIVE OFFICER membership. PLATFORM_ADMIN users are typically not OFFICER members of any club, so they'd always be blocked.

**Solution:** `requireClubAdmin` in `memberships.routes.js` does an early `return next()` for `req.user.role === 'PLATFORM_ADMIN'`, skipping the per-club database check. This is safe because PLATFORM_ADMIN is the highest role and the `requireRole('CLUB_ADMIN')` check (via hierarchy) already passed.

### Seed Scripts — Required Fields Must Be Explicit

**Issue:** When using `prisma.event.createMany()` (or any bulk create), Prisma validates all required fields are present. The seed script had events missing the required `endTime` field, which caused the entire `createMany` to fail at runtime.

**Solution:** Always cross-check seed data against the Prisma schema. Every required field (non-nullable, no `?`) must be explicitly provided in seed data. For `Event`, both `startTime` and `endTime` are required. Run `npx prisma validate` and visually inspect schema enums/required fields before writing seed data.

### Seed Data Must Cover All RBAC Roles

**Issue:** The initial seed only created PLATFORM_ADMIN and STUDENT users, missing CLUB_ADMIN. This meant the CLUB_ADMIN-specific code paths (requireClubAdmin, requireRole hierarchy) could not be tested with seed data.

**Solution:** Seed scripts should create at least one user per `UserRole` enum value, with memberships that exercise each role's typical access patterns. The Phase 7 seed now creates: 1 PLATFORM_ADMIN, 2 CLUB_ADMIN (officers), and 5 STUDENT users with varied membership statuses.

### Deseed Script — Deletion Order Matters

**Issue:** Foreign key constraints mean deletion order must respect dependency graph.

**Solution:** `deseed.js` deletes in reverse dependency order: Event → ClubMembership → Club → User. This matches the cascade rules defined in the schema (`onDelete: Cascade` on ClubMembership), but explicit deletion is safer to avoid constraint violations.