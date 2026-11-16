import type { ColoringImage } from "./coloring-packs";
import type { PuzzlePieceCount } from "./puzzle-grid";
import type { JigsawEdges } from "./puzzle-jigsaw";

export type PuzzleTile = {
  id: number;
  row: number;
  col: number;
  dataUrl: string;
  /** Padding en el bitmap (pestañas); el núcleo de la celda empieza en (padPx, padPx). */
  padPx: number;
  coreW: number;
  coreH: number;
  /** Path SVG `d` del núcleo (sin offset de pad), para siluetas vacías. */
  pathD: string;
};

export type PuzzleJigsawInfo = {
  seed: number;
  edges: JigsawEdges;
  tabSize: number;
  padPx: number;
  cellW: number;
  cellH: number;
};

export type PuzzleSession = {
  pieceCount: PuzzlePieceCount;
  image: ColoringImage;
  tiles: PuzzleTile[];
  tray: number[];
  board: (number | null)[];
  winRecorded: boolean;
  jigsaw: PuzzleJigsawInfo;
};

let session: PuzzleSession | null = null;

export function getPuzzleSession(): PuzzleSession | null {
  return session;
}

export function setPuzzleSession(next: PuzzleSession | null) {
  session = next;
}

export function patchPuzzleSession(partial: Partial<PuzzleSession>) {
  if (!session) return null;
  session = { ...session, ...partial };
  return session;
}
