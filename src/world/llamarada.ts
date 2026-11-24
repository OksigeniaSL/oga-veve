/**
 * **La llamarada del petardeo**, en el motor del dibujo (#90, ADR 0014,
 * enmienda H77).
 *
 * Con cada estallido sale un fogonazo corto por delante, por la toma, y por
 * detrás, por la tobera: «visible flames forward out the inlet and rearward
 * out the tailpipe» (FAA, *Airplane Turbofan Engine Operation and
 * Malfunctions*, p. 19). Dura un cuarto de segundo y se apaga: ni humo ni
 * fuego que se quede, que no es un incendio.
 *
 * El motor se busca en el modelo por su nombre —`motor`, el de
 * `modelos/exterior.py`— y se mide de él: de qué lado va, dónde empieza y
 * dónde acaba. Los dos de un bimotor van en la misma malla, por simetría, así
 * que se miran los vértices de ese lado. Sin modelo, o con uno sin motor con
 * nombre, no hay llamarada, y se vuela igual.
 */

import {
  AdditiveBlending,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from "three";

/** Dónde va un motor en el dibujo, en los ejes del avión: x a la derecha, y arriba, z a la cola. */
export interface Nacela {
  readonly x: number;
  readonly y: number;
  /** La boca de la toma y la de la tobera. */
  readonly toma: number;
  readonly tobera: number;
  readonly radio: number;
}

/** Lo que dura el fogonazo, s. */
export const DURA_LA_LLAMARADA = 0.25;

/** El motor del modelo de un lado, −1 el izquierdo y 1 el derecho, o `null` si no lo trae. */
export function nacelaDe(grupo: Object3D, lado: -1 | 1): Nacela | null {
  grupo.updateWorldMatrix(true, true);
  const alGrupo = grupo.matrixWorld.clone().invert();
  const lo = new Vector3(Infinity, Infinity, Infinity);
  const hi = new Vector3(-Infinity, -Infinity, -Infinity);
  const v = new Vector3();
  grupo.traverse((o) => {
    if (o.name !== "motor" && !/^motor_\d+$/.test(o.name) && o.parent?.name !== "motor") return;
    const malla = o as Mesh;
    const pos = malla.isMesh ? malla.geometry.getAttribute("position") : null;
    if (!pos) return;
    const m = alGrupo.clone().multiply(malla.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      if (v.x * lado <= 0) continue;
      lo.min(v);
      hi.max(v);
    }
  });
  if (!Number.isFinite(lo.x) || !Number.isFinite(hi.x)) return null;
  return {
    x: (lo.x + hi.x) / 2,
    y: (lo.y + hi.y) / 2,
    toma: lo.z,
    tobera: hi.z,
    radio: Math.min(hi.x - lo.x, hi.y - lo.y) / 2,
  };
}

/**
 * Una llama: dos conos, el de fuera naranja y el de dentro claro, y el
 * resplandor de la boca, que suman luz.
 */
function llama(radio: number, largo: number, resplandor: number, haciaLaCola: boolean): Group {
  const g = new Group();
  const pieza = (geometria: BufferGeometry, color: number, opacity: number): void => {
    g.add(
      new Mesh(
        geometria,
        new MeshBasicMaterial({ color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false }),
      ),
    );
  };
  pieza(new SphereGeometry(resplandor, 14, 10), 0xff9a3c, 0.35);
  for (const [color, cuanto, opacidad] of [
    [0xff8a2a, 1, 0.55],
    [0xffe2a0, 0.55, 0.8],
  ] as const) {
    const geometria = new ConeGeometry(radio * cuanto, largo * cuanto, 14, 1, true);
    // El cono nace con la punta en +y: se tumba, con la base en la boca del motor.
    geometria.translate(0, (largo * cuanto) / 2, 0);
    geometria.rotateX(haciaLaCola ? Math.PI / 2 : -Math.PI / 2);
    pieza(geometria, color, opacidad);
  }
  return g;
}

export class Llamarada {
  readonly grupo = new Group();
  private queda = 0;
  private puestaEn: { readonly de: Object3D; readonly lado: -1 | 1 } | null = null;
  private hay = false;

  constructor() {
    this.grupo.visible = false;
  }

  /** Un fogonazo en ese motor de ese avión. `false` si el dibujo no trae motor donde ponerlo. */
  encender(avion: Object3D, lado: -1 | 1): boolean {
    if (this.puestaEn?.de !== avion || this.puestaEn.lado !== lado) this.colgar(avion, lado);
    if (!this.hay) return false;
    this.queda = DURA_LA_LLAMARADA;
    this.grupo.visible = true;
    return true;
  }

  /** Un paso: se encoge y se apaga. */
  paso(dt: number): void {
    if (!this.grupo.visible) return;
    this.queda -= dt;
    if (this.queda <= 0) {
      this.grupo.visible = false;
      return;
    }
    const q = this.queda / DURA_LA_LLAMARADA;
    this.grupo.children.forEach((c) => c.scale.set(0.7 + 0.3 * q, 0.7 + 0.3 * q, 0.35 + 0.65 * q));
  }

  /** Fuera: un vuelo nuevo. */
  apagar(): void {
    this.queda = 0;
    this.grupo.visible = false;
  }

  private colgar(avion: Object3D, lado: -1 | 1): void {
    this.puestaEn = { de: avion, lado };
    this.grupo.removeFromParent();
    this.grupo.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (m.material as MeshBasicMaterial).dispose();
    });
    this.grupo.clear();
    const n = nacelaDe(avion, lado);
    this.hay = n !== null;
    if (!n) return;
    /*
     * La de atrás, de seis radios y medio: la tobera va por debajo del ala, y
     * con tres no pasaba de su borde de salida. Desde detrás y por encima, que
     * es como se mira, no se veía ninguna. Y la de delante, con un resplandor
     * mayor que la boca, que asoma por encima de la góndola.
     */
    const delante = llama(n.radio * 0.8, n.radio * 2.2, n.radio * 1.4, false);
    delante.position.set(n.x, n.y, n.toma);
    const detras = llama(n.radio * 0.7, n.radio * 6.5, n.radio * 0.9, true);
    detras.position.set(n.x, n.y, n.tobera);
    this.grupo.add(delante, detras);
    avion.add(this.grupo);
  }
}
