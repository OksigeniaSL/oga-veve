/**
 * Las aves de cada sitio: **quién vuela, dónde, a qué altura y cómo**.
 *
 * Es una tabla de hechos, y cada fila lleva su fuente. La regla 4 de la casa
 * pide que lo que se enseñe sea real, y con las aves hay una trampa conocida:
 * **las alturas que circulan están muy exageradas**.
 *
 * ## Las alturas, medidas y no contadas
 *
 * Circulan dos cifras de récord y las dos son ciertas y engañan. Los ánsares
 * indios «sobre el Everest» vienen de una anécdota de 1970 —alguien que los
 * oyó en la cumbre—; con satélite, cruzan el Himalaya subiendo **entre 4000 y
 * 6000 m** (Hawkes et al., PNAS 2011) y el 98 % de las medidas quedan por
 * debajo de 6000 m (Bishop et al., Science 2015). Y el buitre de Rüppell a
 * once mil trescientos metros es **un choque**, uno, contra un avión de línea
 * sobre África occidental (Laybourne, Wilson Bulletin 1974): un caso, no una
 * altura de vuelo.
 *
 * Lo de todos los días es otra cosa, y es lo que hay en esta tabla:
 *
 * - «La mayoría de los movimientos diarios van entre 30 y 300 pies sobre el
 *   suelo; hay poca actividad regular por encima de 1000» (Transport Canada,
 *   *Sharing the Skies*, TP 13549, cap. 3). Treinta a trescientos pies son
 *   nueve a noventa metros: ésa es la banda de las aves que no planean.
 * - Los que planean en térmica suben más: con GPS, el zopilote negro pasa el
 *   48 % del tiempo en vuelo por debajo de 100 m y el aura el 60 %, y lo más
 *   alto medido fue 1578 y 1378 m (Avery et al., J. Wildl. Manage. 2011).
 * - Y los choques con aviones: el 71 % de los de aviones de transporte a 500
 *   pies o menos, el 92 % a 3500 o menos (FAA/USDA, informe 32, 1990-2025);
 *   el 86 % en el aeródromo o cerca, la mitad larga en aproximación y
 *   aterrizaje (OACI, IBIS 2022-2024). **Abajo y cerca del campo.**
 *
 * ## Qué especies, y cuáles no
 *
 * Solo las que viven donde se ponen y tienen la envergadura publicada: sin
 * saber cuánto mide un ave no se puede dibujar a su tamaño. Por eso faltan la
 * bandurria y el loro hablador, que viven en Paraguay pero cuya envergadura no
 * se ha encontrado en una fuente. Y **en V solo las que vuelan en V**: en
 * Paraguay, el biguá y el cuervillo de cañada; en Canarias no hay fuente de
 * ninguna que lo haga de costumbre, así que allí no hay uves.
 *
 * Las velocidades, los aleteos y los colores son de presentación —cómo se
 * mueve y de qué color se ve un punto a doscientos metros— y no se enseñan: se
 * ven. Las alturas, los sitios y las especies sí, y esos llevan su fuente.
 */

import type { Scenario } from "./scenarios";
import { enCanarias } from "./canarias";

/** De qué parte del mundo es un campo, para saber qué aves tiene. */
export type Region = "canarias" | "paraguay";

/**
 * Cómo vuela en grupo:
 *
 * - `uve`: en formación en V, con relevos en la cabeza. Ver `bandadas.ts`.
 * - `nube`: en bandada suelta.
 * - `rasante`: rozando el mar en arcos.
 * - `termica`: en corro, subiendo en la térmica sin batir.
 * - `cernido`: quieto en el aire sobre el campo, batiendo deprisa.
 * - `cetreria`: el halcón del cetrero, dando vueltas bajas a su alrededor.
 */
export type Forma = "uve" | "nube" | "rasante" | "termica" | "cernido" | "cetreria";

