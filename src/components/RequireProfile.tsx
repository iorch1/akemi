import { Outlet } from "react-router-dom";
import { useProfileContext } from "../context/ProfileContext";
import { ProfileGate } from "../pages/ProfileGate";

export function RequireProfile() {
  const { ready, needsOnboarding } = useProfileContext();

  if (!ready) {
    return <p className="boot-msg">Cargando Akemi…</p>;
  }

  if (needsOnboarding) {
    return <ProfileGate />;
  }

  return <Outlet />;
}