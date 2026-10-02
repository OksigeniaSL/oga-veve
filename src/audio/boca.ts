/**
 * Quién tiene la palabra.
 *
 * En este juego hablan dos: el instructor —`audio/instructor.ts`— y los
 * cantos de cabina —`audio/voz.ts`—. Los dos usan el mismo `speechSynthesis`
 * del navegador y **los dos llamaban a `cancel()` antes de abrir la boca**, así
 * que cualquier frase cortaba a la anterior por la mitad, viniera de donde
 * viniera y dijera lo que dijera.
 *
 * Lo dijo quien lo juega: «a veces se mezcla “¡Subí!” con “Vas muy bajo”, o en
 * V1 te avisa y enseguida dice lo siguiente y el audio se medio corta para dar
 * paso al otro». Las dos cosas son la misma: V1 y rotar son dos cantos
 * separados por un segundo, y el segundo se llevaba por delante al primero.
 *
 * ## La regla
 *
 * Una sola, y es la de cualquiera que sepa hablar con alguien:
 *
 * - **Si no hay nadie hablando**, se habla.
 * - **Si lo que llega es más urgente**, corta. Un aviso de terreno interrumpe
 *   lo que haga falta: para eso es un aviso de terreno.
 * - **Si no lo es, espera su turno.** Una plaza y nada más: si mientras espera
 *   llega otra, la nueva sustituye a la que aguardaba, porque lo último que ha
 *   pasado es lo que hay que contar.
 *
 * ## La cadencia: ni repetirse, ni atropellarse, ni contradecirse
 *
 * Lo de arriba impide que dos voces suenen a la vez, y no basta. Jugando:
 *
 * > «Cada vez que pulso P para cambiar de modelo: "Arrancá…", "Arrancá…",
 * > "Arrancá el motor", eso suena raro, con una vez que lo diga, bien. Lo mismo
 * > "Seguí la raya verde", "seguí la raya verde", "seguí la raya verde"… debe
 * > tener menos repeticiones. Lo mismo al aterrizar, era una locura: "Salí de
 * > la pista, viene otro", "Más despacio", "Salí de la pista, viene otro", "Más
 * > despacio"… O salgo de la pista o me doy prisa para salir.»
 *
 * Tres reglas más, y las tres son de conversación y no de sonido:
 *
 * - **Ni repetirse.** Una frase no se vuelve a decir hasta que pase su tiempo:
 *   `NO_REPETIR`. Antes eran diez segundos y se medían **por texto y por
 *   hablante**, así que cambiar de aeronave —que rehace el estado del vuelo—
 *   volvía a soltar «arrancá el motor» cada vez.
 * - **Ni atropellarse.** Entre una frase y la siguiente hay un silencio
 *   —`SILENCIO`—, porque dos frases pegadas no se entienden como dos cosas: se
 *   entienden como una parrafada. Lo urgente no espera, que para eso es urgente.
 * - **Ni contradecirse.** Hay pares que no pueden ir seguidos porque dicen lo
 *   contrario: si acaba de sonar «salí de la pista, que viene otro», «más
 *   despacio» no se dice. Ver `RIÑEN`.
 *
 * ## Y lo que espera demasiado no se dice
 *
 * `CADUCA` son cuatro segundos. Un aviso de vuelo habla del avión **ahora**, y
 * cuatro segundos después el avión está en otro sitio: «vas bajo para la
 * pista» dicho cuando ya has corregido no es tarde, es mentira. Una cola que
 * lo suelta todo es peor que cortar.
 *
 * **Salvo lo que la torre autoriza**, que no caduca igual. Una autorización no
 * describe un instante: describe un permiso, y un permiso sigue siendo verdad
 * mientras nadie lo retire. «Cleared for take-off» dicho ocho segundos tarde
 * sigue siendo la autorización de despegar; «cien pies» dicho ocho segundos
 * tarde es una mentira sobre dónde estás. Son dos clases de frase y tenían el
 * mismo reloj. Ver `CADUCA_LA_ORDEN`.
 *
 * **Y la tuya no caduca nunca.** Doce segundos seguían siendo un reloj, y un
 * permiso no deja de valer porque pase un rato: deja de valer cuando alguien
 * lo retira. Con la boca llena, «cleared to land» caducaba esperando —en
 * Lanzarote con el JAZ 20—, la luz ya estaba verde y nadie lo había dicho. Lo
 * que la torre te da o te manda a ti, y lo que le quita la pista a otro para
 * dártela, espera lo que haga falta y se dice en cuanto se pueda; lo retira
 * solo quien sabe que ya no es verdad. Ver `noSePierde` en `audio/torre.ts`.
 *
 * ## Esto no sabe hablar
 *
 * No construye frases ni elige voces: recibe una función que habla y la llama
 * cuando toca. Es lo que permite que el instructor siga eligiendo su acento y
 * su timbre y los cantos de cabina el suyo, sin que este fichero sepa que
 * existe `SpeechSynthesisUtterance`.
 */

import { esElAvisoDeAves, esLaInformacionDeTrafico, noSePierde } from "./torre";
import { CADUCA_LA_MEGAFONIA, esDeLaMegafonia, pesoDe } from "./turnos";
import { GUION, guionAfis, guionSinTorre, type Fase } from "../flight/vuelo";

/**
 * Cuánto manda lo que se va a decir.
 *
 * Tres escalones, y el de en medio es casi todo: los cantos de cabina, los
 * avisos de aro, las fases del vuelo.
 *
 * - `baja`: los elogios y la charla de la frecuencia. Que te digan «bien» no
 *   puede pisar nada, y que otro avión salude, tampoco.
 * - `normal`: lo que enseña.
 * - `mando`: **lo que te ordena la torre**. Ver abajo.
 * - `urgente`: el suelo, la pista ocupada, la frustrada. Lo que no puede
 *   esperar a que termine una frase.
 *
 * ## Por qué hay un escalón para la torre
 *
 * Porque en una frecuencia de verdad una instrucción de control manda sobre
 * cualquier comentario, y aquí no mandaba: la autorización iba en `normal`,
 * como «más despacio» y «venís un poco alto», y al final de un vuelo hay
 * tres de ésas por segundo. Medido en el barrido, en El Hierro:
 *
 *     torre.canario.verde: no cabía en la cola
 *     torre.canario.roja: caducó esperando
 *     torre.canario.holdShort: no cabía en la cola
 *     torre.canario.lineUpWait: no cabía en la cola
 *
 * La torre abrió la boca cinco veces en un vuelo entero y se oyó **una**.
 *
 * `mando` **no corta**: cortar sigue siendo cosa de `urgente` y de nadie más,
 * que para eso se quitó esa potestad al resto. Lo único que hace es no
 * dejarse echar de la cola por un comentario.
 *
 * **Y lo que pesa cada una en la cola está en `audio/turnos.ts`**, con la
 * megafonía en su sitio: la regla de turnos de todas las voces, en un solo
 * sitio. Ver `pesoDe`.
 */
