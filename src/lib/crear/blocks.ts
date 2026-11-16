/** Bloques visuales del módulo Crear (estilo Hora del Código). */

export type BlockKind =
  | "event_start"
  | "move"
  | "turn_left"
  | "turn_right"
  | "wait"
  | "say"
  | "repeat";

export type ProgramBlock = {
  id: string;
  kind: BlockKind;
  /** Pasos (mover), grados implícitos en giros, segundos (esperar), texto (decir), veces (repetir). */
  value?: number | string;
  /** Cuerpo del bloque repetir (anidado). */
  children?: ProgramBlock[];
};

export type BlockDef = {
  kind: BlockKind;
  label: string;
  emoji: string;
  color: string;
  defaultValue?: number | string;
  hasValue?: boolean;
  valueLabel?: string;
};

export const BLOCK_DEFS: BlockDef[] = [
  {
    kind: "event_start",
    label: "Al empezar",
    emoji: "🏁",
    color: "#ff9f1c",
  },
  {
    kind: "move",
    label: "Avanzar",
    emoji: "⬆️",
    color: "#4d96d6",
    hasValue: true,
    valueLabel: "pasos",
    defaultValue: 40,
  },
  {
    kind: "turn_left",
    label: "Girar izquierda",
    emoji: "↩️",
    color: "#5cb85c",
  },
  {
    kind: "turn_right",
    label: "Girar derecha",
    emoji: "↪️",
    color: "#5cb85c",
  },
  {
    kind: "wait",
    label: "Esperar",
    emoji: "⏱️",
    color: "#9966cc",
    hasValue: true,
    valueLabel: "seg",
    defaultValue: 1,
  },
  {
    kind: "say",
    label: "Decir",
    emoji: "💬",
    color: "#9966cc",
    hasValue: true,
    valueLabel: "texto",
    defaultValue: "¡Hola!",
  },
  {
    kind: "repeat",
    label: "Repetir",
    emoji: "🔁",
    color: "#e6a817",
    hasValue: true,
    valueLabel: "veces",
    defaultValue: 3,
  },
];

export function blockDef(kind: BlockKind): BlockDef {
  return BLOCK_DEFS.find((b) => b.kind === kind) ?? BLOCK_DEFS[0];
}

export function newBlockId(): string {
  return `b-${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlock(kind: BlockKind): ProgramBlock {
  const def = blockDef(kind);
  const block: ProgramBlock = { id: newBlockId(), kind };
  if (def.hasValue) block.value = def.defaultValue;
  if (kind === "repeat") block.children = [];
  return block;
}

export const TUTORIAL_STARTER: ProgramBlock[] = [
  { id: "tut-start", kind: "event_start" },
  createBlock("move"),
  createBlock("turn_right"),
  createBlock("move"),
];