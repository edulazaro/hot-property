import {
  BUCKET_SIZES,
  BURNOUT_FRAMES,
  CANVAS_W,
  CREW_BANNER_FRAMES,
  CREW_EVERY,
  CREW_SPEED,
  CREW_SPRAY_FRAMES,
  CREW_STOP_X,
  DROP_GRAVITY,
  DROP_POWER,
  DROPS_PER_TICK,
  EMBER_DECAY,
  EMBER_MIN,
  EMBER_START,
  EMBER_WHEN_CLEAR,
  ENDING_FRAMES,
  FIRE_GROW,
  HELI_ACCEL,
  HELI_DRAG,
  HELI_H,
  HELI_MAX_HP,
  HELI_MAX_SPEED,
  HELI_MAX_X,
  HELI_MAX_Y,
  HELI_MIN_X,
  HELI_MIN_Y,
  HELI_REGEN,
  LEVEL_BANNER_FRAMES,
  LEVEL_FRAMES,
  LOSS_LIMIT,
  MAX_LEVEL,
  MAX_PARTICLES,
  POPUP_FRAMES,
  QUOTE_EVERY,
  QUOTE_FRAMES,
  REFILL_PER_TICK,
  RIVER_Y,
  ROAD_Y,
  ROPE_LENGTH,
  SMOKE_DAMAGE,
  SMOKE_HALF_W,
  SMOKE_REACH,
  SPREAD_CHANCE,
  SPREAD_MIN_HEAT,
  SPREAD_PER_LEVEL,
  SUPPLY_BANNER_FRAMES,
  SUPPLY_CRATE,
  SUPPLY_EVERY,
  SUPPLY_SPEED,
  SUPPLY_W,
  SUPPLY_WAIT,
  TOUCH_FOLLOW,
  WATER_PER_TICK,
  WET_FRAMES,
  WIND_CHANGE_MAX,
  WIND_CHANGE_MIN,
  WIND_MAX,
  WIND_PER_LEVEL,
} from "./constants";
import { type BUILDINGS, TOTAL_VALUE, WINDOWS } from "./layout";
import type { Texts } from "./texts";
import { formatMillions } from "./texts";
import type { Controls, EndReason, GameData, GameEvents, Helicopter, ParticleKind } from "./types";

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

const IDLE: Controls = { up: false, down: false, left: false, right: false, target: null, drop: false };

/** Share of the complex's value that has burnt, from 0 to 1. */
export const lossShare = (g: GameData) => g.lost / TOTAL_VALUE;
export const flatsStanding = (g: GameData) => g.fire.filter((f) => f.state !== "burnt").length;
export const isBurning = (g: GameData) => g.fire.some((f) => f.state === "burning");

/** Size and capacity of the bucket the helicopter carries now. */
export const bucketSize = (h: Helicopter) => BUCKET_SIZES[h.bucket];

/** Where the bucket hangs below the helicopter. */
export function bucketPos(h: Helicopter) {
  return { x: h.x + Math.sin(h.swing) * ROPE_LENGTH, y: h.y + HELI_H / 2 + Math.cos(h.swing) * ROPE_LENGTH };
}

/** Top of a building's roof. */
export const roofTop = (b: (typeof BUILDINGS)[number]) => b.base - b.floors * b.floorH - b.floorH / 2;

export function endGame(g: GameData, reason: EndReason, ev: GameEvents) {
  if (g.ended) return;
  g.ended = true;
  ev.end(reason);
}

function startEnding(g: GameData, reason: EndReason, ev: GameEvents) {
  if (g.ending || g.ended) return;
  g.ending = { reason, timer: ENDING_FRAMES };
  ev.sound("ending");
  ev.vibrate(reason === "heli" ? [60, 40, 200] : 120);
}

function addParticle(
  g: GameData,
  kind: ParticleKind,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  size: number,
) {
  g.particles.push({ kind, x, y, vx, vy, life, maxLife: life, size });
}

