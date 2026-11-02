/**
 * **El motor del modo pasaje**: lo que hace que se cuente un vuelo de pasaje
 * con Ara junto a la ventanilla —los turnos, los planos, la siesta, el modo
 * rápido ⏩, la ventanilla viva, el kit de viaje y el cuaderno—, sea el vuelo
 * que sea. Lo que se cuenta en cada vuelo, en qué orden y con qué frases, es
 * su guion, y el motor lo recibe como un dato: ver `GuionDelPasaje`.
 *
 * Se separó del guion del primer vuelo, de Los Rodeos a La Palma, para el
 * vuelo largo de Madrid a Asunción (T1, 1-11-2026), que es otro guion sobre el
 * mismo motor. Por eso el motor no sabe de qué vuelo se trata: de los momentos
 * de un guion solo conoce sus anclas —ver `AnclaDelPasaje`—, que son las de
 * cualquier vuelo de línea, y todo lo demás se lo da el guion. El de las islas
 * está en
 * `guion-tenerife-la-palma.ts`, y la escena que junta los dos, con el porqué
 * de todo, en `inicio-pasaje.ts`.
 */

import type { GenteDeLaCabina } from "../audio/gente-del-pasaje";
import { seLePasoElMomento } from "../audio/megafonia";
import { Conversacion, type FraseDicha, type Linea, type VozDelInicio } from "./conversacion";
import type { FormaDeLaDemostracion } from "./demostracion-con-gracia";
import { ConsolaDelAsiento, esDeUnCuento, lineaDelCuento, type EstadoDeLaConsola } from "./consola-del-asiento";
import { KitDeViaje, type EstadoDelKit } from "./kit-de-viaje";
import { DICHO_DE_LA_LUZ, JuegoDeLaLuz } from "./luz-verde";
import {
  LA_INVITACION,
  laminaDe,
  loQueSeDiceAlTocar,
  selloDe,
  type SelloDelViaje,
  type Tocable,
} from "./lo-que-se-toca";
import type { ComoSeVe } from "../world/se-ve-desde-el-pasaje";
import type { Fase } from "./vuelo";
import type { PermisosDeLaEscena, PotenciaDeLinea, TramoDeLinea } from "./vuelo-de-linea";

export type { ComoSeVe, SelloDelViaje, Tocable };

/** Diez mil pies, m: por debajo, la cabina de mando no habla de nada que no sea volar. */
export const DIEZ_MIL_PIES = 10000 * 0.3048;

/** Qué hay que mirar: el dibujo de la tarjeta. Ver `ui/inicio.ts`. */
export type QueMirar = "ventanilla" | "ala" | "motor" | "nubes" | "cinturon";

/**
 * **El plano**: desde dónde se ve el vuelo en cada momento.
 *
 * - `ventanilla`: desde el asiento de Ara, mirando como se mira.
 * - `asomado-*`: **Ara con la cara contra el cristal**, como hace cualquier
 *   criatura para ver más: los ojos se acercan a la ventanilla y miran hacia
 *   el motor o hacia abajo. Es un movimiento de la cabeza, no un corte. Ver
 *   `asientoDeAra`.
 * - `fuera-*`: **el avión por fuera**, lo que se está contando visto desde
 *   donde se ve mejor: rodando, desde el borde de la pista al despegar y al
 *   tocar, en el giro, una vuelta alrededor en crucero y el ala. Ver
 *   `cameras/escena.ts`.
 * - **Y lo que se nombra del paisaje, donde se vea** (18-10-2026): Ara con la
 *   cara contra el cristal mirando hacia ello —`asomado-paisaje`—, o el avión
 *   desde detrás con el sitio al fondo —`fuera-paisaje`—. Ver
 *   `SitioDelPaisaje`.
 * - **El tren desde abajo** —`fuera-tren`—, con las patas bajando y trabadas,
 *   y **el señalero** —`fuera-senalero`—, guiando el avión hasta pararlo:
 *   lo que desde el asiento no se ve y enseña qué pasa.
 * - **La vuelta en la punta de la pista** —`fuera-raqueta`—, desde un lado y
 *   en alto, quieta: el avión que gira en el ensanche del final y vuelve por
 *   la pista. Desde la ventanilla solo se ve el suelo dando vueltas.
 * - **Ara asomada al pasillo** —`pasillo`— (punto 312): cuando la demostración
 *   dice «busquen la más cercana», Ara hace lo que se pide y mira hacia la
 *   salida más cercana, que en su fila es la de delante: el letrero «EXIT»
 *   encendido encima de las puertas y las tiras del suelo que llevan a ellas.
 *   Es dentro, pero es otra toma —de la pared al pasillo—, así que va con su
 *   fundido. Ver `world/pasillo-de-pasaje.ts`.
 * - **Ara mirando su pantalla** —`respaldo`—, en el avión que la lleva: al frente y
 *   con la pantalla del respaldo de delante ocupando la vista. Otra pared, otro
 *   corte. Ver `world/cabina-333.ts`.
 */
export type Plano =
  | "ventanilla"
  | "asomado-motor"
  | "asomado-abajo"
  | "asomado-paisaje"
  | "pasillo"
  | "respaldo"
  | "fuera-rodando"
  | "fuera-despegue"
  | "fuera-giro"
  | "fuera-vuelta"
  | "fuera-ala"
  | "fuera-pista"
  | "fuera-paisaje"
  | "fuera-tren"
  | "fuera-senalero"
  | "fuera-raqueta";

/** Si el plano es del avión por fuera. */
export const esDeFuera = (p: Plano): boolean => p.startsWith("fuera-");

/** Si el plano mira hacia dentro de la cabina, y no por la ventanilla: el pasillo o la pantalla. */
export const esDeLaCabina = (p: Plano): boolean => p === "pasillo" || p === "respaldo";

/**
 * **Si pasar de un plano a otro es un corte**, con su fundido y su silencio:
 * de dentro a fuera, de fuera a dentro, de un sitio de fuera a otro, y de la
 * ventanilla al pasillo o a la pantalla, o al revés, que es mirar a otra pared. Asomarse al
 * cristal no lo es: es la cabeza que se acerca.
 */
export const esCorte = (de: Plano, a: Plano): boolean =>
  esDeFuera(de) || esDeFuera(a) || (de !== a && (esDeLaCabina(de) || esDeLaCabina(a)));

/**
 * **El silencio de un corte**, s de escena. Pasar de la ventanilla a fuera, o
 * de fuera a la ventanilla, es un corte de cámara: el juego lo hace con un
 * fundido corto —ver `FUNDIDO_DE_PLANO` en `cameras/escena.ts`—, y la escena
 * calla mientras tanto, que **un corte no cae nunca a media frase**. Lo que
 * venía detrás espera este rato. Asomarse a la ventanilla no es un corte: es
 * la cabeza que se mueve, y no espera.
 */
export const CORTE_DE_PLANO = 1.1;

/**
 * **Lo que dura un plano como poco**, s de escena desde que se pone. Lo de
 * fuera se queda a que se vea lo que se cuenta —la carrera entera hasta
 * despegar, una vuelta alrededor del avión—, y vuelve a la ventanilla en el
 * primer silencio después. Si antes llega algo que se dice desde la
 * ventanilla, manda eso.
 */
export const DURA_EL_PLANO: Readonly<Record<Plano, number>> = {
  ventanilla: 0,
  "asomado-motor": 5,
  "asomado-abajo": 5,
  "fuera-rodando": 16,
  "fuera-despegue": 32,
  "fuera-giro": 16,
  "fuera-vuelta": 36,
  "fuera-ala": 16,
  "fuera-pista": 24,
  "asomado-paisaje": 6,
  // El sitio al fondo, el rato de mirarlo; y el tren, hasta que se traba.
  "fuera-paisaje": 14,
  "fuera-tren": 12,
  // Y el señalero, hasta parar el avión: lo devuelve a la ventanilla la despedida.
  "fuera-senalero": 45,
  // La vuelta en la punta: el giro entero y el avión que echa a andar de vuelta.
  "fuera-raqueta": 22,
  // El pasillo, lo que dura la frase de las salidas y el rato de mirar el letrero.
  pasillo: 6,
  // La pantalla, un buen rato: es para mirarla.
  respaldo: 20,
};

/**
 * **Lo que se nombra del paisaje**, y que por eso **solo se dice si se ve**
 * (18-10-2026). Enrique encontró cinco veces en un vuelo la escena nombrando
 * lo que por la ventanilla de Ara no se veía: Anaga y La Orotava debajo del
 * mar de nubes, «esa isla redondita es La Gomera» con la ventanilla llena de
 * nubes, «¡ya se ve la isla adonde vamos!» con el avión metido en una nube y
 * «se ven las montañas, la costa y el mar» con la isla en la ventanilla de al
 * lado. Es la regla de `lo-que-se-nombra.ts` —solo se nombra lo que se ve, y
 * lo nombrado se señala—, llevada aquí:
 *
 * - `hito:<clave>`: lo que señala la comandante por la ventanilla —el Teide,
 *   La Gomera—. Ver `Senalado`.
 * - `isla-de-llegada`: las montañas de La Palma; y `costa-de-llegada`, su
 *   costa, ya cerca.
 * - `tierra-abajo` y `mar-abajo`: el suelo o el mar de debajo, por la
 *   ventanilla o con la cara pegada al cristal; y `nubes-abajo`, el mar de
 *   nubes, que también se tiene que ver para decirlo.
 * - `ladera-de-mazo`: la ladera de Villa de Mazo, con sus fincas, sus casas y
 *   sus caminos, en la final de la 36 (punto 314). **Solo por el cristal de
 *   Ara**: es lo que se reconoce desde el asiento al llegar, y no se enseña
 *   desde fuera. Ver `VILLA_DE_MAZO` y la charla `mazo`.
 * - `chaco-enfrente`: el Chaco de enfrente de Asunción, al otro lado del río, que
 *   es lo que se ve al llegar. El hito `chaco` está en Pozo Colorado y Filadelfia,
 *   a doscientos kilómetros de esta final. Ver `CHACO_ENFRENTE`. Y `rio-enfrente`,
 *   el río a la altura de la bahía: ver `RIO_ENFRENTE`.
 *
 * Si se ve lo dice el juego, que es quien tiene el mundo: ver `LecturaDelPasaje.ver`
 * y `world/se-ve-desde-el-pasaje.ts`.
 */
export type SitioDelPaisaje =
  | "isla-de-llegada"
  | "costa-de-llegada"
  | "ladera-de-mazo"
  | "chaco-enfrente"
  | "rio-enfrente"
  | "tierra-abajo"
  | "mar-abajo"
  | "nubes-abajo"
  | `hito:${string}`;

/**
 * **Cómo se ve un sitio ahora**: desde dónde se puede enseñar —por la
 * ventanilla de Ara, con su cara pegada al cristal mirando hacia él o con el
 * avión por fuera y el sitio al fondo— y por qué lado del avión cae, con el
 * rumbo de ahora. `como` es `null` si no se ve de ninguna manera: dentro de
 * una nube, con la nube o el monte entre medias, demasiado lejos o fuera de
 * todo cristal y de toda toma.
 */
export interface VistaDelSitio {
  readonly como: ComoSeVe | null;
  readonly lado: "izquierda" | "derecha" | null;
}

/** Lo que la escena necesita saber del vuelo. Todo en SI. */
export interface LecturaDelPasaje {
  /** Lo que va haciendo la tripulación, y desde cuándo. Ver `vuelo-de-linea.ts`. */
  readonly tramo: TramoDeLinea;
  readonly enTramo: number;
  readonly motor: boolean;
  readonly enTierra: boolean;
  readonly porElSuelo: number;
  /** De las ruedas al suelo, m. */
  readonly altura: number;
  readonly altitud: number;
  readonly vertical: number;
  /** Si la torre ya dio el permiso para entrar en la pista. */
  readonly autorizado: boolean;
  /** Dónde están los flaps, 0 a 1. */
  readonly flaps: number;
  /**
   * **Dónde están los aerofrenos de tierra**, 0 recogidos y 1 arriba del
   * todo: los paneles del ala que se levantan al tocar, **en el modelo que se
   * ve**. Sin esto —las pruebas que no los miran, o un avión que no los
   * dibuja—, no se enseñan: lo que no se ve subir no se señala. Ver la charla
   * `aerofrenos`.
   */
  readonly frenosDeTierra?: number;
  /**
   * **Cómo fue la toma**, el veredicto del juego: firme, suave, larga… Sin
   * esto —las pruebas que no lo dan—, no se dice nada de ella. Ver la charla
   * `aerofrenosPorque` y `Aterrizaje` en `aterrizaje.ts`.
   */
  readonly toque?: string | null;
  /** La capa de nubes de hoy, altitudes en m, o `null` sin capa. */
  readonly nubes: { readonly base: number; readonly techo: number } | null;
  /**
   * **Cuánto dentro de una nube va el avión**, 0 a 1: lo mismo que blanquea
   * la ventanilla. Ver `cuantoDentro` en `world/capa-de-nubes.ts`.
   */
  readonly enNube: number;
  /** Lo que sube o baja la cabina presurizada, m/s: lo que notan los oídos. */
  readonly cabina: number;
  /** Lo que falta por la ruta hasta tocar, m. */
  readonly faltaParaTocar: number;
  /** Si la tripulación ya está alineada en la pista, esperando para dar gas. */
  readonly alineado?: boolean;
  /**
   * **La fase del vuelo, la del juego**: la que decide si un anuncio de tierra
   * todavía vale o ya se le pasó el momento. Ver `seLePasoElMomento`.
   */
  readonly fase?: Fase;
  /** **El alabeo**, rad, positivo con el ala derecha abajo. Ver `bankAngleOf`. */
  readonly alabeo?: number;
  /** Dónde está el tren, 0 dentro y 1 fuera. */
  readonly tren?: number;
  /** Si debajo del avión hay mar. */
  readonly sobreElMar?: boolean;
  /** La temperatura de fuera, °C. Ver `temperaturaExterior`. */
  readonly temperatura?: number;
  /**
   * **Si un sitio del paisaje se ve ahora**, y cómo: lo pregunta la escena
   * antes de nombrarlo. Con `plano`, solo desde ese plano: lo que se mira
   * pegada al cristal hacia abajo se tiene que ver así. Sin esto —las pruebas
   * que no miran el paisaje—, todo se ve por la ventanilla y por su lado.
   * Ver `SitioDelPaisaje`.
   */
  readonly ver?: (sitio: SitioDelPaisaje, plano?: Plano) => VistaDelSitio;
  /**
   * **Cuánto se mueve el aire**, σ de la ráfaga vertical en m/s: lo que hace
   * que el avión se menee y el ala suba y baje. Ver `cuantoSeMueve` en
   * `turbulencia.ts`.
   */
  readonly meneo?: number;
  /** **La visibilidad del parte**, m: la de diez kilómetros o más es 10.000. */
  readonly visibilidad?: number;
  /** Si el señalero ya le hace señas al avión en el puesto de llegada. */
  readonly senalero?: boolean;
  /**
   * **Lo que falta para llegar arriba**, s de vuelo: hasta nivelar en la
   * altitud del plan, con la captura del automático. Lo cuenta el juego con
   * la ley de la tripulación —ver `segundosHastaElCrucero`—. Sin esto, Ara no
   * se duerme: sin saber cuándo llega lo siguiente, no se puede despertar a
   * Ara a tiempo. Ver `puedeDormirse`.
   */
  readonly hastaElCrucero?: number;
  /**
   * **Y lo que falta para empezar a bajar**, s de vuelo: hasta el punto de
   * descenso del plan, a la velocidad de ahora. Lo mismo: sin esto, no hay
   * siesta.
   */
  readonly hastaLaBajada?: number;
  /**
   * **La potencia de los motores**, la que se oye desde el asiento, y cuánto
   * lleva así, s: la pone la tripulación. Sin esto —las pruebas que no la
   * miran—, no se cuenta ningún cambio de gas: lo que no se sabe si sonó no se
   * cuenta. Ver `PotenciaDeLinea` en `vuelo-de-linea.ts`.
   */
  readonly potencia?: PotenciaDeLinea;
  readonly conEstaPotencia?: number;
  /**
   * **Dónde va el avión respecto a la pista de llegada**, en tierra: lo que se
   * aparta de su eje, m; lo que queda hasta su final en el sentido en que se
   * aterrizó, m; y cuánto se ha dado la vuelta respecto a ese sentido, rad, de
   * cero —hacia donde se aterrizó— a π —de vuelta por ella—. `null` en el
   * aire. Sin esto —las pruebas que no lo miran—, no se nota ninguna vuelta.
   * Ver `daLaVuelta`.
   */
  readonly enLaPista?: { readonly alEje: number; readonly hastaElFinal: number; readonly vuelta: number } | null;
  /**
   * **Si la luz del cinturón está encendida ahora**, la del cartel de la
   * cabina: la que manda para levantarse del asiento (punto 293). Sin esto
   * —las pruebas que no la miran—, lo que se ha dicho: apagada desde el «ya
   * estamos arriba» hasta el anuncio de la bajada. Ver `luzApagada`.
   */
  readonly cinturon?: boolean;
  /**
   * **Si suena ahora el hilo musical** por el altavoz del techo, de verdad: la
   * música de llegada que pone el juego —ver `audio/hilo-musical.ts`—, no la
   * que tocaría. Sin esto —las pruebas que no la miran—, no suena: lo que no
   * se sabe si sonó no se pregunta. Ver la charla `musica`.
   */
  readonly musica?: boolean;
  /**
   * **Si ahora hay algo que se puede tocar a la vista**, por el cristal de Ara:
   * lo que lleva el aro suave. Es lo que espera la invitación a tocar, que se
   * dice una vez. Sin esto —las pruebas que no lo miran—, no se invita. Ver
   * `flight/lo-que-se-toca.ts`.
   */
  readonly tocable?: boolean;
  /**
   * **El vuelo largo de hoy**: lo que cambia con la fecha, y que por eso lo saca
   * el juego de la cuenta y no lo escribe nadie en el guion. Sin esto —las pruebas
   * que no lo miran, y el vuelo corto—, el guion no dice nada del sol. Ver
   * `DelVueloLargo`.
   */
  readonly largo?: DelVueloLargo;
}

