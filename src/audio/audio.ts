/**
 * Sonido del juego, sintetizado entero.
 *
 * No hay ni un fichero de audio: todo sale de osciladores, ruido generado en
 * memoria y filtros de la Web Audio API. Eso son **cero bytes en el paquete**
 * —que importa cuando el juego tiene que abrir en la conexión de un colegio—
 * y cero licencias que auditar, que es la regla 6 de AGENTS.md. Cuando haya
 * presupuesto para grabar un motor de verdad y encargar la música, esto
 * seguirá siendo el plan B y el modo de bajo consumo.
 *
 * Tres ideas gobiernan el diseño:
 *
 * 1. **El motor enseña física antes de que nadie la explique.** El tono sube
 *    con el gas, y en la pérdida el viento late a diez hercios *antes* de que
 *    el HUD diga nada. Se aprende de oído.
 * 2. **El audio nunca es el único canal.** Habrá veinte tablets en un aula y
 *    la mitad en silencio. Criterio de aceptación: el juego entero, en mudo,
 *    jugado por alguien que no sabe leer, sin perder información.
 * 3. **Nada suena hasta que alguien toca algo.** Los navegadores no dejan
 *    sonar sin gesto previo, y una pantalla de «activa el sonido» es fea. El
 *    contexto nace dormido y despierta con la primera tecla o el primer dedo,
 *    que en este juego llegan de todos modos.
 */

import type { ControlInputs, FlightState } from "../flight/model";
import type { AircraftSound } from "../flight/aircraft";
import { leerTexto, ponerTexto } from "../datos/guardado";
import {
  Agachado,
  BUSES,
  TARDA_EN_BAJAR,
  TARDA_EN_SUBIR,
  nivelesAhora,
  type Bus,
} from "./mezcla";

/**
 * Régimen de ralentí y máximo, en revoluciones por minuto.
 *
 * La frecuencia de encendido que sale de aquí —entre 23 y 90 Hz— está por
 * debajo o al filo de lo que reproduce el altavoz de un portátil o de una
 * tablet, que no baja de unos 200 Hz. Un motor de pistón se oye en un
 * altavoz pequeño **por sus armónicos**, no por su fundamental, y la primera
 * versión los cortaba con un paso bajo a 320 Hz: el motor sonaba correcto en
 * unos cascos y era inaudible en cualquier otro sitio. El filtro va ahora
 * entre 900 y 4100 Hz, que es donde el oído lo encuentra.
 */
const DEFAULT_ENGINE: AircraftSound = {
  engine: "piston",
  cylinders: 4,
  idleRpm: 700,
  maxRpm: 2700,
  growlHz: 300,
  growlRise: 320,
};
/** Velocidad indicada, en m/s, a la que el viento llega a su tope. */
const WIND_REFERENCE = 75;
/** Frecuencia del bataneo de pérdida, en hercios. */
const BUFFET_HZ = 10.5;

