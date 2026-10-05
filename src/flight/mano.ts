/**
 * **La mano que sostiene**: lo que hace la mano de un piloto en la palanca
 * cuando la palanca es un teclado o un dedo sobre un cristal.
 *
 * ## De dónde viene
 *
 * Contado volando, en tres frases:
 *
 * - «El movimiento izquierda/derecha es brusco en vuelo; al pulsar la tecla
 *   hace un movimiento rapidísimo, eso en realidad no es así; como alguna vez
 *   sea así, los pasajeros vomitan hasta la primera papilla.»
 * - «Bajo muy de golpe: o bajo o subo, el teclado no me deja ir suave.»
 * - Y con el dedo: «tengo que dejar el dedo puesto para mantener la subida o
 *   la bajada durante un buen rato hasta alcanzar la altitud deseada, se cansa
 *   la mano, es una tortura».
 *
 * Las tres tienen la misma causa. Una tecla solo sabe estar apretada o
 * suelta, así que la tecla era **el alerón o la profundidad a fondo**
 * mientras se apretaba y el centro al soltarla: el JAZ 90 se tumbaba a más de
 * veinte grados por segundo y, al soltar, el ala volvía —o no— según el
 * peldaño. Y el dedo hacía lo mismo con un muelle: lo que se conseguía se
 * perdía al levantarlo.
 *
 * ## Qué hace una mano de verdad
 *
 * Un piloto no lleva la palanca a fondo para virar: **inclina el ala a un
 * ritmo tranquilo, la deja en la inclinación que quiere y centra el mando**.
 * El avión se queda inclinado. Para subir, levanta el morro hasta la
 * trayectoria que quiere y **compensa**, y el avión se queda subiendo. Lo que
 * se consigue se queda; la mano solo se mueve para cambiarlo.
 *
 * Es también, literalmente, lo que hacen los mandos de los reactores de hoy
 * —Airbus desde el A320, Embraer en los E2—: la palanca pide **un ritmo** de
 * alabeo y de cabeceo, y suelta, el avión **sostiene** la inclinación y la
 * trayectoria. Con una protección que se ve: pasado de 33° de inclinación, al
 * soltar vuelve a 33° solo.
 *
 * ## Qué hace este módulo
 *
 * Lleva dos **consignas**: la inclinación que se quiere y la trayectoria que
 * se quiere —subir, nivelado, bajar—, y mueve el alerón y la profundidad
 * para que el avión las siga. La tecla mueve la consigna **a un ritmo**, que
 * arranca enseguida, y al soltarla el avión se para donde está; el dedo la
 * lleva **a un sitio**, el de la palanca, que se queda donde se deja. Ninguno
 * de los dos mueve el mando a fondo.
 *
 * - **El ritmo de alabeo sale del avión, y crece con la tecla.** Arranca al
 *   momento y **tranquilo** —una parte de lo que rueda a fondo a esa
 *   velocidad, la de un viraje con pasaje—, y si se mantiene la tecla sube a
 *   un ritmo **decidido**, dos tercios de lo que rueda a fondo, que es el de
 *   quien mete el avión en vereda en una final. Despacio, todo es más lento,
 *   como en el de verdad: el alerón muerde con la velocidad. Ver
 *   `ritmosDeAlabeo`.
 * - **El ritmo de la trayectoria sale de lo que se nota en el asiento**: un
 *   cuarto de g, que deprisa es poco ángulo y despacio es más.
 * - **La trayectoria, no el morro, mientras se aprieta.** Lo que se pide con
 *   la tecla es subir o bajar, y eso es la trayectoria: el morro es como se
 *   consigue. La mano lo hace como la del piloto automático de este juego —la
 *   trayectoria pide morro, el morro pide giro y el giro pide profundidad— y
 *   con el compensador: lo que la sostiene se queda en el TRIM, que es lo que
 *   hace un piloto al soltar y lo que se ve en la aguja.
 * - **Y suelta, lo que sostiene el avión de verdad, por tipo.** Con mandos
 *   eléctricos —el JAZ 90, como la ley normal de Airbus o un Embraer E2—, la
 *   trayectoria. Con mandos de cables —todos los demás, el JAZ 120 incluido,
 *   que es un 747 clásico—, **la velocidad a la que quedó compensado**: el gas
 *   sube o baja el avión a esa velocidad, y el morro la cambia. Ver
 *   `AircraftConfig.mandos` y `sostieneLaVelocidad`.
 * - **Y no lleva el avión a la pérdida.** Soltada, si el ala se acerca al
 *   avisador —poco gas sosteniendo una subida—, cede el morro antes que
 *   pasarse: es lo que haría el avión compensado, que vuelve a su velocidad.
 *   Apretando, quien manda es quien aprieta, y en los peldaños que dejan
 *   entrar en pérdida se entra.
 *
 * ## Dónde no está
 *
 * **En tierra.** Rodando, la palanca es el volante y la profundidad, como
 * siempre, y el avión no tiene inclinación ni trayectoria que sostener. La
 * mano coge el avión medio segundo después de dejar el suelo y lo suelta al
 * tocarlo.
 *
 * **Con otra mano a los mandos.** El piloto automático y la nivelada de los
 * peldaños de abajo llevan su eje; mientras lo llevan, ésta se aparta, y
 * vuelve en cuanto quien juega toca ese eje. Ver `otraManoAlabeo`.
 *
 * **Con un mando de juego o un joystick**, que tienen muelle de verdad y su
 * propia posición: ahí manda la mano de quien lo lleva, como en cualquier
 * simulador. Ver `flight/mandos-fisicos.ts`.
 */

import { GRAVITY } from "./atmosphere";
import { esDeChorro, type AircraftConfig } from "./aircraft";
import { ascensoMaximo } from "./carrera";
import { VISUAL_BANK } from "./arcade";
import { ACELERACION_MAXIMA } from "./gases-automaticos";
import { PARA_LA_VELOCIDAD_CON_EL_MORRO } from "./piloto-automatico";

const RAD = Math.PI / 180;

/**
 * **La parte del alabeo a fondo con la que arranca la tecla**: algo más de un
 * quinto. Es el ritmo **tranquilo**, el del pasaje.
 *
 * La avioneta de escuela rueda a fondo a unos setenta grados por segundo y un
 * piloto entra en un viraje normal a unos quince: un quinto largo. Con la
 * misma parte, el JAZ 120 —que rueda a fondo a menos de veinte a su velocidad
 * de maniobra— sale a cuatro, que es lo que se ve hacer a un avión de fuselaje
 * ancho con pasaje. Una parte y no un número por avión: el número sale de la
 * ficha de cada uno, y la ficha es la que tiene que tener razón.
 */
export const PARTE_DEL_ALABEO = 0.22;

/** Con los flaps abajo del todo, el ritmo tranquilo baja un 15 %. */
export const MENOS_CON_FLAPS = 0.15;

/**
 * **Y el tranquilo no baja de tres grados por segundo**, si el avión da al
 * menos el doble.
 *
 * Con solo la parte, el JAZ 120 en la final con los flaps abajo arrancaba a
 * dos grados por segundo, y el JAZ 90 a tres escasos: la tecla parecía no
 * hacer nada. Tres es lo más lento de lo que se hace con pasaje.
 */
export const SUELO_TRANQUILO = 3 * RAD;

/**
 * **La parte del alabeo a fondo a la que sube la tecla mantenida**: dos
 * tercios. Es el ritmo **decidido**.
 *
 * Contado volando el JAZ 120 hacia la pista: «termino dando golpes a las
 * flechas, reacciona a una velocidad absurda, no me da tiempo de estabilizar.
 * Una cosa es deprisa y otra es que se meta 20 segundos para ponerse en
 * horizontal». Con solo el ritmo tranquilo, el grande enderezaba de treinta
 * grados a cero en trece segundos en la final; un piloto de verdad, en una
 * final, corrige con más decisión que con pasaje en crucero.
 *
 * Y la vara de medir es la norma de cualidades de vuelo: **MIL-F-8785C**
 * (1980), tablas IXa y IXf, pide en la aproximación poder cambiar treinta
 * grados de inclinación en 1,3 s una avioneta (clase I), 1,8 s un avión medio
 * (clase II-L) y 2,5 s uno grande (clase III), con el mando a fondo. La NASA
 * lo confirmó para los grandes en simulador con movimiento —NASA/CR-2020-
 * 5002350, tabla 1—. Con dos tercios del mando y el arranque tranquilo, la
 * tecla mantenida tiene que tardar **como mucho el doble** de lo del grande:
 * cinco segundos. El JAZ 120 endereza en la final en algo más de cuatro, y
 * todos los demás, antes que él. Ver `mano-respuesta.test.ts`.
 */
export const PARTE_DECIDIDA = 2 / 3;

/**
 * **Y la tecla decidida nunca pasa de quince grados por segundo**: es lo que
 * pide la palanca de un Airbus en ley normal llevada al tope (FCOM del A320,
 * capítulo 27, *normal law*, alabeo).
 *
 * En los grandes no llega a contar —dos tercios de lo suyo ya es menos—; en
 * las avionetas sí, y es a propósito. Ruedan a fondo a setenta, y dos tercios
 * de eso con una tecla es volver a lo de antes: «al pulsar la tecla hace un
 * movimiento rapidísimo… los pasajeros vomitan hasta la primera papilla». Su
 * ritmo tranquilo ya anda por los quince —el de entrar en un viraje normal,
 * ver `PARTE_DEL_ALABEO`—, y en ellas la tecla mantenida no acelera más. Y es
 * lo que deja a quien vuela asentar el ala sin oscilar: ver
 * `AL_CENTRO_POR_GRADO`.
 *
 * Con la inclinación protegida —la de Airbus, en los reactores y en los dos
 * peldaños de abajo—, tampoco el tranquilo pasa de aquí.
 */
export const RITMO_DE_LA_LEY = 15 * RAD;

/**
 * Lo que se mantiene la tecla antes de que el ritmo empiece a subir, s, y lo
 * que tarda en llegar al decidido. Un toque o una corrección corta se quedan
 * en el tranquilo; mantenida, en poco más de un segundo va decidida.
 */
export const ESPERA_PARA_DECIDIR = 0.3;
export const SUBE_EN = 0.6;

/**
 * **La carga con la que la mano cambia de trayectoria**, en g: un cuarto.
 *
 * Es lo que se nota en el asiento al empezar a subir o al nivelar. Un cuarto
 * de g es una maniobra tranquila con el pasaje sentado; el piloto automático
 * se permite una décima —ver `CARGA_QUE_PIDE`—, y la mano va algo más viva
 * porque la lleva alguien que quiere ver que el avión le responde.
 */
export const CARGA_DE_LA_MANO = 0.25;

/** Y nunca más deprisa que tres grados por segundo, aunque se vuele despacio. */
export const SENDA_POR_SEGUNDO = 3 * RAD;

