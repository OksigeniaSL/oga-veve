/**
 * La cuenta de la toma: *twenty five hundred… one hundred, fifty, forty,
 * thirty, twenty, ten*.
 *
 * Es lo mejor que tiene la aviación para este juego. **Dice la altura sin
 * mirar ningún instrumento y sin saber leer**, y enseña sola el ritmo de la
 * recogida: la cuenta se acelera según te acercas, y cuando los números se
 * pegan unos a otros es que hay que tirar. Un niño de cuatro años la repite a
 * la tercera vez.
 *
 * ## Es del radioaltímetro, y de nadie más
 *
 * La cuenta la dice **una caja**: el radioaltímetro, un radar que mira hacia
 * abajo y mide la distancia a lo que hay justo debajo del avión, y el
 * avisador que convierte esa medida en voz. No la dice la instructora ni la
 * torre, y no espera turno detrás de nadie: en una cabina de verdad la caja
 * canta por encima de la radio.
 *
 * De ahí salen las cuatro reglas de este fichero, y ninguna es un gusto:
 *
 * - **Mide lo que mide un radar.** La altura de las ruedas sobre el suelo que
 *   hay debajo —no sobre la cota de la pista—, y hasta donde llega: unos dos
 *   mil quinientos pies. Por encima no marca nada. Ver `radioaltimetro`.
 * - **Canta cada número al cruzarlo hacia abajo, y solo entonces.** Un número
 *   que no se puede decir en ese instante no se dice: el siguiente lo
 *   sustituye. Un «one hundred» dicho a sesenta pies es una mentira sobre
 *   dónde estás. Ver `paso`.
 * - **Solo en aproximación, y nunca con peso en las ruedas.** Un radioaltímetro
 *   de verdad no canta la cuenta sobre una sierra en crucero, ni rodando.
 * - **Solo en el avión que la lleva.** El turbohélice de pasaje y los dos
 *   reactores; la avioneta de escuela, el fumigador y el bimotor de pistón no
 *   llevan ninguna caja que cante, y en ellos no hay cuenta. Ver `laCuentaDe`.
 *
 * ## Lo que fallaba, contado por quien lo oyó
 *
 * > «El 400-300-200-100 lo dice la instructora de vuelo y me lo tiene que
 * > decir una voz de robot. Lee 400-300-200 todo seguido cuando estoy lejos.
 * > Un buen rato después me dice 100 sin que cuadre con lo que realmente estoy
 * > haciendo, luego cuando estoy llegando a la pista me dice 50, 40. Y cuando
 * > estoy ya en tierra rodando y frenando me dice 5. ¿Cinco, qué?»
 *
 * Tres averías, y las tres eran de este fichero y de cómo se usaba:
 *
 * - **«Todo seguido»**: la máquina de antes cantaba cada fotograma el escalón
 *   más alto *de los que quedaban por debajo* de la altura, no el que se
 *   acababa de cruzar. Entrar en el embudo de final a doscientos metros
 *   soltaba cuatrocientos, trescientos y doscientos en tres fotogramas.
 * - **«Un buen rato después»**: cada número entraba en la cola de la boca de
 *   la instructora y esperaba detrás de la torre hasta cuatro segundos.
 * - **«Cinco, qué»**: la cuenta en metros de la avioneta, dicha por la
 *   instructora, con un «cinco» que la cola soltaba ya rodando.
 *
 * ## En pies, siempre
 *
 * Las palabras y la unidad son las de verdad, en inglés aeronáutico, igual que
 * IAS y HDG, y en los cuatro peldaños: el radioaltímetro cuenta en pies en
 * cualquier avión del mundo, y quien la oiga aquí la tiene que reconocer tal
 * cual el día que se suba a uno. Traducida o en metros, habría que
 * desaprenderla. Ver la cabecera de `flight/escalera.ts`.
 */

/** Pies a metros. La cuenta se piensa en pies y el modelo vive en metros. */
const PIE = 0.3048;

/**
 * Hasta dónde llega el radioaltímetro, m: dos mil quinientos pies.
 *
 * Es el alcance de los de un avión de línea, y es también de donde sale el
 * primer número de la cuenta: *twenty five hundred* no es una altura bonita,
 * es **el radar que empieza a ver el suelo**.
 */
export const ALCANCE_DEL_RADIOALTIMETRO = 2500 * PIE;

