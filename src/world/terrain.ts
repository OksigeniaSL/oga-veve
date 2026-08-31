/**
 * Terreno: malla de relieve, agua, pista y consulta de cota.
 *
 * El relieve se genera aquí por código a partir de la semilla del escenario.
 * Cuando entren los mapas de altura reales de NASADEM, lo único que cambia
 * es de dónde sale `heights`: la malla, el color y el muestreo de cota se
 * quedan como están. Ese es el motivo de que la generación esté aislada en
 * `buildHeightfield` y no repartida por el constructor.
 *
 * El color se calcula por vértice a partir de la altitud y la pendiente. No
 * hay textura ni ortofoto: es una decisión de producto, no una limitación.
 * Ver docs/adr/0003-terreno-nasadem.md.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
} from 'three';
import { ValueNoise2D } from './noise';
import { createRunwayMarkings } from './runway-markings';
import { aLaPolilinea, createAerodrome, type Aerodrome, type Punto } from './aerodrome';
import { delante } from './rumbo';
import type { Scenario } from './scenarios';

/**
 * Dirección desde la que viene la luz, derivada del sol del escenario.
 *
 * Se usa para teñir cada vértice según hacia dónde mira su ladera. Es la
 * mejor relación entre volumen y coste que hay: no hay sombras en el juego
 * —cuestan fotogramas en una tablet— y sin ellas un relieve se lee plano por
 * mucho que tenga bandas de color. Esto se calcula una vez, al construir la
 * malla, y luego es gratis.
 */
function sunVector(scenario: Scenario): { x: number; y: number; z: number } {
  const azimuth = (scenario.sun.azimuth * Math.PI) / 180;
  const elevation = (scenario.sun.elevation * Math.PI) / 180;
  return {
    x: Math.cos(elevation) * Math.sin(azimuth),
    y: Math.sin(elevation),
    z: Math.cos(elevation) * Math.cos(azimuth),
  };
}

export class Terrain {
  readonly group = new Group();
  /** Cota del terreno en cada nudo de la malla, en metros. */
  private readonly heights: Float32Array;
  private readonly resolution: number;
  private readonly step: number;
  private readonly half: number;
  readonly scenario: Scenario;
  /** Cota de la pista. La necesita el juego para colocar el avión. */
  readonly runwayElevation: number;

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.resolution = scenario.segments + 1;
    this.step = scenario.size / scenario.segments;
    this.half = scenario.size / 2;

    this.heights = buildHeightfield(scenario);

    if (scenario.aerodrome) {
      // Se aplana primero y **se mide después**. La cota del aeródromo es la
      // de su punto de referencia, y una pista con pendiente no está a esa
      // cota en ningún punto salvo por casualidad: la de Asunción cae trece
      // metros, así que el avión aparecía seis metros en el aire y se caía
      // nada más empezar.
      flattenAerodrome(this.heights, scenario, scenario.aerodrome);
      this.runwayElevation = this.sampleHeight(scenario.runway.x, scenario.runway.z);
    } else {
      this.runwayElevation = this.sampleHeight(scenario.runway.x, scenario.runway.z);
      flattenRunway(this.heights, scenario, this.runwayElevation);
    }

