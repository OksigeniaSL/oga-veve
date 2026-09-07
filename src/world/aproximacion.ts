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
 * blanco arriba, dos y dos es que vas bien.
 *
 * Y hay un dicho entre pilotos para acordarse de lo que significa el rojo:
 * *red over red, you're dead*. Cuatro rojas quiere decir que vienes por debajo
 * de la senda, y por debajo de la senda es donde están los cerros.
 */

import {
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";
import type { Pista, Punto, Umbral } from "./aerodrome";

/** Un umbral del que sí sabemos dónde está. */
type Situado = Umbral & { readonly xy: Punto };

/** Los cuatro ángulos del PAPI, en grados, del más cerca de la pista al más lejos. */
const ANGULOS = [2.5, 2.8333, 3.1667, 3.5];

/**
 * Cuántas de las cuatro luces se ven blancas desde un ángulo dado, de 0 a 4.
 *
 * Es **la lectura del PAPI**, y la usan dos: las luces del mundo, para
 * pintarse, y la pantalla, para explicarlas. Tiene que salir de un solo sitio
 * o acabarían diciendo cosas distintas del mismo avión.
 *
 * Cuatro blancas es venir alto; cuatro rojas, bajo; dos y dos, en la senda. La
 * unidad más cercana a la pista es la del ángulo más pequeño, así que las
 * blancas se cuentan desde ella hacia fuera.
 */
export function blancasDePapi(grados: number): number {
  return ANGULOS.filter((a) => grados >= a).length;
}

/** Blanco de luz y rojo de luz. Ni uno ni otro son el blanco y el rojo del HUD. */
const BLANCO = 0xfff4e2;
const ROJO = 0xe8402c;

/** Hasta dónde llega la fila de luces por delante del umbral. */
const LARGO_APROXIMACION = 420;
/** Separación entre luces de la fila, que es la de verdad. */
const PASO_APROXIMACION = 30;
/** A qué distancia va la barra cruzada. */
const BARRA = 300;

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

/** Una ayuda visual del fichero del aeródromo. */
export interface AyudaVisual {
  readonly tipo: string | null;
  readonly xy: Punto;
}

/** Dónde acaban las cuatro luces, y si eso se midió o se dedujo. */
export interface SitioDelPapi {
  /** Las cuatro, de la más cercana al eje a la más lejana. */
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
): SitioDelPapi {
  const [ux, uy] = eje;
  // A la izquierda vista desde la aproximación, que es donde va un PAPI solo.
  const izquierda: Punto = [-uy, ux];

  const calculada = (adentro: number, sitio: number, signo: number): Punto[] =>
    Array.from({ length: 4 }, (_, k) => {
      const lado = signo * (sitio + k * PAPI_SEPARACION);
      return [
        entrada[0] + ux * adentro + izquierda[0] * lado,
        entrada[1] + uy * adentro + izquierda[1] * lado,
      ] as Punto;
    });

  const porDefecto: SitioDelPapi = {
    luces: calculada(PAPI_ADENTRO, ancho / 2 + PAPI_DEL_BORDE, 1),
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

  if (grupo.length >= 4) {
    return { luces: grupo.slice(0, 4).map((a) => a.xy), origen: "osm" };
  }

  /*
   * Con uno o dos nodos no hay cuatro luces que copiar, pero sí está lo que
   * no se podía calcular: **de qué costado y a cuántos metros**. El resto se
   * completa con la separación de siempre, y el nodo se toma por la luz de
   * dentro, que es equivocarse hacia fuera y no hacia la pista.
   */
  const adentro =
    grupo.reduce((suma, a) => suma + a.adentro, 0) / grupo.length;
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
  dispose(): void;
}

/**
 * Monta las luces de aproximación y el PAPI de una pista.
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
  ayudas: readonly AyudaVisual[] = [],
): Aproximacion | null {
  const conNombre = Object.entries(pista.thresholds).filter(
    (e): e is [string, Situado] => e[1] !== null && e[1].xy !== null,
  );
  if (conNombre.length < 2) return null;

  /*
   * El umbral por el que se entra. Si no se sabe cuál está en uso —sin viento,
   * o sin cabecera elegida— se coge el primero: da igual, porque lo que importa
   * es que las luces estén en **una** cabecera y no repartidas entre las dos.
   */
  const i = cabecera ? conNombre.findIndex(([n]) => n === cabecera) : 0;
  const [, entrada] = conNombre[i >= 0 ? i : 0]!;
  const [, salida] = conNombre[(i >= 0 ? i : 0) === 0 ? 1 : 0]!;

  const [ux, uy] = (() => {
    const dx = salida.xy[0] - entrada.xy[0];
    const dy = salida.xy[1] - entrada.xy[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l] as const;
  })();

  const ancho = pista.widthM ?? 45;
  const cotaUmbral = altura(entrada.xy);
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
  const puntos: [number, number, number][] = [];
  const ponerLuz = (x: number, y: number): void => {
    const suelo = altura([x, y]);
    puntos.push([x, Math.max(cotaUmbral, suelo) + 0.6, -y]);
  };

  for (
    let d = PASO_APROXIMACION;
    d <= LARGO_APROXIMACION;
    d += PASO_APROXIMACION
  ) {
    // Hacia fuera del umbral: al contrario del eje, que apunta pista adentro.
    const cx = entrada.xy[0] - ux * d;
    const cy = entrada.xy[1] - uy * d;
    // Tres por travesaño, que es lo que hace legible la fila desde lejos.
    for (const lado of [-3, 0, 3]) ponerLuz(cx - uy * lado, cy + ux * lado);
  }
  // La barra cruzada: la referencia de alineación, y la que dice cuánto falta.
  for (let k = -7; k <= 7; k++) {
    if (k === 0) continue;
    const cx = entrada.xy[0] - ux * BARRA - uy * (k * 2);
    const cy = entrada.xy[1] - uy * BARRA + ux * (k * 2);
    ponerLuz(cx, cy);
  }

  const m = new Matrix4();
  const fila = new InstancedMesh(
    new SphereGeometry(0.75, 6, 4),
    new MeshBasicMaterial({ color: BLANCO }),
    puntos.length,
  );
  fila.name = "luces-aproximacion";
  puntos.forEach((p, k) => {
    m.makeTranslation(p[0], p[1], p[2]);
    fila.setMatrixAt(k, m);
  });
  grupo.add(fila);

  /*
   * El PAPI, a trescientos metros pista adentro y al costado izquierdo visto
   * desde la aproximación, que es donde va.
   */
  const papi = new InstancedMesh(
    new SphereGeometry(1.1, 8, 6),
    new MeshBasicMaterial(),
    4,
  );
  papi.name = "papi";
  /*
   * Las cuatro, en el orden que importa: la más cerca del eje es la del ángulo
   * más bajo. Así, en la senda, las dos de dentro salen blancas y las dos de
   * fuera rojas.
   */
  const sitio = sitiarPapi(
    entrada.xy,
    [ux, uy],
    ancho,
    Math.hypot(salida.xy[0] - entrada.xy[0], salida.xy[1] - entrada.xy[1]),
    ayudas,
  );
  const luces: { x: number; y: number; z: number }[] = [];
  sitio.luces.forEach(([cx, cy], k) => {
    const y = Math.max(cotaUmbral, altura([cx, cy])) + 1;
    luces.push({ x: cx, y, z: -cy });
    m.makeTranslation(cx, y, -cy);
    papi.setMatrixAt(k, m);
  });
  grupo.add(papi);

  const tono = new Color();
  const mirarDesde = (x: number, y: number, z: number): void => {
    for (let k = 0; k < 4; k++) {
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

  return {
    grupo,
    mirarDesde,
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
