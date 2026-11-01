/**
 * **El guion del primer vuelo de pasaje de Ara**, de Los Rodeos a La Palma en
 * el JAZ 90: lo que se cuenta, en qué orden, con qué frases y cuándo. Es un
 * dato para el motor del pasaje —ver `GuionDelPasaje` en
 * `motor-del-pasaje.ts`—, y el porqué de todo está en la cabecera de
 * `inicio-pasaje.ts` y en el ADR 0020.
 */

import type { DibujoDelPasaje } from "../ui/dibujos-del-pasaje";
import type { IlustracionDelPasaje } from "../ui/ilustraciones";
import { APAGA_LA_LUZ } from "./cinturon";
import type { Linea } from "./conversacion";
import { conGracia, FORMAS_CON_GRACIA, GRACIA, type FormaDeLaDemostracion } from "./demostracion-con-gracia";
import { LINEAS_DEL_KIT } from "./kit-de-viaje";
import { LINEAS_DE_LA_LUZ } from "./luz-verde";
import { LINEAS_DE_LA_VENTANILLA_VIVA, type SelloDelViaje } from "./lo-que-se-toca";
import {
  acabaDePonerse,
  ARRIBA_Y_NIVELADO,
  bajando,
  cabinaPreparada,
  cartelApagado,
  type DefCharla,
  type DefMomento,
  DENTRO_DE_LA_NUBE,
  DIEZ_MIL_PIES,
  enElSuelo,
  enLaFinal,
  esAnuncioDeSiempre,
  type GuionDelPasaje,
  KIT_POR_ENCIMA,
  type LecturaDelPasaje,
  luzApagada,
  type MotorDelPasaje,
  PREPARAR_LA_CABINA,
  volando,
} from "./motor-del-pasaje";

/**
 * **La cumbre del Teide**, m: 3.715 según el Instituto Geográfico Nacional
 * desde 2017, y 3.718 en lo que se publicaba antes. «Más alto que el Teide»
 * se dice con margen sobre la más alta de las dos.
 */
export const CUMBRE_DEL_TEIDE = 3718;

/** Dónde se vuela la escena, en qué avión y adónde. Ver la cabecera. */
export const SITIO_DEL_PASAJE = "tenerife-norte";
export const DESTINO_DEL_PASAJE = "la-palma";
export const AVION_DEL_PASAJE = "jaz-90";
/** Y el lado de la ventanilla de Ara: el de lo que se cuenta. */
export const LADO_DE_ARA = "izquierda" as const;

/**
 * **Villa de Mazo, el pueblo de la ladera al llegar** (punto 314): el centro
 * del casco, donde la ortofoto del PNOA que lleva el juego enseña la iglesia,
 * la plaza y las casas apretadas —`data/ortho/la-palma-cerca.jpg`—, a unos
 * cuatrocientos sesenta metros sobre el mar según el relieve del juego. Queda
 * dos kilómetros y doscientos metros al oeste de la final de la 36 y unos
 * ochocientos metros al sur de su umbral: entrando por el sur, a la izquierda,
 * que es el lado de Ara. Ver la charla `mazo` y `docs/historias/fuentes.md`.
 */
export const VILLA_DE_MAZO = { lat: 28.608, lon: -17.778 } as const;

/**
 * **Las salidas de emergencia del avión de la escena** (punto 312): las de su
 * clase, la del ERJ 170 —la hoja de tipo de EASA, IM.A.001, apartado III.21,
 * para el 170-100 y el 170-200—: cuatro puertas tipo I, la de pasaje y la de
 * servicio delante y las dos de detrás, una a cada lado, y **ninguna sobre el
 * ala**. Las ventanillas de salida sobre el ala son de los más largos de la
 * familia, el ERJ 190 y el 195. Lo que dice la demostración, lo que pinta su
 * dibujo y las puertas del modelo tienen que casar con esto. Ver
 * `docs/historias/fuentes.md`.
 */
export const SALIDAS_DEL_PASAJE = { delante: 2, detras: 2, sobreElAla: 0 } as const;

export type MomentoDelPasaje =
  | "ventanilla"
  | "banoAntes"
  | "cinturon"
  | "puertas"
  | "motores"
  | "bienvenida"
  | "demostracion"
  | "demoSalidas"
  | "demoEquipo"
  | "revision"
  | "espera"
  | "despegue"
  | "carrera"
  | "volando"
  | "nubes"
  | "nubesRespuesta"
  | "arriba"
  | "servicio"
  | "tcpNubes"
  | "bajada"
  | "oidos"
  | "kit"
  | "kitRecoger"
  | "techo"
  | "isla"
  | "aproximacion"
  | "tcpAterrizaje"
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

/** Lo que se cuenta cuando viene a cuento. Ver `CHARLAS_DEL_PASAJE`. */
export type CharlaDelPasaje =
  | "tren"
  | "plop"
  | "giro"
  | "marArriba"
  | "ala"
  | "altoRapido"
  | "tcpFrio"
  | "tcpMotor"
  | "bajando"
  | "tcpIslas"
  | "tcpSilbo"
  | "tcpRuta"
  | "tcpPapi"
  | "sobreLaIsla"
  | "marQuieto"
  | "nubesCerca"
  | "bano"
  | "tcpEstrellas"
  | "islaCerca"
  | "otraNube"
  | "marAbajo"
  | "giroFinal"
  | "despacio"
  | "ruedas"
  | "miro"
  | "cerquita"
  | "vueltaEnPista"
  | "porQueLaVuelta"
  | "tcpOficio"
  | "despacito"
  | "repaso"
  | "meneo"
  | "senalero"
  | "marDeNubes"
  | "sigueLaNube"
  | "menosGas"
  | "porQueMenosGas"
  | "masGas"
  | "musica"
  | "mazo"
  | "queEsMazo"
  | "aerofrenos"
  | "aerofrenosPorque";

// ── Los números ──────────────────────────────────────────────────────────

const GRADO = Math.PI / 180;
/** Lo que se espera sentado antes de hablar, s: el rato de mirar alrededor. */
const AL_SENTARSE = 1.5;
/**
 * **Y el rato de embarcar**, s callados después de lo primero que dice Ara
 * —la ventanilla, y que ya fue al baño—, antes de que la tripulación dé la
 * bienvenida: lo que tarda en sentarse el resto del pasaje, con el hilo
 * musical sonando por el techo. Ver `audio/hilo-musical.ts`.
 */
const EMBARCANDO = 8;
/** Lo que mira Ara por la ventanilla antes de contar que ya fue al baño, s. */
const ANTES_DEL_BANO = 2;
/** Entre el cinturón y las puertas, s: se termina de embarcar. */
const HASTA_LAS_PUERTAS = 2.5;
/** Con los motores ya en marcha, s, antes de decir que se oyen. */
const MOTORES_EN_MARCHA = 3;
/** Parado en la doble raya, s, antes de preguntar por qué. */
const PARADO_EN_LA_ESPERA = 1.5;
/** Y del cartel al servicio, s. */
const HASTA_EL_SERVICIO = 3;
/** Y del anuncio del servicio a que la tripulante llega al asiento de Ara, s. */
const HASTA_EL_ASIENTO = 5;
/** Y de la toma a decir que se tocó, s: las ruedas, y la reversa ya rugiendo. */
const DESPUES_DE_TOCAR = 1.2;
/**
 * **Los aerofrenos al tocar, a la vista** (punto 296), s de escena desde el
 * corte al ala: el segundo que tardan en subir —ver `TARDAN_LOS_DE_TIERRA`
 * en `palanca-de-aerofrenos.ts`— y un par de segundos arriba con el avión
 * frenando. Luego se vuelve a la pista, a ver frenar y oír la reversa.
 */
const LOS_AEROFRENOS_A_LA_VISTA = 3.5;
/**
 * **Y hasta cuándo vale cortar al ala para verlos subir**, s desde que se
 * tocó: pasado esto ya están arriba y quietos, y lo que se vería es otra
 * cosa. Lo que se pierde se cuenta igual, rodando.
 */
const SE_VEN_SUBIR = 2;
/** Y cuánto por encima de la capa para decir que ya quedó abajo, m. */
const POR_ENCIMA = 60;
/** **Desde dónde se ve la isla de llegada**, m por la ruta: unos cuarenta y cinco kilómetros. */
const VE_LA_ISLA = 45000;
/**
 * **Lo que baja la cabina para que se noten los oídos**, m/s: unos ciento
 * veinte pies por minuto, la mitad de lo que baja como mucho. Ver
 * `BAJA_LA_CABINA` en `cabina-presurizada.ts`.
 */
const SE_NOTAN_LOS_OIDOS = -0.6;
/** Y lo que sube, para el «plop» de la subida. */
const SUBE_LA_CABINA = 0.6;
/** **Lo que se inclina el avión para que se note el giro**, rad. */
const SE_NOTA_EL_GIRO = 12 * GRADO;
/** «Más de quinientos kilómetros por hora», m/s, con margen. */
const QUINIENTOS_POR_HORA = 505 / 3.6;
/** «Bajo cero, como en el congelador», °C fuera, con margen. */
const FRIO_DE_CONGELADOR = -8;
/**
 * **Lo que se mueve el aire para que se note el meneo**, σ de la ráfaga
 * vertical en m/s: media turbulencia ligera. Dentro del mar de nubes es de
 * ocho décimas —ver `EN_LA_NUBE` en `turbulencia.ts`—, y se nota: el avión se
 * menea y el ala sube y baja. Ver el punto 280 en `CHARLAS_DEL_PASAJE`.
 */
const SE_NOTA_EL_MENEO = 0.4;
/**
 * **Lo que dice de números la tripulante bajo las nubes**: «unos cinco mil
 * pies, unos mil quinientos metros», y «más de diez kilómetros». Una frase
 * grabada no puede decir otro número, así que solo se dice cuando es verdad:
 * la base de la capa en esos cinco mil pies con medio millar de margen, el
 * avión justo por debajo —eso es lo que le falta hasta el mar— y la
 * visibilidad del parte en diez kilómetros o más. Con otro tiempo se cuenta
 * lo mismo sin los números. Un número que no puede sonar a su altura no se
 * dice (AGENTS.md).
 */
const TECHO_DE_HOY = { desde: 4500 * 0.3048, hasta: 5500 * 0.3048, justoDebajo: 200 } as const;
const MAS_DE_DIEZ_KILOMETROS = 10000;
/**
 * **Los tramos de la bajada**, m que faltan para tocar: desde dónde se cuenta
 * cada cosa. Una bajada entre islas son quince minutos, y sin repartirlos lo
 * explicado se decía todo seguido al empezar a bajar y el resto callaba: dos
 * minutos sin nada, tres veces. Repartidos con la bajada medida en el banco
 * —de 131 km a 13 km en 904 s—, cada cosa cae a un minuto de la anterior.
 */
const BAJANDO = {
  /**
   * **El kit de viaje**, en la parte alta de la bajada y sobre el mar: pasado
   * lo que solo vale arriba —el frío de fuera y el porqué del ralentí, que la
   * comandante cuenta por encima de los diez mil pies—. Desde los 104 km, en
   * el primer silencio: medido en el banco el 19-10-2026, llega a los 13.300
   * pies, detrás del ala que explica la comandante, y la tripulante lo pide de
   * vuelta tres minutos después (175 s), cruzando los diez mil; de esos, veinte
   * segundos son la megafonía de La Gomera, que lo pausa. Dos minutos y medio
   * largos de juego: la luz verde entera, minuto y medio, y su trozo de
   * canción al final, con rato de sobra. Ver `luz-verde.ts`.
   *
   * Estaba en los 84 km, pasado lo que se señala por la ventanilla, y allí,
   * con la tripulación pidiéndolo de vuelta a los diez mil pies, no quedaba ni
   * minuto y medio: la bajada se nivela a 10.430 pies para frenar a 250 nudos y
   * cruza los diez mil hacia los 75 km. Las islas y la ruta, que la tripulante
   * cuenta en persona, esperan a que se deje el juego: caducan al preparar la
   * cabina, a 28 km, y por debajo de los diez mil hay seis minutos de bajada.
   */
  kit: 104000,
  motor: 112000,
  islas: 99000,
  marQuieto: 86500,
  ruta: 78500,
  papi: 66000,
  bano: 60000,
  estrellas: 54000,
  /**
   * **Lo que sabe hacer la tripulación** (punto 303), detrás de las estrellas:
   * es el hueco callado más largo de la bajada que todavía tiene a la
   * tripulante por el pasillo —medido en las pruebas, cincuenta y cinco
   * segundos—, antes de las nubes y de preparar la cabina.
   */
  oficio: 50000,
} as const;
/**
 * **Lo que suena la música de llegada antes de que Ara pregunte por ella**,
 * s de escena seguidos: que se oiga sola un momento, ya entrada, y no en el
 * primer compás. Ver la charla `musica`.
 */
