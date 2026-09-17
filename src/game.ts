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
import { AIRCRAFT, PYKASU, type AircraftConfig } from "./flight/aircraft";
import { InputManager } from "./flight/input";
import { claveDeTorre, DICE_LA_TORRE, NOMBRA_LA_PISTA } from "./audio/torre";
import { anticipacionDeRodaje } from "./flight/gobernador";
import {
  matriculaDe,
  pistaEnPiezas,
  rellenoDe,
  sortearIndicativo,
  type Indicativo,
} from "./flight/matricula";
import type { FlightModel, FlightState } from "./flight/model";
import { Terrain, cabeceraEnUso } from "./world/terrain";
import { crearAproximacion, type Aproximacion } from "./world/aproximacion";
import {
  crearCircuito,
  escalaDeCircuito,
  manoDelCircuito,
  type Circuito,
} from "./world/circuito";
import { FLOTA, modeloPorId } from "./flight/flota";
import { crearTrafico, type Trafico } from "./world/trafico";
import { createSky, ponerNubes, updateSky, type SkyRig } from "./world/sky";
import { crearLluvia, type LluviaEnElMundo } from "./world/lluvia";
import type { Lluvia } from "./world/meteo";
import { createAircraftMesh, type AircraftMesh } from "./world/aircraft-mesh";
import { cargarModelo } from "./world/aeronave-modelo";
import {
  enElEmbudoDeFinal,
  ENTRADA_EN_FINAL,
  GLIDE_SLOPE,
  SENDA_DESDE,
  RunwayGuide,
  type PasoDeAro,
} from "./world/runway-guide";
import { createVegetation, zonaDeAeropuerto } from "./world/vegetation";
import { LECCION_POR_DEFECTO, type Leccion } from "./flight/lecciones";
import {
  pedirMetar,
  TIEMPO_DE_CASA,
  vientoComoVector,
  type Meteo,
} from "./world/meteo";

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
import { laConchaLaLleva } from "./ui/panel";
import { Hud, UNIT_SYSTEMS } from "./ui/hud";
import { CreditsScreen } from "./ui/credits";
import { PantallaDelAla } from "./ui/pantalla-ala";
import { PantallaDePausa } from "./ui/pausa";
import { PantallaDeAjustes } from "./ui/pantalla-ajustes";
import { PantallaDeMision } from "./ui/pantalla-mision";
import {
  DESLUMBRE,
  ganarGafas,
  lasGana,
  leerGafas,
  ponerseLasGafas,
  SIN_GAFAS,
  type Gafas,
} from "./flight/gafas";
import {
  ESCALA,
  conMovimientoReducido,
  leerAjustes,
  signoDeCabeceo,
  unidadesElegidas,
  type Ajustes,
} from "./ui/ajustes";
import { Medidor } from "./ui/rendimiento";
import {
  crearLucesDeRodadura,
  type LucesDeRodadura,
} from "./world/luces-de-rodadura";
import {
  CAMERA_MODES,
  construirCamaras,
  type CameraMode,
  type CameraRig,
  type Contexto,
} from "./cameras";
import { nombreDeTecla } from "./flight/keymap";
import {
  elegirInstructor,
  elegirCapitana,
  elegirOtroAvion,
  elegirTorre,
  type Instructor,
} from "./audio/instructor";
import { Frecuencia } from "./flight/radio";
import type { ControlInputs } from "./flight/model";
import {
  delante,
  enEjesDePista,
  puntoDePista,
  rumboHacia,
} from "./world/rumbo";
import { PlanDeVuelo, type Vista } from "./world/plan-de-vuelo";
import { Senalero } from "./world/senalero";
import type { Gesto } from "./flight/senalero";
import { SITIO_PARA_LA_BICI, Sigueme } from "./world/sigueme";
import { Vaca } from "./world/vaca";
import { techoDeLoQueSeConstruye } from "./world/superficie-de-aproximacion";
import { LandingWatcher, type Aterrizaje } from "./flight/aterrizaje";
import { Galones } from "./flight/galones";
import { Frustrada } from "./flight/frustrada";
import { ROCE, type Percance } from "./flight/percance";
import {
  barrasDe,
  grado,
  guardarCuaderno,
  leerCuaderno,
  type Cuaderno,
  type Grado,
} from "./flight/cuaderno";
import { dibujoDePercance } from "./ui/percances";
import { CuadernoScreen } from "./ui/cuaderno";
import { comoSeDiceAqui, hablaDe } from "./i18n/habla";
import { BOCA } from "./audio/boca";
import { claveDeCabina } from "./audio/cabina";
import { SE_QUEDAN, type Fase } from "./flight/vuelo";
import { reconocer } from "./flight/reconocimiento";
import {
  alturaDeEdificio,
  arranqueEnPista,
  paraUnAvion,
} from "./world/aerodrome";
import { KeyScreen } from "./ui/teclas";
import { LOCALE_NAMES, cycleLocale, t, type TranslationKey } from "./i18n";
import { conectarLaRadio } from "./audio/radio";
import { Audio, type Cue } from "./audio/audio";
import { cuadroDe, regimen } from "./ui/cuadro";
import { patasDe, peldanoDe } from "./ui/familia";
import { avisaDelTren } from "./flight/tren";
import type { MandoDeCabina } from "./world/botones-cabina";
import { Megafonia, conPasaje } from "./audio/megafonia";
import { cuantoSeMueve, rachaEn } from "./flight/turbulencia";
import {
  InstructorGrabado,
  nuevoBancoDeVoces,
  type BancoDeVoces,
} from "./audio/instructor-grabado";
import { apuntarVuelo, type Paso } from "./flight/bitacora";
import { plano } from "./ui/hangar";
import { superficieEn, TRAQUETEO, type Superficie } from "./world/superficie";
import { mapaDePavimento, type Pavimento } from "./world/vegetation";
import {
  AvisosDeAltura,
  ESCALONES,
  ESCALONES_EN_PIES,
} from "./flight/avisos-de-altura";
import {
  canalesDe,
  claveDelAviso,
  EN_GRANDE,
  EN_GRANDE_EN_PIES,
} from "./flight/escalera";
import { avisoDeTerreno, fueraDeLaSenda } from "./flight/aviso-de-terreno";
import {
  bandaDeRodaje,
  bandaDeVelocidad,
  type BandaDeVelocidad,
} from "./flight/velocidad-de-aproximacion";
import {
  callar,
  conectarLaMezcla,
  decir,
  permitirVoz,
  ponerVolumenDeVoz,
} from "./audio/voz";
import type { Urgencia } from "./audio/boca";
import { Agenda } from "./flight/agenda";
import { MAX_PASO } from "./flight/fdm";
import { bankAngleOf, pitchAngleOf } from "./ui/actitud";
import { abrirLaVentanaDePruebas } from "./dev/sondas";
import { Reparto } from "./hechos";
import { unaForma } from "./audio/variantes";
import { LaAproximacion } from "./flight/la-aproximacion";
import { asentarAerodromoSobreLaFoto } from "./world/asentar-aerodromo";
import { limitarElRodaje } from "./flight/tope-de-rodaje";
import { leerTexto, ponerTexto } from "./datos/guardado";
import { dibujarReloj, relojDe } from "./ui/reloj";

/** Lo más deprisa que se le deja ir al reloj del juego. Ver `Game.acelerar`. */
const TOPE_DE_ACELERACION = 16;
/**
 * Lo más que puede valer un fotograma, en segundos de vuelo.
 *
 * El tope de arriba cuenta pasos y este cuenta **tiempo**, y hace falta porque
 * lo primero depende de la máquina y lo segundo no. Quien mira el vuelo desde
 * fuera —el banco, o quien juega— solo puede leer el estado una vez por
 * fotograma: si un fotograma vale medio segundo de vuelo, el piloto del banco
 * corrige el rumbo cada medio segundo y ya no está volando como se vuela.
 * Medido: a veinticuatro pasos el rodaje de vuelta salía un catorce por ciento
 * más largo que en tiempo real, que es el banco midiéndose a sí mismo.
 */
const LO_QUE_VALE_UN_CUADRO = 0.3;

/** Dónde se guarda la vista elegida. */
const ALMACEN_VISTA = "vista";

/**
 * La vista con la que se abrió la última vez.
 *
 * Va con el escenario, el peldaño y la lección, que ya se recuerdan: quien
 * vuela desde la cabina quiere volar desde la cabina mañana también, y volver
 * a la de detrás cada vez que se abre el juego es hacerle repetir el mismo
 * clic para siempre.
 */
function vistaRecordada(): CameraMode {
  const guardada = leerTexto(ALMACEN_VISTA);
  return CAMERA_MODES.find((v) => v === guardada) ?? "chase";
}

function recordarVista(vista: CameraMode): void {
  ponerTexto(ALMACEN_VISTA, vista);
}

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

/**
 * Segundos que se espera antes de reiniciar solo tras romper el avión.
 *
 * **Eran 2,2 y volvía solo a la pista sin decir nada**, con el argumento de
 * que esperar sin poder hacer nada es lo más aburrido que hay. Y es verdad,
 * pero lo que había no era esperar: era que el avión se rompía, la pantalla
 * parpadeaba y de repente estabas otra vez en la cabecera sin saber qué había
 * pasado. Ahora sale la pantalla del percance, con su dibujo y su botón, y
 * esto se queda de red: si nadie lo toca en ocho segundos, el juego reinicia
 * solo. A los cuatro años, una pantalla que no se va nunca es una pantalla
 * rota.
 */
const VUELVE_SOLO = 8;

/**
 * Lo que se queda la flecha de tirar, en segundos.
 *
 * Corta a propósito: es una acción de ahora mismo, no un aviso que se
 * consulta. Si sigue ahí cuando el avión ya vuela, deja de significar nada.
 */
const DURA_LA_FLECHA_DE_TIRAR = 2.2;

/**
 * Lo que se queda la tarjeta de mínimos, en segundos.
 *
 * Lo justo para mirar y decidir. Más rato y deja de ser un momento; menos y
 * no da tiempo a levantar la vista de la pista.
 */
const SE_QUEDAN_LOS_MINIMOS = 4;

/** Cada cuántos segundos de vuelo se apunta la hora en el cuaderno. */
const CADA_CUANTO_SE_APUNTA = 30;

/**
 * Cada cuántos segundos se cata por dónde va el avión, para la traza.
 *
 * Dos. Un vuelo de diez minutos son trescientas catas, que la bitácora
 * adelgaza a ciento veinte al guardarlas: más resolución de la que se ve en
 * una raya sobre un plano de doce kilómetros, y suficiente para que una curva
 * de circuito siga pareciendo una curva. Ver `flight/bitacora.ts`.
 */
const CADA_CUANTO_SE_CATA = 2;

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
 * A qué distancia del coche del sígame se considera que se le ha atropellado.
 *
 * Ocho metros de centro a centro. El Pykasu tiene once de envergadura y el
 * coche mide cuatro de largo, así que esto es tocarlo con el tren y no pasarle
 * cerca — que rodando en una plataforma es lo normal.
 */
const ATROPELLO = 8;

/**
 * Cuánto se perdona pasado el final de la pista antes de darlo por salida, m.
 *
 * Cuarenta. Una pista tiene detrás una franja de seguridad, así que rodar unos
 * metros más allá del asfalto no es todavía el incidente; a cuarenta metros ya
 * se está en el campo.
 */
const FINAL_DE_PISTA = 40;

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
 * Cuánto campo hay antes del umbral y después del final, m.
 *
 * Una pista de verdad no acaba donde acaba el asfalto: lleva alrededor una
 * **franja** allanada y despejada, y la norma la manda de sesenta metros por
 * cada punta. Está justamente para esto, para que quien toque un poco corto o
 * un poco largo se lleve un susto y no un accidente.
 *
 * Aquí hacía falta por lo mismo y por algo más: en Yvytu Rape la pista es de
 * hierba **y el campo de al lado también**, así que tocar veinte metros antes
 * del umbral se ve exactamente igual que tocar veinte después, y el juego lo
 * daba por aterrizar en un descampado y terminaba el vuelo. Dentro de la
 * franja se aterrizó en el aeródromo; fuera de ella, en el campo.
 */
const LA_FRANJA = 60;

/**
 * Cuánto se perdona de desvío lateral para seguir «sobre la pista», m.
 *
 * Cuarenta a cada lado del asfalto: quien cruza el umbral un poco descentrado
 * sigue aterrizando, no sobrevolando el campo.
 */
const A_UN_LADO_DEL_EJE = 40;

const RODAJE_DE_VERDAD = 12;

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
/**
 * Lo más deprisa que se puede ir y seguir *alineándose*, m/s.
 *
 * Doce es velocidad de rodaje: por debajo, uno se está poniendo en el eje para
 * despegar; por encima ya está despegando y lo que hace es corregir. Sirve
 * para que el número de la pista salga una vez, al ponerse, y no otra vez a
 * media carrera. Ver donde se usa.
 */
const ALINEANDO_DE_VERDAD = 12;

/**
 * Cuánto tiene que durar la calma para que el aviso de terreno vuelva a sonar.
 *
 * Tres segundos. La cuenta del aviso se apaga en cuanto la vertical es positiva
 * —«subiendo no se avisa»—, así que un avión que cabecea cerca del suelo la
 * cruza varias veces por segundo y el aviso se encendía y apagaba con ella.
 *
 * Tres segundos es bastante menos de lo que tarda en dejar de haber peligro de
 * verdad y bastante más que un cabeceo, que es justo lo que hace falta separar.
 */
const SE_REARMA = 3;

/**
 * A qué altura sobre el suelo se pide meter el tren, en metros.
 *
 * Trescientos: es la altura a la que un despegue deja de poder volver a la
 * pista de la que salió, o sea el momento exacto en el que el tren pasa de ser
 * un seguro a ser un lastre. Ver `atenderAlTren`.
 */
const METE_EL_TREN = 300;

const EN_DESPEGUE: ReadonlySet<Fase> = new Set<Fase>([
  "alineando",
  "despegando",
  "comprometido",
]);

export class Game {
  /** Qué se está enseñando hoy: de aquí sale qué guía se enciende. */
  private readonly leccion: Leccion;
  /** El mundo de verdad, si hay clave y aeródromo. */
  readonly teselas: Teselas | null;
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
  aproximacion: Aproximacion | null = null;
  /**
   * El circuito de tráfico dibujado en el aire, si este peldaño lo dibuja.
   *
   * Se rehace con la aproximación, y por el mismo motivo: los dos cuelgan de
   * **qué cabecera está en uso**, y eso lo decide el viento. Ver
   * `world/circuito.ts`.
   */
  circuito: Circuito | null = null;

  /**
   * El otro avión de la frecuencia, **dibujado**.
   *
   * Lleva tiempo hablando y no estaba: se le oía decir «en final» y la pista
   * seguía vacía, que es la manera más rápida de enseñar que la radio es un
   * adorno. Cada llamada suya lo coloca donde acaba de decir que está, y de
   * ahí sigue volando el circuito. Ver `world/trafico.ts`.
   */
  trafico: Trafico | null = null;
  /**
   * Segundos desde la última vez que se preguntó por los edificios de la foto.
   *
   * Se pregunta cada tres, y se sigue preguntando hasta tener respuesta. No hay
   * plazo: volando, el detalle de la ciudad se afina solo, y la respuesta puede
   * tardar en llegar lo que tarde el jugador en subir.
   */
  /** Cuántos bultos se le quitaron al suelo copiado de la foto. Para mirarlo. */
  bultosQuitados = 0;
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private readonly clock = new Clock();

  readonly terrain: Terrain;
  readonly sky: SkyRig;
  aircraftMesh: AircraftMesh;
  aircraft: AircraftConfig;
  scenario: Scenario;
  flight: FlightModel;
  private tier: Tier = rememberedTier();
  readonly input: InputManager;
  readonly audio = new Audio();
  private readonly missions = new MissionRunner();
  vegetacion: Group | null = null;
  private readonly missionMarker = new MissionMarker();
  /**
   * La senda de aros, que **se rehace si el viento cambia la cabecera**.
   *
   * No es `readonly` por eso: hornea la pista en su geometría al construirse,
   * así que cambiar de cabecera y no rehacerla deja los aros en el extremo
   * contrario. Ver `ponerTiempo` y `rehacerLaSenda`.
   */
  runwayGuide: RunwayGuide;
  /** Índice de la misión de la lista del escenario, o -1 en vuelo libre. */
  private missionIndex = -1;
  /**
   * La cuenta atrás de la toma: *one hundred… fifty, thirty, twenty, ten*.
   *
   * Vive en el juego y no en el HUD porque no es un adorno de pantalla: es lo
   * que enseña el ritmo de la recogida, y se dice **y** se dibuja.
   */
  private readonly avisosDeAltura: AvisosDeAltura;
  /** La altura sobre la pista en grande: 150, 100 y 50. Ver `escalera.ts`. */
  private readonly alturaEnGrande: AvisosDeAltura;
  /** Segundos seguidos fuera de la banda de velocidad. Ver el bucle. */
  private fueraDeBanda = 0;
  /** Qué se dijo la última vez, para no repetirlo mientras siga igual. */
  private dichoDeBanda: "lento" | "rapido" | null = null;
  /** El último aviso de terreno dicho, para no repetirlo cada fotograma. */
  terrenoDicho: "bajo" | "sube" | null = null;
  /**
   * Cuánto lleva el terreno sin avisar de nada, en segundos.
   *
   * El aviso se rearmaba en cuanto la cuenta daba `null` **un solo fotograma**,
   * y esa cuenta se apaga con la vertical: «subiendo no se avisa, que quien
   * sube ya está haciendo lo que había que hacer». Con un avión grande cabeceando
   * cerca del suelo, la vertical cruza el cero una y otra vez, así que el aviso
   * se apaga y se vuelve a encender sin parar. Se oyó jugando, y con estas
   * palabras: «y el "¡Subí! ¡Subí!", qué pesada».
   *
   * No es lo mismo que callarlo: mientras el peligro dura, el aviso sigue
   * puesto y no se repite —eso ya era así—. Esto solo pide que **haya dejado de
   * haber peligro de verdad** antes de volver a poder avisar. Ver `SE_REARMA`.
   */
  private terrenoTranquiloDesde = 0;

  /** La misión elegida en el hangar, hasta que arranca. Ver `start`. */
  private misionInicial: Mission | null;
  readonly hud: Hud;
  /**
   * El medidor de fotogramas, apagado y esperando a F2.
   *
   * No es de desarrollo: va también en lo publicado, porque el aparato que
   * hay que medir es la tableta del aula y no esta máquina. Apagado no
   * formatea nada. Ver `ui/rendimiento.ts` y #33.
   */
  private readonly medidor: Medidor;
  /**
   * El menú de pausa, si el HTML trae su hueco.
   *
   * Opcional como los demás paneles: el juego tiene que arrancar aunque falte.
   */
  private pausa: PantallaDePausa | null = null;
  /** La pantalla de ajustes, que se abre desde la pausa. */
  private ajustesUI: PantallaDeAjustes | null = null;
  /** Qué hay que hacer, si hay misión. Ver `ui/pantalla-mision.ts`. */
  private misionUI: PantallaDeMision | null = null;
  /** Las gafas de sol: si se han ganado y si se llevan. Ver `flight/gafas.ts`. */
  private gafas: Gafas = SIN_GAFAS;
  /**
   * Si lo paró quien juega, y no el navegador.
   *
   * Son dos cosas distintas y hasta hoy solo existía la segunda: el juego se
   * detiene solo al perder el foco —eso es «nadie mira»— y volver a mirar lo
   * arranca otra vez. Una pausa pedida **no la levanta volver a la pestaña**,
   * solo levantarla. Ver `main.ts`.
   */
  private pausadoAdrede = false;
  /**
   * La tarjeta se cayó y hay que volver a ponerla, **sin volver a decir nada**.
   *
   * Una tarjeta de las que se quedan puestas —«esperá la luz», «luz verde,
   * entrá»— la puede tapar cualquier aviso de paso, y al apagarse ese aviso la
   * pantalla se queda en blanco con la orden perdida. Eso ya se arreglaba
   * borrando la fase anunciada para que se volviera a anunciar sola… y con ella
   * volvían **la voz, el rótulo y la campana**, cada vez, para siempre. Medido:
   * treinta y nueve campanas en un minuto de rodaje, y «luz verde, entrá a la
   * pista» una y otra vez.
   *
   * Poner la tarjeta otra vez es una cosa; anunciar una fase nueva es otra.
   */
  private soloLaTarjeta = false;
  /** Lo que ha ido sonando la concha, solo en desarrollo. Para el banco. */
  readonly loQueSonoLaConcha: string[] = [];
  /**
   * Y **todos los avisos sonoros**, con su instante. Solo en desarrollo.
   *
   * Hacía falta y no estaba: se jugó y se oyó «una campana como una alarma todo
   * el rato que estoy en rodadura», y desde fuera no había manera de mirarlo.
   * Las voces sí se podían espiar —el banco cambia el sintetizador por uno de
   * mentira— y los avisos no, porque son osciladores dentro del motor de audio.
   * Con esto, un banco puede contar campanas. Ver `avisar`.
   */
  readonly loQueSono: { que: string; cuando: number }[] = [];
  /** Si hay alguno de los que congelan el vuelo. Lo dice `ui/panel.ts`. */
  private hayPanelAbierto = false;
  /**
   * Si hay un **instrumento** abierto: el plano o el tiempo.
   *
   * Esos no congelan el vuelo —se consultan volando, y con el avión parado un
   * plano deja de decir por dónde vas— pero sí piden que el avión no se caiga
   * mientras se miran. Ver `mantenerElVueloRecto` y `PanelDelVuelo.congela`.
   */
  private hayInstrumentoAbierto = false;
  /** Si el mundo está parado ahora mismo, por lo que sea. Ver `quedarQuieto`. */
  private quieto = false;
  /**
   * Las luces azules de las calles de rodaje, que se encienden con el sol
   * bajo. Se montan con las de aproximación, después de moldear el terreno.
   */
  private rodadura: LucesDeRodadura | null = null;
  private credits: CreditsScreen;
  private readonly creditsRoot: HTMLElement;
  /**
   * El esquema de cómo vuela un ala, si su hueco existe en la página.
   *
   * Opcional a propósito, como la pantalla de teclas: el juego tiene que
   * arrancar aunque falte un `div`. Ver `ui/pantalla-ala.ts`.
   */
  private ala: PantallaDelAla | null = null;
  private keyScreen: KeyScreen | null = null;

  /** Reconoce el aterrizaje y su calidad. Ver `flight/aterrizaje.ts`. */
  readonly landing = new LandingWatcher();
  /** Los galones de este vuelo. Ver `flight/galones.ts`. */
  readonly galones = new Galones();
  /** Reconoce cuándo se renuncia a una aproximación. Ver `flight/frustrada.ts`. */
  private readonly frustrada = new Frustrada();
  /**
   * La base de las nubes sobre el aeródromo, en metros. `null` si despejado.
   *
   * Sale de dos sitios que hasta hoy no se hablaban: los tres botones del
   * panel del tiempo y **el parte de verdad**, que traía `techoM` desde el
   * METAR y no lo usaba nadie. Ahora los dos ponen la misma nube y los dos
   * cuentan para los mínimos. Ver `flight/minimos.ts`.
   */
  techoDeNubes: number | null = null;
  /** El agua que cae, si cae. Ver `world/lluvia.ts`. */
  private lluvia!: LluviaEnElMundo;
  /**
   * La niebla que le toca a este sitio con buen tiempo.
   *
   * Se guarda al arrancar porque la lluvia la espesa y hay que saber a dónde
   * volver: sin esto, poner y quitar lluvia tres veces dejaba el escenario en
   * una sopa permanente. Ver `ponerLluvia`.
   */
  private nieblaDeCasa = 0;
  /** Lo que está cayendo ahora mismo, para las sondas y el sonido. */
  lloviendo: { clase: Lluvia; fuerza: number } = { clase: "nada", fuerza: 0 };
  /** Contra qué se choca además del suelo. Ver `world/obstaculos.ts`. */
  readonly bultos = new Obstaculos();
  /** Dónde estaba el avión antes de este paso, para mirar el camino entero. */
  private readonly antesDelPaso = new Vector3();
  /** Segundos que le quedan al aviso del bulto, para no repetirlo cada paso. */
  avisandoDelBulto = 0;
  /**
   * Lo más rápido que se puede ir ya en esta carrera de aterrizaje, m/s.
   *
   * Un trinquete: baja con el avión y nunca sube. Ver `limitarElRodaje`.
   */
  private techoDeLaCarrera = Infinity;
  /** Si este vuelo ya terminó, para no enseñar el final dos veces. */
  private vueloTerminado = false;
  /**
   * El percance que ha parado este vuelo, si lo hay.
   *
   * Mientras esté puesto, el avión no se mueve: el intento se acabó y lo único
   * que queda por hacer es volver a empezar. Ver `flight/percance.ts`.
   */
  percance: Percance | null = null;
  /**
   * El cuaderno de vuelo: lo que se lleva hecho, entre partidas.
   *
   * Se lee del aparato al empezar y se guarda cada vez que pasa algo digno de
   * apuntarse. Ver `flight/cuaderno.ts`.
   */
  private cuaderno: Cuaderno = leerCuaderno();
  /** La página donde se ve. Solo existe si el HTML trae su hueco. */
  private cuadernoUI: CuadernoScreen | null = null;
  /** El grado que se tenía al empezar, para saber si se ha subido. */
  private gradoAlEmpezar: Grado = grado(leerCuaderno());
  /** Segundos volando desde el último apunte, para no escribir cada fotograma. */
  private sinApuntar = 0;
  /**
   * Por dónde ha ido este vuelo, en coordenadas del fichero del aeródromo.
   *
   * Se cata cada pocos segundos y se guarda con el vuelo: a los cuatro años
   * «lo que acabo de hacer» no es una lista de números, es un dibujo. Ver
   * `flight/bitacora.ts`.
   */
  traza: Paso[] = [];
  /** De qué está hecho el suelo de debajo. Ver `world/superficie.ts`. */
  private superficie: Superficie = "asfalto";
  /**
   * El mapa de calles y plataformas, para saber si debajo hay pavimento.
   *
   * Se pinta una vez y se consulta en cada fotograma, así que se guarda: es la
   * parte cara de la pregunta. El mismo que usa la vegetación para no plantar
   * árboles en el asfalto.
   */
  private readonly pavimento: Pavimento | null;
  /** Lo que se lleva sin catar la traza, s. */
  private sinCatar = 0;
  /** Cuánto ha durado este vuelo, s. Cuenta desde que se arrancó. */
  private duracion = 0;
  /**
   * Lo que hay apuntado para dentro de un rato. Ver `flight/agenda.ts`.
   *
   * Con el reloj del juego y no con el del navegador: lo que se apunta aquí no
   * pasa con el juego parado, y va más deprisa cuando el reloj va más deprisa.
   */
  private readonly agenda = new Agenda();

