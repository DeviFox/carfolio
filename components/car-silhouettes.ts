import type { BodyType, SystemCategory } from "@/lib/types";

export type ZoneHint =
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx?: number; cx: number; cy: number }
  | { kind: "circles"; cxs: number[]; cy: number; r: number; cx: number; labelY: number };

export type Silhouette = {
  /** Outer chassis path (left-facing, hood on the LEFT). ViewBox 560x300. */
  chassis: string;
  /** Side-window / greenhouse glass area (drawn over the chassis). */
  cabin: string;
  /** X coordinate of the rear wheel center. Front wheel is always at x=120. */
  rearWheelX: number;
  /** Visual label for debugging / assistive text. */
  label: string;
  /** Clickable zones per system category — body-type-specific coords. */
  zones: Partial<Record<SystemCategory, ZoneHint>>;
};

const FRONT_WHEEL_X = 120;
const WHEEL_Y = 258;

function wheelZones(rearX: number): {
  brakes: ZoneHint;
  tires: ZoneHint;
  suspension: ZoneHint;
} {
  const midX = (FRONT_WHEEL_X + rearX) / 2;
  return {
    tires: {
      kind: "circles",
      cxs: [FRONT_WHEEL_X, rearX],
      cy: WHEEL_Y,
      r: 28,
      cx: midX,
      labelY: WHEEL_Y + 44,
    },
    brakes: {
      kind: "circles",
      cxs: [FRONT_WHEEL_X, rearX],
      cy: WHEEL_Y,
      r: 15,
      cx: midX,
      labelY: WHEEL_Y - 36,
    },
    suspension: {
      kind: "rect",
      x: FRONT_WHEEL_X + 306,
      y: 230,
      w: rearX - FRONT_WHEEL_X - 72,
      h: 22,
      rx: 4,
      cx: midX,
      cy: 241,
    },
  };
}

function rect(x: number, y: number, w: number, h: number, rx = 6): ZoneHint {
  return { kind: "rect", x, y, w, h, rx, cx: x + w / 2, cy: y + h / 2 };
}

const LOW_PROFILE_ZONES = {
  engine: rect(88, 176, 92, 48),
  cooling: rect(52, 196, 32, 28),
  transmission: rect(184, 196, 42, 30),
  electrical: rect(216, 130, 118, 20),
};

const WAGON_LIKE_ZONES = {
  engine: rect(88, 176, 92, 48),
  cooling: rect(52, 196, 32, 28),
  transmission: rect(184, 196, 42, 30),
  electrical: rect(216, 130, 230, 20),
};

const COUPE_ZONES = {
  engine: rect(90, 180, 102, 46),
  cooling: rect(52, 196, 34, 28),
  transmission: rect(196, 202, 44, 24),
  electrical: rect(238, 130, 60, 20),
};

const CROSSOVER_ZONES = {
  engine: rect(86, 168, 94, 56),
  cooling: rect(52, 190, 34, 32),
  transmission: rect(184, 188, 44, 38),
  electrical: rect(214, 118, 206, 20),
};

const SUV_ZONES = {
  engine: rect(86, 150, 90, 74),
  cooling: rect(52, 180, 34, 40),
  transmission: rect(178, 180, 46, 44),
  electrical: rect(208, 108, 244, 20),
};

const PICKUP_ZONES = {
  engine: rect(86, 160, 94, 64),
  cooling: rect(52, 184, 34, 36),
  transmission: rect(182, 186, 44, 38),
  electrical: rect(214, 116, 120, 20),
};

const MINIVAN_ZONES = {
  engine: rect(86, 182, 58, 42),
  cooling: rect(52, 200, 32, 22),
  transmission: rect(148, 170, 44, 54),
  electrical: rect(188, 112, 274, 20),
};

const VAN_ZONES = {
  engine: rect(56, 170, 66, 54),
  transmission: rect(128, 162, 48, 60),
  electrical: rect(140, 130, 120, 20),
};