export type Urgencia = "baja" | "normal" | "mando" | "urgente";

/** Lo que espera más de esto ya no se dice. Ver la cabecera. */
export const CADUCA = 4000;

/**
 * Y lo que la torre autoriza aguanta el triple. Ver la cabecera.
 *
 * Doce segundos. Salió de medir: en Guaraní, que es el campo con más tráfico
 * del juego, la secuencia de salida entera —esperá, alineá, autorizado—
 * llegaba a la boca en cinco segundos y se caía por caducidad antes de que la
 * frase anterior terminara. Lo que se veía era una torre muda en el
 * aeropuerto más ocupado, que es exactamente al revés.
 */
export const CADUCA_LA_ORDEN = 12000;

/**
 * Cuánto aguanta esperando esta frase, según lo que sea.
 *
 * Lo decide la clave y no quien la pide, por el mismo motivo por el que la
 * escalera decide por el texto y no por quien escribe: es lo único que se
 * puede aplicar igual en los tres sitios que hablan.
 *
 * **Y lo que la torre te da o te manda a ti no caduca nunca.** Ver
 * `noSePierde` en `audio/torre.ts`: una autorización que no se pudo decir se
 * dice en cuanto se pueda, y solo deja de esperar cuando alguien que sabe que
 * ya no vale la retira —la luz que cambia, la final que se deja—.
 */
export function cuantoAguanta(
  clave: string | undefined,
  urgencia: Urgencia = "normal",
): number {
  if (
    noSePierde(clave, urgencia) ||
    anunciaLaFase(clave) ||
    esElAvisoDeAves(clave) ||
    esLaInformacionDeTrafico(clave)
  )
    return Infinity;
  return clave?.startsWith("torre.") ||
    explicaLaEspera(clave) ||
    explicaLaOtraPunta(clave) ||
    esDelDescenso(clave)
    ? CADUCA_LA_ORDEN
    : // Un anuncio espera su hueco más que un aviso: ver `CADUCA_LA_MEGAFONIA`.
      esDeLaMegafonia(clave)
      ? CADUCA_LA_MEGAFONIA
      : CADUCA;
}

/**
 * **El descenso de emergencia, que es un procedimiento y no un comentario**:
 * qué se hace, por qué la máscara primero, la megafonía y el «ya se respira».
 * Aguanta lo que una orden de la torre.
 *
 * Con los cuatro segundos de un aviso se caía en los aeropuertos con la
 * frecuencia llena: medido en Pettirossi con el JAZ 90, el «ya se respira» de
 * la llegada caducaba detrás de la torre y de un aviso de tráfico, y el
 * ejercicio acababa sin que nadie dijera que había acabado. Lo que se dice
 * sigue siendo verdad un rato —se sigue abajo, se sigue sin aire arriba—, y
 * las frases van de una en una: ver `decirLoQueQueda` en `game.ts`.
 */
export function esDelDescenso(clave: string | undefined): boolean {
  return !!clave && DEL_DESCENSO.test(clave);
}

const DEL_DESCENSO =
  /^(?:vuelo\.(?:cabinaSinPresion(?:ConTren)?|primeroLaTuya\.\w+|yaSeRespira)|comandante\.(?:descensoDeEmergencia|mascaras|alturaSegura|yaSeRespira)|tripulacion\.(?:canario\.)?mascaras)$/;

/**
 * **La instructora contando la fase en la que se entra**: «estás en final,
 * seguí los aros». Aguanta lo que dura la fase, no un reloj.
 *
 * Tenía los cuatro segundos de un aviso, y al entrar en final la torre te da
 * la pista en ese mismo instante —la lámpara y, de Taguató para arriba, su
 * fraseología con el viento—: la fase esperaba detrás y caducaba sin sonar.
 * Camino de Tenerife Sur con el JAZ 90, «vuelo.final: caducó esperando». Lo
 * que dice sigue siendo verdad mientras dure la fase, así que espera lo que
 * haga falta y se dice cuando la torre acaba; y al cambiar de fase la retira
 * quien la pidió, que es quien sabe que ya no vale. Ver `anunciarLaFase` en
 * `game.ts`.
 */
export function anunciaLaFase(clave: string | undefined): boolean {
  return !!clave && DE_LA_FASE.has(clave.replace(/~\d+$/, ""));
}

/**
 * Las claves con que se cuenta cada fase, en los tres guiones —torre, AFIS y
 * sin torre—, y las dos del vuelo que cambian según a dónde se vaya. Salen de
 * las tablas de `flight/vuelo.ts`, no de una lista escrita aquí.
 */
const DE_LA_FASE: ReadonlySet<string> = (() => {
  const claves = new Set<string>([
    "vuelo.enVueloAterrizando",
    "vuelo.enVueloDestino",
  ]);
  for (const fase of Object.keys(GUION) as Fase[]) {
    claves.add(GUION[fase].clave);
    claves.add(guionAfis(fase).clave);
    for (const conBici of [true, false])
      for (const enCasa of [true, false])
        claves.add(guionSinTorre(fase, conBici, enCasa).clave);
  }
  return claves;
})();

/**
 * **La instructora contando por qué no se entra por esa punta**, que también
 * aguanta lo que la orden a la que acompaña.
 *
 * Es el mismo caso que `explicaLaEspera`: se pide justo detrás de la orden de
 * la torre —la lámpara y, de Taguató para arriba, «go around, runway in use»,
 * que es una receta de ocho piezas—, y con los cuatro segundos de un aviso
 * caducaba siempre esperando. Medido en el banco de la otra cabecera: en
 * Taguató la orden sonaba y el porqué, el viento, no se oía nunca. Ver
 * `flight/la-otra-cabecera.ts`.
 *
 * **Y la felicitación de irse al aire, que llega justo detrás.** Se sube
 * cuarenta metros en unos segundos, y para entonces la orden y su porqué
 * todavía están sonando: con el reloj corto caducaba, y la frustrada se
 * obedecía en silencio. Renunciar es ganar, y se dice.
 */
export function explicaLaOtraPunta(clave: string | undefined): boolean {
  return (
    !!clave &&
    /^vuelo\.(?:laOtraPunta|alAireOtraPunta|alAireVientoDeCola|frustrada)(?:~\d+)?$/.test(
      clave,
    )
  );
}

