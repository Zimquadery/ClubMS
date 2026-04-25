# Phase 4: Clubs — Club Directory Feature

**Goal:** Implement the searchable club directory — backend CRUD endpoints and frontend pages for browsing, viewing, and admin-managing clubs.

---

## Context

Building on Phases 1-3. Auth works, RBAC middleware exists, frontend shell is up. This phase adds the first MVP feature: a searchable club directory.

**Roles involved:**
- PLATFORM_ADMIN: Create/delete clubs
- Any authenticated user: Browse, search, filter, view details

---

## Scope

### Must Complete

#### Backend
1. **`clubs.service.js`** — Business logic: list, getById, create, delete
2. **`clubs.controller.js`** — HTTP layer
3. **`clubs.routes.js`** — Express router with RBAC

#### Frontend
4. **`pages/ClubDirectory.jsx`** — Searchable, filterable club list
5. **`pages/ClubDetail.jsx`** — Club info, member count, events list
6. **`pages/admin/ManageClubs.jsx`** — PLATFORM_ADMIN: create/delete clubs
7. **Route registration in App.jsx**

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/clubs` | JWT | Any | List all clubs, `?search=` and `?category=` |
| GET | `/api/clubs/:id` | JWT | Any | Club detail with member count |
| POST | `/api/clubs` | JWT | PLATFORM_ADMIN | Create a new club; optional `adminUserId` assigns the initial CLUB_ADMIN |
| DELETE | `/api/clubs/:id` | JWT | PLATFORM_ADMIN | Delete a club (cascades) |

---

## Deliverables & File Manifest

```
backend/src/modules/clubs/
├── clubs.service.js
├── clubs.controller.js
└── clubs.routes.js

frontend/src/pages/
├── ClubDirectory.jsx
├── ClubDetail.jsx
└── admin/
    └── ManageClubs.jsx
```

---

## Key Implementation Details

### clubs.service.js

```js
// list({ search, category })
  → builds Prisma where clause
  → search: { name: { contains: search, mode: 'insensitive' } }
  → category: { category } (exact match)
  → returns clubs with _count: { memberships: where status=ACTIVE }
  → ordered by name ASC

// getById(id)
  → finds club by ID
  → includes: memberships (where ACTIVE), events (future only, ordered by startTime)
  → returns club with memberCount, upcomingEvents
  → throws 404 if not found

// create({ name, description, category, logoUrl, adminUserId })
  → validates name uniqueness
  → creates club
  → if adminUserId provided:
      → verifies user exists
      → creates ClubMembership: { userId: adminUserId, clubId, status: ACTIVE, role: OFFICER }
      → updates User.role to CLUB_ADMIN for that user
  → returns created club
  → note: without adminUserId the club has no admin; use the seed script or assign one via the database

// delete(id)
  → verifies club exists
  → deletes club (cascade handles memberships + events)
  → returns success
```

### clubs.controller.js

```js
// list(req, res, next)
  → extracts search, category from req.query
  → calls clubsService.list()
  → returns 200 with clubs array

// getById(req, res, next)
  → extracts id from req.params
  → calls clubsService.getById()
  → returns 200 with club object

// create(req, res, next)
  → extracts { name, description, category, logoUrl, adminUserId } from req.body
  → calls clubsService.create()
  → returns 201 with created club

// delete(req, res, next)
  → extracts id from req.params
  → calls clubsService.delete()
  → returns 200 with success message
