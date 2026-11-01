/**
 * **El tercer capítulo del vuelo largo, en esqueleto: «Amanecer y llegada a
 * Asunción»** (ADR 0023). Se abre con `?inicio=4&capitulo=3`: el JAZ 110
 * Tijereta, con Ara de pasaje, ya en crucero por encima del Paraguay, y de ahí
 * al puesto de Pettirossi.
 *
 * Esto es el vuelo, no el cuento. Están los momentos con sus condiciones, para
 * que el motor sepa qué viene y cuándo, y **solo frases que ya están grabadas
 * y que aquí son verdad**: nada de lo que se dijo en las islas nombra este
 * vuelo por error, y por eso no se reusa todo el guion corto. Donde falta su
 * frase, el momento queda sin líneas, en su sitio y esperándola: el guion de
 * verdad, sus voces y sus láminas son de otra tanda.
 *
 * ## El hueco del despertar y el desayuno
 *
 * Irán antes de entrar en el mundo, bajo una lámina a pantalla completa: Ara
 * se despierta hora y media antes de tocar y ahí abajo todavía es Brasil, que
 * este juego no tiene dibujado. Sus dos momentos abren el guion, callados: es
 * el sitio donde se engancharán.
 *
 * ## Ara no se duerme aquí
 *
 * El capítulo empieza con Ara recién despierta, y el motor, con catorce minutos
 * de crucero en silencio delante, la mandaría a dormir para bajar. Bajando,
 * nunca durmiendo: ver `sinSiesta`.
 */

import type { Linea } from "./conversacion";
import { GUION_TENERIFE_LA_PALMA, LADO_DE_ARA } from "./guion-tenerife-la-palma";
import {
  acabaDePonerse,
  bajando,
  enLaFinal,
  PREPARAR_LA_CABINA,
  type DefMomento,
  type GuionDelPasaje,
} from "./motor-del-pasaje";

/** El avión de esta ruta. */
export const AVION_DEL_LARGO = "jaz-110";
/**
 * **El mundo de la llegada**: el del Paraguay entero. No hay pasillo de crucero
 * todavía, y el capítulo entra donde este mundo ya tiene suelo debajo. Ver
 * `entradaDeLaLlegada` en `ruta-larga.ts`.
 */
export const MUNDO_DE_LA_LLEGADA = "pettirossi";

export type MomentoDeLaLlegada =
  | "despertar"
  | "desayuno"
  | "bajada"
  | "aproximacion"
  | "flaps"
  | "aterrizando"
  | "toma"
  | "llegada"
  | "impacientes"
  | "seLevantan"
  | "luz"
  | "suelto"
  | "gracias"
  | "puesto"
  | "fin";

