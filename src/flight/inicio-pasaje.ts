/**
 * **La tercera escena del modo inicio: el primer vuelo de pasajero de Ara.**
 *
 * Las dos primeras enseñan a despegar y a aterrizar con Jazlyn al lado. Esta
 * es la otra primera vez, la que casi todo el mundo tiene antes que la de
 * pilotar: **subirse a un avión de línea**. Ara va en el asiento de la
 * ventanilla —sin género: la escena no dice si es niño o niña— y Jazlyn es
 * la comandante, en la cabina de mando, hablando por la megafonía.
 * No se toca ningún mando: es mirar y escuchar. Lo lleva la tripulación, como
 * en un vuelo de verdad; ver `vuelo-de-linea.ts`.
 *
 * Se abre con su ficha en «¿A qué jugás?» o con `?inicio=3`. No es la
 * primera experiencia: esa sigue siendo el despegue.
 *
 * ## El vuelo
 *
 * **De Los Rodeos a La Palma**, en el JAZ 90, que es un reactor regional de su
 * clase —en Canarias los saltos entre islas los hacen turbohélices y reactores
 * regionales—, con el día de siempre del norte de Tenerife: el alisio del
 * nordeste y su mar de nubes a unos mil quinientos metros, que se atraviesa al
 * subir. Es el tramo donde más hay que contar por la ventanilla: el valle de
 * La Orotava, el Teide asomando por encima de las nubes y La Gomera, las tres
 * por el mismo lado —el izquierdo, que es donde va Ara—, y las tres con su
 * historia. Ver `lo-que-se-ve-en-ruta.test.ts`.
 *
 * ## Contado de verdad, y sin aburrir
 *
 * Enrique, al probar la primera versión: le gustó, pero «está todo el tiempo
 * la vista de ventanilla, eso lo hace aburrido», no se oía a la tripulación
 * enseñar el cinturón y el chaleco, y había ratos de cinco minutos sin nada.
 * «La experiencia de montar en un vuelo hay que contarla, explicarla con
 * cariño y que el niño entienda todo lo que está pasando.» Así que la escena
 * lleva tres cosas más, cada una en su sitio:
 *
 * - **Los planos.** De vez en cuando el avión se ve por fuera —rodando, al
 *   despegar, en el giro, una vuelta alrededor, el ala, al tocar— y se vuelve
 *   a la ventanilla; y Ara **se pega al cristal** cuando hay algo que mirar.
 *   Se ve por fuera lo que se está contando, y el cambio cae siempre en un
 *   silencio, nunca a media frase. Ver `Plano` y `CORTE_DE_PLANO`.
 * - **La tripulación de cabina, en persona.** Da la demostración de
 *   seguridad por la megafonía, como en cualquier vuelo, y además **se acerca
 *   a Ara** y le habla bajito, sin altavoz —revisa el cinturón, le trae el
 *   agua, le explica las nubes, el motor, las islas—, que es lo que hace una
 *   tripulante de verdad con un niño que vuela por primera vez. Jazlyn sigue
 *   hablando por la megafonía para todos.
 * - **Lo que se cuenta en los ratos callados**, las «charlas»: no van en un
 *   orden fijo sino cuando vienen a cuento —el giro cuando se gira, el ruido
 *   del tren cuando se guarda, las nubes otra vez al cruzarlas bajando— y,
 *   las explicaciones, después de un rato de silencio y en su tramo del vuelo.
 *   Ver `CHARLAS_DEL_PASAJE`.
 *
 * Y lo que se explica lleva su **dibujo en la ventanita** de cristal —ver
 * `ui/dibujos-del-pasaje.ts`—; y lo que pasa, a veces, su **ilustración**:
 * la cabina vacía del embarque, la cabina llena, la tripulante al lado de Ara,
 * Ara con la cara contra el cristal y la comandante en su cabina. Ver
 * `ui/ilustraciones.ts` y `ilustrada`.
 *
 * ## Lo que pasa, en el orden de un vuelo de verdad
 *
 * 1. **El asiento**: Ara se pega a la ventanilla y descubre el ala y el
 *    motor. Su asiento es el que los deja ver: ver `asientoDeAra`. Mientras
 *    se acaba de embarcar, el hilo musical: ver `audio/hilo-musical.ts`.
 * 2. **El cinturón**: la tripulación da la bienvenida y pide abrocharlo, y Ara
 *    se lo abrocha —el dibujo de la hebilla, y el cartel encendido—.
 * 3. **Las puertas**: la comandante manda armar los toboganes y Ara se da
 *    cuenta de que ya se van. Con eso, la tripulación de mando arranca.
 * 4. **Los motores**, que se oyen arrancar, y Ara con la cara contra el cristal.
 * 5. **El rodaje**, visto por fuera, con la bienvenida de la comandante.
 * 6. **La demostración de seguridad**, por la megafonía: el cinturón, las
 *    salidas y sus luces del suelo, las máscaras, el chaleco, la tarjeta y el
 *    modo avión. Ver `DEMOSTRACION` para el porqué de cada cosa y su orden.
 * 7. **La revisión**: la tripulante pasa mirando cinturones y le cuenta a Ara
 *    por qué la persiana va subida.
 * 8. **La espera** antes de la pista, y el permiso de la torre.
 * 9. **El despegue**, visto por fuera; el empuje, el tren que se guarda, el
 *    giro y las nubes por dentro.
 * 10. **Arriba**: la respuesta de las nubes, una vuelta alrededor del avión, el
 *     servicio y la tripulante con Ara: las nubes de cerca.
 * 11. **La bajada**, los oídos, **el kit de viaje** —dos juegos que trae la
 *     tripulante para el tramo largo, ver `kit-de-viaje.ts`—, la isla y la
 *     cabina preparada, que es cuando se guarda el kit.
 * 12. **La aproximación**: el ala estirando los flaps, el tren, y la toma vista
 *     desde el borde de la pista.
 * 13. **La llegada**, rodando por fuera, y en el puesto la despedida.
 *
 * ## Quién contesta, y cómo
 *
 * **La comandante no le contesta a un pasajero por la megafonía**, y aquí no
 * lo hace. Ara habla bajito con quien va a su lado —quien juega, o quien le
 * acompañe—; lo que contesta sus preguntas es lo que de verdad se dice en un
 * avión: anuncios **para todo el pasaje**, de los que dan las comandantes
 * «para quienes vuelan hoy por primera vez», y **la tripulante de cabina**,
 * que sí se acerca al asiento. Ara pregunta primero, y la respuesta llega
 * después y en su momento, nunca encima.
 *
 * ## Un suceso, una voz
 *
 * Las mismas reglas que las otras dos escenas, con la misma cola de frases:
 * ver `conversacion.ts`. Nada se dice encima de nada, lo que ya no viene a
 * cuento se salta —una exclamación de la carrera no se dice volando—, y lo que
 * no tiene voz grabada espera el rato de leerlo.
 *
 * Esto es solo la secuencia: no toca el DOM, ni el modelo de vuelo, ni el
 * audio. Lo engancha `game.ts`, que además pone la cámara de cada plano —ver
 * `cameras/escena.ts`— y lo dibuja `ui/inicio.ts`.
 */

