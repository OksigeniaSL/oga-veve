/**
 * **El segundo capítulo del vuelo largo: «La noche sobre el mar»** (ADR 0023). Se abre
 * con su ficha de «¿A qué jugás?», o con `?inicio=4&capitulo=2` en desarrollo. El JAZ 110
 * Tijereta, con Ara de pasaje, en crucero y de noche, un rato antes de El Hierro; se
 * vuela de verdad hasta pasarlo, se bajan las luces, Ara se duerme, y del salto se cae en
 * el tercer capítulo, en su despertar.
 *
 * ## Sin pasillo de crucero
 *
 * Lo que va de Barajas a Canarias no está dibujado, y en esta tanda no se dibuja: la
 * cena, que es de ese rato, se cuenta bajo su lámina, como la mañana del tercer capítulo,
 * y este capítulo se vuela en el mundo que ya existe. Lo de después es noche: la pantalla
 * de la siesta y el corte.
 *
 * ## Quién dice qué
 *
 * Derlis, de vos, e Idaira, de tú, atienden en persona, y los dos con lo suyo de seguridad
 * encima: la cocina trabada y el cinturón por encima de la manta. Ara, de vos y sin género.
 * La comandante, por megafonía y solo para bajar las luces: a esta hora, calla. Lo del agua
 * es de la OMS, *International Travel and Health*, cap. 2: el avión no deshidrata y no hace
 * falta beber más. Lo de dormir, sin pastillas ni melatonina, que la misma OMS no recomienda.
 *
 * ## Dónde pasa cada cosa
 *
 * Por lo recorrido y no por la hora: la hora de pasar por encima de una isla cambia con
 * el horario del día, y la isla no se mueve. Ara va a la izquierda: Tenerife queda de
 * su lado, y La Palma, del otro.
 *
 * ## Lo que se ve de verdad por su cristal, mirado el 2-11-2026
 *
 * **El Hierro, no**, y por eso se cuenta en la pantalla del asiento, que es como lo sabría
 * un pasajero de verdad. Valverde pasa a 2,2 km de la ruta y a 11 km por debajo: de través
 * queda a 79° del cristal, y por delante, más. El cristal da 48° con la cara pegada, y no
 * llega ni a La Restinga, a 9 km de la ruta y a 50°. Y lo de más cerca lo tapa además la
 * góndola, que empieza unos 9° por debajo del horizonte: de La Gomera, a 40 km, tampoco se
 * ve nada. Ara lo dice tal cual: se enseña lo que es, que no todo lo de abajo se ve.
 *
 * **Tenerife, sí**: a 73 km cae justo por encima de la góndola, y de través se ve el
 * resplandor de La Laguna y Santa Cruz y el perfil de la isla. Ara lo nombra preguntándole
 * al motor de lo que se ve: si hoy no se ve, no se nombra, y el momento se salta.
 *
 * ## Tras El Hierro no queda tiempo
 *
 * El avión sale del mundo dibujado unos veinticinco kilómetros después, algo menos de dos
 * minutos a su paso. Lo de bajar las luces va enseguida y la lámina de la manta tapa antes
 * de llegar ahí. Por eso El Hierro no se cuenta si se le pasa el momento: con la pestaña de
 * un juego delante no se interrumpe para enseñar un mapa que no se está mirando, y el cuento
 * de la isla sigue en la consola.
 */

import type { Linea } from "./conversacion";
import { GUION_LLEGADA_A_ASUNCION } from "./guion-llegada-a-asuncion";
import { GUION_TENERIFE_LA_PALMA, LADO_DE_ARA } from "./guion-tenerife-la-palma";
import {
  bajando,
  type DefMomento,
  type GuionDelPasaje,
  type LecturaDelPasaje,
  type MotorDelPasaje,
} from "./motor-del-pasaje";
import { DE_MADRID_A_ASUNCION, PASA_EL_HIERRO, respectoALaRuta, SITIOS_DEL_CAMINO } from "./ruta-larga";

/**
 * **El mundo de esta noche**: el de Tenerife Norte, el único de Canarias que llega de
 * Tenerife a El Hierro. El mundo de El Hierro no tiene Tenerife dentro y, a esta
 * velocidad, se entraría en él siete minutos antes de la isla.
 */
export const MUNDO_DE_LA_NOCHE = "tenerife-norte";

/**
 * **Las islas de esta noche**, montadas como vecinas aunque el avión no quepa en sus
 * pistas: aquí no se va a aterrizar, y son lo que hay debajo y a los lados. El Hierro,
 * que es lo que se viene a ver; La Palma a la derecha; La Gomera, entre medias, a la
 * izquierda; y el sur de Tenerife, que el mundo de Los Rodeos no trae con sus calles.
 * Cuatro: `VECINOS_A_LA_VEZ`, el tope medido.
 */
export const ISLAS_DE_LA_NOCHE = ["el-hierro", "la-palma", "la-gomera", "tenerife-sur"] as const;

/**
 * **El resplandor de Tenerife que se ve de noche**: La Laguna y Santa Cruz, las luces
 * grandes del norte de la isla. El sur queda más cerca de la ruta, pero tan abajo que
 * lo tapa la góndola.
 */
