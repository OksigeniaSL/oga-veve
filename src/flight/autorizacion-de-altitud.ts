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
 * cifra —«flight level one one zero»—. Y en casa, para quien tiene cuatro
 * años, en miles de pies: «subí a once mil pies», que es el número que marca
 * la ventanilla.
 *
 * Sin three.js ni DOM: se comprueba sin volar.
 */

/** La altitud de transición de Canarias, pies. AIP España, ENR 1.7. */
export const TRANSICION_CANARIAS = 6000;
/** Y la de Paraguay, pies: la de la FIR de Asunción. */
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

/** Hasta qué miles de pies hay grabado «N thousand feet». */
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

/** Los miles de pies que se dicen en casa, «subí a N mil pies». */
export const MILES_EN_CASA = { desde: 3, hasta: 29 } as const;

/**
 * La pieza de «subí a N mil pies» en la voz de la torre de casa, o `null` si
 * esa altura no está grabada. La de Canarias lleva su prefijo: ver
 * `comoSeDiceAqui` en `i18n/habla.ts`.
 */
export function piezaDeSubirEnCasa(pies: number): string | null {
  const miles = pies / 1000;
  if (!Number.isInteger(miles) || miles < MILES_EN_CASA.desde || miles > MILES_EN_CASA.hasta)
    return null;
  return `torre.solo.subir.${miles}`;
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
