/**
 * Contrato entre el juego y la física de vuelo.
 *
 * Todo lo que el resto del juego sabe de cómo vuela un avión está en este
 * fichero. Esa frontera es deliberada: permite sustituir la implementación
 * —hoy un FDM propio de coeficientes, mañana JSBSim compilado a
 * WebAssembly— sin tocar el render, la UI ni los controles.
 *
 * Ver docs/adr/0002-modelo-de-vuelo-propio.md para el porqué y para los
 * pasos concretos de la integración de JSBSim.
 *
 * Unidades: SI en todo el módulo. Metros, metros por segundo, newtons,
 * kilogramos, radianes. La conversión a nudos, pies y km/h ocurre solo en
 * la capa de presentación.
 */

import type { Quaternion, Vector3 } from "three";
import type { Aire } from "./atmosphere";

/** Posición de los mandos, en intención de piloto, no en deflexión física. */
export interface ControlInputs {
  /** Cabeceo. +1 = tirar de la palanca = morro arriba. */
  elevator: number;
  /**
   * **El compensador de profundidad.** −1 a 1, y se queda donde lo dejes.
   *
   * Contado jugando con el de fuselaje ancho: «cuando uso las teclas de
   * flecha el avión no tiene *stops*: o bajo o subo, pero no me deja marcar
   * pequeños pasos, y eso impide que pueda mantener el avión estable. Si
   * subo velocidad, sube el avión; si bajo, baja. Entiendo que debo tener un
   * mando para decidir si a cualquier velocidad puedo mantener el avión a una
   * altitud fija».
   *
   * Y es exactamente eso: **el mando que falta es el compensador**. El
   * cabeceo es un muelle —se suelta la tecla y el timón vuelve al centro—,
   * así que volar nivelado obligaba a tener la tecla medio pulsada para
   * siempre, que no se puede. El compensador no vuelve: mueve el punto de
   * equilibrio del timón y ahí se queda. Es el volante o la rueda que hay en
   * cualquier cabina del mundo, al lado de la pierna del piloto, y es lo
   * primero que se toca después de nivelar.
   *
   * Se suma al mando: el timón que ve el avión es `elevator + trim`. Así, con
   * el compensador puesto, soltar la palanca deja el avión donde estaba en
   * vez de devolverlo al centro — que es justo lo que se pedía.
   *
   * **El modelo sencillo no lo usa.** En Guyrami el cabeceo no es un timón:
   * es directamente cuánto sube el avión, y el avión ya se sostiene solo. Un
   * compensador allí no compensaría nada. Ver `flight/arcade.ts`.
   */
  trim: number;
  /** Alabeo. +1 = alabear a la derecha. */
  aileron: number;
  /** Guiñada. +1 = pie derecho = morro a la derecha. */
  rudder: number;
  /** Motor, 0 a 1. */
  throttle: number;
  /** Frenos de rueda, 0 a 1. Solo tiene efecto en tierra. */
  brakes: number;
  /**
   * ¿Está el motor en marcha?
   *
   * Antes no existía: el motor estaba siempre encendido y bajar el gas lo
   * dejaba a ralentí para siempre. Con el avión parado en la plataforma eso
   * es justo lo que no debe pasar — y de paso faltaba el sonido que marca el
   * final de un vuelo, que es el de los motores apagándose.
   */
  engineOn: boolean;
  /**
   * Dónde están los flaps: 0 recogidos, 1 abajo del todo.
   *
   * Es **la posición y no la palanca**, como el tren: la palanca va de un
   * golpe a su muesca y los flaps tardan unos segundos en llegar. Lo mueve
   * `Input.update` y lo miran el modelo de vuelo —sustenta y frena según
   * esto—, los relojes, el cuadro y el ala del modelo. La palanca es
   * `palancaDeFlaps` en `flight/input.ts`. Ver `flight/flaps.ts`.
   */
  flaps: number;
  /**
   * Dónde está el tren: 0 dentro, 1 fuera y trabado.
   *
   * Es **la posición y no la orden**, porque un tren tarda diez segundos en
   * salir y ese rato es justo lo que hay que aprender a dejar. Lo mueve
   * `Input.update` y lo miran el modelo de vuelo —le cuesta resistencia—, el
   * cuadro de mandos y las patas del modelo. Ver `flight/tren.ts`.
   *
   * En los aviones que no lo meten vale 1 siempre, que es la verdad: sus patas
   * están al aire.
   */
  tren: number;
  /**
   * Reversa, 0 a 1. Solo en tierra y solo en el avión que la lleva.
   *
   * No existía, y se echó de menos jugando: «cuando tomo tierra no tengo
   * reversa». En un avión de línea es la mitad de la parada — el chorro se
   * desvía hacia delante y frena sin gastar frenos ni neumáticos, que es
   * justamente lo que se cuida en una pista mojada o corta.
   *
   * Va aparte del gas y no como un gas negativo porque en la cabina son dos
   * mandos distintos: el gas se deja al ralentí **y entonces** se levantan los
   * gatillos de la reversa. Hacerlo con un solo número enseñaría un avión que
   * no existe.
   */
  reversa: number;
  /**
   * **Si quien lleva el cabeceo y el alabeo es el piloto automático.**
   *
   * El modelo de vuelo tiene dos ayudas que imitan a quien suelta la palanca
   * —el compensador que sostiene la subida y el nivelado de alas— y las
   * enciende al ver el mando cerca del centro. Con el automático puesto el
   * mando lo mueve él, y en vuelo recto lo lleva precisamente cerca del
   * centro, así que sin esto las dos manos se turnaban a los mandos. Lo pone
   * `conElPilotoAutomatico` en `game.ts`, y solo en la copia que va al
   * modelo. Sin poner, es que vuela una persona.
   */
  automatico?: boolean;
  /**
   * **Si la nivelada de los peldaños de abajo lleva la altura.** Como
   * `automatico`, pero solo para el cabeceo: aparta el compensador que
   * sostiene la subida y deja el nivelado de alas. Ver `Tier.nivelada`.
   */
  sostieneLaAltura?: boolean;
  /**
   * **Si la mano de quien vuela sostiene la inclinación** —la del teclado o la
   * del dedo, que se queda donde se deja—. Como `automatico`, pero para el
   * alabeo y puesto por la mano: aparta el nivelado de alas, que si no la
   * deshacía al soltar la tecla. Ver `flight/mano.ts`.
   */
  manoEnElAlabeo?: boolean;
  /**
   * Y **la trayectoria**: aparta el compensador que sostiene la subida, que
   * nunca sostenía una bajada —«o bajo o subo»—. Ver `flight/mano.ts`.
   */
  manoEnElCabeceo?: boolean;
  /**
   * **Los aerofrenos**, de 0 cerrados a 1 abiertos del todo. Es la posición y
   * no la palanca, como los flaps: los paneles tardan un momento en subir.
   * Solo frenan en el avión que los lleva. Ver `aerofrenos` en la ficha y
   * `alternarAerofrenos` en `flight/input.ts`. Sin poner, cerrados.
   */
  aerofrenos?: number;
}

