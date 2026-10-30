# MVP spec + reference inspirations — distilled notes

Source: `autoglow_mvp_specification.pdf` (2026-10-27, owner-provided), two reference mockups (light + dark variations, both AutoGlow placeholder brand).

Working brand stays **carfolio**. "AutoGlow" is the placeholder in all references — never use it in UI.

## Non-negotiable product principles (from spec)

- **Universal domain:** no hardcoded makes, models, or component sets. Owner defines what to track per car.
- **Unknown = unknown.** Never fake a health score, never show 0% or 100% for unmeasured resources.
- **Inspection outranks computation** for critical nodes. Recorded "worn" from an inspection beats a computed 70%-left.
- **Visual garage is navigation, not diagnosis.** The SVG illustration leads the user to a system; it never claims a condition the data doesn't support.

## Domain model (MVP) — critical distinction

| Concept | Means |
|---|---|
| `Vehicle` | The car itself. |
| `VehicleSystem` | A logical grouping (engine, brakes, tires, etc.). User-editable, archivable, custom additions allowed. |
| `Component` | A **logical** part the user tracks (e.g. "Engine oil", "Front brake pads"). Lives inside a system. Has `kind: consumable | replaceable | inspectable`. |
| `InstalledPart` | A **specific instance** of a component installed at a specific mileage/date, with its own expected life. When replaced, the previous InstalledPart stays in history. |
| `MaintenanceEvent` | A dated event. `type: replacement | inspection | repair | fluid_service | observation`. Touches zero-or-more components. Carries cost + currency + notes. |
| `MileageEntry` | A dated mileage reading with source. History of odometer updates. |
| `ComponentInspection` | A `condition: good | worn | critical | unknown` reading on a specific date/mileage. |
| `MaintenanceReminder` | A task: due at mileage and/or date, with priority and status. |

**Design implication:** When the UI shows "replace oil at 15 000 km", that's an InstalledPart's `installedAtMileageKm + expectedLifeKm`, not the Component's property. The Component is "oil" (eternal). The InstalledPart is "this bottle of 5W-30 you poured in on 2024-10-12 at 78 430 km".

## Resource formula (consumables)

```
R = max(0, 1 - (M_now - M_install) / L)
```

- `M_now` — vehicle's current mileage
- `M_install` — mileage recorded when this InstalledPart was installed
- `L` — expected life (user-entered)

Same shape for calendar-based: `R_days = max(0, 1 - (days_elapsed / L_days))`. Show the lower of the two when both apply.

Rules:
- If `M_install` OR `L` is unknown → show **"Нет данных"**, never a %.
- If `R == 0` → **"Просрочено"** + reminder, never negative.
- Latest `ComponentInspection` with a critical/worn condition **overrides** the computed R in the UI's status pill.
- Validate: new mileage ≥ last confirmed mileage.

## Storage decisions (resolved this session)

- **MVP:** localStorage + typed Zustand store with `persist` middleware. Schema version lives in the stored payload.
- **v2:** migrate to IndexedDB/Dexie when photos/receipts/large histories enter scope.
- **No accounts for MVP.** Guest path only. "Данные хранятся локально, пока не подключён аккаунт" is the standing status line.
- **Export/import** required from v1 (JSON dump) — the user owns their data.
- **Money** stored as `costMinorUnits: number` (integer kopecks/cents) + `currency: string` (ISO 4217).
- **Archive, not delete.** If a component has events, offer archive. Hard delete only for unused.
- **Schema version** in the stored payload (`schemaVersion: 1`). Migration functions keyed by version.

## Scope deltas vs PRODUCT.md

Resolved by spec, update PRODUCT.md to match:
- Deployment: **local-first for MVP, cloud sync deferred**.
- Reminders: in-app + web push stays, but web push is **deferred past the vertical slice**.
- Intervals source: **user-entered** per-InstalledPart (not hybrid defaults, not catalog).
- **Not in MVP:** photos/video/receipts, VIN decoding, OBD/telemetry, AI diagnosis, pricing catalog, 3D model, sharing, accounts.

## UI patterns to adopt from both reference mockups

Despite the dark variation being provided as inspiration, direction stays **light-canon** (committed in direction contract). What we take:

- **Icon-in-tinted-plate** per system row (circle fill tinted toward the state color).
- **Status pills** on every system row ("В норме" / "Требует внимания" / "Низкий" / "Нет данных"), muted when "в норме", amber when "требует внимания", red when critical.
- **Rows, not cards** for the system list on the vehicle overview — scannable at a glance.
- **Horizontal resource bars** (not rings) for consumables lists — compact, numeric % prominent.
- **Alert banner** atop the vehicle overview when there are overdue/upcoming tasks — "2 задачи требуют внимания" with chevron.
- **"Последний просмотр"** card in the garage for multi-car owners — one-tap return.
- **Chip-based multi-component picker** in the maintenance form — one event can touch multiple components.
- **Cost + currency inline** in the event form.
- **Visible `*`** on required field labels.
- **Mobile: bottom tab bar** (persistent) — replaces our current mobile top-bar-with-single-action pattern for navigation. Add CTA uses a prominent bottom-sheet trigger.
- **Section headers** with "Все задачи →" / "Все работы →" escape-hatch links.
- **"Добавить компонент"** empty-slot pattern reused on systems view for adding user-defined components.

## First vertical slice (spec §11, confirmed by owner this session)

Build this end-to-end before adding breadth:

1. Add a vehicle (make/model/year/mileage).
2. Vehicle overview page with SVG illustration (zones: engine, brakes, tires, suspension; only engine clickable for the slice).
3. Pre-seeded or user-created "Двигатель" system.
4. User creates "Масло двигателя" component (kind: consumable).
5. User logs a replacement InstalledPart (mileage at install = e.g. 76 000, expected life L = 10 000 km).
6. User updates current mileage (e.g. to 78 430).
7. UI computes `R = max(0, 1 - (78 430 - 76 000) / 10 000) = 0.757` → "76% ресурса / замена через ≈ 7 570 км".
8. Reload the page — all persists in localStorage.

Scope cuts for the slice:
- No multiple systems — only "Двигатель" exists.
- No photos, no export.
- Mobile adaptive but not pixel-perfect yet.
- Only replacement events; inspections and repairs come after.
- No reminders UI yet — the "7 570 km until replacement" line is the signal.
