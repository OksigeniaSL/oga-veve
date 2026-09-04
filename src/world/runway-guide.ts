/**
 * Ayudas visuales para volver a la pista y posarse.
 *
 * Existen porque despegar ya se conseguía y aterrizar no: "meterlo de nuevo
 * en la pista es difícil, no lo aterrizo". Y con razón — una pista de mil
 * cien metros en un valle de catorce kilómetros es invisible desde el aire,
 * y aunque se encuentre, no hay nada que diga por dónde bajar.
 *
 * Tres piezas, todas sin una sola palabra escrita:
 *
 * 1. Un haz de luz vertical sobre la cabecera, visible desde lejos. Es el
 *    "vuelve hacia la torre naranja" que entiende cualquiera.
 * 2. Dos postes altos flanqueando el umbral, que dan referencia de anchura
 *    y de altura en los últimos metros, cuando el suelo plano engaña.
 * 3. Una hilera de aros descendiendo hacia el umbral, que dibujan en el aire
 *    la senda de planeo. No hay mejor forma de enseñar a bajar que dibujar
 *    por dónde.
 *
 * Ver AGENTS.md, regla 2: lo esencial no puede depender de leer.
 */

import {
  Color,
  Vector3,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  TorusGeometry,
} from "three";
import { delante } from "./rumbo";
import type { Scenario } from "./scenarios";

/** Cota del terreno en unas coordenadas de mundo. */
export type GroundSampler = (x: number, z: number) => number;

/**
 * Margen mínimo entre un aro y el terreno que tiene debajo, en metros.
 *
 * Existe porque la primera versión colocaba los aros sobre una senda recta
 * de cuatro grados sin mirar el relieve, y en el valle algunos quedaban
 * **dentro de una loma**: el juego dibujaba una guía que llevaba a chocar.
 * Ahora la senda sube por encima del terreno cuando hace falta, que es
 * además lo que hace una aproximación de verdad — la trayectoria tiene que
 * salvar los obstáculos.
 */
const RING_TERRAIN_CLEARANCE = 55;

const OCRE = 0xdd923f;

/**
 * El color del aro cuando ya lo tienes encima.
 *
 * Del ocre de «ahí está» al verde de «vas bien». No hay que aprenderse ninguna
 * escala: es un objeto que se enciende, y encenderse se entiende sin que nadie
 * lo explique.
 */
const CERCA = 0x7ef07a;

/** Y el de haberlo perdido. Ni castigo ni drama: un rojo que se apaga solo. */
const FALLADO = 0xe8624a;
const TERRACOTA = 0xbe5d38;
const BEIGE = 0xe4e2da;

/** Cuántos aros dibujan la senda y desde qué distancia arrancan. */
const RING_COUNT = 7;
const FIRST_RING_DISTANCE = 3200;
/** Pendiente de la senda. Cuatro grados: cómoda y perdona el error. */
const GLIDE_SLOPE = (4 * Math.PI) / 180;

/**
 * Guía de aterrizaje viva.
 *
 * Los aros dejaron de ser decorado: saben cuál es el siguiente, se encienden
 * al atravesarlos y se apagan cuando ya han pasado. Es la respuesta a algo
 * que se pidió jugando —«que al pasar bien por el círculo pase algo»— y es
 * también la forma más barata de enseñar una senda de planeo a alguien que
 * no sabe leer: el aro que brilla es el que hay que cruzar, y cruzarlo se
 * celebra.
 */
/**
 * Qué pasó con el aro que tocaba.
 *
 * `perdido` no es un fracaso y no se castiga: es información. Un aro que no
 * reacciona cuando lo fallas enseña la mitad, porque quien no lee necesita
 * saber que **eso de ahí contaba**.
 */
export type PasoDeAro = "cruzado" | "perdido" | null;

export class RunwayGuide {
  readonly group: Group;
  /** Aros en orden de aproximación, del más lejano al umbral. */
  private readonly rings: Mesh[] = [];
  /** Índice del siguiente aro por cruzar. */
  private next = 0;
  /** Cuánto le queda de destello a cada aro. */
  private readonly flash: number[] = [];

