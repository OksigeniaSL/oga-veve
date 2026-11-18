/**
 * **La raya del camino, pintada en el suelo**: por dónde ha ido el avión de
 * verdad, y la recta adonde se quería ir.
 *
 * La pide «Apuntá al viento» (`flight/deriva.ts`): con viento de costado el
 * morro apunta al puente y el avión se escurre de lado, y eso desde la cabina
 * no se ve —el puente sigue delante—. Se ve desde fuera, en el suelo: la raya
 * blanca, la del camino, se aparta de la magenta, la recta al puente. Son los
 * colores de la cabina: **blanco lo que tengo, magenta lo que quiero**
 * (`DESIGN.md`, la paleta de cabina). No es la estela de turbulencia
 * (`flight/estela.ts`), que es el aire que deja un avión grande detrás, ni la
 * estela del plano en vuelo (`Mapa.ponerEstela`), que es la misma traza
 * dibujada en el papel.
 *
 * ## Barata
 *
 * Una cinta plana de dos vértices por muestra, en un búfer reservado de una
 * vez y con `setDrawRange`: un solo dibujo por raya, sin luz ni sombra, y el
 * búfer se sube solo cuando entra una muestra nueva —una cada `PASO` metros,
 * menos de una por segundo con la avioneta—. Seiscientas muestras son treinta
 * kilómetros de raya y catorce kilobytes. Cada punto va a `SOBRE_EL_SUELO`
 * del suelo que da el muestreador: la cinta no se entierra en una loma suave
 * entre dos muestras, y en Asunción el suelo es una mesa.
 */

import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
} from "three";
import type { GroundSampler } from "./runway-guide";

/** Cada cuántos metros en planta entra una muestra. */
export const PASO = 50;
/** Lo que flota la cinta sobre el suelo, m. */
export const SOBRE_EL_SUELO = 4;
/** Cuántas muestras caben: treinta kilómetros a cincuenta metros. */
export const CAPACIDAD = 600;

/** Blanco: lo que tengo. Ver `src/ui/paleta.ts`, `valor`. */
export const BLANCO = 0xf2f5f7;
/** Magenta: lo que quiero. Ver `src/ui/paleta.ts`, `objetivo`. */
export const MAGENTA = 0xe14fd8;

/**
 * **Una cinta en el suelo**, punto a punto. `ancho` en metros: a mil
 * quinientos pies, quince metros son una raya de lápiz grueso en la pantalla
 * de la tablet.
 */
export class CintaEnElSuelo {
  readonly malla: Mesh;
  private readonly posiciones: Float32Array;
  private readonly geometria: BufferGeometry;
  private readonly puntos: { x: number; y: number; z: number }[] = [];

  constructor(
    private readonly suelo: GroundSampler,
    color: number,
    private readonly ancho: number,
    private readonly capacidad = CAPACIDAD,
  ) {
    this.posiciones = new Float32Array(capacidad * 2 * 3);
    const indices = new Uint16Array((capacidad - 1) * 6);
    for (let i = 0; i < capacidad - 1; i++) {
      const a = i * 2;
      indices.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
    }
    this.geometria = new BufferGeometry();
    const atributo = new BufferAttribute(this.posiciones, 3);
    atributo.setUsage(DynamicDrawUsage);
    this.geometria.setAttribute("position", atributo);
    this.geometria.setIndex(new BufferAttribute(indices, 1));
    this.geometria.setDrawRange(0, 0);
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: DoubleSide,
      // Por delante del suelo que tiene debajo, sin pelearse con él.
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    this.malla = new Mesh(this.geometria, material);
    this.malla.frustumCulled = false;
    this.malla.renderOrder = 2;
    this.malla.name = "raya-del-camino";
  }

  /** Cuántas muestras lleva: lo mira el banco. */
  get muestras(): number {
    return this.puntos.length;
  }

  /** Borrada, para otro vuelo. */
  vaciar(): void {
    this.puntos.length = 0;
    this.geometria.setDrawRange(0, 0);
  }

  /**
   * **Una muestra más**, si se ha avanzado `PASO` desde la última. Devuelve
   * si entró. Llena, deja de crecer: treinta kilómetros es más que cualquier
   * ida del ejercicio.
   */
  anadir(x: number, z: number, paso = PASO): boolean {
    const ultimo = this.puntos[this.puntos.length - 1];
    if (ultimo && Math.hypot(x - ultimo.x, z - ultimo.z) < paso) return false;
    if (this.puntos.length >= this.capacidad) return false;
    this.puntos.push({ x, y: this.suelo(x, z) + SOBRE_EL_SUELO, z });
    const n = this.puntos.length;
    // Los dos vértices de este punto y los del anterior, que cambian de lado al saber hacia dónde sigue.
    this.ponerVertices(n - 1);
    if (n >= 2) this.ponerVertices(n - 2);
    const atributo = this.geometria.getAttribute("position") as BufferAttribute;
    atributo.needsUpdate = true;
    this.geometria.setDrawRange(0, Math.max(0, n - 1) * 6);
    return true;
  }

  /** **Una recta entera**, muestreada a `PASO` para que siga el suelo. */
  recta(desde: { x: number; z: number }, hasta: { x: number; z: number }): void {
    this.vaciar();
    const largo = Math.hypot(hasta.x - desde.x, hasta.z - desde.z);
    const n = Math.min(this.capacidad - 1, Math.max(1, Math.ceil(largo / PASO)));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      this.anadir(desde.x + (hasta.x - desde.x) * f, desde.z + (hasta.z - desde.z) * f, 0);
    }
  }

  ponerEn(escena: Object3D): void {
    if (!this.malla.parent) escena.add(this.malla);
  }

  quitar(): void {
    this.malla.parent?.remove(this.malla);
  }

  dispose(): void {
    this.quitar();
    this.geometria.dispose();
    (this.malla.material as MeshBasicMaterial).dispose();
  }

  /** Los dos bordes del punto `i`, de lado a lado de la dirección del camino en él. */
  private ponerVertices(i: number): void {
    const p = this.puntos[i]!;
    const antes = this.puntos[i - 1] ?? p;
    const despues = this.puntos[i + 1] ?? p;
    let dx = despues.x - antes.x;
    let dz = despues.z - antes.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-6) {
      dx = 1;
      dz = 0;
    } else {
      dx /= l;
      dz /= l;
    }
    const m = this.ancho / 2;
    const o = i * 6;
    this.posiciones[o] = p.x - dz * m;
    this.posiciones[o + 1] = p.y;
    this.posiciones[o + 2] = p.z + dx * m;
    this.posiciones[o + 3] = p.x + dz * m;
    this.posiciones[o + 4] = p.y;
    this.posiciones[o + 5] = p.z - dx * m;
  }
}