/**
 * **Lo que dice la cuenta del vuelo largo, hoy y ahora.** Ver
 * `flight/ruta-larga.ts`: de mayo a agosto se aterriza de noche cerrada, de
 * noviembre a marzo con el sol ya fuera, y el huso es de cuatro o de cinco horas.
 */
export interface DelVueloLargo {
  readonly temporada: "verano" | "invierno";
  /** Si cuando se abre la ventanilla ya ha salido el sol: el del desayuno por el cristal. */
  readonly conSolAlDesayunar: boolean;
  /** La altura del sol ahora, grados. */
  readonly sol: number;
  /** Si el sol cae ahora dentro del cristal de Ara, desde su asiento. */
  readonly solPorMiVentanilla: boolean;
  /** **Lo recorrido por la ortodrómica**, m: es por donde un guion sabe qué isla tiene debajo. */
  readonly recorrido: number;
  /** **Cuándo entra el tercer capítulo**, s desde el despegue: adónde salta la noche. */
  readonly entraLaLlegada: number;
  /**
   * **El anuncio de la bajada**, ya montado con la hora de allí, los minutos que
   * faltan y el parte de Pettirossi. Con una función porque se monta una vez y esto
   * se lee en cada paso. Ver `anuncioDeLaBajadaDelVueloLargo`.
   */
  anuncioDeLaBajada(): { readonly clave: string; readonly texto: string; readonly relleno: Readonly<Record<string, string>> };
}

/**
 * **Lo que se acaba de señalar por la ventanilla**, ya montado por el juego:
 * la frase de la comandante con su lado, y su historia detrás si la tiene.
 * Ver `loQueSeDice` y `laHistoria` en `audio/ventanilla.ts`.
 */
export interface Senalado {
  /** La clave del sitio: `teide`, `garajonay`… */
  readonly que: string;
  readonly lado: "izquierda" | "derecha";
  readonly dicho: { readonly texto: string; readonly clave: string; readonly relleno: Readonly<Record<string, string>> };
  /**
   * **Y la misma frase dicha desde cada lado**, si el juego la monta: entre
   * que se ve y que se dice el avión puede girar, y la comandante dice el lado
   * de cuando lo dice. «Asómense a las ventanillas de la izquierda» con el
   * sitio a la derecha es mandar a mirar a la nada. Ver `ladoDe` en
   * `world/se-ve-desde-el-pasaje.ts`.
   */
  readonly porLado?: Readonly<Record<"izquierda" | "derecha", Senalado["dicho"]>>;
  readonly historia: {
    readonly texto: string;
    readonly clave: string;
    readonly relleno: Readonly<Record<string, string>>;
    /** La clave de su ilustración, si la tiene: sale en la ventanita mientras se cuenta. */
    readonly sitio?: string;
  } | null;
}

// ── Los números ──────────────────────────────────────────────────────────

/**
 * **Lo que pide ir al baño y volver**, s de crucero por delante: si para
 * empezar a bajar queda menos, la tripulante no se lleva a Ara —la bajada
 * enciende la luz—, y se espera a aterrizar. El viaje se ve con el avión por
 * fuera, mientras suena el anuncio del servicio. Ver `puedeIrAlBano`.
 */
const LO_QUE_PIDE_EL_BANO = 25;
/**
 * **Cuánto arriba, nivelado, antes de apagar el cartel**, s. Poco: en un salto
 * entre islas el crucero dura unos minutos, y el servicio va detrás.
 */
export const ARRIBA_Y_NIVELADO = 2;
/**
 * **A cuánto del umbral se prepara la cabina para aterrizar**, m: por encima
 * de la final, como en `EN_APROXIMACION` de la megafonía.
 */
export const PREPARAR_LA_CABINA = 28000;
/**
 * **Cuánto dentro de una nube para decir que se está dentro**: un tercio,
 * que es cuando la ventanilla ya se ve blanca. Ver `cuantoDentro`.
 */
export const DENTRO_DE_LA_NUBE = 0.35;
/**
 * **Lo que puede tardar Ara en decir que los motores suenan distinto**, s de
 * escena desde que cambian. Si en ese rato no hay un silencio —habla otro, o
 * pasa otra cosa—, se le pasó el momento y no se dice: un «¡ahora suenan más
 * bajito!» medio minuto largo después ya no es lo que se oye. Ver
 * `PotenciaDeLinea`.
 */
const SE_OYE_EL_CAMBIO = 40;
/** Si la potencia de los motores acaba de cambiar a esa, y todavía se nota. */
export const acabaDePonerse = (l: LecturaDelPasaje, p: PotenciaDeLinea): boolean =>
  l.potencia === p && (l.conEstaPotencia ?? Infinity) < SE_OYE_EL_CAMBIO;
/**
 * **Lo que espera algo señalado a que se vea**, s de escena: el avión puede
 * meterse en una nube o girar entre que el juego lo ve y que la escena lo
 * puede decir. Pasado esto sin verse, se deja: nunca «esa isla» con la
 * ventanilla en blanco.
 */
const ESPERA_A_QUE_SE_VEA = 45;
/**
 * **Desde cuántos metros antes del sitio del kit esperan las charlas**: unos
 * cuarenta segundos de bajada, más que la charla más larga. Ver
 * `kitAPuntoDeLlegar`.
 */
const ANTES_DEL_KIT = 6000;

/**
 * **El silencio que espera lo del botón de la consola**, s: el de abrir la ventanilla,
 * el de después del anuncio. Más que lo que el anuncio espera, que va primero.
 */
const EL_BOTON_SE_EXPLICA_TRAS = 3;
/** **Lo que tarda en empezar un cuento tras un silencio**, s: más que lo que espera cualquier momento del guion. */
const CALLA_ANTES_DEL_CUENTO = 1.2;

/**
 * **Lo que tiene que sobrar por encima de los diez mil pies para traer el
 * kit**, m: mil seiscientos pies, que con el tramo nivelado de los 10.430 son
 * dos minutos largos de bajada. Por menos, la tripulante no lo trae para
 * pedirlo de vuelta enseguida. Ver el momento `kitRecoger`.
 */
export const KIT_POR_ENCIMA = 500;
/** Y la red del kit que se queda abierto bajando, m por debajo de los diez mil pies. */
const KIT_POR_DEBAJO = 300;
/**
 * **La siesta de Ara** (punto 304): los números. Ver `puedeDormirse`.
 *
 * - `CALLA_PARA_DORMIRSE`, s de silencio con nada a punto de contarse. Poco:
 *   Ara cierra los ojos en cuanto la comandante acaba lo de los diez mil pies,
 *   que el rato de dormir es lo que queda de subida y no da para esperar. Lo
 *   justo para que lo que se ve por la ventanilla —el Teide— se señale antes.
 * - `SIESTA_MINIMA`, s de vuelo durmiendo, como poco. Con un minuto y medio
 *   Enrique se despertó viendo lo mismo que al dormirse —«no movieste el vuelo
 *   nada»—: un salto que no se nota es peor que no dormirse. Por menos, Ara no
 *   se duerme, y para lo que queda está el modo rápido.
 * - `DESPIERTA_ANTES_DE_BAJAR`, s antes de empezar a bajar: si no hubo *ding*
 *   que despertara a Ara antes, la despierta la tripulante, que habla primero.
 * - `LO_QUE_DURA_EL_BOSTEZO`, s: lo que dice Ara antes de cerrar los ojos.
 * - `ESPERA_A_LO_QUE_SE_VE`, s de silencio: lo que se espera, antes de cerrar
 *   los ojos, a que la comandante señale lo que se tiene a la vista. Si no lo
 *   señala en ese rato, Ara se duerme igual.
 */
const CALLA_PARA_DORMIRSE = 5;
const SIESTA_MINIMA = 120;
const DESPIERTA_ANTES_DE_BAJAR = 22;
const LO_QUE_DURA_EL_BOSTEZO = 8;
const ESPERA_A_LO_QUE_SE_VE = 25;
/**
 * **El modo rápido** (⏩): los números. Ver `adelanto`.
 *
 * - `CORRE_SI_FALTAN`, s de vuelo hasta lo siguiente que hay que contar o
 *   ver: por menos no echa a correr, que no hay rato que ahorrar y un
 *   acelerón de un segundo es un tirón, no un viaje rápido.
 * - `PARA_ANTES`, s de vuelo: se para solo cuando lo siguiente está a esto,
 *   para llegar a ello a la velocidad de siempre y verlo venir.
 * - `CALLA_PARA_ADELANTAR`, s de silencio antes de volver a correr: lo que se
 *   acaba de decir se deja asentar.
 * - `MIRA_HASTA`, s de vuelo: lo más lejos que se mira lo que viene. Más allá,
 *   todo es «un rato largo».
 * - `MIRA_CADA`, s de escena: cada cuánto se vuelve a mirar.
 * - `RATOS`, cuántos ratos corriendo se guardan para el banco y las pruebas.
 */
export const ADELANTO = {
  CORRE_SI_FALTAN: 12,
  PARA_ANTES: 6,
  CALLA_PARA_ADELANTAR: 3,
  MIRA_HASTA: 180,
  MIRA_CADA: 0.5,
  RATOS: 200,
} as const;
/**
 * **Dónde empieza la llegada**, m de altitud bajando: los diez mil pies, que
 * es donde empieza la música de llegada —ver `BAJANDO_A_LA_PISTA` en
 * `audio/hilo-musical.ts`—, la bajada se hace aproximación y, poco después,
 * se prepara la cabina. Desde ahí el modo rápido se apaga solo y no vuelve
 * en ese vuelo (Enrique: «hay que vivir la bajada y la aproximación, ese
 * momento es mágico, cuando está llegando a tierra»).
 */
export const EMPIEZA_LA_LLEGADA = DIEZ_MIL_PIES;
/** Si el vuelo ya va en la llegada: bajando por debajo de los diez mil pies, o ya preparando la cabina. */
const enLaLlegada = (l: LecturaDelPasaje, e: MotorDelPasaje): boolean =>
  (bajando(l.tramo) && l.altitud < EMPIEZA_LA_LLEGADA) || (bajando(l.tramo) && cabinaPreparada(l, e));
/** Los ratos por delante en los que se mira qué viene, s de vuelo. */
const PASOS_DE_MIRAR = [2, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 105, 120, 150, 180] as const;
/**
 * **Lo que baja la cabina en la bajada, de cuenta**, m/s: el tope del control,
 * trescientos cincuenta pies por minuto, que es lo que hace en cuanto el
 * avión empieza a bajar. Ver `BAJA_LA_CABINA` en `cabina-presurizada.ts`.
 */
const LA_CABINA_BAJANDO = -1.78;
/** Lo que enfría el aire al subir, °C por metro: la atmósfera tipo. */
const ENFRIA_AL_SUBIR = 0.0065;
/** Lo que se queda el dibujo de la ventanita después de la última frase, s. */
const SE_QUEDA_LA_VENTANITA = 2.5;
/**
 * **La ventanilla viva** (19-10-2026): los números. Ver `tocar` y
 * `flight/lo-que-se-toca.ts`.
 *
 * - `ESPERA_EL_TOQUE`, s de escena: lo que espera un toque a que se calle
 *   quien habla. Un toque no pisa a nadie, pero tampoco se contesta medio
 *   minuto después, cuando ya se está mirando otra cosa: pasado esto, se
 *   queda en su aro, sin voz.
 * - `CALLA_ANTES_DEL_TOQUE`, s de silencio antes de contestar: lo justo para
 *   que no suene pegado a lo de antes.
 * - `SIGUE_A_LA_VISTA`, s: lo que se fía de que se sigue viendo lo que se
 *   tocó; si ha esperado más, se vuelve a mirar antes de decirlo, que en ese
 *   rato el avión puede meterse en una nube.
 * - `INVITA_TRAS`, s de silencio con algo que tocar a la vista: lo que espera
 *   la invitación, que se dice una vez.
 */
const ESPERA_EL_TOQUE = 6;
const CALLA_ANTES_DEL_TOQUE = 0.4;
const SIGUE_A_LA_VISTA = 1.5;
const INVITA_TRAS = 3;
/** Lo que se queda la lámina de un toque sin voz, s: el rato de lo señalado. */
const LAMINA_DEL_TOQUE = 6;

/**
 * **Y la red de la espera**, s de reloj de pared: si «sentados para el
 * despegue» no se ha oído en este rato —una boca que se quedó colgada—, se
 * entra igual. Lo primero es no dejar a nadie parado en la doble raya para
 * siempre. De pared y no de vuelo, porque lo que se espera es una voz: medida
 * con el reloj del vuelo, con el del juego acelerado doce veces se cumplía a
 * los seis segundos, y la tripulación entraba en la pista antes de que sonara
 * el anuncio. Medido en el banco con las tomas grabadas.
 *
 * **Y cuenta desde que se pide**, no desde que se llega a la doble raya: con
 * la demostración de seguridad, la tripulación puede llegar a la espera con
 * la cabina todavía enseñando las máscaras, y entonces espera —como en un
 * avión de verdad, que no entra en pista sin la cabina lista—.
 */
export const RED_DE_LA_ESPERA = 75;

/**
 * **Y la de un anuncio que espera su fase**, s de pared: si la fase del juego
 * no llega a la de un anuncio en este rato, se pide igual —y la boca lo
 * tirará—. La escena no se queda parada esperando una fase que no viene.
 */
export const RED_DEL_ANUNCIO = 15;

/**
 * **Y la de la cabecera**, s de pared: alineados, lo que espera la tripulación
 * a que Ara acabe lo que está diciendo antes de dar gas, como mucho. Ver
 * `PermisosDeLaEscena.despegar`.
 */
export const RED_DE_LA_CABECERA = 20;

/** Si una frase es de un juego del kit, que se calla con él. */
const esDelKit = (l: Linea): boolean => l.clave.startsWith("inicio.ara.pasaje.kit.");
/**
 * **Si el cartel del cinturón está apagado**, por lo que se ha dicho: lo apaga
 * la comandante al llegar arriba —«pueden soltarse el cinturón»— y se enciende
 * al empezar a bajar. Ara de rodillas en el asiento, con la cara contra el
 * cristal, solo sale entonces: con el cartel encendido el cinturón va puesto
 * y bien abrochado, y un dibujo no enseña lo contrario.
 */
export const cartelApagado = (e: MotorDelPasaje): boolean => e.dicho("arriba") && !e.dicho("bajada");
/**
 * **Si la luz del cinturón está apagada ahora**: la del cartel, si el juego la
 * da; si no, la de lo que se ha dicho. Es la que manda para levantarse.
 */
export const luzApagada = (l: LecturaDelPasaje, e: MotorDelPasaje): boolean =>
  l.cinturon === undefined ? cartelApagado(e) : !l.cinturon;
/** Si una clave es de un anuncio de la megafonía de siempre. */
export function esAnuncioDeSiempre(clave: string): boolean {
  return clave.startsWith("comandante.") || clave.startsWith("tripulacion.");
}

/** Si una frase es de la tripulante en persona, sin altavoz. */
export function esDeCerca(l: Linea): boolean {
  return l.quien === "tripulacion" && !l.megafonia;
}

// ── Lo que el motor le pide a un guion ───────────────────────────────────

/**
 * **Un momento del guion**: lo que se dice, cuándo toca y desde dónde se ve.
 * `Id` es el suyo; `M` y `C`, los momentos y las charlas del guion entero, que
 * son los que puede mirar en el vuelo. Lo que mira el vuelo va con forma de
 * método y no de propiedad a propósito: así un guion con sus ids cabe donde se
 * pide uno cualquiera, que es lo que hace el motor con sus ayudantes.
 */
