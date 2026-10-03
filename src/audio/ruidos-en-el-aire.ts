/**
 * **Los ruidos del vuelo, sonando**: los nodos de Web Audio que convierten lo
 * que decide `ruidos.ts` en sonido.
 *
 * ## Todo sintetizado, y todo montado una vez
 *
 * Ni una muestra grabada: ruido blanco generado en memoria, filtros y unos
 * pocos osciladores, igual que el motor y el viento. Cero bytes de red y cero
 * licencias que auditar. Y los nodos se crean **una sola vez**, al montar el
 * grafo: cada fotograma solo se mueven sus perillas, y solo las que han
 * cambiado. Lo único que se crea al vuelo son los golpes sueltos —el toque, el
 * tren trabándose—, que pasan unas pocas veces por vuelo.
 *
 * ## Lo que calla no cuesta: cada capa va enchufada solo mientras suena
 *
 * Medido con el grafo renderizado sin altavoz: lo que cuesta el sonido en un
 * navegador no es la cuenta de cada filtro, que es nada, sino **el paso por
 * cada nodo** en cada bloque de audio. Y una capa a volumen cero se recorre
 * igual que una que suena. Así que cada capa se desenchufa de la salida
 * cuando lleva un rato callada —ver `Enchufe`—, y lo que no está enchufado a
 * nada que llegue al altavoz el navegador no lo procesa. Volando sin lluvia,
 * sin granizo y sin rodar, de todo esto no se procesa casi nada.
 *
 * ## Granos: cómo suena una gota sin grabar ninguna
 *
 * La lluvia hecha solo de ruido filtrado suena a estática de radio: le falta
 * lo que la hace lluvia, que son **golpes sueltos**, muchos y sin orden. Aquí
 * salen de lo mismo —ruido— pasado por un umbral: el ruido suavizado casi
 * nunca pasa de cierta altura, y cuando pasa, eso es una gota. Cuánto se le
 * sube antes del umbral decide cuántas pasan por segundo, y lo que viene
 * detrás decide a qué suenan: un tic de cristal, un tamborileo grave, o tres
 * resonancias de chapa para el granizo. Ver `gananciaDeGranos`.
 *
 * ## Juntas: un golpe que se repite con la velocidad
 *
 * El «trocotó» es un golpe corto en bucle. El bucle dura lo que se tarda en
 * llegar a la junta siguiente —cinco metros entre la velocidad— y el mismo
 * golpe, retrasado una batalla, es el tren principal pisando la junta que
 * acaba de pisar el morro. Un solo nodo de fuente y una línea de retardo.
 */

import type { Niveles, Suceso } from "./ruidos";

/** El umbral de los granos: por debajo, nada; por encima, una gota. */
export const UMBRAL_DE_GRANOS = 0.6;

/**
 * **Cuánto subir el ruido suavizado para que pasen `porSegundo` granos** por
 * el umbral.
 *
 * Es la fórmula de Rice: un ruido gaussiano cruza un nivel `u` hacia arriba
 * `ν₀·exp(−u²/2σ²)` veces por segundo. Detrás de un paso bajo de Butterworth
 * de segundo orden, `ν₀` sale igual al corte; medido con el ruido de aquí,
 * nueve décimas, porque el ruido uniforme filtrado tiene las colas algo más
 * cortas que una gaussiana. Ver `ruidos-en-el-aire.test.ts`.
 *
 * Se despeja la σ que da el ritmo pedido —por arriba y por abajo, que el
 * umbral corta los dos lados— y se divide entre la que tiene el ruido blanco
 * después del paso bajo, que deja pasar `1,11·corte` de los `fs/2` hercios de
 * banda. Lo que sale es la ganancia que hay que poner delante del umbral.
 */
export function gananciaDeGranos(
  porSegundo: number,
  corte: number,
  fs: number,
): number {
  if (!(porSegundo > 0)) return 0;
  const nu0 = 0.9 * corte;
  const cuantos = Math.min(porSegundo, 2 * nu0 * 0.9);
  const sigma = UMBRAL_DE_GRANOS / Math.sqrt(2 * Math.log((2 * nu0) / cuantos));
  // Ruido uniforme entre −1 y 1: varianza un tercio.
  const sigmaDelRuido = Math.sqrt((1 / 3) * ((1.11 * corte) / (fs / 2)));
  return sigma / sigmaDelRuido;
}

