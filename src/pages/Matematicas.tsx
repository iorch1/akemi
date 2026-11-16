import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useProfileContext } from "../context/ProfileContext";
import { useProgress } from "../hooks/useProgress";
import { difficultyForAge, difficultyLabel, type DifficultyId } from "../lib/difficulty";
import { MATH_PACK_BY_LEVEL, packById } from "../lib/coloring-packs";
import { mathCorrect, mathWrong } from "../lib/progress";
import { speak } from "../utils/speech";
import "./Matematicas.css";

type Op = "sumar" | "restar" | "multiplicar" | "dividir";
type Difficulty = "facil" | "medio" | "dificil";

const OPS: { id: Op; label: string; symbol: string }[] = [
  { id: "sumar", label: "Sumar", symbol: "+" },
  { id: "restar", label: "Restar", symbol: "−" },
  { id: "multiplicar", label: "Multiplicar", symbol: "×" },
  { id: "dividir", label: "Dividir", symbol: "÷" },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function maxFor(diff: Difficulty) {
  if (diff === "facil") return 5;
  if (diff === "medio") return 12;
  return 25;
}

function makeProblem(op: Op, diff: Difficulty) {
  const m = maxFor(diff);
  if (op === "sumar") {
    const a = rand(1, m);
    const b = rand(1, m);
    return { a, b, answer: a + b };
  }
  if (op === "restar") {
    const a = rand(1, m);
    const b = rand(0, a);
    return { a, b, answer: a - b };
  }
  if (op === "multiplicar") {
    const a = rand(1, diff === "facil" ? 5 : diff === "medio" ? 8 : 10);
    const b = rand(1, diff === "facil" ? 5 : diff === "medio" ? 8 : 10);
    return { a, b, answer: a * b };
  }
  const b = rand(1, diff === "facil" ? 5 : 10);
  const answer = rand(1, diff === "facil" ? 5 : 10);
  return { a: b * answer, b, answer };
}

export function Matematicas() {
  const { profile } = useProfileContext();
  const profileDiff: Difficulty = profile ? difficultyForAge(profile.edad) : "facil";
  const [progress, setProgress] = useProgress();
  const [op, setOp] = useState<Op>("sumar");
  const [diff, setDiff] = useState<Difficulty>(profileDiff);
  const [seed, setSeed] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [toast, setToast] = useState("");

  const problem = useMemo(() => makeProblem(op, diff), [op, diff, seed]);
  const symbol = OPS.find((o) => o.id === op)!.symbol;
  const { level, streak, rewardedLevels } = progress.math;

  useEffect(() => {
    setDiff(profileDiff);
  }, [profileDiff]);

  const rewardLabel = useMemo(() => {
    if (level > 5) return "Libros 11 y 12";
    const packId = MATH_PACK_BY_LEVEL[level];
    return packId ? packById(packId)?.name : undefined;
  }, [level]);

  function next() {
    setSeed((s) => s + 1);
    setInput("");
    setFeedback("");
  }

  function press(d: string) {
    if (input.length >= 3) return;
    setInput((v) => v + d);
  }

  function clear() {
    setInput("");
  }

  function check() {
    if (input === "") return;
    const n = Number(input);
    if (n === problem.answer) {
      setFeedback("¡Correcto! ⭐");
      const result = mathCorrect(progress);
      setProgress(result.state);
      speak("¡Correcto!", { mode: "feedback" });

      if (result.unlockedPack) {
        const label = packById(result.unlockedPack)?.name ?? "libro";
        setToast(`¡Nuevo libro desbloqueado: ${label}!`);
      } else if (result.superPackUnlocked) {
        setToast("¡Libros 11 y 12 desbloqueados!");
        speak("¡Libros desbloqueados!", { mode: "feedback" });
      } else if (result.levelAdvanced) {
        setToast(`¡Nivel ${result.state.math.level}! Sigue la racha.`);
      }

      setTimeout(next, 800);
    } else {
      setFeedback("Casi… ¡empezamos de cero!");
      const result = mathWrong(progress);
      setProgress(result.state);
      speak("Inténtalo otra vez", { mode: "feedback" });
      setInput("");
    }
  }

  const alreadyRewarded = rewardedLevels.includes(level);

  return (
    <main className="screen mates">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Matemáticas</h1>
        <p className="section-sub">
          Nivel {level}: 5 aciertos seguidos para desbloquear un libro · Dificultad: {difficultyLabel(diff as DifficultyId)}
        </p>

        <div className="mates-progress" aria-label="Progreso del nivel">
          <span className="mates-level-badge">Nivel {level}</span>
          <div className="mates-streak">
            Racha: <strong>{streak}</strong> / 5
          </div>
          {rewardLabel && (
            <p className="mates-reward-hint">
              {alreadyRewarded && level <= 5
                ? "Ya tienes el libro de este nivel; avanza sin duplicado."
                : `Próximo libro: ${rewardLabel}`}
            </p>
          )}
          <ul className="mates-streak-dots">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className={i < streak ? "on" : ""} />
            ))}
          </ul>
        </div>

        <div className="level-pills">
          {OPS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`level-pill ${op === o.id ? "active" : ""}`}
              onClick={() => {
                setOp(o.id);
                next();
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        <p className="mates-diff-note">La dificultad sigue la edad de tu perfil (ajuste automático).</p>

        <div className="mates-board">
          <div className="mates-visual" aria-hidden>
            {op === "sumar" && (
              <>
                <span className="dot-group">
                  {Array.from({ length: Math.min(problem.a, 12) }).map((_, i) => (
                    <span key={`a${i}`} className="dot" />
                  ))}
                </span>
                <span className="op-sign">+</span>
                <span className="dot-group">
                  {Array.from({ length: Math.min(problem.b, 12) }).map((_, i) => (
                    <span key={`b${i}`} className="dot alt" />
                  ))}
                </span>
              </>
            )}
            {op !== "sumar" && <span className="op-big">{symbol}</span>}
          </div>

          <p className="mates-eq">
            {problem.a} {symbol} {problem.b} = ?
          </p>
          <p className="mates-answer">{input || "·"}</p>

          <div className="pad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === "⌫") clear();
                  else if (k === "OK") check();
                  else press(k);
                }}
                className={k === "OK" ? "ok-key" : undefined}
              >
                {k}
              </button>
            ))}
          </div>

          <p className={`feedback ${feedback.includes("Correcto") ? "ok" : feedback ? "bad" : ""}`}>
            {feedback}
          </p>
          {toast && <p className="mates-toast">{toast}</p>}
        </div>
      </div>
    </main>
  );
}