/**
 * **La conversación de una escena del modo inicio**: quién dice qué, en qué
 * orden y cuándo acabó cada frase.
 *
 * Vivía dentro de `Inicio`, la escena del despegue, y salió de ahí cuando
 * llegó la segunda —aterrizar, ver `inicio-aterrizar.ts`—: las dos hablan
 * igual, con las mismas reglas, y dos copias de una cola de frases son dos
 * sitios donde un día se corta a alguien y en el otro no. Las reglas son las
 * de la cabecera de `inicio.ts`:
 *
 * - **Un suceso, una voz**: una frase detrás de otra, nunca dos a la vez, con
 *   un silencio corto entre las dos. Ver `ENTRE_FRASES`.
 * - **Lo que ya no es verdad se calla**: si quien juega hace lo que se le
 *   pedía, lo que quedaba por decir sobra. Ver `callar`.
 * - **Sin voz, el rato de leerla**: la boca avisa cuánto más hay que esperar
 *   antes de la siguiente, y sin grabación ni voz del navegador es lo que se
 *   tarda en leer el subtítulo.
 * - **Y la escena no se cuelga** por una frase que nunca avisa: a su tope, se
 *   sigue. Ver `TOPE_DE_UNA_FRASE`.
 *
 * No sabe nada de pasos ni de gestos: solo de frases y de la hora de la
 * escena, que se la da quien la lleva.
 */

/**
 * Quién habla en una escena del modo inicio: Jazlyn, Ara y, en la tercera
 * —de pasaje, ver `inicio-pasaje.ts`—, la tripulación de cabina por la
 * megafonía, con la voz que ya tiene en los vuelos con pasaje.
 */
export type Quien = "mama" | "ara" | "tripulacion";

/** Una frase de la escena: quién la dice y su clave del diccionario. */
export interface Linea {
  readonly quien: Quien;
  readonly clave: string;
  /**
   * **Si se dice por la megafonía**: la comandante desde la cabina de mando,
   * o la tripulación, por el altavoz del techo. En las dos primeras escenas
   * Jazlyn va sentada al lado de Ara y no la lleva; en la de pasaje, sí.
   */
  readonly megafonia?: boolean;
  /**
   * **El texto ya montado**, si no es el del diccionario tal cual: lo que se
   * ve por la ventanilla, que lleva delante el lado y el saludo. Ver
   * `loQueSeDice` en `audio/ventanilla.ts`.
   */
  readonly texto?: string;
  /** Y las piezas de su receta en el pack. Ver `recetaDe`. */
  readonly relleno?: Readonly<Record<string, string>>;
  /**
   * **El dibujo que la acompaña**, si lo tiene: la clave de lo que sale en la
   * ventanita de cristal mientras suena. Lo decide la escena; ver
   * `ui/dibujos-del-pasaje.ts`.
   */
  readonly dibujo?: string;
}

/**
 * Por dónde habla la escena. `alAcabar` recibe cuántos segundos más hay que
 * esperar antes de la frase siguiente: cero si sonó, y el rato de leerla si no
 * sonó —sin voz, el subtítulo es lo que queda—. Y `cortada`, si la calló
 * alguien que no es la escena: no debería pasar nunca, y por eso se apunta.
 * Ver `registro`.
 */
export interface VozDelInicio {
  decir(linea: Linea, alAcabar: (esperaMas: number, cortada?: boolean) => void): void;
  callar(): void;
}

/**
 * **Cómo acabó una frase**: sonó entera; no podía sonar —sin grabación ni voz
 * del navegador, y entonces se esperó el rato de leerla—; la cortaron; o no
 * avisó a tiempo y la escena siguió sin ella. Ver `TOPE_DE_UNA_FRASE`.
 */
export type ComoAcabo = "sono" | "muda" | "cortada" | "tope";

/** Lo que la escena apunta de cada frase: cuándo empezó, cuándo acabó y si se cortó. */
export interface FraseDicha {
  readonly clave: string;
  /** Segundos de escena. */
  readonly desde: number;
  /** Y cuándo acabó, o `null` si todavía suena. */
  hasta: number | null;
  /**
   * Si no acabó: la calló la escena —se hizo antes lo que se pedía— o alguien
   * de fuera, que es lo que no puede pasar.
   */
  cortada: boolean;
  /**
   * **Y cómo acabó**, o `null` si todavía suena. Una que se dejó por el tope
   * puede avisar después de que sonó: entonces pasa a `sono`, que es lo que
   * de verdad pasó. Lo mira quien espera a que algo se haya oído —la
   * tripulación no entra en pista hasta oír «sentados para el despegue»—.
   */
  como: ComoAcabo | null;
}

/** Lo que se calla entre una frase y la siguiente, s: dos frases no son una. */
export const ENTRE_FRASES = 0.35;

/**
 * **Y lo más que se espera a que una frase avise de que acabó**, s. Una frase
 * espera su grabación hasta veinticinco segundos —ver `ESPERA_A_SU_VOZ`— y se
 * lee en seis como mucho; si pasado esto no ha avisado, es que la boca la tiró
 * sin decirlo —un reinicio la vacía— y la escena no se puede quedar colgada
 * esperándola.
 *
 * **Con el reloj de la voz, no con el del vuelo**: una grabación dura lo que
 * dura en el reloj de pared. Medido con el del vuelo, con el reloj del juego
 * acelerado doce veces —el de los bancos—, a los tres segundos de pared se
 * daba por perdida una frase que estaba sonando, y la siguiente se ponía a la
 * cola detrás de ella hasta caducar. Ver `pared` en el constructor.
 */
export const TOPE_DE_UNA_FRASE = 35;