/**
 * **Lo que vale «uno» en cada capa**: la ganancia que la pone, a nivel uno, a
 * la altura a la que tiene que sonar.
 *
 * Medido, no a ojo: cada capa se ha medido sonando en el juego —valor eficaz
 * en decibelios, `scripts/verificar-sonidos.mjs`— y se ha puesto contra lo
 * que ya sonaba: el motor y el viento. Las referencias, a setenta metros por
 * segundo: la lluvia contra el parabrisas, a la altura del motor; el granizo,
 * unos seis decibelios por encima de esa lluvia; los limpias, por debajo de
 * la lluvia que barren; el viento en el pasaje, por debajo del motor; los
 * aerofrenos y los flaps, por debajo del viento.
 */
export const ESCALA = {
  gotas: 0.47,
  limpias: 0.06,
  granizo: 1,
  juntas: 8,
  patas: 0.55,
  motorDelTren: 0.05,
  reversa: 0.55,
  aerofrenos: 0.5,
  flaps: 0.12,
  apu: 0.22,
  aire: 0.28,
  chirrido: 0.35,
  golpe: 0.6,
} as const;

/** Las barridas por segundo del ciclo de limpias grabado en memoria. */
const BARRIDAS_GRABADAS = 1.25;

/** Por debajo de esto, una capa se da por callada. */
const CALLADA = 1e-4;

/**
 * **Un enchufe**: conecta una capa a su salida mientras suena y la desconecta
 * cuando lleva un rato callada.
 *
 * El rato es la cola: lo que tarda la capa en apagarse sola después de que se
 * le pida silencio. Desenchufar antes cortaría el final de un sonido; después
 * ya no queda nada que cortar.
 */
export class Enchufe {
  private puesto = false;
  private callaDesde = -1;

  constructor(
    private readonly nodo: AudioNode,
    private readonly destino: AudioNode,
    private readonly cola = 2,
  ) {}

  get enchufado(): boolean {
    return this.puesto;
  }

  seguir(suena: boolean, ahora: number): void {
    if (suena) {
      this.callaDesde = -1;
      if (!this.puesto) {
        this.nodo.connect(this.destino);
        this.puesto = true;
      }
      return;
    }
    if (!this.puesto) return;
    if (this.callaDesde < 0) this.callaDesde = ahora;
    else if (ahora - this.callaDesde > this.cola) {
      this.nodo.disconnect(this.destino);
      this.puesto = false;
      this.callaDesde = -1;
    }
  }
}

/** Un nodo con su última escritura, para no repetir lo que no cambia. */
type Perilla = { ultimo: number };

/** Lo que mide el banco: el valor eficaz de cada capa, en decibelios. */
export type Medida = Record<string, number>;

export class RuidosEnElAire {
  /**
   * **La pared**: por aquí entra todo lo que suena fuera del avión —el
   * viento, la lluvia de fuera, las patas, la reversa, la APU— para que
   * dentro se oiga como se oye a través de un fuselaje.
   */
  readonly pared: BiquadFilterNode;

  private readonly ctx: BaseAudioContext;
  private readonly salida: AudioNode;
  private readonly perillas = new Map<AudioParam, Perilla>();
  /** Las capas que se pueden medir, por nombre. Ver `medir`. */
  private readonly capas: Record<string, AudioNode> = {};
  private readonly enchufes: Record<string, Enchufe> = {};

  // La lluvia que pega donde está quien escucha.
  private readonly gotasPre: GainNode;
  private readonly gotasTic: BiquadFilterNode;
  private readonly gotasTambor: BiquadFilterNode;
  private readonly gotas: GainNode;
  // Los limpias.
  private readonly limpiasFuente: AudioBufferSourceNode;
  private readonly limpias: GainNode;
  // El granizo.
  private readonly granizoPre: GainNode;
  private readonly granizo: GainNode;
  // La rodadura.
  private readonly juntasFuente: AudioBufferSourceNode;
  private readonly juntas: GainNode;
  private readonly morro: GainNode;
  private readonly principal: GainNode;
  private readonly retardo: DelayNode;
  private readonly bachesFuente: AudioBufferSourceNode;
  private readonly baches: GainNode;
  private readonly golpeDeRueda: BiquadFilterNode;
  private readonly chasquidoDeRueda: BiquadFilterNode;
  private readonly ruedas: GainNode;
  // El tren, la reversa, los aerofrenos, los flaps.
  private readonly patas: GainNode;
  private readonly motorDelTren: GainNode;
  private readonly motorDelTrenTono: OscillatorNode;
  private readonly reversa: GainNode;
  private readonly aerofrenos: GainNode;
  private readonly flaps: GainNode;
  private readonly flapsTono: OscillatorNode;
  // La APU y el aire.
  private readonly apu: GainNode;
  private readonly apuSilbido: OscillatorNode;
  private readonly aire: GainNode;
  // Los golpes sueltos, ya hechos.
  private readonly golpeGrabado: AudioBuffer;
  private readonly chirridoGrabado: AudioBuffer;

