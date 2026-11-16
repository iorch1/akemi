import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useProgress } from "../hooks/useProgress";
import { packById, READING_PACK_BY_LEVEL } from "../lib/coloring-packs";
import { completeReadingChallenge, type ReadingLevelId } from "../lib/progress";
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
  const [progress, setProgress] = useProgress();
  const [level, setLevel] = useState<ReadingLevelId>("letras");
  const [challengeSlot, setChallengeSlot] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [toast, setToast] = useState("");

  const challenges = useMemo(() => challengesFor(level), [level]);
  const current = challenges[challengeSlot] ?? challenges[0];
  const done = progress.reading[level].done;

  const choices = useMemo(
    () => distractorsFor(level, current.correct),
    [level, current.correct, challengeSlot],
  );

  useEffect(() => {
    setChallengeSlot(0);
    setFeedback("");
    setToast("");
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
    if (done.includes(current.index)) return;
    if (opt === current.correct) {
      setFeedback("¡Muy bien!");
      speak("¡Muy bien!", { mode: "feedback" });
      const { state, packUnlocked } = completeReadingChallenge(
        progress,
        level,
        current.index,
      );
      setProgress(state);
      if (packUnlocked) {
        const name = packById(packUnlocked)?.name ?? "pack";
        setToast(`¡Nuevo pack desbloqueado: ${name}! 🎨`);
        speak(`¡Desbloqueaste ${name}!`, { mode: "feedback" });
      }
      setTimeout(() => {
        setFeedback("");
        const remaining = challenges.findIndex(
          (c) => !state.reading[level].done.includes(c.index),
        );
        if (remaining >= 0) setChallengeSlot(remaining);
      }, 700);
    } else {
      setFeedback("Inténtalo otra vez");
      speak("Inténtalo otra vez", { mode: "feedback" });
    }
  }

  const packId = READING_PACK_BY_LEVEL[level];
  const packName = packId ? packById(packId)?.name : "";

  return (
    <main className="screen leer">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Aprender a leer</h1>
        <p className="section-sub">Completa 3 de 5 retos para un pack de colorear</p>

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

        {packName && (
          <p className="leer-pack-hint">
            Pack «{packName}»: retos completados{" "}
            <strong>{Math.min(3, done.length)}</strong>/3 (máx. 5 retos)
          </p>
        )}

        <ul className="leer-challenge-dots" aria-label="Retos del nivel">
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
            Reto {current.index + 1} de 5 · Elige la respuesta correcta
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
        </div>
      </div>
    </main>
  );
}