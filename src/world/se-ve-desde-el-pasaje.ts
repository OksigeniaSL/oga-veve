/**
 * **Si un sitio del paisaje se ve ahora desde el asiento de Ara, y cómo
 * enseñarlo si no.**
 *
 * La escena de pasaje nombraba lo que por la ventanilla de Ara no se veía, y
 * Enrique lo encontró cinco veces en un vuelo (18-10-2026): Anaga y el valle
 * de La Orotava debajo del mar de nubes; «esa isla redondita es La Gomera» con
 * la ventanilla llena de nubes; «¡ya se ve la isla adonde vamos!» con el
 * avión metido en una nube, todo blanco; y «se ven las montañas, la costa y
 * el mar» con la isla en la ventanilla de al lado. Es la regla de
 * `flight/lo-que-se-nombra.ts` —solo se nombra lo que se ve, y lo nombrado se
 * señala— llevada al paisaje, y aquí está la mitad que mide: **qué se ve**.
 * Cuándo se dice lo decide la escena, `flight/inicio-pasaje.ts`.
 *
 * Un sitio se ve si llega la vista hasta él de cuatro maneras a la vez:
 *
 * - **Por el cristal**: la recta de los ojos al sitio pasa por el hueco de la
 *   ventanilla, con la misma cuenta que pinta el marco —ver
 *   `seVePorLaVentanilla`—. Desde el asiento, o con la cara contra el cristal y mirando
 *   hacia él, que es lo que hace cualquiera para ver algo que queda un poco
 *   por delante o por detrás.
 * - **Sin relieve delante**: la línea de vista de siempre, con la curvatura.
 *   Ver `seVe` en `world/hitos.ts`.
 * - **Sin nube**: ni el ojo metido en una —todo blanco— ni la capa entre
 *   medias, contada con lo que se pinta lámina a lámina. Ver
 *   `transparenciaDeLaCapa` en `world/capa-de-nubes.ts`.
 * - **A distancia de distinguirse**: dentro de la bruma de hoy y del alcance
 *   del sitio, y por una ventanilla, más cerca todavía: lo que por un cristal
 *   de una cuarta es una mota, desde fuera y con el avión delante se ve.
 *
 * Y si por la ventanilla no se ve, **el avión desde fuera**: una toma desde
 * detrás y un poco a un lado, con el avión delante y el sitio al fondo, que
 * es lo que pidió Enrique —«habría que sacar una toma exterior»—. Ver
 * `tomaDelPaisaje`, que es la misma cuenta que pone la cámara en
 * `cameras/escena.ts`: lo que se comprueba es lo que se pinta.
 *
 * Todo en metros del mundo y con la Z hacia el sur, como el resto del juego.
 */

import { Quaternion, Vector3 } from "three";
import { asientoAnteVentanilla, type AsientoDePasaje, type VentanillaDePasaje } from "./asiento-de-pasaje";
import { seVe } from "./hitos";
import { seVePorLaVentanilla } from "./marco-de-ventanilla";

