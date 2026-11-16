import type { FlagGoal, LowObstacle, Platform, PlayerState } from "./physics";
import { playerHeight } from "./physics";

export type StageDrawTime = { now?: number };
export type Camera = { x: number };

function cloudBlob(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 1.1, s * 0.7, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.75, y + s * 0.1, s * 0.7, s * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.8, y + s * 0.15, s * 0.75, s * 0.58, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.15, y - s * 0.35, s * 0.65, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Cielo, nubes y colinas — atmósfera de platformer infantil (estilo original). */
export function drawStageBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: StageDrawTime = {},
  camera: Camera = { x: 0 },
) {
  const t = time.now ?? 0;
  const cam = camera.x;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#5ec8f0");
  sky.addColorStop(0.45, "#8edaf5");
  sky.addColorStop(0.72, "#b8e8a8");
  sky.addColorStop(1, "#7bc45a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Sol
  const sunX = width - 56;
  const sunY = 42;
  const pulse = 1 + Math.sin(t / 700) * 0.04;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 40 * pulse);
  sunGlow.addColorStop(0, "rgba(255, 236, 140, 0.95)");
  sunGlow.addColorStop(0.5, "rgba(255, 196, 50, 0.45)");
  sunGlow.addColorStop(1, "rgba(255, 196, 50, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 40 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe566";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
  ctx.fill();

  // Nubes con parallax suave
  const drift = (t / 35 + cam * 0.15) % (width + 160);
  cloudBlob(ctx, ((70 + drift) % (width + 160)) - 50, 36, 24, 0.92);
  cloudBlob(ctx, ((220 + drift * 0.7) % (width + 140)) - 40, 58, 18, 0.8);
  cloudBlob(ctx, ((380 + drift * 0.5) % (width + 120)) - 30, 28, 16, 0.88);

  // Colinas lejanas (parallax)
  const hillShift = -cam * 0.25;
  ctx.fillStyle = "rgba(90, 170, 70, 0.45)";
  ctx.beginPath();
  ctx.moveTo(hillShift - 40, height * 0.72);
  ctx.quadraticCurveTo(hillShift + width * 0.25, height * 0.55, hillShift + width * 0.5, height * 0.7);
  ctx.quadraticCurveTo(hillShift + width * 0.75, height * 0.82, hillShift + width + 40, height * 0.62);
  ctx.lineTo(hillShift + width + 40, height);
  ctx.lineTo(hillShift - 40, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(70, 150, 55, 0.5)";
  ctx.beginPath();
  ctx.moveTo(hillShift + 80, height * 0.78);
  ctx.quadraticCurveTo(hillShift + width * 0.4, height * 0.62, hillShift + width * 0.85, height * 0.76);
  ctx.lineTo(hillShift + width + 20, height);
  ctx.lineTo(hillShift + 60, height);
  ctx.closePath();
  ctx.fill();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#c4744a";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#d9895c";
  ctx.fillRect(x, y, w, Math.max(4, h * 0.35));
  ctx.strokeStyle = "#8a4330";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Juntas
  ctx.strokeStyle = "rgba(90, 40, 25, 0.35)";
  ctx.beginPath();
  for (let bx = x + 16; bx < x + w; bx += 16) {
    ctx.moveTo(bx, y);
    ctx.lineTo(bx, y + h);
  }
  for (let by = y + 10; by < y + h; by += 10) {
    ctx.moveTo(x, by);
    ctx.lineTo(x + w, by);
  }
  ctx.stroke();
}

function drawGrassPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(x, y + 6, w, h - 6);
  ctx.fillStyle = "#6b4420";
  ctx.fillRect(x, y + h - 4, w, 4);
  // Césped encima
  const grass = ctx.createLinearGradient(x, y, x, y + 10);
  grass.addColorStop(0, "#9be564");
  grass.addColorStop(1, "#4f9e2f");
  ctx.fillStyle = grass;
  roundRectPath(ctx, x - 1, y, w + 2, 10, 4);
  ctx.fill();
  ctx.strokeStyle = "#3d7a24";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Tallos
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  for (let i = x + 4; i < x + w; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, y + 9);
    ctx.lineTo(i - 1, y + 2);
    ctx.stroke();
  }
}

