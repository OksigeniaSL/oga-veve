/**
 * Modelo de vuelo propio, de coeficientes aerodinámicos.
 *
 * Cómo funciona, en cuatro pasos por cada instante de simulación:
 *
 *   1. Se proyecta la velocidad respecto al aire sobre los ejes del avión y
 *      se sacan el ángulo de ataque (alpha) y el de derrape (beta).
 *   2. Con alpha, beta, las velocidades angulares y la posición de los
 *      mandos se evalúan los coeficientes de la aeronave: sustentación,
 *      resistencia, fuerza lateral y los tres momentos.
 *   3. Los coeficientes se multiplican por la presión dinámica y la
 *      geometría para dar fuerzas en newtons y momentos en newton-metro.
 *   4. Se integran la segunda ley de Newton y las ecuaciones de Euler del
 *      sólido rígido.
 *
 * Convención de ejes. Dentro del FDM se usan ejes cuerpo aeronáuticos
 * —x adelante, y a la derecha, z hacia abajo— porque es como están escritas
 * las ecuaciones en cualquier libro y como vienen tabulados los
 * coeficientes. La malla de three.js, en cambio, mira hacia -Z con +Y
 * arriba. La conversión no se hace con matrices sino proyectando sobre los
 * tres vectores unitarios del avión en coordenadas de mundo, que es más
 * corto y no se puede equivocar de signo en silencio.
 *
 * Simplificación consciente: la transformación de ejes viento a ejes cuerpo
 * se hace solo con alpha, ignorando beta en las componentes de sustentación
 * y resistencia. Con derrapes pequeños —los que hace cualquiera que pilote
 * esto— el error es despreciable, y a cambio el código se lee.
 */

import { Quaternion, Vector3 } from "three";
import { actitudEnTierra, alturaSobreLasRuedas, brazoDelTren } from "./apoyo";
import { resistenciaDelTren } from "./tren";
import { caidaContraElSuelo } from "./caida-contra-el-suelo";
import { efectoSuelo, efectoSueloRodando, momentoDelSuelo } from "./efecto-suelo";
import {
  anguloDePerdida,
  fraccionDeLosFlaps,
  masAllaDeLaPerdida,
  resistenciaDeLosFlaps,
  sustentacionDeLosFlaps,
} from "./flaps";
import { anguloDeAviso, SE_CALLA_EL_AVISADOR } from "./avisos-de-actitud";
import {
  AIRE_ESTANDAR,
  type Aire,
  GRAVITY,
  SEA_LEVEL_DENSITY,
  airDensity,
} from "./atmosphere";
import {
  topeDeVelocidad,
  type QuienManda,
  machDe,
  resistenciaDeOnda,
} from "./limites";
import {
  centradoDe,
  conCentrado,
  conMasa,
  esDeChorro,
  loQueDaElMotor,
  masaDe,
  parteDelEmpuje,
  tieneReversa,
  type AircraftConfig,
} from "./aircraft";
import {
  REVERSA_DA,
  REVERSA_HASTA,
  coeficienteDeFrenado,
  frenoDelAutofreno,
  parteQueSeLlevan,
  resistenciaDeLosPaneles,
} from "./frenada";
import {
  AUTOBANDERA,
  alPararse,
  areaDelMotor,
  enMarcha,
  llevaBandera,
  parDeLosMotores,
  resistenciaDelTimon,
  type EstadoDelMotor,
} from "./motores";

/**
 * **Cuánto acelera, como mucho, quien conduce el avión rodando**, m/s².
 *
 * Seis décimas: lo que acelera un avión que sale del puesto con algo de gas,
 * y lo que ya daba el tope de rodaje con la cuenta de antes —entre 0,45 y
 * 0,65 según el avión—. Más es un tirón en la plataforma; menos, un avión que
 * tarda un minuto en ponerse a rodar. Ver `gasParaRodar`.
 */
export const ACELERA_RODANDO = 0.6;

/**
 * **Y en cuánto tiempo se quiere cerrar lo que falta**, s.
 *
 * Cuatro segundos: cerca de la velocidad pedida la aceleración se va
 * soltando en proporción a lo que falta, y así se llega sin pasarse. Es la
 * misma forma de pisar el acelerador de cualquiera que conduce.
 */
export const EN_LLEGAR_RODANDO = 4;
import { type AssistLayers, uniformAssists } from "./assists";
import { pieDeTecla } from "./palanca-de-teclado";
import type {
  ControlInputs,
  FlightModel,
  FlightState,
  GroundSampler,
  InitialConditions,
  LoSacado,
  MotorTocado,
} from "./model";

/** Paso máximo de integración. Por encima, el modelo se vuelve inestable. */
const MAX_SUBSTEP = 1 / 240;

/**
 * Lo máximo que se simula de una vez, en segundos.
 *
 * **Vive aquí y la usa también el bucle del juego**, y eso es el arreglo: eran
 * dos topes distintos que tenían que valer lo mismo y no lo valían. El bucle
 * dejaba pasar un cuarto de segundo y aquí se recortaba otra vez a un cuarto,
 * así que subir el del bucle no servía de nada — el recorte de verdad estaba
 * en esta línea, dos ficheros más allá.
 *
 * Lo que provocaba: por debajo de este ritmo el juego no pierde fotogramas,
 * **va a cámara lenta**. Medido con reloj de verdad a dos fotogramas por
 * segundo, el avión marcaba 18,4 m/s y avanzaba 7,3 — marcaba cien por hora y
 * se movía a cuarenta. De ahí salía todo lo que se notaba jugando: la avioneta
 * de juguete sobre un aeropuerto de verdad, la pista que no se acaba y el
 * rodaje eterno.
 *
 * Un segundo cubre hasta un fotograma por segundo. Más allá vale más perder
 * tiempo simulado que integrar un salto y mandar el avión a la estratosfera,
 * que es de lo que protege este tope; del salto grande al volver de una
 * pestaña en segundo plano se encarga `visibilitychange`.
 */
export const MAX_PASO = 1;
/** Por debajo de esta velocidad no hay aerodinámica que valga. */
const MIN_AIRSPEED = 0.5;
/**
 * Umbrales de rotura, en modo Piloto. En Arcade se relajan mucho: ver
 * `crashLimits`.
 */
const CRASH_SINK_RATE = 6.0;
const CRASH_BANK = 0.5; // ~29°
/**
 * Fuerza del nivelado automático, como múltiplo de la autoridad del alerón.
 *
 * Es un equilibrio con dos lados. Muy fuerte y las alas vuelven al instante,
 * pero cancelan el viraje en cuanto se suelta la tecla: quien da toques
 * cortos —es decir, cualquier crío— no consigue girar para volver a la
 * pista. Muy flojo y se repite el problema original, no poder recuperar la
 * horizontal. Calibrado midiendo las dos cosas a la vez: rumbo ganado por
 * toque de alerón y segundos hasta nivelar.
 */
const WING_LEVELLER = 2.0;
/*
 * Aquí vivía un rebote: por encima de cierta velocidad de descenso, una toma
 * dura devolvía el avión al aire para que se notara que había salido mal.
 *
 * Se ha quitado, y conviene dejar escrito por qué para que no vuelva. Nació
 * con el umbral demasiado bajo y empeoraba los aterrizajes normales —una toma
 * firme te devolvía al aire sin velocidad para volar—. Subido el umbral a
 * donde debía, el compensador automático de Arcade frena las caídas y ya no
 * se llegaba nunca: con los mandos sueltos la ayuda arresta el descenso, y
 * volando el avión contra el suelo se pasa de 0,9 m/s a 21 m/s sin escala
 * intermedia. Cinco intentos de escribirle un test que lo alcanzara y ninguno
 * lo consiguió, que es la señal de que no se ejecutaba nunca.
 *
 * Lo que hacía falta —que una llegada regular se note— ya lo da el sonido:
 * el toque de ruedas suena distinto por encima de 2,5 m/s de descenso.
 */
/**
 * Hasta qué velocidad sostiene la subida el compensador automático con su
 * ganancia de siempre, en m/s. Por encima, la ganancia baja con la velocidad
 * para mandar sobre el ángulo de la trayectoria. Ver `climbLaw` en `step`.
 */
const VELOCIDAD_DE_LA_AYUDA = 60;

/**
 * **Hasta qué altura el compensador automático acelera subiendo**, m sobre el
 * terreno: quinientos pies. Es hasta donde el manual de la FAA pide sostener
 * el gas de despegar después de irse del suelo, «until reaching an altitude
 * of at least 500 feet above the surrounding terrain or obstacles»
 * (FAA-H-8083-3C, p. 6-5). Ver `leyDelSuelo` en `step`.
 */
const SUBE_SIN_BAJAR_HASTA = 500 * 0.3048;

/**
 * **Y desde qué altura ya no**, m: mil pies. Entre las dos se va apagando,
 * para que la ley no salte al cruzar una raya.
 */
const SE_SUELTA_DEL_SUELO = 1000 * 0.3048;

/**
 * **Cuánto de lo que sobra se va en subir**, cerca del suelo: la mitad. La
 * otra mitad acelera hacia la de subida.
 */
const PARTE_PARA_SUBIR = 0.5;

/**
 * **Desde cuánto de sobra entra entero el suelo de subida**, en seno del
 * ángulo de la trayectoria: dos centésimas, algo más de un grado. Por debajo
 * entra en proporción, para que pasar de que sobre a que falte —quitar gas—
 * no sea un salto en la ley.
 */
const SOBRA_ENTERA = 0.02;

/** Cuánto tarda el compensador automático en fijar la actitud, en segundos. */
const TRIM_SETTLE = 1.1;

/**
 * Cuánto ascenso sostenido pide cada unidad de compensador que se mueve, en
 * m/s: un toque de flecha —dos centésimas— es medio metro por segundo, cien
 * pies por minuto. Ver el compensador automático en `step`.
 */
export const SUBIDA_POR_COMPENSADOR = 25;

/**
 * Lo más que se le pide a la ayuda de subida, hacia cada lado, en m/s: a
 * toques del compensador o colocando el avión (`InitialConditions.trayectoria`).
 * La senda más empinada de las publicadas, 3,45°, con el JAZ 120 a la suya,
 * pide 4,96.
 */
const SUBIDA_PEDIDA_TOPE = 5;

/**
 * Lo más que se mueve el compensador en un paso para que cuente como alguien
 * tocándolo. Un toque son dos centésimas; más que el triple de eso de golpe
 * es otra cosa —el piloto automático soltando, un vuelo nuevo—.
 */
const PASO_QUE_SE_PIDE = 0.06;

/** Por debajo de esta velocidad, con el freno pisado, el avión se para. */
/**
 * Holgura, en metros, antes de considerar que el avión ha dejado el suelo.
 * Un palmo: menos que el recorrido de una amortiguación de verdad.
 */
const PEGADO_AL_SUELO = 0.2;

const STATIC_GRIP = 1.2;

/**
 * **Lo que se comprime la ballesta de la rueda de cola** con el avión parado,
 * m. Ver `momentoDelTren`.
 *
 * Un palmo escaso: es una lámina de acero que se dobla, no un amortiguador
 * de aceite, y lo que se ve en un fumigador parado es la rueda apenas
 * aplastada contra el suelo. Repartido sobre la distancia de las principales
 * a la de cola, son poco más de un grado de cabeceo.
 */
const RECORRIDO_DE_LA_COLA = 0.1;

/**
 * El amortiguamiento de la pata de morro, como fracción del crítico.
 *
 * Siete décimas: la pata se asienta sin rebotar, que es para lo que lleva
 * aceite. Con menos, el morro cabeceaba solo al frenar; con el crítico
 * entero, se quedaba clavado en vez de comprimirse.
 */
const AMORTIGUA_LA_PATA = 0.7;

/**
 * **Lo que cede la panza del morro** cuando apoya sin su rueda, rad: medio
 * grado, poco más de dos centímetros a la distancia de la rueda de un
 * bimotor ligero. Es chapa y cuadernas, no una pata con aceite: lo justo para
 * que el apoyo no sea un tope seco. Ver `momentoDelTren`.
 */
const RECORRIDO_DE_LA_PANZA = 0.008;

/**
 * **El roce de la panza contra la pista**, como fracción de lo que carga.
 * Sin fuente leída para el aluminio sobre asfalto: es el orden del freno a
 * fondo de una rueda en seco, y frena por lo que carga el morro, que es poco.
 * Lo que se enseña no depende de la cifra —el morro que toca frena, y se
 * posa tarde para que frene menos rato—. Ver el ADR 0014, enmienda H70.
 */
export const ROCE_DE_LA_PANZA = 0.4;

/**
 * **Lo que roza un neumático reventado**, como fracción de lo que carga su
 * pata. Sin fuente leída: la guía de la FAA para el despegue (*Takeoff Safety
 * Training Aid*, p. 2.26) dice que puede hacer que el avión tire a un lado y
 * que no suele dar por sí solo problemas de dirección, sin cifra. Un décimo
 * es cinco veces la rodadura de una rueda sana, y queda dentro de las dos
 * cosas: se va a un lado si no se hace nada y se sostiene con poco pie. Lo
 * mide `neumatico-reventado.test.ts`. Ver el ADR 0014, enmienda H74.
 */
export const ROCE_DEL_REVENTADO = 0.1;

/** Cuánto tiene que aguantar el ángulo pasado para que sea pérdida, s. */
const STALL_DELAY = 0.35;

/** Cuánto hay que bajar del umbral para salir de ella, rad (~3,5°). */
const STALL_RECOVERY = 0.06;
/**
 * Instantes por delante en los que se busca terreno, en segundos.
 *
 * Llegaban hasta seis y el aviso se encendía el 16 % de un vuelo normal a
 * baja cota sobre las lomas del valle. Un aviso que salta continuamente
 * deja de ser un aviso. Cuatro segundos a velocidad de crucero son unos
 * ciento sesenta metros por delante: de sobra para reaccionar.
 */
const LOOKAHEAD_SECONDS = [0.7, 1.3, 2, 2.7, 3.4, 4] as const;

const FORWARD_LOCAL = new Vector3(0, 0, -1);
const RIGHT_LOCAL = new Vector3(1, 0, 0);
const DOWN_LOCAL = new Vector3(0, -1, 0);

export interface FdmOptions {
  aircraft: AircraftConfig;
  ground: GroundSampler;
  /**
   * Asistencia de vuelo. Se puede dar como un número —todas las capas al
   * mismo nivel, que es lo que hacía el viejo Arcade/Piloto— o como capas
   * independientes, que es lo que usan los tramos de dificultad.
   */
  assist?: number | AssistLayers;
}

import { ROZAMIENTO, type Superficie } from "../world/superficie";
import { DURO_DE_TRANSPORTE } from "./aterrizaje";
import { perdidaCon, V2_SOBRE_LA_PERDIDA } from "./velocidades-de-despegue";
import { avanzarGiro, gasQueDa, giroAsentado, type GiroDelMotor } from "./respuesta-del-motor";
import { Petardeo } from "./ave-en-el-motor";

/**
 * **Lo lenta que es la lenta, sobre la segura**, cuando salen de la pérdida: la
 * misma proporción que tienen las dos atadas a la aproximación, 0,8 sobre 1,05,
 * que es la mezcla que se afinó para la toma. Ver `velocidadesDeLaAyuda`.
 */
const LENTA_SOBRE_SEGURA = 0.8 / 1.05;

/**
 * **Las dos velocidades de la mezcla de `climbHold`**, m/s verdaderos: la
 * **segura**, por debajo de la cual la ley de la velocidad empieza a bajar el
 * morro, y la **lenta**, desde la que lo baja entera. Ver `step`.
 *
 * Salían solo de la ficha, `min(0,58·crucero, 1,05·aproximación)` y
 * `min(0,42·crucero, 0,8·aproximación)`, y la de aproximación es la Vref, con
 * los flaps de aterrizar. Con los flaps recogidos la pérdida sube, y en los
 * reactores la segura quedaba por debajo de ella: 124 nudos en el JAZ 90, con la
 * pérdida limpia en 135, así que con el avión limpio y lento la ayuda no hacía
 * nada por la velocidad y solo lo protegía el tope de ángulo de ataque. Medido
 * en la mesa en Tukã, soltado limpio a 1,3 veces la pérdida y con el gas
 * quitado: el JAZ 90 se iba a 0,95 veces su pérdida limpia y el JAZ 120 a 0,94.
 *
 * Así que cada una es **la mayor** entre la de la ficha y una que sale de la
 * pérdida con los flaps que lleva el avión (`perdidaCon`, en verdadera a esta
 * densidad, que es como se le compara): la segura, a la V2 más baja que deja la
 * norma, 1,13 veces esa pérdida (`V2_SOBRE_LA_PERDIDA`), que es lo mínimo con
 * lo que se vuela con esos flaps; la lenta, a la proporción de siempre. Con los
 * flaps de aterrizar las de la pérdida quedan por debajo de las de la ficha en
 * todos —en el JAZ 90, el más justo, 112 nudos verdaderos frente a 124 a los
 * setecientos metros de Cuatro Vientos—, así que **la toma no cambia**: es lo que se afinó con ellas
 * (el JAZ 90 bajaba a 42 m/s cuando iban atadas al crucero).
 */
export function velocidadesDeLaAyuda(
  ac: AircraftConfig,
  flaps: number,
  densidad: number,
): { readonly lenta: number; readonly segura: number } {
  const perdida = perdidaCon(ac, flaps) * Math.sqrt(SEA_LEVEL_DENSITY / Math.max(0.01, densidad));
  const seguraPorLaPerdida = V2_SOBRE_LA_PERDIDA * perdida;
  return {
    lenta: Math.max(
      Math.min(ac.cruiseSpeed * 0.42, ac.approachSpeed * 0.8),
      seguraPorLaPerdida * LENTA_SOBRE_SEGURA,
    ),
    segura: Math.max(Math.min(ac.cruiseSpeed * 0.58, ac.approachSpeed * 1.05), seguraPorLaPerdida),
  };
}

/**
 * A qué ritmo gira este avión en el suelo, en radianes por segundo.
 *
 * **La misma geometría que la de un coche**: con la rueda de morro girada un
 * ángulo `δ`, el avión recorre una circunferencia de radio `batalla / tan δ`,
 * y a velocidad `v` eso son `v·tan δ / batalla` radianes por segundo. Es una
 * cuenta de bachillerato y es exactamente lo que hace un avión rodando.
 *
 * **Aquí no había geometría ninguna**: el ritmo de giro era `mando · 2,2`,
 * igual para los seis aviones y **sin mirar la velocidad**. Un ritmo que no
 * depende de la velocidad quiere decir que el radio se encoge según se acelera
 * —al revés de lo que pasa— y que un 747 gira como un kart. Medido con el gas
 * a la mitad: con un tercio de palanca los seis giraban a 45°/s con radios de
 * 5,6 a 8,5 metros, el de fuselaje ancho igual que la avioneta; y a fondo
 * pivotaban a 72°/s con la velocidad hundida a menos de un metro por segundo.
 *
 * Con esto, el radio más cerrado de cada avión sale de su batalla: sesenta
 * centímetros la avioneta —que pivota sobre una rueda frenada, como se hace de
 * verdad— y nueve metros y medio el de fuselaje ancho, que es el radio mínimo
 * de morro publicado de un 747.
 *
 * ## Y el tope de lo que se puede tirar de lado
 *
 * La geometría sola, a velocidad de rodaje, deja ritmos absurdos en un avión
 * pequeño —cuatrocientos ochenta grados por segundo—, porque la geometría no
 * sabe que las ruedas agarran lo que agarran. El tope es el mismo que ya usa
 * el modelo sencillo y por el mismo motivo: `v²/R = a`, así que el ritmo no
 * puede pasar de `a/v`. Ver `DE_LADO_RODANDO` en `arcade.ts`.
 *
 * Con seis metros por segundo al cuadrado, el tope es quien manda en los
 * aviones pequeños —o sea que ruedan como rodaban— y la geometría es quien
 * manda en los grandes, que es donde estaba el fallo.
 */