/**
 * Lo que tarda el ritmo pedido en llegar entero al apretar, s.
 *
 * Es la rampa: la trayectoria empieza a cambiar despacio y se anima, como
 * empieza a girar un avión cuando la mano empieza a mover la palanca.
 */
export const RAMPA_AL_APRETAR = 0.45;

/** Y lo que tarda en pararse al soltar, s: no se clava de golpe. */
export const RAMPA_AL_SOLTAR = 0.3;

/**
 * **Las rampas del alabeo, más cortas**: una décima y media al apretar y un
 * cuarto de segundo al soltar.
 *
 * Con las de la trayectoria —casi medio segundo para llegar al ritmo—, el ala
 * del JAZ 120 tardaba un segundo en moverse un grado: «tarda en reaccionar un
 * poco». Lo lento de un avión grande es el ritmo, no el arranque: la mano
 * mueve el volante en una décima y el avión empieza a rodar enseguida, a su
 * paso. Lo que tarda el avión en responder al alerón ya lo pone el modelo de
 * vuelo, con la inercia de cada uno.
 */
export const RAMPA_DEL_ALABEO_AL_APRETAR = 0.15;
export const RAMPA_DEL_ALABEO_AL_SOLTAR = 0.25;

/**
 * **La inclinación a la que vuelve el avión protegido**: 33°.
 *
 * Es la de Airbus y la de Embraer: pasado de ahí, al soltar, el avión vuelve
 * solo, despacio. Vale en los reactores y en los dos peldaños de abajo, en
 * cualquier avión.
 */
export const INCLINACION_PROTEGIDA = 33 * RAD;

/**
 * Hasta dónde se deja inclinar el reactor protegido **apretando**: 67°, el
 * tope de la protección de verdad. En los peldaños de abajo no se pasa de 33.
 */
export const INCLINACION_TOPE_DEL_REACTOR = 67 * RAD;

/**
 * Y sin protección, 60°: más allá ya no es un viraje, es acrobacia, y hay
 * reglamento que lo dice.
 */
export const INCLINACION_TOPE = 60 * RAD;

/** Lo que inclina la palanca del dedo a fondo, protegido o no. */
export const INCLINACION_DEL_DEDO_PROTEGIDA = 30 * RAD;
export const INCLINACION_DEL_DEDO = 45 * RAD;

/** Los topes de la trayectoria con la tecla, rad. */
export const SENDA_MAS_ALTA = 20 * RAD;
export const SENDA_MAS_BAJA = -15 * RAD;

/**
 * **Un toque corto mueve un poco y se queda.**
 *
 * Medio grado de trayectoria, que a cien nudos son cien pies por minuto: el
 * clic de la rueda de velocidad vertical de un automático. Y tres grados de
 * inclinación, una corrección pequeña de rumbo; en la final, la mitad —ver
 * `MENOS_EN_LA_FINAL`—.
 *
 * **Y los toques se suman.** Cada golpe partía de donde estuviera la consigna
 * en ese momento, y lo que le faltaba al golpe anterior se perdía: a golpes,
 * el ala no iba más deprisa que con la tecla mantenida —«no me enderezo
 * frente a la pista ni a martillazos con el teclado»—. Ahora cada golpe se
 * suma a lo que quedaba por hacer, y lo hace a ritmo decidido: tres golpes
 * son nueve grados, y se ven.
 */
export const TOQUE_DE_SENDA = 0.5 * RAD;
export const TOQUE_DE_ALABEO = 3 * RAD;

/**
 * **Y en la final, la mitad**: con los flaps abajo del todo y cerca de las
 * alas niveladas, el toque de alabeo se queda en la mitad —grado y medio—, y
 * con los flaps a medias, en medio. Ver `toqueDeAlabeo` e `imanDeAlabeo`.
 *
 * Enrique, con el JAZ 120 en la final, flaps a tope y tren fuera: «para
 * moverlo derecha izquierda (fino) e ir estabilizando, tienes que verme dando
 * dedazos a las flechas de los nervios. Es como llevar un cochito loco». Tres
 * grados por toque es una corrección pequeña en crucero, y en la final es
 * demasiado: a 146 nudos, tres grados de inclinación giran el JAZ 120 cuatro
 * décimas de grado por segundo, y en cuanto se quiere menos —meterse en el eje
 * desde treinta metros pide uno o dos grados unos segundos— no hay toque que
 * lo dé: o tres, o nada. Medido con un piloto que intenta meterse en el eje a
 * toques, con tres décimas de reacción y un toque cada segundo largo: con tres
 * grados por toque, el JAZ 120 en Taguató y el JAZ 90 en Tukã no llegaban a
 * quedarse en el eje en un minuto; con grado y medio, se quedan en quince
 * segundos, y ninguno se pasa al otro lado más de una vez. Ver
 * `final-fina.test.ts`.
 *
 * Lo real: en la final **se corrige con inclinaciones pequeñas y las alas casi
 * niveladas**. Una aproximación estabilizada es la que «solo necesita cambios
 * pequeños de rumbo y de cabeceo para seguir la trayectoria» (Flight Safety
 * Foundation, ALAR, nota 7.1), y el manual de vuelo de la FAA enseña la final
 * igual: alineado con el eje, corrigiendo poco y pronto (FAA-H-8083-3C,
 * capítulo 9). Los flaps abajo son la señal de que se está ahí: es la
 * configuración de aterrizar.
 */
export const MENOS_EN_LA_FINAL = 0.5;

/**
 * **Lo fino que va la mano con estos flaps**, de 1 limpio a
 * `1 − MENOS_EN_LA_FINAL` con los de aterrizar.
 */
export function finoConFlaps(flaps: number): number {
  return 1 - MENOS_EN_LA_FINAL * Math.max(0, Math.min(1, Number.isFinite(flaps) ? flaps : 0));
}

/**
 * **Y solo cerca de las alas niveladas**: hasta cinco grados de inclinación,
 * que es donde se vuela una final. Más allá, el toque de siempre.
 *
 * Con el toque fino en todas partes, enderezar a golpes desde treinta grados
 * —el viraje que mete el avión en la final— pedía el doble de golpes, y eso
 * era volver a la otra queja de la misma final: «no me enderezo frente a la
 * pista ni a martillazos con el teclado». Lejos del centro un toque sigue
 * siendo de tres grados; cerca, de grado y medio.
 */
export const BANDA_FINA = 5 * RAD;

/**
 * **Lo que mueve un toque de alabeo** que empieza en `desde`, rad. Ver
 * `TOQUE_DE_ALABEO`, `MENOS_EN_LA_FINAL` y `BANDA_FINA`.
 */
export function toqueDeAlabeo(desde: number, flaps: number): number {
  return TOQUE_DE_ALABEO * (Math.abs(desde) < BANDA_FINA - 1e-9 ? finoConFlaps(flaps) : 1);
}

/**
 * **El imán del centro con estos flaps**, rad: con los de aterrizar, el de los
 * peldaños de abajo baja al de los de arriba —tres grados—.
 *
 * Seis grados de imán se comían las correcciones de la final: volviendo de
 * una inclinación, soltar a cinco grados llevaba el ala a cero de golpe, y
 * lo que se quería era cinco. Tres sigue recogiendo lo que se pasa quien
 * suelta al ver el horizonte recto, que es para lo que está.
 */
export function imanDeAlabeo(peldanoBajo: boolean, flaps: number): number {
  const base = peldanoBajo ? IMAN_DE_ALABEO_ABAJO : IMAN_DE_ALABEO;
  return Math.max(IMAN_DE_ALABEO, base * finoConFlaps(flaps));
}

/**
 * **El imán del centro.** Al soltar la tecla **volviendo** hacia las alas
 * niveladas o hacia el vuelo nivelado, cerca de ellos, la consigna se va al
 * cero: es el imán de la palanca de gases puesto en el mando —ver `alIman`— y
 * es lo que deja volar recto sin puntería. Y un toque que pasaría por el cero
 * se queda en él, como una muesca.
 *
 * Solo volviendo. Saliendo del centro, una corrección corta se queda donde se
 * deja: con el imán para todo, apretar un cuarto de segundo desde nivelado no
 * hacía nada, porque el imán lo devolvía al cero.
 *
 * Con la tecla decidida el ala no se para en seco al soltar —el avión tiene
 * su inercia: ver `FRENO_AL_SOLTAR`—, y quien suelta al ver el horizonte recto
 * lo deja un par de grados pasado: el imán del alabeo tiene que cogerlo ahí.
 * Y en los peldaños de abajo es más generoso, que quien vuela allí tiene
 * cuatro años.
 */
export const IMAN_DE_ALABEO = 3 * RAD;
export const IMAN_DE_ALABEO_ABAJO = 6 * RAD;
export const IMAN_DE_SENDA = 0.3 * RAD;

/**
 * Cuánto se queda la mano lejos del avisador de pérdida cuando sostiene, rad.
 *
 * Grado y medio: lo bastante para que el avisador no cante con la mano
 * sosteniendo, y poco para que no se pierda subida sin necesidad.
 */
export const LEJOS_DEL_AVISADOR = 1.5 * RAD;

/**
 * **Si la mano, suelta, sostiene la velocidad compensada** —en vez de la
 * trayectoria—: en los aviones de mandos convencionales, mientras nadie lleve
 * ya la velocidad con el gas.
 *
 * Enrique, en la final de la avioneta a un campo de hierba: «esta avioneta
 * casi no baja». Quitaba gas y la mano sostenía el nivel con el morro, como la
 * ley normal de un Airbus, hasta que la velocidad se iba a 45 nudos y cedía
 * al acercarse al avisador. Eso es lo que hace un avión de mandos eléctricos;
 * uno de cables, compensado a una velocidad, **baja el morro solo al quitarle
 * gas y desciende a esa misma velocidad**: es la estabilidad de velocidad que
 * la norma exige a todo avión certificado (14 CFR 23.173 y 25.173), y es como
 * se vuela una aproximación de avioneta: la velocidad con el morro y
 * compensador, la bajada con el gas (FAA, *Airplane Flying Handbook*,
 * FAA-H-8083-3C, capítulo 9).
 *
 * Con gases automáticos o con la ayuda de la final de Guyrami llevando la
 * velocidad, la trayectoria, en todos: es lo que hace quien vuela a mano con
 * los gases puestos —la senda con el morro, compensando a la velocidad que
 * ellos llevan—, y así la ayuda que lleva el gas y la mano no pelean.
 */
export function sostieneLaVelocidad(ve: {
  readonly aircraft: AircraftConfig;
  readonly gasLlevaLaVelocidad: boolean;
}): boolean {
  return ve.aircraft.mandos === "convencionales" && !ve.gasLlevaLaVelocidad;
}

