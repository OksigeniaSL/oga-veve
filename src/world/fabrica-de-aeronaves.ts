/**
 * La fábrica de aeronaves: cinco siluetas, por código.
 *
 * #68 lo argumenta y aquí está hecho. El resumen de por qué no se parte de un
 * modelo ajeno, que es la pregunta obvia:
 *
 * 1. **El estilo lo destruye todo.** Facetado, color por vértice, sin
 *    coordenadas de textura: de un modelo de terceros solo sobreviviría la
 *    topología, y habría que rehacerla. Limpiar cuesta más que modelar.
 * 2. **La licencia no resuelve la marca.** Una «avioneta low poly» en CC0 es
 *    legal en copyright y reproduce igual la silueta que este proyecto ha
 *    decidido evitar. Deformarla hasta hacerla irreconocible es modelar de
 *    nuevo.
 * 3. **El peso.** Cinco aeronaves en glTF son cientos de kilobytes sobre un
 *    paquete de seiscientos; cinco por código son unas decenas.
 *
 * ## Lo que hay que conseguir, y es lo único
 *
 * **Que se distingan por la silueta**, que es exactamente la destreza que el
 * juego enseña: reconocer un avión por su forma. Ala alta, biplano, bimotor de
 * ala baja, cola en T y reactor en flecha. Si las cinco se leen de un vistazo
 * desde la cámara de persecución, esto ha terminado; lo demás es adorno.
 *
 * ## Cómo está hecho
 *
 * Dos primitivas y nada más:
 *
 * - **`tubo`**: una serie de anillos a lo largo de la Z, unidos. Sirve para el
 *   fuselaje, para las góndolas de los motores y para los reactores colgados,
 *   que son el mismo objeto a otra escala. Un fuselaje no es un cilindro: es
 *   ancho en la cabina y afilado en la cola, y eso se dice con la lista de
 *   anillos.
 * - **`superficie`**: un trapecio extruido, con flecha aplicada como cizalla y
 *   diedro girando la semiala. Sirve para el ala, el estabilizador y la
 *   deriva, porque las tres **son lo mismo**: una superficie de sustentación.
 *   Escribirlas por separado fue lo que hizo que durante meses el biplano
 *   pareciera un monoplano.
 *
 * Todo sale fusionado en una geometría con **color por vértice** y un solo
 * material, o sea **una llamada de dibujo por avión**. Las ventanillas y las
 * libreas van pintadas, nunca en la geometría: una ventanilla de verdad son
 * doce triángulos que no se ven a veinte metros.
 *
 * ## El techo, dicho de antemano
 *
 * Cuando ajustar una silueta exija recompilar y tantear números en vez de
 * arrastrar vértices, gana Blender. La regla de #68: si un modelo pide más de
 * un día de ajuste paramétrico, pasa a Blender y de ahí sale en glTF con color
 * por vértice. Esta fábrica no compite con eso — es lo que hay mientras tanto,
 * y lo que permite que un avión nuevo sea una fila en una tabla.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix4,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Silueta } from "../flight/flota";

/** Un anillo del fuselaje: dónde está y cuánto mide. */
export interface Anillo {
  /** Posición a lo largo del eje del morro a la cola. Negativo es adelante. */
  readonly z: number;
  /** Ancho y alto del anillo, en metros. */
  readonly ancho: number;
  readonly alto: number;
  /** Y del centro, para una panza que no está centrada en el eje. */
  readonly y?: number;
}

/**
 * Cuántos puntos tiene cada anillo.
 *
 * Ocho. Con seis el fuselaje se ve hexagonal desde la cabina y con doce no se
 * distingue de ocho a veinte metros, que es de donde se mira. Ocho además deja
 * un punto arriba, uno abajo y dos a los costados, que son los cuatro sitios
 * donde se enganchan el ala, la deriva y el tren.
 */
const PUNTOS_POR_ANILLO = 8;