```

### clubs.routes.js

```js
router.get('/', authMiddleware, clubsController.list);
router.get('/:id', authMiddleware, clubsController.getById);
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.create);
router.delete('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.delete);
```

### Valid Category Values

The `category` field is a free-form string but both the frontend dropdown and seed data must use these exact values for filtering to work:

```js
const CLUB_CATEGORIES = ['Academic', 'Sports', 'Cultural', 'Technology', 'Arts', 'Community', 'Other'];
```

Define this constant in `backend/src/modules/clubs/clubs.constants.js` and import it in the service (for validation) and expose it via `GET /api/clubs/categories` if needed. The frontend dropdown must use these same strings.

### PLATFORM_ADMIN Bootstrap Note

The first PLATFORM_ADMIN user cannot be created via the API (registration always creates a STUDENT). Options:
1. **Development:** Use the seed script (`node prisma/seed.js`) — creates `admin@university.edu`
2. **Production:** After first deploy, run a one-time database update:
   ```sql
   UPDATE "User" SET role = 'PLATFORM_ADMIN' WHERE email = 'your-admin@university.edu';
   ```
   Then that user can log in and manage clubs via the API.

### Frontend: ClubDirectory.jsx

```
- Search input (by name)
- Category filter dropdown (Academic, Sports, Cultural, etc.)
- Grid/list of club cards showing:
  - Logo (or placeholder)
  - Name
  - Category badge
  - Member count
  - "View Details" link
- Pagination (optional for MVP, can be simple scroll)
```

### Frontend: ClubDetail.jsx

```
- Club logo + name + category
- Description
- Member count
- "Join Club" button (if not a member) — sends POST /clubs/:id/join (Phase 5)
- Upcoming events list (cards with title, date, location)
- Back to directory link
```

### Frontend: ManageClubs.jsx (PLATFORM_ADMIN)

```
- Table/list of all clubs
- "Create Club" button → modal/form with: name, description, category, logoUrl
- Delete button per club (with confirmation)
- Shows club name, category, member count
```

### Route Registration (App.jsx additions)

```jsx
<Route path="clubs" element={
  <ProtectedRoute><ClubDirectory /></ProtectedRoute>
} />
<Route path="clubs/:id" element={
  <ProtectedRoute><ClubDetail /></ProtectedRoute>
} />
<Route path="admin/clubs" element={
  <ProtectedRoute roles={['PLATFORM_ADMIN']}><ManageClubs /></ProtectedRoute>
} />
```

---

## Database Queries

### List Clubs
```prisma
prisma.club.findMany({
  where: { /* search + category filters */ },
  include: {
    _count: {
      select: { memberships: { where: { status: 'ACTIVE' } } }
    }
  },
  orderBy: { name: 'asc' }
});
```

### Club Detail
```prisma
prisma.club.findUnique({
  where: { id },
  include: {
    memberships: { where: { status: 'ACTIVE' } },
    events: {
      where: { startTime: { gte: new Date() } },
      orderBy: { startTime: 'asc' }
    }
  }
});
```

---

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Missing required fields (create) |
| 401 | No token |
| 403 | Wrong role (create/delete) |
| 404 | Club not found (getById, delete) |
| 409 | Duplicate club name (create) |

---

## Acceptance Criteria

1. `GET /api/clubs` returns all clubs with member count
2. `GET /api/clubs?search=coding` filters by name
3. `GET /api/clubs?category=Academic` filters by category
4. `GET /api/clubs/:id` returns club detail with members and upcoming events
5. `POST /api/clubs` creates club (PLATFORM_ADMIN only, 403 for others)
6. `DELETE /api/clubs/:id` deletes club (PLATFORM_ADMIN only)
7. ClubDirectory page shows searchable, filterable list
8. ClubDetail page shows club info, member count, events
9. ManageClubs page allows create/delete (PLATFORM_ADMIN)
10. Non-admin users get 403 on create/delete endpoints

---

## Verification

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"password123"}' | jq -r .token)

# List clubs
curl http://localhost:4000/api/clubs -H "Authorization: Bearer $TOKEN"

# Create club
curl -X POST http://localhost:4000/api/clubs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Club","category":"Academic"}'

# Delete club
curl -X DELETE http://localhost:4000/api/clubs/<id> \
  -H "Authorization: Bearer $TOKEN"
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Member count via `_count` | Efficient, no N+1 queries |
| Category as filter, not enum | Flexible for diverse universities |
| Search case-insensitive | Better UX |
| Logo URL-only | No file upload complexity in MVP |
| Cascading delete | Deleting club removes memberships + events |
