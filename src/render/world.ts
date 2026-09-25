import { CANVAS_H, CANVAS_W, RIVER_Y, ROAD_H, ROAD_Y } from "../game/constants";
import { WINDOWS } from "../game/layout";
import { BILLBOARD } from "../game/texts";
import type { GameData } from "../game/types";
import { BILLBOARD_BOX, drawSoft, fireLightNorm, LAMPS } from "./lighting";
import { noise } from "./primitives";
import { BILLBOARD_COLORS, FONTS, GROUND, HILL, MOUNTAINS, mix, rgba, SKY } from "./theme";

const HORIZON = 346;
const WALL_Y = 410;

const burningShare = (g: GameData) => g.fire.filter((f) => f.state === "burning").length / g.fire.length;

/** Night sky with stars and the moon, glowing orange over the fire and dimmed by its smoke. */
export function drawSky(ctx: CanvasRenderingContext2D, g: GameData) {
  const fire = Math.min(1, burningShare(g) * 2.5);
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, SKY.top);
  sky.addColorStop(0.6, SKY.middle);
  sky.addColorStop(1, SKY.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, HORIZON);

  for (let i = 0; i < 90; i++) {
    const twinkle = 0.6 + Math.sin(g.frame * 0.05 + i * 2.7) * 0.4;
    const y = 36 + noise(i + 2000) * 220;
    ctx.fillStyle = rgba(SKY.star, twinkle * (1 - y / 300) * (1 - fire * 0.8));
    ctx.fillRect(noise(i + 1000) * CANVAS_W, y, noise(i + 3000) > 0.85 ? 2 : 1, noise(i + 3000) > 0.85 ? 2 : 1);
  }

  drawSoft(ctx, SKY.moonGlow, 150, 78, 60, 0.25);
  ctx.fillStyle = SKY.moon;
  ctx.beginPath();
  ctx.arc(150, 78, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKY.moonShade;
  for (const [dx, dy, r] of [
    [-5, -4, 4],
    [5, 3, 3],
    [-2, 7, 2],
  ]) {
    ctx.beginPath();
    ctx.arc(150 + dx, 78 + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (fire > 0) {
    const glow = ctx.createLinearGradient(0, 0, 0, HORIZON);
    glow.addColorStop(0, rgba(SKY.smoke, fire * 0.55));
    glow.addColorStop(0.55, rgba(SKY.smoke, fire * 0.25));
    glow.addColorStop(1, rgba(SKY.fireGlow, fire * 0.55));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_W, HORIZON);
  }

  for (let i = 0; i < 5; i++) {
    const span = CANVAS_W + 240;
    const x = ((((noise(i) * span + g.frame * (0.1 + g.wind * 0.3)) % span) + span) % span) - 120;
    const y = 60 + noise(i + 9) * 70;
    const s = 0.7 + noise(i + 17) * 0.6;
    const color = mix(SKY.cloud, SKY.cloudLit, fire * 0.7);
    for (const [dx, dy, r] of [
      [0, 0, 13],
      [15, -6, 16],
      [32, -1, 14],
      [46, 4, 10],
    ]) {
      ctx.fillStyle = rgba(color, 0.8);
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const FAR = [
  [0, 220],
  [90, 150],
  [170, 190],
  [270, 120],
  [360, 175],
  [470, 110],
  [560, 170],
  [650, 130],
  [760, 185],
  [850, 125],
  [960, 190],
];

const NEAR = [
  [0, 250],
  [140, 215],
  [300, 262],
  [430, 230],
  [600, 268],
  [760, 222],
  [960, 258],
];

function ridge(ctx: CanvasRenderingContext2D, points: number[][], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON);
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.lineTo(CANVAS_W, HORIZON);
  ctx.fill();
  ctx.strokeStyle = MOUNTAINS.rim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.stroke();
}

/** Ordino valley by moonlight: far snowy peaks, nearer slopes and pine forest down to the complex. */
export function drawMountains(ctx: CanvasRenderingContext2D) {
  ridge(ctx, FAR, MOUNTAINS.far);
  ctx.fillStyle = MOUNTAINS.farSnow;
  for (const [x, y] of FAR) {
    if (y > 135) continue;
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 18);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 14, y + 16);
    ctx.lineTo(x + 4, y + 12);
    ctx.fill();
  }
  ridge(ctx, NEAR, MOUNTAINS.near);

  for (let i = 0; i < 70; i++) {
    const x = noise(i + 100) * CANVAS_W;
    const base = HORIZON - 4 - noise(i + 200) * 64;
    const h = 12 + noise(i + 300) * 15;
    ctx.fillStyle = MOUNTAINS.pine;
    ctx.beginPath();
    ctx.moveTo(x, base - h);
    ctx.lineTo(x - h * 0.28, base);
    ctx.lineTo(x + h * 0.28, base);
    ctx.fill();
    ctx.fillStyle = MOUNTAINS.pineDark;
    ctx.beginPath();
    ctx.moveTo(x, base - h);
    ctx.lineTo(x, base);
    ctx.lineTo(x + h * 0.28, base);
    ctx.fill();
  }
}

/** Two terraces up the hillside with stone retaining walls, where the rows of buildings stand. */
export function drawHillside(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = HILL.back;
  ctx.fillRect(0, HORIZON, CANVAS_W, WALL_Y - HORIZON);
  ctx.fillStyle = HILL.middle;
  ctx.fillRect(0, WALL_Y + 6, CANVAS_W, ROAD_Y - WALL_Y - 6);
  for (const y of [WALL_Y, ROAD_Y - 4]) {
    ctx.fillStyle = HILL.wall;
    ctx.fillRect(0, y, CANVAS_W, 6);
    ctx.fillStyle = HILL.wallLine;
    for (let x = (y % 2) * 9; x < CANVAS_W; x += 18) ctx.fillRect(x, y, 1, 6);
    ctx.fillRect(0, y + 3, CANVAS_W, 1);
  }
  ctx.fillStyle = HILL.bush;
  for (let i = 0; i < 14; i++) {
    const x = noise(i + 400) * CANVAS_W;
    const y = HORIZON + 12 + noise(i + 500) * 50;
    ctx.beginPath();
    ctx.ellipse(x, y, 9 + noise(i + 600) * 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The developer's billboard on the back terrace, lit by two small spotlights. */
export function drawBillboard(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = BILLBOARD_BOX;
  ctx.fillStyle = BILLBOARD_COLORS.post;
  ctx.fillRect(x + 18, y + h, 4, HORIZON + 10 - y - h);
  ctx.fillRect(x + w - 22, y + h, 4, HORIZON + 10 - y - h);
  ctx.fillStyle = BILLBOARD_COLORS.border;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = BILLBOARD_COLORS.board;
  ctx.fillRect(x, y, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = BILLBOARD_COLORS.text;
  ctx.font = FONTS.billboard;
  ctx.fillText(BILLBOARD.name, x + w / 2, y + 18);
  ctx.fillStyle = BILLBOARD_COLORS.accent;
  ctx.font = FONTS.billboardSmall;
  ctx.fillText(BILLBOARD.line, x + w / 2, y + 31);
  ctx.fillStyle = BILLBOARD_COLORS.lamp;
  ctx.fillRect(x + 24, y + h + 2, 8, 3);
  ctx.fillRect(x + w - 32, y + h + 2, 8, 3);
}

/** Street lamps: a pole with an arm over the road. Their light comes in the lighting pass. */
function drawLamps(ctx: CanvasRenderingContext2D) {
  for (const x of LAMPS) {
    ctx.fillStyle = GROUND.pole;
    ctx.fillRect(x, ROAD_Y - 38, 2, 40);
    ctx.fillRect(x, ROAD_Y - 38, 10, 2);
    ctx.fillStyle = GROUND.lamp;
    ctx.fillRect(x + 6, ROAD_Y - 37, 5, 2);
  }
}

/** Road along the river, and the river with moonlight ripples and the fire mirrored in it. */
export function drawGround(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = GROUND.kerb;
  ctx.fillRect(0, ROAD_Y, CANVAS_W, 2);
  ctx.fillStyle = GROUND.road;
  ctx.fillRect(0, ROAD_Y + 2, CANVAS_W, ROAD_H - 2);
  ctx.fillStyle = GROUND.roadLine;
  for (let x = 10; x < CANVAS_W; x += 40) ctx.fillRect(x, ROAD_Y + ROAD_H / 2, 20, 2);
  drawLamps(ctx);

  const river = ctx.createLinearGradient(0, RIVER_Y, 0, CANVAS_H);
  river.addColorStop(0, GROUND.river);
  river.addColorStop(1, GROUND.riverDeep);
  ctx.fillStyle = river;
  ctx.fillRect(0, RIVER_Y, CANVAS_W, CANVAS_H - RIVER_Y);

  ctx.globalCompositeOperation = "lighter";
  const norm = fireLightNorm(g);
  WINDOWS.forEach((w, i) => {
    const f = g.fire[i];
    if (f.state !== "burning") return;
    for (let k = 0; k < 4; k++) {
      const y = RIVER_Y + 4 + k * 11;
      const wobble = Math.sin(g.frame * 0.08 + k * 1.7 + i) * 4;
      ctx.fillStyle = rgba(GROUND.reflection, f.heat * (0.22 - k * 0.04) * [1, 0.6, 0.4][w.row] * norm);
      ctx.fillRect(w.cx - w.w * 0.6 + wobble, y, w.w * 1.2, 3);
    }
  });
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = GROUND.ripple;
  for (let i = 0; i < 26; i++) {
    const x = ((noise(i + 700) * CANVAS_W + g.frame * (0.6 + noise(i + 800) * 0.6)) % (CANVAS_W + 40)) - 20;
    const y = RIVER_Y + 6 + noise(i + 900) * (CANVAS_H - RIVER_Y - 10);
    ctx.fillRect(x, y, 10 + noise(i + 950) * 14, 1.5);
  }
}
