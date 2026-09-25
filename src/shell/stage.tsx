import type { ReactElement, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "./i18n";

/** True in the itch.io build (`--mode itch`), where the page is only the game. */
export const EMBED = import.meta.env.MODE === "itch";

/** UI strings shared by every game (menus, stage controls). */
export const STAGE_TEXT: Record<Locale, Record<string, string>> = {
  es: {
    play: "Jugar",
    playAgain: "Jugar otra vez",
    settings: "Ajustes",
    language: "Idioma",
    menu: "Menú",
    resume: "Continuar",
    quit: "Salir al menú",
    back: "Volver",
    paused: "Pausa",
    tapToPlay: "Toca para jugar",
    tapToResume: "Toca para continuar",
    exit: "Salir",
    pause: "Pausa",
    fullscreen: "Pantalla completa",
    exitFullscreen: "Salir de pantalla completa",
    mute: "Silenciar",
    unmute: "Activar el sonido",
    soundOn: "Sonido: sí",
    soundOff: "Sonido: no",
    music: "Música",
    musicRandom: "Aleatoria",
    track: "Tema",
    rotate: "Gira el móvil",
    rotateHint: "El juego se juega en horizontal",
  },
  ca: {
    play: "Jugar",
    playAgain: "Tornar a jugar",
    settings: "Configuració",
    language: "Idioma",
    menu: "Menú",
    resume: "Continuar",
    quit: "Sortir al menú",
    back: "Tornar",
    paused: "Pausa",
    tapToPlay: "Toca per jugar",
    tapToResume: "Toca per continuar",
    exit: "Sortir",
    pause: "Pausa",
    fullscreen: "Pantalla completa",
    exitFullscreen: "Surt de la pantalla completa",
    mute: "Silenciar",
    unmute: "Activar el so",
    soundOn: "So: sí",
    soundOff: "So: no",
    music: "Música",
    musicRandom: "Aleatòria",
    track: "Tema",
    rotate: "Gira el mòbil",
    rotateHint: "El joc es juga en horitzontal",
  },
  en: {
    play: "Play",
    settings: "Settings",
    language: "Language",
    playAgain: "Play again",
    menu: "Menu",
    resume: "Resume",
    quit: "Quit to menu",
    back: "Back",
    paused: "Paused",
    tapToPlay: "Tap to play",
    tapToResume: "Tap to continue",
    exit: "Exit",
    pause: "Pause",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    mute: "Mute",
    unmute: "Unmute",
    soundOn: "Sound: on",
    soundOff: "Sound: off",
    music: "Music",
    musicRandom: "Random",
    track: "Track",
    rotate: "Rotate your phone",
    rotateHint: "This game is played in landscape",
  },
};

// ─── Game loop ───────────────────────────────────────────

const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 5;

/** Runs `tick` at a fixed 60 Hz on any refresh rate. Return false from `tick` to stop. */
export function startFixedLoop(tick: () => boolean, isPaused: () => boolean): () => void {
  let id = 0;
  let last = performance.now();
  let acc = 0;
  const frame = (now: number) => {
    let dt = now - last;
    last = now;
    if (isPaused()) {
      acc = 0;
    } else {
      if (Math.abs(dt - STEP_MS) < 1) dt = STEP_MS;
      acc = Math.min(acc + dt, STEP_MS * MAX_STEPS_PER_FRAME);
      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        if (!tick()) return;
      }
    }
    id = requestAnimationFrame(frame);
  };
  id = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(id);
}

// ─── Canvas ──────────────────────────────────────────────

/** Matches the canvas backing store to its on-screen size (max 2x) and scales the context to logical units. */
export function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
  const scale = Math.min(2, Math.max(1, (canvas.clientWidth * window.devicePixelRatio) / width));
  const bw = Math.round(width * scale);
  const bh = Math.round(height * scale);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(bw / width, 0, 0, bh / height, 0, 0);
}

export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

// ─── Storage ─────────────────────────────────────────────

/** localStorage that fails silently when storage is blocked (private mode, sandboxed iframes). */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      return;
    }
  },
};

export const loadHighScore = (key: string) => parseInt(storage.get(key) ?? "0", 10) || 0;

export const saveHighScore = (key: string, value: number) => storage.set(key, String(value));

// ─── Vibration ───────────────────────────────────────────

let canVibrate: boolean | null = null;

/** Vibrates on Android. No-op elsewhere (iOS Safari has no Vibration API). */
export function vibrate(pattern: number | number[]) {
  canVibrate ??= typeof navigator.vibrate === "function" && isTouchDevice();
  if (canVibrate) navigator.vibrate(pattern);
}

// ─── Pause ───────────────────────────────────────────────

/** Pauses when the window loses focus, the tab is hidden or immersive mode ends mid-game. */
export function usePause(playing: boolean, immersive: boolean) {
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const onBlur = () => setUserPaused(true);
    const onVisibility = () => {
      if (document.hidden) setUserPaused(true);
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playing]);

  const wasImmersive = useRef(immersive);
  useEffect(() => {
    if (wasImmersive.current && !immersive && playing) setUserPaused(true);
    wasImmersive.current = immersive;
  }, [immersive, playing]);

  return [userPaused, setUserPaused] as const;
}

