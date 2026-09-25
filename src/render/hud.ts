import {
  CANVAS_H,
  CANVAS_W,
  DROP_BTN,
  DROP_BTN_H,
  DROP_BTN_W,
  HELI_MAX_HP,
  HINT_FRAMES,
  HUD_H,
  LOSS_LIMIT,
} from "../game/constants";
import { bucketSize, lossShare } from "../game/logic";
import type { Texts } from "../game/texts";
import { formatMillions } from "../game/texts";
import type { GameData } from "../game/types";
import { drawPill } from "./primitives";
import { FONTS, HUD } from "./theme";

export interface HudInfo {
  t: Texts;
  isTouch: boolean;
  playing: boolean;
  highScore: number;
}

function meter(ctx: CanvasRenderingContext2D, label: string, x: number, share: number, color: string) {
  ctx.font = FONTS.hudSmall;
  ctx.fillStyle = HUD.label;
  ctx.textAlign = "right";
  ctx.fillText(label, x - 6, 16);
  ctx.fillStyle = HUD.track;
  ctx.fillRect(x, 10, 60, 11);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, 11, 58 * Math.max(0, Math.min(1, share)), 9);
}

/** Top bar: money saved, level, losses towards the limit, wind, water and helicopter health. */
export function drawHud(ctx: CanvasRenderingContext2D, g: GameData, info: HudInfo) {
  const { t } = info;
  ctx.fillStyle = HUD.bar;
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.textBaseline = "middle";

  ctx.textAlign = "left";
  ctx.font = FONTS.hudSmall;
  ctx.fillStyle = HUD.label;
  ctx.fillText(t.saved, 12, 16);
  const labelW = ctx.measureText(t.saved).width;
  ctx.font = FONTS.hudBig;
  ctx.fillStyle = HUD.saved;
  const saved = formatMillions(t, g.saved);
  ctx.fillText(saved, 18 + labelW, 16);
  const savedW = ctx.measureText(saved).width;
  ctx.font = FONTS.hud;
  ctx.fillStyle = HUD.text;
  ctx.fillText(`${t.level} ${g.level}`, 34 + labelW + savedW, 16);

  const share = lossShare(g) / LOSS_LIMIT;
  const barW = 170;
  const barX = CANVAS_W / 2 - barW / 2 + 20;
  ctx.font = FONTS.hudSmall;
  ctx.fillStyle = HUD.label;
  ctx.textAlign = "right";
  ctx.fillText(t.losses, barX - 8, 16);
  ctx.fillStyle = HUD.track;
  ctx.fillRect(barX, 9, barW, 13);
  const warn = share > 0.7 && g.frame % 30 < 15;
  ctx.fillStyle = warn ? HUD.lossWarn : HUD.loss;
  ctx.fillRect(barX + 1, 10, (barW - 2) * Math.min(1, share), 11);
  ctx.font = FONTS.hudSmall;
  ctx.fillStyle = HUD.text;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(lossShare(g) * 100)}%`, barX + barW / 2, 16);

  const windX = barX + barW + 50;
  ctx.fillStyle = HUD.label;
  ctx.textAlign = "right";
  ctx.fillText(t.wind, windX - 6, 16);
  const len = g.wind * 40;
  ctx.strokeStyle = HUD.wind;
  ctx.fillStyle = HUD.wind;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(windX + 20 - len / 2, 16);
  ctx.lineTo(windX + 20 + len / 2, 16);
  ctx.stroke();
  const dir = Math.sign(g.wind) || 1;
  const tip = windX + 20 + len / 2;
  ctx.beginPath();
  ctx.moveTo(tip + dir * 5, 16);
  ctx.lineTo(tip - dir * 2, 11);
  ctx.lineTo(tip - dir * 2, 21);
  ctx.fill();

  const hp = g.heli.hp / HELI_MAX_HP;
  meter(ctx, t.heli, CANVAS_W - 72, hp, hp > 0.6 ? HUD.hpHigh : hp > 0.3 ? HUD.hpMid : HUD.hpLow);
  meter(ctx, t.water, CANVAS_W - 72 - 110, g.heli.water / bucketSize(g.heli).capacity, HUD.water);
  ctx.textBaseline = "alphabetic";
}

/** Start-up hints, then warnings for an empty bucket and smoke damage. */
export function drawHints(ctx: CanvasRenderingContext2D, g: GameData, info: HudInfo) {
  if (!info.playing || g.ending) return;
  const { t } = info;
  const h = g.heli;
  const blink = g.frame % 40 < 28;
  if (h.inSmoke && blink) {
    drawPill(ctx, t.smoke, CANVAS_W / 2, 52, 12, HUD.warn);
  } else if (h.water <= 0 && !h.refilling && blink) {
    drawPill(ctx, t.empty, CANVAS_W / 2, 52, 12, HUD.warn);
  } else if (g.frame < HINT_FRAMES) {
    drawPill(ctx, info.isTouch ? t.hintDropTouch : t.hintDropKey, CANVAS_W / 2, 52, 11, HUD.hint);
  } else if (g.supply?.phase === "waiting") {
    drawPill(ctx, t.hintSupply, CANVAS_W / 2, 52, 11, HUD.bannerLevel);
  } else if (h.water < bucketSize(h).capacity * 0.2 && !h.refilling) {
    drawPill(ctx, t.hintRefill, CANVAS_W / 2, 52, 11, HUD.hint);
  }
  if (info.isTouch && g.frame < HINT_FRAMES && g.frame % 60 < 40) {
    drawPill(ctx, t.hintDrag, CANVAS_W / 2, CANVAS_H - 150, 13, HUD.hint);
  }
}

function banner(ctx: CanvasRenderingContext2D, text: string, color: string, y: number) {
  ctx.font = FONTS.banner;
  const w = ctx.measureText(text).width + 40;
  ctx.fillStyle = HUD.bannerBg;
  ctx.fillRect(CANVAS_W / 2 - w / 2, y - 16, w, 32);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, CANVAS_W / 2, y + 1);
  ctx.textBaseline = "alphabetic";
}

export function drawBanners(ctx: CanvasRenderingContext2D, g: GameData, t: Texts) {
  if (g.levelBanner > 0 && g.level > 1) banner(ctx, t.levelUp(g.level), HUD.bannerLevel, 100);
  if (g.crewBanner > 0) banner(ctx, t.crewArrives, HUD.bannerCrew, 140);
  if (g.supplyBanner > 0) banner(ctx, t.supplyArrives, HUD.bannerLevel, 180);
}

/** The WATER button on touch devices, lit while held. */
export function drawTouchButton(ctx: CanvasRenderingContext2D, g: GameData, info: HudInfo) {
  if (!info.isTouch || !info.playing) return;
  ctx.fillStyle = g.heli.dropping ? HUD.touchActive : HUD.touchBg;
  ctx.fillRect(DROP_BTN.x, DROP_BTN.y, DROP_BTN_W, DROP_BTN_H);
  ctx.strokeStyle = HUD.touchBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(DROP_BTN.x, DROP_BTN.y, DROP_BTN_W, DROP_BTN_H);
  ctx.fillStyle = HUD.touchText;
  ctx.font = FONTS.touchButton;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(info.t.dropButton, DROP_BTN.x + DROP_BTN_W / 2, DROP_BTN.y + DROP_BTN_H / 2 + 1);
  ctx.textBaseline = "alphabetic";
}