import { seLePasoElMomento } from "../audio/megafonia";
import type { DibujoDelPasaje } from "../ui/dibujos-del-pasaje";
import type { IlustracionDelPasaje } from "../ui/ilustraciones";
import { Conversacion, type FraseDicha, type Linea, type VozDelInicio } from "./conversacion";
import { KitDeViaje, LINEAS_DEL_KIT, type EstadoDelKit } from "./kit-de-viaje";
import type { Fase } from "./vuelo";
import type { PermisosDeLaEscena, TramoDeLinea } from "./vuelo-de-linea";

/** Diez mil pies, m: por debajo, la cabina de mando no habla de nada que no sea volar. */
export const DIEZ_MIL_PIES = 10000 * 0.3048;

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
 */
export type Plano =
  | "ventanilla"
  | "asomado-motor"
  | "asomado-abajo"
  | "fuera-rodando"
  | "fuera-despegue"
  | "fuera-giro"
  | "fuera-vuelta"
  | "fuera-ala"
  | "fuera-pista";

/** Si el plano es del avión por fuera. */
export const esDeFuera = (p: Plano): boolean => p.startsWith("fuera-");

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
};

export type MomentoDelPasaje =
  | "ventanilla"
  | "cinturon"
  | "puertas"
  | "motores"
  | "bienvenida"
  | "demostracion"
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
  | "isla"
  | "aproximacion"
  | "tcpAterrizaje"
  | "flaps"
  | "aterrizando"
  | "toma"
  | "llegada"
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
  | "cinturonQuieto"
  | "despacito"
  | "repaso";

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
  readonly historia: {
    readonly texto: string;
    readonly clave: string;
    readonly relleno: Readonly<Record<string, string>>;
    /** La clave de su foto, si la tiene: sale en la ventanita mientras se cuenta. */
    readonly sitio?: string;
  } | null;
}

// ── Los números ──────────────────────────────────────────────────────────

const GRADO = Math.PI / 180;
/** Lo que se espera sentado antes de hablar, s: el rato de mirar alrededor. */
const AL_SENTARSE = 1.5;
/**
 * **Y el rato de embarcar**, s callados después de lo primero que dice Ara,
 * antes de que la tripulación dé la bienvenida: lo que tarda en sentarse el
 * resto del pasaje, con el hilo musical sonando por el techo. Ver
 * `audio/hilo-musical.ts`.
 */
