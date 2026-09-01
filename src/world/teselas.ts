/**
 * El mundo de verdad: fotogrametría de Google debajo del vuelo.
 *
 * Esto es lo que saca al juego del mundo de cubos. Lo probado en `spike/` y
 * decidido en el ADR 0006, enchufado al juego.
 *
 * ## El mundo no se mueve: se copia
 *
 * Hubo una versión que bajaba las teselas un desfase medido para casarlas con
 * nuestro mapa de alturas de Copernicus. Funcionaba en el aire y fallaba en el
 * suelo, porque **nuestro aeropuerto es una meseta aplanada y el de verdad
 * tiene pendiente**: un solo número casa los dos en el centro de la pista y
 * entierra el avión cinco metros y medio en la plataforma.
 *
 * El arreglo fue moldear nuestro suelo con el de la foto. Y entonces las dos
 * correcciones se pelearon: el desfase mueve el mundo, el moldeado mueve
 * nuestro suelo, y cada una invalida la medida de la otra. Salió flotando
 * setenta y tres metros.
 *
 * Así que **el desfase se ha quitado del todo**. Las teselas van donde van, y
 * `Terrain` copia sus alturas alrededor del aeródromo. Nuestro suelo pasa a
 * ser el suyo, sin reconciliación de datums, porque adoptar su datum es más
 * barato que traducirlo. Dos cosas que hacían lo mismo eran una de más.
 *
 * Lo que sigue midiéndose aquí es solo **cuándo hay mundo suficiente para
 * copiarlo**, y para eso vale la misma cuenta.
 *
 * ## Cuándo se da por asentado
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

/**
 * Cuántos segundos tiene que estar la medida quieta antes de creérsela.
 *
 * No es un margen de seguridad: es el tiempo que tardan en llegar las teselas
 * finas. Con menos, se mide sobre el planeta a brochazos.
 */
const ESPERA_A_LA_VERDAD = 3;

export interface Teselas {
  readonly grupo: Group;
  /** Se llama cada fotograma. Decide qué teselas hacen falta y las pide. */
  update(camara: PerspectiveCamera, renderizador: WebGLRenderer, dt: number): void;
  /** Si ya se ha posado sobre nuestro suelo. Hasta entonces, no se enseña. */
  readonly asentado: boolean;
  /** El desfase medido, en metros. `null` mientras no se haya podido medir. */
  readonly desfase: number | null;
  /** Cuántas teselas se ven ahora mismo. Para las comprobaciones. */
  readonly visibles: number;
  /**
   * La altura del mundo fotografiado en un punto, o `null` si no llega el rayo.
   *
   * Sirve para preguntarle a la foto qué hay en un sitio. Es caro —un rayo
   * contra un cuarto de millón de triángulos— así que se usa a puñados y en
   * momentos concretos, nunca por fotograma.
   */
  alturaEn(x: number, z: number): number | null;
  /**
   * ¿Está libre ese trozo de plataforma, o hay algo aparcado encima?
   *
   * En la fotogrametría están congelados los aviones que había el día que
   * Google voló. El puesto que elige el juego en Tenerife tiene encima un
   * Boeing, y el nuestro aparecía dentro: «me comió un 737-800».
   *
   * No hay dato que consultar —la foto es una malla, no una lista de aviones—
   * pero sí se puede **medir el bulto**: si el centro del puesto está varios
   * metros por encima del asfalto de alrededor, ahí hay algo. Un avión de línea
   * son diez metros de fuselaje; el ruido de la fotogrametría, medio.
   */
  libre(x: number, z: number): boolean;
  dispose(): void;
}

/**
 * Monta el mundo de verdad para un escenario, o `null` si no se puede.
 *
 * Hace falta clave y un aeródromo con coordenadas: sin sitio en el planeta no
 * hay nada que pedirle a Google.
 */
