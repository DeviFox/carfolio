"use client";

import s from "./car-ledger.module.css";
import StatusPill from "./status-pill";
import { PositionBadge } from "./position-picker";
import { ChevronDownIcon, PlusIcon } from "./icons";
import {
  formatKm,
  formatRatioPercent,
  resourceSummary,
  type ComponentStatus,
  type ResourceSignal,
  type StatusLabel,
} from "@/lib/compute";
import type { Component, InstalledPart, SystemCategory, VehicleSystem } from "@/lib/types";

export type ComponentRow = {
  component: Component;
  system: VehicleSystem;
  part?: InstalledPart;
  resource: ResourceSignal;
  status: ComponentStatus;
};

export type SystemGroup = {
  system: VehicleSystem;
  rows: ComponentRow[];
  label: StatusLabel;
};

export const SYSTEM_STATUS_TEXT: Record<StatusLabel, string> = {
  ok: "В норме",
  attention: "Требует внимания",
  critical: "Критично",
  unknown: "Нет данных",
};

// The system's pill speaks the same word as the parts behind it: when every
// part at the system's state says it the same way ("Просрочено"), so does
// the system. Mixed causes fall back to the generic word.
function systemStatusText(label: StatusLabel, rows: ComponentRow[]): string {
  const texts = new Set(rows.filter((r) => r.status.label === label).map((r) => r.status.text));
  return texts.size === 1 ? [...texts][0] : SYSTEM_STATUS_TEXT[label];
}

