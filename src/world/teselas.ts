/**
 * El mundo de verdad: fotogrametría de Google debajo del vuelo.
 *
 * Esto es lo que saca al juego del mundo de cubos. Lo probado en `spike/` y
 * decidido en el ADR 0006, enchufado al juego.
 *
 * ## Lo que **no** hace, que es la mitad del diseño
 *
 * **No toca la física.** El suelo con el que choca el avión sigue siendo el
 * mapa de alturas de Copernicus que ya había: `Terrain.sampleHeight` se llama
 * doscientas cuarenta veces por segundo y lanzar un rayo contra un cuarto de
 * millón de triángulos en cada llamada es impensable.
 *
 * Y no hace falta, porque **la prueba midió que la diferencia entre los dos
 * suelos es constante**: cuarenta y siete metros y medio en una cabecera de
 * Tenerife y cuarenta y nueve y tres en la otra, que es la separación entre el
 * geoide —donde vive Copernicus— y el elipsoide —donde vive Google—. Si la
 * diferencia es constante, casarlos es restar.
 *
 * Así que las teselas se bajan ese desfase y quedan encima del mismo suelo con
 * el que choca el avión. Lo que se ve y lo que se toca coinciden sin que el
 * modelo de vuelo se entere de nada.
 *
 * ## Y el desfase se mide, no se calcula
 *
 * Siete rayos repartidos por la pista, y la mediana. Sobre la pista no hay
 * edificios por definición —el primer intento medía en el punto de referencia
 * del aeródromo, que en Tenerife cae junto a la terminal, y le medía el tejado—
 * y la mediana aguanta que una o dos catas caigan en un avión aparcado.
 *
 * Se espera a que el cargador se calle y a que dos medidas seguidas coincidan
 * en menos de un metro: las teselas de detalle medio están hasta cuarenta
 * metros por encima de las finas, y posando a la primera el aeropuerto se
 * quedaba flotando.
 *
 * ## Si no hay clave o no hay red
 *
 * No pasa nada: se devuelve `null` y el juego pinta su mundo de polígonos, que
 * es el de siempre. **Volar no puede depender de que haya red**, y quien juega
 * en un colegio con la conexión caída tiene que poder despegar igual.
 */

import {
  Group,
  MathUtils,
  Matrix4,
  Raycaster,
  Vector3,
  type PerspectiveCamera,
  type WebGLRenderer,
} from 'three';
import { TilesRenderer, WGS84_ELLIPSOID } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/core/plugins';
import type { Scenario } from './scenarios';

/**
 * Lo que el renderizador expone en marcha pero no en sus tipos.
 *
 * `stats` existe desde siempre y es la única forma de saber si el cargador ha
 * terminado; sencillamente no está en el `.d.ts` de la versión 0.5.2. Se
 * declara aquí, acotado y con nombre, en vez de repartir `as any` por el
 * fichero — así, el día que lo tipen, esto deja de hacer falta y se ve dónde
 * estaba.
 */
interface ConEstadisticas {
  readonly stats?: {
    readonly visible?: number;
    readonly active?: number;
    readonly downloading?: number;
    readonly parsing?: number;
    readonly queued?: number;
  };
}

/** Cuántas catas se hacen sobre la pista para medir el desfase. */
const CATAS = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];

/**
 * Lo más lejos que puede estar la cota de Google de la nuestra para creérsela.
 *
 * La separación entre el geoide y el elipsoide no pasa de ciento diez metros en
 * ningún sitio del planeta. Cualquier cosa por encima de cuatrocientos no es el
 * suelo: es una tesela continental sin terminar de cargar, de esas que cubren
 * medio Atlántico con un triángulo.
 */
const MARGEN_PLAUSIBLE = 400;

export interface Teselas {
  readonly grupo: Group;
  /** Se llama cada fotograma. Decide qué teselas hacen falta y las pide. */
  update(camara: PerspectiveCamera, renderizador: WebGLRenderer): void;
  /** Si ya se ha posado sobre nuestro suelo. Hasta entonces, no se enseña. */
  readonly asentado: boolean;
  /** El desfase medido, en metros. `null` mientras no se haya podido medir. */
  readonly desfase: number | null;
  /** Cuántas teselas se ven ahora mismo. Para las comprobaciones. */
  readonly visibles: number;
  dispose(): void;
}

/**
 * Monta el mundo de verdad para un escenario, o `null` si no se puede.
 *
 * Hace falta clave y un aeródromo con coordenadas: sin sitio en el planeta no
 * hay nada que pedirle a Google.
 */