export const DE_LADO_RODANDO = 6;

/**
 * **Lo más de lado que tira el pedal en la carrera**, m/s²: un quinto de g.
 *
 * El timón mandaba en tierra con un ritmo que crecía con la velocidad hasta
 * los veinticinco metros por segundo y de ahí no bajaba, sin mirar lo que
 * agarran las ruedas. Medido con la tecla, en la carrera de aterrizaje del JAZ
 * 120 a 130 nudos: un segundo de pedal giraba la proa **veintidós grados** y
 * tiraba de lado con **2,6 g**. Así se sale cualquiera por un lado de la
 * pista: Enrique tuvo que tomar tierra deprisa y «casi me salgo por un lado
 * de la pista, porque enderezar el avión me estaba costando un dedo».
 *
 * En la carrera el ala todavía sostiene casi todo el avión y las ruedas
 * agarran poco: la corrección de eje de un avión de línea a esa velocidad es
 * de pocos grados de rumbo, pequeña y progresiva. Un quinto de g a 130 nudos
 * es grado y siete décimas por segundo con el pedal a fondo, que es girar con
 * decisión sin salirse; rodando despacio no cambia nada, que ahí manda la
 * geometría. Ver `carrera-fina.test.ts`.
 */
export const AGARRE_DEL_PEDAL = 0.2 * GRAVITY;

/**
 * **Lo que gira el pedal en tierra a esta velocidad**, rad/s por unidad de
 * mando, una vez asentado: lo de siempre —crece con la velocidad hasta los
 * veinticinco metros por segundo, porque es aerodinámico— y nunca más de lo
 * que agarran las ruedas. Ver `AGARRE_DEL_PEDAL`. Lo usa también el modelo
 * sencillo, para que el pedal haga lo mismo en los dos.
 */
export function giroDelPedal(velocidad: number): number {
  const v = Math.abs(velocidad);
  return Math.min(PEDAL_EN_TIERRA * Math.min(1, v / 25), AGARRE_DEL_PEDAL / Math.max(1, v));
}

/** Lo que gira el pedal a fondo, rad/s, de veinticinco metros por segundo arriba. */
const PEDAL_EN_TIERRA = 0.4;

/**
 * **Lo que manda la rueda de morro a esta velocidad**, de 0 a 1: entera hasta
 * ocho metros por segundo y nada a los veintiocho. Ver la rueda en
 * `resolveGround`, y el timón automático en tierra, que toma el relevo de lo
 * que ella deja: ver `timonEnTierra`.
 */
export function autoridadDeLaRueda(velocidad: number): number {
  return 1 - clamp((Math.abs(velocidad) - 8) / 20, 0, 1);
}

/**
 * **Lo deprisa que el timón automático en tierra devuelve el rumbo**, rad/s
 * por radián que falte: un grado de error, un grado por segundo. Más es hacer
 * eses por la pista; menos es dejar que la veleta gane terreno mientras se
 * corrige. Ver `timonEnTierra`.
 */
const VUELVE_AL_RUMBO = 1;
/**
 * Y lo más deprisa que lo devuelve, rad/s: cinco grados por segundo, que es
 * una corrección de eje y no un giro, y lo que hace falta para quitar en un
 * segundo o dos el cangrejo de doce nudos cruzados al tocar. Con dos, el JAZ 90
 * se corría de lado diez metros mientras lo quitaba, y con cinco seis. Más
 * deprisa no lo da el agarre de las ruedas: ver `AGARRE_DEL_PEDAL`.
 */
const VUELVE_COMO_MUCHO = (5 * Math.PI) / 180;
/**
 * Cuánto pie se queda puesto por segundo, por cada rad/s de giro que falte y
 * por lo que dé el pedal entero: es lo que acaba sujetando la veleta, que
 * empuja siempre del mismo lado y crece con la carrera. Ver `timonEnTierra`.
 */
const SE_QUEDA_EL_PIE = 3;
/**
 * Lo que tiene que mover quien juega el volante o el pedal para que la ayuda
 * entienda que gira él, de 0 a 1. Por debajo es el mando que vuelve al centro
 * al soltarlo, no una orden.
 */
const GIRA_QUIEN_LLEVA = 0.005;
/**
 * **Desde qué velocidad sostiene el rumbo el timón automático en tierra**,
 * m/s. Más despacio el pedal no gira casi nada —es aire y poco suelo—, la
 * veleta no tiene de qué agarrarse, y lo que hay es maniobrar en el puesto:
 * sostener ahí un rumbo sería acumular pie para nada y soltarlo de golpe al
 * echar a rodar.
 */
const SOSTIENE_DESDE = 3;
/**
 * **Lo que dura un bote**, s. `onGround` parpadea en la carrera en cuanto el
 * ala levanta el avión un palmo (`PEGADO_AL_SUELO`), y en la toma el avión
 * rebota. Si cada parpadeo borrara el rumbo y el pie que sujeta la veleta,
 * cada vuelta al suelo empezaría de cero —y la de un bote en cangrejo, con el
 * rumbo del morro torcido y no con el de la pista—. Más de un segundo en el
 * aire ya es volar.
 */
const UN_BOTE = 1;
/**
 * **Lo que frena el suelo la guiñada**, por segundo: los dos frenos de
 * `resolveGround` —el del tren, medio `settle`, y el de la rueda, uno entero,
 * con `settle` a seis por segundo—. Con él se cuenta lo que gira el timón de
 * aire una vez asentado. Ver `giroDelTimonEnTierra`.
 */
const FRENO_DE_GUINADA_EN_TIERRA = 6 * 0.5 + 6;
/**
 * Lo que llega a girar la rueda de morro, en radianes.
 *
 * Setenta grados: lo que da la rueda de un avión grande con la barra del
 * capitán. En una avioneta los pedales no llegan a tanto, pero el piloto suma
 * freno de una rueda, y el resultado es el mismo giro cerrado — así que un
 * número vale para los dos y no hay que inventarse una segunda columna en la
 * ficha para decir lo mismo.
 */
export const GIRO_DE_MORRO = (70 * Math.PI) / 180;

function esteGiro(
  ac: AircraftConfig,
  mando: number,
  velocidad: number,
): number {
  const v = Math.abs(velocidad);
  const radioMinimo = ac.batalla / Math.tan(GIRO_DE_MORRO);
  const tope = DE_LADO_RODANDO / Math.max(1, v);
  return (
    clamp(mando * (v / radioMinimo), -tope, tope) * Math.sign(velocidad || 1)
  );
}

/**
 * Cuánto del viento llega a esta altura sobre el suelo, de 0 a 1.
 *
 * El viento no sopla igual a ras de suelo que arriba: el terreno lo frena, y eso
 * es la capa límite. La forma que tiene de verdad es una potencia de la altura;
 * la raíz vale de sobra para esto.
 *
 * **La referencia son diez metros, y no es un número cualquiera**: es la altura
 * a la que se mide el viento que da un METAR, o sea el que el juego enseña en su
 * panel. Así que a diez metros llega entero, que es lo que de verdad siente un
 * avión en la pista — y por debajo baja hasta un sesenta por ciento al ras,
 * porque el suelo frena las capas de abajo.
 *
 * El primer intento dejaba solo una quinta parte al ras y no llegaba al viento
 * entero hasta los cien metros. Con eso, un viento de veinte nudos acortaba la
 * carrera de despegue un diecinueve por ciento en vez de un cuarenta, y la
 * lección de por qué se despega contra el viento se quedaba en un matiz.
 */
export function perfilDeViento(altoSobreElSuelo: number): number {
  const h = Math.max(0, altoSobreElSuelo);
  return 0.6 + 0.4 * Math.min(1, Math.sqrt(h / 10));
}

export class CoefficientFlightModel implements FlightModel {
  readonly implementationName = "FDM Óga Veve (coeficientes)";

  readonly state: FlightState;

  /**
   * El avión **con lo que pesa ahora**: la ficha con la masa que le pone
   * `ponerMasa`. Todo lo que pregunta por el peso —el que sostiene el ala, el
   * que acelera, el que frenan las ruedas— lo lee de aquí con `masaDe`.
   */
  private aircraft: AircraftConfig;
  /** La ficha tal cual, de la que salen las copias con peso. */
  private readonly ficha: AircraftConfig;
  private readonly ground: GroundSampler;

  /** Segundos que lleva el ala pasada de ángulo. Ver la nota de la pérdida. */
  private stallFor = 0;
  private layers: AssistLayers;
  /**
   * Ritmo de ascenso que sostiene el compensador automático, en m/s, o `null`
   * si el jugador tiene el mando en la mano.
   */
  private trimClimb: number | null = null;
  /** Segundos que le quedan al compensador para fijar el objetivo. */
  private trimSettle = 0;
  /**
   * El compensador de quien vuela, tal como se vio en el paso anterior, para
   * saber cuánto lo ha movido. Ver `SUBIDA_POR_COMPENSADOR`.
   */
  private trimVisto: number | null = null;
  /**
   * El rumbo que sostiene el timón automático en tierra, rad, o `null` si no
   * sostiene ninguno: en el aire, o a paso de peatón. Ver `timonEnTierra`.
   */
  private rumboEnTierra: number | null = null;
  /** El pie que se ha quedado puesto contra la veleta, de −1 a 1. Ver `timonEnTierra`. */
  private pieEnTierra = 0;
  /**
   * Segundos sin ruedas en el suelo, para no olvidar el rumbo en un bote. Ver
   * `UN_BOTE`.
   */
  private sinRuedas = 0;

  // Vectores de trabajo reutilizados: este bucle corre 240 veces por
  // segundo y no queremos darle basura al recolector.
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly down = new Vector3();
  private readonly force = new Vector3();
  private readonly omega = new Vector3();
  private readonly spin = new Quaternion();

  constructor(options: FdmOptions) {
    this.aircraft = options.aircraft;
    this.ficha = options.aircraft;
    this.ground = options.ground;
    this.layers =
      typeof options.assist === "number" || options.assist === undefined
        ? uniformAssists(options.assist ?? 1)
        : options.assist;
    this.reponerLosMotores();

    this.state = {
      position: new Vector3(),
      velocity: new Vector3(),
      orientation: new Quaternion(),
      rollRate: 0,
      pitchRate: 0,
      yawRate: 0,
      airspeed: 0,
      groundSpeed: 0,
      alpha: 0,
      beta: 0,
      heightAboveGround: 0,
      onRunway: false,
      verticalSpeed: 0,
      loadFactor: 1,
      heading: 0,
      onGround: true,
      stalled: false,
      stallWarning: false,
      stallWarningAlpha: Math.PI,
      crashed: false,
      secondsToImpact: Number.POSITIVE_INFINITY,
      touchdownSinkRate: 0,
    };
  }

  /** Nivel medio de asistencia. Sirve para el rótulo del HUD y poco más. */
  get assist(): number {
    const l = this.layers;
    return (
      (l.wingLeveller +
        l.autoRudder +
        l.climbHold +
        l.stallProtection +
        l.extraDamping) /
      5
    );
  }

  set assist(value: number) {
    this.layers = uniformAssists(value);
  }

  /** Cambia las ayudas capa a capa. Es lo que hacen los tramos. */
  setAssists(layers: AssistLayers): void {
    this.layers = layers;
  }

  /** De qué está hecho el suelo de debajo. Ver `ponerSuperficie` en el modelo. */
  private superficie: Superficie = "asfalto";

  ponerSuperficie(superficie: Superficie): void {
    this.superficie = superficie;
  }

  /** Si la pista está mojada. Ver `ponerPistaMojada` en el modelo. */
  private pistaMojada = false;

  ponerPistaMojada(mojada: boolean): void {
    this.pistaMojada = mojada;
  }

  /**
   * **Lo que sostiene el aire ahora mismo**, N, hacia el techo del avión: lo
   * que el ala le quita de peso a las ruedas. Lo apunta `integrate` y lo mira
   * `resolveGround`, porque el freno muerde sobre lo que queda.
   */
  private apoyoDelAire = 0;

  /**
   * La rapidez sobre el suelo al acabar el paso anterior en tierra, m/s, o
   * `null` en el aire. Con ella el autofreno sabe cuánto frena ya el avión sin
   * él —el aire, la cuesta, el motor—, que es lo que mide uno de verdad.
   */
  private rapidezEnTierra: number | null = null;

  /** El freno que ve la rueda ahora, de 0 a 1: el del pie o el del autofreno. */
  private frenoDeAhora = 0;

  /** Lo que está frenando la rueda, de 0 a 1. Lo mira el cuadro. */
  frenoEnLaRueda(): number {
    return this.frenoDeAhora;
  }

  /** El timón que sostiene el avión ahora mismo. Ver `timonAhora`. */
  private timonQueSostiene = 0;

  timonAhora(): number {
    return this.timonQueSostiene;
  }

  /** El timón con el que voló el último paso. Ver `timonDelPaso`. */
  private timonDelUltimoPaso = 0;

  timonDelPaso(): number {
    return this.timonDelUltimoPaso;
  }

  /** Los flaps con los que voló el último paso, de 0 a 1. */
  private flapsDelPaso = 0;
  /**
   * Y el tren y los aerofrenos, para `gasPara` sin lo sacado. El tren, fuera
   * hasta el primer paso, como en `neutralControls`.
   */
  private trenDelPaso = 1;
  private aerofrenosDelPaso = 0;

  /**
   * **El ángulo de ataque de sustentación nula**, con los flaps del último
   * paso, rad: donde la recta de `step` —`cl0 + clα·α` y lo que suman los
   * flaps— cruza el cero. El efecto suelo escala la recta entera y no lo mueve.
   * Ver `FlightModel.anguloSinSustentacion`.
   */
  anguloSinSustentacion(): number {
    const ac = this.aircraft;
    return -(ac.aero.cl0 + sustentacionDeLosFlaps(ac, this.flapsDelPaso)) / ac.aero.clAlpha;
  }

  /**
   * **La palanca que pide el picado del suelo en el último paso**, de −1 a 1:
   * la que hay que sumar para sostener el morro como estaba, `−ΔCm/cmδ`. Cero
   * fuera del colchón. Lo pide quien recoge sin ser una persona —el banco—
   * para tirar lo que tiraría un piloto que sabe que el suelo pica. Ver
   * `momentoDelSuelo` en `efecto-suelo.ts`.
   */
  palancaDelSuelo(): number {
    return -this.picadoDelSuelo / this.aircraft.aero.cmElevator;
  }
  private picadoDelSuelo = 0;

  /**
   * **Cómo está cada motor**, en el orden de `motoresA`: de izquierda a
   * derecha. Todos en marcha al empezar cada vuelo. Ver `flight/motores.ts`.
   */
  private motores: EstadoDelMotor[] = [];
  /** Segundos que lleva parado cada motor, para la bandera sola. */
  private paradoDesde: number[] = [];

  /** Cómo está cada motor ahora. Ver `EstadoDelMotor`. */
  motoresAhora(): readonly EstadoDelMotor[] {
    return this.motores;
  }

  /**
   * **Se para un motor**, y solo ese: los demás siguen empujando.
   *
   * Queda en molinete, que es como queda cualquier motor al pararse; si el
   * avión lleva la bandera automática, la hélice se pone de canto sola a los
   * dos segundos. Ver `AUTOBANDERA`.
   */
  pararMotor(i: number): void {
    if (i < 0 || i >= this.motores.length) return;
    if (this.motores[i] !== "marcha") return;
    this.motores[i] = alPararse();
    this.paradoDesde[i] = 0;
  }

  /**
   * **Se asegura un motor parado**: la hélice en bandera, si la tiene. Un fan
   * no la tiene, y se queda en molinete aunque se le corte el combustible —el
   * aire lo sigue moviendo—, que es lo que pasa de verdad.
   */
  asegurarMotor(i: number): void {
    if (i < 0 || i >= this.motores.length) return;
    if (this.motores[i] === "marcha") return;
    if (llevaBandera(this.aircraft)) this.motores[i] = "bandera";
  }

  /** Todos en marcha otra vez: un vuelo nuevo. */
  private reponerLosMotores(): void {
    const n = Math.max(1, this.aircraft.motoresA.length);
    this.motores = Array.from({ length: n }, () => "marcha" as const);
    this.paradoDesde = Array.from({ length: n }, () => 0);
    this.tocado = null;
  }

  /**
   * **Un motor con un ave dentro**, que es el ejercicio del ave (#90): cuál,
   * hasta dónde le deja ir su palanca y desde qué empuje petardea. Lo pone el
   * juego en cada paso mientras dura, y `null` cuando no hay ninguno: entonces
   * nada de esto se calcula. Ese motor lleva desde aquí su propio giro, que
   * sigue a su palanca y no a la de los demás. Ver `ave-en-el-motor.ts` y el
   * ADR 0014, enmienda H77.
   */
  ponerMotorTocado(m: { readonly motor: number; readonly tope: number; readonly umbral: number } | null): void {
    if (m === null || this.aircraft.motoresA.length < 2 || this.aircraft.motoresA[m.motor] === undefined) {
      this.tocado = null;
      return;
    }
    if (this.tocado === null || this.tocado.motor !== m.motor)
      this.tocado = {
        motor: m.motor,
        tope: m.tope,
        umbral: m.umbral,
        giro: this.giro ? { ...this.giro } : null,
        petardeo: new Petardeo(),
        da: this.gasDelMotor(),
      };
    this.tocado.tope = m.tope;
    this.tocado.umbral = m.umbral;
  }

  /** Cómo va ese motor: lo que da y lo que le queda, para su aguja y lo que suena. */
  get motorTocado(): MotorTocado | null {
    const t = this.tocado;
    if (t === null) return null;
    return {
      motor: t.motor,
      da: t.da,
      empuje: t.petardeo.empuje,
      vueltas: t.petardeo.vueltas,
      estallidos: t.petardeo.estallidos,
    };
  }

  private tocado: {
    motor: number;
    tope: number;
    umbral: number;
    giro: GiroDelMotor | null;
    petardeo: Petardeo;
    /** Lo que da, sin lo que le quita el petardeo, de 0 a 1. */
    da: number;
  } | null = null;

  /**
   * **Lo que le falta al motor tocado** para dar lo que dan los demás, N, en
   * este paso: su palanca va por debajo, o petardea. Cero si está parado, que
   * ya no da nada.
   */
  private loQueLeFalta(pedido: number, cadaUno: number, cadaUnoLleno: number, dt: number): number {
    const t = this.tocado;
    if (t === null || this.motores[t.motor] !== "marcha") return 0;
    const suyo = Math.min(pedido, t.tope);
    if (t.giro === null) t.giro = giroAsentado(this.aircraft, suyo);
    else avanzarGiro(t.giro, this.aircraft, suyo, dt);
    t.da = gasQueDa(t.giro, this.aircraft);
    t.petardeo.paso(dt, t.da, t.umbral);
    return cadaUno - t.da * t.petardeo.empuje * cadaUnoLleno;
  }

  /** El último empuje calculado, para el combustible. Ver `empujeAhora`. */
  private ultimoEmpuje = 0;

  empujeAhora(): number {
    return this.ultimoEmpuje;
  }

