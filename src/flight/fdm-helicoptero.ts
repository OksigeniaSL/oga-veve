/**
 * **El helicóptero visto por el juego**: el modelo de `helicoptero.ts` detrás
 * del contrato `FlightModel`, el mismo que cumplen los dos de los aviones.
 *
 * Va aparte y no dentro del modelo porque el contrato está escrito para un ala:
 * pregunta por el gas que sostiene una velocidad, por la de entrada en final o
 * por el timón que equilibra. Esas preguntas son del juego de los aviones, y la
 * física del helicóptero no tiene por qué saber que existen; aquí se contestan
 * con lo que de verdad significa cada una en un helicóptero, y cada respuesta
 * dice por qué. Es el paso 3 del ADR 0026.
 *
 * **Los mandos del avión, en el helicóptero.** El teclado, el dedo y el mando
 * del juego siguen siendo los mismos, y cada uno cae en el mando del
 * helicóptero que hace lo mismo con la mano:
 *
 * - el gas es **el colectivo**: se sube y se queda, como la palanca de verdad,
 *   que tiene fricción y no vuelve sola;
 * - la profundidad es **el cíclico adelante y atrás**, con el mismo sentido:
 *   tirar es morro arriba;
 * - los alerones, **el cíclico a los lados**;
 * - el timón, **los pedales**;
 * - el motor, **los motores**, y los frenos, los de las ruedas.
 */

import type { Vector3 } from "three";
import { AIRE_ESTANDAR, type Aire, airDensity } from "./atmosphere";
import {
  colectivoDeEstacionario,
  type Estabilizacion,
  type FichaDeHelicoptero,
  type MandosDeHelicoptero,
  ModeloDeHelicoptero,
  mandosNeutros,
} from "./helicoptero";
import type { ControlInputs, FlightModel, FlightState, GroundSampler, InitialConditions } from "./model";
import type { TierId } from "./tiers";
import type { Superficie } from "../world/superficie";

const NUDO = 0.514444;

/**
 * **La velocidad que no se pasa**, VNE: 167 kt al nivel del mar (TCDS R.002,
 * III.8). El modelo pasaría de ahí, porque lo que la limita de verdad es la pala
 * que se retira y eso no lo lleva (ver «Lo que no hace» en el ADR 0026); el
 * juego la pregunta para juzgar «demasiado rápido», y la respuesta es la de la
 * ficha.
 */
const VNE = 167 * NUDO;

/**
 * **El tren de un helicóptero de su clase**, m/s de descenso al tocar. Las
 * normas de certificación de los grandes (CS 29.725 y 29.727, las mismas que
 * la FAR 29 de los Estados Unidos) prueban el tren soltándolo desde 20 cm —unos
 * 2,0 m/s, lo que tiene que aguantar sin más— y lo que guarda de reserva sin
 * romperse, desde vez y media esa altura: unos 2,4 m/s. Un helicóptero se posa
 * mucho más suave que eso: medio metro por segundo es ya una toma firme.
 */
const TOMA_DURA = 2.0;
const TOMA_ROTA = 2.44;

/**
 * **Lo que gasta un turboeje por vatio, pasado a un empuje equivalente.** El
 * combustible del juego se cuenta con el empuje —`quemaPorSegundo`— y el
 * consumo de un turbohélice, 0,05 kg por newton y hora. Un turboeje como el
 * Makila gasta unos 0,36 kg por kilovatio y hora (del orden de los de su
 * clase); igualando las dos cuentas, cada vatio vale 0,0072 N. Con eso el
 * Super Puma en crucero quema unos 600 kg a la hora, que es lo suyo.
 */
const NEWTON_POR_VATIO = (0.36 / 1000) / 0.05;

/**
 * **Qué estabilización lleva cada peldaño** (paso 3 del ADR 0026, propuesta
 * para probarla volando).
 *
 * Abajo, el estacionario: soltar el cíclico es pararse y quedarse quieto, que
 * es lo que pide quien todavía no sabe que un helicóptero se cae hacia un lado
 * si no se le sujeta. Arriba, la actitud: el cíclico mueve el morro y al
 * soltarlo se queda donde estaba, pero la deriva es de quien vuela, como en el
 * modo básico del piloto automático del Super Puma. Crece lo que se le deja a
 * quien vuela, no lo que hace el helicóptero, igual que los avisos de la
 * escalera.
 */
