import { Link } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import "./Juegos.css";

export function Juegos() {
  return (
    <main className="screen juegos">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Juegos clásicos</h1>
        <p className="section-sub">Elige un juego y diviértete</p>
        <div className="juegos-grid">
          <Link to="/juegos/tetris" className="juego-card juego-tetris">
            <span className="juego-icon" aria-hidden>
              ▣
            </span>
            <span className="juego-name">Tetris</span>
            <span className="juego-desc">Encaja las piezas</span>
          </Link>
          <Link to="/juegos/snake" className="juego-card juego-snake">
            <span className="juego-icon" aria-hidden>
              ∼
            </span>
            <span className="juego-name">Snake</span>
            <span className="juego-desc">Come y crece</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
