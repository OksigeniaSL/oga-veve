/**
 * Vegetación: tres siluetas paraguayas, instanciadas.
 *
 * El terreno tenía relieve y color pero estaba vacío, y un paisaje vacío se
 * lee como una manta verde por muy bien iluminado que esté. Lo que da escala
 * y textura a un valle visto desde el aire son los árboles.
 *
 * Tres especies, elegidas porque sus siluetas son inconfundibles desde
 * arriba y porque son las que uno ve de verdad volando sobre Paraguay:
 *
 * - **Lapacho** (tajy): copa redonda y ancha. Entre agosto y septiembre
 *   florece de rosa y tiñe laderas enteras — el mejor cuadro del país, y en
 *   el juego un acontecimiento del calendario.
 * - **Samu'u** (palo borracho): tronco panzudo inconfundible y copa rala.
 * - **Karanda'y**: la palmera del Chaco húmedo, tronco fino y penacho.
 *
 * Cómo es barato: geometría muy pobre —unos treinta triángulos por árbol— y
 * una sola `InstancedMesh` por especie, es decir tres llamadas de dibujo para
 * todo el bosque. Nada de billboards con alfa: aquí no hay postproceso y el
 * sobredibujado transparente es lo que primero tumba los fotogramas en una
 * tablet. Además la geometría plana encaja con la dirección de arte, que no
 * usa una sola textura en todo el juego.
 *
 * Dónde van: la densidad sale de una mancha de ruido de baja frecuencia, así
 * que salen bosques y claros en vez de un espolvoreado uniforme. Se descartan
 * las laderas empinadas, lo sumergido y los alrededores de la pista.
 */

import {
  CylinderGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  OctahedronGeometry,
  Quaternion,
  Vector3,
} from "three";
import { enEjesDePista } from "./rumbo";
import { ValueNoise2D, mulberry32 } from "./noise";
import type { Scenario } from "./scenarios";
import type { Aerodrome, Punto } from "./aerodrome";
import { techoSobreLaPista } from "./superficie-de-aproximacion";

/** Cota del terreno en unas coordenadas de mundo. */
export type GroundSampler = (x: number, z: number) => number;

/**
 * Cuántos candidatos se sortean y cuántos árboles se aceptan como mucho.
 *
 * La primera versión sorteaba catorce mil sobre un escenario de catorce
 * kilómetros de lado y salían treinta árboles por kilómetro cuadrado, que
 * desde el aire es exactamente nada. El área es enorme y sembrar uniforme no
 * llena nada: hay que **agrupar**. Se sortea mucho, se rechaza casi todo
 * fuera de las manchas de bosque, y lo que entra queda apretado donde debe.
 *
 * El techo está medido, no elegido a ojo. Con dieciocho mil, el rasterizador
 * por software pasaba de siete fotogramas por segundo a tres: los árboles se
 * comían más de la mitad del presupuesto de una escena que ya tiene 295 000
 * triángulos de terreno. Con siete mil el coste es asumible, y los bosques
 * lejanos no los dibujan los árboles sino el color de dosel del propio
 * terreno, que es además como se ven de verdad desde tres mil metros.
 */
const CANDIDATES = 90000;
const MAX_TREES = 7000;
/** Pendiente por encima de la cual no agarra nada. */
const MAX_SLOPE = 0.42;

export interface Species {
  name: string;
  trunk: {
    colour: number;
    height: number;
    radiusTop: number;
    radiusBottom: number;
  };
  crown: {
    colour: number;
    radius: number;
    height: number;
    detail: number;
    lift: number;
  };
  /** Peso relativo y franja de altitud preferida, en fracción del relieve. */
  weight: number;
  bandFrom: number;
  bandTo: number;
  scale: [number, number];
}

const LAPACHO: Species = {
  name: "lapacho",
  trunk: { colour: 0x6b5540, height: 6, radiusTop: 0.5, radiusBottom: 0.95 },
  crown: { colour: 0x477a41, radius: 5.6, height: 0.86, detail: 0, lift: 5.6 },
  weight: 0.5,
  bandFrom: 0,
  bandTo: 0.72,
  scale: [0.8, 1.7],
};

const SAMUU: Species = {
  name: "samuu",
  trunk: { colour: 0x8a8f63, height: 8, radiusTop: 0.55, radiusBottom: 2.2 },
  crown: { colour: 0x5c8a4b, radius: 4.4, height: 0.62, detail: 0, lift: 7.6 },
  weight: 0.28,
  bandFrom: 0,
  bandTo: 0.55,
  scale: [0.8, 1.35],
};

