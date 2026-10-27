/**
 * **Un `.glb` de prueba, hecho por código**: el de los bancos de los sitios
 * con modelo, para medir el camino antes de que haya arte.
 *
 * Escrito a mano y sin `GLTFExporter`, que no está en el paquete del juego:
 * son una cabecera, un trozo JSON y uno binario. Lleva lo mismo que llevará
 * un sitio de verdad —color en los vértices, un material, varias piezas y un
 * `bulto`— y tantos triángulos como se le pidan, para poder medir con el tope
 * de la ficha más gorda y por encima.
 *
 * La forma no importa y no imita nada: un barrio de bloques en una rejilla de
 * seiscientos metros con una torre alta en medio, que es lo que pinta en
 * pantalla con más llamadas y más aristas por triángulo que una presa.
 */

/** Lo que mide de lado la rejilla de bloques, m. */
const LADO = 600;

/** La torre del medio: lo alto, y la caja de choque que la envuelve. */
const TORRE = { lado: 24, alto: 120 } as const;

interface Malla {
  posiciones: number[];
  normales: number[];
  colores: number[];
  indices: number[];
}

const nueva = (): Malla => ({ posiciones: [], normales: [], colores: [], indices: [] });

/** Una caja de base `x0..x1 × z0..z1` y de `0` a `alto`, con un color por cara de arriba y otro de los lados. */
function caja(
  m: Malla,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  alto: number,
  lados: readonly [number, number, number],
  techo: readonly [number, number, number],
): void {
  const caras: [readonly number[][], readonly [number, number, number], readonly [number, number, number]][] = [
    [[[x0, 0, z1], [x1, 0, z1], [x1, alto, z1], [x0, alto, z1]], [0, 0, 1], lados],
    [[[x1, 0, z0], [x0, 0, z0], [x0, alto, z0], [x1, alto, z0]], [0, 0, -1], lados],
    [[[x1, 0, z1], [x1, 0, z0], [x1, alto, z0], [x1, alto, z1]], [1, 0, 0], lados],
    [[[x0, 0, z0], [x0, 0, z1], [x0, alto, z1], [x0, alto, z0]], [-1, 0, 0], lados],
    [[[x0, alto, z1], [x1, alto, z1], [x1, alto, z0], [x0, alto, z0]], [0, 1, 0], techo],
    [[[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], [0, -1, 0], lados],
  ];
  for (const [v, n, c] of caras) {
    const i0 = m.posiciones.length / 3;
    for (const p of v) {
      m.posiciones.push(p[0]!, p[1]!, p[2]!);
      m.normales.push(...n);
      m.colores.push(...c);
    }
    m.indices.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }
}

/** Un generador de números con semilla: el mismo `.glb` cada vez. */
function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * El `.glb`, con unos `triangulos` de dibujo (redondeados a cajas de doce) y
 * una caja de choque `bulto-torre` alrededor de la torre del medio.
 */
export function glbDePrueba(triangulos = 20_000): Uint8Array {
  const r = azar(7);
  const cuerpo = nueva();
  // La torre, blanca, en el centro: es lo que asoma de lejos.
  caja(cuerpo, -TORRE.lado / 2, TORRE.lado / 2, -TORRE.lado / 2, TORRE.lado / 2, TORRE.alto, [0.92, 0.92, 0.9], [0.8, 0.8, 0.8]);
  const cajas = Math.max(0, Math.round(triangulos / 12) - 1);
  const porLado = Math.max(1, Math.ceil(Math.sqrt(cajas)));
  const celda = LADO / porLado;
  for (let i = 0; i < cajas; i++) {
    const cx = -LADO / 2 + ((i % porLado) + 0.5) * celda;
    const cz = -LADO / 2 + (Math.floor(i / porLado) + 0.5) * celda;
    if (Math.abs(cx) < TORRE.lado && Math.abs(cz) < TORRE.lado) continue;
    const media = celda * (0.25 + 0.15 * r());
    const tono = 0.45 + 0.4 * r();
    caja(
      cuerpo,
      cx - media,
      cx + media,
      cz - media,
      cz + media,
      4 + 26 * r(),
      [tono, tono * 0.85, tono * 0.7],
      [0.6, 0.25 + 0.2 * r(), 0.18],
    );
  }
  const bulto = nueva();
  caja(bulto, -TORRE.lado / 2, TORRE.lado / 2, -TORRE.lado / 2, TORRE.lado / 2, TORRE.alto, [1, 1, 1], [1, 1, 1]);
  return escribirGlb([
    { nombre: "cuerpo", malla: cuerpo, conColor: true },
    { nombre: "bulto-torre", malla: bulto, conColor: false },
  ]);
}

/** Escribe un glTF binario con estas piezas y un solo material blanco. */
function escribirGlb(piezas: readonly { nombre: string; malla: Malla; conColor: boolean }[]): Uint8Array {
  const trozos: Uint8Array[] = [];
  let largo = 0;
  const bufferViews: object[] = [];
  const accessors: object[] = [];
  const meter = (datos: Float32Array | Uint32Array, objetivo: number): number => {
    const bytes = new Uint8Array(datos.buffer, datos.byteOffset, datos.byteLength);
    bufferViews.push({ buffer: 0, byteOffset: largo, byteLength: bytes.byteLength, target: objetivo });
    trozos.push(bytes);
    largo += bytes.byteLength;
    return bufferViews.length - 1;
  };
  const meshes: object[] = [];
  for (const { malla, conColor } of piezas) {
    const p = new Float32Array(malla.posiciones);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i++) {
      min[i % 3] = Math.min(min[i % 3]!, p[i]!);
      max[i % 3] = Math.max(max[i % 3]!, p[i]!);
    }
    const n = p.length / 3;
    const atributos: Record<string, number> = {};
    accessors.push({ bufferView: meter(p, 34962), componentType: 5126, count: n, type: "VEC3", min, max });
    atributos.POSITION = accessors.length - 1;
    accessors.push({ bufferView: meter(new Float32Array(malla.normales), 34962), componentType: 5126, count: n, type: "VEC3" });
    atributos.NORMAL = accessors.length - 1;
    if (conColor) {
      accessors.push({ bufferView: meter(new Float32Array(malla.colores), 34962), componentType: 5126, count: n, type: "VEC3" });
      atributos.COLOR_0 = accessors.length - 1;
    }
    accessors.push({
      bufferView: meter(new Uint32Array(malla.indices), 34963),
      componentType: 5125,
      count: malla.indices.length,
      type: "SCALAR",
    });
    meshes.push({ primitives: [{ attributes: atributos, indices: accessors.length - 1, material: 0 }] });
  }
  const json = {
    asset: { version: "2.0", generator: "glb-de-prueba de Óga Veve" },
    scene: 0,
    scenes: [{ nodes: piezas.map((_, i) => i) }],
    nodes: piezas.map((p, i) => ({ name: p.nombre, mesh: i })),
    meshes,
    materials: [
      { name: "prueba", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } },
    ],
    accessors,
    bufferViews,
    buffers: [{ byteLength: largo }],
  };
  const texto = new TextEncoder().encode(JSON.stringify(json));
  const relleno = (x: number) => (4 - (x % 4)) % 4;
  const largoJson = texto.byteLength + relleno(texto.byteLength);
  const largoBin = largo + relleno(largo);
  const total = 12 + 8 + largoJson + 8 + largoBin;
  const salida = new Uint8Array(total);
  const vista = new DataView(salida.buffer);
  vista.setUint32(0, 0x46546c67, true); // «glTF»
  vista.setUint32(4, 2, true);
  vista.setUint32(8, total, true);
  vista.setUint32(12, largoJson, true);
  vista.setUint32(16, 0x4e4f534a, true); // «JSON»
  salida.set(texto, 20);
  salida.fill(0x20, 20 + texto.byteLength, 20 + largoJson);
  let o = 20 + largoJson;
  vista.setUint32(o, largoBin, true);
  vista.setUint32(o + 4, 0x004e4942, true); // «BIN»
  o += 8;
  for (const t of trozos) {
    salida.set(t, o);
    o += t.byteLength;
  }
  return salida;
}
