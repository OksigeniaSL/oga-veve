/**
 * **Aves en la final**: el aviso de la torre, la explicación y la maniobra.
 *
 * Donde de verdad chocan aves y aviones es **abajo y cerca del aeropuerto**,
 * despegando y aterrizando, que es donde comparten altura. Por eso una torre
 * avisa por radio cuando le consta actividad de aves en la final, y por eso
 * se enseña esto en la aproximación y no en crucero. Las cifras y la
 * fraseología, con su fuente, en `world/aves.ts`.
 *
 * ## La maniobra, que es la que no parece
 *
 * Ante un ave de frente, **se sube**. El AIM de la FAA (7-5-2) lo dice con su
 * porqué: «climb to avoid collision, because birds in flocks generally
 * distribute themselves downward, with lead birds being at the highest
 * altitude»; y la guía de Transport Canada para pilotos (TP 13549, cap. 10),
 * con su matiz: «the most effective evasive action may be to climb above them
 * while maintaining a safe speed. Biologists have observed that some birds
 * break downwards when threatened». Bajando, el avión va a donde va el ave.
 * La reacción instintiva —meter morro para pasar por debajo— es la
 * equivocada, y saberlo cambia el resultado. En el juego se ve: la bandada de
 * la final, al llegar el avión, se tira hacia abajo. Ver `CAIDA_DEL_SUSTO` en
 * `world/bandadas.ts`.
 *
 * ## Lo que dice la torre
 *
 * La OACI pone las aves «on the ground or in the air» entre la información
 * esencial de aeródromo (Doc 4444, 7.5.2 f), y la da con la fórmula de
 * siempre, «CAUTION» y el motivo (12.3.1.11). Los ejemplos del Doc 9137
 * —«caution large flock of birds north of runway 27», «large birds on approach
 * to Runway 32 between 500 - 2,000 feet AGL»— dicen dónde y a qué altura, y
 * el mismo manual avisa de por qué (8.1.7): un «birds in the vicinity of the
 * aerodrome» a secas no le sirve a nadie y acaba sin escucharse. Así que aquí
 * se dice dónde —en la final— y a cuántos pies. Ver `avisoDeLaTorre`.
 *
 * ## Por la escalera, y solo arriba
 *
 * - **Guyrami y Tukã, nunca.** No hay bandada en la final ni aviso: es un
 *   riesgo de verdad y se enseña cuando ya se lee un instrumento, no a los
 *   cuatro años. Las aves del paisaje sí están en los cuatro peldaños.
 * - **Taguató**: la torre avisa, la tarjeta lo dibuja y lo escribe, y detrás
 *   de la torre —detrás, no a la vez— la instructora cuenta con calma qué ha
 *   dicho y qué se hace. Ver `laInstructoraLoExplica` en `escalera.ts`.
 * - **Taguató Ruvichá**: la torre y la tarjeta. La cabina ya es la de verdad.
 *
 * Y **sin drama**: ni tono de alarma, ni tarjeta roja. Es información de la
 * torre y una maniobra que se entrena, como la frustrada.
 *
 * Este módulo no dibuja ni habla: decide.
 */

import type { TierId } from "./tiers";
import type { Habla } from "../i18n/habla";

/** Los peldaños que tienen bandada en la final y su aviso. */
export function hayAvesEnLaFinal(tramo: TierId): boolean {
  return tramo === "taguato" || tramo === "taguato-ruvicha";
}

/**
 * **Cuántas aproximaciones de cada dos traen aves**: la mitad.
 *
 * Las aves alrededor de un aeropuerto son de todos los días, y hay campos
 * cuyo ATIS lleva el aviso puesto de continuo. Pero si la bandada estuviera
 * en todas las finales dejaría de ser un aviso para ser un decorado, y lo
 * que enseña —que la torre avisa de lo que hay, cuando lo hay— se perdería.
 * Se decide una vez por campo y por vuelo, al entrar en final.
 */
export const EN_UNA_DE_CADA = 2;

/** La senda de siempre, 3°, y la altura a la que cruza el umbral, m. */
const SENDA = (3 * Math.PI) / 180;
const SOBRE_EL_UMBRAL = 15;

/**
 * **Dónde se pone la bandada de la final**: a cuántos metros del umbral y a
 * qué altura sobre él, o `null` si ya no hay sitio.
 *
 * Donde se juntan de verdad: cerca del umbral y por debajo de mil pies, a
 * tres kilómetros como mucho. Y por delante del avión lo bastante para verlas
 * venir y tener tiempo de subir: casi la mitad de lo que le queda, y nunca
 * menos de un kilómetro largo. En la final larga de un reactor quedan a tres
 * kilómetros del umbral; en la corta de una avioneta que viene del circuito,
 * a ochocientos metros, sobre las luces de aproximación.
 *
 * Diez metros por debajo de la senda, que es donde un avión que sube un poco
 * pasa por encima y uno que baja se las encuentra.
 */
export function sitioEnLaFinal(
  alUmbral: number,
): { distancia: number; altura: number } | null {
  const margen = Math.min(1800, Math.max(1200, alUmbral * 0.45));
  const distancia = Math.min(3200, alUmbral - margen);
  if (distancia < 600) return null;
  return {
    distancia,
    altura: distancia * Math.tan(SENDA) + SOBRE_EL_UMBRAL - 10,
  };
}

