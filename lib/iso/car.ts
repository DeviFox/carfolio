import {
  fitProjection,
  iso,
  pathOf,
  segment,
  sideRing,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
} from "./iso-kit";
import type { BodyType, SystemCategory } from "@/lib/types";

/* ──────────────── CAR GEOMETRY ────────────────
 *
 * Coordinate system (right-handed, world units ≈ 1 cm):
 *   x : forward direction (front at x≈0, rear at x≈L)
 *   y : across the car   (far side y=0, near side y=W)
 *   z : up               (ground z=0, roof z≈H)
 *
 * The car is one lower body (z=rocker..belt) + one raised greenhouse
 * (z=belt..shoulder) narrower than the body. Hood/trunk read as the
 * exposed top of the lower body at either end of the greenhouse.
 */

export const VIEW_W = 600;
export const VIEW_H = 320;
const AZ = 50;
const EL = 22;

// Base chassis dimensions (sedan)
const L = 460;
const W = 184;
const AXLE_FRONT = 92;
const AXLE_REAR = 360;
const WHEEL_R = 32;
const WHEEL_W = 20;
const RIM_R = 20;
const HUB_R = 5;

const ROCKER = 20;
const BELT = 72;

// y positions of wheel centres
const Y_NEAR = W - 10;        // closer side (viewer side after projection)
const Y_FAR = 10;             // far side

export type Zone = Exclude<SystemCategory, "body" | "other">;

export type CarShapes = {
  P: Projection;
  groups: CarGroup[];
  zones: Partial<Record<Zone, ZoneHint>>;
};

export type ZoneHint = {
  // One or more closed subpaths. Multiple subpaths render as a single SVG
  // <path> (so they share one hover/click handler) but are visually separate —
  // used for the wheel pair, where two circles should light up together without
  // joining into a capsule.
  polygons: Flat[][];
  centre: Flat;
  // Optional per-sub-shape anchor points for status badges. When a zone covers
  // several disjoint shapes (e.g. two wheels), a badge should sit on each shape
  // rather than at the geometric mean between them.
  badgeCentres?: Flat[];
  anchor: Flat;
};

export type CarGroup = {
  key: string;
  parts: CarPart[];
};

export type CarPart =
  | { kind: "halo"; d: string }
  | { kind: "solid"; paths: SolidPaths; tone?: Tone; crease?: Tone | "none"; lit?: boolean }
  | { kind: "poly"; d: string; fill: Fill; tone?: Tone }
  | { kind: "line"; d: string; tone?: LineTone; dotted?: boolean }
  | { kind: "dots"; points: Flat[]; size?: number; tone?: Tone };

type Tone = "hi" | "mid" | "lo" | "faint";
type LineTone = Tone | "lit";
type Fill = "paper" | "face" | "shade-0" | "shade-1" | "shade-2" | "shade-3" | "top" | "lit-top";

/* ──────────────── Body-type parameters ──────────────── */

type BodyParams = {
  // Cabin greenhouse (where the roof sits)
  cabinX0: number;   // where cabin starts (A-pillar base)
  cabinX1: number;   // where cabin ends (C-pillar base)
  cabinInset: number; // greenhouse y inset from body sides
  shoulder: number;  // top of greenhouse (roof height)
  // Trunk / cargo raise (small block behind cabin, 0 = none)
  trunkX0?: number;
  trunkRise?: number;
  // Bed (pickup only)
  bedCutoff?: number;
  // Body height tweak (for SUV/van)
  tall?: boolean;
  // Hood shape: 0..1 — 1 is standard, 0 is nose cut off (van)
  hoodLen?: number;
};

const PARAMS: Record<BodyType, BodyParams> = {
  sedan:     { cabinX0: 142, cabinX1: 300, cabinInset: 32, shoulder: 128, trunkX0: 300, trunkRise: 22 },
  hatchback: { cabinX0: 142, cabinX1: 346, cabinInset: 32, shoulder: 128 },
  wagon:     { cabinX0: 142, cabinX1: 410, cabinInset: 30, shoulder: 128 },
  coupe:     { cabinX0: 156, cabinX1: 286, cabinInset: 34, shoulder: 118, trunkX0: 286, trunkRise: 20 },
  crossover: { cabinX0: 142, cabinX1: 352, cabinInset: 32, shoulder: 134, tall: true },
  suv:       { cabinX0: 142, cabinX1: 394, cabinInset: 30, shoulder: 156, tall: true },
  pickup:    { cabinX0: 142, cabinX1: 276, cabinInset: 32, shoulder: 144, bedCutoff: 276, tall: true },
  minivan:   { cabinX0: 112, cabinX1: 420, cabinInset: 30, shoulder: 156, tall: true },
  van:       { cabinX0: 70,  cabinX1: 440, cabinInset: 28, shoulder: 164, tall: true },
  other:     { cabinX0: 142, cabinX1: 300, cabinInset: 32, shoulder: 128, trunkX0: 300, trunkRise: 22 },
};

/* ──────────────── Build ──────────────── */

