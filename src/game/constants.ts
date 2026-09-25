export const CANVAS_W = 960;
export const CANVAS_H = 540;
export const HUD_H = 30;

export const ROAD_Y = 470;
export const ROAD_H = 22;
export const RIVER_Y = ROAD_Y + ROAD_H;

export const HELI_W = 58;
export const HELI_H = 20;
export const HELI_MIN_X = 40;
export const HELI_MAX_X = CANVAS_W - 40;
export const HELI_MIN_Y = HUD_H + 30;
/** Low enough to sink the whole bucket in the river. */
export const HELI_MAX_Y = RIVER_Y - 30;
export const HELI_ACCEL = 0.32;
export const HELI_MAX_SPEED = 4.2;
export const HELI_DRAG = 0.9;
export const HELI_MAX_HP = 100;
export const HELI_REGEN = 0.08;
export const ROPE_LENGTH = 34;
/** Buckets the supply truck brings, each only a little bigger than the last. Capacity in litres. */
export const BUCKET_SIZES = [
  { w: 16, h: 12, capacity: 200 },
  { w: 18, h: 13, capacity: 240 },
  { w: 20, h: 14, capacity: 280 },
  { w: 22, h: 15, capacity: 320 },
] as const;

export const TOUCH_GAIN = 1.3;
export const TOUCH_FOLLOW = 0.25;

export const WATER_PER_TICK = 1.3;
/** Twice the old rate, so buckets with twice the water still fill in about the same time. */
export const REFILL_PER_TICK = 3;
export const DROPS_PER_TICK = 2;
export const DROP_GRAVITY = 0.22;
/** Heat a drop takes off a burning window for every frame it spends inside it. */
export const DROP_POWER = 0.016;

/** Fire grows to full heat in about 4 s and a window burns out after `BURNOUT_FRAMES` at full heat. */
export const FIRE_GROW = 0.004;
export const BURNOUT_FRAMES = 600;
export const SPREAD_CHANCE = 0.0018;
export const SPREAD_MIN_HEAT = 0.35;
export const WET_FRAMES = 240;
export const NEIGHBOUR_RANGE = 95;

export const SMOKE_DAMAGE = 0.065;
export const SMOKE_REACH = 120;
export const SMOKE_HALF_W = 28;

/** The complex is lost when this share of its value has burnt. */
export const LOSS_LIMIT = 0.5;

export const LEVEL_FRAMES = 1800;
export const MAX_LEVEL = 10;
export const LEVEL_BANNER_FRAMES = 120;
export const EMBER_START = 450;
export const EMBER_MIN = 90;
/** Each level multiplies the ember interval by this: a relaxed start and a rise you can feel. */
export const EMBER_DECAY = 0.82;
/** With nothing burning, the next ember comes this soon: there's always a fire to put out. */
export const EMBER_WHEN_CLEAR = 120;
export const SPREAD_PER_LEVEL = 0.05;

export const WIND_CHANGE_MIN = 480;
export const WIND_CHANGE_MAX = 900;
export const WIND_MAX = 0.5;
export const WIND_PER_LEVEL = 0.05;

/** French firefighters: a fire engine that sprays the front row for a while. */
export const CREW_FIRST = 2400;
export const CREW_EVERY = 3600;
export const CREW_SPRAY_FRAMES = 480;
export const CREW_SPEED = 2.2;
export const CREW_STOP_X = 470;
export const CREW_BANNER_FRAMES = 150;

export const ENDING_FRAMES = 110;
export const MAX_PARTICLES = 450;

/** Supply truck with a bigger bucket: waits on the road for `SUPPLY_WAIT` frames. */
export const SUPPLY_FIRST = 2100;
export const SUPPLY_EVERY = 3000;
export const SUPPLY_WAIT = 900;
export const SUPPLY_SPEED = 2.6;
export const SUPPLY_W = 92;
export const SUPPLY_BANNER_FRAMES = 150;
/** Where the bucket sits on the truck bed, from the truck's left edge. */
export const SUPPLY_CRATE = { x: 10, y: -30, w: 44, h: 18 };

export const QUOTE_FRAMES = 200;
export const QUOTE_EVERY = 420;
export const POPUP_FRAMES = 60;
export const HINT_FRAMES = 360;

export const DROP_BTN_W = 150;
export const DROP_BTN_H = 60;
export const DROP_BTN = { x: CANVAS_W - DROP_BTN_W - 20, y: CANVAS_H - DROP_BTN_H - 14 };
