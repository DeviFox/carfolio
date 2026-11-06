"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./car-illustration.module.css";
import {
  buildCar,
  polyPathOf,
  VIEW_H,
  VIEW_W,
  type CarPart,
  type Zone,
} from "@/lib/iso/car";
import type { Flat } from "@/lib/iso/iso-kit";
import { RASTER_CARS, type RasterCar, type RasterZone } from "@/lib/iso/raster-cars";
import type { BodyType, SystemCategory } from "@/lib/types";

type ZoneState = "ok" | "attention" | "critical" | "unknown";

type Props = {
  bodyType?: BodyType;
  activeZone?: SystemCategory | null;
  zoneStates?: Partial<Record<SystemCategory, ZoneState>>;
  availableZones?: SystemCategory[];
  onZoneClick?: (zone: SystemCategory) => void;
};

const ZONE_LABEL: Partial<Record<SystemCategory, string>> = {
  engine: "Двигатель",
  transmission: "Трансмиссия",
  brakes: "Тормоза",
  suspension: "Подвеска",
  tires: "Шины",
  electrical: "Электрика",
  cooling: "Охлаждение",
  other: "Прочее",
};

// Room kept around the drawn car for the hover label and the badge halos.
const CROP_PAD = 22;

const FILL_CLASS: Record<string, string> = {
  paper: "iso-fill",
  face: styles.fillFace,
  "shade-0": styles.fillShade0,
  "shade-1": styles.fillShade1,
  "shade-2": styles.fillShade2,
  "shade-3": styles.fillShade3,
  top: "iso-top",
  "lit-top": styles.fillLitTop,
};

// Pointer wiring shared by the vector and the picture zones. The zones are a
// shortcut for the mouse and the finger only: keyboard and screen-reader users
// reach every system, with its state, through the ledger and the chips under
// the car, so the zones don't add a second tab stop per system.
function useZoneHandlers(onZoneClick: Props["onZoneClick"]) {
  const [hovered, setHovered] = useState<SystemCategory | null>(null);
  const handlersFor = (id: SystemCategory) =>
    onZoneClick
      ? {
          onClick: () => onZoneClick(id),
          onMouseEnter: () => setHovered(id),
          onMouseLeave: () => setHovered((h) => (h === id ? null : h)),
        }
      : {};
  return { hovered, handlersFor };
}

export default function CarIllustration(props: Props) {
  const raster = props.bodyType ? RASTER_CARS[props.bodyType] : undefined;
  return raster ? <RasterCarIllustration {...props} raster={raster} /> : <VectorCarIllustration {...props} />;
}