export function buildCar(bodyType: BodyType | undefined): CarShapes {
  const shaped = bodyType ? SHAPED_PRESETS[bodyType] : undefined;
  if (shaped) return buildShapedCar(shaped);
  const params = PARAMS[bodyType ?? "sedan"] ?? PARAMS.sedan;
  const belt = params.tall ? 86 : BELT;
  const shoulderZ = params.shoulder;

  const extent: Point3[] = [
    [-12, -8, 0], [L + 12, -8, 0],
    [-12, W + 8, 0], [L + 12, W + 8, 0],
    [0, 0, shoulderZ + 12], [L, W, shoulderZ + 12],
  ];
  const P = fitProjection(extent, VIEW_W, VIEW_H, { pad: 26, azimuth: AZ, elevation: EL });

  const groups: CarGroup[] = [];

  /* HALO under the car */
  const haloPlan: Plan = { x: 10, y: 8, w: L - 20, d: W - 16, r: 60 };
  groups.push({ key: "halo", parts: [{ kind: "halo", d: slabOf(haloPlan, 0, 0.1, P).fill }] });

  /* Far-side wheels */
  groups.push({ key: "wheels-far", parts: buildWheels(P, Y_FAR, "far") });

  /* Lower body — the main sheet-metal mass. Hood, fenders, doors, trunk all share this. */
  const bodyPlan: Plan = { x: 6, y: 4, w: L - 12, d: W - 8, r: 22 };
  const body = slabOf(bodyPlan, ROCKER, belt - ROCKER, P, 12, 2.4);
  groups.push({ key: "body", parts: [{ kind: "solid", paths: body, tone: "mid", crease: "faint" }] });

  /* Trunk raise (small block on top of lower body at the rear for sedans/coupes) */
  if (params.trunkX0 != null && params.trunkRise && bodyType !== "pickup") {
    const trunkPlan: Plan = {
      x: params.trunkX0 + 6,
      y: 14,
      w: L - params.trunkX0 - 20,
      d: W - 28,
      r: 10,
    };
    if (trunkPlan.w > 10) {
      const trunk = slabOf(trunkPlan, belt, params.trunkRise, P, 8, 1.4);
      groups.push({
        key: "trunk-raise",
        parts: [{ kind: "solid", paths: trunk, tone: "mid", crease: "faint" }],
      });
    }
  }

  /* Pickup bed walls (hollow box behind cabin) */
  if (bodyType === "pickup" && params.bedCutoff != null) {
    const bedOuter: Plan = {
      x: params.bedCutoff + 4,
      y: 10,
      w: L - params.bedCutoff - 16,
      d: W - 20,
      r: 10,
    };
    const walls = slabOf(bedOuter, belt, 36, P, 8, 1.4);
    // Inner recess (floor of bed, slightly lower)
    const bedInner: Plan = {
      x: bedOuter.x + 10,
      y: bedOuter.y + 10,
      w: bedOuter.w - 20,
      d: bedOuter.d - 20,
      r: 4,
    };
    const floor = slabOf(bedInner, belt + 32, 0.4, P, 6);
    groups.push({
      key: "bed",
      parts: [
        { kind: "solid", paths: walls, tone: "mid", crease: "faint" },
        { kind: "solid", paths: floor, tone: "lo", crease: "none" },
      ],
    });
  }

  /* Greenhouse (cabin + roof) — narrower than body */
  const cabinPlan: Plan = {
    x: params.cabinX0,
    y: params.cabinInset,
    w: Math.max(1, params.cabinX1 - params.cabinX0),
    d: W - params.cabinInset * 2,
    r: 20,
  };
  const greenhouse = slabOf(cabinPlan, belt, shoulderZ - belt, P, 12, 2);
  groups.push({ key: "greenhouse", parts: [{ kind: "solid", paths: greenhouse, tone: "mid", crease: "faint" }] });

  /* Window glass — tinted panels on the greenhouse near-side face */
  const windowGlass: CarPart[] = [];
  const nearY = W - params.cabinInset;
  const bPillarX = (params.cabinX0 + params.cabinX1) / 2;
  const glassBottom = belt + 8;
  const glassTop = shoulderZ - 8;
  // Near-side side-window glass (two panels split by B-pillar)
  windowGlass.push({
    kind: "poly",
    d: pathOf([
      iso([params.cabinX0 + 12, nearY, glassBottom], P),
      iso([bPillarX - 4, nearY, glassBottom], P),
      iso([bPillarX - 4, nearY, glassTop], P),
      iso([params.cabinX0 + 18, nearY, glassTop], P),
    ], true),
    fill: "shade-1",
  });
  if (params.cabinX1 - bPillarX > 20) {
    windowGlass.push({
      kind: "poly",
      d: pathOf([
        iso([bPillarX + 4, nearY, glassBottom], P),
        iso([params.cabinX1 - 12, nearY, glassBottom], P),
        iso([params.cabinX1 - 18, nearY, glassTop], P),
        iso([bPillarX + 4, nearY, glassTop], P),
      ], true),
      fill: "shade-1",
    });
  }
  // Windshield on front face of greenhouse (quadrilateral)
  if (params.cabinX0 < 180) {
    windowGlass.push({
      kind: "poly",
      d: pathOf([
        iso([params.cabinX0 + 6, params.cabinInset + 4, glassBottom + 4], P),
        iso([params.cabinX0 + 6, W - params.cabinInset - 4, glassBottom + 4], P),
        iso([params.cabinX0 + 14, W - params.cabinInset - 8, glassTop - 2], P),
        iso([params.cabinX0 + 14, params.cabinInset + 8, glassTop - 2], P),
      ], true),
      fill: "shade-1",
    });
  }
  // Rear window on rear face of greenhouse
  if (params.cabinX1 < L - 40 || params.trunkRise) {
    windowGlass.push({
      kind: "poly",
      d: pathOf([
        iso([params.cabinX1 - 6, params.cabinInset + 4, glassBottom + 4], P),
        iso([params.cabinX1 - 6, W - params.cabinInset - 4, glassBottom + 4], P),
        iso([params.cabinX1 - 14, W - params.cabinInset - 8, glassTop - 2], P),
        iso([params.cabinX1 - 14, params.cabinInset + 8, glassTop - 2], P),
      ], true),
      fill: "shade-1",
    });
  }
  groups.push({ key: "glass", parts: windowGlass });

  /* Window frame lines over the glass */
  const windowLines: CarPart[] = [];
  // Side-window bottom line (belt-line chrome)
  windowLines.push({
    kind: "line",
    d: segment([params.cabinX0 + 10, nearY, glassBottom], [params.cabinX1 - 10, nearY, glassBottom], P),
    tone: "lo",
  });
  // Side-window top line
  windowLines.push({
    kind: "line",
    d: segment([params.cabinX0 + 14, nearY, glassTop], [params.cabinX1 - 14, nearY, glassTop], P),
    tone: "faint",
  });
  // B-pillar
  windowLines.push({
    kind: "line",
    d: segment([bPillarX, nearY, glassBottom], [bPillarX, nearY, glassTop], P),
    tone: "mid",
  });
  // A-pillar (sloped front)
  windowLines.push({
    kind: "line",
    d: segment([params.cabinX0 + 12, nearY, glassBottom], [params.cabinX0 + 18, nearY, glassTop], P),
    tone: "mid",
  });
  // C-pillar (sloped rear)
  if (params.cabinX1 - bPillarX > 20) {
    windowLines.push({
      kind: "line",
      d: segment([params.cabinX1 - 12, nearY, glassBottom], [params.cabinX1 - 18, nearY, glassTop], P),
      tone: "mid",
    });
  }
  groups.push({ key: "window-lines", parts: windowLines });

  /* Front details: grille recess + headlights */
  const frontDetails: CarPart[] = [];
  // Grille outline on the front face (x≈6)
  const grilleY1 = 36;
  const grilleY2 = W - 36;
  const grilleZ1 = ROCKER + 10;
  const grilleZ2 = ROCKER + 30;
  frontDetails.push({
    kind: "line",
    d: pathOf([
      iso([6, grilleY1, grilleZ1], P),
      iso([6, grilleY2, grilleZ1], P),
      iso([6, grilleY2, grilleZ2], P),
      iso([6, grilleY1, grilleZ2], P),
    ], true),
    tone: "lo",
  });
  for (let i = 1; i < 4; i++) {
    const z = grilleZ1 + ((grilleZ2 - grilleZ1) * i) / 4;
    frontDetails.push({
      kind: "line",
      d: segment([6, grilleY1 + 2, z], [6, grilleY2 - 2, z], P),
      tone: "faint",
    });
  }
  // Logo dot in grille centre
  frontDetails.push({
    kind: "dots",
    points: [iso([6, W / 2, (grilleZ1 + grilleZ2) / 2], P)],
    size: 1.6,
    tone: "hi",
  });
  // Headlights (one on each side of grille, inset into fender top at belt line)
  const hlZ = belt - 6;
  // Near-side headlight (visible)
  const hlNearPlan: Plan = { x: 14, y: W - 44, w: 24, d: 14, r: 3 };
  frontDetails.push({
    kind: "solid",
    paths: slabOf(hlNearPlan, hlZ, 6, P, 4, 0.8),
    tone: "hi",
    crease: "faint",
    lit: true,
  });
  // Far-side headlight (barely visible past the grille)
  const hlFarPlan: Plan = { x: 14, y: 20, w: 24, d: 14, r: 3 };
  frontDetails.push({
    kind: "solid",
    paths: slabOf(hlFarPlan, hlZ, 6, P, 4, 0.8),
    tone: "hi",
    crease: "faint",
    lit: true,
  });
  // Hood break line
  frontDetails.push({
    kind: "line",
    d: segment([42, 10, belt + 0.2], [42, W - 10, belt + 0.2], P),
    tone: "faint",
  });
  // Hood crease (centre spine)
  frontDetails.push({
    kind: "line",
    d: segment([8, W / 2, belt - 0.1], [params.cabinX0 - 6, W / 2, belt - 0.1], P),
    tone: "faint",
  });
  groups.push({ key: "front", parts: frontDetails });

  /* Rear details: taillights + bumper line */
  const rearDetails: CarPart[] = [];
  const tlZ = belt - 20;
  const tlNearPlan: Plan = { x: L - 38, y: W - 44, w: 24, d: 14, r: 3 };
  const tlFarPlan: Plan = { x: L - 38, y: 20, w: 24, d: 14, r: 3 };
  rearDetails.push({
    kind: "solid",
    paths: slabOf(tlNearPlan, tlZ, 6, P, 4, 0.8),
    tone: "mid",
    crease: "faint",
  });
  rearDetails.push({
    kind: "solid",
    paths: slabOf(tlFarPlan, tlZ, 6, P, 4, 0.8),
    tone: "mid",
    crease: "faint",
  });
  // Rear licence plate recess
  const plateY1 = W / 2 - 24;
  const plateY2 = W / 2 + 24;
  const plateZ1 = ROCKER + 12;
  const plateZ2 = ROCKER + 24;
  rearDetails.push({
    kind: "line",
    d: pathOf([
      iso([L - 6, plateY1, plateZ1], P),
      iso([L - 6, plateY2, plateZ1], P),
      iso([L - 6, plateY2, plateZ2], P),
      iso([L - 6, plateY1, plateZ2], P),
    ], true),
    tone: "lo",
  });
  // Rear bumper line
  rearDetails.push({
    kind: "line",
    d: segment([L - 6, 10, ROCKER + 6], [L - 6, W - 10, ROCKER + 6], P),
    tone: "faint",
  });
  groups.push({ key: "rear", parts: rearDetails });

  /* Side mirror on near side */
  const mirror: CarPart[] = [];
  const mirrorPlan: Plan = {
    x: params.cabinX0 - 2,
    y: Y_NEAR - 10,
    w: 14,
    d: 14,
    r: 3,
  };
  mirror.push({
    kind: "solid",
    paths: slabOf(mirrorPlan, belt + 4, 8, P, 4, 0.5),
    tone: "mid",
    crease: "faint",
  });
  groups.push({ key: "mirror", parts: mirror });

  /* Near-side details: door seams, handles, character line */
  const near: CarPart[] = [];
  const sideY = W - 4;
  // Front door seam (just behind front wheel well, at cabin start)
  near.push({
    kind: "line",
    d: segment([params.cabinX0 + 2, sideY, ROCKER + 6], [params.cabinX0 + 2, sideY, belt - 1], P),
    tone: "faint",
  });
  // B-pillar seam
  near.push({
    kind: "line",
    d: segment([bPillarX, sideY, ROCKER + 6], [bPillarX, sideY, belt - 1], P),
    tone: "faint",
  });
  // Rear door seam / C-pillar bottom
  if (params.cabinX1 < L - 50) {
    near.push({
      kind: "line",
      d: segment([params.cabinX1 - 2, sideY, ROCKER + 6], [params.cabinX1 - 2, sideY, belt - 1], P),
      tone: "faint",
    });
  }
  // Door handles (short horizontal lines mid-height on each door)
  const handleZ = belt - 14;
  near.push({
    kind: "line",
    d: segment([params.cabinX0 + 16, sideY, handleZ], [bPillarX - 10, sideY, handleZ], P),
    tone: "lo",
  });
  if (params.cabinX1 - bPillarX > 24) {
    near.push({
      kind: "line",
      d: segment([bPillarX + 10, sideY, handleZ], [params.cabinX1 - 16, sideY, handleZ], P),
      tone: "lo",
    });
  }
  // Character line along the side
  near.push({
    kind: "line",
    d: segment([24, sideY, ROCKER + 36], [L - 24, sideY, ROCKER + 36], P),
    tone: "faint",
  });
  // Side skirt line (bottom of body)
  near.push({
    kind: "line",
    d: segment([24, sideY, ROCKER + 4], [L - 24, sideY, ROCKER + 4], P),
    tone: "faint",
  });
  // Wheel arches (near side) — short arcs over each wheel
  for (const xAxle of [AXLE_FRONT, AXLE_REAR]) {
    const points: Flat[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = Math.PI + (i / 18) * Math.PI;
      points.push(iso([xAxle + (WHEEL_R + 3) * Math.cos(t), sideY, WHEEL_R + (WHEEL_R + 3) * Math.sin(t)], P));
    }
    near.push({ kind: "line", d: pathOf(points), tone: "mid" });
  }
  groups.push({ key: "near-details", parts: near });

  /* Near-side wheels (on top of everything on the near side) */
  groups.push({ key: "wheels-near", parts: buildWheels(P, Y_NEAR, "near") });

  /* Zones */
  const zones: Partial<Record<Zone, ZoneHint>> = {};
  // Narrow 3D engine block inside the hood cavity (not fender-to-fender).
  const engineRear = 32;
  const engineFront = Math.max(engineRear + 20, params.cabinX0 - 30);
  zones.engine = rectZone(P, engineRear, engineFront, 44, W - 44, ROCKER + 14, belt - 4);
  zones.cooling = rectZone(P, -2, 10, 24, W - 24, ROCKER + 6, ROCKER + 34);
  zones.electrical = rectZone(P, params.cabinX0 + 6, bPillarX, params.cabinInset + 4, W - params.cabinInset - 4, belt + 4, shoulderZ - 6);
  // Narrow tunnel along the centreline.
  zones.transmission = rectZone(P, params.cabinX0 + 2, AXLE_REAR - 20, W / 2 - 14, W / 2 + 14, ROCKER - 2, ROCKER + 20);
  // Narrow strip under the floor, below the transmission to avoid overlap.
  zones.suspension = rectZone(P, AXLE_FRONT + 40, AXLE_REAR - 40, W / 2 - 18, W / 2 + 18, 0, ROCKER - 4);
  // Wider tires ring, smaller brakes disc.
  zones.tires = wheelZone(P, [AXLE_FRONT, AXLE_REAR], Y_NEAR, WHEEL_R + 8, WHEEL_R, WHEEL_R - 10);
  zones.brakes = wheelZone(P, [AXLE_FRONT, AXLE_REAR], Y_NEAR, WHEEL_R - 10);

  return { P, groups, zones };
}