const SE_OYE_LA_MUSICA = 3;
/**
 * **La ladera de Mazo en la final**, m de altura: lo más abajo que se
 * empieza a contar, y por debajo de cuánto ya no. Lo de Ara son tres frases,
 * unos trece segundos, y a tres metros y pico por segundo de bajada acaban
 * antes de los sesenta metros, que es cuando se corta a la pista para ver
 * tocar —ver el momento `aterrizando`—: lo de Mazo no se come la toma.
 */
const MAZO_EMPIEZA_POR_ENCIMA = 110;
const MAZO_YA_NO = 100;

/** Lo que se calla la escena antes de que llegue la tripulante con el kit, s. */
const CALLA_ANTES_DEL_KIT = 10;
/**
 * **Lo que puede esperar a que Ara se despierte**: lo que se cuenta porque
 * viene a cuento y sigue viniendo después —cómo se sostiene el avión, a qué
 * altura se va, el mar de nubes—. Lo que no puede esperar es la respuesta a lo
 * que Ara notó o preguntó —el gas de subida, las nubes—, que va antes de
 * dormirse: una explicación siete minutos después de la pregunta ya no
 * contesta nada. Ver `puedeDormirse`.
 */
const PUEDEN_ESPERAR: ReadonlySet<CharlaDelPasaje> = new Set(["ala", "altoRapido", "marArriba", "marDeNubes", "sobreLaIsla"]);
/**
 * **Y lo que esperó, al despertar, con menos silencio delante**, s: arriba el
 * rato es justo —la bajada empieza al minuto, y lo de la altura deja de ser
 * verdad por debajo del Teide—. Detrás de la explicación del ralentí, que
 * contesta a lo que Ara acaba de notar —doce—, y la altura primero, que es la
 * que se acaba antes; el frío de fuera —catorce— detrás, que también se acaba
 * bajando; y el ala la última, que vale hasta los diez mil pies.
 */
const TRAS_AL_DESPERTAR: Partial<Record<CharlaDelPasaje, number>> = { altoRapido: 13, ala: 16 };
/** Lo que se tiene que haber señalado, si se ve, antes de cerrar los ojos: lo más bonito de la ruta. */
const SE_ENSENA_ANTES_DE_DORMIRSE = ["teide"] as const;

/**
 * **La vuelta en la pista** (punto 300): cuándo se está dando. Ver `daLaVuelta`.
 *
 * - `EN_LA_PUNTA`, m hasta el final de la pista: el ensanche de viraje de La
 *   Palma empieza a unos ciento cincuenta metros del final, y se le da margen.
 * - `EMPIEZA_A_GIRAR`, rad: lo que se ha girado para decir que se gira.
 * - `CERCA_DEL_EJE`, m: el ensanche llega a unos treinta del eje; la calle C,
 *   que sale torciendo hacia la terminal a mitad de pista, se aparta más
 *   antes de girar tanto, y además no está en la punta.
 * - `DE_VUELTA`, rad, y `EN_EL_EJE`, m: ya mirando hacia atrás y por el eje,
 *   que es remontar la pista esté donde esté la vuelta.
 * - `PISTA_LIBRE`, m del eje: la pista dejada libre, lo mismo que en
 *   `flight/vuelo.ts`.
 */
const EN_LA_PUNTA = 350;
const EMPIEZA_A_GIRAR = 35 * GRADO;
const CERCA_DEL_EJE = 45;
const DE_VUELTA = 150 * GRADO;
const EN_EL_EJE = 25;
const PISTA_LIBRE = 75;
/**
 * **Si el avión está dando la vuelta en la pista**: girando en la punta, o ya
 * de vuelta por ella. Lo que lo dice es el avión, no el plan: si frena a
 * tiempo para la salida, no da ninguna vuelta y no se cuenta nada.
 */
export function daLaVuelta(l: LecturaDelPasaje): boolean {
  const p = l.enLaPista;
  if (!p || !l.enTierra) return false;
  const enLaPunta = p.hastaElFinal < EN_LA_PUNTA && p.vuelta > EMPIEZA_A_GIRAR && p.alEje < CERCA_DEL_EJE;
  return enLaPunta || (p.vuelta > DE_VUELTA && p.alEje < EN_EL_EJE);
}
/** Si el avión ya ha dejado la pista: por la fase del juego, o por lo lejos que va del eje. */
const fueraDeLaPista = (l: LecturaDelPasaje): boolean =>
  l.fase === "a-plataforma" || l.fase === "en-puesto" || l.fase === "apagado" || (l.enLaPista?.alEje ?? 0) > PISTA_LIBRE;
/**
 * **Los que se levantan antes de tiempo** (punto 303): los números.
 *
 * - `PARADO_DEL_TODO`, s parado en el puesto: el señalero acaba de cruzar los
 *   bastones, y el plano suyo se queda a verlo antes de volver a la cabina.
 * - `SE_OYEN_LAS_HEBILLAS`, s de los primeros clics hasta que Ara los nota:
 *   primero se oye, y después se dice.
 * - `APAGA_LA_LUZ`, s con los motores parados antes de que la comandante
 *   apague la luz del cinturón: lo que tardan en pararse del todo. Es la
 *   regla de todos los vuelos con pasaje, y vive en `cinturon.ts`.
 * - `TRAS_EL_DING`, s del *ding* a que Ara se suelta: primero suena, y Ara
 *   reacciona a lo que oye.
 */
const PARADO_DEL_TODO = 1.5;
const SE_OYEN_LAS_HEBILLAS = 2.5;
const TRAS_EL_DING = 1.4;
/**
 * **Y lo que se queda hasta la frase siguiente**, no solo ese poco: la cabina
 * vacía del embarque, que acompaña al rato callado en que sube el resto del
 * pasaje con el hilo musical. Ver `EMBARCANDO`.
 */
const HASTA_LA_SIGUIENTE: ReadonlySet<string> = new Set(["ilustracion:pasaje-embarque"]);

/**
 * **Los sellos del cuaderno de viaje que da lo que dice la escena**, cuando
 * se ve mientras se dice: lo que se cuenta con el plano que lo enseña —el
 * motor con la cara contra el cristal, el ala y las ruedas por fuera— o lo que
 * nombra del paisaje, que solo se dice si se ve. Lo señalado por la comandante
 * da el suyo en `decirLoSenalado`. Ver `flight/sellos-del-viaje.ts`.
 */
const SELLO_AL_DECIRLO: Readonly<Partial<Record<string, readonly SelloDelViaje[]>>> = {
  ventanilla: ["motor", "ala"],
  motores: ["motor"],
  tcpMotor: ["motor"],
  ala: ["ala"],
  flaps: ["ala"],
  marDeNubes: ["nubes"],
  isla: ["palma"],
  islaCerca: ["palma"],
  mazo: ["mazo"],
  ruedas: ["ruedas"],
  altoRapido: ["teide"],
};

// ── El guion ─────────────────────────────────────────────────────────────

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
/** La comandante, por la megafonía, con una frase nueva de esta escena. */
const comandante = (clave: string): Linea => ({
  quien: "mama",
  clave: `inicio.mama.pasaje.${clave}`,
  megafonia: true,
});
/** La tripulación de cabina, por la megafonía: a todo el pasaje. */
const tripulacion = (clave: string): Linea => ({
  quien: "tripulacion",
  clave: `inicio.tripulacion.pasaje.${clave}`,
  megafonia: true,
});
/**
 * **Y la tripulante, en persona**: se acerca al asiento y le habla a Ara, sin
 * altavoz. Su habla, la de su base —de Canarias, con el tú—, y la misma voz
 * que por la megafonía, que es la misma persona.
 */
const tripulante = (clave: string): Linea => ({
  quien: "tripulacion",
  clave: `inicio.tripulacion.pasaje.cerca.${clave}`,
});
/** La frase de la tripulante con la que llega el kit, y la de guardarlo para aterrizar. */
const KIT_DADO = "kitAqui";
const KIT_GUARDADO = "kitGuardar";
/** Una frase con el dibujo de la ventanita. */
const con = (l: Linea, dibujo: DibujoDelPasaje): Linea => ({ ...l, dibujo });
/**
 * **Una frase con su ilustración en la ventanita**: lo que está pasando en
 * ese instante, dibujado como un cuento —ver `ui/ilustraciones.ts`—. Va donde
 * no hay nada que explicar con un dibujo, y solo cuando lo que se ve en ella es
 * lo que pasa: las de la cabina de pasaje y la de la comandante tienen el
 * cielo y las nubes por la ventanilla, así que en tierra no salen.
 */
const ilustrada = (l: Linea, i: IlustracionDelPasaje): Linea => ({ ...l, dibujo: `ilustracion:${i}` });
/** La tripulante en persona, al lado de Ara: la ilustración de las dos, ya en el aire. */
const conLaTripulante = (l: Linea): Linea => ilustrada(l, "pasaje-tripulante");
/** La comandante por la megafonía, en su cabina por encima de las nubes. */
const desdeLaCabina = (l: Linea): Linea => ilustrada(l, "pasaje-comandante");
/**
 * **La siesta**: lo que dice Ara al cerrar los ojos y al abrirlos —con el
 * mapa de la ruta en la ventanita, el que se vio mientras dormía—, y la
 * tripulante que despierta a Ara para bajar, por lo que es: el cinturón y la
 * bajada. Ver `puedeDormirse`.
 */
const SE_DUERME = ara("dormirse");
const SE_DESPIERTA = con(ara("despertarse"), "ruta");
const LA_DESPIERTAN = conLaTripulante(tripulante("despertar"));
/** Ara contra el cristal, con su ilustración si el cartel está apagado; si no, como venía. */
const contraElCristal = (l: Linea, e: EscenaDelPasaje): Linea =>
  cartelApagado(e) ? ilustrada(l, "pasaje-ara-ventanilla") : l;
/**
 * **Las nubes de cerca, con la tripulante al lado**: el saludo con su
 * ilustración, lo que se explica con el dibujo de la nube y, al final, lo que
 * dice Ara.
 */
/** **El plop de los oídos, explicado** por la tripulante: ver el momento `tcpNubes`. */
const EL_PLOP_EXPLICADO: readonly Linea[] = [conLaTripulante(tripulante("plop1")), conLaTripulante(tripulante("plop2"))];
/**
 * **Lo que sabe hacer la tripulante** (punto 303), con su dibujo: los
 * primeros auxilios y el desfibrilador, el fuego con la capucha del humo,
 * evacuar el avión en noventa segundos y los chalecos en el agua. Es lo que
 * lleva el certificado de tripulante de cabina europeo y lo que se repasa
 * cada año; ver `docs/historias/fuentes.md`. Contado como lo que sabe hacer,
 * no como algo que vaya a pasar. Y Ara saca la lección de los galones: el
 * uniforme es para cuidar.
 */
