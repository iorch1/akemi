import type { StageGoal } from "./curriculum";
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

export function drawAkemiSprite(ctx: CanvasRenderingContext2D, st: SpriteState) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate((st.heading * Math.PI) / 180);

  ctx.fillStyle = "#7b4dff";
  ctx.strokeStyle = "#4527a8";
  ctx.lineWidth = 2;
  starShape(ctx, 0, 0, 26, 5);
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