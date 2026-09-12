/**
 * El tope de velocidad en tierra, donde el juego conduce.
 *
 * «No hay control de velocidad en pista, mil veces dicho.» Y era verdad: en
 * el suelo el gas no tenía techo, así que se podía rodar a treinta metros por
 * segundo, **adelantar al coche del sígame y pasarle por encima**, y llegar a
 * la salida tan rápido que no había forma de tomarla.
 *
 * Había un aviso —«más despacio», con dibujo y voz— y no bastaba: un aviso
 * que se puede ignorar sin consecuencia no es una regla, es una opinión.
 *
 * ## Dónde actúa y dónde no
 *
 * Donde el juego conduce, que es la escalera de siempre: Guyrami y Tukã
 * llevan tope, y de Taguató para arriba la velocidad de rodaje es cosa tuya
 * —ahí quedan el aviso, la raya ámbar y el señalero pidiendo despacio, que es
 * lo que hay en un aeropuerto de verdad—.
 *
 * Y **solo rodando**: la carrera de despegue y la de aterrizaje no se tocan,
 * que ahí un avión va rápido en el suelo porque tiene que ir rápido. Un tope
 * ahí sería impedir volar.
 *
 * La cuenta vive aparte, en `flight/gobernador.ts`, que es donde se puede
 * comprobar sin volar.
 *
 * ## Por qué vive aquí y no en `game.ts`
 *
 * Ciento cuarenta líneas que solo miran cinco cosas —el estado del vuelo, los
 * mandos, el peldaño, el paso del plan y el techo que se lleva de un
 * fotograma al siguiente— y ninguna de ellas es el mundo ni la pantalla. La
 * cuenta ya vivía aparte, en `gobernador.ts`; lo que faltaba era sacar la
 * **regla**, que es lo que decide cuándo se aplica y cuándo no.
 *
 * Tercer corte de #30.
 *
 * Devuelve el techo de la carrera de aterrizaje, que es el único estado que
 * esto lleva de un paso al siguiente: el trinquete baja con el avión y no
 * vuelve a subir hasta que se sale de la carrera.
 */
import type { ControlInputs, FlightState } from "./model";
import type { Tier } from "./tiers";
import type { Fase } from "./vuelo";
import type { Vista } from "../world/plan-de-vuelo";
import { CONDUCE_EL_JUEGO, topeDeRodaje } from "./gobernador";

/**
 * La velocidad de rodaje, m/s, para cuando el plan no sugiere ninguna.
 *
 * Nueve. Es el mismo número que usan la banda de velocidad y el plan, y por
 * eso está escrito con su nombre y no suelto: es **el** número.
 */
const RODAJE = 9;

/**
 * Las fases en las que se rueda de verdad, que son en las que hay tope.
 */
const RODANDO_DE_VERDAD: ReadonlySet<Fase> = new Set<Fase>([
  "estacionado",
  "arrancando",
  "rodando",
  "esperando",
  "abandonando",
  "a-plataforma",
  "en-puesto",
]);