  constructor(
    scenario: Scenario,
    runwayElevation: number,
    ground: GroundSampler,
  ) {
    this.group = buildGuide(scenario, runwayElevation, ground);
    const rings = this.group.getObjectByName("aros");
    rings?.traverse((object) => {
      if (object instanceof Mesh) this.rings.push(object);
    });
    /*
     * **Del más lejano al más cercano, y eso se mide en distancia al umbral.**
     *
     * Se ordenaban por altura, dando por hecho que una senda baja
     * monótonamente. Y no lo hace: los aros **se suben para salvar el
     * relieve**, así que en cuanto hay una loma por delante el orden se
     * descoloca — en el Valle de la Cordillera el primero de la lista estaba
     * más cerca de la pista que el segundo.
     *
     * Con el orden mal, `next` apunta a un aro cualquiera y todo lo que se
     * apoya en él —qué aro se enciende, cuál se da por cruzado, cuál por
     * perdido— deja de tener sentido.
     */
    this.rings.sort(
      (a, b) =>
        ((b.userData.distancia as number) ?? 0) -
        ((a.userData.distancia as number) ?? 0),
    );
    this.flash = this.rings.map(() => 0);
    this.highlight();
  }

  /**
   * Comprueba si el avión acaba de atravesar el aro que tocaba.
   *
   * Solo cuenta el siguiente de la serie: cruzar el último desde el otro
   * lado, o colarse por el tercero saltándose los dos primeros, no vale. Eso
   * mantiene la senda como una senda y no como una colección de aros sueltos.
   *
   * @returns true si se acaba de cruzar uno
   */
  check(position: Vector3): PasoDeAro {
    const aro = this.rings[this.next];
    if (!aro) return null;

    const radio = (aro.geometry as TorusGeometry).parameters.radius;

    /*
     * **Se mira el plano del aro, no la cercanía a su centro.**
     *
     * Antes se daba por cruzado si se pasaba a menos de radio × 1,15 del
     * centro, y si no, no pasaba nada de nada: pasar por encima, por debajo o
     * por fuera no producía ninguna reacción. «Algunos aros los pasé por
     * encima sin que me dijera nada.»
     *
     * Y había algo peor que el silencio: **el índice no avanzaba**. Un aro
     * fallado se quedaba como el siguiente para siempre, así que la senda
     * entera dejaba de funcionar a partir del primer error. El mismo fallo
     * que ya tenía el arranque en final, en otro sitio.
     *
     * Ahora se mira si se ha pasado su plano —el eje va de este aro al
     * siguiente, o al anterior si es el último— y se resuelve con **lo más
     * cerca que se llegó a estar**, que es la pregunta de verdad: no importa
     * dónde estabas al cruzar la raya, importa si pasaste por dentro.
     */
    const vecino = this.rings[this.next + 1] ?? this.rings[this.next - 1];
    if (!vecino) return null;
    const eje = new Vector3()
      .subVectors(vecino.position, aro.position)
      .normalize();
    // Si el vecino es el anterior, el eje apunta al revés: se da la vuelta.
    if (!this.rings[this.next + 1]) eje.negate();

    const relativo = new Vector3().subVectors(position, aro.position);
    const alLargo = relativo.dot(eje);
    // Lo perpendicular: lo que decide si se pasó por dentro del aro.
    const dentro = relativo.clone().addScaledVector(eje, -alLargo).length();
    this.masCerca = Math.min(this.masCerca, dentro);

    // Todavía por delante del plano del aro: no hay veredicto.
    if (alLargo < 0) return null;

    const cruzado = this.masCerca <= radio;
    /*
     * **Fallarlo también destella, y en rojo.**
     *
     * Antes solo destellaba el que se cruzaba; el que se perdía no hacía
     * absolutamente nada visible, así que pasar por encima o por debajo era
     * indistinguible de no haber pasado. «Me puedo pasar por arriba y por
     * abajo los aros sin problemas.»
     *
     * Perder un aro no es un fracaso y no se castiga, pero **tiene que
     * verse**: quien no lee necesita enterarse de que eso de ahí contaba y de
     * que se le escapó. El destello dura lo mismo y el color es lo único que
     * cambia — que es exactamente la diferencia que hay que aprender.
     */
    this.flash[this.next] = 1;
    this.fallado[this.next] = !cruzado;
    this.next++;
    this.masCerca = Infinity;
    this.encendido = 0;
    this.highlight();
    return cruzado ? "cruzado" : "perdido";
  }

  /**
   * Cómo está el aro que toca. Solo para las comprobaciones.
   *
   * Existe porque «los aros no hacen nada» se había mirado tres veces a ojo y
   * dos de ellas mal. Un número no se discute.
   */
  sonda(): {
    i: number;
    opacidad: number;
    verde: number;
    escala: number;
  } | null {
    const r = this.rings[this.next];
    if (!r) return null;
    const m = r.material as MeshBasicMaterial;
    return {
      i: this.next,
      opacidad: +m.opacity.toFixed(2),
      verde: +m.color.g.toFixed(2),
      escala: +r.scale.x.toFixed(2),
    };
  }

