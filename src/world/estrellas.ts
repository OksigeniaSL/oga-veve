/**
 * **Las estrellas y la Luna**, dibujadas donde están esta noche.
 *
 * La cuenta de dónde está cada cosa vive en `cielo-de-noche.ts`; aquí está el
 * dibujo, y el dibujo tiene una sola regla: **lo que cuesta se mide**. Son las
 * cinco mil ochenta estrellas del Yale Bright Star Catalogue en **una sola
 * llamada de dibujo** —un `Points` con su brillo y su color por vértice— y la
 * Luna en otra, un cuadrado de dos triángulos que solo se pinta cuando está
 * sobre el horizonte y es de noche. La Vía Láctea no es de aquí: la pinta la
 * cúpula del cielo, que ya pasa por cada píxel del cielo. Ver `sky.ts`.
 *
 * ## Fijas en el cielo, no en el mundo
 *
 * Las estrellas están en el infinito: no se acercan al volar ni cambian de
 * sitio al subir. Así que no se colocan en el mundo con su matriz de modelo:
 * el sombreador gira cada dirección con la matriz del cielo de esta noche y
 * con **solo el giro** de la cámara, sin su posición, y la clava en el plano
 * lejano como clava la cúpula su cielo. Detrás de todo lo que se dibuja y
 * delante de nada.
 *
 * ## Cada estrella con su brillo y su color
 *
 * La magnitud dice cuánta luz llega, y el ojo no la ve en proporción: una de
 * primera es cien veces más brillante que una de sexta y no parece cien veces
 * más. Por eso el brillo sale de la magnitud con una curva más suave que la
 * física, la que usan los planetarios, y el tamaño solo crece en las muy
 * brillantes: a simple vista una estrella es un punto, no una bola.
 *
 * El color, del B−V del catálogo: Antares y Betelgeuse anaranjadas, Rigel y
 * Ácrux azuladas. Y muy apagado, que es como se ve de noche: el ojo a oscuras
 * casi no distingue colores, y un cielo de puntos de colores sería un juguete.
 *
 * ## Y cerca del horizonte, menos
 *
 * La luz que llega rasante cruza cuarenta veces más aire y pierde dos o tres
 * magnitudes: las estrellas se apagan antes de tocar el horizonte. Debajo del
 * horizonte que se ve —que desde arriba está por debajo de la horizontal—, no
 * se pinta ninguna.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix3,
  Mesh,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { type CieloDeAhora, type Mat3, unitario } from "./cielo-de-noche";

/** Lo que trae `data/cielo/estrellas.json`. Ver `scripts/bsc5-a-estrellas.mjs`. */
export interface Catalogo {
  /** Cuatro enteros por estrella: AR y declinación en centésimas de grado, V y B−V en centésimas. */
  readonly estrellas: readonly number[];
}

/** El B−V que falta en el catálogo. */
const SIN_COLOR = 999;

/**
 * El color de una estrella por su B−V, en lineal y de 0 a 1.
 *
 * Del B−V a la temperatura con la fórmula de Ballesteros (2012), y de la
 * temperatura al color con la aproximación de Helland al cuerpo negro. Y
 * después **casi todo hacia el blanco**: ver la cabecera.
 */
export function colorDeEstrella(bv: number): [number, number, number] {
  const b = Math.max(-0.4, Math.min(2, bv));
  const T = 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
  const t = T / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const az =
    t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = [r, g, az].map((x) => Math.max(0, Math.min(255, x)) / 255);
  // Lo que queda del color: un tercio. A oscuras el ojo ve casi en gris.
  const deColor = 0.35;
  return c.map((x) => 1 - deColor + deColor * x) as [number, number, number];
}

/**
 * **Cuánto se ve una estrella**, de 0 a 1, por su magnitud.
 *
 * La física diría `10^(−0,4·m)`: cada magnitud, dos veces y media menos. Con
 * esa curva, en una pantalla de ocho bits las de quinta y sexta no llegan a
 * un escalón de color y el cielo se queda en las cuarenta brillantes. Con la
 * mitad de pendiente —lo que hacen los planetarios, que tienen el mismo
 * problema— la Cruz y la Polar siguen siendo de las que mandan y el cielo
 * tiene sus miles de puntos débiles, que es como se ve una noche de campo.
 */
export function brilloDeMagnitud(m: number): number {
  return Math.min(1, Math.pow(10, -0.2 * (m - 1.8)));
}