const EMBARCANDO = 8;
/** Entre el cinturón y las puertas, s: se termina de embarcar. */
const HASTA_LAS_PUERTAS = 2.5;
/** Con los motores ya en marcha, s, antes de decir que se oyen. */
const MOTORES_EN_MARCHA = 3;
/** Parado en la doble raya, s, antes de preguntar por qué. */
const PARADO_EN_LA_ESPERA = 1.5;
/**
 * **Cuánto arriba, nivelado, antes de apagar el cartel**, s. Poco: en un salto
 * entre islas el crucero dura unos minutos, y el servicio va detrás.
 */
const ARRIBA_Y_NIVELADO = 2;
/** Y del cartel al servicio, s. */
const HASTA_EL_SERVICIO = 3;
/** Y del anuncio del servicio a que la tripulante llega al asiento de Ara, s. */
const HASTA_EL_ASIENTO = 5;
/** Y de la toma a decir que se tocó, s: las ruedas, y la reversa ya rugiendo. */
const DESPUES_DE_TOCAR = 1.2;
/**
 * **A cuánto del umbral se prepara la cabina para aterrizar**, m: por encima
 * de la final, como en `EN_APROXIMACION` de la megafonía.
 */
const PREPARAR_LA_CABINA = 28000;
/**
 * **Cuánto dentro de una nube para decir que se está dentro**: un tercio,
 * que es cuando la ventanilla ya se ve blanca. Ver `cuantoDentro`.
 */
const DENTRO_DE_LA_NUBE = 0.35;
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
 * **Los tramos de la bajada**, m que faltan para tocar: desde dónde se cuenta
 * cada cosa. Una bajada entre islas son quince minutos, y sin repartirlos lo
 * explicado se decía todo seguido al empezar a bajar y el resto callaba: dos
 * minutos sin nada, tres veces. Repartidos con la bajada medida en el banco
 * —de 131 km a 13 km en 904 s—, cada cosa cae a un minuto de la anterior.
 */
const BAJANDO = {
  /**
   * **El kit de viaje**, pasado lo último que se señala por la ventanilla y
   * con más de cinco minutos de bajada por delante sin megafonía: el tramo
   * tranquilo. Medido con la bajada del banco, cae hacia los 84 km.
   */
  kit: 84000,
  motor: 112000,
  islas: 99000,
  marQuieto: 86500,
  ruta: 78500,
  papi: 66000,
  bano: 60000,
  estrellas: 54000,
} as const;
/** Lo que se calla la escena antes de que llegue la tripulante con el kit, s. */
const CALLA_ANTES_DEL_KIT = 10;
/** Lo que se queda el dibujo de la ventanita después de la última frase, s. */
const SE_QUEDA_LA_VENTANITA = 2.5;
/**
 * **Y lo que se queda hasta la frase siguiente**, no solo ese poco: la cabina
 * vacía del embarque, que acompaña al rato callado en que sube el resto del
 * pasaje con el hilo musical. Ver `EMBARCANDO`.
 */
const HASTA_LA_SIGUIENTE: ReadonlySet<string> = new Set(["ilustracion:pasaje-embarque"]);

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
/** Si una frase es de un juego del kit, que se calla con él. */
const esDelKit = (l: Linea): boolean => l.clave.startsWith("inicio.ara.pasaje.kit.");
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
 * **Si el cartel del cinturón está apagado**, por lo que se ha dicho: lo apaga
 * la comandante al llegar arriba —«pueden soltarse el cinturón»— y se enciende
 * al empezar a bajar. Ara de rodillas en el asiento, con la cara contra el
 * cristal, solo sale entonces: con el cartel encendido el cinturón va puesto
 * y bien abrochado, y un dibujo no enseña lo contrario.
 */
const cartelApagado = (e: VueloDePasaje): boolean => e.dicho("arriba") && !e.dicho("bajada");
/** Ara contra el cristal, con su ilustración si el cartel está apagado; si no, como venía. */
const contraElCristal = (l: Linea, e: VueloDePasaje): Linea =>
  cartelApagado(e) ? ilustrada(l, "pasaje-ara-ventanilla") : l;
/**
 * **Las nubes de cerca, con la tripulante al lado**: el saludo con su
 * ilustración, lo que se explica con el dibujo de la nube y, al final, lo que
 * dice Ara.
 */
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

/** Si una clave es de un anuncio de la megafonía de siempre. */
export function esAnuncioDeSiempre(clave: string): boolean {
  return clave.startsWith("comandante.") || clave.startsWith("tripulacion.");
}

