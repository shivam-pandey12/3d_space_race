import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }

          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor';
          }

          if (id.includes('node_modules/socket.io-client')) {
            return 'net-vendor';
          }
        }
      }
    }
  }
});
