import { POPUP_FRAMES } from "../game/constants";
import type { GameData } from "../game/types";
import { drawSoft } from "./lighting";
import { EFFECTS, FONTS, mix, rgba } from "./theme";

/**
 * Smoke is soft puffs, lit orange while young and grey as it rises; steam is white puffs.
 * Embers and sparks glow additively, splashes are small drops.
 */
export function drawParticles(ctx: CanvasRenderingContext2D, g: GameData) {
  for (const p of g.particles) {
    const fade = p.life / p.maxLife;
    if (p.kind === "smoke") {
      // A few fixed tones, so the sprite cache stays small
      const lit = Math.round(Math.min(1, Math.max(0, fade - 0.55) * 2.2) * 4) / 4;
      const color = mix(EFFECTS.smoke, EFFECTS.smokeLit, lit);
      drawSoft(ctx, color, p.x, p.y, p.size * 1.35, fade * 0.85);
    } else if (p.kind === "steam") {
      drawSoft(ctx, EFFECTS.steam, p.x, p.y, p.size * 1.5, fade * 0.7);
    } else if (p.kind === "splash") {
      ctx.fillStyle = rgba(EFFECTS.splash, fade);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalCompositeOperation = "lighter";
  for (const p of g.particles) {
    if (p.kind !== "ember" && p.kind !== "spark") continue;
    const fade = p.life / p.maxLife;
    const color = p.kind === "ember" ? EFFECTS.ember : EFFECTS.spark;
    drawSoft(ctx, color, p.x, p.y, p.size * 3, fade * 0.6);
    ctx.fillStyle = rgba(color, fade);
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalCompositeOperation = "source-over";
}

/** Falling water as short streaks along the direction of travel. */
export function drawDrops(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.strokeStyle = rgba(EFFECTS.drop, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const d of g.drops) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.vx * 1.2, d.y - d.vy * 1.2);
  }
  ctx.stroke();
}

/** "+2,1 M€" over saved flats and "-2,1 M€" over lost ones, rising and fading. */
export function drawPopups(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.font = FONTS.popup;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  for (const p of g.popups) {
    ctx.globalAlpha = Math.min(1, (p.life / POPUP_FRAMES) * 2);
    ctx.strokeStyle = EFFECTS.popupOutline;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.kind === "saved" ? EFFECTS.popupSaved : EFFECTS.popupLost;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.lineJoin = "miter";
}