// What a collapsed system says besides its count: problems first, then gaps.
function countLine(rows: ComponentRow[]): string {
  if (rows.length === 0) return "нет компонентов";
  const n = (label: StatusLabel) => rows.filter((r) => r.status.label === label).length;
  // Overdue by the forecast and critical by an inspection are different facts.
  const overdue = rows.filter((r) => r.status.label === "critical" && r.status.reason === "computed").length;
  const critical = n("critical") - overdue;
  // Likewise "running low" by the forecast vs "needs attention" by an inspection.
  const soon = rows.filter((r) => r.status.label === "attention" && r.status.reason === "computed").length;
  const attention = n("attention") - soon;
  const unknown = n("unknown");
  // A no-break space keeps each count with its word when the line wraps.
  const nb = "\u00a0";
  return [
    `${rows.length}${nb}${plural(rows.length, "компонент", "компонента", "компонентов")}`,
    overdue ? `${overdue}${nb}просрочено` : null,
    critical ? `${critical}${nb}критично` : null,
    soon ? `${soon}${nb}скоро замена` : null,
    attention ? `${attention}${nb}${plural(attention, "требует", "требуют", "требуют")} внимания` : null,
    unknown && unknown < rows.length ? `${unknown}${nb}без данных` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

type Props = {
  groups: SystemGroup[];
  expanded: Set<string>;
  flashId: string | null;
  onToggle: (systemId: string) => void;
  onHover: (category: SystemCategory | null) => void;
  onAddComponent: (systemId: string) => void;
  onOpenComponent: (componentId: string) => void;
};

export default function SystemList({
  groups,
  expanded,
  flashId,
  onToggle,
  onHover,
  onAddComponent,
  onOpenComponent,
}: Props) {
  return (
    <ul className={s.systemList}>
      {groups.map(({ system, rows, label }) => {
        const open = expanded.has(system.id);
        return (
          <li
            key={system.id}
            id={`system-${system.id}`}
            className={`${s.system} ${flashId === system.id ? s.flash : ""}`}
            onMouseEnter={() => onHover(system.category)}
            onMouseLeave={() => onHover(null)}
          >
            <h3 className={s.systemHeading}>
              <button
                type="button"
                className={s.systemHead}
                aria-expanded={open}
                aria-controls={`system-body-${system.id}`}
                onClick={() => onToggle(system.id)}
                onFocus={() => onHover(system.category)}
                onBlur={() => onHover(null)}
              >
                <span className={s.systemIcon}>
                  {systemIcon(system.category)}
                </span>
                <span className={s.systemTitle}>
                  <span className={s.systemName}>{system.name}</span>
                  <span className={`${s.systemCount} numeric`}>{countLine(rows)}</span>
                </span>
                <span className={s.pillCell}>
                  <StatusPill label={label} text={systemStatusText(label, rows)} size="sm" />
                </span>
                <ChevronDownIcon className={s.chevron} />
              </button>
            </h3>

            {open ? (
              <div id={`system-body-${system.id}`} className={s.systemBody}>
                {rows.length > 0 ? (
                  <ul className={s.compList}>
                    {rows.map((row) => (
                      <ComponentLine
                        key={row.component.id}
                        row={row}
                        flash={flashId === row.component.id}
                        onOpen={() => onOpenComponent(row.component.id)}
                      />
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className={rows.length === 0 ? s.addSlot : s.addLink}
                  onClick={() => onAddComponent(system.id)}
                >
                  <PlusIcon />
                  <span>Добавить компонент</span>
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ComponentLine({
  row,
  flash,
  onOpen,
}: {
  row: ComponentRow;
  flash: boolean;
  onOpen: () => void;
}) {
  const { component, part, resource, status } = row;
  // Everything about the resource sits under its bar; the bar itself has a
  // fixed width and start, so text of any length never moves it.
  const summary =
    resourceSummary(resource) ??
    (resource.kind === "unknown" && resource.reason === "no_expected_life"
      ? "срок службы не задан"
      : "нет данных для расчёта");
  const over = resource.kind === "known" && resource.overdue;
  const installed =
    part?.installedAtMileageKm !== undefined
      ? `установлено на ${formatKm(part.installedAtMileageKm)}`
      : null;
  return (
    <li id={`component-${component.id}`} className={s.compItem}>
      <button type="button" className={`${s.compRow} ${flash ? s.flash : ""}`} onClick={onOpen}>
      <div className={s.compMain}>
        <div className={s.compName}>
          {component.name}
          <PositionBadge value={component} />
        </div>
        {installed ? <div className={`${s.compMeta} numeric`}>{installed}</div> : null}
      </div>
      <div className={s.resource}>
        {/* Past the life the bar is not empty (that's "no data") but used up
            and then some: a full hatched danger track, and no "0%". */}
        <div className={`${s.resourceBar} ${over ? s.resourceOver : ""}`} aria-hidden="true">
          {resource.kind === "known" && !over ? (
            <div
              className={`${s.resourceFill} ${s[`rf-${status.label}`]}`}
              style={{ width: `${Math.round(resource.ratio * 100)}%` }}
            />
          ) : null}
        </div>
        <div className={`${s.resourceText} numeric`}>
          {resource.kind === "known" && !over ? (
            <span className={`${s.resourcePct} mono`}>{formatRatioPercent(resource.ratio)}</span>
          ) : null}
          <span className={over ? s.metaOver : undefined}>{summary}</span>
        </div>
      </div>
      <div className={s.compPill}>
        <StatusPill label={status.label} text={status.text} size="sm" />
      </div>
      </button>
    </li>
  );
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function systemIcon(category: string) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (category) {
    case "engine":
      return (
        <svg {...common}>
          <rect x="4" y="8" width="16" height="10" rx="1.5" />
          <path d="M8 8V5h8v3" />
          <path d="M4 12h2M18 12h2" />
          <path d="M9 14h6" />
        </svg>
      );
    case "brakes":
      // Disc with its hub, and the caliper clamping the disc's edge.
      return (
        <svg {...common}>
          <path d="M15.5 6.2A7.5 7.5 0 1 0 15.5 17.8" />
          <circle cx="10.75" cy="12" r="2.5" />
          <rect x="15" y="6.5" width="5" height="11" rx="2.5" />
        </svg>
      );
    case "tires":
      // Tyre with its rim and tread blocks around the outside.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </svg>
      );
    case "suspension":
      return (
        <svg {...common}>
          <path d="M6 4v6l3 2v6M18 4v6l-3 2v6" />
          <path d="M4 10h4M16 10h4" />
        </svg>
      );
    case "transmission":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
          <path d="M6 6l2 2M18 18l-2-2M18 6l-2 2M6 18l2-2" />
        </svg>
      );
    case "cooling":
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "electrical":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
