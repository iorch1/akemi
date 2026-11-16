#!/usr/bin/env node
/**
 * Empaqueta `dist/` en un zip OTA y actualiza ota/manifest.json (autocontenido en GitHub).
 *
 * Uso: npm run build && npm run ota:bundle
 * Luego: git add ota && git push (el APK ya instalado descargará el zip nuevo al abrir).
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = process.env.OTA_VERSION?.trim() || pkg.version;
const bundleId = process.env.OTA_BUNDLE_ID?.trim() || version;

const otaDir = join(root, "ota");
const bundlesDir = join(otaDir, "bundles");
const zipName = `${bundleId}.zip`;
const zipPath = join(bundlesDir, zipName);

if (!existsSync(join(root, "dist", "index.html"))) {
  console.error("Falta dist/: ejecuta npm run build primero.");
  process.exit(1);
}

mkdirSync(bundlesDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);

execSync(`cd dist && zip -qr "${zipPath}" .`, { stdio: "inherit" });

const url = `https://raw.githubusercontent.com/iorch1/akemi/main/ota/bundles/${encodeURIComponent(zipName)}`;
const manifest = {
  bundleId,
  version,
  url,
  publishedAt: new Date().toISOString(),
};

writeFileSync(join(otaDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`OTA listo: ${zipPath}`);
console.log(`Manifiesto: ota/manifest.json → ${url}`);