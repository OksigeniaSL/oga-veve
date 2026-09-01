/**
 * La ciudad: dónde hay casas, no qué casas hay.
 *
 * Volando sobre Luque, quien lo probó dijo que estaba «sobrevolando el
 * Pleistoceno, todo árboles». Y era verdad: el aeródromo flotaba en un bosque
 * de ciento noventa kilómetros cuadrados, sin una casa ni una carretera.
 *
 * **Los datos reales no caben.** En quince kilómetros alrededor de Silvio
 * Pettirossi hay cuatrocientos treinta y cuatro mil edificios; incluso
 * cuantizados en binario son doce megabytes, contra los seiscientos veinte
 * kilobytes que ocupa hoy el aeródromo entero.
 *
 * Y no hacen falta. Desde trescientos metros nadie distingue una casa; lo que
 * se reconoce es **por dónde se espesa la ciudad y la carretera que va al
 * centro**. Así que se envía una rejilla de noventa y seis por noventa y seis
 * celdas con la clase de suelo y su densidad —dieciocho kilobytes— y las casas
 * las pone aquí un sorteo con semilla fija.
 *
 * Semilla fija, que es la parte importante: **un sitio se aprende porque no
 * cambia**. Si las casas se sortearan en cada partida, el barrio de al lado de
 * la pista no sería el barrio de al lado de la pista.
 *
 * Los datos salen de `scripts/osm-a-ciudad.mjs` y son base de datos derivada de
 * OpenStreetMap, ODbL 1.0.
 */