/** Si una frase es de la tripulante en persona, sin altavoz. */
export function esDeCerca(l: Linea): boolean {
  return l.quien === "tripulacion" && !l.megafonia;
}

interface DefMomento<Id extends string = MomentoDelPasaje> {
  readonly id: Id;
  /** Cuándo toca: lo que pasa en el avión, y lo que ya se dijo. */
  readonly cuando: (l: LecturaDelPasaje, e: VueloDePasaje) => boolean;
  /** Y cuándo ya no viene a cuento: se salta sin decirlo. */
  readonly caduca?: (l: LecturaDelPasaje, e: VueloDePasaje) => boolean;
  readonly lineas: readonly Linea[];
  /** Y si lo que se dice depende de lo que pasa: las nubes, por dentro o desde arriba. */
  readonly segun?: (l: LecturaDelPasaje, e: VueloDePasaje) => readonly Linea[];
  /** Qué se dibuja para mirar mientras se dice. */
  readonly mira?: QueMirar;
  /** **Desde dónde se ve mientras se dice.** Sin decir, la ventanilla. */
  readonly plano?: Plano;
}

/**
 * **Una charla**: lo que se cuenta si viene a cuento. No va en el guion fijo,
 * así que no espera a nada ni nada la espera: se dice en un silencio de
 * `tras` segundos como poco, si en ese momento vale, y si su rato pasa sin
 * decirse, no pasa nada.
 */
interface DefCharla extends DefMomento<CharlaDelPasaje> {
  /** Cuánto silencio antes, s: lo que suena a sucedido va enseguida; lo explicado, con aire. */
  readonly tras: number;
}

const enElSuelo = (t: TramoDeLinea): boolean =>
  t === "puerta" ||
  t === "arrancando" ||
  t === "rodando" ||
  t === "esperando" ||
  t === "entrando" ||
  t === "carrera";
const bajando = (t: TramoDeLinea): boolean =>
  t === "bajada" || t === "final" || t === "recogida" || t === "frenando" || t === "al-puesto" || t === "aparcado" || t === "apagado";
const volando = (l: LecturaDelPasaje): boolean =>
  !l.enTierra && (l.tramo === "subida" || l.tramo === "crucero" || l.tramo === "bajada");
const enLaFinal = (l: LecturaDelPasaje): boolean => l.tramo === "final" || l.tramo === "recogida";
/** Si ya no se puede ir por el pasillo: la cabina preparada para aterrizar. */
const cabinaPreparada = (l: LecturaDelPasaje, e: VueloDePasaje): boolean =>
  l.enTierra || enLaFinal(l) || l.faltaParaTocar < PREPARAR_LA_CABINA || e.dicho("aproximacion");
/** Si la tripulante ya anda por el pasillo: desde que trae el servicio. */
const tripulanteEnElPasillo = (e: VueloDePasaje): boolean => e.dicho("tcpNubes") || e.saltado("tcpNubes");

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
 */
const DEMOSTRACION: readonly Linea[] = [
  tripulacion("demo.intro"),
  con(tripulacion("demo.cinturon"), "cinturon"),
  con(tripulacion("demo.salidas"), "salidas"),
  con(tripulacion("demo.mascaras"), "mascara"),
  con(ara("demoMascara"), "mascara"),
  con(tripulacion("demo.chaleco"), "chaleco"),
  con(ara("demoChaleco"), "chaleco"),
  con(tripulacion("demo.tarjeta"), "tarjeta"),
  con(ara("demoTarjeta"), "tarjeta"),
  con(tripulacion("demo.aparatos"), "modo-avion"),
];

/**
 * **El guion entero**, en el orden en que pasa un vuelo. Cada momento espera
 * a que no hable nadie y a que el avión esté donde toca; el que se pasa de su
 * momento se salta.
 */
