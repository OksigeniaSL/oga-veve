/**
 * **El marco de la ventanilla**, desde el asiento.
 *
 * Lo que dice «estás dentro de un avión» no es el paisaje: es la ventanilla
 * redondeada con su bisel de plástico, el hueco hondo hasta el cristal, la
 * junta oscura del cristal y el filo de la persiana asomando arriba. Los
 * modelos no traen cabina de pasaje por dentro, así que esto lo pinta encima
 * del mundo, y lo pinta **con la geometría de la ventanilla de verdad**: la que
 * mide el modelo, en su sitio y a su tamaño. Ver `asiento-de-pasaje.ts`.
 *
 * ## Cómo, y por qué así
 *
 * Es **un solo triángulo grande que cubre la pantalla** y, en cada píxel, sigue
 * el rayo de la vista hasta la pared: si pasa por el hueco y llega al cristal,
 * no pinta nada y se ve el mundo; si da en el hueco, pinta el canto; si da en
 * la pared, la pared. Tres cosas que salen de ahí sin pedirlas:
 *
 * - **La perspectiva es la de verdad.** Al girar la cabeza el canto de un lado
 *   se esconde y el del otro se ensancha, y el ala se ve por donde se vería.
 *   Un dibujo plano pegado a la pantalla se quedaría quieto mientras el mundo
 *   gira detrás, que es lo que hace un marco de foto, no una ventanilla.
 * - **La pared no se acaba nunca**: gire la cabeza lo que gire, no hay borde
 *   de malla por el que asome el mundo.
 * - **Y cuesta menos que no tenerlo.** Se pinta lo primero y a la profundidad
 *   más cercana, así que la tarjeta descarta antes de calcularlo todo lo que
 *   queda detrás de la pared —el terreno, el mar, el cielo—, que es más de la
 *   mitad de la pantalla. Es el truco del cielo de `sky.ts`, al revés. Medido
 *   en `scripts/verificar-mirada.mjs`.
 *
 * El borde del cristal se suaviza con **cobertura alfa** —`alphaToCoverage`—:
 * el multimuestreo que ya lleva el juego decide qué muestras del borde son
 * pared y cuáles mundo, sin mezclar transparencias ni ordenar nada.
 *
 * Y la luz: de día la cabina la alumbra lo que entra por las ventanillas; de
 * noche, las luces bajas y cálidas del pasaje en crucero. Ver
 * `diaEnLaCabina` en `luz-de-cabina.ts`.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix3,
  Mesh,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type PerspectiveCamera,
} from "three";
import type { VentanillaDePasaje } from "./asiento-de-pasaje";

/**
 * **Las medidas del marco**, m, sacadas de una ventanilla de avión de línea.
 *
 * - El hueco del forro es más grande que el cristal: tres centímetros y medio
 *   por cada lado, que es lo que se ve de canto.
 * - El canto tiene nueve de fondo: forro, aislante y la piel. Es lo que hace
 *   que una ventanilla sea un túnel corto y no una pegatina.
 * - El bisel, la moldura de plástico que rodea el hueco, mide cuatro y medio.
 * - La junta del cristal, uno.
 * - La persiana sube del todo y deja asomar su filo: cinco centímetros. Bajada
 *   taparía lo que se ha venido a ver, y subida del todo se pierde la pista de
 *   que es una ventanilla de avión.
 */
const MARGEN_DEL_HUECO = 0.035;
const FONDO = 0.09;
const BISEL = 0.045;
const JUNTA = 0.01;
const PERSIANA = 0.05;

/** Los colores, en sRGB, del forro claro de cualquier cabina. */
const COLORES = {
  pared: "#d6d1c5",
  bisel: "#e6e2d8",
  sombra: "#8c877d",
  junta: "#323538",
  persiana: "#ece8df",
  abajo: "#c4bfb3",
};

/** Cuánto alumbra la cabina de noche, de 0 a 1: luces de crucero, bajas. */
const NOCHE = 0.3;
/** Y su color, cálido: el de las luces del pasaje. */
const LUZ_DE_NOCHE = new Color(1, 0.86, 0.68);

