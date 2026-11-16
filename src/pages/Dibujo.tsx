import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
import { ColorPalette } from "../components/ColorPalette";
import { useProgress } from "../hooks/useProgress";
import { BRUSH_PRESETS, type BrushPreset } from "../lib/drawing-tools";
import { COLORING_PACKS, packForImage } from "../lib/coloring-packs";
import { drawSvgOnCanvas } from "../lib/svg-canvas";
import "./Dibujo.css";

type Mode = "colorear" | "libre";

const MAX_UNDO = 24;

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

function useCanvasUndo(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const stack = useRef<ImageData[]>([]);

  const snapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    stack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (stack.current.length > MAX_UNDO) stack.current.shift();
  }, [canvasRef]);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || stack.current.length === 0) return;
    const prev = stack.current.pop()!;
    ctx.putImageData(prev, 0, 0);
  }, [canvasRef]);

  const resetStack = useCallback(() => {
    stack.current = [];
  }, []);

  return { snapshot, undo, resetStack };
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
  const [color, setColor] = useState("#ff6b6b");
  const [brushPreset, setBrushPreset] = useState<BrushPreset>(BRUSH_PRESETS[4]);
  const [erasing, setErasing] = useState(false);
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);
  const freeCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const colorUndo = useCanvasUndo(colorCanvasRef);
  const freeUndo = useCanvasUndo(freeCanvasRef);

  const activePackRow = unlockedByPack.find((r) => r.pack.id === packId) ?? unlockedByPack[0];
  const packPages = activePackRow?.pages ?? [];
  const currentTemplate = packPages.find((t) => t.id === templateId) ?? packPages[0];

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
    colorUndo.resetStack();
    try {
      await drawSvgOnCanvas(ctx, currentTemplate.src, canvas.width, canvas.height);
    } catch {
      ctx.fillStyle = "#f7fbff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [currentTemplate, colorUndo]);

  useEffect(() => {
    if (mode === "colorear" && currentTemplate) void paintTemplate();
  }, [mode, paintTemplate, currentTemplate]);

  useEffect(() => {
    const canvas = freeCanvasRef.current;
    if (!canvas || mode !== "libre") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    freeUndo.resetStack();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [mode, freeUndo]);

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
    colorUndo.snapshot();
    const p = pointerPos(canvas, e);
    const fill = erasing ? "#ffffff" : color;
    floodFill(ctx, p.x, p.y, fill);
  }

  function applyBrushStyle(ctx: CanvasRenderingContext2D, preset: BrushPreset, erase: boolean) {
    ctx.lineCap = preset.kind === "brocha" ? "butt" : "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = preset.size;
    if (erase) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
    } else {
      ctx.globalAlpha = preset.opacity;
      ctx.strokeStyle = color;
    }
  }

  function startFree(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = freeCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    freeUndo.snapshot();
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
    applyBrushStyle(ctx, brushPreset, erasing);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
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
    freeUndo.snapshot();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const lockedCount =
    COLORING_PACKS.flatMap((p) => p.images).length - progress.unlockedImages.length;

  const toolBar = (
    <div className="dibujo-toolbar dibujo-toolbar-compact">
      <button
        type="button"
        className={`btn btn-ghost btn-mini ${erasing ? "" : "tool-active"}`}
        onClick={() => setErasing(false)}
      >
        Pintar
      </button>
      <button
        type="button"
        className={`btn btn-mini ${erasing ? "btn-coral" : "btn-ghost"}`}
        onClick={() => setErasing(true)}
      >
        Goma
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-mini"
        onClick={() => (mode === "colorear" ? colorUndo.undo() : freeUndo.undo())}
      >
        ↩
      </button>
      <button
        type="button"
        className="btn btn-leaf btn-mini"
        onClick={() => {
          if (mode === "colorear") void paintTemplate();
          else clearFree();
        }}
      >
        Limpiar
      </button>
    </div>
  );

  return (
    <main className="screen dibujo">
      <div className="back-row">
        <BackButton />
      </div>
      <h1 className="dibujo-title-plain">Dibujo</h1>
      <p className="dibujo-sub-plain">
        {progress.unlockedImages.length} páginas listas
        {lockedCount > 0 ? ` · ${lockedCount} más en lectura y mates` : ""}
      </p>

      <div className="level-pills dibujo-mode-pills">
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

      <div className="dibujo-workspace">
        <aside className="dibujo-sidebar panel-soft">
          {mode === "colorear" ? (
            unlockedByPack.length === 0 ? (
              <p className="dibujo-locked-msg">Gana niveles en Leer o Matemáticas para más páginas.</p>
            ) : (
              <>
                <p className="dibujo-side-title">Libros</p>
                <div className="dibujo-side-scroll">
                  {unlockedByPack.map(({ pack }) => (
                    <button
                      key={pack.id}
                      type="button"
                      className={`dibujo-side-item ${packId === pack.id ? "active" : ""}`}
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
                <p className="dibujo-side-title">Páginas</p>
                <div className="dibujo-side-scroll dibujo-pages">
                  {packPages.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`dibujo-side-item ${templateId === t.id ? "active" : ""}`}
                      onClick={() => setTemplateId(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <>
              <p className="dibujo-side-title">Herramientas</p>
              {BRUSH_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`dibujo-side-item ${brushPreset.id === p.id ? "active" : ""}`}
                  onClick={() => {
                    setBrushPreset(p);
                    setErasing(false);
                  }}
                >
                  {p.kind === "lapiz" ? "✏️" : p.kind === "plumon" ? "🖍️" : "🖌️"} {p.label}
                </button>
              ))}
            </>
          )}
        </aside>

        <section className="dibujo-canvas-area">
          {mode === "colorear" && unlockedByPack.length > 0 && (
            <p className="dibujo-hint">
              {packForImage(currentTemplate?.id ?? "")?.name} ·{" "}
              {erasing ? "Toca para borrar" : "Toca una zona para colorear"}
            </p>
          )}
          {mode === "colorear" && unlockedByPack.length > 0 ? (
            <div className="canvas-frame canvas-frame-large">
              <canvas
                ref={colorCanvasRef}
                width={520}
                height={680}
                className="draw-canvas draw-canvas-large"
                onPointerDown={onColorPointer}
              />
            </div>
          ) : mode === "libre" ? (
            <div className="free-scroll free-scroll-large">
              <canvas
                ref={freeCanvasRef}
                width={1400}
                height={1000}
                className="free-canvas"
                onPointerDown={startFree}
                onPointerMove={moveFree}
                onPointerUp={endFree}
                onPointerCancel={endFree}
              />
            </div>
          ) : null}
        </section>

        <aside className="dibujo-palette-side panel-soft">
          <ColorPalette color={color} onColor={setColor} onPick={() => setErasing(false)} compact />
          {toolBar}
        </aside>
      </div>
    </main>
  );
}