  /**
   * **Cómo va el motor**, o `null` recién colocado: el primer paso lo asienta
   * en el gas que haya, porque un avión que se coloca en la final llega con
   * el motor ya dando lo de la final. Ver `respuesta-del-motor.ts`.
   */
  private giro: GiroDelMotor | null = null;

  gasDelMotor(): number {
    return this.giro ? gasQueDa(this.giro, this.aircraft) : 0;
  }

  setOnRunway(enPista: boolean): void {
    this.state.onRunway = enPista;
  }

  /** Se rompió: por el mismo camino que una toma dura. */
  /**
   * El viento que sopla, en ejes del mundo y en metros por segundo.
   *
   * Va a dónde **va** el aire, no de dónde viene: un viento del norte de diez
   * nudos es un vector que apunta al sur. La conversión la hace quien lo pone,
   * que es el que tiene el dato del METAR. Ver `ponerViento`.
   */
  private readonly viento = new Vector3();
  /** Velocidad respecto al aire. Se reusa para no crear un vector por paso. */
  private readonly relativa = new Vector3();

  /**
   * El aire del día: la temperatura y la presión del parte, que mueven la
   * densidad y con ella todo. Ver `atmosphere.ts` y `ponerAire` en `model.ts`.
   */
  private aire: Aire = AIRE_ESTANDAR;

  ponerAire(aire: Aire): void {
    this.aire = aire;
  }

  aireDelDia(): Aire {
    return this.aire;
  }

  /**
   * **Lo que pesa ahora**, kg: la masa sin combustible más lo que queda en los
   * depósitos. Ver `ponerMasa` en `model.ts`.
   *
   * Cambia la masa y nada más: las inercias se quedan las de la ficha. El
   * combustible es, como mucho, un quinto del avión y va en las alas, a la
   * altura del centro de gravedad; lo que se notaría con los depósitos llenos
   * es algo más de inercia de alabeo y de guiñada, y eso no se cuenta.
   *
   * Y no se rehace por menos de medio kilo: el fotograma de un avión de línea
   * quema décimas.
   */
  ponerMasa(kg: number): void {
    if (Math.abs(kg - masaDe(this.aircraft)) < 0.5) return;
    this.aircraft = conCentrado(conMasa(this.ficha, kg), centradoDe(this.aircraft));
  }

  /**
   * **Dónde va el centro de gravedad**, m por detrás del de su modelo. Ver
   * `ponerCentrado` en `model.ts` y `flight/centrado.ts`.
   *
   * Se puede llamar en pleno vuelo y en cada fotograma: es lo que necesita la
   * carga que se suelta y se va hacia la cola (#90), que no está todavía.
   * Como la masa, mueve la copia y no la ficha, y las inercias se quedan las
   * de su ficha.
   */
  ponerCentrado(dx: number): void {
    if (Math.abs(dx - centradoDe(this.aircraft)) < 1e-4) return;
    this.aircraft = conCentrado(this.aircraft, dx);
  }

  centradoAhora(): number {
    return centradoDe(this.aircraft);
  }

  masaAhora(): number {
    return masaDe(this.aircraft);
  }

  ponerViento(x: number, z: number): void {
    this.vientoDelParte.x = x;
    this.vientoDelParte.z = z;
    this.viento.set(x + this.racha.x, this.racha.y, z + this.racha.z);
  }

  /**
   * La ráfaga, que se suma al viento del parte.
   *
   * Se guarda aparte y se suma en `ponerViento` para que las dos se puedan
   * mandar por separado y desde sitios distintos: el viento lo pone el parte
   * cuando cambia, y la ráfaga el bucle en cada fotograma.
   */
  private readonly racha = { x: 0, y: 0, z: 0 };
  private readonly vientoDelParte = { x: 0, z: 0 };

  ponerRacha(x: number, y: number, z: number, alabeo = 0): void {
    this.racha.x = x;
    this.racha.y = y;
    this.racha.z = z;
    this.rachaDeAlabeo = alabeo;
    this.viento.set(this.vientoDelParte.x + x, y, this.vientoDelParte.z + z);
  }

  /**
   * La ráfaga de alabeo, rad/s: el aire que sube por un ala y baja por la
   * otra. Entra en el amortiguamiento de alabeo como si el avión rodara al
   * revés, que es lo que ve el ala. Ver `rachaEn` en `turbulencia.ts`.
   */
  private rachaDeAlabeo = 0;

  romper(): void {
    this.state.crashed = true;
  }

  /**
   * **El ángulo de ataque que sostiene el peso** volando nivelado a esa
   * velocidad y a esa altura, sin flaps o con los que se digan, rad: la
   * sustentación igual al peso, despejada de la recta de la ficha.
   */
  private alfaDeEquilibrio(velocidad: number, altura: number, flaps = 0): number {
    const ac = this.aircraft;
    const qS = 0.5 * airDensity(altura, this.aire) * velocidad * velocidad * ac.wingArea;
    const cl = (masaDe(ac) * GRAVITY) / Math.max(1, qS);
    return clamp(
      (cl - ac.aero.cl0 - sustentacionDeLosFlaps(ac, flaps)) / ac.aero.clAlpha,
      -0.05,
      anguloDePerdida(ac, flaps) * 0.85,
    );
  }

  /** Ver `subidaQueSostiene` en `model.ts`. */
  subidaQueSostiene(): number | null {
    return this.layers.climbHold > 0 ? this.trimClimb : null;
  }

  /**
   * El timón que sostiene el avión nivelado a la velocidad de ahora: el que
   * anula el par de cabeceo con el ángulo de ataque de equilibrio. Ver
   * `timonDeEquilibrio` en `model.ts`.
   */
  timonDeEquilibrio(flaps = 0): number {
    const a = this.aircraft.aero;
    const alfa = this.alfaDeEquilibrio(this.state.airspeed, this.state.position.y, flaps);
    const cl = a.cl0 + a.clAlpha * alfa + sustentacionDeLosFlaps(this.aircraft, flaps);
    return clamp(
      -(a.cm0 + a.cmAlpha * alfa + parDelCentrado(this.aircraft, cl)) / a.cmElevator,
      -1,
      1,
    );
  }

  reset(initial: InitialConditions): void {
    const s = this.state;
    this.rapidezEnTierra = null;
    this.frenoDeAhora = 0;
    this.rumboEnTierra = null;
    this.pieEnTierra = 0;
    this.sinRuedas = 0;
    s.position.copy(initial.position);
    s.orientation.setFromAxisAngle(new Vector3(0, 1, 0), -initial.heading);
    this.updateBodyAxes();
    /*
     * **Por la trayectoria colocada**, si se dice: la senda de la final nace
     * bajando por ella, no nivelada con el gas de bajar y asentándose por
     * encima. Ver `InitialConditions.trayectoria`.
     */
    const trayectoria =
      initial.equilibrado && initial.airspeed > MIN_AIRSPEED ? (initial.trayectoria ?? 0) : 0;
    s.velocity.copy(this.forward).multiplyScalar(initial.airspeed * Math.cos(trayectoria));
    s.velocity.y = initial.airspeed * Math.sin(trayectoria);
    /*
     * **Y la velocidad pedida es respecto al aire**, como dice
     * `InitialConditions.airspeed`: volando, el aire se mueve, y el avión con
     * él. Se ponía respecto al suelo, así que con viento nacía con otra
     * velocidad de la pedida: colocado en la final de diez kilómetros de La
     * Gomera a su Vref más cinco nudos, con catorce nudos de viento de 020,
     * salía a 57,9 m/s de aire en vez de 52,6 y con seis grados de derrape;
     * con los flaps de aterrizar eso es 1,3 g, y en cuatro segundos subía a
     * seis metros por segundo. En el suelo no: parado con viento, parado.
     */
    const alto = initial.position.y - this.ground(initial.position.x, initial.position.z);
    if (initial.airspeed > MIN_AIRSPEED && alto > this.aircraft.gearHeight + PEGADO_AL_SUELO)
      s.velocity.addScaledVector(this.viento, perfilDeViento(alto));
    /*
     * Equilibrado: el morro arriba lo que pide el ala para sostener el peso
     * sobre la trayectoria, que es horizontal si no se dice otra. Ver
     * `InitialConditions.equilibrado`.
     */
    if (initial.equilibrado && initial.airspeed > MIN_AIRSPEED)
      this.rotateAboutRight(
        this.alfaDeEquilibrio(
          initial.airspeed,
          initial.position.y,
          initial.flapsDelEquilibrio ?? 0,
        ) + trayectoria,
      );
    /*
     * **Y el de rueda de cola, puesto en el suelo despacio, en sus tres
     * puntos**, que es como está parado. Se le coloca como a todos, con las
     * principales a `gearHeight`; girarlo sobre ellas baja el centro y apoya
     * la de cola. Sin esto nacía a nivel y se sentaba de golpe en el primer
     * paso, y en el remolque, que lo recoloca en cada fotograma, no llegaba a
     * sentarse nunca.
     */
    const tresPuntos = this.aircraft.actitudEnTresPuntos;
    if (
      tresPuntos !== undefined &&
      alto <= this.aircraft.gearHeight + PEGADO_AL_SUELO &&
      initial.airspeed < this.aircraft.rotationSpeed * 0.5
    )
      this.rotateAboutMainWheels(tresPuntos);
    s.rollRate = 0;
    s.pitchRate = 0;
    s.yawRate = 0;
    s.crashed = false;
    s.stalled = false;
    s.stallWarning = false;
    this.stallFor = 0;
    this.pesoEnElMorro = 0;
    this.morroPosado = null;
    s.loadFactor = 1;
    /*
     * **Y la ayuda de subida, con lo colocado como petición.** Al soltar los
     * mandos coge entre nivelado y subiendo, nunca una bajada, para no
     * memorizar un transitorio (ver `step`); pero una colocación no es un
     * transitorio: es lo que se ha pedido, como un toque del compensador, y
     * con su mismo tope. Sin trayectoria, como siempre: coge al soltar. Y si
     * se dice otra cosa, eso: ver `InitialConditions.subidaPedida`.
     */
    const pedida =
      initial.subidaPedida !== undefined
        ? initial.subidaPedida
        : initial.trayectoria !== undefined
          ? initial.airspeed * Math.sin(initial.trayectoria)
          : null;
    this.trimClimb =
      initial.equilibrado && initial.airspeed > MIN_AIRSPEED && pedida !== null
        ? clamp(pedida, -SUBIDA_PEDIDA_TOPE, SUBIDA_PEDIDA_TOPE)
        : null;
    this.trimSettle = 0;
    this.trimVisto = null;
    // Un vuelo nuevo empieza con todos los motores en marcha, y asentados en
    // el gas del primer paso. Ver `giro`.
    this.reponerLosMotores();
    this.giro = null;
    this.updateDerived();
    // Y el timón que lo sostiene, para quien lo coja volando. Ver `timonAhora`.
    if (initial.equilibrado) {
      this.timonQueSostiene = this.timonDeEquilibrio(initial.flapsDelEquilibrio ?? 0);
      this.timonDelUltimoPaso = this.timonQueSostiene;
    }
    // Y sus flaps, hasta el primer paso. Ver `anguloSinSustentacion`.
    this.flapsDelPaso = initial.flapsDelEquilibrio ?? 0;
    /*
     * **Y en el suelo solo si las ruedas tocan.**
     *
     * `onGround` se quedaba con lo que dijera el vuelo anterior —y el primero
     * empieza en `true`—, así que un avión colocado ciento cincuenta metros en
     * el aire seguía «en el suelo» hasta el primer paso. Y en ese hueco llega
     * `recolocarTrasElMoldeado`, que se fía de la bandera y lo **baja al
     * suelo**: la lección de aterrizar de Yvytu Rape empezaba rodando por un
     * potrero a tres kilómetros de la pista, de morros contra un árbol. El
     * modelo sencillo no lo tenía porque su `reset` ya pasa por el suelo.
     */
    this.updateBodyAxes();
    s.onGround = s.heightAboveGround <= this.alturaDelApoyo() + PEGADO_AL_SUELO;
  }

  /**
   * Vez y media la de aproximación: rápido para posarse, y lo bastante lento
   * como para que la aproximación sea una aproximación. Medido, este modelo la
   * sostiene nivelada durante el minuto entero que dura la senda.
   */
  /**
   * El crucero de la ficha. Aquí el modelo llega bastante más arriba en
   * picado, pero como listón de «esto ya es demasiado» el crucero es honesto.
   *
   * **Y no es Vmo**, aunque lo parezca. Esto lo usan el juez del aterrizaje
   * —«tocaste demasiado rápido»— y la escala del velocímetro, y para las dos
   * cosas lo que hace falta es la velocidad a la que se vuela, no la que
   * rompe el avión. Poner Vmo aquí dejaría al de fuselaje ancho aterrizando a
   * seiscientos por hora sin que nadie dijera nada. El tope de verdad está
   * abajo, en `limiteDeVelocidad`.
   */
  velocidadMaxima(): number {
    return this.aircraft.cruiseSpeed;
  }

  /**
   * **Vmo o Mmo, el que mande a esta altura.** El tope de verdad.
   *
   * Este modelo no tenía velocidad máxima ninguna: el empuje peleaba contra la
   * resistencia y donde se cruzaban, ahí se quedaba. Medido nivelado a tope de
   * gas y sin asistencia, el JAZ 90 daba **1.054 km/h a quinientos metros** —
   * Mach 0,86 a ras de suelo, con una presión dinámica que no aguanta ningún
   * fuselaje de esa clase. El avión no se rompía porque el juego no sabía que
   * eso se rompe.
   *
   * Y **cambia con la altura**: abajo lo pone la estructura y arriba el aire.
   * Ver `flight/limites.ts`, que es donde está la cuenta y el porqué. Es el
   * #159.
   */
  limiteDeVelocidad(): number {
    return topeDeVelocidad(this.aircraft, this.state.position.y, this.aire)
      .verdadera;
  }

  /** Y quién lo pone aquí: la estructura o el aire. Para poder decirlo. */
  quienLimita(): QuienManda {
    return topeDeVelocidad(this.aircraft, this.state.position.y, this.aire)
      .manda;
  }

  /** El mismo con el que se rompe de verdad. Ver `crashLimits`. */
  limiteDeCaida(): number {
    return this.crashLimits().sink;
  }

  /**
   * Diez pies por segundo: el del tren certificado. Este modelo lleva recogida
   * de verdad —se levanta la nariz y el avión deja de bajar—, así que lo que
   * pasa de ahí es lo que pasaría en el avión. Ver `DURO_DE_TRANSPORTE`.
   */
  limiteDeDuro(): number {
    return DURO_DE_TRANSPORTE;
  }

  velocidadDeEntradaEnFinal(vref: number): number {
    return vref * 1.5;
  }

  /**
   * **El gas que sostiene esa velocidad verdadera**, sacado de las mismas
   * fuerzas que mueven el avión: la resistencia a esa velocidad con lo que se
   * lleva fuera, a esta altura y en el aire del día, entre lo que da el motor
   * a fondo ahí. Nivelado, o por la pendiente que se diga.
   *
   * Aquí había una recta a ojo —la velocidad entre la de crucero, por ocho
   * décimas— y la justificación era que «no hay cuenta exacta»: la velocidad
   * de equilibrio depende de la actitud y de si se sube o se baja. Nivelado
   * la hay, y es la de `gasQueSostiene`, que ya llevaban la marca del motor
   * y la colocación de los ejercicios. La recta no miraba ni el empuje ni la
   * resistencia, así que no se enteró de nada de lo que cambió en ellos: con
   * la hélice de velocidad constante del JAZ 25 (H37c), a 75 nudos y mil
   * quinientos metros pedía 0,60 cuando lo que sostiene es 0,47, y el avión
   * que la prueba de la mano coloca con ese gas aceleraba hasta 82 nudos en
   * vez de quedarse; al JAZ 20 le daba de menos a 60 nudos —0,44 contra
   * 0,54— y le sobraba a 90. Es lo mismo que pasó con `gasParaRodar`: dos
   * cuentas para lo mismo acaban diciendo cosas distintas (ADR 0002, nota
   * H40a).
   *
   * Sin `sacado`, con lo del último paso. Y donde no hay solución, lo que se
   * puede: más rápido de lo que da a fondo, todo el gas; más despacio que la
   * pérdida con esos flaps, el que la sostiene a ella, que es lo más que
   * pide nivelado —por debajo no hay gas que sostenga nada, y la cuenta
   * despejaría una sustentación que el ala no da—.
   */
  gasPara(velocidad: number, sacado?: LoSacado, pendiente = 0): number {
    const ac = this.aircraft;
    const lleva = sacado ?? {
      flaps: this.flapsDelPaso,
      tren: this.trenDelPaso,
      aerofrenos: this.aerofrenosDelPaso,
    };
    const altura = this.state.position.y;
    const densidad = airDensity(altura, this.aire);
    const perdida =
      perdidaCon(ac, lleva.flaps) * Math.sqrt(SEA_LEVEL_DENSITY / Math.max(0.01, densidad));
    const gas = palancaQueSostiene(ac, {
      altura,
      verdadera: Math.max(velocidad, perdida),
      aire: this.aire,
      flaps: lleva.flaps,
      tren: lleva.tren,
      aerofrenos: lleva.aerofrenos ?? 0,
      pendiente,
    });
    return Number.isFinite(gas) ? clamp(gas, 0, 1) : 1;
  }

  /**
   * **El gas que sostiene una velocidad rodando**, sacado de las mismas
   * fuerzas que mueven el avión: el que iguala el empuje a esa velocidad con
   * lo que frena en el suelo, que es la rodadura de este suelo y el aire.
   *
   * Aquí había una recta a ojo —un quinto de gas por cada treinta metros por
   * segundo, con un suelo de dos décimas «para arrancar parado»— y la
   * justificación era que en este modelo el gas es empuje y «no hay cuenta
   * exacta». La hay, y la recta no se parecía: al JAZ 20 le daba 0,30 para
   * nueve metros por segundo, y con 0,30 el JAZ 20 rueda a **14,6**. Con esa
   * cuenta van la marca de rodaje de la palanca táctil y el tope de rodaje de
   * Tukã, así que la marca prometía rodar y llevaba a correr, y el tope solo
   * sujetaba el avión a base de freno.
   *
   * Lo que frena rodando es poco y se sabe: la rodadura es un coeficiente por
   * el peso —ver `ROZAMIENTO`, que es el mismo que aplica `integrate`—, y el
   * aire, su resistencia parásita con el tren fuera y la inducida del ala
   * apoyada, que a paso de rodaje casi no cuenta. El empuje cae con la
   * velocidad y con la altura como en vuelo —ver `empujeLleno`—, y en el
   * mismo sitio, para que esta cuenta y el motor no puedan decir cosas
   * distintas.
   *
   * **Y sostener no es llegar.** Como lo que frena en el suelo casi no
   * cambia con la velocidad, el gas que sostiene nueve metros por segundo
   * mueve a un avión parado con una décima de lo que tiene: al JAZ 20 le
   * costaría minutos llegar. Con `desde` —lo que se lleva ahora— se pide
   * además lo que acelera hacia la velocidad pedida, como hace quien conduce
   * un coche: mucho mientras falta y nada al llegar. Ver `ACELERA_RODANDO`.
   */
  gasParaRodar(velocidad: number, desde = velocidad): number {
    const ac = this.aircraft;
    const quiero = Math.max(0, velocidad);
    const densidad = airDensity(this.state.position.y, this.aire);
    /*
     * Lo que frena a una velocidad: la rodadura de este suelo, que es la
     * misma que aplica `resolveGround`, y el aire con el ala apoyada y el
     * tren fuera, que a paso de rodaje casi no cuenta.
     */
    const alargamiento = (ac.wingSpan * ac.wingSpan) / ac.wingArea;
    // La rodadura, sobre el peso que cargan las ruedas: el ala apoyada ya
    // sostiene algo, como en `resolveGround`. Y con la actitud con la que
    // rueda: el de rueda de cola, en tres puntos, sustenta y frena más. Ver
    // `actitudEnTierra`.
    // Y con el ala a su altura sobre la pista, que es efecto suelo del todo:
    // lo mismo que le cuenta `integrate`. Ver `flight/efecto-suelo.ts`.
    const suelo = efectoSueloRodando(ac);
    const frenaA = (v: number): number => {
      const q = 0.5 * densidad * v * v * ac.wingArea;
      const cl =
        (ac.aero.cl0 + ac.aero.clAlpha * actitudEnTierra(ac, v)) *
        suelo.sustentacion;
      const cd =
        ac.aero.cd0 +
        ((cl * cl) / (Math.PI * alargamiento * ac.aero.oswald)) *
          suelo.inducida +
        resistenciaDelTren(ac, 1, 0);
      return (
        ROZAMIENTO[this.superficie] *
          Math.max(0, masaDe(ac) * GRAVITY - q * cl) +
        q * cd
      );
    };
    /*
     * Sobrando velocidad, el de sostener la pedida: con él el avión va
     * perdiendo lo que le sobra, y frenar de verdad es cosa del freno.
     */
    const ahora = Math.max(0, Math.min(desde, quiero));
    const acelera = Math.min(
      ACELERA_RODANDO,
      (quiero - ahora) / EN_LLEGAR_RODANDO,
    );
    const lleno = empujeLleno(ac, densidad, ahora);
    if (!(lleno > 0)) return 1;
    return Math.max(
      0,
      Math.min(1, (frenaA(ahora) + masaDe(ac) * acelera) / lleno),
    );
  }

