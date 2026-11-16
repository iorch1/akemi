#!/usr/bin/env node
/**
 * Copia el APK debug recién compilado a public/ para servirlo con la web.
 * Uso: npm run android:build && node scripts/stage-android-apk.mjs
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "android/app/build/outputs/apk/debug/app-debug.apk");
const dest = join(root, "public/akemi-android.apk");

if (!existsSync(src)) {
  console.error("No se encontró el APK. Ejecuta primero: npm run android:build");
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`APK listo en ${dest}`);