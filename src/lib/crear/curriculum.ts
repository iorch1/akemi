import type { BlockKind, ProgramBlock } from "./blocks";
import { createBlock } from "./blocks";
import type { FlagGoal, LowObstacle, Platform } from "./physics";
import { STAGE_SIZE } from "./physics";

export type CrearLevel = {
  id: string;
  title: string;
  mission: string;
  hint: string;
  allowedBlocks: BlockKind[];
  /** Posición inicial de Aki (pies sobre el suelo). */
  start: { x: number; y: number; facing?: 1 | -1 };
  platforms: Platform[];
  lowObstacles: LowObstacle[];
  flag: FlagGoal;
  starterBlocks?: BlockKind[];
};

const GROUND_Y = 280;
const GROUND_H = STAGE_SIZE.height - GROUND_Y;

function ground(x: number, w: number): Platform {
  return { x, y: GROUND_Y, w, h: GROUND_H, kind: "ground" };
}

function grassPlat(x: number, y: number, w: number, h = 18): Platform {
  return { x, y, w, h, kind: "grass" };
}

function brickPlat(x: number, y: number, w: number, h = 18): Platform {
  return { x, y, w, h, kind: "brick" };
}

function pipe(x: number, y: number, w: number, h: number): Platform {
  return { x, y, w, h, kind: "pipe" };
}

function lowPipe(x: number, y: number, w: number, h: number): LowObstacle {
  return { x, y, w, h, kind: "pipe" };
}

function lowBlock(x: number, y: number, w: number, h: number): LowObstacle {
  return { x, y, w, h, kind: "block" };
}

function flagAt(x: number, y = GROUND_Y, h = 88): FlagGoal {
  return { x, y, h };
}

function lvl(
  id: string,
  title: string,
  mission: string,
  hint: string,
  allowed: BlockKind[],
  start: CrearLevel["start"],
  platforms: Platform[],
  flag: FlagGoal,
  lowObstacles: LowObstacle[] = [],
  starter?: BlockKind[],
): CrearLevel {
  return {
    id,
    title,
    mission,
    hint,
    allowedBlocks: allowed,
    start,
    platforms,
    lowObstacles,
    flag,
    starterBlocks: starter,
  };
}

