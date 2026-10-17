/**
 * **Tu turno de pista**: lo que se hace entre la frecuencia, el tráfico
 * dibujado, la boca y tu vuelo para que la pista sea de uno por vez.
 *
 * Vivía repartido por `game.ts` —la lámpara que espera a que aterrice el que
 * viene, la orden que le quita la pista a otro antes de dártela, tu «cleared
 * to land» cuando toca, el número dos— y **no lo vigilaba nada automático**.
 * La prueba de la pista compartida montaba su propia copia del cableado, así
 * que si el juego dejaba de hacer una de esas cosas, la prueba seguía en
 * verde. Ahora el juego y las pruebas usan esto mismo, y lo único que queda en
 * `game.ts` es decir las cosas con su voz.
 *
 * No dibuja ni habla: pregunta a la frecuencia, al dibujo y a la boca, y pide
 * lo que hay que decir por las funciones de `AlrededorDelTurno`.
 */

import { explicaLaEspera, sueltaLaPista, type Urgencia } from "../audio/boca";
import {
  daLaPistaAOtro,
  esDeLaFrecuencia,
  esDeLaLampara,
  esTuFraseologiaDeAterrizar,
  esTuPermisoDeAterrizar,
} from "../audio/torre";
import { ALTURA_DE_DECISION, type PorQueMandaron } from "./minimos";
import { separacionDeSalida, type CategoriaDeEstela } from "./estela";
import {
  giradoEntre,
  RED_DE_LA_SALIDA,
  remedioParaTuSalida,
  seVaAntes,
  TOPE_DE_LA_VUELTA,
  VUELTA_DESDE_EN_FINAL,
  VUELTA_HECHA,
  type RemedioDeTuSalida,
  type TuLlegadaALaPista,
} from "./salida-tapada";
import { TU, type QuienTapaTuSalida } from "../world/trafico";
import {
  EMPIEZA_A_RODAR,
  laQueSeDice,
  PISTA_TUYA,
  RETENIDO,
  type Frecuencia,
  type Momento,
  type Transmision,
} from "./radio";

/** Lo que se le pide a la boca. Ver `audio/boca.ts`. */
export interface BocaDelTurno {
  /** Quita de la cola lo que ya no es verdad. */
  retirar(sobra: (clave: string | undefined, urgencia: Urgencia) => boolean): void;
  /** Si esa frase sigue esperando turno. */
  espera(clave: string): boolean;
  /** Si alguna de esa clase sigue esperando turno. Ver `sueltaLaPista`. */
  esperaAlguna(de: (clave: string | undefined, urgencia: Urgencia) => boolean): boolean;
}

/** Lo que se le pide al tráfico dibujado. Ver `world/trafico.ts`. */
export interface DibujoDelTurno {
  anuncia(matricula: string, clave: string, puedeAterrizar?: boolean): void;
  paso(dt: number, alLlegarSinPermiso?: (matricula: string) => boolean): string[];
  todaviaNo(matricula: string, clave: string): boolean;
  enFinal(matricula: string): number | null;
  /**
   * Quién de los dibujados está encima de la pista. Sin esto se da por que
   * nadie. Ver `ocupanLaPista` en `world/trafico.ts`.
   */
  ocupanLaPista?(): string[];
  /**
   * **Si el de esa matrícula está en el mundo.** Sin esto se da por que sí,
   * que es lo que hacía todo antes de mirarlo. Ver `retirarLosQueNoEstan`.
   */
  dibujado?(matricula: string): boolean;
  /**
   * Quién de los dibujados que van a despegar está parado esperándote, detrás
   * de ti. Sin esto se da por que nadie. Ver `esperanPorTi` en
   * `world/trafico.ts`.
   */
  esperanPorTi?(): string[];
  /**
   * Los dibujados que esperan su salida desde antes que tú, en orden. Sin
   * esto, nadie. Ver `delanteEnLaSalida` en `world/trafico.ts`.
   */
  delanteEnLaSalida?(): string[];
  /** La última salida de los dibujados, para su estela. Ver `ultimaSalida`. */
  ultimaSalida?(): { matricula: string; estela: CategoriaDeEstela; hace: number } | null;
  /**
   * Quién aterriza por la doble raya del que va a salir, si no se le deja
   * rodar. Sin esto, nadie. Ver `quienDejaLaPistaPorSuRaya` en
   * `world/trafico.ts`.
   */
  quienDejaLaPistaPorSuRaya?(matricula: string): string | null;
  /** Y quién le tapa la salida al que va a llegar. Ver `quienTapaSuSalida`. */
  quienTapaSuSalida?(matricula: string): string | null;
  /**
   * Lo que le queda por remontar de pista al que sale, m. Sin esto, nada.
   * Ver `remonta` en `world/trafico.ts`.
   */
  remonta?(matricula: string): number;
  /** Los que esperan en una doble raya de tu salida. Ver `enTuSalida`. */
  enTuSalida?(): string[];
  /**
   * Y todos los de tu salida, les dé tiempo o no, con lo que tardan. Sin
   * esto, nadie. Ver `tapanTuSalida` en `world/trafico.ts`.
   */
  tapanTuSalida?(): readonly QuienTapaTuSalida[];
  /**
   * Y si a uno de ésos se le puede dar la salida ya, sin contarte a ti. Sin
   * esto, no. Ver `puedeSalirSinEsperarte` en `world/trafico.ts`.
   */
  puedeSalirSinEsperarte?(matricula: string): boolean;
}

/** Con quién se turna la pista, y cómo se dice lo que hay que decir. */
export interface AlrededorDelTurno {
  readonly radio: Frecuencia;
  readonly boca: BocaDelTurno;
  /** El tráfico dibujado del campo de ahora, si lo hay: cambia con el campo. */
  trafico(): DibujoDelTurno | null;
  /** Si la lección tiene torre. */
  torre(): boolean;
  /**
   * Si el campo montado no tiene torre —el particular, o uno público sin
   * servicio—: ni torre ni frecuencia. Ver `sinTorre` en `world/aerodrome.ts`.
   */
  privado(): boolean;
  /**
   * Si en el campo de ahora, con la pista en uso, **no hay más que una calle**
   * entre la plataforma y la pista. Ver `unaSolaCalle` en
   * `world/suelo-del-trafico.ts`.
   */
  calleUnica?(): boolean;
  /** Metros de tu avión al umbral de aterrizar del campo de ahora. */
  alUmbral(): number;
  /**
   * **La categoría de estela de tu avión.** Sin esto, la más pesada, que no
   * espera a nadie: ver `esperaPorEstela`.
   */
  miEstela?(): CategoriaDeEstela;
  /** Tu altura sobre la pista, m. */
  alto(): number;
  /**
   * Si estás en el suelo. Sin esto, se mira la altura: a menos de un metro.
   * Ver `mirarTuSalida` y `retenidos`.
   */
  enTierra?(): boolean;
  /**
   * La torre le dice a otro lo que le quita la pista. Devuelve con qué clave
   * espera turno en la boca —ver `turnoDe`—, o `null` si no se pudo montar.
   */
  decirAOtro(dice: Transmision): string | null;
  /**
   * Tu permiso para aterrizar: la verde en vuelo, con su tarjeta, su
   * castellano y su fraseología. Ver `autorizarElAterrizaje` en `game.ts`.
   */
  autorizarte(): void;
  /**
   * **Y donde contesta un AFIS, que te diga que la pista está ocupada** si
   * lo está al llegar a final. Un AFIS no te para: te dice lo que hay, y lo
   * que hay es «pista ocupada». Opcional: una torre te deja en la roja sin
   * más, y la roja ya lo dice.
   */
  avisarteOcupada?(): void;
  /**
   * **Tu permiso para aterrizar se retiró sin haberse oído**: se dejó la
   * final con él todavía esperando turno en la boca. Sin «cleared to land»
   * oído no hay permiso, así que tampoco luz verde: se apaga, y en la final
   * siguiente se da otra vez, con su voz. Ver `paso`.
   */
  retirarteElPermiso?(): void;
  /**
   * **Si tu permiso está dado y todavía no ha empezado a sonar.** Sin
   * «cleared to land» oído no hay permiso, y el permiso no se oye cuando se
   * pide sino cuando suena. Ver `paso`. Sin esto se da por que no.
   */
  permisoSinOir?(): boolean;
  /**
   * **Tu permiso, a la vista ya**: la lámpara verde y su tarjeta en el acto,
   * sin esperar a que su voz encuentre hueco, y lo que de él quede por sonar
   * se retira —un «cleared to land» a veinte metros del suelo no se dice—.
   * La luz verde fija a un avión en vuelo es «autorizado para aterrizar» en
   * las señales de luz de verdad (OACI, Anexo 2, apéndice 1), así que es un
   * permiso dado, no un adorno. Ver `paso`.
   */
  darteElPermisoYa?(): void;
  /**
   * La torre te manda al aire porque la pista está ocupada; `sigue` dice si
   * lo sigue estando.
   *
   * **Solo por eso.** Mandaba también «sin permiso» cuando a los mínimos no
   * se había oído tu «cleared to land» con la pista libre, o sea por su propio
   * retraso, y eso no lo hace ninguna torre: con la pista libre, la torre te
   * la da. Ver `paso`.
   */
  mandarteAlAire(alto: number, sigue: () => boolean): void;
  /**
   * Si hay puesta una orden de irse al aire, sea de quien sea. Ver `paso`.
   * Sin esto se da por que no.
   */
  mandanFrustrar?(): boolean;
  /**
   * Si hay voz grabada para decirle a ese avión que espere en su puesto. Sin
   * esto, no. Ver `RETENIDO` en `flight/radio.ts`.
   */
  sabeRetener?(matricula: string): boolean;
  /**
   * **Si quien contesta aquí es un AFIS**, que informa y no manda. Sin esto,
   * una torre. Ver `Aerodrome.afis`.
   */
  afis?(): boolean;
  /**
   * **Tu llegada como la ve la torre**: cuánto te falta para el umbral, por
   * dónde vienes y a qué altura, o `null` si no vienes a aterrizar aquí. Con
   * el circuito, no solo con la final: es lo que deja ver con tiempo a quien
   * tapa tu salida. Sin esto, no se mira. Ver `flight/salida-tapada.ts`.
   */
  tuLlegada?(): TuLlegadaALaPista | null;
  /** Tu rumbo, rad: para saber si la vuelta que se te pidió está dada. */
  rumbo?(): number;
  /**
   * **La torre te pide una vuelta entera** porque el de tu salida no se
   * iría antes de que llegues. Sin esto no se pide.
   */
  darteUnaVuelta?(porQuien: string): void;
  /** Y la vuelta se acabó: dada, o dejada de esperar. Ver `TOPE_DE_LA_VUELTA`. */
  acabarTuVuelta?(dada: boolean): void;
  /**
   * **La torre te manda al aire** porque el de tu salida no se iría a tiempo
   * y ya no hay sitio para una vuelta; `sigue` dice si todavía está por
   * irse. Sin esto no se manda.
   */
  mandarteAlAirePorTuSalida?(alto: number, porQuien: string, sigue: () => boolean): void;
  /** **Un AFIS te cuenta quién hay en tu salida**: tráfico que sale. */
  contarteTuSalida?(porQuien: string): void;
  /** Y en la final, la instructora propone irse al aire, con calma. */
  proponerteIrtePorTuSalida?(porQuien: string): void;
}