/** Un punto del mundo, m. */
export interface Punto {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * **Desde dónde se enseña un sitio**, de lo más de Ara a lo menos: por su
 * ventanilla desde el asiento, con la cara contra el cristal mirando hacia él, o el
 * avión por fuera con el sitio detrás.
 */
export type ComoSeVe = "ventanilla" | "asomado" | "fuera";

/** Lo que hace falta del mundo para saber qué se ve. */
export interface ElMundoQueSeMira {
  /** La cota del terreno, m; `null` donde nadie la sabe, que se toma como mar. */
  readonly suelo: (x: number, z: number) => number | null;
  /** Lo que deja ver la capa de nubes de un punto a otro, de 0 a 1. */
  readonly nubes: (desde: Punto, hasta: Punto) => number;
  /** Cuánto se está dentro de la nube en un punto, de 0 a 1. Ver `cuantoDentro`. */
  readonly dentro: (p: Punto) => number;
  /** La densidad de la bruma con el ojo a esa altitud, la de la niebla que se pinta. */
  readonly bruma: (y: number) => number;
}

/** El avión, como lo ve la cuenta: dónde está, cómo va girado y lo que mide. */
export interface ElAvionQueMira {
  readonly position: Vector3;
  readonly orientation: Quaternion;
  /** De morro a cola, m: el encuadre de la toma de fuera. */
  readonly largo: number;
}

/**
 * **Lo poco que tiene que llegar para que algo se distinga**, de 0 a 1: lo que
 * deja pasar la nube por lo que deja pasar la bruma. Menos de la mitad es lo
 * de una lámina entera de nube por medio y otra a medias, o la bruma de
 * cincuenta kilómetros a ras del mar: se adivina, no se ve.
 */
export const SE_DISTINGUE = 0.45;

/**
 * **Desde cuánta nube se está dentro**, de 0 a 1 de `cuantoDentro`: un tercio,
 * que es cuando la ventanilla ya se ve blanca. El mismo de la escena.
 */
export const DENTRO_DE_LA_NUBE = 0.35;

/**
 * **Hasta dónde se distingue algo por una ventanilla**, m, si el sitio no
 * dice otra cosa. Treinta kilómetros: el cristal mide una cuarta y está a
 * medio metro de los ojos, y más lejos el valle o el monte de la frase es una
 * mota. Lo grande —el Teide, una isla entera— lleva el suyo. Desde fuera, con
 * el avión delante y la pantalla entera de fondo, vale el alcance del sitio.
 */
export const POR_LA_VENTANILLA = 30_000;

/**
 * **La cara contra el cristal**, a cuánto quedan los ojos de él, m: lo de
 * `POSES_DE_ARA` en `asiento-de-ara.ts`.
 */
export const PEGADA_AL_CRISTAL = 0.21;

const GRADO = Math.PI / 180;

/**
 * **Hasta dónde gira la cabeza pegada al cristal**, rad: hacia delante o hacia
 * atrás, hacia arriba y hacia abajo. Los topes de la vista de pasaje —ver
 * `TOPES.pasaje` en `cameras/mirada.ts`—, que son lo que da de sí un cuello.
 */
export const GIRA_LA_CABEZA = { aLosLados: 50 * GRADO, arriba: 20 * GRADO, abajo: 40 * GRADO } as const;

/** El radio de la Tierra con el que se curva lo que se pinta, m. */
const RADIO = 6_371_000;

/**
 * **Lo que brilla un velo comparado con lo que tapa**: la nube y la bruma
 * delante de un sitio no solo le quitan luz, le ponen la suya encima.
 *
 * La nube es blanca y el mar o el monte de debajo, oscuros. Contado con el
 * mismo dibujo que se pinta, las cinco láminas del mar de nubes del alisio
 * dejan pasar de media tres cuartos de lo que tienen detrás —es un SCT, y casi
 * todo su dibujo es jirón— y aun así, desde arriba, la ventanilla se ve
 * blanca (captura `223-la-gomera-no-se-ve.png`): lo poco de nube que hay
 * brilla ocho veces lo que el mar. Lo que queda de un sitio tras un velo es su parte de la luz que
 * llega, y por eso la nube cuenta por ocho. La bruma es más tenue, y contra
 * ella una isla se recorta igual: dos y medio.
 */
export const BRILLA_LA_NUBE = 8;
export const BRILLA_LA_BRUMA = 2.5;

/**
 * **Lo que se distingue de un sitio desde un ojo**, de 0 a 1: cero si el ojo
 * está dentro de una nube o hay relieve por medio; si no, la parte de lo que
 * llega que es del sitio y no de la nube ni de la bruma que tiene delante. La
 * nube, con lo que se pinta lámina a lámina; la bruma, como la pinta la
 * tarjeta —`FogExp2`, que se lleva el cuadrado de la distancia por la
 * densidad—; y el sitio, donde se pinta, que con la Tierra curvada baja lo
 * que baja la curva. Ver `BRILLA_LA_NUBE`.
 */
export function claridad(ojo: Punto, sitio: Punto, mundo: ElMundoQueSeMira): number {
  if (mundo.dentro(ojo) >= DENTRO_DE_LA_NUBE) return 0;
  if (!seVe(ojo, sitio, mundo.suelo)) return 0;
  const d = Math.hypot(sitio.x - ojo.x, sitio.y - ojo.y, sitio.z - ojo.z);
  const plano = Math.hypot(sitio.x - ojo.x, sitio.z - ojo.z);
  const pintado = { x: sitio.x, y: sitio.y - (plano * plano) / (2 * RADIO), z: sitio.z };
  const espesor = mundo.bruma(ojo.y) * d;
  const bruma = Math.exp(-espesor * espesor);
  const nube = mundo.nubes(ojo, pintado);
  const delSitio = bruma * nube;
  return delSitio / (delSitio + bruma * (1 - nube) * BRILLA_LA_NUBE + (1 - bruma) * BRILLA_LA_BRUMA);
}

/**
 * **Lo que abarca la mirada hacia abajo**, como fracción de la distancia a lo
 * mirado: un cuadro de un 27 % de ella a cada lado, unos quince grados, que
 * es lo que cabe por una ventanilla con la cara contra el cristal.
 */
export const ABARCA_LA_MIRADA = 0.27;

/**
 * **Cuánto de lo que se mira tiene que ser nube para llamarlo mar de nubes**,
 * de 0 a 1: tres quintos. Con el mar de nubes del alisio —una tapadura de
 * 0,45— lo llena casi siempre, y con unas nubes sueltas —0,2— nunca.
 */
export const ES_UN_MAR_DE_NUBES = 0.6;

/**
 * **Si lo que se ve hacia abajo es un mar de nubes**, y no una nube suelta
 * que pasa por debajo de la mirada (H38m).
 *
 * «¡Mirá para abajo: nubes y más nubes, como un mar de algodón!» es la vista
 * entera, y se miraba una recta: la que va de los ojos a lo mirado, con lo
 * que deja pasar la capa por debajo de 0,85 y lo de debajo sin distinguirse.
 * Una recta sola falla por los dos lados. Desde FL160 mirando abajo a unos
 * nueve kilómetros, con el mar de nubes del alisio —0,45— una de cada cuatro
 * pasa por un jirón fino con la vista blanca alrededor; y con unas nubes
 * sueltas —0,2— una de cada seis cae en una, y como el mar de nubes de Ara
 * puede esperar a verse, lo acababa diciendo sobre un cielo casi limpio. Así
 * que se mira lo que cabe en la mirada —cinco por cinco puntos en un cuadro
 * alrededor de lo mirado, ver `ABARCA_LA_MIRADA`— con la misma regla de cada
 * recta, y tiene que ser nube en tres quintos de ellos: con el alisio sale
 * nueve veces de cada diez, con 0,7 siempre y con nubes sueltas nunca. Lo
 * midió el banco de la tercera escena con la captura delante: BKN a 1.520 m,
 * la recta de lo mirado por un jirón, y 162 de 178 rectas de la vista
 * blancas.
 */
export function seVeElMarDeNubes(ojo: Punto, mirado: Punto, mundo: ElMundoQueSeMira): boolean {
  const lejos = Math.hypot(mirado.x - ojo.x, mirado.y - ojo.y, mirado.z - ojo.z);
  const paso = (lejos * ABARCA_LA_MIRADA) / 2;
  let nube = 0;
  let puntos = 0;
  for (let i = -2; i <= 2; i++)
    for (let k = -2; k <= 2; k++) {
      const x = mirado.x + i * paso;
      const z = mirado.z + k * paso;
      const q = { x, y: Math.max(0, mundo.suelo(x, z) ?? 0), z };
      if (mundo.nubes(ojo, q) < 0.85 && claridad(ojo, q, mundo) < SE_DISTINGUE) nube++;
      puntos++;
    }
  return nube >= puntos * ES_UN_MAR_DE_NUBES;
}

/**
 * **Cuánto de lo que deja ver el cristal tiene que ser lo de debajo que se
 * nombra**, de 0 a 1: dos quintos, lo mismo que pide el banco al mar de nubes.
 * Lo de debajo no tiene que llenar la ventanilla como un mar de nubes —con la
 * góndola debajo del cristal, el mar ocupa la mitad de arriba (H59b)—, pero
 * tampoco vale una esquina: lo que asoma por un borde no es lo que se ve al
 * mirar abajo.
 */
export const SE_VE_LO_DE_DEBAJO = 0.4;

/**
 * **Cuánto se ve de lo de debajo** —el mar, la tierra—, de 0 a 1, por lo que
 * deja ver el cristal y no por un punto (H59b); `null` si por el cristal no se
 * ve nada de lo que se mira.
 *
 * Se miraba el punto adonde llegan los ojos y cuatro más a su alrededor, y con
 * la cara contra el cristal mirando abajo ese punto cae detrás de la góndola:
 * en el banco de la tercera escena, a los 1.607 s, el mar llenaba la mitad de
 * arriba de la ventanilla y el punto mirado era el motor, a 3,9 m. Con un
 * punto, lo que se nombra se juega a dónde cae la mirada, y nada impedía decir
 * «allá abajo está el mar» con el ala o la góndola tapándolo todo, que la
 * cuenta no sabía del avión. Así que se mira lo que cabe en la mirada, como el
 * mar de nubes —ver `seVeElMarDeNubes`—: cinco por cinco puntos en un cuadro
 * de un 27 % de la distancia a cada lado, alineado con la mirada, y de los que
 * caen por el cristal, cuántos son lo que se dice y se ven. Los que caen
 * fuera del cristal no son de la vista: son la pared.
 *
 * `porElCristal`, si un punto del suelo cae en lo que deja ver la ventanilla;
 * `loVe`, si ese punto es lo que se nombra —mar o tierra— y se ve: se
 * distingue y no lo tapa el propio avión.
 */
export function cuantoSeVeLoDeDebajo(
  ojo: Punto,
  mirado: Punto,
  suelo: (x: number, z: number) => number | null,
  porElCristal: (q: Punto) => boolean,
  loVe: (q: Punto) => boolean,
): number | null {
  const lejos = Math.hypot(mirado.x - ojo.x, mirado.y - ojo.y, mirado.z - ojo.z);
  const paso = (lejos * ABARCA_LA_MIRADA) / 2;
  // Alineado con la mirada: hacia delante, lo que se aleja; a los lados, lo de al lado.
  let fx = mirado.x - ojo.x;
  let fz = mirado.z - ojo.z;
  const n = Math.hypot(fx, fz);
  if (n < 1) {
    fx = 0;
    fz = -1;
  } else {
    fx /= n;
    fz /= n;
  }
  let vistos = 0;
  let enLaVista = 0;
  for (let i = -2; i <= 2; i++)
    for (let k = -2; k <= 2; k++) {
      const x = mirado.x + (k * fx - i * fz) * paso;
      const z = mirado.z + (k * fz + i * fx) * paso;
      // Un poco por encima, como los vecinos de `casiTodo` en `game.ts`: que no lo tape su propia ladera.
      const q = { x, y: Math.max(0, suelo(x, z) ?? 0) + 30, z };
      if (!porElCristal(q)) continue;
      enLaVista++;
      if (loVe(q)) vistos++;
    }
  return enLaVista ? vistos / enLaVista : null;
}

/** **Si se ve lo de debajo**: ver `cuantoSeVeLoDeDebajo` y `SE_VE_LO_DE_DEBAJO`. */
export function seVeLoDeDebajo(
  ojo: Punto,
  mirado: Punto,
  suelo: (x: number, z: number) => number | null,
  porElCristal: (q: Punto) => boolean,
  loVe: (q: Punto) => boolean,
): boolean {
  return (cuantoSeVeLoDeDebajo(ojo, mirado, suelo, porElCristal, loVe) ?? 0) >= SE_VE_LO_DE_DEBAJO;
}

/** Los ojos de un asiento, en el mundo. */
export function ojosEnElMundo(asiento: AsientoDePasaje, avion: ElAvionQueMira): Vector3 {
  return new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z)
    .applyQuaternion(avion.orientation)
    .add(avion.position);
}

