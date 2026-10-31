/**
 * **La explicación en voz de la tarjeta del tiempo**, y cuándo deja de darse.
 *
 * Enrique empezó un vuelo con el JAZ 120 en Los Rodeos, en Guyrami, con niebla
 * de verdad, y le salió la tarjeta del tiempo: «de pronto ahí en toda la
 * pantalla, no se entiende: debería escucharse algo que lo explique, y un botón
 * de "no volver a explicar" que aparezca a partir de la segunda o tercera vez
 * que al usuario le aparece. Así no escucha siempre lo mismo, que se puede
 * volver pesado».
 *
 * Lo que sonaba al abrirse era solo el porqué —«Hoy se ve menos de lo mínimo
 * para este avión…»—, igual en los cuatro peldaños: no decía qué es la
 * tarjeta, ni que se puede elegir. Si un adulto no la entiende, alguien de
 * cuatro años menos.
 *
 * ## Lo que se dice
 *
 * Tres trozos montados en una sola frase —un suceso, una voz—, con la receta
 * `parte.explica`: qué es la tarjeta, qué pasa hoy y qué se puede hacer.
 *
 * - **Abajo** (Guyrami y Tukã), sencillo: «Antes de salir, miramos cómo está
 *   el tiempo. Hoy acá se ve muy poco y las nubes están muy bajas, más de lo
 *   que aguanta este avión. Podemos quedarnos en tierra, esperar un rato o
 *   salir igual. Vos elegís».
 * - **Desde Taguato**, con lo que dice el parte: el porqué argumentado de
 *   siempre —`parte.propone.<motivo>`, ya grabado— y detrás, que salir igual
 *   también se puede.
 *
 * Las piezas sirven para cualquier campo: dicen «acá» o «donde vamos», y no
 * el nombre del sitio. El nombre está en la tarjeta, con su indicativo.
 *
 * ## Y cuándo se deja de decir
 *
 * Como toda pantalla que sale de golpe: se cuenta cada vez, desde la segunda
 * se ofrece «no volver a explicar» y los ajustes la devuelven. Eso vive en
 * `flight/explicacion-al-abrir.ts`, que nació aquí y sirve ya también a la
 * pantalla de las teclas y al final del vuelo.
 *
 * Este módulo no habla ni dibuja: decide con qué piezas se explica.
 */

import type { Peldano } from "./escalera";
import { PANTALLAS_QUE_SE_EXPLICAN } from "./explicacion-al-abrir";
import type { Decision, Motivo } from "./parte-de-salida";

export {
  OFRECER_DESDE_LA_VEZ,
  leerLaExplicacion,
  ExplicacionAlAbrir as ExplicacionDelParte,
  type AlAbrir as AlAbrirLaTarjeta,
  type AlmacenDeLaExplicacion,
  type GuardadoDeLaExplicacion,
} from "./explicacion-al-abrir";

/** Dónde se guarda, dentro del progreso del perfil. */
export const LLAVE_DE_LA_EXPLICACION = PANTALLAS_QUE_SE_EXPLICAN.parte;

/**
 * **La receta de la explicación**, para el pack de la instructora: la pieza
 * de «miramos el tiempo», el porqué de hoy y, si va, lo que se puede elegir.
 * Va a `crudo/instructor/recetas.json` **cuando se graben sus piezas**: una
 * receta que nombra una pieza sin grabar rompe el horneado. Hasta entonces el
 * juego dice el porqué de siempre, que sí está grabado. Ver `Game.explicarElParte`.
 */
export const RECETA_DE_LA_EXPLICACION = "parte.explica";
export const PIEZAS_DE_LA_RECETA = ["parte.explica.miramos", "{porque}", "{eleccion?}"] as const;

/** Las claves sencillas de cada porqué: un motivo, o los dos que no dejan ver. */
type Porque = Motivo | "visibilidadYTecho";

/**
 * Las piezas sueltas que se graban para montarla, en el orden en que se
 * escribieron. La pista no tiene «donde vamos»: lo que le pasa a la pista se
 * mira en la de salida, con el avión cargado de hoy. Ver `parteDe`.
 */
export const PIEZAS_DE_LA_EXPLICACION: readonly string[] = [
  "parte.explica.miramos",
  ...(["tormenta", "visibilidad", "techo", "visibilidadYTecho", "cruzado", "pista"] as const).map(
    (m) => `parte.explica.aca.${m}`,
  ),
  ...(["tormenta", "visibilidad", "techo", "visibilidadYTecho", "cruzado"] as const).map(
    (m) => `parte.explica.alla.${m}`,
  ),
  "parte.explica.elegis",
  "parte.explica.tambienSalir",
  "parte.explica.bien",
];

/** Lo que se dice al señalar cada botón de la decisión, sin pulsarlo. */
export const AL_SENALAR = {
  quedarse: "parte.senala.quedarse",
  esperar: "parte.senala.esperar",
  "salir-igual": "parte.senala.salirIgual",
} as const;

/** La explicación montada: con qué se rellena la receta y qué texto lee el navegador. */
export interface Explicacion {
  readonly relleno: { readonly porque: string; readonly eleccion?: string };
  /** Las claves de cada trozo, en orden: el texto es su traducción, junta. */
  readonly trozos: readonly string[];
}

/**
 * **Qué se dice hoy**, según el parte y el peldaño.
 *
 * Abajo, el primer motivo en sencillo, con dónde pasa: «acá» o «donde vamos».
 * Si en ese mismo campo no se ve y además las nubes están bajas —la niebla, o
 * casi—, se dice junto, que es como se ve desde la ventanilla. Desde Taguato,
 * el porqué argumentado del parte, el mismo que ya se decía.
 */
export function montarLaExplicacion(decision: Decision, peldano: Peldano): Explicacion {
  const primero = decision.motivos[0];
  if (decision.salir || !primero) {
    const porque = "parte.explica.bien";
    return { relleno: { porque }, trozos: ["parte.explica.miramos", porque] };
  }
  const conElParte = peldano === "cifra" || peldano === "cabina";
  if (conElParte) {
    const porque = `parte.propone.${primero.motivo}`;
    const eleccion = "parte.explica.tambienSalir";
    return { relleno: { porque, eleccion }, trozos: ["parte.explica.miramos", porque, eleccion] };
  }
  const delCampo = new Set(
    decision.motivos.filter((m) => m.papel === primero.papel).map((m) => m.motivo),
  );
  const sencillo: Porque =
    (primero.motivo === "visibilidad" || primero.motivo === "techo") &&
    delCampo.has("visibilidad") &&
    delCampo.has("techo")
      ? "visibilidadYTecho"
      : primero.motivo;
  // La pista solo se mira en la salida; por si acaso, nunca una pieza que no existe.
  const donde = primero.papel === "llegada" && sencillo !== "pista" ? "alla" : "aca";
  const porque = `parte.explica.${donde}.${sencillo}`;
  const eleccion = "parte.explica.elegis";
  return { relleno: { porque, eleccion }, trozos: ["parte.explica.miramos", porque, eleccion] };
}