export const GUION_DEL_PASAJE: readonly DefMomento[] = [
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
    // El rodaje, visto por fuera, mientras la comandante da la bienvenida.
    id: "bienvenida",
    cuando: (l) => l.tramo === "rodando" && l.porElSuelo > 2,
    caduca: (l) => !enElSuelo(l.tramo),
    lineas: [anuncio("comandante.bienvenida"), ara("comandante")],
    plano: "fuera-rodando",
  },
  {
    id: "demostracion",
    cuando: (l, e) => (l.tramo === "rodando" || l.tramo === "esperando") && e.callaDesde >= 1,
    caduca: (l) => !enElSuelo(l.tramo) || l.tramo === "entrando" || l.tramo === "carrera",
    lineas: DEMOSTRACION,
  },
  {
    /*
     * **Y la revisión**: antes de despegar, la tripulación pasa por el pasillo
     * mirando cinturones, respaldos y persianas. A Ara le revisa el suyo, y le
     * cuenta por qué la persiana va subida.
     */
    id: "revision",
    cuando: (l, e) => (l.tramo === "rodando" || l.tramo === "esperando") && e.callaDesde >= 1.5,
    caduca: (l) => !enElSuelo(l.tramo) || l.tramo === "entrando" || l.tramo === "carrera",
    lineas: [tripulante("revision"), ara("persiana"), con(tripulante("persiana"), "persiana")],
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
    id: "volando",
    cuando: (l) => !l.enTierra && l.altura > 80,
    caduca: (l) => l.altura > 1200,
    lineas: [ara("volando")],
    mira: "ventanilla",
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
    plano: "fuera-vuelta",
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
     */
    segun: (_l, e) => lasNubesDeCerca(contraElCristal(con(ara("nubesSostiene"), "nube"), e)),
    mira: "nubes",
  },
  {
    id: "bajada",
    cuando: (l) => bajando(l.tramo) && !l.enTierra,
    lineas: [desdeLaCabina(anuncio("comandante.descenso")), anuncio("tripulacion.cinturones")],
  },
  {
    id: "oidos",
    cuando: (l) => l.cabina <= SE_NOTAN_LOS_OIDOS && !l.enTierra,
    caduca: (l) => l.tramo === "final" || l.tramo === "recogida" || l.enTierra || l.faltaParaTocar < PREPARAR_LA_CABINA,
    lineas: [ara("oidos"), con(tripulacion("oidos"), "oido"), con(ara("bostezo"), "oido")],
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
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [tripulante(KIT_DADO), tripulante("kitRato"), ara("kitGracias")].map(conLaTripulante),
  },
  {
    /*
     * **La isla de llegada, a la vista**: La Palma sube a casi dos mil
     * quinientos metros, y desde cuarenta y tantos kilómetros ya se ve entera
     * por encima del mar de nubes. Es Ara quien la descubre: la cabina de mando
     * ya está con la llegada.
     */
    id: "isla",
    cuando: (l) => l.faltaParaTocar < VE_LA_ISLA && !l.enTierra,
    caduca: (l) => l.enTierra || l.tramo === "final" || l.faltaParaTocar < PREPARAR_LA_CABINA - 4000,
    lineas: [ara("isla")],
    mira: "ventanilla",
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
     * y persiana. Y si trajo el kit, que se guarde: para aterrizar, todo
     * recogido. Ver `atenderAlKit`.
     */
    id: "tcpAterrizaje",
    cuando: (l, e) => !l.enTierra && e.desdeQueSeDijo("aproximacion") >= 2,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [conLaTripulante(tripulante("aterrizaje"))],
    segun: (_l, e) =>
      (e.kit.esDado ? [tripulante(KIT_GUARDADO), tripulante("aterrizaje")] : [tripulante("aterrizaje")]).map(conLaTripulante),
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
    id: "toma",
    cuando: (l) => l.tramo === "frenando" && l.enTramo >= DESPUES_DE_TOCAR,
    caduca: (l) => l.tramo === "al-puesto" || l.tramo === "aparcado" || l.tramo === "apagado",
    lineas: [ara("toma")],
    mira: "motor",
    plano: "fuera-pista",
  },
  {
    id: "llegada",
    cuando: (l) => (l.tramo === "al-puesto" && l.porElSuelo > 1.5) || l.tramo === "aparcado",
    lineas: [anuncio("comandante.llegada"), comandante("reversa"), anuncio("tripulacion.llegada")],
    plano: "fuera-rodando",
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
export const CHARLAS_DEL_PASAJE: readonly DefCharla[] = [
  {
    // El tren se guarda en cuanto se despega, con un golpe que se oye en el pasaje.
    id: "tren",
    tras: 0,
    cuando: (l, e) => e.dicho("volando") && !l.enTierra && (l.tren ?? 1) < 0.95,
    caduca: (l) => l.altura > 1500 || bajando(l.tramo),
    lineas: [ara("tren")],
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
    // Por encima de las nubes, pegada al cristal: el mar, entre ellas.
    id: "marArriba",
    tras: 20,
    cuando: (l) =>
      volando(l) && !!l.sobreElMar && !!l.nubes && l.altitud > l.nubes.techo + 150 && e_noEnNube(l),
    caduca: (l) => bajando(l.tramo),
    lineas: [ara("marArriba")],
    segun: (_l, e) => [contraElCristal(ara("marArriba"), e)],
    plano: "asomado-abajo",
  },
  {
    // Por encima de Tenerife, subiendo: las montañas y los barrancos.
    id: "sobreLaIsla",
    tras: 18,
    cuando: (l) => l.tramo === "subida" && !l.enTierra && l.sobreElMar === false && l.altura > 2500,
    caduca: (l) => l.tramo !== "subida",
    lineas: [ara("sobreLaIsla")],
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
    // Más alto que el Teide y a más de quinientos por hora: solo cuando es verdad.
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
    // Para bajar no se apagan los motores: por la comandante, arriba todavía.
    id: "bajando",
    tras: 16,
    cuando: (l, e) => l.tramo === "bajada" && l.altitud > DIEZ_MIL_PIES + 150 && l.altitud < 4800 && e.dicho("oidos"),
    caduca: (l) => l.altitud < DIEZ_MIL_PIES + 100 || enLaFinal(l) || l.enTierra,
    lineas: [ara("preguntaBajar"), desdeLaCabina(comandante("bajando"))],
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
     * **El baño**, que es lo que de verdad preguntan los niños. Con el cartel
     * del cinturón encendido para bajar, mejor esperar: lo dice la tripulante.
     */
    id: "bano",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.bano && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [ara("bano"), tripulante("bano")].map(conLaTripulante),
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
    // Por debajo de las nubes, la isla de llegada ya cerca.
    id: "islaCerca",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" && !l.enTierra && l.faltaParaTocar < 38000 && l.altura < 1400 && e.dicho("isla"),
    caduca: (l) => l.enTierra || enLaFinal(l) || l.altura < 500,
    lineas: [ara("islaCerca")],
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
    // Por debajo de las nubes, pegada al cristal: el mar, ya cerca.
    id: "marAbajo",
    tras: 14,
    cuando: (l) =>
      !l.enTierra && bajando(l.tramo) && !!l.sobreElMar && l.altura > 400 && (!l.nubes || l.altitud < l.nubes.base - 100),
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [ara("marAbajo")],
    plano: "asomado-abajo",
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
    // El tren sale, con su ruido, para aterrizar.
    id: "ruedas",
    tras: 0,
    cuando: (l) => !l.enTierra && enLaFinal(l) && (l.tren ?? 0) > 0.5 && l.altura > 150,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("ruedas")],
  },
  {
    id: "miro",
    tras: 12,
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 560 && l.altura > 330,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [ara("miro")],
  },
  {
    id: "cerquita",
    tras: 6,
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 300 && l.altura > 110 && !!l.sobreElMar,
    caduca: (l) => l.enTierra || l.altura < 100,
    lineas: [ara("cerquita")],
  },
  {
    // En tierra, rodando: el cinturón puesto hasta que se apague la luz.
    id: "cinturonQuieto",
    tras: 45,
    cuando: (l, e) => l.tramo === "al-puesto" && e.dicho("llegada"),
    caduca: (l) => l.tramo === "apagado",
    lineas: [ara("cinturonQuieto")],
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
  // Y el kit: lo que se dice en los juegos, y guardarlo para aterrizar.
  LINEAS_DEL_KIT.forEach(poner);
  poner(tripulante(KIT_GUARDADO));
  return todas;
})();