export interface DefMomento<Id extends string = string, M extends string = string, C extends string = string> {
  readonly id: Id;
  /** Cuándo toca: lo que pasa en el avión, y lo que ya se dijo. */
  cuando(l: LecturaDelPasaje, e: MotorDelPasaje<M, C>): boolean;
  /** Y cuándo ya no viene a cuento: se salta sin decirlo. */
  caduca?(l: LecturaDelPasaje, e: MotorDelPasaje<M, C>): boolean;
  readonly lineas: readonly Linea[];
  /** Y si lo que se dice depende de lo que pasa: las nubes, por dentro o desde arriba. */
  segun?(l: LecturaDelPasaje, e: MotorDelPasaje<M, C>): readonly Linea[];
  /** Qué se dibuja para mirar mientras se dice. */
  readonly mira?: QueMirar;
  /** **Desde dónde se ve mientras se dice.** Sin decir, la ventanilla. */
  readonly plano?: Plano;
  /**
   * **Y si depende de lo que se está viendo**: la comandante que explica algo
   * con el señalero ya guiando el avión no lo quita de la pantalla.
   */
  planoSegun?(l: LecturaDelPasaje, e: MotorDelPasaje<M, C>): Plano;
  /**
   * **Lo que nombra del paisaje**: solo se dice si se ve, y desde donde se
   * vea —la ventanilla, la cara contra el cristal o el avión por fuera con el
   * sitio al fondo—; si no se ve, espera, y si se le pasa el momento, se salta.
   * Con un `plano` propio, se tiene que ver desde ese. Ver `SitioDelPaisaje`.
   */
  readonly nombra?: SitioDelPaisaje;
  /**
   * **Lo que enseña si se ve**, sin esperarlo: lo que se dice vale igual sin
   * verlo —«más alto que la cumbre del Teide» es verdad con el Teide tapado—,
   * pero si se ve, se enseña.
   */
  readonly muestra?: SitioDelPaisaje;
  /**
   * **Si sigue el anuncio de otro momento**: la demostración va en tres trozos
   * para cambiar de plano entre ellos —ver `DEMOSTRACION`—, y es un solo
   * anuncio: lo que sigue no vuelve a saludar al pasaje.
   */
  readonly sigue?: M;
  /**
   * **Si va pegado a lo de antes**: mientras espera su momento no se cuenta
   * nada más —ni lo señalado, ni lo tocado, ni las charlas—. Es el servicio
   * de un salto entre islas, pegado al cartel apagado: el crucero dura un
   * minuto, y una historia en medio se lo comía.
   */
  readonly pegado?: boolean;
  /**
   * **La lámina a pantalla completa con la que se dice**, o `null` para quitarla.
   * Sin decir, se queda la que hubiera. Es para lo que se cuenta sin que se vea el
   * mundo: un capítulo que abre sobre un sitio que el juego no tiene dibujado. Ver
   * `GuionDelPasaje.apertura` y `ui/lamina-grande.ts`.
   */
  readonly tapa?: string | null;
  /** **Y si depende de la fecha**: el huso, y el amanecer de la ventanilla. */
  tapaSegun?(l: LecturaDelPasaje, e: MotorDelPasaje<M, C>): string | null;
  /** **Si esa lámina sale a oscuras y se va encendiendo**: la luz de la cabina que sube. */
  readonly enciende?: boolean;
}

/**
 * **Una charla**: lo que se cuenta si viene a cuento. No va en el guion fijo,
 * así que no espera a nada ni nada la espera: se dice en un silencio de
 * `tras` segundos como poco, si en ese momento vale, y si su rato pasa sin
 * decirse, no pasa nada.
 */
export interface DefCharla<M extends string = string, C extends string = string> extends DefMomento<C, M, C> {
  /** Cuánto silencio antes, s: lo que suena a sucedido va enseguida; lo explicado, con aire. */
  readonly tras: number;
}

/**
 * **Las anclas**: los momentos de los que el motor cuelga lo suyo, y que por
 * eso todo guion lleva con estos nombres. Son los huesos de cualquier vuelo de
 * línea, no los de uno: las puertas y los motores, que dan permiso para
 * arrancar y rodar; «sentados para el despegue», que lo da para entrar en
 * pista; el «ya estamos arriba» con su *ding*, que apaga el cartel y despierta
 * a quien duerme; el anuncio de la bajada, que lo vuelve a encender; la
 * cabina preparada, desde la que ya no se señala nada; en el puesto, los
 * impacientes y la luz apagada; y el final, que es siempre el último.
 */
export type AnclaDelPasaje =
  | "puertas"
  | "motores"
  | "despegue"
  | "arriba"
  | "bajada"
  | "aproximacion"
  | "impacientes"
  | "luz"
  | "fin";

/**
 * **El guion de un vuelo de pasaje** (T1 del largo radio, 1-11-2026): lo que
 * se cuenta en ese vuelo, en qué orden y con qué frases. El motor —los
 * turnos, los planos, la siesta, el ⏩, la ventanilla viva, el kit y el
 * cuaderno— es el mismo para cualquier vuelo; lo que cambia de uno a otro va
 * aquí. `M` son los momentos del guion y `C`, sus charlas: con ellos, un guion
 * no puede preguntar por un momento que no tiene.
 */
export interface GuionDelPasaje<M extends string = string, C extends string = string> {
  /** El lado de la ventanilla de Ara: el de lo que se cuenta. */
  readonly lado: "izquierda" | "derecha";
  /** **Los momentos**, en el orden en que pasa el vuelo, con las anclas entre ellos y `fin` el último. */
  readonly momentos: readonly DefMomento<M, M, C>[];
  /** **Las charlas**: lo que se cuenta cuando viene a cuento, en el orden en que se prefieren. */
  readonly charlas: readonly DefCharla<M, C>[];
  /** Desde qué momentos se puede señalar algo por la ventanilla: el primero que se diga abre. */
  readonly seSenalaDesde: readonly M[];
  /** Si la tripulante ya anda por el pasillo: entonces viene a lo que toca Ara. */
  tripulanteEnElPasillo(e: MotorDelPasaje<M, C>): boolean;
  /**
   * **La siesta**: lo que dice Ara al cerrar los ojos y al abrirlos, la
   * tripulante que despierta a Ara para bajar, lo que puede esperar a que se
   * despierte —y con cuánto silencio, al despertar— y lo que se tiene que
   * haber señalado, si se ve, antes de dormirse. Ver `puedeDormirse`.
   */
  readonly siesta: {
    readonly seDuerme: Linea;
    readonly seDespierta: Linea;
    readonly laDespiertan: Linea;
    readonly puedenEsperar: ReadonlySet<C>;
    readonly trasAlDespertar: Readonly<Partial<Record<C, number>>>;
    readonly antesDeDormirse: readonly string[];
    /**
     * **Si esta siesta salta**, y adónde: los segundos de vuelo del siguiente
     * momento que se vive. Es la escena quien decide si bajo tapa el vuelo corre
     * o salta (ADR 0023): sin esto corre a dieciséis veces, que es lo de un
     * vuelo corto, y con `null` tampoco salta. Ver `saltoPedido`.
     */
    salto?(e: MotorDelPasaje<M, C>, l: LecturaDelPasaje): number | null;
    /**
     * **Si del salto se cae en el capítulo siguiente**: lo de después del corte ya no
     * es de este guion. Ara no se despierta con su frase de aquí, sino con lo que abra
     * el de allí. Lo monta el juego: ver `atenderAlSalto` en `game.ts`.
     */
    readonly sigueOtroCapitulo?: boolean;
    /**
     * **Si en este guion Ara no se duerme**: entra recién despierta, y lo que
     * queda por delante es bajar, que no se hace durmiendo. Ver `puedeDormirse`.
     */
    readonly sinSiesta?: boolean;
  };
  /**
   * **Lo que contesta Ara a lo señalado**, si va por su lado: su frase para
   * cada sitio, la de siempre para lo demás, y los sitios en los que contesta
   * a la historia y no a lo que ve. Ver `decirLoSenalado`.
   */
  readonly senalado: {
    readonly suyas: Readonly<Record<string, Linea>>;
    readonly loVeo: Linea;
    readonly contestaALaHistoria: ReadonlySet<string>;
  };
  /** Los sellos del cuaderno de viaje que da lo que se dice; `seVe`, si lo que nombra se ve. */
  sellosAlDecirlo(id: string, lineas: readonly Linea[], seVe: boolean): readonly SelloDelViaje[];
  /** Los dibujos de la ventanita que se quedan hasta la frase siguiente, no solo un poco. */
  readonly seQuedanHastaLaSiguiente: ReadonlySet<string>;
  /** **El plop de los oídos, explicado**: lo que queda de él se aparta para el anuncio de la bajada. */
  readonly elPlop: readonly Linea[];
  /** **Lo que sabe hacer la tripulante**: se cuenta una vez. Ver `oficioContado`. */
  readonly elOficio: readonly Linea[];
  /** **El baño**: el momento en que se pide y la frase con la que se va. Sin él, no se va. */
  readonly bano: { readonly pedido: M; readonly vuelta: Linea } | null;
  /**
   * **El kit de viaje**: el momento en que llega, a cuántos metros de tocar,
   * y las claves de la tripulante que lo da y que lo pide guardar. Sin él, no
   * hay kit.
   */
  readonly kit: { readonly momento: M; readonly llegaA: number; readonly dado: string; readonly guardado: string } | null;
  /**
   * **Lo que se cuenta antes de ver el mundo**, bajo láminas: hasta qué momento dura,
   * y las láminas que va a pedir, para tenerlas bajadas antes de que hagan falta. El
   * vuelo arranca tapado, sin que el mundo asome ni un fotograma; mientras dura, no
   * se adelanta, no se señala y no se toca nada, porque no se ve. Sin esto, se abre
   * con el mundo a la vista, que es lo de todos los demás vuelos.
   */
  readonly apertura?: { readonly hasta: M; readonly laminas: readonly string[] };
  /**
   * **La consola de la pantalla del asiento**, si en este vuelo se ofrece, en el
   * avión que la lleva: desde qué momento, y las tres frases que la cuentan: el botón
   * que aparece, lo que hay dentro y por qué se recoge. Sin esto, no sale. Ver
   * `consola-del-asiento.ts` y `OpcionesDelPasaje.conPantalla`.
   */
  readonly consola?: {
    readonly desde: M;
    readonly elBoton: Linea;
    readonly loQueHay: Linea;
    readonly seRecoge: Linea;
  };
}

/** **La tapa de antes de la primera lámina**: la pantalla a oscuras, sin dibujo. */
export const TAPA_A_OSCURAS = "a-oscuras";

export const enElSuelo = (t: TramoDeLinea): boolean =>
  t === "puerta" ||
  t === "arrancando" ||
  t === "rodando" ||
  t === "esperando" ||
  t === "entrando" ||
  t === "carrera";
export const bajando = (t: TramoDeLinea): boolean =>
  t === "bajada" || t === "final" || t === "recogida" || t === "frenando" || t === "al-puesto" || t === "aparcado" || t === "apagado";
export const volando = (l: LecturaDelPasaje): boolean =>
  !l.enTierra && (l.tramo === "subida" || l.tramo === "crucero" || l.tramo === "bajada");
export const enLaFinal = (l: LecturaDelPasaje): boolean => l.tramo === "final" || l.tramo === "recogida";
/** Si ya no se puede ir por el pasillo: la cabina preparada para aterrizar. */
export const cabinaPreparada = (l: LecturaDelPasaje, e: MotorDelPasaje): boolean =>
  l.enTierra || enLaFinal(l) || l.faltaParaTocar < PREPARAR_LA_CABINA || e.dicho("aproximacion");
// ── La secuencia ─────────────────────────────────────────────────────────

/** Un cambio de plano, con su hora de escena. */
export interface CambioDePlano {
  readonly plano: Plano;
  readonly desde: number;
  /** Y el sitio del paisaje que se enseña, en los planos que lo buscan. */
  readonly sitio?: SitioDelPaisaje;
}

/**
 * **Lo nombrado del paisaje, y cómo se veía al nombrarlo**: para el banco,
 * que comprueba con la imagen que se ve lo que se dice, y para las pruebas.
 */
export interface Nombrado {
  readonly sitio: SitioDelPaisaje;
  /** La clave de la primera frase que lo nombra. */
  readonly clave: string;
  readonly como: ComoSeVe;
  readonly lado: "izquierda" | "derecha" | null;
  /** Segundos de escena. */
  readonly desde: number;
}

/**
 * **Un toque en la ventanilla**, ya visto por el juego —lo que no se ve no
 * llega a la escena—: qué se tocó, cuándo, lo que se dijo y, si no se dijo
 * nada, por qué. Para el banco y las pruebas.
 *
 * - `ocupado`: hablaba alguien y el toque se quedó en su aro.
 * - `contado`: ya se había contado, y se enseña su lámina sin voz.
 * - `dormida`: Ara tiene los ojos cerrados.
 * - `sinVer`: esperó su turno y, cuando le tocó, ya no se veía.
 */
export interface Toque {
  readonly que: Tocable;
  readonly desde: number;
  readonly dijo: readonly string[];
  readonly calla: "ocupado" | "contado" | "dormida" | "sinVer" | null;
}

/** Si un sitio es de lo de debajo del avión: se mira hacia abajo, no hacia él. */
export const esDeAbajo = (sitio: SitioDelPaisaje): boolean =>
  sitio === "tierra-abajo" || sitio === "mar-abajo" || sitio === "nubes-abajo";

/**
 * **El plano con el que se enseña un sitio**, según desde dónde se vea: la
 * ventanilla, la cara contra el cristal —mirando hacia él, o hacia abajo si es
 * lo de debajo— o el avión por fuera con el sitio al fondo.
 */
export function planoParaVer(como: ComoSeVe, sitio: SitioDelPaisaje): Plano {
  if (como === "ventanilla") return "ventanilla";
  if (como === "asomado") return esDeAbajo(sitio) ? "asomado-abajo" : "asomado-paisaje";
  return "fuera-paisaje";
}

/** Lo que la escena deja ver: para el dibujo, la cámara, el banco y las pruebas. */
export interface EstadoDelPasaje<M extends string = string, C extends string = string> {
  readonly momento: M;
  /** Qué se dibuja para mirar, o `null`. */
  readonly mira: QueMirar | null;
  /** La última frase pedida: el subtítulo. */
  readonly linea: Linea | null;
  readonly hablando: boolean;
  readonly puedeSeguir: boolean;
  readonly terminado: boolean;
  /** Segundos de escena. */
  readonly segundos: number;
  /** Los momentos dichos, en orden, y los que se saltaron por pasarse. */
  readonly dichos: readonly M[];
  readonly saltados: readonly M[];
  /** Las charlas dichas, en orden. */
  readonly charlas: readonly C[];
  /** Lo señalado por la ventanilla, por su clave. */
  readonly senalados: readonly string[];
  /** **El plano de ahora**, y desde cuándo. Ver `Plano`. */
  readonly plano: Plano;
  readonly planoDesde: number;
  /** Todos los cambios de plano, en orden: el primero es la ventanilla. */
  readonly planos: readonly CambioDePlano[];
  /**
   * **El sitio del paisaje que se está enseñando**, en los planos que lo
   * buscan —`asomado-paisaje` y `fuera-paisaje`—; si no, `null`. Es adonde
   * mira la cámara. Ver `SitioDelPaisaje`.
   */
  readonly paisaje: SitioDelPaisaje | null;
  /** Lo nombrado del paisaje, y cómo se veía cuando se nombró. Ver `Nombrado`. */
  readonly nombrados: readonly Nombrado[];
  /** **El dibujo de la ventanita** de ahora, o `null`. */
  readonly dibujo: string | null;
  /** Si lo que suena ahora es la megafonía. Ver `megafoniaSuena`. */
  readonly megafonia: boolean;
  /** **El kit de viaje**, y sus juegos. Ver `kit-de-viaje.ts`. */
  readonly kit: EstadoDelKit;
  /** **La consola de la pantalla del asiento**, o `null` donde no la hay. Ver `consola-del-asiento.ts`. */
  readonly consola: EstadoDeLaConsola | null;
  /**
   * **Si Ara duerme ahora**, y sus siestas, de cuándo a cuándo en s de
   * escena: mientras duerme no se cuenta nada, y el juego funde la pantalla y
   * deja pasar el vuelo deprisa. Ver `puedeDormirse`.
   */
  readonly durmiendo: boolean;
  readonly siestas: readonly Siesta[];
  /** **La luz del cinturón, apagada en el puesto**, y la gente de la cabina. Ver `gente`. */
  readonly luzApagada: boolean;
  readonly gente: GenteDeLaCabina;
  /** **Si Ara fue al baño**, con la luz apagada. Ver `puedeIrAlBano`. */
  readonly fueAlBano: boolean;
  /** **El botón de adelantar** (⏩). Ver `adelanto`. */
  readonly adelanto: EstadoDelAdelanto;
  /**
   * **La ventanilla viva**: los toques, si ya se invitó a tocar y los sellos
   * del cuaderno de viaje de lo visto en este vuelo, en el orden en que se
   * vieron. Ver `tocar`.
   */
  readonly toques: readonly Toque[];
  readonly invitado: boolean;
  readonly vistos: readonly SelloDelViaje[];
  /** **La lámina a pantalla completa de ahora**, o `null`. Ver `DefMomento.tapa`. */
  readonly tapa: string | null;
}

/** Una siesta de Ara, s de escena; `hasta` es `null` mientras dura. */
export interface Siesta {
  readonly desde: number;
  readonly hasta: number | null;
  /** Si despertó para bajar: entonces despierta a Ara la tripulante. */
  readonly paraBajar: boolean;
  /**
   * **Qué despertó a Ara**: el *ding* de la luz que se apaga, la tripulante
   * para bajar, un salto bajo tapa que ya llegó o otra cosa que llegó.
   */
  readonly porQue?: "ding" | "tripulante" | "salto" | "otra";
}

/**
 * **El modo rápido** (⏩), lo que deja ver la escena:
 *
 * - `sale`: si el botón está a la vista ahora;
 * - `puesto`: si el modo rápido está puesto, corra o no en este momento;
 * - `adelantando`: si el vuelo corre ahora mismo;
 * - `falta`: lo que falta para lo siguiente que hay que contar o ver, s de
 *   vuelo, o `null` si no se está en calma;
 * - `pulsado`: cuántas veces se puso;
 * - `llegada`: s de escena desde que empezó la llegada —ver
 *   `EMPIEZA_LA_LLEGADA`—, o `null` si todavía no: desde ahí el botón no
 *   vuelve, y si estaba puesto se apagó solo (`seApagoSolo`);
 * - `ratos`: los ratos corriendo, s de escena, para el banco y las pruebas.
 */
