import type { ProgramBlock } from "./blocks";
import type { StageGoal } from "./curriculum";
import { collectAtPosition, goalsComplete, starReached } from "./goals";
import { speak } from "../../utils/speech";

export type GoalRunContext = {
  goals: StageGoal[];
  collected: Set<string>;
  onCollect: (id: string) => void;
  onWin?: () => void;
};

export type SpriteState = {
  x: number;
  y: number;
  /** Grados, 0 = hacia la derecha, sentido horario. */
  heading: number;
  sayBubble: string | null;
};

export type StageSize = { width: number; height: number };

export type RuntimeCallbacks = {
  onTick: (state: SpriteState) => void;
  onSay: (text: string) => void;
  onDone: () => void;
  onError?: (msg: string) => void;
};

const STEP_PX_PER_UNIT = 1;

function checkGoalsAfterTick(
  state: SpriteState,
  goalCtx: GoalRunContext | undefined,
  wonRef: { done: boolean },
) {
  if (!goalCtx || wonRef.done) return;
  for (const g of goalCtx.goals) {
    if (g.kind === "star" && !goalCtx.collected.has(g.id) && starReached(state, g)) {
      goalCtx.collected.add(g.id);
      goalCtx.onCollect(g.id);
    }
  }
  const picked = collectAtPosition(state, goalCtx.goals, goalCtx.collected);
  for (const id of picked) {
    goalCtx.collected.add(id);
    goalCtx.onCollect(id);
  }
  if (goalsComplete(goalCtx.goals, goalCtx.collected)) {
    wonRef.done = true;
    goalCtx.onWin?.();
  }
}

export async function runProgram(
  blocks: ProgramBlock[],
  initial: SpriteState,
  stage: StageSize,
  cb: RuntimeCallbacks,
  signal?: AbortSignal,
  goalCtx?: GoalRunContext,
): Promise<void> {
  let state = { ...initial };
  const wonRef = { done: false };

  const delay = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(resolve, ms);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });

  const publish: (s: SpriteState) => void = (s) => {
    state = s;
    cb.onTick({ ...s });
  };

  try {
    state = await walk(blocks, state, stage, cb, delay, publish, signal, goalCtx, wonRef);
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
    st: SpriteState,
    stg: StageSize,
    callbacks: RuntimeCallbacks,
    wait: (ms: number) => Promise<void>,
    publish: (s: SpriteState) => void,
    abort?: AbortSignal,
    goalCtx?: GoalRunContext,
    wonRef?: { done: boolean },
  ): Promise<SpriteState> {
    let s = st;
    for (const block of list) {
      if (abort?.aborted) throw new DOMException("Aborted", "AbortError");
      if (wonRef?.done) return s;
      if (block.kind === "event_start") continue;

      if (block.kind === "move") {
        const steps = Number(block.value ?? 40) * STEP_PX_PER_UNIT;
        const rad = (s.heading * Math.PI) / 180;
        s = {
          ...s,
          x: clamp(s.x + Math.cos(rad) * steps, 24, stg.width - 24),
          y: clamp(s.y + Math.sin(rad) * steps, 24, stg.height - 24),
          sayBubble: null,
        };
        publish(s);
        checkGoalsAfterTick(s, goalCtx, wonRef ?? { done: false });
        if (wonRef?.done) return s;
        await wait(280);
      } else if (block.kind === "turn_left") {
        s = { ...s, heading: normDeg(s.heading - 90), sayBubble: null };
        publish(s);
        await wait(200);
      } else if (block.kind === "turn_right") {
        s = { ...s, heading: normDeg(s.heading + 90), sayBubble: null };
        publish(s);
        await wait(200);
      } else if (block.kind === "wait") {
        const sec = Math.max(0.1, Number(block.value ?? 1));
        await wait(sec * 1000);
      } else if (block.kind === "say") {
        const text = String(block.value ?? "¡Hola!");
        s = { ...s, sayBubble: text };
        publish(s);
        callbacks.onSay(text);
        speak(text, { mode: "phrase" });
        await wait(1600);
        s = { ...s, sayBubble: null };
        publish(s);
      } else if (block.kind === "repeat") {
        const times = Math.min(20, Math.max(1, Math.floor(Number(block.value ?? 2))));
        const body = block.children ?? [];
        for (let i = 0; i < times; i++) {
          s = await walk(body, s, stg, callbacks, wait, publish, abort, goalCtx, wonRef);
          if (wonRef?.done) return s;
        }
      }
    }
    return s;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normDeg(d: number) {
  return ((d % 360) + 360) % 360;
}

export const DEFAULT_SPRITE: SpriteState = {
  x: 80,
  y: 160,
  heading: 0,
  sayBubble: null,
};

export const STAGE_SIZE: StageSize = { width: 360, height: 320 };