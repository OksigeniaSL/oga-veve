/**
 * **«Interceptar un radial»**: el tercer ejercicio de la radio de navegación,
 * el segundo del VOR (#51, peldaño 5; ADR 0030, enmienda H26e).
 *
 * «¿En qué radial estoy?» enseña que el VOR dice dónde se está. Éste enseña
 * lo que se hace con eso en una salida de verdad: **ir a un radial que no es
 * el de debajo y quedarse en él**. Es lo que pide una salida publicada —«virar
 * para interceptar y seguir el R-303 TFN»— y lo que se vuela cada día en
 * cualquier cabina.
 *
 * Los pasos, como en una escuela de vuelo:
 *
 * 1. **El curso en el OBS**: el número que pide la tarjeta («R-120 FTV»), que
 *    la voz no dice. Al ponerlo, **la barra se va a tope**: el radial queda de
 *    ese lado. El avión ya va cortándolo a cuarenta y cinco grados, que es el
 *    ángulo de cortada de manual.
 * 2. **La barra se despega del tope** (a menos de diez grados, `ESCALA_VOR`):
 *    el radial está cerca. Hay que **empezar a virar antes de que llegue al
 *    centro**, porque el avión no gira en el sitio: describe un arco, y
 *    mientras gira sigue acercándose. Con la avioneta a régimen estándar, un
 *    viraje de cuarenta y cinco grados se come el radio de viraje por uno
 *    menos el coseno de cuarenta y cinco: unos trescientos cuarenta metros
 *    (ver `ANTICIPACION`). Quien espera a ver la barra en el centro se pasa.
 * 3. **Pasarse**, si pasa: la barra cruza al otro lado, se ve y se vuelve.
 *    Nadie suspende.
 * 4. **Establecido**: la barra quieta en el centro veinte segundos con el
 *    morro cerca del curso. Con el viento de costado, **el morro no apunta al
 *    curso**: apunta contra el viento lo que haga falta para que el camino sí
 *    vaya por el radial, y la instructora lo señala. Ahí se acaba.
 *
 * ## Lo que es de verdad, y de dónde sale
 *
 * - **La barra y el TO/FROM** son los de `radio-de-navegacion.ts` (`leerNav`).
 *   Este fichero no calcula ninguno: mira lo que marca el instrumento, como
 *   quien vuela.
 * - **El radial pedido**, redondo y **de costado al viento**, del lado más
 *   bajo (`radialDeCostadoAlViento`, la misma elección que «¿En qué radial
 *   estoy?»): en Fuerteventura, el 120 de FTV. Las salidas publicadas que
 *   cortan un radial y están transcritas —Los Rodeos, el R-303 y el R-097 de
 *   TFN— lo siguen **hacia** la radio y cortándolo a noventa grados largos,
 *   así que no son «salir por un radial a cuarenta y cinco»; y vale en todo
 *   campo con VOR, no solo en los que tienen una.
 * - **El viento del sitio**, como en los otros dos (`main.ts`).
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de prueba con la
 * radio de verdad (`interceptar-un-radial.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { centrado, emisorasEn, ESCALA_VOR, MILLA, type Emisora } from "./radio-de-navegacion";
import { ALTURA_DEL_RADIAL, comoEnElObs, radialDeCostadoAlViento } from "./en-que-radial-estoy";
import type { PuntoDelMundo } from "./seguir-la-aguja";

const GRADO = Math.PI / 180;

// ── Dónde empieza ────────────────────────────────────────────────────────

/** **El ángulo de cortada**, grados: cuarenta y cinco, el de manual. */
export const CORTADA = 45;
/**
 * **Lo apartado que se empieza del radial pedido**, visto desde la radio,
 * grados: treinta. Con el OBS en el pedido la barra sale a tope —el VOR la
 * lleva a tope a diez—, y a cuarenta y cinco grados de cortada queda casi un
 * minuto hasta que se despega: lo que hace falta para oír qué se pide, leer
 * el número y girar la rueda.
 */
export const APARTADO = 30;
/** Lo que se tarda en llegar a la salida desde la radio, s: dos minutos y medio. */
export const DESDE_LA_RADIO = 150;
/**
 * **A qué distancia de la radio se empieza**, m: dos minutos y medio de vuelo,
 * y como poco cinco millas, que es lo que pedía la propuesta y donde está la
 * avioneta. Un reactor, más lejos: la barra se mueve con el ángulo y no con
 * los metros, y a doscientos cincuenta nudos cinco millas son un suspiro.
 */
export const CERCA = { min: 5 * MILLA, max: 12 * MILLA } as const;
/** Lo que se deja por encima del suelo más alto del camino, m: mil pies. */
const POR_ENCIMA_DEL_CAMINO = 1000 * 0.3048;

