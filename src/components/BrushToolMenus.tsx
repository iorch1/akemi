import { useEffect, useRef, useState } from "react";
import { BRUSH_BY_KIND, type BrushKind, type BrushPreset } from "../lib/drawing-tools";
import "../pages/Dibujo.css";

const FAMILY_LABEL: Record<BrushKind, { title: string; icon: string }> = {
  lapiz: { title: "Lápiz", icon: "✏️" },
  plumon: { title: "Plumón", icon: "🖍️" },
  brocha: { title: "Brocha", icon: "🖌️" },
};

type Props = {
  active: BrushPreset;
  onPick: (preset: BrushPreset) => void;
};

export function BrushToolMenus({ active, onPick }: Props) {
  const [openKind, setOpenKind] = useState<BrushKind | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rowRef.current?.contains(e.target as Node)) setOpenKind(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="tool-family-row" ref={rowRef}>
      {(Object.keys(BRUSH_BY_KIND) as BrushKind[]).map((kind) => {
        const meta = FAMILY_LABEL[kind];
        const presets = BRUSH_BY_KIND[kind];
        const isActiveFamily = active.kind === kind;
        return (
          <div key={kind} className="tool-family">
            <button
              type="button"
              className={`tool-family-btn ${isActiveFamily ? "active" : ""}`}
              aria-expanded={openKind === kind}
              onClick={() => setOpenKind((k) => (k === kind ? null : kind))}
            >
              <span aria-hidden>{meta.icon}</span>
              {meta.title}
              <span className="tool-family-caret" aria-hidden>
                ▾
              </span>
            </button>
            {openKind === kind && (
              <div className="tool-family-menu" role="menu">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    className={active.id === p.id ? "active" : ""}
                    onClick={() => {
                      onPick(p);
                      setOpenKind(null);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}