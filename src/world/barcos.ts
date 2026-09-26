/**
 * Los barcos entre islas, **dibujados**: el casco, la superestructura y la
 * estela, que es lo que de verdad se ve desde el aire.
 *
 * Dónde está cada uno lo decide `rutas-de-barcos.ts`. Esto es solo el cuerpo.
 *
 * ## Hechos aquí, y por código
 *
 * Por lo mismo que la fábrica de aeronaves: un modelo descargado traería su
 * licencia que comprobar, sus texturas que bajar y, peor, la silueta y los
 * colores de un barco concreto de una naviera concreta, que es justo lo que no
 * se puede poner. Estos son **tipos**, no barcos: un ferri de carga y pasaje,
 * un catamarán rápido y un trimarán, blancos y con una franja de color que no
 * es la de nadie. Se reconocen por la forma, que es lo que se reconoce desde
 * dos mil metros.
 *
 * Unas pocas cajas y un casco extruido: ciento y pico triángulos cada uno, una
 * llamada de dibujo por barco y otra por su estela. A treinta kilómetros un
 * barco de cien metros mide dos píxeles; lo que se ve antes que el barco es la
 * raya blanca que deja detrás.
 *
 * ## La estela
 *
 * Dos cosas, como en el mar: la **espuma** que sale por la popa, larga y
 * blanca, más larga cuanto más deprisa va —un catamarán rápido deja más de un
 * kilómetro de raya—, y las **dos olas en uve** que salen de la proa. En un
 * barco lento la uve abre sus diecinueve grados y medio de cada lado, que es
 * el ángulo de Kelvin y no depende del barco; en uno rápido se cierra, que es
 * lo que se ve detrás de un catamarán a toda máquina.
 *
 * Va pegada al agua, un palmo por encima, sin escribir profundidad y con el
 * desplazamiento de polígono que la adelanta en el fondo: a diez kilómetros un
 * paso del fondo de profundidad son metros, y sin eso el agua se la comería a
 * franjas.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Material,
} from "three";
import { giroDelModelo } from "./rumbo";
import {
  Navieras,
  type BarcoEnElMar,
  type ClaseDeBarco,
  type Linea,
  LINEAS,
} from "./rutas-de-barcos";
import type { Sitio } from "./entre-aerodromos";

/**
 * Hasta dónde se dibujan, m.
 *
 * Treinta kilómetros, lo mismo que los aviones de la ruta. Más allá un barco
 * es un píxel y su estela una raya que la bruma ya se ha comido.
 */
export const BARCOS_HASTA = 30_000;

/** Los colores de un barco: el casco, su franja y lo que asoma del agua. */
interface Pintura {
  /** Obra muerta: el costado que se ve. */
  readonly costado: number;
  /** La franja a lo largo del casco. */
  readonly franja: number;
  /** Obra viva, lo que queda justo por encima del agua. */
  readonly fondo: number;
  /** Chimenea. */
  readonly chimenea: number;
}

/*
 * **Colores genéricos, a propósito.** Blanco, que es de lo que se pinta casi
 * todo barco de pasaje, y una franja de un color de las islas que no es la de
 * ninguna naviera. Se distinguen entre sí, que es lo que hace falta.
 */
const PINTURAS: Record<string, Pintura> = {
  "agaete-santa-cruz": {
    costado: 0xf4f4f0,
    franja: 0x1f8a5b,
    fondo: 0x2b3a4a,
    chimenea: 0x1f8a5b,
  },
  "los-cristianos-san-sebastian": {
    costado: 0xf4f4f0,
    franja: 0x1b9aaa,
    fondo: 0x2b3a4a,
    chimenea: 0x1b9aaa,
  },
  "corralejo-playa-blanca-rapido": {
    costado: 0xf4f4f0,
    franja: 0x2a62b8,
    fondo: 0x2b3a4a,
    chimenea: 0x2a62b8,
  },
  "corralejo-playa-blanca": {
    costado: 0xf2f1ec,
    franja: 0xd9a21b,
    fondo: 0x1f3552,
    chimenea: 0xd9a21b,
  },
  "las-palmas-santa-cruz": {
    costado: 0xf2f1ec,
    franja: 0x2a62b8,
    fondo: 0x1f3552,
    chimenea: 0x2a62b8,
  },
};

