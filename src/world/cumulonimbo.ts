/**
 * **El cumulonimbo**: la nube de tormenta, vista desde lejos.
 *
 * Lo pide el #49 («el bicho: torre, yunque y cortina de lluvia visibles desde
 * lejos») y es la mitad de la lección del ejercicio de la tormenta: **una
 * tormenta se ve venir**. Desde ochenta kilómetros se ve una torre blanca que
 * sube hasta trece mil metros, con la base plana y oscura, la cortina de agua
 * colgando debajo y arriba el yunque, aplastado contra el techo de la
 * atmósfera y estirado por el viento de altura. Quien lo haya visto aquí lo va
 * a reconocer desde la ventanilla, y va a saber que a eso no se entra.
 *
 * ## A la escala de lo que pinta el radar
 *
 * La torre ocupa lo que el radar pinta —ver `RADIO_DEL_ECO` en
 * `flight/practica-de-tormenta.ts`— y la cortina cuelga donde el radar pinta
 * agua. El yunque no sale en el radar, y eso también es verdad: es hielo, que
 * casi no devuelve eco, y por eso debajo de él puede caer granizo «con el
 * cielo despejado».
 *
 * ## Cómo está hecho, y lo que cuesta
 *
 * Unas treinta bolas deformadas, cosidas en una sola malla con su color por
 * vértice —oscuro abajo, blanco arriba— y la luz del sol de la escena: una
 * llamada de dibujo y unos ocho mil triángulos. La cortina, un cilindro
 * abierto con rayas que bajan: otra llamada. Y el rayo, una cinta quebrada que
 * solo existe el instante en que cae: la tercera, y casi nunca. Medido con el
 * banco de rendimiento; ver el informe del encargo.
 *
 * **Se ve de lejos** porque la niebla le pesa menos que al suelo: la bruma
 * vive abajo, en los primeros kilómetros de aire, y casi toda la torre está
 * por encima de ella. Y si queda más lejos que el plano lejano de la cámara,
 * se dibuja más cerca y más pequeña en la misma dirección, que en pantalla es
 * idéntico. Ver `acercarParaVerse`.
 *
 * ## El rayo, sin parpadeo
 *
 * Como `relampago.ts`: un solo pulso, nunca un titileo, y con el movimiento
 * reducido un resplandor suave. Lo que se enciende es la nube por dentro y la
 * cinta del rayo; el mundo entero solo se alumbra con el que cae cerca, y eso
 * lo pide el juego por la luz de siempre.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type PerspectiveCamera,
  RepeatWrapping,
  SRGBColorSpace,
  AdditiveBlending,
  type Material,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "./noise";
import { BASE, CIMA, RADIO_DEL_ECO, radioDelRojo, FUERZA_DEL_ECO } from "../flight/practica-de-tormenta";

/**
 * Una bola de la nube: centro y semiejes en metros, y su giro alrededor de la
 * vertical, rad —el de las del yunque, estiradas con el viento—.
 */
export interface Bola {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
  readonly giro?: number;
}

/**
 * **Las bolas de la nube**, en metros, con el suelo en `y = 0` y el centro de
 * la tormenta en el origen.
 *
 * `yunque` es hacia dónde se estira el yunque, unitario. Con la misma
 * `semilla`, la misma nube: una tormenta que cambia de forma cada vez que se
 * repite el ejercicio no se aprende.
 */
