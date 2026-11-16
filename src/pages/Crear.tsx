import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useProfileContext } from "../context/ProfileContext";
import { isNativeApp } from "../lib/platform";
import {
  BLOCK_DEFS,
  blockDef,
  createBlock,
  newBlockId,
  TUTORIAL_STARTER,
  type BlockKind,
  type ProgramBlock,
} from "../lib/crear/blocks";
import {
  buildStarterBlocks,
  CREAR_CURRICULUM,
  FREE_PLAY_LEVEL,
  FREE_PLAY_WORLD_WIDTH,
  levelById,
  TOTAL_CREAR_LEVELS,
  type CrearLevel,
} from "../lib/crear/curriculum";
import {
  isLevelUnlocked,
  loadCrearLevelProgress,
  markLevelComplete,
  setActiveCrearLevel,
  subscribeCrearLevels,
  type CrearLevelProgress,
} from "../lib/crear/level-progress";
import {
  playerFromLevel,
  runProgram,
  STAGE_SIZE,
  stepFreePlay,
  type PlayerState,
} from "../lib/crear/runtime";
import {
  createConfetti,
  drawAkemiSprite,
  drawConfetti,
  drawFlag,
  drawLowObstacles,
  drawPlatforms,
  drawStageBackground,
  drawWinSparkles,
  roundRect,
  stepConfetti,
  type ConfettiPiece,
} from "../lib/crear/stage-draw";
import {
  deleteCreation,
  loadCreations,
  saveCreation,
  type SavedCreation,
} from "../lib/crear/storage";
import "./Crear.css";

const TUTORIAL_KEY = "akemi-crear-tutorial-seen";

function cloneBlocks(blocks: ProgramBlock[]): ProgramBlock[] {
  return blocks.map((b) => ({
    ...b,
    id: newBlockId(),
    children: b.children ? cloneBlocks(b.children) : undefined,
  }));
}

type PadInput = { left: boolean; right: boolean; jump: boolean; crouch: boolean };

const EMPTY_PAD: PadInput = { left: false, right: false, jump: false, crouch: false };

