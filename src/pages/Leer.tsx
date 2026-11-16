import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useProfileContext } from "../context/ProfileContext";
import { useProgress } from "../hooks/useProgress";
import { difficultyForAge, difficultyLabel } from "../lib/difficulty";
import { packById } from "../lib/coloring-packs";
import {
  completeReadingChallenge,
  nextReadingPackId,
  READING_POINTS_PER_SECTION,
  READING_POINTS_TO_PASS,
  readingLevelNumber,
  readingSectionPoints,
  totalReadingPoints,
  type ReadingLevelId,
} from "../lib/progress";
import { challengesFor, distractorsFor } from "../lib/reading-challenges";
import { readingTextForLetter, speak, type SpeakMode } from "../utils/speech";
import "./Leer.css";

const LEVELS: { id: ReadingLevelId; label: string }[] = [
  { id: "letras", label: "Letras" },
  { id: "silabas", label: "Sílabas" },
  { id: "palabras", label: "Palabras" },
  { id: "frases", label: "Frases" },
];

export function Leer() {
  const { profile } = useProfileContext();
  const difficulty = profile ? difficultyForAge(profile.edad) : "facil";
  const [progress, setProgress] = useProgress();
  const [level, setLevel] = useState<ReadingLevelId>("letras");
  const [challengeSlot, setChallengeSlot] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [toast, setToast] = useState("");
  const [celebrate, setCelebrate] = useState<string | null>(null);

  const challenges = useMemo(() => challengesFor(level, difficulty), [level, difficulty]);
  const current = challenges[challengeSlot] ?? challenges[0];
  const done = progress.reading[level].done;
  const sectionPts = readingSectionPoints(progress, level);
  const totalPts = totalReadingPoints(progress);
  const nextPack = nextReadingPackId(progress);
  const nextPackName = nextPack ? packById(nextPack)?.name : null;

  const choices = useMemo(
    () => distractorsFor(level, current.correct),
    [level, current.correct, challengeSlot],
  );

  useEffect(() => {
    setChallengeSlot(0);
    setFeedback("");
    setToast("");
    setCelebrate(null);
  }, [level]);

  useEffect(() => {
    const next = challenges.findIndex((c) => !done.includes(c.index));
    setChallengeSlot(next >= 0 ? next : 0);
  }, [challenges, done, level]);

  function listen() {
    const mode: SpeakMode =
      level === "letras"
        ? "letter"
        : level === "silabas"
          ? "syllable"
          : level === "palabras"
            ? "word"
            : "phrase";
    const text =
      level === "letras"
        ? readingTextForLetter(current.correct)
        : level === "palabras" || level === "frases"
          ? current.correct
          : current.correct;
    speak(text, { mode });
  }

  function choose(opt: string) {
    if (done.includes(current.index) || sectionPts >= READING_POINTS_PER_SECTION) return;
    if (opt === current.correct) {
      setFeedback("¡Muy bien!");
      speak("¡Muy bien!", { mode: "feedback" });
      const { state, packUnlocked, roundComplete } = completeReadingChallenge(
        progress,
        level,
        current.index,
      );
      setProgress(state);
      if (packUnlocked) {
        const name = packById(packUnlocked)?.name ?? "libro";
        setToast(`¡Nuevo libro desbloqueado: ${name}! 🎨`);
        speak(`¡Desbloqueaste ${name}!`, { mode: "feedback" });
      }
      if (roundComplete) {
        const msg = "¡Nivel completado! 20 de 20 puntos";
        setCelebrate(msg);
        speak("¡Nivel completado!", { mode: "feedback" });
        setTimeout(() => {
          setCelebrate(null);
          setLevel("letras");
        }, 2600);
      }
      setTimeout(() => {
        setFeedback("");
        const remaining = challenges.findIndex(
          (c) => !state.reading[level].done.includes(c.index),
        );
        if (remaining >= 0) setChallengeSlot(remaining);
      }, roundComplete ? 2700 : 700);
    } else {
      setFeedback("Inténtalo otra vez");
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
        <p className="section-sub">
          Gana 5 puntos en cada sección (20 en total) para desbloquear el siguiente libro · Solo
          cuentan los aciertos · Dificultad: {difficultyLabel(difficulty)}
        </p>

        <p className="leer-total-score" aria-live="polite">
          Puntos totales: <strong>{totalPts}</strong> / {READING_POINTS_TO_PASS}
          {nextPackName ? ` · Próximo libro: ${nextPackName}` : ""}
        </p>

        <div className="level-pills" role="tablist" aria-label="Sección">
          {LEVELS.map((l) => {
            const pts = readingSectionPoints(progress, l.id);
            const full = pts >= READING_POINTS_PER_SECTION;
            return (
              <button
                key={l.id}
                type="button"
                className={`level-pill ${level === l.id ? "active" : ""} ${full ? "level-done" : ""}`}
                onClick={() => setLevel(l.id)}
              >
                {l.label} {pts}/{READING_POINTS_PER_SECTION}
                {full ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        <p className="leer-level-badge">Sección {readingLevelNumber(level)} de 4</p>

        <ul className="leer-challenge-dots" aria-label="Retos de la sección">
          {challenges.map((c) => (
            <li
              key={c.index}
              className={`dot-slot ${done.includes(c.index) ? "done" : c.index === current.index ? "active" : ""}`}
            >
              {done.includes(c.index) ? "✓" : c.index + 1}
            </li>
          ))}
        </ul>

        <div className="leer-stage">
          <p className="leer-prompt">{current.prompt}</p>
          <button type="button" className="leer-listen btn btn-sky" onClick={listen}>
            🔊 Escuchar
          </button>
          <p className="leer-hint" aria-live="polite">
            Puntos en esta sección: {sectionPts}/{READING_POINTS_PER_SECTION} · Elige la respuesta
            correcta
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
          {toast && <p className="leer-toast">{toast}</p>}
          {celebrate && (
            <div className="leer-celebrate" role="status">
              <span className="leer-celebrate-confetti" aria-hidden>
                🎉⭐🌈
              </span>
              <p>{celebrate}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}