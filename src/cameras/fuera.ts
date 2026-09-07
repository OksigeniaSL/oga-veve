/**
 * Las vistas de fuera: la de detrás y las dos de ala.
 *
 * Comparten todo lo que cuesta —el suavizado, el retroceso por aceleración, el
 * traqueteo de pista y el suelo que no se puede atravesar— y se distinguen en
 * dos cosas: **desde dónde se mira** y **a dónde**. Por eso es una clase con
 * tres configuraciones y no tres clases con el mismo cuerpo copiado: lo que se
 * duplica se corrige en una copia y no en la otra.
 */

import { Vector3, type PerspectiveCamera } from "three";
import type { FlightState } from "../flight/model";
import { fovConVelocidad, type CameraRig, type Contexto } from "./tipos";

/** Cuánto retrocede la cámara por cada m/s² de aceleración. */
const ACCELERATION_LAG = 0.9;
/** Amplitud del traqueteo de pista, en metros. */
const SHAKE_AMPLITUDE = 0.42;
/** Velocidad, en m/s, a la que el traqueteo llega a su máximo. */
const SHAKE_REFERENCE = 30;
/** Segundos que tarda el traqueteo en apagarse al despegar. */
const SHAKE_FADE = 0.2;

/**
 * Cuánto por delante mira la cámara de detrás, y su mínimo.
 *
 * Miraba a donde el avión estaría un tercio de segundo después —diez metros—,
 * o sea prácticamente al avión, y eso lo dejaba clavado en el centro de la
 * pantalla **encima justo de la pista**: en corta final, un fuselaje a
 * dieciséis metros tapa exactamente los quince píxeles que mide una pista de
 * hierba de dieciocho metros de ancha a medio kilómetro. «No se ve dónde tengo
 * que tomar tierra», y no se veía porque lo tapaba la propia avioneta.
 *
 * Mirando lejos, la línea de visión se levanta y el avión baja al tercio de
 * abajo del cuadro: sigue viéndose entero —hace falta para saber cómo va— y
 * por encima de él aparece hacia dónde va, que es lo que hay que mirar para
 * aterrizar. Es lo que hace la cámara de cualquier juego de conducción.
 *
 * La distancia crece con la velocidad porque la cabeza mira más lejos cuanto
 * más deprisa se va, y tiene suelo para que rodando por la plataforma —donde
 * lo que importa está a veinte metros— la cámara no se vaya al horizonte.
 */
const MIRA_LEJOS = 2.4;
const MIRA_LO_MINIMO = 32;

/** Desde dónde mira cada una de las tres. */
export type Sitio = "cola" | "derecha" | "izquierda";

export class CamaraDeFuera implements CameraRig {
  readonly muestraElAvion = true;
  private readonly sitio: Sitio;

  /** Aceleración longitudinal filtrada, para el retroceso. */
  private surge = 0;
  private ultimaVelocidad = 0;
  /** Cuánto traqueteo hay ahora mismo, de 0 a 1. Se apaga solo al despegar. */
  private shake = 0;
  private relojDeTraqueteo = 0;

  // Vectores de trabajo, reutilizados: uno por fotograma sería basura.
  private readonly offset = new Vector3();
  private readonly deseada = new Vector3();
  private readonly mirando = new Vector3();

  constructor(sitio: Sitio) {
    this.sitio = sitio;
  }

