/**
 * Modelo de vuelo sencillo, para el primer peldaño de la escalera.
 *
 * **No es el modelo de coeficientes con más ayudas.** Es otro modelo, y esa
 * distinción costó cuatro intentos de aprender. Pelear con un modelo
 * realista para que se comporte de forma sencilla es luchar contra la física
 * que uno mismo eligió: el fugoide —ese subir y bajar que no se acaba nunca—
 * existe porque un avión intercambia altura por velocidad, y la manera de no
 * tenerlo no es amortiguarlo, es no tenerlo.
 *
 * Aquí no hay fuerzas ni momentos: hay **cinemática**. El avión va donde
 * apunta el morro, gira lo que le pidas y sube lo que le pidas. La velocidad
 * la lleva el juego. No hay pérdida, ni derrape, ni inercia de rotación, ni
 * intercambio de energía. Nada que combatir.
 *
 * Lo que sí conserva, porque es lo que hace que valga como escalón y no como
 * juguete aparte:
 *
 * - Los mismos mandos y el mismo sentido. Tirar sube, alerón derecha alabea
 *   a la derecha, el gas manda en la velocidad.
 * - La misma interfaz `FlightModel`, así que el HUD, la cámara, el sonido y
 *   las misiones no se enteran de que hay otro motor debajo.
 * - El avión se inclina al virar, aunque el giro no venga de la inclinación
 *   sino al revés. Se ve como un avión porque el ojo espera eso.
 * - Hay que rodar y coger velocidad para despegar. Esa parte se aprende
 *   desde el primer día, y es la que se lleva uno al peldaño siguiente.
 *
 * Ver `src/flight/tiers.ts`.
 */

