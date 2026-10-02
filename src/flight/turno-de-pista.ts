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
  esTuPermisoDeAterrizar,
} from "../audio/torre";
import { ALTURA_DE_DECISION } from "./minimos";
import {
  laQueSeDice,
  PISTA_TUYA,
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
  paso(dt: number): string[];
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
  /** Tu altura sobre la pista, m. */
  alto(): number;
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
  /** La torre te manda al aire; `sigue` dice si la pista sigue ocupada. */
  mandarteAlAire(alto: number, sigue: () => boolean): void;
  /**
   * Si hay puesta una orden de irse al aire, sea de quien sea. Ver `paso`.
   * Sin esto se da por que no.
   */
  mandanFrustrar?(): boolean;
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
export type PorQueEsperas = "aterriza" | "despega";

/** Por qué se espera y por quién, si se sabe. Ver `porQueEsperasDe`. */
export interface EsperaPor {
  readonly porque: PorQueEsperas;
  readonly matricula: string | null;
}

/**
 * Cómo lo dice la torre, en fraseología: la orden y la información de
 * tráfico detrás, que es como se da. Ver `CLAVE_DE_TORRE` en `audio/torre.ts`.
 */
export const HOLD_SHORT_POR: Readonly<Record<PorQueEsperas, string>> = {
  aterriza: "hold short of the runway, landing traffic",
  despega: "hold short of the runway, departing traffic",
};

/**
 * Y cómo lo cuenta la instructora en los peldaños de abajo, en una línea
 * tranquila: qué se espera y a quién. Ver `vuelo.esperaQue*` en
 * `i18n/es-PY.ts`.
 */
export const EXPLICA_LA_ESPERA = {
  aterriza: "vuelo.esperaQueAterrice",
  despega: "vuelo.esperaQueDespegue",
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
  porque: "pistaOcupada" | "noEstabilizada" | "otraCabecera" | null,
  fase: string,
  enTierra: boolean,
): "aterrizar" | "volver" | "nada" {
  if (enTierra) return "nada";
  /*
   * La de la otra punta tampoco se levanta en final: se levanta yéndose, y lo
   * que toca es volver por el circuito a la buena. Ver
   * `flight/la-otra-cabecera.ts`.
   */
  if (porque === "pistaOcupada" || porque === "otraCabecera" || fase !== "final")
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

  constructor(private readonly de: AlrededorDelTurno) {
    /*
     * **Y la frecuencia le pregunta al dibujo si el que va a hablar ya está
     * donde dice**: «pista libre» fuera de la pista, «en final» en final. Ver
     * `todaviaNo` en `flight/radio.ts`.
     */
    de.radio.todaviaNo = (m, clave) =>
      de.trafico()?.todaviaNo(m, clave) ?? false;
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
    const momento: Momento = {
      ...ahora,
      esperandoLaPista: this.esperandoLaPista(ahora.fase),
      calleOcupada: this.conCalleUnica ? (USAN_LA_CALLE[ahora.fase] ?? null) : null,
    };
    const trafico = this.de.trafico();
    let alAire: Transmision | null = null;
    const alAireYa = trafico?.paso(dt) ?? [];
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
    const dice = this.de.radio.update(dt, momento) ?? alAire;
    if (dice)
      trafico?.anuncia(
        dice.de.matricula,
        dice.clave,
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
    const dichas = this.de.radio.despejarLaPista(this.numeroDos, this.conCalleUnica);
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
      return;
    }
    this.enFinal = true;
    if (!this.aterrizajeSinAutorizar) {
      /*
       * **Y a la altura de decisión, el permiso tiene que haberse oído.**
       *
       * Se daba por bueno al pedirlo, y su frase podía esperar turno: en La
       * Palma llegó con el avión en la cabecera y la máquina contando «one
       * hundred». Lo real es que en los mínimos o se tiene el permiso, oído,
       * o se va uno al aire. Si a esa altura todavía no ha empezado a sonar,
       * se retira —no se dirá tarde— y la torre te manda al aire: el permiso
       * llegó tarde porque la pista estuvo ocupada hasta el último momento, y
       * eso es lo que dice su orden. Se vuelve por el circuito y se tiene en
       * la final siguiente.
       */
      const alto = this.de.alto();
      if (
        alto < ALTURA_DE_DECISION &&
        this.de.permisoSinOir?.() &&
        !this.de.mandanFrustrar?.()
      ) {
        this.de.boca.retirar(esTuPermisoDeAterrizar);
        this.de.retirarteElPermiso?.();
        this.de.mandarteAlAire(alto, () => false);
      }
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
        this.de.mandarteAlAire(alto, todaviaNoEsTuya);
      }
      return;
    }
    this.despejeSinDecir = null;
    this.aterrizajeSinAutorizar = false;
    this.de.autorizarte();
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
  }
}
