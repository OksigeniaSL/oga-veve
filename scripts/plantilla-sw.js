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

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_ARMAZON).then((cache) => cache.addAll(ARMAZON)),
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
      await self.clients.claim();
    })(),
  );
});

/** Lo que nunca se guarda: lo de fuera de casa. */
const esDeCasa = (url) => new URL(url).origin === self.location.origin;

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
   */
  evento.respondWith(
    (async () => {
      const guardado = await caches.match(peticion);
      if (guardado) return guardado;
      try {
        const res = await fetch(peticion);
        // Solo lo que salió bien. Un 404 guardado es un 404 para siempre.
        if (res.ok && res.status === 200) {
          const copia = res.clone();
          caches.open(CACHE_USO).then((c) => c.put(peticion, copia));
        }
        return res;
      } catch (fallo) {
        // Sin red y sin copia. Quien lo pidió ya sabe qué hacer con esto: el
        // relieve cae al mundo dibujado, la ortofoto al terreno de colores.
        throw fallo;
      }
    })(),
  );
});