/* ──────────────── Wheels ──────────────── */

function buildWheels(P: Projection, y: number, side: "near" | "far"): CarPart[] {
  const parts: CarPart[] = [];
  const z = WHEEL_R;
  const yOffset = side === "near" ? -WHEEL_W : WHEEL_W;
  for (const xAxle of [AXLE_FRONT, AXLE_REAR]) {
    const centreOut: Point3 = [xAxle, y, z];
    const centreIn: Point3 = [xAxle, y + yOffset, z];
    const outerFace = sideRing(centreOut, WHEEL_R, "y", P, 36);
    const innerFace = sideRing(centreIn, WHEEL_R, "y", P, 36);
    const rimFace = sideRing(centreOut, RIM_R, "y", P, 36);

    // Inner face (tire sidewall far from viewer): drawn first
    parts.push({ kind: "poly", d: innerFace, fill: "shade-0" });
    // Tread between outer and inner (approximate by overlaying)
    // Outer face (what we see): tire paper + rim
    parts.push({ kind: "poly", d: outerFace, fill: "shade-1" });
    parts.push({ kind: "line", d: outerFace, tone: "lo" });
    // Rim (metal face)
    parts.push({ kind: "poly", d: rimFace, fill: "shade-3" });
    parts.push({ kind: "line", d: rimFace, tone: "lo" });
    // Spokes (5)
    const nearIso = iso(centreOut, P);
    const spokeCount = 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2 + Math.PI / 2;
      const rx = Math.cos(angle);
      const rz = Math.sin(angle);
      const outer = iso([xAxle + rx * (RIM_R - 2), y, z + rz * (RIM_R - 2)], P);
      const inner = iso([xAxle + rx * (HUB_R + 1), y, z + rz * (HUB_R + 1)], P);
      parts.push({ kind: "line", d: pathOf([inner, outer]), tone: "lo" });
    }
    // Hub centre dot
    parts.push({ kind: "dots", points: [nearIso], size: 2.4, tone: "hi" });
  }
  return parts;
}

