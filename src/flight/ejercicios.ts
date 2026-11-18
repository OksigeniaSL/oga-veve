/**
 * **Los ejercicios de emergencia**: qué se puede practicar, dónde y con qué.
 *
 * El marco es el del #90, y lo primero que dice es que **esto son
 * procedimientos, no espectáculo**. Un piloto de línea pasa por aquí cada
 * seis meses en un simulador, y eso es exactamente lo que es este juego: quien
 * practica aquí un motor parado está haciendo lo que hace un profesional, y se
 * le puede decir tal cual. De ahí salen cuatro reglas, y este fichero es la
 * primera hecha código:
 *
 * 1. **Nunca por sorpresa en un vuelo tranquilo.** Una avería que llega sola a
 *    estropear el vuelo que un niño estaba disfrutando enseña una cosa: que el
 *    juego es traicionero. Aquí las averías **se eligen** —«hoy practicamos
 *    motor parado»— y la instructora las cuenta antes de empezar. Fuera de un
 *    ejercicio no se para ningún motor, salvo el que se queda sin combustible,
 *    que no es una avería sino una consecuencia y tiene su propio aviso.
 * 2. **Nadie muere. Nunca.** Ni se sugiere: si sale mal, sale mal el ejercicio
 *    y se repite, como en un simulador.
 * 3. **Sin morbo.** Ni humo, ni gritos, ni música: la calma es el contenido.
 * 4. **Cada avería enseña una cosa concreta**, y está escrito cuál al lado de
 *    cada una.
 *
 * ## Por peldaños
 *
 * - **Guyrami**: ninguna avería. A los cuatro años no se practica nada de
 *   esto; la tormenta sí, que no es una avería: ver abajo.
 * - **Tukã**: solo el planeo, avisado, y como juego: llegar a la pista. Y en
 *   el helicóptero, el suyo: la autorrotación, con la ayuda llevando el
 *   colectivo y la recogida (#110).
 * - **Taguato**: V1 —parar antes, seguir después— y un motor parado en vuelo.
 * - **Taguato Ruvicha**: todo lo anterior, y la sesión de simulador: se sabe
 *   que es un ejercicio y no se sabe qué va a fallar ni cuándo.
 *
 * ## Y cómo se suma una avería nueva
 *
 * Aves, el tren de morro… entran aquí como una entrada más de `EJERCICIOS`:
 * qué falla (`Averia`), cuándo (`Momento`), dónde y con qué. Quien la hace
 * pasar —la instructora antes, la máquina y la cabina durante, el cierre
 * después— es `practica.ts`, y no hay que tocarlo para eso salvo que la avería
 * traiga un gesto que todavía no existe.
 *
 * La despresurización entró así: su procedimiento —el aviso, las máscaras, el
 * descenso de emergencia— ya estaba escrito en `despresurizacion.ts`, con su
 * peldaño, sus aviones y cuándo se puede disparar en
 * `EJERCICIO_DE_DESPRESURIZACION`; aquí se le da su sitio en la lista, y de
 * esa ficha salen sus peldaños y sus aviones para que no haya dos versiones.
 *
 * ## Y la tormenta, que no es una avería
 *
 * La tormenta entró por la misma puerta —el hangar, `?ejercicio=`, la
 * presentación antes y el cierre que celebra— y es la excepción a dos cosas
 * de arriba. No falla nada: lo que se practica es **no entrar** en una nube de
 * tormenta, rodearla con margen. Y por eso va **también en Guyrami**: a los
 * cuatro años no se practica un motor parado, pero sí se puede aprender que a
 * esa nube enorme no se le entra, y que si un rayo toca el avión no pasa nada.
 * La calma es la forma que tiene la seguridad de funcionar, y se aprende
 * pronto. Quien la hace pasar no es `practica.ts` sino
 * `practica-de-tormenta.ts`, que cuenta lo suyo.
 *
 * ## Y las lecciones del ala rotatoria, que tampoco
 *
 * Quedarse quieto, el par y el efecto suelo (#113) entraron igual, con
 * `escena: "rotor"`: no falla nada, y lo que se practica es lo que un
 * helicóptero hace y un avión no. La cuarta es la autorrotación, que sí es
 * una avería y es el ejercicio de siempre. Las hace pasar
 * `lecciones-del-rotor.ts`.
 *
 * ## Y la aguja del ADF, que tampoco
 *
 * «Seguí la aguja» (#51) es la primera de la navegación con radio, con
 * `escena: "radio"`: no falla nada, y lo que se practica es seguir una aguja
 * con viento de costado. Pide un campo con NDB (`dondeVale`) y lo hace pasar
 * `seguir-la-aguja.ts`. Y «¿En qué radial estoy?», la segunda, la del VOR:
 * pide un campo con VOR y la lleva `en-que-radial-estoy.ts`. La tercera,
 * «Interceptar un radial», también con VOR: salir por un radial que no es el
 * de debajo, anticipando el viraje; la lleva `interceptar-un-radial.ts`. Y
 * la cuarta, «Dos radiales que se cortan», con dos VOR: saber dónde se está
 * sin ver nada; pide un campo con pareja (`parejaDelCampo`) y la lleva
 * `dos-radiales.ts`. Y la quinta, «Aterrizar con las agujas», con el ILS: el
 * localizador y la senda hasta los mínimos; pide un campo con un ILS cuya
 * senda se sepa (`ilsDelCampo`) y la lleva `ils-con-agujas.ts`.
 *
 * ## Y la deriva, que es navegación sin radio
 *
 * «Apuntá al viento» (#51, el peldaño 2) va con `escena: "navegacion"`: no
 * hay radio, solo un sitio que se ve, el viento de costado y la raya del
 * camino en el suelo. Pide un campo con un sitio bajo cerca y viento típico
 * (`sitioDeLaDeriva`) y la lleva `deriva.ts`. Ver el ADR 0031.
 *
 * Y «Rumbo de noche» (#51, el peldaño 1), también con `escena: "navegacion"`:
 * se sigue el río con la última luz, anochece y queda el rumbo. Pide un campo
 * con un río medido (`rioDeNoche`) y la lleva `rumbo-de-noche.ts`. Ver el ADR
 * 0031, enmienda H26o.
 */