// ── La secuencia ─────────────────────────────────────────────────────────

/** Un cambio de plano, con su hora de escena. */
export interface CambioDePlano {
  readonly plano: Plano;
  readonly desde: number;
}

/** Lo que la escena deja ver: para el dibujo, la cámara, el banco y las pruebas. */
export interface EstadoDelPasaje {
  readonly momento: MomentoDelPasaje;
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
  readonly dichos: readonly MomentoDelPasaje[];
  readonly saltados: readonly MomentoDelPasaje[];
  /** Las charlas dichas, en orden. */
  readonly charlas: readonly CharlaDelPasaje[];
  /** Lo señalado por la ventanilla, por su clave. */
  readonly senalados: readonly string[];
  /** **El plano de ahora**, y desde cuándo. Ver `Plano`. */
  readonly plano: Plano;
  readonly planoDesde: number;
  /** Todos los cambios de plano, en orden: el primero es la ventanilla. */
  readonly planos: readonly CambioDePlano[];
  /** **El dibujo de la ventanita** de ahora, o `null`. */
  readonly dibujo: string | null;
  /** Si lo que suena ahora es la megafonía. Ver `megafoniaSuena`. */
  readonly megafonia: boolean;
  /** **El kit de viaje**, y sus juegos. Ver `kit-de-viaje.ts`. */
  readonly kit: EstadoDelKit;
}

/** Cuánto se queda el dibujo de mirar después de decirlo, s. */
const SE_QUEDA_EL_DIBUJO = 14;

