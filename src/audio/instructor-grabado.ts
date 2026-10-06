/**
 * El instructor de verdad: una persona grabada, montada por trozos.
 *
 * Esta es la implementación que el primer día ya estaba prevista. `Instructor`
 * es una interfaz desde entonces precisamente para esto: el resto del juego
 * pide «decí esto» sin saber quién contesta, así que aparecer aquí no cambia
 * nada de nada en el juego. Ver la cabecera de `instructor.ts`.
 *
 * ## Frase a frase, no todo o nada
 *
 * El pack va a llegar por partes —primero el instructor en castellano, luego
 * el guaraní, luego la cabina— y lo que todavía no está grabado lo dice la voz
 * del navegador, como hoy. Eso permite grabar de diez en diez y oír el
 * resultado el mismo día en vez de esperar a tenerlo todo.
 *
 * Y por eso este objeto **envuelve** al del navegador en vez de sustituirlo:
 * lo que no sabe decir, lo delega.
 *
 * ## Lo que se descarga, y cuándo
 *
 * Nada en el paquete del juego. El pack se baja **después del primer gesto**
 * —que es también cuando se despierta el audio— y se guarda en la Cache API,
 * así que las veinte tablets de un aula lo bajan una vez y todas las sesiones
 * siguientes van sin red. En Opus son unos trescientos kilobytes; en el gemelo
 * de AAC, el doble. Ver #65 y `banco-de-voz.ts`.
 */

import type { AlSonar, Instructor } from "./instructor";
import type { Urgencia } from "./boca";
import { BOCA, Boca } from "./boca";
import { ESPERA_A_SU_VOZ } from "./turnos";
import type { PorAltavoz } from "./tonos-de-cabina";
import {
  BASE,
  CACHE,
  RESPALDO,
  elegirFormato,
  ficheroDe,
  leerManifiesto,
  loQueHaceFalta,
  queSuena,
  type Formato,
  type Manifiesto,
} from "./banco-de-voz";

/** Lo que este instructor necesita del motor de audio, y nada más. */
/**
 * Cada cuánto se mira si la voz del navegador ya calló, en milisegundos.
 *
 * Ciento veinte: lo bastante corto para que el silencio entre frases no se
 * note, y lo bastante largo para no preguntarlo sesenta veces por segundo. Ver
 * el porqué en `decir`.
 */
const MIRAR_SI_CALLO = 120;

/**
 * Y cuánto se le aguanta como mucho, en milisegundos.
 *
 * Doce segundos. Una voz del sistema que se queda colgada —pasa, y no avisa—
 * no puede dejar mudo el resto del vuelo.
 */
const HASTA_QUE_CALLE = 12000;

/**
 * Y cuánto se le da para **arrancar**, en milisegundos.
 *
 * Dos segundos. Una voz del navegador no empieza a hablar en el instante en
 * que se le pide: hay que pedir la lista de voces, elegir una y arrancar el
 * sintetizador. Preguntarle a los ciento veinte milisegundos si está hablando
 * devuelve «no» casi siempre — y con eso el turno se soltaba antes de que
 * sonara una sílaba, que es justo el fallo que esto viene a arreglar.
 */
const TARDA_EN_ARRANCAR = 2000;

export interface Altavoz {
  decodificar(bytes: ArrayBuffer): Promise<AudioBuffer | null>;
  encadenarVoz(
    piezas: readonly AudioBuffer[],
    alAcabar: () => void,
    porRadio?: boolean,
    porAltavoz?: PorAltavoz,
  ): (() => void) | null;
  /**
   * Si hay audio en este navegador. Sin él nunca sonará nada grabado, así que
   * no se espera a nada: se dice como se pueda. Sin el dato, se da por que sí.
   */
  readonly available?: boolean;
  /**
   * **Si el audio ya puede sonar**: el contexto despierto, que en un navegador
   * es después del primer gesto. Mientras no, lo que se pide espera. Sin el
   * dato, se da por que sí. Ver `estaLista`.
   */
  readonly despierto?: boolean;
}

/**
 * Las grabaciones ya bajadas: los manifiestos y las piezas de audio.
 *
 * Se saca fuera de la clase para que las cuatro bocas del juego —instructora,
 * torre, otro avión y comandante— compartan un solo pack bajado una sola vez.
 * Cada una mantiene su turno de palabra, su suplente y su timbre; lo único que
 * comparten es de dónde sale el sonido grabado.
 */
export interface BancoDeVoces {
  readonly manifiestos: Manifiesto[];
  readonly piezas: Map<string, AudioBuffer>;
  /**
   * **Cómo va la bajada del pack**, que es lo que decide si una frase que
   * todavía no tiene su grabación la espera o se le pasa a la voz del
   * navegador:
   *
   * - `sin-pack`: no se va a bajar —no hay formato que se pueda tocar, o es
   *   una prueba—. Lo que no está, no está, y no se espera a nada.
   * - `por-pedir`: se bajará con el primer gesto. Lo que se pida antes, espera.
   * - `manifiestos`: bajando los manifiestos. Todavía no se sabe qué hay.
   * - `bajando`: los manifiestos puestos y las piezas en camino; lo que se
   *   pide va delante.
   * - `listo`: bajado. Lo que falte, falta de verdad.
   */
  estado: "sin-pack" | "por-pedir" | "manifiestos" | "bajando" | "listo";
  /**
   * Las piezas que se están trayendo, para no pedir dos veces la misma y
   * para que lo que hace falta ya se pida por delante de lo demás.
   */
  readonly pidiendo: Map<string, Promise<void>>;
  /** El formato y la carpeta con que se baja, puestos al empezar. */
  formato?: Formato;
  base?: string;
}

