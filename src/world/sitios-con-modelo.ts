/**
 * **Lo que se reconoce desde el aire, con su modelo**: la represa de Itaipú,
 * el puente de Encarnación, el Auditorio de Santa Cruz, el Roque Nublo…
 *
 * El relieve y la ortofoto ya ponen las montañas, las costas y el color de
 * cada sitio, y con eso el Teide se reconoce. Lo que no ponen es lo que
 * **sobresale del suelo y es más estrecho que una muestra del relieve**: una
 * presa de doscientos metros de alto, un puente sobre el río, una cúpula, un
 * roque de ochenta metros en una cumbre que el relieve lejano alisa a
 * trescientos metros por muestra. Desde el avión eso se ve —y lo enseñan los
 * sellos de campo y la ventanilla— y en el mundo no estaba.
 *
 * ## Uno por sitio, hecho fuera y traído tal cual
 *
 * Cada sitio es un `.glb` propio en `public/assets/sitios/<id>.glb`, de pocos
 * polígonos, con el color en los vértices y la sombra de oclusión cocida en
 * ese color. Dónde va y cómo se gira **no** está en el fichero: está en
 * `data/sitios/sitios.json`, con la fuente de las coordenadas al lado, como
 * los hitos de la ventanilla. Así el modelo se puede rehacer sin tocar el
 * mundo y el sitio se puede corregir sin abrir Blender. El contrato del
 * fichero —ejes, unidades, color, bultos— está en `data/sitios/README.md`.
 *
 * ## Cargado al acercarse y soltado al alejarse
 *
 * Una tablet de aula no tiene memoria de vídeo aparte: lo que se sube a la
 * tarjeta se le quita al sistema. Así que nada de esto vive en la escena
 * mientras no se pueda ver. Cada sitio tiene su `alcance`, la distancia en
 * planta a la que empieza a medir un par de píxeles; dentro, se baja y se
 * pone; y se quita —geometrías, materiales y texturas— al pasar de
 * `alcance × SUELTA`. El margen entre las dos es para que un avión que vuela
 * justo por el borde no lo baje y lo suelte cada medio segundo.
 *
 * Se baja **de uno en uno y el más cercano primero**: leer un `.glb` se come
 * un trozo de fotograma en el hilo principal, y dos a la vez en el mismo
 * fotograma son el tirón que se nota.
 *
 * ## Donde la foto lo pinta
 *
 * Un modelo que cae al lado de su foto enseña dos presas, y con `dondeCae` —que
 * vale para señalar un monte pero toma el coseno de la latitud media— Itaipú
 * caía a doscientos metros de la suya volando desde Asunción. Así que se
 * coloca **en el marco del suelo que lo
 * dibuja**, que es el de su escenario con el coseno de su origen —el mismo
 * que usan el relieve y las teselas, ver `marcoDeTeselas`—. Si el sitio cae
 * en el mapa de un vecino, en el marco del vecino corrido a su sitio; si no,
 * en el de casa. Ver `dondeSeDibuja`.
 *
 * ## Y se choca con él
 *
 * Lo que un niño ve tiene que estar: si se atraviesa una presa, la presa es
 * decorado y la lección de la altura mínima se queda en manía. Las piezas del
 * modelo que se llaman `bulto…` no se dibujan: son las cajas contra las que
 * se choca, y se apuntan en el índice de bultos la primera vez que el sitio
 * se pone. No se borran al soltarlo, porque lejos no hay con qué chocar, y
 * no se apuntan dos veces. Ver `world/obstaculos.ts`.
 */

import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CATALOGO from "../../data/sitios/sitios.json";
import { conPlazo, PLAZO_DE_IMAGEN } from "../datos/con-plazo";
import { partirLoLargo } from "./curvatura";
import type { Sitio } from "./entre-aerodromos";
import type { Obstaculos } from "./obstaculos";
import { giroDelModelo } from "./rumbo";

