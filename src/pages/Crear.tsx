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
  DEFAULT_SPRITE,
  runProgram,
  STAGE_SIZE,
  type SpriteState,
} from "../lib/crear/runtime";
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
  const runAbort = useRef<AbortController | null>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!profileId) return;
    setSaves(loadCreations(profileId));
  }, [profileId]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) setShowTutorial(true);
    } catch {
      /* ignore */
    }
  }, []);

  const drawStage = useCallback((st: SpriteState) => {
    const canvas = stageRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    const grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, "#87ceeb");
    grd.addColorStop(0.55, "#b8e986");
    grd.addColorStop(1, "#5cb85c");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(width - 42, 42, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "40px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭐", width * 0.78, height * 0.62);

    drawAkemiSprite(ctx, st);

    if (st.sayBubble) {
      const bx = st.x;
      const by = st.y - 52;
      ctx.font = "700 14px Nunito, sans-serif";
      const tw = ctx.measureText(st.sayBubble).width;
      const pad = 10;
      const w = tw + pad * 2;
      const h = 28;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "rgba(11,58,74,0.2)";
      roundRect(ctx, bx - w / 2, by - h / 2, w, h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = varInk();
      ctx.fillText(st.sayBubble, bx, by + 1);
    }
  }, []);

  useEffect(() => {
    drawStage(sprite);
  }, [sprite, drawStage]);

  function resetSprite() {
    setSprite({ ...DEFAULT_SPRITE });
    drawStage({ ...DEFAULT_SPRITE });
  }

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

  async function play() {
    if (running) return;
    runAbort.current?.abort();
    const ac = new AbortController();
    runAbort.current = ac;
    setRunning(true);
    resetSprite();
    let current = { ...DEFAULT_SPRITE };
    setSprite(current);

    await runProgram(
      blocks,
      current,
      STAGE_SIZE,
      {
        onTick: (st) => {
          current = st;
          setSprite(st);
        },
        onSay: (t) => setSayFlash(t),
        onDone: () => {
          setRunning(false);
          setSayFlash(null);
        },
      },
      ac.signal,
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
    "Arrastra bloques al espacio de trabajo o tócalos para añadirlos.",
    "Usa Avanzar y Girar para mover a Aki, la estrella exploradora.",
    "Pulsa ▶ Reproducir para ver la animación en el escenario.",
    "Guarda tu proyecto cuando te guste. ¡A programar!",
  ];

  return (
    <main className="screen crear">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel crear-panel">
        <header className="crear-header">
          <h1 className="section-title">Crear</h1>
          <p className="section-sub">Programa bloques y mueve a Aki por el escenario</p>
          <button type="button" className="btn btn-ghost crear-tutorial-btn" onClick={() => setShowTutorial(true)}>
            Guía Hora del Código
          </button>
        </header>

        <div className="crear-layout">
          <aside className="crear-palette panel-soft" aria-label="Bloques disponibles">
            <h2 className="crear-aside-title">Bloques</h2>
            <p className="crear-hint">Toca un bloque para añadirlo</p>
            <ul className="crear-palette-list">
              {BLOCK_DEFS.filter((d) => d.kind !== "event_start").map((def) => (
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
          </aside>

          <section className="crear-workspace-wrap">
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
                    {block.kind === "repeat" && (
                      <RepeatBody
                        block={block}
                        running={running}
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

            {saves.length > 0 && (
              <div className="crear-saves">
                <h3 className="crear-saves-title">Proyectos guardados</h3>
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
              </div>
            )}
          </section>

          <aside className="crear-stage-wrap" aria-label="Escenario">
            <h2 className="crear-aside-title">Escenario</h2>
            <canvas
              ref={stageRef}
              width={STAGE_SIZE.width}
              height={STAGE_SIZE.height}
              className="crear-stage"
            />
            {sayFlash && <p className="crear-say-flash">🔊 {sayFlash}</p>}
            <p className="crear-hint">Meta: acércate a la estrella ⭐</p>
          </aside>
        </div>
      </div>

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

function RepeatBody({
  block,
  running,
  onChange,
}: {
  block: ProgramBlock;
  running: boolean;
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
        {(["move", "turn_left", "turn_right", "wait", "say"] as BlockKind[]).map((kind) => {
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

/** Personaje original: estrella morada “Aki”. */
function drawAkemiSprite(ctx: CanvasRenderingContext2D, st: SpriteState) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate((st.heading * Math.PI) / 180);

  ctx.fillStyle = "#7b4dff";
  ctx.strokeStyle = "#4527a8";
  ctx.lineWidth = 2;
  starPath(ctx, 0, 0, 26, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6, -4, 4, 0, Math.PI * 2);
  ctx.arc(14, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2d1b69";
  ctx.beginPath();
  ctx.arc(7, -4, 2, 0, Math.PI * 2);
  ctx.arc(15, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-18, 12);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-4, 8);
  ctx.fillStyle = "#9d7aff";
  ctx.fill();

  ctx.restore();
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, points: number) {
  const inner = outer * 0.45;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function varInk() {
  return "#0b3a4a";
}