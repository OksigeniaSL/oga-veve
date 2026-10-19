/**
 * **La gente de la cabina al llegar al puesto**: las hebillas que se sueltan y
 * los que se levantan (punto 303).
 *
 * Enrique: «al llegar, la gente se quita el cinturón y se levanta antes de que
 * se apague la luz, y la tripulación pone cara de póker». Es de lo más
 * reconocible de un vuelo, y en la escena de pasaje se enseña con el ejemplo:
 * alrededor se oye a los impacientes, bajito, y Ara sigue en su asiento con
 * el cinturón puesto hasta que se apaga la luz. Así que tiene que sonar como
 * suena: unos clics sueltos aquí y allá con la luz encendida, y cuando se
 * apaga —el *ding*—, el clic-clic de todo el pasaje a la vez y la gente
 * poniéndose de pie.
 *
 * ## Sintetizado, como todo lo demás
 *
 * Ni una muestra grabada, igual que el motor, el viento o el tren: ver la
 * cabecera de `ruidos-en-el-aire.ts`. Cero bytes de red y ninguna licencia
 * que perseguir (regla 8 del AGENTS.md). Lo que hace que una hebilla de avión
 * suene a hebilla son tres cosas, y son las que se hacen aquí:
 *
 * - **la tapa que se levanta**: un chasquido seco de chapa, unos milisegundos
 *   de ruido que resuenan en dos o tres kilohercios;
 * - **la lengüeta que sale**: un tintineo de metal un poco después, tres
 *   parciales agudos que se apagan deprisa;
 * - **y la cinta que se suelta**: un roce de tela, ruido suave en la banda
 *   de un par de kilohercios.
 *
 * Y levantarse es el cojín del asiento que suelta el peso —un golpe sordo y
 * grave— y la ropa rozando. Todo bajito: es lo que pasa alrededor, no lo que
 * se cuenta.
 *
 * Esto es la lógica y las muestras, sin Web Audio; lo toca
 * `RuidosEnElAire.tocarLaGente` y lo pide `game.ts` con lo que dice la
 * escena. Ver `VueloDePasaje.gente` en `flight/inicio-pasaje.ts`.
 */

/** Cómo anda la gente: sentada, los impacientes con la luz encendida, o todos de pie. */
export type GenteDeLaCabina = "sentada" | "impacientes" | "de-pie";

/** Un ruido de la gente: qué, y con cuánta fuerza, de 0 a 1 —cerca o lejos—. */
export interface RuidoDeLaGente {
  readonly que: "hebilla" | "levantarse";
  readonly fuerza: number;
}

/**
 * **Los ritmos**, ruidos por segundo de media, y las fuerzas.
 *
 * - **Los impacientes**, con la luz encendida: unos pocos, y no todos a la
 *   vez. Un clic cada dos segundos y pico y alguien que se levanta cada seis
 *   o siete, lejos casi siempre. El primero enseguida —`PRIMER_CLIC`—, que
 *   es lo que Ara oye antes de decirlo.
 * - **Todos**, al apagarse la luz: el clic-clic de todo el pasaje en los
 *   primeros segundos, que se va apagando, y la gente poniéndose de pie un
 *   rato más. A los `SE_ACABA` segundos, todo el mundo está de pie.
 */
export const RITMO = {
  impacientes: { hebilla: 0.42, levantarse: 0.15, fuerza: [0.25, 0.55] },
  todos: { hebilla: 6, levantarse: 1.1, fuerza: [0.35, 0.85] },
} as const;
export const PRIMER_CLIC = 0.4;
/** Lo que tarda en apagarse el clic-clic de todos, s: en tres segundos, casi todo el pasaje. */
const SE_APAGA_EL_CLIC = 2.2;
/** Y lo que tarda en ponerse de pie todo el mundo, s. */
const SE_PONEN_DE_PIE = 5;
export const SE_ACABA = 12;
/** El paso más largo que se cuenta, s: un fotograma que se atasca no suelta una ráfaga. */
const PASO_MAXIMO = 0.25;

/**
 * **Lo que suena de la gente, paso a paso.** Se le da el reloj de pared —lo
 * que se oye no se acelera aunque el juego vaya deprisa— y cómo anda la gente
 * según la escena; devuelve lo que toca sonar en este paso.
 */
export class GenteQueSeLevanta {
  private estado: GenteDeLaCabina = "sentada";
  private desde = 0;
  private primero = true;

