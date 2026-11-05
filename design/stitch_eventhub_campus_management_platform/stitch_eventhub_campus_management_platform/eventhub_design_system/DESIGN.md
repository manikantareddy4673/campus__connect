---
name: EventHub Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#003fac'
  on-tertiary: '#ffffff'
  tertiary-container: '#0555dd'
  on-tertiary-container: '#d1daff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 2rem
  margin-mobile: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a focused, premium, and institutional-yet-approachable visual language for university and collegiate event ecosystems. Designed for students, university administrators, faculty, and event organizers, it strikes a balance between academic credibility and consumer-grade engagement.

The aesthetic marries **Corporate / Modern** precision with crisp contemporary SaaS ergonomics. It eliminates extraneous ornamentation in favor of crisp typography, structural rhythm, subtle slate borders, and deliberate atmospheric depth. The user interface evokes organization, anticipation, and technological sophistication—elevating campus logistics into vibrant community hubs.

## Colors

The palette leverages a deep digital indigo foundation counterbalanced by luminous cyan and cobalt accents against clean, cool-tinted neutral planes.

- **Primary (`#4F46E5`, `#4338CA`):** Signals command, focal actions, primary interactive states, and core branding cues. Used for primary call-to-action buttons, active navigation markers, and prominent timestamps.
- **Secondary (`#0EA5E9`):** A vibrant cyan applied selectively to live status indicators, registration badges, interactive link highlights, and secondary progress indicators.
- **Tertiary (`#2563EB`):** Dynamic cobalt utilized for informational alerts, categorized student tracks, and complex chart fills.
- **Surfaces & Backgrounds:** The base layer defaults to `#F8FAFC` (Canvas Slate), layered over with `#FFFFFF` (Surface Elevated) for modules and cards, and `#F1F5F9` (Surface Subtle) for inset tables, search inputs, and inactive controls.
- **Borders & Dividers:** High-precision `#E2E8F0` defines container edges with sub-pixel crispness.
- **Text & Foreground:** Neutral scales run from `#0F172A` (Headings / Body high-emphasis), to `#475569` (Secondary descriptors), down to `#94A3B8` (Placeholders and metadata timestamps).

## Typography

Typography relies entirely on **Inter** to construct an engineered, highly legible, metric-aligned typographic system.

- **Headlines & Display:** Tightly tracked headings (-0.01em to -0.03em) anchor editorial hierarchy, conveying authority and crisp structure across complex dashboards and landing views.
- **Body:** Neutral tracking and standard line-height ratios preserve effortless readability across schedules, speaker bios, and technical campus announcements.
- **Labels & Micro-copy:** Uppercase or small-scale metadata utilizes slight positive letter-spacing (`0.02em` to `0.04em`) and semi-bold/bold weights to guarantee instant scannability on dense data grids, chips, and status tags.

## Layout & Spacing

The design system employs a structured 12-column responsive fluid grid pinned to an 8pt architectural rhythm, maintaining a strict 1440px maximum content constraint for enterprise widescreen displays.

- **Desktop (>= 1024px):** 12-column grid, `2rem` (32px) gutters, and `3rem` (48px) safe margins. Multi-column event dashboards, side-by-side calendar views, and split-screen registration forms live here.
- **Tablet (768px - 1023px):** 8-column grid, `1.5rem` (24px) gutters, and `2rem` (32px) margins. Primary side navigation collapses into an icon rail or off-canvas drawer.
- **Mobile (< 768px):** 4-column grid, `1rem` (16px) gutters, and `1rem` (16px) margins. Card grids collapse strictly to single-column feeds, tabular data pivots into stacked cards, and sticky primary action bars attach to the bottom edge.
- **Spacing Rhythm:** Internal card padding is uniformly standard (`space-lg` / 24px) for desktop and compact (`space-md` / 16px) for mobile. Gaps between related micro-elements (icons, badges, titles) use strict `space-xs` and `space-sm` increments.

## Elevation & Depth

Visual hierarchy pairs clean boundary outlines with ultra-soft, indigo-tinted ambient shadows, establishing physical separation without heavy skeuomorphic weight.