/** Dónde se la ve. */
export type Habitat = "agua" | "mar" | "campo" | "termica";

export interface Especie {
  readonly id: string;
  /** Nombre común en el sitio. No sale en pantalla: es para quien programa. */
  readonly nombre: string;
  readonly cientifico: string;
  readonly region: Region;
  /** Solo en estos escenarios, si no vive en todos los de su región. */
  readonly soloEn?: readonly string[];
  /** Solo estos meses, de 1 a 12, si no está todo el año. */
  readonly meses?: readonly [number, number];
  /** m. */
  readonly envergadura: number;
  /** Del pico a la cola, m. */
  readonly largo: number;
  /** El color que se ve desde el aire. */
  readonly color: number;
  readonly forma: Forma;
  readonly habitat: Habitat;
  /** Entre qué alturas sobre el suelo se la ve, m. En la térmica, de dónde a dónde sube. */
  readonly alturas: readonly [number, number];
  /** Velocidad de vuelo, m/s. */
  readonly velocidad: number;
  /** Batidas por segundo. */
  readonly aleteo: number;
  /** Cuánto abre cada batida, rad. */
  readonly amplitud: number;
  /** Qué parte del tiempo va planeando, de 0 a 1. */
  readonly planeo: number;
  /** En la térmica, cuánto sube, m/s. */
  readonly trepa: number;
  /** Separación entre aves de una bandada suelta, en envergaduras. */
  readonly separacion: number;
  /** Cuántas van juntas. */
  readonly grupo: readonly [number, number];
  /** Cuántas bandadas alrededor de cada campo. */
  readonly bandadas: number;
  /**
   * Su recorrido, m: los dos radios de la vuelta que da la bandada. En la
   * térmica, el largo es cuánto planean al llegar y al irse; en el cernícalo,
   * el radio del trozo de campo que caza.
   */
  readonly recorrido: readonly [number, number];
  /** De dónde salen la especie, el sitio, la envergadura y la altura. */
  readonly fuente: string;
}

/*
 * ── Las fuentes, una vez ─────────────────────────────────────────────────
 */

/** La banda de todos los días de las aves que no planean. */
const TRANSPORT_CANADA =
  "Transport Canada, Sharing the Skies (TP 13549), cap. 3: «the majority of day-to-day movements occur between 30 and 300 feet AGL. Little regular activity occurs above 1,000 ft AGL». https://tc.canada.ca/en/aviation/publications/sharing-skies-guide-management-wildlife-hazards-tp-13549/chapter-3-birds-primer";
/** Las alturas medidas con GPS de los dos zopilotes. */
const AVERY =
  "Avery et al. 2011, Vulture flight behavior and implications for aircraft safety, J. Wildl. Manage. 75(7): 48 % (negro) y 60 % (aura) de las posiciones en vuelo por debajo de 100 m; máximos de 1578 y 1378 m. https://doi.org/10.1002/jwmg.205";

/** La banda de todos los días, en metros: 30 a 300 pies. */
const DE_TODOS_LOS_DIAS: readonly [number, number] = [10, 90];