/** Una bolsa vacía. Cada juego crea la suya y se la pasa a sus cuatro bocas. */
export function nuevoBancoDeVoces(): BancoDeVoces {
  return { manifiestos: [], piezas: new Map(), estado: "sin-pack", pidiendo: new Map() };
}

/**
 * **Cuántas piezas se traen a la vez de fondo**, mientras baja el pack.
 *
 * Seis, las conexiones que abre un navegador por servidor. Se pedían todas
 * las de una voz de golpe —quinientas de la instructora—, y en una red lenta
 * eso es una cola de quinientas delante de cualquier cosa que se pida
 * después: el crosscheck de Jazlyn, que es la sexta voz, llegaba al minuto.
 * Con el fondo en seis, lo que se necesita ya se pide aparte y pasa delante.
 * Ver `traerPieza`.
 */
const DE_FONDO = 6;

/**
 * Las grabaciones que se hicieron a voces y no se usan hasta rehacerlas.
 *
 * No es una lista de frases que no gusten: es una lista de **tonos que enseñan
 * mal**. Un aviso que grita no enseña a reaccionar, enseña a asustarse, y este
 * juego lo empieza alguien de cuatro años.
 */
const A_VOCES: ReadonlySet<string> = new Set([
  /*
   * La del punto de no retorno —«ya despegamos, seguí»— ya no está aquí
   * porque **ya no está en el pack**: se borró del disco y del manifiesto.
   * Era la que más molestaba, dicha tres veces y con nombre y apellido: «esta,
   * me tiene desesperado». Un segundo y medio de grito que además viajaba a
   * cada tablet para eso.
   */
  // «Subí», la palabra sola de la senda.
  "palabra.subi",
  /*
   * **Y aquí estuvieron el aviso de terreno y el de sacar el tren**, gritados.
   * Se sacaron al rehacerlos en calma —«el tren si hay que quitarlo, se dice y
   * ya está, no hace falta pegar un grito»— y no antes: apartadas, caían en la
   * voz del navegador, que en Brave para Linux es muda, y el aviso de terreno
   * se quedaba sin voz. Cómo se grabaron está en `EN_CALMA`, en
   * `scripts/frases-para-grabar.mjs`, para que la próxima toma salga igual.
   */
]);

export class InstructorGrabado implements Instructor {
  private readonly altavoz: Altavoz;
  /** A quién se le pasa lo que todavía no está grabado. */
  private readonly suplente: Instructor;
  /**
   * La bolsa de grabaciones, **compartida**.
   *
   * Un manifiesto por voz y todas las piezas juntas, con la voz delante de la
   * clave. Se buscan en orden y manda el primero que tenga receta, que es lo
   * mismo que decir «cada frase la dice quien le toca», porque ninguna clave
   * está en dos packs.
   *
   * **Y es compartida a propósito.** El juego tiene cuatro bocas —la
   * instructora, la torre, el otro avión y la comandante— y cada una necesita
   * su propio turno de palabra, pero las cuatro leen del mismo pack. Con una
   * bolsa por boca habría que bajar seis packs cuatro veces; con ésta se baja
   * una vez y las cuatro ven lo mismo.
   */
  private readonly banco: BancoDeVoces;
  private cortar: (() => void) | null = null;
  private sonando = false;
  /** Lo último dicho, para no repetirlo mientras siga siendo lo mismo. */
  private ultima = "";

  /**
   * Y por dónde pide la palabra.
   *
   * La boca del juego es una sola —`BOCA`— y es la de verdad. Se puede dar otra
   * para poder probar el turno y el silencio sin compartir estado entre
   * pruebas, que con una global es exactamente lo que pasa: una frase que no
   * termina en la primera prueba deja muda la segunda.
   */
  private readonly boca: Boca;

  constructor(
    altavoz: Altavoz,
    suplente: Instructor,
    boca: Boca = BOCA,
    banco: BancoDeVoces = nuevoBancoDeVoces(),
    /**
     * Si esta voz llega **por radio**.
     *
     * Las grabaciones se van entonces por la cadena de filtros —banda de
     * trescientos a dos mil quinientos hercios, que es la de una radio VHF de
     * verdad— y suenan más bajas. La instructora y la comandante no: una está
     * sentada a tu lado y la otra habla por los altavoces del pasaje.
     */
    private readonly porRadio = false,
    /**
     * Y si llega **por el altavoz del techo**: la comandante y la tripulación
     * de cabina. Ni radio ni al lado: la megafonía del pasaje, con su propio
     * sonido. Ver `entradaDeAltavoz` en `audio.ts`. La tripulación, además,
     * desde el pasaje: ver `PorAltavoz`.
     */
    private readonly porAltavoz: PorAltavoz = false,
  ) {
    this.altavoz = altavoz;
    this.suplente = suplente;
    this.boca = boca;
    this.banco = banco;
  }

  /**
   * Si hay alguien que pueda hablar: el grabado o el suplente. **Y el pack
   * que está por llegar cuenta**: con él pedido o bajando, lo que se pide
   * espera a su grabación, así que hay voz aunque todavía no haya piezas.
   */
  get disponible(): boolean {
    const viene = this.banco.estado !== "sin-pack" && this.banco.estado !== "listo";
    return this.banco.piezas.size > 0 || viene || this.suplente.disponible;
  }