/**
 * **Lo que le suelta la pista a otro**, dicho en la frecuencia: su «pista
 * libre», su «cleared for take-off», su «go around». Va en `baja`, que es
 * como va todo lo de los demás.
 *
 * ## Y esto no se tira nunca
 *
 * La frecuencia da por hecho lo que pide decir en cuanto lo pide: al pedir
 * «pista libre», la pista queda libre para ella, y la torre ya te la puede
 * dar. Y esta boca tira frases —caducan a los cuatro segundos, se caen de la
 * cola, las barre un aviso urgente—, así que lo que se oía podía ser esto,
 * medido en Pettirossi con el volcado de voces:
 *
 *     171,6 s  torre.clearedLand  a ZP-CHH
 *     248,0 s  otro.pistaLibre    de ZP-CHH: caducó esperando
 *     254,2 s  torre.clearedLand  a ti
 *
 * O sea, la torre dándole la misma pista a dos, de viva voz: «cleared to
 * land» a otro, nunca anulado, y después el tuyo. Lo que pasó y lo que se oyó
 * dejaron de ser lo mismo por una frase que se cayó.
 *
 * Una frase que suelta la pista **sigue siendo verdad** hasta que suena —la
 * pista sigue libre, el otro sigue despegando—, así que no caduca, no se cae
 * de la cola y no la barre nada. Y lo tuyo espera a que suene: ver
 * `esperaAlguna` y `paso` en `flight/turno-de-pista.ts`.
 */
export function sueltaLaPista(
  clave: string | undefined,
  urgencia: string,
): boolean {
  return !!clave && urgencia === "baja" && SUELTA_LA_PISTA.test(clave);
}

const SUELTA_LA_PISTA =
  /^(?:otro\.(?:[a-z]+\.)?pistaLibre|torre\.(?:[a-z]+\.)?(?:clearedTakeoff|goAround)(?:\.[LCR])?)(?:@|$)/;

/**
 * **La instructora contando por qué se espera en la roja**, que aguanta lo
 * que la orden a la que acompaña.
 *
 * No describe un instante, describe la roja: sigue siendo verdad mientras la
 * luz no cambie, y al cambiar se retira —ver `alCambiarLaLuz` en
 * `flight/turno-de-pista.ts`—. Con el reloj de los avisos no se oía nunca: se
 * pide al encenderse la roja, justo detrás de la propia orden de la torre, y
 * en Pettirossi caducaba mientras sonaban la orden y el «final» del que
 * venía. La espera de tres minutos volvía a quedarse sin explicar.
 */
export function explicaLaEspera(clave: string | undefined): boolean {
  return !!clave && /^vuelo\.esperaQue(?:Aterrice|Despegue)(?:~\d+)?$/.test(clave);
}

/**
 * Cuántas frases pueden esperar turno a la vez.
 *
 * Tres. Había **una**, y entre dos de igual peso ganaba la última: en una
 * carrera de despegue, Vr le quitaba el sitio a V1 y salía una de las dos sin
 * que se supiera cuál. Medido en el banco, el detector dispara las dos y de la
 * boca no sale ninguna.
 *
 * Y tres se quedaron cortas en cuanto la torre habló de verdad. Un cambio de
 * la lámpara son **dos frases** —lo que hay que hacer, y cómo se llama eso en
 * una radio— así que dos cambios seguidos son cuatro, y en una salida los dos
 * cambios van pegados: esperá, y treinta segundos después autorizado. Con tres
 * plazas la cuarta se echaba a sí misma, y la que se caía era siempre la
 * última: **el «cleared for take-off» no se oyó en Guaraní en ningún vuelo**.
 * La cola tiene que poder sostener un intercambio entero.
 *
 * Cuatro siguen siendo las que caben en el hueco que deja una frase antes de
 * que la siguiente deje de describir lo que pasa —para eso está `CADUCA`, que
 * sigue tirando a los cuatro segundos todo lo que no sea una autorización— y
 * bastante menos de las que harían falta para que esto sonara a parrafada.
 */
const PLAZAS_DE_ESPERA = 4;

/*
 * **Aquí vivía la cuenta de la toma, y ya no.** Había una regla para que sus
 * números se sustituyeran en la cola en vez de esperar, y no bastaba: aun
 * sustituyéndose, el número esperaba detrás de la torre y salía tarde —«un
 * buen rato después me dice 100 sin que cuadre»—. La cuenta es de una caja
 * del avión y no pide turno: tiene su propia vía en `audio/maquina.ts`, y a
 * esta boca solo llegan personas.
 */

/**
 * El silencio entre una frase y la siguiente, ms.
 *
 * Ocho décimas. Es lo que separa dos frases de una parrafada, y es también lo
 * que hace que la segunda se entienda como **otra cosa** y no como el final de
 * la primera: «tirá para arriba» pegado a «muy bien, estás en el aire» no
 * suena a dos momentos del despegue, suena a un locutor leyendo.
 */
export const SILENCIO = 800;

/**
 * Cuánto tarda una frase en poder repetirse, ms.
 *
 * Veinticinco segundos. Eran diez, y diez es poco para lo que se dice mientras
 * se rueda: el trayecto del puesto a la cabecera son dos minutos, y con diez
 * segundos «seguí la raya verde» cabía doce veces.
 *
 * No vale para lo urgente —el suelo, la pista ocupada—, que se repite todas las
 * veces que haga falta mientras el peligro siga ahí.
 */
export const NO_REPETIR = 25000;

/**
 * Y cuánto dura la contradicción entre dos frases que riñen, ms.
 *
 * Diez segundos: lo que dura la situación de la que hablaban las dos.
 */
export const RIÑEN = 10000;

/**
 * Lo que habla, visto desde aquí.
 *
 * Recibe `listo` y tiene que llamarlo cuando la frase termine o se corte. Es
 * todo lo que la boca necesita saber, y por eso esto se puede probar sin
 * navegador: quien habla es una función que avisa cuando acaba.
 */
/**
 * Lo que hace hablar a alguien, y **cómo se le hace callar**.
 *
 * Devuelve la forma de cortar lo que acaba de empezar a decir, o nada si no
 * hay nada que cortar. Eso segundo es lo que faltaba y es todo el fallo del
 * camarote: la boca daba la palabra al siguiente **sin decirle al anterior que
 * se callara**.
 *
 * Y no se veía leyendo una boca sola, porque cada una sí se calla a sí misma
 * antes de empezar. El problema es que en este juego hay cuatro —el
 * instructor, la torre, el otro avión y la comandante—, cada una con su propio
 * audio sonando: cuando la torre cortaba a la comandante, la torre se callaba
 * a sí misma (que no estaba diciendo nada) y la comandante seguía hablando.
 * Al despegar coinciden las cuatro, y lo que se oye es exactamente eso: «como
 * el camarote de los Hermanos Marx, pero en versión aeronave».
 */
export type Hablar = (
  /**
   * Avisa de que acabó. Con `noSono`, que le tocó y no tenía con qué sonar:
   * ver `noHablo`.
   */
  listo: (noSono?: boolean) => void,
) => (() => void) | void;

/**
 * Lo que una frase puede pedir además de la palabra. Todo opcional.
 */
