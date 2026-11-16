import type { ProgramBlock } from "./blocks";
import { speak } from "../../utils/speech";

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

export async function runProgram(
  blocks: ProgramBlock[],
  initial: SpriteState,
  stage: StageSize,
  cb: RuntimeCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let state = { ...initial };

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
    state = await walk(blocks, state, stage, cb, delay, publish, signal);
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
  ): Promise<SpriteState> {
    let s = st;
    for (const block of list) {
      if (abort?.aborted) throw new DOMException("Aborted", "AbortError");
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
          s = await walk(body, s, stg, callbacks, wait, publish, abort);
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