  update(
    camera: PerspectiveCamera,
    state: FlightState,
    dt: number,
    ctx: Contexto,
  ): void {
    // Aceleración longitudinal, filtrada. Sin filtrar salta con cada subpaso
    // del modelo y la cámara temblaría.
    const bruta = dt > 0 ? (state.airspeed - this.ultimaVelocidad) / dt : 0;
    this.ultimaVelocidad = state.airspeed;
    this.surge += (Math.min(bruta, 6) - this.surge) * Math.min(1, dt * 4);

    if (this.sitio === "cola") {
      // Más alta y algo más atrás que en la primera versión: estaba a la
      // altura del avión y el fuselaje tapaba justo el centro de la pantalla,
      // que es donde uno quiere mirar para saber adónde va.
      this.offset.set(
        0,
        ctx.aircraft.wingSpan * 0.6,
        ctx.aircraft.wingSpan * 1.6,
      );
    } else {
      // El mismo sitio a un lado y al otro: lo único que cambia es de qué
      // costado se mira.
      this.offset.set(
        ctx.aircraft.wingSpan * 0.9 * (this.sitio === "derecha" ? 1 : -1),
        ctx.aircraft.chord * 1.4,
        ctx.aircraft.wingSpan * 0.5,
      );
    }

    // Retroceso por aceleración: la cámara se queda un poco atrás cuando el
    // avión empuja y vuelve a su sitio al estabilizarse. Es el mismo truco que
    // usa cualquier juego de coches y es lo que hace que se *sienta* la
    // aceleración en vez de solo verla en el marcador.
    this.offset.z += ACCELERATION_LAG * Math.max(0, this.surge);
    this.offset.applyQuaternion(state.orientation);
    this.deseada.copy(state.position).add(this.offset);
    this.traquetear(state, dt, ctx);

    // Nunca por debajo del terreno: en un vuelo rasante la cámara de
    // persecución se metería dentro de la loma de atrás.
    const suelo = ctx.suelo(this.deseada.x, this.deseada.z) + 3;
    if (this.deseada.y < suelo) this.deseada.y = suelo;

    // Suavizado exponencial independiente de la tasa de fotogramas: sin el
    // `1 - exp`, la cámara iría distinta a 30 y a 120 fps.
    camera.position.lerp(this.deseada, 1 - Math.exp(-dt * 7));

    const lejos = Math.max(MIRA_LO_MINIMO, state.airspeed * MIRA_LEJOS);
    if (this.sitio === "cola" && state.velocity.lengthSq() > 1) {
      this.mirando
        .copy(state.velocity)
        .normalize()
        .multiplyScalar(lejos)
        .add(state.position);
    } else {
      this.mirando.copy(state.position).addScaledVector(state.velocity, 0.35);
    }
    camera.lookAt(this.mirando);
  }

  fovDeseado(state: FlightState, ctx: Contexto): number {
    return fovConVelocidad(state, ctx);
  }

  /**
   * Traqueteo de la carrera por pista, y su corte al despegar.
   *
   * La velocidad no se ve: se deduce de lo que pasa cerca y de lo que sacude.
   * Con el avión rodando, la cámara vibra con una amplitud proporcional a la
   * velocidad en el suelo, con baches sueltos encima para que sea traqueteo y
   * no un zumbido.
   *
   * Y lo que de verdad vende el despegue es lo contrario: **el corte**. En
   * cuanto las ruedas dejan el suelo la vibración se apaga en dos décimas, y
   * ese silencio repentino es el momento. No hace falta adornarlo más.
   */
  private traquetear(state: FlightState, dt: number, ctx: Contexto): void {
    if (ctx.movimientoReducido) return;

    // Sube con el cuadrado de la velocidad hasta la de rotación: así el
    // traqueteo crece de verdad durante toda la carrera en vez de saturarse a
    // media pista, que era lo que hacía que después de arrancar pareciera que
    // ya no se aceleraba más.
    const rodando = Math.min(1, state.airspeed / SHAKE_REFERENCE);
    const meta = state.onGround ? rodando * rodando : 0;
    // Sube deprisa y se apaga en SHAKE_FADE segundos.
    const paso = meta > this.shake ? dt * 6 : dt / SHAKE_FADE;
    this.shake += Math.max(-paso, Math.min(paso, meta - this.shake));
    if (this.shake < 0.002) return;

    this.relojDeTraqueteo += dt;
    const t = this.relojDeTraqueteo;
    // Tres senos que no comparten periodo: se lee como suelo irregular y no
    // como una oscilación. Y un cuarto término lento hace los baches.
    const bache = Math.pow(Math.max(0, Math.sin(t * 5.3)), 8);
    // Y multiplicado por lo que traquetea el suelo de debajo: rodar por un
    // campo tiene que **notarse** antes de que nadie lo explique.
    const cuanto = SHAKE_AMPLITUDE * this.shake * ctx.traqueteo;
    this.deseada.y +=
      cuanto *
      (Math.sin(t * 41) * 0.5 + Math.sin(t * 17.3) * 0.3 + bache * 1.4);
    this.deseada.x += cuanto * Math.sin(t * 23.7) * 0.35;
  }
}