  paso(dt: number, gente: GenteDeLaCabina, azar: () => number = Math.random): RuidoDeLaGente[] {
    if (gente !== this.estado) {
      this.estado = gente;
      this.desde = 0;
      this.primero = true;
    }
    const d = Math.min(Math.max(0, dt), PASO_MAXIMO);
    this.desde += d;
    const salida: RuidoDeLaGente[] = [];
    if (gente === "sentada" || d === 0) return salida;
    const t = this.desde;
    const r = gente === "impacientes" ? RITMO.impacientes : RITMO.todos;
    const fuerza = (): number => r.fuerza[0] + (r.fuerza[1] - r.fuerza[0]) * azar();
    // El primer clic de los impacientes, enseguida y no muy lejos: el que se oye primero.
    if (gente === "impacientes" && this.primero && t >= PRIMER_CLIC) {
      this.primero = false;
      salida.push({ que: "hebilla", fuerza: r.fuerza[1] });
      return salida;
    }
    let hebillas: number = r.hebilla;
    let levantarse: number = r.levantarse;
    if (gente === "de-pie") {
      if (t > SE_ACABA) return salida;
      hebillas *= Math.exp(-t / SE_APAGA_EL_CLIC);
      levantarse *= Math.exp(-Math.max(0, t - 1) / SE_PONEN_DE_PIE);
    }
    // Un proceso de Poisson: la probabilidad de uno en este paso.
    if (azar() < 1 - Math.exp(-hebillas * d)) salida.push({ que: "hebilla", fuerza: fuerza() });
    if (azar() < 1 - Math.exp(-levantarse * d)) salida.push({ que: "levantarse", fuerza: fuerza() });
    return salida;
  }
}

// ── Las muestras ─────────────────────────────────────────────────────────

/**
 * Un resonador de dos polos sobre una señal, en su sitio: `x` a la frecuencia
 * `hz` con un ancho que da `r` —cuanto más cerca de uno, más fino—.
 */
function resonar(x: Float32Array, fs: number, hz: number, r: number): Float32Array {
  const y = new Float32Array(x.length);
  const c = 2 * r * Math.cos((2 * Math.PI * hz) / fs);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i]! * (1 - r) + c * y1 - r * r * y2;
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** Lo deja con el pico en `pico`: cada muestra suena con la fuerza que le dé quien la toca. */
function normalizar(x: Float32Array, pico = 0.9): Float32Array {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] = (x[i]! / m) * pico;
  return x;
}

/**
 * **Una hebilla de avión que se suelta**: la tapa, la lengüeta y la cinta,
 * casi medio segundo. Ver la cabecera.
 */
export function muestraDeHebilla(fs: number, azar: () => number = Math.random): Float32Array {
  const n = Math.round(fs * 0.42);
  const ruido = new Float32Array(n);
  for (let i = 0; i < n; i++) ruido[i] = azar() * 2 - 1;
  // La tapa: ruido de unos milisegundos, por dos resonancias de chapa.
  const golpe = new Float32Array(n);
  for (let i = 0; i < n; i++) golpe[i] = ruido[i]! * Math.exp(-i / fs / 0.0035);
  const tapa = resonar(golpe, fs, 3100, 0.985);
  const tapaGrave = resonar(golpe, fs, 1750, 0.97);
  const fuera = new Float32Array(n);
  // La lengüeta, cuarenta y cinco milésimas después: tres parciales de metal.
  const sale = 0.045;
  const parciales = [
    [2950, 0.05, 0.5],
    [4720, 0.035, 0.3],
    [6880, 0.02, 0.2],
  ] as const;
  // Y la cinta que se suelta: un roce de tela, suave.
  const roce = resonar(ruido, fs, 2100, 0.9);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    let v = 9 * tapa[i]! + 4 * tapaGrave[i]!;
    if (t >= sale) {
      const u = t - sale;
      for (const [hz, cae, a] of parciales) v += a * Math.exp(-u / cae) * Math.sin(2 * Math.PI * hz * u);
      v += 0.35 * ruido[i]! * Math.exp(-u / 0.002);
    }
    if (t >= 0.06 && t < 0.4) v += 1.2 * roce[i]! * Math.sin((Math.PI * (t - 0.06)) / 0.34);
    fuera[i] = v;
  }
  return normalizar(fuera);
}

/**
 * **Alguien que se levanta del asiento**: el cojín que suelta el peso —un
 * golpe sordo, grave— y la ropa rozando, casi un segundo.
 */
export function muestraDeLevantarse(fs: number, azar: () => number = Math.random): Float32Array {
  const n = Math.round(fs * 0.95);
  const fuera = new Float32Array(n);
  // Un paso bajo de un polo a unos trescientos hercios, para el cojín.
  const k = 1 - Math.exp((-2 * Math.PI * 300) / fs);
  let grave = 0;
  // Y la ropa: ruido agudo, a ráfagas que cambian despacio.
  let antes = 0;
  let rafaga = 0;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const x = azar() * 2 - 1;
    grave += k * (x - grave);
    const cojin = Math.min(1, t / 0.06) * Math.exp(-Math.max(0, t - 0.06) / 0.22);
    const agudo = x - antes;
    antes = x;
    if (i % 400 === 0) rafaga = 0.4 + 0.6 * azar();
    const ropa = t > 0.08 ? Math.sin((Math.PI * (t - 0.08)) / 0.87) * rafaga : 0;
    fuera[i] = 2.6 * grave * cojin + 0.18 * agudo * ropa;
  }
  return normalizar(fuera, 0.8);
}
