import type { StageGoal } from "./curriculum";
import type { StageWall } from "./obstacles";
import type { SpriteState } from "./runtime";

/** Tiempo en ms para animaciones suaves del escenario (brillos, nubes, confeti). */
export type StageDrawTime = { now?: number };

function starShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, points: number) {
  const inner = outer * 0.42;
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

function cloudBlob(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 1.1, s * 0.7, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.75, y + s * 0.1, s * 0.7, s * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.8, y + s * 0.15, s * 0.75, s * 0.58, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.15, y - s * 0.35, s * 0.65, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Fondo infantil: cielo, nubes, sol, pasto con textura y borde suave. */
export function drawStageBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: StageDrawTime = {},
) {
  const t = time.now ?? 0;
  const skyH = height * 0.58;

  const sky = ctx.createLinearGradient(0, 0, 0, skyH);
  sky.addColorStop(0, "#7ec8f5");
  sky.addColorStop(0.55, "#a8dff8");
  sky.addColorStop(1, "#c8efc0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, skyH);

  const grass = ctx.createLinearGradient(0, skyH - 20, 0, height);
  grass.addColorStop(0, "#8fd46a");
  grass.addColorStop(0.45, "#6fc24a");
  grass.addColorStop(1, "#4e9e36");
  ctx.fillStyle = grass;
  ctx.fillRect(0, skyH - 18, width, height - skyH + 18);

  // Colinas suaves
  ctx.fillStyle = "rgba(110, 190, 70, 0.55)";
  ctx.beginPath();
  ctx.moveTo(0, skyH + 8);
  ctx.quadraticCurveTo(width * 0.22, skyH - 28, width * 0.45, skyH + 4);
  ctx.quadraticCurveTo(width * 0.7, skyH + 36, width, skyH - 6);
  ctx.lineTo(width, skyH + 40);
  ctx.lineTo(0, skyH + 40);
  ctx.closePath();
  ctx.fill();

  // Sol con rayos suaves
  const sunX = width - 48;
  const sunY = 46;
  const pulse = 1 + Math.sin(t / 700) * 0.04;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 38 * pulse);
  sunGlow.addColorStop(0, "rgba(255, 236, 140, 0.95)");
  sunGlow.addColorStop(0.45, "rgba(255, 200, 60, 0.55)");
  sunGlow.addColorStop(1, "rgba(255, 200, 60, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 38 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe566";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff3a8";
  ctx.beginPath();
  ctx.arc(sunX - 5, sunY - 5, 6, 0, Math.PI * 2);
  ctx.fill();

  // Nubes que se desplazan muy despacio
  const drift = (t / 40) % (width + 120);
  cloudBlob(ctx, ((80 + drift) % (width + 120)) - 40, 38, 22, 0.92);
  cloudBlob(ctx, ((210 + drift * 0.7) % (width + 140)) - 50, 62, 18, 0.78);
  cloudBlob(ctx, ((340 + drift * 0.55) % (width + 100)) - 30, 28, 16, 0.85);

  // Textura de césped (líneas/tallos)
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < width; i += 14) {
    const gx = i + ((i * 7) % 5);
    const gy = skyH + 10 + ((i * 3) % 9);
    ctx.beginPath();
    ctx.moveTo(gx, gy + 10);
    ctx.lineTo(gx - 2, gy);
    ctx.moveTo(gx, gy + 10);
    ctx.lineTo(gx + 3, gy + 1);
    ctx.stroke();
  }

  // Flores pequeñas decorativas (solo visual)
  const flowers = [
    { x: 28, y: height - 28, c: "#ff7aa2" },
    { x: 62, y: height - 22, c: "#ffd166" },
    { x: width - 34, y: height - 30, c: "#ff9f68" },
    { x: width - 70, y: height - 20, c: "#7bdff2" },
  ];
  for (const f of flowers) {
    ctx.fillStyle = f.c;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(f.x + Math.cos(a) * 5, f.y + Math.sin(a) * 5, 4, 3, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cuadrícula muy suave (ayuda a planificar sin verse “plana”)
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, skyH - 10);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = Math.ceil((skyH - 10) / 40) * 40; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Marco interior redondeado (clip visual con borde)
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 6;
  roundRectPath(ctx, 3, 3, width - 6, height - 6, 18);
  ctx.stroke();
  ctx.strokeStyle = "rgba(46, 140, 90, 0.35)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, 6, 6, width - 12, height - 12, 16);
  ctx.stroke();
}

/** Estrella dorada de meta con brillo animado. */
export function drawGoalStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: StageDrawTime = {},
) {
  const t = time.now ?? 0;
  const bob = Math.sin(t / 380) * 2.5;
  const cy = y + bob;
  const glowR = 30 + Math.sin(t / 280) * 4;

  const glow = ctx.createRadialGradient(x, cy, 4, x, cy, glowR);
  glow.addColorStop(0, "rgba(255, 240, 150, 0.85)");
  glow.addColorStop(0.5, "rgba(255, 200, 60, 0.35)");
  glow.addColorStop(1, "rgba(255, 200, 60, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, cy, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Sombra suave
  ctx.fillStyle = "rgba(80, 60, 20, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createRadialGradient(x - 4, cy - 8, 2, x, cy, 24);
  g.addColorStop(0, "#fff8c8");
  g.addColorStop(0.4, "#ffe066");
  g.addColorStop(0.75, "#ffb703");
  g.addColorStop(1, "#f48c06");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#c77d0a";
  ctx.lineWidth = 2.2;
  starShape(ctx, x, cy, 23, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(x - 5, cy - 7, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Destellos
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  const spark = 6 + Math.sin(t / 200) * 2;
  ctx.beginPath();
  ctx.moveTo(x + 16, cy - 14);
  ctx.lineTo(x + 16 + spark, cy - 14);
  ctx.moveTo(x + 16 + spark / 2, cy - 14 - spark / 2);
  ctx.lineTo(x + 16 + spark / 2, cy - 14 + spark / 2);
  ctx.stroke();
}

/** Gema coleccionable brillante (forma y hitbox visual centrados en x,y). */
export function drawGoalGem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: StageDrawTime = {},
) {
  const t = time.now ?? 0;
  const bob = Math.sin(t / 420 + x * 0.02) * 2;
  const cy = y + bob;

  ctx.save();
  ctx.translate(x, cy);

  ctx.fillStyle = "rgba(60, 40, 90, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  glow.addColorStop(0, "rgba(180, 120, 255, 0.45)");
  glow.addColorStop(1, "rgba(180, 120, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(-10, -18, 12, 20);
  body.addColorStop(0, "#e0aaff");
  body.addColorStop(0.35, "#c77dff");
  body.addColorStop(0.7, "#9b5de5");
  body.addColorStop(1, "#5a189a");
  ctx.fillStyle = body;
  ctx.strokeStyle = "#3c096c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(13, -3);
  ctx.lineTo(8, 18);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-13, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Facetas
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(0, 18);
  ctx.moveTo(-13, -3);
  ctx.lineTo(13, -3);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(-5, -10);
  ctx.lineTo(1, -2);
  ctx.lineTo(-3, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawStageGoals(
  ctx: CanvasRenderingContext2D,
  goals: StageGoal[],
  collected: Set<string>,
  time: StageDrawTime = {},
) {
  for (const g of goals) {
    if (g.kind === "collect" && collected.has(g.id)) continue;
    if (g.kind === "star") drawGoalStar(ctx, g.x, g.y, time);
    else drawGoalGem(ctx, g.x, g.y, time);
  }
}

/** Muñeco infantil «Aki» más expresivo (hitbox de colisión no cambia). */
export function drawAkemiSprite(ctx: CanvasRenderingContext2D, st: SpriteState) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate((st.heading * Math.PI) / 180);

  // Sombra
  ctx.fillStyle = "rgba(40, 60, 40, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 26, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Piernas
  ctx.fillStyle = "#3a86ff";
  roundRectPath(ctx, -11, 14, 9, 12, 3);
  ctx.fill();
  roundRectPath(ctx, 2, 14, 9, 12, 3);
  ctx.fill();

  // Zapatos
  ctx.fillStyle = "#fb5607";
  roundRectPath(ctx, -12, 23, 10, 5, 2);
  ctx.fill();
  roundRectPath(ctx, 2, 23, 10, 5, 2);
  ctx.fill();

  // Cuerpo (camiseta coral viva)
  const shirt = ctx.createLinearGradient(-12, 0, 12, 20);
  shirt.addColorStop(0, "#ff8fab");
  shirt.addColorStop(1, "#ff5c8a");
  ctx.fillStyle = shirt;
  roundRectPath(ctx, -12, 2, 24, 18, 8);
  ctx.fill();
  ctx.strokeStyle = "#c9184a";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Botón / detalle
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(0, 11, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Brazos
  ctx.fillStyle = "#ffcad4";
  roundRectPath(ctx, -17, 4, 7, 12, 3.5);
  ctx.fill();
  roundRectPath(ctx, 10, 4, 7, 12, 3.5);
  ctx.fill();

  // Cabeza
  const face = ctx.createRadialGradient(-2, -12, 2, 0, -8, 14);
  face.addColorStop(0, "#ffe5ec");
  face.addColorStop(1, "#ffb3c6");
  ctx.fillStyle = face;
  roundRectPath(ctx, -11, -20, 22, 24, 11);
  ctx.fill();
  ctx.strokeStyle = "#e85a7a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cabello mechón
  ctx.fillStyle = "#6d4c41";
  ctx.beginPath();
  ctx.ellipse(-2, -20, 12, 6, -0.15, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, -18, 5, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Ojos grandes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-4.5, -10, 3.6, 4.2, 0, 0, Math.PI * 2);
  ctx.ellipse(4.5, -10, 3.6, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2d42";
  ctx.beginPath();
  ctx.arc(-3.8, -9.5, 2.1, 0, Math.PI * 2);
  ctx.arc(5.2, -9.5, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-4.8, -10.8, 0.9, 0, Math.PI * 2);
  ctx.arc(4.2, -10.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Mejillas
  ctx.fillStyle = "rgba(255, 120, 140, 0.45)";
  ctx.beginPath();
  ctx.ellipse(-8, -4, 2.8, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(8, -4, 2.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sonrisa
  ctx.strokeStyle = "#c9184a";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -3.5, 4.2, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Flecha de dirección sutil (nariz / punta)
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.lineTo(18, 0);
  ctx.lineTo(12, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
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

const TOY_PALETTE = [
  { top: "#ffadad", side: "#ff6b6b", edge: "#d62828" },
  { top: "#ffd6a5", side: "#fb8500", edge: "#ca6702" },
  { top: "#fdffb6", side: "#90be6d", edge: "#588157" },
  { top: "#caffbf", side: "#2ec4b6", edge: "#1a8a80" },
  { top: "#9bf6ff", side: "#4cc9f0", edge: "#0077b6" },
  { top: "#bdb2ff", side: "#7b2cbf", edge: "#5a189a" },
];

/** Muros como bloques de juguete / setos amigables (misma hitbox geométrica). */
export function drawStageWalls(ctx: CanvasRenderingContext2D, walls: StageWall[]) {
  walls.forEach((wall, wi) => {
    const tall = wall.h >= wall.w * 0.85;
    if (tall && wall.h > 50) {
      drawHedgeWall(ctx, wall);
    } else {
      drawToyBlockWall(ctx, wall, wi);
    }
  });
}

function drawToyBlockWall(ctx: CanvasRenderingContext2D, wall: StageWall, index: number) {
  const pal = TOY_PALETTE[index % TOY_PALETTE.length];
  const depth = Math.min(8, Math.floor(wall.h / 4));

  // Sombra
  ctx.fillStyle = "rgba(40, 50, 40, 0.18)";
  roundRectPath(ctx, wall.x + 3, wall.y + 4, wall.w, wall.h, 8);
  ctx.fill();

  // Cara lateral 3D
  ctx.fillStyle = pal.side;
  ctx.beginPath();
  ctx.moveTo(wall.x, wall.y + wall.h - depth);
  ctx.lineTo(wall.x + wall.w, wall.y + wall.h - depth);
  ctx.lineTo(wall.x + wall.w, wall.y + wall.h);
  ctx.lineTo(wall.x, wall.y + wall.h);
  ctx.closePath();
  ctx.fill();

  // Cara superior
  const g = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
  g.addColorStop(0, pal.top);
  g.addColorStop(1, pal.side);
  ctx.fillStyle = g;
  roundRectPath(ctx, wall.x, wall.y, wall.w, wall.h - depth + 2, 8);
  ctx.fill();
  ctx.strokeStyle = pal.edge;
  ctx.lineWidth = 2;
  roundRectPath(ctx, wall.x, wall.y, wall.w, wall.h, 8);
  ctx.stroke();

  // “Tachuelas” de juguete
  const knobs = Math.max(1, Math.floor(wall.w / 22));
  const rows = Math.max(1, Math.floor((wall.h - depth) / 20));
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < knobs; k++) {
      const kx = wall.x + ((k + 0.5) / knobs) * wall.w;
      const ky = wall.y + 10 + r * ((wall.h - depth - 12) / Math.max(rows, 1));
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.arc(kx, ky, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.arc(kx + 1, ky + 1.5, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.top;
      ctx.beginPath();
      ctx.arc(kx, ky, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHedgeWall(ctx: CanvasRenderingContext2D, wall: StageWall) {
  ctx.fillStyle = "rgba(40, 60, 30, 0.16)";
  roundRectPath(ctx, wall.x + 2, wall.y + 3, wall.w, wall.h, 12);
  ctx.fill();

  const g = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
  g.addColorStop(0, "#95d5b2");
  g.addColorStop(0.5, "#52b788");
  g.addColorStop(1, "#2d6a4f");
  ctx.fillStyle = g;
  roundRectPath(ctx, wall.x, wall.y, wall.w, wall.h, 14);
  ctx.fill();
  ctx.strokeStyle = "#1b4332";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hojas / bolitas
  const leafColors = ["#b7e4c7", "#74c69d", "#40916c", "#d8f3dc"];
  for (let i = 0; i < 10; i++) {
    const lx = wall.x + 8 + ((i * 37) % Math.max(8, wall.w - 16));
    const ly = wall.y + 8 + ((i * 53) % Math.max(8, wall.h - 16));
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.beginPath();
    ctx.ellipse(lx, ly, 6, 4.5, (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bayas
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.arc(wall.x + wall.w * 0.3, wall.y + wall.h * 0.35, 3, 0, Math.PI * 2);
  ctx.arc(wall.x + wall.w * 0.7, wall.y + wall.h * 0.55, 2.5, 0, Math.PI * 2);
  ctx.fill();
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

/** Destellos / sparkles alrededor de un punto (p. ej. al ganar). */
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
