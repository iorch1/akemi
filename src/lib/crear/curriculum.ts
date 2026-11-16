import type { BlockKind, ProgramBlock } from "./blocks";
import { createBlock } from "./blocks";
import type { SpriteState } from "./runtime";

export type GoalKind = "star" | "collect";

export type StageGoal = {
  id: string;
  kind: GoalKind;
  x: number;
  y: number;
};

export type CrearLevel = {
  id: string;
  title: string;
  mission: string;
  hint: string;
  /** Bloques que aparecen en la paleta en este nivel. */
  allowedBlocks: BlockKind[];
  start: Pick<SpriteState, "x" | "y" | "heading">;
  goals: StageGoal[];
  /** Plantilla opcional al abrir el nivel (sin valores personales). */
  starterBlocks?: BlockKind[];
};

function lvl(
  id: string,
  title: string,
  mission: string,
  hint: string,
  allowed: BlockKind[],
  start: CrearLevel["start"],
  goals: StageGoal[],
  starter?: BlockKind[],
): CrearLevel {
  return {
    id,
    title,
    mission,
    hint,
    allowedBlocks: allowed,
    start,
    goals,
    starterBlocks: starter,
  };
}

/** Currículo progresivo estilo Hora del Código (texto en español). */
export const CREAR_CURRICULUM: CrearLevel[] = [
  lvl(
    "l01",
    "Nivel 1 · Tu primer paso",
    "Programa a Aki para que llegue a la estrella.",
    "Toca «Avanzar» y pulsa Reproducir.",
    ["move"],
    { x: 72, y: 200, heading: 0 },
    [{ id: "star-1", kind: "star", x: 252, y: 198 }],
    ["move", "move", "move", "move"],
  ),
  lvl(
    "l02",
    "Nivel 2 · Más lejos",
    "La estrella está más a la derecha. Usa varios bloques Avanzar.",
    "Cada Avanzar son 40 pasos.",
    ["move"],
    { x: 56, y: 210, heading: 0 },
    [{ id: "star-1", kind: "star", x: 290, y: 208 }],
    ["move", "move", "move", "move"],
  ),
  lvl(
    "l03",
    "Nivel 3 · Gira a la derecha",
    "Aki mira hacia arriba. Gira y avanza hasta la estrella.",
    "Primero gira, luego avanza.",
    ["move", "turn_right"],
    { x: 180, y: 248, heading: 270 },
    [{ id: "star-1", kind: "star", x: 182, y: 88 }],
    ["turn_right", "move", "move"],
  ),
  lvl(
    "l04",
    "Nivel 4 · Gira a la izquierda",
    "Gira a la izquierda y llega a la meta.",
    "¡Izquierda y derecha cambian hacia dónde miras!",
    ["move", "turn_left", "turn_right"],
    { x: 280, y: 100, heading: 180 },
    [{ id: "star-1", kind: "star", x: 80, y: 98 }],
    ["turn_left", "move", "move", "move"],
  ),
  lvl(
    "l05",
    "Nivel 5 · Camino con esquina",
    "Combina giros y avances como un camino en L.",
    "Secuencia = orden de bloques.",
    ["move", "turn_left", "turn_right"],
    { x: 72, y: 240, heading: 0 },
    [{ id: "star-1", kind: "star", x: 250, y: 110 }],
    ["move", "move", "turn_left", "move", "move"],
  ),
  lvl(
    "l06",
    "Nivel 6 · Saluda al llegar",
    "Llega a la estrella y usa «Decir» para saludar.",
    "Puedes decir antes o después de moverte.",
    ["move", "turn_left", "turn_right", "say"],
    { x: 70, y: 160, heading: 0 },
    [{ id: "star-1", kind: "star", x: 268, y: 158 }],
    ["move", "move", "move", "say"],
  ),
  lvl(
    "l07",
    "Nivel 7 · Espera un momento",
    "Usa «Esperar» entre movimientos, como una pausa dramática.",
    "La espera no mueve a Aki; da tiempo.",
    ["move", "turn_left", "turn_right", "wait"],
    { x: 90, y: 200, heading: 0 },
    [{ id: "star-1", kind: "star", x: 240, y: 198 }],
    ["move", "wait", "move", "wait", "move"],
  ),
  lvl(
    "l08",
    "Nivel 8 · Repetir dos veces",
    "El bloque Repetir ejecuta los bloques de adentro varias veces.",
    "Mete Avanzar dentro de Repetir.",
    ["move", "turn_left", "turn_right", "repeat"],
    { x: 60, y: 170, heading: 0 },
    [{ id: "star-1", kind: "star", x: 280, y: 168 }],
    ["repeat"],
  ),
  lvl(
    "l09",
    "Nivel 9 · Cuadrado pequeño",
    "Repite: avanzar y girar para dibujar un cuadrado mental.",
    "4 lados → repite 4 veces.",
    ["move", "turn_left", "turn_right", "repeat"],
    { x: 140, y: 200, heading: 0 },
    [{ id: "star-1", kind: "star", x: 140, y: 72 }],
    ["repeat"],
  ),
  lvl(
    "l10",
    "Nivel 10 · Recoge la gema",
    "Toca la gema morada para recolectarla.",
    "La meta es la gema, no la estrella.",
    ["move", "turn_left", "turn_right"],
    { x: 80, y: 180, heading: 0 },
    [{ id: "gem-1", kind: "collect", x: 260, y: 178 }],
    ["move", "move", "move"],
  ),
  lvl(
    "l11",
    "Nivel 11 · Dos gemas",
    "Recoge las dos gemas. Puedes usar Repetir si quieres.",
    "Visita cada gema con avances y giros.",
    ["move", "turn_left", "turn_right", "repeat"],
    { x: 70, y: 220, heading: 0 },
    [
      { id: "gem-1", kind: "collect", x: 120, y: 90 },
      { id: "gem-2", kind: "collect", x: 280, y: 90 },
    ],
  ),
  lvl(
    "l12",
    "Nivel 12 · Estrella lejana",
    "Usa todo: decir, esperar y repetir para la estrella final.",
    "¡Tú mandas el orden de los bloques!",
    ["move", "turn_left", "turn_right", "wait", "say", "repeat"],
    { x: 50, y: 250, heading: 0 },
    [{ id: "star-1", kind: "star", x: 300, y: 80 }],
  ),
  lvl(
    "l13",
    "Nivel 13 · Tres gemas en fila",
    "Tres gemas en línea: repetir avanzar ayuda.",
    "Repetir 3 veces con Avanzar adentro.",
    ["move", "turn_left", "turn_right", "repeat"],
    { x: 60, y: 160, heading: 0 },
    [
      { id: "gem-1", kind: "collect", x: 140, y: 158 },
      { id: "gem-2", kind: "collect", x: 210, y: 158 },
      { id: "gem-3", kind: "collect", x: 280, y: 158 },
    ],
  ),
  lvl(
    "l14",
    "Nivel 14 · Di el camino",
    "Di algo en el camino y termina en la estrella.",
    "Decir muestra una burbuja y habla.",
    ["move", "turn_left", "turn_right", "say", "wait"],
    { x: 180, y: 260, heading: 270 },
    [{ id: "star-1", kind: "star", x: 180, y: 70 }],
    ["say", "turn_right", "move", "move", "move"],
  ),
  lvl(
    "l15",
    "Nivel 15 · Maestro explorador",
    "Último reto: dos gemas y luego la estrella dorada.",
    "Planifica la ruta completa.",
    ["move", "turn_left", "turn_right", "wait", "say", "repeat"],
    { x: 55, y: 230, heading: 0 },
    [
      { id: "gem-1", kind: "collect", x: 120, y: 120 },
      { id: "gem-2", kind: "collect", x: 120, y: 220 },
      { id: "star-1", kind: "star", x: 290, y: 170 },
    ],
  ),
];

export const FIRST_LEVEL_ID = CREAR_CURRICULUM[0].id;

export function levelById(id: string): CrearLevel | undefined {
  return CREAR_CURRICULUM.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const i = CREAR_CURRICULUM.findIndex((l) => l.id === currentId);
  if (i < 0 || i >= CREAR_CURRICULUM.length - 1) return null;
  return CREAR_CURRICULUM[i + 1].id;
}

export function buildStarterBlocks(level: CrearLevel): ProgramBlock[] {
  const start: ProgramBlock = { id: "lvl-start", kind: "event_start" };
  if (!level.starterBlocks?.length) return [start];
  const body = level.starterBlocks.map((kind) => {
    const b = createBlock(kind);
    if (kind === "repeat") {
      b.value = 3;
      b.children = [createBlock("move")];
    }
    return b;
  });
  return [start, ...body];
}