# Product

## Register

product

## Users

Three roles, each with distinct context:

- **Students** (primary volume): Browsing clubs and events between classes, mostly on phones. Quick glances, tapping to join or RSVP. Need fast, scannable layouts with clear touch targets. Session is brief, task-oriented.
- **Club officers** (power users): Managing rosters, approving members, creating events. Mixed desktop and mobile. Working from a desk during admin hours or on their phone responding to pending requests. Need efficient bulk actions and clear status indicators.
- **Platform admins** (university IT): Occasional setup and oversight. Creating clubs, checking audit logs. Desktop-first, infrequent sessions. Need clear navigation to admin functions without cluttering the student experience.

## Product Purpose

ClubMS is a self-hosted, white-label university club management platform. Universities deploy it via Docker, brand it with their colors and logo, and their students use it to discover clubs, track events, and manage memberships.

Success means: a student finds and joins a club in under 30 seconds. An officer approves 10 pending requests in under a minute. A platform admin sets up the system without reading docs.

## Brand Personality

Friendly, vibrant, simple.

Approachable without being playful. Warm and welcoming to first-year students discovering campus life, but serious enough that officers and admins trust it for real administrative work. The interface should feel alive and energetic, not sterile, but never cross into childish territory. Think of a well-run student affairs office: organized, bright, genuinely helpful.

## Anti-references

- **Playful/childish apps**: No emojis-as-decoration, no cartoon illustrations, no confetti animations. This is a university tool, not a social app.
- **Enterprise SaaS cliches**: No hero-metric dashboards with big numbers and gradient accents. No glassmorphism cards. No identical card grids.
- **Generic admin panels**: No dense data tables as the default for everything. No sidebar-with-50-links navigation patterns.

## Design Principles

1. **Quick to scan, fast to act.** Students glance and tap. Every screen should communicate its primary action in under 2 seconds. Hierarchy through contrast, not decoration.
2. **Warm but trustworthy.** Color and spacing create warmth. Typography and structure create trust. Both coexist without compromise.
3. **Progressive disclosure.** Students see what matters to them. Officers see management tools when they need them. Admins see admin functions. No role sees clutter from another role's workflow.
4. **White-label ready at the surface.** Brand color and logo are the only customization points. Everything else should look intentional regardless of which university's color is applied.
5. **Tight and intentional.** Every element earns its space. No decorative containers, no redundant labels, no filler content. If removing something makes the page better, remove it.

## Accessibility & Inclusion

WCAG 2.1 AA compliance. Standard web accessibility: sufficient color contrast, keyboard navigation, screen reader support, focus indicators. Reduced motion respected via `prefers-reduced-motion`. Touch targets meet minimum 44px on mobile.