export const ESPECIES: readonly Especie[] = [
  // ── Canarias ─────────────────────────────────────────────────────────
  {
    id: "gaviota-patiamarilla",
    nombre: "gaviota patiamarilla",
    cientifico: "Larus michahellis atlantis",
    region: "canarias",
    envergadura: 1.4,
    largo: 0.6,
    color: 0xa9b2ba,
    forma: "nube",
    habitat: "agua",
    alturas: DE_TODOS_LOS_DIAS,
    velocidad: 11,
    aleteo: 3,
    amplitud: 0.55,
    planeo: 0.45,
    trepa: 0,
    separacion: 4,
    grupo: [6, 18],
    bandadas: 3,
    recorrido: [900, 400],
    fuente:
      "SEO/BirdLife: la subespecie atlantis en las costas de Canarias, envergadura 1,30-1,58 m, dorso gris y vientre blanco (https://seo.org/ave/gaviota-patiamarilla/). Junto a los aeropuertos: duermen en la bahía de Gando (Canarias7, 13-6-2022) y en Tenerife Sur «cruzan en ocasiones la ruta aeroportuaria» (Diario de Avisos, 1-2012). Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "pardela-cenicienta",
    nombre: "pardela cenicienta",
    cientifico: "Calonectris borealis",
    region: "canarias",
    // «Sólo está presente en aguas y costas españolas entre febrero y octubre».
    meses: [2, 10],
    envergadura: 1.2,
    largo: 0.5,
    color: 0x7f766a,
    forma: "rasante",
    habitat: "mar",
    alturas: [1, 6],
    velocidad: 11,
    aleteo: 2.6,
    amplitud: 0.35,
    planeo: 0.75,
    trepa: 0,
    separacion: 18,
    grupo: [5, 16],
    bandadas: 2,
    recorrido: [1800, 700],
    fuente:
      "SEO/BirdLife: envergadura 1,20-1,25 m, dorso pardo grisáceo; en aguas españolas de febrero a octubre (https://seo.org/ave/pardela-cenicienta-atlantica/). Altura sobre el mar: la de su especie hermana C. diomedea, medida con barómetro, 1,8 ± 2,7 m de media (bioRxiv 10.1101/2023.05.14.540698).",
  },
  {
    id: "cernicalo",
    nombre: "cernícalo",
    cientifico: "Falco tinnunculus canariensis / dacotiae",
    region: "canarias",
    envergadura: 0.73,
    largo: 0.35,
    color: 0xa9683f,
    forma: "cernido",
    habitat: "campo",
    alturas: [10, 20],
    velocidad: 9,
    aleteo: 5,
    amplitud: 0.6,
    planeo: 0,
    trepa: 0,
    separacion: 1,
    grupo: [1, 1],
    bandadas: 2,
    recorrido: [160, 160],
    fuente:
      "ACB Canaria: «la rapaz más abundante… ocupando todas las islas e islotes», dacotiae en las orientales y canariensis en las demás. SEO/BirdLife: envergadura 0,68-0,78 m, dorso rojizo, «se cierne a menudo» (https://seo.org/ave/cernicalo-vulgar/). Altura de caza: «hunt by soaring 10 to 20 m above the ground» (Animal Diversity Web).",
  },
  {
    id: "guirre",
    nombre: "guirre (alimoche canario)",
    cientifico: "Neophron percnopterus majorensis",
    region: "canarias",
    // Fuerteventura y Lanzarote con el Archipiélago Chinijo: 102 nidos y 12 en 2025.
    soloEn: ["fuerteventura", "lanzarote"],
    envergadura: 1.6,
    largo: 0.6,
    color: 0xe9e3d6,
    forma: "termica",
    habitat: "termica",
    alturas: [60, 900],
    velocidad: 11,
    aleteo: 1.6,
    amplitud: 0.35,
    planeo: 0.95,
    trepa: 1.5,
    separacion: 1,
    grupo: [2, 5],
    bandadas: 2,
    recorrido: [1800, 1800],
    fuente:
      "La Voz de Lanzarote (23-5-2026): 102 nidos en Fuerteventura y 12 entre Lanzarote y el Archipiélago Chinijo, 519 ejemplares. SEO/BirdLife: envergadura 1,48-1,71 m, «en vuelo, el adulto aparece como un ave muy blanca». Planea en térmicas (Animal Diversity Web). Altura: Transport Canada, TP 13549 cap. 3: los buitres en térmica «can maintain altitudes greater than 1,000 ft AGL».",
  },
  {
    id: "paloma-bravia",
    nombre: "paloma bravía",
    cientifico: "Columba livia",
    region: "canarias",
    envergadura: 0.66,
    largo: 0.33,
    color: 0x8f96a1,
    forma: "nube",
    habitat: "campo",
    alturas: [10, 60],
    velocidad: 17,
    aleteo: 6,
    amplitud: 0.7,
    planeo: 0.1,
    trepa: 0,
    separacion: 1.6,
    grupo: [12, 35],
    bandadas: 2,
    recorrido: [260, 180],
    fuente:
      "SEO/BirdLife: envergadura 0,63-0,70 m, gris con dos bandas negras, vuelo «muy rápido y directo» (https://seo.org/ave/paloma-bravia/). Junto a Gando duermen en el Roque de Gando (Canarias7, 13-6-2022). Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "aguililla",
    nombre: "aguililla (ratonero)",
    cientifico: "Buteo buteo insularum",
    region: "canarias",
    // «Nidifica en todas las islas de Canarias salvo en Lanzarote».
    soloEn: [
      "tenerife-norte",
      "tenerife-sur",
      "gran-canaria",
      "fuerteventura",
      "la-palma",
      "la-gomera",
      "el-hierro",
    ],
    envergadura: 1.2,
    largo: 0.52,
    color: 0x7b5b3e,
    forma: "termica",
    habitat: "termica",
    alturas: [60, 700],
    velocidad: 10,
    aleteo: 2.4,
    amplitud: 0.4,
    planeo: 0.9,
    trepa: 1.2,
    separacion: 1,
    grupo: [1, 3],
    bandadas: 1,
    recorrido: [1500, 1500],
    fuente:
      "ACB Canaria: «nidifica en todas las islas de Canarias salvo en Lanzarote». SEO/BirdLife: envergadura 1,10-1,32 m, pardo (https://seo.org/ave/busardo-ratonero/). En térmica: Transport Canada, TP 13549 cap. 3, los ratoneros y buitres en térmica «can maintain altitudes greater than 1,000 ft AGL».",
  },
  {
    id: "garcilla-bueyera-canarias",
    nombre: "garcilla bueyera",
    cientifico: "Bubulcus ibis",
    region: "canarias",
    // Cría en Arrecife desde finales de los ochenta y en Tenerife desde 2020.
    soloEn: ["lanzarote", "tenerife-norte", "tenerife-sur"],
    envergadura: 0.9,
    largo: 0.5,
    color: 0xf3f2ec,
    forma: "nube",
    habitat: "campo",
    alturas: DE_TODOS_LOS_DIAS,
    velocidad: 11,
    aleteo: 3.2,
    amplitud: 0.6,
    planeo: 0.1,
    trepa: 0,
    separacion: 2.5,
    grupo: [8, 25],
    bandadas: 1,
    recorrido: [700, 300],
    fuente:
      "Barone 2021, Vieraea 47: cría en Arrecife desde finales de los ochenta (124-175 parejas en 2019) y en Tenerife desde 2020 (Tejina-Bajamar); Diario de Avisos (12-2025): más de 500 en Tenerife. SEO/BirdLife: envergadura 0,82-0,95 m, «muy blanca… en vuelo». Altura: " +
      TRANSPORT_CANADA,
  },

  // ── Paraguay ─────────────────────────────────────────────────────────
  {
    id: "garza-blanca",
    nombre: "garza blanca",
    cientifico: "Ardea alba",
    region: "paraguay",
    envergadura: 1.5,
    largo: 0.9,
    color: 0xf5f5f1,
    forma: "nube",
    habitat: "agua",
    alturas: DE_TODOS_LOS_DIAS,
    velocidad: 11,
    aleteo: 2.3,
    amplitud: 0.55,
    planeo: 0.1,
    trepa: 0,
    separacion: 6,
    grupo: [2, 8],
    bandadas: 2,
    recorrido: [900, 300],
    fuente:
      "Envergadura 1,31-1,70 m, toda blanca (Wikipedia, Great egret; SEO/BirdLife 1,45-1,70 m). Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "garcita-bueyera",
    nombre: "garcita bueyera",
    cientifico: "Bubulcus ibis",
    region: "paraguay",
    envergadura: 0.92,
    largo: 0.5,
    color: 0xf3f2ec,
    forma: "nube",
    habitat: "campo",
    alturas: DE_TODOS_LOS_DIAS,
    velocidad: 11,
    aleteo: 3.2,
    amplitud: 0.6,
    planeo: 0.1,
    trepa: 0,
    separacion: 2.5,
    grupo: [12, 40],
    bandadas: 2,
    recorrido: [700, 300],
    fuente:
      "Animal Diversity Web: envergadura 0,88-0,96 m; come en «loose aggregations… from tens to hundreds of individuals». Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "jabiru",
    nombre: "jabirú (tuyuyú cuartelero)",
    cientifico: "Jabiru mycteria",
    region: "paraguay",
    envergadura: 2.6,
    largo: 1.3,
    color: 0xf2f2ee,
    forma: "termica",
    habitat: "termica",
    alturas: [60, 700],
    velocidad: 12,
    aleteo: 1.8,
    amplitud: 0.35,
    planeo: 0.95,
    trepa: 1.2,
    separacion: 1,
    grupo: [1, 3],
    bandadas: 1,
    recorrido: [2000, 2000],
    fuente:
      "WCS Paraguay lo llama tuyuyú cuartelero: blanco con cabeza y cuello negros. Animal Diversity Web: envergadura media 2,6 m; «during warm periods of the day they may glide on thermal air currents». Altura en térmica: Transport Canada, TP 13549 cap. 3.",
  },
  {
    id: "tuyuyu",
    nombre: "tuyuyú",
    cientifico: "Mycteria americana",
    region: "paraguay",
    envergadura: 1.55,
    largo: 1,
    color: 0xeeeeea,
    forma: "termica",
    habitat: "termica",
    alturas: [60, 500],
    velocidad: 12,
    aleteo: 2,
    amplitud: 0.35,
    planeo: 0.95,
    trepa: 1.3,
    separacion: 1,
    grupo: [10, 30],
    bandadas: 1,
    recorrido: [2000, 2000],
    fuente:
      "«Tuyuyú» a secas es Mycteria americana: Atlas de Guyra (del Castillo 2005) y Azara y Bertoni en ABC Color (25-8-2022), que dice «a veces a bandadas de 30 y 40… se remonta… volando alrededor». Envergadura 1,40-1,80 m (Wikipedia, Wood stork). En térmica, «to altitudes of up to 300 meters or more» (Animal Diversity Web).",
  },
  {
    id: "carancho",
    nombre: "carancho",
    cientifico: "Caracara plancus",
    region: "paraguay",
    envergadura: 1.25,
    largo: 0.56,
    color: 0x4b3d31,
    forma: "nube",
    habitat: "campo",
    alturas: DE_TODOS_LOS_DIAS,
    velocidad: 10,
    aleteo: 2.8,
    amplitud: 0.45,
    planeo: 0.4,
    trepa: 0,
    separacion: 10,
    grupo: [1, 2],
    bandadas: 2,
    recorrido: [320, 220],
    fuente:
      "Envergadura 1,20-1,32 m, pardo oscuro con la mancha clara de las primarias (Wikipedia, Crested caracara). Con el tero, «las dos aves que más impactaban con las turbinas» en el Silvio Pettirossi (Agencia IP, 6-8-2024). Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "cuervillo-de-canada",
    nombre: "cuervillo de cañada",
    cientifico: "Plegadis chihi",
    region: "paraguay",
    envergadura: 0.96,
    largo: 0.5,
    color: 0x4c3b37,
    forma: "uve",
    habitat: "agua",
    alturas: [20, 90],
    // 48-53 km/h.
    velocidad: 14,
    aleteo: 3.4,
    amplitud: 0.55,
    planeo: 0.15,
    trepa: 0,
    separacion: 1,
    grupo: [9, 25],
    bandadas: 2,
    recorrido: [1800, 700],
    fuente:
      "Animal Diversity Web: envergadura 0,94-0,99 m, oscuro con reflejos verdes; «they fly in a V formation with other birds for efficiency», a 48-53 km/h. Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "bigua",
    nombre: "biguá",
    cientifico: "Nannopterum brasilianum",
    region: "paraguay",
    envergadura: 1.02,
    largo: 0.65,
    color: 0x1e1e20,
    forma: "uve",
    habitat: "agua",
    alturas: DE_TODOS_LOS_DIAS,
    velocidad: 15,
    aleteo: 4.2,
    amplitud: 0.5,
    planeo: 0.05,
    trepa: 0,
    separacion: 1,
    grupo: [9, 25],
    bandadas: 2,
    recorrido: [1800, 700],
    fuente:
      "Animal Diversity Web: envergadura unos 1,02 m, «jet black»; «Neotropical cormorants often fly in a V formation». Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "cotorra",
    nombre: "cotorra",
    cientifico: "Myiopsitta monachus",
    region: "paraguay",
    envergadura: 0.48,
    largo: 0.29,
    color: 0x63a84a,
    forma: "nube",
    habitat: "campo",
    alturas: [5, 40],
    velocidad: 13,
    aleteo: 8,
    amplitud: 0.7,
    planeo: 0,
    trepa: 0,
    separacion: 2,
    grupo: [8, 25],
    bandadas: 2,
    recorrido: [420, 260],
    fuente:
      "Envergadura unos 0,48 m, verde brillante, ruidosa (Wikipedia, Monk parakeet); «they live in flocks» y hacen nidos comunales (Animal Diversity Web). Altura: " +
      TRANSPORT_CANADA,
  },
  {
    id: "cuervo-negro",
    nombre: "cuervo negro",
    cientifico: "Coragyps atratus",
    region: "paraguay",
    envergadura: 1.5,
    largo: 0.64,
    color: 0x1d1d1d,
    forma: "termica",
    habitat: "termica",
    alturas: [40, 1000],
    velocidad: 11,
    aleteo: 2.2,
    amplitud: 0.35,
    planeo: 0.9,
    trepa: 1.5,
    separacion: 1,
    grupo: [5, 18],
    bandadas: 2,
    recorrido: [1800, 1800],
    fuente:
      "Envergadura 1,33-1,67 m, negro con la mancha blanca bajo la punta del ala (Wikipedia, Black vulture); «rides thermals upwards» (Animal Diversity Web). " +
      AVERY,
  },
  {
    id: "cuervo-cabeza-colorada",
    nombre: "cuervo cabeza colorada",
    cientifico: "Cathartes aura",
    region: "paraguay",
    envergadura: 1.75,
    largo: 0.72,
    color: 0x3b2f29,
    forma: "termica",
    habitat: "termica",
    alturas: [30, 800],
    velocidad: 10,
    aleteo: 1.8,
    amplitud: 0.3,
    planeo: 0.97,
    trepa: 1.2,
    separacion: 1,
    grupo: [1, 4],
    bandadas: 1,
    recorrido: [1800, 1800],
    fuente:
      "Envergadura 1,70-1,83 m (Animal Diversity Web); alas en V y vuelo en térmica (Wikipedia, Turkey vulture). " +
      AVERY,
  },
  {
    id: "siriri",
    nombre: "sirirí colorado",
    cientifico: "Dendrocygna bicolor",
    region: "paraguay",
    envergadura: 0.89,
    largo: 0.5,
    color: 0xa3683c,
    forma: "nube",
    habitat: "agua",
    alturas: [5, 40],
    velocidad: 15,
    aleteo: 4.5,
    amplitud: 0.5,
    planeo: 0,
    trepa: 0,
    separacion: 2,
    grupo: [10, 30],
    bandadas: 1,
    recorrido: [800, 300],
    fuente:
      "Envergadura 0,85-0,93 m; «flies at low altitude with slow wingbeats and trailing feet, in loose flocks rather than tight formation» (Wikipedia, Fulvous whistling duck): en bandada suelta, no en V.",
  },
  {
    id: "tero",
    nombre: "tero",
    cientifico: "Vanellus chilensis",
    region: "paraguay",
    envergadura: 0.85,
    largo: 0.35,
    color: 0x8a8577,
    forma: "nube",
    habitat: "campo",
    alturas: [3, 30],
    velocidad: 10,
    aleteo: 3,
    amplitud: 0.65,
    planeo: 0,
    trepa: 0,
    separacion: 4,
    grupo: [3, 8],
    bandadas: 2,
    recorrido: [140, 90],
    fuente:
      "FAUBA (aves.agro.uba.ar/ave/tero): envergadura 80-90 cm, «vuelos rasantes y gritos estridentes». Es el ave problema del Silvio Pettirossi: un tero contra un Latam en julio de 2024 (Última Hora) y, con el carancho, las que más chocan (Agencia IP, 6-8-2024).",
  },
];

