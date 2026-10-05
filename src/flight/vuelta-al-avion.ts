/**
 * **La vuelta al avión**: lo que se mira antes de volar, y en qué orden.
 *
 * El punto 125 de la lista de Enrique: «la vuelta al avión antes de volar
 * (inspección prevuelo): calzos, la funda roja del pitot, el combustible, las
 * luces. Tocar cosas, real, sin leer». Todo piloto la hace antes de cada
 * vuelo, rodeando el avión a pie y tocando con la mano lo que se mira, y es
 * de lo poco del oficio que se puede hacer sin saber volar.
 *
 * ## Lo que se mira es lo de verdad, según la clase
 *
 * - **Avioneta**: la lista de la inspección prevuelo del manual de vuelo del
 *   Cessna 172 —sección 4, *Preflight Inspection*—, que es la de su clase y la
 *   que trae cualquier escuela: quitar la funda del pitot (*Pitot Tube Cover —
 *   REMOVE*), las superficies de la cola que se muevan libres (*Control
 *   Surfaces — CHECK freedom of movement*), la rueda y los calzos, el
 *   combustible mirado por la boca del ala y purgado (*Fuel Quantity — CHECK
 *   VISUALLY*, *Fuel Tank Sump Quick Drain Valves — DRAIN*), el aceite con su
 *   varilla (*Engine Oil Dipstick — CHECK*), la hélice sin mellas (*Propeller
 *   and Spinner — CHECK for nicks*) y las luces. El bimotor de su clase —el
 *   Seneca— lleva la misma lista con dos motores.
 * - **Avión de línea**: la vuelta exterior del manual de operaciones de
 *   Boeing y de Airbus —*Exterior Inspection* del FCOM del 737, *Exterior
 *   Walkaround* del de la familia A320—: las sondas sin daños y sin sus
 *   fundas, las ruedas y los frenos con su indicador de desgaste, las tomas y
 *   las salidas de los motores libres, las luces, y las puertas y los paneles
 *   que no se usan, cerrados. El combustible de un avión de línea no se mira
 *   por una boca: se mira en cabina, y por eso aquí no está.
 *
 * El orden es el del manual de cada clase: el del 172 empieza por la funda
 * del pitot y sigue por la cola, el ala de la derecha, el morro y el ala de la
 * izquierda; el de línea va del morro a la cola.
 *
 * ## Y quien no quiera, no la hace
 *
 * Es opcional, y no se gana ni se pierde nada por hacerla o no. Si no se
 * hace, la hizo la instructora: al arrancar quita lo que quede puesto. **Si se
 * empieza, es de quien la empieza**: lo que se deje puesto se queda puesto, y
 * la funda del pitot olvidada tiene su consecuencia de verdad —el anemómetro
 * no marca en la carrera—. Salvo en el peldaño de los pequeños, donde esto es
 * un juego de tocar cosas y la instructora quita siempre lo que quede. Ver
 * `flight/anemometro-tapado.ts`.
 *
 * Esto es lógica pura: no dibuja, no suena y no sabe del juego.
 */

import type { Peldano } from "./escalera";
import type { Silueta } from "./flota";

/** Las dos vueltas que hay: la de la avioneta y la del avión de línea. */
export type ClaseDeVuelta = "avioneta" | "linea";

/**
 * De qué clase es la vuelta de un avión, por su silueta: las tres de hélice
 * ligeras hacen la del manual de la avioneta; el turbohélice de pasaje y los
 * reactores, la del manual de línea.
 */
export function claseDeVuelta(silueta: Silueta | null | undefined): ClaseDeVuelta {
  return silueta === "ala-alta" || silueta === "biplano" || silueta === "bimotor-ala-baja"
    ? "avioneta"
    : "linea";
}

/** Lo que se mira, cada cosa una vez. */
export type CosaDeLaVuelta =
  // La avioneta
  | "pitot"
  | "superficies"
  | "calzos"
  | "combustible"
  | "aceite"
  | "helice"
  // El de línea
  | "sondas"
  | "frenos"
  | "motores"
  | "puertas"
  // Los dos
  | "luces";

/** Lo que se mira, en el orden del manual de cada clase. Ver la cabecera. */
export const LO_QUE_SE_MIRA: Readonly<Record<ClaseDeVuelta, readonly CosaDeLaVuelta[]>> = {
  avioneta: ["pitot", "superficies", "calzos", "combustible", "aceite", "helice", "luces"],
  linea: ["sondas", "frenos", "motores", "luces", "puertas"],
};

/**
 * **Las cosas de esta vuelta**, quitando las que este avión no tiene.
 *
 * `hay` dice si el avión tiene dónde mirar cada una —la pieza en su modelo—.
 * El biplano fumigador lleva pitot, pero en un sitio distinto en cada taller y
 * sin uno que sea «el suyo» —ver `sitioDelPitot` en `world/puntos-del-avion`—,
 * así que su vuelta no lo señala: mejor sin punto que en uno que no es.
 */