/** De momento, nada que se cuente cuando viene a cuento: todo lo de este vuelo espera su guion. */
export type CharlaDeLaLlegada = never;

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
const tripulante = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.cerca.${clave}` });
/** Un anuncio de la megafonía de siempre, montado por el juego con el campo de hoy. Ver `loQueDiceLaMegafonia`. */
const anuncio = (clave: string): Linea => ({
  quien: clave.startsWith("tripulacion.") ? "tripulacion" : "mama",
  clave,
  megafonia: true,
});

/** Tocado, lo que tarda en decirse: las ruedas, y la reversa ya rugiendo. Como en el vuelo corto. */
const DESPUES_DE_TOCAR = 1.2;
/** Parado en el puesto, lo que se deja ver parar antes de la gente que se levanta, s. */
const PARADO_DEL_TODO = 3;
/** Lo que se oyen las hebillas antes de que Ara lo note, s. */
const SE_OYEN_LAS_HEBILLAS = 6;
/** Con los motores ya parados, lo que tarda la comandante en apagar la luz, s. */
const APAGA_LA_LUZ = 6;
/** Y del *ding* a que Ara se suelte el cinturón, s. */
const TRAS_EL_DING = 1;

type Momento = DefMomento<MomentoDeLaLlegada, MomentoDeLaLlegada, CharlaDeLaLlegada>;

const MOMENTOS: readonly Momento[] = [
  // El hueco: ver arriba. Se saltan en el primer paso, porque lo suyo ya pasó cuando se entra.
  { id: "despertar", cuando: () => true, lineas: [] },
  { id: "desayuno", cuando: () => true, lineas: [] },
  {
    /*
     * **Empezamos a bajar**, que es lo que espera el modo rápido del crucero y
     * lo que enciende el cartel. El anuncio de verdad, unos cuarenta minutos
     * antes de tocar, con el parte de Pettirossi, es del guion de verdad.
     */
    id: "bajada",
    cuando: (l) => bajando(l.tramo) && !l.enTierra,
    lineas: [anuncio("comandante.descenso"), anuncio("tripulacion.cinturones")],
    segun: (l) => [
      ...(acabaDePonerse(l, "ralenti") ? [ara("ralenti")] : []),
      anuncio("comandante.descenso"),
      anuncio("tripulacion.cinturones"),
    ],
  },
  {
    id: "aproximacion",
    cuando: (l) => l.faltaParaTocar < PREPARAR_LA_CABINA && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [anuncio("comandante.aproximacion")],
  },
  {
    id: "flaps",
    cuando: (l) => l.flaps > 0.2 && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("flaps"), ara("flapsPorque")],
    mira: "ala",
    plano: "fuera-ala",
  },
  {
    id: "aterrizando",
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 60,
    caduca: (l) => l.enTierra,
    lineas: [ara("yaCasi")],
    plano: "fuera-pista",
  },
  {
    id: "toma",
    cuando: (l) => l.tramo === "frenando" && l.enTramo >= DESPUES_DE_TOCAR,
    caduca: (l) => l.tramo === "al-puesto" || l.tramo === "aparcado" || l.tramo === "apagado",
    lineas: [ara("toma")],
    mira: "motor",
    plano: "fuera-pista",
  },
  {
    // La bienvenida de Asunción, la que cuenta quién era Pettirossi. Ver `loQueDiceLaMegafonia`.
    id: "llegada",
    cuando: (l) => (l.tramo === "al-puesto" && l.porElSuelo > 1.5) || l.tramo === "aparcado",
    lineas: [anuncio("comandante.llegada"), anuncio("tripulacion.llegada")],
    plano: "fuera-rodando",
  },
  {
    // Las hebillas y la gente que se levanta, sin palabras: lo pone el juego. Ver `MotorDelPasaje.gente`.
    id: "impacientes",
    cuando: (l) => (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO) || l.tramo === "apagado",
    lineas: [],
  },
  {
    id: "seLevantan",
    cuando: (_l, e) => e.desdeQueSeDijo("impacientes") >= SE_OYEN_LAS_HEBILLAS,
    lineas: [ara("seLevantan"), ara("cinturonQuieto")],
  },
  {
    // La luz la apaga la comandante con los motores ya parados, con su *ding*: lo pone el juego.
    id: "luz",
    cuando: (l, e) => l.tramo === "apagado" && l.enTramo >= APAGA_LA_LUZ && e.callaDesde >= 0.6,
    lineas: [],
  },
  {
    id: "suelto",
    cuando: (_l, e) => e.desdeQueSeDijo("luz") >= TRAS_EL_DING,
    lineas: [ara("luzApagada")],
  },
  {
    id: "gracias",
    cuando: (_l, e) => e.callaDesde >= 1,
    lineas: [tripulante("gracias"), tripulante("maleteros"), tripulante("seria")],
  },
  {
    // Sin el «¡llegamos a La Palma!» de Ara, que aquí no es verdad: su despedida espera su toma.
    id: "puesto",
    cuando: (l) => l.tramo === "apagado" && l.enTramo >= 1.5,
    lineas: [tripulante("adios")],
  },
  { id: "fin", cuando: () => true, lineas: [] },
];

/** **El guion del tercer capítulo**, sobre el mismo motor que el vuelo corto. */
export const GUION_LLEGADA_A_ASUNCION: GuionDelPasaje<MomentoDeLaLlegada, CharlaDeLaLlegada> = {
  lado: LADO_DE_ARA,
  momentos: MOMENTOS,
  charlas: [],
  // Lo de señalar por la ventanilla, con sus sitios y sus frases, es del guion de verdad.
  seSenalaDesde: [],
  tripulanteEnElPasillo: () => false,
  siesta: {
    seDuerme: GUION_TENERIFE_LA_PALMA.siesta.seDuerme,
    seDespierta: GUION_TENERIFE_LA_PALMA.siesta.seDespierta,
    laDespiertan: GUION_TENERIFE_LA_PALMA.siesta.laDespiertan,
    puedenEsperar: new Set(),
    trasAlDespertar: {},
    antesDeDormirse: [],
    sinSiesta: true,
  },
  senalado: {
    suyas: {},
    loVeo: GUION_TENERIFE_LA_PALMA.senalado.loVeo,
    contestaALaHistoria: new Set(),
  },
  sellosAlDecirlo: () => [],
  seQuedanHastaLaSiguiente: new Set(),
  elPlop: [],
  elOficio: [],
  bano: null,
  kit: null,
};