/** Cómo viene cada sitio en `data/sitios/sitios.json`. */
export interface FichaDeSitio {
  /** El nombre del fichero: `public/assets/sitios/<id>.glb`. */
  readonly id: string;
  readonly nombre: string;
  /** Dónde va el origen del modelo, en grados. */
  readonly lat: number;
  readonly lon: number;
  /**
   * Hacia dónde mira el norte del modelo —su −Z, la +Y de Blender—, en grados
   * como un rumbo verdadero. Cero si se modeló con el norte arriba.
   */
  readonly giro: number;
  /**
   * La cota del origen del modelo, m sobre el mar; `null` para apoyarlo en el
   * suelo del juego en ese punto, que es lo normal: el relieve lejano no
   * coincide al metro con el de verdad, y un modelo con su cota real quedaría
   * colgando o enterrado.
   */
  readonly cota: number | null;
  /** Desde cuántos metros en planta se baja y se pone. */
  readonly alcance: number;
  /** De dónde salen las coordenadas: el elemento de OpenStreetMap o la fuente. */
  readonly de: string;
}

/** La lista entera, tal cual está en el fichero. */
export const SITIOS: readonly FichaDeSitio[] = (
  CATALOGO as unknown as { sitios: readonly FichaDeSitio[] }
).sitios;

/**
 * Hasta dónde del campo de casa se tienen en cuenta, m. Los mismos
 * cuatrocientos kilómetros que los hitos de la ventanilla: de Los Rodeos a
 * Lanzarote y de Asunción a las Cataratas.
 */
const HASTA = 400_000;

/**
 * Cuántas veces el alcance hay que alejarse para que se suelte. Ver la
 * cabecera: sin margen, volar por el borde lo baja y lo suelta sin parar.
 */
export const SUELTA = 1.3;

/** Cada cuánto se mira quién entra y quién sale, s. Es un cálculo de distancias. */
const CADA = 0.5;

/** Radio de la Tierra, m: el de los extractores, el del relieve y el de las teselas. */
const R = 6371008;
const RAD = Math.PI / 180;

/**
 * Un punto en el marco plano de un escenario: este y sur en metros desde su
 * origen, con el coseno de **la latitud del origen**. Es como están
 * extraídos su relieve y su foto. Ver `marcoDeTeselas`.
 */
export function enSuMarco(origen: Sitio, p: Sitio): { x: number; z: number } {
  return {
    x: (p.lon - origen.lon) * RAD * R * Math.cos(origen.lat * RAD),
    z: -(p.lat - origen.lat) * RAD * R,
  };
}

/** Un suelo dibujado en otro marco: un vecino, con su origen, su sitio y su medio lado. */
export interface SueloVecino {
  readonly origen: Sitio;
  readonly desplazamiento: { readonly x: number; readonly z: number };
  readonly medioLado: number;
}

/**
 * **Dónde se dibuja un punto**, en el mundo de casa: en el marco del vecino
 * que lo tiene en su mapa, corrido a donde cae, o en el de casa si ninguno lo
 * tiene. Es el mismo orden en el que el terreno contesta la cota.
 */
export function dondeSeDibuja(
  p: Sitio,
  casa: Sitio,
  vecinos: readonly SueloVecino[],
): { x: number; z: number } {
  for (const v of vecinos) {
    const l = enSuMarco(v.origen, p);
    if (Math.abs(l.x) <= v.medioLado && Math.abs(l.z) <= v.medioLado)
      return { x: v.desplazamiento.x + l.x, z: v.desplazamiento.z + l.z };
  }
  return enSuMarco(casa, p);
}

export type EstadoDeSitio = "fuera" | "bajando" | "puesto" | "roto";

/**
 * Lo que toca hacer con un sitio a esa distancia: bajarlo, soltarlo o nada.
 * Un sitio roto —el fichero no llegó o no se pudo leer— no se vuelve a pedir
 * en el vuelo: pedirlo cada medio segundo sería llenar la red de lo mismo.
 */
export function queToca(
  estado: EstadoDeSitio,
  distancia: number,
  alcance: number,
): "bajar" | "soltar" | null {
  if (estado === "fuera" && distancia <= alcance) return "bajar";
  if ((estado === "puesto" || estado === "bajando") && distancia > alcance * SUELTA)
    return "soltar";
  return null;
}

/** Si un nodo del modelo es un bulto —caja de choque— y no algo que se ve. */
export const esBulto = (o: Object3D): boolean =>
  /^bulto/i.test(o.name) || (o.parent !== null && /^bulto/i.test(o.parent.name));

interface EnElMundo {
  readonly ficha: FichaDeSitio;
  readonly url: string;
  readonly x: number;
  readonly z: number;
  estado: EstadoDeSitio;
  modelo: Object3D | null;
  /** Si sus bultos ya están en el índice: se apuntan una vez por vuelo. */
  apuntado: boolean;
}