const EL_OFICIO: readonly Linea[] = [
  con(tripulante("oficio1"), "tripulacion"),
  con(tripulante("oficio2"), "tripulacion"),
  con(ara("uniforme"), "tripulacion"),
];
/**
 * **Y la vuelta en la pista, explicada**, por la comandante y para todos: por
 * qué se dio, el ensanche de la punta, y el permiso de la torre para ir por la
 * pista al revés. Con el dibujo de la pista desde arriba.
 */
const LA_VUELTA_EXPLICADA: readonly Linea[] = [
  con(comandante("vueltaEnPista"), "vuelta-en-pista"),
  con(comandante("permisoDeVuelta"), "vuelta-en-pista"),
];
const lasNubesDeCerca = (ultima: Linea): Linea[] => [
  conLaTripulante(tripulante("hola")),
  conLaTripulante(ara("deVerdad")),
  con(tripulante("nubes1"), "nube"),
  con(tripulante("nubes2"), "nube"),
  con(tripulante("nubes3"), "nube"),
  ultima,
];
/**
 * **Un anuncio de la megafonía de siempre**: lo monta el juego con el campo,
 * el plan y el tiempo de hoy. Ver `ANUNCIOS` en `audio/megafonia.ts`.
 */
const anuncio = (clave: string): Linea => ({
  quien: clave.startsWith("tripulacion.") ? "tripulacion" : "mama",
  clave,
  megafonia: true,
});

/**
 * **El baño** (punto 293): lo que dice la tripulante cuando Ara lo pregunta
 * con la luz encendida, y el viaje cuando se apaga —ella viene a por Ara, da
 * el anuncio del servicio desde la cocina de atrás mientras Ara está dentro,
 * y Ara vuelve abrochándose—. Ver `puedeIrAlBano`.
 */
const BANO_CON_LA_LUZ = con(tripulante("banoLuz"), "cinturon");
const AL_BANO: readonly Linea[] = [
  conLaTripulante(tripulante("banoAhora")),
  anuncio("tripulacion.servicio"),
  conLaTripulante(ara("banoVuelta")),
];
/** Y bajando, con la luz otra vez encendida, la tripulante que lo recuerda: fue justo a tiempo. */
const FUE_A_TIEMPO = conLaTripulante(tripulante("banoATiempo"));

/** Si la tripulante ya anda por el pasillo: desde que trae el servicio. */
const tripulanteEnElPasillo = (e: EscenaDelPasaje): boolean => e.dicho("tcpNubes") || e.saltado("tcpNubes");
/**
 * **Si ya se ha contado qué es el Teide**, lo primero de todo: lo cuenta la
 * comandante al señalarlo por la ventanilla, o antes de decir que se vuela
 * más alto que él. Ver la charla `altoRapido`.
 */
const teidePresentado = (e: EscenaDelPasaje): boolean => e.fueSenalado("teide") || e.pedida("inicio.mama.pasaje.teide");
/**
 * **Si Ara oyó la historia del silbo y la contestó**: entonces puede
 * preguntar si se silba en más islas. Ver la charla `tcpSilbo`.
 */
const silboOido = (e: EscenaDelPasaje): boolean => e.oida("inicio.ara.pasaje.garajonay");

/**
 * **La demostración de seguridad**, por la megafonía y con su dibujo cada
 * cosa. Lo que se enseña y en qué orden es lo de la norma europea —el AMC1
 * CAT.OP.MPA.170 de EASA, información a los pasajeros antes del despegue—:
 * cómo se abrocha, se ajusta y se suelta el cinturón; dónde están las
 * salidas y las luces del suelo que llevan a ellas; las máscaras de oxígeno,
 * primero la de uno y después ayudar a los demás; el chaleco salvavidas,
 * que se infla al salir y no dentro; la tarjeta de seguridad, y los aparatos
 * electrónicos. Para un vuelo entre islas: el chaleco va porque se despega y
 * se aterriza sobre el mar. Corta y con cariño, y con Ara mirando: es la
 * primera vez que lo ve.
 *
 * **Y cuándo se usa cada cosa** (punto 313): las máscaras, si la cabina
 * perdiera presión; el chaleco, si el avión tuviera que posarse en el agua.
 * Sin eso, un niño puede salir creyendo que en un avión se llevan puestas.
 *
 * **Las salidas son las de este avión** (punto 312): cuatro puertas, dos
 * delante y dos detrás, que es lo que lleva un avión de la clase del ERJ 170
 * —ninguna sobre el ala—, y la más cercana puede estar detrás. Va en su
 * propio trozo, con Ara asomada al pasillo mirando la de delante, que es la
 * suya: el corte de plano necesita su silencio, y el anuncio es el mismo.
 * Ver `docs/historias/fuentes.md`.
 */
const DEMOSTRACION: readonly Linea[] = [tripulacion("demo.intro"), con(tripulacion("demo.cinturon"), "cinturon")];
const DEMO_SALIDAS: readonly Linea[] = [con(tripulacion("demo.salidas"), "salidas")];
const DEMO_EQUIPO: readonly Linea[] = [
  con(tripulacion("demo.mascaras"), "mascara"),
  con(ara("demoMascara"), "mascara"),
  con(tripulacion("demo.chaleco"), "chaleco"),
  con(ara("demoChaleco"), "chaleco"),
  con(tripulacion("demo.tarjeta"), "tarjeta"),
  con(ara("demoTarjeta"), "tarjeta"),
  con(tripulacion("demo.aparatos"), "modo-avion"),
];
/**
 * **Y la gracia de este vuelo, si la hay** (punto 294): la frase de la entrada
 * detrás del «les rogamos un momento de atención», y la de la despedida
 * detrás del «muchas gracias por su atención». Lo de en medio no se toca: las
 * instrucciones son las mismas frases grabadas en todas las formas, en el
 * mismo orden y con su dibujo. Sin dibujo la gracia, que no enseña nada que
 * mirar. Ver `demostracion-con-gracia.ts`.
 */
const conSuGracia = (lineas: readonly Linea[], forma: FormaDeLaDemostracion, donde: "entrada" | "despedida"): readonly Linea[] => {
  if (!conGracia(forma)) return lineas;
  const gracia: Linea = { quien: "tripulacion", clave: GRACIA[forma][donde], megafonia: true };
  return donde === "entrada" ? [lineas[0]!, gracia, ...lineas.slice(1)] : [...lineas, gracia];
};
/** Lo que se queda Ara mirando el letrero de la salida, s callados, antes de seguir la demostración. */
const MIRA_LA_SALIDA = 2;
/** Si se está rodando hacia la pista o esperando en la doble raya: cuando va la demostración. */
const rodandoALaPista = (l: LecturaDelPasaje): boolean => l.tramo === "rodando" || l.tramo === "esperando";
/** Y cuándo ya no viene a cuento: en el aire, o entrando en la pista. */
const yaEnLaPista = (l: LecturaDelPasaje): boolean => !enElSuelo(l.tramo) || l.tramo === "entrando" || l.tramo === "carrera";

/**
 * **El guion entero**, en el orden en que pasa un vuelo. Cada momento espera
 * a que no hable nadie y a que el avión esté donde toca; el que se pasa de su
 * momento se salta.
 */
