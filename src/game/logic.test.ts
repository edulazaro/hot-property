import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUCKET_SIZES,
  BURNOUT_FRAMES,
  CREW_FIRST,
  CREW_STOP_X,
  EMBER_WHEN_CLEAR,
  ENDING_FRAMES,
  HELI_MAX_Y,
  LEVEL_FRAMES,
  SUPPLY_FIRST,
  SUPPLY_WAIT,
  WET_FRAMES,
} from "./constants";
import { BUILDINGS, TOTAL_VALUE, WINDOWS } from "./layout";
import { bucketPos, lossShare, supplyCrate, update } from "./logic";
import { createGame, resetGame } from "./state";
import { TEXT } from "./texts";
import type { Controls, GameData, GameEvents } from "./types";

const t = TEXT.es;
const idle: Controls = { up: false, down: false, left: false, right: false, target: null, drop: false };

function setup() {
  const g = createGame();
  // No surprises unless a test asks for them
  g.emberTimer = g.crewTimer = g.speechTimer = Number.POSITIVE_INFINITY;
  g.windTimer = Number.POSITIVE_INFINITY;
  g.windTarget = 0;
  const ev = { sound: vi.fn(), vibrate: vi.fn(), end: vi.fn() } satisfies GameEvents;
  return { g, ev };
}

function run(g: GameData, ev: GameEvents, ticks: number, controls: Controls = idle) {
  for (let i = 0; i < ticks && !g.ended; i++) update(g, t, controls, ev);
}

function burn(g: GameData, i: number, heat = 0.5) {
  g.fire[i].state = "burning";
  g.fire[i].heat = heat;
}