/** Lo que hace falta del juego para poner los sitios. */
export interface DelMundo {
  /** El origen del campo de casa. */
  readonly casa: Sitio;
  /** Los vecinos montados, con su marco. */
  readonly vecinos: readonly SueloVecino[];
  /** La cota del suelo del juego en un punto. */
  readonly suelo: (x: number, z: number) => number;
  /** El índice de bultos, para chocar con ellos; `null` para no apuntarlos. */
  readonly bultos: Obstaculos | null;
  /** La raíz de la web, para pedir los ficheros. */
  readonly base?: string;
  /**
   * Cómo se lee un `.glb`: con `GLTFLoader` y plazo, salvo en las pruebas, que
   * lo leen de la memoria sin red. `null` si no llega.
   */
  readonly leer?: (url: string) => Promise<Object3D | null>;
  /**
   * Lo que hay que hacer con el modelo montado antes de colgarlo de la escena:
   * en el juego, compilar sus programas de sombreado sin parar el dibujo. Ver
   * `bajar`.
   */
  readonly preparar?: (modelo: Object3D) => Promise<unknown>;
}

/** La lectura de siempre: por la red, con plazo, y `null` si no llega. */
async function leerPorLaRed(url: string, nombre: string): Promise<Object3D | null> {
  const gltf = await conPlazo(new GLTFLoader().loadAsync(url), PLAZO_DE_IMAGEN, nombre).catch(
    () => null,
  );
  return gltf?.scene ?? null;
}

export class SitiosConModelo {
  /** Lo que se cuelga de la escena: los modelos puestos y nada más. */
  readonly grupo = new Group();
  private readonly sitios: EnElMundo[] = [];
  private reloj = 0;
  private bajando = false;
  /**
   * El material con el que se compiló, en vacío, el sombreado que llevan
   * todos. Se guarda: la tarjeta suelta un programa cuando se suelta el último
   * material que lo usa. Ver `calentar`.
   */
  private calentado: MeshLambertMaterial | null = null;

  constructor(
    private readonly mundo: DelMundo,
    catalogo: readonly FichaDeSitio[] = SITIOS,
  ) {
    this.grupo.name = "sitios-con-modelo";
    for (const f of catalogo) this.anadir(f);
  }

  /**
   * Mete un sitio en la lista, si cae cerca de casa. `url` es para los bancos,
   * que prueban un modelo que todavía no está en `public/assets/sitios/`.
   */
  anadir(ficha: FichaDeSitio, url?: string): void {
    const p = dondeSeDibuja(ficha, this.mundo.casa, this.mundo.vecinos);
    if (Math.hypot(p.x, p.z) > HASTA) return;
    const base = this.mundo.base ?? import.meta.env.BASE_URL ?? "/";
    this.sitios.push({
      ficha,
      url: url ?? `${base}${base.endsWith("/") ? "" : "/"}assets/sitios/${ficha.id}.glb`,
      x: p.x,
      z: p.z,
      estado: "fuera",
      modelo: null,
      apuntado: false,
    });
    // Sin esperar al medio segundo: un sitio añadido encima del avión se pide ya.
    this.reloj = CADA;
    this.calentar();
  }