    this.group.add(this.buildTerrainMesh());
    this.group.add(this.buildWater());
    // Con aeródromo real no se dibuja la pista de juguete: la pone él.
    if (scenario.aerodrome) {
      this.group.add(createAerodrome(scenario.aerodrome, this.runwayElevation));
    } else {
      this.group.add(this.buildRunway());
    }
  }

  /**
   * Cota del terreno en unas coordenadas de mundo, con interpolación
   * bilineal. La llama el modelo de vuelo en cada subpaso —240 veces por
   * segundo— así que no reserva memoria ni hace nada caro.
   */
  sampleHeight(x: number, z: number): number {
    const gx = (x + this.half) / this.step;
    const gz = (z + this.half) / this.step;
    const max = this.resolution - 1;

    const x0 = clampInt(Math.floor(gx), 0, max);
    const z0 = clampInt(Math.floor(gz), 0, max);
    const x1 = clampInt(x0 + 1, 0, max);
    const z1 = clampInt(z0 + 1, 0, max);
    const tx = clamp01(gx - x0);
    const tz = clamp01(gz - z0);

    const h00 = this.heights[z0 * this.resolution + x0] ?? 0;
    const h10 = this.heights[z0 * this.resolution + x1] ?? 0;
    const h01 = this.heights[z1 * this.resolution + x0] ?? 0;
    const h11 = this.heights[z1 * this.resolution + x1] ?? 0;

    return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
  }

  /** Devuelve la cota, pero nunca por debajo del agua: sirve para flotar. */
  sampleSurface(x: number, z: number): number {
    return Math.max(this.sampleHeight(x, z), this.scenario.waterLevel);
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
  }

  // ── Construcción de mallas ────────────────────────────────────────────

  private buildTerrainMesh(): Mesh {
    const { resolution, step, half, heights } = this;
    const vertexCount = resolution * resolution;
    const positions = new Float32Array(vertexCount * 3);
    const colours = new Float32Array(vertexCount * 3);
    const indices = new Uint32Array(this.scenario.segments * this.scenario.segments * 6);

    const tint = new Color();
    // Ruido de color, aparte del de relieve y a frecuencia mucho más baja:
    // produce manchas grandes de tono —un prado más seco, una ladera más
    // oscura— en vez del grano por vértice de la primera versión, que era
    // invisible. Es lo que hace que el terreno parezca pintado y no calculado.
    const patches = new ValueNoise2D(this.scenario.seed ^ 0x5eed);
    const patchScale = 7.5 / this.scenario.size;
    const sun = sunVector(this.scenario);

    for (let row = 0; row < resolution; row++) {
      for (let col = 0; col < resolution; col++) {
        const index = row * resolution + col;
        const height = heights[index] ?? 0;
        positions[index * 3] = -half + col * step;
        positions[index * 3 + 1] = height;
        positions[index * 3 + 2] = -half + row * step;

        const variation = patches.fbm(
          positions[index * 3]! * patchScale,
          positions[index * 3 + 2]! * patchScale,
          3,
        );
        colourFor(
          height,
          this.slopeAt(row, col),
          this.scenario,
          variation,
          this.sunlightAt(row, col, sun),
          tint,
        );
        colours[index * 3] = tint.r;
        colours[index * 3 + 1] = tint.g;
        colours[index * 3 + 2] = tint.b;
      }
    }

    let cursor = 0;
    for (let row = 0; row < this.scenario.segments; row++) {
      for (let col = 0; col < this.scenario.segments; col++) {
        const a = row * resolution + col;
        const b = a + 1;
        const c = a + resolution;
        const d = c + 1;
        // Orden antihorario visto desde arriba: normales hacia +Y.
        indices[cursor++] = a;
        indices[cursor++] = c;
        indices[cursor++] = b;
        indices[cursor++] = b;
        indices[cursor++] = c;
        indices[cursor++] = d;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colours, 3));
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const mesh = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true }));
    mesh.name = 'terreno';
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  private buildWater(): Mesh {
    const geometry = new PlaneGeometry(this.scenario.size * 1.4, this.scenario.size * 1.4);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new Mesh(
      geometry,
      new MeshLambertMaterial({
        color: this.scenario.water,
        transparent: true,
        opacity: 0.86,
      }),
    );
    mesh.position.y = this.scenario.waterLevel;
    mesh.name = 'agua';
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }

  private buildRunway(): Group {
    const { runway } = this.scenario;
    const group = new Group();
    group.name = 'pista';

    const surface = new PlaneGeometry(runway.width, runway.length);
    surface.rotateX(-Math.PI / 2);
    // Lambert y no Basic: con material sin iluminar la pista no compartía la
    // luz del paisaje y se leía como una mancha de barro plana pegada encima.
    const asphalt = new Mesh(surface, new MeshLambertMaterial({ color: 0x7c7268 }));
    group.add(asphalt);

    // Marcas del eje, cada cincuenta metros como en una pista de verdad.
    //
    // Antes eran cinco trazos repartidos por los ochocientos metros centrales,
    // o sea uno cada doscientos: a treinta metros por segundo, una marca cada
    // seis segundos y medio. Eso no comunica velocidad ninguna. La velocidad
    // no se ve, se deduce de lo que pasa cerca, y hacía falta que pasara algo
    // cada segundo y medio.
    const markSpacing = 50;
    const markCount = Math.floor((runway.length * 0.92) / markSpacing);
    const markGeometry = new PlaneGeometry(runway.width * 0.05, markSpacing * 0.55);
    markGeometry.rotateX(-Math.PI / 2);
    const marks = new InstancedMesh(
      markGeometry,
      new MeshLambertMaterial({ color: 0xe8e2d4 }),
      markCount,
    );
    const placement = new Matrix4();
    for (let i = 0; i < markCount; i++) {
      const along = (i - (markCount - 1) / 2) * markSpacing;
      placement.makeTranslation(0, 0.05, along);
      marks.setMatrixAt(i, placement);
    }
    marks.instanceMatrix.needsUpdate = true;
    group.add(marks);

    // Postes de borde, a los dos lados. Son la referencia cercana que de
    // verdad vende la carrera de despegue: pasan a quince metros de la cámara
    // y a doscientos por hora se ven cruzar.
    const postSpacing = 40;
    const postCount = Math.floor((runway.length * 0.98) / postSpacing) * 2;
    const postGeometry = new CylinderGeometry(0.22, 0.28, 1.9, 4);
    postGeometry.translate(0, 0.95, 0);
    const posts = new InstancedMesh(
      postGeometry,
      new MeshLambertMaterial({ color: 0xe4e2da }),
      postCount,
    );
    const edge = runway.width * 0.5 + 4;
    for (let i = 0; i < postCount; i++) {
      const index = Math.floor(i / 2);
      const side = i % 2 === 0 ? -1 : 1;
      const along = (index - postCount / 4 + 0.5) * postSpacing;
      placement.makeTranslation(side * edge, 0, along);
      posts.setMatrixAt(i, placement);
    }
    posts.instanceMatrix.needsUpdate = true;
    group.add(posts);

    group.add(createRunwayMarkings(this.scenario));

    group.position.set(runway.x, this.runwayElevation + 0.15, runway.z);
    group.rotation.y = -(runway.heading * Math.PI) / 180;
    group.updateMatrix();
    group.matrixAutoUpdate = false;
    return group;
  }

  /**
   * Cuánto sol recibe la ladera de un nudo, de 0 (a contraluz) a 1 (de cara).
   *
   * La normal sale del gradiente del campo de alturas, que ya está en
   * memoria, así que esto es aritmética y no geometría. El resultado se
   * mezcla en el color del vértice: laderas al sol más claras y cálidas, en
   * sombra más oscuras y frías. Es lo que hace que un valle se lea como un
   * valle sin una sola sombra proyectada.
   */
  private sunlightAt(row: number, col: number, sun: { x: number; y: number; z: number }): number {
    const max = this.resolution - 1;
    const left = this.heights[row * this.resolution + clampInt(col - 1, 0, max)] ?? 0;
    const right = this.heights[row * this.resolution + clampInt(col + 1, 0, max)] ?? 0;
    const up = this.heights[clampInt(row - 1, 0, max) * this.resolution + col] ?? 0;
    const down = this.heights[clampInt(row + 1, 0, max) * this.resolution + col] ?? 0;

    // Normal sin normalizar: (-dh/dx, 1, -dh/dz) con el paso de malla.
    const nx = -(right - left) / (2 * this.step);
    const nz = -(down - up) / (2 * this.step);
    const length = Math.sqrt(nx * nx + 1 + nz * nz);

    const dot = (nx * sun.x + sun.y + nz * sun.z) / length;
    // Medio Lambert: nunca llega a negro, que a contraluz quedaría muerto.
    return clamp01(0.5 + 0.5 * dot);
  }

  /** Pendiente aproximada, 0 llano, 1 muy inclinado. */
  private slopeAt(row: number, col: number): number {
    const max = this.resolution - 1;
    const left = this.heights[row * this.resolution + clampInt(col - 1, 0, max)] ?? 0;
    const right = this.heights[row * this.resolution + clampInt(col + 1, 0, max)] ?? 0;
    const up = this.heights[clampInt(row - 1, 0, max) * this.resolution + col] ?? 0;
    const down = this.heights[clampInt(row + 1, 0, max) * this.resolution + col] ?? 0;
    const gradient = Math.hypot(right - left, down - up) / (2 * this.step);
    return Math.min(1, gradient * 1.6);
  }
}

