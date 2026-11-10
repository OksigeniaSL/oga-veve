/**
 * **El primer capítulo del vuelo largo: «La noche de Madrid»** (ADR 0023). Se abre con
 * `?inicio=4&capitulo=1` en desarrollo. El JAZ 110 Tijereta, con Ara de pasaje, desde el
 * embarque en el puesto T5 de la T1 de Barajas hasta que se apaga la luz del cinturón,
 * subiendo de noche sobre la meseta. Del vuelo de verdad, de −0:40 a +0:30: se embarca
 * hacia las 23:05 de Madrid, se cierran las puertas, calzos fuera a las 23:45, unos veinte
 * minutos de rodaje y la subida.
 *
 * Esto es el esqueleto: los turnos en su sitio, con sus claves. Las frases que no
 * existían llevan un texto provisional corto; el guion de verdad, las láminas de la
 * bienvenida (la litera y el viento de arriba) y las voces son de la tanda siguiente.
 *
 * ## Lo que pasa, en el orden de un vuelo de verdad
 *
 * 1. **El embarque**, bajo su lámina: Ara ya en su ventanilla, la cabina con las luces
 *    encendidas y la gente guardando bultos. Es la apertura del capítulo: el mundo no
 *    asoma hasta que se abre la ventanilla, ya de noche en el puesto.
 * 2. **La bienvenida de la tripulación** y el cinturón, como en el vuelo corto.
 * 3. **Puertas cerradas: la bienvenida de la comandante**, la primera de su megafonía en
 *    un vuelo de verdad: tiempo de vuelo, altura, viento de cara, hora de llegada en hora
 *    de allá —según el horario de hoy, el de verano o el de invierno de Europa— y que hoy
 *    van tres pilotos que se turnan (EASA ORO.FTL.205: ver «La cuarta escena» en el ADR
 *    0020). En el puesto, antes de arrancar: por debajo de los diez mil pies, volando, la
 *    comandante ya no habla de nada que no sea volar.
 * 4. **Toboganes armados y motores**, que es lo que da permiso a la tripulación de mando
 *    para arrancar y rodar. No hay remolque: los puestos del juego son de salir de frente.
 * 5. **La demostración, con las ocho salidas**, cuatro por lado, la de esta clase de avión,
 *    y Ara asomada al pasillo mirando la suya. Rodando, como en el vuelo corto.
 * 6. **El rodaje de noche**, del T5 a la doble raya de la Z4 por las calles A, sin pisar
 *    pista: unos cuatro kilómetros. Lo que se ve por el cristal, mirado con la tarjeta de
 *    verdad, es la fila verde del eje de las calles —las azules del borde quedan debajo del
 *    ala—, y es lo que se nombra.
 * 7. **El despegue por la 36L y la salida CCS6L**: recto al norte, a la izquierda a rumbo
 *    285 y después al oeste, con Madrid encendida del lado de Ara. Se nombra si se ve.
 * 8. **La luz del cinturón**, que apaga la comandante con su anuncio pasados los diez mil
 *    pies, y el final del capítulo, con el paso al segundo. No el de siempre, que dice que ya
 *    se llegó a la altura: aquí se sigue subiendo hasta el 360.
 *
 * ## Quién dice qué
 *
 * Ara, de vos y sin género. Idaira, la de Canarias, en persona y de tú. La tripulación por
 * megafonía, a todo el pasaje, de usted. La comandante, por megafonía y sin contestarle a
 * nadie. Y sin marcas: ni la aerolínea, ni el número de vuelo, ni el fabricante.
 */

import type { Linea } from "./conversacion";
import { GUION_TENERIFE_LA_PALMA, LADO_DE_ARA } from "./guion-tenerife-la-palma";
import {
  bajando,
  DIEZ_MIL_PIES,
  enElSuelo,
  volando,
  type DefCharla,
  type DefMomento,
  type GuionDelPasaje,
  type LecturaDelPasaje,
} from "./motor-del-pasaje";
import { vientoDeCasa, type Meteo } from "../world/meteo";
import { dondeCae } from "../world/entre-aerodromos";
import { SALIDA_DE_BARAJAS } from "../world/scenarios";
import type { Fijo } from "./ruta";
import { caminoEnElMundo } from "./salto-bajo-tapa";
import { DE_MADRID_A_ASUNCION, respectoALaRuta, type PerfilDelVuelo } from "./ruta-larga";

