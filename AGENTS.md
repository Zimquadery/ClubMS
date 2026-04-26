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