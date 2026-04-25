# Phase 6: Events — Event Calendar Feature

**Goal:** Implement event CRUD endpoints and a unified calendar view where students see upcoming events from all clubs or filtered by their joined clubs.

---

## Context

Building on Phases 1-5. Clubs and memberships work. Now we need events — clubs post events, and students view them in a calendar.

**Roles involved:**
- CLUB_ADMIN: Create/delete events for their club
- Any authenticated user: View events

---

## Scope

### Must Complete

#### Backend
1. **`events.service.js`** — Business logic: list, create, delete
2. **`events.controller.js`** — HTTP layer
3. **`events.routes.js`** — Express router with RBAC

#### Frontend
4. **`pages/EventCalendar.jsx`** — Calendar view of events
5. **Update `pages/ClubDetail.jsx`** — Show club's events
6. **Route registration in App.jsx**

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/events` | JWT | Any | List upcoming events, `?clubId=` and `?joined=true` |
| POST | `/api/clubs/:clubId/events` | JWT | CLUB_ADMIN | Create event for club |
| DELETE | `/api/events/:id` | JWT | CLUB_ADMIN | Delete event (must own club) |

---

## Deliverables & File Manifest

```
backend/src/modules/events/
├── events.service.js
├── events.controller.js
└── events.routes.js

frontend/src/pages/
└── EventCalendar.jsx
```

---

## Key Implementation Details

### events.service.js

```js
// list({ clubId, joined, userId })
  → base query: where startTime >= now, orderBy startTime ASC
  → if clubId: filter by clubId
  → if joined: get user's ACTIVE memberships, filter events by those clubIds
  → includes: club (name, logoUrl)
  → returns events array

// create(clubId, { title, description, startTime, endTime, location, bannerUrl })
  → verifies club exists
  → creates event with clubId
  → returns created event with club

// delete(eventId, userId)
  → finds event with club
  → verifies userId is CLUB_ADMIN (OFFICER) of that club
  → deletes event
  → throws 403 if not admin, 404 if not found

// getById(eventId)
  → finds event by ID
  → includes club details
  → returns event
```

### events.controller.js

```js
// list(req, res, next)
  → extracts clubId from req.query
  → extracts joined as boolean: const joinedBool = req.query.joined === 'true'
    (req.query values are always strings; '=== true' would always be false)
  → uses req.user.userId for joined filter
  → calls eventsService.list({ clubId, joined: joinedBool, userId })
  → returns 200 with events array

// create(req, res, next)
  → extracts clubId from req.params
  → extracts { title, description, startTime, endTime, location, bannerUrl } from req.body
  → verifies CLUB_ADMIN for this club
  → calls eventsService.create()
  → returns 201 with created event

// delete(req, res, next)
  → extracts id from req.params
  → calls eventsService.delete(id, req.user.userId)
  → returns 200 with success
```

### events.routes.js

```js
// events.routes.js — mounted at /api/events in index.js
router.get('/', authMiddleware, eventsController.list);
router.delete('/:id', authMiddleware, requireRole('CLUB_ADMIN'), eventsController.delete);
```

```js
// clubs.routes.js — add this route alongside existing club routes
// Event creation is club-scoped, so it lives in the clubs router
router.post('/:clubId/events', authMiddleware, requireRole('CLUB_ADMIN'), eventsController.create);
```

### Route Mounting in src/index.js

```js
const eventsRoutes = require('./modules/events/events.routes');
const clubsRoutes  = require('./modules/clubs/clubs.routes');