/** **El mundo de este capítulo**: Barajas, de noche y sin ortofoto. Ver `MADRID_BARAJAS`. */
export const MUNDO_DE_MADRID = "barajas";

/**
 * **Cuánto antes de los calzos fuera se embarca**, s: a las 23:05 de Madrid, cuarenta
 * minutos antes de las 23:45 del horario. Es la hora con la que se abre el capítulo, y la
 * del cielo de esa noche.
 */
export const SE_EMBARCA_ANTES = 40 * 60;

/**
 * **El resplandor de Madrid que se ve de noche**: la Puerta del Sol y la Castellana a la
 * altura de Nuevos Ministerios. Saliendo por la CCS6L, la ciudad queda al sur de la
 * derrota, a la izquierda, que es el lado de Ara.
 */
export const LUCES_DE_MADRID = [
  { lat: 40.4169, lon: -3.7035 },
  { lat: 40.4465, lon: -3.6925 },
] as const;

/** La cota a la que se mira ese resplandor, m: el centro de Madrid está a unos seiscientos cincuenta. */
export const COTA_DE_LAS_LUCES_DE_MADRID = 650;

/**
 * **Hasta dónde se distingue Madrid encendida por un cristal**, m. Como Tenerife de noche
 * —`LAS_LUCES_DE_TENERIFE_LLEGAN_A`—: una ciudad entera de noche se ve mucho más lejos
 * que un valle de día, y saliendo de Barajas se tiene a menos de treinta kilómetros.
 */
export const LAS_LUCES_DE_MADRID_LLEGAN_A = 60_000;

/**
 * **Cuándo apaga la comandante la luz del cinturón**, m de altitud: pasados los diez mil
 * pies, que por debajo la cabina de mando no habla de nada que no sea volar, y con la
 * subida ya asentada, que es cuando se apaga en un largo radio. Dos mil pies por encima
 * son, con lo que sube este avión cargado, uno o dos minutos después de cruzarlos.
 */
export const SE_APAGA_EL_CINTURON = DIEZ_MIL_PIES + 2000 * 0.3048;

/**
 * **La cola y el costado que aguanta la configuración norte**, kt, rachas incluidas: la
 * norte se mantiene con hasta diez nudos de cola o veinte de costado (AIP España, AD
 * 2-LEMD, 2.20). Ver `MADRID_BARAJAS`.
 */
export const LA_NORTE_AGUANTA = { cola: 10, costado: 20 } as const;

/**
 * **El tiempo de esta noche en Barajas**: el del parte, si con él Barajas sigue en
 * configuración norte, y si no, la noche típica de la meseta.
 *
 * El capítulo despega por la 36L, que es la única pista de salidas de la configuración
 * norte de noche, y el juego no sabe pasarse a la sur, que sale por la 14L. Con viento del
 * sur fuerte, el aeropuerto de verdad se habría pasado, y despegar por la 36L con ese
 * viento de cola sería enseñar lo que no se hace. Así que, en vez de forzar el viento,
 * se cambia la noche entera: la de `vientoDominante`, la de casi todas las noches.
 */
export function tiempoDeLaNocheDeMadrid(
  parte: Meteo,
  pista: { readonly heading: number },
  dominante: Partial<Meteo> | undefined,
): Meteo {
  if (parte.vientoDe === null) return parte;
  const fuerza = Math.max(parte.vientoKt, parte.rachaKt ?? 0);
  const angulo = ((parte.vientoDe - pista.heading) * Math.PI) / 180;
  const cola = -fuerza * Math.cos(angulo);
  const costado = Math.abs(fuerza * Math.sin(angulo));
  if (cola <= LA_NORTE_AGUANTA.cola && costado <= LA_NORTE_AGUANTA.costado) return parte;
  return { ...vientoDeCasa(dominante), fuente: "mano" };
}