/**
 * Lo que marca el radioaltímetro, m, o `null` si el suelo queda fuera de su
 * alcance.
 *
 * `sobreElSuelo` es la altura del avión sobre el terreno que tiene debajo, que
 * es lo que da el modelo de vuelo; `tren`, cuánto cuelgan las ruedas por
 * debajo de ese punto. **El radioaltímetro se calibra para marcar cero con las
 * ruedas en el suelo**, así que se resta: sin eso, el JAZ 120, con casi seis
 * metros de tren, habría dicho «twenty» con las ruedas a un palmo del asfalto
 * y «ten» ya rodando.
 */
export function radioaltimetro(sobreElSuelo: number, tren: number): number | null {
  const alto = Math.max(0, sobreElSuelo - tren);
  return alto > ALCANCE_DEL_RADIOALTIMETRO ? null : alto;
}

export interface Escalon {
  readonly metros: number;
  /** Lo que se dice, o lo que se enseña en grande. */
  readonly dice: string;
}

export type Aviso = Escalon;

function enPies(pies: number, dice: string): Escalon {
  return { metros: pies * PIE, dice };
}

/**
 * **La cuenta del radioaltímetro**, de más alto a más bajo.
 *
 * Es una de las selecciones de verdad del avisador de proximidad al terreno:
 * los números que canta un radioaltímetro son un menú que elige quien opera
 * el avión, y ésta es la cuenta entera —el radar que empieza a ver el suelo,
 * mil, quinientos, los tres cientos de en medio, cien, y de diez en diez hasta
 * diez—. Espaciada arriba y apretada abajo: esa aceleración **es** la lección.
 *
 * Los tres cientos de en medio se pidieron jugando —«five hundred, four
 * hundred… fifty, forty»—; *twenty five hundred* y *one thousand* se
 * grabaron cuando la cuenta pasó a ser de la caja y dejó de tener sentido
 * recortarla por falta de tomas.
 */
export const LA_CUENTA: readonly Escalon[] = [
  enPies(2500, "twenty five hundred"),
  enPies(1000, "one thousand"),
  enPies(500, "five hundred"),
  enPies(400, "four hundred"),
  enPies(300, "three hundred"),
  enPies(200, "two hundred"),
  enPies(100, "one hundred"),
  enPies(50, "fifty"),
  enPies(40, "forty"),
  enPies(30, "thirty"),
  enPies(20, "twenty"),
  enPies(10, "ten"),
];

/**
 * **Qué cuenta se canta en este avión.**
 *
 * La del radioaltímetro si lo lleva —`avisosHablados` en la ficha— y ninguna
 * si no. En la avioneta la altura se mira en el altímetro y quien acompaña la
 * recogida es la instructora, sin números: ver `Game.acompanarLaRecogida`.
 *
 * Había una segunda cuenta, en metros y en la voz de la instructora, para los
 * aviones sin caja. Era la que se oía «todo seguido» y la del «cinco» ya
 * rodando, y además enseñaba una cosa que no existe: nadie canta la altura en
 * metros en ninguna cabina.
 */
export function laCuentaDe(avion: {
  readonly avisosHablados: boolean;
}): readonly Escalon[] {
  return avion.avisosHablados ? LA_CUENTA : [];
}

/**
 * Cuánto se puede apartar de su número la altura a la que se canta, m.
 *
 * Un quince por ciento, y nunca menos de diez pies. Es la misma vara con la
 * que el banco de vuelo entero mide lo que se oye —`verificar-vuelo-entero`—
 * y está aquí porque **esta máquina se la aplica a sí misma**: si el suelo
 * sube de golpe bajo el avión —un acantilado, un teletransporte del banco— y
 * el número ya quedó muy atrás, se da por cruzado sin decirlo.
 */
export function holguraDe(metros: number): number {
  return Math.max(0.15 * metros, 10 * PIE);
}

/**
 * Cuánto hay que subir **de verdad** para que la cuenta vuelva a armarse, m.
 *
 * Treinta metros de altitud —cien pies—, medidos sobre el mar y no sobre el
 * suelo. Es la diferencia entre irse al aire y pasar por encima de un barranco:
 * en el barranco la altura sobre el suelo sube cien metros y la altitud no se
 * mueve, y así se cantaba «cien» seiscientas siete veces en La Palma. En una
 * frustrada el avión sube cientos de metros; en un rebote, uno o dos.
 */
const SUBIR_DE_VERDAD = 30;

