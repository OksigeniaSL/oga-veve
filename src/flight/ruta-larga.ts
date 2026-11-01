/**
 * **El vuelo largo como datos**: de Barajas a Pettirossi por la ortodrómica,
 * con su perfil, su horario de verano y de invierno, la hora en cada sitio y
 * si es de día o de noche.
 *
 * Es la base del largo radio (ADR 0023). El vuelo dura once horas y pico y en
 * casa se juega en unos cuarenta y cinco minutos, así que el juego tiene que
 * poder preguntar **dónde está el avión a una hora dada** —para el salto bajo
 * tapa y para entrar en un capítulo— y **qué hora es y qué luz hay** en ese
 * sitio. Las dos cosas salen de aquí, sin mundo, sin escena y sin dibujo: se
 * puede comprobar sin volar, y las pruebas fijan las cifras del plan.
 *
 * ## La ortodrómica, y no la ruta de la carta
 *
 * El vuelo de verdad va por aerovías —el corredor EUR/SAM, con rutas de
 * sentido único que pasan por Canarias—, y sobre el océano no hay receptores
 * de libre acceso para comprobar por dónde va un vuelo concreto. La
 * ortodrómica pasa justo por ahí, por encima de El Hierro, así que lo que se
 * ve es lo mismo, y lo que enseña es verdad: **el camino más corto sobre una
 * pelota**, que en un mapa plano sale curvo.
 *
 * Se cuenta sobre una esfera, con vectores y no con fórmulas de senos de
 * navegación: el punto a lo largo, el rumbo y lo que queda a cada lado son un
 * producto vectorial cada uno. La esfera se aparta del elipsoide en unas
 * décimas por ciento —una docena de kilómetros en nueve mil—, menos que el
 * viento de un día cualquiera.
 *
 * ## Unidades
 *
 * Las de dentro del modelo de vuelo: metros, segundos y radianes, también el
 * rumbo. Lo único en grados son **las coordenadas**, porque así vienen los
 * aeródromos, los sitios y el cielo (`Sitio`, `cieloDe`), y pasarlas a
 * radianes en la frontera solo multiplicaría las conversiones. Las horas son
 * instantes (`Date`) o segundos desde la medianoche local; cómo se pintan lo
 * decide quien las pinte.
 */

import SGAS from "../../data/aerodromes/sgas.aero.json";
import type { Sitio } from "../world/entre-aerodromos";
import { bajadaDelHorizonte, RADIO_DE_LA_TIERRA } from "../world/curvatura";
import {
  alHorizonte,
  alturaYAcimut,
  aplicar,
  GRADO,
  siglos,
  solDeVerdad,
  tiempoSidereo,
} from "../world/cielo-de-noche";
import { esDeNoche, horaSolarEn } from "../world/hora";
import { trueFromIndicated } from "./atmosphere";
import { ALTITUD_DEL_TOPE, NUDO, TOPE_BAJO_EL_100 } from "./escalera-de-velocidades";
import { PIE } from "./ruta";

// ── Los dos aeropuertos ─────────────────────────────────────────────────

/**
 * **Barajas**, por su punto de referencia del AIP de ENAIRE: «402820N
 * 0033339W», 609 m (AD 2-LEMD-1, AD 2.2, AIRAC AMDT 10/26, en vigor el
 * 29-10-2026). Barajas mide cuatro kilómetros de norte a sur, y **el punto
 * importa**: con el centro que da OurAirports, dos kilómetros y medio más al
 * norte, Valverde pasa de 2,2 a 4,4 km de la ruta. Se usa el oficial.
 */
export const BARAJAS: Sitio & { readonly elevacion: number } = {
  lat: 40 + 28 / 60 + 20 / 3600,
  lon: -(3 + 33 / 60 + 39 / 3600),
  elevacion: 609,
};

/**
 * **Pettirossi**, por el mismo punto en el que se monta el mundo de Paraguay
 * (`PETTIROSSI` en `world/scenarios.ts`): así, cuando el vuelo largo cambie
 * al mundo de la llegada, la ruta acaba donde ese mundo tiene su centro.
 */
