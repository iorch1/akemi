import type { StageGoal } from "./curriculum";
import type { SpriteState } from "./runtime";

export const GOAL_HIT_RADIUS = 38;

export function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

export function goalsComplete(goals: StageGoal[], collected: Set<string>): boolean {
  return goals.every((g) => collected.has(g.id));
}

/** Devuelve ids de gemas recién recogidas en este tick. */
export function collectAtPosition(
  state: SpriteState,
  goals: StageGoal[],
  collected: Set<string>,
): string[] {
  const picked: string[] = [];
  for (const g of goals) {
    if (g.kind !== "collect" || collected.has(g.id)) continue;
    if (distance(state.x, state.y, g.x, g.y) <= GOAL_HIT_RADIUS) {
      picked.push(g.id);
    }
  }
  return picked;
}

export function starReached(state: SpriteState, star: StageGoal): boolean {
  return distance(state.x, state.y, star.x, star.y) <= GOAL_HIT_RADIUS;
}