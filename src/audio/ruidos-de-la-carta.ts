/**
 * **Lo que suena la carta** (#72): el papel al abrirla y un clic al tocar un
 * elemento. Hechos aquí con Web Audio, como los demás efectos del juego: sin
 * ficheros que licenciar.
 *
 * Bajos y cortos a propósito. Son una respuesta a la mano —la hoja que se
 * despliega, el dedo que toca—, no un aviso: el papel dura un tercio de
 * segundo y el clic, cuatro centésimas. Y **si suena un aviso, la carta se
 * calla**: no se toca nada mientras canta una caja del avión o la bocina de
 * pérdida, porque un *terrain* tapado por el ruido de un papel sería justo
 * lo contrario de la regla de las tres eses. Lo decide `suenaLaCarta`; quien
 * sabe si suena un aviso es el motor de audio del vuelo. En el hangar no hay
 * avisos.
 *
 * Sale por donde se le diga: en el vuelo, el bus de interfaz de la mezcla, que
 * además se agacha diez decibelios cuando habla alguien; en el hangar, la
 * salida de la voz del hangar, al volumen guardado.
 */

export type RuidoDeLaCarta = "papel" | "clic";

/** Si la carta puede sonar ahora: con un aviso sonando, no. */
export function suenaLaCarta(suenaUnAviso: boolean): boolean {
  return !suenaUnAviso;
}

/** Cuánto dura cada uno, s: lo que tarda en apagarse del todo. */
export const DURA: Readonly<Record<RuidoDeLaCarta, number>> = { papel: 0.34, clic: 0.04 };

/** Lo fuerte de cada uno en su salida, en ganancia: por debajo de un toque del cuadro. */
export const FUERZA_DE_LA_CARTA: Readonly<Record<RuidoDeLaCarta, number>> = { papel: 0.09, clic: 0.07 };

const ruidos = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Un segundo de ruido blanco, uno por contexto: cero bytes de red. */
function ruidoDe(ctx: BaseAudioContext): AudioBuffer {
  let b = ruidos.get(ctx);
  if (b) return b;
  b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ruidos.set(ctx, b);
  return b;
}

/**
 * **Los crujidos del papel**: cuándo cruje dentro del tercio de segundo, y
 * cuánto. Un papel que se despliega no sopla parejo: cruje a golpecitos, más
 * al principio, cuando se abre el pliegue. Con el azar que se le pase, para
 * que dos aperturas seguidas no suenen a grabación.
 */
export function crujidos(azar: () => number = Math.random): { en: number; fuerza: number }[] {
  const salen: { en: number; fuerza: number }[] = [];
  let en = 0.01;
  for (let i = 0; i < 7 && en < DURA.papel - 0.06; i++) {
    salen.push({ en, fuerza: 0.55 + azar() * 0.45 });
    en += 0.02 + azar() * 0.035 + i * 0.006;
  }
  return salen;
}

/** Toca uno de los dos en `salida`, ahora mismo. */
export function tocarRuidoDeLaCarta(ctx: BaseAudioContext, salida: AudioNode, que: RuidoDeLaCarta): void {
  const t = ctx.currentTime;
  const fuente = ctx.createBufferSource();
  fuente.buffer = ruidoDe(ctx);
  const sobre = ctx.createGain();
  sobre.gain.setValueAtTime(0.0001, t);
  const fuerza = FUERZA_DE_LA_CARTA[que];
  if (que === "papel") {
    // El papel: agudo y seco, sin graves, que un papel no retumba.
    const bajo = ctx.createBiquadFilter();
    bajo.type = "highpass";
    bajo.frequency.value = 1400;
    const banda = ctx.createBiquadFilter();
    banda.type = "bandpass";
    banda.frequency.value = 3800;
    banda.Q.value = 0.7;
    for (const c of crujidos()) {
      sobre.gain.setValueAtTime(0.0001, t + c.en);
      sobre.gain.linearRampToValueAtTime(fuerza * c.fuerza, t + c.en + 0.004);
      sobre.gain.exponentialRampToValueAtTime(fuerza * 0.18, t + c.en + 0.018);
    }
    sobre.gain.exponentialRampToValueAtTime(0.0001, t + DURA.papel);
    fuente.connect(bajo).connect(banda).connect(sobre).connect(salida);
  } else {
    // El clic: un golpecito de uña sobre la hoja, ataque instantáneo y fuera.
    const banda = ctx.createBiquadFilter();
    banda.type = "bandpass";
    banda.frequency.value = 2600;
    banda.Q.value = 1.6;
    sobre.gain.linearRampToValueAtTime(fuerza, t + 0.002);
    sobre.gain.exponentialRampToValueAtTime(0.0001, t + DURA.clic);
    fuente.connect(banda).connect(sobre).connect(salida);
  }
  const desde = Math.random() * 0.5;
  fuente.start(t, desde, DURA[que] + 0.02);
  fuente.stop(t + DURA[que] + 0.05);
  fuente.addEventListener("ended", () => sobre.disconnect());
}