  /**
   * **Que espere al pack**: se va a bajar con el primer gesto, así que lo que
   * se pida antes no se le pasa a la voz del navegador —muda en Brave para
   * Linux—, sino que espera su grabación. Solo si este navegador puede tocar
   * el pack y tiene audio; si no, nunca llegaría y no se espera a nada.
   */
  esperarAlPack(puede: (mime: string) => string = miraSiPuede): void {
    if (this.banco.estado !== "sin-pack") return;
    if (this.altavoz.available === false || !elegirFormato(puede)) return;
    this.banco.estado = "por-pedir";
  }

  /**
   * **Si esta frase ya puede sonar como tiene que sonar**: el audio despierto
   * y, si está grabada, sus piezas bajadas. Lo pregunta la boca mientras la
   * frase espera su turno; ver `AlPedir.lista` en `audio/boca.ts`.
   *
   * Es el arreglo del crosscheck de Jazlyn, que no sonaba en casa de Enrique:
   * se pedía en el puesto, antes de que su grabación hubiera bajado —es la
   * sexta voz del pack, y la primera vez después de publicar se bajan todas
   * otra vez— y con el audio a veces todavía sin despertar. La frase se le
   * pasaba entonces a la voz del navegador, que en Brave para Linux no
   * existe, y se daba por dicha. Ahora espera, con su tope: ver
   * `ESPERA_A_SU_VOZ`.
   *
   * **Y si le falta alguna pieza, la pide ya**, por delante de lo que baja de
   * fondo. Pregunta y encargo van juntos a propósito: quien espera es quien
   * sabe qué le falta.
   */
  estaLista(
    clave: string | undefined,
    relleno?: Readonly<Record<string, string>>,
  ): boolean {
    const b = this.banco;
    if (b.estado === "sin-pack") return true;
    if (this.altavoz.available === false) return true;
    if (this.altavoz.despierto === false) return false;
    if (!clave || A_VOCES.has(clave)) return true;
    if (b.estado === "por-pedir" || b.estado === "manifiestos") return false;
    const suena = this.quienLaDice(clave, relleno);
    // Sin receta en ningún manifiesto: no hay grabación que esperar.
    if (!suena) return true;
    const faltan = suena.piezas.filter((p) => !b.piezas.has(`${suena.voz}/${p}`));
    if (!faltan.length || b.estado === "listo") return true;
    const m = b.manifiestos.find((x) => x.voz === suena.voz);
    if (m) for (const p of faltan) void this.traerPieza(m, p);
    return false;
  }

  /** Las piezas de una frase ya bajadas, en orden, o `null` si falta alguna. */
  private cadenaDe(suena: { voz: string; piezas: readonly string[] }): AudioBuffer[] | null {
    const cadena: AudioBuffer[] = [];
    for (const pieza of suena.piezas) {
      const buffer = this.banco.piezas.get(`${suena.voz}/${pieza}`);
      if (!buffer) return null;
      cadena.push(buffer);
    }
    return cadena.length ? cadena : null;
  }

  get hablando(): boolean {
    return this.sonando || this.suplente.hablando;
  }

  /** Cuántas piezas hay cargadas. Lo mira el banco de pruebas. */
  get cuantasPiezas(): number {
    return this.banco.piezas.size;
  }

  /** Cómo va la bajada del pack. Ver `BancoDeVoces.estado`. */
  get estadoDelPack(): BancoDeVoces["estado"] {
    return this.banco.estado;
  }

  /**
   * Quién tiene grabada esta frase, si la tiene alguien.
   *
   * Devuelve las piezas ya con la voz delante, que es como están guardadas.
   */
  private quienLaDice(
    clave: string | null,
    relleno: Readonly<Record<string, string>> = {},
  ): { voz: string; piezas: readonly string[] } | null {
    /*
     * **Las que se grabaron gritando no se tocan.**
     *
     * El tono vive en el fichero de audio, no en el texto: cambiar la frase
     * cambia lo que lee la voz del navegador y no lo que se grabó. Y estas se
     * grabaron a voces — pedido más de una vez, y la última sin rodeos:
     * «quita de una vez a la loca que grita "ya no se puede seguir, subí"».
     *
     * Así que estas claves **se saltan el pack** y las dice la voz del
     * sistema, que lee el texto tal cual y no grita. Es un apaño y está
     * escrito como tal: lo que corresponde es volver a grabarlas en tono de
     * aviso, y eso cuesta crédito y se pregunta antes. Ver `A_VOCES`.
     */
    if (clave && A_VOCES.has(clave)) return null;
    for (const m of this.banco.manifiestos) {
      const suena = queSuena(m, clave, true, relleno);
      if (suena.como === "grabado") {
        return { voz: m.voz, piezas: suena.piezas };
      }
    }
    return null;
  }

  /**
   * De qué pack sale esta frase, si sale de alguno. `null` si la dice el
   * suplente del sistema.
   *
   * Hace falta fuera para poder comprobar **que cada boca usa su grabación**,
   * que es lo que estuvo roto desde que existen las grabaciones: el pack
   * entero se bajaba y solo lo consultaba la instructora. Ver `sondas.ts`.
   */
  vozDe(
    clave: string,
    relleno?: Readonly<Record<string, string>>,
  ): string | null {
    return this.quienLaDice(clave, relleno)?.voz ?? null;
  }