export const PETTIROSSI: Sitio & { readonly elevacion: number } = {
  lat: SGAS.origin.lat,
  lon: SGAS.origin.lon,
  elevacion: SGAS.elevationM,
};

// ── La ortodrómica ──────────────────────────────────────────────────────

/** Un vector unidad desde el centro de la Tierra: X a Greenwich, Z al norte. */
type V3 = readonly [number, number, number];

function vector(s: Sitio): V3 {
  const f = s.lat * GRADO;
  const l = s.lon * GRADO;
  return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
}

function sitioDe(v: V3): Sitio {
  return {
    lat: Math.atan2(v[2], Math.hypot(v[0], v[1])) / GRADO,
    lon: Math.atan2(v[1], v[0]) / GRADO,
  };
}

function cruz(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function escalar(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function unidad(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}

/**
 * **Un círculo máximo de un sitio a otro**: los dos extremos, lo que mide y
 * su polo. El polo es la perpendicular al plano del círculo, del lado
 * izquierdo de quien avanza por él: lo que queda a un lado o al otro es
 * cuánto se aparta de ese plano.
 */
export interface Ortodromica {
  readonly desde: Sitio;
  readonly hasta: Sitio;
  /** Lo que mide, m. */
  readonly distancia: number;
  readonly origen: V3;
  readonly polo: V3;
}

export function ortodromica(desde: Sitio, hasta: Sitio): Ortodromica {
  const a = vector(desde);
  const b = vector(hasta);
  return {
    desde,
    hasta,
    distancia: Math.atan2(Math.hypot(...cruz(a, b)), escalar(a, b)) * RADIO_DE_LA_TIERRA,
    origen: a,
    polo: unidad(cruz(a, b)),
  };
}

/** **La del vuelo**: de Barajas a Pettirossi. Unos 9.189 km. */
export const DE_MADRID_A_ASUNCION: Ortodromica = ortodromica(BARAJAS, PETTIROSSI);

/** El vector del punto que está a `recorrido` metros del origen, por el círculo. */
function vectorEn(o: Ortodromica, recorrido: number): V3 {
  const th = recorrido / RADIO_DE_LA_TIERRA;
  const t = cruz(o.polo, o.origen);
  const [c, s] = [Math.cos(th), Math.sin(th)];
  return [
    o.origen[0] * c + t[0] * s,
    o.origen[1] * c + t[1] * s,
    o.origen[2] * c + t[2] * s,
  ];
}

/** **El sitio** que está a `recorrido` metros del origen por la ortodrómica. */
export function puntoEn(o: Ortodromica, recorrido: number): Sitio {
  return sitioDe(vectorEn(o, recorrido));
}

/**
 * **El rumbo verdadero** en ese punto, en radianes de 0 a 2π: el norte es
 * cero y el este π/2, como en `rumbo.ts`.
 *
 * Es lo que la ortodrómica tiene de lección: el rumbo **cambia** por el
 * camino aunque se vuele recto. Sale de Madrid a 227° y llega a 218°.
 */
export function rumboEn(o: Ortodromica, recorrido: number): number {
  const p = vectorEn(o, recorrido);
  const avance = cruz(o.polo, p);
  const f = Math.asin(Math.max(-1, Math.min(1, p[2])));
  const l = Math.atan2(p[1], p[0]);
  const norte: V3 = [-Math.sin(f) * Math.cos(l), -Math.sin(f) * Math.sin(l), Math.cos(f)];
  const este: V3 = [-Math.sin(l), Math.cos(l), 0];
  const r = Math.atan2(escalar(avance, este), escalar(avance, norte));
  return r < 0 ? r + 2 * Math.PI : r;
}

/**
 * **Dónde queda un sitio respecto a la ruta**: por qué punto de ella pasa a
 * su lado —`recorrido`, m desde el origen— y a cuánto de ella está —`lado`,
 * m, positivo **a la derecha** de quien vuela, como `traves` en `rumbo.ts`—.
 *
 * El lado importa porque Ara va a la izquierda: lo que tiene `lado`
 * negativo es lo que se ve desde su ventanilla.
 */
export function respectoALaRuta(
  o: Ortodromica,
  s: Sitio,
): { readonly recorrido: number; readonly lado: number } {
  const p = vector(s);
  const fuera = escalar(p, o.polo);
  const pie = unidad([p[0] - fuera * o.polo[0], p[1] - fuera * o.polo[1], p[2] - fuera * o.polo[2]]);
  return {
    recorrido:
      Math.atan2(escalar(cruz(o.origen, pie), o.polo), escalar(o.origen, pie)) * RADIO_DE_LA_TIERRA,
    lado: -Math.asin(Math.max(-1, Math.min(1, fuera))) * RADIO_DE_LA_TIERRA,
  };
}

/**
 * **Dónde cruza el ecuador**, o `null` si no lo cruza: a cuántos metros del
 * origen y en qué sitio. Son los dos puntos del círculo con la Z a cero; vale
 * el que cae entre los dos extremos.
 */
export function cruceDelEcuador(
  o: Ortodromica,
): { readonly recorrido: number; readonly sitio: Sitio } | null {
  const e = unidad(cruz(o.polo, [0, 0, 1]));
  for (const c of [e, [-e[0], -e[1], -e[2]] as V3]) {
    const s =
      Math.atan2(escalar(cruz(o.origen, c), o.polo), escalar(o.origen, c)) * RADIO_DE_LA_TIERRA;
    if (s >= 0 && s <= o.distancia) return { recorrido: s, sitio: sitioDe(c) };
  }
  return null;
}

/**
 * **Los puntos del camino**, cada `paso` metros y los dos extremos: lo que
 * dibuja el mapa del respaldo, que en plano sale curvo.
 */
export function puntosDelCamino(
  o: Ortodromica,
  paso = 100_000,
): readonly { readonly recorrido: number; readonly sitio: Sitio; readonly rumbo: number }[] {
  const n = Math.max(1, Math.ceil(o.distancia / paso));
  const puntos = [];
  for (let i = 0; i <= n; i++) {
    const s = (o.distancia * i) / n;
    puntos.push({ recorrido: s, sitio: puntoEn(o, s), rumbo: rumboEn(o, s) });
  }
  return puntos;
}

// ── Los sitios que se nombran ───────────────────────────────────────────

/**
 * **Los pueblos que el plan nombra junto a la ruta**, por el nodo de su
 * nombre en OpenStreetMap (ODbL 1.0), consultado en Nominatim el
 * 01-11-2026. Un pueblo ocupa un kilómetro, así que «a cuánto pasa» se
 * cuenta desde el nodo del nombre, que es el que pone cualquier mapa.
 *
 * El parque de Cerro Corá ya está en `data/hitos/destacados.json`, y no se
 * repite aquí.
 */
export const SITIOS_DEL_CAMINO = {
  /** Valverde, la capital de El Hierro: `place=town`, node/1470839532. */
  valverde: { lat: 27.809685, lon: -17.9151468 },
  /**
   * Pedro Juan Caballero: el centro que da Nominatim para su término,
   * relation/6614169. La ruta entra en Paraguay a su lado.
   */
  pedroJuanCaballero: { lat: -22.5497781, lon: -55.7384312 },
} as const satisfies Record<string, Sitio>;

// ── El horario ──────────────────────────────────────────────────────────

/** La temporada del horario de la aerolínea, que es la de los relojes de Europa. */
export type Temporada = "verano" | "invierno";

/**
 * **La salida de Barajas**, s desde la medianoche de Madrid: las 23:45 todos
 * los días del año, en hora de Madrid. Es el horario del vuelo diario de
 * esta ruta con un bimotor de fuselaje ancho, comprobado del 24 al 26 de
 * octubre de 2026 (fichas de estado de vuelo de trip.com; ver el plan).
 */
export const SALIDA_DE_MADRID = (23 * 60 + 45) * 60;

/**
 * **De calzos a calzos**, s: 11 h 40 con el horario de verano europeo y
 * 11 h 45 con el de invierno, los del mismo horario. La llegada es a las
 * 06:25 o a las 07:30 en Asunción.
 */
export const DE_CALZOS_A_CALZOS: Readonly<Record<Temporada, number>> = {
  verano: (11 * 60 + 40) * 60,
  invierno: (11 * 60 + 45) * 60,
};

/**
 * **El rodaje**, s: unos veinte minutos en Barajas, que es grande, y siete en
 * Pettirossi. Son los del plan; lo de calzos a calzos menos estos dos es lo
 * que se vuela, y la toma cae siete minutos antes de la hora de llegada.
 */
export const RODAJE_DE_SALIDA = 20 * 60;
export const RODAJE_DE_LLEGADA = 7 * 60;

const HORA = 3600;
const DIA = 86_400;

/** El último domingo de un mes, a las 01:00 UTC, en ms. */
function ultimoDomingoALaUna(ano: number, mes: number): number {
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0));
  const domingo = ultimo.getUTCDate() - ultimo.getUTCDay();
  return Date.UTC(ano, mes, domingo, 1);
}