/* ──────────────── Zone helpers ──────────────── */

function rectZone(P: Projection, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): ZoneHint {
  const corners3: Point3[] = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1],
  ];
  const projected = corners3.map((p) => iso(p, P));
  const hull = convexHull2D(projected);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const cz = (z0 + z1) / 2;
  const centre = iso([cx, cy, cz], P);
  const anchor = iso([cx, cy, z1 + 10], P);
  return { polygons: [hull], centre, anchor };
}


function wheelZone(
	P: Projection,
	xs: number[],
	y: number,
	radius: number,
	wheelCenterZ = WHEEL_R,
	innerRadius?: number,
): ZoneHint {
	// One closed loop per wheel: both share the same path element so hover and
	// click light them up together, but they stay visually separate. When
	// `innerRadius` is given, each wheel becomes an annulus (ring) with that
	// hole in the middle — the hole doesn't receive hover, so a smaller zone
	// (brakes) can sit on top without being blocked by tires.
	const polygons: Flat[][] = [];
	const steps = 24;

	for (const x of xs) {
		const outer: Flat[] = [];
		for (let i = 0; i < steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			outer.push(
				iso(
					[
						x + radius * Math.cos(t),
						y,
						wheelCenterZ + radius * Math.sin(t),
					],
					P,
				),
			);
		}
		polygons.push(outer);
		if (innerRadius !== undefined && innerRadius > 0) {
			// Reversed winding carves a hole under fill-rule: evenodd.
			const inner: Flat[] = [];
			for (let i = steps - 1; i >= 0; i--) {
				const t = (i / steps) * Math.PI * 2;
				inner.push(
					iso(
						[
							x + innerRadius * Math.cos(t),
							y,
							wheelCenterZ + innerRadius * Math.sin(t),
						],
						P,
					),
				);
			}
			polygons.push(inner);
		}
	}

	const midX = (xs[0] + xs[xs.length - 1]) / 2;
	const centre = iso([midX, y, wheelCenterZ], P);
	const anchor = iso([midX, y, wheelCenterZ + radius + 12], P);
	// One badge per wheel — a status pulse must land on a wheel, not float
	// between them.
	const badgeCentres = xs.map((x) => iso([x, y, wheelCenterZ], P));

	return { polygons, centre, badgeCentres, anchor };
}


