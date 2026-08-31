/**
 * Señalización de pista.
 *
 * Antes la pista era un rectángulo marrón con unos trazos por el eje. Una
 * pista de verdad está cubierta de marcas, y no por adorno: cada una dice
 * algo, y quien aprende aquí las va a reconocer el día que mire por la
 * ventanilla de un avión de línea.
 *
 * Lo que se pinta, de cabecera hacia dentro:
 *
 * - **Umbral en piano**: la franja de barras gruesas que marca dónde empieza
 *   el asfalto utilizable. Es la marca más reconocible que existe.
 * - **Designador**: el número de la pista. Y aquí está la lección regalada —
 *   **ese número es el rumbo magnético**. La 09 apunta al 090. Al alinearse,
 *   el rumbo del HUD coincide con el número pintado en el suelo, y el clic
 *   mental está garantizado sin que nadie lo explique.
 * - **Punto de toma**: los dos rectángulos gordos a unos trescientos metros,
 *   que es donde hay que posar las ruedas.
 * - **Zona de toma**: los pares de barras que van contando distancia.
 * - **Líneas de borde**: dicen dónde acaba lo pavimentado, que es
 *   exactamente lo que faltaba cuando el avión se salía y seguía rodando.
 *
 * Todo en geometría plana y colores planos, sin una sola imagen: los números
 * se dibujan en un lienzo al arrancar. Ver la dirección de arte.
 */

import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
} from 'three';
import type { Scenario } from './scenarios';

const PAINT = 0xe8e2d4;

/**
 * Construye las marcas en coordenadas locales de pista: +Z hacia la cabecera
 * de entrada, el eje en x = 0.
 */
export function createRunwayMarkings(scenario: Scenario): Group {
  const group = new Group();
  group.name = 'marcas';

  const { runway } = scenario;
  const material = new MeshLambertMaterial({ color: PAINT, side: DoubleSide });

  // Líneas de borde, continuas de punta a punta.
  for (const side of [-1, 1]) {
    group.add(
      slab(runway.width * 0.055, runway.length * 0.98, material, side * (runway.width * 0.46), 0),
    );
  }

  // Las dos cabeceras. La de entrada mira al rumbo de la pista; la contraria,
  // al recíproco: la 09 por un lado es la 27 por el otro, y es el mismo
  // trozo de asfalto.
  addThreshold(group, scenario, material, 1, runway.heading);
  addThreshold(group, scenario, material, -1, (runway.heading + 180) % 360);

  return group;
}

/**
 * @param sign +1 para la cabecera en +Z, -1 para la contraria
 * @param heading rumbo con el que se aterriza por esta cabecera
 */
function addThreshold(
  group: Group,
  scenario: Scenario,
  material: MeshLambertMaterial,
  sign: number,
  heading: number,
): void {
  const { runway } = scenario;
  const edge = (runway.length / 2) * sign;

  // Umbral en piano: ocho barras a lo ancho, separadas del borde.
  const bars = 8;
  const barWidth = runway.width * 0.055;
  const barLength = runway.width * 0.9;
  for (let i = 0; i < bars; i++) {
    const offset = (i - (bars - 1) / 2) * runway.width * 0.105;
    group.add(slab(barWidth, barLength, material, offset, edge - sign * (barLength / 2 + 8)));
  }

  // Designador. El texto se dibuja en un lienzo y se pega en un plano: dos
  // cifras no justifican una fuente ni un fichero de imagen.
  const label = designator(heading);
  const texture = numberTexture(label);
  const plate = new Mesh(
    new PlaneGeometry(runway.width * 0.62, runway.width * 0.78),
    new MeshLambertMaterial({
      map: texture,
      color: texture ? 0xffffff : PAINT,
      transparent: true,
      side: DoubleSide,
    }),
  );
  plate.rotation.x = -Math.PI / 2;
  // El número se lee desde el aire viniendo por esta cabecera, así que hay
  // que darle la vuelta en la contraria.
  plate.rotation.z = sign > 0 ? 0 : Math.PI;
  plate.position.set(0, 0.06, edge - sign * (runway.width * 1.6));
  group.add(plate);

  // Punto de toma: dos rectángulos gordos a trescientos metros del umbral.
  for (const side of [-1, 1]) {
    group.add(
      slab(
        runway.width * 0.14,
        runway.width * 1.5,
        material,
        side * runway.width * 0.24,
        edge - sign * 300,
      ),
    );
  }

  // Zona de toma: pares de barras contando distancia cada ciento cincuenta.
  for (const distance of [150, 450, 600]) {
    for (const side of [-1, 1]) {
      group.add(
        slab(
          runway.width * 0.06,
          runway.width * 0.75,
          material,
          side * runway.width * 0.24,
          edge - sign * distance,
        ),
      );
    }
  }
}

/**
 * Número de pista a partir del rumbo: las decenas, redondeadas, con cero a la
 * izquierda. Rumbo 090 es la pista 09; rumbo 275 es la 27.
 */
/**
 * El número pintado en una cabecera, a partir de su rumbo.
 *
 * **AVISO: el rumbo que hay que darle es el MAGNÉTICO, no el verdadero.**
 *
 * El designador de una pista son los primeros dos dígitos de su rumbo
 * magnético. Y la diferencia no es un detalle: el umbral 02 de Silvio
 * Pettirossi apunta a **10° verdaderos**, así que calcularlo desde el rumbo
 * verdadero daría «01» y habríamos pintado el número equivocado en una pista
 * de verdad. Con escenarios inventados nunca se nota, porque allí no hay
 * declinación; con aeródromos reales, sí.
 *
 * Para los aeródromos extraídos no hace falta llamar a esta función: el
 * designador real viene en el propio `.aero.json`, y ahí va también la
 * declinación deducida. Esto es para el terreno inventado.
 *
 * Y la comprobación que sirve siempre: **las dos cabeceras de una pista se
 * diferencian en 18**, y no hay ninguna por encima de 36.
 */
export function designator(heading: number): string {
  const normalised = ((heading % 360) + 360) % 360;
  const tens = Math.round(normalised / 10) || 36;
  return String(tens).padStart(2, '0');
}

/** Un rectángulo de pintura tumbado sobre el asfalto. */
function slab(
  width: number,
  length: number,
  material: MeshLambertMaterial,
  x: number,
  z: number,
): Mesh {
  const geometry = new PlaneGeometry(width, length);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, 0.05, z);
  return mesh;
}

/**
 * Dibuja el número en un lienzo. Cero bytes de imagen en el paquete.
 *
 * Devuelve `null` donde no hay DOM —los tests corren en Node— para que la
 * geometría del escenario se pueda construir y comprobar sin navegador. Los
 * tests del terreno y de la senda de aproximación se rompieron justo aquí en
 * cuanto la pista empezó a llevar números.
 */
function numberTexture(label: string): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#e8e2d4';
  // Tipografía de pista: muy estrecha y muy alta, como la de verdad.
  context.font = `bold ${size * 0.78}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.setTransform(0.72, 0, 0, 1, size / 2, size / 2);
  context.fillText(label, 0, 0);
  return new CanvasTexture(canvas);
}