/**
 * **Las fases en las que la única calle es tuya, y en qué sentido**: saliendo,
 * de arrancar en el puesto a esperar en su doble raya; volviendo, de la final
 * a llegar al puesto. Ver `Momento.calleOcupada`.
 *
 * Final está a propósito: el que empieza a rodar con vos en final llega a la
 * doble raya cuando estás dejando la pista, y en una sola calle esa doble raya
 * está en tu camino.
 */
export const USAN_LA_CALLE: Readonly<Record<string, "saliendo" | "volviendo">> = {
  arrancando: "saliendo",
  rodando: "saliendo",
  esperando: "saliendo",
  final: "volviendo",
  aterrizado: "volviendo",
  abandonando: "volviendo",
  "a-plataforma": "volviendo",
};

/**
 * **Por qué se espera en el punto de espera**, si es por alguien: uno que
 * viene a aterrizar —autorizado, o cantando final— o uno alineado en la pista
 * esperando su despegue.
 */
export type PorQueEsperas = "aterriza" | "despega" | "fila" | "estela";

/**
 * **Lo que esperas en la roja detrás de uno de la fila antes de dejar de
 * esperarle**, s.
 *
 * Es un candado entre dos sistemas —el dibujo dice quién está listo, la
 * frecuencia le da la salida—, y todo candado lleva su red: si por lo que sea
 * la frecuencia no llegara a darle la suya, la roja sería para siempre. Tres
 * minutos: más que lo más largo medido de autorizarle detrás de uno que
 * aterriza —ciento cincuenta segundos, en Tenerife Sur— y mucho menos que la
 * paciencia de quien espera. Pasados, la torre te da la salida a ti, como
 * cambiaría el orden una de verdad con uno que no está listo (Doc 4444,
 * 7.9.1).
 */
export const PACIENCIA_EN_LA_FILA = 180;

/**
 * **Lo más que la torre retiene a uno en su puesto, o fuera del circuito,
 * por la salida de otro**, s. Ver `retenidos`.
 *
 * Es un candado entre la frecuencia y el dibujo, y lleva su red: si quien
 * aterriza se queda parado en su salida, o el que rueda no llega nunca a
 * irse, el otro no puede esperar para siempre. Siete minutos: más que lo más
 * largo de verdad —tú entrando en la final del plan a dos minutos y medio
 * del umbral, frenando, dejando la pista y rodando hasta pasar la doble raya,
 * y uno del tráfico que aterriza detrás de ti y aparca—, medido en Concepción
 * en cinco; y la frecuencia sigue hablando mientras tanto.
 * Pasados, se le deja ir, que es lo que haría una torre con uno que no se
 * mueve; lo de después lo reparte el suelo. Ver `repartirLosTramos` en
 * `world/trafico.ts`.
 *
 * **Y se cuenta por quien retiene**, no por el reloj de quien espera: el
 * retenido por uno del tráfico y después por ti empieza otra cuenta contigo.
 * Y contigo ya en el suelo, rodando hacia su doble raya, no corre: soltarle
 * entonces es encontrártelo ahí. Ver `retenidos`.
 */
export const RETENCION_MAXIMA = 420;

/** Las llamadas con las que uno que llega entra en la frecuencia. */
const ENTRA_A_ATERRIZAR: ReadonlySet<string> = new Set(["otro.enCola", "otro.final"]);

/** Por qué se espera y por quién, si se sabe. Ver `porQueEsperasDe`. */
export interface EsperaPor {
  readonly porque: PorQueEsperas;
  readonly matricula: string | null;
  /**
   * En la fila de salida, **qué número eres**: dos con uno delante, tres con
   * dos. Ver `salenAntes`.
   */
  readonly numero?: number;
}

/**
 * Cómo lo dice la torre, en fraseología: la orden y la información de
 * tráfico detrás, que es como se da. Ver `CLAVE_DE_TORRE` en `audio/torre.ts`.
 */
export const HOLD_SHORT_POR: Readonly<Record<PorQueEsperas, string>> = {
  aterriza: "hold short of the runway, landing traffic",
  despega: "hold short of the runway, departing traffic",
  /*
   * En la fila, con tu número: el dos es el de uno delante, y con dos delante
   * lo pone `holdShortEnLaFila`. Es información, no una autorización (Doc
   * 4444, 12.3.4.14 b).
   */
  fila: "hold short of the runway, number two for departure",
  // Y detrás de una salida que deja estela (Doc 4444, 12.3.4.19 e).
  estela: "hold short of the runway, caution wake turbulence",
};

/** La espera de la fila con tu número: dos con uno delante, tres con dos. */
export function holdShortEnLaFila(numero = 2): string {
  return numero >= 3
    ? "hold short of the runway, number three for departure"
    : HOLD_SHORT_POR.fila;
}

/**
 * Y cómo lo cuenta la instructora en los peldaños de abajo, en una línea
 * tranquila: qué se espera y a quién. Ver `vuelo.esperaQue*` en
 * `i18n/es-PY.ts`.
 */
export const EXPLICA_LA_ESPERA = {
  aterriza: "vuelo.esperaQueAterrice",
  despega: "vuelo.esperaQueDespegue",
  fila: "vuelo.esperaTurnoDeSalida",
  estela: "vuelo.esperaLaEstela",
} as const satisfies Record<PorQueEsperas, string>;

/**
 * Lo que la torre te dice al levantarte la orden de irte al aire.
 *
 * - `aterrizar`: sigues en final. La verde a un avión en vuelo es «puede
 *   aterrizar», y se dice **por el mismo camino que el permiso de la final**:
 *   la lámpara, la tarjeta verde, «autorizado para aterrizar» en los cuatro
 *   peldaños y el «cleared to land» con el viento de Taguató para arriba. Es
 *   el mismo permiso y no puede sonar a otra cosa. Ver `autorizarte`.
 * - `volver`: **subiendo en la frustrada o ya en el circuito.** Una torre de
 *   verdad no autoriza a aterrizar a quien se está yendo al aire: le deja
 *   volver por el circuito, y la autorización llega en la final nueva, que es
 *   donde se da siempre. Ver `pedirAterrizaje`.
 * - `nada`: en tierra. Se aterrizó con la orden puesta; ya no describe nada, y
 *   ni «autorizado a despegar» ni «cleared for take-off» —que es lo que dice
 *   la verde en tierra— tienen nada que ver con eso.
 *
 * La de la pista ocupada es siempre `volver` en el aire: se levanta al subir o
 * al alejarse —ver `mirarSiMandanFrustrar`—, o sea yéndose. Se oía la torre
 * decir «autorizado para aterrizar» y «cleared to land» en pleno ascenso de la
 * frustrada, en cuanto el de delante dejaba la pista.
 */