  constructor(ctx: BaseAudioContext, ruido: AudioBuffer, salida: AudioNode) {
    this.ctx = ctx;
    this.salida = salida;

    this.pared = this.filtro("lowpass", 18000, 0.5);
    this.pared.connect(salida);

    const granos = this.curvaDeGranos();
    /*
     * Tres fuentes de ruido para todas las capas y no una por capa: cada
     * fuente es un nodo más que recorrer. Tres y no una porque la lluvia y el
     * granizo se sacan del mismo umbral, y con el mismo ruido las piedras
     * caerían a la vez que las gotas.
     */
    const ruidoDeGotas = this.bucle(ruido);
    const ruidoDeGranizo = this.bucle(ruido);
    const ruidoDelResto = this.bucle(ruido);

    // ── Las gotas: tic de cristal y tambor grave ────────────────────────
    this.gotasPre = this.ganancia(0);
    const gotasUmbral = ctx.createWaveShaper();
    gotasUmbral.curve = granos;
    ruidoDeGotas
      .connect(this.gotasPre)
      .connect(this.filtro("lowpass", 1200, Math.SQRT1_2))
      .connect(gotasUmbral);
    /*
     * Cada grano es un golpe de banda ancha; lo que lo hace gota de cristal o
     * tamborileo es dónde se le da cuerpo: un realce agudo para el tic del
     * agua contra el parabrisas, y un realce grave para el tambor que hace a
     * velocidad. Dos filtros y no dos ramas con su ganancia cada una: cada
     * nodo cuesta, y estos dos hacen lo mismo.
     */
    this.gotasTic = this.filtro("peaking", 2400, 1.4);
    this.gotasTic.gain.value = 9;
    this.gotasTambor = this.filtro("lowshelf", 420, 0.7);
    this.gotasTambor.gain.value = 0;
    this.gotas = this.ganancia(0);
    gotasUmbral.connect(this.gotasTic).connect(this.gotasTambor).connect(this.gotas);
    this.capa("gotas", this.gotas, salida, 1.5);

    // ── Los limpias: el barrido y el golpe al dar la vuelta ─────────────
    /*
     * Un ciclo entero de limpias —ida y vuelta— hecho una vez en memoria y
     * tocado en bucle: dos nodos en vez de ocho. La velocidad de la barrida
     * es la velocidad a la que se toca. Ver `hacerLimpias`.
     */
    this.limpiasFuente = ctx.createBufferSource();
    this.limpiasFuente.buffer = this.hacerLimpias();
    this.limpiasFuente.loop = true;
    this.limpias = this.ganancia(0);
    this.limpiasFuente.connect(this.limpias);
    this.limpiasFuente.start();
    this.capa("limpias", this.limpias, salida, 2.5);

    // ── El granizo: tres resonancias de chapa y un golpe grave ──────────
    this.granizoPre = this.ganancia(0);
    const granizoUmbral = ctx.createWaveShaper();
    granizoUmbral.curve = granos;
    ruidoDeGranizo
      .connect(this.granizoPre)
      .connect(this.filtro("lowpass", 600, Math.SQRT1_2))
      .connect(granizoUmbral);
    this.granizo = this.ganancia(0);
    /*
     * Lo que hace que suene a granizo y no a lluvia gorda es **la chapa**: el
     * golpe de una piedra contra un panel de aluminio lo hace sonar en sus
     * modos propios, unos pocos tonos agudos que se quedan vibrando un
     * instante. Dos, sin relación armónica entre ellos, que es lo que hace
     * que suene a metal y no a campana.
     */
    const chapa = this.ganancia(4);
    for (const [hz, q] of [
      [1180, 35],
      [2930, 40],
    ] as const)
      granizoUmbral.connect(this.filtro("bandpass", hz, q)).connect(chapa);
    chapa.connect(this.granizo);
    granizoUmbral.connect(this.filtro("lowpass", 320, 1.4)).connect(this.granizo);
    this.capa("granizo", this.granizo, salida, 1.5);

    // ── La rodadura: juntas con su compás y baches sin él ───────────────
    const chasquido = this.chasquidoEnSilencio(2.5);
    this.ruedas = this.ganancia(1);
    /*
     * El golpe de la rueda es grave —de setenta a doscientos cincuenta
     * hercios según el avión— y eso un altavoz de tablet no lo da. Por eso
     * lleva además su chasquido, cuatro veces y media más agudo: es lo que
     * se oye del golpe en un altavoz pequeño, igual que del motor se oyen
     * los armónicos.
     */
    this.golpeDeRueda = this.filtro("bandpass", 180, 2.5);
    this.chasquidoDeRueda = this.filtro("bandpass", 800, 1.2);
    this.golpeDeRueda.connect(this.ruedas);
    this.chasquidoDeRueda.connect(this.ganancia(0.35)).connect(this.ruedas);
    this.capa("rodadura", this.ruedas, salida, 1);

    this.juntasFuente = ctx.createBufferSource();
    this.juntasFuente.buffer = chasquido;
    this.juntasFuente.loop = true;
    this.juntasFuente.loopStart = 0;
    this.juntasFuente.loopEnd = chasquido.duration;
    this.juntas = this.ganancia(0);
    this.morro = this.ganancia(1);
    this.principal = this.ganancia(1);
    this.retardo = ctx.createDelay(3);
    this.juntasFuente.connect(this.juntas);
    for (const destino of [this.golpeDeRueda, this.chasquidoDeRueda]) {
      this.morro.connect(destino);
      this.principal.connect(destino);
    }
    this.juntas.connect(this.morro);
    this.juntas.connect(this.retardo).connect(this.principal);
    this.juntasFuente.start();

    this.bachesFuente = ctx.createBufferSource();
    this.bachesFuente.buffer = chasquido;
    this.bachesFuente.loop = true;
    this.bachesFuente.loopStart = 0;
    this.bachesFuente.loopEnd = chasquido.duration;
    this.baches = this.ganancia(0);
    this.bachesFuente.connect(this.baches);
    this.baches.connect(this.golpeDeRueda);
    this.baches.connect(this.chasquidoDeRueda);
    this.bachesFuente.start(0, 0.5);

    // ── El tren: el aire en las patas y el motor que lo mueve ───────────
    this.patas = this.ganancia(0);
    ruidoDelResto.connect(this.patas);
    const patasFiltro = this.filtro("bandpass", 200, 0.6);
    this.patas.connect(patasFiltro);
    this.capa("patas", patasFiltro, this.pared, 1.5);
    this.motorDelTrenTono = ctx.createOscillator();
    this.motorDelTrenTono.type = "sawtooth";
    this.motorDelTrenTono.frequency.value = 200;
    this.motorDelTren = this.ganancia(0);
    this.motorDelTrenTono.connect(this.motorDelTren);
    const motorDelTrenFiltro = this.filtro("lowpass", 700, 1);
    this.motorDelTren.connect(motorDelTrenFiltro);
    this.motorDelTrenTono.start();
    this.capa("motorDelTren", motorDelTrenFiltro, salida, 1);

    // ── La reversa: el rugido grave del chorro hacia delante ────────────
    this.reversa = this.ganancia(0);
    const rugido = this.filtro("peaking", 140, 0.8);
    rugido.gain.value = 8;
    ruidoDelResto.connect(this.reversa).connect(this.filtro("lowpass", 800, 0.5)).connect(rugido);
    this.capa("reversa", rugido, this.pared, 4);

    // ── Los aerofrenos: un temblor grave que se nota en el asiento ──────
    /*
     * Los paneles levantados desprenden el aire a golpes, y lo que llega a la
     * cabina es un rumor grave que va y viene: ruido por debajo de unos
     * doscientos cincuenta hercios —lo bastante arriba para que lo dé un
     * altavoz pequeño—, modulado a unos siete golpes por segundo.
     */
    this.aerofrenos = this.ganancia(0);
    const tiembla = this.ganancia(0.6);
    const temblor = ctx.createOscillator();
    temblor.type = "triangle";
    temblor.frequency.value = 7;
    temblor.connect(this.ganancia(0.4)).connect(tiembla.gain);
    temblor.start();
    ruidoDelResto
      .connect(this.aerofrenos)
      .connect(this.filtro("lowpass", 250, 0.9))
      .connect(tiembla);
    this.capa("aerofrenos", tiembla, salida, 1.5);

    // ── Los flaps: el zumbido del motor que los mueve ───────────────────
    this.flapsTono = ctx.createOscillator();
    this.flapsTono.type = "sawtooth";
    this.flapsTono.frequency.value = 400;
    this.flaps = this.ganancia(0);
    const flapsFiltro = this.filtro("bandpass", 800, 1.5);
    this.flapsTono.connect(this.flaps).connect(flapsFiltro);
    this.flapsTono.start();
    this.capa("flaps", flapsFiltro, salida, 1);

    // ── La APU: el silbido que sube al arrancar y su rugido ─────────────
    this.apu = this.ganancia(0);
    this.apuSilbido = ctx.createOscillator();
    this.apuSilbido.type = "triangle";
    this.apuSilbido.frequency.value = 900;
    this.apuSilbido.connect(this.ganancia(0.3)).connect(this.apu);
    this.apuSilbido.start();
    ruidoDelResto.connect(this.filtro("bandpass", 450, 0.8)).connect(this.apu);
    this.capa("apu", this.apu, this.pared, 2);

    // ── El aire de la cabina ────────────────────────────────────────────
    this.aire = this.ganancia(0);
    const aireFiltro = this.filtro("bandpass", 800, 0.5);
    ruidoDelResto.connect(this.aire).connect(aireFiltro);
    this.capa("aire", aireFiltro, salida, 3);

    // ── Los golpes sueltos, generados una vez ───────────────────────────
    this.golpeGrabado = this.hacerGolpe();
    this.chirridoGrabado = this.hacerChirrido();
  }

