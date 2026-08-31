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
} from 'three';
import { enEjesDePista } from './rumbo';
import { ValueNoise2D, mulberry32 } from './noise';
import type { Scenario } from './scenarios';

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

interface Species {
  name: string;
  trunk: { colour: number; height: number; radiusTop: number; radiusBottom: number };
  crown: { colour: number; radius: number; height: number; detail: number; lift: number };
  /** Peso relativo y franja de altitud preferida, en fracción del relieve. */
  weight: number;
  bandFrom: number;
  bandTo: number;
  scale: [number, number];
}

const LAPACHO: Species = {
  name: 'lapacho',
  trunk: { colour: 0x6b5540, height: 6, radiusTop: 0.5, radiusBottom: 0.95 },
  crown: { colour: 0x477a41, radius: 5.6, height: 0.86, detail: 0, lift: 5.6 },
  weight: 0.5,
  bandFrom: 0,
  bandTo: 0.72,
  scale: [0.8, 1.7],
};

const SAMUU: Species = {
  name: 'samuu',
  trunk: { colour: 0x8a8f63, height: 8, radiusTop: 0.55, radiusBottom: 2.2 },
  crown: { colour: 0x5c8a4b, radius: 4.4, height: 0.62, detail: 0, lift: 7.6 },
  weight: 0.28,
  bandFrom: 0,
  bandTo: 0.55,
  scale: [0.8, 1.35],
};

const KARANDAY: Species = {
  name: 'karanday',
  trunk: { colour: 0x7d6b4e, height: 11, radiusTop: 0.42, radiusBottom: 0.6 },
  crown: { colour: 0x7d9c4c, radius: 3.9, height: 0.42, detail: 0, lift: 10.6 },
  weight: 0.22,
  bandFrom: 0,
  bandTo: 0.3,
  scale: [0.85, 1.25],
};

const SPECIES = [LAPACHO, SAMUU, KARANDAY];

/** Proporción de lapachos en flor. Es un acento, no una alfombra. */
const FLOWERING = 0.16;
const FLOWER_COLOUR = 0xd97aa8;

export function createVegetation(scenario: Scenario, ground: GroundSampler): Group {
  const group = new Group();
  group.name = 'vegetacion';

  const random = mulberry32(scenario.seed ^ 0x7ee5);
  const clumps = new ValueNoise2D(scenario.seed ^ 0xb05c);
  const clumpScale = 11 / scenario.size;
  const half = scenario.size / 2;

  // Un sorteo, un reparto: se recorren candidatos y cada uno acaba en su
  // especie o en la basura. Así el coste no depende del número de especies.
  const placements = new Map<string, Matrix4[]>(SPECIES.map((s) => [s.name, []]));
  const flowering: Matrix4[] = [];
  let placed = 0;

  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  const up = new Vector3(0, 1, 0);

  for (let i = 0; i < CANDIDATES; i++) {
    const x = (random() - 0.5) * scenario.size * 0.98;
    const z = (random() - 0.5) * scenario.size * 0.98;

    const height = ground(x, z);
    if (height <= scenario.waterLevel + 1.5) continue;
    if (slopeAt(ground, x, z) > MAX_SLOPE) continue;
    if (nearRunway(x, z, scenario)) continue;

    // Manchas de bosque. La cuarta potencia es lo que separa el bosque del
    // claro: con un exponente suave sale un espolvoreado uniforme, y un
    // espolvoreado uniforme sobre ciento noventa kilómetros cuadrados no se
    // ve. Aquí, o hay monte o no hay nada.
    const density = clumps.fbm((x + half) * clumpScale, (z + half) * clumpScale, 3);
    if (random() > Math.pow(density, 4) * 5.5) continue;

    const band = clamp01(height / scenario.reliefHeight);
    const species = pickSpecies(band, random());
    if (!species) continue;

    const size = species.scale[0] + random() * (species.scale[1] - species.scale[0]);
    position.set(x, height, z);
    rotation.setFromAxisAngle(up, random() * Math.PI * 2);
    scale.set(size, size, size);

    const matrix = new Matrix4().compose(position, rotation, scale);
    if (species === LAPACHO && random() < FLOWERING) flowering.push(matrix);
    else placements.get(species.name)!.push(matrix);
    if (++placed >= MAX_TREES) break;
  }

  for (const species of SPECIES) {
    const matrices = placements.get(species.name)!;
    if (matrices.length) group.add(buildSpecies(species, matrices, species.crown.colour));
  }
  if (flowering.length) group.add(buildSpecies(LAPACHO, flowering, FLOWER_COLOUR));

  return group;
}

/** Elige especie según la franja de altitud, con un sorteo ponderado. */
function pickSpecies(band: number, roll: number): Species | null {
  const eligible = SPECIES.filter((s) => band >= s.bandFrom && band <= s.bandTo);
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
function buildSpecies(species: Species, matrices: Matrix4[], crownColour: number): Group {
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
  const crownGeometry = new OctahedronGeometry(species.crown.radius, species.crown.detail);
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
    const shade = 0.82 + ((i * 2654435761) % 1000) / 1000 * 0.42;
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
function nearRunway(x: number, z: number, scenario: Scenario): boolean {
  const { runway } = scenario;
  const { along, across } = enEjesDePista(x, z, runway.x, runway.z, runway.heading);
  // Margen justo: se despeja la pista y su franja de seguridad, pero los
  // árboles llegan cerca. Pasar a ras de ellos es lo que hace que una carrera
  // de despegue se sienta rápida — sin nada cerca, no hay paralaje.
  return Math.abs(along) < runway.length * 0.5 + 90 && Math.abs(across) < runway.width * 0.5 + 55;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
