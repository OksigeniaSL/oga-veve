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

import type { Urgencia } from "../audio/boca";
import { daLaPistaAOtro, esDeLaFrecuencia, esDeLaLampara } from "../audio/torre";
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
}

/** Lo que se le pide al tráfico dibujado. Ver `world/trafico.ts`. */
export interface DibujoDelTurno {
  anuncia(matricula: string, clave: string, puedeAterrizar?: boolean): void;
  paso(dt: number): string[];
  todaviaNo(matricula: string, clave: string): boolean;
  enFinal(matricula: string): number | null;
}

/** Con quién se turna la pista, y cómo se dice lo que hay que decir. */
export interface AlrededorDelTurno {
  readonly radio: Frecuencia;
  readonly boca: BocaDelTurno;
  /** El tráfico dibujado del campo de ahora, si lo hay: cambia con el campo. */
  trafico(): DibujoDelTurno | null;
  /** Si la lección tiene torre. */
  torre(): boolean;
  /** Si el campo montado es privado: ni torre ni frecuencia. */
  privado(): boolean;
  /** Metros de tu avión al umbral de aterrizar del campo de ahora. */
  alUmbral(): number;
  /** Tu altura sobre la pista, m. */
  alto(): number;
  /**
   * La torre le dice a otro lo que le quita la pista. Devuelve con qué clave
   * espera turno en la boca —ver `turnoDe`—, o `null` si no se pudo montar.
   */
  decirAOtro(dice: Transmision): string | null;
  /** Tu «cleared to land». */
  autorizarte(): void;
  /** La torre te manda al aire; `sigue` dice si la pista sigue ocupada. */
  mandarteAlAire(alto: number, sigue: () => boolean): void;
}

/**
 * **Por qué se espera en el punto de espera**, si es por alguien: uno que
 * viene a aterrizar —autorizado, o cantando final— o uno alineado en la pista
 * esperando su despegue.
 */
export type PorQueEsperas = "aterriza" | "despega";

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

/** Si esta frase, en la boca, es la instructora explicando la espera. */
function explicaLaEspera(clave: string | undefined): boolean {
  return !!clave && /^vuelo\.esperaQue(?:Aterrice|Despegue)(?:~\d+)?$/.test(clave);
}

/**
 * Lo que la torre te dice al levantarte la orden de irte al aire.
 *
 * - `aterrizar`: sigues en final. La verde a un avión en vuelo es «puede
 *   aterrizar», y se dice.
 * - `volver`: **subiendo en la frustrada o ya en el circuito.** Una torre de
 *   verdad no autoriza a aterrizar a quien se está yendo al aire: le deja
 *   volver por el circuito, y la autorización llega en la final nueva, que es
 *   donde se da siempre. Ver `pedirAterrizaje`.
 * - `nada`: en tierra. Se aterrizó con la orden puesta; ya no describe nada, y
 *   ni «podés entrar» ni «cleared for take-off» —que es lo que dice la verde
 *   en tierra— tienen nada que ver con eso.
 *
 * La de la pista ocupada es siempre `volver` en el aire: se levanta al subir o
 * al alejarse —ver `mirarSiMandanFrustrar`—, o sea yéndose. Se oía la torre
 * decir «podés aterrizar» y «cleared to land» en pleno ascenso de la
 * frustrada, en cuanto el de delante dejaba la pista.
 */
export function alLevantarLaOrden(
  porque: "pistaOcupada" | "noEstabilizada" | null,
  fase: string,
  enTierra: boolean,
): "aterrizar" | "volver" | "nada" {
  if (enTierra) return "nada";
  if (porque === "pistaOcupada" || fase !== "final") return "volver";
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

  /**
   * **Si la pista la ocupa otro**: alineado en ella, autorizado a aterrizar o
   * cantando final. Es lo que mira la lámpara del punto de espera: la torre te
   * deja en la roja y aterriza el que viene. Ver `pistaDeOtros` en
   * `flight/vuelo.ts`.
   */
  get pistaDeOtros(): boolean {
    return this.conTorre && this.de.radio.pistaOcupada;
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
    if (!this.conTorre) return null;
    const ocupan = this.de.radio.ocupanLaPista;
    if (
      ocupan.some(
        (o) => o.orden === "torre.clearedLand" || o.orden === "otro.final",
      )
    )
      return "aterriza";
    if (ocupan.some((o) => o.orden === "torre.lineUpWait")) return "despega";
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
    };
    const trafico = this.de.trafico();
    let alAire: Transmision | null = null;
    for (const m of trafico?.paso(dt) ?? [])
      alAire = this.de.radio.seFueAlAire(m, momento) ?? alAire;
    const dice = this.de.radio.update(dt, momento) ?? alAire;
    if (dice)
      trafico?.anuncia(
        dice.de.matricula,
        dice.clave,
        this.de.radio.puedeAterrizar(dice.de.matricula),
      );
    return dice;
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
    this.numeroDos =
      fase === "final" && this.de.torre() ? this.quienVaDelante() : null;
    const dichas = this.de.radio.despejarLaPista(this.numeroDos);
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
      this.aterrizajeSinAutorizar = false;
      this.numeroDos = null;
      return;
    }
    if (!this.aterrizajeSinAutorizar) return;
    if (this.numeroDos && this.de.radio.laTiene(this.numeroDos)) {
      const alto = this.de.alto();
      if (alto < ALTURA_DE_DECISION) {
        const delante = this.numeroDos;
        this.aterrizajeSinAutorizar = false;
        this.de.mandarteAlAire(alto, () => this.de.radio.laTiene(delante));
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
    if (this.despejeSinDecir && this.de.boca.espera(this.despejeSinDecir))
      return;
    this.despejeSinDecir = null;
    this.aterrizajeSinAutorizar = false;
    this.de.autorizarte();
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
    this.de.boca.retirar(esDeLaFrecuencia);
    this.de.radio.reiniciar(aerodromo);
    this.numeroDos = null;
    this.despejeSinDecir = null;
  }
}
