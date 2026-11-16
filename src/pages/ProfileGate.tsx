import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useProfileContext } from "../context/ProfileContext";
import { difficultyForAge, difficultyLabel } from "../lib/difficulty";
import { AVATAR_CHOICES, avatarEmoji, type AvatarId } from "../lib/profiles";
import "./ProfileGate.css";

type Step = "pick" | "nombre" | "edad" | "avatar";

export function ProfileGate() {
  const navigate = useNavigate();
  const { store, registerProfile, pickProfile } = useProfileContext();
  const [step, setStep] = useState<Step>(store.profiles.length ? "pick" : "nombre");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState(6);
  const [avatar, setAvatar] = useState<AvatarId>("gato");

  const previewDiff = useMemo(() => difficultyLabel(difficultyForAge(edad)), [edad]);

  function goHome() {
    navigate("/", { replace: true });
  }

  function finish() {
    registerProfile(nombre, edad, avatar);
    goHome();
  }

  function chooseExisting(id: string) {
    pickProfile(id);
    goHome();
  }

  return (
    <main className="screen profile-gate">
      <div className="profile-card panel-soft">
        <h1 className="brand-mark profile-brand">Akemi</h1>
        <p className="profile-lead">¿Quién va a jugar hoy?</p>

        {step === "pick" && store.profiles.length > 0 && (
          <>
            <ul className="profile-list">
              {store.profiles.map((p) => (
                <li key={p.id}>
                  <button type="button" className="profile-chip" onClick={() => chooseExisting(p.id)}>
                    <span className="profile-chip-emoji">{avatarEmoji(p.avatar)}</span>
                    <span>
                      <strong>{p.nombre}</strong>
                      <small>
                        {p.edad} años · {difficultyLabel(difficultyForAge(p.edad))}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-leaf profile-new" onClick={() => setStep("nombre")}>
              + Nuevo perfil
            </button>
          </>
        )}

        {step === "nombre" && (
          <>
            <label className="profile-field">
              Tu nombre
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={24}
                placeholder="Ej. Akemi"
                autoFocus
              />
            </label>
            <div className="profile-actions">
              {store.profiles.length > 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => setStep("pick")}>
                  Volver
                </button>
              )}
              <button
                type="button"
                className="btn btn-coral"
                disabled={!nombre.trim()}
                onClick={() => setStep("edad")}
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {step === "edad" && (
          <>
            <label className="profile-field">
              Tu edad
              <input
                type="number"
                min={3}
                max={14}
                value={edad}
                onChange={(e) => setEdad(Number(e.target.value))}
              />
            </label>
            <p className="profile-diff-hint">
              Dificultad automática: <strong>{previewDiff}</strong>
            </p>
            <StepNav step="edad" back="nombre" next="avatar" onBack={setStep} onNext={setStep} />
          </>
        )}

        {step === "avatar" && (
          <>
            <p className="profile-avatar-title">Elige tu icono</p>
            <StepNav step="avatar" back="edad" onBack={setStep} />
            <AvatarGallery picked={avatar} onPick={setAvatar} />
            <button type="button" className="btn btn-coral profile-go" onClick={finish}>
              ¡Empezar!
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function StepNav({
  step,
  back,
  next,
  onBack,
  onNext,
}: {
  step: Step;
  back: Step;
  next?: Step;
  onBack: (s: Step) => void;
  onNext?: (s: Step) => void;
}) {
  if (step === "avatar") {
    return (
      <div className="profile-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onBack(back)}>
          Atrás
        </button>
      </div>
    );
  }
  return (
    <div className="profile-actions">
      <button type="button" className="btn btn-ghost" onClick={() => onBack(back)}>
        Atrás
      </button>
      <button type="button" className="btn btn-coral" onClick={() => next && onNext?.(next)}>
        Siguiente
      </button>
    </div>
  );
}

function AvatarGallery({ picked, onPick }: { picked: AvatarId; onPick: (id: AvatarId) => void }) {
  return (
    <AvatarGrid>
      {AVATAR_CHOICES.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`avatar-btn ${picked === a.id ? "active" : ""}`}
          onClick={() => onPick(a.id)}
          aria-label={a.label}
        >
          <span className="avatar-emoji">{a.emoji}</span>
        </button>
      ))}
    </AvatarGrid>
  );
}

function AvatarGrid({ children }: { children: ReactNode }) {
  return <div className="avatar-grid">{children}</div>;
}