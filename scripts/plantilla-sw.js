/*
 * El service worker de Óga Veve. Lo escribe `scripts/hacer-sw.mjs`.
 *
 * No se edita a mano: la lista de ficheros y la versión salen de lo que haya
 * en `dist/` después de compilar.
 */

const VERSION = "__VERSION__";
const ARMAZON = __ARMAZON__;

/** Dos cachés: la del armazón, que se estrena con cada versión, y la del uso. */
const CACHE_ARMAZON = `oga-veve-armazon-${VERSION}`;
const CACHE_USO = "oga-veve-uso";

/** Si el nombre lleva la huella del contenido: `-` y ocho caracteres antes de la extensión. */
const llevaHuella = (url) => /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(new URL(url, self.location.href).pathname);

self.addEventListener("install", (evento) => {
  /*
   * **Lo que ya está guardado con su huella no se vuelve a bajar.**
   *
   * Era `cache.addAll(ARMAZON)`: el armazón entero pedido otra vez cada vez
   * que se estrena una versión, unos cinco megas. Lo que la caché del
   * navegador conservara no tocaba la red, pero esa caché no promete nada
   * —es la primera que se vacía en una tablet con poco disco, y el pack de
   * voz pasa por ella—. Y el día después de publicar, en un aula, eso lo
   * hacen todas las tablets a la vez y justo al abrir el juego, que es cuando
   * el navegador comprueba si hay trabajador nuevo: el armazón repetido
   * compitiendo con la primera pantalla por una wifi de 1,6 Mbps. Casi todo
   * es lo mismo que ayer —three.js, las fuentes, los retratos, los textos—, y
   * un fichero con la huella en el nombre es por definición el mismo
   * fichero: si cambia, cambia de nombre. Así que se copia del armazón de
   * ayer, que está en la Cache API y ahí sí se queda, o de la caché del uso
   * si la página ya lo bajó, y solo se pide lo que no esté.
   *
   * Lo que no lleva huella —el `index.html`, el manifiesto, los iconos— se
   * pide siempre, como antes.
   *
   * Y con la misma garantía que `addAll`: si algo no llega, la instalación
   * falla entera y se queda el trabajador de antes, con su armazón completo.
   * Lo que se hubiera copiado a medias se queda en una caché que borra el
   * próximo que se estrene. Un trabajador con medio armazón sería un juego
   * que abre sin red y se rompe al elegir avión.
   */
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_ARMAZON);
      await Promise.all(
        ARMAZON.map(async (ruta) => {
          if (llevaHuella(ruta)) {
            const guardado = await caches.match(ruta);
            if (guardado) return cache.put(ruta, guardado);
          }
          const respuesta = await fetch(ruta);
          if (!respuesta.ok) throw new Error(`${ruta}: ${respuesta.status}`);
          return cache.put(ruta, respuesta);
        }),
      );
    })(),
  );
  /*
   * **Sin `skipWaiting`, y es una decisión.**
   *
   * Saltarse la espera cambia los ficheros por debajo de una pestaña que ya
   * está volando: lo que pida después —un modelo, una tesela— puede haber
   * dejado de existir con ese nombre. Así que la versión nueva se queda
   * esperando y entra la próxima vez que se abre el juego, que en una tablet
   * de aula es cada mañana. Nadie se queda con una versión vieja para
   * siempre, y a nadie se le rompe el vuelo a media aproximación.
   */
});

/*
 * **Y se estrena cuando lo pide quien juega, no antes.**
 *
 * La decisión de arriba —no saltarse la espera— es buena y se queda: nadie
 * debe quedarse sin ficheros a media aproximación. Lo que faltaba era la otra
 * mitad, y costó caro: quien deja la pestaña abierta **no se entera nunca de
 * que hay una versión nueva**, así que vuelve a contar un fallo ya arreglado y
 * se persigue dos veces. Pasó con el tirador del cuadro de mandos: arreglado,
 * desplegado, medido —y seguía sin funcionar, porque lo que corría en esa
 * pestaña era el juego de antes.
 *
 * Con esto, la página avisa y **ofrece**; si dicen que sí, manda este mensaje
 * y la versión nueva entra en ese momento. El consentimiento es la diferencia:
 * no es lo mismo cambiar el suelo mientras alguien vuela que preguntarle
 * antes. Ver `main.ts`.
 */
