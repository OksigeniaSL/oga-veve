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
 *   En el bimotor de pistón, que no lleva V1, lo de su manual: con el tren
 *   fuera se para, con el tren dentro y subiendo se sigue (ver `conV1`).
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
 *
 * Y «Rumbo y reloj» (#51, el peldaño 3), la estima, con la misma escena: sin
 * radio y sin nada que mirar, rumbo tanto durante tantos minutos y se está
 * encima. Pide un campo con destino (`destinoDeLaEstima`) y la lleva
 * `estima.ts`. Ver el ADR 0031, enmienda H26n.
 *
 * Y «Se apaga el GPS» (#51, el último peldaño), con la escena de la radio:
 * el GPS se va a mitad de camino por la interferencia de un NOTAM, y se llega
 * con el plan B, el VOR que ya estaba en la NAV. Pide un campo con VOR y la
 * lleva `gps-con-apagones.ts`. Ver el ADR 0031, enmienda H26v.
 *
 * Y «El altímetro miente» (#51, el altímetro barométrico), con la misma
 * escena: de alta a baja presión con la ventanilla sin tocar, hacia una
 * ladera de verdad. Pide un campo con ladera medida (`laderaDelAltimetro`) y
 * la lleva `el-altimetro-miente.ts`. Ver el ADR 0031, enmienda H26p.
 *
 * ## Y la final con viento cruzado, que tampoco
 *
 * «Aterrizar en cangrejo» y «Aterrizar con el ala baja» (#92) van con
 * `escena: "cruzado"`: no falla nada, y lo que se practica es una de las dos
 * técnicas de aterrizar con el viento de costado. Piden un campo con viento
 * de costado de siempre (`cruzadoDelCampo`) que no pase del demostrado del
 * avión (`conEsteAvion`), y las lleva `final-con-viento-cruzado.ts`. Ver el
 * ADR 0031, enmienda H32a.
 *
 * ## Y el despegue de pista corta, que tampoco
 *
 * «Despegar de una pista corta» (#91, H35a) va con `escena: "pista-corta"`:
 * no falla nada, y lo que se practica es la subida de después de los frenos,
 * a la de mejor ángulo hasta pasar el monte del final y a la de mejor régimen
 * después. Pide un campo con monte medido (`monteDelCampo`) y un avión cuyo
 * manual y cuyo modelo den las dos velocidades (`subidaDe`), y la lleva
 * `pista-corta.ts`. Ver el ADR 0027, enmienda H35a.
 *
 * ## Y la carga que se suelta
 *
 * «La carga suelta» (#91, #90) es una avería más, `que: "carga"`: subiendo,
 * la maleta de la bodega que no va amarrada se corre hacia la cola, y el
 * centro de gravedad con ella. Solo en los aviones con hoja de centrado en su
 * manual (`centradoDeSuTipo`), y desde Taguató, como la hoja que la enseña.
 * La cuenta es de `carga-suelta.ts`; la hace pasar `practica.ts`, como un
 * motor. Ver el ADR 0033, enmienda H38g.
 *
 * ## Y el tren de morro que no sale
 *
 * «El tren de morro no sale» (#90) es otra avería, `que: "morro"`, y llega
 * cuando se saca el tren para aterrizar (`en: "tren"`): salen las principales
 * y la de morro se queda en su pozo. Solo en el avión que tiene esa pata, su
 * extensión de emergencia escrita y su panza medida en el dibujo. Lo que pasa
 * en la pista sin ella lo hace el modelo de vuelo (`ponerSinRuedaDeMorro`); el
 * orden —la de emergencia, PAN PAN, la toma— es de `practica.ts`. Ver el ADR
 * 0014, enmienda H70.
 *
 * ## Y el fallo de radio
 *
 * «Sin radio» (#90, #83) es la avería `que: "radio"`: subiendo, la radio se
 * calla. Se marca el 7600, se vuelve al circuito mirando a la torre y se
 * aterriza con su lámpara. Solo en un campo con torre —con lámpara— de un país
 * cuya norma se ha leído (`campoConLamparaY7600`: el SERA en España, la DINAC
 * en Paraguay), y en las avionetas de pistón, que son las que hacen circuitos
 * en visual. La regla de la lámpara es de `fallo-de-radio.ts`; el orden, de
 * `practica.ts`. Ver el ADR 0014, enmiendas H71 y H86.
 *
 * ## Y el reventón en la carrera
 *
 * «Se revienta una rueda» (#90) es la avería `que: "neumatico"`: en la
 * carrera, casi a V1, una rueda principal revienta. El avión tira hacia ese
 * lado y el eje se sostiene con el pie; así de rápido lo recomendado es
 * seguir, no meter el tren, avisar y volver con toda la pista por delante
 * (*Takeoff Safety Training Aid* de la FAA, pp. 2.25 a 2.27). Quien para en la
 * pista también lo ha hecho bien. Solo en el avión con `ruedasPrincipales` en
 * su ficha; lo que hace la rueda es del modelo de vuelo
 * (`ponerNeumaticoReventado`) y el orden, de `practica.ts`. Ver el ADR 0014,
 * enmienda H74.
 *
 * ## Y el reventón al tomar
 *
 * «Se revienta una rueda al tocar» (#90) es la misma avería, `que:
 * "neumatico"`, con su momento en la toma (`en: "toma"`): se da la vuelta y,
 * al poco de tocar la pista, revienta una rueda principal. Tres cosas y nada
 * más: el eje con el otro pie, sin corregir de más; el freno suave y parejo,
 * con la reversa; y parar en la pista, sin prisa por dejarla (*737 NG Flight
 * Crew Training Manual*, p. 8.40; AAIB, VP-CRC y EI-WJN). Ver el ADR 0014,
 * enmienda H84.
 *
 * ## Y el ave en el motor
 *
 * «Un ave en el motor» (#90) es la avería `que: "ave"`: subiendo, un ave entra
 * en un motor y el motor petardea —el aire del compresor que se da la vuelta,
 * con estallidos y llamarada—. Primero se vuela: el pie y la velocidad. Con
 * altura, la compañera lleva esa palanca atrás hasta que se calla, la avanza
 * despacio y, si aguanta, la deja donde aguanta; si no, se para. Se avisa y se
 * vuelve (FAA, *Airplane Turbofan Engine Operation and Malfunctions*, pp. 18 a
 * 24). Lo que hace ese motor es de `ave-en-el-motor.ts`; el orden, de
 * `practica.ts`. Ver el ADR 0014, enmienda H77.
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
import { destinoDeLaEstima } from "./estima";
import { dondeSeVaElGiroscopo } from "./giroscopo-en-hora";
import { laderaDelAltimetro } from "./el-altimetro-miente";
import { inclinacionDelCampo } from "./brujula-que-baila";
import { cabeElCruzado, cruzadoDelCampo } from "./final-con-viento-cruzado";
import { cabinaDelGps } from "./gps-con-apagones";
import { monteDelCampo, subidaDe } from "./pista-corta";
import { conV1 } from "./decide-con-v1";
import { centradoDeSuTipo } from "./centrado";
import { hayLampara } from "./fallo-de-radio";
import { oaciDe, SCENARIOS, type Scenario } from "../world/scenarios";

export type EjercicioId =
  | "planeo"
  | "antes-de-v1"
  | "despues-de-v1"
  | "en-la-carrera"
  | "tren-arriba"
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
  | "rumbo"
  | "estima"
  | "altimetro"
  | "brujula"
  | "giroscopo"
  | "pitot"
  | "gps"
  | "cangrejo"
  | "ala-baja"
  | "pista-corta"
  | "carga"
  | "tren-de-morro"
  | "fallo-de-radio"
  | "reventon"
  | "reventon-al-tomar"
  | "ave";

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
   *
   * Y con `aFaltaDe`, m/s, antes de V1 y a esa distancia de ella: el reventón
   * a alta velocidad, que llega cuando ya se va casi a V1. Ver `reventon`.
   */
  | { readonly en: "carrera"; readonly antesDeV1: boolean; readonly aFaltaDe?: number }
  /**
   * Subiendo, al pasar esta altura sobre el campo, m. Y con `trenDentro`,
   * además con el tren ya dentro del todo: el fallo de después de despegar
   * del bimotor de pistón, el único del despegue en que su manual deja
   * seguir. Ver `en-la-carrera` y `tren-arriba`.
   *
   * Y `sinTrenA`, m sobre el campo: si el tren no ha entrado al llegar a esa
   * altura, falla igual, con el tren fuera. Es lo que hace un instructor: el
   * ejercicio no se queda armado para siempre porque nadie meta el tren.
   */
  | {
      readonly en: "subida";
      readonly metros: number;
      readonly trenDentro?: boolean;
      readonly sinTrenA?: number;
    }
  /** Ya en el aire desde el principio, a los segundos que se digan. */
  | { readonly en: "aire"; readonly segundos: number }
  /**
   * **Al pedir el tren fuera para aterrizar**, ya volando y con el tren
   * metido antes: el tren de morro que no sale. Sin haberlo metido no hay
   * nada que no salga, y no falla.
   */
  | { readonly en: "tren" }
  /**
   * **Al tocar la pista para aterrizar**, después de haber volado: la rueda
   * que revienta al tomar. Ver `REVIENTA_TRAS_TOCAR` en `practica.ts`.
   */
  | { readonly en: "toma" };

/** Qué falla. */
export interface Averia {
  /**
   * Un motor —el de fuera, de un lado o del otro—, todos, el aire de la
   * cabina —la despresurización, que se vuela con los motores bien— o la
   * carga de la bodega que se suelta y se va hacia la cola, la pata de
   * morro, que se queda en su pozo, la radio, que se calla, una rueda
   * principal, que revienta en la carrera o al tomar, o un motor que sigue en
   * marcha y petardea, con un ave dentro.
   */
  readonly que: "motor" | "motores" | "presion" | "carga" | "morro" | "radio" | "neumatico" | "ave";
  readonly cuando: Momento;
}

/** Lo que hace falta saber de un avión para ofrecerle un ejercicio. */
export type AvionDelEjercicio = Pick<AircraftConfig, "id" | "motores" | "presurizacion" | "sound" | "helicoptero"> &
  Partial<Pick<AircraftConfig, "trenRetractil" | "morroSinRueda" | "extensionDeEmergenciaHasta" | "ruedasPrincipales">>;

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
    | "rumbo"
    | "estima"
    | "altimetro"
    | "brujula"
    | "giroscopo"
    | "pitot"
    | "gps";
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
  readonly escena?: "tormenta" | "rotor" | "radio" | "navegacion" | "cruzado" | "pista-corta";
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
   * **Si cabe con este avión en este campo**: el de la final con viento
   * cruzado pide que el viento de costado de siempre no pase del demostrado
   * del avión. Sin esto, vale con todos los que valgan en el campo.
   */
  readonly conEsteAvion?: (a: AvionDelEjercicio & { readonly approachSpeed?: number }, oaci: string | null) => boolean;
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
 * **Si su manual decide el despegue con V1**: los multimotores de turbina. Vive
 * en `decide-con-v1.ts`, que es donde lo leen también el HUD y la máquina de
 * fases; se reexporta aquí para quien ya lo leía de los ejercicios.
 */
export { conV1 };
/** El bimotor de pistón: el que decide con el tren y no con V1. */
const bimotorDePiston = (a: AvionDelEjercicio): boolean => multimotor(a) && !conV1(a);
/**
 * **Si lleva radar meteorológico**: los de turbina, que son los de cabina de
 * pantallas. La avioneta y el bimotor de pistón de la flota no lo llevan, y
 * en ellos lo de una tormenta es otra lección —no salir—, la de la tarjeta
 * del tiempo. Ver `familiaDe` en `ui/familia.ts`, que reparte igual.
 */
const conRadarMeteorologico = (a: AvionDelEjercicio): boolean =>
  a.sound.engine === "turboprop" || a.sound.engine === "turbofan";

/**
 * **A falta de cuánto para V1 revienta la rueda**, m/s: dieciocho nudos.
 *
 * Lo que la guía de la FAA recoge de McDonnell Douglas es «a policy of not
 * rejecting a takeoff for a suspected tire failure at speeds above V1−20
 * knots» (*Takeoff Safety Training Aid*, p. 2.27). A dieciocho se está dentro
 * de esa franja —seguir es lo recomendado— y todavía antes de V1, que es
 * donde la pregunta se hace: parar también se puede, si la pista da.
 */
const CASI_A_V1 = 18 * 0.514444;

/**
 * **A qué altura sobre el campo entra el ave**, m: cien, unos trescientos
 * treinta pies. La guía dice que las aves se tragan sobre todo «in the vicinity
 * of airports, either during takeoff or during landing» (FAA, *Airplane Turbofan
 * Engine Operation and Malfunctions*, p. 23), y el ensayo de los motores mira
 * hasta los 1.500 pies (14 CFR 33.76 (c)(1)). A cien ya se ha pedido y metido
 * el tren, que es otra cosa que se dice, y todavía queda subida hasta los
 * cuatrocientos pies: primero se vuela. Ver `ave`.
 */
const ENTRA_EL_AVE_A = 100;

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
    // Solo donde su manual decide con V1: ver `conV1`.
    valePara: conV1,
    leccion: "vuelta",
    averias: [{ que: "motor", cuando: { en: "carrera", antesDeV1: true } }],
    ensena:
      "antes de V1 queda pista para parar: gas atrás y frenos, y parar es ganar",
  },
  {
    id: "despues-de-v1",
    peldanos: DESDE_TAGUATO,
    /*
     * Solo donde su manual decide con V1. Al bimotor de pistón se le paraba
     * un motor rodando a 69 nudos, tres por encima de su V1 del juego, y se
     * le pedía seguir: su manual manda parar ahí, y con la hélice en molinete
     * y el tren fuera no sube. Pasaba en Gran Canaria porque la pista es
     * larga. Lo suyo son los dos de abajo.
     */
    valePara: conV1,
    leccion: "vuelta",
    averias: [{ que: "motor", cuando: { en: "carrera", antesDeV1: false } }],
    ensena:
      "pasada V1 ya no hay pista para parar: se vuela con un motor, con el pie del lado del bueno",
  },
  {
    id: "en-la-carrera",
    peldanos: DESDE_TAGUATO,
    valePara: bimotorDePiston,
    leccion: "vuelta",
    /*
     * **Donde el de transporte ya sigue**: a medio camino entre su V1 del
     * juego, que es su Vmc, y la rotación —69 nudos en el JAZ 40—, o en
     * cuanto se va del suelo si rota antes. Es el momento en que un piloto de
     * reactor seguiría, y en este avión se para: es lo que se enseña.
     */
    averias: [{ que: "motor", cuando: { en: "carrera", antesDeV1: false } }],
    ensena:
      "en el bimotor de pistón, con las ruedas en el suelo o el tren todavía fuera, un motor que falla se para: gases atrás y derecho, aunque ya vuele",
  },
  {
    id: "tren-arriba",
    peldanos: DESDE_TAGUATO,
    valePara: bimotorDePiston,
    leccion: "vuelta",
    /*
     * **Subiendo y con el tren ya dentro**, el único fallo del despegue en
     * que su manual deja seguir. Desde quince metros, la altura a la que la
     * práctica da el avión por volando; el juego pide el tren a los sesenta
     * (`meteElTrenA`), así que falla en cuanto acaba de entrar.
     *
     * **Y si nadie mete el tren, falla igual a seiscientos cincuenta pies**,
     * como lo haría un instructor: el ejercicio no se puede quedar armado el
     * resto del vuelo. Es una altura por la que se pasa siempre —por encima
     * de donde el juego pide el tren en todos los peldaños, 60 m o 120, y
     * por debajo del circuito, 250— y a la que ya no queda pista por delante
     * para posarse y parar. Ahí su manual manda seguir y meter el tren:
     * «If decision is made to continue, maintain heading. After establishing
     * a climb, retract landing gear, accelerate to 92 KIAS and feather
     * inoperative engine prop» (Seneca III,
     * VB-1110, sección 3; y en su *Engine Securing Procedure*, «Gear —
     * retract» antes de identificar). Y se ve por qué se mete: con un motor y
     * el tren fuera, ese avión apenas sube. Ver `fallaElMotor` en `game.ts` y
     * el ADR 0014, enmienda H37i.
     */
    averias: [
      {
        que: "motor",
        cuando: { en: "subida", metros: 15, trenDentro: true, sinTrenA: 650 * 0.3048 },
      },
    ],
    ensena:
      "con el tren dentro y subiendo se sigue: el pie del lado del bueno, la línea azul, y la compañera identifica, verifica y pone en bandera enseguida",
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
    /*
     * Los mismos tres momentos en todos, y lo que toca en cada uno lo dice su
     * manual: en los de turbina, el primero se para y los otros se siguen; en
     * el bimotor de pistón, los dos de la carrera se paran —con las ruedas en
     * el suelo, su manual para siempre— y el de la subida se sigue. Lo decide
     * `Practica`, con `conV1`.
     */
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
  /*
   * **Rumbo y reloj** (#51, peldaño 3): la estima. Encima de Mariscal
   * Estigarribia, el rumbo corregido por el viento y el tiempo hasta
   * Filadelfia; un cronómetro grande que cuenta hacia atrás, y al llegar a
   * cero, mirar abajo. Sin radio ni el avión en el plano. Lo lleva
   * `estima.ts`. Ver el ADR 0031, enmienda H26n.
   */
  {
    id: "estima",
    /*
     * **Desde Taguató**: la lección son dos números, un rumbo y unos minutos,
     * y la cuenta que los junta —velocidad por tiempo es distancia—. Los
     * números entran en la escalera en Taguató (`escalera.ts`, el canal de la
     * cifra). En Tukã, lo que se ve de la deriva (el puente, las dos rayas)
     * se entiende sin leer; aquí no hay nada que ver hasta el final, que es
     * justo la lección, y el rumbo que hay que sostener es un número.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **Los de esferas**: la avioneta, el de motor radial y el bimotor de
     * pistón. La estima se aprende con la brújula y el reloj; los de cristal y
     * los de línea llevan una pantalla de navegación que dice dónde se está,
     * y en ellos el ejercicio sería mirar esa pantalla.
     */
    valePara: (a) => !conRadarMeteorologico(a),
    leccion: "aterrizaje",
    colocacion: "estima",
    averias: [],
    escena: "navegacion",
    acabaEnElAire: true,
    dondeVale: (oaci) => destinoDeLaEstima(oaci) !== null,
    ensena:
      "velocidad por tiempo es distancia: con el rumbo corregido por el viento y el reloj, se llega a un sitio que no se ve; y lo que se aparta es lo que se voló mal",
  },
  /*
   * **El altímetro miente** (#51, el altímetro barométrico): se viene de
   * Lanzarote con su presión en la ventanilla hacia la Cumbre Nueva de La
   * Palma, donde hoy hay diez hectopascales menos; la aguja marca doscientos
   * setenta pies de más. Llega el QNH de acá, se gira la rueda, la aguja baja
   * y dice la verdad. Lo lleva `el-altimetro-miente.ts`. Ver el ADR 0031,
   * enmienda H26p.
   */
  {
    id: "altimetro",
    /*
     * **Desde Taguató**: la ventanilla de presión es de Taguató para arriba
     * —abajo la gira la instructora al llegar a cada campo (`seguirElViento`
     * en `game.ts`)— y lo que se pide es un número, el QNH, que entra en la
     * escalera con las cifras (`escalera.ts`). Lo esencial se ve sin leerlo:
     * la aguja que baja al girar la rueda y el dibujo del avión que va más
     * bajo de lo que dice.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **Los de esferas**: la avioneta, el de motor radial y el bimotor de
     * pistón. Su altímetro tiene la rueda que se toca con el dedo en el cuadro
     * plano y en el 3D (`relojes-cabina.ts`); el de los de cristal es un
     * recuadro de la pantalla, y en el avión de verdad su rueda está en el
     * panel del EFIS, que la cabina 3D no tiene. Allí solo se gira con la
     * tecla, y un ejercicio cuyo gesto es girar esa rueda no se ofrece donde
     * el dedo no llega. Y ninguno de los tres lleva radioaltímetro ni
     * avisador de terreno: lo que dice el suelo lo dice la instructora.
     */
    valePara: (a) => !conRadarMeteorologico(a),
    leccion: "aterrizaje",
    colocacion: "altimetro",
    averias: [],
    escena: "navegacion",
    acabaEnElAire: true,
    dondeVale: (oaci) => laderaDelAltimetro(oaci) !== null,
    ensena:
      "un altímetro mide presión, no altura: de alta a baja presión con la ventanilla sin tocar marca de más, veintisiete pies por hectopascal; con el QNH del sitio dice la verdad",
  },
  /*
   * **La brújula baila** (#51, «la brújula que baila en los virajes, lo que
   * justifica el giróscopo»): derecho al oeste, un viraje al norte mirando la
   * brújula del parabrisas y el direccional, y ver que virando la brújula
   * miente y el direccional no. Lo lleva `brujula-que-baila.ts`; la física de
   * la brújula, `brujula.ts`. Ver el ADR 0031, enmienda H26q.
   */
  {
    id: "brujula",
    /*
     * **Desde Tukã**: lo que se aprende se ve sin leer —dos rosas, una que se
     * va y vuelve y otra quieta, el ámbar de la que miente— y se oye; el
     * número del rumbo llega en Taguató, como todas las cifras. En Guyrami
     * no: viene detrás de «Rumbo de noche», que es donde se aprende a seguir
     * la rosa, y ése empieza en Tukã.
     */
    peldanos: DESDE_TUKA,
    /*
     * **Los que llevan brújula en el parabrisas**: la avioneta, el de motor
     * radial y el bimotor de pistón (`brujula=True` en sus `modelos/jaz-*.py`),
     * los mismos que no llevan radar. Los de pantallas también la llevan de
     * verdad, pero sus cabinas de aquí no: ver la enmienda H26q.
     */
    valePara: (a) => !conRadarMeteorologico(a),
    leccion: "aterrizaje",
    colocacion: "brujula",
    averias: [],
    escena: "navegacion",
    acabaEnElAire: true,
    // Donde el campo de la Tierra se inclina lo bastante para que se vea: en todos los campos de hoy. Ver `inclinacionDelCampo`.
    dondeVale: (oaci) => inclinacionDelCampo(oaci) !== null,
    ensena:
      "derecha y quieta, la brújula dice la verdad; virando miente y, al salir, baila un rato. El direccional es un giróscopo: no siente el viraje, y por eso se vuela con él",
  },
  /*
   * **Poné en hora el giróscopo** (#51, «lo que justifica el giróscopo y su
   * ritual de resincronizar cada diez minutos»): derecho al norte, el reloj
   * del giróscopo apurado hasta que el direccional se va ocho grados, y
   * girar su perilla hasta que diga lo mismo que la brújula, derecho y sin
   * acelerar. Lo lleva `giroscopo-en-hora.ts`; la deriva, `direccional.ts`.
   * Ver el ADR 0031, enmienda H26r.
   */
  {
    id: "giroscopo",
    /*
     * **Desde Taguató**, que es donde el direccional empieza a irse en
     * cualquier vuelo (`PELDANOS_QUE_LO_PONEN`): se aprende el ritual el
     * mismo día que hace falta. Abajo lo pone la instructora y no se va, y
     * enseñar a hacer algo que nadie necesita hacer todavía no enseña nada.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **Los de esferas con brújula en el parabrisas**: la avioneta, el de
     * motor radial y el bimotor de pistón, los de «La brújula baila». Su
     * direccional es un giróscopo de vacío sin esclavizar; el de los de
     * cristal lo corrige solo su magnetómetro, y no se va.
     */
    valePara: (a) => !conRadarMeteorologico(a),
    leccion: "aterrizaje",
    colocacion: "giroscopo",
    averias: [],
    escena: "navegacion",
    acabaEnElAire: true,
    // Donde la brújula dice la verdad y la Tierra hace irse al giróscopo: hoy, todos. Ver `dondeSeVaElGiroscopo`.
    dondeVale: (oaci) => dondeSeVaElGiroscopo(oaci),
    ensena:
      "el giróscopo no siente el viraje, pero se va solo: cada quince minutos, derecho y sin acelerar, se pone con la brújula, que es lo único que sabe dónde está el norte",
  },
  /*
   * **El pitot se hiela** (#51, «tubo pitot que se hiela en nube fría, con la
   * velocidad congelada mientras el avión claramente acelera»): dentro de una
   * nube a cinco bajo cero, con la calefacción del pitot apagada, el hielo
   * cierra el tubo; con todo el gas el avión acelera y la aguja no se mueve,
   * y se prende la calefacción hasta que vuelve. Lo lleva `pitot-helado.ts`.
   * Ver el ADR 0031, enmienda H26s.
   */
  {
    id: "pitot",
    /*
     * **Desde Taguató**: lo que se ve es una aguja que no se mueve contra lo
     * que de verdad corre el avión, y eso se cuenta con los dos números, que
     * entran en Taguató (el canal de la cifra). Y el interruptor de la
     * calefacción es un trabajo de cabina de los que se aprenden el día que
     * los instrumentos empiezan a ser de quien vuela, como la rueda del
     * altímetro y la perilla del direccional.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **El bimotor de pistón**, el único de esferas que vuela por
     * instrumentos —y por tanto dentro de nubes— y lleva pitot calentado con
     * su interruptor, como el de su clase. La avioneta y el fumigador vuelan
     * con reglas visuales y no entran en una nube: su lección del hielo es no
     * salir. Los de turbina llevan la calefacción de las sondas prendida
     * desde que arrancan, y su cabina de aquí no tiene el interruptor. Ver
     * la enmienda H26s.
     */
    valePara: (a) => !conRadarMeteorologico(a) && multimotor(a),
    leccion: "aterrizaje",
    colocacion: "pitot",
    averias: [],
    escena: "navegacion",
    acabaEnElAire: true,
    // **Encima de un campo**: la nube y la altura salen de su aire y de su relieve. Ver `dondeEmpiezaElPitot`.
    dondeVale: (oaci) => oaci !== null,
    ensena:
      "en nube fría el hielo tapa el pitot y la aguja se queda quieta aunque el avión acelere: se vuela con la actitud y el gas, y la calefacción del pitot lo destapa",
  },
  /*
   * **Se apaga el GPS** (#51, el último peldaño, «con apagones en misiones
   * avanzadas, para que la estima y el VOR sigan valiendo»): hacia el VOR del
   * campo con el GPS, un NOTAM de interferencia, el GPS que se va a mitad de
   * camino y el plano sin el avión; se llega con el plan B, el VOR que ya
   * estaba en la NAV. Lo lleva `gps-con-apagones.ts`. Ver el ADR 0031,
   * enmienda H26v.
   */
  {
    id: "gps",
    /*
     * **En Taguató Ruvichá**, el peldaño de la radio: el plan B es el VOR, y
     * la NAV, su CDI y la frecuencia en la carta entran en la escalera ahí
     * (`RADIO_DESDE`, el calco de la radio de `escalera.ts`), como los demás
     * ejercicios del VOR. Más abajo no hay radio con la que llegar, y un
     * apagón sin plan B no enseña el plan B.
     */
    peldanos: ["taguato-ruvicha"],
    /*
     * **Los de esferas con NAV y los de cristal**: la avioneta, el bimotor de
     * pistón y los turbohélices. En los de esferas su GPS es uno de panel, y
     * su mapa móvil es el plano, que sin posición deja de saber dónde está el
     * avión; en los de cristal, el G1000 dice «LOI» y luego «DR», y el mapa
     * sigue a estima (enmienda H26w). En los dos el plan B es el mismo: el
     * VOR que ya estaba en la NAV. **En los de línea no**: con la inercial y
     * el DME/DME el ordenador de vuelo sigue sabiendo dónde está, y volar a
     * la radio porque se fue el GPS enseñaría un plan B que ese avión no
     * necesita (regla 4). El biplano agrícola no lleva radio, y el
     * helicóptero tiene su cabina.
     */
    valePara: (a) => {
      const cabina = cabinaDelGps(a);
      return (cabina === "esferas" || cabina === "cristal") && radiosDe(a).nav;
    },
    leccion: "aterrizaje",
    colocacion: "gps",
    averias: [],
    escena: "radio",
    acabaEnElAire: true,
    dondeVale: (oaci) => radioDeSalida(oaci).nav !== null,
    ensena:
      "el GPS se puede ir —una interferencia avisada por NOTAM, pocos satélites, la antena— y lo que no depende de él sigue: con el VOR puesto antes de salir, se llega con la radio. El buen piloto siempre tiene un plan B",
  },
  /*
   * **La final con viento cruzado** (#92, H32a): las dos técnicas de aterrizar
   * con el viento de costado, una por ejercicio. Empiezan en la final de
   * siempre, configurados, con el viento de siempre del campo, y se cierran
   * en la pista o al irse al aire. Las lleva `final-con-viento-cruzado.ts`.
   * Ver el ADR 0031, enmienda H32a.
   *
   * Piden un campo con viento de costado de verdad —ocho nudos o más en su
   * pista de siempre: Los Rodeos con el alisio— y que ese viento no pase del
   * demostrado del avión, que es el límite de su ficha.
   */
  {
    id: "cangrejo",
    /*
     * **Desde Tukã**: el cangrejo se ve desde fuera —el avión torcido sobre la
     * raya— y se oye, sin leer. En Guyrami no, por lo mismo que la deriva: su
     * modelo no lleva viento, y sin viento no hay cangrejo.
     */
    peldanos: DESDE_TUKA,
    // En todo avión: es lo que hace con viento de costado la avioneta y el reactor de línea.
    valePara: () => true,
    leccion: "aterrizaje",
    averias: [],
    escena: "cruzado",
    dondeVale: (oaci) => cruzadoDelCampo(oaci) !== null,
    conEsteAvion: (a, oaci) => cabeElCruzado(a, oaci),
    ensena:
      "con viento de costado se baja en cangrejo, el morro al viento y el avión torcido sobre la raya; justo antes de tocar, pie y el morro a la pista",
  },
  {
    id: "ala-baja",
    /*
     * **Solo en Taguato Ruvicha**, que es donde el timón es de quien vuela.
     * Resbalar es cruzar los mandos —el ala a un lado, el pie al otro—, y en
     * los peldaños de abajo el timón automático centra la bola, que es justo
     * deshacer el resbale: medido en la mesa con el JAZ 20 y los doce nudos de
     * Los Rodeos, en Tukã el pedal a fondo no llega y en Taguato hace falta
     * casi entero; sin ayuda, con medio pedal sobra. Ver
     * `final-con-viento-cruzado.test.ts`.
     */
    peldanos: ["taguato-ruvicha"],
    /*
     * **En los de hélice**: la avioneta, el bimotor y los turbohélices, que es
     * donde el manual la enseña. En un reactor de línea, con el ala en flecha
     * y los motores colgados, inclinar cerca del suelo tiene el tope de la
     * góndola y de la punta del ala, y lo que se enseña es el cangrejo y
     * enderezar. Y la mesa solo la ha volado con los de hélice.
     */
    valePara: (a) => a.sound.engine !== "turbofan",
    leccion: "aterrizaje",
    averias: [],
    escena: "cruzado",
    dondeVale: (oaci) => cruzadoDelCampo(oaci) !== null,
    conEsteAvion: (a, oaci) => cabeElCruzado(a, oaci),
    ensena:
      "con viento de costado se baja con el ala del viento abajo y el pie contrario: el morro en la pista, el avión inclinado, y se toca primero con la rueda del viento",
  },
  /*
   * **Despegar de una pista corta** (#91, H35a): frenos, motor a tope,
   * soltar, y en el aire la de mejor ángulo hasta pasar el monte; después,
   * la de mejor régimen.
   */
  {
    id: "pista-corta",
    /*
     * **Desde Tukã, como dice el issue**: abajo la instructora lo cuenta con
     * el dibujo, y desde Taguato salen las velocidades en cifra. En Guyrami no:
     * su modelo de vuelo no tiene fuerzas —el gas es la velocidad— y no hay
     * pendiente que elegir.
     */
    peldanos: DESDE_TUKA,
    // Donde el manual trae la técnica y el modelo pone sus dos velocidades: hoy, el JAZ 20.
    valePara: (a) => subidaDe(a) !== null,
    leccion: "vuelta",
    averias: [],
    escena: "pista-corta",
    dondeVale: (oaci) => monteDelCampo(oaci) !== null,
    ensena:
      "de una pista corta se sale con los frenos puestos y el motor a tope, y en el aire despacio y empinado, a la de mejor ángulo, hasta pasar los árboles; después, a la de mejor régimen, que sube más deprisa",
  },
  /*
   * **La carga suelta** (#91, H38g): subiendo, la maleta sin amarrar se va al
   * fondo de la bodega y el avión se pone cola pesada. Palanca adelante y
   * compensar, nada brusco y con velocidad de sobra, y a tierra en el campo
   * más cercano, que aquí es el de salida. Ver `carga-suelta.ts`.
   */
  {
    id: "carga",
    /*
     * **Desde Taguató**, el peldaño de la hoja de centrado: allí se ve dónde
     * va cada maleta y si va amarrada, y esto es lo que pasa en vuelo con
     * eso. Más abajo la hoja no enseña el centro, y la lección no tendría de
     * dónde venir.
     */
    peldanos: DESDE_TAGUATO,
    // Donde el manual da la hoja de centrado y el fondo de la bodega: hoy, el JAZ 20.
    valePara: (a) => centradoDeSuTipo(a) !== null,
    leccion: "vuelta",
    /*
     * **Subiendo, a cuatrocientos pies**: es con la nariz arriba cuando una
     * maleta suelta se va para atrás, y a esa altura el despegue ya está
     * hecho y queda aire para volver al campo. El de salida es el más
     * cercano: se vuelve a él.
     */
    averias: [{ que: "carga", cuando: { en: "subida", metros: 400 * 0.3048 } }],
    ensena:
      "la carga suelta que se va hacia la cola se lleva el centro de gravedad: la nariz quiere subir, se empuja y se compensa, nada brusco y con velocidad de sobra, y a tierra en el campo más cercano. Por eso se amarra",
  },
  /*
   * **El tren de morro que no sale** (#90, H70): se despega, se mete el tren
   * y, al sacarlo para aterrizar, salen las principales y la de morro se
   * queda dentro. Primero se prueba la extensión de emergencia de su manual
   * —por debajo de su velocidad, el selector abajo y el pomo— y tampoco sale;
   * entonces se declara y se aterriza sobre las principales con la nariz
   * arriba todo lo que aguante, y se la deja bajar despacio, sin frenos. Ver
   * el ADR 0014, enmienda H70.
   */
  {
    id: "tren-de-morro",
    // Taguató, como dice el #90, y Taguató Ruvichá, que lleva el catálogo entero.
    peldanos: DESDE_TAGUATO,
    /*
     * **Solo donde hay una rueda de morro que se mete**, con su extensión de
     * emergencia escrita y su panza medida en el dibujo: hoy, el JAZ 40. Un
     * tren fijo no puede dejar de salir.
     */
    valePara: (a) =>
      !!a.trenRetractil && a.morroSinRueda !== undefined && a.extensionDeEmergenciaHasta !== undefined,
    leccion: "vuelta",
    averias: [{ que: "morro", cuando: { en: "tren" } }],
    ensena:
      "si la rueda de morro no sale, primero la extensión de emergencia; y si tampoco, se aterriza sobre las de atrás con la nariz arriba todo lo que aguante, se la deja bajar despacio y sin frenos. Sale bien casi siempre",
  },
  /*
   * **El fallo de radio** (#90, #83, H71): subiendo, la radio se calla. La
   * instructora marca el 7600, que se lo dice a la torre; se vuelve al
   * circuito mirando a la torre, que contesta con su lámpara —los destellos
   * verdes, «regresar para aterrizar», que se contestan alabeando; la roja fija
   * si hay que ceder el paso; la verde fija para aterrizar—, y se aterriza con
   * la verde. Ver `fallo-de-radio.ts` y el ADR 0014, enmienda H71.
   */
  {
    id: "fallo-de-radio",
    /*
     * **Desde Taguató**, el peldaño de las cifras: el 7600 es un número que se
     * ve marcar y que se lee, y el #90 deja abajo solo el motor parado. La
     * lámpara se entiende antes de leer, pero lo que se practica es el
     * procedimiento entero, y el número es la mitad.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **Las avionetas de pistón**, el JAZ 20 y el JAZ 40: las que vuelan
     * circuitos en visual, que es donde se aterriza con la lámpara. Un avión
     * de línea vuela por instrumentos, y sin radio sigue lo autorizado —otra
     * lección—; el fumigador no es de campos con torre.
     */
    valePara: (a) => a.sound.engine === "piston" && a.helicoptero === undefined,
    dondeVale: campoConLamparaY7600,
    leccion: "vuelta",
    /*
     * **Subiendo, a cuatrocientos pies**, como la carga suelta: el despegue ya
     * está hecho y queda el circuito entero para volver, que es lo que piden el
     * SERA y la DINAC con la radio callada: seguir en visual y al aeródromo
     * adecuado más próximo, que es el de salida.
     */
    averias: [{ que: "radio", cuando: { en: "subida", metros: 400 * 0.3048 } }],
    ensena:
      "sin radio, el 7600 en el transpondedor se lo dice a la torre; se vuelve al circuito mirando a la torre, que habla con luces: los destellos verdes, regresar para aterrizar, que se contestan alabeando; la roja fija, ceder el paso y seguir en el circuito; y la verde fija, aterrizar",
  },
  /*
   * **El reventón en la carrera** (#90): casi a V1, una rueda principal
   * revienta con un golpe seco; el avión tira hacia ese lado y el eje se
   * sostiene con el otro pie. Así de rápido, seguir es lo recomendado: con una
   * rueda menos se frena peor, y volviendo se tiene la pista entera. El tren
   * se queda fuera, se avisa con PAN PAN, y se toma sosteniendo el eje y
   * frenando suave. Parar en la pista también es hacerlo bien. Ver el ADR
   * 0014, enmienda H74.
   */
  {
    id: "reventon",
    /*
     * **Desde Taguató**, que es donde el #90 pone V1 y el regreso: el reventón
     * es una pregunta sobre V1 y un regreso con la emergencia declarada. Y en
     * ese peldaño están las dos cosas que pide, el pedal de la carrera y el
     * pie que se pisa en la final. Abajo, ninguna avería de despegue.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **En el que decide con V1 y tiene su tren medido**: el JAZ 90. La guía
     * de la FAA es de reactores de transporte, y en él una rueda es un cuarto
     * del freno; en el JAZ 120, de dieciséis, casi no se nota.
     */
    valePara: (a) => conV1(a) && a.ruedasPrincipales !== undefined && (a.trenRetractil ?? false),
    leccion: "vuelta",
    averias: [{ que: "neumatico", cuando: { en: "carrera", antesDeV1: true, aFaltaDe: CASI_A_V1 } }],
    ensena:
      "una rueda que revienta casi a V1 tira del avión hacia su lado: el eje con el otro pie, se sigue, el tren se queda fuera, se avisa y se vuelve a aterrizar frenando suave; y parar en la pista también vale",
  },
  /*
   * **El reventón al tomar** (#90): se da la vuelta y, al tocar, una rueda
   * principal revienta. El avión tira hacia ese lado y hay tres cosas que
   * hacer: el eje con el otro pie, sin corregir de más; el freno suave y
   * parejo, con la reversa, que no es de las ruedas; y parar en la pista, sin
   * prisa por dejarla, con los bomberos al lado. Ver el ADR 0014, enmienda H84.
   */
  {
    id: "reventon-al-tomar",
    /*
     * **Desde Taguató**, que es donde están las dos cosas que pide: el pie en
     * el suelo y el freno medido, y el otro reventón, del que este es la
     * pareja. El #90 no lo nombra en un peldaño, y abajo solo deja el motor
     * parado en vuelo.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **En el que tiene su tren medido**: el JAZ 90, por lo mismo que el de la
     * carrera. Aquí no se decide con V1, pero lo que se lee —el manual de
     * Boeing, los dos informes— es de reactores con dos ruedas por pata.
     */
    valePara: (a) => a.ruedasPrincipales !== undefined && a.sound.engine === "turbofan",
    leccion: "vuelta",
    averias: [{ que: "neumatico", cuando: { en: "toma" } }],
    ensena:
      "una rueda que revienta al tocar tira del avión hacia su lado: el eje con el otro pie, sin corregir de más; el freno suave y parejo, con toda la reversa, que no es de las ruedas; y parar en la pista, sin prisa por dejarla",
  },
  /*
   * **Un ave en el motor, y su petardeo** (#90): subiendo, un golpe sordo y
   * unos estallidos espaciados con llamarada. Son dos cosas del catálogo que
   * van juntas, porque un ave es una causa corriente del petardeo: «bird
   * ingestion can also result in an engine surge» (FAA, *Airplane Turbofan
   * Engine Operation and Malfunctions*, p. 23). Suena a catástrofe y casi nunca
   * lo es; se vuela primero, y después la palanca de ese motor. Ver el ADR
   * 0014, enmienda H77.
   */
  {
    id: "ave",
    /*
     * **Desde Taguató**, que es donde el #90 pone el fallo asimétrico y el
     * regreso: un motor que da menos que el otro, sostenido con el pie, y una
     * vuelta declarada. Abajo solo está el motor parado en vuelo.
     */
    peldanos: DESDE_TAGUATO,
    /*
     * **En los reactores de dos motores**: la guía y el ensayo son de
     * turbofanes, y con dos se nota de qué lado va. En el cuatrimotor, un
     * motor a media potencia casi no pide pie.
     */
    valePara: (a) => a.sound.engine === "turbofan" && a.motores === 2,
    leccion: "vuelta",
    averias: [{ que: "ave", cuando: { en: "subida", metros: ENTRA_EL_AVE_A } }],
    ensena:
      "un ave en un motor lo hace petardear, con estallidos y llamarada, y casi nunca es grave: primero se vuela, con el pie y la velocidad; después, esa palanca atrás hasta que se calla y adelante despacio; si aguanta se deja ahí, y si no se para; se avisa y se vuelve",
  },
];

/**
 * **Los países cuya norma se ha leído**, y manda marcar el 7600 y mirar a la
 * torre también a quien vuela en visual: en España, el SERA (ADR 0014, H71); en
 * Paraguay, la DINAC —el R 2 remite al R 10, volumen II, 5.2.2.7.1.3.3, que
 * manda el código de falla de radio; cuál es lo dice el volumen IV, 2.1.4.2.2,
 * y el AIP, ENR 1.6, 2.4— (H86). En otro país no se ofrece hasta leer la suya.
 */
const NORMA_LEIDA: ReadonlySet<Scenario["pais"]> = new Set<Scenario["pais"]>(["es", "py"]);

/**
 * **Si en este campo se practica el fallo de radio**: con torre de verdad
 * —con lámpara, ni AFIS ni sin servicio— y en un país cuya norma se ha leído.
 * La lámpara no hace falta buscarla campo a campo: donde hay torre, la hay
 * (en Paraguay lo manda el R 14, volumen I, 5.1.3.1). En un AFIS no, aunque
 * tenga pistola de luces: allí la verde fija no autoriza, dice que la pista
 * está libre (R 11, apéndice 9, 11.1).
 */
export function campoConLamparaY7600(oaci: string | null): boolean {
  if (!oaci) return false;
  const esc = SCENARIOS.find((e) => oaciDe(e) === oaci);
  return !!esc && NORMA_LEIDA.has(esc.pais) && hayLampara(esc.aerodrome);
}

export function ejercicioPorId(id: string | null | undefined): Ejercicio | null {
  return EJERCICIOS.find((e) => e.id === id) ?? null;
}

/** Si este ejercicio se puede elegir con este peldaño y este avión. */
export function seOfrece(
  e: Ejercicio,
  peldano: TierId,
  avion: AvionDelEjercicio & { readonly approachSpeed?: number },
  /** El campo de casa, si se sabe. Un ejercicio que pide campo no se ofrece sin él. */
  oaci?: string | null,
): boolean {
  const helicoptero = avion.helicoptero !== undefined;
  const enEsteCampo = !e.dondeVale || (oaci !== undefined && e.dondeVale(oaci));
  const conEste = !e.conEsteAvion || (oaci !== undefined && e.conEsteAvion(avion, oaci));
  return (
    e.peldanos.includes(peldano) &&
    (e.deHelicoptero ?? false) === helicoptero &&
    e.valePara(avion) &&
    enEsteCampo &&
    conEste
  );
}

/** Los que se ofrecen con este peldaño y este avión, en su orden. */
export function ejerciciosPara(
  peldano: TierId,
  avion: AvionDelEjercicio & { readonly approachSpeed?: number },
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
