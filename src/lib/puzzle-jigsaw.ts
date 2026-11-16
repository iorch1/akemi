/**
 * Generación de siluetas jigsaw (pestañas / huecos) para el rompecabezas.
 *
 * Convención de bordes internos:
 * - hTabs[r][c]: borde entre fila r y r+1 → +1 = pestaña hacia abajo (pieza de arriba),
 *   -1 = hueco en la de arriba (pestaña hacia arriba en la de abajo).
 * - vTabs[r][c]: borde entre col c y c+1 → +1 = pestaña hacia la derecha (pieza izquierda),
 *   -1 = hueco a la derecha (pestaña hacia la izquierda en la de la derecha).
 *
 * En cada pieza, +1 = pestaña hacia fuera, -1 = hueco hacia dentro, 0 = borde recto (marco).
 */

export const JIGSAW_TAB_FRACTION = 0.22;

export type EdgeSign = -1 | 0 | 1;

export type PieceTabs = {
  top: EdgeSign;
  right: EdgeSign;
  bottom: EdgeSign;
  left: EdgeSign;
};

export type JigsawEdges = {
  rows: number;
  cols: number;
  /** hTabs[r][c] con r ∈ [0, rows-2], c ∈ [0, cols-1] */
  hTabs: EdgeSign[][];
  /** vTabs[r][c] con r ∈ [0, rows-1], c ∈ [0, cols-2] */
  vTabs: EdgeSign[][];
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash estable a partir de texto (p. ej. imageId + pieceCount). */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randSign(rand: () => number): EdgeSign {
  return rand() < 0.5 ? 1 : -1;
}

/** Orientaciones de pestaña/hueco para una rejilla. */
export function generateJigsawEdges(rows: number, cols: number, seed: number): JigsawEdges {
  const rand = mulberry32(seed);
  const hTabs: EdgeSign[][] = [];
  for (let r = 0; r < Math.max(0, rows - 1); r++) {
    const row: EdgeSign[] = [];
    for (let c = 0; c < cols; c++) row.push(randSign(rand));
    hTabs.push(row);
  }
  const vTabs: EdgeSign[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: EdgeSign[] = [];
    for (let c = 0; c < Math.max(0, cols - 1); c++) row.push(randSign(rand));
    vTabs.push(row);
  }
  return { rows, cols, hTabs, vTabs };
}

export function pieceTabsFor(row: number, col: number, edges: JigsawEdges): PieceTabs {
  const { rows, cols, hTabs, vTabs } = edges;
  return {
    top: row === 0 ? 0 : ((-hTabs[row - 1][col]) as EdgeSign),
    bottom: row === rows - 1 ? 0 : hTabs[row][col],
    left: col === 0 ? 0 : ((-vTabs[row][col - 1]) as EdgeSign),
    right: col === cols - 1 ? 0 : vTabs[row][col],
  };
}

export function tabSizeForCell(cellW: number, cellH: number, fraction = JIGSAW_TAB_FRACTION): number {
  return Math.min(cellW, cellH) * fraction;
}

/**
 * Añade el tramo de borde de A→B.
 * side: 0 plano; +1 pestaña a la izquierda del sentido de marcha (fuera en recorrido horario);
 * -1 hueco (hacia dentro).
 */
function appendEdge(
  d: string[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  side: EdgeSign,
  tabSize: number,
) {
  if (side === 0 || tabSize <= 0) {
    d.push(`L ${fx(bx)} ${fx(by)}`);
    return;
  }

  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Normal a la izquierda del sentido de marcha × side
  const nx = -uy * side;
  const ny = ux * side;

  const mid = 0.5;
  // Ancho de pestaña acotado al tamaño de la bombilla (no a toda la arista),
  // para que en celdas alargadas no queden olas anchas y planas.
  const half = Math.min(0.22, Math.max(0.1, (tabSize * 1.15) / len));
  const s0 = mid - half;
  const s1 = mid + half;

  const at = (t: number) => ({ x: ax + dx * t, y: ay + dy * t });
  const p0 = at(s0);
  const p1 = at(s1);
  const pm = at(mid);

  // Forma tipo “bombilla”: cuello estrecho + cabeza redonda (como la plantilla de referencia)
  const neck = tabSize * 0.35;
  const tip = tabSize;

  const n0 = { x: p0.x + nx * neck, y: p0.y + ny * neck };
  const n1 = { x: p1.x + nx * neck, y: p1.y + ny * neck };
  const tipPt = { x: pm.x + nx * tip, y: pm.y + ny * tip };

  // Controles laterales para la cabeza (perpendiculares al normal = a lo largo del borde)
  const along = tabSize * 0.55;
  const leftHead = {
    x: tipPt.x - ux * along + nx * (tabSize * 0.05),
    y: tipPt.y - uy * along + ny * (tabSize * 0.05),
  };
  const rightHead = {
    x: tipPt.x + ux * along + nx * (tabSize * 0.05),
    y: tipPt.y + uy * along + ny * (tabSize * 0.05),
  };

  d.push(`L ${fx(p0.x)} ${fx(p0.y)}`);
  // Entrada al cuello
  d.push(
    `C ${fx(p0.x + ux * tabSize * 0.08 + nx * tabSize * 0.05)} ${fx(p0.y + uy * tabSize * 0.08 + ny * tabSize * 0.05)} ${fx(n0.x - ux * tabSize * 0.05)} ${fx(n0.y - uy * tabSize * 0.05)} ${fx(n0.x)} ${fx(n0.y)}`,
  );
  // Cabeza (arco por el tip)
  d.push(
    `C ${fx(n0.x + nx * tabSize * 0.35)} ${fx(n0.y + ny * tabSize * 0.35)} ${fx(leftHead.x)} ${fx(leftHead.y)} ${fx(tipPt.x)} ${fx(tipPt.y)}`,
  );
  d.push(
    `C ${fx(rightHead.x)} ${fx(rightHead.y)} ${fx(n1.x + nx * tabSize * 0.35)} ${fx(n1.y + ny * tabSize * 0.35)} ${fx(n1.x)} ${fx(n1.y)}`,
  );
  // Salida del cuello
  d.push(
    `C ${fx(n1.x + ux * tabSize * 0.05)} ${fx(n1.y + uy * tabSize * 0.05)} ${fx(p1.x - ux * tabSize * 0.08 + nx * tabSize * 0.05)} ${fx(p1.y - uy * tabSize * 0.08 + ny * tabSize * 0.05)} ${fx(p1.x)} ${fx(p1.y)}`,
  );
  d.push(`L ${fx(bx)} ${fx(by)}`);
}

function fx(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Path SVG `d` de una pieza en coordenadas locales (origen = esquina TL del núcleo). */
export function piecePathD(
  cellW: number,
  cellH: number,
  tabs: PieceTabs,
  tabSize: number,
  offsetX = 0,
  offsetY = 0,
): string {
  const x0 = offsetX;
  const y0 = offsetY;
  const x1 = offsetX + cellW;
  const y1 = offsetY + cellH;
  const d: string[] = [`M ${fx(x0)} ${fx(y0)}`];
  // Horario: arriba → derecha → abajo → izquierda
  appendEdge(d, x0, y0, x1, y0, tabs.top, tabSize);
  appendEdge(d, x1, y0, x1, y1, tabs.right, tabSize);
  appendEdge(d, x1, y1, x0, y1, tabs.bottom, tabSize);
  appendEdge(d, x0, y1, x0, y0, tabs.left, tabSize);
  d.push("Z");
  return d.join(" ");
}

/** Path2D de canvas para clip/stroke. */
export function piecePath2D(
  cellW: number,
  cellH: number,
  tabs: PieceTabs,
  tabSize: number,
  offsetX = 0,
  offsetY = 0,
): Path2D {
  return new Path2D(piecePathD(cellW, cellH, tabs, tabSize, offsetX, offsetY));
}

export type JigsawSliceMeta = {
  seed: number;
  edges: JigsawEdges;
  tabSize: number;
  padPx: number;
  cellW: number;
  cellH: number;
};

export function jigsawMetaForGrid(
  rows: number,
  cols: number,
  boardW: number,
  boardH: number,
  seed: number,
): JigsawSliceMeta {
  const cellW = boardW / cols;
  const cellH = boardH / rows;
  const tabSize = tabSizeForCell(cellW, cellH);
  const padPx = Math.ceil(tabSize) + 2;
  return {
    seed,
    edges: generateJigsawEdges(rows, cols, seed),
    tabSize,
    padPx,
    cellW,
    cellH,
  };
}
