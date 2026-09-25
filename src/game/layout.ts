import { NEIGHBOUR_RANGE } from "./constants";

/** A building of the complex. Rows go from 0 (front, biggest) to 2 (back, highest up the hillside). */
export interface Building {
  row: 0 | 1 | 2;
  x: number;
  w: number;
  base: number;
  floors: number;
  floorH: number;
  cols: number;
}

export interface Neighbour {
  index: number;
  weight: number;
  /** Horizontal direction from this window to the neighbour, for the wind. */
  dir: -1 | 0 | 1;
}

/** Fixed geometry of one window (one flat), its price in thousands of euros and where fire can spread from it. */
export interface WindowInfo {
  building: number;
  row: 0 | 1 | 2;
  col: number;
  floor: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  price: number;
  neighbours: Neighbour[];
}

/** Back rows go in the gaps and above the front ones, so every window stays visible. */
export const BUILDINGS: readonly Building[] = [
  { row: 2, x: 120, w: 96, base: 352, floors: 4, floorH: 18, cols: 3 },
  { row: 2, x: 400, w: 96, base: 352, floors: 4, floorH: 18, cols: 3 },
  { row: 2, x: 690, w: 96, base: 352, floors: 4, floorH: 18, cols: 3 },
  { row: 1, x: 250, w: 118, base: 412, floors: 4, floorH: 22, cols: 3 },
  { row: 1, x: 540, w: 118, base: 412, floors: 4, floorH: 22, cols: 3 },
  { row: 0, x: 80, w: 150, base: 468, floors: 4, floorH: 26, cols: 4 },
  { row: 0, x: 380, w: 150, base: 468, floors: 4, floorH: 26, cols: 4 },
  { row: 0, x: 690, w: 150, base: 468, floors: 4, floorH: 26, cols: 4 },
];

/** Stable pseudo-random value in [0, 1) for an integer. */
export function hash01(n: number) {
  const x = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

/** Flats from 2.4 M€ in the front row, as the billboard says, up to 5 M€ at the back. */
const PRICE_BASE = [2400, 3000, 3800];
const PRICE_RANGE = [600, 800, 1200];

/** Fire climbs easily, spreads sideways less and rarely goes down. */
function sameBuildingWeight(dc: number, df: number) {
  if (dc === 0 && df === 1) return 1;
  if (dc === 1 && df === 1) return 0.45;
  if (dc === 1 && df === 0) return 0.55;
  if (dc === 0 && df === -1) return 0.2;
  if (dc === 1 && df === -1) return 0.12;
  return 0;
}

function buildWindows(): WindowInfo[] {
  const list: WindowInfo[] = [];
  BUILDINGS.forEach((b, building) => {
    const cellW = b.w / b.cols;
    for (let floor = 0; floor < b.floors; floor++) {
      for (let col = 0; col < b.cols; col++) {
        const w = cellW * 0.56;
        const h = b.floorH * 0.56;
        const x = b.x + col * cellW + (cellW - w) / 2;
        const y = b.base - (floor + 1) * b.floorH + (b.floorH - h) / 2;
        const i = list.length;
        const price = Math.round((PRICE_BASE[b.row] + hash01(i) * PRICE_RANGE[b.row]) / 10) * 10;
        list.push({
          building,
          row: b.row,
          col,
          floor,
          x,
          y,
          w,
          h,
          cx: x + w / 2,
          cy: y + h / 2,
          price,
          neighbours: [],
        });
      }
    }
  });

  for (const a of list) {
    list.forEach((b, index) => {
      if (a === b) return;
      let weight = 0;
      if (a.building === b.building) {
        weight = sameBuildingWeight(Math.abs(a.col - b.col), b.floor - a.floor);
      } else {
        const d = Math.hypot(b.cx - a.cx, b.cy - a.cy);
        if (d < NEIGHBOUR_RANGE) weight = 0.35 * (1 - d / NEIGHBOUR_RANGE);
      }
      if (weight > 0) a.neighbours.push({ index, weight, dir: Math.sign(b.cx - a.cx) as -1 | 0 | 1 });
    });
  }
  return list;
}

export const WINDOWS: readonly WindowInfo[] = buildWindows();

export const TOTAL_VALUE = WINDOWS.reduce((sum, w) => sum + w.price, 0);
