/**
 * La vista de dentro: la cabina, y la de pájaro.
 *
 * Son la misma cámara con el avión visible o no. **Desde dentro no hay
 * suavizado ninguno**: la cámara es la cabeza del piloto y va rígidamente
 * unida al avión, así que copia su posición y su orientación sin filtrar
 * nada. Cualquier retardo aquí se lee como que la cabeza va suelta. Lo único
 * que se mueve son los milímetros que se hunde el cuerpo en un bache: ver
 * `Cuello`.
 */

import { Vector3, type PerspectiveCamera } from "three";
import type { FlightState } from "../flight/model";
import {
  FOV_DE_CABINA,
  fovConVelocidad,
  type CameraRig,
  type Contexto,
} from "./tipos";

/**
 * Cuánto se inclina la vista de cabina hacia el panel cuando no se sabe dónde
 * está la visera, en radianes: las cajas de respaldo. Ver `encuadreDeCabina`.
 */
const MIRANDO_AL_PANEL = (12 * Math.PI) / 180;

/**
 * A qué altura de la pantalla cae el borde de la visera, desde arriba.
 *
 * **El cuarenta y dos por ciento, en todos los aviones y en todas las
 * pantallas.** Estaba en el treinta y tres, y no por decisión: salía de doce
 * grados puestos a mano, iguales para los seis aviones, que con la visera a
 * la altura de los ojos la subían a un tercio de la pantalla. En una tablet,
 * encima de ese tercio van dos filas de botones; en un teléfono, la quinta
 * parte de la pantalla. Lo que quedaba de parabrisas era una rendija, que es
 * la queja que ya se había arreglado una vez moviendo el asiento y volvió:
 * «cuando estás dentro de la cabina solo se ven los mandos, no veo por dónde
 * estoy volando».
 *
 * Con la raya en el 42 % el parabrisas casi dobla en el teléfono, y los
 * relojes —que empiezan justo debajo de la visera— siguen entrando enteros,
 * medido con `enPantalla` en los seis.
 */
const VISERA_EN_PANTALLA = 0.42;

/**
 * **Y el horizonte, nunca más arriba del 22 % de la pantalla**, con el avión
 * nivelado.
 *
 * La visera en el 42 % vale mientras la visera está donde estaba en todos:
 * unos once grados por debajo de los ojos, y el horizonte cae así hacia el
 * 23 %. Pero eso no es lo que se ve desde un avión de línea: por encima del
 * morro de un 747-400 se ven 18° 26′ (Boeing D6-58326-1, apartado 4.4) y por
 * encima del de un E-175, 15° (Embraer, manual de aeropuertos, figura 4.5).
 * Con el guardasol a esa altura —el que pidió la captura del JAZ 120:
 * «se ven feos»—, poner su labio en el 42 % subía el horizonte hasta el 11 %,
 * debajo de la fila de botones de arriba.
 *
 * Así que manda lo que esté más arriba de los dos: la visera en su sitio de
 * siempre o el horizonte en el suyo. En los aviones que ven poco por encima
 * del morro no cambia nada; en los que ven mucho, la visera baja en la
 * pantalla y lo que se gana es **pista**, que es lo que se quería: «el
 * guardasol más fino deja ver más pista».
 */
const HORIZONTE_EN_PANTALLA = 0.22;

/**
 * **El plano cercano en la cabina del helicóptero**, m: el del juego son
 * sesenta centímetros, y en el Super Puma la consola del techo, sus palancas
 * y los montantes de la pecera quedan a medio metro de los ojos, y el puño del
 * cíclico, entre las rodillas. Como en la cabina de pasaje —ver
 * `CERCANO_EN_LA_CABINA` en `world/cabina-333.ts`—, se acerca solo mientras se
 * mira desde ahí. Lo lejano pierde algo de precisión, que con el helipuerto a
 * unos metros no se nota.
 */
export const CERCANO_EN_EL_HELICOPTERO = 0.25;

/** Hasta dónde se abre el ángulo para que quepan los instrumentos, grados. */
const FOV_MAXIMO = 78;

