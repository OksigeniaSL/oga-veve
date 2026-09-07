/**
 * La bitácora: lo que se hizo en cada vuelo, vuelo a vuelo.
 *
 * > «Se vuela, sale mejor o peor, y no queda nada.»
 *
 * Y era literal. `localStorage` guardaba escenario, peldaño, lección, idioma y
 * volumen —lo que hace falta para **empezar** una partida— y ni una sola cosa
 * de las que hace quien juega. El cuaderno (`cuaderno.ts`) llegó después y
 * apunta los totales: horas, despegues, aterrizajes. Pero un total no es un
 * recuerdo: dice que hubo veinte aterrizajes y no dice **cuál fue el tuyo**.
 *
 * Esto es la otra mitad. Una línea por vuelo, con la fecha, dónde, cuánto duró,
 * qué galones se ganaron y **por dónde se pasó**. De aquí salen la pantalla de
 * fin de vuelo con su traza, los sellos de la libreta y todo lo que dependa de
 * mirar atrás.
 *
 * ## Por qué la traza, y por qué así de barata
 *
 * A los cuatro años, «lo que acabo de hacer» no es una lista de números: es un
 * dibujo. La traza es el vuelo entero convertido en una raya sobre el plano
 * del aeródromo, y se reconoce sin leer y sin que nadie la explique.
 *
 * Se guarda en **coordenadas del fichero del aeródromo** —x al este, y al
 * norte, metros desde su punto de referencia—, que es el mismo sistema en el
 * que ya está dibujado el plano del hangar. Así el dibujo es el de siempre con
 * una polilínea encima, y no hay que convertir nada al pintarlo.
 *
 * Y con tope: ciento veinte puntos por vuelo y sesenta vuelos guardados. Un
 * vuelo de diez minutos son cinco segundos por punto, que para una raya sobre
 * un plano de doce kilómetros es más resolución de la que se ve. Sesenta
 * vuelos con eso ocupan menos de cien kilobytes, y `localStorage` tiene cinco
 * megas.
 */

/** Un punto de la traza, en coordenadas del fichero del aeródromo. */
export type Paso = readonly [number, number];

export interface Vuelo {
  /** Cuándo, en ISO. Se guarda entero y se enseña como se quiera. */
  readonly fecha: string;
  /** El escenario, por su `id`. */
  readonly escenario: string;
  /** La lección que se estaba haciendo. */
  readonly leccion: string;
  /** Y el peldaño, que cambia lo que significa todo lo demás. */
  readonly tramo: string;
  /** Cuánto duró, en segundos. */
  readonly segundos: number;
  /** Los galones que se ganaron, por su nombre. */
  readonly galones: readonly string[];
  /** Por dónde se pasó. Ver la cabecera. */
  readonly traza: readonly Paso[];
}

/** Dónde vive. */
const LLAVE = "oga-veve:bitacora";

/** Cuántos vuelos se guardan. Ver la cabecera. */
export const CUANTOS_VUELOS = 60;

/** Y cuántos puntos tiene una traza como mucho. */
export const PUNTOS_DE_TRAZA = 120;

/**
 * Los vuelos guardados, del más reciente al más antiguo.
 *
 * Nunca revienta: si el almacenamiento está bloqueado, si lo que hay dentro no
 * es lo que se espera o si alguien lo editó a mano, devuelve una bitácora
 * vacía y el juego sigue. Perder el historial es una pena; no poder volar
 * porque el historial está roto sería otra cosa.
 */
export function leerBitacora(): Vuelo[] {
  try {
    const crudo = localStorage.getItem(LLAVE);
    if (!crudo) return [];
    const leido: unknown = JSON.parse(crudo);
    if (!Array.isArray(leido)) return [];
    return leido.filter(esVuelo).slice(0, CUANTOS_VUELOS);
  } catch {
    return [];
  }
}

/**
 * Apunta un vuelo y devuelve la bitácora resultante.
 *
 * El más reciente va el primero, que es como se lee una bitácora y como se
 * pinta una lista. Y se recorta la traza aquí y no en quien la graba: el tope
 * es una propiedad de lo que se guarda, no de quien lo trae.
 */
export function apuntarVuelo(vuelo: Vuelo): Vuelo[] {
  const bitacora = [
    { ...vuelo, traza: adelgazar(vuelo.traza, PUNTOS_DE_TRAZA) },
    ...leerBitacora(),
  ].slice(0, CUANTOS_VUELOS);
  try {
    localStorage.setItem(LLAVE, JSON.stringify(bitacora));
  } catch {
    // Navegación privada o almacenamiento lleno: se ha volado igual.
  }
  return bitacora;
}

/**
 * Deja una traza en como mucho `tope` puntos, repartidos por igual.
 *
 * No se cortan los últimos: se quita de en medio. Una traza recortada por el
 * final sería un vuelo que se acaba antes de llegar, que es justo lo contrario
 * de lo que enseña. Y el primero y el último se conservan siempre: son el
 * puesto del que se salió y el sitio donde se acabó.
 */
export function adelgazar(traza: readonly Paso[], tope: number): Paso[] {
  if (traza.length <= tope) return [...traza];
  const salida: Paso[] = [];
  for (let i = 0; i < tope - 1; i++) {
    salida.push(traza[Math.round((i * (traza.length - 1)) / (tope - 1))]!);
  }
  salida.push(traza[traza.length - 1]!);
  return salida;
}

/** Las horas de todo lo guardado, en segundos. */
export function segundosDeBitacora(bitacora: readonly Vuelo[]): number {
  return bitacora.reduce((total, v) => total + v.segundos, 0);
}

function esVuelo(x: unknown): x is Vuelo {
  if (!x || typeof x !== "object") return false;
  const v = x as Partial<Vuelo>;
  return (
    typeof v.fecha === "string" &&
    typeof v.escenario === "string" &&
    typeof v.segundos === "number" &&
    Array.isArray(v.galones) &&
    Array.isArray(v.traza)
  );
}
