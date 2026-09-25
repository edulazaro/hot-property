import { storage } from "./stage";

/** One layer of a synthesized sound: an oscillator tone or filtered noise, fading out over `duration`. */
export type SoundLayer =
  | {
      kind: "tone";
      wave?: OscillatorType;
      from: number;
      to?: number;
      glide?: number;
      duration: number;
      volume: number;
      delay?: number;
    }
  | { kind: "noise"; lowpass?: number; duration: number; volume: number; delay?: number };

const MUTED_KEY = "muted";

let context: AudioContext | null = null;
let muted = storage.get(MUTED_KEY) === "1";

/** Shared Web Audio context, created on first use. */
export const getContext = () => (context ??= new AudioContext());

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  storage.set(MUTED_KEY, value ? "1" : "0");
}

/** Resumes audio. Call it from a user gesture, mobile browsers start it muted. */
export function unlockAudio() {
  const c = getContext();
  if (c.state === "suspended") c.resume().catch(() => {});
}

/** Plays every layer of a sound at once, unless muted. */
export function playLayers(layers: readonly SoundLayer[]) {
  if (muted) return;
  const c = getContext();
  for (const layer of layers) {
    const start = c.currentTime + (layer.delay ?? 0);
    const end = start + layer.duration;
    const gain = c.createGain();
    gain.gain.setValueAtTime(layer.volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    gain.connect(c.destination);

    if (layer.kind === "tone") {
      const osc = c.createOscillator();
      osc.type = layer.wave ?? "sine";
      osc.frequency.setValueAtTime(layer.from, start);
      if (layer.to) osc.frequency.exponentialRampToValueAtTime(layer.to, start + (layer.glide ?? layer.duration));
      osc.connect(gain);
      osc.start(start);
      osc.stop(end);
      continue;
    }

    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * layer.duration), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    if (layer.lowpass) {
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = layer.lowpass;
      noise.connect(filter);
      filter.connect(gain);
    } else {
      noise.connect(gain);
    }
    noise.start(start);
    noise.stop(end);
  }
}
