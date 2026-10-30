# Empty garage — surface brief

Scope: web, Operate, `app/page.tsx` (first visit; owner has not yet added a car) + `AddCarDialog` on step 1/2 as the primary interactive state.

Visitor mode: Operate. The owner succeeds when they add their first car; they fail when the surface asks them to admire it instead.

Audience: Russian-speaking car owner tracking their own vehicle; may have incomplete prior history; new to carfolio.

Content & proof: owner's own words (not marketing). No invented dealers, service stations, testimonials, prices. No demo car pre-filled.

Constraints: web-standard a11y (WCAG AA), Russian UI copy first-class, universal visual system (no hardcoded makes/models/component sets), useful with minimal data, keyboard-first.

Chosen direction: category-standard clean SaaS executed at the Linear / Vercel-Rauno / Apple Health craft bar; pinned by owner-provided reference image (chat attachment 2026-10-27).

Memorable moment: the empty-state slot is a dashed card that occupies **the same cell geometry** the real cars will later live in. Emptiness is not a welcome screen — it is the first empty slot of a future collection.

Unresolved decisions (builder must not invent):
- Deployment scope (SaaS vs self-hosted vs local-first) — open per PRODUCT.md; this surface works unauthenticated.
- Final primary accent blue hex (working: `#2563eb`).
- Mixed units in a multi-car garage (км/мили) — deferred.

## Direction contract

**THESIS.** The empty garage is the first empty slot of a collection, not a marketing hero. The owner meets a working tool at rest, not a sales page. The surface refuses the category-default "big illustration + feature carousel + 3-step onboarding" arrangement in favor of **one dashed slot in the real garage grid**, with the real app shell (left nav, header, grid area) rendered at full fidelity around it.

**OWN-WORLD.** Light surface `#f8fafc` with pure-white cards `#ffffff` carrying a 1px border `#e5e7eb` and a soft 2-layer shadow (0 1 2 / 0 1 3). Ink `#0f172a`; muted body `#475569`; subtle `#64748b` for metadata. Primary accent `#2563eb` reserved for the single primary CTA, the active step pip, and focus rings. State colors as semantics only: green `#10b981` (на ходу), amber `#f59e0b` (требует внимания), red `#ef4444` (просрочено) — not visible on the empty garage (no systems to color), but reserved as tokens. Type: Geist Sans for UI, Geist Mono for numeric data; type ramp 12 / 13 / 14 / 16 / 20 / 28 / 36. Radii 8 / 12 / 16. One rhythm: 4px grid, 24px card gutter, 32px main padding. Zero decorative illustration, zero gradient banners, zero skeuomorphic chrome.

**STORY.** The owner understands: this is their garage, it is empty today, and the single next action is to add their first car. They believe: this is a serious tool at a Linear/Vercel craft level. They do: click the dashed slot or the top-right CTA, land in a modal with step 1 of 2 open, enter make/model/year/mileage, pick units, press Next. On step 2 they may add optional details or save as-is.

**FIRST VIEWPORT.** 1440×900. Left rail 240px: brand lockup "carfolio" top-left; nav items Гараж (active), Автомобили, История, Настройки (medium weight, 14px). Content area starts at 240px: 32px top padding; page header row with h1 "Мой гараж" (28px/600) + subhead "Ваши автомобили и их текущее состояние" (14px muted) left; `+ Добавить авто` primary button (14px, blue, 10/16 padding, 10px radius) top-right. Below: 48px gap, then the garage grid — one dashed card centered in a 3-column CSS grid, 320×220 slot, dashed `#cbd5e1` border, centered "+" glyph (36px blue), title "Добавить автомобиль" (16/600), subtitle "Марка, модель, год, пробег — остальное появится по мере внесения работ" (13px muted, 2-line max). The slot is NOT a hero; it is the first cell. The grid shows where the next cells will go. Status row below grid: compact mono line "0 автомобилей · данные хранятся локально, пока не подключён аккаунт" (12px muted, Geist Mono). Modal rendered on top as the primary interactive state: 560×auto card, white, radius 16, shadow 0 24 48, 32px padding. Modal header: title "Добавить автомобиль" (20/600) + close "×" top-right. Step indicator below title: two pills side-by-side "1 Основные данные" (filled blue, white text) and "2 Дополнительно" (ghost, muted text), separated by a 24px tapered line. Fields in two columns on desktop: Марка / Модель, Год выпуска / Тип топлива, Двигатель (full row, optional, labeled as such), Текущий пробег (half row) / Единицы (half row — Км/Мили toggle pill-group). Field label 13/500 above a 44px input with 1px border `#cbd5e1`, radius 8, focus ring 2px blue. Hints 12px muted below the input where present. Footer row: `Отмена` ghost button left, `Далее →` primary blue button right. Keyboard: Enter advances; Esc closes with confirm-if-dirty.

**FORM.** Canon exit on the first direction round, taken by the owner over three dealt alternatives; brief and user-pinned reference image are compositional authority. Candidate position: canon (standing exit). SEED REFERENCE: seed:719bf68303f76537.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
