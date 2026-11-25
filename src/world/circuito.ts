/**
 * El circuito de tráfico: la vuelta que se da alrededor de una pista.
 *
 * Hasta hoy el juego enseñaba dos maniobras sueltas —despegar y aterrizar— y
 * entre las dos había un limbo: te ibas, dabas una vuelta por donde te parecía
 * y volvías a buscar la pista como podías. Un piloto no aprende así. Lo
 * primero que hace, y lo que repite cien veces antes de ir a ninguna parte, es
 * **el circuito**: se despega, se sube recto, se gira a la izquierda, se vuela
 * al lado de la pista en sentido contrario, se gira otra vez y ya se está en
 * final. Siempre igual, siempre a la izquierda, siempre a la misma altura.
 *
 * Y es lo que convierte el aterrizaje en algo que se puede practicar: se toca,
 * se da gas, se despega y noventa segundos después se está otra vez en final.
 * En una escuela eso tiene nombre —**toques y despegues**— y es la tarde
 * entera de quien está aprendiendo.
 *
 * ## Los cuatro tramos, con sus nombres de verdad
 *
 * 1. **Subida** (*upwind*): recto, por el eje de la pista, subiendo.
 * 2. **Viento cruzado** (*crosswind*): el primer giro a la izquierda.
 * 3. **Viento en cola** (*downwind*): paralelo a la pista, al revés, ya a la
 *    altura del circuito. Es el tramo largo y el que da tiempo a pensar.
 * 4. **Base**: el segundo giro, bajando, apuntando al eje.
 *
 * Y después, final, que ya lo dibujan los aros y el hilo de la senda: ver
 * `runway-guide.ts`. El circuito se acaba justo donde empieza aquello, y por
 * eso el último punto de la base es el primero de la senda.
 *
 * ## Por la izquierda, salvo que haya una montaña
 *
 * El circuito estándar es a la izquierda en todo el mundo, y no es un
 * capricho: el comandante se sienta a la izquierda y desde ahí ve la pista por
 * su ventanilla durante toda la vuelta. Hay campos con circuito a la derecha
 * —por un pueblo, por una montaña, por un aeropuerto vecino— y se publican
 * como excepción.
 *
 * **Aquí era izquierda y punto, y en La Palma eso se ve.** Lo dijo quien lo
 * juega, volando allí: «¿de verdad siempre es con la pista en paralelo a la
 * izquierda? ¿No es más seguro sobrevolar el mar, porque hay menos
 * obstáculos?». Pues sí: la pista corre pegada a la costa con la isla
 * subiendo por un lado y el mar por el otro, y el circuito de la izquierda te
 * mete el viento en cola por encima de la ladera.
 *
 * Así que la mano **se decide mirando el terreno**, que es exactamente el
 * motivo por el que un campo de verdad publica el circuito al revés. Ver
 * `formaDelCircuito`: se mira cuánto sube el terreno por debajo y alrededor
 * de los tramos que se vuelan a nivel, por cada lado, y se vuela por donde
 * hay sitio. Y con empate gana la izquierda, porque la izquierda es la norma
 * y una regla no se rompe por diez metros.
 *
 * ## Y a la altura que pida el terreno, no solo la de la costumbre
 *
 * Donde ningún lado basta, el circuito **sube**: es lo que hacen los campos
 * con relieve alrededor, que publican su altura de circuito por encima de la
 * de costumbre. Los Rodeos publica dos, el norte y el sur, y del norte dice
 * «maintain minimum 1000 ft AGL» en el viento en cola (AIP España, AD
 * 2-GCXO, 22.4). Un circuito dibujado que pasa a tres metros de una ladera no
 * enseña a volar un circuito: enseña a chocar siguiendo las instrucciones.
 *
 * No hace falta ninguna carta ni ningún dato nuevo: el juego ya tiene el
 * relieve de verdad de cada aeródromo.
 *
 * **Y donde el AIP publica el lado o la altitud, mandan los publicados**: el
 * terreno solo pone lo que el AIP calla, y lo que haga falta para no acercarse
 * al monte. Ver `loPublicado`.
 *
 * ## Y se dibuja igual que la senda
 *
 * Un hilo de puntos, del mismo ocre que dice «por aquí» en el resto del juego.
 * No es una carretera ni un tubo: es la misma gramática de las rayas del suelo
 * levantada al aire, y ya está probada. Ver `hiloDeLaSenda`.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
} from "three";
import { vrefDeSuCategoria } from "../flight/aircraft";
import { GLIDE_SLOPE } from "./runway-guide";
import type { Scenario } from "./scenarios";
import { hastaElUmbralDeToma } from "./umbral-desplazado";

/** Un punto del circuito, en coordenadas de mundo. */
export interface PuntoDeCircuito {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Los tramos, en el orden en que se vuelan. */
export const TRAMOS = ["subida", "cruzado", "encola", "base"] as const;
export type TramoDeCircuito = (typeof TRAMOS)[number];

/**
 * Altura del circuito sobre la pista, m.
 *
 * Doscientos cincuenta, que son unos ochocientos pies. Mil pies es lo normal
 * en un aeropuerto y ochocientos lo que se vuela en muchos campos pequeños, y
 * aquí además hay un motivo de juego: desde doscientos cincuenta metros la
 * pista se ve entera desde el viento en cola, y desde trescientos ya cuesta
 * distinguirla del campo.
 */
export const ALTURA_DE_CIRCUITO = 250;

/**
 * Cuánto se separa el viento en cola del eje de la pista, m.
 *
 * Mil metros: poco más de media milla náutica, que es la separación de un
 * circuito de avioneta de verdad. Y es la distancia a la que la pista todavía
 * se ve por la ventanilla sin girar la cabeza — que es justamente para lo que
 * se elige.
 */
const SEPARACION = 1000;

/**
 * Cuánto se sigue recto pasado el final de la pista antes de girar, m.
 *
 * Mil doscientos. En un avión de verdad el primer giro se da al pasar el final
 * de la pista **y** tener quinientos pies; aquí manda la distancia, que es lo
 * que se puede dibujar. Ver `alturaEn`.
 */
const RECTO_TRAS_LA_PISTA = 1200;

/**
 * A qué distancia del umbral la base se convierte en final, m.
 *
 * Mil ochocientos, que es donde entra en final un avión ligero de verdad: algo
 * menos de una milla náutica de recta. Ahí la senda de tres grados pasa a
 * noventa y cuatro metros sobre la pista, así que la base baja desde los
 * doscientos cincuenta del circuito hasta engancharla.
 *
 * ## Y se llamaba `ENTRADA_EN_FINAL`, que ya existía y valía otra cosa
 *
 * `runway-guide.ts` exporta **otra** `ENTRADA_EN_FINAL`, que son 3.600 metros:
 * la distancia a la que arranca la lección de aterrizar, ya puesto en final y
 * sin circuito. Dos constantes con el mismo nombre y dos números distintos, y
 * cada módulo importando la suya. Aquí se llama como lo que es.
 *
 * El comentario que había decía además que este punto «es donde está el
 * segundo aro de la senda, y eso no es casualidad». Era falso: el primer aro
 * está a 3.200 m y el segundo a 2.610, así que al entrar en final desde el
 * circuito ya quedaban **tres aros a la espalda**, contados como perdidos. Lo
 * arregla `reset` al pasar a final; ver `LaAproximacion`.
 *
 * Las dos distancias son distintas a propósito y no hay que juntarlas: un
 * circuito de tráfico y una aproximación directa no entran en final en el
 * mismo sitio ni en un avión de verdad.
 */
export const BASE_A_FINAL = 1800;

/**
 * La senda de planeo, en radianes.
 *
 * **La de los aros, importada y no copiada.** Estaba escrita otra vez aquí con
 * el mismo número, que es la forma más silenciosa de que dos cosas que tienen
 * que ir juntas dejen de ir juntas.
 */
const SENDA = GLIDE_SLOPE;

/** Cada cuánto se pone un punto del hilo, m. */
const PASO = 45;

/** El ocre de «por aquí», el mismo de los aros y del hilo de la senda. */
const OCRE = 0xdd923f;

/**
 * Cuánto más grande es el circuito de **este** avión que el del entrenador.
 *
 * Todo lo de arriba son metros medidos para una avioneta que se aproxima a
 * treinta y tres metros por segundo, y así estuvo bien mientras la flota
 * fueron dos avionetas. Con el reactor y el de fuselaje ancho deja de estarlo,
 * y no por poco: el JAZ 120 vuela el mismo circuito a ciento cuarenta metros
 * por segundo, así que **el viento en cola entero le dura siete segundos**
 * donde al Pykasu le dura treinta y tres. Medido en La Palma: no llega a
 * doscientos noventa metros de altura en toda la vuelta, entra en final a dos
 * kilómetros y medio todavía a cien metros por segundo, y se come la montaña.
 *
 * > «El vuelo para dar una vuelta y volver a aterrizar me parece que es muy
 * > corto, no le da tiempo a descender y perder potencia.»
 *
 * Es exactamente eso, y es lo que pasa de verdad: **un circuito no se mide en
 * metros, se mide en tiempo**. El de un reactor de línea tiene la misma forma
 * y el mismo minuto por tramo que el de una avioneta, y por eso es tres o
 * cuatro veces más largo. Así que la figura se estira con la velocidad de
 * aproximación del avión, que es la que dice a qué ritmo se vuela esa parte.
 *
 * Nunca se encoge: con el biplano —que se aproxima más despacio que el
 * entrenador— el circuito se queda como está, porque lo que sobra de circuito
 * no molesta y lo que falta mata.
 */
const APROXIMACION_DEL_ENTRENADOR = 33;

export function escalaDeCircuito(aproximacion: number): number {
  return Math.max(1, aproximacion / APROXIMACION_DEL_ENTRENADOR);
}

/**
 * **Lo más bajo que entra en final un avión de pasaje**, m: quinientos pies.
 *
 * Es la regla de la aproximación estabilizada: en vuelo visual, a 500 ft
 * sobre el campo el avión tiene que ir ya en final, con las alas a nivel, en
 * la senda y sin bajar a más de 1.000 ft/min; si no, se va al aire (Flight
 * Safety Foundation, *ALAR Briefing Note* 7.1). La vuela todo operador de
 * transporte, y es la que separa un circuito de línea del de una escuela,
 * donde se entra en final a trescientos pies y se vira hasta ahí.
 */
export const ESTABILIZADO_EN_FINAL = 500 * 0.3048;

/**
 * **La escala del circuito de este avión**: la de su velocidad de
 * aproximación, y en el que lleva pasaje, nunca menos de la que le hace
 * entrar en final estabilizado.
 *
 * La entrada en final cae a `BASE_A_FINAL · escala` del umbral y en la senda,
 * así que pasar de `ESTABILIZADO_EN_FINAL` pide una escala de al menos
 * `ESTABILIZADO_EN_FINAL / (BASE_A_FINAL · tan senda)`, 1,62 con la de tres
 * grados, y con la de su cabecera: más en la 09 de Cuatro Vientos, a 2,8°. Por velocidad, el JAZ 60, el 90, el 110 y el 120 ya van por encima
 * —entran a 518 ft el que menos—, y el suelo no los mueve. El que movió es el
 * JAZ 50, un Twin Otter de diecinueve plazas: se aproxima a 70 nudos, como el
 * entrenador, y con su escala de 1,09 volaba el circuito de la avioneta,
 * entrando en final a 338 ft todavía virando y con la base a 7,9°, que su
 * propio TAWS avisaba con «caution terrain» (ADR 0027, enmienda H13d2).
 *
 * **Qué avión lleva pasaje lo dice la ficha**: sus `ventanillas`, que son las
 * del pasaje, o `null` sin él. Las avionetas, el fumigador y el bimotor de
 * pistón no lo llevan, y su circuito sigue siendo el de la escuela.
 *
 * Es la que piden el circuito que se dibuja, el del tráfico que vuela con
 * quien juega y los bancos: todos con esta, para que digan lo mismo. Los
 * tipos del tráfico, que no son fichas, siguen con `escalaDeCircuito`: sus
 * dos de pasaje, el turbohélice y el reactor, se aproximan a 57 y 69 m/s, por
 * encima del suelo.
 */
export function escalaDelCircuitoDe(
  a: {
    readonly approachSpeed: number;
    readonly mass: number;
    readonly masaMaximaAlAterrizar?: number;
    readonly ventanillas: unknown;
  },
  /** La pista en la que toca, con su senda. Ver `sendaDe`. */
  runway: Pick<Pista, "senda"> = {},
): number {
  // Con la Vref de su categoría, que es la del circuito publicado que le toca:
  // el E170 de la ficha cruza a 117,7 nudos y es de la C. Ver `manoPublicada`.
  const porVelocidad = escalaDeCircuito(vrefDeSuCategoria(a));
  if (a.ventanillas === null) return porVelocidad;
  return Math.max(porVelocidad, ESTABILIZADO_EN_FINAL / (BASE_A_FINAL * Math.tan(sendaDe(runway))));
}

/**
 * Hasta qué distancia del circuito se considera que se está volando en él, m.
 *
 * Mil doscientos. Más ancho y volar campo a través en dirección contraria
 * contaría como estar en el tramo de al lado; más estrecho y salirse un poco
 * —que es lo normal— dejaría de contar justo cuando el aviso hace falta.
 */
const EN_EL_CIRCUITO = 1200;

/**
 * Los vértices del circuito, en orden de vuelo.
 *
 * Cinco: el umbral de salida, el final de la subida, la esquina lejana, la
 * esquina de la base y la entrada en final. Los cuatro tramos son los cuatro
 * huecos entre ellos.
 */
export type Mano = "izquierda" | "derecha";

export interface Pista {
  x: number;
  z: number;
  heading: number;
  length: number;
  /** Asfalto antes del umbral de aterrizaje, m. Ver `umbral-desplazado.ts`. */
  desplazado?: number;
  /**
   * **La senda de la cabecera en la que se toca**, rad: la de su PAPI, la que
   * publica su AIP (`sendaDeLaCabecera`). Sin ella, los tres grados de
   * siempre. Ver `sendaDe`.
   */
  senda?: number;
}

/**
 * Cuánto se pasa por encima del terreno como poco en los tramos a nivel, m.
 *
 * Ciento cincuenta: los quinientos pies de la altura mínima de un vuelo
 * visual fuera de poblado (SERA.5005). Es la regla que un piloto de verdad
 * lleva en la cabeza para el viento en cola; sobre un pueblo son el doble,
 * que es lo que Los Rodeos le pide a su circuito norte.
 */
export const SOBRE_EL_TERRENO = 150;

/**
 * Cuánto a cada lado del dibujo se mira el terreno, m, en un circuito de esta
 * escala.
 *
 * El dibujo es una línea y quien lo vuela no va por ella: en cada viraje se
 * aparta lo que da su radio de giro. Así que se mira un pasillo de un radio de
 * viraje a cada lado —con veinticinco grados de alabeo, que es como se vira
 * en un circuito— y nunca menos de seiscientos metros, que es el radio en el
 * que SERA manda mirar los obstáculos. Con la avioneta mandan los
 * seiscientos; con el JAZ 90, que vira con kilómetro y medio, manda el viraje.
 *
 * ## A la velocidad a la que se vuela el circuito, no a la de aproximación
 *
 * Se medía con la de aproximación, que es a la que se cruza el umbral y no a
 * la que se vira en el viento en cola: con el JAZ 90, sesenta y ocho metros
 * por segundo y un kilómetro de radio, cuando su circuito se vuela a ochenta
 * y siete y vira con kilómetro y medio. El pasillo protegía un avión más
 * lento que el que pasa por él. Ahora va la de la ficha —`velocidadDeCircuito`—
 * y, sin avión, la de aproximación del entrenador estirada, que es lo que
 * había.
 */
export function pasilloDelCircuito(
  escala = 1,
  velocidad = APROXIMACION_DEL_ENTRENADOR * escala,
): number {
  return Math.max(600, radioDeViraje(velocidad));
}

/** Alabeo de los virajes de un circuito, rad: veinticinco grados. */
export const ALABEO_DE_CIRCUITO = (25 * Math.PI) / 180;

/**
 * Radio de un viraje coordinado a esta velocidad, m: `v² / (g · tan φ)`.
 *
 * Es la cuenta que dice por qué un circuito se vuela despacio: el radio va
 * con el **cuadrado** de la velocidad, así que ir un treinta por ciento más
 * rápido pide casi el doble de sitio.
 */
export function radioDeViraje(
  velocidad: number,
  alabeo = ALABEO_DE_CIRCUITO,
): number {
  return (velocidad * velocidad) / (9.81 * Math.tan(alabeo));
}

/** Cada cuánto se cata el terreno del pasillo, m: la rejilla del relieve es de cuarenta y tres. */
const CATA = 50;

/**
 * Lo más alto que hay en el pasillo de los tramos que se vuelan a nivel —el
 * viento cruzado y el viento en cola—, en metros **sobre la pista**.
 *
 * Con lo que queda por delante del final de la subida y pasadas las dos
 * esquinas, que es por donde se abre quien vira tarde; y sin lo del otro lado
 * del eje al empezar el viento cruzado, que queda a la espalda del viraje. La
 * base no entra: es bajada, y lo que la protege es la senda, como a la final.
 */
export function techoDelPasillo(
  runway: Pista,
  cotaDePista: number,
  suelo: (x: number, z: number) => number,
  mano: Mano,
  escala = 1,
  /** A qué se vuela el circuito, m/s. Ver `pasilloDelCircuito`. */
  velocidad?: number,
): number {
  const v = verticesDelCircuito(runway, cotaDePista, mano, escala);
  const w = pasilloDelCircuito(escala, velocidad);
  let techo = -Infinity;
  for (const [i, desde] of [
    [1, 0],
    [2, -w],
  ] as const) {
    const a = v[i]!;
    const b = v[i + 1]!;
    const largo = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const ux = (b.x - a.x) / largo;
    const uz = (b.z - a.z) / largo;
    for (let s = desde; s <= largo + w; s += CATA) {
      for (let o = -w; o <= w; o += CATA) {
        const x = a.x + ux * s - uz * o;
        const z = a.z + uz * s + ux * o;
        techo = Math.max(techo, suelo(x, z) - cotaDePista);
      }
    }
  }
  return techo;
}

/**
 * Cuánto separa del terreno el circuito de costumbre volado por un lado, m:
 * su altura menos lo más alto de su pasillo. Negativo es volar dentro del
 * monte.
 */
export function holguraDelCircuito(
  runway: Pista,
  cotaDePista: number,
  suelo: (x: number, z: number) => number,
  mano: Mano,
  escala = 1,
  velocidad?: number,
): number {
  return (
    alturaDelCircuito(escala, sendaDe(runway)) -
    techoDelPasillo(runway, cotaDePista, suelo, mano, escala, velocidad)
  );
}

/** Por qué lado y a qué altura se vuela un circuito. */
export interface FormaDelCircuito {
  readonly mano: Mano;
  /** Altura de los tramos a nivel sobre la pista, m. */
  readonly altura: number;
  /**
   * **A qué altura se llega a la esquina de la base**, m, si no es la de los
   * tramos a nivel: solo donde el AIP publica una altura por encima de la que
   * tendría el circuito sin ella. Ver `formaDelCircuito`.
   */
  readonly enLaBase?: number;
}

/**
 * **Lo que publica el AIP del circuito** de una cabecera, para un avión: el
 * lado y la altitud, cada uno si lo publica. Ver `loPublicado`.
 */
export interface LoPublicado {
  readonly mano?: Mano | undefined;
  /** Metros sobre el nivel del mar, que es como lo publica: altitud con QNH. */
  readonly altitud?: number | undefined;
}

/**
 * **Por qué lado se vuela el circuito de esta pista, y a qué altura.**
 *
 * Izquierda y a la altura de costumbre, que es la norma, **salvo que el
 * terreno no lo deje**. Por cada lado se mira qué altura hace falta para
 * pasar `SOBRE_EL_TERRENO` por encima de todo lo que hay en el pasillo, y:
 *
 * - si a la izquierda basta la de costumbre, izquierda;
 * - si la derecha pide `VENTAJA` menos, derecha: mover un circuito de lado es
 *   cambiar una regla que todo el mundo conoce, y eso no se hace por unos
 *   metros;
 * - y en el lado que quede, la altura que pida, que nunca es menos que la de
 *   costumbre.
 *
 * Sin terreno que mirar —una prueba, un escenario sin relieve—, izquierda y
 * de costumbre.
 *
 * ## Lo que se miraba antes, y por qué no bastaba
 *
 * Solo la línea del viento en cola **de la avioneta**, a doscientos
 * cincuenta metros, y para todos los aviones igual. El del reactor es el doble
 * de grande, va más alto y vira con un kilómetro de radio, así que se decidía
 * su lado mirando un terreno por el que no pasa. Medido en Los Rodeos con el
 * JAZ 90 saliendo por la 30: por el sur, la ladera de La Esperanza queda
 * setenta metros por encima de su altura dentro del radio de viraje; por el
 * norte le sobran cincuenta. Se va al norte, que es uno de los dos circuitos
 * que publica el AIP. Y en La Palma, El Hierro y La Gomera la mano sigue
 * siendo la del mar, con los dos aviones, como estaba.
 *
 * Donde los dos lados piden lo mismo y es más que la costumbre —la avioneta
 * en Los Rodeos, en su llano entre dos montes—, el circuito sube lo que haga
 * falta y se queda a la izquierda.
 *
 * ## Y a la altitud que publica el AIP, donde la publica
 *
 * Cinco campos del juego la publican, los cinco sobre el nivel del mar: los
 * convencionales de Asunción a 1.500 pies y sus reactores a 1.800, Encarnación
 * a 2.100, Pedro Juan Caballero a 3.000, Mariscal Estigarribia a 1.700 y Cuatro
 * Vientos a 3.000 (ADR 0027, enmienda H92). Entonces los tramos a nivel se
 * vuelan ahí, y lo que marca el altímetro es lo que dice la carta. El terreno
 * sigue mandando por abajo: nunca a menos de `SOBRE_EL_TERRENO` del pasillo.
 *
 * **La base y la final no se mueven.** La altura de costumbre es la de una base
 * que baja ciento cincuenta metros en el ancho de esta figura, que es más
 * estrecha que la publicada: con los 375 m de Asunción la base de la avioneta
 * caería dieciséis grados. Lo que sobra se baja antes, en el viento en cola y
 * por la senda de la final, y a la esquina se llega a la altura de siempre
 * (`enLaBase`). Es como se vuela: la bajada empieza hacia el través del umbral,
 * no en la esquina. Ver `lineaDelCircuito`.
 *
 * **Y donde no cabe, no se fuerza.** Si a tres grados hay que empezar a bajar
 * antes del través del centro de la pista, el viento en cola ya no es un tramo a
 * esa altura sino una bajada, y se vuela la de costumbre. Les pasa a las
 * avionetas de Encarnación: la carta dibuja un circuito de cinco kilómetros de
 * ancho con ocho de final, y el suyo tiene uno y menos de dos. Para bajar los
 * 197 m de más tendrían que empezar a 3.760 m de la esquina, en un tramo de
 * 4.990 y después de subir a 6,1° desde la punta misma de la pista.
 */
export function formaDelCircuito(
  runway: Pista,
  cotaDePista: number,
  suelo?: (x: number, z: number) => number,
  escala = 1,
  /**
   * Lo que publica el AIP, si lo publica. Con lado no se elige, y el terreno
   * solo pone la altura; con altitud, se vuela a ella. Ver `loPublicado`.
   */
  publicado: LoPublicado = {},
  /**
   * A qué vuela el circuito **este** avión, m/s: su `velocidadDeCircuito`.
   * Es lo que ancha el pasillo que se mira. Ver `pasilloDelCircuito`.
   */
  velocidad?: number,
): FormaDelCircuito {
  const costumbre = alturaDelCircuito(escala, sendaDe(runway));
  // Lo que hace falta para pasar por encima del pasillo de este lado.
  const libra = (mano: Mano): number =>
    suelo
      ? Math.ceil(
          techoDelPasillo(runway, cotaDePista, suelo, mano, escala, velocidad) +
            SOBRE_EL_TERRENO,
        )
      : -Infinity;
  const conLaAltitud = (mano: Mano, libre: number): FormaDelCircuito => {
    const pide = Math.max(costumbre, libre);
    if (publicado.altitud === undefined) return { mano, altura: pide };
    const altura = Math.max(publicado.altitud - cotaDePista, libre);
    if (altura <= pide) return { mano, altura };
    // Del través del centro de la pista a la esquina de la base.
    const desdeElCentro = hastaElUmbralDeToma(runway) + BASE_A_FINAL * escala;
    const cabe = (altura - pide) / Math.tan(sendaDe(runway)) <= desdeElCentro;
    return cabe ? { mano, altura, enLaBase: pide } : { mano, altura: pide };
  };
  if (publicado.mano) return conLaAltitud(publicado.mano, libra(publicado.mano));
  const izquierda = libra("izquierda");
  const derecha = libra("derecha");
  return Math.max(costumbre, derecha) + VENTAJA < Math.max(costumbre, izquierda)
    ? conLaAltitud("derecha", derecha)
    : conLaAltitud("izquierda", izquierda);
}

/**
 * El lado que publica el AIP para esta cabecera y este avión, o nada si no lo
 * publica.
 *
 * Con las avionetas aparte donde el AIP las separa: «tráfico ligero»,
 * categorías A y B, que son las que cruzan el umbral a menos de 121 nudos.
 * Ver `circuitoPublicado` en `scenarios.ts`.
 */
export function manoPublicada(
  escenario: Pick<Scenario, "circuitoPublicado">,
  cabecera: string | null,
  escala = 1,
): Mano | undefined {
  const p = cabecera ? escenario.circuitoPublicado?.[cabecera] : undefined;
  if (p === undefined || typeof p === "string") return p;
  return APROXIMACION_DEL_ENTRENADOR * escala < LIGERO_HASTA ? p.ligero : p.resto;
}

/**
 * La altitud que publica el AIP para el circuito de este campo, m sobre el
 * nivel del mar, o nada si no la publica. Con la de los reactores aparte donde
 * el AIP la separa: «convencional» es lo que no es un reactor, y un turbohélice
 * lo es. Ver `altitudDelCircuito` en `scenarios.ts`.
 */
export function altitudPublicada(
  escenario: Pick<Scenario, "altitudDelCircuito">,
  reactor: boolean,
): number | undefined {
  const p = escenario.altitudDelCircuito;
  if (p === undefined) return undefined;
  return (typeof p === "number" ? p : reactor ? p.reactor : p.convencional) * 0.3048;
}

/**
 * **Lo que publica el AIP del circuito de esta cabecera para este avión**, y la
 * única puerta por la que entra: la piden el hilo ocre, el circuito de la torre,
 * el del tráfico y el de los bancos. Ver `formaDelCircuito`.
 */
export function loPublicado(
  escenario: Pick<Scenario, "circuitoPublicado" | "altitudDelCircuito">,
  cabecera: string | null,
  escala: number,
  reactor: boolean,
): LoPublicado {
  return {
    mano: manoPublicada(escenario, cabecera, escala),
    altitud: altitudPublicada(escenario, reactor),
  };
}

/** Hasta qué velocidad de aproximación se es tráfico ligero, m/s: 121 nudos. */
const LIGERO_HASTA = 121 * 0.514444;

/** El lado, para quien solo necesita el lado. Ver `formaDelCircuito`. */
export function manoDelCircuito(
  runway: Pista,
  cotaDePista: number,
  suelo?: (x: number, z: number) => number,
  escala = 1,
): Mano {
  return formaDelCircuito(runway, cotaDePista, suelo, escala).mano;
}

/**
 * Cuánta altura de menos tiene que pedir la derecha para ganarse el
 * circuito, m.
 *
 * Cien metros. Es un tercio de la altura del circuito: por debajo de eso, los
 * dos lados son el mismo lado y manda la norma.
 */
const VENTAJA = 100;

/**
 * La altura de costumbre de los tramos a nivel, sobre la pista, m.
 *
 * **Y sale de la senda, no de otro factor.** Estirar la figura sin subirla
 * dejaría la base cayendo casi nada: el avión llegaría al punto de entrada en
 * final **por debajo** de la senda de tres grados, que a cinco kilómetros y
 * medio del umbral pasa por trescientos metros. Así que el circuito va a lo
 * que pide la senda ahí, más ciento cincuenta metros de base para bajarlos —
 * y nunca por debajo de los doscientos cincuenta de siempre.
 *
 * Con el entrenador la cuenta da doscientos cuarenta y cuatro y manda el
 * suelo, así que **el circuito de la avioneta no se mueve ni un metro** donde
 * el terreno no pide más. Con el JAZ 120 da trescientos sesenta y cuatro.
 */
export function alturaDelCircuito(escala = 1, senda = SENDA): number {
  return Math.max(
    ALTURA_DE_CIRCUITO,
    BASE_A_FINAL * escala * Math.tan(senda) + 150,
  );
}

/**
 * **La senda por la que el circuito entra en final**, rad: la de la cabecera,
 * la de su PAPI, y si no se sabe, tres grados.
 *
 * Era siempre tres, y el circuito era lo único que no miraba la senda de su
 * pista: las luces, el rombo de la final, el G/S del automático y la
 * instructora ya iban por la publicada. En la 21 de Lanzarote, cuyo PAPI está
 * a 3,7° por la loma que hay a una milla del umbral (AIP España, AD 2-GCRR,
 * 2.14), el circuito entraba en final a tres grados, pasaba a treinta y cinco
 * metros de la loma, y al JAZ 90 su avisador le daba «terrain, pull up» a
 * 2.500 m del umbral en el circuito que el propio juego le dibujaba (ADR
 * 0027, enmienda H13d2). Por su senda entra más alto, y la base baja lo mismo.
 */
export function sendaDe(runway: Pick<Pista, "senda">): number {
  return runway.senda ?? SENDA;
}

/** Lo que se vuela de más en la base sobre la Vref, m/s: quince nudos. */
const EXTRA_EN_LA_BASE = 15 * 0.514444;

/**
 * Cuánto se aparta el viento en cola del eje, m.
 *
 * **Lo que dice la escala, pero nunca menos de lo que piden los dos virajes.**
 * La escala crece con la velocidad de aproximación y el radio de viraje con su
 * cuadrado, así que en un reactor la cuenta lineal se quedaba corta: con el JAZ
 * 90 salían dos kilómetros y pico de separación y los dos virajes de la base,
 * a veinticinco grados y a la velocidad de base, se comían casi tres. El avión
 * llegaba a los quinientos pies todavía alineándose, que es justo lo que no es
 * una final estabilizada. Lo midió el piloto del banco en el circuito de Los
 * Rodeos. Un reactor de verdad vuela el circuito más abierto que una avioneta
 * por eso mismo.
 *
 * Dos radios y un diez por ciento para un trozo de base recta. En las
 * avionetas manda la escala y su circuito no se mueve.
 */
export function separacionDelCircuito(escala = 1): number {
  const base = APROXIMACION_DEL_ENTRENADOR * escala + EXTRA_EN_LA_BASE;
  return Math.max(SEPARACION * escala, 2.2 * radioDeViraje(base));
}

export function verticesDelCircuito(
  runway: Pista,
  cotaDePista: number,
  mano: Mano = "izquierda",
  escala = 1,
  /**
   * Altura de los tramos a nivel, m. La pide el terreno o la publica el AIP:
   * ver `formaDelCircuito`.
   */
  altura = alturaDelCircuito(escala, sendaDe(runway)),
  /** A cuál se llega a la esquina de la base, m. Ver `FormaDelCircuito.enLaBase`. */
  enLaBase = altura,
): PuntoDeCircuito[] {
  const h = (runway.heading * Math.PI) / 180;
  // Hacia dónde se despega, y qué es la izquierda desde ahí. Con el circuito
  // por la derecha es lo mismo con el signo cambiado, y nada más.
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const signo = mano === "izquierda" ? 1 : -1;
  const ix = -Math.cos(h) * signo;
  const iz = -Math.sin(h) * signo;
  const medio = runway.length / 2;

  /** Un punto a `a` metros por delante del centro y `l` hacia la mano. */
  const en = (a: number, l: number, alto: number): PuntoDeCircuito => ({
    x: runway.x + fx * a + ix * l,
    y: cotaDePista + alto,
    z: runway.z + fz * a + iz * l,
  });

  const recto = RECTO_TRAS_LA_PISTA * escala;
  const separacion = separacionDelCircuito(escala);
  const entrada = BASE_A_FINAL * escala;
  /*
   * **Y con una altura publicada por encima de la de costumbre, se sigue
   * subiendo en el viento cruzado**, al mismo paso que desde la pista: en una
   * figura de avioneta, los 447 m de Encarnación no se ganan antes del primer
   * giro. Nunca por debajo de la que tendría el circuito sin ella, que es la
   * que libra el terreno.
   */
  const alGirar =
    enLaBase < altura
      ? Math.max(enLaBase, (altura * (runway.length + recto)) / (runway.length + recto + separacion))
      : altura;
  /*
   * **La final se cuenta desde donde se toca**, que con el umbral desplazado
   * no es la punta del asfalto: la base se gira a la misma distancia del
   * umbral de aterrizaje y la entrada en final cae en su senda, la de los
   * aros y el PAPI. El despegue sí sale de la punta, que se despega con la
   * pista entera. Ver `umbral-desplazado.ts`.
   */
  const toma = -hastaElUmbralDeToma(runway);
  return [
    // La cabecera de salida, a ras de pista: el circuito empieza en el suelo.
    en(-medio, 0, 0),
    // Final de la subida, ya a la altura del circuito.
    en(medio + recto, 0, alGirar),
    // La esquina de allá: fin del viento cruzado.
    en(medio + recto, separacion, altura),
    // La esquina de acá: fin del viento en cola, empieza la base.
    en(toma - entrada, separacion, enLaBase),
    // Y la entrada en final, sobre el eje y ya en la senda de los aros.
    en(toma - entrada, 0, entrada * Math.tan(sendaDe(runway))),
  ];
}

/**
 * **Dónde se empieza a bajar en el viento en cola**, o `null` si se vuela a
 * nivel hasta la esquina de la base, que es lo de siempre.
 *
 * Es el punto desde el que, por la senda de la final, se llega a la esquina a su
 * altura. Con la avioneta cae hacia el través del umbral —a 1.930 m de la
 * esquina en Mariscal Estigarribia, con el través a 1.800—, que es donde se
 * empieza a bajar de verdad. Sin pasarse del principio del tramo.
 */
export function bajadaDelVientoEnCola(
  vertices: readonly PuntoDeCircuito[],
  senda = SENDA,
): PuntoDeCircuito | null {
  const lejos = vertices[2];
  const esquina = vertices[3];
  if (!lejos || !esquina || lejos.y <= esquina.y) return null;
  const largo = Math.hypot(lejos.x - esquina.x, lejos.z - esquina.z);
  const antes = (lejos.y - esquina.y) / Math.tan(senda);
  if (antes >= largo) return null;
  return {
    x: esquina.x + ((lejos.x - esquina.x) * antes) / largo,
    y: lejos.y,
    z: esquina.z + ((lejos.z - esquina.z) * antes) / largo,
  };
}

/**
 * **La línea que se vuela**: los cinco vértices, con el punto del viento en cola
 * en el que se empieza a bajar si lo hay. Es lo que se dibuja y por donde va el
 * tráfico. Ver `bajadaDelVientoEnCola`.
 */
export function lineaDelCircuito(
  vertices: readonly PuntoDeCircuito[],
  senda = SENDA,
): readonly PuntoDeCircuito[] {
  const baja = bajadaDelVientoEnCola(vertices, senda);
  return baja ? [...vertices.slice(0, 3), baja, ...vertices.slice(3)] : vertices;
}

/**
 * **Lo que te queda de circuito hasta la entrada en final**, m, y en qué
 * tramo vas, o `null` si andas lejos de él: el punto más cercano de la línea
 * quebrada, como `tramoEn`, y de ahí lo que falta por ella hasta el último
 * vértice. Con eso la torre sabe cuándo llegas aunque todavía no estés en la
 * final. Ver `tuLlegadaParaLaTorre` en `game.ts` y `flight/salida-tapada.ts`.
 *
 * Cuenta también lo que te separa de la línea: quien alarga el viento en cola
 * y está pasado de la esquina de la base vuela luego esa misma distancia de
 * más en la final, y sin ella la torre le esperaba antes de tiempo.
 */
export function loQueQuedaDeCircuito(
  vertices: readonly PuntoDeCircuito[],
  x: number,
  z: number,
  escala = 1,
): { tramo: TramoDeCircuito; metros: number } | null {
  const ancho = EN_EL_CIRCUITO * escala;
  let menor = ancho * ancho;
  let mejor: { tramo: TramoDeCircuito; metros: number } | null = null;
  for (let i = 1; i < vertices.length; i++) {
    const a = vertices[i - 1]!;
    const b = vertices[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const largo2 = dx * dx + dz * dz;
    if (largo2 < 1) continue;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / largo2));
    const d = (x - (a.x + dx * t)) ** 2 + (z - (a.z + dz * t)) ** 2;
    if (d >= menor) continue;
    const tramo = TRAMOS[i - 1];
    if (!tramo) continue;
    menor = d;
    let metros = Math.sqrt(d) + Math.sqrt(largo2) * (1 - t);
    for (let k = i + 1; k < vertices.length; k++) {
      const p = vertices[k - 1]!;
      const q = vertices[k]!;
      metros += Math.hypot(q.x - p.x, q.z - p.z);
    }
    mejor = { tramo, metros };
  }
  return mejor;
}

