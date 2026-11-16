import type { ProgramBlock } from "./blocks";
import type { CrearLevel } from "./curriculum";
import { FREE_PLAY_WORLD_WIDTH, worldFromLevel } from "./curriculum";
import {
  createPlayer,
  flagReached,
  PASO_PX,
  settlePlayer,
  setCrouch,
  STAGE_SIZE,
  stepPhysics,
  tryJump,
  WALK_SPEED,
  type PlayerState,
  type World,
} from "./physics";
import { speak } from "../../utils/speech";

export type { PlayerState };
export { STAGE_SIZE };

/** Compat: alias usado por UI antigua. */
export type SpriteState = PlayerState;

export const DEFAULT_SPRITE: PlayerState = createPlayer(48, 280, 1);

export type RuntimeCallbacks = {
  onTick: (state: PlayerState) => void;
  onSay: (text: string) => void;
  onDone: () => void;
  onError?: (msg: string) => void;
  onWin?: () => void;
};

export type GoalRunContext = {
  level: CrearLevel;
  worldWidth?: number;
  onWin?: () => void;
};

const FRAME_MS = 1000 / 60;

function defaultWorldWidth(level: CrearLevel): number {
  return level.id === "free" ? FREE_PLAY_WORLD_WIDTH : STAGE_SIZE.width;
}

function makeWorld(level: CrearLevel, worldWidth?: number): World {
  return worldFromLevel(level, worldWidth ?? defaultWorldWidth(level));
}

export function playerFromLevel(level: CrearLevel): PlayerState {
  const facing = level.start.facing ?? 1;
  const raw = createPlayer(level.start.x, level.start.y, facing);
  return settlePlayer(raw, makeWorld(level));
}

async function waitFrames(
  frames: number,
  signal: AbortSignal | undefined,
  tick: () => void,
): Promise<void> {
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    tick();
    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(resolve, FRAME_MS);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
}

function checkWin(state: PlayerState, level: CrearLevel, wonRef: { done: boolean }, onWin?: () => void) {
  if (wonRef.done) return;
  if (flagReached(state, level.flag)) {
    wonRef.done = true;
    onWin?.();
  }
}