/**
 * Y su tamaño en pantalla, en píxeles de CSS: un punto de dos, salvo las
 * brillantes. Con menos de dos, un punto que cae a caballo de cuatro píxeles
 * se reparte entre ellos y se apaga: la estrella parpadea al girar la cabeza.
 * Y las de segunda para arriba, más grandes: son las que dibujan las figuras
 * —las cuatro de la Cruz, la Polar— y tienen que saltar a la vista entre las
 * miles de débiles.
 */
export function tamanoDeMagnitud(m: number): number {
  return Math.max(2.2, Math.min(7, 2.2 + 2 * (3 - m)));
}

/** Del `Mat3` por filas de la cuenta al `Matrix3` de three.js. */
function aMatrix3(m: Mat3, destino: Matrix3): Matrix3 {
  return destino.set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
}

const VERTICE_DE_ESTRELLA = /* glsl */ `
  uniform mat3 alMundo;
  uniform float brillo;
  uniform float escala;
  uniform float senoDelHorizonte;
  attribute float luz;
  attribute float tamano;
  attribute vec3 tinte;
  varying vec3 vColor;
  varying float vAlfa;
  void main() {
    vec3 dir = alMundo * position;
    /*
     * Sobre el horizonte que se ve, y apagándose en los últimos cinco grados:
     * es aire rasante. Ver la cabecera.
     */
    float alto = dir.y + senoDelHorizonte;
    float rasante = smoothstep(0.0, 0.09, alto);
    vAlfa = luz * brillo * rasante * rasante;
    vColor = tinte;
    // Solo el giro de la cámara: las estrellas están en el infinito.
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * dir, 1.0);
    p.z = p.w;
    gl_Position = p;
    // Un punto apagado no llega a pintarse: tamaño cero.
    gl_PointSize = vAlfa > 0.004 ? tamano * escala : 0.0;
  }
`;

const FRAGMENTO_DE_ESTRELLA = /* glsl */ `
  varying vec3 vColor;
  varying float vAlfa;
  void main() {
    // Redonda y blanda en el borde: una estrella no tiene esquinas.
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = vAlfa * (1.0 - smoothstep(0.5, 1.0, r));
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

/**
 * **La Luna**: un disco alumbrado desde donde está el Sol de verdad, con sus
 * mares, y el norte de su disco hacia donde lo tiene esa noche.
 *
 * Del tamaño del sol que pinta la cúpula —grado y medio, el triple del de
 * verdad—, y por lo mismo: a su tamaño real en un teléfono son cinco píxeles
 * y no se ve la fase. **Igual que el Sol**, porque de verdad miden lo mismo
 * en el cielo, y es por lo que la Luna puede taparlo entero en un eclipse.
 *
 * La fase no se dibuja: se alumbra. Cada píxel del disco es un punto de una
 * bola, y está claro u oscuro según mire al Sol o no. Así la Luna creciente
 * sale como una C o como una D según el hemisferio sin que nadie lo escriba:
 * es la misma bola alumbrada desde el mismo sitio, mirada cabeza abajo.
 *
 * Los mares, las manchas oscuras que todo el mundo reconoce —el conejo, la
 * cara—, puestos en sus coordenadas selenográficas: el de las Lluvias, el de
 * la Serenidad, el de la Tranquilidad, el de las Crisis… Y la parte sin sol
 * no es negra del todo: la alumbra la Tierra, la «luz cenicienta».
 */
const VERTICE_DE_LUNA = /* glsl */ `
  uniform vec3 haciaLaLuna;
  uniform vec3 norteDeLaLuna;
  uniform float radio;
  varying vec2 vDisco;
  void main() {
    vec3 d = normalize(haciaLaLuna);
    vec3 arriba = normalize(norteDeLaLuna - dot(norteDeLaLuna, d) * d);
    vec3 derecha = normalize(cross(d, arriba));
    // El cuadrado mide tres radios a cada lado: el resplandor alrededor.
    vDisco = position.xy * 3.0;
    vec3 dir = d + (derecha * position.x + arriba * position.y) * radio * 3.0;
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * dir, 1.0);
    p.z = p.w;
    gl_Position = p;
  }
