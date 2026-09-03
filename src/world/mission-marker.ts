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
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
} from "three";

const OBJECTIVE_COLOUR = 0x7ec86a;

/**
 * Los dos colores del aro: lejos y encima.
 *
 * Del ocre apagado al verde de «bien». No es una escala de colores que haya
 * que aprender —eso ya lo hace el PAPI y con eso basta—: es un solo objeto que
 * se enciende, y encenderse se entiende sin que nadie lo explique.
 */
const APAGADO = 0xc98a3a;
const ENCENDIDO = 0x7ef07a;
/** Alto de la columna, en metros. Tiene que verse por encima de las lomas. */
const BEAM_HEIGHT = 520;

export class MissionMarker {
  readonly group = new Group();
  private readonly ring: Mesh;
  private beam: Mesh | null = null;
  private spin = 0;
  /** Radio de aceptación del objetivo, m. De él sale «cerca». */
  private radio = 400;
  /** Cuánto se ha encendido, de 0 a 1. Se suaviza para que no parpadee. */
  private encendido = 0;

  constructor() {
    this.group.name = "objetivo";
    this.group.visible = false;

    /*
     * **La columna se abre hacia arriba, no se afila.**
     *
     * Estaba al revés —ancha abajo y estrecha arriba— y eso es exactamente el
     * dibujo de una flecha apuntando al cielo: «¿me pide subir? ¿que tengo que
     * ir por encima del aro?». Lo contrario de lo que hace falta, porque el
     * sitio al que hay que ir es el aro y hay que pasar **por dentro**.
     *
     * Abriéndose hacia arriba se lee como lo que es: un haz de luz que sale
     * del suelo para que lo encuentres desde lejos. Eso no apunta a ninguna
     * parte — señala un punto.
     */
    const beam = new Mesh(
      new CylinderGeometry(26, 11, BEAM_HEIGHT, 10, 1, true),
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
    this.beam = beam;

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
  moveTo(
    target: { x: number; z: number } | null,
    groundHeight: number,
    radio = 400,
  ): void {
    if (!target) {
      this.group.visible = false;
      return;
    }
    this.radio = radio;
    this.group.visible = true;
    this.group.position.set(target.x, groundHeight, target.z);
    this.ring.position.y = 90;
  }

  /**
   * Gira el aro, y **lo enciende cuando vas bien**.
   *
   * Girar despacio bastaba para que el ojo lo encontrara, pero no decía nada
   * más: el aro estaba igual de apagado a diez kilómetros que a punto de
   * atravesarlo. «Los aros deberían hacer algo, brillar o algo que ayude a
   * entender que vas bien.»
   *
   * Ahora responde a la distancia, que es la única pregunta que tiene un aro:
   * ¿me estoy acercando? Se enciende progresivamente desde cuatro veces su
   * radio de aceptación —brillo, grosor de color y velocidad de giro suben a
   * la vez— y dentro del radio late. Tres señales de la misma cosa, porque a
   * los cuatro años una sola se pierde.
   *
   * Lo que **no** hace es esperar a que aciertes para avisar. Un aro que solo
   * se enciende al atravesarlo llega tarde: para entonces ya no hacía falta.
   */
  update(dt: number, avion?: { x: number; z: number }): void {
    if (!this.group.visible) return;

    if (avion) {
      const d = Math.hypot(
        avion.x - this.group.position.x,
        avion.z - this.group.position.z,
      );
      // Cero a cuatro radios, uno dentro del radio.
      const cerca = Math.max(
        0,
        Math.min(1, (this.radio * 4 - d) / (this.radio * 3)),
      );
      // Suavizado: sin esto, volar en el borde hace parpadear el aro.
      this.encendido += (cerca - this.encendido) * Math.min(1, dt * 2);
    }

    /*
     * **La columna solo existe de lejos.**
     *
     * Darle la vuelta al cono no bastó, y el motivo es más de fondo: cerca del
     * objetivo, **cualquier cosa vertical se lee como «arriba»**. Da igual la
     * forma — hay una raya que sube, y quien la mira entiende que hay que
     * subir. «¿Me pide subir? ¿Que tengo que ir por encima del aro?»
     *
     * Y la columna solo sirve para una cosa: encontrar el sitio desde lejos.
     * Encima del aro ya no hace falta y solo puede confundir, así que se
     * apaga. Lo que queda cerca es el aro, que es por donde hay que pasar.
     */
    if (this.beam) {
      const d = avion
        ? Math.hypot(
            avion.x - this.group.position.x,
            avion.z - this.group.position.z,
          )
        : Infinity;
      this.beam.visible = d > this.radio * 6;
    }

    const e = this.encendido;
    // El latido, solo cuando ya estás dentro. Fuera sería ruido.
    const late = e > 0.92 ? 0.12 * Math.sin(this.spin * 7) : 0;
    for (const hijo of this.group.children) {
      if (!hijo.visible) continue;
      const mat = (hijo as Mesh).material as MeshBasicMaterial;
      const base = hijo === this.ring ? 0.72 : 0.3;
      mat.opacity = Math.min(1, base * (0.55 + e * 0.9) + late);
      mat.color.setHex(APAGADO).lerp(new Color(ENCENDIDO), e);
    }
    this.ring.scale.setScalar(1 + late * 1.6);

    // Y gira más deprisa cuanto más cerca: el movimiento también informa.
    this.spin += dt * (0.6 + e * 2.4);
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