// A body type with a picture: the picture is an <img>, the zones are an SVG
// in the picture's own pixels, and the dots and the label are HTML on top,
// placed in percent. They keep their real size and shape at any width,
// where SVG text and circles would be stretched with the picture.
function RasterCarIllustration({
  raster,
  activeZone = null,
  zoneStates = {},
  availableZones,
  onZoneClick,
}: Props & { raster: RasterCar }) {
  const titleId = useId();
  const { hovered, handlersFor } = useZoneHandlers(onZoneClick);
  const { crop } = raster;
  const at = ([x, y]: Flat) => ({
    left: `${((x - crop.x) / crop.w) * 100}%`,
    top: `${((y - crop.y) / crop.h) * 100}%`,
  });
  const zones = (Object.entries(raster.zones) as Array<[Zone, RasterZone]>).filter(
    ([id]) => !availableZones || availableZones.includes(id),
  );
  const shown = hovered ?? activeZone;
  const label = shown && shown !== "other" ? raster.zones[shown as Zone] : undefined;

  return (
    <div
      className={`iso ${styles.raster}`}
      data-theme="light"
      style={{ "--car-ratio": `${crop.w} / ${crop.h}`, "--car-aspect": crop.w / crop.h } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer */}
      <img
        className={styles.picture}
        src={raster.src}
        alt=""
        decoding="async"
        style={{
          width: `${(raster.width / crop.w) * 100}%`,
          left: `${(-crop.x / crop.w) * 100}%`,
          top: `${(-crop.y / crop.h) * 100}%`,
        }}
      />
      <svg
        className={styles.rasterZones}
        viewBox={`${crop.x} ${crop.y} ${crop.w} ${crop.h}`}
        role="img"
        aria-labelledby={titleId}
        focusable="false"
      >
        <title id={titleId}>Ваш автомобиль</title>
        <g className={styles.zones} aria-hidden="true">
          {zones.map(([id, zone]) => (
            <path
              key={id}
              d={zone.polygons.map((poly) => polyPathOf(poly)).join(" ")}
              vectorEffect="non-scaling-stroke"
              className={[
                styles.zone,
                hovered === id ? styles.zoneHover : "",
                activeZone === id ? styles.zoneActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              {...handlersFor(id)}
            />
          ))}
        </g>
      </svg>

      <div className={styles.overlay} aria-hidden="true">
        {zones.flatMap(([id, zone]) => {
          const state = zoneStates[id];
          if (state !== "attention" && state !== "critical") return [];
          return zone.badges.map((p, i) => (
            <span key={`${id}-${i}`} className={`${styles.dot} ${styles[`dot-${state}`]}`} style={at(p)} />
          ));
        })}
        {label && shown ? (
          <span className={`${styles.chip} ${label.labelAbove ? styles.chipAbove : ""}`} style={at(label.anchor)}>
            {ZONE_LABEL[shown]}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VectorCarIllustration({
  bodyType,
  activeZone = null,
  zoneStates = {},
  availableZones,
  onZoneClick,
}: Props) {
  const titleId = useId();
  const { hovered, handlersFor } = useZoneHandlers(onZoneClick);
  const car = useMemo(() => buildCar(bodyType), [bodyType]);
  // The silhouettes are drawn on a shared canvas with generous margins; crop
  // the view to the car so it fills its column instead of floating in white.
  const carRef = useRef<SVGGElement>(null);
  const [viewBox, setViewBox] = useState(`0 0 ${VIEW_W} ${VIEW_H}`);
  useLayoutEffect(() => {
    const box = carRef.current?.getBBox();
    if (!box || box.width === 0) return;
    setViewBox(
      [box.x - CROP_PAD, box.y - CROP_PAD, box.width + CROP_PAD * 2, box.height + CROP_PAD * 2]
        .map((n) => Math.round(n))
        .join(" "),
    );
  }, [car]);

  return (
    <div className={`iso ${styles.wrap}`} data-theme="light">
      <svg
        className={`iso-svg ${styles.svg}`}
        viewBox={viewBox}
        role="img"
        aria-labelledby={titleId}
        focusable="false"
      >
        <title id={titleId}>Ваш автомобиль</title>

        <g ref={carRef} aria-hidden="true">
          {car.groups.map((group) => (
            <g key={group.key} className={styles[`g-${group.key}`]}>
              {group.parts.map((part, i) => renderPart(part, `${group.key}-${i}`))}
            </g>
          ))}
        </g>

        {/* Clickable zones (invisible until hover) */}
        <g className={styles.zones} aria-hidden="true">
          {(Object.entries(car.zones) as Array<[Zone, (typeof car.zones)[Zone]]>).map(([id, hint]) => {
            if (!hint) return null;
            const available = !availableZones || availableZones.includes(id);
            if (!available) return null;
            const isHovered = hovered === id;
            const isActive = activeZone === id;
            const cls = [
              styles.zone,
              isHovered ? styles.zoneHover : "",
              isActive ? styles.zoneActive : "",
            ]
              .filter(Boolean)
              .join(" ");
            const handlers = handlersFor(id);
            const d = hint.polygons.map((poly) => polyPathOf(poly)).join(" ");
            return (
              <path
                key={id}
                d={d}
                className={cls}
                {...handlers}
              />
            );
          })}
        </g>

        {/* Status badges — only attention/critical */}
        <g className={styles.badges}>
          {(Object.entries(car.zones) as Array<[Zone, (typeof car.zones)[Zone]]>).flatMap(([id, hint]) => {
            if (!hint) return [];
            const state = zoneStates[id];
            if (!state || state === "ok" || state === "unknown") return [];
            const points = hint.badgeCentres ?? [hint.centre];
            return points.map(([cx, cy], i) => (
              <g key={`b-${id}-${i}`} className={styles[`badge-${state}`]}>
                <circle cx={cx} cy={cy} r={10} className={styles.badgePulse} />
                <circle cx={cx} cy={cy} r={5} className={styles.badgeDot} />
              </g>
            ));
          })}
        </g>

        {/* Hover label — also surfaces when a card outside the illustration is hovered */}
        {(hovered || activeZone) ? (() => {
          const which = (hovered ?? activeZone) as SystemCategory;
          // "other" has no projected zone — it lives in a chip rail outside the SVG.
          if (which === "other") return null;
          const hint = car.zones[which as Zone];
          if (!hint) return null;
          const [cx, cy] = hint.anchor;
          const label = ZONE_LABEL[which];
          if (!label) return null;
          return (
            <g className={styles.labels}>
              <rect
                x={cx - 60}
                y={cy - 14}
                width={120}
                height={22}
                rx={11}
                className={styles.labelBg}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.label}
              >
                {label}
              </text>
            </g>
          );
        })() : null}
      </svg>
    </div>
  );
}

function renderPart(part: CarPart, key: string): React.ReactNode {
  switch (part.kind) {
    case "halo":
      return <path key={key} className="iso-halo" d={part.d} />;

    case "solid": {
      const { paths, tone = "mid", crease = "faint", lit = false } = part;
      return (
        <g
          key={key}
          className="iso-solid"
          data-lit={lit ? "" : undefined}
          data-seamless={paths.seamless ? "" : undefined}
        >
          <path className="iso-fill" d={paths.fill} />
          {paths.shades.map((d, s) =>
            d ? <path key={s} className="iso-shade" data-shade={s} d={d} /> : null,
          )}
          <path className="iso-top" d={paths.top} />
          {crease !== "none" && paths.crease ? (
            <path className="iso-line iso-crease" data-tone={crease} d={paths.crease} />
          ) : null}
          {crease !== "none" && paths.bevel ? (
            <path className="iso-line iso-bevel" data-tone={crease} d={paths.bevel} />
          ) : null}
          <path className="iso-line iso-edge" data-tone={tone} d={paths.outline} />
        </g>
      );
    }

    // case "ellipse": {
    //   const angle = part.angle ?? 0;
    //   const transform = angle ? `rotate(${angle} ${part.cx} ${part.cy})` : undefined;
    //   const fillCls = FILL_CLASS[part.fill ?? "shade-2"] ?? "";
    //   return (
    //     <ellipse
    //       key={key}
    //       cx={part.cx}
    //       cy={part.cy}
    //       rx={part.rx}
    //       ry={part.ry}
    //       transform={transform}
    //       className={fillCls}
    //     />
    //   );
    // }

    case "poly": {
      const fillCls = FILL_CLASS[part.fill] ?? "iso-fill";
      return <path key={key} className={fillCls} d={part.d} />;
    }

    case "line":
      return (
        <path
          key={key}
          className="iso-line"
          data-tone={part.tone ?? "lo"}
          data-dotted={part.dotted ? "" : undefined}
          d={part.d}
        />
      );

    case "dots":
      return (
        <g key={key} className="iso-dots" data-tone={part.tone ?? "mid"}>
          {part.points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={part.size ?? 0.6} />
          ))}
        </g>
      );

    // case "ticks":
    //   return <path key={key} className="iso-line" data-tone={part.tone ?? "lo"} d={part.d} />;

    default:
      return null;
  }
}