const PIE = 0.3048;
/** Cuánto por delante del través de Cáceres se coge la ortodrómica, m. Ver `caminoDeLaSalida`. */
const RECOGE_LA_ORTODROMICA = 300_000;

/**
 * **El camino de esta noche**, como lo sigue la tripulación: el final de la 36L, la
 * salida CCS6L con sus puntos —ver `SALIDA_DE_BARAJAS`— y, desde Cáceres, la ortodrómica
 * hasta Asunción, por puntos. En las coordenadas del mundo de Barajas.
 *
 * - **Recto al norte hasta SSY**, sin virar antes: la carta pide pasarlo por encima de
 *   2.400 ft, y es un punto de los que se sobrevuelan (`recta`).
 * - **A la izquierda a rumbo 285 hasta cortar el 320 hacia MD039**: el corte cae a menos
 *   de trescientos metros de SSY, así que el tramo que se sigue es de SSY a MD039, y el
 *   285 sale solo, del radio de viraje: al pasar SSY el avión se ha ido al norte del
 *   tramo y lo recoge virando más de lo que el tramo pide.
 * - **AVILA, LONGA y CCS**, con sus altitudes de «por encima de».
 *
 * Lo que de verdad pasa en este capítulo es lo primero: acaba con la luz del cinturón,
 * subiendo hacia AVILA. El resto está para que el plan sea el de verdad hasta el final.
 */
export function caminoDeLaSalida(
  origen: { readonly lat: number; readonly lon: number },
  finalDeLaPista: readonly [number, number],
  carrera: number,
  perfil: PerfilDelVuelo,
): readonly Fijo[] {
  const [x, z] = finalDeLaPista;
  const despegue: Fijo = { x, z, nombre: `RW${SALIDA_DE_BARAJAS.cabecera}`, papel: "despegue", minima: null, carrera };
  const conNombre = SALIDA_DE_BARAJAS.tramos.flatMap((t) => ("fijo" in t ? [t] : []));
  const fijos: Fijo[] = conNombre.map((t, i) => ({
    ...dondeCae(origen, t),
    nombre: t.fijo,
    papel: "salida",
    minima: t.porEncimaFt * PIE,
    // El primero se sobrevuela: hasta él no se vira.
    ...(i === 0 ? { recta: true } : {}),
  }));
  const ultimo = conNombre[conNombre.length - 1]!;
  /*
   * Desde bastante por delante del través del último: Cáceres queda unos cien kilómetros
   * al norte de la ortodrómica, y cogerla en su través sería un quiebro hacia el sur.
   */
  const desde = respectoALaRuta(DE_MADRID_A_ASUNCION, ultimo).recorrido + RECOGE_LA_ORTODROMICA;
  const camino = caminoEnElMundo(perfil, origen, desde).map(
    (q): Fijo => ({ x: q.x, z: q.z, nombre: "", papel: "ruta", minima: null }),
  );
  return [despegue, ...fijos, ...camino];
}

export type MomentoDeMadrid =
  | "embarque"
  | "ventanilla"
  | "cinturon"
  | "bienvenida"
  | "puertas"
  | "motores"
  | "demostracion"
  | "demoSalidas"
  | "demoEquipo"
  | "lucesDeLasCalles"
  | "espera"
  | "despegue"
  | "carrera"
  | "madrid"
  | "arriba"
  | "fin";