export const GUION_DEL_PASAJE: readonly DefMomento<MomentoDelPasaje, MomentoDelPasaje, CharlaDelPasaje>[] = [
  {
    /*
     * **Lo primero, pegarse al cristal**: desde su asiento, sentada, Ara ve la
     * ventanilla; para ver el motor, que cuelga debajo del ala y por delante,
     * se acerca al cristal y mira hacia abajo. Lo que se dice se ve. Ver
     * `asientoDeAra`.
     */
    id: "ventanilla",
    cuando: (_l, e) => e.segundos >= AL_SENTARSE,
    // Y la cabina todavía vacía: las familias con criaturas embarcan las primeras.
    lineas: [ilustrada(ara("ventanilla"), "pasaje-embarque")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    /*
     * **Al baño, antes de subir** (punto 293): Ara cuenta que ya fue, porque
     * en los vuelos cortos casi no da tiempo. Lo dice su mamá, que de vuelos
     * cortos sabe. Con la cabina del embarque todavía en la ventanita.
     */
    id: "banoAntes",
    cuando: (_l, e) => e.callaDesde >= ANTES_DEL_BANO,
    lineas: [ilustrada(ara("banoAntes"), "pasaje-embarque")],
  },
  {
    /*
     * Después del rato de embarcar, con la música: la bienvenida, con todo el
     * pasaje ya en su asiento, y el cinturón de Ara, con su hebilla.
     */
    id: "cinturon",
    cuando: (_l, e) => e.callaDesde >= EMBARCANDO,
    lineas: [ilustrada(tripulacion("cinturon"), "pasaje-lleno"), con(ara("cinturon"), "cinturon")],
    mira: "cinturon",
  },
  {
    id: "puertas",
    cuando: (_l, e) => e.callaDesde >= HASTA_LAS_PUERTAS,
    lineas: [anuncio("comandante.crosscheck"), ara("puertas")],
  },
  {
    id: "motores",
    cuando: (l) => l.motor && l.tramo === "arrancando" && l.enTramo >= MOTORES_EN_MARCHA,
    lineas: [ara("motores")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    /*
     * El rodaje, visto por fuera, mientras la comandante da la bienvenida.
     *
     * **Y por qué se sale hacia el este**, en el mismo anuncio: con el alisio
     * del nordeste de la escena —ver `vientoDominante` de Los Rodeos— la 12 lo
     * tiene por delante y la 30 por detrás, así que se despega hacia el este
     * y después se da la vuelta hacia La Palma, que queda al oeste. Lo cuenta
     * quien lo decide, rodando y por la megafonía, que es cuando lo cuentan
     * las comandantes; volando ya no podría hasta los diez mil pies, y para
     * entonces el giro ya pasó.
     */
    id: "bienvenida",
    cuando: (l) => l.tramo === "rodando" && l.porElSuelo > 2,
    caduca: (l) => !enElSuelo(l.tramo),
    lineas: [anuncio("comandante.bienvenida"), comandante("viento"), ara("comandante")],
    plano: "fuera-rodando",
  },
  {
    id: "demostracion",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 1,
    caduca: yaEnLaPista,
    lineas: DEMOSTRACION,
    segun: (_l, e) => conSuGracia(DEMOSTRACION, e.formaDeLaDemostracion, "entrada"),
  },
  {
    // Las salidas, con Ara asomada al pasillo mirando la suya. Ver `DEMOSTRACION`.
    id: "demoSalidas",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 0.3,
    caduca: yaEnLaPista,
    lineas: DEMO_SALIDAS,
    plano: "pasillo",
    sigue: "demostracion",
  },
  {
    // Y el resto, otra vez desde la ventanilla, cuando Ara ha mirado el letrero un momento.
    id: "demoEquipo",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= MIRA_LA_SALIDA,
    caduca: yaEnLaPista,
    lineas: DEMO_EQUIPO,
    segun: (_l, e) => conSuGracia(DEMO_EQUIPO, e.formaDeLaDemostracion, "despedida"),
    sigue: "demostracion",
  },
  {
    /*
     * **Y la revisión**: antes de despegar, la tripulación pasa por el pasillo
     * mirando cinturones, respaldos y persianas. A Ara le revisa el suyo, y le
     * cuenta por qué la persiana va subida.
     *
     * **Y lo que Ara se ha quedado pensando de la demostración** (puntos 312
     * y 313), que es ahora cuando tiene a la tripulante al lado —durante la
     * demostración ella está ocupada—: si hay que ponerse ya la máscara —no:
     * es por si acaso, como el chaleco, y casi nunca pasa—, y si no se sale
     * por la ventanilla del ala —en los aviones más largos sí; este es más
     * corto, y sus salidas son las puertas—. Con calma: está todo preparado
     * por si acaso, sin asustar y sin esconderlo.
     *
     * **Y el baño, con la luz encendida** (punto 293): es lo último que tiene
     * a la tripulante al lado antes de que se apague —subiendo va sentada y
     * atada—, y la respuesta es la regla: con la luz encendida no se levanta
     * nadie, y cuando se apague, le acompaña. Lo dice porque la luz manda.
     */
    id: "revision",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 1.5,
    caduca: yaEnLaPista,
    lineas: [
      tripulante("revision"),
      ara("persiana"),
      con(tripulante("persiana"), "persiana"),
      ara("mascaraAhora"),
      // Sin el dibujo de las máscaras cayendo: lo que se contesta es que ahora no.
      tripulante("mascaraAhora"),
      ara("salidaAla"),
      con(tripulante("salidaAla"), "salidas"),
      ara("bano"),
      BANO_CON_LA_LUZ,
    ],
    mira: "ventanilla",
  },
  {
    id: "espera",
    cuando: (l) => l.tramo === "esperando" && l.enTramo >= PARADO_EN_LA_ESPERA,
    caduca: (l) => l.tramo !== "rodando" && l.tramo !== "esperando",
    lineas: [ara("espera"), comandante("espera")],
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
    /*
     * **El empuje, en cuanto se nota**: al dar gas, que es cuando aprieta
     * contra el asiento. Y la carrera, vista desde el borde de la pista: el
     * avión que corre y se levanta, que es lo que no se ve desde dentro.
     */
    id: "carrera",
    cuando: (l) => l.tramo === "carrera" && l.porElSuelo > 8,
    caduca: (l) => !l.enTierra && l.altura > 150,
    lineas: [ara("carrera")],
    plano: "fuera-despegue",
  },
  {
    // «Las casas y los autos se ven chiquititos»: solo si se ve el suelo.
    id: "volando",
    cuando: (l) => !l.enTierra && l.altura > 80,
    caduca: (l) => l.altura > 1200,
    lineas: [ara("volando")],
    mira: "ventanilla",
    nombra: "tierra-abajo",
  },
  {
    /*
     * **Las nubes, por dentro o desde arriba**: si la subida atraviesa una, la
     * ventanilla se pone blanca y Ara pregunta ahí; si pasa entre ellas, al
     * dejarlas abajo. Lo que se dice tiene que ser lo que se ve.
     */
    id: "nubes",
    cuando: (l) =>
      !!l.nubes &&
      !l.enTierra &&
      l.vertical > 0.5 &&
      (l.enNube >= DENTRO_DE_LA_NUBE || l.altitud > l.nubes.techo + POR_ENCIMA),
    caduca: (l) => !l.nubes || l.altitud > l.nubes.techo + 700 || bajando(l.tramo),
    lineas: [ara("nubes")],
    segun: (l) => [ara(l.enNube >= DENTRO_DE_LA_NUBE ? "nubes" : "nubesAbajo")],
    mira: "nubes",
  },
  {
    /*
     * La respuesta, **pasados los diez mil pies**: por debajo, la cabina de
     * mando no habla de nada que no sea volar —la cabina estéril—. Y solo si
     * se preguntó: sin pregunta, la explicación sobraría.
     */
    id: "nubesRespuesta",
    cuando: (l) => !l.enTierra && (l.altitud >= DIEZ_MIL_PIES || l.tramo === "crucero"),
    caduca: (l, e) => !e.dicho("nubes") || bajando(l.tramo),
    lineas: [con(comandante("nubes"), "nube"), con(ara("niebla"), "nube")],
  },
  {
    // Arriba, una vuelta alrededor del avión, por encima del mar de nubes.
    id: "arriba",
    cuando: (l) => l.tramo === "crucero" && l.enTramo >= ARRIBA_Y_NIVELADO,
    caduca: (l) => bajando(l.tramo),
    lineas: [desdeLaCabina(anuncio("comandante.crucero"))],
    plano: "fuera-vuelta",
  },
  {
    id: "servicio",
    cuando: (_l, e) => e.desdeQueSeDijo("arriba") >= HASTA_EL_SERVICIO,
    caduca: (l, e) => !e.dicho("arriba") || bajando(l.tramo),
    lineas: [anuncio("tripulacion.servicio"), ara("servicio")],
    /*
     * **Y el baño, ahora que se puede** (punto 293): la luz se acaba de apagar
     * y la tripulante cumple lo que dijo en la revisión. Ara va mientras ella
     * da el anuncio del servicio desde la cocina de atrás —el teléfono de la
     * megafonía está allí, al lado del baño—, y vuelve a su asiento y se
     * abrocha. Con el avión por fuera, que el asiento se queda vacío un rato.
     * Si la luz no se ha apagado o ya no queda crucero, no: ver `puedeIrAlBano`.
     */
    segun: (l, e) => (e.puedeIrAlBano(l) ? AL_BANO : [anuncio("tripulacion.servicio"), ara("servicio")]),
    plano: "fuera-vuelta",
    // Pegado al cartel apagado: un crucero entre islas dura un minuto, y una historia en medio se lo comía.
    pegado: true,
  },
  {
    /*
     * **La tripulante, en el asiento de Ara**, con el servicio: le pregunta si
     * es su primer vuelo y le cuenta las nubes de cerca, con su dibujo —de qué
     * son, por qué son blancas y qué se nota al cruzarlas—. La comandante ya
     * lo dijo para todos; esto es lo que se le cuenta a un niño.
     */
    id: "tcpNubes",
    cuando: (l, e) =>
      !l.enTierra &&
      (e.desdeQueSeDijo("servicio") >= HASTA_EL_ASIENTO || (e.saltado("servicio") && volando(l))),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: lasNubesDeCerca(con(ara("nubesSostiene"), "nube")),
    /*
     * Y lo último, «ahora las miro de otra manera», con Ara mirándolas contra
     * el cristal, si el cartel está apagado; si no, el dibujo de la nube sigue.
     *
     * **Y el plop de los oídos, explicado** (punto 284), si Ara lo notó al
     * subir. Subiendo, la presión de la cabina baja y el aire de dentro del
     * oído sale, y eso es el plop; tragar saliva o bostezar ayuda a igualarla.
     * En la subida nadie lo podía contar —la tripulación, sentada y atada; la
     * cabina de mando, por debajo de los diez mil pies, en lo suyo—, y lo
     * cuenta la tripulante en cuanto se levanta y llega al asiento de Ara, que
     * es lo que hace cualquier tripulante con un niño en su primer vuelo. Y se
     * engancha con la bajada: allí Ara ya sabe que es al revés. Ver el momento
     * `oidos`.
     */
    segun: (_l, e) => [
      ...lasNubesDeCerca(contraElCristal(con(ara("nubesSostiene"), "nube"), e)),
      ...(e.dichaLaCharla("plop") ? EL_PLOP_EXPLICADO : []),
    ],
    mira: "nubes",
  },
  {
    id: "bajada",
    cuando: (l) => bajando(l.tramo) && !l.enTierra,
    lineas: [desdeLaCabina(anuncio("comandante.descenso")), anuncio("tripulacion.cinturones")],
    /*
     * **Y los motores al ralentí, que se oyen** (punto 297): en el punto de
     * descenso la tripulación quita el gas del todo, y el ruido baja de golpe.
     * Ara lo nota primero, si acaba de pasar —ver `SE_OYE_EL_CAMBIO`—, y la
     * comandante dice lo que es: que empezamos a bajar. El porqué del ralentí
     * —que para bajar no se apagan los motores— lo cuenta ella misma en el
     * primer rato tranquilo de después, por encima de los diez mil pies: ver
     * la charla `bajando`.
     */
    segun: (l) => [
      ...(acabaDePonerse(l, "ralenti") ? [ara("ralenti")] : []),
      desdeLaCabina(anuncio("comandante.descenso")),
      anuncio("tripulacion.cinturones"),
    ],
  },
  {
    id: "oidos",
    cuando: (l) => l.cabina <= SE_NOTAN_LOS_OIDOS && !l.enTierra,
    caduca: (l) => l.tramo === "final" || l.tramo === "recogida" || l.enTierra || l.faltaParaTocar < PREPARAR_LA_CABINA,
    lineas: [ara("oidos"), con(tripulacion("oidos"), "oido"), con(ara("bostezo"), "oido")],
    /*
     * **Y si el plop de la subida ya se explicó** —ver el momento `tcpNubes`—,
     * Ara no pregunta lo que ya sabe: dice que ahora es al revés. Lo demás, lo
     * de siempre, que el anuncio es para todo el pasaje.
     */
    segun: (_l, e) => [
      e.plopExplicado ? ara("oidosAlReves") : ara("oidos"),
      con(tripulacion("oidos"), "oido"),
      con(ara("bostezo"), "oido"),
    ],
  },
  {
    /*
     * **El kit de viaje**: la tripulante se lo trae a Ara en el tramo largo y
     * tranquilo de la bajada, que es cuando un vuelo se hace largo. Es lo que
     * hacen las aerolíneas con quien viaja con pocos años, y se dice como es:
     * volar es apasionante, pero los vuelos duran un ratito. Ver
     * `kit-de-viaje.ts`.
     */
    id: "kit",
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      !l.enTierra &&
      tripulanteEnElPasillo(e) &&
      l.faltaParaTocar < BAJANDO.kit &&
      e.callaDesde >= CALLA_ANTES_DEL_KIT &&
      !cabinaPreparada(l, e),
    // Y si ya lo tiene —el kit de prueba, en la mano desde el puesto: ver `kitDePrueba` en `game.ts`—, no se trae otra vez.
    caduca: (l, e) => e.kit.esDado || cabinaPreparada(l, e) || l.altitud < DIEZ_MIL_PIES + KIT_POR_ENCIMA,
    lineas: [tripulante(KIT_DADO), tripulante("kitRato"), ara("kitGracias")].map(conLaTripulante),
  },
  {
    /*
     * **Y se recoge al empezar la llegada**, cruzando los diez mil pies
     * bajando, que es cuando se prepara la cabina para la llegada: la
     * tripulante pide guardarlo en el bolsillo del asiento. Lo pidió Enrique
     * (19-10-2026): «hay que vivir la bajada y la aproximación, ese momento es
     * mágico, cuando está llegando a tierra». Desde aquí, la llegada se vive
     * sin juego delante: las nubes, la isla, los flaps, el tren y la pista.
     * Antes se pedía con la cabina preparada, a treinta kilómetros de la pista.
     */
    id: "kitRecoger",
    cuando: (l, e) => e.kit.esDado && !l.enTierra && bajando(l.tramo) && l.altitud < DIEZ_MIL_PIES,
    caduca: (l, e) => !e.kit.esDado || e.kit.estaRecogido || l.enTierra || enLaFinal(l),
    lineas: [conLaTripulante(tripulante(KIT_GUARDADO))],
  },
  {
    /*
     * **Al salir por debajo de las nubes** (punto 295), en el momento en que
     * pasa: el avión deja la capa encima y se ve lejos. Ara lo nota, y la
     * tripulante, que todavía anda por el pasillo, se lo cuenta «a nivel de
     * niños, pero no de tontos»: que la parte de abajo de las nubes es su base
     * —y techo cuando tapan más de medio cielo, que es lo que dice la OACI—,
     * a cuánto está hoy y cuánto falta hasta el mar, y la visibilidad, que se
     * mide en kilómetros y es lo que deja ver la pista a tiempo. Los números,
     * solo si son los de hoy: ver `TECHO_DE_HOY`. Con la cabina ya preparada,
     * sin la tripulante, lo cuenta Ara con lo que le enseñó su mamá.
     *
     * La comandante no: por debajo de los diez mil pies la cabina de mando
     * solo habla del vuelo —la cabina estéril—, y esto no es seguridad.
     */
    id: "techo",
    cuando: (l) =>
      bajando(l.tramo) &&
      !l.enTierra &&
      !!l.nubes &&
      l.altitud < l.nubes.base - 20 &&
      l.enNube < DENTRO_DE_LA_NUBE,
    // «Y abajo se ve lejísimos»: con la visibilidad corta no es verdad, y no se dice.
    caduca: (l) =>
      l.enTierra ||
      enLaFinal(l) ||
      !l.nubes ||
      (l.visibilidad ?? MAS_DE_DIEZ_KILOMETROS) < MAS_DE_DIEZ_KILOMETROS ||
      l.faltaParaTocar < PREPARAR_LA_CABINA - 4000,
    lineas: [ara("bajoLasNubes"), conLaTripulante(tripulante("techo")), con(tripulante("techoHoy"), "techo"), con(tripulante("visibilidad"), "techo")],
    segun: (l, e) => {
      const lineas: Linea[] = [ara("bajoLasNubes")];
      if (!tripulanteEnElPasillo(e) || cabinaPreparada(l, e)) return [...lineas, con(ara("techo"), "techo")];
      lineas.push(conLaTripulante(tripulante("techo")));
      const base = l.nubes?.base ?? 0;
      const deHoy =
        base >= TECHO_DE_HOY.desde &&
        base <= TECHO_DE_HOY.hasta &&
        l.altitud > base - TECHO_DE_HOY.justoDebajo &&
        l.sobreElMar !== false;
      if (deHoy) lineas.push(con(tripulante("techoHoy"), "techo"));
      if ((l.visibilidad ?? MAS_DE_DIEZ_KILOMETROS) >= MAS_DE_DIEZ_KILOMETROS)
        lineas.push(con(tripulante("visibilidad"), "techo"));
      return lineas;
    },
    mira: "nubes",
  },
  {
    /*
     * **La isla de llegada, a la vista**: La Palma sube a casi dos mil
     * quinientos metros, y desde cuarenta y tantos kilómetros ya se ve entera
     * por encima del mar de nubes. Es Ara quien la descubre: la cabina de mando
     * ya está con la llegada.
     *
     * **Y solo si se ve** (punto 286): se decía con el avión metido en la
     * nube, la ventanilla toda blanca. Se dice cuando se ve, desde donde se
     * vea: si va por delante del morro, con el avión por fuera y la isla al
     * fondo.
     */
    id: "isla",
    cuando: (l) => l.faltaParaTocar < VE_LA_ISLA && !l.enTierra,
    caduca: (l) => l.enTierra || l.tramo === "final" || l.faltaParaTocar < PREPARAR_LA_CABINA - 4000,
    lineas: [ara("isla")],
    mira: "ventanilla",
    nombra: "isla-de-llegada",
  },
  {
    id: "aproximacion",
    cuando: (l) => l.faltaParaTocar < PREPARAR_LA_CABINA && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [anuncio("comandante.aproximacion")],
  },
  {
    /*
     * La última vuelta de la tripulante antes de sentarse: cinturón, respaldo
     * y persiana. Y si trajo el kit y todavía no se guardó —se pide a los diez
     * mil pies, ver `kitRecoger`—, que se guarde: para aterrizar, todo
     * recogido. Ver `atenderAlKit`.
     */
    id: "tcpAterrizaje",
    cuando: (l, e) => !l.enTierra && e.desdeQueSeDijo("aproximacion") >= 2,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [conLaTripulante(tripulante("aterrizaje"))],
    segun: (_l, e) =>
      (e.kit.esDado && !e.kit.estaRecogido ? [tripulante(KIT_GUARDADO), tripulante("aterrizaje")] : [tripulante("aterrizaje")]).map(
        conLaTripulante,
      ),
  },
  {
    /*
     * **Los flaps, vistos por fuera**: desde el asiento de Ara, por delante del
     * ala, se ve el borde de ataque y el motor, y lo que sale por detrás queda
     * a la espalda. Así que cuando Ara lo nota, se ve el ala desde fuera, que
     * es donde se ve salir el flap. Ver `asiento-de-ara.test.ts`.
     */
    id: "flaps",
    cuando: (l) => l.flaps > 0.2 && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("flaps"), ara("flapsPorque")],
    mira: "ala",
    plano: "fuera-ala",
  },
  {
    // **La toma, desde el borde de la pista**: las ruedas que tocan y el avión que frena.
    id: "aterrizando",
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 60,
    caduca: (l) => l.enTierra,
    lineas: [ara("yaCasi")],
    plano: "fuera-pista",
  },
  {
    /*
     * **Y la toma, desde la pista, detrás del ala**: si al tocar se cortó al ala
     * para ver subir los aerofrenos —la charla `aerofrenos`—, se les deja su
     * rato y se vuelve a la orilla de la pista, a ver frenar y oír la reversa.
     */
    id: "toma",
    cuando: (l, e) =>
      l.tramo === "frenando" &&
      l.enTramo >= DESPUES_DE_TOCAR &&
      !(e.planoDeAhora === "fuera-ala" && e.enElPlanoDesde < LOS_AEROFRENOS_A_LA_VISTA),
    caduca: (l) => l.tramo === "al-puesto" || l.tramo === "aparcado" || l.tramo === "apagado",
    lineas: [ara("toma")],
    mira: "motor",
    plano: "fuera-pista",
  },
  {
    id: "llegada",
    cuando: (l) => (l.tramo === "al-puesto" && l.porElSuelo > 1.5) || l.tramo === "aparcado",
    lineas: [anuncio("comandante.llegada"), comandante("reversa"), anuncio("tripulacion.llegada")],
    /*
     * **Y lo que sonó antes de tocar**, si Ara lo notó —ver la charla
     * `masGas`—: los motores que suben con el tren y los flaps fuera. En la
     * aproximación nadie lo podía contar —la cabina de mando, en lo suyo; la
     * tripulante, sentada—, así que lo cuenta la comandante en el primer rato
     * tranquilo, con la reversa: lo que pasa en un momento de trabajo se
     * explica en el primer momento tranquilo de después.
     */
    segun: (_l, e) => [
      anuncio("comandante.llegada"),
      comandante("reversa"),
      ...(e.dichaLaCharla("masGas") ? [comandante("masGas")] : []),
      anuncio("tripulacion.llegada"),
    ],
    plano: "fuera-rodando",
  },
  {
    /*
     * **Parados en el puesto, los impacientes** (punto 303): el avión se para,
     * los motores todavía en marcha y la luz del cinturón encendida, y
     * alrededor empiezan los clics de las hebillas y la gente que se levanta,
     * bajito. Lo de fuera —el señalero cruzando los bastones— se deja ver
     * parar, y se vuelve a la cabina, que es donde pasa esto. Sin palabras:
     * lo que se oye lo pone el juego mientras dure. Ver `gente`.
     */
    id: "impacientes",
    cuando: (l) => (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO) || l.tramo === "apagado",
    lineas: [],
  },
  {
    /*
     * **Y Ara lo nota, y se queda en su asiento**: lo dice sin regañar a
     * nadie —lo que hacen otros no es asunto suyo— y hace lo que toca. La
     * luz sigue encendida: «todavía no».
     */
    id: "seLevantan",
    cuando: (_l, e) => e.desdeQueSeDijo("impacientes") >= SE_OYEN_LAS_HEBILLAS,
    lineas: [ara("seLevantan"), ara("cinturonQuieto")],
  },
  {
    /*
     * **La luz del cinturón se apaga** cuando la apaga la comandante: con el
     * avión parado en su puesto y los motores ya apagados, que es cuando se
     * apaga en cualquier vuelo. Con su *ding*. Sin palabras: lo que se ve es
     * el cartel que se va, y lo pone el juego. Ver `luzApagadaEnElPuesto`.
     */
    id: "luz",
    cuando: (l, e) => l.tramo === "apagado" && l.enTramo >= APAGA_LA_LUZ && e.callaDesde >= 0.6,
    lineas: [],
  },
  {
    // Y ahora sí: Ara se suelta el cinturón, detrás del *ding*.
    id: "suelto",
    cuando: (_l, e) => e.desdeQueSeDijo("luz") >= TRAS_EL_DING,
    lineas: [ara("luzApagada")],
  },
  {
    /*
     * **La tripulante, ya de pie**, se acerca a Ara: le da las gracias por
     * esperar, le cuenta por qué —el avión podía frenar de golpe, y al abrir
     * los compartimentos de arriba se pueden caer cosas— y por qué al
     * aterrizar ponen cara seria: están trabajando, en la seguridad, y van
     * con el cinturón puesto hasta que el avión para; por eso lo recuerdan
     * por el altavoz. Antes no podía: iba en su asiento, atada. Y si lo que
     * sabe hacer no se contó bajando, se cuenta ahora: una vez.
     */
    id: "gracias",
    cuando: (_l, e) => e.callaDesde >= 1,
    lineas: [tripulante("gracias"), con(tripulante("maleteros"), "maletero"), tripulante("seria")],
    segun: (_l, e) => [
      tripulante("gracias"),
      con(tripulante("maleteros"), "maletero"),
      tripulante("seria"),
      ...(e.oficioContado ? [] : EL_OFICIO),
    ],
  },
  {
    id: "puesto",
    cuando: (l) => l.tramo === "apagado" && l.enTramo >= 1.5,
    lineas: [tripulante("adios"), ara("fin")],
  },
  { id: "fin", cuando: () => true, lineas: [] },
];

/**
 * **Las charlas**: lo que se cuenta cuando viene a cuento, en el orden en que
 * se prefieren. Unas son sucesos —el ruido del tren, el giro, las nubes otra
 * vez— y se dicen en cuanto se calla lo de antes; otras son explicaciones, y
 * esperan su rato de silencio y su tramo del vuelo: la comandante solo por
 * encima de los diez mil pies, y la tripulante solo por el pasillo, del
 * servicio a la cabina preparada. Los tramos, medidos en el banco con el
 * vuelo de verdad de Los Rodeos a La Palma, para que **ningún rato largo se
 * quede callado**. Ver `inicio-pasaje.test.ts`.
 */
export const CHARLAS_DEL_PASAJE: readonly DefCharla<MomentoDelPasaje, CharlaDelPasaje>[] = [
  {
    // El tren se guarda en cuanto se despega, con un golpe que se oye en el pasaje.
    id: "tren",
    tras: 0,
    cuando: (l, e) => e.dicho("volando") && !l.enTierra && (l.tren ?? 1) < 0.95,
    caduca: (l) => l.altura > 1500 || bajando(l.tramo),
    lineas: [ara("tren")],
  },
  {
    /*
     * **El gas de subida, cuando suena** (punto 297). A los mil quinientos
     * pies sobre el campo la tripulación pasa del gas de despegue al de
     * subida, y el ruido de los motores baja: es de lo que más asusta a quien
     * vuela por primera vez, «¿se ha parado?». Ara lo nota en el momento,
     * mirando el motor, y con lo que lo calma: que se sigue subiendo igual.
     * Por debajo de los diez mil pies nadie lo puede contar —la cabina de
     * mando, en lo suyo; la tripulante, sentada y atada—, así que el porqué
     * espera al primer rato tranquilo: ver `porQueMenosGas`.
     */
    id: "menosGas",
    tras: 1,
    cuando: (l) => l.tramo === "subida" && !l.enTierra && acabaDePonerse(l, "subida"),
    caduca: (l) => l.tramo !== "subida" || !acabaDePonerse(l, "subida"),
    lineas: [ara("menosGas")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    /*
     * **Dentro de la nube, el avión se menea** (punto 280), y se cuenta en el
     * momento en que pasa: el aire de dentro de la nube sube y baja, el avión
     * se mueve un poco y el ala sube y baja con él —se ve desde el asiento,
     * con la cara contra el cristal—. Ara lo nota, y la comandante lo cuenta
     * con calma para todo el pasaje: que es aire que sube y baja, que es
     * normal, que las alas están hechas para doblarse un poco y por eso se
     * mueven, y que por eso se lleva el cinturón. Por debajo de los diez mil
     * pies la cabina de mando solo habla del vuelo, y esto es del vuelo: lo
     * de los baches y el cinturón es de los pocos anuncios que una
     * comandante hace subiendo.
     *
     * Para muchos niños será el primer meneo de avión de su vida, y lo que
     * aprendan a sentir aquí se lo llevan puesto (AGENTS.md): es normal, y se
     * va tranquilo con el cinturón.
     */
    id: "meneo",
    tras: 0,
    cuando: (l) => volando(l) && l.enNube >= DENTRO_DE_LA_NUBE && (l.meneo ?? 0) >= SE_NOTA_EL_MENEO,
    caduca: (l) => l.enTierra || enLaFinal(l),
    lineas: [ara("meneo"), con(comandante("meneo"), "meneo"), con(ara("meneoBien"), "meneo")],
    mira: "ala",
    plano: "asomado-motor",
  },
  {
    id: "plop",
    tras: 2,
    cuando: (l) => !l.enTierra && l.tramo === "subida" && l.cabina >= SUBE_LA_CABINA && l.altura > 300,
    caduca: (l) => l.tramo !== "subida",
    lineas: [ara("plop")],
  },
  {
    /*
     * **El giro, por fuera**: se inclina el avión, y desde detrás se ve cómo.
     * Lo que dice Ara depende del lado: si baja el ala suya, apunta al suelo.
     */
    id: "giro",
    tras: 0,
    cuando: (l) => volando(l) && l.altura > 250 && Math.abs(l.alabeo ?? 0) > SE_NOTA_EL_GIRO,
    caduca: (l) => l.enTierra || enLaFinal(l) || l.faltaParaTocar < PREPARAR_LA_CABINA,
    lineas: [ara("giroAbajo"), ara("bici")],
    segun: (l, e) => [ara(e.bajaMiAla(l.alabeo ?? 0) ? "giroAbajo" : "giroArriba"), ara("bici")],
    plano: "fuera-giro",
  },
  {
    /*
     * **El porqué del gas de subida**, por la comandante y para todo el
     * pasaje, en cuanto puede hablar: pasados los diez mil pies. Es la misma
     * ley que la reversa explicada al llegar —lo que pasa en un momento de
     * trabajo se cuenta en el primer momento tranquilo de después—, y la
     * cuenta quien quitó el gas. Solo si Ara lo notó: sin eso, sobraría.
     */
    id: "porQueMenosGas",
    // Poco: es la respuesta a lo que Ara ya notó, y arriba el rato es justo —ver `puedeDormirse`—.
    tras: 2,
    cuando: (l, e) => volando(l) && !bajando(l.tramo) && l.altitud >= DIEZ_MIL_PIES && e.dichaLaCharla("menosGas"),
    caduca: (l) => l.enTierra || bajando(l.tramo),
    lineas: [desdeLaCabina(comandante("menosGas"))],
  },
  {
    // Por encima de las nubes, pegada al cristal: el mar, entre ellas.
    id: "marArriba",
    tras: 20,
    cuando: (l) =>
      volando(l) && !!l.sobreElMar && !!l.nubes && l.altitud > l.nubes.techo + 150 && e_noEnNube(l),
    caduca: (l) => bajando(l.tramo),
    lineas: [ara("marArriba")],
    segun: (_l, e) => [contraElCristal(ara("marArriba"), e)],
    plano: "asomado-abajo",
    // «Entre las nubes, allá abajo, se ve el mar»: por un hueco, o no se dice.
    nombra: "mar-abajo",
  },
  {
    /*
     * **Por encima del mar de nubes, lo que se ve es el mar de nubes.** Con
     * Anaga, La Orotava y el mar debajo de la capa, la subida se quedaba dos
     * minutos callada: lo que la llenaba era lo que no se veía. Lo de verdad
     * es lo que hay debajo, y tiene nombre: en Canarias, el mar de nubes.
     */
    id: "marDeNubes",
    // Ya muy arriba, más alto que el Teide, y con su rato: lo que se mira cuando no pasa nada.
    tras: 40,
    cuando: (l, e) =>
      volando(l) &&
      !!l.nubes &&
      l.altitud > Math.max(l.nubes.techo + 150, CUMBRE_DEL_TEIDE) &&
      e_noEnNube(l) &&
      e.dicho("nubes"),
    caduca: (l) => l.enTierra || (bajando(l.tramo) && !!l.nubes && l.altitud < l.nubes.techo + 150),
    lineas: [ara("marDeNubes")],
    segun: (_l, e) => [contraElCristal(ara("marDeNubes"), e)],
    plano: "asomado-abajo",
    nombra: "nubes-abajo",
  },
  {
    // Por encima de Tenerife, subiendo: las montañas y los barrancos.
    id: "sobreLaIsla",
    tras: 18,
    cuando: (l) => l.tramo === "subida" && !l.enTierra && l.sobreElMar === false && l.altura > 2500,
    caduca: (l) => l.tramo !== "subida",
    lineas: [ara("sobreLaIsla")],
    // «Se ven las montañas y los barrancos»: si no los tapa el mar de nubes.
    nombra: "tierra-abajo",
  },
  {
    /*
     * **Cómo se sostiene el avión**, por la comandante y para todos, con el ala
     * vista por fuera. Lo que se cuenta es lo de verdad: el ala inclinada
     * empuja el aire hacia abajo y el aire la empuja hacia arriba. Nada del
     * «camino más largo por arriba», que es falso (AGENTS.md, regla 4).
     */
    id: "ala",
    tras: 15,
    cuando: (l, e) => volando(l) && l.altitud >= DIEZ_MIL_PIES && e.dicho("nubesRespuesta"),
    caduca: (l) => l.enTierra || enLaFinal(l) || (bajando(l.tramo) && l.altitud < DIEZ_MIL_PIES),
    lineas: [ara("preguntaAla"), con(comandante("ala"), "ala"), con(ara("pandorga"), "ala")],
    mira: "ala",
    plano: "fuera-ala",
  },
  {
    /*
     * Más alto que el Teide y a más de quinientos por hora: solo cuando es
     * verdad.
     *
     * **Y el Teide, presentado la primera vez que se nombra** (punto 282). Un
     * niño de Paraguay no sabe qué es, y «más alto que la cumbre del Teide» no
     * le dice nada; lo que lo presentaba —lo que cuenta la comandante al
     * señalarlo— llegaba después, bajando. Así que si todavía no se ha
     * contado, la comandante lo cuenta antes: un volcán, la montaña más alta de
     * España, unos tres mil setecientos quince metros —ver
     * `docs/historias/fuentes.md`—. Y si se ve, se enseña con el avión por
     * fuera, que es como se entiende qué es volar por encima; Ara dice que
     * las montañas parecen de juguete solo si las está viendo.
     */
    id: "altoRapido",
    tras: 18,
    cuando: (l, e) =>
      volando(l) &&
      l.altitud > CUMBRE_DEL_TEIDE + 150 &&
      l.altitud >= DIEZ_MIL_PIES &&
      l.porElSuelo > QUINIENTOS_POR_HORA &&
      e.dicho("nubesRespuesta"),
    caduca: (l) => l.enTierra || enLaFinal(l) || (bajando(l.tramo) && l.altitud < CUMBRE_DEL_TEIDE + 150),
    lineas: [ara("preguntaAlto"), con(comandante("altoRapido"), "alto"), con(ara("altoRapido"), "alto")],
    segun: (l, e) => {
      const lineas: Linea[] = [ara("preguntaAlto")];
      if (!teidePresentado(e)) lineas.push(con(comandante("teide"), "alto"));
      lineas.push(con(comandante("altoRapido"), "alto"));
      if (e.seVe("hito:teide", l)) lineas.push(con(ara("altoRapido"), "alto"));
      return lineas;
    },
    muestra: "hito:teide",
  },
  {
    /*
     * **Para bajar no se apagan los motores**: por la comandante, arriba
     * todavía. Es el porqué del ralentí que Ara oyó al empezar a bajar —ver el
     * momento `bajada`—, así que si Ara lo notó va el primero en cuanto se
     * calla lo de los oídos, aunque se baje desde muy arriba; si no, con la
     * bajada ya empezada de verdad. Y solo con los motores al ralentí, que es
     * lo que cuenta.
     */
    id: "bajando",
    tras: 12,
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      l.altitud > DIEZ_MIL_PIES + 150 &&
      (l.altitud < 4800 || e.registro.some((d) => d.clave === "inicio.ara.pasaje.ralenti")) &&
      e.dicho("oidos") &&
      (l.potencia ?? "ralenti") === "ralenti",
    caduca: (l) => l.altitud < DIEZ_MIL_PIES + 100 || enLaFinal(l) || l.enTierra,
    lineas: [ara("preguntaBajar"), desdeLaCabina(comandante("bajando"))],
  },
  {
    /*
     * **Por qué ponen música al bajar.** La música de llegada empieza a los
     * diez mil pies —ver `audio/hilo-musical.ts`—, y Ara lo nota poco después
     * de que suene de verdad, con un rato sonando sola. Contesta la
     * tripulante, en persona, si está a mano: preparando la cabina pasa por
     * los asientos. Lo que se cuenta es lo que dicen las fuentes: que se pone
     * para que el rato sea tranquilo y calmar los nervios, y que muchas
     * compañías eligen música de su tierra, que da sentido del lugar. Que tape
     * ruidos que inquietan no lo dice ninguna, y no se dice. Ver
     * `docs/historias/fuentes.md`.
     */
    id: "musica",
    tras: 4,
    cuando: (l, e) =>
      !!l.musica &&
      e.musicaSuenaDesde >= SE_OYE_LA_MUSICA &&
      bajando(l.tramo) &&
      !l.enTierra &&
      tripulanteEnElPasillo(e) &&
      !cabinaPreparada(l, e),
    caduca: (l, e) => l.enTierra || !bajando(l.tramo) || cabinaPreparada(l, e),
    lineas: [ara("musica"), conLaTripulante(tripulante("musica"))],
  },
  {
    // El frío de fuera: solo si de verdad está bajo cero.
    id: "tcpFrio",
    tras: 14,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && (l.temperatura ?? 99) < FRIO_DE_CONGELADOR && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("frio"), "frio"), con(ara("frio"), "frio")],
  },
  {
    // El motor, con Ara contra el cristal para verlo mientras se lo cuentan.
    id: "tcpMotor",
    tras: 16,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.motor && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("motor1"), "motor"), con(tripulante("motor2"), "motor"), con(ara("secador"), "motor")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    // De dónde salieron las islas: volcanes desde el fondo del mar.
    id: "tcpIslas",
    tras: 16,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.islas && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("islas1"), "islas"), con(tripulante("islas2"), "islas"), con(ara("islas"), "islas")],
  },
  {
    // Desde tan alto, el mar parece quieto.
    id: "marQuieto",
    tras: 18,
    cuando: (l) =>
      l.tramo === "bajada" && !l.enTierra && !!l.sobreElMar && l.altitud > 2000 && l.faltaParaTocar < BAJANDO.marQuieto,
    caduca: (l) => l.enTierra || enLaFinal(l) || l.altitud < 1900,
    lineas: [ara("marQuieto")],
    plano: "asomado-abajo",
    nombra: "mar-abajo",
  },
  {
    // Cómo se sabe el camino: el mapa de la pantalla y la torre por radio.
    id: "tcpRuta",
    tras: 18,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.ruta && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("ruta"), "ruta"), con(ara("mapa"), "ruta")],
  },
  {
    // Bajando hacia el mar de nubes: cada vez más cerca.
    id: "nubesCerca",
    tras: 16,
    cuando: (l) =>
      l.tramo === "bajada" && !l.enTierra && !!l.nubes && l.altitud < 2800 && l.altitud > l.nubes.techo + 150,
    caduca: (l) => l.enTierra || enLaFinal(l) || (!!l.nubes && l.altitud < l.nubes.techo + 100),
    lineas: [ara("nubesCerca")],
  },
  {
    /*
     * **Y el silbo, también en otras islas** (punto 288): Ara, que se quedó
     * con ganas de aprender a silbar con la historia de La Gomera, pregunta
     * si solo se habla así allí, y la tripulante, que es de Canarias, se lo
     * cuenta en persona: también se silbaba en El Hierro, en Tenerife —de
     * donde se sale— y en Gran Canaria, y donde más se conserva hoy, y se
     * aprende en la escuela, es en La Gomera. En La Palma solo es «muy
     * probable», y no se dice. Las fuentes, en `docs/historias/fuentes.md`.
     *
     * Solo si Ara oyó la historia y contestó: sin ella, la pregunta no viene
     * de ningún sitio. Y **detrás de las islas** que cuenta la tripulante, que
     * es de lo que se está hablando, mientras ande por el pasillo. Detrás
     * también de las nubes que se acercan: lo que pasa se cuenta cuando pasa,
     * y esto puede esperar. Medido en el banco, se decía antes de las islas y
     * se comía las nubes de cerca.
     */
    id: "tcpSilbo",
    tras: 16,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && silboOido(e) && e.dichaLaCharla("tcpIslas") && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [ara("silboOtras"), conLaTripulante(tripulante("silbo"))],
  },
  {
    // Las cuatro luces al lado de la pista: lo que se va a ver al llegar.
    id: "tcpPapi",
    tras: 18,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.papi && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("papi"), "papi"), con(ara("papi"), "papi")],
  },
  {
    /*
     * **El baño, otra vez, ya bajando con la luz encendida** (punto 293). Si
     * Ara fue, la tripulante, que anda por el pasillo, lo recuerda: fue justo
     * a tiempo, que ahora ya no se levanta nadie hasta aterrizar. Y si no hubo
     * rato —la luz no se apagó, o se apagó sin crucero para ir y volver—, lo
     * verdadero es esperar, y Ara lo entiende sin drama: con la luz encendida,
     * a aterrizar, que falta poco. Ver `puedeIrAlBano`.
     */
    id: "bano",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      !l.enTierra &&
      e.dicho("revision") &&
      !luzApagada(l, e) &&
      (!e.fueAlBano || tripulanteEnElPasillo(e)) &&
      l.faltaParaTocar < BAJANDO.bano &&
      !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [ara("banoEspero")],
    segun: (_l, e) => [e.fueAlBano ? FUE_A_TIEMPO : ara("banoEspero")],
  },
  {
    /*
     * **Lo que hay arriba de todo en La Palma**: los telescopios del Roque de
     * los Muchachos, que miran las estrellas desde uno de los cielos más
     * limpios del mundo. Es adonde se va, y casi nadie lo sabe.
     */
    id: "tcpEstrellas",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.estrellas && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("estrellas"), "estrellas"), con(ara("estrellas"), "estrellas")],
  },
  {
    /*
     * **Lo que sabe hacer la tripulante** (punto 303): «la gente se cree que
     * son camareras, y saben hacer RCP en vuelo, atender urgencias, apagar un
     * fuego en cabina…» (Enrique). Se lo cuenta a Ara en el hueco tranquilo
     * de la bajada, con naturalidad y una vez. Ver `EL_OFICIO`.
     */
    id: "tcpOficio",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      !l.enTierra &&
      tripulanteEnElPasillo(e) &&
      !e.oficioContado &&
      l.faltaParaTocar < BAJANDO.oficio &&
      !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: EL_OFICIO,
  },
  {
    // Por debajo de las nubes, la isla de llegada ya cerca.
    id: "islaCerca",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" && !l.enTierra && l.faltaParaTocar < 38000 && l.altura < 1400 && e.dicho("isla"),
    caduca: (l) => l.enTierra || enLaFinal(l) || l.altura < 500,
    lineas: [ara("islaCerca")],
    /*
     * «Se ven las montañas, la costa y el mar»: se decía con la isla en la
     * ventanilla de al lado y por la de Ara solo mar (punto 286, captura
     * 229). Se dice cuando se ve, y si por la ventanilla no, con una toma de
     * fuera, que es lo que pidió Enrique.
     */
    nombra: "costa-de-llegada",
  },
  {
    // Bajando, otra vez por dentro de una nube: ahora ya se sabe qué es.
    id: "otraNube",
    tras: 0,
    cuando: (l, e) => bajando(l.tramo) && !l.enTierra && l.enNube >= DENTRO_DE_LA_NUBE && e.dicho("nubes"),
    caduca: (l) => l.enTierra,
    lineas: [ara("otraNube")],
  },
  {
    /*
     * **Y si la nube dura, se cuenta que dura**: bajando, la capa se cruza
     * despacio —un rato nivelado con la ventanilla blanca— y el avión se sigue
     * meneando. Lo de verdad es eso, dicho ya con calma: es normal, y el
     * cinturón va puesto. Lo que se aprende aquí se lo llevan puesto.
     */
    id: "sigueLaNube",
    tras: 30,
    cuando: (l, e) =>
      bajando(l.tramo) &&
      !l.enTierra &&
      l.enNube >= DENTRO_DE_LA_NUBE &&
      (l.meneo ?? 0) >= SE_NOTA_EL_MENEO &&
      e.dichaLaCharla("otraNube") &&
      e.dichaLaCharla("meneo"),
    caduca: (l) => l.enTierra || enLaFinal(l),
    lineas: [ara("sigueLaNube")],
    mira: "nubes",
  },
  {
    // Por debajo de las nubes, pegada al cristal: el mar, ya cerca.
    id: "marAbajo",
    tras: 14,
    cuando: (l) =>
      !l.enTierra && bajando(l.tramo) && !!l.sobreElMar && l.altura > 400 && (!l.nubes || l.altitud < l.nubes.base - 100),
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [ara("marAbajo")],
    plano: "asomado-abajo",
    nombra: "mar-abajo",
  },
  {
    // El giro a la final, también por fuera.
    id: "giroFinal",
    tras: 0,
    cuando: (l, e) =>
      !l.enTierra &&
      bajando(l.tramo) &&
      l.faltaParaTocar < PREPARAR_LA_CABINA &&
      l.altura > 250 &&
      Math.abs(l.alabeo ?? 0) > SE_NOTA_EL_GIRO &&
      e.dichaLaCharla("giro"),
    caduca: (l) => l.enTierra || l.altura < 250,
    lineas: [ara("giroFinal")],
    plano: "fuera-giro",
  },
  {
    /*
     * Antes de la final, el avión va frenando para sacar los flaps: se nota
     * en el asiento. De doscientos cincuenta nudos a ciento sesenta, medido
     * en el banco.
     */
    id: "despacio",
    tras: 14,
    cuando: (l) =>
      !l.enTierra &&
      l.tramo === "bajada" &&
      l.faltaParaTocar < 22000 &&
      l.porElSuelo < QUINIENTOS_POR_HORA * 0.68,
    caduca: (l) => l.enTierra || enLaFinal(l),
    lineas: [ara("masDespacio")],
  },
  {
    /*
     * El tren sale, con su ruido, para aterrizar. **Y se ve desde abajo**
     * (punto 298): una toma desde debajo del avión y un poco por delante,
     * mirando hacia arriba, con las patas bajando y trabadas. Desde el asiento
     * no se ve, y es lo que hace ese ruido.
     */
    id: "ruedas",
    tras: 0,
    cuando: (l) => !l.enTierra && enLaFinal(l) && (l.tren ?? 0) > 0.5 && l.altura > 150,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("ruedas")],
    plano: "fuera-tren",
  },
  {
    /*
     * **Y los motores que suben en la aproximación** (punto 297): con el tren
     * y los flaps fuera el avión frena mucho, y para seguir a su velocidad
     * por la senda hace falta más empuje. Suena justo después del tren, y Ara
     * lo nota cuando acaba de verse el tren —sin pisar el plano de las patas,
     * que dura lo suyo—. Lo cuenta la comandante al llegar, que en la final
     * nadie puede: ver el momento `llegada`.
     */
    id: "masGas",
    tras: 8,
    cuando: (l) => !l.enTierra && bajando(l.tramo) && l.altura > 150 && acabaDePonerse(l, "aproximacion"),
    caduca: (l) => l.enTierra || l.altura < 150 || !acabaDePonerse(l, "aproximacion"),
    lineas: [ara("masGas")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    id: "miro",
    tras: 12,
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 560 && l.altura > 330,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [ara("miro")],
  },
  {
    /*
     * **Lo que se reconoce al llegar** (punto 314). Enrique: lo mágico es ir
     * reconociendo lo de abajo cuando el avión ya casi toca tierra. Entrando
     * por el sur a la 36, la isla queda a la izquierda, del lado de Ara, y en
     * la ladera está Villa de Mazo: sus fincas, sus casas y los caminos que
     * suben. Ara lo cuenta **cuando de verdad se ve por su cristal**, con la
     * cara contra él mirando hacia allí, que es la toma que lo enseña: con el
     * relieve y la final del juego, a tres kilómetros del pueblo —a unos tres
     * del umbral y doscientos metros de altitud, con el pueblo cuarenta y
     * tantos grados por delante del través—, que a cuatro, en la captura del
     * banco, el pueblo era una franja oscura con puntitos. Y con tiempo de
     * acabar antes de que
     * se corte a la pista para ver tocar. El nombre no lo dice: en la
     * final no lo puede decir nadie, y lo dice la comandante en tierra —ver
     * `queEsMazo`—.
     *
     * Es el mejor rato para verlo, medido en el banco con la final del
     * juego: antes, el casco está más lejos y la ladera igual de rasante —a
     * unos seis grados de la visual—; donde más cerca pasa, por el través, a
     * dos kilómetros doscientos, ya se va a cien metros, la ladera queda a
     * cuatro grados y medio y se está encima de la toma.
     *
     * Y los caminitos que suben entre las fincas, que se ven desde que las
     * teselas se leen con filtro anisótropo —ver `ANISOTROPIA` en
     * `world/teselas-de-ortofoto.ts`—: casi rasante, la ladera era una
     * mancha. Van antes de la bici, que es por donde sube la gente.
     */
    id: "mazo",
    tras: 3,
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura > MAZO_EMPIEZA_POR_ENCIMA,
    caduca: (l) => l.enTierra || !enLaFinal(l) || l.altura < MAZO_YA_NO,
    lineas: [ara("mazo"), ara("mazoCaminos"), ara("mazoBici")],
    mira: "ventanilla",
    plano: "asomado-paisaje",
    nombra: "ladera-de-mazo",
  },
  {
    id: "cerquita",
    tras: 6,
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 300 && l.altura > 110 && !!l.sobreElMar,
    caduca: (l) => l.enTierra || l.altura < 100,
    lineas: [ara("cerquita")],
    nombra: "mar-abajo",
  },
  {
    /*
     * **Los aerofrenos al tocar, vistos desde el ala** (punto 296). Enrique:
     * cuando el avión saca los flaps, el tren o los aerofrenos, que se vea el
     * ala en ese momento. Los flaps y el tren ya se veían; faltaban los
     * paneles que se levantan sobre el ala en cuanto las ruedas tocan y
     * giran —en el JAZ 90 todos, los dos de dentro del motor, que son solo de
     * tierra, y los tres de fuera—. Es lo primero que se ve desde una
     * ventanilla de verdad al tocar.
     *
     * **Justo después del toque, y no antes**: la toma se sigue viendo desde
     * la orilla de la pista hasta que las ruedas tocan, y al empezar a subir
     * los paneles se corta al ala, con el fundido corto de este corte —ver
     * `fundidoDe` en `cameras/escena.ts`—, para que se los vea moverse. Sin
     * palabras: en la carrera no habla nadie, y lo que se ve lo cuenta Ara en
     * el primer rato tranquilo de después. Ver `aerofrenosPorque` y el
     * momento `toma`, que espera a que se hayan visto.
     */
    id: "aerofrenos",
    tras: 0,
    cuando: (l) => l.tramo === "frenando" && l.enTierra && (l.frenosDeTierra ?? 0) > 0 && l.enTramo < SE_VEN_SUBIR,
    caduca: (l) => l.tramo !== "frenando" || l.enTramo >= SE_VEN_SUBIR,
    lineas: [],
    mira: "ala",
    plano: "fuera-ala",
  },
  {
    /*
     * **Dando la vuelta en la pista** (punto 300), cuando de verdad gira: en
     * el ensanche de la punta, o ya de vuelta por la pista. Ara lo nota, y se
     * ve por fuera, desde un lado y en alto, que desde el asiento solo se ve
     * el suelo dar vueltas. No lo explica nadie todavía: la pista sigue
     * ocupada y la cabina de mando está en lo suyo, y la tripulante va en su
     * asiento. Ver `porQueLaVuelta`.
     */
    id: "vueltaEnPista",
    tras: 0,
    cuando: (l) => l.tramo === "al-puesto" && daLaVuelta(l),
    caduca: (l) => l.tramo !== "al-puesto" || fueraDeLaPista(l),
    lineas: [ara("vueltaEnPista")],
    plano: "fuera-raqueta",
  },
  {
    /*
     * **Y para qué se levantaron**, en el primer rato tranquilo de después:
     * acabada la megafonía de la llegada, rodando. Lo que pasa en un momento
     * de trabajo se explica en el primer momento tranquilo, como la reversa;
     * pero esto no lo cuenta la comandante —rodando por la pista, la cabina
     * de mando es estéril— ni la tripulante, que va sentada hasta el puesto.
     * Lo cuenta Ara, con lo que le enseñó su mamá, y solo si se vio: se
     * levantan para quitarle al ala la fuerza que sostiene, y así el peso va
     * a las ruedas y frenan bien. Es lo mismo que dice la instructora en los
     * vuelos de pilotar —ver `vuelo.salenLosFrenosDeTierra`—: las dos
     * explicaciones no se pueden contradecir.
     */
    id: "aerofrenosPorque",
    tras: 2,
    cuando: (l, e) =>
      (l.tramo === "al-puesto" || l.tramo === "aparcado") && e.dicho("llegada") && e.dichaLaCharla("aerofrenos"),
    caduca: (l) => l.tramo === "apagado" || (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO),
    lineas: [ara("golpecito"), ara("aerofrenos"), ara("aerofrenosPorque")],
    /*
     * **Y el golpecito, si lo hubo** (punto 299): una toma firme y en su sitio
     * es a propósito —la rueda agarra y gira enseguida, que es lo que esperan
     * los aerofrenos, y el avión no flota comiéndose la pista—. Solo si el
     * juego la dio por firme, que es en su sitio y de dos a diez pies por
     * segundo: con una toma suave o larga, decirlo sería mentir.
     */
    segun: (l) => [...(l.toque === "firme" ? [ara("golpecito")] : []), ara("aerofrenos"), ara("aerofrenosPorque")],
    planoSegun: (_l, e) => (e.planoDeAhora.endsWith("-paisaje") ? "ventanilla" : e.planoDeAhora),
  },
  {
    /*
     * **Y en cuanto se deja la pista, por qué** —el primer rato tranquilo de
     * la cabina de mando—: la comandante, para todo el pasaje, como la reversa
     * y el gas de la aproximación. Solo si de verdad se dio la vuelta. Con el
     * avión por fuera rodando a la terminal, o con el señalero si ya guía.
     */
    id: "porQueLaVuelta",
    tras: 2,
    cuando: (l, e) =>
      (l.tramo === "al-puesto" || l.tramo === "aparcado") && e.dichaLaCharla("vueltaEnPista") && fueraDeLaPista(l),
    // Y parados en el puesto ya no: ahí empieza lo de los cinturones, y no se pisa.
    caduca: (l) => l.tramo === "apagado" || (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO),
    lineas: LA_VUELTA_EXPLICADA,
    planoSegun: (_l, e) => (e.dichaLaCharla("senalero") ? "fuera-senalero" : "fuera-rodando"),
  },
  {
    /*
     * **Y el nombre del pueblo de la ladera**, en el primer rato tranquilo en
     * tierra: con la pista ya libre y, si hubo vuelta, detrás de su porqué.
     * Lo dice la comandante, para todo el pasaje, que en la final no podía
     * nadie —la cabina de mando, en lo suyo; la tripulante, sentada—. Solo si
     * Ara lo vio: lo que no se vio no se nombra. Sin cambiar lo que se está
     * viendo, que en el puesto es el señalero.
     */
    id: "queEsMazo",
    tras: 3,
    cuando: (l, e) =>
      (l.tramo === "al-puesto" || l.tramo === "aparcado") &&
      e.dichaLaCharla("mazo") &&
      e.dicho("llegada") &&
      fueraDeLaPista(l) &&
      (e.dichaLaCharla("porQueLaVuelta") || !e.dichaLaCharla("vueltaEnPista")),
    caduca: (l) => l.tramo === "apagado" || (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO),
    lineas: [comandante("mazo")],
    planoSegun: (_l, e) => (e.planoDeAhora.endsWith("-paisaje") ? "ventanilla" : e.planoDeAhora),
  },
  {
    /*
     * **El señalero, desde fuera** (punto 301): al llegar al puesto, el que
     * guía el avión con sus dos bastones —seguir, girar, despacio y parar,
     * con las señas del Anexo 2 de la OACI— hasta dejarlo en su sitio. Desde
     * el asiento no se ve, y enseña que alguien en tierra guía al avión. Sin
     * palabras: lo dicen los brazos, y la despedida lo devuelve a la
     * ventanilla. Ver `world/senalero.ts`.
     */
    id: "senalero",
    tras: 0,
    cuando: (l) => !!l.senalero && (l.tramo === "al-puesto" || l.tramo === "aparcado"),
    caduca: (l) => l.tramo === "apagado",
    lineas: [],
    plano: "fuera-senalero",
  },
  {
    id: "despacito",
    tras: 50,
    cuando: (l, e) => l.tramo === "al-puesto" && e.dicho("llegada"),
    caduca: (l) => l.tramo === "apagado",
    lineas: [ara("despacito")],
  },
  {
    id: "repaso",
    tras: 50,
    cuando: (l, e) => (l.tramo === "al-puesto" || l.tramo === "aparcado") && e.dicho("llegada"),
    caduca: (l) => l.tramo === "apagado",
    lineas: [ara("repaso")],
  },
];