/**
 * **Hacia dónde mira un asiento**, unitario, en el mundo: la cámara de pasaje
 * gira la guiñada y después el cabeceo, y mira por su −Z. Ver
 * `cameras/pasaje.ts`.
 */
export function miradaDe(asiento: AsientoDePasaje, avion: ElAvionQueMira): Vector3 {
  const giro = new Quaternion()
    .copy(avion.orientation)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), asiento.guinada))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), asiento.cabeceo));
  return new Vector3(0, 0, -1).applyQuaternion(giro);
}

/**
 * **La cara contra el cristal, mirando hacia un sitio**: el asiento de esa
 * ventanilla con la cabeza girada hacia él, hasta donde da el cuello. Si el
 * sitio queda más allá, se mira lo más que se puede, y la cuenta del cristal
 * dirá si así se ve. Ver `GIRA_LA_CABEZA`.
 */
export function asomadoHacia(
  ventanilla: VentanillaDePasaje,
  lado: "izquierda" | "derecha",
  sitio: Punto,
  avion: ElAvionQueMira,
): AsientoDePasaje {
  const s = lado === "izquierda" ? -1 : 1;
  // Desde el cristal, que es donde van a ir los ojos: la dirección casi no cambia.
  const cristal = new Vector3(ventanilla.centro.x, ventanilla.centro.y, ventanilla.centro.z)
    .applyQuaternion(avion.orientation)
    .add(avion.position);
  const d = new Vector3(sitio.x, sitio.y, sitio.z)
    .sub(cristal)
    .applyQuaternion(avion.orientation.clone().invert())
    .normalize();
  const abajo = Math.max(-GIRA_LA_CABEZA.arriba, Math.min(GIRA_LA_CABEZA.abajo, Math.asin(-d.y)));
  const atras = Math.max(-GIRA_LA_CABEZA.aLosLados, Math.min(GIRA_LA_CABEZA.aLosLados, Math.atan2(d.z, s * d.x)));
  return asientoAnteVentanilla(ventanilla, lado, atras, abajo, PEGADA_AL_CRISTAL);
}

