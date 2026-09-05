/**
 * El señor de los bastones, en el puesto de estacionamiento.
 *
 * Quien decide **qué** gesto toca es `flight/senalero.ts`. Esto lo dibuja y le
 * mueve los brazos, que es la mitad que se ve.
 *
 * Y la mitad que se ve importa más de lo normal aquí, porque el gesto **es**
 * el mensaje: no hay palabra debajo, no hay icono al lado y no hay voz que lo
 * explique. Si los brazos no se leen desde la cabina a treinta metros, el
 * señalero no sirve para nada. De ahí las dos decisiones raras de este
 * fichero:
 *
 * - **Los bastones son enormes**, medio metro y de un naranja que no se apaga
 *   con la luz del atardecer. Un bastón a escala real, a treinta metros y con
 *   sol de frente, es un pixel.
 * - **Los gestos son más grandes que los de verdad.** Un señalero de carne y
 *   hueso mueve los antebrazos; este mueve los brazos enteros. La silueta se
 *   lee de lejos y el antebrazo no.
 *
 * Es la misma decisión que ya se tomó con la manga de viento y con las luces
 * de la pista: en un simulador que se juega a los cuatro años, lo que hay que
 * conservar de la realidad es **el significado**, no la escala.
 */

import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
} from "three";
import { gestoDeSenalero, type Gesto } from "../flight/senalero";

/** El naranja de los bastones. El mismo de los conos y los chalecos. */
const BASTON = 0xff7a1a;

/** El chaleco reflectante, que es lo que se ve primero de una persona ahí. */
const CHALECO = 0xd8e34a;

/** Ropa y casco: oscuros, para que el chaleco y los bastones canten. */
const ROPA = 0x2c3038;

/** Cuánto se aparta del eje del puesto, m. A la izquierda del avión. */
const A_UN_LADO = 7;

/** Y cuánto por delante del morro parado, m. */
const POR_DELANTE = 14;

/**
 * A qué distancia se quita de en medio, m.
 *
 * «Lo atropello sin problemas.» Y era verdad: se quedaba clavado en su sitio
 * dejándose pasar por encima. Un señalero de carne y hueso ve venir un avión
 * hacia él y se aparta, que es lo que hace cualquiera.
 *
 * **Y esta es la respuesta buena, no una caja de colisión.** Un avión que
 * choca contra una persona no se puede enseñar a los cuatro años, y castigar
 * por ello tampoco: aquí no se castiga, se ve la consecuencia. La consecuencia
 * de ir a por el señalero es que el señalero se va —y te lo dice con el alto
 * en la mano—, que es exactamente lo que pasaría en una plataforma de verdad.
 *
 * Doce metros: la mitad de lo que hay del puesto a su sitio, así que solo se
 * mueve cuando el avión de verdad se le viene encima y no cada vez que alguien
 * rueda un poco desviado.
 */
const SE_APARTA = 12;

/** Cuánto se quita, m. Lo bastante para que el ala pase por su lado. */
const A_SALVO = 9;

/** Y a qué velocidad se mueve, m/s. Un paso vivo de persona. */
const AL_QUITARSE = 4;

/** Por debajo de esta velocidad el avión no viene a por nadie, m/s. */
const RODANDO = 1.5;

/** De grados a radianes, que aquí se escriben muchos ángulos. */
const g = (grados: number): number => (grados * Math.PI) / 180;

/** Cada gesto, en ángulos de hombro. */
interface Postura {
  readonly izq: Brazo;
  readonly der: Brazo;
  /** A qué velocidad va el vaivén, vueltas por segundo. */
  readonly ritmo: number;
}

/**
 * Un brazo: dónde se pone y si se mueve.
 *
 * `x` lo levanta hacia delante —negativo, porque así gira el hombro— y `z` lo
 * abre hacia el lado. `vaiven` es cuánto oscila, en grados, y **cero es
 * quieto**: en «girá», el brazo que marca el lado se queda clavado y solo se
 * mueve el que llama. Si se movieran los dos, el gesto sería «adelante» con
 * ruido, que es justo lo que no hay que enseñar.
 */
