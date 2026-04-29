---
name: ClubMS
description: Self-hosted university club management platform
colors:
  institutional-navy: "#1E40AF"
  canvas-white: "#ffffff"
  ink-slate: "#0f172a"
  faint-slate: "#f8fafc"
  cloud-surface: "#f1f5f9"
  quiet-stone: "#64748b"
  signal-red: "#ef4444"
  line-silver: "#e2e8f0"
  focus-steel: "#94a3b8"
  raised-surface: "#1e293b"
  deep-night: "#0f172a"
  dim-stone: "#94a3b8"
  dusk-border: "#334155"
  dusk-input: "#334155"
  dusk-ring: "#475569"
  dusk-red: "#dc2626"
  auth-floor: "#f9fafb"
  overlay-black: "rgba(0,0,0,0.8)"
  status-green: "#22c55e"
  status-yellow: "#eab308"
  status-blue-light: "#dbeafe"
  status-yellow-light: "#fef9c3"
  status-green-light: "#dcfce7"
typography:
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  card-title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.025em"
    lineHeight: 1
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1
  button:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
  badge:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
  metadata:
    fontFamily: "ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  card: "0.75rem"
  input: "0.375rem"
  button: "0.375rem"
  badge: "0.375rem"
  dialog: "0.5rem"
  avatar: "9999px"
  menu-item: "0.125rem"
spacing:
  page-gap: "1.5rem"
  card-padding: "1.5rem"
  card-content-compact: "1rem"
  grid-gap: "1rem"
  form-group: "1rem"
  form-field: "0.5rem"
  header-height: "3.5rem"
components:
  button-primary:
    backgroundColor: "{colors.institutional-navy}"
    textColor: "{colors.faint-slate}"
    rounded: "{rounded.button}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.institutional-navy}"
    textColor: "{colors.faint-slate}"
  button-outline:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.button}"
    padding: "0.5rem 1rem"
  button-ghost:
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.button}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.canvas-white}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.input}"
    padding: "0.25rem 0.75rem"
  badge-default:
    backgroundColor: "{colors.ink-slate}"
    textColor: "{colors.faint-slate}"
    rounded: "{rounded.badge}"
    padding: "0.125rem 0.625rem"
  badge-secondary:
    backgroundColor: "{colors.cloud-surface}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.badge}"
    padding: "0.125rem 0.625rem"
---

# Design System: ClubMS

## 1. Overview

**Creative North Star: "The Campus Bulletin"**

An open, inviting surface alive with activity. Imagine a well-maintained campus bulletin board: club flyers layered with personality, event cards pinned with purpose, clear headings that draw your eye to what matters. The information is dense but never cluttered, colorful but never chaotic. Every piece earns its pushpin.

This system serves three audiences at once. Students scanning for their next club between classes need fast visual hierarchy and scannable layouts. Officers managing rosters need efficient bulk actions and unmistakable status indicators. Platform admins checking in occasionally need clear admin navigation without cluttering anyone else's view. The design responds to each without compromising the others.

The visual language is **Restrained** in the product sense: tinted neutrals carry 90% of the surface, with the configurable brand color appearing only on primary actions, active states, and navigation identity. This restraint is strategic. Since the brand color swaps per university deployment, every element must look intentional whether the accent is navy blue, forest green, or crimson.

Components are refined and restrained: understated borders, solid but never heavy fills, clear affordance through hierarchy rather than decoration. The system inherits shadcn/ui's accessibility-first foundation and extends it with white-label brand injection.

**Key Characteristics:**
- Configurable accent on a slate neutral base
- Cards always carry a light ambient shadow, gaining strength on hover
- System font stack throughout. Hierarchy through weight and size contrast, not display fonts
- Status colors (green, yellow, red) are the only fixed palette beyond neutrals
- Compact density: page gaps at 24px, card padding at 16-24px, form groups at 16px

## 2. Colors

The palette is a Slate-neutral foundation with one configurable brand accent. Status colors are fixed regardless of white-label deployment.

**The Configurable Accent Rule.** The brand color (`--brand-primary`, default `#1E40AF`) is the only hue that changes per deployment. Every other color is fixed. All accent usage on a given screen must trace back to `var(--brand-primary)` so a single env swap recolors the entire surface.

