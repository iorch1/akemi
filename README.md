# Akemi — Aprende jugando

App educativa infantil en español (leer, matemáticas, juegos, dibujo y Crear).

- **Dibujo:** paleta y herramientas a la izquierda, plantillas a la derecha; el mezclador HSV va **encima del lienzo** (la pintura por página sigue en memoria de sesión).
- **Crear:** **24 niveles**, escenario central grande, muros, muñeco Aki; bloques a la derecha y proyectos guardados debajo.
- **Inicio:** botón **Descargar app Android (APK)** → `public/akemi-android.apk` (ver [docs/ANDROID.md](./docs/ANDROID.md)).

- **Web:** `npm run dev` → http://127.0.0.1:5173/
- **Publicación web Cursor:** slug `akemi` — confirmar Publish en el agente del proyecto para obtener la URL pública de escritorio.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
