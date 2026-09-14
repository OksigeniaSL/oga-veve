/**
 * Quién tiene la palabra.
 *
 * En este juego hablan dos: el instructor —`audio/instructor.ts`— y los
 * cantos de cabina —`audio/voz.ts`—. Los dos usan el mismo `speechSynthesis`
 * del navegador y **los dos llamaban a `cancel()` antes de abrir la boca**, así
 * que cualquier frase cortaba a la anterior por la mitad, viniera de donde
 * viniera y dijera lo que dijera.
 *
 * Lo dijo quien lo juega: «a veces se mezcla “¡Subí!” con “Vas muy bajo”, o en
 * V1 te avisa y enseguida dice lo siguiente y el audio se medio corta para dar
 * paso al otro». Las dos cosas son la misma: V1 y rotar son dos cantos
 * separados por un segundo, y el segundo se llevaba por delante al primero.
 *
 * ## La regla
 *
 * Una sola, y es la de cualquiera que sepa hablar con alguien:
 *
 * - **Si no hay nadie hablando**, se habla.
 * - **Si lo que llega es más urgente**, corta. Un aviso de terreno interrumpe
 *   lo que haga falta: para eso es un aviso de terreno.
 * - **Si no lo es, espera su turno.** Una plaza y nada más: si mientras espera
 *   llega otra, la nueva sustituye a la que aguardaba, porque lo último que ha
 *   pasado es lo que hay que contar.
 *
 * ## La cadencia: ni repetirse, ni atropellarse, ni contradecirse
 *
 * Lo de arriba impide que dos voces suenen a la vez, y no basta. Jugando:
 *
 * > «Cada vez que pulso P para cambiar de modelo: "Arrancá…", "Arrancá…",
 * > "Arrancá el motor", eso suena raro, con una vez que lo diga, bien. Lo mismo
 * > "Seguí la raya verde", "seguí la raya verde", "seguí la raya verde"… debe
 * > tener menos repeticiones. Lo mismo al aterrizar, era una locura: "Salí de
 * > la pista, viene otro", "Más despacio", "Salí de la pista, viene otro", "Más
 * > despacio"… O salgo de la pista o me doy prisa para salir.»
 *
 * Tres reglas más, y las tres son de conversación y no de sonido:
 *
 * - **Ni repetirse.** Una frase no se vuelve a decir hasta que pase su tiempo:
 *   `NO_REPETIR`. Antes eran diez segundos y se medían **por texto y por
 *   hablante**, así que cambiar de aeronave —que rehace el estado del vuelo—
 *   volvía a soltar «arrancá el motor» cada vez.
 * - **Ni atropellarse.** Entre una frase y la siguiente hay un silencio
 *   —`SILENCIO`—, porque dos frases pegadas no se entienden como dos cosas: se
 *   entienden como una parrafada. Lo urgente no espera, que para eso es urgente.
 * - **Ni contradecirse.** Hay pares que no pueden ir seguidos porque dicen lo
 *   contrario: si acaba de sonar «salí de la pista, que viene otro», «más
 *   despacio» no se dice. Ver `RIÑEN`.
 *
 * ## Y lo que espera demasiado no se dice
 *
 * `CADUCA` son cuatro segundos. Un aviso de vuelo habla del avión **ahora**, y
 * cuatro segundos después el avión está en otro sitio: «vas bajo para la
 * pista» dicho cuando ya has corregido no es tarde, es mentira. Una cola que
 * lo suelta todo es peor que cortar.
 *
 * ## Esto no sabe hablar
 *
 * No construye frases ni elige voces: recibe una función que habla y la llama
 * cuando toca. Es lo que permite que el instructor siga eligiendo su acento y
 * su timbre y los cantos de cabina el suyo, sin que este fichero sepa que
 * existe `SpeechSynthesisUtterance`.
 */

/**
 * Cuánto manda lo que se va a decir.
 *
 * Tres escalones, y el de en medio es casi todo: los cantos de cabina, los
 * avisos de aro, las fases del vuelo.
 *
 * - `baja`: los elogios. Que te digan «bien» no puede pisar nada.
 * - `normal`: lo que enseña.
 * - `urgente`: el suelo, la pista ocupada, la frustrada. Lo que no puede
 *   esperar a que termine una frase.
 */
export type Urgencia = "baja" | "normal" | "urgente";

const PESO: Record<Urgencia, number> = { baja: 0, normal: 1, urgente: 2 };

/** Lo que espera más de esto ya no se dice. Ver la cabecera. */
export const CADUCA = 4000;

/**
 * El silencio entre una frase y la siguiente, ms.
 *
 * Ocho décimas. Es lo que separa dos frases de una parrafada, y es también lo
 * que hace que la segunda se entienda como **otra cosa** y no como el final de
 * la primera: «tirá para arriba» pegado a «muy bien, estás en el aire» no
 * suena a dos momentos del despegue, suena a un locutor leyendo.
 */
