import { COLORING_PACKS, imageById, type ColoringImage } from "./coloring-packs";
import { STARTER_IMAGE_IDS } from "./coloring-packs";

/** Imágenes desbloqueadas disponibles para armar (libros Robcrea / packs). */
export function unlockedColoringImages(unlockedIds: string[]): ColoringImage[] {
  const set = new Set(unlockedIds);
  const list = COLORING_PACKS.flatMap((p) => p.images).filter((img) => set.has(img.id));
  if (list.length > 0) return list;
  // Fallback: starter pack por ids conocidos
  return STARTER_IMAGE_IDS.map((id) => imageById(id)).filter(Boolean) as ColoringImage[];
}

/** Elige una imagen al azar del pool desbloqueado. */
export function pickRandomColoringImage(
  unlockedIds: string[],
  avoidId?: string | null,
): ColoringImage | null {
  const pool = unlockedColoringImages(unlockedIds);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  const filtered = avoidId ? pool.filter((i) => i.id !== avoidId) : pool;
  const choices = filtered.length > 0 ? filtered : pool;
  return choices[Math.floor(Math.random() * choices.length)] ?? null;
}
