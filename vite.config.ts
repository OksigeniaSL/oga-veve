import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

// El juego se sirve como estático detrás de nginx/CloudFlare, igual que el
// panel admin de la granja. `base` relativa para que funcione tanto en la
// raíz de un dominio propio como bajo una subruta (/veve/) sin recompilar.
/**
 * **Y el pack de voz, que no llegaba a producción.**
 *
 * Las grabaciones viven en `data/voces/` y el juego las pide por `fetch` a esa
 * misma ruta —ver `BASE` en `audio/banco-de-voz.ts`—, pero `data/` no es la
 * carpeta pública de Vite, así que **no se copiaba al construir**: doscientos
 * setenta y ocho ficheros de voz grabada que existen en el repositorio, se
 * prueban con el banco y no oía nadie. El juego caía a la voz del navegador y
 * seguía funcionando, que es justo lo que hace que un fallo así dure.
 *
 * Los relieves y los aeródromos no tienen ese problema porque entran por
 * `import.meta.glob` y por `import`, así que Vite los empaqueta. El pack de voz
 * no puede: son doscientos y pico ficheros que se bajan **según hacen falta**,
 * y meterlos en el paquete sería descargarlos todos al abrir.
 *
 * Así que se copian tal cual, con la ruta que el juego espera.
 */
function elPackDeVoz(): Plugin {
  let raiz = process.cwd();
  let salida = resolve("dist");
  return {
    name: "pack-de-voz",
    apply: "build",
    configResolved(config) {
      raiz = config.root;
      salida = carpetaDeSalida(config);
    },
    async closeBundle() {
      const desde = resolve(raiz, "data/voces");
      if (!existsSync(desde)) return;
      await cp(desde, resolve(salida, "data/voces"), { recursive: true });
    },
  };
}

/**
 * **Y las teselas de ortofoto, por lo mismo que el pack de voz.**
 *
 * Son decenas de miles de ficheros que el juego pide por `fetch` según mira
 * —ver `world/teselas-de-ortofoto.ts`— y no pasan por el paquete. Tampoco
 * están en el repositorio: pesan cientos de megas y se rehacen con
 * `scripts/pnoa-a-teselas.mjs` (ADR 0018). Así que se copian tal cual si
 * están en `data/teselas` —una carpeta o un enlace a ella—, y si no están,
 * el juego se publica sin teselas y vuela con las fotos de una pieza.
 */
function lasTeselas(): Plugin {
  let raiz = process.cwd();
  let salida = resolve("dist");
  return {
    name: "teselas-de-ortofoto",
    apply: "build",
    configResolved(config) {
      raiz = config.root;
      salida = carpetaDeSalida(config);
    },
    async closeBundle() {
      const desde = resolve(raiz, "data/teselas");
      if (!existsSync(desde)) return;
      // Sin las listas de trabajo del extractor: el mar y los cerrojos.
      await cp(desde, resolve(salida, "data/teselas"), {
        recursive: true,
        dereference: true,
        filter: (f) => !/(^|\/)(mar\.txt|\.cerrojo-[\w-]+)$/.test(f),
      });
    },
  };
}

/**
 * **La carpeta donde escribe esta compilación**, la que diga Vite.
 *
 * Los dos complementos que escriben fuera del paquete —el pack de voz y el
 * trabajador de servicio— llevaban `dist/` escrito a mano, así que con
 * `vite build --outDir otra` el juego salía en `otra/` y las voces y el
 * `sw.js`, en `dist/`: un despliegue sin voces grabadas y con el trabajador
 * de servicio de otra compilación, que es el fallo que el de abajo existe
 * para impedir. La carpeta la sabe Vite; se le pregunta a él.
 */
function carpetaDeSalida(config: {
  readonly root: string;
  readonly build: { readonly outDir: string };
}): string {
  return resolve(config.root, config.build.outDir);
}

/**
 * **Y los relieves, comprimidos.**
 *
 * Son enteros de 16 bits en crudo y el servidor los manda tal cual: no sabe
 * qué es un `.bin` y no lo comprime, ni nginx ni Cloudflare. En Tenerife Norte
 * eso eran seis megas antes de despegar, y en un móvil con 3G, casi un minuto
 * de espera. Comprimidos, el lejano pasa de 2,1 MB a 84 kB, porque casi todo
 * él es mar a cota cero.
 *
 * Se comprimen al empaquetar y no en `data/terrain`, porque allí los leen
 * también las pruebas y las herramientas tal cual. `cargarRelieve` reconoce
 * la cabecera gzip y descomprime; en desarrollo le llega en crudo y lo usa.
 */
function relievesComprimidos(): Plugin {
  return {
    name: "relieves-comprimidos",
    apply: "build",
    async generateBundle(_opciones, paquete) {
      const { gzipSync } = await import("node:zlib");
      for (const f of Object.values(paquete)) {
        if (f.type !== "asset" || !f.fileName.endsWith(".bin")) continue;
        f.source = gzipSync(f.source as Uint8Array, { level: 9 });
      }
    },
  };
}