  step(dt: number, controls: ControlInputs): void {
    // El tope, uno solo y compartido con el bucle del juego. Ver `MAX_PASO`.
    const total = Math.min(dt, MAX_PASO);
    const substeps = Math.max(1, Math.ceil(total / MAX_SUBSTEP));
    const h = total / substeps;
    for (let i = 0; i < substeps; i++) this.integrate(h, controls);
    this.updateDerived();
  }

  // ── Núcleo ────────────────────────────────────────────────────────────

  private integrate(dt: number, controls: ControlInputs): void {
    const s = this.state;
    const ac = this.aircraft;
    const a = ac.aero;

    this.updateBodyAxes();

    /*
     * Velocidad **respecto al aire**, en ejes cuerpo: la del avión menos la del
     * viento. Es la que hace la sustentación, la resistencia y todo lo demás.
     *
     * Aquí ponía «sin viento todavía», y ese todavía duró: el panel del tiempo
     * enseñaba el viento, la manga lo señalaba, la torre elegía cabecera con él
     * y el METAR lo traía de verdad — y el avión no lo notaba. Despegar con
     * quince nudos de cola y con quince de cara era exactamente lo mismo, que
     * es lo contrario de lo que este juego enseña.
     *
     * **Y con perfil de altura**, que es lo que impide que el rodaje se vuelva
     * un despropósito: el viento no sopla igual a ras de suelo que a cien
     * metros, porque el suelo lo frena. Una quinta parte abajo y entero arriba,
     * subiendo con la raíz de la altura — que es la forma que tiene de verdad
     * la capa límite y lo que usa cualquier tabla de viento en superficie.
     */
    const { u, v, w, speed } = this.respectoAlAire();

    // La del día, no la de las tablas: con calor el aire pesa menos, y
    // sustenta, frena y empuja menos. Ver `atmosphere.ts`.
    const density = airDensity(s.position.y, this.aire);

    if (speed > MIN_AIRSPEED) {
      s.alpha = anguloDeAtaque(u, w);
      s.beta = Math.asin(Math.max(-1, Math.min(1, v / speed)));
    } else {
      s.alpha = 0;
      s.beta = 0;
    }
    s.airspeed = speed;

    const qDyn = 0.5 * density * speed * speed;
    const qS = qDyn * ac.wingArea;

    const assisted = this.applyAssist(controls, s.alpha, s.beta, dt, qS);
    this.flapsDelPaso = assisted.flaps;
    this.trenDelPaso = assisted.tren;
    this.aerofrenosDelPaso = controls.aerofrenos ?? 0;
    /*
     * **Y lo que sustenta, frena y cabecea es el aire que pasa por el plano de
     * simetría**, no todo el que llega.
     *
     * Con el avión volando esto es lo mismo —derrapes de unos grados, coseno
     * al cuadrado de casi uno—, y por eso la cuenta de siempre valía. Parado
     * con viento no: con veinte nudos de costado, `u` y `w` son casi cero y el
     * ángulo de ataque salía de dividir dos ráfagas —más o menos noventa
     * grados, según soplara—, multiplicado por la presión del viento **entera**.
     * Un avión en el puesto cabeceaba con el viento de lado como si volara de
     * canto. Lo lateral —la fuerza de costado, el alabeo, la guiñada— sigue
     * con la presión entera, que es la que le corresponde.
     */
    const qSSimetria =
      0.5 * density * (u * u + w * w) * ac.wingArea;
    const aspectRatio = (ac.wingSpan * ac.wingSpan) / ac.wingArea;

    // Alarga la pérdida en modo arcade en vez de eliminarla: el avión sigue
    // cayendo si insistís, pero perdona el tirón nervioso de un crío. La de
    // los flaps que lleva: con slats o Krueger fuera, más ángulo. Ver
    // `anguloDePerdida`.
    //
    // **Y lo que alarga es lo mismo con flaps que sin ellos**: los grados de
    // la pérdida del ala limpia por 0,45, más allá de la pérdida con los flaps
    // que lleva. Multiplicando la pérdida con flaps, la red cambiaba con el
    // reparto entre ángulo y flaps. Ver `masAllaDeLaPerdida`.
    const perdidaDelAla = anguloDePerdida(ac, assisted.flaps);
    const stallAngle = masAllaDeLaPerdida(
      ac,
      assisted.flaps,
      1 + 0.45 * this.layers.stallProtection,
    );
    const conLosFlaps = sustentacionDeLosFlaps(ac, assisted.flaps);
    /*
     * **Y el suelo debajo del ala**, que a menos de una envergadura le quita
     * inducida y le da sustentación: el colchón de la recogida y lo que deja
     * un avión en el aire antes de poder subir. Por la altura del ala y no la
     * del centro —el ala alta va casi un metro y medio más arriba—, y sobre lo
     * que haya debajo, pista, campo o agua: el juego da la superficie, con su
     * agua donde la hay. Ver `flight/efecto-suelo.ts`.
     */
    const suelo = efectoSuelo(
      ac,
      s.position.y -
        ac.alturaDelAla * this.down.y -
        this.ground(s.position.x, s.position.z),
    );
    const clDelAla =
      (liftCoefficient(s.alpha, a, stallAngle) + conLosFlaps) *
      suelo.sustentacion;
    /*
     * **Y lo que se llevan los frenos de tierra.** Con todos los paneles
     * arriba la corriente se rompe encima de los flaps, que es donde está casi
     * toda la sustentación de más: el ala deja de sostener el avión y el peso
     * pasa a las ruedas, que es para lo que salen. Solo la sustentación
     * positiva: una placa levantada no empuja el ala hacia arriba.
     */
    const cl =
      clDelAla > 0
        ? clDelAla * (1 - parteQueSeLlevan(ac, controls.frenosDeTierra ?? 0))
        : clDelAla;
    /*
     * La inducida y la del ala en pérdida, aparte: el compensador automático
     * quita las dos para saber cuánto frena el avión a un g. Ver
     * `sobraParaSubir`.
     */
    const inducida =
      ((cl * cl) / (Math.PI * aspectRatio * a.oswald)) * suelo.inducida;
    const enPerdida = postStallDrag(s.alpha, stallAngle);
    const cd =
      a.cd0 +
      inducida +
      enPerdida +
      // Los flaps, por el ángulo al que están y no por la palanca. Ver
      // `resistenciaDeLosFlaps`.
      resistenciaDeLosFlaps(ac, assisted.flaps) +
      /*
       * **Y los aerofrenos, en el avión que los lleva**: lo que suman abiertos
       * del todo, por lo abiertos que estén. Ver `aerofrenos` en la ficha. Y
       * los de tierra, que son los mismos paneles todos arriba: frenan más,
       * pero no se suman a los de vuelo. Ver `resistenciaDeLosPaneles`.
       */
      resistenciaDeLosPaneles(
        ac,
        controls.aerofrenos ?? 0,
        controls.frenosDeTierra ?? 0,
      ) +
      /*
       * **Y el tren, que fuera frena.**
       *
       * Es la lección que hay detrás de medio oficio: una cosa que te hace
       * falta para aterrizar te estorba para volar. **Se suma** con el tren
       * fuera sobre el `cd0` limpio de la ficha, y con él dentro no quita
       * nada: restarlo dejaba a los reactores sin resistencia parásita —el
       * JAZ 90 en cero, el JAZ 120 en negativo— y planeando de más (#170).
       *
       * **Solo en los que lo meten.** El `cd0` del entrenador ya incluye sus
       * patas porque las lleva siempre, y sumárselas otra vez sería contarlas
       * dos veces. Ver `resistenciaDelTren` en `flight/tren.ts`.
       */
      resistenciaDelTren(
        ac,
        assisted.tren,
        fraccionDeLosFlaps(ac, assisted.flaps),
      ) +
      /*
       * **Y la onda, que es lo que impide cruzar la barrera del sonido.**
       *
       * Sin ella el empuje y la resistencia se igualaban donde les daba la
       * gana: medido, el de fuselaje ancho nivelado y con gas a fondo llegaba
       * a Mach 1,06 a tres mil metros. Ningún avión de pasaje hace eso, y el
       * aviso de sobrevelocidad quedaba avisando de un límite que luego no
       * costaba nada pasar — que es como se enseña a desoír los avisos.
       *
       * Ver `resistenciaDeOnda` en `flight/limites.ts`, donde está la curva y
       * el porqué de cada número.
       */
      resistenciaDeOnda(
        machDe(speed, this.state.position.y, this.aire),
        ac.mmo,
        a.cd0,
      ) +
      /*
       * **Y el pie, que tampoco es gratis.** El timón pisado tuerce porque la
       * deriva empuja de lado, y empujar de lado frena. Con un motor parado
       * se vuela así todo el rato, y es lo que le faltaba al bimotor de
       * pistón para subir con uno lo que sube el suyo. Ver
       * `resistenciaDelTimon` en `flight/motores.ts`.
       */
      resistenciaDelTimon(assisted.rudder);
    const cy = a.cyBeta * s.beta;

    // ── Pérdida, con histéresis y con paciencia ──────────────────────────
    //
    // Antes se marcaba pérdida en el instante en que el ángulo rozaba el
    // umbral. Dos consecuencias, las dos malas: la alarma parpadeaba al
    // entrar y salir, y saltaba **subiendo normalmente después de despegar**,
    // que es cuando el ala va más cargada y menos falta hace asustar a nadie.
    //
    // Un ala no entra en pérdida por tocar un ángulo una décima de segundo.
    // Así que entra si se mantiene, y no sale hasta bajar bien por debajo —
    // que además es lo que pasa de verdad: recuperar cuesta más que entrar.
    const pasado = Math.abs(s.alpha) > stallAngle && speed > MIN_AIRSPEED;
    this.stallFor = pasado ? this.stallFor + dt : 0;
    if (!s.stalled && this.stallFor > STALL_DELAY) s.stalled = true;
    else if (s.stalled && Math.abs(s.alpha) < stallAngle - STALL_RECOVERY)
      s.stalled = false;

    /*
     * **Y el avisador, que va por delante de la pérdida.**
     *
     * Es la veleta del costado del morro: mira el ángulo de ataque —con signo,
     * que empujando no avisa de nada— contra un umbral que baja con los flaps,
     * y suena **antes** de que el ala se vaya. Lo de arriba es la pérdida; esto
     * es lo que la anuncia, y en cualquier cabina son dos cosas distintas. Ver
     * `anguloDeAviso`. No toca la física: es un instrumento.
     */
    const umbral = anguloDeAviso(stallAngle, a, conLosFlaps);
    s.stallWarningAlpha = umbral;
    if (speed <= MIN_AIRSPEED) s.stallWarning = false;
    else if (!s.stallWarning && s.alpha > umbral) s.stallWarning = true;
    else if (s.stallWarning && s.alpha < umbral - SE_CALLA_EL_AVISADOR)
      s.stallWarning = false;

    const lift = qSSimetria * cl;
    const drag = qSSimetria * cd;
    const side = qS * cy;

    /*
     * Empuje. Cae con la densidad, y con la velocidad **según qué empuje el
     * aire**.
     *
     * Una hélice que ya va rápida muerde menos aire y pierde empuje deprisa;
     * un turbofán casi no lo pierde, porque lo que acelera es el aire que él
     * mismo traga. Ninguna de las dos es un modelo de propulsión de verdad,
     * pero la diferencia entre ellas sí lo es.
     *
     * **Aquí había una sola ley, la de la hélice, para los seis aviones**, y
     * con seis aviones dejó de valer: medido con el motor sin ayudas, el JAZ
     * 120 necesitaba 4.404 m para irse del suelo y el JAZ 90, 3.057. La pista
     * más larga del juego son los 3.516 de Mariscal Estigarribia. O sea que
     * los dos reactores no despegaban en ningún escenario en cuanto el tramo
     * usaba este motor — y el Yvága, en ninguno de los once.
     *
     * Con la ley de chorro la cuenta da 1.676 m y 1.111 m, que es lo que dicen
     * los libros: un 747 despega en unos 1.800 m al nivel del mar y un
     * regional de treinta toneladas en unos 1.600.
     */
    /*
     * **Y motor a motor**, que con uno parado deja de dar igual.
     *
     * Cada motor en marcha da su parte del empuje de la ficha; uno parado no
     * da nada y además frena, en molinete o en bandera. Con todos en marcha
     * la suma es la de siempre y los pares se anulan: esto vuela igual que
     * antes. Con uno parado, lo que queda empuja por un lado y lo que frena
     * tira del otro, y el avión guiña hacia el parado. Ver `flight/motores.ts`.
     *
     * Con la llave quitada —sin combustible, o apagado en tierra— no hay
     * nada que repartir: ni empuje ni par. Eso es `sin-motor.ts`, y su planeo
     * se calcula con la polar limpia, que es la que vuela aquí.
     */
    /*
     * **Y lo que empuja es lo que da el motor, no lo que pide el gas**: un
     * reactor tarda segundos en pasar del ralentí al empuje de ida al aire, un
     * turbohélice algo menos y un pistón nada. Ver `respuesta-del-motor.ts`.
     */
    const pedido = controls.engineOn ? assisted.throttle : 0;
    if (this.giro === null) this.giro = giroAsentado(ac, pedido);
    else avanzarGiro(this.giro, ac, pedido, dt);
    const n = this.motores.length;
    const cadaUno =
      ((controls.engineOn ? gasQueDa(this.giro, ac) : 0) *
        empujeLleno(ac, density, speed)) /
      n;
    let motoresQueFrenan = 0;
    if (controls.engineOn && n > 1) {
      for (let i = 0; i < n; i++) {
        const estado = this.motores[i]!;
        if (estado === "marcha") continue;
        this.paradoDesde[i] = (this.paradoDesde[i] ?? 0) + dt;
        // La bandera sola del turbohélice. Ver `AUTOBANDERA`.
        if (
          estado === "molinete" &&
          ac.motorParado.autoBandera &&
          (this.paradoDesde[i] ?? 0) >= AUTOBANDERA
        )
          this.motores[i] = "bandera";
        motoresQueFrenan += qDyn * areaDelMotor(ac, this.motores[i]!);
      }
    }
    let thrust = controls.engineOn ? cadaUno * enMarcha(this.motores) : 0;
    /*
     * **Y con un ave en un motor, lo que le falta a ese**: menos empuje, y por
     * su lado. Sin ejercicio `tocado` es `null` y no se toca nada: el modelo
     * vuela bit a bit lo de siempre. Ver `ponerMotorTocado`.
     */
    let leFalta = 0;
    if (this.tocado !== null && controls.engineOn && n > 1) {
      leFalta = this.loQueLeFalta(pedido, cadaUno, empujeLleno(ac, density, speed) / n, dt);
      thrust -= leFalta;
    }
    // Se guarda para el combustible, que gasta por el empuje que se da y no
    // por el gas que se pide. Ver `empujeAhora` en `model.ts`.
    this.ultimoEmpuje = thrust;

    const sinA = Math.sin(s.alpha);
    const cosA = Math.cos(s.alpha);
    const forceX = thrust - motoresQueFrenan - drag * cosA + lift * sinA;
    const forceY = side;
    const forceZ = -drag * sinA - lift * cosA;
    // Lo que el aire le quita de peso a las ruedas. Ver `resolveGround`.
    this.apoyoDelAire = -forceZ;

    // Momentos. Las velocidades angulares se adimensionalizan con la
    // semi-envergadura y la cuerda partido por la velocidad; a velocidad
    // baja eso se dispara, así que el divisor tiene suelo.
    const vRef = Math.max(speed, ac.cruiseSpeed * 0.35);
    const pHat = ((s.rollRate - this.rachaDeAlabeo) * ac.wingSpan) / (2 * vRef);
    const qHat = (s.pitchRate * ac.chord) / (2 * vRef);
    const rHat = (s.yawRate * ac.wingSpan) / (2 * vRef);

    const clMoment =
      a.clBeta * s.beta + a.clP * pHat + a.clAileron * assisted.aileron;
    /*
     * **El timón de profundidad es el mando más el compensador.**
     *
     * El mando vuelve al centro al soltarlo; el compensador se queda. Sumados
     * dan la posición real de la superficie, que es exactamente cómo funciona
     * en un avión: la rueda mueve el punto de reposo y la palanca se mueve
     * alrededor de él. Ver `ControlInputs.trim`.
     *
     * Y se satura, que un timón tiene topes: con el compensador al final del
     * recorrido, tirar más no da más.
     */
    const timon = clamp(assisted.elevator + controls.trim, -1, 1);
    let timonDeAhora = timon;
    /*
     * **Y el picado del suelo**: en el colchón la cola recibe el aire del ala
     * menos inclinado y empuja menos hacia abajo, y el morro cae. Ver
     * `momentoDelSuelo` en `flight/efecto-suelo.ts`.
     */
    this.picadoDelSuelo = momentoDelSuelo(ac, suelo, assisted.flaps, s.alpha);
    const cmMoment =
      a.cm0 +
      a.cmAlpha * anguloQueEstabiliza(s.alpha, perdidaDelAla) +
      a.cmQ * qHat +
      a.cmElevator * timon +
      this.picadoDelSuelo;
    const cnMoment =
      a.cnBeta * s.beta +
      a.cnR * rHat +
      a.cnRudder * assisted.rudder +
      a.cnAileron * assisted.aileron;

    let rollMoment = qS * ac.wingSpan * clMoment;
    let pitchMoment = qSSimetria * ac.chord * cmMoment;
    /*
     * **Y el centrado de hoy.** Los coeficientes de cabeceo de la ficha están
     * ajustados para un centro de gravedad, el de la carga de su ficha; con
     * otra carga, la fuerza del aire sigue pasando por el mismo sitio y el
     * centro se ha movido. Trasladado el par al centro de hoy, es la fuerza
     * normal por lo que se ha ido: `ΔCm = CN·Δx/c̄`. Con el centro atrás,
     * morro arriba; y como la fuerza crece con el ángulo, la estabilidad cae
     * en `CLα·Δx/c̄`, hasta perderse en el punto neutro. Ver
     * `flight/centrado.ts`. Con la carga de su ficha es cero y no suma nada.
     */
    const centrado = centradoDe(ac);
    if (centrado !== 0) pitchMoment += this.apoyoDelAire * centrado;
    /*
     * Y el par de los motores, que con todos en marcha es cero y con uno
     * parado es lo que tiene que sujetar el timón. Ver `parDeLosMotores`.
     */
    let yawMoment =
      qS * ac.wingSpan * cnMoment +
      (controls.engineOn && n > 1
        ? parDeLosMotores(ac, this.motores, cadaUno, qDyn)
        : 0);
    // Y lo que le falta al motor del ave, que tira del morro hacia su lado.
    if (this.tocado !== null) yawMoment += leFalta * (ac.motoresA[this.tocado.motor] ?? 0);

    // Con las ruedas en el suelo, lo que manda en el cabeceo es el tren. Ver
    // `momentoDelTren`.
    this.pesoEnElMorro = 0;
    if (s.onGround) pitchMoment += this.momentoDelTren(-forceZ);

    // Ayudas que actúan como momentos y no como mandos: amortiguamiento
    // extra y un empujón para nivelar las alas cuando nadie toca nada.
    if (this.layers.extraDamping > 0) {
      const k = this.layers.extraDamping * qS;
      /*
       * El alabeo del avión, no el del aire: la ayuda frena lo que el avión
       * gira, y la ráfaga no es suya.
       *
       * **Y no con la mano llevando el alabeo**, igual que el nivelado de
       * abajo. La ayuda está para quien lleva el alerón directo —un mando de
       * juego, un joystick—, al que le quita el nervio; la mano ya pide un
       * ritmo y sostiene la inclinación, así que aquí solo frenaba el avión. En
       * Tukã le quitaba al JAZ 120 la mitad de lo que rueda a fondo, y con la
       * flecha mantenida no llegaba a enderezar en la final. Ver
       * `flight/mano.ts`.
       */
      if (controls.manoEnElAlabeo !== true)
        rollMoment -=
          ((k * 0.5 * s.rollRate * ac.wingSpan) / (2 * vRef)) * ac.wingSpan;
      pitchMoment -= k * 0.6 * qHat * ac.chord;
      yawMoment -= k * 0.9 * rHat * ac.wingSpan;
    }

    {
      /*
       * **Y con el piloto automático puesto, estas dos manos se apartan.**
       *
       * El compensador y el nivelado de abajo imitan a quien suelta la
       * palanca en un avión bien compensado, y saben que la ha soltado porque
       * el mando está cerca del centro. Con el automático puesto el mando lo
       * mueve él, y en vuelo recto lo lleva **justo ahí**, cerca del centro:
       * cada vez que su timón bajaba de ocho centésimas, entraba la otra mano
       * con su propia ley, y al subir se iba. Dos pilotos a los mandos a la
       * vez, turnándose sesenta veces por segundo. Medido con el automático
       * sosteniendo dos mil metros en el peldaño de todas las ayudas: el JAZ
       * 120 iba de 0,2 g a 1,9 g, y el JAZ 25 alabeaba a trece grados por
       * segundo en un viraje que sin ayudas lleva a cinco.
       *
       * En un avión de verdad no hay dos: quien lleva los mandos es el
       * automático, y la mano que imita a un piloto no tiene nada que hacer.
       * Las ayudas que amortiguan —las que un avión de verdad lleva como
       * amortiguador de guiñada— se quedan. Ver `ControlInputs.automatico`.
       */
      const manoDelAutomatico = controls.automatico === true;
      /*
       * Y la nivelada de los peldaños de abajo lleva la altura y nada más: el
       * compensador que sostiene la subida se aparta, pero el nivelado de
       * alas sigue, que ella no toca el alabeo. Ver `sostieneLaAltura`.
       */
      const otraLlevaLaAltura =
        manoDelAutomatico ||
        controls.sostieneLaAltura === true ||
        // Y la mano del teclado o del dedo, que ya sostiene la trayectoria que
        // se dejó, bajadas incluidas. Ver `flight/mano.ts`.
        controls.manoEnElCabeceo === true;
      // Compensador automático: mantiene **la actitud que dejaste**.
      //
      // La primera versión llevaba el morro al horizonte, y eso está mal por
      // dos motivos que se notan enseguida al jugar. Peleaba contra
      // cualquier subida que hubieras establecido —soltabas la tecla y el
      // avión se empeñaba en nivelarse—, así que costaba ganar altura y no
      // se apreciaba que subieras. Y como llevar el morro al horizonte no
      // controla la velocidad, el avión entraba igualmente en fugoide: subía
      // y bajaba, ganaba y perdía velocidad, sin estabilizarse nunca.
      //
      // Lo que hace un piloto de verdad es compensar: pone la actitud que
      // quiere y suelta, y el avión la mantiene. Eso es lo que hay aquí. Al
      // soltar el cabeceo se captura la actitud del momento y se sostiene,
      // con amortiguamiento sobre la velocidad de cabeceo para que llegue
      // sin rebotar.
      if (
        this.layers.climbHold > 0 &&
        Math.abs(controls.elevator) < 0.08 &&
        !s.onGround &&
        !otraLlevaLaAltura
      ) {
        // Se sostiene **la subida**, no la actitud del morro.
        //
        // Las dos versiones anteriores intentaron mantener el cabeceo y las
        // dos fallaron por el mismo motivo: la actitud no determina si subes.
        // Llevando el morro al horizonte, el avión peleaba contra cualquier
        // ascenso que hubieras establecido y además entraba en fugoide.
        // Capturando la actitud al soltar, cogía la foto en mitad del
        // transitorio —con el morro cayendo— y acababa descendiendo hasta el
        // suelo. Lo que el jugador percibe y quiere conservar es el ritmo de
        // ascenso, así que es eso lo que se controla.
        //
        // El objetivo se toma al soltar, tras un margen para que el avión se
        // asiente, y se sostiene con un proporcional sobre el error de
        // velocidad vertical más amortiguamiento de cabeceo.
        // El objetivo nunca es un descenso.
        //
        // Capturando la velocidad vertical tal cual, si al soltar el avión
        // bajaba un poco —cosa normalísima en pleno transitorio— la ayuda
        // memorizaba ese descenso y lo sostenía indefinidamente. El avión se
        // iba al suelo despacio y con obstinación. Al soltar, lo que se
        // memoriza es entre nivelado y subiendo: para bajar hay que empujar
        // el morro, y mientras se empuja no hay ayuda que valga.
        //
        // Salvo lo colocado, que llega ya puesto desde `reset` y no se vuelve
        // a coger aquí: una final colocada baja por su senda porque se ha
        // pedido así. Ver `InitialConditions.trayectoria`.
        if (this.trimClimb === null) {
          this.trimClimb = clamp(s.verticalSpeed, 0, 5);
          this.trimSettle = TRIM_SETTLE;
        } else if (this.trimSettle > 0) {
          this.trimSettle -= dt;
          this.trimClimb = clamp(s.verticalSpeed, 0, 5);
        }
        /*
         * **Y el compensador de quien vuela mueve lo que se sostiene.**
         *
         * Esta ayuda sostiene una subida, y el compensador que se mueve a
         * toques de flecha pide otra: sin esto se peleaban, y ganaba la ayuda.
         * Medido con media ayuda: dos centésimas de compensador, un toque,
         * cambiaban el ritmo de ascenso en veinte o treinta centímetros por
         * segundo en el JAZ 20, el JAZ 60 y el JAZ 90, que no se ve. O sea que en los peldaños con ayuda el toque
         * no hacía nada, y justo ahí es donde se pedía: «si lo pongo a bajar,
         * que lo deje fijo».
         *
         * Así que cada toque mueve **el ascenso que se sostiene** —medio metro
         * por segundo, cien pies por minuto, que es lo que da un clic de la
         * rueda de velocidad vertical de un piloto automático— y **hacia
         * abajo también**: la regla de que el objetivo nunca es un descenso
         * era para no coger por descenso un transitorio al soltar, y un toque
         * no es un transitorio, es una petición. Con tope en cinco metros por
         * segundo hacia cada lado.
         *
         * Solo los pasos pequeños: un salto grande del compensador no es
         * nadie tocándolo, es el piloto automático devolviéndolo al soltarse
         * o un vuelo nuevo, y ahí no se pide ninguna subida.
         */
        const movido =
          this.trimVisto === null ? 0 : controls.trim - this.trimVisto;
        if (movido !== 0 && Math.abs(movido) <= PASO_QUE_SE_PIDE)
          this.trimClimb = clamp(
            this.trimClimb + movido * SUBIDA_POR_COMPENSADOR,
            -SUBIDA_PEDIDA_TOPE,
            SUBIDA_PEDIDA_TOPE,
          );

        // Dos leyes que se mezclan, no un interruptor.
        //
        // La versión anterior escalaba el objetivo de ascenso con un factor
        // que iba de 0 a 1 en una banda estrecha de velocidad. Eso creaba un
        // ciclo límite justo en esa banda: al bajar de ella el objetivo se
        // anulaba, el morro caía, la velocidad subía, el objetivo volvía, el
        // morro subía, y vuelta a empezar. Es exactamente el cabeceo con la
        // velocidad yendo y viniendo que se veía volando despacio.
        //
        // Un factor que multiplica no es una realimentación: no corrige, solo
        // apaga. Así que cuando se va lento, el control **pasa a sostener la
        // velocidad** —morro abajo proporcional a lo que falte— y se mezcla
        // suavemente con el control de ascenso. Las dos leyes son estables,
        // y su mezcla también.
        /*
         * **Y «lento» es lento para este avión, no para el crucero.** Los dos
         * umbrales iban en proporción al crucero, y eso vale para los de
         * hélice —su aproximación es un sesenta por ciento del crucero— pero
         * no para un reactor, cuya aproximación es un tercio: con el JAZ 90,
         * «lento» empezaba en 92 m/s y «seguro» en 128, así que a su
         * velocidad de aproximación —75— esta ayuda creía que se iba a
         * entrar en pérdida y **le bajaba el morro a fondo**. Medido en la
         * lección de aterrizar: 42 m/s de bajada y al suelo en ocho segundos.
         *
         * Cada umbral es el menor entre el de siempre y uno atado a la
         * aproximación. En los cuatro de hélice sale casi el mismo número —lo
         * afinado no se mueve—; en los reactores baja a donde tiene que estar.
         *
         * **Y con los flaps que lleva, no con los de aterrizar.** La de
         * aproximación es la de los flaps puestos, y limpio la segura del JAZ 90
         * quedaba por debajo de su pérdida. Ver `velocidadesDeLaAyuda`.
         */
        const { lenta: floor, segura: safe } = velocidadesDeLaAyuda(ac, assisted.flaps, density);
        const shortfall = safe - speed;
        const blend = clamp(shortfall / (safe - floor), 0, 1);

        /*
         * **Y la subida se sostiene por su ángulo, no por los metros por
         * segundo.**
         *
         * Las doce centésimas por metro por segundo se afinaron con los de
         * hélice, que vuelan por debajo de sesenta metros por segundo. Un
         * metro por segundo de subida a sesenta es casi un grado de
         * trayectoria; a ciento cuarenta, menos de medio. Con la misma
         * ganancia, el reactor corregía cada metro por segundo como si fuera
         * el doble o el triple de ángulo, y un reactor tarda más que una
         * avioneta en cambiar de trayectoria cuando cambia el morro: la
         * corrección llegaba tarde y de más, y la siguiente, más tarde y más
         * de más. Medido soltando la palanca con el avión compensado y
         * nivelado a dos mil metros, en el peldaño de todas las ayudas: el
         * JAZ 90 iba solo de −1,6 g a 3,4 g, y el JAZ 120 igual.
         *
         * Por encima de `VELOCIDAD_DE_LA_AYUDA` la ganancia baja con la
         * velocidad, que es lo mismo que mandar sobre el ángulo de la
         * trayectoria: la misma firmeza en todos. Por debajo no cambia nada,
         * así que lo afinado en los de hélice sigue igual.
         */
        const climbLaw =
          (this.trimClimb - s.verticalSpeed) *
          0.12 *
          Math.min(1, VELOCIDAD_DE_LA_AYUDA / Math.max(1, speed));
        const speedLaw = -shortfall * 0.1;
        /*
         * **Y el compensador no tira hasta el avisador.**
         *
         * Sostiene la subida tirando del morro, y sin mirar el ala: con el
         * JAZ 90 a ciento noventa nudos, soltando la palanca mientras el avión
         * bajaba, tiraba hasta 12,8° y el avisador cantaba «stall, stall» una
         * treintena de veces en un vuelo —con quien vuela sin tocar nada, que
         * es justo cuando actúa esta ayuda—. Ningún piloto automático de
         * verdad hace eso: el que sostiene altura o subida tiene su tope de
         * ángulo y, si no le da, cede antes que meter el ala en pérdida.
         *
         * Así que por encima de tres grados antes del avisador ya no tira, y
         * pasado ese punto empuja en proporción. Es la regla de las tres eses
         * aplicada a una ayuda: una red que te mete en pérdida no es una red.
         *
         * **Mirando a dónde va el ángulo, no solo dónde está**, y con la
         * orden acotada. Soltando la palanca bajando a treinta metros por
         * segundo, la ley pedía casi cuatro veces el mando entero, el morro
         * subía a cuarenta y cinco grados por segundo y el ala pasaba de −4° a
         * 21° en ocho décimas: el tope llegaba tarde. Con el ángulo de dentro
         * de un cuarto de segundo y la orden en ±0,6 —lo que da la palanca de
         * un piloto automático, que tampoco tira de golpe—, llega y se queda.
         */
        const hacia = s.alpha + s.pitchRate * 0.25;
        const cerca = hacia - (umbral - 0.05);
        /*
         * **Y cerca del suelo, con empuje que sobra, se acelera subiendo.**
         *
         * Lo de arriba, por debajo de la velocidad segura, baja el morro en
         * proporción a lo que falta, y no mira dónde está el suelo. Recién
         * despegado el avión va por debajo de ella —el JAZ 20 sale a unos
         * cincuenta nudos y su segura son sesenta y siete—, así que soltando
         * la palanca la ayuda lo llevaba hacia la pista: medido en Taguato,
         * −2,6 m/s a cuatro metros; el JAZ 40, en Tukã, volvía a tocar. Con el
         * gas a tope no hace falta bajar para coger velocidad: lo que sobra de
         * empuje da para las dos cosas.
         *
         * Es lo que dice el manual de la FAA del despegue: «Upon liftoff, the
         * airplane should be flying at approximately the pitch attitude that
         * allows it to accelerate to VY», y si se deja caer el morro de más
         * «the airplane may also settle back to the runway»; y con el gas de
         * despegar «the airspeed should be controlled by making slight pitch
         * adjustments», hasta por lo menos quinientos pies sobre el terreno
         * (FAA-H-8083-3C, 2021, pp. 6-4 y 6-5).
         *
         * Así que por debajo de quinientos pies, lo que pide la ayuda para
         * coger velocidad ya no es bajar el morro en proporción, sino **una
         * subida con la mitad de lo que sobra**: la otra mitad acelera. Lo que
         * sobra es el empuje de ahora menos lo que frena el avión a un g a
         * esta velocidad, partido por el peso (`sobraParaSubir`): con el gas
         * quitado no sobra nada y la ley es la de siempre, así que la toma y
         * la bajada con poco gas siguen igual. Entre quinientos y mil pies se
         * va apagando, sin interruptor —un interruptor en una ley de
         * cabeceo es un ciclo límite—, y por encima vuelve a bajar el morro
         * lo que haga falta, que con altura de sobra es lo que protege de la
         * pérdida. Y el tope de ángulo de ataque de abajo manda sobre esto:
         * acelerar subiendo no es tirar hasta el avisador.
         *
         * Es una ley sobre la velocidad vertical, como la de la subida, y no
         * un suelo puesto encima de la otra: se probó como suelo y, con el
         * morro abajo de la ley vieja al otro lado, el 747 cabeceaba entre
         * cinco y diecisiete grados cada ocho segundos.
         */
        const pesoAhora = masaDe(ac) * GRAVITY;
        const clAUnG = pesoAhora / Math.max(1, qSSimetria);
        const sobraParaSubir =
          (thrust -
            motoresQueFrenan -
            qSSimetria *
              (cd -
                inducida -
                enPerdida +
                // A un g, con el mismo suelo debajo que la de ahora.
                ((clAUnG * clAUnG) / (Math.PI * aspectRatio * a.oswald)) *
                  suelo.inducida)) /
          pesoAhora;
        const cercaDelSuelo =
          clamp(
            (SE_SUELTA_DEL_SUELO - s.heightAboveGround) /
              (SE_SUELTA_DEL_SUELO - SUBE_SIN_BAJAR_HASTA),
            0,
            1,
          ) * clamp(sobraParaSubir / SOBRA_ENTERA, 0, 1);
        /*
         * **Con el tirón que le falta al compensador.** El avión sale
         * compensado para la subida inicial (`compensadorDeDespegue`), más
         * deprisa de lo que va recién despegado, y soltado busca esa velocidad
         * bajando el morro: «some back-elevator pressure may be required to
         * hold this attitude until the proper climb speed is established»
         * (FAA-H-8083-3C, p. 6-5). Ese tirón es el timón que sostiene el avión
         * a esta velocidad menos el que lleva (`timonQueSostiene`), y lo pone
         * esta mano en la parte que le toque al peldaño. Sin él, la ley de
         * arriba lo pedía a base de error: con la ayuda a medias de Taguato el
         * JAZ 20 se quedaba bajando medio metro por segundo antes de subir.
         */
        const tironQueFalta =
          timonQueSostiene(
            ac,
            speed * Math.sqrt(density / SEA_LEVEL_DENSITY),
            assisted.flaps,
          ) - timon;
        const leyDelSuelo =
          (PARTE_PARA_SUBIR * sobraParaSubir * speed - s.verticalSpeed) *
            0.12 *
            Math.min(1, VELOCIDAD_DE_LA_AYUDA / Math.max(1, speed)) +
          tironQueFalta;
        const deLaVelocidad =
          speedLaw * (1 - cercaDelSuelo) + leyDelSuelo * cercaDelSuelo;
        const law = Math.min(
          clamp(climbLaw * (1 - blend) + deLaVelocidad * blend, -1, 1),
          cerca > 0 ? -cerca * 2 : Infinity,
        );

        // La ganancia se programa con la velocidad. El momento disponible
        // crece con la presión dinámica —o sea con el cuadrado de la
        // velocidad— mientras que la inercia del avión no cambia, así que una
        // ganancia fija que va bien a treinta metros por segundo oscila a
        // sesenta. Se normaliza contra la velocidad de crucero, que es como
        // programan la ganancia los pilotos automáticos de verdad.
        const reference = ac.cruiseSpeed * ac.cruiseSpeed;
        const schedule = Math.min(1, reference / (speed * speed + 1));
        const authority =
          this.layers.climbHold * qS * a.cmElevator * ac.chord * schedule;
        pitchMoment += authority * (law - s.pitchRate * 0.75);
        // Lo que empuja esta mano, contado en timón. Ver `timonAhora`.
        timonDeAhora +=
          (this.layers.climbHold * schedule * (law - s.pitchRate * 0.75) * qS) /
          Math.max(1, qSSimetria);
      } else {
        // Con el mando en la mano, no hay compensador que valga.
        this.trimClimb = null;
        this.trimSettle = 0;
      }
      this.trimVisto = controls.trim;

      // Nivelado automático al soltar los alerones. La ganancia está atada a
      // la autoridad del propio alerón: la versión anterior usaba 0,35 fijo,
      // que con el alerón ya corregido sería casi el doble del mando a fondo
      // y devolvería las alas de un latigazo. Así, a treinta grados de
      // alabeo empuja aproximadamente como medio mando.
      if (
        this.layers.wingLeveller > 0 &&
        Math.abs(controls.aileron) < 0.08 &&
        !s.onGround &&
        !manoDelAutomatico &&
        // Ni con la mano sosteniendo la inclinación que se dejó: el nivelado
        // la deshacía al soltar la tecla. Ver `flight/mano.ts`.
        controls.manoEnElAlabeo !== true
      ) {
        rollMoment -=
          this.layers.wingLeveller *
          qS *
          a.clAileron *
          ac.wingSpan *
          levelling(this.bankAngle());
      }
    }

    /*
     * El timón que sostiene el avión, **promediado**: el de quien vuela, el
     * compensador y lo que empuje la ayuda, pasado por un filtro de dos
     * segundos. Promediado porque lo que tiene que coger el automático es el
     * timón con el que el avión vuela, no el de un instante: con el avión
     * cabeceando, el de un instante es la cresta o el valle. Ver `timonAhora`.
     *
     * Era cuando el automático no recordaba nada y su primera orden era la
     * que cogía. Desde H57b engancha con el del paso (`timonDelPaso`) y su
     * primera orden es ésa, así que coger la cresta no es un salto: es donde
     * está el timón, y el amortiguador del automático para el cabeceo. Y el
     * promedio sí era un salto en cuanto alguien soltaba la palanca: de 0,36
     * a 0,48 en el primer fotograma. Subiendo quieto, los dos se apartan una
     * centésima. Lo sigue leyendo la mano de los peldaños de abajo.
     */
    this.timonQueSostiene +=
      (timonDeAhora - this.timonQueSostiene) * Math.min(1, dt / 2);
    // Y el de este paso, sin promediar: donde está la superficie. Ver `timonDelPaso`.
    this.timonDelUltimoPaso = timonDeAhora;

    // ── Traslación ─────────────────────────────────────────────────────
    this.force
      .copy(this.forward)
      .multiplyScalar(forceX)
      .addScaledVector(this.right, forceY)
      .addScaledVector(this.down, forceZ);
    this.force.y -= masaDe(ac) * GRAVITY;

    // Factor de carga: lo que siente el piloto, sin contar gravedad ni
    // empuje. Es la componente de la fuerza aerodinámica hacia su cabeza.
    s.loadFactor = -forceZ / (masaDe(ac) * GRAVITY);

    s.velocity.addScaledVector(this.force, dt / masaDe(ac));
    s.position.addScaledVector(s.velocity, dt);

    // ── Rotación ───────────────────────────────────────────────────────
    // Ecuaciones de Euler: los términos cruzados son los que hacen que un
    // avión en alabeo rápido guiñe solo. Se notan poco pero están.
    const { xx, yy, zz } = ac.inertia;
    const p = s.rollRate;
    const qq = s.pitchRate;
    const r = s.yawRate;
    s.rollRate += (dt * (rollMoment + (yy - zz) * qq * r)) / xx;
    s.pitchRate += (dt * (pitchMoment + (zz - xx) * r * p)) / yy;
    s.yawRate += (dt * (yawMoment + (xx - yy) * p * qq)) / zz;

    this.omega
      .copy(this.forward)
      .multiplyScalar(s.rollRate)
      .addScaledVector(this.right, s.pitchRate)
      .addScaledVector(this.down, s.yawRate);

    // Integración del cuaternión: dq/dt = ½·ω·q, con ω en ejes de mundo.
    this.spin.set(
      this.omega.x * dt * 0.5,
      this.omega.y * dt * 0.5,
      this.omega.z * dt * 0.5,
      1,
    );
    s.orientation.premultiply(this.spin).normalize();

    this.resolveGround(dt, assisted);
  }

