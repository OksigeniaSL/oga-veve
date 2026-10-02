/**
 * Cuándo se señala lo que se ve por la ventanilla.
 *
 * La geometría —qué hay cerca, si se ve y por qué lado— está en
 * `world/hitos.ts`. Aquí está lo otro, que es lo que hace que esto sea una
 * comandante y no un locutor: **el momento**.
 *
 * Cinco reglas, y las cinco salen de cómo se comporta una de verdad:
 *
 * 1. **Fuera de las fases de trabajo.** Ni en el despegue, ni en la
 *    aproximación, ni por debajo de diez mil pies cerca del campo: es la
 *    cabina estéril, la regla de verdad por la que en esos ratos nadie habla
 *    de nada que no sea el vuelo. Ver `DIEZ_MIL_PIES` y `CERCA_DEL_CAMPO`.
 * 2. **De uno en uno y con su rato.** Una cosa cada par de minutos. Seguidas
 *    no se oye ninguna, y una comandante que habla cada minuto es una radio.
 * 3. **Nunca encima de nadie.** Si habla la instructora, la torre, la voz de
 *    la máquina o la propia megafonía, esto espera. Es lo que menos urge de
 *    todo lo que suena: un suceso, una voz.
 * 4. **Cada sitio una vez por vuelo.** Volver a nombrar el Teide diez minutos
 *    después no enseña nada y delata la máquina.
 * 5. **Solo lo que se ve**, que no es una regla de tiempo pero se decide
 *    aquí: el relieve se le pregunta a quien lo sabe —ver `ponerSuelo`—, y
 *    las nubes, a la capa del parte —ver `ponerNubes`—.
 */

import type { CapaDeNubes } from "../world/capa-de-nubes";
import { queSeVe, type Hito, type Mirada } from "../world/hitos";
import type { Fase } from "./vuelo";

/**
 * Desde qué altura sobre el campo se empieza a mirar por la ventanilla, m.
 *
 * Seiscientos. Por debajo de eso se está subiendo o bajando, y lo que hay que
 * mirar es otra cosa. Vale para la avioneta, que no llega a los diez mil pies
 * y tiene su propia cabina estéril más pequeña; ver `CERCA_DEL_CAMPO`.
 */
export const DESDE_ARRIBA = 600;

/**
 * **Diez mil pies**, en metros: el techo de la cabina estéril.
 *
 * Es la regla de verdad —la de la FAA y la de EASA, escrita en todos los
 * manuales de operaciones—: por debajo de diez mil pies, en la salida y en la
 * llegada, en la cabina solo se habla del vuelo. Y la comandante no se pone a
 * contar el paisaje por la megafonía, que es lo que se oía subiendo de Los
 * Rodeos.
 */
export const DIEZ_MIL_PIES = 3048;

/**
 * **Y qué es «cerca del campo»**, m: con pasaje y en avioneta.
 *
 * Treinta kilómetros con pasaje, unas dieciséis millas: es donde se vuelan
 * las salidas y las llegadas publicadas de un campo de línea, y la parte de un
 * salto corto entre islas que se hace por debajo de diez mil pies y lejos de
 * los dos campos es crucero de verdad.
 *
 * Ocho en avioneta: fuera del circuito de tráfico, que es su fase de trabajo.
 * Una avioneta no sube a diez mil pies, y con la regla de los aviones grandes
 * la instructora no diría nunca nada.
 */
export const CERCA_DEL_CAMPO = { conPasaje: 30_000, enAvioneta: 8_000 };

/**
 * Cuánto se deja entre una cosa y la siguiente, s.
 *
 * Dos minutos. De Los Rodeos a La Palma, con las fases de trabajo fuera, se
 * mira por la ventanilla unos ocho: tres o cuatro cosas, que es lo que cuenta
 * una comandante en un salto así. Con noventa segundos eran seis, y la
 * sensación era de visita guiada.
 */
export const CADA = 120;

/**
 * Y lo primero, no nada más poder.
 *
 * Al pasar los diez mil pies habla la comandante —«ya pueden soltarse el
 * cinturón»— y pisarle el turno con «a la izquierda, el Teide» es exactamente
 * lo que se arregló en las voces. Treinta segundos después el cielo ya es
 * cielo.
 */
export const LO_PRIMERO = 30;

/**
 * Cada cuánto se mira, una vez cumplido el rato, s.
 *
 * Mirar es recorrer la línea de vista contra el relieve, y no hace falta cada
 * fotograma: en un segundo el avión avanza doscientos metros y el paisaje no
 * cambia.
 */
export const MIRAR_CADA = 1;

export interface MomentoDeMirar {
  readonly fase: Fase;
  readonly x: number;
  readonly z: number;
  /** Rumbo verdadero, en grados. */
  readonly rumbo: number;
  /** Altitud, m sobre el mar. */
  readonly altitud: number;
  /** Altura sobre el campo, m. */
  readonly sobreElCampo: number;
  /** A cuánto está el campo más cercano del vuelo, m. */
  readonly alCampo: number;
  /** Si el avión lleva pasaje: cambia qué es «cerca del campo». */
  readonly conPasaje: boolean;
  /** Si hay alguna voz sonando ahora mismo. */
  readonly alguienHabla: boolean;
}