const PINTURA_POR_DEFECTO: Pintura = {
  costado: 0xf4f4f0,
  franja: 0x2a62b8,
  fondo: 0x2b3a4a,
  chimenea: 0x2a62b8,
};

/** Cristaleras y puente: la banda oscura que dice «aquí va gente». */
const CRISTAL = 0x2c3640;
/** La cubierta, gris claro. */
const CUBIERTA = 0xc9ccc8;

// ── Un montador de caras con color plano ─────────────────────────────────

type V3 = readonly [number, number, number];

/**
 * Acumula triángulos con su color y su normal plana.
 *
 * Cada cara se orienta sola hacia `fuera`: así no hay que acertar el orden
 * de los vértices a mano en cada pieza, que es donde se equivoca uno y el
 * casco sale transparente por un costado.
 */
class Montador {
  private readonly pos: number[] = [];
  private readonly col: number[] = [];

  triangulo(a: V3, b: V3, c: V3, color: number, fuera: V3): void {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-12) return;
    const alReves = nx * fuera[0] + ny * fuera[1] + nz * fuera[2] < 0;
    const [p, q, r] = alReves ? [a, c, b] : [a, b, c];
    this.pos.push(...p, ...q, ...r);
    const k = new Color(color);
    for (let i = 0; i < 3; i++) this.col.push(k.r, k.g, k.b);
  }

  cuadro(a: V3, b: V3, c: V3, d: V3, color: number, fuera: V3): void {
    this.triangulo(a, b, c, color, fuera);
    this.triangulo(a, c, d, color, fuera);
  }

  /** Una caja sin fondo: lo de abajo no se ve nunca. */
  caja(
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    color: number,
    arriba = color,
  ): void {
    this.cuadro([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], arriba, [0, 1, 0]);
    this.cuadro([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], color, [1, 0, 0]);
    this.cuadro([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], color, [-1, 0, 0]);
    this.cuadro([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], color, [0, 0, -1]);
    this.cuadro([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color, [0, 0, 1]);
  }

  geometria(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(this.col), 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * Un casco de un solo cuerpo, con su franja.
 *
 * Seis secciones de proa a popa —la proa lanzada y afinada, el cuerpo recto,
 * la popa de espejo— y en cada una el perfil de un costado: fondo, pantoque,
 * flotación, la franja y la regala. Cada cara toma el color de la banda de
 * alturas en la que cae, así que la franja sale recta sin textura ninguna.
 */
function casco(
  m: Montador,
  o: {
    readonly largo: number;
    readonly manga: number;
    readonly calado: number;
    readonly francobordo: number;
    readonly x?: number;
    readonly z0?: number;
    readonly pintura: Pintura;
    /** La franja, en metros sobre el agua: de dónde a dónde. */
    readonly franja: readonly [number, number];
  },
): void {
  const { largo, manga, calado, francobordo, pintura } = o;
  const cx = o.x ?? 0;
  const cz = o.z0 ?? 0;
  // z relativo, manga relativa, cuánto sube la quilla, arrufo de la regala.
  const perfil: readonly [number, number, number, number][] = [
    [-0.5, 0.03, 0.9, 1.25],
    [-0.43, 0.45, 0.4, 1.12],
    [-0.31, 0.84, 0.08, 1.04],
    [-0.14, 1, 0, 1],
    [0.4, 1, 0, 1],
    [0.5, 0.95, 0.12, 1.02],
  ];
  const [f0, f1] = o.franja;
  const secciones = perfil.map(([zr, mr, sube, arrufo]) => {
    const z = cz + zr * largo;
    const h = (mr * manga) / 2;
    const quilla = -calado * (1 - sube);
    const regala = francobordo * arrufo;
    const lo = Math.min(f0, regala - 0.4);
    const hi = Math.min(f1, regala - 0.2);
    // Del eje de la quilla a la regala, por estribor.
    const puntos: [number, number][] = [
      [0, quilla],
      [h * 0.7, quilla],
      [h, quilla * 0.35],
      [h, 0.3],
      [h, lo],
      [h, hi],
      [h, regala],
    ];
    return { z, puntos };
  });
  const colores = [
    pintura.fondo,
    pintura.fondo,
    pintura.fondo,
    pintura.costado,
    pintura.franja,
    pintura.costado,
  ];
  for (let i = 0; i < secciones.length - 1; i++) {
    const s = secciones[i]!;
    const t = secciones[i + 1]!;
    for (let j = 0; j < s.puntos.length - 1; j++) {
      const [ax, ay] = s.puntos[j]!;
      const [bx, by] = s.puntos[j + 1]!;
      const [cx2, cy] = t.puntos[j + 1]!;
      const [dx, dy] = t.puntos[j]!;
      for (const lado of [1, -1]) {
        const fuera: V3 = j < 2 ? [0.3 * lado, -1, 0] : [lado, 0, 0];
        m.cuadro(
          [cx + ax * lado, ay, s.z],
          [cx + bx * lado, by, s.z],
          [cx + cx2 * lado, cy, t.z],
          [cx + dx * lado, dy, t.z],
          colores[j]!,
          fuera,
        );
      }
    }
    // La cubierta, de regala a regala.
    const [sh, sy] = s.puntos[s.puntos.length - 1]!;
    const [th, ty] = t.puntos[t.puntos.length - 1]!;
    m.cuadro(
      [cx - sh, sy, s.z],
      [cx + sh, sy, s.z],
      [cx + th, ty, t.z],
      [cx - th, ty, t.z],
      CUBIERTA,
      [0, 1, 0],
    );
  }
  // El espejo de popa y el tajamar, cerrados en abanico.
  for (const [sec, sentido] of [
    [secciones[secciones.length - 1]!, 1],
    [secciones[0]!, -1],
  ] as const) {
    const centro: V3 = [cx, 0, sec.z];
    const borde: V3[] = [
      ...sec.puntos.map(([x, y]): V3 => [cx + x, y, sec.z]),
      ...[...sec.puntos].reverse().map(([x, y]): V3 => [cx - x, y, sec.z]),
    ];
    for (let k = 0; k < borde.length - 1; k++) {
      m.triangulo(centro, borde[k]!, borde[k + 1]!, pintura.costado, [0, 0, sentido]);
    }
  }
}

/**
 * La superestructura: cubiertas de pasaje con su banda de cristales y el
 * puente encima, delante.
 */
function superestructura(
  m: Montador,
  o: {
    readonly ancho: number;
    readonly desde: number;
    readonly hasta: number;
    readonly base: number;
    readonly alto: number;
    readonly pintura: Pintura;
  },
): void {
  const { ancho, desde, hasta, base, alto, pintura } = o;
  const a = ancho / 2;
  const cristal0 = base + alto * 0.35;
  const cristal1 = base + alto * 0.62;
  m.caja(-a, a, base, cristal0, desde, hasta, pintura.costado);
  m.caja(-a, a, cristal0, cristal1, desde, hasta, CRISTAL);
  m.caja(-a, a, cristal1, base + alto, desde, hasta, pintura.costado, CUBIERTA);
  // El puente, más estrecho y más alto, en la parte de proa.
  const largoPuente = Math.min(12, (hasta - desde) * 0.18);
  m.caja(-a * 0.8, a * 0.8, base + alto, base + alto + 2.2, desde + 1, desde + 1 + largoPuente, CRISTAL, pintura.costado);
}

/** El barco entero de una línea, en una geometría. Proa hacia la Z negativa. */
export function fabricarBarco(linea: Pick<Linea, "id" | "clase" | "eslora" | "manga">): BufferGeometry {
  const m = new Montador();
  const pintura = PINTURAS[linea.id] ?? PINTURA_POR_DEFECTO;
  const L = linea.eslora;
  const B = linea.manga;
  if (linea.clase === "ferri") {
    /*
     * **El ferri de carga y pasaje**: casco lleno, mucho francobordo —dentro
     * va la cubierta de coches—, el bloque de pasaje de proa a media eslora
     * con su banda de cristal y la chimenea a popa de él.
     */
    const fb = Math.max(6, L * 0.06);
    casco(m, {
      largo: L,
      manga: B,
      calado: L * 0.04,
      francobordo: fb,
      pintura,
      franja: [fb * 0.45, fb * 0.62],
    });
    superestructura(m, {
      ancho: B * 0.94,
      desde: -L * 0.34,
      hasta: L * 0.22,
      base: fb * 1.02,
      alto: Math.max(6, L * 0.075),
      pintura,
    });
    // La chimenea, blanca con la punta del color de la franja: apiladas, no
    // superpuestas, que dos caras en el mismo plano se pelean a lo lejos.
    const alto = fb * 1.02 + Math.max(6, L * 0.075);
    m.caja(-B * 0.14, B * 0.14, alto, alto + L * 0.03, L * 0.1, L * 0.18, pintura.costado);
    m.caja(-B * 0.14, B * 0.14, alto + L * 0.03, alto + L * 0.045, L * 0.1, L * 0.18, pintura.chimenea);
  } else if (linea.clase === "catamaran") {
    /*
     * **El catamarán rápido**: dos cascos finos y separados, y encima un
     * cajón ancho de proa redondeada donde va todo, pasaje y coches. Visto
     * desde arriba es un rectángulo con dos estelas que se juntan.
     */
    const casquito = B * 0.2;
    for (const lado of [1, -1]) {
      casco(m, {
        largo: L,
        manga: casquito,
        calado: 2.2,
        francobordo: 3.6,
        x: lado * (B / 2 - casquito / 2),
        pintura,
        franja: [1.6, 2.8],
      });
    }
    m.caja(-B / 2, B / 2, 3.2, 4.4, -L * 0.42, L * 0.48, pintura.costado);
    m.caja(-B / 2, B / 2, 4.4, 5.2, -L * 0.42, L * 0.48, pintura.franja);
    m.caja(-B / 2, B / 2, 5.2, 6.2, -L * 0.42, L * 0.48, pintura.costado, CUBIERTA);
    superestructura(m, {
      ancho: B * 0.86,
      desde: -L * 0.38,
      hasta: L * 0.16,
      base: 6.2,
      alto: 5.5,
      pintura,
    });
  } else {
    /*
     * **El trimarán**: un casco central largo y afilado y dos flotadores
     * pequeños a popa, unidos por la cubierta. Desde arriba es la silueta que
     * no se confunde con nada.
     */
    casco(m, {
      largo: L,
      manga: B * 0.3,
      calado: 3.5,
      francobordo: 6,
      pintura,
      franja: [2.6, 4.2],
    });
    for (const lado of [1, -1]) {
      casco(m, {
        largo: L * 0.36,
        manga: B * 0.08,
        calado: 1.4,
        francobordo: 4.2,
        x: lado * (B / 2 - B * 0.04),
        z0: L * 0.28,
        pintura,
        franja: [1.8, 3],
      });
    }
    m.caja(-B / 2, B / 2, 4.2, 6.6, -L * 0.12, L * 0.46, pintura.costado, CUBIERTA);
    superestructura(m, {
      ancho: B * 0.72,
      desde: -L * 0.2,
      hasta: L * 0.3,
      base: 6.6,
      alto: 7.5,
      pintura,
    });
  }
  return m.geometria();
}

/**
 * La estela de un barco, con la popa en el origen y hacia la Z positiva.
 *
 * Color con transparencia por vértice: blanca y opaca pegada a la popa, y
 * desvaneciéndose hasta nada al final. Lo mismo las dos olas de proa, más
 * tenues.
 */
export function fabricarEstela(
  clase: ClaseDeBarco,
  eslora: number,
  manga: number,
  nudos: number,
): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const espuma = new Color(0xf6faf9);
  // El agua batida alrededor de la espuma: más clara que el mar, verdosa.
  const batida = new Color(0xb9ddd6);
  const ola = new Color(0xe3eeee);
  const punto = (x: number, z: number, c: Color, a: number) => {
    pos.push(x, 0, z);
    col.push(c.r, c.g, c.b, a);
  };
  /** Una tira de `n` trozos entre dos bordes que dependen de u ∈ [0, 1]. */
  const tira = (
    n: number,
    borde: (u: number) => readonly [number, number, number, number],
    alfa: (u: number) => number,
    c: Color,
  ) => {
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const [ax, az, bx, bz] = borde(u0);
      const [cx, cz, dx, dz] = borde(u1);
      const a0 = alfa(u0);
      const a1 = alfa(u1);
      // Dos triángulos mirando arriba: (a, c, b) y (b, c, d).
      punto(ax, az, c, a0);
      punto(cx, cz, c, a1);
      punto(bx, bz, c, a0);
      punto(bx, bz, c, a0);
      punto(cx, cz, c, a1);
      punto(dx, dz, c, a1);
    }
  };

  /*
   * La espuma de popa, en dos capas: el agua batida, ancha y tenue, que dura
   * toda la estela, y encima el núcleo blanco, estrecho, que se apaga mucho
   * antes. Es lo que se ve desde arriba: una raya blanca que nace en la popa
   * y se deshace en una banda clara. Pintadas en ese orden, que lo
   * transparente se mezcla con lo que ya hay.
   */
  const largo = 45 * nudos;
  const ancha = (u: number) => manga * (0.5 + 1.3 * u);
  tira(
    10,
    (u) => [-ancha(u), u * largo, ancha(u), u * largo],
    (u) => 0.4 * Math.pow(1 - u, 1.2),
    batida,
  );
  const nucleo = (u: number) => manga * (0.3 + 0.5 * u);
  tira(
    10,
    (u) => [-nucleo(u), u * largo * 0.7, nucleo(u), u * largo * 0.7],
    (u) => 0.95 * Math.pow(1 - u, 2),
    espuma,
  );
  // Las dos olas de proa. En un barco rápido la uve se cierra.
  const angulo = ((clase === "ferri" ? 19.5 : 11) * Math.PI) / 180;
  const largoOla = 12 * nudos;
  const proa = -eslora;
  for (const lado of [1, -1]) {
    tira(
      6,
      (u) => {
        const d = u * largoOla;
        const x = lado * (manga * 0.45 + Math.sin(angulo) * d);
        const z = proa + Math.cos(angulo) * d;
        const ancho = manga * (0.12 + 0.35 * u);
        // Siempre de babor a estribor, que es lo que deja la cara mirando
        // arriba en las dos olas.
        return [x - ancho / 2, z, x + ancho / 2, z];
      },
      // Tenues: en la primera foto, a medio, parecían dos raíles.
      (u) => 0.3 * Math.pow(1 - u, 1.5),
      ola,
    );
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 4));
  const normales = new Float32Array(pos.length);
  for (let i = 1; i < normales.length; i += 3) normales[i] = 1;
  g.setAttribute("normal", new BufferAttribute(normales, 3));
  g.computeBoundingSphere();
  return g;
}

