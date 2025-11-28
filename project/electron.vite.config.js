// electron.vite.config.js

import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { loadBuildConfig } from './build/build-config-loader.cjs';

const appConfig = loadBuildConfig();

const featureFlags = {};
for (const [feature, isEnabled] of Object.entries(appConfig.features)) {
    featureFlags[`__FEATURE_${feature.toUpperCase()}__`] = JSON.stringify(isEnabled);
}

const secureDevServerPlugin = () => ({
  name: 'secure-dev-server',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const userAgent = req.headers['user-agent'];
      if (userAgent && userAgent.includes('Electron/')) return next();
      if (req.url === '/@vite/client' || req.url.startsWith('/@react-refresh')) return next();
      console.warn(`[Secure Dev Server] Bloqué : ${userAgent}`);
      res.socket.destroy();
    });
  }
});

export default defineConfig({
  main: {
    // --- CORRECTION CRITIQUE ---
    // On externalise tout SAUF les paquets ESM-only qui doivent être compilés (bundlés) pour fonctionner dans Electron Main (CJS)
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          'electron-store', 
          'node-fetch', 
          'p-limit', // Souvent utilisé par les libs modernes
          'uuid'     // Par sécurité
        ]
      })
    ],
    define: {
      ...featureFlags,
      __APP_CONFIG__: JSON.stringify(appConfig)
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/main.js') },
        // Keytar est un module natif (C++), il DOIT rester externe
        external: ['keytar'], 
        output: { manualChunks: undefined }
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: {
      ...featureFlags,
      __APP_CONFIG__: JSON.stringify(appConfig)
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: { input: { index: resolve(__dirname, 'src/preload.js') } },
    },
  },
  renderer: {
    define: {
      ...featureFlags,
      __APP_CONFIG__: JSON.stringify(appConfig)
    },
    root: '.',
    build: {
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        input: { index: 'index.html' },
        output: {
          manualChunks: { 
            vendor: ['lit-html'], 
            ui: ['./src/renderer/components/modal.js', './src/renderer/components/sidebar.js'] 
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: false,
    },
    plugins: [secureDevServerPlugin()]
  },
});