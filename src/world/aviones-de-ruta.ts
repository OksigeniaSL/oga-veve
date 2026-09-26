/**
 * Los aviones de la ruta, **dibujados**.
 *
 * La lógica de quién anda por ahí y a qué altura está en
 * `flight/trafico-en-ruta.ts`, que no sabe de three.js y por eso se puede
 * probar sin abrir un navegador. Esto es solo el cuerpo: una malla por avión,
 * puesta donde diga aquél.
 *
 * ## Una geometría para todos
 *
 * Son cuatro y están a kilómetros. Fabricar un avión entero por cada uno sería
 * pagar un tirón de fotogramas por algo que se ve del tamaño de una uña — es
 * la misma decisión que ya tomó el tráfico del circuito, y por el mismo
 * motivo.
 *
 * ## Y se esconden en vez de borrarse
 *
 * Los que quedan demasiado lejos no se destruyen: se apagan. Crear y destruir
 * mallas en pleno vuelo es la forma más fácil de que el juego dé un tirón cada
 * vez que aparece alguien, y aquí aparece alguien cada pocos minutos.
 */

import { Group, Mesh, MeshLambertMaterial, type BufferGeometry } from "three";
import { fabricarAeronave } from "./fabrica-de-aeronaves";
import type { Silueta } from "../flight/flota";
import {
  traficoEnRuta,
  type EnRuta,
  type Punto,
} from "../flight/trafico-en-ruta";
import { giroDelModelo } from "./rumbo";

/**
 * Hasta dónde se dibujan, en metros.
 *
 * Treinta kilómetros. Más allá un avión de cuarenta metros mide menos de un
 * píxel: se sigue viendo en la carta, que es donde de verdad se mira a esa
 * distancia, y en el mundo no se pinta.
 */
export const SE_VEN_HASTA = 30000;

export interface AvionesDeRuta {
  readonly grupo: Group;
  /** Un paso: `ahora` es el reloj del vuelo, en segundos. */
  paso(ahora: number, yo: Punto): void;
  /** Dónde están todos, para la carta. Ver `ui/carta.ts`. */
  quienes(): readonly EnRuta[];
  /**
   * Cambia el corredor: de qué campo a qué campo va la ruta de hoy.
   *
   * Se fijaba una vez al cargar, entre casa y el **primer** destino de la
   * lista, así que volando de Gran Canaria a Lanzarote todo el tráfico iba
   * por el corredor de Los Rodeos, a decenas de kilómetros, y no se cruzaba
   * a nadie: se perdía la lección de la regla semicircular justo en la ruta
   * elegida. Ahora lo pone quien sabe de dónde se sale y a dónde se va.
   */
  ponerCorredor(desde: Punto, hasta: Punto): void;
  dispose(): void;
}

/**
 * Cuánto mide cada uno, para que no sean todos el mismo avión de otro color.
 *
 * Un turbohélice regional tiene veintisiete metros de envergadura y un
 * fuselaje ancho sesenta: verlos del mismo tamaño a la misma distancia
 * deshace la mitad de lo que enseña tener cuatro siluetas. Son los números
 * redondos de aparatos de verdad.
 */
const ENVERGADURA: Partial<Record<Silueta, number>> = {
  "bimotor-ala-baja": 27,
  reactor: 34,
  "cola-en-t": 17,
  cuatrimotor: 60,
};

export function crearAvionesDeRuta(
  desde: Punto,
  hasta: Punto,
  semilla = 1,
): AvionesDeRuta {
  const grupo = new Group();
  grupo.name = "aviones-de-ruta";
  /*
   * Una geometría **por silueta**, no una por avión: son cuatro siluetas como
   * mucho y varios aviones pueden compartir la misma. Fabricar un avión entero
   * por cada uno sigue siendo lo que no se hace.
   */
  const geometrias = new Map<Silueta, BufferGeometry>();
  const cuerpos = new Map<string, Mesh>();
  let ultimos: readonly EnRuta[] = [];

  const cuerpo = (silueta: Silueta): Mesh => {
    let geo = geometrias.get(silueta);
    if (!geo) {
      geo = fabricarAeronave(
        silueta,
        {
          envergadura: ENVERGADURA[silueta] ?? 28,
          cuerda: 3.2,
          tren: 1.6,
        },
        { body: 0xe7e3d8, accent: 0x8f99a2, trim: 0x39403a },
      ).geometria;
      geometrias.set(silueta, geo);
    }
    return new Mesh(geo, new MeshLambertMaterial({ vertexColors: true }));
  };

  let de = desde;
  let hacia = hasta;
  return {
    grupo,
    paso(ahora, yo) {
      ultimos = traficoEnRuta(de, hacia, ahora, semilla);
      /*
       * Los que ya no están en la lista —el corredor cambió— se apagan: sus
       * mallas se quedan para quien vuelva a salir, pero no se dejan flotando
       * donde estaban.
       */
      const siguen = new Set(ultimos.map((u) => u.id));
      for (const [id, m] of cuerpos) if (!siguen.has(id)) m.visible = false;
      for (const a of ultimos) {
        let malla = cuerpos.get(a.id);
        if (!malla) {
          malla = cuerpo(a.silueta);
          cuerpos.set(a.id, malla);
          grupo.add(malla);
        }
        const lejos = Math.hypot(a.x - yo.x, a.z - yo.z) > SE_VEN_HASTA;
        malla.visible = !lejos;
        if (lejos) continue;
        malla.position.set(a.x, a.y, a.z);
        // El rumbo de compás al giro de la malla, con la conversión de siempre
        // en un solo sitio. Ver `giroDelModelo`.
        malla.rotation.y = (giroDelModelo(a.rumbo) * Math.PI) / 180;
      }
    },
    quienes: () => ultimos,
    ponerCorredor(otroDesde, otroHasta) {
      de = otroDesde;
      hacia = otroHasta;
    },
    dispose() {
      for (const g of geometrias.values()) g.dispose();
      geometrias.clear();
      for (const m of cuerpos.values()) {
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      }
      cuerpos.clear();
      grupo.clear();
    },
  };
}