- **Resting Layer (Cards, Modules):** Border of `1px solid #E2E8F0` coupled with an ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`.
- **Raised Layer (Interactive Hover, Dropdowns):** Subtle upward elevation: `0 10px 15px -3px rgba(79, 70, 229, 0.05), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`. Border shifts slightly toward primary tint (`#CBD5E1`).
- **Floating Layer (Modals, Slide-overs, Flyouts):** Pronounced depth: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)`. Backdrops feature a translucent veil of `rgba(15, 23, 42, 0.4)` with an `8px` backdrop blur (`backdrop-filter: blur(8px)`).
- **Recessed Layer (Search bars, Inset tables, Empty states):** Flat surface with `#F1F5F9` background and an optional inner shadow `inset 0 1px 2px rgba(15, 23, 42, 0.04)`.

## Shapes

The geometric identity is defined by a refined, rounded contour language that feels smooth and contemporary without veering into overly playful territory:

- **Base Radius (8px / 0.5rem):** Applied to form fields, nested micro-buttons, dropdown items, tooltips, and table rows.
- **Container Radius (12px - 16px / 0.75rem - 1rem):** Applied uniformly to event overview cards, detail modules, dialog windows, and media wrappers.
- **Pill Shape (`9999px`):** Reserved exclusively for status chips, filter tokens, category tags, avatars, and badge notifications to contrast sharply against rectangular content cards.

## Components

### Buttons
- **Primary:** Filled `#4F46E5` with `#FFFFFF` text. Hover transitions smoothly to `#4338CA`. Active state scales subtly (`scale(0.98)`). Border radius is 8px; vertical padding 10px, horizontal 16px.
- **Secondary:** Filled `#FFFFFF` with `#0F172A` text and a `1px solid #E2E8F0` border. Hover changes background to `#F8FAFC` and border to `#CBD5E1`.
- **Tertiary / Ghost:** No border or resting background; `#4F46E5` or `#475569` text. Hover initiates a subtle `#EEF2FF` wash.

### Chips & Pill Filters
- **Interactive Filter Pills:** Fully rounded (`rounded-full`), `32px` height, featuring `#FFFFFF` background, `1px solid #E2E8F0`, and text `#475569`. Active state transitions to `#EEF2FF` background, `#4F46E5` text, and `#818CF8` border.
- **Status Badges:** Small (`22px` height), uppercase `label-sm` typography with pill shape.
  - *Live/Ongoing:* `#ECFDF5` background, `#059669` text with pulsing green dot.
  - *Upcoming:* `#F0F9FF` background, `#0284C7` text.
  - *Sold Out/Closed:* `#F1F5F9` background, `#64748B` text.

### Cards
- **Event Card Structure:** 16px border-radius, `#FFFFFF` background, `1px solid #E2E8F0`, and resting elevation shadow. Top aspect-ratio banner image (16:9) with overlay date badge. Card body includes category chip, `headline-sm` title, campus venue metadata with iconography, and bottom registration footer separated by a subtle `#F1F5F9` divider.

### Form Inputs & Search
- **Input Fields:** Height 42px, radius 8px, `#FFFFFF` background, `1px solid #CBD5E1`. Focus state transitions to `1px solid #4F46E5` with an outer glow of `0 0 0 3px rgba(79, 70, 229, 0.12)`.
- **Global Search:** Inset `#F1F5F9` field with shortcut hotkey badges (e.g., `⌘K`) styled with `#FFFFFF` background and `#CBD5E1` borders.

### Checkboxes & Radio Buttons
- **Selection Controls:** 18px dimensions, 4px radius for checkboxes, full circle for radios. Resting border `1.5px solid #CBD5E1`. Checked state fills `#4F46E5` with clean white check or bullet icon.

### Tabular Layouts
- **Data Tables:** Outer wrapper framed in 12px rounded borders. Header row set in `#F8FAFC` with bold `12px` uppercase tracking. Table rows feature `#FFFFFF` backgrounds with alternating hover states (`#F8FAFC`) and crisp `1px solid #F1F5F9` bottom borders. Sticky actions pinned cleanly to table cells.