  /**
   * Mueve cada perilla a lo que toca, y enchufa lo que suena. Una vez por
   * fotograma.
   *
   * Las perillas que no han cambiado no se escriben: cada `setTargetAtTime`
   * es un suceso más en la línea de tiempo del parámetro, y con cuarenta
   * perillas a sesenta fotogramas son dos mil cuatrocientos por segundo para
   * nada.
   */
  aplicar(n: Niveles): void {
    const fs = this.ctx.sampleRate;
    const ahora = this.ctx.currentTime;
    this.fijar(this.pared.frequency, n.pared, 0.15);

    // Las gotas.
    const l = n.lluvia;
    /*
     * Pocas gotas tienen que oírse **cada una**: es «algún golpeteo», no un
     * siseo más flojo. Con el umbral fijo, menos gotas por segundo son
     * también gotas más pequeñas, así que se les devuelve algo de lo que
     * pierden.
     */
    const compensa = Math.min(3, Math.pow(200 / Math.max(1, l.ritmo), 0.35));
    this.fijar(this.gotas.gain, l.gotas * ESCALA.gotas * compensa, 0.3);
    this.fijar(this.gotasPre.gain, l.gotas > 0 ? gananciaDeGranos(l.ritmo, 1200, fs) : 0, 0.3);
    this.fijar(this.gotasTic.frequency, l.tono, 0.3);
    // El tambor, en decibelios del realce grave: hasta catorce a tope.
    this.fijar(this.gotasTambor.gain, 14 * l.tambor, 0.3);
    this.enchufar("gotas", l.gotas, ahora);

    // Los limpias.
    this.fijar(this.limpias.gain, n.limpias.nivel * ESCALA.limpias, 0.3);
    this.fijar(this.limpiasFuente.playbackRate, n.limpias.barridas / BARRIDAS_GRABADAS, 0.5);
    this.enchufar("limpias", n.limpias.nivel, ahora);

    // El granizo.
    this.fijar(this.granizo.gain, n.granizo.nivel * ESCALA.granizo, 0.3);
    this.fijar(
      this.granizoPre.gain,
      n.granizo.nivel > 0 ? gananciaDeGranos(n.granizo.ritmo, 600, fs) : 0,
      0.3,
    );
    this.enchufar("granizo", n.granizo.nivel, ahora);

    // La rodadura.
    const r = n.rodadura;
    this.fijar(this.juntas.gain, r.juntas * ESCALA.juntas, 0.08);
    this.fijar(this.morro.gain, r.morro, 0.2);
    this.fijar(this.principal.gain, r.principal, 0.2);
    this.fijar(this.retardo.delayTime, r.retardo, 0.1);
    this.fijar(this.golpeDeRueda.frequency, r.tono, 0.5);
    this.fijar(this.chasquidoDeRueda.frequency, r.tono * 4.5, 0.5);
    this.fijar(this.baches.gain, r.baches * ESCALA.juntas, 0.08);
    this.enchufar("rodadura", r.juntas + r.baches, ahora);
    const largo = this.juntasFuente.buffer!.duration;
    /*
     * El compás de las juntas es el largo del bucle. Una losa hundida no
     * avisa: en el firme gastado se tuerce un poco cada vez.
     */
    if (r.cada > 0) {
      const tuerce = 1 + r.irregular * 0.25 * (Math.random() - 0.5);
      this.juntasFuente.loopEnd = Math.min(largo, Math.max(0.02, r.cada * tuerce));
    }
    /*
     * Y los baches no tienen compás: cada fotograma se sortea cuándo cae el
     * siguiente, entre un tercio y el doble y pico de la media.
     */
    if (r.cadaBache > 0)
      this.bachesFuente.loopEnd = Math.min(
        largo,
        Math.max(0.02, r.cadaBache * (0.35 + 1.3 * Math.random())),
      );

    // El viento lo mueve `audio.ts`, que es donde están sus nodos.

    // El tren.
    this.fijar(this.patas.gain, n.tren.patas * ESCALA.patas, 0.2);
    this.enchufar("patas", n.tren.patas, ahora);
    this.fijar(this.motorDelTren.gain, n.tren.motor * ESCALA.motorDelTren, 0.15);
    this.fijar(this.motorDelTrenTono.frequency, n.tren.tono, 0.5);
    this.enchufar("motorDelTren", n.tren.motor, ahora);

    // La reversa: sube como suben unos motores, no de golpe.
    this.fijar(this.reversa.gain, n.reversa * ESCALA.reversa, n.reversa > 0 ? 0.6 : 0.9);
    this.enchufar("reversa", n.reversa, ahora);

    // Los aerofrenos.
    this.fijar(this.aerofrenos.gain, n.aerofrenos * ESCALA.aerofrenos, 0.3);
    this.enchufar("aerofrenos", n.aerofrenos, ahora);

    // Los flaps.
    this.fijar(this.flaps.gain, n.flaps.nivel * ESCALA.flaps, 0.12);
    this.fijar(this.flapsTono.frequency, n.flaps.tono, 0.5);
    this.enchufar("flaps", n.flaps.nivel, ahora);

    // La APU: el silbido sube con el giro.
    this.fijar(this.apu.gain, n.apu.nivel * ESCALA.apu, 0.3);
    this.fijar(this.apuSilbido.frequency, 900 + 2600 * n.apu.giro, 0.3);
    this.enchufar("apu", n.apu.nivel, ahora);

    this.fijar(this.aire.gain, n.aire * ESCALA.aire, 0.8);
    this.enchufar("aire", n.aire, ahora);
  }