/**
 * **Lo que mueve un toque de morro en la velocidad compensada**, m/s: dos
 * nudos, morro arriba más despacio. Se ve moverse en la cinta y no se come una
 * final: la Vref más cinco se pisa con dos o tres toques. Es el golpe del
 * compensador eléctrico, que en un avión de cables es lo que cambia la
 * velocidad a la que vuela solo.
 */
export const TOQUE_DE_VELOCIDAD = 2 * 0.514444;

/**
 * **Lo que tarda la trayectoria pedida en seguir a la velocidad**, s.
 *
 * El lazo es el del automático en `FLCH SPD`: la velocidad que falta pide una
 * aceleración —la recupera en `PARA_LA_VELOCIDAD_CON_EL_MORRO`—, y la energía
 * que gana el avión de verdad dice cuánta subida o bajada sobra. Medirla es lo
 * que lo amortigua: mirando solo la velocidad que falta, el morro iría
 * siempre tarde y el avión subiría y bajaría como un fugoide sin piloto. Ver
 * `medirLaEnergia` y `aproximacion-por-tipo.test.ts`.
 */
const SIGUE_LA_VELOCIDAD = 1;

/** Lo que espera la mano después de despegar antes de coger el avión, s. */
export const ESPERA_AL_DESPEGAR = 0.5;

/**
 * **Lo que la mano ve del avión en cada fotograma.** Lo rellena el juego, y
 * en las pruebas el banco: la mano no sabe de física y no la toca.
 */
export interface LoQueVeLaMano {
  readonly aircraft: AircraftConfig;
  /** Si vuela el modelo sencillo, el del primer peldaño. Ver `arcade.ts`. */
  readonly sencillo: boolean;
  /** Si el peldaño no deja entrar en pérdida. Ver `stallProtection`. */
  readonly protegePerdida: boolean;
  /** Si el peldaño es de los de abajo, con la inclinación protegida. */
  readonly peldanoBajo: boolean;
  readonly enTierra: boolean;
  /** Alabeo, rad, positivo a la derecha. */
  readonly alabeo: number;
  /** Cabeceo, rad, positivo morro arriba. */
  readonly cabeceo: number;
  /** Ritmos en ejes del avión, rad/s. Ver `FlightState`. */
  readonly ritmoDeAlabeo: number;
  readonly ritmoDeCabeceo: number;
  /** Velocidad vertical, m/s. */
  readonly vertical: number;
  /** El factor de carga, g: lo que se nota en el asiento. */
  readonly carga: number;
  /** Velocidad verdadera, m/s. */
  readonly verdadera: number;
  /**
   * Velocidad indicada, m/s: la que sostiene un avión compensado, porque lo
   * que compensa el compensador es un ángulo de ataque, y a uno ge eso es una
   * indicada. Ver `sostieneLaVelocidad`.
   */
  readonly indicada: number;
  /**
   * **Si algo lleva ya la velocidad con el gas**: los gases automáticos del
   * reactor o la ayuda de la final de Guyrami. Entonces la mano sostiene la
   * trayectoria en todos los aviones —con gases automáticos, un piloto vuela
   * la senda con el morro y compensa a la velocidad que ellos llevan—, y dos
   * manos no pelean por la misma velocidad. Ver `sostieneLaVelocidad`.
   */
  readonly gasLlevaLaVelocidad: boolean;
  /** Ángulo de ataque y el del avisador, rad. */
  readonly alfa: number;
  readonly alfaDeAviso: number;
  /** Dónde están los flaps, 0 a 1. */
  readonly flaps: number;
  /** El timón que sostiene el avión ahora. Ver `FlightModel.timonAhora`. */
  readonly timon: number;
  /** En el modelo sencillo, qué palanca da un ritmo de subida. */
  readonly mandoParaSubir?: ((ritmo: number) => number) | undefined;
  /**
   * Y qué alerón dibuja esta inclinación, rad. Ver `mandoParaInclinar` en
   * `arcade.ts`. Sin él, la cuenta de siempre: `VISUAL_BANK`.
   */
  readonly mandoParaInclinar?: ((alabeo: number) => number) | undefined;
  /** Si otra mano —el automático, la nivelada— lleva ya ese eje. */
  readonly otraManoAlabeo: boolean;
  readonly otraManoCabeceo: boolean;
}

/** Lo que pide quien vuela en este fotograma, eje por eje. */
export interface LoQuePide {
  /** La tecla de alabeo: +1 derecha, −1 izquierda, 0 suelta. */
  teclaAlabeo: number;
  /** La de cabeceo: +1 morro arriba, con el signo de los ajustes ya puesto. */
  teclaCabeceo: number;
  /** Los toques cortos que llegaron desde el último fotograma, con su signo. */
  toqueAlabeo: number;
  toqueCabeceo: number;
  /** Si un mando de juego se está moviendo en ese eje: entonces manda él. */
  mandoAlabeo: boolean;
  mandoCabeceo: boolean;
}

/**
 * **Una consigna que se mueve a un ritmo**, con rampa al empezar y al parar.
 *
 * Es la pieza que quita el golpe: la tecla no pone el ala en ningún sitio,
 * pide que la consigna se mueva, y la consigna se anima y se frena.
 */
export class Consigna {
  /** Dónde está, rad. */
  valor = 0;
  /** A qué ritmo se mueve ahora, rad/s. */
  ritmo = 0;

  /** Con sus rampas, s: ver `RAMPA_AL_APRETAR` y las del alabeo. */
  constructor(
    private readonly alApretar = RAMPA_AL_APRETAR,
    private readonly alSoltar = RAMPA_AL_SOLTAR,
  ) {}

  /**
   * Un fotograma pidiendo `pide` (−1 a 1) del ritmo `ritmoMaximo`, sin pasar
   * de `[min, max]`.
   */
  mover(dt: number, pide: number, ritmoMaximo: number, min: number, max: number): void {
    const quiere = pide * ritmoMaximo;
    const acelera =
      Math.abs(quiere) > Math.abs(this.ritmo) &&
      (this.ritmo === 0 || Math.sign(quiere) === Math.sign(this.ritmo));
    const paso =
      (Math.max(ritmoMaximo, 1e-6) / (acelera ? this.alApretar : this.alSoltar)) * dt;
    this.ritmo += acotar(quiere - this.ritmo, paso);
    let v = this.valor + this.ritmo * dt;
    if (v > max) {
      v = max;
      if (this.ritmo > 0) this.ritmo = 0;
    }
    if (v < min) {
      v = min;
      if (this.ritmo < 0) this.ritmo = 0;
    }
    this.valor = v;
  }

  /**
   * Un fotograma yendo **hacia un sitio**: tan deprisa como deja el ritmo y
   * frenando a tiempo de pararse justo ahí, sin pasarse.
   */
  hacia(dt: number, sitio: number, ritmoMaximo: number, min: number, max: number): void {
    const meta = Math.max(min, Math.min(max, sitio));
    const falta = meta - this.valor;
    if (Math.abs(falta) < 1e-5 && Math.abs(this.ritmo) < 1e-4) {
      this.valor = meta;
      this.ritmo = 0;
      return;
    }
    // Lo que se puede llevar y aún pararse en lo que falta: v² = 2·a·d.
    const frena = Math.sqrt(
      2 * (Math.max(ritmoMaximo, 1e-6) / this.alSoltar) * Math.abs(falta),
    );
    const pide =
      (Math.sign(falta) * Math.min(ritmoMaximo, frena)) / Math.max(ritmoMaximo, 1e-6);
    this.mover(dt, pide, ritmoMaximo, min, max);
    if ((meta - this.valor) * falta <= 0) {
      this.valor = meta;
      this.ritmo = 0;
    }
  }

  /** Coger el avión como está: aquí, quieta. */
  poner(valor: number): void {
    this.valor = valor;
    this.ritmo = 0;
  }
}

/**
 * **Lo que rueda el avión con el alerón a fondo**, rad/s por unidad de mando,
 * a esta velocidad. Es la cuenta de la ficha —`clAileron/|clP| · 2V/b`, ver
 * `AircraftConfig.aero.clAileron`— con el mismo suelo de velocidad que el
 * modelo de vuelo. Sin el amortiguamiento de más del peldaño, que el modelo
 * de vuelo aparta mientras la mano lleva el alabeo: ver `manoEnElAlabeo`.
 */
export function alabeoAFondo(a: AircraftConfig, verdadera: number): number {
  const vRef = Math.max(verdadera, a.cruiseSpeed * 0.35);
  return (a.aero.clAileron * 2 * vRef) / (Math.abs(a.aero.clP) * a.wingSpan);
}

/**
 * **Los dos ritmos de alabeo de la mano**, rad/s: el **tranquilo**, con el
 * que arranca la tecla, y el **decidido**, al que sube si se mantiene. Los dos
 * son partes del que da el avión a fondo a esta velocidad —ver
 * `PARTE_DEL_ALABEO` y `PARTE_DECIDIDA`—, así que despacio salen más lentos,
 * porque el avión de verdad también lo es: el alerón muerde con la velocidad.
 * Ninguno pasa nunca del alabeo a fondo; el decidido no pasa de
 * `RITMO_DE_LA_LEY`, y con la inclinación protegida, el tranquilo tampoco.
 */
export function ritmosDeAlabeo(
  a: AircraftConfig,
  verdadera: number,
  flaps: number,
  protegido: boolean,
): { tranquilo: number; decidido: number } {
  const aFondo = alabeoAFondo(a, verdadera);
  const parte = PARTE_DEL_ALABEO * aFondo * (1 - MENOS_CON_FLAPS * Math.max(0, Math.min(1, flaps)));
  const tranquilo = Math.min(
    protegido ? RITMO_DE_LA_LEY : Infinity,
    Math.max(parte, Math.min(SUELO_TRANQUILO, aFondo / 2)),
  );
  const decidido = Math.max(tranquilo, Math.min(RITMO_DE_LA_LEY, PARTE_DECIDIDA * aFondo));
  return { tranquilo, decidido };
}

/** El ritmo tranquilo: con el que arranca la tecla. Ver `ritmosDeAlabeo`. */
export function ritmoDeAlabeoDeLaMano(
  a: AircraftConfig,
  verdadera: number,
  flaps: number,
  protegido = false,
): number {
  return ritmosDeAlabeo(a, verdadera, flaps, protegido).tranquilo;
}

/**
 * **El ritmo de la tecla mantenida** `apretada` segundos: el tranquilo hasta
 * `ESPERA_PARA_DECIDIR`, y de ahí sube al decidido en `SUBE_EN`.
 */
export function ritmoApretando(apretada: number, tranquilo: number, decidido: number): number {
  const sube = Math.max(0, Math.min(1, (apretada - ESPERA_PARA_DECIDIR) / SUBE_EN));
  return tranquilo + (decidido - tranquilo) * sube;
}