export function alLevantarLaOrden(
  porque: PorQueMandaron,
  fase: string,
  enTierra: boolean,
): "aterrizar" | "volver" | "nada" {
  if (enTierra) return "nada";
  /*
   * La de la otra punta tampoco se levanta en final: se levanta yéndose, y lo
   * que toca es volver por el circuito a la buena. Ver
   * `flight/la-otra-cabecera.ts`.
   */
  if (
    porque === "pistaOcupada" ||
    porque === "otraCabecera" ||
    porque === "salidaTapada" ||
    fase !== "final"
  )
    return "volver";
  return "aterrizar";
}

export class TurnoDePista {
  /**
   * **El que va delante en final con su permiso**, mientras tú vienes detrás
   * sin el tuyo: eres el número dos. `null` si no hay nadie delante.
   *
   * La torre no te autoriza hasta que él deja la pista —su «pista libre»— y,
   * si llegas a la altura de decisión antes, te manda al aire, que es lo que
   * se hace de verdad con la pista ocupada. Ver `paso`.
   */
  private numeroDos: string | null = null;

  /** Tu «cleared to land», esperando su momento. Ver `paso`. */
  private aterrizajeSinAutorizar = false;

  /** Si en el paso anterior se estaba en final. Ver `paso`. */
  private enFinal = false;

  /**
   * La orden que le quita la pista a otro, **mientras espera turno en la
   * boca**: su clave con la matrícula, como la ve la boca. Ver `turnoDe`.
   *
   * Tu «cleared to land» no se pide hasta que ésta ha empezado a sonar.
   * Pedidas a la vez, con la boca ocupada, la tuya esperaba lo que quedara de
   * la frase de antes más la de ellos entera, y a los doce segundos caducaba
   * sin sonar. Pedida al empezar la de ellos, espera solo esa.
   */
  private despejeSinDecir: string | null = null;

  /** Si en esta final ya se te dijo que la pista está ocupada. Ver `paso`. */
  private ocupadaDicha = false;

  /** Si en esta final ya se te mandó al aire desde aquí. Ver `paso`. */
  private alAireEnEstaFinal = false;

  /**
   * **Cuánto lleva retenido cada uno**, s, mientras dure lo que lo retiene.
   * Ver `retenidos`.
   */
  private readonly retenidoDesde = new Map<
    string,
    { clave: string; porQuien: string; lleva: number }
  >();

  /** La retención más larga vista en este vuelo, s: para el banco. */
  retencionMasLarga = 0;

  /**
   * **Lo que la torre te ha pedido por el que tapa tu salida**, mientras
   * dura: la vuelta, con lo girado, o la orden de irse al aire. Ver
   * `mirarTuSalida`.
   */
  private tapada: {
    readonly por: string;
    readonly como: Exclude<RemedioDeTuSalida, "aviso">;
    girado: number;
    rumbo: number | null;
    lleva: number;
  } | null = null;

  /**
   * **Cuántas vueltas se te han pedido en esta llegada, y cuánto te ha
   * retrasado todo esto**, s: la red de verdad, que no es de un avión sino
   * tuya. Con salidas nuevas que ruedan mientras das la vuelta, una por cada
   * una era no aterrizar nunca: medido en Encarnación, seis vueltas y dos
   * frustradas en cuarenta minutos. Se vuelve a cero al tocar tierra.
   */
  private vueltasEnEstaLlegada = 0;
  private retrasoEnEstaLlegada = 0;

  /** A quién ya te contó un AFIS, y por quién propuso irse la instructora. */
  private readonly contadoDe = new Set<string>();
  private readonly propuestoPor = new Set<string>();

  /** El reloj de la frecuencia, s, y cuándo se miró tu salida por última vez. */
  private reloj = 0;
  private relojDeTuSalida = 0;

  /** Lo que se te ha pedido por tu salida en este vuelo, para el banco. */
  readonly porTuSalida: { vueltas: number; alAire: number; avisos: number; propuestas: number } = {
    vueltas: 0,
    alAire: 0,
    avisos: 0,
    propuestas: 0,
  };

  /** Si ahora mismo te tienen dando una vuelta por tu salida. */
  get dandoLaVuelta(): boolean {
    return this.tapada?.como === "vuelta";
  }

  /**
   * **A quién no deja moverse la torre todavía**, por la salida de la pista
   * de otro: el que va a salir, mientras uno que aterriza tiene que pasar por
   * su doble raya —tú o uno del tráfico—; y el que va a llegar, mientras uno
   * que sale rueda hacia una doble raya que está en su salida.
   *
   * Es lo que hace una torre de verdad en un campo de una sola salida:
   * «hold position» al que sale, hasta que el que aterriza ha pasado, o le da
   * la pista antes si le da tiempo a irse —ver `tiempoParaIrse` en
   * `world/trafico.ts`—. Y con su red: nadie se queda retenido más de
   * `RETENCION_MAXIMA`.
   */
  private retenidos(dt: number): ReadonlySet<string> {
    const trafico = this.de.trafico();
    const retenidos = new Set<string>();
    if (!trafico || this.de.privado()) {
      this.retenidoDesde.clear();
      return retenidos;
    }
    const ahora = new Set<string>();
    for (const m of this.de.radio.matriculas) {
      const toca = this.de.radio.loQueToca(m);
      if (!toca) continue;
      const porQuien =
        toca.clave === EMPIEZA_A_RODAR
          ? trafico.quienDejaLaPistaPorSuRaya?.(m)
          : toca.primera && ENTRA_A_ATERRIZAR.has(toca.clave)
            ? trafico.quienTapaSuSalida?.(m)
            : null;
      if (!porQuien) continue;
      ahora.add(m);
      /*
       * Por la misma llamada y por el mismo: otra llamada es otro vuelo, y
       * otro que aterriza es otra espera, y cuentan de cero. La red es por lo
       * que retiene, no por el reloj de quien espera: retenido por uno del
       * tráfico y después por ti, se le soltaba a los siete minutos de lo
       * primero, contigo ya rodando hacia su doble raya. Medido en Pilar: uno
       * suelto a medio minuto de pasar a su lado.
       */
      const antes = this.retenidoDesde.get(m);
      const mismo = antes?.clave === toca.clave && antes.porQuien === porQuien;
      /*
       * **Y contigo ya en el suelo, no corre**: vas a pasar por su doble
       * raya, rodando, y soltarle es encontrártelo ahí. La red es para el que
       * aterriza y se queda quieto en la pista; si eres tú quien se para, él
       * espera en su puesto, que no tapa a nadie, y sale en cuanto pases.
       * Ver `RETENCION_MAXIMA`.
       */
      const corre = !(porQuien === TU && this.enTierra);
      const lleva = (mismo ? antes.lleva : 0) + (corre ? dt : 0);
      this.retenidoDesde.set(m, { clave: toca.clave, porQuien, lleva });
      if (lleva > RETENCION_MAXIMA) continue;
      this.retencionMasLarga = Math.max(this.retencionMasLarga, lleva);
      retenidos.add(m);
    }
    for (const m of [...this.retenidoDesde.keys()])
      if (!ahora.has(m)) this.retenidoDesde.delete(m);
    return retenidos;
  }

  constructor(private readonly de: AlrededorDelTurno) {
    /*
     * **Y la frecuencia le pregunta al dibujo si el que va a hablar ya está
     * donde dice**: «pista libre» fuera de la pista, «en final» en final. Ver
     * `todaviaNo` en `flight/radio.ts`.
     */
    de.radio.todaviaNo = (m, clave) =>
      de.trafico()?.todaviaNo(m, clave) ?? false;
    // Y si el que sale remonta la pista: ver `remonta` en `flight/radio.ts`.
    de.radio.remonta = (m) => (de.trafico()?.remonta?.(m) ?? 0) > 0;
    // Y si hay con qué decirle al retenido que espere: ver `RETENIDO`.
    de.radio.sabeRetener = (m) => de.sabeRetener?.(m) ?? false;
  }

  /** Si estás en el suelo. Ver `AlrededorDelTurno.enTierra`. */
  private get enTierra(): boolean {
    return this.de.enTierra?.() ?? this.de.alto() < 1;
  }

  /** Si aquí hay torre que te turne la pista. */
  private get conTorre(): boolean {
    return this.de.torre() && !this.de.privado();
  }