// ─── Immersive mode ──────────────────────────────────────

type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

/** Fills the screen at 16:9: Fullscreen API where available, fixed overlay otherwise (iPhone). */
export function useImmersive(stageRef: RefObject<HTMLElement | null>) {
  const [immersive, setImmersive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const exit = useCallback(() => {
    setImmersive(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setFullscreen(active);
      if (!active) setImmersive(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!immersive) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [immersive]);

  const enter = useCallback(() => {
    setImmersive(true);
    const el = stageRef.current;
    if (!el?.requestFullscreen || document.fullscreenElement) return;
    el.requestFullscreen({ navigationUI: "hide" })
      .then(() => (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape"))
      .catch(() => {});
  }, [stageRef]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) exit();
    else enter();
  }, [enter, exit]);

  return { immersive: EMBED || immersive, portrait, fullscreen, enter, exit, toggleFullscreen };
}

export type ImmersiveView = ReturnType<typeof useImmersive>;

const IMMERSIVE_WIDTH = "min(100%, calc((100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 16 / 9))";

const ICON_BUTTON = "flex h-9 w-9 items-center justify-center border border-white/40 bg-black/60 text-white";

/**
 * Game container: inline 16:9 box on the page, or fixed fullscreen stage when immersive.
 * Touch devices outside immersive mode get `launcher` instead of the controls.
 */
export function Stage({
  stageRef,
  view,
  onPause,
  muted,
  onToggleMute,
  locale,
  launcher,
  children,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  view: ImmersiveView;
  onPause?: () => void;
  muted: boolean;
  onToggleMute: () => void;
  locale: Locale;
  launcher: ReactNode;
  children: ReactNode;
}): ReactElement {
  const s = STAGE_TEXT[locale];
  const touch = isTouchDevice();
  const showLauncher = touch && !view.immersive;
  const showRotateHint = touch && view.immersive && view.portrait;
  return (
    <div
      ref={stageRef}
      className={
        view.immersive
          ? "fixed inset-0 z-50 flex touch-none items-center justify-center overscroll-none bg-black pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
          : "relative mt-6"
      }
    >
      <div
        className="relative w-full select-none [-webkit-touch-callout:none]"
        style={{ aspectRatio: "16 / 9", width: view.immersive ? IMMERSIVE_WIDTH : undefined }}
      >
        {children}
        {showLauncher ? (
          launcher
        ) : (
          <div className="absolute top-[7%] left-[1.5%] z-40 flex flex-col gap-2">
            {touch && !EMBED ? (
              <button type="button" onClick={view.exit} aria-label={s.exit} className={ICON_BUTTON}>
                <ExitIcon />
              </button>
            ) : (
              <button
                type="button"
                onClick={view.toggleFullscreen}
                aria-label={view.fullscreen ? s.exitFullscreen : s.fullscreen}
                className={ICON_BUTTON}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d={
                      view.fullscreen
                        ? "M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"
                        : "M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
                    }
                  />
                </svg>
              </button>
            )}
            {onPause && (
              <button type="button" onClick={onPause} aria-label={s.pause} className={ICON_BUTTON}>
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <rect x="3" y="2" width="3.5" height="12" />
                  <rect x="9.5" y="2" width="3.5" height="12" />
                </svg>
              </button>
            )}
            <MuteButton muted={muted} onToggle={onToggleMute} locale={locale} />
          </div>
        )}
      </div>
      {showRotateHint && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center text-white">
          {!EMBED && (
            <button
              type="button"
              onClick={view.exit}
              aria-label={s.exit}
              className={`absolute top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.5rem,env(safe-area-inset-left))] ${ICON_BUTTON}`}
            >
              <ExitIcon />
            </button>
          )}
          <svg
            aria-hidden="true"
            viewBox="0 0 48 48"
            className="h-14 w-14 animate-[rotate-hint_2s_ease-in-out_infinite]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="15" y="5" width="18" height="38" rx="3" />
            <path d="M21 38h6" />
          </svg>
          <p className="text-sm font-bold uppercase tracking-wider">{s.rotate}</p>
          <p className="text-xs text-gray-400">{s.rotateHint}</p>
        </div>
      )}
    </div>
  );
}

function ExitIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

function MuteButton({
  muted,
  onToggle,
  locale,
}: {
  muted: boolean;
  onToggle: () => void;
  locale: Locale;
}): ReactElement {
  const s = STAGE_TEXT[locale];
  const action = muted ? s.unmute : s.mute;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={action}
      aria-pressed={muted}
      title={`${action} (M)`}
      className={ICON_BUTTON}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" stroke="none" />
        {muted ? <path d="M11 6l4 4M15 6l-4 4" /> : <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9" />}
      </svg>
    </button>
  );
}