/**
 * **El ritmo al que la mano cambia de trayectoria**, rad/s: el que aprieta un
 * cuarto de g, con su tope. Girar la trayectoria a `ω` volando a `V` aprieta
 * `ω·V/g` ges.
 */
export function ritmoDeSendaDeLaMano(verdadera: number): number {
  return Math.min(SENDA_POR_SEGUNDO, (CARGA_DE_LA_MANO * GRAVITY) / Math.max(verdadera, 15));
}

/**
 * **Lo que sube y lo que baja la palanca del dedo a fondo**, rad de
 * trayectoria. Arriba, la subida que da el avión a su velocidad de subida —la
 * cuenta de `ascensoMaximo`—, entre cuatro y doce grados; abajo, otro tanto
 * hasta un tope de ocho, que ya es bajar con prisa.
 */
export function sendasDelDedo(a: AircraftConfig): { sube: number; baja: number } {
  const v = a.rotationSpeed * 1.2;
  const sube = Math.max(4 * RAD, Math.min(12 * RAD, Math.asin(Math.min(1, ascensoMaximo(a) / v))));
  return { sube, baja: -Math.max(4 * RAD, Math.min(8 * RAD, sube)) };
}

/**
 * **La curva de la palanca del dedo**: zona muerta en el centro y suave al
 * principio. Con una recta, el primer milímetro ya inclinaba el ala, y el
 * pulgar no es tan fino: «súper sensible». Con esto la mitad del recorrido da
 * algo más de un cuarto, y a fondo, todo.
 */
export const ZONA_MUERTA_DEL_DEDO = 0.06;
const LINEAL = 0.35;

export function curvaDelDedo(v: number): number {
  const u = (Math.abs(v) - ZONA_MUERTA_DEL_DEDO) / (1 - ZONA_MUERTA_DEL_DEDO);
  if (u <= 0) return 0;
  const w = Math.min(1, u);
  return Math.sign(v) * (LINEAL * w + (1 - LINEAL) * w * w * w);
}

/** La vuelta de la curva: qué palanca da esta parte. Para pintar el punto. */
export function palancaDeLaCurva(c: number): number {
  const m = Math.min(1, Math.abs(c));
  if (m <= 0) return 0;
  // La curva es creciente: la mitad por bisección basta y no se equivoca.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (LINEAL * mid + (1 - LINEAL) * mid * mid * mid < m) lo = mid;
    else hi = mid;
  }
  const w = (lo + hi) / 2;
  return Math.sign(c) * (ZONA_MUERTA_DEL_DEDO + w * (1 - ZONA_MUERTA_DEL_DEDO));
}

/** Un eje de la mano. */
interface Eje {
  /** Si la mano lleva este eje ahora. */
  activo: boolean;
  readonly consigna: Consigna;
  /**
   * El sitio al que va la consigna, rad, o `null` si la mueve la tecla. Lo
   * pone el dedo, el doble toque, el imán al soltar y los toques cortos.
   */
  meta: number | null;
  /** Si la meta la puso el dedo: entonces la palanca se pinta en la meta. */
  metaDelDedo: boolean;
  /**
   * Si a la meta se va con prisa —al ritmo decidido: los toques, el dedo, el
   * imán que coge la consigna en marcha— o despacio —el doble toque, la
   * protección que devuelve a 33°—. Solo cuenta en el alabeo.
   */
  prisa: boolean;
  /** La tecla del fotograma anterior, para ver cuándo se suelta. */
  teclaAntes: number;
  /** Lo que lleva apretada la tecla de ahora, s. */
  apretada: number;
  /** Dónde estaba la consigna al apretarla, rad: si se vuelve al centro. */
  desde: number;
  /**
   * La meta que dejaron los toques de antes y que la tecla de ahora aparta, por
   * si ésta acaba siendo otro toque: entonces se suma a ella. Ver
   * `TOQUE_DE_ALABEO`.
   */
  pendiente: number | null;
  /**
   * Si acaba de soltarse la tecla y el avión está frenando el alabeo que
   * llevaba, y desde cuándo, s. Ver `FRENO_AL_SOLTAR`.
   */
  frenando: boolean;
  frenandoDesde: number;
  /** Hacia dónde iba la tecla que se soltó, ±1. */
  sentidoAlSoltar: number;
  /** Si la tecla que se soltó volvía hacia el centro: para el imán. */
  volvia: boolean;
  /** Lo que se veía al soltar la tecla, rad. Ver `alIman`. */
  alSoltar: number;
  /**
   * Lo menos que deja la tecla que se acaba de soltar, rad: un toque desde
   * donde empezó. Ver `alMinimo`.
   */
  minimo: number | null;
}

const ejeNuevo = (consigna: Consigna): Eje => ({
  activo: false,
  consigna,
  meta: null,
  metaDelDedo: false,
  prisa: false,
  teclaAntes: 0,
  apretada: 0,
  desde: 0,
  pendiente: null,
  frenando: false,
  frenandoDesde: 0,
  sentidoAlSoltar: 0,
  volvia: false,
  alSoltar: 0,
  minimo: null,
});

/**
 * **La mano.** Un fotograma: `paso`. Lo que pide a los mandos queda en
 * `aileron`, `elevator` y `trim`, y si lleva cada eje, en `llevaAlabeo` y
 * `llevaCabeceo`.
 */
export class ManoQueSostiene {
  readonly alabeo: Eje = ejeNuevo(
    new Consigna(RAMPA_DEL_ALABEO_AL_APRETAR, RAMPA_DEL_ALABEO_AL_SOLTAR),
  );
  readonly cabeceo: Eje = ejeNuevo(new Consigna());

  /** Lo que pide la mano a los mandos en este fotograma. */
  aileron = 0;
  elevator = 0;
  /** El compensador que sostiene la trayectoria. Ver la cabecera. */
  trim = 0;

  /** Lo que se ha ido sumando de trayectoria que faltaba, rad/s. */
  private suma = 0;
  /**
   * Y en el modelo sencillo, lo que se ha ido sumando de subida que faltaba,
   * m/s: lo que el aire se lleva y la palanca devuelve. Ver `pasoDelCabeceo`.
   */
  private subidaQueFalta = 0;
  /**
   * **La velocidad compensada**, indicada, m/s, o `null` si ahora no se
   * sostiene una: la que sostiene la mano suelta en un avión de cables. Ver
   * `sostieneLaVelocidad`.
   */
  private compensada: number | null = null;
  /** La compensada de antes de apretar la tecla: un toque cuenta desde ella. */
  private compensadaAlApretar: number | null = null;
  /**
   * En el modelo sencillo, **la palanca compensada**: la que se dejó al soltar.
   * Ahí no hay velocidad que sostener con el morro —el gas es la velocidad—,
   * y lo que hace el avión compensado es quedarse con su palanca: el gas sube
   * o baja. Ver `pasoDelCabeceo`.
   */
  private palancaCompensada: number | null = null;
  private palancaAlApretar: number | null = null;
  /** Lo que gana de energía el avión, medido, para el lazo de la velocidad. */
  private readonly energia: Energia = { verdadera: null, gana: 0 };

  /** La velocidad compensada de ahora, indicada, m/s, o `null`. */
  get velocidadCompensada(): number | null {
    return this.compensada;
  }
  /** Lo que lleva en el aire desde que despegó, s. */
  private enElAire = 0;
  /** Lo último visto, para pintar la palanca sin pedírselo otra vez al juego. */
  private ultimo: LoQueVeLaMano | null = null;

  get llevaAlabeo(): boolean {
    return this.alabeo.activo;
  }

  get llevaCabeceo(): boolean {
    return this.cabeceo.activo;
  }

  /**
   * Si la mano puede coger el avión ahora: en el aire, pasado el medio
   * segundo de después de despegar. Lo mira la palanca del dedo para saber si
   * es volante o palanca que se queda.
   */
  get puedeCoger(): boolean {
    return this.ultimo !== null && this.puedeLlevar(this.ultimo);
  }

  /**
   * **El dedo ha puesto la palanca aquí**: `x` alabeo y `y` cabeceo, −1 a 1
   * cada uno, morro arriba positivo, o `null` en el eje que el dedo no movió.
   *
   * La mano coge **los dos ejes** —el que no se movió, como está—, igual que
   * con la tecla: ver `cogerElAvion`. Y el que lleva otra mano, el piloto
   * automático con su rumbo por ejemplo, no se toca.
   */
  ponerPalanca(x: number | null, y: number | null): void {
    const ve = this.ultimo;
    if (!ve || !this.puedeLlevar(ve)) return;
    this.cogerElAvion(ve);
    if (x !== null && this.alabeo.activo) {
      this.alabeo.meta = curvaDelDedo(x) * this.inclinacionDelDedo(ve);
      this.alabeo.metaDelDedo = true;
      this.alabeo.prisa = true;
    }
    if (y !== null && this.cabeceo.activo) {
      const { sube, baja } = sendasDelDedo(ve.aircraft);
      const c = curvaDelDedo(y);
      this.cabeceo.meta = c >= 0 ? c * sube : -c * baja;
      this.cabeceo.metaDelDedo = true;
    }
  }

  /**
   * **El doble toque**: alas niveladas y vuelo nivelado, despacio. La mano
   * sigue llevando los ejes que llevaba; solo cambia a dónde.
   */
  centrar(): void {
    for (const eje of [this.alabeo, this.cabeceo]) {
      if (!eje.activo) continue;
      eje.meta = 0;
      eje.metaDelDedo = false;
      eje.prisa = false;
    }
  }

  /**
   * **Dónde se pinta la palanca del dedo**, −1 a 1: la meta del dedo si la
   * dejó él, y si no, la consigna de ahora —que se mueve con la tecla y que,
   * tras el doble toque, vuelve despacio al centro—. Cero en el eje que no
   * lleva.
   */
  palanca(): { x: number; y: number } {
    const ve = this.ultimo;
    if (!ve) return { x: 0, y: 0 };
    const a = this.alabeo;
    const c = this.cabeceo;
    const x = a.activo
      ? palancaDeLaCurva(
          (a.metaDelDedo && a.meta !== null ? a.meta : a.consigna.valor) /
            this.inclinacionDelDedo(ve),
        )
      : 0;
    let y = 0;
    // Con la velocidad compensada la mano está suelta: la palanca, al centro.
    if (c.activo && this.compensada === null) {
      const { sube, baja } = sendasDelDedo(ve.aircraft);
      const s = c.metaDelDedo && c.meta !== null ? c.meta : c.consigna.valor;
      y = palancaDeLaCurva(s >= 0 ? s / sube : -s / baja);
    }
    return { x, y };
  }