function burst(
  g: GameData,
  kind: ParticleKind,
  x: number,
  y: number,
  count: number,
  speed: number,
  life: number,
  size: number,
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    addParticle(g, kind, x, y, Math.cos(angle) * v, Math.sin(angle) * v, life * (0.6 + Math.random() * 0.4), size);
  }
}

function updateLevel(g: GameData, ev: GameEvents) {
  if (g.levelBanner > 0) g.levelBanner--;
  const level = Math.min(MAX_LEVEL, 1 + Math.floor(g.frame / LEVEL_FRAMES));
  if (level <= g.level) return;
  g.level = level;
  g.levelBanner = LEVEL_BANNER_FRAMES;
  ev.sound("levelUp");
}

/** The wind drifts towards a new target every few seconds, stronger with each level. */
function updateWind(g: GameData) {
  g.windTimer--;
  if (g.windTimer <= 0) {
    g.windTarget = (Math.random() * 2 - 1) * (WIND_MAX + (g.level - 1) * WIND_PER_LEVEL);
    g.windTimer = WIND_CHANGE_MIN + Math.random() * (WIND_CHANGE_MAX - WIND_CHANGE_MIN);
  }
  g.wind += (g.windTarget - g.wind) * 0.01;
}

/** Held keys accelerate and drag slows it down; a touch drag steers it towards the target. */
function fly(g: GameData, c: Controls) {
  const h = g.heli;
  if (c.target) {
    h.vx = clamp((c.target.x - h.x) * TOUCH_FOLLOW, -HELI_MAX_SPEED, HELI_MAX_SPEED);
    h.vy = clamp((c.target.y - h.y) * TOUCH_FOLLOW, -HELI_MAX_SPEED, HELI_MAX_SPEED);
  } else {
    const ax = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    const ay = (c.down ? 1 : 0) - (c.up ? 1 : 0);
    h.vx = clamp(h.vx * HELI_DRAG + ax * HELI_ACCEL, -HELI_MAX_SPEED, HELI_MAX_SPEED);
    h.vy = clamp(h.vy * HELI_DRAG + ay * HELI_ACCEL, -HELI_MAX_SPEED, HELI_MAX_SPEED);
  }
  h.vx += g.wind * 0.03;
  if (h.vx > 0.4) h.facing = 1;
  else if (h.vx < -0.4) h.facing = -1;
  h.x = clamp(h.x + h.vx, HELI_MIN_X, HELI_MAX_X);
  h.y = clamp(h.y + h.vy, HELI_MIN_Y, HELI_MAX_Y);

  // The bucket lags behind when the helicopter moves, then swings back
  h.swingV += (-h.vx * 0.12 - h.swing) * 0.05 - h.swingV * 0.08;
  // Water drags on a sunk bucket
  if (h.refilling) h.swingV *= 0.75;
  h.swing += h.swingV;
}

/** Dipping the bucket in the river fills it; holding drop empties it as a stream of drops. */
/** Dipping the bucket in the river fills it; holding drop empties it as a stream of drops. */
function operateBucket(g: GameData, c: Controls, ev: GameEvents) {
  const h = g.heli;
  const b = bucketPos(h);
  const size = bucketSize(h);
  const wasIn = h.refilling;
  h.refilling = b.y > RIVER_Y + 2;
  if (h.refilling && !wasIn) {
    ev.sound("plop");
    burst(g, "splash", b.x, RIVER_Y, 10, 2.5, 26, 2);
  }
  if (h.refilling && h.water < size.capacity) {
    h.water = Math.min(size.capacity, h.water + REFILL_PER_TICK);
    if (g.frame % 3 === 0) {
      addParticle(
        g,
        "splash",
        b.x + (Math.random() - 0.5) * size.w,
        RIVER_Y + 2,
        (Math.random() - 0.5) * 2,
        -1.5 - Math.random() * 1.5,
        24,
        2,
      );
    }
    if (g.frame % 9 === 0) ev.sound(pick(["bubbleA", "bubbleB", "bubbleC"] as const));
    if (h.water >= size.capacity) ev.sound("full");
  }

  h.dropping = c.drop && h.water > 0 && !h.refilling;
  if (!h.dropping) return;
  h.water = Math.max(0, h.water - WATER_PER_TICK);
  for (let i = 0; i < DROPS_PER_TICK; i++) {
    g.drops.push({
      x: b.x + (Math.random() - 0.5) * size.w * 0.8,
      y: b.y + size.h / 2,
      vx: h.vx * 0.6 + (Math.random() - 0.5) * 0.6,
      vy: 1 + Math.random(),
    });
  }
  if (g.frame % 5 === 0) ev.sound("pour");
  if (h.water <= 0) ev.sound("empty");
}