const KARANDAY: Species = {
  name: "karanday",
  trunk: { colour: 0x7d6b4e, height: 11, radiusTop: 0.42, radiusBottom: 0.6 },
  crown: { colour: 0x7d9c4c, radius: 3.9, height: 0.42, detail: 0, lift: 10.6 },
  weight: 0.22,
  bandFrom: 0,
  bandTo: 0.3,
  scale: [0.85, 1.25],
};

/*
 * ── Y lo que crece al otro lado del mar ──────────────────────────────────
 *
 * Un lapacho en el monteverde canario es exactamente igual de falso que una
 * casa de Asunción en Tenerife, y se ve desde el aire igual de bien. Desde
 * que hay escenarios en dos continentes, la lista de especies no puede ser
 * una: **cada sitio tiene la suya**, y en Canarias además cambia con la
 * altura de una manera que se reconoce volando.
 */

/**
 * Pino canario: alto, recto y de copa estrecha.
 *
 * Es el árbol de la isla y el que hace el paisaje entre los ochocientos y los
 * dos mil metros. Rebrota después de un incendio, que es la razón de que
 * siga habiendo pinar; aquí lo que importa es su silueta, que no se parece a
 * ningún árbol paraguayo: tronco largo y desnudo y una copa estrecha arriba.
 */
const PINO_CANARIO: Species = {
  name: "pino-canario",
  trunk: { colour: 0x7a5f47, height: 13, radiusTop: 0.4, radiusBottom: 0.95 },
  crown: { colour: 0x37624a, radius: 3.4, height: 1.35, detail: 0, lift: 11 },
  weight: 0.5,
  // De media ladera para arriba, que es donde está el pinar de verdad.
  bandFrom: 0.28,
  bandTo: 0.95,
  scale: [0.85, 1.5],
};

/**
 * Laurisilva: la copa redonda y apretada del monteverde.
 *
 * El bosque de niebla del norte de Tenerife —donde está el aeropuerto—, entre
 * los quinientos y los mil doscientos metros. Va oscuro y muy junto: lo que
 * se ve desde el aire es una manta, no árboles sueltos.
 */
const LAURISILVA: Species = {
  name: "laurisilva",
  trunk: { colour: 0x5c4a3c, height: 4.5, radiusTop: 0.5, radiusBottom: 0.8 },
  crown: { colour: 0x2f5a3c, radius: 5.2, height: 0.95, detail: 0, lift: 4.2 },
  weight: 0.42,
  bandFrom: 0,
  bandTo: 0.5,
  scale: [0.8, 1.4],
};

/**
 * Palmera canaria: baja, gorda y con la copa abierta.
 *
 * Vive abajo, cerca de la costa y de los pueblos, y es lo que le pone a un
 * barranco canario su forma. Comparte silueta con el karanday paraguayo —las
 * dos son palmeras— y a propósito: lo que cambia es dónde crece y de qué
 * color va.
 */
const PALMERA_CANARIA: Species = {
  name: "palmera-canaria",
  trunk: { colour: 0x8a7454, height: 9, radiusTop: 0.75, radiusBottom: 0.95 },
  crown: { colour: 0x6f9153, radius: 4.6, height: 0.5, detail: 0, lift: 8.4 },
  weight: 0.2,
  bandFrom: 0,
  bandTo: 0.22,
  scale: [0.85, 1.2],
};

/**
 * Quebracho: el árbol del Chaco, y el que le da nombre a media región.
 *
 * Bajo, retorcido y durísimo —«quiebra-hachas»—, con la copa abierta y poca
 * hoja. En el Chaco no hay monte cerrado: hay árboles sueltos sobre pasto, y
 * eso es lo que tiene que verse desde el aire.
 */
const QUEBRACHO: Species = {
  name: "quebracho",
  trunk: { colour: 0x6f5a41, height: 5, radiusTop: 0.55, radiusBottom: 1.1 },
  crown: { colour: 0x6b7f45, radius: 4.8, height: 0.6, detail: 0, lift: 4.6 },
  weight: 0.55,
  bandFrom: 0,
  bandTo: 0.8,
  scale: [0.75, 1.3],
};