/** 15 niveles progresivos estilo platformer (texto en español). */
export const CREAR_CURRICULUM: CrearLevel[] = [
  lvl(
    "l01",
    "Nivel 1 · Camina a la meta",
    "Programa a Aki para llegar a la bandera caminando.",
    "Añade «Avanzar» y pulsa Reproducir.",
    ["move_forward"],
    { x: 48, y: GROUND_Y },
    [ground(0, 480)],
    flagAt(360),
    [],
    ["move_forward", "move_forward", "move_forward"],
  ),
  lvl(
    "l02",
    "Nivel 2 · Un poco más lejos",
    "La bandera está más a la derecha. Usa más pasos.",
    "Sube el número de pasos en Avanzar.",
    ["move_forward"],
    { x: 40, y: GROUND_Y },
    [ground(0, 480)],
    flagAt(420),
    [],
    ["move_forward"],
  ),
  lvl(
    "l03",
    "Nivel 3 · ¡Salta el hueco!",
    "Hay un hueco. Salta y luego avanza hasta la bandera.",
    "Avanzar → Saltar → Avanzar.",
    ["move_forward", "jump"],
    { x: 40, y: GROUND_Y },
    [ground(0, 190), ground(240, 240)],
    flagAt(420),
    [],
    ["move_forward", "jump", "move_forward"],
  ),
  lvl(
    "l04",
    "Nivel 4 · Dos saltos",
    "Dos huecos seguidos: salta dos veces en el camino.",
    "Avanza, salta, avanza, salta, avanza.",
    ["move_forward", "jump"],
    { x: 36, y: GROUND_Y },
    [ground(0, 130), ground(180, 100), ground(330, 150)],
    flagAt(430),
    [],
    ["move_forward", "jump", "move_forward", "jump", "move_forward"],
  ),
  lvl(
    "l05",
    "Nivel 5 · Agáchate",
    "Hay un tubo bajo. Agáchate y avanza por debajo.",
    "Agacharse baja a Aki para pasar.",
    ["move_forward", "crouch"],
    { x: 40, y: GROUND_Y },
    [ground(0, 480)],
    flagAt(420),
    [lowPipe(200, GROUND_Y - 50, 70, 24)],
    ["move_forward", "crouch", "move_forward", "move_forward"],
  ),
  lvl(
    "l06",
    "Nivel 6 · Salto y tubo",
    "Salta el hueco y luego agáchate bajo el tubo.",
    "Orden: avanzar, saltar, avanzar, agacharse, avanzar.",
    ["move_forward", "jump", "crouch"],
    { x: 36, y: GROUND_Y },
    [ground(0, 170), ground(230, 250)],
    flagAt(430),
    [lowPipe(310, GROUND_Y - 50, 64, 24)],
    ["move_forward", "jump", "move_forward", "crouch", "move_forward"],
  ),
  lvl(
    "l07",
    "Nivel 7 · Plataforma alta",
    "Sube a la plataforma de pasto con un salto y llega a la bandera.",
    "Acércate y salta hacia la plataforma.",
    ["move_forward", "jump"],
    { x: 40, y: GROUND_Y },
    [
      ground(0, 180),
      grassPlat(200, 220, 120),
      ground(340, 140),
    ],
    flagAt(420),
    [],
    ["move_forward", "jump", "move_forward", "jump", "move_forward"],
  ),
  lvl(
    "l08",
    "Nivel 8 · Retrocede un poco",
    "Estás demasiado cerca del borde. Retrocede, luego salta.",
    "Usa Retroceder antes de saltar.",
    ["move_forward", "move_back", "jump"],
    { x: 155, y: GROUND_Y },
    [ground(0, 180), ground(235, 245)],
    flagAt(420),
    [],
    ["move_back", "jump", "move_forward", "move_forward"],
  ),
  lvl(
    "l09",
    "Nivel 9 · Escalera de ladrillos",
    "Sube tres escalones de ladrillo hasta la bandera.",
    "Avanza y salta en cada escalón.",
    ["move_forward", "jump"],
    { x: 36, y: GROUND_Y },
    [
      ground(0, 100),
      brickPlat(110, 240, 70),
      brickPlat(200, 200, 70),
      brickPlat(290, 160, 90),
      ground(390, 90),
    ],
    flagAt(430, GROUND_Y, 88),
    [],
    ["move_forward", "jump", "move_forward", "jump", "move_forward", "jump", "move_forward"],
  ),
  lvl(
    "l10",
    "Nivel 10 · Tubo alto y hueco",
    "Salta sobre el tubo y cruza el hueco hacia la bandera.",
    "El tubo es una plataforma: súbete y salta.",
    ["move_forward", "jump", "crouch"],
    { x: 40, y: GROUND_Y },
    [
      ground(0, 140),
      pipe(150, GROUND_Y - 56, 44, 56),
      ground(280, 200),
    ],
    flagAt(430),
    [],
    ["move_forward", "jump", "move_forward", "jump", "move_forward"],
  ),
  lvl(
    "l11",
    "Nivel 11 · Repite saltos",
    "Usa Repetir para saltar varios huecos iguales.",
    "Mete Avanzar y Saltar dentro de Repetir.",
    ["move_forward", "jump", "repeat"],
    { x: 32, y: GROUND_Y },
    [
      ground(0, 100),
      ground(150, 80),
      ground(280, 80),
      ground(410, 70),
    ],
    flagAt(450),
    [],
    ["repeat"],
  ),
  lvl(
    "l12",
    "Nivel 12 · Pasadizo secreto",
    "Agáchate bajo dos bloques y salta el hueco final.",
    "Agacharse dos veces o avanzar agachado con cuidado.",
    ["move_forward", "jump", "crouch", "repeat"],
    { x: 36, y: GROUND_Y },
    [ground(0, 340), ground(400, 80)],
    flagAt(450),
    [
      lowBlock(140, GROUND_Y - 50, 56, 24),
      lowBlock(240, GROUND_Y - 50, 56, 24),
    ],
    ["move_forward", "crouch", "move_forward", "crouch", "move_forward", "jump", "move_forward"],
  ),
  lvl(
    "l13",
    "Nivel 13 · Islas flotantes",
    "Salta de isla en isla hasta la bandera del cielo.",
    "No te caigas: avanza poco y salta.",
    ["move_forward", "move_back", "jump"],
    { x: 40, y: GROUND_Y },
    [
      ground(0, 100),
      grassPlat(140, 230, 80),
      grassPlat(250, 190, 80),
      brickPlat(360, 150, 100),
    ],
    flagAt(430, 150, 70),
    [],
    ["move_forward", "jump", "move_forward", "jump", "move_forward", "jump", "move_forward"],
  ),
  lvl(
    "l14",
    "Nivel 14 · Zigzag",
    "Retrocede para tomar impulso, salta, agáchate y termina.",
    "Combina los cuatro movimientos.",
    ["move_forward", "move_back", "jump", "crouch", "wait"],
    { x: 200, y: GROUND_Y },
    [
      ground(0, 175),
      ground(235, 110),
      ground(400, 80),
      pipe(90, GROUND_Y - 48, 40, 48),
    ],
    flagAt(450),
    [lowPipe(310, GROUND_Y - 50, 60, 24)],
    ["move_back", "jump", "move_forward", "jump", "crouch", "move_forward"],
  ),
  lvl(
    "l15",
    "Nivel 15 · Gran aventura",
    "El reto final: huecos, tubos y plataformas. ¡Llega a la bandera!",
    "Planifica bien. Al completar los 15 desbloqueas el juego libre.",
    ["move_forward", "move_back", "jump", "crouch", "wait", "say", "repeat"],
    { x: 32, y: GROUND_Y },
    [
      ground(0, 110),
      brickPlat(125, 240, 70),
      ground(220, 80),
      pipe(310, GROUND_Y - 52, 42, 52),
      grassPlat(370, 200, 55),
      ground(430, 50),
    ],
    flagAt(460),
    [lowBlock(235, GROUND_Y - 50, 48, 24)],
    ["move_forward", "jump", "move_forward", "crouch", "move_forward", "jump", "move_forward", "jump", "move_forward"],
  ),
];