  /** Si aquí hay torre y una sola calle que turnar. Ver `USAN_LA_CALLE`. */
  private get conCalleUnica(): boolean {
    return this.conTorre && (this.de.calleUnica?.() ?? false);
  }

  /**
   * **Si la pista la ocupa otro**: alineado en ella, autorizado a aterrizar o
   * cantando final. Es lo que mira la lámpara del punto de espera: la torre te
   * deja en la roja y aterriza el que viene. Ver `pistaDeOtros` en
   * `flight/vuelo.ts`.
   */
  get pistaDeOtros(): boolean {
    /*
     * **Y mientras no se haya oído que la dejan libre, tampoco es tuya.** La
     * frecuencia la suelta al pedir la frase, y la frase espera su turno en la
     * boca: la verde saliendo antes que el «pista libre» del otro es la torre
     * dándosela a dos. Ver `sueltaLaPista`.
     */
    return (
      this.conTorre &&
      (this.de.radio.pistaOcupada ||
        this.de.boca.esperaAlguna(sueltaLaPista) ||
        /*
         * **Y la que se ve**: el que despegó suelta la pista para la
         * frecuencia al oír su «cleared for take-off», y sigue corriendo por
         * ella un minuto. Con la verde entonces, entrabas detrás de él.
         */
        this.ocupadaEnElDibujo ||
        /*
         * **Y los que esperaban su salida antes que tú salen antes.** Ver
         * `salenAntes`.
         */
        this.salenAntes.length > 0 ||
        // Y detrás de uno más grande, sus dos minutos de estela.
        this.esperaPorEstela !== null ||
        /*
         * **Y en una sola calle, el que ya está en ella va primero.** Espera
         * en la misma doble raya que vos, así que hasta que no entra en la
         * pista y se va no hay sitio para otro. Ver `USAN_LA_CALLE`.
         *
         * **Salvo que esté detrás de ti**, esperándote: el dibujado ya no te
         * atraviesa, se para detrás —ver `cedeA` en `world/trafico.ts`—, y
         * con él esperando a que pases y tú esperando a que pase él no
         * pasaría nadie nunca. El primero de la fila es el primero, llegara
         * quien llegara antes a la calle.
         */
        (this.conCalleUnica &&
          this.de.radio.alguienEnLaCalle &&
          !this.teEsperanEnLaCalle))
    );
  }

  /**
   * **Los que salen antes que tú**, en orden: los dibujados que esperaban
   * listos en su doble raya cuando llegaste a la tuya y a los que la
   * frecuencia todavía no ha dado la salida.
   *
   * Con la tuya en la roja, la frecuencia no podía darles la suya —la fase de
   * esperar calla la radio— y en cuanto la pista quedaba libre la verde era
   * para ti: en Tenerife Sur, con el JAZ 60 en el punto de espera B y dos por
   * salir, «nada, me dejaron salir a mí antes». Las salidas se autorizan en
   * el orden en que están listas (Doc 4444, 7.9); ahora el primero de la fila
   * habla aunque la fase calle —ver `delanteEnLaFila` en `flight/radio.ts`— y
   * tú esperas tu número.
   *
   * Solo los que la frecuencia tiene todavía por salir: un dibujo sin vuelo en
   * la radio no recibiría nunca su salida, y con él delante la roja no se
   * apagaría.
   */
  get salenAntes(): string[] {
    return this.enLaFila.filter(
      (m) => (this.esperandoTrasDe.get(m) ?? 0) <= PACIENCIA_EN_LA_FILA,
    );
  }

  /** Los de la fila sin la red de `PACIENCIA_EN_LA_FILA`. */
  private get enLaFila(): string[] {
    if (!this.conTorre) return [];
    const delante = this.de.trafico()?.delanteEnLaSalida?.() ?? [];
    return delante.filter((m) => this.de.radio.vaASalir(m));
  }

  /**
   * **Cuánto llevas esperando en la roja detrás de cada uno de la fila**, s.
   * Ver `PACIENCIA_EN_LA_FILA`.
   */
  private readonly esperandoTrasDe = new Map<string, number>();

  /** Lo que se lleva esperando detrás de cada uno, en cada paso. */
  private contarLaFila(dt: number, fase: string): void {
    if (fase !== "esperando") {
      this.esperandoTrasDe.clear();
      return;
    }
    const fila = this.enLaFila;
    for (const m of [...this.esperandoTrasDe.keys()])
      if (!fila.includes(m)) this.esperandoTrasDe.delete(m);
    for (const m of fila) this.esperandoTrasDe.set(m, (this.esperandoTrasDe.get(m) ?? 0) + dt);
  }

  /**
   * **La salida de delante cuya estela todavía se espera**: su matrícula, o
   * `null`. Dos minutos detrás de una más pesada, contados desde que se fue al
   * aire (Doc 4444, 5.8.3.1). Ver `separacionDeSalida`.
   */
  get esperaPorEstela(): string | null {
    if (!this.conTorre || !this.de.miEstela) return null;
    const ultima = this.de.trafico()?.ultimaSalida?.();
    if (!ultima) return null;
    const espera = separacionDeSalida(ultima.estela, this.de.miEstela());
    return ultima.hace < espera ? ultima.matricula : null;
  }

  /** Si hay alguien de la calle parado detrás de ti. Ver `pistaDeOtros`. */
  private get teEsperanEnLaCalle(): boolean {
    return (this.de.trafico()?.esperanPorTi?.().length ?? 0) > 0;
  }

  /**
   * **Y por qué**, para decirlo. La luz roja podía durar tres minutos y solo
   * se oía «esperá acá» y «hold short»: una espera larga sin explicación, que
   * a los cuatro años es un juego que se ha colgado. La fraseología de verdad
   * dice el motivo —«hold short, landing traffic»—, y la instructora lo cuenta
   * en castellano en los peldaños de abajo.
   *
   * Si hay uno que aterriza y otro alineado, manda el que aterriza: es el que
   * viene, y el alineado no sale hasta que él la deje.
   */
  get porQueEsperas(): PorQueEsperas | null {
    return this.porQueEsperasDe?.porque ?? null;
  }

  /**
   * **Lo mismo, con quién**: la matrícula del avión por el que se espera, si
   * se sabe. Es lo que permite decir el porqué una vez **por avión** —el
   * segundo que llega a la final es otro porqué, aunque se llame igual— y
   * comprobar que el avión que se nombra está en el mundo. Ver
   * `explicarSiCambiaElPorque` en `game.ts`.
   */
  get porQueEsperasDe(): EsperaPor | null {
    if (!this.conTorre) return null;
    const ocupan = this.de.radio.ocupanLaPista;
    const aterriza = ocupan.find(
      (o) => o.orden === "torre.clearedLand" || o.orden === "otro.final",
    );
    if (aterriza) return { porque: "aterriza", matricula: aterriza.matricula };
    const alineado = ocupan.find((o) => o.orden === "torre.lineUpWait");
    if (alineado) return { porque: "despega", matricula: alineado.matricula };
    // Y el primero de la fila de salida, con tu número. Ver `salenAntes`.
    const fila = this.salenAntes;
    if (fila.length)
      return { porque: "fila", matricula: fila[0] ?? null, numero: fila.length + 1 };
    // Y quien espera detrás de ti en la calle única no va primero: ver
    // `teEsperanEnLaCalle`.
    if (
      this.conCalleUnica &&
      this.de.radio.alguienEnLaCalle &&
      !this.teEsperanEnLaCalle
    )
      return { porque: "despega", matricula: this.de.radio.quienEstaEnLaCalle() };
    // Encima sin tenerla es el que ya corre su despegue. Ver `pistaDeOtros`.
    const encima = this.de.trafico()?.ocupanLaPista?.() ?? [];
    if (encima.length) return { porque: "despega", matricula: encima[0] ?? null };
    const estela = this.esperaPorEstela;
    if (estela) return { porque: "estela", matricula: estela };
    return null;
  }

  /** Si algún avión dibujado está encima de la pista. Ver `ocupanLaPista`. */
  private get ocupadaEnElDibujo(): boolean {
    return (this.de.trafico()?.ocupanLaPista?.().length ?? 0) > 0;
  }

  /**
   * **El tráfico que conoce quien informa**, para un AFIS: el porqué de la
   * espera si lo hay, y si no, uno que viene a aterrizar aunque todavía vaya
   * por el viento en cola, o uno que rueda hacia la pista. `null` es «sin
   * tráfico conocido», que un AFIS solo dice cuando es verdad.
   *
   * Una torre no lo necesita: te deja en la roja o te da la verde, y el
   * porqué va con la roja. Un AFIS no te para, así que lo que te da es esto,
   * y con esto decidís vos. Ver `DICE_UN_AFIS` en `audio/torre.ts`.
   */
  get traficoConocido(): PorQueEsperas | null {
    return this.traficoConocidoDe?.porque ?? null;
  }