/** Lo que crece en cada sitio. Ver el bloque de arriba. */
const FLORA: Record<string, readonly Species[]> = {
  "tenerife-norte": [LAURISILVA, PINO_CANARIO, PALMERA_CANARIA],
  chaco: [QUEBRACHO, KARANDAY],
};

/**
 * Y lo que crece donde no se ha dicho otra cosa: el este de Paraguay.
 *
 * Es la flora de Asunción, del Valle y de la granja, que son tres de los cinco
 * escenarios. Un escenario nuevo sin flora escrita sale con esta, que es una
 * respuesta razonable mientras nadie diga la suya.
 */
const FLORA_POR_DEFECTO: readonly Species[] = [LAPACHO, SAMUU, KARANDAY];

/** Qué especies crecen en este escenario. */
export function floraDe(escenario: { id: string }): readonly Species[] {
  return FLORA[escenario.id] ?? FLORA_POR_DEFECTO;
}

/** Proporción de lapachos en flor. Es un acento, no una alfombra. */
const FLOWERING = 0.16;
const FLOWER_COLOUR = 0xd97aa8;

export function createVegetation(
  scenario: Scenario,
  ground: GroundSampler,
  /**
   * De qué color es la fotografía del suelo ahí, si hay ortofoto.
   *
   * **Sobre una foto aérea no se plantan árboles de mentira.** Con la
   * ortofoto puesta, la vegetación procedimental seguía sembrando: árboles de
   * cuatro caras encima de carreteras fotografiadas y de tejados
   * fotografiados, uno de cada ocho hasta en pleno casco urbano. En el camino
   * de las teselas esto se apagaba entero; aquí se quedó encendido.
   *
   * No se apaga del todo, porque la foto es plana y un árbol da volumen y
   * paralaje. Lo que se hace es plantar **solo donde la foto dice que hay
   * verde**, que es donde de verdad hay algo que sobresalga.
   */
  colorDelSuelo?: (
    x: number,
    z: number,
  ) => { r: number; g: number; b: number } | null,
): Group {
  const group = new Group();
  group.name = "vegetacion";

  // El mapa de lo pavimentado se pinta una vez y se consulta miles.
  const pavimento = scenario.aerodrome
    ? mapaDePavimento(scenario.aerodrome)
    : null;

  /**
   * Y donde hay ciudad tampoco hay monte.
   *
   * Es la otra mitad de «estoy sobrevolando Luque en el Pleistoceno, todo
   * árboles»: no bastaba con poner casas, había que quitar el bosque de debajo.
   * Un barrio con un árbol cada quince metros no es un barrio, es una selva con
   * tejados.
   *
   * No se vacía del todo: en las celdas con ciudad se deja **uno de cada
   * ocho**, que son los del parque, los de la avenida y el del patio. Una
   * ciudad sin un solo árbol se lee tan artificial como un bosque con casas.
   */
  const rejilla = scenario.ciudad?.rejilla ?? null;
  const pasoCiudad = rejilla ? scenario.size / rejilla.lado : 0;
  const hayCiudad = (x: number, z: number): boolean => {
    if (!rejilla) return false;
    const col = Math.floor((x + scenario.size / 2) / pasoCiudad);
    // El fichero tiene la Y al norte y el mundo el norte en la Z negativa.
    const fila = Math.floor((-z + scenario.size / 2) / pasoCiudad);
    if (col < 0 || col >= rejilla.lado || fila < 0 || fila >= rejilla.lado)
      return false;
    return rejilla.clase[fila * rejilla.lado + col]! > 0;
  };

  /*
   * **De qué a qué va el terreno de este escenario**, que es lo que decide
   * qué especie va dónde.
   *
   * Se dividía la cota por `reliefHeight`, y eso solo vale mientras el
   * relieve se invente: el generado va de cero a ese número, así que la
   * división daba justo «lo alto que está esto comparado con lo más alto que
   * hay». Con relieve medido no vale nada — el terreno de Yvytu Rape va de
   * ciento ochenta y cuatro a trescientos sesenta y siete metros, y dividir
   * por ciento noventa daba **más de uno en todo el mapa**: ninguna especie
   * llega tan arriba, así que el campo salía pelado, sin un solo árbol.
   *
   * Con las cotas de verdad la regla vuelve a decir lo que decía: abajo el
   * monte, arriba el pelado, y en medio lo que haya.
   */
  const franja = franjaDeCotas(scenario);
  // Y lo que crece aquí, que no es lo mismo en Asunción que en Tenerife.
  const flora = floraDe(scenario);

  const random = mulberry32(scenario.seed ^ 0x7ee5);
  const clumps = new ValueNoise2D(scenario.seed ^ 0xb05c);
  const clumpScale = 11 / scenario.size;
  const half = scenario.size / 2;

  // Un sorteo, un reparto: se recorren candidatos y cada uno acaba en su
  // especie o en la basura. Así el coste no depende del número de especies.
  const placements = new Map<string, Matrix4[]>(flora.map((s) => [s.name, []]));
  const flowering: Matrix4[] = [];
  let placed = 0;

  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  const up = new Vector3(0, 1, 0);
  // La cota de la pista, que es de donde salen las superficies de obstáculos.
  const runwayY = ground(scenario.runway.x, scenario.runway.z);
  const recinto = scenario.aerodrome
    ? recintoDelAerodromo(scenario.aerodrome)
    : null;

  for (let i = 0; i < CANDIDATES; i++) {
    const x = (random() - 0.5) * scenario.size * 0.98;
    const z = (random() - 0.5) * scenario.size * 0.98;

    const height = ground(x, z);
    if (height <= scenario.waterLevel + 1.5) continue;
    if (slopeAt(ground, x, z) > MAX_SLOPE) continue;
    if (nearRunway(x, z, scenario)) continue;
    // Y tampoco encima de las calles de rodaje ni de las plataformas. Una
    // calle de rodaje tiene su franja libre de obstáculos igual que la pista:
    // un avión tiene envergadura y las alas sobresalen mucho del tren.
    if (pavimento?.hay(x, z)) continue;
    /*
     * **Y tampoco en los huecos entre calles.** Excluyendo solo el pavimento
     * quedaban bosquecillos en el césped de dentro del campo —veintidós
     * árboles medidos en Silvio Pettirossi—, y ahí no los hay: «no hay árboles
     * en los aeropuertos. Y ni macetas con rosales». Ver `recintoDelAerodromo`.
     */
    if (recinto && dentroDelPoligono(recinto, x, z)) continue;
    if (hayCiudad(x, z) && random() > 0.125) continue;
    /*
     * Y sobre la fotografía, solo donde la fotografía es verde. Un tejado
     * fotografiado con un árbol de cuatro caras encima no es un árbol: es un
     * error que se ve desde el aire.
     */
    const suelo = colorDelSuelo?.(x, z);
    if (suelo && !esVerde(suelo)) continue;

    /*
     * **Y nada que asome por encima de las superficies de obstáculos.**
     *
     * La franja de pista ya estaba despejada, pero un lapacho de veinte metros
     * a trescientos del umbral está bajo un techo de seis: sigue siendo un
     * obstáculo en la aproximación aunque esté fuera de la franja. Ver
     * `superficie-de-aproximacion.ts`.
     */
    const techo = techoSobreLaPista(x, z, scenario.runway);
    if (Number.isFinite(techo) && height + ALTURA_TIPICA > runwayY + techo)
      continue;

    // Manchas de bosque. La cuarta potencia es lo que separa el bosque del
    // claro: con un exponente suave sale un espolvoreado uniforme, y un
    // espolvoreado uniforme sobre ciento noventa kilómetros cuadrados no se
    // ve. Aquí, o hay monte o no hay nada.
    const density = clumps.fbm(
      (x + half) * clumpScale,
      (z + half) * clumpScale,
      3,
    );
    if (random() > Math.pow(density, 4) * 5.5) continue;

    const band = clamp01((height - franja.desde) / franja.cuanto);
    const species = pickSpecies(flora, band, random());
    if (!species) continue;

    const size =
      species.scale[0] + random() * (species.scale[1] - species.scale[0]);
    position.set(x, height, z);
    rotation.setFromAxisAngle(up, random() * Math.PI * 2);
    scale.set(size, size, size);

    const matrix = new Matrix4().compose(position, rotation, scale);
    if (species === LAPACHO && random() < FLOWERING) flowering.push(matrix);
    else placements.get(species.name)!.push(matrix);
    if (++placed >= MAX_TREES) break;
  }

  for (const species of flora) {
    const matrices = placements.get(species.name)!;
    if (matrices.length)
      group.add(buildSpecies(species, matrices, species.crown.colour));
  }
  if (flowering.length)
    group.add(buildSpecies(LAPACHO, flowering, FLOWER_COLOUR));

  return group;
}

