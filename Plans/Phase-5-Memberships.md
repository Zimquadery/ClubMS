# Phase 5: Memberships — Member Lifecycle Workflow

**Goal:** Implement the complete membership workflow — students request to join clubs, admins approve/reject/set-alumni, and role transfer.

---

## Context

Building on Phases 1-4. Clubs exist and are browsable. Now we need the membership lifecycle: join requests, approval, alumni status, and admin transfer.

**Lifecycle:** PENDING → ACTIVE → ALUMNI (or PENDING → REJECTED)

---

## Scope

### Must Complete

#### Backend
1. **`memberships.service.js`** — Business logic for all membership operations
2. **`memberships.controller.js`** — HTTP layer
3. **`memberships.routes.js`** — Express router with RBAC

#### Frontend
4. **`pages/admin/PendingRequests.jsx`** — CLUB_ADMIN: view/approve/reject requests
5. **`pages/admin/ClubMembers.jsx`** — CLUB_ADMIN: view members, set alumni, transfer role
6. **Update `pages/ClubDetail.jsx`** — Add working "Join Club" button
7. **Route registration in App.jsx**

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/clubs/:clubId/join` | JWT | STUDENT | Send join request (PENDING) |
| GET | `/api/clubs/:clubId/members` | JWT | CLUB_ADMIN | List all members + pending |
| PATCH | `/api/clubs/:clubId/members/:userId/approve` | JWT | CLUB_ADMIN | PENDING → ACTIVE |
| PATCH | `/api/clubs/:clubId/members/:userId/reject` | JWT | CLUB_ADMIN | PENDING → REJECTED |
| PATCH | `/api/clubs/:clubId/members/:userId/alumni` | JWT | CLUB_ADMIN | ACTIVE → ALUMNI |
| POST | `/api/clubs/:clubId/transfer` | JWT | CLUB_ADMIN | Transfer admin role |

---

## Deliverables & File Manifest

```
backend/src/modules/memberships/
├── memberships.service.js
├── memberships.controller.js
└── memberships.routes.js

frontend/src/pages/admin/
├── PendingRequests.jsx
└── ClubMembers.jsx
```

---

## Key Implementation Details

### memberships.service.js

```js
// requestJoin(clubId, userId)
  → verifies club exists
  → checks no existing membership (any status)
  → creates ClubMembership with status: PENDING, role: MEMBER
  → returns membership
  → throws 409 if already member/pending

// listMembers(clubId, { status })
  → finds all memberships for club
  → optional filter by status (PENDING, ACTIVE, ALUMNI)
  → includes user details (name, email)
  → ordered by createdAt ASC

// approve(clubId, userId)
  → finds PENDING membership
  → updates status to ACTIVE
  → throws 404 if not found, 400 if not PENDING

// reject(clubId, userId)
  → finds PENDING membership
  → updates status to REJECTED
  → throws 404 if not found, 400 if not PENDING

// setAlumni(clubId, userId)
  → finds ACTIVE membership
  → updates status to ALUMNI
  → throws 404 if not found, 400 if not ACTIVE

// transferAdmin(clubId, currentAdminId, newAdminId)
  → verifies currentAdminId is CLUB_ADMIN for the club (ACTIVE OFFICER membership)
  → verifies newAdminId is ACTIVE MEMBER for the club
  → counts currentAdmin's remaining OFFICER memberships in OTHER clubs (excluding this clubId)
  → runs prisma.$transaction:
      → updates currentAdmin membership role to MEMBER
      → updates newAdmin membership role to OFFICER
      → updates User.role for newAdmin to CLUB_ADMIN
      → ONLY IF remainingOfficerCount === 0: updates User.role for currentAdmin to STUDENT
        (if they are still an OFFICER in other clubs, their global role stays CLUB_ADMIN)
  → returns success

// isClubAdmin(userId, clubId)
  → checks if user has ACTIVE membership with role OFFICER
  → returns boolean
```

### memberships.controller.js

```js
// requestJoin(req, res, next)
  → extracts clubId from req.params
  → uses req.user.userId
  → calls membershipsService.requestJoin()
  → returns 201 with membership

// listMembers(req, res, next)
  → extracts clubId from req.params, status from req.query
  → calls membershipsService.listMembers()
  → returns 200 with members array

// approve(req, res, next)
  → extracts clubId, userId from req.params
  → calls membershipsService.approve()
  → returns 200 with updated membership

// reject(req, res, next)
  → extracts clubId, userId from req.params
  → calls membershipsService.reject()
  → returns 200 with updated membership

// setAlumni(req, res, next)
  → extracts clubId, userId from req.params
  → calls membershipsService.setAlumni()
  → returns 200 with updated membership

// transferAdmin(req, res, next)
  → extracts clubId from req.params, newAdminId from req.body
  → uses req.user.userId as currentAdminId
  → calls membershipsService.transferAdmin()
  → returns 200 with success
```

### memberships.routes.js

```js
router.post('/:clubId/join', authMiddleware, requireRole('STUDENT'), membershipsController.requestJoin);
router.get('/:clubId/members', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.listMembers);
router.patch('/:clubId/members/:userId/approve', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.approve);
router.patch('/:clubId/members/:userId/reject', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.reject);
router.patch('/:clubId/members/:userId/alumni', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.setAlumni);
router.post('/:clubId/transfer', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.transferAdmin);
```

### Route Mounting in src/index.js

Membership routes are mounted under `/api/clubs` (since all paths start with `/:clubId/...`). In `backend/src/index.js`, add:

```js
const membershipsRoutes = require('./modules/memberships/memberships.routes');

