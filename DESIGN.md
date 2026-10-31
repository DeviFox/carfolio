---
name: carfolio
description: Визуальный гараж — a quiet SaaS surface for owners to keep the service story of their own cars.
colors:
  surface: "#f8fafc"
  card: "#ffffff"
  card-raised: "#ffffff"
  overlay: "rgba(15, 23, 42, 0.42)"
  ink: "#0f172a"
  body: "#475569"
  muted: "#64748b"
  faint: "#94a3b8"
  ghost: "#cbd5e1"
  line: "#e5e7eb"
  line-strong: "#cbd5e1"
  line-dash: "#94a3b8"
  accent: "#2563eb"
  accent-hover: "#1d4ed8"
  accent-soft: "#eff6ff"
  accent-ink: "#ffffff"
  ok: "#10b981"
  warn: "#f59e0b"
  danger: "#ef4444"
  ok-ink: "#047857"
  warn-ink: "#92400e"
  danger-ink: "#991b1b"
typography:
  display:
    fontFamily: "Geist Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  display-compact:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  brand-mark:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  subtitle:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.005em"
  small:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  micro:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  figure:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: '"ss01", "tnum", "cv11"'
  caption:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
    fontFeature: '"ss01", "tnum", "cv11"'
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.accent-ink}"
  button-primary-disabled:
    backgroundColor: "{colors.line-strong}"
    textColor: "{colors.card}"
  button-ghost:
    textColor: "{colors.body}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-ghost-hover:
    textColor: "{colors.ink}"
  input-text:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "42px"
    typography: "{typography.body}"
  input-text-invalid:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
  nav-item:
    textColor: "{colors.body}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
    typography: "{typography.body}"
  nav-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  nav-item-soon:
    textColor: "{colors.faint}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
    typography: "{typography.body}"
  status-pill-ok:
    backgroundColor: "color-mix(in srgb, #10b981 12%, #ffffff)"
    textColor: "{colors.ok-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-pill-attention:
    backgroundColor: "color-mix(in srgb, #f59e0b 18%, #ffffff)"
    textColor: "{colors.warn-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-pill-critical:
    backgroundColor: "color-mix(in srgb, #ef4444 14%, #ffffff)"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-pill-unknown:
    backgroundColor: "color-mix(in srgb, #e5e7eb 60%, transparent)"
    textColor: "{colors.body}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  system-ledger:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  component-sheet:
    backgroundColor: "{colors.card-raised}"
    textColor: "{colors.ink}"
    width: "440px"
    padding: "24px 28px"
  card-empty-slot:
    backgroundColor: "transparent"
    textColor: "{colors.body}"
    rounded: "{rounded.lg}"
    padding: "36px 24px"
  dialog-surface:
    backgroundColor: "{colors.card-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "28px 32px 24px"
---

# Design System: carfolio

## Overview

**Creative North Star: "The Quiet Service Ledger"**

Carfolio is a working surface, not a showroom. It takes the restrained-SaaS craft bar — Linear's spatial economy, Vercel-flavored Rauno precision, Apple Health & Fitness's clinical calm — and bends it toward a car owner's maintenance ledger. The world is white paper under a soft slate ink, with a single blue accent reserved for the one next thing to do. Nothing is loud; the garage speaks only when the owner adds, confirms, or needs to notice state. Density is medium: whitespace carries the composition and type does the hierarchy, no decorative devices.

The surface treats emptiness as a structural fact, not a marketing moment. An empty garage shows exactly one dashed cell at the geometry a future car card will occupy — the collection begins pre-populated with its own shape.

Once a car exists, the car is the index. The isometric illustration stays in view beside a collapsible ledger of systems, and state is spent precisely and only where it is true: status pills, resource bars, zone badges on the car. Unknown is a first-class, quiet grey state — never a fabricated percentage.

The anti-reference is enthusiast marketing: hero imagery, glossy chrome, aggressive gradients, dark glass. Carfolio is for the owner between oil changes, not the buyer at the dealership.

**Key Characteristics:**
- Paper-slate neutral surface, one blue accent, three state colors spent only on state surfaces
- Geist Sans for voice, Geist Mono strictly for numbers, versions, and status
- 8-12-16-pill radii; no square corners, no sharp containers
- Flat with hairline borders; shadows only on raised surfaces (dialog, selected toggle, hovered CTA)
- Grid-first composition — the empty slot occupies real card geometry
- The car stays in view: a sticky stage beside a ledger that collapses to one row per system
- Motion is 120–220ms, cubic-bezier(0.2, 0.9, 0.2, 1), state-only