/**
 * De qué cota a qué cota va el terreno de un escenario.
 *
 * Con relieve medido se miran los datos —una pasada por ciento cincuenta mil
 * enteros, una vez por partida—; sin él, el generado va de cero a
 * `reliefHeight` por construcción, que es lo que se venía suponiendo.
 */
function franjaDeCotas(scenario: Scenario): { desde: number; cuanto: number } {
  const datos = scenario.relieve?.datos;
  if (!datos || !datos.length)
    return { desde: 0, cuanto: scenario.reliefHeight };
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < datos.length; i++) {
    const v = datos[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  // Un escenario llano de verdad no puede dividir por cero.
  return { desde: min, cuanto: Math.max(1, max - min) };
}

/** Elige especie según la franja de altitud, con un sorteo ponderado. */
function pickSpecies(
  especies: readonly Species[],
  band: number,
  roll: number,
): Species | null {
  const eligible = especies.filter(
    (s) => band >= s.bandFrom && band <= s.bandTo,
  );
  if (!eligible.length) return null;
  const total = eligible.reduce((sum, s) => sum + s.weight, 0);
  let cursor = roll * total;
  for (const species of eligible) {
    cursor -= species.weight;
    if (cursor <= 0) return species;
  }
  return eligible[eligible.length - 1]!;
}

/**
 * Un árbol son dos mallas instanciadas, tronco y copa, que comparten las
 * mismas matrices. Se agrupan para poder moverlas juntas si hiciera falta.
 */
function buildSpecies(
  species: Species,
  matrices: Matrix4[],
  crownColour: number,
): Group {
  const group = new Group();
  group.name = `arboles:${species.name}`;

  // Cuatro caras y sin tapas: ocho triángulos de tronco. Con dieciocho mil
  // árboles, cada triángulo por árbol son dieciocho mil triángulos.
  const trunkGeometry = new CylinderGeometry(
    species.trunk.radiusTop,
    species.trunk.radiusBottom,
    species.trunk.height,
    4,
    1,
    true,
  );
  // El cilindro nace centrado en su altura: se sube media para apoyarlo.
  trunkGeometry.translate(0, species.trunk.height / 2, 0);

  // Octaedro y no icosaedro: ocho triángulos en vez de veinte, y facetado
  // grande, que es justo el aspecto que busca la dirección de arte.
  const crownGeometry = new OctahedronGeometry(
    species.crown.radius,
    species.crown.detail,
  );
  crownGeometry.scale(1, species.crown.height, 1);
  crownGeometry.translate(0, species.crown.lift, 0);

  const trunk = new InstancedMesh(
    trunkGeometry,
    new MeshLambertMaterial({ color: species.trunk.colour, flatShading: true }),
    matrices.length,
  );
  const crown = new InstancedMesh(
    crownGeometry,
    new MeshLambertMaterial({ color: crownColour, flatShading: true }),
    matrices.length,
  );

  // Variación de tono por árbol: un bosque de un solo verde canta a copia.
  //
  // El color de instancia **multiplica** al del material, así que aquí va un
  // gris alrededor del blanco y no el verde de la copa. La primera versión
  // pasaba el propio verde y three.js lo multiplicaba otra vez por el del
  // material: el verde se elevaba al cuadrado y el bosque entero salía negro.
  const tint = new Color();
  for (let i = 0; i < matrices.length; i++) {
    trunk.setMatrixAt(i, matrices[i]!);
    crown.setMatrixAt(i, matrices[i]!);
    const shade = 0.82 + (((i * 2654435761) % 1000) / 1000) * 0.42;
    tint.setRGB(shade, shade * 1.02, shade * 0.96);
    crown.setColorAt(i, tint);
  }
  trunk.instanceMatrix.needsUpdate = true;
  crown.instanceMatrix.needsUpdate = true;
  if (crown.instanceColor) crown.instanceColor.needsUpdate = true;

  group.add(trunk);
  group.add(crown);
  return group;
}

/** Pendiente aproximada muestreando el terreno alrededor del punto. */
function slopeAt(ground: GroundSampler, x: number, z: number): number {
  const d = 12;
  const dx = (ground(x + d, z) - ground(x - d, z)) / (2 * d);
  const dz = (ground(x, z + d) - ground(x, z - d)) / (2 * d);
  return Math.hypot(dx, dz);
}

/**
 * Nada crece encima de la pista ni en su franja de seguridad.
 *
 * Un aeródromo de verdad tiene una **franja de pista** que debe quedar libre
 * de obstáculos, y se extiende bastante más allá del asfalto. Así que esto no
 * es solo evitar un dibujo raro: es una norma, y de las que tienen motivo.
 *
 * **Y la cuenta estaba mal.** Los ejes de pista se calculaban con
 * `dx·sen + dz·cos` y `dx·cos − dz·sen`, que con un rumbo de 0° o de 90°
 * acierta por simetría de los ejes y con cualquier otro **gira el rectángulo
 * noventa grados**. Con las pistas sintéticas —90° y 30°— no se notaba
 * apenas; con Silvio Pettirossi, que corre a 192,45°, salían árboles en
 * mitad del asfalto.
 *
 * El delante de un rumbo en este mundo es `(sen h, −cos h)`, y el través es
 * `(cos h, sen h)`. De ahí salen las dos proyecciones.
 */
/**
 * Lo que mide un árbol de los de aquí, m. Para compararlo con el techo.
 *
 * Es una media generosa a propósito: más vale dejar un claro de más cerca del
 * umbral que un lapacho asomando en la senda.
 */
const ALTURA_TIPICA = 14;

/** ¿Es verde este trozo de fotografía? */
function esVerde(c: { r: number; g: number; b: number }): boolean {
  // El verde de una foto aérea al atardecer es oscuro y poco saturado, así que
  // no se pide un verde de rotulador: se pide que el verde gane a los otros
  // dos, que es lo que distingue un descampado de un tejado o de un asfalto.
  return c.g > c.r * 1.02 && c.g > c.b * 1.02;
}

function nearRunway(
  x: number,
  z: number,
  scenario: Scenario,
  margen = 0,
): boolean {
  const { runway } = scenario;
  const { along, across } = enEjesDePista(
    x,
    z,
    runway.x,
    runway.z,
    runway.heading,
  );
  /*
   * **Y el margen era demasiado justo.**
   *
   * Eran noventa metros por delante del umbral y cincuenta y cinco al lado del
   * borde: con eso los árboles llegaban hasta ciento veinte metros del asfalto
   * y se veían pegados a la pista desde la cabina —«árboles a los lados de la
   * pista»—. La franja de una pista de verdad son ciento cincuenta metros a
   * cada lado del eje y sesenta más allá de cada umbral, y ahí no hay ni un
   * arbusto: **un avión que se sale de la pista tiene que poder pararse sin
   * chocar con nada**, y esa es toda la razón de que la franja exista.
   *
   * Se despeja algo más que la franja hacia delante —doscientos cincuenta
   * metros— porque por ahí se pasa a diez metros de altura, y un árbol ahí no
   * es paralaje: es un obstáculo en la aproximación.
   *
   * Sigue habiendo vegetación cerca para que la carrera de despegue se sienta
   * rápida; solo que ahora empieza donde empieza de verdad.
   */
  return (
    Math.abs(along) < runway.length * 0.5 + 250 + margen &&
    Math.abs(across) < runway.width * 0.5 + 130 + margen
  );
}

/**
 * ¿Está esto dentro del aeropuerto? Pista, calles de rodaje y plataformas.
 *
 * Vive aquí porque aquí está el mapa de pavimento, que es la parte cara: se
 * rasteriza una vez el aeródromo entero y luego se consulta miles de veces. Lo
 * usan los árboles y **también las casas** —una nave industrial en mitad de la
 * pista no es un despiste, es un accidente— y tener dos versiones de esta
 * pregunta era garantizar que una de las dos se quedara atrás.
 *
 * `margen` es lo que se pide de más: los árboles llegan cerca a propósito,
 * porque son lo que da sensación de velocidad al despegar; un edificio de
 * treinta metros al lado de la pista, no.
 */
export function zonaDeAeropuerto(
  scenario: Scenario,
  margen = 0,
): (x: number, z: number) => boolean {
  const pavimento = scenario.aerodrome
    ? mapaDePavimento(scenario.aerodrome)
    : null;
  const recinto = scenario.aerodrome
    ? recintoDelAerodromo(scenario.aerodrome)
    : null;
  return (x, z) =>
    nearRunway(x, z, scenario, margen) ||
    !!pavimento?.hay(x, z) ||
    (!!recinto && dentroDelPoligono(recinto, x, z));
}

/**
 * El recinto del aeródromo: la envolvente de todo lo que hay dentro.
 *
 * **En un aeropuerto no hay árboles.** Ni en el asfalto ni entre las calles:
 * el suelo entre una calle y otra es hierba segada, y por una razón que no es
 * de jardinería —un árbol al lado de una calle de rodaje es un obstáculo, y
 * los pájaros que vive en él son otro—. Excluir solo el pavimento dejaba
 * bosquecillos en los huecos: «los árboles que a veces plantas en mitad del
 * aeropuerto. No hay árboles en los aeropuertos. Y ni macetas con rosales».
 *
 * OpenStreetMap no nos da el vallado, así que el recinto se deduce: la
 * envolvente convexa de pistas, calles, plataformas y edificios. Es de sobra
 * para lo que hace falta, porque un aeródromo **es** aproximadamente convexo:
 * lo delimita una valla que rodea todo eso.
 */
function recintoDelAerodromo(aero: Aerodrome): readonly Punto[] | null {
  const puntos: Punto[] = [];
  // Del fichero al mundo: la Y del norte es la Z negativa.
  for (const p of aero.runways)
    for (const q of p.centerline) puntos.push([q[0], -q[1]]);
  for (const c of aero.taxiways)
    for (const q of c.path) puntos.push([q[0], -q[1]]);
  for (const a of aero.aprons)
    for (const q of a.polygon) puntos.push([q[0], -q[1]]);
  for (const e of aero.buildings)
    for (const q of e.polygon) puntos.push([q[0], -q[1]]);
  if (puntos.length < 3) return null;
  return envolvente(puntos);
}

/** La envolvente convexa, por el método de la cadena monótona. */
function envolvente(puntos: readonly Punto[]): Punto[] {
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o: Punto, a: Punto, b: Punto) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const media = (lista: readonly Punto[]) => {
    const salida: Punto[] = [];
    for (const q of lista) {
      while (
        salida.length >= 2 &&
        cruz(salida[salida.length - 2]!, salida[salida.length - 1]!, q) <= 0
      ) {
        salida.pop();
      }
      salida.push(q);
    }
    salida.pop();
    return salida;
  };
  return [...media(p), ...media([...p].reverse())];
}