export function neutralControls(): ControlInputs {
  return {
    elevator: 0,
    trim: 0,
    aileron: 0,
    rudder: 0,
    throttle: 0,
    brakes: 0,
    flaps: 0,
    // Fuera, que es como está un avión en su puesto y como están siempre los
    // que no lo meten. Ver `flight/tren.ts`.
    tren: 1,
    reversa: 0,
    aerofrenos: 0,
    engineOn: true,
  };
}

/**
 * Estado completo de la aeronave.
 *
 * Los vectores están en coordenadas de mundo de three.js (Y hacia arriba,
 * X este, Z sur). Las velocidades angulares están en ejes cuerpo
 * aeronáuticos (x adelante, y derecha, z abajo), que es como se escriben
 * las ecuaciones de Euler y como vienen tabulados los coeficientes.
 */
export interface FlightState {
  position: Vector3;
  velocity: Vector3;
  orientation: Quaternion;
  /** Velocidad de alabeo, rad/s, positiva hacia la derecha. */
  rollRate: number;
  /** Velocidad de cabeceo, rad/s, positiva morro arriba. */
  pitchRate: number;
  /** Velocidad de guiñada, rad/s, positiva morro a la derecha. */
  yawRate: number;

  // ── Derivados, recalculados en cada paso ────────────────────────────
  /** Velocidad respecto al aire, m/s. */
  airspeed: number;
  /**
   * Velocidad respecto al **suelo**, m/s. Solo la horizontal.
   *
   * **No es lo mismo que la de arriba, y por eso está.** Mientras el motor de
   * vuelo no conocía el viento eran el mismo número, y medio juego preguntaba
   * «¿se está moviendo?» mirando el anemómetro. En cuanto el viento entró, un
   * avión **parado** con viento de cara marcaba ya la velocidad del viento: el
   * tope de rodaje le cerraba el gas creyendo que iba deprisa, la máquina de
   * fases no le dejaba pasar de «arrancando» porque no se había parado nunca, y
   * el avión se quedaba clavado en la plataforma. Medido en el barrido: tres
   * escenarios enteros sin llegar al punto de espera en quince minutos.
   *
   * La regla es sencilla y no tiene excepciones: **lo que hace volar es el
   * aire; lo que hace avanzar es el suelo.** Sustentación, resistencia,
   * pérdida y el anemómetro de la cabina van con `airspeed`; rodar, frenar,
   * pararse, atropellar y «¿ya se mueve?» van con ésta.
   */
  groundSpeed: number;
  /** Ángulo de ataque, rad. */
  alpha: number;
  /** Ángulo de derrape, rad. Positivo = viento por la derecha. */
  beta: number;
  /** Altura sobre el terreno, m. */
  heightAboveGround: number;
  /**
   * Si las ruedas están sobre la pista. Lo pone el juego cada fotograma.
   *
   * Lo usa el modelo sencillo para no dejar despegar desde una plataforma. No
   * es física: es la regla del juego —**los aviones despegan de pistas**—, y
   * ese es exactamente el peldaño en el que hay que enseñarla.
   */
  onRunway: boolean;
  /** Velocidad vertical, m/s. Positiva hacia arriba. */
  verticalSpeed: number;
  /** Factor de carga, en g. */
  loadFactor: number;
  /** Rumbo magnético aproximado, rad, 0 = norte, creciendo al este. */
  heading: number;
  onGround: boolean;
  stalled: boolean;
  /**
   * **Si suena el avisador de pérdida**, que no es lo mismo que estar en
   * pérdida: suena antes, por ángulo de ataque y con los flaps que se lleven.
   * Ver `anguloDeAviso` en `flight/avisos-de-actitud.ts`.
   */
  stallWarning: boolean;
  /**
   * Y a qué ángulo de ataque suena ahora mismo, rad: baja con los flaps. En
   * el modelo sencillo, que no entra en pérdida, no suena nunca. Lo mira el
   * piloto del banco para no tirar hasta ahí.
   */
  stallWarningAlpha: number;
  /** Se pone a true cuando el toque ha sido demasiado violento. */
  crashed: boolean;
  /**
   * Segundos que faltan para llegar al suelo si nada cambia, o Infinity si
   * la trayectoria actual no lleva a ninguna parte peligrosa. Mira por
   * delante siguiendo la velocidad, así que detecta la ladera contra la que
   * se va de frente, no solo el descenso vertical.
   */
  secondsToImpact: number;
  /**
   * Velocidad de descenso del último aterrizaje, m/s. Cero mientras no se
   * haya tocado nunca. Sirve para afinar los umbrales sin adivinar, y es lo
   * que necesitará una misión que puntúe la toma.
   */
  touchdownSinkRate: number;
}