/**
 * Si en ese instante los relojes de la Unión Europea van con la hora de
 * verano: del último domingo de marzo al último de octubre, a la una de la
 * madrugada en UTC para todos a la vez (Directiva 2000/84/CE, artículos 2
 * y 3). Así cambian Madrid y Canarias en el mismo instante.
 */
export function horaDeVeranoEuropea(t: Date): boolean {
  const ano = t.getUTCFullYear();
  const ms = t.getTime();
  return ms >= ultimoDomingoALaUna(ano, 2) && ms < ultimoDomingoALaUna(ano, 9);
}

/** **El huso de Madrid** en ese instante, s: UTC+1, o UTC+2 en verano. */
export function husoDeMadrid(t: Date): number {
  return horaDeVeranoEuropea(t) ? 2 * HORA : HORA;
}

/** **El de Canarias**, s: una hora menos que la península, todo el año. */
export function husoDeCanarias(t: Date): number {
  return husoDeMadrid(t) - HORA;
}

/**
 * **El de Asunción**, s: UTC−3 todo el año.
 *
 * El Paraguay dejó de cambiar la hora con la Ley 7354/2024, y se quedó en la
 * de verano de entonces: en la base de husos de la IANA es UTC−3 desde el 6
 * de octubre de 2024, y la de ICU que trae el navegador dice lo mismo desde
 * su versión 2024b. Se pone fijo aquí y no se le pregunta al navegador: una
 * tablet del colegio con los datos de husos de 2023 seguiría cambiando la
 * hora del Paraguay en marzo, y daría la llegada una hora antes la mitad del
 * año. Para fechas anteriores a octubre de 2024 no vale, y el juego no las
 * pide.
 *
 * Por eso **la llegada cambia cuando cambia la hora en España**, y no cuando
 * cambia en el Paraguay: es una lección en sí misma.
 */
