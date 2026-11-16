import type { ProgramBlock } from "./blocks";

export type SavedCreation = {
  id: string;
  title: string;
  savedAt: string;
  blocks: ProgramBlock[];
};

const MAX_SAVES = 8;

function key(profileId: string) {
  return `akemi-creations-v1-${profileId}`;
}

export function loadCreations(profileId: string): SavedCreation[] {
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCreation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCreation(profileId: string, creation: SavedCreation): SavedCreation[] {
  const list = loadCreations(profileId).filter((c) => c.id !== creation.id);
  list.unshift(creation);
  const trimmed = list.slice(0, MAX_SAVES);
  localStorage.setItem(key(profileId), JSON.stringify(trimmed));
  return trimmed;
}

export function deleteCreation(profileId: string, id: string): SavedCreation[] {
  const next = loadCreations(profileId).filter((c) => c.id !== id);
  localStorage.setItem(key(profileId), JSON.stringify(next));
  return next;
}