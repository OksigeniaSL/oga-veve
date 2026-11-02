/**
 * **El mapa del vuelo**, sin dibujo: dónde cae cada cosa en el mapa plano de la
 * pantalla del respaldo. Lo pinta `world/pantalla-del-respaldo.ts`.
 *
 * ## La proyección, a mano
 *
 * Longitud y latitud tal cual, a la misma escala las dos: la plate carrée, la
 * más simple que hay, y por eso una línea de cuenta y ninguna dependencia. Se
 * eligió mirando el camino, no por comodidad: es **lo que enseña el mapa**, que
 * la ortodrómica —el camino más corto sobre una pelota— en un mapa plano sale
 * curva. Con la de Mercator, la de casi todas las pantallas de avión, se aparta
 * de la recta un 2,5 % de lo que mide; con ésta, un 3,9 %, y siempre hacia el
 * mismo lado. Son unos veinticinco píxeles de barriga a mil de ancho: se ve sin
 * tener que buscarla.
 *
 * El encuadre está centrado en el camino y deja ver lo que lo sitúa: la
 * península y Canarias, África, el Atlántico entero, Brasil y el Paraguay.
 *
 * ## La pelota, también a mano
 *
 * La otra proyección es la ortográfica, la de mirar una pelota desde lejos, con el
 * punto medio de la ruta en el centro. No es por gusto: **un círculo máximo que pasa
 * por el centro de una ortográfica es una recta**, porque su plano contiene la línea
 * de mirar. Es la lección entera: lo que en el mapa plano sale curvo es lo más
 * derecho que hay.
 */

import { GRADO } from "../world/cielo-de-noche";
import type { Sitio } from "../world/entre-aerodromos";
import { temperaturaExterior } from "./atmosphere";
import {
  BARAJAS,
  DE_CALZOS_A_CALZOS,
  DE_MADRID_A_ASUNCION,
  dondeVa,
  HUSO_DE_ASUNCION,
  horaLocal,
  husoDeMadrid,
  PETTIROSSI,
  puntoBajoElSol,
  puntosDelCamino,
  puntoEn,
  RODAJE_DE_SALIDA,
  solEn,
  type Ortodromica,
  type PerfilDelVuelo,
} from "./ruta-larga";

/** **Lo que abarca el mapa**, grados: 144 de ancho por 90 de alto, que es el 16:10 de la pantalla. */
export const ENCUADRE = { oeste: -103, este: 41, norte: 52, sur: -38 } as const;

/** Ancho entre alto de la pantalla y del mapa. */
export const PROPORCION_DEL_MAPA = (ENCUADRE.este - ENCUADRE.oeste) / (ENCUADRE.norte - ENCUADRE.sur);

/** Un punto del mapa, en fracciones: x de 0 a 1 hacia el este e y de 0 a 1 hacia el sur. */
export interface EnElMapa {
  readonly x: number;
  readonly y: number;
}

/** **La proyección**. Ver la cabecera. */
export function enElMapa(lon: number, lat: number): EnElMapa {
  return {
    x: (lon - ENCUADRE.oeste) / (ENCUADRE.este - ENCUADRE.oeste),
    y: (ENCUADRE.norte - lat) / (ENCUADRE.norte - ENCUADRE.sur),
  };
}

/** El mapa de un sitio. */
export const sitioEnElMapa = (s: Sitio): EnElMapa => enElMapa(s.lon, s.lat);

/**
 * **El camino en el mapa**, con lo recorrido de cada punto: la ortodrómica, cada
 * cien kilómetros, que a esta escala son seis píxeles y la curva no se quiebra.
 */
export function caminoEnElMapa(ruta: Ortodromica = DE_MADRID_A_ASUNCION): readonly (EnElMapa & { readonly recorrido: number })[] {
  return puntosDelCamino(ruta).map((p) => ({ ...sitioEnElMapa(p.sitio), recorrido: p.recorrido }));
}