/*
 * ── La uve ──────────────────────────────────────────────────────────────
 */

/**
 * **Cuánto atrás va cada ave de la uve respecto a la de delante**, en
 * envergaduras: una.
 *
 * Es lo que midieron Portugal et al. (Nature 505, 2014) con GPS en una
 * bandada de ibis eremitas: cada una a unos 1,2 m por detrás y 0,9 de lado
 * con alas de 1,2 m, o sea una envergadura detrás y tres cuartos de lado.
 * Los tres cuartos no se escriben aquí porque salen solos de la estela: son
 * `π/4`, la separación de los torbellinos de un ala. Ver
 * `separacionDeTorbellinos` en `flight/estela.ts`.
 *
 * Y es la misma medida la que enseñó que baten **en fase con el sitio**: cada
 * una sube el ala donde la subió la de delante, y así va todo el aleteo en el
 * aire que sube. Ver `enUve` en `bandadas.ts`.
 */
export const ATRAS_EN_LA_UVE = 1;

/**
 * **Cada cuánto se releva la cabeza**, s.
 *
 * La cabeza es la única que no va en el aire de nadie, y se turnan: Voelkl et
 * al. (PNAS 112, 2015) midieron que las ibis «match the time they spend in the
 * wake of each other by frequent pairwise switches of the leading position».
 * Por parejas y a menudo: la que va delante y la que la sigue se cambian el
 * sitio. Medio minuto es de presentación, para que se vea.
 */