interface Brazo {
  readonly x: number;
  readonly z: number;
  readonly vaiven: number;
}

/*
 * **Los brazos, y de qué lado está cada uno.**
 *
 * El señalero mira al avión, así que **su derecha es la izquierda de quien
 * pilota**. Eso es exactamente lo que hace que estos signos se pongan al revés
 * sin darse cuenta, y por eso está escrito: para mandar girar a la izquierda,
 * el brazo que se queda extendido en horizontal es el que la cabina ve a su
 * izquierda, que es el **derecho** del señalero.
 *
 * En el marco local de la figura, que mira hacia +Z, su izquierda es +X.
 */
const POSTURAS: Record<Exclude<Gesto, null>, Postura> = {
  // Los dos brazos arriba en uve, llamando hacia sí: «vení, seguí viniendo».
  adelante: {
    izq: { x: -150, z: 14, vaiven: 22 },
    der: { x: -150, z: -14, vaiven: 22 },
    ritmo: 1.1,
  },
  // Girá a tu izquierda: el brazo que la cabina ve a su izquierda se queda
  // clavado en horizontal, y el otro sigue llamando.
  izquierda: {
    izq: { x: -150, z: 14, vaiven: 26 },
    der: { x: 0, z: -90, vaiven: 0 },
    ritmo: 1.3,
  },
  derecha: {
    izq: { x: 0, z: 90, vaiven: 0 },
    der: { x: -150, z: -14, vaiven: 26 },
    ritmo: 1.3,
  },
  // Más despacio: los dos brazos abiertos y bajos, dando palmadas al aire.
  despacio: {
    izq: { x: -20, z: 50, vaiven: 18 },
    der: { x: -20, z: -50, vaiven: 18 },
    ritmo: 0.9,
  },
  // Alto: los bastones cruzados por encima de la cabeza. Es **el** gesto, y va
  // quieto: un alto que tiembla no es un alto.
  /*
   * **Alto: los bastones cruzados en aspa, y el aspa hay que verla.**
   *
   * El primer intento los cruzaba a treinta y dos grados y salía una uve, no
   * una equis: a ese ángulo los brazos se cruzan **a la altura del codo**, o
   * sea en la parte oscura, y lo único que se ve —los bastones— queda por
   * encima del cruce abriéndose. Desde la cabina, una uve naranja.
   *
   * A veinte grados el cruce cae por la mitad del bastón, que es donde tiene
   * que caer para que el aspa sea de lo que se ve. Es geometría de dos líneas:
   * con los hombros a treinta centímetros del eje, cruzan a `0,3 / sen θ` del
   * hombro, y el bastón está a noventa.
   *
   * Y va quieto: un alto que tiembla no es un alto.
   */
  alto: {
    izq: { x: -172, z: -20, vaiven: 0 },
    der: { x: -172, z: 20, vaiven: 0 },
    ritmo: 0,
  },
  /*
   * Frenos puestos: el mismo aspa, pero abajo. Ya está, llegaste.
   *
   * Arriba dice «no te muevas más» y abajo dice «se acabó», y son dos cosas
   * distintas: un vuelo que termina sin decir que ha terminado deja a quien
   * juega mirando la pantalla a ver si falta algo.
   */
  frenos: {
    izq: { x: -25, z: -20, vaiven: 0 },
    der: { x: -25, z: 20, vaiven: 0 },
    ritmo: 0,
  },
};

/** Cómo espera cuando no hay nada que señalar: bastones abajo, a los lados. */
const ESPERANDO: Postura = {
  izq: { x: 0, z: 8, vaiven: 0 },
  der: { x: 0, z: -8, vaiven: 0 },
  ritmo: 0,
};

/** Cuánto tarda un brazo en llegar de una postura a la siguiente, s. */
const SUAVIZADO = 0.18;

