/**
 * Los cuatro tramos de dificultad.
 *
 * No son «un modo para niños y otro de verdad». Son una escalera, y lo que
 * cambia de un peldaño al siguiente **no es el mundo ni el avión**: es cuánta
 * física se le confía al jugador.
 *
 * Los nombres son aves guaraníes y en pantalla se eligen con retratos, sin
 * que aparezca nunca una edad: nadie quiere elegir «el modo de pequeños»,
 * pero todo el mundo elige el pajarito. Las edades de aquí son una guía para
 * quien programa, no una etiqueta para quien juega.
 *
 * **Los nombres de tramo no pueden coincidir con los de las aeronaves.** El
 * primero se llamó Mainumby durante unas horas, que es también el nombre del
 * biplano fumigador, y la confusión fue inmediata: al leer «Mainumby» en el
 * rótulo, uno no sabe si le están diciendo en qué nivel está o qué avión
 * lleva. Antes de bautizar un tramo o una aeronave, mirar la otra lista.
 *
 * El primer peldaño usa **otro modelo de vuelo**, no el mismo con más ayudas.
 * Esa es la lección que costó cuatro intentos: pelear con un modelo realista
 * para que se comporte de forma sencilla es luchar contra la física que uno
 * mismo eligió. El fugoide existe porque el avión intercambia altura y
 * velocidad; la forma de no tenerlo no es amortiguarlo, es no tenerlo.
 */

import { type AssistLayers, FULL_ASSISTS, NO_ASSISTS } from './assists';

export type TierId = 'guyrami' | 'tuka' | 'taguato' | 'taguato-ruvicha';

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
  /**
   * Si sale el coche del «sígame» a llevarte por las calles de rodaje.
   *
   * Es la versión de cuatro años del rodaje complicado: **no hay que leer un
   * plano, hay que seguir a un coche**. Y la versión de catorce es que el
   * coche ya no viene y hay que saber ir solo, que es exactamente lo que pasa
   * en un aeropuerto de verdad cuando el piloto conoce el campo.
   */
  sigueme: boolean;
}

export const GUYRAMI: Tier = {
  id: 'guyrami',
  name: 'Guyrami',
  ages: '4-6',
  // Modelo propio y sencillo: el avión va donde apunta el morro. Sin
  // intercambio de energía, sin fugoide, sin pérdida. No es el modelo de
  // coeficientes con ayudas: es otro modelo.
  model: 'simple',
  assists: FULL_ASSISTS,
  instruments: 'none',
  units: 'metric',
  sigueme: true,
};

export const TUKA: Tier = {
  id: 'tuka',
  name: 'Tukã',
  ages: '7-9',
  model: 'coefficient',
  // Física de verdad, pero con red completa: no se puede entrar en pérdida,
  // las alas vuelven solas y el viraje se coordina.
  //
  // En tierra la red se afloja un poco: la asistencia de rodaje empuja hacia
  // la raya, pero ya no lleva de la mano. Es el primer peldaño en el que uno
  // se puede salir de la calle si se despista.
  assists: { ...FULL_ASSISTS, taxiAssist: 0.65 },
  instruments: 'pictorial',
  units: 'metric',
  // Todavía viene, pero aquí ya hay raya amarilla y letras que leer: el coche
  // es la red, no el camino.
  sigueme: true,
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
    // Un empujón de nada, solo para que una curva cerrada no te eche a la
    // hierba por un pelo. Girar es cosa tuya.
    taxiAssist: 0.25,
  },
  instruments: 'numeric',
  units: 'metric',
  // Aquí se acabó: el plano de rodaje es la lección, y con un coche delante no
  // hay plano que aprender.
  sigueme: false,
};

export const TAGUATO_RUVICHA: Tier = {
  id: 'taguato-ruvicha',
  name: 'Taguato Ruvicha',
  ages: '14+',
  model: 'coefficient',
  assists: NO_ASSISTS,
  instruments: 'full',
  units: 'aeronautical',
  sigueme: false,
};

export const TIERS: readonly Tier[] = [GUYRAMI, TUKA, TAGUATO, TAGUATO_RUVICHA];

/**
 * Con qué peldaño se abre el juego.
 *
 * **Taguato, no el primero.** Quien abre el enlace por primera vez es casi
 * siempre un adulto —y esta demo es además el escaparate público de la
 * empresa—, y arrancar en el peldaño de los pequeños le da una pantalla sin
 * un solo dato y la sensación de que el juego no tiene nada. El tramo
 * infantil se elige a propósito, normalmente porque un adulto se lo pone a
 * un niño; el de en medio es el que sirve por defecto a casi todo el mundo.
 *
 * Y la elección se recuerda, así que la tablet de un aula abre donde la
 * dejaron.
 */
export const DEFAULT_TIER = TAGUATO;

const STORAGE_KEY = 'oga-veve:tramo';

/**
 * Último tramo elegido, o el de por defecto si no hay ninguno guardado.
 *
 * Y `?tramo=guyrami` en la dirección manda sobre lo guardado, igual que
 * `?escenario=` y `?leccion=`. No existía, y varios guiones de comprobación lo
 * pasaban creyendo que funcionaba: se probaban en Taguato mientras el informe
 * decía Guyrami. Un banco de pruebas que miente es peor que no tener banco.
 */
export function rememberedTier(): Tier {
  try {
    const pedido = new URLSearchParams(location.search).get('tramo');
    const directo = pedido ? TIERS.find((t) => t.id === pedido) : undefined;
    if (directo) return directo;
  } catch {
    // Sin `location` —una prueba, por ejemplo— manda lo guardado.
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const found = TIERS.find((tier) => tier.id === saved);
    if (found) return found;
  } catch {
    // Navegación privada o almacenamiento bloqueado: se juega igual.
  }
  return DEFAULT_TIER;
}

export function rememberTier(tier: Tier): void {
  try {
    localStorage.setItem(STORAGE_KEY, tier.id);
  } catch {
    // Igual que arriba: no poder recordarlo no puede romper nada.
  }
}

export function tierById(id: TierId): Tier {
  const found = TIERS.find((tier) => tier.id === id);
  if (!found) throw new Error(`Tramo desconocido: ${id}`);
  return found;
}