export interface EstadoDelAdelanto {
  readonly sale: boolean;
  readonly puesto: boolean;
  readonly adelantando: boolean;
  readonly falta: number | null;
  readonly pulsado: number;
  readonly llegada: number | null;
  readonly seApagoSolo: boolean;
  readonly ratos: readonly { readonly desde: number; readonly hasta: number | null }[];
}

/**
 * **El vuelo dentro de un rato**, s de vuelo, contado con lo que ya se sabe:
 * la subida hasta nivelar, el crucero hasta el punto de descenso y la bajada
 * por su senda, con la cabina que baja, los motores al ralentí, el frío de
 * arriba y la capa de nubes por donde se cruce. Lo demás —el mar de debajo,
 * el giro, lo que se ve—, como está ahora. Es con lo que la escena mira qué
 * viene antes de dejar adelantar: ver `adelanto`.
 */
export function proyectar(l: LecturaDelPasaje, dt: number): LecturaDelPasaje {
  let tramo = l.tramo;
  let enTramo = l.enTramo + dt;
  let altitud = l.altitud + l.vertical * dt;
  let vertical = l.vertical;
  let cabina = l.cabina;
  let potencia = l.potencia;
  let conEstaPotencia = l.conEstaPotencia === undefined ? undefined : l.conEstaPotencia + dt;
  const nivela = l.hastaElCrucero;
  const baja = l.hastaLaBajada;
  if (tramo === "subida" && nivela !== undefined && dt >= nivela) {
    tramo = "crucero";
    enTramo = dt - nivela;
    altitud = l.altitud + Math.max(0, l.vertical) * nivela;
    vertical = 0;
    cabina = 0;
  }
  if (tramo === "crucero" && baja !== undefined && dt >= baja) {
    // Por la senda: lo que queda de altura repartido en lo que queda de camino.
    const aTocar = Math.max(1000, l.faltaParaTocar - l.porElSuelo * baja);
    const arriba = altitud;
    tramo = "bajada";
    enTramo = dt - baja;
    vertical = (-l.porElSuelo * arriba) / aTocar;
    altitud = arriba + vertical * (dt - baja);
    cabina = LA_CABINA_BAJANDO;
    potencia = "ralenti";
    conEstaPotencia = dt - baja;
  }
  const n = l.nubes;
  const enLaCapa = !!n && altitud > n.base && altitud < n.techo;
  return {
    ...l,
    tramo,
    enTramo,
    altitud,
    altura: l.altura + (altitud - l.altitud),
    vertical,
    cabina,
    faltaParaTocar: l.faltaParaTocar - l.porElSuelo * dt,
    enNube: enLaCapa ? Math.max(l.enNube, 1) : 0,
    ...(l.meneo !== undefined || enLaCapa ? { meneo: enLaCapa ? Math.max(l.meneo ?? 0, 0.8) : l.meneo } : {}),
    ...(l.temperatura !== undefined ? { temperatura: l.temperatura - (altitud - l.altitud) * ENFRIA_AL_SUBIR } : {}),
    ...(potencia !== undefined ? { potencia } : {}),
    ...(conEstaPotencia !== undefined ? { conEstaPotencia } : {}),
    hastaElCrucero: tramo === "subida" && nivela !== undefined ? Math.max(0, nivela - dt) : undefined,
    hastaLaBajada: tramo !== "bajada" && baja !== undefined ? Math.max(0, baja - dt) : undefined,
    // Y lo recorrido, que es lo que espera un guion que cuenta por dónde se pasa. Ver `DelVueloLargo`.
    ...(l.largo ? { largo: { ...l.largo, recorrido: l.largo.recorrido + l.porElSuelo * dt } } : {}),
  };
}

/** Cuánto se queda el dibujo de mirar después de decirlo, s. */
const SE_QUEDA_EL_DIBUJO = 14;

/** Lo que el juego le dice al motor del pasaje al empezar, además del guion. */
export interface OpcionesDelPasaje {
  /** El lado de la ventanilla de Ara. Sin decir, el del guion. */
  readonly lado?: "izquierda" | "derecha";
  /**
   * **El reloj de las voces**, s: el de pared mientras se juega. Lo que
   * espera a que algo suene se mide con él, que una grabación dura lo que
   * dura aunque el reloj del juego vaya acelerado. Sin decir, el de la
   * escena. Ver `TOPE_DE_UNA_FRASE`.
   */
  readonly pared?: () => number;
  /**
   * **La demostración de este vuelo**: la de siempre o una con gracia. Se
   * pregunta una vez, al ir a darla —cuando ya se sabe qué está grabado—,
   * y se queda para todo el vuelo. Sin decir, la de siempre. Ver
   * `demostracion-con-gracia.ts`.
   */
  readonly demostracion?: () => FormaDeLaDemostracion;
  /**
   * **Si este avión lleva pantalla en los respaldos**: lo dice su ficha, no su nombre.
   * Ver `disposicionDelPasaje` en `aircraft.ts`. Sin decir, no la lleva.
   */
  readonly conPantalla?: boolean;
}

/**
 * **El motor del pasaje**: cuenta un vuelo con su guion —`M` son sus
 * momentos y `C`, sus charlas— al paso del vuelo que le da el juego. Ver
 * `GuionDelPasaje`.
 */
export class MotorDelPasaje<M extends string = string, C extends string = string> {
  private indice = 0;
  private reloj = 0;
  private acabado = false;
  private seguirPedido = false;
  private readonly charla: Conversacion;
  private readonly dichos: M[] = [];
  private readonly saltados: M[] = [];
  private readonly cuandoSeDijo = new Map<M, number>();
  private readonly charlasDichas: C[] = [];
  private mira: QueMirar | null = null;
  private miraDesde = 0;
  private callada = 0;
  /** Cuándo se pidió «sentados para el despegue» y cuándo se alineó, en el reloj de pared. */
  private enLaEsperaDesde: number | null = null;
  private alineadoDesde: number | null = null;
  /** Lo señalado que espera turno, y desde cuándo espera. Ver `ESPERA_A_QUE_SE_VEA`. */
  private readonly porSenalar: { readonly s: Senalado; readonly desde: number }[] = [];
  private readonly senalados: string[] = [];
  /** Lo señalado que se dejó sin decir porque no llegó a verse. */
  private readonly olvidados: string[] = [];
  private plano: Plano = "ventanilla";
  private planoDesde = 0;
  private paisaje: SitioDelPaisaje | null = null;
  private readonly planos: CambioDePlano[] = [{ plano: "ventanilla", desde: 0 }];
  private readonly nombrados: Nombrado[] = [];
  /**
   * **Lo que Ara contesta a lo señalado, esperando a que se haya oído**: su
   * frase y las que tienen que haber sonado antes. Ver `decirLoSenalado`.
   */
  private contestacion: { readonly linea: Linea; readonly oir: readonly string[]; readonly desde: number } | null = null;
  /** Y si ya se explicó el plop de los oídos de la subida: ver el momento `tcpNubes`. */
  private plopContado = false;
  /** Y si la tripulante ya contó lo que sabe hacer: ver `EL_OFICIO`. */
  private oficioDicho = false;
  /** Y si Ara ya fue al baño: ver `puedeIrAlBano`. */
  private alBano = false;
  /** Lo que lleva sonando seguida la música de llegada, s de escena. Ver la charla `musica`. */
  private conMusica = 0;

  private dibujo: string | null = null;
  private dibujoDe: Linea | null = null;
  /**
   * **El kit de viaje de Ara**: lo trae la tripulante en la bajada, se pausa
   * con la megafonía y se recoge para aterrizar. Lo que se toca se lo pasa el
   * dibujo directamente; lo que dice va por esta conversación, como todo.
   */
  readonly kit = new KitDeViaje();
  private kitAbierto = false;
  /** La luz verde ganada que está a la vista, y cuándo se vio ganada, s de escena. Ver `atenderAlKit`. */
  private luzGanada: { readonly juego: JuegoDeLaLuz; readonly en: number } | null = null;
  private juegoDelKit: KitDeViaje["juegoDeAhora"] = null;
  /**
   * **La consola de la pantalla del asiento**: `null` donde no la hay. Lo que se toca
   * se lo pasa el dibujo directamente, como con el kit, y el motor se entera en su
   * paso: ver `atenderALaConsola`.
   */
  readonly consola: ConsolaDelAsiento | null;
  /** Si Ara está mirando su pantalla, y qué pestaña se atendió la última vez. */
  private miraLaConsola = false;
  private pestanaAtendida: ConsolaDelAsiento["pestanaDeAhora"] = "mapa";
  /** El cuento que espera su silencio, y el que está sonando. Ver `atenderAlCuento`. */
  private cuentoPorSonar: string | null = null;
  private cuentoSonando: string | null = null;
  /** Lo que queda por explicar de la consola en este vuelo. Ver `explicarLaConsola`. */
  private explicaElBoton = false;
  private explicaLoQueHay = false;
  /** **La siesta de Ara**: la de ahora, si duerme, y todas. Ver `puedeDormirse`. */
  private siestaDeAhora: { desde: number; hasta: number | null; paraBajar: boolean; porQue?: Siesta["porQue"] } | null = null;
  private readonly siestas: { desde: number; hasta: number | null; paraBajar: boolean; porQue?: Siesta["porQue"] }[] = [];
  /** Adónde salta esta siesta, s de vuelo, mientras no haya saltado. Ver `saltoPedido`. */
  private saltoDeEstaSiesta: number | null = null;
  /** Si lo último que se pidió es el bostezo: al acabar, Ara cierra los ojos. */
  private bostezando = false;
  /** Si Ara se acaba de despertar con el *ding*: lo dice detrás del «ya estamos arriba». */
  private despiertaConElDing = false;
  /** Si lo que quedaba del plop explicado se apartó para el anuncio de la bajada. */
  private plopAplazado = false;
  /**
   * **El modo rápido**: si está puesto, si corre ahora, lo que falta y cuándo
   * se miró, si el botón se puede ver, cuándo empezó la llegada y los ratos
   * corriendo. Ver `adelanto`.
   */
  private rapido = false;
  private adelantando = false;
  private falta: number | null = null;
  private faltaMiradaEn = -Infinity;
  private pulsado = 0;
  private disponible = false;
  private llegadaDesde: number | null = null;
  private apagadoSolo = false;
  private readonly ratos: { desde: number; hasta: number | null }[] = [];
  /**
   * **La ventanilla viva**: los toques, el que espera su turno, lo que ya se
   * contó, las frases pedidas en el vuelo —para no repetir ninguna, la diga
   * quien la diga—, los sellos de lo visto, si ya se invitó a tocar y la
   * lámina de un toque sin voz. Ver `tocar`.
   */
  private readonly toques: { que: Tocable; desde: number; dijo: string[]; calla: Toque["calla"] }[] = [];
  private toquePendiente: { readonly que: Tocable; readonly desde: number; readonly toque: { dijo: string[]; calla: Toque["calla"] } } | null = null;
  private readonly contados = new Set<Tocable>();
  private readonly pedidas = new Set<string>();
  /** Las frases de Ara que ya se dijeron por un toque: la escena no las repite cuando le llegan. */
  private readonly porUnToque = new Set<string>();
  private readonly vistosDelViaje: SelloDelViaje[] = [];
  private invitado = false;
  private laminaDelToque: { readonly dibujo: string; readonly hasta: number } | null = null;
  /** La lámina a pantalla completa, y si se va encendiendo. Ver `DefMomento.tapa`. */
  private tapa: string | null;
  private tapaEnciende = false;

  constructor(
    voz: VozDelInicio,
    /** **El guion de este vuelo**: lo que se cuenta, y cuándo. Ver `GuionDelPasaje`. */
    private readonly guion: GuionDelPasaje<M, C>,
    private readonly opciones: OpcionesDelPasaje = {},
  ) {
    this.charla = new Conversacion(voz, () => this.reloj, () => this.pared());
    this.tapa = guion.apertura ? TAPA_A_OSCURAS : null;
    this.consola = guion.consola && opciones.conPantalla ? new ConsolaDelAsiento() : null;
  }

  /** **La lámina a pantalla completa de ahora**, o `null`: lo mira el juego en cada fotograma. */
  get tapaDeAhora(): string | null {
    return this.tapa;
  }

  /** **Si esa lámina se va encendiendo**. Ver `DefMomento.enciende`. */
  get laTapaSeEnciende(): boolean {
    return this.tapaEnciende;
  }

  /** **Las láminas que va a pedir el guion**, para bajarlas antes. */
  get laminasDelGuion(): readonly string[] {
    return this.guion.apertura?.laminas ?? [];
  }

  /** **Si se está contando lo de antes de ver el mundo**. Ver `GuionDelPasaje.apertura`. */
  get enLaApertura(): boolean {
    const a = this.guion.apertura;
    return !!a && !this.cuandoSeDijo.has(a.hasta);
  }

  private pared(): number {
    return this.opciones.pared?.() ?? this.reloj;
  }

  private get def(): DefMomento<M, M, C> {
    const momentos = this.guion.momentos;
    return momentos[Math.min(this.indice, momentos.length - 1)]!;
  }

  get segundos(): number {
    return this.reloj;
  }

  /** Cuánto lleva la escena sin que hable nadie, s. */
  get callaDesde(): number {
    return this.callada;
  }

  /**
   * Si ese momento ya se dijo. Con los del guion, y con las anclas de las que
   * el motor cuelga lo suyo: ver `AnclaDelPasaje`.
   */
  dicho(id: M | AnclaDelPasaje): boolean {
    return this.cuandoSeDijo.has(id as M);
  }

  /** Si ese momento se saltó por pasarse de su momento. */
  saltado(id: M | AnclaDelPasaje): boolean {
    return this.saltados.includes(id as M);
  }

  /** **El plano de ahora**: lo que deja como está lo que no cambia de toma. */
  get planoDeAhora(): Plano {
    return this.plano;
  }

  /** **Lo que lleva sonando seguida la música de llegada**, s de escena; 0 si no suena. */
  get musicaSuenaDesde(): number {
    return this.conMusica;
  }

  /**
   * **La forma de la demostración de este vuelo**: se elige la primera vez que
   * se pregunta, que es al ir a darla, y ya no cambia. Ver `opciones.demostracion`.
   */
  get formaDeLaDemostracion(): FormaDeLaDemostracion {
    this.formaDeLaDemo ??= this.opciones.demostracion?.() ?? "sobria";
    return this.formaDeLaDemo;
  }

  private formaDeLaDemo: FormaDeLaDemostracion | null = null;

  /**
   * **Si esa frase sonó**, con su voz: lo que se contesta a una historia
   * espera a que se haya oído. Ver `Conversacion.oida`.
   */
  oida(clave: string): boolean {
    return this.charla.oida(clave);
  }

  /** **Si la escena ya pidió esa frase** en este vuelo: por un momento, una charla, un toque o una contestación. */
  pedida(clave: string): boolean {
    return this.pedidas.has(clave);
  }

  /** **Si ya se señaló ese sitio** por la ventanilla, por su clave. Ver `senalar`. */
  fueSenalado(que: string): boolean {
    return this.senalados.includes(que);
  }

  /** Si esa charla ya se dijo. */
  dichaLaCharla(id: C): boolean {
    return this.charlasDichas.includes(id);
  }

  /**
   * **Si ya se explicó el plop de los oídos de la subida**: entonces, al bajar,
   * Ara ya sabe que es al revés. Ver los momentos `tcpNubes` y `oidos`.
   */
  get plopExplicado(): boolean {
    return this.plopContado;
  }

  /** **Si la tripulante ya contó lo que sabe hacer**, bajando o en el puesto: una vez. */
  get oficioContado(): boolean {
    return this.oficioDicho;
  }

  /** **Si Ara ya fue al baño**, con la luz apagada: una vez. Ver `puedeIrAlBano`. */
  get fueAlBano(): boolean {
    return this.alBano;
  }

  /**
   * **Si Ara puede ir al baño ahora** (punto 293). La luz manda: encendida, no
   * se levanta nadie; apagada, se puede. Así que hace falta todo esto:
   *
   * - que Ara lo haya pedido y la tripulante le haya dicho que le acompaña,
   *   que es lo de la revisión;
   * - **la luz del cinturón apagada**, la del cartel;
   * - en crucero, y con crucero por delante para ir y volver antes de empezar a
   *   bajar —ver `LO_QUE_PIDE_EL_BANO`—: al bajar se enciende la luz, y la
   *   tripulante lo sabe. Sin saber cuánto queda —las pruebas que no lo dan—,
   *   basta con estar en crucero.
   */
  puedeIrAlBano(l: LecturaDelPasaje): boolean {
    const bano = this.guion.bano;
    return (
      !this.alBano &&
      bano !== null &&
      this.dicho(bano.pedido) &&
      !l.enTierra &&
      l.tramo === "crucero" &&
      luzApagada(l, this) &&
      (l.hastaLaBajada ?? Infinity) >= LO_QUE_PIDE_EL_BANO
    );
  }

