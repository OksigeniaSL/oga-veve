/**
 * **La entrada: la primera pantalla, sin esperar al juego.**
 *
 * Medido con una conexión lenta —1,6 Mbps de bajada y 80 ms—, el juego era un
 * solo paquete de 3,6 MB (1,1 comprimido) más three.js, y no se pintaba nada
 * hasta tenerlo entero: siete segundos y medio de pantalla vacía antes de
 * «¿Cuál es tu avión?». En clase, cada espera cuesta la atención de los niños.
 *
 * Y la pantalla de pilotos no necesita casi nada: los textos, el guardado y
 * sus dibujos. Así que esta entrada trae solo eso, la enseña, y en cuanto se
 * ha pintado pide el resto: `main.ts`, con el hangar y el arranque, que a su
 * vez pide el juego. Todo eso se baja mientras se elige piloto, que es tiempo
 * que antes se pasaba mirando una pantalla en blanco.
 *
 * Con un enlace directo —`?escenario=`, `?inicio=`, `?avion=` o un cambio de
 * avión en curso— no se enseña nada aquí: o no hay pantalla de pilotos, o la
 * decide `main.ts` con lo que esta entrada no tiene, que es la lista de
 * aeródromos. Se le pide ya y él hace lo de siempre, y la pantalla, si toca,
 * la abre él. Ver `elegirPiloto`, que no se abre dos veces.
 */

import { detectLocale, setLocale } from "./i18n";
import { hayRearranque } from "./flight/cambio-de-avion";
import { ensenarAnadirAInicio } from "./ui/anadir-a-inicio";
import { pedirAlPrimerToque } from "./ui/pantalla-completa";
import { elegirPiloto } from "./ui/pantalla-pilotos";
import { arrancarPizarra } from "./ui/pizarra";
import { espejoDeHas } from "./ui/espejo-de-has";
import { medirContenedoresSiFalta } from "./ui/medidas-de-contenedor";
import { vigilarElPanelDeAcceso } from "./ui/panel-de-acceso";
import { echarElDeDesarrollo, registrarElTrabajador } from "./service-worker";

echarElDeDesarrollo();
setLocale(detectLocale());

/*
 * **Y en el teléfono, la pantalla entera al primer toque.** Aquí y no en el
 * vuelo porque el primer toque es el de elegir piloto: esperar al vuelo sería
 * pasar la elección entera con la barra del navegador comiéndose un tercio.
 * Ver `ui/pantalla-completa.ts`.
 */
pedirAlPrimerToque();

/*
 * **Y el modo pizarra, antes de pintar nada**: la primera pantalla —quién
 * vuela, el hangar— ya sale con lo de los pequeños abajo. Aquí y no en
 * `main.ts`, que llega después de pintar esa pantalla. Ver `ui/pizarra.ts`.
 */
arrancarPizarra();

/*
 * **Y lo que la hoja de estilos pide y un navegador viejo no sabe** —`:has()`
 * y las unidades de contenedor—, hecho a mano solo donde falta: Firefox 98, el
 * de una pizarra de aula con Android 8. Donde está, no hacen nada. Aquí, en la
 * entrada, para que ya la primera pantalla salga bien.
 */
espejoDeHas();
medirContenedoresSiFalta();

const params = new URLSearchParams(location.search);
const directo =
  params.has("escenario") ||
  params.has("inicio") ||
  params.has("avion") ||
  hayRearranque(sesionDeLaPestana());

if (!directo) {
  // Y en el iPhone, cómo se juega a pantalla completa, con la primera
  // pantalla. Ver `ui/anadir-a-inicio.ts`.
  ensenarAnadirAInicio();
  const pilotos = document.querySelector<HTMLElement>("#pilotos");
  if (pilotos) void elegirPiloto(pilotos);
  await pintada();
}

/*
 * **Y el panel de accesibilidad de Oksigenia**, con la primera pantalla ya
 * pintada: son veinte kilobytes que no deben llegar antes que ella. Vigila y
 * no abre: sale con la pantalla de pilotos o con el hangar, y en el vuelo no
 * está. Ver `ui/panel-de-acceso.ts`.
 */
vigilarElPanelDeAcceso();

/*
 * **Y si el resto no baja, lo dice el vigilante.** Hasta ahora el juego era
 * un solo módulo, y un fallo al bajarlo era un error en su etiqueta, que el
 * vigilante de `index.html` coge al vuelo. Un `import()` que falla no tiene
 * etiqueta: solo rechaza. Así que se le avisa a mano, y él hace lo de
 * siempre: recargar una vez y, si vuelve a fallar, el botón de volver a
 * cargar. Solo con los fallos de red: un error del propio arranque no se
 * arregla recargando, y recargar en bucle lo taparía.
 */
try {
  await import("./main");
} catch (error) {
  if (esDeRed(error)) (globalThis as { __ogaFallo?: () => void }).__ogaFallo?.();
  throw error;
}

/*
 * Y el trabajador de servicio, con el juego ya volando: es lo que lo deja
 * listo para la próxima vez sin red. Ver `service-worker.ts`.
 */
registrarElTrabajador(import.meta.url);

/** La sesión de la pestaña, si el navegador la da. */
function sesionDeLaPestana(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * **Cuando la pantalla ya se ve**, y con sus letras si llegan pronto.
 *
 * Dos cuadros: el primero llega antes de pintar y el segundo, después. En una
 * pestaña de fondo no hay cuadros, y por eso el reloj. Y las fuentes, que se
 * piden al maquetar la pantalla y son veinte kilobytes: pedir el juego antes
 * sería repartir la red con ellas, y el texto saldría un rato con la letra de
 * reserva. Con un tope, porque sin ellas también se juega.
 */
function pintada(): Promise<void> {
  const cuadros = new Promise<void>((listo) => {
    requestAnimationFrame(() => requestAnimationFrame(() => listo()));
    window.setTimeout(listo, 300);
  });
  return cuadros.then(() =>
    Promise.race([
      document.fonts?.ready.then(() => {}) ?? Promise.resolve(),
      new Promise<void>((listo) => window.setTimeout(listo, 1_500)),
    ]),
  );
}

/**
 * Si un `import()` falló por la red: Chrome, Firefox y Safari lo dicen cada
 * uno a su manera, y Vite, si lo que falla es una hoja de estilos del trozo.
 */
function esDeRed(error: unknown): boolean {
  const texto = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|module script failed|unable to preload/i.test(texto);
}
