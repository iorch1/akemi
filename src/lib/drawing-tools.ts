export const PRESET_COLORS = [
  "#0b3a4a",
  "#ff6b6b",
  "#ff9f1c",
  "#ffd166",
  "#2ec4b6",
  "#1a9bb5",
  "#7bdff2",
  "#ffffff",
  "#c0392b",
  "#27ae60",
  "#9b59b6",
  "#e91e63",
  "#795548",
  "#607d8b",
  "#f1c40f",
  "#1abc9c",
  "#3498db",
  "#000000",
];

export type BrushKind = "lapiz" | "plumon" | "brocha";

export type BrushPreset = {
  id: string;
  kind: BrushKind;
  label: string;
  size: number;
  opacity: number;
  lineDash?: number[];
};

export const BRUSH_PRESETS: BrushPreset[] = [
  { id: "lapiz-fino", kind: "lapiz", label: "Lápiz fino", size: 3, opacity: 1 },
  { id: "lapiz-medio", kind: "lapiz", label: "Lápiz", size: 6, opacity: 1 },
  { id: "lapiz-grueso", kind: "lapiz", label: "Lápiz grueso", size: 10, opacity: 1 },
  { id: "plumon-fino", kind: "plumon", label: "Plumón fino", size: 8, opacity: 0.85 },
  { id: "plumon", kind: "plumon", label: "Plumón", size: 16, opacity: 0.9 },
  { id: "plumon-grande", kind: "plumon", label: "Plumón XL", size: 28, opacity: 0.92 },
  { id: "brocha-suave", kind: "brocha", label: "Brocha suave", size: 14, opacity: 0.55 },
  { id: "brocha", kind: "brocha", label: "Brocha", size: 24, opacity: 0.45 },
  { id: "brocha-ancha", kind: "brocha", label: "Brocha ancha", size: 38, opacity: 0.4 },
];

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to255 = (n: number) => Math.round((n + m) * 255);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(to255(r))}${hex(to255(g))}${hex(to255(b))}`;
}