  /** Soltar los dos ejes: un vuelo nuevo, otro avión, el suelo. */
  soltar(): void {
    for (const eje of [this.alabeo, this.cabeceo]) {
      eje.activo = false;
      eje.meta = null;
      eje.metaDelDedo = false;
      eje.consigna.poner(0);
    }
    this.aileron = 0;
    this.elevator = 0;
    this.subidaQueFalta = 0;
    this.olvidarLaCompensada();
  }

  private olvidarLaCompensada(): void {
    this.compensada = null;
    this.compensadaAlApretar = null;
    this.palancaCompensada = null;
    this.palancaAlApretar = null;
    this.energia.verdadera = null;
    this.energia.gana = 0;
  }

  /** Un fotograma de la mano. */
  paso(dt: number, ve: LoQueVeLaMano, pide: LoQuePide): void {
    this.ultimo = ve;
    this.enElAire = ve.enTierra ? 0 : this.enElAire + dt;
    if (!this.puedeLlevar(ve)) {
      if (this.alabeo.activo || this.cabeceo.activo) this.soltar();
      return;
    }
    if (ve.otraManoAlabeo || pide.mandoAlabeo) this.soltarEje(this.alabeo);
    if (ve.otraManoCabeceo || pide.mandoCabeceo) this.soltarEje(this.cabeceo);
    const tocan =
      pide.teclaAlabeo !== 0 ||
      pide.teclaCabeceo !== 0 ||
      pide.toqueAlabeo !== 0 ||
      pide.toqueCabeceo !== 0;
    if (tocan) this.cogerElAvion(ve, pide);
    this.pasoDelAlabeo(dt, ve, pide);
    this.pasoDelCabeceo(dt, ve, pide);
  }

  /**
   * **La mano coge los dos ejes a la vez**, aunque se toque uno.
   *
   * Cogía solo el que se tocaba, y en el peldaño sin ayudas eso es una
   * espiral: se inclinaba el ala con la flecha, nadie sostenía la
   * trayectoria y el avión se iba de morro dentro del viraje. Medido con el
   * JAZ 90 a sesenta y siete grados: cien metros por segundo de bajada en
   * quince segundos. Una mano en la palanca lleva los dos ejes, y en un
   * viraje tira lo que hace falta para no bajar.
   *
   * Menos el que lleve otra mano o un mando de juego que se esté moviendo.
   */
  private cogerElAvion(ve: LoQueVeLaMano, pide?: LoQuePide): void {
    if (!ve.otraManoAlabeo && !pide?.mandoAlabeo) this.coger(this.alabeo, ve, "alabeo");
    if (!ve.otraManoCabeceo && !pide?.mandoCabeceo) this.coger(this.cabeceo, ve, "cabeceo");
  }

  private puedeLlevar(ve: LoQueVeLaMano): boolean {
    return !ve.enTierra && this.enElAire >= ESPERA_AL_DESPEGAR;
  }

  /** Coge un eje como está el avión, si no lo llevaba ya. */
  private coger(eje: Eje, ve: LoQueVeLaMano, cual: "alabeo" | "cabeceo"): void {
    if (eje.activo) return;
    eje.activo = true;
    eje.meta = null;
    eje.metaDelDedo = false;
    eje.frenando = false;
    if (cual === "alabeo") {
      eje.consigna.poner(ve.alabeo);
    } else {
      eje.consigna.poner(trayectoria(ve));
      // El compensador coge lo que sostiene el avión, y la profundidad, nada:
      // así no hay tirón al coger el mando. Ver `timonAhora`.
      this.trim = acotar(ve.timon, 1);
      this.elevator = 0;
      this.suma = 0;
      this.subidaQueFalta = 0;
      this.olvidarLaCompensada();
    }
  }

  private soltarEje(eje: Eje): void {
    eje.activo = false;
    eje.meta = null;
    eje.metaDelDedo = false;
    eje.pendiente = null;
    eje.frenando = false;
    eje.minimo = null;
  }

  /**
   * **Lo que hacen la tecla y los toques con la meta de un eje**, en un
   * fotograma. Al apretar, la tecla aparta la meta —manda ella— y guarda la de
   * los toques, por si acaba siendo otro. Al soltar volviendo al centro y
   * cerca de él, el imán —o, con `frena`, el freno, y el imán cuando pare—.
   * Y el toque, que se suma a lo que le quedaba al de antes y no cruza el
   * centro: ver `TOQUE_DE_ALABEO` e `IMAN_DE_ALABEO`. Mover la consigna es
   * cosa de quien llama.
   */
  private teclaYToques(
    eje: Eje,
    dt: number,
    tecla: number,
    toque: number,
    paso: (desde: number) => number,
    iman: number,
    frena: boolean,
  ): void {
    const c = eje.consigna;
    if (tecla !== 0) {
      if (tecla !== eje.teclaAntes) {
        eje.apretada = 0;
        eje.desde = c.valor;
        eje.pendiente = eje.meta !== null && !eje.metaDelDedo ? eje.meta : null;
      } else eje.apretada += dt;
      eje.meta = null;
      eje.metaDelDedo = false;
      eje.frenando = false;
      eje.minimo = null;
      return;
    }
    const soltada = eje.teclaAntes !== 0;
    if (soltada && toque === 0) {
      eje.volvia = Math.abs(eje.desde) > iman && Math.sign(eje.desde) === -eje.teclaAntes;
      /*
       * Lo menos que deja: un toque desde donde empezó —o desde donde iban los
       * toques de antes, si iban más allá—, parando en el centro como ellos.
       * Ver `alMinimo`.
       */
      const sentido = eje.teclaAntes;
      const base =
        eje.pendiente !== null && (eje.pendiente - eje.desde) * sentido > 0
          ? eje.pendiente
          : eje.desde;
      const minimo = base + sentido * paso(base);
      eje.minimo = base * minimo < 0 ? 0 : minimo;
      eje.sentidoAlSoltar = sentido;
      if (frena) {
        eje.frenando = true;
        eje.frenandoDesde = 0;
      } else {
        alIman(eje, iman);
        alMinimo(eje);
      }
    }
    if (toque !== 0) {
      eje.minimo = null;
      const signo = Math.sign(toque);
      const pendiente = soltada ? eje.pendiente : eje.metaDelDedo ? null : eje.meta;
      /*
       * Desde donde estaba al apretar, si la tecla del toque acaba de soltarse:
       * lo que se movió mientras se apretaba no se suma al paso. Así un toque
       * es siempre un toque, dure una centésima o dos décimas, y lo que deja una
       * tecla un poco más larga —ver `alMinimo`— empieza justo ahí.
       */
      const desde = soltada ? eje.desde : c.valor;
      const base =
        pendiente !== null && (pendiente - desde) * signo > 0 ? pendiente : desde;
      const meta = base + signo * paso(base);
      eje.meta = base * meta < 0 ? 0 : meta;
      eje.metaDelDedo = false;
      eje.prisa = true;
    }
    if (soltada) eje.pendiente = null;
  }

  private inclinacionDelDedo(ve: LoQueVeLaMano): number {
    return protegido(ve) ? INCLINACION_DEL_DEDO_PROTEGIDA : INCLINACION_DEL_DEDO;
  }

  // ── Alabeo ─────────────────────────────────────────────────────────────

  private pasoDelAlabeo(dt: number, ve: LoQueVeLaMano, pide: LoQuePide): void {
    const eje = this.alabeo;
    const tecla = Math.sign(pide.teclaAlabeo);
    if (!eje.activo) {
      eje.teclaAntes = tecla;
      return;
    }
    const conProteccion = protegido(ve);
    const ritmos = ritmosDeAlabeo(ve.aircraft, ve.verdadera, ve.flaps, conProteccion);
    const tranquilo = Math.max(ritmos.tranquilo, 0.5 * RAD);
    const decidido = Math.max(ritmos.decidido, tranquilo);
    /*
     * Los topes. Sin protección, sesenta. Protegido, treinta y tres suelto; y
     * apretando, el reactor de los peldaños de arriba llega a sesenta y siete
     * —y vuelve a treinta y tres al soltar—, mientras que en los de abajo no
     * se pasa nunca de treinta y tres.
     */
    /*
     * Y en el modelo sencillo, no más de lo que dibuja el alerón a fondo a esta
     * velocidad: pedir más dejaba la consigna por delante del ala, y al volver
     * se tardaba un segundo en deshacer lo que no se veía. Ver
     * `mandoParaInclinar` en `arcade.ts`.
     */
    const porGrado = ve.sencillo && ve.mandoParaInclinar ? Math.abs(ve.mandoParaInclinar(1)) : 0;
    const alcanza = porGrado > 0 ? 1 / porGrado : Infinity;
    const topeApretando = Math.min(
      alcanza,
      !conProteccion
        ? INCLINACION_TOPE
        : ve.peldanoBajo
          ? INCLINACION_PROTEGIDA
          : INCLINACION_TOPE_DEL_REACTOR,
    );
    const topeSuelto = Math.min(
      alcanza,
      conProteccion ? INCLINACION_PROTEGIDA : INCLINACION_TOPE,
    );
    const c = eje.consigna;
    // Con los flaps de aterrizar y cerca de las alas niveladas, fino. Ver
    // `MENOS_EN_LA_FINAL` y `toqueDeAlabeo`.
    const iman = imanDeAlabeo(ve.peldanoBajo, ve.flaps);
    const paso = (desde: number): number => toqueDeAlabeo(desde, ve.flaps);
    this.teclaYToques(eje, dt, tecla, pide.toqueAlabeo, paso, iman, true);
    if (tecla !== 0) {
      // Tranquilo al apretar, y decidido si se mantiene. Ver `ritmoApretando`.
      let ritmo = ritmoApretando(eje.apretada, tranquilo, decidido);
      // Y volviendo de una inclinación, despacio al pasar por el centro. Ver
      // `AL_CENTRO_POR_GRADO`.
      if (Math.abs(eje.desde) > AL_CENTRO_DESDE && Math.sign(eje.desde) === -tecla)
        ritmo = Math.min(
          ritmo,
          Math.max(Math.min(tranquilo, AL_CENTRO_MINIMO), AL_CENTRO_POR_GRADO * Math.abs(c.valor)),
        );
      c.mover(dt, tecla, ritmo, -topeApretando, topeApretando);
    } else if (eje.frenando) {
      /*
       * **Soltada la tecla, el ala se para donde está.** La consigna va
       * delante del avión —el avión tarda en seguirla—, y al soltar el avión
       * seguía hasta ella y un poco más: «cuando lo hace, estoy girando más de
       * lo que quería». Ahora la consigna se queda con el avión mientras
       * frena, y lo que se consigue es lo que se ve al soltar más lo que el
       * avión no puede dejar de rodar. Ver `FRENO_AL_SOLTAR`.
       */
      // Lo que se veía al soltar: con eso se decide el imán. Ver `alIman`.
      if (eje.frenandoDesde === 0) eje.alSoltar = ve.alabeo;
      eje.frenandoDesde += dt;
      c.poner(ve.alabeo);
      // Parado: cuando ya no rueda hacia donde iba la tecla.
      if (
        ve.sencillo ||
        ve.ritmoDeAlabeo * eje.sentidoAlSoltar < PARADO ||
        eje.frenandoDesde > FRENA_COMO_MUCHO
      ) {
        eje.frenando = false;
        alIman(eje, iman, eje.alSoltar);
        alMinimo(eje);
      }
    } else {
      if (eje.meta !== null) eje.meta = acotar(eje.meta, topeSuelto);
      // La protección: suelto y pasado de treinta y tres, vuelve despacio.
      else if (Math.abs(c.valor) > topeSuelto) {
        eje.meta = Math.sign(c.valor) * topeSuelto;
        eje.prisa = false;
      }
      const rango = Math.max(topeSuelto, Math.abs(c.valor));
      if (eje.meta !== null) c.hacia(dt, eje.meta, eje.prisa ? decidido : tranquilo, -rango, rango);
      // Soltada, se para en su rampa, venga del ritmo que venga.
      else c.mover(dt, 0, decidido, -rango, rango);
    }
    eje.teclaAntes = tecla;

    if (ve.sencillo) {
      /*
       * En el modelo sencillo el alerón **es** la inclinación que se ve: ver
       * `VISUAL_BANK` en `arcade.ts`. Y se le pregunta al modelo cuál, porque
       * despacio dibuja menos con el mismo alerón: en la final de Guyrami, la
       * mitad. Así lo que pide la mano y lo que se ve son lo mismo, y al soltar
       * la consigna se queda con el ala que se ve sin perder la mitad. Ver
       * `mandoParaInclinar`.
       */
      this.aileron = acotar(
        ve.mandoParaInclinar ? ve.mandoParaInclinar(c.valor) : c.valor / VISUAL_BANK,
        1,
      );
      return;
    }
    /*
     * El alabeo que falta pide un ritmo, y el ritmo pide alerón: el que lo
     * sostiene —la cuenta de la ficha— más lo que falta para llegar a él. Con
     * el ritmo de la consigna de entrada, para no ir siempre detrás.
     */
    const aFondo = Math.max(alabeoAFondo(ve.aircraft, ve.verdadera), 1e-3);
    if (eje.frenando) {
      this.aileron = acotar((-FRENO_AL_SOLTAR * ve.ritmoDeAlabeo) / aFondo, 1);
      return;
    }
    const falta = c.valor - ve.alabeo;
    /*
     * Y nunca más deprisa que el ritmo decidido, ni alcanzando: apretando a
     * ritmo decidido, el avión iba un poco por detrás y al alcanzar la
     * consigna se pasaba del ritmo un diez por ciento.
     */
    const quiere = acotar(c.ritmo + POR_ALABEO * falta, Math.max(decidido, Math.abs(c.ritmo)));
    this.aileron = acotar((quiere + POR_RITMO_DE_ALABEO * (quiere - ve.ritmoDeAlabeo)) / aFondo, 1);
  }