  /** Lo mismo, con la matrícula de quien se informa. Ver `porQueEsperasDe`. */
  get traficoConocidoDe(): EsperaPor | null {
    if (this.de.privado()) return null;
    const porQue = this.porQueEsperasDe;
    if (porQue) return porQue;
    const viene = this.de.radio.quienViene();
    if (viene) return { porque: "aterriza", matricula: viene };
    const enLaCalle = this.de.radio.quienEstaEnLaCalle();
    if (enLaCalle) return { porque: "despega", matricula: enLaCalle };
    return null;
  }

  /**
   * Si estás **esperando a que te den la pista**: en el punto de espera con
   * la lámpara de la torre, o de número dos en final. Ver
   * `Momento.esperandoLaPista`.
   */
  esperandoLaPista(fase: string): boolean {
    return (
      (fase === "esperando" && this.de.torre()) ||
      (fase === "final" && this.numeroDos !== null)
    );
  }

  /** El que va delante de ti en final, si eres el número dos. */
  get vaDelante(): string | null {
    return this.numeroDos;
  }

  /** Si la pista es tuya ahora mismo: su fase, y que no seas el número dos. */
  laPistaEsTuya(fase: string): boolean {
    return PISTA_TUYA.has(fase) && this.numeroDos === null;
  }

  /**
   * **Pasa el tiempo en la frecuencia y en su dibujo**, y devuelve lo que se
   * oye ahora, o `null`. Quien lo dice lo pone el juego, con su voz.
   *
   * Tres cosas y en este orden. Los que llegaron a la decisión sin permiso se
   * fueron al aire, y la frecuencia lo apunta **antes de hablar**: si no, en
   * ese mismo paso podía autorizarle a aterrizar a uno que ya se estaba
   * yendo. Ver `seFueAlAire` en `flight/radio.ts`. Luego habla quien toque.
   * Y lo primero que se hace con una llamada es **colocar a quien la hace**,
   * antes de decidir cómo suena, porque eso es lo que la vuelve verdad: se
   * anuncia y el avión está ahí.
   */
  oir(
    dt: number,
    ahora: Omit<Momento, "esperandoLaPista">,
  ): Transmision | null {
    this.reloj += dt;
    this.contarLaFila(dt, ahora.fase);
    const momento: Momento = {
      ...ahora,
      esperandoLaPista: this.esperandoLaPista(ahora.fase),
      calleOcupada: this.conCalleUnica ? (USAN_LA_CALLE[ahora.fase] ?? null) : null,
      delanteEnLaFila: ahora.fase === "esperando" ? this.salenAntes : undefined,
      retenidos: this.retenidos(dt),
    };
    const trafico = this.de.trafico();
    let alAire: Transmision | null = null;
    /*
     * **Y al que llega a la decisión sin su permiso con la pista libre, se le
     * da ahora**, dicho si la frecuencia puede y callado si no. Ver
     * `autorizarAlLlegar` en `flight/radio.ts`.
     */
    let autorizado: Transmision | null = null;
    const tuya = this.laPistaEsTuya(ahora.fase);
    const alLlegar = (m: string): boolean => {
      const dado = this.de.radio.autorizarAlLlegar(m, momento, tuya);
      if (dado === null) return false;
      if (dado !== "callado") autorizado = dado;
      return true;
    };
    const alAireYa = trafico?.paso(dt, alLlegar) ?? [];
    this.retirarLosQueNoEstan();
    for (const m of alAireYa) {
      const dice = this.de.radio.seFueAlAire(m, momento);
      /*
       * **Y al que tenía el permiso se le dice, siempre**: se oyó su «cleared
       * to land», y lo que lo anula no puede quedarse sin decir. Va por donde
       * va lo que le quita la pista a otro, en `mando`. Ver `seFueAlAire`.
       */
      if (dice?.quitaPermiso) {
        trafico?.anuncia(m, dice.clave, false);
        this.de.decirAOtro(dice);
      } else alAire = dice ?? alAire;
    }
    const dice = this.de.radio.update(dt, momento) ?? alAire ?? autorizado;
    /*
     * Y al que la torre retiene, en su puesto y quieto: la marca de su
     * «rodando» lo sacaría a rodar. Ver `RETENIDO` en `flight/radio.ts`.
     */
    if (dice)
      trafico?.anuncia(
        dice.de.matricula,
        dice.enSuPuesto ? RETENIDO : dice.clave,
        this.de.radio.puedeAterrizar(dice.de.matricula),
      );
    /*
     * **Y lo que se dice de alguien, se dice de alguien que está.** Si después
     * de colocarle el dibujo no lo tiene —una llamada sin marca, un camino que
     * no se pudo trazar—, la frase no suena y ese avión deja la frecuencia:
     * una radio que nombra a quien no está en el mundo es la que enseña que
     * la radio es un adorno.
     */
    if (dice && trafico?.dibujado && !trafico.dibujado(dice.de.matricula)) {
      this.de.radio.retirar(dice.de.matricula);
      return null;
    }
    return dice;
  }

  /**
   * **Quien la radio ya nombró y el dibujo ya no tiene, deja la frecuencia.**
   *
   * El dibujo retira a quien se cansa de esperar en su doble raya —ver
   * `OLVIDO_ESPERANDO` en `world/trafico.ts`— o se queda quieto en la pista,
   * y no se lo decía a nadie: la frecuencia seguía con él y la torre te dejaba
   * en la roja por un avión que ya no estaba, para darle la salida minutos
   * después y verlo aparecer «de la nada» a mitad de pista, ya corriendo. Se
   * mira en cada paso, antes de que nadie hable, y también antes de darte la
   * pista. Sin dibujo —las pruebas que no lo montan— no se mira nada.
   */
  private retirarLosQueNoEstan(): void {
    const trafico = this.de.trafico();
    if (!trafico?.dibujado) return;
    for (const m of this.de.radio.aMedias)
      if (!trafico.dibujado(m)) this.de.radio.retirar(m);
  }

  /**
   * Quién va **delante de ti en final con su permiso**, o `null`.
   *
   * El permiso lo dice la frecuencia y dónde está lo dice el dibujo: tiene que
   * verse volando la final —ya girado de la base— o en la pista, y más cerca
   * del umbral que tú. Ver `vaDelante` en `flight/radio.ts`.
   */
  private quienVaDelante(): string | null {
    const trafico = this.de.trafico();
    if (!trafico) return this.de.radio.vaDelante();
    const mio = this.de.alUmbral();
    return this.de.radio.vaDelante((m) => {
      const suyo = trafico.enFinal(m);
      return suyo !== null && suyo < mio;
    });
  }

  /**
   * **La pista pasa a ser tuya: se le quita a quien la tuviera.**
   *
   * Dos cosas, y en este orden:
   *
   * - Lo que la torre les dio a los demás y todavía espera turno en la boca
   *   **ya no se dice**. La frecuencia dejaba de dar la pista en cuanto era
   *   tuya, pero una orden dada un segundo antes podía esperar hasta doce
   *   —`CADUCA_LA_ORDEN`— y tu autorización, en `mando`, se le colaba
   *   delante: en Pettirossi se oyó tu «cleared to land» y seis segundos y
   *   medio después un «line up and wait» a otro. Ver `daLaPistaAOtro`.
   * - Y al que la ocupaba —alineado en el eje, autorizado a aterrizar, o
   *   cantando final sin permiso— la torre le dice que despegue o que se vaya
   *   al aire, **antes** de dártela a ti. Ver `despejarLaPista` en
   *   `flight/radio.ts`.
   *
   * **Menos al que va delante en final con su permiso**, llegando tú a
   * aterrizar: ése aterriza primero, y tú quedas de número dos hasta que la
   * deja libre. Mandarlo al aire en final corta para dártela a ti no lo hace
   * ninguna torre. Ver `quienVaDelante`.
   *
   * Saliendo, esto no manda a nadie al aire: la lámpara no se pone verde
   * mientras alguien ocupa la pista —ver `pistaDeOtros`—, así que al llegar
   * aquí ya está libre. Solo queda para quien entra sin pasar por la lámpara.
   *
   * Se dibuja todo y **se dice una**: la que anula un permiso que se oyó, si
   * la hay. Ver `laQueSeDice`. Y se dice **siempre**, también con la boca
   * ocupada: callarla dejaba oír el «cleared to land» del otro y enseguida el
   * tuyo por la misma pista, sin nada entre medias. Lo que no puede pasar es
   * que tu autorización caduque detrás de ella, y por eso la tuya no se pide
   * hasta que ésta empieza a sonar: ver `despejeSinDecir`.
   */
  alSerTuya(fase: string): void {
    this.de.boca.retirar(daLaPistaAOtro);
    // En un campo sin torre no hay frecuencia a la que quitarle nada.
    if (this.de.privado()) return;
    // A quien no está no se le quita nada: ver `retirarLosQueNoEstan`.
    this.retirarLosQueNoEstan();
    this.numeroDos =
      fase === "final" && this.de.torre() ? this.quienVaDelante() : null;
    /*
     * **Y al de la calle, la salida con la pista libre.** La frecuencia da
     * por suelta la pista en cuanto dice «cleared for take-off», y el que lo
     * recibió todavía la corre su medio minuto largo: eso solo lo sabe el
     * dibujo. De Los Rodeos a La Gomera, el que esperaba en la doble raya
     * recibía su salida al entrar tú en final y entraba detrás del que
     * despegaba: «dos encima de la pista», más de cuatrocientas muestras.
     * Con otro encima espera en su doble raya sin perder el turno, que es lo
     * que se hace de verdad: la pista es de uno por vez.
     */
    /*
     * **Y lo mismo con el que espera en una doble raya de tu salida**, en un
     * campo con más calles: está donde vas a dejar la pista, y o se va antes
     * o no la dejas. Ver `enTuSalida` en `world/trafico.ts`.
     */
    const enTuSalida = this.de.trafico()?.enTuSalida?.() ?? [];
    const laCalle = this.ocupadaEnElDibujo
      ? false
      : this.conCalleUnica || (this.conTorre && enTuSalida);
    const dichas = this.de.radio.despejarLaPista(this.numeroDos, laCalle);
    const trafico = this.de.trafico();
    for (const dice of dichas)
      trafico?.anuncia(
        dice.de.matricula,
        dice.clave,
        this.de.radio.puedeAterrizar(dice.de.matricula),
      );
    const dice = laQueSeDice(dichas);
    if (dice) this.despejeSinDecir = this.de.decirAOtro(dice);
  }