export type CharlaDeMadrid = "tren" | "giro";

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
const araLargo = (clave: string): Linea => ara(`largo.${clave}`);
/** Idaira, en persona: la de Canarias, que ya cuidó a Ara en el primer vuelo. */
const idaira = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.cerca.largo.${clave}` });
/** La tripulación de cabina, por la megafonía: a todo el pasaje. */
const tripulacion = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.${clave}`, megafonia: true });
/** La comandante, por la megafonía, con una frase de este vuelo. */
const comandante = (clave: string): Linea => ({ quien: "mama", clave: `comandante.largo.${clave}`, megafonia: true });
/** La comandante, con una frase de la escena de pasaje que ya existe. */
const comandanteDelPasaje = (clave: string): Linea => ({ quien: "mama", clave: `inicio.mama.pasaje.${clave}`, megafonia: true });
/** Un anuncio de la megafonía de siempre, montado por el juego al decirlo. */
const anuncio = (clave: string): Linea => ({ quien: "mama", clave, megafonia: true });
const con = (l: Linea, dibujo: string): Linea => ({ ...l, dibujo });

/** Lo que se deja callado antes de seguir con lo que va sin prisa, s. */
const SE_MIRA = 1;
/** Lo que se espera sentado antes de hablar, s: el rato de mirar la cabina. */
const AL_SENTARSE = 1.5;
/** El rato de embarcar después de abrirse la ventanilla, s: lo que tarda en sentarse el resto. */
const EMBARCANDO = 6;
/** Con los motores ya en marcha, s, antes de decir que se oyen. */
const MOTORES_EN_MARCHA = 3;
/** Parado en la doble raya, s, antes de preguntar por qué. */
const PARADO_EN_LA_ESPERA = 1.5;
/** Lo que se queda Ara mirando el letrero de la salida, s callados, antes de seguir. */
const MIRA_LA_SALIDA = 2;
/** Lo rodado antes de que Ara se fije en las luces del borde, m/s por el suelo: ya en marcha. */
const YA_RUEDA = 3;
const GRADO = Math.PI / 180;
/** El alabeo que se nota desde el asiento. */
const SE_NOTA_EL_GIRO = 12 * GRADO;

const callados = (_l: LecturaDelPasaje, e: { readonly callaDesde: number }): boolean => e.callaDesde >= SE_MIRA;
/** Si se está rodando hacia la pista o esperando en la doble raya. */
const rodandoALaPista = (l: LecturaDelPasaje): boolean => l.tramo === "rodando" || l.tramo === "esperando";
/** Y cuándo ya no viene a cuento lo de rodar: en el aire, o entrando en la pista. */
const yaEnLaPista = (l: LecturaDelPasaje): boolean => !enElSuelo(l.tramo) || l.tramo === "entrando" || l.tramo === "carrera";

/**
 * **La demostración**, la misma del vuelo corto en sus tres trozos, con las salidas de este
 * avión: ocho, cuatro por lado, las de su clase. Sin el dibujo de las salidas, que es el del
 * avión corto y pinta cuatro: lo que se mira es el letrero del pasillo.
 */
const DEMOSTRACION: readonly Linea[] = [tripulacion("demo.intro"), con(tripulacion("demo.cinturon"), "cinturon")];
const DEMO_SALIDAS: readonly Linea[] = [tripulacion("demo.salidasLargo")];
const DEMO_EQUIPO: readonly Linea[] = [
  con(tripulacion("demo.mascaras"), "mascara"),
  con(ara("demoMascara"), "mascara"),
  con(tripulacion("demo.chaleco"), "chaleco"),
  con(ara("demoChaleco"), "chaleco"),
  con(tripulacion("demo.tarjeta"), "tarjeta"),
  con(ara("demoTarjeta"), "tarjeta"),
  con(tripulacion("demo.aparatos"), "modo-avion"),
];

type Momento = DefMomento<MomentoDeMadrid, MomentoDeMadrid, CharlaDeMadrid>;

