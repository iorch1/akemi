import { Capacitor } from "@capacitor/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { runOtaUpdateCheck } from "./lib/ota-updates";
import "./index.css";

void runOtaUpdateCheck();

function routerBasename(): string | undefined {
  if (Capacitor.isNativePlatform()) return undefined;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!base || base === "/" || base === ".") return undefined;
  return base;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename()}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