/**
 * **Si desde ese asiento se ve el sitio por su cristal**, con la persiana
 * donde esté —`cortina`, lo que tapa desde arriba, m— y todo lo demás:
 * relieve, nube, bruma y distancia.
 */
export function seVeDesdeElAsiento(
  asiento: AsientoDePasaje,
  sitio: Punto,
  avion: ElAvionQueMira,
  mundo: ElMundoQueSeMira,
  hasta: number,
  cortina?: number,
): boolean {
  const ojo = ojosEnElMundo(asiento, avion);
  if (Math.hypot(sitio.x - ojo.x, sitio.z - ojo.z) > hasta) return false;
  if (!seVePorLaVentanilla(ojo, sitio, avion, asiento.ventanilla, cortina)) return false;
  return claridad(ojo, sitio, mundo) >= SE_DISTINGUE;
}

/**
 * **Dónde va la cámara de la toma del paisaje**: detrás del avión según se
 * mira hacia el sitio, un poco a un lado y algo por encima, para que el avión
 * quede delante, de tres cuartos, y el sitio al fondo y en el medio. La misma
 * cuenta pone la cámara —ver `cameras/escena.ts`— y dice si se ve: lo que se
 * comprueba es lo que se pinta.
 *
 * Detrás dos largos y medio del avión, a la derecha según se mira tres
 * cuartos de largo y medio largo por encima: con el JAZ 90, a unos setenta
 * metros. Desde ahí el avión cae a unos diecisiete grados del medio, dentro
 * de los cincuenta de la toma.
 */
