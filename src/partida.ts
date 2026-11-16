/**
 * En qué está la partida: volando, parada por un percance o con el vuelo
 * terminado; y si el mundo está congelado, y por qué.
 *
 * ## Por qué existe
 *
 * Es la «máquina de estados de partida» de #30. Ya existía, pero sin nombre:
 * repartida en variables sueltas de `game.ts` que entre todas decían una sola
 * cosa, y que había que leer juntas para saber en qué estaba el juego. Medido
 * en el código el 16-11-2026, antes de esta pieza:
 *
 * | Variable           | La escribían                                      | La leían |
 * |--------------------|---------------------------------------------------|----------|
 * | `percance`         | `sufrirPercance` (lo pone); `resetFlight`, `empezarOtroTramo` y `colocar` de las sondas (lo quitan) | 17 sitios de `game.ts` y dos sondas |
 * | `vueloTerminado`   | `terminarElVuelo` (lo pone); `reiniciarGalones` (lo quita), que llaman los tres caminos de empezar otra vez | 9 sitios |
 * | `pausadoAdrede`    | `pausar` y `reanudar`                              | esos dos, `alternarPausa` y `quedarQuieto` |
 * | `hayPanelAbierto`  | el aviso de la concha de los paneles               | `quedarQuieto` y el parte del puesto (dos sitios) |
 * | `quieto`           | `quedarQuieto`, y solo él                          | `start` (no arranca) y `pausado`, que mira `main.ts` en tres sitios |
 * | `running`          | `start`, `stop` y `quedarQuieto`                   | `start`, para no arrancar dos veces |
 * | `flight.state.crashed` | el modelo de vuelo                             | 10 sitios; el bucle lo convierte en el percance «golpe» |
 *
 * Y las combinaciones que se dan de verdad, sacadas de las guardas que las
 * escriben:
 *
 * - **`percance` y `vueloTerminado` nunca a la vez**, salvo un hueco:
 *   `sufrirPercance` no entraba con el vuelo terminado, pero `terminarElVuelo`
 *   sí entraba con un percance puesto. Sus dos llamadas van en el bucle
 *   *después* de la salida temprana del percance, así que solo podía pasar si
 *   el percance y el final caían en el mismo paso —un atropello en la doble
 *   raya que termina la lección de rodar, por ejemplo—. No se ha visto nunca;
 *   aquí ya no puede pasar. Son tres valores, y son la `FaseDePartida`.
 * - **`quieto` era siempre `pausadoAdrede || hayPanelAbierto`**: todo el que
 *   escribía una de las dos llamaba a `quedarQuieto` justo después. Era una
 *   copia del «o» para saber cuándo cambiaba. Aquí se calcula.
 * - **Y en una pausa iban casi siempre las dos**: el menú de pausa es un panel
 *   que congela, así que al abrirlo la concha ponía `hayPanelAbierto`. La
 *   pausa adrede solo se queda sola si no hay menú que abrir.
 * - **`running` y `quieto`, nunca los dos**: `start` no arranca congelado y
 *   congelar para el bucle. Lo que sí se da es ninguno de los dos —antes de
 *   arrancar, o con la ventana sin mirar—, y eso no es estado de la partida
 *   sino del bucle de pintar: por eso `running` se queda en `game.ts`.
 * - **La congelación va por encima de las tres fases**: hay pausa con el
 *   percance en pantalla —y su cuenta atrás espera, porque la agenda va con
 *   el reloj del juego— y paneles abiertos con el vuelo terminado.
 *
 * Por eso son dos cosas y no una: **la fase**, que es de qué va el vuelo, y
 * **la congelación**, que es si el reloj corre. Una pausa como cuarta fase
 * tendría que acordarse de a cuál volver, y eso es justo lo que ya dicen los
 * dos motivos sin acordarse de nada.
 *
 * ## Lo que no es
 *
 * Un enum con `enter`, `update` y `exit`, nada más (#30): sin ECS, sin
 * contenedores inmutables y sin historia. Lo que hace cada fase al entrar o
 * en cada paso lo pone `Game`, que es quien tiene el avión, la pantalla y la
 * voz; aquí solo se decide **a qué fase se puede pasar desde cuál**, que es lo
 * que antes vivía en tres guardas de tres métodos distintos.
 */
import type { Percance } from "./flight/percance";

/** De qué va el vuelo ahora mismo. */
export type FaseDePartida =
  /** Se vuela, se rueda o se está en el puesto: lo normal. */
  | "volando"
  /** Algo salió mal y el intento se acabó: el avión no se mueve. Ver `flight/percance.ts`. */
  | "percance"
  /** Se apagó en el puesto, o se acabó la lección: el final con lo ganado. */
  | "terminado";

