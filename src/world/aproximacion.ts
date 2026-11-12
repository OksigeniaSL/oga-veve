/**
 * Las luces que enseñan a aterrizar sin decir una palabra.
 *
 * Son dos cosas, y las dos existen por el mismo motivo: **un niño de cuatro
 * años no lee**. No puede mirar un altímetro, no sabe qué es una senda de
 * planeo y «tres grados» no le dice nada. Pero el color sí lo entiende, y la
 * línea de luces que apunta a la pista la entiende cualquiera.
 *
 * La primera son las luces de aproximación: una fila de luces blancas sobre la
 * prolongación del eje, antes del umbral, con una barra cruzada a trescientos
 * metros. Desde el aire son una flecha que dice *por aquí*. En un aeropuerto
 * de verdad están para eso mismo, y por eso son lo primero que se ve de noche
 * o con niebla: mucho antes de ver la pista, se ve el camino a la pista.
 *
 * La segunda es el PAPI, y es el instrumento más bonito que tiene la aviación:
 * cuatro luces al costado, cada una regulada a un ángulo distinto. Si vienes
 * alto las ves blancas, si vienes bajo las ves rojas, y si vienes bien ves dos
 * y dos. No hay número, no hay texto, no hay que saber nada. Rojo abajo,
 * blanco arriba, dos y dos es que vas bien. Y en los campos pequeños, su
 * hermano corto, el APAPI: dos luces, y bien es una de cada.
 *
 * Y hay un dicho entre pilotos para acordarse de lo que significa el rojo:
 * *red over red, you're dead*. Cuatro rojas quiere decir que vienes por debajo
 * de la senda, y por debajo de la senda es donde están los cerros.
 *
 * **Las dos, solo donde las hay.** No todas las cabeceras tienen PAPI ni luces
 * de aproximación, y las que las tienen no las tienen iguales: novecientos
 * metros de categoría II/III en las de llegar de Barajas, nada en las de
 * despegar.
 * Se monta lo que publica el AIP de cada cabecera, y nada donde no se sabe:
 * ver `sendas-publicadas.ts`.
 */

