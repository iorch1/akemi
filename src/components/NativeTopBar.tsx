import { Link, useLocation } from "react-router-dom";
import { useProfileContext } from "../context/ProfileContext";
import { avatarEmoji } from "../lib/profiles";
import { isNativeApp } from "../lib/platform";

const titles: { match: RegExp; title: string }[] = [
  { match: /^\/$/, title: "Akemi" },
  { match: /^\/leer/, title: "Leer" },
  { match: /^\/mates/, title: "Matemáticas" },
  { match: /^\/juegos\/tetris/, title: "Tetris" },
  { match: /^\/juegos\/snake/, title: "Snake" },
  { match: /^\/juegos/, title: "Juegos" },
  { match: /^\/dibujo/, title: "Dibujo" },
  { match: /^\/crear/, title: "Crear" },
];

function titleForPath(pathname: string) {
  return titles.find((t) => t.match.test(pathname))?.title ?? "Akemi";
}

export function NativeTopBar() {
  const { pathname } = useLocation();
  const { profile } = useProfileContext();

  if (!isNativeApp()) return null;

  const title = titleForPath(pathname);
  const inGame = /^\/juegos\/(tetris|snake)/.test(pathname);

  return (
    <header className="native-top-bar">
      <h1 className="native-top-title">{title}</h1>
      {profile && (
        <Link to="/perfiles" className="native-top-profile" aria-label="Cambiar jugador">
          <span className="native-top-avatar" aria-hidden>
            {avatarEmoji(profile.avatar)}
          </span>
          <span className="native-top-name">{profile.nombre}</span>
        </Link>
      )}
      {inGame && <span className="native-top-spacer" aria-hidden />}
    </header>
  );
}