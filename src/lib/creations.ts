import { activeProfile, loadProfiles } from "./profiles";

export type BlockType = "mover" | "girar" | "esperar" | "decir";

export type AnimBlock = {
  id: string;
  type: BlockType;
  /** pasos (mover), grados (girar), ms (esperar), texto (decir) */
  value: number | string;
};

export type SavedCreation = {
  id: string;
  name: string;
  emoji: string;
  blocks: AnimBlock[];
  updatedAt: number;
};

function storageKey(): string | null {
  const profile = activeProfile(loadProfiles());
  return profile ? `akemi-creations-v1-${profile.id}` : null;
}

export function loadCreations(): SavedCreation[] {
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as SavedCreation[];
  } catch {
    return [];
  }
}

export function saveCreations(list: SavedCreation[]): void {
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(list.slice(0, 8)));
}

export function upsertCreation(creation: SavedCreation): SavedCreation[] {
  const list = loadCreations().filter((c) => c.id !== creation.id);
  const next = [creation, ...list].slice(0, 8);
  saveCreations(next);
  return next;
}

export function newBlock(type: BlockType): AnimBlock {
  const defaults: Record<BlockType, number | string> = {
    mover: 40,
    girar: 90,
    esperar: 500,
    decir: "¡Hola!",
  };
  return {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    value: defaults[type],
  };
}