  /**
   * **Si la comandante ya apagó la luz del cinturón en el puesto**: lo mira el
   * juego en cada fotograma para apagar el cartel, con su *ding*. Ver el
   * momento `luz` y `Cinturon.paso`.
   */
  get luzApagadaEnElPuesto(): boolean {
    return this.dicho("luz");
  }

  /**
   * **Cómo anda la gente de la cabina** en el puesto (punto 303): sentada, los
   * impacientes que se sueltan y se levantan con la luz todavía encendida, y
   * todo el mundo de pie cuando se apaga. Lo que suena lo pone el juego. Ver
   * `audio/gente-del-pasaje.ts`.
   */
  get gente(): GenteDeLaCabina {
    if (this.dicho("luz")) return "de-pie";
    if (this.dicho("impacientes")) return "impacientes";
    return "sentada";
  }

  /**
   * **Cómo se ve ahora un sitio del paisaje.** Lo sabe el juego —ver
   * `LecturaDelPasaje.ver`—; sin él, todo se ve por la ventanilla y por el
   * lado de Ara, que es lo que hacen las pruebas que no miran el paisaje.
   */
  comoSeVe(sitio: SitioDelPaisaje, l: LecturaDelPasaje, plano?: Plano, lado?: "izquierda" | "derecha"): VistaDelSitio {
    return (
      l.ver?.(sitio, plano) ?? {
        como: plano && esDeFuera(plano) ? "fuera" : plano && plano !== "ventanilla" ? "asomado" : "ventanilla",
        lado: lado ?? this.opciones.lado ?? this.guion.lado,
      }
    );
  }

  /** Si un sitio del paisaje se ve ahora de alguna manera. */
  seVe(sitio: SitioDelPaisaje, l: LecturaDelPasaje): boolean {
    return this.comoSeVe(sitio, l).como !== null;
  }

  /** Si un alabeo baja el ala del lado de Ara. */
  bajaMiAla(alabeo: number): boolean {
    return (this.opciones.lado ?? this.guion.lado) === "izquierda" ? alabeo < 0 : alabeo > 0;
  }

  /** **Cuánto lleva puesto el plano de ahora**, s de escena. */
  get enElPlanoDesde(): number {
    return this.reloj - this.planoDesde;
  }

  /** Cuánto hace que se dijo ese momento, s, o −∞ si no se dijo. */
  desdeQueSeDijo(id: M): number {
    const t = this.cuandoSeDijo.get(id);
    return t === undefined ? -Infinity : this.reloj - t;
  }

  get estado(): EstadoDelPasaje<M, C> {
    const fin = this.def.id === "fin";
    return {
      momento: this.def.id,
      mira: this.mira,
      linea: this.charla.ultima,
      hablando: !this.charla.callada,
      puedeSeguir: fin && this.charla.callada,
      terminado: this.acabado,
      segundos: this.reloj,
      dichos: [...this.dichos],
      saltados: [...this.saltados],
      charlas: [...this.charlasDichas],
      senalados: [...this.senalados],
      plano: this.plano,
      planoDesde: this.planoDesde,
      planos: [...this.planos],
      paisaje: this.paisaje,
      nombrados: [...this.nombrados],
      dibujo: this.dibujo,
      megafonia: this.megafoniaSuena,
      kit: this.kit.estado,
      consola: this.consola?.estado ?? null,
      durmiendo: this.durmiendo,
      siestas: this.siestas.map((s) => ({ ...s })),
      luzApagada: this.luzApagadaEnElPuesto,
      gente: this.gente,
      fueAlBano: this.alBano,
      adelanto: this.adelanto,
      toques: this.toques.map((t) => ({ ...t, dijo: [...t.dijo] })),
      invitado: this.invitado,
      vistos: [...this.vistosDelViaje],
      tapa: this.tapa,
    };
  }

  /**
   * **Un toque en la ventanilla de Ara**, sobre algo que el juego ya ha visto
   * que se ve por su cristal —ver `tocarLaVentanillaViva` en `game.ts`—. Da
   * su sello del cuaderno de viaje, se le pone su aro, y se contesta en
   * cuanto haya un silencio: Ara, la lámina y, si está a mano, la tripulante.
   * La comandante, nunca. Ver `flight/lo-que-se-toca.ts`.
   *
   * Un toque no pisa a nadie: si alguien habla, espera su turno
   * `ESPERA_EL_TOQUE` como mucho y, si no le llega, se queda en su aro, sin
   * voz. Lo ya contado no se cuenta otra vez: sale su lámina, callada. Y con
   * Ara durmiendo no pasa nada, que tiene los ojos cerrados.
   */
  tocar(que: Tocable): void {
    // Con la lámina delante no se ve lo que hay detrás, así que no se toca.
    if (this.acabado || this.enLaApertura) return;
    const toque = { que, desde: this.reloj, dijo: [] as string[], calla: null as Toque["calla"] };
    this.toques.push(toque);
    if (this.toques.length > 60) this.toques.shift();
    if (this.durmiendo || this.bostezando) {
      toque.calla = "dormida";
      return;
    }
    this.verLo(selloDe(que));
    if (this.contados.has(que)) {
      toque.calla = "contado";
      this.ensenarLaLamina(que);
      return;
    }
    // Un toque nuevo manda sobre el que esperaba: es lo que se está mirando ahora.
    if (this.toquePendiente) this.toquePendiente.toque.calla = "ocupado";
    this.toquePendiente = { que, desde: this.reloj, toque };
  }

  /** **Un sello del cuaderno de viaje**, de lo que se acaba de ver: una vez cada uno. */
  private verLo(...sellos: readonly (SelloDelViaje | null | undefined)[]): void {
    for (const s of sellos) if (s && !this.vistosDelViaje.includes(s)) this.vistosDelViaje.push(s);
  }

  /** La lámina de lo tocado, sin voz, el rato de lo señalado: si no habla nadie con la suya. */
  private ensenarLaLamina(que: Tocable): void {
    const dibujo = laminaDe(que);
    if (dibujo) this.laminaDelToque = { dibujo, hasta: this.reloj + LAMINA_DEL_TOQUE };
  }

  /** Si una frase ya se pidió en este vuelo, la dijera quien la dijera. */
  private yaSePidio(clave: string): boolean {
    return this.pedidas.has(clave) || this.charla.registro.some((d) => d.clave === clave);
  }

  /**
   * **Si lo tocado se sigue viendo desde el asiento de Ara**, después de
   * esperar su turno: por su cristal, sentada o con la cara contra él. Las
   * piezas del avión no se van; lo de debajo y el paisaje, sí. Sin el mundo
   * —las pruebas que no lo miran—, se ve.
   */
  private sigueALaVista(que: Tocable, l: LecturaDelPasaje): boolean {
    if (que === "motor" || que === "ala" || !l.ver) return true;
    const sitio: SitioDelPaisaje = que === "mar" ? "mar-abajo" : que === "nubes" ? "nubes-abajo" : que;
    const como = l.ver(sitio).como;
    return como === "ventanilla" || como === "asomado";
  }

  /**
   * **Lo tocado, contestado en su turno**: en un silencio del guion, después
   * de lo señalado por la comandante y antes de lo que se cuenta cuando viene
   * a cuento —que lo que se acaba de tocar es lo que se está mirando—. Y la
   * invitación, una vez, en el primer silencio con algo que tocar a la vista.
   * Devuelve si se dijo algo.
   */
  private atenderAlToque(l: LecturaDelPasaje): boolean {
    if (this.reloj < this.enCorteHasta || this.enLaApertura) return false;
    if (this.kit.estaAbierto || this.kit.ocupaAAra || this.durmiendo || this.bostezando || this.miraLaConsola) return false;
    const p = this.toquePendiente;
    if (!p) {
      if (this.invitado || !l.tocable || this.callada < INVITA_TRAS || esDeFuera(this.plano) || esDeLaCabina(this.plano))
        return false;
      this.invitado = true;
      /*
       * Con la lámina que haya puesta, que la invitación no la quita: la del
       * embarque se queda hasta la frase siguiente. Menos la foto de una
       * historia, que solo sale con la voz que la cuenta.
       */
      const dibujo = this.dibujo && !this.dibujo.startsWith("foto:") ? this.dibujo : null;
      this.decirLasDelToque([dibujo ? { ...LA_INVITACION, dibujo } : LA_INVITACION]);
      return true;
    }
    if (this.callada < CALLA_ANTES_DEL_TOQUE) return false;
    this.toquePendiente = null;
    if (this.reloj - p.desde > SIGUE_A_LA_VISTA && !this.sigueALaVista(p.que, l)) {
      p.toque.calla = "sinVer";
      return false;
    }
    this.contados.add(p.que);
    // La invitación ya no hace falta: se ha tocado.
    this.invitado = true;
    const dicho = loQueSeDiceAlTocar(p.que, {
      /*
       * La tripulante viene si anda por el pasillo, y si no hay una respuesta
       * a Ara esperando su rato tranquilo —el porqué del ralentí, que va
       * primero—: lo tocado se queda en lo que dice Ara, que es corto.
       */
      conLaTripulante: this.guion.tripulanteEnElPasillo(this) && volando(l) && !cabinaPreparada(l, this) && !this.quedaPorContestar(l),
      yaDicha: (k) => this.yaSePidio(k),
      charlaContada: (id) => this.charlasDichas.includes(id as C),
      altitud: l.altitud,
      nubes: l.nubes,
      enLaFinal: enLaFinal(l),
      faltaParaTocar: l.faltaParaTocar,
      altura: l.altura,
    });
    if (!dicho) {
      p.toque.calla = "contado";
      this.ensenarLaLamina(p.que);
      return false;
    }
    // Lo que cuenta aquí la escena ya no lo vuelve a contar cuando le llegue.
    for (const c of dicho.charlas) if (!this.charlasDichas.includes(c as C)) this.charlasDichas.push(c as C);
    for (const x of dicho.lineas) if (x.quien === "ara") this.porUnToque.add(x.clave);
    p.toque.dijo.push(...dicho.lineas.map((x) => x.clave));
    this.mira = p.que === "motor" ? "motor" : p.que === "ala" ? "ala" : p.que === "nubes" ? "nubes" : "ventanilla";
    this.miraDesde = this.reloj;
    this.decirLasDelToque(dicho.lineas);
    return true;
  }

  /** Lo de un toque, a la cola, apuntado como pedido. */
  private decirLasDelToque(lineas: readonly Linea[]): void {
    for (const x of lineas) this.pedidas.add(x.clave);
    this.laminaDelToque = null;
    this.charla.decir(lineas);
  }

  /** **Si Ara duerme ahora.** Lo mira el juego en cada fotograma: ver `frame` en `game.ts`. */
  get durmiendo(): boolean {
    return this.siestaDeAhora !== null;
  }

  /**
   * **Adónde pide saltar la escena**, s desde el despegue, o `null` si el vuelo
   * no salta y corre. Solo con Ara durmiendo y una vez por siesta. Lo atiende
   * el juego cuando la pantalla tapa del todo; la cuenta de adónde puede caer
   * es `destinoDelSalto`, en `salto-bajo-tapa.ts`.
   */
  get saltoPedido(): number | null {
    return this.siestaDeAhora ? this.saltoDeEstaSiesta : null;
  }

  /**
   * **El salto ya está hecho**: el avión está donde estaría y el mundo, puesto.
   * Lo que iba a contarse por la ventanilla era de otro sitio, y Ara se
   * despierta con su frase: un suceso, una voz. Los relojes de la escena no se
   * han movido, porque lo que salta es la hora del vuelo, no los pasos: lo que
   * espera un rato callado sigue esperando su rato, y nada se dispara al
   * destapar.
   */
  trasElSalto(): void {
    this.saltoDeEstaSiesta = null;
    this.porSenalar.length = 0;
    this.contestacion = null;
    this.toquePendiente = null;
    this.mira = null;
    this.falta = null;
    this.faltaMiradaEn = -Infinity;
    // Bajo un juego a pantalla completa puede haber alguien a media frase: esa frase era de hace horas.
    this.charla.callar();
    const s = this.siestaDeAhora;
    if (!s) return;
    this.despertar(s, "salto");
    if (!this.guion.siesta.sigueOtroCapitulo) this.charla.decir([this.guion.siesta.seDespierta]);
  }

  /** **Si del salto se cae en otro capítulo**. Ver `sigueOtroCapitulo`. */
  get sigueOtroCapitulo(): boolean {
    return !!this.guion.siesta.sigueOtroCapitulo;
  }

  /**
   * **El salto se dejó**, porque no llegó a haber tapa: sin ella no se salta
   * nunca, así que la siesta sigue, corriendo como la de un vuelo corto.
   */
  saltoDejado(): void {
    this.saltoDeEstaSiesta = null;
  }

  /**
   * **El modo rápido** (⏩), aprobado por Enrique: «en casa, jugando al
   * simulador, se aburren». Un toque lo pone y otro lo quita, y mientras está
   * puesto el vuelo corre **en cada rato en que no hay nada que contar ni que
   * ver**, y se para solo antes de lo siguiente para que se oiga y se vea a su
   * velocidad. El primer botón, el de T54, solo salía con medio minuto de
   * silencio por delante, y el vuelo va contado de seguido: casi nunca salía.
   *
   * - **Corre solo cuando no va a pasar nada en un rato**: la escena sabe qué
   *   viene —el siguiente momento del guion, lo que se cuenta cuando viene a
   *   cuento, el siguiente cambio de tramo o de gas, el principio de la
   *   llegada— y lo busca en el vuelo de dentro de un rato, ver `proyectar`.
   *   Si falta menos de `CORRE_SI_FALTAN`, no echa a correr.
   * - **Se para solo** a `PARA_ANTES` de lo siguiente; y en cuanto alguien
   *   habla, se cambia de plano o hay algo señalado por la ventanilla,
   *   también. Pasado lo que se cuenta, y su rato de asentarse, sigue.
   * - **Nunca se salta nada**: lo que corre es el vuelo, de verdad, y lo que
   *   se tiene que contar o ver llega con el vuelo a su paso.
   * - **Ni en tierra, ni con Ara durmiendo** —la siesta ya pasa deprisa—, **ni
   *   con el tren o los flaps fuera**, ni con el gas de despegue.
   * - **Y la llegada se vive entera**: en la subida y en lo alto de la bajada,
   *   sí; desde los diez mil pies bajando —ver `EMPIEZA_LA_LLEGADA`— se apaga
   *   solo y el botón ya no vuelve en ese vuelo.
   *
   * Lo deprisa que va lo pone el juego, que es quien sabe lo que aguanta la
   * máquina: ver `frame` en `game.ts`.
   */
  get adelanto(): EstadoDelAdelanto {
    return {
      sale: this.disponible,
      puesto: this.rapido,
      adelantando: this.adelantando,
      falta: this.faltaAhora,
      pulsado: this.pulsado,
      llegada: this.llegadaDesde,
      seApagoSolo: this.apagadoSolo,
      ratos: this.ratos.map((r) => ({ ...r })),
    };
  }

  /**
   * **El botón ⏩ en la pantalla**, lo justo para pintarlo en cada fotograma:
   * si sale, si el modo está puesto, si corre ahora y si se acaba de apagar
   * solo al empezar la llegada —entonces vuelve a su estado y se va—.
   */
  get boton(): { readonly sale: boolean; readonly puesto: boolean; readonly corre: boolean; readonly seVa: boolean } {
    return { sale: this.disponible, puesto: this.rapido, corre: this.adelantando, seVa: this.apagadoSolo && this.llegadaDesde !== null };
  }

  /** Si el vuelo corre ahora: lo mira el juego en cada paso. */
  get adelantaAhora(): boolean {
    return this.adelantando;
  }

  /**
   * **Quien juega toca el botón**: pone el modo rápido si se puede, o lo
   * quita si estaba puesto. Devuelve si queda puesto.
   */
  adelantar(si: boolean = !this.rapido): boolean {
    if (si && !this.disponible) return false;
    if (si && !this.rapido) this.pulsado++;
    this.rapido = si;
    if (!si) this.parar();
    return si;
  }

  /** Lo que falta para lo siguiente, s de vuelo, contando lo que pasó desde que se miró. */
  private get faltaAhora(): number | null {
    return this.falta === null ? null : Math.max(0, this.falta - (this.reloj - this.faltaMiradaEn));
  }

  /** El vuelo deja de correr, y se apunta hasta cuándo corrió. */
  private parar(): void {
    if (!this.adelantando) return;
    this.adelantando = false;
    const r = this.ratos[this.ratos.length - 1];
    if (r && r.hasta === null) r.hasta = this.reloj;
  }

  /**
   * **Un paso del modo rápido**: si el botón se puede ver, si empieza la
   * llegada —y entonces se apaga solo, para siempre—, qué viene, y si el
   * vuelo corre o se para a tiempo.
   */
  private atenderAlAdelanto(l: LecturaDelPasaje): void {
    if (this.llegadaDesde === null && !l.enTierra && enLaLlegada(l, this)) {
      this.llegadaDesde = this.reloj;
      this.apagadoSolo = this.rapido;
      this.rapido = false;
    }
    this.disponible = this.sePuedeCorrer(l);
    if (!this.disponible || !this.rapido || !this.enCalma(l)) {
      this.falta = null;
      this.parar();
      return;
    }
    if (this.falta === null || this.reloj - this.faltaMiradaEn >= ADELANTO.MIRA_CADA) {
      this.falta = this.loQueFalta(l);
      this.faltaMiradaEn = this.reloj;
    }
    const falta = this.faltaAhora ?? 0;
    if (this.adelantando && falta <= ADELANTO.PARA_ANTES) this.parar();
    else if (!this.adelantando && falta >= ADELANTO.CORRE_SI_FALTAN) {
      this.adelantando = true;
      this.ratos.push({ desde: this.reloj, hasta: null });
      if (this.ratos.length > ADELANTO.RATOS) this.ratos.shift();
    }
  }