/** El algoritmo del rayo, el mismo que rellena las plataformas. */
function dentroDelPoligono(
  poli: readonly Punto[],
  x: number,
  z: number,
): boolean {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, zi] = poli[i]!;
    const [xj, zj] = poli[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/**
 * Un mapa de lo pavimentado, para que no crezcan árboles encima.
 *
 * La exclusión de la pista se hacía con una cuenta directa, y con una sola
 * pista eso basta. Con un aeródromo real hay cincuenta y cuatro calles de
 * rodaje y veintiuna plataformas, y comprobar cada árbol contra todas ellas
 * es medir miles de distancias a miles de segmentos.
 *
 * Así que se pinta una vez una rejilla de seis metros con todo lo que es
 * pavimento —o está lo bastante cerca de serlo— y después cada árbol es una
 * consulta y ya. **No es una optimización prematura: sin esto, cargar Silvio
 * Pettirossi tardaba lo suyo y salían árboles en mitad de las calles de
 * rodaje**, que además de feo impide rodar.
 *
 * El margen no es estético. Una calle de rodaje tiene su propia franja libre
 * de obstáculos, igual que la pista: un avión tiene envergadura y las alas
 * sobresalen mucho del tren.
 */
const CELDA = 6;

/** Margen libre a cada lado del eje de una calle de rodaje, m. */
const MARGEN_RODADURA = 30;

/** Margen libre alrededor de una plataforma, m. */
const MARGEN_PLATAFORMA = 15;

export class Pavimento {
  private readonly mapa: Uint8Array;

  constructor(
    private readonly minX: number,
    private readonly minZ: number,
    private readonly anchoCeldas: number,
    private readonly altoCeldas: number,
  ) {
    this.mapa = new Uint8Array(anchoCeldas * altoCeldas);
  }

  /** ¿Hay pavimento —o su franja— en este punto del mundo? */
  hay(x: number, z: number): boolean {
    const cx = Math.floor((x - this.minX) / CELDA);
    const cz = Math.floor((z - this.minZ) / CELDA);
    if (cx < 0 || cz < 0 || cx >= this.anchoCeldas || cz >= this.altoCeldas)
      return false;
    return this.mapa[cz * this.anchoCeldas + cx] === 1;
  }

  /** Marca un disco. Es como se pintan las calles: un disco por cada tramo. */
  disco(x: number, z: number, radio: number): void {
    const c0 = Math.max(0, Math.floor((x - radio - this.minX) / CELDA));
    const c1 = Math.min(
      this.anchoCeldas - 1,
      Math.ceil((x + radio - this.minX) / CELDA),
    );
    const f0 = Math.max(0, Math.floor((z - radio - this.minZ) / CELDA));
    const f1 = Math.min(
      this.altoCeldas - 1,
      Math.ceil((z + radio - this.minZ) / CELDA),
    );
    const r2 = radio * radio;
    for (let f = f0; f <= f1; f++) {
      const pz = this.minZ + (f + 0.5) * CELDA;
      for (let c = c0; c <= c1; c++) {
        const px = this.minX + (c + 0.5) * CELDA;
        if ((px - x) ** 2 + (pz - z) ** 2 <= r2)
          this.mapa[f * this.anchoCeldas + c] = 1;
      }
    }
  }

  /** Marca un segmento, con su franja a los lados. */
  franja(ax: number, az: number, bx: number, bz: number, radio: number): void {
    const largo = Math.hypot(bx - ax, bz - az);
    const pasos = Math.max(1, Math.ceil(largo / (CELDA * 0.8)));
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      this.disco(ax + (bx - ax) * t, az + (bz - az) * t, radio);
    }
  }
}

