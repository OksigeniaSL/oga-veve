/**
 * La señal del objetivo en curso.
 *
 * Una columna de luz que se ve desde lejos y un aro a la altura del vuelo,
 * los dos del mismo color. Es el mismo recurso que ya funciona para la
 * cabecera de pista —«vuelve hacia la torre naranja»— reutilizado para
 * «ve hacia la torre verde», que es una instrucción que se entiende sin
 * saber leer y sin que nadie la explique.
 *
 * Verde y no ocre a propósito: el ocre ya significa «la pista está allí», y
 * dos cosas distintas no pueden compartir color en un juego que se apoya en
 * el color para no tener que escribir.
 */

import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
} from 'three';

const OBJECTIVE_COLOUR = 0x7ec86a;
/** Alto de la columna, en metros. Tiene que verse por encima de las lomas. */
const BEAM_HEIGHT = 520;

export class MissionMarker {
  readonly group = new Group();
  private readonly ring: Mesh;
  private spin = 0;

  constructor() {
    this.group.name = 'objetivo';
    this.group.visible = false;

    const beam = new Mesh(
      new CylinderGeometry(11, 26, BEAM_HEIGHT, 10, 1, true),
      new MeshBasicMaterial({
        color: OBJECTIVE_COLOUR,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    beam.position.y = BEAM_HEIGHT / 2;
    beam.renderOrder = 2;
    this.group.add(beam);

    // El aro gira despacio: un objeto quieto en un paisaje quieto se pierde,
    // y el movimiento es lo que hace que el ojo lo encuentre.
    this.ring = new Mesh(
      new TorusGeometry(46, 3.4, 6, 26),
      new MeshBasicMaterial({
        color: OBJECTIVE_COLOUR,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.renderOrder = 2;
    this.group.add(this.ring);
  }

  /** Coloca la señal, o la esconde si no hay objetivo con sitio. */
  moveTo(target: { x: number; z: number } | null, groundHeight: number): void {
    if (!target) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    this.group.position.set(target.x, groundHeight, target.z);
    this.ring.position.y = 90;
  }

  update(dt: number): void {
    if (!this.group.visible) return;
    this.spin += dt * 0.6;
    this.ring.rotation.z = this.spin;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        (object.material as MeshBasicMaterial).dispose();
      }
    });
  }
}
