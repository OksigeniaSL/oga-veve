import { giroDelModelo } from "./rumbo";
/**
 * El otro avión, **dibujado**.
 *
 * La radio lleva tiempo contando que hay alguien más ahí fuera: uno que rueda
 * a la cabecera, otro en viento en cola, la torre autorizándoles a los dos. Y
 * no había nadie. Quien juega oye «Echo Charlie Oscar, en final», mira, y la
 * pista está vacía — que es la manera más rápida de aprender que la radio es
 * un adorno.
 *
 * Esto pone al otro avión donde acaba de decir que está.
 *
 * ## Un camino, y unas marcas encima
 *
 * El avión **no vuela por su cuenta**: recorre el circuito a velocidad de
 * avión, y cada llamada de la radio lo coloca en la marca que le corresponde.
 * Así no puede desmentirse a sí mismo, que es el fallo del que no se vuelve —
 * un tráfico que canta final estando en tierra no es realismo, es una avería a
 * la vista de todos.
 *
 * Lo bonito es **dónde caen las marcas**, porque no se eligieron: se midieron.
 * Entre dos llamadas pasan de treinta y cinco a setenta y cinco segundos, y
 * una avioneta en circuito vuela a cuarenta metros por segundo; o sea que las
 * marcas van a unos dos kilómetros una de otra. Contando hacia atrás desde la
 * toma, eso deja «en final» justo en la entrada en final y «en viento en cola»
 * a tres cuartos del tramo largo — que es **exactamente donde se anuncian de
 * verdad**: nadie canta viento en cola al entrar en el viento en cola, lo
 * canta a la altura de la cabecera. No hubo que ajustar nada.
 *
 * ## Y vuela por donde el juego enseña a volar
 *
 * El camino sale de `verticesDelCircuito`, los mismos cinco puntos que el hilo
 * ocre le dibuja a quien juega. Ni una trigonometría nueva: un tráfico con
 * ruta propia enseñaría, callado, que el circuito dibujado es uno de tantos.
 *
 * ## Y no se le puede chocar
 *
 * Es ambiente, no un obstáculo: no tiene estela, no ocupa la pista y no cuenta
 * como percance. Un juego donde a los cuatro años te mata algo que no
 * controlás no es este juego. Lo que enseña es **que hay más gente**, y eso se
 * enseña viéndolo.
 */

