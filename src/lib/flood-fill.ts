/** Flood fill para plantillas de colorear (líneas oscuras = bordes). */

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Rellena una región contigua desde (x, y).
 * Omite tinta oscura (líneas del dibujo) y tolera diferencias de color.
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillHex: string,
  tolerance = 40,
) {
  const { width, height } = ctx.canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;
  const i0 = (sy * width + sx) * 4;
  const tr = data[i0];
  const tg = data[i0 + 1];
  const tb = data[i0 + 2];
  const ta = data[i0 + 3];
  const fill = hexToRgb(fillHex);
  if (tr === fill.r && tg === fill.g && tb === fill.b && ta === 255) return;

  const match = (i: number) =>
    Math.abs(data[i] - tr) < tolerance &&
    Math.abs(data[i + 1] - tg) < tolerance &&
    Math.abs(data[i + 2] - tb) < tolerance &&
    Math.abs(data[i + 3] - ta) < tolerance;

  // Líneas negras / tinta del modelo: no rellenar
  if (tr < 60 && tg < 60 && tb < 80) return;

  const stack: number[] = [sx, sy];
  const seen = new Uint8Array(width * height);
  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const idx = cy * width + cx;
    if (seen[idx]) continue;
    seen[idx] = 1;
    const i = idx * 4;
    if (!match(i)) continue;
    data[i] = fill.r;
    data[i + 1] = fill.g;
    data[i + 2] = fill.b;
    data[i + 3] = 255;
    if (cx > 0) stack.push(cx - 1, cy);
    if (cx < width - 1) stack.push(cx + 1, cy);
    if (cy > 0) stack.push(cx, cy - 1);
    if (cy < height - 1) stack.push(cx, cy + 1);
  }
  ctx.putImageData(img, 0, 0);
}
