import { Capacitor } from "@capacitor/core";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProfileProvider } from "./context/ProfileContext";
import { Layout } from "./components/Layout";
import { RequireProfile } from "./components/RequireProfile";
import { ProfileGate } from "./pages/ProfileGate";
import { Home } from "./pages/Home";
import { Leer } from "./pages/Leer";
import { Matematicas } from "./pages/Matematicas";
import { Juegos } from "./pages/Juegos";
import { Tetris } from "./pages/Tetris";
import { Snake } from "./pages/Snake";
import { Dibujo } from "./pages/Dibujo";
import { Crear } from "./pages/Crear";
import { Rompecabezas } from "./pages/Rompecabezas";
import { preloadVoices } from "./utils/speech";

export default function App() {
  useEffect(() => {
    preloadVoices();
    if (Capacitor.isNativePlatform()) {
      void LiveUpdate.ready();
    }
  }, []);

  return (
    <ProfileProvider>
    <Routes>
      <Route path="perfiles" element={<ProfileGate />} />
      <Route element={<RequireProfile />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="leer" element={<Leer />} />
          <Route path="mates" element={<Matematicas />} />
          <Route path="juegos" element={<Juegos />} />
          <Route path="juegos/tetris" element={<Tetris />} />
          <Route path="juegos/snake" element={<Snake />} />
          <Route path="dibujo" element={<Dibujo />} />
          <Route path="crear" element={<Crear />} />
          <Route path="rompecabezas" element={<Rompecabezas />} />
          <Route path="rompecabezas/:phase" element={<Rompecabezas />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
    </ProfileProvider>
  );
}
