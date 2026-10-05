/**
 * **La ficha técnica de cada avión**, la de la tarjeta.
 *
 * Pedida así: «ficha técnica con letra molona: envergadura, largo, peso
 * máximo, crucero, alcance, techo, motores, plazas y Vref. Datos reales de su
 * clase». Y con la regla de siempre: **ni una cifra inventada**.
 *
 * ## De dónde sale cada número
 *
 * De dos sitios, y cada uno dice el suyo:
 *
 * - **Lo que el juego ya vuela** sale de la ficha del avión, `aircraft.ts`,
 *   y no se copia: la envergadura, el crucero, la Vref y los motores son los
 *   mismos números con los que vuela el modelo de vuelo. Si un día cambian
 *   allí, cambian aquí.
 * - **Lo que el juego no necesita para volar** —el largo, el peso máximo al
 *   despegue, el alcance, el techo y las plazas— es de **su avión de
 *   referencia**, el que ya nombra cada ficha: el Cessna 172R para el JAZ 20,
 *   el Ag Cat para el JAZ 25, el Seneca II para el JAZ 40, el Twin Otter y el
 *   Beech 1900D para el JAZ 60, el Embraer 170 para el JAZ 90 y el 747-100
 *   para el JAZ 120. Cada número lleva al lado de dónde se leyó.
 *
 * Lo que no se ha podido leer en una fuente se queda en `null` y **no sale en
 * la tarjeta**. Es preferible una fila menos a una cifra que alguien aprenda y
 * tenga que desaprender.
 *
 * Todo en unidades SI, como el resto del modelo; la tarjeta lo pasa a nudos,
 * pies y millas al pintarlo.
 */

import type { AircraftConfig } from "./aircraft";

/** Lo que se sabe de la clase de un avión y no está en su ficha de vuelo. */
export interface DeSuClase {
  /** El avión de verdad del que salen estos números. Para el comentario y la prueba. */
  readonly referencia: string;
  /** Largo, m, o `null` si no se ha leído o el modelo no se le parece. */
  readonly largo: number | null;
  /** Peso máximo al despegue, kg. */
  readonly mtow: number | null;
  /** Alcance, m. */
  readonly alcance: number | null;
  /** Techo de servicio, m. */
  readonly techo: number | null;
  /** Plazas, contando a quien pilota. */
  readonly plazas: number | null;
}

const PIE = 0.3048;
const LIBRA = 0.45359237;
const MILLA = 1852;

/**
 * Por avión, con su fuente al lado. Ver la cabecera.
 *
 * El largo es **el del avión de referencia**, y `ficha-tecnica.test.ts`
 * comprueba que el modelo que se dibuja no se aparta de él más de un doce por
 * ciento: si alguien estira un fuselaje en Blender, la ficha y el dibujo
 * dejarían de decir lo mismo.
 */