  /**
   * **Si el modo rápido vale ahora**, y por eso el botón está a la vista: en
   * el aire, con el tren y los flaps dentro y sin el gas de despegue, sin Ara
   * durmiendo ni bostezando, y antes de la llegada. Con el modo puesto, lo
   * que no se ve no corre.
   */
  private sePuedeCorrer(l: LecturaDelPasaje): boolean {
    if (this.acabado || this.durmiendo || this.bostezando || this.def.id === "fin" || this.llegadaDesde !== null) return false;
    if (this.enLaApertura) return false;
    if (!volando(l) || enLaFinal(l) || cabinaPreparada(l, this)) return false;
    return l.flaps <= 0.05 && (l.tren ?? 0) <= 0.05 && l.potencia !== "despegue";
  }

  /**
   * **Si el vuelo está en calma**: sin nadie hablando ni a punto de hablar,
   * en la ventanilla, sin el kit en las manos, y nada del guion que ya toque.
   */
  private enCalma(l: LecturaDelPasaje): boolean {
    if (!this.charla.callada || this.reloj < this.enCorteHasta || this.plano !== "ventanilla") return false;
    if (this.porSenalar.length > 0 || this.contestacion || this.toquePendiente || this.kit.estaAbierto || this.kit.ocupaAAra)
      return false;
    if (!this.adelantando && this.callada < ADELANTO.CALLA_PARA_ADELANTAR) return false;
    return !this.def.cuando(l, this);
  }

  /**
   * **Cuánto falta para lo siguiente que hay que contar o ver**, s de vuelo,
   * hasta `MIRA_HASTA`: lo que ya viene a cuento y espera su silencio, y lo que
   * vendrá —el siguiente momento del guion, una charla, un cambio de tramo o
   * de gas, la llegada— en el vuelo de dentro de un rato. Lo que ya viene a cuento pero
   * espera a verse —el mar entre las nubes— no se sabe cuándo llega: si llega
   * adelantando, empieza a hablar, y el juego vuelve a su paso.
   */
  private loQueFalta(l: LecturaDelPasaje): number {
    let falta: number = ADELANTO.MIRA_HASTA;
    const yaVienen = new Set<C>();
    for (const c of this.guion.charlas) {
      if (this.charlasDichas.includes(c.id) || !c.cuando(l, this) || c.caduca?.(l, this)) continue;
      yaVienen.add(c.id);
      if (this.callada < this.trasDe(c)) falta = Math.min(falta, this.trasDe(c) - this.callada);
    }
    for (const dt of PASOS_DE_MIRAR) {
      if (dt >= falta) break;
      const p = proyectar(l, dt);
      const e = this.dentroDe(dt);
      if (p.tramo !== l.tramo || p.potencia !== l.potencia) return dt;
      // Y la llegada, que se vive a su paso desde el primer metro.
      if (enLaLlegada(p, e)) return dt;
      if (this.def.cuando(p, e) && !this.def.caduca?.(p, e)) return dt;
      for (const c of this.guion.charlas)
        if (!this.charlasDichas.includes(c.id) && !yaVienen.has(c.id) && c.cuando(p, e) && !c.caduca?.(p, e)) return dt;
    }
    return falta;
  }

  /** **La escena dentro de un rato**, s, si nadie dice nada: para mirar qué viene. */
  private dentroDe(dt: number): MotorDelPasaje<M, C> {
    return Object.create(this, {
      reloj: { value: this.reloj + dt },
      callada: { value: this.callada + dt },
    }) as MotorDelPasaje<M, C>;
  }

  /**
   * **Si lo que suena ahora es la megafonía**: un anuncio, la comandante o la
   * tripulación por el altavoz del techo, también mientras se lee sin voz.
   * Con eso se pausa el kit y se calla el hilo musical.
   */
  get megafoniaSuena(): boolean {
    return this.charla.suena?.megafonia === true;
  }

  get registro(): readonly Readonly<FraseDicha>[] {
    return this.charla.registro;
  }

  /** La boca se vació por su cuenta: ver `Conversacion.retomar`. */
  retomarLaVoz(): void {
    this.charla.retomar();
  }

  /** Quien juega toca el botón del final. */
  seguir(): void {
    if (this.def.id === "fin") this.seguirPedido = true;
  }

  /**
   * **Si ahora se puede señalar algo por la ventanilla**: arriba —del cartel
   * apagado, o pasados los diez mil pies, hasta la bajada—, sin nadie
   * hablando y sin otro sitio esperando turno. Es lo que el juego le pasa a
   * `LoQueSeVe` como «alguien habla», para que elija el momento. Ver
   * `mirarPorLaVentanilla` en `game.ts`.
   */
  get puedeSenalar(): boolean {
    return (
      !this.contestacion &&
      // Ni con Ara cerrando los ojos o durmiendo: lo que no ve, no se le señala.
      !this.bostezando &&
      !this.durmiendo &&
      !this.enLaApertura &&
      // Y con la pantalla delante, tampoco: lo que no se ve por el cristal no se nombra.
      !this.miraLaConsola &&
      this.guion.seSenalaDesde.some((m) => this.dicho(m)) &&
      !this.dicho("aproximacion") &&
      this.charla.callada &&
      this.porSenalar.length === 0 &&
      !this.acabado
    );
  }

  /**
   * **Lo que el juego acaba de ver por la ventanilla**: se dice en cuanto se
   * pueda, si entonces se sigue viendo. Ver `ESPERA_A_QUE_SE_VEA`.
   */
  senalar(s: Senalado): void {
    if (this.acabado) return;
    this.porSenalar.push({ s, desde: this.reloj });
  }

  /** Lo señalado que se dejó sin decir porque no llegó a verse a tiempo. */
  get olvidadosPorNoVerse(): readonly string[] {
    return this.olvidados;
  }

  /** Un paso de la escena. Devuelve lo que la escena deja hacer a la tripulación. */
  paso(dt: number, l: LecturaDelPasaje): PermisosDeLaEscena {
    this.reloj += dt;
    /*
     * El silencio de un corte de cámara también es silencio: con el corte a
     * una toma sin palabras —el señalero— la cuenta volvía a cero y lo que
     * esperaba su rato callado se quedaba sin él.
     */
    const enCorte = this.reloj < this.enCorteHasta && this.charla.vacia;
    this.callada = this.charla.callada || enCorte ? this.callada + dt : 0;
    this.conMusica = l.musica ? this.conMusica + dt : 0;
    if (!this.acabado) {
      this.charla.atender();
      this.avanzar(l);
      this.charla.atender();
      // Después de lo que empieza a sonar en este paso: si es la megafonía, el kit se pausa ya.
      this.atenderAlKit(dt, l);
    }
    this.atenderAlAdelanto(l);
    // Después del ⏩, que es quien sabe si ya empezó la llegada: los dos se van en el mismo paso.
    if (!this.acabado) this.atenderALaConsola(l);
    if (this.mira && this.reloj - this.miraDesde > SE_QUEDA_EL_DIBUJO && this.charla.callada) this.mira = null;
    this.mirarLaVentanita();
    return this.permisos(l);
  }

  /**
   * **El dibujo de la ventanita**: el de la frase que suena, mientras suena y
   * un poco después. Entre dos frases del mismo dibujo no se va —la
   * demostración entera pasa de dibujo en dibujo sin parpadear—, y una frase
   * sin dibujo lo quita. Lo mismo con una ilustración o la foto de una
   * historia, que van por el mismo sitio con su prefijo delante.
   */
  private mirarLaVentanita(): void {
    const suena = this.charla.callada ? null : this.charla.ultima;
    if (suena && suena !== this.dibujoDe) {
      this.dibujoDe = suena;
      this.dibujo = suena.dibujo ?? null;
    }
    /*
     * **Y la foto de una historia, solo mientras suena la voz que la cuenta**
     * (punto 287). Salía la foto del gomero silbando con la historia del silbo
     * sin sonar: la escena la daba por dicha —se lee el subtítulo el rato de
     * leerlo— y la ventanita ponía su foto igual. Una foto no sale sin la voz
     * que la cuenta: hasta que esa voz empieza, y si no llega a empezar, la
     * ventanita se queda como estaba. Los dibujos de lo que se explica sí
     * acompañan al subtítulo, que es lo que se lee mientras una frase nueva
     * espera su toma.
     */
    if (this.dibujoDe?.dibujo?.startsWith("foto:")) {
      const deVerdad = this.charla.suenaDeVerdad === this.dibujoDe;
      if (!deVerdad && this.dibujo === this.dibujoDe.dibujo) this.dibujo = null;
      else if (deVerdad) this.dibujo = this.dibujoDe.dibujo;
    }
    const seQueda = this.dibujo !== null && this.guion.seQuedanHastaLaSiguiente.has(this.dibujo);
    if (this.charla.callada && this.callada > SE_QUEDA_LA_VENTANITA && !seQueda) this.dibujo = null;
    /*
     * **Y la lámina de lo tocado sin voz**: lo que ya se contó, tocado otra
     * vez, enseña su lámina un rato, callada. Si alguien habla, manda lo suyo.
     */
    const lt = this.laminaDelToque;
    if (lt && (this.reloj >= lt.hasta || !this.charla.callada)) this.laminaDelToque = null;
    else if (lt) this.dibujo = lt.dibujo;
    /*
     * **Y con Ara durmiendo, el mapa de la ruta**, con el avión avanzando: es
     * como se ve que el vuelo sigue mientras pasa deprisa. Y al despertar se
     * queda con lo que dice Ara. Ver `ui/siesta.ts`.
     */
    if (this.siestaDeAhora) this.dibujo = "ruta";
  }

  /**
   * **Cambiar de plano**: si es un corte —de la ventanilla a fuera o al
   * revés, de un sitio de fuera a otro, o de la ventanilla al pasillo—, la
   * escena calla su rato. Ver `CORTE_DE_PLANO` y `esCorte`.
   */
  private ponerPlano(p: Plano, sitio: SitioDelPaisaje | null = null): void {
    /*
     * Con la consola abierta, Ara mira su pantalla, y nada de lo que se diga le gira la
     * cabeza: lo decidió quien juega, y lo que se dice se oye igual. De los diez mil
     * pies para abajo, donde sí hay tomas que no se pueden perder, ya está recogida.
     */
    if (this.miraLaConsola && p !== "respaldo") return;
    // Los planos que buscan un sitio son otro plano con otro sitio: otra toma.
    const suyo = p === "asomado-paisaje" || p === "fuera-paisaje" ? sitio : null;
    if (p === this.plano && suyo === this.paisaje) return;
    const corte = esCorte(this.plano, p);
    this.plano = p;
    this.paisaje = suyo;
    this.planoDesde = this.reloj;
    this.planos.push({ plano: p, desde: this.reloj, ...(suyo ? { sitio: suyo } : {}) });
    if (this.planos.length > 120) this.planos.splice(1, 1);
    if (corte) {
      this.charla.esperar(CORTE_DE_PLANO);
      this.enCorteHasta = this.reloj + CORTE_DE_PLANO;
    }
  }

  /** Hasta cuándo dura el silencio del último corte, s de escena. */
  private enCorteHasta = 0;

  /**
   * **Cómo se ve lo que nombra un momento o una charla**: `undefined` si no
   * nombra nada del paisaje, `null` si nombra algo que ahora no se ve —y
   * entonces espera—, o desde dónde se ve. Lo que solo se enseña si se ve
   * —`muestra`— no espera: sin verse, se dice sin enseñarlo.
   */
  private vistaDe(def: DefMomento<string, M, C>, l: LecturaDelPasaje): VistaDelSitio | null | undefined {
    const sitio = def.nombra ?? def.muestra;
    if (!sitio) return undefined;
    // Mirando la pantalla no se ve nada de fuera: lo que lo nombra espera a que vuelva.
    if (this.miraLaConsola) return def.nombra ? null : undefined;
    const v = this.comoSeVe(sitio, l, def.plano);
    if (v.como !== null) return v;
    return def.nombra ? null : undefined;
  }

  /** Se dice lo de un momento o una charla: su plano, su dibujo de mirar y sus frases. */
  private decirDe(def: DefMomento<M | C, M, C>, l: LecturaDelPasaje, vista?: VistaDelSitio): void {
    const sitio = def.nombra ?? def.muestra ?? null;
    const plano =
      def.planoSegun?.(l, this) ?? def.plano ?? (vista?.como && sitio ? planoParaVer(vista.como, sitio) : "ventanilla");
    this.ponerPlano(plano, sitio);
    const tapa = def.tapaSegun ? def.tapaSegun(l, this) : def.tapa;
    if (tapa !== undefined) {
      this.tapa = tapa;
      this.tapaEnciende = def.enciende === true;
    }
    /*
     * Lo que Ara ya dijo al tocarlo no lo repite cuando le llega a la escena:
     * «¡ya se ve la isla adonde vamos!» una vez. Ver `tocar`.
     */
    const lineas = (def.segun?.(l, this) ?? def.lineas).filter((x) => !this.porUnToque.has(x.clave));
    if (sitio && vista?.como && lineas[0])
      this.apuntarLoNombrado(sitio, lineas[0].clave, vista);
    // Los sellos del cuaderno de viaje de lo que se cuenta: los da el guion, que sabe qué se ve.
    this.verLo(...this.guion.sellosAlDecirlo(def.id, lineas, !sitio || !!vista?.como));
    for (const x of lineas) this.pedidas.add(x.clave);
    if (lineas.some((x) => this.guion.elPlop.includes(x))) this.plopContado = true;
    if (lineas.some((x) => this.guion.elOficio.includes(x))) this.oficioDicho = true;
    if (this.guion.bano && lineas.includes(this.guion.bano.vuelta)) this.alBano = true;
    this.charla.decir(lineas);
    if (def.mira) {
      this.mira = def.mira;
      this.miraDesde = this.reloj;
    }
  }

  private apuntarLoNombrado(sitio: SitioDelPaisaje, clave: string, v: VistaDelSitio): void {
    if (!v.como) return;
    this.nombrados.push({ sitio, clave, como: v.como, lado: v.lado, desde: this.reloj });
    if (this.nombrados.length > 60) this.nombrados.shift();
  }

