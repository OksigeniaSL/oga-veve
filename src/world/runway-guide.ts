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
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  SphereGeometry,
  Vector3,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Points,
  PointsMaterial,
  TorusGeometry,
} from "three";
import { delante } from "./rumbo";
import type { Scenario } from "./scenarios";

/** Cota del terreno en unas coordenadas de mundo. */
export type GroundSampler = (x: number, z: number) => number;

/**
 * Margen entre el **borde de abajo** del aro y el terreno, en metros.
 *
 * Existe porque la primera versión colocaba los aros sobre una senda recta sin
 * mirar el relieve, y en el valle algunos quedaban **dentro de una loma**: el
 * juego dibujaba una guía que llevaba a chocar.
 *
 * **Y estaba en cincuenta y cinco metros medidos al centro, más el radio.**
 * Eso son ochenta o ciento diez metros de altura obligatoria, y como la senda
 * de verdad baja a nueve metros en el último aro, la condición se disparaba en
 * la mitad de los aros **incluso en terreno llano**. La senda dejaba de ser
 * una recta y pasaba a ser un palo de hockey: cuatro grados hasta la mitad y
 * luego una plataforma a ochenta metros. Medido en el Chaco, que es una mesa:
 * cuatro de los siete aros levantados. En Tenerife Norte la fila iba 338 →
 * 175 → **255** → 91 → 58 → **80** → 75; una montaña rusa.
 *
 * Peor todavía: quien volaba la senda buena **fallaba los últimos aros**, y
 * quien seguía los aros tenía que subir antes de tocar. De ahí «¿me pide
 * subir? ¿que tengo que ir por encima del aro?», que era exactamente lo que
 * el juego estaba pidiendo.
 *
 * Ahora son seis metros y se miden **al borde de abajo del toro**, no al
 * centro: en llano no levanta ningún aro y en un cerro sigue subiendo lo justo
 * para pasarlo.
 */
const RING_TERRAIN_CLEARANCE = 6;

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

/**
 * Dónde se apaga del todo el haz de la cabecera y dónde vuelve a estar entero, m.
 *
 * **El faro es para encontrar la pista, no para aterrizar en ella.** Es un
 * cilindro de cuatrocientos veinte metros plantado en el umbral, y visto desde
 * dos kilómetros es la torre naranja que dice «es allí». Visto desde
 * trescientos metros en final es **una pared translúcida delante de la pista**:
 * lo tiñe todo de ocre, borra la pintura del asfalto y, al cruzarlo, deja la
 * pantalla naranja entera durante segundos.
 *
 * Eso se vio jugando y se describió exacto: «la pista se va pintando a medida
 * que la recorro, pero no veo las líneas de marcas de pista». No era que
 * faltaran las marcas — estaban debajo del faro.
 *
 * Así que se desvanece: entero más allá de mil ochocientos metros, apagado por
 * debajo de seiscientos. A seiscientos metros la pista ya se ve sola, con su
 * número, su umbral y sus luces, y no hace falta nadie que la señale.
 */
const FARO_APAGADO = 600;
const FARO_ENTERO = 1800;

/**
 * Cuántos radios hay que tener por delante para ver un aro entero.
 *
 * Un aro es un donut de setenta metros, y al cruzarlo **la cámara se queda
 * dentro**: la geometría rodea el punto de vista y la pantalla se llena de un
 * color plano. El destello de haberlo cruzado empeoraba justo eso, porque lo
 * pone blanco y lo hace un cuarenta y cinco por ciento más grande.
 *
 * La celebración tiene que verse **desde fuera**, no desde dentro. Así que
 * cada aro se apaga según su plano se te echa encima: entero a algo más de un
 * radio y medio de su plano, nada justo en él. Lo que queda es lo que hay que
 * enseñar — el aro se enciende, lo pasás y ya no está.
 */
const AL_PLANO = 1.6;

/** Cuántos aros dibujan la senda y entre qué distancias del umbral. */
const RING_COUNT = 7;
const FIRST_RING_DISTANCE = 3200;

/**
 * Y dónde se acaban, m del umbral.
 *
 * **El último aro estaba a ciento cuarenta metros y era imposible.** Sobre
 * cualquier senda de verdad su centro cae a diez metros del suelo, y un toro
 * de veintiocho de radio a diez metros de altura está enterrado hasta la
 * mitad. El código lo levantaba para desenterrarlo y lo dejaba a setenta y
 * cinco metros: a ciento cuarenta del umbral, eso son veintiocho grados de
 * pendiente. La senda pedía subir justo antes de tocar.
 *
 * Los últimos quinientos metros no necesitan aro: ahí ya están los dos postes
 * del umbral, las luces de aproximación y la propia pista, que a esa distancia
 * llena media pantalla.
 */
