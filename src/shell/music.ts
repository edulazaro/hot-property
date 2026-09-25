import { getContext } from "./audio";
import { storage } from "./stage";

/** "random" shuffles the tracks, a number loops that track. */
export type MusicChoice = "random" | number;

export interface Music {
  trackCount: number;
  getChoice(): MusicChoice;
  setChoice(choice: MusicChoice): void;
  /** Fades in or out. The first call with `true` must come from a user gesture (autoplay rules). */
  setPlaying(on: boolean): void;
}

const FADE_IN = 0.15;
const FADE_OUT = 0.08;
const PAUSE_DELAY_MS = 400;

function parseChoice(value: string | null, count: number): MusicChoice {
  const index = Number(value);
  return value !== null && Number.isInteger(index) && index >= 0 && index < count ? index : "random";
}

/**
 * Background music from audio files, streamed through the Web Audio context so the volume
 * also applies on iOS. The player's choice is saved under `storageKey`.
 */
export function createMusic(
  tracks: readonly string[],
  { volume, storageKey }: { volume: number; storageKey: string },
): Music {
  let choice = parseChoice(storage.get(storageKey), tracks.length);
  let audio: HTMLAudioElement | null = null;
  let gain: GainNode | null = null;
  let current = -1;
  let pauseTimer = 0;

  const next = () => {
    if (choice !== "random") return choice;
    if (current < 0 || tracks.length < 2) return Math.floor(Math.random() * tracks.length);
    const pick = Math.floor(Math.random() * (tracks.length - 1));
    return pick >= current ? pick + 1 : pick;
  };

  const load = (a: HTMLAudioElement, index: number) => {
    current = index;
    a.src = tracks[index];
    a.loop = choice !== "random";
  };

  const element = () => {
    if (audio) return audio;
    const a = new Audio();
    a.preload = "auto";
    const c = getContext();
    gain = c.createGain();
    gain.gain.value = 0;
    c.createMediaElementSource(a).connect(gain).connect(c.destination);
    a.addEventListener("ended", () => {
      load(a, next());
      a.play().catch(() => {});
    });
    load(a, next());
    audio = a;
    return a;
  };

  return {
    trackCount: tracks.length,
    getChoice: () => choice,
    setChoice(value) {
      choice = value;
      storage.set(storageKey, String(value));
      if (!audio) return;
      audio.loop = value !== "random";
      if (value === "random" || value === current) return;
      const playing = !audio.paused;
      load(audio, value);
      if (playing) audio.play().catch(() => {});
    },
    setPlaying(on) {
      if (tracks.length === 0 || (!on && !audio)) return;
      const a = element();
      const now = getContext().currentTime;
      clearTimeout(pauseTimer);
      gain?.gain.cancelScheduledValues(now);
      gain?.gain.setTargetAtTime(on ? volume : 0, now, on ? FADE_IN : FADE_OUT);
      if (on) {
        if (a.paused) a.play().catch(() => {});
      } else {
        pauseTimer = window.setTimeout(() => a.pause(), PAUSE_DELAY_MS);
      }
    },
  };
}
