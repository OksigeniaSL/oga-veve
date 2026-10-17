/**
 * **Tu salida tapada**: uno que va a salir rueda —o espera ya— hacia una
 * doble raya que está en la calle por la que vas a dejar la pista, y no le
 * da tiempo a irse antes de que llegues.
 *
 * ## El caso
 *
 * La torre ya no deja rodar hacia tu salida a quien no se iría a tiempo —ver
 * `retenidos` en `flight/turno-de-pista.ts`—, pero eso lo decide al darle
 * permiso para rodar, y solo si para entonces ya te tiene en la secuencia. Si
 * empezó a rodar antes, contigo todavía lejos, y después un tercero le ocupó
 * la pista —uno que aterriza, otro que sale delante—, cuando la pista queda
 * libre ya no le da tiempo a irse antes que tú. Ni entraba en la pista, que
 * era tuya, ni tú la dejabas, que estaba él en tu calle: aterrizabas, y al
 * dejar la pista pasabas a su lado. Medido en El Hierro con el JAZ 20: uno
 * parado en su doble raya seis minutos, a treinta y cinco metros de ti.
 *
 * ## Lo que hace una torre
 *
 * Primero, **te ve en todo el circuito**, no solo en la final: con eso no
 * deja rodar hacia tu salida a quien no se iría antes —lo retiene en su
 * puesto— y al que sí se iría le da la pista en cuanto queda libre, sin
 * esperar a que entres en final, que entonces ya no le da tiempo. Ver
 * `QuienJuega.llegada` en `world/trafico.ts`.
 *
 * Y si aun así el conflicto está —el que ya rodaba, el que la red de la
 * retención soltó—, lo resuelve antes de que llegues con lo que de verdad usa
 * un controlador de aeródromo:
 *
 * - **Te retrasa a ti**, que vienes por el aire y puedes esperar dando una
 *   vuelta, y le da la pista al que sale en cuanto queda libre. La vuelta es
 *   un tres sesenta a régimen estándar, dos minutos, hacia fuera del
 *   circuito: «ORBIT RIGHT (o LEFT)», la fraseología de demorar aeronaves del
 *   control de aeródromo (OACI, Doc 4444, capítulo 12, 12.3.4; el párrafo
 *   exacto, por verificar), con el porqué detrás, «departing traffic». Con
 *   una no basta si el de la pista tarda: se mira otra vez al acabarla, y
 *   como mucho van dos.
 * - **Y si ya no hay tiempo**, porque estás en una final corta, te manda al
 *   aire con su porqué: «GO AROUND» (Doc 4444, 12.3.4, aproximación
 *   frustrada; por verificar), «departing traffic». Sale él y vuelves por el
 *   circuito. Renunciar es ganar, y la frustrada se felicita igual.
 *
 * Alargar el viento en cola —«MAKE LONG APPROACH (o EXTEND DOWNWIND)», de la
 * misma lista— es la otra herramienta, y aquí no se usa: alarga el tramo que
 * el juego dibuja y canta, y el circuito dibujado es una figura fija. La
 * vuelta sirve en el circuito y en la final, y es la misma lección: esperar
 * en el aire para que el de tierra salga. Ni «NUMBER TWO», que es tu puesto
 * en la fila de llegadas detrás de otro que aterriza, no detrás de uno que
 * sale: eso ya lo hace `numeroDos` en `flight/turno-de-pista.ts`.
 *
 * ## Lo que hace un AFIS
 *
 * Un AFIS no da órdenes: informa. Te cuenta lo que hay —«departing
 * traffic»—, y decide quien vuela. En los peldaños de abajo, ya en la final,
 * la instructora propone irse al aire con calma, como cuando la aproximación
 * no viene bien: si se va, se felicita; si no, se ve lo que pasa. Ver
 * `proponenIrseAlAire` en `game.ts`.
 *
 * ## Y la red
 *
 * Es un candado entre la frecuencia, el dibujo y tu vuelo, y lleva la suya:
 * en una llegada nadie te retrasa más de `RED_DE_LA_SALIDA`, la vuelta que
 * no se da se deja de esperar a `TOPE_DE_LA_VUELTA` —o en cuanto sigues
 * derecho hacia la pista en la final corta—, y como mucho son
 * `VUELTAS_COMO_MUCHO`. Pasado eso se aterriza, y lo de después lo reparte el
 * suelo: una espera que no acaba es un juego colgado.
 *
 * Sin three.js ni DOM: decide con números. Lo cablea `TurnoDePista`.
 */

/** Lo que dura una vuelta de espera a régimen estándar, tres grados por segundo, s. */
export const LO_QUE_DURA_LA_VUELTA = 120;

/**
 * **Lo que hay que haber girado para que la vuelta cuente como dada**, rad:
 * trescientos treinta grados. Una vuelta entera se acaba donde empezó, y
 * nadie la cierra al grado; con treinta de margen se da por hecha al volver
 * a mirar hacia donde se iba.
 */