  /**
   * Lo que ha pasado, contado una vez y oído por quien le importe.
   *
   * Ver `src/hechos.ts`. Hoy lleva un solo hecho —la frustrada— a propósito:
   * es el mecanismo de #30 estrenándose con algo que ya tocaba cuatro sitios,
   * para saber si aguanta antes de mudarle el resto.
   */
  readonly hechos = new Reparto();

  /**
   * Todo lo que se decide viniendo a aterrizar. Ver `flight/la-aproximacion.ts`.
   *
   * Se construye en el constructor, cuando ya existen el terreno y el
   * escenario, y se le da un paso por fotograma. Su estado —si te han mandado
   * al aire, qué dice el PAPI, por qué tramo del circuito vas— se lee desde
   * aquí y **solo se escribe ahí dentro**.
   */
  laAproximacion!: LaAproximacion;
  /**
   * El reloj del juego desde que arrancó la partida, s.
   *
   * No es `duracion`, que se pone a cero en cada vuelo: este no se reinicia
   * nunca. Lo miran los bancos para medir en segundos **de juego** en vez de
   * en segundos de pared, que es la única forma de que lo que midan siga
   * significando lo mismo con el reloj acelerado. Ver `acelerar`.
   */
  relojDelJuego = 0;
  /**
   * Cuántas veces más deprisa va el reloj del juego. Solo en desarrollo.
   *
   * Un vuelo entero son unos ocho minutos de reloj, y el banco que lo vuela
   * entero mide siete escenarios: casi dos horas por barrido, que es tanto
   * como no tenerlo. La física ya va a pasos pequeños por dentro —ver
   * `fdm.step`—, así que multiplicar el paso no la cambia: lo que cambia es
   * cuántos segundos de vuelo caben en un segundo de pared.
   */
  private aceleracion = 1;
  /** Lo que se distaba del umbral el fotograma anterior. Ver los aros. */
  private antesAlUmbral = Infinity;
  /** Lo último que dijo el plan de vuelo, para quien lo necesite después. */
  vistaActual: Vista | null = null;
  /** Si ahora mismo la pantalla está pidiendo freno. Ver `avanzarPlan`. */
  private pidiendoFreno = false;
  /** Si ya se avisó de esta pasada de largo. Ver `atenderAlSenalero`. */
  private avisadoDeLaPasada = false;
  /** Si ya se dijo en esta aproximación que se puede tocar. */
  dichoDeLaToma = false;
  /**
   * Cuántas veces el juego ha decidido decir «ya podés tocar».
   *
   * No es lo mismo que haberlo enseñado, y esa diferencia es justo lo que hubo
   * que medir: el banco veía que la tarjeta no salía nunca en ninguno de los
   * nueve aeropuertos, y con eso solo no se sabe si el juego no lo decide o lo
   * decide y algo se lo tapa. Para el banco.
   */
  vecesQueDijoToca = 0;
  /** El gesto del señalero que se está enseñando en la tarjeta, si hay uno. */
  private gestoEnPantalla: Gesto = null;
  /** El señor de los bastones, esperando en el puesto. Ver `world/senalero.ts`. */
  readonly senalero = new Senalero();
  /**
   * Y quien sale a buscarte, en los dos peldaños de abajo. Ver `world/sigueme.ts`.
   *
   * En un aeropuerto es el coche amarillo del «sígame». En un campo particular
   * no hay coche —«en un aeródromo particular es raro; como mucho que salta
   * Jazlyn en bicicleta a buscarme»—, así que sale ella en bici. Se decide una
   * vez, en el constructor, porque el aeródromo no cambia dentro de un vuelo.
   */
  readonly sigueme: Sigueme;
  /**
   * La vaca que se cruza en la pista, en los campos de hierba.
   *
   * Es la razón número uno por la que se frustra una aproximación en un
   * aeródromo pequeño, y aquí es además la vecina: «las vacas van a pastar
   * pasto aceitoso». Ver `world/vaca.ts`.
   */
  private readonly vaca = new Vaca();
  /**
   * Si la lámpara de la torre la está llevando la torre y no el plan.
   *
   * Son dos dueños para una luz: el plan la enciende en el punto de espera, y
   * la orden de irse al aire la enciende en el aire. El plan corre después en
   * el mismo paso, así que apagaba lo que la torre acababa de encender —y como
   * en el aire nunca es «esperando», la apagaba siempre—. El resultado es que
   * las dos luces existían y no se veían nunca.
   */
  private laTorreMandaEnLaLuz = false;
  /**
   * El vuelo completo: de dónde se sale, por dónde se rueda y qué toca ahora.
   *
   * Solo existe cuando el escenario tiene un aeródromo de verdad con puestos de
   * estacionamiento. En una pista inventada no hay de dónde salir ni a dónde
   * volver, así que se vuela como siempre: alineado en la cabecera.
   */
  plan: PlanDeVuelo | null = null;
  /** Ver `abrirVentanaDePruebas`. Siempre nulo fuera de desarrollo. */
  pilotoDePruebas: ((c: ControlInputs) => void) | null = null;
  /**
   * La voz que dice qué toca.
   *
   * Hoy es la del navegador y suena a robot; mañana serán trozos grabados por
   * una persona. El juego pide «di esto» y no sabe quién contesta, que es lo
   * que permitirá cambiarla sin tocar nada de aquí.
   */
  /**
   * La voz del sistema, que es la suplente y la que oye el otro avión.
   *
   * Va en su propio campo y no dentro del instructor porque hacen falta las
   * dos cosas: el instructor grabado la usa para lo que todavía no está
   * grabado, y `elegirOtroAvion` necesita saber **qué voz del sistema cogió el
   * instructor** para no coger la misma — una radio en la que contesta tu
   * propio instructor no es una radio, es un eco.
   */
  private readonly vozDelSistema: Instructor = elegirInstructor();
  /**
   * Las grabaciones, **una sola bolsa para las cuatro bocas**.
   *
   * El pack de voz trae seis voces —instructora, cabina, torre, torre de
   * Canarias, otro avión y comandante— y se bajaban las seis enteras... para
   * que las consultara **una sola de las cuatro bocas del juego**. La torre, el
   * otro avión y la comandante se construían con `elegirTorre`,
   * `elegirOtroAvion` y `elegirCapitana`, que devuelven la voz sintética del
   * navegador y no preguntan por una grabación en ningún momento. O sea:
   * treinta y tres frases grabadas, horneadas, publicadas y bajadas a cada
   * tablet **para no sonar nunca**.
   *
   * Se vio jugando, y con estas palabras: «que se escuche la torre, que todavía
   * a día de hoy la única voz es la de la instructora… tenemos a Yeray, a
   * Jazlyn, a todos esos, ¿para qué?».
   *
   * Ahora cada boca es un `InstructorGrabado` con **su** suplente del sistema
   * —que es lo que le da su timbre cuando una frase no está grabada— y las
   * cuatro leen de esta bolsa. Se baja una vez.
   */
  private readonly grabaciones: BancoDeVoces = nuevoBancoDeVoces();
  readonly instructor: InstructorGrabado = new InstructorGrabado(
    this.audio,
    this.vozDelSistema,
    BOCA,
    this.grabaciones,
  );
  /**
   * El otro avión de la frecuencia, con su propia voz.
   *
   * Un aeropuerto donde la radio está muerta es un decorado. Ver
   * `flight/radio.ts`, que decide **cuándo** habla, y `audio/instructor.ts`,
   * que le busca una voz que no sea la del instructor.
   */
  /**
   * La torre, con voz propia y por radio.
   *
   * **Hasta hoy la torre no hablaba**: era una lámpara verde o roja con una
   * palabra escrita debajo, arriba en una esquina. Y quien juega tiene cuatro
   * años — «una lámpara con texto no lo lee un niño… un niño (ni yo) leemos
   * esas etiquetitas de arriba ni por asomo». Una orden que solo existe como
   * texto pequeño no existe.
   *
   * Va la primera en la lista de voces cogidas del otro avión porque el orden
   * manda: ver `elegirVoz`.
   */
  private readonly torre: Instructor = new InstructorGrabado(
    this.audio,
    elegirTorre(this.vozDelSistema),
    BOCA,
    this.grabaciones,
  );
  /**
   * La megafonía de cabina, que solo habla en los aviones con pasaje.
   *
   * Va con su propia voz —la comandante Jazlyn— y no comparte timbre con nadie:
   * es la única del juego que le habla a cien personas por un altavoz, y eso se
   * reconoce antes de entender una palabra. Ver `audio/megafonia.ts`.
   */
  private readonly megafonia = new Megafonia();
  private readonly otroAvion: Instructor = new InstructorGrabado(
    this.audio,
    elegirOtroAvion(this.vozDelSistema, this.torre),
    BOCA,
    this.grabaciones,
  );
  /**
   * Y su voz. Es la única del juego que **no** es cercana —le habla a cien
   * personas por un altavoz— y por eso se reconoce sin saber quién es. Con el
   * pack de voz es Jazlyn; sin él, el timbre que quede libre.
   */
  private readonly capitana: Instructor = new InstructorGrabado(
    this.audio,
    elegirCapitana(this.vozDelSistema, this.torre, this.otroAvion),
    BOCA,
    this.grabaciones,
  );
  /**
   * Las cuatro bocas del juego, para poder preguntarles desde fuera.
   *
   * Existe por el fallo que arregló este cableado: la torre, el otro avión y
   * la comandante se construían con voz del navegador y no consultaban una
   * sola grabación, así que el pack sonaba a una voz cuando tiene seis. Sin
   * una manera de preguntarle a cada boca qué va a usar, eso no se ve desde
   * ningún banco. Ver `sondas.ts` y `verificar-voz.mjs`.
   */
  get bocas(): Readonly<Record<string, Instructor>> {
    return {
      instructor: this.instructor,
      torre: this.torre,
      otro: this.otroAvion,
      capitana: this.capitana,
    };
  }

  /** Lo último que dijo la lámpara, para que la torre no se repita. */
  private ultimaLuzDeTorre: string | null = null;
  private readonly radio = new Frecuencia();
  /**
   * Si los aros de la senda están dibujados en el mundo ahora mismo.
   *
   * **Es lo que decide si pueden hablar.** Ver el porqué donde se usa: un aviso
   * que se refiere a algo que quien juega no tiene delante no enseña, confunde.
   */
  private seVenLosAros = false;
  /** La última fase anunciada, para no repetir el aviso cada fotograma. */
  faseAnunciada = "";
  /**
   * Y **el tuyo**, que no se sortea: es el que lleva pintado tu avión.
   *
   * Se pidió así —«al menos una matrícula para cada avión»— y es lo que hace
   * que la radio deje de ser ruido de fondo: cuando la torre dice tu nombre, te
   * está hablando a vos. Ver `flight/matricula.ts`.
   */
  private get miIndicativo(): Indicativo {
    return matriculaDe(this.aircraft.id, this.scenario.aerodrome?.id);
  }

  /**
   * Quiénes están hoy en la frecuencia, aparte de vos.
   *
   * Son varios y cambian: cada uno hace su propio vuelo y cuando lo termina se
   * va y aparece otro con otra matrícula. Lo mira el banco de pruebas, que
   * comprueba que el prefijo es el del país del aeródromo. Ver `sondas.ts` y
   * `flight/radio.ts`.
   */
  get indicativoDeLaRadio(): Indicativo {
    return this.radio.quienes[0] ?? sortearIndicativo(null);
  }

  /** Todas las de la frecuencia, para el banco. */
  get matriculasDeLaRadio(): readonly string[] {
    return this.radio.matriculas;
  }

  /** La matrícula de tu avión, para el banco. Ver `miIndicativo`. */
  get miMatricula(): Indicativo {
    return this.miIndicativo;
  }

  cameraMode: CameraMode = vistaRecordada();
  private propellerAngle = 0;
  /** Estado del avión en el fotograma anterior, para detectar los cambios. */
  private wasOnGround = true;
  /** Si ya se despegó en este vuelo. Ver `announce`. */
  private yaDespego = false;
  private wasStalled = false;
  private wasCrashed = false;
  /**
   * Las cinco vistas, cada una con su estado.
   *
   * Se construyen todas al empezar y no una por pulsación: el traqueteo y el
   * filtro de aceleración son historia acumulada, y rehacerlos haría que
   * cambiar de vista sacudiera la cámara. Ver `src/cameras/`.
   */
  private readonly camaras = construirCamaras();
  /**
   * Lo que las cámaras necesitan saber del juego **sin conocer el juego**.
   *
   * Es un objeto y no cinco argumentos, y se reutiliza en vez de fabricarse
   * cada fotograma: son sesenta objetos por segundo que no hace falta crear
   * ni recoger. Se rellena justo antes de mover la cámara.
   */
  private readonly contextoDeCamara = {
    aircraft: { wingSpan: 0, chord: 0 },
    ojo: null as Contexto["ojo"],
    suelo: (x: number, z: number): number => this.terrain.sampleSurface(x, z),
    movimientoReducido: false,
    traqueteo: 1,
  };
  private readonly blobShadow: Mesh;
  /**
   * Si hay que reducir el movimiento.
   *
   * Sale de los ajustes, que de fábrica dicen «lo que pida el sistema» pero
   * se pueden cambiar: en un aula la tablet es de todos y su preferencia
   * también, y quien se marea no puede tocar el ajuste del aparato de los
   * demás. Ver `ui/ajustes.ts`.
   */
  private reducedMotion = false;
  /** Lo elegido en la pantalla de ajustes. */
  private ajustes: Ajustes = leerAjustes();
  private running = false;
  /** Segundos que lleva el avión roto. Ver `frame`. */

  constructor(options: GameOptions) {
    this.scenario = options.scenario ?? VALLE_CORDILLERA;
    this.sigueme = new Sigueme(this.scenario.aerodrome?.privado === true);
    this.pavimento = this.scenario.aerodrome
      ? mapaDePavimento(this.scenario.aerodrome)
      : null;
    /*
     * Los escalones que canta el radioaltímetro **son los que marca el
     * instrumento**: metros donde la cabina va en metros, pies donde va en
     * pies. Ver `ESCALONES_EN_PIES`.
     */
    this.avisosDeAltura = new AvisosDeAltura(
      this.tier.units === "aeronautical" ? ESCALONES_EN_PIES : ESCALONES,
    );
    /*
     * Y el segundo contador: el de la altura **en grande**, que es otro canal
     * y por eso es otro contador. La cuenta atrás de arriba es la voz —cien,
     * cincuenta, treinta, veinte, diez— y tiene el ritmo apretado que enseña
     * a recoger; esta son tres números sueltos y grandes para empezar a leer
     * una altura. Solo sale de Taguato en adelante. Ver `flight/escalera.ts`.
     */
    this.alturaEnGrande = new AvisosDeAltura(
      this.tier.units === "aeronautical" ? EN_GRANDE_EN_PIES : EN_GRANDE,
    );
    this.leccion = options.leccion ?? LECCION_POR_DEFECTO;
    this.misionInicial = options.mision ?? null;
    this.aircraft = options.aircraft ?? PYKASU;

    /*
     * El dedo sobre la cabina: mirar qué mando hay debajo y pulsarlo al soltar.
     * Ver `mirarLosMandos`, `pulsarElMando` y `world/botones-cabina.ts`.
     */
    const enPantalla = (e: PointerEvent): [number, number] => {
      const r = options.canvas.getBoundingClientRect();
      return [
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -(((e.clientY - r.top) / r.height) * 2 - 1),
      ];
    };
    options.canvas.addEventListener("pointermove", (e) => {
      const [x, y] = enPantalla(e);
      this.mirarLosMandos(x, y);
    });
    options.canvas.addEventListener("pointerup", (e) => {
      const [x, y] = enPantalla(e);
      this.pulsarElMando(x, y);
      this.mirarLosMandos(x, y);
    });
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
     * **La aproximación, con lo que no cambia en todo el vuelo.**
     *
     * Va aquí, justo detrás del terreno, porque necesita el terreno y el
     * escenario ya montados —son lo que mira para decidir— y porque el montaje
     * de los aros y el PAPI, que viene después en este mismo constructor, ya
     * le escribe encima. Lo que cambia —dónde está el avión, en qué fase va,
     * si hay aviso de terreno— se le da en cada paso. Ver
     * `flight/la-aproximacion.ts`.
     */
    this.laAproximacion = new LaAproximacion({
      aircraft: this.aircraft,
      scenario: this.scenario,
      terrain: this.terrain,
      hechos: this.hechos,
      vaca: this.vaca,
      enLaPista: (metros) => this.enLaPista(metros),
      distanceToRunway: () => this.distanceToRunway(),
      // Se pregunta cada vez y no se copia: al cambiar el viento cambia la
      // cabecera, y con ella dónde está el PAPI. Ver `SENDA_DESDE`.
      sendaDesde: () => this.runwayGuide.sendaDesde,
    });

    /*
     * El plan de vuelo, si este aeródromo da para uno.
     *
     * Va aquí, justo detrás del terreno, porque necesita la cota ya aplanada
     * para pintar la ruta a ras de asfalto.
     *
     * **Y se monta siempre, aunque la lección no quiera que se vea.**
     *
     * Estaba atado a `guiaEnTierra`, o sea que en «dar una vuelta» no había
     * plan — y sin plan no hay **fases**, que es otra cosa muy distinta de una
     * raya verde en el suelo. De las fases cuelga medio juego: el aviso de V1 y
     * de Vr, la megafonía de la comandante, la lámpara de la torre y los
     * silencios de la radio. Todo eso se quedaba mudo en esa lección sin que
     * nada fallara, y se oyó jugando: «¿por qué no veo V1 cuando despego con el
     * 747?», «¿por qué no oigo a la comandante?». Las dos cosas eran la misma.
     *
     * Lo que la lección apaga es **el dibujo**: la raya verde, la diana, la
     * doble raya y la gente que te espera. Eso sí es un estorbo para quien solo
     * quiere dar una vuelta: «las señales de aterrizaje en principio no se sabe
     * para qué está eso ahí». Saber en qué fase del vuelo estás no estorba a
     * nadie.
     */
    if (this.scenario.aerodrome) {
      this.plan = new PlanDeVuelo(
        this.scenario.aerodrome,
        this.scenario.runway,
        (x, z) => this.terrain.sampleHeight(x, z),
        this.aircraft,
      );
      this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
    }
    if (this.plan && this.leccion.guiaEnTierra) {
      this.scene.add(this.plan.grupo);
      /*
       * Y con la guía, quien te espera al final de ella.
       *
       * Va atado al dibujo y no al aeródromo porque **sin ruta pintada no hay
       * puesto al que volver**: quien eligió dar una vuelta no tiene a nadie
       * esperándole, y una persona plantada en la plataforma sin motivo es un
       * adorno raro.
       */
      this.scene.add(this.senalero.grupo);
      this.scene.add(this.sigueme.grupo);
      this.scene.add(this.vaca.grupo);
    }

    this.sky = createSky(this.scenario);
    /*
     * **Y la lluvia, que cuelga de la escena y no del cielo.**
     *
     * El cielo es un domo que sigue a la cámara; la lluvia es una caja de
     * gotas que también la sigue pero que **se cruza con el avión**, y mezclar
     * las dos cosas en el mismo grupo dejaría las gotas girando con el domo.
     * Ver `world/lluvia.ts`.
     */
    this.lluvia = crearLluvia();
    this.scene.add(this.lluvia.grupo);
    this.nieblaDeCasa = this.sky.fog.density;
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
    /*
     * **Y los edificios del aeródromo también paran a un avión.**
     *
     * La terminal, la torre y los hangares se dibujan desde hoy —ver
     * `edificios` en `world/aerodrome.ts`— y sin apuntarlos aquí serían
     * decorado: se atravesarían como se atravesaba la ciudad antes de que
     * existiera este índice. Y son los bultos que más importan, porque están
     * justo donde se rueda.
     *
     * Se apunta la caja de cada uno, que para un prisma recto es exacta.
     */
    const aero = this.scenario.aerodrome;
    if (aero) {
      for (const e of aero.buildings) {
        if (e.polygon.length < 3) continue;
        /*
         * **Y una marquesina no es una pared.**
         *
         * `building=roof` en OpenStreetMap es un tejado sobre pilares y nada
         * debajo: las marquesinas de la plataforma, el techo del surtidor, el
         * pasillo cubierto hasta la terminal. No son pocos —Tenerife Sur tiene
         * treinta y nueve y Tenerife Norte siete— y están **justo donde hay
         * que rodar**, porque para eso se ponen: para cubrir donde se aparca.
         *
         * Convertirlas en prismas macizos de cinco metros pone paredes
         * invisibles en la plataforma, y eso se cobró un vuelo de cada cinco
         * en Tenerife Norte: el avión volvía a casa y se estrellaba contra la
         * número 27, un tejado de dieciséis por veintiséis a doscientos ochenta
         * y ocho metros del eje de pista. En la traza salía «percance:
         * edificio» a un metro y medio del suelo, rodando — y buscarlo costó
         * creer que un avión chocaba con algo en pleno final.
         *
         * Se sigue dibujando, que está ahí de verdad; lo que no hace es parar
         * a un avión.
         */
        if (!paraUnAvion(e)) continue;
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (const [px, py] of e.polygon) {
          // Del fichero al mundo: la Y del norte es la Z negativa.
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minZ = Math.min(minZ, -py);
          maxZ = Math.max(maxZ, -py);
        }
        const suelo = this.terrain.sampleHeight(
          (minX + maxX) / 2,
          (minZ + maxZ) / 2,
        );
        this.bultos.anadir(
          (minX + maxX) / 2,
          (minZ + maxZ) / 2,
          (maxX - minX) / 2,
          (maxZ - minZ) / 2,
          suelo,
          suelo + alturaDeEdificio(e),
          /*
           * **Y con su planta, no solo con su caja.**
           *
           * Aquí ponía que la caja «para un prisma recto es exacta», y lo es —
           * si el prisma tiene los lados paralelos a los ejes—. Ninguno de un
           * aeropuerto los tiene: la terminal de Tenerife Norte son veintidós
           * vértices en diagonal y su caja mide **2,2 veces su planta**. Más
           * de la mitad de esa caja es plataforma vacía, y por ahí se rueda.
           */
          e.polygon.map(([px, py]) => [px, -py] as const),
        );
      }
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
      /*
       * **Desde donde están las luces del PAPI**, que es desde donde se cuenta
       * una senda de verdad. Con los aros contados desde el umbral, volar por
       * su centro dejaba al PAPI del mundo marcando cuatro rojas: tres sendas
       * en la misma pantalla y ninguna de acuerdo. Ver `SENDA_DESDE`.
       */
      this.aproximacion?.papiAdentro ?? SENDA_DESDE,
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
    if (this.leccion.id === "aterrizaje") {
      this.scene.add(this.runwayGuide.group);
      this.seVenLosAros = true;
    }

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
    this.medidor = new Medidor(document.body, this.renderer);
    this.hud.setEscalera(this.tier.avisos);
    this.hud.setInstruments(this.tier.instruments);
    this.hud.setMagneticVariation(this.scenario.magneticVariation);
    this.creditsRoot = options.creditsRoot;
    this.credits = new CreditsScreen(
      this.creditsRoot,
      this.flight.implementationName,
    );
    this.montarElAla();

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
      togglePausa: () => this.alternarPausa(),
      toggleEngine: () => this.toggleEngine(),
      toggleCredits: () => this.credits.toggle(),
      cycleAircraft: () => this.cycleAircraft(),
      cycleMission: () => this.cycleMission(),
      cycleLanguage: () => this.changeLanguage(),
      toggleSound: () => this.toggleSound(),
      firstGesture: () => {
        this.audio.unlock();
        /*
         * **Y aquí se baja el pack de voz, no antes.**
         *
         * Después del primer gesto y no en el paquete del juego: es cuando el
         * navegador deja sonar algo, así que es cuando sirve de algo tenerlo.
         * Se guarda en la Cache API, o sea que las veinte tablets de un aula
         * lo bajan una vez y todas las sesiones siguientes van sin red. Y
         * mientras no exista, no pasa nada: habla la voz del navegador, que es
         * lo que hay desde el primer día. Ver `audio/instructor-grabado.ts`.
         */
        void this.instructor.cargar();
      },
    });

    /*
     * El cuaderno de vuelo, si el HTML trae su hueco.
     *
     * Va aquí y no dentro del HUD porque es una página que se abre encima del
     * vuelo, como los créditos o la pantalla de mandos: el HUD es lo que se
     * mira volando, y esto es justo lo contrario.
     */
    const hueco = document.getElementById("cuaderno");
    if (hueco) {
      this.cuadernoUI = new CuadernoScreen(hueco, this.cuaderno);
      this.hud.onCuaderno(() => this.cuadernoUI?.toggle());
    }