export class VueloDePasaje {
  private indice = 0;
  private reloj = 0;
  private acabado = false;
  private seguirPedido = false;
  private readonly charla: Conversacion;
  private readonly dichos: MomentoDelPasaje[] = [];
  private readonly saltados: MomentoDelPasaje[] = [];
  private readonly cuandoSeDijo = new Map<MomentoDelPasaje, number>();
  private readonly charlasDichas: CharlaDelPasaje[] = [];
  private mira: QueMirar | null = null;
  private miraDesde = 0;
  private callada = 0;
  /** Cuándo se pidió «sentados para el despegue» y cuándo se alineó, en el reloj de pared. */
  private enLaEsperaDesde: number | null = null;
  private alineadoDesde: number | null = null;
  private readonly porSenalar: Senalado[] = [];
  private readonly senalados: string[] = [];
  private plano: Plano = "ventanilla";
  private planoDesde = 0;
  private readonly planos: CambioDePlano[] = [{ plano: "ventanilla", desde: 0 }];
  private dibujo: string | null = null;
  private dibujoDe: Linea | null = null;
  /**
   * **El kit de viaje de Ara**: lo trae la tripulante en la bajada, se pausa
   * con la megafonía y se recoge para aterrizar. Lo que se toca se lo pasa el
   * dibujo directamente; lo que dice va por esta conversación, como todo.
   */
  readonly kit = new KitDeViaje();
  private kitAbierto = false;
  private juegoDelKit: KitDeViaje["juegoDeAhora"] = null;

  constructor(
    voz: VozDelInicio,
    private readonly opciones: {
      /** El lado de la ventanilla de Ara. */
      readonly lado?: "izquierda" | "derecha";
      /**
       * **El reloj de las voces**, s: el de pared mientras se juega. Lo que
       * espera a que algo suene se mide con él, que una grabación dura lo que
       * dura aunque el reloj del juego vaya acelerado. Sin decir, el de la
       * escena. Ver `TOPE_DE_UNA_FRASE`.
       */
      readonly pared?: () => number;
    } = {},
  ) {
    this.charla = new Conversacion(voz, () => this.reloj, () => this.pared());
  }

  private pared(): number {
    return this.opciones.pared?.() ?? this.reloj;
  }

  private get def(): DefMomento {
    return GUION_DEL_PASAJE[Math.min(this.indice, GUION_DEL_PASAJE.length - 1)]!;
  }

  get segundos(): number {
    return this.reloj;
  }

  /** Cuánto lleva la escena sin que hable nadie, s. */
  get callaDesde(): number {
    return this.callada;
  }

  /** Si ese momento ya se dijo. */
  dicho(id: MomentoDelPasaje): boolean {
    return this.cuandoSeDijo.has(id);
  }

  /** Si ese momento se saltó por pasarse de su momento. */
  saltado(id: MomentoDelPasaje): boolean {
    return this.saltados.includes(id);
  }

  /** Si esa charla ya se dijo. */
  dichaLaCharla(id: CharlaDelPasaje): boolean {
    return this.charlasDichas.includes(id);
  }

  /** Si un alabeo baja el ala del lado de Ara. */
  bajaMiAla(alabeo: number): boolean {
    return (this.opciones.lado ?? LADO_DE_ARA) === "izquierda" ? alabeo < 0 : alabeo > 0;
  }

  /** Cuánto hace que se dijo ese momento, s, o −∞ si no se dijo. */
  desdeQueSeDijo(id: MomentoDelPasaje): number {
    const t = this.cuandoSeDijo.get(id);
    return t === undefined ? -Infinity : this.reloj - t;
  }

