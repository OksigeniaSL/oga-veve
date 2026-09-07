import { defineConfig } from 'vitest/config';

// El juego se sirve como estático detrás de nginx/CloudFlare, igual que el
// panel admin de la granja. `base` relativa para que funcione tanto en la
// raíz de un dominio propio como bajo una subruta (/veve/) sin recompilar.
export default defineConfig({
  base: './',
  /*
   * **Las pruebas tienen que ver la hoja de estilos de verdad.**
   *
   * Vitest, de fábrica, sustituye cualquier importación de CSS por una cadena
   * vacía —`css: false`—, y eso incluye `style.css?raw`. Con lo cual
   * `style.test.ts`, que existe para cazar dos declaraciones de la misma
   * clase, llevaba tiempo revisando una hoja de cero caracteres: pasaba
   * siempre, y cuando de verdad hubo un choque de clases no dijo nada.
   *
   * Una prueba que no puede fallar es peor que no tenerla, porque además da
   * tranquilidad.
   */
  test: { css: true },
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
