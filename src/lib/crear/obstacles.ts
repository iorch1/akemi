import type { SpriteState } from "./runtime";

export type StageWall = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const SPRITE_RADIUS = 18;

export function wallHitAt(x: number, y: number, walls: StageWall[]): boolean {
  for (const wall of walls) {
    if (circleRectOverlap(x, y, SPRITE_RADIUS, wall)) return true;
  }
  return false;
}

function circleRectOverlap(cx: number, cy: number, r: number, wall: StageWall): boolean {
  const nearestX = Math.max(wall.x, Math.min(cx, wall.x + wall.w));
  const nearestY = Math.max(wall.y, Math.min(cy, wall.y + wall.h));
  return Math.hypot(cx - nearestX, cy - nearestY) < r;
}

/** Punto a una distancia fija en la dirección del personaje. */
export function pointAhead(state: SpriteState, distance: number): { x: number; y: number } {
  const rad = (state.heading * Math.PI) / 180;
  return {
    x: state.x + Math.cos(rad) * distance,
    y: state.y + Math.sin(rad) * distance,
  };
}

export function isBlockedAhead(state: SpriteState, walls: StageWall[], distance = 42): boolean {
  if (!walls.length) return false;
  const ahead = pointAhead(state, distance);
  return wallHitAt(ahead.x, ahead.y, walls);
}