self.addEventListener("message", (evento) => {
  if (evento.data === "estrenar") self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      // Fuera las cachés de armazones anteriores. La del uso se queda: los
      // relieves y las ortofotos no cambian con cada versión del juego.
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter(
            (n) => n.startsWith("oga-veve-armazon-") && n !== CACHE_ARMAZON,
          )
          .map((n) => caches.delete(n)),
      );
      /*
       * Y de la caché del uso, lo que no lleva huella en el nombre: con una
       * versión nueva puede haber cambiado sin cambiar de nombre —los modelos
       * de los aviones—, y así el primer vuelo después de publicar ya lo trae
       * nuevo. Lo que lleva huella se queda: si está, es el bueno.
       */
      const uso = await caches.open(CACHE_USO);
      for (const peticion of await uso.keys()) {
        // Las teselas y su índice se quedan: ver `esTesela`. Sin índice, las
        // teselas guardadas no se pueden usar sin red.
        if (esDeLasTeselas(peticion.url)) continue;
        if (!llevaHuella(peticion.url)) await uso.delete(peticion);
      }
      await self.clients.claim();
    })(),
  );
});

/** Lo que nunca se guarda: lo de fuera de casa. */
const esDeCasa = (url) => new URL(url).origin === self.location.origin;

/*
 * **Las teselas de ortofoto, como si llevaran huella.**
 *
 * Son la isla entera en trocitos —ver `world/teselas-de-ortofoto.ts`— y se
 * guardan según se miran, como todo lo demás. Pero se llaman por su sitio en
 * el mosaico (`data/teselas/pnoa/15/…/….jpg`) y no llevan huella en el
 * nombre, así que con la regla de abajo pasarían dos cosas malas: cada una
 * se volvería a pedir por detrás **cada vez que se usa** —cientos de
 * peticiones por vuelo, el doble de datos en un teléfono— y todas se
 * borrarían al estrenar cada versión del juego, que es lo contrario de
 * guardarlas.
 *
 * No cambian: la foto de un sitio es la de ese vuelo del IGN, y si un día se
 * rehacen con otra se publican en otra carpeta. El índice sí se renueva, como
 * cualquier fichero sin huella.
 */
