import { CANVAS_H, CANVAS_W } from "../game/constants";
import type { GameData } from "../game/types";
import { drawCrew, drawHelicopter, drawPeople, drawSpeech, drawSupply } from "./actors";
import { drawBuildings } from "./buildings";
import { drawDrops, drawParticles, drawPopups } from "./effects";
import { drawFlames } from "./fire";
import type { HudInfo } from "./hud";
import { drawBanners, drawHints, drawHud, drawTouchButton } from "./hud";
import { drawLights } from "./lighting";
import { drawBillboard, drawGround, drawHillside, drawMountains, drawSky } from "./world";

export type RenderInfo = HudInfo;

/** Draws one frame. Reads the game state, never changes it. The HUD stays still while the world shakes. */
export function render(ctx: CanvasRenderingContext2D, g: GameData, info: RenderInfo) {
  ctx.save();
  if (g.shake > 0) {
    // Zoom in a little so the shaking world never uncovers the canvas edges
    const zoom = 1 + g.shake / 250;
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-CANVAS_W / 2 + Math.sin(g.frame * 1.9) * g.shake, -CANVAS_H / 2 + Math.cos(g.frame * 2.7) * g.shake);
  }
  ctx.clearRect(-20, -20, CANVAS_W + 40, CANVAS_H + 40);
  drawSky(ctx, g);
  drawMountains(ctx);
  drawHillside(ctx);
  drawBillboard(ctx);
  drawBuildings(ctx, g);
  drawGround(ctx, g);
  drawPeople(ctx, g);
  drawCrew(ctx, g, info.t);
  drawSupply(ctx, g);
  drawLights(ctx, g);
  drawFlames(ctx, g);
  drawParticles(ctx, g);
  drawDrops(ctx, g);
  drawHelicopter(ctx, g);
  drawSpeech(ctx, g);
  drawPopups(ctx, g);
  ctx.restore();

  drawHud(ctx, g, info);
  drawHints(ctx, g, info);
  drawBanners(ctx, g, info.t);
  drawTouchButton(ctx, g, info);
}