export const LUCES_DE_TENERIFE = [
  { lat: 28.487, lon: -16.314 },
  { lat: 28.467, lon: -16.255 },
] as const;

/** La cota a la que se mira ese resplandor, m: La Laguna está a unos quinientos cincuenta. */
export const COTA_DE_LAS_LUCES_DE_TENERIFE = 550;

/**
 * **Hasta dónde se distingue ese resplandor por un cristal**, m. Una ciudad entera
 * encendida en una noche cerrada se ve mucho más lejos que el valle de `POR_LA_VENTANILLA`;
 * de través está a 73 km, y con esto asoma cuando el cristal ya la alcanza por delante.
 */
export const LAS_LUCES_DE_TENERIFE_LLEGAN_A = 100_000;

export type MomentoDeLaNoche =
  | "cena"
  | "cocina"
  | "agua"
  | "ventanilla"
  | "tenerife"
  | "hierro"
  | "luces"
  | "manta"
  | "bajada"
  | "fin";

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.largo.${clave}` });
/** Idaira, en persona: la de Canarias, que ya cuidó a Ara en el primer vuelo. */
const idaira = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.cerca.largo.${clave}` });
/** Derlis, en persona: la voz de la tripulación del Paraguay, sin el altavoz del techo. */
const derlis = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.derlis.${clave}` });
/** La comandante, por la megafonía, con una frase de este vuelo. */
const comandante = (clave: string): Linea => ({ quien: "mama", clave: `comandante.largo.${clave}`, megafonia: true });
const con = (l: Linea, dibujo: string): Linea => ({ ...l, dibujo });

/** Lo que se deja callado antes de seguir con lo que va sin prisa, s: una lámina no cambia a media frase. */
const SE_MIRA = 1;
/**
 * **Cuánto antes de tener El Hierro debajo empieza Idaira**, m: lo que tarda en llegar a
 * decir «justo encima», con el corte al plano de la pantalla y a la velocidad de crucero.
 * La isla mide unos veinticinco kilómetros a lo largo de la ruta, así que es verdad de sobra.
 */
const SE_CUENTA_ANTES = 4000;
/**
 * **Lo que se deja pasar El Hierro antes de bajar las luces**, m. Lo que cuenta Idaira
 * dura lo que el avión tarda en recorrer unos seis kilómetros, y detrás ya no cabe nada:
 * ver «Tras El Hierro no queda tiempo».
 */
const LUCES_TRAS_EL_HIERRO = 3000;
/** Lo recorrido al tener Tenerife de través, m: desde Los Rodeos. */
const PASA_TENERIFE = respectoALaRuta(DE_MADRID_A_ASUNCION, SITIOS_DEL_CAMINO.tenerife).recorrido;
/** **Desde cuándo se mira si se ve**, m antes de tenerla de través: por delante, el cristal no llega a más. */
const TENERIFE_SE_MIRA_ANTES = 60_000;
/** **Y hasta cuándo**, m antes de El Hierro: lo que Ara no dijo a tiempo no se le cruza con lo de la pantalla. */
const TENERIFE_HASTA_ANTES_DEL_HIERRO = 20_000;

const yaPor = (l: LecturaDelPasaje, recorrido: number): boolean => !!l.largo && l.largo.recorrido >= recorrido;
const callados = (_l: LecturaDelPasaje, e: { readonly callaDesde: number }): boolean => e.callaDesde >= SE_MIRA;
/** **Si toca bajar las luces**: lo mira el momento y lo mira la consola, que se recoge antes. */
const bajanLasLuces = (l: LecturaDelPasaje): boolean => yaPor(l, PASA_EL_HIERRO + LUCES_TRAS_EL_HIERRO);
/** Si lo que hay delante es la pantalla enseñando el mapa, o la ventanilla: no un juego, un cuento o el cuaderno. */
const sinNadaEncimaDelMapa = (e: MotorDelPasaje<MomentoDeLaNoche, never>): boolean =>
  !e.consola?.estaAbierta || e.consola.pestanaDeAhora === "mapa";

type Momento = DefMomento<MomentoDeLaNoche, MomentoDeLaNoche, never>;

const MOMENTOS: readonly Momento[] = [
  /*
   * **La cena**, bajo su lámina: de Madrid a Canarias, que no se dibuja. La de los niños
   * sale primero, que es lo que se hace de verdad.
   */
  { id: "cena", cuando: () => true, tapa: "cena", lineas: [derlis("cena"), ara("cena")] },
  /*
   * **La cocina del avión**: que se calienta y no se cocina, y que todo va trabado. Es CS
   * 25.789, la retención de lo que tiene masa en la cabina y en las cocinas, y es de lo que
   * se ocupa la tripulación: no son camareros.
   */
  { id: "cocina", cuando: callados, lineas: [idaira("hornos"), idaira("cierres")] },
  // El agua y las piernas. Que el avión deshidrata es falso, y lo dice la OMS: ver la cabecera.
  { id: "agua", cuando: callados, lineas: [derlis("aguaCena"), con(derlis("piernasCena"), "piernas")] },
  // Y se abre la ventanilla, de noche, en mitad del mar. Es lo que abre el mundo: ver `apertura`.
  { id: "ventanilla", cuando: callados, tapa: null, plano: "ventanilla", lineas: [ara("noche")] },
  /*
   * **Tenerife, de su lado**, si se ve: la isla de su primer vuelo. Mirarlo en el `cuando`
   * deja correr el ⏩ hasta que asoma, y sin eso el vuelo se pararía esperando algo que hoy
   * quizá no se ve. Sin plano propio: desde donde se vea, y mejor con la cara pegada.
   */
  {
    id: "tenerife",
    cuando: (l, e) => yaPor(l, PASA_TENERIFE - TENERIFE_SE_MIRA_ANTES) && e.seVe("luces-de-tenerife", l),
    caduca: (l) => yaPor(l, PASA_EL_HIERRO - TENERIFE_HASTA_ANTES_DEL_HIERRO),
    nombra: "luces-de-tenerife",
    lineas: [ara("tenerife")],
  },
  /*
   * **El Hierro, en la pantalla**: por el cristal no se ve, y Ara lo dice. El trozo de cerca
   * porque en el mapa entero la isla es un punto. El meridiano, del OAPN (MITECO), en
   * `docs/historias/fuentes.md`; lo de que la raya pasara por Orchilla no se cuenta, que la
   * oficial caía en el mar.
   */
  {
    id: "hierro",
    cuando: (l, e) => yaPor(l, PASA_EL_HIERRO - SE_CUENTA_ANTES) && sinNadaEncimaDelMapa(e),
    caduca: bajanLasLuces,
    plano: "respaldo",
    pantalla: "cerca",
    lineas: [idaira("hierroEncima"), ara("hierroNoSeVe"), idaira("hierroDebajo"), idaira("meridiano"), idaira("greenwich")],
  },
  /*
   * **Las luces bajas**, ya pasado, y con la consola ya guardada: `seRecogeCuando` la
   * recoge con su frase, y esto espera a que se haya ido, para no hablarle a quien tiene
   * la pantalla delante.
   */
  {
    id: "luces",
    cuando: (l, e) => bajanLasLuces(l) && !e.conLaConsolaDelante && e.callaDesde >= SE_MIRA,
    plano: "ventanilla",
    lineas: [comandante("luces")],
  },
  /*
   * **La manta y el cinturón por encima**, para que la tripulación lo vea sin despertar a
   * nadie. La lámina se queda: de aquí se pasa al bostezo y a la siesta, y lo que hay
   * debajo, a estas alturas, ya es el borde del mundo dibujado.
   */
  { id: "manta", cuando: callados, tapa: "manta", lineas: [idaira("antifaz"), idaira("cinturonManta"), ara("cinturonArriba")] },
  // Nunca llega: del salto se cae en el otro capítulo. Es lo que deja a Ara dormirse: ver `ratoTranquilo`.
  { id: "bajada", cuando: (l) => bajando(l.tramo), lineas: [] },
  { id: "fin", cuando: () => true, lineas: [] },
];

/** **El guion del segundo capítulo**, sobre el mismo motor que los demás. */
export const GUION_NOCHE_SOBRE_EL_MAR: GuionDelPasaje<MomentoDeLaNoche, never> = {
  lado: LADO_DE_ARA,
  momentos: MOMENTOS,
  charlas: [],
  apertura: {
    hasta: "ventanilla",
    // Las suyas y las del capítulo que sigue: del salto se cae en ellas, sin tiempo de bajarlas.
    laminas: ["cena", "manta", ...(GUION_LLEGADA_A_ASUNCION.apertura?.laminas ?? [])],
  },
  // Lo de señalar por la ventanilla, con sus sitios y sus frases, es de otra tanda.
  seSenalaDesde: [],
  tripulanteEnElPasillo: () => false,
  siesta: {
    seDuerme: GUION_TENERIFE_LA_PALMA.siesta.seDuerme,
    seDespierta: GUION_TENERIFE_LA_PALMA.siesta.seDespierta,
    laDespiertan: GUION_TENERIFE_LA_PALMA.siesta.laDespiertan,
    puedenEsperar: new Set(),
    trasAlDespertar: {},
    antesDeDormirse: [],
    // De una vez hasta el despertar: el medio despertar del ecuador es de otra tanda.
    salto: (_e, l) => l.largo?.entraLaLlegada ?? null,
    sigueOtroCapitulo: true,
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
  // De noche y a esta altura no hay nada por el cristal que contar con el dedo: ni se invita, ni late el aro.
  sinInvitarATocar: true,
  // Desde que se abre la ventanilla, y hasta que bajan las luces: lo de «ya vamos bajando» aquí sería falso.
  consola: {
    desde: "ventanilla",
    elBoton: idaira("consolaBoton"),
    loQueHay: ara("consolaAbre"),
    seRecoge: idaira("consolaRecogeLuces"),
    seRecogeCuando: bajanLasLuces,
  },
};
