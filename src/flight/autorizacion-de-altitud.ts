/**
 * **La autorización de altitud, por escalones**: «suba a…».
 *
 * Nadie sube del despegue al crucero porque sí. La altura a la que se sube la
 * da el control, y la da **por escalones**: tras despegar, una primera altura
 * —la que toca en esa salida— y más adelante el nivel del plan. Quien vuela
 * la pone en la ventanilla del automático, y el avión sube hasta ahí y se
 * queda. Es la otra mitad de la ventanilla: ver `altitud-seleccionada.ts`.
 *
 * ## El primer escalón
 *
 * Las cartas de salida publican una altitud inicial, pero la extracción de
 * `world/procedimientos-*.ts` solo tomó de ellas las altitudes de «a o por
 * encima de», que son las que libran el terreno. Así que el primero no se lee
 * de la carta: es **la altitud de transición**, que es donde acaban las
 * altitudes y empiezan los niveles —por debajo se vuela con la presión del
 * sitio, por encima con la estándar—, y nunca por debajo de la mínima en ruta
 * de la zona de la salida. Si el plan es más bajo que eso, un solo escalón:
 * el crucero.
 *
 * - **Canarias: seis mil pies**, la de toda España salvo Madrid, Granada y La
 *   Seu d'Urgell (AIP España, ENR 1.7).
 * - **Paraguay: tres mil pies**, la de la FIR de Asunción.
 *
 * ## Y cómo se dice
 *
 * En la radio, como manda la fraseología de la OACI: por debajo de la
 * transición en pies —«six thousand feet»— y por encima en nivel, cifra a
 * cifra —«flight level one one zero»—. Y en castellano, igual y con las
 * palabras de cada sitio: «ascienda a tres mil pies», «suba a nivel de vuelo
 * uno uno cero». Ver `torre.subir` en `i18n/es-PY.ts`.
 *
 * Sin three.js ni DOM: se comprueba sin volar.
 */

import { CIFRAS_EN_CASTELLANO } from "./matricula";

/** La altitud de transición de Canarias, pies. AIP España, ENR 1.7. */
export const TRANSICION_CANARIAS = 6000;
/**
 * Y la de Paraguay, pies. La publica cada aeródromo en su AD 2.17 del AIP de
 * la DINAC (AMDT AIRAC 01/2026), y es la misma en todos los que la dan: 3000
 * ft MSL en SGAS, SGES y SGPI, entre otros.
 */
export const TRANSICION_PARAGUAY = 3000;

/** La altitud de transición del campo con este indicativo OACI, pies. */
export function altitudDeTransicion(oaci: string | null | undefined): number {
  return oaci?.toUpperCase().startsWith("GC") ? TRANSICION_CANARIAS : TRANSICION_PARAGUAY;
}

const alMillar = (pies: number): number => Math.ceil(pies / 1000 - 1e-6) * 1000;

/**
 * **Los escalones de la subida**, en pies: `[primero, crucero]`, o solo el
 * crucero si el primero no queda por lo menos dos mil pies por debajo: parar
 * mil pies antes de llegar no es un escalón, es un tropiezo.
 *
 * `minimaDeSalida` es la mínima en ruta alrededor de la salida, pies, o
 * `null` si no se sabe: el primer escalón no queda nunca por debajo de ella.
 */
export function escalonesDeSubida(
  crucero: number,
  transicion: number,
  minimaDeSalida: number | null,
): readonly number[] {
  const primero = Math.max(transicion, minimaDeSalida === null ? 0 : alMillar(minimaDeSalida));
  if (primero > crucero - 2000) return [crucero];
  return [primero, crucero];
}

/** Las cifras como se dicen por radio. «Niner», no «nine». */
const CIFRA = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "niner"];
/** Y los miles por debajo de la transición, en palabras. */
const MILES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "niner"];

/**
 * Qué miles de pies hay grabados: «N thousand feet», y en castellano «N mil
 * pies» hasta la transición de cada torre, que por encima ya es nivel.
 */
export const MILES_EN_PIES = [2, 3, 4, 5, 6] as const;

/** Una altura dicha por radio: el texto y las piezas grabadas que lo montan. */
export interface AlturaEnRadio {
  /** Lo que se oye: «flight level one one zero», «six thousand feet». */
  readonly dicho: string;
  /** Las piezas del pack de la torre, separadas por espacios. */
  readonly piezas: string;
}

/**
 * **Una altura en fraseología**: nivel por encima de la transición, pies por
 * debajo. `null` si esa altura no se puede montar con lo grabado —un número de
 * pies suelto que no es un millar entre dos y seis mil—: un número que no
 * puede sonar a su altura no se dice.
 */
export function alturaEnRadio(pies: number, transicion: number): AlturaEnRadio | null {
  if (pies > transicion) {
    const nivel = Math.round(pies / 100);
    if (nivel < 10 || nivel > 999) return null;
    const cifras = String(nivel).padStart(3, "0").split("").map(Number);
    return {
      dicho: `flight level ${cifras.map((c) => CIFRA[c]).join(" ")}`,
      piezas: ["altura.nivel", ...cifras.map((c) => `cifra.${c}`)].join(" "),
    };
  }
  const miles = pies / 1000;
  if (!Number.isInteger(miles) || !(MILES_EN_PIES as readonly number[]).includes(miles))
    return null;
  return { dicho: `${MILES[miles]} thousand feet`, piezas: `altura.pies.${miles}` };
}