  /**
   * **Y al que espera en una doble raya de tu salida, la pista en cuanto
   * esté libre**, mientras le dé tiempo a irse antes de que llegues.
   *
   * Al darte la pista se le da también —ver `alSerTuya`—, pero solo si en
   * ese momento nadie la ocupa: en Pilar, con otro todavía corriendo su
   * despegue al entrar tú en final, el de la doble raya se quedaba en ella
   * toda tu toma, y al dejar la pista pasabas a su lado. Se le da en cuanto
   * se puede, como al primero de la fila, y si ya no le da tiempo no se le
   * da: ver `enTuSalida` en `world/trafico.ts`.
   */
  private despejarTuSalida(): void {
    if (!this.conTorre || this.numeroDos || this.ocupadaEnElDibujo) return;
    const trafico = this.de.trafico();
    const pendientes = (trafico?.enTuSalida?.() ?? []).filter((m) =>
      this.de.radio.vaASalir(m),
    );
    if (!pendientes.length) return;
    const dichas = this.de.radio.despejarLaPista(null, pendientes);
    for (const dice of dichas)
      trafico?.anuncia(dice.de.matricula, dice.clave, this.de.radio.puedeAterrizar(dice.de.matricula));
    const dice = laQueSeDice(dichas);
    if (!dice) return;
    const clave = this.de.decirAOtro(dice);
    // Y tu permiso, si todavía no se dio, detrás del suyo.
    if (this.aterrizajeSinAutorizar) this.despejeSinDecir = clave;
  }

  /**
   * **El que tapa tu salida, visto con tiempo.** Ver `flight/salida-tapada.ts`.
   *
   * En cada paso, mientras vienes a aterrizar —por el circuito o por la
   * final—, se mira a los que ruedan o esperan en una doble raya de tu salida:
   *
   * - **si le da tiempo a irse antes que tú**, la torre le da la pista en
   *   cuanto está libre, también contigo en el viento en cola: no espera a
   *   que entres en final para dársela, que entonces ya no le da tiempo. En
   *   la final lo hace `despejarTuSalida`, como antes;
   * - **si no**, te retrasa a ti —una vuelta— o, si ya no hay sitio, te manda
   *   al aire, y le da la pista a él en cuanto queda libre. Un AFIS te lo
   *   cuenta, y en la final la instructora propone irse.
   *
   * Una cosa por vez: mientras dura lo pedido no se pide otra. Y con su red.
   */
  private mirarTuSalida(fase: string): void {
    const dt = this.reloj - this.relojDeTuSalida;
    this.relojDeTuSalida = this.reloj;
    const trafico = this.de.trafico();
    if (!trafico?.tapanTuSalida || this.de.privado() || !this.de.torre()) {
      this.tapada = null;
      return;
    }
    // Solo los que la frecuencia tiene: a uno sin vuelo no se le da la pista.
    const tapan = trafico
      .tapanTuSalida()
      .filter((q) => this.de.radio.indicativoDe(q.matricula) !== null);
    const llegada = this.de.tuLlegada?.() ?? null;
    if (this.tapada) {
      this.seguirConTuSalida(dt, tapan, llegada);
      return;
    }
    if (this.enTierra) {
      this.vueltasEnEstaLlegada = 0;
      this.retrasoEnEstaLlegada = 0;
    }
    if (!llegada) return;
    const quien = this.de.afis?.() ? "afis" : "torre";
    for (const q of tapan) {
      if (seVaAntes(llegada, q)) {
        if (fase !== "final") this.darleLaPista(q);
        continue;
      }
      // Pasada la red, ya no se te retrasa más: se aterriza.
      if (this.retrasoEnEstaLlegada > RED_DE_LA_SALIDA) continue;
      const remedio = remedioParaTuSalida(llegada, q, quien, this.vueltasEnEstaLlegada);
      if (remedio === "aviso") {
        this.avisarDeTuSalida(q.matricula, llegada);
        continue;
      }
      if (remedio === "vuelta" && this.de.darteUnaVuelta) {
        this.tapada = {
          por: q.matricula,
          como: "vuelta",
          girado: 0,
          rumbo: this.de.rumbo?.() ?? null,
          lleva: 0,
        };
        this.porTuSalida.vueltas++;
        /*
         * Tu permiso, si lo había, deja de valer: «orbit» es no aterrizar
         * todavía. Se pide otra vez al volver a la final. Ver `pedirAterrizaje`.
         */
        if (this.aterrizajeSinAutorizar || this.enFinal) this.de.retirarteElPermiso?.();
        this.aterrizajeSinAutorizar = false;
        this.de.darteUnaVuelta(q.matricula);
        return;
      }
      if (remedio === "alAire" && this.de.mandarteAlAirePorTuSalida && !this.de.mandanFrustrar?.()) {
        this.tapada = { por: q.matricula, como: "alAire", girado: 0, rumbo: null, lleva: 0 };
        this.porTuSalida.alAire++;
        this.aterrizajeSinAutorizar = false;
        this.despejeSinDecir = null;
        this.alAireEnEstaFinal = true;
        const por = q.matricula;
        this.de.mandarteAlAirePorTuSalida(llegada.alto, por, () => this.sigueSinIrse(por));
        return;
      }
    }
  }

  /** Lo pedido por tu salida, mientras dura. Ver `mirarTuSalida`. */
  private seguirConTuSalida(
    dt: number,
    tapan: readonly QuienTapaTuSalida[],
    llegada: TuLlegadaALaPista | null,
  ): void {
    const t = this.tapada!;
    t.lleva += dt;
    this.retrasoEnEstaLlegada += dt;
    if (t.como === "vuelta") {
      const rumbo = this.de.rumbo?.();
      if (rumbo !== undefined) {
        if (t.rumbo !== null) t.girado += giradoEntre(t.rumbo, rumbo);
        t.rumbo = rumbo;
      }
      const dada = t.girado >= VUELTA_HECHA;
      /*
       * **Y quien no la da y sigue hacia la pista**, ya en la final corta,
       * ya no la va a dar: se deja de esperar y se mira otra vez, que desde
       * ahí lo que queda es irse al aire. Sin esto la vuelta pedida tapaba
       * lo de después hasta tocar.
       */
      const sinDarla =
        llegada?.donde === "final" &&
        llegada.segundos < VUELTA_DESDE_EN_FINAL &&
        t.girado < VUELTA_HECHA / 4;
      if (dada || sinDarla || t.lleva > TOPE_DE_LA_VUELTA) {
        this.vueltasEnEstaLlegada++;
        this.tapada = null;
        this.de.acabarTuVuelta?.(dada);
        return;
      }
    } else if (!this.de.mandanFrustrar?.()) {
      // La orden se levantó —subiendo, alejándote o tocando—: lo de después, de cero.
      this.tapada = null;
      return;
    }
    const suyo = tapan.find((q) => q.matricula === t.por);
    if (suyo) this.darleLaPista(suyo);
  }