export interface AlPedir {
  /**
   * **Si su voz ya puede sonar**: la grabación bajada y el audio
   * desbloqueado. Mientras diga que no, la frase espera en la cola —se ve
   * esperando, se puede retirar— pero no le toca, y no cuenta para su
   * caducidad: el reloj de lo que aguanta empieza cuando está lista. Ver
   * `estaLista` en `audio/instructor-grabado.ts`.
   */
  readonly lista?: () => boolean;
  /** Y hasta cuánto se le espera, ms. Pasado eso, le toca como esté. */
  readonly tope?: number;
  /**
   * **Y si se cae sin sonar**, por qué: caducó, no cabía, ya no era verdad…
   * Lo necesita quien da algo por dicho solo cuando suena —tu permiso para
   * aterrizar—. Ver `alSonarElPermiso` en `game.ts`.
   */
  readonly alCaer?: (porque: string) => void;
}

/** Cada cuánto se mira si una frase que esperaba a su voz ya está lista, ms. */
const MIRAR_SI_ESTA_LISTA = 200;

/** El reloj, aparte para poder probar la caducidad sin esperar. */
export interface Reloj {
  ahora(): number;
  /** Corta lo que se esté diciendo. */
  cancelar(): void;
  /**
   * Hace algo dentro de un rato. Para el silencio entre frases.
   *
   * Va aquí y no con un `setTimeout` suelto por el mismo motivo que `ahora`:
   * así esto se prueba sin esperar ochocientos milisegundos por cada caso.
   */
  esperar?(ms: number, hacer: () => void): void;
}

/**
 * Los pares que no pueden ir seguidos porque dicen lo contrario.
 *
 * No es una lista de frases que suenan mal juntas: es una lista de **órdenes
 * incompatibles**. Si acabo de decirte que salgas de la pista porque viene
 * otro, no puedo pedirte a continuación que vayas más despacio — «o salgo de
 * la pista o me doy prisa para salir».
 *
 * Manda la primera: la que ya se dijo gana, y la otra se calla mientras dure la
 * situación. Ver `RIÑEN`.
 */
export const NO_A_LA_VEZ: readonly (readonly [string, string])[] = [
  ["vuelo.abandonando", "vuelo.despacio"],
  ["vuelo.abandonando", "vuelo.alto"],
  // Frenar y correr tampoco.
  ["vuelo.aterrizado", "vuelo.despacio"],
  // Y mandar subir de urgencia no casa con un elogio de vuelo tranquilo.
  ["vuelo.terrenoSube", "vuelo.enVuelo"],
  ["vuelo.mandanFrustrar", "vuelo.final"],
  /*
   * **Y un mismo suceso lo canta una sola voz.**
   *
   * Lo peor que se oye no es una frase de más: es **la misma cosa dicha dos
   * veces con registros opuestos**. La de terreno dice «subí» agobiada y, un
   * segundo después, el aro o el PAPI dicen «venís un poco bajo, subí suave»
   * tan tranquilos. Contado jugando: «eso no pega ni con pegamento».
   *
   * Manda la primera, que es la que sabe por qué. Las otras se callan mientras
   * dure la situación.
   */
  ["vuelo.terrenoSube", "vuelo.aroBajo"],
  ["vuelo.terrenoSube", "vuelo.papiBajo"],
  ["vuelo.terrenoBajo", "vuelo.aroBajo"],
  ["vuelo.terrenoBajo", "vuelo.papiBajo"],
  // Y en una frustrada, lo que hay que hacer es irse: que la senda diga que
  // venías bajo ya no describe nada.
  ["vuelo.mandanFrustrar", "vuelo.papiBajo"],
  ["vuelo.mandanFrustrar", "vuelo.aroBajo"],
  /*
   * **Y en la final, lento y rápido no van seguidos.** Entre los dos umbrales
   * hay casi treinta puntos de velocidad y un avión no los cruza en diez
   * segundos; si alguna vez sale uno detrás del otro es que algo mide mal, y
   * quien lo oye se queda sin saber qué hacer: «le meto gas y "bajás muy
   * rápido"». Manda el que se dijo primero. Ver `bandaDeVelocidad`.
   */
  ["vuelo.lentoYBajo", "vuelo.rapido"],
  ["vuelo.lentoYBajo", "vuelo.pediFlaps"],
  // Y bajar de golpe después de «metéle gas»: el gas ya es lo que lo corta, y
  // «levantá la nariz» encima es otra orden para lo mismo.
  ["vuelo.lentoYBajo", "vuelo.bajasRapido"],
];

/** Con quién riñe esta clave, si riñe con alguien. */
function riñenCon(clave: string): readonly string[] {
  const otras: string[] = [];
  for (const [a, b] of NO_A_LA_VEZ) {
    if (a === clave) otras.push(b);
    if (b === clave) otras.push(a);
  }
  return otras;
}

export class Boca {
  private hablandoAhora: Urgencia | null = null;
  /**
   * Lo que espera turno. **Tres plazas, no una.**
   *
   * Había una sola, y entre dos de igual peso ganaba la última. En una carrera
   * de despegue eso se traduce en algo muy concreto: V1 llega, se pone a
   * esperar, y un segundo después **Vr le quita el sitio**. Sale una de las dos
   * y nunca se sabe cuál. Medido en el banco: el detector dispara los dos
   * —`v1:true vr:true`— y de la boca no sale ninguno.
   *
   * Y esas dos no son charla: son cantos atados a un instante. «Ya no puedo
   * parar y todavía no vuelo» son los dos segundos que ese peldaño existe para
   * enseñar, y perder uno es perder la mitad de la lección. Se oyó jugando: «al
   * despegar no me avisa del V1 ni VR ni nada».
   *
   * Tres y no más, y cada una con su caducidad: la regla de no pisarse no se
   * toca, lo que se quita es **tirar** lo que no cabe. Una frase que esperó
   * demasiado se cae sola —ver `CADUCA`—, que es lo que impide que esto se
   * convierta en una parrafada a destiempo.
   */
  private readonly cola: {
    hacer: Hablar;
    urgencia: Urgencia;
    desde: number;
    clave?: string;
    /** Mientras esté puesto, la frase espera a su voz. Ver `AlPedir.lista`. */
    lista?: () => boolean;
    /** Hasta cuándo se le espera la voz. */
    hasta?: number;
    alCaer?: (porque: string) => void;
  }[] = [];
  /** Cuándo se dijo cada cosa por última vez. Ver `NO_REPETIR` y `RIÑEN`. */
  private readonly dichas = new Map<string, number>();
  /** Hasta cuándo hay que callar para no atropellar la frase anterior. */
  private calladaHasta = 0;
  /**
   * Qué frase es la que está sonando.
   *
   * Hace falta porque `listo` puede llegar tarde —de una frase que ya se
   * cortó— y atenderlo entonces arrancaría la siguiente encima de la que está
   * hablando. Un número que sube es todo lo que hace falta para distinguirlas.
   */
  private cual = 0;