export function bolasDelCumulonimbo(
  yunque: { readonly x: number; readonly z: number },
  semilla = 7,
): Bola[] {
  const azar = mulberry32(semilla);
  const entre = (a: number, b: number): number => a + (b - a) * azar();
  const bolas: Bola[] = [];
  /*
   * **La base**: ancha y aplastada, y plana por abajo —eso lo hace el dibujo
   * al coser, ver `crearCumulonimbo`—. Es la parte oscura, la que tapa el sol.
   */
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + entre(-0.3, 0.3);
    const r = i === 0 ? 0 : entre(1800, 3200);
    bolas.push({
      x: Math.cos(a) * r,
      y: BASE + 700,
      z: Math.sin(a) * r,
      rx: entre(3200, 4200),
      ry: entre(800, 1100),
      rz: entre(3200, 4200),
    });
  }
  /*
   * **La torre**: pisos de tres bolas que se van estrechando y torciendo un
   * poco con el viento, como coliflor. Llega hasta donde empieza el yunque.
   */
  const pisos = 7;
  for (let p = 0; p < pisos; p++) {
    const u = p / (pisos - 1);
    const y = BASE + 2200 + u * (CIMA - BASE - 4200);
    const ancho = 3900 - 1100 * u;
    // Arriba se inclina hacia donde sopla: el viento de altura la tumba.
    const lleva = u * u * 1400;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + p * 1.1 + entre(-0.4, 0.4);
      const r = entre(600, 1500);
      bolas.push({
        x: Math.cos(a) * r + yunque.x * lleva,
        y: y + entre(-300, 300),
        z: Math.sin(a) * r + yunque.z * lleva,
        rx: ancho * entre(0.75, 0.95),
        ry: entre(1500, 2100),
        rz: ancho * entre(0.75, 0.95),
      });
    }
  }
  /*
   * **Y los bultos**: torres pequeñas pegadas a la grande, a distintas
   * alturas, que es lo que hace coliflor y no una pila de platos.
   */
  for (let i = 0; i < 8; i++) {
    const a = entre(0, Math.PI * 2);
    const u = entre(0.05, 0.75);
    const ancho = 3900 - 1100 * u;
    const r = entre(1500, 2200);
    bolas.push({
      x: Math.cos(a) * (ancho * 0.75) + yunque.x * u * u * 1400,
      y: BASE + 2200 + u * (CIMA - BASE - 4200),
      z: Math.sin(a) * (ancho * 0.75) + yunque.z * u * u * 1400,
      rx: r,
      ry: r * entre(1, 1.4),
      rz: r,
    });
  }
  /*
   * **El yunque**: aplastado contra la tropopausa y estirado hacia donde
   * sopla el viento de arriba, hasta veinte kilómetros. Es lo que se ve
   * primero desde muy lejos, y debajo de él no se pasa.
   */
  const alto = CIMA - 900;
  // Estiradas a lo largo del viento: un yunque es una cuña, no un plato.
  const giro = Math.atan2(yunque.z, yunque.x);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const lejos = 1500 + t * 15000;
    const de = (azar() - 0.5) * (2000 + 3000 * t);
    bolas.push({
      x: yunque.x * lejos - yunque.z * de,
      // Más gruesa junto a la torre, y afinándose hacia la punta.
      y: alto - t * 400 + entre(-150, 150),
      z: yunque.z * lejos + yunque.x * de,
      rx: entre(6500, 8500) * (1 - 0.35 * t),
      ry: entre(650, 950) * (1 - 0.4 * t),
      rz: entre(3800, 4800) * (1 - 0.25 * t),
      giro,
    });
  }
  // Y la cúpula que se pasa del yunque: la torre empujando más arriba.
  bolas.push({
    x: yunque.x * 1600,
    y: CIMA - 200,
    z: yunque.z * 1600,
    rx: 2200,
    ry: 1100,
    rz: 2200,
  });
  return bolas;
}

/**
 * **Cuánto se acerca para verse**: si la nube queda más lejos que lo que
 * dibuja la cámara, se pone en la misma dirección y a escala, que en pantalla
 * es idéntico. Devuelve la escala, de 0 a 1; uno es en su sitio.
 */
export function acercarParaVerse(distancia: number, alcance: number): number {
  if (!(distancia > alcance) || alcance <= 0) return 1;
  return alcance / distancia;
}

