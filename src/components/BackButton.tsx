import { Link, useLocation } from "react-router-dom";
import { isNativeApp } from "../lib/platform";

const NATIVE_ROOTS = /^\/(leer|mates|juegos|dibujo|crear|rompecabezas)\/?$/;

export function BackButton({ to = "/" }: { to?: string }) {
  const { pathname } = useLocation();

  if (isNativeApp()) {
    if (NATIVE_ROOTS.test(pathname)) return null;
    if (pathname === "/") return null;
  }

  return (
    <Link to={to} className="btn btn-ghost" aria-label="Volver">
      ← Volver
    </Link>
  );
}