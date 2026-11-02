/**
 * **La consola de la pantalla del asiento de delante**: lo que se toca de ella.
 *
 * Lo que la pantalla pinta vive en `world/pantalla-del-respaldo.ts`; aquí solo se
 * decide qué se ofrece y qué está abierto, sin DOM ni audio, como el kit. El dibujo
 * va en `ui/consola-del-asiento.ts` y lo que pasa con la conversación y con los
 * planos, en `MotorDelPasaje`.
 *
 * ## Solo donde hay pantalla
 *
 * Es de lo que va montado en el asiento, no del vuelo: el JAZ 90 y los regionales
 * no llevan pantallas en los respaldos, y ahí no sale nada (ver `disposicionDelPasaje`
 * en `flight/aircraft.ts`). Y el guion dice desde cuándo: la apertura del capítulo 3
 * es un cuento con láminas, y un botón encima de una lámina no es la pantalla de
 * ningún asiento.
 *
 * ## Los modos, por peldaño
 *
 * Las cuatro cosas que se miran sin leer van para todos. Los datos del vuelo son
 * cifras con su rótulo, y las cifras con nombre entran en Taguato (`flight/escalera.ts`):
 * los dos peldaños de abajo no los ven. Decidido, no se pregunta.
 *
 * ## Se recoge, y con red
 *
 * A los diez mil pies bajando, o antes si el guion lo dice —en la noche, al bajar las
 * luces—, el motor le pide a esto que se recoja, y el dibujo contesta cuando ya ha
 * guardado lo suyo. Si no contesta —un HUD rehecho, un dibujo que se cayó—,
 * `TOPE_DE_RECOGER` la cierra igual: una espera entre dos sistemas lleva siempre su
 * red, y nadie se queda mirando un mapa con el avión en la final.
 */

import type { Linea } from "./conversacion";
import { canalesDe, type Peldano } from "./escalera";
import type { ModoDeLaPantalla } from "../world/pantalla-del-respaldo";

/** Las cuatro pestañas, en el orden en que salen. */
export type PestanaDeLaConsola = "mapa" | "juegos" | "cuentos" | "cuaderno";
export const PESTANAS: readonly PestanaDeLaConsola[] = ["mapa", "juegos", "cuentos", "cuaderno"];

/** Lo que se le ofrece a todos. */
export const MODOS_PARA_TODOS: readonly ModoDeLaPantalla[] = ["mapa", "cerca", "pelota", "relojes"];

/** **Los modos que se ofrecen en un peldaño.** Ver la cabecera. */
export function modosDe(peldano: Peldano): readonly ModoDeLaPantalla[] {
  return canalesDe(peldano).cifra ? [...MODOS_PARA_TODOS, "datos"] : MODOS_PARA_TODOS;
}

/**
 * **Los cuentos del camino**: las historias ilustradas de lo que este vuelo tiene
 * debajo o encima, las del plan del largo radio (4.1). Las otras dieciocho también
 * están grabadas, pero son de otras rutas. Que cada una tenga su dibujo y su voz lo
 * mira quien las ofrece: ver `Game.cuentosQueSeOfrecen`.
 */
export const CUENTOS_DEL_CAMINO = ["hierro", "cruz-del-sur", "rio-paraguay", "chaco", "asuncion", "ypacarai", "cerro-cora"] as const;
export type CuentoDelCamino = (typeof CUENTOS_DEL_CAMINO)[number];

/** La clave de lo que cuenta un sitio: la de la historia de siempre, con su grabación. */
export const claveDelCuento = (sitio: string): string => `ventanilla.historia.${sitio}`;

/**
 * **Lo que suena al tocar un cuento**: la voz de la comandante, sin el altavoz del
 * techo. Sale de la pantalla del asiento y le habla a quien la mira; por la
 * megafonía sería un anuncio, y un cuento no para nada, lo paran a él.
 */
export const lineaDelCuento = (sitio: string): Linea => ({ quien: "mama", clave: claveDelCuento(sitio) });

/** Si una frase es de un cuento de la consola. */
export const esDeUnCuento = (l: Linea | null | undefined): boolean => !!l && l.clave.startsWith("ventanilla.historia.");

/**
 * **Lo que espera la consola a que el dibujo conteste al recogerse**, s de pared.
 * El dibujo contesta en el fotograma siguiente: esto no es un rato de esperar, es
 * la red. Ver la cabecera.
 */
export const TOPE_DE_RECOGER = 3;