function extinguish(g: GameData, t: Texts, i: number, ev: GameEvents) {
  const f = g.fire[i];
  const w = WINDOWS[i];
  f.state = "intact";
  f.heat = 0;
  f.fullFor = 0;
  f.wet = WET_FRAMES;
  g.saved += w.price;
  g.popups.push({ kind: "saved", text: `+${formatMillions(t, w.price)}`, x: w.cx, y: w.y - 4, life: POPUP_FRAMES });
  burst(g, "steam", w.cx, w.cy, 6, 1.2, 40, 5);
  ev.sound("hiss");
}

/** Drops fall with gravity and the wind, and soak every window they go through, burning or not. */
function moveDrops(g: GameData, t: Texts, ev: GameEvents) {
  for (const d of g.drops) {
    d.vx += g.wind * 0.02;
    d.vy += DROP_GRAVITY;
    d.x += d.vx;
    d.y += d.vy;
    for (let i = 0; i < WINDOWS.length; i++) {
      const w = WINDOWS[i];
      if (d.x < w.x || d.x > w.x + w.w || d.y < w.y || d.y > w.y + w.h) continue;
      const f = g.fire[i];
      if (f.state === "burnt") continue;
      if (Math.random() < 0.06)
        addParticle(g, "splash", d.x, d.y, (Math.random() - 0.5) * 2.5, -1 - Math.random(), 18, 2);
      f.wet = WET_FRAMES;
      if (f.state !== "burning") continue;
      f.heat -= DROP_POWER;
      if (Math.random() < 0.1) addParticle(g, "steam", d.x, d.y, (Math.random() - 0.5) * 0.6, -0.8, 30, 4);
      if (f.heat <= 0) extinguish(g, t, i, ev);
    }
  }
  const before = g.drops.length;
  g.drops = g.drops.filter((d) => d.y < RIVER_Y + 6 && d.x > -20 && d.x < CANVAS_W + 20);
  if (g.drops.length < before && Math.random() < 0.3) {
    addParticle(g, "splash", Math.random() * CANVAS_W, ROAD_Y, 0, -1, 10, 1);
  }
}

function ignite(g: GameData, i: number) {
  const f = g.fire[i];
  f.state = "burning";
  f.heat = 0.1;
  f.fullFor = 0;
}

function burnOut(g: GameData, t: Texts, i: number, ev: GameEvents) {
  const f = g.fire[i];
  const w = WINDOWS[i];
  f.state = "burnt";
  f.heat = 0;
  g.lost += w.price;
  g.popups.push({ kind: "lost", text: `-${formatMillions(t, w.price)}`, x: w.cx, y: w.y - 4, life: POPUP_FRAMES });
  burst(g, "spark", w.cx, w.cy, 10, 3, 30, 2);
  g.shake = Math.max(g.shake, 3);
  ev.sound("lost");
  if (lossShare(g) >= LOSS_LIMIT) startEnding(g, "lost", ev);
}