import type { AircraftConfig } from "./aircraft";
import type { LeccionId } from "./lecciones";
import type { TierId } from "./tiers";
import { EJERCICIO_DE_DESPRESURIZACION } from "./despresurizacion";
import { radioDeSalida, radiosDe } from "./radio-de-navegacion";
import { parejaDelCampo } from "./dos-radiales";
import { ilsDelCampo } from "./ils-con-agujas";
import { sitioDeLaDeriva } from "./deriva";
import { rioDeNoche } from "./rumbo-de-noche";

export type EjercicioId =
  | "planeo"
  | "antes-de-v1"
  | "despues-de-v1"
  | "un-motor"
  | "simulador"
  | "despresurizacion"
  | "tormenta"
  | "estacionario"
  | "par"
  | "efecto-suelo"
  | "autorrotacion"
  | "aguja"
  | "radial"
  | "interceptar"
  | "cruce"
  | "ils"
  | "deriva"
  | "rumbo";

/**
 * **Cuándo falla**, contado por lo que pasa y no por un reloj de fondo: un
 * fallo en la carrera tiene que llegar en la carrera, no a los treinta
 * segundos de haber arrancado, que puede pillar a alguien rodando.
 */
export type Momento =
  /**
   * En la carrera de despegue. `antesDeV1`: al ochenta por ciento de V1, con
   * pista de sobra para parar. Si no, a medio camino entre V1 y la rotación:
   * el «fallo de V1» del simulador de verdad, cuando ya no hay dónde parar.
   */
  | { readonly en: "carrera"; readonly antesDeV1: boolean }
  /** Subiendo, al pasar esta altura sobre el campo, m. */
  | { readonly en: "subida"; readonly metros: number }
  /** Ya en el aire desde el principio, a los segundos que se digan. */
  | { readonly en: "aire"; readonly segundos: number };

/** Qué falla. */
export interface Averia {
  /**
   * Un motor —el de fuera, de un lado o del otro—, todos, o el aire de la
   * cabina: la despresurización, que se vuela con los motores bien.
   */
  readonly que: "motor" | "motores" | "presion";
  readonly cuando: Momento;
}

/** Lo que hace falta saber de un avión para ofrecerle un ejercicio. */
export type AvionDelEjercicio = Pick<AircraftConfig, "id" | "motores" | "presurizacion" | "sound" | "helicoptero">;

