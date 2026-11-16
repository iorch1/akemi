import {
  allLevelsComplete,
  CREAR_CURRICULUM,
  FIRST_LEVEL_ID,
  nextLevelId,
} from "./curriculum";

export type CrearLevelProgress = {
  completedLevelIds: string[];
  activeLevelId: string;
  /** Desbloqueado al completar los 15 niveles (modo libre Game Boy). */
  freePlayUnlocked: boolean;
};

const EVENT = "akemi-crear-levels";

function key(profileId: string) {
  return `akemi-crear-levels-v1-${profileId}`;
}

export function defaultCrearLevelProgress(): CrearLevelProgress {
  return {
    completedLevelIds: [],
    activeLevelId: FIRST_LEVEL_ID,
    freePlayUnlocked: false,
  };
}

export function loadCrearLevelProgress(profileId: string): CrearLevelProgress {
  if (!profileId) return defaultCrearLevelProgress();
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return defaultCrearLevelProgress();
    const parsed = JSON.parse(raw) as Partial<CrearLevelProgress>;
    const completed = (parsed.completedLevelIds ?? []).filter((id) =>
      CREAR_CURRICULUM.some((l) => l.id === id),
    );
    const unlocked = Boolean(parsed.freePlayUnlocked) || allLevelsComplete(completed);
    const active =
      parsed.activeLevelId === "free" && unlocked
        ? "free"
        : CREAR_CURRICULUM.some((l) => l.id === parsed.activeLevelId)
          ? (parsed.activeLevelId as string)
          : FIRST_LEVEL_ID;
    return {
      completedLevelIds: completed,
      activeLevelId: active,
      freePlayUnlocked: unlocked,
    };
  } catch {
    return defaultCrearLevelProgress();
  }
}

export function saveCrearLevelProgress(profileId: string, progress: CrearLevelProgress): void {
  if (!profileId) return;
  localStorage.setItem(key(profileId), JSON.stringify(progress));
  window.dispatchEvent(new Event(EVENT));
}

export function isLevelUnlocked(progress: CrearLevelProgress, levelId: string): boolean {
  if (levelId === "free") return progress.freePlayUnlocked;
  const idx = CREAR_CURRICULUM.findIndex((l) => l.id === levelId);
  if (idx <= 0) return true;
  const prev = CREAR_CURRICULUM[idx - 1];
  return progress.completedLevelIds.includes(prev.id);
}

export function markLevelComplete(
  profileId: string,
  levelId: string,
): CrearLevelProgress {
  const prev = loadCrearLevelProgress(profileId);
  if (levelId === "free") return prev;
  const completed = prev.completedLevelIds.includes(levelId)
    ? prev.completedLevelIds
    : [...prev.completedLevelIds, levelId];
  const freePlayUnlocked = allLevelsComplete(completed);
  const next = nextLevelId(levelId);
  const active =
    next && isLevelUnlocked({ ...prev, completedLevelIds: completed, freePlayUnlocked }, next)
      ? next
      : freePlayUnlocked && !next
        ? "free"
        : levelId;
  const nextProgress: CrearLevelProgress = {
    completedLevelIds: completed,
    activeLevelId: active,
    freePlayUnlocked,
  };
  saveCrearLevelProgress(profileId, nextProgress);
  return nextProgress;
}

export function setActiveCrearLevel(profileId: string, levelId: string): CrearLevelProgress {
  const prev = loadCrearLevelProgress(profileId);
  if (!isLevelUnlocked(prev, levelId)) return prev;
  const next = { ...prev, activeLevelId: levelId };
  saveCrearLevelProgress(profileId, next);
  return next;
}

export function subscribeCrearLevels(onChange: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key?.includes("akemi-crear-levels-v1-")) onChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT, onChange);
  };
}
