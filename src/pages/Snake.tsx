import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";

const SIZE = 16;
const CELL = 20;

type Dir = { x: number; y: number };
type Point = { x: number; y: number };

function randFood(snake: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Point[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const dirRef = useRef<Dir>({ x: 1, y: 0 });
  const nextDirRef = useRef<Dir>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 12, y: 8 });
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const pausedRef = useRef(false);
  const overRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    overRef.current = gameOver;
  }, [gameOver]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0b3a4a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const food = foodRef.current;
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2.4, 0, Math.PI * 2);
    ctx.fill();

    snakeRef.current.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#ffd166" : "#2ec4b6";
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });

    if (pausedRef.current || overRef.current) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 22px Baloo 2, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(overRef.current ? "Fin del juego" : "Pausa", canvas.width / 2, canvas.height / 2);
    }
  }, []);

  const setDir = useCallback((d: Dir) => {
    const cur = dirRef.current;
    if (cur.x + d.x === 0 && cur.y + d.y === 0) return;
    nextDirRef.current = d;
  }, []);

  const restart = useCallback(() => {
    snakeRef.current = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = { x: 12, y: 8 };
    setScore(0);
    setGameOver(false);
    setPaused(false);
    draw();
  }, [draw]);

  useEffect(() => {
    draw();
    const id = window.setInterval(() => {
      if (pausedRef.current || overRef.current) return;
      dirRef.current = nextDirRef.current;
      const snake = snakeRef.current;
      const dir = dirRef.current;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || snake.some((s) => s.x === head.x && s.y === head.y)) {
        setGameOver(true);
        draw();
        return;
      }
      const next = [head, ...snake];
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        foodRef.current = randFood(next);
        setScore((s) => s + 10);
      } else {
        next.pop();
      }
      snakeRef.current = next;
      draw();
    }, 140);
    return () => clearInterval(id);
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setDir({ x: 0, y: -1 });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setDir({ x: 0, y: 1 });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setDir({ x: -1, y: 0 });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setDir({ x: 1, y: 0 });
      } else if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDir]);

  useEffect(() => {
    draw();
  }, [paused, gameOver, draw]);

  return (
    <main className="screen">
      <div className="back-row">
        <BackButton to="/juegos" />
      </div>
      <div className="panel game-wrap">
        <h1 className="section-title">Snake</h1>
        <p className="section-sub">Flechas o botones · P pausa</p>
        <div className="score-bar">
          <span>Puntos: {score}</span>
        </div>
        <canvas ref={canvasRef} className="game-canvas" width={SIZE * CELL} height={SIZE * CELL} />
        <div className="score-bar">
          <button type="button" className="btn btn-sky" onClick={() => setPaused((p) => !p)}>
            {paused ? "Seguir" : "Pausa"}
          </button>
          <button type="button" className="btn btn-leaf" onClick={restart}>
            Reiniciar
          </button>
        </div>
        <div className="dpad">
          <button type="button" className="up" onClick={() => setDir({ x: 0, y: -1 })} aria-label="Arriba">
            ↑
          </button>
          <button type="button" className="left" onClick={() => setDir({ x: -1, y: 0 })} aria-label="Izquierda">
            ←
          </button>
          <button type="button" className="right" onClick={() => setDir({ x: 1, y: 0 })} aria-label="Derecha">
            →
          </button>
          <button type="button" className="down" onClick={() => setDir({ x: 0, y: 1 })} aria-label="Abajo">
            ↓
          </button>
        </div>
      </div>
    </main>
  );
}
