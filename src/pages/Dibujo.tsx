import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useProgress } from "../hooks/useProgress";
import { COLORING_PACKS, packForImage } from "../lib/coloring-packs";
import { drawSvgOnCanvas } from "../lib/svg-canvas";
import "./Dibujo.css";

type Mode = "colorear" | "libre";

const COLORS = [
  "#0b3a4a",
  "#ff6b6b",
  "#ff9f1c",
  "#ffd166",
  "#2ec4b6",
  "#1a9bb5",
  "#7bdff2",
  "#ffffff",
  "#c0392b",
  "#27ae60",
];

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, fillHex: string) {
  const { width, height } = ctx.canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;
  const i0 = (sy * width + sx) * 4;
  const tr = data[i0];
  const tg = data[i0 + 1];
  const tb = data[i0 + 2];
  const ta = data[i0 + 3];
  const fill = hexToRgb(fillHex);
  if (tr === fill.r && tg === fill.g && tb === fill.b && ta === 255) return;

  const match = (i: number) =>
    Math.abs(data[i] - tr) < 40 &&
    Math.abs(data[i + 1] - tg) < 40 &&
    Math.abs(data[i + 2] - tb) < 40 &&
    Math.abs(data[i + 3] - ta) < 40;

  if (tr < 60 && tg < 60 && tb < 80) return;

  const stack: number[] = [sx, sy];
  const seen = new Uint8Array(width * height);
  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const idx = cy * width + cx;
    if (seen[idx]) continue;
    seen[idx] = 1;
    const i = idx * 4;
    if (!match(i)) continue;
    data[i] = fill.r;
    data[i + 1] = fill.g;
    data[i + 2] = fill.b;
    data[i + 3] = 255;
    if (cx > 0) stack.push(cx - 1, cy);
    if (cx < width - 1) stack.push(cx + 1, cy);
    if (cy > 0) stack.push(cx, cy - 1);
    if (cy < height - 1) stack.push(cx, cy + 1);
  }
  ctx.putImageData(img, 0, 0);
}

