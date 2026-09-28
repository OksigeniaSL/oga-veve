/**
 * **Los aviones del tráfico, con los modelos de la flota y libreas de nadie.**
 *
 * El tráfico del aeródromo se dibujaba con la fábrica de cajas —ver
 * `fabrica-de-aeronaves.ts`—, que es el respaldo de cuando falta un modelo:
 * rodando a tu lado en Los Rodeos se veía lo que es, un avión de juguete
 * junto al tuyo, y encima flotando metro y medio sobre la calle. Los modelos
 * de verdad ya existen, son los de la flota, y se reconocen igual de lejos
 * que de cerca: la avioneta de ala alta, el bimotor de ala baja y el reactor
 * de pasaje con los motores bajo el ala.
 *
 * ## Lo que se coge de cada modelo
 *
 * El exterior y nada más. Un modelo de la flota lleva su cabina entera —el
 * panel, los relojes, los asientos—, que desde fuera no se ve y cuesta la
 * mitad de sus triángulos. Se quedan fuera también las palas de la hélice,
 * que paradas serían una tapa negra delante del motor y girando son un disco
 * casi transparente (lo mismo que el turbohélice de las islas: solo el cono).
 *
 * Y todo lo que queda se funde en dos geometrías por tipo —lo de color fijo y
 * lo que va pintado— para que cada avión sean dos llamadas de dibujo y no
 * cien. Se hace una vez por tipo y por página.
 *
 * ## Las libreas
 *
 * Blancas, con el capó, la cola y las franjas de un color, que es como va
 * pintado casi todo lo que vuela. **Ninguna es la de nadie**: ni la de una
 * compañía de verdad —sin nombres, sin logotipos— ni la de la Granja Óga,
 * que es la del avión de quien juega. Por eso se quita la pieza del
 * logotipo y la cola no lleva el sol entre las hojas, y los colores no son
 * ni el crema ni el verde ni el terracota de la casa: ver `LIBREAS`.
 *
 * ## Lo que cuesta
 *
 * Medido con la tarjeta del portátil, bajando el fichero y horneándolo en
 * frío: la avioneta, 15.238 triángulos y 412 KB de geometría en 29 ms; el
 * bimotor, 17.468 y 483 KB en 28 ms; el reactor, 30.258 y 895 KB en 26 ms.
 * Una vez por tipo y por página, y solo si ese tipo llega a salir.
 *
 * ## El turbohélice, que no es de la flota
 *
 * El que une las islas es de ala alta con las góndolas colgadas, y en la
 * flota no hay ninguno así: el JAZ 60 es de ala baja. Se dibujaba siempre con
 * el de las islas —ver `aviones-de-las-islas.ts`—, cuatrocientos triángulos
 * que de lejos valen y de cerca, esperando delante de ti en la paralela, son
 * un tubo con dos tablas: «esos aviones se ven feos». Ahora tiene su modelo,
 * hecho como los de la flota —`modelos/trafico-turbohelice.py`— y horneado
 * como ellos; el de las islas queda para lejos.
 *
 * El exterior de un avión de la flota no baja de ahí —el casco del JAZ 90
 * solo ya son once mil—, así que de cerca va el bueno y **de lejos el de la
 * fábrica**, de unos cientos: ver `DE_CERCA` en `trafico.ts`. Cada avión son
 * dos llamadas de dibujo de cerca y una de lejos, que es lo que costaba antes.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Material,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { conPlazo, PLAZO_DE_IMAGEN } from "../datos/con-plazo";

/** Una librea del tráfico: el blanco y el color que la distingue. */
export interface LibreaDelTrafico {
  readonly casco: number;
  readonly color: number;
}

/**
 * Un blanco frío. El de las islas, `0xf3f3ef`, con el sol de la tarde se lee
 * crema, y crema es el casco de la casa: se vio en Los Rodeos, con un reactor
 * del tráfico que parecía el JAZ 90 de quien juega pintado de rojo.
 */
const BLANCO = 0xf7f9fb;

/**
 * Blanco con azul, con rojo, con violeta y con turquesa. Se distinguen entre
 * sí de lejos y no se parecen a la de la casa —crema, verde oscuro y
 * terracota— ni a la de nadie.
 */