### Primary
- **Institutional Navy** (#1E40AF, configurable): The brand accent. Used on primary buttons, active navigation, link text, avatar fallback backgrounds, the admin card highlight, and the skip-to-content focus state. Appears on roughly 5-10% of any given screen. Strong, institutional, trustworthy.

### Neutral
- **Canvas White** (#ffffff): Page and card background (light mode). The default surface.
- **Ink Slate** (#0f172a): Primary text, button default bg (light mode). The anchor for all readable content.
- **Faint Slate** (#f8fafc): Primary button text (light mode), inverted foregrounds. Barely warm white.
- **Cloud Surface** (#f1f5f9): Secondary backgrounds, muted surfaces, badge secondary, input accent. The workhorse neutral for containers.
- **Quiet Stone** (#64748b): Muted text, helper labels, metadata. The secondary voice.
- **Line Silver** (#e2e8f0): Borders, input strokes. Delicate structure.
- **Focus Steel** (#94a3b8): Focus rings. Visible but not aggressive.

### Status (fixed, not configurable)
- **Signal Red** (#ef4444): Destructive actions, error states, danger indicators.
- **Status Green** (#22c55e): Success, active membership, "going" RSVP.
- **Status Yellow** (#eab308): Pending states, warnings, "fair" password strength.

### Dark Mode
In dark mode, backgrounds shift to **Deep Night** (#0f172a) and **Raised Surface** (#1e293b). Text inverts to **Faint Slate** (#f8fafc). Muted text becomes **Dim Stone** (#94a3b8). Borders become **Dusk Border** (#334155). The brand color stays the same.

## 3. Typography

**Display Font:** None. System stack throughout.
**Body Font:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
**Metadata Font:** ui-monospace, SFMono-Regular, monospace (audit logs only)

**Character:** Functional and invisible. The typography gets out of the way. A single system font family handles everything from page titles to badge labels. Hierarchy comes from weight (400 to 700) and size (12px to 24px), not from font pairing.

### Hierarchy
- **Title** (700, 1.5rem / 24px, leading 1.25): Page headings ("Welcome, Name", "Club Directory", "Event Calendar"). The visual anchor of each page.
- **Card Title** (600, inherited size, tracking -0.025em, leading 1): Section headings inside cards and dialogs. Semibold with tight tracking for density.
- **Body** (400, 0.875rem / 14px, leading 1.5): Helper text, descriptions, form labels run at small size. Most on-screen text lives here.
- **Label** (500, 0.875rem / 14px, leading 1): Form field labels, nav link text. Medium weight for scannability.
- **Button** (500, 0.875rem / 14px, leading 1.25): All button text. Compact and readable.
- **Badge** (600, 0.75rem / 12px, leading 1): Tags, categories, status pills. Semibold at the smallest size.
- **Metadata** (400, 0.75rem / 12px, monospace): Audit log metadata. Monospace for data alignment.

**The Size Floor Rule.** No text below 12px (0.75rem). Badge and metadata are the floor; everything else is 14px or above.

## 4. Elevation

Cards and containers always carry a light ambient shadow. The default Card shadow (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`) gives every card subtle physical presence. On hover, interactive cards lift to `shadow-md` (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`).

### Shadow Vocabulary
- **Ambient** (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Cards at rest, default buttons. Gentle presence.
- **Low** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): Outline, secondary, and destructive buttons. Subtle inputs.
- **Medium** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Dropdown menus, select content, card hover states.
- **High** (`0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Dialog overlays. The top of the elevation stack.

**The Always-Lifted Rule.** Cards never sit flat on the page. Even at rest, the ambient shadow separates them from the background. Hover intensifies the lift; it never introduces it from zero.

## 5. Components

### Buttons
- **Shape:** Rounded corners (6px / `rounded-md`), height 36px default, 32px small, 40px large
- **Primary:** Brand color background, white text, ambient shadow. Hover: brand at 90% opacity.
- **Outline:** White background, input border, low shadow. Hover: cloud surface background.
- **Ghost:** No background, no border. Hover: cloud surface background.
- **Destructive:** Signal red background, white text. Hover: red at 90% opacity.
- **Focus:** 1px focus ring in focus steel, no outline.
- **Disabled:** 50% opacity, no pointer events.
- **Brand override pattern:** `bg-brand-primary text-white` used consistently for CTAs that need the brand accent rather than the shadcn default primary.

### Cards
- **Corner Style:** 12px radius (`rounded-xl`). The signature radius of the system.
- **Background:** Canvas white (light) or raised surface (dark).
- **Shadow:** Ambient at rest, medium on interactive hover.
- **Border:** 1px line silver (light) or dusk border (dark).
- **Internal Padding:** 24px default (CardHeader/CardContent), 16px for compact variants (list items, audit entries).
- **List items inside cards:** Use `divide-y` with `py-2 first:pt-0 last:pb-0` rows. No nested borders or backgrounds inside a card.

### Inputs
- **Shape:** 6px radius, 36px height, transparent background, 1px input border.
- **Focus:** 1px focus ring, no outline.
- **Error:** Destructive background at 10% opacity with destructive text (no colored border).
- **Disabled:** 50% opacity, no cursor.

### Badges
- **Shape:** 6px radius, tight padding (2.5px 10px).
- **Default:** Ink slate background, faint slate text. For primary tags.
- **Secondary:** Cloud surface background, ink slate text. For categories and labels.
- **Outline:** Transparent background, foreground text, visible border. For status indicators.
- **Semantic overrides:** Status green/yellow/blue backgrounds used for membership state (active, pending, alumni) with light/dark variants.

### Navigation
- **Desktop:** Horizontal top bar, 56px height, sticky. Links at 14px medium weight, muted-foreground default, foreground on active. Icons at 16px beside labels.
- **Mobile:** Hamburger toggle reveals vertical nav below header. 12px gap between links, cloud surface border on toggle area.
- **User menu:** Avatar (32px circle, brand color fallback with initials) opens dropdown with user info and logout.

### Dialogs
- **Overlay:** Black at 80% opacity, fade animation (200ms).
- **Content:** Canvas white (light) or deep night (dark), 8px radius on sm+, 24px padding, high shadow. Centered with slight zoom entrance.
- **Width:** 512px max (`max-w-lg`).

### Skeleton Loading
- **Shape:** Matches component being loaded (12px radius for cards, 6px for list items).
- **Animation:** `animate-pulse` on muted surface. No spinners for content areas.
- **Variants:** CardSkeleton, EventCardSkeleton, ListSkeleton, DetailSkeleton.

### Stats Strip
- **Purpose:** Role-specific summary metrics beneath the dashboard greeting. Replaces the banned hero-metric card grid.
- **Structure:** Inline flex row of labeled values separated by middle dot dividers (`·`). Each item is `whitespace-nowrap` to prevent divider orphaning on wrap.
- **Typography:** Body size (14px), value in `font-semibold text-foreground`, label in `text-muted-foreground`.
- **Divider:** Middle dot in `text-muted-foreground/40` with `mx-1.5` spacing. `aria-hidden` and `select-none`.
- **Indent:** `ml-2` from the greeting, `mt-2` below it. Stats are subordinate to the heading.
- **Loading:** Skeleton count matches the role's stat count (2 for students, 4 for admins).
- **Format:** Numbers use `toLocaleString()` for thousand separators.

## 6. Do's and Don'ts

### Do:
- **Do** use `var(--brand-primary)` for all accent-colored elements so white-label recoloring works with a single CSS variable change.
- **Do** give cards ambient shadow at rest and medium shadow on hover. The lift is always present.
- **Do** use status colors (green, yellow, red) consistently for membership state, RSVP response, and validation feedback.
- **Do** keep body text at 14px (0.875rem) and above. 12px is the absolute floor for badges and metadata only.
- **Do** use the 12px radius (`rounded-xl`) for cards and 6px (`rounded-md`) for inputs and buttons. This two-tier system is the corner vocabulary.
- **Do** use system font stack. No custom font loading. Performance and native feel over brand typography.
- **Do** test dark mode for every new component. All colors must work against deep night (#0f172a) and raised surface (#1e293b).

### Don't:
- **Don't** use emojis, illustrations, or confetti animations. Per PRODUCT.md: "This is a university tool, not a social app."
- **Don't** create hero-metric dashboards with big numbers and gradient accents. Stats appear as inline strips beneath the greeting, not in card grids or dramatic hero layouts.
- **Don't** use glassmorphism, gradient text (`background-clip: text`), or side-stripe borders (colored `border-left`/`border-right` greater than 1px).
- **Don't** build identical card grids (same-sized icon + heading + text repeated). Cards should vary by content density and purpose.
- **Don't** hardcode colors outside the token system. If a new semantic color is needed, add it to `@theme inline` in `index.css`. All known violations have been resolved: use `bg-background` (not `bg-gray-50`), `bg-destructive`/`bg-status-yellow`/`bg-status-green` (not `bg-red-500`/`bg-yellow-500`/`bg-green-500`), `bg-status-green`/`bg-status-yellow`/`bg-destructive` (not `bg-green-600`/`bg-yellow-600`/`bg-red-600`), `text-status-yellow` (not `text-yellow-600`), `border-input` (not `border-gray-300`).
- **Don't** use display fonts or decorative type in UI labels, buttons, or data. System stack only.
- **Don't** add animated page-load sequences. Per the product register: "Product loads into a task; users don't want to watch it load."
- **Don't** use spinners for content loading states. Skeletons match the layout. Spinners only for inline button loading indicators.
