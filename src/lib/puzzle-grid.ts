/**
 * Mapeo de número de piezas → filas × columnas.
 *
 * Piezas pedidas por UI → rejilla usada (filas × cols = piezas):
 *   5  → 1×5
 *  10  → 2×5
 *  20  → 4×5
 *  50  → 5×10
 *  70  → 7×10
 *  90  → 9×10
 * 100  → 10×10
 */
export const PUZZLE_PIECE_COUNTS = [5, 10, 20, 50, 70, 90, 100] as const;

export type PuzzlePieceCount = (typeof PUZZLE_PIECE_COUNTS)[number];

export type PuzzleGrid = {
  rows: number;
  cols: number;
  pieces: number;
};

const GRID_BY_COUNT: Record<PuzzlePieceCount, PuzzleGrid> = {
  5: { rows: 1, cols: 5, pieces: 5 },
  10: { rows: 2, cols: 5, pieces: 10 },
  20: { rows: 4, cols: 5, pieces: 20 },
  50: { rows: 5, cols: 10, pieces: 50 },
  70: { rows: 7, cols: 10, pieces: 70 },
  90: { rows: 9, cols: 10, pieces: 90 },
  100: { rows: 10, cols: 10, pieces: 100 },
};

export function gridForPieceCount(count: number): PuzzleGrid {
  if (count in GRID_BY_COUNT) {
    return GRID_BY_COUNT[count as PuzzlePieceCount];
  }
  // Fallback: factorización cercana a cuadrado
  let bestRows = 1;
  let bestCols = count;
  let bestScore = Infinity;
  for (let rows = 1; rows <= count; rows++) {
    if (count % rows !== 0) continue;
    const cols = count / rows;
    const score = Math.abs(rows - cols) + Math.abs(rows * cols - count) * 10;
    if (score < bestScore) {
      bestScore = score;
      bestRows = rows;
      bestCols = cols;
    }
  }
  return { rows: bestRows, cols: bestCols, pieces: bestRows * bestCols };
}

export function isPuzzlePieceCount(n: number): n is PuzzlePieceCount {
  return (PUZZLE_PIECE_COUNTS as readonly number[]).includes(n);
}

/** Índice lineal de la celda (fila mayor, columna). */
export function cellIndex(row: number, col: number, cols: number) {
  return row * cols + col;
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