export const HUSO_DE_ASUNCION = -3 * HORA;

/**
 * **La hora en un reloj** de ese huso, s desde su medianoche, de 0 a 86.400.
 * Pintarla como 06:18 o con agujas es cosa de quien la pinte.
 */
export function horaLocal(t: Date, huso: number): number {
  const s = t.getTime() / 1000 + huso;
  return ((s % DIA) + DIA) % DIA;
}

/** Lo que pasa a qué hora, en instantes. */
export interface Horario {
  readonly temporada: Temporada;
  /** Se suelta el avión del puesto de Barajas: las 23:45 de Madrid. */
  readonly salida: Date;
  readonly despegue: Date;
  /** Toca en Pettirossi. */
  readonly toma: Date;
  /** Para en el puesto de Pettirossi. */
  readonly llegada: Date;
}

/**
 * **El horario del vuelo que sale el día `dia`**, con la temporada que tenga
 * ese día en Madrid.
 *
 * El día es el que el juego ya usa para el cielo —`fechaDelVuelo` en
 * `game.ts`, que es el de hoy o el de `?fecha=`, a las doce en UTC—: se lee
 * su fecha en UTC, que a mediodía es la misma en Madrid y en Asunción.
 *
 * A las 23:45 nunca hay duda de la temporada: los relojes cambian de
 * madrugada. Se mira con la hora de invierno puesta, y si a esa hora ya rige
 * la de verano, es verano; así el sábado antes del cambio de octubre todavía
 * sale con la de verano, y el domingo ya con la de invierno.
 */