  /**
   * Lo que se ha tocado desde la última vez que se preguntó, para el banco:
   * `toque`, `tren:fuera`, `reversa`… Con tope, que nadie lo vacía jugando.
   */
  sacarTocados(): string[] {
    return this.tocados.splice(0);
  }
  private readonly tocados: string[] = [];

  /** Toca un golpe suelto: el toque, el tren, las compuertas de la reversa. */
  tocar(s: Suceso): void {
    const ahora = this.ctx.currentTime;
    if (this.tocados.length < 50) this.tocados.push(s.que === "tren" ? `tren:${s.como}` : s.que);
    if (s.que === "toque") {
      /*
       * Dos chirridos y no uno: las dos patas del tren principal no tocan
       * nunca en el mismo instante, y ese «chirrí-chirrí» es el que se
       * reconoce.
       */
      if (s.chirrido > 0.02) {
        this.golpe(this.chirridoGrabado, s.tono, s.chirrido * ESCALA.chirrido, ahora);
        this.golpe(
          this.chirridoGrabado,
          s.tono * 0.96,
          s.chirrido * ESCALA.chirrido * 0.7,
          ahora + 0.03 + Math.random() * 0.05,
        );
      }
      if (s.golpe > 0.02) this.golpe(this.golpeGrabado, 0.85, s.golpe * ESCALA.golpe, ahora);
      return;
    }
    if (s.que === "tren") {
      const tono = s.como === "fuera" ? 1 : s.como === "dentro" ? 1.25 : 1.6;
      this.golpe(this.golpeGrabado, tono, s.fuerza * ESCALA.golpe, ahora);
      return;
    }
    this.golpe(this.golpeGrabado, 1.4, s.fuerza * ESCALA.golpe * 0.6, ahora);
  }

