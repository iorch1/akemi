import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
import { BrushToolMenus } from "../components/BrushToolMenus";
import { ColorPalette } from "../components/ColorPalette";
import { useProgress } from "../hooks/useProgress";
import { BRUSH_PRESETS, type BrushPreset } from "../lib/drawing-tools";
import { COLORING_PACKS, packForImage } from "../lib/coloring-packs";
import { drawSvgOnCanvas } from "../lib/svg-canvas";
import "./Dibujo.css";

type Mode = "colorear" | "libre";

const MAX_UNDO = 24;
const COLOR_W = 400;
const COLOR_H = 520;

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

  const canUndo = useCallback(() => stack.current.length > 0, []);

  return useMemo(
    () => ({ snapshot, undo, resetStack, canUndo }),
    [snapshot, undo, resetStack, canUndo],
  );
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
  const colorBaseOffscreenRef = useRef<HTMLCanvasElement | null>(null);
  const freeCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  /** Estado pintado por página (no se pierde al cambiar color o herramienta). */
  const pagePaintCache = useRef<Map<string, ImageData>>(new Map());
  /** Línea base del modelo por página (offscreen). */
  const pageBaseCache = useRef<Map<string, ImageData>>(new Map());
  const activeColorPageRef = useRef<string>("");
  const freeCanvasInitialized = useRef(false);

  const colorUndo = useCanvasUndo(colorCanvasRef);
  const freeUndo = useCanvasUndo(freeCanvasRef);

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

  const saveActiveColorPage = useCallback(() => {
    const canvas = colorCanvasRef.current;
    const pageId = activeColorPageRef.current;
    if (!canvas || !pageId) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    pagePaintCache.current.set(
      pageId,
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    );
  }, []);

  const getOffscreenBase = useCallback(() => {
    if (!colorBaseOffscreenRef.current) {
      const off = document.createElement("canvas");
      off.width = COLOR_W;
      off.height = COLOR_H;
      colorBaseOffscreenRef.current = off;
    }
    return colorBaseOffscreenRef.current;
  }, []);

  const ensureBaseTemplate = useCallback(
    async (pageId: string, src: string): Promise<ImageData | null> => {
      const cached = pageBaseCache.current.get(pageId);
      if (cached) return cached;
      const off = getOffscreenBase();
      const ctx = off.getContext("2d");
      if (!ctx) return null;
      try {
        await drawSvgOnCanvas(ctx, src, off.width, off.height);
      } catch {
        ctx.fillStyle = "#f7fbff";
        ctx.fillRect(0, 0, off.width, off.height);
      }
      const base = ctx.getImageData(0, 0, off.width, off.height);
      pageBaseCache.current.set(pageId, base);
      return base;
    },
    [getOffscreenBase],
  );

  const showColorPage = useCallback(
    async (pageId: string, src: string) => {
      const canvas = colorCanvasRef.current;
      if (!canvas || mode !== "colorear") return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await ensureBaseTemplate(pageId, src);
      colorUndo.resetStack();

      const painted = pagePaintCache.current.get(pageId);
      if (painted) {
        ctx.putImageData(painted, 0, 0);
      } else {
        const base = pageBaseCache.current.get(pageId);
        if (base) ctx.putImageData(base, 0, 0);
      }
      activeColorPageRef.current = pageId;
    },
    [colorUndo, ensureBaseTemplate, mode],
  );

  useEffect(() => {
    if (mode !== "colorear" || !currentTemplate) return;
  void showColorPage(currentTemplate.id, currentTemplate.src);
  }, [mode, currentTemplate?.id, currentTemplate?.src, showColorPage]);

  useEffect(() => {
    return () => {
      saveActiveColorPage();
    };
  }, [currentTemplate?.id, saveActiveColorPage]);

  useEffect(() => {
    if (mode !== "libre") return;
    const canvas = freeCanvasRef.current;
    if (!canvas || freeCanvasInitialized.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    freeCanvasInitialized.current = true;
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
    colorUndo.snapshot();
    const p = pointerPos(canvas, e);
    const fill = erasing ? "#ffffff" : color;
    floodFill(ctx, p.x, p.y, fill);
    if (currentTemplate) {
      pagePaintCache.current.set(
        currentTemplate.id,
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      );
    }
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

  function clearColorPage() {
    if (!currentTemplate) return;
    const canvas = colorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    colorUndo.snapshot();
    pagePaintCache.current.delete(currentTemplate.id);
    const base = pageBaseCache.current.get(currentTemplate.id);
    if (base) ctx.putImageData(base, 0, 0);
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

  const lockedCount = COLORING_PACKS.flatMap((p) => p.images).length - progress.unlockedImages.length;
  const packLabel = currentTemplate ? packForImage(currentTemplate.id)?.name : "";

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
        ↩ Deshacer
      </button>
      <button
        type="button"
        className="btn btn-leaf btn-mini"
        onClick={() => {
          if (mode === "colorear") clearColorPage();
          else clearFree();
        }}
      >
        Limpiar
      </button>
    </div>
  );

  const templateSidebar =
    mode === "colorear" ? (
      unlockedByPack.length === 0 ? (
        <p className="dibujo-locked-msg">
          Aún no hay páginas. Gana retos en Aprender a leer o Matemáticas.
        </p>
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
                  saveActiveColorPage();
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
                onClick={() => {
                  saveActiveColorPage();
                  setTemplateId(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {packLabel && <p className="dibujo-pack-label">{packLabel}</p>}
        </>
      )
    ) : (
      <>
        <p className="dibujo-side-title">Lienzo libre</p>
        <p className="dibujo-hint dibujo-hint-side">
          Desliza para dibujar. Usa las herramientas de la izquierda.
        </p>
      </>
    );

  const canvasArea =
    mode === "colorear" && unlockedByPack.length > 0 ? (
      <>
        <p className="dibujo-hint">
          {erasing ? "Toca una zona para borrar (blanco)" : "Toca una zona para rellenarla de color"}
        </p>
        <div className="canvas-frame canvas-frame-large">
          <canvas
            ref={colorCanvasRef}
            width={COLOR_W}
            height={COLOR_H}
            className="draw-canvas draw-canvas-large"
            onPointerDown={onColorPointer}
          />
        </div>
      </>
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
    ) : null;

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
        <aside className="dibujo-palette-side panel-soft" aria-label="Colores y herramientas">
          <ColorPalette
            color={color}
            onColor={setColor}
            onPick={() => setErasing(false)}
            compact
          />
          {mode === "libre" && (
            <>
              <p className="dibujo-side-title">Herramientas</p>
              <BrushToolMenus
                active={brushPreset}
                onPick={(preset) => {
                  setBrushPreset(preset);
                  setErasing(false);
                }}
              />
            </>
          )}
          {toolBar}
        </aside>

        <section className="dibujo-canvas-area" aria-label="Lienzo">
          {canvasArea}
        </section>

        <aside className="dibujo-sidebar panel-soft" aria-label="Plantillas">
          {templateSidebar}
        </aside>
      </div>
    </main>
  );
}