/**
 * Construye el mapa de pavimento de un aeródromo real.
 *
 * Las plataformas se rellenan de verdad, con el algoritmo del rayo: contar
 * cuántas veces cruza el borde una semirrecta que sale del punto. Se probó a
 * marcar solo su contorno y quedaban árboles **dentro** de la plataforma,
 * rodeados de asfalto, que es todavía más raro que tenerlos fuera.
 */
/**
 * Y se exporta porque lo pregunta alguien más: **de qué está hecho el suelo**.
 *
 * Este mapa es la parte cara de esa pregunta —se pinta una vez y se consulta
 * miles— y ya estaba aquí, así que el módulo de superficies lo pide prestado
 * en vez de construir otro igual. Ver `world/superficie.ts`.
 */
export function mapaDePavimento(aero: Aerodrome): Pavimento | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const mirar = (x: number, z: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  };
  // Del fichero al mundo: la Y del norte es la Z negativa.
  for (const c of aero.taxiways) for (const p of c.path) mirar(p[0], -p[1]);
  for (const a of aero.aprons) for (const p of a.polygon) mirar(p[0], -p[1]);
  if (!Number.isFinite(minX)) return null;

  const margen = MARGEN_RODADURA + CELDA * 2;
  minX -= margen;
  minZ -= margen;
  maxX += margen;
  maxZ += margen;
  const pav = new Pavimento(
    minX,
    minZ,
    Math.ceil((maxX - minX) / CELDA),
    Math.ceil((maxZ - minZ) / CELDA),
  );

  for (const calle of aero.taxiways) {
    const radio = (calle.widthM ?? 23) / 2 + MARGEN_RODADURA;
    for (let i = 0; i < calle.path.length - 1; i++) {
      const a = calle.path[i]!;
      const b = calle.path[i + 1]!;
      pav.franja(a[0], -a[1], b[0], -b[1], radio);
    }
  }

  for (const plat of aero.aprons) {
    const poli = plat.polygon.map((p) => [p[0], -p[1]] as const);
    if (poli.length < 3) continue;
    // El contorno, con su margen…
    for (let i = 0; i < poli.length; i++) {
      const a = poli[i]!;
      const b = poli[(i + 1) % poli.length]!;
      pav.franja(a[0], a[1], b[0], b[1], MARGEN_PLATAFORMA);
    }
    // …y el relleno, con el algoritmo del rayo.
    let pminX = Infinity;
    let pmaxX = -Infinity;
    let pminZ = Infinity;
    let pmaxZ = -Infinity;
    for (const [x, z] of poli) {
      pminX = Math.min(pminX, x);
      pmaxX = Math.max(pmaxX, x);
      pminZ = Math.min(pminZ, z);
      pmaxZ = Math.max(pmaxZ, z);
    }
    for (let z = pminZ; z <= pmaxZ; z += CELDA) {
      for (let x = pminX; x <= pmaxX; x += CELDA) {
        let dentro = false;
        for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
          const [xi, zi] = poli[i]!;
          const [xj, zj] = poli[j]!;
          if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
            dentro = !dentro;
        }
        if (dentro) pav.disco(x, z, CELDA);
      }
    }
  }

  return pav;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
