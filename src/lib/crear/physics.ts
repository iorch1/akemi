/** Física 2D sencilla para el platformer de Crear (gravedad, plataformas, agacharse). */

export const STAGE_SIZE = { width: 480, height: 320 };

export const GRAVITY = 0.52;
export const JUMP_VY = -9.2;
export const WALK_SPEED = 2.35;
export const MAX_FALL = 11;
export const PASO_PX = 40;

export const PLAYER_W = 22;
export const PLAYER_H_STAND = 36;
export const PLAYER_H_CROUCH = 22;

export type Rect = { x: number; y: number; w: number; h: number };

export type PlatformKind = "ground" | "brick" | "grass" | "pipe" | "block";

export type Platform = Rect & { kind: PlatformKind };

/** Obstáculo bajo: solo se puede pasar agachado (techo). */
export type LowObstacle = Rect & { kind?: "pipe" | "block" };

export type FlagGoal = {
  x: number;
  /** Base (suelo) del mástil. */
  y: number;
  h: number;
};

export type PlayerState = {
  /** Centro horizontal. */
  x: number;
  /** Pies (borde inferior del AABB). */
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  crouching: boolean;
  sayBubble: string | null;
};

export function playerHeight(p: PlayerState): number {
  return p.crouching ? PLAYER_H_CROUCH : PLAYER_H_STAND;
}

export function playerRect(p: PlayerState): Rect {
  const h = playerHeight(p);
  return {
    x: p.x - PLAYER_W / 2,
    y: p.y - h,
    w: PLAYER_W,
    h,
  };
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolvePlatforms(p: PlayerState, platforms: Platform[]): PlayerState {
  let { x, y, vx, vy, onGround } = p;
  onGround = false;
  const h = playerHeight(p);

  // Vertical primero
  y += vy;
  let body: Rect = { x: x - PLAYER_W / 2, y: y - h, w: PLAYER_W, h };

  for (const plat of platforms) {
    if (!overlap(body, plat)) continue;
    if (vy >= 0 && body.y + body.h - vy <= plat.y + 2) {
      y = plat.y;
      vy = 0;
      onGround = true;
      body = { x: x - PLAYER_W / 2, y: y - h, w: PLAYER_W, h };
    } else if (vy < 0 && body.y - vy >= plat.y + plat.h - 2) {
      y = plat.y + plat.h + h;
      vy = 0;
      body = { x: x - PLAYER_W / 2, y: y - h, w: PLAYER_W, h };
    }
  }

  // Horizontal
  x += vx;
  body = { x: x - PLAYER_W / 2, y: y - h, w: PLAYER_W, h };
  for (const plat of platforms) {
    if (!overlap(body, plat)) continue;
    if (vx > 0) {
      x = plat.x - PLAYER_W / 2;
      vx = 0;
    } else if (vx < 0) {
      x = plat.x + plat.w + PLAYER_W / 2;
      vx = 0;
    }
    body = { x: x - PLAYER_W / 2, y: y - h, w: PLAYER_W, h };
  }

  // Techos bajos (solo bloquean si no cabe agachado / de pie)
  return { ...p, x, y, vx, vy, onGround };
}

function resolveLowObstacles(p: PlayerState, lows: LowObstacle[]): PlayerState {
  if (!lows.length) return p;
  let { x, y, vx, vy } = p;
  const h = playerHeight(p);
  let body: Rect = { x: x - PLAYER_W / 2, y: y - h, w: PLAYER_W, h };

  for (const low of lows) {
    if (!overlap(body, low)) continue;
    // Empujar fuera por el lado más corto
    const fromLeft = body.x + body.w - low.x;
    const fromRight = low.x + low.w - body.x;
    const fromTop = body.y + body.h - low.y;
    const fromBottom = low.y + low.h - body.y;
    const m = Math.min(fromLeft, fromRight, fromTop, fromBottom);
    if (m === fromLeft) {
      x = low.x - PLAYER_W / 2;
      vx = 0;
    } else if (m === fromRight) {
      x = low.x + low.w + PLAYER_W / 2;
      vx = 0;
    } else if (m === fromTop) {
      y = low.y;
      vy = Math.min(0, vy);
    } else {
      y = low.y + low.h + h;
      vy = Math.max(0, vy);
    }
    body = { x: x - PLAYER_W / 2, y: y - h, w: PLAYER_W, h };
  }
  return { ...p, x, y, vx, vy };
}

export type World = {
  platforms: Platform[];
  lowObstacles: LowObstacle[];
  width: number;
  height: number;
};

export function stepPhysics(p: PlayerState, world: World): PlayerState {
  let next: PlayerState = {
    ...p,
    vy: Math.min(MAX_FALL, p.vy + GRAVITY),
  };
  next = resolvePlatforms(next, world.platforms);
  next = resolveLowObstacles(next, world.lowObstacles);

  // Límites del escenario
  const half = PLAYER_W / 2;
  next.x = Math.max(half + 2, Math.min(world.width - half - 2, next.x));
  if (next.y > world.height + 80) {
    // Cayó al vacío: se queda fuera (fall fail)
    next.y = world.height + 80;
    next.vx = 0;
    next.vy = 0;
  }
  return next;
}

export function tryJump(p: PlayerState): PlayerState {
  if (!p.onGround) return p;
  return {
    ...p,
    crouching: false,
    vy: JUMP_VY,
    onGround: false,
  };
}

export function setCrouch(p: PlayerState, crouching: boolean): PlayerState {
  if (crouching === p.crouching) return p;
  if (!crouching) {
    // Al levantarse, y (pies) se mantiene
    return { ...p, crouching: false };
  }
  return { ...p, crouching: true };
}

export function flagReached(p: PlayerState, flag: FlagGoal): boolean {
  const body = playerRect(p);
  const pole: Rect = { x: flag.x - 6, y: flag.y - flag.h, w: 14, h: flag.h };
  return overlap(body, pole);
}

export function createPlayer(x: number, y: number, facing: 1 | -1 = 1): PlayerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    facing,
    onGround: true,
    crouching: false,
    sayBubble: null,
  };
}

/** Simula frames hasta estabilizar en el suelo (tras colocar). */
export function settlePlayer(p: PlayerState, world: World, maxFrames = 90): PlayerState {
  let cur = { ...p, vx: 0 };
  for (let i = 0; i < maxFrames; i++) {
    const next = stepPhysics({ ...cur, vx: 0 }, world);
    if (next.onGround && Math.abs(next.vy) < 0.01 && Math.abs(next.y - cur.y) < 0.01) {
      return { ...next, vx: 0, vy: 0 };
    }
    cur = next;
  }
  return cur;
}