  /**
   * **Si el que tapaba tu salida todavía no se ha ido**: sigue con su salida
   * por delante en la frecuencia, o está encima de la pista. Es lo que
   * sostiene la orden de irse al aire: se levanta cuando sale. Ver
   * `mandarIrsePorTuSalida` en `flight/la-aproximacion.ts`.
   */
  private sigueSinIrse(matricula: string): boolean {
    const trafico = this.de.trafico();
    if (trafico?.dibujado && !trafico.dibujado(matricula)) return false;
    return (
      this.de.radio.vaASalir(matricula) ||
      (trafico?.ocupanLaPista?.() ?? []).includes(matricula)
    );
  }

  /**
   * **Un AFIS te cuenta quién hay en tu salida**, una vez por avión, y en la
   * final la instructora propone irse al aire. No le da la pista a nadie: si
   * te vas, tu llegada vuelve a estar lejos y él sale, que es lo que haría
   * quien lo oye. Ver `seVaAntes`.
   */
  private avisarDeTuSalida(matricula: string, llegada: TuLlegadaALaPista): void {
    if (!this.contadoDe.has(matricula) && this.de.contarteTuSalida) {
      this.contadoDe.add(matricula);
      this.porTuSalida.avisos++;
      this.de.contarteTuSalida(matricula);
    }
    if (
      llegada.donde === "final" &&
      !this.propuestoPor.has(matricula) &&
      this.de.proponerteIrtePorTuSalida
    ) {
      this.propuestoPor.add(matricula);
      this.porTuSalida.propuestas++;
      this.de.proponerteIrtePorTuSalida(matricula);
    }
  }

  /**
   * **La pista al que tapa tu salida, en cuanto está libre**: con él ya en
   * su doble raya, sin nadie que aterrice por medio ni corriendo por ella, sin
   * otro del tráfico que llegue antes de que se haya ido y con la estela de la
   * salida de delante pasada (Doc 4444, 5.8.3.1); a ti no se te cuenta, que
   * para eso te retrasan. Si hay uno alineado esperando, primero ése: la
   * pista es de uno por vez. Ver `puedeSalirSinEsperarte` en
   * `world/trafico.ts`.
   */
  private darleLaPista(q: QuienTapaTuSalida): void {
    if (this.numeroDos) return;
    const radio = this.de.radio;
    const ocupan = radio.ocupanLaPista;
    // Con uno que aterriza por medio, se espera a que la deje.
    if (ocupan.some((o) => o.orden !== "torre.lineUpWait")) return;
    const alineado = ocupan[0]?.matricula ?? null;
    if (!alineado && !radio.vaASalir(q.matricula)) return;
    const trafico = this.de.trafico();
    if (!trafico?.puedeSalirSinEsperarte?.(alineado ?? q.matricula)) return;
    const dichas = radio.despejarLaPista(null, alineado ? false : [q.matricula]);
    for (const dice of dichas)
      trafico.anuncia(dice.de.matricula, dice.clave, radio.puedeAterrizar(dice.de.matricula));
    const dice = laQueSeDice(dichas);
    if (dice) this.de.decirAOtro(dice);
  }

  /**
   * Entraste en final: tu autorización para aterrizar, **cuando toque**. Ver
   * `paso`.
   */
  pedirAterrizaje(): void {
    this.aterrizajeSinAutorizar = true;
  }

  /**
   * **Tu autorización para aterrizar, cuando toca y no antes.**
   *
   * Se pide al entrar en final y se dice en cuanto se pueda, que es casi
   * siempre enseguida. Espera a dos cosas:
   *
   * - A que suene lo que le quita la pista a otro, si se le quitó. Ver
   *   `despejeSinDecir`.
   * - A que el que va delante la deje libre, si eres el número dos. Si en vez
   *   de eso llegas a la altura de decisión, la torre te manda al aire: con la
   *   pista ocupada no se aterriza. Renunciar es ganar, y la frustrada se
   *   felicita igual.
   *
   * Y deja de esperar si dejas la final —te fuiste al aire, o tocaste—: una
   * autorización para una final que ya no existe no se dice.
   */
  paso(fase: string): void {
    // Antes que nada, quien tapa tu salida: lo que se decida ahí manda. Ver `mirarTuSalida`.
    this.mirarTuSalida(fase);
    if (fase === "final") this.despejarTuSalida();
    if (fase !== "final") {
      /*
       * **Y si ya se pidió y todavía espera turno en la boca, tampoco.** Con
       * la boca ocupada el permiso espera en la cola —ver `noSePierde`—, y
       * en una final corta eso puede ser más que lo que queda hasta tocar: en
       * Tenerife Norte sonó «cleared to land» con el avión ya rodando por la
       * pista.
       */
      /*
       * **Y si se retira sin haber sonado, no se dio.** La luz se había
       * puesto verde al darlo, y la voz esperaba turno; retirada la voz, la
       * luz seguía verde, y al volver a final —la fase puede ir y volver en
       * un segundo en el borde de la final— el permiso nuevo no sonaba,
       * porque la lámpara solo habla cuando cambia. Llegando a Los Rodeos:
       * «torre.canario.aterrizar: ya no es verdad» y se aterrizó sin oír
       * ningún permiso. Ver `retirarteElPermiso`.
       */
      if (this.enFinal && this.de.boca.esperaAlguna(esTuPermisoDeAterrizar)) {
        this.de.boca.retirar(esTuPermisoDeAterrizar);
        this.de.retirarteElPermiso?.();
      }
      this.enFinal = false;
      this.aterrizajeSinAutorizar = false;
      this.numeroDos = null;
      this.ocupadaDicha = false;
      this.alAireEnEstaFinal = false;
      return;
    }
    this.enFinal = true;
    if (!this.aterrizajeSinAutorizar) {
      /*
       * **Y con el permiso dado, la pista tiene que seguir libre.**
       *
       * La vigilancia de la pista se acababa al darte el permiso: lo que la
       * ocupara después no lo miraba nadie, y se llegaba a la altura de
       * decisión con un avión encima y la verde puesta. Gran Canaria, de
       * noche, con el JAZ 120: «tengo un avión en la pista y nadie me dice que
       * frustre, ya lo hago yo». Lo de verdad es lo mismo que sin permiso: con
       * la pista ocupada no se aterriza, y si a la decisión sigue ocupada la
       * torre te manda al aire, que anula el permiso que hubiera. Una vez por
       * final: la orden se queda puesta hasta que se resuelve.
       */
      const ocupada = (): boolean => this.ocupadaEnElDibujo;
      if (this.conTorre && !this.alAireEnEstaFinal && ocupada()) {
        this.decirQueEstaOcupada();
        const alto = this.de.alto();
        if (alto < ALTURA_DE_DECISION && !this.de.mandanFrustrar?.()) {
          this.alAireEnEstaFinal = true;
          this.de.mandarteAlAire(alto, ocupada);
          return;
        }
      }
      /*
       * **Y a la altura de decisión, el permiso tiene que verse.**
       *
       * Se daba por bueno al pedirlo, y su frase podía esperar turno: en La
       * Palma llegó con el avión en la cabecera y la máquina contando «one
       * hundred». Después se arregló mandándote al aire si a esa altura no
       * había empezado a sonar, y eso era la torre castigándote por su propio
       * retraso, con la pista libre: Enrique, con el JAZ 120 en Guyrami, «si
       * la torre no me manda al aire a la primera, sí lo hubiera metido». Lo
       * real es que la torre, con la pista libre, te la da (OACI, Doc 4444,
       * capítulo 7: la autorización para aterrizar se da en cuanto se sabe que la
       * pista estará libre). Así que a los mínimos se da **a la vista**: la
       * lámpara verde y su tarjeta en el acto, y lo que de ella quede por
       * sonar ya no se dice. Ver `darteElPermisoYa`.
       */
      const alto = this.de.alto();
      if (
        alto < ALTURA_DE_DECISION &&
        this.de.permisoSinOir?.() &&
        !this.de.mandanFrustrar?.()
      ) {
        this.de.darteElPermisoYa?.();
        return;
      }
      /*
       * **Y lo que de tu permiso todavía espera turno a los mínimos, ya no se
       * dice.** El permiso ya se oyó —la lámpara y su castellano—, pero de
       * Taguató para arriba detrás va su fraseología, con el viento, y esa
       * podía esperar detrás de lo que fuera: «cleared to land» a veinte
       * metros del suelo. Es la regla de la cuenta del radioaltímetro: lo que
       * ya no puede sonar a su altura, no se dice.
       */
      if (alto < ALTURA_DE_DECISION && this.de.boca.esperaAlguna(esTuFraseologiaDeAterrizar))
        this.de.boca.retirar(esTuFraseologiaDeAterrizar);
      return;
    }
    /*
     * **Y con una orden de irse al aire puesta, el permiso pendiente se cae.**
     *
     * Quien levanta la orden sabe lo que toca decir —ver `alLevantarLaOrden`—
     * y aquí no se sabe. El permiso puede estar esperando turno —el despeje
     * del otro, el «pista libre» del de delante— cuando llega una orden por
     * otro motivo, y en cuanto dejaba de esperar sonaba «autorizado para
     * aterrizar» con la orden de irse puesta: la verde encima de la roja. Si
     * la orden se levanta en final, el permiso lo da quien la levanta; si no,
     * se pide otra vez en la final nueva.
     */
    if (this.de.mandanFrustrar?.()) {
      this.aterrizajeSinAutorizar = false;
      return;
    }
    const alto = this.de.alto();
    if (this.numeroDos && this.de.radio.laTiene(this.numeroDos)) {
      this.decirQueEstaOcupada();
      if (alto < ALTURA_DE_DECISION) {
        const delante = this.numeroDos;
        this.aterrizajeSinAutorizar = false;
        this.alAireEnEstaFinal = true;
        this.de.mandarteAlAire(alto, () => this.de.radio.laTiene(delante));
      }
      return;
    }
    /*
     * **Y la pista que se ve, además de la que se oye.** Lo de arriba mira
     * quién la tiene según la frecuencia, y eso no basta: uno que despegó
     * sigue corriendo por ella, uno que dijo «pista libre» se la dijo a su
     * hora de radio. Con alguien encima no se te da, ni «cleared to land» ni
     * «pista libre»: en La Gomera sonó «pista libre» con el otro todavía en la
     * pista, a mil noventa metros del umbral. Se espera, y si a la decisión
     * sigue ocupada, al aire.
     */
    const ocupada = (): boolean => this.ocupadaEnElDibujo;
    if (ocupada()) {
      this.decirQueEstaOcupada();
      if (alto < ALTURA_DE_DECISION) {
        this.aterrizajeSinAutorizar = false;
        this.despejeSinDecir = null;
        this.alAireEnEstaFinal = true;
        this.de.mandarteAlAire(alto, ocupada);
      }
      return;
    }
    if (this.numeroDos) {
      /*
       * **Y se fue: ahora sí es tuya.** Lo de antes de dártela se hace ahora,
       * que es cuando te la dan: si mientras tanto alguien la ocupó, se le
       * quita, y se dice antes que lo tuyo.
       */
      this.numeroDos = null;
      this.alSerTuya("");
    }
    /*
     * **Y lo que la suelta, que se oiga antes que lo tuyo.** El «pista libre»
     * del que aterrizó antes va en voz baja y tu permiso en `mando`: pedidos
     * en ese orden, sonaba primero el tuyo —o solo el tuyo, si el otro se
     * caía de la cola—. Ver `sueltaLaPista`.
     */
    const despeje = this.despejeSinDecir;
    const todaviaNoEsTuya = (): boolean =>
      (despeje !== null && this.de.boca.espera(despeje)) ||
      this.de.boca.esperaAlguna(sueltaLaPista);
    if (todaviaNoEsTuya()) {
      /*
       * **Y sin permiso a la altura de decisión, al aire.** Esperar a que se
       * oiga lo que suelta la pista tenía un fallo: la espera no miraba la
       * altura. El número dos pasaba la decisión con el de delante todavía
       * en la pista —aquí arriba sí se mira—, el de delante la dejaba a los
       * cincuenta metros, su «pista libre» esperaba turno en la boca y tu
       * permiso llegaba detrás, a once metros del suelo, en Los Rodeos. Una
       * torre de verdad no autoriza a quien ya está tocando: a la altura de
       * decisión, o la pista es tuya y lo sabes, o te vas. Y quien se va,
       * vuelve por el circuito y la tiene en la final siguiente.
       */
      if (alto < ALTURA_DE_DECISION) {
        this.aterrizajeSinAutorizar = false;
        this.despejeSinDecir = null;
        this.alAireEnEstaFinal = true;
        this.de.mandarteAlAire(alto, todaviaNoEsTuya);
      }
      return;
    }
    /*
     * **Y dando la vuelta que te pidieron, todavía no.** Es para que salga el
     * de tu salida: autorizarte en medio sería dársela a dos. Se queda pedido
     * y se da al volver, si toca. Lo de arriba sí vale: con la pista ocupada
     * a la decisión, al aire, hayas dado la vuelta o no. Ver `mirarTuSalida`.
     */
    if (this.tapada?.como === "vuelta") return;
    this.despejeSinDecir = null;
    this.aterrizajeSinAutorizar = false;
    /*
     * **Con la pista libre, se da, también a los mínimos.** Se pide en la
     * final de la torre, a millas —ver `flight/final-de-la-torre.ts`—, así que
     * llegar aquí abajo sin él es un retraso de la torre —la final cogida muy
     * tarde, una boca ocupada—, y por ese retraso no se manda a nadie al aire:
     * lo hacía, con la pista vacía. Por debajo de los mínimos se da a la
     * vista, sin la frase entera a destiempo: ver `darteElPermisoYa`.
     */
    this.de.autorizarte();
    if (alto < ALTURA_DE_DECISION) this.de.darteElPermisoYa?.();
  }

