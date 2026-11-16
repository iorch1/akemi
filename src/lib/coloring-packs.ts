/**
 * Catálogo de libros Robcrea para colorear (assets proporcionados por el usuario).
 * Páginas generadas desde PDF → PNG en public/coloring/libro-XX/.
 */

import manifest from "./robcrea-manifest.json";

export type ColoringImage = {
  id: string;
  label: string;
  src: string;
};

export type ColoringPack = {
  id: string;
  name: string;
  emoji: string;
  images: ColoringImage[];
  /** Vista previa en inicio (hasta 5 miniaturas) */
  previewIds: string[];
  unlockHint: string;
};

const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");

export function coloringAsset(path: string): string {
  return `${base}coloring/${path}`;
}

type LibroMeta = {
  numero: number;
  emoji: string;
  name: string;
  unlockHint: string;
};

const LIBRO_META: LibroMeta[] = [
  { numero: 1, emoji: "📗", name: "Libro 1", unlockHint: "Disponible desde el inicio" },
  { numero: 2, emoji: "📘", name: "Libro 2", unlockHint: "Aprender a leer · completa el nivel de camino 1 (20 puntos)" },
  { numero: 3, emoji: "📙", name: "Libro 3", unlockHint: "Aprender a leer · completa el nivel de camino 2 (20 puntos)" },
  { numero: 4, emoji: "📕", name: "Libro 4", unlockHint: "Aprender a leer · completa el nivel de camino 3 (20 puntos)" },
  { numero: 5, emoji: "📓", name: "Libro 5", unlockHint: "Aprender a leer · completa el nivel de camino 4 (20 puntos)" },
  { numero: 6, emoji: "1️⃣", name: "Libro 6", unlockHint: "Matemáticas · nivel 1: racha de 5 aciertos" },
  { numero: 7, emoji: "2️⃣", name: "Libro 7", unlockHint: "Matemáticas · nivel 2: racha de 5 aciertos" },
  { numero: 8, emoji: "3️⃣", name: "Libro 8", unlockHint: "Matemáticas · nivel 3: racha de 5 aciertos" },
  { numero: 9, emoji: "4️⃣", name: "Libro 9", unlockHint: "Matemáticas · nivel 4: racha de 5 aciertos" },
  { numero: 10, emoji: "5️⃣", name: "Libro 10", unlockHint: "Matemáticas · nivel 5: racha de 5 aciertos" },
  { numero: 11, emoji: "👑", name: "Libro 11", unlockHint: "Matemáticas · supera el nivel 5 (llega al 6)" },
  { numero: 12, emoji: "✨", name: "Libro 12", unlockHint: "Matemáticas · supera el nivel 5 (llega al 6)" },
];

function buildPacks(): ColoringPack[] {
  return manifest.libros.map((libro) => {
    const meta = LIBRO_META.find((m) => m.numero === libro.numero)!;
    const slug = libro.slug;
    const images: ColoringImage[] = libro.files.map((file, idx) => ({
      id: `${slug}-p${String(idx + 1).padStart(2, "0")}`,
      label: `Página ${idx + 1}`,
      src: coloringAsset(`${slug}/${file}`),
    }));
    return {
      id: slug,
      name: meta.name,
      emoji: meta.emoji,
      images,
      previewIds: images.slice(0, 5).map((i) => i.id),
      unlockHint: meta.unlockHint,
    };
  });
}

export const COLORING_PACKS: ColoringPack[] = buildPacks();

export const ALL_IMAGE_IDS = COLORING_PACKS.flatMap((p) => p.images.map((i) => i.id));

export const STARTER_PACK_ID = "libro-01";
export const STARTER_IMAGE_IDS = COLORING_PACKS.find((p) => p.id === STARTER_PACK_ID)?.images.map((i) => i.id) ?? [];

/** Pack index → reading level id */
export const READING_PACK_BY_LEVEL: Record<string, string> = {
  letras: "libro-02",
  silabas: "libro-03",
  palabras: "libro-04",
  frases: "libro-05",
};

export const MATH_PACK_BY_LEVEL: Record<number, string> = {
  1: "libro-06",
  2: "libro-07",
  3: "libro-08",
  4: "libro-09",
  5: "libro-10",
};

export const SUPER_PACK_IDS = ["libro-11", "libro-12"] as const;

export function packForImage(imageId: string): ColoringPack | undefined {
  return COLORING_PACKS.find((p) => p.images.some((i) => i.id === imageId));
}

export function imageById(imageId: string): ColoringImage | undefined {
  for (const p of COLORING_PACKS) {
    const img = p.images.find((i) => i.id === imageId);
    if (img) return img;
  }
  return undefined;
}

export function packById(packId: string): ColoringPack | undefined {
  return COLORING_PACKS.find((p) => p.id === packId);
}

export function totalPages(): number {
  return COLORING_PACKS.reduce((n, p) => n + p.images.length, 0);
}