/**
 * Lo que se deja entre la fila de botones de arriba y la caja de la brújula,
 * como fracción del alto de la pantalla: un poco de aire, para que el borde
 * de la caja no se lea pegado al botón.
 */
const AIRE_SOBRE_LA_BRUJULA = 0.015;

/**
 * Qué parte de la pantalla puede ocupar el grupo de instrumentos: lo que
 * queda al quitar un margen del tres por ciento a cada lado y abajo, para que
 * nada se lea cortado contra el borde.
 */
const HASTA_EL_BORDE = 0.97;

/**
 * El encuadre de la cabina: cuánto bajar la vista y con qué ángulo mirar.
 *
 * **Es la regla del anclaje del cuadro, traída a la cabina de tres
 * dimensiones**: el grupo de lo que se lee y se toca se ve entero, y si no
 * cabe **se encoge**, nunca se corta ni se descentra. Aquí encoger es abrir
 * el ángulo de visión. Antes era un ángulo fijo de cincuenta y ocho grados
 * para todos, y en una tablet los dos reactores dejaban media pantalla de
 * cada piloto fuera por los lados; y el turbohélice, su columna de motor y
 * sus botones fuera por abajo.
 *
 * La inclinación es geometría: la visera está `visera` radianes por debajo de
 * los ojos, y un punto que se ve a una fracción `s` de la pantalla desde
 * arriba está `atan((1 − 2s)·tan(fov/2))` por encima del centro. Mirando hacia
 * abajo la suma de los dos, la visera cae donde se quiere en cualquier avión.
 *
 * Sin encuadre —las cajas de respaldo, que no tienen cabina— lo de siempre.
 */
export function encuadreDeCabina(
  e: {
    visera: number;
    lados: number;
    abajo: number;
    brujula?: { readonly arriba: number; readonly x: number; readonly medio: number };
    piezas?: readonly { readonly izq: number; readonly der: number; readonly abajo: number }[];
  } | undefined,
  aspecto: number,
  /** Lo que tapa la fila de botones de arriba encima de la brújula, fracción del alto. Ver `Contexto.arribaTapado`. */
  arribaTapado = 0,
  /** Lo que tapa la barra del timón por abajo, en fracciones de la pantalla. Ver `Contexto.abajoTapado`. */
  abajoTapado: LoQueTapaAbajo | null = null,
): { inclinacion: number; fov: number } {
  if (!e) return { inclinacion: MIRANDO_AL_PANEL, fov: FOV_DE_CABINA };
  let salida = { inclinacion: MIRANDO_AL_PANEL, fov: FOV_DE_CABINA };
  for (let fov = FOV_DE_CABINA; fov <= FOV_MAXIMO; fov += 0.5) {
    const t = Math.tan(((fov / 2) * Math.PI) / 180);
    /*
     * **Y la brújula del parabrisas, entera por debajo de la fila de botones**
     * (H26q). Cuelga del travesaño, en lo más alto del parabrisas, y con la
     * visera en su sitio de siempre el botón del mapa le tapaba el borde de
     * arriba y las cifras que dan el rumbo, que es lo único que se lee de
     * ella. Es la misma regla que la de los relojes —lo que se lee se ve
     * entero—, y como las otras dos manda la que deje mirar más alto: aquí se
     * baja la mirada menos, el panel baja en la pantalla y, si ya no cabe por
     * abajo, se abre el ángulo, que es encoger. Solo si hay algo encima.
     */
    const bajoLaFila =
      e.brujula && arribaTapado > 0
        ? e.brujula.arriba + Math.atan((1 - 2 * Math.min(0.5, arribaTapado + AIRE_SOBRE_LA_BRUJULA)) * t)
        : Infinity;
    const inclinacion = Math.min(
      e.visera + Math.atan((1 - 2 * VISERA_EN_PANTALLA) * t),
      Math.atan((1 - 2 * HORIZONTE_EN_PANTALLA) * t),
      bajoLaFila,
    );
    salida = { inclinacion, fov };
    const abajo = 0.5 + Math.tan(e.abajo - inclinacion) / (2 * t);
    const cabeAbajo = abajo <= HASTA_EL_BORDE;
    const cabeALosLados = e.lados <= HASTA_EL_BORDE * aspecto * t;
    /*
     * **Y lo que se pulsa, por encima de la barra del timón** (H31b). Con el
     * dedo, la barra va abajo en el centro, que es justo donde un panel lleva
     * los mandos que se tocan —la baliza, el motor, los flaps, el freno, el
     * tren— y el pie de los relojes del medio. En el teléfono los tapaba
     * enteros: se veían y no se podían pulsar, porque el toque se lo llevaba
     * la barra. Es la regla de la fila de arriba (H26q), abajo: solo lo que
     * cae en su columna, y si no cabe, se abre el ángulo.
     */
    const libreAbajo = !abajoTapado || !e.piezas || !algoDebajo(e.piezas, abajoTapado, inclinacion, t, aspecto);
    if (cabeAbajo && cabeALosLados && libreAbajo) break;
  }
  return salida;
}