const MOMENTOS: readonly Momento[] = [
  // **El embarque**, bajo su lámina: es lo que abre el capítulo. Ver `apertura`.
  { id: "embarque", cuando: (_l, e) => e.segundos >= AL_SENTARSE, tapa: "embarque", lineas: [araLargo("embarque")] },
  // Y se abre la ventanilla, en el puesto y de noche.
  { id: "ventanilla", cuando: callados, tapa: null, plano: "ventanilla", lineas: [araLargo("nocheDeMadrid")] },
  {
    // Con todo el pasaje sentado: la bienvenida de la tripulación y el cinturón de Ara, con su hebilla.
    id: "cinturon",
    cuando: (_l, e) => e.callaDesde >= EMBARCANDO,
    lineas: [tripulacion("cinturon"), con(ara("cinturon"), "cinturon")],
    mira: "cinturon",
  },
  {
    /*
     * **Puertas cerradas: la bienvenida de la comandante**, en el puesto y con los motores
     * parados. Lo que se dice depende del horario de hoy: la hora de llegada, en la de
     * Asunción, es una en verano de Europa y otra en invierno. Las láminas de la litera y
     * del viento de arriba van aquí, en la tanda del guion.
     */
    id: "bienvenida",
    cuando: callados,
    caduca: (l) => !enElSuelo(l.tramo),
    lineas: [comandante("bienvenida"), comandante("vueloVerano"), comandante("tresPilotos"), ara("comandante")],
    segun: (l) => [
      comandante("bienvenida"),
      comandante(l.largo?.temporada === "invierno" ? "vueloInvierno" : "vueloVerano"),
      comandante("tresPilotos"),
      ara("comandante"),
    ],
  },
  // Los toboganes armados: con esto, la tripulación de mando arranca.
  { id: "puertas", cuando: callados, lineas: [anuncio("comandante.crosscheck"), ara("puertas")] },
  {
    id: "motores",
    cuando: (l) => l.motor && l.tramo === "arrancando" && l.enTramo >= MOTORES_EN_MARCHA,
    lineas: [ara("motores")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    id: "demostracion",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 1,
    caduca: yaEnLaPista,
    lineas: DEMOSTRACION,
  },
  {
    // Las salidas, con Ara asomada al pasillo mirando la suya.
    id: "demoSalidas",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 0.3,
    caduca: yaEnLaPista,
    lineas: DEMO_SALIDAS,
    plano: "pasillo",
    sigue: "demostracion",
  },
  {
    id: "demoEquipo",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= MIRA_LA_SALIDA,
    caduca: yaEnLaPista,
    lineas: DEMO_EQUIPO,
    sigue: "demostracion",
  },
  {
    /*
     * **Las luces de las calles**, que es lo que se ve rodando de noche: la fila verde del
     * eje, que en Barajas llevan las calles. Las azules del borde, por el cristal de Ara,
     * quedan debajo del ala y no se ven: no se nombran. Idaira, que pasa revisando
     * cinturones, cuenta para qué son.
     */
    id: "lucesDeLasCalles",
    cuando: (l, e) => l.tramo === "rodando" && l.porElSuelo > YA_RUEDA && e.callaDesde >= 1.5 && e.seVe("luces-de-las-calles", l),
    // Rodando y nada más: parado en la doble raya ya no es lo que se ve, y no hace esperar a la torre.
    caduca: (l) => l.tramo === "esperando" || yaEnLaPista(l),
    lineas: [araLargo("lucesVerdes"), idaira("lucesVerdes")],
    nombra: "luces-de-las-calles",
    // Sentada en su ventanilla: asomada, la cara contra el cristal mira abajo, al ala.
    plano: "ventanilla",
  },
  {
    id: "espera",
    cuando: (l) => l.tramo === "esperando" && l.enTramo >= PARADO_EN_LA_ESPERA,
    caduca: (l) => l.tramo !== "rodando" && l.tramo !== "esperando",
    lineas: [ara("espera"), comandanteDelPasaje("espera")],
    mira: "ventanilla",
  },
  {
    id: "despegue",
    cuando: (l) => l.tramo === "esperando" && l.autorizado,
    caduca: (l) => l.tramo !== "rodando" && l.tramo !== "esperando" && l.tramo !== "entrando",
    lineas: [anuncio("comandante.despegue"), ara("despegue")],
    mira: "ventanilla",
  },
  {
    // El empuje, en cuanto se nota, y la carrera vista desde el borde de la pista.
    id: "carrera",
    cuando: (l) => l.tramo === "carrera" && l.porElSuelo > 8,
    caduca: (l) => !l.enTierra && l.altura > 150,
    lineas: [ara("carrera")],
    plano: "fuera-despegue",
  },
  {
    /*
     * **Madrid encendida, de su lado**, si se ve por su cristal: tras el giro a la izquierda
     * de la salida queda al sur, abajo a la izquierda. Mirarlo en el `cuando` deja correr el
     * ⏩ hasta que asoma. Si hoy no se ve, no se nombra.
     */
    id: "madrid",
    cuando: (l, e) => volando(l) && l.altura > 300 && e.seVe("luces-de-madrid", l),
    caduca: (l) => l.altitud >= SE_APAGA_EL_CINTURON || bajando(l.tramo),
    nombra: "luces-de-madrid",
    lineas: [araLargo("madrid")],
  },
  {
    /*
     * **La luz del cinturón**, con su anuncio, que es el que la apaga, con su *ding*: «si se
     * quedan sentados, déjenselo puesto». No el de siempre, «ya llegamos a nuestra altura»,
     * que aquí sería falso: el avión sigue subiendo. Ver `SE_APAGA_EL_CINTURON`.
     */
    id: "arriba",
    cuando: (l, e) => !l.enTierra && l.altitud >= SE_APAGA_EL_CINTURON && e.callaDesde >= SE_MIRA,
    lineas: [comandante("cinturon")],
  },
  // Y el final del capítulo, con su tarjeta: el botón lleva al segundo.
  { id: "fin", cuando: callados, lineas: [] },
];

const CHARLAS: readonly DefCharla<MomentoDeMadrid, CharlaDeMadrid>[] = [
  {
    // El tren se guarda en cuanto se despega, con un golpe que se oye en el pasaje.
    id: "tren",
    tras: 0,
    cuando: (l, e) => e.dicho("carrera") && !l.enTierra && (l.tren ?? 1) < 0.95,
    caduca: (l) => l.altura > 1500 || bajando(l.tramo),
    lineas: [ara("tren")],
  },
  {
    // El giro de la salida, a la izquierda: con el ala de Ara apuntando al suelo.
    id: "giro",
    tras: 0,
    cuando: (l) => volando(l) && l.altura > 250 && Math.abs(l.alabeo ?? 0) > SE_NOTA_EL_GIRO,
    caduca: (l) => l.enTierra || l.altitud >= SE_APAGA_EL_CINTURON,
    lineas: [ara("giroAbajo")],
    segun: (l, e) => [ara(e.bajaMiAla(l.alabeo ?? 0) ? "giroAbajo" : "giroArriba")],
    plano: "fuera-giro",
  },
];

/** **El guion del primer capítulo**, sobre el mismo motor que los demás. */
export const GUION_NOCHE_DE_MADRID: GuionDelPasaje<MomentoDeMadrid, CharlaDeMadrid> = {
  lado: LADO_DE_ARA,
  momentos: MOMENTOS,
  charlas: CHARLAS,
  apertura: { hasta: "ventanilla", laminas: ["embarque"] },
  // Lo de señalar por la ventanilla, con sus sitios y sus frases, es de la tanda del guion.
  seSenalaDesde: [],
  tripulanteEnElPasillo: () => false,
  siesta: {
    seDuerme: GUION_TENERIFE_LA_PALMA.siesta.seDuerme,
    seDespierta: GUION_TENERIFE_LA_PALMA.siesta.seDespierta,
    laDespiertan: GUION_TENERIFE_LA_PALMA.siesta.laDespiertan,
    puedenEsperar: new Set(),
    trasAlDespertar: {},
    antesDeDormirse: [],
    // Se acaba con la luz del cinturón: de aquí no se duerme nadie.
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
  // De noche, en el puesto y rodando, no hay nada por el cristal que contar con el dedo.
  sinInvitarATocar: true,
};
