import { useState } from "react";
import { hsvToHex, PRESET_COLORS } from "../lib/drawing-tools";
import "../pages/Dibujo.css";

type Props = {
  color: string;
  onColor: (hex: string) => void;
  onPick?: () => void;
  compact?: boolean;
};

export function ColorPalette({ color, onColor, onPick, compact }: Props) {
  const [hue, setHue] = useState(12);
  const [sat, setSat] = useState(0.85);
  const [showMixer, setShowMixer] = useState(false);

  function applyMixer() {
    onColor(hsvToHex(hue, sat, 1));
    onPick?.();
  }

  return (
    <div className={`dibujo-colors ${compact ? "dibujo-colors-compact" : ""}`}>
      <div className={`color-row ${compact ? "color-row-side" : ""}`} role="listbox" aria-label="Colores">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${color === c ? "active" : ""}`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            onClick={() => {
              onColor(c);
              onPick?.();
            }}
          />
        ))}
        <button
          type="button"
          className={`swatch swatch-mixer ${showMixer ? "active" : ""}`}
          aria-label="Mezclador de color"
          onClick={() => setShowMixer((v) => !v)}
        >
          🎨
        </button>
      </div>
      {showMixer && (
        <div className={`color-mixer panel-soft ${compact ? "color-mixer-compact" : ""}`}>
          <p className="color-mixer-title">Mezcla tu color</p>
          <label className="mixer-slider">
            Tono
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
            />
          </label>
          <label className="mixer-slider">
            Intensidad
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(sat * 100)}
              onChange={(e) => setSat(Number(e.target.value) / 100)}
            />
          </label>
          <div className="mixer-preview-row">
            <span
              className="mixer-preview"
              style={{ background: hsvToHex(hue, sat, 1) }}
              aria-hidden
            />
            <button type="button" className="btn btn-sky" onClick={applyMixer}>
              Usar color
            </button>
          </div>
        </div>
      )}
    </div>
  );
}