/**
 * **Lo que el viraje se come**, m: el radio de viraje por uno menos el coseno
 * del ángulo que se gira. Es la anticipación: con un viraje de `grados` a
 * régimen estándar (tres grados por segundo) a `velocidad`, el avión sigue
 * acercándose al radial eso mientras gira. Para quien lo lea, y la prueba.
 */
export function anticipacion(velocidad: number, grados = CORTADA): number {
  const radio = velocidad / (3 * GRADO);
  return radio * (1 - Math.cos(grados * GRADO));
}

export interface ColocacionDelCorte {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** Rumbo del morro, rad: cero al norte, positivo hacia el este. */
  readonly rumbo: number;
  /** **El radial pedido**, magnético con el norte de la estación, redondo. */
  readonly radial: number;
  /** Lo que lleva el OBS al empezar: el radial donde se está, de 1 a 360. */
  readonly curso: number;
  /** De la radio a la salida, m. */
  readonly lejos: number;
  /** De qué lado del pedido se empieza: 1, el de más grados; −1, el de menos. */
  readonly lado: 1 | -1;
}

/**
 * **Dónde empieza**: a cinco millas de la radio —o dos minutos y medio—,
 * alejándose, treinta grados apartado del radial pedido **del lado del que
 * viene el viento**, y con el morro a cuarenta y cinco grados de él,
 * cortándolo. Del lado del viento porque así el viento empuja hacia el radial:
 * el viraje para quedarse en él es mayor —se gira la cortada y además la
 * corrección— y quien no anticipa se pasa de verdad, que es la lección. En
 * calma, del lado de más grados.
 *
 * El OBS, en el radial donde se está, con la barra en el centro: como lo deja
 * la radio al salir. Lo primero es girarlo hasta el pedido.
 *
 * `viento` es hacia dónde va el aire, m/s, como lo usa el modelo de vuelo
 * (`vientoComoVector`). `declinacion` es la de la estación, que se suma al
 * verdadero para el magnético (`Emisora.declinacion`).
 */