/** Quién ha parado el reloj. Ver `congelarPor`. */
export type MotivoParaCongelar =
  /** El menú de pausa, pedido adrede o al irse de la pestaña. */
  | "pausa"
  /** Un panel que congela —el cuaderno, los ajustes, el menú de pausa—. Ver `ui/panel.ts`. */
  | "panel";

/** Lo que pasa al entrar en una fase, en cada paso dentro de ella y al salir. */
export interface Tramo {
  enter?(): void;
  update?(dt: number): void;
  exit?(): void;
}

/**
 * **A qué fase se puede pasar desde cada una.**
 *
 * Un percance no cabe en un vuelo terminado: lo que había que hacer ya se
 * hizo, y romper el avión después sería quitarle el final a quien lo ganó. Y
 * un vuelo roto tampoco termina con la manga de lo ganado. De las dos se sale
 * igual, empezando otra vez.
 */
const SE_PASA_A: Readonly<Record<FaseDePartida, readonly FaseDePartida[]>> = {
  volando: ["percance", "terminado"],
  percance: ["volando"],
  terminado: ["volando"],
};

/**
 * **Si en esa fase el avión sigue moviéndose.** Con un percance, no: no es
 * física —el modelo de vuelo no sabe que el avión está «roto»— sino la regla
 * del juego. Con el vuelo terminado sí, que se puede seguir mirando y rodando.
 */
const EL_AVION_SE_MUEVE: Readonly<Record<FaseDePartida, boolean>> = {
  volando: true,
  percance: false,
  terminado: true,
};

export class Partida {
  private faseDeAhora: FaseDePartida = "volando";
  private elPercance: Percance | null = null;
  private readonly motivos = new Set<MotivoParaCongelar>();

  /**
   * `fases`, lo que hace `Game` en cada una; `congelacion`, lo que hace al
   * parar el reloj (`enter`) y al soltarlo (`exit`).
   */
  constructor(
    private readonly fases: Readonly<Partial<Record<FaseDePartida, Tramo>>> = {},
    private readonly congelacion: Tramo = {},
  ) {}

  get fase(): FaseDePartida {
    return this.faseDeAhora;
  }

  /** El percance que ha parado este vuelo, o `null` si no lo ha parado ninguno. */
  get percance(): Percance | null {
    return this.elPercance;
  }

  /** Si el reloj del juego está parado, lo haya parado quien lo haya parado. */
  get congelada(): boolean {
    return this.motivos.size > 0;
  }

  congeladaPor(motivo: MotivoParaCongelar): boolean {
    return this.motivos.has(motivo);
  }

  /** Algo salió mal. Devuelve si entró: con un percance ya puesto o el vuelo terminado, no. */
  sufrir(tipo: Percance): boolean {
    return this.ir("percance", tipo);
  }

  /** Se acabó el vuelo. Devuelve si entró: solo se termina volando. */
  terminar(): boolean {
    return this.ir("terminado", null);
  }

  /**
   * Otra vez a volar, desde un percance o desde el final. Volando ya, no hace
   * nada: es lo que piden los reinicios, que no miran de dónde vienen.
   */
  volverAVolar(): boolean {
    return this.ir("volando", null);
  }

  /** Un paso de la fase de ahora. Devuelve si en este paso el avión se mueve. */
  update(dt: number): boolean {
    this.fases[this.faseDeAhora]?.update?.(dt);
    return EL_AVION_SE_MUEVE[this.faseDeAhora];
  }

  /**
   * Pone o quita un motivo para parar el reloj. Si con eso cambia que esté
   * parado, corre el `enter` o el `exit` de la congelación —y solo entonces:
   * abrir un panel con la pausa puesta no congela dos veces—. El motivo se
   * apunta **antes**, para que quien vuelva a preguntar desde dentro ya lo vea.
   */
  congelarPor(motivo: MotivoParaCongelar, si: boolean): void {
    const antes = this.congelada;
    if (si) this.motivos.add(motivo);
    else this.motivos.delete(motivo);
    if (this.congelada === antes) return;
    if (this.congelada) this.congelacion.enter?.();
    else this.congelacion.exit?.();
  }

  private ir(a: FaseDePartida, percance: Percance | null): boolean {
    if (!SE_PASA_A[this.faseDeAhora].includes(a)) return false;
    this.fases[this.faseDeAhora]?.exit?.();
    this.faseDeAhora = a;
    this.elPercance = percance;
    this.fases[a]?.enter?.();
    return true;
  }
}
