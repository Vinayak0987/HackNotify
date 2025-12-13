import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vinayak.hackathon2do',
  appName: 'Hackathon 2do',
  webDir: 'public',

  // Load from Vercel for production
  server: {
    url: 'https://hacktrackr.vercel.app',
    cleartext: true,
  },

  android: {
    allowMixedContent: true,
  },
};

export default config;
