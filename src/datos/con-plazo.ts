/**
 * Un plazo para lo que se carga al arrancar.
 *
 * ## El cuelgue que lo pidió
 *
 * El barrido de vuelo entero sacaba **un falso rojo por tirada**: un escenario
 * cualquiera —distinto cada vez— no arrancaba en los ciento veinte segundos
 * que el banco le da, y corrido solo pasaba entero. La tentación era subir el
 * tope. Medido el reparto de los diecisiete:
 *
 *     mediana 1,6 s  ·  el más lento 3,0 s  ·  el tope del banco 120 s
 *
 * O sea que el tope es **cuarenta veces** el arranque más lento que existe.
 * Eso descarta la lentitud: lo que pasa es que algo se queda esperando. Y el
 * banco daba el otro dato que hacía falta —**la consola no decía nada**—, que
 * descarta también la excepción. Una promesa pendiente es silenciosa.
 *
 * El sitio era `world/ortofoto.ts`: `TextureLoader.loadAsync` envuelve un
 * `new Image()` con `onload` y `onerror`, y **no tiene plazo**. Una petición
 * que se queda a medias sin llegar a fallar no dispara ninguno de los dos, así
 * que la promesa no se resuelve jamás y el arranque entero se para detrás de
 * ella, porque va en el `Promise.all` de `main.ts`. Lo mismo valía para los
 * `fetch` de la ficha y del relieve.
 *
 * ## Y por qué devolver nada en vez de fallar
 *
 * Porque es lo que esta casa ya tiene decidido para el modelo del avión: *que
 * falte un recurso externo no puede dejar a nadie sin volar*. Sin la
 * fotografía, el escenario cae al relieve dibujado y se vuela igual — que es
 * exactamente lo que hacen los escenarios que no tienen foto. Sin plazo, en
 * cambio, no se vuela en absoluto y además no se sabe por qué.
 *
 * Con una diferencia que sí importa: **se dice**. El reverso de aquella
 * decisión ya costó caro una vez —«nadie se entera de que se apagó»— así que
 * aquí se avisa por consola, que es justo el canal por el que el banco mira.
 */

/**
 * Cuánto se espera a una imagen antes de seguir sin ella, ms.
 *
 * Cuarenta y cinco segundos. Es quince veces el arranque más lento medido, y
 * a la vez sitio de sobra para una ortofoto de megabyte y medio en la conexión
 * de un colegio. Se busca que no salte nunca en uso normal: esto no es una
 * cuota, es un cortacircuitos.
 */
export const PLAZO_DE_IMAGEN = 45000;

/**
 * Y para un fichero de datos, que es más pequeño y va comprimido.
 */
export const PLAZO_DE_DATO = 20000;

/**
 * Espera a `promesa`, y si tarda más de `ms` sigue sin ella.
 *
 * Devuelve `undefined` al agotarse el plazo, nunca lanza por eso: quien llama
 * ya sabe convivir con «este recurso no está», que es el mismo camino que
 * cuando el fichero no existe.
 *
 * `queEs` sale por consola cuando se agota, porque un recurso que se cae en
 * silencio es la avería que no se encuentra. Ver la cabecera.
 */
export async function conPlazo<T>(
  promesa: Promise<T>,
  ms: number,
  queEs: string,
): Promise<T | undefined> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const plazo = new Promise<undefined>((listo) => {
    reloj = setTimeout(() => {
      console.warn(
        `[óga] ${queEs} no llegó en ${Math.round(ms / 1000)} s: se sigue sin ello.`,
      );
      listo(undefined);
    }, ms);
  });
  try {
    return await Promise.race([promesa, plazo]);
  } finally {
    /*
     * **Y se apaga el reloj al terminar.**
     *
     * Sin esto, cada carga deja un `setTimeout` vivo hasta que vence. En el
     * arranque son una docena, y en un navegador eso no rompe nada — pero en
     * una prueba con temporizadores de mentira deja el reloj corriendo y la
     * siguiente prueba hereda un aviso que no es suyo.
     */
    clearTimeout(reloj);
  }
}
