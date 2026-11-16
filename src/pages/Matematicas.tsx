import { useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
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
  if (diff === "medio") return 10;
  return 20;
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
  const [op, setOp] = useState<Op>("sumar");
  const [diff, setDiff] = useState<Difficulty>("facil");
  const [seed, setSeed] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);

  const problem = useMemo(() => makeProblem(op, diff), [op, diff, seed]);
  const symbol = OPS.find((o) => o.id === op)!.symbol;

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
      setScore((s) => s + 1);
      speak("¡Correcto!", { mode: "feedback" });
      setTimeout(next, 800);
    } else {
      setFeedback("Casi… ¡sigue!");
      speak("Inténtalo otra vez", { mode: "feedback" });
    }
  }

  return (
    <main className="screen mates">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Matemáticas</h1>
        <p className="section-sub">Practica con números y gana estrellas</p>

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

        <div className="level-pills">
          {(
            [
              ["facil", "Fácil"],
              ["medio", "Medio"],
              ["dificil", "Difícil"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`level-pill ${diff === id ? "active" : ""}`}
              onClick={() => {
                setDiff(id);
                next();
              }}
            >
              {label}
            </button>
          ))}
        </div>

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
          <p className="mates-score">Estrellas: {score}</p>
        </div>
      </div>
    </main>
  );
}