// ── Generación del relieve ──────────────────────────────────────────────

/**
 * Genera el campo de alturas del escenario.
 *
 * Mezcla ruido suave —las lomas— con ruido de crestas —las sierras— y
 * después excava el cauce del río. El exponente sobre la altura normalizada
 * es lo que aplana los valles y deja el relieve concentrado arriba: sin él,
 * el terreno parece una manta arrugada uniforme y no un paisaje.
 */
export function buildHeightfield(scenario: Scenario): Float32Array {
  const resolution = scenario.segments + 1;
  const heights = new Float32Array(resolution * resolution);
  const noise = new ValueNoise2D(scenario.seed);
  const step = scenario.size / scenario.segments;
  const half = scenario.size / 2;

  for (let row = 0; row < resolution; row++) {
    const z = -half + row * step;
    for (let col = 0; col < resolution; col++) {
      const x = -half + col * step;
      const nx = (x / scenario.size) * scenario.reliefScale;
      const nz = (z / scenario.size) * scenario.reliefScale;

      const rolling = noise.fbm(nx * 4 + 3.1, nz * 4 + 7.9, 6);
      const ridges = noise.ridged(nx * 5.5 - 11.3, nz * 5.5 + 2.7, 5);
      const mixed = rolling * (1 - scenario.ridgeMix) + ridges * scenario.ridgeMix;

      let height = Math.pow(clamp01(mixed), 1.45) * scenario.reliefHeight;
      height -= riverCarve(x, z, scenario, noise);
      // Suelo del cauce. Sin este tope el río excava un cañón de decenas de
      // metros bajo el nivel del agua y el valle deja de parecer un valle.
      height = Math.max(height, scenario.waterLevel - 32);
      heights[row * resolution + col] = costa(x, z, height, scenario, noise);
    }
  }

  return heights;
}