  constructor(private readonly reloj: Reloj) {}

  /** ¿Hay alguien hablando ahora mismo? */
  /** Cuántas frases esperan turno. Para poder comprobarlo sin oír nada. */
  get cuantasEsperan(): number {
    return this.cola.length;
  }

  get ocupada(): boolean {
    return this.hablandoAhora !== null;
  }

  /**
   * **Si el canal está libre**: nadie hablando, nadie esperando turno y el
   * silencio de la frase anterior ya cumplido. Lo que se pida ahora suena ya.
   *
   * Es lo que mira quien habla por su cuenta —la frecuencia de los demás—
   * antes de abrir la boca. Una radio es de uno en uno: el que quiere
   * transmitir espera a que el otro suelte el pulsador, y no se pone a la
   * cola. Poniéndose a la cola, lo que decía el otro avión esperaba detrás de
   * la torre, caducaba sin sonar y la frecuencia lo daba por dicho: en Los
   * Rodeos, camino de Tenerife Sur, se cayeron así un «cleared to land» a
   * otro, la información de tráfico y la fase de final, todas por «caducó
   * esperando».
   *
   * **Y no vale para lo que es para ti.** La información de tráfico también
   * esperaba aquí, y en una final con todos en el mismo turno la boca no se
   * queda libre nunca: el del circuito, en tu final y sin una palabra. Lo
   * tuyo pide turno y espera mientras sea verdad. Ver
   * `esLaInformacionDeTrafico` en `audio/torre.ts`.
   */
  get libre(): boolean {
    return (
      this.hablandoAhora === null &&
      /*
       * Lo que todavía espera a su voz no ocupa la frecuencia: mientras baja
       * su grabación, quien tenga algo que decir lo dice. Ver `AlPedir.lista`.
       */
      this.cola.every((c) => c.lista) &&
      this.reloj.ahora() >= this.calladaHasta
    );
  }

  /**
   * Si esta frase **sigue esperando turno**: pedida, sin empezar a sonar y
   * sin tirar todavía. Lo pregunta quien necesita que una frase suene antes
   * que otra sin pedirlas a la vez: ver `despejeSinDecir` en `game.ts`.
   */
  espera(clave: string): boolean {
    return this.cola.some((c) => c.clave === clave);
  }

  /** Si alguna de las que esperan turno es de esta clase. Ver `sueltaLaPista`. */
  esperaAlguna(
    de: (clave: string | undefined, urgencia: Urgencia) => boolean,
  ): boolean {
    return this.cola.some((c) => de(c.clave, c.urgencia));
  }

  /**
   * Pide la palabra. `hacer` es lo que habla, y se llama cuando le toque.
   *
   * Puede no llamarse nunca: si llega otra cosa mientras espera, o si pasa
   * demasiado tiempo. Es lo correcto — ver la cabecera.
   */
  pedir(urgencia: Urgencia, hacer: Hablar, clave?: string, al: AlPedir = {}): void {
    const ahora = this.reloj.ahora();
    const urgente = urgencia === "urgente";

    /*
     * **Ni repetirse ni contradecirse**, y las dos comprobaciones van antes de
     * mirar si hay alguien hablando: una frase que no toca decir no toca
     * decirla ni aunque haya silencio. Ver la cabecera.
     */
    if (clave && !urgente) {
      const porQueNo = this.noTocaDecirla(clave, ahora, urgencia);
      if (porQueNo) {
        this.apuntarDescarte(clave, porQueNo);
        al.alCaer?.(porQueNo);
        return;
      }
    }

    /*
     * **Y si su voz todavía no puede sonar, espera a que pueda**, en la cola
     * y sin que le toque. Es el crosscheck de Jazlyn: se pedía en el puesto
     * antes de que su grabación hubiera bajado, se le pasaba a la voz del
     * navegador —muda en Brave para Linux— y se daba por dicho. Ver
     * `AlPedir.lista`.
     */
    if (al.lista && !al.lista()) {
      this.cola.push({
        hacer,
        urgencia,
        desde: ahora,
        clave,
        lista: al.lista,
        hasta: ahora + (al.tope ?? Infinity),
        alCaer: al.alCaer,
      });
      this.mirarSiEstanListas();
      return;
    }

    if (!this.ocupada) {
      /*
       * **Y el silencio entre frases.** Si la anterior acaba de terminar, esta
       * espera su hueco en vez de pegarse a ella. Lo urgente no espera.
       */
      const falta = this.calladaHasta - ahora;
      if (!urgente && falta > 0 && this.reloj.esperar) {
        this.encolar({ hacer, urgencia, desde: ahora, clave, alCaer: al.alCaer });
        this.reloj.esperar(falta, () => this.soltarLoQueEspera());
        return;
      }
      /*
       * **Y si alguien esperaba turno, no se le cuela quien acaba de llegar.**
       *
       * Con la boca libre y el silencio cumplido, esto arrancaba lo recién
       * pedido sin mirar la cola. Y la cola puede tener algo: lo que esperaba a
       * que acabara la frase anterior se suelta con un temporizador, y con el
       * juego cargado ese temporizador puede llegar detrás del fotograma que
       * pide la frase nueva. Pasó aterrizando en Los Rodeos, en el volcado de
       * voces del banco: «frená», pedida al tocar tierra detrás de «quitá el
       * gas», caducó esperando mientras sonaba «salí por la siguiente», que se
       * había pedido después. Con la cola en orden, ese es el único camino
       * por el que una frase posterior del mismo peso adelanta a una anterior.
       *
       * Se mete en la cola con los demás y habla quien toque: el de más peso,
       * y entre iguales el que llegó antes.
       */
      if (!urgente && this.cola.length) {
        this.encolar({ hacer, urgencia, desde: ahora, clave, alCaer: al.alCaer });
        this.soltarLoQueEspera();
        return;
      }
      this.arrancar(urgencia, hacer, clave);
      return;
    }
    /*
     * **Y solo lo urgente corta. Lo demás espera a que termine la frase.**
     *
     * Esto decía «más urgente que quien habla», con tres pesos: baja, normal y
     * urgente. Y la comandante habla en baja —es megafonía, no tiene prisa—
     * mientras la instructora, la torre y el otro tráfico hablan en normal. O
     * sea que **por diseño cualquiera la cortaba a media frase**, y con una
     * frase larga eso pasa siempre.
     *
     * Contado jugando, aterrizando en La Gomera:
     *
     *     Comandante: «Bienvenidos a La Gomera, aquí la gent…»
     *     Voz inglesa: «eco charlie, charlie…»
     *
     * «No, eso no puede ser. Se solapan… la española ni tiempo, se le
     * interrumpe. Y la instructora es la que más interrumpe.»
     *
     * Una frase cortada es peor que no decirla: quien la oye se queda con
     * media información y con la sensación de que nadie manda. Y la regla ya
     * estaba escrita en este mismo fichero —lo urgente son el terreno, la
     * pista ocupada y la frustrada, y poco más—; lo que no estaba era
     * aplicada. Ahora cortar es potestad de lo urgente y de nadie más; el
     * resto espera su turno, que para eso hay cola.
     *
     * Y un urgente no corta a otro urgente: dos avisos de ese peso en el mismo
     * segundo son dos cosas graves, y la primera merece acabarse.
     */
    if (urgente && this.hablandoAhora !== "urgente") {
      /*
       * Lo urgente corta. El que estaba hablando no vuelve — lo suyo era menos
       * importante que esto, y repetirlo después sería contar el pasado.
       */
      // Lo urgente corta y **vacía la cola**: lo que esperaba era menos
      // importante que esto y ya no describe lo que está pasando. Menos lo
      // que suelta la pista, que sigue siendo verdad —ver `sueltaLaPista`—,
      // y lo que la torre te da o te manda, que tampoco deja de serlo porque
      // suene un aviso: ver `noSePierde` en `audio/torre.ts`.
      for (let i = this.cola.length - 1; i >= 0; i--) {
        const c = this.cola[i]!;
        if (sueltaLaPista(c.clave, c.urgencia)) continue;
        if (noSePierde(c.clave, c.urgencia)) continue;
        /*
         * Ni un anuncio de la megafonía, que tampoco describe un instante:
         * el servicio o la bajada siguen siendo verdad después de un aviso.
         * Lo tira su propio reloj si espera demasiado. Ver `turnos.ts`.
         */
        if (esDeLaMegafonia(c.clave)) continue;
        this.tirar(i, "la barrió un urgente");
      }
      this.reloj.cancelar();
      this.arrancar(urgencia, hacer, clave);
      return;
    }
    /*
     * Y si no, a esperar. **Una plaza, y la gana la más importante**; entre dos
     * iguales, la última, que es lo que está pasando ahora.
     *
     * Era siempre la última sin mirar nada más, y con eso una charla de la
     * radio —«Zulu Papa Alfa Bravo Charlie, en final»— le quitaba el sitio a la
     * autorización de la torre, que es de las pocas frases que hay que oír sí o
     * sí. Medido en el banco: la torre decía dos frases en un vuelo y pasó a
     * decir una.
     */
    this.encolar({ hacer, urgencia, desde: ahora, clave, alCaer: al.alCaer });
  }

