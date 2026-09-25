import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CANVAS_H,
  CANVAS_W,
  DROP_BTN,
  DROP_BTN_H,
  DROP_BTN_W,
  HELI_MAX_X,
  HELI_MAX_Y,
  HELI_MIN_X,
  HELI_MIN_Y,
  TOUCH_GAIN,
} from "./game/constants";
import { clamp, flatsStanding, update } from "./game/logic";
import { createGame, resetGame } from "./game/state";
import { formatMillions, TEXT } from "./game/texts";
import type { Controls, EndReason, GameEvents } from "./game/types";
import { music } from "./music";
import { render } from "./render";
import { createRotor } from "./rotor";
import { isMuted, setMuted, unlockAudio } from "./shell/audio";
import type { Locale } from "./shell/i18n";
import { LocaleSwitch, useLocale } from "./shell/i18n";
import type { HelpItem } from "./shell/menu";
import { HelpList, MenuButton, MenuLayer, MenuTitle, OptionSwitch } from "./shell/menu";
import type { MusicChoice } from "./shell/music";
import {
  EMBED,
  fitCanvas,
  isTouchDevice,
  loadHighScore,
  STAGE_TEXT,
  Stage,
  saveHighScore,
  startFixedLoop,
  useImmersive,
  usePause,
  vibrate,
} from "./shell/stage";
import { playSound } from "./sounds";

const RESTART_DELAY_MS = 700;
const HIGHSCORE_KEY = "hot-property-highscore";
const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "Enter",
]);

/** Touch drag in progress: the helicopter flies towards the target, which follows the finger's movement. */
interface Drag {
  id: number;
  lastX: number;
  lastY: number;
  targetX: number;
  targetY: number;
}

function readControls(keys: ReadonlySet<string>, drag: Drag | null, dropHeld: boolean): Controls {
  return {
    up: keys.has("ArrowUp") || keys.has("KeyW"),
    down: keys.has("ArrowDown") || keys.has("KeyS"),
    left: keys.has("ArrowLeft") || keys.has("KeyA"),
    right: keys.has("ArrowRight") || keys.has("KeyD"),
    target: drag && { x: drag.targetX, y: drag.targetY },
    drop: dropHeld || keys.has("Space") || keys.has("Enter"),
  };
}

const onDropButton = (x: number, y: number) =>
  x > DROP_BTN.x - 10 && x < DROP_BTN.x + DROP_BTN_W + 10 && y > DROP_BTN.y - 10 && y < DROP_BTN.y + DROP_BTN_H + 10;