const LAST_RING_DISTANCE = 500;

/**
 * Pendiente de la senda. **Tres grados, que es la de verdad y la del PAPI.**
 *
 * Estaba a cuatro «porque perdona el error», y con eso el juego se contradecía
 * a sí mismo: siguiendo los aros, el PAPI —que es el instrumento real, y que
 * está calibrado a tres— decía «venís alto» durante toda la aproximación. En
 * un juego cuya regla es que gana lo real, tener dos sendas distintas en la
 * misma pantalla es enseñar que una de las dos miente.
 */
export const GLIDE_SLOPE = (3 * Math.PI) / 180;

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
  /** El haz de la cabecera, para poder apagarlo de cerca. */
  private readonly faro: Mesh | null;
  /**
   * Dónde estaba el avión el fotograma anterior.
   *
   * Es lo que permite resolver el cruce **en el punto por donde se cruzó** y
   * no con lo más cerca que se estuvo alguna vez. Ver `check`.
   */
  private previa: Vector3 | null = null;
  /**
   * La dirección de la senda, del aro lejano al umbral.
   *
   * Se calcula una vez: la usan el desvanecido y cualquiera que necesite saber
   * si un aro está por delante o por detrás. Todos los aros comparten eje
   * salvo por la altura, y para esto eso no cambia nada.
   */
  private readonly ejeSenda = new Vector3(0, 0, 1);

  constructor(
    scenario: Scenario,
    runwayElevation: number,
    ground: GroundSampler,
  ) {
    this.group = buildGuide(scenario, runwayElevation, ground);
    this.faro = (this.group.getObjectByName("faro") as Mesh | undefined) ?? null;

    this.mira = new Mesh(
      new SphereGeometry(6, 10, 8),
      new MeshBasicMaterial({
        color: CERCA,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.mira.name = "mira";
    this.mira.renderOrder = 3;
    /*
     * **Y apagada.** Se probó jugando y la respuesta fue inmediata: «esas
     * bolas de colores son un peligro». Tenía razón — una bola flotando en
     * mitad de la aproximación se lee como algo del mundo contra lo que se
     * puede chocar, no como un instrumento, y encima aparece justo en el
     * momento de más carga.
     *
     * El problema que venía a resolver sigue ahí y es bueno: el aro apagado
     * dice «vas mal» y no dice hacia dónde. Pero la respuesta no es meter un
     * objeto más en el cielo. Queda para pensarlo en el HUD, que es donde van
     * los instrumentos, y no en el mundo, que es donde van las cosas.
     */
    this.mira.visible = false;
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
    // El eje de la senda: del aro más lejano al más cercano al umbral.
    const lejano = this.rings[0];
    const cercano = this.rings[this.rings.length - 1];
    if (lejano && cercano && lejano !== cercano) {
      this.ejeSenda.subVectors(cercano.position, lejano.position).normalize();
    }
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
     * **Se resuelve en el punto exacto por donde se cruzó el plano.**
     *
     * Antes se daba por cruzado si se pasaba a menos de radio × 1,15 del
     * centro, y si no, no pasaba nada de nada: pasar por encima, por debajo o
     * por fuera no producía ninguna reacción. «Algunos aros los pasé por
     * encima sin que me dijera nada.»
     *
     * Se arregló mirando el plano del aro… y resolviendo con **lo más cerca
     * que se llegó a estar en todo el tramo**, que parecía generoso y era otra
     * cosa: la distancia se medía a la **recta infinita** del eje, así que
     * bastaba estar alineado un solo fotograma en cualquier punto del tramo
     * —normalmente el primero, nada más cruzar el aro anterior— para que el
     * siguiente quedara resuelto como cruzado pasara por donde pasara después.
     * Y como los aros son colineales, cruzar uno bien te dejaba alineado para
     * el siguiente: una cadena de regalos. Medido: pasando **ciento dieciocho
     * metros por encima** de un aro de cincuenta y seis de radio, veredicto
     * «cruzado», destello blanco y notas que suben. Eso es, literalmente, «me
     * puedo pasar por arriba y por abajo los aros sin problemas».
     *
     * Ahora se guarda dónde estaba el avión el fotograma anterior y, cuando se
     * cruza el plano, se interpola el punto de cruce y se mira si **ese** punto
     * cae dentro del aro. Que es la pregunta de verdad, y la única.
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
    // Dónde estaba el fotograma anterior respecto del mismo plano.
    const desde = this.previa ? this.previa.clone() : position.clone();
    const antes = new Vector3().subVectors(desde, aro.position).dot(eje);
    this.previa = position.clone();

    // Todavía por delante del plano del aro: no hay veredicto.
    if (alLargo < 0) return null;

    /*
     * El punto de cruce, interpolado entre los dos fotogramas. Si aparecemos
     * ya pasados —el primer fotograma tras un reinicio— se usa la posición de
     * ahora, que es lo único que hay.
     */
    const t = antes < 0 ? antes / (antes - alLargo) : 1;
    const cruce = desde.clone().lerp(position, t);
    const rel = new Vector3().subVectors(cruce, aro.position);
    const fuera = rel.addScaledVector(eje, -rel.dot(eje)).length();
    const cruzado = fuera <= radio;
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
    /*
     * **Y el destello se pone en el aro que se está mirando, no en el que se
     * acaba de cruzar.**
     *
     * Porque el que se acaba de cruzar no se ve. Si se pasó por dentro, la
     * cámara está literalmente dentro del toro y el aro se ha desvanecido; si
     * se pasó por fuera, al fotograma siguiente queda ochenta grados fuera del
     * encuadre, a la espalda. Se medió: no hay **ni un solo fotograma** en el
     * que el destello del aro cruzado sea visible. Se estaba celebrando y
     * regañando a puerta cerrada, y lo único que llegaba era el sonido.
     *
     * El veredicto se pinta entonces donde están los ojos: el aro siguiente,
     * el que ya llena la vista. Blanco que crece si el anterior entró; rojo
     * que parpadea si se escapó. Y cuando no hay siguiente —el último de la
     * serie— se queda en el suyo, que para entonces ya está por delante.
     */
    const aviso = this.next + 1 < this.rings.length ? this.next + 1 : this.next;
    this.flash[aviso] = 1;
    this.fallado[aviso] = !cruzado;
    this.next++;
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
    this.previa = null;
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
  /**
   * El punto que dice **dónde estás respecto del aro que toca**.
   *
   * El aro apagado dice «vas mal» y ahí se acaba: no dice si te has ido por
   * arriba, por abajo o por el lado, que es justo lo que hace falta para
   * corregir. Un aro que solo dice que no es media ayuda.
   *
   * Así que se dibuja tu desvío **dentro del aro**, como una mira: el punto
   * está donde estás tú, escalado al radio, y llevarlo al centro es llevar el
   * avión al centro. Cuando el punto está en medio, pasas por dentro.
   *
   * Es exactamente cómo se lee un director de vuelo, y se entiende sin
   * palabras a los cuatro años: hay que meter la bolita en el agujero.
   */
  private readonly mira: Mesh;
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
      /*
       * **Y el centrado no es lineal: tiene un codo.**
       *
       * Era `1 − fuera/radio`, que a mitad de radio da 0,5. Multiplicado por
       * el acercamiento, el aro no llegaba ni a la mitad de su encendido con
       * un error de medio radio, que es una aproximación **buena** para
       * alguien de cinco años con teclado. Con el cuadrado, medio radio vale
       * 0,75: el que va casi bien ve casi todo el premio, y el que va fuera
       * sigue sin ver nada.
       */
      const centrado = Math.max(0, 1 - (fuera / radio) ** 2);

      /*
       * **El acercamiento tiene que llegar a uno antes de que el aro empiece a
       * desvanecerse**, o el verde de verdad no se ve nunca.
       *
       * Iba de cero a uno a lo largo de todo el tramo, así que al empezar el
       * desvanecido —a algo más de un radio y medio del plano— valía 0,6 o 0,7.
       * O sea: el aro alcanzaba su mejor color **con la opacidad ya cayendo**,
       * y el verde `CERCA` no llegaba a verse en ningún fotograma. Medido en
       * el vídeo de hoy: noventa segundos de aproximación sin que un solo aro
       * pasara del ocre.
       */
      const d = avion.distanceTo(siguiente.position);
      const desdeDondeSeApaga = radio * AL_PLANO;
      const recorrido = Math.max(1, tramo - desdeDondeSeApaga);
      const acercarse = Math.max(
        0,
        Math.min(1, (tramo - d) / recorrido),
      );
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
        // Con `e²` el camino de color iba muy por detrás del encendido: a
        // mitad de camino, un cuarto de color. Lineal, lo que se ve es lo que
        // se ha conseguido.
        mat.color.setHex(OCRE).lerp(new Color(CERCA), e);
        siguiente.scale.setScalar(1 + e * 0.22 + late);
      }
    }

    for (let i = 0; i < this.rings.length; i++) {
      if (this.flash[i]! <= 0) continue;
      // El fallado dura más y se apaga más despacio: hay que darle tiempo a
      // parpadear tres veces, que es lo que lo hace inconfundible.
      this.flash[i] = Math.max(
        0,
        this.flash[i]! - dt * (this.fallado[i] ? 0.8 : 1.6),
      );
      const ring = this.rings[i]!;
      const punch = this.flash[i]!;
      /*
       * **El bueno crece; el fallado parpadea.**
       *
       * Dos maneras distintas de llamar la atención para dos cosas distintas,
       * porque un cambio de color solo no basta cuando la pantalla ya tiene
       * ocres y verdes por todas partes. Crecer es un premio; parpadear es un
       * «eh, mira». Y el parpadeo es lo que hace cualquier señal del mundo que
       * quiere decir «esto no ha salido».
       */
      const parpadeo = this.fallado[i]
        ? 0.5 + 0.5 * Math.sign(Math.sin(performance.now() / 70))
        : 1;
      ring.scale.setScalar(this.fallado[i] ? 1 : 1 + punch * 0.45);
      (ring.material as MeshBasicMaterial).opacity = this.fallado[i]
        ? 0.25 + 0.75 * parpadeo * punch
        : Math.min(1, 0.75 + punch * 0.25);
      // Blanco al cruzarlo, rojo al perderlo. Y vuelve al ocre al apagarse.
      const vivo = this.fallado[i] ? FALLADO : 0xffffff;
      (ring.material as MeshBasicMaterial).color.setHex(
        punch > 0.5 ? vivo : OCRE,
      );
      if (punch === 0) ring.scale.setScalar(1);
    }

    if (avion) this.apagarLoQueTapa(avion);
  }

  /**
   * Apaga lo que se te viene encima: el haz y el aro que estás cruzando.
   *
   * Las dos ayudas de esta clase están hechas para verse **de lejos**, y de
   * cerca las dos hacen lo contrario de ayudar: el haz es una pared naranja
   * delante de la pista y el aro es un donut que rodea la cámara y llena la
   * pantalla de color. Ver `FARO_APAGADO` y `AROS_ENTERO`.
   *
   * Va al final del fotograma, después de que el encendido y el destello hayan
   * puesto sus opacidades: esto las **multiplica**, no las sustituye. Así el
   * aro sigue encendiéndose y destellando como siempre, solo que se lo lleva
   * el viento cuando lo tenés encima.
   */
  private apagarLoQueTapa(avion: Vector3): void {
    if (this.faro) {
      // En horizontal: el faro sube cuatrocientos metros y la distancia en
      // vertical no dice nada de si te está tapando la pista.
      const d = Math.hypot(
        avion.x - this.faro.position.x,
        avion.z - this.faro.position.z,
      );
      const f = Math.max(
        0,
        Math.min(1, (d - FARO_APAGADO) / (FARO_ENTERO - FARO_APAGADO)),
      );
      (this.faro.material as MeshBasicMaterial).opacity = 0.34 * f;
      this.faro.visible = f > 0.02;
    }

    /*
     * **Y el desvanecido se mide a lo largo de la senda, no en línea recta.**
     *
     * Con la distancia en línea recta, un aro que estás fallando por cien
     * metros por encima se apagaba a la mitad **antes de llegar a su plano**:
     * o sea, justo el aro que hay que ver fallar era el que se borraba. Lo que
     * tapa la pantalla no es estar cerca del aro, es estar **en su plano**, que
     * es cuando el toro rodea la cámara. Así que se mide eso.
     *
     * Y lo que está destellando no se toca: el destello es el veredicto, y un
     * veredicto medio borrado no es un veredicto.
     */
    for (let i = 0; i < this.rings.length; i++) {
      const aro = this.rings[i]!;
      const mat = aro.material as MeshBasicMaterial;
      if ((this.flash[i] ?? 0) > 0) {
        aro.visible = true;
        continue;
      }
      const radio = (aro.geometry as TorusGeometry).parameters.radius;
      const alLargo = Math.abs(
        this.ejeSenda.dot(
          new Vector3().subVectors(avion, aro.position),
        ),
      );
      const f = Math.max(0, Math.min(1, alLargo / (radio * AL_PLANO)));
      mat.opacity *= f;
      aro.visible = mat.opacity > 0.02;
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
  group.add(
    hiloDeLaSenda(thresholdX, runwayElevation, thresholdZ, ax, az, ground),
  );

  return group;
}

/**
 * El hilo de la senda: la trayectoria dibujada punto a punto.
 *
 * **Los aros dicen si lo hiciste bien; esto dice hacia dónde ir.** Y esa era
 * la mitad que faltaba. Un aro solo habla cuando ya lo tenés encima: se
 * enciende si vas centrado y se apaga si no, pero entre aro y aro —que son
 * cientos de metros— no hay nada que diga si vas alto o bajo. «Sigo superando
 * los aros por arriba y por abajo sin tener casi señales de nada.»
 *
 * Un hilo de puntos no tiene ese problema: **está siempre**, y en cada
 * fotograma se ve si te queda por encima o por debajo del morro. Eso es
 * exactamente lo que un piloto lee en la senda, y no hay que aprender nada
 * para entenderlo.
 *
 * ## Por qué puntos y no una bola
 *
 * Ya hubo una mira —una bolita que marcaba tu desvío— y se apagó por una
 * razón buena: «esas bolas de colores son un peligro», porque un objeto
 * flotante suelto se lee como algo contra lo que se puede chocar. Una fila de
 * puntos finos no: el juego ya dibuja rayas en el suelo para decir «por aquí»,
 * y esto es la misma gramática levantada del suelo.
 *
 * ## Y llega hasta el umbral
 *
 * Los aros se acaban a quinientos metros. El hilo sigue hasta la cabecera,
 * que es justo el trozo donde no había ninguna referencia y donde se decide
 * la toma.
 */
function hiloDeLaSenda(
  x: number,
  y: number,
  z: number,
  ax: number,
  az: number,
  ground: GroundSampler,
): Points {
  const puntos: number[] = [];
  for (let d = FIRST_RING_DISTANCE; d > 30; d -= PASO_DEL_HILO) {
    const px = x - ax * d;
    const pz = z - az * d;
    // La misma cuenta que coloca los aros: si el terreno sube, el hilo sube.
    const suelo = ground(px, pz) + RING_TERRAIN_CLEARANCE;
    puntos.push(px, Math.max(y + d * Math.tan(GLIDE_SLOPE), suelo), pz);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(puntos, 3));
  const hilo = new Points(
    geo,
    new PointsMaterial({
      color: OCRE,
      // Tamaño fijo en pantalla, como las luces de la pista: un punto que se
      // encoge con la distancia deja de verse justo cuando más falta hace,
      // que es al principio de la aproximación.
      size: 5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  hilo.name = "hilo";
  hilo.renderOrder = 1;
  return hilo;
}

/** Cada cuánto se pone un punto del hilo, m. */
const PASO_DEL_HILO = 45;

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
    const distance =
      LAST_RING_DISTANCE + (FIRST_RING_DISTANCE - LAST_RING_DISTANCE) * fraction;
    const height = distance * Math.tan(GLIDE_SLOPE);
    /*
     * El radio, y por qué encoge.
     *
     * Un aro lejano tiene que ser grande para verse; uno cercano tiene que
     * caber **entre la senda y el suelo**, porque a seiscientos metros del
     * umbral la senda va a treinta y dos metros de altura y un aro de treinta
     * y seis de radio no cabe sin enterrarse o sin levantar la senda.
     *
     * Era `26 + 0,016·d`, calculado para una senda de cuatro grados que ya no
     * existe. Con tres grados hay menos sitio abajo, así que la base baja a
     * dieciocho: el aro más cercano queda con veintiocho de radio, que sigue
     * siendo una puerta de cincuenta y seis metros de ancho.
     */
    const radius = 18 + distance * 0.016;

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
    // aros de las lomas quedaban enterrados y guiaban contra la montaña. El
    // margen va al borde de abajo del toro, así que hay que sumarle el radio
    // para llevarlo al centro. Ver `RING_TERRAIN_CLEARANCE`.
    const floor = ground(ringX, ringZ) + RING_TERRAIN_CLEARANCE + radius;
    ring.position.set(ringX, Math.max(y + height, floor), ringZ);
    // El aro mira a lo largo del eje de la pista.
    ring.rotation.y = Math.atan2(ax, az);
    ring.renderOrder = 1;
    rings.add(ring);
  }
  return rings;
}