function convexHull2D(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Flat, a: Flat, b: Flat) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Flat[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function polyPathOf(points: Flat[]): string {
  return pathOf(points, true);
}

/* ──────────────────────────────────────────────────────────────────────────
 *  SHAPED CAR BUILDER
 *
 *  One parametric builder that produces a proper 3/4 iso car with real
 *  cabin, raked windshield, roof panel, side glass, pillars, grille,
 *  headlights, taillights, mirrors, door seams, handles and wheel arches.
 *
 *  Coordinate convention here is reversed from the generic builder so the
 *  FRONT of the car sits at x=L — under our 3/4 iso projection (az=50°,
 *  el=22°) that lands at the LOWER-RIGHT of the viewBox, toward the viewer.
 *  Near side (visible side) is y=W.
 *
 *  Each body type passes its own anchor positions and style flags.
 * ──────────────────────────────────────────────────────────────────────── */

type ShapedCarParams = {
  L: number;
  W: number;
  AXLE_F: number;      // front axle (closer to L)
  AXLE_R: number;      // rear axle (closer to 0)
  WHEEL_R: number;
  Z_ROCKER: number;
  Z_BELT: number;
  Z_ROOF: number;
  // Longitudinal anchors (x=0 is REAR, x=L is FRONT)
  X_HATCH_TOP: number; // bottom of rear glass (where it meets trunk/hatch top)
  X_ROOF_BACK: number; // C-pillar top (back edge of roof)
  X_WIND_TOP: number;  // A-pillar top (front edge of roof)
  X_WIND_BASE: number; // windshield base (where hood meets windshield)
  X_BPILLAR: number;   // B-pillar x; ignored when doors === 2
  doors: 2 | 4;        // 2 = coupe (no B-pillar, no rear door)
  cargoSplit?: boolean; // adds extra rear-door seam inside cargo window (wagons)
};

const SHAPED_PRESETS: Partial<Record<BodyType, ShapedCarParams>> = {
  wagon: {
    L: 440, W: 168, AXLE_F: 345, AXLE_R: 85, WHEEL_R: 28,
    Z_ROCKER: 18, Z_BELT: 68, Z_ROOF: 126,
    X_HATCH_TOP: 18, X_ROOF_BACK: 50, X_WIND_TOP: 224, X_WIND_BASE: 284, X_BPILLAR: 170,
    doors: 4, cargoSplit: true,
  },
  sedan: {
    // Long hood, short raked rear glass, trunk reads as the exposed body top
    // behind the C-pillar.
    L: 440, W: 168, AXLE_F: 345, AXLE_R: 85, WHEEL_R: 28,
    Z_ROCKER: 18, Z_BELT: 68, Z_ROOF: 120,
    X_HATCH_TOP: 70, X_ROOF_BACK: 110, X_WIND_TOP: 224, X_WIND_BASE: 284, X_BPILLAR: 170,
    doors: 4,
  },
  hatchback: {
    // Shorter overall, cabin extends further back than sedan but no trunk step —
    // rear glass drops to a near-vertical hatch close to the bumper.
    L: 420, W: 168, AXLE_F: 330, AXLE_R: 80, WHEEL_R: 28,
    Z_ROCKER: 18, Z_BELT: 68, Z_ROOF: 124,
    X_HATCH_TOP: 24, X_ROOF_BACK: 90, X_WIND_TOP: 216, X_WIND_BASE: 272, X_BPILLAR: 162,
    doors: 4,
  },
  coupe: {
    // Low roof, no B-pillar, short teardrop cabin, long hood.
    L: 440, W: 168, AXLE_F: 350, AXLE_R: 88, WHEEL_R: 28,
    Z_ROCKER: 18, Z_BELT: 68, Z_ROOF: 112,
    X_HATCH_TOP: 60, X_ROOF_BACK: 160, X_WIND_TOP: 232, X_WIND_BASE: 292, X_BPILLAR: 0,
    doors: 2,
  },
};

function buildShapedCar(params: ShapedCarParams): CarShapes {
  const {
    L, W, AXLE_F, AXLE_R, WHEEL_R,
    Z_ROCKER, Z_BELT, Z_ROOF,
    X_HATCH_TOP, X_ROOF_BACK, X_WIND_TOP, X_WIND_BASE, X_BPILLAR,
    doors, cargoSplit,
  } = params;
  const Y_FAR = 6;
  const Y_NEAR = W - 6;

  const extent: Point3[] = [
    [-10, -8, 0], [L + 10, -8, 0],
    [-10, W + 8, 0], [L + 10, W + 8, 0],
    [0, 0, Z_ROOF + 10], [L, W, Z_ROOF + 10],
  ];
  const P = fitProjection(extent, VIEW_W, VIEW_H, { pad: 26, azimuth: 50, elevation: 22 });

  const pt = (x: number, y: number, z: number): Flat => iso([x, y, z], P);
  const groups: CarGroup[] = [];

  /* 1. Halo */
  const haloPlan: Plan = { x: 10, y: 8, w: L - 20, d: W - 16, r: 60 };
  groups.push({ key: "halo", parts: [{ kind: "halo", d: slabOf(haloPlan, 0, 0.1, P).fill }] });

  /* 2. Far-side wheels (behind lower body) */
  groups.push({ key: "wheels-far", parts: buildWheelsLocal(P, Y_FAR, AXLE_F, AXLE_R, WHEEL_R) });

  /* 3. Lower body — one slab from rocker to belt, full length */
  const bodyPlan: Plan = { x: 4, y: 4, w: L - 8, d: W - 8, r: 22 };
  const body = slabOf(bodyPlan, Z_ROCKER, Z_BELT - Z_ROCKER, P, 14, 2.8);
  groups.push({ key: "body", parts: [{ kind: "solid", paths: body, tone: "mid", crease: "faint" }] });

  /* 4. Greenhouse — custom quads for a real wagon profile.
   *   Painted back-to-front by depth: far-side panel → rear window → roof →
   *   windshield → near-side panel → near-side glass. */

  // Far-side cabin panel (visible as a sliver past the body)
  const fsAPbase = pt(X_WIND_BASE - 2, Y_FAR, Z_BELT);
  const fsAPtop = pt(X_WIND_TOP + 4, Y_FAR, Z_ROOF - 4);
  const fsCPtop = pt(X_ROOF_BACK + 2, Y_FAR, Z_ROOF - 4);
  const fsCPbase = pt(X_HATCH_TOP + 2, Y_FAR, Z_BELT);
  groups.push({
    key: "cabin-far",
    parts: [
      { kind: "poly", d: pathOf([fsAPbase, fsAPtop, fsCPtop, fsCPbase], true), fill: "shade-0" },
      { kind: "line", d: pathOf([fsAPbase, fsAPtop, fsCPtop, fsCPbase], true), tone: "faint" },
    ],
  });

  // Rear window (slanted panel) — mostly hidden from front view but may peek
  const rwFarBottom = pt(X_HATCH_TOP, Y_FAR + 10, Z_BELT + 4);
  const rwFarTop = pt(X_ROOF_BACK, Y_FAR + 10, Z_ROOF - 2);
  const rwNearTop = pt(X_ROOF_BACK, Y_NEAR - 10, Z_ROOF - 2);
  const rwNearBottom = pt(X_HATCH_TOP, Y_NEAR - 10, Z_BELT + 4);
  groups.push({
    key: "rear-window",
    parts: [
      { kind: "poly", d: pathOf([rwNearBottom, rwFarBottom, rwFarTop, rwNearTop], true), fill: "shade-1" },
      { kind: "line", d: pathOf([rwNearBottom, rwFarBottom, rwFarTop, rwNearTop], true), tone: "faint" },
    ],
  });

  // Roof (horizontal top panel)
  const roofNearFront = pt(X_WIND_TOP + 6, Y_NEAR - 10, Z_ROOF);
  const roofFarFront = pt(X_WIND_TOP + 6, Y_FAR + 10, Z_ROOF);
  const roofFarBack = pt(X_ROOF_BACK, Y_FAR + 10, Z_ROOF);
  const roofNearBack = pt(X_ROOF_BACK, Y_NEAR - 10, Z_ROOF);
  groups.push({
    key: "roof",
    parts: [
      { kind: "poly", d: pathOf([roofNearFront, roofFarFront, roofFarBack, roofNearBack], true), fill: "top" },
      { kind: "line", d: pathOf([roofNearFront, roofFarFront, roofFarBack, roofNearBack], true), tone: "faint" },
      // Roof-rail hint lines
      { kind: "line", d: pathOf([pt(X_WIND_TOP + 10, Y_NEAR - 12, Z_ROOF + 0.5), pt(X_ROOF_BACK + 4, Y_NEAR - 12, Z_ROOF + 0.5)]), tone: "faint" },
      { kind: "line", d: pathOf([pt(X_WIND_TOP + 10, Y_FAR + 12, Z_ROOF + 0.5), pt(X_ROOF_BACK + 4, Y_FAR + 12, Z_ROOF + 0.5)]), tone: "faint" },
    ],
  });

  // Windshield (slanted panel; prominent from the front 3/4 view)
  const wsNearBottom = pt(X_WIND_BASE, Y_NEAR - 6, Z_BELT);
  const wsFarBottom = pt(X_WIND_BASE, Y_FAR + 6, Z_BELT);
  const wsFarTop = pt(X_WIND_TOP + 6, Y_FAR + 10, Z_ROOF - 2);
  const wsNearTop = pt(X_WIND_TOP + 6, Y_NEAR - 10, Z_ROOF - 2);
  groups.push({
    key: "windshield",
    parts: [
      { kind: "poly", d: pathOf([wsNearBottom, wsFarBottom, wsFarTop, wsNearTop], true), fill: "shade-1" },
      { kind: "line", d: pathOf([wsNearBottom, wsFarBottom, wsFarTop, wsNearTop], true), tone: "lo" },
      // Wiper hint (thin arc across windshield)
      { kind: "line", d: pathOf([pt(X_WIND_BASE + 2, Y_NEAR - 20, Z_BELT + 2), pt(X_WIND_TOP + 20, Y_NEAR - 50, Z_ROOF - 20)]), tone: "faint" },
    ],
  });

  // Near-side cabin panel (visible outer face)
  const nsAPbase = pt(X_WIND_BASE - 2, Y_NEAR, Z_BELT);
  const nsAPtop = pt(X_WIND_TOP + 4, Y_NEAR, Z_ROOF - 2);
  const nsCPtop = pt(X_ROOF_BACK + 2, Y_NEAR, Z_ROOF - 2);
  const nsCPbase = pt(X_HATCH_TOP + 2, Y_NEAR, Z_BELT);
  groups.push({
    key: "cabin-near",
    parts: [
      { kind: "poly", d: pathOf([nsAPbase, nsAPtop, nsCPtop, nsCPbase], true), fill: "paper" },
      { kind: "line", d: pathOf([nsAPbase, nsAPtop, nsCPtop, nsCPbase], true), tone: "lo" },
    ],
  });

  /* 5. Near-side window glass — split by B-pillar (and rear-door seam on wagons) */
  const glassBelt = Z_BELT + 10;
  const glassRoof = Z_ROOF - 10;
  const g1 = pt(X_WIND_BASE + 2, Y_NEAR, glassBelt);
  const g2 = pt(X_WIND_TOP + 10, Y_NEAR, glassRoof);
  const g3 = pt(X_ROOF_BACK + 4, Y_NEAR, glassRoof);
  const g4 = pt(X_HATCH_TOP + 6, Y_NEAR, glassBelt);
  const rearDoorX = doors === 4 ? (X_BPILLAR + X_HATCH_TOP) / 2 : X_WIND_BASE;
  const glassParts: CarPart[] = [];
  if (doors === 2) {
    // Single pane, no interior pillar.
    glassParts.push({ kind: "poly", d: pathOf([g1, g4, g3, g2], true), fill: "shade-1" });
  } else {
    const bpBot = pt(X_BPILLAR, Y_NEAR, glassBelt);
    const bpTop = pt(X_BPILLAR, Y_NEAR, glassRoof);
    glassParts.push({ kind: "poly", d: pathOf([g1, bpBot, bpTop, g2], true), fill: "shade-1" });
    if (cargoSplit) {
      const rdBot = pt(rearDoorX, Y_NEAR, glassBelt);
      const rdTop = pt(rearDoorX, Y_NEAR, glassRoof);
      glassParts.push({ kind: "poly", d: pathOf([bpBot, rdBot, rdTop, bpTop], true), fill: "shade-1" });
      glassParts.push({ kind: "poly", d: pathOf([rdBot, g4, g3, rdTop], true), fill: "shade-1" });
      glassParts.push({ kind: "line", d: pathOf([rdBot, rdTop]), tone: "faint" });
    } else {
      glassParts.push({ kind: "poly", d: pathOf([bpBot, g4, g3, bpTop], true), fill: "shade-1" });
    }
    glassParts.push({ kind: "line", d: pathOf([bpBot, bpTop]), tone: "mid" });
  }
  // Frame lines
  glassParts.push({ kind: "line", d: pathOf([g1, g4]), tone: "lo" });    // belt chrome
  glassParts.push({ kind: "line", d: pathOf([g2, g3]), tone: "faint" }); // roof edge
  glassParts.push({ kind: "line", d: pathOf([g1, g2]), tone: "mid" });   // A-pillar
  glassParts.push({ kind: "line", d: pathOf([g4, g3]), tone: "mid" });   // C-pillar
  groups.push({ key: "glass-near", parts: glassParts });

  /* 6. Front details — the showpiece now that we face the viewer */
  const front: CarPart[] = [];
  // Grille recess (rectangle on front face)
  const grY1 = 36;
  const grY2 = W - 36;
  const grZ1 = Z_ROCKER + 10;
  const grZ2 = Z_ROCKER + 36;
  front.push({
    kind: "line",
    d: pathOf([pt(L, grY1, grZ1), pt(L, grY2, grZ1), pt(L, grY2, grZ2), pt(L, grY1, grZ2)], true),
    tone: "lo",
  });
  // Horizontal grille slats
  for (let i = 1; i < 4; i++) {
    const z = grZ1 + ((grZ2 - grZ1) * i) / 4;
    front.push({ kind: "line", d: pathOf([pt(L, grY1 + 2, z), pt(L, grY2 - 2, z)]), tone: "faint" });
  }
  // Grille centre badge
  front.push({
    kind: "dots",
    points: [pt(L, W / 2, (grZ1 + grZ2) / 2)],
    size: 2.4,
    tone: "hi",
  });
  // Headlights — FLAT on the front face at x=L (no protrusion)
  // Near-side headlight: trapezoidal panel inset into front face
  const hlZTop = Z_BELT - 1;
  const hlZBot = Z_BELT - 18;
  // Near-side (visible)
  const hlN1 = pt(L, Y_NEAR - 26, hlZTop);
  const hlN2 = pt(L, Y_NEAR - 6, hlZTop);
  const hlN3 = pt(L, Y_NEAR - 6, hlZBot);
  const hlN4 = pt(L, Y_NEAR - 26, hlZBot);
  front.push({ kind: "poly", d: pathOf([hlN1, hlN2, hlN3, hlN4], true), fill: "lit-top" });
  front.push({ kind: "line", d: pathOf([hlN1, hlN2, hlN3, hlN4], true), tone: "lit" });
  // Far-side headlight (visible as a thin slice)
  const hlF1 = pt(L, 21, hlZTop);
  const hlF2 = pt(L, 36, hlZTop);
  const hlF3 = pt(L, 36, hlZBot);
  const hlF4 = pt(L, 21, hlZBot);
  front.push({ kind: "poly", d: pathOf([hlF1, hlF2, hlF3, hlF4], true), fill: "lit-top" });
  front.push({ kind: "line", d: pathOf([hlF1, hlF2, hlF3, hlF4], true), tone: "lit" });
  // Lower bumper intake (horizontal slot below grille)
  front.push({
    kind: "line",
    d: pathOf([
      pt(L, grY1 + 12, Z_ROCKER + 2), pt(L, grY2 - 12, Z_ROCKER + 2),
      pt(L, grY2 - 12, Z_ROCKER + 7), pt(L, grY1 + 12, Z_ROCKER + 7),
    ], true),
    tone: "faint",
  });
  // Hood break line (horizontal across top of front face where hood meets grille)
  front.push({
    kind: "line",
    d: pathOf([pt(L, 10, Z_BELT), pt(L, W - 10, Z_BELT)]),
    tone: "lo",
  });
  // Hood centre crease
  front.push({
    kind: "line",
    d: pathOf([pt(L - 10, W / 2, Z_BELT + 0.3), pt(X_WIND_BASE + 4, W / 2, Z_BELT + 0.3)]),
    tone: "faint",
  });
  groups.push({ key: "front", parts: front });

  /* 7. Rear taillights — FLAT on near-side body/rear corner (no protrusion) */
  const rear: CarPart[] = [];
  // A thin flat tail-light panel wrapping around the C-pillar area on near-side
  const tlZTop = Z_BELT - 2;
  const tlZBot = Z_BELT - 18;
  const tl1 = pt(X_HATCH_TOP + 2, Y_NEAR, tlZTop);
  const tl2 = pt(X_HATCH_TOP + 18, Y_NEAR, tlZTop);
  const tl3 = pt(X_HATCH_TOP + 18, Y_NEAR, tlZBot);
  const tl4 = pt(X_HATCH_TOP + 2, Y_NEAR, tlZBot);
  rear.push({ kind: "poly", d: pathOf([tl1, tl2, tl3, tl4], true), fill: "shade-2" });
  rear.push({ kind: "line", d: pathOf([tl1, tl2, tl3, tl4], true), tone: "mid" });
  groups.push({ key: "rear", parts: rear });

  /* 8. Side mirror — small flat triangular protrusion on A-pillar area */
  const mir1 = pt(X_WIND_BASE + 4, Y_NEAR, Z_BELT + 10);
  const mir2 = pt(X_WIND_BASE + 18, Y_NEAR + 4, Z_BELT + 6);
  const mir3 = pt(X_WIND_BASE + 18, Y_NEAR + 4, Z_BELT - 4);
  const mir4 = pt(X_WIND_BASE + 4, Y_NEAR, Z_BELT);
  groups.push({
    key: "mirror",
    parts: [
      { kind: "poly", d: pathOf([mir1, mir2, mir3, mir4], true), fill: "shade-2" },
      { kind: "line", d: pathOf([mir1, mir2, mir3, mir4], true), tone: "lo" },
    ],
  });

  /* 9. Near-side body details — door seams + handles */
  const near: CarPart[] = [];
  const sideY = W - 2;
  const handleZ = Z_BELT - 14;
  // Door seams
  const seamXs = doors === 4
    ? [X_WIND_BASE + 2, X_BPILLAR, rearDoorX]
    : [X_WIND_BASE + 2];
  for (const x of seamXs) {
    near.push({
      kind: "line",
      d: pathOf([pt(x, sideY, Z_ROCKER + 4), pt(x, sideY, Z_BELT - 2)]),
      tone: "faint",
    });
  }
  // Door handles
  if (doors === 4) {
    near.push({
      kind: "line",
      d: pathOf([pt(X_WIND_BASE + 12, sideY, handleZ), pt(X_BPILLAR - 10, sideY, handleZ)]),
      tone: "lo",
    });
    near.push({
      kind: "line",
      d: pathOf([pt(X_BPILLAR + 10, sideY, handleZ), pt(rearDoorX - 6, sideY, handleZ)]),
      tone: "lo",
    });
  } else {
    // Single long door for coupe
    near.push({
      kind: "line",
      d: pathOf([pt(X_WIND_BASE + 12, sideY, handleZ), pt(X_HATCH_TOP + 20, sideY, handleZ)]),
      tone: "lo",
    });
  }

	// Wheel arches — upper semicircles, following the actual wheel radius.
	for (const xAxle of [AXLE_F, AXLE_R]) {
		const points: Flat[] = [];
		const archRadius = WHEEL_R + 2;

		for (let i = 5; i <= 18; i++) {
			const t = (i / 18) * Math.PI;

			points.push(
				pt(
					xAxle + archRadius * Math.cos(t),
					sideY,
					WHEEL_R + archRadius * Math.sin(t),
				),
			);
		}

		near.push({
			kind: "line",
			d: pathOf(points),
			tone: "mid",
		});
	}


	// Subtle body character line.
	near.push({
		kind: "line",
		d: pathOf([
			pt(X_WIND_BASE + 24, sideY, Z_BELT - 28),
			pt(L - 18, sideY, Z_BELT - 28),
		]),
		tone: "faint",
	});

	// Lower sill line.
	near.push({
		kind: "line",
		d: pathOf([
			pt(AXLE_R + 20, sideY, Z_ROCKER + 3),
			pt(AXLE_F - 20, sideY, Z_ROCKER + 3),
		]),
		tone: "faint",
	});


	groups.push({ key: "near-details", parts: near });

  /* 10. Near wheels */
  groups.push({ key: "wheels-near", parts: buildWheelsLocal(P, Y_NEAR, AXLE_F, AXLE_R, WHEEL_R) });

  /* Zones */
  const zones: Partial<Record<Zone, ZoneHint>> = {};
  // Engine: narrow 3D block inside the hood cavity, roughly the width of a
  // real engine bay (not fender-to-fender).
  zones.engine = rectZone(P, X_WIND_BASE + 24, L - 50, 44, W - 44, Z_ROCKER + 14, Z_BELT - 4);
  zones.cooling = rectZone(P, L - 10, L + 2, 24, W - 24, Z_ROCKER + 6, Z_ROCKER + 34);
  zones.electrical = rectZone(P, X_WIND_TOP, X_BPILLAR, 20, W - 20, Z_BELT + 4, Z_ROOF - 4);
  // Transmission: narrow tunnel along the centreline.
  zones.transmission = rectZone(P, AXLE_R + 20, X_WIND_BASE - 4, W / 2 - 14, W / 2 + 14, Z_ROCKER - 2, Z_ROCKER + 20);
  // Suspension: narrow strip under the floor, below the transmission so they
  // don't overlap in projection.
  zones.suspension = rectZone(P, AXLE_R + 36, AXLE_F - 36, W / 2 - 18, W / 2 + 18, 0, Z_ROCKER - 4);
  // Tires render first (wide ring with a bigger hole), brakes paint on top
  // (small disc in the hole). Hover on the rim selects tires, hover on the
  // hub selects brakes — bigger ring = easier to hit.
  zones.tires = wheelZone(P, [AXLE_F, AXLE_R], Y_NEAR, WHEEL_R + 8, WHEEL_R, WHEEL_R - 10);
  zones.brakes = wheelZone(P, [AXLE_F, AXLE_R], Y_NEAR, WHEEL_R - 10, WHEEL_R);

  return { P, groups, zones };
}


function buildWheelsLocal(
	P: Projection,
	y: number,
	xF: number,
	xR: number,
	radius: number,
): CarPart[] {
	const parts: CarPart[] = [];
	const z = radius;
	const wheelWidth = 6;

	// Near side faces the viewer at larger y values.
	// The inner face is offset toward the centre of the car.
	const innerY = y > W / 2
		? y - wheelWidth
		: y + wheelWidth;

	for (const xAxle of [xF, xR]) {
		const inner = sideRing(
			[xAxle, innerY, z],
			radius,
			"y",
			P,
			36,
		);

		const outer = sideRing(
			[xAxle, y, z],
			radius,
			"y",
			P,
			36,
		);

		const rim = sideRing(
			[xAxle, y, z],
			radius * 0.62,
			"y",
			P,
			36,
		);

		// Inner sidewall first, then the visible tire face.
		parts.push({ kind: "poly", d: inner, fill: "shade-0" });
		parts.push({ kind: "poly", d: outer, fill: "shade-1" });
		parts.push({ kind: "line", d: outer, tone: "lo" });

		// Rim.
		parts.push({ kind: "poly", d: rim, fill: "shade-3" });
		parts.push({ kind: "line", d: rim, tone: "lo" });

		// Five spokes.
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
			const rx = Math.cos(a);
			const rz = Math.sin(a);

			const outerPt = iso(
				[
					xAxle + rx * (radius * 0.62 - 2),
					y,
					z + rz * (radius * 0.62 - 2),
				],
				P,
			);

			const innerPt = iso(
				[
					xAxle + rx * 5,
					y,
					z + rz * 5,
				],
				P,
			);

			parts.push({
				kind: "line",
				d: pathOf([innerPt, outerPt]),
				tone: "lo",
			});
		}

		parts.push({
			kind: "dots",
			points: [iso([xAxle, y, z], P)],
			size: 2.4,
			tone: "hi",
		});
	}

	return parts;
}
