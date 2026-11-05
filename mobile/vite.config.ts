import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Android push goes through Firebase, and registering without its config file
// crashes the app. Native push is switched on for Android only once
// android/app/google-services.json has been added.
const androidPushConfigured = existsSync(resolve(__dirname, 'android/app/google-services.json'));
import webConfig from '../vite.config';

// Compile the shared web application without touching the web deployment's
// output or configuration. The native-only adapter is loaded first.
export default mergeConfig(webConfig, defineConfig({
  root: resolve(__dirname, '..'),
  base: './',
  define: {
    __ANDROID_PUSH_CONFIGURED__: JSON.stringify(androidPushConfigured),
  },
  plugins: [{
    name: 'kaps-mobile-entry',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
          .replace('/src/main.tsx', '/mobile/src/main.ts');
      },
    },
  }],
  build: {
    outDir: resolve(__dirname, 'www'),
    emptyOutDir: true,
  },
}));