/**
 * **Lo que tapa el HUD por abajo desde el asiento**: la barra del timón, en
 * fracciones de la pantalla —`arriba`, su borde de arriba desde arriba; `izq`
 * y `der`, sus bordes desde la izquierda—. Tapa desde ahí hasta abajo. Ver
 * `Game.loQueTapaLaBarraDelTimon`.
 */
export interface LoQueTapaAbajo {
  readonly arriba: number;
  readonly izq: number;
  readonly der: number;
}

/**
 * Lo que se deja entre lo más bajo de un instrumento y la barra del timón,
 * como fracción del alto: el mismo aire que encima de la brújula.
 */
const AIRE_SOBRE_LA_BARRA = 0.015;

/**
 * Si alguna pieza del panel, mirando así, cae por debajo del borde de arriba
 * de lo que tapa por abajo y en su columna.
 *
 * El alto, con la misma cuenta que la visera. El ancho, con la de una cámara
 * que mira hacia abajo: lo que cae lejos del centro de la pantalla se ve más
 * estrecho que su tangente, `cos c / cos(θ − c)`, y en el teléfono con el
 * ángulo abierto son píxeles que deciden si un mando queda dentro o fuera.
 */
function algoDebajo(
  piezas: readonly { readonly izq: number; readonly der: number; readonly abajo: number }[],
  barra: LoQueTapaAbajo,
  inclinacion: number,
  t: number,
  aspecto: number,
): boolean {
  const tope = barra.arriba - AIRE_SOBRE_LA_BARRA;
  for (const p of piezas) {
    if (0.5 + Math.tan(p.abajo - inclinacion) / (2 * t) <= tope) continue;
    const k = Math.cos(p.abajo) / Math.cos(inclinacion - p.abajo) / (2 * t * aspecto);
    if (0.5 + p.der * k > barra.izq && 0.5 + p.izq * k < barra.der) return true;
  }
  return false;
}

