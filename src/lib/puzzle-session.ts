import type { ColoringImage } from "./coloring-packs";
import type { PuzzlePieceCount } from "./puzzle-grid";

export type PuzzleTile = {
  id: number;
  row: number;
  col: number;
  dataUrl: string;
};

export type PuzzleSession = {
  pieceCount: PuzzlePieceCount;
  image: ColoringImage;
  tiles: PuzzleTile[];
  tray: number[];
  board: (number | null)[];
  winRecorded: boolean;
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