  /**
   * **Quita una frase de la cola sin decirla**, apuntando por qué y
   * avisando a quien la pidió si quería saberlo. Ver `AlPedir.alCaer`.
   */
  private tirar(i: number, porque: string): void {
    const [c] = this.cola.splice(i, 1);
    if (!c) return;
    this.apuntarDescarte(c.clave, porque);
    c.alCaer?.(porque);
  }

  /** Si hay programada una mirada a lo que espera a su voz. */
  private mirando = false;

  /**
   * **Mira dentro de un rato si lo que esperaba a su voz ya puede sonar**, y
   * sigue mirando mientras quede algo esperando. Sin reloj —en las pruebas
   * que no lo dan— no se mira solo: se mira al pedir o al acabar una frase.
   */
  private mirarSiEstanListas(): void {
    if (this.mirando || !this.reloj.esperar) return;
    this.mirando = true;
    this.reloj.esperar(MIRAR_SI_ESTA_LISTA, () => {
      this.mirando = false;
      // Sin pisar a nadie ni saltarse el silencio de la frase anterior.
      if (!this.ocupada && this.reloj.ahora() >= this.calladaHasta)
        this.soltarLoQueEspera();
      if (this.cola.some((c) => c.lista)) this.mirarSiEstanListas();
    });
  }

  /**
   * Mete una frase en la cola de espera, por peso y sin pasar de tres.
   *
   * Cuando no cabe se cae **la menos importante**, y entre iguales **la más
   * nueva**: una cola es una cola.
   *
   * ## Y esto estaba al revés
   *
   * Se caía la más vieja, con este argumento: «la que más cerca está de dejar
   * de describir lo que pasa». El argumento es bueno y ya lo cumple otro:
   * `CADUCA` tira a los cuatro segundos lo que dejó de ser verdad. Con eso
   * puesto, tirar además la más vieja es tirar dos veces por el mismo motivo
   * — y lo que se tira es siempre lo primero que pasó.
   *
   * Y lo primero que pasa, al final de un vuelo, es la torre. Medido en el
   * barrido, cinco escenarios fallando la misma prueba y siempre por lo
   * mismo: `torre.clearedTakeoff: no cabía en la cola`, `torre.clearedLand:
   * no cabía en la cola`. La autorización entraba en la cola, se ponía a
   * esperar, y el tercer «más despacio» la echaba.
   *
   * Con la cola en orden de llegada, la autorización se dice y lo que se cae
   * es el comentario de más — que es lo que pasa en una frecuencia de verdad:
   * quien llega tarde espera, y si ya no viene a cuento, no lo dice.
   */
  private encolar(esta: (typeof this.cola)[number]): void {
    this.cola.push(esta);
    // Lo que espera a su voz no ocupa plaza: todavía no compite por hablar.
    if (this.cola.filter((c) => !c.lista).length <= PLAZAS_DE_ESPERA) return;
    /*
     * Y lo que suelta la pista no se echa: si no queda otra, la cola crece
     * una plaza. Ver `sueltaLaPista`. Ni lo que la torre te da o te manda:
     * ver `noSePierde`.
     */
    let peor = -1;
    for (let i = 0; i < this.cola.length; i++) {
      const a = this.cola[i]!;
      if (a.lista) continue;
      if (sueltaLaPista(a.clave, a.urgencia)) continue;
      if (noSePierde(a.clave, a.urgencia)) continue;
      /*
       * **Ni un anuncio de la megafonía**, por lo mismo que no lo barre un
       * urgente: no describe un instante, y lo tira su propio reloj si espera
       * demasiado. Con el peso más bajo de lo que se dice, era siempre el que
       * sobraba: aterrizando en Los Rodeos con el JAZ 90, la fase de
       * aterrizado, la de salir de la pista y los flaps llenaban la cola y
       * «comandante.llegada: no cabía en la cola» — Jazlyn sin despedida. Va
       * de uno en uno —ver `megafoniaHablando` en `game.ts`—, así que la cola
       * crece como mucho en uno.
       */
      if (esDeLaMegafonia(a.clave)) continue;
      if (peor < 0) {
        peor = i;
        continue;
      }
      const b = this.cola[peor]!;
      const pa = pesoDe(a.clave, a.urgencia);
      const pb = pesoDe(b.clave, b.urgencia);
      if (
        pa < pb ||
        /*
         * Y **mayor o igual**, no mayor: dos frases pedidas en el mismo
         * milisegundo tienen el mismo `desde`, y con la comparación estricta
         * ganaba la primera de la lista — o sea, otra vez la más vieja. Con
         * el igual incluido gana la última, que es la que acaba de llegar.
         */
        (pa === pb && a.desde >= b.desde)
      )
        peor = i;
    }
    if (peor < 0) return;
    this.tirar(peor, "no cabía en la cola");
  }