export const FIRST_LEVEL_ID = CREAR_CURRICULUM[0].id;
export const TOTAL_CREAR_LEVELS = CREAR_CURRICULUM.length;

export function levelById(id: string): CrearLevel | undefined {
  return CREAR_CURRICULUM.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const i = CREAR_CURRICULUM.findIndex((l) => l.id === currentId);
  if (i < 0 || i >= CREAR_CURRICULUM.length - 1) return null;
  return CREAR_CURRICULUM[i + 1].id;
}

export function allLevelsComplete(completedIds: string[]): boolean {
  return CREAR_CURRICULUM.every((l) => completedIds.includes(l.id));
}

/** Mundo libre tras desbloquear (escenario amplio para jugar a mano). */
export const FREE_PLAY_LEVEL: CrearLevel = {
  id: "free",
  title: "Modo libre",
  mission: "¡Juega tú mism@ con el control Game Boy!",
  hint: "D-pad para mover · A saltar · B agacharse",
  allowedBlocks: [],
  start: { x: 60, y: GROUND_Y },
  platforms: [
    ground(0, 160),
    ground(220, 100),
    ground(380, 200),
    brickPlat(170, 220, 80),
    grassPlat(300, 180, 70),
    pipe(420, GROUND_Y - 60, 48, 60),
    brickPlat(500, 240, 90),
    ground(560, 200),
    grassPlat(700, 200, 80),
    ground(800, 200),
  ],
  lowObstacles: [
    lowPipe(250, GROUND_Y - 50, 55, 24),
    lowBlock(620, GROUND_Y - 50, 50, 24),
  ],
  flag: flagAt(920, GROUND_Y, 96),
};

/** Escenario más ancho solo en modo libre (cámara sigue a Aki). */
export const FREE_PLAY_WORLD_WIDTH = 1000;

export function buildStarterBlocks(level: CrearLevel): ProgramBlock[] {
  const start: ProgramBlock = { id: "lvl-start", kind: "event_start" };
  if (!level.starterBlocks?.length) return [start];
  const body = level.starterBlocks.map((kind) => {
    const b = createBlock(kind);
    if (kind === "repeat") {
      b.value = 3;
      b.children = [createBlock("move_forward"), createBlock("jump")];
    }
    if (kind === "move_forward") b.value = 3;
    if (kind === "move_back") b.value = 1;
    return b;
  });
  return [start, ...body];
}

export function worldFromLevel(level: CrearLevel, worldWidth = STAGE_SIZE.width) {
  return {
    platforms: level.platforms,
    lowObstacles: level.lowObstacles,
    width: worldWidth,
    height: STAGE_SIZE.height,
  };
}
