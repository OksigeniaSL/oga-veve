/**
 * **El trabajador de servicio, visto desde la página**: echar el de
 * desarrollo, registrar el de lo publicado y avisar de que hay una versión
 * nueva. El trabajador en sí lo escribe la compilación a partir de
 * `scripts/plantilla-sw.js`.
 *
 * Vivía al final de `main.ts`. Salió de ahí cuando la primera pantalla pasó a
 * abrirse desde `boot.ts` sin esperar al juego: es la entrada la que sabe
 * cuándo ha terminado de arrancar todo, y la que lleva en el nombre la huella
 * de la compilación entera. Ver `registrarElTrabajador`.
 */

import { t } from "./i18n";

/*
 * Y el service worker, que es lo que hace que esto funcione sin conexión.
 *
 * Solo en lo publicado: en desarrollo estorbaría —serviría ficheros viejos
 * mientras se edita— y los bancos de pruebas corren contra el servidor de
 * desarrollo, así que ahí ni existe.
 *
 * Falla en silencio a propósito. Un navegador sin service workers, una
 * ventana privada o un servidor sin HTTPS son razones para no tener el juego
 * sin conexión, no para no tener juego. Ver `scripts/hacer-sw.mjs`.
 */
/*
 * **Y en desarrollo se echa al que hubiera, que no basta con no registrarlo.**
 *
 * Un service worker vive atado al **origen, puerto incluido**, y no a lo que
 * lo puso ahí. Así que basta con haber abierto una vez una compilación de
 * producción en `localhost:5173` para que su worker se quede mandando en ese
 * puerto: después sirve su caché a cualquier cosa que se levante ahí, incluido
 * el servidor de desarrollo, y lo hace sobre todo **cuando el servidor se
 * cae** — que es cuando parece que todo sigue bien.
 *
 * Eso costó una tarde: al reiniciar la máquina se cayó vite, la pestaña siguió
 * funcionando con la caché de semanas atrás, y lo que se vio en pantalla era
 * un juego viejo que ya no existía en el disco. Dicho por quien lo sufrió:
 * «se cayó y lo que quedaba siguió funcionando con algún tipo de caché».
 *
 * No registrar en desarrollo no impide nada de esto: el que ya está puesto no
 * se va solo. Hay que echarlo.
 */
export function echarElDeDesarrollo(): void {
  if (!import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker
    .getRegistrations()
    .then((puestos) => Promise.all(puestos.map((r) => r.unregister())))
    .catch(() => {});
}

/**
 * Registra el trabajador de lo publicado **cuando la página está quieta**.
 *
 * Lo llama la entrada cuando el juego ya ha arrancado —ver `boot.ts`—, con su
 * propia dirección, que es la que lleva la huella de la compilación entera.
 */
export function registrarElTrabajador(direccionDeLaEntrada: string): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const registrar = (): void => {
    /*
     * **Y se le pide con el nombre de esta compilación detrás.**
     *
     * `sw.js` se llama igual en todas las versiones, así que una caché por
     * delante —la del navegador o la del CDN— puede servir el de ayer durante
     * horas, y con él un armazón que precachea ficheros con nombres que ya no
     * existen. Medido en producción: `cache-control: max-age=53257` y ocho
     * horas de antigüedad, con el `index.html` pidiendo `index-CxRfK_OS.js`
     * mientras el `sw.js` publicado listaba `index-WRFM5t_5.js`. El resultado
     * es el peor de todos: se despliega, el servidor lo tiene, y **quien
     * juega sigue en la versión de anteayer por mucho que recargue**, porque
     * lo que le sirve el trabajador de servicio no pasa por la red.
     *
     * El nombre de la entrada lleva la huella de la compilación, así que
     * sirve de versión sin tener que inventarse ninguna: cada compilación
     * pide una dirección que ninguna caché ha visto nunca. La consulta no
     * cambia el ámbito del trabajador —eso lo fija la ruta— así que esto no
     * es un truco con efectos: es pedir el fichero de hoy.
     *
     * Y `updateViaCache: "none"`, que es lo mismo por el otro lado: cuando el
     * navegador vaya a comprobar si hay uno nuevo, que no se conteste solo
     * con lo que tiene guardado.
     *
     * **De la entrada, y no de este módulo ni de `main.ts`.** Con la primera
     * pantalla aparte, el juego viene en trozos que se piden en marcha, y el
     * nombre de un trozo solo cambia cuando cambia él o lo que importa: un
     * retoque en la pantalla de pilotos no movería el de `main.ts`. La
     * entrada importa todo lo demás, así que su nombre cambia con cualquier
     * cambio de código.
     */
    const huella = new URL(direccionDeLaEntrada).pathname.split("/").pop() ?? "";
    void navigator.serviceWorker
      .register(`./sw.js?v=${encodeURIComponent(huella)}`, {
        updateViaCache: "none",
      })
      .then((registro) => avisarDeLaVersionNueva(registro))
      .catch(() => {});
  };
  /*
   * **Y no compitiendo con el vuelo que acaba de empezar.**
   *
   * Registrarlo es empezar la precarga: medio centenar de ficheros que el
   * trabajador pide de golpe nada más instalarse. Casi todos están ya en la
   * caché del navegador —el juego acaba de bajarlos—, pero no todos: los
   * retratos de la flota, los instrumentos de los aviones que no se vuelan,
   * las fuentes que esta pantalla no usa. Con una conexión lenta —1,6 Mbps
   * medidos— eso son segundos de red quitados al modelo del avión y al
   * relieve, justo cuando el niño está mirando la pista. Así que se espera a
   * que la página deje de bajar cosas, con un tope para que el juego sin red
   * no dependa de que eso pase.
   */
  void cuandoEsteQuieta().then(registrar);
}

