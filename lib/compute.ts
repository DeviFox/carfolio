import type {
  Component,
  ComponentInspection,
  Condition,
  InstalledPart,
  MaintenanceEvent,
  MaintenanceType,
  SystemCategory,
  Vehicle,
  VehicleSystem,
} from "./types";
import { AXLE_LABEL, SIDE_LABEL } from "./types";

export type ResourceSignal =
  | { kind: "unknown"; reason: "no_install_mileage" | "no_expected_life" | "no_part" | "no_current_mileage" }
  | {
      kind: "known";
      ratio: number;
      remainingKm?: number;
      remainingDays?: number;
      drivenKm?: number;
      elapsedDays?: number;
      // How far past the life it is, per dimension (0 = exactly used up).
      overKm?: number;
      overDays?: number;
      overdue: boolean;
    };

export function computeResource(
  part: InstalledPart | undefined,
  vehicle: Vehicle,
  nowDate: Date = new Date(),
): ResourceSignal {
  if (!part) return { kind: "unknown", reason: "no_part" };

  const partHasKm =
    typeof part.installedAtMileageKm === "number" &&
    typeof part.expectedLifeKm === "number";
  // Mileage-based life needs the car's current mileage too.
  const haveKm = partHasKm && typeof vehicle.currentMileageKm === "number";
  const haveDays =
    typeof part.installedAtDate === "string" &&
    typeof part.expectedLifeDays === "number";

  if (!haveKm && !haveDays) {
    if (partHasKm) return { kind: "unknown", reason: "no_current_mileage" };
    return {
      kind: "unknown",
      reason: !part.installedAtMileageKm && !part.installedAtDate
        ? "no_install_mileage"
        : "no_expected_life",
    };
  }

  const ratios: number[] = [];
  let remainingKm: number | undefined;
  let remainingDays: number | undefined;
  let drivenKm: number | undefined;
  let elapsedDays: number | undefined;
  let overKm: number | undefined;
  let overDays: number | undefined;

  if (haveKm) {
    const Minstall = part.installedAtMileageKm!;
    const L = part.expectedLifeKm!;
    const Mnow = vehicle.currentMileageKm!;
    const driven = Math.max(0, Mnow - Minstall);
    drivenKm = driven;
    const r = Math.max(0, 1 - driven / L);
    ratios.push(r);
    remainingKm = Math.max(0, L - driven);
    if (driven >= L) overKm = driven - L;
  }

  if (haveDays) {
    const installDate = new Date(part.installedAtDate!);
    const msPerDay = 1000 * 60 * 60 * 24;
    const elapsed = Math.max(
      0,
      Math.floor((nowDate.getTime() - installDate.getTime()) / msPerDay),
    );
    elapsedDays = elapsed;
    const Ld = part.expectedLifeDays!;
    const r = Math.max(0, 1 - elapsed / Ld);
    ratios.push(r);
    remainingDays = Math.max(0, Ld - elapsed);
    if (elapsed >= Ld) overDays = elapsed - Ld;
  }

  const ratio = Math.min(...ratios);
  const overdue = ratio === 0;

  return {
    kind: "known",
    ratio,
    remainingKm,
    remainingDays,
    drivenKm,
    elapsedDays,
    overKm,
    overDays,
    overdue,
  };
}

export type ComponentStatus = {
  label: "ok" | "attention" | "critical" | "unknown";
  text: string;
  reason: "computed" | "inspected" | "no_data";
};

export function statusFromCondition(condition: Condition): ComponentStatus | null {
  switch (condition) {
    case "good":
      return { label: "ok", text: "В норме", reason: "inspected" };
    case "worn":
      return { label: "attention", text: "Требует внимания", reason: "inspected" };
    case "critical":
      return { label: "critical", text: "Критично", reason: "inspected" };
    case "unknown":
      return null;
  }
}

