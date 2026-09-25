import { WINDOWS } from "../game/layout";
import type { GameData } from "../game/types";
import { noise } from "./primitives";
import { FIRE } from "./theme";

const LAYERS = [
  [FIRE.outer, 1],
  [FIRE.mid, 0.62],
  [FIRE.core, 0.34],
] as const;

/** One tongue of flame: a teardrop that leans with the wind and flickers. */
function tongue(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, lean: number) {
  for (const [color, scale] of LAYERS) {
    const hw = (w / 2) * scale;
    const th = h * scale;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - hw, base);
    ctx.bezierCurveTo(x - hw * 1.1, base - th * 0.45, x + lean * 0.4 - hw * 0.3, base - th * 0.7, x + lean, base - th);
    ctx.bezierCurveTo(x + lean * 0.4 + hw * 0.3, base - th * 0.7, x + hw * 1.1, base - th * 0.45, x + hw, base);
    ctx.fill();
  }
}

/** Flames licking out of every burning window, taller and wilder with the heat, bent by the wind. */
export function drawFlames(ctx: CanvasRenderingContext2D, g: GameData) {
  WINDOWS.forEach((w, i) => {
    const f = g.fire[i];
    if (f.state !== "burning") return;
    const count = (w.row === 0 ? 3 : 2) + (i % 2);
    const t = g.frame + i * 13;
    const rowScale = [1, 0.85, 0.72][w.row];
    for (let k = 0; k < count; k++) {
      const seed = noise(i * 7 + k);
      const flicker = Math.sin(t * (0.25 + seed * 0.2) + k * 2.1) * 0.22 + Math.sin(t * 0.83 + k) * 0.12;
      const x = w.x + (w.w / count) * (k + 0.5) + Math.sin(t * 0.1 + k) * 1.5;
      const h = w.h * (0.5 + f.heat * (1.1 + seed * 0.7)) * (1 + flicker) * rowScale;
      const width = (w.w / count) * (1.1 + seed * 0.4);
      const lean = g.wind * h * 0.6 + flicker * 4;
      tongue(ctx, x, w.y + w.h * 0.55, width, h, lean);
    }
    if (f.heat > 0.8 && Math.sin(t * 0.07) > 0.6) {
      tongue(ctx, w.cx, w.y + w.h * 0.3, w.w * 0.5, w.h * 2.2 * f.heat * rowScale, g.wind * 20);
    }
  });
}