  /**
   * **Las piezas ya cargadas de esta frase**, listas para tocar, o `null` si
   * falta alguna.
   *
   * Lo usa la voz de la máquina, que no habla por ninguna boca: la cuenta y
   * los avisos de las cajas suenan en cuanto pasa lo que avisan, sin turno.
   * Comparte la bolsa de grabaciones con las bocas porque son el mismo pack.
   * Ver `audio/maquina.ts`.
   */
  piezasDe(clave: string): AudioBuffer[] | null {
    const suena = this.quienLaDice(clave);
    if (!suena) return null;
    const cadena: AudioBuffer[] = [];
    for (const pieza of suena.piezas) {
      const buffer = this.banco.piezas.get(`${suena.voz}/${pieza}`);
      if (!buffer) return null;
      cadena.push(buffer);
    }
    return cadena.length ? cadena : null;
  }

  /**
   * Las voces con las que ha hablado esta boca: la carpeta de la grabación
   * —«instructor», «torre», «otro»…— o «navegador» si la dijo el sintetizador. Las cuatro bocas comparten una bolsa de
   * grabaciones y la voz la pone la frase, así que es lo único que dice desde
   * fuera si una radio suena a otra persona o a tu propio instructor. Lo mira
   * `verificar-quien-habla`.
   */
  readonly vocesUsadas = new Set<string>();

  /**
   * **Lo único que puede decir esta boca, si hay algo que la calle.**
   *
   * Es el modo sin instructora: con él puesto, la instructora solo dice lo
   * que la lista deja —ver `suenaSinInstructora` en
   * `flight/sin-instructora.ts`— y lo demás no llega ni a pedir turno. Va
   * aquí, en la puerta de la boca, y no en cada sitio que la llama, porque
   * son sesenta sitios en `game.ts` y una frase nueva no puede colarse por
   * haberse escrito en el sexagésimo primero.
   *
   * `null` es la instructora de siempre: todo pasa.
   */
  callaSalvo: ((clave: string | undefined) => boolean) | null = null;

  /**
   * Lo que el modo sin instructora no dejó decir, en orden. Para los bancos:
   * es la mitad de la cuenta de «qué se dice con ella y sin ella».
   */
  readonly calladas: string[] = [];

  decir(
    texto: string,
    clave?: string,
    urgencia?: Urgencia,
    relleno?: Readonly<Record<string, string>>,
    alSonar?: AlSonar,
  ): void {
    if (this.callaSalvo && !this.callaSalvo(clave)) {
      if (import.meta.env.DEV) {
        this.calladas.push(clave ?? texto);
        if (this.calladas.length > 5000) this.calladas.shift();
      }
      /*
       * Y quien espera saber si sonó se entera de que no: se cae, con su
       * motivo. Hoy solo lo escucha la información de tráfico, que está en
       * la lista y no llega aquí; el día que otra lo escuche, sabrá por qué.
       */
      alSonar?.("se-cae", "sin-instructora");
      return;
    }
    this.decirLoPedido(texto, clave, urgencia, relleno, alSonar);
  }

  /**
   * **Lo que se pide con el dedo**, que no pasa por `callaSalvo`.
   *
   * Tocar una pieza del cuadro, la tarjeta del avión o la pregunta de si se
   * vuela sin instructora es pedirle a ella que hable. Callar eso sería
   * romper un botón: el modo sin instructora es para que no corrija ni
   * aconseje sin que se lo pidan, no para que no conteste.
   */
  decirLoPedido(
    texto: string,
    clave?: string,
    urgencia?: Urgencia,
    relleno?: Readonly<Record<string, string>>,
    alSonar?: AlSonar,
  ): void {
    /*
     * **Y para los turnos, la frase y a quién va.** La torre habla con los
     * dos aviones de la frecuencia con las mismas frases, y la regla de no
     * repetirse miraba solo la frase: autorizado el otro, **tu** «cleared for
     * take-off» se descartaba por «repetida» aunque llevara otra matrícula.
     * Medido en La Palma con el historial de voces. Para buscar el audio y
     * para el historial la frase sigue siendo la misma; ver `turnoDe`.
     */
    const turno = turnoDe(clave, relleno);
    const alCaer = alSonar ? (porque: string) => alSonar("se-cae", porque) : undefined;
    const hablar = (listo: (noSono?: boolean) => void) =>
      this.hablarYa(texto, clave, urgencia, relleno, alSonar, listo);
    /*
     * **Y si todavía no puede sonar como tiene que sonar, espera**: en la cola
     * de la boca, a la vista de quien pregunte qué espera, pero sin que le
     * toque hasta que esté lista o se le acabe el tope. Ver `estaLista`.
     */
    if (!this.estaLista(clave, relleno)) {
      this.boca.pedir(urgencia ?? "normal", hablar, turno, {
        lista: () => this.estaLista(clave, relleno),
        tope: ESPERA_A_SU_VOZ,
        alCaer,
      });
      return;
    }
    const suena = this.quienLaDice(clave ?? null, relleno);
    /*
     * Sin receta grabada, o con una pieza que el manifiesto promete y no está
     * cargada —media frase es peor que ninguna—, la dice el navegador entera,
     * **pidiendo la palabra**. Ver `porElSuplente`.
     */
    if (!suena || !this.cadenaDe(suena)) {
      this.porElSuplente(texto, clave, urgencia, turno, relleno, alSonar);
      return;
    }
    /*
     * **Y lo grabado también pide la palabra.**
     *
     * Esto tocaba directamente y se saltaba la boca entera, así que en cuanto
     * el pack de voz está cargado —o sea, en el juego de verdad— no había ni
     * turno, ni silencio entre frases, ni regla de no repetirse: justo las tres
     * cosas que se oían mal. La boca no sabe de audio; recibe una función que
     * habla y avisa al terminar, y eso es lo que se le da aquí. Ver
     * `audio/boca.ts`.
     */
    this.boca.pedir(urgencia ?? "normal", hablar, turno, { alCaer });
  }

