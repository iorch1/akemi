import { useState } from "react";
import { hsvToHex, PRESET_COLORS } from "../lib/drawing-tools";
import "../pages/Dibujo.css";

type SwatchesProps = {
  color: string;
  onColor: (hex: string) => void;
  onPick?: () => void;
  compact?: boolean;
  showMixer: boolean;
  onToggleMixer: () => void;
};

export function ColorSwatches({
  color,
  onColor,
  onPick,
  compact,
  showMixer,
  onToggleMixer,
}: SwatchesProps) {
  return (
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
        aria-expanded={showMixer}
        onClick={onToggleMixer}
      >
        🎨
      </button>
    </div>
  );
}

type MixerProps = {
  hue: number;
  sat: number;
  onHue: (h: number) => void;
  onSat: (s: number) => void;
  onApply: () => void;
  compact?: boolean;
  layout?: "stack" | "bar";
};

export function ColorMixer({
  hue,
  sat,
  onHue,
  onSat,
  onApply,
  compact,
  layout = "stack",
}: MixerProps) {
  return (
    <div
      className={`color-mixer panel-soft ${compact ? "color-mixer-compact" : ""} ${
        layout === "bar" ? "color-mixer-bar" : ""
      }`}
    >
      <p className="color-mixer-title">Mezcla tu color</p>
      <section className="color-mixer-controls">
        <label className="mixer-slider">
          Tono
          <input type="range" min={0} max={360} value={hue} onChange={(e) => onHue(Number(e.target.value))} />
        </label>
        <label className="mixer-slider">
          Intensidad
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(sat * 100)}
            onChange={(e) => onSat(Number(e.target.value) / 100)}
          />
        </label>
        <div className="mixer-preview-row">
          <span className="mixer-preview" style={{ background: hsvToHex(hue, sat, 1) }} aria-hidden />
          <button type="button" className="btn btn-sky" onClick={onApply}>
            Usar color
          </button>
        </div>
      </section>
    </div>
  );
}

type Props = {
  color: string;
  onColor: (hex: string) => void;
  onPick?: () => void;
  compact?: boolean;
};

/** Uso simple: paleta con mezclador debajo (p. ej. si se reutiliza fuera de Dibujo). */
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
      <ColorSwatches
        color={color}
        onColor={onColor}
        onPick={onPick}
        compact={compact}
        showMixer={showMixer}
        onToggleMixer={() => setShowMixer((v) => !v)}
      />
      {showMixer && (
        <ColorMixer
          hue={hue}
          sat={sat}
          onHue={setHue}
          onSat={setSat}
          onApply={applyMixer}
          compact={compact}
        />
      )}
    </div>
  );
}

export function useColorMixerState(initialHue = 12, initialSat = 0.85) {
  const [hue, setHue] = useState(initialHue);
  const [sat, setSat] = useState(initialSat);
  const [showMixer, setShowMixer] = useState(false);
  return { hue, setHue, sat, setSat, showMixer, setShowMixer };
}