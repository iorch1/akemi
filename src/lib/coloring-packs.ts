/** Catálogo de packs B/N para colorear (diseños originales, estilo kawaii / idol guerrera). */

export type ColoringImage = {
  id: string;
  label: string;
  /** Ruta bajo public/ o URL con base de Vite */
  src: string;
};

export type ColoringPack = {
  id: string;
  name: string;
  emoji: string;
  images: ColoringImage[];
  /** Cómo se desbloquea (texto para la UI) */
  unlockHint: string;
};

const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");

export function coloringAsset(path: string): string {
  return `${base}coloring/${path}`;
}

export const COLORING_PACKS: ColoringPack[] = [
  {
    id: "pack-inicial",
    name: "Gatitas kawaii",
    emoji: "🐱",
    unlockHint: "Disponible desde el inicio",
    images: [
      { id: "ini-01", label: "Michi con lazo", src: coloringAsset("pack0-01.svg") },
      { id: "ini-02", label: "Gatita estrella", src: coloringAsset("pack0-02.svg") },
      { id: "ini-03", label: "Amiga bigotes", src: coloringAsset("pack0-03.svg") },
      { id: "ini-04", label: "Gatita corazón", src: coloringAsset("pack0-04.svg") },
      { id: "ini-05", label: "Michi bailarina", src: coloringAsset("pack0-05.svg") },
    ],
  },
  {
    id: "pack-letras",
    name: "Lazos y brillos",
    emoji: "🎀",
    unlockHint: "Aprender a leer · Letras: acierta 3 de 5 retos",
    images: [
      { id: "let-01", label: "Niña lazo A", src: coloringAsset("pack1-01.svg") },
      { id: "let-02", label: "Moño mágico", src: coloringAsset("pack1-02.svg") },
      { id: "let-03", label: "Princesa brillo", src: coloringAsset("pack1-03.svg") },
      { id: "let-04", label: "Lazo gigante", src: coloringAsset("pack1-04.svg") },
      { id: "let-05", label: "Gatita moño", src: coloringAsset("pack1-05.svg") },
    ],
  },
  {
    id: "pack-silabas",
    name: "Guerreras idol",
    emoji: "⚔️",
    unlockHint: "Aprender a leer · Sílabas: acierta 3 de 5 retos",
    images: [
      { id: "sil-01", label: "Idol espada luz", src: coloringAsset("pack2-01.svg") },
      { id: "sil-02", label: "Guerrera escudo", src: coloringAsset("pack2-02.svg") },
      { id: "sil-03", label: "Coreografía", src: coloringAsset("pack2-03.svg") },
      { id: "sil-04", label: "Capa estrella", src: coloringAsset("pack2-04.svg") },
      { id: "sil-05", label: "Dúo idol", src: coloringAsset("pack2-05.svg") },
    ],
  },
  {
    id: "pack-palabras",
    name: "Escenario de ensueño",
    emoji: "✨",
    unlockHint: "Aprender a leer · Palabras: acierta 3 de 5 retos",
    images: [
      { id: "pal-01", label: "Micro idol", src: coloringAsset("pack3-01.svg") },
      { id: "pal-02", label: "Luces escenario", src: coloringAsset("pack3-02.svg") },
      { id: "pal-03", label: "Foco brillante", src: coloringAsset("pack3-03.svg") },
      { id: "pal-04", label: "Bailarina luna", src: coloringAsset("pack3-04.svg") },
      { id: "pal-05", label: "Corona pop", src: coloringAsset("pack3-05.svg") },
    ],
  },
  {
    id: "pack-frases",
    name: "Amigas aventureras",
    emoji: "🌸",
    unlockHint: "Aprender a leer · Frases: acierta 3 de 5 retos",
    images: [
      { id: "fra-01", label: "Paseo parque", src: coloringAsset("pack4-01.svg") },
      { id: "fra-02", label: "Picnic kawaii", src: coloringAsset("pack4-02.svg") },
      { id: "fra-03", label: "Globos amigas", src: coloringAsset("pack4-03.svg") },
      { id: "fra-04", label: "Castillo nubes", src: coloringAsset("pack4-04.svg") },
      { id: "fra-05", label: "Equipo spark", src: coloringAsset("pack4-05.svg") },
    ],
  },
  {
    id: "pack-matematicas",
    name: "Números mágicos",
    emoji: "🔮",
    unlockHint: "Matemáticas: 5 aciertos seguidos por nivel (del 1 al 5)",
    images: [
      { id: "mat-01", label: "Gato uno", src: coloringAsset("pack5-01.svg") },
      { id: "mat-02", label: "Dúo dos", src: coloringAsset("pack5-02.svg") },
      { id: "mat-03", label: "Tres estrellas", src: coloringAsset("pack5-03.svg") },
      { id: "mat-04", label: "Cuatro flores", src: coloringAsset("pack5-04.svg") },
      { id: "mat-05", label: "Cinco arcoíris", src: coloringAsset("pack5-05.svg") },
    ],
  },
  {
    id: "pack-super",
    name: "Super guerreras Akemi",
    emoji: "👑",
    unlockHint: "Matemáticas: supera el nivel 5 (llega al nivel 6)",
    images: [
      { id: "sup-01", label: "Akemi corona", src: coloringAsset("pack6-01.svg") },
      { id: "sup-02", label: "Equipo dorado", src: coloringAsset("pack6-02.svg") },
      { id: "sup-03", label: "Torre luz", src: coloringAsset("pack6-03.svg") },
      { id: "sup-04", label: "Fénix cute", src: coloringAsset("pack6-04.svg") },
      { id: "sup-05", label: "Final sparkle", src: coloringAsset("pack6-05.svg") },
    ],
  },
];

export const ALL_IMAGE_IDS = COLORING_PACKS.flatMap((p) => p.images.map((i) => i.id));

export const STARTER_IMAGE_IDS = COLORING_PACKS[0].images.map((i) => i.id);

/** Pack index → reading level id */
export const READING_PACK_BY_LEVEL: Record<string, string> = {
  letras: "pack-letras",
  silabas: "pack-silabas",
  palabras: "pack-palabras",
  frases: "pack-frases",
};

export const MATH_IMAGE_BY_LEVEL: Record<number, string> = {
  1: "mat-01",
  2: "mat-02",
  3: "mat-03",
  4: "mat-04",
  5: "mat-05",
};

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