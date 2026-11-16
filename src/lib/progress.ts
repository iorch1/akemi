import {
  ALL_IMAGE_IDS,
  COLORING_PACKS,
  MATH_IMAGE_BY_LEVEL,
  READING_PACK_BY_LEVEL,
  STARTER_IMAGE_IDS,
  packById,
} from "./coloring-packs";

const STORAGE_KEY = "akemi-progress-v2";

export type ReadingLevelId = "letras" | "silabas" | "palabras" | "frases";

export type ProgressState = {
  unlockedImages: string[];
  reading: Record<ReadingLevelId, { done: number[] }>;
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

export function defaultProgress(): ProgressState {
  return {
    unlockedImages: [...STARTER_IMAGE_IDS],
    reading: emptyReading(),
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
      letras: { done: raw.reading?.letras?.done ?? [] },
      silabas: { done: raw.reading?.silabas?.done ?? [] },
      palabras: { done: raw.reading?.palabras?.done ?? [] },
      frases: { done: raw.reading?.frases?.done ?? [] },
    },
    math: {
      level: Math.max(1, raw.math?.level ?? 1),
      streak: Math.min(5, Math.max(0, raw.math?.streak ?? 0)),
      rewardedLevels: raw.math?.rewardedLevels ?? [],
      superPackUnlocked: raw.math?.superPackUnlocked ?? false,
    },
  };
}

export function loadProgress(): ProgressState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return defaultProgress();
    return normalize(JSON.parse(s) as Partial<ProgressState>);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function unlockPackImages(state: ProgressState, packId: string): ProgressState {
  const pack = packById(packId);
  if (!pack) return state;
  const set = new Set(state.unlockedImages);
  for (const img of pack.images) set.add(img.id);
  return { ...state, unlockedImages: ALL_IMAGE_IDS.filter((id) => set.has(id)) };
}

function unlockImage(state: ProgressState, imageId: string): ProgressState {
  const set = new Set(state.unlockedImages);
  set.add(imageId);
  return { ...state, unlockedImages: ALL_IMAGE_IDS.filter((id) => set.has(id)) };
}

/** Registra un reto de lectura completado (0–4). Desbloquea pack si hay 3 aciertos distintos. */
export function completeReadingChallenge(
  state: ProgressState,
  level: ReadingLevelId,
  challengeIndex: number,
): { state: ProgressState; packUnlocked: string | null } {
  if (challengeIndex < 0 || challengeIndex > 4) return { state, packUnlocked: null };
  const done = state.reading[level].done;
  if (done.includes(challengeIndex)) return { state, packUnlocked: null };

  let next: ProgressState = {
    ...state,
    reading: {
      ...state.reading,
      [level]: { done: [...done, challengeIndex].sort((a, b) => a - b) },
    },
  };

  let packUnlocked: string | null = null;
  const packId = READING_PACK_BY_LEVEL[level];
  if (packId && next.reading[level].done.length >= 3) {
    const pack = packById(packId);
    const already = pack?.images.every((i) => next.unlockedImages.includes(i.id));
    if (pack && !already) {
      next = unlockPackImages(next, packId);
      packUnlocked = packId;
    }
  }
  return { state: next, packUnlocked };
}

export type MathAnswerResult = {
  state: ProgressState;
  unlockedImage: string | null;
  superPackUnlocked: boolean;
  levelAdvanced: boolean;
  streakReset: boolean;
};

/** Respuesta correcta en matemáticas: +1 racha; al llegar a 5, recompensa y sube nivel. */
export function mathCorrect(state: ProgressState): MathAnswerResult {
  let unlockedImage: string | null = null;
  let superPackUnlocked = false;
  let levelAdvanced = false;

  const streak = Math.min(5, state.math.streak + 1);
  let next = { ...state, math: { ...state.math, streak } };

  if (streak >= 5) {
    const lvl = next.math.level;
    if (!next.math.rewardedLevels.includes(lvl)) {
      const img = MATH_IMAGE_BY_LEVEL[lvl];
      if (img) {
        next = unlockImage(next, img);
        unlockedImage = img;
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
      next = unlockPackImages(next, "pack-super");
      next = { ...next, math: { ...next.math, superPackUnlocked: true } };
      superPackUnlocked = true;
    }
  }

  return {
    state: next,
    unlockedImage,
    superPackUnlocked,
    levelAdvanced,
    streakReset: false,
  };
}

/** Respuesta incorrecta: racha a cero (mismo nivel). */
export function mathWrong(state: ProgressState): MathAnswerResult {
  return {
    state: { ...state, math: { ...state.math, streak: 0 } },
    unlockedImage: null,
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
  const readingOrder: ReadingLevelId[] = ["letras", "silabas", "palabras", "frases"];
  for (const lvl of readingOrder) {
    const packId = READING_PACK_BY_LEVEL[lvl];
    if (packId && !isPackFullyUnlocked(state, packId)) {
      const done = state.reading[lvl].done.length;
      return {
        title: "Siguiente pack (lectura)",
        detail: packById(packId)?.name ?? "",
        progress: Math.min(3, done),
        target: 3,
      };
    }
  }

  const m = state.math;
  if (m.level <= 5) {
    const img = MATH_IMAGE_BY_LEVEL[m.level];
    const hasReward = m.rewardedLevels.includes(m.level);
    return {
      title: hasReward ? `Nivel ${m.level} (sin nuevo dibujo)` : `Nivel ${m.level} matemáticas`,
      detail: hasReward
        ? "Completa 5 seguidos para avanzar"
        : (imageByIdSafe(img)?.label ?? "Nuevo dibujo"),
      progress: m.streak,
      target: 5,
    };
  }

  if (!m.superPackUnlocked) {
    return {
      title: "Pack Super guerreras",
      detail: "Supera el nivel 5 en mates",
      progress: m.level >= 6 ? 1 : 0,
      target: 1,
    };
  }

  const locked = COLORING_PACKS.filter((p) => !isPackFullyUnlocked(state, p.id));
  if (locked.length === 0) {
    return {
      title: "¡Todo desbloqueado!",
      detail: "Colorea todos los dibujos",
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

function imageByIdSafe(id: string | undefined) {
  if (!id) return undefined;
  for (const p of COLORING_PACKS) {
    const img = p.images.find((i) => i.id === id);
    if (img) return img;
  }
  return undefined;
}

export function subscribeProgress(onChange: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", handler);
  const custom = () => onChange();
  window.addEventListener("akemi-progress", custom);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("akemi-progress", custom);
  };
}

export function commitProgress(state: ProgressState): void {
  saveProgress(state);
  window.dispatchEvent(new Event("akemi-progress"));
}