export class Conversacion {
  /** Las frases que esperan, la que suena y cuándo puede sonar la siguiente. */
  private cola: Linea[] = [];
  private sonando: number | null = null;
  private puedeHablarEn = 0;
  private cuantas = 0;
  private dicha: Linea | null = null;
  /** Lo dicho, con su hora. Ver `registro`. */
  private readonly dichas: FraseDicha[] = [];
  private dichaAhora: FraseDicha | null = null;
  /** Cuándo empezó la que suena, en el reloj de la voz. Ver `TOPE_DE_UNA_FRASE`. */
  private sonandoDesdeEnPared = 0;

  constructor(
    private readonly voz: VozDelInicio,
    /** La hora de la escena, s: la lleva quien la lleva. */
    private readonly reloj: () => number,
    /**
     * **Y el reloj de la voz**, s: el de pared mientras se juega. Es el mismo
     * que el de la escena salvo con el reloj del juego acelerado, que no
     * acelera lo que se oye. Sin decir, el de la escena.
     */
    private readonly pared: () => number = reloj,
  ) {}

  /** Se pone a la cola; con `cortar`, lo que quedaba por decir se calla antes. */
  decir(lineas: readonly Linea[], cortar = false): void {
    if (cortar) this.callar();
    this.cola.push(...lineas);
  }

  /**
   * **Un rato sin decir nada**, s de escena: lo siguiente espera, aunque ya
   * esté en la cola. Mientras tanto no está callada, que es lo que hace que
   * nadie más pida turno. Lo usa la escena de pasaje para que un cambio de
   * plano caiga en el silencio y no a media frase: ver `CORTE_DE_PLANO` en
   * `inicio-pasaje.ts`.
   */
  esperar(segundos: number): void {
    this.puedeHablarEn = Math.max(this.puedeHablarEn, this.reloj() + segundos);
  }

  /** Lo que quedaba por decir ya no es verdad: fuera. */
  callar(): void {
    this.cola = [];
    if (this.sonando !== null) {
      this.sonando = null;
      this.acabarLaDicha("cortada");
      this.voz.callar();
    }
    this.puedeHablarEn = this.reloj() + ENTRE_FRASES;
  }

  /** Un paso: si se puede, suena la siguiente. */
  atender(): void {
    const ahora = this.reloj();
    if (this.sonando !== null && this.pared() - this.sonandoDesdeEnPared > TOPE_DE_UNA_FRASE) {
      this.sonando = null;
      this.acabarLaDicha("tope");
      this.puedeHablarEn = ahora;
    }
    if (this.sonando !== null || ahora < this.puedeHablarEn) return;
    const linea = this.cola.shift();
    if (!linea) return;
    const id = ++this.cuantas;
    this.sonando = id;
    this.sonandoDesdeEnPared = this.pared();
    this.dicha = linea;
    const dicha: FraseDicha = { clave: linea.clave, desde: ahora, hasta: null, cortada: false, como: null };
    this.dichaAhora = dicha;
    this.dichas.push(dicha);
    if (this.dichas.length > 200) this.dichas.shift();
    this.voz.decir(linea, (esperaMas, cortada = false) => {
      const como: ComoAcabo = cortada ? "cortada" : esperaMas > 0 ? "muda" : "sono";
      /*
       * **Y si avisa tarde, se apunta igual**: la escena ya siguió sin ella,
       * pero lo que de verdad pasó es que sonó, y hay quien lo espera.
       */
      if (this.sonando !== id) {
        if (dicha.como === "tope") dicha.como = como;
        return;
      }
      this.sonando = null;
      this.acabarLaDicha(como);
      this.puedeHablarEn = this.reloj() + ENTRE_FRASES + Math.max(0, esperaMas);
    });
  }

  private acabarLaDicha(como: ComoAcabo): void {
    const d = this.dichaAhora;
    this.dichaAhora = null;
    if (!d) return;
    d.hasta = this.reloj();
    d.cortada = como === "cortada";
    d.como = como;
  }

  /**
   * **Si esa frase ya se oyó entera**, o se esperó el rato de leerla porque
   * no podía sonar: lo que de verdad ha pasado, no lo que se pidió. Una que la
   * escena dejó por el tope no cuenta hasta que avise.
   */
  oida(clave: string): boolean {
    return this.dichas.some((d) => d.clave === clave && (d.como === "sono" || d.como === "muda"));
  }

  /** Nadie habla ni espera turno: lo dicho, dicho está. */
  get callada(): boolean {
    return this.sonando === null && this.cola.length === 0 && this.reloj() >= this.puedeHablarEn;
  }

  /** La última frase pedida: el subtítulo. */
  get ultima(): Linea | null {
    return this.dicha;
  }

  /**
   * **Lo que se ha dicho, en orden y con su hora de escena**: cuándo empezó
   * cada frase, cuándo acabó y si se cortó. Es con lo que se comprueba desde
   * fuera que una frase no pisa a la anterior y que nadie le corta una frase a
   * la escena. Ver `scripts/verificar-inicio.mjs`.
   */
  get registro(): readonly Readonly<FraseDicha>[] {
    return this.dichas.map((d) => ({ ...d }));
  }

  /**
   * **La boca se vació por su cuenta** —un reinicio la deja de cero— y lo que
   * estaba esperando turno ya no va a avisar: se vuelve a pedir, y lo demás
   * detrás, como estaba.
   */
  retomar(): void {
    if (this.sonando !== null && this.dicha) {
      this.cola.unshift(this.dicha);
      this.acabarLaDicha("cortada");
    }
    this.sonando = null;
    this.puedeHablarEn = this.reloj();
  }
}