export interface Ejercicio {
  readonly id: EjercicioId;
  /** En qué peldaños se ofrece. */
  readonly peldanos: readonly TierId[];
  /** Con qué aviones: solo donde la avería existe de verdad. */
  valePara(a: AvionDelEjercicio): boolean;
  /**
   * La lección de la que parte: `vuelta` empieza alineado en la pista y con el
   * motor en marcha, y `aterrizaje`, ya volando. Ver `lecciones.ts`.
   */
  readonly leccion: Extract<LeccionId, "vuelta" | "aterrizaje">;
  /**
   * Dónde se coloca el avión si empieza en el aire: `planeo`, lejos y alto,
   * con la pista delante a distancia de planeo; `un-motor`, en una final
   * larga, a la altura de una senda de tres grados; `crucero`, a su altura de
   * crucero y muy lejos, en la prolongación de la pista: lo que se practica
   * allí arriba se practica donde pasa, y abajo queda pista de sobra para
   * bajar después a aterrizar.
   */
  readonly colocacion?:
    | "planeo"
    | "un-motor"
    | "crucero"
    | "tormenta"
    | "autorrotacion"
    | "aguja"
    | "radial"
    | "interceptar"
    | "cruce"
    | "ils"
    | "deriva"
    | "rumbo";
  /**
   * Lo que puede fallar. Con una sola, es esa; con varias, se sortea al
   * empezar y **no se dice cuál**: la sesión de simulador. Ninguna en la
   * tormenta, que no es una avería: ver `escena`.
   */
  readonly averias: readonly Averia[];
  /**
   * **Lo que se practica cuando no falla nada**: una escena del cielo, la
   * tormenta que se rodea (ver `practica-de-tormenta.ts`); o una de las
   * lecciones del ala rotatoria, `rotor`, que enseñan lo que hace un
   * helicóptero y no un avión (ver `lecciones-del-rotor.ts`).
   */
  readonly escena?: "tormenta" | "rotor" | "radio" | "navegacion";
  /** Lo que enseña, en una línea: para quien lea esto, no para el juego. */
  readonly ensena: string;
  /**
   * **Si es de helicóptero.** Los de avión no se le ofrecen a un helicóptero
   * —no tiene V1, ni pista que correr, ni ala que planee— y este no se le ofrece
   * a un avión. Ver `seOfrece`.
   */
  readonly deHelicoptero?: boolean;
  /**
   * **Si se practica en este campo**, por su indicativo OACI: el de la aguja
   * necesita un NDB en casa. Sin esto, vale en todos.
   */
  readonly dondeVale?: (oaci: string | null) => boolean;
  /**
   * **Si se cierra en el aire, lejos de la pista**: los de radio, que acaban
   * con la aguja que da la vuelta o la barra quieta en el centro. Mientras
   * duran, la pista y su gente no son de la lección —ni «andá a la pista», ni
   * la torre, ni su frecuencia—, y se callan. Los demás en el aire acaban
   * aterrizando, y eso sí es suyo. Ver `lo-que-calla-el-ejercicio.ts`.
   */
  readonly acabaEnElAire?: boolean;
}

/** Todos menos Guyrami: los peldaños que ya practican algo. */
const DESDE_TUKA: readonly TierId[] = ["tuka", "taguato", "taguato-ruvicha"];
const DESDE_TAGUATO: readonly TierId[] = ["taguato", "taguato-ruvicha"];
const multimotor = (a: AvionDelEjercicio): boolean => a.motores > 1;
/**
 * **Si lleva radar meteorológico**: los de turbina, que son los de cabina de
 * pantallas. La avioneta y el bimotor de pistón de la flota no lo llevan, y
 * en ellos lo de una tormenta es otra lección —no salir—, la de la tarjeta
 * del tiempo. Ver `familiaDe` en `ui/familia.ts`, que reparte igual.
 */
const conRadarMeteorologico = (a: AvionDelEjercicio): boolean =>
  a.sound.engine === "turboprop" || a.sound.engine === "turbofan";