  /**
   * **Habla ahora, que ya le toca**, con lo que haya en este momento: su
   * grabación si está, la voz del navegador si no, y si no hay ninguna de las
   * dos, nada — avisando a la boca en el acto de que no sonó.
   *
   * Se mira aquí y no al pedir porque entre pedir y hablar puede pasar un
   * rato —el de esperar turno, o el de esperar a su grabación—, y lo que
   * cuenta es lo que hay cuando suena.
   */
  private hablarYa(
    texto: string,
    clave: string | undefined,
    urgencia: Urgencia | undefined,
    relleno: Readonly<Record<string, string>> | undefined,
    alSonar: AlSonar | undefined,
    listo: (noSono?: boolean) => void,
  ): (() => void) | void {
    const suena = this.quienLaDice(clave ?? null, relleno);
    const cadena = suena ? this.cadenaDe(suena) : null;
    this.ultima = clave ?? texto;
    this.apuntar();
    if (suena && cadena) {
      this.suplente.callar();
      this.callarLoGrabado();
      this.vocesUsadas.add(suena.voz);
      this.sonando = true;
      this.cortar = this.altavoz.encadenarVoz(
        cadena,
        () => {
          this.sonando = false;
          this.cortar = null;
          alSonar?.(this.cortando ? "cortada" : "acaba");
          listo();
        },
        this.porRadio,
        this.porAltavoz,
      );
      if (this.cortar) {
        alSonar?.("empieza");
        /*
         * **Y se le dice a la boca cómo callarnos.**
         *
         * Cada boca se calla a sí misma antes de empezar, y con cuatro en el
         * juego eso no basta: la que corta se calla a sí misma —que no
         * estaba diciendo nada— y la anterior sigue sonando. Ver `Hablar`.
         */
        return () => this.callarLoGrabado();
      }
    }
    /*
     * **Sin grabación —o sin audio para tocarla—: habla el suplente del
     * navegador, y la plaza se suelta cuando termina él, no antes.**
     *
     * Se soltaba en el acto, con este motivo escrito: «si no, la boca se
     * queda esperando a una frase que nunca sonó». El motivo vale cuando
     * de verdad no suena nada y es falso cuando sí suena: el suplente se pone
     * a hablar **fuera del turno**, y lo siguiente le entra por encima.
     *
     * Y eso es lo que se oía, porque las frases que no están grabadas son
     * las de inglés: «la voz inglesa corta la española, eso lo hace
     * siempre».
     *
     *     Otro avión: «Echo Charlie Sierra November November, viendo en
     *                  col…»
     *     Torre:      «Echo Charlie Sierra November November… cleared to
     *                  land»
     *
     * Así que se espera a que calle. No sabe avisar —la interfaz de un
     * instructor no tiene aviso de fin— pero sí sabe decir si está
     * hablando, así que se le pregunta. Con un tope: una voz del sistema
     * que se queda colgada no puede dejar mudo el resto del vuelo.
     */
    /*
     * **Y si el suplente no puede hablar, la plaza se suelta ya**, y en el
     * acto: la boca lo entiende como lo que es, una frase que no sonó, y no
     * deja silencio detrás ni la cuenta como oída. Ver `noHablo` en `boca.ts`.
     *
     * Esperar dos segundos a que arranque un sintetizador que no existe es
     * bloquear la boca por nada. Medido en el barrido después de quitar un
     * `BOCA.callar()` que lo estaba tapando por accidente: la torre pasó a
     * decir **una frase** en un vuelo entero en cuatro escenarios. Lo que
     * suena, suena; lo que no, no estorba.
     */
    if (!this.suplente.disponible) {
      this.sonando = false;
      alSonar?.("no-suena");
      listo(true);
      return;
    }
    this.callarLoGrabado();
    this.sonando = true;
    this.vocesUsadas.add("navegador");
    this.suplente.decir(texto, clave, urgencia);
    alSonar?.("empieza");
    // La misma espera en dos tiempos que el resto. Ver `porElSuplente`.
    this.esperarAlSuplente(() => {
      alSonar?.("acaba");
      listo();
    });
    // Y al suplente se le calla igual, que también es una voz.
    return () => {
      if (this.esperando !== null) clearTimeout(this.esperando);
      this.esperando = null;
      this.suplente.callar();
      alSonar?.("cortada");
    };
  }