export function tomaDelPaisaje(avion: ElAvionQueMira, sitio: Punto): { readonly camara: Vector3; readonly mira: Vector3 } {
  const p = avion.position;
  const largo = Math.max(10, avion.largo);
  let ux = sitio.x - p.x;
  let uz = sitio.z - p.z;
  const n = Math.hypot(ux, uz);
  if (n < 1) {
    ux = 0;
    uz = -1;
  } else {
    ux /= n;
    uz /= n;
  }
  const camara = new Vector3(
    p.x - ux * largo * 2.5 - uz * largo * 0.75,
    p.y + largo * 0.5,
    p.z - uz * largo * 2.5 + ux * largo * 0.75,
  );
  return { camara, mira: new Vector3(sitio.x, sitio.y, sitio.z) };
}

/** El ángulo de la toma del paisaje, grados. Ver `tomaDelPaisaje`. */
export const FOV_DEL_PAISAJE = 50;

/** **Si el sitio se ve en la toma de fuera**: sin nube en la cámara ni entre medias, y a su alcance. */
export function seVeDesdeFuera(sitio: Punto, avion: ElAvionQueMira, mundo: ElMundoQueSeMira, hasta: number): boolean {
  const { camara } = tomaDelPaisaje(avion, sitio);
  if (Math.hypot(sitio.x - camara.x, sitio.z - camara.z) > hasta) return false;
  // Ni con la cámara metida en el relieve, que pasa volando bajo al lado de una ladera.
  const suelo = mundo.suelo(camara.x, camara.z) ?? 0;
  if (camara.y < suelo + 5) return false;
  return claridad(camara, sitio, mundo) >= SE_DISTINGUE;
}

/**
 * **Por qué lado del avión cae un sitio**, con el rumbo de ahora: lo que va a
 * la izquierda del morro, a la izquierda. Es lo que dice la comandante —«los
 * que van del lado izquierdo»—, y se cuenta cuando se dice, no cuando se vio:
 * entre una cosa y otra el avión puede haber girado.
 */
export function ladoDe(sitio: Punto, avion: ElAvionQueMira): "izquierda" | "derecha" {
  const d = new Vector3(sitio.x - avion.position.x, 0, sitio.z - avion.position.z).applyQuaternion(
    avion.orientation.clone().invert(),
  );
  return d.x < 0 ? "izquierda" : "derecha";
}
