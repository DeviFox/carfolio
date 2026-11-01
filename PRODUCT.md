# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (React, with API routes).

## Users

Car owners who want to track their own vehicle's history and maintenance themselves — including owners whose prior history is incomplete. The product must be useful on day one with minimal starting data, and expand its value as the owner records more over time.

Secondary audience: owners who care about a durable record of replacements, repairs, and expenses tied to a specific car.

## Product Purpose

Carvisio is a **visual garage**: a personal, cinematic view of one car at a time that doubles as the primary navigation into its maintenance history and upcoming work. It replaces spreadsheets and generic maintenance catalogs with a view of *this* car, where the car itself surfaces what is known, what is due, and what has been done.

Success: an owner opens the garage, understands the state of their car at a glance, logs new work in seconds, and trusts the reminders the app surfaces.

## Positioning

The mechanism a neighbor product could not truthfully copy is the **visual garage as the primary navigation layer**: structured maintenance data rendered through a cinematic single-car presentation rather than tables, forms, or model-specific catalogs. The data backbone is strict; the surface is editorial.

A direct consequence, and a hard product rule: the visual system is **universal**. The interface must not hardcode a specific make, model, or assumed set of components. Any car — fully known, partially known, or unusual — must render coherently.

## Operating Context

Primary scenario:

1. Add a car manually.
2. Enter current mileage.
3. Enter known past replacements and scheduled works.
4. Open the visual garage and see the state of systems based on known data.
5. Log additional work as the car is driven and maintained.
6. Receive reminders and forecasts based on user-defined intervals.

The product must stay useful at every stage of this scenario, including the first opening with only a car and a mileage recorded.

## Capabilities and Constraints

Confirmed capabilities (MVP):

- Manual multi-car entry; edit basic data per car.
- Current mileage entry + history of mileage updates with source.
- **Universal domain model** separating `Component` (logical, "oil"), `InstalledPart` (specific instance with install mileage/date and expected life), and `MaintenanceEvent` (dated event touching one or more components). Replacing a part preserves the prior `InstalledPart` in history.
- User-defined `VehicleSystem` groupings (engine, brakes, etc.) — editable and archivable, with user-added custom systems.
- Maintenance event logging: types `replacement | inspection | repair | fluid_service | observation`. Each event carries date, mileage, affected components, cost in minor currency units + currency code, and notes.
- Resource / forecast computation: `R = max(0, 1 - (M_now - M_install) / L)` for consumables with known install mileage and expected life. Same shape for calendar-based life. Shown as a prognosis, not a measurement of physical wear.
- `ComponentInspection` with condition `good | worn | critical | unknown` — overrides computed R for status display on critical nodes.
- Visual-garage view: single-car cinematic presentation (SVG three-quarter illustration with clickable zones) that surfaces system state from recorded data.
- Reminders by mileage and/or calendar date, surfaced in-app.
- Local export + import of the full dataset (JSON) for backup.

Confirmed constraints:

- **Universal visual system.** No hardcoded makes, models, or component sets. The visual garage must render coherently for any car with any subset of recorded data.
- **Useful with minimal data.** The product must not require a complete service history to be valuable; a car + mileage must already render a meaningful garage.
- **User-defined intervals.** The app does not ship a manufacturer service-schedule catalog. The owner specifies which components to track and their intervals.
- **Unknown is a first-class state.** Where data is missing, show "Нет данных" — never a fabricated %. The product never displays an overall "car health score" because the data model does not support one.
- **Inspection outranks computation.** A recorded `ComponentInspection` with condition `worn` or `critical` overrides the computed R in the status pill.
- **Money** stored as `costMinorUnits: integer` + `currency: string` (ISO 4217). No float math on currency.
- **Archive, not delete** for components that have events attached. Hard delete only for unused.
- **Schema versioned** stored payload (`schemaVersion`). Migrations required for breaking data changes.

Resolved for MVP:

- **Deployment scope:** local-first, no accounts. All data lives in the browser (localStorage for MVP, IndexedDB/Dexie planned for v2 when photos/receipts enter scope). Cloud sync deferred past MVP.
- **Intervals:** per-InstalledPart, user-entered. No shipped catalog, no hybrid defaults.
- **Reminders:** in-app only for MVP; web push deferred.

Explicitly NOT in MVP (per spec, do not fabricate):

- Photos, videos, uploaded receipts.
- VIN decoding, parts catalog lookup.
- OBD-II, telemetry, automatic data collection.
- AI diagnosis, price catalog, supplier directory.
- 3D model, wear animation, native apps.
- Multi-user accounts, sharing, cloud sync.

## Brand Commitments

- **Name:** carvisio.
- **Visual direction (standing preference):** the category-standard clean SaaS, played straight. No ironic treatment, no smuggled quirk. Taken by the owner as the canon exit on the first visual-direction round (2026-10-27).
- **Craft bar:** Linear, Vercel (Rauno-style dashboards), Apple Health / Fitness. The finished build is judged against the finish, typographic discipline, state-system clarity, and empty-state treatment these products ship. "Fine for a SaaS tool" is below the bar; "indistinguishable from Linear-tier dashboards" is at it.
- **User-pinned reference:** an owner-provided reference image (chat attachment, 2026-10-27) sets the compositional baseline — left sidebar nav; content area with header + card list; colored progress rings for per-system state (used on single-car view, not on empty garage); modal-based "Добавить автомобиль" flow with a 2-step indicator "Основные данные / Дополнительно". The reference uses placeholder brand "AutoGlow"; the real brand stays carvisio.
- **Open: display face and primary accent.** Not pinned. Default working picks: Geist / Inter for UI type, project blue for primary accent. Replaceable without renegotiating the direction.
- No logos, voice guide, or binding factual claims have been provided yet. Do not fabricate dealer names, service stations, testimonials, prices, or customer logos.

## Evidence on Hand

None recorded yet. There is no existing content, imagery, dataset, testimonials, or demo car to draw from. Future work must not fabricate car data, owner testimonials, or sample histories without the owner's input or a clearly labeled demo fixture.

## Product Principles

1. **The car is the index.** Navigation into history, state, and upcoming work happens through the car's visual presentation, not through tables or menus.
2. **Universal before opinionated.** Any car renders. The system never assumes a brand, model, or canonical component list.
3. **Useful with partial data.** Every view degrades gracefully when history is incomplete; the first-session owner is a first-class user, not a stub.
4. **Owner-defined truth.** The owner decides what to track and at what interval. The app reflects their definition, not a manufacturer's.
5. **Reminders earn trust by being correct.** Forecasts and due-dates come only from recorded data and user-defined intervals, never from invented defaults.

## Accessibility & Inclusion

No product-specific accessibility requirement was established in this interview. Treat as web-standard a11y expectations until a stricter requirement is recorded.