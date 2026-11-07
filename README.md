# ClubMS — University Club Management System

ClubMS is a three-tier web application for managing student clubs at a university. It supports the full club lifecycle: club discovery and joining, membership approval workflows, event management with multi-club collaboration, event RSVP tracking, announcements, and administrative oversight with audit logging. The system is designed for self-hosted deployment and supports institutional branding (university name, logo, and primary color) at build time.

## System Architecture

| Tier | Technology | Responsibility |
|---|---|---|
| Presentation | React 19, Vite, Tailwind CSS v4, Radix UI | Single-page application with route-level code splitting |
| Application | Node.js, Express 4 | RESTful API, authentication, authorization, business logic |
| Data | PostgreSQL 16, Prisma ORM v7 | Relational persistence, schema migrations, seed data |

The frontend communicates with the backend exclusively over a documented REST API (OpenAPI specification served at `/api/docs`). The database schema is versioned through Prisma migrations.

## Domain Model

The schema centers on four role types — `PLATFORM_ADMIN`, `FACULTY`, `CLUB_ADMIN` (club officers), and `STUDENT` — with a hierarchical inheritance model enforced by middleware. Principal entities:

- **User, Club, ClubMembership** — membership lifecycle (`PENDING → ACTIVE → ALUMNI`, with `REJECTED` and re-application), officer promotion/demotion, and department-based join rules.
- **Event, EventHost, EventHostInvite** — events are decoupled from a single owning club through a host join table; one primary host plus optional co-hosts collaborate via a consent-based invitation flow.
- **EventRsvp, Announcement, Venue, AuditLog** — RSVP status tracking, club communications, managed venues, and immutable action trails.

## Backend Design

- **Modular service architecture** — domain modules (`auth`, `clubs`, `memberships`, `events`, `rsvp`, `announcements`, `venues`, `audit`, etc.) each own their routes, controllers, Zod schemas, and services.
- **Layered authorization** — global role middleware (`requireRole`) combined with per-resource ownership checks (`requireClubAdmin`), with privileged-role bypass handled at the service layer.
- **Input validation** — every route validated with Zod schemas; unknown fields are stripped before reaching business logic.
- **Security hardening** — Helmet headers, CORS origin allowlist, tiered rate limiting, bcrypt password hashing, and stateless JWT sessions. File uploads are validated by magic-byte content inspection before persistence, and uploaded content is served with a restrictive `Content-Security-Policy` to neutralize stored-XSS vectors.
- **Data integrity** — multi-step operations execute within Prisma transactions; unique constraints prevent duplicate memberships, RSVPs, and host assignments.
- **Audit logging** — mutation endpoints record actor, target, metadata, and IP address for administrative review.
- **Observability** — structured request logging with `pino`/`pino-http`.

## Testing Strategy

Testing is integration-first: HTTP tests in `tests/api/` exercise the fully assembled Express application (middleware chain, validation, RBAC, error handling) against a real PostgreSQL instance provisioned per-run with Testcontainers, with database state reset between tests. Pure unit tests cover side-effect-free functions. The suite runs via `npm test` (full), `npm run test:unit`, and `npm run test:integration`.

## Deployment

Docker Compose orchestrates three services: a PostgreSQL database, the Express backend, and the frontend served by Nginx. Branding parameters (`UNIVERSITY_NAME`, `PRIMARY_BRAND_COLOR`, `LOGO_URL`) are injected as build-time arguments, producing a white-labeled static bundle without code changes.
