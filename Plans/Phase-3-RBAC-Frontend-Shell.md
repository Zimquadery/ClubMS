# Phase 3: RBAC + Frontend Shell

**Goal:** Implement role-based access control middleware on the backend, and scaffold the React frontend with auth context, protected routes, layout, and login/register pages.

---

## Context

Building on Phases 1-2. Auth works — users can register/login and get JWTs. Now we need:
- Backend: Middleware to enforce role-based restrictions
- Frontend: Full React app shell with routing, auth state, and protected pages

---

## Scope

### Must Complete

#### Backend
1. **`middleware/rbac.js`** — `requireRole(...roles)` middleware factory
2. **Mount rbac on existing routes** — No routes use it yet, but it's ready

#### Frontend
3. **Vite + React setup** — `npm create vite@latest`, React + JS
4. **Tailwind CSS v4** — CSS-first config via `@theme` directive in `index.css` (no `tailwind.config.js`)
5. **shadcn/ui v4 init** — `npx shadcn@latest init -t vite` (JS mode, CSS variables enabled, base-nova style), add Button, Input, Card, Label, DropdownMenu, Avatar
6. **`api/client.js`** — Axios instance with JWT interceptor, base URL `/api`
7. **`context/AuthContext.jsx`** — Auth state, login/logout/register, role helpers
8. **`hooks/useAuth.js`** — Convenience hook for AuthContext
9. **`components/Layout.jsx`** — App shell with navbar, branding (university name, logo)
10. **`components/ProtectedRoute.jsx`** — Role-guarded route wrapper
11. **`pages/Login.jsx`** — Email/password form with branding
12. **`pages/Register.jsx`** — Registration form
13. **`pages/Dashboard.jsx`** — Placeholder dashboard (shows user info)
14. **`App.jsx`** — React Router setup with all routes
15. **`main.jsx`** — Entry point, renders App

### Out of Scope
- Club pages (Phase 4)
- Event pages (Phase 6)
- Membership pages (Phase 5)
- Admin pages (Phases 4-5)

---

## Deliverables & File Manifest

```
backend/src/
└── middleware/
    └── rbac.js

frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── api/
│   │   └── client.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ui/  (shadcn generated)
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Dashboard.jsx
│   └── hooks/
│       └── useAuth.js
├── vite.config.js
└── components.json
```

---

## Key Implementation Details

### Backend: middleware/rbac.js

```js
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { requireRole };
```

**Usage pattern (for future phases):**
```js
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), controller.create);
```

### Frontend: api/client.js

```js
import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

### Frontend: context/AuthContext.jsx

```js
// Provides:
// - user: { id, email, role, name } | null
// - token: string | null
// - loading: boolean
// - login(email, password) → calls POST /auth/login, stores token
// - register(email, password, name) → calls POST /auth/register
// - logout() → clears token, sets user to null
// - isAuthenticated: boolean
// - hasRole(...roles) → boolean

// On mount: checks localStorage for token, calls GET /auth/me to restore session
```

### Frontend: components/ProtectedRoute.jsx

```jsx
// Props: { roles?: string[], children }
// Guard order (MUST check loading first to prevent flash-redirect on page refresh):
// 1. If loading (AuthContext restoring session) → render null or a spinner
// 2. If not authenticated → redirect to /login
// 3. If roles provided and user's role not in roles → redirect to /dashboard
// 4. Otherwise → render children

// Example:
// const { user, loading } = useAuth();
// if (loading) return null;
// if (!user) return <Navigate to="/login" replace />;
// if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
// return children;
```

### Frontend: components/Layout.jsx

```jsx
// App shell:
// - Top navbar with:
//   - Logo (from VITE_LOGO_URL or default)
//   - University name (from VITE_UNIVERSITY_NAME)
//   - Nav links (Dashboard, Clubs, Events — if authenticated)
//   - User menu (name, role, logout button)
// - Main content area: <Outlet /> from react-router-dom (required for React Router v6 nested routes)
// - Brand color applied via CSS variable
```

> **Note:** `App.jsx` uses React Router v6 nested routes (`<Route element={<Layout />}>`). Layout **must** render `<Outlet />` — not `{children}` — for nested routes to display. Import `Outlet` from `react-router-dom`.

### Frontend: pages/Login.jsx

```jsx
// - Logo + university name header
// - Email input
// - Password input
// - Login button (uses brand-primary color)
// - Link to /register
// - Error display for invalid credentials
// - Redirect to /dashboard on success
```

### Frontend: pages/Register.jsx

```jsx
// - Logo + university name header
// - Name input
// - Email input
// - Password input
// - Register button
// - Link to /login
// - Error display for duplicate email
// - Redirect to /login on success
```

### Frontend: pages/Dashboard.jsx

```jsx
// - Welcome message with user name
// - Placeholder sections:
//   - "Your Clubs" (empty for now)
//   - "Upcoming Events" (empty for now)
// - Role-specific admin links (if PLATFORM_ADMIN or CLUB_ADMIN)
```

### Frontend: App.jsx Routes

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/" element={<Layout />}>
    <Route index element={<Navigate to="/dashboard" />} />
    <Route path="dashboard" element={
      <ProtectedRoute><Dashboard /></ProtectedRoute>
    } />
    {/* Phase 4+ routes will be added here */}
  </Route>
</Routes>
```

### Frontend: vite.config.js

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
```

### White-Label Variables (Frontend)

| Variable | Usage |
|----------|-------|
| `VITE_UNIVERSITY_NAME` | Navbar, login header |
| `VITE_PRIMARY_BRAND_COLOR` | CSS variable `--brand-primary` |
| `VITE_LOGO_URL` | Navbar, login header logo |

---

## Dependencies

### Frontend (new)
- react, react-dom, react-router-dom, axios
- tailwindcss (v4, CSS-first — no postcss/autoprefixer needed)
- shadcn/ui v4 components — add individually: `npx shadcn@latest add button input card label dropdown-menu avatar`

---

## Acceptance Criteria

1. `POST /api/auth/register` still works (no regression)
2. `requireRole('PLATFORM_ADMIN')` middleware exists and is importable
3. Frontend loads at `http://localhost:80`
4. `/login` page renders with email/password form
5. `/register` page renders with name/email/password form
6. Login stores JWT in localStorage, redirects to /dashboard
7. `/dashboard` shows user info when authenticated
8. `/dashboard` redirects to /login when not authenticated
9. Navbar shows university name from env var
10. Brand color applies to buttons/links
11. Logout clears token and redirects to /login

---

## Verification

```bash
# Backend rbac middleware exists
docker compose exec backend ls src/middleware/rbac.js

# Frontend builds
docker compose exec frontend npm run build

# Manual browser test:
# 1. Visit /login → form renders
# 2. Register new user → redirects to /login
# 3. Login → redirects to /dashboard
# 4. Dashboard shows user name and role
# 5. Logout → redirects to /login
# 6. Visit /dashboard → redirects to /login
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| AuthContext on frontend | Centralized auth state, accessible everywhere |
| Axios interceptor for JWT | Auto-attaches token, auto-logout on 401 |
| ProtectedRoute component | Declarative role guarding in JSX |
| Layout as route wrapper | Consistent shell across all authenticated pages |
| shadcn/ui v4 + Tailwind v4 | Accessible, customizable, CSS-first theming via `@theme` |
| localStorage for token | Simple for MVP; httpOnly cookies for production |
