import { Link } from "react-router-dom";
import { PackCollage } from "../components/PackCollage";
import { useProfileContext } from "../context/ProfileContext";
import { useProgress } from "../hooks/useProgress";
import { difficultyForAge, difficultyLabel } from "../lib/difficulty";
import { avatarEmoji } from "../lib/profiles";
import { ANDROID_APK_LABEL, androidApkDownloadUrl } from "../lib/android-download";
import { isNativeApp } from "../lib/platform";
import { countUnlockedImages, nextUnlockSummary, totalImages } from "../lib/progress";
import "./Home.css";

const sections = [
  {
    to: "/leer",
    title: "Leer",
    desc: "Letras, sílabas y palabras",
    emoji: "📖",
    className: "tile-leer",
  },
  {
    to: "/mates",
    title: "Matemáticas",
    desc: "Sumas y retos con racha",
    emoji: "🔢",
    className: "tile-mates",
  },
  {
    to: "/juegos",
    title: "Juegos",
    desc: "Tetris y Snake",
    emoji: "🎮",
    className: "tile-juegos",
  },
  {
    to: "/dibujo",
    title: "Dibujo",
    desc: "Colorea y lienzo libre",
    emoji: "🎨",
    className: "tile-dibujo",
  },
  {
    to: "/rompecabezas",
    title: "Rompecabezas",
    desc: "Arma y pinta la imagen",
    emoji: "🖼️",
    className: "tile-rompecabezas",
  },
  {
    to: "/crear",
    title: "Crear",
    desc: "Bloques y Hora del Código",
    emoji: "🧩",
    className: "tile-crear",
  },
];

export function Home() {
  const native = isNativeApp();
  const { profile } = useProfileContext();
  const [progress] = useProgress();
  const next = nextUnlockSummary(progress);
  const unlocked = countUnlockedImages(progress);
  const total = totalImages();
  const diff = profile ? difficultyLabel(difficultyForAge(profile.edad)) : "";

  return (
    <main className="screen home">
      {profile && (
        <div className={`home-profile-bar panel-soft${native ? " home-profile-bar--native" : ""}`}>
          {!native && (
            <>
              <span className="home-profile-avatar">{avatarEmoji(profile.avatar)}</span>
              <span>
                Hola, <strong>{profile.nombre}</strong> · {profile.edad} años · {diff}
              </span>
              <Link to="/perfiles" className="home-profile-switch">
                Cambiar jugador
              </Link>
            </>
          )}
          {native && (
            <span>
              {diff ? (
                <>
                  Nivel <strong>{diff}</strong> · {profile.edad} años
                </>
              ) : (
                <>Perfil de {profile.nombre}</>
              )}
            </span>
          )}
        </div>
      )}
      <header className={`home-hero${native ? " home-hero--native" : ""}`}>
        <div className="home-sun" aria-hidden />
        <div className="home-mascot" aria-hidden>
          <span className="mascot-face">🌞</span>
        </div>
        <h1 className="brand-mark home-brand">Akemi</h1>
        <p className="home-tagline">Aprende, calcula y colorea los libros Robcrea</p>
        {!native && <p className="home-cta-hint">Elige una aventura</p>}
        {!native && (
          <>
            <a
              className="home-android-download btn btn-sky"
              href={androidApkDownloadUrl()}
              download="akemi-android.apk"
            >
              📱 {ANDROID_APK_LABEL}
            </a>
            <p className="home-android-hint">
              Instala en el teléfono (Android). Si pide permiso, permite orígenes desconocidos.
            </p>
          </>
        )}
      </header>

      <nav
        className={`home-grid home-grid-primary${native ? " home-grid--native-hidden" : ""}`}
        aria-label="Secciones principales"
      >
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

      <section className="home-progress panel-soft home-collection" aria-labelledby="progreso-titulo">
        <h2 id="progreso-titulo" className="home-progress-title">
          Tu colección
        </h2>
        <p className="home-progress-count">
          Páginas desbloqueadas: <strong>{unlocked}</strong> / {total}
        </p>
        <div className="home-next-unlock">
          <p className="home-next-label">{next.title}</p>
          <p className="home-next-detail">{next.detail}</p>
          <ProgressBar progress={next.progress} target={next.target} />
        </div>
        <PackCollage progress={progress} compact />
      </section>
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