import {
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import type { Pista, Punto, Umbral } from "./aerodrome";
import { PAPI_SE_DISTINGUE_PX, PAPI_SE_VE_DESDE } from "../flight/lo-que-se-nombra";
import type { AyudasVisualesPublicadas, LucesDeAproximacion } from "./sendas-publicadas";

/** Un umbral del que sí sabemos dónde está. */
type Situado = Umbral & { readonly xy: Punto };

/**
 * **Los cuatro ángulos del PAPI**, en grados, de la luz de junto a la pista a
 * la de fuera, para una senda de `senda` grados: treinta y diez minutos por
 * encima y por debajo de ella, que es como se reglan las cuatro unidades, **la
 * más alta junto a la pista** (OACI, Doc 9157, *Manual de diseño de
 * aeródromos*, parte 4, 8.3.5 y tabla 8-1). Para tres grados, 3°30', 3°10',
 * 2°50' y 2°30'; para los 3,7° de la 21 de Lanzarote, de 4°12' a 3°12'. Ver
 * `sendas-publicadas.ts`.
 *
 * **Y el orden es lo que se ve.** Bajando, la primera que se pone roja es la
 * de más arriba, que es la de junto a la pista; en la senda, las dos rojas
 * van junto a la pista y las dos blancas por fuera. Estaba al revés, con la
 * de junto a la pista reglada la más baja: en la final se veían las rojas
 * por fuera, al contrario que en cualquier aeropuerto y que en la figura del
 * PAPI del propio juego (`ui/figuras/papi.ts`).
 */
export function angulosDelPapi(senda = 3): readonly number[] {
  return angulosDelIndicador(senda, 4);
}

/**
 * **Los ángulos de las luces de un PAPI o de un APAPI**, de la de junto a la
 * pista a la de fuera. Las cuatro del PAPI, en `angulosDelPapi`; las dos del
 * APAPI, quince minutos por encima y por debajo de la senda: 3°15' y 2°45'
 * para tres grados (Doc 9157, parte 4, 8.3.6 y tabla 8-1).
 */
export function angulosDelIndicador(senda: number, unidades: 2 | 4): readonly number[] {
  return unidades === 2
    ? [senda + 0.25, senda - 0.25]
    : [senda + 0.5, senda + 1 / 6, senda - 1 / 6, senda - 0.5];
}

/**
 * Cuántas luces se ven blancas desde un ángulo dado: de 0 a 4 en un PAPI, de
 * 0 a 2 en un APAPI.
 *
 * Es **la lectura del PAPI**, y la usan dos: las luces del mundo, para
 * pintarse, y la pantalla, para explicarlas. Tiene que salir de un solo sitio
 * o acabarían diciendo cosas distintas del mismo avión.
 *
 * Todas blancas es venir alto; todas rojas, bajo; la mitad de cada, en la
 * senda: dos y dos en el PAPI, una y una en el APAPI. Ver `enLaSenda`. La
 * unidad de fuera es la del ángulo más pequeño, así que las blancas se
 * cuentan desde ella hacia la pista.
 */
export function blancasDePapi(grados: number, senda = 3, unidades: 2 | 4 = 4): number {
  return angulosDelIndicador(senda, unidades).filter((a) => grados >= a).length;
}

/** Cuántas blancas son la senda: la mitad de las luces. Dos en el PAPI, una en el APAPI. */
export function blancasEnLaSenda(unidades: 2 | 4 = 4): number {
  return unidades / 2;
}

/** Blanco de luz y rojo de luz. Ni uno ni otro son el blanco y el rojo del HUD. */
const BLANCO = 0xfff4e2;
const ROJO = 0xe8402c;

/** Separación entre luces de la fila, que es la de verdad. */
const PASO_APROXIMACION = 30;
/** A qué distancia va la barra cruzada. */
const BARRA = 300;
/**
 * Hasta dónde llegan las filas rojas de los lados en las de categoría II/III,
 * m del umbral, y a cuánto del eje va su luz de dentro: «not less than 18 m
 * nor more than 22.5 m, and preferably 18 m» entre las dos de dentro (OACI,
 * Anexo 14, las de categoría II y III), que son las de la zona de toma.
 */
const FILAS_ROJAS_HASTA = 270;
const FILA_ROJA_DEL_EJE = 9;

/**
 * **A cuántos metros del umbral va cada barra cruzada**: las que publique el
 * AIP, o las de su sistema —la de trescientos metros, y en las de categoría
 * II/III otra a ciento cincuenta—, y solo las que caben en el largo de la
 * fila: una barra más allá de la última luz no la hay.
 */
export function barrasDe(luces: LucesDeAproximacion): readonly number[] {
  const suyas =
    luces.barras ?? (luces.sistema === "precision2" ? [150, BARRA] : [BARRA]);
  return suyas.filter((d) => d <= luces.largo);
}

/**
 * **El medio ancho de una barra cruzada**, m: quince a trescientos metros, que
 * es la de treinta de la OACI, y más ancha cuanto más lejos. Es la cuenta que
 * casa con las cinco barras Calvert de las 03 de Gran Canaria mapeadas en
 * OpenStreetMap —once, quince, diecinueve, veintidós y veintisiete metros a
 * cada lado—, y de lejos hace que todas se vean más o menos igual de anchas.
 */
export function medioAnchoDeLaBarra(d: number): number {
  return 7.5 + d / 40;
}

/**
 * Y las medidas del PAPI cuando hay que calcularlo, sacadas de las de verdad.
 *
 * En La Palma, que es el único de los nuestros que trae las dieciséis luces
 * etiquetadas en OpenStreetMap, están a 297 m del umbral 18 y a 284 del 36, y
 * los cuatro focos caen a 37, 46, 55 y 63 m del eje sobre una pista de 45 de
 * ancha. O sea: unos quince metros por fuera del borde y nueve entre foco y
 * foco. Es lo que se calcula aquí cuando el fichero no dice dónde están.
 */
const PAPI_ADENTRO = 300;
const PAPI_DEL_BORDE = 15;
const PAPI_SEPARACION = 9;
/**
 * Y las del APAPI: la luz de dentro a diez metros del borde de la pista y seis
 * entre las dos (Doc 9157, parte 4, 8.3.2 y 8.3.3).
 */
const APAPI_DEL_BORDE = 10;
const APAPI_SEPARACION = 6;

/** El radio de cada luz del PAPI dibujada a su tamaño, m. */
const RADIO_DE_LUZ_DEL_PAPI = 1.1;

/**
 * **Lo menos que mide cada luz del PAPI en la pantalla**, px de diámetro: tres,
 * que es un punto de luz que se ve sin buscarlo y deja dos píxeles de hueco
 * entre una y otra cuando la fila mide `PAPI_SE_DISTINGUE_PX`.
 */
export const LUZ_DEL_PAPI_COMO_POCO_PX = 3;

/** Cuánto se agranda el PAPI para verse de lejos. Ver `escalaDelPapi`. */
export interface EscalaDelPapi {
  /** Lo que se alarga la fila, desde la luz de dentro hacia fuera. */
  readonly fila: number;
  /** Lo que se agranda cada luz. */
  readonly luz: number;
}

/**
 * **El PAPI se ve de lejos, como el de verdad**: «these lights are visible
 * from about 5 miles during the day» (FAA, *Aeronautical Information
 * Manual*, 2-1-2 b). Dibujadas a su tamaño —esferas de un metro largo a nueve
 * metros una de otra—, aquí solo se distinguían en los últimos novecientos
 * metros, con los quinientos pies ya pasados, y la frase de «las cuatro luces
 * de al lado de la pista» casi no llegaba a sonar (277).
 *
 * No es que las luces fueran pequeñas: es que **el ojo y la pantalla no ven lo
 * mismo**. A cinco millas, nueve metros son casi cuatro minutos de arco, y un
 * ojo separa uno; un píxel de una pantalla de 720 con sesenta y dos grados de
 * campo son más de cinco. El ojo de quien vuela cuenta cuatro luces donde la
 * pantalla pinta una. Es lo mismo que con los aviones del tráfico —ver
 * `world/se-ve-de-lejos.ts`— y se resuelve igual, simplificando el dibujo y
 * no lo que dice:
 *
 * - **cada luz, un punto de al menos `LUZ_DEL_PAPI_COMO_POCO_PX`**, que es lo
 *   que es una luz de lejos;
 * - **y la fila, larga lo que haga falta para contarlas**: al menos
 *   `PAPI_SE_DISTINGUE_PX` de la primera a la última. Se alarga desde la luz
 *   de dentro hacia fuera, así que nunca se mete en la pista.
 *
 * El color de cada una sigue saliendo de su sitio de verdad y su ángulo de
 * verdad —ver `mirarDesde`—: de lejos se dibuja más grande, pero dice lo
 * mismo que diría a su tamaño. De cerca, a su tamaño. Y pasadas las cinco
 * millas del AIM, vuelve a él poco a poco: más allá, de día, no se ve.
 *
 * @param distancia del ojo al centro de las luces, m
 * @param pixelesPorRadian los de la pantalla. Ver `pixelesPorRadian` en
 *   `world/se-ve-de-lejos.ts`.
 */
export function escalaDelPapi(
  distancia: number,
  pixelesPorRadian: number,
  fila = 3 * PAPI_SEPARACION,
  radio = RADIO_DE_LUZ_DEL_PAPI,
): EscalaDelPapi {
  if (!(distancia > 0) || !(pixelesPorRadian > 0) || fila <= 0) return { fila: 1, luz: 1 };
  const filaPx = (fila / distancia) * pixelesPorRadian;
  const luzPx = ((2 * radio) / distancia) * pixelesPorRadian;
  const sFila = Math.max(1, PAPI_SE_DISTINGUE_PX / filaPx);
  const sLuz = Math.max(1, LUZ_DEL_PAPI_COMO_POCO_PX / luzPx);
  // Entera hasta las cinco millas, y de ahí a su tamaño en una milla más.
  const queda = Math.max(0, Math.min(1, (1.2 * PAPI_SE_VE_DESDE - distancia) / (0.2 * PAPI_SE_VE_DESDE)));
  return { fila: 1 + (sFila - 1) * queda, luz: 1 + (sLuz - 1) * queda };
}

/** Una ayuda visual del fichero del aeródromo. */
export interface AyudaVisual {
  readonly tipo: string | null;
  readonly xy: Punto;
}

/** Dónde acaban las luces, y si eso se midió o se dedujo. */
export interface SitioDelPapi {
  /** Las cuatro, o las dos del APAPI, de la más cercana al eje a la más lejana. */
  readonly luces: readonly Punto[];
  readonly origen: "osm" | "calculado";
}

/**
 * Dónde va el PAPI de este umbral: donde OpenStreetMap dice, o donde toca.
 *
 * ## Por qué esto no se puede adivinar
 *
 * El PAPI no está siempre a la misma distancia ni siempre al mismo lado.
 * Cuatro Vientos lo tiene a **162 m** del umbral 27, no a trescientos; La
 * Palma lo tiene a los dos costados. Cuando el dato existe, ponerlo donde está
 * de verdad no es un detalle de decoración: es que la senda que enseña sea la
 * senda de esa pista.
 *
 * ## Y por qué se mira el valor de la etiqueta y no el nodo
 *
 * Tenerife Norte trae veinticinco nodos `aeroway=navigationaid` **sin valor**,
 * alineados en una barra de cuarenta metros a 225 del umbral 30: son luces de
 * aproximación, no un PAPI. Tomarlos por PAPI pondría cuatro focos donde no
 * hay ninguno y le enseñaría a un chico una senda de planeo inventada. Sin
 * `tipo`, no se toca.
 *
 * Tres casos, y los tres salen del mismo sitio:
 *
 * - **Cuatro o más nodos de un costado**: son las luces, una por una.
 * - **Uno o dos**: el nodo dice el costado y la distancia, que es lo que no se
 *   podía saber; la separación entre focos se completa con la de siempre.
 * - **Ninguno**: se calcula, como hasta hoy.
 */
export function sitiarPapi(
  entrada: Punto,
  eje: readonly [number, number],
  ancho: number,
  largo: number,
  ayudas: readonly AyudaVisual[] = [],
  /**
   * Si su AIP lo pone **solo a la derecha**, como la 12 de Tenerife Norte. Es
   * el costado que se calcula cuando el fichero no trae las luces; si las
   * trae, mandan ellas.
   */
  aLaDerecha = false,
  /** Cuatro luces, o las dos de un APAPI. */
  unidades: 2 | 4 = 4,
): SitioDelPapi {
  const [ux, uy] = eje;
  // A la izquierda vista desde la aproximación, que es donde va un PAPI solo.
  const izquierda: Punto = [-uy, ux];
  const separacion = unidades === 2 ? APAPI_SEPARACION : PAPI_SEPARACION;
  const delBorde = unidades === 2 ? APAPI_DEL_BORDE : PAPI_DEL_BORDE;

  const calculada = (adentro: number, sitio: number, signo: number): Punto[] =>
    Array.from({ length: unidades }, (_, k) => {
      const lado = signo * (sitio + k * separacion);
      return [
        entrada[0] + ux * adentro + izquierda[0] * lado,
        entrada[1] + uy * adentro + izquierda[1] * lado,
      ] as Punto;
    });

  const porDefecto: SitioDelPapi = {
    luces: calculada(PAPI_ADENTRO, ancho / 2 + delBorde, aLaDerecha ? -1 : 1),
    origen: "calculado",
  };

  /*
   * Solo la mitad de la pista que toca. Sin este tope, el PAPI del umbral
   * contrario —que está a mil novecientos metros y mirando al revés— entra en
   * la cuenta y el aeródromo se llena de luces que no van a ninguna parte.
   */
  const hastaDonde = Math.min(900, largo / 2);
  const cerca = ayudas
    .filter((a) => a.tipo === "papi")
    .map((a) => {
      const px = a.xy[0] - entrada[0];
      const py = a.xy[1] - entrada[1];
      return {
        xy: a.xy,
        adentro: px * ux + py * uy,
        lado: px * izquierda[0] + py * izquierda[1],
      };
    })
    .filter(
      (a) =>
        a.adentro > 30 &&
        a.adentro < hastaDonde &&
        Math.abs(a.lado) > ancho / 2 &&
        Math.abs(a.lado) < 200,
    );
  if (!cerca.length) return porDefecto;

  // Si están a los dos costados —La Palma— manda el izquierdo, que es el que
  // se mira desde la aproximación y el que sigue teniendo cualquier pista con
  // uno solo.
  const izq = cerca.filter((a) => a.lado > 0);
  const der = cerca.filter((a) => a.lado < 0);
  const grupo = izq.length >= der.length ? izq : der;
  const signo = grupo === izq ? 1 : -1;
  grupo.sort((a, b) => Math.abs(a.lado) - Math.abs(b.lado));

  if (grupo.length >= unidades) {
    return { luces: grupo.slice(0, unidades).map((a) => a.xy), origen: "osm" };
  }

  /*
   * Con uno o dos nodos no hay cuatro luces que copiar, pero sí está lo que
   * no se podía calcular: **de qué costado y a cuántos metros**. El resto se
   * completa con la separación de siempre, y el nodo se toma por la luz de
   * dentro, que es equivocarse hacia fuera y no hacia la pista.
   */
  const adentro = grupo.reduce((suma, a) => suma + a.adentro, 0) / grupo.length;
  return {
    luces: calculada(adentro, Math.abs(grupo[0]!.lado), signo),
    origen: "osm",
  };
}

export interface Aproximacion {
  readonly grupo: Group;
  /**
   * Recolorea el PAPI para quien mire desde ahí.
   *
   * Se llama cada fotograma con la posición del avión. Es lo único de este
   * módulo que cambia: las luces de aproximación se ponen una vez y se quedan.
   */
  mirarDesde(x: number, y: number, z: number): void;
  /**
   * **Dibuja el PAPI para que se vea desde el ojo**, en las coordenadas de
   * este grupo: de lejos, más grande de lo que es, para que se distinga como
   * lo distingue un ojo. Se llama cada fotograma con la cámara ya puesta. No
   * toca los colores: esos los pone `mirarDesde` desde las luces de verdad.
   * Ver `escalaDelPapi`.
   */
  verDesde(x: number, y: number, z: number, pixelesPorRadian: number): void;
  /**
   * A cuántos metros del umbral están las luces, pista adentro. Del umbral de
   * aterrizar, que con el umbral desplazado no es la punta.
   *
   * **Es el origen de la senda, y hacía falta sacarlo de aquí.** El PAPI define
   * la senda de tres grados **desde donde están sus luces**, no desde el
   * umbral, y por eso una aproximación bien hecha cruza el umbral a quince o
   * dieciséis metros de altura en vez de rozarlo: eso es la altura de cruce de
   * umbral, y es la de verdad.
   *
   * Los aros y el hilo la dibujaban desde el umbral con altura cero, así que
   * enseñaban una senda **más baja** que la del PAPI del mundo: volando por el
   * centro de los aros, el PAPI veía 2,74° en el primero y bajaba a 2,02° en
   * los últimos —cuatro luces rojas— mientras los aros decían que se iba
   * perfecto. Tres sendas en la misma pantalla y ninguna de acuerdo.
   *
   * Sale de donde de verdad estén las luces: si el fichero del aeródromo las
   * trae mapeadas, de ahí; si no, de la medida normalizada. En Cuatro Vientos
   * están a 162 m y en La Palma a 297, y esos ciento treinta y cinco metros de
   * diferencia son siete de altura sobre el umbral.
   *
   * Sin PAPI, la medida normalizada, que es más o menos donde empieza la senda
   * de un ILS y donde están las señales de punto de visada.
   */
  readonly papiAdentro: number;
  /**
   * El ángulo al que va reglado el PAPI, grados, o `null` si esta cabecera no
   * tiene. Ver `sendas-publicadas.ts`.
   */
  readonly senda: number | null;
  /**
   * **Cuántas luces tiene**: cuatro el PAPI, dos el APAPI, y ninguna si la
   * cabecera no tiene ni lo uno ni lo otro. La senda es la mitad blancas: ver
   * `blancasEnLaSenda`.
   */
  readonly unidades: 0 | 2 | 4;
  dispose(): void;
}

/**
 * Monta las luces de aproximación y el PAPI de una pista, **los que publica su
 * AIP en esa cabecera** y ninguno más: ver `ayudasVisuales` en
 * `sendas-publicadas.ts`. Si no tiene ni lo uno ni lo otro, nada.
 *
 * `altura` tiene que ser el suelo **de verdad** —el de la fotografía si la
 * hay—, y por eso esto se construye después de moldear el terreno y no con el
 * resto del aeródromo. Las luces de borde que se montan antes acaban enterradas
 * cuarenta y siete metros cuando llega el datum de la foto; estas no, porque
 * llegan después de que el suelo sea el que es.
 */
export function crearAproximacion(
  pista: Pista,
  cabecera: string | null,
  altura: (p: Punto) => number,
  ayudas: readonly AyudaVisual[],
  /** Lo que publica el AIP de esa cabecera. Ver `sendas-publicadas.ts`. */
  publicado: AyudasVisualesPublicadas,
): Aproximacion | null {
  const senda = publicado.papi;
  const deAproximacion = publicado.luces;
  if (senda === null && !deAproximacion) return null;
  const unidades: 2 | 4 = publicado.apapi ? 2 : 4;
  const ANGULOS = angulosDelIndicador(senda ?? 3, unidades);
  const conNombre = Object.entries(pista.thresholds).filter(
    (e): e is [string, Situado] => e[1] !== null && e[1].xy !== null,
  );
  if (conNombre.length < 2) return null;

  /*
   * El umbral por el que se entra. Si no se dice cuál, el primero: lo que
   * importa es que las luces estén en **una** cabecera y no repartidas entre
   * las dos. Pero si se dice y la pista no la tiene, nada: lo publicado es de
   * esa cabecera y no de la otra.
   */
  const i = cabecera ? conNombre.findIndex(([n]) => n === cabecera) : 0;
  if (i < 0) return null;
  const [, entrada] = conNombre[i]!;
  const [, salida] = conNombre[i === 0 ? 1 : 0]!;

  const [ux, uy] = (() => {
    const dx = salida.xy[0] - entrada.xy[0];
    const dy = salida.xy[1] - entrada.xy[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l] as const;
  })();

  const ancho = pista.widthM ?? 45;
  const largo = Math.hypot(
    salida.xy[0] - entrada.xy[0],
    salida.xy[1] - entrada.xy[1],
  );
  /*
   * **Y desde el umbral de aterrizar, que no siempre es la punta.**
   *
   * Con el umbral desplazado, las luces de aproximación llevan al sitio donde
   * se puede tocar —las del trozo de pista de antes van empotradas en el
   * asfalto, a ras— y el PAPI se calibra desde ahí: en la 01 de Fuerteventura,
   * mil metros pista adentro. Contadas desde la punta, las dos enseñaban a
   * posarse en la zona de las flechas, que es justo donde no se puede. Ver
   * `umbral-desplazado.ts`.
   */
  const desplazado = Math.max(
    0,
    Math.min(entrada.displacedM ?? 0, largo / 2),
  );
  const toma: Punto = [
    entrada.xy[0] + ux * desplazado,
    entrada.xy[1] + uy * desplazado,
  ];
  const cotaUmbral = altura(toma);
  const grupo = new Group();
  grupo.name = "aproximacion";

  /*
   * Las luces van al nivel del umbral, no al del suelo que tengan debajo.
   *
   * Es lo que se hace de verdad: en Tenerife Norte el terreno se cae por
   * delante de la 12 y las luces van sobre torres, precisamente para que la
   * fila quede plana y alineada con la pista. Una fila que siguiera el terreno
   * no sería una guía, sería una cuesta de bombillas.
   */
  const m = new Matrix4();
  /** Una fila de luces de un color, en una sola llamada de dibujo. */
  const montarFila = (
    nombre: string,
    color: number,
    puntos: readonly (readonly [number, number, number])[],
  ): void => {
    if (!puntos.length) return;
    const fila = new InstancedMesh(
      new SphereGeometry(0.75, 6, 4),
      new MeshBasicMaterial({ color }),
      puntos.length,
    );
    fila.name = nombre;
    puntos.forEach((p, k) => {
      m.makeTranslation(p[0], p[1], p[2]);
      fila.setMatrixAt(k, m);
    });
    grupo.add(fila);
  };

  if (deAproximacion) {
    const blancas: [number, number, number][] = [];
    const rojas: [number, number, number][] = [];
    /** Una luz a `d` metros del umbral hacia fuera y `lado` del eje. */
    const ponerLuz = (
      donde: [number, number, number][],
      d: number,
      lado: number,
    ): void => {
      // Hacia fuera del umbral: al contrario del eje, que apunta pista adentro.
      const x = toma[0] - ux * d - uy * lado;
      const y = toma[1] - uy * d + ux * lado;
      donde.push([x, Math.max(cotaUmbral, altura([x, y])) + 0.6, -y]);
    };

    // El largo que publica su AIP: de 210 m en la 21L de Gran Canaria a 900.
    for (let d = PASO_APROXIMACION; d <= deAproximacion.largo; d += PASO_APROXIMACION) {
      // Tres por travesaño, que es lo que hace legible la fila desde lejos.
      for (const lado of [-3, 0, 3]) ponerLuz(blancas, d, lado);
    }
    // Las barras cruzadas: la referencia de alineación, y las que dicen cuánto falta.
    for (const d of barrasDe(deAproximacion)) {
      for (let k = 1; 2 * k <= medioAnchoDeLaBarra(d); k++) {
        ponerLuz(blancas, d, 2 * k);
        ponerLuz(blancas, d, -2 * k);
      }
    }
    /*
     * Y en las de categoría II/III, las dos filas de barras rojas a los lados,
     * de tres luces a metro y medio, en línea con las de la zona de toma.
     */
    if (deAproximacion.sistema === "precision2") {
      const hasta = Math.min(FILAS_ROJAS_HASTA, deAproximacion.largo);
      for (let d = PASO_APROXIMACION; d <= hasta; d += PASO_APROXIMACION) {
        for (const signo of [-1, 1])
          for (let k = 0; k < 3; k++) ponerLuz(rojas, d, signo * (FILA_ROJA_DEL_EJE + 1.5 * k));
      }
    }
    montarFila("luces-aproximacion", BLANCO, blancas);
    montarFila("luces-aproximacion-rojas", ROJO, rojas);
  }

  /*
   * El PAPI, a trescientos metros pista adentro y al costado izquierdo visto
   * desde la aproximación, que es donde va; o donde lo diga el fichero, o a
   * la derecha si su AIP lo pone ahí. Solo si lo tiene.
   */
  const sitio =
    senda === null
      ? null
      : sitiarPapi(toma, [ux, uy], ancho, largo - desplazado, ayudas, publicado.papiALaDerecha, unidades);
  const papi = sitio
    ? new InstancedMesh(
        new SphereGeometry(RADIO_DE_LUZ_DEL_PAPI, 8, 6),
        new MeshBasicMaterial(),
        unidades,
      )
    : null;
  /*
   * Las cuatro, o las dos, en el orden que importa: la más cerca del eje es la
   * del ángulo más alto. Así, en la senda, las de junto a la pista salen rojas
   * y las de fuera blancas. Ver `angulosDelPapi`.
   */
  const luces: { x: number; y: number; z: number }[] = [];
  if (sitio && papi) {
    papi.name = "papi";
    sitio.luces.forEach(([cx, cy], k) => {
      const y = Math.max(cotaUmbral, altura([cx, cy])) + 1;
      luces.push({ x: cx, y, z: -cy });
      m.makeTranslation(cx, y, -cy);
      papi.setMatrixAt(k, m);
    });
    grupo.add(papi);
  }

  /*
   * **Y dibujadas para verse de lejos**: ver `escalaDelPapi`. Lo que se mueve
   * es el dibujo; `luces` se queda con el sitio de verdad, que es desde donde
   * se cuenta el ángulo de cada una.
   */
  const centroDelPapi = new Vector3();
  for (const l of luces) centroDelPapi.add(new Vector3(l.x, l.y, l.z));
  if (luces.length) centroDelPapi.divideScalar(luces.length);
  const filaDelPapi =
    luces.length > 1
      ? Math.hypot(luces[luces.length - 1]!.x - luces[0]!.x, luces[luces.length - 1]!.z - luces[0]!.z)
      : 0;
  const sinGiro = new Quaternion();
  const dondeVa = new Vector3();
  const tamano = new Vector3();
  let escalaPuesta: EscalaDelPapi = { fila: 1, luz: 1 };
  const verDesde = (x: number, y: number, z: number, pixelesPorRadian: number): void => {
    const primera = luces[0];
    if (!primera || !papi) return;
    const e = escalaDelPapi(
      Math.hypot(x - centroDelPapi.x, y - centroDelPapi.y, z - centroDelPapi.z),
      pixelesPorRadian,
      filaDelPapi,
    );
    // Mover cuatro matrices cuesta poco, pero sin cambio no se mueve ninguna.
    if (
      Math.abs(e.fila - escalaPuesta.fila) < 0.01 * escalaPuesta.fila &&
      Math.abs(e.luz - escalaPuesta.luz) < 0.01 * escalaPuesta.luz
    )
      return;
    escalaPuesta = e;
    const radio = RADIO_DE_LUZ_DEL_PAPI * e.luz;
    luces.forEach((l, k) => {
      const lx = primera.x + (l.x - primera.x) * e.fila;
      const lz = primera.z + (l.z - primera.z) * e.fila;
      /*
       * Sobre su suelo, y con la luz agrandada entera por encima de él: una
       * esfera de veinte metros puesta a un metro del suelo se vería media,
       * enterrada. Lo que sube su centro, a cinco millas, no llega a dos
       * píxeles.
       */
      const suelo = e.fila === 1 ? l.y - 1 : Math.max(cotaUmbral, altura([lx, -lz]));
      dondeVa.set(lx, Math.max(l.y, suelo + radio), lz);
      m.compose(dondeVa, sinGiro, tamano.setScalar(e.luz));
      papi.setMatrixAt(k, m);
    });
    papi.instanceMatrix.needsUpdate = true;
    // La esfera que la cámara usa para saber si se ve, con las luces donde van ahora.
    papi.computeBoundingSphere();
  };

  const tono = new Color();
  const mirarDesde = (x: number, y: number, z: number): void => {
    if (!papi) return;
    for (let k = 0; k < unidades; k++) {
      const l = luces[k]!;
      const suelo = Math.hypot(x - l.x, z - l.z);
      /*
       * Pegado a la luz no hay ángulo que valga —la cuenta se dispara— así que
       * de cerca se dejan como se quedaron. A un kilómetro y medio ya se ve.
       */
      const angulo =
        suelo < 50 ? ANGULOS[k]! : (Math.atan2(y - l.y, suelo) * 180) / Math.PI;
      papi.setColorAt(k, tono.setHex(angulo >= ANGULOS[k]! ? BLANCO : ROJO));
    }
    if (papi.instanceColor) papi.instanceColor.needsUpdate = true;
  };
  mirarDesde(0, cotaUmbral + 100, 0);

  /*
   * A cuánto del umbral están las luces, medido sobre el eje de la pista.
   *
   * **Medido y no supuesto**: en Cuatro Vientos el fichero las trae a 162 m y en
   * La Palma a 297, y esos ciento treinta y cinco metros son siete de altura
   * sobre el umbral. Ver `papiAdentro`.
   */
  const papiAdentro =
    sitio && sitio.luces.length > 0
      ? Math.abs(
          (sitio.luces[0]![0] - toma[0]) * ux +
            (sitio.luces[0]![1] - toma[1]) * uy,
        )
      : PAPI_ADENTRO;

  return {
    grupo,
    mirarDesde,
    verDesde,
    papiAdentro,
    senda,
    unidades: sitio ? unidades : 0,
    dispose() {
      grupo.traverse((o) => {
        const g = (o as { geometry?: BufferGeometry }).geometry;
        g?.dispose();
        const mat = (o as { material?: { dispose(): void } }).material;
        mat?.dispose();
      });
    },
  };
}
