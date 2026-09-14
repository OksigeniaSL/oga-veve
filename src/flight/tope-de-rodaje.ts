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
 * Lo más que frena por su cuenta el tope de rodaje, de 0 a 1.
 *
 * Seis décimas. Bastante para que un avión que se ha venido arriba en una
 * calle vuelva a velocidad de rodaje en un par de segundos, y poco para que se
 * clave: frenar a fondo se sigue haciendo con el botón del freno, que es lo que
 * hay que aprender.
 */
const FRENO_QUE_AYUDA = 0.6;

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

  /*
   * **Lo rápido que se rueda es lo rápido que se avanza por el suelo**, no lo
   * que marca el anemómetro.
   *
   * Esto miraba `airspeed`, y mientras el motor de vuelo no conocía el viento
   * las dos cosas eran la misma. En cuanto el viento entró, dejaron de serlo — y
   * el tope se volvió un tapón: con viento de cara, un avión **parado** marca ya
   * la velocidad del viento, así que el tope daba por hecho que iba deprisa y le
   * cerraba el gas al mínimo. Medido en el barrido: en Guaraní, Tenerife Norte y
   * La Palma el avión se pasó los quince minutos enteros en «rodando» sin llegar
   * nunca al punto de espera.
   *
   * Y además es lo correcto por sí solo: un tope de rodaje existe para que no te
   * pases una curva, y una curva se pasa yendo rápido **por el suelo**.
   */
  const s = estado;
  const porElSuelo = Math.hypot(s.velocity.x, s.velocity.z);
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
    const rodaje = topeDeRodaje({ velocidad: porElSuelo, rodaje: RODAJE });
    techo = Math.min(techo, Math.max(rodaje.velocidad, porElSuelo));
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
    velocidad: porElSuelo,
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
   * **Y rodando, si el gas cerrado no basta, se frena.**
   *
   * Aquí ponía «el freno no se toca, ni aquí ni en la carrera de aterrizaje»,
   * y la razón era buena: «si durante todo el rato del aterrizaje el juego
   * está moviendo y controlando la velocidad de la aeronave, el niño cree que
   * se va a parar sola; y si todo se hace solo, vaya aburrimiento». Esa razón
   * sigue en pie **en la carrera de aterrizaje**, que es de lo que hablaba, y
   * ahí el freno se sigue sin tocar.
   *
   * Lo que ha cambiado es lo que hacía cerrar el gas. En el modelo de Guyrami
   * soltar el gas frenaba a más de un g —de treinta metros por segundo a cero
   * en tres segundos—, así que el tope *ya frenaba*, solo que a escondidas y
   * con una física que no existe. Al poner cada avión a frenar en los metros
   * que dice la física, cerrar el gas pasó a ser lo que es de verdad: casi
   * nada. Medido en el barrido: en Yvytu Rape el avión se plantó rodando a
   * treinta y un metros por segundo y no volvió a bajar en toda la partida.
   *
   * Un tope de rodaje que no puede frenar no es un tope. Y quien conduce
   * frena: es lo que hace el coche del sígame al que se sigue.
   *
   * Suave y proporcional al exceso, con un tope propio: esto es la mano de
   * quien te lleva, no un ancla.
   */
  const exceso = (porElSuelo - tope.velocidad) / Math.max(1, tope.velocidad);
  if (exceso > 0.1) {
    controles.brakes = Math.max(
      controles.brakes,
      Math.min(FRENO_QUE_AYUDA, exceso),
    );
  }
  return techo;
}
