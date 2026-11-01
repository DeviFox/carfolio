import type {
  ComponentKind,
  Condition,
  ID,
  InstalledPart,
  MaintenanceEvent,
  MaintenanceType,
  Vehicle,
} from "./types";
import { formatKm } from "./compute";

export interface AddRecordInput {
  vehicleId: ID;
  type: MaintenanceType;
  date: string;
  mileageKm?: number;
  componentId?: ID;
  // fluid: FluidSpec key when the component comes from the fluid catalog.
  newComponent?: { name: string; systemId: ID; fluid?: string };
  costMinorUnits?: number;
  currency?: string;
  notes?: string;
  // Only for replacement; undefined means the new part is not tracked.
  resource?: { expectedLifeKm?: number; expectedLifeDays?: number };
  // Only for inspection; saved as a ComponentInspection.
  condition?: Condition;
}

export type EventPatch = Pick<
  MaintenanceEvent,
  "date" | "mileageKm" | "costMinorUnits" | "currency" | "notes"
>;

export type AddRecordResult =
  | { ok: true; event: MaintenanceEvent }
  | { ok: false; error: string };

// The part a replacement retired: same component, removed when this one went in.
export function retiredBy(part: InstalledPart, parts: InstalledPart[]): InstalledPart | undefined {
  return parts.find(
    (p) =>
      p.id !== part.id &&
      p.componentId === part.componentId &&
      p.removedAtDate === part.installedAtDate &&
      p.removedAtMileageKm === part.installedAtMileageKm,
  );
}

export function kindForNewComponent(type: MaintenanceType, tracked: boolean): ComponentKind {
  switch (type) {
    case "replacement":
      return tracked ? "consumable" : "replaceable";
    case "inspection":
      return "inspectable";
    case "fluid_service":
      return "consumable";
    default:
      return "replaceable";
  }
}

// What deleting a record changes beyond the record itself, in one sentence.
export function deleteEffect(
  event: MaintenanceEvent,
  parts: InstalledPart[],
  units: Vehicle["units"],
): string | null {
  if (event.type === "inspection") return "Результат осмотра тоже удалится.";
  const part = event.installedPartId ? parts.find((p) => p.id === event.installedPartId) : undefined;
  if (!part) return null;
  const active = !part.removedAtDate && part.removedAtMileageKm === undefined;
  if (!active) return null;
  const previous = retiredBy(part, parts);
  if (!previous) return "Данных об установке не останется, ресурс перестанет считаться.";
  const when = [
    previous.installedAtDate
      ? new Date(previous.installedAtDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
      : null,
    previous.installedAtMileageKm !== undefined ? formatKm(previous.installedAtMileageKm, units) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `Ресурс снова будет считаться от прошлой замены${when ? ` (${when})` : ""}.`;
}