/**
 * **El cuerpo en un bache**: lo que se mueven los ojos respecto al asiento.
 *
 * La cámara va unida al avión, y así tiene que ser: la cabeza del piloto no va
 * suelta. Pero un bache se siente en el cuerpo —el asiento empuja de golpe y
 * el cuerpo se hunde un poco en él—, y sin eso la turbulencia solo se veía
 * desde fuera.
 *
 * **Y era esto lo que «parece del render».** Medido antes de tocarlo con
 * `scripts/medir-sacudidas.mjs` (JAZ 120 en crucero, turbulencia moderada):
 * el cuello de antes era un muelle de hercio y medio que respondía a la
 * aceleración del fotograma, y con el vaivén lento del aire —todo por debajo
 * de un hercio— llevaba los ojos hasta 2,5 cm del asiento, de tres a casi
 * cinco de pico a pico. O sea: la cabina, el panel y el marco de la
 * ventanilla flotando arriba y abajo delante de la cara sin que el avión
 * hiciera nada. Un cuerpo de verdad no se mueve respecto al asiento con algo
 * tan lento: va con el avión.
 *
 * Ahora es el cuerpo sentado, con sus números:
 *
 * - **lo mueve la carga**, lo que empuja el asiento —el factor de carga del
 *   modelo de vuelo en el aire; en tierra, lo que sube y baja el avión—, y no
 *   una resta de velocidades;
 * - **es duro**: la resonancia vertical del cuerpo sentado está hacia los
 *   cuatro o cinco hercios (Griffin, *Handbook of Human Vibration*, 1990), así
 *   que con lo lento no se mueve nada y con un bache se hunde unos milímetros
 *   y vuelve. Bien amortiguado, sin rebote: ni un temblor que no traiga el
 *   aire;
 * - **y cuánto, lo dice el avión**: un bache moderado en el cuatrimotor son
 *   tres décimas de g y medio centímetro; en la avioneta, que con el mismo aire
 *   carga tres veces más, el triple. «En el avión grande se nota menos que en
 *   la avioneta.» Tope de dos centímetros y medio.
 *
 * Y nada con el movimiento reducido del sistema, como el traqueteo.
 */
const CUERPO_HZ = 4;
const CUERPO_AMORTIGUA = 0.7;
const CABEZA_HASTA = 0.025;
/** La carga que se toma como mucho, g de más o de menos: un golpe no es una catapulta. */
const CARGA_HASTA = 2.5;

/**
 * El cuello, aparte: lo usan la cabina y el asiento de ventanilla, que en un
 * bache se mueven igual —el asiento sube de golpe y la cabeza se queda un
 * instante atrás— y no pueden tener dos muelles que se corrijan por separado.
 */
export class Cuello {
  /** Dónde está la cabeza respecto al asiento, m, y a qué velocidad va. */
  private cabeza = 0;
  private cabezaVa = 0;
  /** La subida del fotograma anterior, para la carga en tierra. */
  private subidaAntes: number | null = null;

  /** Un paso. Devuelve cuánto está la cabeza por encima de su sitio, m. */
  paso(state: FlightState, dt: number, ctx: Contexto, activo: boolean): number {
    const antes = this.subidaAntes;
    this.subidaAntes = state.verticalSpeed;
    if (!activo || ctx.movimientoReducido || !(dt > 0) || antes === null) {
      this.cabeza = 0;
      this.cabezaVa = 0;
      return 0;
    }
    // Un fotograma larguísimo no es un bache: es la pestaña que vuelve.
    const paso = Math.min(dt, 0.05);
    /*
     * Lo que empuja el asiento, g de más: en el aire, la carga del modelo; en
     * tierra el ala no sostiene y lo que se nota es el suelo —el golpe de la
     * toma, los baches de la pista—, que es lo que sube y baja el avión.
     */
    const deMas = state.onGround
      ? (state.verticalSpeed - antes) / Math.max(dt, 1e-3) / 9.80665
      : state.loadFactor - 1;
    const empuje = Math.max(-CARGA_HASTA, Math.min(CARGA_HASTA, deMas)) * 9.80665;
    /*
     * El muelle, con el paso partido para que a cuatro hercios no se dispare
     * en un fotograma de cincuenta milisegundos.
     */
    const w = 2 * Math.PI * CUERPO_HZ;
    const trozos = Math.max(1, Math.ceil(paso / 0.004));
    const h = paso / trozos;
    for (let i = 0; i < trozos; i++) {
      this.cabezaVa +=
        (-w * w * this.cabeza - 2 * CUERPO_AMORTIGUA * w * this.cabezaVa - empuje) * h;
      this.cabeza += this.cabezaVa * h;
    }
    this.cabeza = Math.max(-CABEZA_HASTA, Math.min(CABEZA_HASTA, this.cabeza));
    return this.cabeza;
  }
}