/** Por encima de las nubes y fuera de ellas. */
function e_noEnNube(l: LecturaDelPasaje): boolean {
  return l.enNube < DENTRO_DE_LA_NUBE;
}

/**
 * **Lo que dice Ara de lo que se le señala**, si va por su lado: lo que se
 * dice viendo algo así por primera vez. Lo que no tiene frase suya se queda
 * en la de siempre.
 */
const LO_QUE_DICE_ARA: Readonly<Record<string, string>> = {
  teide: "teide",
  garajonay: "garajonay",
  orotava: "orotava",
};
const LO_VEO = ara("loVeo");
/**
 * **Lo que Ara contesta a la historia, no a lo que ve**: «¿hablar silbando?»
 * es al silbo gomero, que solo lo cuenta la historia. Sin historia oída, no se
 * contesta. Ver `decirLoSenalado`.
 */
const CONTESTA_A_LA_HISTORIA: ReadonlySet<string> = new Set(["garajonay"]);

/**
 * **Todas las frases nuevas de la escena**, una vez cada una: para la lista de
 * grabar y las pruebas. Los anuncios de siempre y lo de la ventanilla no
 * están: ya tienen su voz.
 */
export const LINEAS_DEL_PASAJE: readonly Linea[] = (() => {
  const todas: Linea[] = [];
  const poner = (l: Linea): void => {
    if (!esAnuncioDeSiempre(l.clave) && !todas.some((x) => x.clave === l.clave)) todas.push(l);
  };
  for (const m of GUION_DEL_PASAJE) m.lineas.forEach(poner);
  for (const k of Object.values(LO_QUE_DICE_ARA)) poner(ara(k));
  poner(LO_VEO);
  poner(ara("nubesAbajo"));
  for (const c of CHARLAS_DEL_PASAJE) c.lineas.forEach(poner);
  poner(ara("giroArriba"));
  // Y lo que va según lo que se ve y quién anda por el pasillo: el Teide, y bajo las nubes.
  poner(comandante("teide"));
  poner(ara("techo"));
  // Y el kit: lo que se dice en los juegos, y guardarlo para aterrizar. La luz verde, al final.
  LINEAS_DEL_KIT.filter((l) => !LINEAS_DE_LA_LUZ.includes(l)).forEach(poner);
  poner(tripulante(KIT_GUARDADO));
  // Y la siesta: el bostezo, la tripulante que despierta a Ara para bajar y el despertar.
  [SE_DUERME, LA_DESPIERTAN, SE_DESPIERTA].forEach(poner);
  // Y los motores que se oyen cambiar, y los oídos: el plop explicado, y al revés al bajar.
  [ara("ralenti"), ...EL_PLOP_EXPLICADO, ara("oidosAlReves"), comandante("masGas")].forEach(poner);
  // Y el baño con la luz apagada: la tripulante que viene a por Ara, Ara de vuelta y, bajando, a tiempo.
  [...AL_BANO, FUE_A_TIEMPO].forEach(poner);
  // Y la luz verde del kit (punto 304), al final: lo nuevo no renumera lo que ya está grabado.
  LINEAS_DE_LA_LUZ.forEach(poner);
  // Y la ventanilla viva (19-10-2026): la invitación y lo que Ara dice de lo que toca.
  LINEAS_DE_LA_VENTANILLA_VIVA.forEach(poner);
  // Y la gracia de la demostración (punto 294) y el silbo de otras islas (288), detrás de todo, por lo mismo.
  for (const f of FORMAS_CON_GRACIA)
    for (const clave of [GRACIA[f].entrada, GRACIA[f].despedida]) poner({ quien: "tripulacion", clave, megafonia: true });
  return todas;
})();

