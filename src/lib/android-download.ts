/** URL pública del APK Android (mismo origen que la web desplegada). */
export function androidApkDownloadUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  return `${base}akemi-android.apk`;
}

export const ANDROID_APK_LABEL = "Descargar app Android (APK)";