export function colocacionDelCorte(o: {
  readonly estacion: PuntoDelMundo;
  readonly declinacion: number;
  readonly viento: PuntoDelMundo;
  readonly velocidad: number;
  /** El suelo, m sobre el mar, en un punto del mundo; el agua, cero. */
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDelCorte {
  const lejos = Math.min(CERCA.max, Math.max(CERCA.min, o.velocidad * DESDE_LA_RADIO));
  // El camino entero: la cortada y, después, el radial hasta dos veces más lejos.
  const pedido = radialDeCostadoAlViento({ ...o, lejos: 3 * lejos });
  const d = pedido.d;
  /*
   * De qué lado viene el viento, mirando hacia fuera por el radial: a la
   * derecha —más grados— si el aire va hacia la izquierda.
   */
  const derecha = { x: -d.z, z: d.x };
  const haciaLaDerecha = o.viento.x * derecha.x + o.viento.z * derecha.z;
  const lado: 1 | -1 = Math.hypot(o.viento.x, o.viento.z) > 0.1 && haciaLaDerecha > 0 ? -1 : 1;
  const donde = pedido.radial + lado * APARTADO;
  const r = (donde - o.declinacion) * GRADO;
  const x = o.estacion.x + Math.sin(r) * lejos;
  const z = o.estacion.z - Math.cos(r) * lejos;
  // Hacia fuera por el curso, y cuarenta y cinco grados hacia el radial.
  const curso = (pedido.radial - o.declinacion) * GRADO;
  const rumbo = curso - lado * CORTADA * GRADO;
  let alto = pedido.alto;
  for (let i = 0; i <= 12; i++) {
    const f = i / 12;
    // De la salida al radial, por la cortada.
    alto = Math.max(alto, o.suelo(x + Math.sin(rumbo) * lejos * f, z - Math.cos(rumbo) * lejos * f));
  }
  return {
    x,
    z,
    alto: Math.max(ALTURA_DEL_RADIAL, alto + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista),
    rumbo,
    radial: pedido.radial,
    curso: comoEnElObs(donde),
    lejos,
    lado,
  };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio necesita mirar del vuelo en cada paso. */
export interface LecturaDelCorte {
  readonly x: number;
  readonly z: number;
  readonly enElSuelo: boolean;
  /** Quieto en el suelo. */
  readonly parado: boolean;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
  /** Si la NAV tiene puesta la frecuencia de la estación del ejercicio, se oiga o no (H26m). */
  readonly sintonizada: boolean;
  /** El rumbo **verdadero** del avión, grados. */
  readonly rumbo: number;
  /** El curso del OBS, grados. */
  readonly curso: number;
  /** Lo que marca la NAV: `leerNav` con ese curso. */
  readonly desviacion: number | null;
  readonly toFrom: "TO" | "FROM" | null;
  readonly bandera: boolean;
}

export type CierreDelCorte =
  /** Establecido en el radial: lo que se practicaba. */
  | "hecho"
  /** Algo salió mal, o se aterrizó antes: se repite, como en el simulador. */
  | "otraVez";

export type SucesoDelCorte =
  /** Qué se va a hacer, y el número en la tarjeta. */
  | { readonly que: "presentar" }
  /** Se quitó el VOR de la NAV: volver a ponerlo. */
  | { readonly que: "sintonizar" }
  /** El OBS en el pedido y la barra a tope: el radial queda de ese lado. */
  | { readonly que: "aTope" }
  /** La barra se despega del tope: empezar a virar antes del centro. */
  | { readonly que: "seMueve" }
  /** La barra cruzó al otro lado: se pasó. `cuanto`, grados de barra. */
  | { readonly que: "pasado"; readonly cuanto: number }
  /**
   * Establecido: la barra en el centro y el morro cerca del curso.
   * `correccion`, lo que el morro va apartado del camino, grados con su signo
   * —positivo, a la derecha—: lo que pide el viento.
   */
  | { readonly que: "establecido"; readonly correccion: number }
  | { readonly que: "cerrar"; readonly como: CierreDelCorte };

export type FaseDelCorte = "obs" | "cortar" | "acercarse" | "cerrada";

/** **A tope**: la barra del VOR, a diez grados. Por debajo, se despega. */
export const A_TOPE = ESCALA_VOR;
/**
 * **Pasarse**: la barra al otro lado del centro más de un grado, que es salir
 * del centro (`EN_EL_CENTRO`) por el lado contrario. Quien empieza a virar en
 * cuanto la barra se despega no la cruza; quien vira con la barra ya en el
 * centro se pasa unos dos grados con la avioneta y uno y medio largo con un
 * reactor, que empieza más lejos (lo mide la prueba). Poco en grados, y es lo
 * que se ve: una décima de la escala, al otro lado.
 */
export const PASADO = 1;
/** **En el centro**: la barra a menos de un grado, como «centrada» en «¿En qué radial estoy?». */
export const EN_EL_CENTRO = 1;
/** **El morro cerca del curso**, grados: quince, más que cualquier corrección de viento del juego. */
export const MORRO_CERCA = 15;
/** **Establecido**: lo que la barra tiene que quedarse en el centro, s. */
export const ESTABLECIDO = 20;
/**
 * **Corrigiendo el viento**: el morro apartado del curso tres grados o más.
 * Menos no se distingue en el HSI de la cabina, y la instructora no señala lo
 * que no se ve.
 */
export const CORRIGE = 3;

export class InterceptarUnRadial {
  private faseActual: FaseDelCorte = "obs";
  private presentada = false;
  private estabaSintonizada = false;
  /** De qué lado estaba la barra al despegarse del tope: 1, derecha. */
  private lado: 1 | -1 | null = null;
  private dijoPasado = false;
  private pasadoMaximo = 0;
  /**
   * Lo que lleva la barra en el centro, s; lo que va sumando el morro
   * apartado del curso; y dónde estaba el avión cuando llegó, para el camino.
   */
  private enElCentro = 0;
  private morroSumado = 0;
  private desde: PuntoDelMundo | null = null;
  private comoCerro: CierreDelCorte | null = null;
  private correccionMedida: number | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** La estación: su frecuencia, su identificador y dónde está en el mundo. */
    readonly estacion: { readonly emisora: Emisora; readonly x: number; readonly z: number },
    /**
     * **El radial pedido**, magnético con el norte de la estación. Puede
     * llegar después (`pedir`): sale de la misma cuenta que dónde se empieza,
     * que necesita el terreno, y el juego monta el ejercicio antes que el
     * mundo. Sin él no se avanza.
     */
    private radialPedido: number | null = null,
  ) {}

  /** El radial que se pide, cuando ya se sabe. */
  pedir(radial: number): void {
    this.radialPedido = radial;
  }

  get pedido(): number | null {
    return this.radialPedido;
  }

  get fase(): FaseDelCorte {
    return this.faseActual;
  }

  get cierre(): CierreDelCorte | null {
    return this.comoCerro;
  }

  /** La corrección de viento que midió al quedar establecido, grados: lo mira el banco. */
  get correccion(): number | null {
    return this.correccionMedida;
  }

  /** Lo más que la barra se fue al otro lado, grados: lo mira el banco. */
  get loQueSePaso(): number {
    return this.pasadoMaximo;
  }

  /** El curso verdadero del radial pedido, grados: hacia fuera de la radio. */
  get cursoVerdadero(): number | null {
    return this.radialPedido === null ? null : this.radialPedido - this.estacion.emisora.declinacion;
  }

  /** Si esta frecuencia es la de la estación del ejercicio. */
  esLaEstacion(mhz: number | null): boolean {
    return mhz !== null && emisorasEn("nav", mhz, [this.estacion.emisora]).length > 0;
  }

  /** Otra vez desde el principio, como en el simulador. */
  reiniciar(): void {
    this.faseActual = "obs";
    this.presentada = false;
    this.estabaSintonizada = false;
    this.lado = null;
    this.dijoPasado = false;
    this.pasadoMaximo = 0;
    this.enElCentro = 0;
    this.morroSumado = 0;
    this.desde = null;
    this.comoCerro = null;
    this.correccionMedida = null;
  }

  paso(l: LecturaDelCorte, dt: number): SucesoDelCorte[] {
    const sucesos: SucesoDelCorte[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }

    /*
     * **La NAV empieza con el VOR puesto**, como la deja la salida: aquí no se
     * practica identificar, que ya lo enseñaron los dos de antes. Si se quita,
     * se pide una vez; un aviso vuelve cuando cambia algo que pasa, no cuando
     * pasa un rato.
     */
    const quitada = this.estabaSintonizada && !l.sintonizada;
    this.estabaSintonizada = l.sintonizada;
    if (quitada) sucesos.push({ que: "sintonizar" });

    /*
     * **Solo cuenta la barra del radial pedido**: con el OBS en otro número, o
     * con TO, la barra dice otra cosa, y esperar a que se ponga es la mitad de
     * la lección.
     */
    const d = l.desviacion;
    const cursoVerdadero = this.cursoVerdadero;
    const enElPedido = l.sintonizada && l.curso === this.radialPedido && l.toFrom === "FROM" && !l.bandera;
    if (!enElPedido || d === null || cursoVerdadero === null) {
      this.olvidarElCentro();
      return sucesos;
    }

    if (this.faseActual === "obs") {
      if (Math.abs(d) >= A_TOPE) {
        this.faseActual = "cortar";
        sucesos.push({ que: "aTope" });
        return sucesos;
      }
      // Con el OBS puesto tarde, la barra ya se había despegado.
      this.faseActual = "cortar";
    }
    if (this.faseActual === "cortar") {
      if (Math.abs(d) >= A_TOPE) return sucesos;
      this.faseActual = "acercarse";
      this.lado = d >= 0 ? 1 : -1;
      sucesos.push({ que: "seMueve" });
    }

    /*
     * **Pasarse** es ver la barra al otro lado del centro más de `PASADO`. Se
     * dice una vez: quien vuelve y la persigue de un lado a otro ya sabe lo que
     * pasa, y repetirlo sería reñirle.
     */
    const lado = this.lado ?? 1;
    if (Math.sign(d) === -lado) {
      this.pasadoMaximo = Math.max(this.pasadoMaximo, Math.abs(d));
      if (!this.dijoPasado && Math.abs(d) > PASADO) {
        this.dijoPasado = true;
        sucesos.push({ que: "pasado", cuanto: Math.abs(d) });
      }
    }

    /*
     * **Establecido**: la barra en el centro y el morro cerca del curso, de
     * seguido. **La corrección del viento es lo que el morro va apartado del
     * camino**, no del curso: quien todavía se está acercando a la barra
     * lleva el morro unos grados hacia ella, también en calma, y eso no es
     * viento. Así que se promedia el morro en ese rato y se le resta hacia
     * dónde fue de verdad el avión, que es la definición de la deriva.
     */
    const morro = centrado(l.rumbo - cursoVerdadero);
    if (Math.abs(d) < EN_EL_CENTRO && Math.abs(morro) < MORRO_CERCA) {
      this.desde ??= { x: l.x, z: l.z };
      this.enElCentro += dt;
      this.morroSumado += morro * dt;
    } else this.olvidarElCentro();
    if (this.enElCentro >= ESTABLECIDO && this.desde) {
      const camino = Math.atan2(l.x - this.desde.x, -(l.z - this.desde.z)) / GRADO;
      const correccion = centrado(this.morroSumado / this.enElCentro - centrado(camino - cursoVerdadero));
      this.correccionMedida = correccion;
      sucesos.push({ que: "establecido", correccion });
      this.cerrar("hecho", sucesos);
    }
    return sucesos;
  }

  private olvidarElCentro(): void {
    this.enElCentro = 0;
    this.morroSumado = 0;
    this.desde = null;
  }

  private cerrar(como: CierreDelCorte, sucesos: SucesoDelCorte[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}
