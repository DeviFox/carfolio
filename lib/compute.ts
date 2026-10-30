import type {
  Component,
  ComponentInspection,
  Condition,
  InstalledPart,
  MaintenanceEvent,
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

  if (haveKm) {
    const Minstall = part.installedAtMileageKm!;
    const L = part.expectedLifeKm!;
    const Mnow = vehicle.currentMileageKm;
    const driven = Math.max(0, Mnow - Minstall);
    drivenKm = driven;
    const r = Math.max(0, 1 - driven / L);
    ratios.push(r);
    remainingKm = Math.max(0, L - driven);
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

export function sortEventsByDateDesc(events: MaintenanceEvent[]): MaintenanceEvent[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date));
}

export function sortComponentsByName(components: Component[]): Component[] {
  return [...components].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function assertNewerMileage(
  nextMileageKm: number,
  lastConfirmedMileageKm: number,
): string | null {
  if (!Number.isFinite(nextMileageKm) || nextMileageKm < 0) {
    return "Пробег должен быть неотрицательным числом.";
  }
  if (nextMileageKm < lastConfirmedMileageKm) {
    return `Новый пробег ниже последнего подтверждённого (${lastConfirmedMileageKm.toLocaleString("ru-RU")} км).`;
  }
  return null;
}
