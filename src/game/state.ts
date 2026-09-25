import {
  BUCKET_SIZES,
  CANVAS_W,
  CREW_FIRST,
  EMBER_START,
  HELI_MAX_HP,
  QUOTE_EVERY,
  SUPPLY_FIRST,
  WIND_CHANGE_MIN,
} from "./constants";
import { WINDOWS } from "./layout";
import type { GameData } from "./types";

export function createGame(): GameData {
  return {
    frame: 0,
    ended: false,
    ending: null,
    level: 1,
    levelBanner: 0,

    heli: {
      x: CANVAS_W / 2,
      y: 110,
      vx: 0,
      vy: 0,
      hp: HELI_MAX_HP,
      water: BUCKET_SIZES[0].capacity,
      bucket: 0,
      dropping: false,
      refilling: false,
      inSmoke: false,
      facing: 1,
      swing: 0,
      swingV: 0,
    },
    drops: [],
    fire: WINDOWS.map(() => ({ state: "intact" as const, heat: 0, fullFor: 0, wet: 0 })),
    saved: 0,
    lost: 0,

    wind: 0,
    windTarget: 0.2,
    windTimer: WIND_CHANGE_MIN,
    emberTimer: EMBER_START,

    crew: null,
    crewTimer: CREW_FIRST,
    crewBanner: 0,

    supply: null,
    supplyTimer: SUPPLY_FIRST,
    supplyBanner: 0,

    speech: null,
    speechTimer: QUOTE_EVERY / 2,

    particles: [],
    popups: [],
    shake: 0,
  };
}

/** Ground floor of the middle front building, where the fire starts. */
const FIRST_FIRE = WINDOWS.findIndex((w) => w.building === 6 && w.floor === 0 && w.col === 1);

/** Puts `g` back at the start of a game with the first fire already burning. */
export function resetGame(g: GameData, firstFire = FIRST_FIRE) {
  Object.assign(g, createGame());
  g.fire[firstFire].state = "burning";
  g.fire[firstFire].heat = 0.3;
}
