# Phase 2: Authentication

**Goal:** Implement JWT-based authentication with register/login endpoints, password hashing, and an auth service layer structured for future SSO swap-in.

---

## Context

Building on Phase 1 (foundation). The database schema exists, Express runs, but there's no way to create users or authenticate. This phase adds the complete auth flow.

**SSO Preparedness:** The auth service is a separate layer from the controller. To integrate SSO later (Shibboleth, Azure AD), replace internals of `auth.service.js` — controllers and routes stay untouched.

---

## Scope

### Must Complete
1. **`auth.service.js`** — Business logic: `register()`, `login()`, `getMe()`
2. **`auth.controller.js`** — HTTP layer: request parsing, response formatting
3. **`auth.routes.js`** — Express router: 3 endpoints
4. **`middleware/auth.js`** — JWT verification middleware → attaches `req.user`
5. **Password hashing** — bcryptjs with salt rounds
6. **JWT generation** — 24-hour expiry (simple for MVP; add refresh tokens for production), payload: `{ userId, email, role }`

### Out of Scope
- RBAC middleware (Phase 3)
- Frontend auth UI (Phase 3)
- Password reset / forgot password (explicit MVP exclusion)

---

## Deliverables & File Manifest

```
backend/src/
├── modules/
│   └── auth/
│       ├── auth.service.js
│       ├── auth.controller.js
│       └── auth.routes.js
└── middleware/
    └── auth.js
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new student account |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user profile |

---

## Key Implementation Details

### auth.service.js

```js
// Interface (swap internals for SSO later):
async register(email, password, name)
  → validates email uniqueness
  → hashes password with bcryptjs (10 salt rounds)
  → creates User with role: 'STUDENT'
  → returns user object (no passwordHash)

async login(email, password)
  → finds user by email
  → compares password with bcrypt
  → throws if invalid
  → generates JWT: { userId: user.id, email: user.email, role: user.role }
  → returns { token, user }

async getMe(userId)
  → finds user by ID
  → returns user object (no passwordHash)
  → throws if not found
```

### auth.controller.js

```js
// register(req, res, next)
  → extracts { email, password, name } from req.body
  → calls authService.register()
  → returns 201 with user object

// login(req, res, next)
  → extracts { email, password } from req.body
  → calls authService.login()
  → returns 200 with { token, user }

// getMe(req, res, next)
  → uses req.user.userId from auth middleware
  → calls authService.getMe()
  → returns 200 with user object
```

### auth.routes.js

```js
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
```

### middleware/auth.js

```js
// Extracts Bearer token from Authorization header
// Verifies with jsonwebtoken using JWT_SECRET
// Attaches decoded payload to req.user: { userId, email, role }
// Returns 401 if no token or invalid token
```

### JWT Token Structure
- **Header:** `{ "alg": "HS256", "typ": "JWT" }`
- **Payload:** `{ "userId": "uuid", "email": "...", "role": "STUDENT", "iat": ..., "exp": ... }`
- **Expiry:** 24 hours (simple for MVP; refresh tokens for production)
- **Secret:** `process.env.JWT_SECRET`

### Error Handling
- 400: Missing fields (email, password, name)
- 401: Invalid credentials (login), missing/invalid token (middleware)
- 409: Email already registered (register)
- 500: Internal server error

---

## Dependencies

All from Phase 1 `package.json`:
- bcryptjs (password hashing)
- jsonwebtoken (JWT sign/verify)
- @prisma/client (database access)

---

## Acceptance Criteria

1. `POST /api/auth/register` with `{ email, password, name }` creates user, returns 201
2. `POST /api/auth/login` with valid credentials returns `{ token, user }`
3. `POST /api/auth/login` with invalid credentials returns 401
4. `GET /api/auth/me` with valid JWT returns user profile
5. `GET /api/auth/me` without JWT returns 401
6. Duplicate email registration returns 409
7. Password is hashed in database (not plaintext)
8. JWT expires after 24 hours

---

## Verification Commands

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'
# → Save the token from response

# Get Me
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Duplicate register (expect 409)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test User"}'
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Service/controller separation | SSO swap-in only changes service internals |
| 24-hour JWT expiry | Simple for MVP; refresh tokens added for production |
| bcrypt salt rounds: 10 | Standard security/performance balance |
| Role defaults to STUDENT | Only PLATFORM_ADMIN can elevate roles (future) |
| No password in responses | Never return passwordHash to client |
