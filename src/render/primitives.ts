import { CANVAS_W } from "../game/constants";
import { BUBBLE, FONTS, HUD } from "./theme";

/** Stable pseudo-random value in [0, 1) for an integer, so scenery never flickers between frames. */
export function noise(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Positive modulo, for layers that wrap around. */
export const wrap = (v: number, size: number) => ((v % size) + size) % size;

export function fillRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Centered text on a translucent box sized to fit it. */
export function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.font = FONTS.pill(size);
  const w = ctx.measureText(text).width + 28;
  const h = size + 12;
  ctx.fillStyle = HUD.pillBg;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 1);
  ctx.textBaseline = "alphabetic";
}

/** Speech bubble above `anchorX`, kept inside the canvas, with a tail pointing down at the speaker. */
export function drawBubble(ctx: CanvasRenderingContext2D, text: string, anchorX: number, top: number, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.font = FONTS.bubble;
  const w = ctx.measureText(text).width + 12;
  const x = Math.max(5, Math.min(anchorX - w / 2, CANVAS_W - w - 5));
  const tail = Math.max(x + 6, Math.min(anchorX, x + w - 6));
  ctx.fillStyle = BUBBLE.fill;
  ctx.strokeStyle = BUBBLE.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + w, top);
  ctx.lineTo(x + w, top + 18);
  ctx.lineTo(tail + 4, top + 18);
  ctx.lineTo(tail, top + 23);
  ctx.lineTo(tail - 4, top + 18);
  ctx.lineTo(x, top + 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = BUBBLE.text;
  ctx.textAlign = "left";
  ctx.fillText(text, x + 6, top + 13);
  ctx.globalAlpha = 1;
}