  /** La siguiente que toca decir, o `undefined` si no queda ninguna viva. */
  private siguienteViva(): (typeof this.cola)[number] | undefined {
    const ahora = this.reloj.ahora();
    /*
     * **Lo que esperaba a su voz, primero**: si ya puede sonar —o se le acabó
     * la espera—, entra en la cola como si acabara de llegar. Su reloj de
     * caducidad empieza ahora: lo que tardó en bajar su grabación no es
     * tiempo que haya pasado para lo que dice. Ver `AlPedir.lista`.
     */
    for (const c of this.cola) {
      if (!c.lista) continue;
      if (c.lista() || ahora >= (c.hasta ?? Infinity)) {
        c.lista = undefined;
        c.desde = ahora;
      }
    }
    // Lo caducado no se dice: contar el pasado es peor que callarse.
    for (let i = this.cola.length - 1; i >= 0; i--) {
      const c = this.cola[i]!;
      if (c.lista) continue;
      if (sueltaLaPista(c.clave, c.urgencia)) continue;
      if (ahora - c.desde > cuantoAguanta(c.clave, c.urgencia))
        this.tirar(i, "caducó esperando");
    }
    let mejor = -1;
    for (let i = 0; i < this.cola.length; i++) {
      const a = this.cola[i]!;
      if (a.lista) continue;
      if (mejor < 0) {
        mejor = i;
        continue;
      }
      const b = this.cola[mejor]!;
      const pa = pesoDe(a.clave, a.urgencia);
      const pb = pesoDe(b.clave, b.urgencia);
      // Manda el peso; entre iguales, la que llegó antes: se dicen en orden.
      if (pa > pb || (pa === pb && a.desde < b.desde)) mejor = i;
    }
    if (mejor < 0) return undefined;
    return this.cola.splice(mejor, 1)[0];
  }

  /**
   * Lo que se descartó y por qué, para los bancos.
   *
   * Esta boca **tira frases en silencio**, y tiene razones buenas para hacerlo
   * —no repetirse, no contradecirse, no contar el pasado—. Pero una frase que
   * desaparece sin rastro es imposible de perseguir desde fuera: costó media
   * tarde averiguar por dónde se perdía el canto de V1, y la respuesta estaba
   * aquí todo el rato.
   */
  readonly descartadas: string[] = [];

  /**
   * Y lo que **sí** se dijo, en orden y con su instante.
   *
   * El gemelo de `descartadas`, y hace la misma falta. Con las dos listas se
   * puede leer una conversación entera desde fuera —qué sonó, cuándo, y qué
   * se cayó entre medias— que es la única forma de perseguir un
   * amontonamiento de voces: oyéndolo no se distingue «se dijeron cuatro
   * cosas seguidas» de «se dijeron dos y se perdieron otras dos».
   */
  readonly habladas: { t: number; clave: string }[] = [];

  /**
   * Cuántas se han dicho en total, también las que ya se cayeron de
   * `habladas` por arriba.
   *
   * La lista tiene tope, y en un vuelo largo se llena: a partir de ahí su
   * largo no cambia, y quien miraba «lo nuevo» por el largo ya no veía nada
   * nuevo. Con el total se sabe cuántas de las últimas son nuevas.
   */
  cuantasHabladas = 0;

  private apuntarDescarte(clave: string | undefined, porque: string): void {
    /*
     * **Con la hora**, que es lo que faltaba para poder leerlo.
     *
     * Una lista de descartes sin reloj dice qué se cayó y no dice nada de por
     * qué: tres frases de torre perdidas pueden ser tres momentos distintos
     * del vuelo o una ráfaga de medio segundo, y son dos averías que no se
     * parecen en nada. Puesta la hora al lado de `habladas`, que ya la lleva,
     * la cola se lee como lo que es — una conversación.
     */
    const cero = this.habladas[0]?.t ?? this.reloj.ahora();
    const t = ((this.reloj.ahora() - cero) / 1000).toFixed(1);
    this.descartadas.push(`${t}s ${clave ?? "sin clave"}: ${porque}`);
    if (this.descartadas.length > 200) this.descartadas.shift();
  }

  /** Suelta lo que esperaba el silencio, si sigue teniendo sentido. */
  private soltarLoQueEspera(): void {
    if (this.ocupada) return;
    const siguiente = this.siguienteViva();
    if (!siguiente) return;
    this.arrancar(siguiente.urgencia, siguiente.hacer, siguiente.clave);
  }

  /**
   * Se calla y se olvida de lo que esperaba. Al reiniciar el vuelo.
   *
   * **Y no olvida lo que ya dijo**: eso es memoria de la conversación, no de la
   * frase que estaba sonando. Borrarla aquí era la mitad del «arrancá,
   * arrancá, arrancá» — cambiar de aeronave llama a `callar` y con ello se
   * perdía la cuenta de lo que se acababa de decir. Para olvidarlo del todo
   * está `empezarDeCero`, que es lo que llama un vuelo nuevo.
   */
  callar(): void {
    this.cola.length = 0;
    this.hablandoAhora = null;
    this.cual++;
    this.reloj.cancelar();
  }

  /**
   * Por qué una frase **no toca** decirse ahora, o `null` si toca.
   *
   * Es la regla de no repetirse y no contradecirse, en un solo sitio. Estaba
   * escrita dentro de `pedir` y hacía falta también fuera: ver `anotarSinVoz`.
   * Dos copias de la misma regla es como un día una dice una cosa y la otra
   * otra.
   */
  private noTocaDecirla(
    clave: string,
    ahora: number,
    urgencia: Urgencia = "normal",
  ): string | null {
    const dicha = this.dichas.get(clave);
    /*
     * **Lo que la torre te da o te manda sí se repite**: no es un aviso que
     * cansa, es una orden, y la lámpara solo la pide cuando cambia. Tu
     * permiso de aterrizar dado otra vez en la final nueva, a los veinte
     * segundos de la frustrada, se caía por «repetida» con la luz ya verde.
     * Ver `noSePierde`.
     */
    if (dicha !== undefined && ahora - dicha < NO_REPETIR && !noSePierde(clave, urgencia))
      return "repetida";
    for (const otra of riñenCon(clave)) {
      const cuando = this.dichas.get(otra);
      if (cuando !== undefined && ahora - cuando < RIÑEN) return `riñe con ${otra}`;
    }
    return null;
  }

