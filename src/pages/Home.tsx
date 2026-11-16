import { Link } from "react-router-dom";
import { PackCollage } from "../components/PackCollage";
import { useProgress } from "../hooks/useProgress";
import { countUnlockedImages, nextUnlockSummary, totalImages } from "../lib/progress";
import "./Home.css";

const sections = [
  {
    to: "/leer",
    title: "Aprender a leer",
    desc: "Retos y packs de dibujo",
    emoji: "📖",
    className: "tile-leer",
  },
  {
    to: "/mates",
    title: "Matemáticas",
    desc: "Racha de 5 · desbloquea arte",
    emoji: "🔢",
    className: "tile-mates",
  },
  {
    to: "/juegos",
    title: "Juegos clásicos",
    desc: "Tetris y Snake",
    emoji: "🎮",
    className: "tile-juegos",
  },
  {
    to: "/dibujo",
    title: "Dibujo",
    desc: "Plantillas desbloqueadas",
    emoji: "🎨",
    className: "tile-dibujo",
  },
];

export function Home() {
  const [progress] = useProgress();
  const next = nextUnlockSummary(progress);
  const unlocked = countUnlockedImages(progress);
  const total = totalImages();

  return (
    <main className="screen home">
      <header className="home-hero">
        <div className="home-sun" aria-hidden />
        <div className="home-mascot" aria-hidden>
          <span className="mascot-face">🌞</span>
        </div>
        <h1 className="brand-mark home-brand">Akemi</h1>
        <p className="home-tagline">Aprende, calcula y colorea tus guerreras kawaii</p>
        <p className="home-cta-hint">Elige una aventura</p>
      </header>

      <section className="home-progress panel-soft" aria-labelledby="progreso-titulo">
        <h2 id="progreso-titulo" className="home-progress-title">
          Tu colección
        </h2>
        <p className="home-progress-count">
          Dibujos desbloqueados: <strong>{unlocked}</strong> / {total}
        </p>
        <div className="home-next-unlock">
          <p className="home-next-label">{next.title}</p>
          <p className="home-next-detail">{next.detail}</p>
          <ProgressBar progress={next.progress} target={next.target} />
        </div>
        <PackCollage progress={progress} compact />
      </section>

      <nav className="home-grid" aria-label="Secciones">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className={`home-tile ${s.className}`}>
            <span className="tile-emoji" aria-hidden>
              {s.emoji}
            </span>
            <span className="tile-title">{s.title}</span>
            <span className="tile-desc">{s.desc}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}

function ProgressBar({ progress, target }: { progress: number; target: number }) {
  const pct = target > 0 ? Math.round((progress / target) * 100) : 0;
  return (
    <div
      className="home-progress-bar"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-label={`Progreso ${progress} de ${target}`}
    >
      <div className="home-progress-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      <span className="home-progress-text">
        {progress} / {target}
      </span>
    </div>
  );
}