  private avanzar(l: LecturaDelPasaje): void {
    // Lo que se pasa de su momento se salta, aunque haya alguien hablando.
    while (this.def.id !== "fin" && this.def.caduca?.(l, this)) {
      this.saltados.push(this.def.id);
      this.indice++;
    }
    const def = this.def;
    this.laMegafoniaMandaSobreElCuento(def, l);
    if (def.id === "fin") {
      if (this.seguirPedido && this.charla.callada) {
        this.acabado = true;
        this.charla.callar();
      }
      if (this.charla.callada) this.volverALaVentanilla();
      return;
    }
    /*
     * Preparando la cabina para aterrizar ya no se señala nada: lo que
     * esperaba turno, se olvida. Hasta ahí, también bajando, que es cuando
     * mejor se ve: la cabina estéril de abajo la guarda `LoQueSeVe`.
     */
    if (this.dicho("aproximacion") || l.tramo === "final" || l.enTierra) this.porSenalar.length = 0;
    /*
     * Con Ara durmiendo no se cuenta nada: solo se mira si toca despertar. Ver
     * `atenderALaSiesta`. Y si lo que despierta es el *ding* de la luz, lo que
     * lo trae —el «ya estamos arriba»— se dice ahora mismo, más abajo.
     */
    if (this.siestaDeAhora) {
      this.atenderALaSiesta(l);
      if (this.siestaDeAhora || !this.despiertaConElDing) return;
    }
    /*
     * **Y empezar a bajar no espera al plop** (19-10-2026). La tripulante
     * explica el plop de la subida al final de lo suyo con las nubes, y en un
     * crucero de un minuto eso puede llegar al punto de descenso: el ralentí
     * sonaba y Ara ya no lo podía notar a tiempo, ni la luz del cinturón se
     * encendía. Lo que le queda por empezar de esa explicación se aparta, se
     * dice el anuncio de la bajada —con el ralentí que nota Ara— y la
     * tripulante lo acaba detrás, antes de los oídos, que es donde se engancha.
     */
    if (this.def.id === "bajada" && !this.plopAplazado && acabaDePonerse(l, "ralenti") && this.def.cuando(l, this)) {
      let quitado = false;
      this.charla.quitar((x) => {
        const es = this.guion.elPlop.includes(x);
        quitado ||= es;
        return es;
      });
      this.plopAplazado = quitado;
    }
    // El toque que no encontró silencio a tiempo se queda en su aro, sin voz.
    if (this.toquePendiente && this.reloj - this.toquePendiente.desde > ESPERA_EL_TOQUE) {
      this.toquePendiente.toque.calla = "ocupado";
      this.toquePendiente = null;
    }
    if (!this.charla.callada) return;
    /*
     * Acabado el bostezo, Ara cierra los ojos, si sigue sin haber nada que
     * contar: si mientras bostezaba llegó lo siguiente, no se duerme.
     */
    if (this.bostezando) {
      this.bostezando = false;
      if (this.puedeDormirse(l, true)) {
        this.dormirse(l);
        return;
      }
    }
    // Lo que Ara contesta a lo señalado, si se oyó lo que contesta. Ver `decirLoSenalado`.
    if (this.contestacion) {
      const c = this.contestacion;
      this.contestacion = null;
      if (this.seOyeronDesde(c.oir, c.desde)) {
        this.charla.decir([c.linea]);
        return;
      }
    }
    const vista = def.cuando(l, this) ? this.vistaDe(def, l) : undefined;
    if (!def.cuando(l, this) || this.esperaSuFase(def, l) || vista === null) {
      /*
       * Lo señalado por la ventanilla, en los huecos de lo que no ha llegado;
       * y si no hay, lo que venga a cuento. Menos en lo que va pegado a lo de
       * antes, como el servicio de un salto entre islas: ver `DefMomento.pegado`.
       */
      if (def.pegado) return;
      // Lo que se pidió en la consola, en cuanto hay hueco: nada del guion lo está esperando.
      if (this.atenderAlCuento()) return;
      if (this.atenderALaExplicacionDelBoton()) return;
      if (this.atenderLoSenalado(l)) return;
      // Y lo que se acaba de tocar por la ventanilla, que es lo que se está mirando. Ver `tocar`.
      if (this.atenderAlToque(l)) return;
      /*
       * Y con el kit en las manos, lo que se cuenta cuando viene a cuento
       * espera: una explicación encima de un juego es un ruido. Lo que tiene
       * su momento —el guion, lo de la ventanilla— sí se dice.
       */
      /*
       * Y si se va a dormir Ara, lo que puede esperar a que se despierte
       * espera: con un rato de silencio llegaba antes que el sueño, y se
       * comía la siesta. Ver `PUEDEN_ESPERAR`.
       */
      const esperan = this.puedeDormirse(l, false, true) ? this.guion.siesta.puedenEsperar : undefined;
      /*
       * Y con la consola abierta, ninguna: «¡mirá por la ventanilla!» con una pantalla
       * delante es mentira aunque no nombre un sitio. Esperan a que vuelva, y las que
       * se pasen de su momento se saltan, que para eso son de cuando vienen a cuento.
       */
      const charla =
        this.kit.ocupaAAra || this.miraLaConsola || this.kitAPuntoDeLlegar(def, l) ? undefined : this.charlaQueToca(l, esperan);
      if (charla) {
        this.charlasDichas.push(charla.def.id);
        this.decirDe(charla.def, l, charla.vista);
        return;
      }
      // Y si no hay nada que contar en un buen rato, Ara bosteza. Ver `puedeDormirse`.
      if (this.puedeDormirse(l)) {
        this.bostezar();
        return;
      }
      this.volverALaVentanilla();
      return;
    }
    this.decirDe(def, l, vista ?? undefined);
    this.dichos.push(def.id);
    this.cuandoSeDijo.set(def.id, this.reloj);
    this.indice++;
    // Y lo que quedó de la explicación del plop, detrás del anuncio de la bajada.
    if (def.id === "bajada" && this.plopAplazado) {
      this.plopAplazado = false;
      this.charla.decir(this.guion.elPlop);
    }
    // Y Ara, a quien acaba de despertar el *ding*, detrás: con el mapa de lo que se voló mientras dormía.
    if (this.despiertaConElDing) {
      this.despiertaConElDing = false;
      this.charla.decir([this.guion.siesta.seDespierta]);
    }
  }

  /**
   * **Lo señalado por la ventanilla, si se ve.** El juego lo vio y lo dio,
   * pero entre eso y el hueco para decirlo el avión puede meterse en una nube
   * o girar: se mira otra vez, y si no se ve, espera su rato sin quitarle el
   * turno a nadie; pasado el rato, se deja. Devuelve si se dijo.
   */
  private atenderLoSenalado(l: LecturaDelPasaje): boolean {
    const primero = this.porSenalar[0];
    if (!primero) return false;
    const v = this.comoSeVe(`hito:${primero.s.que}`, l, undefined, primero.s.lado);
    if (v.como !== null) {
      this.porSenalar.shift();
      this.decirLoSenalado(primero.s, v);
      return true;
    }
    if (this.reloj - primero.desde > ESPERA_A_QUE_SE_VEA) {
      this.porSenalar.shift();
      this.olvidados.push(primero.s.que);
    }
    return false;
  }

  /**
   * **Si esas frases sonaron**, dichas a partir de `desde`: sonaron de
   * verdad, con su voz, no solo se dejaron leer. Lo que contesta Ara espera a
   * esto. Ver `decirLoSenalado`.
   */
  private seOyeronDesde(claves: readonly string[], desde: number): boolean {
    const r = this.charla.registro;
    return claves.every((c) => r.some((d) => d.clave === c && d.desde >= desde - 1e-6 && d.como === "sono"));
  }

  /**
   * **El kit de viaje, al ritmo de lo que se dice**: aparece cuando la
   * tripulante lo da —al sonar su frase, no al pedirse—, se recoge cuando
   * pide guardarlo o, si eso no llegó, en la final; se pausa mientras habla la
   * megafonía y desde que se prepara la cabina; y lo que quieren decir sus
   * juegos va a la cola de la conversación, detrás de lo que hubiera. Lo que
   * esperaba turno de un juego que se cerró, se quita.
   */
  private atenderAlKit(dt: number, l: LecturaDelPasaje): void {
    const suena = this.charla.suena?.clave;
    const lasDelKit = this.guion.kit;
    if (lasDelKit && (suena === lasDelKit.dado || this.charla.oida(lasDelKit.dado))) this.kit.dar();
    /*
     * Y la red, por si la frase no llegó a sonar: mil pies por debajo de los
     * diez mil, recogido igual. Una espera sin salida es un kit abierto en la
     * final.
     */
    if (
      (lasDelKit !== null && suena === lasDelKit.guardado) ||
      enLaFinal(l) ||
      (l.enTierra && bajando(l.tramo)) ||
      (bajando(l.tramo) && l.altitud < DIEZ_MIL_PIES - KIT_POR_DEBAJO)
    )
      this.kit.recoger();
    /*
     * **Y la canción**, en cuanto se oyó el «¡aterrizaron todos!» de Ara con
     * la torre ganada a la vista: el de esta vez, no el de una partida de
     * antes. Antes del paso del kit, que si no el juego ganado se iba de la
     * pantalla en el mismo fotograma. Ver `KitDeViaje.cancion`.
     */
    const torre = this.kit.juegoDeAhora;
    if (torre instanceof JuegoDeLaLuz && torre.terminado) {
      if (this.luzGanada?.juego !== torre) this.luzGanada = { juego: torre, en: this.reloj };
      if (!this.kit.cancion?.suena && this.charla.oidaDesde(DICHO_DE_LA_LUZ.fin.clave, this.luzGanada.en - 1))
        this.kit.empezarLaCancion();
    }
    this.kit.paso(dt, {
      megafonia: this.megafoniaSuena || this.dicho("aproximacion"),
      callada: this.charla.callada,
      pared: this.pared(),
    });
    /*
     * Lo que un juego quería decir y no le llegó el turno se calla con él: al
     * cerrar el kit y al cambiar de juego. Sin esto, con las piezas puestas
     * deprisa, «¡el ala!» sonaba con el mapa del camino ya delante.
     */
    const abierto = this.kit.estaAbierto;
    const juego = this.kit.juegoDeAhora;
    /*
     * **Y bajando de los diez mil pies, el kit deja la palabra a la
     * tripulante**: lo que esperaba turno se quita y lo nuevo no entra, hasta
     * que pida guardarlo. Pedirlo es una charla, que espera su rato de
     * silencio, y con las piezas puestas deprisa las frases del kit se
     * encadenaban sin dejarlo: medido en el banco, la tripulante no encontró
     * hueco y el kit lo recogió la red a 9.015 ft, con la llegada ya empezada,
     * que se vive sin juego delante. Ver el momento `kitRecoger`.
     */
    const aGuardar = abierto && !l.enTierra && bajando(l.tramo) && l.altitud < DIEZ_MIL_PIES;
    if ((this.kitAbierto && !abierto) || juego !== this.juegoDelKit || aGuardar) this.charla.quitar(esDelKit);
    this.kitAbierto = abierto;
    this.juegoDelKit = juego;
    const lineas = this.kit.tomarLoQueDecir();
    if (lineas.length && !aGuardar) this.charla.decir(lineas);
  }

  /**
   * **La consola de la pantalla del asiento, al ritmo del vuelo.** Lo que se toca lo
   * apunta el dibujo y aquí se atiende: el plano, el kit, el cuento y las frases.
   *
   * - El botón sale desde el momento que diga el guion, nunca con láminas delante.
   * - **A los diez mil pies bajando se recoge todo**, en el mismo paso en que se
   *   apaga el ⏩: «ese momento es mágico», y se vive sin nada delante. Se le pide al
   *   dibujo y, si no contesta, la red: ver `TOPE_DE_RECOGER`.
   * - **El kit es el de siempre**: se da y se abre al tocar sus juegos, y se pausa con la
   *   megafonía por su sitio, ver `atenderAlKit`. Si quien juega lo guarda con su
   *   botón, la consola vuelve al mapa.
   */
  private atenderALaConsola(l: LecturaDelPasaje): void {
    const c = this.consola;
    const def = this.guion.consola;
    if (!c || !def) return;
    const pared = this.pared();
    if ((this.llegadaDesde !== null || l.enTierra) && c.pedirRecoger(pared)) {
      this.kit.recoger();
      this.cortarElCuento();
      this.charla.decir([def.seRecoge]);
      this.pedidas.add(def.seRecoge.clave);
    }
    c.paso({ sale: !this.enLaApertura && this.dicho(def.desde), escuchando: this.megafoniaSuena, pared });
    if (c.estaAbierta && !this.miraLaConsola) {
      this.miraLaConsola = true;
      this.ponerPlano("respaldo");
      this.mira = null;
      // Ya la está viendo: lo del botón sobra, y lo que hay dentro, una vez por vuelo.
      this.explicaElBoton = false;
      if (this.explicaLoQueHay) {
        this.explicaLoQueHay = false;
        this.charla.decir([def.loQueHay]);
        this.pedidas.add(def.loQueHay.clave);
      }
    } else if (!c.estaAbierta && this.miraLaConsola) {
      this.miraLaConsola = false;
      this.cortarElCuento();
      if (this.kit.estaAbierto) this.kit.cerrar();
      this.ponerPlano("ventanilla");
    }
    if (!c.estaAbierta) {
      this.pestanaAtendida = "mapa";
      return;
    }
    const p = c.pestanaDeAhora;
    if (p !== this.pestanaAtendida) {
      if (this.pestanaAtendida === "juegos") this.kit.cerrar();
      if (this.pestanaAtendida === "cuentos") this.cortarElCuento();
      if (p === "juegos") {
        this.kit.dar();
        this.kit.abrir();
      }
      this.pestanaAtendida = p;
    } else if (p === "juegos" && !this.kit.estaAbierto) c.elegir("mapa");
    this.atenderAlCuentoDeLaConsola(c);
  }

  /** Lo que se ve y lo que suena de un cuento tienen que ir juntos, y lo manda quien lo toca. */
  private atenderAlCuentoDeLaConsola(c: ConsolaDelAsiento): void {
    const quiere = c.cuentoDeAhora;
    // Se tocó «atrás», u otro: el que sonaba se calla.
    if (this.cuentoSonando !== null && this.cuentoSonando !== quiere) this.cortarElCuento();
    if (quiere === null) {
      this.cuentoPorSonar = null;
      return;
    }
    // Se acabó de contar: otra vez la lista. Con el silencio de después, no a media palabra.
    if (this.cuentoSonando === quiere) {
      if (this.charla.callada) {
        this.cuentoSonando = null;
        c.dejarElCuento();
      }
      return;
    }
    this.cuentoPorSonar = quiere;
  }

  /**
   * **Un cuento pedido, en un hueco del guion.** Va detrás de lo que tiene su momento,
   * con un silencio algo más largo que el que espera cualquier momento: así un cuento
   * detrás de otro no le quita nunca el turno al anuncio de la bajada, que se salta si
   * no le llega a tiempo. Devuelve si se empezó a contar.
   */
  private atenderAlCuento(): boolean {
    const sitio = this.cuentoPorSonar;
    if (sitio === null || this.callada < CALLA_ANTES_DEL_CUENTO) return false;
    this.cuentoPorSonar = null;
    this.cuentoSonando = sitio;
    this.charla.decir([lineaDelCuento(sitio)]);
    return true;
  }

  /** Si lo que suena es un cuento, se calla; solo entonces: a nadie más se le corta. */
  private cortarElCuento(): void {
    this.cuentoPorSonar = null;
    if (this.cuentoSonando === null) return;
    this.cuentoSonando = null;
    if (esDeUnCuento(this.charla.ultima)) this.charla.callar();
  }

  /**
   * **La megafonía manda**: lo que se juega se pausa y sigue, y un cuento no se puede
   * pausar a media grabación, así que se corta y al acabar el anuncio vuelve a
   * empezar: el dibujo se queda delante, con el altavoz encima. Se mira como si ya
   * hubiera silencio, que es lo que le falta a lo que espera turno detrás de él.
   */
  private laMegafoniaMandaSobreElCuento(def: DefMomento<M, M, C>, l: LecturaDelPasaje): void {
    if (this.cuentoSonando === null) return;
    const e = this.dentroDe(CALLA_ANTES_DEL_CUENTO);
    if (!def.cuando(l, e) || def.caduca?.(l, e) || !(def.segun?.(l, e) ?? def.lineas).some((x) => x.megafonia)) return;
    const vuelve = this.cuentoSonando;
    this.cortarElCuento();
    this.cuentoPorSonar = vuelve;
  }

  /**
   * **Se explica la consola en este vuelo**: lo dice el juego al salir el botón, con lo
   * guardado de este perfil. El botón, en un hueco; lo que hay dentro, al abrirla.
   */
  explicarLaConsola(): void {
    this.explicaElBoton = true;
    this.explicaLoQueHay = true;
  }

  /** **«No volver a explicar»**: lo que quedaba por decir, fuera. */
  olvidarLaExplicacionDeLaConsola(): void {
    this.explicaElBoton = false;
    this.explicaLoQueHay = false;
    const def = this.guion.consola;
    if (def) this.charla.quitar((x) => x.clave === def.elBoton.clave || x.clave === def.loQueHay.clave);
  }

  /**
   * **Lo del botón, en un silencio y con la ventanilla delante**: detrás de lo que se
   * dijo al abrirla y del anuncio, que espera algo menos. Una frase, y solo si nadie ha
   * tocado todavía el botón. Devuelve si se dijo.
   */
  private atenderALaExplicacionDelBoton(): boolean {
    const def = this.guion.consola;
    if (!def || !this.explicaElBoton || this.callada < EL_BOTON_SE_EXPLICA_TRAS || this.miraLaConsola) return false;
    if (!this.consola?.estado.sale) return false;
    this.explicaElBoton = false;
    this.charla.decir([def.elBoton]);
    this.pedidas.add(def.elBoton.clave);
    return true;
  }

  /** Solo para el banco: se salta lo de antes de ver el mundo, y se va a abrir la ventanilla. */
  saltarLaAperturaParaBanco(): void {
    const a = this.guion.apertura;
    if (!a || !this.enLaApertura) return;
    this.charla.callar();
    while (this.def.id !== a.hasta && this.def.id !== "fin") {
      this.saltados.push(this.def.id);
      this.indice++;
    }
  }

  /**
   * La primera charla que viene a cuento ahora, si hay alguna. **Y lo que
   * nombra del paisaje, solo si se ve**: ver `SitioDelPaisaje`.
   */
  private charlaQueToca(
    l: LecturaDelPasaje,
    sin?: ReadonlySet<C>,
  ): { def: DefCharla<M, C>; vista?: VistaDelSitio } | undefined {
    for (const c of this.guion.charlas) {
      if (sin?.has(c.id)) continue;
      if (this.charlasDichas.includes(c.id) || this.callada < this.trasDe(c) || !c.cuando(l, this) || c.caduca?.(l, this))
        continue;
      const vista = this.vistaDe(c, l);
      if (vista === null) continue;
      return { def: c, ...(vista ? { vista } : {}) };
    }
    return undefined;
  }

  /** El silencio que espera una charla: el suyo, o menos si esperó a que Ara se despertara. */
  private trasDe(c: DefCharla<M, C>): number {
    return this.siestas.length > 0 && !this.durmiendo ? (this.guion.siesta.trasAlDespertar[c.id] ?? c.tras) : c.tras;
  }

  /**
   * **Cuánto falta para lo siguiente que Ara tiene que oír**, s de vuelo,
   * y si es la bajada: lo que se puede dormir. Solo se sabe para dos momentos
   * del guion, que son los que llegan con el vuelo y no con lo que se dice:
   * el «ya estamos arriba» —al nivelar, más lo que espera nivelado— y el
   * empezar a bajar. Con cualquier otro por decir, o sin los dos números del
   * juego, `null`: no se duerme.
   */
  private ratoTranquilo(l: LecturaDelPasaje): { readonly segundos: number; readonly paraBajar: boolean } | null {
    const bajada = l.hastaLaBajada;
    if (bajada === undefined || !volando(l) || bajando(l.tramo)) return null;
    let guion: number;
    if (this.def.id === "arriba") {
      if (l.tramo === "crucero") guion = Math.max(0, ARRIBA_Y_NIVELADO - l.enTramo);
      else if (l.hastaElCrucero === undefined) return null;
      else guion = l.hastaElCrucero + ARRIBA_Y_NIVELADO;
    } else if (this.def.id === "bajada") guion = Infinity;
    else return null;
    return guion < bajada ? { segundos: guion, paraBajar: false } : { segundos: bajada, paraBajar: true };
  }