## Colors

A near-white paper surface with a slate ink ramp, a single confident blue accent, and three semantic state colors held in reserve for populated-garage surfaces.

### Primary
- **Signal Blue** (`#2563eb`): the one accent. Primary CTAs, active nav state, focus rings, selected step dot, input focus border, hovered empty-slot border and icon fill. Used sparingly — a single blue area per viewport is the norm.
- **Signal Blue Deep** (`#1d4ed8`): hover state for primary CTAs only.
- **Signal Blue Mist** (`#eff6ff`): active nav background, hovered empty-slot background. A tinted wash, never a fill on type-dense surfaces.

### Neutral
- **Paper** (`#f8fafc`): page surface. The world's ground.
- **Card** (`#ffffff`): rail, inputs, dialog, step dots, raised toggle pill. Everything that lifts off paper.
- **Ink** (`#0f172a`): headings, strong body, brand mark surface. The world's black.
- **Body** (`#475569`): default text and nav-item ink at rest.
- **Muted** (`#64748b`): subheads, hints, status-line prose, mono status text.
- **Faint** (`#94a3b8`): placeholders, optional-field labels, dashed-border stroke. Never for text that must be read (2.6:1 on card).
- **Ghost** (`#cbd5e1`): scrollbar thumb; soft disabled/trace states.
- **Line** (`#e5e7eb`): hairline dividers (rail border, status-line rule, footer rule).
- **Line Strong** (`#cbd5e1`): input borders, step-rule, disabled button fill, step-dot default border.
- **Line Dash** (`#94a3b8`): empty-slot dashed border, status dot default, separator glyph.
- **Overlay** (`rgba(15, 23, 42, 0.42)`): modal scrim. The only translucent surface in the system.

### Semantic
- **Ok Green**: "В норме". Pill dot, resource bar fill, success card.
- **Warn Amber**: "Требует внимания" / "Низкий ресурс". Same surfaces as green; also the attention badge on a car zone.
- **Danger Red**: "Критично" / "Просрочено", invalid field border, inline error text.
- **Ok / Warn / Danger Ink** (deep tints): text sitting on a 12–18% wash of their state color (status pills). The bright state colors never carry text.

### Named Rules
**The One Blue Rule.** A given viewport holds one meaningful blue element at a time — the primary CTA, or the active nav row, or a focused input, or the hovered empty slot. Blue is the pointer to the next action; multiplying it dilutes the signal.

**The Reserved State Rule.** `--ok`, `--warn`, `--danger` are system colors, not decoration. Use them only on genuine state surfaces: status pills, resource bars, zone badges, validation. Never as hover tints, borders, or accents in neutral contexts.

**The Grey-Is-Honest Rule.** Missing data renders in neutral grey (empty grey resource track, `line-dash` dot, italic `muted` "Нет данных"). A known state outranks unknown when rolling up: a system with two "ok" parts and one unknown reads "В норме · 1 без данных", not "Нет данных".

**The Paper-Not-Grey Rule.** The surface is `#f8fafc`, not pure white and not neutral grey. Cards sit on paper; paper never sits on cards.

## Typography

**Display / Body Font:** Geist Sans (with system-ui, -apple-system, Segoe UI, Roboto, sans-serif fallbacks)
**Mono Font:** Geist Mono (with ui-monospace, SFMono-Regular, Menlo fallbacks), features `"ss01", "tnum", "cv11"`

**Character:** Geist Sans is the single voice for interface prose — modern, geometric, quiet, with negative tracking (`-0.005em` baseline on body, up to `-0.025em` on display) that keeps it from feeling like a system font. Geist Mono is strictly technical: numbers, versions, status timestamps, step counters, mileage odometer inputs.

### Hierarchy
- **Display / H1** (600, 28px / 24px mobile, line-height 1.15, letter-spacing -0.025em): page title ("Мой гараж"). One per surface.
- **Title** (600, 20px, line-height ~1.3, letter-spacing -0.015em): dialog titles.
- **Subtitle** (600, 16px, letter-spacing -0.01em): brand name, empty-slot title.
- **Body** (400–500, 14px, line-height 1.5, letter-spacing -0.005em): default. Nav items, subhead paragraph, input text, labels, buttons.
- **Small** (400–500, 13px): empty-slot description, step label, field label, hints, mobile top-bar brand.
- **Micro** (500, 12px, letter-spacing 0.02em on mono): brand subtitle, optional-field tag, step-dot numeral (mono), status line (mono), rail-foot version (mono).
- **Figure** (Geist Mono 700, 28px, line-height 1): the current mileage and the resource percentage in the component sheet. Digit groups are split with a 0.22em optical gap, never the locale's full-width no-break space.
- **Brand Mark** (700, 15px, letter-spacing -0.03em): the "c" glyph inside the 28×28 ink square.