export function Dibujo() {
  const [progress] = useProgress();
  const unlockedByPack = useMemo(
    () =>
      COLORING_PACKS.map((pack) => ({
        pack,
        pages: pack.images.filter((img) => progress.unlockedImages.includes(img.id)),
      })).filter((row) => row.pages.length > 0),
    [progress.unlockedImages],
  );

  const [mode, setMode] = useState<Mode>("colorear");
  const [packId, setPackId] = useState(unlockedByPack[0]?.pack.id ?? "");
  const [templateId, setTemplateId] = useState(unlockedByPack[0]?.pages[0]?.id ?? "");
  const [color, setColor] = useState(COLORS[1]);
  const [brush, setBrush] = useState(8);
  const [erasing, setErasing] = useState(false);
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);
  const freeCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const activePackRow = unlockedByPack.find((r) => r.pack.id === packId) ?? unlockedByPack[0];
  const packPages = activePackRow?.pages ?? [];
  const currentTemplate =
    packPages.find((t) => t.id === templateId) ?? packPages[0];

  useEffect(() => {
    if (!unlockedByPack.length) return;
    if (!unlockedByPack.some((r) => r.pack.id === packId)) {
      setPackId(unlockedByPack[0].pack.id);
      setTemplateId(unlockedByPack[0].pages[0]?.id ?? "");
    }
  }, [unlockedByPack, packId]);

  useEffect(() => {
    if (packPages.length && !packPages.some((t) => t.id === templateId)) {
      setTemplateId(packPages[0].id);
    }
  }, [packPages, templateId]);

  const paintTemplate = useCallback(async () => {
    const canvas = colorCanvasRef.current;
    if (!canvas || !currentTemplate) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      await drawSvgOnCanvas(ctx, currentTemplate.src, canvas.width, canvas.height);
    } catch {
      ctx.fillStyle = "#f7fbff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [currentTemplate]);

  useEffect(() => {
    if (mode === "colorear" && currentTemplate) void paintTemplate();
  }, [mode, paintTemplate, currentTemplate]);

  useEffect(() => {
    const canvas = freeCanvasRef.current;
    if (!canvas || mode !== "libre") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [mode]);

  function pointerPos(canvas: HTMLCanvasElement, e: React.PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onColorPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = colorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = pointerPos(canvas, e);
    floodFill(ctx, p.x, p.y, color);
  }

  function startFree(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = freeCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointerPos(canvas, e);
  }

  function moveFree(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = freeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pointerPos(canvas, e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush;
    ctx.strokeStyle = erasing ? "#ffffff" : color;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function endFree() {
    drawing.current = false;
    last.current = null;
  }

  function clearFree() {
    const canvas = freeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const lockedCount = COLORING_PACKS.flatMap((p) => p.images).length - progress.unlockedImages.length;
  const packLabel = currentTemplate ? packForImage(currentTemplate.id)?.name : "";

  return (
    <main className="screen dibujo">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Dibujo</h1>
        <p className="section-sub">
          {progress.unlockedImages.length} páginas listas
          {lockedCount > 0 ? ` · ${lockedCount} más en lectura y mates` : ""}
        </p>

        <div className="level-pills">
          <button
            type="button"
            className={`level-pill ${mode === "colorear" ? "active" : ""}`}
            onClick={() => setMode("colorear")}
          >
            Colorear
          </button>
          <button
            type="button"
            className={`level-pill ${mode === "libre" ? "active" : ""}`}
            onClick={() => setMode("libre")}
          >
            Lienzo libre
          </button>
        </div>

        <div className="color-row" role="listbox" aria-label="Colores">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${color === c ? "active" : ""}`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
              onClick={() => {
                setColor(c);
                setErasing(false);
              }}
            />
          ))}
        </div>

        {mode === "colorear" ? (
          <>
            {unlockedByPack.length === 0 ? (
              <p className="dibujo-locked-msg">
                Aún no hay páginas. Gana retos en Aprender a leer o Matemáticas.
              </p>
            ) : (
              <>
                <div className="dibujo-template-scroll level-pills">
                  {unlockedByPack.map(({ pack }) => (
                    <button
                      key={pack.id}
                      type="button"
                      className={`level-pill template-pill ${packId === pack.id ? "active" : ""}`}
                      onClick={() => {
                        setPackId(pack.id);
                        const first = unlockedByPack.find((r) => r.pack.id === pack.id)?.pages[0];
                        if (first) setTemplateId(first.id);
                      }}
                    >
                      {pack.emoji} {pack.name}
                    </button>
                  ))}
                </div>
                <div className="dibujo-template-scroll level-pills dibujo-pages">
                  {packPages.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`level-pill template-pill ${templateId === t.id ? "active" : ""}`}
                      onClick={() => setTemplateId(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {packLabel && <p className="dibujo-pack-label">{packLabel}</p>}
                <p className="dibujo-hint">Toca una zona para rellenarla de color</p>
                <div className="canvas-frame">
                  <canvas
                    ref={colorCanvasRef}
                    width={400}
                    height={520}
                    className="draw-canvas"
                    onPointerDown={onColorPointer}
                  />
                </div>
                <div className="score-bar">
                  <button type="button" className="btn btn-leaf" onClick={() => void paintTemplate()}>
                    Limpiar
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="brush-row">
              <label>
                Grosor
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={brush}
                  onChange={(e) => setBrush(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className={`btn ${erasing ? "btn-coral" : "btn-ghost"}`}
                onClick={() => setErasing((v) => !v)}
              >
                {erasing ? "Borrando" : "Borrar"}
              </button>
              <button type="button" className="btn btn-leaf" onClick={clearFree}>
                Limpiar todo
              </button>
            </div>
            <p className="dibujo-hint">Lienzo grande: desliza para dibujar · desplázate para explorar</p>
            <div className="free-scroll">
              <canvas
                ref={freeCanvasRef}
                width={1200}
                height={900}
                className="free-canvas"
                onPointerDown={startFree}
                onPointerMove={moveFree}
                onPointerUp={endFree}
                onPointerCancel={endFree}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}