---
target: app/car/[id]/page.tsx
total_score: 20
max_score: 36
na_heuristics: 9
p0_count: 2
p1_count: 2
target_identity: "file:/Users/olegsv/Projects/carfolio/app/car/[id]/page.tsx"
target_fingerprint: "sha256:080798937eded57ae3cdc024829f5736f66e0b6d94cf8e5152c669be03510b1a"
target_path: /Users/olegsv/Projects/carfolio/app/car/[id]/page.tsx
timestamp: 2026-10-28T12-55-26Z
slug: app-car-id-page-tsx
---
# Critique: Car Detail Page (app/car/[id]/page.tsx)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | dueAttention above hero; per-zone badges inside — status split across altitudes |
| 2 | Match Real World | 3 | 3/4-iso car win; "Прочее" ⋯ marker outside car breaks metaphor |
| 3 | User Control & Freedom | 2 | No undo on mileage; ⚙ emoji on carName (bans emoji; SettingsIcon imported but unused) |
| 4 | Consistency & Standards | 2 | Emoji vs authored icon; breadcrumb duplicates back-button; .zones/.zone CSS defined twice |
| 5 | Error Prevention | 2 | Mileage overwrites without confirm when new < stored |
| 6 | Recognition over Recall | 3 | "ещё 12 000 км" without install date forces recall |
| 7 | Flexibility & Efficiency | 1 | No keyboard shortcuts; no batch; hover-only (touch loses dialog) |
| 8 | Aesthetic & Minimalist | 3 | alertBanner inline hex #92400e; .alertDot glow on flat-on-paper surface |
| 9 | Error Recovery | n/a | Errors live inside dialogs |
| 10 | Help & Documentation | 1 | ресурс/расходник/деталь/осмотр unexplained |
| **Total** | | **20/36** | **Acceptable** |

## Design Specificity Verdict

Mostly carfolio, with one dilution. The 3/4-iso car with lit zones, hairline-split mileage, and dashed add-slot per card are genuinely singular. The two-way card↔zone dialog is a real product idea. But the systems list is a standard card list — swap labels and it reads as any dashboard. **The illustration carries the specificity; the body of the page coasts on it.**

Deterministic scan: 10 findings on live URL. 1 WARNING low-contrast on .railFoot (shell, not this surface). 8 ADVISORY low-contrast on .status-pill_unknown (#64748b on #eff1f3 = 4.2:1, needs 4.5:1). 1 WARNING overused-font Geist — FALSE POSITIVE per DESIGN.md commitment.

## Overall Impression

One brilliant moment (car + two-way dialog) on a competent-but-generic body. The illustration promises cinematic. Eight nearly identical system cards each with dashed add-slot turn the surface into a to-do list by bottom of fold. Biggest opportunity: make the illustration load-bearing — not decorative — and let the system list recede until summoned.

## What's Working

1. Per-wheel badges + annulus tires zone (lib/iso/car.ts wheelZone + badgeCentres): pulses on each wheel, clean hit targets.
2. Mileage as hairline-split sibling of illustration (.mileagePanel border-left): obeys flat-on-paper + hairline rules.
3. Hover card → highlight zone, click zone → scroll+pulse card: genuine two-way link.

## Priority Issues

### [P0] Emoji ⚙ on carName — breaks two DESIGN.md rules
What: page.tsx:227 renders ⚙ literal inside .editBtn. Why: DESIGN.md bans emoji; SettingsIcon imported on line 19 and unused. Non-Apple fallback is flat B&W cog or "medium white circle" screen reader announcement. Fix: replace with <SettingsIcon /> at 16px, inheriting currentColor. Command: /impeccable clarify.

### [P0] "Прочее" marker breaks the 3D metaphor
What: OTHER_MARKER cx:568 cy:290 r:14 — a 2D UI chip floating outside projected car. Why: surface promises 3D-rendering of systems; 2D glyph grafted onto 3D illustration — two visual languages collide, reads as bug. Fix: (a) chip rail under illustration "Не привязано к зоне", or (b) anchor marker to car part (trunk) with leader line. Command: /impeccable distill.

### [P1] Dashed "Добавить компонент" in every card turns page into a checklist
What: page.tsx:393–400 renders dashed add-slot in each system card including populated ones. Why: DESIGN.md Dashed-Means-Empty for empty slots — not persistent "add more". 8 dashed rectangles broadcast "incomplete" louder than real alert banner. Fix: when system has components, demote add to text-only "+ добавить компонент" link in systemHead right; keep dashed full-width slot only for empty systems. Command: /impeccable distill.

### [P1] One-Blue Rule bent — three blues above the fold
What: desktop hovering a card = lit zone + active rail + heroHead CTA all #2563eb. Why: DESIGN.md promotes One-Blue Rule to named principle. Rail active + heroHead CTA are persistent blues. Fix: demote heroHead CTA to ghost on desktop since top-bar + carries primary on mobile. Command: /impeccable quieter.

### [P2] Status-pill "unknown" fails AA by 0.3 (detector-confirmed)
What: 8/8 "Нет данных" pills = 4.2:1. Why: first thing every empty-system card shows. --muted on color-mix(--line 60%, transparent) drops below AA. Fix: darken .unknown text to --body (#475569) or increase pill bg opacity. Command: /impeccable polish on status-pill.

### [P2] alertBanner raw hex + alertDot glow on flat surface
What: page.module.css:83 color #92400e; :91 box-shadow glow on .alertDot. Why: DESIGN.md token discipline + Flat-On-Paper rule. Fix: --warn-ink token; drop glow halo. Command: /impeccable polish.

## Persona Red Flags

- **Alex (power user):** no keyboard shortcut for CTA; no collapse/pin on cards means scrolling past Электрика every visit; 8 dashed slots = visual noise.
- **Sam (screen reader + keyboard):** onClick on <li> with role="link" (page.tsx:188–197) is a11y antipattern — should be real <a>. Zone paths have role="button" tabIndex=0 but lack aria-pressed for active state. ⚙ emoji announced literally.
- **Riley (stress tester):** mileage input has no "lower than stored" guard; dueAttention number uncapped ("127 задач" wraps mid-flex); 40-system vehicle = 40 flat cards no virtualization.

## Minor Observations

- .zones/.zone CSS rules defined twice in components/car-illustration.module.css (lines 25–51 vs 84–111) — second overrides, dead code trap.
- useGarage((s) => ...) called 6× at top of CarPage — tuple selector would cut re-renders.
- document.getElementById + classList.add for pulse (page.tsx:149–152) is imperative DOM inside React.
- Breadcrumb "← Гараж" vs top-bar "←" aria "В гараж" — pick one word.
- .topTitle ellipsis never activates on desktop (top-bar hidden there).

## Questions to Consider

1. Is the system list even the right primary surface? What if illustration took 70% of fold and systems were flyouts from car zones?
2. Why do empty systems exist as cards at all? Could they live in a muted "ещё отслеживаю" strip at the bottom?
3. The "Прочее" marker is a smell — if design can't gracefully place a system in 3D, is "Прочее" really a system category or an escape hatch belonging elsewhere?