/** El avión en el mapa: dónde, por dónde va del camino y hacia dónde apunta. */
export interface AvionEnElMapa extends EnElMapa {
  /** Lo recorrido, m. */
  readonly recorrido: number;
  /**
   * **Hacia dónde apunta en el mapa**, rad: cero hacia arriba y creciendo a la
   * derecha, como un rumbo. **No es el rumbo de verdad**: es la tangente del
   * camino ya dibujado, que un mapa plano tuerce, y un avión pintado de lado
   * respecto a su camino se lee mal.
   */
  readonly apunta: number;
}

/**
 * **Dónde va el avión** a `t` segundos del despegue. Sale de `dondeVa`: es el
 * mismo sitio que usa el salto bajo tapa, y el mapa no puede decir otra cosa.
 */
export function avionEnElMapa(perfil: PerfilDelVuelo, t: number): AvionEnElMapa {
  const donde = dondeVa(perfil, t);
  const ruta = perfil.ruta;
  const aqui = sitioEnElMapa(donde.sitio);
  // Veinte kilómetros a cada lado, sin salirse del camino: basta para la tangente.
  const a = sitioEnElMapa(puntoEn(ruta, Math.max(0, donde.recorrido - 20_000)));
  const b = sitioEnElMapa(puntoEn(ruta, Math.min(ruta.distancia, donde.recorrido + 20_000)));
  return {
    ...aqui,
    recorrido: donde.recorrido,
    apunta: Math.atan2((b.x - a.x) * PROPORCION_DEL_MAPA, a.y - b.y),
  };
}

/**
 * **Cuánto se aparta el camino de la recta** entre sus dos extremos, en
 * fracciones de lo que mide esa recta y con su signo. Es la cuenta de la cabecera,
 * y lo que comprueba la prueba: un camino recto en este mapa sería un mapa que no
 * enseña lo que dice.
 */
export function barrigaDelCamino(camino: readonly EnElMapa[] = caminoEnElMapa()): number {
  const a = camino[0]!;
  const b = camino[camino.length - 1]!;
  const dx = (b.x - a.x) * PROPORCION_DEL_MAPA;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy);
  let peor = 0;
  for (const p of camino) {
    const d = (dx * (p.y - a.y) - (p.x - a.x) * PROPORCION_DEL_MAPA * dy) / largo;
    if (Math.abs(d) > Math.abs(peor)) peor = d;
  }
  return peor / largo;
}

// ── La raya del día y la noche ──────────────────────────────────────────

/**
 * **La raya del día y la noche sobre un mapa de longitud y latitud**: dónde tiene
 * el sol en el horizonte cada meridiano, de `oeste` a `este` cada `paso` grados, y
 * de qué lado queda la noche.
 *
 * La raya es un círculo máximo, el perpendicular a la dirección del sol, y sale de
 * despejar la altura cero: tan(lat) = −cos(ángulo horario) / tan(declinación). En
 * junio el polo norte tiene sol todo el día y la noche queda al sur de la raya, y en
 * diciembre al revés. En los equinoccios la declinación pasa por cero y la raya se
 * pone casi vertical sin que la cuenta se rompa, salvo en el cero justo, que se
 * esquiva con un pelo de declinación: un microgrado no se ve en ninguna pantalla.
 */
export function rayaDelDia(
  instante: Date,
  oeste: number = ENCUADRE.oeste,
  este: number = ENCUADRE.este,
  paso = 1,
): { readonly puntos: readonly Sitio[]; readonly nocheAlSur: boolean } {
  const sol = puntoBajoElSol(instante);
  const declinacion = (Math.abs(sol.lat) < 1e-6 ? 1e-6 : sol.lat) * GRADO;
  const puntos: Sitio[] = [];
  const n = Math.max(1, Math.ceil((este - oeste) / paso));
  for (let i = 0; i <= n; i++) {
    const lon = oeste + ((este - oeste) * i) / n;
    puntos.push({ lon, lat: Math.atan(-Math.cos((lon - sol.lon) * GRADO) / Math.tan(declinacion)) / GRADO });
  }
  return { puntos, nocheAlSur: declinacion > 0 };
}

// ── La pelota ───────────────────────────────────────────────────────────