  /**
   * Que hable el navegador **con turno**, como cualquier otra voz.
   *
   * ## El fallo que esto arregla, que duró tres arreglos
   *
   * Había tres caminos por los que la voz del navegador podía hablar: sin
   * receta grabada, con una pieza del pack que falta, y con el contexto de
   * audio dormido. El tercero pedía la palabra; **los otros dos hablaban al
   * instante, sin pedirla**, así que se le echaban encima a lo que estuviera
   * sonando. Y las piezas que faltan son justo las letras del indicativo, o
   * sea las de inglés.
   *
   * Contado jugando, tres veces y la última con razón y sin paciencia:
   *
   * > «Bienvenidos a Lanzarote, esa tierra negra que ven… Charlie, bravo,
   * > zulú.» · «La voz inglesa corta la española, eso lo hace siempre.» · «El
   * > que habla en inglés habla dos veces, es como si saliera inglés, español,
   * > inglés, con el charlie, papa, hotel interrumpiéndose.»
   *
   * Esa última descripción es exacta y es la que lo localizó: no era una voz
   * cortando a otra, eran **dos frases sonando a la vez** y sus trozos
   * alternándose.
   *
   * ## Y por qué no se arregla con dos canales de audio
   *
   * Se propuso, y la respuesta es que no: **una radio es un solo canal**. Si
   * dos hablan a la vez en una frecuencia real no se oyen los dos, se pisan.
   * Que aquí hable uno cada vez no es una limitación técnica: es la lección.
   *
   * ## La espera en dos tiempos
   *
   * Una voz del sistema tarda en arrancar —pide la lista de voces, elige y
   * enciende el sintetizador— así que primero se espera a que **empiece** y
   * solo después a que calle. Preguntar a los ciento veinte milisegundos si
   * está hablando devuelve «no» casi siempre, y con eso el turno se soltaba
   * antes de que sonara una sílaba.
   */
  private porElSuplente(
    texto: string,
    clave: string | undefined,
    urgencia: Urgencia | undefined,
    /** Con qué se piden los turnos: la frase y a quién va. Ver `turnoDe`. */
    turno: string | undefined = clave,
    relleno?: Readonly<Record<string, string>>,
    alSonar?: AlSonar,
  ): void {
    /*
     * **Y un suplente que no puede hablar no pide turno.**
     *
     * Pedir la palabra para no decir nada es lo peor de los dos mundos: la
     * frase no suena **y** bloquea la boca mientras se espera a que arranque
     * un sintetizador que no existe. Dos segundos por frase —lo que aguanta
     * `TARDA_EN_ARRANCAR`— y con tres plazas de cola y cuatro segundos de
     * caducidad, lo que viene detrás se cae.
     *
     * Medido en el barrido, que es donde saltó: en un vuelo entero de Cuatro
     * Vientos la torre **dijo una sola frase**, `clearedLand`, y ni el
     * «esperá» ni el «podés entrar» llegaron a sonar. Trece de diecisiete
     * escenarios igual.
     *
     * Y no es cosa del banco. En el banco no hay voces porque el navegador va
     * sin pantalla, pero en una tablet paraguaya sin el paquete de voz en
     * castellano pasa exactamente lo mismo, y ahí se lleva por delante media
     * lección. Lo que suena, suena; lo que no, no estorba.
     */
    if (!this.suplente.disponible) {
      /*
       * Y se apunta con las mismas reglas que si sonara: sin esto, el
       * historial contaba repeticiones que con voz nunca habrían pasado. Ver
       * `anotarSinVoz` en `audio/boca.ts`.
       */
      if (!this.boca.anotarSinVoz(urgencia ?? "normal", turno)) {
        alSonar?.("se-cae", "repetida");
        return;
      }
      this.ultima = clave ?? texto;
      this.apuntar();
      alSonar?.("no-suena");
      return;
    }
    this.boca.pedir(
      urgencia ?? "normal",
      (listo) => this.hablarYa(texto, clave, urgencia, relleno, alSonar, listo),
      turno,
      { alCaer: alSonar ? (porque) => alSonar("se-cae", porque) : undefined },
    );
  }

  /** Espera a que el suplente empiece y después a que calle. Ver arriba. */
  private esperarAlSuplente(listo: () => void): void {
    let paraEmpezar = Math.ceil(TARDA_EN_ARRANCAR / MIRAR_SI_CALLO);
    let quedan = Math.ceil(HASTA_QUE_CALLE / MIRAR_SI_CALLO);
    let empezo = false;
    const mirar = (): void => {
      if (!empezo) {
        if (this.suplente.hablando) empezo = true;
        else if (paraEmpezar-- > 0) {
          this.esperando = setTimeout(mirar, MIRAR_SI_CALLO);
          return;
        }
      }
      if (empezo && this.suplente.hablando && quedan-- > 0) {
        this.esperando = setTimeout(mirar, MIRAR_SI_CALLO);
        return;
      }
      this.esperando = null;
      this.sonando = false;
      listo();
    };
    this.esperando = setTimeout(mirar, MIRAR_SI_CALLO);
  }

  /** El reloj que espera a que calle el suplente, si hay uno en marcha. */
  private esperando: ReturnType<typeof setTimeout> | null = null;

  callar(): void {
    if (this.esperando !== null) clearTimeout(this.esperando);
    this.esperando = null;
    this.callarLoGrabado();
    this.suplente.callar();
  }

  /** Apunta lo último en el historial, sin dejarlo crecer sin fin. */
  private apuntar(): void {
    if (!import.meta.env.DEV) return;
    this.historial.push(this.ultima);
    /*
     * **Y el tope da para un vuelo entero, que es lo que se mide.**
     *
     * Estaba en cuatrocientas y un vuelo pasa de dos mil quinientas frases, así
     * que lo que se decía en el despegue **se caía por el otro extremo** antes
     * de que nadie lo mirara. El banco daba «no canta V1» con aviones que sí la
     * cantan, y se fue media tarde persiguiendo un fallo que no existía: la
     * regla de medir se estaba comiendo la prueba.
     */
    if (this.historial.length > 5000) this.historial.shift();
  }

  private callarLoGrabado(): void {
    const cortar = this.cortar;
    this.cortar = null;
    this.sonando = false;
    // Lo que acaba porque se le calla, acaba cortado: ver `AlSonar`.
    this.cortando = true;
    try {
      cortar?.();
    } finally {
      this.cortando = false;
    }
  }

  /** Si lo que acaba ahora acaba porque se le calla. Ver `callarLoGrabado`. */
  private cortando = false;

