/**
 * El agua en el parabrisas, vista desde la cabina.
 *
 * Al atravesar una nube que llueve —y bajo la lluvia— el parabrisas se moja,
 * y lo que hace el agua en él depende de lo deprisa que se va: **parado**, las
 * gotas se quedan donde caen y resbalan despacio hacia abajo; **corriendo**, el
 * aire las empuja hacia arriba y hacia los lados y se van en un instante,
 * dejando una raya. Es lo que se ve desde cualquier cabina en un día de agua,
 * y es justo lo contrario de lo que haría el agua si el avión estuviera quieto:
 * por eso enseña que el avión va deprisa contra el aire.
 *
 * ## Cómo está hecho
 *
 * Gotas pegadas a la cámara de la cabina, en un plano a metro y medio de los
 * ojos: más allá del cristal y del marco. Así el panel, la visera y los
 * montantes, que están más cerca, las tapan con la profundidad de siempre, y
 * solo se ven donde hay cristal, sin tener que saber la forma del parabrisas
 * de cada avión. Una llamada de dibujo, ciento diez cuadraditos como mucho, y
 * nada si no se moja o no se mira desde dentro.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  ShaderMaterial,
} from "three";

/** Cuántas gotas caben a la vez. */
export const GOTAS = 110;

/** A cuánto de los ojos se pintan, m: más allá del cristal. */
const PLANO = 1.5;

/** Por debajo de esto el aire no las mueve: resbalan, m/s de velocidad. */
const QUIETO = 12;

/**
 * **Cómo se mueve una gota en el cristal**, en metros por segundo del plano
 * de la cámara: `x` a la derecha, `y` hacia arriba.
 *
 * Parado, resbala: tres centímetros por segundo hacia abajo. Corriendo, sube
 * y se abre hacia el lado por el que está, con más fuerza cuanto más deprisa:
 * a sesenta metros por segundo cruza el parabrisas en un segundo, a ciento
 * veinte en medio.
 */
export function comoCorre(
  velocidad: number,
  x: number,
  medioAncho: number,
): { x: number; y: number } {
  if (velocidad <= QUIETO) return { x: 0, y: -0.03 };
  const sube = (velocidad - QUIETO) * 0.018;
  return { x: (x / Math.max(medioAncho, 1e-3)) * 0.5 * sube, y: sube };
}

/**
 * Cuántas gotas llegan por segundo, con el cristal mojado `mojado` (de 0 a
 * 1) y yendo a `velocidad` m/s. Corriendo se cruza más agua por segundo, que
 * es lo mismo que pasa al correr bajo la lluvia.
 */
export function cuantasLlegan(mojado: number, velocidad: number): number {
  const m = Math.max(0, Math.min(1, mojado));
  return m * (6 + 0.5 * Math.min(Math.max(velocidad, 0), 140));
}

const VERTICE = /* glsl */ `
  attribute vec2 forma;
  attribute float alfa;
  varying vec2 vForma;
  varying float vAlfa;
  void main() {
    vForma = forma;
    vAlfa = alfa;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/*
 * Una gota es una lente: deja ver lo de detrás, más oscuro por dentro y con
 * un brillo en el borde por el lado de arriba, que es de donde viene la luz.
 * Sin brillo es una mancha; sin transparencia, un confeti.
 */
const FRAGMENTO = /* glsl */ `
  varying vec2 vForma;
  varying float vAlfa;
  void main() {
    float r = length(vForma);
    if (r > 1.0) discard;
    float borde = smoothstep(0.55, 0.95, r);
    float luz = clamp(dot(vForma / max(r, 1e-3), vec2(-0.45, 0.89)), 0.0, 1.0);
    vec3 color = mix(vec3(0.38, 0.43, 0.48), vec3(0.96, 0.98, 1.0), luz * borde);
    float a = vAlfa * (0.3 + 0.55 * borde) * (1.0 - smoothstep(0.88, 1.0, r));
    gl_FragColor = vec4(color, a);
    #include <colorspace_fragment>
  }