const VERTICES = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  // Lo más cerca que se puede: lo de detrás de la pared ya no se calcula.
  gl_Position = vec4(position.xy, -0.99999, 1.0);
}
`;

const FRAGMENTOS = /* glsl */ `
uniform mat4 uInvProj;
uniform mat3 uCamAVentana;
uniform vec3 uOrigen;
uniform vec3 uCristal;
uniform vec3 uHueco;
uniform float uFondo;
uniform vec3 uPared;
uniform vec3 uBisel;
uniform vec3 uSombra;
uniform vec3 uJunta;
uniform vec3 uPersiana;
uniform vec3 uAbajo;
uniform vec3 uLuz;
varying vec2 vNdc;

// Distancia a un rectángulo de esquinas redondas: negativa dentro.
float caja(vec2 p, vec2 medio, float r) {
  vec2 q = abs(p) - medio + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec4 lejos = uInvProj * vec4(vNdc, 1.0, 1.0);
  vec3 d = uCamAVentana * normalize(lejos.xyz / lejos.w);
  vec3 color;
  float alfa = 1.0;
  if (d.z < 1e-4) {
    // Mirando hacia dentro del avión: forro en sombra.
    color = uPared * 0.6;
  } else {
    // El rayo en el plano del forro y en el del cristal.
    vec2 q1 = uOrigen.xy + d.xy * ((-uFondo - uOrigen.z) / d.z);
    vec2 q0 = uOrigen.xy + d.xy * ((0.0 - uOrigen.z) / d.z);
    float s1 = caja(q1, uHueco.xy, uHueco.z);
    float s0 = caja(q0, uCristal.xy, uCristal.z);
    float a1 = max(fwidth(s1), 1e-5);
    float a0 = max(fwidth(s0), 1e-5);

    // La pared: más clara cerca de la ventanilla, que es por donde entra la
    // luz, y el panel de abajo un punto más gris, con su junta.
    float bajo = uHueco.y + 0.17;
    // (Los dos bordes de un smoothstep, siempre de menor a mayor: al revés
    // el resultado no está definido y cada tarjeta hace lo que quiere.)
    vec3 pared = mix(uPared, uAbajo, 1.0 - smoothstep(-bajo - a1, -bajo + a1, q1.y));
    pared *= mix(1.05, 0.74, smoothstep(0.0, 0.9, s1));
    pared *= 1.0 - 0.35 * (1.0 - smoothstep(0.004, 0.004 + a1, abs(q1.y + bajo)));
    // El bisel, la ranura que lo separa de la pared y la pared.
    vec3 bisel = uBisel * mix(1.0, 0.93, smoothstep(0.0, ${BISEL.toFixed(3)}, s1));
    float enBisel = 1.0 - smoothstep(${BISEL.toFixed(3)} - a1, ${BISEL.toFixed(3)} + a1, s1);
    vec3 fuera = mix(pared, bisel, enBisel);
    float ranura = 1.0 - smoothstep(0.0025, 0.0025 + a1 * 1.5, abs(s1 - ${BISEL.toFixed(3)}));
    fuera = mix(fuera, uSombra, ranura * 0.55);

    // Dentro del hueco: el canto, más oscuro arriba —le da la sombra del
    // forro— y más claro abajo, donde da la luz que entra.
    vec2 haciaFuera = normalize(q0 + vec2(1e-5));
    vec3 canto = uBisel * (0.7 - 0.22 * haciaFuera.y);
    canto *= mix(0.82, 1.0, smoothstep(0.0, 0.03, s0));
    // La junta del cristal y el cristal, que no se pinta: ahí está el mundo.
    float enCristal = 1.0 - smoothstep(-a0, a0, s0);
    vec3 dentro = mix(canto, uJunta, enCristal);
    float seVe = 1.0 - smoothstep(-${JUNTA.toFixed(3)} - a0, -${JUNTA.toFixed(3)} + a0, s0);
    float alfaDentro = 1.0 - seVe;
    // El filo de la persiana, arriba, con su labio más oscuro.
    float corte = uCristal.y - ${PERSIANA.toFixed(3)};
    float persiana = smoothstep(corte - a0, corte + a0, q0.y) * enCristal;
    float labio = 1.0 - smoothstep(corte + 0.012, corte + 0.012 + a0, q0.y);
    vec3 colPersiana = mix(uPersiana, uSombra, labio * 0.5);
    dentro = mix(dentro, colPersiana, persiana);
    alfaDentro = max(alfaDentro, persiana);

    float enHueco = 1.0 - smoothstep(-a1, a1, s1);
    color = mix(fuera, dentro, enHueco);
    alfa = mix(1.0, alfaDentro, enHueco);
  }
  gl_FragColor = vec4(color * uLuz, alfa);
  #include <colorspace_fragment>
}
`;

const lineal = (srgb: string): Color => new Color(srgb);

/**
 * El triángulo que cubre la pantalla: uno solo, más grande que ella, que dos
 * triángulos partidos por la diagonal le cuestan a la tarjeta una costura de
 * píxeles calculados dos veces.
 */
function trianguloDePantalla(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  return g;
}

const _u = new Vector3();
const _v = new Vector3();
const _w = new Vector3();

/**
 * La base de la ventanilla en el mundo, como filas: a lo largo, arriba por la
 * pared y hacia fuera. Multiplicar por ella lleva del mundo a la ventanilla.
 */
function baseDeLaVentanilla(
  ventanilla: VentanillaDePasaje,
  orientacion: Quaternion,
  base: Matrix3,
): Matrix3 {
  const n = ventanilla.normal;
  _w.set(n.x, n.y, n.z).normalize();
  _v.set(0, 1, 0).addScaledVector(_w, -_w.y).normalize();
  _u.crossVectors(_v, _w);
  for (const e of [_u, _v, _w]) e.applyQuaternion(orientacion);
  return base.set(_u.x, _u.y, _u.z, _v.x, _v.y, _v.z, _w.x, _w.y, _w.z);
}

/** Las medidas del cristal y del hueco del forro, en medios y con su esquina. */
function medidasDelHueco(v: VentanillaDePasaje): {
  a: number;
  b: number;
  r: number;
  a1: number;
  b1: number;
  r1: number;
} {
  const a = v.ancho / 2;
  const b = v.alto / 2;
  // La misma esquina que el modelo: ver `ventanas` en `modelos/exterior.py`.
  const r = Math.min(a, b) * 0.9;
  return {
    a,
    b,
    r,
    a1: a + MARGEN_DEL_HUECO,
    b1: b + MARGEN_DEL_HUECO,
    r1: r + MARGEN_DEL_HUECO,
  };
}

/** La distancia de la sombra: negativa dentro. La misma que el sombreador. */
function caja(x: number, y: number, a: number, b: number, r: number): number {
  const qx = Math.abs(x) - a + r;
  const qy = Math.abs(y) - b + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

const _base = new Matrix3();
const _o = new Vector3();
const _d = new Vector3();
const _c = new Vector3();

/**
 * **Si desde `desde` se ve `hacia` por el cristal**: la misma cuenta que hace
 * el sombreador con cada píxel —pasar el hueco del forro y llegar al cristal
 * sin tocar el canto, la junta ni la persiana—, para poder preguntarlo sin
 * pintar. La usan las pruebas y el banco de la mirada: que lo señalado caiga
 * en el centro de la pantalla no vale si en el centro está la pared.
 */
export function seVePorLaVentanilla(
  desde: Vector3,
  hacia: { readonly x: number; readonly y: number; readonly z: number },
  avion: { readonly position: Vector3; readonly orientation: Quaternion },
  ventanilla: VentanillaDePasaje,
): boolean {
  baseDeLaVentanilla(ventanilla, avion.orientation, _base);
  const c = ventanilla.centro;
  _c.set(c.x, c.y, c.z).applyQuaternion(avion.orientation).add(avion.position);
  _o.copy(desde).sub(_c).applyMatrix3(_base);
  _d.set(hacia.x, hacia.y, hacia.z).sub(desde).normalize().applyMatrix3(_base);
  if (_d.z < 1e-4) return false;
  const m = medidasDelHueco(ventanilla);
  const t1 = (-FONDO - _o.z) / _d.z;
  const t0 = -_o.z / _d.z;
  const x1 = _o.x + _d.x * t1;
  const y1 = _o.y + _d.y * t1;
  const x0 = _o.x + _d.x * t0;
  const y0 = _o.y + _d.y * t0;
  return (
    caja(x1, y1, m.a1, m.b1, m.r1) < 0 &&
    caja(x0, y0, m.a, m.b, m.r) < -JUNTA &&
    y0 < m.b - PERSIANA
  );
}

export class MarcoDeVentanilla {
  readonly malla: Mesh;
  private readonly material: ShaderMaterial;
  private readonly base = new Matrix3();
  private readonly camara = new Matrix3();
  private readonly centro = new Vector3();
  private readonly ojo = new Vector3();

  constructor() {
    this.material = new ShaderMaterial({
      vertexShader: VERTICES,
      fragmentShader: FRAGMENTOS,
      uniforms: {
        uInvProj: { value: null },
        uCamAVentana: { value: new Matrix3() },
        uOrigen: { value: new Vector3() },
        uCristal: { value: new Vector3(0.14, 0.2, 0.06) },
        uHueco: { value: new Vector3(0.17, 0.23, 0.09) },
        uFondo: { value: FONDO },
        uPared: { value: lineal(COLORES.pared) },
        uBisel: { value: lineal(COLORES.bisel) },
        uSombra: { value: lineal(COLORES.sombra) },
        uJunta: { value: lineal(COLORES.junta) },
        uPersiana: { value: lineal(COLORES.persiana) },
        uAbajo: { value: lineal(COLORES.abajo) },
        uLuz: { value: new Color(1, 1, 1) },
      },
      depthTest: true,
      depthWrite: true,
      fog: false,
    });
    // El borde del cristal, suave con el multimuestreo. Ver la cabecera.
    this.material.alphaToCoverage = true;
    this.malla = new Mesh(trianguloDePantalla(), this.material);
    this.malla.name = "marco-de-ventanilla";
    this.malla.frustumCulled = false;
    // Lo primero de todo: así lo de detrás de la pared ni se calcula.
    this.malla.renderOrder = Number.MIN_SAFE_INTEGER;
    this.malla.visible = false;
  }

  get visible(): boolean {
    return this.malla.visible;
  }

  set visible(si: boolean) {
    this.malla.visible = si;
  }

  /**
   * Lo coloca para este fotograma, **con la cámara ya puesta**: la vista, el
   * giro de la cabeza y el ángulo.
   *
   * `dia` es cuánto es de día dentro de la cabina, de 0 a 1.
   */
  poner(
    camara: PerspectiveCamera,
    avion: { readonly position: Vector3; readonly orientation: Quaternion },
    ventanilla: VentanillaDePasaje,
    dia: number,
  ): void {
    const u = this.material.uniforms;
    camara.updateMatrixWorld();
    u.uInvProj!.value = camara.projectionMatrixInverse;

    baseDeLaVentanilla(ventanilla, avion.orientation, this.base);
    this.camara.setFromMatrix4(camara.matrixWorld);
    (u.uCamAVentana!.value as Matrix3).multiplyMatrices(this.base, this.camara);

    const c = ventanilla.centro;
    this.centro.set(c.x, c.y, c.z).applyQuaternion(avion.orientation).add(avion.position);
    this.ojo.copy(camara.position).sub(this.centro).applyMatrix3(this.base);
    (u.uOrigen!.value as Vector3).copy(this.ojo);

    const m = medidasDelHueco(ventanilla);
    (u.uCristal!.value as Vector3).set(m.a, m.b, m.r);
    (u.uHueco!.value as Vector3).set(m.a1, m.b1, m.r1);

    const luz = NOCHE + (1 - NOCHE) * dia;
    (u.uLuz!.value as Color)
      .setRGB(1, 1, 1)
      .lerp(LUZ_DE_NOCHE, 1 - dia)
      .multiplyScalar(luz);
  }

  /** Lo que mide la ventanilla que se está pintando. Para las pruebas. */
  get medidas(): { cristal: Vector3; hueco: Vector3 } {
    return {
      cristal: this.material.uniforms.uCristal!.value as Vector3,
      hueco: this.material.uniforms.uHueco!.value as Vector3,
    };
  }

  dispose(): void {
    this.malla.geometry.dispose();
    this.material.dispose();
  }
}