  /** Vuelve a empezar la aproximación. */
  /**
   * Vuelve a empezar la aproximación, **desde donde esté el avión**.
   *
   * Y ese «desde donde esté» es el arreglo. La lección de aterrizar empieza en
   * final, o sea **por delante de los primeros aros**, y `next` se ponía a
   * cero: la senda apuntaba al aro más lejano, que queda a la espalda y no se
   * va a cruzar nunca. Resultado: el índice no avanzaba jamás y ningún aro se
   * encendía, se destellaba ni se apagaba. «Los aros siguen sin hacer nada»,
   * tres veces, y las dos primeras las busqué en el brillo — que era el sitio
   * equivocado, porque el brillo estaba bien y el aro al que se lo ponía no.
   *
   * Se saltan los que ya quedan detrás: los que están más lejos del umbral
   * que el propio avión. La referencia es el último aro, que es el más
   * cercano a la pista, así que no hace falta saber dónde está el umbral.
   */
  reset(avion?: Vector3): void {
    this.next = 0;
    this.masCerca = Infinity;
    const ultimo = this.rings[this.rings.length - 1];
    if (avion && ultimo) {
      const delAvion = avion.distanceTo(ultimo.position);
      while (
        this.next < this.rings.length - 1 &&
        this.rings[this.next]!.position.distanceTo(ultimo.position) > delAvion
      ) {
        this.next++;
      }
    }
    this.encendido = 0;
    this.flash.fill(0);
    this.fallado.fill(false);
    this.highlight();
  }

  /** Cuánto se ha encendido el aro que toca, de 0 a 1. Suavizado. */
  private encendido = 0;
  /** Lo más cerca del eje del aro que se ha llegado a estar, m. */
  private masCerca = Infinity;
  /** Cuáles se perdieron, para que destellen en rojo. */
  private readonly fallado: boolean[] = [];