/**
 * Hundir el relieve al salir de la isla.
 *
 * Se probó primero sin esto: mil cuatrocientas cuarenta combinaciones de
 * semilla y parámetros de relieve, y **ninguna tenía mar**. Y es lógico: el
 * ruido fractal con suelo hace cordilleras que siguen y siguen, no un trozo de
 * tierra rodeado de agua. Una isla no sale de tocar números, hay que decir
 * dónde acaba.
 *
 * La forma es una elipse, y no un círculo, porque las islas volcánicas son
 * alargadas: en Tenerife el aeropuerto está en el cuello estrecho del noreste,
 * con el mar a cinco kilómetros a cada lado y la isla siguiendo hacia el Teide.
 * Un círculo habría puesto costa donde hay macizo.
 *
 * El borde no es liso: se le suma un poco de ruido para que la costa tenga
 * entrantes y salientes. Una línea de playa perfectamente elíptica se ve desde
 * el aire y canta.
 */
function costa(
  x: number,
  z: number,
  height: number,
  scenario: Scenario,
  noise: ValueNoise2D,
): number {
  const isla = scenario.island;
  if (!isla) return height;

  const [cx, cz] = isla.centre;
  const t = (isla.heading * Math.PI) / 180;
  // Ejes de la isla: el mayor a lo largo de su rumbo.
  const dx = x - cx;
  const dz = z - cz;
  const largo = dx * Math.sin(t) - dz * Math.cos(t);
  const ancho = dx * Math.cos(t) + dz * Math.sin(t);

  const [a, b] = isla.radii;
  const d = Math.hypot(largo / a, ancho / b);
  // Ruido en el borde: ±12 % del radio, que en la escala de Tenerife son unos
  // quinientos metros de entrantes y salientes.
  const rugoso = d * (1 + (noise.fbm(x / 900 + 41.7, z / 900 - 18.3, 3) - 0.5) * 0.24);

  const orilla = isla.shore / Math.min(a, b);
  if (rugoso <= 1) return height;
  if (rugoso >= 1 + orilla) return scenario.waterLevel - isla.depth;

  // Caída suave de la costa al fondo. Sin suavizar, la orilla es un escalón.
  const u = (rugoso - 1) / orilla;
  const s = u * u * (3 - 2 * u);
  return height * (1 - s) + (scenario.waterLevel - isla.depth) * s;
}