app.use('/api/events', eventsRoutes);  // GET /api/events, DELETE /api/events/:id
app.use('/api/clubs', clubsRoutes);    // includes POST /api/clubs/:clubId/events
```

> `eventsController` must be imported in both `events.routes.js` and `clubs.routes.js`.

### CLUB_ADMIN Authorization for Events

Verify the requesting user is an OFFICER of the club:

```js
const membership = await prisma.clubMembership.findUnique({
  where: { userId_clubId: { userId, clubId } }
});
if (!membership || membership.role !== 'OFFICER' || membership.status !== 'ACTIVE') {
  throw { status: 403, message: 'Not an admin of this club' };
}
```

### Frontend: EventCalendar.jsx

```
- Filter controls:
  - "All Clubs" / "My Clubs" toggle (joined=true filter)
  - Club dropdown (optional, filter by specific club)
- Event list/cards:
  - Title, club name, date, time, location
  - Club logo thumbnail
  - Banner image (if bannerUrl provided)
- Simple list view (calendar grid optional for MVP)
- Click event → expand/show details
- Empty state: "No upcoming events"
```

### Frontend: ClubDetail.jsx Update

```
- Add "Events" section showing club's upcoming events
- Event cards with title, date, time, location
- If CLUB_ADMIN for this club:
  - "Create Event" button → modal/form with:
    - Title (required)
    - Description (optional)
    - Start time (required)
    - End time (required)
    - Location (optional)
    - Banner URL (optional)
  - Delete button per event
```

### Route Registration (App.jsx additions)

```jsx
<Route path="events" element={
  <ProtectedRoute><EventCalendar /></ProtectedRoute>
} />
```

---

## Database Queries

### List Events
```js
// joined is a boolean (already converted from string in controller)
// Do NOT use the raw req.query.joined string here
prisma.event.findMany({
  where: {
    startTime: { gte: new Date() },
    ...(clubId && { clubId }),
    ...(joined && {   // joined is true (boolean), not 'true' (string)
      club: {
        memberships: {
          some: {
            userId: userId,
            status: 'ACTIVE'
          }
        }
      }
    })
  },
  include: {
    club: { select: { id: true, name: true, logoUrl: true } }
  },
  orderBy: { startTime: 'asc' }
});
```

### Create Event
```prisma
prisma.event.create({
  data: { clubId, title, description, startTime, endTime, location, bannerUrl },
  include: { club: true }
});
```

### Delete Event
```prisma
prisma.event.delete({ where: { id: eventId } });
```

---

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Missing required fields (title, startTime, endTime) |
| 401 | No token |
| 403 | Not CLUB_ADMIN for the club |
| 404 | Event or club not found |
| 422 | endTime before startTime |

---

## Acceptance Criteria

1. `GET /api/events` returns upcoming events with club info
2. `GET /api/events?clubId=<id>` filters by club
3. `GET /api/events?joined=true` shows only events from user's clubs
4. `POST /api/clubs/:clubId/events` creates event (CLUB_ADMIN only)
5. `DELETE /api/events/:id` deletes event (CLUB_ADMIN of owning club only)
6. EventCalendar page shows filterable event list
7. ClubDetail page shows club's upcoming events
8. CLUB_ADMIN can create events via ClubDetail page modal
9. CLUB_ADMIN can delete events they own
10. Events show club name, date, time, location

---

## Verification

```bash
# Create event
curl -X POST http://localhost:4000/api/clubs/<clubId>/events \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Meeting","startTime":"2026-05-01T18:00:00Z","endTime":"2026-05-01T19:00:00Z","location":"Room 101"}'

# List all events
curl http://localhost:4000/api/events -H "Authorization: Bearer $TOKEN"

# List joined club events
curl "http://localhost:4000/api/events?joined=true" -H "Authorization: Bearer $STUDENT_TOKEN"

# Delete event
curl -X DELETE http://localhost:4000/api/events/<eventId> \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Events filtered by startTime >= now | Only show upcoming events by default |
| Joined filter uses membership query | Shows relevant events for the student |
| Banner URL-only | No file upload in MVP |
| CLUB_ADMIN verified per club | Can't create events for clubs you don't admin |
| Simple list view | Calendar grid is complex; list is sufficient for MVP |
| End time required | Prevents ambiguous event duration |
