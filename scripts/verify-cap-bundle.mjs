#!/usr/bin/env node
/**
 * Comprueba que dist/ sea apto para Capacitor/APK (base relativa, sin /akemi/).
 * Uso: npm run build:cap && node scripts/verify-cap-bundle.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = join(root, "dist", "index.html");

if (!existsSync(indexPath)) {
  console.error("Falta dist/index.html. Ejecuta npm run build:cap primero.");
  process.exit(1);
}

const html = readFileSync(indexPath, "utf8");

if (html.includes("/akemi/")) {
  console.error(
    "Bundle Capacitor inválido: index.html referencia /akemi/. " +
      "Usa npm run build:cap (no build:cloud) antes de cap sync / APK / OTA.",
  );
  process.exit(1);
}

const scriptSrc = html.match(/<script[^>]+src="([^"]+)"/i)?.[1];
if (scriptSrc?.startsWith("/") && !scriptSrc.startsWith("//")) {
  console.error(
    `Bundle Capacitor inválido: script con ruta absoluta "${scriptSrc}". Esperado ./assets/...`,
  );
  process.exit(1);
}

console.log("OK: dist/ listo para Capacitor (rutas relativas).");