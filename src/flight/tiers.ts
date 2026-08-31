/**
 * Los cuatro tramos de dificultad.
 *
 * No son «un modo para niños y otro de verdad». Son una escalera, y lo que
 * cambia de un peldaño al siguiente **no es el mundo ni el avión**: es cuánta
 * física se le confía al jugador.
 *
 * Los nombres son aves guaraníes y en pantalla se eligen con retratos, sin
 * que aparezca nunca una edad: nadie quiere elegir «el modo de pequeños»,
 * pero todo el mundo elige el colibrí. Las edades de aquí son una guía para
 * quien programa, no una etiqueta para quien juega.
 *
 * El primer peldaño usa **otro modelo de vuelo**, no el mismo con más ayudas.
 * Esa es la lección que costó cuatro intentos: pelear con un modelo realista
 * para que se comporte de forma sencilla es luchar contra la física que uno
 * mismo eligió. El fugoide existe porque el avión intercambia altura y
 * velocidad; la forma de no tenerlo no es amortiguarlo, es no tenerlo.
 */

import { type AssistLayers, FULL_ASSISTS, NO_ASSISTS } from './assists';

export type TierId = 'mainumby' | 'tuka' | 'taguato' | 'taguato-ruvicha';

/** Qué motor de vuelo mueve al avión en este tramo. */
export type FlightModelKind = 'simple' | 'coefficient';

export interface Tier {
  id: TierId;
  /** Nombre visible. No se traduce: es un nombre propio en guaraní. */
  name: string;
  /** Guía de edad, para quien programa. Nunca se muestra al jugar. */
  ages: string;
  model: FlightModelKind;
  assists: AssistLayers;
  /** Cuántos instrumentos se enseñan. Ver el HUD. */
  instruments: 'none' | 'pictorial' | 'numeric' | 'full';
  /** Unidades: métricas para los pequeños, aeronáuticas para los mayores. */
  units: 'metric' | 'aeronautical';
}

export const MAINUMBY: Tier = {
  id: 'mainumby',
  name: 'Mainumby',
  ages: '4-6',
  // Modelo propio y sencillo: el avión va donde apunta el morro. Sin
  // intercambio de energía, sin fugoide, sin pérdida. No es el modelo de
  // coeficientes con ayudas: es otro modelo.
  model: 'simple',
  assists: FULL_ASSISTS,
  instruments: 'none',
  units: 'metric',
};

export const TUKA: Tier = {
  id: 'tuka',
  name: 'Tukã',
  ages: '7-9',
  model: 'coefficient',
  // Física de verdad, pero con red completa: no se puede entrar en pérdida,
  // las alas vuelven solas y el viraje se coordina.
  assists: FULL_ASSISTS,
  instruments: 'pictorial',
  units: 'metric',
};

export const TAGUATO: Tier = {
  id: 'taguato',
  name: 'Taguato',
  ages: '10-13',
  model: 'coefficient',
  // Se retiran las ayudas que sustituyen al piloto y se quedan las que le
  // avisan. Ya se puede entrar en pérdida; ya hay que nivelar las alas uno
  // mismo. El timón automático sobrevive porque coordinar un viraje con los
  // pies es un aprendizaje aparte, y llega después.
  assists: {
    wingLeveller: 0,
    autoRudder: 0.6,
    climbHold: 0.45,
    stallProtection: 0,
    extraDamping: 0.35,
    crashTolerance: 0.4,
  },
  instruments: 'numeric',
  units: 'metric',
};

export const TAGUATO_RUVICHA: Tier = {
  id: 'taguato-ruvicha',
  name: 'Taguato Ruvicha',
  ages: '14+',
  model: 'coefficient',
  assists: NO_ASSISTS,
  instruments: 'full',
  units: 'aeronautical',
};

export const TIERS: readonly Tier[] = [MAINUMBY, TUKA, TAGUATO, TAGUATO_RUVICHA];

export function tierById(id: TierId): Tier {
  const found = TIERS.find((tier) => tier.id === id);
  if (!found) throw new Error(`Tramo desconocido: ${id}`);
  return found;
}