export const RELEVO_EN_CABEZA = 30;

/*
 * ── Por sitio ───────────────────────────────────────────────────────────
 */

/**
 * De qué región es un escenario, o `null` si sus aves no están escritas.
 *
 * Cuatro Vientos, en Madrid, no tiene: las de allí son otras —cigüeñas,
 * milanos, gaviotas sombrías— y no se han comprobado. Sin aves es mejor que
 * con las de otro sitio.
 */
export function regionDe(
  escenario: Pick<Scenario, "pais" | "aerodrome">,
): Region | null {
  const origen = escenario.aerodrome?.origin;
  if (origen && enCanarias(origen)) return "canarias";
  if (escenario.pais === "py" || escenario.pais === "inventado") return "paraguay";
  return null;
}

/** Si un mes cae dentro de `[desde, hasta]`, que puede dar la vuelta al año. */
function enLosMeses(mes: number, [desde, hasta]: readonly [number, number]): boolean {
  return desde <= hasta ? mes >= desde && mes <= hasta : mes >= desde || mes <= hasta;
}

/** Las especies que hay en un sitio este mes. */
export function especiesDelSitio(
  region: Region,
  escenario: string,
  mes: number,
): Especie[] {
  return ESPECIES.filter(
    (e) =>
      e.region === region &&
      (!e.soloEn || e.soloEn.includes(escenario)) &&
      (!e.meses || enLosMeses(mes, e.meses)),
  );
}