/**
 * **Una altura en fraseología castellana**, con las mismas reglas: nivel de
 * vuelo por encima de la transición, cifra a cifra —«nivel de vuelo uno uno
 * cero»—, y pies por debajo, con el millar y la palabra MIL —«tres mil
 * pies»—. Así lo manda la DINAC (R 10, vol. II, 5.2.1.4.1: «FL 180, nivel de
 * vuelo uno ocho cero») y así lo dice España (SERA.14035).
 *
 * `dicho` va sin el verbo, que es de cada torre —«ascienda a» en Paraguay,
 * «suba a» en España—; `piezas` lo lleva, porque se graba con él: una frase
 * entera por millar, y el principio del nivel seguido de sus tres cifras, las
 * mismas que nombran la pista. `solo` es el prefijo de las piezas de la torre
 * que lo dice. `null` si no está grabada: los mismos millares que en inglés.
 */
export function alturaEnCastellano(
  pies: number,
  transicion: number,
  solo = "torre.solo",
): AlturaEnRadio | null {
  if (pies > transicion) {
    const nivel = Math.round(pies / 100);
    if (nivel < 10 || nivel > 999) return null;
    const cifras = String(nivel).padStart(3, "0").split("").map(Number);
    return {
      dicho: `nivel de vuelo ${cifras.map((c) => CIFRAS_EN_CASTELLANO[c]).join(" ")}`,
      piezas: [`${solo}.subirNivel`, ...cifras.map((c) => `cifra.es.${c}`)].join(" "),
    };
  }
  const miles = pies / 1000;
  if (!Number.isInteger(miles) || !(MILES_EN_PIES as readonly number[]).includes(miles))
    return null;
  return { dicho: `${CIFRAS_EN_CASTELLANO[miles]} mil pies`, piezas: `${solo}.subir.${miles}` };
}

/**
 * Cuánto por encima del suelo se da el primer escalón, pies: mil quinientos.
 *
 * Es cuando el control de salida tiene al avión en su pantalla, y sobre todo
 * **no es el despegue**: ahí ya hablan la cabina, la instructora y la torre, y
 * el despegue es el momento en que no se solapa nada.
 */
export const TRAS_DESPEGAR = 1500;

/**
 * Cuánto antes de llegar a un escalón se da el siguiente, pies: mil. Es lo que
 * hace un controlador que no tiene a nadie encima: le deja seguir subiendo
 * antes de que tenga que nivelar.
 */
export const ANTES_DE_LLEGAR = 1000;

/**
 * **Quién decide cuándo se da cada escalón.**
 *
 * Cuando pasa algo, no con el reloj: el primero al pasar `TRAS_DESPEGAR` sobre
 * el suelo —saltándoselo si ya se está a menos de `ANTES_DE_LLEGAR` de él— y
 * cada uno de los siguientes al acercarse al anterior. Un plan nuevo rearma
 * la lista; uno rehecho en el aire no, porque la salida ya se hizo.
 */
export class AutorizacionDeSubida {
  private quedan: number[] = [];
  private ultima: number | null = null;

  /** Pone los escalones de un plan nuevo, o ninguno. */
  poner(escalones: readonly number[] | null): void {
    this.quedan = escalones ? [...escalones] : [];
    this.ultima = null;
  }

  /** La última altura autorizada, pies, o `null` si todavía ninguna. */
  get autorizada(): number | null {
    return this.ultima;
  }

  /**
   * **Si esta subida la da el control**: hay escalones por dar o ya se dio
   * alguno. Entonces la subida la cuenta la torre, y quien diga el paso de
   * subir solo lo enseña. Ver `flight/siguiente-paso.ts`.
   */
  get conControl(): boolean {
    return this.quedan.length > 0 || this.ultima !== null;
  }

  /**
   * Un paso. Devuelve la altura que el control autoriza **ahora**, pies, o
   * `null` si ahora no toca ninguna.
   */
  paso(l: { readonly pies: number; readonly sobreElSuelo: number; readonly enTierra: boolean }): number | null {
    if (l.enTierra || this.quedan.length === 0) return null;
    if (this.ultima === null) {
      if (l.sobreElSuelo < TRAS_DESPEGAR) return null;
      while (this.quedan.length > 1 && l.pies >= this.quedan[0]! - ANTES_DE_LLEGAR)
        this.quedan.shift();
      this.ultima = this.quedan.shift()!;
      return this.ultima;
    }
    if (l.pies < this.ultima - ANTES_DE_LLEGAR) return null;
    this.ultima = this.quedan.shift()!;
    return this.ultima;
  }

  /**
   * **Y una altura pedida en crucero**, por los baches: el control la da, y
   * con ella ya no queda ningún escalón de la subida pendiente. Ver
   * `buscarNivelTranquilo` en `game.ts`.
   */
  autorizar(pies: number): void {
    this.quedan = [];
    this.ultima = pies;
  }
}
