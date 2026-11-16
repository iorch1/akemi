import { isPuzzlePieceCount, type PuzzlePieceCount } from "./puzzle-grid";
import { loadProfiles } from "./profiles";

export type PuzzlePrefs = {
  lastPieceCount: PuzzlePieceCount;
  lastImageId: string | null;
  completedCount: number;
};

const DEFAULT: PuzzlePrefs = {
  lastPieceCount: 10,
  lastImageId: null,
  completedCount: 0,
};

function key(profileId: string) {
  return `akemi-puzzles-v1-${profileId}`;
}

function resolveProfileId(profileId?: string | null): string | null {
  if (profileId) return profileId;
  return loadProfiles().activeId;
}

function normalize(raw: unknown): PuzzlePrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT };
  const o = raw as Partial<PuzzlePrefs>;
  const count = typeof o.lastPieceCount === "number" && isPuzzlePieceCount(o.lastPieceCount)
    ? o.lastPieceCount
    : DEFAULT.lastPieceCount;
  return {
    lastPieceCount: count,
    lastImageId: typeof o.lastImageId === "string" ? o.lastImageId : null,
    completedCount: typeof o.completedCount === "number" && o.completedCount >= 0
      ? Math.floor(o.completedCount)
      : 0,
  };
}

export function loadPuzzlePrefs(profileId?: string | null): PuzzlePrefs {
  const id = resolveProfileId(profileId);
  if (!id) return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return { ...DEFAULT };
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT };
  }
}

export function savePuzzlePrefs(prefs: PuzzlePrefs, profileId?: string | null): PuzzlePrefs {
  const id = resolveProfileId(profileId);
  const next = normalize(prefs);
  if (!id) return next;
  localStorage.setItem(key(id), JSON.stringify(next));
  window.dispatchEvent(new Event("akemi-puzzles"));
  return next;
}

export function recordPuzzleCompleted(
  pieceCount: PuzzlePieceCount,
  imageId: string,
  profileId?: string | null,
): PuzzlePrefs {
  const prev = loadPuzzlePrefs(profileId);
  return savePuzzlePrefs(
    {
      lastPieceCount: pieceCount,
      lastImageId: imageId,
      completedCount: prev.completedCount + 1,
    },
    profileId,
  );
}
