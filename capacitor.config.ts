import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.shangan.library',
  appName: '上岸资料库',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
}

export default config