  /**
   * Anima los aros, y **enciende el que toca según te acercas**.
   *
   * Destellaban al cruzarlos y nada más, así que hasta el último instante el
   * aro estaba igual de apagado viniendo bien que viniendo fatal: la
   * celebración llegaba cuando ya no hacía falta. «Los aros deberían hacer
   * algo, brillar o algo que ayude a entender que vas bien.»
   *
   * Ahora el siguiente responde a la distancia desde cuatro veces su radio:
   * sube el brillo y se ensancha un pelo, y muy cerca late. Es la misma idea
   * que el aro de misión y por el mismo motivo — lo que hay que decir es «vas
   * bien» **mientras** vas, no cuando ya llegaste.
   */
  update(dt: number, avion?: Vector3): void {
    const siguiente = this.rings[this.next];
    if (siguiente && avion) {
      /*
       * **Desde el aro anterior, no desde cinco radios.**
       *
       * Con cinco radios el encendido duraba los últimos trescientos metros:
       * a la velocidad de aproximación son nueve segundos, y en un cambio
       * suave de color eso pasa desapercibido — «los aros siguen sin hacer
       * nada». Ahora se enciende **a lo largo de todo el tramo** entre un aro
       * y el siguiente, que es el trozo de aproximación al que corresponde.
       */
      /*
       * El tramo: del aro anterior a este, y si es el primero, del siguiente
       * a este —que es la misma separación—. Antes el primero caía en un
       * respaldo de cinco radios, unos trescientos metros en una aproximación
       * de dos kilómetros: el aro se encendía en el último suspiro y quien
       * empezaba la lección no veía nada durante todo el primer tramo.
       */
      const vecino = this.rings[this.next - 1] ?? this.rings[this.next + 1];
      const tramo = vecino
        ? vecino.position.distanceTo(siguiente.position)
        : (siguiente.geometry as TorusGeometry).parameters.radius * 5;
      /*
       * **Y no basta con estar cerca: hay que ir por dentro.**
       *
       * El encendido salía solo de la distancia, y la distancia sola premia
       * una aproximación mala: el aro se ponía verde brillante mientras el
       * avión iba a pasarle **por debajo**. Se vio en un vuelo grabado a
       * propósito — «no me corrige en el aro al que paso por debajo»— y es lo
       * contrario de lo que tiene que enseñar. Un aro que se pone verde cuando
       * vas mal no es una ayuda, es un aplauso equivocado.
       *
       * Ahora son dos cosas multiplicadas: **lo cerca que estás** y **lo
       * centrado que vas**. Fuera del aro, por arriba, por abajo o por el
       * lado, no se enciende por mucho que te acerques; y en el eje se
       * enciende desde lejos. Que es lo que significa «vas bien».
       */
      const radio = (siguiente.geometry as TorusGeometry).parameters.radius;
      // Sin vecino no hay eje que valga: un solo aro no tiene senda.
      const eje = vecino
        ? new Vector3()
            .subVectors(siguiente.position, vecino.position)
            .normalize()
        : new Vector3(0, 0, 1);
      const rel = new Vector3().subVectors(avion, siguiente.position);
      const fuera = rel.clone().addScaledVector(eje, -rel.dot(eje)).length();
      // Uno en el centro, cero en el borde del aro y más allá.
      const centrado = Math.max(0, 1 - fuera / radio);

      const d = avion.distanceTo(siguiente.position);
      const acercarse = Math.max(0, Math.min(1, 1 - d / Math.max(1, tramo)));
      const cerca = acercarse * centrado;
      // Suavizado: sin esto, entrar y salir del borde hace parpadear el aro.
      this.encendido += (cerca - this.encendido) * Math.min(1, dt * 2);
      const e = this.encendido;
      const late = e > 0.9 ? 0.09 * Math.sin(performance.now() / 90) : 0;
      const mat = siguiente.material as MeshBasicMaterial;
      // Solo si no está destellando: el destello de haberlo cruzado manda.
      if ((this.flash[this.next] ?? 0) <= 0) {
        /*
         * **Y se parte del brillo que ya tenía, no de menos.**
         *
         * Esto es lo que hacía que «los aros sigan sin hacer nada»: el aro que
         * toca ya estaba a 0,95 por `highlight`, y aquí se le ponía
         * `0,45 + encendido·0,55`, que empieza en 0,45. Es decir, **los dejé
         * más apagados que antes** y solo recuperaban el brillo original al
         * llegar encima. Un arreglo que empeora lo que arregla.
         *
         * Ahora el encendido **suma**: del 0,75 de siempre al 1 pegado, y el
         * color y el tamaño acompañan.
         */
        mat.opacity = Math.min(1, 0.75 + e * 0.25 + late);
        mat.color.setHex(OCRE).lerp(new Color(CERCA), e * e);
        siguiente.scale.setScalar(1 + e * 0.22 + late);
      }
    }

    for (let i = 0; i < this.rings.length; i++) {
      if (this.flash[i]! <= 0) continue;
      this.flash[i] = Math.max(0, this.flash[i]! - dt * 1.6);
      const ring = this.rings[i]!;
      const punch = this.flash[i]!;
      ring.scale.setScalar(1 + punch * 0.45);
      // Blanco al cruzarlo, rojo al perderlo. Y vuelve al ocre al apagarse.
      const vivo = this.fallado[i] ? FALLADO : 0xffffff;
      (ring.material as MeshBasicMaterial).color.setHex(
        punch > 0.5 ? vivo : OCRE,
      );
      if (punch === 0) ring.scale.setScalar(1);
    }
  }

  /**
   * El siguiente aro se ve; los ya cruzados se apagan.
   *
   * Un aro apagado sigue estando, así que se ve la senda entera y de dónde
   * se viene, pero solo uno pide que vayas a él.
   */
  private highlight(): void {
    for (let i = 0; i < this.rings.length; i++) {
      const material = this.rings[i]!.material as MeshBasicMaterial;
      const done = i < this.next;
      material.opacity = done ? 0.18 : i === this.next ? 0.95 : 0.55;
      material.color.setHex(done ? 0x8d9a8a : OCRE);
    }
  }
}

function buildGuide(
  scenario: Scenario,
  runwayElevation: number,
  ground: GroundSampler,
): Group {
  const group = new Group();
  group.name = "guia-pista";

  const { runway } = scenario;
  // Hacia dónde se avanza volando este rumbo. Sale de `rumbo.ts` y no de una
  // cuenta escrita aquí: la versión de aquí tenía el coseno sin negar, que
  // con 90° acierta por casualidad y con un rumbo cualquiera pone la cabecera
  // en el lado contrario. Ver la nota de ese fichero.
  const [ax, az] = delante(runway.heading);

  // Umbral: media pista por detrás del centro, que es por donde se entra.
  const thresholdX = runway.x - ax * runway.length * 0.5;
  const thresholdZ = runway.z - az * runway.length * 0.5;

  group.add(beacon(thresholdX, runwayElevation, thresholdZ));
  group.add(
    gatePosts(thresholdX, runwayElevation, thresholdZ, runway.width, ax, az),
  );
  group.add(
    approachRings(thresholdX, runwayElevation, thresholdZ, ax, az, ground),
  );

  return group;
}