`;

/** La cámara de la cabina, lo justo para saber qué se ve del plano. */
interface CamaraDeCabina {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly quaternion: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
  };
  readonly fov: number;
  readonly aspect: number;
}

export interface PasoDeGotas {
  readonly camara: CamaraDeCabina;
  /** Cuánta agua le llega al cristal, de 0 a 1. */
  readonly mojado: number;
  /** La velocidad respecto al aire, m/s. */
  readonly velocidad: number;
  /** Si se mira desde la cabina. Desde fuera no hay cristal delante. */
  readonly desdeDentro: boolean;
}

export interface GotasEnElParabrisas {
  readonly grupo: Group;
  paso(dt: number, p: PasoDeGotas): void;
  /** Cuántas hay ahora en el cristal. Para el banco y las pruebas. */
  readonly enElCristal: number;
  dispose(): void;
}

export function crearGotasEnElParabrisas(
  azar: () => number = Math.random,
): GotasEnElParabrisas {
  const grupo = new Group();
  grupo.name = "gotas-en-el-parabrisas";
  grupo.visible = false;

  const posiciones = new Float32Array(GOTAS * 4 * 3);
  const formas = new Float32Array(GOTAS * 4 * 2);
  const alfas = new Float32Array(GOTAS * 4);
  const indices = new Uint16Array(GOTAS * 6);
  const esquina = [-1, -1, 1, -1, 1, 1, -1, 1];
  for (let i = 0; i < GOTAS; i++) {
    for (let v = 0; v < 4; v++) {
      formas[(i * 4 + v) * 2] = esquina[v * 2]!;
      formas[(i * 4 + v) * 2 + 1] = esquina[v * 2 + 1]!;
    }
    const b = i * 4;
    indices.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(posiciones, 3));
  geo.setAttribute("forma", new BufferAttribute(formas, 2));
  geo.setAttribute("alfa", new BufferAttribute(alfas, 1));
  geo.setIndex(new BufferAttribute(indices, 1));
  const material = new ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    transparent: true,
    depthWrite: false,
    // Con la profundidad, que es lo que deja el panel y el marco por delante.
    depthTest: true,
  });
  const malla = new Mesh(geo, material);
  malla.frustumCulled = false;
  // Lo último de lo transparente: está pegado a los ojos.
  malla.renderOrder = 10;
  grupo.add(malla);

  // Cada gota: dónde está en el plano, cuánto le queda, de qué tamaño.
  const gx = new Float32Array(GOTAS);
  const gy = new Float32Array(GOTAS);
  const vida = new Float32Array(GOTAS);
  const radio = new Float32Array(GOTAS);
  let porLlegar = 0;
  let enElCristal = 0;

  return {
    grupo,
    get enElCristal() {
      return grupo.visible ? enElCristal : 0;
    },
    paso(dt, { camara, mojado, velocidad, desdeDentro }) {
      if (!desdeDentro) {
        // Desde fuera no hay cristal; y al volver dentro, seco: el agua de
        // hace un rato ya se la llevó el aire.
        grupo.visible = false;
        vida.fill(0);
        porLlegar = 0;
        return;
      }
      const alto = PLANO * Math.tan(((camara.fov / 2) * Math.PI) / 180);
      const ancho = alto * camara.aspect;
      // Las que llegan en este paso: se acumula la fracción.
      porLlegar += cuantasLlegan(mojado, velocidad) * dt;
      enElCristal = 0;
      for (let i = 0; i < GOTAS; i++) {
        if (vida[i]! <= 0 && porLlegar >= 1) {
          porLlegar -= 1;
          // Donde hay cristal: de la visera para arriba, con algo de margen.
          gx[i] = (azar() * 2 - 1) * ancho * 1.05;
          gy[i] = (-0.2 + azar() * 1.2) * alto;
          /*
           * De uno a dos centímetros y medio a metro y medio: de cinco a doce
           * píxeles en una tablet. Una gota de verdad en el cristal mide la
           * mitad, y a ese tamaño en una pantalla pequeña no se ve que el
           * cristal está mojado, que es lo que hay que contar.
           */
          radio[i] = 0.01 + azar() * 0.015;
          vida[i] = velocidad > QUIETO ? 2 : 2.5 + azar() * 3;
        }
        if (vida[i]! <= 0) {
          alfas.fill(0, i * 4, i * 4 + 4);
          continue;
        }
        const v = comoCorre(velocidad, gx[i]!, ancho);
        gx[i] = gx[i]! + v.x * dt;
        gy[i] = gy[i]! + v.y * dt;
        vida[i] = vida[i]! - dt;
        // Se va por arriba o por los lados: se acabó.
        if (gy[i]! > alto * 1.1 || Math.abs(gx[i]!) > ancho * 1.1) vida[i] = 0;
        const a = vida[i]! <= 0 ? 0 : Math.min(1, vida[i]! / 0.4);
        if (a > 0) enElCristal++;
        /*
         * La forma: redonda parada, y estirada en la dirección en que corre,
         * lo que recorre en cincuenta milisegundos. Es la raya que deja.
         */
        const rapidez = Math.hypot(v.x, v.y);
        const ux = rapidez > 1e-6 ? v.x / rapidez : 0;
        const uy = rapidez > 1e-6 ? v.y / rapidez : 1;
        const r = radio[i]!;
        const largo = r + rapidez * 0.05;
        /*
         * Los dos ejes del cuadradito: a lo largo y de través, con el de
         * través a la derecha del de a lo largo. Al revés, las cuatro
         * esquinas giran en el sentido de las agujas del reloj, la tarjeta
         * las toma por la cara de atrás y no pinta ni una gota: así salió la
         * primera vez, con veinte gotas contadas y ninguna en la foto.
         */
        const lx = ux * largo;
        const ly = uy * largo;
        const tx = uy * r;
        const ty = -ux * r;
        const esquinas = [
          [-lx - tx, -ly - ty],
          [-lx + tx, -ly + ty],
          [lx + tx, ly + ty],
          [lx - tx, ly - ty],
        ];
        for (let k = 0; k < 4; k++) {
          const p = (i * 4 + k) * 3;
          posiciones[p] = gx[i]! + esquinas[k]![0]!;
          posiciones[p + 1] = gy[i]! + esquinas[k]![1]!;
          posiciones[p + 2] = -PLANO;
          alfas[i * 4 + k] = a;
        }
      }
      // Lo que no llegó a caber se pierde: el cristal ya está lleno.
      porLlegar = Math.min(porLlegar, 1);
      grupo.visible = enElCristal > 0;
      if (!grupo.visible) return;
      grupo.position.set(camara.position.x, camara.position.y, camara.position.z);
      grupo.quaternion.set(
        camara.quaternion.x,
        camara.quaternion.y,
        camara.quaternion.z,
        camara.quaternion.w,
      );
      (geo.getAttribute("position") as BufferAttribute).needsUpdate = true;
      (geo.getAttribute("alfa") as BufferAttribute).needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}