const esTesela = (url) => /\/data\/teselas\/[\w-]+\/\d+\/\d+\/\d+\.jpg$/.test(new URL(url).pathname);
const esDeLasTeselas = (url) => new URL(url).pathname.includes("/data/teselas/");

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;

  /*
   * **Los `HEAD` también, y esto se descubrió mirando una captura.**
   *
   * El juego pregunta con un `HEAD` si existe el modelo del avión antes de
   * descargarlo. Sin red ese `HEAD` fallaba —aquí solo se atendía `GET`—, el
   * juego concluía «no hay modelo» y volaba la caja de repuesto: el escenario
   * entero cargado sin conexión, con relieve y ortofoto, y una avioneta de
   * cartón. Se veía en la captura del banco antes de que ninguna comprobación
   * lo dijera.
   *
   * `ignoreMethod` busca el `GET` guardado, y con eso se contesta que sí.
   */
  if (peticion.method === "HEAD" && esDeCasa(peticion.url)) {
    evento.respondWith(
      (async () => {
        const guardado = await caches.match(peticion, { ignoreMethod: true });
        if (guardado) {
          return new Response(null, {
            status: 200,
            headers: guardado.headers,
          });
        }
        return fetch(peticion);
      })(),
    );
    return;
  }

  if (peticion.method !== "GET") return;
  if (!esDeCasa(peticion.url)) {
    /*
     * Las teselas de Google y el proxy del METAR se dejan pasar tal cual.
     *
     * No se pueden guardar —sus licencias no lo permiten— y tampoco hace
     * falta: sin ellas el juego cae al mundo dibujado y al tiempo de casa,
     * que es exactamente para lo que están esos dos caminos.
     */
    return;
  }

  /*
   * **La navegación va primero a la red.**
   *
   * Es lo que hace que una versión nueva llegue en cuanto hay conexión, en
   * vez de quedarse con la de la caché para siempre. Si no hay red, se sirve
   * la guardada y el juego abre igual.
   */
  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_ARMAZON).then((c) => c.put(peticion, copia));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_ARMAZON);
          return (
            (await cache.match(peticion)) ??
            (await cache.match("./index.html")) ??
            Response.error()
          );
        }),
    );
    return;
  }

  /*
   * **El pack de voz se deja pasar: tiene dueño y no es este.**
   *
   * Lo guarda el propio instructor en su caché —`oga-veve-voz-v1`— después
   * del primer gesto, y lo hace así para que funcione **también sin service
   * worker**: la primera visita de una tablet todavía no tiene uno activo, y
   * ahí el pack tiene que guardarse igual o el aula lo baja veinte veces.
   *
   * Si además lo guardara este, habría dos copias de los mismos seiscientos
   * kilobytes en el mismo aparato: la del instructor y la del uso. Y no se
   * arregla solo — `caches.match` mira en todas las cachés, así que a partir
   * de la segunda sesión ya encontraría la del instructor y no volvería a
   * escribir, pero la copia de la primera vez se queda ahí para siempre.
   *
   * Así que aquí no se toca. Lo que sí sigue valiendo es que la caché del
   * instructor sobrevive a las actualizaciones: arriba solo se borran las que
   * empiezan por `oga-veve-armazon-`. Ver #65 y `audio/banco-de-voz.ts`.
   */
  if (new URL(peticion.url).pathname.includes("/data/voces/")) return;

  /*
   * Y todo lo demás de casa, primero de la caché.
   *
   * Los ficheros del armazón llevan el hash en el nombre, así que si está
   * guardado es que es el bueno: pedirlo a la red sería tráfico tirado. Lo
   * que no esté se pide, se sirve y **se guarda para la próxima**, que es lo
   * que hace que el escenario en el que se voló ayer esté disponible hoy sin
   * red sin habérselo descargado todo el primer día.
   *
   * **Salvo lo que no lleva huella en el nombre**, que se sirve de la caché y
   * además se vuelve a pedir por detrás, para la próxima vez. Los modelos de
   * los aviones —`assets/aeronaves/jaz-20.glb`— se llaman siempre igual, y
   * servidos solo de la caché **no se renovaban nunca**: quien había volado
   * un avión una vez se quedaba con ese modelo para siempre, aunque se
   * rehiciera la cabina entera. Así siguen funcionando sin red y se ponen al
   * día solos, un vuelo después.
   */
  const conHuella = llevaHuella(peticion.url) || esTesela(peticion.url);
  const renovar = () =>
    fetch(peticion).then((res) => {
      // Solo lo que salió bien. Un 404 guardado es un 404 para siempre.
      if (res.ok && res.status === 200) {
        const copia = res.clone();
        caches.open(CACHE_USO).then((c) => c.put(peticion, copia));
      }
      return res;
    });
  evento.respondWith(
    (async () => {
      const guardado = await caches.match(peticion);
      if (guardado) {
        if (!conHuella) evento.waitUntil(renovar().catch(() => {}));
        return guardado;
      }
      // Sin red y sin copia, esto falla, y quien lo pidió ya sabe qué hacer:
      // el relieve cae al mundo dibujado, la ortofoto al terreno de colores.
      return renovar();
    })(),
  );
});
