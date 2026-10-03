/**
 * **El banco de la mano**: vuela el modelo de vuelo de verdad con la mano
 * del teclado o del dedo, sin navegador. Lo usan las pruebas de
 * `mano.test.ts` y la medida de antes y después de `mano-medida.test.ts`.
 *
 * Y vuela también **la tecla de antes** —el alerón y la profundidad a fondo
 * mientras se aprieta, con la rampa que tenían—, para poder decir con cifras
 * cuánto ha cambiado.
 */

import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { ArcadeFlightModel } from "./arcade";
import type { AircraftConfig } from "./aircraft";
import { neutralControls, type ControlInputs, type FlightModel } from "./model";
import { airDensity, GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";
import type { Tier } from "./tiers";
import { ManoQueSostiene, type LoQuePide, type LoQueVeLaMano } from "./mano";

export const DT = 1 / 60;

/** Un vuelo del banco: el modelo, la mano y los mandos de quien vuela. */
export interface VueloDeBanco {
  readonly modelo: FlightModel;
  readonly aircraft: AircraftConfig;
  readonly tier: Tier;
  readonly mano: ManoQueSostiene;
  gas: number;
  /**
   * Si algo lleva la velocidad con el gas —los gases automáticos, la ayuda de
   * la final de Guyrami, o el gas de la prueba que la busca—: entonces la mano
   * sostiene la trayectoria en todos. Ver `sostieneLaVelocidad` en `mano.ts`.
   */
  gasLlevaLaVelocidad: boolean;
  /** El compensador de quien vuela, sin mano. */
  trim: number;
  flaps: number;
  t: number;
  /** Los mandos de la tecla de antes. */
  antes: { aileron: number; elevator: number };
}

/**
 * Un avión nivelado y compensado a esta velocidad indicada y a esta altura,
 * con el gas que la sostiene, en el modelo del peldaño.
 */
export function empezar(
  aircraft: AircraftConfig,
  tier: Tier,
  ias: number,
  alto = 1500,
  flaps = 0,
): VueloDeBanco {
  const tas = ias / Math.sqrt(airDensity(alto) / SEA_LEVEL_DENSITY);
  let modelo: FlightModel;
  let trim = 0;
  if (tier.model === "simple") {
    const m = new ArcadeFlightModel({ aircraft, ground: () => 0 });
    m.reset({ position: new Vector3(0, alto, 0), heading: 0, airspeed: tas });
    modelo = m;
  } else {
    const m = new CoefficientFlightModel({ aircraft, ground: () => 0, assist: tier.assists });
    m.reset({
      position: new Vector3(0, alto, 0),
      heading: 0,
      airspeed: tas,
      equilibrado: true,
    });
    trim = m.timonDeEquilibrio?.() ?? 0;
    modelo = m;
  }
  const gas = Math.max(0, Math.min(1, modelo.gasPara(tas, { flaps, tren: 1 })));
  const v: VueloDeBanco = {
    modelo,
    aircraft,
    tier,
    mano: new ManoQueSostiene(),
    gas,
    gasLlevaLaVelocidad: false,
    trim,
    flaps,
    t: 0,
    antes: { aileron: 0, elevator: 0 },
  };
  // Medio segundo para que la mano pueda coger el avión: es lo que espera al
  // despegar, y aquí el avión ya nace volando.
  volar(v, 0.6, () => ({}));
  return v;
}

/** Lo que ve la mano, como se lo da el juego. Ver `ponerAvion` en `input.ts`. */
export function loQueVe(v: VueloDeBanco): LoQueVeLaMano {
  const s = v.modelo.state;
  const sencillo = v.tier.model === "simple";
  return {
    aircraft: v.aircraft,
    sencillo,
    protegePerdida: v.tier.assists.stallProtection > 0,
    peldanoBajo: v.tier.inclinacionProtegida,
    enTierra: s.onGround,
    alabeo: bankAngleOf(s.orientation),
    cabeceo: pitchAngleOf(s.orientation),
    ritmoDeAlabeo: s.rollRate,
    ritmoDeCabeceo: s.pitchRate,
    vertical: s.verticalSpeed,
    carga: s.loadFactor,
    verdadera: s.airspeed,
    indicada: s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY),
    gasLlevaLaVelocidad: v.gasLlevaLaVelocidad,
    alfa: s.alpha,
    alfaDeAviso: s.stallWarningAlpha,
    flaps: v.flaps,
    timon: v.modelo.timonAhora(),
    mandoParaSubir: v.modelo.mandoParaSubir?.bind(v.modelo),
    mandoParaInclinar: v.modelo.mandoParaInclinar?.bind(v.modelo),
    otraManoAlabeo: false,
    otraManoCabeceo: false,
  };
}