/** Burning windows heat up, smoke, burn out after a while at full heat and spread to their neighbours. */
function burnFires(g: GameData, t: Texts, ev: GameEvents) {
  const spread = 1 + (g.level - 1) * SPREAD_PER_LEVEL;
  const burning = g.fire.filter((f) => f.state === "burning").length;
  // Many fires share one smoke budget, so the screen doesn't drown in particles
  const smokeShare = Math.min(1, 24 / Math.max(1, burning));
  if (burning > 0 && g.frame % Math.max(3, 18 - burning) === 0) ev.sound(Math.random() < 0.5 ? "crackleA" : "crackleB");
  for (let i = 0; i < g.fire.length; i++) {
    const f = g.fire[i];
    if (f.wet > 0) f.wet--;
    if (f.state !== "burning") continue;
    const w = WINDOWS[i];
    f.heat = Math.min(1, f.heat + FIRE_GROW);
    if (f.heat >= 1 && ++f.fullFor >= BURNOUT_FRAMES) {
      burnOut(g, t, i, ev);
      continue;
    }
    if ((g.frame + i) % 7 === 0 && Math.random() < f.heat * smokeShare) {
      addParticle(
        g,
        "smoke",
        w.cx + (Math.random() - 0.5) * w.w,
        w.y,
        g.wind * 0.5,
        -0.6 - Math.random() * 0.4,
        110,
        5 + w.h * 0.3,
      );
    }
    if ((g.frame + i) % 23 === 0 && Math.random() < f.heat * smokeShare) {
      addParticle(g, "ember", w.cx, w.y, (Math.random() - 0.5) * 1.2, -1 - Math.random(), 50, 2);
    }
    if (f.heat < SPREAD_MIN_HEAT) continue;
    for (const n of w.neighbours) {
      const target = g.fire[n.index];
      if (target.state !== "intact" || target.wet > 0) continue;
      const windFactor = Math.max(0.2, 1 + g.wind * n.dir * 1.6);
      if (Math.random() < SPREAD_CHANCE * n.weight * f.heat * windFactor * spread) ignite(g, n.index);
    }
  }
}

/** Embers carried by the wind start a new fire in a dry window, a little more often with each level, and soon after everything is out. */
function spawnEmbers(g: GameData, ev: GameEvents) {
  g.emberTimer--;
  if (!isBurning(g)) g.emberTimer = Math.min(g.emberTimer, EMBER_WHEN_CLEAR);
  if (g.emberTimer > 0) return;
  const dry = g.fire.flatMap((f, i) => (f.state === "intact" && f.wet === 0 ? [i] : []));
  if (dry.length > 0) {
    const i = pick(dry);
    ignite(g, i);
    burst(g, "ember", WINDOWS[i].cx, WINDOWS[i].cy, 8, 2, 40, 2);
  }
  ev.sound("ignite");
  const interval = Math.max(EMBER_MIN, EMBER_START * EMBER_DECAY ** (g.level - 1));
  g.emberTimer = interval * (0.7 + Math.random() * 0.6);
}

/** Smoke rises from every burning window and drifts with the wind; flying through it damages the helicopter. */
function smokeDamage(g: GameData, ev: GameEvents) {
  const h = g.heli;
  let damage = 0;
  for (let i = 0; i < WINDOWS.length; i++) {
    const f = g.fire[i];
    if (f.state !== "burning" || f.heat < 0.5) continue;
    const w = WINDOWS[i];
    const dy = w.cy - h.y;
    if (dy <= 0 || dy > SMOKE_REACH) continue;
    if (Math.abs(h.x - (w.cx + g.wind * dy * 0.6)) < SMOKE_HALF_W) damage += SMOKE_DAMAGE * f.heat;
  }
  h.inSmoke = damage > 0;
  if (h.inSmoke) {
    h.hp -= damage;
    if (g.frame % 24 === 0) ev.sound("damage");
  } else {
    h.hp = Math.min(HELI_MAX_HP, h.hp + HELI_REGEN);
  }
  if (h.hp < HELI_MAX_HP * 0.3 && g.frame % 45 === 0) ev.sound("alarm");
  if (h.hp <= 0) {
    h.hp = 0;
    startEnding(g, "heli", ev);
  }
}