/** Un trapecio con flecha y diedro: un ala, un estabilizador o una deriva. */
export interface Superficie {
  /** Cuerda en la raíz y en la punta, m. */
  readonly cuerdaRaiz: number;
  readonly cuerdaPunta: number;
  /** De la raíz a la punta, m. En un ala es media envergadura. */
  readonly largo: number;
  /** Grosor, m. */
  readonly espesor: number;
  /** Flecha: cuánto se va hacia atrás la punta, en metros. */
  readonly flecha?: number;
  /** Diedro: cuánto sube la punta, en radianes. */
  readonly diedro?: number;
  /** Dónde se engancha la raíz. */
  readonly en: readonly [number, number, number];
  /** Si se dibuja también la de la otra banda. Una deriva, no. */
  readonly aPares?: boolean;
  /** Vertical en vez de horizontal: una deriva. */
  readonly vertical?: boolean;
}

/** Pinta toda una geometría de un color, vértice a vértice. */
function pintar(g: BufferGeometry, color: number): BufferGeometry {
  const c = new Color(color);
  const n = g.getAttribute("position").count;
  const colores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colores[i * 3] = c.r;
    colores[i * 3 + 1] = c.g;
    colores[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(colores, 3));
  return g;
}

/**
 * Un tubo de sección variable: el fuselaje, una góndola, un reactor.
 *
 * Los anillos se recorren de proa a popa y cada par consecutivo se cose con
 * dos triángulos por lado. Las tapas se hacen en abanico desde el centro, que
 * con ocho puntos es suficiente y no hace falta triangular nada.
 */