const NADA: LoQuePide = {
  teclaAlabeo: 0,
  teclaCabeceo: 0,
  toqueAlabeo: 0,
  toqueCabeceo: 0,
  mandoAlabeo: false,
  mandoCabeceo: false,
};

/** Lo que se mide en cada fotograma. */
export interface Medida {
  t: number;
  alabeo: number;
  cabeceo: number;
  ritmoDeAlabeo: number;
  ritmoDeCabeceo: number;
  vertical: number;
  carga: number;
  ias: number;
}

/**
 * Vuela `segundos` con la mano. `pide(t)` dice qué teclas se aprietan; y si
 * devuelve `palanca`, el dedo pone la palanca ahí en ese fotograma.
 */
export function volar(
  v: VueloDeBanco,
  segundos: number,
  pide: (t: number) => Partial<LoQuePide> & {
    palanca?: { x: number | null; y: number | null };
    centrar?: boolean;
  },
  medir?: (m: Medida) => void,
): void {
  const c: ControlInputs = neutralControls();
  for (let t = 0; t < segundos - 1e-9; t += DT) {
    const p = pide(t);
    const ve = loQueVe(v);
    if (p.palanca) v.mano.ponerPalanca(p.palanca.x, p.palanca.y);
    if (p.centrar) v.mano.centrar();
    v.mano.paso(DT, ve, { ...NADA, ...p });
    Object.assign(c, neutralControls(), {
      throttle: v.gas,
      flaps: v.flaps,
      aileron: v.mano.llevaAlabeo ? v.mano.aileron : 0,
      elevator: v.mano.llevaCabeceo ? v.mano.elevator : 0,
      trim: v.mano.llevaCabeceo ? v.mano.trim : v.trim,
      manoEnElAlabeo: v.mano.llevaAlabeo,
      manoEnElCabeceo: v.mano.llevaCabeceo,
    });
    if (v.mano.llevaCabeceo) v.trim = v.mano.trim;
    v.modelo.step(DT, c);
    v.t += DT;
    medir?.(medida(v));
  }
}

/**
 * Vuela `segundos` con **la tecla de antes**: el mando va a fondo mientras se
 * aprieta, con la rampa de `input.ts` de antes —2,6 por segundo al apretar y
 * 3,4 al soltar—, y la profundidad corta durante la duda del toque.
 */
export function volarComoAntes(
  v: VueloDeBanco,
  segundos: number,
  pide: (t: number) => { alabeo?: number; cabeceo?: number },
  medir?: (m: Medida) => void,
): void {
  const c: ControlInputs = neutralControls();
  let apretadoDesde = -1;
  for (let t = 0; t < segundos - 1e-9; t += DT) {
    const p = pide(t);
    const cabeceo = p.cabeceo ?? 0;
    if (cabeceo !== 0 && apretadoDesde < 0) apretadoDesde = t;
    if (cabeceo === 0) apretadoDesde = -1;
    const enDuda = apretadoDesde >= 0 && t - apretadoDesde < 0.2;
    const pideCabeceo = enDuda ? Math.max(-0.07, Math.min(0.07, cabeceo)) : cabeceo;
    v.antes.aileron = aproximar(v.antes.aileron, p.alabeo ?? 0, DT);
    v.antes.elevator = aproximar(v.antes.elevator, pideCabeceo, DT);
    Object.assign(c, neutralControls(), {
      throttle: v.gas,
      flaps: v.flaps,
      aileron: v.antes.aileron,
      elevator: v.antes.elevator,
      trim: v.trim,
    });
    v.modelo.step(DT, c);
    v.t += DT;
    medir?.(medida(v));
  }
}

function aproximar(actual: number, meta: number, dt: number): number {
  const ritmo = Math.abs(meta) > Math.abs(actual) ? 2.6 : 3.4;
  const d = meta - actual;
  return Math.abs(d) <= ritmo * dt ? meta : actual + Math.sign(d) * ritmo * dt;
}

function medida(v: VueloDeBanco): Medida {
  const s = v.modelo.state;
  return {
    t: v.t,
    alabeo: bankAngleOf(s.orientation),
    cabeceo: pitchAngleOf(s.orientation),
    ritmoDeAlabeo: s.rollRate,
    ritmoDeCabeceo: s.pitchRate,
    vertical: s.verticalSpeed,
    carga: s.loadFactor,
    ias: s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY),
  };
}

export const EN_GRADOS = 180 / Math.PI;
export { GRAVITY };
