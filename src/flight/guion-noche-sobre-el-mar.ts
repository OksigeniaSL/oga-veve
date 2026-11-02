/**
 * **El segundo capítulo del vuelo largo: «La noche sobre el mar»** (ADR 0023). Se abre
 * con `?inicio=4&capitulo=2`, solo en desarrollo: es el vuelo sin su guion definitivo.
 * El JAZ 110 Tijereta, con Ara de pasaje, en crucero y de noche, un rato antes de El
 * Hierro; se vuela de verdad hasta pasarlo, se bajan las luces, Ara se duerme, y del
 * salto se cae en el tercer capítulo, en su despertar.
 *
 * ## Sin pasillo de crucero
 *
 * Lo que va de Barajas a Canarias no está dibujado, y en esta tanda no se dibuja: lo de
 * antes de ver el mundo se cuenta tapado, como la mañana del tercer capítulo, y este
 * capítulo se vuela en el mundo que ya existe. Lo de después es noche: la pantalla de la
 * siesta y el corte.
 *
 * ## Las frases son de prueba
 *
 * Todas ya grabadas, de otros vuelos: lo que se fija aquí son **los pasos y sus
 * condiciones**. Las frases, las láminas y la ficha del menú de verdad son de otra
 * tanda, y mientras no estén no se abre fuera de desarrollo. Ver `conLaNoche` en
 * `main.ts`.
 *
 * ## Dónde pasa cada cosa
 *
 * Por lo recorrido y no por la hora: la hora de pasar por encima de una isla cambia con
 * el horario del día, y la isla no se mueve. Ara va a la izquierda: Tenerife queda de
 * su lado, y La Palma, del otro.
 *
 * ## Lo que se ve de verdad por su cristal, mirado el 2-11-2026
 *
 * **El Hierro, no**, y lo que dice aquí el guion de asomarse es lo que el plan pedía,
 * para poder mirarlo: una frase que lo dé por visto sería falsa. Valverde pasa a 2,2 km
 * de la ruta y a 11 km por debajo: de través queda a 79° del cristal, y por delante,
 * más. El cristal da 48° con la cara pegada, y no llega ni a La Restinga, a 9 km de la
 * ruta y a 50°. Y lo de más cerca lo tapa además la góndola, que empieza unos 9° por
 * debajo del horizonte: de La Gomera, a 40 km, tampoco se ve nada. **Las luces están**, y
 * mirando hacia ellas sin el avión delante se leen hasta las carreteras.
 *
 * **Tenerife, sí**: a 73 km cae justo por encima de la góndola, y de través se ve el
 * resplandor de La Laguna y Santa Cruz y el perfil de la isla. Mejor asomado que sentado.
 */

import type { Linea } from "./conversacion";
import { GUION_LLEGADA_A_ASUNCION } from "./guion-llegada-a-asuncion";
import { GUION_TENERIFE_LA_PALMA, LADO_DE_ARA } from "./guion-tenerife-la-palma";
import {
  bajando,
  type DefMomento,
  type GuionDelPasaje,
  type LecturaDelPasaje,
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

export type MomentoDeLaNoche = "cena" | "ventanilla" | "tenerife" | "hierro" | "luces" | "bajada" | "fin";

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
const tripulante = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.cerca.${clave}` });

/** Lo que se deja callado antes de seguir con lo que va sin prisa, s: una lámina no cambia a media frase. */
const SE_MIRA = 1;
/**
 * **Cuánto antes de tener El Hierro debajo se asoma Ara**, m: la cara pegada al cristal
 * mira hacia abajo, y lo que dura el plano y lo que se dice son unos diez segundos, unos
 * dos kilómetros y medio. Así la isla pasa con Ara mirándola.
 */
const SE_ASOMA_ANTES = 6000;
/** **Lo que se deja pasar El Hierro antes de bajar las luces**, m: ya atrás, y sin mirarlo más. */
const LUCES_TRAS_EL_HIERRO = 10_000;
/** Lo recorrido al tener Tenerife de través, m: desde Los Rodeos. */
const PASA_TENERIFE = respectoALaRuta(DE_MADRID_A_ASUNCION, SITIOS_DEL_CAMINO.tenerife).recorrido;

const yaPor = (l: LecturaDelPasaje, recorrido: number): boolean => !!l.largo && l.largo.recorrido >= recorrido;
const callados = (_l: LecturaDelPasaje, e: { readonly callaDesde: number }): boolean => e.callaDesde >= SE_MIRA;

type Momento = DefMomento<MomentoDeLaNoche, MomentoDeLaNoche, never>;

const MOMENTOS: readonly Momento[] = [
  /*
   * **Lo de antes de ver el mundo**, tapado: la cena, de Madrid a Canarias, que no se
   * dibuja. A oscuras mientras no haya su lámina.
   */
  { id: "cena", cuando: () => true, lineas: [tripulante("ruta"), ara("mapa")] },
  // Y se abre la ventanilla, de noche, en mitad del mar. Es lo que abre el mundo: ver `apertura`.
  { id: "ventanilla", cuando: callados, tapa: null, plano: "ventanilla", lineas: [] },
  /*
   * **Tenerife, de su lado**, cuando está de través. Sin nombrarla con el motor de lo
   * que se ve porque la frase es de prueba: lo que diga la de verdad tendrá que preguntar
   * si se ve, que con la capa de nubes del alisio no se ve.
   */
  { id: "tenerife", cuando: (l) => yaPor(l, PASA_TENERIFE), caduca: (l) => yaPor(l, PASA_EL_HIERRO), plano: "ventanilla", lineas: [tripulante("estrellas")] },
  // **El Hierro, por debajo**, con la cara pegada al cristal.
  { id: "hierro", cuando: (l) => yaPor(l, PASA_EL_HIERRO - SE_ASOMA_ANTES), plano: "asomado-abajo", lineas: [ara("marAbajo")] },
  // **Las luces bajas**, ya pasado. Y a partir de aquí no queda nada que contar: ver `puedeDormirse`.
  {
    id: "luces",
    cuando: (l, e) => yaPor(l, PASA_EL_HIERRO + LUCES_TRAS_EL_HIERRO) && e.callaDesde >= SE_MIRA,
    plano: "ventanilla",
    lineas: [tripulante("persiana")],
  },
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
    // Las del capítulo que sigue: del salto se cae en ellas, sin tiempo de bajarlas.
    laminas: GUION_LLEGADA_A_ASUNCION.apertura?.laminas ?? [],
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
};