export const VUELTA_HECHA = (330 * Math.PI) / 180;

/**
 * **Lo más que se espera a que des la vuelta**, s: tres veces lo que dura.
 * Quien no la da —no la oyó, no sabe— no puede quedarse con la orden puesta
 * para siempre; pasado esto se da por acabada y se mira otra vez.
 */
export const TOPE_DE_LA_VUELTA = 3 * LO_QUE_DURA_LA_VUELTA;

/**
 * **En la final, desde cuánto se te puede pedir una vuelta**, s al umbral:
 * minuto y medio. Más cerca ya no es esperar dando una vuelta: es irse al
 * aire. En el circuito no hace falta, que ahí la vuelta se da a su altura.
 */
export const VUELTA_DESDE_EN_FINAL = 90;

/**
 * **Lo menos que hay que ir sobre la pista para dar una vuelta**, m:
 * ciento cincuenta, quinientos pies. Por debajo no se vira en redondo cerca
 * del suelo: se va al aire.
 */
export const ALTO_PARA_LA_VUELTA = 150;

/**
 * **Y por debajo de esto ya no te manda al aire**, m: treinta, la mitad de la
 * altura de decisión. Ahí no es una decisión, es un susto, y la torre que no
 * lo vio antes te deja aterrizar.
 */
export const ALTO_PARA_IRSE = 30;

/** Cuántas vueltas como mucho en una llegada. */
export const VUELTAS_COMO_MUCHO = 2;

/**
 * **Lo más que se te retrasa en una llegada**, s: siete minutos, lo mismo que
 * la torre retiene a uno en su puesto (`RETENCION_MAXIMA`). Dos vueltas, la
 * espera a que la pista quede libre y una salida caben de sobra. Es tuya y no
 * de cada avión: con una red por avión, cada salida nueva que rodaba mientras
 * dabas la vuelta te pedía otra, y medido en Encarnación no se aterrizaba
 * nunca.
 */
export const RED_DE_LA_SALIDA = 420;

/** Lo que ve la torre de tu llegada. */
export interface TuLlegadaALaPista {
  /** Segundos que te faltan para el umbral. */
  readonly segundos: number;
  /**
   * Por dónde vienes: por el circuito —el viento en cola o la base— o ya por
   * la final, la de la torre o la del plan.
   */
  readonly donde: "circuito" | "final";
  /** Tu altura sobre la pista, m. */
  readonly alto: number;
}

/** Lo que se sabe del que tapa tu salida. Ver `QuienTapaTuSalida` en `world/trafico.ts`. */
export interface LoQueTardaEnIrse {
  /** Lo que tarda en irse si se le da la pista ahora, s. */
  readonly leHace: number;
  /** Y lo que espera antes a que la pista quede libre, s. */
  readonly espera: number;
}

/**
 * - `vuelta`: la torre te pide un tres sesenta.
 * - `alAire`: la torre te manda al aire.
 * - `aviso`: un AFIS te cuenta lo que hay, y en la final la instructora
 *   propone irse.
 */
export type RemedioDeTuSalida = "vuelta" | "alAire" | "aviso";

/**
 * **Si al que tapa tu salida le da tiempo a irse antes de que llegues**,
 * contando lo que tiene que esperar a que la pista quede libre. El margen ya
 * va en `leHace`.
 */
export function seVaAntes(llegada: TuLlegadaALaPista, tapa: LoQueTardaEnIrse): boolean {
  return llegada.segundos > tapa.leHace + tapa.espera;
}

/**
 * **Qué se hace si no le da tiempo**, o `null` si le da o si ya no se puede
 * hacer nada. Ver el comentario del módulo.
 *
 * @param vueltas las que ya te han pedido en esta llegada
 */
export function remedioParaTuSalida(
  llegada: TuLlegadaALaPista,
  tapa: LoQueTardaEnIrse,
  quien: "torre" | "afis",
  vueltas: number,
): RemedioDeTuSalida | null {
  if (seVaAntes(llegada, tapa)) return null;
  if (quien === "afis") return "aviso";
  const cabeLaVuelta =
    vueltas < VUELTAS_COMO_MUCHO &&
    llegada.alto >= ALTO_PARA_LA_VUELTA &&
    (llegada.donde === "circuito" || llegada.segundos >= VUELTA_DESDE_EN_FINAL);
  if (cabeLaVuelta) return "vuelta";
  /*
   * Al aire, solo desde la final: es interrumpir una aproximación, y en el
   * viento en cola no hay aproximación que interrumpir.
   */
  return llegada.donde === "final" && llegada.alto >= ALTO_PARA_IRSE ? "alAire" : null;
}

/**
 * **Lo que se ha girado de un rumbo a otro**, rad, sin signo y por el camino
 * corto: lo que suma la vuelta en un paso.
 */
export function giradoEntre(antes: number, ahora: number): number {
  const d = (((ahora - antes) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  return Math.abs(d);
}
