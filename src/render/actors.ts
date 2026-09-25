import { BUCKET_SIZES, CANVAS_H, CANVAS_W, HELI_H, HELI_MAX_HP, RIVER_Y, ROAD_Y } from "../game/constants";
import { bucketPos, bucketSize, supplyCrate } from "../game/logic";
import type { Texts } from "../game/texts";
import type { GameData } from "../game/types";
import { CROWD, drawSoft } from "./lighting";
import { drawBubble, fillRound, noise } from "./primitives";
import { BUCKET, CREW, FONTS, HELI, PEOPLE, SUPPLY } from "./theme";

const OLD_MEN_X = [34, 912];
const HELI_SCALE = 1.25;

/** Where the agent stands: pacing along the road in front of the complex. */
const agentX = (frame: number) => 250 + Math.sin(frame * 0.01) * 40;

/** Orange bucket of size `size`, `level` from 0 (empty) to 1 (full), centred on the origin. */
function bucketShape(ctx: CanvasRenderingContext2D, size: { w: number; h: number }, level: number) {
  const { w, h } = size;
  ctx.fillStyle = BUCKET.body;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2 - 3, h / 2);
  ctx.lineTo(-w / 2 + 3, h / 2);
  ctx.fill();
  ctx.fillStyle = BUCKET.band;
  ctx.fillRect(-w / 2 + 1, -h / 2 + h * 0.45, w - 2, 2);
  if (level > 0) {
    ctx.fillStyle = BUCKET.water;
    ctx.fillRect(-w / 2 + 2, -h / 2 + 1, w - 4, 2 + level * 2);
  }
  ctx.fillStyle = BUCKET.rim;
  ctx.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, 2);
}

/**
 * Rope and bucket. Below the river surface they're drawn faintly, as if seen through the water,
 * with ripples spreading around the rope while it fills.
 */
function drawBucket(ctx: CanvasRenderingContext2D, g: GameData) {
  const h = g.heli;
  const b = bucketPos(h);
  const size = bucketSize(h);
  const submerged = b.y + size.h / 2 > RIVER_Y;

  for (const under of submerged ? [false, true] : [false]) {
    ctx.save();
    if (submerged) {
      ctx.beginPath();
      if (under) ctx.rect(0, RIVER_Y, CANVAS_W, CANVAS_H - RIVER_Y);
      else ctx.rect(0, 0, CANVAS_W, RIVER_Y);
      ctx.clip();
      if (under) ctx.globalAlpha = 0.35;
    }
    ctx.strokeStyle = BUCKET.rope;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + HELI_H / 2);
    ctx.lineTo(b.x, b.y - size.h / 2);
    ctx.stroke();
    ctx.translate(b.x, b.y);
    ctx.rotate(h.swing * 0.6);
    bucketShape(ctx, size, h.water / size.capacity);
    ctx.restore();
  }
  if (!submerged) return;

  const ropeX = b.x + (h.x - b.x) * ((b.y - RIVER_Y) / (b.y - h.y));
  ctx.strokeStyle = BUCKET.ripple;
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    const t = ((g.frame + k * 12) % 36) / 36;
    ctx.globalAlpha = 1 - t;
    ctx.beginPath();
    ctx.ellipse(ropeX, RIVER_Y + 1, 5 + t * 22, 1.5 + t * 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (h.refilling && h.water < size.capacity) {
    ctx.fillStyle = BUCKET.foam;
    for (let k = 0; k < 4; k++) {
      const a = g.frame * 0.3 + k * 1.6;
      ctx.fillRect(ropeX + Math.cos(a) * 7, RIVER_Y - 1 + Math.sin(a * 1.3), 2, 1.5);
    }
  }
}

