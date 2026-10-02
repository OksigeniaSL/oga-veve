/**
 * Los jirones: la nube que pasa por la ventanilla al atravesarla.
 *
 * «Las nubes no se notan al atravesarlas.» Dentro de una nube de verdad no se
 * ve la nube: se ve gris, y lo que dice que uno va deprisa son los jirones,
 * trozos más claros y más oscuros que pasan pegados al avión y se pierden
 * detrás. Las cinco láminas del cielo no pueden hacer eso —de cerca son una
 * hoja de papel—, y el gris lo pone la niebla: ver `alPaso` en `world/sky.ts`.
 * Esto pone lo que pasa.
 *
 * ## Cómo está hecho
 *
 * Como la lluvia: una caja **alrededor de la cámara** con veinte manchas
 * grandes, quietas en el aire —se las lleva el viento— y que la caja deja
 * atrás al moverse; la que sale por un lado vuelve a entrar por el otro. Cada
 * una pregunta al cielo cuánta nube hay donde está, con el mismo dibujo que se
 * pinta (`densidadEn`), así que **solo hay jirones donde hay nube**: en un
 * hueco de la capa no pasa nada, y bajo la base se ven colgando los primeros,
 * que es lo que avisa de que se va a entrar.
 *
 * Una sola llamada de dibujo: las veinte son cuadrados que miran a la cámara,
 * en una geometría. Y fuera de la capa no se pinta nada.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
} from "three";
import { cuantoDentro, ruidoDeNube } from "./capa-de-nubes";

/** Cuántos jirones lleva la caja. */
export const JIRONES = 20;

/** Media caja en horizontal y en vertical, m. */
const ANCHO = 260;
const ALTO = 90;

/** Desde dónde se ven, y hasta dónde, m. Ver `alfaDelJiron`. */
const DESDE = 12;
const CERCA = 50;
const LEJOS = 240;

/**
 * **Cuánto se ve un jirón**, de 0 a 1: la nube que hay donde está, y dónde
 * está respecto al ojo, en coordenadas de la caja.
 *
 * De cerca se apaga para no tapar la pantalla de golpe al cruzarlo —un
 * cuadrado de cien metros a diez metros del ojo es la pantalla entera—, y
 * hacia los bordes de la caja se apaga antes de llegar, que si no se ve
 * saltar al que sale por un lado y entra por el otro.
 */
export function alfaDelJiron(
  densidad: number,
  x: number,
  y: number,
  z: number,
): number {
  const d = Math.hypot(x, y, z);
  const cerca = Math.max(0, Math.min(1, (d - DESDE) / (CERCA - DESDE)));
  const lejos = Math.max(0, Math.min(1, (LEJOS - d) / 60));
  const arriba = Math.max(0, Math.min(1, (ALTO - Math.abs(y)) / 25));
  return 0.9 * cuantoDentro(densidad) * cerca * cerca * lejos * arriba;
}

/** Envuelve una coordenada de la caja entre `-media` y `media`. */
function envolver(v: number, media: number): number {
  if (v >= -media && v <= media) return v;
  const lado = media * 2;
  return ((((v + media) % lado) + lado) % lado) - media;
}

