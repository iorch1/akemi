import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { ColorMixer, ColorSwatches, useColorMixerState } from "../components/ColorPalette";
import { useProfileContext } from "../context/ProfileContext";
import { useProgress } from "../hooks/useProgress";
import type { ColoringImage } from "../lib/coloring-packs";
import { packForImage } from "../lib/coloring-packs";
import { hsvToHex } from "../lib/drawing-tools";
import { floodFill } from "../lib/flood-fill";
import {
  PUZZLE_PIECE_COUNTS,
  cellIndex,
  gridForPieceCount,
  shuffleInPlace,
  type PuzzlePieceCount,
} from "../lib/puzzle-grid";
import { pickRandomColoringImage } from "../lib/puzzle-images";
import {
  hashSeed,
  jigsawMetaForGrid,
  piecePath2D,
  piecePathD,
  pieceTabsFor,
} from "../lib/puzzle-jigsaw";
import {
  getPuzzleSession,
  patchPuzzleSession,
  setPuzzleSession,
  type PuzzleJigsawInfo,
  type PuzzleTile,
} from "../lib/puzzle-session";
import {
  loadPuzzlePrefs,
  recordPuzzleCompleted,
  savePuzzlePrefs,
} from "../lib/puzzle-storage";
import { drawSvgOnCanvas } from "../lib/svg-canvas";
import "./Rompecabezas.css";

const BOARD_W = 400;
const BOARD_H = 520;
const MAX_UNDO = 24;
const RETURN_MS = 280;

type Phase = "hub" | "play" | "paint";

type DragState = {
  pieceId: number;
  pointerId: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  homeX: number;
  homeY: number;
  returning: boolean;
};

function useCanvasUndo(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const stack = useRef<ImageData[]>([]);
  const snapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    stack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (stack.current.length > MAX_UNDO) stack.current.shift();
  }, [canvasRef]);
  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || stack.current.length === 0) return;
    ctx.putImageData(stack.current.pop()!, 0, 0);
  }, [canvasRef]);
  const resetStack = useCallback(() => {
    stack.current = [];
  }, []);
  return { snapshot, undo, resetStack };
}

async function sliceJigsawImage(
  src: string,
  rows: number,
  cols: number,
  seed: number,
): Promise<{ tiles: PuzzleTile[]; jigsaw: PuzzleJigsawInfo }> {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_W;
  canvas.height = BOARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      tiles: [],
      jigsaw: jigsawMetaForGrid(rows, cols, BOARD_W, BOARD_H, seed),
    };
  }
  await drawSvgOnCanvas(ctx, src, BOARD_W, BOARD_H);

  const meta = jigsawMetaForGrid(rows, cols, BOARD_W, BOARD_H, seed);
  const { edges, tabSize, padPx, cellW: pw, cellH: ph } = meta;
  const tiles: PuzzleTile[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tabs = pieceTabsFor(r, c, edges);
      const pathD = piecePathD(pw, ph, tabs, tabSize);
      const piece = document.createElement("canvas");
      piece.width = Math.max(1, Math.ceil(pw) + padPx * 2);
      piece.height = Math.max(1, Math.ceil(ph) + padPx * 2);
      const pctx = piece.getContext("2d");
      if (!pctx) continue;

      const clip = piecePath2D(pw, ph, tabs, tabSize, padPx, padPx);
      pctx.save();
      pctx.clip(clip);
      // Alinea el tablero para que la celda (c,r) quede en (padPx, padPx)
      pctx.drawImage(
        canvas,
        0,
        0,
        BOARD_W,
        BOARD_H,
        -c * pw + padPx,
        -r * ph + padPx,
        BOARD_W,
        BOARD_H,
      );
      pctx.restore();

      pctx.strokeStyle = "rgba(11, 58, 74, 0.42)";
      pctx.lineWidth = 1.4;
      pctx.lineJoin = "round";
      pctx.stroke(clip);

      tiles.push({
        id: cellIndex(r, c, cols),
        row: r,
        col: c,
        dataUrl: piece.toDataURL("image/png"),
        padPx,
        coreW: pw,
        coreH: ph,
        pathD,
      });
    }
  }

  return { tiles, jigsaw: meta };
}

