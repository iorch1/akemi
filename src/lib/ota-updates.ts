import { Capacitor } from "@capacitor/core";
import { LiveUpdate } from "@capawesome/capacitor-live-update";

/** Manifiesto OTA autocontenido en el repo (`ota/manifest.json`). */
export const OTA_MANIFEST_URL =
  "https://raw.githubusercontent.com/iorch1/akemi/main/ota/manifest.json";

type OtaManifest = {
  bundleId: string;
  version: string;
  url: string;
};

async function fetchManifest(): Promise<OtaManifest | null> {
  const response = await fetch(OTA_MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as OtaManifest;
}

function effectiveBundleId(currentBundleId: string | null | undefined): string {
  const builtIn = import.meta.env.VITE_BUILTIN_BUNDLE_ID ?? "1.0.0";
  return currentBundleId?.trim() ? currentBundleId : builtIn;
}

function isNewerBundle(manifest: OtaManifest, currentBundleId: string | null | undefined): boolean {
  return manifest.bundleId !== effectiveBundleId(currentBundleId);
}

/**
 * En Android, comprueba si hay un bundle web más nuevo y lo aplica sin reinstalar el APK.
 */
export async function runOtaUpdateCheck(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const manifest = await fetchManifest();
    if (!manifest?.url || !manifest.bundleId) {
      await LiveUpdate.ready();
      return;
    }

    const { bundleId: currentBundleId } = await LiveUpdate.getCurrentBundle();

    if (!isNewerBundle(manifest, currentBundleId)) {
      await LiveUpdate.ready();
      return;
    }

    await LiveUpdate.downloadBundle({
      url: manifest.url,
      bundleId: manifest.bundleId,
    });
    await LiveUpdate.setNextBundle({ bundleId: manifest.bundleId });
    await LiveUpdate.reload();
  } catch (error) {
    console.warn("[Akemi OTA]", error);
    await LiveUpdate.ready();
  }
}