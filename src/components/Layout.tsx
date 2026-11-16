import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { isNativeApp } from "../lib/platform";
import { NativeTabBar } from "./NativeTabBar";
import { NativeTopBar } from "./NativeTopBar";

export function Layout() {
  const native = isNativeApp();
  const { pathname } = useLocation();
  const immersive =
    native &&
    (/^\/juegos\/(tetris|snake)/.test(pathname) ||
      /^\/rompecabezas\/(jugar|pintar)/.test(pathname));

  useEffect(() => {
    document.body.classList.toggle("native-app", native);
    return () => document.body.classList.remove("native-app");
  }, [native]);

  return (
    <div className={native ? `app-shell${immersive ? " app-shell--immersive" : ""}` : "app-shell"}>
      {native && <NativeTopBar />}
      <div className="app-shell-content">
        <Outlet />
      </div>
      <NativeTabBar />
    </div>
  );
}