  // ── Suelo ─────────────────────────────────────────────────────────────

  private resolveGround(dt: number, controls: ControlInputs): void {
    const s = this.state;
    const ac = this.aircraft;
    const terrain = this.ground(s.position.x, s.position.z);
    /*
     * **Y el apoyo, en las ruedas principales con el cabeceo de ahora**, no a
     * `gearHeight` del suelo con el morro donde esté. Al rotar el avión gira
     * sobre esas ruedas y su centro sube: el 747 a sus 12,5° lleva el centro
     * de gravedad 0,76 m más alto que parado. Ver `flight/apoyo.ts`.
     *
     * De ahí cuelga todo lo de abajo: la holgura del palmo se mide desde las
     * ruedas de verdad, el trinquete pega el avión a ese nivel, y al tocar en
     * la recogida tocan primero las principales.
     */
    this.updateBodyAxes();
    const wheelLevel = terrain + this.alturaDelApoyo();

    /*
     * **Un palmo de holgura antes de dar el avión por volando.**
     *
     * Sin ella, cualquier empujón de la sustentación de unos centímetros
     * apagaba `onGround`, y con él se encendía el aviso «¡el suelo, subí!»
     * mientras se rodaba tan tranquilo. Se dijo tal cual: «claro que estoy en
     * el suelo, estoy rodando». Y también: «de nada que le soples se levanta».
     *
     * El modelo sencillo ya lo tenía —un metro entero, ver `PEGADO_AL_SUELO`
     * en `arcade.ts`— y por eso el peldaño de los pequeños se comportaba y este
     * no. Aquí basta con un palmo, porque este modelo sí tiene que dejar
     * despegar de verdad en cuanto se rota.
     */
    if (s.position.y > wheelLevel + PEGADO_AL_SUELO) {
      s.onGround = false;
      this.rapidezEnTierra = null;
      this.frenoDeAhora = 0;
      return;
    }

    const wasFlying = !s.onGround;
    s.onGround = true;
    /*
     * **Se pega al suelo solo si está por debajo**, no si está dentro de la
     * holgura.
     *
     * Pegarlo siempre es un trinquete: dentro del palmo de holgura, cada paso
     * lo devolvía al suelo, así que la subida no podía acumularse y el avión
     * no despegaba nunca. Lo cazó la prueba de la carrera de despegue, y es el
     * segundo trinquete del mismo arreglo — el primero fue anular la velocidad
     * de subida en cada paso, con el mismo resultado y por el mismo motivo.
     *
     * Es lo que ya hacía el modelo sencillo: allí solo se pega cuando no se
     * está pidiendo subir.
     *
     * **Y por eso se pega también hacia abajo mientras no se esté subiendo.**
     * Sin eso, en una pista con pendiente el suelo se escapa por debajo y el
     * avión se queda flotando: en tierra la velocidad vertical negativa se
     * anula —justo aquí abajo—, así que las ruedas no pueden seguir una pista
     * que baja. Cuando el hueco pasa del palmo de holgura, `onGround` se apaga;
     * la gravedad lo baja, vuelve a tocar, y otra vez, todo el recorrido.
     *
     * Medido en La Palma, cuya pista cae dos metros en los cuatrocientos de la
     * frenada: **el 73 % de la frenada con la bandera en el aire**, y como el
     * freno solo frena si la rueda toca, frenaba a 0,09 g en vez de a los 0,32
     * que frena en llano. El banco lo contaba como «este avión frena mal», y
     * frenaba perfectamente: no tocaba el suelo.
     *
     * La condición es «mientras no se esté subiendo», y no «siempre», porque
     * siempre vuelve a ser el trinquete que impedía despegar.
     */
    if (s.position.y < wheelLevel || s.velocity.y <= 0)
      s.position.y = wheelLevel;

    if (wasFlying) {
      /*
       * **Contra la pista, no contra el variómetro** (H63): lo que se le
       * acerca el suelo, que es lo que carga el tren y lo que rompe. En una
       * pista llana es `−velocity.y` bit a bit. Ver `caidaContraElSuelo`.
       */
      const sinkRate = caidaContraElSuelo(
        this.ground,
        s.position.x,
        s.position.z,
        s.velocity.x,
        s.velocity.y,
        s.velocity.z,
      );
      s.touchdownSinkRate = Math.max(0, sinkRate);
      const limit = this.crashLimits();
      if (sinkRate > limit.sink || Math.abs(this.bankAngle()) > limit.bank) {
        s.crashed = true;
      }
    }

    /*
     * Solo se anula la velocidad hacia abajo, y **la de subida se respeta**.
     *
     * Hubo un intento de anular también la de subida por debajo de medio metro
     * por segundo, para que el tren se comiera los botes pequeños. Lo cazó la
     * prueba de la carrera de despegue: la velocidad se reconstruye de las
     * fuerzas en cada paso, así que anularla cada paso impide que se acumule y
     * el avión no despegaba **nunca**. La holgura de posición de arriba hace el
     * mismo trabajo sin ese efecto: mientras el bote quepa en un palmo, el
     * avión sigue en el suelo; en cuanto la subida es de verdad, sale.
     */
    if (s.velocity.y < 0) s.velocity.y = 0;

    // Ruedas: mucho rozamiento lateral —por eso un avión en tierra va donde
    // apunta— y poco longitudinal hasta que se pisan los frenos.
    this.updateBodyAxes();
    const lateral = s.velocity.dot(this.right);
    s.velocity.addScaledVector(this.right, -lateral * Math.min(1, dt * 9));
    /*
     * **Y la panza que roza por delante tuerce el avión**, si no va en el eje
     * de su camino. El roce tira de la nariz hacia atrás del camino, y con la
     * nariz por delante del centro eso la aparta más: si toca torcido, se
     * tuerce más, y hay que sostenerlo con el pie. Es lo contrario de una
     * flecha, que lleva el roce detrás. Recto, no hace nada. Ver el ADR 0014,
     * enmienda H70.
     */
    const rapidezSobreElSuelo = s.velocity.length();
    if (this.pesoEnElMorro > 0 && rapidezSobreElSuelo > 0.5) {
      const brazo = ac.batalla - ac.mainWheelsAft;
      const tuerce = (ROCE_DE_LA_PANZA * this.pesoEnElMorro * brazo * lateral) / rapidezSobreElSuelo;
      s.yawRate -= (tuerce / ac.inertia.zz) * dt;
    }

    /*
     * **Y el freno frenaba como el de un coche.**
     *
     * Cero coma cincuenta y cinco de coeficiente son cinco metros y medio por
     * segundo al cuadrado sobre todo el peso: desde velocidad de aproximación,
     * parada en noventa y cuatro metros. Una Cessna necesita ciento setenta y
     * cinco. Se bajó a veintiocho centésimas para los seis, y seguía siendo un
     * coche por otro lado: frenaba **sobre todo el peso desde el primer
     * instante**, y un avión que toca todavía lo lleva casi entero en el ala.
     *
     * Ahora el freno muerde sobre **lo que cargan las ruedas** —el peso menos
     * lo que sostiene el aire, que es la cuenta de `carrera.ts` desde
     * siempre—, con el coeficiente de su tipo y de la pista seca o mojada. Al
     * tocar un reactor sin frenos de tierra eso es poco, y es la lección: para
     * eso salen. Ver `flight/frenada.ts`.
     */
    /*
     * **Y el suelo tiene tipo.** Dos centésimas sobre asfalto, cinco sobre
     * hierba segada, nueve sobre campo: son los coeficientes de rodadura de
     * verdad, y de ellos sale que una pista de hierba pida más carrera de
     * despegue que una de asfalto. Ver `world/superficie.ts`.
     */
    const longitudinal = s.velocity.dot(this.forward);
    const rapidez = Math.abs(longitudinal);
    const apoyado = Math.max(0, masaDe(ac) * GRAVITY - this.apoyoDelAire);
    const mu = coeficienteDeFrenado(
      ac.frenos,
      this.superficie,
      this.pistaMojada,
      rapidez,
    );
    /*
     * **Y la reversa, que frena sin tocar las ruedas.**
     *
     * No existía: «cuando tomo tierra no tengo reversa». Se suma a la rodadura
     * porque en un avión es otra fuerza y no un freno mejor — y por eso es la
     * que salva una pista mojada, donde la rueda patina y el chorro no.
     *
     * Y se apaga sola por debajo de treinta nudos, como en un avión de verdad:
     * más despacio deja de frenar y empieza a levantar del suelo lo que haya y
     * a metérselo al motor. Ver `REVERSA_HASTA` en `frenada.ts`.
     */
    const reversa =
      tieneReversa(ac) && controls.reversa > 0 && rapidez > REVERSA_HASTA
        ? Math.min(1, controls.reversa) * ac.maxThrust * REVERSA_DA
        : 0;
    /*
     * **Y la rueda reventada, si la hay**: lo que roza y lo que deja de frenar
     * con el pie a fondo, N. Sin ella, `null`, y la cuenta de abajo es la de
     * siempre bit a bit. Ver `ponerNeumaticoReventado`.
     */
    const reventado = this.loDelReventado(apoyado, mu, rapidez);
    /*
     * **Y el autofreno**, que pide una deceleración y no un pie: mira lo que
     * ya frena el avión sin él —el aire, la cuesta, el motor, lo que se ha
     * perdido desde el paso anterior— y aprieta lo que falta. Si el pie pisa
     * más, manda el pie.
     */
    let freno = Math.max(0, Math.min(1, controls.brakes));
    const objetivo = controls.autofreno ?? 0;
    if (objetivo > 0) {
      const porElAire =
        this.rapidezEnTierra !== null ? (this.rapidezEnTierra - rapidez) / dt : 0;
      const sinFreno =
        porElAire + (ROZAMIENTO[this.superficie] * apoyado + reversa) / masaDe(ac);
      const aFondo = sinFreno + (mu * apoyado) / masaDe(ac);
      freno = Math.max(
        freno,
        reventado === null
          ? frenoDelAutofreno(objetivo, sinFreno, aFondo)
          : frenoDelAutofreno(
              objetivo,
              sinFreno + reventado.roce / masaDe(ac),
              aFondo + (reventado.roce - reventado.frenoQueFalta) / masaDe(ac),
            ),
      );
    }
    this.frenoDeAhora = freno;
    /*
     * **Y la panza del morro, si apoya sin su rueda**: lo que carga no va en
     * ruedas que rueden, va arrastrándose, y frena con su roce. Las
     * principales frenan sobre lo que queda.
     */
    const enLaPanza = Math.min(apoyado, this.pesoEnElMorro);
    let frena =
      ((ROZAMIENTO[this.superficie] + mu * freno) * (apoyado - enLaPanza) +
        ROCE_DE_LA_PANZA * enLaPanza +
        reversa) /
      masaDe(ac);
    /*
     * **Y la reventada tuerce el avión**, porque va a un lado del eje: el roce
     * tira hacia ella, y el freno que falta tira hacia la otra pata, que frena
     * entera. Rodando y con poco freno manda el roce —el avión se va hacia el
     * lado de la reventada—; a fondo, manda la pata sana y se va hacia el
     * otro. Por eso se frena suave y parejo, y el pie sostiene el eje.
     */
    if (reventado !== null) {
      const falta = reventado.frenoQueFalta * freno;
      frena += (reventado.roce - falta) / masaDe(ac);
      const par = this.ladoReventado * reventado.brazo * (reventado.roce - falta);
      s.yawRate += ((Math.sign(longitudinal) * par) / ac.inertia.zz) * dt;
    }
    s.velocity.addScaledVector(
      this.forward,
      -Math.sign(longitudinal) * Math.min(rapidez, frena * dt),
    );

    // Rozamiento estático: con el freno pisado y a paso de peatón, el avión
    // se queda quieto de verdad en vez de reptar contra el ralentí del
    // motor. Va después de la fricción y del empuje, que es donde importa:
    // cada paso el motor empuja un poquito y esto lo anula.
    if (freno > 0.5 && rapidez < STATIC_GRIP) {
      s.velocity.addScaledVector(this.forward, -s.velocity.dot(this.forward));
    }
    this.rapidezEnTierra = Math.abs(s.velocity.dot(this.forward));

    // El tren de aterrizaje no deja alabear ni guiñar libremente. El cabeceo
    // sí se respeta: es lo que permite rotar en el despegue.
    const settle = Math.min(1, dt * 6);
    s.rollRate *= 1 - settle;
    s.yawRate *= 1 - settle * 0.5;
    this.levelWings(settle);
    this.constrainGroundPitch();
    // Guiñada en tierra proporcional al timón y a la velocidad: dirigible
    // rodando, inútil parado, como una rueda de morro de verdad.
    // Timón: dirige más cuanto más deprisa se va, porque es aerodinámico.
    // Con el tope de lo que agarran las ruedas: ver `giroDelPedal`. El 1,5 es
    // lo que se come el freno de guiñada de arriba —cada paso quita la mitad
    // de `settle`—, para que el giro que se asienta sea el de la cuenta.
    s.yawRate +=
      controls.rudder * 1.5 * giroDelPedal(Math.abs(longitudinal)) * settle;
    /*
     * Y la rueda de morro, que es al revés que el timón: manda a paso de
     * peatón y se queda sin autoridad al coger carrerilla. Va con el mando de
     * alabeo porque es el que la mano busca para girar, y en el suelo las alas
     * no sirven de nada. Sin esto no se podía dar la vuelta en la pista tras
     * abortar un despegue: el avión seguía recto hiciera uno lo que hiciera.
     *
     * Plena hasta ocho metros por segundo y apagándose a los veintiocho, que
     * es cuando toma el relevo el timón —el de quien vuela, o en los peldaños
     * con ayuda el automático, que sigue dando lo que pide el volante: ver
     * `timonEnTierra`—. Decayendo desde parado, a treinta por
     * hora el radio de giro se iba a cincuenta y cinco metros y las curvas de
     * las calles de rodaje no se podían tomar. Medido.
     *
     * **Y lo que manda es la geometría del avión, no un número igual para
     * todos.** Ver `esteGiro`.
     */
    // Sin rueda de morro, nada que gire con ella: queda el timón.
    const nosewheel = this.topeDelMorro() !== 0 ? 0 : autoridadDeLaRueda(longitudinal);
    s.yawRate +=
      (esteGiro(ac, controls.aileron * nosewheel, longitudinal) - s.yawRate) *
      settle;
  }