/**
 * **Las que se ponen en la final**: las que de verdad se juntan en la senda
 * de un aeropuerto de su tierra.
 *
 * En Canarias, la gaviota: las de Tenerife Sur cruzan la ruta de llegada
 * camino del vertedero de Arico, y las de Gran Canaria duermen en la bahía de
 * Gando (ver su fuente). En Paraguay, la garcita bueyera, que va en bandadas
 * de decenas: el tero y el carancho son los que más chocan en el Silvio
 * Pettirossi, pero van a ras del pasto y solos o en parejas, y esos se
 * cruzan en la pista, no a quinientos pies.
 */
export function especieDeLaFinal(region: Region): Especie {
  const id = region === "canarias" ? "gaviota-patiamarilla" : "garcita-bueyera";
  return ESPECIES.find((e) => e.id === id)!;
}

/**
 * **El halcón del cetrero**: un águila de Harris, que es la que vuelan los
 * dos servicios —la de Canarias y la de Asunción— y la más usada en cetrería
 * en Occidente.
 */
export const HALCON_DEL_CETRERO: Especie = {
  id: "aguila-de-harris",
  nombre: "águila de Harris",
  cientifico: "Parabuteo unicinctus",
  region: "canarias",
  envergadura: 1.1,
  largo: 0.52,
  color: 0x4a3426,
  forma: "cetreria",
  habitat: "campo",
  alturas: [5, 25],
  velocidad: 10,
  aleteo: 3.5,
  amplitud: 0.5,
  planeo: 0.4,
  trepa: 0,
  separacion: 1,
  grupo: [1, 1],
  bandadas: 1,
  recorrido: [38, 38],
  fuente:
    "Envergadura 1,03-1,20 m, pardo oscuro con hombros castaños; «the most popular hawks in the West… for [falconry]» (Wikipedia, Harris's hawk). En los aeropuertos canarios, «halcones peregrinos, águilas de Harris o gerifaltes sacro» (Diario de Avisos, 25-3-2012); en el Silvio Pettirossi, «miranda Harris, la crestuda real, la escudada y los halcones peregrinos» (Agencia IP, 6-8-2024).",
};