/**
 * Profundidad excavada por el río en un punto.
 *
 * El cauce serpentea con una sinusoide perturbada por el propio ruido, para
 * que no se note el seno. El corte es una campana: hondo en el centro y
 * difuminado en los bordes, que es como se ve un valle fluvial desde arriba.
 */
function riverCarve(x: number, z: number, scenario: Scenario, noise: ValueNoise2D): number {
  if (scenario.riverWidth <= 0) return 0;

  const t = x / scenario.size;
  const meander = Math.sin(t * Math.PI * 2.4) * scenario.size * 0.16;
  const wobble = (noise.noise(t * 6.3, 4.2) - 0.5) * scenario.size * 0.06;
  const distance = Math.abs(z - (meander + wobble));

  const reach = scenario.riverWidth * 3.2;
  if (distance > reach) return 0;

  const falloff = 1 - distance / reach;
  return scenario.reliefHeight * 0.55 * falloff * falloff;
}

/**
 * Aplana la pista y sus alrededores.
 *
 * Se hace después de generar el relieve, no durante: hay que saber primero a
 * qué cota está el terreno donde va la pista. El difuminado del borde evita
 * el escalón de meseta que delataría el truco.
 */
function flattenRunway(heights: Float32Array, scenario: Scenario, elevation: number): void {
  const resolution = scenario.segments + 1;
  const step = scenario.size / scenario.segments;
  const half = scenario.size / 2;
  const { runway } = scenario;
  // **Los mismos ejes con los que se dibuja la pista.** Aquí ponía
  // `(sen h, +cos h)` y la pista se dibuja sobre `(sen h, −cos h)`: dos rectas
  // que se cruzan, así que se aplanaba una franja y se pintaba la pista sobre
  // otra. En el valle no se veía porque va a 90° y ahí las dos coinciden; en
  // el Chaco, a 30°, la pista quedaba sobre terreno sin tocar con 43 m de
  // desnivel a lo largo — enterrada por un extremo y **en el aire por el
  // otro**, que es justo como se veía.
  //
  // Es el fallo que dio origen a `rumbo.ts`, y este era el ejemplar que se
  // quedó sin corregir.
  const [sin, cos] = delante(runway.heading);

  // El núcleo plano se ensancha hasta cubrir al menos un par de celdas de
  // la malla. Una pista de 30 m sobre una malla de 36 m por celda no llegaría
  // a poner ningún nudo a la cota de la pista, y quedaría un lomo por el
  // centro con el que el avión tropieza al despegar.
  // Se suma una celda entera para que la superficie pintada de la pista
  // caiga completa dentro de la zona plana, bordes incluidos.
  const alongCore = Math.max(runway.length * 0.5, step * 1.5) + step;
  const acrossCore = Math.max(runway.width * 0.5, step * 1.5) + step;
  const alongReach = alongCore + 260;
  const acrossReach = acrossCore + 190;

  for (let row = 0; row < resolution; row++) {
    const z = -half + row * step - runway.z;
    for (let col = 0; col < resolution; col++) {
      const x = -half + col * step - runway.x;
      // Coordenadas locales de pista: a lo largo y a lo ancho.
      const along = x * sin + z * cos;
      const across = x * cos - z * sin;
      if (Math.abs(along) > alongReach || Math.abs(across) > acrossReach) continue;

      const weight = Math.min(
        smoothFalloff(Math.abs(along), alongCore, alongReach),
        smoothFalloff(Math.abs(across), acrossCore, acrossReach),
      );
      if (weight <= 0) continue;

      const index = row * resolution + col;
      const current = heights[index] ?? 0;
      heights[index] = current + (elevation - current) * weight;
    }
  }
}

/** 1 dentro del núcleo, 0 fuera del alcance, transición suave entre medias. */
/**
 * Aplana el terreno bajo un aeródromo real, respetando el perfil de su pista.
 *
 * Un aeródromo no es una pista suelta: son cincuenta calles de rodaje y
 * veinte plataformas repartidas por un par de kilómetros. Aplanarlo pista a
 * pista dejaría lomos por debajo del pavimento, así que se aplana **la huella
 * entera** con una rampa de mezcla al borde.
 *
 * Y la cota objetivo **no es constante**: a lo largo del eje de la pista sigue
 * su pendiente real —los trece metros de caída de Asunción— y fuera de ella se
 * queda a la cota del aeródromo. Sin eso, el pavimento con pendiente quedaría
 * flotando sobre un suelo plano por un extremo y enterrado por el otro.
 */
