import {
  ALL_IMAGE_IDS,
  COLORING_PACKS,
  MATH_PACK_BY_LEVEL,
  STARTER_IMAGE_IDS,
  SUPER_PACK_IDS,
  packById,
} from "./coloring-packs";
import { activeProfile, loadProfiles, progressKey } from "./profiles";
import {
  type ReadingSectionId,
  READING_BOOK_BY_PATH_LEVEL,
  isLevelComplete,
  maxPointsInLevel,
  nextSectionAfter,
  pointsPerSection,
  sectionsForState,
  sectionPoints,
  totalPointsInLevel,
} from "./reading-path";

/** @deprecated use ReadingSectionId */
export type ReadingLevelId = ReadingSectionId;

export type ReadingPathProgress = {
  pathLevel: number;
  levelsCompleted: number;
  sectionPoints: Partial<Record<ReadingSectionId, number>>;
};

export type ProgressState = {
  unlockedImages: string[];
  readingPath: ReadingPathProgress;
  math: {
    level: number;
    streak: number;
    rewardedLevels: number[];
    superPackUnlocked: boolean;
  };
};

const SCHEMA_MIGRATED = "akemi-schema-migrated-v4";

function emptyReadingPath(): ReadingPathProgress {
  return { pathLevel: 1, levelsCompleted: 0, sectionPoints: {} };
}

export function defaultProgress(): ProgressState {
  return {
    unlockedImages: [...STARTER_IMAGE_IDS],
    readingPath: emptyReadingPath(),
    math: {
      level: 1,
      streak: 0,
      rewardedLevels: [],
      superPackUnlocked: false,
    },
  };
}

type LegacyV3 = {
  unlockedImages?: string[];
  reading?: Record<string, { done?: number[]; nivelCompleto?: boolean }>;
  math?: ProgressState["math"];
};

function migrateV3ToV4(raw: LegacyV3, base: ProgressState): ProgressState {
  const levelsCompleted = ["letras", "silabas", "palabras", "frases"].filter(
    (id) => raw.reading?.[id]?.nivelCompleto,
  ).length;
  return {
    ...base,
    unlockedImages: base.unlockedImages,
    readingPath: {
      pathLevel: Math.max(1, levelsCompleted + 1),
      levelsCompleted,
      sectionPoints: {},
    },
    math: base.math,
  };
}