export interface Circuito {
  readonly grupo: Group;
  /** Los cinco vértices, por si alguien —el banco— quiere medirlos. */
  readonly vertices: readonly PuntoDeCircuito[];
  /** Por qué lado y a qué altura, para que el tráfico vuele el mismo. */
  readonly forma: FormaDelCircuito;
  /**
   * En qué tramo está el avión, o `null` si anda lejos del circuito.
   *
   * Se resuelve por el punto más cercano de la línea quebrada, igual que hace
   * el coche del sígame con la ruta de rodaje: es lo único que funciona sin
   * pedirle al jugador que haga las cosas en orden, y quien juega no las hace
   * en orden.
   */
  tramoEn(x: number, z: number): TramoDeCircuito | null;
  dispose(): void;
}

/**
 * Monta el circuito de una pista.
 *
 * `cotaDePista` es la cota del asfalto, no la del terreno de debajo: el
 * circuito se vuela a una altura sobre **la pista**, que es lo que se mira
 * para saber si se va alto o bajo, y en un campo con lomas el suelo de debajo
 * no dice nada.
 */
export function crearCircuito(
  runway: Pista,
  cotaDePista: number,
  suelo?: (x: number, z: number) => number,
  escala = 1,
  /** Lo que publica el AIP, si lo publica. Ver `loPublicado`. */
  publicado?: LoPublicado,
  /** A qué vuela el circuito este avión, m/s. Ver `formaDelCircuito`. */
  velocidad?: number,
): Circuito {
  const forma = formaDelCircuito(
    runway,
    cotaDePista,
    suelo,
    escala,
    publicado,
    velocidad,
  );
  const vertices = verticesDelCircuito(
    runway,
    cotaDePista,
    forma.mano,
    escala,
    forma.altura,
    forma.enLaBase,
  );
  const linea = lineaDelCircuito(vertices, sendaDe(runway));
  const grupo = new Group();
  grupo.name = "circuito";

  const puntos: number[] = [];
  for (let i = 1; i < linea.length; i++) {
    const a = linea[i - 1]!;
    const b = linea[i]!;
    const largo = Math.hypot(b.x - a.x, b.z - a.z);
    const cuantos = Math.max(1, Math.round(largo / PASO));
    for (let k = 0; k < cuantos; k++) {
      const t = k / cuantos;
      puntos.push(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t,
      );
    }
  }
  const ultimo = vertices[vertices.length - 1]!;
  puntos.push(ultimo.x, ultimo.y, ultimo.z);

  /*
   * **Y las esquinas llevan poste.**
   *
   * Un hilo de puntos a tu misma altura se ve como una fila de puntos pegada
   * al horizonte, y desde ahí no se lee dónde hay que girar: se lee que hay
   * algo delante. Lo que hace falta saber en un circuito es **dónde está la
   * esquina**, así que cada una lleva su columna de puntos desde el suelo
   * hasta la altura del circuito.
   *
   * Es lo mismo que hace un piloto de verdad, que no mira al aire: mira un
   * punto del suelo —un pueblo, un depósito, un cruce— y gira ahí. Aquí el
   * punto del suelo se dibuja, porque el campo paraguayo no tiene depósitos.
   */
  if (suelo) {
    for (const v of vertices.slice(1, 4)) {
      const abajo = suelo(v.x, v.z);
      for (let y = abajo + 15; y < v.y; y += 25) puntos.push(v.x, y, v.z);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(puntos, 3));
  const material = new PointsMaterial({
    color: OCRE,
    // Tamaño fijo en pantalla, como el hilo de la senda: un punto que se
    // encoge con la distancia desaparece justo cuando hay que ver la vuelta
    // entera, que es al principio.
    size: 5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const hilo = new Points(geo, material);
  hilo.name = "hilo-del-circuito";
  hilo.renderOrder = 1;
  grupo.add(hilo);

  return {
    grupo,
    vertices,
    forma,
    tramoEn(x, z) {
      let mejor: TramoDeCircuito | null = null;
      // Y el ancho con el que se cuenta «estoy en el circuito» crece con la
      // figura: en un circuito tres veces más largo, mil doscientos metros
      // son un pasillo estrecho.
      const ancho = EN_EL_CIRCUITO * escala;
      let menor = ancho * ancho;
      for (let i = 1; i < vertices.length; i++) {
        const a = vertices[i - 1]!;
        const b = vertices[i]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const largo2 = dx * dx + dz * dz;
        if (largo2 < 1) continue;
        const t = Math.max(
          0,
          Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / largo2),
        );
        const px = a.x + dx * t;
        const pz = a.z + dz * t;
        const d = (x - px) ** 2 + (z - pz) ** 2;
        if (d < menor) {
          menor = d;
          mejor = TRAMOS[i - 1] ?? null;
        }
      }
      return mejor;
    },
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}
