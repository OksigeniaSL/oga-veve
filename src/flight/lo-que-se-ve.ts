/**
 * Cuándo se señala lo que se ve por la ventanilla.
 *
 * La geometría —qué hay cerca y por qué lado— está en `world/hitos.ts`. Aquí
 * está lo otro, que es lo que hace que esto sea una comandante y no un
 * locutor: **el momento**.
 *
 * Cuatro reglas, y las cuatro salen de cómo se comporta una de verdad:
 *
 * 1. **En crucero y con altura.** Nadie señala el paisaje mientras sube o
 *    mientras mete el avión en el circuito. Ahí hay otra cosa que hacer, y
 *    quien juega también.
 * 2. **De uno en uno y con su rato.** Una cosa cada minuto y pico. Seguidas
 *    no se oye ninguna.
 * 3. **Nunca encima de nadie.** Si habla la instructora, la torre o la propia
 *    comandante, esto espera. Es lo que menos urge de todo lo que suena.
 * 4. **Cada sitio una vez por vuelo.** Volver a nombrar el Teide diez minutos
 *    después no enseña nada y delata la máquina.
 *
 * Y una quinta que no es de comportamiento sino de criterio: esto **no habla
 * en la aproximación**. Un vuelo termina mirando la pista.
 */

import { queSeVe, type Hito, type Mirada } from "../world/hitos";
import type { Fase } from "./vuelo";

/**
 * Desde qué altura sobre el campo se empieza a mirar por la ventanilla, m.
 *
 * Seiscientos. Por debajo de eso se está subiendo o bajando, y lo que hay que
 * mirar es otra cosa. No es una cota de seguridad: es que a doscientos metros
 * no se ve un volcán a veinte kilómetros, se ve la ladera de al lado.
 */
export const DESDE_ARRIBA = 600;

/**
 * Cuánto se deja entre una cosa y la siguiente, s.
 *
 * Noventa segundos. Medido contra el vuelo que lo pedía —Tenerife Norte a
 * Tenerife Sur, unos veinte minutos de crucero— eso son doce o trece huecos:
 * de sobra para los hitos que hay, y lo bastante espaciado para que cada uno
 * se oiga como una cosa que pasa y no como una lista.
 */
export const CADA = 90;

/**
 * Y lo primero, no nada más nivelar.
 *
 * Al nivelar habla la comandante —«ya pueden soltarse el cinturón»— y pisarle
 * el turno con «a la izquierda, el Teide» es exactamente lo que se arregló en
 * las voces. Treinta segundos después el cielo ya es cielo.
 */
export const LO_PRIMERO = 30;

export interface MomentoDeMirar {
  readonly fase: Fase;
  readonly x: number;
  readonly z: number;
  /** Rumbo verdadero, en grados. */
  readonly rumbo: number;
  /** Altura sobre el campo, m. */
  readonly sobreElCampo: number;
  /** Si hay alguna voz sonando ahora mismo. */
  readonly alguienHabla: boolean;
}

/** Las fases en las que se mira por la ventanilla: solo la de ir volando. */
const DE_CRUCERO = new Set<Fase>(["en-vuelo"]);

export class LoQueSeVe {
  private reloj = 0;
  private readonly dichos = new Set<string>();

  constructor(private hitos: readonly Hito[] = []) {}

  /** Otro escenario, otros hitos. Y lo dicho se queda dicho de aquel vuelo. */
  ponerHitos(hitos: readonly Hito[]): void {
    this.hitos = hitos;
    this.reiniciar();
  }

  /** Vuelo nuevo: se vuelve a poder señalar todo. */
  reiniciar(): void {
    this.reloj = 0;
    this.dichos.clear();
  }

  /** Cuántos van dichos. Para los bancos y para las pruebas. */
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
   * El reloj **no corre fuera del crucero**, y eso es a propósito: si corriera,
   * un vuelo que pasa media hora en el suelo llegaría arriba con el hueco ya
   * gastado y soltaría la primera frase de golpe.
   */
  /**
   * `deAhora` son los que **se mueven** —un barco, otro avión—, que no están
   * en la lista del escenario porque no se quedan quietos. Se pide solo
   * cuando toca mirar, y no en cada fotograma, que es cuando hace falta
   * saber dónde están. Siguen las mismas cuatro reglas: en crucero, de uno en
   * uno, sin pisar a nadie y **una vez por vuelo** cada nombre — un barco se
   * señala una vez, no cada barco que pase.
   */
  paso(
    dt: number,
    momento: MomentoDeMirar,
    deAhora?: () => readonly Hito[],
  ): Mirada | null {
    if (!DE_CRUCERO.has(momento.fase) || momento.sobreElCampo < DESDE_ARRIBA) {
      this.reloj = 0;
      return null;
    }
    this.reloj += dt;
    const espera = this.dichos.size === 0 ? LO_PRIMERO : CADA;
    if (this.reloj < espera) return null;
    // Y si hay alguien hablando, se espera: el reloj ya está cumplido, así que
    // sale en cuanto se calle. Esto es lo que menos urge de todo lo que suena.
    if (momento.alguienHabla) return null;
    const moviles = deAhora?.() ?? [];
    const mirada = queSeVe(
      moviles.length ? [...this.hitos, ...moviles] : this.hitos,
      { x: momento.x, z: momento.z, rumbo: momento.rumbo },
      this.dichos,
    );
    if (!mirada) return null;
    this.dichos.add(mirada.hito.nombre);
    this.reloj = 0;
    return mirada;
  }
}