/** Cuánto tiene que pasar sin que termine de bajar nada, ms. */
const QUIETA = 3_000;
/**
 * Y cuánto se espera como mucho, ms: con el pack de voz bajando de fondo la
 * red no se calla en minutos, y el juego sin red no puede esperar a eso.
 */
const COMO_MUCHO = 20_000;

/**
 * **La página quieta**: `QUIETA` sin que termine ninguna descarga, o
 * `COMO_MUCHO` desde que se pregunta.
 *
 * Se mira lo que termina y no lo que empieza porque es lo único que el
 * navegador cuenta, y por eso hay un mínimo: una descarga larga que sigue en
 * camino no deja huella hasta que acaba.
 */
function cuandoEsteQuieta(): Promise<void> {
  return new Promise((listo) => {
    const desde = performance.now();
    let ultima = desde;
    let observador: PerformanceObserver | null = null;
    try {
      observador = new PerformanceObserver(() => {
        ultima = performance.now();
      });
      observador.observe({ type: "resource" });
    } catch {
      // Sin observador se espera el mínimo y ya.
    }
    const mirar = (): void => {
      const ahora = performance.now();
      if (ahora - ultima >= QUIETA || ahora - desde >= COMO_MUCHO) {
        observador?.disconnect();
        listo();
      } else window.setTimeout(mirar, 500);
    };
    window.setTimeout(mirar, QUIETA);
  });
}

/**
 * Y avisar de que hay una versión nueva esperando.
 *
 * **Esto es la otra mitad de una decisión que estaba a medias.** El trabajador
 * de servicio no se salta la espera a propósito —cambiar los ficheros por
 * debajo de una pestaña que está volando deja al avión sin lo que pida
 * después— y eso está bien. Lo que faltaba es que alguien lo dijera: quien
 * tiene la pestaña abierta se queda en la versión de ayer sin enterarse, y
 * entonces vuelve a contar un fallo que ya está arreglado.
 *
 * Costó caro y por eso está escrito: el tirador del cuadro de mandos se
 * arregló, se desplegó y se midió funcionando, y seguía sin funcionar —porque
 * lo que corría en esa pestaña era el juego de antes—.
 *
 * Así que se avisa y se ofrece. No se cambia nada por las bravas: se enciende
 * un botón pequeño en una esquina, y si lo tocan, entonces sí. Ver el mensaje
 * `estrenar` en `scripts/plantilla-sw.js`.
 */
function avisarDeLaVersionNueva(registro: ServiceWorkerRegistration): void {
  const enseñar = (): void => {
    if (document.querySelector(".version-nueva")) return;
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "version-nueva";
    // Con nombre también cuando la frase no se ve: en el teléfono va solo la
    // flecha. Ver `.version-nueva` en la hoja.
    boton.setAttribute("aria-label", t("version.nueva"));
    boton.innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true">` +
      `<path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor"` +
      ` stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M20 3.5V9h-5.5" fill="none" stroke="currentColor"` +
      ` stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg><span>${t("version.nueva")}</span>`;
    boton.addEventListener("click", () => estrenar(registro, boton));
    document.body.appendChild(boton);
  };

  // El que ya estaba esperando cuando se abrió la página.
  if (registro.waiting && navigator.serviceWorker.controller) enseñar();

  /*
   * **Y se pregunta cada tanto, que si no nadie pregunta.**
   *
   * Esto solo miraba al registrarse, o sea una vez por carga de página. Quien
   * deja la pestaña abierta —que es exactamente lo que hace quien está
   * probando— se queda en la versión de hace horas y **vuelve a contar fallos
   * que ya están arreglados**: pasó una tarde entera con las luces de
   * posición, con capturas de un juego que ya no existía.
   *
   * Dos minutos es un compromiso cómodo: es una petición condicional de unos
   * pocos cientos de bytes, y el navegador contesta 304 casi siempre. Y al
   * volver a la pestaña también, que es cuando se mira.
   */
  const preguntar = (): void => void registro.update().catch(() => {});
  setInterval(preguntar, 120_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") preguntar();
  });

  // Y el que llegue mientras se juega.
  registro.addEventListener("updatefound", () => {
    const nuevo = registro.installing;
    if (!nuevo) return;
    nuevo.addEventListener("statechange", () => {
      if (nuevo.state === "installed" && navigator.serviceWorker.controller)
        enseñar();
    });
  });
}