function runGlobalSchemaMigration(): void {
  if (localStorage.getItem(SCHEMA_MIGRATED)) return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("akemi-progress-v3-")) keys.push(k);
  }
  for (const oldKey of keys) {
    const profileId = oldKey.replace("akemi-progress-v3-", "");
    const newKey = `akemi-progress-v4-${profileId}`;
    if (!localStorage.getItem(newKey)) {
      try {
        const raw = JSON.parse(localStorage.getItem(oldKey) ?? "null") as LegacyV3;
        const migrated = migrateV3ToV4(raw, defaultProgress());
        migrated.unlockedImages = ALL_IMAGE_IDS.filter((id) =>
          new Set([...STARTER_IMAGE_IDS, ...(raw.unlockedImages ?? [])]).has(id),
        );
        if (raw.math) migrated.math = { ...defaultProgress().math, ...raw.math };
        localStorage.setItem(newKey, JSON.stringify(migrated));
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem(oldKey);
  }
  localStorage.removeItem("akemi-progress-v2");
  localStorage.setItem(SCHEMA_MIGRATED, "1");
}

function normalize(raw: Partial<ProgressState> | null): ProgressState {
  const base = defaultProgress();
  if (!raw) return base;
  const unlocked = new Set([...STARTER_IMAGE_IDS, ...(raw.unlockedImages ?? [])]);
  const path = raw.readingPath ?? emptyReadingPath();
  return {
    unlockedImages: ALL_IMAGE_IDS.filter((id) => unlocked.has(id)),
    readingPath: {
      pathLevel: Math.max(1, path.pathLevel ?? 1),
      levelsCompleted: Math.max(0, path.levelsCompleted ?? 0),
      sectionPoints: { ...(path.sectionPoints ?? {}) },
    },
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
  const profile = activeProfile(store);
  if (!profile) return null;
  return progressKey(profile.id);
}

export function loadProgress(): ProgressState {
  runGlobalSchemaMigration();
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

export type ReadingAnswerResult = {
  state: ProgressState;
  sectionComplete: boolean;
  levelComplete: boolean;
  nextSection: ReadingSectionId | null;
  packUnlocked: string | null;
};

/** +1 punto en la sección actual del nivel de camino (máx. 5 por sección). */
export function registerReadingCorrect(
  state: ProgressState,
  section: ReadingSectionId,
): ReadingAnswerResult {
  const allowed = sectionsForState(state);
  if (!allowed.includes(section)) {
    return {
      state,
      sectionComplete: false,
      levelComplete: false,
      nextSection: null,
      packUnlocked: null,
    };
  }
  const cur = sectionPoints(state, section);
  if (cur >= pointsPerSection()) {
    return {
      state,
      sectionComplete: false,
      levelComplete: false,
      nextSection: null,
      packUnlocked: null,
    };
  }

  const newPts = cur + 1;
  let next: ProgressState = {
    ...state,
    readingPath: {
      ...state.readingPath,
      sectionPoints: { ...state.readingPath.sectionPoints, [section]: newPts },
    },
  };

  const sectionComplete = newPts >= pointsPerSection();
  let levelComplete = false;
  let packUnlocked: string | null = null;
  let nextSection: ReadingSectionId | null = sectionComplete
    ? nextSectionAfter(next, section)
    : null;

  if (sectionComplete && isLevelComplete(next)) {
    levelComplete = true;
    const completedLevel = next.readingPath.pathLevel;
    const packId = READING_BOOK_BY_PATH_LEVEL[completedLevel];
    if (packId) {
      const pack = packById(packId);
      const already = pack?.images.every((i) => next.unlockedImages.includes(i.id));
      if (pack && !already) {
        next = unlockPackImages(next, packId);
        packUnlocked = packId;
      }
    }
    next = {
      ...next,
      readingPath: {
        pathLevel: completedLevel + 1,
        levelsCompleted: next.readingPath.levelsCompleted + 1,
        sectionPoints: {},
      },
    };
    nextSection = null;
  }

  return { state: next, sectionComplete, levelComplete, nextSection, packUnlocked };
}

/** @deprecated */
export function completeReadingChallenge(
  state: ProgressState,
  level: ReadingSectionId,
  _challengeIndex: number,
): {
  state: ProgressState;
  packUnlocked: string | null;
  nivelCompleto: boolean;
  nextLevel: ReadingSectionId | null;
} {
  const r = registerReadingCorrect(state, level);
  return {
    state: r.state,
    packUnlocked: r.packUnlocked,
    nivelCompleto: r.sectionComplete,
    nextLevel: r.nextSection,
  };
}

export type MathAnswerResult = {
  state: ProgressState;
  unlockedPack: string | null;
  superPackUnlocked: boolean;
  levelAdvanced: boolean;
  streakReset: boolean;
};

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

export function nextUnlockSummary(state: ProgressState): {
  title: string;
  detail: string;
  progress: number;
  target: number;
} {
  const pts = totalPointsInLevel(state);
  const max = maxPointsInLevel();
  const packId = READING_BOOK_BY_PATH_LEVEL[state.readingPath.pathLevel];
  if (packId && !isPackFullyUnlocked(state, packId)) {
    return {
      title: `Nivel de lectura ${state.readingPath.pathLevel}`,
      detail: packById(packId)?.name ?? "Siguiente libro",
      progress: pts,
      target: max,
    };
  }

  const m = state.math;
  if (m.level <= 5) {
    const packIdMath = MATH_PACK_BY_LEVEL[m.level];
    const hasReward = m.rewardedLevels.includes(m.level);
    const packName = packIdMath ? packById(packIdMath)?.name : "Libro";
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

export {
  challengeSlot,
  currentSection,
  isSectionComplete,
  maxPointsInLevel,
  sectionPoints,
  sectionsForState,
  totalPointsInLevel,
} from "./reading-path";

export const READING_LEVEL_ORDER: ReadingSectionId[] = [
  "letras",
  "silabas",
  "palabras",
  "frases",
  "aprende",
  "lectura",
];

export function readingLevelNumber(level: ReadingSectionId): number {
  const list = sectionsForState(loadProgress());
  return list.indexOf(level) + 1;
}

export function nextReadingLevel(level: ReadingSectionId): ReadingSectionId | null {
  const state = loadProgress();
  return nextSectionAfter(state, level);
}