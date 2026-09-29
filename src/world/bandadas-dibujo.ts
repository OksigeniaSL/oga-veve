/**
 * Las aves, **dibujadas**: dos mallas instanciadas para todas las bandadas.
 *
 * Dónde está cada ave y qué hace lo decide `bandadas.ts`; esto solo pone el
 * cuerpo, y lo pone barato, que es lo que manda en una tablet del aula:
 *
 * - **Dos llamadas de dibujo como mucho**, y ninguna si no se ve ninguna ave.
 *   Todas las aves de todas las especies van en las mismas dos
 *   `InstancedMesh`; lo que cambia de una a otra —el color, el tamaño, el
 *   aleteo— va por instancia.
 * - **Dos niveles de detalle**: de cerca, un cuerpo con cola y dos alas
 *   partidas que se doblan al batir (diecisiete triángulos); de lejos, una
 *   uve de dos triángulos, que es lo que es un ave a trescientos metros.
 * - **Nada si no se ve.** Cada bandada se descarta entera si cae fuera del
 *   cono de la cámara o más lejos de donde un ave de su tamaño mide un
 *   píxel; y cada ave, lo mismo. No se calcula ni se sube nada de lo que no se
 *   va a pintar.
 * - **El aleteo lo hace la tarjeta**, no la CPU: cada ave lleva su frecuencia,
 *   su fase, cuánto abre y si va plegada, y el sombreador dobla las alas. La
 *   CPU coloca un punto y un giro por ave y por cuadro.
 *
 * Sin textura ni fichero de modelo: se monta aquí, triángulo a triángulo. Ver
 * `CREDITOS.md`.
 */

import {
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Float32BufferAttribute,
  Frustum,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Sphere,
  Vector3,
  type Camera,
} from "three";
import { giroDelModelo } from "./rumbo";
import type { Bandadas, EstadoDeAve } from "./bandadas";

/**
 * **Hasta cuántas envergaduras se dibuja un ave**, y lo más pequeña que sale.
 *
 * El ojo separa un minuto de arco, tres diezmilésimas de radián: una gaviota
 * de metro y medio se ve a más de cuatro kilómetros. Un píxel de una pantalla
 * de 720 líneas con sesenta grados de campo son quince diezmilésimas, cinco
 * veces más grueso. Dibujada a su tamaño, esa gaviota a un kilómetro mide
 * medio píxel y **no sale**: la pantalla se comería lo que un piloto sí vería.
 *
 * Así que de lejos no se dibuja nunca más pequeña de `PIXELES_COMO_POCO`, que
 * es lo menos que una pantalla necesita para enseñar un punto que se mueve, y
 * se deja de dibujar a mil seiscientas envergaduras —dos kilómetros largos una
 * gaviota—, bastante antes de donde el ojo la perdería. De cerca, a su tamaño.
 */
const ALCANCE_POR_ENVERGADURA = 1600;
const PIXELES_COMO_POCO = 2;

/** Y nunca más cerca de esto ni más lejos de aquello, m. */
const ALCANCE_MINIMO = 500;
const ALCANCE_MAXIMO = 2600;

/**
 * Hasta dónde se dibuja el cuerpo entero, en envergaduras. A cien un ave mide
 * siete píxeles: por debajo de eso la cola y las alas partidas no se ven y
 * basta la uve.
 */
const CERCA_POR_ENVERGADURA = 100;

/** Cuántas aves caben en cada malla. Ver `pintar`. */
const CABEN_CERCA = 512;
const CABEN_LEJOS = 1536;

/** Hasta dónde se ve un ave de esta envergadura, m. */
export function alcanceDeUnAve(envergadura: number): number {
  return Math.min(
    ALCANCE_MAXIMO,
    Math.max(ALCANCE_MINIMO, envergadura * ALCANCE_POR_ENVERGADURA),
  );
}

/*
 * ── Las dos formas ─────────────────────────────────────────────────────
 *
 * Con envergadura uno y el pico hacia −Z, que es hacia donde miran todos los
 * modelos del juego —ver `giroDelModelo`—. `ala` dice qué parte es cada
 * vértice: 0 el cuerpo y la raíz del ala, que no se mueven; 1 la mitad del
 * ala y 2 la punta, que se doblan más. El sombreador lo usa para batir.
 */

type V = readonly [number, number, number, number];