  /**
   * **Para el banco**: el valor eficaz de cada capa ahora mismo, en
   * decibelios. Pone un analizador en cada capa la primera vez que se pide.
   *
   * Y avisa con lo que hace: un analizador tira de la capa que mide aunque
   * esté desenchufada, así que desde que se mide las capas se procesan
   * todas. Es para el banco, que mide; jugando no se llama nunca.
   */
  medir(): Medida {
    const fuera: Medida = {};
    for (const [nombre, nodo] of Object.entries(this.capas)) {
      let a = this.analizadores.get(nombre);
      if (!a) {
        a = this.ctx.createAnalyser();
        a.fftSize = 2048;
        nodo.connect(a);
        this.analizadores.set(nombre, a);
      }
      const datos = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(datos);
      let suma = 0;
      for (const v of datos) suma += v * v;
      const eficaz = Math.sqrt(suma / datos.length);
      fuera[nombre] = eficaz > 1e-7 ? Math.round(200 * Math.log10(eficaz)) / 10 : -Infinity;
    }
    return fuera;
  }
  private readonly analizadores = new Map<string, AnalyserNode>();

  /** Cuántas capas hay enchufadas ahora. Para el banco de coste. */
  get enchufadas(): number {
    return Object.values(this.enchufes).filter((e) => e.enchufado).length;
  }

