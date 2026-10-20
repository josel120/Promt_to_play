import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    // Multijugador online: el juego habla con `npm run server` a través de /net.
    proxy: { '/net': { target: 'ws://localhost:8787', ws: true } },
  },
  build: {
    // Phaser pesa ~1.5 MB por sí solo; ya va en su propio chunk cacheable.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
