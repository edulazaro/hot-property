import { ROAD_Y } from "../game/constants";
import { BUILDINGS, WINDOWS } from "../game/layout";
import type { GameData } from "../game/types";
import type { RGB } from "./theme";
import { BILLBOARD_COLORS, CREW, FIRE, GROUND, HELI, PEOPLE, rgba } from "./theme";

/** Street lamps along the road. Kept clear of the crew's stop and the speakers. */
export const LAMPS = [120, 345, 640, 880];
/** People filming the fire with their phones: x on the road. */
export const CROWD = [150, 172, 196, 705, 727, 752];
export const BILLBOARD_BOX = { x: 818, y: 282, w: 128, h: 40 };

const sprites = new Map<string, HTMLCanvasElement>();

/** Soft round sprite of one color, cached: far cheaper than a gradient per smoke puff. */
function softSprite(color: RGB) {
  const key = color.join(",");
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const c = sprite.getContext("2d");
    if (c) {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, rgba(color, 1));
      g.addColorStop(0.45, rgba(color, 0.5));
      g.addColorStop(1, rgba(color, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    }
    sprites.set(key, sprite);
  }
  return sprite;
}

/** Soft blob stretched over a rectangle, e.g. soot above a window. */
export function drawSoftRect(
  ctx: CanvasRenderingContext2D,
  color: RGB,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number,
) {
  if (alpha <= 0.005) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(softSprite(color), x, y, w, h);
  ctx.globalAlpha = 1;
}

/** Soft glow or puff of radius `r` centered on (x, y). */
export function drawSoft(ctx: CanvasRenderingContext2D, color: RGB, x: number, y: number, r: number, alpha: number) {
  if (alpha <= 0.005 || r <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(softSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/** Additive lights pile up: with many fires each one is dimmed so the scene never burns out to white. */
export function fireLightNorm(g: GameData) {
  const burning = g.fire.filter((f) => f.state === "burning").length;
  return Math.min(1, 3 / Math.sqrt(Math.max(1, burning)));
}

/** How much fire light reaches (x, y), from 0 upwards. */
export function fireLightAt(g: GameData, x: number, y: number, range = 170) {
  let light = 0;
  for (let i = 0; i < WINDOWS.length; i++) {
    const f = g.fire[i];
    if (f.state !== "burning") continue;
    const w = WINDOWS[i];
    const d = Math.hypot(w.cx - x, w.cy - y);
    if (d < range) light += f.heat * (1 - d / range);
  }
  return light;
}

/** Light cone of the helicopter's searchlight, leaning forward. */
function drawSearchlight(ctx: CanvasRenderingContext2D, g: GameData) {
  if (g.ending?.reason === "heli") return;
  const h = g.heli;
  const lean = h.facing * 30;
  const beam = ctx.createLinearGradient(0, h.y, 0, ROAD_Y);
  beam.addColorStop(0, rgba(HELI.beam, 0.16));
  beam.addColorStop(1, rgba(HELI.beam, 0.03));
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(h.x + h.facing * 10, h.y + 10);
  ctx.lineTo(h.x + lean - 46, ROAD_Y + 6);
  ctx.lineTo(h.x + lean + 46, ROAD_Y + 6);
  ctx.closePath();
  ctx.fill();
  drawSoft(ctx, HELI.beam, h.x + lean, ROAD_Y + 2, 50, 0.22);
}

/**
 * Additive light pass over the scene: fire glow on facades, hillside and road, street lamps,
 * the billboard's spotlights, the crew's flashing lights, the searchlight and the phones.
 */
export function drawLights(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.globalCompositeOperation = "lighter";
  // One light per building, centred on its burning windows: cheap however many are on fire
  BUILDINGS.forEach((b, index) => {
    let heat = 0;
    let x = 0;
    let y = 0;
    WINDOWS.forEach((w, i) => {
      const f = g.fire[i];
      if (w.building !== index || f.state !== "burning") return;
      heat += f.heat;
      x += w.cx * f.heat;
      y += w.cy * f.heat;
    });
    if (heat <= 0) return;
    const flicker = 0.88 + Math.sin(g.frame * 0.4 + index * 1.3) * 0.12;
    const scale = [1, 0.8, 0.65][b.row];
    const r = (70 + 45 * Math.sqrt(heat)) * scale;
    drawSoft(ctx, FIRE.light, x / heat, y / heat, r, Math.min(0.6, 0.42 * Math.sqrt(heat)) * flicker);
  });
  for (const x of LAMPS) drawSoft(ctx, GROUND.lampLight, x + 8, ROAD_Y - 30, 48, 0.32);
  const b = BILLBOARD_BOX;
  drawSoft(ctx, BILLBOARD_COLORS.light, b.x + b.w / 2, b.y + b.h / 2, 80, 0.3);
  if (g.crew) {
    const on = g.frame % 20 < 10;
    drawSoft(ctx, CREW.glow, g.crew.x + (on ? 101 : 113), ROAD_Y - 16, 60, 0.5);
  }
  drawSearchlight(ctx, g);
  for (const x of CROWD) drawSoft(ctx, PEOPLE.phoneLight, x + 9, ROAD_Y - 22, 7, 0.55);
  ctx.globalCompositeOperation = "source-over";
}