    /*
     * Y la mezcla se entera de cuándo habla alguien, para agachar lo demás.
     * La voz del navegador no pasa por Web Audio, así que hay que avisarla.
     * Ver `audio/mezcla.ts`.
     */
    conectarLaMezcla(this.audio);
    /*
     * Y el pulsador de la radio, que es lo que hace que la torre suene a
     * torre. Ver `audio/radio.ts`: el chasquido sí pasa por Web Audio aunque
     * la voz que va en medio no pueda.
     */
    conectarLaRadio(this.audio);
    this.audio.prepare();
    this.audio.setEngine(this.aircraft.sound);
    this.hud.setSoundLevel(
      this.audio.level.glyph,
      t(`sound.${this.audio.level.id}` as never),
    );
    /*
     * Y el volumen que quedó guardado también manda sobre la voz, **desde el
     * arranque**: se guarda entre partidas, así que quien dejó el juego en
     * «bajo» lo encuentra en «bajo» — y hasta hoy se lo encontraba con el
     * instructor a tope hasta que tocara el botón. Ver `ponerVolumenDeVoz`.
     */
    permitirVoz(this.audio.level.id !== "mudo");
    ponerVolumenDeVoz(this.audio.level.gain);
    // La pantalla de teclas se monta si existe su hueco. Es opcional a
    // propósito: el juego tiene que arrancar aunque falte.
    const teclasRoot = document.getElementById("teclas");
    if (teclasRoot)
      this.keyScreen = new KeyScreen(teclasRoot, this.input.keymap);
    // Sin letras, teclado dibujado. Con letras, la tabla.
    this.keyScreen?.setSimple(
      this.tier.instruments === "none" || this.tier.instruments === "pictorial",
    );
    const ajustesRoot = document.getElementById("ajustes");
    if (ajustesRoot) {
      this.ajustesUI = new PantallaDeAjustes(ajustesRoot, (a) =>
        this.aplicarAjustes(a),
      );
    }
    const pausaRoot = document.getElementById("pausa");
    if (pausaRoot) {
      this.pausa = new PantallaDePausa(
        pausaRoot,
        {
          seguir: () => this.reanudar(),
          reiniciar: () => {
            this.reanudar();
            this.resetFlight();
          },
          /*
           * Los ajustes se abren **sobre la pausa**, no en su lugar: al
           * cerrarlos se vuelve al menú, que es donde se estaba. Cerrarlos
           * devolviendo al vuelo sería sacar a alguien de la partida por
           * haber mirado el tamaño de los botones.
           */
          ajustes: () => this.ajustesUI?.abrir(),
          // Igual que el botón del hangar: recargar. Ver `onHangar`.
          hangar: () => location.reload(),
        },
        this.tier.instruments !== "none",
      );
    }
    /*
     * Y los ajustes puestos, **después de que exista el teclado**.
     *
     * Uno de los cuatro invierte el cabeceo, y eso se le dice al gestor de
     * entrada. Llamando a esto antes de construirlo, la excepción se comía el
     * resto del constructor en silencio y el juego arrancaba **sin menú de
     * pausa y sin ajustes**: los dos se montan unas líneas más abajo. Costó
     * una tarde y lo cazó un `pageerror` del banco.
     */
    this.aplicarAjustes();
    /*
     * Y con los paneles ya montados, el vuelo se entera de cuándo hay alguno
     * abierto. Ver `quedarQuieto` y #70.
     */
    laConchaLaLleva({
      alAbrirseOCerrarse: (que) => {
        this.hayPanelAbierto = que.congela;
        this.hayInstrumentoAbierto = que.alguno && !que.congela;
        this.quedarQuieto();
      },
      suena: (que) => {
        if (import.meta.env.DEV) this.loQueSonoLaConcha.push(que);
        this.avisar(que);
      },
    });
    const misionRaiz = document.getElementById("mision");
    if (misionRaiz) this.misionUI = new PantallaDeMision(misionRaiz);
    /*
     * Y el botón lo ata el HUD, no esto. Atado desde aquí se moría en cuanto
     * el HUD se rehiciera —cambiar de unidades o de idioma lo rehace entero— y
     * el botón se quedaba en pantalla sin abrir nada. Ver `Hud.onMision`.
     */
    this.hud.onMision(() => this.misionUI?.alternar());
    // Y la regla de las tres láminas, en los dos sentidos. Ver `Hud`.
    this.misionUI?.onAbrir(() => {
      this.hud.mapa.cerrar();
      this.hud.tiempo.cerrar();
    });
    this.hud.alAbrirUnaLamina(() => this.misionUI?.cerrar());
    this.hud.onPausa(() => this.alternarPausa());
    this.hud.onCamara(() => this.cycleCamera());
    this.hud.onGafas(() => this.alternarGafas());
    this.llevarLasGafas(leerGafas());
    /*
     * **Los dos momentos del despegue, cada uno con lo suyo.**
     *
     * V1 es una decisión que ya está tomada —a partir de ahí se vuela pase lo
     * que pase— y Vr es una acción que toca hacer ahora. Entre las dos pasan
     * unos segundos, y esos segundos son la lección: ya no puedo parar y
     * todavía no vuelo. Hasta hoy los dos salían igual: un destello mudo.
     *
     * Así que suenan distinto —una nota grave y sola para la decisión, dos que
     * suben para la acción—, se dicen distinto, y **en Vr aparece la flecha de
     * tirar**, que es la única de las dos que pide mover algo y la única que
     * se entiende sin leer. Ver #105.
     */
    this.hud.onVelocidades((cual) => {
      if (cual === "V1") {
        this.avisar("v1");
        this.cantar("V one", t("vuelo.comprometido"), "vuelo.comprometido");
        return;
      }
      this.avisar("rotar");
      this.cantar("rotate", t("vuelo.rotar"), "vuelo.rotar");
      this.hud.senal.mostrar(
        "tirar",
        this.rotulo("vuelo.rotar", "palabra.tira"),
        null,
        { segundos: DURA_LA_FLECHA_DE_TIRAR, prioridad: IMPORTANTE },
      );
    });
    this.hud.onKeys(() => this.keyScreen?.toggle());
    this.hud.onCredits(() => this.credits.toggle());
    this.hud.onAla(() => this.ala?.alternar());
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
    // Y la vista con la que se arranca, que puede ser la de cabina: la clase
    // del HUD tiene que estar puesta desde el primer fotograma y no desde la
    // primera vez que se pulse la tecla de cámara.
    this.hud.ponerVistaDeCabina(this.cameraMode === "cockpit");
    /*
     * **Y la senda, otra vez, porque ahora ya se sabe dónde está el PAPI.**
     *
     * Los aros se montan arriba, antes que las luces, porque tienen que existir
     * aunque no haya aeródromo real. Pero la senda se cuenta desde el PAPI —ver
     * `SENDA_DESDE`— y hasta aquí no se sabe a cuánto está el de esta pista: en
     * Cuatro Vientos a 162 m y en La Palma a 297, que son siete metros de
     * altura sobre el umbral. Rehacerla aquí es la diferencia entre dibujar la
     * senda de este campo y dibujar una senda genérica.
     */
    if (this.aproximacion) this.rehacerLaSenda();
    this.hud.ponerHora(this.horaPedida(), (h) => this.ponerHora(h));
    /*
     * Y el cielo. Empieza despejado porque es el que deja ver el mundo, que es
     * de lo que va esto; las nubes se eligen cuando se quieren, y entonces se
     * atraviesan despegando, que es el momento por el que están.
     */
    /*
     * **Y el cielo arranca con el del sitio, no despejado.**
     *
     * Aquí ponía siempre el primer botón —cielo raso— con un motivo escrito:
     * «empieza despejado porque es el que deja ver el mundo». Y era verdad
     * mientras el tiempo de por defecto fuera el mismo en los once campos y sin
     * una nube: entonces, o despejado o un techo inventado.
     *
     * Ahora cada campo trae su tiempo típico —ver `vientoDominante`— y lo típico
     * en casi todos es **una capa alta**: el mar de nubes del alisio a
     * novecientos metros sobre Los Rodeos, los cúmulos de tarde del Paraguay a
     * mil quinientos. Eso no tapa el mundo, lo pone: se despega, se atraviesa y
     * se sale por encima, que es justo el momento por el que están.
     */
    const deCasa = this.scenario.meteo ?? TIEMPO_DE_CASA;
    this.hud.ponerCielo(
      deCasa.techoM === null ? 0 : deCasa.techoM < 300 ? 2 : 1,
      (techoM, tapadura) => {
        this.ponerTecho(techoM, tapadura);
      },
    );
    this.ponerTecho(
      deCasa.techoM,
      deCasa.techoM === null ? 0 : deCasa.techoM < 300 ? 0.9 : 0.45,
    );
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
    if (conTeclado && this.keyScreen && !leerTexto("teclas-vistas")) {
      ponerTexto("teclas-vistas", "1");
      this.keyScreen.show();
    }

    this.hud.onSoundClick(() => this.toggleSound());
    // `?fps=1` enciende el contador de fotogramas. Ver `Hud.mostrarFps`.
    if (new URLSearchParams(location.search).get("fps")) this.hud.pedirFps();
    // Y el botón del final: otro vuelo, que es lo que uno quiere hacer ahí.
    this.hud.onOtroVuelo(() => this.resetFlight());
    this.hud.onBrake((pressed) => this.input.setTouchBrakes(pressed));
    this.hud.onThrottle((direction) => this.input.setButtonThrottle(direction));

    this.escucharLosHechos();

    window.addEventListener("resize", this.onResize);
    this.onResize();
    this.resetFlight();
    this.abrirVentanaDePruebas();
    this.hud.flash(`${t("help.start")} · ${t("help.assist")}`, 8);