function pieceImgStyle(tile: PuzzleTile): React.CSSProperties {
  const wScale = (tile.coreW + tile.padPx * 2) / tile.coreW;
  const hScale = (tile.coreH + tile.padPx * 2) / tile.coreH;
  return {
    position: "absolute",
    width: `${wScale * 100}%`,
    height: `${hScale * 100}%`,
    left: `${(-tile.padPx / tile.coreW) * 100}%`,
    top: `${(-tile.padPx / tile.coreH) * 100}%`,
  };
}

function canvasPointer(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

function phaseFromParam(phaseParam?: string): Phase {
  if (phaseParam === "jugar") return "play";
  if (phaseParam === "pintar") return "paint";
  return "hub";
}

export function Rompecabezas() {
  const { phase: phaseParam } = useParams<{ phase?: string }>();
  const navigate = useNavigate();
  const { profile } = useProfileContext();
  const [progress] = useProgress();
  const prefs = useMemo(() => loadPuzzlePrefs(profile?.id), [profile?.id]);

  const saved = getPuzzleSession();
  const [pieceCount, setPieceCount] = useState<PuzzlePieceCount>(
    saved?.pieceCount ?? prefs.lastPieceCount,
  );
  const [image, setImage] = useState<ColoringImage | null>(saved?.image ?? null);
  const [tiles, setTiles] = useState<PuzzleTile[]>(saved?.tiles ?? []);
  const [tray, setTray] = useState<number[]>(saved?.tray ?? []);
  const [board, setBoard] = useState<(number | null)[]>(saved?.board ?? []);
  const [, setJigsaw] = useState<PuzzleJigsawInfo | null>(saved?.jigsaw ?? null);
  const [loading, setLoading] = useState(false);
  const [shakeSlot, setShakeSlot] = useState<number | null>(null);
  const [placedFlash, setPlacedFlash] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [color, setColor] = useState("#ff6b6b");
  const mixer = useColorMixerState();
  const paintRef = useRef<HTMLCanvasElement>(null);
  const paintUndo = useCanvasUndo(paintRef);
  const paintReady = useRef(false);
  const winRecorded = useRef(saved?.winRecorded ?? false);
  const dragRef = useRef<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayHomeRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const setDragState = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const phase = phaseFromParam(phaseParam);
  const grid = useMemo(() => gridForPieceCount(pieceCount), [pieceCount]);
  const placedCount = useMemo(() => board.filter((id) => id !== null).length, [board]);
  const isComplete =
    board.length > 0 && board.every((id, i) => id === i) && tray.length === 0;

  useEffect(() => {
    const immersive = phase === "play" || phase === "paint";
    document.body.classList.toggle("puzzle-immersive", immersive);
    return () => document.body.classList.remove("puzzle-immersive");
  }, [phase]);

  const syncSession = useCallback(
    (
      next: Partial<{
        pieceCount: PuzzlePieceCount;
        image: ColoringImage;
        tiles: PuzzleTile[];
        tray: number[];
        board: (number | null)[];
        winRecorded: boolean;
        jigsaw: PuzzleJigsawInfo;
      }>,
    ) => {
      const base = getPuzzleSession();
      if (
        !base &&
        next.image &&
        next.tiles &&
        next.tray &&
        next.board &&
        next.pieceCount &&
        next.jigsaw
      ) {
        setPuzzleSession({
          pieceCount: next.pieceCount,
          image: next.image,
          tiles: next.tiles,
          tray: next.tray,
          board: next.board,
          winRecorded: next.winRecorded ?? false,
          jigsaw: next.jigsaw,
        });
        return;
      }
      patchPuzzleSession(next);
    },
    [],
  );

  const startGame = useCallback(
    async (count: PuzzlePieceCount, img: ColoringImage) => {
      setLoading(true);
      setDragState(null);
      setHoverSlot(null);
      winRecorded.current = false;
      paintReady.current = false;
      const g = gridForPieceCount(count);
      const seed = hashSeed(`${img.id}:${count}`);
      try {
        const { tiles: sliced, jigsaw: jig } = await sliceJigsawImage(
          img.src,
          g.rows,
          g.cols,
          seed,
        );
        const ids = sliced.map((t) => t.id);
        shuffleInPlace(ids);
        if (ids.every((id, i) => id === i) && ids.length > 1) {
          [ids[0], ids[1]] = [ids[1], ids[0]];
        }
        const emptyBoard = Array.from({ length: g.pieces }, () => null);
        setTiles(sliced);
        setTray(ids);
        setBoard(emptyBoard);
        setJigsaw(jig);
        setImage(img);
        setPieceCount(count);
        setPuzzleSession({
          pieceCount: count,
          image: img,
          tiles: sliced,
          tray: ids,
          board: emptyBoard,
          winRecorded: false,
          jigsaw: jig,
        });
        savePuzzlePrefs(
          {
            ...loadPuzzlePrefs(profile?.id),
            lastPieceCount: count,
            lastImageId: img.id,
          },
          profile?.id,
        );
        navigate("/rompecabezas/jugar");
      } catch {
        setTiles([]);
        setTray([]);
        setBoard([]);
        setJigsaw(null);
        setPuzzleSession(null);
      } finally {
        setLoading(false);
      }
    },
    [navigate, profile?.id, setDragState],
  );

  const onStartRandom = useCallback(() => {
    const img = pickRandomColoringImage(progress.unlockedImages, prefs.lastImageId);
    if (!img) return;
    void startGame(pieceCount, img);
  }, [pieceCount, prefs.lastImageId, progress.unlockedImages, startGame]);

  const onNewImage = useCallback(() => {
    const img = pickRandomColoringImage(progress.unlockedImages, image?.id);
    if (!img) return;
    void startGame(pieceCount, img);
  }, [image?.id, pieceCount, progress.unlockedImages, startGame]);

  const placePiece = useCallback(
    (slot: number, pieceId: number): boolean => {
      if (board[slot] !== null) return false;
      if (pieceId !== slot) {
        setShakeSlot(slot);
        window.setTimeout(() => setShakeSlot(null), 420);
        return false;
      }
      setBoard((prev) => {
        const next = [...prev];
        next[slot] = pieceId;
        syncSession({ board: next });
        return next;
      });
      setTray((prev) => {
        const next = prev.filter((id) => id !== pieceId);
        syncSession({ tray: next });
        return next;
      });
      setPlacedFlash(slot);
      window.setTimeout(() => setPlacedFlash(null), 380);
      return true;
    },
    [board, syncSession],
  );

  const slotAtPoint = useCallback((clientX: number, clientY: number): number | null => {
    const boardEl = boardRef.current;
    if (!boardEl) return null;
    const prev = dragRef.current;
    // Temporalmente ignoramos la pieza flotante en hit-test
    const floating = document.querySelector(".puzzle-drag-layer") as HTMLElement | null;
    if (floating) floating.style.pointerEvents = "none";
    const hit = document.elementFromPoint(clientX, clientY);
    if (floating) floating.style.pointerEvents = "none";
    void prev;
    const slotEl = hit?.closest?.("[data-slot]") as HTMLElement | null;
    if (!slotEl || !boardEl.contains(slotEl)) return null;
    const raw = slotEl.getAttribute("data-slot");
    if (raw == null) return null;
    const slot = Number(raw);
    return Number.isFinite(slot) ? slot : null;
  }, []);

  const returnDragHome = useCallback(
    (current: DragState) => {
      const homeBtn = trayHomeRefs.current.get(current.pieceId);
      const homeRect = homeBtn?.getBoundingClientRect();
      const next: DragState = {
        ...current,
        returning: true,
        x: homeRect?.left ?? current.homeX,
        y: homeRect?.top ?? current.homeY,
        width: homeRect?.width ?? current.width,
        height: homeRect?.height ?? current.height,
      };
      setDragState(next);
      window.setTimeout(() => {
        if (dragRef.current?.pieceId === current.pieceId) {
          setDragState(null);
          setHoverSlot(null);
        }
      }, RETURN_MS + 40);
    },
    [setDragState],
  );

  const onPiecePointerDown = (pieceId: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (dragRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.setPointerCapture(e.pointerId);
    const rect = btn.getBoundingClientRect();
    const next: DragState = {
      pieceId,
      pointerId: e.pointerId,
      x: rect.left,
      y: rect.top,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      homeX: rect.left,
      homeY: rect.top,
      returning: false,
    };
    setDragState(next);
    document.body.classList.add("puzzle-dragging");
  };

  const onPiecePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    if (!current || current.returning || current.pointerId !== e.pointerId) return;
    e.preventDefault();
    const x = e.clientX - current.offsetX;
    const y = e.clientY - current.offsetY;
    const next = { ...current, x, y };
    dragRef.current = next;
    setDrag(next);
    const slot = slotAtPoint(e.clientX, e.clientY);
    setHoverSlot(slot);
  };

  const onPiecePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== e.pointerId) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    document.body.classList.remove("puzzle-dragging");
    if (current.returning) return;

    const slot = slotAtPoint(e.clientX, e.clientY);
    setHoverSlot(null);
    if (slot !== null && board[slot] === null && slot === current.pieceId) {
      placePiece(slot, current.pieceId);
      setDragState(null);
      return;
    }
    if (slot !== null && board[slot] === null && slot !== current.pieceId) {
      setShakeSlot(slot);
      window.setTimeout(() => setShakeSlot(null), 420);
    }
    returnDragHome(current);
  };

  const onPiecePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== e.pointerId) return;
    document.body.classList.remove("puzzle-dragging");
    returnDragHome(current);
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove("puzzle-dragging");
    };
  }, []);

  useEffect(() => {
    if (phase !== "play" || !isComplete || !image) return;
    if (!winRecorded.current) {
      winRecorded.current = true;
      syncSession({ winRecorded: true });
      recordPuzzleCompleted(pieceCount, image.id, profile?.id);
    }
    const t = window.setTimeout(() => {
      navigate("/rompecabezas/pintar", { replace: true });
    }, 900);
    return () => window.clearTimeout(t);
  }, [phase, isComplete, image, pieceCount, profile?.id, navigate, syncSession]);

  useEffect(() => {
    if (phase !== "paint" || !image || paintReady.current) return;
    const canvas = paintRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let cancelled = false;
    void (async () => {
      await drawSvgOnCanvas(ctx, image.src, BOARD_W, BOARD_H);
      if (cancelled) return;
      paintUndo.resetStack();
      paintReady.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, image, paintUndo]);

  useEffect(() => {
    if (phase === "hub") return;
    if (tiles.length === 0 && !loading && !getPuzzleSession()) {
      navigate("/rompecabezas", { replace: true });
    }
  }, [phase, tiles.length, loading, navigate]);

  const onPaintPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = paintRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = canvasPointer(canvas, e.clientX, e.clientY);
    paintUndo.snapshot();
    floodFill(ctx, x, y, color);
  };

  const tileById = useMemo(() => {
    const map = new Map<number, PuzzleTile>();
    for (const t of tiles) map.set(t.id, t);
    return map;
  }, [tiles]);

  const bookLabel = image ? packForImage(image.id)?.name : null;

  if (phase === "hub") {
    return (
      <main className="screen rompecabezas rompecabezas-hub">
        <div className="back-row">
          <BackButton />
        </div>
        <div className="panel puzzle-hub-panel">
          <div className="puzzle-hub-hero" aria-hidden>
            <span className="puzzle-hub-orb" />
            <span className="puzzle-hub-emoji">🖼️</span>
          </div>
          <h1 className="section-title">Rompecabezas</h1>
          <p className="section-sub">Arma la imagen y después ¡píntala como en Dibujo!</p>

          <p className="puzzle-count-label" id="piezas-label">
            ¿Cuántas piezas?
          </p>
          <div className="puzzle-count-grid" role="group" aria-labelledby="piezas-label">
            {PUZZLE_PIECE_COUNTS.map((n) => {
              const g = gridForPieceCount(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={`puzzle-count-btn${pieceCount === n ? " active" : ""}`}
                  onClick={() => setPieceCount(n)}
                  aria-pressed={pieceCount === n}
                >
                  <span className="puzzle-count-num">{n}</span>
                  <span className="puzzle-count-grid-hint">
                    {g.rows}×{g.cols}
                  </span>
                </button>
              );
            })}
          </div>

          {prefs.completedCount > 0 && (
            <p className="puzzle-stats">
              Puzzles terminados: <strong>{prefs.completedCount}</strong>
            </p>
          )}

          <button
            type="button"
            className="btn btn-leaf puzzle-start-btn"
            onClick={onStartRandom}
            disabled={loading}
          >
            {loading ? "Preparando…" : "¡Armar al azar!"}
          </button>
          <p className="puzzle-hint">Usa una página de tus libros Robcrea desbloqueados.</p>
        </div>
      </main>
    );
  }

  if (phase === "paint" && image) {
    return (
      <main className="screen rompecabezas rompecabezas-paint">
        <div className="back-row puzzle-toolbar">
          <BackButton to="/rompecabezas" />
          <h1 className="puzzle-inline-title">¡Píntalo!</h1>
          <button type="button" className="btn btn-ghost" onClick={() => paintUndo.undo()}>
            Deshacer
          </button>
        </div>
        <p className="puzzle-paint-sub">
          Toca las zonas blancas para colorear · {bookLabel} · {image.label}
        </p>
        <div className="puzzle-paint-layout">
          <aside className="puzzle-paint-tools">
            <ColorSwatches
              color={color}
              onColor={setColor}
              showMixer={mixer.showMixer}
              onToggleMixer={() => mixer.setShowMixer((v) => !v)}
              compact
            />
            {mixer.showMixer && (
              <ColorMixer
                hue={mixer.hue}
                sat={mixer.sat}
                onHue={mixer.setHue}
                onSat={mixer.setSat}
                onApply={() => {
                  setColor(hsvToHex(mixer.hue, mixer.sat, 1));
                  mixer.setShowMixer(false);
                }}
                compact
                layout="stack"
              />
            )}
          </aside>
          <div className="puzzle-paint-stage">
            <canvas
              ref={paintRef}
              className="puzzle-paint-canvas"
              width={BOARD_W}
              height={BOARD_H}
              onPointerDown={onPaintPointer}
            />
          </div>
        </div>
        <div className="puzzle-paint-actions">
          <button type="button" className="btn btn-sky" onClick={onNewImage}>
            Otro puzzle
          </button>
          <button type="button" className="btn btn-leaf" onClick={() => navigate("/rompecabezas")}>
            Elegir piezas
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen rompecabezas rompecabezas-play">
      <div className="back-row puzzle-toolbar">
        <BackButton to="/rompecabezas" />
        <div className="puzzle-progress-chip" aria-live="polite">
          {placedCount} / {grid.pieces}
        </div>
        <button type="button" className="btn btn-ghost" onClick={onNewImage} disabled={loading}>
          Otra imagen
        </button>
      </div>

      {image && (
        <p className="puzzle-play-meta">
          {bookLabel} · {image.label} · {grid.rows}×{grid.cols}
        </p>
      )}

      {isComplete && (
        <p className="puzzle-win-banner" role="status">
          ¡Lo armaste! Vamos a pintar…
        </p>
      )}

      <div className="puzzle-board-frame">
        <div
          ref={boardRef}
          className="puzzle-board"
          style={{
            gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
            gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
          }}
          aria-label="Tablero del rompecabezas"
        >
          {board.map((pieceId, slot) => {
            const tile = pieceId !== null ? tileById.get(pieceId) : null;
            const ghost = !tile ? tileById.get(slot) : null;
            return (
              <div
                key={slot}
                data-slot={slot}
                className={[
                  "puzzle-slot",
                  tile ? "puzzle-slot--filled" : "",
                  shakeSlot === slot ? "puzzle-slot--shake" : "",
                  placedFlash === slot ? "puzzle-slot--flash" : "",
                  hoverSlot === slot && !tile ? "puzzle-slot--hover" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={tile ? `Pieza colocada ${slot + 1}` : `Hueco ${slot + 1}`}
                role="listitem"
              >
                {tile ? (
                  <img
                    src={tile.dataUrl}
                    alt=""
                    draggable={false}
                    className="puzzle-slot-img"
                    style={pieceImgStyle(tile)}
                  />
                ) : ghost ? (
                  <svg
                    className="puzzle-slot-ghost"
                    viewBox={`${-ghost.padPx} ${-ghost.padPx} ${ghost.coreW + ghost.padPx * 2} ${ghost.coreH + ghost.padPx * 2}`}
                    preserveAspectRatio="none"
                    aria-hidden
                    style={pieceImgStyle(ghost)}
                  >
                    <path d={ghost.pathD} />
                  </svg>
                ) : (
                  <span className="puzzle-slot-empty" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="puzzle-tray" aria-label="Piezas sueltas">
        <p className="puzzle-tray-label">Arrastra cada pieza a su hueco</p>
        <div className="puzzle-tray-scroll">
          {tray.map((pieceId) => {
            const tile = tileById.get(pieceId);
            if (!tile) return null;
            const aspect =
              (tile.coreW + tile.padPx * 2) / (tile.coreH + tile.padPx * 2 || 1);
            const isDragging = drag?.pieceId === pieceId;
            return (
              <button
                key={pieceId}
                type="button"
                ref={(el) => {
                  if (el) trayHomeRefs.current.set(pieceId, el);
                  else trayHomeRefs.current.delete(pieceId);
                }}
                className={[
                  "puzzle-piece",
                  isDragging ? "puzzle-piece--lifting" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ aspectRatio: `${aspect}` }}
                onPointerDown={(e) => onPiecePointerDown(pieceId, e)}
                onPointerMove={onPiecePointerMove}
                onPointerUp={onPiecePointerUp}
                onPointerCancel={onPiecePointerCancel}
                aria-label={`Pieza ${pieceId + 1}`}
              >
                <img src={tile.dataUrl} alt="" draggable={false} />
              </button>
            );
          })}
        </div>
      </div>

      {drag &&
        (() => {
          const tile = tileById.get(drag.pieceId);
          if (!tile) return null;
          return (
            <div
              className={`puzzle-drag-layer${drag.returning ? " puzzle-drag-layer--return" : ""}`}
              style={{
                left: drag.x,
                top: drag.y,
                width: drag.width,
                height: drag.height,
                transition: drag.returning
                  ? `left ${RETURN_MS}ms ease, top ${RETURN_MS}ms ease, width ${RETURN_MS}ms ease, height ${RETURN_MS}ms ease`
                  : undefined,
              }}
              aria-hidden
            >
              <img src={tile.dataUrl} alt="" draggable={false} />
            </div>
          );
        })()}
    </main>
  );
}