/** Hottest burning window in the front row, the one the French crew aims at. */
function crewTarget(g: GameData) {
  let best = -1;
  for (let i = 0; i < WINDOWS.length; i++) {
    const f = g.fire[i];
    if (WINDOWS[i].row !== 0 || f.state !== "burning") continue;
    if (best < 0 || f.heat > g.fire[best].heat) best = i;
  }
  return best;
}

/** French fire engine: drives in, sprays the front row in an arc, then drives off. */
function updateCrew(g: GameData, ev: GameEvents) {
  if (g.crewBanner > 0) g.crewBanner--;
  if (!g.crew) {
    if (--g.crewTimer > 0) return;
    g.crew = { x: -130, phase: "arriving", timer: 0 };
    g.crewBanner = CREW_BANNER_FRAMES;
    ev.sound("crew");
    return;
  }
  const crew = g.crew;
  if (crew.phase !== "spraying") {
    if (g.frame % 80 === 0) ev.sound("crew");
    if (g.frame % 20 === 0) ev.sound("truck");
  }
  if (crew.phase === "arriving") {
    crew.x += CREW_SPEED;
    if (crew.x >= CREW_STOP_X) {
      crew.phase = "spraying";
      crew.timer = CREW_SPRAY_FRAMES;
      ev.sound("brakes");
    }
  } else if (crew.phase === "spraying") {
    crew.timer--;
    if (g.frame % 6 === 0) ev.sound("hose");
    if (g.frame % 30 === 0) ev.sound("idle");
    const target = crewTarget(g);
    if (target >= 0 && g.frame % 2 === 0) {
      const w = WINDOWS[target];
      const nx = crew.x + 60;
      const ny = ROAD_Y - 22;
      const frames = 36;
      const tx = w.cx + (Math.random() - 0.5) * w.w;
      g.drops.push({
        x: nx,
        y: ny,
        vx: (tx - nx) / frames - g.wind * 0.02 * frames * 0.5,
        vy: (w.cy - ny) / frames - 0.5 * DROP_GRAVITY * frames,
      });
    }
    if (crew.timer <= 0) crew.phase = "leaving";
  } else {
    crew.x += CREW_SPEED;
    if (crew.x > CANVAS_W + 150) {
      g.crew = null;
      g.crewTimer = CREW_EVERY;
    }
  }
}

/** Truck bed rectangle where the new bucket waits, in canvas coordinates. */
export function supplyCrate(x: number) {
  return { x: x + SUPPLY_CRATE.x, y: ROAD_Y + SUPPLY_CRATE.y, w: SUPPLY_CRATE.w, h: SUPPLY_CRATE.h };
}

/** Parks where the French crew isn't. */
function supplyStop(g: GameData) {
  const options = [150, 700].filter((x) => !g.crew || Math.abs(x - g.crew.x) > 180);
  return options.length > 0 ? pick(options) : 150;
}

/**
 * Supply truck with the next bucket size: drives in, waits on the road for `SUPPLY_WAIT` frames and
 * swaps buckets (the new one comes full) when the helicopter's bucket touches it. Stops coming once
 * the biggest bucket is on.
 */