/**
 * Side-profile car silhouettes per body type.
 *
 * Shared geometry:
 *   - Front wheel at (120, 258), R=28
 *   - Rear wheel at (rearWheelX, 258), R=28
 *   - Chassis rocker at y=232 with wheel-well arcs over the wheels
 *   - Car faces LEFT (hood at x~50, trunk/liftgate at x>400)
 */
export const SILHOUETTES: Record<BodyType, Silhouette> = {
  sedan: {
    label: "Седан",
    rearWheelX: 430,
    chassis: [
      "M 54 232",
      "Q 46 212 60 198",
      "Q 82 188 102 184",
      "L 182 150",
      "L 204 128",
      "Q 214 120 228 120",
      "L 328 120",
      "Q 342 120 352 128",
      "L 374 150",
      "L 448 150",
      "Q 476 150 486 172",
      "L 486 216",
      "Q 486 232 472 232",
      "L 464 232",
      "Q 430 196 396 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 208 148",
      "L 222 128",
      "Q 230 122 240 122",
      "L 320 122",
      "Q 330 122 338 128",
      "L 352 148",
      "Z",
    ].join(" "),
    zones: { ...LOW_PROFILE_ZONES, ...wheelZones(430) },
  },

  hatchback: {
    label: "Хэтчбек",
    rearWheelX: 410,
    chassis: [
      "M 54 232",
      "Q 46 212 60 198",
      "Q 82 188 102 184",
      "L 182 150",
      "L 204 128",
      "Q 214 120 228 120",
      "L 304 120",
      "Q 324 120 338 134",
      "L 460 210",
      "L 460 232",
      "L 444 232",
      "Q 410 196 376 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 208 148",
      "L 222 128",
      "Q 230 122 240 122",
      "L 302 122",
      "Q 316 122 326 132",
      "L 342 148",
      "Z",
    ].join(" "),
    zones: {
      engine: rect(88, 176, 92, 48),
      cooling: rect(52, 196, 32, 28),
      transmission: rect(184, 196, 42, 30),
      electrical: rect(216, 130, 90, 20),
      ...wheelZones(410),
    },
  },

  wagon: {
    label: "Универсал",
    rearWheelX: 440,
    chassis: [
      "M 54 232",
      "Q 46 212 60 198",
      "Q 82 188 102 184",
      "L 182 150",
      "L 204 128",
      "Q 214 120 228 120",
      "L 436 120",
      "Q 454 120 462 136",
      "L 486 162",
      "Q 496 170 496 184",
      "L 496 216",
      "Q 496 232 482 232",
      "L 474 232",
      "Q 440 196 406 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 208 148",
      "L 222 128",
      "Q 230 122 240 122",
      "L 432 122",
      "Q 446 122 452 134",
      "L 464 150",
      "Z",
    ].join(" "),
    zones: { ...WAGON_LIKE_ZONES, ...wheelZones(440) },
  },

  coupe: {
    label: "Купе",
    rearWheelX: 420,
    chassis: [
      "M 54 232",
      "Q 46 212 60 198",
      "Q 84 186 112 180",
      "L 196 148",
      "L 232 122",
      "Q 240 116 252 116",
      "L 304 116",
      "Q 322 116 336 132",
      "L 396 164",
      "Q 452 174 486 198",
      "L 494 216",
      "Q 494 232 480 232",
      "L 454 232",
      "Q 420 196 386 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 204 148",
      "L 240 122",
      "Q 248 118 258 118",
      "L 302 118",
      "Q 316 118 326 128",
      "L 342 148",
      "Z",
    ].join(" "),
    zones: { ...COUPE_ZONES, ...wheelZones(420) },
  },

  crossover: {
    label: "Кроссовер",
    rearWheelX: 435,
    chassis: [
      "M 52 228",
      "Q 44 206 58 190",
      "Q 80 178 100 172",
      "L 178 140",
      "L 198 114",
      "Q 208 106 222 106",
      "L 418 106",
      "Q 436 106 444 122",
      "L 466 148",
      "Q 492 154 506 174",
      "L 510 196",
      "Q 510 232 496 232",
      "L 470 232",
      "Q 435 196 400 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 206 142",
      "L 216 118",
      "Q 224 110 234 110",
      "L 412 110",
      "Q 426 110 434 120",
      "L 450 142",
      "Z",
    ].join(" "),
    zones: { ...CROSSOVER_ZONES, ...wheelZones(435) },
  },

  suv: {
    label: "Внедорожник",
    rearWheelX: 440,
    chassis: [
      "M 50 224",
      "Q 44 200 60 182",
      "Q 80 170 100 164",
      "L 174 128",
      "L 190 104",
      "Q 198 96 212 96",
      "L 452 96",
      "Q 468 96 474 110",
      "L 490 138",
      "Q 506 142 514 158",
      "L 518 180",
      "Q 518 232 504 232",
      "L 476 232",
      "Q 440 196 406 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 198 132",
      "L 206 108",
      "Q 214 100 224 100",
      "L 448 100",
      "Q 460 100 466 108",
      "L 478 132",
      "Z",
    ].join(" "),
    zones: { ...SUV_ZONES, ...wheelZones(440) },
  },

  pickup: {
    label: "Пикап",
    rearWheelX: 455,
    chassis: [
      "M 50 226",
      "Q 44 204 58 188",
      "Q 80 176 102 170",
      "L 178 136",
      "L 196 110",
      "Q 206 102 220 102",
      "L 316 102",
      "Q 332 102 338 118",
      "L 346 148",
      "L 514 148",
      "Q 522 148 522 160",
      "L 522 232",
      "L 500 232",
      "Q 455 196 410 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 204 142",
      "L 212 108",
      "Q 220 104 230 104",
      "L 312 104",
      "Q 324 104 330 116",
      "L 340 142",
      "Z",
    ].join(" "),
    zones: { ...PICKUP_ZONES, ...wheelZones(455) },
  },

  minivan: {
    label: "Минивэн",
    rearWheelX: 450,
    chassis: [
      "M 50 230",
      "Q 44 208 58 192",
      "Q 76 180 92 174",
      "L 142 112",
      "Q 156 98 180 96",
      "L 460 96",
      "Q 478 96 486 112",
      "L 498 144",
      "Q 512 152 516 172",
      "L 518 196",
      "Q 518 232 504 232",
      "L 486 232",
      "Q 450 196 414 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 100 170",
      "L 150 112",
      "Q 162 102 182 102",
      "L 456 102",
      "Q 470 102 478 112",
      "L 492 142",
      "Z",
    ].join(" "),
    zones: { ...MINIVAN_ZONES, ...wheelZones(450) },
  },

  van: {
    label: "Фургон",
    rearWheelX: 460,
    chassis: [
      "M 48 232",
      "Q 44 206 54 192",
      "Q 72 166 90 148",
      "Q 108 128 134 118",
      "L 494 118",
      "Q 512 118 518 134",
      "L 524 152",
      "L 524 232",
      "L 506 232",
      "Q 460 196 414 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 96 150",
      "Q 110 134 130 126",
      "L 254 126",
      "L 254 148",
      "L 100 148",
      "Z",
    ].join(" "),
    zones: { ...VAN_ZONES, ...wheelZones(460) },
  },

  other: {
    label: "Автомобиль",
    rearWheelX: 430,
    chassis: [
      "M 54 232",
      "Q 46 212 60 198",
      "Q 82 188 102 184",
      "L 182 150",
      "L 204 128",
      "Q 214 120 228 120",
      "L 328 120",
      "Q 342 120 352 128",
      "L 374 150",
      "L 448 150",
      "Q 476 150 486 172",
      "L 486 216",
      "Q 486 232 472 232",
      "L 464 232",
      "Q 430 196 396 232",
      "L 154 232",
      "Q 120 196 86 232",
      "Z",
    ].join(" "),
    cabin: [
      "M 208 148",
      "L 222 128",
      "Q 230 122 240 122",
      "L 320 122",
      "Q 330 122 338 128",
      "L 352 148",
      "Z",
    ].join(" "),
    zones: { ...LOW_PROFILE_ZONES, ...wheelZones(430) },
  },
};

export function silhouetteFor(bodyType?: BodyType): Silhouette {
  return SILHOUETTES[bodyType ?? "sedan"] ?? SILHOUETTES.sedan;
}