/**
 * **Y el trabajador de servicio, escrito por la propia compilación.**
 *
 * Estaba en el `build` del `package.json` —`vite build && node
 * scripts/hacer-sw.mjs`— y eso lo hacía saltable: quien compile con `npx vite
 * build` a secas se lleva un `dist/` nuevo y un `sw.js` **del build
 * anterior**, que precachea unos ficheros que ya no existen con ese nombre.
 *
 * Y no falla de forma visible: la página se despliega bien, el `index.html`
 * publicado apunta a lo nuevo, y el trabajador de servicio de cada pestaña
 * sigue sirviendo el armazón viejo. O sea que se despliega, se comprueba que
 * el servidor lo tiene, y **quien juega sigue con el juego de anteayer**. Se
 * perdió media tarde con eso: «he recargado vaciando caché y sigue igual», y
 * tenía razón — el `sw.js` publicado listaba `index-WRFM5t_5.js` mientras el
 * `index.html` pedía `index-DhgMLvKE.js`.
 *
 * Aquí dentro no se puede saltar: cierra el paquete y lo escribe. La línea del
 * `package.json` se queda porque no molesta y es idempotente.
 */
function elTrabajadorDeServicio(): Plugin {
  let raiz = process.cwd();
  let salida = resolve("dist");
  return {
    name: "hacer-sw",
    apply: "build",
    configResolved(config) {
      raiz = config.root;
      salida = carpetaDeSalida(config);
    },
    /*
     * **Y de verdad después del pack de voz, no «después» a secas.**
     *
     * `closeBundle` lo ejecuta Rollup **en paralelo** para todos los
     * complementos —`hookParallel`—, así que `enforce: "post"` no basta: el
     * trabajador de servicio se ponía a listar `dist/data/voces` mientras el
     * otro complemento todavía estaba copiándolo, y contaba cero de quinientos
     * ochenta. La forma de pedir turno es `sequential`.
     */
    closeBundle: {
      order: "post",
      sequential: true,
      async handler() {
        const { execFileSync } = await import("node:child_process");
        execFileSync(process.execPath, ["scripts/hacer-sw.mjs", salida], {
          cwd: raiz,
          stdio: "inherit",
        });
      },
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [
    elPackDeVoz(),
    lasTeselas(),
    relievesComprimidos(),
    elTrabajadorDeServicio(),
  ],
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
  test: {
    css: true,
    /*
     * Sin las copias de trabajo de `.claude/worktrees`: son otros árboles del
     * mismo repositorio, y con ellos dentro vitest corría cinco veces las
     * pruebas —la mitad de otra versión del código— y contaba 764 ficheros.
     */
    exclude: ["**/node_modules/**", "**/dist/**", ".claude/**"],
    /*
     * **Seis hilos y no uno por núcleo.** De fábrica son diecinueve en este
     * portátil, y con seis tarda lo mismo —12,8 s frente a 12,9, medido— pero
     * ocupa 1,4 GB en vez de 2,1. Con varias copias del repositorio probando a
     * la vez eso es lo que agotó la memoria: el sistema se quedó sin ella tres
     * veces en una noche y se llevó por delante el editor.
     */
    maxWorkers: 6,
    minWorkers: 1,
  },
  build: {
    target: "es2022",
    /**
     * **Los ficheros de datos no se incrustan como `data:`.**
     *
     * Vite mete en el propio paquete todo asset por debajo de cuatro kilobytes,
     * como una URL `data:`. Con una imagen pequeña eso es una petición menos y
     * está bien. Con los **ficheros de datos que el juego pide por `fetch`** es
     * otra cosa: una política de seguridad de contenido razonable no lleva
     * `data:` en `connect-src`, así que el navegador se niega a leerlos y el
     * juego se queda sin ortofoto **en producción y solo en producción** —en
     * desarrollo son ficheros de verdad y todo funciona—.
     *
     * Medido en el sitio publicado: «Refused to connect to
     * data:application/json;base64,…» para las fichas de las dos ortofotos de
     * Tenerife Norte. O sea el mundo dibujado en vez del fotográfico, sin que
     * nada lo avisara.
     *
     * Se arregla aquí y no pidiendo `data:` en la política, que es la
     * dirección correcta: pedir permiso para algo que no hace falta es hacer
     * más débil la política de todo el sitio.
     */
    assetsInlineLimit: (ruta: string) =>
      ruta.endsWith(".json") ? false : undefined,
    // three.js son ~600 KB min. Va en su propio chunk para que el navegador
    // lo cachee entre despliegues: el motor cambia mucho menos que el juego.
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"] },
      },
    },
  },
});