function updateSupply(g: GameData, t: Texts, ev: GameEvents) {
  if (g.supplyBanner > 0) g.supplyBanner--;
  const h = g.heli;
  if (!g.supply) {
    if (h.bucket >= BUCKET_SIZES.length - 1 || --g.supplyTimer > 0) return;
    g.supply = { x: -SUPPLY_W - 10, stopX: supplyStop(g), phase: "arriving", timer: 0 };
    g.supplyBanner = SUPPLY_BANNER_FRAMES;
    ev.sound("horn");
    return;
  }
  const s = g.supply;
  if (s.phase === "arriving") {
    s.x = Math.min(s.stopX, s.x + SUPPLY_SPEED);
    if (s.x >= s.stopX) {
      s.phase = "waiting";
      s.timer = SUPPLY_WAIT;
    }
  } else if (s.phase === "waiting") {
    s.timer--;
    const b = bucketPos(h);
    const size = bucketSize(h);
    const crate = supplyCrate(s.x);
    const touching =
      b.x + size.w / 2 > crate.x &&
      b.x - size.w / 2 < crate.x + crate.w &&
      b.y + size.h / 2 > crate.y &&
      b.y - size.h / 2 < crate.y + crate.h;
    if (touching && !g.ending) {
      h.bucket++;
      h.water = bucketSize(h).capacity;
      g.popups.push({
        kind: "saved",
        text: t.biggerBucket,
        x: crate.x + crate.w / 2,
        y: crate.y - 8,
        life: POPUP_FRAMES,
      });
      burst(g, "spark", b.x, b.y, 14, 3, 30, 2);
      ev.sound("upgrade");
      s.phase = "leaving";
    } else if (s.timer <= 0) {
      s.phase = "leaving";
    }
  } else {
    s.x += SUPPLY_SPEED;
    if (s.x > CANVAS_W + 20) {
      g.supply = null;
      g.supplyTimer = SUPPLY_EVERY;
    }
  }
}

/** Every few seconds one of the old men or the estate agent says something. */
function updateSpeech(g: GameData, t: Texts) {
  if (g.speech) {
    if (--g.speech.timer <= 0) g.speech = null;
    return;
  }
  if (--g.speechTimer > 0) return;
  const who = Math.floor(Math.random() * 3) as 0 | 1 | 2;
  g.speech = { who, text: pick(who === 2 ? t.agent : t.oldMen), timer: QUOTE_FRAMES };
  g.speechTimer = QUOTE_EVERY * (0.7 + Math.random() * 0.6);
}

function updateEffects(g: GameData) {
  for (const p of g.particles) {
    if (p.kind === "smoke" || p.kind === "steam") {
      p.vx += g.wind * 0.008;
      p.vy -= 0.004;
      p.size += p.kind === "smoke" ? 0.18 : 0.1;
    } else if (p.kind === "ember") {
      p.vx += g.wind * 0.03;
      p.vy -= 0.01;
    } else if (p.kind === "splash") {
      p.vy += 0.2;
    } else {
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  if (g.particles.length > MAX_PARTICLES) g.particles.splice(0, g.particles.length - MAX_PARTICLES);
  for (const p of g.popups) {
    p.y -= 0.5;
    p.life--;
  }
  g.popups = g.popups.filter((p) => p.life > 0);
  g.shake = g.shake > 0.3 ? g.shake * 0.88 : 0;
}

/** During the game over animation the helicopter spirals into the river or the fire takes over. */
function updateEnding(g: GameData, ev: GameEvents) {
  const ending = g.ending;
  if (!ending) return;
  ending.timer--;
  if (ending.reason === "heli") {
    const h = g.heli;
    h.vy = Math.min(h.vy + 0.12, 5);
    h.y = Math.min(h.y + h.vy, RIVER_Y + 10);
    h.swing += 0.2;
    if (g.frame % 4 === 0) addParticle(g, "smoke", h.x, h.y - 6, -0.5, -0.8, 60, 6);
  }
  if (ending.timer <= 0) endGame(g, ending.reason, ev);
}

/** One 60 Hz tick. */
export function update(g: GameData, t: Texts, controls: Controls, ev: GameEvents) {
  g.frame++;
  const c = g.ending ? IDLE : controls;
  updateLevel(g, ev);
  updateWind(g);
  if (g.ending?.reason !== "heli") fly(g, c);
  operateBucket(g, c, ev);
  moveDrops(g, t, ev);
  burnFires(g, t, ev);
  spawnEmbers(g, ev);
  if (!g.ending) smokeDamage(g, ev);
  updateCrew(g, ev);
  updateSupply(g, t, ev);
  updateSpeech(g, t);
  updateEffects(g);
  updateEnding(g, ev);
}