  // ── Cabeceo ────────────────────────────────────────────────────────────

  private pasoDelCabeceo(dt: number, ve: LoQueVeLaMano, pide: LoQuePide): void {
    const eje = this.cabeceo;
    const tecla = Math.sign(pide.teclaCabeceo);
    if (!eje.activo) {
      eje.teclaAntes = tecla;
      return;
    }
    const v = Math.max(ve.verdadera, 15);
    const ritmo = ritmoDeSendaDeLaMano(v);
    const c = eje.consigna;
    const gamma = trayectoria(ve);
    // Hasta setenta y dos grados: el tope del reactor apretando es sesenta y
    // siete, y acotado a sesenta el viraje pedía menos tirón del que hacía falta.
    const phi = acotar(ve.alabeo, 72 * RAD);
    /*
     * Lo deprisa que cambia ya la trayectoria, de lo que se nota en el
     * asiento: `γ̇ = (g/V)·(n·cos φ − cos γ)`. Ver el amortiguador, abajo.
     */
    const cambia = (GRAVITY / v) * (ve.carga * Math.cos(phi) - Math.cos(gamma));
    /*
     * **Suelta, ¿la trayectoria o la velocidad?** En un avión de cables, la
     * velocidad a la que quedó compensado; con mandos eléctricos o con algo
     * llevando ya la velocidad con el gas, la trayectoria. Ver
     * `sostieneLaVelocidad`.
     */
    const porVelocidad = sostieneLaVelocidad(ve);
    medirLaEnergia(this.energia, ve, dt);
    if (!porVelocidad) {
      this.compensada = null;
      this.palancaCompensada = null;
    }
    /*
     * **Y la trayectoria que quedó pedida no ata al avión compensado.** Lo que
     * dejaron las teclas mientras el gas llevaba la velocidad —un toque, el
     * imán— era una senda para volar con los gases puestos; soltados éstos,
     * manda lo compensado. Y el dedo en el centro es la mano suelta. Se quedan
     * el dedo fuera del centro, que es una mano sosteniendo la palanca ahí, y
     * el doble toque, que pide recto y nivelado a propósito.
     */
    if (porVelocidad && eje.meta !== null && tecla === 0) {
      const dedoAlCentro = eje.metaDelDedo && eje.meta === 0;
      const deLasTeclas = !eje.metaDelDedo && eje.prisa;
      if (dedoAlCentro || deLasTeclas) {
        eje.meta = null;
        eje.metaDelDedo = false;
      }
    }
    // Al apretar, manda la tecla; lo compensado se guarda, que un toque se
    // cuenta desde ahí.
    if (tecla !== 0 && eje.teclaAntes === 0) {
      this.compensadaAlApretar = this.compensada;
      this.palancaAlApretar = this.palancaCompensada;
      this.compensada = null;
      this.palancaCompensada = null;
    }
    /*
     * **Y en el avión compensado, un toque mueve lo compensado**, que es lo que
     * hace el compensador: dos nudos de velocidad —ver `TOQUE_DE_VELOCIDAD`—,
     * o en el modelo sencillo, la palanca que da medio grado de trayectoria
     * más o menos. Se suman como los de la trayectoria: cada uno cuenta desde
     * lo que dejó el anterior.
     */
    let toque = pide.toqueCabeceo;
    if (porVelocidad && toque !== 0 && !eje.metaDelDedo) {
      const signo = Math.sign(toque);
      const recienSoltada = eje.teclaAntes !== 0 && tecla === 0;
      if (ve.sencillo) {
        const subir = ve.mandoParaSubir;
        if (subir) {
          const base =
            (recienSoltada ? this.palancaAlApretar : this.palancaCompensada) ??
            subir(ve.vertical);
          const paso = Math.abs(
            subir(v * Math.sin(gamma + TOQUE_DE_SENDA)) - subir(v * Math.sin(gamma)),
          );
          this.palancaCompensada = acotar(base + signo * paso, 1);
        }
      } else {
        const base =
          (recienSoltada ? this.compensadaAlApretar : this.compensada) ?? ve.indicada;
        this.compensada = Math.max(1, base - signo * TOQUE_DE_VELOCIDAD);
      }
      toque = 0;
    }
    this.teclaYToques(eje, dt, tecla, toque, () => TOQUE_DE_SENDA, IMAN_DE_SENDA, true);
    /** Si este fotograma la mano sostiene lo compensado, y no una trayectoria. */
    let compensado = false;
    if (tecla !== 0) {
      c.mover(dt, tecla, ritmo, SENDA_MAS_BAJA, SENDA_MAS_ALTA);
    } else if (eje.frenando) {
      /*
       * **Soltada la tecla, la trayectoria se queda donde va.** Es lo mismo
       * que en el alabeo, y aquí se notaba más: la trayectoria va por detrás
       * del morro hasta segundo y medio, y la consigna, que iba delante,
       * seguía tirando de ella. Soltando la flecha al ir bajando tres grados,
       * el avión seguía hasta bajar de cinco a ocho, y el JAZ 120 en la final,
       * quince: «bajo muy de golpe, o bajo o subo». Ahora la consigna se
       * queda con la trayectoria mientras ésta deja de cambiar, y el
       * amortiguador de abajo es el que la para.
       */
      eje.frenandoDesde += dt;
      c.poner(Math.max(SENDA_MAS_BAJA, Math.min(SENDA_MAS_ALTA, gamma)));
      if (
        ve.sencillo ||
        cambia * eje.sentidoAlSoltar < PARADA_LA_SENDA ||
        eje.frenandoDesde > FRENA_COMO_MUCHO
      ) {
        eje.frenando = false;
        if (porVelocidad && eje.meta === null) {
          /*
           * **Parado el morro, se compensa ahí**: la velocidad de ahora es la
           * que se sostiene desde ya, como el piloto que lleva el morro donde
           * quiere y mueve el compensador hasta que la palanca no tira. El imán
           * del nivelado y el toque mínimo son de la trayectoria, y aquí no se
           * sostiene una.
           */
          if (!ve.sencillo && this.compensada === null) this.compensada = ve.indicada;
        } else {
          alIman(eje, IMAN_DE_SENDA);
          alMinimo(eje);
        }
      }
    } else if (porVelocidad && eje.meta === null) {
      compensado = true;
      if (ve.sencillo) c.poner(Math.max(SENDA_MAS_BAJA, Math.min(SENDA_MAS_ALTA, gamma)));
      else {
        if (this.compensada === null) this.compensada = ve.indicada;
        haciaLaVelocidad(c, dt, ve, this.compensada, this.energia.gana, v, ritmo);
      }
    } else {
      // El dedo o el doble toque piden una trayectoria: ésa se sostiene.
      if (eje.meta !== null) {
        c.hacia(dt, eje.meta, ritmo, SENDA_MAS_BAJA, SENDA_MAS_ALTA);
        this.compensada = null;
        this.palancaCompensada = null;
      } else c.mover(dt, 0, ritmo, SENDA_MAS_BAJA, SENDA_MAS_ALTA);
    }
    eje.teclaAntes = tecla;

    if (ve.sencillo) {
      const subir = ve.mandoParaSubir;
      if (compensado) this.subidaQueFalta = 0;
      if (compensado && subir) {
        /*
         * **En el modelo sencillo, el avión compensado se queda con su
         * palanca.** Ahí el gas es la velocidad —es la regla de ese peldaño—
         * y no hay velocidad que sostener con el morro; lo que sí hay es la
         * recta del motor: por encima del gas que ni sube ni baja se sube, por
         * debajo se baja. Sosteniendo la trayectoria, la mano se la comía y
         * quitar gas no bajaba el avión. Con la palanca quieta, sí. Ver
         * `gasQueNiSubeNiBaja` en `arcade.ts`.
         */
        if (this.palancaCompensada === null) this.palancaCompensada = acotar(subir(ve.vertical), 1);
        this.elevator = this.palancaCompensada;
        return;
      }
      // En el modelo sencillo la palanca **es** cuánto se sube: se le pide al
      // modelo la que da esta trayectoria. Ver `mandoParaSubir`.
      const ritmoDeSubida = v * Math.sin(c.valor);
      /*
       * **Y mirando lo que sube de verdad**, que es lo que mira una mano.
       *
       * La cuenta del modelo da la palanca de esa subida **en aire quieto**, y
       * el aire de este modelo no está quieto: el bache —ver `ponerRacha` en
       * `arcade.ts`— se suma tal cual a lo que sube el avión. Así que el
       * nivelado del doble toque bajaba con el aire todo lo que bajara el
       * aire. Medido en `verificar-dedo.mjs`, con una tarde de térmicas en
       * Pettirossi a sesenta metros: la palanca quieta en 0,10, el aire a
       * −2,5 m/s y el avión a −0,8 medio segundo después, siguiéndolo; con una
       * bajada larga, −1,5 de media en dos segundos «nivelado». Un piloto que
       * sostiene la altura tira cuando el aire le baja, y es lo que ya hacía
       * esta mano en el modelo completo —ver `this.suma`, abajo—.
       *
       * Lo que falta se va sumando, y solo con la consigna quieta y la palanca
       * con recorrido: mientras la tecla o el dedo la mueven, lo que falta es
       * lo que tarda el avión en seguirla, no aire. Suelta —el avión
       * compensado de cables— no se suma nada: ahí el avión va con el aire,
       * como uno compensado de verdad.
       */
      const pide = ritmoDeSubida + this.subidaQueFalta;
      this.elevator = ve.mandoParaSubir
        ? acotar(ve.mandoParaSubir(pide), 1)
        : acotar(c.valor / sendasDelDedo(ve.aircraft).sube, 1);
      const falta = ritmoDeSubida - ve.vertical;
      const conRecorrido = Math.abs(this.elevator) < 1 || this.elevator * falta < 0;
      if (tecla === 0 && c.ritmo === 0 && conRecorrido)
        this.subidaQueFalta = acotar(
          this.subidaQueFalta + SUMA_DE_SUBIDA * falta * dt,
          SUMA_DE_SUBIDA_MAXIMA,
        );
      return;
    }

    /*
     * **La trayectoria que falta pide girar el morro, y el giro que falta
     * mueve el compensador.** Son los pisos del piloto automático —ver
     * `mandosPara` en `piloto-automatico.ts`— con la viveza de una mano, y
     * con un amortiguador que aquél no necesita porque va despacio.
     *
     * El amortiguador es lo que deja ir deprisa sin pasarse: la trayectoria
     * va por detrás del morro —un avión tarda en cambiar de camino cuando
     * cambia de actitud—, y mandando solo por lo que falta, el morro llegaba
     * antes que el camino y se pasaba. Medido con la avioneta soltando la
     * tecla bajando a tres grados: llegaba a cuatro y medio y volvía a dos y
     * medio, ida y vuelta cada ocho segundos. Así que también se mira **lo
     * deprisa que cambia ya la trayectoria**, y eso sale de lo que se nota en
     * el asiento: es `cambia`, arriba.
     */
    /*
     * Y lo que falta de **siempre** se va sumando, despacio: en un viraje
     * cerrado o con la velocidad cambiando, la cuenta de arriba se quedaba
     * corta —el JAZ 90 a sesenta y siete grados bajaba a tres grados de
     * trayectoria sosteniendo «nivelado»—, y esto es lo que la completa.
     */
    /*
     * **Y la firmeza, a la medida del avión.** La trayectoria va por detrás
     * del morro un tiempo que es `(V/g)·(α − α₀)` —lo que tarda la
     * sustentación de más en torcer el camino—: un tercio de segundo en la
     * avioneta y casi segundo y medio en el JAZ 120. Con la misma firmeza
     * para los dos, el grande bajaba y subía grado y pico alrededor de lo
     * pedido, cada dieciséis segundos. Ver `POR_TRAYECTORIA`.
     */
    const a = ve.aircraft.aero;
    const tarda = Math.max(
      0.2,
      (v / GRAVITY) * Math.max(0.02, ve.alfa + a.cl0 / Math.max(a.clAlpha, 0.1)),
    );
    const firmeza = Math.min(POR_TRAYECTORIA, FIRMEZA / tarda);
    const falta = c.valor - gamma;
    let giro =
      c.ritmo +
      firmeza * falta +
      (eje.frenando ? FRENO_DE_LA_SENDA : AMORTIGUA_LA_SENDA) * (c.ritmo - cambia) +
      this.suma;
    /*
     * **Y lejos del avisador.** Sosteniendo —y siempre en los peldaños que no
     * dejan entrar en pérdida—, si el ala va hacia el avisador el morro cede
     * en proporción y el compensador con él: el avión baja antes que perder
     * más velocidad, que es lo que hace un avión compensado al que se le
     * quita el gas. Mirando **a dónde va** el ángulo, no solo dónde está: con
     * el gas quitado subiendo, la velocidad se va deprisa.
     */
    const cuida = tecla <= 0 || ve.protegePerdida;
    const alfaQueViene = ve.alfa + MIRA_EL_ALFA * (ve.ritmoDeCabeceo * Math.cos(phi) - cambia);
    const pasado = alfaQueViene - (ve.alfaDeAviso - LEJOS_DEL_AVISADOR);
    const cede = cuida && pasado > 0;
    if (cede) giro = Math.min(giro, -POR_ALFA * pasado);
    const tope = (MAS_CARGA * GRAVITY) / v;
    giro = acotar(giro, Math.max(tope, Math.abs(c.ritmo)));
    // En ejes del avión: en un viraje, el morro gira sobre el ala para virar
    // nivelado sin que el cabeceo cambie. Ver `delViraje` en el automático.
    const delViraje = (GRAVITY / v) * Math.tan(phi) * Math.sin(phi) * Math.cos(gamma);
    const pedido = giro / Math.cos(phi) + delViraje;
    const faltaGiro = pedido - ve.ritmoDeCabeceo;
    // Despacio, más mano: ver `apretonPorVelocidad`.
    const aprieta = apretonPorVelocidad(ve.aircraft, v);
    // El servo no sube el morro mientras el ala va pasada: que no se acumule.
    if (!(cede && faltaGiro > 0))
      this.trim = acotar(this.trim + SERVO * aprieta * faltaGiro * dt, 1);
    if (cede) this.trim = acotar(this.trim - POR_ALFA_EN_EL_TRIM * pasado * dt, 1);
    this.elevator = acotar(AMORTIGUA * aprieta * faltaGiro, 1);
    /*
     * La suma, con tope y quieta mientras cede o mientras se aprieta. Y
     * sosteniendo la velocidad, también quieta: ahí lo que falta de
     * trayectoria lo corrige la velocidad, y sumarlo aparte la haría pasarse.
     */
    if (!cede && tecla === 0 && !compensado)
      this.suma = acotar(
        this.suma + SUMA_DE_LA_SENDA * (firmeza / POR_TRAYECTORIA) ** 2 * falta * dt,
        SUMA_MAXIMA / v,
      );
  }
}

