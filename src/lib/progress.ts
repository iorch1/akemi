import {
  ALL_IMAGE_IDS,
  COLORING_PACKS,
  MATH_PACK_BY_LEVEL,
  READING_PACK_ORDER,
  STARTER_IMAGE_IDS,
  SUPER_PACK_IDS,
  packById,
} from "./coloring-packs";
import { activeProfile, loadProfiles, progressKey, runProgressSchemaMigration } from "./profiles";

export type ReadingLevelId = "letras" | "silabas" | "palabras" | "frases";

export const READING_POINTS_PER_SECTION = 5;
export const READING_POINTS_TO_PASS = 20;

export type ReadingModeProgress = {
  /** Índices de retos acertados (como mucho 5 puntos por sección). */
  done: number[];
};

export type ProgressState = {
  unlockedImages: string[];
  reading: Record<ReadingLevelId, ReadingModeProgress>;
  /** Cada 20/20 en las cuatro secciones desbloquea libro-02…05 y reinicia retos. */
  readingRound: number;
  math: {
    level: number;
    streak: number;
    rewardedLevels: number[];
    superPackUnlocked: boolean;
  };
};

function emptyReading(): ProgressState["reading"] {
  return {
    letras: { done: [] },
    silabas: { done: [] },
    palabras: { done: [] },
    frases: { done: [] },
  };
}

function normalizeReading(raw?: Partial<ReadingModeProgress>): ReadingModeProgress {
  const done = (raw?.done ?? []).filter((i) => i >= 0 && i <= 4).slice(0, READING_POINTS_PER_SECTION);
  return { done: [...new Set(done)].sort((a, b) => a - b) };
}

export const READING_LEVEL_ORDER: ReadingLevelId[] = ["letras", "silabas", "palabras", "frases"];

export function readingLevelNumber(level: ReadingLevelId): number {
  return READING_LEVEL_ORDER.indexOf(level) + 1;
}

export function readingSectionPoints(state: ProgressState, level: ReadingLevelId): number {
  return Math.min(READING_POINTS_PER_SECTION, state.reading[level].done.length);
}

export function totalReadingPoints(state: ProgressState): number {
  return READING_LEVEL_ORDER.reduce((sum, lvl) => sum + readingSectionPoints(state, lvl), 0);
}

export function isReadingRoundComplete(state: ProgressState): boolean {
  return totalReadingPoints(state) >= READING_POINTS_TO_PASS;
}

export function nextReadingPackId(state: ProgressState): string | null {
  return READING_PACK_ORDER[state.readingRound] ?? null;
}

export function defaultProgress(): ProgressState {
  return {
    unlockedImages: [...STARTER_IMAGE_IDS],
    reading: emptyReading(),
    readingRound: 0,
    math: {
      level: 1,
      streak: 0,
      rewardedLevels: [],
      superPackUnlocked: false,
    },
  };
}

function normalize(raw: Partial<ProgressState> | null): ProgressState {
  const base = defaultProgress();
  if (!raw) return base;
  const unlocked = new Set([...STARTER_IMAGE_IDS, ...(raw.unlockedImages ?? [])]);
  return {
    unlockedImages: ALL_IMAGE_IDS.filter((id) => unlocked.has(id)),
    reading: {
      letras: normalizeReading(raw.reading?.letras),
      silabas: normalizeReading(raw.reading?.silabas),
      palabras: normalizeReading(raw.reading?.palabras),
      frases: normalizeReading(raw.reading?.frases),
    },
    readingRound: Math.max(0, Math.min(READING_PACK_ORDER.length, raw.readingRound ?? 0)),
    math: {
      level: Math.max(1, raw.math?.level ?? 1),
      streak: Math.min(5, Math.max(0, raw.math?.streak ?? 0)),
      rewardedLevels: raw.math?.rewardedLevels ?? [],
      superPackUnlocked: raw.math?.superPackUnlocked ?? false,
    },
  };
}

function currentProgressKey(): string | null {
  const store = loadProfiles();
  runProgressSchemaMigration(store);
  const profile = activeProfile(store);
  if (!profile) return null;
  return progressKey(profile.id);
}

export function loadProgress(): ProgressState {
  const key = currentProgressKey();
  if (!key) return defaultProgress();
  try {
    const s = localStorage.getItem(key);
    if (!s) return defaultProgress();
    return normalize(JSON.parse(s) as Partial<ProgressState>);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  const key = currentProgressKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(state));
}

function unlockPackImages(state: ProgressState, packId: string): ProgressState {
  const pack = packById(packId);
  if (!pack) return state;
  const set = new Set(state.unlockedImages);
  for (const img of pack.images) set.add(img.id);
  return { ...state, unlockedImages: ALL_IMAGE_IDS.filter((id) => set.has(id)) };
}

/** Registra un reto de lectura acertado. Suma 1 punto por sección (máx. 5). Al 20/20 desbloquea libro y reinicia retos. */
export function completeReadingChallenge(
  state: ProgressState,
  level: ReadingLevelId,
  challengeIndex: number,
): {
  state: ProgressState;
  packUnlocked: string | null;
  roundComplete: boolean;
} {
  if (challengeIndex < 0 || challengeIndex > 4) {
    return { state, packUnlocked: null, roundComplete: false };
  }
  const mode = state.reading[level];
  if (mode.done.includes(challengeIndex) || mode.done.length >= READING_POINTS_PER_SECTION) {
    return { state, packUnlocked: null, roundComplete: false };
  }

  const newDone = [...mode.done, challengeIndex].sort((a, b) => a - b);
  let next: ProgressState = {
    ...state,
    reading: {
      ...state.reading,
      [level]: { done: newDone },
    },
  };

  let packUnlocked: string | null = null;
  let roundComplete = false;

  if (totalReadingPoints(next) >= READING_POINTS_TO_PASS) {
    const packId = READING_PACK_ORDER[next.readingRound];
    if (packId) {
      const pack = packById(packId);
      const already = pack?.images.every((i) => next.unlockedImages.includes(i.id));
      if (pack && !already) {
        next = unlockPackImages(next, packId);
        packUnlocked = packId;
      }
    }
    roundComplete = true;
    next = {
      ...next,
      readingRound: Math.min(READING_PACK_ORDER.length, next.readingRound + 1),
      reading: emptyReading(),
    };
  }

  return { state: next, packUnlocked, roundComplete };
}