  /** Lo último que se pidió decir. Sirve para no repetirse. */
  get loUltimo(): string {
    return this.ultima;
  }

  /**
   * **Y todo lo que se le fue pidiendo**, para los bancos de pruebas.
   *
   * Preguntar «lo último» fotograma a fotograma no sirve para saber si algo se
   * dijo: los bancos corren el reloj a doce, así que una carrera de despegue
   * entera cabe en dos o tres fotogramas y entre V1 y Vr no hay ninguno. El
   * banco daba «no canta V1» con aviones que sí la cantan, y daba cosas
   * distintas en cada tirada según dónde cayera el muestreo.
   *
   * Es una lista y no un contador porque lo que se comprueba es **qué** se
   * dijo y en qué orden. Con tope, que un vuelo son cientos de frases y esto
   * vive en memoria mientras dure la partida.
   */
  readonly historial: string[] = [];

  /**
   * Baja el pack y lo deja listo. Se llama después del primer gesto.
   *
   * Devuelve cuántas piezas quedaron cargadas, que es cero cuando no hay pack
   * —que es el caso hoy y hasta que existan las grabaciones—. **No lanza
   * nunca**: quedarse sin grabaciones es el estado normal de este juego desde
   * el primer día, y el vuelo tiene que seguir igual.
   */
  async cargar(
    /**
     * Qué voces se bajan. **Las cuatro**, y no solo el instructor.
     *
     * Se bajaba una y el juego tiene cuatro encargos distintos —ver
     * `docs/voces/LEEME.md`—: el instructor que habla al chico, los cantos de
     * cabina en inglés aeronáutico, la torre y el otro avión de la radio. De
     * las ciento veintiuna frases que hay que grabar, **treinta y tres no eran
     * del instructor**, así que se habrían grabado, horneado y publicado para
     * no sonar nunca. Un pack que se baja a medias no avisa: cada frase que
     * falta cae al navegador una por una y parece que el sistema va lento.
     */
    voces: readonly string[] = [
      "instructor",
      "cabina",
      "torre",
      // Y la torre de Canarias, que es otra persona y otras palabras: en las
      // islas no se vosea. Sus claves son `torre.canario.*` y por eso no se
      // pisan con las de arriba. Ver `i18n/habla.ts`.
      "torre-canarias",
      "otro",
      // Y la megafonía de cabina, que solo suena en los aviones con pasaje.
      // Ver `audio/megafonia.ts`.
      "comandante",
      // Y la tripulación de cabina, con el habla de cada sitio como la torre:
      // `tripulacion.canario.*` no se pisa con la de casa.
      "tripulacion",
      "tripulacion-canarias",
    ],
    base = BASE,
    puede: (mime: string) => string = miraSiPuede,
  ): Promise<number> {
    const b = this.banco;
    // Una vez: el primer gesto y el arranque con gesto ya hecho llaman los dos.
    if (b.estado === "manifiestos" || b.estado === "bajando" || b.estado === "listo")
      return b.piezas.size;
    const formato = elegirFormato(puede);
    if (!formato) {
      b.estado = "sin-pack";
      return 0;
    }
    b.estado = "manifiestos";
    b.formato = formato;
    b.base = base;
    /*
     * **Primero todos los manifiestos, y apuntados en cuanto llegan.**
     *
     * Se bajaba voz a voz —manifiesto y todas sus piezas, y luego la
     * siguiente—, y el manifiesto se apuntaba al final, con este motivo:
     * «puesto antes, las primeras frases del vuelo se resolverían como
     * grabado con el pack a medio bajar y se caerían una a una al suplente».
     * Era verdad entonces, y el precio era el crosscheck de Jazlyn: la
     * comandante es la sexta voz, y hasta que bajaban las cinco de delante
     * —quinientas piezas de la instructora la primera— su frase del puesto no
     * tenía grabación y se le pasaba a la voz del navegador, muda en Brave
     * para Linux. Ahora lo que no está bajado espera —ver `estaLista`— y pide
     * sus piezas por delante, así que conviene saber cuanto antes qué hay.
     */
    const manifiestos = await Promise.all(
      voces.map(async (voz) => {
        try {
          // El manifiesto siempre de la red. Ver `traer`.
          const crudo = await traer(`${base}/${voz}/manifiesto.json`, false);
          if (!crudo) return null;
          return leerManifiesto(JSON.parse(new TextDecoder().decode(crudo)));
        } catch {
          // Una voz que no está no puede llevarse por delante a las otras.
          return null;
        }
      }),
    );
    for (const m of manifiestos) if (m) b.manifiestos.push(m);
    b.estado = "bajando";
    /*
     * **Y las piezas, de fondo y de seis en seis**, en el orden de las voces.
     * Lo que se necesita ya no espera a este turno: se pide aparte, por
     * `estaLista`. Ver `DE_FONDO`.
     */
    const todas: [Manifiesto, string][] = [];
    for (const m of b.manifiestos) for (const p of loQueHaceFalta(m)) todas.push([m, p]);
    let siguiente = 0;
    const deFondo = async (): Promise<void> => {
      while (siguiente < todas.length) {
        const [m, p] = todas[siguiente++]!;
        await this.traerPieza(m, p);
      }
    };
    await Promise.all(Array.from({ length: DE_FONDO }, deFondo));
    b.estado = "listo";
    return b.piezas.size;
  }