  /** Y una capa de fuera de aquí —el viento, el motor— para medirla igual. */
  anotar(nombre: string, nodo: AudioNode | null): void {
    if (nodo) this.capas[nombre] = nodo;
  }

  // ── Piezas ──────────────────────────────────────────────────────────────

  /** Una capa: su último nodo, a dónde va y cuánto tarda en callarse. */
  private capa(nombre: string, ultimo: AudioNode, destino: AudioNode, cola: number): void {
    this.enchufes[nombre] = new Enchufe(ultimo, destino, cola);
    this.capas[nombre] = ultimo;
  }

  private enchufar(nombre: string, nivel: number, ahora: number): void {
    this.enchufes[nombre]?.seguir(nivel > CALLADA, ahora);
  }

  private fijar(param: AudioParam, valor: number, constante: number): void {
    if (!Number.isFinite(valor)) return;
    const p = this.perillas.get(param);
    if (p) {
      const umbral = Math.max(1e-4, Math.abs(p.ultimo) * 0.01);
      if (Math.abs(valor - p.ultimo) < umbral) return;
      p.ultimo = valor;
    } else this.perillas.set(param, { ultimo: valor });
    param.setTargetAtTime(valor, this.ctx.currentTime, constante);
  }

  private golpe(buffer: AudioBuffer, tono: number, fuerza: number, cuando: number): void {
    if (!(fuerza > 0)) return;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.playbackRate.value = tono;
    const g = this.ganancia(fuerza);
    fuente.connect(g).connect(this.salida);
    fuente.start(cuando);
    fuente.addEventListener("ended", () => {
      fuente.disconnect();
      g.disconnect();
    });
  }