export function limitarElRodaje(
  estado: FlightState,
  controles: ControlInputs,
  gasParaRodar: (velocidad: number) => number,
  tier: Tier,
  vista: Vista | null,
  techo: number,
): number {
  if (tier.assists.taxiAssist < CONDUCE_EL_JUEGO) return techo;
  const s = estado;
  /*
   * **En la pista no se limita nunca; en las calles, siempre.**
   *
   * El primer intento se apoyaba en la fase del plan de vuelo, y la fase es
   * mal portero: la carrera de despegue empieza mientras el juego todavía
   * dice «autorizado» o «alineando», así que el tope cerraba el gas y el
   * avión salía volando a catorce metros por segundo tras cuatrocientos
   * cincuenta de pista —medido; sin tope son treinta y tres tras doscientos
   * cuarenta y ocho—.
   *
   * `onRunway` dice lo único que hace falta saber y no se equivoca: en una
   * pista la velocidad **es** el asunto —se despega, se aterriza, se hace un
   * retroceso— y en una calle de rodaje nunca lo es.
   */
  if (!s.onGround) return techo;

  /*
   * **Y en la pista, después de aterrizar, tampoco se acelera.**
   *
   * «A toda leche me pasé E5 y nada me avisó: puedo ir a la velocidad que me
   * da la gana por la pista después de un aterrizaje.» Y era verdad: el tope
   * se apagaba en cuanto había asfalto de pista debajo, porque ahí es donde
   * se despega. Pero una vez tomado tierra la pista deja de ser el sitio
   * donde se coge velocidad y pasa a ser **el camino a casa**, y quien
   * acelera ahí se pasa la salida.
   *
   * Con una diferencia importante: en la carrera de aterrizaje el tope
   * **solo cierra el gas y no toca el freno**. Frenar es la lección, y
   * quitársela sería enseñar lo contrario; lo que se quita es la posibilidad
   * de echar más leña.
   */
  const enLaCarrera = vista?.fase === "aterrizado";
  if (s.onRunway && !enLaCarrera) return techo;

  /*
   * **En la carrera de aterrizaje el tope es un trinquete, no un tijeretazo.**
   *
   * El primer intento cerraba el gas a la velocidad de rodaje en cuanto
   * tocaba tierra, y en el modelo sencillo **el gas es la velocidad**: el
   * avión frenó en seco. «No veas el frenazo que dio al tomar tierra, sin que
   * yo tocara nada, casi se pone en cero. Digo, porque a ver cómo explico que
   * dejé las paletas en el parabrisas.»
   *
   * La regla no es «te quito el gas»: es **no puedes añadir velocidad**. El
   * techo baja con el avión y nunca sube, así que frenar es cosa tuya —y se
   * puede— y acelerar, no.
   */
  if (enLaCarrera) {
    /*
     * **Y el suelo del trinquete es la velocidad de rodaje entera**, la
     * misma que se puede llevar por una calle, holgura incluida.
     *
     * Estaba en los nueve pelados y el coche del sígame va a once: el avión
     * frenaba solo hasta nueve, no había forma de volver a subir, y el coche
     * se iba. «El avión frena sin que el usuario pueda acelerar y el coche
     * casi que se escapa.» El trinquete es para no *añadir* velocidad de
     * aterrizaje, no para dejarte por debajo de lo que rueda cualquiera.
     */
    const rodaje = topeDeRodaje({ velocidad: s.airspeed, rodaje: RODAJE });
    techo = Math.min(techo, Math.max(rodaje.velocidad, s.airspeed));
  } else {
    techo = Infinity;
  }
  /*
   * **Y el portero es la luz de la torre**, que costó tres intentos.
   *
   * Los dos primeros se apoyaron en la fase del plan y los dos rompieron el
   * despegue, cada uno en un aeródromo distinto: la carrera empieza **antes
   * de pisar la pista** —se sale del punto de espera con el gas ya puesto— y
   * en qué fase se está exactamente al hacerlo depende de dónde caiga el
   * punto de espera. Medido: despegaba a catorce metros por segundo tras
   * cuatrocientos sesenta en Tenerife, y en Silvio Pettirossi directamente no
   * despegaba.
   *
   * La luz verde no depende de la geometría de ningún aeródromo: **mientras
   * no te han autorizado, se rueda; autorizado, mandás vos**. Y se apaga sola
   * al despegar, así que la vuelta a casa vuelve a tener tope — que es donde
   * está el coche del sígame al que se le podía pasar por encima.
   */

  if (!vista || vista.luzVerde) return techo;
  if (!enLaCarrera && !RODANDO_DE_VERDAD.has(vista.fase)) return techo;

  /*
   * **Y el trinquete no lleva holgura.**
   *
   * Rodando, el tope deja un quince por ciento por encima de la velocidad de
   * rodaje para que se pueda seguir al coche del sígame sin que esté todo el
   * rato metiendo mano. En la carrera de aterrizaje esa misma holgura es un
   * agujero: el techo baja con el avión, así que un quince por ciento de
   * margen es un quince por ciento de gas nuevo cada vez que se frena un
   * poco. Medido en el banco: «de 29 a 31 m/s con el gas a fondo».
   *
   * Aquí el techo es el techo: lo que llevabas, y ni un metro más.
   */
  if (enLaCarrera) {
    controles.throttle = Math.min(controles.throttle, gasParaRodar(techo));
    return techo;
  }

  const tope = topeDeRodaje({
    velocidad: s.airspeed,
    /*
     * La velocidad de rodaje de **este sitio**, que el plan ya calcula: en
     * una curva cerrada es menor que en una recta larga.
     */
    rodaje: vista.velocidadSugerida || RODAJE,
  });
  /*
   * Límites, no mandos: se coge lo más restrictivo de lo que pide quien
   * juega y lo que deja el tope, así esto nunca acelera ni suelta el freno.
   *
   * Y el tope llega en metros por segundo, no en gas: se le pregunta al
   * modelo qué gas sostiene esa velocidad. Cerrar el gas «a la mitad» no
   * significa lo mismo en los dos modelos —en el sencillo el gas **es** la
   * velocidad—, y por eso la primera versión de esto dejaba el avión clavado
   * en cero mientras la pantalla seguía pidiendo freno: «es una
   * exageración». La velocidad sí significa lo mismo en los dos.
   */
  controles.throttle = Math.min(
    controles.throttle,
    gasParaRodar(tope.velocidad),
  );
  /*
   * Y el freno **no se toca**, ni aquí ni en la carrera de aterrizaje.
   *
   * Lo hacía: por encima de cierto exceso el juego frenaba por su cuenta. Se
   * probó rodando y el avión acababa clavado en cero con la tarjeta del
   * freno puesta. Pero el fallo de fondo no era la exageración, era la
   * lección: «si durante todo el rato del aterrizaje el juego está moviendo
   * y controlando la velocidad de la aeronave, ahora el niño cree que se va
   * a parar sola. Y si todo se hace solo, vaya aburrimiento».
   */
  return techo;
}