import {
  BufferGeometry,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from './noise';
import type { Punto } from './aerodrome';

export interface Ciudad {
  readonly id: string;
  readonly tamanoM: number;
  readonly rejilla: { readonly lado: number; readonly clase: Uint8Array; readonly densidad: Uint8Array };
  readonly vias: readonly { readonly nivel: number; readonly puntos: readonly Punto[] }[];
}

/** Cuántas casas caben en una celda a densidad máxima. */
const POR_CELDA = 16;

/**
 * Las tres clases de suelo, y qué se levanta en cada una.
 *
 * No son alturas de catálogo: son **lo que distingue un barrio de un polígono
 * industrial desde el aire**, que es lo único que hay que acertar. Un barrio es
 * muchas cosas pequeñas y parecidas; un polígono, pocas cosas grandes y bajas;
 * el centro, algo alto entre lo bajo.
 */
const CLASES = [
  null,
  { nombre: 'residencial', ancho: [9, 19], alto: [4, 9], color: 0xd8cbb4, tejado: 0x9c5a44 },
  { nombre: 'industrial', ancho: [22, 46], alto: [6, 11], color: 0xc2c4bd, tejado: 0x8f9490 },
  { nombre: 'comercial', ancho: [12, 26], alto: [9, 30], color: 0xcfcabe, tejado: 0x7e7a72 },
  /*
   * El cuarto no es una clase de suelo: es **la otra mitad del barrio**.
   *
   * Con un solo perfil residencial, un barrio salía como una alfombra de
   * casitas idénticas de tejado rojo, y eso no es ninguna ciudad — es un
   * sarpullido. La mitad de las casas van a azotea clara, que es lo que hay de
   * verdad en Asunción y en La Laguna, y con eso el barrio deja de ser un
   * patrón y pasa a ser un sitio.
   *
   * Cuesta una llamada de dibujo más. El color del tejado va horneado en la
   * geometría, así que dos tejados son dos geometrías; a cambio, veinte mil
   * casas siguen siendo cuatro llamadas.
   */
  { nombre: 'azotea', ancho: [8, 17], alto: [4, 8], color: 0xd2cdc0, tejado: 0xc8c3b6 },
] as const;

/** De qué clase se construye de verdad, tirando el dado. */
const RESIDENCIAL = 1;
const AZOTEA = 4;

/** El ancho de cada tipo de vía, m. De autopista a terciaria. */
const ANCHO_VIA = [22, 18, 13, 10, 7];
const ASFALTO = 0x4a4a4d;

/**
 * Levanta la ciudad.
 *
 * `enElAeropuerto` dice si un punto cae dentro del recinto: ahí no se
 * construye, y no por realismo sino porque una nave de veinte metros en mitad
 * de la pista es un accidente.
 */
export function crearCiudad(
  ciudad: Ciudad,
  cota: (x: number, z: number) => number,
  enElAeropuerto: (x: number, z: number) => boolean,
  nivelDelAgua: number,
): Group {
  const grupo = new Group();
  grupo.name = 'ciudad';

  const { lado, clase, densidad } = ciudad.rejilla;
  const paso = ciudad.tamanoM / lado;
  const mitad = ciudad.tamanoM / 2;

  // ── Las vías ────────────────────────────────────────────────────────────
  //
  // Una sola malla para todas: son mil setecientos tramos y mil setecientas
  // llamadas de dibujo serían más que todo el resto del juego junto.
  const trozos: BufferGeometry[] = [];
  for (const via of ciudad.vias) {
    const ancho = ANCHO_VIA[via.nivel] ?? 7;
    for (let i = 0; i < via.puntos.length - 1; i++) {
      const [ax, ay] = via.puntos[i]!;
      const [bx, by] = via.puntos[i + 1]!;
      // El fichero tiene la Y al norte; el mundo, el norte en la Z negativa.
      const az = -ay;
      const bz = -by;
      const largo = Math.hypot(bx - ax, bz - az);
      if (largo < 1) continue;
      const ux = (bx - ax) / largo;
      const uz = (bz - az) / largo;
      // Se alarga medio ancho por cada punta para que dos tramos seguidos no
      // dejen una muesca en el codo. Es más barato que coser con inglete y a
      // esta escala no se distingue.
      const ex = (ux * ancho) / 2;
      const ez = (uz * ancho) / 2;
      const px = (-uz * ancho) / 2;
      const pz = (ux * ancho) / 2;
      const esquinas: readonly [number, number][] = [
        [ax - ex + px, az - ez + pz],
        [bx + ex + px, bz + ez + pz],
        [bx + ex - px, bz + ez - pz],
        [ax - ex - px, az - ez - pz],
      ];
      const pos = new Float32Array(12);
      let sumergida = false;
      esquinas.forEach(([qx, qz], k) => {
        const h = cota(qx, qz);
        if (h <= nivelDelAgua) sumergida = true;
        pos[k * 3] = qx;
        pos[k * 3 + 1] = h + 0.35;
        pos[k * 3 + 2] = qz;
      });
      if (sumergida) continue;
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      trozos.push(g);
    }
  }
  const fusionadas = trozos.length ? mergeGeometries(trozos, false) : null;
  if (fusionadas) {
    const malla = new Mesh(fusionadas, new MeshLambertMaterial({ color: ASFALTO }));
    malla.name = 'viario';
    malla.matrixAutoUpdate = false;
    grupo.add(malla);
  }

  // ── Las casas ───────────────────────────────────────────────────────────
  //
  // Un `InstancedMesh` por clase: tres llamadas de dibujo para veinte mil
  // edificios. El tejado va **horneado en los vértices de la caja**, y por eso
  // sale gratis: la cara de arriba lleva su color y el resto el de la fachada,
  // y luego el color de cada instancia lo tiñe entero.
  const sorteo = mulberry32(0x0ca11e);
  const matrices: Matrix4[][] = CLASES.map(() => []);
  const tintes: Color[][] = CLASES.map(() => []);

  /*
   * La densidad, difuminada un paso.
   *
   * La rejilla es de celdas de ciento ochenta y siete metros y **el borde de la
   * ciudad se veía como una escalera**: una celda llena pegada a una vacía, con
   * su recta perfecta de casas cortada a cuchillo. Ninguna ciudad se acaba así.
   * Cada celda toma la mitad de la más poblada de sus vecinas, y con eso el
   * barrio se deshilacha en el campo como se deshilacha de verdad.
   */
  const suave = new Uint8Array(densidad.length);
  for (let fila = 0; fila < lado; fila++) {
    for (let col = 0; col < lado; col++) {
      const i = fila * lado + col;
      let vecina = 0;
      for (const [df, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const f = fila + df;
        const c = col + dc;
        if (f < 0 || f >= lado || c < 0 || c >= lado) continue;
        vecina = Math.max(vecina, densidad[f * lado + c]!);
      }
      suave[i] = Math.max(densidad[i]!, Math.round(vecina * 0.45));
    }
  }

  const posicion = new Vector3();
  const giro = new Quaternion();
  const escala = new Vector3();
  const arriba = new Vector3(0, 1, 0);
  const tinte = new Color();

  for (let fila = 0; fila < lado; fila++) {
    for (let col = 0; col < lado; col++) {
      const i = fila * lado + col;
      let c = clase[i]!;
      if (!c) {
        // Celda sin clase pero con vecina poblada: el deshilachado del borde.
        if (suave[i]! < 30) continue;
        c = RESIDENCIAL;
      }
      const cuantas = Math.round((suave[i]! / 255) * POR_CELDA);
      for (let k = 0; k < cuantas; k++) {
        // En los barrios, media azotea clara y medio tejado rojo.
        const cual = c === RESIDENCIAL && sorteo() < 0.5 ? AZOTEA : c;
        const perfil = CLASES[cual]!;
        const x = -mitad + (col + sorteo()) * paso;
        // El fichero tiene la Y al norte: la fila crece al norte y la Z al sur.
        const z = -(-mitad + (fila + sorteo()) * paso);
        if (enElAeropuerto(x, z)) continue;
        const suelo = cota(x, z);
        if (suelo <= nivelDelAgua + 1) continue;

        const ancho = perfil.ancho[0] + sorteo() * (perfil.ancho[1] - perfil.ancho[0]);
        const fondo = ancho * (0.7 + sorteo() * 0.6);
        const alto = perfil.alto[0] + sorteo() * (perfil.alto[1] - perfil.alto[0]);
        posicion.set(x, suelo + alto / 2, z);
        // Alineadas a la trama, no al azar: cuatro orientaciones y un pelo de
        // desvío. Un barrio de casas giradas al azar se lee como escombrera.
        giro.setFromAxisAngle(arriba, Math.floor(sorteo() * 4) * (Math.PI / 2) + (sorteo() - 0.5) * 0.25);
        escala.set(ancho, alto, fondo);
        matrices[cual]!.push(new Matrix4().compose(posicion, giro, escala));
        // Un poco de variación de tono por casa, que es lo que evita que un
        // barrio parezca una hoja de cálculo.
        tinte.setHex(perfil.color);
        const v = 0.86 + sorteo() * 0.28;
        tintes[cual]!.push(new Color(tinte.r * v, tinte.g * v, tinte.b * v));
      }
    }
  }

  for (let c = 1; c < CLASES.length; c++) {
    const lista = matrices[c]!;
    if (!lista.length) continue;
    const perfil = CLASES[c]!;
    const malla = new InstancedMesh(
      cajaConTejado(perfil.color, perfil.tejado),
      new MeshLambertMaterial({ vertexColors: true }),
      lista.length,
    );
    lista.forEach((m, i) => malla.setMatrixAt(i, m));
    tintes[c]!.forEach((color, i) => malla.setColorAt(i, color));
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.name = `edificios:${perfil.nombre}`;
    malla.frustumCulled = true;
    grupo.add(malla);
  }

  return grupo;
}

/**
 * Una caja de lado uno con la cara de arriba de otro color.
 *
 * El tejado no es una malla aparte: son cuatro vértices de la misma caja
 * pintados distinto. Un tejado como objeto habría doblado el número de
 * instancias a cambio de nada — desde el aire un tejado es exactamente eso, la
 * cara de arriba de otro color.
 *
 * **El color de instancia multiplica al del vértice**, así que en el tejado no
 * va su color sino la razón entre el del tejado y el de la fachada. Al
 * multiplicarse por el tinte de cada casa —que es la fachada con su variación—
 * sale el tejado con esa misma variación. Puesto tal cual, cada tejado salía
 * teñido de su propia fachada y todos acababan marrones.
 */
function cajaConTejado(fachada: number, tejado: number): BufferGeometry {
  const geo = new BoxGeometry(1, 1, 1);
  const pos = geo.getAttribute('position');
  const colores = new Float32Array(pos.count * 3);
  const base = new Color(fachada);
  const arriba = new Color(tejado);
  const razon = [
    arriba.r / Math.max(0.02, base.r),
    arriba.g / Math.max(0.02, base.g),
    arriba.b / Math.max(0.02, base.b),
  ];
  for (let i = 0; i < pos.count; i++) {
    const esTejado = pos.getY(i) > 0.49;
    for (let k = 0; k < 3; k++) colores[i * 3 + k] = esTejado ? razon[k]! : 1;
  }
  geo.setAttribute('color', new Float32BufferAttribute(colores, 3));
  return geo;
}