export type MathAnswerResult = {
  state: ProgressState;
  unlockedPack: string | null;
  superPackUnlocked: boolean;
  levelAdvanced: boolean;
  streakReset: boolean;
};

/** Respuesta correcta en matemáticas: +1 racha; al llegar a 5, recompensa libro y sube nivel. */
export function mathCorrect(state: ProgressState): MathAnswerResult {
  let unlockedPack: string | null = null;
  let superPackUnlocked = false;
  let levelAdvanced = false;

  const streak = Math.min(5, state.math.streak + 1);
  let next = { ...state, math: { ...state.math, streak } };

  if (streak >= 5) {
    const lvl = next.math.level;
    if (!next.math.rewardedLevels.includes(lvl)) {
      const packId = MATH_PACK_BY_LEVEL[lvl];
      if (packId) {
        next = unlockPackImages(next, packId);
        unlockedPack = packId;
      }
      next = {
        ...next,
        math: {
          ...next.math,
          rewardedLevels: [...next.math.rewardedLevels, lvl],
        },
      };
    }
    const newLevel = lvl + 1;
    next = {
      ...next,
      math: { ...next.math, level: newLevel, streak: 0 },
    };
    levelAdvanced = true;
    if (newLevel >= 6 && !next.math.superPackUnlocked) {
      for (const pid of SUPER_PACK_IDS) {
        next = unlockPackImages(next, pid);
      }
      next = { ...next, math: { ...next.math, superPackUnlocked: true } };
      superPackUnlocked = true;
      unlockedPack = unlockedPack ?? "libro-11";
    }
  }

  return {
    state: next,
    unlockedPack,
    superPackUnlocked,
    levelAdvanced,
    streakReset: false,
  };
}

/** Respuesta incorrecta: racha a cero (mismo nivel). */
export function mathWrong(state: ProgressState): MathAnswerResult {
  return {
    state: { ...state, math: { ...state.math, streak: 0 } },
    unlockedPack: null,
    superPackUnlocked: false,
    levelAdvanced: false,
    streakReset: true,
  };
}

export function isPackFullyUnlocked(state: ProgressState, packId: string): boolean {
  const pack = packById(packId);
  if (!pack) return false;
  return pack.images.every((i) => state.unlockedImages.includes(i.id));
}

export function isImageUnlocked(state: ProgressState, imageId: string): boolean {
  return state.unlockedImages.includes(imageId);
}

export function countUnlockedImages(state: ProgressState): number {
  return state.unlockedImages.length;
}

export function totalImages(): number {
  return ALL_IMAGE_IDS.length;
}

/** Progreso hacia el siguiente hito visible en inicio */
export function nextUnlockSummary(state: ProgressState): {
  title: string;
  detail: string;
  progress: number;
  target: number;
} {
  const nextPack = nextReadingPackId(state);
  if (nextPack && !isPackFullyUnlocked(state, nextPack)) {
    return {
      title: "Siguiente libro (lectura)",
      detail: `${packById(nextPack)?.name ?? "Libro"} · 5 puntos en cada sección`,
      progress: totalReadingPoints(state),
      target: READING_POINTS_TO_PASS,
    };
  }

  const m = state.math;
  if (m.level <= 5) {
    const packId = MATH_PACK_BY_LEVEL[m.level];
    const hasReward = m.rewardedLevels.includes(m.level);
    const packName = packId ? packById(packId)?.name : "Libro";
    return {
      title: hasReward ? `Nivel ${m.level} (sin libro nuevo)` : `Nivel ${m.level} matemáticas`,
      detail: hasReward ? "Completa 5 seguidos para avanzar" : (packName ?? "Nuevo libro"),
      progress: m.streak,
      target: 5,
    };
  }

  if (!m.superPackUnlocked) {
    return {
      title: "Libros especiales",
      detail: "Supera el nivel 5 en mates",
      progress: m.level >= 6 ? 1 : 0,
      target: 1,
    };
  }

  const locked = COLORING_PACKS.filter((p) => !isPackFullyUnlocked(state, p.id));
  if (locked.length === 0) {
    return {
      title: "¡Todo desbloqueado!",
      detail: "Colorea todas las páginas",
      progress: totalImages(),
      target: totalImages(),
    };
  }
  return {
    title: "Sigue jugando",
    detail: locked[0].name,
    progress: 0,
    target: 1,
  };
}

export function subscribeProgress(onChange: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key?.startsWith("akemi-progress-v4-") || e.key === "akemi-profiles-v1") onChange();
  };
  window.addEventListener("storage", handler);
  const custom = () => onChange();
  window.addEventListener("akemi-progress", custom);
  window.addEventListener("akemi-profiles", custom);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("akemi-progress", custom);
    window.removeEventListener("akemi-profiles", custom);
  };
}

export function commitProgress(state: ProgressState): void {
  saveProgress(state);
  window.dispatchEvent(new Event("akemi-progress"));
}