import type { StageGoal } from "./curriculum";
import type { StageWall } from "./obstacles";
import type { SpriteState } from "./runtime";

function starShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, points: number) {
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

/** Estrella dorada de meta (sprite vectorial, no emoji). */
export function drawGoalStar(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const g = ctx.createRadialGradient(x, y - 6, 4, x, y, 28);
  g.addColorStop(0, "#fff5a8");
  g.addColorStop(0.45, "#ffd166");
  g.addColorStop(1, "#f4a926");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#c88412";
  ctx.lineWidth = 2;
  starShape(ctx, x, y, 22, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(x - 4, y - 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** Gema morada coleccionable. */
export function drawGoalGem(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#9b5de5";
  ctx.strokeStyle = "#5a2d91";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(14, -4);
  ctx.lineTo(8, 18);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-14, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(2, 2);
  ctx.lineTo(-2, 8);
  ctx.fill();
  ctx.restore();
}

export function drawStageGoals(
  ctx: CanvasRenderingContext2D,
  goals: StageGoal[],
  collected: Set<string>,
) {
  for (const g of goals) {
    if (g.kind === "collect" && collected.has(g.id)) continue;
    if (g.kind === "star") drawGoalStar(ctx, g.x, g.y);
    else drawGoalGem(ctx, g.x, g.y);
  }
}

/** Muñeco infantil «Aki» (no estrella ni emoji). */
export function drawAkemiSprite(ctx: CanvasRenderingContext2D, st: SpriteState) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate((st.heading * Math.PI) / 180);

  ctx.fillStyle = "#ff8fab";
  roundRectPath(ctx, -11, 4, 22, 18, 8);
  ctx.fill();
  ctx.strokeStyle = "#c9184a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffcad4";
  roundRectPath(ctx, -9, -18, 18, 22, 9);
  ctx.fill();
  ctx.strokeStyle = "#c9184a";
  ctx.stroke();

  ctx.fillStyle = "#4a4e69";
  ctx.beginPath();
  ctx.arc(-4, -10, 2.2, 0, Math.PI * 2);
  ctx.arc(4, -10, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -4, 3.5, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.fillStyle = "#5c677d";
  ctx.fillRect(-14, 8, 6, 10);
  ctx.fillRect(8, 8, 6, 10);
  ctx.fillStyle = "#4361ee";
  ctx.fillRect(-12, 20, 7, 5);
  ctx.fillRect(5, 20, 7, 5);

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
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Paredes u obstáculos del nivel. */
export function drawStageWalls(ctx: CanvasRenderingContext2D, walls: StageWall[]) {
  for (const wall of walls) {
    const g = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
    g.addColorStop(0, "#b08968");
    g.addColorStop(1, "#7f5539");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#6f4e37";
    ctx.lineWidth = 2;
    roundRectPath(ctx, wall.x, wall.y, wall.w, wall.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let row = wall.y + 10; row < wall.y + wall.h; row += 14) {
      ctx.beginPath();
      ctx.moveTo(wall.x + 4, row);
      ctx.lineTo(wall.x + wall.w - 4, row);
      ctx.stroke();
    }
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
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}