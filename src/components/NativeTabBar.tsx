import { NavLink, useLocation } from "react-router-dom";
import { isNativeApp } from "../lib/platform";
import "./NativeTabBar.css";

type TabItem = {
  to: string;
  label: string;
  emoji: string;
  end?: boolean;
  prefix?: string;
};

const tabs: TabItem[] = [
  { to: "/", label: "Inicio", emoji: "🏠", end: true },
  { to: "/leer", label: "Leer", emoji: "📖", prefix: "/leer" },
  { to: "/mates", label: "Mates", emoji: "🔢", prefix: "/mates" },
  { to: "/juegos", label: "Juegos", emoji: "🎮", prefix: "/juegos" },
  { to: "/dibujo", label: "Dibujo", emoji: "🎨", prefix: "/dibujo" },
  { to: "/rompecabezas", label: "Puzzle", emoji: "🖼️", prefix: "/rompecabezas" },
  { to: "/crear", label: "Crear", emoji: "🧩", prefix: "/crear" },
];

function tabActive(pathname: string, tab: TabItem) {
  if (tab.end) return pathname === "/" || pathname === "";
  const prefix = tab.prefix ?? tab.to;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function NativeTabBar() {
  const { pathname } = useLocation();

  if (!isNativeApp()) return null;
  if (/^\/juegos\/(tetris|snake)/.test(pathname)) return null;
  if (/^\/rompecabezas\/(jugar|pintar)/.test(pathname)) return null;
  if (typeof document !== "undefined" && document.body.classList.contains("puzzle-immersive")) {
    return null;
  }

  return (
    <nav className="native-tab-bar" aria-label="Secciones">
      {tabs.map((tab) => {
        const active = tabActive(pathname, tab);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={active ? "native-tab native-tab--active" : "native-tab"}
            aria-current={active ? "page" : undefined}
          >
            <span className="native-tab-emoji" aria-hidden>
              {tab.emoji}
            </span>
            <span className="native-tab-label">{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}