export const SILENCIO = 800;

/**
 * Cuánto tarda una frase en poder repetirse, ms.
 *
 * Veinticinco segundos. Eran diez, y diez es poco para lo que se dice mientras
 * se rueda: el trayecto del puesto a la cabecera son dos minutos, y con diez
 * segundos «seguí la raya verde» cabía doce veces.
 *
 * No vale para lo urgente —el suelo, la pista ocupada—, que se repite todas las
 * veces que haga falta mientras el peligro siga ahí.
 */
export const NO_REPETIR = 25000;

/**
 * Y cuánto dura la contradicción entre dos frases que riñen, ms.
 *
 * Diez segundos: lo que dura la situación de la que hablaban las dos.
 */
export const RIÑEN = 10000;

/**
 * Lo que habla, visto desde aquí.
 *
 * Recibe `listo` y tiene que llamarlo cuando la frase termine o se corte. Es
 * todo lo que la boca necesita saber, y por eso esto se puede probar sin
 * navegador: quien habla es una función que avisa cuando acaba.
 */
export type Hablar = (listo: () => void) => void;

/** El reloj, aparte para poder probar la caducidad sin esperar. */
export interface Reloj {
  ahora(): number;
  /** Corta lo que se esté diciendo. */
  cancelar(): void;
  /**
   * Hace algo dentro de un rato. Para el silencio entre frases.
   *
   * Va aquí y no con un `setTimeout` suelto por el mismo motivo que `ahora`:
   * así esto se prueba sin esperar ochocientos milisegundos por cada caso.
   */
  esperar?(ms: number, hacer: () => void): void;
}

/**
 * Los pares que no pueden ir seguidos porque dicen lo contrario.
 *
 * No es una lista de frases que suenan mal juntas: es una lista de **órdenes
 * incompatibles**. Si acabo de decirte que salgas de la pista porque viene
 * otro, no puedo pedirte a continuación que vayas más despacio — «o salgo de
 * la pista o me doy prisa para salir».
 *
 * Manda la primera: la que ya se dijo gana, y la otra se calla mientras dure la
 * situación. Ver `RIÑEN`.
 */
export const NO_A_LA_VEZ: readonly (readonly [string, string])[] = [
  ["vuelo.abandonando", "vuelo.despacio"],
  ["vuelo.abandonando", "vuelo.alto"],
  // Frenar y correr tampoco.
  ["vuelo.aterrizado", "vuelo.despacio"],
  // Y mandar subir de urgencia no casa con un elogio de vuelo tranquilo.
  ["vuelo.terrenoSube", "vuelo.enVuelo"],
  ["vuelo.mandanFrustrar", "vuelo.final"],
];

/** Con quién riñe esta clave, si riñe con alguien. */
function riñenCon(clave: string): readonly string[] {
  const otras: string[] = [];
  for (const [a, b] of NO_A_LA_VEZ) {
    if (a === clave) otras.push(b);
    if (b === clave) otras.push(a);
  }
  return otras;
}

export class Boca {
  private hablandoAhora: Urgencia | null = null;
  private enEspera: {
    hacer: Hablar;
    urgencia: Urgencia;
    desde: number;
    clave?: string;
  } | null = null;
  /** Cuándo se dijo cada cosa por última vez. Ver `NO_REPETIR` y `RIÑEN`. */
  private readonly dichas = new Map<string, number>();
  /** Hasta cuándo hay que callar para no atropellar la frase anterior. */
  private calladaHasta = 0;
  /**
   * Qué frase es la que está sonando.
   *
   * Hace falta porque `listo` puede llegar tarde —de una frase que ya se
   * cortó— y atenderlo entonces arrancaría la siguiente encima de la que está
   * hablando. Un número que sube es todo lo que hace falta para distinguirlas.
   */
  private cual = 0;

  constructor(private readonly reloj: Reloj) {}

  /** ¿Hay alguien hablando ahora mismo? */
  get ocupada(): boolean {
    return this.hablandoAhora !== null;
  }

