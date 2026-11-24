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
  DataTexture,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
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

/** Los puntos de lado del resplandor. */
const LADO_DEL_RESPLANDOR = 32;

let elResplandor: DataTexture | null = null;

/** Un redondel que se apaga hacia el borde, hecho una vez: con un disco de borde duro parecía una bola. */
function resplandorBlando(): DataTexture {
  if (elResplandor) return elResplandor;
  const n = LADO_DEL_RESPLANDOR;
  const datos = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(i + 0.5 - n / 2, j + 0.5 - n / 2) / (n / 2);
      const q = Math.max(0, 1 - r) ** 1.6;
      datos.set([255, Math.round(150 + 70 * q), Math.round(60 + 110 * q), Math.round(255 * q)], (j * n + i) * 4);
    }
  const t = new DataTexture(datos, n, n);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return (elResplandor = t);
}

/**
 * Una llama: dos conos que se apagan de la boca a la punta, el de fuera naranja
 * y el de dentro claro, y el resplandor de la boca. Todos suman luz.
 */
function llama(radio: number, largo: number, resplandor: number, haciaLaCola: boolean): Group {
  const g = new Group();
  const brillo = new Sprite(
    new SpriteMaterial({ map: resplandorBlando(), blending: AdditiveBlending, depthWrite: false, transparent: true }),
  );
  brillo.scale.set(resplandor * 2.6, resplandor * 2.6, 1);
  g.add(brillo);
  for (const [color, cuanto] of [
    [[0.75, 0.3, 0.06], 1],
    [[0.95, 0.75, 0.4], 0.6],
  ] as const) {
    const geometria = new ConeGeometry(radio * cuanto, largo * cuanto, 18, 6, true);
    // El cono nace con la punta en +y: se tumba, con la base en la boca del motor.
    geometria.translate(0, (largo * cuanto) / 2, 0);
    const pos = geometria.getAttribute("position");
    const colores: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      // Sumando luz, negro es nada: se apaga hacia la punta.
      const q = (1 - pos.getY(i) / (largo * cuanto)) ** 1.5;
      colores.push(color[0] * q, color[1] * q, color[2] * q);
    }
    geometria.setAttribute("color", new Float32BufferAttribute(colores, 3));
    geometria.rotateX(haciaLaCola ? Math.PI / 2 : -Math.PI / 2);
    g.add(
      new Mesh(
        geometria,
        new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }),
      ),
    );
  }
  return g;
}

export class Llamarada {
  readonly grupo = new Group();
  private queda = 0;
  private puestaEn: { readonly de: Object3D; readonly lado: -1 | 1 } | null = null;
  private hay = false;

  constructor() {
    // Con su nombre, que lo busca el banco para contar los cuadros en que se ve.
    this.grupo.name = "llamarada";
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
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as MeshBasicMaterial).dispose();
      } else if ((o as Sprite).isSprite) (o as Sprite).material.dispose();
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