export function horarioDelDia(dia: Date): Horario {
  const medianoche = Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate());
  const conLaDeInvierno = new Date(medianoche + (SALIDA_DE_MADRID - HORA) * 1000);
  const temporada: Temporada = horaDeVeranoEuropea(conLaDeInvierno) ? "verano" : "invierno";
  const huso = temporada === "verano" ? 2 * HORA : HORA;
  const salida = medianoche + (SALIDA_DE_MADRID - huso) * 1000;
  const llegada = salida + DE_CALZOS_A_CALZOS[temporada] * 1000;
  return {
    temporada,
    salida: new Date(salida),
    despegue: new Date(salida + RODAJE_DE_SALIDA * 1000),
    toma: new Date(llegada - RODAJE_DE_LLEGADA * 1000),
    llegada: new Date(llegada),
  };
}

// ── El perfil ───────────────────────────────────────────────────────────

/** En qué parte del vuelo va el avión. */
export type Fase = "rodaje de salida" | "subida" | "crucero" | "bajada" | "rodaje de llegada" | "en el puesto";

/**
 * **Los niveles de crucero**, m: el 360, el 380 y el 400.
 *
 * Pares, porque se vuela hacia el oeste: con la derrota magnética entre 180°
 * y 359°, la tabla de niveles del Anexo 2 de la OACI (apéndice 3) da los
 * pares por encima del 290 —300, 320… 400—. La derrota de esta ruta va de
 * 223° a 238° magnéticos por todo el camino; lo comprueba la prueba con el
 * Modelo Magnético Mundial del juego. En el corredor EUR/SAM, con sus rutas
 * de sentido único, el control puede repartir los niveles de otro modo: eso
 * no está comprobado.
 *
 * Y se sube por escalones porque el avión sale cargado con el combustible de
 * once horas y, según lo gasta, pesa menos y le conviene ir más alto. Dos
 * escalones de dos mil pies hacia las tres horas y media y las siete de
 * vuelo es lo típico de un largo radio de esta clase; los de cada noche los
 * pide la tripulación con su peso y los da el control. El 400 es la altura
 * del amanecer del plan: el sol asoma a −3,5°, que es donde está el
 * horizonte desde allí.
 */
export const NIVELES_DE_CRUCERO = [36_000 * PIE, 38_000 * PIE, 40_000 * PIE] as const;

/** Cuándo empieza cada escalón, s desde el despegue. */
export const ESCALONES = [3.5 * HORA, 7 * HORA] as const;

/** Lo que dura cada escalón: dos mil pies a mil pies por minuto, s. */
const DURA_UN_ESCALON = 120;

/**
 * **La subida y la bajada**, s: veinticinco minutos y treinta, las del plan.
 * Cada una en dos tramos partidos en los diez mil pies, que es donde cambia
 * la velocidad: por debajo, 250 nudos indicados como mucho.
 */
const SUBIDA_HASTA_EL_100 = 5 * 60;
const SUBIDA_DESDE_EL_100 = 20 * 60;
const BAJADA_HASTA_EL_100 = 18 * 60;
const BAJADA_DESDE_EL_100 = 12 * 60;

/**
 * **Las velocidades sobre el suelo en las puntas**, m/s.
 *
 * - Al despegar, unos 160 nudos: un bimotor grande cargado rota por ahí. Sin
 *   fuente de este avión; aquí solo mueve el sitio de los primeros minutos,
 *   y diez nudos más o menos son unos ochocientos metros.
 * - En los diez mil pies, los 250 nudos indicados del tope, que allí arriba
 *   son unos 290 de verdad (`trueFromIndicated`).
 * - Al tocar, la Vref del 787-9 de la base de datos de la FAA, 144 nudos.
 *
 * Sin viento. El del día lo lleva dentro la velocidad de crucero, que sale
 * del horario (ver `perfilDelVuelo`).
 */