export interface InitialConditions {
  position: Vector3;
  /** Rumbo inicial, rad. */
  heading: number;
  /** Velocidad inicial respecto al aire, m/s. 0 para arrancar parado. */
  airspeed: number;
  /**
   * **Y si se le pone volando equilibrado**: con el ángulo de ataque que
   * sostiene su peso a esa velocidad, en vez de con el morro en el horizonte.
   *
   * Lo pide quien cambia de peldaño en el aire: el modelo nuevo nace donde
   * estaba el viejo, y sin esto nacía con el ala sin ángulo —sin
   * sustentación—, se caía un buen trozo y el compensador de quien vuela
   * quedaba sosteniendo otro avión. Ver `cycleTier` en `game.ts` y
   * `timonDeEquilibrio`.
   */
  equilibrado?: boolean;
}

/** Devuelve la cota del terreno, en metros, para unas coordenadas de mundo. */
export type GroundSampler = (x: number, z: number) => number;

/**
 * Implementá esta interfaz para enchufar otro modelo de vuelo.
 *
 * Una implementación sobre JSBSim-WASM traduciría `ControlInputs` a las
 * propiedades `fcs/*` de JSBSim y reconstruiría `FlightState` desde
 * `position/*`, `velocities/*` y `attitude/*`. El resto del juego no
 * necesitaría ni un cambio.
 */
