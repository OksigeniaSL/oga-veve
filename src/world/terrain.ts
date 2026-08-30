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
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
} from 'three';
import { ValueNoise2D, mulberry32 } from './noise';
import type { Scenario } from './scenarios';

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
    this.runwayElevation = this.sampleHeight(scenario.runway.x, scenario.runway.z);
    flattenRunway(this.heights, scenario, this.runwayElevation);

    this.group.add(this.buildTerrainMesh());
    this.group.add(this.buildWater());
    this.group.add(this.buildRunway());
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
    const dither = mulberry32(this.scenario.seed ^ 0x5eed);

    for (let row = 0; row < resolution; row++) {
      for (let col = 0; col < resolution; col++) {
        const index = row * resolution + col;
        const height = heights[index] ?? 0;
        positions[index * 3] = -half + col * step;
        positions[index * 3 + 1] = height;
        positions[index * 3 + 2] = -half + row * step;

        colourFor(height, this.slopeAt(row, col), this.scenario, dither(), tint);
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
    const asphalt = new Mesh(surface, new MeshBasicMaterial({ color: 0x6f6255 }));
    group.add(asphalt);

    // Marcas del eje. Cinco trazos bastan para dar referencia visual al
    // aterrizar; más serían polígonos gastados en algo que no se mira.
    const markCount = 5;
    const markGeometry = new PlaneGeometry(runway.width * 0.06, runway.length * 0.08);
    markGeometry.rotateX(-Math.PI / 2);
    const markMaterial = new MeshBasicMaterial({ color: 0xe8e2d4 });
    for (let i = 0; i < markCount; i++) {
      const mark = new Mesh(markGeometry, markMaterial);
      mark.position.set(0, 0.05, (i / (markCount - 1) - 0.5) * runway.length * 0.72);
      group.add(mark);
    }

    group.position.set(runway.x, this.runwayElevation + 0.15, runway.z);
    group.rotation.y = -(runway.heading * Math.PI) / 180;
    group.updateMatrix();
    group.matrixAutoUpdate = false;
    return group;
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
      heights[row * resolution + col] = Math.max(height, scenario.waterLevel - 32);
    }
  }

  return heights;
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
  const heading = (runway.heading * Math.PI) / 180;
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);

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
function smoothFalloff(distance: number, core: number, reach: number): number {
  if (distance <= core) return 1;
  if (distance >= reach) return 0;
  const t = 1 - (distance - core) / (reach - core);
  return t * t * (3 - 2 * t);
}

// ── Color ───────────────────────────────────────────────────────────────

/**
 * Color de un vértice según su altitud y su pendiente.
 *
 * Las bandas dan el aspecto ilustrado que buscamos. La pendiente oscurece y
 * desatura hacia roca: es lo que hace que un barranco se lea como barranco
 * sin necesidad de textura. El grano aleatorio rompe el bandeado limpio, que
 * de otro modo canta a degradado de ordenador.
 */
function colourFor(
  height: number,
  slope: number,
  scenario: Scenario,
  grain: number,
  out: Color,
): void {
  let chosen = scenario.bands[0]?.colour ?? 0x808080;
  for (const band of scenario.bands) {
    if (height >= band.from) chosen = band.colour;
  }
  out.setHex(chosen);

  const rock = Math.pow(slope, 1.3);
  out.lerp(ROCK, rock * 0.65);

  const shade = 0.94 + grain * 0.12;
  out.multiplyScalar(shade);

  // Bajo el agua se apaga: no se ve el fondo pero tampoco se ve un prado
  // verde debajo de un río, que es lo que pasaría sin esto.
  if (height < scenario.waterLevel) out.lerp(DEEP, 0.55);
}

const ROCK = new Color(0x8a8378);
const DEEP = new Color(0x2c4f5e);

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function clampInt(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