/** Cuánto sobresale el pavimento sobre el terreno aplanado, m. */
const RESALTE = 0.35;

function flattenAerodrome(heights: Float32Array, scenario: Scenario, aero: Aerodrome): void {
  const resolution = scenario.segments + 1;
  const step = scenario.size / scenario.segments;
  const half = scenario.size / 2;
  const base = aero.elevationM ?? 0;

  // **La huella no es un círculo: es una banda a lo largo de la pista.**
  //
  // Aplanando en redondo alrededor del punto de referencia salía un disco liso
  // de cuatro kilómetros que desde el aire se veía como lo que era: un disco.
  // Un aeropuerto de verdad es una terraza alargada, porque lo que hubo que
  // explanar fue la pista y lo que la rodea.
  //
  // El ancho de la banda **sale de los datos**, no de un número puesto a mano:
  // se mide qué es lo más apartado del eje que hay que sostener. En Tenerife
  // Norte es un edificio a 394 m; en Silvio Pettirossi, una plataforma a 850.
  const eje = aero.runways[0]?.centerline ?? [];
  let lateral = 0;
  const mirar = (pts: readonly Punto[]) => {
    for (const p of pts) lateral = Math.max(lateral, aLaPolilinea(p, eje));
  };
  for (const t of aero.taxiways) mirar(t.path);
  for (const a of aero.aprons) mirar(a.polygon);
  for (const b of aero.buildings) mirar(b.polygon);
  mirar(aero.windsocks);
  const nucleo = (eje.length ? lateral : 0) + step * 2 + 60;

  // Perfil de la pista principal, para la cota a lo largo del eje.
  const pista = aero.runways[0];
  const umbrales = pista
    ? Object.values(pista.thresholds).filter(
        (u): u is NonNullable<typeof u> => u !== null && u.xy !== null && u.elevM !== null,
      )
    : [];
  const [a, b] = umbrales;

  const cota = (x: number, z: number): number => {
    if (!a || !b) return base;
    const ax = a.xy![0];
    const ay = a.xy![1];
    const dx = b.xy![0] - ax;
    const dy = b.xy![1] - ay;
    const largo2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - ay) * dy) / largo2));
    return a.elevM! + (b.elevM! - a.elevM!) * t;
  };

  // Cuánto tiene que moverse el terreno para recibir al aeródromo. Si el
  // relieve de alrededor ya estaba a su cota, el margen de cuatrocientos
  // metros sobra; si el aeródromo está en una meseta a seiscientos metros y
  // el ruido dejó el llano a doscientos, cuatrocientos metros de mezcla son
  // **un acantilado de cuatrocientos por cuatrocientos**, y el juego pone un
  // muro alrededor del aeropuerto.
  //
  // Así que la mezcla se estira con el desnivel, a razón de ocho a uno: una
  // cuesta empinada, de las que hay de verdad subiendo a La Laguna, pero
  // cuesta y no pared. Con tope, porque estirarla sin límite deja alrededor
  // del aeropuerto un disco liso que desde el aire canta.
  const bordeX = nucleo + 400;
  const desnivel = Math.abs(cota(0, 0) - sampleGrid(heights, resolution, step, half, bordeX, 0));
  const alcance = nucleo + Math.max(400, Math.min(desnivel * 8, 1800));

  for (let row = 0; row < resolution; row++) {
    const mundoZ = -half + row * step;
    for (let col = 0; col < resolution; col++) {
      const mundoX = -half + col * step;
      // Coordenadas del fichero: su origen es el punto de referencia del
      // aeropuerto, que está en el (0, 0) del mundo, y su Y apunta al norte.
      const x = mundoX;
      const z = -mundoZ;
      // Distancia **al eje de la pista**, no al punto de referencia.
      const d = eje.length ? aLaPolilinea([x, z], eje) : Math.hypot(x, z);
      if (d >= alcance) continue;
      const peso = smoothFalloff(d, nucleo, alcance);
      const i = row * resolution + col;
      // El terreno se aplana un pelín **por debajo** del pavimento. A la
      // misma cota exacta, el asfalto queda enterrado por el redondeo de la
      // malla y no se ve nada. Un firme real también sobresale de su
      // explanada, así que además es lo que toca.
      heights[i] = heights[i]! * (1 - peso) + (cota(x, z) - RESALTE) * peso;
    }
  }
}