export function crearTeselas(
  escenario: Scenario,
  clave: string | null,
  /**
   * La cota de **nuestro** suelo. Es contra esto contra lo que se compara.
   *
   * Y es una función, no un número del fichero. El primer intento comparaba
   * contra `elevationM` —lo que dice OurAirports— y nuestro terreno aplanado
   * está trece metros por debajo de eso en Tenerife: el mundo quedaba trece
   * metros alto y el avión aparecía **dentro** del suelo de la fotografía,
   * viendo el domo del cielo por debajo del horizonte.
   *
   * Es exactamente el error que este proyecto lleva toda la semana cazando:
   * fiarse del dato en vez de medir lo que hay.
   */
  cotaNuestra: (x: number, z: number) => number,
): Teselas | null {
  const aero = escenario.aerodrome;
  if (!clave || !aero) return null;

  const grupo = new Group();
  grupo.name = 'mundo-real';
  // Hasta que no se ha medido el desfase no se enseña: aparecer cuarenta metros
  // desplazado y luego dar un salto es peor que tardar un segundo más.
  grupo.visible = false;

  const teselas = new TilesRenderer();
  teselas.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: clave }));
  /*
   * **Cuánto detalle se pide**, en píxeles de error admitido.
   *
   * Es el número que decide si la fotografía se ve nítida o pastosa. De fábrica
   * viene en seis, que a trescientos metros de altura está bien y a ras de suelo
   * convierte el asfalto en una acuarela: «esa mezcla entre realidad y
   * fotografía borrosa parece el holocausto zombie».
   *
   * En dos se piden teselas de un nivel más fino. Cuesta memoria y descargas, no
   * fotogramas —el detalle que no se ve no se dibuja—, y es la diferencia entre
   * rodar sobre una foto y rodar sobre una mancha.
   *
   * Lo que **no** arregla, y conviene saberlo: la fotogrametría aérea se toma
   * desde un avión, así que a la altura de los ojos no hay más detalle que
   * pedir. Nítida sí; con la nariz pegada al suelo, siempre va a ser una foto
   * vista muy de cerca.
   */
  teselas.errorTarget = 2;
  /*
   * La matriz se pone a mano y **el desfase se compone dentro de ella**.
   *
   * El primer intento bajaba el mundo con `group.position.y`, y este grupo tiene
   * `matrixAutoUpdate = false` porque su matriz la ponemos nosotros: tocar la
   * posición no hace absolutamente nada. Se veía a doscientos metros de altura
   * —donde treinta y cuatro metros de error no se notan— y se caía al llegar al
   * puesto de estacionamiento: el avión quedaba **dentro** del terreno y lo que
   * se veía era el domo del cielo por debajo del horizonte.
   */
  const aLoNuestro = matrizDelMundo(aero.origin.lat, aero.origin.lon);
  teselas.group.matrixAutoUpdate = false;
  teselas.group.matrix.copy(aLoNuestro);
  teselas.group.matrixWorldNeedsUpdate = true;
  grupo.add(teselas.group);

  const rayo = new Raycaster();
  const catas = puntosDeCata(escenario);
  // Solo para saber desde dónde tirar el rayo y qué cotas son plausibles.
  const referencia = aero.elevationM ?? 0;

  let asentado = false;
  let desfase: number | null = null;
  let anterior: number | null = null;
  /** Cuánto tiempo lleva la medida sin moverse. Ver abajo. */
  let quieta = 0;

  /** Cuánto está el mundo por encima del nuestro en un punto, o `null`. */
  const diferenciaEn = (x: number, z: number): number | null => {
    rayo.set(new Vector3(x, referencia + 9000, z), new Vector3(0, -1, 0));
    const golpes = rayo.intersectObject(teselas.group, true);
    if (!golpes.length) return null;
    const suyo = golpes[0]!.point.y;
    if (Math.abs(suyo - referencia) > MARGEN_PLAUSIBLE) return null;
    return suyo - cotaNuestra(x, z);
  };

  /**
   * La mediana de las diferencias, o `null` si **falta alguna cata**.
   *
   * Se exigen las siete, no cuatro de siete. El primer criterio era «espera a
   * que el cargador se calle», y eso dejó de valer al pedir teselas más finas:
   * con el detalle alto **el cargador no se calla nunca** —siempre hay algo más
   * fino que traer— así que el desfase no se aplicaba jamás y el avión se
   * quedaba diecinueve metros bajo tierra.
   *
   * Exigir las siete catas es mejor criterio y no depende de nadie: si las
   * siete golpean, es que hay teselas cargadas en toda la pista. Y encima se
   * pide que dos medidas seguidas coincidan, que descarta el instante en que
   * acaba de llegar una tesela basta.
   */
  const medir = (): number | null => {
    const valores = catas
      .map(([x, z]) => diferenciaEn(x, z))
      .filter((c): c is number => c !== null);
    if (valores.length < catas.length) return null;
    valores.sort((a, b) => a - b);

    /*
     * **Y las siete tienen que parecerse entre ellas.**
     *
     * Este es el criterio que faltaba, y su ausencia costó media noche. Los
     * anteriores comprobaban que la medida fuera **estable** —dos lecturas
     * seguidas iguales— y una tesela basta, de esas que cubren medio país con
     * cuatro triángulos, es **estabilísima**: se mide dos veces, sale lo mismo,
     * y el juego se cree un desfase de setenta y cinco metros donde son trece.
     *
     * Estable no es correcto. Lo correcto se comprueba con algo que sepamos del
     * mundo, y sabemos esto: **una pista de aterrizaje es plana.** Si las siete
     * catas repartidas por ella difieren más de veinticinco metros entre sí, lo
     * que hay debajo no es una pista — es una tesela sin terminar de cargar.
     */
    const rango = valores[valores.length - 1]! - valores[0]!;
    if (rango > 25) return null;

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
    alturaEn(x: number, z: number) {
      rayo.set(new Vector3(x, referencia + 9000, z), new Vector3(0, -1, 0));
      const golpes = rayo.intersectObject(teselas.group, true);
      if (!golpes.length) return null;
      const y = golpes[0]!.point.y;
      return Math.abs(y - referencia) < MARGEN_PLAUSIBLE ? y : null;
    },
    libre(x: number, z: number) {
      const centro = this.alturaEn(x, z);
      if (centro === null) return true;
      /*
       * Doce catas en corro a **setenta** metros, y se compara con la más baja.
       *
       * Con cuarenta el corro seguía encima del avión —un 737 tiene treinta y
       * seis metros de envergadura— y la mediana salía a la altura del ala: el
       * puesto parecía libre y el nuestro aparecía dentro igual.
       *
       * Y con la más baja del corro, no con la mediana: lo más bajo de una
       * plataforma **es la plataforma**. La mediana se contamina en cuanto la
       * mitad del corro cae sobre el avión de al lado, que en una terminal es lo
       * normal.
       */
      const alrededor: number[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const h = this.alturaEn(x + Math.sin(a) * 70, z + Math.cos(a) * 70);
        if (h !== null) alrededor.push(h);
      }
      if (alrededor.length < 6) return true;
      alrededor.sort((p, q) => p - q);
      const suelo = alrededor[1]!;
      return centro - suelo < 3;
    },
    get visibles() {
      return (teselas as unknown as ConEstadisticas).stats?.visible ?? 0;
    },
    update(camara: PerspectiveCamera, renderizador: WebGLRenderer, dt: number) {
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

      /*
       * **Y hay que darle tiempo a que llegue la verdad.**
       *
       * Este es el fallo que costó la noche, y los tres intentos anteriores
       * fallaron por lo mismo sin que se viera. El criterio era «dos medidas
       * seguidas iguales», y una tesela basta —de las que cubren medio país con
       * cuatro triángulos— da la misma medida mil veces seguidas: es
       * **estabilísima**. Se medía a los dos fotogramas de abrir el juego,
       * cuando lo único cargado es el planeta a brochazos, y el desfase salía
       * de setenta y cinco metros donde son trece.
       *
       * Estable no es correcto. Y comprobar que la pista sale plana tampoco
       * vale, porque un triángulo del tamaño de un país **también es plano**.
       *
       * Lo que hace falta es esperar: las teselas finas llegan unos segundos
       * después y cambian la respuesta. Tres segundos sin que la medida se
       * mueva medio metro es que ya ha llegado lo que tenía que llegar.
       */
      const cota = medir();
      if (cota !== null && anterior !== null && Math.abs(cota - anterior) < 0.5) {
        quieta += dt;
        if (quieta >= ESPERA_A_LA_VERDAD) {
          desfase = cota;
          grupo.visible = true;
          asentado = true;
        }
      } else {
        quieta = 0;
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
