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
 * ## Y va contra el avión
 *
 * «Estaba lloviendo y la lluvia iba hacia adelante en lugar de venir contra el
 * avión; me parece que la mueves al contrario.» Así era: la caja va con la
 * cámara y la gota está quieta en el aire, así que en la caja la gota tiene
 * que moverse **al revés** de como se mueve la cámara, y se le sumaba. La raya
 * apuntaba bien y la gota corría hacia delante con el avión, el doble de
 * deprisa que él respecto al aire. Ahora la gota cae y se deja llevar por el
 * viento, y la caja le resta lo que se ha movido la cámara: ver `paso`.
 *
 * ## Lo que no hace
 *
 * No moja el parabrisas: eso va en `world/gotas-en-el-parabrisas.ts`. Aquí
 * está el agua que cae. Y no decide a qué altura llueve: se lo dice la capa de
 * nubes, ver `lluviaALaAltura` en `world/capa-de-nubes.ts`.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
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
  if (y >= -mitad && y <= mitad) return y;
  /*
   * Con el resto y no a vueltas: al cambiar de vista la cámara salta decenas
   * de metros en un fotograma, y un salto de diez kilómetros —la torre, un
   * vecino— eran doscientas vueltas por gota.
   */
  return ((((y + mitad) % alto) + alto) % alto) - mitad;
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

/** Un vector de tres, sin pedir que sea de three. */
interface Tres {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Lo que necesita un fotograma de lluvia. */
export interface PasoDeLluvia {
  /** Dónde está la cámara ahora, en el mundo. */
  readonly camara: Tres;
  /**
   * A qué velocidad va la cámara respecto al suelo, m/s. Es la del avión:
   * todas las vistas van con él. Es lo que tumba la raya.
   */
  readonly velocidad: Tres;
  /** El viento: a dónde va el aire, m/s. La gota va con él. */
  readonly viento?: { readonly x: number; readonly z: number };
  /**
   * Cuánta de la lluvia del parte cae aquí, de 0 a 1: toda debajo de la
   * capa, nada encima. Ver `lluviaALaAltura` en `world/capa-de-nubes.ts`.
   */
  readonly aqui?: number;
  /**
   * Un hueco sin gotas alrededor del ojo, m. Desde la cabina, lo que cae a
   * un metro de los ojos cae dentro de la cabina.
   */
  readonly hueco?: number;
}

/** La lluvia montada, lista para colgar de la escena. */
export interface LluviaEnElMundo {
  readonly grupo: Group;
  /** Pone la clase y la fuerza. `"nada"` la apaga entera. */
  poner(clase: Lluvia, fuerza: number): void;
  /**
   * **Y si graniza**, de 0 a 1: las rayas se vuelven blancas y caen más
   * deprisa, que es lo que hace una piedra de hielo —el doble y pico que una
   * gota—. Es lo que se ve del granizo; lo que se oye va en `audio/ruidos.ts`,
   * y el sonido no puede ser lo único que lo diga.
   */
  ponerGranizo(cuanto: number): void;
  /**
   * Un fotograma: mueve las gotas y devuelve **cuánto alumbra el relámpago**,
   * de cero a uno, para que lo use quien pinta el cielo.
   */
  paso(dt: number, p: PasoDeLluvia): number;
  /** Cuántas rayas se pintan ahora. Para las pruebas y el banco. */
  readonly pintadas: number;
  dispose(): void;
}

/** Lo que cae una gota en un segundo, m. Es la velocidad terminal de verdad. */
export const CAE = 9;

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
  /** Cuánto graniza, y lo que cae de más por eso, m/s. */
  let granizo = 0;
  const agua = new Color(0x9fb4c2);
  const hielo = new Color(0xeef3f6);
  let cuantas = 0;
  /** Las que se pintan ahora: las de la clase, por lo que cae aquí. */
  let pintadas = 0;
  /** Dónde estaba la cámara en el fotograma anterior. */
  let antes: Tres | null = null;
  /** Lo que queda de fogonazo, en segundos. */
  let fogonazo = 0;

