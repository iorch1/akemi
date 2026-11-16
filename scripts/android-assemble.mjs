#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const task = process.argv[2] ?? "assembleDebug";
const androidDir = join(dirname(fileURLToPath(import.meta.url)), "..", "android");
const isWin = process.platform === "win32";
const gradlew = join(androidDir, isWin ? "gradlew.bat" : "gradlew");

if (!existsSync(gradlew)) {
  console.error(`No se encontró ${gradlew}`);
  process.exit(1);
}

const result = spawnSync(gradlew, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: isWin,
});

process.exit(result.status ?? 1);