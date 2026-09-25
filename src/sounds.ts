import type { SoundLayer } from "./shell/audio";
import { playLayers } from "./shell/audio";

export type SoundName =
  | "pour"
  | "plop"
  | "bubbleA"
  | "bubbleB"
  | "bubbleC"
  | "full"
  | "empty"
  | "hiss"
  | "crackleA"
  | "crackleB"
  | "ignite"
  | "lost"
  | "damage"
  | "alarm"
  | "levelUp"
  | "crew"
  | "truck"
  | "idle"
  | "brakes"
  | "hose"
  | "horn"
  | "upgrade"
  | "ending";

/** Every sound in the game. Play them with `playSound(name)`. */
const SOUNDS: Record<SoundName, readonly SoundLayer[]> = {
  pour: [{ kind: "noise", lowpass: 1800, duration: 0.12, volume: 0.035 }],
  plop: [
    { kind: "noise", lowpass: 900, duration: 0.3, volume: 0.12 },
    { kind: "tone", from: 320, to: 110, glide: 0.18, duration: 0.2, volume: 0.07 },
  ],
  bubbleA: [{ kind: "tone", from: 240, to: 520, glide: 0.06, duration: 0.08, volume: 0.035 }],
  bubbleB: [{ kind: "tone", from: 300, to: 640, glide: 0.05, duration: 0.07, volume: 0.03 }],
  bubbleC: [
    { kind: "tone", from: 200, to: 420, glide: 0.07, duration: 0.09, volume: 0.035 },
    { kind: "noise", lowpass: 600, duration: 0.08, volume: 0.02 },
  ],
  full: [
    { kind: "tone", from: 660, duration: 0.12, volume: 0.05 },
    { kind: "tone", from: 990, duration: 0.2, volume: 0.05, delay: 0.09 },
  ],
  empty: [
    { kind: "tone", wave: "square", from: 180, to: 110, duration: 0.1, volume: 0.04 },
    { kind: "noise", lowpass: 400, duration: 0.08, volume: 0.04 },
  ],
  crackleA: [{ kind: "noise", lowpass: 2600, duration: 0.05, volume: 0.03 }],
  crackleB: [
    { kind: "noise", lowpass: 4500, duration: 0.03, volume: 0.025 },
    { kind: "noise", lowpass: 3000, duration: 0.03, volume: 0.02, delay: 0.05 },
  ],
  truck: [
    { kind: "tone", wave: "square", from: 46, duration: 0.36, volume: 0.018 },
    { kind: "noise", lowpass: 220, duration: 0.36, volume: 0.04 },
  ],
  idle: [
    { kind: "tone", wave: "square", from: 38, duration: 0.5, volume: 0.012 },
    { kind: "noise", lowpass: 160, duration: 0.5, volume: 0.025 },
  ],
  brakes: [
    { kind: "noise", lowpass: 7000, duration: 0.55, volume: 0.06 },
    { kind: "tone", wave: "square", from: 90, to: 50, duration: 0.3, volume: 0.02 },
  ],
  hose: [{ kind: "noise", lowpass: 3200, duration: 0.14, volume: 0.03 }],
  alarm: [
    { kind: "tone", wave: "square", from: 880, duration: 0.07, volume: 0.03 },
    { kind: "tone", wave: "square", from: 880, duration: 0.07, volume: 0.03, delay: 0.14 },
  ],
  horn: [
    { kind: "tone", wave: "square", from: 330, duration: 0.3, volume: 0.035 },
    { kind: "tone", wave: "square", from: 415, duration: 0.3, volume: 0.03 },
    { kind: "tone", wave: "square", from: 330, duration: 0.25, volume: 0.035, delay: 0.38 },
    { kind: "tone", wave: "square", from: 415, duration: 0.25, volume: 0.03, delay: 0.38 },
  ],
  upgrade: [
    { kind: "tone", from: 523, duration: 0.1, volume: 0.07 },
    { kind: "tone", from: 659, duration: 0.1, volume: 0.07, delay: 0.08 },
    { kind: "tone", from: 784, duration: 0.1, volume: 0.07, delay: 0.16 },
    { kind: "tone", from: 1047, duration: 0.3, volume: 0.07, delay: 0.24 },
  ],
  hiss: [
    { kind: "noise", lowpass: 6000, duration: 0.35, volume: 0.07 },
    { kind: "tone", from: 900, to: 1400, glide: 0.1, duration: 0.15, volume: 0.04 },
  ],
  ignite: [
    { kind: "noise", lowpass: 500, duration: 0.4, volume: 0.1 },
    { kind: "tone", wave: "sawtooth", from: 90, to: 60, duration: 0.35, volume: 0.05 },
  ],
  // A flat burns out: collapse rumble and breaking glass
  lost: [
    { kind: "noise", lowpass: 1500, duration: 0.3, volume: 0.12 },
    { kind: "tone", wave: "square", from: 200, to: 60, duration: 0.35, volume: 0.05 },
    { kind: "tone", wave: "triangle", from: 2300, to: 1800, duration: 0.08, volume: 0.03, delay: 0.02 },
    { kind: "tone", wave: "triangle", from: 2900, to: 2400, duration: 0.06, volume: 0.025, delay: 0.07 },
    { kind: "noise", lowpass: 8000, duration: 0.12, volume: 0.04, delay: 0.02 },
  ],
  damage: [{ kind: "tone", wave: "square", from: 140, to: 110, duration: 0.08, volume: 0.03 }],
  levelUp: [
    { kind: "tone", from: 440, duration: 0.1, volume: 0.1 },
    { kind: "tone", from: 587, duration: 0.1, volume: 0.1, delay: 0.1 },
    { kind: "tone", from: 880, duration: 0.25, volume: 0.1, delay: 0.2 },
  ],
  // French two-tone siren ("pin-pon")
  crew: [
    { kind: "tone", wave: "triangle", from: 435, duration: 0.3, volume: 0.07 },
    { kind: "tone", wave: "triangle", from: 488, duration: 0.3, volume: 0.07, delay: 0.32 },
    { kind: "tone", wave: "triangle", from: 435, duration: 0.3, volume: 0.07, delay: 0.64 },
    { kind: "tone", wave: "triangle", from: 488, duration: 0.3, volume: 0.07, delay: 0.96 },
  ],
  ending: [
    { kind: "tone", wave: "sawtooth", from: 300, to: 50, duration: 1.2, volume: 0.12 },
    { kind: "noise", lowpass: 600, duration: 1, volume: 0.15 },
  ],
};

export const playSound = (name: SoundName) => playLayers(SOUNDS[name]);