export default function HotProperty({ locale: hostLocale }: { locale?: Locale } = {}) {
  const { locale, setLocale, canChoose } = useLocale(hostLocale);
  const t = TEXT[locale];
  const s = STAGE_TEXT[locale];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isTouch] = useState(isTouchDevice);
  const view = useImmersive(stageRef);
  const { immersive, portrait, enter } = view;
  const [game] = useState(createGame);
  const [rotor] = useState(createRotor);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [subScreen, setSubScreen] = useState<"help" | "settings" | null>(null);
  const [result, setResult] = useState({ score: 0, flats: 0, reason: "lost" as EndReason, newRecord: false });
  const [soundOff, setSoundOff] = useState(isMuted);
  const [musicChoice, setMusicChoice] = useState(music.getChoice);
  const highScoreRef = useRef(loadHighScore(HIGHSCORE_KEY));
  const endedAtRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const dragRef = useRef<Drag | null>(null);
  const dropTouchRef = useRef<number | null>(null);
  const mouseDropRef = useRef(false);

  const [userPaused, setUserPaused] = usePause(gameState === "playing", immersive);
  const paused = gameState === "playing" && (userPaused || (isTouch && (!immersive || portrait)));
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const musicOn = gameState === "playing" && !paused && !soundOff;
  useEffect(() => music.setPlaying(musicOn), [musicOn]);

  // The loop keeps the rotor running; anywhere else it fades out
  useEffect(() => {
    if (gameState !== "playing" || paused || soundOff) rotor.update(game, false);
  }, [rotor, game, gameState, paused, soundOff]);

  const events = useMemo<GameEvents>(
    () => ({
      sound: playSound,
      vibrate,
      end: (reason) => {
        const score = Math.round(game.saved);
        const newRecord = score > highScoreRef.current;
        if (newRecord) {
          highScoreRef.current = score;
          saveHighScore(HIGHSCORE_KEY, score);
        }
        setResult({ score, flats: flatsStanding(game), reason, newRecord });
        endedAtRef.current = performance.now();
        setGameState("gameover");
      },
    }),
    [game],
  );

  const clearInput = useCallback(() => {
    keysRef.current.clear();
    dragRef.current = null;
    dropTouchRef.current = null;
    mouseDropRef.current = false;
  }, []);

  const startGame = useCallback(() => {
    resetGame(game);
    clearInput();
    setUserPaused(false);
    setSubScreen(null);
    setGameState("playing");
  }, [game, clearInput, setUserPaused]);

  const play = useCallback(() => {
    if (performance.now() - endedAtRef.current < RESTART_DELAY_MS) return;
    unlockAudio();
    if (!isMuted()) music.setPlaying(true);
    if (isTouch) enter();
    startGame();
  }, [isTouch, enter, startGame]);

  const pause = useCallback(() => {
    clearInput();
    setUserPaused(true);
  }, [clearInput, setUserPaused]);

  const resume = useCallback(() => {
    setUserPaused(false);
    if (isTouch) enter();
  }, [setUserPaused, isTouch, enter]);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setSoundOff(next);
  }, []);

  const changeMusic = useCallback((choice: MusicChoice) => {
    music.setChoice(choice);
    setMusicChoice(choice);
  }, []);

  const openGame = useCallback(() => {
    unlockAudio();
    enter();
  }, [enter]);

  const toMenu = useCallback(() => {
    game.ended = true;
    clearInput();
    setUserPaused(false);
    setSubScreen(null);
    setGameState("menu");
  }, [game, clearInput, setUserPaused]);

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) * (CANVAS_W / rect.width), y: (clientY - rect.top) * (CANVAS_H / rect.height) };
  }, []);

  // Game loop. In the menu it draws a single frame as the backdrop
  useEffect(() => {
    if (gameState === "gameover") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const info = { t, isTouch, playing: gameState === "playing", highScore: highScoreRef.current };
    const step = () => {
      const dropHeld = dropTouchRef.current !== null || mouseDropRef.current;
      update(game, t, readControls(keysRef.current, dragRef.current, dropHeld), events);
      rotor.update(game, gameState === "playing" && !game.ended);
      if (game.ended) return false;
      fitCanvas(canvas, ctx, CANVAS_W, CANVAS_H);
      render(ctx, game, info);
      return true;
    };
    if (gameState === "menu") {
      resetGame(game);
      step();
      const observer = new ResizeObserver(() => {
        fitCanvas(canvas, ctx, CANVAS_W, CANVAS_H);
        render(ctx, game, info);
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    return startFixedLoop(step, () => pausedRef.current);
  }, [game, rotor, gameState, isTouch, t, events]);

  // Keyboard: held keys fly and drop water, the rest are one-shot actions
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "KeyM") {
        if (!e.repeat) toggleMute();
        return;
      }
      if (subScreen) {
        if (e.code === "Escape" || e.code === "Backspace") {
          e.preventDefault();
          setSubScreen(null);
        }
        return;
      }
      const playing = gameState === "playing";
      if (playing && (e.code === "KeyP" || e.code === "Escape")) {
        e.preventDefault();
        if (paused && e.code === "KeyP") resume();
        else pause();
        return;
      }
      if (!GAME_KEYS.has(e.code)) return;
      if (!playing) {
        if (e.code !== "Space" && e.code !== "Enter") return;
        if ((e.target as HTMLElement).closest("a, button")) return;
        e.preventDefault();
        if (!e.repeat) play();
        return;
      }
      e.preventDefault();
      if (paused) {
        if (!e.repeat && (e.code === "Space" || e.code === "Enter")) resume();
        return;
      }
      keysRef.current.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    const onBlur = () => clearInput();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [gameState, subScreen, paused, play, pause, resume, toggleMute, clearInput]);

  // Touch: the WATER button drops water, any other finger flies with a relative drag
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onStart = (e: TouchEvent) => {
      if (gameState !== "playing") return;
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        const p = toCanvas(touch.clientX, touch.clientY);
        if (onDropButton(p.x, p.y)) {
          dropTouchRef.current = touch.identifier;
        } else if (!dragRef.current) {
          dragRef.current = {
            id: touch.identifier,
            lastX: p.x,
            lastY: p.y,
            targetX: game.heli.x,
            targetY: game.heli.y,
          };
        }
      }
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const drag = dragRef.current;
      if (!drag) return;
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== drag.id) continue;
        const p = toCanvas(touch.clientX, touch.clientY);
        drag.targetX = clamp(drag.targetX + (p.x - drag.lastX) * TOUCH_GAIN, HELI_MIN_X, HELI_MAX_X);
        drag.targetY = clamp(drag.targetY + (p.y - drag.lastY) * TOUCH_GAIN, HELI_MIN_Y, HELI_MAX_Y);
        drag.lastX = p.x;
        drag.lastY = p.y;
      }
    };
    const onEnd = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === dropTouchRef.current) dropTouchRef.current = null;
        if (touch.identifier === dragRef.current?.id) dragRef.current = null;
      }
    };
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);
    canvas.addEventListener("touchcancel", onEnd);
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
      canvas.removeEventListener("touchcancel", onEnd);
    };
  }, [game, gameState, toCanvas]);

  const helpItems: HelpItem[] = [
    { chip: isTouch ? t.chipDrag : t.chipFly, chipClass: "bg-white text-black", text: t.helpFly },
    { chip: isTouch ? t.chipDropTouch : t.chipDrop, chipClass: "bg-sky-500 text-white", text: t.helpDrop },
    { chip: t.chipRiver, chipClass: "bg-blue-800 text-white", text: t.helpRiver },
    { chip: t.chipSmoke, chipClass: "bg-gray-600 text-white", text: t.helpSmoke },
    { chip: t.chipCrew, chipClass: "bg-red-600 text-white", text: t.helpCrew },
    { chip: t.chipSupply, chipClass: "bg-amber-500 text-black", text: t.helpSupply },
  ];
  const soundLabel = soundOff ? s.soundOff : s.soundOn;
  const musicOptions: { value: MusicChoice; label: string }[] = [
    { value: "random", label: s.musicRandom },
    ...Array.from({ length: music.trackCount }, (_, i) => ({ value: i, label: `${s.track} ${i + 1}` })),
  ];

  let screen: ReactNode = null;
  if (subScreen === "help") {
    screen = (
      <MenuLayer dim="bg-black/85">
        <MenuTitle title={t.howTo} />
        <HelpList items={helpItems} />
        <p className="max-w-2xl text-xs text-gray-400">{t.helpFooter}</p>
        {!isTouch && <p className="text-xs text-gray-400">{t.helpKeys}</p>}
        <div className="mt-2">
          <MenuButton onClick={() => setSubScreen(null)}>{s.back}</MenuButton>
        </div>
      </MenuLayer>
    );
  } else if (subScreen === "settings") {
    screen = (
      <MenuLayer dim="bg-black/85">
        <MenuTitle title={s.settings} />
        <MenuButton onClick={toggleMute}>{soundLabel}</MenuButton>
        {!isTouch && (
          <MenuButton onClick={view.toggleFullscreen}>{view.fullscreen ? s.exitFullscreen : s.fullscreen}</MenuButton>
        )}
        <OptionSwitch label={s.music} options={musicOptions} value={musicChoice} onChange={changeMusic} />
        {canChoose && <LocaleSwitch locale={locale} onChange={setLocale} label={s.language} />}
        <div className="mt-2">
          <MenuButton onClick={() => setSubScreen(null)}>{s.back}</MenuButton>
        </div>
      </MenuLayer>
    );
  } else if (gameState === "menu") {
    screen = (
      <MenuLayer>
        <MenuTitle title="HOT PROPERTY" subtitle={t.subtitle} />
        {highScoreRef.current > 0 && (
          <p className="font-mono text-xs text-gray-400">
            {t.record}: {formatMillions(t, highScoreRef.current)}
          </p>
        )}
        <MenuButton primary onClick={play}>
          {s.play}
        </MenuButton>
        <MenuButton onClick={() => setSubScreen("help")}>{t.howTo}</MenuButton>
        <MenuButton onClick={() => setSubScreen("settings")}>{s.settings}</MenuButton>
      </MenuLayer>
    );
  } else if (gameState === "gameover") {
    screen = (
      <MenuLayer dim="bg-black/60">
        <MenuTitle title="GAME OVER" subtitle={result.reason === "heli" ? t.lostHeli : t.lostComplex} />
        <p className="font-mono text-4xl font-bold">{formatMillions(t, result.score)}</p>
        <p className="font-mono text-sm text-gray-300">{t.savedFlats(result.flats)}</p>
        {result.newRecord ? (
          <p className="text-sm text-yellow-400">{t.newRecord}</p>
        ) : (
          <p className="font-mono text-xs text-gray-400">
            {t.record}: {formatMillions(t, highScoreRef.current)}
          </p>
        )}
        <div className="mt-2 flex flex-col items-center gap-2">
          <MenuButton primary onClick={play}>
            {s.playAgain}
          </MenuButton>
          <MenuButton onClick={toMenu}>{s.menu}</MenuButton>
        </div>
      </MenuLayer>
    );
  } else if (userPaused) {
    screen = (
      <MenuLayer dim="bg-black/80">
        <MenuTitle title={s.paused} />
        <MenuButton primary onClick={resume}>
          {s.resume}
        </MenuButton>
        <MenuButton onClick={() => setSubScreen("help")}>{t.howTo}</MenuButton>
        <MenuButton onClick={() => setSubScreen("settings")}>{s.settings}</MenuButton>
        <MenuButton onClick={toMenu}>{s.quit}</MenuButton>
      </MenuLayer>
    );
  }

  const launcher = (
    <button
      type="button"
      onClick={openGame}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 text-center text-white"
    >
      <span className="font-mono text-2xl font-bold">HOT PROPERTY</span>
      <span className="mt-2 text-sm text-gray-300">{gameState === "playing" ? s.tapToResume : s.tapToPlay}</span>
    </button>
  );

  const stage = (
    <Stage
      stageRef={stageRef}
      view={view}
      onPause={gameState === "playing" && !paused ? pause : undefined}
      muted={soundOff}
      onToggleMute={toggleMute}
      locale={locale}
      launcher={launcher}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={`block h-full w-full touch-none ${immersive ? "" : "border border-black"}`}
        onMouseDown={() => {
          if (gameState === "playing") mouseDropRef.current = true;
        }}
        onMouseUp={() => {
          mouseDropRef.current = false;
        }}
        onMouseLeave={() => {
          mouseDropRef.current = false;
        }}
      />
      {screen}
    </Stage>
  );

  if (EMBED) return stage;

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Hot Property</h1>
        <p className="mt-2 text-xs text-gray-500 md:text-sm">{t.description}</p>
        {stage}
      </div>
    </div>
  );
}
