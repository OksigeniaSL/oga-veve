/**
 * El medidor: cuánto cuesta un fotograma, y en qué se va.
 *
 * `AGENTS.md` dice «antes de añadir un efecto visual, se mide», y hasta hoy no
 * había con qué. Había un banco externo —`scripts/verificar-rendimiento.mjs`,
 * que estrangula la CPU y saca un número— pero eso mide **otro** aparato en
 * otro momento: no sirve para mirar el juego mientras se juega, ni para saber
 * si la tableta de un aula aguanta lo que se acaba de añadir. Sin esto, la
 * regla era un deseo.
 *
 * Se enciende con **F2** y no está en el mapa de teclas a propósito: no es un
 * mando del juego, es una herramienta, y la pantalla de teclas es para un
 * chico de cuatro años que está aprendiendo cuál sube el motor.
 *
 * ## Qué mide, y qué no
 *
 * - **fps** y **ms**: el tiempo de reloj entre fotogramas. Es el único número
 *   que se corresponde con lo que se ve.
 * - **el peor 1 %**: el tirón. Una media de 16 ms con tirones de 60 se juega
 *   peor que un 22 constante, y la media sola no lo dice nunca.
 * - **pintar** y **juego**: lo que tarda `renderer.render` y lo que tarda todo
 *   lo demás. Con la salvedad honesta de que `render` **encola** trabajo para
 *   la tarjeta y vuelve: si la tarjeta va ahogada, eso no sale en «pintar»,
 *   sale en el hueco entre fotogramas. Por eso están los dos números.
 * - **llamadas** y **triángulos**: lo que de verdad se paga por fotograma, y
 *   lo que sube sin avisar cuando alguien añade una malla suelta por objeto en
 *   vez de una instanciada.
 */

import type { WebGLRenderer } from "three";

/**
 * Una ventana de las últimas muestras, y sus tres números.
 *
 * Anillo de tamaño fijo: no reserva memoria por fotograma, que sería medir el
 * medidor. Ciento veinte muestras son dos segundos a sesenta por segundo —lo
 * bastante para que el número se pueda leer sin bailar, y lo bastante poco
 * para que reaccione cuando algo empieza a ir mal.
 */
export class Ventana {
  private readonly datos: Float64Array;
  private cuantas = 0;
  private donde = 0;

  constructor(capacidad = 120) {
    this.datos = new Float64Array(capacidad);
  }

  meter(ms: number): void {
    this.datos[this.donde] = ms;
    this.donde = (this.donde + 1) % this.datos.length;
    this.cuantas = Math.min(this.cuantas + 1, this.datos.length);
  }

  get llena(): boolean {
    return this.cuantas > 0;
  }

  get media(): number {
    if (!this.cuantas) return 0;
    let suma = 0;
    for (let i = 0; i < this.cuantas; i++) suma += this.datos[i]!;
    return suma / this.cuantas;
  }

  /**
   * El percentil que se pida, de 0 a 1.
   *
   * Ordena una copia. Son ciento veinte números y esto corre **una vez cada
   * media chica de segundo**, no una vez por fotograma: medir no se puede
   * pagar con lo que se está midiendo.
   */
  percentil(p: number): number {
    if (!this.cuantas) return 0;
    const orden = Array.from(this.datos.slice(0, this.cuantas)).sort(
      (a, b) => a - b,
    );
    const i = Math.min(orden.length - 1, Math.floor(p * orden.length));
    return orden[i]!;
  }

  vaciar(): void {
    this.cuantas = 0;
    this.donde = 0;
  }
}

/** Un renglón del cartel, ya formateado. */
export interface Renglon {
  readonly texto: string;
  /** Si el número se salió del presupuesto. Lo pinta en rojo. */
  readonly caro: boolean;
}

/**
 * El presupuesto por fotograma, en milisegundos.
 *
 * Treinta y tres es sesenta pantallas de treinta por segundo, que es lo que da
 * una tableta Android de gama media —el criterio de aceptación de #33— y lo
 * mismo que usa el banco con la CPU estrangulada cuatro veces. Por encima de
 * eso el número sale en rojo, que es la única forma de que una regla se note.
 */
export const PRESUPUESTO = 33.3;