/** Lo que la mano recuerda para medir la energía que gana el avión. */
interface Energia {
  /** La verdadera del paso anterior, m/s, o `null` recién cogido el avión. */
  verdadera: number | null;
  /** Lo que gana, promediado, en metros de subida por segundo. */
  gana: number;
}

/** En cuánto tiempo se promedia la energía que se gana, s. */
const PROMEDIO_DE_LA_ENERGIA = 1;

/**
 * **La energía que gana el avión por segundo**, en metros de subida: lo que
 * sube más lo que acelera, `V/S + V·dV/dt / g`. Es lo que cambia el gas; el
 * morro solo la reparte entre subir y acelerar, así que cambiando de
 * trayectoria apenas se mueve, y se puede promediar sin que llegue tarde.
 *
 * Se promedia **la suma** y no la aceleración sola. Con la aceleración
 * promediada y la subida de este instante, al soltar una bajada la subida
 * crecía al momento y la aceleración llegaba un segundo y medio tarde: la
 * cuenta veía de más, pedía subir de más, y el avión se nivelaba un momento
 * antes de volver a bajar. Medido con el JAZ 120 soltando la tecla bajando:
 * de −9 m/s a +1,5 y de vuelta a −2,7, antes de quedarse en −1,9.
 */
function medirLaEnergia(e: Energia, ve: LoQueVeLaMano, dt: number): void {
  if (dt <= 0) return;
  if (e.verdadera !== null) {
    // Con tope: un salto de la medida —el avión recolocado— no es energía.
    const acelera = Math.max(-3, Math.min(3, (ve.verdadera - e.verdadera) / dt));
    const ahora = ve.vertical + (ve.verdadera * acelera) / GRAVITY;
    e.gana += (ahora - e.gana) * Math.min(1, dt / PROMEDIO_DE_LA_ENERGIA);
  } else e.gana = ve.vertical;
  e.verdadera = ve.verdadera;
}

/**
 * **La trayectoria que sostiene la velocidad compensada**, y la consigna
 * hacia ella: es la mitad de fuera del lazo, la del automático en `FLCH SPD`
 * (ver `piloto-automatico.ts`). La velocidad que falta pide una aceleración,
 * y lo que gana el avión de energía y no se va en esa aceleración es subida
 * —o bajada, si gana de menos—: `γ = asen((Ė − V·a_pedida/g)/V)`. Con el gas
 * quitado el avión pierde energía, y la cuenta pide bajar a la misma
 * velocidad; con el gas puesto, subir. La mitad de dentro —la trayectoria
 * pide morro y compensador— es la de siempre. Ver `SIGUE_LA_VELOCIDAD` y
 * `medirLaEnergia`.
 */
function haciaLaVelocidad(
  c: Consigna,
  dt: number,
  ve: LoQueVeLaMano,
  compensada: number,
  gana: number,
  v: number,
  ritmo: number,
): void {
  // Lo que falta es de indicada; la aceleración que se pide, de la verdadera.
  const verdaderaPorIndicada = ve.verdadera / Math.max(1, ve.indicada);
  const pide = acotar(
    ((compensada - ve.indicada) * verdaderaPorIndicada) / PARA_LA_VELOCIDAD_CON_EL_MORRO,
    ACELERACION_MAXIMA,
  );
  const sube = gana - (v * pide) / GRAVITY;
  const quiere = Math.max(SENDA_MAS_BAJA, Math.min(SENDA_MAS_ALTA, Math.asin(acotar(sube / v, 0.5))));
  c.ritmo = acotar((quiere - c.valor) / SIGUE_LA_VELOCIDAD, ritmo);
  c.valor = Math.max(SENDA_MAS_BAJA, Math.min(SENDA_MAS_ALTA, c.valor + c.ritmo * dt));
}