/** Un punto en metros. */
export interface Punto {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * **El camino de un rayo**: de `desde` a `hasta` en tramos quebrados, que es
 * como baja una descarga —a saltos, buscando el aire que mejor conduce—, y
 * con una rama. Los puntos van en pares: cada par es un tramo de la cinta.
 */
export function caminoDelRayo(
  desde: Punto,
  hasta: Punto,
  semilla: number,
  /**
   * Por dónde tiene que pasar, si por algún sitio: el avión, cuando el rayo
   * lo toca. Entra por un punto y sale por otro, y entre medias corre por la
   * chapa.
   */
  por?: Punto,
): Punto[] {
  const azar = mulberry32(semilla);
  const tramos = 12;
  const largo = Math.hypot(hasta.x - desde.x, hasta.y - desde.y, hasta.z - desde.z);
  const quiebro = largo * 0.06;
  const puntos: Punto[] = [desde];
  // La recta de la que se quiebra: de punta a punta, o por el punto de paso.
  const sobre = (t: number): Punto => {
    if (!por) return {
      x: desde.x + (hasta.x - desde.x) * t,
      y: desde.y + (hasta.y - desde.y) * t,
      z: desde.z + (hasta.z - desde.z) * t,
    };
    const [a, b, u] = t < 0.5 ? [desde, por, t * 2] : [por, hasta, (t - 0.5) * 2];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
  };
  for (let i = 1; i < tramos; i++) {
    const t = i / tramos;
    const p = sobre(t);
    // Por el punto de paso, clavado: sin quiebro donde toca.
    const q = por && i === tramos / 2 ? 0 : quiebro;
    puntos.push({
      x: p.x + (azar() - 0.5) * q,
      y: p.y,
      z: p.z + (azar() - 0.5) * q,
    });
  }
  puntos.push(hasta);
  const tramosDeLaCinta: Punto[] = [];
  for (let i = 0; i + 1 < puntos.length; i++) tramosDeLaCinta.push(puntos[i]!, puntos[i + 1]!);
  // Una rama, desde un tercio del camino, que se muere a medio bajar.
  const sale = puntos[Math.floor(tramos / 3)]!;
  let antes = sale;
  for (let i = 1; i <= 4; i++) {
    const p = {
      x: antes.x + (azar() - 0.3) * quiebro * 1.4,
      y: antes.y - (largo / tramos) * 0.9,
      z: antes.z + (azar() - 0.3) * quiebro * 1.4,
    };
    tramosDeLaCinta.push(antes, p);
    antes = p;
  }
  return tramosDeLaCinta;
}

/** Lo que el juego le pasa a la nube cada fotograma. */
export interface PasoDelCumulonimbo {
  readonly camara: PerspectiveCamera;
  /** Cuánto la alumbra un rayo por dentro, de 0 a 1. Ver `relampago.ts`. */
  readonly luz: number;
  /** Cuánto se ve la cinta del rayo, de 0 a 1. */
  readonly rayo: number;
  /**
   * **La luz que la nube devuelve por la cara de sombra**, la de la hora: el
   * color de dentro de una nube del cielo. Una nube no tiene sombras negras
   * —la luz le llega rebotada de todas partes— y sin esto la torre salía de
   * piedra. Ver `colorDeLaNube` en `sky.ts`.
   */
  readonly relleno?: Color;
}

export interface CumulonimboEnElMundo {
  readonly grupo: Group;
  /** Lo pone en su sitio: el centro de la tormenta y la cota del suelo debajo. */
  poner(x: number, z: number, suelo: number): void;
  /**
   * Prepara la cinta de un rayo, en el mundo. Se ve con `paso({ rayo })`.
   * `enLaNube`, si cae en la tormenta: entonces se acerca con ella.
   */
  rayo(desde: Punto, hasta: Punto, semilla: number, enLaNube?: boolean, por?: Punto): void;
  paso(dt: number, p: PasoDelCumulonimbo): void;
  /** Triángulos de la nube, para el banco. */
  readonly triangulos: number;
  dispose(): void;
}

/** El blanco frío de una descarga, el mismo de `sky.ts`. */
const COLOR_DEL_RAYO = new Color(0xdde4f2);

/**
 * **Lo que le pesa la niebla**, en fracción de la del suelo: un tercio. La
 * bruma está en los primeros kilómetros y la torre sube trece: lo que se ve de
 * ella desde lejos atraviesa sobre todo aire limpio.
 */
const NIEBLA_DE_LA_TORRE = 0.35;

/** Cuánto de la luz de relleno pone la nube por su cuenta. Ver `relleno`. */
const LEVANTA_LA_SOMBRA = 0.3;

/**
 * La niebla de serie de three, con la densidad multiplicada por un uniforme:
 * el de lo que le pesa a esta nube y el de cuánto se acercó para verse.
 */
function conSuNiebla(m: Material, factor: { value: number }, llave: string): void {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.nieblaPropia = factor;
    sh.fragmentShader = sh.fragmentShader
      .replace("void main() {", "uniform float nieblaPropia;\nvoid main() {")
      .replace(
        "#include <fog_fragment>",
        `#ifdef USE_FOG
          #ifdef FOG_EXP2
            float densidadPropia = fogDensity * nieblaPropia;
            float fogFactor = 1.0 - exp( - densidadPropia * densidadPropia * vFogDepth * vFogDepth );
          #else
            float fogFactor = smoothstep( fogNear / nieblaPropia, fogFar / nieblaPropia, vFogDepth );
          #endif
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
        #endif`,
      );
  };
  // `onBeforeCompile` no entra en la llave de la caché de programas.
  m.customProgramCacheKey = () => llave;
}