### Named Rules
**The Mono-for-Numbers Rule.** Geist Mono is reserved for data: mileage input, step counter, status line, version chip, timestamps, percentages. Mono never carries interface prose — "просрочено по сроку", "ещё 6 570 км", "3 компонента · 1 без данных" are sans with `.numeric` (`font-variant-numeric: tabular-nums`).

**The Negative-Tracking Rule.** Display and title type tightens tracking (-0.015em to -0.025em); body stays near default (-0.005em); mono opens (+0.02em). The tracking ramp follows the size ramp, inversely.

## Layout

Desktop (≥821px) is a two-column CSS grid: a 240px sticky left rail against a flexible main column that caps at 1200px with 32–40px padding. The rail is `card`-white against `paper`-off-white, separated by a single `line` hairline on its right edge — no shadow, no gradient, just the surface step.

The garage uses a three-column CSS grid (`repeat(3, minmax(0, 1fr))`) with 24px gutter. At 821–1100px it collapses to two columns; at ≤820px it becomes a single-column flex layout and the left rail is replaced by a mobile top bar (card background, 12×16px padding, bottom hairline) that pairs the brand mark with a compact primary CTA. The in-page header CTA is hidden on mobile — the top bar owns the add action.

The dialog overlay centers at ≥561px (24px padding gutter, 560px max-width). At ≤560px it drops to a bottom sheet: aligned to viewport bottom, 90vh max-height, top-only rounded corners (`16px 16px 0 0`), and two-column form rows collapse to single column.

The car page widens the main column to 1600px. At ≥1280px it splits into two panes (`minmax(360px, 5fr) 7fr`, 24px gap): the left **stage** card is sticky at `top: 24px` (max-height `calc(100vh - 48px)`, scrolls internally) and holds the illustration, the mileage strip and the attention list; the right **ledger** scrolls with the page (systems, then recent work, 32px apart). At 821–1279px the stage is one card split car | mileage + attention; at ≤820px everything stacks and the stage loses its side hairline for a top one. The ledger reflows on its own container width (≤560px: resource bar drops under the component name).

The component sheet slides in from the right (440px, full height) on desktop and becomes a bottom sheet (90vh, top-only 16px radius) at ≤560px.

**The Car-Stays-In-View Rule.** Anything that links to the car (hovering or focusing a system row lights its zone) must keep the car on screen. Page roots use `overflow-x: clip`, never `hidden`: `hidden` turns `body` into a scroll container and silently breaks every sticky element.

**Rhythm:** vertical gaps run on an 4-6-8-10-12-16-18-20-24-32-40 scale. Dialog form fields use 18px row gap; main sections use 24–40px. The 40px gap between page header, grid, and status line sets the surface's breathing.

## Elevation & Depth

Mostly flat with hairline borders. Depth is conveyed by surface-color steps (paper → card → card-raised) and by selective shadow for genuinely raised elements. Shadows are never ambient atmosphere — they mark a lift.

### Shadow Vocabulary
- **Shadow Sm** (`0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)`): the raised pill in the units toggle (the selected tab lifts above its track).
- **Shadow Md** (`0 2px 6px rgba(15,23,42,0.06), 0 8px 20px rgba(15,23,42,0.08)`): reserved for cards/menus that lift from paper. Defined; not yet spent on this surface.
- **Shadow Lg** (`0 2px 6px rgba(15,23,42,0.08), 0 24px 48px rgba(15,23,42,0.18)`): the modal dialog and the component sheet — the only surfaces that float above the page.
- **Button Lift** (`0 1px 2px rgba(37,99,235,0.18)`): a tinted 1px shadow under primary CTAs. Hints at the accent beneath the button rather than general elevation.

### Named Rules
**The Flat-On-Paper Rule.** The default surface is flat. The rail, the empty slot, the status line, inputs — none carry shadows. Elevation is awarded only to things that genuinely float: the dialog, the selected toggle pill, the focused CTA.

**The Hairline Rule.** Separation uses 1px `line` or 1.5px `line-strong` borders, dashed in `line-dash` only for the empty-slot and the step-dot default. Never a shadow where a hairline will do.

