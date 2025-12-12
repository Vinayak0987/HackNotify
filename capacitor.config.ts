import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vinayak.hackathon2do',
  appName: 'Hackathon 2do',
  webDir: 'public',

  // For local Android emulator dev:
  // 1) Run `npm run dev`
  // 2) The Android emulator can reach your machine's localhost via 10.0.2.2
  server: {
    url: 'https://hacktrackr.vercel.app',
    cleartext: true,
  },

  android: {
    // Needed for cleartext HTTP during dev.
    allowMixedContent: true,
  },
};

export default config;