/**
 * **Si una bandada está de frente**: por delante, en el cono de lo que se
 * lleva por el morro y a una altura parecida. Es cuando se sube.
 *
 * `rumbo` en radianes, cero al norte. Ochocientos metros son unos quince
 * segundos a la velocidad de una final: tiempo de ver, de subir un poco y de
 * pasar por encima.
 */
export function deFrente(
  avion: { x: number; y: number; z: number; rumbo: number },
  aves: { x: number; y: number; z: number },
): boolean {
  const dx = aves.x - avion.x;
  const dz = aves.z - avion.z;
  const lejos = Math.hypot(dx, dz);
  if (lejos > 800 || lejos < 40) return false;
  if (Math.abs(aves.y - avion.y) > 70) return false;
  let angulo = Math.atan2(dx, -dz) - avion.rumbo;
  angulo = Math.atan2(Math.sin(angulo), Math.cos(angulo));
  return Math.abs(angulo) < (20 * Math.PI) / 180;
}

const PIE = 0.3048;

/**
 * **Lo que se dice antes de la altura**, en cada torre. Ver la cabecera.
 *
 * La canaria lo dice sin «flock of»: su pieza se grabó más corta el día que
 * la cuenta de voces se quedó sin saldo. Es la misma información —«caution»
 * y el motivo— y lo que se escribe es lo que se oye; si se regraba, se iguala
 * aquí y en `EN_CANARIAS_SE_DICE`, en `scripts/frases-para-grabar.mjs`.
 */
export const CUIDADO_AVES_EN_FINAL: Readonly<Record<Habla, string>> = {
  paraguayo: "caution, flock of birds on final",
  canario: "caution, birds on final",
};

/**
 * **La frase de la torre** con la altura de la bandada sobre el campo, en
 * cientos de pies, y la pieza grabada de esa altura.
 *
 * Las alturas son las piezas que ya tiene grabadas la información de tráfico,
 * de trescientos a mil doscientos pies (`trafico.pies.*`): la misma voz y la
 * misma cifra. Una cifra sin grabación dejaría la frase entera en la voz del
 * navegador, así que se sujeta a esos topes.
 */
export function avisoDeLaTorre(
  sobreElCampo: number,
  habla: Habla,
): {
  readonly texto: string;
  readonly altura: string;
} {
  const cientos = Math.min(12, Math.max(3, Math.round(sobreElCampo / PIE / 100)));
  return {
    texto: `${CUIDADO_AVES_EN_FINAL[habla]}, ${cientos * 100} feet`,
    altura: `trafico.pies.${cientos}`,
  };
}

/** Lo que toca hacer ahora con las aves de la final. */
export type AvisoDeAves =
  | { readonly que: "poner"; readonly distancia: number; readonly altura: number }
  | { readonly que: "torre"; readonly bandada: string }
  | { readonly que: "deFrente"; readonly bandada: string };

/** Lo que hace falta saber para decidirlo. */
export interface MomentoDeAves {
  readonly tramo: TierId;
  readonly campo: string;
  /** Si en el campo hay torre o AFIS que hable. */
  readonly hayTorre: boolean;
  readonly enFinal: boolean;
  readonly enElSuelo: boolean;
  /** Metros hasta el umbral en uso. */
  readonly alUmbral: number;
  /** De 0 a 1, para decidir si esta final trae aves. */
  readonly dado: number;
  /** Las bandadas de la final que hay puestas en este campo, con dónde están. */
  readonly bandadas: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }[];
  readonly avion: { x: number; y: number; z: number; rumbo: number };
}

/**
 * La memoria del aviso en un vuelo: qué campos ya tiraron el dado, a qué
 * bandadas se avisó y a cuáles se les dijo «subí».
 *
 * Todo se rearma con un suceso y no con un reloj: el dado, con otro vuelo; la
 * torre, con otra bandada; el «subí», con otra pasada.
 */
export class AvesEnLaFinal {
  private readonly tirados = new Set<string>();
  private readonly avisadas = new Set<string>();
  private readonly deFrenteYa = new Set<string>();

  reiniciar(): void {
    this.tirados.clear();
    this.avisadas.clear();
    this.deFrenteYa.clear();
  }

  paso(m: MomentoDeAves): AvisoDeAves | null {
    if (!hayAvesEnLaFinal(m.tramo) || !m.hayTorre || m.enElSuelo) return null;
    if (m.enFinal && !this.tirados.has(m.campo)) {
      this.tirados.add(m.campo);
      const sitio = sitioEnLaFinal(m.alUmbral);
      if (sitio && m.dado < 1 / EN_UNA_DE_CADA) return { que: "poner", ...sitio };
    }
    for (const b of m.bandadas) {
      if (m.enFinal && !this.avisadas.has(b.id)) {
        this.avisadas.add(b.id);
        return { que: "torre", bandada: b.id };
      }
      if (!this.deFrenteYa.has(b.id) && deFrente(m.avion, b)) {
        this.deFrenteYa.add(b.id);
        return { que: "deFrente", bandada: b.id };
      }
    }
    return null;
  }
}