  private filtro(tipo: BiquadFilterType, hz: number, q: number): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = hz;
    f.Q.value = q;
    return f;
  }

  private ganancia(g: number): GainNode {
    const n = this.ctx.createGain();
    n.gain.value = g;
    return n;
  }

  /**
   * El ruido en bucle, **empezando en un sitio cualquiera**: dos capas que
   * tocaran el mismo trozo a la vez sumarían el mismo ruido dos veces, y eso
   * no suena a más ruido, suena a un filtro.
   */
  private bucle(ruido: AudioBuffer): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = ruido;
    s.loop = true;
    s.start(0, Math.random() * ruido.duration);
    return s;
  }

  private curva(f: (x: number) => number): Float32Array<ArrayBuffer> {
    const n = 1024;
    const c = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) c[i] = f((i / (n - 1)) * 2 - 1);
    return c;
  }

  /** Por debajo del umbral, nada; por encima, lo que sobra, con su signo. */
  private curvaDeGranos(): Float32Array<ArrayBuffer> {
    const u = UMBRAL_DE_GRANOS;
    return this.curva((x) =>
      Math.abs(x) <= u ? 0 : (Math.sign(x) * (Math.abs(x) - u)) / (1 - u),
    );
  }

  /** Un chasquido de cuatro milésimas al principio y silencio hasta el final. */
  private chasquidoEnSilencio(segundos: number): AudioBuffer {
    const fs = this.ctx.sampleRate;
    const b = this.ctx.createBuffer(1, Math.round(fs * segundos), fs);
    const d = b.getChannelData(0);
    const largo = Math.round(fs * 0.004);
    for (let i = 0; i < largo; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (fs * 0.0008));
    return b;
  }

  /**
   * **Un ciclo de limpias**: ida y vuelta, cada barrida con su roce y su
   * golpecito al llegar al tope.
   *
   * El roce es la goma contra el cristal mojado: ruido en una banda ancha
   * alrededor de los mil trescientos hercios, fuerte a mitad de recorrido y
   * nada en los extremos, que es donde el brazo se para. Y en cada extremo,
   * el golpe sordo del brazo al cambiar de sentido.
   */
  private hacerLimpias(): AudioBuffer {
    const fs = this.ctx.sampleRate;
    const barrida = 1 / BARRIDAS_GRABADAS;
    const b = this.ctx.createBuffer(1, Math.round(fs * barrida * 2), fs);
    const d = b.getChannelData(0);
    const w = (2 * Math.PI * 1300) / fs;
    const rr = 0.96;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < d.length; i++) {
      const t = (i / fs) % barrida;
      const x = Math.random() * 2 - 1;
      const y = x * (1 - rr) * 4 + 2 * rr * Math.cos(w) * y1 - rr * rr * y2;
      y2 = y1;
      y1 = y;
      const roce = Math.pow(Math.sin((Math.PI * t) / barrida), 0.7);
      // El golpe del brazo, al final de cada barrida.
      const tg = t - barrida * 0.97;
      const golpe = tg > 0 ? Math.exp(-tg / 0.03) * Math.sin(2 * Math.PI * 120 * tg) : 0;
      d[i] = 0.8 * roce * y + 0.5 * golpe;
    }
    return b;
  }

  /**
   * **Un golpe de tren**: un grave que se apaga, otro algo más agudo que se
   * apaga antes y un chasquido de metal al principio. Es el «clonc» de una
   * pata que llega a su tope; tocado más deprisa, el de la que se suelta.
   */
  private hacerGolpe(): AudioBuffer {
    const fs = this.ctx.sampleRate;
    const b = this.ctx.createBuffer(1, Math.round(fs * 0.6), fs);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / fs;
      d[i] =
        0.8 * Math.exp(-t / 0.09) * Math.sin(2 * Math.PI * 62 * t * (1 - 0.15 * t)) +
        0.45 * Math.exp(-t / 0.03) * Math.sin(2 * Math.PI * 145 * t) +
        0.5 * Math.exp(-t / 0.004) * (Math.random() * 2 - 1);
    }
    return b;
  }

  /**
   * **El chirrido de una rueda al tocar**: un tono agudo que cae deprisa —la
   * goma patinando hasta ponerse a la par— y un soplo de ruido, que es el
   * humo. Medio segundo.
   */
  private hacerChirrido(): AudioBuffer {
    const fs = this.ctx.sampleRate;
    const b = this.ctx.createBuffer(1, Math.round(fs * 0.5), fs);
    const d = b.getChannelData(0);
    let fase = 0;
    // Un resonador de dos polos a mano para el soplo, centrado en dos mil.
    const w = (2 * Math.PI * 2000) / fs;
    const rr = 0.995;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / fs;
      const hz = 1300 + 600 * Math.exp(-t / 0.08);
      fase += (2 * Math.PI * hz) / fs;
      const sube = Math.min(1, t / 0.005);
      const cae = Math.exp(-t / 0.12);
      const x = Math.random() * 2 - 1;
      const y = x * (1 - rr) + 2 * rr * Math.cos(w) * y1 - rr * rr * y2;
      y2 = y1;
      y1 = y;
      d[i] = sube * cae * (0.55 * Math.sin(fase) + 6 * y);
    }
    return b;
  }
}
