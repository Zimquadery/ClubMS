# Seeding & Test Credentials

## Prerequisites

- PostgreSQL running and accessible
- `.env` configured (copy from `.env.example` and adjust `DATABASE_URL` for your local setup)
- Dependencies installed (`npm run setup`)

## Commands

| Command | Description |
|---|---|
| `npm run seed` | Creates test users, clubs, memberships, and events |
| `npm run deseed` | Deletes all seeded data (users, memberships, clubs, events) |

Seed is **idempotent** for users (uses `upsert`), but clubs/events are only created if no clubs exist yet. To fully reset, run `deseed` then `seed`.

## Test Credentials

All accounts use the same password: **`password123`**

| Role | Email | Name | Notes |
|---|---|---|---|
| PLATFORM_ADMIN | admin@university.edu | Platform Admin | Officer of Coding Club |
| CLUB_ADMIN | officer1@university.edu | Club Officer 1 | Officer of Coding Club |
| CLUB_ADMIN | officer2@university.edu | Club Officer 2 | Officer of Basketball Team |
| STUDENT | student1@university.edu | Student One | Active member of Coding Club |
| STUDENT | student2@university.edu | Student Two | Pending membership to Coding Club |
| STUDENT | student3@university.edu | Student Three | Active member of Basketball Team |
| STUDENT | student4@university.edu | Student Four | Alumni member of Drama Society |
| STUDENT | student5@university.edu | Student Five | Active member of Coding Club |

## Seeded Data Summary

**Clubs (6):** Coding Club, Basketball Team, Drama Society, Science Olympiad, Cultural Exchange, Volunteer Corps

**Memberships (8):**
- 3 OFFICER memberships (admin + 2 officers)
- 4 ACTIVE MEMBER memberships
- 1 PENDING membership (student2 → Coding Club)
- 1 ALUMNI membership (student4 → Drama Society)

Sample positions include IT Secretary (student1 → Programmers Arena), Treasurer (student3 → Basketball Team), and General Secretary (student4 → Drama Society). Positions are stored per club membership.

**Events (5):**
- Hackathon 2025, Weekly Code Review (Coding Club)
- Tryouts (Basketball Team)
- Spring Play Auditions, Improv Night (Drama Society)
