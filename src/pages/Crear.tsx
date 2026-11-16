import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
import {
  loadCreations,
  newBlock,
  upsertCreation,
  type AnimBlock,
  type BlockType,
  type SavedCreation,
} from "../lib/creations";
import { speak } from "../utils/speech";
import "./Crear.css";

const BLOCK_LABELS: Record<BlockType, string> = {
  mover: "Mover",
  girar: "Girar",
  esperar: "Esperar",
  decir: "Decir",
};

const CHARACTERS = ["🐱", "🐶", "🦊", "🐰", "🐻", "🚀", "⭐", "🌳"];

export function Crear() {
  const [emoji, setEmoji] = useState("🐱");
  const [blocks, setBlocks] = useState<AnimBlock[]>([]);
  const [saved, setSaved] = useState<SavedCreation[]>([]);
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 48, y: 48, rot: 0 });

  useEffect(() => {
    setSaved(loadCreations());
  }, []);

  const applySprite = useCallback(() => {
    const el = stageRef.current?.querySelector(".crear-sprite") as HTMLElement | null;
    if (!el) return;
    el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) rotate(${pos.current.rot}deg)`;
  }, []);

  async function runScript() {
    if (playing) return;
    setPlaying(true);
    pos.current = { x: 48, y: 48, rot: 0 };
    applySprite();
    for (const b of blocks) {
      if (b.type === "mover") {
        const steps = typeof b.value === "number" ? b.value : 30;
        const rad = (pos.current.rot * Math.PI) / 180;
        pos.current.x += Math.cos(rad) * steps;
        pos.current.y += Math.sin(rad) * steps;
        applySprite();
      } else if (b.type === "girar") {
        pos.current.rot += typeof b.value === "number" ? b.value : 90;
        applySprite();
      } else if (b.type === "esperar") {
        await new Promise((r) => setTimeout(r, typeof b.value === "number" ? b.value : 400));
      } else if (b.type === "decir") {
        const txt = String(b.value);
        speak(txt, { mode: "phrase" });
        const bubble = stageRef.current?.querySelector(".crear-bubble");
        if (bubble) {
          bubble.textContent = txt;
          await new Promise((r) => setTimeout(r, 900));
          bubble.textContent = "";
        }
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    setPlaying(false);
  }

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, newBlock(type)]);
  }

  function saveCreation() {
    const item: SavedCreation = {
      id: `c-${Date.now()}`,
      name: `Escena ${saved.length + 1}`,
      emoji,
      blocks,
      updatedAt: Date.now(),
    };
    setSaved(upsertCreation(item));
  }

  function loadOne(c: SavedCreation) {
    setEmoji(c.emoji);
    setBlocks(c.blocks);
  }

  return (
    <main className="screen crear">
      <div className="back-row">
        <BackButton />
      </div>
      <h1 className="crear-title">Crear</h1>
      <p className="crear-sub">Arma bloques para animar tu personaje. Sin código, solo piezas visuales.</p>

      <div className="crear-layout">
        <section className="crear-stage-wrap panel-soft">
          <p className="crear-stage-label">Escenario</p>
          <div className="crear-char-pick">
            {CHARACTERS.map((e) => (
              <button
                key={e}
                type="button"
                className={`crear-char-btn ${emoji === e ? "active" : ""}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="crear-stage" ref={stageRef}>
            <span className="crear-bubble" aria-live="polite" />
            <span className="crear-sprite" aria-hidden>
              {emoji}
            </span>
          </div>
          <button type="button" className="btn btn-leaf crear-play" disabled={!blocks.length || playing} onClick={() => void runScript()}>
            ▶ Probar animación
          </button>
        </section>

        <section className="crear-blocks panel">
          <p className="crear-blocks-title">Bloques</p>
          <div className="crear-palette">
            {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
              <button key={t} type="button" className="btn btn-sky crear-add" onClick={() => addBlock(t)}>
                + {BLOCK_LABELS[t]}
              </button>
            ))}
          </div>
          <ol className="crear-stack">
            {blocks.map((b, i) => (
              <li key={b.id} className={`crear-block crear-block-${b.type}`}>
                <span>{BLOCK_LABELS[b.type]}</span>
                {b.type === "decir" ? (
                  <input
                    value={String(b.value)}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, value: e.target.value.slice(0, 40) } : x)),
                      )
                    }
                  />
                ) : (
                  <input
                    type="number"
                    value={Number(b.value)}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)),
                      )
                    }
                  />
                )}
                <button
                  type="button"
                  className="crear-rm"
                  aria-label="Quitar bloque"
                  onClick={() => setBlocks((prev) => prev.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <div className="crear-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setBlocks([])} disabled={!blocks.length}>
              Limpiar
            </button>
            <button type="button" className="btn btn-coral" onClick={saveCreation} disabled={!blocks.length}>
              Guardar
            </button>
          </div>
          {saved.length > 0 && (
            <div className="crear-saved">
              <p>Mis creaciones</p>
              <ul>
                {saved.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => loadOne(c)}>
                      {c.emoji} {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}