/** La trayectoria del avión, rad: cuánto sube por cada metro que avanza. */
function trayectoria(ve: LoQueVeLaMano): number {
  return Math.asin(acotar(ve.vertical / Math.max(ve.verdadera, 1), 1));
}

/** Si este avión, en este peldaño, lleva la inclinación protegida. */
export function protegido(ve: {
  readonly aircraft: AircraftConfig;
  readonly peldanoBajo: boolean;
}): boolean {
  return ve.peldanoBajo || esDeChorro(ve.aircraft);
}

/**
 * **Volviendo a alas niveladas, la tecla afloja al llegar.** Cerca del centro
 * el ritmo no pasa de tres veces lo que falta por segundo —a cinco grados,
 * quince por segundo; a uno, tres—, y nunca baja de dos, así que el ala se
 * posa en el cero en vez de cruzarlo lanzada, y del otro lado sale igual de
 * despacio.
 *
 * Es lo que hace falta para que quien vuela no entre en oscilación con la
 * tecla. Una persona tarda unas tres décimas en ver y en soltar, y a ritmo
 * decidido eso son cinco grados pasados; vuelve, se pasa otra vez, y así:
 * «me costó un montón estabilizarlo… no responde la tecla bien, y cuando lo
 * hace estoy girando más de lo que quería». Con el ala aflojando al llegar,
 * lo que se pasa en esas tres décimas es menos de un grado, y el imán lo
 * recoge. Es el imán del centro, hecho camino: ver `IMAN_DE_ALABEO`.
 *
 * Solo si la tecla empezó con el ala inclinada al otro lado —más de un
 * grado—: inclinarse desde nivelado va al ritmo de siempre.
 */
const AL_CENTRO_POR_GRADO = 3;
const AL_CENTRO_MINIMO = 2 * RAD;
const AL_CENTRO_DESDE = 1 * RAD;

/**
 * **El imán, al soltar**: si la tecla volvía hacia el centro y lo dejado está
 * cerca de él, al centro, con prisa —coge la consigna en marcha—.
 */
function alIman(eje: Eje, iman: number, visto?: number): void {
  /*
   * **En el alabeo, cuenta lo que se veía al soltar**, no dónde se para el ala
   * después. El JAZ 120 sigue rodando un par de grados después de soltar
   * —es su inercia—, y volviendo de diez grados, soltar a cinco lo dejaba en
   * tres y el imán se lo llevaba al cero: la corrección que se quería se
   * perdía. Quien suelta cerca del centro quería el centro; quien suelta a
   * cinco grados quería cinco, y se queda donde el ala se pare.
   */
  const donde = visto ?? eje.consigna.valor;
  if (eje.volvia && Math.abs(donde) < iman) {
    eje.meta = 0;
    eje.metaDelDedo = false;
    eje.prisa = true;
  }
  eje.volvia = false;
}

/**
 * **Apretar más no deja menos que un toque.** Al acabar de frenar, si el ala
 * —o la trayectoria— se ha quedado más cerca de donde empezó que un toque, va
 * hasta el toque, con prisa.
 *
 * Medido en la final con los flaps abajo, lo que dejaba la tecla según lo que
 * se apretaba, en el JAZ 120 en Tukã: una décima, tres grados —un toque—;
 * **un cuarto de segundo, dos décimas de grado**; medio segundo, nueve
 * décimas; un segundo, casi cuatro. O sea que apretar un poco más que un
 * toque dejaba casi nada, porque al soltar el ala se para donde está —ver
 * `FRENO_AL_SOLTAR`— y en un cuarto de segundo el avión grande aún no se ha
 * movido. Así no hay quien afine: «no responde la tecla bien, y cuando lo
 * hace estoy girando más de lo que quería». En Guyrami era peor: un segundo
 * entero dejaba siete décimas. Ahora lo que deja la tecla crece con lo que se
 * aprieta, sin escalón hacia abajo.
 *
 * Si el imán ya se la llevó al centro, manda el imán.
 */
function alMinimo(eje: Eje): void {
  const m = eje.minimo;
  eje.minimo = null;
  if (m === null || eje.meta !== null) return;
  const sentido = eje.sentidoAlSoltar;
  if ((eje.consigna.valor - m) * sentido < 0) {
    eje.meta = m;
    eje.metaDelDedo = false;
    eje.prisa = true;
  }
}

/**
 * **Cuánto alerón en contra pide el alabeo que queda al soltar**, en «a
 * fondo» por cada rad/s que se lleva: cuatro veces lo que lo sostendría. Es
 * el volante llevado al otro lado para parar el giro, como hace la mano de
 * quien vuela, y a ritmo decidido se va al tope: el avión para lo antes que
 * su inercia le deja. El JAZ 120, que rueda despacio y pesa mucho, sigue un
 * par de grados; la avioneta, casi nada.
 */
const FRENO_AL_SOLTAR = 4;
/**
 * Lo que se toma por parado, rad/s —rodando hacia donde iba la tecla—, y lo
 * más que se frena, s.
 */
const PARADO = 0.3 * RAD;
const FRENA_COMO_MUCHO = 2;
/**
 * Y la trayectoria parada, rad/s, y cuánto giro de morro en contra pide la
 * trayectoria que aún cambia mientras se frena: el doble del amortiguador de
 * siempre. Ver `AMORTIGUA_LA_SENDA`.
 */
const PARADA_LA_SENDA = 0.1 * RAD;
const FRENO_DE_LA_SENDA = 3;

/** Cuánto ritmo de alabeo pide cada radián de alabeo que falta, 1/s. */
const POR_ALABEO = 1.4;
/** Y cuánto alerón de más por cada rad/s de ritmo que falta, en «a fondo». */
const POR_RITMO_DE_ALABEO = 1;
/** Cuánto giro de morro pide cada radián de trayectoria que falta, 1/s. */
const POR_TRAYECTORIA = 0.6;
/** Y en los que tardan en cambiar de camino, esto partido por lo que tardan. */
const FIRMEZA = 0.45;
/** Y cuánto frena por cada rad/s que la trayectoria ya cambia de más. */
const AMORTIGUA_LA_SENDA = 1.5;
/** Cuánto baja el morro cada radián que el ala se pasa del límite, 1/s. */
const POR_ALFA = 2;
/** Y cuánto baja el compensador por segundo, por radián pasado. */
const POR_ALFA_EN_EL_TRIM = 3;
/** Lo que suma por segundo cada radián de trayectoria que falta, 1/s². */
const SUMA_DE_LA_SENDA = 0.25;
/**
 * **En el modelo sencillo, lo que suma por segundo cada m/s de subida que
 * falta**, 1/s. Uno: con el avión de ese modelo, que se pone a lo que pide la
 * palanca en algo menos de medio segundo, deshace un bache sostenido en tres o
 * cuatro segundos sin pasarse —es un lazo de segundo orden con amortiguamiento
 * de 0,74—. Ver `pasoDelCabeceo`.
 */
const SUMA_DE_SUBIDA = 1;
/**
 * Y hasta dónde, m/s: tres. Más que la ráfaga más fuerte que trae una tarde
 * de térmicas cerca del suelo, y menos que lo que sube cualquier avión de la
 * flota con la palanca —ver `ascensoMaximo`—, para que no se quede cargada de
 * algo que la palanca no puede dar.
 */
const SUMA_DE_SUBIDA_MAXIMA = 3;
/** Y hasta dónde, en giro por velocidad: m/s². Un tercio de g. */
const SUMA_MAXIMA = 0.33 * 9.80665;
/** Cuánto mira hacia delante el ángulo de ataque, s. */
const MIRA_EL_ALFA = 0.5;
/** El servo del compensador, por segundo, y el amortiguador. */
const SERVO = 1.2;
const AMORTIGUA = 0.4;

/**
 * **La velocidad de maniobra del avión**, m/s: siete décimas de su crucero o
 * casi el doble de su aproximación, la menor. Es donde se afinaron el servo y
 * el amortiguador de la trayectoria —la fase «crucero» de
 * `mano-respuesta.test.ts`—.
 */
export function velocidadDeManiobra(a: AircraftConfig): number {
  return Math.min(a.cruiseSpeed * 0.7, a.approachSpeed * 1.9);
}

/**
 * **Despacio, la mano aprieta más**: cuánto se multiplican el servo y el
 * amortiguador de la trayectoria a esta velocidad, de 1 a `APRETON_MAXIMO`.
 *
 * Lo que mueve el morro es la fuerza del aire en la profundidad, y esa fuerza
 * crece con el **cuadrado** de la velocidad. El servo y el amortiguador se
 * afinaron a la velocidad de maniobra; en la final, los dos reactores vuelan
 * a algo más de la mitad —el JAZ 120 a 146 nudos contra 277—, y ahí el mismo
 * movimiento de profundidad empuja **un cuarto**. La mano se quedaba corta,
 * el compensador hacía el trabajo tarde y la trayectoria entraba en un
 * columpio que no se apagaba nunca: sin tocar nada, con los flaps abajo, el
 * JAZ 120 subía y bajaba **±5,4 m/s cada 22 segundos** —ida y vuelta de un
 * grado de senda a siete—, y el JAZ 90 ±1,4; los demás, ±0,05. Con el gas
 * quieto, igual: no eran los gases, era la mano. En Guyrami no pasaba —el
 * modelo sencillo no tiene columpio—, pero de Tukã para arriba es lo que se
 * encuentra quien vuela esa misma final: el avión cabeceando solo mientras
 * corrige de lado.
 *
 * Es lo que hace cualquier piloto automático y cualquier ley de mandos
 * eléctricos: **programar la ganancia con la presión dinámica** (Stevens y
 * Lewis, *Aircraft Control and Simulation*, la programación de ganancias), y
 * lo que ya hace la ayuda que sostiene la subida en `fdm.ts`. Por encima de
 * la de maniobra no cambia nada, así que en crucero todo sigue como estaba.
 * Con esto, los dos reactores en la final se quedan en ±0,05 m/s pasado el
 * primer minuto. Ver `final-fina.test.ts`.
 */
export function apretonPorVelocidad(a: AircraftConfig, verdadera: number): number {
  const r = velocidadDeManiobra(a) / Math.max(verdadera, 1);
  return Math.min(APRETON_MAXIMO, Math.max(1, r * r));
}

/**
 * Y no más de cuatro veces, que es la presión dinámica de la mitad de la
 * velocidad: más despacio que eso ya no es una final, es una pérdida, y ahí
 * manda el avisador. Ver `LEJOS_DEL_AVISADOR`.
 */
export const APRETON_MAXIMO = 4;
/** Lo más que aprieta la mano corrigiendo, g. */
const MAS_CARGA = 0.4;

function acotar(v: number, tope: number): number {
  return v < -tope ? -tope : v > tope ? tope : v;
}