/** Motivos cortos del idioma sonoro. Ver `cue`. */
export type Cue =
  | "success"
  | "achieved"
  | "error"
  /**
   * **Atención**: esto no salió bien, o hay algo que hacer ahora.
   *
   * El veredicto de una toma rápida, la orden de frenar. Informa, no manda:
   * lo que manda es `peligro`, y son cosas distintas. Llegó a significar seis
   * cosas a la vez y de ahí salieron `peligro`, `perdida` y `mision`.
   */
  | "attention"
  | "touchdown"
  /** Los dos momentos del despegue: la decisión y la acción. Ver `cue`. */
  | "v1"
  | "rotar"
  /**
   * Un aro de la senda, cruzado por dentro. Dos notas que suben.
   *
   * Va aparte de `success` porque **un aro no es un logro**: pasa muchas veces
   * seguidas en una aproximación, y el sonido de haber conseguido algo repetido
   * ocho veces deja de significar nada. Este es más corto y más agudo: un
   * «tic» de que vas por el sitio.
   */
  | "aro"
  /**
   * Y un aro que se ha perdido. Dos notas que bajan.
   *
   * **No suena a error.** Perder un aro no es un fallo, es información: te
   * dice que eso de ahí contaba y se te escapó. Suena distinto y ya está — la
   * misma pareja de notas del bueno, en orden inverso, que es lo que hace que
   * se reconozcan como las dos caras de la misma cosa.
   */
  | "aroFallado"
  /**
   * **Peligro**: terreno, un edificio delante, entrar en pista sin permiso.
   *
   * Iba con `attention`, y `attention` significaba a la vez pérdida, misión
   * empezada, vas bajo sobre el terreno, frená y te has colado en la pista.
   * Siete motivos para dieciocho eventos: para quien depende del sonido como
   * segundo canal, que la alarma de pérdida suene igual que «has empezado una
   * misión» no es una imprecisión, es dejarle sin el canal.
   *
   * Tres notas rápidas y bajando, repetidas. Es el único motivo del juego que
   * interrumpe: los demás informan, este manda.
   */
  | "peligro"
  /**
   * **Pérdida**: el ala ha dejado de volar.
   *
   * Un avión de verdad lleva para esto una bocina o una chicharra, no una
   * melodía: un tono fijo que no se parece a nada más de la cabina y que no
   * hay que interpretar. Aquí es lo mismo — dos notas iguales, secas y
   * repetidas—, y por eso no comparte motivo con ningún otro aviso.
   */
  | "perdida"
  /**
   * **Empieza una misión.** No es un aviso: es que arranca algo.
   *
   * Sonaba con el mismo motivo que la alarma de pérdida. Sube, porque lo que
   * viene después es volar.
   */
  | "mision"
  /*
   * ## Y los cuatro de la concha, que son de otra naturaleza
   *
   * Los doce de arriba cuentan algo que pasó en el vuelo. Estos cuatro no
   * cuentan nada: **acusan recibo**. Suenan porque alguien tocó, y lo único
   * que dicen es «te he oído». Por eso son más cortos, más agudos y pegan
   * menos de la mitad que los demás: si un menú suena tan fuerte como una
   * alarma de pérdida, el idioma sonoro del juego deja de tener graves.
   *
   * Es lo que pide #70 —«sonido al abrir, al moverse por las opciones y al
   * confirmar»— y lo que le da a esto aire de consola y no de formulario.
   */
  /** Se abre un panel: dos notas subiendo, deprisa. */
  | "abrir"
  /** Y se cierra: las mismas dos al revés. El gesto de vuelta. */
  | "cerrar"
  /**
   * El foco pasa de un mando al siguiente.
   *
   * Una sola nota, la más corta y la más floja de todas. Suena una vez por
   * cada tecla que se pulsa recorriendo un panel, así que cualquier cosa con
   * cuerpo se volvería un martilleo.
   */
  | "mover"
  /** Se elige algo. Sube, que en este juego es «hecho». */
  | "elegir";

/**
 * Un motivo: qué notas, a qué ritmo y con cuánto cuerpo.
 *
 * Estaba repartido entre una tabla de notas y **dos ternarios anidados** —uno
 * para el paso y otro para la duración— con las excepciones escritas por
 * nombre. Añadir un motivo eran tres sitios y era fácil dejarse el tercero;
 * añadir los cuatro de la concha habría dejado ternarios de ocho ramas.
 * Ahora cada motivo es una fila.
 */
export interface Motivo {
  /** Las notas, en hercios y en orden. */
  readonly notas: readonly number[];
  /** Cuánto se tarda de una nota a la siguiente, en segundos. */
  readonly paso: number;
  /** Cuánto dura cada nota. */
  readonly dura: number;
  /** Cuánto pega, de 0 a 1. Por omisión, `FUERZA`. */
  readonly fuerza?: number;
  /** Si manda agacharse a todo lo demás. Solo las alarmas y los avisos. */
  readonly manda?: boolean;
}

/** Los dos buses que suenan solos, sin que nadie toque nada. */
const EL_MUNDO: readonly Bus[] = ["motor", "ambiente"];

/** Lo que pega una nota si nadie dice otra cosa. */
export const FUERZA = 0.22;
/**
 * Y lo que pega la concha, que es menos de la mitad.
 *
 * Un menú que suena tan fuerte como una alarma de pérdida no es sonido de
 * consola: es ruido. Acusar recibo se hace por debajo de lo que se cuenta.
 */
export const FUERZA_DE_CONCHA = 0.1;

/**
 * Los motivos, uno por fila.
 *
 * Notas de una pentatónica, no pitidos: la gramática es **subir es bien,
 * bajar es corregir**, y con eso un niño distingue acierto de error sin que
 * nadie se lo enseñe. Cuando haya arpa paraguaya grabada, estos motivos se
 * sustituyen por las mismas frases tocadas de verdad.
 */