const AL_DESPEGAR = 160 * NUDO;
const EN_EL_100 = trueFromIndicated(TOPE_BAJO_EL_100 * NUDO, ALTITUD_DEL_TOPE);
const AL_TOCAR = 144 * NUDO;

/**
 * **Un tramo del perfil**, en tiempo desde el despegue: la altitud y la
 * velocidad sobre el suelo cambian en línea recta de un extremo al otro.
 */
export interface Tramo {
  readonly fase: "subida" | "crucero" | "bajada";
  /** Cuándo empieza, s desde el despegue. */
  readonly desde: number;
  readonly dura: number;
  /** m. */
  readonly altitud: readonly [number, number];
  /** Sobre el suelo, m/s. */
  readonly velocidad: readonly [number, number];
  /** Lo recorrido al empezarlo, m. */
  readonly recorrido: number;
}

export interface PerfilDelVuelo {
  readonly horario: Horario;
  readonly ruta: Ortodromica;
  readonly tramos: readonly Tramo[];
  /** Lo que se vuela, de la carrera a la toma, s. */
  readonly enElAire: number;
  /** Sobre el suelo, m/s. Ver `perfilDelVuelo`. */
  readonly crucero: number;
}

/** Lo que se recorre en un tramo con la velocidad en línea recta. */
function largo(t: { readonly dura: number; readonly velocidad: readonly [number, number] }): number {
  return ((t.velocidad[0] + t.velocidad[1]) / 2) * t.dura;
}

/**
 * **El perfil del vuelo de un horario**: subida, crucero por escalones y
 * bajada, con lo que dura cada cosa y por dónde va.
 *
 * Lo que manda es el horario: de calzos a calzos menos los dos rodajes es lo
 * que se vuela, y en ese tiempo hay que recorrer la ortodrómica entera. Así
 * que la velocidad de crucero **no se elige: sale de la cuenta**. En verano
 * da unos 839 km/h sobre el suelo y en invierno unos 832. Un 787-9 cruza a
 * Mach 0,85, unos 900 km/h de verdad a esa altura: la diferencia es el viento
 * de cara, que en esta ida hacia el suroeste es lo normal, y se lleva puesto
 * sin inventarlo.
 */
export function perfilDelVuelo(
  horario: Horario,
  ruta: Ortodromica = DE_MADRID_A_ASUNCION,
  salida = BARAJAS.elevacion,
  llegada = PETTIROSSI.elevacion,
): PerfilDelVuelo {
  const enElAire =
    DE_CALZOS_A_CALZOS[horario.temporada] - RODAJE_DE_SALIDA - RODAJE_DE_LLEGADA;
  const subida = SUBIDA_HASTA_EL_100 + SUBIDA_DESDE_EL_100;
  const bajada = BAJADA_HASTA_EL_100 + BAJADA_DESDE_EL_100;
  const [n1, n2, n3] = NIVELES_DE_CRUCERO;
  const [e1, e2] = ESCALONES;
  const tod = enElAire - bajada;
  // Los tramos con la velocidad de crucero por poner: la distancia es lineal
  // en ella, así que dos cuentas la despejan.
  const conCrucero = (v: number): Omit<Tramo, "desde" | "recorrido">[] => [
    { fase: "subida", dura: SUBIDA_HASTA_EL_100, altitud: [salida, ALTITUD_DEL_TOPE], velocidad: [AL_DESPEGAR, EN_EL_100] },
    { fase: "subida", dura: SUBIDA_DESDE_EL_100, altitud: [ALTITUD_DEL_TOPE, n1], velocidad: [EN_EL_100, v] },
    { fase: "crucero", dura: e1 - subida, altitud: [n1, n1], velocidad: [v, v] },
    { fase: "crucero", dura: DURA_UN_ESCALON, altitud: [n1, n2], velocidad: [v, v] },
    { fase: "crucero", dura: e2 - e1 - DURA_UN_ESCALON, altitud: [n2, n2], velocidad: [v, v] },
    { fase: "crucero", dura: DURA_UN_ESCALON, altitud: [n2, n3], velocidad: [v, v] },
    { fase: "crucero", dura: tod - e2 - DURA_UN_ESCALON, altitud: [n3, n3], velocidad: [v, v] },
    { fase: "bajada", dura: BAJADA_HASTA_EL_100, altitud: [n3, ALTITUD_DEL_TOPE], velocidad: [v, EN_EL_100] },
    { fase: "bajada", dura: BAJADA_DESDE_EL_100, altitud: [ALTITUD_DEL_TOPE, llegada], velocidad: [EN_EL_100, AL_TOCAR] },
  ];
  const total = (v: number): number => conCrucero(v).reduce((s, t) => s + largo(t), 0);
  const fijo = total(0);
  const crucero = (ruta.distancia - fijo) / (total(1) - fijo);
  let desde = 0;
  let recorrido = 0;
  const tramos = conCrucero(crucero).map((t) => {
    const tramo: Tramo = { ...t, desde, recorrido };
    desde += t.dura;
    recorrido += largo(t);
    return tramo;
  });
  return { horario, ruta, tramos, enElAire, crucero };
}