/** Cota de la malla en un punto del mundo, por vecino más cercano. */
function sampleGrid(
  heights: Float32Array,
  resolution: number,
  step: number,
  half: number,
  x: number,
  z: number,
): number {
  const col = Math.round((x + half) / step);
  const row = Math.round((z + half) / step);
  if (col < 0 || row < 0 || col >= resolution || row >= resolution) return 0;
  return heights[row * resolution + col]!;
}

function smoothFalloff(distance: number, core: number, reach: number): number {
  if (distance <= core) return 1;
  if (distance >= reach) return 0;
  const t = 1 - (distance - core) / (reach - core);
  return t * t * (3 - 2 * t);
}

// ── Color ───────────────────────────────────────────────────────────────

/**
 * Color de un vértice según su altitud, su pendiente y la mancha de color
 * que le toca.
 *
 * Las bandas de altitud dan el aspecto ilustrado que buscamos, pero solo si
 * se distinguen: la banda no se elige a secas, se mezcla un poco con la
 * vecina en el borde para que la transición se lea como pincelada y no como
 * escalón de mapa topográfico.
 *
 * La pendiente desatura hacia roca, que es lo que hace que un barranco se
 * lea como barranco sin textura ninguna. Y la mancha de baja frecuencia
 * rompe la uniformidad: sin ella, dos laderas a la misma altura salen
 * exactamente del mismo color y se nota que lo ha pintado una máquina.
 */
function colourFor(
  height: number,
  slope: number,
  scenario: Scenario,
  variation: number,
  sunlight: number,
  out: Color,
): void {
  const bands = scenario.bands;
  let index = 0;
  for (let i = 0; i < bands.length; i++) {
    if (height >= bands[i]!.from) index = i;
  }

  const current = bands[index]!;
  out.setHex(current.colour);

  // Difuminado hacia la banda siguiente en el último tramo antes del salto.
  const next = bands[index + 1];
  if (next) {
    const span = next.from - current.from;
    const progress = span > 0 ? (height - current.from) / span : 0;
    if (progress > 0.72) {
      BLEND.setHex(next.colour);
      out.lerp(BLEND, (progress - 0.72) / 0.28 * 0.5);
    }
  }

  out.lerp(ROCK, Math.pow(slope, 1.15) * 0.8);

  // La mancha mueve la luminosidad arriba y abajo, y de paso empuja un poco
  // hacia el verde húmedo las zonas bajas de cada mancha.
  const shade = 0.86 + variation * 0.3;
  out.multiplyScalar(shade);
  if (variation < 0.42) out.lerp(DAMP, (0.42 - variation) * 0.5);

  // Y donde la mancha es alta, monte: verde de dosel, más oscuro y más
  // saturado. Desde tres mil metros un bosque no se ve como árboles sueltos,
  // se ve como una mancha de color distinta, y eso es lo que pinta esta
  // línea. Los árboles de verdad solo hacen falta cerca.
  if (variation > 0.58) out.lerp(CANOPY, (variation - 0.58) * 1.5);

  // Y la orientación al sol, que es lo que da el volumen. La ladera de
  // enfrente se calienta hacia el ocre; la de espaldas se enfría hacia el
  // azul de la sombra, que es lo que hace el cielo en un valle de verdad.
  out.multiplyScalar(0.72 + sunlight * 0.5);
  if (sunlight > 0.62) out.lerp(WARM, (sunlight - 0.62) * 0.5);
  else out.lerp(COOL, (0.62 - sunlight) * 0.55);

  // Bajo el agua se apaga: no se ve el fondo pero tampoco se ve un prado
  // verde debajo de un río, que es lo que pasaría sin esto.
  if (height < scenario.waterLevel) out.lerp(DEEP, 0.6);
}

const WARM = new Color(0xd9c48a);
const COOL = new Color(0x4a6480);
const ROCK = new Color(0x9b9186);
const DEEP = new Color(0x27485a);
const DAMP = new Color(0x38663f);
const CANOPY = new Color(0x27502e);
const BLEND = new Color();

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function clampInt(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