export function componentStatus(
  resource: ResourceSignal,
  latestInspection?: ComponentInspection,
): ComponentStatus {
  if (latestInspection) {
    const fromInspection = statusFromCondition(latestInspection.condition);
    if (fromInspection) return fromInspection;
  }

  if (resource.kind === "unknown") {
    // Not set is the owner's choice, not missing data: say which it is.
    const text = resource.reason === "no_expected_life" ? "Срок не задан" : "Нет данных";
    return { label: "unknown", text, reason: "no_data" };
  }

  if (resource.overdue) {
    return { label: "critical", text: "Просрочено", reason: "computed" };
  }
  if (resource.ratio < 0.2) {
    return { label: "attention", text: "Скоро замена", reason: "computed" };
  }
  return { label: "ok", text: "В норме", reason: "computed" };
}

export type StatusLabel = ComponentStatus["label"];

const ROLLUP_ORDER: Record<StatusLabel, number> = {
  unknown: 0,
  ok: 1,
  attention: 2,
  critical: 3,
};

// Worst known state wins; "unknown" only when nothing in the group is known.
export function rollupStatus(labels: StatusLabel[]): StatusLabel {
  return labels.reduce<StatusLabel>(
    (worst, l) => (ROLLUP_ORDER[l] > ROLLUP_ORDER[worst] ? l : worst),
    "unknown",
  );
}

// One car's state for the garage card: the worst known status, the parts that
// need attention (worst first) and how many parts are tracked at all.
export type VehicleHealth = {
  label: StatusLabel;
  flagged: string[];
  known: number;
  total: number;
};

export function vehicleHealth(
  vehicle: Vehicle,
  components: Component[],
  installedParts: InstalledPart[],
  inspections: ComponentInspection[],
  nowDate: Date = new Date(),
): VehicleHealth {
  const rows = components
    .filter((c) => c.vehicleId === vehicle.id && !c.isArchived)
    .map((c) => {
      const resource = computeResource(findActiveInstalledPart(c.id, installedParts), vehicle, nowDate);
      return { name: c.name, label: componentStatus(resource, latestInspectionFor(c.id, inspections)).label };
    });
  const flagged = rows
    .filter((r) => r.label === "critical" || r.label === "attention")
    .sort((a, b) => ROLLUP_ORDER[b.label] - ROLLUP_ORDER[a.label])
    .map((r) => r.name);
  return {
    label: rollupStatus(rows.map((r) => r.label)),
    flagged,
    known: rows.filter((r) => r.label !== "unknown").length,
    total: rows.length,
  };
}

