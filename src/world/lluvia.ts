/**
 * La lluvia: lo que se ve caer y lo que se ve relampaguear.
 *
 * Pedido con el resto del tiempo: «falta paisaje… climatología, atravesar mar
 * de nubes o nubes, **lluvia, tormenta**, sol, amanecer, atardecer». El dato ya
 * estaba —`Meteo.lluvia` sale del METAR de verdad— y no lo miraba nadie.
 *
 * ## Cómo está hecha, y por qué así
 *
 * Una caja de gotas **alrededor de la cámara**, no en el mundo. Llover en el
 * mundo entero costaría millones de partículas para que se vieran las cuatro
 * que tenés delante; lo que se ve de la lluvia es siempre lo de los veinte
 * metros de alrededor, y eso son mil rayas. La caja viaja con el avión y las
 * gotas caen dentro de ella: cuando una sale por abajo, vuelve a entrar por
 * arriba.
 *
 * **Y las rayas se inclinan con la velocidad.** Una gota cae a nueve metros por
 * segundo; un avión a sesenta la atraviesa de lado. Lo que se ve por el
 * parabrisas no son gotas cayendo, son rayas casi horizontales — y esa
 * inclinación **es** la sensación de velocidad con mal tiempo. Sin ella la
 * lluvia parece una cortina pintada delante.
 *
 * ## Lo que no hace
 *
 * No moja el parabrisas ni deja regueros. Eso es una capa de pantalla y va por
 * otro lado; aquí está el agua que cae.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  type Vector3,
} from "three";
import type { Lluvia } from "./meteo";

/**
 * Cuántas gotas caben en la caja, por clase y fuerza.
 *
 * Mil doscientas en un aguacero. Es lo que llena el cono de visión sin que se
 * note ni una sola gota suelta, y son mil doscientas rayas de dos vértices:
 * nada al lado de un aeropuerto. La llovizna lleva un tercio, que es lo que la
 * hace parecer llovizna — no es lluvia más floja, es **menos agua**.
 */
export function cuantasGotas(clase: Lluvia, fuerza: number): number {
  if (clase === "nada") return 0;
  const tope = clase === "llovizna" ? 380 : 1200;
  return Math.round(tope * (0.35 + 0.65 * Math.max(0, Math.min(1, fuerza))));
}

/** Lo que mide la caja de lluvia alrededor de la cámara, m. */
export const CAJA = 46;

/**
 * Dónde queda una gota que ha caído `cuanto` desde `y`, dentro de la caja.
 *
 * Es el envoltorio de toda la vida: la caja va de `-CAJA/2` a `+CAJA/2` en
 * vertical alrededor de la cámara, y una gota que sale por abajo vuelve a
 * entrar por arriba. Va aparte para poder probarla: lo que se rompe en esto es
 * el signo, y un signo mal puesto deja la lluvia subiendo.
 */
export function envolver(y: number, alto = CAJA): number {
  const mitad = alto / 2;
  let v = y;
  while (v < -mitad) v += alto;
  while (v > mitad) v -= alto;
  return v;
}

/**
 * Si toca relámpago ahora mismo.
 *
 * Uno cada pocos segundos y **solo en tormenta**, porque un rayo sin tormenta
 * es un fallo y no un adorno. La cuenta es la de toda la vida para un suceso
 * raro: la probabilidad en este paso es el ritmo por el tiempo del paso, así
 * que sale igual de frecuente vaya el juego a sesenta fotogramas o a diez.
 *
 * `azar` entra de fuera para poder probarlo: con `() => 0` siempre cae y con
 * `() => 1` no cae nunca, y así se comprueba el ritmo sin esperar tormentas.
 */
export function tocaRelampago(
  clase: Lluvia,
  fuerza: number,
  dt: number,
  azar: () => number = Math.random,
): boolean {
  if (clase !== "tormenta") return false;
  // De uno cada nueve segundos con una tormenta floja a uno cada dos y medio
  // con una encima.
  const porSegundo = 0.11 + 0.29 * Math.max(0, Math.min(1, fuerza));
  return azar() < porSegundo * dt;
}

/** La lluvia montada, lista para colgar de la escena. */
export interface LluviaEnElMundo {
  readonly grupo: Group;
  /** Pone la clase y la fuerza. `"nada"` la apaga entera. */
  poner(clase: Lluvia, fuerza: number): void;
  /**
   * Un fotograma: mueve las gotas y devuelve **cuánto alumbra el relámpago**,
   * de cero a uno, para que lo use quien pinta el cielo.
   */
  paso(dt: number, camara: Vector3, velocidad: Vector3): number;
  dispose(): void;
}

/** Lo que cae una gota en un segundo, m. Es la velocidad terminal de verdad. */
const CAE = 9;

