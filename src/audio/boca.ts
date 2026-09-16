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
 * Cuántas frases pueden esperar turno a la vez.
 *
 * Tres. Había **una**, y entre dos de igual peso ganaba la última: en una
 * carrera de despegue, Vr le quitaba el sitio a V1 y salía una de las dos sin
 * que se supiera cuál. Medido en el banco, el detector dispara las dos y de la
 * boca no sale ninguna.
 *
 * Tres son las que caben en el hueco que deja una frase antes de que la
 * siguiente deje de describir lo que pasa —para eso está `CADUCA`—, y bastante
 * menos de las que harían falta para que esto sonara a parrafada.
 */
const PLAZAS_DE_ESPERA = 3;

/**
 * Las frases que **se sustituyen entre sí** en vez de hacer cola.
 *
 * Una cuenta atrás no es una conversación: si todavía suena «twenty» cuando
 * toca «ten», lo que hay que oír es **ten**, no las dos. Decirlas seguidas es
 * contar el pasado, y encima tarde.
 *
 * Y eso es justo lo contrario de lo que necesitan V1 y Vr, que son **dos
 * sucesos distintos** del mismo medio minuto: perder uno es perder la mitad de
 * la lección. Con una sola plaza de espera no se podía tener las dos cosas —la
 * última ganaba siempre— y lo que se perdía era el canto. Con la cola y esta
 * lista se tienen: lo que es una cuenta se pisa, lo que es un suceso espera.
 *
 * Se reconocen por el principio de la clave, que es lo que tienen en común: son
 * la misma cuenta dicha en distintos números.
 */
const MISMA_CUENTA: readonly string[] = ["cabina.", "altura."];

/** A qué cuenta pertenece esta clave, si pertenece a alguna. */
function laCuentaDe(clave: string | undefined): string | null {
  if (!clave) return null;
  // Los cantos del despegue son sucesos, no cuenta: cada uno se dice una vez.
  if (clave === "cabina.v1" || clave === "cabina.vr") return null;
  return MISMA_CUENTA.find((c) => clave.startsWith(c)) ?? null;
}

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
  /**
   * Lo que espera turno. **Tres plazas, no una.**
   *
   * Había una sola, y entre dos de igual peso ganaba la última. En una carrera
   * de despegue eso se traduce en algo muy concreto: V1 llega, se pone a
   * esperar, y un segundo después **Vr le quita el sitio**. Sale una de las dos
   * y nunca se sabe cuál. Medido en el banco: el detector dispara los dos
   * —`v1:true vr:true`— y de la boca no sale ninguno.
   *
   * Y esas dos no son charla: son cantos atados a un instante. «Ya no puedo
   * parar y todavía no vuelo» son los dos segundos que ese peldaño existe para
   * enseñar, y perder uno es perder la mitad de la lección. Se oyó jugando: «al
   * despegar no me avisa del V1 ni VR ni nada».
   *
   * Tres y no más, y cada una con su caducidad: la regla de no pisarse no se
   * toca, lo que se quita es **tirar** lo que no cabe. Una frase que esperó
   * demasiado se cae sola —ver `CADUCA`—, que es lo que impide que esto se
   * convierta en una parrafada a destiempo.
   */
  private readonly cola: {
    hacer: Hablar;
    urgencia: Urgencia;
    desde: number;
    clave?: string;
  }[] = [];
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
        this.encolar({ hacer, urgencia, desde: ahora, clave });
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
      // Lo urgente corta y **vacía la cola**: lo que esperaba era menos
      // importante que esto y ya no describe lo que está pasando.
      this.cola.length = 0;
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
    this.encolar({ hacer, urgencia, desde: ahora, clave });
  }

  /**
   * Mete una frase en la cola de espera, por peso y sin pasar de tres.
   *
   * Cuando no cabe se cae **la menos importante**, y entre iguales la más
   * vieja: la que más cerca está de dejar de describir lo que pasa.
   */
  private encolar(esta: (typeof this.cola)[number]): void {
    /*
     * Y lo que es la misma cuenta no hace cola: la sustituye. Ver
     * `MISMA_CUENTA`.
     */
    const cuenta = laCuentaDe(esta.clave);
    if (cuenta) {
      for (let i = this.cola.length - 1; i >= 0; i--) {
        if (laCuentaDe(this.cola[i]!.clave) === cuenta) this.cola.splice(i, 1);
      }
    }
    this.cola.push(esta);
    if (this.cola.length <= PLAZAS_DE_ESPERA) return;
    let peor = 0;
    for (let i = 1; i < this.cola.length; i++) {
      const a = this.cola[i]!;
      const b = this.cola[peor]!;
      if (
        PESO[a.urgencia] < PESO[b.urgencia] ||
        (PESO[a.urgencia] === PESO[b.urgencia] && a.desde < b.desde)
      )
        peor = i;
    }
    this.cola.splice(peor, 1);
  }

  /** La siguiente que toca decir, o `undefined` si no queda ninguna viva. */
  private siguienteViva(): (typeof this.cola)[number] | undefined {
    const ahora = this.reloj.ahora();
    // Lo caducado no se dice: contar el pasado es peor que callarse.
    for (let i = this.cola.length - 1; i >= 0; i--) {
      if (ahora - this.cola[i]!.desde > CADUCA) this.cola.splice(i, 1);
    }
    if (!this.cola.length) return undefined;
    let mejor = 0;
    for (let i = 1; i < this.cola.length; i++) {
      const a = this.cola[i]!;
      const b = this.cola[mejor]!;
      // Manda el peso; entre iguales, la que llegó antes: se dicen en orden.
      if (
        PESO[a.urgencia] > PESO[b.urgencia] ||
        (PESO[a.urgencia] === PESO[b.urgencia] && a.desde < b.desde)
      )
        mejor = i;
    }
    return this.cola.splice(mejor, 1)[0];
  }

  /** Suelta lo que esperaba el silencio, si sigue teniendo sentido. */
  private soltarLoQueEspera(): void {
    if (this.ocupada) return;
    const siguiente = this.siguienteViva();
    if (!siguiente) return;
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
    this.cola.length = 0;
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
    if (!this.cola.length) return;
    /*
     * Y la siguiente también respeta el silencio: encadenar dos frases sin
     * hueco era justo lo que sonaba a parrafada. Si no hay temporizador —en las
     * pruebas que no lo dan— se dice como antes, seguida.
     */
    if (this.reloj.esperar) {
      this.reloj.esperar(SILENCIO, () => this.soltarLoQueEspera());
      return;
    }
    const siguiente = this.siguienteViva();
    if (siguiente)
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