function brazo(lado: 1 | -1): Group {
  const hombro = new Group();
  hombro.position.set(lado * 0.3, 1.42, 0);

  const miembro = new Mesh(
    new CapsuleGeometry(0.075, 0.42, 4, 8),
    new MeshLambertMaterial({ color: ROPA }),
  );
  miembro.position.y = -0.3;
  hombro.add(miembro);

  /*
   * **El bastón va sin luz.**
   *
   * `MeshBasicMaterial` no se entera del sol, y aquí eso no es un descuido: un
   * bastón de señalero lleva luz dentro. Con material iluminado, el que
   * quedaba de espaldas al atardecer se apagaba justo cuando más falta hace —
   * y la hora por defecto de este juego son las cinco y media de la tarde.
   */
  const palo = new Mesh(
    new CylinderGeometry(0.055, 0.06, 0.75, 8),
    new MeshBasicMaterial({ color: BASTON }),
  );
  palo.position.y = -0.9;
  hombro.add(palo);

  return hombro;
}

export class Senalero {
  readonly grupo = new Group();
  private readonly izq = brazo(1);
  private readonly der = brazo(-1);
  /** El punto donde hay que parar y hacia dónde se llega, en mundo. */
  private parada: { x: number; z: number } | null = null;
  /** Su sitio de trabajo, al que vuelve en cuanto puede. */
  private suSitio: { x: number; z: number } | null = null;
  /** Y la cota del terreno, que la necesita para andar sin enterrarse. */
  private cota: ((x: number, z: number) => number) | null = null;
  /** Cuánto lleva apartado, de 0 a 1. Ver `SE_APARTA`. */
  private apartado = 0;
  /** Hacia dónde se quitó, unitario. Se congela mientras dura el susto. */
  private huida = { x: 1, z: 0 };
  private hacia = { x: 0, z: 1 };
  private t = 0;
  private gesto: Gesto = null;
  /** Los ángulos de ahora, que persiguen a los de la postura que toca. */
  private angulos = {
    izq: { x: ESPERANDO.izq.x, z: ESPERANDO.izq.z },
    der: { x: ESPERANDO.der.x, z: ESPERANDO.der.z },
  };

  constructor() {
    this.grupo.name = "senalero";
    this.grupo.visible = false;
    /*
     * **Y va a escala uno y ocho, que es una mentira a propósito.**
     *
     * A escala real es una figura de metro ochenta a cuarenta metros de la
     * cámara de persecución: cuarenta y cinco píxeles en una pantalla de mil
     * ochenta, medio tapados por el ala. «Señor de los bastones, ¿qué señor?»
     *
     * Es la misma decisión que ya se tomó con la manga de viento, con las
     * luces de la pista y con los propios bastones: en un simulador que se
     * juega a los cuatro años, de la realidad se conserva **el significado**,
     * no la escala. Un señalero que no se ve no significa nada.
     */
    this.grupo.scale.setScalar(1.8);

    const piernas = new Mesh(
      new BoxGeometry(0.42, 0.9, 0.28),
      new MeshLambertMaterial({ color: ROPA }),
    );
    piernas.position.y = 0.45;

    const torso = new Mesh(
      new BoxGeometry(0.52, 0.68, 0.3),
      new MeshLambertMaterial({ color: CHALECO }),
    );
    torso.position.y = 1.24;

    const cabeza = new Mesh(
      new SphereGeometry(0.14, 10, 8),
      new MeshLambertMaterial({ color: ROPA }),
    );
    cabeza.position.y = 1.72;

    this.grupo.add(piernas, torso, cabeza, this.izq, this.der);
  }

