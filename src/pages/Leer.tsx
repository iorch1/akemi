import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useProfileContext } from "../context/ProfileContext";
import { useProgress } from "../hooks/useProgress";
import { difficultyForAge, difficultyLabel } from "../lib/difficulty";
import { packById } from "../lib/coloring-packs";
import {
  READING_BOOK_BY_PATH_LEVEL,
  SECTION_LABELS,
  type ReadingSectionId,
} from "../lib/reading-path";
import {
  challengeSlot,
  currentSection,
  isSectionComplete,
  maxPointsInLevel,
  registerReadingCorrect,
  sectionPoints,
  sectionsForState,
  totalPointsInLevel,
} from "../lib/progress";
import { challengesFor, distractorsFor } from "../lib/reading-challenges";
import { readingTextForLetter, speak, type SpeakMode } from "../utils/speech";
import "./Leer.css";

export function Leer() {
  const { profile } = useProfileContext();
  const difficulty = profile ? difficultyForAge(profile.edad) : "facil";
  const [progress, setProgress] = useProgress();
  const [level, setLevel] = useState<ReadingSectionId>(() => currentSection(progress));
  const [feedback, setFeedback] = useState("");
  const [toast, setToast] = useState("");
  const [celebrate, setCelebrate] = useState<string | null>(null);

  const sections = useMemo(() => sectionsForState(progress), [progress]);
  const pts = sectionPoints(progress, level);
  const pathLevel = progress.readingPath.pathLevel;
  const totalPts = totalPointsInLevel(progress);
  const maxPts = maxPointsInLevel();

  const challenges = useMemo(() => challengesFor(level, difficulty), [level, difficulty]);
  const slot = challengeSlot(progress, level);
  const current = challenges[slot] ?? challenges[0];

  const choices = useMemo(
    () => (level === "lectura" ? [] : distractorsFor(level, current.correct)),
    [level, current.correct, slot],
  );

  useEffect(() => {
    const auto = currentSection(progress);
    setLevel(auto);
  }, [progress.readingPath.pathLevel, progress.readingPath.sectionPoints, progress]);

  function listen() {
    const mode: SpeakMode =
      level === "letras"
        ? "letter"
        : level === "silabas"
          ? "syllable"
          : level === "palabras" || level === "frases" || level === "lectura"
            ? level === "lectura"
              ? "phrase"
              : "word"
            : "phrase";
    const text =
      level === "letras"
        ? readingTextForLetter(current.correct)
        : level === "lectura"
          ? current.correct
          : current.correct;
    speak(text, { mode: level === "frases" || level === "lectura" ? "phrase" : mode });
  }

  function onCorrect() {
    setFeedback("¡Muy bien!");
    speak("¡Muy bien!", { mode: "feedback" });
    const { state, packUnlocked, sectionComplete, levelComplete, nextSection } =
      registerReadingCorrect(progress, level);
    setProgress(state);
    if (packUnlocked) {
      const name = packById(packUnlocked)?.name ?? "libro";
      setToast(`¡Nuevo libro desbloqueado: ${name}! 🎨`);
      speak(`¡Desbloqueaste ${name}!`, { mode: "feedback" });
    }
    if (levelComplete) {
      const msg = `¡Nivel ${pathLevel} completado!`;
      setCelebrate(msg);
      speak(msg, { mode: "feedback" });
      setTimeout(() => setCelebrate(null), 2800);
    } else if (sectionComplete && nextSection) {
      setCelebrate(`¡Sección lista! Siguiente: ${SECTION_LABELS[nextSection]}`);
      speak(`Siguiente sección ${SECTION_LABELS[nextSection]}`, { mode: "feedback" });
      setTimeout(() => {
        setCelebrate(null);
        setLevel(nextSection);
      }, 1800);
    }
    setTimeout(() => setFeedback(""), levelComplete ? 2900 : 700);
  }

  function choose(opt: string) {
    if (isSectionComplete(progress, level)) return;
    if (opt === current.correct) onCorrect();
    else {
      setFeedback("Inténtalo otra vez");
      speak("Inténtalo otra vez", { mode: "feedback" });
    }
  }

  function lecturaSelfCheck(readOk: boolean) {
    if (isSectionComplete(progress, level)) return;
    if (readOk) onCorrect();
    else {
      setFeedback("Tómate tu tiempo y vuelve a intentar");
      speak("Tómate tu tiempo", { mode: "feedback" });
    }
  }

  const bookHint = READING_BOOK_BY_PATH_LEVEL[pathLevel];
  const bookName = bookHint ? packById(bookHint)?.name : "";

  return (
    <main className="screen leer">
      <div className="back-row">
        <BackButton />
      </div>
      <div className="panel">
        <h1 className="section-title">Aprender a leer</h1>
        <p className="section-sub">
          Nivel de camino <strong>{pathLevel}</strong>: 5 aciertos por sección · {totalPts}/{maxPts} puntos ·
          Avance automático · Dificultad: {difficultyLabel(difficulty)}
        </p>

        <div className="level-pills" role="tablist" aria-label="Sección">
          {sections.map((id) => {
            const complete = isSectionComplete(progress, id);
            const active = level === id;
            return (
              <button
                key={id}
                type="button"
                className={`level-pill ${active ? "active" : ""} ${complete ? "level-done" : ""}`}
                onClick={() => setLevel(id)}
              >
                {SECTION_LABELS[id]} ({sectionPoints(progress, id)}/5)
                {complete ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        {bookName && (
          <p className="leer-pack-hint">
            Al completar este nivel desbloqueas <strong>{bookName}</strong>
          </p>
        )}

        <ul className="leer-challenge-dots" aria-label="Puntos de la sección">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className={`dot-slot ${i < pts ? "done" : i === pts ? "active" : ""}`}>
              {i < pts ? "✓" : i + 1}
            </li>
          ))}
        </ul>

        <div className="leer-stage">
          <p className="leer-prompt">{current.prompt}</p>
          {level === "lectura" ? (
            <>
              <p className="leer-reading-passage">{current.correct}</p>
              <button type="button" className="leer-listen btn btn-sky" onClick={listen}>
                🔊 Escuchar texto
              </button>
              <p className="leer-hint">Léelo en voz alta. ¿Lo leíste bien?</p>
              <div className="leer-choices">
                <button type="button" className="leer-choice" onClick={() => lecturaSelfCheck(true)}>
                  ¡Sí, lo leí bien!
                </button>
                <button type="button" className="leer-choice leer-choice-muted" onClick={() => lecturaSelfCheck(false)}>
                  Todavía no
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="leer-listen btn btn-sky" onClick={listen}>
                🔊 Escuchar
              </button>
              <p className="leer-hint" aria-live="polite">
                Punto {pts + 1} de 5 en «{SECTION_LABELS[level]}»
              </p>
              <div className="leer-choices">
                {choices.map((c) => (
                  <button key={c} type="button" className="leer-choice" onClick={() => choose(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}
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