  return {
    grupo,
    poner(nueva, cuanta) {
      clase = nueva;
      fuerza = cuanta;
      cuantas = Math.min(tope, cuantasGotas(clase, fuerza));
      pintadas = cuantas;
      grupo.visible = cuantas > 0;
      geo.setDrawRange(0, cuantas * 2);
      mat.opacity =
        (clase === "llovizna" ? 0.16 : 0.22 + 0.16 * fuerza) + 0.2 * granizo;
    },
    ponerGranizo(cuanto) {
      const g = Math.max(0, Math.min(1, cuanto));
      if (Math.abs(g - granizo) < 0.01) return;
      granizo = g;
      mat.color.copy(agua).lerp(hielo, g);
      mat.opacity =
        (clase === "llovizna" ? 0.16 : 0.22 + 0.16 * fuerza) + 0.2 * granizo;
    },
    get pintadas() {
      return grupo.visible ? pintadas : 0;
    },
    paso(dt, { camara, velocidad, viento, aqui = 1, hueco = 0 }) {
      if (fogonazo > 0) fogonazo = Math.max(0, fogonazo - dt);
      /*
       * Lo que se ha movido la cámara desde el fotograma anterior. Es lo que
       * la caja le tiene que restar a cada gota: ver más abajo.
       */
      const mx = antes ? camara.x - antes.x : 0;
      const my = antes ? camara.y - antes.y : 0;
      const mz = antes ? camara.z - antes.z : 0;
      antes = { x: camara.x, y: camara.y, z: camara.z };
      /*
       * **Y solo las que caen aquí.** Por encima del techo de la capa no
       * cae nada —«sobre las nubes no llueve»—, y dentro va menguando. Las
       * gotas se siguen moviendo todas, para que al volver a bajar no
       * aparezcan de golpe en el mismo sitio en que se quedaron.
       */
      pintadas = Math.round(cuantas * Math.max(0, Math.min(1, aqui)));
      grupo.visible = pintadas > 0;
      geo.setDrawRange(0, pintadas * 2);
      if (cuantas === 0) return 0;
      if (tocaRelampago(clase, fuerza, dt, Math.random)) fogonazo = 0.18;
      // Encima de las nubes el rayo se sigue viendo; las gotas, no hace falta
      // ni moverlas: al volver a bajar están en cualquier sitio, como el agua.
      if (pintadas === 0) return fogonazo > 0 ? fogonazo / 0.18 : 0;

      grupo.position.set(camara.x, camara.y, camara.z);
      /*
       * **La raya apunta a donde viene el agua, no a donde cae.**
       *
       * Lo que ve el parabrisas es la velocidad de la gota *respecto al avión*:
       * la gota baja nueve y el avión avanza sesenta, así que la raya sale casi
       * tumbada. Se recorta a algo que se pueda ver —una raya de cien metros no
       * es una gota, es un cable— y se deja larga de todas formas, que es lo
       * que da la sensación.
       */
      const wx = viento?.x ?? 0;
      const wz = viento?.z ?? 0;
      // Una piedra de hielo cae bastante más deprisa que una gota.
      const cae = CAE + 16 * granizo;
      const vx = wx - velocidad.x;
      const vy = -cae - velocidad.y;
      const vz = wz - velocidad.z;
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

      const hueco2 = hueco * hueco;
      for (let i = 0; i < cuantas; i++) {
        /*
         * **Caer y dejarse llevar, y la caja al revés.** La gota está en el
         * aire: cae nueve metros por segundo y se la lleva el viento. La caja
         * va con la cámara, así que en coordenadas de la caja a la gota se le
         * **resta** lo que se ha movido la cámara. Aquí se sumaba, y la
         * lluvia corría hacia delante con el avión.
         *
         * Con lo que se ha movido de verdad y no con la velocidad del avión:
         * la cámara de persecución va detrás con su muelle, y al cambiar de
         * vista salta; así la gota se queda quieta en el aire pase lo que
         * pase con la cámara.
         */
        gy[i] = envolver(gy[i]! - cae * dt - my);
        gx[i] = envolver(gx[i]! + wx * dt - mx);
        gz[i] = envolver(gz[i]! + wz * dt - mz);
        const k = i * 6;
        const x = gx[i]!;
        const y = gy[i]!;
        const z = gz[i]!;
        posiciones[k] = x;
        posiciones[k + 1] = y;
        posiciones[k + 2] = z;
        // Dentro del hueco, la raya se queda en un punto y no se ve.
        const fuera = x * x + y * y + z * z >= hueco2;
        posiciones[k + 3] = fuera ? x + ex : x;
        posiciones[k + 4] = fuera ? y + ey : y;
        posiciones[k + 5] = fuera ? z + ez : z;
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