/**
 * Cuánto se espera a que el trabajador nuevo tome el mando antes de recargar
 * igual, ms. Ver `estrenar`.
 *
 * **Quince segundos y no cuatro.** Con la página ya callada —ver
 * `callarLaRed`— lo único que retrasa al nuevo es lo que el viejo tenía en
 * camino, y en un teléfono con datos una tesela o un modelo tardan varios
 * segundos en llegar. Recargar antes es recargar con el viejo al mando, que
 * es justo lo que colgaba la página; la flecha que gira ya dice mientras
 * tanto que el toque se oyó.
 */
const ESPERA_AL_NUEVO = 15_000;

/**
 * **Estrenar la versión que espera ahora, no la que esperaba al salir el
 * botón.**
 *
 * «Al pulsar sobre el botón de actualizar no respondía», en el teléfono. No
 * era el dedo: el botón guardaba el trabajador que estaba esperando **cuando
 * se encendió**, y si mientras tanto se publica otra versión —que es lo que
 * pasa cuando se prueba con la pestaña abierta: se publica, se vuelve a
 * publicar—, esa segunda llega, se instala y **deja al primero jubilado**. El
 * botón seguía encendido, porque ya había uno, y al tocarlo le mandaba
 * `estrenar` a un trabajador que ya no existía para nadie: ni se estrenaba
 * nada ni se recargaba nada. Reproducido con el banco: con una versión nueva
 * recarga en un segundo; con dos seguidas, veinte segundos tocado y nada.
 * Ver `scripts/verificar-actualizar.mjs`.
 *
 * Así que el que se estrena se busca **al tocar**, que es cuando importa.
 *
 * Y dos redes, porque esto cruza dos sistemas —la página y el trabajador— y
 * un candado entre dos sistemas sin salida es una espera eterna:
 *
 * - si al tocar ya no espera nadie —lo estrenó otra pestaña—, se recarga y
 *   ya: lo nuevo está al mando;
 * - si el nuevo no toma el mando en unos segundos —el navegador lo retrasa
 *   mientras el viejo termina lo que estaba bajando—, se recarga igual. La
 *   página se pide primero a la red —ver `plantilla-sw.js`— y las piezas del
 *   armazón nuevo ya están en su caché, así que lo que abre es lo nuevo.
 *   **Pero es una red, no el camino**: recargar con el viejo al mando puede
 *   colgar la página, y por eso antes se le quita el trabajo al viejo —ver
 *   `callarLaRed`— para que el camino sea el de `controllerchange`.
 *
 * Y el botón **dice que lo ha oído** en cuanto se toca: la flecha gira. Sin
 * eso, un segundo de espera hasta la recarga se lee igual que un botón que
 * no hace nada.
 */
function estrenar(
  registro: ServiceWorkerRegistration,
  boton: HTMLButtonElement,
): void {
  if (boton.classList.contains("version-nueva--yendo")) return;
  boton.classList.add("version-nueva--yendo");
  boton.setAttribute("aria-busy", "true");
  let recargando = false;
  const recargar = (): void => {
    if (recargando) return;
    recargando = true;
    location.reload();
  };
  /*
   * Primero se le dice que se estrene y **después se recarga**, cuando el
   * navegador avisa de que hay otro al mando. Recargar antes vuelve a pedirle
   * las piezas al de siempre, que es la forma más fácil de que esto parezca
   * que no hace nada.
   */
  navigator.serviceWorker.addEventListener("controllerchange", recargar, {
    once: true,
  });
  const esperando = registro.waiting;
  if (!esperando) {
    recargar();
    return;
  }
  esperando.postMessage("estrenar");
  callarLaRed();
  window.setTimeout(recargar, ESPERA_AL_NUEVO);
}

/**
 * **Y la página deja de pedir cosas, que si no el nuevo no entra.**
 *
 * Chrome no deja tomar el mando al trabajador nuevo mientras el viejo tenga
 * peticiones a medias, aunque al nuevo se le haya dicho que no espere: para
 * al viejo en cuanto se queda sin trabajo, y si en ese instante la página le
 * pide otra cosa —una tesela, un modelo—, lo vuelve a arrancar para
 * atenderla y el nuevo sigue esperando. Volando, con las teselas llegando,
 * eso pasa casi siempre. Medido con el banco, la recarga de socorro de
 * `ESPERA_AL_NUEVO` caía entonces con el viejo al mando y salía de dos
 * maneras, las dos malas: o abría la página otra vez con el botón puesto y
 * el nuevo esperando, o el navegador mataba al viejo a media navegación y la
 * página se quedaba colgada para siempre.
 *
 * La página se va a recargar de todas formas, así que no pierde nada: lo que
 * estaba bajando se corta y lo que se pida desde aquí se queda esperando a
 * una recarga que ya viene. En cuanto el viejo termina, entra el nuevo y
 * `controllerchange` recarga. Ver `scripts/verificar-actualizar.mjs`.
 */
function callarLaRed(): void {
  globalThis.fetch = () => new Promise<Response>(() => {});
  window.stop();
}