const VERTICE = /* glsl */ `
  attribute vec2 esquina;
  attribute float tamano;
  attribute float alfa;
  attribute float giro;
  attribute float tono;
  varying vec2 vEsquina;
  varying vec2 vRuido;
  varying float vAlfa;
  varying float vTono;
  void main() {
    // \`position\` es el centro del jirón; la esquina lo abre en cuadrado.
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float c = cos(giro);
    float s = sin(giro);
    // Mirando a la cámara, girado para que no salgan todos iguales.
    mv.xy += vec2(c * esquina.x - s * esquina.y, s * esquina.x + c * esquina.y) * tamano;
    vEsquina = esquina;
    // Cada jirón lee otro trozo del ruido: el giro hace de semilla.
    vRuido = esquina * 0.22 + vec2(giro * 0.37, giro * 0.61);
    vAlfa = alfa;
    vTono = tono;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENTO = /* glsl */ `
  uniform sampler2D ruido;
  uniform vec3 color;
  varying vec2 vEsquina;
  varying vec2 vRuido;
  varying float vAlfa;
  varying float vTono;
  void main() {
    float r = length(vEsquina);
    // Una mancha redonda y blanda, deshilachada por el ruido: sin bordes.
    float n = texture2D(ruido, vRuido).a + 0.45 * (1.0 - r);
    float a = vAlfa * (1.0 - smoothstep(0.3, 1.0, r)) * smoothstep(0.55, 0.95, n);
    if (a < 0.004) discard;
    gl_FragColor = vec4(min(color * vTono, vec3(1.0)), a);
    #include <colorspace_fragment>
  }
