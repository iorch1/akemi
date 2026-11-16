/** Bloques visuales del módulo Crear (platformer infantil). */

export type BlockKind =
  | "event_start"
  | "move_forward"
  | "move_back"
  | "jump"
  | "crouch"
  | "wait"
  | "say"
  | "repeat";

export type ProgramBlock = {
  id: string;
  kind: BlockKind;
  /** Pasos (mover), segundos (esperar), texto (decir), veces (repetir). */
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
    kind: "move_forward",
    label: "Avanzar",
    emoji: "➡️",
    color: "#3d9bdb",
    hasValue: true,
    valueLabel: "pasos",
    defaultValue: 3,
  },
  {
    kind: "move_back",
    label: "Retroceder",
    emoji: "⬅️",
    color: "#2a9d8f",
    hasValue: true,
    valueLabel: "pasos",
    defaultValue: 1,
  },
  {
    kind: "jump",
    label: "Saltar",
    emoji: "⏫",
    color: "#e76f51",
  },
  {
    kind: "crouch",
    label: "Agacharse",
    emoji: "🔽",
    color: "#e9c46a",
  },
  {
    kind: "wait",
    label: "Esperar",
    emoji: "⏱️",
    color: "#7b6bb5",
    hasValue: true,
    valueLabel: "seg",
    defaultValue: 1,
  },
  {
    kind: "say",
    label: "Decir",
    emoji: "💬",
    color: "#7b6bb5",
    hasValue: true,
    valueLabel: "texto",
    defaultValue: "¡Hola!",
  },
  {
    kind: "repeat",
    label: "Repetir",
    emoji: "🔁",
    color: "#f4a261",
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
  { ...createBlock("move_forward"), value: 3 },
  createBlock("jump"),
  { ...createBlock("move_forward"), value: 2 },
];
