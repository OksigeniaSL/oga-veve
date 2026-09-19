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

import type { Instructor } from "./instructor";
import type { Urgencia } from "./boca";
import { BOCA, Boca } from "./boca";
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
  ): (() => void) | null;
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
}

/** Una bolsa vacía. Cada juego crea la suya y se la pasa a sus cuatro bocas. */
export function nuevoBancoDeVoces(): BancoDeVoces {
  return { manifiestos: [], piezas: new Map() };
}

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
  // «Subí», del aviso de terreno y de la senda.
  "vuelo.terrenoSube",
  "palabra.subi",
  // Y la de sacar el tren, que se pidió por su nombre: «el tren si hay que
  // quitarlo, se dice y ya está, no hace falta pegar un grito».
  "vuelo.sacaElTren",
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
  ) {
    this.altavoz = altavoz;
    this.suplente = suplente;
    this.boca = boca;
    this.banco = banco;
  }

  /** Si hay alguien que pueda hablar: el grabado o el suplente. */
  get disponible(): boolean {
    return this.banco.piezas.size > 0 || this.suplente.disponible;
  }

  get hablando(): boolean {
    return this.sonando || this.suplente.hablando;
  }

  /** Cuántas piezas hay cargadas. Lo mira el banco de pruebas. */
  get cuantasPiezas(): number {
    return this.banco.piezas.size;
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

  decir(
    texto: string,
    clave?: string,
    urgencia?: Urgencia,
    relleno?: Readonly<Record<string, string>>,
  ): void {
    const suena = this.quienLaDice(clave ?? null, relleno);
    if (!suena) {
      /*
       * Sin receta grabada, la dice el navegador — **pidiendo la palabra**.
       *
       * Ver `porElSuplente`, que cuenta por qué este camino no puede saltarse
       * el turno.
       */
      this.porElSuplente(texto, clave, urgencia);
      return;
    }
    const cadena: AudioBuffer[] = [];
    for (const pieza of suena.piezas) {
      const buffer = this.banco.piezas.get(`${suena.voz}/${pieza}`);
      /*
       * Una pieza que el manifiesto promete y no está cargada deja la frase
       * coja. Media frase es peor que ninguna: la dice el navegador entera —
       * **y también pidiendo la palabra**. Ver `porElSuplente`.
       */
      if (!buffer) {
        this.porElSuplente(texto, clave, urgencia);
        return;
      }
      cadena.push(buffer);
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
    this.boca.pedir(
      urgencia ?? "normal",
      (listo) => {
        this.suplente.callar();
        this.callarLoGrabado();
        this.ultima = clave ?? texto;
        this.apuntar();
        this.sonando = true;
        this.cortar = this.altavoz.encadenarVoz(
          cadena,
          () => {
            this.sonando = false;
            this.cortar = null;
            listo();
          },
          this.porRadio,
        );
        if (this.cortar) {
          /*
           * **Y se le dice a la boca cómo callarnos.**
           *
           * Cada boca se calla a sí misma antes de empezar, y con cuatro en el
           * juego eso no basta: la que corta se calla a sí misma —que no
           * estaba diciendo nada— y la anterior sigue sonando. Ver `Hablar`.
           */
          return () => this.callarLoGrabado();
        }
        /*
         * **No hay grabación: habla el suplente del navegador, y la plaza se
         * suelta cuando termina él, no antes.**
         *
         * Se soltaba en el acto, con este motivo escrito: «si no, la boca se
         * queda esperando a una frase que nunca sonó». El motivo vale cuando
         * de verdad no suena nada —el contexto de audio dormido— y es falso
         * cuando sí suena: el suplente se pone a hablar **fuera del turno**, y
         * lo siguiente le entra por encima.
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
        this.sonando = true;
        this.suplente.decir(texto, clave, urgencia);
        // La misma espera en dos tiempos que el resto. Ver `porElSuplente`.
        this.esperarAlSuplente(listo);
        // Y al suplente se le calla igual, que también es una voz.
        return () => {
          if (this.esperando !== null) clearTimeout(this.esperando);
          this.esperando = null;
          this.suplente.callar();
        };
      },
      clave,
    );
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
  ): void {
    this.boca.pedir(
      urgencia ?? "normal",
      (listo) => {
        this.callarLoGrabado();
        this.ultima = clave ?? texto;
        this.apuntar();
        this.sonando = true;
        this.suplente.decir(texto, clave, urgencia);
        this.esperarAlSuplente(listo);
        return () => {
          if (this.esperando !== null) clearTimeout(this.esperando);
          this.esperando = null;
          this.suplente.callar();
        };
      },
      clave,
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
    cortar?.();
  }

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
    ],
    base = BASE,
    puede: (mime: string) => string = miraSiPuede,
  ): Promise<number> {
    const formato = elegirFormato(puede);
    if (!formato) return 0;
    for (const voz of voces) {
      try {
        // El manifiesto siempre de la red. Ver `traer`.
        const crudo = await traer(`${base}/${voz}/manifiesto.json`, false);
        if (!crudo) continue;
        const manifiesto = leerManifiesto(
          JSON.parse(new TextDecoder().decode(crudo)),
        );
        if (!manifiesto) continue;
        await this.cargarPiezas(manifiesto, formato, base);
        /*
         * El manifiesto se apunta **al final**, cuando ya hay piezas: puesto
         * antes, las primeras frases del vuelo se resolverían como «grabado»
         * con el pack a medio bajar y se caerían una a una al suplente.
         * Funciona igual, pero el instructor cambiaría de voz a mitad del
         * rodaje.
         */
        this.banco.manifiestos.push(manifiesto);
      } catch {
        // Una voz que no está no puede llevarse por delante a las otras tres.
      }
    }
    return this.banco.piezas.size;
  }

  private async cargarPiezas(
    manifiesto: Manifiesto,
    formato: Formato,
    base: string,
  ): Promise<void> {
    const falta = loQueHaceFalta(manifiesto);
    await Promise.all(
      falta.map(async (pieza) => {
        const bytes = await traer(
          ficheroDe(pieza, formato, manifiesto.voz, base),
        );
        if (!bytes) return;
        const buffer = await this.altavoz.decodificar(bytes);
        // Con la voz delante: cuatro packs distintos pueden traer una pieza
        // que se llame igual —«uno», «pista»— y la de la torre no es la del
        // instructor.
        if (buffer) this.banco.piezas.set(`${manifiesto.voz}/${pieza}`, buffer);
      }),
    );
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