`;

export interface PasoDeJirones {
  /** Dónde está la cámara, en el mundo. */
  readonly camara: { readonly x: number; readonly y: number; readonly z: number };
  /** A dónde va el aire, m/s: los jirones van con él. */
  readonly viento?: { readonly x: number; readonly z: number };
  /** Cuánta nube hay en un punto, de 0 a 1. Ver `SkyRig.densidadEn`. */
  readonly densidad: (x: number, y: number, z: number) => number;
  /** El color de la nube desde aquí, en lineal. */
  readonly color: Color;
  /**
   * Si el ojo anda cerca de la capa. Lejos de ella no hay nada que mirar,
   * y no se mueve ni se pinta nada.
   */
  readonly cerca: boolean;
}

export interface JironesEnElMundo {
  readonly grupo: Group;
  paso(dt: number, p: PasoDeJirones): void;
  /** Cuántos se ven ahora. Para el banco. */
  readonly vistos: number;
  dispose(): void;
}

export function crearJirones(): JironesEnElMundo {
  const grupo = new Group();
  grupo.name = "jirones";
  grupo.visible = false;

  const centros = new Float32Array(JIRONES * 4 * 3);
  const esquinas = new Float32Array(JIRONES * 4 * 2);
  const tamanos = new Float32Array(JIRONES * 4);
  const alfas = new Float32Array(JIRONES * 4);
  const giros = new Float32Array(JIRONES * 4);
  const tonos = new Float32Array(JIRONES * 4);
  const indices = new Uint16Array(JIRONES * 6);
  // Dónde está cada uno en la caja, y lo que no cambia.
  const gx = new Float32Array(JIRONES);
  const gy = new Float32Array(JIRONES);
  const gz = new Float32Array(JIRONES);
  for (let i = 0; i < JIRONES; i++) {
    gx[i] = (Math.random() * 2 - 1) * ANCHO;
    gy[i] = (Math.random() * 2 - 1) * ALTO;
    gz[i] = (Math.random() * 2 - 1) * ANCHO;
    // De cuarenta a noventa metros de radio: lo que mide un jirón de
    // estratocúmulo, que de cerca es la ventanilla entera.
    const tamano = 40 + Math.random() * 50;
    const giro = Math.random() * Math.PI * 2;
    /*
     * **Unos más claros y otros más oscuros que la nube.** Dentro, la niebla
     * ya es del color de la nube, y lo que se ve pasar es la diferencia: el
     * trozo más denso, que oscurece, y el más fino, por el que entra luz.
     * Iguales que la niebla no se verían.
     */
    const tono = i % 2 === 0 ? 1.5 : 0.62;
    const esquina = [-1, -1, 1, -1, 1, 1, -1, 1];
    for (let v = 0; v < 4; v++) {
      esquinas[(i * 4 + v) * 2] = esquina[v * 2]!;
      esquinas[(i * 4 + v) * 2 + 1] = esquina[v * 2 + 1]!;
      tamanos[i * 4 + v] = tamano;
      giros[i * 4 + v] = giro;
      tonos[i * 4 + v] = tono;
    }
    const k = i * 6;
    const b = i * 4;
    indices.set([b, b + 1, b + 2, b, b + 2, b + 3], k);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(centros, 3));
  geo.setAttribute("esquina", new BufferAttribute(esquinas, 2));
  geo.setAttribute("tamano", new BufferAttribute(tamanos, 1));
  geo.setAttribute("alfa", new BufferAttribute(alfas, 1));
  geo.setAttribute("giro", new BufferAttribute(giros, 1));
  geo.setAttribute("tono", new BufferAttribute(tonos, 1));
  geo.setIndex(new BufferAttribute(indices, 1));

  const ruido = texturaDeRuido();
  const material = new ShaderMaterial({
    uniforms: { ruido: { value: ruido }, color: { value: new Color() } },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    transparent: true,
    depthWrite: false,
  });
  const malla = new Mesh(geo, material);
  malla.frustumCulled = false;
  malla.name = "jirones";
  grupo.add(malla);

  let antes: { x: number; y: number; z: number } | null = null;
  let vistos = 0;

  return {
    grupo,
    get vistos() {
      return grupo.visible ? vistos : 0;
    },
    paso(dt, { camara, viento, densidad, color, cerca }) {
      const mx = antes ? camara.x - antes.x : 0;
      const my = antes ? camara.y - antes.y : 0;
      const mz = antes ? camara.z - antes.z : 0;
      antes = { x: camara.x, y: camara.y, z: camara.z };
      if (!cerca) {
        grupo.visible = false;
        return;
      }
      const wx = (viento?.x ?? 0) * dt;
      const wz = (viento?.z ?? 0) * dt;
      vistos = 0;
      for (let i = 0; i < JIRONES; i++) {
        // Quietos en el aire, y la caja con la cámara: ver `lluvia.ts`.
        const x = (gx[i] = envolver(gx[i]! + wx - mx, ANCHO));
        const y = (gy[i] = envolver(gy[i]! - my, ALTO));
        const z = (gz[i] = envolver(gz[i]! + wz - mz, ANCHO));
        const a = alfaDelJiron(
          densidad(camara.x + x, camara.y + y, camara.z + z),
          x,
          y,
          z,
        );
        if (a > 0.004) vistos++;
        for (let v = 0; v < 4; v++) {
          const k = (i * 4 + v) * 3;
          centros[k] = x;
          centros[k + 1] = y;
          centros[k + 2] = z;
          alfas[i * 4 + v] = a;
        }
      }
      grupo.visible = vistos > 0;
      if (!grupo.visible) return;
      grupo.position.set(camara.x, camara.y, camara.z);
      // El color de la nube desde aquí; cada jirón lo aclara o lo oscurece.
      (material.uniforms.color!.value as Color).copy(color);
      (geo.getAttribute("position") as BufferAttribute).needsUpdate = true;
      (geo.getAttribute("alfa") as BufferAttribute).needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      material.dispose();
      ruido.dispose();
    },
  };
}

/**
 * El ruido de los jirones: el mismo de las nubes, más pequeño. Blanco y alfa,
 * como el de las láminas: es dato, no color.
 */
function texturaDeRuido(): CanvasTexture {
  const lado = 128;
  const ruido = ruidoDeNube(0x7a1e, lado);
  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;
  const g = lienzo.getContext("2d")!;
  const imagen = g.createImageData(lado, lado);
  for (let i = 0; i < ruido.length; i++) {
    imagen.data[i * 4] = 255;
    imagen.data[i * 4 + 1] = 255;
    imagen.data[i * 4 + 2] = 255;
    imagen.data[i * 4 + 3] = Math.round(ruido[i]! * 255);
  }
  g.putImageData(imagen, 0, 0);
  const textura = new CanvasTexture(lienzo);
  textura.wrapS = 1000;
  textura.wrapT = 1000;
  return textura;
}
