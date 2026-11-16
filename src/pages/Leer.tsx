import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import {
  readingTextForLetter,
  speak,
  type SpeakMode,
} from "../utils/speech";
import "./Leer.css";

type Level = "letras" | "silabas" | "palabras" | "frases";

const LETTERS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const SYLLABLES = [
  "ma", "me", "mi", "mo", "mu",
  "pa", "pe", "pi", "po", "pu",
  "la", "le", "li", "lo", "lu",
  "sa", "se", "si", "so", "su",
  "ca", "que", "qui", "co", "cu",
  "ra", "re", "ri", "ro", "ru",
];
const WORDS = [
  "sol", "luna", "casa", "mesa", "gato", "perro", "agua", "flor",
  "amigo", "libro", "mano", "pelo", "rojo", "azul", "verde", "papa",
  "mama", "nube", "rio", "pan",
];
const PHRASES = [
  "El sol brilla",
  "Mi gato duerme",
  "Me gusta leer",
  "Voy a casa",
  "La luna sale",
  "Un pez nada",
  "Tengo un amigo",
  "Quiero un abrazo",
];

const LEVELS: { id: Level; label: string }[] = [
  { id: "letras", label: "Letras" },
  { id: "silabas", label: "Sílabas" },
  { id: "palabras", label: "Palabras" },
  { id: "frases", label: "Frases" },
];

function pick<T>(arr: T[], exclude?: T): T {
  let next = arr[Math.floor(Math.random() * arr.length)];
  if (exclude !== undefined && arr.length > 1) {
    while (next === exclude) {
      next = arr[Math.floor(Math.random() * arr.length)];
    }
  }
  return next;
}

function optionsFor(level: Level, correct: string): string[] {
  const pool =
    level === "letras"
      ? LETTERS
      : level === "silabas"
        ? SYLLABLES
        : level === "palabras"
          ? WORDS
          : PHRASES;
  const opts = new Set<string>([correct]);
  while (opts.size < Math.min(4, pool.length)) {
    opts.add(pick(pool));
  }
  return Array.from(opts).sort(() => Math.random() - 0.5);
}

export function Leer() {
  const [level, setLevel] = useState<Level>("letras");
  const [target, setTarget] = useState(() => pick(LETTERS));
  const [feedback, setFeedback] = useState("");
  const [streak, setStreak] = useState(0);

  const pool = useMemo(() => {
    if (level === "letras") return LETTERS;
    if (level === "silabas") return SYLLABLES;
    if (level === "palabras") return WORDS;
    return PHRASES;
  }, [level]);

  const choices = useMemo(() => optionsFor(level, target), [level, target]);

  useEffect(() => {
    setTarget(pick(pool));
    setFeedback("");
  }, [level, pool]);

  function nextItem() {
    setTarget((prev) => pick(pool, prev));
    setFeedback("");
  }

  function listen() {
    const mode: SpeakMode =
      level === "letras"
        ? "letter"
        : level === "silabas"
          ? "syllable"
          : level === "palabras"
            ? "word"
            : "phrase";
    const text = level === "letras" ? readingTextForLetter(target) : target;
    speak(text, { mode });
  }

  function choose(opt: string) {
    if (opt === target) {
      setFeedback("¡Muy bien!");
      setStreak((s) => s + 1);
      speak("¡Muy bien!", { mode: "feedback" });
      setTimeout(nextItem, 700);
    } else {
      setFeedback("Inténtalo otra vez");
      setStreak(0);
      speak("Inténtalo otra vez", { mode: "feedback" });
    }
  }

  return (
    <main className="screen leer">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Aprender a leer</h1>
        <p className="section-sub">Escucha y elige la respuesta correcta</p>

        <div className="level-pills" role="tablist" aria-label="Nivel">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`level-pill ${level === l.id ? "active" : ""}`}
              onClick={() => setLevel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="leer-stage">
          <p className="leer-prompt">¿Cuál es?</p>
          <button type="button" className="leer-listen btn btn-sky" onClick={listen}>
            🔊 Escuchar
          </button>
          <p className="leer-hint" aria-live="polite">
            {level === "letras" ? "Una letra" : level === "silabas" ? "Una sílaba" : level === "palabras" ? "Una palabra" : "Una frase"}
          </p>
          <div className="leer-choices">
            {choices.map((c) => (
              <button key={c} type="button" className="leer-choice" onClick={() => choose(c)}>
                {c}
              </button>
            ))}
          </div>
          <p className={`feedback ${feedback === "¡Muy bien!" ? "ok" : feedback ? "bad" : ""}`}>
            {feedback}
          </p>
          <p className="leer-streak">Racha: {streak}</p>
        </div>
      </div>
    </main>
  );
}