## Shapes

A gentle, consistent radius language: 6px for atoms inside atoms (the selected toggle pill inside its track) and for focus rings, 8px for interactive atoms (buttons, inputs, nav items, close affordance, toggle track, step dot inner), 12px reserved for medium containers, 16px for large containers (cards, dialog, empty slot), full-pill (999px) for scrollbar thumbs. No square corners anywhere.

Circles appear only in semantic roles: the step dot (24px), the status dot (6px), the empty-slot plus-icon ring (44px), the car-wheel accents in the Car icon. The brand mark is a soft-rounded ink square (`8px` radius, 28×28), a deliberate rhyme with the sm-radius language.

Dashed borders are reserved: the empty slot (1.5px dashed `line-dash`) and the empty-slot icon ring (1.5px dashed `line-dash`). Dashed signals "slot waiting to be filled" — never used for decoration or division.

### Named Rules
**The Dashed-Means-Empty Rule.** Dashed strokes mean "a thing goes here that is not here yet." They never divide, decorate, or group. When the slot is filled, it becomes a solid card.

## Components

### Buttons
- **Shape:** 8px radius (`--r-sm`) across all variants.
- **Primary** (`backgroundColor: #2563eb`, `textColor: #ffffff`, padding `10px 16px`, 600 weight, 14px, 8px icon-to-label gap, 16×16 inline icon): fills the single "do this next" slot. Carries a 1px tinted blue lift shadow. Hover → `#1d4ed8`. Active → `translateY(1px)`. Disabled → `line-strong` fill, white text, no shadow, not-allowed cursor.
- **Ghost** (text in `body`, padding `10px 16px`, 500 weight): secondary dialog actions ("Отмена"). Hover → `line`-tinted background (`color-mix 60%`), `ink` text. No border at rest.
- **Close** (32×32, `muted` icon, 8px radius): dialog close affordance. Hover → `line`-tinted background, `ink` icon.
- **Transitions:** 120ms ease on background and transform.

### Inputs / Fields
- **Text input & select** (height 42px, 12px horizontal padding, 1px `line-strong` border, 8px radius, `card` background, 14px body type, -0.005em tracking): the default field.
- **Placeholder:** `faint`.
- **Focus:** border shifts to `accent`; 3px soft accent glow (`color-mix(accent 15%, transparent)`) outside the border. No default browser outline.
- **Invalid:** border shifts to `danger`; 3px soft `danger` glow (`color-mix 12%`). Inline error (`font-size: 12px`, `color: danger`, `font-weight: 500`) placed directly under the field, wired via `aria-describedby`.
- **Select:** authored CSS-gradient chevron at the right edge (two 4×4 linear gradients forming a muted downward caret). Never a native OS triangle.
- **Hint:** 12px `muted` text under the field, replaced by the error when invalid.
- **Label:** 13px, 500 weight, `ink`. Optional fields append a 12px `faint` "опционально" tag inside the label row.

### Units Toggle (signature atom)
A pill-grouped radio: 42px tall track in `line`-tinted translucent background with 3px internal padding, two flex-equal buttons with 6px inner radius. Selected button rises to `card` background with `shadow-sm` and 600 weight. Semantics are proper `role="radiogroup"` + `role="radio"` + `aria-checked`.

### Navigation (left rail)
- **Style:** vertical list, 2px gap between items, 8×10px padding, 8px radius, 18×18px icon slot.
- **Default:** `body` text, `muted` icon.
- **Hover:** `line`-tinted background (`color-mix 60%`), `ink` text.
- **Active** (`aria-current="page"`): `accent-soft` background, `accent` text and icon.
- **Not built yet** (`aria-disabled="true"`, tooltip "В разработке"): `faint` text and icon, no hover wash, default cursor. No "скоро" tag — the rail stays narrow.
- **Brand lockup:** 28×28 ink-filled rounded square carrying a lowercase "c" at 700/15px, paired with a two-line name/subtitle. Rail-foot carries a mono micro version chip in `muted` (AA on card).
- **Mobile top bar:** reduced brand (mark + single-line name at 13px) and a compact primary CTA. 12×16px padding, bottom hairline.

### Cards / Empty Slot
- **Corner Style:** 16px radius (`--r-lg`).
- **Default empty slot** (dashed 1.5px `line-dash`, transparent background, 36×24px padding, 240px min-height, flex-column center): the signature pre-car cell. Contains a 44px dashed-ring plus-icon, a 16px subtitle, and a 13px `muted` descriptor.
- **Hover:** border → `accent`, background → `accent-soft`, plus-icon ring fills with `accent` and inverts its icon to white. Transitions 160ms ease across border, background, and transform.
- **Active:** `translateY(1px)`.