  /**
   * **El sombreado de los sitios, compilado antes de que haga falta.**
   *
   * Todos los sitios llevan el mismo material —Lambert con el color en los
   * vértices—, así que todos usan el mismo programa de la tarjeta, y el primero
   * que se pone en el vuelo es el que paga compilarlo. Medido en Los Rodeos con
   * la CPU de la tablet, poniendo cuatro sitios de veinte mil triángulos: el
   * cuadro más largo de la carga era de 210 a 280 ms, frente a los 70–100 que
   * ya tiene el mundo al moverse. Compilado aquí, con un triángulo que no se
   * dibuja nunca, en cuanto hay un sitio en la lista —al arrancar, lejos
   * todavía, sin nadie mirando—, el más largo se queda en 88–100 ms: lo del
   * mundo. Ver `medir-mundo.mjs --sitio`.
   */
  private calentar(): void {
    if (this.calentado || !this.mundo.preparar) return;
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
    g.setAttribute("normal", new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(9), 3));
    this.calentado = new MeshLambertMaterial({ vertexColors: true });
    void this.mundo
      .preparar(new Mesh(g, this.calentado))
      .catch(() => undefined)
      .finally(() => g.dispose());
  }

  /** Mira, cada medio segundo, qué hay que bajar y qué soltar. */
  paso(dt: number, x: number, z: number): void {
    this.reloj += dt;
    if (this.reloj < CADA) return;
    this.reloj = 0;
    let siguiente: EnElMundo | null = null;
    let masCerca = Infinity;
    for (const s of this.sitios) {
      const d = Math.hypot(s.x - x, s.z - z);
      const toca = queToca(s.estado, d, s.ficha.alcance);
      if (toca === "soltar") this.soltar(s);
      else if (toca === "bajar" && d < masCerca) {
        siguiente = s;
        masCerca = d;
      }
    }
    if (siguiente && !this.bajando) void this.bajar(siguiente);
  }

  /** Cómo está cada uno, para los bancos. */
  estado(): { id: string; estado: EstadoDeSitio; x: number; z: number; triangulos: number }[] {
    return this.sitios.map((s) => ({
      id: s.ficha.id,
      estado: s.estado,
      x: s.x,
      z: s.z,
      triangulos: s.modelo ? triangulosDe(s.modelo) : 0,
    }));
  }

  /** Lo suelta todo: al cambiar de vuelo o al cerrar. */
  soltarTodo(): void {
    for (const s of this.sitios) this.soltar(s);
    this.calentado?.dispose();
    this.calentado = null;
  }

  private async bajar(s: EnElMundo): Promise<void> {
    this.bajando = true;
    s.estado = "bajando";
    try {
      const escena = await (this.mundo.leer
        ? this.mundo.leer(s.url).catch(() => null)
        : leerPorLaRed(s.url, `el sitio ${s.ficha.id}`));
      // Si mientras bajaba se soltó, se tira lo que llegó.
      if (s.estado !== "bajando") {
        if (escena) tirar(escena);
        return;
      }
      if (!escena) {
        s.estado = "roto";
        // eslint-disable-next-line no-console
        console.warn(`[óga veve] el modelo de ${s.ficha.nombre} no llegó: se vuela sin él`);
        return;
      }
      /*
       * **Y se cuelga cuando ya se puede dibujar sin tirón.** Medido en Los
       * Rodeos con la CPU de la tablet: colgar cuatro sitios recién leídos
       * daba cuadros de doscientos a cuatrocientos milisegundos, porque el
       * primer dibujo compila sus programas y espera a que la tarjeta los
       * enlace. Montado aparte, con un cuadro de respiro entre leer y montar,
       * y compilado sin esperar, el primer dibujo ya los encuentra hechos. Lo
       * que quedaba del tirón era la primera compilación: ver `calentar`.
       */
      await unCuadro();
      const { modelo, bultos } = this.montar(s, escena);
      if (!s.apuntado) this.apuntarBultos(bultos);
      s.apuntado = true;
      for (const b of bultos) tirar(b);
      if (this.mundo.preparar) await this.mundo.preparar(modelo).catch(() => undefined);
      // Si mientras se preparaba se soltó, se tira.
      if (s.estado !== "bajando") {
        tirar(modelo);
        return;
      }
      s.modelo = modelo;
      this.grupo.add(modelo);
      s.estado = "puesto";
    } finally {
      this.bajando = false;
      // Si hay otro esperando, que no espere al medio segundo siguiente.
      this.reloj = CADA;
    }
  }

  /**
   * Lo pone en su sitio y con sus materiales del juego.
   *
   * **Lambert y no el material físico** del `.glb`: el color ya viene en los
   * vértices con la sombra cocida, y lo que le falta —el sol de la hora— lo
   * da Lambert igual que al suelo y a la granja, por bastante menos en la
   * tablet. Y cada geometría, partida en lados de doscientos cincuenta metros
   * como mucho, para que se curve con la Tierra igual que el suelo de debajo:
   * una presa de ocho kilómetros en dos triángulos se separaría del relieve.
   * Ver `partirLoLargo`.
   */
  private montar(s: EnElMundo, raiz: Object3D): { modelo: Object3D; bultos: Mesh[] } {
    const cota = s.ficha.cota ?? this.mundo.suelo(s.x, s.z);
    const modelo = new Group();
    modelo.name = `sitio:${s.ficha.id}`;
    modelo.position.set(s.x, cota, s.z);
    modelo.rotation.y = giroDelModelo(s.ficha.giro * RAD);
    modelo.add(raiz);
    const bultos: Mesh[] = [];
    raiz.traverse((o) => {
      const malla = o as Mesh;
      if (!malla.isMesh) return;
      if (esBulto(o)) {
        bultos.push(malla);
        return;
      }
      const antes = malla.geometry;
      malla.geometry = partirLoLargo(antes);
      if (malla.geometry !== antes) antes.dispose();
      malla.material = aLambert(malla.material, malla.geometry);
    });
    // Las matrices, una vez y quietas: un sitio no se mueve.
    modelo.updateMatrixWorld(true);
    modelo.traverse((o) => {
      o.matrixAutoUpdate = false;
    });
    // Los bultos, fuera de lo que se dibuja: con su matriz ya calculada.
    for (const b of bultos) b.removeFromParent();
    return { modelo, bultos };
  }

  /**
   * Las cajas de choque, al índice: su planta girada —las cuatro esquinas de
   * su base, no la caja recta que la envuelve, que con el sitio girado sería
   * mayor que el bulto— y su alto.
   */
  private apuntarBultos(bultos: readonly Mesh[]): void {
    const indice = this.mundo.bultos;
    if (!indice) return;
    for (const b of bultos) {
      b.geometry.computeBoundingBox();
      const caja = b.geometry.boundingBox!;
      const planta = [
        [caja.min.x, caja.min.z],
        [caja.max.x, caja.min.z],
        [caja.max.x, caja.max.z],
        [caja.min.x, caja.max.z],
      ].map(([px, pz]) => {
        const e = new Vector3(px, caja.min.y, pz).applyMatrix4(b.matrixWorld);
        return [e.x, e.z] as const;
      });
      const enElMundo = new Box3().copy(caja).applyMatrix4(b.matrixWorld);
      indice.anadir(
        (enElMundo.min.x + enElMundo.max.x) / 2,
        (enElMundo.min.z + enElMundo.max.z) / 2,
        (enElMundo.max.x - enElMundo.min.x) / 2,
        (enElMundo.max.z - enElMundo.min.z) / 2,
        enElMundo.min.y,
        enElMundo.max.y,
        planta,
      );
    }
  }

  private soltar(s: EnElMundo): void {
    if (s.modelo) {
      tirar(s.modelo);
      s.modelo = null;
    }
    // Uno que se estaba bajando se queda «fuera»: lo tira `bajar` cuando llegue.
    if (s.estado === "puesto" || s.estado === "bajando") s.estado = "fuera";
  }
}