/** Lo que se ve de la consola: para el dibujo, el banco y las pruebas. */
export interface EstadoDeLaConsola {
  /** Si el botón se puede tocar ahora. */
  readonly sale: boolean;
  readonly abierta: boolean;
  /** Si el motor ya la pidió recoger y el dibujo no ha contestado. */
  readonly recogiendo: boolean;
  /** Si ya pasaron los diez mil pies bajando: en este vuelo no vuelve. */
  readonly recogida: boolean;
  /** Si se abrió alguna vez: el botón deja de latir. */
  readonly vista: boolean;
  readonly pestana: PestanaDeLaConsola;
  readonly modo: ModoDeLaPantalla;
  /** El cuento que se está mirando, o `null` con la lista delante. */
  readonly cuento: string | null;
  /** Si habla la megafonía: lo que se mira se apaga y se ve el altavoz. */
  readonly escuchando: boolean;
  /** Si la red de `TOPE_DE_RECOGER` tuvo que actuar. Para el banco y las pruebas. */
  readonly porElTope: boolean;
}

export class ConsolaDelAsiento {
  private puedeSalir = false;
  private abierta = false;
  private vista = false;
  private recogida = false;
  private recogiendoDesde: number | null = null;
  private porElTope = false;
  private pestana: PestanaDeLaConsola = "mapa";
  private modo: ModoDeLaPantalla = "mapa";
  private cuento: string | null = null;
  private escuchando = false;

  get estado(): EstadoDeLaConsola {
    return {
      sale: this.puedeSalir && !this.recogida,
      abierta: this.abierta,
      recogiendo: this.recogiendoDesde !== null,
      recogida: this.recogida,
      vista: this.vista,
      pestana: this.pestana,
      modo: this.modo,
      cuento: this.cuento,
      escuchando: this.escuchando,
      porElTope: this.porElTope,
    };
  }

  get estaAbierta(): boolean {
    return this.abierta;
  }

  get pestanaDeAhora(): PestanaDeLaConsola {
    return this.pestana;
  }

  get modoDeAhora(): ModoDeLaPantalla {
    return this.modo;
  }

  get cuentoDeAhora(): string | null {
    return this.cuento;
  }

  /** Se toca el botón: Ara mira su pantalla. Siempre por el mapa, que es lo que se ve al mirarla. */
  abrir(): void {
    if (!this.puedeSalir || this.recogida || this.abierta) return;
    this.abierta = true;
    this.vista = true;
    this.pestana = "mapa";
  }

  /** Se toca la ventanilla: se vuelve a mirar afuera. Lo que se estaba haciendo se queda donde estaba. */
  cerrar(): void {
    this.abierta = false;
    this.pestana = "mapa";
    this.cuento = null;
  }

  elegir(p: PestanaDeLaConsola): void {
    if (!this.abierta || this.recogiendoDesde !== null) return;
    this.pestana = p;
    if (p !== "cuentos") this.cuento = null;
  }

  /** Un modo de la pantalla, si se le ofrece a este peldaño. */
  ponerModo(m: ModoDeLaPantalla, peldano: Peldano): void {
    if (modosDe(peldano).includes(m)) this.modo = m;
  }

  /**
   * **El guion pone lo que enseña la pantalla**, sin mirar el peldaño: lo que cuenta con
   * ella delante es para todos, y solo pide modos que se miran sin leer.
   */
  ensenar(m: ModoDeLaPantalla): void {
    this.modo = m;
  }

  /** Se toca un cuento. Quién lo cuenta y cuándo lo decide la conversación del motor. */
  mirarElCuento(sitio: string): void {
    if (!this.abierta || this.recogiendoDesde !== null) return;
    this.pestana = "cuentos";
    this.cuento = sitio;
  }

  /** Se acabó de contar, o se tocó «atrás»: otra vez la lista. */
  dejarElCuento(): void {
    this.cuento = null;
  }

  /**
   * **Un paso**: si el botón sale, si habla la megafonía y la red de la espera. Lo
   * lleva el motor, que es quien sabe lo que se ha dicho y por dónde va el vuelo.
   */
  paso(s: { readonly sale: boolean; readonly escuchando: boolean; readonly pared: number }): void {
    this.puedeSalir = s.sale;
    this.escuchando = this.abierta && s.escuchando;
    if (this.recogiendoDesde !== null && s.pared - this.recogiendoDesde >= TOPE_DE_RECOGER) {
      this.porElTope = true;
      this.acabarDeRecoger();
    }
  }

  /**
   * **Se pide recoger**, a los diez mil pies bajando. Abierta, espera a que el
   * dibujo guarde lo suyo; cerrada, ya está. En los dos casos, en este vuelo no se
   * abre más. Devuelve si estaba abierta.
   */
  pedirRecoger(pared: number): boolean {
    this.recogida = true;
    if (!this.abierta || this.recogiendoDesde !== null) return false;
    this.recogiendoDesde = pared;
    return true;
  }

  /** **El dibujo contesta**: ya guardó lo suyo. */
  yaRecogida(): void {
    if (this.recogiendoDesde !== null) this.acabarDeRecoger();
  }

  private acabarDeRecoger(): void {
    this.recogiendoDesde = null;
    this.cerrar();
  }
}
