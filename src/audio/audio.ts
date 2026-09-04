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
  | "attention"
  | "touchdown"
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
  | "aroFallado";

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

const STORAGE_KEY = "oga-veve:volumen";

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function restoreLevel(): number {
  try {
    const saved = LEVELS.findIndex(
      (level) => level.id === localStorage.getItem(STORAGE_KEY),
    );
    if (saved >= 0) return saved;
  } catch {
    // Sin almacenamiento se arranca con el volumen normal.
  }
  return 0;
}

function persistLevel(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, LEVELS[index]!.id);
  } catch {
    // No poder recordarlo no puede romper nada.
  }
}

export class Audio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
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
    this.engineGain?.gain.setTargetAtTime(
      (controls.engineOn ? 0.1 : 0) + gas * 0.14,
      now,
      0.1,
    );
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
    this.engineGain?.gain.setTargetAtTime(
      (controls.engineOn ? 0.1 : 0) + gas * 0.14 + load * 0.03 + carga * 0.02,
      now,
      1.4,
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
    this.rollGain?.gain.setTargetAtTime(rolling * rolling * 0.2, now, 0.08);
  }

  /**
   * Motivos cortos del idioma sonoro.
   *
   * Notas de una pentatónica, no pitidos: la gramática es **subir es bien,
   * bajar es corregir**, y con eso un niño distingue acierto de error sin que
   * nadie se lo enseñe. Cuando haya arpa paraguaya grabada, estos motivos se
   * sustituyen por las mismas frases tocadas de verdad.
   */
  cue(kind: Cue): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || !this.master) return;

    const patterns: Record<Cue, number[]> = {
      success: [523.25, 783.99],
      achieved: [523.25, 659.25, 783.99, 1046.5],
      error: [440, 349.23],
      attention: [659.25, 659.25],
      touchdown: [130.81],
      aro: [880, 1174.66],
      aroFallado: [1174.66, 880],
    };

    const notes = patterns[kind];
    // Los aros van más rápidos: suenan al vuelo y no pueden entretenerse.
    const step =
      kind === "achieved"
        ? 0.11
        : kind === "aro" || kind === "aroFallado"
          ? 0.07
          : 0.14;
    notes.forEach((frequency, index) => {
      this.pluck(
        frequency,
        ctx.currentTime + index * step,
        kind === "touchdown"
          ? 0.5
          : kind === "aro" || kind === "aroFallado"
            ? 0.18
            : 0.35,
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
    compressor.connect(ctx.destination);

    const noise = this.noiseBuffer();

    // ── Motor: dos tonos y una capa de ruido de hélice ──────────────────
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.Q.value = 1.1;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter.connect(this.engineGain).connect(this.master);

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
      .connect(this.master);

    // ── Viento: cuerpo grave y silbido agudo ────────────────────────────
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(this.master);

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
    horn.connect(hornShape).connect(this.hornGain).connect(this.master);
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
      .connect(this.master);
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
  private pluck(frequency: number, at: number, duration: number): void {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.22, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    oscillator.connect(gain).connect(this.master!);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
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
