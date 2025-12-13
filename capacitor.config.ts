import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vinayak.hackathon2do',
  appName: 'Hackathon 2do',
  webDir: 'out',

  // For local development, uncomment below and use:
  // 1) Run `npm run dev`
  // 2) The Android emulator can reach your machine's localhost via 10.0.2.2
  // server: {
  //   url: 'http://10.0.2.2:3000',
  //   cleartext: true,
  // },

  android: {
    allowMixedContent: true,
  },
};

export default config;