import { Euler, Quaternion, Vector3 } from "three";
import { AIRE_ESTANDAR, type Aire, airDensity, GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { resistenciaDelTren } from "./tren";
import { fraccionDeLosFlaps, resistenciaDeLosFlaps } from "./flaps";
import {
  AGARRE_DEL_PEDAL,
  empujeLleno,
  empujeQueSostiene,
  giroDelPedal,
  MAX_PASO,
} from "./fdm";
import type {
  ControlInputs,
  FlightModel,
  FlightState,
  GroundSampler,
  InitialConditions,
  LoSacado,
} from "./model";
import { loQueDaElMotor, type AircraftConfig } from "./aircraft";

/**
 * Velocidad de crucero cómoda **a nivel del mar**, como fracción de la ficha.
 *
 * La cifra de crucero de un avión es verdad arriba, no abajo: un avión de línea
 * cruza a doscientos treinta metros por segundo a once kilómetros, donde el
 * aire es la cuarta parte de denso, y a ras de suelo no llega ni de lejos —se
 * lo impide la presión dinámica, que es lo que rompe estructuras—. Así que este
 * modelo sale de una fracción del crucero y **sube hasta el crucero entero con
 * la altura**. Ver `alturaDeCrucero` en la ficha.
 */
const CRUISE_FRACTION = 0.62;
/** Velocidad mínima rodando y a la que se separa del suelo, en m/s. */
const IDLE_SPEED = 2;

/**
 * Cuánto baja la velocidad mínima de vuelo con los flaps fuera.
 *
 * Un cuarto del coeficiente de sustentación que la ficha le da a sus flaps. Con
 * el Pykasu —0,55— eso son catorce centésimas: se vuela un catorce por ciento
 * más despacio, o sea unos cinco nudos menos de aproximación. Es la cifra que
 * dice el manual de cualquier avioneta y es lo que se nota cruzando el umbral.
 */
const MANDAN_LOS_FLAPS = 0.25;

/**
 * Y cuánto frenan **rodando**, con los de despegue puestos.
 *
 * Multiplicado por cuatro porque el coeficiente de la ficha es de resistencia
 * y aquí se usa contra una velocidad, no contra una fuerza. En el suelo se
 * queda como estaba: la carrera de este modelo está medida contra la de
 * `carrera.ts` con esta cuenta (ver `prestaciones-guyrami.test.ts`).
 *
 * **Volando ya no**: ahí lo sacado cuesta lo que cuesta en el modelo completo.
 * Ver `puntaConLoSacado` y `gasQueNiSubeNiBaja`.
 */
const FRENAN_LOS_FLAPS = 4;

/*
 * La reversa ya no frena aquí «la mitad del freno»: empuja hacia atrás lo que
 * empuja en el modelo de coeficientes, con la misma cuenta. Ver
 * `deceleracionRodando` en `flight/frenada.ts`, que es de donde sale ahora
 * toda la frenada de este modelo.
 */
export { REVERSA_HASTA } from "./frenada";

/**
 * Lo más lento que vuela, como fracción de la velocidad de aproximación.
 *
 * Nueve décimas: un poco por debajo de la que se cruza el umbral, que es
 * justo lo que significa «lo más lento que vuela».
 */
const MINIMA_DE_VUELO = 0.9;

/**
 * El gas que sostiene el vuelo nivelado, de 0 a 1.
 *
 * Por encima se sube sin tocar la palanca, por debajo se planea. Es el punto
 * de equilibrio del peldaño sencillo, y ponerlo por debajo de la mitad tiene
 * su motivo: quien juega aquí lleva el gas alto casi siempre, y lo que hay que
 * hacer notorio es **quitarlo**.
 */
/**
 * Por debajo de esta velocidad, una toma se da por acabada, m/s.
 *
 * Es velocidad de rodaje: a partir de ahí lo que venga es un despegue nuevo y
 * no el rebote del anterior.
 */
const RODANDO_TRAS_TOMAR = 12;

/**
 * Cuánto hay que haber volado para que un contacto sea una toma, m.
 *
 * Tres metros. Por debajo de eso no se ha volado: se ha dado un bote.
 *
 * Y la diferencia no es un matiz, es un avión que no despega. La regla de
 * «aterrizado es aterrizado» mira si las ruedas venían del aire, y en una
 * carrera de despegue el avión **se levanta un palmo y vuelve a tocar** —un
 * bache, una ráfaga, o tirar y soltar—. Ese palmo se apuntaba como toma, y a
 * partir de ahí el modelo se negaba a dejarlo subir hasta rodar por debajo de
 * doce metros por segundo... que es justo lo que no va a pasar, porque está
 * acelerando. Resultado medido en Mariscal Estigarribia: el avión recorre la
 * pista entera y dos kilómetros y medio de campo **con el gas a fondo y la
 * palanca atrás**, sin despegar y sin que nada lo explique.
 *
 * Desde la cabina eso es lo peor que puede pasar: estoy haciendo lo correcto
 * y no pasa nada. Tres metros es más que cualquier bote y menos que cualquier
 * vuelo.
 */
const VUELO_DE_VERDAD = 3;

/**
 * El gas que ni sube ni baja **con el avión limpio**, de 0 a 1. Con el tren o
 * los flaps fuera hace falta más: ver `gasQueNiSubeNiBaja`.
 */
export const MOTOR_QUE_SOSTIENE = 0.55;

/**
 * Qué parte del ascenso de este avión da el motor solo, sin tocar la palanca.
 *
 * Aquí había dos números para los seis aviones —«se baja 3,5 m/s al ralentí» y
 * «se sube 2,5 a todo gas»— y los dos eran de la avioneta. Con siete metros por
 * segundo de palanca, 2,5 son poco más de un tercio; esa proporción se queda, y
 * los metros los pone cada avión: `ascensoMaximo` lo que sube y `caidaSinMotor`
 * lo que baja. Ver `flight/carrera.ts`.
 *
 * Y el que baja distinto es el que se nota: el de fuselaje ancho planea plano y
 * aun así **baja a nueve metros por segundo**, porque avanza a ciento cuarenta.
 * «Esa bestia no da ese giro, no baja en corto» — pues no, y ahora tampoco en
 * el juego.
 */
const SUBE_SOLO = 0.36;

/** Cuánta holgura se permite para considerar que las ruedas siguen tocando, m. */
const PEGADO_AL_SUELO = 1;

/** Por debajo de esta velocidad, con el freno pisado, el avión se para. */
const STATIC_GRIP = 1.2;

/**
 * Lo menos que frena un avión al que no se le pisa el freno, m/s².
 *
 * Medio metro por segundo al cuadrado. El rozamiento de rodadura solo daría una
 * décima larga en asfalto —un avión de verdad rueda y rueda, y por eso hay que
 * frenar— y eso, en un juego donde se rueda hasta la cabecera, es una eternidad.
 * Medio incluye lo que no se modela aquí: el ralentí que ya no empuja, la
 * resistencia del aire y la hélice haciendo de freno.
 */
const SIN_FRENO = 0.5;

/**
 * Autoridad de la rueda de morro a paso de peatón, rad/s.
 *
 * El número está **ajustado contra una medida**, no elegido: a treinta por
 * hora, que es una velocidad de rodaje corriente, el radio de giro tiene que
 * dejar tomar la curva de una calle de rodaje. Con 0,75 salían cincuenta y dos
 * metros y las curvas no se podían tomar; el objetivo son veinte, que es lo
 * que gira una avioneta rodando.
 */
const GROUND_TURN = 1.9;

/**
 * Lo más que se puede tirar de lado rodando, m/s².
 *
 * **Es el número que faltaba, y sin él un avión giraba como un karting.**
 * Medido en el banco: a doce metros por segundo, con la ayuda de rodaje
 * mandando alerón, el avión giraba a cincuenta y cinco grados por segundo —o
 * sea, un radio de doce metros a cuarenta y tres por hora, más de un g de
 * lado—. Un avión así se sale de la calle o se apoya en un ala.
 *
 * El fallo era que la autoridad de la rueda de morro no dependía de la
 * velocidad más que para apagarse, así que el **radio** de giro se encogía
 * según se frenaba: al revés de como funciona cualquier cosa con ruedas.
 *
 * Seis, y el número está medido contra **la maniobra más cerrada que el juego
 * pide de verdad**: alinearse en la cabecera desde el punto de espera. Se
 * empezó en cuatro —el que sale de la calibración escrita más arriba, veinte
 * metros de radio a velocidad de rodaje— y en Silvio Pettirossi el avión no
 * llegaba a meterse en la pista: el banco de despegues lo cazó a la primera.
 *
 * Sigue siendo la mitad de lo que había, que era **más de un g**, y trae
 * consigo la lección de verdad, que no hacía falta inventar: **para girar hay
 * que ir despacio**. A paso de peatón el avión pivota; lanzado, no gira, y el
 * que se pasa la salida se pasa la salida.
 */
const DE_LADO_RODANDO = 6;

/**
 * **Y deprisa por la pista, lo del pedal.** Lo que se tira de lado con las
 * flechas va de `DE_LADO_RODANDO` rodando a `AGARRE_DEL_PEDAL` en la carrera,
 * entre quince y veintiocho metros por segundo: donde el modelo completo deja
 * de mandar con la rueda de morro y manda el pedal.
 *
 * En este peldaño las flechas son el volante a cualquier velocidad —quien lo
 * vuela tiene cuatro años y no va a buscar otra tecla—, pero a 130 nudos el
 * volante de verdad no se toca: lo que lleva el eje es el pedal, con poco
 * agarre y correcciones pequeñas. Con el agarre de rodar, un segundo de
 * flecha en la carrera del JAZ 120 giraba la proa cinco grados: «casi me
 * salgo por un lado de la pista».
 */
function agarreRodando(velocidad: number): number {
  const t = clamp01((velocidad - 15) / 13);
  return DE_LADO_RODANDO + (AGARRE_DEL_PEDAL - DE_LADO_RODANDO) * t;
}

/*
 * **El ritmo de viraje tiene que cuadrar con la inclinación que se dibuja**, o
 * el ojo aprende una cosa aquí y descubre otra en el peldaño siguiente. Iban
 * medio radián por segundo —dieciséis grados por segundo— con el avión
 * enseñando treinta de alabeo; con esa inclinación la física da siete, y para
 * girar a dieciséis harían falta cuarenta y seis. O sea que aquí se aprendía
 * que treinta grados es un giro rápido, y en Tukã se descubría lo contrario.
 *
 * Luego fue un cuarto de radián por segundo a fondo para todos, que cuadraba
 * con la avioneta a la velocidad de este modelo y con nadie más. Ahora el
 * viraje sale de la inclinación dibujada y de la velocidad, como en el avión
 * de al lado: ver el viraje en vuelo de `step`.
 */
/*
 * **El ascenso también lo pone el avión.**
 *
 * Aquí había siete metros por segundo para los seis: el doble de lo que sube
 * una avioneta de escuela y la mitad de lo que sube un avión de línea con poco
 * peso. Ahora sale del exceso de empuje sobre la resistencia —ver
 * `ascensoMaximo` en `carrera.ts`—, que es la cuenta de toda la vida, y así el
 * niño que cambia de avión nota que el grande sube como un ascensor.
 */
/**
 * Inclinación aparente en viraje a fondo, en radianes.
 *
 * Exportada porque la mano que sostiene la inclinación —`flight/mano.ts`—
 * pide aquí un alabeo y tiene que saber qué alerón lo da.
 */
export const VISUAL_BANK = 0.75;

export interface ArcadeOptions {
  aircraft: AircraftConfig;
  ground: GroundSampler;
}

import { ROZAMIENTO, type Superficie } from "../world/superficie";
import { radioDeGiro } from "./cabe";
import { topeDeVelocidad, type QuienManda } from "./limites";
import {
  ascensoMaximo,
  caidaSinMotor,
  carreraHastaVr,
} from "./carrera";
import {
  deceleracionRodando,
  frenoDelAutofreno,
  type MandosDeFrenada,
} from "./frenada";

export class ArcadeFlightModel implements FlightModel {
  readonly implementationName = "Modelo sencillo Óga Veve";
  readonly state: FlightState;

  private readonly aircraft: AircraftConfig;
  private readonly ground: GroundSampler;

  private heading = 0;
  /**
   * Lo que gira el rumbo ahora mismo, rad/s, positivo morro a la derecha.
   *
   * Se guarda porque el rumbo se mueve en dos sitios —rodando y volando— y lo
   * que el resto del juego pregunta es la velocidad de guiñada, no el rumbo.
   * Ver `yawRate` en `publicar`.
   */
  private guinada = 0;
  private speed = 0;
  /** Ha tocado tierra viniendo de volar y todavía no ha rodado despacio. */
  private haTocado = false;
  /** Si el fotograma anterior estaba volando. Para ver el instante del contacto. */
  private enElAire = false;
  /** Lo más alto que llegó a estar en este trozo de aire, m. Ver `VUELO_DE_VERDAD`. */
  private loQueSubio = 0;
  private climb = 0;
  private bank = 0;
  private pitch = 0;

  private readonly euler = new Euler(0, 0, 0, "YXZ");
  private readonly forward = new Vector3();

  constructor(options: ArcadeOptions) {
    this.aircraft = options.aircraft;
    this.ground = options.ground;
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

  /**
   * El empuje que se está dando, en newtons.
   *
   * Este modelo no calcula fuerzas —persigue una velocidad objetivo— así que
   * no hay un empuje que devolver: se reconstruye del gas y de la densidad,
   * que es de donde saldría. Es una estimación y se dice; lo que tiene que
   * cumplir es que gastar dependa del gas y de la altura, que es la lección.
   * Ver `flight/combustible.ts`.
   */
  empujeAhora(): number {
    if (!this.ultimoGas) return 0;
    const densidad =
      airDensity(this.state.position.y, this.aire) / airDensity(0);
    return (
      this.ultimoGas * this.aircraft.maxThrust * loQueDaElMotor(this.aircraft, densidad)
    );
  }

  /** Aquí el cabeceo no es un timón. Ver `timonAhora` en `model.ts`. */
  timonAhora(): number {
    return 0;
  }

  /** El gas del último paso, para `empujeAhora`. */
  private ultimoGas = 0;

  /**
   * **Qué alerón dibuja esta inclinación ahora**: la cuenta de `step`
   * despejada, como `mandoParaSubir`. El alerón dibuja `VISUAL_BANK` por lo
   * que muerde el mando a esta velocidad.
   *
   * Lo pregunta la mano del teclado —ver `flight/mano.ts`—, que pide
   * inclinaciones: sin esto, en la final del JAZ 120 se dibujaba la mitad de
   * lo que pedía, y al soltar la tecla la mano cogía lo dibujado como lo
   * pedido y se quedaba con la mitad.
   *
   * **Sin acotar**: más de uno quiere decir que a esta velocidad el alerón a
   * fondo no llega a dibujarla —despacio el mando no da más, que es la lección
   * de este peldaño—, y la mano lo usa para no pedir lo que no hay. Infinito
   * si el mando no muerde nada.
   */
  mandoParaInclinar(alabeo: number): number {
    const bite = clamp01((this.speed - IDLE_SPEED) / (this.punta() * 0.55));
    if (bite <= 0.01) return alabeo === 0 ? 0 : Math.sign(alabeo) * Infinity;
    return alabeo / (VISUAL_BANK * bite);
  }

  /**
   * **Qué palanca da este ritmo de subida ahora**, de −1 a 1.
   *
   * Es la cuenta de `step` despejada: aquí la palanca no gira el morro, es
   * cuánto se sube, y lo que sube además el motor —por encima del gas que
   * sostiene el nivel— hay que restarlo. Lo pregunta el piloto automático,
   * que en este modelo no tiene morro que buscar: pide el ritmo y ya. Ver
   * `Estado.subirCon` en `piloto-automatico.ts`.
   */
  mandoParaSubir(ritmo: number): number {
    const gas = this.ultimoGas;
    const cruise = this.punta();
    const bite = clamp01((this.speed - IDLE_SPEED) / (cruise * 0.55));
    if (bite <= 0.01) return 0;
    const sube = ascensoMaximo(this.aircraft);
    const motor = this.ritmoDelMotor(gas);
    const porPalanca = sube * (0.4 + 0.6 * gas);
    return clamp((ritmo / bite - motor) / Math.max(0.01, porPalanca), -1, 1);
  }

  // ── Lo que cuesta lo sacado ───────────────────────────────────────────

  /** Lo que se lleva sacado en el último paso: la palanca de flaps y el tren. */
  private sacado: LoSacado = { flaps: 0, tren: 1 };

  /**
   * **Lo más lento que vuela con estos flaps**, m/s: la mínima de vuelo de
   * siempre, que baja con lo que sostienen los flaps. Ver `MINIMA_DE_VUELO` y
   * `MANDAN_LOS_FLAPS`.
   *
   * **Y la resistencia no la baja.** Antes este suelo se multiplicaba también
   * por lo que frenaban los flaps y el tren, y una resistencia no hace volar
   * más despacio: hace falta más gas para la misma velocidad. Con tren y flaps
   * a tope el JAZ 60 de Guyrami bajaba al ralentí hasta **42 nudos**, y el
   * JAZ 20 hasta 37: menos que su pérdida. «Esta avioneta casi no baja»,
   * contado con ella a 45 nudos en la final. Un avión no vuela más despacio
   * que su pérdida con el gas que sea.
   */
  private sueloDeVuelo(flaps: number): number {
    return (
      this.aircraft.approachSpeed *
      MINIMA_DE_VUELO *
      (1 - this.aircraft.flapsLift * clamp01(flaps) * MANDAN_LOS_FLAPS)
    );
  }

  /**
   * **El gas que sostiene esta velocidad nivelado en el modelo completo**, sin
   * tope: más de uno quiere decir que ni a fondo. Las mismas fuerzas que en
   * `fdm.ts`: ver `empujeQueSostiene`.
   */
  private gasDelModeloCompleto(verdadera: number, s: LoSacado): number {
    const altura = this.state.position.y;
    const v = Math.max(1, verdadera);
    const lleno = empujeLleno(this.aircraft, airDensity(altura, this.aire), v);
    if (!(lleno > 0)) return Infinity;
    return (
      empujeQueSostiene(this.aircraft, {
        altura,
        verdadera: v,
        aire: this.aire,
        flaps: s.flaps,
        tren: s.tren,
        pendiente: 0,
      }) / lleno
    );
  }

  /**
   * **La punta con lo que se lleva sacado**, m/s: la de siempre, o lo que el
   * avión sostiene nivelado a fondo con eso fuera, si es menos.
   *
   * La punta de este modelo es la de subir a fondo —en los de hélice, más o
   * menos su velocidad de mejor ascenso—, y de ahí se restaba la resistencia
   * de lo sacado con una regla de tres. En los reactores salía bien: a ellos
   * les sobra empuje y su punta queda muy por encima de su final. En los de
   * hélice no: su final está cerca de su punta, y restando, el gas a fondo con
   * tren y flaps daba **menos que su propia velocidad de aproximación**. El
   * JAZ 60 en Guyrami, flaps en el segundo punto, tren fuera y los dos motores
   * a cien: 89 nudos, para una marca de 98. «Me pide 98, pero no paso de 89.»
   * Con tren y flaps de aterrizar, 68.
   *
   * Lo de verdad es lo contrario: todo avión certificado tiene que poder
   * **subir** a fondo con tren y flaps de aterrizar a su Vref —un 3,3 % la
   * avioneta, un 3,2 % el de cercanías y el de transporte: 14 CFR 23.77 y
   * 25.119—, así que nivelado va más deprisa que su final. Así que ahora el
   * gas a fondo da lo que el avión sostiene nivelado con eso sacado, con las
   * fuerzas del modelo completo, y nunca más que su punta: el JAZ 60 con todo
   * fuera, 103 nudos a 1.500 pies para una final de 98, y el modelo completo
   * dice lo mismo. Ver `aproximacion-por-tipo.test.ts`.
   *
   * Sin tope de abajo: si con eso sacado no sostiene ni la mínima de vuelo, la
   * mínima. Lo pregunta también la marca de velocidad, que no pide más de lo
   * que el avión da con lo que lleva fuera.
   */
  puntaConLoSacado(s: LoSacado = this.sacado): number {
    const punta = this.punta();
    if (this.gasDelModeloCompleto(punta, s) <= 1) return punta;
    const suelo = this.sueloDeVuelo(s.flaps);
    if (punta <= suelo) return suelo;
    /*
     * La resistencia con la velocidad es una U —abajo la inducida, arriba la
     * parásita—, así que se busca primero el fondo y desde ahí, por la rama de
     * la derecha, dónde deja de llegar el gas a fondo.
     */
    let fondo = suelo;
    let menos = this.gasDelModeloCompleto(suelo, s);
    const PASOS = 12;
    for (let i = 1; i <= PASOS; i++) {
      const v = suelo + ((punta - suelo) * i) / PASOS;
      const g = this.gasDelModeloCompleto(v, s);
      if (g < menos) {
        menos = g;
        fondo = v;
      }
    }
    if (menos > 1) return suelo;
    let llega = fondo;
    let noLlega = punta;
    for (let i = 0; i < 20; i++) {
      const v = (llega + noLlega) / 2;
      if (this.gasDelModeloCompleto(v, s) <= 1) llega = v;
      else noLlega = v;
    }
    return llega;
  }

  /**
   * **El gas que ni sube ni baja con lo que se lleva sacado**, a esta
   * velocidad, de 0 a 1 o algo más: limpio, `MOTOR_QUE_SOSTIENE`; con el tren
   * y los flaps fuera, más.
   *
   * La recta del motor —por encima de este gas se sube, por debajo se baja—
   * tenía el mismo punto con el avión limpio que con todo fuera, y con lo
   * sacado ese punto quedaba muy por debajo del gas que pide la final: el
   * JAZ 20 en Guyrami, a su velocidad de final con los flaps abajo, llevaba
   * el gas por encima del de subir. Quitando gas se iba más despacio y no se
   * bajaba: «esta avioneta casi no baja».
   *
   * Lo sacado se come una parte de lo que sobra de empuje, y esa parte se
   * cuenta con el modelo completo a esta velocidad: lo que pide de más con eso
   * fuera, entre lo que sobra limpio. Esa misma parte sube aquí el gas que ni
   * sube ni baja. A la punta con lo sacado se come todo lo que sobraba, así que
   * ahí el gas a fondo vuela recto, como dice `puntaConLoSacado`.
   */
  gasQueNiSubeNiBaja(s: LoSacado = this.sacado, verdadera = this.speed): number {
    const limpio = this.gasDelModeloCompleto(verdadera, { flaps: 0, tren: 0 });
    const con = this.gasDelModeloCompleto(verdadera, s);
    const sobra = 1 - limpio;
    const come = sobra > 0.02 ? clamp((con - limpio) / sobra, 0, 2) : 0;
    return MOTOR_QUE_SOSTIENE + (1 - MOTOR_QUE_SOSTIENE) * come;
  }

  /**
   * **Lo que sube o baja el motor solo**, m/s, sin tocar la palanca: la recta
   * del motor de `step`, con su punto en `gasQueNiSubeNiBaja`.
   *
   * Por debajo, hasta el planeo al ralentí, que con lo sacado es más empinado:
   * a la misma velocidad, cada newton de resistencia de más es `V·ΔD/W` de
   * caída de más. Es para lo que se sacan los flaps: bajar más empinado sin
   * coger velocidad. Por encima, hasta lo que sube a fondo, menos lo que se
   * come lo sacado.
   */
  private ritmoDelMotor(gas: number): number {
    const nivelado = this.gasQueNiSubeNiBaja();
    if (gas >= nivelado)
      return (
        ((gas - nivelado) / (1 - MOTOR_QUE_SOSTIENE)) *
        (ascensoMaximo(this.aircraft) * SUBE_SOLO)
      );
    const v = Math.max(1, this.speed);
    const deMas =
      resistenciaDeLosFlaps(this.aircraft, this.sacado.flaps) +
      resistenciaDelTren(
        this.aircraft,
        this.sacado.tren,
        fraccionDeLosFlaps(this.aircraft, this.sacado.flaps),
      );
    const caida =
      caidaSinMotor(this.aircraft, v) +
      (v * 0.5 * SEA_LEVEL_DENSITY * v * v * this.aircraft.wingArea * deMas) /
        (this.aircraft.mass * GRAVITY);
    return ((gas - nivelado) / nivelado) * caida;
  }

  setOnRunway(enPista: boolean): void {
    this.state.onRunway = enPista;
  }

  /**
   * Aquí no se rompe nada, y es a propósito.
   *
   * Este peldaño empieza a los cuatro años y su regla es que no se puede
   * perder. Contra un edificio, el juego se encarga: el avión no lo atraviesa
   * y se queda ahí. Ver `Game.mirarSiChocaConAlgo`.
   */
  /**
   * El modelo sencillo **no tiene viento**, y es a propósito.
   *
   * Aquí el gas *es* la velocidad: no hay fuerzas, no hay masa y no hay
   * velocidad respecto al aire. Meter un viento sería inventarse una cuenta que
   * este modelo no hace, y el peldaño de los cuatro años tampoco la necesita —
   * lo que enseña es tirar, virar y posarse.
   *
   * El viento sigue existiendo en su mundo: la manga se mueve, la torre elige
   * cabecera con él y el panel lo cuenta. Lo que no hace es empujar el avión.
   */
  ponerViento(): void {}

  /** El aire del día. Ver `ponerAire` en `model.ts`: aquí no mueve la física. */
  private aire: Aire = AIRE_ESTANDAR;

  ponerAire(aire: Aire): void {
    this.aire = aire;
  }

  aireDelDia(): Aire {
    return this.aire;
  }

  /**
   * La ráfaga, en el peldaño que no tiene fuerzas.
   *
   * Aquí el gas **es** la velocidad y no hay viento —ver `ponerViento`, que no
   * hace nada a propósito—, así que una ráfaga no puede entrar como vector: el
   * modelo no sabría qué hacer con ella. Entra como lo que se nota: **el
   * bache**. Se guarda la vertical y `step` la suma al ascenso.
   *
   * Y solo la vertical. Un empujón de lado en un modelo donde el rumbo lo lleva
   * el mando sería el avión girando solo, que a los cuatro años es un mando
   * roto; un bache es el mundo moviéndose, que es lo que es.
   */
  ponerRacha(_x: number, y: number): void {
    this.bache = y;
  }

  /** El bache de ahora mismo, m/s. Ver `ponerRacha`. */
  private bache = 0;

  romper(): void {}

  reset(initial: InitialConditions): void {
    this.heading = initial.heading;
    // Avión recolocado, avión que no viene girando de antes.
    this.guinada = 0;
    this.speed = initial.airspeed;
    this.climb = 0;
    this.bank = 0;
    this.pitch = 0;
    this.state.position.copy(initial.position);
    this.state.crashed = false;
    this.state.stalled = false;
    this.state.stallWarning = false;
    this.state.touchdownSinkRate = 0;
    this.apply(0);
  }

  /**
   * Aquí la cuenta es exacta, porque el gas **es** la velocidad: se despeja de
   * la misma recta que usa `step` para saber a qué velocidad ir.
   */
  /**
   * Aquí no hay vez y media de nada: el abanico entero va de nueve décimas de
   * la velocidad de aproximación a dos tercios del crucero. Se entra por
   * arriba de ese abanico, que es lo más rápido que este modelo sabe volar, y
   * así el avión **se sostiene** en vez de frenar solo hasta su techo.
   */
  /** Dos tercios del crucero, que es donde este modelo se planta. */
  /** De qué está hecho el suelo de debajo. Ver `ponerSuperficie` en el modelo. */
  private superficie: Superficie = "asfalto";

  /**
   * **Y aquí el suelo se nota en lo que cuesta.**
   *
   * Este modelo no tiene fuerzas: el gas *es* la velocidad. Así que rodar por
   * hierba no puede frenar con un coeficiente, pero sí puede costar más de lo
   * que cuesta sobre asfalto — acelerar más despacio y perder un poco de punta,
   * que es lo que se nota al despegar de un campo blando.
   */
  ponerSuperficie(superficie: Superficie): void {
    this.superficie = superficie;
  }

  /** Si la pista está mojada. Ver `ponerPistaMojada` en el modelo. */
  private pistaMojada = false;

  /** El freno que ve la rueda ahora, de 0 a 1: el del pie o el del autofreno. */
  private frenoDeAhora = 0;

  /** Lo que está frenando la rueda, de 0 a 1. Lo mira el cuadro. */
  frenoEnLaRueda(): number {
    return this.frenoDeAhora;
  }

  ponerPistaMojada(mojada: boolean): void {
    this.pistaMojada = mojada;
  }

  /**
   * Lo más rápido que va este avión **aquí**, en metros por segundo.
   *
   * Abajo, la fracción de siempre; a su altura de crucero, la cifra entera de
   * su ficha. En medio, lo que toque.
   *
   * Esto contesta a una queja concreta: «el 747 no pasaba de unos 500 km/h
   * cuando ese pájaro pasa de los 800». Las dos cosas son verdad y no se
   * contradicen — 500 a ras de suelo y 828 a once kilómetros son el mismo
   * avión—, y hasta hoy el juego solo sabía la primera. Con esto, subir sirve
   * para algo y el niño lo descubre volando.
   */
  private punta(altura = this.state.position.y): number {
    const alto = clamp01(altura / this.aircraft.alturaDeCrucero);
    return (
      this.aircraft.cruiseSpeed *
      (CRUISE_FRACTION + (1 - CRUISE_FRACTION) * alto)
    );
  }

  /**
   * El tope de verdad **también aquí**, aunque este modelo no llegue nunca.
   *
   * Guyrami tiene su propia punta —el gas es la velocidad y sube con la altura
   * hasta el crucero de la ficha— así que en la práctica no toca Vmo jamás. Se
   * responde igual porque el juego pregunta lo mismo a los dos modelos, y un
   * peldaño que conteste `Infinity` obliga a quien pregunta a saber en cuál
   * está. Ver `flight/limites.ts`.
   */
  limiteDeVelocidad(): number {
    return topeDeVelocidad(this.aircraft, this.state.position.y, this.aire)
      .verdadera;
  }

  quienLimita(): QuienManda {
    return topeDeVelocidad(this.aircraft, this.state.position.y, this.aire)
      .manda;
  }

  velocidadMaxima(): number {
    return this.punta();
  }

  /**
   * La punta de este avión **en el suelo y en esta superficie**, m/s.
   *
   * Es la velocidad a la que tiende la carrera, y tiene que ser la misma en la
   * cuenta del ritmo y en el paso del modelo. No lo era: el ritmo se calculaba
   * contra la punta de asfalto y la carrera tendía a la de hierba, que es un
   * siete por ciento menor. Parece poco y no lo es — cuanto más cerca está la
   * velocidad de rotación de la punta, más tarda en llegar: en hierba la
   * carrera salía 331 m contra los 266 que dice la física, un veinticinco por
   * ciento larga. Ver `blando` en `step`.
   */
  private puntaEnElSuelo(): number {
    const cuesta = ROZAMIENTO[this.superficie] / ROZAMIENTO.asfalto;
    return (
      this.aircraft.cruiseSpeed * CRUISE_FRACTION * (1 - (cuesta - 1) * 0.05)
    );
  }

  /**
   * Y el de la carrera de despegue, en 1/s.
   *
   * Yendo hacia la punta `V`, la velocidad es `V(1−e^{−kt})` y la distancia
   * hasta llegar a `v` sale `(V/k)·(−ln(1−v/V) − v/V)`. Despejando `k` con los
   * metros que dice `carreraHastaVr`, la carrera de este modelo dura lo que
   * dura la de verdad.
   *
   * Si la punta de este modelo no llega a la velocidad de rotación —no pasa con
   * ningún avión de la flota, pero pasaría con uno mal fichado— se deja el
   * ritmo de antes en vez de dividir por cero.
   */
  private ritmoDeCarrera(): number {
    const punta = this.puntaEnElSuelo();
    const r = this.aircraft.rotationSpeed / punta;
    const metros = carreraHastaVr(this.aircraft, this.superficie);
    if (r >= 0.98 || !Number.isFinite(metros) || metros <= 0) return 0.18;
    return (punta * (-Math.log(1 - r) - r)) / metros;
  }

  /**
   * Ocho metros por segundo, y aquí sí hay un número escrito a mano.
   *
   * Este modelo no rompe el avión nunca —es el peldaño de los cuatro años, y
   * ahí romperlo por una toma firme sería castigar justo lo que se está
   * aprendiendo—, así que su límite no sale de ninguna cuenta de estructuras:
   * es el punto a partir del cual aquello ya no fue aterrizar sino **meter el
   * avión contra el suelo**. Ocho por segundo son mil seiscientos pies por
   * minuto: eso no se hace sin querer.
   *
   * Y ha de ser holgado de verdad. Bajando por la senda con el gas al mínimo,
   * este modelo se posa a tres metros por segundo sin que nadie haga nada
   * raro, que es lo normal en un avión sin recogida: un límite en cuatro
   * convertía en accidente el aterrizaje corriente de cualquier crío.
   */
  limiteDeCaida(): number {
    return 8;
  }

  velocidadDeEntradaEnFinal(): number {
    // A ras de suelo, que es donde se entra en final: la altura no pinta nada.
    return this.aircraft.cruiseSpeed * CRUISE_FRACTION * 0.94;
  }

  /**
   * La cuenta de `step` al revés, **con lo que se lleva sacado**: entre la
   * mínima de vuelo de esos flaps y la punta con eso fuera. Sin lo sacado se
   * pedía el gas del avión limpio, y los gases de la final de Guyrami, que van
   * derechos a este número, se quedaban cortos con tren y flaps. Ver
   * `puntaConLoSacado`.
   */
  gasPara(velocidad: number, sacado: LoSacado = this.sacado): number {
    const suelo = this.sueloDeVuelo(sacado.flaps);
    const punta = this.puntaConLoSacado(sacado);
    if (punta <= suelo) return 1;
    return Math.max(0, Math.min(1, (velocidad - suelo) / (punta - suelo)));
  }

  /**
   * Rodando la cuenta es exacta y además es otra: en el suelo el abanico del
   * gas no arranca en la mínima de vuelo —ahí no hay mínima de vuelo, hay
   * cero—, así que el gas es la fracción del crucero y ya está. Es la misma
   * recta que usa `step` cuando `onGround`.
   *
   * Y sin `desde`: aquí el gas **es** la velocidad, y el modelo ya la
   * alcanza a su paso. Ver `gasParaRodar` en `model.ts`.
   */
  gasParaRodar(velocidad: number): number {
    // En el suelo no hay altura que valga: la punta es la de abajo.
    const cruise = this.aircraft.cruiseSpeed * CRUISE_FRACTION;
    return Math.max(0, Math.min(1, velocidad / cruise));
  }

  step(dt: number, controls: ControlInputs): void {
    // El mismo tope que el modelo completo y que el bucle del juego, y por el
    // mismo motivo. Eran **tres** copias del mismo número: se arreglaron dos y
    // esta se quedó, que es justo la del primer peldaño — el que más se juega.
    // Ver `MAX_PASO`.
    const step = Math.min(dt, MAX_PASO);
    const cruise = this.state.onGround
      ? this.aircraft.cruiseSpeed * CRUISE_FRACTION
      : this.punta();

    // La velocidad la lleva el gas, sin más. Nada de empuje contra
    // resistencia: se va hacia la velocidad pedida y ya está.
    // En el aire hay un suelo de velocidad, porque un avión no puede
    // pararse volando. **En tierra no**: con el motor a cero, cero. Ese
    // suelo aplicado también rodando era lo que hacía que el avión se
    // paseara solo por la pista después de frenar — «como que quiere
    // caminar», que es exactamente lo que hacía.
    /*
     * **En el aire, el suelo de velocidad es el de vuelo, no el de peatón.**
     *
     * Estaba en `IDLE_SPEED`, dos metros por segundo, y eso quiere decir que
     * quitando gas el avión frenaba hasta siete kilómetros por hora **y se
     * quedaba ahí, volando**. «Si pongo la velocidad mínima, me paro en el
     * aire.» «Esto va como una tortuga.»
     *
     * Un avión no puede ir despacio. Ese es el hecho que este peldaño tiene
     * que enseñar aunque no haya pérdida: no te caes —a los cuatro años no
     * puedes caerte del cielo— pero **tampoco puedes pararte**. El mando del
     * gas en el aire recorre de la velocidad mínima de vuelo al crucero, y
     * fuera de ese rango no hay nada que recorrer.
     *
     * Sale de la ficha del avión, de su velocidad de aproximación: un poco por
     * debajo de la que se cruza el umbral es lo más lento que vuela.
     */
    /*
     * **Y los flaps, que en este modelo no hacían absolutamente nada.**
     *
     * El mando existía —tecla y botón de cabina—, la aguja se movía y el avión
     * no se enteraba: `flaps` no aparecía ni una vez en este fichero. El motor
     * de coeficientes sí los usaba, así que en los peldaños de arriba volaban y
     * en el de los pequeños no. Se dijo jugando, y sin rodeos: «los flaps no
     * funcionan».
     *
     * Hacen las dos cosas que hacen de verdad, y las dos salen de la ficha del
     * avión —`flapsLift` y `flapsDrag`— y no de un número inventado:
     *
     * - **Se vuela más despacio.** El suelo de velocidad en vuelo baja, que es
     *   para lo que se ponen: cruzar el umbral más lento y tocar más corto.
     * - **Y cuestan gas.** Con tren y flaps hace falta más gas para la misma
     *   velocidad y para no bajar, y se baja más empinado sin coger
     *   carrerilla: lo que cuestan es lo que cuestan en el modelo completo.
     *   Ver `puntaConLoSacado` y `gasQueNiSubeNiBaja`.
     */
    const flaps = clamp01(controls.flaps);
    this.sacado = { flaps, tren: clamp01(controls.tren) };
    const gas = controls.engineOn ? controls.throttle : 0;
    this.ultimoGas = gas;
    let wanted: number;
    if (this.state.onGround) {
      /*
       * **Rodando, como estaba**: del cero a la punta del suelo, y los flaps
       * de despegue frenan con su regla de tres. El tren no: lo que cuesta ya
       * está dentro de la carrera —`carreraHastaVr` lo cuenta, y de ahí sale
       * el ritmo de este modelo en el suelo—, y contarlo aquí otra vez
       * alargaría la carrera dos veces por lo mismo.
       */
      wanted =
        gas * cruise * (1 - resistenciaDeLosFlaps(this.aircraft, flaps) * FRENAN_LOS_FLAPS);
    } else {
      /*
       * **Volando, de la mínima de esos flaps a la punta con lo sacado**, en
       * línea recta con el gas. Limpio es lo de siempre; con el tren y los
       * flaps fuera, el gas a fondo da lo que el avión sostiene nivelado con
       * eso fuera. Ver `sueloDeVuelo` y `puntaConLoSacado`.
       */
      const suelo = this.sueloDeVuelo(flaps);
      const punta = Math.max(suelo, this.puntaConLoSacado(this.sacado));
      wanted = suelo + gas * (punta - suelo);
    }
    // Constante de tiempo de unos cinco segundos y medio. Con la primera,
    // mucho más rápida, el avión llegaba a velocidad de vuelo en menos de dos
    // segundos y despegaba sin carrera: se perdía justo la parte que sí se
    // lleva uno al peldaño siguiente, que es que hay que correr para volar.
    // Rodando, el freno **baja el objetivo hasta cero**; no se limita a
    // acelerar el ajuste. Como estaba, frenar solo hacía llegar antes a la
    // velocidad de ralentí y el avión seguía rodando indefinidamente: se
    // aterrizaba y no había manera de parar. Un freno que no para el avión
    // no es un freno.
    const target = this.state.onGround
      ? wanted * (1 - controls.brakes)
      : wanted;
    // Acelerar cuesta; frenar, no. Iban al mismo ritmo, y con una constante
    // de más de cinco segundos eso significa que al quitar gas el avión
    // seguía corriendo un buen rato: quien lo probaba juraba que aceleraba
    // solo, y en cierto modo era verdad — todavía estaba llegando al destino
    // que le habían pedido diez segundos antes.
    //
    // En un avión de verdad la asimetría es aún mayor: el empuje tarda en
    // subir y la resistencia frena en cuanto se suelta.
    const frenando = target < this.speed;
    /*
     * **Y el ritmo lo pone el avión, no una constante.**
     *
     * Aquí había dos números —0,55 para frenar en el suelo y 0,18 para todo lo
     * demás— y eran los mismos para los seis aviones. Medido con el banco:
     *
     * ```
     *              frenada de la toma a parado      carrera hasta rotar
     *   jaz-20         9 m   (la cuenta: 157)        133 m  (225)
     *   jaz-120       21 m   (la cuenta: 840)        255 m  (1.424)
     * ```
     *
     * O sea que **el avión de fuselaje ancho paraba en veintiún metros**, poco
     * más que su propio largo, y despegaba en doscientos cincuenta. Quien lo
     * jugó lo dijo antes que el banco: «frené el 747 en Los Rodeos en una
     * distancia muy poco creíble; cuando se aterriza con un bicho de este
     * tamaño, el avión se está un rato para perder velocidad y se come un buen
     * tramo de pista».
     *
     * La forma de este modelo es un retardo de primer orden, y de ahí sale el
     * ritmo con una cuenta cerrada: yendo hacia cero, la distancia recorrida es
     * `v/k`, así que para parar en los metros que dice la física basta con
     * `k = v/metros`. Acelerando hacia la punta sale la misma integral con un
     * logaritmo. Los metros los pone `flight/carrera.ts`, que es el mismo sitio
     * del que salen la pista que hace falta y el veredicto de si el avión cabe
     * — o sea que **frenar, caber y despegar dejan de ser tres opiniones**.
     */
    const base =
      this.state.onGround && !frenando ? this.ritmoDeCarrera() : 0.18;
    /*
     * **Y sobre hierba se acelera peor y se frena solo.**
     *
     * El coeficiente de rodadura de la superficie —dos centésimas en asfalto,
     * cinco en hierba, nueve en campo— aquí no puede entrar como fuerza,
     * porque este modelo no tiene fuerzas. Entra como lo que se nota: cuesta
     * más llegar a la velocidad pedida, y al soltar el gas el avión se para
     * antes. Una pista de hierba pide más carrera, que es lo que pasa de
     * verdad y por lo que un piloto mira de qué es la pista antes de ir.
     */
    const cuesta = ROZAMIENTO[this.superficie] / ROZAMIENTO.asfalto;
    /*
     * Sobre asfalto esto vale uno y no cambia nada, que es como tiene que ser:
     * toda la calibración de este modelo se hizo sobre asfalto. Sobre hierba
     * el mismo gas da un siete por ciento menos de punta y se acelera peor.
     *
     * **Y los dos números juntos dan lo que dice el manual**: una pista de
     * hierba seca y corta pide entre un quince y un treinta por ciento más de
     * carrera de despegue que una de asfalto. Medido en Yvytu Rape con el
     * banco de despegue, que es de donde salen los exponentes.
     */
    const blando = this.state.onGround ? 1 - (cuesta - 1) * 0.05 : 1;
    /*
     * **La hierba ya no entra dos veces.** Lo que cuesta acelerar en un campo
     * blando lo dice ya `carreraHastaVr` con el rozamiento de la superficie, y
     * eso está dentro del ritmo. Lo que queda aquí es solo la punta, que también
     * baja un poco: ver `blando`.
     */
    const suelo = 1;
    const rate = base * suelo;
    if (this.state.onGround && frenando) {
      /*
       * **Frenar es una deceleración, no un ritmo.**
       *
       * El resto de este modelo va hacia la velocidad pedida con un retardo, y
       * para acelerar eso es exactamente la forma correcta —el empuje pelea
       * contra la resistencia y la diferencia se encoge—. Para frenar no: un
       * avión frenando pierde velocidad a un ritmo **casi constante**, y un
       * retardo exponencial nunca llega a cero, así que el avión reptaba.
       *
       * **Y la deceleración es la del modelo de coeficientes**, no una media.
       * Aquí había una sola, sacada de los metros de parada desde la
       * velocidad de toma, igual desde el primer instante: el avión frenaba
       * lo mismo con el ala sosteniéndolo que parado, y lo mismo con los
       * frenos de tierra fuera que sin ellos. Ahora este modelo, que no tiene
       * fuerzas, pregunta a `deceleracionRodando` cuánto frena el avión a esta
       * velocidad con lo que lleva puesto —el pie, los frenos de tierra, la
       * reversa, los flaps— y en esta pista seca o mojada. Es la misma cuenta
       * que integra `carrera.ts`, así que los dos peldaños paran en los mismos
       * metros.
       *
       * La reversa va dentro: frena aparte de las ruedas —el chorro se desvía
       * hacia delante, o la hélice cambia el paso— y se apaga sola por debajo
       * de `REVERSA_HASTA`, como en un avión de verdad.
       */
      const mandos: MandosDeFrenada = {
        freno: controls.brakes,
        frenosDeTierra: controls.frenosDeTierra ?? 0,
        reversa: controls.reversa,
        flaps: controls.flaps,
        tren: controls.tren,
      };
      const sueloDeFrenada = {
        superficie: this.superficie,
        mojada: this.pistaMojada,
      };
      let freno = clamp01(controls.brakes);
      const objetivo = controls.autofreno ?? 0;
      if (objetivo > 0) {
        // El autofreno: lo que falta hasta su deceleración. Ver
        // `frenoDelAutofreno`.
        const sinFreno = deceleracionRodando(
          this.aircraft,
          this.speed,
          { ...mandos, freno: 0 },
          sueloDeFrenada,
        );
        const aFondo = deceleracionRodando(
          this.aircraft,
          this.speed,
          { ...mandos, freno: 1 },
          sueloDeFrenada,
        );
        freno = Math.max(freno, frenoDelAutofreno(objetivo, sinFreno, aFondo));
      }
      this.frenoDeAhora = freno;
      const decel = Math.max(
        SIN_FRENO,
        deceleracionRodando(
          this.aircraft,
          this.speed,
          { ...mandos, freno },
          sueloDeFrenada,
        ),
      );
      this.speed = Math.max(target * blando, this.speed - decel * step);
    } else {
      this.frenoDeAhora = this.state.onGround ? clamp01(controls.brakes) : 0;
      this.speed += (target * blando - this.speed) * Math.min(1, step * rate);
    }
    // Rozamiento estático. Un decaimiento exponencial se acerca a cero para
    // siempre y nunca llega, y lo que se ve en pantalla es un avión que
    // repta eternamente después de frenar. Un avión parado está parado.
    if (
      this.state.onGround &&
      Math.max(controls.brakes, this.frenoDeAhora) > 0.5 &&
      this.speed < STATIC_GRIP
    )
      this.speed = 0;

    // Con poca velocidad los mandos no muerden, que es la única lección de
    // aerodinámica que este peldaño enseña: hay que correr para volar.
    const bite = clamp01((this.speed - IDLE_SPEED) / (cruise * 0.55));

    if (this.state.onGround) {
      // **Rodando se gira con la rueda de morro, no con las alas.**
      //
      // Faltaba entero: en tierra el viraje se calculaba con la misma cuenta
      // que en el aire, y esa cuenta se apoya en la velocidad. Parado o
      // rodando despacio el avión no giraba nada, así que abortar un
      // despegue y volver a la cabecera era imposible sin reiniciar.
      //
      // Y va al revés que en vuelo: la rueda manda mucho a paso de peatón y
      // deja de mandar cuando se coge carrerilla, que es cuando toma el
      // relevo el timón. Por eso un avión rodando gira cerrado y en la
      // carrera de despegue va prácticamente recto.
      // **La autoridad no se apaga desde el primer metro.** Antes decaía desde
      // parado, así que a treinta por hora —una velocidad de rodaje de lo más
      // normal— el radio de giro era de cincuenta y cinco metros y las curvas
      // de las calles de rodaje sencillamente no se podían tomar. Medido.
      //
      // Una rueda de morro de verdad manda entera hasta bien entrado el
      // rodaje y solo deja de mandar al coger carrerilla. Así que va plena
      // hasta ocho metros por segundo y se apaga a los veintiocho, que es
      // cuando ya toma el relevo el timón.
      /*
       * **Un avión parado no gira, y uno rodando gira lo que le deja su tren.**
       *
       * Aquí el tope era `GROUND_TURN` —1,9 rad/s, ciento nueve grados por
       * segundo— **a cualquier velocidad, incluida cero**. Parado y tocando una
       * flecha, el avión pivotaba sobre sí mismo como una peonza: «cuando estás
       * en tierra y le doy a las flechas el avión pega un giro de la hostia,
       * sobre todo parado». Y en marcha lenta pasaba lo contrario: el mando
       * perdía autoridad con la velocidad y el radio se abría a veintiocho
       * metros, «menos rango de giro que un Hummer».
       *
       * Las dos cosas se arreglan con la misma cuenta, que es la del coche:
       * **la velocidad de giro es la velocidad dividida por el radio**. El
       * radio más cerrado sale de la batalla del avión y del ángulo de su rueda
       * de morro —`radioDeGiro`, el mismo que usa el motor de coeficientes y el
       * mismo con el que el juego decide si un avión puede darse la vuelta en
       * una pista—, así que un cuatrimotor con veinticinco metros de batalla
       * gira ancho y una avioneta gira sobre la punta del ala, como en la vida.
       *
       * Y encima de eso, el tope de siempre: no se puede tirar de lado más de
       * lo que agarran las ruedas. Ver `DE_LADO_RODANDO`. A paso de peatón
       * manda la geometría y lanzado manda el agarre.
       *
       * Parado, las dos dan cero: un avión no se gira a sí mismo con la rueda
       * de morro, hay que rodar. Eso es lo que hace que quien juega descubra
       * que para maniobrar hay que moverse, que es la lección del rodaje.
       */
      const porLaRueda = this.speed / Math.max(0.5, radioDeGiro(this.aircraft));
      const porElAgarre = agarreRodando(this.speed) / Math.max(1, this.speed);
      const tope = Math.min(GROUND_TURN, porLaRueda, porElAgarre);
      /*
       * **Y el pedal, que aquí no hacía nada.** En este modelo el timón no
       * existía: ni en el aire ni en el suelo. Enrique, en la carrera del JAZ
       * 120 en Guyrami: «casi voy a por el martillo a ver si el timón se
       * enteraba de que estaba moviendo fino el avión para estabilizarlo». Y
       * en la carrera de un avión de verdad es justo el pedal lo que lleva el
       * eje: el volante de la rueda de morro no se toca deprisa. Gira lo mismo
       * que en el modelo completo: ver `giroDelPedal` en `fdm.ts`.
       */
      const giro = clamp(
        controls.aileron * tope + controls.rudder * giroDelPedal(this.speed),
        -tope,
        tope,
      );
      this.heading += giro * step;
      this.guinada = giro;
      // Y sin inclinar el avión, que en el suelo tiene las ruedas puestas.
      this.bank += (0 - this.bank) * Math.min(1, step * 5);
    } else {
      /*
       * Viraje en vuelo: el alerón pide una inclinación y el rumbo gira lo que
       * da con ella un viraje coordinado, `ω = g·tan φ / V`. El morro gira al
       * momento y el ala dibujada acompaña un pelo después; en un avión de
       * verdad es al revés, pero lo que ve el ojo es lo mismo, y así la tecla
       * responde enseguida.
       *
       * Giraba con el alerón a un ritmo fijo —un cuarto de radián por segundo
       * a fondo— y se dibujaba la inclinación a juego, que cuadraba con la
       * física para la avioneta a la velocidad de este modelo y para nadie
       * más: el JAZ 120 en la final, con tres grados de ala, giraba dos veces
       * y media lo de verdad. Mientras volaba la final a ochenta nudos —la
       * mitad de lo suyo, porque el gas no contaba lo sacado: ver `gasPara`—
       * no se notaba tanto; a su velocidad, un piloto que corrige a toques se
       * pasaba de lado a lado del eje sin llegar a meterse. Con la cuenta del
       * viraje coordinado la inclinación que se ve es la que gira, en todos y
       * a cualquier velocidad, que es lo que el número de antes quería: ver
       * la nota sobre el ritmo de viraje, más arriba.
       */
      const inclinacion = controls.aileron * VISUAL_BANK * bite;
      this.bank += (inclinacion - this.bank) * Math.min(1, step * 3.5);
      this.guinada = (GRAVITY * Math.tan(inclinacion)) / Math.max(this.speed, 10);
      this.heading += this.guinada * step;
    }

    /*
     * Ascenso. **Rodando no se sube hasta tener velocidad para ello, y solo
     * desde la pista.**
     *
     * Lo segundo no es física: es la regla del juego. Con solo la velocidad,
     * desde la plataforma de Tenerife se llegaba a los setenta y dos por hora
     * en unos segundos y se despegaba de allí mismo — «de nada que le dé
     * potencia y se mueva, elevo y vuelo; ni la calle de rodadura tengo que
     * alcanzar». Eso rompe la lección entera: el rodaje, la doble raya, la
     * torre y la cabecera dejan de tener sentido si se puede saltar todo.
     *
     * Y la regla es de las que se entienden a los cuatro años sin explicarla:
     * **los aviones despegan de las pistas.**
     *
     * Va solo en este modelo, que es el de los peldaños de abajo. En el de
     * coeficientes manda la física, y allí un avión que consiga volar desde una
     * calle de rodaje ha volado — lo que le espera es que la torre se lo diga.
     */
    /*
     * **Aterrizado es aterrizado: no se vuelve a despegar rebotando.**
     *
     * La regla de arriba —se despega de las pistas y con velocidad— vale para
     * un despegue, y después de una toma se volvía en contra: quien aterriza
     * con el motor puesto sigue teniendo velocidad de sobra y asfalto debajo,
     * así que el avión se levantaba otra vez solo. «El avión se vuela después
     * de haber aterrizado.»
     *
     * Y no es una manía: una toma se termina **parando**. Si lo que se quiere
     * es no aterrizar, eso se decide en el aire y se llama frustrada; una vez
     * que las ruedas tocan, lo que toca es bajar el gas y frenar.
     *
     * Así que tras tocar se bloquea el vuelo hasta haber rodado de verdad. A
     * partir de ahí vuelve a ser un despegue normal y se puede volver a
     * volar, que es lo que hace falta para encadenar despegue y aterrizaje sin
     * pasar por el hangar.
     */
    if (this.state.onGround) {
      /*
       * Acaba de tocar viniendo de volar: la toma empieza aquí. **Si venía de
       * volar de verdad**, que es lo que distingue una toma de un bote en la
       * carrera de despegue. Ver `VUELO_DE_VERDAD`.
       */
      if (this.enElAire && this.loQueSubio > VUELO_DE_VERDAD)
        this.haTocado = true;
      // Y se acaba al rodar despacio: a partir de ahí, despegue nuevo.
      if (this.speed < RODANDO_TRAS_TOMAR) this.haTocado = false;
      this.loQueSubio = 0;
    } else {
      /*
       * **Y lo que cuenta es lo que separa las ruedas del suelo**, no la
       * altura que publica el estado: ésa se mide desde el origen del avión y
       * con las ruedas apoyadas ya vale lo que mide el tren —un metro y medio
       * en la avioneta—. Comparando contra ella, medio bote pasaba por vuelo.
       */
      this.loQueSubio = Math.max(
        this.loQueSubio,
        this.state.heightAboveGround - this.aircraft.gearHeight,
      );
    }
    this.enElAire = !this.state.onGround;

    /*
     * **Y en el suelo hay que tirar para despegar.**
     *
     * El umbral era `bite > 0,88`, que con este modelo son veinte metros por
     * segundo: setenta y dos por hora, **menos que la velocidad de pérdida de
     * una avioneta de verdad**. Y como el motor a tope suma dos metros y medio
     * de ascenso por su cuenta, el avión se despegaba solo a los cuarenta y
     * nueve metros de carrera sin que nadie tocara la palanca — mientras el
     * tutor decía «esperá a que corra» y «tirá para arriba».
     *
     * Se aprendía que los aviones suben solos. Ahora el listón sale de la
     * ficha de la aeronave, no de un número suelto, y es el mismo sitio donde
     * el tutor pide rotar. Rodar, coger velocidad y **tirar**, que es lo que
     * hay que llevarse al peldaño siguiente.
     */
    /*
     * **Y el listón es la Vr de su ficha, no una fracción de la de toma.**
     *
     * Era el ochenta y cinco por ciento de la velocidad de aproximación, que en
     * los cuatro de hélice cae justo en su Vr —de ahí que nadie lo viera— y en
     * los reactores no: el JAZ 120 se iba del suelo a 124 nudos, cuarenta por
     * debajo de su Vr de 167 y antes incluso de su V1. Así la carrera no pasaba
     * nunca por «comprometido» y no sonaban ni «V one» ni «rotate»: medido en
     * Pettirossi, «despegando» y de ahí a «en vuelo». Lo vio quien jugaba en
     * Lanzarote antes que el banco.
     *
     * Con la Vr de la ficha, el avión se va a la velocidad de su tipo, y la
     * carrera tiene sus dos momentos: la decisión y la rotación.
     */
    const canClimb =
      !this.state.onGround ||
      (this.speed >= this.aircraft.rotationSpeed &&
        this.state.onRunway &&
        !this.haTocado);

    /*
     * **El motor también manda en la altura, y esa es la mitad que faltaba.**
     *
     * Aquí la altura la llevaba solo la palanca: con el motor a cero y la
     * palanca centrada el avión seguía nivelado indefinidamente. «Motor a 0,
     * se queda flotando en el aire; digo yo que una avioneta no se queda
     * recta.»
     *
     * Y tiene razón, porque es **el** hecho de volar: un avión se sostiene
     * porque avanza, y avanza porque el motor tira. Quitar motor es empezar a
     * bajar. Es lo único que hay que llevarse de este peldaño al siguiente, y
     * hasta hoy no estaba.
     *
     * No es física de verdad —eso es el peldaño de Taguato Ruvicha, donde el
     * empuje pelea contra la resistencia y la velocidad de equilibrio sale de
     * la actitud—. Es **una recta**: por encima del gas que sostiene el nivel
     * se sube, por debajo se planea, y en medio se vuela recto. Un niño de
     * cuatro años puede descubrir eso solo, moviendo el mando y mirando.
     *
     * Sigue sin poder caerse: la palanca puede compensar el planeo entero, así
     * que quien tire y no entienda por qué baja, deja de bajar. Lo que ya no
     * puede es no enterarse.
     *
     * Y con el tren y los flaps fuera, el gas que ni sube ni baja es más alto:
     * ver `gasQueNiSubeNiBaja`.
     */
    const planeo = this.ritmoDelMotor(gas);
    /*
     * **Y sin motor no se puede volar recto, por mucho que se tire.**
     *
     * La palanca daba siete metros por segundo de ascenso siempre, así que
     * media palanca —tres y medio— compensaba exactamente el planeo del motor
     * al ralentí. Resultado medido: gas a cero, palanca a la mitad, y el avión
     * se queda nivelado indefinidamente a ciento siete por hora. «Motor a 0,
     * se queda flotando en el aire.»
     *
     * Ahora la autoridad de la palanca **crece con el gas**: sin motor llega a
     * dos y ocho, que no alcanza para anular la caída de tres y medio. Se
     * puede alargar mucho el planeo —eso es lo que hace un piloto— pero no
     * cancelarlo. Sigue sin poder caerse nadie: aquí no hay pérdida ni rotura.
     */
    const mando =
      controls.elevator * ascensoMaximo(this.aircraft) * (0.4 + 0.6 * gas);
    /*
     * Y el bache del aire, que se suma a lo que pide el mando.
     *
     * **Solo volando**: en el suelo las ruedas mandan y un avión no sube porque
     * pase una ráfaga. Ver `ponerRacha`.
     */
    const racha = this.state.onGround ? 0 : this.bache;
    const wantedClimb = (canClimb ? (mando + planeo) * bite : 0) + racha;
    this.climb += (wantedClimb - this.climb) * Math.min(1, step * 2.2);

    // El morro apunta a donde se va, más un pelín para que se vea la
    // intención. Sin ángulo de ataque: aquí no existe.
    const path =
      this.speed > 1 ? Math.asin(clamp(this.climb / this.speed, -1, 1)) : 0;
    this.pitch +=
      (path + controls.elevator * 0.06 - this.pitch) * Math.min(1, step * 4);

    this.state.position.x += Math.sin(this.heading) * this.speed * step;
    this.state.position.z += -Math.cos(this.heading) * this.speed * step;
    this.state.position.y += this.climb * step;

    this.apply(step);
  }

  /** Vuelca el estado interno en el `FlightState` que lee el resto del juego. */
  private apply(dt: number): void {
    const s = this.state;
    const ground = this.ground(s.position.x, s.position.z);
    const wheelLevel = ground + this.aircraft.gearHeight;

    const wasFlying = !s.onGround;

    /*
     * **Rodando, el avión sigue al suelo también cuando el suelo baja.**
     *
     * Este modelo no tiene gravedad: sube y baja lo que le pida el mando, y ya.
     * Con eso basta en el aire, pero en tierra faltaba la otra mitad: se pegaba
     * al suelo **hacia arriba** —si el terreno subía, lo empujaba— y no hacia
     * abajo. Sobre terreno que desciende, el avión se quedaba a su altura y el
     * suelo se iba cayendo debajo.
     *
     * Con el relieve inventado nunca se notó, porque el aeródromo se aplanaba
     * entero. Con el relieve real, la calle de rodaje de Silvio Pettirossi baja
     * siete metros y medio de la plataforma a la cabecera: quien rodaba por ahí
     * **despegaba sin tocar nada**, se le escondía el botón de freno porque el
     * juego lo daba por volando, y tenía que hacer filigranas para volver a
     * posarlo. Se vio jugando.
     *
     * Solo se despega cuando se pide subir. Sin mando, las ruedas en el suelo.
     *
     * Y **solo si ya venía tocando**: la primera versión miraba nada más el
     * `onGround` del fotograma anterior, que arranca valiendo `true`, así que
     * un avión colocado a novecientos metros se estampaba contra el suelo en
     * el primer paso. Lo cazó una prueba que reinicia en el aire.
     *
     * Un metro de holgura es de sobra: rodando a treinta por hora sobre una
     * pendiente del uno por ciento, el suelo baja trece centímetros por
     * fotograma.
     */
    const rodando =
      s.onGround &&
      this.climb <= 0 &&
      s.position.y - wheelLevel < PEGADO_AL_SUELO;
    if (rodando) s.position.y = wheelLevel;

    if (s.position.y <= wheelLevel) {
      if (wasFlying) s.touchdownSinkRate = Math.max(0, -this.climb);
      s.position.y = wheelLevel;
      s.onGround = true;
      if (this.climb < 0) this.climb = 0;
      // En tierra el avión se endereza solo: aquí no hay puntas de ala que
      // apoyar ni nada que romper.
      this.bank *= Math.max(0, 1 - dt * 6);
      this.pitch *= Math.max(0, 1 - dt * 6);
    } else {
      s.onGround = false;
    }

    while (this.heading > Math.PI * 2) this.heading -= Math.PI * 2;
    while (this.heading < 0) this.heading += Math.PI * 2;

    this.euler.set(this.pitch, -this.heading, -this.bank);
    s.orientation.setFromEuler(this.euler);

    this.forward.set(0, 0, -1).applyQuaternion(s.orientation);
    s.velocity.copy(this.forward).multiplyScalar(this.speed);
    s.velocity.y = this.climb;

    s.airspeed = this.speed;
    /*
     * Y la del suelo, que **en este modelo es la misma**: aquí el gas es la
     * velocidad y no hay viento —ver `ponerViento`—, así que no hay dos
     * números. Se publica igual para que el resto del juego pueda preguntar
     * siempre lo mismo sin saber qué peldaño se está jugando.
     */
    s.groundSpeed = this.speed;
    s.verticalSpeed = this.climb;
    s.heading = this.heading;
    s.heightAboveGround = s.position.y - ground;
    s.alpha = 0;
    s.beta = 0;
    s.rollRate = 0;
    s.pitchRate = 0;
    /*
     * **Y la guiñada sí se publica, porque este modelo la sabe.**
     *
     * Aquí iba un cero, junto a los otros dos, y no era lo mismo: el alabeo y
     * el cabeceo de este modelo son de mentira —el avión se inclina para que se
     * vea bien, no porque nada gire—, pero **la guiñada es el giro de verdad**:
     * es el número con el que se mueve el rumbo dos líneas más arriba. Decir
     * cero era decir que el avión no está girando mientras está girando.
     *
     * Y lo leía alguien. La ayuda de rodaje lleva un amortiguador sobre
     * `yawRate` para que la corrección afloje antes de llegar a la raya, así
     * que en Guyrami —el único peldaño que vuela este modelo— ese amortiguador
     * valía cero y la ayuda era un proporcional puro con tope: metía el alerón
     * a fondo hasta casi estar alineada. Medido en la primera esquina del
     * rodaje de Pettirossi, el avión se abría **veinticuatro metros** antes de
     * volver al eje, o sea fuera de una calle de veintitrés.
     *
     * No es un ajuste nuevo: es dejar de mentir sobre un número que ya existía.
     */
    s.yawRate = this.guinada;
    s.loadFactor = 1;
    // Ni pérdida ni choque: en este peldaño no se puede perder.
    s.stalled = false;
    s.stallWarning = false;
    s.crashed = false;
    s.secondsToImpact = Number.POSITIVE_INFINITY;
  }
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