import {
  BufferGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from "three";
import type { Silueta } from "../flight/flota";
import { fabricarAeronave } from "./fabrica-de-aeronaves";
import { verticesDelCircuito, type Mano, type Pista } from "./circuito";
import { ESPERA_ENTRE_VUELOS, ESPERA_MAXIMA } from "../flight/radio";

/** Un sitio del mundo, con su altura. */
export interface Sitio {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Dónde deja una llamada al que la hace. */
export interface Marca {
  /** El camino que va recorriendo. */
  readonly camino: Sitio[];
  /** Cuánto lleva recorrido de él al decirlo, m. */
  readonly metros: number;
  /** A cuánto lo sigue recorriendo, m/s. */
  readonly velocidad: number;
  /**
   * Dónde se planta y espera, m. Sin tope, sigue hasta el final del camino.
   *
   * Lo pide **«line up and wait»**, que es la única orden de la torre que dice
   * «no hagas nada»: sin tope, el avión al que le mandan esperar en el eje
   * seguía tirando por el camino y despegaba solo. Se quedaba sin turno el que
   * estaba autorizado, o sea el guion entero al revés — y es justo la lección
   * que ese guion existe para dar: la pista es de todos y hay turnos.
   */
  readonly tope?: number;
}

/** A cuánto vuela el tráfico del circuito, m/s. Una avioneta en circuito. */
export const VUELA_A = 40;

/** Y a cuánto rueda por el suelo, m/s. Unos veinticinco por hora. */
export const RUEDA_A = 7;

/**
 * Cuánto se deja entre dos marcas, s.
 *
 * El hueco medio entre dos llamadas —`ESPERA_MINIMA` y `ESPERA_MAXIMA` de la
 * frecuencia— menos un respiro. Si se quedara corto, el avión llegaría a la
 * marca siguiente antes de anunciarla y tendría que esperar ahí quieto en el
 * aire; pasarse es peor, porque entonces la llamada lo empuja hacia adelante y
 * se ve el tirón.
 */
export const ENTRE_MARCAS = 50;

/** A cuánto del suelo va un avión con las ruedas en el asfalto, m. */
const EN_TIERRA = 1.5;

/** Cuánto se aparta del eje quien espera o quien acaba de dejar la pista, m. */
const FUERA_DEL_ASFALTO = 45;

/** Cuánto antes del umbral está el punto de espera, m. */
const ANTES_DEL_UMBRAL = 90;

/** Lo largo que es un camino, m. */
export function largoDelCamino(puntos: readonly Sitio[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
}

/**
 * Dónde se está y hacia dónde se mira con `metros` recorridos del camino.
 *
 * Pasado el final se queda en el final, que es lo que hace un avión al que
 * nadie vuelve a nombrar: se ha ido, y el módulo lo retira solo.
 */
export function porElCamino(
  puntos: readonly Sitio[],
  metros: number,
): { sitio: Sitio; rumbo: number } | null {
  if (puntos.length === 0) return null;
  if (puntos.length === 1) return { sitio: puntos[0]!, rumbo: 0 };
  let queda = Math.max(0, metros);
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (queda <= d || i === puntos.length - 1) {
      const t = d > 0 ? Math.max(0, Math.min(1, queda / d)) : 1;
      return {
        sitio: {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t,
        },
        rumbo: Math.atan2(b.x - a.x, -(b.z - a.z)),
      };
    }
    queda -= d;
  }
  return { sitio: puntos[puntos.length - 1]!, rumbo: 0 };
}

/**
 * Los caminos de este aeródromo y las marcas de cada llamada.
 *
 * Dos caminos y no uno: el que llega y el que sale. Se cruzan en el umbral,
 * como en un aeródromo de verdad.
 */
export function caminosDe(
  runway: Pista,
  cota: number,
  mano: Mano = "izquierda",
  escala = 1,
): Record<string, Marca> {
  const v = verticesDelCircuito(runway, cota, mano, escala);
  const [umbral, arriba, lejos, esquina, entrada] = v;
  if (!umbral || !arriba || !lejos || !esquina || !entrada) return {};

  // Los dos ejes de la pista, sacados de los propios vértices. Con las cuentas
  // escritas otra vez aquí, el día que el circuito cambie de mano el tráfico
  // se quedaría volando por el lado de ayer.
  const haciaDelante = unitario(umbral, arriba);
  const haciaElLado = unitario(arriba, lejos);
  const en = (a: number, l: number, alto: number): Sitio => ({
    x: umbral.x + haciaDelante.x * a + haciaElLado.x * l,
    y: cota + alto,
    z: umbral.z + haciaDelante.z * a + haciaElLado.z * l,
  });

  const lejosDelCampo = en(-ANTES_DEL_UMBRAL, FUERA_DEL_ASFALTO * 8, EN_TIERRA);
  const espera = en(-ANTES_DEL_UMBRAL, FUERA_DEL_ASFALTO, EN_TIERRA);
  const enElEje = en(0, 0, EN_TIERRA);
  const toma = en(runway.length * 0.25, 0, EN_TIERRA);
  const salida = en(runway.length * 0.6, FUERA_DEL_ASFALTO, EN_TIERRA);

  /*
   * **El que llega**: el tramo largo, la base, el final, la toma y la salida.
   * Es el circuito del juego con la carrera de frenado pegada al final.
   */
  const llegada = [lejos, esquina, entrada, umbral, toma, salida];
  /** **El que sale**: del aparcamiento a la espera, al eje, y arriba. */
  const salidaDelCampo = [lejosDelCampo, espera, enElEje, arriba];
  /** **Y el que se va al aire**: pasa sobre la pista y vuelve al circuito. */
  const alAire = [umbral, arriba, lejos];

  /*
   * **La velocidad crece con el circuito, no con el tramo.** El circuito de un
   * reactor es cuatro veces más grande porque el reactor vuela cuatro veces
   * más deprisa —ver `escalaDeCircuito`—, así que su tráfico también; y las
   * marcas se separan con él, que es lo que las mantiene a una llamada de
   * distancia en cualquier avión.
   */
  const vuela = VUELA_A * escala;
  const hueco = vuela * ENTRE_MARCAS;
  // La toma, de donde se cuenta hacia atrás: es el único punto del circuito
  // que está donde está y no admite discusión.
  const enLaToma = largoDelCamino([lejos, esquina, entrada, umbral]);
  const volando = (metros: number): Marca => ({
    camino: llegada,
    metros: Math.max(0, metros),
    velocidad: vuela,
  });
  const rodando = (camino: Sitio[], metros: number, tope?: number): Marca => ({
    camino,
    metros,
    velocidad: RUEDA_A,
    tope,
  });
  const hastaLaEspera = largoDelCamino([lejosDelCampo, espera]);
  const hastaElEje = largoDelCamino([lejosDelCampo, espera, enElEje]);

  return {
    // Rodando a la cabecera: llega al punto de espera justo al hablar.
    "otro.buenosDias": rodando(salidaDelCampo, 0, hastaLaEspera),
    "otro.rodando": rodando(salidaDelCampo, 0, hastaLaEspera),
    // «Line up and wait»: se mete en la pista y ahí se queda.
    "torre.lineUpWait": rodando(salidaDelCampo, hastaLaEspera, hastaElEje),
    // Autorizado a despegar: desde el eje, y ya a velocidad de vuelo.
    "torre.clearedTakeoff": {
      camino: salidaDelCampo,
      metros: hastaElEje,
      velocidad: vuela,
    },
    // Las tres de quien llega, contadas hacia atrás desde la toma.
    "otro.enCola": volando(enLaToma - 2 * hueco),
    "otro.final": volando(enLaToma - hueco),
    /*
     * Y la carrera de frenado **no es rodar**: se toca a velocidad de vuelo y
     * se sale por el costado mil metros después. A velocidad de rodadura eso
     * son dos minutos y medio, o sea tres llamadas de radio con el avión
     * todavía en la pista que acaba de decir que ha dejado libre.
     */
    "otro.pistaLibre": {
      camino: llegada,
      metros: enLaToma,
      velocidad: vuela / 2,
    },
    /*
     * Y al aire otra vez. **Aquí el guion va por delante de la geometría**: la
     * frustrada canta viento en cola una sola llamada después, y en cuarenta
     * segundos nadie da media vuelta a un circuito. El avión sube, y a la
     * llamada siguiente reaparece en el viento en cola. Es el único sitio
     * donde se ve un tirón, y se prefiere a que la radio mienta.
     */
    "torre.goAround": { camino: alAire, metros: 0, velocidad: vuela },
  };
}

/** El unitario que va de un punto a otro, en el plano. */
function unitario(a: Sitio, b: Sitio): { x: number; z: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: dx / d, z: dz / d };
}

/**
 * Lo que tarda en irse un avión al que nadie nombra, s.
 *
 * **No es un número a ojo: cae entre dos de la frecuencia y por eso funciona.**
 * Estaba en doscientos y el banco contó cuatro aviones dibujados con dos en la
 * frecuencia. La cuenta es esta: cuando alguien termina su vuelo se va y pasan
 * `ESPERA_ENTRE_VUELOS` hasta que llega otro con otra matrícula, así que con un
 * plazo más largo que esa espera el que se fue **sigue dibujado cuando aparece
 * su relevo**, y se acumulan. Y con uno más corto que `ESPERA_MAXIMA` —el hueco
 * más largo que puede haber entre dos llamadas suyas— desaparecería a mitad de
 * su propio vuelo, que es peor.
 *
 * O sea que el plazo tiene que caer entre las dos, y aquí se pone en medio. Se
 * importan las dos y no se copian: son de la radio, y este módulo existe
 * justamente para no contradecirla. Ver `flight/radio.ts`.
 */
export const SE_VA_A_LOS = (ESPERA_MAXIMA + ESPERA_ENTRE_VUELOS) / 2;

interface Volando {
  readonly grupo: Group;
  marca: Marca;
  recorrido: number;
  /** Cuánto lleva sin que nadie lo nombre. */
  olvidado: number;
}

export interface Trafico {
  readonly grupo: Group;
  /** Alguien acaba de decir algo: se le pone donde dice estar. */
  anuncia(matricula: string, clave: string): void;
  paso(dt: number): void;
  /** Cuántos se ven, y dónde. Para el banco. */
  quienes(): { matricula: string; x: number; y: number; z: number }[];
  dispose(): void;
}

/**
 * El tráfico de este aeródromo.
 *
 * `silueta` decide qué pinta tienen, y **no es la del avión que se vuela**:
 * eso sería un espejo. Es otro de la flota, para que se note que es otro.
 */
export function crearTrafico(
  runway: Pista,
  cota: number,
  silueta: Silueta,
  mano: Mano = "izquierda",
  escala = 1,
): Trafico {
  const grupo = new Group();
  grupo.name = "trafico";
  const marcas = caminosDe(runway, cota, mano, escala);
  const aviones = new Map<string, Volando>();
  let geometria: BufferGeometry | null = null;

  const cuerpo = (): Object3D => {
    /*
     * Una geometría para todos: son dos como mucho —ver `CUANTOS`— y aun así
     * fabricar un avión entero por cada llamada sería pagar un tirón de
     * fotogramas por algo que está a dos kilómetros.
     */
    geometria ??= fabricarAeronave(
      silueta,
      { envergadura: 11, cuerda: 1.5, tren: 0.9 },
      { body: 0xe7e3d8, accent: 0x8f99a2, trim: 0x39403a },
    ).geometria;
    return new Mesh(geometria, new MeshLambertMaterial({ vertexColors: true }));
  };

  return {
    grupo,
    anuncia(matricula, clave) {
      const marca = marcas[clave];
      let quien = aviones.get(matricula);
      if (!marca) {
        /*
         * Que no lo mueva no quiere decir que no lo nombre. A quien le dicen
         * «hold short» sigue estando ahí, y estaba a punto de esfumarse.
         */
        if (quien) quien.olvidado = 0;
        return;
      }
      if (!quien) {
        const g = new Group();
        g.name = "trafico-avion";
        g.add(cuerpo());
        grupo.add(g);
        quien = { grupo: g, marca, recorrido: marca.metros, olvidado: 0 };
        aviones.set(matricula, quien);
      }
      quien.marca = marca;
      quien.recorrido = marca.metros;
      quien.olvidado = 0;
      colocar(quien);
    },
    paso(dt) {
      for (const [matricula, quien] of aviones) {
        quien.olvidado += dt;
        if (quien.olvidado > SE_VA_A_LOS) {
          grupo.remove(quien.grupo);
          aviones.delete(matricula);
          continue;
        }
        quien.recorrido = Math.min(
          quien.recorrido + quien.marca.velocidad * dt,
          quien.marca.tope ?? Infinity,
        );
        colocar(quien);
      }
    },
    quienes() {
      return [...aviones].map(([matricula, quien]) => ({
        matricula,
        x: quien.grupo.position.x,
        y: quien.grupo.position.y,
        z: quien.grupo.position.z,
      }));
    },
    dispose() {
      for (const quien of aviones.values()) grupo.remove(quien.grupo);
      aviones.clear();
      geometria?.dispose();
      geometria = null;
    },
  };
}

function colocar(quien: Volando): void {
  const donde = porElCamino(quien.marca.camino, quien.recorrido);
  if (!donde) return;
  quien.grupo.position.set(donde.sitio.x, donde.sitio.y, donde.sitio.z);
  /*
   * **Y el giro del modelo es el rumbo negado, no el rumbo.**
   *
   * `porElCamino` devuelve un **rumbo de brújula** —la misma cuenta que
   * `rumboHacia`, `atan2(dx, -dz)`— y eso no es lo que pide `rotation.y`. Con
   * el morro del modelo mirando a −Z, girar un objeto para que apunte a un
   * rumbo pide el ángulo contrario; es la misma cuenta que ya hace la sombra
   * del avión del jugador: `blobShadow.rotation.y = -state.heading`.
   *
   * Con el signo cambiado el avión no queda al revés, queda **espejado en el
   * eje norte-sur**: acierta yendo al norte y al sur y falla en todo lo demás,
   * que en pantalla se ve como un avión rodando de medio lado. Dicho jugando:
   * «esa avioneta que se ve rodando de medio lado ya me dirás lo que
   * significa».
   *
   * Que acierte en dos de los cuatro rumbos cardinales es lo que lo hizo
   * durar: mirando una captura cualquiera hay una de cada dos de que parezca
   * bien. La conversión vive en `giroDelModelo`, con nombre y con prueba,
   * porque el fallo fue confundir dos números que se parecen.
   */
  quien.grupo.rotation.y = giroDelModelo(donde.rumbo);
}
