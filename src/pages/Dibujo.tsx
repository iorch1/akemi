import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
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

const TEMPLATES = [
  { id: "casa", label: "Casa" },
  { id: "sol", label: "Sol" },
  { id: "pez", label: "Pez" },
  { id: "estrella", label: "Estrella" },
] as const;

function drawTemplate(ctx: CanvasRenderingContext2D, id: string, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f7fbff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#0b3a4a";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (id === "casa") {
    ctx.beginPath();
    ctx.rect(90, 160, 140, 110);
    ctx.moveTo(80, 160);
    ctx.lineTo(160, 80);
    ctx.lineTo(240, 160);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeRect(140, 200, 40, 70);
    ctx.strokeRect(110, 180, 35, 35);
    ctx.strokeRect(175, 180, 35, 35);
  } else if (id === "sol") {
    ctx.beginPath();
    ctx.arc(160, 160, 55, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(160 + Math.cos(a) * 70, 160 + Math.sin(a) * 70);
      ctx.lineTo(160 + Math.cos(a) * 100, 160 + Math.sin(a) * 100);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(140, 150, 6, 0, Math.PI * 2);
    ctx.arc(180, 150, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#0b3a4a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(160, 170, 18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (id === "pez") {
    ctx.beginPath();
    ctx.ellipse(150, 160, 70, 40, 0, 0, Math.PI * 2);
    ctx.moveTo(220, 160);
    ctx.lineTo(270, 120);
    ctx.lineTo(270, 200);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(120, 150, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#0b3a4a";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(150, 130);
    ctx.quadraticCurveTo(170, 110, 190, 130);
    ctx.stroke();
  } else {
    const cx = 160;
    const cy = 160;
    const spikes = 5;
    const outer = 80;
    const inner = 35;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}

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

  // Don't fill dark outlines
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
    if (cx > 0) {
      stack.push(cx - 1, cy);
    }
    if (cx < width - 1) {
      stack.push(cx + 1, cy);
    }
    if (cy > 0) {
      stack.push(cx, cy - 1);
    }
    if (cy < height - 1) {
      stack.push(cx, cy + 1);
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function Dibujo() {
  const [mode, setMode] = useState<Mode>("colorear");
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]["id"]>("casa");
  const [color, setColor] = useState(COLORS[1]);
  const [brush, setBrush] = useState(8);
  const [erasing, setErasing] = useState(false);
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);
  const freeCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const paintTemplate = useCallback(() => {
    const canvas = colorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTemplate(ctx, template, canvas.width, canvas.height);
  }, [template]);

  useEffect(() => {
    if (mode === "colorear") paintTemplate();
  }, [mode, paintTemplate]);

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

  return (
    <main className="screen dibujo">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Dibujo</h1>
        <p className="section-sub">Colorea dibujos o crea en el lienzo libre</p>

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
            <div className="level-pills">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`level-pill ${template === t.id ? "active" : ""}`}
                  onClick={() => setTemplate(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="dibujo-hint">Toca una zona para rellenarla de color</p>
            <div className="canvas-frame">
              <canvas
                ref={colorCanvasRef}
                width={320}
                height={320}
                className="draw-canvas"
                onPointerDown={onColorPointer}
              />
            </div>
            <div className="score-bar">
              <button type="button" className="btn btn-leaf" onClick={paintTemplate}>
                Limpiar
              </button>
            </div>
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