/**
 * Cuánto «obturador» lleva una raya de lluvia, s.
 *
 * Cuarenta milisegundos, que es más o menos lo que integra un ojo. La raya mide
 * la velocidad de la gota respecto al avión por este tiempo: treinta y seis
 * centímetros parado bajo la lluvia, dos metros y pico a velocidad de crucero.
 */
const EXPOSICION = 0.04;

export function crearLluvia(): LluviaEnElMundo {
  const grupo = new Group();
  grupo.name = "lluvia";
  grupo.visible = false;
  // El máximo de una vez: se reserva entero y luego se dibuja solo lo que toca.
  const tope = 1200;
  const posiciones = new Float32Array(tope * 6);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(posiciones, 3));
  const mat = new LineBasicMaterial({
    // Gris azulado y apagado: el agua no es blanca, y una gota blanca sobre un
    // cielo claro es un arañazo en la pantalla.
    color: 0x9fb4c2,
    transparent: true,
    opacity: 0.35,
    // Aditivo: el agua no tapa, brilla. Y así no hace falta ordenarla.
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const rayas = new LineSegments(geo, mat);
  rayas.frustumCulled = false;
  grupo.add(rayas);

  // Dónde está cada gota, en coordenadas de la caja.
  const gx = new Float32Array(tope);
  const gy = new Float32Array(tope);
  const gz = new Float32Array(tope);
  const sembrar = (i: number): void => {
    gx[i] = (Math.random() - 0.5) * CAJA;
    gy[i] = (Math.random() - 0.5) * CAJA;
    gz[i] = (Math.random() - 0.5) * CAJA;
  };
  for (let i = 0; i < tope; i++) sembrar(i);

  let clase: Lluvia = "nada";
  let fuerza = 0;
  let cuantas = 0;
  /** Lo que queda de fogonazo, en segundos. */
  let fogonazo = 0;

  return {
    grupo,
    poner(nueva, cuanta) {
      clase = nueva;
      fuerza = cuanta;
      cuantas = Math.min(tope, cuantasGotas(clase, fuerza));
      grupo.visible = cuantas > 0;
      geo.setDrawRange(0, cuantas * 2);
      mat.opacity = clase === "llovizna" ? 0.16 : 0.22 + 0.16 * fuerza;
    },
    paso(dt, camara, velocidad) {
      if (fogonazo > 0) fogonazo = Math.max(0, fogonazo - dt);
      if (cuantas === 0) return 0;
      if (tocaRelampago(clase, fuerza, dt, Math.random)) fogonazo = 0.18;

      grupo.position.copy(camara);
      /*
       * **La raya apunta a donde viene el agua, no a donde cae.**
       *
       * Lo que ve el parabrisas es la velocidad de la gota *respecto al avión*:
       * la gota baja nueve y el avión avanza sesenta, así que la raya sale casi
       * tumbada. Se recorta a algo que se pueda ver —una raya de cien metros no
       * es una gota, es un cable— y se deja larga de todas formas, que es lo
       * que da la sensación.
       */
      const vx = -velocidad.x;
      const vy = -velocidad.y - CAE;
      const vz = -velocidad.z;
      /*
       * **Y la raya mide lo que mide de verdad: velocidad por exposición.**
       *
       * Una raya de lluvia en una foto es la gota movida durante el tiempo que
       * el obturador estuvo abierto. Aquí el obturador son cuarenta
       * milisegundos, que es más o menos lo que integra un ojo: cayendo quieto
       * da treinta y seis centímetros de raya, y a cincuenta metros por segundo
       * da dos metros y pico, tumbada. Eso es lluvia.
       *
       * El primer intento las hacía de dieciocho metros —un largo fijo,
       * pensando que «más largo se ve más rápido»— y lo que salía era un salto
       * al hiperespacio: cuarenta rayas blancas de cuarenta metros saliendo de
       * un punto. Una gota no es un cable.
       */
      const ex = vx * EXPOSICION;
      const ey = vy * EXPOSICION;
      const ez = vz * EXPOSICION;

      for (let i = 0; i < cuantas; i++) {
        // Caer y dejarse llevar: la gota se mueve en el mundo, y la caja con
        // el avión, así que en coordenadas de la caja pasa lo contrario.
        gy[i] = envolver(gy[i]! - CAE * dt + velocidad.y * dt);
        gx[i] = envolver(gx[i]! + velocidad.x * dt);
        gz[i] = envolver(gz[i]! + velocidad.z * dt);
        const k = i * 6;
        posiciones[k] = gx[i]!;
        posiciones[k + 1] = gy[i]!;
        posiciones[k + 2] = gz[i]!;
        posiciones[k + 3] = gx[i]! + ex;
        posiciones[k + 4] = gy[i]! + ey;
        posiciones[k + 5] = gz[i]! + ez;
      }
      (geo.getAttribute("position") as BufferAttribute).needsUpdate = true;
      return fogonazo > 0 ? fogonazo / 0.18 : 0;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