function forma(triangulos: readonly (readonly [V, V, V])[]): BufferGeometry {
  const pos: number[] = [];
  const ala: number[] = [];
  for (const t of triangulos)
    for (const v of t) {
      pos.push(v[0], v[1], v[2]);
      ala.push(v[3]);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("aAla", new Float32BufferAttribute(ala, 1));
  g.computeVertexNormals();
  return g;
}

/** El ave de cerca: cuerpo, cola y dos alas en dos tramos. 17 triángulos. */
export function aveDeCerca(): BufferGeometry {
  const N: V = [0, 0, -0.3, 0];
  const T: V = [0, 0, 0.22, 0];
  const L: V = [-0.045, 0, -0.02, 0];
  const R: V = [0.045, 0, -0.02, 0];
  const U: V = [0, 0.035, -0.04, 0];
  const D: V = [0, -0.03, -0.04, 0];
  const colaI: V = [-0.07, 0, 0.3, 0];
  const colaD: V = [0.07, 0, 0.3, 0];
  const tris: [V, V, V][] = [
    [N, R, U],
    [N, U, L],
    [N, L, D],
    [N, D, R],
    [T, U, R],
    [T, L, U],
    [T, D, L],
    [T, R, D],
    [T, colaI, colaD],
  ];
  for (const s of [-1, 1]) {
    const raizA: V = [s * 0.045, 0, -0.08, 0];
    const raizB: V = [s * 0.045, 0, 0.06, 0];
    const medioA: V = [s * 0.26, 0, -0.07, 1];
    const medioB: V = [s * 0.26, 0, 0.07, 1];
    const punta: V = [s * 0.5, 0, 0.03, 2];
    const puntaB: V = [s * 0.44, 0, 0.08, 2];
    tris.push(
      [raizA, medioA, medioB],
      [raizA, medioB, raizB],
      [medioA, punta, puntaB],
      [medioA, puntaB, medioB],
    );
  }
  return forma(tris);
}

/** El ave de lejos: una uve de dos triángulos. */
export function aveDeLejos(): BufferGeometry {
  const delante: V = [0, 0, -0.12, 0];
  const detras: V = [0, 0, 0.1, 0];
  const izq: V = [-0.5, 0, 0.04, 2];
  const der: V = [0.5, 0, 0.04, 2];
  return forma([
    [delante, izq, detras],
    [delante, detras, der],
  ]);
}

/**
 * El material de las dos, con el aleteo en el sombreador.
 *
 * `aAleteo` por instancia: frecuencia en radianes por segundo, fase, cuánto
 * abre cada batida en radianes y cuánto va plegada, de 0 a 1. Plegada es un
 * ave que se deja caer: las alas pegadas al cuerpo y echadas atrás.
 *
 * Sombreado plano: con `flatShading` la normal sale de la posición ya doblada,
 * así que el ala que sube se ilumina como un ala que sube sin tener que
 * rehacer normales.
 */
function materialDeAves(reloj: { value: number }): MeshLambertMaterial {
  const m = new MeshLambertMaterial({
    color: 0xffffff,
    side: DoubleSide,
    flatShading: true,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uReloj = reloj;
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         attribute float aAla;
         attribute vec4 aAleteo;
         uniform float uReloj;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         if (aAla > 0.5) {
           float lado = transformed.x < 0.0 ? -1.0 : 1.0;
           float r = abs(transformed.x) * (1.0 - 0.6 * aAleteo.w);
           // Un poco de diedro siempre, que es como planea casi cualquier ave.
           float a = 0.1 + aAleteo.z * sin(uReloj * aAleteo.x + aAleteo.y);
           a *= aAla > 1.5 ? 1.4 : 1.0;
           transformed.x = lado * r * cos(a);
           transformed.y += r * sin(a);
           transformed.z += 0.22 * aAleteo.w * (aAla - 0.5);
         }`,
      );
  };
  // `onBeforeCompile` no entra en la llave de la caché de programas.
  m.customProgramCacheKey = () => "aves-aleteo-1";
  return m;
}

/** Una de las dos mallas, con sus atributos por instancia. */
function malla(
  geo: BufferGeometry,
  material: MeshLambertMaterial,
  caben: number,
  nombre: string,
): { malla: InstancedMesh; aleteo: InstancedBufferAttribute } {
  const aleteo = new InstancedBufferAttribute(new Float32Array(caben * 4), 4);
  aleteo.setUsage(DynamicDrawUsage);
  geo.setAttribute("aAleteo", aleteo);
  const m = new InstancedMesh(geo, material, caben);
  m.instanceMatrix.setUsage(DynamicDrawUsage);
  m.setColorAt(0, new Color(0xffffff));
  m.instanceColor!.setUsage(DynamicDrawUsage);
  // Las colocamos a mano cada cuadro y ya se descartan aquí: la esfera que
  // calcularía three.js sería la de la primera instancia.
  m.frustumCulled = false;
  m.count = 0;
  m.visible = false;
  m.name = nombre;
  return { malla: m, aleteo };
}

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler(0, 0, 0, "YXZ");
const _p = new Vector3();
const _ojo = new Vector3();
const _s = new Vector3();
const _c = new Color();
const _esfera = new Sphere();
const _frustum = new Frustum();
const _vista = new Matrix4();

export class DibujoDeBandadas {
  readonly grupo = new Group();
  private readonly reloj = { value: 0 };
  private readonly cerca: ReturnType<typeof malla>;
  private readonly lejos: ReturnType<typeof malla>;
  private readonly aves: EstadoDeAve[] = [];
  /** Cuántas se pintaron en el último cuadro, de cerca y de lejos. Para el banco. */
  pintadas = { cerca: 0, lejos: 0 };

  constructor() {
    const material = materialDeAves(this.reloj);
    this.cerca = malla(aveDeCerca(), material, CABEN_CERCA, "aves:cerca");
    this.lejos = malla(aveDeLejos(), material, CABEN_LEJOS, "aves:lejos");
    this.grupo.name = "aves";
    this.grupo.add(this.cerca.malla, this.lejos.malla);
  }

  /**
   * Coloca las aves que se ven desde `camara` en el instante `t`.
   *
   * Va una vez por cuadro, justo antes de pintar, y no en cada paso del
   * mundo: dónde está cada ave es una cuenta con el reloj, no un estado que
   * haya que ir avanzando, así que con el reloj acelerado no hay que hacerla
   * ocho veces.
   */
  pintar(
    bandadas: Bandadas,
    t: number,
    camara: Camera,
    /** Alto del lienzo en píxeles, para saber cuánto mide un píxel. */
    alto = 720,
  ): void {
    this.reloj.value = t;
    const campo = (camara as { fov?: number }).fov ?? 60;
    const pixelesPorRadian = alto / (2 * Math.tan(((campo * Math.PI) / 180) / 2));
    camara.updateMatrixWorld();
    _vista.multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_vista);
    const ojo = camara.getWorldPosition(_ojo);
    let nCerca = 0;
    let nLejos = 0;
    for (const b of bandadas.lista) {
      const alcance = alcanceDeUnAve(b.especie.envergadura);
      const donde = bandadas.dondeEsta(b, t);
      _esfera.center.set(donde.x, donde.y, donde.z);
      _esfera.radius = donde.radio;
      const d = _esfera.center.distanceTo(ojo) - donde.radio;
      if (d > alcance) continue;
      if (!_frustum.intersectsSphere(_esfera)) continue;
      const cuantas = bandadas.aves(b, t, this.aves);
      const cercaHasta = b.especie.envergadura * CERCA_POR_ENVERGADURA;
      _c.set(b.especie.color);
      for (let i = 0; i < cuantas; i++) {
        const a = this.aves[i]!;
        const di = Math.hypot(a.x - ojo.x, a.y - ojo.y, a.z - ojo.z);
        if (di > alcance) continue;
        const deCerca = di < cercaHasta;
        const destino = deCerca ? this.cerca : this.lejos;
        const n = deCerca ? nCerca : nLejos;
        if (n >= (deCerca ? CABEN_CERCA : CABEN_LEJOS)) continue;
        _e.set(a.cabeceo, giroDelModelo(a.rumbo), -a.alabeo, "YXZ");
        _q.setFromEuler(_e);
        // Nunca más pequeña de dos píxeles: ver `PIXELES_COMO_POCO`.
        const escala = Math.max(
          1,
          (PIXELES_COMO_POCO * di) / (pixelesPorRadian * b.especie.envergadura),
        );
        _s.set(
          b.especie.envergadura * escala,
          b.especie.envergadura * escala,
          (b.especie.largo / 0.6) * escala,
        );
        _m.compose(_p.set(a.x, a.y, a.z), _q, _s);
        destino.malla.setMatrixAt(n, _m);
        destino.malla.setColorAt(n, _c);
        destino.aleteo.setXYZW(
          n,
          a.aleteo * 2 * Math.PI,
          a.fase,
          a.amplitud,
          a.pliegue,
        );
        if (deCerca) nCerca++;
        else nLejos++;
      }
    }
    this.subir(this.cerca, nCerca);
    this.subir(this.lejos, nLejos);
    this.pintadas = { cerca: nCerca, lejos: nLejos };
  }

  /** Sube a la tarjeta solo lo que se ha escrito, y apaga la malla vacía. */
  private subir(m: ReturnType<typeof malla>, n: number): void {
    m.malla.count = n;
    m.malla.visible = n > 0;
    if (!n) return;
    const matrices = m.malla.instanceMatrix;
    matrices.clearUpdateRanges();
    matrices.addUpdateRange(0, n * 16);
    matrices.needsUpdate = true;
    const colores = m.malla.instanceColor!;
    colores.clearUpdateRanges();
    colores.addUpdateRange(0, n * 3);
    colores.needsUpdate = true;
    m.aleteo.clearUpdateRanges();
    m.aleteo.addUpdateRange(0, n * 4);
    m.aleteo.needsUpdate = true;
  }

  /** Nada que pintar: las dos mallas fuera. */
  vaciar(): void {
    this.subir(this.cerca, 0);
    this.subir(this.lejos, 0);
    this.pintadas = { cerca: 0, lejos: 0 };
  }
}