  /**
   * Si tu permiso para aterrizar está pedido y todavía no se ha dado: espera a
   * lo que le toque. Para el banco, que vuela a tiempo real mientras tanto.
   */
  get pidiendoAterrizaje(): boolean {
    return this.aterrizajeSinAutorizar;
  }

  /**
   * **Que la pista está ocupada, dicho una vez por final** y solo donde lo
   * dice alguien: un AFIS, que informa. Ver `avisarteOcupada`.
   */
  private decirQueEstaOcupada(): void {
    if (this.ocupadaDicha || this.de.privado()) return;
    this.ocupadaDicha = true;
    this.de.avisarteOcupada?.();
  }

  /**
   * **La lámpara cambió de color: lo que decía la de antes, si todavía espera
   * turno, se retira.** Solo lo que va a tu matrícula —`mia`, como va en la
   * clave—: lo que la torre le dice a otro en el mismo fotograma no es de tu
   * lámpara. Ver `esDeLaLampara` y `luzDeTorre` en `game.ts`.
   *
   * Y la instructora explicando por qué se espera, que es de la roja: dicha
   * con la luz ya en verde contaría una espera que se acabó.
   */
  alCambiarLaLuz(mia: string): void {
    this.de.boca.retirar(
      (clave, urgencia) =>
        esDeLaLampara(clave, urgencia, mia) || explicaLaEspera(clave),
    );
  }

  /**
   * **Otro campo, otra frecuencia.** Lo que la de aquí dejó esperando turno en
   * la boca se va con ella: se oía ya en el campo nuevo, con la pista del
   * viejo —llegando a Gando, un «cleared to land» a un avión de Los Rodeos
   * por la 12—, porque la frase se monta con su pista al decirse la llamada y
   * no al sonar. Ver `esDeLaFrecuencia`.
   *
   * Y el número dos de allí no es nadie aquí.
   */
  cambiarDeCampo(aerodromo: string | null | undefined): void {
    this.reiniciar(aerodromo);
  }

  /**
   * **Se deja de oír esta frecuencia**: se ha salido de la zona de la torre.
   * Lo suyo que esperaba turno en la boca ya no suena —se oiría en otra
   * frecuencia, la de salida o la de control—, y la frecuencia sigue igual:
   * sus aviones siguen volando, solo que ya no se les oye. Ver
   * `flight/dependencia.ts`.
   */
  dejarDeOir(): void {
    this.de.boca.retirar(esDeLaFrecuencia);
  }

  /**
   * **Volver a empezar es empezar de cero**, también en la frecuencia.
   *
   * El vuelo nuevo reiniciaba la frecuencia —otras matrículas— y dejaba aquí
   * lo del anterior: el número dos, tu permiso pedido, lo que la torre tenía
   * a medio decir. Con eso y el dibujo de antes todavía en pantalla, tras un
   * percance en Pettirossi la avioneta seguía parada junto al punto de espera
   * y la roja encendida. Lo que no es de este vuelo no se queda.
   */
  reiniciar(aerodromo: string | null | undefined): void {
    this.de.boca.retirar(esDeLaFrecuencia);
    this.de.radio.reiniciar(aerodromo);
    this.numeroDos = null;
    this.despejeSinDecir = null;
    this.aterrizajeSinAutorizar = false;
    this.enFinal = false;
    this.ocupadaDicha = false;
    this.esperandoTrasDe.clear();
    this.retenidoDesde.clear();
    this.retencionMasLarga = 0;
    this.tapada = null;
    this.vueltasEnEstaLlegada = 0;
    this.retrasoEnEstaLlegada = 0;
    this.contadoDe.clear();
    this.propuestoPor.clear();
    this.porTuSalida.vueltas = 0;
    this.porTuSalida.alAire = 0;
    this.porTuSalida.avisos = 0;
    this.porTuSalida.propuestas = 0;
  }
}
