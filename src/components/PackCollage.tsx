import { COLORING_PACKS } from "../lib/coloring-packs";
import { isPackFullyUnlocked, type ProgressState } from "../lib/progress";
import "./PackCollage.css";

type Props = {
  progress: ProgressState;
  compact?: boolean;
};

export function PackCollage({ progress, compact }: Props) {
  return (
    <ul className={`pack-grid ${compact ? "pack-grid-compact" : ""}`} aria-label="Packs de colorear">
      {COLORING_PACKS.map((pack) => {
        const unlocked = isPackFullyUnlocked(progress, pack.id);
        const partial = pack.images.filter((i) => progress.unlockedImages.includes(i.id)).length;
        return (
          <li key={pack.id} className={`pack-card ${unlocked ? "unlocked" : "locked"}`}>
            <PackCardHead className="pack-card-head" unlocked={unlocked} emoji={pack.emoji} name={pack.name} />
            <div className="pack-thumbs" aria-hidden={unlocked ? undefined : true}>
              {pack.images.map((img) => {
                const open = progress.unlockedImages.includes(img.id);
                return (
                  <div
                    key={img.id}
                    className={`pack-thumb ${open ? "open" : "shut"}`}
                    style={
                      open
                        ? {
                            backgroundImage: `url(${img.src})`,
                          }
                        : undefined
                    }
                    title={img.label}
                  />
                );
              })}
            </div>
            <p className="pack-meta">
              {unlocked ? (
                "¡Pack completo!"
              ) : (
                <>
                  <span className="pack-lock" aria-hidden>
                    🔒
                  </span>{" "}
                  {partial > 0 ? `${partial}/5 dibujos` : pack.unlockHint}
                </>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function PackCardHead({
  className,
  unlocked,
  emoji,
  name,
}: {
  className: string;
  unlocked: boolean;
  emoji: string;
  name: string;
}) {
  return (
    <div className={className}>
      <span className="pack-emoji">{emoji}</span>
      <span className="pack-name">{name}</span>
      {!unlocked && (
        <span className="pack-badge locked-badge" title="Bloqueado">
          Bloqueado
        </span>
      )}
    </div>
  );
}