  /**
   * **El par que hace el tren sobre el cabeceo**, con las ruedas en el suelo,
   * en N·m. Positivo: morro arriba.
   *
   * ## Lo que faltaba
   *
   * En el suelo, el cabeceo lo movían solo los momentos del aire, y lo único
   * que los paraba eran los dos topes de `constrainGroundPitch`. O sea que un
   * avión parado era una veleta en cabeceo: cualquier par de morro arriba, por
   * pequeño que fuera, lo llevaba hasta el tope de cola. Medido con el JAZ 90
   * en el puesto de Gando y veinte nudos de viento: **9,2° de morro arriba**,
   * la rueda de morro a metro y medio del suelo y las principales hundidas
   * dieciocho centímetros. Y con viento de cara, cinco grados — porque el
   * `cm0` de cualquier ficha es positivo.
   *
   * Un avión parado no se levanta con el viento por lo que se levanta un avión
   * que rota: **el peso**. El centro de gravedad va por delante de las ruedas
   * principales, así que el peso es un par de morro abajo alrededor de ellas,
   * y la pata de morro lo sostiene. Para levantar el morro, el aire tiene que
   * vencer ese par, y eso es exactamente lo que se hace al rotar: tirar a la
   * velocidad a la que el timón puede con él.
   *
   * ## Las piezas
   *
   * - **El peso** que todavía cargan las ruedas —el del avión menos lo que ya
   *   sostiene el ala— por el brazo que va del centro de gravedad a las
   *   principales. En un triciclo van detrás y es morro abajo; en el de rueda
   *   de cola van delante y es morro arriba, que es por lo que se sienta.
   * - **La pata de morro** del triciclo, que empuja cuando toca y no tira
   *   nunca: cargada de serie con ese mismo par —de modo que en reposo el avión
   *   queda a nivel, que es la actitud en la que están dibujadas sus tres
   *   ruedas—, con muelle para comprimirse y amortiguador para no rebotar. El
   *   muelle se elige para que el doble de la carga de serie la lleve justo
   *   hasta el tope de `minGroundPitch`, que es lo que se le admite a la pata.
   * - **La rueda de cola**, en el que la lleva: una ballesta que empieza a
   *   cargar `RECORRIDO_DE_LA_COLA` antes de su actitud en tres puntos y llega
   *   a ella con todo el peso encima. Parado, el avión descansa en sus tres
   *   ruedas con el morro arriba; según el ala le quita peso, la ballesta se
   *   estira, y cuando el aire de la cola puede más que lo que queda de peso,
   *   la cola se levanta. Ver `actitudEnTresPuntos`.
   *
   * ## El brazo, el de su tren y no el de una regla
   *
   * Era una décima de la batalla para todos —la carga en el morro que Raymer
   * pide a un triciclo, entre el 8 y el 15 %— y el biplano, de rueda de cola,
   * hacía con ella de triciclo: descansaba a nivel con la rueda de cola casi
   * un metro en el aire. Ahora es **la distancia del centro de gravedad al
   * centro del tren principal**, `mainGearAft`, la de su dibujo, y con el
   * cabeceo: la reacción del suelo sube por el punto en el que tocan las
   * ruedas, y al levantar el morro ese punto se acerca a la vertical del
   * centro —un `gearHeight·sen θ`— en el triciclo, y se aleja en el de rueda
   * de cola. Es lo que hace que un avión largo rote cada vez más ligero, y que
   * un patín de cola con la cola baja tire de ella hacia el suelo.
   */
  private momentoDelTren(sustentacion: number): number {
    const s = this.state;
    const ac = this.aircraft;
    const cabeceo = Math.asin(clamp(this.forward.y, -1, 1));
    const peso = masaDe(ac) * GRAVITY;
    const apoyado = Math.max(0, peso - sustentacion);
    let par = -apoyado * brazoDelTren(ac, cabeceo);
    const tresPuntos = ac.actitudEnTresPuntos;
    if (tresPuntos !== undefined) {
      const recorrido = RECORRIDO_DE_LA_COLA / Math.max(1, ac.batalla);
      const desde = tresPuntos - recorrido;
      if (cabeceo > desde) {
        const muelle = (peso * -brazoDelTren(ac, tresPuntos)) / recorrido;
        const amortiguador =
          2 * AMORTIGUA_LA_PATA * Math.sqrt(muelle * ac.inertia.yy);
        par -= Math.max(0, muelle * (cabeceo - desde) + amortiguador * s.pitchRate);
      }
    } else {
      /*
       * **Y sin la rueda de morro, lo que para el morro es la panza**, más
       * abajo: el mismo apoyo cargado de serie, pero en `morroSinRueda` y con
       * el recorrido de una chapa que roza y no el de una pata con aceite.
       * Hasta llegar ahí no hay nada debajo: lo que sostiene el morro es el
       * timón de profundidad contra el peso, y cuando la velocidad ya no le da
       * para ganarle, el morro baja. Es lo que cuenta el manual de la FAA
       * (FAA-H-8083-3C, p. 18-12). Ver el ADR 0014, enmienda H70.
       */
      const tope = this.topeDelMorro();
      if (cabeceo <= tope) {
        const sinRueda = tope !== 0;
        const brazo = brazoDelTren(ac, tope);
        const recorrido = sinRueda
          ? RECORRIDO_DE_LA_PANZA
          : Math.max(0.002, -ac.minGroundPitch);
        const muelle = (peso * brazo) / recorrido;
        const amortiguador =
          2 * AMORTIGUA_LA_PATA * Math.sqrt(muelle * ac.inertia.yy);
        const empuja = Math.max(
          0,
          apoyado * brazo - muelle * (cabeceo - tope) - amortiguador * s.pitchRate,
        );
        par += empuja;
        // La primera vez: a qué velocidad y cómo de deprisa bajaba, por la batalla.
        if (sinRueda && this.morroPosado === null)
          this.morroPosado = {
            velocidad: s.airspeed,
            bajada: Math.max(0, -s.pitchRate) * ac.batalla,
          };
        /*
         * Lo que carga la panza, N: el par que hace, por lo que va por delante
         * del centro el sitio de la rueda que falta. La panza que toca va algo
         * más adelante, y la cuenta del roce no lo necesita más fino.
         */
        if (sinRueda) this.pesoEnElMorro = empuja / Math.max(0.5, ac.batalla - ac.mainWheelsAft);
      }
    }
    return par;
  }