export function cosasDeLaVuelta(
  clase: ClaseDeVuelta,
  hay: (c: CosaDeLaVuelta) => boolean = () => true,
): CosaDeLaVuelta[] {
  return LO_QUE_SE_MIRA[clase].filter(hay);
}

/** Las que llevan una funda que hay que quitar. */
export const LLEVA_FUNDA: ReadonlySet<CosaDeLaVuelta> = new Set(["pitot", "sondas"]);

/** Lo que pasa al arrancar el motor con la vuelta como esté. */
export interface AlArrancar {
  /** Si la funda se queda puesta: entonces el anemómetro no marcará. */
  readonly fundaOlvidada: boolean;
  /** Si la instructora quitó algo que quedaba. */
  readonly quitoLaInstructora: boolean;
}

/**
 * La vuelta de un vuelo: qué se ha mirado y qué queda puesto.
 *
 * La funda y los calzos **están puestos** al empezar en el puesto, que es como
 * está un avión aparcado. Se quitan tocándolos o, si nadie hizo la vuelta, los
 * quita la instructora al arrancar.
 */
export class VueltaAlAvion {
  readonly clase: ClaseDeVuelta;
  readonly cosas: readonly CosaDeLaVuelta[];
  private readonly hechas = new Set<CosaDeLaVuelta>();
  private empezadaYa = false;
  private fundaPuestaYa: boolean;
  private calzosPuestosYa: boolean;

  constructor(clase: ClaseDeVuelta, cosas: readonly CosaDeLaVuelta[]) {
    this.clase = clase;
    this.cosas = cosas;
    this.fundaPuestaYa = cosas.some((c) => LLEVA_FUNDA.has(c));
    this.calzosPuestosYa = cosas.includes("calzos");
  }

  /** Si alguien la ha empezado: desde ahí es suya. */
  get empezada(): boolean {
    return this.empezadaYa;
  }

  get fundaPuesta(): boolean {
    return this.fundaPuestaYa;
  }

  get calzosPuestos(): boolean {
    return this.calzosPuestosYa;
  }

  /** Si ya se miró. */
  hecha(c: CosaDeLaVuelta): boolean {
    return this.hechas.has(c);
  }

  /** Cuántas se han mirado. */
  get cuantas(): number {
    return this.hechas.size;
  }

  /** Si ya se miró todo. */
  get entera(): boolean {
    return this.cosas.every((c) => this.hechas.has(c));
  }

  /** La primera que queda por mirar, en el orden del manual. */
  get siguiente(): CosaDeLaVuelta | null {
    return this.cosas.find((c) => !this.hechas.has(c)) ?? null;
  }

  /** Se abre la vuelta. */
  empezar(): void {
    this.empezadaYa = true;
  }

  /**
   * Se toca una cosa. Devuelve `true` si es la primera vez: lo que responde
   * —la funda que sale volando, el calzo que se aparta— pasa una sola vez;
   * tocarla otra vez solo la vuelve a enseñar.
   */
  tocar(c: CosaDeLaVuelta): boolean {
    if (!this.cosas.includes(c)) return false;
    this.empezadaYa = true;
    if (LLEVA_FUNDA.has(c)) this.fundaPuestaYa = false;
    if (c === "calzos") this.calzosPuestosYa = false;
    if (this.hechas.has(c)) return false;
    this.hechas.add(c);
    return true;
  }

  /**
   * **Se arranca el motor.** Si nadie empezó la vuelta, o se está en el
   * peldaño de los pequeños, la instructora quita lo que quede: los calzos y
   * la funda. Si alguien la empezó en los demás, la funda que quede se queda.
   *
   * Los calzos los quita siempre quien está abajo: un avión no rueda con
   * ellos puestos, y en la escuela y en la plataforma de un aeropuerto hay
   * siempre alguien que los saca antes de que el avión se mueva.
   */
  alArrancar(peldano: Peldano): AlArrancar {
    const habia = this.fundaPuestaYa || this.calzosPuestosYa;
    this.calzosPuestosYa = false;
    const deQuien = this.empezadaYa && peldano !== "dibujo";
    if (!deQuien) this.fundaPuestaYa = false;
    return {
      fundaOlvidada: this.fundaPuestaYa,
      quitoLaInstructora: habia && !this.fundaPuestaYa,
    };
  }

  /**
   * **La funda se quita**, sin tocarla en la vuelta: lo hace el juego cuando el
   * vuelo vuelve a empezar en un sitio donde no hay puesto, o cuando se sale
   * de él sin pasar por aquí.
   */
  quitarLaFunda(): void {
    this.fundaPuestaYa = false;
  }
}