`;

/** Los mares, en latitud y longitud selenográficas y su radio, en grados. */
const MARES: readonly (readonly [number, number, number])[] = [
  [32.8, -15.6, 17], // de las Lluvias, Imbrium
  [28.0, 17.5, 11], // de la Serenidad
  [8.5, 31.4, 13], // de la Tranquilidad
  [17.0, 59.1, 8], // de las Crisis
  [-7.8, 51.3, 11], // de la Fecundidad
  [-15.2, 35.5, 6], // del Néctar
  [-21.3, -16.6, 11], // de las Nubes
  [-24.4, -38.6, 6], // de los Humores
  [18.4, -57.4, 22], // océano de las Tormentas
  [-5.0, -40.0, 14], // y su parte de abajo
  [56.0, 1.4, 7], // del Frío
];

const GLSL_MARES = MARES.map(([lat, lon, r]) => {
  const [x, y, z] = [
    Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
    Math.sin((lat * Math.PI) / 180),
    Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
  ];
  const c = Math.cos((r * Math.PI) / 180);
  return `mar += smoothstep(${c.toFixed(5)}, ${Math.min(0.99999, c + (1 - c) * 0.9).toFixed(5)}, dot(n, vec3(${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)})));`;
}).join("\n    ");

const FRAGMENTO_DE_LUNA = /* glsl */ `
  uniform vec3 haciaLaLuna;
  uniform vec3 norteDeLaLuna;
  uniform vec3 haciaElSol;
  uniform float brillo;
  varying vec2 vDisco;
  void main() {
    float r = length(vDisco);
    vec3 d = normalize(haciaLaLuna);
    vec3 arriba = normalize(norteDeLaLuna - dot(norteDeLaLuna, d) * d);
    vec3 derecha = normalize(cross(d, arriba));
    // El Sol en los ejes del disco: derecha, arriba y hacia quien mira.
    vec3 s = normalize(vec3(dot(haciaElSol, derecha), dot(haciaElSol, arriba), -dot(haciaElSol, d)));
    float alumbrada = 0.5 - 0.5 * dot(s, vec3(0.0, 0.0, -1.0));
    // El resplandor: lo que la Luna alumbra del aire, según cuánta tenga.
    float halo = exp(-r * 2.2) * 0.18 * alumbrada * alumbrada;
    vec3 c = vec3(0.0);
    float a = 0.0;
    if (r < 1.0) {
      vec3 n = vec3(vDisco, sqrt(1.0 - r * r));
      float mar = 0.0;
      ${GLSL_MARES}
      float suelo = 0.92 - 0.3 * clamp(mar, 0.0, 1.0);
      float sol = smoothstep(-0.04, 0.06, dot(n, s));
      // Y la luz cenicienta: la Tierra alumbrando la parte de noche.
      c = vec3(1.0, 0.97, 0.9) * suelo * (sol + 0.035);
      a = 1.0 - smoothstep(0.96, 1.0, r);
    }
    vec3 total = c * a + vec3(0.75, 0.8, 0.9) * halo * (1.0 - a);
    gl_FragColor = vec4(total * brillo, 1.0);
  }