/** Parks the bucket right above window `i` with no swing. */
function hoverOver(g: GameData, i: number) {
  const w = WINDOWS[i];
  g.heli.x = w.cx;
  g.heli.y = w.y - 70;
  g.heli.vx = g.heli.vy = g.heli.swing = g.heli.swingV = 0;
}

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("layout", () => {
  it("has every window inside its building and no two windows overlapping", () => {
    for (const w of WINDOWS) {
      const b = BUILDINGS[w.building];
      expect(w.x).toBeGreaterThanOrEqual(b.x);
      expect(w.x + w.w).toBeLessThanOrEqual(b.x + b.w);
    }
    for (const a of WINDOWS) {
      for (const b of WINDOWS) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
  });

  it("links neighbours in both directions and prices the back rows higher", () => {
    const front = WINDOWS.filter((w) => w.row === 0);
    const back = WINDOWS.filter((w) => w.row === 2);
    expect(Math.max(...front.map((w) => w.price))).toBeLessThan(Math.min(...back.map((w) => w.price)));
    WINDOWS.forEach((w, i) => {
      for (const n of w.neighbours) expect(WINDOWS[n.index].neighbours.some((m) => m.index === i)).toBe(true);
    });
  });
});

describe("fire", () => {
  it("heats up and burns out, adding to the losses", () => {
    const { g, ev } = setup();
    burn(g, 0, 1);
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    run(g, ev, BURNOUT_FRAMES + 1);
    expect(g.fire[0].state).toBe("burnt");
    expect(g.lost).toBe(WINDOWS[0].price);
    expect(ev.sound).toHaveBeenCalledWith("lost");
  });

  it("spreads upwards more than downwards", () => {
    const counts = { up: 0, down: 0 };
    const w = WINDOWS.findIndex((x) => x.building === 6 && x.floor === 1 && x.col === 1);
    const up = WINDOWS.findIndex((x) => x.building === 6 && x.floor === 2 && x.col === 1);
    const down = WINDOWS.findIndex((x) => x.building === 6 && x.floor === 0 && x.col === 1);
    vi.restoreAllMocks();
    for (let r = 0; r < 60; r++) {
      const { g, ev } = setup();
      burn(g, w, 1);
      run(g, ev, 300);
      if (g.fire[up].state !== "intact") counts.up++;
      if (g.fire[down].state !== "intact") counts.down++;
    }
    expect(counts.up).toBeGreaterThan(counts.down);
  });

  it("doesn't spread to wet windows", () => {
    const { g, ev } = setup();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const w = WINDOWS[76];
    burn(g, 76, 1);
    for (const n of w.neighbours) g.fire[n.index].wet = WET_FRAMES;
    run(g, ev, 10);
    for (const n of w.neighbours) expect(g.fire[n.index].state).toBe("intact");
  });

  it("ends the game once half the value has burnt, after the ending animation", () => {
    const { g, ev } = setup();
    g.lost = TOTAL_VALUE * 0.49;
    burn(g, 0, 1);
    g.fire[0].fullFor = BURNOUT_FRAMES - 1;
    g.lost = TOTAL_VALUE * 0.5 - WINDOWS[0].price / 2;
    run(g, ev, 1);
    expect(lossShare(g)).toBeGreaterThanOrEqual(0.5);
    expect(g.ending?.reason).toBe("lost");
    expect(ev.end).not.toHaveBeenCalled();
    run(g, ev, ENDING_FRAMES);
    expect(ev.end).toHaveBeenCalledWith("lost");
  });
});

describe("water", () => {
  it("dropping on a burning window puts it out and counts its price as saved", () => {
    const { g, ev } = setup();
    const i = 77;
    burn(g, i, 0.3);
    hoverOver(g, i);
    run(g, ev, 90, { ...idle, drop: true });
    expect(g.fire[i].state).toBe("intact");
    expect(g.fire[i].wet).toBeGreaterThan(0);
    expect(g.saved).toBe(WINDOWS[i].price);
    expect(g.heli.water).toBeLessThan(BUCKET_SIZES[0].capacity);
    expect(ev.sound).toHaveBeenCalledWith("hiss");
  });

  it("an empty bucket drops nothing", () => {
    const { g, ev } = setup();
    g.heli.water = 0;
    run(g, ev, 5, { ...idle, drop: true });
    expect(g.drops).toHaveLength(0);
    expect(g.heli.dropping).toBe(false);
  });

  it("dipping the bucket in the river refills it", () => {
    const { g, ev } = setup();
    g.heli.water = 0;
    g.heli.y = HELI_MAX_Y;
    run(g, ev, 80, { ...idle, down: true });
    expect(g.heli.refilling).toBe(true);
    expect(g.heli.water).toBe(BUCKET_SIZES[0].capacity);
    expect(ev.sound).toHaveBeenCalledWith("plop");
    expect(ev.sound).toHaveBeenCalledWith("full");
  });

  it("the bucket hangs below the helicopter and swings back when it moves", () => {
    const { g, ev } = setup();
    const still = bucketPos(g.heli);
    expect(still.y).toBeGreaterThan(g.heli.y);
    run(g, ev, 20, { ...idle, right: true });
    expect(g.heli.swing).toBeLessThan(0);
  });
});

describe("helicopter", () => {
  it("smoke above a fire damages it, clean air repairs it", () => {
    const { g, ev } = setup();
    const i = 77;
    burn(g, i, 1);
    hoverOver(g, i);
    run(g, ev, 30);
    expect(g.heli.inSmoke).toBe(true);
    const damaged = g.heli.hp;
    expect(damaged).toBeLessThan(100);
    g.fire[i].state = "intact";
    run(g, ev, 30);
    expect(g.heli.hp).toBeGreaterThan(damaged);
  });

  it("at zero health it goes down and the game ends", () => {
    const { g, ev } = setup();
    g.heli.hp = 0.01;
    burn(g, 77, 1);
    hoverOver(g, 77);
    run(g, ev, ENDING_FRAMES + 2);
    expect(ev.end).toHaveBeenCalledWith("heli");
  });
});

describe("difficulty", () => {
  it("goes up a level every LEVEL_FRAMES with a banner", () => {
    const { g, ev } = setup();
    g.frame = LEVEL_FRAMES - 1;
    run(g, ev, 1);
    expect(g.level).toBe(2);
    expect(g.levelBanner).toBeGreaterThan(0);
    expect(ev.sound).toHaveBeenCalledWith("levelUp");
  });

  it("with everything out, a new fire starts within a second", () => {
    const { g, ev } = setup();
    run(g, ev, EMBER_WHEN_CLEAR + 1);
    expect(g.fire.filter((f) => f.state === "burning").length).toBeGreaterThan(0);
  });

  it("embers start new fires in dry windows", () => {
    const { g, ev } = setup();
    g.emberTimer = 1;
    run(g, ev, 1);
    expect(g.fire.filter((f) => f.state === "burning")).toHaveLength(1);
    expect(ev.sound).toHaveBeenCalledWith("ignite");
  });
});

describe("French crew", () => {
  it("drives in, sprays the front row and puts out a fire there", () => {
    const { g, ev } = setup();
    g.crewTimer = CREW_FIRST;
    const i = WINDOWS.findIndex((w) => w.row === 0 && w.floor === 0 && w.building === 6);
    run(g, ev, CREW_FIRST);
    expect(g.crew?.phase).toBe("arriving");
    expect(ev.sound).toHaveBeenCalledWith("crew");
    run(g, ev, 400);
    expect(g.crew?.x).toBeGreaterThanOrEqual(CREW_STOP_X);
    burn(g, i, 0.2);
    run(g, ev, 200);
    expect(g.fire[i].state).toBe("intact");
  });
});

describe("supply truck", () => {
  function waitingTruck() {
    const { g, ev } = setup();
    g.supplyTimer = SUPPLY_FIRST;
    run(g, ev, SUPPLY_FIRST + 400);
    return { g, ev };
  }

  it("drives in and waits on the road", () => {
    const { g, ev } = waitingTruck();
    expect(g.supply?.phase).toBe("waiting");
    expect(ev.sound).toHaveBeenCalledWith("horn");
  });

  it("touching its bed swaps for a slightly bigger, full bucket", () => {
    const { g, ev } = waitingTruck();
    const supply = g.supply;
    if (!supply) throw new Error("no truck");
    const crate = supplyCrate(supply.x);
    g.heli.water = 10;
    g.heli.x = crate.x + crate.w / 2;
    g.heli.y = crate.y + crate.h / 2 - 44;
    g.heli.swing = g.heli.swingV = g.heli.vx = g.heli.vy = 0;
    run(g, ev, 1);
    expect(g.heli.bucket).toBe(1);
    expect(g.heli.water).toBe(BUCKET_SIZES[1].capacity);
    expect(BUCKET_SIZES[1].w - BUCKET_SIZES[0].w).toBeLessThanOrEqual(2);
    expect(g.supply?.phase).toBe("leaving");
    expect(ev.sound).toHaveBeenCalledWith("upgrade");
  });

  it("leaves if nobody picks the bucket up, and stops coming at the biggest size", () => {
    const { g, ev } = waitingTruck();
    run(g, ev, SUPPLY_WAIT + 1);
    expect(g.supply?.phase).toBe("leaving");
    const { g: g2, ev: ev2 } = setup();
    g2.heli.bucket = BUCKET_SIZES.length - 1;
    g2.supplyTimer = 1;
    run(g2, ev2, 5);
    expect(g2.supply).toBeNull();
  });
});

describe("resetGame", () => {
  it("starts with one fire in the front row", () => {
    const g = createGame();
    resetGame(g);
    const burning = g.fire.flatMap((f, i) => (f.state === "burning" ? [i] : []));
    expect(burning).toHaveLength(1);
    expect(WINDOWS[burning[0]].row).toBe(0);
  });
});