export function tubo(
  anillos: readonly Anillo[],
  color: number,
): BufferGeometry {
  const posiciones: number[] = [];
  const indices: number[] = [];
  const puntoDe = (a: Anillo, i: number): [number, number, number] => {
    const ang = (i / PUNTOS_POR_ANILLO) * Math.PI * 2;
    return [
      (Math.cos(ang) * a.ancho) / 2,
      (a.y ?? 0) + (Math.sin(ang) * a.alto) / 2,
      a.z,
    ];
  };
  for (const a of anillos) {
    for (let i = 0; i < PUNTOS_POR_ANILLO; i++)
      posiciones.push(...puntoDe(a, i));
  }
  for (let s = 0; s < anillos.length - 1; s++) {
    for (let i = 0; i < PUNTOS_POR_ANILLO; i++) {
      const j = (i + 1) % PUNTOS_POR_ANILLO;
      const a = s * PUNTOS_POR_ANILLO + i;
      const b = s * PUNTOS_POR_ANILLO + j;
      const c = (s + 1) * PUNTOS_POR_ANILLO + i;
      const d = (s + 1) * PUNTOS_POR_ANILLO + j;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Las dos tapas, en abanico desde un punto en el centro del anillo.
  for (const [anillo, alFinal] of [
    [anillos[0]!, false],
    [anillos[anillos.length - 1]!, true],
  ] as const) {
    const centro = posiciones.length / 3;
    posiciones.push(0, anillo.y ?? 0, anillo.z);
    const base = alFinal ? (anillos.length - 1) * PUNTOS_POR_ANILLO : 0;
    for (let i = 0; i < PUNTOS_POR_ANILLO; i++) {
      const j = (i + 1) % PUNTOS_POR_ANILLO;
      if (alFinal) indices.push(centro, base + i, base + j);
      else indices.push(centro, base + j, base + i);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(posiciones), 3),
  );
  g.setIndex(indices);
  g.computeVertexNormals();
  return pintar(g, color);
}

/** Media superficie: el trapecio extruido, con su flecha y su diedro. */
function media(s: Superficie, banda: 1 | -1): BufferGeometry {
  const { cuerdaRaiz, cuerdaPunta, largo, espesor } = s;
  const flecha = s.flecha ?? 0;
  const mitad = espesor / 2;
  /*
   * Ocho vértices: la raíz y la punta, cada una con su cuerda y su grosor. La
   * flecha se aplica desplazando la punta hacia atrás —que es literalmente lo
   * que es una flecha— y no girando nada: girar el ala entera le cambiaría
   * también el diedro y el ángulo de incidencia.
   */
  const v = (x: number, y: number, z: number): [number, number, number] => [
    x,
    y,
    z,
  ];
  const raizDelante = -cuerdaRaiz / 2;
  const raizDetras = cuerdaRaiz / 2;
  const puntaDelante = flecha - cuerdaPunta / 2;
  const puntaDetras = flecha + cuerdaPunta / 2;
  const puntos: [number, number, number][] = [
    v(0, mitad, raizDelante),
    v(0, mitad, raizDetras),
    v(0, -mitad, raizDetras),
    v(0, -mitad, raizDelante),
    v(largo, mitad, puntaDelante),
    v(largo, mitad, puntaDetras),
    v(largo, -mitad, puntaDetras),
    v(largo, -mitad, puntaDelante),
  ];
  // Las seis caras del prisma: arriba, abajo y los cuatro cantos.
  const caras = [
    [0, 1, 2, 3],
    [4, 7, 6, 5],
    [0, 4, 5, 1],
    [1, 5, 6, 2],
    [2, 6, 7, 3],
    [3, 7, 4, 0],
  ];
  const posiciones: number[] = [];
  const indices: number[] = [];
  for (const p of puntos) posiciones.push(...p);
  for (const [a, b, c, d] of caras as [number, number, number, number][]) {
    indices.push(a, b, c, a, c, d);
  }
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(posiciones), 3),
  );
  g.setIndex(indices);

  /*
   * Una deriva es un ala puesta de canto: el mismo trapecio, girado noventa
   * grados. Por eso no hay una función de deriva — sería la misma con otro
   * nombre, y tenerlas separadas es lo que dejó al biplano con un ala.
   */
  const m = new Matrix4().makeRotationZ(
    s.vertical ? Math.PI / 2 : (s.diedro ?? 0),
  );
  // La banda de babor es la de estribor reflejada. Reflejar invierte las caras,
  // así que después hay que rehacer las normales.
  const espejo = new Matrix4().makeScale(banda, 1, 1);
  g.applyMatrix4(m);
  g.applyMatrix4(espejo);
  g.translate(s.en[0], s.en[1], s.en[2]);
  if (banda === -1) {
    const idx = g.getIndex()!;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i);
      idx.setX(i, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
    idx.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
}

/** Una superficie entera: las dos bandas si las tiene. */
export function superficie(s: Superficie, color: number): BufferGeometry {
  const trozos = [media(s, 1)];
  if (s.aPares !== false && !s.vertical) trozos.push(media(s, -1));
  const g = mergeGeometries(trozos, false)!;
  return pintar(g, color);
}

/** Cuántos triángulos tiene una geometría. Para el presupuesto. */
export function triangulos(g: BufferGeometry): number {
  const idx = g.getIndex();
  return (idx ? idx.count : g.getAttribute("position").count) / 3;
}

/**
 * El radio de la hélice, como fracción de la envergadura.
 *
 * Una novena parte del ala a cada lado. Vive aquí y no donde se dibuja la
 * hélice porque la fábrica lo necesita para **colocar las góndolas**: si la
 * hélice no cabe entre la góndola y el suelo, el avión ara el campo. Un solo
 * número para las dos cosas.
 */
export const RADIO_DE_HELICE = 0.11;

/** Los colores de un avión: casco, capó y detalles. */
export interface Paleta {
  readonly body: number;
  readonly accent: number;
  readonly trim: number;
}

/** Las medidas de las que cuelga todo lo demás. */
export interface Medidas {
  /** Envergadura, m. */
  readonly envergadura: number;
  /** Cuerda media, m. */
  readonly cuerda: number;
  /** Altura del tren, m. */
  readonly tren: number;
}

/**
 * El avión entero, en una sola geometría.
 *
 * Devuelve también dónde va la hélice —o dónde no va, si es un reactor— para
 * que quien monta la escena la cuelgue aparte: es lo único que se mueve.
 */
export interface Fabricado {
  readonly geometria: BufferGeometry;
  /** Dónde poner las hélices, en coordenadas del avión. Vacío en un reactor. */
  readonly helices: readonly Vector3[];
  /** Dónde se sienta el piloto. */
  readonly ojo: Vector3;
}

/**
 * Los anillos de un fuselaje corriente, normalizados a su largo.
 *
 * Afilado delante, ancho en la cabina, estrechándose hasta la cola: es el
 * perfil de casi cualquier avión, y lo que cambia entre uno y otro son las
 * proporciones, no la forma. Un reactor pide su propia lista porque ahí sí
 * cambia —morro largo y cola levantada—, y la trae su montaje.
 */
function fuselajeCorriente(
  largo: number,
  ancho: number,
  alto: number,
): Anillo[] {
  const perfil: [number, number, number][] = [
    // z relativo, ancho relativo, alto relativo
    [-0.5, 0.3, 0.35],
    [-0.42, 0.72, 0.78],
    [-0.28, 0.98, 1.0],
    [-0.05, 1.0, 1.0],
    [0.18, 0.86, 0.84],
    [0.36, 0.6, 0.62],
    [0.5, 0.26, 0.44],
  ];
  return perfil.map(([z, a, h]) => ({
    z: z * largo,
    ancho: a * ancho,
    alto: h * alto,
  }));
}

/** Una góndola de motor: el mismo tubo, mucho más pequeño. */
function gondola(largo: number, radio: number): Anillo[] {
  return [
    { z: -largo / 2, ancho: radio * 1.2, alto: radio * 1.2 },
    { z: -largo * 0.2, ancho: radio * 2, alto: radio * 2 },
    { z: largo * 0.25, ancho: radio * 1.9, alto: radio * 1.9 },
    { z: largo / 2, ancho: radio * 1.1, alto: radio * 1.3 },
  ];
}

/** Una pata del tren con su rueda, en cajas: a veinte metros no se distingue. */
/**
 * Una pata del tren con su rueda.
 *
 * **Y la rueda mide como una rueda.** Salía del grosor de la pierna —dos
 * veces y media un palo de doce centímetros— así que era un taco de treinta
 * centímetros al final de un poste: «eso de atrás a lo mejor es un arado, te
 * vendieron un arado por un avión». Una rueda de avioneta mide cerca de medio
 * metro y se ve, que es justo lo que hace que un avión parado parezca un
 * avión y no una mesa.
 *
 * Se mide contra la altura del tren, que es lo que la relaciona con el avión:
 * una rueda es aproximadamente la mitad de lo que el tren levanta.
 */
function pata(
  x: number,
  z: number,
  alto: number,
  grosor: number,
  color: number,
): BufferGeometry[] {
  const radio = alto * 0.26;
  // La pierna llega hasta el eje de la rueda y no hasta el suelo.
  const largoPierna = Math.max(0.01, alto - radio);
  const pierna = tubo(
    [
      {
        z: -grosor * 0.8,
        ancho: grosor * 1.6,
        alto: largoPierna,
        y: -largoPierna / 2,
      },
      {
        z: grosor * 0.8,
        ancho: grosor * 1.6,
        alto: largoPierna,
        y: -largoPierna / 2,
      },
    ],
    color,
  );
  pierna.translate(x, 0, z);
  const rueda = tubo(
    [
      { z: -grosor * 0.75, ancho: radio * 2, alto: radio * 2 },
      { z: grosor * 0.75, ancho: radio * 2, alto: radio * 2 },
    ],
    0x23231f,
  );
  // La rueda gira sobre el eje de las alas, así que su tubo va tumbado.
  rueda.rotateY(Math.PI / 2);
  rueda.translate(x, -alto + radio, z);
  return [pierna, rueda];
}

/**
 * Monta una aeronave entera a partir de su silueta y sus medidas.
 *
 * Las cinco comparten fuselaje, cola y tren; lo que cambia —y es lo único que
 * de verdad hay que acertar— es **dónde va el ala, cuántas hay, qué flecha
 * tiene y dónde están los motores**. Eso es lo que se lee desde la cámara de
 * persecución y lo que el álbum de postales enseña a reconocer.
 */
export function fabricarAeronave(
  silueta: Silueta,
  medidas: Medidas,
  paleta: Paleta,
): Fabricado {
  const { envergadura: b, cuerda: c, tren } = medidas;
  /*
   * **El largo no es el mismo para las cinco**, y esto se vio mirándolas en
   * fila: con un solo factor, un reactor de pasaje salía con el fuselaje de
   * una avioneta y once metros de ala, o sea rechoncho. La proporción entre
   * envergadura y largo es en sí misma parte de la silueta — un biplano es
   * corto y cuadrado, un regional es largo y estrecho.
   */
  const largo =
    b *
    {
      "ala-alta": 0.78,
      biplano: 0.7,
      "bimotor-ala-baja": 0.86,
      "cola-en-t": 0.96,
      reactor: 1.08,
    }[silueta];
  const anchoCuerpo = c * 0.78;
  const altoCuerpo = c * 0.88;
  const piezas: BufferGeometry[] = [];
  const helices: Vector3[] = [];

  const reactor = silueta === "reactor";
  const bimotor = silueta === "bimotor-ala-baja" || silueta === "cola-en-t";
  const biplano = silueta === "biplano";
  const alaArriba = silueta === "ala-alta" || silueta === "cola-en-t";

  // ── El cuerpo ────────────────────────────────────────────────────────
  piezas.push(
    tubo(fuselajeCorriente(largo, anchoCuerpo, altoCuerpo), paleta.body),
  );

  /*
   * La cabina, pintada y no acristalada. Es una franja del color de detalle
   * sobre el lomo: a la distancia a la que se mira un avión en este juego, una
   * ventanilla de verdad son doce triángulos que no se ven, y una franja
   * oscura en el sitio correcto se lee como cabina desde el primer fotograma.
   */
  const cabina = tubo(
    [
      {
        z: -largo * 0.3,
        ancho: anchoCuerpo * 0.72,
        alto: altoCuerpo * 0.4,
        y: altoCuerpo * 0.32,
      },
      {
        z: -largo * 0.18,
        ancho: anchoCuerpo * 0.84,
        alto: altoCuerpo * 0.5,
        y: altoCuerpo * 0.34,
      },
      {
        z: largo * (reactor ? 0.3 : 0.02),
        ancho: anchoCuerpo * 0.7,
        alto: altoCuerpo * 0.36,
        y: altoCuerpo * 0.3,
      },
    ],
    0x23303a,
  );
  piezas.push(cabina);

  // ── El ala, que es lo que decide la silueta ──────────────────────────
  /*
   * **Y en el biplano la de arriba va arriba del todo.**
   *
   * Estaba en la posición de ala baja, y la segunda unos centímetros por
   * debajo: dos losas casi a la misma altura, que de cerca no se leen como un
   * biplano sino como un ala gorda partida. Lo que hace biplano a un biplano
   * es **el hueco**, y el hueco tiene que medir algo — aquí, más de medio
   * fuselaje.
   */
  const alaY = biplano
    ? altoCuerpo * 0.62
    : alaArriba
      ? altoCuerpo * 0.48
      : -altoCuerpo * 0.42;
  /*
   * Y en el biplano el ala de arriba va **adelantada** respecto a la de abajo.
   * Se llama decalaje y lo llevan casi todos los biplanos de verdad, pero aquí
   * hay una razón de dibujo antes que de aerodinámica: sin él, las dos alas se
   * tapan la una a la otra en planta y desde arriba el biplano se ve como un
   * monoplano. Con él, las dos se cuentan desde cualquier ángulo.
   */
  const alaZ = reactor ? largo * 0.02 : biplano ? -largo * 0.12 : -largo * 0.04;
  piezas.push(
    superficie(
      {
        cuerdaRaiz: c * (reactor ? 1.5 : 1),
        cuerdaPunta: c * (reactor ? 0.5 : 0.72),
        largo: b / 2,
        espesor: c * 0.12,
        flecha: reactor ? c * 1.9 : c * 0.12,
        diedro: reactor ? -0.06 : alaArriba ? -0.03 : 0.06,
        en: [0, alaY, alaZ],
      },
      paleta.body,
    ),
  );

  if (biplano) {
    /*
     * La segunda ala y sus montantes. Sin los montantes, dos alas paralelas se
     * leen como un ala gorda: lo que dice «biplano» es el hueco **con algo
     * dentro**.
     */
    piezas.push(
      superficie(
        {
          cuerdaRaiz: c * 0.92,
          cuerdaPunta: c * 0.68,
          largo: b * 0.43,
          espesor: c * 0.11,
          en: [0, -altoCuerpo * 0.45, alaZ + c * 0.95],
        },
        paleta.body,
      ),
    );
    for (const lado of [-1, 1]) {
      for (const dz of [-c * 0.3, c * 0.3]) {
        /*
         * Y los montantes miden **el hueco entero**, de un ala a la otra. Antes
         * medían una cuerda de alto fijo, que con las dos alas juntas sobraba
         * y con el hueco de verdad se queda corto: un biplano con montantes
         * que no llegan es un biplano roto.
         */
        const hueco = alaY + altoCuerpo * 0.45;
        const montante = tubo(
          [
            { z: -c * 0.05, ancho: c * 0.07, alto: hueco, y: hueco / 2 },
            { z: c * 0.05, ancho: c * 0.07, alto: hueco, y: hueco / 2 },
          ],
          paleta.trim,
        );
        montante.translate(
          lado * b * 0.3,
          -altoCuerpo * 0.45,
          alaZ + dz + c * 0.48,
        );
        piezas.push(montante);
      }
    }
  }

  // ── Los motores ──────────────────────────────────────────────────────
  if (bimotor || reactor) {
    const x = b * (reactor ? 0.28 : 0.24);
    const largoG = reactor ? c * 1.7 : c * 1.6;
    const radioG = c * (reactor ? 0.34 : 0.24);
    for (const lado of [-1, 1]) {
      const g = tubo(gondola(largoG, radioG), paleta.accent);
      /*
       * En el turbohélice la góndola va **en** el ala y en el reactor va
       * **colgada por debajo y por delante**. Es una diferencia de medio metro
       * y es la que separa las dos siluetas de un vistazo.
       */
      /*
       * **Y la hélice tiene que caber debajo.**
       *
       * En el ala baja, una góndola puesta a la altura del ala deja el disco
       * de la hélice por debajo del suelo: el radio es la novena parte del
       * ala y el tren no da para tanto. Un bimotor de verdad lo resuelve con
       * tren más alto o con las góndolas por encima del ala; aquí se sube la
       * góndola lo justo para que la punta de la pala pase con un palmo.
       */
      const sitio = reactor ? alaY - c * 0.62 : alaY + c * 0.16;
      const cabe = -tren + b * RADIO_DE_HELICE + 0.2;
      const y = reactor ? sitio : Math.max(sitio, cabe);
      const z = reactor ? alaZ - c * 1.5 : alaZ - c * 0.75;
      g.translate(lado * x, y, z);
      piezas.push(g);
      if (!reactor) helices.push(new Vector3(lado * x, y, z - largoG * 0.6));
      if (reactor) {
        // El pilón que la cuelga del ala: sin él el motor parece flotar.
        const pilon = tubo(
          [
            { z: -c * 0.1, ancho: c * 0.14, alto: c * 0.8, y: c * 0.45 },
            { z: c * 0.5, ancho: c * 0.14, alto: c * 0.8, y: c * 0.45 },
          ],
          paleta.trim,
        );
        pilon.translate(lado * x, y, z);
        piezas.push(pilon);
      }
    }
  } else {
    // Un solo motor delante, con su capó.
    const capo = tubo(
      [
        { z: -largo * 0.52, ancho: anchoCuerpo * 0.5, alto: altoCuerpo * 0.5 },
        {
          z: -largo * 0.44,
          ancho: anchoCuerpo * (biplano ? 1.05 : 0.92),
          alto: altoCuerpo * (biplano ? 1.05 : 0.92),
        },
        { z: -largo * 0.34, ancho: anchoCuerpo * 0.99, alto: altoCuerpo * 1.0 },
      ],
      paleta.accent,
    );
    piezas.push(capo);
    helices.push(new Vector3(0, 0, -largo * 0.56));
  }

  // ── La cola ──────────────────────────────────────────────────────────
  const colaEnT = silueta === "cola-en-t";
  const altoDeriva = c * (reactor ? 1.9 : 1.25);
  piezas.push(
    superficie(
      {
        cuerdaRaiz: c * (reactor ? 1.3 : 0.8),
        cuerdaPunta: c * 0.5,
        largo: altoDeriva,
        espesor: c * 0.1,
        flecha: reactor ? c * 1.2 : c * 0.45,
        vertical: true,
        en: [0, altoCuerpo * 0.3, largo * 0.42],
      },
      paleta.accent,
    ),
  );
  /*
   * Y el estabilizador, que en el regional va **arriba del todo**. La cola en
   * T no es un capricho de diseñador: con las hélices en el ala, la corriente
   * que sale de ellas pasa justo por donde iría la cola baja. Y es la silueta
   * que se reconoce de más lejos de las cinco.
   */
  piezas.push(
    superficie(
      {
        cuerdaRaiz: c * 0.7,
        cuerdaPunta: c * 0.45,
        largo: b * 0.19,
        espesor: c * 0.09,
        flecha: reactor ? c * 0.7 : c * 0.2,
        diedro: 0.04,
        en: [
          0,
          colaEnT ? altoCuerpo * 0.3 + altoDeriva : altoCuerpo * 0.34,
          largo * (colaEnT ? 0.5 : 0.44),
        ],
      },
      paleta.body,
    ),
  );

  // ── El tren ──────────────────────────────────────────────────────────
  const grosor = c * 0.07;
  const patas: [number, number][] = reactor
    ? [
        [-b * 0.09, largo * 0.02],
        [b * 0.09, largo * 0.02],
        [0, -largo * 0.36],
      ]
    : [
        [-b * 0.13, -largo * 0.06],
        [b * 0.13, -largo * 0.06],
        [0, largo * 0.4],
      ];
  for (const [x, z] of patas) {
    /*
     * **El tren mide lo que dice la ficha, no el ochenta y dos por ciento.**
     *
     * Estaba al 0,82 y eso son dos fuentes de verdad para la misma cosa: el
     * juego coloca la aeronave por `gearHeight` —las ruedas en el suelo— y la
     * geometría se hundía un 18 % de esa altura. Con las ruedas tocando, el
     * eje del fuselaje quedaba más bajo de lo que el juego cree, y **la hélice
     * acababa bajo tierra**: «eso se usa para plantar chía y soja».
     */
    piezas.push(...pata(x, z, tren, grosor, paleta.trim));
  }

  const geometria = mergeGeometries(piezas, false)!;
  geometria.computeBoundingBox();
  /*
   * El avión se coloca por el tren y no por su centro —lo hace el juego al
   * posarlo en el suelo—, así que la panza baja hasta que lo más bajo sea el
   * cero. Es la misma convención que se le impone a un glTF de fuera.
   */
  /*
   * **Y el número se copia antes de trasladar.**
   *
   * `boundingBox` no es una foto: `translate` la actualiza en el sitio, así
   * que quedarse con la referencia y leer `min.y` después de mover la
   * geometría da **cero**, siempre. Las dos cosas que se corrigen con ese
   * número —dónde va la hélice y dónde va el ojo— se quedaban en el eje del
   * fuselaje, y el juego las bajaba después otra vez por la altura del tren:
   * la hélice acababa bajo tierra. «Eso se usa para plantar chía y soja.»
   */
  const panza = geometria.boundingBox!.min.y;
  geometria.translate(0, -panza, 0);

  return {
    geometria,
    helices: helices.map((h) => new Vector3(h.x, h.y - panza, h.z)),
    /*
     * **Dónde se pone la cámara de cabina, que aquí no es una cabina.**
     *
     * La vista de cabina del juego se pone donde los ojos del piloto **y deja
     * el avión dibujado**, porque en un modelo de verdad hay cabina: se ve el
     * panel, el marco del parabrisas y el morro. Un avión de esta fábrica no
     * tiene cabina — el cristal va pintado sobre un casco macizo—, así que
     * poner el ojo dentro es poner la cámara dentro de una caja cerrada.
     *
     * Se probó tres veces y las tres se vio lo mismo con otro color: a la
     * altura del fuselaje, el fuselaje; un poco más arriba, el capó, que en un
     * radial de fumigador es más ancho que el propio avión; y por encima de
     * todo, el ala de arriba del biplano.
     *
     * Así que va **justo delante del morro**, en el eje. Desde ahí se ve lo
     * que hay que ver y el avión queda detrás, que es lo único que no puede
     * estorbar. El día que un modelo traiga cabina de verdad, manda él: el
     * cargador de glTF devuelve su propio ojo y éste no se usa.
     */
    ojo: new Vector3(0, altoCuerpo * 0.2 - panza, -largo * 0.6),
  };
}
