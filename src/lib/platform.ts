import { Capacitor } from "@capacitor/core";

/** App embebida en Capacitor (Android/iOS), no el sitio web en navegador. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}