/** Firefighting helicopter facing where it flies: pilot behind the glass, blinking nav lights. */
export function drawHelicopter(ctx: CanvasRenderingContext2D, g: GameData) {
  const h = g.heli;
  drawBucket(ctx, g);

  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.scale(h.facing * HELI_SCALE, HELI_SCALE);
  ctx.rotate(Math.abs(h.vx) * 0.04);

  ctx.fillStyle = HELI.body;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(-36, -5);
  ctx.lineTo(-36, -2);
  ctx.lineTo(-12, 1);
  ctx.fill();
  ctx.fillStyle = HELI.dark;
  ctx.beginPath();
  ctx.moveTo(-38, -3);
  ctx.lineTo(-34, -14);
  ctx.lineTo(-30, -14);
  ctx.lineTo(-31, -3);
  ctx.fill();
  ctx.fillStyle = HELI.disc;
  ctx.beginPath();
  ctx.arc(-35, -8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = HELI.blade;
  ctx.lineWidth = 1;
  const tail = Math.cos(g.frame * 1.3) * 6;
  ctx.beginPath();
  ctx.moveTo(-35, -8 - tail);
  ctx.lineTo(-35, -8 + tail);
  ctx.stroke();

  ctx.fillStyle = HELI.body;
  fillRound(ctx, -16, -10, 38, 19, 9);
  ctx.fillStyle = HELI.dark;
  ctx.fillRect(-10, -12, 16, 3);
  ctx.fillStyle = HELI.stripe;
  ctx.fillRect(-15, 1, 34, 3);
  ctx.fillStyle = HELI.glass;
  ctx.beginPath();
  ctx.moveTo(7, -8);
  ctx.quadraticCurveTo(20, -8, 21, 1);
  ctx.lineTo(7, 1);
  ctx.fill();
  ctx.fillStyle = HELI.pilot;
  ctx.beginPath();
  ctx.arc(12, -3, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(10, -1, 5, 2);
  ctx.fillStyle = HELI.glassShine;
  ctx.fillRect(9, -7, 6, 1);
  ctx.strokeStyle = HELI.dark;
  ctx.lineWidth = 0.6;
  ctx.strokeRect(-6, -7, 10, 11);

  ctx.save();
  ctx.scale(h.facing, 1);
  ctx.fillStyle = HELI.label;
  ctx.font = FONTS.label;
  ctx.textAlign = "center";
  ctx.fillText("BOMBERS", -5 * h.facing, 0);
  ctx.restore();

  ctx.strokeStyle = HELI.skid;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-15, 12);
  ctx.lineTo(18, 12);
  ctx.quadraticCurveTo(21, 12, 21, 10);
  ctx.moveTo(-8, 8);
  ctx.lineTo(-9, 12);
  ctx.moveTo(10, 8);
  ctx.lineTo(11, 12);
  ctx.stroke();

  ctx.fillStyle = HELI.mast;
  ctx.fillRect(1, -15, 3, 5);
  ctx.fillStyle = HELI.disc;
  ctx.beginPath();
  ctx.ellipse(2, -15, 40, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const blade = Math.cos(g.frame * 0.9) * 38;
  ctx.strokeStyle = HELI.blade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2 - blade, -15);
  ctx.lineTo(2 + blade, -15);
  ctx.stroke();

  if (h.hp < HELI_MAX_HP * 0.3) {
    ctx.fillStyle = HELI.damaged;
    fillRound(ctx, -16, -10, 38, 19, 9);
  }
  ctx.restore();

  const blink = g.frame % 50 < 6;
  ctx.globalCompositeOperation = "lighter";
  if (blink) drawSoft(ctx, HELI.navRedGlow, h.x - h.facing * 44, h.y - 14, 8, 0.9);
  drawSoft(ctx, HELI.navGreenGlow, h.x + h.facing * 20, h.y + 2, 4, 0.7);
  ctx.globalCompositeOperation = "source-over";
  if (blink) {
    ctx.fillStyle = HELI.navRed;
    ctx.fillRect(h.x - h.facing * 44 - 1, h.y - 15, 2, 2);
  }
}

/** French fire engine with its ladder and flashing lights; while spraying, a firefighter holds the hose. */
export function drawCrew(ctx: CanvasRenderingContext2D, g: GameData, t: Texts) {
  const crew = g.crew;
  if (!crew) return;
  const x = crew.x;
  const y = ROAD_Y - 18;
  ctx.fillStyle = CREW.body;
  fillRound(ctx, x, y, 96, 24, 3);
  fillRound(ctx, x + 96, y + 4, 26, 20, 4);
  ctx.fillStyle = CREW.dark;
  ctx.fillRect(x, y + 17, 122, 3);
  ctx.fillStyle = CREW.stripe;
  ctx.fillRect(x, y + 14, 122, 2);
  ctx.fillStyle = CREW.glass;
  ctx.fillRect(x + 108, y + 7, 11, 8);
  ctx.fillStyle = CREW.ladder;
  ctx.fillRect(x + 6, y - 4, 84, 2);
  ctx.fillRect(x + 6, y - 8, 84, 2);
  for (let lx = x + 8; lx < x + 90; lx += 8) ctx.fillRect(lx, y - 8, 1, 6);
  const on = g.frame % 20 < 10;
  ctx.fillStyle = on ? CREW.lightOn : CREW.lightOff;
  ctx.fillRect(x + 98, y + 1, 6, 3);
  ctx.fillStyle = on ? CREW.lightOff : CREW.lightOn;
  ctx.fillRect(x + 110, y + 1, 6, 3);
  ctx.fillStyle = CREW.label;
  ctx.font = FONTS.label;
  ctx.textAlign = "center";
  ctx.fillText("POMPIERS", x + 48, y + 11);
  for (const wx of [x + 20, x + 76, x + 108]) {
    ctx.fillStyle = CREW.wheels;
    ctx.beginPath();
    ctx.arc(wx, y + 24, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CREW.hub;
    ctx.beginPath();
    ctx.arc(wx, y + 24, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (crew.phase === "spraying") {
    ctx.fillStyle = CREW.suit;
    ctx.fillRect(x + 56, y - 17, 7, 10);
    ctx.fillStyle = CREW.stripe;
    ctx.fillRect(x + 56, y - 11, 7, 1);
    ctx.fillStyle = CREW.helmet;
    ctx.beginPath();
    ctx.arc(x + 59.5, y - 19, 4, Math.PI, 0);
    ctx.fill();
    if (crew.timer > 480) drawBubble(ctx, t.crewQuote, x + 60, y - 48, 1);
  }
}

/** Fire service pickup with the next bucket on its bed; the bed pulses while it waits. */
export function drawSupply(ctx: CanvasRenderingContext2D, g: GameData) {
  const s = g.supply;
  if (!s) return;
  const x = s.x;
  const y = ROAD_Y - 14;
  ctx.fillStyle = CREW.body;
  fillRound(ctx, x + 58, y - 6, 32, 20, 4);
  ctx.fillRect(x, y + 2, 62, 12);
  ctx.fillStyle = CREW.dark;
  ctx.fillRect(x, y + 10, 90, 2);
  ctx.fillStyle = CREW.stripe;
  ctx.fillRect(x, y + 6, 90, 2);
  ctx.fillStyle = CREW.glass;
  ctx.fillRect(x + 72, y - 3, 12, 7);
  ctx.fillStyle = g.frame % 24 < 12 ? SUPPLY.beaconOn : SUPPLY.beaconOff;
  ctx.fillRect(x + 66, y - 9, 8, 3);
  ctx.fillStyle = CREW.label;
  ctx.font = FONTS.label;
  ctx.textAlign = "center";
  ctx.fillText("BOMBERS", x + 30, y + 12);
  for (const wx of [x + 16, x + 74]) {
    ctx.fillStyle = CREW.wheels;
    ctx.beginPath();
    ctx.arc(wx, y + 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CREW.hub;
    ctx.beginPath();
    ctx.arc(wx, y + 15, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const next = BUCKET_SIZES[Math.min(BUCKET_SIZES.length - 1, g.heli.bucket + 1)];
  const crate = supplyCrate(x);
  ctx.save();
  ctx.translate(crate.x + crate.w / 2, crate.y + crate.h - next.h / 2 - 1);
  bucketShape(ctx, next, 1);
  ctx.restore();
  if (s.phase === "waiting") {
    const pulse = 0.5 + Math.sin(g.frame * 0.2) * 0.5;
    ctx.strokeStyle = SUPPLY.target;
    ctx.globalAlpha = 0.4 + pulse * 0.6;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(crate.x - 2 - pulse * 2, crate.y - 2 - pulse * 2, crate.w + 4 + pulse * 4, crate.h + 4 + pulse * 4);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

/** Old man with beret and cane. While he talks he shakes the cane in the air. */
function drawOldMan(ctx: CanvasRenderingContext2D, x: number, talking: boolean, frame: number) {
  const y = ROAD_Y + 5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.35, 1.35);
  ctx.fillStyle = PEOPLE.legs;
  ctx.fillRect(3, -4, 2, 7);
  ctx.fillRect(7, -4, 2, 7);
  ctx.fillStyle = PEOPLE.coat;
  ctx.fillRect(2, -14, 8, 11);
  ctx.strokeStyle = PEOPLE.cane;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (talking) {
    const a = -1.1 + Math.sin(frame * 0.35) * 0.35;
    ctx.moveTo(10, -12);
    ctx.lineTo(10 + Math.cos(a) * 12, -12 + Math.sin(a) * 12);
  } else {
    ctx.moveTo(12, -8);
    ctx.lineTo(13, 3);
  }
  ctx.stroke();
  ctx.fillStyle = PEOPLE.skin;
  ctx.beginPath();
  ctx.arc(6, -18 + (talking ? Math.sin(frame * 0.35) * 0.4 : 0), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PEOPLE.beret;
  ctx.beginPath();
  ctx.ellipse(6, -21, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Estate agent in a suit walking up and down with a "for sale" sign (in Catalan, like every sign in Andorra). */
function drawAgent(ctx: CanvasRenderingContext2D, x: number, frame: number) {
  const y = ROAD_Y + 5;
  const step = Math.sin(frame * 0.2) * 1.5;
  const bob = Math.abs(Math.sin(frame * 0.15)) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.35, 1.35);
  ctx.fillStyle = PEOPLE.suit;
  ctx.fillRect(2 + step, -4, 2, 7);
  ctx.fillRect(6 - step, -4, 2, 7);
  ctx.fillRect(1, -15, 9, 12);
  ctx.fillStyle = PEOPLE.shirt;
  ctx.fillRect(4, -15, 3, 5);
  ctx.fillStyle = PEOPLE.tie;
  ctx.fillRect(5, -14, 1, 4);
  ctx.fillStyle = PEOPLE.skin;
  ctx.beginPath();
  ctx.arc(5.5, -19, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PEOPLE.signPost;
  ctx.fillRect(11, -32 - bob, 1.5, 22);
  ctx.fillStyle = PEOPLE.sign;
  ctx.fillRect(-5, -43 - bob, 34, 12);
  ctx.fillStyle = PEOPLE.signText;
  ctx.font = FONTS.sign;
  ctx.textAlign = "center";
  ctx.fillText("ES VEN", 12, -34.5 - bob);
  ctx.restore();
}

/** Onlookers holding their phones up to film the fire. */
function drawCrowd(ctx: CanvasRenderingContext2D, frame: number) {
  CROWD.forEach((x, i) => {
    const y = ROAD_Y + 5;
    const sway = Math.sin(frame * 0.03 + i * 1.7) * 0.8;
    ctx.fillStyle = PEOPLE.crowd[i % PEOPLE.crowd.length];
    ctx.fillRect(x + 1, y - 17, 9, 15);
    ctx.fillRect(x + 2, y - 3, 3, 6);
    ctx.fillRect(x + 6, y - 3, 3, 6);
    ctx.beginPath();
    ctx.arc(x + 5.5 + sway, y - 21, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 8, y - 22, 2, 7);
    ctx.fillStyle = PEOPLE.phone;
    ctx.fillRect(x + 8 + (noise(i) > 0.5 ? 1 : 0), y - 25, 3, 4);
  });
}

export function drawPeople(ctx: CanvasRenderingContext2D, g: GameData) {
  drawCrowd(ctx, g.frame);
  OLD_MEN_X.forEach((x, i) => {
    drawOldMan(ctx, x, g.speech?.who === i, g.frame);
  });
  drawAgent(ctx, agentX(g.frame), g.frame);
}

/** Whoever is talking, drawn last so nothing covers the bubble. */
export function drawSpeech(ctx: CanvasRenderingContext2D, g: GameData) {
  const s = g.speech;
  if (!s) return;
  const x = s.who === 2 ? agentX(g.frame) + 8 : OLD_MEN_X[s.who] + 8;
  const top = ROAD_Y - (s.who === 2 ? 84 : 58);
  drawBubble(ctx, s.text, x, top, Math.min(1, s.timer / 20));
}
