import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.akemi.kids",
  appName: "Akemi",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    LiveUpdate: {
      readyTimeout: 10000,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0B6E8A",
      showSpinner: false,
    },
  },
};

export default config;