export const LIBREAS: readonly LibreaDelTrafico[] = [
  { casco: BLANCO, color: 0x1d5fa8 },
  { casco: BLANCO, color: 0xb3262d },
  { casco: BLANCO, color: 0x5b3a8c },
  { casco: BLANCO, color: 0x12808a },
];

/**
 * Qué modelo hace de cada tipo del tráfico: uno de la flota, o el turbohélice
 * de ala alta, que no está en ella. Ver «El turbohélice».
 */
export const MODELO_DEL_TIPO: Readonly<Record<string, string>> = {
  avioneta: "jaz-20",
  bimotor: "jaz-40",
  turbohelice: "trafico-turbohelice",
  reactor: "jaz-90",
};

/** Las dos partes de un avión del tráfico. Ver «Lo que se coge». */
export interface CuerpoHorneado {
  /** Lo que no cambia de librea, con su color por vértice. */
  readonly fijo: BufferGeometry;
  /** Lo que va del color de la librea. */
  readonly pintado: BufferGeometry;
  /** Triángulos entre las dos, para poder medirlo. */
  readonly triangulos: number;
}

/**
 * Lo que no se ve desde fuera, por el nombre de su material: la cabina.
 * Y el logotipo de la casa, que no es del tráfico.
 */
const DE_DENTRO =
  /^(tablero|tapiceria|boton|bisel|pomo|forro|subpanel|tornillo|visera|reloj_.*|g1000_display|mcp.*|marca)$/;

/** Y por el nombre de la pieza, por si algún material se comparte. */
const PIEZA_DE_DENTRO =
  /asiento|panel|reloj|cuerno|boton|pomo|palanca|pedestal|mcp|bastidor|interruptores|marco-de-techo|suelo-cabina|alfeizar|forro|visera|tornillos|palas/;

/** Lo que va del color de la librea. */
const PINTADO = new Set(["capo", "cola", "detalle"]);

/** El cristal y la goma, como en la flota: ver `pintarDeLaFlota`. */
const FIJOS: Record<string, number> = {
  cristal: 0x1b262d,
  goma: 0x16161a,
};

/** Un cuerpo por modelo y por página: se hornea una vez. */
const horneados = new Map<string, Promise<CuerpoHorneado | null>>();

/**
 * El cuerpo de un tipo del tráfico, hecho con el modelo `id` de la flota a
 * la envergadura del tipo, con las ruedas a `ruedas` metros por debajo del
 * origen —que es donde el tráfico pone su suelo—. `null` si el modelo no
 * llega: entonces se queda el de la fábrica.
 */
export function cuerpoDelTrafico(
  id: string,
  envergadura: number,
  ruedas: number,
  base = import.meta.env.BASE_URL ?? "/",
): Promise<CuerpoHorneado | null> {
  const clave = `${id}:${envergadura}:${ruedas}`;
  let hecho = horneados.get(clave);
  if (!hecho) {
    const url = `${base}${base.endsWith("/") ? "" : "/"}assets/aeronaves/${id}.glb`;
    hecho = conPlazo(new GLTFLoader().loadAsync(url), PLAZO_DE_IMAGEN, `el modelo ${id}`)
      .then((gltf) => (gltf ? hornear(gltf.scene, envergadura, ruedas) : null))
      .catch(() => null);
    horneados.set(clave, hecho);
  }
  return hecho;
}