// Mount under /api/clubs — membership paths are /:clubId/join, /:clubId/members, etc.
app.use('/api/clubs', membershipsRoutes);
```

> **Note:** Both `clubsRoutes` and `membershipsRoutes` are mounted at `/api/clubs`. Express resolves them in registration order — register clubs routes first, then memberships routes. They handle different sub-paths so there is no conflict.

### CLUB_ADMIN Authorization Check

For approve/reject/alumni/transfer endpoints, verify the requesting user is actually a CLUB_ADMIN **for that specific club** (not just any club):

```js
// In service or middleware:
const membership = await prisma.clubMembership.findUnique({
  where: { userId_clubId: { userId: req.user.userId, clubId } }
});
if (!membership || membership.role !== 'OFFICER' || membership.status !== 'ACTIVE') {
  throw { status: 403, message: 'Not an admin of this club' };
}
```

### Frontend: PendingRequests.jsx (CLUB_ADMIN)

```
- Select club (if admin of multiple)
- List of PENDING memberships:
  - User name, email, request date
  - "Approve" button → PATCH /approve
  - "Reject" button → PATCH /reject
- Refresh after action
- Empty state: "No pending requests"
```

### Frontend: ClubMembers.jsx (CLUB_ADMIN)

```
- Select club (if admin of multiple)
- Tabs: Active Members | Alumni
- Active Members list:
  - User name, email, role (MEMBER/OFFICER), join date
  - "Set Alumni" button → PATCH /alumni
  - "Transfer Admin" button (if OFFICER) → POST /transfer
- Alumni list:
  - User name, email, graduation date
  - Read-only
```

### Frontend: ClubDetail.jsx Update

```
- Add "Join Club" button (visible if not a member)
- Button calls POST /clubs/:id/join
- After request:
  - Show "Request Pending" state
  - Disable button
- If already ACTIVE member:
  - Show "Member" badge
  - Show "View Members" link (if CLUB_ADMIN)
- If already ALUMNI:
  - Show "Alumni" badge
```

### Route Registration (App.jsx additions)

```jsx
<Route path="admin/clubs/:id/requests" element={
  <ProtectedRoute roles={['CLUB_ADMIN']}><PendingRequests /></ProtectedRoute>
} />
<Route path="admin/clubs/:id/members" element={
  <ProtectedRoute roles={['CLUB_ADMIN']}><ClubMembers /></ProtectedRoute>
} />
```

---

## Database Queries

### Request Join
```prisma
prisma.clubMembership.create({
  data: { userId, clubId, status: 'PENDING', role: 'MEMBER' }
});
```

### List Members
```prisma
prisma.clubMembership.findMany({
  where: { clubId, status: statusFilter },
  include: { user: { select: { id: true, name: true, email: true } } },
  orderBy: { createdAt: 'asc' }
});
```

### Approve/Reject/Alumni
```prisma
prisma.clubMembership.update({
  where: { userId_clubId: { userId, clubId } },
  data: { status: newStatus }
});
```

### Transfer Admin
```js
// Check remaining admin clubs BEFORE the transaction
const remainingOfficerCount = await prisma.clubMembership.count({
  where: {
    userId: currentAdminId,
    clubId: { not: clubId },
    role: 'OFFICER',
    status: 'ACTIVE'
  }
});

const transactionOps = [
  prisma.clubMembership.update({
    where: { userId_clubId: { userId: currentAdminId, clubId } },
    data: { role: 'MEMBER' }
  }),
  prisma.clubMembership.update({
    where: { userId_clubId: { userId: newAdminId, clubId } },
    data: { role: 'OFFICER' }
  }),
  prisma.user.update({
    where: { id: newAdminId },
    data: { role: 'CLUB_ADMIN' }
  }),
];

// Only demote globally if this was the admin's only club
if (remainingOfficerCount === 0) {
  transactionOps.push(
    prisma.user.update({
      where: { id: currentAdminId },
      data: { role: 'STUDENT' }
    })
  );
}

await prisma.$transaction(transactionOps);
```

---

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Membership not in expected status (e.g., approve non-PENDING) |
| 401 | No token |
| 403 | Not CLUB_ADMIN for this club |
| 404 | Club or membership not found |
| 409 | Already a member or pending request exists |

---

## Acceptance Criteria

1. `POST /api/clubs/:id/join` creates PENDING membership
2. Duplicate join request returns 409
3. `GET /api/clubs/:id/members` returns all members with user details
4. `PATCH .../approve` changes PENDING → ACTIVE
5. `PATCH .../reject` changes PENDING → REJECTED
6. `PATCH .../alumni` changes ACTIVE → ALUMNI
7. `POST .../transfer` transfers admin role between members
8. CLUB_ADMIN can only manage their own club's memberships
9. PendingRequests page shows pending requests with approve/reject
10. ClubMembers page shows active members with alumni option
11. ClubDetail shows working "Join Club" button

---

## Verification

```bash
# Student joins club
curl -X POST http://localhost:4000/api/clubs/<clubId>/join \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# Admin lists pending
curl http://localhost:4000/api/clubs/<clubId>/members?status=PENDING \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Admin approves
curl -X PATCH http://localhost:4000/api/clubs/<clubId>/members/<userId>/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Admin sets alumni
curl -X PATCH http://localhost:4000/api/clubs/<clubId>/members/<userId>/alumni \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate CLUB_ADMIN check per club | Can't manage clubs you don't admin |
| PENDING → ACTIVE → ALUMNI lifecycle | Clear state machine |
| Transfer uses transaction | Atomic role swap |
| User.role updated on transfer | Global role reflects actual admin status |
| STUDENT can only request, not self-approve | Prevents privilege escalation |
