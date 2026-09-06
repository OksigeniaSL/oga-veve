/**
 * Ensamblaje del juego y bucle principal.
 *
 * Este fichero es el único que conoce a todos los demás. El modelo de vuelo
 * no sabe que hay una cámara, el terreno no sabe que hay un avión y el HUD
 * no sabe de dónde salen los números. Mantener esa separación es lo que hace
 * que se pueda cambiar el FDM por JSBSim sin tocar nada más
 * (docs/adr/0002-modelo-de-vuelo-propio.md).
 */

import {
  CanvasTexture,
  CircleGeometry,
  Clock,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { CoefficientFlightModel } from "./flight/fdm";
import { ArcadeFlightModel } from "./flight/arcade";
import {
  GUYRAMI,
  TIERS,
  rememberTier,
  rememberedTier,
  type Tier,
} from "./flight/tiers";
import { AIRCRAFT, OGA_172, type AircraftConfig } from "./flight/aircraft";
import { InputManager } from "./flight/input";
import type { FlightModel, FlightState } from "./flight/model";
import { Terrain, cabeceraEnUso } from "./world/terrain";
import { crearAproximacion, type Aproximacion } from "./world/aproximacion";
import { createSky, ponerNubes, updateSky, type SkyRig } from "./world/sky";
import { createAircraftMesh, type AircraftMesh } from "./world/aircraft-mesh";
import { cargarModelo } from "./world/aeronave-modelo";
import {
  ENTRADA_EN_FINAL,
  GLIDE_SLOPE,
  RunwayGuide,
  type PasoDeAro,
} from "./world/runway-guide";
import { createVegetation, zonaDeAeropuerto } from "./world/vegetation";
import { LECCION_POR_DEFECTO, type Leccion } from "./flight/lecciones";
import { pedirMetar, TIEMPO_DE_CASA, type Meteo } from "./world/meteo";

/**
 * El proxy del parte meteorológico. Ver `workers/meteo.js`.
 *
 * Sin configurar no se pide nada y se vuela con el tiempo de casa, que es a
 * propósito: quien juega en un colegio con la conexión caída tiene que poder
 * despegar.
 */
const PROXY_METEO: string | null = import.meta.env.VITE_METEO ?? null;

/**
 * La hora a la que arranca el juego si nadie pide otra.
 *
 * Las cuatro de la tarde, y el número está medido, no elegido a ojo. Con el
 * modelo de sol de `sky.ts` —amanecer a las seis, ocaso a las dieciocho— eso
 * pone el sol a **veintidós grados**: luz cálida, sombras largas y ladera al
 * sol contra ladera en sombra, que es lo que hace que un relieve se lea como
 * relieve.
 *
 * Se probó primero con las cinco y media, que es la hora que dice el ADR 0006 y
 * la que da el atardecer más bonito. Y es demasiado oscura para jugar: a esa
 * hora el sol está a cinco grados y **quien está rodando no ve las letras
 * pintadas en el asfalto**. El atardecer se elige; no se impone.
 */
const HORA_BUENA = 16;

/** A qué distancia de la cabecera empieza la lección de aterrizar, m. */
/** A cuántos metros del umbral empieza la lección de aterrizar. */
const APROXIMACION = ENTRADA_EN_FINAL;
/**
 * Y a qué altura sobre la pista: **la que da la senda a esa distancia**.
 *
 * Estaba en ciento ochenta metros, o sea tres grados y medio, mientras los
 * aros dibujaban cuatro y el PAPI marcaba tres. Tres sendas distintas en la
 * misma pantalla, y quien seguía una veía a las otras dos decirle que iba mal.
 * Ahora sale de la misma constante que colocan los aros, así que la lección
 * empieza **exactamente sobre la senda**: el primer aro está donde tiene que
 * estar desde el primer fotograma.
 */
const ALTURA_DE_FINAL = APROXIMACION * Math.tan(GLIDE_SLOPE);

/**
 * Cuánto se queda en pantalla la celebración de la frustrada, s.
 *
 * Cuatro y medio, que es más de lo que dura un aviso corriente. Es a
 * propósito: hay que darle tiempo a llegar mientras quien juega está ocupado
 * subiendo y mirando fuera, que es exactamente el momento en el que pasa.
 */
const SE_QUEDA_LA_FRUSTRADA = 4.5;

/**
 * Y cuánto tarda en volver a avisar de un bulto, s.
 *
 * Tres segundos. Es un antirrebote, no una duración: contra una pared se
 * choca **en todos los fotogramas**, y sin esto el aviso saldría sesenta veces
 * por segundo y el sonido con él.
 */
const SE_QUEDA_EL_BULTO = 3;

/**
 * Cuánto se queda en pantalla la corrección de un aro perdido, s.
 *
 * Dos segundos y medio: lo que hay entre un aro y el siguiente a velocidad de
 * aproximación. Más sería que la corrección de un aro tapara la del que viene.
 */
const SE_QUEDA_EL_ARO = 2.5;

/**
 * Los escalones de importancia de la señal. Ver `ui/senal.ts`.
 *
 * Son dos y no diez a propósito: lo que se está ordenando es «esto no puede
 * taparlo un mensaje de tránsito», no una jerarquía de oficina.
 */
/**
 * Cuánto se queda el dibujo de una toma mala, s.
 *
 * Cinco. Más que un aviso corriente porque no es un aviso: es el juicio de lo
 * que se acaba de hacer, y llega justo cuando quien juega está mirando por la
 * ventanilla a ver dónde ha ido a parar.
 */
const SE_QUEDA_EL_VEREDICTO = 5;

const IMPORTANTE = 1;
const URGENTE = 2;

/**
 * Cuántos segundos de vuelo se sondean por delante para avisar.
 *
 * Cuatro. Es el tiempo que hace falta para que el aviso sirva de algo: girar
 * o subir. Menos es contarlo cuando ya no se puede hacer nada.
 */
const SEGUNDOS_DE_AVISO = 4;

/** Y lo menos que se mira por delante, m, aunque se vaya despacio. */
const ALCANCE_MINIMO_DEL_AVISO = 120;

/**
 * Cuánto se sale por encima del tejado al quedarse dentro de un edificio, m.
 *
 * Tres: lo justo para estar fuera y no lo bastante para que parezca un salto.
 */
const POR_ENCIMA_DEL_TEJADO = 3;

/**
 * Cuánto se tarda en enseñar el final tras apagar el motor, s.
 *
 * Medio segundo. Apagar tiene su sonido y su hélice frenando, y encimarle la
 * pantalla le quita el momento a las dos cosas.
 */
const TARDA_EL_FINAL = 0.5;
/** Lo menos que se pasa por encima del terreno de debajo, m. */
const SUELO_MINIMO = 150;
import { crearCiudad } from "./world/ciudad";
import { Obstaculos } from "./world/obstaculos";
import { MissionMarker } from "./world/mission-marker";
import { MissionRunner } from "./missions/runner";
import { objectiveTarget, type Mission } from "./missions/types";
import { missionsFor } from "./content/missions";
import {
  conViento,
  VALLE_CORDILLERA,
  VECES_LEJOS,
  type Scenario,
} from "./world/scenarios";
import { crearTeselas, type Teselas } from "./world/teselas";
import type { Ortofoto } from "./world/ortofoto";
import { mundoElegido } from "./ui/mundo";

/**
 * La clave de las teselas fotorrealistas. Ver `workers/meteo.js` y `.env.example`.
 *
 * Sin ella el juego pinta su mundo de polígonos, que es el de siempre y el que
 * arranca en cualquier máquina. Eso no es un modo degradado: es el suelo sobre
 * el que se construye todo lo demás.
 */
const CLAVE_TESELAS: string | null = import.meta.env.VITE_GOOGLE_TILES ?? null;
import { Hud } from "./ui/hud";
import { CreditsScreen } from "./ui/credits";
import { nombreDeTecla } from "./flight/keymap";
import { elegirInstructor, type Instructor } from "./audio/instructor";
import type { ControlInputs } from "./flight/model";
import { delante, enEjesDePista, puntoDePista } from "./world/rumbo";
import { PlanDeVuelo, type Vista } from "./world/plan-de-vuelo";
import { Senalero } from "./world/senalero";
import type { Gesto } from "./flight/senalero";
import { Sigueme } from "./world/sigueme";
import { techoDeLoQueSeConstruye } from "./world/superficie-de-aproximacion";
import { LandingWatcher, type Aterrizaje } from "./flight/aterrizaje";
import { Galones } from "./flight/galones";
import { Frustrada } from "./flight/frustrada";
import { topeDeRodaje } from "./flight/gobernador";
import type { Fase } from "./flight/vuelo";
import { reconocer } from "./flight/reconocimiento";
import { arranqueEnPista } from "./world/aerodrome";
import { KeyScreen } from "./ui/teclas";
import { LOCALE_NAMES, cycleLocale, t } from "./i18n";
import { Audio } from "./audio/audio";
import { AvisosDeAltura } from "./flight/avisos-de-altura";
import { avisoDeTerreno, fueraDeLaSenda } from "./flight/aviso-de-terreno";
import {
  bandaDeRodaje,
  bandaDeVelocidad,
  type BandaDeVelocidad,
} from "./flight/velocidad-de-aproximacion";
import { callar, decir, permitirVoz } from "./audio/voz";
import { MAX_PASO } from "./flight/fdm";
import { bankAngleOf, pitchAngleOf } from "./ui/actitud";

/**
 * Vistas disponibles, en el orden en que rota la tecla C.
 *
 * `pajaro` es la cabina **sin avión**: la cámara va donde los ojos del piloto
 * y la aeronave no se dibuja, así que lo único que hay delante es el mundo.
 * «En algunos juegos recuerdo que había una opción para ocultar la aeronave,
 * era como si tú fueras el pájaro.»
 *
 * Va la última del ciclo a propósito. Es la vista más bonita y la que menos
 * enseña —sin panel, sin morro, sin nada que diga cómo va el avión—, así que
 * se llega a ella después de las tres que sí enseñan.
 */
const CAMERA_MODES = ["chase", "cockpit", "wing", "pajaro"] as const;

/**
 * Las fases en las que se corre por el asfalto y la banda de rodaje se calla.
 *
 * Todo lo demás en el suelo es rodar, y rodando hay una velocidad correcta.
 */
const CORRIENDO = new Set(["despegando", "comprometido", "aterrizado"]);

/*
 * **Aquí vivía la velocidad de entrada en final, y ahora la dice el modelo.**
 *
 * Era vez y media la de aproximación para todos, y el modelo sencillo —el de
 * Guyrami— no la puede sostener: su abanico entero va de nueve décimas de la
 * de aproximación a dos tercios del crucero. Así que la lección arrancaba con
 * el gas pinzado al cien por cien, el avión frenaba solo cuarenta y cuatro
 * kilómetros por hora sin que nadie tocara nada, y encima subía.
 *
 * Un número que uno de los dos modelos no puede sostener no es una velocidad
 * de entrada: es una postura que se deshace sola. Ver `velocidadDeEntradaEnFinal`.
 */
type CameraMode = (typeof CAMERA_MODES)[number];

/** Campo de visión en reposo y cuánto se abre a velocidad máxima, en grados. */
const BASE_FOV = 62;
const FOV_STRETCH = 9;
/**
 * Velocidad, en m/s, a la que el campo de visión llega a su tope.
 *
 * Baja a propósito. Con la referencia en setenta, a velocidad de rotación
 * —treinta— solo se había abierto el cuarenta por ciento, así que toda la
 * carrera por pista transcurría con el ángulo casi quieto y no se apreciaba
 * acelerar. Lo que tiene que leerse es el **cambio**, y el cambio importa
 * justo donde se acelera de verdad, no en crucero.
 */
const FOV_REFERENCE = 44;
/** Amplitud del traqueteo de pista, en metros. */
const SHAKE_AMPLITUDE = 0.42;
/** Velocidad, en m/s, a la que el traqueteo llega a su máximo. */
const SHAKE_REFERENCE = 30;
/** Cuánto retrocede la cámara por cada m/s² de aceleración. */
const ACCELERATION_LAG = 0.9;
/** Segundos que tarda el traqueteo en apagarse al despegar. */
const SHAKE_FADE = 0.2;

/**
 * Segundos que se ve el avión roto antes de volver solo a la pista. Corto a
 * propósito: esperar sin poder hacer nada es lo más aburrido que hay.
 */
const CRASH_RESET_DELAY = 2.2;

export interface GameOptions {
  canvas: HTMLCanvasElement;
  hudRoot: HTMLElement;
  creditsRoot: HTMLElement;
  touchRoot: HTMLElement;
  scenario?: Scenario;
  aircraft?: AircraftConfig;
  /** A qué se juega hoy. Ver `flight/lecciones.ts`. */
  leccion?: Leccion;
  /** La misión elegida en el hangar, si se eligió una. */
  mision?: Mission | null;
  /**
   * La ortofoto del escenario, si la hay.
   *
   * Va por las opciones y no por un método aparte porque **el terreno y la
   * ciudad se construyen en el constructor**, y los dos la necesitan: uno para
   * llevarla puesta y otra para teñir sus casas con el color del suelo.
   * Pasarla después obligaba a rehacer la ciudad entera.
   */
  ortofoto?: Ortofoto;
  /**
   * Y la fina, sobre el aeródromo, si la hay.
   *
   * La ancha se estira sobre el escenario entero y a ras de suelo es una
   * acuarela. Esta cubre solo los seis kilómetros donde se rueda, se despega y
   * se aterriza, que es donde se mira el suelo de cerca. Ver
   * `Terrain.ponerOrtofotoFina`.
   */
  ortofotoFina?: Ortofoto;
}

/**
 * A partir de qué velocidad se sigue considerando que se corre, m/s.
 *
 * Doce metros por segundo son cuarenta y tres por hora: por debajo de eso ya
 * se rueda, y rodar no es correr. Es el mismo número que usa la máquina de
 * fases para dar por terminada la carrera de aterrizaje, y tiene que serlo:
 * dos umbrales parecidos para lo mismo son dos verdades distintas.
 */
/**
 * Metros antes del umbral donde el aviso de terreno ya se calla.
 *
 * Trescientos: a la pendiente de planeo son quince metros de altura, o sea el
 * último tramo en el que ya no se hace otra cosa que aterrizar.
 */
/**
 * Metros que hay que pasarse del puesto para que el juego lo diga, m.
 *
 * Diez: un avión de nueve metros de largo entero por delante de su sitio. Menos
 * que eso es pararse un poco largo, y de eso no se avisa.
 */
const SE_PASO_DEL_PUESTO = 10;

/**
 * Altura sobre la pista a la que el juego dice que ya se puede tocar, m.
 *
 * Dieciocho: el umbral se cruza a quince por la senda de planeo, y los tres de
 * propina son para que quien llega un poco alto lo oiga igual. Es el momento en
 * el que se deja de volar y se empieza a aterrizar.
 */
const ALTURA_DE_TOMA = 18;

const ANTES_DEL_UMBRAL = 300;

/**
 * Cuánto se perdona de desvío lateral para seguir «sobre la pista», m.
 *
 * Cuarenta a cada lado del asfalto: quien cruza el umbral un poco descentrado
 * sigue aterrizando, no sobrevolando el campo.
 */
const A_UN_LADO_DEL_EJE = 40;

const RODAJE_DE_VERDAD = 12;

/**
 * La velocidad de rodaje, m/s, para cuando el plan no sugiere ninguna.
 *
 * Nueve. Es el mismo número que usan la banda de velocidad y el plan, y por
 * eso está escrito con su nombre y no suelto: es **el** número.
 */
const RODAJE = 9;

/**
 * Cuánto se mete el coche del «sígame» en la calle de salida al esperar, m.
 *
 * **Cuarenta, y son cuarenta por una razón vista jugando.** El primer intento
 * lo plantaba en el primer punto de la ruta que ya no pisaba asfalto de pista,
 * y eso resultó ser el propio borde: medido, veinticinco metros del eje de una
 * pista de cuarenta y cinco de ancho — o sea, dos metros y medio pasada la
 * raya. Ahí no espera nadie: ahí lo alcanza el avión que está frenando y le
 * pasa por encima, que es exactamente lo que se grabó.
 *
 * Un sígame de verdad espera **dentro** de la calle, donde se le ve por delante
 * y a la derecha y no estorba a quien todavía viene por la pista.
 */
const BIEN_FUERA_DE_LA_PISTA = 40;

/**
 * A partir de cuánta ayuda de rodaje se considera que el juego conduce.
 *
 * Medio. Por debajo —Taguató y Taguató Ruvicha— la ayuda solo evita que te
 * salgas, y ahí la velocidad es cosa tuya. Sale de la misma escalera de
 * `tiers.ts` para no añadir otro mando que se pueda desafinar por su cuenta.
 */
const CONDUCE_EL_JUEGO = 0.5;

/**
 * Las fases en las que se rueda, que son en las que hay tope de velocidad.
 *
 * La ida al punto de espera y la vuelta a casa, que son justo los dos sitios
 * donde se dijo el problema —«puedo acelerar a tope en rodadura» y «puedo
 * adelantar al coche del sígame»—. No están ni el despegue ni la carrera de
 * aterrizaje: ahí un avión va rápido en el suelo porque tiene que ir rápido.
 *
 * Y no basta con la fase: hace falta además que la torre no haya dado el
 * verde. Ver `limitarElRodaje`.
 */
/**
 * Las fases en las que se está despegando, que son en las que existe V1.
 *
 * «¿Por qué la retira si aumento la velocidad si lo que estoy haciendo es
 * aterrizar?» Porque el HUD lo deducía de la velocidad, y en pista rápido y
 * con gas describe igual de bien las dos carreras. En un aterrizaje no hay V1:
 * V1 es el punto a partir del cual ya no se puede abortar un despegue, y
 * después de tomar tierra no hay nada que abortar — hay una pista que se
 * acaba, que es otra cosa y necesita el freno puesto.
 */
const EN_DESPEGUE: ReadonlySet<Fase> = new Set<Fase>([
  "alineando",
  "despegando",
  "comprometido",
]);

/**
 * Las fases cuya tarjeta **espera a que alguien haga algo**, y por eso no
 * caduca: arrancar, parar en la doble raya, frenar, salir de la pista, apagar.
 *
 * Están aquí arriba porque hacen falta en dos sitios: para ponerlas con
 * `Infinity` y para **devolverlas** cuando un aviso de paso se las lleva por
 * delante. Ver `avanzarPlan`.
 */
const SE_QUEDAN: ReadonlySet<Fase> = new Set<Fase>([
  "estacionado",
  "en-puesto",
  "esperando",
  "aterrizado",
  "abandonando",
  /*
   * **Y rodar también se queda puesto**, que costó verlo.
   *
   * «Seguí la raya verde» y «volvé a tu lugar» duraban seis segundos y después
   * la pantalla se quedaba en blanco: en el banco del vuelo entero, **sesenta
   * y ocho segundos seguidos** rodando hacia la plataforma sin una sola
   * tarjeta. No es una fase de paso como despegar o virar: es una orden que
   * sigue siendo verdad durante todo el rato que dura, igual que «frená».
   */
  "rodando",
  "a-plataforma",
  /*
   * Y las dos de entrar en pista: «luz verde, entrá» y «ponete derechito en el
   * eje» duran lo que tarde quien juega en hacerlo, que es la maniobra más
   * delicada del rodaje. También se quedaban en blanco a los seis segundos.
   */
  "autorizado",
  "alineando",
]);

const RODANDO_DE_VERDAD: ReadonlySet<Fase> = new Set<Fase>([
  "estacionado",
  "arrancando",
  "rodando",
  "esperando",
  "abandonando",
  "a-plataforma",
  "en-puesto",
]);

export class Game {
  /** Qué se está enseñando hoy: de aquí sale qué guía se enciende. */
  private readonly leccion: Leccion;
  /** El mundo de verdad, si hay clave y aeródromo. */
  private readonly teselas: Teselas | null;
  private mundoRealPuesto = false;
  private sueloMoldeado = false;
  /**
   * Las luces de aproximación y el PAPI.
   *
   * Van aparte del resto del aeródromo, y a propósito: se montan **después** de
   * moldear el suelo con la fotografía. Las luces de borde, que se montan con
   * el aeródromo, quedan enterradas cuarenta y siete metros cuando llega el
   * datum de la foto —por eso se apagan—; estas llegan cuando el suelo ya es el
   * que es y se quedan donde tienen que estar.
   */
  private aproximacion: Aproximacion | null = null;
  /**
   * Segundos desde la última vez que se preguntó por los edificios de la foto.
   *
   * Se pregunta cada tres, y se sigue preguntando hasta tener respuesta. No hay
   * plazo: volando, el detalle de la ciudad se afina solo, y la respuesta puede
   * tardar en llegar lo que tarde el jugador en subir.
   */
  /** Cuántos bultos se le quitaron al suelo copiado de la foto. Para mirarlo. */
  private bultosQuitados = 0;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly clock = new Clock();

  private readonly terrain: Terrain;
  private readonly sky: SkyRig;
  private aircraftMesh: AircraftMesh;
  private aircraft: AircraftConfig;
  private scenario: Scenario;
  private flight: FlightModel;
  private tier: Tier = rememberedTier();
  private readonly input: InputManager;
  private readonly audio = new Audio();
  private readonly missions = new MissionRunner();
  private vegetacion: Group | null = null;
  private readonly missionMarker = new MissionMarker();
  private readonly runwayGuide: RunwayGuide;
  /** Índice de la misión de la lista del escenario, o -1 en vuelo libre. */
  private missionIndex = -1;
  /**
   * La cuenta atrás de la toma: *one hundred… fifty, thirty, twenty, ten*.
   *
   * Vive en el juego y no en el HUD porque no es un adorno de pantalla: es lo
   * que enseña el ritmo de la recogida, y se dice **y** se dibuja.
   */
  private readonly avisosDeAltura = new AvisosDeAltura();
  /** Segundos seguidos fuera de la banda de velocidad. Ver el bucle. */
  private fueraDeBanda = 0;
  /** Qué se dijo la última vez, para no repetirlo mientras siga igual. */
  private dichoDeBanda: "lento" | "rapido" | null = null;
  /** El último aviso de terreno dicho, para no repetirlo cada fotograma. */
  private terrenoDicho: "bajo" | "sube" | null = null;

  /** La misión elegida en el hangar, hasta que arranca. Ver `start`. */
  private misionInicial: Mission | null;
  private readonly hud: Hud;
  private credits: CreditsScreen;
  private readonly creditsRoot: HTMLElement;
  private keyScreen: KeyScreen | null = null;

  /** Reconoce el aterrizaje y su calidad. Ver `flight/aterrizaje.ts`. */
  private readonly landing = new LandingWatcher();
  /** Los galones de este vuelo. Ver `flight/galones.ts`. */
  private readonly galones = new Galones();
  /** Reconoce cuándo se renuncia a una aproximación. Ver `flight/frustrada.ts`. */
  private readonly frustrada = new Frustrada();
  /** Contra qué se choca además del suelo. Ver `world/obstaculos.ts`. */
  private readonly bultos = new Obstaculos();
  /** Dónde estaba el avión antes de este paso, para mirar el camino entero. */
  private readonly antesDelPaso = new Vector3();
  /** Segundos que le quedan al aviso del bulto, para no repetirlo cada paso. */
  private avisandoDelBulto = 0;
  /**
   * Lo más rápido que se puede ir ya en esta carrera de aterrizaje, m/s.
   *
   * Un trinquete: baja con el avión y nunca sube. Ver `limitarElRodaje`.
   */
  private techoDeLaCarrera = Infinity;
  /** Si este vuelo ya terminó, para no enseñar el final dos veces. */
  private vueloTerminado = false;
  /** Lo último que dijo el plan de vuelo, para quien lo necesite después. */
  private vistaActual: Vista | null = null;
  /** Si ahora mismo la pantalla está pidiendo freno. Ver `avanzarPlan`. */
  private pidiendoFreno = false;
  /** Si ya se avisó de esta pasada de largo. Ver `atenderAlSenalero`. */
  private avisadoDeLaPasada = false;
  /** Si ya se dijo en esta aproximación que se puede tocar. */
  private dichoDeLaToma = false;
  /** El gesto del señalero que se está enseñando en la tarjeta, si hay uno. */
  private gestoEnPantalla: Gesto = null;
  /** El señor de los bastones, esperando en el puesto. Ver `world/senalero.ts`. */
  private readonly senalero = new Senalero();
  /** Y el coche del «sígame», en los dos peldaños de abajo. Ver `world/sigueme.ts`. */
  private readonly sigueme = new Sigueme();
  /**
   * El vuelo completo: de dónde se sale, por dónde se rueda y qué toca ahora.
   *
   * Solo existe cuando el escenario tiene un aeródromo de verdad con puestos de
   * estacionamiento. En una pista inventada no hay de dónde salir ni a dónde
   * volver, así que se vuela como siempre: alineado en la cabecera.
   */
  private plan: PlanDeVuelo | null = null;
  /** Ver `abrirVentanaDePruebas`. Siempre nulo fuera de desarrollo. */
  private pilotoDePruebas: ((c: ControlInputs) => void) | null = null;
  /**
   * La voz que dice qué toca.
   *
   * Hoy es la del navegador y suena a robot; mañana serán trozos grabados por
   * una persona. El juego pide «di esto» y no sabe quién contesta, que es lo
   * que permitirá cambiarla sin tocar nada de aquí.
   */
  private readonly instructor: Instructor = elegirInstructor();
  /** La última fase anunciada, para no repetir el aviso cada fotograma. */
  private faseAnunciada = "";

  private cameraMode: CameraMode = "chase";
  private propellerAngle = 0;
  /** Estado del avión en el fotograma anterior, para detectar los cambios. */
  private wasOnGround = true;
  private wasStalled = false;
  private wasCrashed = false;
  /** Cuánto traqueteo hay ahora mismo, de 0 a 1. Se apaga solo al despegar. */
  private shake = 0;
  private shakeClock = 0;
  /** Aceleración longitudinal filtrada, para el retroceso de cámara. */
  private surge = 0;
  private lastAirspeed = 0;
  private readonly blobShadow: Mesh;
  /** Respeta la preferencia del sistema de reducir movimiento. */
  private readonly reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  private running = false;
  /** Segundos que lleva el avión roto. Ver `frame`. */
  private crashedFor = 0;

  // Vectores de trabajo, reutilizados en el bucle.
  private readonly desiredCamera = new Vector3();
  private readonly lookTarget = new Vector3();
  private readonly offset = new Vector3();

  constructor(options: GameOptions) {
    this.scenario = options.scenario ?? VALLE_CORDILLERA;
    this.leccion = options.leccion ?? LECCION_POR_DEFECTO;
    this.misionInicial = options.mision ?? null;
    this.aircraft = options.aircraft ?? OGA_172;

    this.renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    // Tope de 2: por encima no se distingue y en una tablet cuesta la mitad
    // de los fotogramas. Ver AGENTS.md, regla de rendimiento.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // El plano lejano llega hasta donde llegue el terreno. Con horizonte lejano
    // eso son ochenta y seis kilómetros: el Teide está a treinta y siete y medio
    // y con los veintiocho de antes se cortaba antes de llegar a él. Alejar el
    // plano lejano casi no cuesta precisión —la que importa la fija el cercano,
    // que no se toca— y es lo que deja ver una isla entera.
    this.camera = new PerspectiveCamera(
      62,
      1,
      0.6,
      /*
       * Con el mundo de verdad puesto, el plano lejano sube a **ciento veinte
       * kilómetros**. No es capricho: las teselas se cargan por error de
       * pantalla, así que lo que queda fuera del plano no se pide, y con
       * veintiocho kilómetros el horizonte se cortaba a la mitad del mar.
       *
       * Alejarlo casi no cuesta precisión de profundidad —la que importa la fija
       * el plano cercano, que no se toca— y es lo que deja ver una isla entera.
       */
      this.claveDeTeselas()
        ? 120000
        : this.scenario.size *
            (this.scenario.relieveLejano ? VECES_LEJOS * 0.8 : 1.6),
    );

    this.terrain = new Terrain(this.scenario);
    this.scene.add(this.terrain.group);

    /*
     * El plan de vuelo, si este aeródromo da para uno **y la lección lo pide**.
     *
     * Va aquí, justo detrás del terreno, porque necesita la cota ya aplanada
     * para pintar la ruta a ras de asfalto.
     *
     * Y lo de la lección no es un detalle: quien eligió «dar una vuelta» no
     * quiere una raya verde, una diana ni una doble raya. Antes salían siempre,
     * y sin haberlas pedido son cosas raras en el suelo: «las señales de
     * aterrizaje en principio no se sabe para qué está eso ahí».
     */
    if (this.scenario.aerodrome && this.leccion.guiaEnTierra) {
      this.plan = new PlanDeVuelo(
        this.scenario.aerodrome,
        this.scenario.runway,
        (x, z) => this.terrain.sampleHeight(x, z),
      );
      this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
      this.scene.add(this.plan.grupo);
      /*
       * Y con el plan, quien te espera al final de él.
       *
       * Va atado al plan y no al aeródromo porque **sin ruta no hay puesto al
       * que volver**: quien eligió dar una vuelta no tiene a nadie esperándole,
       * y una persona plantada en la plataforma sin motivo es un adorno raro.
       */
      this.scene.add(this.senalero.grupo);
      this.scene.add(this.sigueme.grupo);
    }

    this.sky = createSky(this.scenario);
    /*
     * **Las cinco y media de la tarde**, y no el mediodía.
     *
     * Es la hora a la que un relieve se lee como relieve: sol bajo, sombras
     * largas, ladera al sol y ladera en sombra. El mediodía es la única hora
     * del día en la que un paisaje no tiene forma, y era la que estaba fijada.
     */
    this.sky.ponerHora(this.horaPedida());
    this.scene.add(this.sky.group);
    this.scene.fog = this.sky.fog;

    // La ciudad antes que la vegetación: la vegetación pregunta por ella para
    // no plantar un bosque donde hay un barrio.
    // La manta del mundo, antes que nada de lo que va encima.
    if (options.ortofoto) this.terrain.ponerOrtofoto(options.ortofoto);
    if (options.ortofotoFina) {
      this.terrain.ponerOrtofotoFina(options.ortofotoFina);
    }

    if (this.scenario.ciudad) {
      this.scene.add(
        crearCiudad(
          this.scenario.ciudad,
          (x, z) => this.terrain.sampleHeight(x, z),
          // Con doscientos metros de margen: un edificio pegado a la pista es
          // un obstáculo, y un aeropuerto de verdad tiene a su alrededor
          // justamente eso, un vacío.
          /*
           * El margen baja de doscientos metros a la franja de pista. Con
           * doscientos, la ciudad se excluía a trescientos cincuenta del eje
           * y la superficie de transición —que llega a ciento cuarenta— no
           * tocaba una sola casa: quedaba una calva de setecientos metros de
           * ancho donde la foto enseña un barrio. Ahora la calva es la franja
           * de verdad y lo demás lo achata la superficie, que es lo bonito.
           */
          zonaDeAeropuerto(this.scenario, 60),
          this.scenario.waterLevel,
          // Sobre la fotografía, sin calles: la foto ya las trae.
          !options.ortofoto,
          /*
           * El color del suelo, preguntando primero a la foto fina.
           *
           * Donde llega, es la que sabe: a dos metros por píxel un tejado es
           * un tejado, y a ocho es la media de la manzana con su calle. Fuera
           * de su recorte devuelve `null` y contesta la ancha.
           */
          options.ortofoto
            ? (x, z) =>
                options.ortofotoFina?.color(x, z) ??
                options.ortofoto!.color(x, z)
            : undefined,
          /*
           * Y el techo de obstáculos, que es una norma y no un gusto: nada
           * puede asomar por encima de las superficies que salen de la pista.
           * Ver `world/superficie-de-aproximacion.ts`.
           */
          (x, z) =>
            this.terrain.runwayElevation +
            techoDeLoQueSeConstruye(x, z, this.scenario.runway),
          /*
           * Y el índice de bultos, que es lo que hace que la ciudad **esté**.
           * Hasta hoy se atravesaba entera. Ver `world/obstaculos.ts`.
           */
          this.bultos,
        ),
      );
    }
    this.vegetacion = createVegetation(
      this.scenario,
      (x, z) => this.terrain.sampleHeight(x, z),
      // Sobre la fotografía, solo donde la fotografía es verde. Ver
      // `createVegetation`.
      options.ortofoto
        ? (x, z) =>
            options.ortofotoFina?.color(x, z) ?? options.ortofoto!.color(x, z)
        : undefined,
    );
    this.scene.add(this.vegetacion);

    /*
     * Y el mundo de verdad, si lo hay. Se añade apagado: no se enseña hasta que
     * ha medido su desfase contra nuestro suelo, porque aparecer cuarenta metros
     * desplazado y luego dar un salto es peor que tardar un segundo más.
     */
    this.teselas = crearTeselas(
      this.scenario,
      this.claveDeTeselas(),
      (x, z) => this.terrain.sampleHeight(x, z),
      /*
       * Si la fotografía no llega, se dice **una vez** y se sigue volando en
       * el mundo dibujado. Caer en silencio es lo que hizo perder una tarde
       * buscando en el código un 403 de Google.
       *
       * Va con retraso porque en el arranque el HUD todavía no existe: el
       * error puede llegar antes de que haya pantalla donde escribirlo.
       */
      (motivo) => {
        setTimeout(() => {
          this.hud.flash(t("hud.sinFoto"), 7);
          // eslint-disable-next-line no-console
          console.warn("[óga veve] la fotografía no está disponible:", motivo);
        }, 2500);
      },
    );
    if (this.teselas) this.scene.add(this.teselas.grupo);

    this.runwayGuide = new RunwayGuide(
      this.scenario,
      this.terrain.runwayElevation,
      (x: number, z: number) => this.terrain.sampleSurface(x, z),
    );
    /*
     * **Y solo cuando toca.** El haz de luz, los postes y los aros de la senda
     * son el material de la lección de aterrizar; en cualquier otra son cosas
     * raras flotando en el aire. Quien pidió despegar los estaba viendo igual:
     * «se ven los aros y el faro del ejercicio de aterrizaje y pedí despegar».
     *
     * El objeto se construye de todas formas porque hay código que lo reinicia
     * y lo consulta; lo que no entra en la escena es su geometría.
     */
    if (this.leccion.id === "aterrizaje")
      this.scene.add(this.runwayGuide.group);

    this.aircraftMesh = createAircraftMesh(this.aircraft);
    this.scene.add(this.aircraftMesh.group);
    // Y si hay un modelo de verdad, se cambia por él cuando termine de cargar.
    // Las cajas se ponen primero a propósito: nadie espera mirando un cielo
    // vacío a que llegue un fichero.
    void this.ponerModeloSiLoHay();

    this.blobShadow = createBlobShadow(this.aircraft.wingSpan);
    this.scene.add(this.blobShadow);
    this.scene.add(this.missionMarker.group);

    this.flight = this.buildFlightModel(this.tier);

    this.hud = new Hud(options.hudRoot);
    this.hud.setInstruments(this.tier.instruments);
    this.hud.setUnits(this.tier.units);
    this.hud.setMagneticVariation(this.scenario.magneticVariation);
    this.creditsRoot = options.creditsRoot;
    this.credits = new CreditsScreen(
      this.creditsRoot,
      this.flight.implementationName,
    );

    /*
     * Las etiquetas de los mandos táctiles, traducidas.
     *
     * Estaban escritas en el HTML y en castellano fijo —«Palanca», «Timón»,
     * «Motor»—, así que quien juega en guaraní o en inglés y usa lector de
     * pantalla oía castellano. El marcado es estático, así que se rellenan
     * aquí, que es donde ya vive el diccionario.
     */
    for (const mando of options.touchRoot.querySelectorAll<HTMLElement>(
      "[data-i18n-label]",
    )) {
      mando.setAttribute("aria-label", t(mando.dataset.i18nLabel as never));
    }

    this.input = new InputManager(options.touchRoot, {
      toggleCamera: () => this.cycleCamera(),
      toggleAssist: () => this.cycleTier(),
      resetFlight: () => this.resetFlight(),
      toggleKeys: () => this.keyScreen?.toggle(),
      toggleEngine: () => this.toggleEngine(),
      toggleCredits: () => this.credits.toggle(),
      cycleAircraft: () => this.cycleAircraft(),
      cycleMission: () => this.cycleMission(),
      cycleLanguage: () => this.changeLanguage(),
      toggleSound: () => this.toggleSound(),
      firstGesture: () => this.audio.unlock(),
    });

    this.audio.prepare();
    this.audio.setEngine(this.aircraft.sound);
    this.hud.setSoundLevel(
      this.audio.level.glyph,
      t(`sound.${this.audio.level.id}` as never),
    );
    // La pantalla de teclas se monta si existe su hueco. Es opcional a
    // propósito: el juego tiene que arrancar aunque falte.
    const teclasRoot = document.getElementById("teclas");
    if (teclasRoot)
      this.keyScreen = new KeyScreen(teclasRoot, this.input.keymap);
    // Sin letras, teclado dibujado. Con letras, la tabla.
    this.keyScreen?.setSimple(
      this.tier.instruments === "none" || this.tier.instruments === "pictorial",
    );
    this.hud.onKeys(() => this.keyScreen?.toggle());
    this.hud.onCredits(() => this.credits.toggle());
    // Volver al hangar es recargar. Suena brusco y es lo correcto: la elección
    // ya está guardada, cambiar de aeropuerto es empezar otro vuelo, y así no
    // hay que inventar el desmontaje en caliente de un escenario entero —que
    // es donde se quedan las fugas de memoria de los juegos web—.
    this.hud.onHangar(() => location.reload());
    this.hud.ponerMapa(this.scenario, (x, z) =>
      this.terrain.sampleHeight(x, z),
    );
    /*
     * Las luces de aproximación y el PAPI, ya desde el principio.
     *
     * Se vuelven a montar al moldear el suelo con la fotografía, pero tienen
     * que existir antes: **sin clave de teselas no hay foto y no habría
     * moldeado**, y el juego sin clave tiene que seguir siendo el juego.
     */
    this.ponerAproximacion();
    this.hud.ponerHora(this.horaPedida(), (h) => this.ponerHora(h));
    /*
     * Y el cielo. Empieza despejado porque es el que deja ver el mundo, que es
     * de lo que va esto; las nubes se eligen cuando se quieren, y entonces se
     * atraviesan despegando, que es el momento por el que están.
     */
    this.hud.ponerCielo(0, (alturaM, tapadura) => {
      if (this.sky) ponerNubes(this.sky, alturaM, tapadura);
    });
    this.hud.ponerTiempo(
      this.scenario.meteo ?? TIEMPO_DE_CASA,
      (m) => this.ponerTiempo(m),
      () => void this.tiempoDeVerdad(),
    );
    this.hud.setKeySource((accion) =>
      nombreDeTecla(this.input.preferredKey(accion)),
    );

    /*
     * La primera vez se abre sola. Una pantalla que explica los mandos no
     * sirve de nada si hay que saber que existe para encontrarla, y quien no
     * lee no va a descubrir una tecla por su cuenta.
     *
     * **Pero solo con teclado.** Se abría también en tablet, y ahí es un
     * teclado QWERTY dibujado que no existe: tapa el juego en el primer
     * segundo, anuncia mandos que no están y calla los cuatro que sí. Encima
     * el truco que la hace útil —la tecla se enciende al pulsarla— cuelga de
     * `keydown`, así que con el dedo no se enciende nunca nada.
     *
     * Con el dedo, los mandos ya dicen lo que hacen: cada uno lleva su dibujo
     * dentro. Ver `index.html`.
     */
    const conTeclado = matchMedia("(pointer: fine)").matches;
    if (
      conTeclado &&
      this.keyScreen &&
      !localStorage.getItem("oga-veve:teclas-vistas")
    ) {
      try {
        localStorage.setItem("oga-veve:teclas-vistas", "1");
        this.keyScreen.show();
      } catch {
        // Sin almacenamiento se abrirá cada vez, que tampoco es un drama.
      }
    }

    this.hud.onSoundClick(() => this.toggleSound());
    // `?fps=1` enciende el contador de fotogramas. Ver `Hud.mostrarFps`.
    if (new URLSearchParams(location.search).get("fps")) this.hud.pedirFps();
    // Y el botón del final: otro vuelo, que es lo que uno quiere hacer ahí.
    this.hud.onOtroVuelo(() => this.resetFlight());
    this.hud.onBrake((pressed) => this.input.setTouchBrakes(pressed));
    this.hud.onThrottle((direction) => this.input.setButtonThrottle(direction));

    window.addEventListener("resize", this.onResize);
    this.onResize();
    this.resetFlight();
    this.abrirVentanaDePruebas();
    this.hud.flash(`${t("help.start")} · ${t("help.assist")}`, 8);
  }

  /**
   * Una ventana al estado, **solo en desarrollo**.
   *
   * Existe porque comprobar el rodaje desde fuera exige saber dónde está el
   * avión y por dónde va la ruta, y sin esto la única forma de mirar era una
   * captura. El primer intento de comprobación automática rodó tan mal que
   * despegó de la plataforma a doscientos por hora sin que nadie se enterara.
   *
   * `import.meta.env.DEV` lo borra del paquete que se publica: no es una
   * puerta trasera, es un banco de pruebas.
   */
  private abrirVentanaDePruebas(): void {
    if (!import.meta.env.DEV) return;
    (globalThis as { __oga?: unknown }).__oga = {
      estado: () => this.flight.state,
      fase: () => this.faseAnunciada,
      // Los mandos, para poder pilotar desde una comprobación sin pasar por el
      // teclado: cada tecla enviada desde fuera cuesta un viaje de ida y vuelta
      // al navegador, y rodar ciento cuarenta metros así tardaba minutos.
      /** Los mandos, para poder mirarlos desde una comprobación. */
      controles: () => this.input.controls,
      /** La cota que da la foto sin filtrar, para comprobar lejos del aeropuerto. */
      cotaCruda: (x: number, z: number) =>
        this.teselas?.medidaDirecta(x, z) ?? null,
      /** De qué color se ven las cuatro del PAPI ahora mismo. */
      papi: () => {
        const m = this.aproximacion?.grupo.getObjectByName("papi") as
          { instanceColor?: { array: ArrayLike<number> } } | undefined;
        const a = m?.instanceColor?.array;
        if (!a) return null;
        // Azul alto es blanco; azul bajo es rojo. Es la separación que hay.
        return Array.from({ length: 4 }, (_, k) =>
          a[k * 3 + 2]! > 0.5 ? "blanca" : "roja",
        );
      },
      /**
       * Dónde está la cinta verde respecto del suelo, en metros.
       *
       * Existir no basta: sus cotas van horneadas, así que puede estar
       * perfectamente construida y **enterrada** bajo el asfalto. Un número
       * cerca de cero es que se ve; muy negativo, que está debajo.
       */
      cintaGuia: () => {
        const g = this.plan?.grupo;
        if (!g) return null;
        const alturas: number[] = [];
        g.traverse((o) => {
          const geo = (
            o as { geometry?: { attributes?: { position?: never } } }
          ).geometry;
          const pos = geo?.attributes?.position as
            | {
                count: number;
                getX(i: number): number;
                getY(i: number): number;
                getZ(i: number): number;
              }
            | undefined;
          if (!pos) return;
          for (let i = 0; i < pos.count; i += 7) {
            alturas.push(
              pos.getY(i) - this.terrain.sampleHeight(pos.getX(i), pos.getZ(i)),
            );
          }
        });
        if (!alturas.length) return { vertices: 0, sobreElSuelo: null };
        alturas.sort((a, b) => a - b);
        return {
          vertices: alturas.length,
          sobreElSuelo: alturas[Math.floor(alturas.length / 2)]!,
        };
      },
      /**
       * Pone el avión en un sitio, de verdad.
       *
       * **Y hace falta que sea el modelo quien lo ponga.** Escribir en
       * `estado()` mueve el avión y le deja la velocidad puesta: el banco de
       * pruebas colocaba la avioneta en el puesto y allí seguía a treinta
       * metros por segundo, así que la máquina de fases no daba el vuelo por
       * terminado y una comprobación buena salía en rojo por culpa del banco.
       *
       * Esto llama al `reset` del modelo, que es lo que usa el propio juego
       * para colocar el avión al empezar una lección.
       */
      /*
       * Y **el rumbo, si se pide**: sin él, colocar el avión en un sitio nuevo
       * le dejaba el morro donde lo tuviera de antes. En el banco eso ponía el
       * avión en el eje de la pista mirando al campo, y lo que se medía luego
       * —seguir la raya de la salida— era en realidad recuperarse de un
       * atravesado que nadie había hecho. Sin argumento se comporta como
       * siempre.
       */
      colocar: (
        x: number,
        y: number,
        z: number,
        velocidad: number,
        rumbo?: number,
      ) =>
        this.flight.reset({
          position: new Vector3(x, y, z),
          heading: rumbo ?? this.flight.state.heading,
          airspeed: velocidad,
        }) ?? (this.dichoDeLaToma = false),
      /** El viario de la ciudad, para comprobar que no se construye encima. */
      vias: () => this.scenario.ciudad?.vias ?? [],
      /** Los galones ganados en este vuelo, para comprobarlos desde el banco. */
      galones: () => this.galones.lista,
      /** Los bultos con los que se choca, para poder apuntarles desde el banco. */
      bultos: () => this.bultos,
      /** Segundos que le quedan al aviso de bulto. Para el banco. */
      avisoDeBulto: () => this.avisandoDelBulto,
      /** Qué tarjeta hay puesta ahora mismo. Para el banco. */
      tarjeta: () => this.hud.senal.puesto,
      /** Si está puesta la pantalla de fin de vuelo. Para el banco. */
      finDeVuelo: () => this.hud.finPuesto,
      /**
       * El aviso de terreno vigente, o `null`.
       *
       * Se mira **esto y no la tarjeta**: la tarjeta dura tres segundos y se
       * queda puesta después de que el aviso se apague, así que una prueba que
       * mirase la tarjeta daba por bueno un aviso de hace tres segundos —y así
       * pasaba igual con el arreglo puesto que quitado, que es la definición
       * de una prueba que no prueba nada.
       */
      avisoDeTerreno: () => this.terrenoDicho,
      /** El señalero, para mirarle los brazos sin rodar hasta el puesto. */
      senalero: () => this.senalero,
      /** La aeronave montada: para saber si vuela el modelo o las cajas. */
      aeronave: () => ({
        grupo: this.aircraftMesh.group,
        helice: this.aircraftMesh.propeller.name || "(sin nombre)",
        ojo: this.aircraftMesh.ojo ?? null,
      }),
      /**
       * El tronco de la cámara y **cuántos bits tiene el búfer de
       * profundidad**, que es de donde sale que la pintura se vea o no.
       */
      camara: () => {
        const gl = this.renderer.getContext();
        return {
          near: this.camera.near,
          far: this.camera.far,
          bits: gl.getParameter(gl.DEPTH_BITS) as number,
          logaritmico: this.renderer.capabilities.logarithmicDepthBuffer,
        };
      },
      /**
       * A qué altura está cada malla del aeródromo **respecto del suelo**.
       *
       * Existir y estar encendida no basta: una malla puede estar
       * perfectamente montada y enterrada. Es lo que le pasó a la raya verde, y
       * es lo único que queda por descartar con la pintura de la pista.
       */
      alturaDeLasMallas: () => {
        const aero = this.scenario.aerodrome;
        const recinto = aero
          ? this.terrain.group.getObjectByName(`aerodromo:${aero.id}`)
          : null;
        const salida: string[] = [];
        recinto?.traverse((o) => {
          const pos = (
            o as {
              geometry?: {
                attributes?: {
                  position?: {
                    count: number;
                    getX(i: number): number;
                    getY(i: number): number;
                    getZ(i: number): number;
                  };
                };
              };
            }
          ).geometry?.attributes?.position;
          if (!pos || pos.count === 0) return;
          const d: number[] = [];
          for (
            let i = 0;
            i < pos.count;
            i += Math.max(1, Math.floor(pos.count / 40))
          ) {
            d.push(
              pos.getY(i) - this.terrain.sampleHeight(pos.getX(i), pos.getZ(i)),
            );
          }
          d.sort((a, b) => a - b);
          salida.push(
            `${o.name || "(sin nombre)"}: ${d[Math.floor(d.length / 2)]!.toFixed(2)} m ` +
              `(de ${d[0]!.toFixed(2)} a ${d[d.length - 1]!.toFixed(2)})`,
          );
        });
        return salida;
      },
      /** Qué hay montado en el aeródromo y qué se está viendo. */
      pavimentos: () => {
        const salida: string[] = [];
        const aero = this.scenario.aerodrome;
        const recinto = aero
          ? this.terrain.group.getObjectByName(`aerodromo:${aero.id}`)
          : null;
        recinto?.traverse((o) => {
          const geo = (
            o as {
              geometry?: { attributes?: { position?: { count: number } } };
            }
          ).geometry;
          if (!geo?.attributes?.position) return;
          const mat = (
            o as {
              material?: {
                polygonOffsetFactor?: number;
                polygonOffsetUnits?: number;
              };
            }
          ).material;
          salida.push(
            `${o.name || "(sin nombre)"} ${o.visible ? "VISIBLE" : "apagado"}` +
              ` ${geo.attributes.position.count}v` +
              ` off ${mat?.polygonOffsetFactor ?? 0}/${mat?.polygonOffsetUnits ?? 0}`,
          );
        });
        return salida;
      },
      /** Cómo va el aro que toca de la senda: para poder medir si se enciende. */
      aros: () => this.runwayGuide.sonda(),
      /**
       * Vuelve a armar la senda desde donde está el avión.
       *
       * Para el banco: colocar el avión no rearma los aros, así que una prueba
       * que teletransporta hereda el índice de la prueba anterior y mide un
       * aro que ya no toca. Con esto, cada prueba de aros empieza en un sitio
       * conocido en vez de en el que dejó la de antes.
       */
      reiniciarSenda: () => this.runwayGuide.reset(this.flight.state.position),
      /** La cota del suelo en un punto del mundo. Para medir el suelo, no el vuelo. */
      suelo: (x: number, z: number) => this.terrain.sampleHeight(x, z),
      /** El eje de la pista y las calles de rodaje, en coordenadas del mundo. */
      caminos: () => {
        const aero = this.scenario.aerodrome;
        if (!aero) return [];
        const enElMundo = (p: readonly [number, number]) =>
          [p[0], -p[1]] as [number, number];
        /*
         * Y las plataformas, que es donde se empieza a rodar y donde se vio el
         * problema. De cada una se recorre su contorno y además las cuerdas
         * que unen vértices opuestos, que es la forma barata de cruzarla por
         * dentro sin ponerse a rellenar polígonos.
         */
        const plataformas = aero.aprons.map((a) => {
          const c = a.polygon.map(enElMundo);
          const cruces: [number, number][] = [];
          const mitad = Math.floor(c.length / 2);
          for (let i = 0; i < mitad; i++) {
            cruces.push(c[i]!, c[i + mitad]!);
          }
          return { que: "plataforma", puntos: [...c, c[0]!, ...cruces] };
        });
        return [
          ...aero.runways.map((r) => ({
            que: "pista",
            puntos: r.centerline.map(enElMundo),
          })),
          ...aero.taxiways.map((t) => ({
            que: "rodadura",
            puntos: t.path.map(enElMundo),
          })),
          ...plataformas,
        ];
      },
      /** Cuánto se subió el aeródromo sobre el datum para librar la foto. */
      alzado: () => this.alzadoDelAerodromo,
      /** Cómo está el banco de nubes: si se ve, a qué altura y cuánto tapa. */
      nubes: () => {
        const banco = this.sky?.group.getObjectByName("nubes");
        if (!banco) return null;
        const capa = banco.children[0] as
          { material?: { opacity?: number } } | undefined;
        return {
          visible: banco.visible,
          altura: Math.round(banco.position.y),
          opacidad: capa?.material?.opacity ?? null,
        };
      },
      /** Un punto en final, a `d` metros del umbral en uso y sobre el eje. */
      puntoDeFinal: (d: number) => {
        const pista = this.scenario.aerodrome?.runways[0];
        if (!pista) return null;
        const nombre = cabeceraEnUso(this.scenario);
        const con = Object.entries(pista.thresholds).filter((e) => e[1]?.xy);
        if (con.length < 2) return null;
        const i = nombre ? con.findIndex(([n]) => n === nombre) : 0;
        const entrada = con[i >= 0 ? i : 0]![1]!.xy!;
        const salida = con[(i >= 0 ? i : 0) === 0 ? 1 : 0]![1]!.xy!;
        const l =
          Math.hypot(salida[0] - entrada[0], salida[1] - entrada[1]) || 1;
        const ux = (salida[0] - entrada[0]) / l;
        const uy = (salida[1] - entrada[1]) / l;
        const x = entrada[0] - ux * d;
        const y = entrada[1] - uy * d;
        return {
          x,
          z: -y,
          h: (Math.atan2(ux, uy) + 2 * Math.PI) % (2 * Math.PI),
          suelo: this.terrain.sampleHeight(x, -y),
          cabecera: nombre,
        };
      },
      /** El estado del mundo de verdad, para las comprobaciones. */
      mundoReal: () => {
        if (!this.teselas) return null;
        const s = this.flight.state;
        // Lo único que de verdad importa: ¿están las ruedas encima del asfalto
        // de la fotografía, o dentro de él?
        const foto = this.teselas.alturaEn(s.position.x, s.position.z);
        return {
          asentado: this.teselas.asentado,
          desfase: this.teselas.desfase,
          visibles: this.teselas.visibles,
          nuestroSuelo: this.terrain.sampleHeight(s.position.x, s.position.z),
          suSuelo: foto,
          ruedas: s.position.y - this.aircraft.gearHeight,
          hundido:
            foto === null
              ? null
              : s.position.y - this.aircraft.gearHeight - foto,
          bultos: this.bultosQuitados,
          casas:
            (this.scene.getObjectByName("ciudad")?.visible ?? false)
              ? (
                  this.scene.getObjectByName("ciudad")!.children as {
                    count?: number;
                  }[]
                ).reduce((n, m) => n + (m.count ?? 0), 0)
              : 0,
        };
      },
      /**
       * Un piloto de pruebas: una función que toca los mandos **después** de
       * que los lea el teclado.
       *
       * Hace falta porque escribir en `controls` desde fuera no sirve de nada:
       * `input.update()` los reescribe enteros cada fotograma, así que el
       * primer comprobador le ponía timón al avión y el teclado se lo quitaba
       * al instante. El avión salía recto de la plataforma y se alejaba de su
       * ruta mientras la comprobación anotaba, tan contenta, que estaba
       * rodando.
       */
      pilotar: (fn: ((c: unknown) => void) | null) => {
        this.pilotoDePruebas = fn as
          ((c: typeof this.input.controls) => void) | null;
      },
      ruta: () => this.plan?.rutaVisible() ?? [],
      pista: () => this.scenario.runway,
      /** Los pares puesto + espera que se consideraron, con sus metros. */
      pares: () => this.plan?.paresVistos ?? [],
      /**
       * A qué velocidad pide el juego que se ruede **aquí**, m/s.
       *
       * La calcula el plan por el radio de cada curva y la usa el tope de
       * rodaje. El banco la necesita para rodar como se debe: su piloto
       * sostenía nueve metros por segundo escritos a mano, así que subir la
       * velocidad de crucero del plan no cambiaba nada de lo que medía.
       */
      rodaje: () => this.vistaActual?.velocidadSugerida ?? 0,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.audio.setActive(true);
    this.renderer.setAnimationLoop(this.frame);
    this.empezarMisionElegida();
  }

  /**
   * Arranca la misión que se eligió en el hangar, si se eligió alguna.
   *
   * Va aquí y no en el constructor porque el aviso de la misión es un mensaje
   * en pantalla y un sonido, y antes de `start` no hay ni pantalla que los
   * muestre ni audio despierto.
   *
   * Y se apunta el índice para que la tecla de cambiar de misión siga
   * funcionando desde donde estás, en vez de empezar la lista otra vez.
   */
  private empezarMisionElegida(): void {
    const mision = this.misionInicial;
    if (!mision) return;
    this.misionInicial = null;
    this.missionIndex = missionsFor(this.scenario.id).findIndex(
      (m) => m.id === mision.id,
    );
    this.missions.start(mision);
    this.hud.setMissionProgress(this.missions.progress);
    this.hud.flash(t("mission.started", { name: t(mision.nameKey) }), 4);
    this.audio.cue("attention");
    this.updateMissionMarker();
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.audio.setActive(false);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    this.input.dispose();
    this.terrain.dispose();
    this.renderer.dispose();
  }

  /** Coloca el avión al principio de la pista, parado y con el motor al ralentí. */
  /**
   * Mira si se ha aterrizado y lo dice. La lógica vive en `aterrizaje.ts`.
   *
   * Devuelve el veredicto porque lo necesitan **dos** cosas: el cartel de
   * siempre y los galones, que cierran ahí el de la toma y el de la
   * aproximación. Llega en un solo fotograma y por eso no vale con mirarlo
   * desde fuera después.
   */
  private checkLanding(dt: number): Aterrizaje {
    const s = this.flight.state;
    const veredicto = this.landing.update(
      s.onGround,
      s.airspeed,
      s.touchdownSinkRate,
      s.crashed,
      Number.isFinite(this.runwayRemaining()),
      this.aircraft.approachSpeed,
      dt,
      this.flight.velocidadMaxima(),
    );
    if (!veredicto) return null;
    this.hud.flash(
      t(
        veredicto === "suave"
          ? "hud.landedSoft"
          : veredicto === "firme"
            ? "hud.landedFirm"
            : veredicto === "rapido"
              ? "hud.landedFast"
              : "hud.landedOffRunway",
      ),
      3.6,
    );
    /*
     * **Y suena, porque hasta ahora el veredicto era solo texto.**
     *
     * `hud.flash` escribe una frase, y en los dos peldaños de abajo no hay
     * nadie que la lea. El único canal no escrito era el golpe de las ruedas,
     * que suena igual de bien en una toma buena que en una toma rápida — y una
     * toma rápida sale **más suave**, que es justo la trampa. Así que quien
     * aterrizaba a doscientos por hora oía un éxito.
     */
    if (veredicto === "suave" || veredicto === "firme") {
      this.audio.cue("success");
    } else {
      this.audio.cue("attention");
      decir(veredicto === "rapido" ? "too fast" : "off the runway");
      /*
       * **Y con dibujo**, que es lo que faltaba.
       *
       * Los dos veredictos malos se decían con un texto y una voz, y en el
       * peldaño de los cuatro años no hay nadie que lea el texto. Se grabó un
       * vuelo que se posó en un descampado del pueblo y la pantalla no enseñó
       * nada distinto de un aterrizaje bueno: el peor final posible era el
       * único sin dibujo.
       *
       * «Rápido» reaprovecha la mano del freno a propósito — lo que hay que
       * entender ahí no es un concepto nuevo, es «llegaste con demasiada
       * velocidad»— y «fuera» tiene el suyo: la pista, y el avión al lado.
       */
      this.hud.senal.mostrar(
        veredicto === "rapido" ? "freno" : "fuera",
        this.tier.instruments !== "none"
          ? t(veredicto === "rapido" ? "hud.landedFast" : "hud.landedOffRunway")
          : "",
        null,
        { segundos: SE_QUEDA_EL_VEREDICTO, prioridad: URGENTE },
      );
    }
    return veredicto;
  }

  /**
   * ¿Se ha metido el avión en un edificio? Y si sí, qué pasa.
   *
   * **Y qué pasa no es lo mismo en los cuatro peldaños**, que es la parte
   * difícil de esto y la única que hay que pensar:
   *
   * - En el de los pequeños, el mundo te lo impide y ya está. No hay muerte ni
   *   castigo: el avión no atraviesa el edificio, se queda ahí, y quien juega
   *   descubre que por ahí no se pasa. Es la misma regla que el resto del
   *   peldaño —«ni pérdida ni choque: en este peldaño no se puede perder»— y no
   *   se rompe por un bloque de pisos.
   * - De Tukã para arriba, el avión se rompe, porque **ahí la lección es que un
   *   avión se rompe**. Y se rompe por el mismo camino que ya existía para una
   *   toma dura: `crashed`, el sonido, el mensaje y la vuelta a la pista.
   *
   * Sin esto, todas las lecciones de seguridad de este juego —la senda, la
   * altura mínima, el circuito— eran manías del profesor: existen porque hay
   * cosas contra las que chocar, y no había ninguna.
   */
  private mirarSiChocaConAlgo(): void {
    if (!this.bultos.cuantos) return;
    const s = this.flight.state;
    const a = this.antesDelPaso;
    /*
     * El **camino** del paso, no el punto de llegada. A ciento cincuenta por
     * hora y con la pestaña de fondo, entre un fotograma y el siguiente caben
     * varios metros: una casa estrecha se cruzaría entera sin que ni la salida
     * ni la llegada cayeran dentro. Ver `chocaEnElCamino`.
     */
    const golpe = this.bultos.primerChoque(
      a.x,
      a.y,
      a.z,
      s.position.x,
      s.position.y,
      s.position.z,
    );
    if (!golpe) return;

    if (this.tier.model !== "simple") {
      this.flight.romper();
      return;
    }

    /*
     * **El peldaño de los pequeños: el mundo te lo impide, pero no te encierra.**
     *
     * El primer intento devolvía el avión a donde estaba antes del paso, que
     * es una pared perfecta y también una trampa: si el punto de partida ya
     * estaba dentro del bulto, cada paso lo devolvía al mismo sitio y no había
     * salida por ningún lado. Se probó jugando y salió esto, con razón: «no
     * puedo zafarme de ahí, estoy atrapado».
     *
     * Así que hay dos casos y no uno:
     *
     * - **Dentro del edificio**: se sale por arriba, justo por encima del
     *   tejado. Por encima de un tejado nunca hay bulto —eso lo garantiza
     *   `techoEn`—, así que esta salida siempre existe. Y se lee bien: por ahí
     *   no se pasa, se pasa por encima, que es lo que hace un avión.
     * - **Lo atravesó de un salto** —una casa estrecha con un paso largo—: se
     *   deja en el último punto libre, que es justo antes de la fachada.
     */
    const techo = this.bultos.techoEn(s.position.x, s.position.y, s.position.z);
    if (techo > -Infinity) s.position.y = techo + POR_ENCIMA_DEL_TEJADO;
    else s.position.set(golpe.libre.x, golpe.libre.y, golpe.libre.z);

    this.avisarDelBulto("edificio");
  }

  /**
   * **El aviso, que es la mitad que enseña.**
   *
   * «Ni me avisó.» Y era verdad: la primera versión solo decía algo cuando el
   * avión ya estaba metido en el edificio, y eso no es un aviso, es un parte.
   * Un avión de verdad avisa **antes** —es lo que hace el `terrain, pull up`—
   * y aquí hace más falta todavía, porque quien juega puede tener cuatro años
   * y no ve venir un bloque de pisos en una fotografía aérea.
   *
   * Así que se sondea por delante del morro lo que se va a recorrer en los
   * próximos segundos, y si ahí hay bulto, se dice. Con dibujo, con sonido y
   * con voz, como todo lo demás.
   */
  private avisarDeLosBultos(dt: number): void {
    this.avisandoDelBulto = Math.max(0, this.avisandoDelBulto - dt);
    /*
     * **Al tocar tierra, los avisos de vuelo se apagan.**
     *
     * Un aviso de edificio o de terreno deja de ser verdad en cuanto hay
     * ruedas en el suelo, y mientras dure tapa lo que sí toca. Se vio en el
     * banco: la tarjeta de «frená» de la carrera de aterrizaje llegaba tarde
     * porque venía en la cola detrás de avisos del final que ya no valían.
     */
    if (this.flight.state.onGround) {
      this.avisandoDelBulto = 0;
      this.hud.senal.caducar("edificio");
      this.hud.senal.caducar("terreno");
      // Y la celebración de la frustrada, que con ruedas en el suelo ya no
      // describe lo que pasó: quien toca tierra no renunció a nada.
      this.hud.senal.caducar("frustrada");
      // Y «ya podés tocar», que con las ruedas en el suelo ya se tocó: si se
      // queda puesta, tapa la que toca ahora, que es la del freno.
      this.hud.senal.caducar("toma");
      return;
    }
    if (!this.bultos.cuantos) return;
    const s = this.flight.state;
    /*
     * Lo que se recorre en `SEGUNDOS_DE_AVISO`, con un mínimo: a poca
     * velocidad el sondeo se quedaría en nada y el aviso llegaría con el morro
     * pegado a la fachada, que es exactamente lo que se está arreglando.
     */
    const alcance = Math.max(
      ALCANCE_MINIMO_DEL_AVISO,
      s.airspeed * SEGUNDOS_DE_AVISO,
    );
    const v = s.velocity;
    const largo = Math.hypot(v.x, v.y, v.z) || 1;
    if (
      !this.bultos.chocaEnElCamino(
        s.position.x,
        s.position.y,
        s.position.z,
        s.position.x + (v.x / largo) * alcance,
        s.position.y + (v.y / largo) * alcance,
        s.position.z + (v.z / largo) * alcance,
      )
    )
      return;
    this.avisarDelBulto("edificio");
  }

  /**
   * Se acabó el vuelo: se enseña lo que se llevó puesto.
   *
   * «Se echa en falta un reconocimiento en función de los galones logrados.»
   * Los galones se ganaban uno a uno con su sonido y su barra, y al apagar el
   * motor no pasaba nada: el vuelo terminaba como termina una pestaña que se
   * cierra.
   *
   * Va con medio segundo de retraso a propósito. Apagar el motor tiene su
   * propio sonido y su propia hélice parándose, y encimarle una pantalla le
   * quita el momento a las dos cosas.
   *
   * La regla de qué se dice —y que ningún final sea un reproche— vive en
   * `flight/reconocimiento.ts`, que es donde se puede probar.
   */
  private terminarElVuelo(): void {
    if (this.vueloTerminado) return;
    this.vueloTerminado = true;
    window.setTimeout(() => {
      if (!this.vueloTerminado) return;
      const final = reconocer(this.galones.lista);
      this.hud.mostrarFinDeVuelo(
        this.galones.lista,
        // Sin palabras donde todavía no se lee: las barras son el mensaje.
        this.tier.instruments === "none"
          ? ""
          : t(`fin.${final.nivel}` as never),
      );
      this.audio.cue("achieved");
    }, TARDA_EL_FINAL * 1000);
  }

  /**
   * Por dónde se sale de la pista, en coordenadas del mundo.
   *
   * Es el primer punto de la ruta de vuelta que ya no pisa asfalto de pista.
   * Sirve para plantar ahí el coche del «sígame» mientras se frena: enseña por
   * dónde hay que abandonar sin decir una palabra, que es exactamente para lo
   * que sirve un sígame.
   */
  private bocaDeLaSalida(): { x: number; z: number } | null {
    const ruta = this.plan?.rutaVisible() ?? [];
    const r = this.scenario.runway;
    for (const [x, z] of ruta) {
      const ejes = enEjesDePista(x, z, r.x, r.z, r.heading);
      if (
        Math.abs(ejes.across) > r.width / 2 + BIEN_FUERA_DE_LA_PISTA ||
        Math.abs(ejes.along) > r.length / 2 + BIEN_FUERA_DE_LA_PISTA
      )
        return { x, z };
    }
    return null;
  }

  /** El aviso del bulto, con su antirrebote. Ver `SE_QUEDA_EL_BULTO`. */
  private avisarDelBulto(dibujo: string): void {
    if (this.avisandoDelBulto > 0) return;
    this.avisandoDelBulto = SE_QUEDA_EL_BULTO;
    this.hud.senal.mostrar(
      dibujo,
      this.tier.instruments !== "none" ? t("vuelo.bulto") : "",
      null,
      { segundos: SE_QUEDA_EL_BULTO, prioridad: URGENTE },
    );
    this.audio.cue("attention");
    decir("obstacle ahead");
  }

  /**
   * Se ha ido al aire, y aquí eso se celebra.
   *
   * **Igual que un aterrizaje, y por el mismo canal.** Se celebra con dibujo,
   * sonido y voz, que son los tres caminos del juego, porque quien se lo dice
   * a un niño de cuatro años tiene que decírselo sin letras.
   *
   * Y con el sonido de haber ganado algo, no con el de haber hecho algo bien
   * a secas: el mismo que suena al ganar un galón, porque justo eso es lo que
   * acaba de pasar. Ver `flight/frustrada.ts` para el porqué de todo esto.
   */
  private celebrarLaFrustrada(): void {
    this.hud.senal.mostrar(
      "frustrada",
      this.tier.instruments !== "none" ? t("vuelo.frustrada") : "",
      null,
      { segundos: SE_QUEDA_LA_FRUSTRADA, prioridad: URGENTE },
    );
    this.audio.cue("achieved");
    // En inglés aeronáutico, como el resto de la voz de cabina: «going around»
    // es lo que se dice por radio, y lo demás es del instructor.
    decir("going around. good decision");
  }

  /**
   * Dónde arranca el avión: en la cabecera, mirando por la pista.
   *
   * Con un aeródromo real **se usa su umbral**, que es un punto medido. La
   * cuenta de retroceder media pista a lo largo del eje se escribió para la
   * pista sintética, y con un rumbo de 190° dejaba el avión a seiscientos
   * metros del asfalto: los signos que funcionan con un rumbo redondo dejan
   * de funcionar con uno cualquiera.
   *
   * Y la cota se **mide del terreno** en ese punto concreto, no se da por
   * supuesta: una pista con pendiente no está a la misma altura en los dos
   * extremos, que es precisamente la gracia.
   */
  private startPosition(): Vector3 {
    const { runway, aerodrome } = this.scenario;

    /*
     * **La lección de aterrizar empieza en el aire, en final.**
     *
     * Empezar en el puesto para practicar aterrizajes significaría rodar dos
     * kilómetros, despegar y dar una vuelta entera antes de cada intento. Nadie
     * practica así, y menos alguien de seis años: se practica **repitiendo lo
     * que cuesta**, no lo que ya sale.
     *
     * Tres kilómetros de la cabecera y ciento ochenta metros de altura, que es
     * una senda de tres grados y medio — la de verdad es de tres, y esto es un
     * pelín más alto a propósito: sobra siempre más fácil de arreglar que
     * falta.
     */
    if (this.leccion.arranque === "aire") {
      const [x, z] = puntoDePista(runway, runway.length / 2 + APROXIMACION);
      /*
       * **La altura se mide desde la pista, no desde el suelo de debajo.**
       *
       * Medida desde el suelo de debajo, en Tenerife Norte el avión aparecía a
       * quinientos sesenta metros con la pista a seiscientos veinte: sesenta
       * metros **por debajo** de su destino, apuntando a una ladera. Tres
       * kilómetros antes de una cabecera el terreno puede estar mucho más bajo
       * —o más alto— que el aeropuerto, y lo que importa para una aproximación
       * es la altura sobre la pista.
       *
       * Y con un mínimo sobre el terreno de debajo, por si la aproximación
       * pasa por encima de algo: entrar directamente contra una loma tampoco
       * es una lección.
       */
      const y = Math.max(
        this.terrain.runwayElevation + ALTURA_DE_FINAL,
        this.terrain.sampleHeight(x, z) + SUELO_MINIMO,
      );
      return new Vector3(x, y, z);
    }
    // Con plan de vuelo se sale del puesto de estacionamiento, que es de donde
    // se sale de verdad. Sin él, de la cabecera, como toda la vida.
    const puesto = this.plan?.arranque();
    if (puesto) {
      return new Vector3(
        puesto[0],
        this.terrain.sampleHeight(puesto[0], puesto[1]) +
          this.aircraft.gearHeight,
        puesto[1],
      );
    }
    // El arranque de un aeródromo real sale de su umbral medido, sesenta
    // metros pista adentro. Lo de abajo es para las pistas inventadas.
    const pista = aerodrome?.runways[0];
    const p = pista ? arranqueEnPista(pista, runway.heading) : null;
    const [x, z] = p ?? this.enLaPista(runway.length * 0.42);
    return new Vector3(
      x,
      this.terrain.sampleHeight(x, z) + this.aircraft.gearHeight,
      z,
    );
  }

  /**
   * Un punto del eje de pista a tantos metros por detrás del centro, hacia la
   * cabecera de salida. Con `0` es el centro; con media longitud, la cabecera.
   *
   * **Está aquí y no repartido porque la cuenta se hacía mal en tres sitios**,
   * y siempre igual: `z − cos h` en lugar de `z + cos h`. El norte es la Z
   * negativa, así que hacia delante se va con `delante()` y hacia la cabecera
   * se resta. Con las pistas sintéticas, que van a rumbos redondos, el error
   * no se veía; en Tenerife Norte la aguja de la pista marcaba 1,1 km estando
   * el avión encima de una pista de 3,2, porque señalaba a un punto de la
   * hierba a kilómetro y pico.
   *
   * Cuando el aeródromo es real manda su fichero: el umbral medido, no una
   * cuenta desde el centro.
   */
  private enLaPista(atras: number): readonly [number, number] {
    const { runway, aerodrome } = this.scenario;
    const pista = aerodrome?.runways[0];
    if (pista) {
      const p = arranqueEnPista(
        pista,
        runway.heading,
        runway.length * 0.5 - atras,
      );
      if (p) return p;
    }
    return puntoDePista(runway, atras);
  }

  /**
   * Cuántos metros de pista quedan por delante, o infinito si no se está en
   * ella.
   *
   * Se mide **hacia donde apunta el avión**, no en línea recta al final: si
   * uno rueda hacia atrás por la pista, lo que queda es lo que tiene delante.
   * Y solo cuenta si está dentro del ancho, porque fuera de la pista no hay
   * pista que se acabe.
   */
  private runwayRemaining(): number {
    const r = this.scenario.runway;
    const p = this.flight.state.position;
    const { along, across: lado } = enEjesDePista(
      p.x,
      p.z,
      r.x,
      r.z,
      r.heading,
    );
    const across = Math.abs(lado);
    if (across > r.width) return Infinity;
    if (Math.abs(along) > r.length / 2) return Infinity;

    // Hacia dónde va el avión respecto al eje de la pista.
    const [fx, fz] = delante((this.flight.state.heading * 180) / Math.PI);
    const [rx, rz] = delante(r.heading);
    const hacia = fx * rx + fz * rz;
    return hacia >= 0 ? r.length / 2 - along : r.length / 2 + along;
  }

  /**
   * Arranca o para el motor.
   *
   * **Solo con el avión parado y el gas a cero**, que es la regla de verdad:
   * un motor no se apaga a media carrera ni se arranca con la palanca
   * puesta. Y así el mando enseña algo en vez de ser un interruptor más.
   *
   * En el aire no se puede: apagar el motor volando es una emergencia que se
   * entrena aparte, no algo que se hace con una tecla sin querer.
   */
  private toggleEngine(): void {
    const s = this.flight.state;
    const c = this.input.controls;
    /*
     * **Y si el gas estaba abierto, se cierra aquí mismo.**
     *
     * No arrancar con gas es lista de comprobación de verdad y por eso está
     * prohibido. Pero prohibirlo sin más era una trampa sin salida: el juego
     * te dice «arrancá el motor», tú tocas el gas antes que la llave —que es
     * lo que hace cualquiera que aún no sabe el orden— y a partir de ahí la
     * llave ya no responde nunca. «Si pulso la X antes de la I, el juego ya no
     * sigue aunque luego le dé a la I; es como si se quedara bloqueado.»
     *
     * Cerrarlo por él no le quita la lección: el aviso sigue saliendo y dice
     * qué pasó. Lo que le quita es el callejón, porque a la segunda pulsación
     * ya arranca. Dejar a un chico de cuatro años delante de una tecla que no
     * hace nada es peor que moverle un mando y contárselo.
     */
    if (s.onGround && s.airspeed <= 2 && c.throttle > 0.05) {
      c.throttle = 0;
      this.hud.flash(t("hud.engineBusy"));
      return;
    }
    if (!s.onGround || s.airspeed > 2) {
      this.hud.flash(t("hud.engineBusy"));
      return;
    }
    c.engineOn = !c.engineOn;
    this.hud.flash(t(c.engineOn ? "hud.engineOn" : "hud.engineOff"));
  }

  resetFlight(): void {
    this.dichoDeLaToma = false;
    this.avisadoDeLaPasada = false;
    // Una cuenta atrás a medias de un vuelo que ya no existe.
    this.avisosDeAltura.reiniciar();
    callar();
    const { runway } = this.scenario;
    if (this.leccion.arranque === "aire") return this.reiniciarEnFinal();
    // El plan se reinicia **antes** de colocar el avión: es él quien decide si
    // hoy se sale del puesto o de la cabecera, y de eso depende dónde y hacia
    // dónde aparece.
    const rodando = this.plan?.reiniciar() ?? false;
    this.colocarSenalero();
    const start = this.startPosition();
    const heading = rodando
      ? this.rumboDeSalida(start)
      : MathUtils.degToRad(runway.heading);

    this.flight.reset({ position: start, heading, airspeed: 0 });
    // Y con el motor parado, que es como está un avión en su puesto. Arrancarlo
    // es el primer paso del vuelo y hasta ahora no existía como paso.
    this.input.controls.engineOn = !rodando;
    this.faseAnunciada = "";
    if (this.missions.active) {
      this.missions.start(this.missions.active);
      this.hud.setMissionProgress(this.missions.progress);
      this.updateMissionMarker();
    }
    this.runwayGuide.reset();
    this.landing.reset();
    this.frustrada.reiniciar();
    this.reiniciarGalones();
    this.crashedFor = 0;
    this.wasOnGround = true;
    this.wasStalled = false;
    this.wasCrashed = false;
    this.input.releaseAll();
    this.hud.tutor.reset();
    this.instructor.callar();
    this.updateBadge();
  }

  /**
   * Qué hora se juega. `?hora=6.5` para el amanecer, `?hora=22` para la noche.
   *
   * Va por la dirección hasta que exista el sol que se arrastra por un arco,
   * que es como se elegirá de verdad — un reloj no lo lee quien tiene cuatro
   * años, y un sol que se mueve por el cielo sí, porque es literalmente lo que
   * ve todos los días.
   */
  private horaPedida(): number {
    const q = new URLSearchParams(location.search).get("hora");
    const h = q === null ? NaN : Number(q);
    return Number.isFinite(h) ? h : HORA_BUENA;
  }

  /**
   * La clave de las teselas: la de la construcción, o la de la dirección.
   *
   * `?teselas=...` existe para poder probarlo sin reconstruir. `?teselas=0` lo
   * apaga, que es como se compara con el mundo de polígonos sin tocar nada.
   */
  private claveDeTeselas(): string | null {
    const q = new URLSearchParams(location.search).get("teselas");
    if (q === "0") return null;
    if (!q && mundoElegido() === "dibujado") return null;
    return q || CLAVE_TESELAS;
  }

  /**
   * Cuando el mundo de verdad se posa, se apaga el de mentira.
   *
   * No se borra: se esconde. El terreno de polígonos **sigue siendo el suelo
   * con el que choca el avión** —`sampleHeight` se llama doscientas cuarenta
   * veces por segundo— y lo único que sobra es su malla. Y la vegetación entera,
   * porque los árboles ya están en la fotografía: era justo lo que se veía como
   * «estoy sobrevolando Luque en el Pleistoceno, todo árboles».
   *
   * Del aeródromo **no se apaga nada**, y eso es una vuelta atrás a conciencia.
   *
   * Durante un tiempo se apagaban el pavimento y las marcas, con el argumento
   * de que donde hay fotogrametría la pista ya viene pintada y mejor de lo que
   * la pintamos nosotros. Es verdad a mil metros y es falso a dos.
   *
   * La fotogrametría se captura desde un avión, y a ras de suelo es papilla en
   * todas partes del mundo: no hay dataset que arregle eso ni pagándolo. Y a ras
   * de suelo es donde se pasa el rodaje entero y la carrera de despegue. Así que
   * el trato es el que hacen los simuladores de verdad — **campo cercano
   * nuestro, campo lejano fotográfico**: nuestro asfalto y nuestra pintura, que
   * son nítidos, sobre el suelo de la foto, y la foto de ahí al horizonte.
   *
   * Lo que sí se apaga es el suelo inventado: el relieve, el horizonte, el agua
   * y la vegetación de mentira. Eso la foto lo da mejor y sin discusión.
   */
  /**
   * Monta —o vuelve a montar— las luces de aproximación y el PAPI.
   *
   * Se llama después de moldear el suelo y cada vez que cambia la cabecera en
   * uso, porque las luces van en la cabecera por la que se entra y si el viento
   * gira hay que mudarlas al otro extremo.
   */
  private ponerAproximacion(): void {
    const pista = this.scenario.aerodrome?.runways[0];
    if (!pista) return;
    if (this.aproximacion) {
      this.scene.remove(this.aproximacion.grupo);
      this.aproximacion.dispose();
      this.aproximacion = null;
    }
    this.aproximacion = crearAproximacion(
      pista,
      cabeceraEnUso(this.scenario),
      (p) => this.terrain.sampleHeight(p[0], -p[1]),
    );
    if (this.aproximacion) this.scene.add(this.aproximacion.grupo);
  }

  /**
   * Sube el aeródromo hasta quedar justo por encima de la fotografía.
   *
   * Se mide, no se supone: se cata la foto en un enjambre de puntos repartidos
   * por la pista, las calles y las plataformas, y se coge el **percentil
   * noventa** de lo que sobresale. No la media —que deja medio aeródromo por
   * debajo— y no el máximo, que lo levantaría por culpa de una farola o de un
   * avión aparcado que la limpieza de bultos no cazó.
   */
  private asentarAerodromoSobreLaFoto(): void {
    const aero = this.scenario.aerodrome;
    if (!aero || !this.teselas) return;
    const datum = this.teselas.desfase ?? 0;

    /*
     * **El perfil de la pista, sacado de la propia fotografía.**
     *
     * Se cata el eje cada cien metros y se suaviza con una media móvil de siete
     * catas —setecientos metros—, que es lo que separa la rasante de verdad del
     * ruido de la rejilla.
     *
     * Es el término medio entre los dos extremos que fallaron. Una recta entre
     * las cotas de los umbrales no sigue la pista: en Tenerife Norte se aparta
     * más de metro y medio en la sexta parte de los puntos, y taparla obligaba
     * a levantar el aeródromo dos metros, con su escalón en el filo del
     * asfalto. Y la superficie cruda de la foto sigue la pista demasiado bien:
     * conserva saltos de metros entre nudos y el avión sale despedido rodando
     * —medido, seiscientos cincuenta y seis de cada novecientos fotogramas en
     * el aire en Asunción—.
     *
     * Una curva lisa que sí sube y baja con la pista no tiene ninguno de los
     * dos problemas.
     */
    const perfilDeLaFoto = ((): ((t: number) => number) | null => {
      const pista = aero.runways[0];
      const umbrales = pista
        ? Object.values(pista.thresholds).filter(
            (u): u is NonNullable<typeof u> => !!u?.xy,
          )
        : [];
      const a = umbrales[0]?.xy;
      const b = umbrales[1]?.xy;
      if (!pista || !a || !b) return null;
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const catas = Math.max(8, Math.round(largo / 100));

      /*
       * **Se cata sobre el eje de OpenStreetMap, no sobre la recta que une los
       * umbrales.** Son dos rectas parecidas y no la misma, y la diferencia son
       * metros: catando la segunda se cae fuera del asfalto y se mide el arcén,
       * que baja. El primer intento salió con la fotografía medio metro por
       * encima de nuestra pista —un hundimiento donde antes había un escalón—
       * y la causa era ésta.
       *
       * Es la cuarta vez esta semana que dos ejes parecidos se llevan algo por
       * delante: el eje discontinuo, las luces de cabecera, el designador, y
       * ahora la rasante.
       */
      const eje = pista.centerline;
      const largoEje = (() => {
        let d = 0;
        for (let i = 0; i < eje.length - 1; i++) {
          d += Math.hypot(
            eje[i + 1]![0] - eje[i]![0],
            eje[i + 1]![1] - eje[i]![1],
          );
        }
        return d;
      })();
      const sobreElEje = (d: number): [number, number] | null => {
        let visto = 0;
        for (let i = 0; i < eje.length - 1; i++) {
          const [ax, ay] = eje[i]!;
          const [bx, by] = eje[i + 1]!;
          const l = Math.hypot(bx - ax, by - ay);
          if (l < 0.001) continue;
          if (visto + l >= d) {
            const k = (d - visto) / l;
            return [ax + (bx - ax) * k, ay + (by - ay) * k];
          }
          visto += l;
        }
        return null;
      };
      // Dónde caen los dos umbrales sobre ese eje: las marcas van de umbral a
      // umbral, y el eje del fichero es más largo que la pista.
      const alLargo = (p: readonly [number, number]): number => {
        let visto = 0;
        let mejor = 0;
        let cerca = Infinity;
        for (let i = 0; i < eje.length - 1; i++) {
          const [ax, ay] = eje[i]!;
          const [bx, by] = eje[i + 1]!;
          const l = Math.hypot(bx - ax, by - ay) || 1;
          const k = Math.max(
            0,
            Math.min(
              1,
              ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / (l * l),
            ),
          );
          const d = Math.hypot(
            ax + (bx - ax) * k - p[0],
            ay + (by - ay) * k - p[1],
          );
          if (d < cerca) {
            cerca = d;
            mejor = visto + k * l;
          }
          visto += l;
        }
        return mejor;
      };
      const dA = alLargo(a);
      const dB = alLargo(b);
      void largoEje;

      const crudo: (number | null)[] = [];
      for (let i = 0; i <= catas; i++) {
        const t = i / catas;
        const p = sobreElEje(dA + (dB - dA) * t);
        crudo.push(p ? this.teselas!.alturaEn(p[0], -p[1]) : null);
      }
      if (crudo.filter((c) => c !== null).length < catas * 0.6) return null;

      // Los huecos se rellenan con el vecino: una cata perdida no puede abrir
      // un agujero en la rasante.
      for (let i = 0; i < crudo.length; i++) {
        if (crudo[i] !== null) continue;
        const antes = crudo
          .slice(0, i)
          .reverse()
          .find((c) => c !== null);
        const despues = crudo.slice(i + 1).find((c) => c !== null);
        crudo[i] = (antes ?? despues ?? null) as number | null;
      }

      const VENTANA = 3;
      const liso = crudo.map((_, i) => {
        let suma = 0;
        let n = 0;
        /*
         * **La ventana encoge en los bordes, no repite la muestra del filo.**
         *
         * Antes se pinzaba el índice, así que en las siete últimas catas se
         * contaba siete veces la misma cota: la del final de la pista. En una
         * pista que baja diecisiete metros de una cabecera a la otra eso tira
         * del perfil **hacia arriba** justo donde el terreno sigue cayendo, y
         * nuestro asfalto emerge de la fotografía con su pared y todo.
         *
         * La firma era inconfundible: «ocurre en el último kilómetro». Una
         * media móvil que pinza los extremos siempre falla en los extremos.
         */
        for (let k = -VENTANA; k <= VENTANA; k++) {
          const j = i + k;
          if (j < 0 || j >= crudo.length) continue;
          const v = crudo[j];
          if (v !== null && v !== undefined) {
            suma += v;
            n++;
          }
        }
        return n ? suma / n : 0;
      });

      return (t: number): number => {
        const f = Math.max(0, Math.min(catas - 0.001, t * catas));
        const i = Math.floor(f);
        return liso[i]! + (liso[i + 1]! - liso[i]!) * (f - i);
      };
    })();
    /*
     * Primero, liso y con el datum. A partir de aquí `sampleHeight` en el
     * aeródromo es nuestra superficie, y ya se puede comparar con la foto.
     *
     * **Y liso de verdad, no la forma de la foto alisada.** Se probó lo otro
     * —conservar la pendiente real de la fotografía y quitarle solo los
     * escalones— porque deja el aeródromo dos metros más bajo y sin escalón en
     * el filo del asfalto. Medido rodando quince segundos:
     *
     *   perfil recto        · Tenerife  26 de 900 fotogramas en el aire
     *   forma de la foto    · Tenerife 312, **Asunción 656**
     *
     * Asunción pasaba de cero a seiscientos cincuenta y seis. Por muy alisada
     * que esté, una superficie fotogramétrica sobre una rejilla de cincuenta y
     * siete metros conserva variación de metros, y el avión sale despedido a
     * cada paso. El escalón es un problema de aspecto; esto es un problema de
     * jugar, y gana el de jugar.
     */
    // Con perfil de la foto el datum ya está dentro de las catas; sin él, hay
    // que sumarlo a mano porque las cotas de los umbrales van sobre el mar.
    this.terrain.reasentarAerodromo(
      this.scenario,
      perfilDeLaFoto ? 0 : datum,
      perfilDeLaFoto,
    );

    const puntos: [number, number][] = [];
    const pista = aero.runways[0];
    if (pista) {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const a = pista.centerline[0]!;
        const b = pista.centerline[pista.centerline.length - 1]!;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        for (const lado of [-15, 0, 15]) puntos.push([x + lado, -(y + lado)]);
      }
    }
    /*
     * **Solo el eje de la pista.** Ni plataformas ni calles de rodaje.
     *
     * Una plataforma tiene aviones aparcados, pasarelas y farolas, y la foto
     * los trae con su volumen: catar ahí no mide el desajuste del suelo, mide
     * la altura de un Boeing. Con las calles pasa lo mismo un nivel más abajo
     * —pasan pegadas a hangares y el rayo devuelve el tejado—, y se vio igual:
     * el percentil se quedaba clavado en el tope aunque la forma ya fuera la de
     * la foto.
     *
     * El eje de una pista es lo único de un aeropuerto donde se puede
     * garantizar que no hay nada encima. Es la única cata que no miente.
     */

    const sobresale: number[] = [];
    for (const [x, z] of puntos) {
      const foto = this.teselas.alturaEn(x, z);
      if (foto === null) continue;
      sobresale.push(foto - this.terrain.sampleHeight(x, z));
    }
    if (sobresale.length < 20) return;
    sobresale.sort((a, b) => a - b);
    // El percentil noventa y cinco: ahora que la forma es la de la foto, lo
    // que queda por tapar es su rugosidad y no la diferencia con una recta.
    // Se puede ser exigente sin que el número se dispare.
    const p85 = sobresale[Math.floor(sobresale.length * 0.95)]!;

    /*
     * **Con tope de metro y medio**, y el tope no es prudencia: es la lección.
     *
     * El primer intento usaba el percentil noventa sin tope y subió Tenerife
     * Norte **cuatro metros**, porque entre las catas cayó algo de veintitrés
     * —un edificio, una torre, lo que fuera— y el percentil se lo tragó. Con
     * eso la pista quedaba flotando cuatro metros y medio sobre la fotografía,
     * que es un escalón que se ve desde el aire.
     *
     * Este alzado está para salvar la rugosidad que le queda a la fotografía
     * después de alisarla —decímetros—, no para salvar un edificio. Si hace
     * falta más de metro y medio, lo que hay debajo no es suelo y taparlo
     * subiendo el aeropuerto entero sería el remedio equivocado.
     *
     * Los quince centímetros de holgura son menos que el grosor de la pintura
     * y no se ven.
     */
    /*
     * **El tope no baja aunque el perfil salga de la fotografía.**
     *
     * Se probó bajarlo a medio metro, con el argumento de que siguiendo ya la
     * forma de la foto lo único que queda por tapar es su rugosidad. Medido:
     * el aeródromo quedaba **sesenta centímetros por debajo** de la foto. El
     * escalón cambiaba de signo y se convertía en un hundimiento, que es el
     * lado malo — entre ver el filo del asfalto y que la pista se te trague, se
     * ve el filo.
     */
    const tope = 1.5;
    const alzado =
      (perfilDeLaFoto ? 0 : datum) + Math.min(tope, Math.max(0, p85)) + 0.15;
    this.terrain.reasentarAerodromo(this.scenario, alzado, perfilDeLaFoto);
    this.terrain.rehacerAerodromo(this.scenario);

    /*
     * **Y se apaga el hormigón de las plataformas, que aquí el argumento se da
     * la vuelta.**
     *
     * En la pista aportamos pintura nítida sobre una ortofoto borrosa, y por
     * eso nuestro asfalto se queda. En la plataforma no aportamos nada: es una
     * losa de color plano sobre un sitio donde la fotografía tiene terminal,
     * pasarelas, aviones aparcados y sus marcas. Y como el aeródromo va subido
     * para no hundirse en la foto, esa losa además entierra metro y medio de
     * todo lo que hay debajo.
     *
     * Se vio jugando en Tenerife Norte y la descripción fue exacta: «ha caído
     * la del pulpo sobre Los Rodeos y tenemos todas las aeronaves sepultadas
     * bajo un lodazal».
     *
     * El suelo no se toca: el avión sigue rodando sobre nuestra superficie
     * lisa. Lo que se quita es la manta.
     *
     * Va aquí y no en `apagarElMundoDeMentira` porque el aeródromo se acaba de
     * reconstruir en la línea de arriba, y la reconstrucción se lleva por
     * delante cualquier cosa que se hubiera apagado antes.
     */
    /*
     * **Sobre la fotografía, la pista es la de la fotografía.**
     *
     * Empezó apagando solo el hormigón de las plataformas, porque una losa de
     * color plano sobre una terminal fotografiada era «la del pulpo sobre Los
     * Rodeos». El resto se dejaba con el argumento de que nuestra pista es
     * nítida y la de la foto no. Jugando se vio que ese argumento no se
     * sostiene: la foto de Tenerife Norte trae la 12/30 **con sus marcas de
     * verdad**, y lo que hacíamos era taparla con una losa nuestra, más
     * oscura, descentrada y metro y medio en el aire — con su pared y todo.
     * «Asfalto mezclado con tierra marrón.» «Ocurre en el último kilómetro.»
     *
     * Así que sobre la foto se apaga todo lo que la foto ya trae: el asfalto,
     * las cintas de rodadura, el eje, las teclas de piano, el designador y el
     * amarillo de las calles.
     *
     * **Y se queda lo que la foto no trae**, que es justo lo que enseña:
     *
     *   las luces         · borde, umbral, aproximación y PAPI
     *   las letras        · las de la foto no se leen desde el aire
     *   la raya verde     · la ruta, que es del juego y no del aeropuerto
     *   las mangas        · el viento de hoy, no el del día de la foto
     *
     * El suelo no se toca: el avión sigue rodando sobre nuestra superficie
     * lisa. Lo que se quita es la manta, y ahora entera.
     *
     * En el mundo dibujado no se apaga nada: allí no hay foto que respetar y
     * nuestra pista es la única que hay.
     */
    const DE_LA_FOTO = new Set([
      "pavimento:asphalt",
      "pavimento:rodadura",
      "pavimento:concrete",
      "pintura",
      "designador",
      "amarillo",
    ]);
    this.terrain.group
      .getObjectByName(`aerodromo:${aero.id}`)
      ?.traverse((o) => {
        if (DE_LA_FOTO.has(o.name)) o.visible = false;
      });
    this.alzadoDelAerodromo = alzado - (perfilDeLaFoto ? 0 : datum);
  }

  /** Cuánto hubo que subir el aeródromo sobre el datum. Para poder mirarlo. */
  private alzadoDelAerodromo = 0;

  private apagarElMundoDeMentira(): void {
    const fuera = (o: Object3D | undefined | null): void => {
      if (o) o.visible = false;
    };
    fuera(this.terrain.group.getObjectByName("terreno"));
    fuera(this.terrain.group.getObjectByName("horizonte"));
    fuera(this.terrain.group.getObjectByName("agua"));
    fuera(this.vegetacion);
    /*
     * Y la ciudad de cajas, que sobre la fotografía no vuelve.
     *
     * Se veía exacto: «hay cubos en el aire flotando». Y aunque se pusieran
     * bien —sobre el suelo de la foto y no sobre el nuestro—, que se intentó y
     * se midió, siguen restando: a mil metros no se ven, y a trescientos son
     * cubos sueltos encima de una fotografía que ya tiene manzanas, calles y
     * tejados. Es lo que se pidió no hacer: «no quiero ver cubitos tirados por
     * ahí».
     *
     * Están colocadas sobre nuestro mapa de alturas, así que sobre la foto
     * quedan flotando; y en Tenerife además sobran, porque la fotogrametría ya
     * trae los edificios de verdad con su volumen y su sombra.
     *
     * En Asunción **sí harían falta** —allí la foto es una alfombra plana— pero
     * puestas sobre el suelo de la foto, no sobre el nuestro. Eso está probado
     * en `spike/aerodromo-real.js` y es lo siguiente.
     */
    fuera(this.scene.getObjectByName("ciudad"));
  }

  /**
   * Los sitios más poblados de la rejilla, para preguntarle a la foto si allí
   * tiene edificios. Medir en el aeropuerto no vale: allí no hay ninguno.
   */
  /*
   * **Aquí vivía el levantar las casas sobre la fotografía, y ya no.**
   *
   * La idea era razonable: donde la foto es una alfombra plana —Asunción— hacen
   * falta edificios, y donde trae volumen —Tenerife— sobran. Se llegó a medirlo
   * bien, catando cuánto se mueve el suelo dentro de una manzana:
   *
   *   Tenerife, la foto los trae · q3 8,0 m
   *   Asunción, la foto es plana · q3 3,1 m
   *
   * El veredicto acertaba en los dos. Lo que fallaba era la premisa.
   *
   * Mirándolo volando, las cajas sobre la fotografía **restan a cualquier
   * altura**. A mil metros no se ven y lo que se ve es Asunción con su río. A
   * trescientos son cubos sueltos y dispersos encima de una fotografía que ya
   * tiene manzanas, calles y tejados: no forman una ciudad, forman escombro
   * esparcido sobre una. Es literalmente lo que se pidió no hacer — «no quiero
   * ver cubitos tirados por ahí».
   *
   * Las casas se quedan donde sí construyen algo: en el mundo dibujado, que no
   * tiene nada debajo y donde son lo que hace que un descampado parezca una
   * ciudad.
   *
   * Si algún día se quieren de vuelta, lo que habría que arreglar no es su
   * aspecto sino **su densidad**: el problema no es que sean cajas, es que son
   * pocas y sueltas. Una manzana entera de cajas pegadas se leería como una
   * manzana.
   */

  /**
   * Recoloca el avión cuando el suelo cambia bajo sus ruedas.
   *
   * **Y sin quitarle el mando a nadie.** La primera versión llamaba a
   * `resetFlight`, y eso pasaba de ser correcto a ser inaceptable en cuanto se
   * probó jugando: el mundo tarda unos segundos en asentarse, así que quien
   * pulsaba la tecla del motor nada más abrir se encontraba con que un segundo
   * después el juego le apagaba el motor y le teletransportaba. «Pulso la I…
   * no pasa nada, está frenado.»
   *
   * Si todavía no ha empezado —motor parado y quieto— se reinicia entero, que
   * es lo limpio. Si ya está jugando, **solo se le sube al suelo nuevo**: ni se
   * mueve de sitio, ni se le apaga nada, ni se le cambia la fase.
   */
  private recolocarTrasElMoldeado(): void {
    const s = this.flight.state;
    const empezado = this.input.controls.engineOn || s.airspeed > 0.5;
    if (!empezado) {
      this.resetFlight();
      return;
    }
    if (!s.onGround) return;
    const suelo = this.terrain.sampleHeight(s.position.x, s.position.z);
    this.flight.reset({
      position: new Vector3(
        s.position.x,
        suelo + this.aircraft.gearHeight,
        s.position.z,
      ),
      heading: s.heading,
      airspeed: s.airspeed,
    });
    // `reset` apaga el motor, y quien lo tenía encendido lo tenía por algo.
    this.input.controls.engineOn = true;
  }

  /*
   * **Aquí vivía la búsqueda de un puesto libre midiendo la fotografía, y ya no.**
   *
   * Empezó porque en Tenerife Norte el puesto elegido tenía encima un Boeing
   * congelado en la fotogrametría —«me comió un 737-800»— y se resolvió, dos
   * veces, midiendo: primero mirando si había algo justo encima, después
   * cuánto sobresalía en un corro de treinta y cuatro metros. Las dos veces se
   * seguía apareciendo bajo el mismo avión.
   *
   * Lo que lo arregló no fue medir mejor, fue una pregunta:
   *
   *   «¿Es tan difícil empezar el juego en otro punto del aeropuerto? Que mira
   *   que es grande, 3400 sólo la pista.»
   *
   * Los puestos de las aeronaves grandes están pegados a la terminal y los de
   * aviación general lejos, y eso lo dice OpenStreetMap sin ayuda de nadie. Ver
   * `puestoDeSalida` en `plan-de-vuelo.ts`.
   *
   * Y esa regla no necesita la fotografía, que es lo que quita el último
   * teletransporte: el puesto bueno se sabe desde el primer fotograma, así que
   * el avión aparece donde va a quedarse. Antes salían tres — «vengo aquí,
   * luego me traga el Iberia y luego voy al sitio nuevo».
   */

  /**
   * Cambia las cajas por el modelo de verdad, si lo hay.
   *
   * Se hace después de montar las cajas y no en su lugar: cargar un glTF tarda,
   * y nadie tiene que esperar mirando un cielo vacío. Si el fichero no está o
   * está roto, esto no hace nada y el juego se queda con las cajas — la misma
   * regla que con las teselas, que **faltar un recurso externo no puede dejar a
   * nadie sin volar**.
   */
  private async ponerModeloSiLoHay(): Promise<void> {
    const idAlPedir = this.aircraft.id;
    const modelo = await cargarModelo(this.aircraft);
    // Puede haberse cambiado de aeronave mientras cargaba.
    if (!modelo || this.aircraft.id !== idAlPedir) return;
    this.scene.remove(this.aircraftMesh.group);
    this.aircraftMesh = modelo;
    this.scene.add(this.aircraftMesh.group);
  }

  /**
   * Vuelve a montar la cinta de guía con las alturas que haya ahora.
   *
   * Sus cotas van horneadas en la geometría, así que cualquier cosa que mueva
   * el suelo la deja enterrada o flotando. La usan el cambio de viento —que
   * cambia la cabecera y con ella la ruta entera— y la llegada de la foto.
   */
  private rehacerPlanDeVuelo(): void {
    if (!this.plan || !this.scenario.aerodrome) return;
    this.scene.remove(this.plan.grupo);
    this.plan = new PlanDeVuelo(
      this.scenario.aerodrome,
      this.scenario.runway,
      (x, z) => this.terrain.sampleHeight(x, z),
    );
    this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
    this.scene.add(this.plan.grupo);
    this.colocarSenalero();
  }

  /** Pone una hora del día. Lo llama el panel del tiempo. */
  ponerHora(hora: number): void {
    this.sky.ponerHora(hora);
  }

  /**
   * Cambiar el tiempo, y con él el aeropuerto.
   *
   * **Cambiar el viento reinicia el vuelo, y no es una limitación: es lo que
   * es.** La cabecera en uso la elige el viento, así que darle la vuelta cambia
   * el puesto de estacionamiento, la ruta de rodaje, la aproximación y el número
   * pintado en el asfalto. Cambiar de cabecera es empezar otro vuelo, igual que
   * cambiar de aeropuerto.
   *
   * Y es justamente la lección: por qué una pista tiene dos números, contada sin
   * una palabra y en un segundo.
   *
   * El terreno no se toca —lo aplanado del aeródromo no depende de por dónde se
   * despegue— así que se rehacen solo las tres cosas que sí: la geometría del
   * aeródromo con su manga, el plan de vuelo y el vuelo en sí.
   */
  ponerTiempo(meteo: Meteo): void {
    this.scenario = conViento(this.scenario, meteo);
    this.terrain.rehacerAerodromo(this.scenario);
    // Y las luces de aproximación, que van en la cabecera por la que se entra:
    // si el viento gira, se mudan al otro extremo con todo lo demás.
    this.ponerAproximacion();
    this.rehacerPlanDeVuelo();
    this.hud.mapa.rehacer(this.scenario);
    /*
     * **Y sin tirar el vuelo.** Aquí había un `resetFlight` y era el mismo
     * error que ya se había arreglado una vez para el moldeado del terreno:
     * tocar el viento o la hora te devolvía al puesto con el motor parado,
     * llevaras el tiempo que llevaras volando. «Se reinicia el juego y eso
     * molesta cuando llevo ya toda la maniobra de despegue y estoy volando
     * hace rato.»
     *
     * `recolocarTrasElMoldeado` es exactamente lo que hace falta, y ya estaba
     * escrito: si no has empezado te reinicia entero —que es lo limpio,
     * porque el viento puede haber cambiado la cabecera en uso y hay que
     * llevarte a la otra punta—, y si ya estás jugando solo te sube al suelo
     * nuevo y no te toca nada más.
     */
    this.recolocarTrasElMoldeado();
  }

  /** Vuelve a pedir el parte de verdad y lo pone. */
  private async tiempoDeVerdad(): Promise<void> {
    const icao = this.scenario.aerodrome?.id;
    if (!icao) return;
    const meteo = await pedirMetar(icao, PROXY_METEO);
    this.hud.tiempo.poner(meteo);
    this.ponerTiempo(meteo);
  }

  /**
   * Empezar ya volando, en final, para la lección de aterrizar.
   *
   * Con motor, con velocidad de aproximación y mirando a la pista. El plan de
   * vuelo se reinicia igual —hace falta para la raya de vuelta al puesto cuando
   * se haya tomado tierra—, pero la máquina de fases arranca en el aire.
   */
  private reiniciarEnFinal(): void {
    const { runway } = this.scenario;
    this.plan?.reiniciar();
    this.colocarSenalero();
    this.flight.reset({
      position: this.startPosition(),
      heading: MathUtils.degToRad(runway.heading),
      airspeed: this.flight.velocidadDeEntradaEnFinal(
        this.aircraft.approachSpeed,
      ),
    });
    /*
     * **Soltar los mandos primero, y después poner el gas.**
     *
     * Estaba al revés: se ponía el gas al cuarenta y cinco por ciento y ocho
     * líneas más abajo `releaseAll()` lo borraba a cero. Resultado: la lección
     * de aterrizar empezaba en el aire y **parada**, planeando sin motor desde
     * el primer segundo y sin que nadie dijera nada. «Mal empezamos, el juego
     * empieza parado en el aire.»
     */
    this.input.releaseAll();
    this.input.controls.engineOn = true;
    /*
     * **El gas que sostiene la velocidad de aproximación, no un 0,45 mágico.**
     *
     * Ese cuarenta y cinco por ciento venía de probar con el modelo completo,
     * y en el de Guyrami apunta a diecisiete metros por segundo — la mitad de
     * la aproximación. Así que la lección arrancaba a 33 y frenaba hasta 64
     * por hora mientras las casas pasaban despacio por debajo: «no es un modo
     * muy natural de sobrevolar la aproximación».
     *
     * Ahora se pide la velocidad y que cada modelo diga qué gas hace falta.
     */
    this.input.controls.throttle = this.flight.gasPara(
      this.flight.velocidadDeEntradaEnFinal(this.aircraft.approachSpeed),
    );
    this.faseAnunciada = "";
    // Con la posición: se empieza en final y hay aros que ya quedan detrás.
    this.runwayGuide.reset(this.flight.state.position);
    this.landing.reset();
    this.frustrada.reiniciar();
    this.reiniciarGalones();
    this.crashedFor = 0;
    this.wasOnGround = false;
    this.wasStalled = false;
    this.wasCrashed = false;
    this.hud.tutor.reset();
    this.instructor.callar();
    this.updateBadge();
  }

  /**
   * Hacia dónde mira el avión en su puesto.
   *
   * Mirando al primer tramo de la ruta. No es un detalle: un avión que aparece
   * de espaldas a por donde tiene que irse obliga a maniobrar antes de
   * entender nada, y lo primero que se hace en un juego es lo que más marca.
   */
  private rumboDeSalida(desde: Vector3): number {
    const hacia = this.plan?.primerPaso();
    if (!hacia) return MathUtils.degToRad(this.scenario.runway.heading);
    return Math.atan2(hacia[0] - desde.x, -(hacia[1] - desde.z));
  }

  // ── Bucle ─────────────────────────────────────────────────────────────

  private frame = (): void => {
    /*
     * **El tope está en un segundo**, y cada vez que se ha subido ha sido por
     * el mismo motivo: por debajo de él, un aparato lento no pierde
     * fotogramas — **juega a cámara lenta**, y sin avisar.
     *
     * Empezó en 0,1 s y se subió a 0,25 s con este razonamiento: a cuatro
     * fotogramas por segundo cada uno dura 0,25 s reales y solo se avanzaba
     * 0,1. Se quedó corto. Midiendo la carrera de despegue con reloj de
     * verdad, a dos fotogramas por segundo salió esto:
     *
     *   velocidad indicada  18,4 m/s
     *   avance real          7,3 m/s
     *   razón                2,53
     *
     * Es decir: el avión marcaba cien por hora y se movía a cuarenta. Todo lo
     * que se notaba jugando venía de ahí — «esta avioneta parece de juguete
     * sobre un aeropuerto de verdad», «a cien por hora no tardas tanto en
     * hacer una pista», «los aviones no tardan tanto en rodar»—: no era la
     * escala ni la física, era que el reloj del juego iba más lento que el de
     * la pared.
     *
     * El tope vive en `fdm.ts` y se comparte, que es lo que hacía falta: eran
     * dos, tenían que valer lo mismo, y subir este solo no arreglaba nada
     * porque el modelo de vuelo recortaba otra vez por su cuenta.
     */
    const dt = Math.min(this.clock.getDelta(), MAX_PASO);

    /*
     * Si las ruedas están sobre la pista, y no en la plataforma ni en la
     * hierba. Lo mira el modelo sencillo para no dejar despegar desde
     * cualquier sitio. Ver `arcade.ts`: no es física, es la regla del juego.
     */
    const r = this.scenario.runway;
    const ejes = enEjesDePista(
      this.flight.state.position.x,
      this.flight.state.position.z,
      r.x,
      r.z,
      r.heading,
    );
    this.flight.setOnRunway(
      Math.abs(ejes.along) < r.length / 2 + 30 &&
        Math.abs(ejes.across) < r.width / 2 + 6,
    );

    this.input.update(dt);
    // El piloto de pruebas hace de teclado, así que va donde va el teclado: y
    // **la ayuda va después de quien pilota**, no antes. Puestas al revés, el
    // mando del jugador borraba la asistencia y los cuatro peldaños daban
    // exactamente el mismo número.
    this.pilotoDePruebas?.(this.input.controls);
    this.limitarElRodaje();
    this.asistirRodaje(dt);
    if (this.flight.state.crashed) {
      // Vuelve solo a la pista. La alternativa —dejar el avión roto hasta
      // que alguien pulse una tecla— exige leer un mensaje, y quien juega
      // puede tener cuatro años. La tecla sigue estando para quien la use.
      this.crashedFor += dt;
      if (this.crashedFor > CRASH_RESET_DELAY) this.resetFlight();
    } else {
      this.antesDelPaso.copy(this.flight.state.position);
      this.flight.step(dt, this.input.controls);
      this.mirarSiChocaConAlgo();
    }
    this.avisarDeLosBultos(dt);

    /*
     * Los avisos de la toma. Se dicen **y** se enseñan, siempre: hay quien
     * juega en silencio, hay quien tiene la pestaña muteada y hay quien no
     * oye. La voz acompaña; el número manda.
     */
    const aviso = this.avisosDeAltura.paso(
      this.flight.state.heightAboveGround,
      !this.flight.state.onGround,
    );
    if (aviso) {
      decir(aviso.dice);
      this.hud.flash(`${aviso.metros}`, 1.6);
    }

    /*
     * La velocidad de la aproximación, en la tarjeta de siempre.
     *
     * Y la voz solo si se sostiene: un aviso hablado que salta cada vez que la
     * aguja roza el borde de la banda es ruido, y el ruido se aprende a no
     * oír. Tres segundos fuera es una tendencia, no un bache.
     */
    const banda =
      bandaDeRodaje(
        this.flight.state.airspeed,
        this.flight.state.onGround,
        // Correr es despegar o aterrizar. Lo demás, en el suelo, es rodar.
        CORRIENDO.has(this.faseAnunciada),
      ) ??
      bandaDeVelocidad(
        {
          sobreElSuelo: this.flight.state.heightAboveGround,
          enElSuelo: this.flight.state.onGround,
          vertical: this.flight.state.verticalSpeed,
          velocidad: this.flight.state.airspeed,
        },
        this.aircraft.approachSpeed,
      );
    this.hud.setBandaDeVelocidad(banda);
    this.hud.mostrarFps(dt, {
      llamadas: this.renderer.info.render.calls,
      triangulos: this.renderer.info.render.triangles,
    });
    if (banda === "lento" || banda === "rapido") {
      this.fueraDeBanda += dt;
      if (this.fueraDeBanda > 3 && this.dichoDeBanda !== banda) {
        this.dichoDeBanda = banda;
        /*
         * Rodando no se dice «airspeed», que es palabra de vuelo: se dice lo
         * que diría cualquiera en una calle de rodaje. Y en el aire,
         * «airspeed» es lo que dice una cabina de verdad — dice las dos cosas
         * a la vez, «mira la velocidad»; cuál de las dos ya lo dice el color.
         */
        decir(this.flight.state.onGround ? "slow down" : "airspeed");
      }
    } else {
      this.fueraDeBanda = 0;
      this.dichoDeBanda = null;
    }

    /*
     * **El aviso de terreno**, que es el que salva.
     *
     * Se hicieron maniobras malas a propósito para ver si el juego decía algo
     * —volar bajísimo sobre el pueblo, pasar rozando un edificio— y la
     * pantalla se quedaba callada. El propio HUD tenía escrita la advertencia
     * y sin cumplir: «un panel bonito que esconde un terrain, pull up es peor
     * que no tener panel».
     *
     * Va aquí y no en el bloque de fases porque **no es una fase**: es algo
     * que puede pasar en cualquiera de ellas y que manda sobre todas.
     */
    const cerca = {
      sobreElSuelo: this.flight.state.heightAboveGround,
      vertical: this.flight.state.verticalSpeed,
      enElSuelo: this.flight.state.onGround,
      /*
       * **Y «final» deja de valer como excusa si se va muy por debajo.**
       *
       * La fase dice «final» con estar alineado, por delante del umbral y
       * bajando; no mira la altura. Grabado volando: aproximación larga sobre
       * la ciudad, el avión bajando entre los edificios y la pantalla muda
       * hasta posarse en un descampado, porque el aviso de terreno se calla en
       * final a propósito. Ver `fueraDeLaSenda`.
       */
      enFinal:
        this.faseAnunciada === "final" &&
        !fueraDeLaSenda(
          this.distanceToRunway(),
          this.flight.state.position.y - this.terrain.runwayElevation,
          Math.tan(GLIDE_SLOPE),
        ),
      /*
       * **Y sobre la pista, ni una palabra.** Ver `Cerca.sobreLaPista`.
       *
       * Se mira el rectángulo de la pista con su margen por delante y por
       * detrás, porque cruzar la cabecera a diez metros es exactamente lo que
       * hay que hacer y el avión todavía no pisa nada.
       */
      sobreLaPista: this.sobreLaPista(),
    };
    const terreno = avisoDeTerreno(cerca);

    /*
     * **Y lo contrario del aviso de terreno: ya podés tocar.**
     *
     * «No me indica lo contrario, que ya debo tomar tierra.» Todo el vuelo
     * avisando de que se va bajo y en el único momento en el que ir bajo es lo
     * que hay que hacer —cruzando el umbral a quince metros— la pantalla se
     * queda muda. A quien no lee, el juego tiene que decirle **cuándo**.
     *
     * Una vez por aproximación: se rearma al despegar o al alejarse.
     */
    const puedeTocar =
      !this.flight.state.onGround &&
      cerca.sobreLaPista &&
      /*
       * **La altura sobre la pista, no sobre el terreno.** Antes del umbral el
       * suelo puede estar mucho más abajo —en Tenerife Norte cae setenta
       * metros en un kilómetro— y la altura sobre el terreno diría que se va
       * altísimo justo cuando se está cruzando la valla.
       */
      this.flight.state.position.y - this.terrain.runwayElevation <
        ALTURA_DE_TOMA &&
      this.flight.state.verticalSpeed < 1;
    if (puedeTocar && !this.dichoDeLaToma) {
      this.dichoDeLaToma = true;
      this.hud.senal.mostrar(
        "toma",
        this.tier.instruments !== "none" ? t("vuelo.yaPodesTocar") : "",
        null,
        /*
         * **Con prioridad de aviso, y caducando al tocar.**
         *
         * Las dos cosas hacen falta. Sin prioridad, cualquier tarjeta vieja
         * —«volvé a la raya», un veredicto de hace cinco segundos— tapa lo
         * único que importa en ese instante. Y sin caducarla al tocar tierra,
         * este consejo tapaba a su vez la orden de frenar, que es la que hay
         * que obedecer: lo cazó el banco en Silvio Pettirossi. Ver
         * `avisarDeLosBultos`.
         */
        { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
      );
      this.instructor.decir(t("vuelo.yaPodesTocar"));
    } else if (
      this.dichoDeLaToma &&
      /*
       * **Se rearma al subirse otra vez**, cuatro veces la altura de la toma.
       *
       * Se probó rearmarlo también al tocar el suelo, y sale mal donde más
       * importa: en una toma con rebote el contacto parpadea, el aviso se
       * rearma y vuelve a salir «ya podés tocar» **encima de la tarjeta del
       * freno**, que es la que hay que obedecer. Un consejo no puede tapar una
       * orden. Quien vuelve a volar lo vuelve a oír; quien reinicia también,
       * porque colocar el avión lo rearma.
       */
      this.flight.state.position.y - this.terrain.runwayElevation >
        ALTURA_DE_TOMA * 4
    ) {
      this.dichoDeLaToma = false;
    }

    /*
     * **Y la frustrada**, que mira exactamente lo mismo para decir lo
     * contrario: el aviso de terreno dice que algo va mal, y esto dice que
     * alguien lo ha resuelto. Ver `flight/frustrada.ts`.
     */
    const renuncio = this.frustrada.paso(cerca);
    if (renuncio) this.celebrarLaFrustrada();
    if (terreno && terreno !== this.terrenoDicho) {
      this.terrenoDicho = terreno;
      this.hud.senal.mostrar(
        "terreno",
        this.tier.instruments !== "none"
          ? t(terreno === "sube" ? "vuelo.terrenoSube" : "vuelo.terrenoBajo")
          : "",
        null,
        // Por debajo del aviso de bulto: los dos saltan a la vez volando bajo
        // sobre la ciudad, y el que dice qué hacer es el que nombra el bulto.
        { segundos: 3, prioridad: IMPORTANTE },
      );
      this.audio.cue(terreno === "sube" ? "error" : "attention");
      // En inglés aeronáutico, como el resto de la voz de cabina.
      decir(terreno === "sube" ? "terrain, pull up" : "too low");
    } else if (!terreno) {
      this.terrenoDicho = null;
    }

    // Y el aro, que se enciende según te acercas: necesita saber dónde estás.
    this.missionMarker.update(dt, {
      x: this.flight.state.position.x,
      z: this.flight.state.position.z,
    });
    this.runwayGuide.update(dt, this.flight.state.position);
    /*
     * Cruzar un aro se celebra: destello, salto de escala y una nota. Y
     * **fallarlo también dice algo**, que era lo que faltaba: hasta ahora
     * pasar por encima o por fuera no producía ninguna reacción, así que el
     * aro no enseñaba nada — «algunos aros los pasé por encima sin que me
     * dijera nada».
     *
     * Perderlo no se castiga y no suena a error. Suena distinto y nada más,
     * porque perder un aro **no es un fallo**: es información, y quien no lee
     * necesita enterarse de que eso de ahí contaba. Lo que sí se hace es
     * seguir adelante: el siguiente aro pasa a ser el siguiente y la senda
     * sigue guiando, en vez de quedarse esperando a uno que ya no volverá.
     */
    /*
     * **Y todo esto, volando.** En tierra no hay senda que seguir.
     *
     * Sin esa condición, la primera señal de una lección de despegue era
     * «pasaste por debajo del aro, subí un poco» —con el avión parado en su
     * puesto y el motor apagado—: los aros de aproximación quedan por delante
     * de la cabecera, así que desde la plataforma ya se han «perdido» todos.
     * Medido en el banco: la tarjeta de arrancar el motor no llegaba a verse,
     * porque el aro se la comía y se iba a los dos segundos y medio dejando la
     * pantalla en blanco. «En el modo despegue, esta es la primera señal que
     * aparece.»
     */
    const aro = this.flight.state.onGround
      ? null
      : this.runwayGuide.check(this.flight.state.position);
    if (aro === "cruzado") this.audio.cue("aro");
    else if (aro === "perdido") {
      this.audio.cue("aroFallado");
      /*
       * **Y se dice por dónde se escapó, que es lo único que sirve.**
       *
       * «Supero el aro y nadie me corrige.» Sonaba y destellaba en rojo —o
       * sea, decía *que* se escapó— y no decía **hacia dónde**: pasar
       * cincuenta metros por encima y pasar cincuenta por debajo eran el mismo
       * pitido, y son la lección contraria.
       *
       * Solo cuando el fallo es de altura. Pasar ancho ya se ve —el aro te
       * queda al lado— y para eso está la raya de la senda.
       */
      const donde = this.runwayGuide.porDonde;
      if (donde === "alto" || donde === "bajo") {
        this.hud.senal.mostrar(
          donde === "alto" ? "aro-alto" : "aro-bajo",
          this.tier.instruments !== "none"
            ? t(donde === "alto" ? "vuelo.aroAlto" : "vuelo.aroBajo")
            : "",
          null,
          { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
        );
        decir(donde === "alto" ? "too high, come down" : "too low, climb");
      }
    }
    this.syncAircraftMesh(dt);
    this.updateCamera(dt);
    updateSky(this.sky, this.camera.position);

    /*
     * El mundo de verdad. Va **después** de mover la cámara y antes de pintar:
     * el cargador elige el detalle según dónde está la cámara, y pedirle teselas
     * con la cámara del fotograma anterior es pedir el sitio equivocado. Eso ya
     * nos costó una prueba entera con la cámara treinta y cuatro kilómetros bajo
     * tierra.
     */
    if (this.teselas) {
      this.teselas.update(this.camera, this.renderer, dt);
      /*
       * Y el parche de suelo lejano sigue al avión. Solo hace falta cuando ya
       * se ha salido del escenario o anda cerca del borde: dentro manda el mapa
       * de alturas, que es exacto y no cuesta rayos.
       */
      if (this.mundoRealPuesto) {
        const s = this.flight.state;
        const borde = this.scenario.size / 2;
        if (
          Math.abs(s.position.x) > borde * 0.7 ||
          Math.abs(s.position.z) > borde * 0.7
        ) {
          this.teselas.seguirAlAvion(s.position.x, s.position.z);
        }
      }
      if (this.teselas.asentado && !this.mundoRealPuesto) {
        this.mundoRealPuesto = true;
        this.apagarElMundoDeMentira();
      }
      /*
       * Y se copia el suelo de la foto al nuestro, de una pasada.
       *
       * Seis kilómetros alrededor del aeródromo, que es donde se rueda, se
       * despega y se aterriza y donde un metro se ve. Es medio segundo de tirón
       * al empezar y a cambio **el suelo que se pisa y el que se ve son el
       * mismo**, no dos que se parecen con un número entre medias.
       *
       * Y después se recoloca el avión, porque el suelo bajo sus ruedas acaba
       * de cambiar.
       */
      if (this.mundoRealPuesto && !this.sueloMoldeado) {
        this.sueloMoldeado = true;
        /*
         * **Primero el mundo entero, y luego el aeropuerto con precisión.**
         *
         * Fuera del trozo que se moldea con rayos, nuestro terreno tiene la
         * forma bien y el datum mal: es la misma ladera, cuarenta y ocho metros
         * más abajo. Subirlo el desfase medido lo pone donde va, y eso quita el
         * escalón que quedaba en el borde de la zona moldeada — una isla
         * correcta dentro de un mapa desplazado.
         *
         * Y no cuesta ni un rayo: es una pasada por el mapa de alturas.
         */
        this.terrain.subirTodo(this.teselas.desfase ?? 0);
        // Y a partir de aquí, fuera del escenario manda la fotografía.
        this.terrain.ponerSueloLejano(
          (x, z) => this.teselas?.cotaLejana(x, z) ?? null,
        );
        /*
         * **Y se descarta lo que no cuadre con el desfase que ya se midió.**
         *
         * Un rayo que golpea una tesela basta —de las que aún no han llegado en
         * fino, sobre todo en el borde de la zona— devuelve una cota decenas de
         * metros alta, y creérsela deja cráteres y mesetas en el suelo. La
         * primera versión filtraba solo por «no más de cuatrocientos metros» y
         * escribió valores setenta y tres metros altos: el avión pasó de topo a
         * flotar.
         *
         * Pero el desfase entre los dos suelos ya está medido sobre la pista, y
         * es constante. Así que cualquier cota que se aparte más de cuarenta
         * metros de lo que predice **no es el suelo**, es una tesela sin
         * terminar de cargar, y se deja el nuestro.
         */
        const esperado = this.teselas.desfase ?? 0;
        const escritos = this.terrain.moldearDesde(
          (x, z) => {
            const suyo = this.teselas!.alturaEn(x, z);
            if (suyo === null) return null;
            const prevision = this.terrain.sampleHeight(x, z) + esperado;
            return Math.abs(suyo - prevision) < 40 ? suyo : null;
          },
          [0, 0],
          6000,
        );
        /*
         * Y se le quitan los bultos. Copiar la foto trae la terminal, los
         * hangares y los aviones aparcados, y eso no es suelo: es lo que hay
         * **encima** del suelo. Dos pasadas, porque un edificio grande ocupa
         * más de un nudo y la primera solo le quita el borde.
         */
        let bultos = 0;
        for (let i = 0; i < 2; i++)
          bultos += this.terrain.alisarPicos([0, 0], 6000, 6);
        /*
         * Y una pasada de suavizado, que es otra cosa distinta de quitar
         * bultos. Los bultos son lo que sobresale; esto son los **escalones**
         * que deja copiar una superficie fotogramétrica sobre una rejilla de
         * cincuenta y siete metros. Un salto de dos metros es una rampa, y con
         * ella el avión sale despedido rodando: medido, trescientos treinta y
         * uno de cada novecientos fotogramas en el aire sin tocar el mando.
         */
        this.terrain.suavizar([0, 0], 6000, 2);
        this.bultosQuitados = bultos;
        /*
         * Y se reasienta el aeródromo **por encima de la fotografía**.
         *
         * Dos pasos, y hacen falta los dos. Primero se devuelve el aeródromo a
         * su superficie lisa —la que sale de los umbrales— subida por el datum
         * de la foto. Después se mide cuánto le falta para quedar por encima
         * de la foto **en todas partes**, y se vuelve a asentar con esa cuenta.
         *
         * Medir es lo que no se puede saltar. El primer intento subió el
         * aeródromo por un solo número, el desfase medido en la pista, y en
         * Asunción dejó la plataforma tres metros y medio por debajo. El
         * segundo lo construyó siguiendo la foto punto a punto, y entonces lo
         * que se veía y lo que se pisaba dejaron de ser lo mismo: la física lee
         * el mapa de alturas, que interpola entre nudos de cincuenta y siete
         * metros, y en cada cruce el avión se hundía en el asfalto.
         */
        this.asentarAerodromoSobreLaFoto();
        /*
         * **Y se rehace el plan de vuelo, que si no se queda enterrado.**
         *
         * La cinta verde se construye al arrancar la partida y sus alturas van
         * horneadas en la geometría. Cuando llega la fotografía el suelo sube
         * el datum —cuarenta y siete metros en Tenerife Norte, trece y medio en
         * Asunción— y la cinta se queda donde estaba: debajo del asfalto. Se vio
         * jugando, «sin línea guía», y desconcertaba porque a veces sí salía —
         * salía justo cuando se cambiaba de puesto, porque cambiar de puesto la
         * volvía a construir con las alturas nuevas.
         *
         * Va **antes** de buscar el puesto, que es quien puede volver a
         * construirla, y después de asentar el aeródromo, que es quien deja las
         * alturas definitivas.
         */
        this.rehacerPlanDeVuelo();
        this.ponerAproximacion();
        if (escritos > 0) this.recolocarTrasElMoldeado();
      }
    }
    this.advanceMission();
    this.announce(this.flight.state);
    // La bocina avisa al 85 % del ángulo crítico de esta aeronave concreta,
    // que es donde la ponen los fabricantes.
    this.audio.update(
      this.flight.state,
      this.input.controls,
      this.aircraft.aero.alphaStall * 0.85,
    );
    // El mapa, si está abierto. Solo mueve la flecha: el mundo ya está pintado.
    /*
     * El PAPI mira al avión. Es lo único del aeródromo que cambia cada
     * fotograma, y es el instrumento que enseña a aterrizar sin una palabra:
     * rojo por debajo, blanco por encima, dos y dos en la senda.
     */
    this.aproximacion?.mirarDesde(
      this.flight.state.position.x,
      this.flight.state.position.y,
      this.flight.state.position.z,
    );
    // Las pantallas de la cabina, si el avión las trae. Van aquí y no en el
    // HUD porque son parte del avión: se ven desde dentro y desde fuera, y se
    // apagan solas cuando se cambia a un modelo que no las tiene.
    this.aircraftMesh.pantallas?.actualizar(
      {
        velocidad: this.flight.state.airspeed,
        altura: this.flight.state.position.y,
        vertical: this.flight.state.verticalSpeed,
        rumbo: this.flight.state.heading,
        declinacion: this.scenario.magneticVariation ?? 0,
        cabeceo: pitchAngleOf(this.flight.state.orientation),
        alabeo: bankAngleOf(this.flight.state.orientation),
      },
      dt,
    );

    // Y a dónde se va, si se va a algún sitio: el objetivo de la misión, que
    // es lo único del mundo que es «otro lugar concreto».
    const objetivo = this.missions.current;
    this.hud.mapa.update(
      this.flight.state.position.x,
      this.flight.state.position.z,
      this.flight.state.heading,
      objetivo ? objectiveTarget(objetivo) : null,
    );
    this.hud.update(
      this.flight.state,
      this.input.controls.throttle,
      dt,
      this.input.controls.brakes,
      this.aircraft.decisionSpeed,
      this.runwayRemaining(),
      this.input.controls.engineOn,
      /*
       * Y si esto es una carrera de **despegue**, que es lo que decide si hay
       * V1 o no. Lo sabe el plan de vuelo y no la velocidad: en pista, rápido
       * y con gas describe igual de bien las dos carreras. Ver `hud.update`.
       */
      EN_DESPEGUE.has(this.vistaActual?.fase ?? "en-vuelo"),
    );
    const toma = this.checkLanding(dt);
    // El tutor recibe la distancia a **la pista**, no a la aguja. Con una
    // misión en curso la aguja señala el objetivo, y si el tutor mirara ese
    // número pediría bajar el motor para aterrizar cada vez que uno se
    // acercara a un punto de paso. Que es lo que hacía.
    this.updateHomeIndicator();
    this.hud.tutor.update(
      this.flight.state,
      this.input.controls.throttle,
      dt,
      this.distanceToRunway(),
    );
    this.avanzarPlan(dt);
    this.atenderAlSenalero(dt);
    this.contarGalones(dt, banda, aro, toma, renuncio);
    this.hud.senal.update(dt);

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Dónde se planta el señalero, y mirando a dónde.
   *
   * Sale de la ruta de salida, que es la que hay al empezar la partida: el
   * avión **vuelve por donde se fue**, así que con el puesto y el primer paso
   * de la ida ya se sabe por dónde va a llegar. Se rehace en cada reinicio
   * porque el puesto cambia con el viento — otra cabecera, otra ruta, otro
   * sitio donde aparcar.
   */
  private colocarSenalero(): void {
    // Los dos se borran siempre, haya puesto o no: un coche del vuelo anterior
    // rodando por su cuenta es peor que no tener coche.
    this.senalero.reiniciar();
    this.sigueme.reiniciar();
    const puesto = this.plan?.arranque();
    if (!puesto) return;
    this.senalero.colocar(puesto, this.plan?.primerPaso() ?? null, (x, z) =>
      this.terrain.sampleHeight(x, z),
    );
  }

  /**
   * El señalero, un fotograma.
   *
   * Solo señala **de vuelta**: al salir no hay nadie con bastones delante del
   * morro, porque al salir no hace falta nadie — de eso se encarga la raya
   * amarilla y la torre. Aparece cuando el vuelo ya se hizo y toca meter el
   * avión en su hueco, que es cuando un aeropuerto de verdad saca a alguien a
   * la plataforma.
   */
  private atenderAlSenalero(dt: number): void {
    const fase = this.vistaActual?.fase;
    /*
     * **Y no mientras se corre por la pista.**
     *
     * «Aterrizado» estaba en esta lista, y con el puesto elegido cerca de la
     * zona de toma el señalero empezaba a hacer gestos **con el avión todavía
     * rodando por la pista a treinta metros por segundo**: su tarjeta tapaba
     * la del freno, que es la única que ahí importa. Un señalero de verdad no
     * señala a nadie que está aterrizando; espera en su puesto.
     */
    const volviendo =
      fase === "abandonando" || fase === "a-plataforma" || fase === "en-puesto";
    const s = this.flight.state;
    const gesto = this.senalero.paso(
      dt,
      {
        x: s.position.x,
        z: s.position.z,
        velocidad: s.airspeed,
        enElSuelo: s.onGround,
      },
      volviendo,
    );

    /*
     * **Y pasarse del puesto tiene que doler un poco.**
     *
     * «Llego al señor que señaliza y juego a pasarme de largo. Se aparta, sí,
     * pero no hay avisos.» El señalero cruzaba los bastones —hace lo que
     * tiene que hacer— y el juego se quedaba tan tranquilo: la misma tarjeta
     * silenciosa que ya estaba puesta desde hacía diez segundos, sin sonido y
     * sin cambio. Un aviso que no cambia cuando cambia la situación no es un
     * aviso.
     *
     * No se castiga —aquí no se castiga nada— pero suena, sale con prioridad
     * de urgencia y lo dice la voz. Y una sola vez por pasada: se rearma al
     * volver a acercarse.
     */
    const pasado = this.senalero.pasado;
    if (volviendo && pasado > SE_PASO_DEL_PUESTO && s.airspeed > 2) {
      if (!this.avisadoDeLaPasada) {
        this.avisadoDeLaPasada = true;
        this.hud.senal.mostrar(
          "senalero-alto",
          this.tier.instruments !== "none" ? t("vuelo.teLoPasaste") : "",
          null,
          {
            segundos: SE_QUEDA_EL_BULTO,
            prioridad: URGENTE,
            tecla: nombreDeTecla(this.input.preferredKey("brakes")),
          },
        );
        this.audio.cue("error");
        this.instructor.decir(t("vuelo.teLoPasaste"));
      }
    } else if (pasado < SE_PASO_DEL_PUESTO / 2) {
      this.avisadoDeLaPasada = false;
    }

    /*
     * **Y el gesto se repite en la tarjeta, porque al señalero no se le ve.**
     *
     * Está ahí, con los bastones y la lateralidad medida al grado, y desde la
     * cámara de persecución es una figura de metro ochenta a cuarenta metros:
     * cuarenta y cinco píxeles, medio tapados por el ala. «Señor de los
     * bastones, ¿qué señor?» — descripción exacta de lo que se ve.
     *
     * La tarjeta ya es el sitio donde el juego dice qué toca ahora, y el
     * dibujo que se pone es **el mismo señalero**, con los brazos donde los
     * tiene él. Lo del cristal y lo de la pantalla son la misma cosa.
     *
     * Al acabarse el gesto se borra la fase anunciada y la tarjeta que tocara
     * vuelve sola, que es el mismo mecanismo del aviso de freno.
     */
    /*
     * **Menos el de «frenos», que es el final y no una instrucción.**
     *
     * Ese gesto se queda puesto mientras el avión está parado en el puesto, y
     * con él puesta se quedaba también su tarjeta — tapando la única que ahí
     * hace falta, que es la llave de «apagá el motor». Se vio jugando: «no hay
     * señal de apagado sino la del señor que cruzó las señales bajo su
     * cintura, pero no dice de apagar».
     *
     * El señalero sigue cruzando los bastones en el mundo, que es donde ese
     * gesto significa «ya está». La pantalla pasa a lo siguiente.
     */
    const enPantalla = gesto === "frenos" ? null : gesto;
    if (enPantalla !== this.gestoEnPantalla) {
      this.gestoEnPantalla = enPantalla;
      if (enPantalla) {
        /*
         * **Y el «alto» lleva el freno dibujado, que es lo que hay que hacer.**
         *
         * «Aparte del señor, algo debe decirme que pare. Si durante todo el
         * rato del aterrizaje el juego está moviendo y controlando la
         * velocidad de la aeronave, ahora el niño cree que se va a parar
         * sola.» El señalero dice **qué** —no te muevas más— y hasta ahí
         * llegaba la pantalla; lo que faltaba era el **cómo**, que es la misma
         * tecla del freno que ya sale en el punto de espera y al tomar tierra.
         *
         * Es la tercera vez que aparece la misma pareja —dibujo que se
         * entiende sin leer, tecla dibujada al lado— y a propósito: quien la
         * vio en la doble raya la reconoce aquí.
         */
        const parando = enPantalla === "alto" || enPantalla === "despacio";
        this.hud.senal.mostrar(`senalero-${enPantalla}`, "", null, {
          segundos: Infinity,
          tecla: parando
            ? nombreDeTecla(this.input.preferredKey("brakes"))
            : null,
        });
        if (parando) {
          this.instructor.decir(
            t(enPantalla === "alto" ? "vuelo.alto" : "vuelo.despacio"),
          );
        }
      } else {
        this.faseAnunciada = "";
      }
    }

    /*
     * Y el coche del «sígame», que va por la misma ruta y se aparta cuando
     * empieza a señalar el de los bastones. En la plataforma manda él.
     *
     * Sale rodando —de ida y de vuelta— y no en la carrera de despegue ni en
     * el puesto: un coche en la pista mientras despegás sería exactamente lo
     * contrario de lo que hay que enseñar.
     */
    if (this.plan && this.tier.sigueme) {
      this.sigueme.ponerRuta(this.plan.rutaVisible());
      /*
       * **Está antes de arrancar, y eso importa.**
       *
       * El primer intento lo sacaba solo al empezar a rodar, y así el coche
       * aparecía de la nada cuando ya ibas andando. Un sígame de verdad llega
       * **antes**, se pone delante y espera: quien lo ve ahí parado ya sabe,
       * sin que nadie se lo diga, que hay que ir detrás de él.
       */
      const rodando =
        fase === "estacionado" ||
        fase === "arrancando" ||
        fase === "rodando" ||
        fase === "esperando" ||
        fase === "autorizado" ||
        // **Y frenando en la pista, que es donde desaparecía.** «Se ve bien,
        // pero desaparece en la pista de aterrizaje»: en esa fase el coche no
        // estaba activo, así que justo cuando hay que decidir por dónde salir
        // no había nadie delante. Ahora está, esperando en la salida.
        fase === "aterrizado" ||
        fase === "abandonando" ||
        fase === "a-plataforma";
      /*
       * **Y si estamos frenando en la pista pero no hay salida que esperar, el
       * coche no sale.**
       *
       * Sin esto, cuando `bocaDeLaSalida` no encuentra punto —ruta corta,
       * salida todavía sin calcular— el tope desaparecía y el coche volvía a
       * ponerse treinta metros por delante del morro **en la pista**, que es
       * justo lo que se arregló: se le acaba pasando por encima.
       */
      const espera = fase === "aterrizado" ? this.bocaDeLaSalida() : null;
      this.sigueme.paso(
        dt,
        { x: s.position.x, z: s.position.z },
        rodando && s.onGround && !(fase === "aterrizado" && !espera),
        gesto !== null,
        (x, z) => this.terrain.sampleHeight(x, z),
        espera,
      );
    }
  }

  /**
   * Otro vuelo, otros galones.
   *
   * **Sí se borran al reiniciar, y eso no contradice el «ganado es ganado».**
   * Lo que no se puede quitar es un galón *dentro* de un vuelo; entre un vuelo
   * y el siguiente hay que empezar de cero, porque si no la manga se llena
   * sola a base de repetir y deja de decir nada. La libreta de vuelo (#25) es
   * el sitio donde lo ganado se guarda de verdad.
   */
  private reiniciarGalones(): void {
    this.galones.reiniciar();
    this.hud.setGalones([]);
    // Y se quita el final del vuelo anterior, que ya no habla de este.
    this.vueloTerminado = false;
    this.hud.cerrarFinDeVuelo();
  }

  /**
   * Los galones del vuelo, contados y celebrados.
   *
   * Va al final del fotograma, cuando ya han hablado todos los que miden: la
   * banda de velocidad, el aro que se acaba de cruzar, el veredicto de la toma
   * y la fase del plan. Aquí no se mide nada nuevo — **todo esto ya estaba
   * medido y nadie lo juntaba**, que era exactamente el problema.
   *
   * Y se celebra con las cuatro notas que suben, no con un cartel: un galón se
   * gana muchas veces mientras se está haciendo otra cosa —cruzando el
   * penúltimo aro, rodando hacia el puesto— y un cartel ahí tapa la lección
   * que se está dando. El sonido y el chevrón que aparece bastan.
   */
  private contarGalones(
    dt: number,
    banda: BandaDeVelocidad,
    aro: PasoDeAro,
    toma: Aterrizaje,
    frustrada: boolean,
  ): void {
    const ganado = this.galones.paso(
      {
        fase: this.vistaActual?.fase ?? "en-vuelo",
        banda,
        fuera: this.vistaActual?.fuera ?? false,
        aro,
        toma,
        frustrada,
      },
      dt,
    );
    if (!ganado) return;
    this.hud.setGalones(this.galones.lista);
    this.audio.cue("achieved");
  }

  /**
   * Rumbo y distancia a la cabecera de pista, en coordenadas del piloto.
   *
   * Se apunta a la cabecera y no al centro de la pista porque es por donde
   * se entra: seguir la aguja lleva al principio del asfalto, alineado, que
   * es exactamente donde uno quiere aparecer.
   */
  /** Metros hasta la cabecera de pista, mire donde mire la aguja. */
  /**
   * ¿Está el avión sobre la pista o a punto de cruzar una de sus cabeceras?
   *
   * **Se mide sobre el rectángulo de la pista, no contra un umbral.** El
   * primer intento usaba `distanceToRunway`, que apunta a la cabecera **de
   * salida**; en Silvio Pettirossi se despega por la 02 y se aterriza por
   * donde toque, así que llegando por la otra punta la distancia daba tres
   * kilómetros y el juego se creía en mitad del campo — con el avión a ocho
   * metros sobre el umbral. Un rectángulo no tiene ese problema: se está
   * dentro o no se está, se venga por donde se venga.
   */
  private sobreLaPista(): boolean {
    const r = this.scenario.runway;
    const { along, across } = enEjesDePista(
      this.flight.state.position.x,
      this.flight.state.position.z,
      r.x,
      r.z,
      r.heading,
    );
    return (
      Math.abs(across) < r.width / 2 + A_UN_LADO_DEL_EJE &&
      Math.abs(along) < r.length / 2 + ANTES_DEL_UMBRAL
    );
  }

  private distanceToRunway(): number {
    const [tx, tz] = this.enLaPista(this.scenario.runway.length * 0.5);
    return Math.hypot(
      tx - this.flight.state.position.x,
      tz - this.flight.state.position.z,
    );
  }

  /**
   * La asistencia de dirección en tierra.
   *
   * Es el *Smart Steering* que Nintendo puso en Mario Kart para los niños que
   * no consiguen mantenerse en la pista, y aquí encaja en la escalera que ya
   * gobierna el juego: **lo que cambia de un peldaño al siguiente no es el
   * mundo ni el avión, es cuánta física se te confía**. La dirección en tierra
   * es física.
   *
   * Dos reglas hacen que no se sienta como que el juego pilota por ti:
   *
   * - **Quien va por la raya no nota nada**, porque no hay nada que corregir.
   * - **Quien está girando manda.** Si hay mando puesto, la ayuda se aparta en
   *   la misma medida. Sin esto, intentar salirse de la calle a propósito —que
   *   es una cosa que un niño va a hacer— se sentiría como pelear contra el
   *   juego, y eso es exactamente lo contrario de lo que se quiere enseñar.
   */
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
   */
  private limitarElRodaje(): void {
    if (this.tier.assists.taxiAssist < CONDUCE_EL_JUEGO) return;
    const s = this.flight.state;
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
    if (!s.onGround) return;

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
    const enLaCarrera = this.vistaActual?.fase === "aterrizado";
    if (s.onRunway && !enLaCarrera) return;

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
      this.techoDeLaCarrera = Math.min(
        this.techoDeLaCarrera,
        Math.max(rodaje.velocidad, s.airspeed),
      );
    } else {
      this.techoDeLaCarrera = Infinity;
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
    const vista = this.vistaActual;
    if (!vista || vista.luzVerde) return;
    if (!enLaCarrera && !RODANDO_DE_VERDAD.has(vista.fase)) return;
    const c = this.input.controls;

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
      c.throttle = Math.min(
        c.throttle,
        this.flight.gasParaRodar(this.techoDeLaCarrera),
      );
      return;
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
    c.throttle = Math.min(c.throttle, this.flight.gasParaRodar(tope.velocidad));
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
  }

  private asistirRodaje(dt: number): void {
    void dt;
    const fuerza = this.tier.assists.taxiAssist;
    if (!this.plan || fuerza <= 0) return;
    const s = this.flight.state;
    if (!s.onGround) return;

    const suelo =
      s.position.y - this.terrain.sampleHeight(s.position.x, s.position.z);
    /*
     * **Cuánto anticipa la ayuda sale del peldaño, y no es lo mismo que su
     * fuerza.**
     *
     * `taxiAssist` dice cuánto se aplica; esto dice de qué clase es. Guyrami
     * conduce —a los cuatro años nadie hila dos kilómetros de calle de
     * rodaje—, Tukã ayuda un poco en las curvas, y de Taguató para arriba la
     * ayuda solo evita que te salgas: la curva es tuya. Sale de la misma
     * escalera para no añadir otro mando que se pueda desafinar por su cuenta.
     */
    const anticipa = Math.max(0, (fuerza - 0.5) * 2);
    const sugerido = this.plan.asistencia(s, suelo, anticipa);
    if (sugerido === 0) return;

    const c = this.input.controls;
    const mando = Math.abs(c.aileron);
    const peso = fuerza * (1 - Math.min(1, mando * 1.6));
    c.aileron = Math.max(-1, Math.min(1, c.aileron + sugerido * peso));
  }

  /**
   * Un fotograma del vuelo completo.
   *
   * Solo se anuncia **al cambiar de fase**, no cada fotograma: un cartel que se
   * repite sesenta veces por segundo no se lee, parpadea. Lo único que sí se
   * repite es el aviso de haberse salido de la raya, y con cuentagotas.
   */
  private avanzarPlan(dt: number): void {
    if (!this.plan) return;
    const suelo =
      this.flight.state.position.y -
      this.terrain.sampleHeight(
        this.flight.state.position.x,
        this.flight.state.position.z,
      );
    const vista = this.plan.paso(
      this.flight.state,
      suelo,
      this.input.controls.engineOn,
      dt,
    );
    this.vistaActual = vista;

    /*
     * **Una orden que espera a que hagas algo no puede perderse por el camino.**
     *
     * Las tarjetas de esas fases se ponen con `Infinity` justamente para eso,
     * pero eso solo las protege de su propio reloj: cualquier aviso de paso
     * —un aro, un edificio, el señalero— las tapa, dura sus dos segundos y al
     * apagarse deja la pantalla **en blanco**, con la orden perdida hasta el
     * siguiente cambio de fase, que puede no llegar nunca.
     *
     * Se vio en el peor sitio posible: la primera pantalla de una lección de
     * despegue, sin la llave y sin nada. Así que si la señal está apagada y la
     * fase de ahora es de las que esperan, se vuelve a anunciar. No hace falta
     * saber quién se la llevó.
     */
    if (!this.hud.senal.visible && SE_QUEDAN.has(vista.fase)) {
      this.faseAnunciada = "";
    }

    // La lámpara de la torre solo tiene sentido en tierra y antes de despegar:
    // es lo que se mira desde el punto de espera. En el aire no hay lámpara que
    // mirar, y dejarla encendida decía algo que ya no era verdad.
    const enTierraEsperando =
      this.leccion.torre &&
      (vista.fase === "esperando" ||
        vista.fase === "autorizado" ||
        vista.fase === "alineando");
    this.hud.setLuzDeTorre(
      !enTierraEsperando
        ? null
        : vista.fase === "esperando"
          ? "roja"
          : vista.luzVerde
            ? "verde"
            : null,
    );

    // Mientras manda el plan, el tutor calla. Vuelve al alinearse, que es
    // cuando toca despegar y el tutor sí sabe de eso.
    const rodaje =
      vista.fase === "estacionado" ||
      vista.fase === "arrancando" ||
      vista.fase === "rodando" ||
      vista.fase === "esperando" ||
      vista.fase === "autorizado" ||
      vista.fase === "abandonando" ||
      vista.fase === "a-plataforma" ||
      vista.fase === "en-puesto" ||
      vista.fase === "apagado";
    this.hud.tutor.silenciar(rodaje);

    // **En el peldaño de los pequeños, ni una palabra.** No leen, así que un
    // cartel de texto es un cartel en blanco que además tapa el mundo. Ahí
    // manda la luz de la torre y la raya verde del suelo, que se entienden sin
    // saber leer; el instructor de voz vendrá a llenar este hueco.
    const conLetras = this.tier.instruments !== "none";

    if (vista.fase !== this.faseAnunciada) {
      const antes = this.faseAnunciada;
      this.faseAnunciada = vista.fase;
      /*
       * **Dejar la pista libre es una victoria, y hay que decirlo.**
       *
       * Es el momento que enseña por qué había prisa: hasta ahí el juego pide
       * salir «que viene otro», y en cuanto se sale no pasaba nada — el aviso
       * cambiaba a «volvé a tu lugar» como si tal cosa. Sin premio, la prisa
       * no se entiende: parece una manía del juego y no una regla del sitio.
       *
       * Y es la mitad de la diferencia que faltaba entre los dos rodajes: «no
       * es lo mismo rodar porque vas a despegar que rodar porque aterrizaste».
       * Al ir, la lección es la doble raya y esperar el verde; al volver, es
       * dejar la pista libre y meter el avión en su hueco.
       */
      if (
        antes === "abandonando" &&
        (vista.fase === "a-plataforma" || vista.fase === "en-puesto")
      ) {
        this.audio.cue("success");
        if (conLetras) this.hud.flash(t("vuelo.pistaLibre"), 3.2);
      }
      // Al lado del mensaje va **la tecla**, cuando la fase pide una. «Arrancá
      // el motor» no le sirve de nada a quien no sabe cuál es el motor.
      const tecla =
        vista.fase === "estacionado" || vista.fase === "en-puesto"
          ? ` · ${nombreDeTecla(this.input.preferredKey("engine"))}`
          : vista.fase === "esperando" || vista.fase === "aterrizado"
            ? ` · ${nombreDeTecla(this.input.preferredKey("brakes"))}`
            : "";
      /*
       * **En la lección de aterrizar, volar no es el premio: es el camino.**
       *
       * La fase «en vuelo» dice «andá a dar una vuelta», que es lo que toca
       * cuando se acaba de despegar y el mundo es tuyo. Pero quien eligió
       * aprender a aterrizar aparece ya volando y a tres kilómetros de la
       * cabecera: decirle que se dé una vuelta es mandarlo al sitio contrario.
       */
      const clave =
        this.leccion.id === "aterrizaje" && vista.fase === "en-vuelo"
          ? "vuelo.enVueloAterrizando"
          : vista.clave;
      const frase = t(clave as never);

      // **Tres caminos para lo mismo, y el dibujo es el que nunca falta.** La
      // voz no la oye quien juega en silencio ni quien no oye; el texto no lo
      // lee quien tiene cuatro años. El dibujo lo entiende todo el mundo.
      //
      // Y hay fases que **esperan a que alguien haga algo** —arrancar el
      // motor, apagarlo, esperar la luz—. Esas no pueden desaparecer solas: la
      // primera persona que lo jugó se quedó mirando un avión parado en Silvio
      // Pettirossi porque la llave salió, se apagó a los seis segundos, y ya no
      // había forma de enterarse de qué hacía falta.
      /*
       * **La letra de la calle solo cuando la calle importa.**
       *
       * Se pegaba a todos los mensajes: parado en el puesto con el motor
       * apagado salía «arrancá el motor · R», y en el punto de espera «frená ·
       * R». La R es un dato de por dónde se rueda, y quien está parado no rueda
       * por ninguna parte — ahí es una letra suelta que no significa nada, y
       * ya costó una vez enterarse de qué era.
       *
       * Se enseña en las fases en las que uno va por una calle y le sirve
       * saber cuál: yendo a la pista, saliendo de ella y volviendo a casa.
       */
      const rodando =
        vista.fase === "rodando" ||
        vista.fase === "abandonando" ||
        vista.fase === "a-plataforma";
      const letra = rodando ? vista.letra : null;

      const pendiente =
        vista.fase === "estacionado" || vista.fase === "en-puesto";
      const esperando = vista.fase === "esperando";
      /*
       * **La carrera de aterrizaje también espera a que alguien haga algo.**
       *
       * «Frená» y «Salí de la pista» duraban seis segundos y luego la pantalla
       * se quedaba vacía hasta que cambiara la fase. Pero esas dos fases duran
       * lo que tarde quien juega en frenar y en encontrar la salida —que puede
       * ser un minuto largo—, así que el aviso desaparecía justo cuando hacía
       * falta: «en pista, ya aterrizado, nadie me indica por dónde abandonar la
       * pista para ir al hangar».
       *
       * Es el mismo fallo que ya tuvo la llave de contacto, y se arregla igual:
       * lo que está pendiente de que alguien haga algo **no puede apagarse
       * solo**. La diferencia con `pendiente` es que aquí no hay tecla que
       * pulsar ni tarjeta que tocar; solo hay que seguir viéndolo.
       */
      const seQueda = SE_QUEDAN.has(vista.fase);
      this.hud.senal.mostrar(vista.icono, conLetras ? frase : "", letra, {
        segundos:
          pendiente || esperando || seQueda
            ? Infinity
            : vista.fase === "apagado"
              ? 9
              : 6,
        // La tecla, dibujada. Sin esto, en el peldaño sin palabras no había
        // ninguna manera de saber que el contacto es la I.
        tecla: pendiente
          ? nombreDeTecla(this.input.preferredKey("engine"))
          : esperando
            ? nombreDeTecla(this.input.preferredKey("brakes"))
            : null,
        // Y la tarjeta **hace** lo que dice al tocarla. En una tablet no había
        // ninguna forma de arrancar el motor: los mandos táctiles son palanca,
        // timón, gas y freno, y el contacto no estaba por ningún lado.
        accion: pendiente ? () => this.toggleEngine() : null,
      });
      this.instructor.decir(frase);
      if (conLetras) {
        this.hud.flash(`${frase}${tecla}${letra ? ` · ${letra}` : ""}`, 5);
      }
      if (vista.fase === "autorizado" || vista.fase === "apagado")
        this.audio.cue("success");
      // Y apagar el motor en el suelo **termina el vuelo**: es el momento de
      // decir qué te llevás. Ver `terminarElVuelo`.
      if (vista.fase === "apagado") this.terminarElVuelo();
    } else if (vista.rapido && this.plan.avisarDeSalida(dt)) {
      // **«¿Quién me indica si voy muy rápido o lento en rodadura?»** Nadie, y
      // esa era la respuesta honesta: el indicador de tortuga y pájaro está
      // calibrado para velocidad de vuelo, así que rodando se queda clavado en
      // la tortuga sin decir nada. Ahora lo dice la raya —que se pone ámbar y
      // roja donde hay que aflojar— y además se avisa.
      this.hud.senal.mostrar(
        "freno",
        conLetras ? t("vuelo.despacio") : "",
        vista.letra,
        {
          segundos: 3.5,
        },
      );
      this.instructor.decir(t("vuelo.despacio"));
    } else if (vista.fuera && this.plan.avisarDeSalida(dt)) {
      this.hud.senal.mostrar(
        "amarillo",
        conLetras ? t("vuelo.fuera") : "",
        vista.letra,
        {
          segundos: 4,
        },
      );
      this.instructor.decir(t("vuelo.fuera"));
      if (conLetras) this.hud.flash(t("vuelo.fuera"), 3);
    }

    /*
     * **Frená.** Y no como tarjeta de fase, sino mientras haga falta.
     *
     * Se grabó un aterrizaje entero y al tocar tierra **no salió ninguna
     * tarjeta**: ni «frená» ni nada, hasta la de salir por E4 quince segundos
     * después. La tarjeta de la fase «aterrizado» existe y está bien escrita,
     * pero depende de que la fase **cambie** y de que se vea el cambio; con
     * una toma larga y suave la fase pasa por ahí de refilón y la tarjeta se
     * la lleva la siguiente. Resultado: tres kilómetros y medio de pista
     * consumidos sin que nadie dijera nada, y el avión fuera por el final.
     *
     * Así que esto no cuelga de un cambio de fase: cuelga de **la condición**.
     * Mientras se corra por el suelo después de haber volado, la tarjeta del
     * freno está puesta, con su tecla dibujada, y no se va sola. Cuando se baja
     * a velocidad de rodaje se borra la fase anunciada, y con eso la tarjeta
     * que tocara vuelve sola por el camino de siempre.
     */
    /*
     * **Y quien dice que se está en el suelo es la fase, no `onGround`.**
     *
     * Se puso `onGround` de más y con eso la tarjeta no salía: en la toma, el
     * contacto parpadea —las ruedas botan, el suelo se pierde por veinte
     * centímetros— y el aviso se caía justo en los segundos en los que hace
     * falta. La máquina de fases ya resolvió eso midiendo la altura sobre el
     * terreno, y «aterrizado» y «abandonando» **significan** estar en el suelo
     * después de haber volado. Preguntarlo dos veces era discutirle a quien
     * sabe. Es el mismo fallo que ya tuvo el aviso de terreno en la pista.
     */
    const corriendo =
      (vista.fase === "aterrizado" || vista.fase === "abandonando") &&
      this.flight.state.airspeed > RODAJE_DE_VERDAD;
    if (corriendo !== this.pidiendoFreno) {
      this.pidiendoFreno = corriendo;
      if (corriendo) {
        this.hud.senal.mostrar(
          "freno",
          conLetras ? t("vuelo.aterrizado") : "",
          null,
          {
            segundos: Infinity,
            tecla: nombreDeTecla(this.input.preferredKey("brakes")),
          },
        );
        this.audio.cue("attention");
        this.instructor.decir(t("vuelo.aterrizado"));
      } else {
        // Que la fase vuelva a anunciarse sola en el próximo fotograma.
        this.faseAnunciada = "";
      }
    }

    if (vista.saltoLaLuz) {
      // El sonido sí, siempre: es la mitad del aviso que no necesita leerse.
      this.audio.cue("attention");
      this.hud.senal.mostrar(
        "mano",
        conLetras ? t("vuelo.sinPermiso") : "",
        null,
        { segundos: 7 },
      );
      this.instructor.decir(t("vuelo.sinPermiso"));
      if (conLetras) this.hud.flash(t("vuelo.sinPermiso"), 7);
    }
  }

  private updateHomeIndicator(): void {
    const [thresholdX, thresholdZ] = this.enLaPista(
      this.scenario.runway.length * 0.5,
    );

    // Con misión en curso, la aguja señala el objetivo; sin ella, la pista.
    // Es la misma aguja: no hay dos cosas que aprender.
    const objective = this.missions.current;
    const target = objective ? objectiveTarget(objective) : null;
    const dx = (target?.x ?? thresholdX) - this.flight.state.position.x;
    const dz = (target?.z ?? thresholdZ) - this.flight.state.position.z;
    const bearing = Math.atan2(dx, -dz);

    let relative = bearing - this.flight.state.heading;
    while (relative > Math.PI) relative -= Math.PI * 2;
    while (relative < -Math.PI) relative += Math.PI * 2;

    this.hud.setHome(relative, Math.hypot(dx, dz), target !== null);
  }

  private syncAircraftMesh(dt: number): void {
    const state = this.flight.state;
    this.aircraftMesh.group.position.copy(state.position);
    this.aircraftMesh.group.quaternion.copy(state.orientation);

    // La hélice gira con el motor. No se intenta reproducir las rpm reales:
    // se busca que se vea girar y que el ritmo suba al acelerar.
    this.propellerAngle += dt * (6 + this.input.controls.throttle * 96);
    this.aircraftMesh.propeller.rotation.z = this.propellerAngle;

    this.updateBlobShadow(state);
  }

  /**
   * Mancha de sombra bajo el avión.
   *
   * No hay sombras proyectadas —cuestan fotogramas en una tablet— y sin
   * ninguna referencia en el suelo es imposible juzgar a qué altura se está
   * en la rotación y en la toma. Un círculo degradado que crece y se
   * desvanece con la altura resuelve casi todo eso por un plano.
   */
  private updateBlobShadow(state: FlightState): void {
    const ground = this.terrain.sampleSurface(
      state.position.x,
      state.position.z,
    );
    const height = Math.max(0, state.position.y - ground);
    // Se ve hasta cuatrocientos metros. Antes se apagaba a doscientos veinte
    // y desaparecía justo cuando empezaba a ser útil como referencia de que
    // se está ganando altura.
    const fade = Math.max(0, 1 - height / 400);

    this.blobShadow.visible = fade > 0.02;
    if (!this.blobShadow.visible) return;

    this.blobShadow.position.set(
      state.position.x,
      ground + 0.4,
      state.position.z,
    );
    this.blobShadow.rotation.y = -state.heading;
    const spread = 1 + height / 110;
    this.blobShadow.scale.set(spread, 1, spread);
    (this.blobShadow.material as MeshBasicMaterial).opacity = fade * fade * 0.5;
  }

  private updateCamera(dt: number): void {
    const state = this.flight.state;

    // Aceleración longitudinal, filtrada. Sin filtrar salta con cada subpaso
    // del modelo y la cámara temblaría.
    const rawSurge = dt > 0 ? (state.airspeed - this.lastAirspeed) / dt : 0;
    this.lastAirspeed = state.airspeed;
    this.surge += (Math.min(rawSurge, 6) - this.surge) * Math.min(1, dt * 4);

    // El avión, escondido solo en la vista de pájaro. Va aquí y no al cambiar
    // de vista para que valga también cuando el modelo se carga o se cambia.
    this.aircraftMesh.group.visible = this.cameraMode !== "pajaro";

    if (this.cameraMode === "cockpit" || this.cameraMode === "pajaro") {
      // Desde dentro no hay suavizado: la cámara es la cabeza del piloto y
      // va rígidamente unida al avión.
      //
      // Y si la aeronave es un modelo de verdad, el sitio lo dice él: sus
      // asientos. La fórmula sobre la cuerda del ala es para las cajas, donde
      // no hay cabina y da igual dónde te pongas.
      const ojo = this.aircraftMesh.ojo;
      if (ojo) this.offset.set(ojo.x, ojo.y, ojo.z);
      else
        this.offset.set(
          0,
          this.aircraft.chord * 0.55,
          -this.aircraft.chord * 0.4,
        );
      this.offset.applyQuaternion(state.orientation);
      this.camera.position.copy(state.position).add(this.offset);
      this.camera.quaternion.copy(state.orientation);
      return;
    }

    if (this.cameraMode === "wing") {
      this.offset.set(
        this.aircraft.wingSpan * 0.9,
        this.aircraft.chord * 1.4,
        this.aircraft.wingSpan * 0.5,
      );
    } else {
      // Más alta y algo más atrás que en la primera versión: estaba a la
      // altura del avión y el fuselaje tapaba justo el centro de la pantalla,
      // que es donde uno quiere mirar para saber adónde va.
      this.offset.set(
        0,
        this.aircraft.wingSpan * 0.52,
        this.aircraft.wingSpan * 1.5,
      );
    }
    // Retroceso por aceleración: la cámara se queda un poco atrás cuando el
    // avión empuja y vuelve a su sitio al estabilizarse. Es el mismo truco
    // que usa cualquier juego de coches y es lo que hace que se *sienta* la
    // aceleración en vez de solo verla en el marcador.
    this.offset.z += ACCELERATION_LAG * Math.max(0, this.surge);
    this.offset.applyQuaternion(state.orientation);
    this.desiredCamera.copy(state.position).add(this.offset);
    this.applyGroundShake(state, dt);

    // Nunca por debajo del terreno: en un vuelo rasante la cámara de
    // persecución se metería dentro de la loma de atrás.
    const floor =
      this.terrain.sampleSurface(this.desiredCamera.x, this.desiredCamera.z) +
      3;
    if (this.desiredCamera.y < floor) this.desiredCamera.y = floor;

    // Suavizado exponencial independiente de la tasa de fotogramas: sin el
    // `1 - exp`, la cámara iría distinta a 30 y a 120 fps.
    const smoothing = 1 - Math.exp(-dt * 7);
    this.camera.position.lerp(this.desiredCamera, smoothing);

    this.lookTarget.copy(state.position).addScaledVector(state.velocity, 0.35);
    this.camera.lookAt(this.lookTarget);
    this.updateFieldOfView(state, dt);
  }

  /**
   * Traqueteo de la carrera por pista, y su corte al despegar.
   *
   * La velocidad no se ve: se deduce de lo que pasa cerca y de lo que sacude.
   * Con el avión rodando, la cámara vibra con una amplitud proporcional a la
   * velocidad en el suelo, con baches sueltos encima para que sea traqueteo y
   * no un zumbido.
   *
   * Y lo que de verdad vende el despegue es lo contrario: **el corte**. En
   * cuanto las ruedas dejan el suelo la vibración se apaga en dos décimas, y
   * ese silencio repentino es el momento. No hace falta adornarlo más.
   */
  private applyGroundShake(state: FlightState, dt: number): void {
    if (this.reducedMotion) return;

    // Sube con el cuadrado de la velocidad hasta la de rotación: así el
    // traqueteo crece de verdad durante toda la carrera en vez de saturarse a
    // media pista, que era lo que hacía que después de arrancar pareciera que
    // ya no se aceleraba más.
    const roll = Math.min(1, state.airspeed / SHAKE_REFERENCE);
    const target = state.onGround ? roll * roll : 0;
    // Sube deprisa y se apaga en SHAKE_FADE segundos.
    const rate = target > this.shake ? dt * 6 : dt / SHAKE_FADE;
    this.shake += Math.max(-rate, Math.min(rate, target - this.shake));
    if (this.shake < 0.002) return;

    this.shakeClock += dt;
    const t = this.shakeClock;
    // Tres senos que no comparten periodo: se lee como suelo irregular y no
    // como una oscilación. Y un cuarto término lento hace los baches.
    const bump = Math.pow(Math.max(0, Math.sin(t * 5.3)), 8);
    const amount = SHAKE_AMPLITUDE * this.shake;
    this.desiredCamera.y +=
      amount * (Math.sin(t * 41) * 0.5 + Math.sin(t * 17.3) * 0.3 + bump * 1.4);
    this.desiredCamera.x += amount * Math.sin(t * 23.7) * 0.35;
  }

  /**
   * Campo de visión atado a la velocidad.
   *
   * Abrir el ángulo estira la periferia y da sensación de ir más rápido, que
   * es el truco más barato que existe. No pasa de setenta y un grados: más
   * distorsiona y marea. En vista de cabina no se toca, y con movimiento
   * reducido se queda fijo.
   */
  private updateFieldOfView(state: FlightState, dt: number): void {
    const wanted =
      this.reducedMotion || this.cameraMode === "cockpit"
        ? BASE_FOV
        : BASE_FOV + FOV_STRETCH * Math.min(1, state.airspeed / FOV_REFERENCE);

    const smoothing = 1 - Math.exp(-dt * 2.5);
    const next = this.camera.fov + (wanted - this.camera.fov) * smoothing;
    if (Math.abs(next - this.camera.fov) < 0.01) return;
    this.camera.fov = next;
    this.camera.updateProjectionMatrix();
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  private cycleCamera(): void {
    const index = CAMERA_MODES.indexOf(this.cameraMode);
    this.cameraMode =
      CAMERA_MODES[(index + 1) % CAMERA_MODES.length] ?? "chase";
  }

  /**
   * Construye el motor de vuelo que le toca a un tramo.
   *
   * El primer peldaño usa un modelo cinemático distinto, no el de
   * coeficientes con más ayudas. Ver `src/flight/tiers.ts` y
   * `src/flight/arcade.ts`.
   */
  private buildFlightModel(tier: Tier): FlightModel {
    // El avión flota sobre el agua en vez de hundirse: es un juego para
    // chicos, y amerizar de morro y desaparecer no le divierte a nadie.
    const ground = (x: number, z: number): number =>
      this.terrain.sampleSurface(x, z);
    return tier.model === "simple"
      ? new ArcadeFlightModel({ aircraft: this.aircraft, ground })
      : new CoefficientFlightModel({
          aircraft: this.aircraft,
          ground,
          assist: tier.assists,
        });
  }

  /**
   * Cambia de aeronave.
   *
   * Hasta ahora la flota existía en el código y no había forma de llegar a
   * ella: se volaba siempre la misma avioneta. Se cambia en tierra o en el
   * aire, y el avión nuevo aparece donde estaba el anterior.
   */
  private cycleAircraft(): void {
    const next =
      AIRCRAFT[(AIRCRAFT.indexOf(this.aircraft) + 1) % AIRCRAFT.length] ??
      OGA_172;
    const { position, heading, airspeed } = this.flight.state;
    const carried = { position: position.clone(), heading, airspeed };

    this.aircraft = next;
    this.audio.setEngine(next.sound);

    this.scene.remove(this.aircraftMesh.group);
    this.aircraftMesh = createAircraftMesh(next);
    /*
     * Y se vuelve a buscar el modelo, que si no se pierde para siempre.
     *
     * Cargarlo solo al arrancar la partida dejaba un agujero: cambiar de
     * aeronave montaba las cajas y ya no volvía a mirar, así que quien tocara
     * la tecla se quedaba con los cubos hasta recargar. Se encontró sin
     * buscarlo — «sin querer pulsé una tecla y me aparecieron las avionetas de
     * cubos, pero ya solo podía elegir entre esas dos».
     */
    void this.ponerModeloSiLoHay();
    this.scene.add(this.aircraftMesh.group);

    this.flight = this.buildFlightModel(this.tier);
    this.flight.reset(carried);

    this.updateBadge();
    this.hud.flash(`${next.name} — ${t(next.descriptionKey as never)}`, 3.5);
  }

  /**
   * Sube o baja un peldaño de la escalera de dificultad.
   *
   * Cambia el motor de vuelo si hace falta, las unidades y los instrumentos.
   * El avión se queda donde estaba: se cambia de tramo en el aire sin que se
   * caiga nada.
   */
  private cycleTier(): void {
    const next =
      TIERS[(TIERS.indexOf(this.tier) + 1) % TIERS.length] ?? GUYRAMI;
    const { position, heading, airspeed } = this.flight.state;
    const carried = { position: position.clone(), heading, airspeed };

    this.tier = next;
    rememberTier(next);
    this.flight = this.buildFlightModel(next);
    this.flight.reset(carried);

    this.hud.setUnits(next.units);
    this.hud.setInstruments(next.instruments);
    this.keyScreen?.setSimple(
      next.instruments === "none" || next.instruments === "pictorial",
    );
    this.updateBadge();
    /*
     * El nombre del peldaño, y **no la edad**.
     *
     * `tiers.ts` lo dice con todas las letras —«guía de edad, para quien
     * programa; nunca se muestra al jugar»— y el hangar lo respeta. Aquí se
     * enseñaba «Taguato · 10-13» a quien acababa de subir, que es la manera
     * más rápida de decirle a alguien de nueve años que se ha equivocado de
     * sitio.
     */
    this.hud.flash(next.name, 3);
  }

  /**
   * Convierte cambios de estado en sonido.
   *
   * Se hace comparando con el fotograma anterior y no dentro del modelo de
   * vuelo a propósito: el FDM no sabe que existe el audio y no tiene por qué
   * saberlo. Cuando entre el bus de eventos, esto se suscribirá a él y esta
   * función desaparecerá.
   */
  private announce(state: FlightState): void {
    if (state.onGround && !this.wasOnGround) {
      // Toque de ruedas. Una toma dura suena distinto de una suave, que es lo
      // que enseña a aterrizar sin necesidad de puntuación ninguna.
      this.audio.cue(state.touchdownSinkRate > 2.5 ? "error" : "touchdown");
    }
    if (!state.onGround && this.wasOnGround && !state.crashed) {
      this.audio.cue("achieved");
    }
    if (state.stalled && !this.wasStalled) this.audio.cue("attention");
    if (state.crashed && !this.wasCrashed) this.audio.cue("error");

    this.wasOnGround = state.onGround;
    this.wasStalled = state.stalled;
    this.wasCrashed = state.crashed;
  }

  /**
   * Pasa a la siguiente misión del escenario, o al vuelo libre.
   *
   * El vuelo libre está en la rueda a propósito y no escondido en un menú:
   * volar sin que nadie te mande nada es una forma legítima de jugar, y para
   * un niño pequeño puede ser la única durante semanas.
   */
  private cycleMission(): void {
    const available = missionsFor(this.scenario.id);
    if (!available.length) return;

    this.missionIndex =
      this.missionIndex + 1 >= available.length ? -1 : this.missionIndex + 1;
    const mission = available[this.missionIndex];

    if (!mission) {
      this.missions.abandon();
      this.hud.setMissionProgress(null);
      this.hud.flash(t("mission.none"), 3);
    } else {
      this.missions.start(mission);
      this.hud.setMissionProgress(this.missions.progress);
      this.hud.flash(t("mission.started", { name: t(mission.nameKey) }), 4);
      this.audio.cue("attention");
    }
    this.updateMissionMarker();
  }

  /** Avanza la misión y celebra lo que se haya cumplido. */
  private advanceMission(): void {
    if (!this.missions.active) return;
    const event = this.missions.update(this.flight.state);
    if (!event.completed) return;

    this.hud.setMissionProgress(this.missions.progress);
    this.updateMissionMarker();

    if (event.finished) {
      this.audio.cue("achieved");
      this.hud.flash(t("mission.done"), 5);
    } else {
      this.audio.cue("success");
      this.hud.flash(t("mission.step"), 2);
    }
  }

  private updateMissionMarker(): void {
    const objective = this.missions.current;
    const target = objective ? objectiveTarget(objective) : null;
    this.missionMarker.moveTo(
      target,
      target ? this.terrain.sampleSurface(target.x, target.z) : 0,
      objective && objective.kind === "reach" ? objective.radius : undefined,
    );
  }

  private toggleSound(): void {
    const level = this.audio.cycleLevel();
    // La voz obedece al mismo botón que el resto del sonido. Quien pone el
    // juego en mudo lo pone en mudo entero, y una voz que sigue hablando con
    // el altavoz tachado es exactamente lo que nadie espera.
    permitirVoz(level.id !== "mudo");
    // Y al instructor se le calla ahora mismo, no en la frase siguiente.
    if (level.id === "mudo") this.instructor.callar();
    this.hud.setSoundLevel(level.glyph, t(`sound.${level.id}` as never));
    this.hud.flash(t(`sound.${level.id}` as never));
  }

  /** Pasa al siguiente idioma y repinta todo lo que lleva texto. */
  private changeLanguage(): void {
    const locale = cycleLocale();
    this.hud.render();
    this.credits = new CreditsScreen(
      this.creditsRoot,
      this.flight.implementationName,
    );

    this.updateBadge();
    this.hud.flash(t("language.changed", { name: LOCALE_NAMES[locale] }));
  }

  private updateBadge(): void {
    this.hud.setBadge(
      `${this.aircraft.name} · ${t(this.scenario.nameKey as never)} · ${this.tier.name}`,
    );
    // Y con la insignia va la escala del pictograma de velocidad, que es de
    // la aeronave y cambia con ella. Ver `Hud.setAeronave`.
    this.hud.setAeronave(
      this.aircraft.approachSpeed,
      // Y el techo del modelo de hoy, que es donde tiene que estar el pájaro.
      this.flight.velocidadMaxima(),
    );
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
}

/**
 * Círculo oscuro y translúcido que hace de sombra. Se orienta con el avión y
 * es un óvalo, no un disco: así insinúa la silueta sin modelar nada.
 */
function createBlobShadow(wingSpan: number): Mesh {
  const geometry = new CircleGeometry(wingSpan * 0.62, 20);
  geometry.rotateX(-Math.PI / 2);
  geometry.scale(1, 1, 0.72);
  const mesh = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: 0xffffff,
      map: radialFade(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  mesh.name = "sombra";
  mesh.renderOrder = 1;
  return mesh;
}

/**
 * Degradado radial generado en un lienzo, para que la sombra se desvanezca
 * por el borde.
 *
 * Con un círculo de color plano la sombra se lee como un charco recortado.
 * Se dibuja al arrancar, ocupa cero bytes en el paquete y no depende de
 * ningún fichero externo.
 */
function radialFade(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(20,32,26,1)");
  gradient.addColorStop(0.55, "rgba(20,32,26,0.72)");
  gradient.addColorStop(1, "rgba(20,32,26,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export type { FlightModel };