/** Las fases en las que se mira por la ventanilla: solo la de ir volando. */
const DE_CRUCERO = new Set<Fase>(["en-vuelo"]);

/**
 * **Si ahora es una fase de trabajo**: la cabina estéril y lo que no es
 * crucero. Ver la cabecera.
 */
export function enFaseDeTrabajo(m: MomentoDeMirar): boolean {
  if (!DE_CRUCERO.has(m.fase) || m.sobreElCampo < DESDE_ARRIBA) return true;
  const cerca = m.conPasaje
    ? CERCA_DEL_CAMPO.conPasaje
    : CERCA_DEL_CAMPO.enAvioneta;
  return m.altitud < DIEZ_MIL_PIES && m.alCampo < cerca;
}

export class LoQueSeVe {
  private reloj = 0;
  private mirado = 0;
  private readonly dichos = new Set<string>();
  private suelo: ((x: number, z: number) => number | null) | null = null;
  private capa: CapaDeNubes | null = null;

  constructor(private hitos: readonly Hito[] = []) {}

  /** Otro escenario, otros hitos. Y lo dicho se queda dicho de aquel vuelo. */
  ponerHitos(hitos: readonly Hito[]): void {
    this.hitos = hitos;
    this.reiniciar();
  }

  /**
   * **El relieve, para saber qué se ve.** Sin él se señala lo que cae a un
   * lado aunque haya una cordillera en medio, que es lo que pasaba con
   * Candelaria detrás de la Dorsal.
   */
  ponerSuelo(suelo: ((x: number, z: number) => number | null) | null): void {
    this.suelo = suelo;
  }

  /**
   * **La capa de nubes, para no anunciar lo tapado.** «No tiene sentido que
   * Jazlyn diga que miren por la ventanilla para ver las dunas de Maspalomas
   * si hay nubes debajo: no se vería nada.» Ver `laCapaTapa`.
   */
  ponerNubes(capa: CapaDeNubes | null): void {
    this.capa = capa;
  }

  /** Vuelo nuevo: se vuelve a poder señalar todo. */
  reiniciar(): void {
    this.reloj = 0;
    this.mirado = 0;
    this.dichos.clear();
  }

  /** Cuántos van dichos. Para los bancos, las pruebas y la frase de saludo. */
  get cuantos(): number {
    return this.dichos.size;
  }

  /**
   * Los que ya se han señalado en este vuelo.
   *
   * Lo mira el mapa: un sitio que la comandante ha nombrado **aparece escrito
   * en el plano**, y los que no, solo con su dibujo. Así el mapa se va
   * llenando de nombres a medida que se vuela, y nunca obliga a leer para
   * saber dónde está uno. Ver `ui/mapa.ts`.
   */
  get yaDichos(): ReadonlySet<string> {
    return this.dichos;
  }

  /**
   * Un fotograma. Devuelve lo que toca señalar, o `null`, que es lo normal.
   *
   * El reloj **no corre en las fases de trabajo**, y eso es a propósito: si
   * corriera, un vuelo que pasa media hora en el suelo llegaría arriba con el
   * hueco ya gastado y soltaría la primera frase de golpe.
   *
   * `deAhora` son los que **se mueven** —un barco, otro avión—, que no están
   * en la lista del escenario porque no se quedan quietos. Se pide solo
   * cuando toca mirar, y no en cada fotograma, que es cuando hace falta
   * saber dónde están. Siguen las mismas reglas: fuera de las fases de
   * trabajo, de uno en uno, sin pisar a nadie y **una vez por vuelo** cada
   * nombre — un barco se señala una vez, no cada barco que pase.
   */
  paso(
    dt: number,
    momento: MomentoDeMirar,
    deAhora?: () => readonly Hito[],
  ): Mirada | null {
    if (enFaseDeTrabajo(momento)) {
      this.reloj = 0;
      return null;
    }
    this.reloj += dt;
    const espera = this.dichos.size === 0 ? LO_PRIMERO : CADA;
    if (this.reloj < espera) return null;
    // Y si hay alguien hablando, se espera: el reloj ya está cumplido, así que
    // sale en cuanto se calle. Esto es lo que menos urge de todo lo que suena.
    if (momento.alguienHabla) return null;
    this.mirado += dt;
    if (this.mirado < MIRAR_CADA) return null;
    this.mirado = 0;
    const moviles = deAhora?.() ?? [];
    const mirada = queSeVe(
      moviles.length ? [...this.hitos, ...moviles] : this.hitos,
      { x: momento.x, z: momento.z, rumbo: momento.rumbo, y: momento.altitud },
      this.dichos,
      this.suelo,
      this.capa,
    );
    if (!mirada) return null;
    this.dichos.add(mirada.hito.nombre);
    this.reloj = 0;
    return mirada;
  }
}