/** Un punto de la pelota, en radios de ella: x a la derecha, y **hacia abajo**, como un lienzo, y z hacia quien mira. */
export interface EnLaPelota {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** **El centro de la pelota**: la mitad de la ortodrómica. Ver la cabecera. */
export const CENTRO_DE_LA_PELOTA: Sitio = puntoEn(DE_MADRID_A_ASUNCION, DE_MADRID_A_ASUNCION.distancia / 2);

const SENO_CENTRO = Math.sin(CENTRO_DE_LA_PELOTA.lat * GRADO);
const COSENO_CENTRO = Math.cos(CENTRO_DE_LA_PELOTA.lat * GRADO);

/** **La proyección de la pelota**, con el norte arriba. Lo de `z` negativo queda detrás. */
export function enLaPelota(s: Sitio): EnLaPelota {
  const f = s.lat * GRADO;
  const l = (s.lon - CENTRO_DE_LA_PELOTA.lon) * GRADO;
  const [sf, cf] = [Math.sin(f), Math.cos(f)];
  const [sl, cl] = [Math.sin(l), Math.cos(l)];
  return {
    x: cf * sl,
    y: -(COSENO_CENTRO * sf - SENO_CENTRO * cf * cl),
    z: SENO_CENTRO * sf + COSENO_CENTRO * cf * cl,
  };
}

/**
 * **El camino en la pelota**, con lo recorrido de cada punto. Cada cien kilómetros,
 * como el del mapa, aunque aquí dos puntos bastarían: así se pinta con la misma
 * cuenta, entero lo volado y en puntos lo que falta.
 */
export function caminoEnLaPelota(ruta: Ortodromica = DE_MADRID_A_ASUNCION): readonly (EnLaPelota & { readonly recorrido: number })[] {
  return puntosDelCamino(ruta).map((p) => ({ ...enLaPelota(p.sitio), recorrido: p.recorrido }));
}

/** El avión en la pelota: dónde y hacia dónde apunta en ella, rad, cero hacia arriba y creciendo a la derecha. */
export function avionEnLaPelota(perfil: PerfilDelVuelo, t: number): EnLaPelota & { readonly recorrido: number; readonly apunta: number } {
  const donde = dondeVa(perfil, t);
  const ruta = perfil.ruta;
  const a = enLaPelota(puntoEn(ruta, Math.max(0, donde.recorrido - 20_000)));
  const b = enLaPelota(puntoEn(ruta, Math.min(ruta.distancia, donde.recorrido + 20_000)));
  return { ...enLaPelota(donde.sitio), recorrido: donde.recorrido, apunta: Math.atan2(b.x - a.x, a.y - b.y) };
}

/**
 * **La parte de noche de la pelota**, en radios y con y hacia abajo: `raya` es la
 * del día y la noche, de borde a borde por la cara visible, y `borde` el trozo de
 * contorno que cierra la noche por el lado contrario al sol.
 *
 * El círculo de la raya se pinta como media elipse: `u` es la dirección del sol en
 * el plano de la pelota y `v` su perpendicular. La raya pasa por +v y −v, en el
 * contorno, y por el punto −sz·u. Si el sol da de cara a quien mira, ese punto queda
 * del lado de la noche y sale un gajo; si da por detrás, cruza al otro lado y la noche
 * ocupa casi toda la pelota. Salen los dos solos de la misma cuenta.
 */
export function nocheEnLaPelota(instante: Date, n = 48): { readonly raya: readonly (readonly [number, number])[]; readonly borde: readonly (readonly [number, number])[] } {
  const sol = enLaPelota(puntoBajoElSol(instante));
  const k = Math.hypot(sol.x, sol.y);
  const [ux, uy] = k > 1e-9 ? [sol.x / k, sol.y / k] : [1, 0];
  const [vx, vy] = [-uy, ux];
  const raya: (readonly [number, number])[] = [];
  const borde: (readonly [number, number])[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    raya.push([c * vx - s * sol.z * ux, c * vy - s * sol.z * uy]);
    // De −v a +v, por −u.
    borde.push([-c * vx - s * ux, -c * vy - s * uy]);
  }
  return { raya, borde };
}

// ── Los relojes ─────────────────────────────────────────────────────────

/** **Un reloj de agujas**: los ángulos desde las doce, rad, en el sentido de las agujas. */
export interface Reloj {
  /** s desde la medianoche de ese reloj. */
  readonly segundos: number;
  readonly aguja: { readonly hora: number; readonly minuto: number };
  /** Si allí el sol está por encima de la horizontal: lo que dibuja el sol o la luna. */
  readonly deDia: boolean;
}

function relojDe(instante: Date, huso: number, sitio: Sitio): Reloj {
  const segundos = horaLocal(instante, huso);
  return {
    segundos,
    aguja: {
      hora: (((segundos / 3600) % 12) / 12) * 2 * Math.PI,
      minuto: (((segundos / 60) % 60) / 60) * 2 * Math.PI,
    },
    // Con la misma raya que el mapa, y no con el ocaso civil: un reloj con sol sobre una ciudad a oscuras en el mapa se leería mal.
    deDia: solEn(instante, sitio).altura > 0,
  };
}

/**
 * **Los dos relojes de la pantalla**, con los husos de `ruta-larga.ts` y el sol de
 * cada ciudad en ese instante. Por eso la cuenta de las cuatro o cinco horas de
 * diferencia sale sola, y por eso cambia con la hora de España y no con la del
 * Paraguay.
 */
export function relojesEn(instante: Date): { readonly madrid: Reloj; readonly asuncion: Reloj } {
  return {
    madrid: relojDe(instante, husoDeMadrid(instante), BARAJAS),
    asuncion: relojDe(instante, HUSO_DE_ASUNCION, PETTIROSSI),
  };
}

// ── Los datos ───────────────────────────────────────────────────────────

/**
 * **Lo que marca el avión de verdad**, en el SI del modelo. Si no se da, vale el
 * perfil, que es lo que pasa en las pruebas.
 */
export interface LoQueMarcaElAvion {
  /** m sobre el mar. */
  readonly altitud: number;
  /** Sobre el suelo, m/s. */
  readonly velocidad: number;
  /** La de fuera, °C. */
  readonly temperatura?: number;
}

/** **Lo que da un mapa de a bordo**, todavía en el SI: las unidades las pone quien lo pinta. */
export interface DatosDelVuelo {
  /** m. */
  readonly altitud: number;
  /** m/s. */
  readonly velocidad: number;
  /** °C. */
  readonly temperatura: number;
  /** La hora de llegada en el reloj de Asunción, s desde su medianoche. */
  readonly llegada: number;
  /** Lo que falta de camino, m. */
  readonly faltaDeCamino: number;
  /** Lo que falta de tiempo hasta los calzos, s. */
  readonly faltaDeTiempo: number;
  /** Cuánto se ha hecho del camino, de 0 a 1. */
  readonly hecho: number;
}

/**
 * **Los datos a `t` segundos del despegue.** Altitud y velocidad son las del avión
 * cuando se dan, y la temperatura la de la atmósfera tipo a esa altitud si el juego
 * no da otra. Lo que falta y la llegada salen del perfil: son del vuelo, no de cómo va
 * el avión en este segundo. La llegada es la de calzos, las 06:25 o las 07:30, la que
 * dicen el horario y la comandante.
 */
export function datosDelVuelo(perfil: PerfilDelVuelo, t: number, avion?: LoQueMarcaElAvion): DatosDelVuelo {
  const donde = dondeVa(perfil, t);
  const altitud = avion?.altitud ?? donde.altitud;
  const hastaLosCalzos = DE_CALZOS_A_CALZOS[perfil.horario.temporada] - RODAJE_DE_SALIDA - t;
  return {
    altitud,
    velocidad: avion?.velocidad ?? donde.velocidad,
    temperatura: avion?.temperatura ?? temperaturaExterior(altitud),
    llegada: horaLocal(perfil.horario.llegada, HUSO_DE_ASUNCION),
    faltaDeCamino: Math.max(0, perfil.ruta.distancia - donde.recorrido),
    faltaDeTiempo: Math.max(0, hastaLosCalzos),
    hecho: Math.min(1, Math.max(0, donde.recorrido / perfil.ruta.distancia)),
  };
}
