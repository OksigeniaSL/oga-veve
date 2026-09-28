/**
 * **«Hace calor: la pista se hace más larga».**
 *
 * Desde que la densidad es la del día —ver `atmosphere.ts`—, una tarde de
 * calor se nota en el avión: corre más para llegar a la misma indicada y el
 * motor empuja menos, así que la carrera se alarga. En un reactor, una tarde
 * de 38 °C en Asunción son unos cien metros más que en un día estándar; en
 * una avioneta, un quinto más de carrera.
 *
 * Y lo que el avión hace sin decirlo no se aprende: se nota que tarda en
 * despegar y no se sabe por qué, o no se nota. «Caliente y alto» es de lo
 * primero que se enseña en una escuela de vuelo y de lo que más accidentes ha
 * explicado, así que se cuenta **cuando pesa**, antes de despegar, en los
 * peldaños que ya leen cifras: la instructora lo dice y la tarjeta lo pone
 * con los números.
 *
 * Este módulo solo decide si pesa y cuánto. Lo dice `Game.decirElCalor`.
 */

import {
  aireDelParte,
  airDensity,
  alturaDeDensidad,
} from "./atmosphere";
import type { AircraftConfig } from "./aircraft";
import { carreraHastaVr } from "./carrera";
import type { Superficie } from "../world/superficie";

/**
 * Desde cuántos grados por encima del día estándar se cuenta, K.
 *
 * Quince: en Asunción, a partir de unos treinta grados; en la costa de
 * Canarias, de treinta. Por debajo el efecto existe y el avión lo vuela, pero
 * no es lo que decide el día: un día normal de verano no tiene por qué sonar
 * a aviso.
 */
export const CALOR_QUE_SE_CUENTA = 15;

/**
 * Y desde cuánto más larga tiene que salir la carrera, en fracción: una
 * décima. Es el orden de lo que un manual de vuelo manda sumar al calcular la
 * pista, y por debajo de eso no cambia ninguna decisión.
 */
export const CARRERA_QUE_SE_CUENTA = 0.1;

/** Lo que se cuenta del calor de hoy. */
export interface Calor {
  /** La temperatura del parte, °C. */
  readonly grados: number;
  /**
   * Cuánto más larga es la carrera hasta la Vr que en un día estándar en este
   * mismo campo, en fracción: 0,15 es un quince por ciento.
   */
  readonly masLarga: number;
  /** La altitud de densidad del campo hoy, m. Ver `alturaDeDensidad`. */
  readonly alturaDeDensidad: number;
}

/**
 * Si el calor de hoy pesa en la carrera de este avión en este campo, y
 * cuánto, o `null` si no pesa.
 *
 * Se compara con **un día estándar en el mismo campo** y con la misma
 * presión: lo que se cuenta es lo que pone el calor, no lo que pone la altura
 * del campo, que es otra lección y está todos los días.
 */
export function calorQuePesa(
  avion: AircraftConfig,
  parte: { readonly temp: number; readonly qnh: number },
  cotaDelCampo: number,
  superficie: Superficie = "asfalto",
): Calor | null {
  const estandar = 15 - 0.0065 * cotaDelCampo;
  if (parte.temp - estandar < CALOR_QUE_SE_CUENTA) return null;
  const hoy = aireDelParte(parte.temp, cotaDelCampo, parte.qnh);
  const deTablas = aireDelParte(estandar, cotaDelCampo, parte.qnh);
  const carreraHoy = carreraHastaVr(
    avion,
    superficie,
    airDensity(cotaDelCampo, hoy),
  );
  const carreraEstandar = carreraHastaVr(
    avion,
    superficie,
    airDensity(cotaDelCampo, deTablas),
  );
  const masLarga = carreraHoy / carreraEstandar - 1;
  if (!(masLarga >= CARRERA_QUE_SE_CUENTA)) return null;
  return {
    grados: parte.temp,
    masLarga,
    alturaDeDensidad: alturaDeDensidad(cotaDelCampo, hoy),
  };
}