export function estabilizacionDelPeldano(tier: TierId): Estabilizacion {
  return tier === "guyrami" || tier === "tuka" ? "estacionario" : "actitud";
}

/**
 * **El colectivo que sostiene el helicóptero parado en el aire**, lejos del
 * suelo, de 0 a 1. Es la cuenta del rotor quieto en el aire, por bisección del
 * paso: el empuje crece con él. No cuenta la estela que da en el fuselaje ni el
 * rotor de cola, así que se queda un poco corto; vale para colocar la palanca
 * cerca, no para sostenerse sin tocarla.
 */
export { colectivoDeEstacionario };

/** Lo que el juego le pasa al construirlo. */
export interface OpcionesDelHelicoptero {
  readonly ficha: FichaDeHelicoptero;
  readonly ground: GroundSampler;
  readonly estabilizacion: Estabilizacion;
}

export class HelicopteroComoModelo implements FlightModel {
  readonly implementationName = "Helicóptero de mínima complejidad (NASA CR-177476)";
  /** El modelo de verdad: lo de aquí solo traduce. */
  readonly modelo: ModeloDeHelicoptero;
  private readonly mandos: MandosDeHelicoptero = mandosNeutros();
  private aire: Aire = AIRE_ESTANDAR;

  constructor(private readonly opciones: OpcionesDelHelicoptero) {
    this.modelo = new ModeloDeHelicoptero(opciones.ficha, opciones.ground);
    this.modelo.ponerEstabilizacion(opciones.estabilizacion);
  }

  get state(): Readonly<FlightState> {
    return this.modelo.state;
  }

  /**
   * El helicóptero no despega de pistas: se le guarda el dato porque el juego
   * lo lee en el estado, pero no cambia nada de cómo vuela.
   */
  setOnRunway(enPista: boolean): void {
    this.modelo.state.onRunway = enPista;
  }

  /** Lo que gastan los motores, contado como el empuje del que sale el combustible. Ver `NEWTON_POR_VATIO`. */
  empujeAhora(): number {
    return Math.max(0, this.modelo.rotor().potenciaMotores) * NEWTON_POR_VATIO;
  }

  /**
   * Lo pregunta el piloto automático del avión al engancharse, y en el
   * helicóptero no se engancha: su automático es la estabilización, que va por
   * dentro del modelo. Cero, como el modelo sencillo.
   */
  timonAhora(): number {
    return 0;
  }

  /** Un golpe contra un edificio o contra el suelo rompe el helicóptero igual que un avión. */
  romper(): void {
    this.modelo.state.crashed = true;
  }

  ponerViento(x: number, z: number): void {
    this.modelo.ponerViento(x, z);
  }

  ponerAire(aire: Aire): void {
    this.aire = aire;
    this.modelo.ponerAire(aire);
  }

  aireDelDia(): Aire {
    return this.aire;
  }

  ponerMasa(kg: number): void {
    this.modelo.ponerMasa(kg);
  }

  masaAhora(): number {
    return this.modelo.masaAhora();
  }

  /** Para cambiar de peldaño sin cambiar de modelo: ver `estabilizacionDelPeldano`. */
  ponerEstabilizacion(e: Estabilizacion): void {
    this.modelo.ponerEstabilizacion(e);
  }

  /**
   * Empieza con el rotor girando a sus vueltas: arrancar los motores y meter
   * el rotor en vueltas es un minuto de procedimiento que llega con el sonido
   * y el arranque (paso 3 del ADR 0026, aparte).
   */
  reset(initial: InitialConditions): void {
    this.modelo.reset({
      position: initial.position,
      heading: initial.heading,
      airspeed: initial.airspeed,
      rotorEnMarcha: true,
    });
    this.bajaba = 0;
  }

  /** Lo que bajaba en el último paso en el aire, m/s: con eso se juzga la toma. */
  private bajaba = 0;