const num = (n: number, dec = 1): string =>
  n.toLocaleString("es", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

const miles = (n: number): string => Math.round(n).toLocaleString("es");

/**
 * Los renglones del cartel a partir de lo medido.
 *
 * Está aparte del DOM porque es lo único de aquí que se puede comprobar: lo
 * demás es un `div` en una esquina.
 */
export function renglones(
  cuadro: Ventana,
  pintar: Ventana,
  info: { calls: number; triangles: number; geometrias: number } | null,
): readonly Renglon[] {
  const ms = cuadro.media;
  const peor = cuadro.percentil(0.99);
  const fps = ms > 0 ? 1000 / ms : 0;
  const dibujo = pintar.media;
  const salida: Renglon[] = [
    {
      texto: `${Math.round(fps)} fps · ${num(ms)} ms`,
      caro: ms > PRESUPUESTO,
    },
    {
      texto: `peor 1 % · ${num(peor)} ms`,
      // El tirón se juzga con más manga ancha que la media: un fotograma
      // largo cada dos segundos se nota, pero no es lo mismo que ir lento.
      caro: peor > PRESUPUESTO * 1.5,
    },
    {
      texto: `pintar ${num(dibujo)} · juego ${num(Math.max(0, ms - dibujo))}`,
      caro: false,
    },
  ];
  if (info) {
    salida.push({
      texto: `${miles(info.calls)} llamadas · ${miles(info.triangles / 1000)} k triáng. · ${miles(info.geometrias)} mallas`,
      caro: info.calls > 300,
    });
  }
  return salida;
}

/** Cada cuánto se repinta el cartel, en segundos. */
const CADA = 0.4;

/**
 * El cartel, encendido con F2.
 *
 * Mientras está apagado no formatea nada ni toca el DOM: solo mete dos números
 * en dos anillos, que es lo que permite dejarlo puesto siempre y que el juego
 * publicado también se pueda medir en el aparato de alguien.
 */
export class Medidor {
  private readonly cuadro = new Ventana();
  private readonly pintar = new Ventana();
  private readonly raiz: HTMLElement;
  private readonly renderer: WebGLRenderer | null;
  private ultimo = 0;
  private desdeElRepinte = 0;
  private abierto = false;

  /**
   * `padre` es el cuerpo de la página y no el HUD **a propósito**: el HUD se
   * rehace entero al cambiar de idioma o de peldaño, y lo que estuviera
   * colgado de él desaparecería sin dejar rastro. Costó un rato entenderlo.
   */
  constructor(padre: HTMLElement, renderer: WebGLRenderer | null = null) {
    this.renderer = renderer;
    this.raiz = document.createElement("div");
    this.raiz.className = "rendimiento";
    this.raiz.hidden = true;
    // No es contenido de la página: es una herramienta encima de ella. Un
    // lector de pantalla que lea la velocidad de fotogramas cada medio segundo
    // no ayuda a nadie.
    this.raiz.setAttribute("aria-hidden", "true");
    padre.appendChild(this.raiz);
    window.addEventListener("keydown", this.alPulsar);
  }

  private alPulsar = (e: KeyboardEvent): void => {
    if (e.code !== "F2") return;
    e.preventDefault();
    this.alternar();
  };

  get visible(): boolean {
    return this.abierto;
  }

  alternar(): void {
    this.abierto = !this.abierto;
    this.raiz.hidden = !this.abierto;
    if (this.abierto) {
      // Lo de antes de encenderlo no vale: casi siempre lleva dentro el tirón
      // de haber cargado algo, y ese número asusta y no dice nada.
      this.cuadro.vaciar();
      this.pintar.vaciar();
      this.desdeElRepinte = CADA;
    }
  }

  /** El reloj de un fotograma. Se llama al principio de cada uno. */
  empezarCuadro(ahora: number): void {
    if (this.ultimo > 0) this.cuadro.meter(ahora - this.ultimo);
    this.ultimo = ahora;
  }

  /** Lo que ha costado pintar, medido alrededor de `renderer.render`. */
  apuntarPintado(ms: number): void {
    this.pintar.meter(ms);
  }

  /** Repinta el cartel si toca. Se llama al final del fotograma. */
  update(dt: number): void {
    if (!this.abierto) return;
    this.desdeElRepinte += dt;
    if (this.desdeElRepinte < CADA) return;
    this.desdeElRepinte = 0;
    const info = this.renderer
      ? {
          calls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          geometrias: this.renderer.info.memory.geometries,
        }
      : null;
    this.raiz.innerHTML = renglones(this.cuadro, this.pintar, info)
      .map(
        (r) =>
          `<div class="rendimiento__linea${r.caro ? " rendimiento__linea--caro" : ""}">${r.texto}</div>`,
      )
      .join("");
  }

  dispose(): void {
    window.removeEventListener("keydown", this.alPulsar);
    this.raiz.remove();
  }
}
