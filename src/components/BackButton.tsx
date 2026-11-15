import { Link } from "react-router-dom";

export function BackButton({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="btn btn-ghost" aria-label="Volver">
      ← Volver
    </Link>
  );
}