/** Espera al siguiente cuadro, o a nada si no hay quien los dibuje (las pruebas). */
const unCuadro = (): Promise<void> =>
  new Promise((listo) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => listo()) : listo(),
  );

const materialesDe = (m: Mesh): Material[] =>
  Array.isArray(m.material) ? m.material : [m.material];

/** Pasa el material del `.glb` al del juego. Ver `montar`. */
function aLambert(
  material: Material | Material[],
  geometria: BufferGeometry,
): MeshLambertMaterial | MeshLambertMaterial[] {
  const uno = (m: Material): MeshLambertMaterial => {
    const de = m as Material & { color?: { getHex(): number }; map?: Texture | null };
    const nuevo = new MeshLambertMaterial({
      name: m.name,
      color: de.color?.getHex() ?? 0xffffff,
      map: de.map ?? null,
      vertexColors: geometria.getAttribute("color") !== undefined,
      side: m.side,
      transparent: m.transparent,
      opacity: m.opacity,
      alphaTest: m.alphaTest,
    });
    // La textura pasa al nuevo: se suelta el viejo sin ella.
    if (de.map) de.map = null;
    m.dispose();
    return nuevo;
  };
  return Array.isArray(material) ? material.map(uno) : uno(material);
}

/** Lo quita de la escena y suelta de la tarjeta todo lo que lleve. */
function tirar(raiz: Object3D): void {
  raiz.removeFromParent();
  raiz.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.isMesh) return;
    malla.geometry.dispose();
    for (const m of materialesDe(malla)) {
      const conMapa = m as Material & { map?: Texture | null };
      conMapa.map?.dispose();
      m.dispose();
    }
  });
}

function triangulosDe(raiz: Object3D): number {
  let n = 0;
  raiz.traverse((o) => {
    const g = (o as Mesh).isMesh ? (o as Mesh).geometry : null;
    if (!g) return;
    n += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  });
  return n;
}