    /*
     * **Y si no hay voz, se dice.**
     *
     * El instructor es la voz que sustituye al texto en el peldaño que no lee,
     * y habla con lo que traiga el sistema. En Linux, y en cualquier navegador
     * sin voces instaladas, `speechSynthesis` devuelve una lista vacía y el
     * instructor se queda **mudo en silencio**: el juego no dice nada y nadie
     * sabe por qué. Se vio jugando: «yo no estoy escuchando voces por ningún
     * lado, ni robóticas ni nada».
     *
     * Así que se avisa una vez, y solo cuando de verdad no hay ninguna. El día
     * que las frases estén grabadas esto sobra, porque ya no dependerá del
     * sistema. Ver `docs/voces/`.
     */
    /*
     * **Y se pregunta a los cuatro segundos, no al arrancar.**
     *
     * Esto miraba `disponible` aquí mismo, en el constructor, y solo retrasaba
     * la tarjeta. Pero es que la respuesta de aquí **no vale todavía**: en
     * Chrome el primer `getVoices()` devuelve una lista vacía y se llena
     * luego, con el evento `voiceschanged`. `instructor.ts` lo tiene escrito
     * dos líneas antes de hacerlo bien —«preguntar una sola vez al arrancar es
     * el error clásico de esta API»— y aquí se hacía exactamente eso.
     *
     * En un sistema con voces que tardan un pelo, el juego decidía «no hay» y
     * cuatro segundos después sacaba el cartel con el instructor ya hablando.
     * Ahora la pregunta va dentro de la espera, que es donde tiene sentido.
     */
    this.agenda.luego(4, () => {
      if (this.instructor.disponible) return;
      /*
       * **Y se dice con un dibujo, no solo con una frase.**
       *
       * Iba únicamente escrito, y eso es incumplir la regla de oro justo donde
       * más duele: el canal que se ha caído es el hablado, y el aviso de que
       * se ha caído iba por el escrito. Quien no lee se quedaba sin las dos
       * cosas y sin saber por qué el juego no le habla.
       *
       * La frase se queda para quien sí lee, que ahí dice **qué** pasa y no
       * solo que pasa algo. Cuando el pack grabado esté, esto no saldrá:
       * el instructor hablará aunque el navegador no tenga ni una voz.
       */
      this.hud.senal.mostrar(
        "sinVoz",
        this.rotulo("hud.sinVoz", "palabra.mudo"),
        null,
        { segundos: 8, prioridad: IMPORTANTE },
      );
      if (this.tier.instruments !== "none") this.hud.flash(t("hud.sinVoz"), 8);
    });
  }

  /** La ventana de pruebas de desarrollo. Vive en `src/dev/sondas.ts`. */
  private abrirVentanaDePruebas(): void {
    abrirLaVentanaDePruebas(this);
  }

  start(): void {
    if (this.running) return;
    /*
     * **Y no se arranca con algo abierto encima.**
     *
     * El vuelo se congela cuando hay un panel abierto o el menú de pausa
     * puesto, y `start` no lo miraba: la puerta de desarrollo `__ogaEmpezar`
     * —que existe porque una pestaña abierta por un guion nunca tiene el foco—
     * soltaba el avión con el plano abierto delante. Quien decide que se puede
     * volver a volar es `quedarQuieto`, y sólo él.
     */
    if (this.quieto) return;
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
    this.contarLaMision();
    this.hud.flash(t("mission.started", { name: t(mision.nameKey) }), 4);
    this.avisar("mision");
    this.updateMissionMarker();
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.audio.setActive(false);
  }

  /**
   * Pone el reloj del juego a ir más deprisa, **solo en desarrollo**.
   *
   * No hay truco: el mundo da **varios pasos por fotograma** en vez de uno, y
   * se pinta una sola vez. Cada paso es exactamente el de siempre, así que el
   * juego toma las mismas decisiones a los mismos intervalos y lo que cuenta
   * el tiempo lo cuenta igual: las tarjetas, la agenda, la duración del vuelo.
   * Lo único que se salta es pintar. Ver `frame`, que cuenta por qué no vale
   * con alargar el paso.
   *
   * **Con tope.** Cada paso de más es trabajo de más en el mismo fotograma, y
   * pasado cierto punto el fotograma tarda tanto que la ganancia se para sola:
   * el mundo va más deprisa por paso y más despacio por segundo de pared. El
   * tope está donde deja de compensar en la máquina más lenta con la que se
   * mide, y no más arriba, porque un banco que tarda menos midiendo otra cosa
   * no ha ahorrado nada.
   *
   * Devuelve lo que quedó puesto, que es lo que el banco tiene que creerse
   * para sus cuentas, y no lo que pidió.
   */
  acelerar(veces: number): number {
    if (!import.meta.env.DEV) return 1;
    this.aceleracion = Math.max(1, Math.min(TOPE_DE_ACELERACION, veces));
    return this.aceleracion;
  }

  /**
   * Despierta el sonido sin soltar el vuelo.
   *
   * Lo llama `main.ts` al volver a la ventana. Si lo que tiene parado el vuelo
   * es un panel abierto, arrancar el bucle sería devolver un avión en
   * movimiento a quien está eligiendo algo; pero dejar el sonido suspendido
   * sería devolverle un menú mudo, y un menú mudo no dice si se ha enterado.
   */
  despertarElSonido(): void {
    this.audio.setActive(true);
  }

  /** Si el vuelo está parado, lo haya parado quien lo haya parado. */
  get pausado(): boolean {
    return this.quieto;
  }

  alternarPausa(): void {
    if (this.pausadoAdrede) this.reanudar();
    else this.pausar();
  }

  pausar(): void {
    if (this.pausadoAdrede) return;
    this.pausadoAdrede = true;
    this.pausa?.abrir();
    this.quedarQuieto();
  }

  reanudar(): void {
    if (!this.pausadoAdrede) return;
    this.pausadoAdrede = false;
    this.pausa?.cerrar();
    this.quedarQuieto();
  }

  /**
   * Deja el mundo donde estaba, o lo suelta otra vez.
   *
   * El reloj se detiene entero, así que el avión no se mueve ni un metro
   * mientras hay algo abierto encima. Y el último fotograma **sigue pintado
   * detrás**: quien vuelva ve el avión donde lo dejó, que es lo que hace que
   * parar no dé miedo. Un fundido a negro haría creer que se perdió el vuelo.
   *
   * También se calla todo. Un instructor que sigue explicando la aproximación
   * con el juego parado es lo contrario de una pausa.
   *
   * Lo piden **dos** cosas y por eso está aquí y no dentro de `pausar`: el
   * menú de pausa, que es lo de siempre, y cualquier panel que se abra encima
   * del vuelo, que es lo que exige #70 —«nunca se cae el avión mientras
   * alguien está eligiendo gorra»—. Hasta ahora abrir el plano en vuelo
   * dejaba el avión volando solo detrás del velo, y volver era volver a un
   * avión que ya no estaba donde se dejó.
   */
  /**
   * En qué fase está el vuelo **ahora**.
   *
   * No es lo mismo que `faseAnunciada`, que es *lo último que se dijo*: hay
   * tres sitios que la vacían para que una tarjeta vuelva a salir, y durante
   * esos fotogramas vale cadena vacía. Cinco cosas la leían como si fuera la
   * fase actual —la radio, el circuito, la banda de velocidad, el aviso de
   * terreno en final y el «ya podés tocar»— y en esos fotogramas veían una
   * fase que no existe.
   *
   * La de ahora la tiene el plan. Cuando no hay plan —los escenarios sin
   * aeródromo— no hay fase, y entonces lo último dicho es lo mejor que hay.
   */
  private get faseDeAhora(): string {
    return this.vistaActual?.fase ?? this.faseAnunciada;
  }

  /**
   * Mantiene el avión derecho mientras se mira un instrumento.
   *
   * #70 da dos salidas —«un panel abierto pausa el vuelo **o lo deja en vuelo
   * recto**»— y no son intercambiables: una pantalla que se lee pide lo
   * primero y un instrumento que se consulta volando pide lo segundo. El plano
   * existe para ver por dónde vas, y con el avión congelado la marca de tu
   * posición se queda quieta: el instrumento deja de decir lo único que tiene
   * que decir. Se congelaban los seis y se vio jugando —«no entiendo por qué
   * cuando se abre el mapa se para el avión»—.
   *
   * Lo que hace es lo que haría un piloto que suelta los mandos un momento:
   * alas al horizonte y sin subir ni bajar. **No es un piloto automático** y no
   * mantiene rumbo ni navega; solo impide que el avión se caiga mientras no se
   * le mira, que es lo que el issue promete con esas palabras.
   *
   * Va sobre los mandos y no sobre el estado —nada de mover el avión a mano—
   * porque es lo que hace el resto del juego: quien pilota escribe mandos.
   */
  private mantenerElVueloRecto(): void {
    const s = this.flight.state;
    if (s.onGround) return;
    const c = this.input.controls;
    const tope = (v: number, t: number) => Math.max(-t, Math.min(t, v));
    // Alas al horizonte: se manda **inclinación**, no velocidad de alabeo, o
    // el avión seguiría girando sobre su eje. Es la misma lección que el
    // piloto del banco aprendió cayendo en espiral.
    c.aileron = tope(-bankAngleOf(s.orientation) * 1.6, 0.35);
    // Y sin subir ni bajar, amortiguado con la velocidad vertical.
    c.elevator = tope(-s.verticalSpeed * 0.08, 0.3);
    c.rudder = 0;
  }

  private quedarQuieto(): void {
    const debe = this.pausadoAdrede || this.hayPanelAbierto;
    if (debe === this.quieto) return;
    this.quieto = debe;
    if (!debe) {
      this.audio.callarElMundo(false);
      this.start();
      return;
    }
    this.running = false;
    this.renderer.setAnimationLoop(null);
    /*
     * Y se calla **el mundo**, no el sonido entero.
     *
     * Suspender el contexto —que es lo que hace `stop`, y está bien cuando
     * nadie mira la pestaña— dejaría la concha muda, y es justo entonces
     * cuando alguien está recorriendo opciones con el dedo o con el tabulador
     * y necesita oír que el aparato se ha enterado. El motor y el ambiente sí
     * se callan: son los dos que suenan solos. Ver `Audio.callarElMundo`.
     */
    this.audio.callarElMundo(true);
    this.instructor.callar();
    this.otroAvion.callar();
    callar();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    this.input.dispose();
    this.medidor.dispose();
    this.rodadura?.dispose();
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
      this.tocoEnElCampoDeVuelo(),
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
      this.avisar("success");
    } else {
      this.avisar("attention");
      const dicho =
        veredicto === "rapido" ? "hud.landedFast" : "hud.landedOffRunway";
      this.cantar(
        veredicto === "rapido" ? "too fast" : "off the runway",
        t(dicho),
        dicho,
      );
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
        veredicto === "rapido"
          ? this.rotulo("hud.landedFast", "palabra.rapido")
          : this.rotulo("hud.landedOffRunway", "palabra.fuera"),
        null,
        { segundos: SE_QUEDA_EL_VEREDICTO, prioridad: URGENTE },
      );
    }
    /*
     * **Y tomar tierra donde no es termina el intento.**
     *
     * Un avión posado en un descampado no sigue rodando hasta su puesto: se
     * queda ahí y viene alguien a buscarlo. Hasta hoy el juego decía «fuera de
     * pista» con un dibujo y a los cinco segundos seguía como si nada, que es
     * lo que hace que el peor final posible no se distinga de un aterrizaje
     * bueno. Ver `flight/percance.ts`.
     */
    /*
     * **Y aterrizar cuando te habían dicho que no.**
     *
     * Es el otro lado de la frustrada: la maniobra que salva existe porque a
     * veces no se puede aterrizar, y quien se empeña se lleva por delante lo
     * que hubiera en la pista — que en un campo de hierba tiene cuatro patas.
     * No es un castigo por fallar una maniobra: es lo que pasa por seguir
     * bajando después de la orden. Ver `mirarSiMandanFrustrar`.
     */
    /*
     * **Y solo con la orden de la torre, que es la que tiene una vaca detrás.**
     *
     * Esto miraba `mandanFrustrar` a secas, y esa bandera la encienden **dos**
     * cosas muy distintas: la torre, porque hay algo en la pista, y la
     * aproximación no estabilizada, donde la pista está vacía. Así que
     * continuar una aproximación mal estabilizada rompía el avión «por
     * llevarse por delante lo que hubiera en la pista» — contra un obstáculo
     * que no existe.
     *
     * Se vio jugando con el 747: «al aterrizar me ordena una frustrada… cuando
     * estoy llegando "así no entra" con 3400 m de pista y la velocidad al
     * mínimo, tomo tierra y se rompió, volvemos a empezar».
     *
     * Una aproximación mal estabilizada que se continúa no explota: sale
     * larga, dura o descolocada, y para eso están los veredictos de siempre
     * —golpe, fuera de pista— que vienen justo debajo. El aviso enseña; la
     * consecuencia la pone la física.
     */
    if (this.laAproximacion.porqueMandaron === "pistaOcupada")
      this.sufrirPercance("ocupada");
    else if (veredicto === "fuera") this.sufrirPercance("fuera");
    /*
     * Y llegar dando un golpe, aunque sea sobre el asfalto.
     *
     * **El listón lo pone el modelo de vuelo, no este fichero.** Había uno
     * escrito aquí —cuatro metros por segundo— mientras el modelo rompía el
     * avión a partir de seis, y con las ayudas puestas a partir de veinte. O
     * sea que en el peldaño de los pequeños el avión quedaba entero y la
     * pantalla enseñaba igualmente la avioneta rota: «aterricé bien otra vez y
     * me vuelve a decir que estrellé la avioneta». Y no era un caso raro —
     * bajando por la senda con el gas al mínimo, este juego se posa a tres
     * metros por segundo—, así que cualquier aproximación un poco más viva
     * terminaba en accidente. Ver `FlightModel.limiteDeCaida`.
     */
    else if (this.landing.caidaAlTocar > this.flight.limiteDeCaida())
      this.sufrirPercance("golpe");
    else {
      // Un aterrizaje en la pista, que es lo que cuenta en el cuaderno.
      this.apuntar({ aterrizajes: this.cuaderno.aterrizajes + 1 });
      this.apuntarElSitio();
      /*
       * **Y el primero que cuenta trae las gafas de sol.**
       *
       * Aquí y no en el galón de la toma, aunque la regla sea la misma: este
       * es el sitio donde el juego ya ha decidido que esto fue un aterrizaje
       * de verdad —en la pista, sin percance, sin golpe—. Colgarlo del galón
       * habría sido tener dos definiciones de aterrizar bien.
       */
      if (lasGana(veredicto) && ganarGafas()) {
        this.hechos.emit("ganasteLasGafas", {});
      }
    }
    return veredicto;
  }

  /**
   * Un aviso de vuelo, dicho como toca en este peldaño.
   *
   * **Los avisos crecen con el peldaño**, y hasta hoy no lo hacía ninguno: una
   * niña de cuatro años oía «terrain, pull up» y «one hundred… fifty» en
   * inglés aeronáutico, que son cantos de radioaltímetro de un avión de línea.
   * Lo que se aprende aquí no puede haber que desaprenderlo, y para eso lo
   * primero es entenderlo.
   *
   * - En Guyrami y Tukã habla el instructor, en casa y en una palabra.
   * - De Taguato en adelante, el canto de cabina en inglés, que es donde ya
   *   sirve: a los diez años eso es algo que se reconocerá toda la vida.
   *
   * **La voz es siempre el tercer canal**: el dibujo y el tono salen igual, y
   * quien juega en silencio no se pierde nada. Por eso esto solo elige quién
   * habla, y nunca decide si hay aviso.
   */
  private cantar(
    ingles: string,
    encasa?: string,
    clave?: string,
    /**
     * Y cuánto manda esto sobre lo que se esté diciendo. Ver `audio/boca.ts`.
     *
     * Normal casi siempre. Urgente son tres: el terreno, la pista ocupada y la
     * frustrada — lo que no puede esperar a que termine una frase. Y baja, los
     * elogios: que te digan «bien» no puede pisar a nadie.
     */
    urgencia: Urgencia = "normal",
  ): void {
    if (canalesDe(this.tier.avisos).cabina) {
      /*
       * **Y con la grabación de cabina si la hay.**
       *
       * Esto mandaba el inglés al sintetizador del navegador sin más, y por eso
       * las veintiuna frases de cabina grabadas —«V one», «rotate», «five
       * hundred», «terrain, pull up»— se bajaban a cada tablet con el resto del
       * pack **para no sonar nunca**. Se preguntó jugando: «¿y qué hay de esas
       * voces robóticas? "Minimals", "five hundred"… o "Terrain!"».
       *
       * La cabina habla por la boca de la instructora a propósito: es el mismo
       * altavoz de dentro del avión, no una radio. Ver `audio/cabina.ts`, que
       * es lo que une lo que pide el código con lo que hay grabado, y tiene su
       * prueba para que no vuelva a sobrar ninguna grabación.
       */
      const deCabina = claveDeCabina(ingles);
      if (deCabina && this.instructor.vozDe(deCabina)) {
        this.apuntarCanto(`${ingles}→${deCabina}`);
        this.instructor.decir(ingles, deCabina, urgencia);
        return;
      }
      this.apuntarCanto(`${ingles}→navegador${deCabina ? "(sin voz)" : ""}`);
      decir(ingles, urgencia);
      return;
    }
    // Y con la clave cuando la hay: el instructor grabado busca por clave.
    // Las frases que se componen en caliente no la tienen y las dice la voz
    // del navegador, que es lo que hay hasta que existan las grabaciones.
    this.apuntarCanto(`${ingles}→${encasa ? (clave ?? "sin clave") : "NADA"}`);
    if (encasa) this.instructor.decir(encasa, clave, urgencia);
  }

  /**
   * Por dónde salió cada canto, para el banco.
   *
   * `cantar` tiene tres salidas y las tres suenan distinto de puertas afuera:
   * la grabación de cabina, la voz del navegador **saltándose las bocas**, y la
   * frase en castellano por la boca de la instructora. Persiguiendo «al
   * despegar no me avisa del V1 ni VR ni nada» resultó imposible saber por cuál
   * se iba, porque dos de las tres no dejan rastro en ningún historial.
   */
  readonly cantados: string[] = [];

  private apuntarCanto(que: string): void {
    if (!import.meta.env.DEV) return;
    this.cantados.push(que);
    if (this.cantados.length > 4000) this.cantados.shift();
  }

  /**
   * El texto de una tarjeta de aviso, en el peldaño de hoy.
   *
   * Las dos formas se escriben aquí mismo, en el sitio donde se da el aviso:
   * la frase entera y **la palabra corta**. Cuál sale la decide la escalera de
   * comunicación —ninguna en Guyrami, la corta en Tukã, la larga de Taguato en
   * adelante—, y nunca decide si hay aviso: el dibujo y el tono salen igual.
   *
   * Estaban las dos docenas de sitios escribiendo `instruments !== "none"`
   * a mano, que además era la pregunta equivocada: los instrumentos son lo que
   * marca la cabina, no cómo se avisa. Ver `flight/escalera.ts`.
   */
  private rotulo(larga: TranslationKey, corta: TranslationKey): string {
    const clave = claveDelAviso(this.tier.avisos, larga, corta);
    return clave ? t(clave as TranslationKey) : "";
  }

  /**
   * Lo mismo, pero eligiendo **una de las formas** de decirlo.
   *
   * Devuelve las tres cosas que hacen falta para un aviso completo y las tres
   * de la misma forma: lo que se escribe, lo que se dice y **cuál de las
   * grabaciones** es. Elegir por separado sería que el cartel dijera una cosa
   * y el instructor otra, o pedir un fichero que no existe.
   *
   * En los peldaños que enseñan la frase corta —«¡Al aire!»— el cartel no
   * cambia: la variante es de la frase larga, que es la que se dice. Ver
   * `audio/variantes.ts`.
   */
  private avisoCon(
    larga: TranslationKey,
    corta: TranslationKey,
  ): { rotulo: string; texto: string; id: string } {
    const forma = unaForma(larga);
    const clave = claveDelAviso(this.tier.avisos, larga, corta);
    return {
      rotulo: !clave
        ? ""
        : clave === larga
          ? forma.texto
          : t(clave as TranslationKey),
      texto: forma.texto,
      id: forma.id,
    };
  }

  /** Lo mismo, cuando la frase larga se compone de varias claves. */
  private rotuloCompuesto(larga: string, corta: TranslationKey): string {
    const canales = canalesDe(this.tier.avisos);
    if (!canales.texto) return "";
    return canales.corto ? t(corta) : larga;
  }

  /**
   * El rótulo del aro perdido, **con la cifra cuando toca**.
   *
   * «Pasaste por encima del aro» es la frase; «por encima del aro, 38 m» es la
   * misma frase con el número que la hace medible, y ese número es justo el
   * peldaño en el que se empieza a leer un instrumento en vez de un dibujo.
   * En pies donde la cabina va en pies, como todo lo demás.
   */
  private rotuloDelAro(donde: "alto" | "bajo"): string {
    const clave = donde === "alto" ? "vuelo.aroAlto" : "vuelo.aroBajo";
    const corta = donde === "alto" ? "palabra.baja" : "palabra.subi";
    if (!canalesDe(this.tier.avisos).cifra) return this.rotulo(clave, corta);
    const unidades = UNIT_SYSTEMS[this.tier.units];
    const cuanto = Math.round(
      Math.abs(unidades.altitude(this.runwayGuide.porCuanto)),
    );
    return this.rotuloCompuesto(
      `${t(clave)} (${cuanto} ${unidades.altitudeLabel()})`,
      corta,
    );
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

    /*
     * **Y si se llega con velocidad, el intento se acabó.**
     *
     * Arrimarse despacio a un hangar no es un accidente —es lo que se hace en
     * una plataforma— y por eso hay un listón: por debajo de `ROCE` el mundo
     * sigue impidiendo el paso y ya está. Por encima, esto ha sido un choque.
     */
    if (s.groundSpeed > ROCE) this.sufrirPercance("edificio");

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
  /**
   * Algo salió mal: se para el vuelo y se cuenta con un dibujo.
   *
   * **Y se para de verdad.** Hasta hoy se podía atropellar al coche, meter el
   * avión en un hangar o tomar tierra en un descampado y seguir volando como
   * si tal cosa, que es lo que enseña que da igual. Ver `flight/percance.ts`.
   */
  private sufrirPercance(tipo: Percance): void {
    if (this.percance || this.vueloTerminado) return;
    this.percance = tipo;
    this.apuntar({ percances: this.cuaderno.percances + 1 });
    // Y la tarjeta que hubiera, fuera: lo que pedía ya no se puede hacer.
    this.hud.senal.limpiar();
    // El avión se planta: ni gas ni ganas. Los frenos, puestos.
    this.input.controls.throttle = 0;
    this.input.controls.brakes = 1;
    this.input.releaseAll();
    this.avisar("error");
    this.cantar("we have a problem", t("vuelo.roto"), "vuelo.roto");
    this.agenda.luego(TARDA_EL_FINAL, () => {
      if (this.percance !== tipo) return;
      this.hud.mostrarPercance(
        dibujoDePercance(
          tipo,
          // La pista la ocupa una vaca donde hay vacas, y otro avión donde hay
          // torre: el dibujo tiene que contar lo que pasó de verdad.
          tipo === "ocupada" && !this.scenario.aerodrome?.privado
            ? "-avion"
            : "",
        ),
        // Sin palabras donde todavía no se lee: el dibujo es el mensaje.
        this.tier.instruments === "none" ? "" : t(`percance.${tipo}` as never),
      );
    });
    /*
     * **Y la red: si nadie toca el botón, el juego vuelve solo.**
     *
     * Esto existía y **no pasaba nunca**. El contador vivía en el bucle, unas
     * líneas después de la salida temprana que hace el propio percance: subía
     * una vez, en el fotograma del golpe, y a partir de ahí el bucle ya no
     * llegaba. O sea que la pantalla del percance se quedaba puesta **para
     * siempre**, que es justo lo que el comentario de `VUELVE_SOLO` dice que
     * no puede pasar: a los cuatro años, una pantalla que no se va nunca es
     * una pantalla rota.
     *
     * Va en la agenda porque esta cuenta atrás es del juego y no del
     * navegador: con el menú de pausa abierto no tiene que correr, y con el
     * reloj acelerado de los bancos tiene que correr igual de acelerada.
     */
    this.agenda.luego(TARDA_EL_FINAL + VUELVE_SOLO, () => {
      if (this.percance === tipo) this.resetFlight();
    });
  }

  /**
   * Apunta algo en el cuaderno y lo guarda.
   *
   * Todas las cuentas suben y ninguna baja: los grados se ganan por cosas
   * hechas y no por no fallar. Ver `flight/cuaderno.ts`.
   */
  private apuntar(cambio: Partial<Cuaderno>): void {
    this.cuaderno = { ...this.cuaderno, ...cambio };
    guardarCuaderno(this.cuaderno);
    this.cuadernoUI?.ponerCuaderno(this.cuaderno);
  }

  /** Y el aeródromo de hoy, que cuenta como sitio visitado. */
  private apuntarElSitio(): void {
    const id = this.scenario.aerodrome?.id ?? this.scenario.id;
    if (this.cuaderno.aerodromos.includes(id)) return;
    this.apuntar({ aerodromos: [...this.cuaderno.aerodromos, id] });
  }

  terminarElVuelo(): void {
    if (this.vueloTerminado) return;
    this.vueloTerminado = true;
    this.apuntar({ completos: this.cuaderno.completos + 1 });
    /*
     * **Y el vuelo entero a la bitácora**, con su traza.
     *
     * El cuaderno guarda los totales —horas, despegues, aterrizajes— y un
     * total no es un recuerdo: dice que hubo veinte aterrizajes y no dice cuál
     * fue el tuyo. Esto es la línea de este vuelo. Ver `flight/bitacora.ts`.
     */
    apuntarVuelo({
      fecha: new Date().toISOString(),
      escenario: this.scenario.id,
      leccion: this.leccion.id,
      tramo: this.tier.id,
      segundos: Math.round(this.duracion),
      galones: this.galones.lista,
      traza: this.traza,
    });
    this.agenda.luego(TARDA_EL_FINAL, () => {
      if (!this.vueloTerminado) return;
      /*
       * **Y si en este vuelo se ha subido de grado, eso es lo que se enseña.**
       *
       * Manda sobre los galones del vuelo, y con razón: los galones del vuelo
       * se ganan cada tarde y el grado se gana una vez. Hasta hoy esto pasaba
       * en silencio —se entraba al cuaderno un día cualquiera y ya ponía otra
       * cosa—, que es tirar el único momento del juego que de verdad
       * significa algo.
       */
      const ahora = grado(this.cuaderno);
      if (ahora !== this.gradoAlEmpezar) {
        this.gradoAlEmpezar = ahora;
        this.hud.mostrarAscenso(
          barrasDe(ahora),
          // El nombre del grado se lee o no se lee, pero las barras son el
          // mensaje: en Guyrami se enseñan igual y sin una palabra.
          this.tier.instruments === "none" ? "" : t(`grado.${ahora}` as never),
          this.relojDeHoras(),
        );
        this.avisar("achieved");
        return;
      }
      const final = reconocer(this.galones.lista);
      this.hud.mostrarFinDeVuelo(
        this.galones.lista,
        // Sin palabras donde todavía no se lee: las barras son el mensaje.
        this.tier.instruments === "none"
          ? ""
          : t(`fin.${final.nivel}` as never),
        // Y el plano con la raya de por dónde se fue. Ver `bitacora.ts`.
        plano(this.scenario, this.scenario.size, this.traza),
        // Y lo que se lleva volado en total, en avioncitos. Ver `ui/reloj.ts`.
        this.relojDeHoras(),
      );
      this.avisar("achieved");
    });
  }

  /**
   * Las horas voladas, dibujadas, con lo de este vuelo marcado aparte.
   *
   * El cuaderno ya lleva los segundos de este vuelo sumados cuando llega
   * aquí, así que se le pasa la duración para saber **cuáles de los
   * avioncitos son nuevos**: un premio que no se ve llegar no es un premio.
   */
  private relojDeHoras(): string {
    return dibujarReloj(
      relojDe(this.cuaderno.segundos, this.duracion),
      t("fin.horas"),
    );
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

  /**
   * Si en esta aproximación ya se avisó de que se venía alto o bajo.
   *
   * Es la condición entera de `loCorregiste`: sin aviso previo no hay nada que
   * corregir, y felicitar a quien no hizo nada convierte el elogio en ruido.
   */
  private avisadoDeLaSenda = false;

  /** El aviso del bulto, con su antirrebote. Ver `SE_QUEDA_EL_BULTO`. */
  private avisarDelBulto(dibujo: string): void {
    if (this.avisandoDelBulto > 0) return;
    this.avisandoDelBulto = SE_QUEDA_EL_BULTO;
    this.hud.senal.mostrar(
      dibujo,
      this.rotulo("vuelo.bulto", "palabra.cuidado"),
      null,
      { segundos: SE_QUEDA_EL_BULTO, prioridad: URGENTE },
    );
    this.avisar("peligro");
    this.cantar("obstacle ahead", t("vuelo.bulto"), "vuelo.bulto");
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
  private escucharLosHechos(): void {
    /*
     * Cuatro oyentes para un hecho, que es exactamente el reparto que había
     * escrito a mano dentro de quien lo detecta. Lo que cambia es que ahora
     * cada uno está donde se entiende —esto es pantalla, esto es sonido, esto
     * es cuaderno, esto es voz— y que añadir un quinto (una misión, un logro)
     * no obliga a tocar el trozo que se da cuenta.
     */
    /*
     * La forma se elige aquí, una vez, y la usan los dos oyentes que la
     * necesitan: el que pinta y el que habla. Se guarda entre los dos porque
     * el reparto los llama en orden y no hay nada en medio.
     */
    let laFrustrada = this.avisoCon("vuelo.frustrada", "palabra.bien");
    this.hechos.on("frustrada", () => {
      laFrustrada = this.avisoCon("vuelo.frustrada", "palabra.bien");
      this.hud.senal.mostrar("frustrada", laFrustrada.rotulo, null, {
        segundos: SE_QUEDA_LA_FRUSTRADA,
        prioridad: URGENTE,
      });
    });
    this.hechos.on("frustrada", () => this.avisar("achieved"));
    // Al cuaderno: renunciar es ganar, y el grado más alto lo pide.
    this.hechos.on("frustrada", () =>
      this.apuntar({ frustradas: this.cuaderno.frustradas + 1 }),
    );
    // En inglés aeronáutico, como el resto de la voz de cabina: «going around»
    // es lo que se dice por radio, y lo demás es del instructor.
    this.hechos.on("frustrada", () =>
      this.cantar(
        "going around. good decision",
        laFrustrada.texto,
        laFrustrada.id,
      ),
    );

    /*
     * **Los mínimos.** Se dice aunque no haya nada que corregir: lo que enseña
     * no es la maniobra, es que hay un momento en el que se decide.
     */
    this.hechos.on("minimos", () => {
      this.hud.senal.mostrar(
        "senda",
        this.rotulo("vuelo.minimos", "palabra.laPista"),
        null,
        { segundos: SE_QUEDAN_LOS_MINIMOS, prioridad: IMPORTANTE },
      );
      this.avisar("attention");
      this.cantar("minimums", t("vuelo.minimos"), "vuelo.minimos");
    });

    /** El PAPI: alto, bajo o en la senda, con su dibujo. */
    this.hechos.on("papi", ({ blancas }) => {
      this.hud.senal.mostrar(
        `papi${blancas}`,
        blancas >= 3
          ? this.rotulo("vuelo.papiAlto", "palabra.baja")
          : blancas <= 1
            ? this.rotulo("vuelo.papiBajo", "palabra.subi")
            : this.rotulo("vuelo.papiBien", "palabra.bien"),
        null,
        { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
      );
    });

    /*
     * **Te has pasado del puesto.** Con el freno dibujado, que es lo que hay
     * que hacer, y con la voz: quien no lee necesita las dos cosas.
     */
    this.hechos.on("teLoPasaste", () => {
      this.hud.senal.mostrar(
        "senalero-alto",
        this.rotulo("vuelo.teLoPasaste", "palabra.frena"),
        null,
        {
          segundos: SE_QUEDA_EL_BULTO,
          prioridad: URGENTE,
          tecla: nombreDeTecla(this.input.preferredKey("brakes")),
        },
      );
      this.avisar("error");
      this.instructor.decir(t("vuelo.teLoPasaste"), "vuelo.teLoPasaste");
    });

    /*
     * **El gesto del señalero, repetido en la tarjeta.**
     *
     * Y el «alto» lleva el freno dibujado, que es lo que hay que hacer.
     * «Aparte del señor, algo debe decirme que pare. Si durante todo el rato
     * del aterrizaje el juego está moviendo y controlando la velocidad de la
     * aeronave, ahora el niño cree que se va a parar sola.» El señalero dice
     * **qué** —no te muevas más— y hasta ahí llegaba la pantalla; lo que
     * faltaba era el **cómo**, que es la misma tecla del freno que ya sale en
     * el punto de espera y al tomar tierra.
     *
     * Es la tercera vez que aparece la misma pareja —dibujo que se entiende
     * sin leer, tecla dibujada al lado— y a propósito: quien la vio en la
     * doble raya la reconoce aquí.
     */
    this.hechos.on("gestoDelSenalero", ({ gesto }) => {
      const parando = gesto === "alto" || gesto === "despacio";
      this.hud.senal.mostrar(`senalero-${gesto}`, "", null, {
        segundos: Infinity,
        tecla: parando
          ? nombreDeTecla(this.input.preferredKey("brakes"))
          : null,
      });
      if (parando) {
        const cual = gesto === "alto" ? "vuelo.alto" : "vuelo.despacio";
        this.instructor.decir(t(cual), cual);
      }
    });

    /*
     * **Lo corregiste.** Dibujo, sonido y voz, como todo lo que importa — y
     * con el sonido de haber ganado algo, no con el de «atención», porque esto
     * no avisa de nada: dice que salió bien.
     */
    /*
     * **Las gafas de sol.**
     *
     * El proyecto nace de una niña que quiere ser piloto «con las gafas de
     * sol», así que este es el único premio del juego que no mide nada: no
     * dice que hayas volado bien, dice que ya sos de los que llevan gafas.
     *
     * Se celebra con todo lo que hay —el dibujo, las cuatro notas y la voz—
     * y **se queda puesto el doble** que un aviso normal: un aviso de paso se
     * pierde mientras mirás la pista, y este no se puede perder porque pasa
     * una sola vez. Ver `flight/gafas.ts` y #2.
     */
    this.hechos.on("ganasteLasGafas", () => {
      this.hud.senal.mostrar("gafas", t("gafas.ganadas"), null, {
        segundos: SE_QUEDA_EL_ARO * 2,
        prioridad: IMPORTANTE,
      });
      this.avisar("achieved");
      this.instructor.decir(t("gafas.ganadas"), "gafas.ganadas");
      this.llevarLasGafas(leerGafas());
    });

    this.hechos.on("loCorregiste", () => {
      const bien = this.avisoCon("vuelo.corregido", "palabra.bien");
      this.hud.senal.mostrar("corregido", bien.rotulo, null, {
        segundos: SE_QUEDA_EL_ARO,
        prioridad: IMPORTANTE,
      });
      this.avisar("achieved");
      this.cantar("on the glide path", bien.texto, bien.id, "baja");
    });

    /*
     * **Un tramo nuevo del circuito.** Sin palabra en el peldaño que no lee:
     * ahí el dibujo es el mensaje entero.
     */
    this.hechos.on("tramoDeCircuito", ({ tramo }) => {
      /*
       * **Y al entrar en la base, la senda empieza donde estás.**
       *
       * Los aros arrancan a 3.200 metros del umbral y el circuito entra en
       * final a 1.800: quien vuela el circuito —que es lo que el juego le pide
       * que haga— llega a la base con **tres aros ya a la espalda**, y la
       * senda se los apuntaba como perdidos. Un galón menos por hacer
       * exactamente lo que se le mandó.
       *
       * Las dos distancias son distintas a propósito: un circuito de tráfico y
       * una aproximación directa no entran en final en el mismo sitio ni en un
       * avión de verdad. Lo que estaba mal no era la geometría, era contar
       * como fallo lo que nunca llegó a pedirse.
       */
      if (tramo === "base") this.runwayGuide.reset(this.flight.state.position);
      const clave = `circuito.${tramo}` as TranslationKey;
      this.hud.senal.mostrar(
        `circuito-${tramo}`,
        this.tier.instruments === "none" ? "" : t(clave),
        null,
        { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
      );
      /*
       * **Y se dice**, que era lo que faltaba.
       *
       * Las cuatro frases del circuito están escritas y grabadas desde que
       * hay pack de voz, y **no las decía nadie**: esto sacaba el dibujo y se
       * callaba. Jugando se nota justo donde más falta hace — «los giros no
       * los anuncia cuando doy la vuelta para volver a tomar la pista»—,
       * porque el dibujo de un tramo de circuito es una forma abstracta y la
       * frase es la que dice qué hacer.
       */
      this.instructor.decir(t(clave), clave);
    });

    /*
     * **Te mandan al aire.**
     *
     * La tarjeta **se queda puesta hasta que se resuelva**. Duraba lo que dura
     * un aviso —unos segundos— y se iba sola, así que quien estaba mirando la
     * pista se la perdía y llegaba abajo sin saber que le habían dicho que no:
     * «me sale esto al aterrizar», con la pantalla del percance de sorpresa.
     * Una orden no es un aviso de paso: es de la familia de «pará en la doble
     * raya» y «frená», que se quedan hasta que alguien hace algo.
     *
     * Y el porqué cambia lo que se ve, porque no lo dice el mismo: la torre
     * enciende su lámpara —o planta una vaca en la zona de toma, que es lo que
     * tiene un campo privado en vez de torre—, y la aproximación no
     * estabilizada no enciende nada, solo dice cuál de los cinco motivos es.
     */
    this.hechos.on("mandaronIrseAlAire", ({ porque, motivo }) => {
      if (porque === "pistaOcupada") {
        if (this.scenario.aerodrome?.privado) {
          const [x, z] = this.enLaPista(this.scenario.runway.length / 2 - 150);
          this.vaca.poner(
            x,
            this.terrain.sampleHeight(x, z),
            z,
            (this.scenario.runway.heading * Math.PI) / 180,
          );
        } else {
          // Roja, pero la del aire: «¡al aire!», no «esperá acá». Ver
          // `Hud.setLuzDeTorre`.
          this.luzDeTorre("roja", "alAire");
        }
        // Y a partir de aquí la luz la lleva la torre.
        this.laTorreMandaEnLaLuz = true;
      }
      const dicho = this.avisoCon(
        porque === "pistaOcupada"
          ? "vuelo.mandanFrustrar"
          : "vuelo.noEstabilizada",
        "palabra.alAire",
      );
      this.hud.senal.mostrar(
        "frustrada",
        porque === "pistaOcupada"
          ? dicho.rotulo
          : this.rotuloCompuesto(
              `${t(`motivo.${motivo}` as never)}. ${dicho.texto}`,
              "palabra.alAire",
            ),
        null,
        { segundos: Infinity, prioridad: URGENTE },
      );
      this.avisar("peligro");
      /*
       * **Y la voz dice por qué, no solo qué hacer.**
       *
       * El motivo lo llevaba la tarjeta —«Vas muy despacio. Venís mal para
       * bajar…»— y la voz no, porque los seis motivos no estaban grabados. A
       * los cuatro años la voz **es** el canal, y una orden sin motivo no
       * enseña: enseña a obedecer. Ahora se pide la receta que junta las dos
       * piezas, y si no existe se cae sola a la de siempre. Ver `recetaDe`.
       */
      const conMotivo =
        porque === "noEstabilizada" && motivo
          ? `${dicho.id}+${motivo}`
          : dicho.id;
      this.cantar(
        porque === "pistaOcupada" ? "go around, runway occupied" : "go around",
        porque === "pistaOcupada"
          ? dicho.texto
          : `${t(`motivo.${motivo}` as never)}. ${dicho.texto}`,
        conMotivo,
      );
    });

    /*
     * **La pista vuelve a ser tuya.** La lámpara se enciende en verde y se
     * apaga sola en cuanto pasa el aviso: en el aire no hay lámpara que mirar,
     * y dejarla encendida diría algo que ya no es verdad.
     */
    this.hechos.on("pistaLibreOtraVez", () => {
      /*
       * **Y lo primero: retirar la orden de la pantalla.**
       *
       * La orden se pinta con prioridad URGENTE y `segundos: Infinity`, que es
       * lo correcto —es una orden y espera respuesta, no caduca sola—. Pero
       * levantarla solo mostraba la tarjeta verde, que es IMPORTANTE, o sea
       * **de menos prioridad**: la roja no se dejaba desplazar y se quedaba
       * puesta para siempre. Se vio jugando: «me ordena una frustrada, la
       * hago, pero el símbolo no se quita nunca aunque me dice "la torre ya te
       * deja"».
       *
       * La voz sonaba y la pantalla decía lo contrario, que es la peor de las
       * dos formas de estar mal. `caducar` está escrito justo para esto: para
       * lo que deja de ser verdad.
       */
      this.hud.senal.caducar("frustrada");
      this.laTorreMandaEnLaLuz = true;
      this.luzDeTorre("verde");
      const libre = this.avisoCon("vuelo.puedeVolver", "palabra.volve");
      this.hud.senal.mostrar("verde", libre.rotulo, null, {
        segundos: SE_QUEDA_EL_ARO,
        prioridad: IMPORTANTE,
      });
      this.avisar("success");
      // «cleared to land» no tiene variantes y no las va a tener: es
      // fraseología fija. Ver `audio/variantes.ts`.
      this.cantar("cleared to land", libre.texto, libre.id);
      this.agenda.luego(SE_QUEDA_EL_ARO, () => {
        if (this.laAproximacion.mandanFrustrar) return;
        this.luzDeTorre(null);
        this.laTorreMandaEnLaLuz = false;
      });
    });
  }

  /**
   * Una llamada de la torre, **con tu matrícula y el número de pista**.
   *
   * La fraseología estaba grabada entera y suelta —«cleared for take-off» y ya
   * está—, o sea una torre que nunca te llama por tu nombre, que no es una
   * torre: es un altavoz. Ahora se monta: las cinco letras de tu matrícula, la
   * pista en uso cifra a cifra —y de qué lado, donde hay dos paralelas— y la
   * orden. «Zulu Papa Yankee Victor Alfa, runway zero three left, cleared for
   * take-off.»
   *
   * Y el número de pista no es un adorno: es **lo único que hay escrito en el
   * suelo de un aeropuerto**, y está pintado justo delante del morro mientras
   * la torre lo dice. A los cuatro años eso son dos cifras que aparecen siempre
   * en el mismo sitio; a los diez, un rumbo. Ver `cabeceraEnUso`.
   *
   * Si la receta no se puede montar —falta una pieza, no hay cabecera— se pide
   * igual y el pack ya decide: la dice entera la voz del navegador antes que
   * quedarse a medias. Ver `recetaDe`.
   */
  private porRadio(dice: string, urgencia: Urgencia = "normal"): void {
    const base = claveDeTorre(dice);
    if (!base) return;
    const montada = this.deTorre(base, this.miIndicativo);
    if (montada) {
      this.torre.decir(montada.texto, montada.clave, urgencia, montada.relleno);
    }
  }

  /**
   * Una llamada de la torre montada entera: a quién, con qué pista y cómo
   * suena.
   *
   * Está aparte porque **la torre no habla solo con vos**. La misma cuenta
   * vale para la autorización que te dan a vos y para la que le dan al que va
   * delante, y tener dos copias de ella era la manera segura de que un día una
   * dijera la pista y la otra no.
   */
  private deTorre(
    base: string,
    quien: Indicativo,
  ): { clave: string; relleno: Record<string, string>; texto: string } | null {
    const dice = DICE_LA_TORRE[base];
    if (!dice) return null;
    const relleno: Record<string, string> = rellenoDe(quien);
    // Y con la voz de este campo, que es lo que hacía que una torre sonara a
    // dos personas. Ver `comoSeDiceAqui` en `i18n/habla.ts`.
    let clave = comoSeDiceAqui(base, hablaDe(this.scenario.aerodrome?.id));
    const pista = NOMBRA_LA_PISTA.has(base)
      ? pistaEnPiezas(cabeceraEnUso(this.scenario))
      : null;
    if (pista) {
      Object.assign(relleno, pista.relleno);
      clave = `${clave}${pista.sufijo}`;
    }
    /*
     * Y el texto va montado también, no solo la receta: es lo que dice la voz
     * del navegador cuando no hay pack, y lo que se lee si algún día esto sale
     * en una tarjeta. Que el respaldo diga menos que la grabación es de las
     * cosas que hacen que un fallo de audio parezca un fallo del juego.
     */
    const texto = pista
      ? `${quien.dicho}, runway ${pista.dicho}, ${dice}`
      : `${quien.dicho}, ${dice}`;
    return { clave, relleno, texto };
  }

  /**
   * La luz de la torre, **y su voz**.
   *
   * Un solo sitio, y a propósito: la lámpara se encendía desde cuatro puntos
   * distintos del juego y ninguno decía nada. Con esto, encender la luz **es**
   * hablar por la radio, y no se puede hacer lo uno sin lo otro.
   *
   * Solo habla cuando la luz **cambia**: el último de esos cuatro sitios corre
   * cada fotograma, y una torre que repite la misma orden sesenta veces por
   * segundo no es una torre, es una avería.
   */
  private luzDeTorre(
    luz: "verde" | "roja" | null,
    rojaDice: "esperar" | "alAire" = "esperar",
  ): void {
    this.hud.setLuzDeTorre(luz, rojaDice);
    const cual = luz === null ? null : `${luz}:${rojaDice}`;
    if (cual === this.ultimaLuzDeTorre) return;
    this.ultimaLuzDeTorre = cual;
    if (!luz) return;
    /*
     * **Y la dice como se dice aquí.** La torre no habla el castellano del
     * juego: habla el de su campo, y en Canarias eso quiere decir sin vosear y
     * con otra voz. La clave cambia con el habla porque el pack de voz busca
     * por clave — ver `i18n/habla.ts`.
     */
    const base =
      luz === "verde"
        ? "torre.verde"
        : rojaDice === "alAire"
          ? "palabra.alAire"
          : "torre.roja";
    const clave = comoSeDiceAqui(
      base,
      hablaDe(this.scenario.aerodrome?.id),
    ) as TranslationKey;
    /*
     * La orden de irse al aire **corta lo que haya**: es la única de las tres
     * que no puede esperar a que termine una frase. Las otras dos son normales
     * y se ponen en la cola de la boca como todo lo demás. Ver `audio/boca.ts`.
     */
    const urgencia =
      rojaDice === "alAire" && luz === "roja" ? "urgente" : "normal";
    /*
     * **Y la lámpara te llama por tu matrícula.**
     *
     * Una torre que nunca te llama por tu nombre no es una torre, es un
     * altavoz. Lo hacía solo la fraseología en inglés, y desde que ésa se
     * guardó para los peldaños de arriba —a los cuatro años el inglés no
     * enseña nada y decía dos veces lo mismo— en Guyrami no se oía la
     * matrícula ni una vez en todo el vuelo. Ahora la dice la lámpara, que es
     * la que se oye siempre y en los cuatro peldaños.
     *
     * Y sale gratis de grabación: el alfabeto ya estaba grabado con las dos
     * voces de torre —se grabó para la radio en inglés— y un hueco no sabe en
     * qué idioma va la frase de después. Ver `flight/matricula.ts`.
     */
    const yo = this.miIndicativo;
    this.torre.decir(
      t(clave, { indicativo: yo.dicho }),
      clave,
      urgencia,
      rellenoDe(yo),
    );

    /*
     * **Y detrás, la misma orden en fraseología de verdad.**
     *
     * No se pisan: la boca hace cola y las dice una tras otra, con su silencio
     * en medio. Ver `audio/boca.ts`.
     *
     * Y esa pareja **es la lección**. `i18n/habla.ts` ya lo tenía escrito: «lo
     * que no cambia es el inglés aeronáutico —`cleared for take-off` se dice
     * igual en Tenerife, en Asunción y en cualquier torre del mundo—, y esa es
     * media lección del juego». El castellano del sitio dice qué hay que
     * hacer, para quien tiene cuatro años y no lee; el inglés dice cómo se
     * llama eso en una radio, para cuando tenga diez. Ver `audio/torre.ts`.
     *
     * **Pero lo dice la misma persona.** El inglés se dice igual en los dos
     * campos, sí; no lo dice la misma voz. La lámpara la decía la torre canaria
     * y la radio la torre de casa, así que en Tenerife se oía una orden y un
     * segundo después la misma orden con otra voz: «voz de hombre primero y
     * luego de mujer». Ahora la torre canaria tiene su juego entero grabado
     * —su alfabeto, sus cifras y sus cinco órdenes— y la clave lleva el habla,
     * como la de la lámpara. Ver `comoSeDiceAqui`.
     */
    const enRadio =
      luz === "verde"
        ? "cleared for take-off"
        : rojaDice === "alAire"
          ? "go around, runway occupied"
          : "hold short of the runway";
    /*
     * **Pero no en los dos peldaños de abajo.**
     *
     * La pareja castellano + inglés es la lección, y la lección tiene su edad:
     * a los cuatro años el inglés no enseña nada y lo que hace es decir dos
     * veces lo mismo cada vez que la torre abre la boca. Se oyó así: «¿por qué
     * se oye la locución en español y justo después lo mismo pero en inglés
     * siempre?».
     *
     * En Guyrami y en Tukã se dice lo que hay que hacer, y ya. De Taguató para
     * arriba —que es donde ya hay cifras y rumbos en pantalla— se dice además
     * cómo se llama eso en una radio de verdad, que es lo que servirá a los
     * diez. La escalera de peldaños es exactamente para esto.
     */
    if (
      this.tier.instruments === "numeric" ||
      this.tier.instruments === "full"
    ) {
      this.porRadio(enRadio, urgencia);
    }
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
    if (s.onGround && s.groundSpeed <= 2 && c.throttle > 0.05) {
      c.throttle = 0;
      this.hud.flash(t("hud.engineBusy"));
      return;
    }
    if (!s.onGround || s.groundSpeed > 2) {
      this.hud.flash(t("hud.engineBusy"));
      return;
    }
    c.engineOn = !c.engineOn;
    this.hud.flash(t(c.engineOn ? "hud.engineOn" : "hud.engineOff"));
  }

  resetFlight(): void {
    this.percance = null;
    // Todo lo de venir a aterrizar se reinicia de una vez, que es lo que gana
    // tenerlo junto: antes eran cinco líneas repartidas por este método.
    this.laAproximacion.reiniciar();
    this.avisadoDeLaSenda = false;
    this.laTorreMandaEnLaLuz = false;
    this.vaca.quitar();
    // Otro vuelo, otra traza: la raya del anterior ya está guardada.
    this.traza = [];
    this.sinCatar = 0;
    this.duracion = 0;
    // Lo que quedaba apuntado era del vuelo anterior: una pantalla de percance
    // de una partida que ya no existe, saliendo encima de la que empieza.
    this.agenda.vaciar();
    this.hud.cerrarFinDeVuelo();
    this.dichoDeLaToma = false;
    this.avisadoDeLaPasada = false;
    // Una cuenta atrás a medias de un vuelo que ya no existe.
    this.avisosDeAltura.reiniciar();
    this.alturaEnGrande.reiniciar();
    // Y el otro avión vuelve a empezar su vuelo con nosotros, y **con otro
    // nombre**: es otro avión, no el mismo dando vueltas para siempre.
    this.radio.reiniciar(this.scenario.aerodrome?.id);
    callar();
    /*
     * **Y todo lo que el paso siguiente va a leer.**
     *
     * Esto reiniciaba lo que se ve —la traza, las tarjetas, los avisos— y se
     * dejaba una docena de variables que el primer fotograma del vuelo nuevo
     * lee antes de que nadie las escriba: la vista del plan y la petición de
     * freno del vuelo anterior, la última lectura del PAPI —así que la primera
     * del vuelo nuevo no contaba como primera—, la distancia al umbral, el
     * gesto del señalero, el tope de la carrera y los contadores de avisos.
     * Ninguna rompe nada de golpe, y esa es justo la clase de resto que hace
     * que el segundo vuelo no se parezca al primero.
     *
     * Y los segundos sin apuntar se vuelcan en vez de tirarse: son tiempo
     * volado de verdad, y tirarlos era regalarle hasta medio minuto al
     * cuaderno en cada reinicio.
     */
    if (this.sinApuntar > 0) {
      this.apuntar({ segundos: this.cuaderno.segundos + this.sinApuntar });
      this.sinApuntar = 0;
    }
    this.vistaActual = null;
    this.pidiendoFreno = false;
    this.antesAlUmbral = Infinity;
    this.gestoEnPantalla = null;
    this.techoDeLaCarrera = Infinity;
    this.fueraDeBanda = 0;
    this.dichoDeBanda = null;
    this.terrenoDicho = null;
    this.avisandoDelBulto = 0;
    /*
     * Y lo de arriba va **antes** de la bifurcación, que es la otra mitad del
     * mismo problema: hay dos caminos de reinicio —éste y `reiniciarEnFinal`,
     * para las lecciones que empiezan en el aire— y lo que se reinicia en cada
     * uno se fue copiando a mano hasta divergir. Todo lo que sea «estado de
     * este vuelo» tiene que quedar limpio por los dos.
     */
    const { runway } = this.scenario;
    if (this.leccion.arranque === "aire") return this.reiniciarEnFinal();
    // El plan se reinicia **antes** de colocar el avión: es él quien decide si
    // hoy se sale del puesto o de la cabecera, y de eso depende dónde y hacia
    // dónde aparece.
    const rodando =
      this.plan?.reiniciar(this.leccion.arranque === "pista") ?? false;
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
      this.contarLaMision();
      this.updateMissionMarker();
    }
    this.runwayGuide.reset();
    this.landing.reset();
    this.frustrada.reiniciar();
    this.reiniciarGalones();
    this.wasOnGround = true;
    this.yaDespego = false;
    this.wasStalled = false;
    this.wasCrashed = false;
    this.input.releaseAll();
    this.hud.tutor.reset();
    /*
     * **Vuelo nuevo: la instructora se olvida de lo que ya había dicho.**
     *
     * `callar()` solo corta lo que esté sonando y **no** borra la memoria de lo
     * dicho, que es lo que impide repetirse. Eso es a propósito: cambiar de
     * aeronave también llama a `callar`, y con la memoria borrada volvía a
     * soltar «arrancá el motor» en cada cambio — «con una vez que lo diga,
     * bien». Aquí sí empieza un vuelo, así que aquí sí se olvida. Ver
     * `audio/boca.ts`.
     */
    BOCA.empezarDeCero();
    this.megafonia.reiniciar();
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
    /*
     * **El circuito, primero de todo.**
     *
     * Va antes de la puerta de las luces porque no depende de ellas: un campo
     * de hierba sin balizas ni PAPI **también tiene circuito** —de hecho es
     * donde más se nota, porque no hay nada más que mirar—. Estaba después y
     * en Yvytu Rape no salía ninguno.
     */
    this.ponerCircuito();
    this.ponerTrafico();
    /*
     * **Y solo donde las hay.**
     *
     * Esto se montaba en cualquier aeródromo, y en un campo de hierba de
     * novecientos metros aparecían las luces de aproximación y un PAPI —cuatro
     * luces grandes al costado del umbral— que ahí no existen ni de lejos. Se
     * vio jugando en Yvytu Rape: «las luces blanco, blanco, blanco… rojo,
     * ¿significan algo? Yo ya tenía autorización para despegar». Significan
     * algo, sí, pero para aterrizar de noche en un aeropuerto con luces, y ese
     * campo no lo es.
     *
     * Lo dice el propio fichero: `lit`. Una pista con luces de borde tiene
     * detrás toda la instalación —balizamiento, PAPI, luces de aproximación—
     * y una pista sin ellas no tiene ninguna. Un campo de hierba se queda con
     * su manga, que es lo que tiene de verdad.
     */
    if (!pista.lit) return;
    if (this.aproximacion) {
      this.scene.remove(this.aproximacion.grupo);
      this.aproximacion.dispose();
      this.aproximacion = null;
    }
    this.aproximacion = crearAproximacion(
      pista,
      cabeceraEnUso(this.scenario),
      (p) => this.terrain.sampleHeight(p[0], -p[1]),
      // Y si el fichero trae las luces mapeadas, el PAPI va donde está de
      // verdad y no donde lo pondríamos nosotros. Ver `sitiarPapi`.
      this.scenario.aerodrome?.visualAids ?? [],
    );
    if (this.aproximacion) this.scene.add(this.aproximacion.grupo);

    /*
     * Y las azules de las calles de rodaje, que son las que dibujan el
     * aeropuerto de noche. Van aquí porque necesitan el mismo suelo que las
     * de aproximación: montadas antes de moldear el terreno acaban enterradas.
     */
    if (this.rodadura) {
      this.scene.remove(this.rodadura.grupo);
      this.rodadura.dispose();
      this.rodadura = null;
    }
    if (this.scenario.aerodrome) {
      this.rodadura = crearLucesDeRodadura(this.scenario.aerodrome, (p) =>
        this.terrain.sampleHeight(p[0], -p[1]),
      );
      if (this.rodadura) {
        this.scene.add(this.rodadura.grupo);
        this.rodadura.ponerSol(this.sky.sunDirection.y);
      }
    }
    /*
     * Y si esta pista tiene PAPI, la pantalla puede explicarlo. Se pregunta
     * aquí y no cada fotograma porque la respuesta no cambia en todo el vuelo.
     */
    this.laAproximacion.hayPapi =
      !!this.aproximacion?.grupo.getObjectByName("papi");
    this.laAproximacion.papiEnPantalla = null;
  }

  /**
   * La radio: si el otro avión tiene algo que decir, se oye y se lee.
   *
   * Todo lo que decide está en `flight/radio.ts`. Aquí solo se le pasa el
   * momento —qué fase, si hay luz y si el instructor está hablando— y se
   * reparte lo que conteste entre la voz y la pantalla, que es la regla de
   * siempre: **cada aviso hablado tiene su gemelo escrito**.
   *
   * **La voz suena en todos los peldaños; la tira escrita, no.** En Guyrami
   * no hay texto en pantalla porque a los cuatro años no se lee, y una tira
   * de letras ahí no la ve nadie. Pero oír que hay otro avión sí se entiende
   * a los cuatro, y es justo la edad a la que más dice: no estás solo en el
   * mundo, y la pista es de todos.
   */
  private oirLaRadio(dt: number): void {
    /*
     * **Y solo donde hay alguien con quien compartir la frecuencia.**
     *
     * Sonaba en todas partes, y en un campo de hierba privado eso es mentira:
     * ahí no viene otro. «Volé sobre el aeródromo de hierba, no escuché torre
     * y no veo mucho sentido a que diga que viene otro, porque en esos
     * aeródromos normalmente no viene otro.»
     *
     * Y no es solo verosimilitud: la radio de este juego existe para enseñar
     * que **la pista es de todos**, y esa lección solo se puede dar donde de
     * verdad hay más gente. En la pista de la granja lo que se aprende es lo
     * contrario, que es igual de cierto y más bonito: estás vos solo.
     */
    /*
     * **Y la megafonía de cabina, que solo habla donde hay pasaje.**
     *
     * Va antes que la radio a propósito: si las dos quieren hablar en el mismo
     * fotograma, manda la de dentro del avión. La de fuera es ambiente y puede
     * esperar; la comandante está contando lo que está pasando ahora.
     */
    const anuncio = this.megafonia.paso(dt, {
      fase: this.faseDeAhora as Fase,
      conPasaje: conPasaje(this.aircraft.mass),
      instructorHablando: this.instructor.hablando,
    });
    if (anuncio) {
      const texto = t(anuncio);
      this.capitana.decir(texto, anuncio, "baja");
      if (this.tier.instruments !== "none") this.hud.radio(texto);
    }

    if (this.scenario.aerodrome?.privado) return;
    this.trafico?.paso(dt);
    const dice = this.radio.update(dt, {
      fase: this.faseDeAhora,
      deDia: this.sky.sunDirection.y > 0,
      instructorHablando: this.instructor.hablando,
    });
    if (!dice) return;

    /*
     * **Y lo primero que se hace con una llamada es colocar a quien la hace.**
     *
     * Antes de decidir cómo suena, porque eso es lo que la vuelve verdad: se
     * anuncia y el avión está ahí. Va con la matrícula y no con el indicativo
     * dicho, que es la misma cosa escrita de dos maneras y solo una de las dos
     * sirve de llave.
     *
     * También con las de la torre: «line up and wait» y «cleared for takeoff»
     * mueven a alguien, y el que las recibe es `dice.de`. Ver `caminosDe`.
     */
    this.trafico?.anuncia(dice.de.matricula, dice.clave);

    /*
     * **Cuando la que habla es la torre, se le habla a otro.**
     *
     * Y es la mitad de lo que hace que esto suene a un aeropuerto: oír a la
     * torre decir una matrícula que no es la tuya, y a alguien contestarle.
     * Sale gratis de grabación porque las frases de la torre ya se grabaron
     * con el hueco del indicativo puesto —se hizo para poder llamarte a vos—,
     * y un hueco no sabe de quién es. Ver `flight/radio.ts`.
     */
    if (dice.voz === "torre") {
      const montada = this.deTorre(dice.clave, dice.de);
      if (!montada) return;
      this.torre.decir(montada.texto, montada.clave, "baja", montada.relleno);
      if (this.tier.instruments !== "none") this.hud.radio(montada.texto);
      return;
    }

    /*
     * **Y el indicativo se monta, no está escrito.**
     *
     * El texto lleva un hueco —`{indicativo}`— y la receta grabada lleva otros
     * cinco —`{c1}`…`{c5}`—, uno por letra. Los dos se rellenan aquí con el
     * mismo avión, así que lo que se lee y lo que se oye son el mismo.
     *
     * Y esa es la gracia de verdad: con veintiséis sílabas grabadas suena
     * cualquier indicativo, y el alfabeto aeronáutico se oye una y otra vez
     * **en contexto**, que es como se aprende sin estudiarlo. Ver
     * `flight/matricula.ts` y `recetaDe` en `audio/banco-de-voz.ts`.
     */
    const texto = t(dice.clave as TranslationKey, {
      indicativo: dice.de.dicho,
    });
    /*
     * **Y el otro avión habla en voz baja**, en el sentido de la boca: lo suyo
     * es ambiente y no puede quitarle el turno a una instrucción. Sin esto, un
     * «en final» del otro avión le robaba la plaza a la autorización de la
     * torre. Ver `Urgencia` en `audio/boca.ts`.
     */
    this.otroAvion.decir(texto, dice.clave, "baja", rellenoDe(dice.de));
    if (this.tier.instruments !== "none") this.hud.radio(texto);
  }

  /**
   * El circuito de tráfico de la cabecera en uso.
   *
   * Se monta con la aproximación porque depende de lo mismo —qué cabecera se
   * está usando— y se rehace cuando cambia el viento: un circuito dibujado
   * para la otra punta de la pista es un circuito que lleva al revés.
   */
  private ponerCircuito(): void {
    if (this.circuito) {
      this.scene.remove(this.circuito.grupo);
      this.circuito.dispose();
      this.circuito = null;
    }
    this.laAproximacion.tramoDelCircuito = null;
    if (!this.tier.circuito) return;
    this.circuito = crearCircuito(
      this.scenario.runway,
      this.terrain.runwayElevation,
      (x, z) => this.terrain.sampleHeight(x, z),
      // El circuito de **este** avión: el del de fuselaje ancho es tres veces
      // el de la avioneta. Ver `escalaDeCircuito`.
      escalaDeCircuito(this.aircraft.approachSpeed),
    );
    this.circuito.grupo.visible = false;
    this.scene.add(this.circuito.grupo);
  }

  /**
   * El tráfico que se oye, puesto en el aire.
   *
   * Va aparte del circuito dibujado y **no se gasta con él**: el hilo ocre es
   * una ayuda que los peldaños de arriba se quitan, y el otro avión no es una
   * ayuda — está ahí porque está. Pero vuela por los mismos cinco vértices y
   * con la misma escala, que es lo que hace que lo que se oye y lo que se ve
   * sean el mismo vuelo.
   *
   * Y no lo lleva quien lo dibuja, lo lleva quien lo oye: si un día la radio
   * calla en este campo —una pista privada—, aquí no aparece nadie.
   */
  private ponerTrafico(): void {
    if (this.trafico) {
      this.scene.remove(this.trafico.grupo);
      this.trafico.dispose();
      this.trafico = null;
    }
    if (!this.scenario.aerodrome || this.scenario.aerodrome.privado) return;
    /*
     * **Y no tiene tu silueta.** Ver tu propio avión pasando por el viento en
     * cola es un espejo, no un vecino: lo primero que se aprende mirando al
     * cielo de un aeródromo es que no todos son iguales. Se coge el entrenador,
     * o el biplano si el entrenador sos vos.
     */
    const mia = modeloPorId(this.aircraft.id)?.silueta;
    const otra = FLOTA.find((m) => m.silueta !== mia)?.silueta;
    if (!otra) return;
    this.trafico = crearTrafico(
      this.scenario.runway,
      this.terrain.runwayElevation,
      otra,
      manoDelCircuito(
        this.scenario.runway,
        this.terrain.runwayElevation,
        (x: number, z: number) => this.terrain.sampleHeight(x, z),
      ),
      escalaDeCircuito(this.aircraft.approachSpeed),
    );
    this.scene.add(this.trafico.grupo);
  }

  /**
   * Sube el aeródromo hasta quedar justo por encima de la fotografía.
   *
   * Trescientas veintiséis líneas que solo tocaban el escenario, el terreno
   * y las teselas: son construcción de mundo y viven en
   * `src/world/asentar-aerodromo.ts`. Segundo corte de #30.
   */
  private asentarAerodromoSobreLaFoto(): void {
    const alzado = asentarAerodromoSobreLaFoto(
      this.scenario,
      this.terrain,
      this.teselas,
    );
    // `null` es «aquí no hay foto que respetar», que no es lo mismo que
    // haberlo subido cero: se deja como estaba.
    if (alzado !== null) this.alzadoDelAerodromo = alzado;
  }

  /** Cuánto hubo que subir el aeródromo sobre el datum. Para poder mirarlo. */
  alzadoDelAerodromo = 0;

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
    const empezado = this.input.controls.engineOn || s.groundSpeed > 0.5;
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
  /**
   * Vuelve a montar la senda de aros con la cabecera que haya ahora.
   *
   * Se tira la anterior y se construye otra porque sus cotas y su eje van
   * horneados en la geometría; es lo mismo que ya se hace con la cinta de guía
   * del rodaje, y por el mismo motivo.
   */
  private rehacerLaSenda(): void {
    const estaba = this.runwayGuide.group.parent !== null;
    this.scene.remove(this.runwayGuide.group);
    this.runwayGuide = new RunwayGuide(
      this.scenario,
      this.terrain.runwayElevation,
      (x: number, z: number) => this.terrain.sampleSurface(x, z),
      /*
       * **Desde donde están las luces del PAPI**, que es desde donde se cuenta
       * una senda de verdad. Con los aros contados desde el umbral, volar por
       * su centro dejaba al PAPI del mundo marcando cuatro rojas: tres sendas
       * en la misma pantalla y ninguna de acuerdo. Ver `SENDA_DESDE`.
       */
      this.aproximacion?.papiAdentro ?? SENDA_DESDE,
    );
    if (estaba) this.scene.add(this.runwayGuide.group);
    this.runwayGuide.reset(this.flight.state.position);
  }

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
      this.aircraft,
    );
    this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
    // Y se vuelve a enseñar solo si esta lección lo enseñaba. Ver dónde se monta.
    if (this.leccion.guiaEnTierra) {
      this.scene.add(this.plan.grupo);
      this.colocarSenalero();
    }
  }

  /**
   * Pone los cuatro ajustes donde tienen efecto.
   *
   * Se llama al arrancar y cada vez que se cambia uno. Todos son de aplicar
   * ahora mismo: nada de aquí pide reiniciar el vuelo, que es de las cosas
   * que más molestan cuando llevas media hora volando.
   */
  aplicarAjustes(ajustes: Ajustes = this.ajustes): void {
    this.ajustes = ajustes;
    this.reducedMotion = conMovimientoReducido(
      ajustes,
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    );
    /*
     * **Y se lo decimos a la hoja de estilos, que es donde está casi todo el
     * movimiento.**
     *
     * Esto se quedaba en una variable de TypeScript que solo mira la cámara.
     * La hoja tiene diez `@media (prefers-reduced-motion: reduce)` —el latido
     * de los pictogramas, el rebote de la lupa del plano, el desplazamiento
     * del HUD— y todas miran el ajuste **del sistema**, no el del juego. O
     * sea que la fila «Movimiento: reducido» de los ajustes, que existe
     * precisamente para quien no puede o no sabe tocar el ajuste del sistema,
     * no apagaba ni una animación. Con la marca en la raíz, el CSS puede
     * atender a las dos.
     */
    document.documentElement.classList.toggle(
      "sin-movimiento",
      this.reducedMotion,
    );
    this.input.ponerSignoDeCabeceo(signoDeCabeceo(ajustes));
    // Y si el avión de hoy mete las patas, que decide si hay palanca de tren.
    this.input.ponerAeronave(this.aircraft.trenRetractil);
    // Las unidades: manda el peldaño salvo que alguien haya dicho otra cosa.
    this.hud.setUnits(unidadesElegidas(ajustes) ?? this.tier.units);
    // Y el tamaño, que es una escala sobre el tacto y la letra del HUD.
    document.documentElement.style.setProperty(
      "--escala-hud",
      String(ESCALA[ajustes.tamano]),
    );
    /*
     * El contraste es una marca en la raíz y nada más: la hoja redefine los
     * mismos tokens con otros valores y ni un componente se entera. Ver
     * `:root[data-contraste="alto"]` en `style.css`.
     */
    document.documentElement.dataset.contraste = ajustes.contraste;
    /*
     * **Y el sonido, que ahora se manda desde dos sitios.**
     *
     * El botón del HUD y la fila de ajustes son dos mandos sobre una cosa. El
     * botón ya guarda al pulsarse; esto es el otro sentido — cambiar la fila
     * tiene que mover el audio de verdad, y además dejar el glifo de la
     * esquina diciendo la verdad, que si no se contradicen a la vista.
     */
    const nivel = this.audio.ponerNivel(ajustes.volumen);
    this.hud.setSoundLevel(nivel.glyph, t(`sound.${nivel.id}` as never));
  }

  /**
   * Ponerse o quitarse las gafas. Lo llama su botón.
   *
   * No hace nada si todavía no se han ganado, que es la única regla: el botón
   * no existe hasta entonces, pero una tecla o un banco pueden llamar igual.
   */
  alternarGafas(): void {
    if (!this.gafas.ganadas) return;
    const puestas = !this.gafas.puestas;
    ponerseLasGafas(puestas);
    this.llevarLasGafas({ ganadas: true, puestas });
    this.hud.flash(t(puestas ? "gafas.puestas" : "gafas.quitadas"), 1.6);
  }

  /**
   * Pone las gafas donde tienen efecto: el botón, el cristal y el sol.
   *
   * Las tres cosas en un sitio, porque son la misma: quitar una y dejar las
   * otras deja al juego diciendo dos cosas distintas sobre lo mismo — el
   * botón encendido y el mundo sin teñir.
   */
  private llevarLasGafas(gafas: Gafas): void {
    this.gafas = gafas;
    this.hud.setGafas(gafas.ganadas, gafas.puestas);
    /*
     * El tinte es una marca en la raíz, como el contraste: la hoja de estilos
     * enciende el cristal que hay entre el lienzo y el HUD. Ver `style.css`.
     */
    if (gafas.puestas) document.documentElement.dataset.gafas = "puestas";
    else delete document.documentElement.dataset.gafas;
    // Y el deslumbre, que es la otra mitad y la que se nota volando de cara
    // al sol de la tarde. Ver `world/sky.ts`.
    this.sky.ponerDeslumbre(gafas.puestas ? DESLUMBRE.con : DESLUMBRE.sin);
  }

  /** Pone una hora del día. Lo llama el panel del tiempo. */
  ponerHora(hora: number): void {
    this.sky.ponerHora(hora);
    // Y con ella se enciende o se apaga el balizamiento. `sunDirection.y` es
    // el seno de la altura del sol, que el cielo acaba de recalcular.
    this.rodadura?.ponerSol(this.sky.sunDirection.y);
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
    /*
     * **Y el avión se entera, que era lo que faltaba.**
     *
     * El viento existía en todas partes menos donde importa: el panel lo
     * enseñaba, la manga lo señalaba, la torre elegía cabecera con él y el
     * METAR lo traía de verdad — y el motor de vuelo calculaba la velocidad
     * respecto al aire con la velocidad inercial. Despegar con quince nudos de
     * cola y con quince de cara era exactamente lo mismo, que es lo contrario
     * de lo que este juego enseña. Ver `ponerViento` y `perfilDeViento`.
     */
    const aire = vientoComoVector(meteo);
    this.flight.ponerViento(aire.x, aire.z);
    /*
     * **Y las nubes del parte, que estaban ahí sin usar.**
     *
     * `Meteo.techoM` se leía del METAR desde el primer día —la base de las
     * nubes sobre el aeropuerto— y no la miraba nadie: el cielo lo ponían solo
     * los tres botones. Así que se podía pedir el tiempo de verdad de un día
     * cerrado en Tenerife y volar con el cielo azul. Ahora el parte pone su
     * nube, y con ella su altura de decisión.
     */
    this.ponerTecho(
      meteo.techoM,
      meteo.techoM === null ? 0 : meteo.techoM < 300 ? 0.9 : 0.45,
    );
    /*
     * **Y el agua del parte.** `Meteo.lluvia` sale del grupo de tiempo presente
     * del METAR —`RA`, `+TSRA`, `DZ`— y hasta hoy no la miraba nadie: se podía
     * pedir el tiempo de verdad de un día de tormenta en Tenerife y volar con
     * el cielo despejado y seco. Ver `world/lluvia.ts`.
     */
    this.ponerLluvia(meteo.lluvia, meteo.fuerzaDeLluvia);
    this.terrain.rehacerAerodromo(this.scenario);
    // Y las luces de aproximación, que van en la cabecera por la que se entra:
    // si el viento gira, se mudan al otro extremo con todo lo demás.
    this.ponerAproximacion();
    this.rehacerPlanDeVuelo();
    this.hud.mapa.rehacer(this.scenario);
    /*
     * **Y la senda de aros, que se quedaba en la cabecera vieja.**
     *
     * `RunwayGuide` hornea la pista en su geometría al construirse, y aquí se
     * rehacían el aeródromo, las luces de aproximación, el plan y el plano
     * —todo lo que depende de por dónde se entra— menos ella. Con el viento
     * girado, los aros quedaban a nueve kilómetros y medio de donde tocaba y
     * el juego seguía midiendo contra ellos. Medido con `npm run viento`.
     */
    this.rehacerLaSenda();
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

  /**
   * Pone la nube a una altura **sobre el aeródromo**.
   *
   * El banco de nubes vive en coordenadas del mundo, así que aquí se suma la
   * cota de la pista: un techo de cuarenta y cinco metros son cuarenta y cinco
   * sobre el asfalto tanto en Asunción, que está a ochenta y nueve, como en
   * Tenerife Norte, que está a seiscientos treinta y dos. Es como se mide un
   * techo de verdad y como venía del METAR.
   */
  /**
   * Pone el agua que cae.
   *
   * Y con ella la visibilidad: **la lluvia tapa**, y esa es la mitad de lo que
   * enseña un día malo. Un aguacero deja el horizonte en un par de kilómetros
   * aunque el METAR diga diez, porque el METAR mide desde la torre y quien
   * vuela mira a través de veinte kilómetros de agua.
   */
  ponerLluvia(clase: Lluvia, fuerza: number): void {
    this.lloviendo = { clase, fuerza };
    this.lluvia?.poner(clase, fuerza);
    const espesa =
      clase === "nada"
        ? 0
        : (clase === "llovizna" ? 0.4 : 1) * (0.3 + 0.7 * fuerza);
    this.sky.fog.density = this.nieblaDeCasa * (1 + espesa * 5);
  }

  /**
   * Un fotograma de lluvia: mueve las gotas y alumbra si hay rayo.
   *
   * El fogonazo entra por la luz del sol y no por una capa blanca encima de la
   * pantalla: un relámpago ilumina **el mundo**, y lo que se ve de él es el
   * suelo y las nubes encendiéndose un cuarto de segundo. Una cortina blanca
   * delante sería un flash de cámara.
   */
  private pasoDeLluvia(dt: number): void {
    if (!this.lluvia) return;
    const alumbra = this.lluvia.paso(
      dt,
      this.camera.position,
      this.flight.state.velocity,
    );
    if (alumbra > 0 || this.fogonazoAnterior > 0) {
      this.sky.ponerDeslumbre(1 + alumbra * 2.2);
      /*
       * **Y el trueno con el rayo, no después.**
       *
       * Un trueno de verdad llega segundos más tarde —el sonido tarda tres
       * segundos por kilómetro— y esa espera es preciosa y aquí no vale: a los
       * cuatro años, un ruido que llega cinco segundos después del destello no
       * es el mismo suceso. Suena con él y su fuerza dice lo cerca que cayó.
       */
      if (alumbra > 0 && this.fogonazoAnterior === 0)
        this.audio.trueno(this.lloviendo.fuerza);
      this.fogonazoAnterior = alumbra;
    }
    this.audio.ponerLluvia(
      this.lloviendo.clase,
      this.lloviendo.fuerza,
      this.flight.state.airspeed,
    );
  }

  /** Lo que alumbraba el rayo del fotograma anterior. Ver `pasoDeLluvia`. */
  private fogonazoAnterior = 0;

  ponerTecho(techoM: number | null, tapadura: number): void {
    this.techoDeNubes = techoM;
    if (!this.sky) return;
    ponerNubes(
      this.sky,
      techoM === null ? null : this.terrain.runwayElevation + techoM,
      tapadura,
    );
  }

  /** Vuelve a pedir el parte de verdad y lo pone. */
  /** Vuelve a pedir el parte de verdad y lo pone. Público para el banco. */
  async tiempoDeVerdad(): Promise<void> {
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
    this.laAproximacion.reiniciar();
    this.reiniciarGalones();
    this.wasOnGround = false;
    this.wasStalled = false;
    this.wasCrashed = false;
    this.hud.tutor.reset();
    // Vuelo nuevo, memoria nueva. Ver la nota de arriba.
    BOCA.empezarDeCero();
    this.megafonia.reiniciar();
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

  /**
   * Un fotograma: **uno o varios pasos del mundo, y un solo dibujo**.
   *
   * Acelerar el reloj es repetir el paso, no alargarlo, y la diferencia no es
   * de estilo. Alargándolo se probó primero, que es lo obvio: se multiplica el
   * `dt` y listo. La física aguanta —`fdm.step` parte cualquier paso en trozos
   * pequeños por dentro—, pero **lo que decide el juego no se parte**: mirar
   * el terreno, cambiar de fase, corregir el rumbo, atender al sígame. Eso
   * pasa una vez por fotograma, así que con el reloj a ocho el juego tomaba
   * ocho veces menos decisiones por segundo de vuelo. Medido: el mismo vuelo
   * que se completaba entero se salía de la pista y acababa en percance —7 de
   * 11 comprobaciones en vez de 10—. No estaba midiendo el mismo juego.
   *
   * Repitiendo el paso, cada paso es el de siempre y el mundo toma las mismas
   * decisiones a los mismos intervalos. Lo único que se salta es **pintar**,
   * que es lo caro —en los bancos, con la tarjeta gráfica emulada por
   * software, es casi todo el tiempo— y lo único que a un banco no le importa.
   */
  private frame = (): void => {
    // El reloj del medidor, antes que nada: lo que mide es el tiempo de
    // pared entre fotogramas, que es lo único que se corresponde con lo que
    // se ve. Apagado, esto son dos restas. Ver `ui/rendimiento.ts`.
    this.medidor.empezarCuadro(performance.now());
    const real = Math.min(this.clock.getDelta(), MAX_PASO);
    /*
     * Y los pasos se recortan si el fotograma ya es largo de por sí. En una
     * máquina lenta —o con la tarjeta emulada por software, que es como corren
     * los bancos— ocho pasos de un fotograma de cuarenta milisegundos son un
     * tercio de segundo de vuelo entre una lectura y la siguiente. Ver
     * `LO_QUE_VALE_UN_CUADRO`.
     */
    const caben = Math.max(1, Math.floor(LO_QUE_VALE_UN_CUADRO / real));
    for (let i = 0; i < Math.min(this.aceleracion, caben); i++)
      this.unPaso(real);
    this.pintar();
    this.medidor.update(real);
  };

  /** Un paso del mundo. Lo de siempre, sin pintar. Ver `frame`. */
  private unPaso = (dt: number): void => {
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
    this.relojDelJuego += dt;
    // Lo apuntado para dentro de un rato, con este reloj y no con el de pared.
    this.agenda.paso(dt);

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

    /*
     * **Y pasarse del final de la pista rodando también se acabó.**
     *
     * Es el final de una carrera de aterrizaje que no frenó a tiempo, y hasta
     * hoy no pasaba nada: el avión salía al campo a ciento cincuenta por hora
     * y seguía rodando entre los matorrales. En un aeropuerto eso es un
     * incidente con nombre propio —salida de pista por el final— y aquí es lo
     * que enseña para qué sirve el freno que la tarjeta lleva pidiendo desde
     * que se tocó tierra.
     */
    /*
     * **Y «pasarse del final» es pasarse por delante.** Se medía con el valor
     * absoluto de la distancia al centro de la pista, así que tocar corto
     * —sesenta metros antes del umbral, que es un aterrizaje malo pero es lo
     * contrario de este— sacaba el dibujo de la pista que se acaba con el
     * avión saliéndose por la punta. Lo que cuenta es hacia dónde se va: si el
     * avión mira al otro extremo, quedarse corto no es salirse.
     */
    const [fx, fz] = delante((this.flight.state.heading * 180) / Math.PI);
    const [rx, rz] = delante(r.heading);
    const avance = fx * rx + fz * rz >= 0 ? ejes.along : -ejes.along;
    if (
      this.flight.state.onGround &&
      this.vistaActual?.fase === "aterrizado" &&
      this.flight.state.airspeed > ROCE &&
      avance > r.length / 2 + FINAL_DE_PISTA
    ) {
      this.sufrirPercance("pasada");
    }

    /*
     * **Con un percance puesto, el avión no se mueve.**
     *
     * El intento se acabó: lo único que queda es mirar el dibujo y volver a
     * empezar. Se para aquí y no en el modelo de vuelo porque no es física —el
     * avión no está roto en ningún sentido que el modelo entienda— sino la
     * regla del juego, igual que no dejar despegar fuera de la pista.
     */
    /*
     * **Las horas de vuelo, que es de lo que va un cuaderno.**
     *
     * Se cuentan con las ruedas en el aire y se guardan cada medio minuto: no
     * hace falta más precisión —nadie mira los segundos— y escribir en el
     * almacenamiento sesenta veces por segundo sería absurdo.
     */
    if (!this.flight.state.onGround) {
      this.sinApuntar += dt;
      if (this.sinApuntar > CADA_CUANTO_SE_APUNTA) {
        this.apuntar({ segundos: this.cuaderno.segundos + this.sinApuntar });
        this.sinApuntar = 0;
      }
    }

    /*
     * **Y por dónde se va pasando**, que es lo que después se dibuja.
     *
     * Se cata cada pocos segundos, en el suelo y en el aire: la vuelta del
     * puesto a la pista es parte del vuelo y en el plano se reconoce igual que
     * el circuito. En coordenadas del fichero —la Y del norte es la Z negativa
     * del mundo—, que es el sistema en el que ya está dibujado el plano.
     */
    this.duracion += dt;
    this.sinCatar += dt;
    if (this.sinCatar >= CADA_CUANTO_SE_CATA) {
      this.sinCatar = 0;
      const p = this.flight.state.position;
      this.traza.push([Math.round(p.x), Math.round(-p.z)]);
    }

    if (this.percance) {
      this.syncAircraftMesh(dt);
      this.updateCamera(dt);
      updateSky(this.sky, this.camera.position);
      this.hud.senal.update(dt);
      /*
       * **Y el motor se calla.**
       *
       * La mezcla sigue al avión una vez por paso, unas líneas más abajo, y
       * desde aquí no se llega nunca. Así que un percance dejaba el motor
       * rugiendo al gas que tuviera en el último fotograma **para siempre**,
       * detrás de la pantalla del golpe. `sufrirPercance` pone el gas a cero
       * pero nadie volvía a leerlo.
       */
      this.audio.update(this.flight.state, this.input.controls);
      /*
       * Y aquí **no se pinta**: lo hace el fotograma, una sola vez. Pintar
       * también aquí era pintar dos veces por cuadro —y con el reloj a
       * dieciséis, diecisiete veces—, con el medidor de rendimiento contando
       * todas como si fueran fotogramas.
       */
      return;
    }

    /*
     * **De qué está hecho el suelo de debajo**, que el modelo de vuelo no
     * sabe de aeródromos. Va antes de pilotar porque lo usa el paso de este
     * fotograma. Ver `world/superficie.ts`.
     */
    this.superficie = superficieEn(
      this.scenario,
      this.pavimento,
      this.flight.state.position.x,
      this.flight.state.position.z,
    );
    this.flight.ponerSuperficie(this.superficie);

    this.input.update(dt);
    // El piloto de pruebas hace de teclado, así que va donde va el teclado: y
    // **la ayuda va después de quien pilota**, no antes. Puestas al revés, el
    // mando del jugador borraba la asistencia y los cuatro peldaños daban
    // exactamente el mismo número.
    this.pilotoDePruebas?.(this.input.controls);
    this.limitarElRodaje();
    this.asistirRodaje(dt);
    if (this.flight.state.crashed) {
      /*
       * **Romper el avión es un percance como los demás.**
       *
       * Antes volvía solo a la pista a los dos segundos, sin decir nada: el
       * avión se rompía, la pantalla parpadeaba y de repente estabas otra vez
       * en la cabecera sin saber muy bien qué había pasado. Con la pantalla —el
       * dibujo del golpe y el botón de volver a empezar— se entiende **qué**
       * pasó y quién decide seguir, que es lo que se pidió: «el avión no debe
       * seguir, pero se le presenta con algo gracioso pero significativo».
       *
       * Y la vuelta automática se queda de red: si nadie toca el botón en
       * ocho segundos, el juego reinicia solo. A los cuatro años, una pantalla
       * que no se va nunca es una pantalla rota.
       */
      this.sufrirPercance("golpe");
    } else {
      this.antesDelPaso.copy(this.flight.state.position);
      // Con un instrumento abierto —el plano, el tiempo— el avión se
      // mantiene solo. Ver `mantenerElVueloRecto`.
      if (this.hayInstrumentoAbierto) this.mantenerElVueloRecto();
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
    if (aviso) this.cantar(aviso.dice, aviso.encasa);

    /*
     * **Y el número en grande, que es otro peldaño.**
     *
     * Salía siempre, en los cuatro tramos y en los seis escalones de la cuenta
     * atrás: a los cuatro años, un «30» apareciendo en el centro de la pantalla
     * mientras se recoge no es información, es una cosa que parpadea. Los
     * números son el peldaño de Taguato —150, 100 y 50 sobre la pista, tres
     * veces y grandes— y ahí sí enseñan a leer una altura. Ver
     * `flight/escalera.ts`.
     */
    const grande = this.alturaEnGrande.paso(
      this.flight.state.heightAboveGround,
      !this.flight.state.onGround,
    );
    if (grande && canalesDe(this.tier.avisos).cifra) {
      this.hud.flash(
        `${grande.dice} ${UNIT_SYSTEMS[this.tier.units].altitudeLabel()}`,
        1.6,
      );
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
        CORRIENDO.has(this.faseDeAhora),
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
    /*
     * **Y sobre el asfalto de la pista no se habla de velocidad. Ninguna voz.**
     *
     * Ésta es la tercera vez que se arregla el mismo «Más despacio» en plena
     * carrera de despegue, y las dos anteriores se arreglaron en el sitio
     * equivocado: el aviso de rodaje de `plan-de-vuelo` —ver `rapido`—, que ya
     * mira `onRunway` y que no era el que hablaba. **El que hablaba es éste**,
     * que es otro lazo, en otro fichero, con otra cuenta y sin una sola línea
     * que mire dónde están las ruedas. Acelerando por la pista la banda se
     * pone en «rápido» a los tres segundos y suelta «Más despacio» con el gas
     * a fondo.
     *
     * «Lo que quiero es que cuando despego no me diga una voz "más despacio",
     * que llevo un millón de veces que te lo digo.» Y llevaba razón las tres.
     *
     * La regla es la de siempre y ahora está en los dos sitios: **en una pista
     * la velocidad es el asunto**, y ahí no se avisa de nada —ni corriendo
     * para despegar, ni frenando después de tocar—. Se avisa en las calles,
     * que es donde una curva se pasa por ir rápido, y en el aire, que es donde
     * la velocidad de aproximación significa algo.
     */
    const enElAsfalto =
      this.flight.state.onGround && this.flight.state.onRunway;
    if (enElAsfalto) {
      // Y se olvida lo acumulado: al salir de la pista se empieza a contar de
      // cero, que si no el aviso salta en la primera curva de la calle por lo
      // que pasó en la carrera.
      this.fueraDeBanda = 0;
      this.dichoDeBanda = null;
    }
    if (!enElAsfalto && (banda === "lento" || banda === "rapido")) {
      this.fueraDeBanda += dt;
      if (this.fueraDeBanda > 3 && this.dichoDeBanda !== banda) {
        this.dichoDeBanda = banda;
        /*
         * Rodando no se dice «airspeed», que es palabra de vuelo: se dice lo
         * que diría cualquiera en una calle de rodaje. Y en el aire,
         * «airspeed» es lo que dice una cabina de verdad — dice las dos cosas
         * a la vez, «mira la velocidad»; cuál de las dos ya lo dice el color.
         */
        /*
         * **Y en el aire, si ya no queda gas que quitar, se dice cómo.**
         *
         * «Vas muy rápido» con el motor al ralentí es un aviso sin salida:
         * bajando por la senda, un avión limpio con el gas cortado acelera, y
         * eso es física y no un fallo. Lo que era un fallo es lo que faltaba
         * después de la frase — **el juego tiene flaps y no los mencionaba en
         * ningún sitio**: ni aquí, ni en la voz, ni en un dibujo. Así que
         * quien lo oía se quedaba con dos mandos que no sirven para eso.
         *
         * Lo dijo quien lo juega, bajando a La Palma: «"vas muy rápido", dice;
         * pues como no apague el motor y me tire en picado contra Breña Baja,
         * yo ya no sé».
         *
         * Un piloto frena con la resistencia, no con el gas: los flaps son el
         * mando que sobra. Solo se dice cuando de verdad no queda otra cosa
         * que hacer —gas casi cerrado y flaps todavía arriba—, que es cuando
         * el consejo es el consejo y no ruido.
         */
        const sinGasQueQuitar =
          !this.flight.state.onGround &&
          banda === "rapido" &&
          this.input.controls.throttle < 0.25 &&
          this.input.controls.flaps < 0.5;
        if (sinGasQueQuitar) {
          this.hud.senal.mostrar(
            "flaps",
            this.rotulo("vuelo.pediFlaps", "palabra.flaps"),
            null,
            {
              segundos: SE_QUEDA_EL_ARO,
              prioridad: IMPORTANTE,
              tecla: nombreDeTecla(this.input.preferredKey("flaps")),
            },
          );
          this.cantar("flaps", t("vuelo.pediFlaps"), "vuelo.pediFlaps");
        } else {
          const suave = this.flight.state.onGround
            ? "vuelo.despacio"
            : "vuelo.rapido";
          this.cantar(
            this.flight.state.onGround ? "slow down" : "airspeed",
            t(suave),
            suave,
          );
        }
      }
    } else {
      this.fueraDeBanda = 0;
      this.dichoDeBanda = null;
    }

    this.atenderAlTren(dt);

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
        this.faseDeAhora === "final" &&
        !fueraDeLaSenda(
          this.distanceToRunway(),
          this.flight.state.position.y - this.cotaDeLaPistaAqui(),
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
      /*
       * **Y no despegando, que es la tarjeta contraria.**
       *
       * Las condiciones de «ya podés tocar» —en el aire, sobre la pista, bajo
       * y sin subir— las cumple también el instante en que las ruedas se
       * despegan del asfalto: medido en el banco, sale a 28 m/s y un metro de
       * altura, entre el motor y la flecha de tirar. Ahí lo que hay que hacer
       * es justo lo contrario de tocar.
       */
      !EN_DESPEGUE.has(this.faseDeAhora as Fase) &&
      cerca.sobreLaPista &&
      /*
       * **La altura sobre la pista, no sobre el terreno.** Antes del umbral el
       * suelo puede estar mucho más abajo —en Tenerife Norte cae setenta
       * metros en un kilómetro— y la altura sobre el terreno diría que se va
       * altísimo justo cuando se está cruzando la valla.
       */
      this.flight.state.position.y - this.cotaDeLaPistaAqui() <
        ALTURA_DE_TOMA &&
      this.flight.state.verticalSpeed < 1;
    if (puedeTocar && !this.dichoDeLaToma) {
      this.dichoDeLaToma = true;
      this.vecesQueDijoToca++;
      this.hud.senal.mostrar(
        "toma",
        this.rotulo("vuelo.yaPodesTocar", "palabra.toca"),
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
      this.instructor.decir(t("vuelo.yaPodesTocar"), "vuelo.yaPodesTocar");
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
      this.flight.state.position.y - this.cotaDeLaPistaAqui() >
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
    if (renuncio) {
      // Y si te lo habían mandado, la orden se levanta: la pista vuelve a ser
      // tuya y la vaca se va, que para eso se hace la pasada.
      const mandada = this.laAproximacion.mandanFrustrar;
      if (mandada) this.laAproximacion.levantarLaOrden();
      /*
       * **Y aquí se acaba el trabajo de este trozo: contarlo.**
       *
       * Antes seguían cuatro llamadas a mano —la tarjeta, el sonido, el
       * cuaderno y la voz— dentro del método que se da cuenta de que ha habido
       * frustrada. O sea que para darse cuenta de algo había que saber de
       * pantalla, de audio, de cuaderno y de instructor. Ver `src/hechos.ts`.
       */
      this.hechos.emit("frustrada", { mandada });
    }
    /*
     * **Y el aviso no se rearma con un parpadeo.**
     *
     * Un aviso que va y viene cada segundo deja de ser un aviso: es una voz
     * pesada, y lo peor que le puede pasar a la única frase del juego que tiene
     * que interrumpir es que se aprenda a desoírla. Ver `terrenoTranquiloDesde`.
     */
    this.terrenoTranquiloDesde = terreno ? 0 : this.terrenoTranquiloDesde + dt;
    const puedeAvisar =
      this.terrenoDicho === null || this.terrenoTranquiloDesde >= SE_REARMA;
    if (terreno && terreno !== this.terrenoDicho && puedeAvisar) {
      this.terrenoDicho = terreno;
      this.hud.senal.mostrar(
        "terreno",
        terreno === "sube"
          ? this.rotulo("vuelo.terrenoSube", "palabra.subi")
          : this.rotulo("vuelo.terrenoBajo", "palabra.subi"),
        null,
        // Por debajo del aviso de bulto: los dos saltan a la vez volando bajo
        // sobre la ciudad, y el que dice qué hacer es el que nombra el bulto.
        { segundos: 3, prioridad: IMPORTANTE },
      );
      /*
       * **Y «subí» suena a peligro, no a error.**
       *
       * Sonaba con el motivo de `error`, que es el de «se rompió el avión» y
       * el de una toma dura. Este es el aviso más urgente que da el juego —el
       * suelo viene— y es el único que tiene que **interrumpir**, no informar.
       * La propia ficha de `peligro` lo dice con esas palabras: «terreno, un
       * edificio delante». Se contaba una cosa en la documentación y sonaba
       * otra, y para quien depende del sonido como segundo canal eso es un
       * canal menos.
       */
      this.avisar(terreno === "sube" ? "peligro" : "attention");
      // En inglés aeronáutico, como el resto de la voz de cabina.
      const cual =
        terreno === "sube" ? "vuelo.terrenoSube" : "vuelo.terrenoBajo";
      this.cantar(
        terreno === "sube" ? "terrain, pull up" : "too low",
        t(cual),
        cual,
        // El único aviso que **interrumpe** en vez de informar. Ver `peligro`.
        "urgente",
      );
    } else if (!terreno && this.terrenoTranquiloDesde >= SE_REARMA) {
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
    /*
     * **Y solo bajando**, que los aros son de la aproximación.
     *
     * Con el avión en el aire bastaba: se despegaba, se cruzaba el plano de un
     * aro subiendo y salía «pasaste por debajo, subí un poco» en mitad de una
     * carrera de despegue. «¿Por qué el símbolo del aro en el despegue? Eso no
     * es para el aterrizaje?» Sí lo es: un aro dice por dónde bajar, y quien
     * está subiendo no está bajando por ninguna senda.
     */
    /*
     * **Y solo acercándose**, que los aros son de la aproximación.
     *
     * Con el avión en el aire bastaba: se despegaba, se cruzaba el plano de un
     * aro subiendo y salía «pasaste por debajo, subí un poco» en mitad de una
     * carrera de despegue. «¿Por qué el símbolo del aro en el despegue? Eso no
     * es para el aterrizaje?» Sí lo es: un aro dice por dónde bajar.
     *
     * Se miró primero si el avión subía, y no vale: en una aproximación se
     * corrige, se sube un poco y se vuelve a bajar, así que el instante en que
     * se cruza el aro puede pillarte subiendo — el banco lo enseñó a la
     * primera. Lo que distingue de verdad un despegue de una aproximación es
     * hacia dónde vas: **acercándote al umbral o alejándote de él**.
     */
    const alUmbral = this.distanceToRunway();
    const acercandose = alUmbral < this.antesAlUmbral - 0.05;
    this.antesAlUmbral = alUmbral;
    const aro =
      this.flight.state.onGround || !acercandose
        ? null
        : this.runwayGuide.check(this.flight.state.position);
    if (aro === "cruzado") this.avisar("aro");
    else if (aro === "perdido") {
      this.avisar("aroFallado");
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
      /*
       * **Y si te lo habían dicho y lo arreglaste, se nota.**
       *
       * El juego solo sabía decir cuándo ibas mal: te avisaba de que estabas
       * alto, corregías, y se callaba. Callarse no es lo mismo que decir que
       * lo hiciste bien, y a los cuatro años esa diferencia es todo.
       *
       * Solo después de un aviso, que es lo que lo separa de un premio de
       * máquina: no se felicita por cruzar un aro —eso ya tiene su destello y
       * su galón— sino por **haber corregido**. Quien venía bien desde el
       * principio no oye nada, y hace bien.
       */
      if (donde === null && this.avisadoDeLaSenda && this.seVenLosAros) {
        this.avisadoDeLaSenda = false;
        this.hechos.emit("loCorregiste", {});
      }
      /*
       * **Y solo si los aros se ven.**
       *
       * El objeto de la senda se construye siempre —hay código que lo reinicia
       * y lo consulta— pero su geometría solo entra en la escena en la lección
       * de aterrizar. Los veredictos, en cambio, salían en todas: en la de
       * despegar y en la de dar una vuelta, el juego te decía que ibas por
       * encima **de un aro que no estaba dibujado en ninguna parte**. Quien lo
       * jugó lo dijo tal cual: «me dice que baje porque estoy por encima del
       * aro si no hay aro».
       *
       * Un aviso que se refiere a algo que no se ve no enseña nada: confunde.
       * Y la regla de la casa es que nada juzgue por un canal que quien juega
       * no tiene delante.
       */
      if ((donde === "alto" || donde === "bajo") && this.seVenLosAros) {
        this.avisadoDeLaSenda = true;
        this.hud.senal.mostrar(
          donde === "alto" ? "aro-alto" : "aro-bajo",
          this.rotuloDelAro(donde),
          null,
          { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
        );
        // Y de las formas que tiene, una: éste es de los que más se repiten
        // en una aproximación. Ver `audio/variantes.ts`.
        const cual = unaForma(
          donde === "alto" ? "vuelo.aroAlto" : "vuelo.aroBajo",
        );
        this.cantar(
          donde === "alto" ? "too high, come down" : "too low, climb",
          cual.texto,
          cual.id,
        );
      }
    }
    this.laAproximacion.paso({
      estado: this.flight.state,
      acercandose,
      circuito: this.circuito,
      faseDeAhora: this.faseDeAhora,
      techoDeNubes: this.techoDeNubes,
      terrenoDicho: this.terrenoDicho,
      vueloTerminado: this.vueloTerminado,
    });
    /*
     * **El aire, que no está quieto.**
     *
     * La ráfaga va cada fotograma y el viento del parte solo cuando cambia: son
     * dos cosas distintas —el dato del día y lo que pasa ahora— y por eso entran
     * por puertas distintas. Ver `flight/turbulencia.ts`.
     */
    const aire = {
      sobreElSuelo: this.flight.state.heightAboveGround,
      vientoKt: this.scenario.meteo?.vientoKt ?? 0,
      baseDeNubes:
        this.techoDeNubes === null
          ? null
          : this.terrain.runwayElevation + this.techoDeNubes,
      altura: this.flight.state.position.y,
    };
    const racha = rachaEn(this.clock.elapsedTime, aire);
    this.flight.ponerRacha?.(racha.x, racha.y, racha.z);
    this.atenderAlCinturon(cuantoSeMueve(aire), dt);
    this.atenderALaSobrevelocidad(dt);

    this.oirLaRadio(dt);
    this.syncAircraftMesh(dt);
    this.updateCamera(dt);
    updateSky(this.sky, this.camera.position);
    this.pasoDeLluvia(dt);

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
       * Y la firma de quien fotografió lo que se está viendo, que cambia con
       * cada tesela y es la condición de uso. Ver `Teselas.atribucion`.
       */
      this.hud.setAtribucion(this.teselas.atribucion);
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
        /*
         * **Y se recoloca el avión aunque no se haya escrito una sola cota.**
         *
         * Esto solo recolocaba cuando el moldeado había cambiado alturas, y el
         * suelo se mueve también sin escribir ninguna: `subirTodo` sube el mapa
         * entero el desfase del datum —cuarenta y siete metros en Tenerife— y
         * el suelo lejano pasa a mandar de la fotografía. Medido en La Palma
         * después de cambiar la cabecera en uso: el avión arrancaba **tres
         * metros bajo tierra** en su puesto, y de ahí no salía nada bueno.
         *
         * Recolocar cuesta nada y no toca a quien ya está volando ni a quien ya
         * ha arrancado: ver `recolocarTrasElMoldeado`.
         */
        this.recolocarTrasElMoldeado();
        void escritos;
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
      TRAQUETEO[this.superficie],
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
        /*
         * Y lo que hacen los motores, para el EICAS del centro. Uno por motor
         * y en su orden; hoy todos dan lo mismo porque el modelo de vuelo lleva
         * un solo empuje, y el día que haya un motor parado esto ya lo enseña.
         */
        motores: Array.from({ length: this.aircraft.motores }, () =>
          regimen(
            this.aircraft,
            this.input.controls.throttle,
            this.input.controls.engineOn,
          ),
        ),
        rotuloDeMotor: cuadroDe(this.aircraft).rotulo,
        flaps: this.input.controls.flaps,
        /*
         * Y las escalas de **este** avión, que es lo que hace que la cinta de
         * velocidad de la cabina diga la verdad. Sin ellas se dibujaba con una
         * escala inventada igual para los seis — el mismo fallo que ya se
         * arregló una vez en las esferas del HUD. Ver `ui/cuadro.ts`.
         */
        cuadro: cuadroDe(this.aircraft),
        /*
         * **Y el peldaño, que es lo que decide si aquí dentro hay letras.**
         *
         * El cuadro plano crecía con la escalera y las pantallas de la cabina
         * no se enteraban: el mismo avión en el peldaño de los pequeños
         * enseñaba fuera un cuadro sin una palabra y dentro, a diez
         * centímetros de la cara, «IAS», «ALT», «V/S», «GS», «HDG» y once
         * cifras. Y la de dentro es la que mira quien vuela desde la cabina.
         */
        peldano: peldanoDe(this.tier.instruments),
        patas: patasDe(this.aircraft),
        tren: this.input.controls.tren,
        sobreElSuelo: this.flight.state.groundSpeed,
        sobreElTerreno: this.flight.state.heightAboveGround,
        perdida:
          !this.flight.state.onGround &&
          this.flight.state.alpha > this.aircraft.aero.alphaStall,
        // Y adónde vas, que es de lo que va una pantalla de navegación:
        // «¿por qué no tengo datos como distancia al aeropuerto?».
        objetivo: this.aDondeVoy,
        viento: this.vientoDeHoy,
      },
      dt,
    );
    /*
     * Y los relojes del panel, que marcan lo que el juego sabe de verdad: el
     * régimen de cada motor y los flaps. El régimen sale del **mismo sitio que
     * el sonido** —ver `regimen` en `ui/cuadro.ts`—: si la aguja dijera una cosa
     * y el motor sonara otra, el instrumento dejaría de ser un instrumento.
     */
    /*
     * Y las patas, donde toque. Es la mitad visible del tren: la otra —la
     * resistencia que quita meterlo— se siente pero no se ve, y un mando que
     * no cambia nada en la pantalla no parece un mando. Ver `world/patas.ts`.
     */
    this.aircraftMesh.patas?.poner(this.input.controls.tren);
    this.aircraftMesh.relojes?.actualizar(
      {
        motores: Array.from({ length: this.aircraft.motores }, () =>
          regimen(
            this.aircraft,
            this.input.controls.throttle,
            this.input.controls.engineOn,
          ),
        ),
        flaps: this.input.controls.flaps,
        peldano: peldanoDe(this.tier.instruments),
        rpmMaximas: this.aircraft.sound.maxRpm,
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
      // Y si la reversa está metida, que se vea: es el motor empujando al revés.
      this.input.controls.reversa > 0 && this.flight.state.onGround,
      /*
       * Y lo que el cuadro de mandos necesita y antes no le llegaba: los
       * flaps —que se movían en el ala y no en ningún instrumento—, adónde se
       * va y de dónde sopla. Con esto la pantalla de navegación deja de ser un
       * adorno y la regla de flaps dice la verdad.
       */
      {
        flaps: this.input.controls.flaps,
        tren: this.input.controls.tren,
        objetivo: this.aDondeVoy,
        viento: this.vientoDeHoy,
      },
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
      /*
       * Y si viene **de verdad** en final, que es el mismo embudo que usan los
       * mínimos y la orden de irse al aire. Antes se le pasaba la distancia
       * cruda a la cabecera, y con eso el consejo de aflojar el motor salía
       * dando una vuelta por el valle, a veinte metros de una ladera.
       */
      enElEmbudoDeFinal(
        this.scenario.runway,
        this.flight.state.position.x,
        this.flight.state.position.z,
      ) !== null,
      /*
       * Y si hay raya verde a la que seguir. El último consejo del tutor es
       * «seguí la raya y salí de la pista», y en una pista en medio del campo
       * —los escenarios inventados, sin calles ni plataforma— no hay ni raya
       * ni salida. Ver `Tutor.update`.
       */
      (this.plan?.rutaVisible().length ?? 0) > 1,
    );
    this.avanzarPlan(dt);
    this.atenderAlSenalero(dt);
    this.contarGalones(dt, banda, aro, toma, renuncio);
    this.hud.senal.update(dt);
  };

  /**
   * Pintar, cronometrado.
   *
   * `render` **encola** el trabajo para la tarjeta y vuelve, así que este
   * número no es lo que cuesta dibujar: es lo que cuesta preparar el dibujo
   * —recorrer la escena, ordenar, mandar—. Lo que la tarjeta tarde de verdad
   * aparece en el hueco entre fotogramas, que es el otro número del cartel.
   * Los dos juntos sí dicen dónde se está yendo el tiempo.
   */
  private pintar(): void {
    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.medidor.apuntarPintado(performance.now() - t0);
  }

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
        this.hechos.emit("teLoPasaste", {});
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
        this.hechos.emit("gestoDelSenalero", { gesto: enPantalla });
      } else {
        // Reponer, no volver a anunciar. Ver `soloLaTarjeta`.
        this.faseAnunciada = "";
        this.soloLaTarjeta = true;
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
    /*
     * Y en un campo particular no hay coche: no lo hay de verdad. El sígame
     * existe porque un aeropuerto tiene cincuenta calles y aviones grandes
     * moviéndose, no porque sí. Ver `Aerodrome.privado`.
     *
     * Pero sí hay quien te sale a buscar. Allí es una bici, y una bici no se
     * pone delante de un avión que va a despegar: **solo sale a la vuelta**,
     * cuando ya tocaste tierra y hay que llegar hasta el puesto. Ir de ida por
     * un campo que se ve entero desde el puesto no necesita guía.
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
      const enBici = this.sigueme.enBici;
      const rodando = enBici
        ? // La bici, solo de vuelta. Ver arriba.
          fase === "aterrizado" ||
          fase === "abandonando" ||
          fase === "a-plataforma"
        : fase === "estacionado" ||
          fase === "arrancando" ||
          fase === "rodando" ||
          fase === "esperando" ||
          /*
           * **Y no en «autorizado»: un sígame no entra en la pista.**
           *
           * Con la luz verde dada, el coche volvía a salir y se ponía delante
           * para llevarte al eje — «el coche se vuelve a mostrar después de
           * haberme dado paso, para guiarme por encima del césped»—. Un coche de
           * plataforma deja al avión en el punto de espera y se aparta: de ahí
           * en adelante manda la torre, y en la pista no hay más que aviones.
           */
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
      const donde = this.sigueme.donde;
      const aQue = donde
        ? Math.hypot(donde.x - s.position.x, donde.z - s.position.z)
        : Infinity;
      /*
       * **Y a la bici se le deja sitio siempre.**
       *
       * El coche se deja atropellar porque es un chiste y porque enseña algo:
       * en una plataforma no se adelanta. Una persona en bicicleta, no. Así
       * que en cuanto la tenés a tiro —lo que tarda en echarse a un lado,
       * contado en metros: ver `SITIO_PARA_LA_BICI`— se aparta y te deja
       * pasar, y el percance de más abajo no se le aplica. Lo que aprende quien juega sigue siendo lo mismo: detrás de
       * quien te guía, no encima.
       */
      const cede = gesto !== null || (enBici && aQue < SITIO_PARA_LA_BICI);
      this.sigueme.paso(
        dt,
        { x: s.position.x, z: s.position.z },
        rodando && s.onGround && !(fase === "aterrizado" && !espera),
        cede,
        (x, z) => this.terrain.sampleHeight(x, z),
        espera,
        this.plan?.avanceEnLaRuta,
      );

      /*
       * **Y si se le pasa por encima, se acabó el vuelo.**
       *
       * «Con el avión puedo adelantar al coche. Le paso por encima.» Se
       * arregló que no se pudiera adelantar —el tope de rodaje— pero un coche
       * al que se puede atravesar sigue siendo un decorado. Ahora está: es lo
       * único que se mueve por la plataforma además del avión, y atropellarlo
       * termina el intento con su dibujo.
       *
       * Ocho metros: la envergadura de el Pykasu son once, así que esto es
       * tocarlo con el tren, no pasarle cerca.
       */
      /*
       * **Y a un coche ya apartado no se le atropella.**
       *
       * Es la misma regla de la bici de arriba, y por el mismo motivo: lo que
       * enseña esto es que no se adelanta a quien te guía. El coche que ha
       * llegado a la boca de tu puesto, ha parado y se ha echado once metros
       * a un lado ya no te guía — está aparcado. Ver `yaSeAparto`.
       */
      const coche =
        enBici || this.sigueme.yaSeAparto ? null : this.sigueme.donde;
      if (coche && s.onGround && s.airspeed > ROCE) {
        const d = Math.hypot(coche.x - s.position.x, coche.z - s.position.z);
        if (d < ATROPELLO) this.sufrirPercance("coche");
      }
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
    this.avisar("achieved");
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
  /**
   * ¿Las ruedas están sobre la pista o sobre su franja?
   *
   * Es lo que decide si una toma cuenta como aterrizaje o como «te posaste en
   * el campo», y por eso no usa `runwayRemaining`: aquella mide **cuánta pista
   * queda**, que es otra pregunta, y fuera del asfalto contesta infinito. Con
   * ella, tocar un metro antes del umbral era aterrizar en un descampado.
   * Ver `LA_FRANJA`.
   */
  private tocoEnElCampoDeVuelo(): boolean {
    const r = this.scenario.runway;
    const { along, across } = enEjesDePista(
      this.flight.state.position.x,
      this.flight.state.position.z,
      r.x,
      r.z,
      r.heading,
    );
    return (
      Math.abs(across) < r.width && Math.abs(along) < r.length / 2 + LA_FRANJA
    );
  }

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
   * Ciento cuarenta líneas que solo miraban el estado del vuelo, los mandos,
   * el peldaño, el paso del plan y el techo de la carrera: la regla vive en
   * `src/flight/tope-de-rodaje.ts` y la cuenta, como siempre, en
   * `flight/gobernador.ts`. Tercer corte de #30.
   */
  private limitarElRodaje(): void {
    this.techoDeLaCarrera = limitarElRodaje(
      this.flight.state,
      this.input.controls,
      (v) => this.flight.gasParaRodar(v),
      this.tier,
      this.vistaActual,
      this.techoDeLaCarrera,
    );
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
    const anticipa = anticipacionDeRodaje(fuerza);
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
      this.soloLaTarjeta = true;
    }

    // La lámpara de la torre solo tiene sentido en tierra y antes de despegar:
    // es lo que se mira desde el punto de espera. En el aire no hay lámpara que
    // mirar, y dejarla encendida decía algo que ya no era verdad.
    const enTierraEsperando =
      this.leccion.torre &&
      (vista.fase === "esperando" ||
        vista.fase === "autorizado" ||
        vista.fase === "alineando");
    /*
     * **Y no se toca mientras la lleve la torre.**
     *
     * La orden de irse al aire enciende la lámpara en rojo y la pone en verde
     * al levantarla, y eso pasa **en el aire**. Esto corre después, en el
     * mismo paso, y la apagaba siempre que la fase no fuera una de las tres de
     * esperar en tierra: o sea, siempre que la orden estaba puesta. Las dos
     * luces de la torre existían, se encendían, y **no llegaban nunca a la
     * pantalla**. Ver `laTorreMandaEnLaLuz`.
     */
    if (!this.laTorreMandaEnLaLuz) {
      this.luzDeTorre(
        !enTierraEsperando
          ? null
          : vista.fase === "esperando"
            ? "roja"
            : vista.luzVerde
              ? "verde"
              : null,
      );
    }

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
      // Si esto es solo reponer la tarjeta que alguien tapó, se pone y ya: ni
      // voz, ni rótulo, ni campana. Ver `soloLaTarjeta`.
      const repuesta = this.soloLaTarjeta;
      this.soloLaTarjeta = false;
      /*
       * **Y alineado en la pista, su número.**
       *
       * El número de una pista es lo primero que un piloto lee en su vida y
       * lo único que hay escrito en el suelo de un aeropuerto: son las dos
       * primeras cifras del rumbo magnético al que apunta —la 09 mira al
       * este, la 27 al oeste—, y por eso las dos cabeceras de la misma pista
       * se llaman distinto y suman dieciocho.
       *
       * Sale en el mismo destello grande y tenue que V1 y Vr, y en el mismo
       * momento en que sale de verdad: cuando ya estás en el eje, mirando
       * hacia donde vas a despegar. A los cuatro años eso son dos cifras que
       * aparecen siempre en el mismo sitio; a los diez, un rumbo.
       */
      /*
       * **Y solo alineándose, no corriendo.**
       *
       * «Alineando» describe dos cosas que se parecen poco: ponerse en el eje
       * antes de dar gas, y corregir un desvío **en plena carrera**, que es
       * la misma fase porque la máquina mira lo mismo —en pista y torcido—.
       * Con el número saliendo en las dos, un bandazo a media carrera lo
       * volvía a sacar y de paso se comía el destello de Vr, que iba detrás.
       *
       * Salió con el back-taxi, donde el avión termina la media vuelta a
       * dieciséis metros del eje y se va acercando mientras acelera: cruzaba
       * el listón de los doce metros ya lanzado. Ver #151.
       */
      if (
        vista.fase === "alineando" &&
        this.flight.state.airspeed < ALINEANDO_DE_VERDAD
      ) {
        const cabecera = cabeceraEnUso(this.scenario);
        if (cabecera) this.hud.destellar(cabecera);
      }

      /*
       * **Y la torre dice lo que dice una torre.**
       *
       * Tenía siete frases grabadas y decía dos. Las otras cinco —«cleared for
       * take-off», «cleared to land», «go around», «hold short», «line up and
       * wait»— estaban grabadas, horneadas y bajadas a cada tablet **sin que
       * nada en `src/` las nombrara**. Se oyó jugando: «las voces de torre y
       * radio parece que se oyen, pero hay unas pocas frases». Ver
       * `audio/torre.ts`, que une lo que pide el código con lo que hay grabado
       * y tiene su prueba para que no vuelva a sobrar ninguna.
       *
       * Aquí va la del final, que es la única que no cuelga de la lámpara.
       * Las otras tres las dice `luzDeTorre`, detrás de su frase en castellano.
       *
       * **Y el primer intento fue por la fase «alineando», y no sonó nunca.**
       * Esa fase no existe en todos los campos: en Pettirossi el vuelo va
       * «autorizado → back-taxi → en vuelo» y no pasa por ella. Medido, no
       * deducido.
       */
      if (this.leccion.torre && !repuesta) {
        /*
         * **Y se autoriza al alinearse viniendo de la autorización, no cada
         * vez que la fase diga «alineando».**
         *
         * Esa fase describe dos cosas que se parecen poco —ponerse en el eje
         * antes de dar gas, y corregir un desvío **en plena carrera**, que la
         * máquina ve igual: en pista y torcido—. Un bandazo a media carrera
         * vuelve a «alineando» viniendo de «despegando», y una torre que
         * autoriza a despegar a un avión que ya va a treinta metros por
         * segundo no es una torre. Viniendo de «autorizado» solo se pasa una
         * vez, y es el momento de verdad.
         *
         * El primer intento miró la velocidad, como hace el destello del
         * número de pista, y no sonó nunca: al entrar en «alineando» el avión
         * ya viene rodando desde la calle. Medido en Pettirossi.
         */
        if (vista.fase === "final") this.porRadio("cleared to land");
      }
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
      /*
       * **Un despegue, al cuaderno.** Se cuenta al verse volando viniendo de
       * la carrera, que es cuando ha pasado de verdad: antes de eso hay un
       * avión corriendo por una pista, que no es lo mismo.
       */
      if (
        (antes === "despegando" || antes === "comprometido") &&
        vista.fase === "en-vuelo"
      ) {
        this.apuntar({ despegues: this.cuaderno.despegues + 1 });
        this.apuntarElSitio();
      }
      if (
        antes === "abandonando" &&
        (vista.fase === "a-plataforma" || vista.fase === "en-puesto")
      ) {
        this.avisar("success");
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
      // Y con su clave: los ficheros de voz se llaman por clave, no por
      // texto. Ver `audio/banco-de-voz.ts`.
      if (!repuesta) {
        this.instructor.decir(frase, clave);
        if (conLetras) {
          this.hud.flash(`${frase}${tecla}${letra ? ` · ${letra}` : ""}`, 5);
        }
        if (vista.fase === "autorizado" || vista.fase === "apagado")
          this.avisar("success");
      }
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
      this.instructor.decir(t("vuelo.despacio"), "vuelo.despacio");
    } else if (vista.fuera && this.plan.avisarDeSalida(dt)) {
      this.hud.senal.mostrar(
        "amarillo",
        conLetras ? t("vuelo.fuera") : "",
        vista.letra,
        {
          segundos: 4,
        },
      );
      this.instructor.decir(t("vuelo.fuera"), "vuelo.fuera");
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
        this.avisar("attention");
        this.instructor.decir(t("vuelo.aterrizado"), "vuelo.aterrizado");
      } else {
        // Que la tarjeta que tocara vuelva sola en el próximo fotograma, sin
        // repetir la voz ni la campana. Ver `soloLaTarjeta`.
        this.faseAnunciada = "";
        this.soloLaTarjeta = true;
      }
    }

    /*
     * **Entrar en pista sin la luz verde para el vuelo.**
     *
     * Tenía aviso —sonido, tarjeta y voz— y ahí se acababa: se podía cruzar la
     * doble raya con la luz en rojo, despegar y no pasaba nada. «Y si no paro a
     * esperar que me den permiso para despegar, ¿no pasa nada? Ya podría el
     * controlador aéreo pararme y echarme la bronca.»
     *
     * Podría y debe: en un aeropuerto de verdad esto tiene nombre propio
     * —**incursión en pista**— y es de las cosas más graves que pueden pasar en
     * tierra, porque la pista puede tener a alguien aterrizando encima. Es
     * justo para lo que existe el punto de espera, la doble raya pintada y la
     * lámpara de la torre; sin consecuencia, los tres eran adorno.
     */
    if (vista.saltoLaLuz) this.sufrirPercance("sinpermiso");
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
    // Todas las que haya, cada una sobre su eje. Ver `AircraftMesh.helices`.
    for (const h of this.aircraftMesh.helices ?? [
      this.aircraftMesh.propeller,
    ]) {
      h.rotation.z = this.propellerAngle;
    }

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

  /**
   * Mover la cámara, que ya no es cosa de aquí.
   *
   * Lo único que queda en el juego es **elegir la vista y darle lo que
   * necesita**: dónde está el suelo, qué mide el avión, dónde tiene los ojos
   * el piloto y cómo traquetea lo que hay debajo de las ruedas. El resto
   * —suavizado, retroceso por aceleración, traqueteo, mirar lejos— vive en
   * `src/cameras/`, una vista por fichero.
   */
  private updateCamera(dt: number): void {
    const state = this.flight.state;
    const rig: CameraRig = this.camaras[this.cameraMode];

    // El avión, escondido solo en la vista de pájaro. Va aquí y no al cambiar
    // de vista para que valga también cuando el modelo se carga o se cambia.
    this.aircraftMesh.group.visible = rig.muestraElAvion;

    const ctx = this.contextoDeCamara;
    ctx.aircraft.wingSpan = this.aircraft.wingSpan;
    ctx.aircraft.chord = this.aircraft.chord;
    ctx.ojo = this.aircraftMesh.ojo ?? null;
    ctx.movimientoReducido = this.reducedMotion;
    ctx.traqueteo = TRAQUETEO[this.superficie];

    rig.update(this.camera, state, dt, ctx);
    this.ajustarElAngulo(rig.fovDeseado(state, ctx), dt);
  }

  /**
   * El ángulo de visión, acercándose al que pide la vista.
   *
   * El suavizado está aquí y no en cada vista a propósito: es el mismo para
   * todas, y sobre todo es lo que hace que **cambiar de vista no dé un tirón**
   * cuando la nueva pide un ángulo distinto —de los sesenta y dos de fuera a
   * los cincuenta de la cabina—. Si cada vista pusiera el suyo de golpe, ese
   * salto sería lo primero que se vería al pulsar la tecla.
   */
  private ajustarElAngulo(quiere: number, dt: number): void {
    const suavizado = 1 - Math.exp(-dt * 2.5);
    const siguiente = this.camera.fov + (quiere - this.camera.fov) * suavizado;
    if (Math.abs(siguiente - this.camera.fov) < 0.01) return;
    this.camera.fov = siguiente;
    this.camera.updateProjectionMatrix();
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  /**
   * El dedo —o el ratón— sobre los mandos de la cabina.
   *
   * Pedido con las tres formas: «botones que poder pulsar, tanto con clic, tap
   * como tecla». Las teclas ya estaban; esto es el mando que está **en la
   * cabina**, donde lo busca quien se ha sentado ahí.
   *
   * Solo desde dentro: en las vistas de fuera el avión se ve entero y un clic
   * ahí es otra cosa —mirar, no tocar—, así que no hay nada que pulsar.
   *
   * Y se dispara **al soltar**, no al apretar, que es como funciona cualquier
   * botón: apretando se puede rectificar sin hacer nada, arrastrando el dedo
   * fuera. Ver `world/botones-cabina.ts`.
   */
  private mirarLosMandos(x: number, y: number): void {
    const botones = this.aircraftMesh.botones;
    if (!botones) return;
    const dentro = this.cameraMode === "cockpit";
    botones.alumbrar(dentro ? botones.cualEsta(x, y, this.camera) : null);
  }

  private pulsarElMando(x: number, y: number): void {
    const botones = this.aircraftMesh.botones;
    if (!botones || this.cameraMode !== "cockpit") return;
    const cual = botones.cualEsta(x, y, this.camera);
    if (cual) this.pulsarMandoDeCabina(cual);
  }

  /**
   * Lo que hace cada mando de la cabina, ya sabiendo cuál es.
   *
   * Aparte de dónde se pulsa porque un banco tiene que poder tocarlo sin
   * apuntar con el ratón, y porque lo que hace un mando no debería depender de
   * dónde esté dibujado. Ver `sondas.ts`.
   */
  pulsarMandoDeCabina(cual: MandoDeCabina): void {
    if (cual === "motor") this.toggleEngine();
    else if (cual === "flaps") this.input.alternarFlaps();
    else if (cual === "tren") this.input.alternarTren();
    else this.input.pisarElFreno();
  }

  /**
   * La cota del asfalto **debajo del avión**, en metros.
   *
   * Y no la del centro de la pista, que es lo que se usaba: una pista con
   * pendiente —La Palma baja once metros y medio— no está a esa cota en el
   * umbral, y todo lo que se decide en el umbral se decidía con seis metros de
   * error. Ver `Terrain.cotaDeLaPista`.
   */
  /** Si el cartel del cinturón está encendido ahora mismo. */
  private cinturonPuesto = false;
  /** Y cuánto lleva así, para no encenderlo y apagarlo a cada bache. */
  private desdeElCinturon = 0;

  /**
   * El cartel del cinturón y su *ding*.
   *
   * Pedido con el resto de la cabina de pasaje: «señales de cinturones de
   * seguridad, etc.». Y es de las pocas cosas del juego que **no se pilotan**:
   * se encienden solas y lo único que hacen es contar lo que está pasando, que
   * es justo lo que enseña — el cartel no se enciende porque sí.
   *
   * Se enciende cuando el aire se mueve de verdad o cuando se está bajo —el
   * despegue y la aproximación, que es cuando se enciende en cualquier vuelo— y
   * se apaga cuando lleva un rato tranquilo. El retardo no es adorno: sin él, un
   * bache suelto lo enciende y lo apaga cada dos segundos, y un cartel que
   * parpadea deja de querer decir nada.
   *
   * Solo en los aviones con pasaje, como la megafonía: una avioneta de escuela
   * no lleva cartel ni tiene a quién avisar.
   */
  /** Cuánto lleva por encima del tope, para no cantarlo por un bache. */
  private sobrandoVelocidad = 0;
  /** Y si ya se dijo, para no repetirlo mientras siga pasando. */
  private dichoDeSobrevelocidad = false;

  /**
   * **El tope de velocidad del avión, que hasta hoy no existía.**
   *
   * El empuje peleaba contra la resistencia y donde se cruzaban, ahí se
   * quedaba: el JAZ 90 daba mil cincuenta por hora a quinientos metros, o sea
   * Mach 0,86 a ras de suelo. Era el #159.
   *
   * Y se avisa **diciendo cuál de los dos topes es**, porque son cosas
   * distintas y la diferencia es la lección: abajo te frena la estructura del
   * avión y arriba te frena el aire, y subiendo el límite cambia de dueño. Un
   * solo cartel de «vas rápido» no puede contar eso.
   *
   * Dos segundos por encima antes de decir nada: un avión que pasa el tope
   * medio segundo en una ráfaga no está en sobrevelocidad, y un aviso que salta
   * con cada bache se aprende a no oír.
   */
  private atenderALaSobrevelocidad(dt: number): void {
    const s = this.flight.state;
    if (s.onGround) {
      this.sobrandoVelocidad = 0;
      this.dichoDeSobrevelocidad = false;
      return;
    }
    const tope = this.flight.limiteDeVelocidad();
    const pasado = s.airspeed > tope;
    this.sobrandoVelocidad = pasado ? this.sobrandoVelocidad + dt : 0;
    if (!pasado) {
      // Se rearma al volver a estar dentro con holgura: si no, volvería a
      // cantar en cuanto la aguja rozara el tope otra vez.
      if (s.airspeed < tope * 0.94) this.dichoDeSobrevelocidad = false;
      return;
    }
    if (this.sobrandoVelocidad < 2 || this.dichoDeSobrevelocidad) return;
    this.dichoDeSobrevelocidad = true;
    const clave =
      this.flight.quienLimita() === "aire"
        ? "vuelo.sobrevelocidadAire"
        : "vuelo.sobrevelocidad";
    this.hud.senal.mostrar(
      "sobrevelocidad",
      this.rotulo(clave as TranslationKey, "palabra.rapido"),
      null,
      { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
    );
    this.cantar("too fast", t(clave as TranslationKey), clave, "urgente");
  }

  /** Cuánto lleva pidiendo lo del tren, para no repetirse. */
  private desdeLoDelTren = 0;
  /** Y qué fue lo último que pidió: meterlo o sacarlo. */
  private dichoDelTren: "mete" | "saca" | null = null;

  /**
   * El tren: cuándo se pide meterlo y cuándo sacarlo.
   *
   * Son los dos únicos momentos en los que un tren se toca, y los dos enseñan
   * la misma idea desde los dos lados: **una cosa que te hace falta para
   * aterrizar te estorba para volar**.
   *
   * - Arriba y subiendo con las patas fuera: metélas, que frenan. Es el premio
   *   del mando —se mete y el avión corre más— y llega cuando se ha ganado.
   * - Bajo, bajando y sin tren trabado: sacálo **ya**. Ese aviso lo lleva toda
   *   cabina de avión retráctil desde hace setenta años, y existe por lo mismo
   *   que aquí: porque se olvida, y a quien se le olvida no es a los novatos.
   *
   * Y solo en el avión que lo mete, claro. Ver `flight/tren.ts`.
   */
  /**
   * Adónde se va y a qué distancia, para las pantallas que lo enseñan.
   *
   * Lo miran el cuadro del HUD y la pantalla de navegación de la cabina, y por
   * eso está aquí y no en cada uno: dos sitios que calculan la misma distancia
   * con dos cuentas es la vía rápida a que un día digan cosas distintas.
   */
  private get aDondeVoy(): { rumbo: number; distancia: number } | null {
    const objetivo = this.missions.current;
    if (!objetivo) return null;
    const donde = objectiveTarget(objetivo);
    if (!donde) return null;
    const p = this.flight.state.position;
    return {
      rumbo: rumboHacia(p.x, p.z, donde.x, donde.z),
      distancia: Math.hypot(donde.x - p.x, donde.z - p.z),
    };
  }

  /** Y de dónde sopla hoy, que es dato auxiliar y va en cian. */
  private get vientoDeHoy(): { desde: number; nudos: number } | null {
    const m = this.scenario.meteo;
    return m && m.vientoDe !== null
      ? { desde: m.vientoDe, nudos: m.vientoKt }
      : null;
  }

  private atenderAlTren(dt: number): void {
    this.desdeLoDelTren += dt;
    if (!this.aircraft.trenRetractil) return;
    const s = this.flight.state;
    const donde = this.input.controls.tren;
    const sobreElSuelo = s.heightAboveGround;

    /*
     * El de sacarlo es un aviso de seguridad y manda: se dice aunque se acabe
     * de decir lo otro. El de meterlo es un consejo y espera su turno.
     */
    if (avisaDelTren(donde, sobreElSuelo, s.verticalSpeed < -0.5)) {
      if (this.dichoDelTren === "saca" && this.desdeLoDelTren < 12) return;
      this.dichoDelTren = "saca";
      this.desdeLoDelTren = 0;
      this.hud.senal.mostrar(
        "tren",
        this.rotulo("vuelo.sacaElTren", "palabra.tren"),
        null,
        {
          segundos: SE_QUEDA_EL_ARO,
          prioridad: IMPORTANTE,
          tecla: nombreDeTecla(this.input.preferredKey("tren")),
        },
      );
      this.cantar(
        "gear down",
        t("vuelo.sacaElTren"),
        "vuelo.sacaElTren",
        "urgente",
      );
      return;
    }

    /*
     * Y metélo, cuando ya no hace falta: en el aire, subiendo y con pista de
     * sobra debajo. Los trescientos metros no son un capricho — es la altura a
     * la que un despegue deja de poder volver a la pista de la que salió, o
     * sea el momento en que el tren pasa de ser un seguro a ser un lastre.
     */
    const yaNoHaceFalta =
      !s.onGround && s.verticalSpeed > 1 && sobreElSuelo > METE_EL_TREN;
    if (yaNoHaceFalta && donde > 0.99 && this.input.trenQueSePide) {
      if (this.dichoDelTren === "mete" && this.desdeLoDelTren < 30) return;
      this.dichoDelTren = "mete";
      this.desdeLoDelTren = 0;
      this.hud.senal.mostrar(
        "tren",
        this.rotulo("vuelo.meteElTren", "palabra.tren"),
        null,
        {
          segundos: SE_QUEDA_EL_ARO,
          prioridad: IMPORTANTE,
          tecla: nombreDeTecla(this.input.preferredKey("tren")),
        },
      );
      this.cantar("gear up", t("vuelo.meteElTren"), "vuelo.meteElTren");
    }
  }

  private atenderAlCinturon(movimiento: number, dt: number): void {
    if (!conPasaje(this.aircraft.mass)) return;
    const bajo = this.flight.state.heightAboveGround < 900;
    const toca = bajo || movimiento > 0.9;
    this.desdeElCinturon += dt;
    if (toca === this.cinturonPuesto) return;
    // Encender es inmediato y apagar espera: avisar tarde de que hay baches no
    // sirve de nada, y apagar pronto es mentir.
    if (!toca && this.desdeElCinturon < 20) return;
    this.cinturonPuesto = toca;
    this.desdeElCinturon = 0;
    this.avisar("cinturon");
    this.hud.ponerCinturon(toca);
  }

  private cotaDeLaPistaAqui(): number {
    return this.terrain.cotaDeLaPista(
      this.flight.state.position.x,
      this.flight.state.position.z,
    );
  }

  /** La misma vuelta de cámara, para que el banco pueda pedir una vista. */
  cicloDeCamara(): void {
    this.cycleCamera();
  }

  private cycleCamera(): void {
    const index = CAMERA_MODES.indexOf(this.cameraMode);
    this.cameraMode =
      CAMERA_MODES[(index + 1) % CAMERA_MODES.length] ?? "chase";
    recordarVista(this.cameraMode);
    this.hud.ponerVistaDeCabina(this.cameraMode === "cockpit");
  }

  /**
   * Construye el motor de vuelo que le toca a un tramo.
   *
   * El primer peldaño usa un modelo cinemático distinto, no el de
   * coeficientes con más ayudas. Ver `src/flight/tiers.ts` y
   * `src/flight/arcade.ts`.
   */
  /**
   * Toca un aviso, y lo apunta.
   *
   * Un solo camino para los treinta y un sitios que avisaban por su cuenta: así
   * se puede contar desde fuera cuántas veces suena cada cosa, que es lo que
   * hace falta para cazar una campana repetida. En producción es la misma
   * llamada de siempre — el apunte se borra del paquete.
   */
  private avisar(que: Cue): void {
    if (import.meta.env.DEV)
      this.loQueSono.push({ que, cuando: Math.round(this.clock.elapsedTime) });
    this.audio.cue(que);
  }

  private buildFlightModel(tier: Tier): FlightModel {
    // El avión flota sobre el agua en vez de hundirse: es un juego para
    // chicos, y amerizar de morro y desaparecer no le divierte a nadie.
    const ground = (x: number, z: number): number =>
      this.terrain.sampleSurface(x, z);
    const modelo =
      tier.model === "simple"
        ? new ArcadeFlightModel({ aircraft: this.aircraft, ground })
        : new CoefficientFlightModel({
            aircraft: this.aircraft,
            ground,
            assist: tier.assists,
          });
    /*
     * **Y el viento que ya sopla, que si no se pierde al cambiar de modelo.**
     *
     * `ponerTiempo` se lo dice al motor de vuelo, pero cambiar de peldaño o de
     * avión construye uno nuevo y el nuevo nace en calma. Se vería como un
     * viento que desaparece al cambiar de avión en mitad del vuelo.
     */
    const aire = vientoComoVector(this.scenario.meteo ?? TIEMPO_DE_CASA);
    modelo.ponerViento(aire.x, aire.z);
    return modelo;
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
      PYKASU;
    const { position, heading, airspeed } = this.flight.state;
    const carried = { position: position.clone(), heading, airspeed };

    /*
     * **Y si estabas en el suelo, el avión nuevo nace en el suelo.**
     *
     * El origen de una aeronave no está en sus ruedas: está a la altura de su
     * tren por encima de ellas. Conservar la posición tal cual al cambiar de
     * avión daba por bueno el tren del que se iba, así que pasar del de
     * fuselaje ancho —cinco metros y veinte de tren— a la avioneta —uno y
     * cuarenta— dejaba a la avioneta **flotando cuatro metros**. Y desde ahí se
     * caía, y el juego hacía lo que hace cuando un avión se cae: «se rompió,
     * volvemos a empezar».
     *
     * Quien lo jugó lo contó exactamente así: «la avioneta nace en el aire
     * porque el juego parte de un avión enorme y es como si se cayera, cuando
     * en realidad estoy cambiando de aparato».
     *
     * Cambiar de avión no es un percance, así que se le baja —o se le sube— lo
     * que cambia el tren, y aterriza en el sitio donde estaba el anterior.
     */
    if (this.flight.state.onGround) {
      carried.position.y += next.gearHeight - this.aircraft.gearHeight;
    }

    this.aircraft = next;
    this.audio.setEngine(next.sound);
    // Y si este avión mete las patas o no, que es lo que decide si hay palanca.
    this.input.ponerAeronave(next.trenRetractil);

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
    /*
     * Y el esquema del ala, que se quedaba con el avión de antes.
     *
     * `montarElAla` solo se llamaba al arrancar y al cambiar de idioma, así que
     * después de cambiar de aeronave el panel seguía enseñando el ala y la masa
     * de la anterior — un panel que explica **este** avión enseñando otro.
     */
    this.montarElAla();
    /*
     * **Y el circuito, que es del avión y no del aeropuerto.**
     *
     * `escalaDeCircuito` estira la figura con la velocidad de aproximación —el
     * de fuselaje ancho vuela un circuito de casi seis kilómetros de tramo de
     * subida donde la avioneta vuela cuatro y pico— y eso estaba bien montado
     * desde el primer día. Lo que no estaba es **volver a montarlo al cambiar
     * de avión**: el circuito solo se construía al preparar el aeródromo, así
     * que quien pulsaba la tecla se llevaba volando un reactor por el circuito
     * de la avioneta, con el giro cantado donde le tocaba a ella.
     *
     * Dicho jugando: «si voy con un cuatrimotor o un bimotor a reacción, que no
     * me diga que dé el giro cuando todavía no llevo ni dos segundos en el
     * aire, porque ese tipo de avión necesita más giro». Y era verdad: la
     * cuenta existía y no se estaba usando.
     */
    this.ponerCircuito();
    this.ponerTrafico();
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
    this.hud.setEscalera(next.avisos);
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
      this.avisar(state.touchdownSinkRate > 2.5 ? "error" : "touchdown");
    }
    /*
     * **Y el logro de despegar suena una vez por vuelo, no en cada bote.**
     *
     * Esto miraba solo que las ruedas se despegaran del suelo, y en una toma
     * con rebote se despegan tres o cuatro veces: sonaba «lo conseguiste»
     * alternando con el golpe de la toma dura, felicitando por rebotar. El
     * logro es **despegar**, y despegar pasa una vez.
     */
    if (
      !state.onGround &&
      this.wasOnGround &&
      !state.crashed &&
      !this.yaDespego
    ) {
      this.yaDespego = true;
      this.avisar("achieved");
    }
    if (state.stalled && !this.wasStalled) this.avisar("perdida");
    if (state.crashed && !this.wasCrashed) this.avisar("error");

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
      this.contarLaMision();
    } else {
      this.missions.start(mission);
      this.hud.setMissionProgress(this.missions.progress);
      this.hud.flash(t("mission.started", { name: t(mission.nameKey) }), 4);
      this.avisar("mision");
      this.contarLaMision();
    }
    this.updateMissionMarker();
  }

  /**
   * Le cuenta al panel de la misión qué hay y por dónde va.
   *
   * Y enseña o esconde su botón, que es la otra mitad: sin misión no hay nada
   * que mirar, y un botón que abre un panel vacío enseña que el juego está
   * roto. La misma regla que los galones y que las gafas de sol.
   *
   * En un solo sitio a propósito: la misión cambia en cuatro —al empezar el
   * vuelo, al elegir otra, al cumplir un objetivo y al reiniciar— y con cuatro
   * copias de esto, tres se quedarían viejas.
   */
  private contarLaMision(): void {
    const mision = this.missions.active;
    this.misionUI?.poner(
      mision ? { mision, hechos: this.missions.progress.done } : null,
    );
    this.hud.setMisionVisible(mision !== null);
  }

  /** Avanza la misión y celebra lo que se haya cumplido. */
  private advanceMission(): void {
    if (!this.missions.active) return;
    const event = this.missions.update(this.flight.state);
    if (!event.completed) return;

    this.hud.setMissionProgress(this.missions.progress);
    this.contarLaMision();
    this.updateMissionMarker();

    if (event.finished) {
      this.avisar("achieved");
      this.hud.flash(t("mission.done"), 5);
    } else {
      this.avisar("success");
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
    /*
     * Y **el peldaño «bajo» también baja la voz**. La voz del navegador no
     * pasa por la mezcla, así que el volumen maestro no la alcanza: hasta hoy
     * el botón solo la callaba del todo o la dejaba a tope. Veinte tablets en
     * un aula a medio volumen con el instructor gritando en las veinte.
     */
    ponerVolumenDeVoz(level.gain);
    // En mudo no queda nadie hablando, así que la mezcla se levanta: si no,
    // se quedaba agachada con la última voz cortada a medias.
    if (level.id === "mudo") this.audio.callarLasVoces();
    // Y al instructor se le calla ahora mismo, no en la frase siguiente.
    if (level.id === "mudo") this.instructor.callar();
    this.hud.setSoundLevel(level.glyph, t(`sound.${level.id}` as never));
    this.hud.flash(t(`sound.${level.id}` as never));
  }

  /**
   * Monta —o vuelve a montar— el esquema del ala.
   *
   * Se le pasa el avión que se está volando y no un ala de ejemplo: las cifras
   * de al lado del dibujo son las suyas, y la pérdida que enseña es la que se
   * acaba de sentir a los mandos. Ver `flight/ala.ts`.
   */
  private montarElAla(): void {
    const donde = document.getElementById("ala");
    if (!donde) return;
    this.ala = new PantallaDelAla(
      donde,
      this.aircraft,
      () => this.reducedMotion,
    );
  }

  /** Pasa al siguiente idioma y repinta todo lo que lleva texto. */
  private changeLanguage(): void {
    const locale = cycleLocale();
    this.hud.render();
    this.credits = new CreditsScreen(
      this.creditsRoot,
      this.flight.implementationName,
    );
    // El esquema del ala lleva sus rótulos cocidos en el marcado, igual que
    // los créditos: al cambiar de idioma se rehace, no se traduce a medias.
    this.montarElAla();

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
      // Y la velocidad de rotación, que es la que se marca en la pantalla en
      // mitad de la carrera. Ver `Hud.destellar`.
      this.aircraft.rotationSpeed,
      // Y la ficha, que es de donde sale el cuadro de mandos de este avión y no
      // el de la avioneta. Ver `ui/cuadro.ts`.
      this.aircraft,
    );
    /*
     * Y cómo habla la torre de este campo, que es cosa del sitio y no del
     * idioma del juego: en Canarias no se vosea. Ver `i18n/habla.ts`.
     */
    this.hud.setHabla(hablaDe(this.scenario.aerodrome?.id));
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