/**
 * Cuánta luz tiene la espuma según la altura del sol, de 0 a 1.
 *
 * `soleado` es la componente vertical de la dirección del sol: uno a
 * mediodía en el cenit, cero en el horizonte, negativo de noche. Con el sol
 * a veinte grados ya está entera; de noche queda un resto, que la espuma
 * refleja lo poco que haya.
 */
export function luzDeLaEstela(soleado: number): number {
  return Math.min(1, Math.max(0.12, 0.25 + 2.2 * soleado));
}

export interface Barcos {
  readonly grupo: Group;
  /**
   * Un paso: `ahora` es el reloj del vuelo, en segundos; `yo`, el avión; y
   * `luz`, de 0 a 1, cuánta luz de día hay. Ver `luzDeLaEstela`.
   */
  paso(
    ahora: number,
    yo: { readonly x: number; readonly z: number },
    luz?: number,
  ): void;
  /** Los de este instante, todos, estén o no a la vista. Para bancos y voz. */
  quienes(): readonly BarcoEnElMar[];
  /** Cuántos se están dibujando ahora. */
  readonly aLaVista: number;
  dispose(): void;
}

/**
 * Los barcos de Canarias, colgados del mundo cuyo origen es `origen`.
 *
 * `agua` es la cota del mar del escenario: los barcos flotan en ella.
 */