  /**
   * **Si la rueda de morro no ha salido**, que es el ejercicio del tren de
   * morro (#90): lo pone el juego mientras la pata de morro siga en su pozo
   * con las principales fuera. Solo cambia algo en el avión que lleva
   * `morroSinRueda` en su ficha. Ver el ADR 0014, enmienda H70.
   */
  ponerSinRuedaDeMorro(sin: boolean): void {
    this.sinRuedaDeMorro = sin;
    if (!sin) this.morroPosado = null;
  }

  private sinRuedaDeMorro = false;

  /**
   * Lo que carga la panza del morro sobre la pista en este paso, N: cero con
   * la rueda, o con el morro todavía arriba. Lo apunta `momentoDelTren`, y lo
   * mira `resolveGround` para el roce.
   */
  private pesoEnElMorro = 0;

  /**
   * **Cómo llegó el morro a la pista** la primera vez sin su rueda: la
   * velocidad del avión, m/s verdaderos, y lo deprisa que bajaba la panza,
   * m/s. `null` mientras no ha llegado. Lo lee el banco.
   */
  morroPosado: { readonly velocidad: number; readonly bajada: number } | null = null;

  /** Si la panza del morro está ahora sobre la pista. */
  get morroEnLaPista(): boolean {
    return this.pesoEnElMorro > 0;
  }

  /**
   * **Una rueda principal reventada**, que es el ejercicio del reventón (#90):
   * de qué lado, −1 la pata izquierda, 1 la derecha y 0 ninguna. Lo pone el
   * juego en cada paso desde que revienta, y solo cambia algo en el avión que
   * lleva `ruedasPrincipales` en su ficha. Ver el ADR 0014, enmienda H74.
   */
  ponerNeumaticoReventado(lado: -1 | 0 | 1): void {
    this.ladoReventado = this.aircraft.ruedasPrincipales ? lado : 0;
  }

  /** El lado de la reventada: −1, 0 o 1. */
  get neumaticoReventado(): -1 | 0 | 1 {
    return this.ladoReventado;
  }

  private ladoReventado: -1 | 0 | 1 = 0;

  /**
   * **Lo que hace la rueda reventada ahora mismo**: lo que roza, sobre lo que
   * carga su pata —la mitad de lo que apoya—, y lo que deja de frenar con el
   * freno a fondo, que es el freno de una rueda: «loss of braking force from
   * one wheel» (*Takeoff Safety Training Aid*, p. 2.26). `null` sin reventada
   * o con el avión quieto.
   */
  private loDelReventado(
    apoyado: number,
    mu: number,
    rapidez: number,
  ): { readonly roce: number; readonly frenoQueFalta: number; readonly brazo: number } | null {
    const ruedas = this.aircraft.ruedasPrincipales;
    if (this.ladoReventado === 0 || !ruedas || rapidez < STATIC_GRIP) return null;
    return {
      roce: (ROCE_DEL_REVENTADO * apoyado) / 2,
      frenoQueFalta: (mu * apoyado) / ruedas.cuantas,
      brazo: ruedas.mediaVia,
    };
  }

  /** El cabeceo al que para el morro: el de la pata, o el de la panza sin ella. */
  private topeDelMorro(): number {
    const sin = this.aircraft.morroSinRueda;
    return this.sinRuedaDeMorro && sin !== undefined ? sin : 0;
  }

  /**
   * Mantiene el cabeceo dentro de lo que permite el tren de aterrizaje.
   *
   * Con las ruedas en el suelo el avión no puede apuntar donde quiera: por
   * arriba lo frena la cola y por abajo la rueda de morro. Es lo que obliga
   * a acelerar hasta la velocidad de rotación en vez de despegar tirando de
   * la palanca desde parado.
   */
  private constrainGroundPitch(): void {
    const s = this.state;
    this.updateBodyAxes();
    const pitch = Math.asin(clamp(this.forward.y, -1, 1));
    const max = this.aircraft.maxGroundPitch;
    /*
     * **Y el de abajo también sale de la ficha, que era un número para todos.**
     *
     * Estaba escrito aquí, `-0.035`, o sea dos grados para los seis. Dos
     * grados en una avioneta de ocho metros son diez centímetros de pata; en
     * un reactor de treinta y uno, treinta y siete — y eso no es una pata
     * comprimiéndose, es la rueda de morro dentro del asfalto. Medido con el
     * avión parado: el JAZ 90 hundido 0,37 m y el JAZ 120, 0,20.
     *
     * Ver `minGroundPitch`, donde está la cuenta de la que sale cada uno.
     */
    const tope = this.topeDelMorro();
    const min = tope !== 0 ? tope - RECORRIDO_DE_LA_PANZA : this.aircraft.minGroundPitch;

    if (pitch > max) {
      this.rotateAboutMainWheels(max - pitch);
      if (s.pitchRate > 0) s.pitchRate = 0;
    } else if (pitch < min) {
      this.rotateAboutMainWheels(min - pitch);
      if (s.pitchRate < 0) s.pitchRate = 0;
    }
  }

  /** La altura del centro de gravedad sobre las ruedas principales con el cabeceo de ahora. */
  private alturaDelApoyo(): number {
    return alturaSobreLasRuedas(this.aircraft, Math.asin(clamp(this.forward.y, -1, 1)));
  }

  /**
   * Gira el avión sobre sus ruedas principales, que se quedan donde están: el
   * tope de cola y el de la pata de morro son del tren, y un tren que para el
   * giro no levanta ni hunde las ruedas que lo paran. Ver `flight/apoyo.ts`.
   */
  private rotateAboutMainWheels(angle: number): void {
    const antes = this.alturaDelApoyo();
    this.rotateAboutRight(angle);
    this.state.position.y += this.alturaDelApoyo() - antes;
  }

  /** Gira el avión alrededor de su eje transversal. Positivo: morro arriba. */
  private rotateAboutRight(angle: number): void {
    this.spin.setFromAxisAngle(this.right, angle);
    this.state.orientation.premultiply(this.spin).normalize();
    this.updateBodyAxes();
  }

  /**
   * Cuánto falta para llegar al suelo, siguiendo la trayectoria actual.
   *
   * Se muestrea el terreno unos segundos por delante en vez de dividir
   * altura entre velocidad de descenso. La diferencia importa: volando en
   * horizontal contra una ladera no se está bajando nada, y una cuenta
   * basada solo en el descenso no avisa hasta que ya es tarde. Fue
   * exactamente lo que pasó en las pruebas — un viraje cerrado a baja cota
   * terminaba en rotura sin un solo aviso previo.
   *
   * Se ignora la gravedad en la extrapolación: a estas escalas de tiempo
   * cambia poco y ahorra integrar una trayectoria entera cada fotograma.
   */
  private timeToImpact(): number {
    const s = this.state;
    if (s.onGround || s.velocity.lengthSq() < 1)
      return Number.POSITIVE_INFINITY;

    for (const t of LOOKAHEAD_SECONDS) {
      const x = s.position.x + s.velocity.x * t;
      const y = s.position.y + s.velocity.y * t;
      const z = s.position.z + s.velocity.z * t;
      if (y <= this.ground(x, z) + this.aircraft.gearHeight) return t;
    }
    return Number.POSITIVE_INFINITY;
  }

  /**
   * Hasta dónde aguanta el avión antes de romperse.
   *
   * Escalan con la ayuda de vuelo porque antes no lo hacían: los umbrales
   * eran fijos y en Arcade te estrellabas exactamente igual que en Piloto,
   * lo cual vacía de sentido el modo. En Arcade se aguantan quince metros
   * por segundo de descenso y casi sesenta grados de alabeo en la toma; en
   * Piloto, seis y veintinueve, que es lo que de verdad rompe un tren.
   */
  private crashLimits(): { sink: number; bank: number } {
    return {
      sink: CRASH_SINK_RATE + this.layers.crashTolerance * 14,
      bank: CRASH_BANK + this.layers.crashTolerance * 1.9,
    };
  }

  /** Endereza las alas girando alrededor del eje longitudinal. */
  private levelWings(amount: number): void {
    const bank = this.bankAngle();
    if (Math.abs(bank) < 1e-4) return;
    this.spin.setFromAxisAngle(this.forward, -bank * amount);
    this.state.orientation.premultiply(this.spin).normalize();
  }

  // ── Utilidades ────────────────────────────────────────────────────────

  private updateBodyAxes(): void {
    const q = this.state.orientation;
    this.forward.copy(FORWARD_LOCAL).applyQuaternion(q);
    this.right.copy(RIGHT_LOCAL).applyQuaternion(q);
    this.down.copy(DOWN_LOCAL).applyQuaternion(q);
  }

  /**
   * Ángulo de alabeo respecto al horizonte, rad. **Positivo a la derecha**,
   * en el mismo sentido que `rollRate` y que el mando de alerones.
   *
   * El signo importa mucho más de lo que parece. La primera versión devolvía
   * el contrario —con alerón a la derecha el avión rodaba a la derecha pero
   * esta función decía menos sesenta grados— y eso invertía en silencio las
   * dos cosas que la usan: el nivelado automático empujaba *hacia* el
   * alabeo en vez de contra él, y el enderezado en tierra igual. De ahí que
   * bastara rozar una flecha para no poder recuperar la horizontal nunca.
   *
   * El ala derecha por debajo del horizonte es alabeo a la derecha, y con
   * ella el eje transversal apunta hacia abajo: de ahí el signo del primer
   * argumento.
   */
  private bankAngle(): number {
    this.updateBodyAxes();
    return Math.atan2(-this.right.y, -this.down.y);
  }

  /**
   * Aplica las ayudas de pilotaje sobre los mandos antes de que lleguen a
   * la aerodinámica. Con `assist` a 0 devuelve los mandos tal cual.
   */
  private applyAssist(
    controls: ControlInputs,
    alpha: number,
    beta: number,
    dt: number,
    qS: number,
  ): ControlInputs {
    const { autoRudder, stallProtection } = this.layers;
    if (autoRudder <= 0 && stallProtection <= 0) return controls;

    // Timón automático: mantiene la bola centrada. Es lo que separa un viraje
    // que se siente bien de uno que da tumbos, y ningún crío va a pisar
    // pedales.
    //
    // La corrección va **con** el derrape, no contra él. Derrape positivo es
    // viento entrando por la derecha, y enderezar significa llevar el morro
    // hacia ese viento, o sea pie derecho: el mismo sentido en el que ya
    // empuja la estabilidad direccional del avión. La primera versión
    // restaba, así que peleaba contra la veleta y el derrape crecía hasta
    // dieciséis grados en vez de irse a cero.
    //
    // **Y con las ruedas en el suelo, no**: allí lleva el rumbo. Ver
    // `timonEnTierra`.
    let ayuda: number;
    if (this.state.onGround) {
      this.sinRuedas = 0;
      ayuda = this.timonEnTierra(controls, dt, qS, autoRudder);
    } else {
      this.sinRuedas += dt;
      if (this.sinRuedas > UN_BOTE) {
        this.rumboEnTierra = null;
        this.pieEnTierra = 0;
      }
      ayuda = autoRudder * clamp(beta * 4.5, -1, 1);
    }
    const rudder = clamp(controls.rudder + ayuda, -1, 1);

    // Limitador de ángulo de ataque: cuanto más cerca de la pérdida, menos
    // autoridad tiene el tirón. No la impide, la hace costar.
    //
    // Del 82 % al 117 % de la pérdida, en la escala del ala limpia y como la
    // red: multiplicando la pérdida con flaps, el tramo se movía con el
    // reparto entre ángulo y flaps. Ver `masAllaDeLaPerdida`.
    const empieza = masAllaDeLaPerdida(this.aircraft, controls.flaps, 0.82);
    const acaba = masAllaDeLaPerdida(this.aircraft, controls.flaps, 1.17);
    const excess = clamp((alpha - empieza) / (acaba - empieza), 0, 1);
    const limitado =
      controls.elevator > 0
        ? controls.elevator * (1 - stallProtection * 0.75 * excess)
        : controls.elevator;

    /*
     * **Con las ruedas fuera de la pista, el morro no sube.**
     *
     * Esto era regla solo del modelo sencillo, y aquí ponía que en el de
     * coeficientes «manda la física, y un avión que consiga volar desde una
     * calle de rodaje ha volado». Es defendible como física y es malo como
     * juego: la mitad de lo que este juego enseña es *ir hasta la pista*, y si
     * se puede saltar ese trámite tirando del morro en la plataforma, no se
     * enseña. Se probó jugando y se pidió cambiarlo.
     *
     * No se bloquea el vuelo, se bloquea **la orden de subir**: quien ya está
     * en el aire manda como siempre, y quien está rodando rueda. Y si el
     * terreno se le cae por debajo seguirá quedándose sin ruedas un instante,
     * porque eso no es despegar y no lo arregla esta regla.
     */
    const enElSuelo = this.state.onGround && !this.state.onRunway;
    const elevator = enElSuelo ? Math.min(0, limitado) : limitado;

    return { ...controls, rudder, elevator };
  }