export const MOTIVOS: Record<Cue, Motivo> = {
  success: { notas: [523.25, 783.99], paso: 0.14, dura: 0.35 },
  achieved: {
    notas: [523.25, 659.25, 783.99, 1046.5],
    paso: 0.11,
    dura: 0.35,
  },
  error: { notas: [440, 349.23], paso: 0.14, dura: 0.35 },
  attention: { notas: [659.25, 659.25], paso: 0.14, dura: 0.35, manda: true },
  touchdown: { notas: [130.81], paso: 0.14, dura: 0.5 },
  /*
   * **V1 es una nota sola y grave, y Vr son dos que suben.**
   *
   * No es adorno: son los dos momentos del despegue y son de naturaleza
   * distinta. V1 es una **decisión** que ya está tomada —a partir de ahí se
   * vuela pase lo que pase—, así que suena una vez, abajo, y se acabó. Vr es
   * una **acción** que toca hacer ahora, así que sube, que en la gramática de
   * este juego es «hacé algo». Entre las dos pasan unos segundos, y esos
   * segundos son la lección: ya no puedo parar y todavía no vuelo.
   */
  v1: { notas: [392], paso: 0.14, dura: 0.35 },
  rotar: { notas: [587.33, 880], paso: 0.14, dura: 0.35 },
  /*
   * **Y los dos aros no se distinguen solo por el orden.**
   *
   * Eran las mismas dos notas al derecho y al revés, 0,25 s en total, con el
   * motor debajo: separar el contorno de dos notas tan cortas exige atención
   * dirigida, y quien juega está mirando la pista. Ahora son dos gestos
   * distintos: el bueno sube en tres saltos y el perdido son dos notas más
   * graves, más largas y hacia abajo. Sigue sin ser un castigo —el timbre de
   * `error` no se toca— pero ya no hay que adivinarlo. Y van más rápidos que
   * los demás: suenan al vuelo y no pueden entretenerse.
   */
  aro: { notas: [659.25, 880, 1174.66], paso: 0.07, dura: 0.18 },
  aroFallado: { notas: [440, 349.23], paso: 0.16, dura: 0.3 },
  /*
   * El peligro y la pérdida van más rápidos que nada: lo que distingue una
   * alarma de un aviso es el ritmo, antes que la altura de las notas.
   */
  peligro: {
    notas: [880, 698.46, 587.33, 880, 698.46, 587.33],
    paso: 0.09,
    dura: 0.16,
    manda: true,
  },
  perdida: {
    notas: [622.25, 622.25, 622.25],
    paso: 0.09,
    dura: 0.16,
    manda: true,
  },
  mision: { notas: [523.25, 659.25, 880], paso: 0.14, dura: 0.35 },

  // ── La concha ────────────────────────────────────────────────────────
  abrir: {
    notas: [659.25, 987.77],
    paso: 0.05,
    dura: 0.18,
    fuerza: FUERZA_DE_CONCHA,
  },
  cerrar: {
    notas: [987.77, 659.25],
    paso: 0.05,
    dura: 0.14,
    fuerza: FUERZA_DE_CONCHA,
  },
  mover: {
    notas: [1318.51],
    paso: 0.05,
    dura: 0.05,
    fuerza: FUERZA_DE_CONCHA * 0.7,
  },
  elegir: {
    notas: [880, 1318.51],
    paso: 0.045,
    dura: 0.16,
    fuerza: FUERZA_DE_CONCHA,
  },
};

export interface AudioLevel {
  id: "normal" | "bajo" | "mudo";
  gain: number;
  /** Glifo para el botón: se lee sin saber leer. */
  glyph: string;
}

const LEVELS: readonly AudioLevel[] = [
  { id: "normal", gain: 0.85, glyph: "🔊" },
  { id: "bajo", gain: 0.3, glyph: "🔉" },
  { id: "mudo", gain: 0, glyph: "🔇" },
];

const STORAGE_KEY = "volumen";

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function restoreLevel(): number {
  try {
    const saved = LEVELS.findIndex(
      (level) => level.id === leerTexto(STORAGE_KEY),
    );
    if (saved >= 0) return saved;
  } catch {
    // Sin almacenamiento se arranca con el volumen normal.
  }
  return 0;
}

function persistLevel(index: number): void {
  try {
    ponerTexto(STORAGE_KEY, LEVELS[index]!.id);
  } catch {
    // No poder recordarlo no puede romper nada.
  }
}