  step(dt: number, c: ControlInputs): void {
    const m = this.mandos;
    m.colectivo = Math.max(0, Math.min(1, c.throttle));
    m.cabeceo = c.elevator;
    m.alabeo = c.aileron;
    m.pedales = c.rudder;
    m.motores = c.engineOn;
    m.frenos = c.brakes;
    // El freno del rotor, tal como está la palanca: el modelo no lo deja morder
    // por encima de sus vueltas. Ver `frenoDelRotor` en `helicoptero.ts`.
    m.frenoDelRotor = c.frenoDelRotor ?? false;
    // El tren, donde esté: lo mueve la palanca del juego. Ver `tren` en la ficha del juego.
    m.tren = c.tren;
    const s = this.modelo.state;
    const enElAire = !s.onGround;
    if (enElAire) this.bajaba = -s.velocity.y;
    this.modelo.step(dt, m);
    /*
     * **Una toma que pasa de lo que aguanta el tren rompe el helicóptero.** El
     * modelo no lo juzga —es física, no reglas—, y el juego espera que el que
     * simula diga si se ha roto, como hacen los de los aviones con el suyo.
     */
    if (enElAire && s.onGround && this.bajaba > TOMA_ROTA) s.crashed = true;
  }

  /**
   * «Qué gas sostiene esta velocidad» es, en un helicóptero, qué colectivo
   * sostiene la altura: el del estacionario es el más alto de los de vuelo
   * —con velocidad se sostiene con menos—, así que quien coloca el
   * helicóptero en el aire con esto no se cae, como mucho sube un poco.
   *
   * **Con la estabilización de estacionario, media palanca**: ahí la palanca pide
   * subir o bajar y a media se queda a la altura que tiene. Ver
   * `SUBE_EN_ESTACIONARIO`.
   */
  gasPara(_velocidad: number): number {
    if (this.modelo.estabilizacionAhora() === "estacionario") return 0.5;
    return this.colectivoQueSostiene();
  }

  private colectivoQueSostiene(): number {
    const densidad = airDensity(this.modelo.state.position.y, this.aire);
    return colectivoDeEstacionario(this.opciones.ficha, this.modelo.masaAhora(), densidad);
  }

  /**
   * **Cuánto le falta para despegar**, de 0 a 1: el paso que llevan las palas
   * frente al que sostiene el estacionario. Es lo que llena la barra del tutor
   * mientras se sube el colectivo; la palanca no sirve para eso, porque en la
   * estabilización de estacionario vuelve sola a media altura y el paso lo va
   * subiendo la estabilización. Ver `STEPS.colectivo` en `ui/tutor.ts`.
   */
  pasoParaDespegar(): number {
    const sostiene = this.colectivoQueSostiene();
    if (!(sostiene > 0)) return 0;
    return Math.max(0, Math.min(1, this.modelo.mandosAhora().colectivo / sostiene));
  }

  /**
   * Rodar no es con el gas: un helicóptero rueda con el colectivo abajo y el
   * cíclico un poco adelante. El tope de rodaje del juego, que es quien lo
   * pregunta, no se aplica al helicóptero; cero es «no subas el colectivo».
   */
  gasParaRodar(_velocidad: number, _desde?: number): number {
    return 0;
  }

  /**
   * Un helicóptero no entra en final a una velocidad de ala: se le contesta
   * con la misma que pregunta el juego, que es lo que menos le cambia.
   */
  velocidadDeEntradaEnFinal(vref: number): number {
    return vref;
  }

  /** La VNE de la ficha: ver `VNE`. */
  velocidadMaxima(): number {
    return VNE;
  }

  /**
   * En los aviones cambia con la altura entre la estructura y el Mach; en el
   * helicóptero la VNE también baja con la altura, pero la ficha pública solo
   * da la de abajo. Se queda esa.
   */
  limiteDeVelocidad(): number {
    return VNE;
  }

  quienLimita(): "estructura" | "aire" {
    return "estructura";
  }

  /** El que ya no aguanta el tren: ver `TOMA_ROTA`. */
  limiteDeCaida(): number {
    return TOMA_ROTA;
  }

  /** El que aguanta pero ya no es una toma buena: ver `TOMA_DURA`. */
  limiteDeDuro(): number {
    return TOMA_DURA;
  }

  /**
   * Rodar por hierba cuesta más que por asfalto, pero el helicóptero se posa y
   * despega sin rodar; las ruedas del modelo ya frenan lo suyo. Se ignora.
   */
  ponerSuperficie(_superficie: Superficie): void {}

  /** Lo que cambia la pista mojada es la frenada de una carrera, que el helicóptero no hace. */
  ponerPistaMojada(_mojada: boolean): void {}

  /** Dónde está ahora, por comodidad del juego y de las pruebas. */
  get posicion(): Vector3 {
    return this.modelo.state.position;
  }
}