export function crearTeselas(escenario: Scenario, clave: string | null): Teselas | null {
  const aero = escenario.aerodrome;
  if (!clave || !aero) return null;

  const grupo = new Group();
  grupo.name = 'mundo-real';
  // Hasta que no se ha medido el desfase no se enseña: aparecer cuarenta metros
  // desplazado y luego dar un salto es peor que tardar un segundo más.
  grupo.visible = false;

  const teselas = new TilesRenderer();
  teselas.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: clave }));
  teselas.group.matrixAutoUpdate = false;
  teselas.group.matrix.copy(matrizDelMundo(aero.origin.lat, aero.origin.lon));
  grupo.add(teselas.group);

  const rayo = new Raycaster();
  const catas = puntosDeCata(escenario);
  const nuestraCota = cotaNuestraEnLaPista(escenario);

  let asentado = false;
  let desfase: number | null = null;
  let anterior: number | null = null;

  /** La cota que da el mundo bajo un punto local, o `null` si aún no llega. */
  const cotaDelMundo = (x: number, z: number): number | null => {
    rayo.set(new Vector3(x, nuestraCota + 9000, z), new Vector3(0, -1, 0));
    const golpes = rayo.intersectObject(teselas.group, true);
    if (!golpes.length) return null;
    const y = golpes[0]!.point.y;
    return Math.abs(y - nuestraCota) < MARGEN_PLAUSIBLE ? y : null;
  };

  /** La mediana de las catas, o `null` si no hay suficientes. */
  const medir = (): number | null => {
    const valores = catas
      .map(([x, z]) => cotaDelMundo(x, z))
      .filter((c): c is number => c !== null);
    if (valores.length < 4) return null;
    valores.sort((a, b) => a - b);
    return valores[Math.floor(valores.length / 2)]!;
  };

  return {
    grupo,
    get asentado() {
      return asentado;
    },
    get desfase() {
      return desfase;
    },
    get visibles() {
      return (teselas as unknown as ConEstadisticas).stats?.visible ?? 0;
    },
    update(camara: PerspectiveCamera, renderizador: WebGLRenderer) {
      teselas.setCamera(camara);
      /*
       * **Y la resolución de la pantalla**, que es de donde sale el error con el
       * que se decide qué detalle hace falta. Sin esto el cargador no tiene con
       * qué comparar y se queda en la tesela raíz: el juego enseñaba **una**
       * tesela del planeta entero y nunca pasaba de ahí.
       */
      teselas.setResolutionFromRenderer(camara, renderizador);
      teselas.update();

      if (asentado) return;
      const s = (teselas as unknown as ConEstadisticas).stats;
      // Se mide con el cargador callado. Ver la cabecera de este fichero.
      if ((s?.downloading ?? 1) !== 0 || (s?.parsing ?? 1) !== 0 || (s?.queued ?? 1) !== 0)
        return;

      const cota = medir();
      if (cota !== null && anterior !== null && Math.abs(cota - anterior) < 1) {
        desfase = cota - nuestraCota;
        // Se baja el mundo ese desfase: así el suelo que se ve y el suelo con
        // el que choca el avión son el mismo.
        teselas.group.position.y = -desfase;
        grupo.visible = true;
        asentado = true;
      }
      anterior = cota;
    },
    dispose() {
      teselas.dispose();
    },
  };
}

/**
 * La matriz que trae el mundo de Google a nuestras coordenadas.
 *
 * Las teselas vienen en coordenadas de la Tierra —centro del planeta en el
 * origen— y el juego vive en metros locales con el aeródromo en el cero y el
 * norte en la Z negativa. Se podría llevar el juego a su sistema, y eso
 * obligaría a tocar el modelo de vuelo, la cámara, el plan, el HUD y las
 * catorce fases. O se puede llevarlas a ellas al nuestro, que es esto.
 *
 * Aplanar la Tierra en el trozo que ocupa un aeropuerto cuesta veinte
 * centímetros en las puntas de una pista de tres kilómetros: menos que el
 * margen con el que ya se pintan las marcas.
 */
function matrizDelMundo(lat: number, lon: number): Matrix4 {
  const la = MathUtils.degToRad(lat);
  const lo = MathUtils.degToRad(lon);

  const origen = new Vector3();
  WGS84_ELLIPSOID.getCartographicToPosition(la, lo, 0, origen);

  const arriba = new Vector3(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la));
  const este = new Vector3(-Math.sin(lo), Math.cos(lo), 0);
  const norte = new Vector3().crossVectors(arriba, este).normalize();
  // En el juego el norte es la Z **negativa**, así que la Z local es el sur.
  const sur = norte.clone().negate();

  return new Matrix4().makeBasis(este, arriba, sur).setPosition(origen).invert();
}

/** Los siete puntos de cata, repartidos por la pista, en coordenadas de mundo. */
function puntosDeCata(escenario: Scenario): readonly (readonly [number, number])[] {
  const pista = escenario.aerodrome?.runways[0];
  const umbrales = pista
    ? Object.values(pista.thresholds).flatMap((t) => (t?.xy ? [t.xy] : []))
    : [];
  const [a, b] = umbrales;
  if (!a || !b) return [[0, 0]];
  return CATAS.map((t) => {
    const s = 0.5 + t;
    // Del fichero al mundo: la Y del norte es la Z negativa.
    return [a[0] + (b[0] - a[0]) * s, -(a[1] + (b[1] - a[1]) * s)] as const;
  });
}

/**
 * La cota que dice **nuestro** suelo en mitad de la pista.
 *
 * Es contra esto contra lo que se compara. Y es la cota del aeródromo aplanado,
 * no la del fichero: el terreno se aplana al construirlo y lo que importa es
 * dónde acaba estando, no dónde decía OurAirports que estaba.
 */
function cotaNuestraEnLaPista(escenario: Scenario): number {
  return escenario.aerodrome?.elevationM ?? 0;
}