/** Dónde va el avión en un momento del vuelo. */
export interface DondeVa {
  readonly fase: Fase;
  readonly instante: Date;
  /** Lo recorrido por la ortodrómica, m. */
  readonly recorrido: number;
  readonly sitio: Sitio;
  /** Verdadero, rad. */
  readonly rumbo: number;
  /** m sobre el mar. */
  readonly altitud: number;
  /** Sobre el suelo, m/s; cero rodando, que aquí no se cuenta. */
  readonly velocidad: number;
}

/**
 * **Dónde va el avión** a `t` segundos del despegue —negativos, rodando en
 * Barajas—: es lo que pregunta el salto bajo tapa para poner el avión donde
 * estaría a esa hora, con su altitud, su rumbo y su velocidad.
 */
export function dondeVa(p: PerfilDelVuelo, t: number): DondeVa {
  const instante = new Date(p.horario.despegue.getTime() + t * 1000);
  const ruta = p.ruta;
  const enTierra = (fase: Fase, recorrido: number, altitud: number): DondeVa => ({
    fase,
    instante,
    recorrido,
    sitio: puntoEn(ruta, recorrido),
    rumbo: rumboEn(ruta, recorrido),
    altitud,
    velocidad: 0,
  });
  const primero = p.tramos[0]!;
  const ultimo = p.tramos[p.tramos.length - 1]!;
  if (t < 0) return enTierra(t < -RODAJE_DE_SALIDA ? "en el puesto" : "rodaje de salida", 0, primero.altitud[0]);
  if (t >= p.enElAire) {
    const queda = DE_CALZOS_A_CALZOS[p.horario.temporada] - RODAJE_DE_SALIDA - t;
    return enTierra(queda > 0 ? "rodaje de llegada" : "en el puesto", ruta.distancia, ultimo.altitud[1]);
  }
  const tramo = p.tramos.find((x) => t < x.desde + x.dura) ?? ultimo;
  const tau = t - tramo.desde;
  const k = tau / tramo.dura;
  const [v0, v1] = tramo.velocidad;
  const recorrido = tramo.recorrido + v0 * tau + ((v1 - v0) * tau * tau) / (2 * tramo.dura);
  return {
    fase: tramo.fase,
    instante,
    recorrido,
    sitio: puntoEn(ruta, recorrido),
    rumbo: rumboEn(ruta, recorrido),
    altitud: tramo.altitud[0] + (tramo.altitud[1] - tramo.altitud[0]) * k,
    velocidad: v0 + (v1 - v0) * k,
  };
}