import type { Superficie } from "../world/superficie";

export interface FlightModel {
  readonly state: Readonly<FlightState>;
  /**
   * Dice si las ruedas están sobre la pista. Lo llama el juego cada fotograma.
   *
   * Va como método y no como campo escribible porque `state` es de solo
   * lectura a propósito: el estado lo produce el modelo y lo consume todo lo
   * demás. Esto es lo único que va en sentido contrario, y por eso se ve.
   */
  setOnRunway(enPista: boolean): void;
  /**
   * El empuje que están dando los motores ahora mismo, en newtons.
   *
   * Lo pregunta el combustible, y tiene que preguntarlo **al modelo** y no
   * calcularlo por su cuenta: el empuje de un motor cae con la altura y con
   * la velocidad, y eso es justo lo que hace que volar alto salga a cuenta.
   * Repetir esa cuenta fuera sería tener dos, y el día que una cambiara, el
   * indicador de combustible empezaría a mentir sin que nadie se enterara.
   *
   * Ver `flight/combustible.ts`.
   */
  empujeAhora(): number;
  /**
   * **El timón que está sosteniendo el avión ahora mismo**, en unidades de
   * mando: el de quien vuela más el compensador, y más lo que empuje la ayuda
   * que sostiene la subida en los peldaños que la llevan, contado como el
   * timón que haría lo mismo.
   *
   * Lo pregunta el piloto automático al engancharse, para coger el avión
   * **como está**. Tomaba el mando y el compensador, y en los peldaños con
   * ayudas eso no es todo lo que lo sostiene: al engancharse, la ayuda se
   * aparta —ver `ControlInputs.automatico`— y lo que ella empujaba
   * desaparecía de golpe. El JAZ 120, enganchado subiendo en el peldaño de
   * todas las ayudas, pasaba de 1,6 g a cero en un par de segundos.
   *
   * El modelo sencillo no tiene timón que contar: devuelve cero, y allí no hay
   * piloto automático.
   */
  timonAhora(): number;
  /**
   * **El timón que sostiene el avión nivelado a la velocidad de ahora**, en
   * unidades de mando: lo que hay que dejar puesto en el compensador para que
   * vuele solo. Solo lo sabe el modelo de coeficientes; el sencillo no tiene
   * timón que contar. Ver `InitialConditions.equilibrado`.
   */
  timonDeEquilibrio?(): number;
  /**
   * **Qué palanca da este ritmo de subida**, en el modelo en el que la palanca
   * es cuánto se sube: el sencillo. Ver `mandoParaSubir` en `arcade.ts`.
   */
  mandoParaSubir?(ritmo: number): number;
  /**
   * Rompe el avión. Lo llama el juego cuando se ha metido en un edificio.
   *
   * Va aquí y por el mismo motivo que `setOnRunway`: `state` es de solo
   * lectura a propósito —lo produce el modelo y lo consume todo lo demás—, y
   * chocar contra un bulto es de las poquísimas cosas que van en sentido
   * contrario. El modelo no sabe nada de la ciudad y no tiene por qué: el
   * mundo lo construye el juego. Ver `world/obstaculos.ts`.
   *
   * El modelo sencillo puede ignorarlo, y lo ignora: en ese peldaño no se
   * puede perder, y quien lo llama ya lo sabe.
   */
  romper(): void;
  /**
   * El viento que sopla aquí: a dónde va, en m/s y en ejes del mundo.
   *
   * **Y hacía falta porque el viento existía en todas partes menos donde
   * importa.** El panel del tiempo lo enseña, la manga lo señala, el aeródromo
   * elige cabecera con él y el METAR lo trae de verdad — y el avión no se
   * enteraba: `integrate` calculaba la velocidad respecto al aire con la
   * velocidad inercial, con un comentario que decía literalmente «sin viento
   * todavía». O sea que despegar con quince nudos de cola y con quince de cara
   * era exactamente lo mismo, y el juego enseña justo lo contrario.
   *
   * Va como método y por el mismo motivo que `setOnRunway`: `state` es de solo
   * lectura a propósito, y esto es de las poquísimas cosas que van en sentido
   * contrario.
   *
   * El modelo sencillo puede ignorarlo, y lo ignora: en ese peldaño el gas
   * **es** la velocidad y meter viento ahí sería enseñar una cuenta que ese
   * modelo no hace.
   */
  ponerViento(x: number, z: number): void;
  /**
   * **El aire del día**: la temperatura y la presión del parte donde está el
   * avión, que mueven la densidad y con ella la sustentación, la resistencia,
   * el empuje, la indicada y el Mach. Lo pone el juego con el mismo reparto
   * entre campos que el viento. Ver `atmosphere.ts` y `tiempoEntreCampos`.
   *
   * El modelo sencillo lo guarda para lo que pregunta el juego —el empuje del
   * combustible, el tope de velocidad—, pero no le cambia la física: allí el
   * gas es la velocidad, como con el viento.
   */
  ponerAire(aire: Aire): void;
  /** Y el aire que tiene puesto, para que los relojes digan lo mismo que él. */
  aireDelDia(): Aire;
  /**
   * La ráfaga de este instante, en m/s y en ejes del mundo.
   *
   * Va aparte del viento del parte porque son dos cosas distintas: el viento es
   * el dato del día y se mide en el aeropuerto; la ráfaga cambia cada segundo y
   * es lo que hace que volar se sienta. Ver `flight/turbulencia.ts`.
   */
  ponerRacha?(x: number, y: number, z: number, alabeo?: number): void;
  /** Nombre legible de la implementación, para la pantalla de créditos. */
  readonly implementationName: string;
  reset(initial: InitialConditions): void;
  /** Avanza la simulación `dt` segundos. */
  step(dt: number, controls: ControlInputs): void;
  /**
   * Qué gas hace falta, volando, para sostener esta velocidad.
   *
   * Lo pregunta quien coloca el avión en el aire —la lección de aterrizar
   * empieza en final— y lo contesta cada modelo a su manera, porque la
   * relación entre el mando y la velocidad **es** el modelo. Antes había un
   * número fijo del cuarenta y cinco por ciento que valía para uno de los dos
   * y dejaba al otro a media velocidad.
   */
  gasPara(velocidad: number): number;
  /**
   * Y qué gas hace falta **rodando**, que no es lo mismo ni de lejos.
   *
   * `gasPara` está calibrado para volar: su abanico va de la mínima de vuelo
   * al crucero, así que preguntarle por la velocidad de rodaje devuelve cero
   * —o sea, «pará»—. Se preguntó y el avión se quedó clavado en el puesto: el
   * tope de rodaje le pedía el gas de nueve metros por segundo y el modelo
   * contestaba que para volar a nueve hace falta un gas negativo.
   *
   * En tierra la pregunta es otra —cuánto empuje sostiene esta velocidad de
   * rodaje— y cada modelo la contesta a su manera, igual que la de arriba.
   *
   * **Y con `desde`, cuánto hace falta para llegar a ella** yendo ahora a
   * esa otra velocidad, sin tirones. Rodando, el gas que sostiene nueve metros
   * por segundo apenas mueve un avión parado —lo que frena en el suelo es casi
   * lo mismo a cualquier velocidad—, así que quien conduce por quien juega
   * pide algo más mientras falta y lo va soltando al llegar. Sin `desde`, el
   * de sostenerla.
   */
  gasParaRodar(velocidad: number, desde?: number): number;
  /**
   * A qué velocidad se entra en final, en metros por segundo.
   *
   * También la contesta el modelo, y por lo mismo que `gasPara`: **cada modelo
   * tiene su propio abanico de velocidades**. La lección de aterrizar arrancaba
   * a vez y media la velocidad de aproximación, que en el modelo de
   * coeficientes se sostiene bien y en el sencillo **no existe**: ahí el avión
   * no pasa de dos tercios de su crucero, así que arrancaba con el gas pinzado
   * al cien por cien, frenaba solo cuarenta y cuatro kilómetros por hora sin
   * que nadie tocara nada, y encima subía. Medido.
   *
   * Un número que uno de los dos modelos no puede sostener no es una velocidad
   * de entrada: es una postura inicial que se deshace sola.
   */
  velocidadDeEntradaEnFinal(vref: number): number;
  /**
   * Lo más rápido que sabe volar este modelo, en metros por segundo.
   *
   * Hace falta para juzgar una toma. «Puedo aterrizar a la velocidad que me dé
   * la gana», y era literal: el umbral de toma rápida era vez y cuarto la
   * velocidad de aproximación —cuarenta y un metros por segundo— y el modelo
   * sencillo **no pasa de treinta y siete**. O sea que en el peldaño de los
   * pequeños la toma rápida no existía: se podía llegar a tope de gas y con la
   * palanca a fondo y el juego decía «suave».
   *
   * Un listón que el mundo no puede alcanzar no es un listón.
   */
  velocidadMaxima(): number;
  /**
   * **El tope de verdad: Vmo o Mmo, el que mande a esta altura.**
   *
   * Distinto de `velocidadMaxima`, que es «a esto ya se le llama rápido». Éste
   * es el que rompe el avión, y **cambia con la altura**: abajo lo pone la
   * estructura y arriba el aire. Ver `flight/limites.ts`.
   */
  limiteDeVelocidad(): number;
  /** Cuál de los dos manda aquí, para poder decirlo con un dibujo. */
  quienLimita(): "estructura" | "aire";

  /**
   * A qué régimen de descenso al tocar deja de ser un aterrizaje, m/s.
   *
   * Existe porque el juego llegó a tener **dos** límites para lo mismo: el
   * modelo rompía el avión a partir de seis metros por segundo —hasta veinte
   * con las ayudas puestas— y la pantalla de percance salía a partir de
   * cuatro, escrito aparte. Resultado: una toma firme dejaba el avión entero,
   * volando tan tranquilo, y encima salía el dibujo de la avioneta con la
   * hélice torcida. «Aterricé bien otra vez y me vuelve a decir que estrellé
   * la avioneta.»
   *
   * El límite es uno y lo dice quien simula el avión, que es el único que sabe
   * cuánto aguanta el tren con las ayudas de este peldaño puestas.
   */
  limiteDeCaida(): number;

  /**
   * De qué está hecho el suelo que hay debajo ahora mismo.
   *
   * Lo dice el juego en cada fotograma, porque el que sabe de aeródromos es
   * él. El modelo solo lo usa para lo que le toca: **rodar por hierba cuesta
   * más que rodar por asfalto**, y por eso una pista de hierba pide más
   * carrera de despegue. Ver `world/superficie.ts`.
   */
  ponerSuperficie(superficie: Superficie): void;
}