/**
 * **Qué campos tienen servicio de control de fauna con cetrería**, y de
 * dónde se sabe. En los demás no se dibuja: que un aeropuerto lo tenga no
 * quiere decir que lo tengan todos, y La Gomera y El Hierro no lo tienen.
 */
export const SERVICIO_DE_FAUNA: Readonly<
  Record<string, { readonly cetreria: boolean; readonly fuente: string }>
> = Object.fromEntries([
  ...[
    "gran-canaria",
    "tenerife-sur",
    "tenerife-norte",
    "fuerteventura",
    "la-palma",
    "lanzarote",
  ].map((id) => [
    id,
    {
      cetreria: true,
      fuente:
        "Aena tiene Servicio de Control de Fauna «basado en el arte de la cetrería» en seis de los ocho aeropuertos canarios: Gran Canaria 22 rapaces, Tenerife Sur 20, Tenerife Norte 16, Fuerteventura 21, La Palma 17 y Lanzarote 14 (Diario de Avisos, 25-3-2012). En Gran Canaria, unos 50 halcones y el centro abierto los 365 días (Canarias7, 13-6-2022).",
    },
  ]),
  [
    "pettirossi",
    {
      cetreria: true,
      fuente:
        "La DINAC repuso la cetrería en el Silvio Pettirossi en 2024 con la empresa Raptor, tras triplicarse los choques desde que se suspendió en 2018 (ABC Color, 30-7-2024): «recorridos constantes por las pistas en un móvil, con las aves rapaces listas para ser soltadas» (Agencia IP, 6-8-2024).",
    },
  ],
]);