/**
 * Haz de luz vertical sobre la cabecera.
 *
 * Es un cilindro alto pintado por dentro y por fuera, sin iluminar, para que
 * se vea igual a contraluz y en sombra. Sin escribir en el buffer de
 * profundidad: así no recorta el paisaje ni tapa el avión al cruzarlo.
 */
function beacon(x: number, y: number, z: number): Mesh {
  const height = 420;
  const geometry = new CylinderGeometry(9, 22, height, 10, 1, true);
  const mesh = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: OCRE,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      // Por las dos caras: el haz es un cilindro hueco y con una sola cara
      // se ve como una chapa plana según desde dónde se mire.
      side: DoubleSide,
    }),
  );
  mesh.position.set(x, y + height / 2, z);
  mesh.renderOrder = 2;
  mesh.name = "faro";
  return mesh;
}

/** Dos postes a los lados del umbral, como una puerta por la que entrar. */
function gatePosts(
  x: number,
  y: number,
  z: number,
  width: number,
  ax: number,
  az: number,
): Group {
  const posts = new Group();
  const height = 16;
  // Perpendicular al eje de la pista.
  const px = az;
  const pz = -ax;
  const reach = width * 0.9;

  for (const side of [-1, 1]) {
    const post = new Mesh(
      new CylinderGeometry(0.55, 0.8, height, 6),
      new MeshLambertMaterial({ color: side < 0 ? TERRACOTA : BEIGE }),
    );
    post.position.set(
      x + px * reach * side,
      y + height / 2,
      z + pz * reach * side,
    );
    posts.add(post);

    const cap = new Mesh(
      new CylinderGeometry(1.7, 1.7, 2.2, 8),
      new MeshBasicMaterial({ color: OCRE }),
    );
    cap.position.set(
      x + px * reach * side,
      y + height + 1,
      z + pz * reach * side,
    );
    posts.add(cap);
  }
  return posts;
}

/**
 * Aros que bajan hacia el umbral dibujando la senda de planeo.
 *
 * El primero está lejos y alto, el último justo antes del umbral y bajo. Se
 * agrandan con la distancia para que el de tres kilómetros se vea desde tres
 * kilómetros: si todos midieran lo mismo, los lejanos serían un punto.
 */
function approachRings(
  x: number,
  y: number,
  z: number,
  ax: number,
  az: number,
  ground: GroundSampler,
): Group {
  const rings = new Group();
  rings.name = "aros";

  for (let i = 0; i < RING_COUNT; i++) {
    // Reparto cuadrático: más juntos cerca del umbral, que es donde hace
    // falta precisión, y más separados lejos.
    const fraction = ((i + 1) / RING_COUNT) ** 1.6;
    const distance = FIRST_RING_DISTANCE * fraction;
    const height = distance * Math.tan(GLIDE_SLOPE);
    const radius = 26 + distance * 0.016;

    const ring = new Mesh(
      // Gordos y bastante opacos: a dos kilómetros un aro fino no se ve, y
      // un aro que no se ve no guía a nadie.
      new TorusGeometry(radius, radius * 0.075, 6, 24),
      // Material propio por aro: comparten uno solo y se encienden todos a
      // la vez, que es exactamente lo contrario de lo que hace falta.
      new MeshBasicMaterial({
        color: OCRE,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );

    // La distancia al umbral, apuntada en el propio aro: es el orden de la
    // senda, y no se puede deducir de dónde acaba estando. Ver el constructor.
    ring.userData.distancia = distance;
    const ringX = x - ax * distance;
    const ringZ = z - az * distance;
    // La senda sube lo que haga falta para salvar el relieve. Sin esto los
    // aros de las lomas quedaban enterrados y guiaban contra la montaña.
    const floor = ground(ringX, ringZ) + RING_TERRAIN_CLEARANCE + radius;
    ring.position.set(ringX, Math.max(y + height, floor), ringZ);
    // El aro mira a lo largo del eje de la pista.
    ring.rotation.y = Math.atan2(ax, az);
    ring.renderOrder = 1;
    rings.add(ring);
  }
  return rings;
}