export class CamaraDeDentro implements CameraRig {
  readonly muestraElAvion: boolean;
  private readonly offset = new Vector3();
  private readonly cuello = new Cuello();
  /** Si esta vista cierra el ángulo como una cabina o lo abre con la velocidad. */
  private readonly comoCabina: boolean;
  /** El último encuadre, para que el ángulo pedido sea el mismo que se usó. */
  private encuadre = { inclinacion: MIRANDO_AL_PANEL, fov: FOV_DE_CABINA };
  /** Con qué se sacó el último encuadre, para no repetir la cuenta si no cambia. */
  private readonly encuadreDe = { encuadre: null as unknown, aspecto: 0, arriba: 0, abajo: 0, izq: 0, der: 0 };

  constructor(muestraElAvion: boolean, comoCabina: boolean) {
    this.muestraElAvion = muestraElAvion;
    this.comoCabina = comoCabina;
  }

  update(
    camera: PerspectiveCamera,
    state: FlightState,
    dt: number,
    ctx: Contexto,
  ): void {
    const cabeza = this.cuello.paso(state, dt, ctx, this.comoCabina);
    /*
     * Si la aeronave es un modelo de verdad, el sitio lo dice él: su asiento
     * delantero. La fórmula sobre la cuerda del ala es para las cajas, donde
     * no hay cabina y da igual dónde te pongas.
     */
    const ojo = ctx.ojo;
    if (ojo) this.offset.set(ojo.x, ojo.y, ojo.z);
    else
      this.offset.set(0, ctx.aircraft.chord * 0.55, -ctx.aircraft.chord * 0.4);
    this.offset.y += cabeza;
    this.offset.applyQuaternion(state.orientation);
    camera.position.copy(state.position).add(this.offset);
    camera.quaternion.copy(state.orientation);
    /*
     * **Y en cabina se mira un poco hacia abajo, por encima de la visera.**
     *
     * Un piloto sentado no mira al infinito: mira por encima del borde del
     * panel, y en el campo de visión le entra la fila de arriba de los
     * instrumentos. Copiando la actitud del avión tal cual, la cámara miraba
     * derecha al horizonte y **el panel se quedaba fuera de la pantalla**: en
     * el turbohélice no se veía un solo reloj, y en el entrenador solo la mitad
     * de una pantalla. Se vio en las seis capturas de cabina, una por avión.
     *
     * Cuánto, lo dice la visera de cada avión: ver `encuadreDeCabina`.
     */
    if (this.comoCabina) {
      /*
       * Solo si cambia algo de lo que lo decide: con cada instrumento contra
       * la barra del timón son unos cientos de cuentas por paso del ángulo, y
       * lo que lo decide cambia al girar la pantalla o al cambiar de avión,
       * no en cada imagen.
       */
      const de = this.encuadreDe;
      const arriba = ctx.arribaTapado ?? 0;
      const abajo = ctx.abajoTapado ?? null;
      if (
        ojo?.encuadre !== de.encuadre ||
        camera.aspect !== de.aspecto ||
        arriba !== de.arriba ||
        (abajo?.arriba ?? -1) !== de.abajo ||
        (abajo?.izq ?? -1) !== de.izq ||
        (abajo?.der ?? -1) !== de.der
      ) {
        de.encuadre = ojo?.encuadre;
        de.aspecto = camera.aspect;
        de.arriba = arriba;
        de.abajo = abajo?.arriba ?? -1;
        de.izq = abajo?.izq ?? -1;
        de.der = abajo?.der ?? -1;
        this.encuadre = encuadreDeCabina(ojo?.encuadre, camera.aspect, arriba, abajo);
      }
      camera.rotateX(-this.encuadre.inclinacion);
    }
  }

  /**
   * En la cabina, fijo y cerrado; de pájaro, el de fuera.
   *
   * No es una inconsistencia: la de pájaro es la cabina **sin el avión
   * delante**, o sea una vista de fuera puesta en el sitio de dentro, y ahí el
   * ángulo que estira con la velocidad sigue diciendo lo que tiene que decir.
   */
  fovDeseado(state: FlightState, ctx: Contexto): number {
    return this.comoCabina ? this.encuadre.fov : fovConVelocidad(state, ctx);
  }
}