export const EJERCICIOS: readonly Ejercicio[] = [
  {
    id: "planeo",
    peldanos: DESDE_TUKA,
    /*
     * En cualquier avión: sin motor, un monomotor y un reactor hacen lo mismo,
     * que es planear. Es la lección de Lilienthal desde el otro lado —un
     * avión sin motor sigue siendo un ala— y la del Hudson, que acabó bien.
     */
    valePara: () => true,
    leccion: "aterrizaje",
    colocacion: "planeo",
    /*
     * A los catorce segundos: lo que tarda la instructora en contarlo. Primero
     * se sabe qué va a pasar, y después pasa.
     */
    averias: [{ que: "motores", cuando: { en: "aire", segundos: 14 } }],
    ensena:
      "sin motor el avión no se cae: planea, a la velocidad de mejor planeo, hasta la pista",
  },
  {
    id: "antes-de-v1",
    peldanos: DESDE_TAGUATO,
    valePara: multimotor,
    leccion: "vuelta",
    averias: [{ que: "motor", cuando: { en: "carrera", antesDeV1: true } }],
    ensena:
      "antes de V1 queda pista para parar: gas atrás y frenos, y parar es ganar",
  },
  {
    id: "despues-de-v1",
    peldanos: DESDE_TAGUATO,
    valePara: multimotor,
    leccion: "vuelta",
    averias: [{ que: "motor", cuando: { en: "carrera", antesDeV1: false } }],
    ensena:
      "pasada V1 ya no hay pista para parar: se vuela con un motor, con el pie del lado del bueno",
  },
  {
    id: "un-motor",
    peldanos: DESDE_TAGUATO,
    valePara: multimotor,
    leccion: "aterrizaje",
    colocacion: "un-motor",
    averias: [{ que: "motor", cuando: { en: "aire", segundos: 14 } }],
    ensena:
      "un bimotor vuela perfectamente con uno: tira de lado, y para eso están los pedales",
  },
  {
    id: "simulador",
    peldanos: ["taguato-ruvicha"],
    valePara: multimotor,
    leccion: "vuelta",
    averias: [
      { que: "motor", cuando: { en: "carrera", antesDeV1: true } },
      { que: "motor", cuando: { en: "carrera", antesDeV1: false } },
      { que: "motor", cuando: { en: "subida", metros: 300 } },
    ],
    ensena:
      "se sabe que es un ejercicio y no qué va a fallar: se vuela el avión y se hace el procedimiento",
  },
  {
    id: "despresurizacion",
    /*
     * Los peldaños y los aviones, los de su ficha: Taguató y Taguató Ruvichá,
     * y solo los presurizados, que en uno sin presurizar no hay aire que
     * perder. Ver `EJERCICIO_DE_DESPRESURIZACION`.
     */
    peldanos: EJERCICIO_DE_DESPRESURIZACION.peldanos,
    valePara: (a) => EJERCICIO_DE_DESPRESURIZACION.sirveEn(a),
    leccion: "aterrizaje",
    colocacion: "crucero",
    /*
     * A los dieciocho segundos de empezar, que es lo que tarda la instructora
     * en contarlo: primero se sabe qué va a pasar, y después pasa. Y a la
     * altura de crucero, que siempre está por encima de la del ejercicio —ver
     * `ALTURA_DEL_EJERCICIO`—: si no, no se dispara.
     */
    averias: [{ que: "presion", cuando: { en: "aire", segundos: 18 } }],
    ensena:
      "sin aire en la cabina, máscara primero y abajo rápido hasta donde se respira: es un procedimiento, y se practica",
  },
  {
    id: "tormenta",
    /*
     * En los cuatro peldaños, y es la única: no es una emergencia sino el
     * cielo que enseña. Lo que crece con el peldaño es cómo se cuenta —el
     * dibujo en los cuatro, la palabra, los números y el radar, la radio—,
     * no si se practica. Ver `escalera.ts`.
     */
    peldanos: ["guyrami", ...DESDE_TUKA],
    /*
     * Con radar meteorológico, que es con lo que se ve dónde está el rojo y
     * cuánto se le deja. Ver `conRadarMeteorologico`.
     */
    valePara: conRadarMeteorologico,
    leccion: "aterrizaje",
    colocacion: "tormenta",
    averias: [],
    escena: "tormenta",
    ensena:
      "a una tormenta no se entra: se rodea con margen, por el lado del viento; y si un rayo toca el avión, no pasa nada",
  },
  /*
   * **Las lecciones del ala rotatoria** (#113), del *Helicopter Flying
   * Handbook* de la FAA: quedarse quieto, el par y el efecto suelo, y la
   * cuarta es la autorrotación de abajo. No falla nada, como en la tormenta:
   * lo que se practica lo lleva `lecciones-del-rotor.ts`. Empiezan donde
   * empieza el helicóptero, posado en su helipuerto con el rotor girando: la
   * lección de dar una vuelta, sin colocación. Ver el ADR 0026, enmienda H17a.
   */
  {
    id: "estacionario",
    /*
     * En los cuatro peldaños, y en cada uno es otra cosa: abajo, la ayuda
     * sostiene el sitio y lo que se aprende es que un helicóptero se queda
     * quieto en el aire —soltar es quedarse— y a qué altura; con la palanca de
     * verdad, quedarse es todo el oficio, y lo más difícil de volar uno.
     */
    peldanos: ["guyrami", ...DESDE_TUKA],
    valePara: (a) => a.helicoptero !== undefined,
    deHelicoptero: true,
    leccion: "vuelta",
    averias: [],
    escena: "rotor",
    ensena: "un helicóptero se queda quieto en el aire, y sostenerlo diez segundos es lo más difícil de volarlo",
  },
  {
    id: "par",
    /*
     * Desde Tukã: pide las dos manos a la vez —el colectivo para subir y el
     * pie para que el morro no se vaya—, y en Guyrami todo es un gesto cada
     * vez. Allí los pies los lleva siempre la ayuda.
     */
    peldanos: DESDE_TUKA,
    valePara: (a) => a.helicoptero !== undefined,
    deHelicoptero: true,
    leccion: "vuelta",
    averias: [],
    escena: "rotor",
    ensena: "más colectivo es más par y el morro se va; el pedal mueve el rotor de cola, y se queda",
  },
  {
    id: "efecto-suelo",
    // En los cuatro: se ve en la aguja de la fuerza, que tiene su dibujo desde el primero.
    peldanos: ["guyrami", ...DESDE_TUKA],
    valePara: (a) => a.helicoptero !== undefined,
    deHelicoptero: true,
    leccion: "vuelta",
    averias: [],
    escena: "rotor",
    ensena: "cerca del suelo, el aire del rotor rebota y sostenerse cuesta menos: la aguja de la fuerza baja",
  },
  {
    id: "autorrotacion",
    /*
     * El planeo del helicóptero, y por eso desde Tukã como el del avión: el
     * mismo mensaje tranquilizador (#110). En Tukã la ayuda de estacionario lo
     * vuela casi entero —la velocidad, las vueltas, la recogida y la toma—, y se
     * ve; en Taguató, el colectivo y el cíclico son de quien vuela.
     */
    peldanos: DESDE_TUKA,
    valePara: (a) => a.helicoptero !== undefined,
    deHelicoptero: true,
    leccion: "aterrizaje",
    colocacion: "autorrotacion",
    // Como el planeo: primero se cuenta, y después pasa.
    averias: [{ que: "motores", cuando: { en: "aire", segundos: 14 } }],
    ensena:
      "sin motor el helicóptero no se cae: el rotor sigue girando con el aire que sube, y con su giro se posa",
  },
  /*
   * **Seguí la aguja** (#51, peldaño 4 de la navegación instrumental): el
   * NDB del campo en el ADF, su morse para identificarlo y volar hacia él con
   * la aguja arriba; con el viento de costado, la estela hace la curva del
   * perro, y se corrige apuntando al viento. No falla nada, como la tormenta:
   * lo lleva `seguir-la-aguja.ts`. Ver el ADR 0030, enmienda H26b.
   */
  {
    id: "aguja",
    /*
     * En el peldaño de la radio, que es el de cabina: el ADF sale en el cuadro
     * y su frecuencia en la carta el mismo día (`calcosDe`). En los de abajo
     * no hay aguja que seguir, y el ejercicio no se ofrece.
     */
    peldanos: ["taguato-ruvicha"],
    valePara: (a) => radiosDe(a).adf,
    leccion: "aterrizaje",
    colocacion: "aguja",
    averias: [],
    escena: "radio",
    acabaEnElAire: true,
    dondeVale: (oaci) => radioDeSalida(oaci).adf !== null,
    ensena:
      "la aguja del ADF apunta a la radio y no sabe de viento: seguida con viento de costado, la estela se curva; apuntando un poco al viento, sale recta",
  },
  /*
   * **¿En qué radial estoy?** (#51, peldaño 5): el VOR del campo en la NAV,
   * su morse, girar el OBS hasta centrar la barra con FROM —ese número es el
   * radial en que se está—, girar el avión y ver que la barra no se mueve, y
   * volver a la radio con TO hasta pasarla. Lo lleva `en-que-radial-estoy.ts`.
   * Ver el ADR 0030, enmienda H26c.
   */
  {
    id: "radial",
    // El mismo peldaño que la aguja: el CDI sale en el cuadro y el VOR en la carta el mismo día.
    peldanos: ["taguato-ruvicha"],
    valePara: (a) => radiosDe(a).nav,
    leccion: "aterrizaje",
    colocacion: "radial",
    averias: [],
    escena: "radio",
    acabaEnElAire: true,
    dondeVale: (oaci) => radioDeSalida(oaci).nav !== null,
    ensena:
      "el VOR no dice hacia dónde ir sino en qué radial estás: el curso que centra la barra con FROM es tu radial, y girar el avión no lo cambia",
  },
  /*
   * **Interceptar un radial** (#51, peldaño 5): salir por un radial que no es
   * el de debajo, como pide una salida publicada. El curso en el OBS, la
   * barra a tope, cortarlo a cuarenta y cinco grados, virar antes de que la
   * barra llegue al centro y quedarse en él corrigiendo el viento. Lo lleva
   * `interceptar-un-radial.ts`. Ver el ADR 0030, enmienda H26e.
   */
  {
    id: "interceptar",
    // El mismo peldaño y los mismos campos que «¿En qué radial estoy?»: el VOR.
    peldanos: ["taguato-ruvicha"],
    valePara: (a) => radiosDe(a).nav,
    leccion: "aterrizaje",
    colocacion: "interceptar",
    averias: [],
    escena: "radio",
    acabaEnElAire: true,
    dondeVale: (oaci) => radioDeSalida(oaci).nav !== null,
    ensena:
      "a un radial se llega cortándolo a cuarenta y cinco grados y virando antes de que la barra llegue al centro, porque el avión gira en arco; y con viento, el morro se queda apuntando contra él",
  },
  /*
   * **Dos radiales que se cortan** (#51, el cierre del peldaño 5): con una
   * sola NAV, leer el radial del VOR del campo, poner otro VOR y leer el
   * suyo; cada uno es una raya en el plano, y donde se cortan está el avión.
   * Lo lleva `dos-radiales.ts`. Ver el ADR 0030, enmienda H26g.
   */
  {
    id: "cruce",
    // El mismo peldaño que los otros del VOR.
    peldanos: ["taguato-ruvicha"],
    valePara: (a) => radiosDe(a).nav,
    leccion: "aterrizaje",
    colocacion: "cruce",
    averias: [],
    escena: "radio",
    acabaEnElAire: true,
    /*
     * Un VOR en casa **y otro con el que se corte bien**: dos radios casi en
     * línea —TFN y LRO, a cinco millas y media— dan una cruz que no dice
     * nada, y donde no hay pareja no se ofrece.
     */
    dondeVale: (oaci) => parejaDelCampo(oaci) !== null,
    ensena:
      "un radial es una raya en el plano y el avión está en algún punto de ella: con dos VOR, dos rayas, y donde se cortan, ahí está; y entre leer una y otra el avión vuela",
  },
  /*
   * **Aterrizar con las agujas** (#51, peldaño 6): el ILS de la cabecera, el
   * localizador cortado a treinta grados, la senda capturada desde abajo y
   * las dos agujas en cruz hasta los mínimos; ahí, la pista o la frustrada,
   * que se felicita igual. Lo lleva `ils-con-agujas.ts`. Ver el ADR 0030,
   * enmienda H26i.
   */
  {
    id: "ils",
    // El mismo peldaño que los del VOR: el CDI y su senda salen en el cuadro el mismo día que la radio en la carta.
    peldanos: ["taguato-ruvicha"],
    valePara: (a) => radiosDe(a).nav,
    leccion: "aterrizaje",
    colocacion: "ils",
    averias: [],
    escena: "radio",
    /*
     * **Acaba en la pista**, o en la frustrada encima de ella: la torre, su
     * frecuencia y la fase de la final son parte de lo que se practica, como
     * en el planeo. No se calla nada.
     */
    dondeVale: (oaci) => ilsDelCampo(oaci).length > 0,
    ensena:
      "un ILS son dos agujas: la del localizador dice a qué lado queda la pista y la de la senda si se va alto o bajo; con las dos en el centro se llega a los mínimos, y ahí se ve la pista o se va uno al aire, que también es ganar",
  },
  /*
   * **Apuntá al viento** (#51, peldaño 2): el morro en un puente con el
   * viento de costado, la raya del camino en el suelo que se aparta de la
   * recta, y apuntar un poco al viento para llegar. Lo lleva `deriva.ts`. Ver
   * el ADR 0031.
   */
  {
    id: "deriva",
    /*
     * **Desde Tukã**: lo esencial se ve —el puente, la raya blanca que se
     * aparta de la magenta— y se oye, sin leer nada. En Guyrami no, y no por
     * la edad: su modelo de vuelo no lleva viento (`FlightModel.ponerViento`),
     * y sin viento no hay deriva que ver.
     */
    peldanos: DESDE_TUKA,
    // En todo avión: la deriva no es de un aparato, es del aire. El helicóptero va aparte.
    valePara: () => true,
    leccion: "aterrizaje",
    colocacion: "deriva",
    averias: [],
    escena: "navegacion",
    acabaEnElAire: true,
    dondeVale: (oaci) => sitioDeLaDeriva(oaci) !== null,
    ensena:
      "con viento de costado, el avión no va adonde apunta el morro: se escurre de lado; apuntando un poco al viento, el camino sale derecho y se llega",
  },
  /*
   * **Rumbo de noche** (#51, peldaño 1): se sigue el río con la última luz,
   * cae la noche y el río ya no se ve; queda el rumbo, y se mide cuánto se
   * aparta el morro hasta llegar a donde el río sigue. Lo lleva
   * `rumbo-de-noche.ts`. Ver el ADR 0031, enmienda H26o.
   */
  {
    id: "rumbo",
    /*
     * **Desde Tukã**: la marca de la rosa, su color y la voz se entienden sin
     * leer, y el número escrito llega en Taguató, como todas las cifras. En
     * Guyrami no, y no por la edad: su modelo de vuelo, el sencillo, no lleva
     * viento (`FlightModel.ponerViento`) y sus baches solo suben y bajan
     * (`ArcadeFlightModel.ponerRacha`), así que el morro no se va solo y no
     * hay rumbo que mantener. Si un día los lleva, éste baja con la deriva.
     */
    peldanos: DESDE_TUKA,
    // En todo avión: un rumbo se mantiene igual en una avioneta que en un reactor. El helicóptero va aparte.
    valePara: () => true,
    leccion: "aterrizaje",
    colocacion: "rumbo",
    averias: [],
    escena: "navegacion",
    acabaEnElAire: true,
    dondeVale: (oaci) => rioDeNoche(oaci) !== null,
    ensena:
      "cuando cae la noche el río deja de verse, y lo que queda es el rumbo: con la flecha quieta en la marca se llega adonde el río sigue, aunque no se vea",
  },
];