  /**
   * Lo pone en su sitio: al lado del puesto y mirando por donde llega el avión.
   *
   * `puesto` es donde para el avión y `saliendo` un punto de la ruta de
   * salida, que es la que existe al empezar la partida. El avión **llega por
   * donde se fue**, así que la dirección de llegada es la contraria, y de ahí
   * sale todo lo demás: dónde se planta, hacia dónde mira y qué es «desviado a
   * la derecha».
   */
  colocar(
    puesto: readonly [number, number],
    saliendo: readonly [number, number] | null,
    cota: (x: number, z: number) => number,
  ): void {
    const dx = (saliendo?.[0] ?? puesto[0] + 1) - puesto[0];
    const dz = (saliendo?.[1] ?? puesto[1]) - puesto[1];
    const largo = Math.hypot(dx, dz) || 1;
    // La llegada es al revés que la salida.
    const hacia = { x: -dx / largo, z: -dz / largo };
    this.hacia = hacia;
    this.parada = { x: puesto[0], z: puesto[1] };

    /*
     * **A la izquierda de la cabina y por delante del morro**, que es donde se
     * pone un señalero de verdad: desde el asiento izquierdo se le ve sin
     * asomarse. Puesto delante del morro y en el eje, lo taparía el propio
     * capó del avión justo cuando hay que leer el «alto».
     */
    const izquierdaX = hacia.z;
    const izquierdaZ = -hacia.x;
    const x = puesto[0] + hacia.x * POR_DELANTE + izquierdaX * A_UN_LADO;
    const z = puesto[1] + hacia.z * POR_DELANTE + izquierdaZ * A_UN_LADO;
    this.suSitio = { x, z };
    this.cota = cota;
    this.apartado = 0;
    this.grupo.position.set(x, cota(x, z), z);
    // Mirando por donde viene el avión: la figura se construye mirando a +Z.
    this.grupo.rotation.y = Math.atan2(-hacia.x, -hacia.z);
  }

  /**
   * Un fotograma.
   *
   * Devuelve el gesto por si alguien más lo quiere —el juego lo usa para saber
   * si hay que enseñar algo en pantalla— y `null` cuando no hay nada que
   * señalar.
   */
  paso(
    dt: number,
    avion: { x: number; z: number; velocidad: number; enElSuelo: boolean },
    volviendo: boolean,
  ): Gesto {
    if (this.posado) return this.animar(dt, this.posado);
    if (!this.parada) return null;

    const vx = this.parada.x - avion.x;
    const vz = this.parada.z - avion.z;
    // Lo que falta hasta el sitio, a lo largo de la raya de entrada.
    const restante = vx * this.hacia.x + vz * this.hacia.z;
    /*
     * Y lo desviado, con signo: **positivo es que el avión va por la derecha**
     * de la raya. La derecha de quien llega es la perpendicular a su marcha,
     * y aquí se mide del sitio al avión, no al revés — de ahí los signos.
     */
    const lateral = vx * this.hacia.z - vz * this.hacia.x;

    this.gesto = gestoDeSenalero({
      restante,
      lateral,
      velocidad: avion.velocidad,
      enElSuelo: avion.enElSuelo,
      volviendo,
    });

    /*
     * **Está o no está, y no aparece de golpe delante del morro.**
     *
     * Se le deja un margen por delante del alcance de sus gestos: así, cuando
     * empieza a señalar, ya llevaba un rato ahí de pie. Una persona que se
     * materializa a treinta metros no es una persona, es un cartel.
     */
    /*
     * Se quita si el avión se le viene encima, y vuelve andando cuando pasa.
     *
     * **Va antes de mirar si se le ve**, y no es indiferente: en cuanto el
     * avión se aleja, el señalero deja de estar a la vista, y si el paso de
     * volver a su sitio viviera dentro del `if` se quedaría plantado a nueve
     * metros de donde trabaja — para reaparecer ahí en el siguiente vuelo.
     * Lo cazó la prueba de que vuelve a su sitio. Ver `apartarse`.
     */
    const quitandose = this.apartarse(dt, avion);

    this.grupo.visible = volviendo && restante < 220 && restante > -40;
    if (!this.grupo.visible) return null;

    if (quitandose) this.gesto = "alto";

    return this.animar(dt, this.gesto);
  }

  /**
   * Un gesto puesto a mano, para poder mirarlo sin rodar hasta el puesto.
   *
   * Es el mismo banco de pruebas que `RunwayGuide.sonda`, y existe por el
   * mismo motivo: comprobar a ojo si el «alto» se lee como un alto exige
   * llegar hasta ahí, y un gesto que se mira una vez cada veinte minutos no se
   * corrige nunca.
   */
  posar(gesto: Gesto): void {
    this.posado = gesto;
    this.grupo.visible = gesto !== null;
  }