  /**
   * **Si Ara se duerme ahora** (punto 304 de la lista de Enrique). Lo pidió
   * al volar la escena entera: «la idea era que el niño no se aburra
   * esperando a aterrizar; esto tarda, y en un avión aguantan porque no les
   * queda otra, pero en casa se aburren. Que haga como que se duerme, un
   * fundido, rapidillo, y luego despierta y ha pasado un rato».
   *
   * Y se duerme como se duerme en un avión: **arriba y sin nada que mirar**,
   * con el ruidito de los motores. Así que hace falta todo esto:
   *
   * - **Arriba**, antes de bajar: pasados los diez mil pies y fuera de las
   *   nubes, subiendo o en crucero. **Bajando, nunca**: durmiendo se traga menos
   *   saliva, y al bajar es cuando la presión de la cabina empuja los oídos.
   *   Es lo que aconsejan los médicos —no dormirse para despegar ni para
   *   aterrizar—, y por eso la tripulación despierta a quien duerme.
   * - **Nada que decir ni que ver** (19-10-2026): nadie hablando desde hace
   *   `CALLA_PARA_DORMIRSE`, nada del guion a punto, nada señalado esperando y
   *   **lo que contesta a Ara ya dicho**: pasados los diez mil pies, la
   *   comandante explica las nubes y el gas de subida, y en cuanto acaba, Ara
   *   cierra los ojos. Lo que puede esperar —ver `PUEDEN_ESPERAR`— se cuenta al
   *   despertar, bajando por encima de los diez mil pies, donde sigue siendo
   *   verdad. Y si lo más bonito de la ruta está a la vista sin señalar —el
   *   Teide—, se espera a que lo señale la comandante.
   * - **Sin el kit en las manos**: quien está jugando no se aburre.
   * - **Y con rato por delante, de verdad**: lo que falta para lo siguiente que
   *   hay que oír —ver `ratoTranquilo`— da para el bostezo y una siesta de
   *   `SIESTA_MINIMA` como poco. Con la siesta de antes, de minuto y medio,
   *   Enrique se despertó viendo lo mismo que al dormirse: lo que se duerme
   *   tiene que notarse en el mapa y por la ventanilla.
   *
   * **Lo que hay que oír sí o sí no se lo come el sueño.** Lo que despierta a
   * Ara es lo que despierta a medio avión: el *ding* de la luz del cinturón
   * que se apaga con el «ya estamos arriba». Y si antes llegara la bajada, la
   * tripulante, que es lo que se hace de verdad. Ver `atenderALaSiesta`.
   *
   * Medido en el banco el 19-10-2026: de los diez mil pies al crucero son unos
   * cuatro minutos y medio de subida, y la comandante habla el primer medio.
   * Es el rato más largo en el que Ara puede dormir sin comerse nada: el
   * crucero dura un minuto y lleva el baño y el servicio, y en cuanto se
   * empieza a bajar están los oídos.
   *
   * Una vez por vuelo. Lo que se habría contado mientras duerme no se cuenta
   * después fuera de su momento: lo señalado no se señala —Ara no lo ve— y
   * lo que se cuenta cuando viene a cuento solo se cuenta si sigue viniendo.
   *
   * Con `trasElBostezo`, al acabar de bostezar: el silencio ya no cuenta, que
   * acaba de hablar Ara. Y con `soloElRato`, si va a poder dormirse en cuanto
   * haya el silencio y se haya visto lo que hay que ver: lo que puede esperar,
   * espera desde ya.
   */
  /**
   * **Si lo siguiente es el kit y está a punto de llegar**: en la bajada, a
   * menos de `ANTES_DEL_KIT` metros de su sitio y sin haberlo traído.
   *
   * El kit llega a los 104 km de la pista tras diez segundos callados, y una
   * charla que viene a cuento —el ala de la comandante, con quince— podía
   * colarse en ese mismo silencio si la bajada llegaba a los 104 km un
   * segundo tarde. Entonces el kit se iba treinta segundos más allá, detrás
   * del ala, y caía encima de lo que la comandante señala por la ventanilla:
   * medido en el banco del vuelo entero, el kit a los 1.085 s en vez de a los
   * 1.049, la ventanilla a los 46 s y «Armá tu avión» sin rato. Se vio al
   * meter el relieve fino del ADR 0022, que adelanta o retrasa un poco cuándo
   * se nombra el paisaje, pero la carrera estaba: en el vuelo medido del
   * banco, el kit y el ala se podían decir en el mismo instante. Así que lo
   * que viene a cuento espera al kit; lo que tiene su momento —el guion, la
   * ventanilla— no.
   */
  private kitAPuntoDeLlegar(def: DefMomento<M, M, C>, l: LecturaDelPasaje): boolean {
    const kit = this.guion.kit;
    return (
      kit !== null &&
      def.id === kit.momento &&
      l.tramo === "bajada" &&
      !this.kit.esDado &&
      l.faltaParaTocar < kit.llegaA + ANTES_DEL_KIT &&
      !cabinaPreparada(l, this) &&
      l.altitud >= DIEZ_MIL_PIES + KIT_POR_ENCIMA
    );
  }

  private puedeDormirse(l: LecturaDelPasaje, trasElBostezo = false, soloElRato = false): boolean {
    if (this.guion.siesta.sinSiesta || this.siestas.length > 0 || this.acabado || this.bostezando || this.miraLaConsola) return false;
    if (!volando(l) || l.tramo === "bajada" || l.altitud < DIEZ_MIL_PIES || l.enNube >= DENTRO_DE_LA_NUBE) return false;
    if (!trasElBostezo && !soloElRato && this.callada < CALLA_PARA_DORMIRSE) return false;
    if (this.porSenalar.length > 0 || this.contestacion || this.toquePendiente || this.kit.estaAbierto || this.kit.ocupaAAra)
      return false;
    if (this.def.cuando(l, this)) return false;
    if (this.quedaPorContestar(l)) return false;
    const rato = this.ratoTranquilo(l);
    if (!rato) return false;
    const despierta = rato.paraBajar ? DESPIERTA_ANTES_DE_BAJAR : 0;
    if (rato.segundos < (trasElBostezo ? 0 : LO_QUE_DURA_EL_BOSTEZO) + SIESTA_MINIMA + despierta) return false;
    return trasElBostezo || soloElRato || this.callada >= ESPERA_A_LO_QUE_SE_VE || !this.quedaPorVer(l);
  }

  /**
   * **Si queda algo que contestar** antes de cerrar los ojos: una charla que ya
   * viene a cuento y no puede esperar a que Ara se despierte, como la del gas
   * de subida. Ver `PUEDEN_ESPERAR`.
   */
  private quedaPorContestar(l: LecturaDelPasaje): boolean {
    return this.guion.charlas.some(
      (c) => !this.guion.siesta.puedenEsperar.has(c.id) && !this.charlasDichas.includes(c.id) && c.cuando(l, this) && !c.caduca?.(l, this),
    );
  }

  /** **Si lo más bonito de la ruta está a la vista sin señalar**: ver `SE_ENSENA_ANTES_DE_DORMIRSE`. */
  private quedaPorVer(l: LecturaDelPasaje): boolean {
    return this.guion.siesta.antesDeDormirse.some(
      (que) => !this.senalados.includes(que) && !this.olvidados.includes(que) && this.seVe(`hito:${que}`, l),
    );
  }

  /** **Ara bosteza** y lo dice, mirando por la ventanilla: al acabar, cierra los ojos. */
  private bostezar(): void {
    this.ponerPlano("ventanilla");
    this.bostezando = true;
    this.mira = null;
    this.charla.decir([this.guion.siesta.seDuerme]);
  }

  /** **Y se duerme**: desde aquí, la escena calla y el juego funde la pantalla. */
  private dormirse(l: LecturaDelPasaje): void {
    const s = { desde: this.reloj, hasta: null, paraBajar: false };
    this.siestaDeAhora = s;
    this.siestas.push(s);
    this.mira = null;
    this.saltoDeEstaSiesta = this.guion.siesta.salto?.(this, l) ?? null;
    // El modo rápido sigue puesto, pero durmiendo corre la siesta: ver `sePuedeCorrer`.
    this.parar();
  }

  /**
   * **Mientras Ara duerme**, solo se mira si toca despertar, y **lo que
   * despierta es algo que pasa de verdad** (19-10-2026):
   *
   * - **El *ding* de la luz del cinturón**, que se apaga con el «ya estamos
   *   arriba» de la comandante y despierta a medio avión. Ara se despierta
   *   en el paso en que toca decirlo, la comandante lo dice —con su *ding*— y
   *   Ara cuenta detrás que se durmió, con el mapa de lo que se voló. Ver
   *   `avanzar`.
   * - **La tripulante, si la bajada llega con Ara durmiendo** y sin *ding*: es
   *   lo que se hace de verdad, despertar al pasaje al empezar a bajar, por el
   *   cinturón y los oídos. Lo dice ella, `DESPIERTA_ANTES_DE_BAJAR` antes del
   *   punto de descenso, que es antes de que la cabina empiece a bajar.
   * - **Y cualquier otra cosa del guion que llegue**, o el vuelo que haga
   *   otra cosa: se despierta ya, por su cuenta.
   */
  private atenderALaSiesta(l: LecturaDelPasaje): void {
    const s = this.siestaDeAhora;
    if (!s) return;
    // Con un salto por delante manda él: lo de después del corte se mira después del corte.
    if (this.saltoDeEstaSiesta !== null) return;
    const toca = this.def.cuando(l, this);
    if (toca && this.def.id === "arriba") {
      this.despertar(s, "ding");
      this.despiertaConElDing = true;
      return;
    }
    const rato = this.ratoTranquilo(l);
    if (rato && !toca && (rato.paraBajar ? rato.segundos > DESPIERTA_ANTES_DE_BAJAR : true)) return;
    const paraBajar = rato ? rato.paraBajar : bajando(l.tramo) || this.def.id === "bajada";
    this.despertar(s, paraBajar ? "tripulante" : "otra");
    const { laDespiertan, seDespierta } = this.guion.siesta;
    this.charla.decir(paraBajar ? [laDespiertan, seDespierta] : [seDespierta]);
  }

  /** Se acabó la siesta, por lo que sea. */
  private despertar(s: { hasta: number | null; paraBajar: boolean; porQue?: Siesta["porQue"] }, porQue: NonNullable<Siesta["porQue"]>): void {
    s.hasta = this.reloj;
    s.paraBajar = porQue === "tripulante";
    s.porQue = porQue;
    this.siestaDeAhora = null;
  }

  /**
   * **Y de vuelta a la ventanilla**, en un silencio y pasado lo que dura el
   * plano: lo de fuera se queda a que se vea lo que se contaba, y Ara se
   * despega del cristal cuando acaba de mirar.
   */
  private volverALaVentanilla(): void {
    if (this.plano === "ventanilla") return;
    if (this.reloj - this.planoDesde < DURA_EL_PLANO[this.plano] || this.callada < 0.6) return;
    this.ponerPlano("ventanilla");
  }

  /**
   * **Lo señalado**: la comandante por la megafonía, su historia detrás, y Ara
   * si va por su lado. Lo que va por el otro lado lo cuenta la comandante
   * igual —le habla a todo el pasaje— y Ara no lo ve, así que no dice nada.
   */
  private decirLoSenalado(s: Senalado, v: VistaDelSitio): void {
    const sitio: SitioDelPaisaje = `hito:${s.que}`;
    this.ponerPlano(planoParaVer(v.como ?? "ventanilla", sitio), sitio);
    /*
     * **Y el lado de ahora**, no el de cuando se vio: si el avión giró, la
     * comandante manda mirar por donde está. Ver `Senalado.porLado`.
     */
    const lado = v.lado ?? s.lado;
    const dicho = s.porLado?.[lado] ?? s.dicho;
    if (v.como) {
      this.apuntarLoNombrado(sitio, dicho.clave, v);
      this.verLo(selloDe(sitio));
    }
    const lineas: Linea[] = [
      { quien: "mama", clave: dicho.clave, megafonia: true, texto: dicho.texto, relleno: dicho.relleno },
    ];
    if (s.historia)
      lineas.push({
        quien: "mama",
        clave: s.historia.clave,
        megafonia: true,
        texto: s.historia.texto,
        relleno: s.historia.relleno,
        // Y su ilustración en la ventanita, la de las historias de cualquier vuelo.
        ...(s.historia.sitio ? { dibujo: `foto:${s.historia.sitio}` } : {}),
      });
    const suLado = lado === (this.opciones.lado ?? this.guion.lado);
    if (suLado) {
      const { suyas, loVeo, contestaALaHistoria } = this.guion.senalado;
      const suya = suyas[s.que];
      /*
       * **Y Ara contesta a lo que se ha oído** (punto 287): se ponía a la cola
       * con lo demás, y «¿hablar silbando?» salía detrás de una historia del
       * silbo que no había sonado. Así que espera a que acabe lo de la
       * comandante, y solo si sonó: lo que la señala y, si contesta a la
       * historia, la historia.
       */
      const oir = [dicho.clave, ...(s.historia && contestaALaHistoria.has(s.que) ? [s.historia.clave] : [])];
      /*
       * Y sin repetir lo que Ara ya dijo al tocarlo: si al tocar el Teide ya
       * dijo lo suyo, ahora no lo dice otra vez. Ver `tocar`.
       */
      const contesta = [suya ? { ...suya } : loVeo, loVeo].find((x) => !this.porUnToque.has(x.clave)) ?? null;
      if (contesta) {
        this.contestacion = { linea: contesta, oir, desde: this.reloj };
        this.pedidas.add(contesta.clave);
      }
      this.mira = "ventanilla";
      this.miraDesde = this.reloj;
    }
    this.senalados.push(s.que);
    this.charla.decir(lineas);
  }

  /**
   * **Lo que se deja hacer a la tripulación**: arrancar con los toboganes
   * armados, rodar con los motores ya oídos, y entrar en pista con la
   * tripulación de cabina sentada. Ver `PermisosDeLaEscena`.
   */
  private permisos(l: LecturaDelPasaje): PermisosDeLaEscena {
    const ahora = this.pared();
    // La red de la espera cuenta desde que se pidió «sentados para el despegue».
    if (l.tramo === "esperando" && (this.dicho("despegue") || this.saltado("despegue")))
      this.enLaEsperaDesde ??= ahora;
    if (l.tramo === "entrando" && l.alineado) this.alineadoDesde ??= ahora;
    const enLaEspera = this.enLaEsperaDesde === null ? 0 : ahora - this.enLaEsperaDesde;
    const alineado = this.alineadoDesde === null ? 0 : ahora - this.alineadoDesde;
    /*
     * Una vez dados, se quedan: lo que ya se hizo no se deshace. Y **lo que
     * espera a una frase espera a que se haya oído**, no a que se haya pedido
     * ni a que la escena la diera por perdida: ver `Conversacion.oida`.
     */
    this.dados = {
      arrancar: this.dados.arrancar || this.charla.oida("comandante.crosscheck") || this.saltado("puertas"),
      rodar: this.dados.rodar || (this.dicho("motores") && this.charla.callada),
      entrar: this.dados.entrar || this.charla.oida("comandante.despegue") || enLaEspera >= RED_DE_LA_ESPERA,
      /*
       * **Y no se da gas con Ara a media frase**: alineados, la tripulación
       * espera a que acabe lo que se está diciendo —«¡ahora sí que vamos a
       * despegar!»—, que es lo que hace que «¡cómo empuja!» llegue con el
       * empuje. Como un «alineado y espere» de la torre: unos segundos.
       */
      despegar:
        this.dados.despegar ||
        (this.dicho("despegue") && this.charla.callada) ||
        this.saltado("despegue") ||
        alineado >= RED_DE_LA_CABECERA,
    };
    return this.dados;
  }

  /**
   * **Y un anuncio de tierra se pide cuando el juego dice que vale**, que es
   * quien lo tira si no. La bienvenida se pedía en cuanto la tripulación
   * echaba a rodar, y para el juego eso todavía era «arrancando» —la fase
   * cambia con medio segundo de histéresis y con el avión pasando de dos
   * metros por segundo—: la boca la tiraba en el acto, «ya no es verdad», y
   * no sonaba. Medido en el banco con las tomas grabadas. Así que se espera a
   * la fase del juego, con su red: ver `RED_DEL_ANUNCIO`.
   */
  private esperaSuFase(def: DefMomento<M, M, C>, l: LecturaDelPasaje): boolean {
    const fase = l.fase;
    const aDestiempo =
      fase !== undefined &&
      (def.segun?.(l, this) ?? def.lineas).some((x) => x.megafonia && seLePasoElMomento(x.clave, fase));
    if (!aDestiempo) {
      this.aDestiempoDesde = null;
      return false;
    }
    this.aDestiempoDesde ??= this.pared();
    return this.pared() - this.aDestiempoDesde < RED_DEL_ANUNCIO;
  }

  private aDestiempoDesde: number | null = null;

  private dados: PermisosDeLaEscena = { arrancar: false, rodar: false, entrar: false, despegar: false };
}
