# Akemi — Android (APK + actualizaciones OTA)

La misma app web (Vite + React) va dentro de un contenedor **Capacitor** para Android. Los cambios de interfaz y contenido se publican como **bundle web** (OTA) sin que las familias reinstalen el APK cada vez.

## Requisitos

- Node.js 20+
- JDK 17+ (21 recomendado)
- Android SDK (`ANDROID_HOME`) con platform 35 y build-tools 35

## Instalar el APK (sideload)

1. Compila: `npm run android:build`
2. APK de depuración: `android/app/build/outputs/apk/debug/app-debug.apk`
3. En el teléfono: activa **Orígenes desconocidos** / instalar apps desconocidas.
4. Copia el APK (USB, correo, Drive) e instálalo una vez.

El APK incluye la versión web embebida `1.0.0` (ver `package.json`).

## Cómo funcionan las actualizaciones (OTA)

Plugin: [@capawesome/capacitor-live-update](https://capawesome.io/plugins/capacitor-live-update/).

1. Al abrir la app, lee `https://raw.githubusercontent.com/iorch1/akemi/main/ota/manifest.json`.
2. Si `bundleId` del manifiesto es distinto al bundle activo, descarga el zip indicado en `url`.
3. Aplica el bundle, recarga el WebView y marca la app como lista (`ready()`). Si algo falla, vuelve al bundle por defecto del APK.

### Publicar una actualización solo web

```bash
# 1. Cambia código y sube la versión en package.json (ej. 1.0.1)
npm run build
npm run ota:bundle
git add ota package.json
git commit -m "OTA 1.0.1"
git push
```

El script genera `ota/bundles/<bundleId>.zip` y actualiza `ota/manifest.json` con la URL `raw.githubusercontent.com`.

Los niños que ya tienen el APK solo abren Akemi: la descarga es automática (necesitan internet).

### Cuándo hace falta un APK nuevo

Cambia el APK nativo solo si:

- subes la versión de plugins Capacitor/Android,
- pides permisos nuevos,
- o cambias `appId` / firma.

Para correcciones de juegos, lectura o mates, basta con OTA.

## Scripts útiles

| Comando | Descripción |
|--------|-------------|
| `npm run cap:sync` | Build web + sincroniza en `android/` |
| `npm run android:build` | APK debug firmado para sideload |
| `npm run android:release` | APK release (configura firma en Gradle) |
| `npm run ota:bundle` | Crea zip OTA + manifiesto |

## Web en Cursor

La publicación web en Cursor (slug `akemi`) es independiente: misma base de código, otro canal de distribución.