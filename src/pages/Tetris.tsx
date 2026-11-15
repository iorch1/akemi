import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";

const COLS = 10;
const ROWS = 20;
const BLOCK = 18;

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];

const COLORS = ["#7bdff2", "#ffd166", "#2ec4b6", "#ff6b6b", "#ff9f1c", "#9b5de5", "#00bbf9"];

type Piece = { shape: number[][]; x: number; y: number; color: string };

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

function rotate(shape: number[][]) {
  const h = shape.length;
  const w = shape[0].length;
  const next = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      next[x][h - 1 - y] = shape[y][x];
    }
  }
  return next;
}

function randomPiece(): Piece {
  const i = Math.floor(Math.random() * SHAPES.length);
  const shape = SHAPES[i].map((r) => [...r]);
  return {
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
    color: COLORS[i],
  };
}

function collides(board: string[][], piece: Piece, dx = 0, dy = 0, shape = piece.shape) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nx = piece.x + x + dx;
      const ny = piece.y + y + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef(emptyBoard());
  const pieceRef = useRef(randomPiece());
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
    const board = boardRef.current;
    const piece = pieceRef.current;

    ctx.fillStyle = "#0b3a4a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) {
          ctx.fillStyle = board[y][x];
          ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
        }
      }
    }

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue;
        ctx.fillStyle = piece.color;
        ctx.fillRect((piece.x + x) * BLOCK + 1, (piece.y + y) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
      }
    }

    if (pausedRef.current || overRef.current) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 22px Baloo 2, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(overRef.current ? "Fin del juego" : "Pausa", canvas.width / 2, canvas.height / 2);
    }
  }, []);

  const lockPiece = useCallback(() => {
    const board = boardRef.current;
    const piece = pieceRef.current;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue;
        const by = piece.y + y;
        const bx = piece.x + x;
        if (by < 0) {
          setGameOver(true);
          return;
        }
        board[by][bx] = piece.color;
      }
    }
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every((c) => c)) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(""));
        cleared++;
        y++;
      }
    }
    if (cleared) setScore((s) => s + cleared * 100);
    pieceRef.current = randomPiece();
    if (collides(board, pieceRef.current)) setGameOver(true);
  }, []);

  const move = useCallback(
    (dx: number, dy: number) => {
      if (pausedRef.current || overRef.current) return;
      const piece = pieceRef.current;
      if (!collides(boardRef.current, piece, dx, dy)) {
        piece.x += dx;
        piece.y += dy;
        draw();
        return true;
      }
      if (dy > 0) {
        lockPiece();
        draw();
      }
      return false;
    },
    [draw, lockPiece],
  );

  const hardDrop = useCallback(() => {
    if (pausedRef.current || overRef.current) return;
    while (move(0, 1)) {
      /* drop */
    }
  }, [move]);

  const rotatePiece = useCallback(() => {
    if (pausedRef.current || overRef.current) return;
    const piece = pieceRef.current;
    const next = rotate(piece.shape);
    if (!collides(boardRef.current, piece, 0, 0, next)) {
      piece.shape = next;
      draw();
    }
  }, [draw]);

  const restart = useCallback(() => {
    boardRef.current = emptyBoard();
    pieceRef.current = randomPiece();
    setScore(0);
    setGameOver(false);
    setPaused(false);
    draw();
  }, [draw]);

  useEffect(() => {
    draw();
    const id = window.setInterval(() => {
      if (!pausedRef.current && !overRef.current) move(0, 1);
    }, 550);
    return () => clearInterval(id);
  }, [draw, move]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1, 0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        move(0, 1);
      } else if (e.key === "ArrowUp" || e.key === " ") {
        e.preventDefault();
        rotatePiece();
      } else if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, rotatePiece]);

  useEffect(() => {
    draw();
  }, [paused, gameOver, draw]);

  return (
    <main className="screen">
      <div className="back-row">
        <BackButton to="/juegos" />
      </div>
      <div className="panel game-wrap">
        <h1 className="section-title">Tetris</h1>
        <p className="section-sub">Flechas o botones · Espacio gira · P pausa</p>
        <div className="score-bar">
          <span>Puntos: {score}</span>
        </div>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          width={COLS * BLOCK}
          height={ROWS * BLOCK}
          style={{ aspectRatio: `${COLS} / ${ROWS}`, width: "min(100%, 280px)" }}
        />
        <div className="score-bar">
          <button type="button" className="btn btn-sky" onClick={() => setPaused((p) => !p)}>
            {paused ? "Seguir" : "Pausa"}
          </button>
          <button type="button" className="btn btn-leaf" onClick={restart}>
            Reiniciar
          </button>
          <button type="button" className="btn" onClick={rotatePiece}>
            Girar
          </button>
        </div>
        <div className="dpad">
          <button type="button" className="up" onClick={rotatePiece} aria-label="Girar">
            ↻
          </button>
          <button type="button" className="left" onClick={() => move(-1, 0)} aria-label="Izquierda">
            ←
          </button>
          <button type="button" className="right" onClick={() => move(1, 0)} aria-label="Derecha">
            →
          </button>
          <button type="button" className="down" onClick={hardDrop} aria-label="Bajar">
            ↓
          </button>
        </div>
      </div>
    </main>
  );
}
