import type { Building } from "../game/layout";
import { BUILDINGS, WINDOWS } from "../game/layout";
import { roofTop } from "../game/logic";
import type { GameData } from "../game/types";
import { drawSoftRect, fireLightAt } from "./lighting";
import { BUILDING, FIRE, mix, rgba } from "./theme";

type Style = "pitched" | "terrace" | "flat";

/**
 * Pyrenean slate gables at the back and in the middle, flat roofs in the front row so they never
 * cover the windows behind them.
 */
const STYLES: readonly Style[] = ["pitched", "terrace", "pitched", "terrace", "pitched", "flat", "flat", "flat"];

const facadeTop = (b: Building) => b.base - b.floors * b.floorH;
const gableHeight = (b: Building) => b.w * 0.3;

/** Outline of the whole building (facade and roof), for fills that must follow its shape. */
function outline(ctx: CanvasRenderingContext2D, b: Building, style: Style) {
  const top = facadeTop(b);
  ctx.beginPath();
  if (style === "pitched") {
    ctx.moveTo(b.x - 4, top);
    ctx.lineTo(b.x + b.w / 2, top - gableHeight(b));
    ctx.lineTo(b.x + b.w + 4, top);
    ctx.lineTo(b.x + b.w, top);
  } else {
    ctx.moveTo(b.x - 3, roofTop(b));
    ctx.lineTo(b.x + b.w + 3, roofTop(b));
  }
  ctx.lineTo(b.x + b.w, b.base);
  ctx.lineTo(b.x, b.base);
  ctx.closePath();
}

/** Back building standing above a front one, so its roof clutter goes where it can't hide windows. */
const behind = (b: Building) => BUILDINGS.find((o) => o.row === 2 && o.x < b.x + b.w && b.x < o.x + o.w);

function drawRoof(ctx: CanvasRenderingContext2D, b: Building, style: Style, burnt: number) {
  const top = facadeTop(b);
  if (style === "pitched") {
    const h = gableHeight(b);
    ctx.fillStyle = BUILDING.chimney;
    ctx.fillRect(b.x + b.w * 0.7, top - h * 0.75, b.w * 0.09, h * 0.5);
    ctx.fillStyle = BUILDING.roofSlate;
    ctx.beginPath();
    ctx.moveTo(b.x - 4, top);
    ctx.lineTo(b.x + b.w / 2, top - h);
    ctx.lineTo(b.x + b.w + 4, top);
    ctx.fill();
    ctx.fillStyle = BUILDING.roofLine;
    for (let y = top - 4; y > top - h + 3; y -= 4) {
      const half = ((y - (top - h)) / h) * (b.w / 2 + 4);
      ctx.fillRect(b.x + b.w / 2 - half, y, half * 2, 1);
    }
    if (burnt > 0.45) {
      ctx.fillStyle = BUILDING.burnt;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.3, top);
      ctx.lineTo(b.x + b.w * 0.42, top - h * 0.55);
      ctx.lineTo(b.x + b.w * 0.5, top - h * 0.3);
      ctx.lineTo(b.x + b.w * 0.6, top - h * 0.6);
      ctx.lineTo(b.x + b.w * 0.7, top);
      ctx.fill();
    }
    return;
  }

  const roof = roofTop(b);
  ctx.fillStyle = BUILDING.roof;
  ctx.fillRect(b.x - 3, roof, b.w + 6, top - roof);
  ctx.fillStyle = BUILDING.parapet;
  ctx.fillRect(b.x - 3, roof, b.w + 6, 2);
  if (style === "terrace") {
    ctx.fillStyle = BUILDING.railGlass;
    ctx.fillRect(b.x, roof - 6, b.w, 6);
    ctx.fillStyle = BUILDING.railTop;
    ctx.fillRect(b.x, roof - 6, b.w, 1);
    ctx.fillStyle = BUILDING.wood;
    for (let x = b.x + 6; x < b.x + b.w * 0.45; x += 7) ctx.fillRect(x, roof - 12, 2, 12);
    ctx.fillRect(b.x + 4, roof - 13, b.w * 0.45, 2);
  } else {
    const back = behind(b);
    const hx = back && back.x + back.w < b.x + b.w - 26 ? back.x + back.w + 6 : b.x + 4;
    ctx.fillStyle = BUILDING.parapet;
    ctx.fillRect(hx, roof - 10, 18, 10);
  }
  if (burnt > 0.45) {
    ctx.fillStyle = BUILDING.burnt;
    for (let k = 0; k < 4; k++) {
      const x = b.x + b.w * (0.15 + k * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + 6, roof - 3);
      ctx.lineTo(x + 12, top);
      ctx.fill();
    }
  }
}

