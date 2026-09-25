import { HELI_MAX_SPEED } from "./game/constants";
import type { GameData } from "./game/types";
import { getContext, isMuted } from "./shell/audio";

const VOLUME = 0.08;
const BLADE_HZ = 11;
const BLADE_HZ_PER_SPEED = 1.2;
/** Seconds the pitch and volume take to settle. */
const SMOOTHING = 0.15;

interface Nodes {
  hum: OscillatorNode;
  blades: OscillatorNode;
  filter: BiquadFilterNode;
  master: GainNode;
}

/**
 * Continuous rotor sound, synthesized: a low sawtooth through a low-pass filter, chopped by the
 * blade rate ("whop whop"). The blades speed up a little when the helicopter moves fast.
 */
export function createRotor() {
  let nodes: Nodes | null = null;

  const build = (): Nodes => {
    const c = getContext();
    const master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);

    const chop = c.createGain();
    chop.gain.value = 0.55;
    chop.connect(master);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 3;
    filter.connect(chop);

    const hum = c.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.value = 52;
    hum.connect(filter);

    const blades = c.createOscillator();
    blades.type = "square";
    blades.frequency.value = BLADE_HZ;
    const depth = c.createGain();
    depth.gain.value = 0.45;
    blades.connect(depth).connect(chop.gain);

    hum.start();
    blades.start();
    return { hum, blades, filter, master };
  };

  return {
    /** Call once per tick. `on` is false in menus and on pause, and the rotor fades out. */
    update(g: GameData, on: boolean) {
      const audible = on && !isMuted();
      if (!audible && !nodes) return;
      nodes ??= build();
      const now = getContext().currentTime;
      const speed = Math.min(1, Math.hypot(g.heli.vx, g.heli.vy) / HELI_MAX_SPEED);
      nodes.blades.frequency.setTargetAtTime(BLADE_HZ + speed * BLADE_HZ_PER_SPEED * 4, now, SMOOTHING);
      nodes.hum.frequency.setTargetAtTime(52 + speed * 10, now, SMOOTHING);
      nodes.filter.frequency.setTargetAtTime(380 + speed * 200, now, SMOOTHING);
      nodes.master.gain.setTargetAtTime(audible ? VOLUME : 0, now, audible ? SMOOTHING : 0.05);
    },
  };
}
