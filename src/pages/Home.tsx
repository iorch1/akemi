import { Link } from "react-router-dom";
import "./Home.css";

const sections = [
  {
    to: "/leer",
    title: "Aprender a leer",
    desc: "Letras, sílabas y palabras",
    emoji: "📖",
    className: "tile-leer",
  },
  {
    to: "/mates",
    title: "Matemáticas",
    desc: "Sumar, restar, multiplicar y dividir",
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
    desc: "Colorear y dibujar libre",
    emoji: "🎨",
    className: "tile-dibujo",
  },
];

export function Home() {
  return (
    <main className="screen home">
      <header className="home-hero">
        <div className="home-sun" aria-hidden />
        <div className="home-mascot" aria-hidden>
          <span className="mascot-face">🌞</span>
        </div>
        <h1 className="brand-mark home-brand">Akemi</h1>
        <p className="home-tagline">Aprende a leer, calcular y crear jugando</p>
        <p className="home-cta-hint">Elige una aventura</p>
      </header>

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