  /**
   * **Trae una pieza**, una sola vez aunque la pidan dos: la que baja de fondo
   * y la que pide una frase que la necesita ya comparten la misma petición.
   */
  private traerPieza(manifiesto: Manifiesto, pieza: string): Promise<void> {
    const b = this.banco;
    // Con la voz delante: cuatro packs distintos pueden traer una pieza que
    // se llame igual —«uno», «pista»— y la de la torre no es la del
    // instructor.
    const cual = `${manifiesto.voz}/${pieza}`;
    if (b.piezas.has(cual) || !b.formato) return Promise.resolve();
    const ya = b.pidiendo.get(cual);
    if (ya) return ya;
    const formato = b.formato;
    const base = b.base ?? BASE;
    const trae = (async () => {
      /*
       * **Con lo que dura en la dirección**, que hace de huella.
       *
       * Los ficheros del pack no llevan huella en el nombre, y la caché los
       * sirve por nombre: una frase regrabada con el mismo nombre —pasó con
       * la de la reserva, que dejó de decir «buscá» y pasó a decir «seguí la
       * flecha»— se seguía oyendo vieja para siempre en toda tablet que ya
       * la tuviera, con el manifiesto nuevo al lado. Una toma nueva casi
       * nunca dura lo mismo que la vieja, y la duración viene en el
       * manifiesto, que se pide siempre de la red.
       */
      /*
       * Y con la huella de la toma si la trae, que la duración sola no
       * basta: sale redondeada a la trama del Opus y dos tomas distintas
       * pueden medir lo mismo. Ver `Pieza.h`.
       */
      const { ms = 0, h } = manifiesto.piezas[pieza] ?? {};
      const bytes = await traer(
        `${ficheroDe(pieza, formato, manifiesto.voz, base)}?ms=${ms}${h ? `&h=${h}` : ""}`,
      );
      if (!bytes) return;
      const buffer = await this.altavoz.decodificar(bytes);
      if (buffer) b.piezas.set(cual, buffer);
    })()
      .catch(() => undefined)
      .finally(() => b.pidiendo.delete(cual));
    b.pidiendo.set(cual, trae);
    return trae;
  }
}

/** Qué dice el navegador que puede tocar. */
function miraSiPuede(mime: string): string {
  try {
    return document.createElement("audio").canPlayType(mime) ?? "";
  } catch {
    return "";
  }
}

/**
 * Trae un fichero, de la caché si está y de la red si no.
 *
 * La Cache API es la que hace que las veinte tablets de un aula bajen el pack
 * **una vez**: la primera sesión lo trae de la red y lo guarda, y todas las
 * demás lo sacan de ahí sin tocar la red. Va en su propia caché y no en la del
 * juego a propósito — el pack no entra en la precarga del service worker, que
 * es lo que hace que la primera carga del juego siga siendo pequeña.
 */
async function traer(
  ruta: string,
  /**
   * Si se puede servir de la caché.
   *
   * El **manifiesto no**, y es la diferencia entre un pack que se puede
   * rehornear y uno que no. Los ficheros del pack no llevan huella en el
   * nombre, así que una segunda tanda de grabaciones se guarda con los mismos
   * nombres que la primera: con el manifiesto cacheado, el juego seguiría
   * viendo el de la primera y no se enteraría de que hay versión nueva
   * **nunca**. Pidiéndolo siempre de la red se descubre el cambio; si no hay
   * red, se cae a lo guardado, que es mejor que quedarse mudo.
   */
  deLaCache = true,
): Promise<ArrayBuffer | null> {
  try {
    const almacen = await globalThis.caches?.open(CACHE);
    const guardado = deLaCache ? await almacen?.match(ruta) : undefined;
    if (guardado) return await guardado.arrayBuffer();
    const respuesta = await fetch(ruta).catch(() => null);
    if (!respuesta?.ok) {
      // Sin red: lo guardado, si hay algo. Ver `deLaCache`.
      const respaldo = deLaCache
        ? null
        : await globalThis.caches?.open(RESPALDO);
      const viejo = await respaldo?.match(ruta);
      return viejo ? await viejo.arrayBuffer() : null;
    }
    /*
     * Se guarda un clon y se devuelve el original: un `Response` se lee una
     * sola vez, y guardar el que ya se leyó guarda un cuerpo vacío.
     *
     * **Y lo que no se sirve de la caché tampoco se guarda en ella.** Guardar
     * el manifiesto lo dejaría ahí para la próxima —no para servirlo, porque
     * se pide siempre, pero sí para el respaldo sin red—; el problema es que
     * entonces `deLaCache = false` no significaría nada en el siguiente
     * arranque, porque el respaldo se lee antes que la red cuando la red
     * falla. Se guarda aparte, con otra clave, para no confundir las dos
     * cosas. Ver `RESPALDO`.
     */
    if (deLaCache) await almacen?.put(ruta, respuesta.clone());
    else {
      const respaldo = await globalThis.caches?.open(RESPALDO);
      await respaldo?.put(ruta, respuesta.clone());
    }
    return await respuesta.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Con qué pide turno una frase: la frase y, si lleva matrícula, a quién va.
 *
 * La boca no deja repetir la misma frase en veinticinco segundos, y eso está
 * bien para «más despacio»; para la torre no, porque le dice lo mismo a cada
 * avión de la frecuencia y cada vez es otra orden. Con la matrícula en la
 * cuenta, «cleared for take-off» al otro avión y a vos son dos frases.
 */
export function turnoDe(
  clave: string | undefined,
  relleno?: Readonly<Record<string, string>>,
): string | undefined {
  if (!clave || !relleno) return clave;
  const quien = Object.values(relleno).join("-");
  return quien ? `${clave}@${quien}` : clave;
}