`;

export interface CieloEstrellado {
  readonly grupo: Group;
  /** Pone el cielo de un instante y un sitio. Ver `cieloDe`. */
  ponerCielo(cielo: CieloDeAhora): void;
  /**
   * Cuánto se ve, de 0 a 1: lo que deja la hora y lo que dejan las nubes.
   * Con cero no se dibuja nada, ni se paga la llamada.
   */
  ponerBrillo(brillo: number): void;
  /** El horizonte que se ve desde la altura del ojo. Ver `horizonteDesde`. */
  ponerHorizonte(seno: number): void;
  /** Las estrellas, cuando llegan. Ver `cargarEstrellas`. */
  ponerCatalogo(catalogo: Catalogo): void;
  /** Cuántas hay dibujadas. Para las pruebas y el banco. */
  readonly cuantas: number;
}

/** El radio de la Luna dibujada, en radianes: el del sol de la cúpula. */
export const RADIO_DE_LA_LUNA = (0.75 * Math.PI) / 180;

export function crearCieloEstrellado(): CieloEstrellado {
  const grupo = new Group();
  grupo.name = "cielo-estrellado";

  const comunes = {
    alMundo: { value: new Matrix3() },
    brillo: { value: 0 },
    escala: { value: 1 },
    senoDelHorizonte: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms: comunes,
    vertexShader: VERTICE_DE_ESTRELLA,
    fragmentShader: FRAGMENTO_DE_ESTRELLA,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(0), 3));
  const puntos = new Points(geo, material);
  puntos.name = "estrellas";
  // Siempre en pantalla: su caja no dice nada, están en el infinito.
  puntos.frustumCulled = false;
  /*
   * **Antes que las nubes.** Lo transparente se pinta de atrás adelante por
   * su orden, y las capas de nubes van a −1: así una nube tapa la estrella
   * que tiene detrás, y no al revés.
   */
  puntos.renderOrder = -3;
  puntos.visible = false;
  // El tamaño en píxeles de CSS, no de la pantalla: en una de densidad doble
  // el punto mide el doble de píxeles para medir lo mismo a la vista.
  puntos.onBeforeRender = (pintor) => {
    comunes.escala.value = pintor.getPixelRatio();
  };
  grupo.add(puntos);

  const lunaUniformes = {
    haciaLaLuna: { value: new Vector3(0, -1, 0) },
    norteDeLaLuna: { value: new Vector3(0, 0, -1) },
    haciaElSol: { value: new Vector3(0, -1, 0) },
    radio: { value: RADIO_DE_LA_LUNA },
    brillo: { value: 0 },
  };
  const cuadrado = new BufferGeometry();
  cuadrado.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
  );
  cuadrado.setIndex([0, 1, 2, 0, 2, 3]);
  const luna = new Mesh(
    cuadrado,
    new ShaderMaterial({
      uniforms: lunaUniformes,
      vertexShader: VERTICE_DE_LUNA,
      fragmentShader: FRAGMENTO_DE_LUNA,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  luna.name = "luna";
  luna.frustumCulled = false;
  luna.renderOrder = -2;
  luna.visible = false;
  grupo.add(luna);

  let brillo = 0;
  let hayEstrellas = false;
  let senoDelHorizonte = 0;
  const lunaSobreElHorizonte = (): boolean =>
    lunaUniformes.haciaLaLuna.value.y + senoDelHorizonte > -RADIO_DE_LA_LUNA;
  const decidir = (): void => {
    puntos.visible = hayEstrellas && brillo > 0.004;
    /*
     * La Luna se ve antes que las estrellas —en el crepúsculo ya está— y
     * más que ellas. Pero no de día: el sol que pinta el juego no es el de
     * verdad, y una Luna de día podría tener la cara alumbrada mirando a
     * donde no está el sol pintado. Ver `cielo-de-noche.ts`.
     */
    lunaUniformes.brillo.value = Math.min(1, brillo * 2.5);
    luna.visible = lunaUniformes.brillo.value > 0.004 && lunaSobreElHorizonte();
  };

  return {
    grupo,
    get cuantas() {
      return geo.getAttribute("position").count;
    },
    ponerCielo(cielo) {
      aMatrix3(cielo.mundoDesdeJ2000, comunes.alMundo.value);
      lunaUniformes.haciaLaLuna.value.set(...cielo.luna);
      lunaUniformes.norteDeLaLuna.value.set(...cielo.norteDeLaLuna);
      lunaUniformes.haciaElSol.value.set(...cielo.sol);
      decidir();
    },
    ponerBrillo(b) {
      brillo = Math.max(0, Math.min(1, b));
      comunes.brillo.value = brillo;
      decidir();
    },
    ponerHorizonte(seno) {
      senoDelHorizonte = seno;
      comunes.senoDelHorizonte.value = seno;
      decidir();
    },
    ponerCatalogo(catalogo) {
      const e = catalogo.estrellas;
      const n = Math.floor(e.length / 4);
      const pos = new Float32Array(n * 3);
      const luz = new Float32Array(n);
      const tam = new Float32Array(n);
      const tinte = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const [x, y, z] = unitario(e[i * 4]! / 100, e[i * 4 + 1]! / 100);
        pos.set([x, y, z], i * 3);
        const m = e[i * 4 + 2]! / 100;
        luz[i] = brilloDeMagnitud(m);
        tam[i] = tamanoDeMagnitud(m);
        const bv = e[i * 4 + 3]!;
        tinte.set(colorDeEstrella(bv === SIN_COLOR ? 0.3 : bv / 100), i * 3);
      }
      geo.setAttribute("position", new BufferAttribute(pos, 3));
      geo.setAttribute("luz", new BufferAttribute(luz, 1));
      geo.setAttribute("tamano", new BufferAttribute(tam, 1));
      geo.setAttribute("tinte", new BufferAttribute(tinte, 3));
      hayEstrellas = n > 0;
      decidir();
    },
  };
}

/**
 * **El catálogo, cuando haga falta.** Son noventa kilobytes —cuarenta
 * comprimidos— que de día no sirven para nada, así que no van en el paquete
 * con el que arranca el juego: se piden la primera vez que anochece. Van en
 * su propio trozo de JavaScript, y por eso el service worker los guarda con
 * el armazón y también hay estrellas sin red.
 *
 * Si la red falla, se devuelve `null` y se vuelve a pedir la próxima vez:
 * una noche sin estrellas es mejor que una noche que se cuelga.
 */
export async function cargarEstrellas(): Promise<Catalogo | null> {
  try {
    const m = await import("../../data/cielo/estrellas.json");
    return (m.default ?? m) as unknown as Catalogo;
  } catch {
    return null;
  }
}