/** Las rayas de la cortina de agua: blancas sobre nada, para teñirlas. */
function rayasDeLluvia(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const lienzo = document.createElement("canvas");
  lienzo.width = 64;
  lienzo.height = 128;
  const g = lienzo.getContext("2d");
  if (!g) return null;
  const azar = mulberry32(11);
  for (let i = 0; i < 90; i++) {
    const x = azar() * 64;
    const y = azar() * 128;
    g.globalAlpha = 0.4 + 0.6 * azar();
    g.fillStyle = "#ffffff";
    g.fillRect(x, y, 1 + azar() * 1.5, 18 + azar() * 40);
  }
  // Y el velo de agua entre raya y raya, que desde lejos es lo que se ve.
  g.globalAlpha = 0.6;
  g.fillRect(0, 0, 64, 128);
  const textura = new CanvasTexture(lienzo);
  // Toda textura de color, en sRGB: sin esto el gris sale lavado.
  textura.colorSpace = SRGBColorSpace;
  textura.wrapS = RepeatWrapping;
  textura.wrapT = RepeatWrapping;
  textura.repeat.set(10, 3);
  return textura;
}

export function crearCumulonimbo(
  yunque: { readonly x: number; readonly z: number },
  semilla = 7,
): CumulonimboEnElMundo {
  const grupo = new Group();
  grupo.name = "cumulonimbo";
  const deEstaNube = new Group();
  grupo.add(deEstaNube);

  // ── La nube: las bolas, cosidas en una malla ─────────────────────────────
  const oscuro = new Color(0x5a626f);
  const medio = new Color(0xcdd2d9);
  const blanco = new Color(0xffffff);
  const tono = new Color();
  const piezas: BufferGeometry[] = [];
  const azar = mulberry32(semilla * 31 + 5);
  for (const b of bolasDelCumulonimbo(yunque, semilla)) {
    // El bulto de coliflor de esta bola: unas ondas suaves, no un picado.
    const f = [0, 1, 2, 3, 4].map(() => azar() * Math.PI * 2);
    const cg = Math.cos(b.giro ?? 0);
    const sg = Math.sin(b.giro ?? 0);
    /*
     * Con los vértices cosidos: la bola de serie trae cada cara suelta, y así
     * la deformación abriría grietas y la luz saldría a facetas.
     */
    const suelta = new IcosahedronGeometry(1, 2);
    suelta.deleteAttribute("normal");
    suelta.deleteAttribute("uv");
    const geo = mergeVertices(suelta, 1e-4);
    suelta.dispose();
    const pos = geo.getAttribute("position") as BufferAttribute;
    const colores = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const ux = pos.getX(i);
      const uy = pos.getY(i);
      const uz = pos.getZ(i);
      const k =
        1 +
        0.13 * Math.sin(ux * 3.1 + f[0]!) * Math.sin(uy * 2.7 + f[1]!) * Math.sin(uz * 3.3 + f[2]!) +
        0.05 * Math.sin(ux * 7 + f[3]!) * Math.sin(uz * 6 + f[4]!);
      // Plana por abajo: la base de un cumulonimbo es una raya.
      const y = Math.max(BASE, b.y + uy * b.ry * k);
      const lx = ux * b.rx * k;
      const lz = uz * b.rz * k;
      pos.setXYZ(i, b.x + lx * cg - lz * sg, y, b.z + lx * sg + lz * cg);
      /*
       * Oscura en la base, blanca arriba: el agua de abajo tapa el sol. Y
       * por debajo de cada bola, algo más oscura, que es lo que la dibuja.
       */
      const alto = Math.min(1, Math.max(0, (y - BASE) / 5500));
      tono.copy(oscuro).lerp(medio, Math.min(1, alto * 2));
      if (alto > 0.5) tono.lerp(blanco, (alto - 0.5) * 2);
      tono.multiplyScalar(0.82 + 0.18 * (uy * 0.5 + 0.5));
      colores[i * 3] = tono.r;
      colores[i * 3 + 1] = tono.g;
      colores[i * 3 + 2] = tono.b;
    }
    geo.setAttribute("color", new BufferAttribute(colores, 3));
    geo.computeVertexNormals();
    piezas.push(geo);
  }
  const forma = mergeGeometries(piezas, false);
  for (const p of piezas) p.dispose();
  const nieblaDeLaNube = { value: NIEBLA_DE_LA_TORRE };
  const material = new MeshLambertMaterial({
    vertexColors: true,
    // Desde dentro también se ve gris: se está dentro de la nube.
    side: DoubleSide,
    emissive: new Color(0x000000),
  });
  conSuNiebla(material, nieblaDeLaNube, "cumulonimbo-nube");
  const nube = new Mesh(forma, material);
  nube.name = "cumulonimbo-nube";
  nube.frustumCulled = false;
  deEstaNube.add(nube);

  // ── La cortina de agua, debajo del núcleo ────────────────────────────────
  const rojo = radioDelRojo({ radio: RADIO_DEL_ECO, fuerza: FUERZA_DEL_ECO });
  const radioDeLaCortina = Math.max(rojo * 1.8, 3000);
  const cortinaGeo = new CylinderGeometry(
    radioDeLaCortina * 0.85,
    radioDeLaCortina,
    BASE,
    28,
    4,
    true,
  );
  cortinaGeo.translate(0, BASE / 2, 0);
  /*
   * Con la transparencia por vértice: llena arriba, donde sale de la base, y
   * deshaciéndose abajo, que el agua de una tormenta no llega al suelo en una
   * raya sino en una bruma.
   */
  const cpos = cortinaGeo.getAttribute("position") as BufferAttribute;
  const ccol = new Float32Array(cpos.count * 4);
  for (let i = 0; i < cpos.count; i++) {
    const t = cpos.getY(i) / BASE;
    ccol[i * 4] = 0.3;
    ccol[i * 4 + 1] = 0.33;
    ccol[i * 4 + 2] = 0.38;
    ccol[i * 4 + 3] = 0.3 + 0.6 * Math.min(1, t * 1.6);
  }
  cortinaGeo.setAttribute("color", new BufferAttribute(ccol, 4));
  const rayas = rayasDeLluvia();
  const materialDeLaCortina = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    ...(rayas ? { map: rayas } : { opacity: 0.6 }),
  });
  conSuNiebla(materialDeLaCortina, nieblaDeLaNube, "cumulonimbo-cortina");
  const cortina = new Mesh(cortinaGeo, materialDeLaCortina);
  cortina.name = "cumulonimbo-cortina";
  cortina.frustumCulled = false;
  // Debajo de la nube y no encima: la transparencia se pinta después.
  cortina.renderOrder = 1;
  deEstaNube.add(cortina);

  // ── El rayo: una cinta que mira a la cámara, solo mientras cae ────────────
  const TRAMOS_DEL_RAYO = 16;
  const rayoGeo = new BufferGeometry();
  const rayoPos = new Float32Array(TRAMOS_DEL_RAYO * 6 * 3);
  rayoGeo.setAttribute("position", new BufferAttribute(rayoPos, 3));
  rayoGeo.setDrawRange(0, 0);
  const materialDelRayo = new MeshBasicMaterial({
    color: COLOR_DEL_RAYO,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
  });
  const cinta = new Mesh(rayoGeo, materialDelRayo);
  cinta.name = "cumulonimbo-rayo";
  cinta.frustumCulled = false;
  cinta.visible = false;
  // El rayo va en el mundo, no en la nube: puede caer lejos de ella.
  grupo.add(cinta);
  let caminoDeAhora: Punto[] = [];
  /** Si el rayo de ahora cae en la tormenta: se acerca con ella. */
  let rayoEnLaNube = false;
  /** La escala a la que se dibuja la nube ahora. Ver `acercarParaVerse`. */
  let escala = 1;

  let cx = 0;
  let cz = 0;
  let suelo = 0;
  let desplaza = 0;
  /** Monta la cinta de cara a la cámara, con el ancho que se ve desde allí. */
  const montarLaCinta = (camara: PerspectiveCamera): void => {
    const n = Math.min(TRAMOS_DEL_RAYO, Math.floor(caminoDeAhora.length / 2));
    const ojo = camara.position;
    let k = 0;
    /*
     * El que cae en la tormenta se acerca con ella, igual que la nube: un
     * punto del mundo va a `ojo + (p − ojo)·escala`.
     */
    const s = rayoEnLaNube ? escala : 1;
    const enPantalla = (p: Punto): Punto =>
      s === 1
        ? p
        : {
            x: ojo.x + (p.x - ojo.x) * s,
            y: ojo.y + (p.y - ojo.y) * s,
            z: ojo.z + (p.z - ojo.z) * s,
          };
    for (let i = 0; i < n; i++) {
      const a = enPantalla(caminoDeAhora[i * 2]!);
      const b = enPantalla(caminoDeAhora[i * 2 + 1]!);
      // A lo ancho: de lado respecto a la línea de mirar.
      const mx = (a.x + b.x) / 2 - ojo.x;
      const mz = (a.z + b.z) / 2 - ojo.z;
      const lejos = Math.hypot(mx, (a.y + b.y) / 2 - ojo.y, mz);
      /*
       * Como poco, lo que mida dos píxeles desde donde se mira: un rayo de
       * verdad de diez centímetros se ve igual desde cuarenta kilómetros,
       * porque lo que se ve es su luz.
       */
      const ancho = Math.max(0.3, lejos * 0.0016);
      const l = Math.hypot(mx, mz) || 1;
      const sx = (-mz / l) * ancho;
      const sz = (mx / l) * ancho;
      const v = [
        [a.x - sx, a.y, a.z - sz],
        [a.x + sx, a.y, a.z + sz],
        [b.x + sx, b.y, b.z + sz],
        [a.x - sx, a.y, a.z - sz],
        [b.x + sx, b.y, b.z + sz],
        [b.x - sx, b.y, b.z - sz],
      ];
      for (const p of v) {
        rayoPos[k++] = p[0]!;
        rayoPos[k++] = p[1]!;
        rayoPos[k++] = p[2]!;
      }
    }
    rayoGeo.setDrawRange(0, n * 6);
    (rayoGeo.getAttribute("position") as BufferAttribute).needsUpdate = true;
  };

  return {
    grupo,
    triangulos: (forma.index ? forma.index.count : forma.getAttribute("position").count) / 3,
    poner(x, z, cota) {
      cx = x;
      cz = z;
      suelo = cota;
      deEstaNube.position.set(x, cota, z);
    },
    rayo(desde, hasta, s, enLaNube = false, por) {
      caminoDeAhora = caminoDelRayo(desde, hasta, s, por);
      rayoEnLaNube = enLaNube;
    },
    paso(dt, { camara, luz, rayo, relleno }) {
      /*
       * Más lejos que el plano lejano, se acerca a escala en la misma
       * dirección. La niebla se corrige con la misma escala: se calcula con
       * la profundidad dibujada, y la de verdad es mayor.
       */
      const ojo = camara.position;
      const dx = cx - ojo.x;
      const dz = cz - ojo.z;
      const lejos = Math.hypot(dx, dz);
      const s = acercarParaVerse(lejos + RADIO_DEL_ECO, camara.far * 0.9);
      escala = s;
      deEstaNube.scale.setScalar(s);
      deEstaNube.position.set(
        ojo.x + dx * s,
        ojo.y + (suelo - ojo.y) * s,
        ojo.z + dz * s,
      );
      nieblaDeLaNube.value = NIEBLA_DE_LA_TORRE / s;
      // La luz del rayo, por dentro: la nube encendida un instante.
      material.emissive.copy(COLOR_DEL_RAYO).multiplyScalar(0.85 * Math.max(0, Math.min(1, luz)));
      if (relleno)
        material.emissive.setRGB(
          material.emissive.r + relleno.r * LEVANTA_LA_SOMBRA,
          material.emissive.g + relleno.g * LEVANTA_LA_SOMBRA,
          material.emissive.b + relleno.b * LEVANTA_LA_SOMBRA,
        );
      // Y el agua bajando.
      desplaza = (desplaza + dt * 0.6) % 1;
      if (rayas) rayas.offset.y = desplaza;
      const seVe = rayo > 0.01 && caminoDeAhora.length > 0;
      cinta.visible = seVe;
      if (seVe) {
        montarLaCinta(camara);
        materialDelRayo.opacity = Math.min(1, rayo);
      }
    },
    dispose() {
      forma.dispose();
      material.dispose();
      cortinaGeo.dispose();
      materialDeLaCortina.dispose();
      rayas?.dispose();
      rayoGeo.dispose();
      materialDelRayo.dispose();
    },
  };
}