/**
 * **Cuándo pasa el avión** por un punto de la ruta, s desde el despegue: la
 * inversa de `dondeVa`. Lo recorrido solo crece, así que basta partir el
 * vuelo por la mitad hasta dar con el segundo.
 */
export function cuandoPasa(p: PerfilDelVuelo, recorrido: number): number {
  let [a, b] = [0, p.enElAire];
  for (let i = 0; i < 60 && b - a > 0.01; i++) {
    const m = (a + b) / 2;
    if (dondeVa(p, m).recorrido < recorrido) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

// ── Las horas y la luz ──────────────────────────────────────────────────

/**
 * **Las horas de un momento del vuelo**, s desde la medianoche de cada
 * reloj: los dos que enseña el mapa del respaldo —Madrid y Asunción— y la
 * **hora del sol** del sitio por el que se va (`horaSolarEn`), que es la que
 * dice si allí abajo es de noche. La hora de reloj del país que se sobrevuela
 * no se cuenta: en medio del océano no hay ninguna, y la de cada sitio que se
 * nombre lleva su huso con él.
 */
export function horasEn(
  p: PerfilDelVuelo,
  t: number,
): { readonly instante: Date; readonly madrid: number; readonly asuncion: number; readonly solar: number } {
  const donde = dondeVa(p, t);
  return {
    instante: donde.instante,
    madrid: horaLocal(donde.instante, husoDeMadrid(donde.instante)),
    asuncion: horaLocal(donde.instante, HUSO_DE_ASUNCION),
    solar: horaSolarEn(donde.sitio.lon, donde.instante) * HORA,
  };
}

/** La luz que hay. */
export interface LuzDelSol {
  /** La altura del sol sobre la horizontal, rad. */
  readonly altura: number;
  /**
   * Si es de noche: el sol a más de seis grados bajo la horizontal, el ocaso
   * civil, que es el criterio con el que el juego enciende sus luces
   * (`esDeNoche` en `world/hora.ts`).
   */
  readonly deNoche: boolean;
  /**
   * Si **se ve el sol** desde esa altitud: por encima del horizonte del mar,
   * que desde cuarenta mil pies está tres grados y medio por debajo de la
   * horizontal (`bajadaDelHorizonte`). Por eso arriba amanece antes que en el
   * suelo de debajo.
   */
  readonly asoma: boolean;
}

/**
 * **La luz en un sitio y un instante**, vista desde `altitud` metros. Con el
 * Sol del cielo del juego —el de Meeus que alumbra el suelo y la Luna, en
 * `world/cielo-de-noche.ts`—, para que el vuelo largo no amanezca con un sol
 * distinto del que se pinta.
 */
export function solEn(t: Date, s: Sitio, altitud = 0): LuzDelSol {
  const sol = aplicar(alHorizonte(s.lat, tiempoSidereo(t) + s.lon), solDeVerdad(siglos(t)));
  const grados = alturaYAcimut(sol).altura;
  const altura = grados * GRADO;
  return {
    altura,
    deNoche: esDeNoche(grados),
    asoma: altura > -bajadaDelHorizonte(altitud),
  };
}

/** La luz donde va el avión, a `t` segundos del despegue. */
export function solEnElVuelo(p: PerfilDelVuelo, t: number): LuzDelSol {
  const donde = dondeVa(p, t);
  return solEn(donde.instante, donde.sitio, donde.altitud);
}

/**
 * **Cuándo asoma el sol por la ventanilla**, s desde el despegue, o `null`
 * si se aterriza sin verlo: el primer minuto del vuelo en que el sol está
 * por encima del horizonte del mar visto desde el avión, después de haber
 * estado debajo. Es el amanecer del tercer capítulo, que de noviembre a marzo
 * se ve sobre Brasil y de mayo a agosto no llega.
 */
export function cuandoAsomaElSol(p: PerfilDelVuelo, paso = 60): number | null {
  let antes = solEnElVuelo(p, 0).asoma;
  for (let t = paso; t <= p.enElAire; t += paso) {
    const ahora = solEnElVuelo(p, t).asoma;
    if (ahora && !antes) return t;
    antes = ahora;
  }
  return null;
}