export class Audio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  /**
   * Los seis buses de mezcla, entre las fuentes y el maestro.
   *
   * Antes las veinte fuentes iban todas al maestro con su ganancia a mano, y
   * la única defensa era el compresor del final — que no distingue lo que hay
   * que entender de lo que hay que sentir. Ver `audio/mezcla.ts`.
   */
  private buses: Record<Bus, GainNode> | null = null;
  /** Cuánta gente está hablando ahora mismo. Manda el ducking. */
  private readonly hablando = new Agachado();
  /**
   * Si el mundo está callado porque hay algo abierto encima del vuelo.
   *
   * No es lo mismo que suspender el contexto, que es lo que se hace cuando
   * nadie mira la pestaña. Con un panel abierto el vuelo está congelado —ver
   * `Game.quedarQuieto`— y el motor no puede seguir rugiendo, pero **la concha
   * sí tiene que sonar**: es justo entonces cuando alguien está recorriendo
   * opciones. Callar el contexto entero dejaba el menú mudo.
   */
  private mundoCallado = false;
  /**
   * Volumen en tres pasos, no un deslizador.
   *
   * Un deslizador exige precisión con el dedo y no dice de un vistazo dónde
   * está. Tres estados —normal, bajo, mudo— se recorren pulsando y se leen
   * en el icono. El aula necesita el paso «bajo» tanto como el mudo: veinte
   * tablets a medio volumen son un aula; a volumen normal, un aviario.
   */
  private levelIndex = 0;
  /** Ficha sonora de la aeronave que se está volando. */
  private engineSpec: AircraftSound = DEFAULT_ENGINE;

  // Motor
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineTone: OscillatorNode | null = null;
  private growl: BiquadFilterNode | null = null;
  private engineHarmonic: OscillatorNode | null = null;
  private propGain: GainNode | null = null;
  private propFilter: BiquadFilterNode | null = null;

  // Viento
  private windBody: BiquadFilterNode | null = null;
  private windWhistle: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private buffetGain: GainNode | null = null;
  private buffetOscillator: OscillatorNode | null = null;

  /** Rodadura: solo con ruedas en el suelo. */
  private rollGain: GainNode | null = null;

  /**
   * Bocina de pérdida.
   *
   * Es el único aviso sonoro que lleva de verdad una avioneta de escuela: una
   * lengüeta en el borde de ataque que sopla cuando el ángulo de ataque se
   * acerca al crítico, y suena **antes** de la pérdida, no durante. Todo lo
   * demás que se oye en los vídeos de aterrizajes —los cantos de altura, el
   * «retard», el TCAS, el EGPWS— es equipo de avión de línea y aquí sería
   * mentira. Ver el issue de la escalera de comunicación.
   */
  private hornGain: GainNode | null = null;
  private hornPulse: OscillatorNode | null = null;

  get available(): boolean {
    return this.context !== null;
  }

  get level(): AudioLevel {
    return LEVELS[this.levelIndex]!;
  }

  /**
   * Crea el contexto, dormido. Se llama al arrancar; no suena nada todavía.
   * Si el navegador no soporta Web Audio, el juego sigue funcionando mudo.
   */
  prepare(): void {
    if (this.context) return;
    try {
      this.context = new AudioContext();
    } catch {
      return;
    }
    this.build();
  }

  /** Cambia el motor al de otra aeronave. */
  setEngine(spec: AircraftSound): void {
    this.engineSpec = spec;
  }

  /** Despierta el contexto. Se llama desde el primer gesto del jugador. */
  unlock(): void {
    if (!this.context) this.prepare();
    void this.context?.resume().catch(() => undefined);
  }

  /** Pasa al siguiente paso de volumen y devuelve el que ha quedado. */
  cycleLevel(): AudioLevel {
    this.levelIndex = (this.levelIndex + 1) % LEVELS.length;
    this.applyMasterGain();
    persistLevel(this.levelIndex);
    return this.level;
  }

  /** Silencia al ocultar la pestaña y devuelve el sonido al volver. */
  setActive(active: boolean): void {
    if (!this.context) return;
    if (active) void this.context.resume().catch(() => undefined);
    else void this.context.suspend().catch(() => undefined);
  }

  /**
   * Sigue al avión. Se llama una vez por fotograma.
   *
   * Todo se mueve con `setTargetAtTime`, que interpola exponencialmente en el
   * hilo de audio: si se escribieran los valores a pelo cada fotograma se
   * oirían escalones, y a 30 fps el motor sonaría a robot.
   */
  /**
   * @param stallWarnAt ángulo de ataque, en radianes, al que empieza a sonar
   *   la bocina de pérdida
   */
  update(
    state: FlightState,
    controls: ControlInputs,
    stallWarnAt = 0.24,
    /**
     * Y por dónde se está rodando, que hasta hoy la rodadura no lo sabía.
     *
     * Sonaba igual rodar por el asfalto de una pista que por un campo. Es la
     * mitad sonora de lo mismo que ya cambió en la física: el suelo tiene
     * tipo. Ver `world/superficie.ts`.
     */
    traqueteo = 1,
  ): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;

    // ── Motor ───────────────────────────────────────────────────────────
    // El régimen sigue al gas pero con inercia: un motor de pistón no sube
    // de vueltas instantáneamente, y esa demora es la mitad de su carácter.
    const spec = this.engineSpec;
    // Apagado, las vueltas caen a cero y con ellas todo lo demás. La bajada
    // no es instantánea porque una hélice tiene inercia: sigue girando un
    // rato, cada vez más despacio, y ese sonido es el que marca el final de
    // un vuelo.
    const gas = controls.engineOn ? controls.throttle : 0;
    const rpm = controls.engineOn
      ? spec.idleRpm + gas * (spec.maxRpm - spec.idleRpm)
      : 0;
    // Frecuencia de encendido de un cuatro tiempos: vueltas por segundo, por
    // cilindros, entre dos. Un radial de siete suena a otra cosa que un
    // cuatro cilindros porque este número es otro, no por magia.
    const firing = (rpm / 60) * (spec.cylinders / 2);

    /*
     * **El viraje se oye.**
     *
     * En un viraje mantenido el ala tiene que sostener más peso que el del
     * avión —a cuarenta y cinco grados de alabeo, un cuarenta por ciento más—,
     * y eso es más resistencia. Con el gas quieto, un motor de hélice de paso
     * fijo pierde vueltas: la nota baja un pelo y el motor se oye trabajar. Es
     * pequeño y es de las cosas que se notan sin saber que se notan.
     *
     * Se pide sin bajar de cero por si un descenso pronunciado deja el factor
     * de carga por debajo de uno; ahí el motor no se alivia, sencillamente no
     * pasa nada.
     */
    const carga = clamp(state.loadFactor - 1, 0, 1.2);
    // Un dos por ciento a 1,4 g, que es lo que pierde de vueltas de verdad.
    const enViraje = firing * (1 - carga * 0.05);
    this.engineTone?.frequency.setTargetAtTime(enViraje, now, 0.14);
    this.engineHarmonic?.frequency.setTargetAtTime(enViraje * 2.02, now, 0.14);
    // El gas cerrado tapa el motor: respuesta inmediata al oído aunque las
    // vueltas todavía estén bajando.
    this.engineFilter?.frequency.setTargetAtTime(900 + gas * 3200, now, 0.06);

    // La resonancia sube con las vueltas. Es lo que de verdad se oye cambiar
    // en un altavoz pequeño: el fundamental está por debajo de lo que
    // reproduce, así que si el timbre no se mueve, el motor suena plano por
    // mucho que la nota suba.
    this.growl?.frequency.setTargetAtTime(
      // Y el timbre se abre un poco en el viraje: es el motor cargado.
      spec.growlHz + gas * spec.growlRise + carga * 26,
      now,
      0.12,
    );

    // Esfuerzo: el motor canta distinto trepando que en descenso, aunque el
    // gas no se toque. Es carga aerodinámica, y se oye.
    const load = clamp(state.verticalSpeed / 6, -1, 1);
    /*
     * **Una sola escritura, y con la constante rápida.**
     *
     * Esto se programaba **dos veces por fotograma**: una arriba con el gas
     * solo y constante de una décima —«respuesta inmediata al oído aunque las
     * vueltas todavía estén bajando»— y otra aquí con el esfuerzo añadido y
     * constante de segundo y medio. La segunda anulaba a la primera, así que
     * la respuesta inmediata era código muerto y el gas tardaba segundo y
     * medio en oírse: cerrar gases en corta final no sonaba a cerrar gases.
     *
     * Un nodo de ganancia tiene un valor y una constante, así que se escribe
     * una vez con el objetivo entero. Y la constante es la rápida: los
     * términos de esfuerzo —régimen de ascenso y carga en viraje— se mueven
     * despacio por sí solos, así que no pierden nada, y el gas gana lo que
     * llevaba perdido.
     */
    this.engineGain?.gain.setTargetAtTime(
      (controls.engineOn ? 0.1 : 0) + gas * 0.14 + load * 0.03 + carga * 0.02,
      now,
      0.1,
    );
    this.propGain?.gain.setTargetAtTime(
      (controls.engineOn ? 0.03 : 0) + gas * 0.075,
      now,
      1.4,
    );
    this.propFilter?.frequency.setTargetAtTime(120 + rpm * 0.08, now, 0.1);

    // ── Viento ──────────────────────────────────────────────────────────
    const speed = Math.min(1, state.airspeed / WIND_REFERENCE);
    // El viento sube con la velocidad y además con el derrape: volar de lado
    // hace más ruido, y es la única pista sonora de que el viraje va sucio.
    const slip = Math.min(1, Math.abs(state.beta) * 5);
    this.windGain?.gain.setTargetAtTime(
      speed * speed * 0.34 * (1 + slip * 0.5),
      now,
      0.12,
    );
    this.windWhistle?.frequency.setTargetAtTime(600 + speed * 1900, now, 0.12);
    this.windBody?.frequency.setTargetAtTime(420 + slip * 340, now, 0.15);

    // ── Bocina de pérdida ───────────────────────────────────────────────
    // Suena a partir del ochenta y cinco por ciento del ángulo crítico, que
    // es donde la pone un fabricante: da unos segundos para bajar el morro.
    const margin = clamp((Math.abs(state.alpha) - stallWarnAt) / 0.06, 0, 1);
    this.hornGain?.gain.setTargetAtTime(margin * 0.16, now, 0.05);

    // ── Bataneo de pérdida ──────────────────────────────────────────────
    // Late antes de que el HUD avise: el aire tiembla cuando el flujo empieza
    // a desprenderse, y eso enseña a bajar el morro sin una sola palabra.
    const buffet = state.stalled ? 0.55 : 0;
    this.buffetGain?.gain.setTargetAtTime(buffet, now, 0.08);

    // ── Rodadura ────────────────────────────────────────────────────────
    const rolling = state.onGround ? Math.min(1, state.airspeed / 32) : 0;
    // Más fuerte cuanto más blando el suelo: un campo suena a campo. Con tope,
    // que un ruido de rodadura por encima del motor deja de ser rodadura.
    this.rollGain?.gain.setTargetAtTime(
      Math.min(0.34, rolling * rolling * 0.2 * traqueteo),
      now,
      0.08,
    );
  }

  /**
   * Cómo anda el sonido por dentro. Para los bancos.
   *
   * Lo que hay que poder mirar desde fuera es que el contexto sigue **vivo**
   * con un panel abierto: si se suspendiera, `cue` no tocaría nada y la concha
   * sería muda sin que ningún banco se enterara, porque no hay nada que mirar
   * en la pantalla. Ver `callarElMundo`.
   */
  comoVa(): { contexto: string; mundoCallado: boolean } {
    return {
      contexto: this.context?.state ?? "sin contexto",
      mundoCallado: this.mundoCallado,
    };
  }

  /** Toca uno de los motivos del idioma sonoro. Están en `MOTIVOS`. */
  cue(kind: Cue): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || !this.master) return;
    const m = MOTIVOS[kind];
    /*
     * **Los que avisan van por el bus de avisos, y los demás por el de
     * interfaz.**
     *
     * No es una etiqueta: el bus de avisos manda agacharse a todo lo demás y
     * suena por encima. Un «lo conseguiste» no tiene que taparle el motor a
     * nadie; una alarma de pérdida sí, y por eso están separados.
     */
    const suBus: Bus = m.manda ? "avisos" : "interfaz";
    if (m.manda) this.agacharUnRato(m.notas.length * 0.2);
    m.notas.forEach((frecuencia, i) => {
      this.pluck(
        frecuencia,
        ctx.currentTime + i * m.paso,
        m.dura,
        suBus,
        m.fuerza ?? FUERZA,
      );
    });
  }

  // ── Construcción del grafo ────────────────────────────────────────────

  private build(): void {
    const ctx = this.context!;

    // Compresor siempre en el bus principal: altavoz de tablet más veinte
    // fuentes son picos garantizados.
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    compressor.knee.value = 12;

    this.master = ctx.createGain();
    this.levelIndex = restoreLevel();
    this.applyMasterGain();
    this.master.connect(compressor);
    /*
     * **Y un limitador detrás del compresor, que no son lo mismo.**
     *
     * El compresor de arriba pega la mezcla —sube lo bajo y baja lo alto, con
     * calma—. El limitador es la red: relación veinte a uno, ataque de tres
     * milisegundos y umbral en menos tres, para que un pico no llegue nunca
     * al altavoz de una tablet, que es donde recortar suena a rotura.
     */
    const limitador = ctx.createDynamicsCompressor();
    limitador.threshold.value = -3;
    limitador.ratio.value = 20;
    limitador.knee.value = 0;
    limitador.attack.value = 0.003;
    limitador.release.value = 0.1;
    compressor.connect(limitador);
    limitador.connect(ctx.destination);

    // Los seis buses, cada uno a su nivel. Ver `audio/mezcla.ts`.
    const niveles = nivelesAhora(false);
    this.buses = Object.fromEntries(
      BUSES.map((nombre) => {
        const bus = ctx.createGain();
        bus.gain.value = niveles[nombre];
        bus.connect(this.master!);
        return [nombre, bus];
      }),
    ) as Record<Bus, GainNode>;

    const noise = this.noiseBuffer();

    // ── Motor: dos tonos y una capa de ruido de hélice ──────────────────
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.Q.value = 1.1;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter.connect(this.engineGain).connect(this.bus("motor"));

    // Resonancia en la banda en la que el oído sitúa un motor. Sin ella, en
    // un altavoz pequeño el motor se oye como un soplido sin carácter.
    const growl = ctx.createBiquadFilter();
    growl.type = "peaking";
    growl.frequency.value = 420;
    growl.Q.value = 2.2;
    growl.gain.value = 11;
    this.growl = growl;
    this.engineFilter.disconnect();
    this.engineFilter.connect(growl).connect(this.engineGain);

    this.engineTone = ctx.createOscillator();
    this.engineTone.type = "sawtooth";
    this.engineTone.connect(this.engineFilter);
    this.engineTone.start();

    // Un segundo tono ligeramente desafinado: sin él suena a sierra y no a
    // motor. El batido entre los dos es lo que da la aspereza.
    this.engineHarmonic = ctx.createOscillator();
    this.engineHarmonic.type = "square";
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.32;
    this.engineHarmonic.connect(harmonicGain).connect(this.engineFilter);
    this.engineHarmonic.start();

    this.propFilter = ctx.createBiquadFilter();
    this.propFilter.type = "bandpass";
    this.propFilter.Q.value = 1.6;
    this.propGain = ctx.createGain();
    this.propGain.gain.value = 0;
    this.loopNoise(noise)
      .connect(this.propFilter)
      .connect(this.propGain)
      .connect(this.bus("motor"));

    // ── Viento: cuerpo grave y silbido agudo ────────────────────────────
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(this.bus("ambiente"));

    this.windBody = ctx.createBiquadFilter();
    this.windBody.type = "bandpass";
    this.windBody.frequency.value = 520;
    this.windBody.Q.value = 0.7;

    this.windWhistle = ctx.createBiquadFilter();
    this.windWhistle.type = "peaking";
    this.windWhistle.Q.value = 7;
    this.windWhistle.gain.value = 14;

    const windSource = this.loopNoise(noise);
    windSource
      .connect(this.windBody)
      .connect(this.windWhistle)
      .connect(this.windGain);

    // Bataneo: un oscilador lento que modula la ganancia del viento.
    this.buffetOscillator = ctx.createOscillator();
    this.buffetOscillator.frequency.value = BUFFET_HZ;
    this.buffetGain = ctx.createGain();
    this.buffetGain.gain.value = 0;
    this.buffetOscillator.connect(this.buffetGain).connect(this.windGain.gain);
    this.buffetOscillator.start();

    // ── Bocina de pérdida: onda cuadrada pulsada, como una lengüeta ─────
    const horn = ctx.createOscillator();
    horn.type = "square";
    horn.frequency.value = 800;
    this.hornGain = ctx.createGain();
    this.hornGain.gain.value = 0;
    const hornShape = ctx.createGain();
    hornShape.gain.value = 0;
    horn.connect(hornShape).connect(this.hornGain).connect(this.bus("avisos"));
    horn.start();

    // El pulso: una lengüeta real no da un tono limpio, tiembla.
    this.hornPulse = ctx.createOscillator();
    this.hornPulse.frequency.value = 6.5;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.5;
    this.hornPulse.connect(pulseDepth).connect(hornShape.gain);
    hornShape.gain.value = 0.5;
    this.hornPulse.start();

    // ── Rodadura ────────────────────────────────────────────────────────
    const rollFilter = ctx.createBiquadFilter();
    rollFilter.type = "lowpass";
    rollFilter.frequency.value = 260;
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    this.loopNoise(noise)
      .connect(rollFilter)
      .connect(this.rollGain)
      .connect(this.bus("ambiente"));
  }

  /** Dos segundos de ruido blanco generados en memoria. Cero bytes de red. */
  private noiseBuffer(): AudioBuffer {
    const ctx = this.context!;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private loopNoise(buffer: AudioBuffer): AudioBufferSourceNode {
    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start();
    return source;
  }

  /** Una nota corta con caída exponencial, que es lo que hace una cuerda. */
  private pluck(
    frequency: number,
    at: number,
    duration: number,
    bus: Bus = "interfaz",
    fuerza = FUERZA,
  ): void {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(fuerza, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    oscillator.connect(gain).connect(this.bus(bus));
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }

  /**
   * El bus donde enchufar una fuente.
   *
   * Antes de que existiera el grafo devuelve el maestro, que es lo que había:
   * si algo suena antes de construir la mezcla, mejor que suene mal que que
   * no suene.
   */
  private bus(cual: Bus): AudioNode {
    return this.buses?.[cual] ?? this.master!;
  }

  /**
   * Descodifica un trozo de voz grabada, o `null` si no se puede.
   *
   * Falla en silencio a propósito, y de las dos maneras que falla esto: sin
   * contexto de audio —el navegador no trae Web Audio, o nadie ha tocado la
   * pantalla todavía— y con un fichero que no se puede leer. Ninguna de las
   * dos puede romper un vuelo; lo que pasa es que habla el navegador.
   */
  async decodificar(bytes: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.context) return null;
    try {
      return await this.context.decodeAudioData(bytes);
    } catch {
      return null;
    }
  }

  /**
   * Toca una cadena de piezas de voz, una detrás de otra, por el bus de voz.
   *
   * **Se programan todas de una vez y en el reloj del audio**, no una detrás
   * de otra con temporizadores: entre una pieza y la siguiente no puede haber
   * ni un hueco ni un solape, y un `setTimeout` de un navegador ocupado llega
   * tarde con toda tranquilidad. Es exactamente lo que hace un GPS, y es lo
   * que hace que ocho trozos suenen como una frase y no como ocho trozos.
   *
   * Devuelve con qué cortarla —el instructor lo llama al callar— o `null` si
   * no hay dónde tocar.
   */
  encadenarVoz(
    piezas: readonly AudioBuffer[],
    alAcabar: () => void,
  ): (() => void) | null {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || piezas.length === 0) return null;
    const fuentes: AudioBufferSourceNode[] = [];
    let cuando = ctx.currentTime + 0.02;
    for (const pieza of piezas) {
      const fuente = ctx.createBufferSource();
      fuente.buffer = pieza;
      fuente.connect(this.bus("voz"));
      fuente.start(cuando);
      cuando += pieza.duration;
      fuentes.push(fuente);
    }
    /*
     * Y **el aviso de que ha terminado lo da la última pieza**, no un reloj de
     * fuera. La mezcla se agacha mientras habla el instructor y se levanta
     * cuando calla; si el aviso llegara por temporizador, un fotograma largo
     * dejaría el motor agachado de más, o peor, para siempre.
     */
    const ultima = fuentes[fuentes.length - 1]!;
    let avisado = false;
    const acabo = (): void => {
      if (avisado) return;
      avisado = true;
      this.acabaLaVoz();
      alAcabar();
    };
    ultima.addEventListener("ended", acabo);
    this.empiezaLaVoz();
    return () => {
      for (const f of fuentes) {
        try {
          f.stop();
        } catch {
          // Ya había acabado. Cortar lo que no suena no es un fallo.
        }
      }
      acabo();
    };
  }

  /**
   * Alguien empieza a hablar: todo lo demás se agacha.
   *
   * Lo llaman las dos voces del juego —el instructor y el otro avión— desde
   * `audio/voz.ts`, y los avisos desde aquí mismo. **La voz del navegador no
   * pasa por Web Audio**, así que el ducking no lo puede disparar el sonido:
   * lo dispara el evento. Las grabaciones sí pasan por el bus de voz, y esas
   * lo disparan con el sonido. Ver `encadenarVoz`.
   */
  empiezaLaVoz(): void {
    if (this.hablando.entra()) this.ponerNiveles();
  }

  /** Y se calla: la mezcla se levanta cuando se calla el último. */
  acabaLaVoz(): void {
    if (this.hablando.sale()) this.ponerNiveles();
  }

  /**
   * Calla el mundo —el motor y el ambiente— y deja viva la concha.
   *
   * Lo pide el vuelo congelado: ver `mundoCallado`. Los dos buses que se
   * callan son los dos que suenan **solos**, sin que nadie toque nada; los
   * demás solo suenan cuando pasa algo, y con el vuelo parado no pasa nada
   * salvo lo que hace quien está delante.
   */
  callarElMundo(callado: boolean): void {
    if (this.mundoCallado === callado) return;
    this.mundoCallado = callado;
    this.ponerNiveles();
  }

  /** Todos callados de golpe. Al reiniciar el vuelo o al poner en mudo. */
  callarLasVoces(): void {
    if (this.hablando.vaciar()) this.ponerNiveles();
  }

  /**
   * Se agacha por un rato y se levanta solo.
   *
   * Es para los avisos, que sí pasan por Web Audio pero no tienen un evento
   * de «he terminado»: se sabe cuánto duran porque los toca el propio juego.
   */
  private agacharUnRato(segundos: number): void {
    this.empiezaLaVoz();
    window.setTimeout(() => this.acabaLaVoz(), segundos * 1000);
  }

  /**
   * Pone cada bus donde le toca ahora mismo.
   *
   * Bajar deprisa y subir despacio: cincuenta milisegundos es lo que tarda en
   * no oírse el escalón, y cuatro décimas lo que tarda en no oírse la vuelta.
   * Al revés se nota, y lo que se nota distrae.
   */
  private ponerNiveles(): void {
    if (!this.buses || !this.context) return;
    const agachado = this.hablando.activo;
    const niveles = nivelesAhora(agachado);
    const ahora = this.context.currentTime;
    // `setTargetAtTime` va a un tercio de la constante por cada tramo, así
    // que la constante es el tiempo pedido entre tres.
    const constante = (agachado ? TARDA_EN_BAJAR : TARDA_EN_SUBIR) / 3;
    for (const nombre of BUSES) {
      // Y el mundo callado manda sobre el nivel que le tocaría. Ver
      // `callarElMundo`.
      const callado = this.mundoCallado && EL_MUNDO.includes(nombre);
      this.buses[nombre].gain.setTargetAtTime(
        callado ? 0 : niveles[nombre],
        ahora,
        constante,
      );
    }
  }

  private applyMasterGain(): void {
    if (!this.master || !this.context) return;
    this.master.gain.setTargetAtTime(
      this.level.gain,
      this.context.currentTime,
      0.05,
    );
  }
}
