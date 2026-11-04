import type {
  Axle,
  ComponentKind,
  Condition,
  ID,
  InstalledPart,
  MaintenanceEvent,
  MaintenanceType,
  Side,
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
  newComponent?: { name: string; systemId: ID; fluid?: string; axle?: Axle; side?: Side };
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

// What deleting a component takes with it, in one sentence.
export function componentDeleteEffect(componentId: ID, events: MaintenanceEvent[]): string | null {
  const own = events.filter((e) => e.componentIds.length === 1 && e.componentIds[0] === componentId).length;
  if (own === 0) return null;
  const mod10 = own % 10;
  const mod100 = own % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "запись"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "записи"
        : "записей";
  return `Вместе с ней удалится история: ${own} ${word}.`;
}

// What deleting a record changes beyond the record itself, in one sentence.
export function deleteEffect(
  event: MaintenanceEvent,
  parts: InstalledPart[],
): string | null {
  if (event.type === "inspection") return "Результат осмотра тоже удалится.";
  const part = event.installedPartId ? parts.find((p) => p.id === event.installedPartId) : undefined;
  if (!part) return null;
  const active = !part.removedAtDate && part.removedAtMileageKm === undefined;
  if (!active) return null;
  const previous = retiredBy(part, parts);
  if (!previous) return "Данных об установке не останется, срок службы перестанет считаться.";
  const when = [
    previous.installedAtDate
      ? new Date(previous.installedAtDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
      : null,
    previous.installedAtMileageKm !== undefined ? formatKm(previous.installedAtMileageKm) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `Срок службы снова будет считаться от прошлой замены${when ? ` (${when})` : ""}.`;
}
