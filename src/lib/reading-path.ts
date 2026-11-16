import type { ProgressState } from "./progress";

export type ReadingSectionId =
  | "letras"
  | "silabas"
  | "palabras"
  | "frases"
  | "aprende"
  | "lectura";

export const SECTION_LABELS: Record<ReadingSectionId, string> = {
  letras: "Letras",
  silabas: "Sílabas",
  palabras: "Palabras",
  frases: "Frases",
  aprende: "Aprende a leer",
  lectura: "Lectura",
};

const POINTS_PER_SECTION = 5;
const SECTIONS_PER_LEVEL = 4;

/** Libros 2–5: un libro al completar cada uno de los primeros 4 niveles de camino. */
export const READING_BOOK_BY_PATH_LEVEL: Record<number, string> = {
  1: "libro-02",
  2: "libro-03",
  3: "libro-04",
  4: "libro-05",
};

export function pointsPerSection(): number {
  return POINTS_PER_SECTION;
}

export function readingTier(levelsCompleted: number): 1 | 2 | 3 {
  if (levelsCompleted < 5) return 1;
  if (levelsCompleted < 15) return 2;
  return 3;
}

export function sectionsForTier(tier: 1 | 2 | 3): ReadingSectionId[] {
  if (tier === 1) return ["letras", "silabas", "palabras", "frases"];
  if (tier === 2) return ["silabas", "palabras", "frases", "aprende"];
  return ["palabras", "frases", "aprende", "lectura"];
}

export function sectionsForState(state: ProgressState): ReadingSectionId[] {
  return sectionsForTier(readingTier(state.readingPath.levelsCompleted));
}

export function sectionPoints(state: ProgressState, section: ReadingSectionId): number {
  const pts = state.readingPath.sectionPoints[section] ?? 0;
  return Math.min(POINTS_PER_SECTION, Math.max(0, pts));
}

export function totalPointsInLevel(state: ProgressState): number {
  const sections = sectionsForState(state);
  return sections.reduce((sum, s) => sum + sectionPoints(state, s), 0);
}

export function maxPointsInLevel(): number {
  return POINTS_PER_SECTION * SECTIONS_PER_LEVEL;
}

export function currentSection(state: ProgressState): ReadingSectionId {
  const sections = sectionsForState(state);
  const open = sections.find((s) => sectionPoints(state, s) < POINTS_PER_SECTION);
  return open ?? sections[sections.length - 1];
}

export function nextSectionAfter(
  state: ProgressState,
  section: ReadingSectionId,
): ReadingSectionId | null {
  const sections = sectionsForState(state);
  const i = sections.indexOf(section);
  if (i < 0 || i >= sections.length - 1) return null;
  return sections[i + 1];
}

export function isSectionComplete(state: ProgressState, section: ReadingSectionId): boolean {
  return sectionPoints(state, section) >= POINTS_PER_SECTION;
}

export function isLevelComplete(state: ProgressState): boolean {
  const sections = sectionsForState(state);
  return sections.every((s) => isSectionComplete(state, s));
}

export function challengeSlot(state: ProgressState, section: ReadingSectionId): number {
  const base = sectionPoints(state, section);
  const lvl = state.readingPath.pathLevel;
  return (base + (lvl - 1) * 2) % POINTS_PER_SECTION;
}