  /**
   * **Apunta una frase que no va a sonar, con las mismas reglas que si sonara.**
   *
   * Cuando no hay voz —ni grabada ni del navegador— la boca no pide la palabra,
   * y eso está bien: pedirla para no decir nada bloquearía lo que viene detrás.
   * Pero el historial sí la apuntaba como dicha, **y sin pasar por la regla de
   * no repetirse**. Así el banco —que corre sin voces— contaba «despacio» nueve
   * veces donde con voz habrían sonado una o dos, y daba un rojo que no era
   * del juego. Medido en Tenerife Sur, en tiradas seguidas: un rojo distinto
   * cada vez, y uno de ellos era este.
   *
   * Devuelve si toca decirla. Si toca, la da por dicha —igual que `arrancar`—
   * para que la siguiente repetición se caiga igual que se caería con voz.
   */
  anotarSinVoz(urgencia: Urgencia, clave?: string): boolean {
    if (!clave) return true;
    const ahora = this.reloj.ahora();
    if (urgencia !== "urgente") {
      const porQueNo = this.noTocaDecirla(clave, ahora, urgencia);
      if (porQueNo) {
        this.apuntarDescarte(clave, porQueNo);
        return false;
      }
    }
    this.dichas.set(clave, ahora);
    return true;
  }

  /**
   * **Quita de la cola lo que ya no es verdad**, sin tocar lo que suena.
   *
   * `CADUCA` tira lo que esperó demasiado, y eso mide el reloj; esto tira lo
   * que dejó de ser verdad aunque acabe de llegar, que es otra cosa y la sabe
   * quien pide. Lo pide la lámpara de la torre: un «hold short» que todavía
   * espera turno cuando la luz ya se ha puesto verde no es tarde, es lo
   * contrario de lo que pasa. Y mientras esperaba, empujaba hacia atrás la
   * autorización nueva hasta que caducaba. Ver `luzDeTorre` en `game.ts`.
   */
  retirar(
    sobra: (clave: string | undefined, urgencia: Urgencia) => boolean,
  ): void {
    for (let i = this.cola.length - 1; i >= 0; i--) {
      const esta = this.cola[i]!;
      if (!sobra(esta.clave, esta.urgencia)) continue;
      this.tirar(i, "ya no es verdad");
    }
  }

  /** Vuelo nuevo: se olvida hasta lo que ya había dicho. */
  empezarDeCero(): void {
    this.callar();
    this.dichas.clear();
    this.calladaHasta = 0;
  }

  private arrancar(urgencia: Urgencia, hacer: Hablar, clave?: string): void {
    /*
     * **Y antes de nada, que se calle quien estuviera hablando.**
     *
     * Va aquí y no en cada boca porque el que habla no sabe quién es el otro
     * —ni tiene por qué—: quien sabe quién tiene la palabra es esto.
     */
    this.callarAlQueHabla();
    this.hablandoAhora = urgencia;
    const cuando = this.reloj.ahora();
    if (clave) this.dichas.set(clave, cuando);
    this.habladas.push({ t: cuando, clave: clave ?? "sin clave" });
    this.cuantasHabladas++;
    if (this.habladas.length > 300) this.habladas.shift();
    const mia = ++this.cual;
    let enElActo = true;
    let callada = false;
    this.callaAhora =
      hacer((noSono) => {
        if (mia !== this.cual) return;
        if (noSono && enElActo) callada = true;
        else this.acabo();
      }) ?? null;
    enElActo = false;
    if (callada) this.noHablo();
  }

  /**
   * **Lo que no tenía con qué sonar no ha sonado.**
   *
   * Una frase que, al tocarle, resulta no tener con qué sonar —ni grabación
   * ni voz del navegador— lo avisa al acabar, en el acto. Se trata igual que
   * `anotarSinVoz`: cuenta para no repetirse, pero no está en lo que se oyó y
   * no deja silencio detrás, que no hubo frase que separar.
   */
  private noHablo(): void {
    this.habladas.pop();
    this.cuantasHabladas--;
    this.hablandoAhora = null;
    this.callaAhora = null;
    if (!this.cola.length) return;
    if (this.reloj.esperar) {
      this.reloj.esperar(0, () => this.soltarLoQueEspera());
      return;
    }
    this.soltarLoQueEspera();
  }

  /** Cómo callar a quien tiene la palabra ahora mismo, si alguien la tiene. */
  private callaAhora: (() => void) | null = null;

  private callarAlQueHabla(): void {
    const callar = this.callaAhora;
    this.callaAhora = null;
    callar?.();
  }

  private acabo(): void {
    this.hablandoAhora = null;
    this.callaAhora = null;
    this.calladaHasta = this.reloj.ahora() + SILENCIO;
    if (!this.cola.length) return;
    /*
     * Y la siguiente también respeta el silencio: encadenar dos frases sin
     * hueco era justo lo que sonaba a parrafada. Si no hay temporizador —en las
     * pruebas que no lo dan— se dice como antes, seguida.
     */
    if (this.reloj.esperar) {
      this.reloj.esperar(SILENCIO, () => this.soltarLoQueEspera());
      return;
    }
    const siguiente = this.siguienteViva();
    if (siguiente)
      this.arrancar(siguiente.urgencia, siguiente.hacer, siguiente.clave);
  }
}

/**
 * La boca del navegador: una sola para todo el juego.
 *
 * Una y no dos, y ese es el punto entero: `speechSynthesis` es un recurso
 * único del navegador, así que dos módulos hablando por su cuenta se pisan
 * siempre, por mucho cuidado que ponga cada uno por separado.
 */
export const BOCA = new Boca({
  ahora: () => Date.now(),
  esperar: (ms, hacer) => void setTimeout(hacer, ms),
  cancelar() {
    try {
      globalThis.speechSynthesis?.cancel();
    } catch {
      // Sin voz se juega igual.
    }
  },
});

/**
 * **Y la megafonía de cabina, que ya no es otra boca: es la misma.**
 *
 * Fue otra, con este argumento, que es verdad en un avión: la comandante
 * habla al pasaje por los altavoces del techo y la torre entra por los
 * auriculares, y las dos vías se solapan. Y se oía así: «todo el vuelo en
 * silencio y cuando hablan lo hacen todos juntos» —Jazlyn contando el Teide
 * con la instructora encima, la azafata con el agua y el maní de la granja y
 * la radio encima—. Lo resolvió quien juega, sabiendo lo de las dos vías: «en
 * el juego, para lo poco que hablan, que la megafonía no la pise nadie».
 *
 * Así que la megafonía pide la palabra en el mismo turno que todos, con su
 * sitio en el orden de `audio/turnos.ts`: no corta a nadie, y una vez que habla
 * nadie le habla encima salvo lo urgente. Se queda el nombre para que se lea
 * quién habla por dónde.
 */
export const MEGAFONIA = BOCA;
