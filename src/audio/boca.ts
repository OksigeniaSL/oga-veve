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
}

export class Boca {
  private hablandoAhora: Urgencia | null = null;
  private enEspera: {
    hacer: Hablar;
    urgencia: Urgencia;
    desde: number;
  } | null = null;
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
  pedir(urgencia: Urgencia, hacer: Hablar): void {
    if (!this.ocupada) {
      this.arrancar(urgencia, hacer);
      return;
    }
    if (PESO[urgencia] > PESO[this.hablandoAhora!]) {
      /*
       * Más urgente: corta. El que estaba hablando no vuelve — lo suyo era
       * menos importante que esto, y repetirlo después sería contar el pasado.
       */
      this.enEspera = null;
      this.reloj.cancelar();
      this.arrancar(urgencia, hacer);
      return;
    }
    // Y si no, a esperar. Una plaza: la última manda.
    this.enEspera = { hacer, urgencia, desde: this.reloj.ahora() };
  }

  /** Se calla y se olvida de lo que esperaba. Al reiniciar el vuelo. */
  callar(): void {
    this.enEspera = null;
    this.hablandoAhora = null;
    this.cual++;
    this.reloj.cancelar();
  }

  private arrancar(urgencia: Urgencia, hacer: Hablar): void {
    this.hablandoAhora = urgencia;
    const mia = ++this.cual;
    hacer(() => {
      if (mia !== this.cual) return;
      this.acabo();
    });
  }

  private acabo(): void {
    this.hablandoAhora = null;
    const siguiente = this.enEspera;
    this.enEspera = null;
    if (!siguiente) return;
    if (this.reloj.ahora() - siguiente.desde > CADUCA) return;
    this.arrancar(siguiente.urgencia, siguiente.hacer);
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
  cancelar() {
    try {
      globalThis.speechSynthesis?.cancel();
    } catch {
      // Sin voz se juega igual.
    }
  },
});