  private posado: Gesto = null;

  /**
   * Se quita de en medio si hace falta, y vuelve cuando pasa el peligro.
   *
   * Devuelve `true` mientras está apartándose o apartado, porque entonces el
   * gesto es **el alto** y ninguno de los otros: un señalero que se está
   * quitando del paso no te está diciendo que sigas a la izquierda.
   *
   * Anda, no se teletransporta. Un señalero que salta nueve metros en un
   * fotograma no es una persona asustada, es un fallo de dibujo.
   */
  private apartarse(
    dt: number,
    avion: { x: number; z: number; velocidad: number },
  ): boolean {
    const sitio = this.suSitio;
    if (!sitio) return false;

    const dx = sitio.x - avion.x;
    const dz = sitio.z - avion.z;
    const cerca = Math.hypot(dx, dz);
    /*
     * **Un avión parado no asusta a nadie**, y es importante: el señalero
     * trabaja a doce metros del morro de un avión que acaba de llegar. Si se
     * apartara por estar cerca sin más, se iría justo cuando toca cruzar los
     * bastones y decir «ya está».
     */
    const viene = cerca < SE_APARTA && avion.velocidad > RODANDO;

    if (viene) {
      // La dirección se congela al empezar: si se recalculara cada paso,
      // el señalero iría girando alrededor del avión en vez de irse.
      if (this.apartado === 0 && cerca > 0.01) {
        this.huida = { x: dx / cerca, z: dz / cerca };
      }
      this.apartado = Math.min(1, this.apartado + (dt * AL_QUITARSE) / A_SALVO);
    } else {
      this.apartado = Math.max(0, this.apartado - (dt * AL_QUITARSE) / A_SALVO);
    }

    if (this.apartado > 0 || viene) {
      const x = sitio.x + this.huida.x * A_SALVO * this.apartado;
      const z = sitio.z + this.huida.z * A_SALVO * this.apartado;
      this.grupo.position.set(x, this.cota?.(x, z) ?? this.grupo.position.y, z);
    }
    return this.apartado > 0;
  }

  private animar(dt: number, gesto: Gesto): Gesto {
    this.t += dt;
    const postura = gesto ? POSTURAS[gesto] : ESPERANDO;
    const onda = postura.ritmo
      ? Math.sin(this.t * postura.ritmo * Math.PI * 2)
      : 0;

    // Los brazos no saltan de una postura a otra: llegan. Un señalero que
    // cambia de gesto en un fotograma parece un muñeco roto.
    const paso = Math.min(1, dt / SUAVIZADO);
    const acercar = (de: number, a: number) => de + (a - de) * paso;

    const donde = (b: Brazo) => b.x + onda * b.vaiven;
    this.angulos.izq.x = acercar(this.angulos.izq.x, donde(postura.izq));
    this.angulos.izq.z = acercar(this.angulos.izq.z, postura.izq.z);
    this.angulos.der.x = acercar(this.angulos.der.x, donde(postura.der));
    this.angulos.der.z = acercar(this.angulos.der.z, postura.der.z);

    this.izq.rotation.set(g(this.angulos.izq.x), 0, g(this.angulos.izq.z));
    this.der.rotation.set(g(this.angulos.der.x), 0, g(this.angulos.der.z));

    return gesto;
  }

  /** Vuelta a empezar: otro vuelo, y todavía no hay nadie esperando. */
  reiniciar(): void {
    this.gesto = null;
    this.t = 0;
    this.grupo.visible = false;
    // Y de vuelta a su sitio: el susto no se hereda del vuelo anterior.
    this.apartado = 0;
    if (this.suSitio) {
      const { x, z } = this.suSitio;
      this.grupo.position.set(x, this.cota?.(x, z) ?? this.grupo.position.y, z);
    }
  }
}