export function crearBarcos(origen: Sitio, agua: number): Barcos {
  const grupo = new Group();
  grupo.name = "barcos";
  const navieras = new Navieras(origen);
  const material = new MeshLambertMaterial({ vertexColors: true });
  const geometrias: BufferGeometry[] = [];
  const materiales: Material[] = [material];
  const piezas = LINEAS.map((linea) => {
    const barco = new Group();
    barco.name = `barco-${linea.id}`;
    barco.visible = false;
    const casco = fabricarBarco(linea);
    geometrias.push(casco);
    barco.add(new Mesh(casco, material));
    const geoEstela = fabricarEstela(linea.clase, linea.eslora, linea.manga, linea.nudos);
    geometrias.push(geoEstela);
    /*
     * Un material por estela, porque cada una se apaga según lo que vaya
     * frenando su barco: entrando en puerto la espuma se acorta y amarrado no
     * hay. Son cinco.
     */
    /*
     * **Y sin sombrear.** La espuma es lo más claro del mar a cualquier hora
     * de sol, y con la luz de la escena mirando hacia arriba salía gris en
     * cuanto el sol bajaba de media altura: en la primera foto, a las cuatro
     * de la tarde, la estela era una carretera gris. Se apaga con el día, que
     * de noche no se ve, pero no con el ángulo del sol.
     */
    const matEstela = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    materiales.push(matEstela);
    const estela = new Mesh(geoEstela, matEstela);
    estela.name = "estela";
    estela.position.set(0, 0.25, linea.eslora / 2);
    // Detrás del agua, que va en −0,5: si no, el agua la taparía.
    estela.renderOrder = 0.5;
    barco.add(estela);
    grupo.add(barco);
    return { barco, estela, matEstela };
  });

  let ultimos: readonly BarcoEnElMar[] = [];
  let aLaVista = 0;
  return {
    grupo,
    paso(ahora, yo, luz = 1) {
      ultimos = navieras.en(ahora);
      aLaVista = 0;
      for (let i = 0; i < ultimos.length; i++) {
        const b = ultimos[i]!;
        const p = piezas[i]!;
        const cerca = Math.hypot(b.x - yo.x, b.z - yo.z) <= BARCOS_HASTA;
        p.barco.visible = cerca;
        if (!cerca) continue;
        aLaVista++;
        p.barco.position.set(b.x, agua, b.z);
        p.barco.rotation.y = (giroDelModelo(b.rumbo) * Math.PI) / 180;
        const fuerza = b.deServicio > 0 ? b.nudos / b.deServicio : 0;
        p.estela.visible = b.nudos > 1;
        p.matEstela.opacity = Math.min(1, fuerza * fuerza);
        p.matEstela.color.setScalar(luz);
      }
    },
    quienes: () => ultimos,
    get aLaVista() {
      return aLaVista;
    },
    dispose() {
      for (const g of geometrias) g.dispose();
      for (const m of materiales) m.dispose();
      grupo.clear();
    },
  };
}
