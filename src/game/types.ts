import type { SoundName } from "../sounds";

export type EndReason = "lost" | "heli";

/** Side effects the game logic asks the shell to perform. */
export interface GameEvents {
  sound: (name: SoundName) => void;
  vibrate: (pattern: number | number[]) => void;
  end: (reason: EndReason) => void;
}

/** Player input for one tick: held directions or a touch drag target, and whether water is being dropped. */
export interface Controls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  target: { x: number; y: number } | null;
  drop: boolean;
}

export type FireState = "intact" | "burning" | "burnt";

/** What changes on each window during a game. The geometry lives in `layout.ts`. */
export interface WindowFire {
  state: FireState;
  heat: number;
  fullFor: number;
  wet: number;
}

export interface Helicopter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  water: number;
  /** Index in `BUCKET_SIZES`. */
  bucket: number;
  dropping: boolean;
  refilling: boolean;
  inSmoke: boolean;
  /** 1 facing right, -1 facing left. */
  facing: 1 | -1;
  /** Bucket swing angle and angular speed, in radians. */
  swing: number;
  swingV: number;
}

export interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type ParticleKind = "smoke" | "ember" | "steam" | "splash" | "spark";

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface Popup {
  kind: "saved" | "lost";
  text: string;
  x: number;
  y: number;
  life: number;
}

/** The French fire engine: drives in, sprays the front row, drives off. */
export interface Crew {
  x: number;
  phase: "arriving" | "spraying" | "leaving";
  timer: number;
}

/** Fire service pickup bringing the next bucket size: drives in, waits, drives off. */
export interface Supply {
  x: number;
  stopX: number;
  phase: "arriving" | "waiting" | "leaving";
  timer: number;
}

/** 0 and 1 are the old men, 2 the estate agent. */
export interface Speech {
  who: 0 | 1 | 2;
  text: string;
  timer: number;
}

/** Whole mutable game state, in canvas coordinates. */
export interface GameData {
  frame: number;
  ended: boolean;
  /** Game over in progress: the helicopter goes down or the complex burns, then the game ends. */
  ending: { reason: EndReason; timer: number } | null;
  level: number;
  levelBanner: number;

  heli: Helicopter;
  drops: Drop[];
  fire: WindowFire[];
  /** Thousands of euros. */
  saved: number;
  lost: number;

  wind: number;
  windTarget: number;
  windTimer: number;
  emberTimer: number;

  crew: Crew | null;
  crewTimer: number;
  crewBanner: number;

  supply: Supply | null;
  supplyTimer: number;
  supplyBanner: number;

  speech: Speech | null;
  speechTimer: number;

  particles: Particle[];
  popups: Popup[];
  shake: number;
}