/** Funde el exterior de un modelo en sus dos geometrías. */
export function hornear(
  raiz: Object3D,
  envergadura: number,
  ruedas: number,
): CuerpoHorneado | null {
  raiz.updateMatrixWorld(true);
  const fijas: BufferGeometry[] = [];
  const pintadas: BufferGeometry[] = [];
  const color = new Color();
  raiz.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.isMesh || PIEZA_DE_DENTRO.test(o.name)) return;
    const material = (
      Array.isArray(malla.material) ? malla.material[0] : malla.material
    ) as (Material & { color?: Color }) | undefined;
    const nombre = material?.name ?? "";
    if (DE_DENTRO.test(nombre)) return;
    const g = soloForma(malla.geometry);
    g.applyMatrix4(malla.matrixWorld);
    if (PINTADO.has(nombre)) {
      pintadas.push(g);
      return;
    }
    /*
     * El color del modelo, salvo el casco y los dos que son iguales en todos
     * los aviones. El casco va a blanco puro: lo pinta el material con el
     * blanco de la librea, que multiplica al color de cada vértice.
     */
    if (nombre === "casco") color.setHex(0xffffff);
    else if (FIJOS[nombre] !== undefined) color.setHex(FIJOS[nombre]!);
    else if (material?.color) color.copy(material.color);
    else color.setHex(0x9a9ea3);
    const n = g.getAttribute("position").count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    }
    g.setAttribute("color", new BufferAttribute(c, 3));
    fijas.push(g);
  });
  if (!fijas.length) return null;
  const fijo = mergeGeometries(fijas, false);
  const pintado = pintadas.length
    ? mergeGeometries(pintadas, false)
    : null;
  for (const g of [...fijas, ...pintadas]) g.dispose();
  if (!fijo) return null;
  const otro = pintado ?? new BufferGeometry();

  /*
   * A la envergadura del tipo, con el morro hacia la Z negativa —como los de
   * la casa y como la fábrica—, centrado en el plano y **con las ruedas en su
   * sitio**: el tráfico pone su origen `ruedas` metros por encima del suelo,
   * y el de la fábrica tenía las ruedas en el origen, así que rodaba flotando
   * metro y medio sobre la calle.
   */
  fijo.computeBoundingBox();
  const caja = fijo.boundingBox!.clone();
  if (pintado) {
    pintado.computeBoundingBox();
    caja.union(pintado.boundingBox!);
  }
  const lado = caja.max.x - caja.min.x;
  const escala = lado > 0 ? envergadura / lado : 1;
  const cx = (caja.min.x + caja.max.x) / 2;
  const cz = (caja.min.z + caja.max.z) / 2;
  for (const g of pintado ? [fijo, pintado] : [fijo]) {
    g.translate(-cx, -caja.min.y, -cz);
    g.scale(escala, escala, escala);
    g.translate(0, -ruedas, 0);
    g.computeBoundingSphere();
  }
  const triangulos =
    ((fijo.index?.count ?? fijo.getAttribute("position").count) +
      (pintado
        ? (pintado.index?.count ?? pintado.getAttribute("position").count)
        : 0)) /
    3;
  return { fijo, pintado: otro, triangulos: Math.round(triangulos) };
}

/**
 * Posición y normal, con índice siempre: `mergeGeometries` pide que todas
 * lleven los mismos atributos y que o todas o ninguna lleven índice.
 */
function soloForma(geo: BufferGeometry): BufferGeometry {
  const g = geo.clone();
  for (const nombre of Object.keys(g.attributes))
    if (nombre !== "position" && nombre !== "normal") g.deleteAttribute(nombre);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  if (!g.index) {
    const n = g.getAttribute("position").count;
    const indice = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) indice[i] = i;
    g.setIndex(new BufferAttribute(indice, 1));
  }
  g.morphAttributes = {};
  return g;
}

/** Los materiales de una librea, compartidos entre todos los que la llevan. */
const materiales = new Map<number, { fijo: Material; pintado: Material }>();

function materialesDe(librea: LibreaDelTrafico): {
  fijo: Material;
  pintado: Material;
} {
  const clave = librea.casco * 0x1000000 + librea.color;
  let m = materiales.get(clave);
  if (!m) {
    m = {
      // Tiñe también lo que no es casco, y con un blanco roto eso no se ve.
      fijo: new MeshLambertMaterial({ vertexColors: true, color: librea.casco }),
      pintado: new MeshLambertMaterial({ color: librea.color }),
    };
    materiales.set(clave, m);
  }
  return m;
}

/** Un avión del tráfico ya montado, con su librea. */
export function vestirCuerpo(
  cuerpo: CuerpoHorneado,
  librea: LibreaDelTrafico,
): Group {
  const { fijo, pintado } = materialesDe(librea);
  const g = new Group();
  g.name = "trafico-cuerpo";
  g.add(new Mesh(cuerpo.fijo, fijo));
  g.add(new Mesh(cuerpo.pintado, pintado));
  return g;
}
