import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appVersion = JSON.parse(readFileSync("package.json", "utf8")).version as string;

const base = process.env.VITE_DEPLOY_BASE?.replace(/\/?$/, "/") ?? "./";

export default defineConfig({
  base,
  plugins: [react()],
  define: {
    "import.meta.env.VITE_BUILTIN_BUNDLE_ID": JSON.stringify(appVersion),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
