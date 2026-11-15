import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Leer } from "./pages/Leer";
import { Matematicas } from "./pages/Matematicas";
import { Juegos } from "./pages/Juegos";
import { Tetris } from "./pages/Tetris";
import { Snake } from "./pages/Snake";
import { Dibujo } from "./pages/Dibujo";
import { preloadVoices } from "./utils/speech";

export default function App() {
  useEffect(() => {
    preloadVoices();
  }, []);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="leer" element={<Leer />} />
        <Route path="mates" element={<Matematicas />} />
        <Route path="juegos" element={<Juegos />} />
        <Route path="juegos/tetris" element={<Tetris />} />
        <Route path="juegos/snake" element={<Snake />} />
        <Route path="dibujo" element={<Dibujo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
