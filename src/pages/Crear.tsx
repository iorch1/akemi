import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useProfileContext } from "../context/ProfileContext";
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
  levelById,
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
  DEFAULT_SPRITE,
  runProgram,
  STAGE_SIZE,
  type GoalRunContext,
  type SpriteState,
} from "../lib/crear/runtime";
import {
  createConfetti,
  drawAkemiSprite,
  drawConfetti,
  drawStageBackground,
  drawStageGoals,
  drawStageWalls,
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

export function Crear() {
  const { profile } = useProfileContext();
  const profileId = profile?.id ?? "";

  const [blocks, setBlocks] = useState<ProgramBlock[]>(() => [
    { id: newBlockId(), kind: "event_start" },
  ]);
  const [sprite, setSprite] = useState<SpriteState>({ ...DEFAULT_SPRITE });
  const [running, setRunning] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [saves, setSaves] = useState<SavedCreation[]>([]);
  const [sayFlash, setSayFlash] = useState<string | null>(null);
  const [levelProgress, setLevelProgress] = useState<CrearLevelProgress>(() =>
    loadCrearLevelProgress(profileId),
  );
  const [celebrate, setCelebrate] = useState<{ open: boolean; level: CrearLevel | null }>({
    open: false,
    level: null,
  });
  const runAbort = useRef<AbortController | null>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const collectedRef = useRef<Set<string>>(new Set());
  const lastAppliedLevelRef = useRef<string | null>(null);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const animFrameRef = useRef<number>(0);
  const spriteRef = useRef<SpriteState>(sprite);
  const celebrateRef = useRef(celebrate);
  const activeLevel =
    levelById(levelProgress.activeLevelId) ?? CREAR_CURRICULUM[0];

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
    (st: SpriteState, collected: Set<string>, now = performance.now()) => {
      const canvas = stageRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { width, height } = canvas;
      const time = { now };

      ctx.clearRect(0, 0, width, height);
      drawStageBackground(ctx, width, height, time);
      drawStageWalls(ctx, activeLevel.walls);
      drawStageGoals(ctx, activeLevel.goals, collected, time);
      drawAkemiSprite(ctx, st);

      if (st.sayBubble) {
        const bx = st.x;
        const by = st.y - 52;
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
        ctx.fillStyle = varInk();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(st.sayBubble, bx, by + 1);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }

      if (celebrateRef.current.open) {
        drawWinSparkles(ctx, st.x, st.y, time);
        if (confettiRef.current.length) {
          stepConfetti(confettiRef.current, width, height);
          drawConfetti(ctx, confettiRef.current);
        }
      }
    },
    [activeLevel.goals, activeLevel.walls],
  );

  // Animación suave del escenario (nubes, brillos) + confeti al ganar
  useEffect(() => {
    let alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      drawStage(spriteRef.current, collectedRef.current, now);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawStage]);

  useEffect(() => {
    if (celebrate.open) {
      confettiRef.current = createConfetti(STAGE_SIZE.width, STAGE_SIZE.height);
    } else {
      confettiRef.current = [];
    }
  }, [celebrate.open]);

  function spriteForLevel(level: CrearLevel): SpriteState {
    return {
      ...DEFAULT_SPRITE,
      x: level.start.x,
      y: level.start.y,
      heading: level.start.heading,
      sayBubble: null,
    };
  }

  function resetCollected() {
    collectedRef.current = new Set();
  }

  function resetSpriteForLevel() {
    const st = spriteForLevel(activeLevel);
    setSprite(st);
    drawStage(st, collectedRef.current);
  }

  function resetSprite() {
    resetSpriteForLevel();
  }

  function applyLevel(level: CrearLevel) {
    resetCollected();
    setBlocks(cloneBlocks(buildStarterBlocks(level)));
    const st = spriteForLevel(level);
    setSprite(st);
    drawStage(st, new Set());
  }

  useEffect(() => {
    if (lastAppliedLevelRef.current === levelProgress.activeLevelId) return;
    lastAppliedLevelRef.current = levelProgress.activeLevelId;
    applyLevel(activeLevel);
  }, [levelProgress.activeLevelId, activeLevel]);

  function addBlock(kind: BlockKind) {
    if (kind === "event_start") return;
    const block = createBlock(kind);
    setBlocks((prev) => [...prev, block]);
  }

  function updateBlockValue(id: string, value: number | string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, value } : b)),
    );
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

  function pickLevel(level: CrearLevel) {
    if (running || !profileId) return;
    if (!isLevelUnlocked(levelProgress, level.id)) return;
    const next = setActiveCrearLevel(profileId, level.id);
    setLevelProgress(next);
  }

  function handleWin() {
    if (!profileId) return;
    runAbort.current?.abort();
    const next = markLevelComplete(profileId, activeLevel.id);
    setLevelProgress(next);
    setCelebrate({ open: true, level: activeLevel });
    setRunning(false);
    setSayFlash(null);
  }

  async function play() {
    if (running) return;
    runAbort.current?.abort();
    const ac = new AbortController();
    runAbort.current = ac;
    setRunning(true);
    resetCollected();
    const initial = spriteForLevel(activeLevel);
    let current = initial;
    setSprite(current);
    drawStage(current, new Set());

    const goalCtx: GoalRunContext = {
      goals: activeLevel.goals,
      walls: activeLevel.walls,
      collected: collectedRef.current,
      onCollect: () => {
        drawStage(current, collectedRef.current);
      },
      onWin: handleWin,
    };

    await runProgram(
      blocks,
      current,
      STAGE_SIZE,
      {
        onTick: (st) => {
          current = st;
          setSprite(st);
          drawStage(st, collectedRef.current);
        },
        onSay: (t) => setSayFlash(t),
        onDone: () => {
          setRunning(false);
          setSayFlash(null);
        },
      },
      ac.signal,
      goalCtx,
    );
  }

  function stopPlay() {
    runAbort.current?.abort();
    setRunning(false);
  }

  function loadTutorialBlocks() {
    setBlocks(cloneBlocks(TUTORIAL_STARTER));
  }

  function dismissTutorial(done?: boolean) {
    if (done) {
      try {
        localStorage.setItem(TUTORIAL_KEY, "1");
      } catch {
        /* ignore */
      }
      loadTutorialBlocks();
    }
    setShowTutorial(false);
    setTutorialStep(0);
  }

  function persistProject() {
    if (!profileId) return;
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
    setBlocks(cloneBlocks(item.blocks));
    resetSprite();
  }

  const tutorialSteps = [
    "Bienvenido a Crear: ¡tu Hora del Código!",
    "A la izquierda programas con bloques; en el centro ves el escenario grande.",
    "A la derecha añades bloques y guardas proyectos.",
    "Aki es un muñeco que debe esquivar muros y llegar a la meta.",
    "Pulsa ▶ Reproducir. ¡Hay muchos niveles por descubrir!",
  ];

  const childBlockKinds = activeLevel.allowedBlocks.filter(
    (k) => k !== "event_start" && k !== "if_blocked",
  );

  return (
    <main className="screen crear">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel crear-panel">
        <header className="crear-header">
          <h1 className="section-title">Crear</h1>
          <p className="section-sub">
            Currículo de programación con {CREAR_CURRICULUM.length} niveles, muros y retos claros
          </p>
          <button type="button" className="btn btn-ghost crear-tutorial-btn" onClick={() => setShowTutorial(true)}>
            Guía Hora del Código
          </button>
        </header>

        <div className="crear-layout">
          <section className="crear-workspace-wrap">
            <div className="crear-level-header panel-soft">
              <h2 className="crear-level-title">{activeLevel.title}</h2>
              <p className="crear-level-mission">{activeLevel.mission}</p>
              <p className="crear-hint crear-level-hint">{activeLevel.hint}</p>
            </div>
            <div className="crear-level-pills" role="tablist" aria-label="Niveles del currículo">
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
                    onClick={() => pickLevel(lvl)}
                    title={unlocked ? lvl.title : "Completa el nivel anterior"}
                  >
                    {unlocked ? (done ? "✓" : lvl.id.replace("l", "")) : "🔒"}
                  </button>
                );
              })}
            </div>
            <div className="crear-workspace-toolbar">
              <button type="button" className="btn btn-leaf" disabled={running} onClick={() => void play()}>
                ▶ Reproducir
              </button>
              <button type="button" className="btn btn-ghost" disabled={!running} onClick={stopPlay}>
                ⏹ Parar
              </button>
              <button type="button" className="btn btn-sky" disabled={running || !profileId} onClick={persistProject}>
                💾 Guardar
              </button>
              <button type="button" className="btn btn-ghost" disabled={running} onClick={resetSprite}>
                Reiniciar posición
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
                    {(block.kind === "repeat" || block.kind === "if_blocked") && (
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
              Completados: {levelProgress.completedLevelIds.length}/{CREAR_CURRICULUM.length}
            </p>
          </section>

          <section className="crear-stage-wrap" aria-label="Escenario">
            <h2 className="crear-aside-title crear-stage-label">Escenario</h2>
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
              {activeLevel.walls.length > 0
                ? "Esquiva los bloques y setos de colores"
                : activeLevel.goals.some((g) => g.kind === "collect")
                  ? "Recolecta todas las gemas brillantes"
                  : "Llega a la estrella dorada"}
            </p>
          </section>

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
        </div>
      </div>

      {celebrate.open && celebrate.level && (
        <div className="crear-tutorial-backdrop crear-celebrate-backdrop" role="dialog" aria-modal="true">
          <div className="crear-celebrate panel">
            <h2 className="crear-tutorial-title">¡Lo lograste!</h2>
            <p className="crear-tutorial-text">
              Completaste <strong>{celebrate.level.title}</strong>. ¡Sigue con el siguiente reto!
            </p>
            <button
              type="button"
              className="btn btn-leaf"
              onClick={() => setCelebrate({ open: false, level: null })}
            >
              ¡Genial!
            </button>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="crear-tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tut-title">
          <div className="crear-tutorial panel">
            <h2 id="tut-title" className="crear-tutorial-title">
              Hora del Código con Aki
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
  const insideLabel =
    block.kind === "repeat" ? "Dentro del repetir:" : "Si hay pared, haz esto:";

  function addChild(kind: BlockKind) {
    if (kind === "event_start" || kind === "if_blocked") return;
    onChange([...children, createBlock(kind)]);
  }

  function removeChild(id: string) {
    onChange(children.filter((c) => c.id !== id));
  }

  return (
    <div className="crear-repeat-body">
      <p className="crear-repeat-label">{insideLabel}</p>
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
                    onChange(
                      children.map((c) => (c.id === child.id ? { ...c, value: v } : c)),
                    );
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

function varInk() {
  return "#0b3a4a";
}