### Dialog
- **Shape:** 16px radius, `card-raised` background, 28×32×24px padding, max-width 560px, max-height `calc(100vh - 48px)` with internal scroll.
- **Scrim:** `--overlay` (`rgba(15,23,42,0.42)`) covering the viewport. Clicking the scrim closes with dirty-confirmation.
- **Entrance:** scrim fades in 180ms; dialog translates up 8px + scales from 0.985 in 220ms, cubic-bezier(0.2, 0.9, 0.2, 1).
- **Dismiss:** Esc, close button, or scrim click. Dirty state (any field touched or units moved off `km`) triggers a native confirm before close.
- **Focus:** first field focused on open; Tab is trapped within the dialog; previous focus is restored on close.
- **Mobile ≤560px:** becomes a bottom sheet (top-only 16px radius, 90vh max, 20×20×16px padding), form rows collapse to single column, step list shows only the active step with a mono "· шаг 1 из 2" counter.

### Status Pill
Pill-shaped (999px), 11px/500 at `sm` (2×8px padding) and 12px at `md` (3×10px), with a 6px dot. The wash is the state color at 12–18% over card, text in the matching deep ink; unknown is a 60% `line` wash with `body` text and a `line-dash` dot. Copy is fixed per state: В норме · Требует внимания / Низкий ресурс · Критично / Просрочено · Нет данных.

### System Ledger (signature)
One card (16px radius, `line` hairline) holding one row per system, separated by hairlines — never a grid of system cards. A row is a full-width button (`aria-expanded`): 36px neutral icon disc (state is already in the bar and the pill), name (14px/600) over a count line that words the spread ("6 компонентов · 1 критично · 1 без данных"), the system pill, and a 16px chevron that rotates 180° in 160ms. Rows collapse by default; open rows are remembered per car. System rows and component rows share their right-hand tracks (system: pill 128px | chevron 16px; component: resource 196px | pill 128px | 16px spacer, 14px gaps), so every pill in the ledger starts on one vertical line. The resource cell is a stack: a full-width bar on top (fixed start and width in every row, an empty grey track when there is no data), and under it, left-aligned to the bar, the percent in mono and the words: "ещё 4 284 км", or the overrun in `danger-ink` ("+84 000 км сверх ресурса"), or "нет данных для расчёта". Text of any length extends under the bar and never moves it. The second line under the name is only "установлено на …"; pills are left-aligned in their track. the whole row is a button that opens the component sheet. Jump targets flash `accent-soft` for 1.4s.

### Car Stage
The illustration's viewBox is cropped to the drawn car (22px pad), so the car fills its column at any width. Badges pulse three times on arrival and then hold (none under reduced motion). Under the car, a row of small pill chips names every system that needs attention, worst first, including "Прочее", which has no zone; hovering or focusing a chip lights its zone, clicking it opens the system. The SVG is a `role="group"`; each zone announces "Система: состояние".

### Attention List
Lives in the stage under the mileage. Title "Требует внимания" with a mono count chip, then up to 5 rows (critical before attention, lowest resource first) and "Показать ещё N". Each row: name, "система · остаток" in 12px `muted`, pill on the right; clicking opens the system and flashes the component. When nothing is due: one `muted` line, no illustration.

### Component Sheet
Right-hand sheet (bottom sheet on phones), `card-raised`, Shadow Lg, 24×28px padding, sections divided by hairlines: status + one-line remainder, the Figure percentage beside an 8px bar with the caption that this is a forecast, a facts list (Установлено / Ресурс / Прошло, 96px label column), an inline resource form when life is missing, last inspection, history, and a sticky footer with the primary "Добавить запись" and, for replaceable parts, a ghost "Заменено сегодня" that logs a replacement at today's date and current mileage with the same life in one tap, then offers "Отменить" in its place. Life by time is entered as a number plus a unit (дн. / мес. / лет) and stored as days. Initial focus is the sheet itself, not the close button.