export function formatDuration(days: number): string {
  if (days < 60) return `${days} дн.`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months} мес.`;
  return `${(Math.round((days / 365.25) * 10) / 10).toLocaleString("ru-RU")} г.`;
}

// One honest line about the dimension (mileage or time) that runs out first.
export function resourceSummary(
  resource: ResourceSignal,
): string | null {
  if (resource.kind !== "known") return null;
  // Past the life: say by how much (the pill already says "Просрочено").
  if (resource.overKm !== undefined && resource.overKm > 0) {
    return `+${formatKm(resource.overKm)} сверх срока`;
  }
  if (resource.overDays !== undefined && resource.overDays > 0) {
    return `+${formatDuration(resource.overDays)} сверх срока`;
  }
  if (resource.overKm === 0 || resource.overDays === 0) return "пора менять";
  const share = (left?: number, used?: number) =>
    left !== undefined && used !== undefined ? left / (left + used) : Infinity;
  const kmShare = share(resource.remainingKm, resource.drivenKm);
  const daysShare = share(resource.remainingDays, resource.elapsedDays);
  return kmShare <= daysShare
    ? `ещё ${formatKm(resource.remainingKm!)}`
    : `ещё ${formatDuration(resource.remainingDays!)}`;
}

// "сегодня", "вчера", "3 дня назад", "2 мес. назад" — for how fresh a reading is.
export function formatAgo(iso: string, nowDate: Date = new Date()): string {
  const day = 1000 * 60 * 60 * 24;
  const days = Math.max(0, Math.floor((nowDate.getTime() - new Date(iso).getTime()) / day));
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 60) {
    const n1 = days % 10, n100 = days % 100;
    const word = n100 > 10 && n100 < 20 ? "дней" : n1 === 1 ? "день" : n1 > 1 && n1 < 5 ? "дня" : "дней";
    return `${days} ${word} назад`;
  }
  return `${formatDuration(days)} назад`;
}

export function findActiveInstalledPart(
  componentId: string,
  parts: InstalledPart[],
): InstalledPart | undefined {
  const active = parts
    .filter(
      (p) =>
        p.componentId === componentId && !p.removedAtDate && !p.removedAtMileageKm,
    )
    .sort((a, b) => {
      const am = a.installedAtMileageKm ?? 0;
      const bm = b.installedAtMileageKm ?? 0;
      if (bm !== am) return bm - am;
      const ad = a.installedAtDate ?? "";
      const bd = b.installedAtDate ?? "";
      return bd.localeCompare(ad);
    });
  return active[0];
}

// Same name in the same place: "Ступица" front-left and front-right are two
// different components.
export function findComponentByName(
  components: Component[],
  name: string,
  systemId?: string,
  position: ComponentPosition = {},
): Component | undefined {
  const needle = name.trim().toLocaleLowerCase("ru");
  if (!needle) return undefined;
  return components.find(
    (c) =>
      !c.isArchived &&
      (systemId === undefined || c.systemId === systemId) &&
      c.axle === position.axle &&
      c.side === position.side &&
      c.name.trim().toLocaleLowerCase("ru") === needle,
  );
}

export type ComponentPosition = Pick<Component, "axle" | "side">;

// "Перед · Лев", or "" when the position is not set.
export function positionLabel(c: ComponentPosition): string {
  return [c.axle && AXLE_LABEL[c.axle], c.side && SIDE_LABEL[c.side]].filter(Boolean).join(" · ");
}

// A name that tells same-named components apart, for selects and titles.
export function componentLabel(c: Component): string {
  const pos = positionLabel(c);
  return pos ? `${c.name} (${pos.toLocaleLowerCase("ru")})` : c.name;
}

// Exact category first, then "Прочее", then whatever the car has.
export function systemForCategory(
  systems: VehicleSystem[],
  category: SystemCategory,
): VehicleSystem | undefined {
  return (
    systems.find((x) => x.category === category) ??
    systems.find((x) => x.category === "other") ??
    systems[0]
  );
}

export function latestInspectionFor(
  componentId: string,
  inspections: ComponentInspection[],
): ComponentInspection | undefined {
  return inspections
    .filter((i) => i.componentId === componentId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function formatKm(n: number): string {
  return `${n.toLocaleString("ru-RU")} км`;
}

export function formatRatioPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

const CURRENCY_SIGN: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€", KZT: "₸", UAH: "₴", BYN: "Br" };

export function formatMoney(minorUnits: number, currency?: string): string {
  const amount = (minorUnits / 100).toLocaleString("ru-RU");
  return currency ? `${amount} ${CURRENCY_SIGN[currency] ?? currency}` : amount;
}

export const EVENT_TYPE_LABEL: Record<MaintenanceType, string> = {
  replacement: "Замена",
  purchase: "Покупка",
  inspection: "Осмотр",
  repair: "Ремонт",
  fluid_service: "Долив жидкости",
  observation: "Заметка",
};

export function sortEventsByDateDesc(events: MaintenanceEvent[]): MaintenanceEvent[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date));
}

// Same-named components keep a fixed order: front before rear, left before right.
const AXLE_ORDER = { front: 1, rear: 2 } as const;
const SIDE_ORDER = { left: 1, right: 2 } as const;

export function sortComponentsByName(components: Component[]): Component[] {
  return [...components].sort(
    (a, b) =>
      a.name.localeCompare(b.name, "ru") ||
      (a.axle ? AXLE_ORDER[a.axle] : 0) - (b.axle ? AXLE_ORDER[b.axle] : 0) ||
      (a.side ? SIDE_ORDER[a.side] : 0) - (b.side ? SIDE_ORDER[b.side] : 0),
  );
}

export function assertNewerMileage(
  nextMileageKm: number,
  lastConfirmedMileageKm: number | undefined,
): string | null {
  if (!Number.isFinite(nextMileageKm) || nextMileageKm < 0) {
    return "Введите пробег цифрами.";
  }
  if (lastConfirmedMileageKm !== undefined && nextMileageKm < lastConfirmedMileageKm) {
    return `Новый пробег меньше текущего (${formatKm(lastConfirmedMileageKm)}). Пробег не может уменьшаться.`;
  }
  return null;
}
