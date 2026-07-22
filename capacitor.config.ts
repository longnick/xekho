import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xekho.pos.capacitor',
  appName: 'Xe Kho POS',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false
    }
  }
};

export default config;