/**
 * **El guion de este vuelo**, de Los Rodeos a La Palma, como lo recibe el
 * motor del pasaje. Ver `GuionDelPasaje`.
 */
export const GUION_TENERIFE_LA_PALMA: GuionDelPasaje<MomentoDelPasaje, CharlaDelPasaje> = {
  lado: LADO_DE_ARA,
  momentos: GUION_DEL_PASAJE,
  charlas: CHARLAS_DEL_PASAJE,
  // Arriba: del cartel apagado, o de la comandante contando las nubes pasados los diez mil pies.
  seSenalaDesde: ["arriba", "nubesRespuesta"],
  tripulanteEnElPasillo,
  siesta: {
    seDuerme: SE_DUERME,
    seDespierta: SE_DESPIERTA,
    laDespiertan: LA_DESPIERTAN,
    puedenEsperar: PUEDEN_ESPERAR,
    trasAlDespertar: TRAS_AL_DESPERTAR,
    antesDeDormirse: SE_ENSENA_ANTES_DE_DORMIRSE,
  },
  senalado: {
    suyas: Object.fromEntries(Object.entries(LO_QUE_DICE_ARA).map(([que, clave]) => [que, ara(clave)])),
    loVeo: LO_VEO,
    contestaALaHistoria: CONTESTA_A_LA_HISTORIA,
  },
  sellosAlDecirlo: (id, lineas, seVe) => [
    ...(seVe ? (SELLO_AL_DECIRLO[id] ?? []) : []),
    // El mar de nubes visto desde arriba, que es como se dice al salir de ellas.
    ...(id === "nubes" && lineas.some((x) => x.clave === "inicio.ara.pasaje.nubesAbajo") ? (["nubes"] as const) : []),
  ],
  seQuedanHastaLaSiguiente: HASTA_LA_SIGUIENTE,
  elPlop: EL_PLOP_EXPLICADO,
  elOficio: EL_OFICIO,
  bano: { pedido: "revision", vuelta: AL_BANO[0]! },
  kit: { momento: "kit", llegaA: BAJANDO.kit, dado: tripulante(KIT_DADO).clave, guardado: tripulante(KIT_GUARDADO).clave },
};

/** Lo que mira el guion de este vuelo: el motor, con sus momentos y sus charlas. */
type EscenaDelPasaje = MotorDelPasaje<MomentoDelPasaje, CharlaDelPasaje>;
