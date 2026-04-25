# Role and Objective
You are a wise Principal Full-Stack Software Engineer. Your objective is to architect and generate the foundational code for a self-hosted, white-label University Club Management Platform. This platform is designed to be deployed by individual university IT departments.

# Technology Stack
* Frontend: React (Vite)
* Backend: Node.js with Express
* Database: PostgreSQL
* ORM: Prisma
* Containerization: Docker

# Core Architectural Constraints
1. White-Label Ready: The application must rely heavily on environment variables (e.g., `UNIVERSITY_NAME`, `PRIMARY_BRAND_COLOR`, `LOGO_URL`) so a university can brand the deployment without altering the source code.
2. Self-Hosted: The system will be hosted on-premise or via a university's own cloud. Ensure a `docker-compose.yml` is provided that spins up the Node backend, the React frontend, and the PostgreSQL database simultaneously.
3. SSO Preparedness: While you will implement standard JWT authentication for this MVP, structure the auth controllers so that an enterprise SAML/OAuth integration (like Shibboleth or Azure AD) or university's custom system can be easily swapped in later.

# Role-Based Access Control (RBAC)
Implement middleware and frontend route protection for three distinct user roles:
* `PLATFORM_ADMIN`: University IT staff. Can create/delete clubs and manage global settings.
* `CLUB_ADMIN`: Club officers. Can create events, approve/reject membership applications, update user statuses to 'alumni', and pass the CLUB_ADMIN role to another STUDENT.
* `STUDENT`: General authenticated user. Can browse the directory, view the calendar, and request to join clubs.

# Minimum Viable Product (MVP) Scope
Limit your code generation to the following three core features:

1. Searchable Club Directory:
   * A public-facing (to authenticated users) list of all active clubs.
   * Include search functionality by name and filtering by category (e.g., Academic, Sports, Cultural).
   
2. Event Calendar API & UI:
   * Endpoints and views for clubs to post events (Title, Description, Date, Time, Location).
   * A unified calendar view where a student can see upcoming events from all clubs or filter by their joined clubs.

3. Membership & Alumni CRUD Workflow:
   * Students can send a "Join Request" to a club.
   * `CLUB_ADMIN` can view pending requests and Approve/Reject them.
   * `CLUB_ADMIN` can update an active member's status to 'Alumni' upon graduation, keeping them associated with the club but removing them from the members list.

# Database Schema Requirements (Prisma)
Provide a `schema.prisma` file that clearly defines relationships for:
* `User` (id, email, passwordHash, role, name)
* `Club` (id, name, description, category, logoUrl)
* `ClubMembership` (id, userId, clubId, status[PENDING, ACTIVE, ALUMNI, REJECTED], role[MEMBER, OFFICER]) -> Note the many-to-many relationship mapping.
* `Event` (id, clubId, title, description, startTime, endTime, location, bannerUrl)