function drawGroundStrip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const soil = ctx.createLinearGradient(x, y, x, y + h);
  soil.addColorStop(0, "#7d4f28");
  soil.addColorStop(0.25, "#a06a3a");
  soil.addColorStop(1, "#5c3818");
  ctx.fillStyle = soil;
  ctx.fillRect(x, y, w, h);
  // Franja de pasto
  ctx.fillStyle = "#5cb338";
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = "#8fdc5a";
  ctx.fillRect(x, y, w, 5);
  for (let i = x; i < x + w; i += 7) {
    ctx.fillStyle = i % 14 === 0 ? "#6fcc42" : "#4aa028";
    ctx.fillRect(i, y - 3, 4, 5);
  }
  // Piedras
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let i = x + 12; i < x + w; i += 28) {
    ctx.beginPath();
    ctx.ellipse(i, y + 22, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPipeBody(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rim = 8;
  // Cuerpo
  const body = ctx.createLinearGradient(x, y, x + w, y);
  body.addColorStop(0, "#2f9e4a");
  body.addColorStop(0.35, "#49c46a");
  body.addColorStop(0.7, "#2d8f45");
  body.addColorStop(1, "#1f6b32");
  ctx.fillStyle = body;
  roundRectPath(ctx, x + 3, y + rim - 2, w - 6, h - rim + 2, 6);
  ctx.fill();
  // Boca / rim
  const top = ctx.createLinearGradient(x, y, x + w, y);
  top.addColorStop(0, "#3eb85a");
  top.addColorStop(0.5, "#6ae087");
  top.addColorStop(1, "#2f9e4a");
  ctx.fillStyle = top;
  roundRectPath(ctx, x - 2, y, w + 4, rim + 2, 6);
  ctx.fill();
  ctx.strokeStyle = "#1a5c2c";
  ctx.lineWidth = 2;
  roundRectPath(ctx, x - 2, y, w + 4, rim + 2, 6);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 8, y + rim + 4, 5, Math.max(8, h - rim - 10));
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#ffd56a");
  g.addColorStop(1, "#e09a2b");
  ctx.fillStyle = g;
  roundRectPath(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = "#b56e12";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  roundRectPath(ctx, x + 4, y + 3, w * 0.35, h * 0.28, 3);
  ctx.fill();
  // Motivo amigable (estrella simple, no ©)
  ctx.fillStyle = "#fff3c0";
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPlatforms(
  ctx: CanvasRenderingContext2D,
  platforms: Platform[],
  camera: Camera = { x: 0 },
) {
  for (const p of platforms) {
    const x = p.x - camera.x;
    const y = p.y;
    if (x + p.w < -20 || x > 520) continue;
    if (p.kind === "ground") drawGroundStrip(ctx, x, y, p.w, p.h);
    else if (p.kind === "brick") drawBrick(ctx, x, y, p.w, p.h);
    else if (p.kind === "grass") drawGrassPlatform(ctx, x, y, p.w, p.h);
    else if (p.kind === "pipe") drawPipeBody(ctx, x, y, p.w, p.h);
    else if (p.kind === "block") drawBlock(ctx, x, y, p.w, p.h);
  }
}

export function drawLowObstacles(
  ctx: CanvasRenderingContext2D,
  lows: LowObstacle[],
  camera: Camera = { x: 0 },
) {
  for (const low of lows) {
    const x = low.x - camera.x;
    if (low.kind === "pipe") drawPipeBody(ctx, x, low.y, low.w, low.h);
    else drawBlock(ctx, x, low.y, low.w, low.h);
  }
}

/** Bandera / meta (diseño original). */
export function drawFlag(
  ctx: CanvasRenderingContext2D,
  flag: FlagGoal,
  time: StageDrawTime = {},
  camera: Camera = { x: 0 },
) {
  const t = time.now ?? 0;
  const x = flag.x - camera.x;
  const baseY = flag.y;
  const topY = baseY - flag.h;

  // Sombra
  ctx.fillStyle = "rgba(40, 60, 30, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x, baseY + 2, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mástil
  ctx.fillStyle = "#dfe6e0";
  ctx.fillRect(x - 3, topY, 6, flag.h);
  ctx.fillStyle = "#9aa69c";
  ctx.fillRect(x + 1, topY, 2, flag.h);

  // Bola
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(x, topY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e09a2b";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bandera ondeante
  const wave = Math.sin(t / 220) * 4;
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.moveTo(x + 3, topY + 10);
  ctx.quadraticCurveTo(x + 28 + wave, topY + 22, x + 3, topY + 36);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c9184a";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(x + 12 + wave * 0.3, topY + 22, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** Aki mirando izquierda/derecha (sin rotación de heading). */
export function drawAkemiSprite(
  ctx: CanvasRenderingContext2D,
  st: PlayerState,
  camera: Camera = { x: 0 },
) {
  const h = playerHeight(st);
  const sx = st.x - camera.x;
  const sy = st.y;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(st.facing, 1);

  // Sombra
  ctx.fillStyle = "rgba(40, 60, 40, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const crouch = st.crouching;
  const legY = crouch ? -8 : -12;
  const bodyH = crouch ? 14 : 18;
  const headY = crouch ? -h + 4 : -h + 2;

  // Piernas
  ctx.fillStyle = "#3a86ff";
  roundRectPath(ctx, -10, legY, 8, crouch ? 8 : 12, 3);
  ctx.fill();
  roundRectPath(ctx, 2, legY, 8, crouch ? 8 : 12, 3);
  ctx.fill();

  // Zapatos
  ctx.fillStyle = "#fb5607";
  roundRectPath(ctx, -11, -2, 10, 5, 2);
  ctx.fill();
  roundRectPath(ctx, 1, -2, 10, 5, 2);
  ctx.fill();

  // Cuerpo
  const shirt = ctx.createLinearGradient(-12, -bodyH - 4, 12, 0);
  shirt.addColorStop(0, "#ff8fab");
  shirt.addColorStop(1, "#ff5c8a");
  ctx.fillStyle = shirt;
  roundRectPath(ctx, -11, -bodyH - 2, 22, bodyH, 7);
  ctx.fill();
  ctx.strokeStyle = "#c9184a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Brazos
  ctx.fillStyle = "#ffcad4";
  roundRectPath(ctx, -16, -bodyH + 2, 6, crouch ? 8 : 11, 3);
  ctx.fill();
  roundRectPath(ctx, 10, -bodyH + 2, 6, crouch ? 8 : 11, 3);
  ctx.fill();

  // Cabeza
  const face = ctx.createRadialGradient(-2, headY + 8, 2, 0, headY + 10, 13);
  face.addColorStop(0, "#ffe5ec");
  face.addColorStop(1, "#ffb3c6");
  ctx.fillStyle = face;
  roundRectPath(ctx, -11, headY, 22, 22, 10);
  ctx.fill();
  ctx.strokeStyle = "#e85a7a";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Cabello
  ctx.fillStyle = "#6d4c41";
  ctx.beginPath();
  ctx.ellipse(-2, headY + 2, 11, 5, -0.1, Math.PI, Math.PI * 2);
  ctx.fill();

  // Ojos
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-4, headY + 10, 3.4, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(4.5, headY + 10, 3.4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2d42";
  ctx.beginPath();
  ctx.arc(-3.2, headY + 10.5, 2, 0, Math.PI * 2);
  ctx.arc(5.2, headY + 10.5, 2, 0, Math.PI * 2);
  ctx.fill();

  // Mejillas + sonrisa
  ctx.fillStyle = "rgba(255, 120, 140, 0.4)";
  ctx.beginPath();
  ctx.ellipse(-8, headY + 15, 2.5, 1.6, 0, 0, Math.PI * 2);
  ctx.ellipse(8, headY + 15, 2.5, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c9184a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, headY + 15, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
}

export type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  w: number;
  h: number;
};

const CONFETTI_COLORS = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#ff8fab", "#ffe066", "#fb5607"];

export function createConfetti(width: number, height: number, count = 48): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.4,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 1.2 + Math.random() * 2.2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
    });
  }
  return pieces;
}

export function stepConfetti(pieces: ConfettiPiece[], width: number, height: number) {
  for (const p of pieces) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.03;
    p.rot += p.vr;
    if (p.y > height + 20) {
      p.y = -10;
      p.x = Math.random() * width;
      p.vy = 1.2 + Math.random() * 1.8;
    }
  }
}

export function drawConfetti(ctx: CanvasRenderingContext2D, pieces: ConfettiPiece[]) {
  for (const p of pieces) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
}

export function drawWinSparkles(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: StageDrawTime = {},
) {
  const t = time.now ?? 0;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t / 500;
    const r = 36 + Math.sin(t / 250 + i) * 8;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const s = 3 + (i % 3);
    ctx.strokeStyle = i % 2 === 0 ? "#ffe066" : "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  roundRectPath(ctx, x, y, w, h, r);
}

/** Compat stubs (ya no se usan muros/gemas del grid). */
export function drawStageWalls(_ctx: CanvasRenderingContext2D, _walls: unknown[]) {}
export function drawStageGoals(
  _ctx: CanvasRenderingContext2D,
  _goals: unknown[],
  _collected: Set<string>,
  _time?: StageDrawTime,
) {}
