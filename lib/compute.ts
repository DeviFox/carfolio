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

export type ResourceSignal =
  | { kind: "unknown"; reason: "no_install_mileage" | "no_expected_life" | "no_part" }
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

  const haveKm =
    typeof part.installedAtMileageKm === "number" &&
    typeof part.expectedLifeKm === "number";
  const haveDays =
    typeof part.installedAtDate === "string" &&
    typeof part.expectedLifeDays === "number";

  if (!haveKm && !haveDays) {
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
    const Mnow = vehicle.currentMileageKm;
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
    return { label: "unknown", text: "Нет данных", reason: "no_data" };
  }

  if (resource.overdue) {
    return { label: "critical", text: "Просрочено", reason: "computed" };
  }
  if (resource.ratio < 0.2) {
    return { label: "attention", text: "Низкий ресурс", reason: "computed" };
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

export function formatDuration(days: number): string {
  if (days < 60) return `${days} дн.`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months} мес.`;
  return `${(Math.round((days / 365.25) * 10) / 10).toLocaleString("ru-RU")} г.`;
}

// One honest line about the dimension (mileage or time) that runs out first.
export function resourceSummary(
  resource: ResourceSignal,
  units: Vehicle["units"] = "km",
): string | null {
  if (resource.kind !== "known") return null;
  // Past the life: say by how much (the pill already says "Просрочено").
  if (resource.overKm !== undefined && resource.overKm > 0) {
    return `+${formatKm(resource.overKm, units)} сверх ресурса`;
  }
  if (resource.overDays !== undefined && resource.overDays > 0) {
    return `+${formatDuration(resource.overDays)} сверх срока`;
  }
  if (resource.overKm === 0 || resource.overDays === 0) return "ресурс исчерпан";
  const share = (left?: number, used?: number) =>
    left !== undefined && used !== undefined ? left / (left + used) : Infinity;
  const kmShare = share(resource.remainingKm, resource.drivenKm);
  const daysShare = share(resource.remainingDays, resource.elapsedDays);
  return kmShare <= daysShare
    ? `ещё ${formatKm(resource.remainingKm!, units)}`
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

export function findComponentByName(
  components: Component[],
  name: string,
  systemId?: string,
): Component | undefined {
  const needle = name.trim().toLocaleLowerCase("ru");
  if (!needle) return undefined;
  return components.find(
    (c) =>
      !c.isArchived &&
      (systemId === undefined || c.systemId === systemId) &&
      c.name.trim().toLocaleLowerCase("ru") === needle,
  );
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

export function formatKm(n: number, units: Vehicle["units"] = "km"): string {
  const unit = units === "km" ? "км" : "миль";
  return `${n.toLocaleString("ru-RU")} ${unit}`;
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
  inspection: "Осмотр",
  repair: "Ремонт",
  fluid_service: "Долив жидкости",
  observation: "Заметка",
};

export function sortEventsByDateDesc(events: MaintenanceEvent[]): MaintenanceEvent[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date));
}

export function sortComponentsByName(components: Component[]): Component[] {
  return [...components].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function assertNewerMileage(
  nextMileageKm: number,
  lastConfirmedMileageKm: number,
  units: Vehicle["units"] = "km",
): string | null {
  if (!Number.isFinite(nextMileageKm) || nextMileageKm < 0) {
    return "Введите пробег цифрами.";
  }
  if (nextMileageKm < lastConfirmedMileageKm) {
    return `Новый пробег меньше текущего (${formatKm(lastConfirmedMileageKm, units)}). Пробег не может уменьшаться.`;
  }
  return null;
}
