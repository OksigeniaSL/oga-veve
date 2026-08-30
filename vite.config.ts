import { defineConfig } from 'vite';

// El juego se sirve como estático detrás de nginx/CloudFlare, igual que el
// panel admin de la granja. `base` relativa para que funcione tanto en la
// raíz de un dominio propio como bajo una subruta (/veve/) sin recompilar.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // three.js son ~600 KB min. Va en su propio chunk para que el navegador
    // lo cachee entre despliegues: el motor cambia mucho menos que el juego.
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