export function ejercicioPorId(id: string | null | undefined): Ejercicio | null {
  return EJERCICIOS.find((e) => e.id === id) ?? null;
}

/** Si este ejercicio se puede elegir con este peldaño y este avión. */
export function seOfrece(
  e: Ejercicio,
  peldano: TierId,
  avion: AvionDelEjercicio,
  /** El campo de casa, si se sabe. Un ejercicio que pide campo no se ofrece sin él. */
  oaci?: string | null,
): boolean {
  const helicoptero = avion.helicoptero !== undefined;
  const enEsteCampo = !e.dondeVale || (oaci !== undefined && e.dondeVale(oaci));
  return e.peldanos.includes(peldano) && (e.deHelicoptero ?? false) === helicoptero && e.valePara(avion) && enEsteCampo;
}

/** Los que se ofrecen con este peldaño y este avión, en su orden. */
export function ejerciciosPara(
  peldano: TierId,
  avion: AvionDelEjercicio,
  oaci?: string | null,
): readonly Ejercicio[] {
  return EJERCICIOS.filter((e) => seOfrece(e, peldano, avion, oaci));
}

/**
 * Si el ejercicio dice antes de empezar qué va a pasar: el de una avería, y
 * el de una escena, que se cuenta entera antes.
 */
export function esAvisado(e: Ejercicio): boolean {
  return e.escena !== undefined || e.averias.length === 1;
}
