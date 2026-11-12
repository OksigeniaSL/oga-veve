/**
 * **Los mandos de la cabina que se mueven con los de verdad**: el colectivo,
 * el cíclico y los pedales del helicóptero, y las palancas de su techo.
 *
 * Un mando dibujado que no se mueve cuando se vuela enseña que los mandos son
 * decoración. En el Super Puma, además, es la lección entera: el colectivo
 * sube y el helicóptero sube; el cíclico se inclina y el helicóptero va hacia
 * ahí; el pie empuja un pedal y el morro gira. Desde el asiento se ve la mano
 * del piloto sin que haya piloto.
 *
 * ## El modelo dice cómo, el juego solo mueve
 *
 * Es la palanca de aerofrenos dicha para cualquier mando —ver
 * `palanca-de-aerofrenos.ts`—. Cada uno cuelga de un vacío en su pivote, y el
 * vacío trae en sus propiedades, en los ejes del avión (x a la derecha, y
 * arriba, z a la cola):
 *
 * - `mueve`: quién lo mueve. Ver `QuienMueve`.
 * - `eje`: por dónde gira.
 * - `rango` y `grados`: con el mando en `rango[0]` gira `grados[0]`; en
 *   `rango[1]`, `grados[1]`; en medio, lo que haya en medio.
 *
 * Lo pone `_que_se_mueve` en `modelos/comun.py`. Un vacío dentro de otro —el
 * cíclico, que se inclina a los lados y hacia delante— gira dentro del giro de
 * su padre, como la muñeca dentro del brazo.
 */

import { Quaternion, Vector3, type Object3D } from "three";

/**
 * Quién mueve cada mando: los tres de siempre de −1 a 1, en intención de
 * piloto —ver `PosicionDeLosMandos`—; el colectivo, de 0 abajo a 1 arriba; y
 * los motores y el freno del rotor, 0 o 1.
 */
export type QuienMueve =
  | "colectivo"
  | "alabeo"
  | "cabeceo"
  | "guinada"
  | "motor"
  | "freno-rotor";

const QUIENES: readonly QuienMueve[] = [
  "colectivo",
  "alabeo",
  "cabeceo",
  "guinada",
  "motor",
  "freno-rotor",
];

export type PosicionDeLaCabina = Readonly<Partial<Record<QuienMueve, number>>>;

export interface MandosDeCabina {
  /** Qué mueve cada uno, por el nombre de su vacío. Para comprobarlo desde fuera. */
  readonly cuales: ReadonlyMap<string, QuienMueve>;
  /** Los pone donde dicen los mandos. Lo que no venga, se queda donde estaba. */
  poner(posicion: PosicionDeLaCabina): void;
}

interface Pieza {
  readonly nodo: Object3D;
  readonly mueve: QuienMueve;
  readonly eje: Vector3;
  readonly rango: readonly [number, number];
  readonly grados: readonly [number, number];
  readonly reposo: Quaternion;
  ultimo: number;
}

const dosNumeros = (v: unknown): [number, number] | null =>
  Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(Number(n)))
    ? [Number(v[0]), Number(v[1])]
    : null;

/**
 * Los grados de un mando para un valor, entre sus dos topes: fuera del rango
 * se queda en el tope, que es lo que hace una palanca de verdad.
 */
export function gradosPara(
  valor: number,
  rango: readonly [number, number],
  grados: readonly [number, number],
): number {
  const [r0, r1] = rango;
  const k = r1 === r0 ? 0 : (valor - r0) / (r1 - r0);
  const t = Math.max(0, Math.min(1, Number.isFinite(k) ? k : 0));
  return grados[0] + (grados[1] - grados[0]) * t;
}

/**
 * Prepara los mandos del modelo para moverlos, o `null` si no trae ninguno: de
 * momento solo los trae el helicóptero.
 */
export function prepararMandosDeCabina(raiz: Object3D): MandosDeCabina | null {
  raiz.updateWorldMatrix(true, true);
  const delModelo = raiz.getWorldQuaternion(new Quaternion());
  const piezas: Pieza[] = [];
  raiz.traverse((o) => {
    const d = o.userData as Record<string, unknown>;
    const mueve = d["mueve"] as QuienMueve;
    if (!QUIENES.includes(mueve) || !o.parent) return;
    const eje = d["eje"];
    const rango = dosNumeros(d["rango"]);
    const grados = dosNumeros(d["grados"]);
    if (!Array.isArray(eje) || eje.length !== 3 || !rango || !grados) return;
    /*
     * El eje viene en los ejes del avión y el vacío gira en el marco de su
     * padre, que lleva el cuarto de vuelta de Blender —o el giro de otro
     * mando, en el cíclico—. Se pasa del uno al otro con los giros de los dos
     * en el mundo, en reposo, como la palanca de aerofrenos.
     */
    const delPadre = o.parent.getWorldQuaternion(new Quaternion());
    const enElPadre = new Vector3(Number(eje[0]), Number(eje[1]), Number(eje[2]))
      .normalize()
      .applyQuaternion(delModelo)
      .applyQuaternion(delPadre.invert());
    if (!Number.isFinite(enElPadre.x)) return;
    piezas.push({
      nodo: o,
      mueve,
      eje: enElPadre,
      rango,
      grados,
      reposo: o.quaternion.clone(),
      ultimo: Number.NaN,
    });
  });
  if (!piezas.length) return null;
  const giro = new Quaternion();
  return {
    cuales: new Map(piezas.map((p) => [p.nodo.name, p.mueve])),
    poner(posicion) {
      for (const p of piezas) {
        const valor = posicion[p.mueve];
        if (valor === undefined || !Number.isFinite(valor)) continue;
        const angulo = gradosPara(valor, p.rango, p.grados);
        // Solo si cambia: quietos no cuestan nada.
        if (angulo === p.ultimo) continue;
        p.ultimo = angulo;
        giro.setFromAxisAngle(p.eje, (angulo * Math.PI) / 180);
        p.nodo.quaternion.multiplyQuaternions(giro, p.reposo);
      }
    },
  };
}