export async function runProgram(
  blocks: ProgramBlock[],
  initial: PlayerState,
  _stage: { width: number; height: number },
  cb: RuntimeCallbacks,
  signal?: AbortSignal,
  goalCtx?: GoalRunContext,
): Promise<void> {
  if (!goalCtx) {
    cb.onDone();
    return;
  }
  const level = goalCtx.level;
  const world = makeWorld(level, goalCtx.worldWidth);
  let state = settlePlayer({ ...initial, vx: 0, vy: 0, sayBubble: null }, world);
  const wonRef = { done: false };
  const publish = (s: PlayerState) => {
    state = s;
    cb.onTick({ ...s });
  };
  publish(state);

  try {
    state = await walk(blocks, state, world, level, cb, signal, wonRef, goalCtx.onWin ?? cb.onWin);
    cb.onDone();
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      cb.onDone();
      return;
    }
    cb.onError?.((e as Error).message);
    cb.onDone();
  }

  async function walk(
    list: ProgramBlock[],
    st: PlayerState,
    wrld: World,
    lvl: CrearLevel,
    callbacks: RuntimeCallbacks,
    abort?: AbortSignal,
    won?: { done: boolean },
    onWin?: () => void,
  ): Promise<PlayerState> {
    let s = st;
    const win = won ?? { done: false };

    const sim = async (mutate: (cur: PlayerState) => PlayerState, frames: number) => {
      for (let i = 0; i < frames; i++) {
        if (abort?.aborted) throw new DOMException("Aborted", "AbortError");
        if (win.done) return s;
        s = mutate(s);
        s = stepPhysics(s, wrld);
        publish(s);
        checkWin(s, lvl, win, onWin);
        if (win.done) return s;
        await waitFrames(1, abort, () => undefined);
      }
      return s;
    };

    for (const block of list) {
      if (abort?.aborted) throw new DOMException("Aborted", "AbortError");
      if (win.done) return s;
      if (block.kind === "event_start") continue;

      if (block.kind === "move_forward" || block.kind === "move_back") {
        const dir: 1 | -1 = block.kind === "move_forward" ? 1 : -1;
        const pasos = Math.max(1, Math.min(12, Math.floor(Number(block.value ?? 2))));
        const distance = pasos * PASO_PX;
        const frames = Math.ceil(distance / WALK_SPEED) + 8;
        const startX = s.x;
        s = { ...s, facing: dir, sayBubble: null };
        let ledgeStop = false;
        for (let i = 0; i < frames; i++) {
          if (abort?.aborted) throw new DOMException("Aborted", "AbortError");
          if (win.done) return s;
          if (Math.abs(s.x - startX) >= distance || ledgeStop) {
            s = stepPhysics({ ...s, vx: 0 }, wrld);
            publish(s);
            checkWin(s, lvl, win, onWin);
            await waitFrames(1, abort, () => undefined);
            if (i > 12) break;
            continue;
          }
          const prev = s;
          s = stepPhysics({ ...s, facing: dir, vx: dir * WALK_SPEED }, wrld);
          // No caminar al vacío: parar en el borde para poder saltar
          if (!s.onGround && prev.onGround) {
            s = settlePlayer({ ...prev, vx: 0, vy: 0 }, wrld);
            ledgeStop = true;
          }
          publish(s);
          checkWin(s, lvl, win, onWin);
          if (win.done) return s;
          await waitFrames(1, abort, () => undefined);
        }
        await sim((cur) => ({ ...cur, vx: 0 }), 12);
        if (s.y > wrld.height + 40) {
          callbacks.onError?.("¡Uy! Aki se cayó. Prueba otra vez.");
          return s;
        }
      } else if (block.kind === "jump") {
        if (!s.onGround) {
          await sim((cur) => ({ ...cur, vx: 0 }), 10);
        }
        s = tryJump({ ...s, facing: s.facing, sayBubble: null });
        publish(s);
        // Salto con impulso hacia adelante (facing)
        const airFrames = 84;
        await sim((cur) => {
          const moving = { ...cur, vx: cur.facing * WALK_SPEED * 1.2 };
          return moving;
        }, airFrames);
        await sim((cur) => ({ ...cur, vx: 0 }), 12);
        if (s.y > wrld.height + 40) {
          callbacks.onError?.("¡Uy! Aki se cayó. Prueba otra vez.");
          return s;
        }
      } else if (block.kind === "crouch") {
        s = setCrouch({ ...s, sayBubble: null }, true);
        publish(s);
        // Gatea un paso hacia adelante agachado
        const crawlFrames = Math.ceil(PASO_PX / (WALK_SPEED * 0.75)) + 6;
        await sim((cur) => ({
          ...setCrouch(cur, true),
          facing: cur.facing,
          vx: cur.facing * WALK_SPEED * 0.75,
        }), crawlFrames);
        await sim((cur) => ({ ...setCrouch(cur, true), vx: 0 }), 10);
        // Intentar levantarse si hay espacio
        const standing = setCrouch({ ...s, vx: 0 }, false);
        const test = stepPhysics({ ...standing, vy: 0 }, wrld);
        // Si al levantarse colisiona con low obstacle, quedarse agachado
        const canStand = !lvl.lowObstacles.some((low) => {
          const h = 36;
          const body = { x: test.x - 11, y: test.y - h, w: 22, h };
          return (
            body.x < low.x + low.w &&
            body.x + body.w > low.x &&
            body.y < low.y + low.h &&
            body.y + body.h > low.y
          );
        });
        s = canStand ? setCrouch(s, false) : setCrouch(s, true);
        publish(s);
      } else if (block.kind === "wait") {
        const sec = Math.max(0.1, Number(block.value ?? 1));
        await sim((cur) => ({ ...cur, vx: 0 }), Math.round(sec * 60));
      } else if (block.kind === "say") {
        const text = String(block.value ?? "¡Hola!");
        s = { ...s, sayBubble: text, vx: 0 };
        publish(s);
        callbacks.onSay(text);
        speak(text, { mode: "phrase" });
        await sim((cur) => ({ ...cur, vx: 0, sayBubble: text }), 90);
        s = { ...s, sayBubble: null };
        publish(s);
      } else if (block.kind === "repeat") {
        const times = Math.min(20, Math.max(1, Math.floor(Number(block.value ?? 2))));
        const body = block.children ?? [];
        for (let i = 0; i < times; i++) {
          s = await walk(body, s, wrld, lvl, callbacks, abort, win, onWin);
          if (win.done) return s;
        }
      }
    }
    return s;
  }
}

/** Un frame de control manual (modo libre). */
export function stepFreePlay(
  state: PlayerState,
  input: { left: boolean; right: boolean; jump: boolean; crouch: boolean },
  level: CrearLevel,
  worldWidth: number,
): PlayerState {
  const world = makeWorld(level, worldWidth);
  let s: PlayerState = { ...state, sayBubble: null };

  if (input.crouch && s.onGround) {
    s = setCrouch(s, true);
  } else if (!input.crouch) {
    const up = setCrouch(s, false);
    const blocked = level.lowObstacles.some((low) => {
      const body = { x: up.x - 11, y: up.y - 36, w: 22, h: 36 };
      return (
        body.x < low.x + low.w &&
        body.x + body.w > low.x &&
        body.y < low.y + low.h &&
        body.y + body.h > low.y
      );
    });
    if (!blocked) s = up;
  }

  if (input.left && !input.right) {
    s = { ...s, facing: -1, vx: -WALK_SPEED * (s.crouching ? 0.7 : 1) };
  } else if (input.right && !input.left) {
    s = { ...s, facing: 1, vx: WALK_SPEED * (s.crouching ? 0.7 : 1) };
  } else {
    s = { ...s, vx: 0 };
  }

  if (input.jump) {
    s = tryJump(s);
  }

  s = stepPhysics(s, world);
  return s;
}