  get estado(): EstadoDelPasaje {
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
      dibujo: this.dibujo,
      megafonia: this.megafoniaSuena,
      kit: this.kit.estado,
    };
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
      (this.dicho("arriba") || this.dicho("nubesRespuesta")) &&
      !this.dicho("aproximacion") &&
      this.charla.callada &&
      this.porSenalar.length === 0 &&
      !this.acabado
    );
  }

  /** **Lo que el juego acaba de ver por la ventanilla**: se dice en cuanto se pueda. */
  senalar(s: Senalado): void {
    if (this.acabado) return;
    this.porSenalar.push(s);
  }

  /** Un paso de la escena. Devuelve lo que la escena deja hacer a la tripulación. */
  paso(dt: number, l: LecturaDelPasaje): PermisosDeLaEscena {
    this.reloj += dt;
    this.callada = this.charla.callada ? this.callada + dt : 0;
    if (!this.acabado) {
      this.charla.atender();
      this.avanzar(l);
      this.charla.atender();
      // Después de lo que empieza a sonar en este paso: si es la megafonía, el kit se pausa ya.
      this.atenderAlKit(dt, l);
    }
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
    const seQueda = this.dibujo !== null && HASTA_LA_SIGUIENTE.has(this.dibujo);
    if (this.charla.callada && this.callada > SE_QUEDA_LA_VENTANITA && !seQueda) this.dibujo = null;
  }

  /**
   * **Cambiar de plano**: si es un corte —de la ventanilla a fuera o al
   * revés, o de un sitio de fuera a otro—, la escena calla su rato. Ver
   * `CORTE_DE_PLANO`.
   */
  private ponerPlano(p: Plano): void {
    if (p === this.plano) return;
    const corte = esDeFuera(p) || esDeFuera(this.plano);
    this.plano = p;
    this.planoDesde = this.reloj;
    this.planos.push({ plano: p, desde: this.reloj });
    if (this.planos.length > 120) this.planos.splice(1, 1);
    if (corte) this.charla.esperar(CORTE_DE_PLANO);
  }

  /** Se dice lo de un momento o una charla: su plano, su dibujo de mirar y sus frases. */
  private decirDe(def: DefMomento<string>, l: LecturaDelPasaje): void {
    this.ponerPlano(def.plano ?? "ventanilla");
    this.charla.decir(def.segun?.(l, this) ?? def.lineas);
    if (def.mira) {
      this.mira = def.mira;
      this.miraDesde = this.reloj;
    }
  }

  private avanzar(l: LecturaDelPasaje): void {
    // Lo que se pasa de su momento se salta, aunque haya alguien hablando.
    while (this.def.id !== "fin" && this.def.caduca?.(l, this)) {
      this.saltados.push(this.def.id);
      this.indice++;
    }
    const def = this.def;
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
    if (!this.charla.callada) return;
    if (!def.cuando(l, this) || this.esperaSuFase(def, l)) {
      /*
       * Lo señalado por la ventanilla, en los huecos de lo que no ha llegado;
       * y si no hay, lo que venga a cuento. Menos en el del servicio, que va
       * pegado al cartel apagado: un crucero entre islas dura un minuto, y una
       * historia en medio se lo comía.
       */
      if (def.id === "servicio") return;
      const s = this.porSenalar.shift();
      if (s) {
        this.decirLoSenalado(s);
        return;
      }
      /*
       * Y con el kit en las manos, lo que se cuenta cuando viene a cuento
       * espera: una explicación encima de un juego es un ruido. Lo que tiene
       * su momento —el guion, lo de la ventanilla— sí se dice.
       */
      const charla = this.kit.ocupaAAra ? undefined : this.charlaQueToca(l);
      if (charla) {
        this.charlasDichas.push(charla.id);
        this.decirDe(charla, l);
        return;
      }
      this.volverALaVentanilla();
      return;
    }
    this.decirDe(def, l);
    this.dichos.push(def.id);
    this.cuandoSeDijo.set(def.id, this.reloj);
    this.indice++;
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
    if (suena === `inicio.tripulacion.pasaje.cerca.${KIT_DADO}` || this.charla.oida(`inicio.tripulacion.pasaje.cerca.${KIT_DADO}`))
      this.kit.dar();
    if (suena === `inicio.tripulacion.pasaje.cerca.${KIT_GUARDADO}` || enLaFinal(l) || (l.enTierra && bajando(l.tramo)))
      this.kit.recoger();
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
    if ((this.kitAbierto && !abierto) || juego !== this.juegoDelKit) this.charla.quitar(esDelKit);
    this.kitAbierto = abierto;
    this.juegoDelKit = juego;
    const lineas = this.kit.tomarLoQueDecir();
    if (lineas.length) this.charla.decir(lineas);
  }

  /** La primera charla que viene a cuento ahora, si hay alguna. */
  private charlaQueToca(l: LecturaDelPasaje): DefCharla | undefined {
    return CHARLAS_DEL_PASAJE.find(
      (c) =>
        !this.charlasDichas.includes(c.id) &&
        this.callada >= c.tras &&
        c.cuando(l, this) &&
        !c.caduca?.(l, this),
    );
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
  private decirLoSenalado(s: Senalado): void {
    this.ponerPlano("ventanilla");
    const lineas: Linea[] = [
      { quien: "mama", clave: s.dicho.clave, megafonia: true, texto: s.dicho.texto, relleno: s.dicho.relleno },
    ];
    if (s.historia)
      lineas.push({
        quien: "mama",
        clave: s.historia.clave,
        megafonia: true,
        texto: s.historia.texto,
        relleno: s.historia.relleno,
        // Y su foto en la ventanita, la de las historias de cualquier vuelo.
        ...(s.historia.sitio ? { dibujo: `foto:${s.historia.sitio}` } : {}),
      });
    const suLado = s.lado === (this.opciones.lado ?? LADO_DE_ARA);
    if (suLado) {
      const suya = LO_QUE_DICE_ARA[s.que];
      lineas.push(suya ? ara(suya) : LO_VEO);
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
  private esperaSuFase(def: DefMomento, l: LecturaDelPasaje): boolean {
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