### Destructive Confirmation
Used for deleting a car and deleting a record. At rest: a quiet `muted` text link ("Удалить автомобиль", "Удалить запись") that turns `danger-ink` on hover. On click it becomes an inline block in place, never a second modal: a 6% danger wash with a 30% danger hairline (12px radius), a 600 title naming the object ("Удалить эту запись?"), one sentence on what else changes ("Ресурс снова будет считаться от прошлой замены…"), "Отменить это нельзя.", and two buttons, ghost "Не удалять" (focused on open, so Enter is safe) and a solid `danger-ink` button that repeats the action and its object.

### Stepper
Two step pills on a hairline rule. Each step is `[circle, label]`. The default `stepDot` is a 24px `card` circle with a 1.5px `line-strong` border and a mono numeral in `muted`. The active step: numeral and dot invert to `accent-ink` on `accent`, label goes to `ink` 600. The connecting rule is a 1px `line-strong` fill between steps.

### Status Line
A hairline-separated footer composed of a 6px dot (`line-dash` default; reserved to drive to `ok`/`warn`/`danger` on populated surfaces), mono text at 12px `muted`, a bold `ink` count, and a `·` separator in `line-dash`. Hairline top border in `line`, 16px top padding.

### Icon System
Authored SVG only. Base: 24×24 viewBox, `stroke="currentColor"`, `strokeWidth: 1.75`, round joins and caps, no fills. Icons inherit the surrounding text color, so they tint through nav-item state, focus, hover, and primary-button context without per-icon rules. Default render size is 18–20px in-chrome, 16px on buttons, 22px inside the empty-slot plus ring.

### Success Card
A tinted confirmation strip inside the dialog: `color-mix(ok 10%, card)` background, `color-mix(ok 40%, line)` 1px border, 8px radius, 10×14px padding, 13px `ink` text, 18px `ok` check icon at the left.

## Do's and Don'ts

### Do:
- **Do** reserve `accent` for the single next action in view; respect **The One Blue Rule**.
- **Do** use Geist Mono for numbers, versions, step counters, status text — never for interface prose.
- **Do** compose with the garage grid: three columns desktop, two at narrow desktop, one on mobile. New cell surfaces live inside this geometry.
- **Do** render emptiness as a dashed slot at full card geometry; **The Dashed-Means-Empty Rule** is load-bearing.
- **Do** render focus with the `accent` 2px outline at 2–3px offset. One focus-visible treatment, system-wide.
- **Do** use 8/12/16/pill radii; everything interactive is 8px, everything containery is 16px.
- **Do** keep motion at 120–220ms with cubic-bezier(0.2, 0.9, 0.2, 1), triggered by state, not by load.
- **Do** route depth through hairlines first, surface color second, shadow last.
- **Do** state a forecast in one honest line about the dimension that runs out first ("ещё 6 570 км", "просрочено по сроку"), never a remainder from the other dimension.
- **Do** keep the illustration on screen wherever the ledger can light its zones (**The Car-Stays-In-View Rule**).

### Don't:
- **Don't** spend state colors (`ok`, `warn`, `danger`) as decoration. They belong to pills, resource bars, zone badges and validation.
- **Don't** set `overflow: hidden` on `html`, `body`, or any ancestor of a sticky element; use `overflow-x: clip`.
- **Don't** stack expanded system cards in masonry columns; the ledger is one card with collapsible rows.
- **Don't** introduce a second accent hue or a gradient on primary surfaces.
- **Don't** use icon fonts, emoji, or third-party icon packs. All icons are the authored 24-grid 1.75-stroke SVG set in `components/icons.tsx`.
- **Don't** elevate flat surfaces with shadow where a hairline suffices; respect **The Flat-On-Paper Rule**.
- **Don't** use dashed borders for division, decoration, or grouping — only for empty slots.
- **Don't** hardcode car makes, models, or system taxonomies in UI copy or structure; the world is universal per PRODUCT.md. The owner defines what to track.
- **Don't** add kickers, eyebrows, uppercase micro-labels, hero marketing, or display serifs. This is Operate, not marketing.
- **Don't** replace the authored CSS-gradient select chevron with a native OS caret or an icon-font glyph.

<!-- Notes on brief→build drift (shipped values are canonical):
- `--fs-md` is 16px (not 15px); subtitle role carries at 16/600.
- Dialog max-width is 560px (brief phrasing varied); bottom sheet triggers at ≤560px.
- Grid is 3-up desktop with a 2-up band at 821–1100px before collapsing to 1-up ≤820px.
- Status-dot default is `line-dash`; semantic colors (`ok`/`warn`/`danger`) are defined but intentionally not spent on the empty-garage surface.
- Not canonized: no device-specific or marketing patterns were invented; the system records only what the build reuses. -->