export function Crear() {
  const { profile } = useProfileContext();
  const profileId = profile?.id ?? "";
  const native = isNativeApp();

  const [blocks, setBlocks] = useState<ProgramBlock[]>(() => [
    { id: newBlockId(), kind: "event_start" },
  ]);
  const [sprite, setSprite] = useState<PlayerState>(() => playerFromLevel(CREAR_CURRICULUM[0]));
  const [running, setRunning] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [saves, setSaves] = useState<SavedCreation[]>([]);
  const [sayFlash, setSayFlash] = useState<string | null>(null);
  const [levelProgress, setLevelProgress] = useState<CrearLevelProgress>(() =>
    loadCrearLevelProgress(profileId),
  );
  const [celebrate, setCelebrate] = useState<{
    open: boolean;
    level: CrearLevel | null;
    unlockedFree?: boolean;
  }>({ open: false, level: null });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const runAbort = useRef<AbortController | null>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const lastAppliedLevelRef = useRef<string | null>(null);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const animFrameRef = useRef<number>(0);
  const spriteRef = useRef<PlayerState>(sprite);
  const celebrateRef = useRef(celebrate);
  const padRef = useRef<PadInput>({ ...EMPTY_PAD });
  const jumpEdgeRef = useRef(false);
  const freeWinRef = useRef(false);
  const cameraRef = useRef(0);

  const isFreePlay = levelProgress.activeLevelId === "free" && levelProgress.freePlayUnlocked;
  const activeLevel: CrearLevel = isFreePlay
    ? FREE_PLAY_LEVEL
    : (levelById(levelProgress.activeLevelId) ?? CREAR_CURRICULUM[0]);
  const worldWidth = isFreePlay ? FREE_PLAY_WORLD_WIDTH : STAGE_SIZE.width;

  useEffect(() => {
    spriteRef.current = sprite;
  }, [sprite]);

  useEffect(() => {
    celebrateRef.current = celebrate;
  }, [celebrate]);

  useEffect(() => {
    if (!profileId) return;
    setSaves(loadCreations(profileId));
    setLevelProgress(loadCrearLevelProgress(profileId));
    lastAppliedLevelRef.current = null;
  }, [profileId]);

  useEffect(() => {
    return subscribeCrearLevels(() => {
      if (profileId) setLevelProgress(loadCrearLevelProgress(profileId));
    });
  }, [profileId]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) setShowTutorial(true);
    } catch {
      /* ignore */
    }
  }, []);

  const drawStage = useCallback(
    (st: PlayerState, now = performance.now()) => {
      const canvas = stageRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { width, height } = canvas;
      const time = { now };

      let camX = 0;
      if (isFreePlay) {
        camX = Math.max(0, Math.min(worldWidth - width, st.x - width * 0.4));
      }
      cameraRef.current = camX;
      const camera = { x: camX };

      ctx.clearRect(0, 0, width, height);
      drawStageBackground(ctx, width, height, time, camera);
      drawPlatforms(ctx, activeLevel.platforms, camera);
      drawLowObstacles(ctx, activeLevel.lowObstacles, camera);
      drawFlag(ctx, activeLevel.flag, time, camera);
      drawAkemiSprite(ctx, st, camera);

      if (st.sayBubble) {
        const bx = st.x - camX;
        const by = st.y - (st.crouching ? 40 : 52);
        ctx.font = "700 14px Nunito, sans-serif";
        const tw = ctx.measureText(st.sayBubble).width;
        const pad = 10;
        const w = tw + pad * 2;
        const h = 28;
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.strokeStyle = "rgba(11,58,74,0.18)";
        ctx.lineWidth = 2;
        roundRect(ctx, bx - w / 2, by - h / 2, w, h, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#0b3a4a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(st.sayBubble, bx, by + 1);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }

      if (celebrateRef.current.open) {
        drawWinSparkles(ctx, st.x - camX, st.y - 20, time);
        if (confettiRef.current.length) {
          stepConfetti(confettiRef.current, width, height);
          drawConfetti(ctx, confettiRef.current);
        }
      }
    },
    [activeLevel, isFreePlay, worldWidth],
  );

  // Animación / loop de modo libre
  useEffect(() => {
    let alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      if (isFreePlay && !celebrateRef.current.open) {
        const pad = padRef.current;
        const jumpPressed = pad.jump && !jumpEdgeRef.current;
        jumpEdgeRef.current = pad.jump;
        const next = stepFreePlay(
          spriteRef.current,
          {
            left: pad.left,
            right: pad.right,
            jump: jumpPressed,
            crouch: pad.crouch,
          },
          activeLevel,
          worldWidth,
        );
        spriteRef.current = next;
        setSprite(next);
        drawStage(next, now);

        if (!freeWinRef.current) {
          const body = { x: next.x - 11, y: next.y - 20, w: 22, h: 30 };
          const f = activeLevel.flag;
          const pole = { x: f.x - 6, y: f.y - f.h, w: 14, h: f.h };
          const hit =
            body.x < pole.x + pole.w &&
            body.x + body.w > pole.x &&
            body.y < pole.y + pole.h &&
            body.y + body.h > pole.y;
          if (hit) {
            freeWinRef.current = true;
            setCelebrate({ open: true, level: activeLevel });
          }
        }
      } else {
        drawStage(spriteRef.current, now);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawStage, isFreePlay, activeLevel, worldWidth]);

  useEffect(() => {
    if (celebrate.open) {
      confettiRef.current = createConfetti(STAGE_SIZE.width, STAGE_SIZE.height);
    } else {
      confettiRef.current = [];
    }
  }, [celebrate.open]);

  // Teclado (desktop) en modo libre
  useEffect(() => {
    if (!isFreePlay) return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "a", "arrowright", "d", "arrowup", "w", " ", "z", "arrowdown", "s", "x", "shift"].includes(k)) {
        e.preventDefault();
      }
      if (k === "arrowleft" || k === "a") padRef.current.left = true;
      if (k === "arrowright" || k === "d") padRef.current.right = true;
      if (k === "arrowup" || k === "w" || k === " " || k === "z") padRef.current.jump = true;
      if (k === "arrowdown" || k === "s" || k === "x" || k === "shift") padRef.current.crouch = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") padRef.current.left = false;
      if (k === "arrowright" || k === "d") padRef.current.right = false;
      if (k === "arrowup" || k === "w" || k === " " || k === "z") padRef.current.jump = false;
      if (k === "arrowdown" || k === "s" || k === "x" || k === "shift") padRef.current.crouch = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      padRef.current = { ...EMPTY_PAD };
    };
  }, [isFreePlay]);

  function applyLevel(level: CrearLevel) {
    freeWinRef.current = false;
    padRef.current = { ...EMPTY_PAD };
    setStatusMsg(null);
    if (level.id !== "free") {
      setBlocks(cloneBlocks(buildStarterBlocks(level)));
    }
    const st = playerFromLevel(level);
    setSprite(st);
    drawStage(st);
  }

  useEffect(() => {
    if (lastAppliedLevelRef.current === levelProgress.activeLevelId) return;
    lastAppliedLevelRef.current = levelProgress.activeLevelId;
    applyLevel(activeLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelProgress.activeLevelId, activeLevel.id]);

  function addBlock(kind: BlockKind) {
    if (kind === "event_start") return;
    setBlocks((prev) => [...prev, createBlock(kind)]);
  }

  function updateBlockValue(id: string, value: number | string) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, value } : b)));
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 1 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  function pickLevel(levelId: string) {
    if (running || !profileId) return;
    if (!isLevelUnlocked(levelProgress, levelId)) return;
    const next = setActiveCrearLevel(profileId, levelId);
    setLevelProgress(next);
  }

  function handleWin() {
    if (!profileId || isFreePlay) return;
    runAbort.current?.abort();
    const next = markLevelComplete(profileId, activeLevel.id);
    setLevelProgress(next);
    setCelebrate({
      open: true,
      level: activeLevel,
      unlockedFree: next.freePlayUnlocked && !levelProgress.freePlayUnlocked,
    });
    setRunning(false);
    setSayFlash(null);
  }

  async function play() {
    if (running || isFreePlay) return;
    runAbort.current?.abort();
    const ac = new AbortController();
    runAbort.current = ac;
    setRunning(true);
    setStatusMsg(null);
    const initial = playerFromLevel(activeLevel);
    let current = initial;
    setSprite(current);
    drawStage(current);

    await runProgram(
      blocks,
      current,
      STAGE_SIZE,
      {
        onTick: (st) => {
          current = st;
          setSprite(st);
          drawStage(st);
        },
        onSay: (t) => setSayFlash(t),
        onError: (msg) => setStatusMsg(msg),
        onDone: () => {
          setRunning(false);
          setSayFlash(null);
        },
        onWin: handleWin,
      },
      ac.signal,
      { level: activeLevel, onWin: handleWin },
    );
  }

  function stopPlay() {
    runAbort.current?.abort();
    setRunning(false);
  }

  function resetSprite() {
    freeWinRef.current = false;
    const st = playerFromLevel(activeLevel);
    setSprite(st);
    drawStage(st);
    setStatusMsg(null);
  }

  function dismissTutorial(done?: boolean) {
    if (done) {
      try {
        localStorage.setItem(TUTORIAL_KEY, "1");
      } catch {
        /* ignore */
      }
      setBlocks(cloneBlocks(TUTORIAL_STARTER));
    }
    setShowTutorial(false);
    setTutorialStep(0);
  }

  function persistProject() {
    if (!profileId || isFreePlay) return;
    const title = `Proyecto ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;
    const saved: SavedCreation = {
      id: newBlockId(),
      title,
      savedAt: new Date().toISOString(),
      blocks,
    };
    setSaves(saveCreation(profileId, saved));
  }

  function loadProject(item: SavedCreation) {
    if (isFreePlay) return;
    setBlocks(cloneBlocks(item.blocks));
    resetSprite();
  }

  function pressPad(key: keyof PadInput, value: boolean) {
    padRef.current = { ...padRef.current, [key]: value };
  }

  const tutorialSteps = [
    "¡Bienvenido a Crear! Programa a Aki en un mundo de plataformas.",
    "A la izquierda armas bloques; en el centro ves el escenario.",
    "Avanza, retrocede, salta y agáchate para llegar a la bandera.",
    "Completa los 15 niveles y desbloqueas el juego libre con control Game Boy.",
    "Pulsa ▶ Reproducir. ¡Aki te espera!",
  ];

  const childBlockKinds = activeLevel.allowedBlocks.filter(
    (k) => k !== "event_start" && k !== "repeat",
  );

  return (
    <main className={`screen crear ${native ? "crear-native" : ""} ${isFreePlay ? "crear-free" : ""}`}>
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel crear-panel">
        <header className="crear-header">
          <h1 className="section-title">Crear</h1>
          <p className="section-sub">
            {isFreePlay
              ? "Modo libre desbloqueado — controla a Aki como en una Game Boy"
              : `Aventura platformer: ${TOTAL_CREAR_LEVELS} niveles · llega a la bandera`}
          </p>
          <button
            type="button"
            className="btn btn-ghost crear-tutorial-btn"
            onClick={() => setShowTutorial(true)}
          >
            Cómo jugar
          </button>
        </header>

        <div className={`crear-layout ${isFreePlay ? "is-free" : ""}`}>
          {!isFreePlay && (
            <section className="crear-workspace-wrap">
              <div className="crear-level-header panel-soft">
                <h2 className="crear-level-title">{activeLevel.title}</h2>
                <p className="crear-level-mission">{activeLevel.mission}</p>
                <p className="crear-hint crear-level-hint">{activeLevel.hint}</p>
              </div>
              <div className="crear-level-pills" role="tablist" aria-label="Niveles">
                {CREAR_CURRICULUM.map((lvl) => {
                  const unlocked = isLevelUnlocked(levelProgress, lvl.id);
                  const done = levelProgress.completedLevelIds.includes(lvl.id);
                  const active = lvl.id === levelProgress.activeLevelId;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      disabled={running || !unlocked}
                      className={`crear-level-pill ${active ? "active" : ""} ${done ? "done" : ""}`}
                      onClick={() => pickLevel(lvl.id)}
                      title={unlocked ? lvl.title : "Completa el nivel anterior"}
                    >
                      {unlocked ? (done ? "✓" : lvl.id.replace("l", "")) : "🔒"}
                    </button>
                  );
                })}
                {levelProgress.freePlayUnlocked && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isFreePlay}
                    disabled={running}
                    className={`crear-level-pill crear-free-pill ${isFreePlay ? "active" : ""}`}
                    onClick={() => pickLevel("free")}
                    title="Modo libre"
                  >
                    🎮
                  </button>
                )}
              </div>
              <div className="crear-workspace-toolbar">
                <button type="button" className="btn btn-leaf" disabled={running} onClick={() => void play()}>
                  ▶ Reproducir
                </button>
                <button type="button" className="btn btn-ghost" disabled={!running} onClick={stopPlay}>
                  ⏹ Parar
                </button>
                <button
                  type="button"
                  className="btn btn-sky"
                  disabled={running || !profileId}
                  onClick={persistProject}
                >
                  💾 Guardar
                </button>
                <button type="button" className="btn btn-ghost" disabled={running} onClick={resetSprite}>
                  Reiniciar
                </button>
              </div>

              <ol className="crear-workspace panel-soft">
                {blocks.map((block, index) => {
                  const def = blockDef(block.kind);
                  const isStart = block.kind === "event_start";
                  return (
                    <li
                      key={block.id}
                      className={`crear-stack-block ${isStart ? "is-start" : ""}`}
                      style={{ "--block-color": def.color } as React.CSSProperties}
                    >
                      <span className="crear-block-emoji" aria-hidden>
                        {def.emoji}
                      </span>
                      <span className="crear-block-label">{def.label}</span>
                      {def.hasValue && (
                        <input
                          className="crear-block-input"
                          disabled={running}
                          value={String(block.value ?? def.defaultValue ?? "")}
                          onChange={(e) => {
                            const v = def.kind === "say" ? e.target.value : Number(e.target.value);
                            updateBlockValue(block.id, v);
                          }}
                          aria-label={def.valueLabel}
                        />
                      )}
                      {!isStart && (
                        <div className="crear-block-actions">
                          <button
                            type="button"
                            className="crear-icon-btn"
                            disabled={running || index <= 1}
                            onClick={() => moveBlock(block.id, -1)}
                            aria-label="Subir bloque"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="crear-icon-btn"
                            disabled={running || index >= blocks.length - 1}
                            onClick={() => moveBlock(block.id, 1)}
                            aria-label="Bajar bloque"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="crear-icon-btn"
                            disabled={running}
                            onClick={() => removeBlock(block.id)}
                            aria-label="Quitar bloque"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {block.kind === "repeat" && (
                        <NestedBlockBody
                          block={block}
                          running={running}
                          allowedKinds={childBlockKinds}
                          onChange={(children) => {
                            setBlocks((prev) =>
                              prev.map((b) => (b.id === block.id ? { ...b, children } : b)),
                            );
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>

              <p className="crear-progress-note">
                Completados: {levelProgress.completedLevelIds.length}/{TOTAL_CREAR_LEVELS}
                {levelProgress.freePlayUnlocked ? " · 🎮 Modo libre" : ""}
              </p>
              {statusMsg && <p className="crear-status-msg">{statusMsg}</p>}
            </section>
          )}

          <section className="crear-stage-wrap" aria-label="Escenario">
            <h2 className="crear-aside-title crear-stage-label">
              {isFreePlay ? "Modo libre" : "Escenario"}
            </h2>
            {isFreePlay && (
              <div className="crear-free-bar">
                <button type="button" className="btn btn-ghost" onClick={() => pickLevel("l01")}>
                  ← Niveles
                </button>
                <button type="button" className="btn btn-sky" onClick={resetSprite}>
                  Reiniciar
                </button>
              </div>
            )}
            <div className="crear-stage-board">
              <div className="crear-stage-board-inner">
                <canvas
                  ref={stageRef}
                  width={STAGE_SIZE.width}
                  height={STAGE_SIZE.height}
                  className="crear-stage"
                />
              </div>
            </div>
            {sayFlash && <p className="crear-say-flash">🔊 {sayFlash}</p>}
            <p className="crear-hint crear-goal-hint">
              {isFreePlay
                ? "Llega a la bandera con el control"
                : "Llega a la bandera: salta huecos y agáchate bajo tubos"}
            </p>

            {isFreePlay && (
              <div className="crear-gameboy" aria-label="Control Game Boy">
                <div className="crear-gb-shell">
                  <div className="crear-gb-dpad">
                    <button
                      type="button"
                      className="crear-gb-btn crear-gb-up"
                      aria-label="Arriba / saltar"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressPad("jump", true);
                      }}
                      onPointerUp={() => pressPad("jump", false)}
                      onPointerLeave={() => pressPad("jump", false)}
                      onPointerCancel={() => pressPad("jump", false)}
                    />
                    <button
                      type="button"
                      className="crear-gb-btn crear-gb-left"
                      aria-label="Izquierda"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressPad("left", true);
                      }}
                      onPointerUp={() => pressPad("left", false)}
                      onPointerLeave={() => pressPad("left", false)}
                      onPointerCancel={() => pressPad("left", false)}
                    />
                    <span className="crear-gb-pad-center" aria-hidden />
                    <button
                      type="button"
                      className="crear-gb-btn crear-gb-right"
                      aria-label="Derecha"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressPad("right", true);
                      }}
                      onPointerUp={() => pressPad("right", false)}
                      onPointerLeave={() => pressPad("right", false)}
                      onPointerCancel={() => pressPad("right", false)}
                    />
                    <button
                      type="button"
                      className="crear-gb-btn crear-gb-down"
                      aria-label="Abajo / agacharse"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressPad("crouch", true);
                      }}
                      onPointerUp={() => pressPad("crouch", false)}
                      onPointerLeave={() => pressPad("crouch", false)}
                      onPointerCancel={() => pressPad("crouch", false)}
                    />
                  </div>
                  <div className="crear-gb-actions">
                    <button
                      type="button"
                      className="crear-gb-ab crear-gb-b"
                      aria-label="B agacharse"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressPad("crouch", true);
                      }}
                      onPointerUp={() => pressPad("crouch", false)}
                      onPointerLeave={() => pressPad("crouch", false)}
                      onPointerCancel={() => pressPad("crouch", false)}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="crear-gb-ab crear-gb-a"
                      aria-label="A saltar"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressPad("jump", true);
                      }}
                      onPointerUp={() => pressPad("jump", false)}
                      onPointerLeave={() => pressPad("jump", false)}
                      onPointerCancel={() => pressPad("jump", false)}
                    >
                      A
                    </button>
                  </div>
                </div>
                <p className="crear-gb-hint">
                  D-pad · A saltar · B agacharse
                  {!native && " · Teclado: flechas / WASD · Z/Espacio · X"}
                </p>
              </div>
            )}
          </section>

          {!isFreePlay && (
            <aside className="crear-palette panel-soft" aria-label="Acciones y bloques">
              <h2 className="crear-aside-title">Acciones</h2>
              <p className="crear-hint">Toca un bloque para añadirlo al programa</p>
              <ul className="crear-palette-list">
                {BLOCK_DEFS.filter(
                  (d) => d.kind !== "event_start" && activeLevel.allowedBlocks.includes(d.kind),
                ).map((def) => (
                  <li key={def.kind}>
                    <button
                      type="button"
                      className="crear-block-chip"
                      style={{ "--block-color": def.color } as React.CSSProperties}
                      disabled={running}
                      onClick={() => addBlock(def.kind)}
                    >
                      <span aria-hidden>{def.emoji}</span>
                      {def.label}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="crear-saves crear-saves-aside">
                <h3 className="crear-saves-title">Proyectos guardados</h3>
                {saves.length === 0 ? (
                  <p className="crear-hint">Aún no hay proyectos. Usa 💾 Guardar.</p>
                ) : (
                  <ul className="crear-saves-list">
                    {saves.map((s) => (
                      <li key={s.id} className="crear-save-row">
                        <button
                          type="button"
                          className="btn btn-ghost crear-save-load"
                          disabled={running}
                          onClick={() => loadProject(s)}
                        >
                          {s.title}
                        </button>
                        <button
                          type="button"
                          className="crear-icon-btn"
                          disabled={running}
                          onClick={() => profileId && setSaves(deleteCreation(profileId, s.id))}
                          aria-label="Borrar proyecto"
                        >
                          🗑
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {celebrate.open && celebrate.level && (
        <div className="crear-tutorial-backdrop crear-celebrate-backdrop" role="dialog" aria-modal="true">
          <div className="crear-celebrate panel">
            <h2 className="crear-tutorial-title">
              {celebrate.unlockedFree ? "¡Modo libre desbloqueado!" : "¡Lo lograste!"}
            </h2>
            <p className="crear-tutorial-text">
              {celebrate.unlockedFree ? (
                <>
                  Completaste los {TOTAL_CREAR_LEVELS} niveles. ¡Ya puedes jugar con el control
                  Game Boy!
                </>
              ) : isFreePlay ? (
                <>¡Llegaste a la bandera en modo libre!</>
              ) : (
                <>
                  Completaste <strong>{celebrate.level.title}</strong>. ¡Sigue con el siguiente reto!
                </>
              )}
            </p>
            <button
              type="button"
              className="btn btn-leaf"
              onClick={() => {
                const goFree = celebrate.unlockedFree;
                setCelebrate({ open: false, level: null });
                if (goFree && profileId) {
                  const next = setActiveCrearLevel(profileId, "free");
                  setLevelProgress(next);
                }
              }}
            >
              {celebrate.unlockedFree ? "¡Jugar libre!" : "¡Genial!"}
            </button>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="crear-tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tut-title">
          <div className="crear-tutorial panel">
            <h2 id="tut-title" className="crear-tutorial-title">
              Crear con Aki
            </h2>
            <p className="crear-tutorial-text">{tutorialSteps[tutorialStep]}</p>
            <div className="crear-tutorial-dots" aria-hidden>
              {tutorialSteps.map((_, i) => (
                <span key={i} className={i === tutorialStep ? "active" : ""} />
              ))}
            </div>
            <div className="crear-tutorial-actions">
              <button type="button" className="btn btn-ghost" onClick={() => dismissTutorial()}>
                Saltar
              </button>
              {tutorialStep < tutorialSteps.length - 1 ? (
                <button type="button" className="btn btn-sky" onClick={() => setTutorialStep((s) => s + 1)}>
                  Siguiente
                </button>
              ) : (
                <button type="button" className="btn btn-leaf" onClick={() => dismissTutorial(true)}>
                  ¡Empezar!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function NestedBlockBody({
  block,
  running,
  allowedKinds,
  onChange,
}: {
  block: ProgramBlock;
  running: boolean;
  allowedKinds: BlockKind[];
  onChange: (children: ProgramBlock[]) => void;
}) {
  const children = block.children ?? [];

  function addChild(kind: BlockKind) {
    if (kind === "event_start" || kind === "repeat") return;
    onChange([...children, createBlock(kind)]);
  }

  function removeChild(id: string) {
    onChange(children.filter((c) => c.id !== id));
  }

  return (
    <div className="crear-repeat-body">
      <p className="crear-repeat-label">Dentro del repetir:</p>
      <div className="crear-repeat-add">
        {allowedKinds.map((kind) => {
          const def = blockDef(kind);
          return (
            <button
              key={kind}
              type="button"
              className="crear-mini-chip"
              disabled={running}
              onClick={() => addChild(kind)}
            >
              {def.emoji}+{def.label}
            </button>
          );
        })}
      </div>
      <ul className="crear-repeat-list">
        {children.map((child) => {
          const def = blockDef(child.kind);
          return (
            <li key={child.id} className="crear-repeat-item">
              {def.emoji} {def.label}
              {def.hasValue && (
                <input
                  className="crear-block-input"
                  disabled={running}
                  value={String(child.value ?? def.defaultValue ?? "")}
                  onChange={(e) => {
                    const v = def.kind === "say" ? e.target.value : Number(e.target.value);
                    onChange(children.map((c) => (c.id === child.id ? { ...c, value: v } : c)));
                  }}
                />
              )}
              <button
                type="button"
                className="crear-icon-btn"
                disabled={running}
                onClick={() => removeChild(child.id)}
                aria-label="Quitar"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
