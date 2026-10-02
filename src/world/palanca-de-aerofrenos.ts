/**
 * La palanca de aerofrenos de la cabina, que se mueve.
 *
 * Estaba clavada en el pedestal: un pomo que no hacía nada mientras los
 * paneles del ala —ver `aerofrenos.ts`— subían y bajaban. En un avión de
 * verdad es al revés: lo primero que se mira al tocar es si la palanca ha
 * subido sola, porque es la señal de que los frenos de tierra han salido.
 *
 * ## Un recorrido, cuatro sitios
 *
 * Es la palanca de un 737, contada en un solo número de 0 a 1 —ver
 * `POSICIONES`—: abajo del todo, **recogida**; un poco más atrás, **armada**,
 * lista para subir sola al tocar; a media carrera, **el tope de vuelo**, hasta
 * donde se saca en el aire; y atrás del todo, **arriba**, que es como queda
 * con los frenos de tierra fuera. En medio, lo que haya en medio: en vuelo se
 * puede sacar a medias.
 *
 * El modelo trae un vacío `palanca-aerofrenos` en el pie de la palanca, con
 * el eje de giro en los ejes del avión y los grados de los dos extremos. Ver
 * el pedestal en `modelos/comun.py`. No se llama `bisagra-…` a propósito: ese
 * es el nombre del tren, y `patas.ts` la metería en el pozo.
 */

import { Quaternion, Vector3, type Object3D } from "three";

/** El nombre del vacío, que es un contrato con `modelos/comun.py`. */
export const PALANCA_DE_AEROFRENOS = "palanca-aerofrenos";

/** Dónde está cada sitio de la palanca, en su recorrido de 0 a 1. */
export const POSICIONES = {
  recogida: 0,
  armada: 0.15,
  topeDeVuelo: 0.55,
  arriba: 1,
} as const;

export interface PalancaDeAerofrenos {
  /** La pone en `posicion`, de 0 abajo a 1 arriba. Ver `POSICIONES`. */
  poner(posicion: number): void;
}

/**
 * Prepara la palanca del modelo para moverla, o `null` si no la trae: solo la
 * llevan los dos reactores, que son los que tienen aerofrenos.
 */
export function prepararPalancaDeAerofrenos(
  raiz: Object3D,
): PalancaDeAerofrenos | null {
  raiz.updateWorldMatrix(true, true);
  let nodo: Object3D | null = null;
  raiz.traverse((o) => {
    if (!nodo && o.name === PALANCA_DE_AEROFRENOS) nodo = o;
  });
  const palanca = nodo as Object3D | null;
  if (!palanca || !palanca.parent) return null;
  const eje = palanca.userData["eje"];
  const grados = palanca.userData["grados"];
  if (
    !Array.isArray(eje) ||
    eje.length !== 3 ||
    !Array.isArray(grados) ||
    grados.length !== 2
  )
    return null;
  const [g0, g1] = grados.map(Number) as [number, number];
  if (!Number.isFinite(g0) || !Number.isFinite(g1)) return null;
  /*
   * El eje viene en los ejes del avión y el vacío gira en el marco de su
   * padre, que lleva el cuarto de vuelta de Blender. Se pasa del uno al otro
   * con los giros de los dos en el mundo, como las patas: ver `patas.ts`.
   */
  const delModelo = raiz.getWorldQuaternion(new Quaternion());
  const delPadre = palanca.parent.getWorldQuaternion(new Quaternion());
  const enElPadre = new Vector3(Number(eje[0]), Number(eje[1]), Number(eje[2]))
    .normalize()
    .applyQuaternion(delModelo)
    .applyQuaternion(delPadre.invert());
  if (!Number.isFinite(enElPadre.x)) return null;
  const reposo = palanca.quaternion.clone();
  const giro = new Quaternion();
  let ultima = Number.NaN;
  return {
    poner(posicion: number) {
      const p = Math.max(0, Math.min(1, Number.isFinite(posicion) ? posicion : 0));
      if (p === ultima) return;
      ultima = p;
      const angulo = ((g0 + (g1 - g0) * p) * Math.PI) / 180;
      giro.setFromAxisAngle(enElPadre, angulo);
      palanca.quaternion.multiplyQuaternions(giro, reposo);
    },
  };
}