/** Lo que la cuenta necesita saber del avión en cada fotograma. */
export interface Lectura {
  /** Lo que marca el radioaltímetro, m, o `null` fuera de alcance. */
  readonly radioAltura: number | null;
  /** Peso en las ruedas. */
  readonly enTierra: boolean;
  /**
   * Si esto es una aproximación: se viene a aterrizar a la pista en uso, o se
   * está ya sobre ella. Ver `enLaZonaDeAproximacion` en `world/runway-guide.ts`.
   */
  readonly enAproximacion: boolean;
  /** Velocidad vertical, m/s. Negativa es bajar. */
  readonly vertical: number;
  /** Altitud sobre el mar, m: con ella se sabe si se sube de verdad. */
  readonly altitud: number;
}

/**
 * La cuenta de la toma, número a número.
 *
 * Se le da una `Lectura` en cada fotograma y devuelve el número que toca
 * cantar **en ese instante**, o `null`. No sabe hablar ni dibujar: eso es de
 * quien lo use.
 */
export class AvisosDeAltura {
  /**
   * Los números que se pueden cantar: se ha estado por encima de ellos desde
   * la última vez que se cantaron.
   */
  private readonly armados = new Set<number>();
  /** Lo que marcaba el radar el fotograma anterior. `null` al empezar. */
  private anterior: number | null = null;
  /**
   * La altitud más baja desde el último número cantado o el último contacto
   * con el suelo. Ver `SUBIR_DE_VERDAD`.
   */
  private masBaja = Infinity;

  constructor(private readonly escalones: readonly Escalon[] = LA_CUENTA) {}

  paso(l: Lectura): Aviso | null {
    /*
     * **Con peso en las ruedas, nada.** Y tocar el suelo pone la vara de
     * subir de verdad en el suelo: el rebote de una toma no rearma nada, y
     * la subida de un toque y despegue sí.
     */
    if (l.enTierra) {
      this.anterior = l.radioAltura ?? 0;
      this.masBaja = l.altitud;
      return null;
    }
    // Fuera de alcance es «por encima de todo»: así se cruza el primero.
    const ra = l.radioAltura ?? Infinity;
    const antes = this.anterior;
    this.anterior = ra;
    if (antes === null) {
      /*
       * **El primer fotograma en el aire arma lo que queda por debajo.**
       *
       * Una lección que empieza en final no viene de ningún sitio, y sin esto
       * no cantaría nada hasta haber subido treinta metros. Lo de por debajo
       * se armaría igual viniendo de arriba, que es lo que se da por hecho.
       */
      this.masBaja = l.altitud;
      for (const e of this.escalones)
        if (ra > e.metros + holguraDe(e.metros)) this.armados.add(e.metros);
      return null;
    }
    this.masBaja = Math.min(this.masBaja, l.altitud);

    /*
     * **Armar: haber estado por encima, y haber subido de verdad.**
     *
     * Lo primero con holgura, para que rondar un número no lo arme y lo
     * desarme a cada fotograma. Lo segundo es lo que separa una frustrada de
     * un barranco: ver `SUBIR_DE_VERDAD`. Mirar solo la altura sobre el suelo
     * era rearmar con un número que tiembla, y sobre relieve tiembla siempre.
     */
    if (l.altitud - this.masBaja > SUBIR_DE_VERDAD) {
      for (const e of this.escalones)
        if (ra > e.metros + holguraDe(e.metros)) this.armados.add(e.metros);
    }

    /*
     * **Y cantar: el que se acaba de cruzar hacia abajo, en este fotograma.**
     *
     * Cruzar gasta el número aunque no se cante —fuera de la aproximación,
     * subiendo, o tan pasado que ya sería mentira—, porque cruzar es un
     * suceso que ya ocurrió. Si en un fotograma se cruzan varios —el suelo
     * que sube de golpe— se canta el más bajo, que es el único que describe
     * dónde se está ahora.
     */
    let toca: Escalon | null = null;
    for (const e of this.escalones) {
      if (!this.armados.has(e.metros)) continue;
      if (!(antes > e.metros && ra <= e.metros)) continue;
      this.armados.delete(e.metros);
      if (!l.enAproximacion || l.vertical >= 0) continue;
      if (ra < e.metros - holguraDe(e.metros)) continue;
      toca = e;
    }
    // Lo cantado cierra el tramo: para volver a cantarlo hay que subir desde
    // aquí, no desde lo más bajo de antes.
    if (toca) this.masBaja = l.altitud;
    return toca;
  }

  /** Vuelta a empezar. La llama el juego al reiniciar el vuelo. */
  reiniciar(): void {
    this.armados.clear();
    this.anterior = null;
    this.masBaja = Infinity;
  }
}