  /**
   * **El timón automático con las ruedas en el suelo** (#196): el pie que
   * pone, de −1 a 1, ya con la capa del peldaño (`autoRudder`).
   *
   * ## Lo que hacía
   *
   * Lo mismo que en el aire: centrar la bola. Volando eso es un viraje
   * coordinado; rodando con viento cruzado es llevar el morro hacia el viento,
   * que es lo que ya hace la veleta del avión y justo lo que en la carrera se
   * corrige con el pie contrario. Medido en la mesa en la 12 de Los Rodeos con
   * el viento de casa —12 kt del 040, once cruzados por la izquierda— y sin
   * tocar nada hasta la Vr: el JAZ 90 acababa 386 m a la izquierda del eje en
   * Tukã y 288 en Taguató, y 27 sin ayuda, que es lo que hace la veleta sola.
   * La ayuda ponía ocho veces la veleta. Ver `timon-en-el-suelo.test.ts`.
   *
   * ## Lo que hace
   *
   * Lo que hace un piloto en la carrera: llevar el eje con los pies, contra la
   * veleta. Ningún avión lleva un amortiguador de guiñada que trabaje en el
   * suelo a favor de ella. Quien juega no tiene pies; dirige con el volante,
   * que en el suelo es la rueda de morro, y la rueda se queda sin autoridad con
   * la carrerilla (`autoridadDeLaRueda`). Así que la ayuda es el pie que le
   * falta:
   *
   * - **Lo que pide el volante, lo sigue dando el timón.** Lo que la rueda
   *   deja de girar al coger velocidad lo toma el pedal, en la misma
   *   proporción: a los veintiocho metros por segundo, el volante entero es el
   *   pedal entero de un timón corriente. Sin esto, a partir de ahí no había
   *   nada con que llevar el eje sin pedales.
   * - **Con el volante quieto, sostiene hacia donde se va**: el rumbo de la
   *   trayectoria en el momento de soltar, con un pie que se va quedando
   *   puesto mientras la veleta empuje. En la carrera y rodando, que la veleta
   *   empuja en los dos. Y al tocar con el avión en cangrejo, hacia donde se va
   *   es la pista y no el morro: es quitar el cangrejo, que es lo que se hace
   *   con el pie al tocar.
   * - **Y no le discute nada a la rueda**: mientras el volante —o la ayuda de
   *   rodaje, que mueve el mismo volante— pide algo, no se sostiene ningún
   *   rumbo, y lo que pide lo da la rueda entera hasta los ocho metros por
   *   segundo. Las curvas de las calles salen igual que sin ayuda.
   *
   * Lo que mueva quien juega —volante o pedal— es suyo: mientras lo mueve no
   * se sostiene ningún rumbo, y al soltar se sostiene el que lleve.
   *
   * La capa es lo más de pie que pone: entero en Tukã, seis décimas en
   * Taguató, y nada en el peldaño sin ayudas, donde el timón es de quien vuela.
   * Medido como arriba, sin tocar nada, el JAZ 90 llega a la Vr a 0,6 m del
   * eje en los dos, y ningún avión pasa de 2,2 m.
   */
  private timonEnTierra(
    controls: ControlInputs,
    dt: number,
    qS: number,
    capa: number,
  ): number {
    const s = this.state;
    const v = s.velocity.dot(this.forward);
    if (capa <= 0 || Math.abs(v) < SOSTIENE_DESDE) {
      this.rumboEnTierra = null;
      this.pieEnTierra = 0;
      return 0;
    }
    const tope = capa;
    /*
     * **Con una rueda reventada, el rumbo lo sostiene quien vuela**: es lo que
     * se practica, y con la ayuda sosteniéndolo el avión no se iba a ningún
     * lado. El volante sigue dando el timón, que es con lo que lo sostiene
     * quien no tiene pedales. Ver `ponerNeumaticoReventado`.
     */
    if (
      this.ladoReventado !== 0 &&
      Math.abs(controls.aileron) <= GIRA_QUIEN_LLEVA &&
      Math.abs(controls.rudder) <= GIRA_QUIEN_LLEVA
    ) {
      this.rumboEnTierra = null;
      this.pieEnTierra = 0;
      return 0;
    }
    const proa = Math.atan2(this.forward.x, -this.forward.z);
    /*
     * **Qué rumbo se sostiene.** Al tocar o al echar a rodar, hacia donde se
     * va: en el suelo es casi siempre hacia donde se mira —las ruedas no dejan
     * ir de lado—, salvo al tocar en cangrejo, y ahí es la pista. Mientras
     * quien juega gira, donde se va a quedar la proa al soltar: la de ahora y
     * lo que todavía gira hasta que el suelo la frena. Con la de ahora sola,
     * la ayuda se comía el final de cada toque de pie: un toque de Q en la
     * carrera del JAZ 120 a 130 kt giraba 0,28° en vez de 0,3 (ver
     * `carrera-fina.test.ts`); y con la trayectoria, que va un poco por detrás
     * de la proa al girar, más.
     */
    const gira =
      Math.abs(controls.aileron) > GIRA_QUIEN_LLEVA ||
      Math.abs(controls.rudder) > GIRA_QUIEN_LLEVA;
    if (gira) this.rumboEnTierra = proa + s.yawRate / FRENO_DE_GUINADA_EN_TIERRA;
    else if (this.rumboEnTierra === null)
      this.rumboEnTierra = Math.atan2(s.velocity.x, -s.velocity.z);
    /*
     * Lo que pide el volante, en la parte que la rueda ya no da. Es lo único
     * que hace la ayuda mientras se gira: el rumbo es de quien gira.
     *
     * **Y el volante entero es el pedal de un timón corriente**, no el del
     * JAZ 90, que es casi el doble porque sujeta un motor parado por encima de
     * su Vmc: con él entero, un segundo de volante a 127 kt tiraba de lado con
     * 0,58 g. Es lo mismo que pide la tecla de pie (`pieDeTecla`), y por el
     * mismo motivo: el mismo giro en toda la flota. Lo que sostiene el rumbo,
     * más abajo, sí puede con todo el pedal de la capa, que es lo que hace
     * falta si se para un motor en la carrera.
     */
    if (gira)
      return clamp(
        tope *
          (1 - autoridadDeLaRueda(v)) *
          pieDeTecla(this.aircraft.aero.cnRudder) *
          controls.aileron +
          this.pieEnTierra,
        -tope,
        tope,
      );

    /*
     * El giro que falta para volver al rumbo —poco a poco, ver
     * `VUELVE_AL_RUMBO`—, pasado a pedal con lo que gira el pedal entero a esta
     * velocidad; y lo que se va quedando puesto, que es lo que sujeta la veleta.
     * Lo que se queda no crece con el pie a tope, o al soltar la veleta —al
     * rotar, o al frenar— sobraría todo de golpe.
     */
    const falta = diferenciaDeRumbo(this.rumboEnTierra, proa);
    const quiere = clamp(falta * VUELVE_AL_RUMBO, -VUELVE_COMO_MUCHO, VUELVE_COMO_MUCHO);
    const corrige = (quiere - s.yawRate) / this.giroDelTimonEnTierra(v, qS);
    const pie = corrige + this.pieEnTierra;
    if (Math.abs(pie) < tope || Math.sign(corrige) !== Math.sign(pie))
      this.pieEnTierra = clamp(
        this.pieEnTierra + corrige * SE_QUEDA_EL_PIE * dt,
        -tope,
        tope,
      );
    return clamp(pie, -tope, tope);
  }

  /**
   * **Lo que gira el pedal entero en tierra a esta velocidad, una vez
   * asentado**, rad/s: el del suelo (`giroDelPedal`) y el del timón de aire,
   * que con la carrerilla es el que más pone. Es la cuenta con la que el timón
   * automático en tierra pasa de giro a pedal; por arriba, porque no cuenta lo
   * que frena el propio aire, y por eso nunca pide de más.
   */
  private giroDelTimonEnTierra(v: number, qS: number): number {
    const ac = this.aircraft;
    const delAire =
      (qS * ac.wingSpan * ac.aero.cnRudder) /
      (ac.inertia.zz * FRENO_DE_GUINADA_EN_TIERRA);
    return Math.max(1e-3, giroDelPedal(v) + delAire);
  }

  /**
   * La velocidad respecto al aire, en ejes cuerpo.
   *
   * **Una sola cuenta, y por eso está aquí.** La hacían dos sitios: `integrate`,
   * para las fuerzas, y `updateDerived`, para el dato que publica el estado. Al
   * meter el viento se cambió una y no la otra, con lo cual el ala lo notaba y
   * el anemómetro no: el avión rotaba a velocidad **respecto al suelo** y un
   * viento de cara, en vez de acortar la carrera, la alargaba —porque añadía
   * resistencia sin adelantar la rotación—. Justo lo contrario de lo que pasa.
   *
   * Es el fallo clásico de esta casa: el mismo número calculado en dos sitios.
   */
  private respectoAlAire(): {
    u: number;
    v: number;
    w: number;
    speed: number;
  } {
    const s = this.state;
    const cuanto = perfilDeViento(
      s.position.y - this.ground(s.position.x, s.position.z),
    );
    this.relativa.copy(s.velocity).addScaledVector(this.viento, -cuanto);
    const u = this.relativa.dot(this.forward);
    const v = this.relativa.dot(this.right);
    const w = this.relativa.dot(this.down);
    return { u, v, w, speed: Math.sqrt(u * u + v * v + w * w) };
  }

  private updateDerived(): void {
    const s = this.state;
    this.updateBodyAxes();

    // Se recalculan aquí y no solo dentro de `integrate` para que el estado
    // sea correcto nada más llamar a `reset()`, antes del primer paso. Quien
    // lea `airspeed` justo después de reiniciar tiene que ver la velocidad
    // con la que ha arrancado, no un cero.
    const { u, v, w, speed } = this.respectoAlAire();
    s.airspeed = speed;
    // Y la del suelo, que es otra cosa desde que hay viento. Ver `groundSpeed`.
    s.groundSpeed = Math.hypot(s.velocity.x, s.velocity.z);
    if (s.airspeed > MIN_AIRSPEED) {
      s.alpha = anguloDeAtaque(u, w);
      s.beta = Math.asin(clamp(v / s.airspeed, -1, 1));
    } else {
      s.alpha = 0;
      s.beta = 0;
    }

    s.verticalSpeed = s.velocity.y;
    s.heightAboveGround =
      s.position.y - this.ground(s.position.x, s.position.z);
    s.secondsToImpact = this.timeToImpact();
    // Rumbo: proyección del morro sobre el plano horizontal. -Z es el norte.
    s.heading = Math.atan2(this.forward.x, -this.forward.z);
    if (s.heading < 0) s.heading += Math.PI * 2;
  }
}

// ── Aerodinámica ───────────────────────────────────────────────────────

/**
 * Curva de sustentación con pérdida.
 *
 * Hasta el ángulo de pérdida es una recta. Pasado ese punto se mezcla hacia
 * el comportamiento de una placa plana, que da mucha menos sustentación. Esa
 * mezcla es lo que hace que el morro se caiga de verdad en vez de quedarse
 * flotando con el avión colgado del elevador.
 */
export function liftCoefficient(
  alpha: number,
  a: { cl0: number; clAlpha: number },
  stallAngle: number,
): number {
  const magnitude = Math.abs(alpha);
  if (magnitude <= stallAngle) return a.cl0 + a.clAlpha * alpha;

  const sign = Math.sign(alpha) || 1;
  const clAtStall = a.cl0 * sign + a.clAlpha * stallAngle * sign;
  const clFlatPlate = 2 * Math.sin(alpha) * Math.cos(alpha);
  const blend = Math.min(1, (magnitude - stallAngle) / 0.32);
  return clAtStall * (1 - blend) + clFlatPlate * blend;
}

/**
 * Resistencia adicional al desprenderse el flujo.
 *
 * Se exporta porque el esquema de «cómo vuela un ala» tiene que dibujar **la
 * curva de este avión**, no la de un ala de libro: un esquema que enseñe una
 * pérdida distinta de la que se acaba de sentir a los mandos enseña dos cosas
 * a la vez. Ver `flight/ala.ts`.
 */
export function postStallDrag(alpha: number, stallAngle: number): number {
  const excess = Math.abs(alpha) - stallAngle;
  if (excess <= 0) return 0;
  const s = Math.sin(excess);
  return 2.1 * s * s;
}

/**
 * Cuánto empuja el nivelado automático, en función del alabeo.
 *
 * Progresivo a propósito. Un término lineal en sin(alabeo) obliga a elegir:
 * fuerte y el avión no vira porque se endereza en cuanto sueltas la tecla,
 * flojo y no recuperas la horizontal. Mezclando un tramo lineal con otro
 * cuadrático, un alabeo de veinte grados —el de un viraje querido— apenas se
 * toca, y uno de sesenta se corrige con ganas.
 */
function levelling(bank: number): number {
  const s = Math.sin(bank);
  return WING_LEVELLER * s * (0.3 + 0.7 * Math.abs(s));
}

/**
 * **El empuje con el gas a fondo**, N, a esta densidad y a esta velocidad
 * respecto al aire.
 *
 * Cae con la densidad —ver `loQueDaElMotor`— y con la velocidad **según qué
 * empuje el aire**: una hélice que ya va rápida muerde menos aire y pierde
 * empuje deprisa; un turbofán casi no lo pierde, porque lo que acelera es el
 * aire que él mismo traga. Ninguna de las dos es un modelo de propulsión de
 * verdad, pero la diferencia entre ellas sí lo es. Ver el comentario del
 * empuje en `integrate`.
 *
 * Vive fuera y exportado porque lo preguntan dos: el motor, en cada paso, y
 * `gasParaRodar`, que busca el gas que sostiene una velocidad. Si cada uno
 * llevara su curva, la marca de rodaje prometería una velocidad y el motor
 * daría otra — que es exactamente lo que pasaba.
 */
export function empujeLleno(
  ac: AircraftConfig,
  densidad: number,
  velocidad: number,
): number {
  const factor = esDeChorro(ac)
    ? Math.max(0.5, 1 - (0.3 * velocidad) / ac.cruiseSpeed)
    : parteDelEmpuje(ac, velocidad);
  return (
    ac.maxThrust * loQueDaElMotor(ac, densidad / SEA_LEVEL_DENSITY) * factor
  );
}

/** Lo que hace falta saber para contar lo que frena el avión. */
export interface ParaSostener {
  /** La altura del avión, m. */
  readonly altura: number;
  /** La velocidad verdadera que se quiere sostener, m/s. */
  readonly verdadera: number;
  readonly aire?: Aire;
  /** Los flaps, de 0 a 1, donde están. */
  readonly flaps: number;
  /** El tren, de 0 dentro a 1 fuera. */
  readonly tren: number;
  /** Los aerofrenos de vuelo, de 0 a 1. Sin ellos, recogidos. */
  readonly aerofrenos?: number;
  /**
   * **La pendiente de la trayectoria**, rad: cero nivelado, negativa
   * bajando. Por la senda de tres grados, el peso empuja: se necesita menos
   * gas que nivelado, y eso es lo que hace que una final se vuele con poco
   * motor.
   */
  readonly pendiente: number;
}

/**
 * **El empuje que sostiene esa velocidad por esa pendiente**, N, con lo que
 * se lleve sacado.
 *
 * Es la resistencia de `step`, término a término —la parásita, la inducida
 * con la sustentación que pide el peso, los flaps, el tren y la onda—, más lo
 * que pide la pendiente. Vive aquí, al lado de la de verdad, porque la usan
 * dos que no son este modelo: la marca del motor (`gasQueSostiene` en
 * `gas-que-toca.ts`) y lo que cuesta lo sacado en el modelo sencillo
 * (`arcade.ts`). Si una cambia, cambian las tres.
 */
export function empujeQueSostiene(a: AircraftConfig, p: ParaSostener): number {
  const aire = p.aire ?? AIRE_ESTANDAR;
  const rho = airDensity(p.altura, aire);
  const v = Math.max(1, p.verdadera);
  const qS = 0.5 * rho * v * v * a.wingArea;
  const peso = masaDe(a) * GRAVITY;
  const cl = (peso * Math.cos(p.pendiente)) / Math.max(1, qS);
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * alargamiento * a.aero.oswald) +
    resistenciaDeLosFlaps(a, p.flaps) +
    resistenciaDelTren(a, p.tren, fraccionDeLosFlaps(a, p.flaps)) +
    resistenciaDeLosPaneles(a, p.aerofrenos ?? 0, 0) +
    resistenciaDeOnda(machDe(v, p.altura, aire), a.mmo, a.aero.cd0);
  return qS * cd + peso * Math.sin(p.pendiente);
}

/**
 * **La palanca que sostiene esa velocidad por esa pendiente**, sin tope: el
 * empuje de `empujeQueSostiene` entre el de `empujeLleno` ahí. Por encima de
 * uno es que ni a fondo se llega; `Infinity`, que el motor no da nada.
 *
 * Es la cuenta de la marca del motor (`gasQueSostiene`) y la de `gasPara`
 * de este modelo, que cada uno remata a su manera: una no pone marca donde no
 * se llega, y el otro pide todo el gas.
 */
export function palancaQueSostiene(a: AircraftConfig, p: ParaSostener): number {
  const rho = airDensity(p.altura, p.aire ?? AIRE_ESTANDAR);
  const lleno = empujeLleno(a, rho, Math.max(1, p.verdadera));
  if (!(lleno > 0)) return Infinity;
  return empujeQueSostiene(a, p) / lleno;
}

/**
 * **El timón que sostiene este avión a esa indicada, con esos flaps**, de −1 a
 * 1: el que anula el par de cabeceo de `step` —`cm0 + cmα·α + cmδ·δ`— con el
 * ángulo de ataque al que el ala, con lo que suman los flaps, sostiene el peso
 * que lleve `a`.
 *
 * Es la cuenta de `timonDeEquilibrio` para quien no tiene el modelo a mano, y
 * con los flaps, que aquella no mira: la usa la marca de despegue del
 * compensador (`compensador-de-despegue.ts`). Con la indicada y al nivel del
 * mar, que es lo mismo que con la verdadera a su altura: la sustentación va
 * con la presión dinámica. Vive aquí por lo mismo que `empujeQueSostiene`: si
 * cambia el par de `step`, cambia esto.
 */
export function timonQueSostiene(a: AircraftConfig, indicada: number, flaps: number): number {
  const qS = 0.5 * SEA_LEVEL_DENSITY * indicada * indicada * a.wingArea;
  const cl = (masaDe(a) * GRAVITY) / Math.max(1, qS);
  const alfa = clamp(
    (cl - a.aero.cl0 - sustentacionDeLosFlaps(a, flaps)) / a.aero.clAlpha,
    -0.05,
    anguloDePerdida(a, flaps) * 0.85,
  );
  return clamp(
    -(a.aero.cm0 + a.aero.cmAlpha * alfa + parDelCentrado(a, cl)) / a.aero.cmElevator,
    -1,
    1,
  );
}

/**
 * **Lo que suma el centrado de hoy al coeficiente de cabeceo** con este
 * coeficiente de sustentación: `CL·Δx/c̄`, el mismo par que `step` traslada
 * con la fuerza normal. Cero con la carga de su ficha. Ver `flight/centrado.ts`.
 */
export function parDelCentrado(a: AircraftConfig, cl: number): number {
  const dx = centradoDe(a);
  return dx === 0 ? 0 : (cl * dx) / a.chord;
}

/**
 * **El ángulo con el que la estabilidad devuelve el morro**, rad.
 *
 * Hasta la pérdida es el ángulo tal cual: `cmα·α`, la recta de los libros, y
 * ahí no cambia nada de cómo vuela nadie. Pero la recta no se acababa nunca, y
 * con el viento por detrás el ángulo de ataque es de ±180°: `cmα·π`, un par de
 * morro enorme **que cambia de signo** según la ráfaga venga un pelo por
 * encima o por debajo. El avión parado con viento de cola se sentaba sobre la
 * cola o clavaba el morro a cara o cruz.
 *
 * Pasada la pérdida sigue la forma del seno —la de una placa plana, como la
 * sustentación de `liftCoefficient`—, empalmada para que en la pérdida valga
 * lo mismo: crece un poco hasta los noventa grados y vuelve a cero con el aire
 * de cola, que es lo que hace el aire de cola.
 */
export function anguloQueEstabiliza(alpha: number, alphaStall: number): number {
  const m = Math.abs(alpha);
  if (m <= alphaStall) return alpha;
  return (
    Math.sign(alpha) * alphaStall * (Math.sin(m) / Math.sin(alphaStall))
  );
}

/**
 * El ángulo de ataque del aire que pasa por el plano de simetría.
 *
 * Sin aire en ese plano no hay ángulo que valga: con el viento de costado y
 * el avión parado, `u` y `w` son lo que traiga la ráfaga, y su arcotangente
 * saltaba de −90° a +90° de un fotograma a otro. Ver `qSSimetria`.
 */
function anguloDeAtaque(u: number, w: number): number {
  return Math.hypot(u, w) > MIN_AIRSPEED ? Math.atan2(w, u) : 0;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Lo que va del rumbo `b` al `a`, rad, entre −π y π: positivo, a la derecha. */
function diferenciaDeRumbo(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