  /**
   * Pide la palabra. `hacer` es lo que habla, y se llama cuando le toque.
   *
   * Puede no llamarse nunca: si llega otra cosa mientras espera, o si pasa
   * demasiado tiempo. Es lo correcto — ver la cabecera.
   */
  pedir(urgencia: Urgencia, hacer: Hablar, clave?: string): void {
    const ahora = this.reloj.ahora();
    const urgente = urgencia === "urgente";

    /*
     * **Ni repetirse ni contradecirse**, y las dos comprobaciones van antes de
     * mirar si hay alguien hablando: una frase que no toca decir no toca
     * decirla ni aunque haya silencio. Ver la cabecera.
     */
    if (clave && !urgente) {
      const dicha = this.dichas.get(clave);
      if (dicha !== undefined && ahora - dicha < NO_REPETIR) return;
      for (const otra of riñenCon(clave)) {
        const cuando = this.dichas.get(otra);
        if (cuando !== undefined && ahora - cuando < RIÑEN) return;
      }
    }

    if (!this.ocupada) {
      /*
       * **Y el silencio entre frases.** Si la anterior acaba de terminar, esta
       * espera su hueco en vez de pegarse a ella. Lo urgente no espera.
       */
      const falta = this.calladaHasta - ahora;
      if (!urgente && falta > 0 && this.reloj.esperar) {
        this.enEspera = { hacer, urgencia, desde: ahora, clave };
        this.reloj.esperar(falta, () => this.soltarLoQueEspera());
        return;
      }
      this.arrancar(urgencia, hacer, clave);
      return;
    }
    if (PESO[urgencia] > PESO[this.hablandoAhora!]) {
      /*
       * Más urgente: corta. El que estaba hablando no vuelve — lo suyo era
       * menos importante que esto, y repetirlo después sería contar el pasado.
       */
      this.enEspera = null;
      this.reloj.cancelar();
      this.arrancar(urgencia, hacer, clave);
      return;
    }
    /*
     * Y si no, a esperar. **Una plaza, y la gana la más importante**; entre dos
     * iguales, la última, que es lo que está pasando ahora.
     *
     * Era siempre la última sin mirar nada más, y con eso una charla de la
     * radio —«Zulu Papa Alfa Bravo Charlie, en final»— le quitaba el sitio a la
     * autorización de la torre, que es de las pocas frases que hay que oír sí o
     * sí. Medido en el banco: la torre decía dos frases en un vuelo y pasó a
     * decir una.
     */
    const esperando = this.enEspera;
    if (esperando && PESO[esperando.urgencia] > PESO[urgencia]) return;
    this.enEspera = { hacer, urgencia, desde: ahora, clave };
  }

  /** Suelta lo que esperaba el silencio, si sigue teniendo sentido. */
  private soltarLoQueEspera(): void {
    const siguiente = this.enEspera;
    if (!siguiente || this.ocupada) return;
    this.enEspera = null;
    if (this.reloj.ahora() - siguiente.desde > CADUCA) return;
    this.arrancar(siguiente.urgencia, siguiente.hacer, siguiente.clave);
  }

  /**
   * Se calla y se olvida de lo que esperaba. Al reiniciar el vuelo.
   *
   * **Y no olvida lo que ya dijo**: eso es memoria de la conversación, no de la
   * frase que estaba sonando. Borrarla aquí era la mitad del «arrancá,
   * arrancá, arrancá» — cambiar de aeronave llama a `callar` y con ello se
   * perdía la cuenta de lo que se acababa de decir. Para olvidarlo del todo
   * está `empezarDeCero`, que es lo que llama un vuelo nuevo.
   */
  callar(): void {
    this.enEspera = null;
    this.hablandoAhora = null;
    this.cual++;
    this.reloj.cancelar();
  }

  /** Vuelo nuevo: se olvida hasta lo que ya había dicho. */
  empezarDeCero(): void {
    this.callar();
    this.dichas.clear();
    this.calladaHasta = 0;
  }

  private arrancar(urgencia: Urgencia, hacer: Hablar, clave?: string): void {
    this.hablandoAhora = urgencia;
    if (clave) this.dichas.set(clave, this.reloj.ahora());
    const mia = ++this.cual;
    hacer(() => {
      if (mia !== this.cual) return;
      this.acabo();
    });
  }

  private acabo(): void {
    this.hablandoAhora = null;
    this.calladaHasta = this.reloj.ahora() + SILENCIO;
    const siguiente = this.enEspera;
    this.enEspera = null;
    if (!siguiente) return;
    if (this.reloj.ahora() - siguiente.desde > CADUCA) return;
    /*
     * Y la siguiente también respeta el silencio: encadenar dos frases sin
     * hueco era justo lo que sonaba a parrafada. Si no hay temporizador —en las
     * pruebas que no lo dan— se dice como antes, seguida.
     */
    if (siguiente.urgencia !== "urgente" && this.reloj.esperar) {
      this.enEspera = siguiente;
      this.reloj.esperar(SILENCIO, () => this.soltarLoQueEspera());
      return;
    }
    this.arrancar(siguiente.urgencia, siguiente.hacer, siguiente.clave);
  }
}

/**
 * La boca del navegador: una sola para todo el juego.
 *
 * Una y no dos, y ese es el punto entero: `speechSynthesis` es un recurso
 * único del navegador, así que dos módulos hablando por su cuenta se pisan
 * siempre, por mucho cuidado que ponga cada uno por separado.
 */
export const BOCA = new Boca({
  ahora: () => Date.now(),
  esperar: (ms, hacer) => void setTimeout(hacer, ms),
  cancelar() {
    try {
      globalThis.speechSynthesis?.cancel();
    } catch {
      // Sin voz se juega igual.
    }
  },
});