export const DE_SU_CLASE: Readonly<Record<string, DeSuClase>> = {
  "jaz-20": {
    // Manual de vuelo del 172R (Cessna, 1996, rev. 7): «Performance -
    // Specifications» y la figura 1-1.
    referencia: "Cessna 172R",
    // 27 ft 2 in.
    largo: 8.28,
    // 2.450 lb: la masa del modelo de vuelo es la de este peso.
    mtow: Math.round(2450 * LIBRA),
    // 687 NM al 60 % de potencia a 10.000 ft, con 45 minutos de reserva.
    alcance: 687 * MILLA,
    techo: 13500 * PIE,
    // Quien pilota y tres más.
    plazas: 4,
  },
  "jaz-25": {
    // Manual del piloto del G-164A (Grumman American, 1977) y la aceptación
    // de tipo de Nueva Zelanda sobre la ficha FAA 1A16.
    referencia: "Grumman G-164A Ag Cat",
    /*
     * **Sin largo**, y a propósito. El del Ag Cat son 7,42 m y el biplano que
     * se dibuja mide 9,2: un cuarto más. La revisión de las fichas ya lo dejó
     * escrito —«el biplano se dibuja con un 50 % más de ala de la que
     * vuela»—, y hasta que el modelo y su clase digan lo mismo, la tarjeta no
     * enseña un largo que no es el del avión que se ve.
     */
    largo: null,
    // 4.500 lb.
    mtow: Math.round(4500 * LIBRA),
    // 242 NM con 80 galones al 75 % a nivel del mar; el manual avisa de que
    // es sin reserva, que es como trabaja un fumigador: de campo a campo.
    alcance: 242 * MILLA,
    techo: null,
    // Una: un fumigador lleva la tolva donde otro llevaría pasaje.
    plazas: 1,
  },
  "jaz-40": {
    // Ficha de tipo FAA A7SO, hoja II.
    referencia: "Piper PA-34-200T Seneca II",
    // El largo del Seneca II no se ha podido leer en una fuente: sin largo.
    largo: null,
    // 4.570 lb.
    mtow: Math.round(4570 * LIBRA),
    alcance: null,
    techo: 25000 * PIE,
    // Seis: la cabina con los asientos enfrentados de la A7SO, la de la ficha.
    plazas: 6,
  },
  "jaz-60": {
    /*
     * De dos, y se dice cuál es cuál: la cola en T y el largo son del 1900D
     * (hoja de especificaciones de Raytheon), y el peso y el ala, del Twin
     * Otter (ficha FAA A9EA), que son los que vuela el modelo de vuelo.
     */
    referencia: "DHC-6 Twin Otter serie 300 y Beechcraft 1900D",
    // 57,8 ft.
    largo: 17.62,
    // 12.500 lb.
    mtow: Math.round(12500 * LIBRA),
    alcance: null,
    // 25.000 ft, el techo certificado del 1900D y el del Twin Otter.
    techo: 25000 * PIE,
    // Diecinueve de pasaje y dos en cabina.
    plazas: 21,
  },
  "jaz-90": {
    // Manual de aeropuertos APM-170 de Embraer y ficha de tipo EASA A.135.
    referencia: "Embraer 170 LR",
    // 29,90 m.
    largo: 29.9,
    mtow: 37200,
    // 2.150 NM con alternativo a 100 NM y las reservas de siempre.
    alcance: 2150 * MILLA,
    // 41.000 ft, la altitud máxima de la ficha EASA.
    techo: 41000 * PIE,
    // Setenta y ocho de pasaje y dos en cabina.
    plazas: 80,
  },
  "jaz-120": {
    // Láminas «747-100 Characteristics» de Boeing y ficha FAA A20WE.
    referencia: "Boeing 747-100",
    // 231 ft 10 in de punta a punta; el fuselaje solo son 225 ft 2 in.
    largo: 70.66,
    // 735.000 lb, el mayor de los suyos.
    mtow: Math.round(735000 * LIBRA),
    // 6.100 millas terrestres: 5.300 NM.
    alcance: 5300 * MILLA,
    // El techo de servicio del 100 no se ha podido leer en una fuente.
    techo: null,
    // Cuatrocientos cincuenta y dos de pasaje en dos clases, y los tres de
    // cabina: piloto, copiloto y mecánico de a bordo.
    plazas: 455,
  },
};

/** La clase de motor, para el dibujo y el rótulo. */
export type ClaseDeMotor = "piston" | "radial" | "turbohelice" | "turbofan";

/** La ficha entera, en SI. `null` es «no se sabe con fuente»: no se enseña. */
export interface FichaTecnica {
  readonly envergadura: number;
  readonly largo: number | null;
  readonly mtow: number | null;
  /** Crucero, m/s de verdadera: el del modelo de vuelo. */
  readonly crucero: number;
  readonly alcance: number | null;
  readonly techo: number | null;
  readonly motores: { readonly cuantos: number; readonly clase: ClaseDeMotor };
  readonly plazas: number | null;
  /** Vref, m/s: la del modelo de vuelo. */
  readonly vref: number;
  readonly referencia: string | null;
}

function claseDe(a: AircraftConfig): ClaseDeMotor {
  switch (a.sound.engine) {
    case "turbofan":
      return "turbofan";
    case "turboprop":
      return "turbohelice";
    case "radial":
      return "radial";
    default:
      return "piston";
  }
}

/**
 * La ficha de un avión: lo que vuela, de su ficha de vuelo; lo demás, de su
 * clase. Un avión sin clase anotada enseña solo lo que vuela.
 */
export function fichaTecnicaDe(a: AircraftConfig): FichaTecnica {
  const clase = DE_SU_CLASE[a.id];
  return {
    envergadura: a.wingSpan,
    largo: clase?.largo ?? null,
    mtow: clase?.mtow ?? null,
    crucero: a.cruiseSpeed,
    alcance: clase?.alcance ?? null,
    techo: clase?.techo ?? null,
    motores: { cuantos: a.motores, clase: claseDe(a) },
    plazas: clase?.plazas ?? null,
    vref: a.approachSpeed,
    referencia: clase?.referencia ?? null,
  };
}