/** Slate facade with courses, a darker right edge, wooden slats and glass balcony rails. */
function drawFacade(ctx: CanvasRenderingContext2D, b: Building, style: Style) {
  const top = facadeTop(b);
  ctx.fillStyle = BUILDING.slate;
  ctx.fillRect(b.x, top, b.w, b.base - top);
  ctx.fillStyle = BUILDING.slateShade;
  ctx.fillRect(b.x + b.w * 0.88, top, b.w * 0.12, b.base - top);
  ctx.fillStyle = BUILDING.slateLine;
  for (let y = top + 3; y < b.base; y += 4) ctx.fillRect(b.x, y, b.w, 1);

  const cellW = b.w / b.cols;
  ctx.fillStyle = BUILDING.wood;
  if (style === "flat") {
    for (let c = 1; c < b.cols; c++) ctx.fillRect(b.x + c * cellW - 1.5, top, 3, b.base - top);
  } else {
    ctx.fillRect(b.x, top, 3, b.base - top);
    ctx.fillStyle = BUILDING.woodDark;
    ctx.fillRect(b.x + b.w - 3, top, 3, b.base - top);
  }
}

function drawBalconies(ctx: CanvasRenderingContext2D, b: Building, index: number) {
  if (b.row === 2) return;
  for (const w of WINDOWS) {
    if (w.building !== index || w.floor === 0) continue;
    const y = w.y + w.h + 1;
    ctx.fillStyle = BUILDING.railGlass;
    ctx.fillRect(w.x - 3, y - 4, w.w + 6, 5);
    ctx.fillStyle = BUILDING.railTop;
    ctx.fillRect(w.x - 3, y - 4, w.w + 6, 1);
  }
}

/** Dark glass that mirrors the fire nearby, flats on fire, and burnt-out holes with embers. */
function drawWindows(ctx: CanvasRenderingContext2D, g: GameData, index: number) {
  WINDOWS.forEach((w, i) => {
    if (w.building !== index) return;
    const f = g.fire[i];
    ctx.fillStyle = BUILDING.frame;
    ctx.fillRect(w.x - 1, w.y - 1, w.w + 2, w.h + 2);

    if (f.state === "burnt") {
      ctx.fillStyle = BUILDING.burnt;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      const glow = 0.25 + Math.sin(g.frame * 0.07 + i * 1.9) * 0.2;
      ctx.fillStyle = rgba(BUILDING.ember, Math.max(0, glow));
      ctx.fillRect(w.x + w.w * 0.15, w.y + w.h * 0.65, w.w * 0.7, w.h * 0.2);
      return;
    }

    if (f.state === "burning") {
      const flicker = 0.75 + Math.sin(g.frame * 0.5 + i) * 0.25;
      ctx.fillStyle = rgba(FIRE.window, 0.6 + f.heat * 0.4 * flicker);
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = FIRE.core;
      ctx.fillRect(w.x + w.w * 0.15, w.y + w.h * 0.4, w.w * 0.7, w.h * 0.5 * f.heat);
      return;
    }

    const light = Math.min(1, fireLightAt(g, w.cx, w.cy, 130) * 0.5);
    ctx.fillStyle = rgba(mix(BUILDING.glass, BUILDING.glassFire, light), 1);
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = BUILDING.glassShine;
    ctx.fillRect(w.x + 1, w.y + 1, w.w * 0.3, 1);
    ctx.fillRect(w.x + 1, w.y + 1, 1, w.h * 0.5);
    if (w.row === 0) {
      ctx.fillStyle = BUILDING.frame;
      ctx.fillRect(w.cx - 0.5, w.y, 1, w.h);
    }
    if (f.wet > 0) {
      ctx.fillStyle = BUILDING.wet;
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
  });
}

/** Soot climbing the facade above burning and burnt windows. */
function drawSoot(ctx: CanvasRenderingContext2D, g: GameData, index: number) {
  WINDOWS.forEach((w, i) => {
    if (w.building !== index) return;
    const f = g.fire[i];
    const strength = f.state === "burnt" ? 0.75 : f.state === "burning" ? f.heat * 0.45 : 0;
    if (strength <= 0) return;
    const h = w.h * (f.state === "burnt" ? 2.6 : 1.6);
    drawSoftRect(ctx, BUILDING.soot, w.x - w.w * 0.3, w.y - h, w.w * 1.6, h * 1.3, strength * 1.4);
  });
}

/** Back row first, so the front rows cover it. Haze fades the back rows; burnt buildings darken all over. */
export function drawBuildings(ctx: CanvasRenderingContext2D, g: GameData) {
  BUILDINGS.forEach((b, i) => {
    const style = STYLES[i];
    const mine = g.fire.filter((_, j) => WINDOWS[j].building === i);
    const burnt = mine.filter((f) => f.state === "burnt").length / mine.length;

    drawRoof(ctx, b, style, burnt);
    drawFacade(ctx, b, style);
    if (burnt > 0) {
      ctx.fillStyle = rgba(BUILDING.charred, burnt * 0.55);
      outline(ctx, b, style);
      ctx.fill();
    }
    const fog = BUILDING.fogByRow[b.row];
    if (fog > 0) {
      ctx.fillStyle = rgba(BUILDING.fog, fog);
      outline(ctx, b, style);
      ctx.fill();
    }
    drawSoot(ctx, g, i);
    drawBalconies(ctx, b, i);
    drawWindows(ctx, g, i);
  });
}
