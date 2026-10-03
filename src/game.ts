    /*
     * **Y también los de ya parado**: frenos, calzos y cortar motores.
     *
     * El de «frenos» no salía en la tarjeta, porque se quedaba puesto con el
     * avión parado y tapaba la llave de «apagá el motor», que salía a la vez
     * con su voz: «llegaste, apagá el motor» antes de que el señalero hubiera
     * terminado. Ahora la llave la trae su seña, la de cortar motores, que es
     * la última —ver `YA_PARADO` en `flight/senalero.ts`—, y la tarjeta va
     * siguiendo al señalero hasta ahí.
     */
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
  Box3,
  CanvasTexture,
  CircleGeometry,
  Clock,
  DoubleSide,
  Euler,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { CoefficientFlightModel, empujeLleno } from "./flight/fdm";
import { pendienteBajoElTren } from "./world/pendiente-bajo-el-tren";
import { ArcadeFlightModel, MOTOR_QUE_SOSTIENE } from "./flight/arcade";
import {
  GUYRAMI,
  TIERS,
  rememberTier,
  rememberedTier,
  type Tier,
} from "./flight/tiers";
import {
  AIRCRAFT,
  PYKASU,
  esDeChorro,
  velocidadDePerdida,
  type AircraftConfig,
} from "./flight/aircraft";
import { dibujoDelGasTactil } from "./ui/pictogramas";
import { InputManager } from "./flight/input";
import type { LoQueVeLaMano } from "./flight/mano";
import {
  claveDeTorre,
  DICE_LA_TORRE,
  DICE_UN_AFIS,
  enUnAfis,
  esElAvisoDeAves,
  esLaInformacionDeTrafico,
  NOMBRA_LA_PISTA,
  PISTA_DETRAS,
  PISTA_EN_MEDIO,
  PISTA_EN_USO_DELANTE,
} from "./audio/torre";
import {
  bandaSinMotor,
  pistaDelPlaneo,
  planeoDe,
  queSeDiceSinMotor,
} from "./flight/sin-motor";
import { LaOtraCabecera, porQueCabecera } from "./flight/la-otra-cabecera";
import { anticipacionDeRodaje } from "./flight/gobernador";
import {
  matriculaDe,
  pistaEnCastellano,
  pistaEnPiezas,
  rellenoDe,
  vientoEnPiezas,
  sortearIndicativo,
  type Indicativo,
} from "./flight/matricula";
import type { FlightModel, FlightState } from "./flight/model";
import { Terrain, cabeceraContraria, cabeceraEnUso } from "./world/terrain";
import {
  Seguimiento,
  minimaEnRuta,
  segundosPorElPerfil,
  type Lectura as LecturaDeRuta,
  type Ruta,
} from "./flight/ruta";
import { crearAproximacion, type Aproximacion } from "./world/aproximacion";
import {
  crearCircuito,
  escalaDeCircuito,
  formaDelCircuito,
  manoPublicada,
  type Circuito,
} from "./world/circuito";
import { FLOTA, modeloPorId } from "./flight/flota";
import { cabeEn, campoDe } from "./flight/cabe";
import {
  crearTrafico,
  tiposDelCampo,
  type EnTierra,
  type QuienJuega,
  type Trafico,
} from "./world/trafico";
import {
  sueloDelTrafico,
  type SueloDelTrafico,
} from "./world/suelo-del-trafico";
import { MILLA, type Mapa } from "./ui/carta";
import { ponerTamanoMinimo } from "./world/se-ve-de-lejos";
import {
  Tcas,
  bandaPara,
  modoEnPantalla,
  type AvisoDeTrafico,
  type Banda,
  type Intruso,
} from "./flight/tcas";
import {
  alturaDelOtro,
  InformacionDeTrafico,
  informacionEnPiezas,
  informacionEnRadio,
  ladoDeLaHora,
} from "./flight/informacion-de-trafico";
import { ponerLaLuzDelDia } from "./world/luces-del-trafico";
import { createSky, ponerNubes, updateSky, type SkyRig } from "./world/sky";
import { CURVAR_EL_DIBUJO, instalarCurvatura } from "./world/curvatura";
import { crearLluvia, type LluviaEnElMundo } from "./world/lluvia";
import {
  capaDelParte,
  type CapaDeNubes,
  lluviaALaAltura,
} from "./world/capa-de-nubes";
import { crearJirones, type JironesEnElMundo } from "./world/jirones";
import {
  crearGotasEnElParabrisas,
  type GotasEnElParabrisas,
} from "./world/gotas-en-el-parabrisas";
import type { Lluvia } from "./world/meteo";
import { createAircraftMesh, type AircraftMesh } from "./world/aircraft-mesh";
import { cargarModelo } from "./world/aeronave-modelo";
import {
  enElEmbudoDeFinal,
  enLaZonaDeAproximacion,
  vieneEnFinal,
  ENTRADA_EN_FINAL,
  GLIDE_SLOPE,
  SENDA_DESDE,
  RunwayGuide,
  type PasoDeAro,
} from "./world/runway-guide";
import { createVegetation, zonaDeAeropuerto } from "./world/vegetation";
import { crearGranja, type Granja } from "./world/granja";
import {
  arrancarAbreOtroTramo,
  LECCION_POR_DEFECTO,
  type Leccion,
} from "./flight/lecciones";
import {
  atisEnTexto,
  deFrente,
  pedirMetar,
  TIEMPO_DE_CASA,
  tiempoEntreCampos,
  vientoComoVector,
  vientoDeCasa,
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
 * Cuánto más cerca tiene que estar la pista de otro campo para que se monte
 * lo suyo, m. Ver `mirarSiCambiaDeCampo`.
 *
 * Un kilómetro: nada comparado con los cincuenta que hay hasta la raya de en
 * medio en un vuelo entre islas, y de sobra para que volar por encima de esa
 * raya no rehaga el circuito, el tráfico y la frecuencia en cada fotograma.
 */
const HOLGURA_PARA_CAMBIAR_DE_CAMPO = 1000;

/**
 * Cuánto se queda en pantalla la corrección de un aro perdido, s.
 *
 * Dos segundos y medio: lo que hay entre un aro y el siguiente a velocidad de
 * aproximación. Más sería que la corrección de un aro tapara la del que viene.
 */
const SE_QUEDA_EL_ARO = 2.5;

/**
 * Cuánto se queda a la vista tu permiso para aterrizar, s: la lámpara verde
 * y su tarjeta.
 *
 * Seis, lo que una tarjeta de fase. Con los dos segundos y medio del aro la
 * lámpara se apagaba mientras la torre todavía estaba diciendo tu matrícula,
 * y el viento y el «cleared to land» sonaban con la pantalla ya vacía.
 */
const SE_QUEDA_EL_PERMISO = 6;

/**
 * Por debajo de esto, en m/s sobre el suelo, el avión está parado: es cuando
 * el mecánico puede mirar unos flaps tocados. Ver `atenderALosFlaps`.
 */
const PARADO_DE_VERDAD = 1;

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

/** Lo más que espera una frase del descenso a que su boca se libere, ms. */
const ESPERA_DEL_DESCENSO = 3000;

/**
 * Lo que se calcula que tarda en decirse un texto, ms: unos catorce
 * caracteres por segundo, que es lo que llevan las grabaciones de la
 * instructora y de la megafonía, y medio segundo de aire.
 */
function loQueTardaEnDecirse(texto: string): number {
  return 500 + (texto.length / 14) * 1000;
}

/** Un porqué de la espera con su avión, como se apunta: «aterriza:EC-FLY». */
function esperaPorQuien(por: EsperaPor): string {
  return `${por.porque}:${por.matricula ?? "?"}`;
}
const URGENTE = 2;

/**
 * Las fases de tierra en las que el TCAS ya está encendido: del punto de
 * espera hasta salir de la pista. Ver `Game.vigilarElTrafico`.
 */
const TCAS_EN_TIERRA = new Set<Fase>([
  "esperando",
  "autorizado",
  "back-taxi",
  "alineando",
  "despegando",
  "comprometido",
  "aterrizado",
]);

/**
 * **Las fases en que estás encima de la pista**, con las ruedas en el suelo:
 * del eje, alineado, a dejarla. Es lo que el tráfico mira para no cruzar el
 * umbral contigo en ella. Ver `tuLlegada`. «Autorizado» no está: con la luz
 * verde todavía se está en la doble raya.
 */
const ENCIMA_DE_LA_PISTA = new Set<string>([
  "back-taxi",
  "alineando",
  "despegando",
  "comprometido",
  "aterrizado",
  "abandonando",
]);

/**
 * Las fases de entrar en la pista y correr, en las que «motor a fondo» ya
 * dicho al soltar el gas sigue valiendo. Ver `decirElGasSuelto`.
 */
const DE_LA_CARRERA = new Set<string>(["alineando", "despegando", "comprometido"]);

/**
 * **Lo que se espera a quien se para antes de su sitio con el señalero
 * llamando**, s, antes de darle la llegada por buena y sacar la llave. Una
 * espera que depende de que alguien avance no puede ser para siempre.
 */
const PACIENCIA_EN_EL_PUESTO = 20;

/**
 * **A partir de cuánto volante gira quien juega**, de 0 a 1: el mismo listón
 * que la zona muerta del mando de juego. Por debajo es un dedo apoyado en la
 * palanca; por encima, manda él y la ayuda de rodaje calla. Ver
 * `asistirRodaje`.
 */
const GIRA_QUIEN_JUEGA = 0.12;

/** Por debajo de esto, m, el tráfico va «a tu misma altura». Trescientos pies. */
const A_LA_MISMA_ALTURA = 91;

/**
 * Cuánto se queda la tarjeta del aviso de tráfico, s.
 *
 * Ocho: lo que se tarda en mirar a donde dice y encontrarlo. El aviso de
 * verdad dura más —hasta que el otro se aleja—, y eso lo sigue enseñando el
 * círculo ámbar de la carta, que es el que cuenta el estado.
 */
const SE_QUEDA_EL_TRAFICO = 8;

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
import { crearCiudad, type Ciudad } from "./world/ciudad";
import {
  crearLucesDeCiudad,
  type LucesDeCiudad,
} from "./world/luces-de-ciudad";
import { Obstaculos } from "./world/obstaculos";
import { MissionMarker } from "./world/mission-marker";
import {
  alturaIndicada,
  girarRueda,
  QNH_ESTANDAR,
} from "./flight/altimetro";
import { MissionRunner } from "./missions/runner";
import { objectiveTarget, type Mission } from "./missions/types";
import { aDondeSenala, type Por as PorDeLaAguja } from "./flight/aguja";
import { missionsFor } from "./content/missions";
import {
  conViento,
  oaciDe,
  SCENARIOS,
  VALLE_CORDILLERA,
  vecesLejosDe,
  type Scenario,
} from "./world/scenarios";
import { crearTeselas, type Teselas } from "./world/teselas";
import { exposicionDe, type Ortofoto } from "./world/ortofoto";
import { mundoElegido } from "./ui/mundo";

/**
 * La clave de las teselas fotorrealistas. Ver `workers/meteo.js` y `.env.example`.
 *
 * Sin ella el juego pinta su mundo de polígonos, que es el de siempre y el que
 * arranca en cualquier máquina. Eso no es un modo degradado: es el suelo sobre
 * el que se construye todo lo demás.
 */
/*
 * **Y una cadena vacía es no tener clave**, no una clave vacía.
 *
 * Con `??` una variable puesta en blanco —`VITE_GOOGLE_TILES=`, que es como se
 * construye la web— pasaba como clave y el juego seguía pidiendo teselas y
 * cambiando el plano lejano de la cámara a 120 km. Y en granjaoga.com las
 * teselas de Google **no pueden llegar nunca**: las bloquea la política de
 * seguridad del sitio —medido, cuatro peticiones rechazadas por partida— y
 * aparte Google no las sirve a cuentas europeas. Así que la web se construye
 * sin clave y el mundo de la foto se pinta con la ortofoto, que es lo que hay.
 */
const CLAVE_TESELAS: string | null = import.meta.env.VITE_GOOGLE_TILES || null;
import { laConchaLaLleva } from "./ui/panel";
import { Hud, UNIT_SYSTEMS } from "./ui/hud";
import { CreditsScreen } from "./ui/credits";
import { PantallaDelAla } from "./ui/pantalla-ala";
import { PantallaDePausa } from "./ui/pausa";
import { PantallaDespierta } from "./ui/pantalla-despierta";
import { ahoraEsTelefonoApaisado } from "./ui/telefono";
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
  comoSeMiraDesde,
  construirCamaras,
  esDePasaje,
  siguienteVista,
  type CameraMode,
  type CameraRig,
  type Contexto,
} from "./cameras";
import { sitioDeLaCola } from "./cameras/fuera";
import {
  asomarse,
  darLaVuelta,
  girarLaCabeza,
  giroDeCabezaHacia,
  giroDeVueltaHacia,
  MiradaLibre,
} from "./cameras/mirada";
import { escucharLaMirada } from "./cameras/dedo-que-mira";
import { MarcoDeVentanilla, seVePorLaVentanilla } from "./world/marco-de-ventanilla";
import type { AsientoDePasaje } from "./world/asiento-de-pasaje";
import { diaEnLaCabina } from "./world/luz-de-cabina";
import { nombreDeTecla } from "./flight/keymap";
import {
  elegirInstructor,
  elegirComandante,
  elegirOtroAvion,
  elegirTorre,
  elegirTripulacion,
  type AlSonar,
  type Instructor,
} from "./audio/instructor";
import { Frecuencia, PISTA_TUYA, type Transmision } from "./flight/radio";
import {
  dependenciaDe,
  seOyeElCampo,
  type Dependencia,
} from "./flight/dependencia";
import {
  alLevantarLaOrden,
  EXPLICA_LA_ESPERA,
  HOLD_SHORT_POR,
  TurnoDePista,
  type EsperaPor,
} from "./flight/turno-de-pista";
import type { ControlInputs } from "./flight/model";
import { neutralControls } from "./flight/model";
import { conElVueloRecto } from "./flight/vuelo-recto";
import {
  aireDelParte,
  airDensity,
  type Aire as AireDelDia,
  indicatedAirspeed,
  temperaturaExterior,
  trueFromIndicated,
  velocidadDelSonido,
} from "./flight/atmosphere";
import {
  delante,
  enEjesDePista,
  puntoDePista,
  rumboHacia,
  traves,
} from "./world/rumbo";
import {
  PlanDeVuelo,
  separacionEnTierra,
  type Vista,
} from "./world/plan-de-vuelo";
import { comoDibujo } from "./ui/senal";
import { Senalero } from "./world/senalero";
import type { Gesto } from "./flight/senalero";
import {
  Sigueme,
  adelantoDelSigueme,
  salidaDeLaRuta,
} from "./world/sigueme";
import { Vaca } from "./world/vaca";
import { techoDeLoQueSeConstruye } from "./world/superficie-de-aproximacion";
import { LandingWatcher, type Aterrizaje } from "./flight/aterrizaje";
import { Galones } from "./flight/galones";
import { Frustrada } from "./flight/frustrada";
import { ROCE, percanceAlTocar, type Percance } from "./flight/percance";
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
import { comoSeDiceAqui, hablaDe, type Habla } from "./i18n/habla";
import { BOCA, MEGAFONIA, anunciaLaFase } from "./audio/boca";
import { claveDeCabina, esDeUnaCaja, loDiceElAvion } from "./audio/cabina";
import { VozDeLaMaquina } from "./audio/maquina";
import {
  GUION,
  SE_QUEDAN,
  YA_ES_RODAJE,
  guionAfis,
  guionSinTorre,
  type Fase,
} from "./flight/vuelo";
import { reconocer } from "./flight/reconocimiento";
import {
  alturaDeEdificio,
  arranqueEnPista,
  paraUnAvion,
  type Punto,
} from "./world/aerodrome";
import { KeyScreen } from "./ui/teclas";
import {
  LOCALE_NAMES,
  cycleLocale,
  getLocale,
  hayTexto,
  t,
  type TranslationKey,
} from "./i18n";
import { conectarLaRadio } from "./audio/radio";
import { Audio, yaHuboGesto, type AudioLevel, type Cue } from "./audio/audio";
import { cuadroDe, regimen, NUDOS, PIES, PIES_POR_MINUTO } from "./ui/cuadro";
import type { Fma } from "./ui/tablero";
import { familiaDe, patasDe, peldanoDe } from "./ui/familia";
import { rodaduraDeFrenada } from "./flight/carrera";
import { POSICIONES as POSICIONES_DE_LA_PALANCA } from "./world/palanca-de-aerofrenos";
import {
  MARGEN_DEL_PRIMER_PELDANO,
  NADA_RECORDADO,
  avisaDelTren,
  luzRojaDelTren,
  recordarElTren,
  seVuelveADecir,
  type LoRecordado,
} from "./flight/tren";
import {
  cargaParaElPlan,
  comoVaElDeposito,
  hayQueLlenar,
  llamadaDeCombustible,
  loQueCabe,
  quemaPorSegundo,
  reservaEnKilos,
  seCargaAlCambiarDeDestino,
  type LlamadaDeCombustible,
} from "./flight/combustible";
import type { LoDichoDelTren } from "./flight/tren";
import type { MandoDeCabina } from "./world/botones-cabina";
import {
  Megafonia,
  conPasaje,
  conTripulacion,
  seLePasoElMomento,
  type Anuncio,
} from "./audio/megafonia";
import {
  bienvenidaConPlan,
  descensoPara,
  nivelDicho,
  segundosHastaTocar,
} from "./audio/partes-de-la-comandante";
import { elegirProducto, servicioPara } from "./audio/servicio-a-bordo";
import { bienvenidaPara, destinoEnRadio, type DestinoEnRadio } from "./audio/destino-dicho";
import { CabinaPresurizada } from "./flight/cabina-presurizada";
import {
  AVISO_DE_CABINA,
  DescensoDeEmergencia,
  EJERCICIO_DE_DESPRESURIZACION,
  alturaSegura,
  comoSeDiceLaConciencia,
  concienciaUtil,
  velocidadDelDescenso,
} from "./flight/despresurizacion";
import {
  ESPERA_SU_HUECO,
  LeccionesDelAire,
  sigueValiendo,
  type LeccionDelAire,
} from "./flight/lecciones-del-aire";
import { Huecos, esDeLaMegafonia } from "./audio/turnos";
import {
  TurbulenciaDelVuelo,
  turbulenciaDelCamino,
  type SucesoDelCamino,
  type Zona,
} from "./flight/turbulencia-del-vuelo";
import {
  enFaseDeTrabajo,
  LoQueSeVe,
  type MomentoDeMirar,
} from "./flight/lo-que-se-ve";
import type { Hito, Mirada } from "./world/hitos";
import { destacadosDesde } from "./world/lo-destacado";
import { loQueSeDice } from "./audio/ventanilla";
import { focoEncendido } from "./world/luces-de-posicion";
import {
  calorDelSuelo,
  capaDeMezcla,
  cuantoSeMueve,
  CAMPO_ABIERTO,
  rachaEn,
  rugosidadDe,
  type Aire,
} from "./flight/turbulencia";
import { esAguaDeCasa } from "./world/agua-de-casa";
import { DE_CLASE, Estelas, type QuienVuela } from "./flight/estela";
import {
  InstructorGrabado,
  nuevoBancoDeVoces,
  turnoDe,
  type BancoDeVoces,
} from "./audio/instructor-grabado";
import { apuntarVuelo, type Paso } from "./flight/bitacora";
import { plano } from "./ui/hangar";
import { superficieEn, TRAQUETEO, type Superficie } from "./world/superficie";
import { mapaDePavimento, type Pavimento } from "./world/vegetation";
import {
  AvisosDeAltura,
  laCuentaDe,
  radioaltimetro,
  type Aviso,
  type Lectura,
} from "./flight/avisos-de-altura";
import {
  canalesDe,
  cantaLaCabina,
  claveDelAviso,
  EN_GRANDE,
  EN_GRANDE_EN_PIES,
  laInstructoraLoExplica,
} from "./flight/escalera";
import { avisoDeTerreno, fueraDeLaSenda } from "./flight/aviso-de-terreno";
import {
  gravedadDelSuelo,
  juntarAvisos,
  mirarDelante,
  type AvisoDelSuelo,
  type AvisoDelante,
  type Delante,
  type PistaConocida,
} from "./flight/terreno-delante";
import {
  loQueSePasa,
  topeDeLoSacado,
  vfeDeLaMuesca,
  vfeEn,
} from "./flight/limites";
import {
  FLAPS_SANOS,
  cuidarLosFlaps,
  hastaDondeBajan,
  type CargaDeFlaps,
} from "./flight/carga-de-flaps";
import { siguienteDetente } from "./flight/flaps";
import {
  NADA_DICHO,
  flapsTrasLaToma,
  type LoDicho,
} from "./flight/despues-de-aterrizar";
import {
  enElPavimento,
  esAfis,
  puntoMasCercanoDe,
  sinTorre,
  type Aerodrome,
} from "./world/aerodrome";
import { MundoVecino } from "./world/mundo-vecino";
import { desplazarAerodromo } from "./world/aerodromo-desplazado";
import { laMasCerca, sobreAlguna, type Pista } from "./world/pistas-del-vuelo";
import {
  campoDeCasa,
  campoVecino,
  distanciaAlUmbral,
  enLaPistaDe,
  umbralEnUso,
  type CampoEnElMundo,
} from "./world/campo-del-vuelo";
import {
  antesDelUmbralDeToma,
  hastaElUmbralDeToma,
  sobreDondeSeToca,
} from "./world/umbral-desplazado";
import { crearAvionesDeRuta, type AvionesDeRuta } from "./world/aviones-de-ruta";
import { enCanarias } from "./world/canarias";
import { Bandadas, bandadasDelCampo } from "./world/bandadas";
import { DibujoDeBandadas } from "./world/bandadas-dibujo";
import {
  HALCON_DEL_CETRERO,
  SERVICIO_DE_FAUNA,
  especieDeLaFinal,
  regionDe,
} from "./world/aves";
import {
  FaunaDelAeropuerto,
  sitioDelServicio,
} from "./world/fauna-del-aeropuerto";
import {
  AvesEnLaFinal,
  LLEGANDO,
  avisoDeLaTorre,
} from "./flight/aviso-de-aves";
import { dondeCae } from "./world/entre-aerodromos";
import { cruceroDelTramo, rutaDelTramo, type DelJuego } from "./world/ruta-del-tramo";
import { crearBarcos, luzDeLaEstela, type Barcos } from "./world/barcos";
import {
  TraficoDeLasIslas,
  type Aeropuerto,
} from "./flight/trafico-de-las-islas";
import {
  crearAvionesDeLasIslas,
  type AvionesDeLasIslas,
} from "./world/aviones-de-las-islas";
import {
  celdasDe,
  cuantoSacude,
  ecoEn,
  laQueVieneDelante,
  seRodea,
  type Celda,
} from "./flight/tormentas";
import { horaSolarEn } from "./world/hora";
import { Cinturon, SACUDE, YA_NO_SACUDE } from "./flight/cinturon";
import { calorQuePesa } from "./flight/caliente-y-alto";
import {
  aCuantoCaptura,
  loSolto,
  mandosPara,
  memoriaNueva,
  modoVertical,
  sePuedeConectar,
  TOQUE,
  type Memoria,
  type ModoLateral,
  type ModoVertical,
  type Objetivos,
} from "./flight/piloto-automatico";
import {
  llevaGasesAutomaticos,
  llevaPilotoAutomatico,
  type ModoDeGases,
} from "./flight/gases-automaticos";
import {
  NUDO,
  velocidadQueToca,
  type VelocidadQueToca,
} from "./flight/escalera-de-velocidades";
import {
  AvisadorDeAltitud,
  PIE as PIE_EN_METROS,
  aLaVentanilla,
  girarLaVentanilla,
  llevaVentanillaDeAltitud,
  topeDeLaVentanilla,
  ventanillaEnLaFinal,
  type Alerta,
} from "./flight/altitud-seleccionada";
import {
  AutorizacionDeSubida,
  alturaEnCastellano,
  alturaEnRadio,
  altitudDeTransicion,
  escalonesDeSubida,
} from "./flight/autorizacion-de-altitud";
import { nivelMasTranquilo, ESPERA_CON_BACHES } from "./flight/nivel-tranquilo";
import { MARGENES } from "./flight/minimos";
import {
  bandaDeAhora,
  yaLoEstaCorrigiendo,
  queSeDice,
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
import {
  avisaLaPerdida,
  avisoDeActitud,
  type AvisoDeActitud,
} from "./flight/avisos-de-actitud";
import { abrirLaVentanaDePruebas } from "./dev/sondas";
import { Reparto } from "./hechos";
import { unaForma } from "./audio/variantes";
import {
  LaAproximacion,
  type CampoDeLaAproximacion,
} from "./flight/la-aproximacion";
import { asentarAerodromoSobreLaFoto } from "./world/asentar-aerodromo";
import {
  laVelocidadEsDelJuego,
  limitarElRodaje,
  RODAJE,
} from "./flight/tope-de-rodaje";
import { escribirYa, leerTexto, ponerTexto } from "./datos/guardado";
import {
  pedirRearranque,
  sePuedeCambiarDeAvion,
} from "./flight/cambio-de-avion";

/**
 * La sesión de la pestaña, o nada si el navegador no la da.
 *
 * Acceder a ella puede lanzar —almacenamiento bloqueado, ventana privada de
 * algunos navegadores— y sin ella el cambio de avión sigue funcionando: solo
 * que el arranque pasará por el hangar, con el avión nuevo ya elegido.
 */
function sesionDeLaPestana(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}
import {
  aDondeConLaReserva,
  elAlterno,
  tramosDelPlan,
  type CampoDelVuelo,
} from "./flight/alterno";
import { dibujarReloj, relojDe } from "./ui/reloj";

/** Lo más deprisa que se le deja ir al reloj del juego. Ver `Game.acelerar`. */
const TOPE_DE_ACELERACION = 16;

/**
 * **A qué altura sobre la pista se suelta el automático en la final**, m:
 * seiscientos pies. Ver `conElPilotoAutomatico`.
 */
const SUELTA_PARA_ATERRIZAR = 600 * 0.3048;
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

/**
 * Las fases en las que se tiene la pista para despegar, **la primera que
 * llegue**: con torre se pasa por «autorizado», en Pettirossi por el
 * back-taxi, y en la pista de hierba de casa se va directo a correr. Ver
 * `decirElCalor`.
 */
const ANTES_DE_CORRER: ReadonlySet<Fase> = new Set<Fase>([
  "autorizado",
  "back-taxi",
  "alineando",
  "despegando",
]);

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

/**
 * Lo que dura la tarjeta del punto de descenso, s. Seis: no es urgente, y hay
 * que tener tiempo de mirarla, mirar la carta y ver el círculo que se acaba
 * de pasar.
 */
const SE_QUEDA_EL_DESCENSO = 6;

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

/** Un campo del vuelo con su escenario, que es de donde sale su nombre. */
interface CampoConNombre extends CampoDelVuelo {
  readonly escenario: Scenario;
}

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

  /**
   * El escenario de destino, ya con su relieve, si esta ruta lleva a otro
   * aeropuerto.
   *
   * Viene de fuera y no se carga aquí por lo mismo que el relieve y la ciudad:
   * es un fichero que hay que tener **antes** de construir el mundo, y
   * encadenarlo detrás de los otros duplicaría la espera del arranque. Ver
   * `Scenario.destino` y `MundoVecino`.
   */
  vecinos?: readonly Scenario[];

  /**
   * Los destinos de la ruta que **este avión no puede hacer**: no son vecinos
   * —no se cargan ni se pintan en la carta—, pero se nombran al tocar la
   * tarjeta del destino, para que «no pasa nada» se entienda. Ver
   * `siguienteDestino`.
   */
  noCaben?: readonly Scenario[];

  /**
   * **A dónde se va**, elegido en el hangar: el identificador de uno de los
   * `vecinos`, o el del propio escenario para una vuelta al campo.
   *
   * Sin él —se entró con la dirección puesta, o el elegido no vale para este
   * avión— se va al vecino más cercano, que es lo que hacía el juego antes de
   * que se pudiera elegir. Ver `destinoDeSalida`.
   */
  destino?: string;

  /**
   * Y sus fotografías, una por vecino y en el mismo orden, para que las islas
   * de enfrente no salgan de polígonos. Ver `MundoVecino`.
   */
  fotosVecinas?: readonly (Ortofoto | undefined)[];

  /**
   * La rejilla de ciudad **para las luces**, aunque no se construya nada.
   *
   * `scenario.ciudad` se quita cuando la fotografía fina ya enseña la ciudad
   * —a dos metros por píxel un tejado es un tejado y nuestra malla encima es
   * una losa gris—, y eso vale de día. **De noche la foto no enseña nada**:
   * sin esto, los dos escenarios con ciudad extraída eran justo los dos que
   * se quedaban a oscuras. Ver `world/luces-de-ciudad.ts`.
   */
  luzDeCiudad?: Ciudad;

  /** La del horizonte: el anillo lejano. Ver `Terrain.ponerOrtofotoLejana`. */
  ortofotoHorizonte?: Ortofoto;

  /**
   * Si el dibujo lleva la curva de la Tierra. Sin decir nada, sí: ver
   * `CURVAR_EL_DIBUJO`. Se pasa `false` para comparar con el mundo plano.
   */
  curvatura?: boolean;

  /**
   * Y la de en medio: la franja por la que de verdad se vuela.
   *
   * Cincuenta y cuatro kilómetros a diecisiete metros por píxel. Entre el
   * borde del mapa fino —nueve kilómetros— y el del mundo, el detalle caía
   * de ocho metros por píxel a ciento treinta y cuatro de golpe, y esa
   * franja es justo lo que se mira desde el aire: «¿de qué me sirven unos
   * triángulos o paisajes sin nada en un juego donde quiero contar historia,
   * enseñar, que descubran, que vean ríos, bosques, ciudades?».
   */
  ortofotoMedia?: Ortofoto;
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

/**
 * Cuánto gas es «llegar con gas» a la recogida, de 0 a 1.
 *
 * Un quince por ciento: por encima del ralentí con holgura para que un dedo
 * que no ha soltado del todo la palanca no lo dispare, y por debajo de
 * cualquier gas de aproximación de la flota. Ver `acompanarLaRecogida`.
 */
const GAS_EN_LA_RECOGIDA = 0.15;

/**
 * Lo que la instructora dice de la final y de la recogida: al tocar tierra ya
 * no describe nada. Ver `alTocarTierra`.
 */
const DEL_AIRE =
  /^vuelo\.(?:quitaElGas|yaPodesTocar|lentoYBajo|rapido|pediFlaps|bajasRapido|muyInclinado|minimos|final|aroAlto|aroBajo|papi\w*|terrenoBajo|terrenoSube)(?:[~@].*)?$/;

/**
 * Cuánto antes de la pista se deja de avisar del terreno, m.
 *
 * Trescientos: el umbral se cruza a quince metros, y un avión que viene bien a
 * esa altura está, visto por el aviso de terreno, bajísimo. Esto es **solo**
 * para callar ese aviso; dónde se dice «ya podés tocar» no lleva margen. Ver
 * `sobreDondeSeToca`.
 */
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

/** Cada cuánto mira por delante el avisador de terreno, s. Ver `mirarElTerrenoDelante`. */
const CADA_CUANTO_SE_MIRA_DELANTE = 0.2;

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
/**
 * El respaldo, por si una ficha no dice a qué altura mete el tren, m.
 *
 * No debería usarlo nadie: los seis aviones lo declaran. Está para que un
 * avión nuevo sin ese campo no se quede sin aviso — y `aircraft.test.ts`
 * comprueba que todos los retráctiles lo traigan, así que si esto llega a
 * usarse es que alguien se saltó la prueba.
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

  /**
   * Los otros aeropuertos de la ruta: escenarios enteros puestos a su
   * distancia. Ver `mundo-vecino.ts`.
   *
   * **Eran uno.** Nació como «volar a otro aeropuerto» —ADR 0007— y con uno
   * se quedó corto en cuanto alguien voló de verdad: desde El Hierro se ven
   * La Gomera y La Palma las dos en el horizonte, se pone rumbo a la que se
   * quiera, y solo una tenía pista. «¿Y el aeropuerto de La Palma?»
   *
   * Cada uno trae su mundo, su pista ya corrida a coordenadas de aquí y su
   * aeródromo corrido igual, que es lo que necesita el plan de tierra para
   * trazar la raya de vuelta al hangar allí.
   */
  private readonly vecinos: {
    readonly mundo: MundoVecino;
    /** Su escenario tal y como llegó, sin el viento de hoy. */
    readonly base: Scenario;
    /** Su aeródromo corrido a este mundo. No depende del viento. */
    readonly aerodromo: Aerodrome | null;
    /**
     * Y su suelo: qué es asfalto allí y qué no. Ver `superficieDeAhora`.
     */
    readonly pavimento: Pavimento | null;
    /**
     * **El campo, con el viento de hoy**: su escenario, su pista corrida con
     * la cabecera en uso y el escenario corrido entero, que es la única forma
     * en que `superficieEn` sabe preguntarlo. No es `readonly` porque el
     * viento cambia la cabecera. Ver `ponerTiempo` y `world/campo-del-vuelo.ts`.
     */
    campo: CampoEnElMundo;
    /**
     * Sus luces de aproximación y su PAPI, y las azules de sus calles.
     *
     * Solo se montaban para casa, así que llegando de noche a Los Rodeos
     * desde Gran Canaria no había PAPI ni luces de aproximación, cuando las
     * tiene de verdad —y las tenía el mismo Los Rodeos jugado como casa—. Un
     * instrumento que existe según de dónde se venga no es de verdad.
     */
    aproximacion: Aproximacion | null;
    rodadura: LucesDeRodadura | null;
    /** Si ya se montaron, aunque no haya ninguna. Ver `ponerLucesDelVecino`. */
    lucesPuestas: boolean;
    /** Su granja, si la tiene: la de casa cuando se vuelve a ella. */
    granja: Granja | null;
  }[] = [];

  /**
   * El campo de casa, hecho una vez por escenario: `ponerTiempo` cambia el
   * escenario y con él la cabecera. Ver `laCasa`.
   */
  private casaHecha: CampoEnElMundo | null = null;

  /** El campo de casa con el escenario de ahora. */
  private get laCasa(): CampoEnElMundo {
    if (this.casaHecha?.escenario !== this.scenario)
      this.casaHecha = campoDeCasa(this.scenario);
    return this.casaHecha;
  }

  /**
   * **Un campo del vuelo: el que se tiene debajo, o el de `id`.**
   *
   * La única fuente para todo lo que pregunta por «el campo»: su pista, su
   * umbral en uso, su aeródromo, su cota, su nombre. Medio juego preguntaba
   * por `this.scenario` —el de casa—, y en el aeropuerto de llegada eso
   * contestaba con la pista de Gando a ciento trece kilómetros: la final se
   * medía contra ella, la torre la nombraba y la aguja la señalaba. Ver
   * `world/campo-del-vuelo.ts`.
   */
  private elCampo(id?: string): CampoEnElMundo {
    if (id === undefined) return this.elVecinoDeAhora()?.campo ?? this.laCasa;
    if (id === this.scenario.id) return this.laCasa;
    return this.vecinos.find((v) => v.campo.id === id)?.campo ?? this.laCasa;
  }

  /** La cota del asfalto de un campo en un punto del mundo, m. */
  private cotaDePistaEn(campo: CampoEnElMundo, x: number, z: number): number {
    const v = campo.esCasa
      ? null
      : this.vecinos.find((w) => w.campo.id === campo.id);
    if (!v) return this.terrain.cotaDeLaPista(x, z);
    const d = v.mundo.desplazamiento;
    return v.mundo.terreno.cotaDeLaPista(x - d.x, z - d.z);
  }

  /** El primero, para lo que todavía habla de «el vecino» en singular. */
  get vecino(): MundoVecino | null {
    return this.vecinos[0]?.mundo ?? null;
  }

  /** Los otros aviones de la ruta, si esta ruta lleva a alguna parte. */
  private avionesDeRuta: AvionesDeRuta | null = null;

  /** Los de la ruta, para los bancos. */
  get avionesDeRutaParaBanco(): AvionesDeRuta | null {
    return this.avionesDeRuta;
  }

  /** El reloj del vuelo que mueve a los de la ruta, en segundos. */
  private relojDeRuta = 0;

  /**
   * **Y los barcos entre islas**, solo en Canarias. Ver `world/barcos.ts`.
   *
   * Se mueven con el mismo reloj que los de la ruta, más un adelanto que solo
   * toca el banco: para fotografiar un barco en medio del canal no se puede
   * esperar la hora y pico que tarda en salir.
   */
  private barcos: Barcos | null = null;
  private adelantoDeLosBarcos = 0;

  /**
   * **Y los turbohélices de las islas**, cruzándose con quien vuela, solo en
   * Canarias. Ver `flight/trafico-de-las-islas.ts`.
   */
  private islenos: TraficoDeLasIslas | null = null;
  private avionesDeLasIslas: AvionesDeLasIslas | null = null;

  /** Los barcos, para los bancos. */
  get barcosParaBanco(): Barcos | null {
    return this.barcos;
  }

  /** Los turbohélices de las islas, para los bancos. */
  get islenosParaBanco(): TraficoDeLasIslas | null {
    return this.islenos;
  }

  /**
   * **Los grupos dibujados de los tres tráficos**, para el banco del radar:
   * con ellos se mira si cada avión que el TCAS pinta se dibuja en el mundo y
   * dónde cae en la pantalla. Ver `verificar-radar.mjs`.
   */
  get gruposDelTraficoParaBanco(): readonly Object3D[] {
    return [
      this.trafico?.grupo,
      this.avionesDeRuta?.grupo,
      this.avionesDeLasIslas?.grupo,
    ].filter((g): g is Group => !!g);
  }

  /**
   * **Tráfico de prueba**, sin dibujo ni radio: transpondedores puestos a mano
   * para el banco del radar, que comprueba que cada uno sale en su sitio en
   * la carta. Vacío en el juego. Ver `vigilarElTrafico`.
   */
  intrusosDePrueba: readonly Intruso[] = [];

  /** Para el banco: adelanta el reloj de los barcos, s. */
  adelantarLosBarcos(segundos: number): void {
    this.adelantoDeLosBarcos += segundos;
  }

  /**
   * Para el banco: esconde o enseña los barcos y los aviones de las islas,
   * para medir lo que cuestan con el resto del mundo igual.
   */
  mostrarLaVidaDelMar(si: boolean): void {
    if (this.barcos) this.barcos.grupo.visible = si;
    if (this.avionesDeLasIslas) this.avionesDeLasIslas.grupo.visible = si;
  }

  /** Para el banco: lanza ya un turbohélice que se cruce, si cabe alguno. */
  lanzarUnIslenoParaBanco(): boolean {
    if (!this.islenos) return false;
    return this.islenos.lanzar(this.yoParaLasIslas());
  }

  // ── Las aves ──────────────────────────────────────────────────────────

  /**
   * **Las bandadas de todos los campos del vuelo**, y su dibujo. Ver
   * `world/bandadas.ts` y `world/aves.ts`.
   *
   * La cota es la de lo que se ve: el agua donde hay agua, que es por donde
   * pasan rozando las pardelas.
   */
  readonly bandadas = new Bandadas((x, z) => this.terrain.sampleSurface(x, z));
  readonly dibujoDeBandadas = new DibujoDeBandadas();

  /** El servicio de fauna de cada campo que lo tiene. Ver `world/fauna-del-aeropuerto.ts`. */
  private faunaDeLosCampos: FaunaDelAeropuerto[] = [];

  /** El aviso de aves en la final. Ver `flight/aviso-de-aves.ts`. */
  private readonly avesEnLaFinal = new AvesEnLaFinal();

  /**
   * Si la instructora ya contó por qué se sube ante un ave. Una vez por
   * partida, como el rombo del TCAS: la segunda vez no enseña nada nuevo.
   */
  private avesExplicadas = false;
  /** Y si está esperando a que la torre acabe para contarlo. */
  private explicarLasAvesDespues = false;
  /** Si ya contó lo de la uve. También una vez por partida. */
  private uveExplicada = false;
  /** Para el banco: que la próxima final traiga aves seguro. */
  avesEnLaFinalSeguro = false;
  /** Si en el paso anterior había aves de la final por delante. Para el banco. */
  private avesDelanteAntes = false;

  /** El reloj con el que vuelan las aves, s. Para el banco. */
  get relojDeLasAves(): number {
    return this.relojDeRuta;
  }

  /**
   * **Pone las aves de cada campo del vuelo**, con la hora, el tiempo y el
   * mes de hoy.
   *
   * Se rehace al cambiar la hora o el parte, porque de eso depende la
   * térmica: sin sol no hay corro de buitres. Y de noche no vuela casi nadie
   * —las aves de día duermen—, así que de noche no hay bandadas.
   */
  private poblarDeAves(): void {
    this.bandadas.quitar((b) => !b.enFinal);
    for (const f of this.faunaDeLosCampos) f.soltar();
    this.faunaDeLosCampos = [];
    if (this.sky.sunDirection.y < 0.03) return;
    const meteo = this.scenario.meteo;
    const calor = calorDelSuelo(
      this.horaDelVuelo,
      meteo?.temp ?? 20,
      meteo?.tapadura ?? (this.techoDeNubes === null ? 0 : 0.5),
      false,
    );
    const mes = new Date().getMonth() + 1;
    const campos = [this.laCasa, ...this.vecinos.map((v) => v.campo)];
    for (const campo of campos) {
      const region = regionDe(campo.escenario);
      if (!region) continue;
      const nivel = campo.escenario.waterLevel;
      const esAgua = (x: number, z: number): boolean =>
        esAguaDeCasa(this.terrain.sampleHeight(x, z), nivel);
      const aero = campo.aerodromo;
      const suelo = (x: number, z: number): number =>
        this.terrain.sampleSurface(x, z);
      this.bandadas.poner(
        bandadasDelCampo(
          {
            id: campo.id,
            escenario: campo.escenario.id,
            region,
            x: campo.pista.x,
            z: campo.pista.z,
            rumbo: campo.pista.heading,
            largo: campo.pista.length,
          },
          {
            suelo,
            esAgua,
            ocupado: aero ? (x, z) => enElPavimento(aero, [x, z], 40) : undefined,
            calor,
            capa: capaDeMezcla(calor),
            mes,
          },
        ),
      );
      /*
       * **Y el servicio de fauna del campo**, donde lo hay y está escrito con
       * su fuente. Ver `SERVICIO_DE_FAUNA` en `world/aves.ts`.
       */
      const servicio = SERVICIO_DE_FAUNA[campo.escenario.id];
      if (!servicio) continue;
      const sitio = sitioDelServicio(campo.pista, aero, suelo, esAgua);
      if (!sitio) continue;
      const fauna = new FaunaDelAeropuerto(
        sitio,
        this.terrain.sampleHeight(sitio.x, sitio.z),
        servicio.cetreria,
      );
      this.faunaDeLosCampos.push(fauna);
      this.scene.add(fauna.grupo);
      if (servicio.cetreria) {
        /*
         * El halcón da vueltas alrededor de quien lo vuela, que está junto a
         * la furgoneta del lado contrario a la pista.
         */
        const [tx, tz] = traves(sitio.rumbo);
        const x = sitio.x - tx * sitio.ladoDeLaPista * 3.2;
        const z = sitio.z - tz * sitio.ladoDeLaPista * 3.2;
        this.bandadas.poner([
          {
            id: `${campo.id}:cetreria`,
            campo: campo.id,
            especie: HALCON_DEL_CETRERO,
            cuantas: 1,
            x,
            z,
            radioLargo: 38,
            radioCorto: 38,
            giro: 0,
            altura: 16,
            suelo: this.terrain.sampleHeight(x, z),
            sentido: 1,
            semilla: 0.3,
          },
        ]);
      }
    }
  }

  /** Lo que hace falta para mover las aves y el rotativo, un paso. */
  private moverLasAves(dt: number): void {
    this.bandadas.paso(this.relojDeRuta, this.flight.state.position);
    for (const f of this.faunaDeLosCampos) f.paso(this.relojDeRuta);
    this.vigilarLasAves(dt);
    this.mirarLasUves();
  }

  /** A cuánto del umbral estaba el avión en el paso anterior, m. */
  private alUmbralAntes = Infinity;

  /**
   * **Las aves en la final**, un paso: ponerlas si esta final las trae, el
   * aviso de la torre, la explicación detrás y la tarjeta de «subí» cuando
   * están de frente. Ver `flight/aviso-de-aves.ts`.
   */
  private vigilarLasAves(dt: number): void {
    const s = this.flight.state;
    const campo = this.elCampo();
    const alUmbral = distanciaAlUmbral(campo, s.position.x, s.position.z);
    /*
     * **Si viene a aterrizar**: en final, o cerca, bajo y acercándose. En el
     * circuito eso empieza en el viento en cola, que es un momento tranquilo:
     * la torre avisa ahí y la instructora lo explica antes de la final, que es
     * donde se juntan la autorización, la fase y la cuenta. Ver `LLEGANDO`.
     */
    const [ux, uz] = umbralEnUso(campo);
    const acercandose =
      dt > 0 && (this.alUmbralAntes - alUmbral) / dt > LLEGANDO.acercandose;
    this.alUmbralAntes = alUmbral;
    const llegando =
      !s.onGround &&
      (this.faseDeAhora === "final" ||
        (this.faseDeAhora === "en-vuelo" &&
          acercandose &&
          alUmbral < LLEGANDO.alUmbral &&
          s.position.y - this.cotaDePistaEn(campo, ux, uz) < LLEGANDO.sobreElCampo));
    const dado = this.avesEnLaFinalSeguro ? 0 : Math.random();
    const deLaFinal = this.bandadas.lista.filter(
      (b) => b.enFinal && b.campo === campo.id,
    );
    const suceso = this.avesEnLaFinal.paso({
      tramo: this.tier.id,
      campo: campo.id,
      hayTorre: this.hayTorreQueHable(),
      llegando,
      enFinal: this.faseDeAhora === "final",
      enElSuelo: s.onGround,
      alUmbral,
      velocidad: s.groundSpeed,
      dado,
      bandadas: deLaFinal.map((b) => {
        const d = this.bandadas.dondeEsta(b, this.relojDeRuta);
        return { id: b.id, x: d.x, y: d.y, z: d.z };
      }),
      avion: {
        x: s.position.x,
        y: s.position.y,
        z: s.position.z,
        rumbo: s.heading,
      },
    });
    if (suceso?.que === "poner") {
      this.apuntarCanto(
        `aves: a ${Math.round(suceso.distancia)} m del umbral, el avión a ${Math.round(alUmbral)} · t ${this.relojDeRuta.toFixed(1)}`,
      );
      this.ponerAvesEnLaFinal(campo, suceso);
    } else if (suceso?.que === "torre") {
      this.apuntarCanto(`aves: avisa la torre · t ${this.relojDeRuta.toFixed(1)}`);
      this.avisarDeLasAves(campo, suceso.bandada);
    }
    else if (suceso?.que === "deFrente") {
      const clave = claveDelAviso(this.tier.avisos, "aves.deFrente", "palabra.subi");
      this.hud.senal.mostrar(
        comoDibujo("aves-subi"),
        clave ? t(clave as TranslationKey) : "",
        null,
        { segundos: 6, prioridad: IMPORTANTE },
      );
    }
    /*
     * **Si las aves de la final siguen ahí delante**: sin espantar, por
     * delante del morro y a menos de ocho kilómetros. Es lo que decide si lo
     * que dijo la torre y lo que va a explicar la instructora siguen siendo
     * verdad — y no la fase, que en una final con viento entra y sale del
     * embudo, ni el campo de ahora, que cambia de uno a otro en la ruta.
     */
    const [fx, fz] = delante(MathUtils.radToDeg(s.heading));
    let porQueNo = s.onGround ? "en el suelo" : "no hay";
    const siguenDelante =
      !s.onGround &&
      this.bandadas.lista.some((b) => {
        if (!b.enFinal) return false;
        const d = this.bandadas.dondeEsta(b, this.relojDeRuta);
        const dx = d.x - s.position.x;
        const dz = d.z - s.position.z;
        const lejos = Math.round(Math.hypot(dx, dz));
        if (this.bandadas.sustoDe(b.id) !== null) porQueNo = `espantadas a ${lejos} m`;
        else if (lejos >= 8000) porQueNo = `a ${lejos} m`;
        else if (dx * fx + dz * fz <= 0) porQueNo = `detrás, a ${lejos} m`;
        else return true;
        return false;
      });
    // Para el banco: cuándo dejan de estar delante, y por qué. Ver `apuntarCanto`.
    if (this.avesDelanteAntes && !siguenDelante)
      this.apuntarCanto(`aves: ya no están delante (${porQueNo}) · t ${this.relojDeRuta.toFixed(1)}`);
    this.avesDelanteAntes = siguenDelante;
    /*
     * **Detrás de la torre, no a la vez.** La explicación espera a que el
     * canal quede libre, y se cae si ya no es verdad: una explicación de unas
     * aves que ya se pasaron no enseña nada.
     */
    if (this.explicarLasAvesDespues) {
      if (!siguenDelante) {
        this.explicarLasAvesDespues = false;
      } else if (BOCA.libre && !this.torre.hablando) {
        this.explicarLasAvesDespues = false;
        this.avesExplicadas = true;
        this.instructor.decir(t("vuelo.aves.porQueSubir"), "vuelo.aves.porQueSubir");
      }
    }
    /*
     * **Y lo que dijo la torre se retira cuando ya no es verdad**: con la
     * bandada espantada o detrás, o en el suelo. Lo que ya está sonando se
     * deja acabar. Ver `esElAvisoDeAves` en `audio/torre.ts`.
     */
    if (!siguenDelante) BOCA.retirar((c) => esElAvisoDeAves(c));
    // Las de la final que ya se espantaron se van, y en el suelo también: a
    // la vuelta, otra final.
    this.bandadas.quitar((b) => {
      if (!b.enFinal) return false;
      if (s.onGround) return true;
      const desde = this.bandadas.sustoDe(b.id);
      return desde !== null && this.relojDeRuta - desde > 40;
    });
  }

  /** La bandada de la final, en la senda de la pista en uso. */
  private ponerAvesEnLaFinal(
    campo: CampoEnElMundo,
    sitio: { distancia: number; altura: number },
  ): void {
    const region = regionDe(campo.escenario);
    if (!region) return;
    const [ux, uz] = umbralEnUso(campo);
    const [fx, fz] = delante(campo.pista.heading);
    const x = ux - fx * sitio.distancia;
    const z = uz - fz * sitio.distancia;
    const suelo = this.terrain.sampleSurface(x, z);
    const altura = this.cotaDePistaEn(campo, ux, uz) + sitio.altura - suelo;
    // Con el terreno subiendo en la final ya no caben: se deja.
    if (altura < 25) return;
    /*
     * Y lejos del avión: viniendo del viento en cola la final queda de lado, y
     * a menos de novecientos metros una bandada se vería aparecer de la nada.
     */
    const p = this.flight.state.position;
    if (Math.hypot(x - p.x, z - p.z) < 900) return;
    const especie = especieDeLaFinal(region);
    this.bandadas.poner([
      {
        id: `${campo.id}:final:${Math.round(this.relojDeRuta)}`,
        campo: campo.id,
        especie,
        cuantas: Math.round((especie.grupo[0] + especie.grupo[1]) / 2),
        x,
        z,
        radioLargo: 90,
        radioCorto: 60,
        giro: (campo.pista.heading + 90) % 360,
        altura,
        suelo,
        sentido: 1,
        semilla: Math.random(),
        enFinal: true,
      },
    ]);
  }

  /**
   * **La torre avisa de aves en la final**, como una de verdad: en inglés,
   * con tu indicativo delante, dónde y a cuántos pies. Ver `avisoDeLaTorre`
   * en `flight/aviso-de-aves.ts`. La tarjeta lo dibuja y lo escribe según el
   * peldaño, y en el que explica, la instructora lo cuenta después.
   */
  private avisarDeLasAves(campo: CampoEnElMundo, id: string): void {
    const b = this.bandadas.lista.find((x) => x.id === id);
    if (!b) return;
    const [ux, uz] = umbralEnUso(campo);
    const habla = hablaDe(campo.escenario.aerodrome?.id);
    const aviso = avisoDeLaTorre(
      this.bandadas.dondeEsta(b, this.relojDeRuta).y -
        this.cotaDePistaEn(campo, ux, uz),
      habla,
    );
    const yo = this.miIndicativo;
    const texto = `${yo.dicho}, ${aviso.texto}`;
    const clave = comoSeDiceAqui("torre.aves", habla);
    /*
     * Con el peso de lo que la torre te dice a ti: un comentario no lo echa
     * de la cola. Y sin reloj: espera a que se libre el canal y lo retira
     * `vigilarLasAves` si deja de ser verdad. Ver `esElAvisoDeAves`.
     */
    this.torre.decir(texto, clave, "mando", {
      ...rellenoDe(yo),
      altura: aviso.altura,
    });
    this.hud.radio(texto, undefined, true);
    const rotulo = claveDelAviso(this.tier.avisos, "aves.enLaFinal", "palabra.mira");
    this.hud.senal.mostrar(
      comoDibujo("aves"),
      rotulo ? t(rotulo as TranslationKey) : "",
      null,
      { segundos: 6, prioridad: 0 },
    );
    if (laInstructoraLoExplica(this.tier.avisos) && !this.avesExplicadas)
      this.explicarLasAvesDespues = true;
  }

  /**
   * **Pájaros en uve**: la primera vez que se ve una de cerca, la instructora
   * cuenta por qué van así — es la estela al revés. Una vez por partida, en
   * vuelo tranquilo y sin nadie hablando: es paisaje, no un aviso.
   */
  private mirarLasUves(): void {
    if (this.uveExplicada) return;
    const s = this.flight.state;
    if (s.onGround || s.heightAboveGround < 60) return;
    if (Math.abs(s.verticalSpeed) > 4) return;
    if (this.faseDeAhora !== "en-vuelo") return;
    if (
      !BOCA.libre ||
      this.instructor.hablando ||
      this.torre.hablando ||
      this.comandante.hablando ||
      this.maquina.ocupada
    )
      return;
    const rumbo = s.heading;
    for (const b of this.bandadas.lista) {
      if (b.especie.forma !== "uve") continue;
      const d = this.bandadas.dondeEsta(b, this.relojDeRuta);
      const dx = d.x - s.position.x;
      const dz = d.z - s.position.z;
      const lejos = Math.hypot(dx, dz, d.y - s.position.y);
      if (lejos > 900) continue;
      let angulo = Math.atan2(dx, -dz) - rumbo;
      angulo = Math.atan2(Math.sin(angulo), Math.cos(angulo));
      if (Math.abs(angulo) > Math.PI / 3) continue;
      this.uveExplicada = true;
      this.instructor.decir(t("vuelo.aves.enUve"), "vuelo.aves.enUve", "baja");
      return;
    }
  }

  /**
   * **El TCAS, una vez por fotograma**: le pasa quién contesta y dónde, y
   * dice los avisos que empiecen.
   *
   * Los tres tráficos del juego —el del circuito, el de la ruta y el
   * turbohélice de las islas— en una lista, porque para un TCAS un
   * transpondedor es un transpondedor. Cada uno con un nombre que no se pueda
   * repetir entre las tres fuentes: el TCAS sigue a cada uno por el suyo.
   */
  private vigilarElTrafico(dt: number): void {
    const s = this.flight.state;
    // El sol de ahora para las luces de todos los demás: de día se las come.
    // Ver `ponerLaLuzDelDia`.
    ponerLaLuzDelDia(this.sky.sunDirection.y);
    const intrusos: Intruso[] = [];
    const llegando = new Set<string>();
    for (const q of this.trafico?.quienes() ?? []) {
      const id = `circuito:${q.matricula}`;
      if (q.llegando) llegando.add(id);
      intrusos.push({
        id,
        x: q.x,
        y: q.y,
        z: q.z,
        // Lo que diría su transpondedor: posado, si va pegado al suelo.
        enElSuelo: q.y - this.terrain.sampleHeight(q.x, q.z) < 5,
      });
    }
    for (const q of this.avionesDeRuta?.quienes() ?? [])
      intrusos.push({ id: `ruta:${q.id}`, x: q.x, y: q.y, z: q.z });
    for (const q of this.islenos?.quienes() ?? [])
      intrusos.push({ id: `islas:${q.id}`, x: q.x, y: q.y, z: q.z });
    // Y los de prueba del banco del radar, que en el juego no hay ninguno.
    intrusos.push(...this.intrusosDePrueba);
    this.llegandoAhora = llegando;
    this.apuntarLasEstelas();

    /*
     * **Y la banda de altura, como la pondría quien vuela**: ABV subiendo a
     * la ventanilla, BLW bajando a ella, NORM nivelado. Ver `bandaPara`.
     */
    this.bandaDelTcas = s.onGround
      ? "NORM"
      : bandaPara(
          this.ventanillaEnPies(),
          this.altitudIndicada() / PIE_EN_METROS,
          this.bandaDelTcas,
        );
    const avisos = this.tcas.paso(
      dt,
      this.aircraft.tcas,
      {
        x: s.position.x,
        y: s.position.y,
        z: s.position.z,
        sobreElSuelo: s.heightAboveGround,
        rumbo: MathUtils.radToDeg(s.heading),
        banda: this.bandaDelTcas,
        /*
         * **En el aire, siempre; en tierra, desde el punto de espera.**
         *
         * Es cuando se pasa el selector del TCAS de espera a TA/RA: al
         * acercarse al punto de espera de la pista de salida, y no antes, que
         * rodando por la plataforma solo serviría para molestar a los demás.
         * Y es cuando más falta hace mirar la pantalla: el plan europeo contra
         * incursiones en pista —EAPPRI v3.0, EUROCONTROL 2017, apéndice D,
         * buenas prácticas de tripulación— lo dice con estas palabras: «the
         * flight deck traffic display (TCAS) could also be a good tool to
         * detect traffic approaching and departing a runway», al lado de
         * «scan the entire runway and approach in both directions before
         * entering a runway». Que es lo que se pidió parado en Pettirossi: ver
         * en la pantalla al que viene a aterrizar antes de entrar.
         *
         * Y se apaga al salir de la pista después de aterrizar, que es cuando
         * se vuelve a poner en espera.
         */
        pantalla: !s.onGround || TCAS_EN_TIERRA.has(this.faseDeAhora as Fase),
        terrenoAvisando: this.terrenoAhora !== null,
      },
      intrusos,
    );
    for (const a of avisos) {
      /*
       * **Y si ese avión ya se contó en esta pasada, la instructora no lo
       * vuelve a contar.** El TCAS rearma su aviso cada vez que el otro sale
       * y vuelve a entrar en su volumen, y en un circuito con frustradas eso
       * es cada vuelta: en La Gomera, «mirá adelante: hay otro avión cerca»
       * cinco veces, por el mismo avión dando las mismas vueltas. La caja lo
       * canta cada vez, que es lo que hace una de verdad; la explicación es
       * una por pasada, con la misma regla que la información de tráfico: se
       * rearma cuando el otro se aleja de verdad o aterriza, no cuando pasa un
       * rato. Ver `SE_OLVIDA_MILLAS` en `flight/informacion-de-trafico.ts`.
       */
      /*
       * Contado quiere decir oído: una información que todavía espera turno
       * no ha explicado nada, y el aviso se explica entero.
       */
      const yaContado = this.informacionDeTrafico.yaInformado(a.id);
      // El «traffic, traffic» ya lo cuenta: la radio no lo repite después.
      this.contadoPorOtro(a.id);
      this.avisarDelTrafico(a, yaContado);
    }
    this.explicarElTrafico();
    const yo = {
      x: s.position.x,
      y: s.position.y,
      z: s.position.z,
      rumbo: MathUtils.radToDeg(s.heading),
      sobreElSuelo: s.heightAboveGround,
      enElSuelo: s.onGround,
      /*
       * **Y la boca ocupada ya no la calla: pide turno.** Esperaba a que el
       * canal estuviera libre del todo —nadie hablando y nadie esperando—,
       * porque pidiéndolo caducaba detrás de la torre: camino de Tenerife Sur,
       * «torre.canario.trafico: caducó esperando». Con la megafonía en el
       * mismo turno que todos, en una final eso no llega nunca: el del
       * circuito a doscientos pies en tu final, doce segundos sin una palabra
       * y «callado: la boca (hablando, 2 en cola)». Ahora espera su turno sin
       * reloj y se retira si deja de ser verdad. Ver `esLaInformacionDeTrafico`
       * en `audio/torre.ts`.
       */
      callado: this.terrenoAhora !== null,
    };
    /*
     * Lo que esperaba turno y ya no está en la cola sin que su voz contara
     * qué le pasó se da por dicho. Solo pasa cuando la boca se vacía de golpe
     * —al cambiar de avión, que no avisa a nadie—, y una información que
     * espera para siempre no deja pasar a ninguna otra.
     */
    const enCola = this.informacionDeTrafico.esperando;
    if (enCola && !BOCA.espera(enCola.dice))
      this.alOirLaInformacion(enCola.n, enCola.id, null);
    const revision = this.informacionDeTrafico.revisar(yo, intrusos, (a) =>
      this.comoSeDiceElTrafico(a).turno,
    );
    if (revision) {
      /*
       * Y si se vuelve a pedir dicha con lo de ahora, con el turno que tenía:
       * es la misma información. Ver `retirar` en `audio/boca.ts`.
       */
      BOCA.retirar(
        (c) => c === revision.retirar,
        revision.otra ? { pasaSuTurnoA: esLaInformacionDeTrafico } : {},
      );
      if (revision.otra) this.informarDelTrafico(revision.otra.aviso, revision.otra.n);
    }
    const info = this.informacionDeTrafico.paso(dt, yo, intrusos);
    if (info) this.informarDelTrafico(info);
  }

  /**
   * **Ese avión lo cuenta otro** —el TCAS, la ventanilla—, y si su
   * información esperaba turno, se retira: un suceso, una voz.
   */
  private contadoPorOtro(id: string): void {
    const sobra = this.informacionDeTrafico.darPorContado(id);
    if (sobra) BOCA.retirar((c) => c === sobra);
  }

  /**
   * **La información de tráfico**: dónde mirar para encontrar al que se
   * acerca. Ver `flight/informacion-de-trafico.ts`.
   *
   * Por la escalera, como todo lo que se cuenta: la tarjeta con el dibujo en
   * los cuatro peldaños —tu avión, y el otro en su hora del reloj con el
   * rombo relleno del TCAS—, «¡Mirá!» en el segundo y la hora con su altura en
   * cifras desde el tercero. La voz es la de la lámpara: de Taguató para
   * arriba, la torre en fraseología —«traffic, two o'clock, three miles, one
   * thousand feet above»—; abajo, la instructora en casa y con una pregunta,
   * «arriba a la derecha va otro avión, ¿lo ves?», que es lo que enseña a
   * buscarlo con los ojos. Donde no hay torre que hable, también ella.
   *
   * Y con prioridad cero: es información, no un aviso. Cualquier cosa que
   * importe más la tapa, y el «traffic, traffic» del TCAS el primero.
   *
   * **Y la voz, con el peso de lo que es para ti**, sin reloj: espera su
   * turno mientras sea verdad. `n` es el número de una que ya esperaba y se
   * vuelve a pedir con lo de ahora. Ver `revisar` en
   * `flight/informacion-de-trafico.ts`.
   */
  private informarDelTrafico(a: AvisoDeTrafico, n?: number): void {
    const como = this.comoSeDiceElTrafico(a);
    /*
     * Se apunta antes de pedirla: con la boca libre le toca en el acto, y su
     * voz avisa de que empieza antes de que esto vuelva.
     */
    const esta = n ?? this.informacionDeTrafico.pedida(a.id, como.turno);
    // El dibujo no pide turno: sale en cuanto el otro está cerca.
    if (n === undefined) this.tarjetaDelTrafico(a);
    const alSonar: AlSonar = (que, porque) => {
      if (que === "empieza" || que === "no-suena")
        this.alOirLaInformacion(esta, a.id, a, como.porRadio ? como.texto : null);
      else if (que === "se-cae") {
        /*
         * Si la boca no la dice porque se acaba de decir lo mismo, está
         * dicha; si se cayó de la cola, no, y se vuelve a dar si sigue cerca.
         */
        if (porque === "repetida" || porque?.startsWith("riñe"))
          this.alOirLaInformacion(esta, a.id, null);
        else this.informacionDeTrafico.seCayo(esta);
      }
    };
    if (como.porRadio)
      this.torre.decir(como.texto, como.clave, "mando", como.relleno, alSonar);
    else this.instructor.decir(como.texto, como.clave, "mando", undefined, alSonar);
  }

  /**
   * **La información de tráfico, sonando**: ya cuenta como dicha y se nombra
   * a quien nombra. La tarjeta se vuelve a poner con lo que se dice —es su
   * gemelo dibujado— y la tira de la radio lo escribe, como se oye.
   */
  private alOirLaInformacion(
    n: number,
    id: string,
    aviso: AvisoDeTrafico | null,
    enLaRadio: string | null = null,
  ): void {
    if (this.informacionDeTrafico.esperando?.n !== n) return;
    this.informacionDeTrafico.seOyo(n);
    this.nombrar("informacionDeTrafico", id);
    if (aviso) this.tarjetaDelTrafico(aviso);
    if (enLaRadio && this.tier.instruments !== "none")
      this.hud.radio(enLaRadio, undefined, true);
  }

  /** La tarjeta de la información de tráfico: tu avión y el otro en su hora. */
  private tarjetaDelTrafico(a: AvisoDeTrafico): void {
    const altura = alturaDelOtro(a.relativa);
    const canales = canalesDe(this.tier.avisos);
    const rotulo = !canales.texto
      ? ""
      : canales.corto
        ? t("palabra.mira")
        : this.elTraficoEnNumeros(a, altura);
    this.hud.senal.mostrar(
      comoDibujo(`cerca-${a.hora}-${altura}`),
      rotulo,
      null,
      { segundos: SE_QUEDA_EL_TRAFICO, prioridad: 0 },
    );
  }

  /**
   * **Cómo se dice la información de tráfico, y con qué clave espera turno.**
   * La clave lleva dentro la hora, las millas y la altura —el relleno—, así
   * que dos que se dirían distinto son dos frases. Ver `revisar`.
   */
  private comoSeDiceElTrafico(a: AvisoDeTrafico): {
    readonly porRadio: boolean;
    readonly texto: string;
    readonly clave: string;
    readonly relleno?: Readonly<Record<string, string>>;
    readonly turno: string;
  } {
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    if (conCifras && this.hayTorreQueHable()) {
      const yo = this.miIndicativo;
      /*
       * **Y grabada, en la torre de cada sitio.** Iba con el texto montado y
       * sin receta, así que la decía siempre la voz del navegador —otra
       * persona, y en Brave para Linux, nadie—. Ahora la hora, las millas y
       * la altura son piezas, y la clave lleva el habla del campo: en
       * Canarias la dice su torre. Ver `informacionEnPiezas`.
       */
      const clave = comoSeDiceAqui(
        "torre.trafico",
        hablaDe(this.elCampo().escenario.aerodrome?.id),
      );
      const relleno = { ...rellenoDe(yo), ...informacionEnPiezas(a) };
      return {
        porRadio: true,
        texto: informacionEnRadio(yo.dicho, a),
        clave,
        relleno,
        turno: turnoDe(clave, relleno) ?? clave,
      };
    }
    const clave =
      `vuelo.otroAvion.${ladoDeLaHora(a.hora)}.${alturaDelOtro(a.relativa)}` as TranslationKey;
    return { porRadio: false, texto: t(clave), clave, turno: clave };
  }

  /** Cuántas informaciones de tráfico van dadas y a quién. Para el banco. */
  get informacionDeTraficoParaBanco(): readonly string[] {
    return [...this.informacionDeTrafico.yaContados];
  }

  /**
   * Por qué no se dio la información de tráfico en el último paso, y si es
   * que espera turno, cómo está la boca. Para el banco.
   */
  get porQueCallaLaInformacionParaBanco(): string | null {
    const motivo = this.informacionDeTrafico.porQueCalla;
    if (motivo === "callado") return "callado: el terreno";
    if (motivo !== "esperando turno") return motivo;
    return `esperando turno: la boca (${BOCA.ocupada ? "hablando" : "en silencio"}, ${BOCA.cuantasEsperan} en cola)`;
  }

  /** Si ya se contó qué es un rombo. Una vez por partida, no por vuelo. */
  private traficoExplicado = false;

  /**
   * **Qué es ese rombo**, contado la primera vez que sale uno.
   *
   * Preguntado jugando: uno se le iba a cruzar y no sabía si era peligroso. El
   * rombo hueco con su «+10» ya lo decía —otro avión, mil pies por encima, sin
   * aviso—, pero eso es un dibujo y una cifra que hay que saber leer, y en los
   * peldaños de abajo no se lee: se oye. Así que la instructora lo cuenta una
   * vez, con calma, cuando el primero aparece en la pantalla.
   *
   * **Y no es un aviso**, ni lo imita: un TCAS no dice nada de quien no se
   * acerca, y aquí tampoco suena nada de cabina ni sale tarjeta. Es la
   * instructora explicando un dibujo, como explicaría el horizonte. El aviso
   * de verdad, si llega, es `avisarDelTrafico`, y ese sí va con su «mirá».
   *
   * En el peldaño de cabina no: ahí la pantalla se lee.
   */
  private explicarElTrafico(): void {
    if (this.traficoExplicado || canalesDe(this.tier.avisos).cabina) return;
    const s = this.flight.state;
    /*
     * **Con calma quiere decir en vuelo tranquilo**: alto y sin subir ni
     * bajar deprisa. La primera versión lo contaba en cuanto salía un rombo,
     * y el primero sale al despegar, con el tráfico del circuito: la
     * explicación, de cinco segundos, se metía entre «rotate» y el tren, y
     * «metélo» caducaba esperando.
     */
    if (s.onGround || s.heightAboveGround < 300) return;
    if (Math.abs(s.verticalSpeed) > 3) return;
    let elMasCerca: { relativa: number; d: number; cerca: boolean } | null =
      null;
    for (const b of this.tcas.enPantalla) {
      // El que ya avisa se cuenta con su aviso. Ver `avisarDelTrafico`.
      if (b.clase === "aviso") continue;
      const d = Math.hypot(b.x - s.position.x, b.z - s.position.z);
      if (!elMasCerca || d < elMasCerca.d)
        elMasCerca = { relativa: b.relativa, d, cerca: b.clase === "cerca" };
    }
    if (!elMasCerca) return;
    /*
     * Y uno a nuestra altura y ya cerca —el rombo relleno— no se explica con
     * un «pero lejos»: eso ya no sería verdad. Se espera a otro.
     */
    const aLaMisma = Math.abs(elMasCerca.relativa) < A_LA_MISMA_ALTURA;
    if (aLaMisma && elMasCerca.cerca) return;
    this.traficoExplicado = true;
    const clave: TranslationKey =
      aLaMisma
        ? "vuelo.traficoNivel"
        : elMasCerca.relativa > 0
          ? "vuelo.traficoArriba"
          : "vuelo.traficoAbajo";
    this.instructor.decir(t(clave), clave);
  }

  /**
   * **Traffic, traffic**: un aviso del TCAS, dicho como toca en este peldaño.
   *
   * Tres canales y ninguno solo, como pide la escalera:
   *
   * - **El dibujo**, en los cuatro peldaños: el círculo se pone ámbar en la
   *   carta y sale la tarjeta con tu avión y dónde está el otro.
   * - **La palabra**: «¡Mirá!» en el segundo; en el tercero, la frase con la
   *   hora del reloj y la altura, que es como da el tráfico una torre de
   *   verdad; y en el cuarto lo mismo en pies.
   * - **La voz**: la instructora en casa —«mirá a tu izquierda: hay otro avión
   *   cerca»— y en el peldaño de arriba la de cabina, *traffic, traffic*, que
   *   es exactamente lo que se oye en una.
   *
   * **Y sin tono de alarma.** Un TA es un aviso de precaución, ámbar: no pide
   * maniobrar, pide mirar. En una cabina de verdad no lo acompaña ninguna
   * sirena, solo las dos palabras, y aquí tampoco. Quien lo oiga por primera
   * vez aquí tiene que aprender que eso se oye con calma.
   */
  private avisarDelTrafico(a: AvisoDeTrafico, yaContado = false): void {
    this.nombrar("traffic, traffic", a.id);
    const lado = ladoDeLaHora(a.hora);
    const clave = `vuelo.trafico.${lado}` as TranslationKey;
    // Contado ya en esta pasada, suena la caja si la hay y nadie más. Ver
    // `vigilarElTrafico`.
    if (yaContado) this.cantar("traffic, traffic");
    else this.cantar("traffic, traffic", t(clave), clave);
    /*
     * A la misma altura por debajo de trescientos pies: más cerca que eso la
     * cifra de la carta dice +02 o -01 y lo que hay que mirar es al frente,
     * no arriba ni abajo.
     */
    const altura =
      Math.abs(a.relativa) < A_LA_MISMA_ALTURA
        ? "nivel"
        : a.relativa > 0
          ? "arriba"
          : "abajo";
    const canales = canalesDe(this.tier.avisos);
    const rotulo = !canales.texto
      ? ""
      : canales.corto
        ? t("palabra.mira")
        : canales.cifra
          ? this.elTraficoEnNumeros(a, altura)
          : t(clave);
    this.hud.senal.mostrar(
      comoDibujo(`trafico-${a.hora}-${altura}`),
      rotulo,
      null,
      { segundos: SE_QUEDA_EL_TRAFICO, prioridad: IMPORTANTE },
    );
  }

  /**
   * «Tráfico a las dos, 150 m por encima.» En pies donde la cabina va en
   * pies, como todo lo demás: la cifra que se escribe es la que marca el
   * instrumento.
   */
  private elTraficoEnNumeros(
    a: AvisoDeTrafico,
    altura: "arriba" | "nivel" | "abajo",
  ): string {
    const donde =
      a.hora === 1 ? t("tcas.hora.1") : t("tcas.hora", { hora: a.hora });
    const enPies = this.tier.units === "aeronautical";
    const cuanto = enPies
      ? `${Math.round(Math.abs(a.relativa) / 0.3048 / 100) * 100} ft`
      : `${Math.round(Math.abs(a.relativa) / 10) * 10} m`;
    const clave: TranslationKey =
      altura === "nivel"
        ? "tcas.nivel"
        : altura === "arriba"
          ? "tcas.arriba"
          : "tcas.abajo";
    return t(clave, { donde, cuanto });
  }

  /** Lo que ve el TCAS, para el banco. */
  get tcasParaBanco() {
    return {
      equipo: this.aircraft.tcas,
      enPantalla: this.tcas.enPantalla,
      avisos: this.tcas.avisosDados,
      enMarcha: this.tcas.enMarcha,
      banda: this.bandaDelTcas,
      modo: modoEnPantalla(
        this.aircraft.tcas,
        this.tcas.enMarcha,
        this.bandaDelTcas,
      ),
    };
  }

  /** Cómo ve el TCAS a uno, para el banco. Ver `Tcas.comoVeA`. */
  tcasComoVeAParaBanco(id: string) {
    return this.tcas.comoVeA(id);
  }

  /** Lo que el tráfico de las islas necesita saber de quien vuela. */
  private yoParaLasIslas() {
    const s = this.flight.state;
    return {
      x: s.position.x,
      y: s.position.y,
      z: s.position.z,
      vx: s.velocity.x,
      vz: s.velocity.z,
      /*
       * En crucero y con altura: seiscientos metros sobre el mar. Más abajo
       * se está subiendo o bajando cerca de un campo, y lo que cruzaría ahí
       * es el tráfico del circuito, que es de otro.
       */
      enCrucero: this.faseDeAhora === "en-vuelo" && s.position.y > 600,
    };
  }

  /**
   * Lo que queda en los depósitos, en kilos.
   *
   * Se carga al empezar el vuelo con lo de la ruta más la reserva —ver
   * `cargaParaElPlan`— y baja con el empuje que está dando el avión. Es la
   * única cuenta atrás de verdad que hay aquí.
   */
  private combustible = 0;

  /** Lo que se está quemando ahora mismo, en kilos por segundo. */
  private quemaDeAhora = 0;

  /** Si ya se avisó de que se entró en la reserva, para no repetirlo. */
  private avisadoDeLaReserva = false;

  /**
   * **Si se vuela sin motor**: se acabó el combustible en el aire.
   *
   * Es otro vuelo, con otras reglas —ver `flight/sin-motor.ts`—: se pide la
   * velocidad de mejor planeo y no la de aproximación, la flecha va a la pista
   * a la que se llega, nadie manda al aire a quien no puede subir y la torre
   * da prioridad. Se acaba al pararse en el suelo o al empezar otro vuelo.
   */
  private sinMotor = false;

  /** Si se vuela sin motor, para los bancos. */
  get sinMotorParaBanco(): boolean {
    return this.sinMotor;
  }

  /**
   * **La cabina de este avión**: a qué altura está y si tiene aire. Es la que
   * marcan los relojes de CAB ALT y la que decide la despresurización. Ver
   * `flight/cabina-presurizada.ts`.
   */
  readonly cabinaDelAvion = new CabinaPresurizada({ presurizacion: null });
  /** De qué avión es la cabina de ahora: otro avión, otra cabina. */
  private cabinaDe: AircraftConfig | null = null;
  /** Si hay que poner la cabina en su sitio en el paso siguiente: vuelo nuevo. */
  private cabinaPorPoner = true;
  /** La altura del paso anterior, para ver si al avión lo han cambiado de sitio. */
  private alturaDeAntes: number | null = null;
  /** El reloj de la cabina y del ejercicio, s: lo que se ha volado. */
  private relojDeCabina = 0;
  /** Lo que el aire enseña por el camino. Ver `flight/lecciones-del-aire.ts`. */
  private readonly leccionesDelAire = new LeccionesDelAire();
  /**
   * **Lo que espera su hueco**: las lecciones del aire y lo que se ve por la
   * ventanilla no se cuentan encima de nadie ni pegados a un anuncio. Ver
   * `Huecos` en `audio/turnos.ts`.
   */
  private readonly huecos = new Huecos();
  /** Las lecciones del aire que ya tocan y esperan su hueco, con su hora. */
  private leccionesPorContar: { leccion: LeccionDelAire; desde: number }[] = [];
  /**
   * **El descenso de emergencia en curso**, o `null`. Lo empieza
   * `despresurizar` y se acaba al pararse en el suelo o al empezar otro
   * vuelo. Ver `flight/despresurizacion.ts`.
   */
  descensoDeEmergencia: DescensoDeEmergencia | null = null;
  /** Si ya salió la tarjeta de qué hacer, que va detrás de la de la máscara. */
  private tarjetaDelDescenso = false;
  /**
   * **Lo que queda por decir del descenso, en su orden**: cada frase espera a
   * que su boca esté libre y no caduca, porque es el procedimiento y no un
   * comentario. La cola de cada boca tiene una plaza y cuatro segundos —ver
   * `audio/boca.ts`—, y dos anuncios seguidos de la comandante se pisaban: el
   * segundo echaba al primero y caducaba detrás de otra frase larga.
   */
  private porDecirDelDescenso: {
    readonly por: "instructor" | "megafonia";
    readonly clave: TranslationKey;
    /** Cuándo se pidió, en el reloj de pared: la voz va en tiempo real. */
    readonly desde: number;
  }[] = [];
  /**
   * Hasta cuándo se calcula que suena lo último que se dijo del descenso por
   * cada boca, ms del reloj de pared. Ver `decirLoQueQueda`.
   */
  private hastaDelDescenso = { instructor: 0, megafonia: 0 };

  /**
   * Quien viene por la otra cabecera: qué se le dijo ya. Ver
   * `flight/la-otra-cabecera.ts`.
   */
  private readonly laOtraCabecera = new LaOtraCabecera();

  /**
   * Por qué cabecera se viene en final ahora mismo, metros a su umbral. Se
   * mira una vez por paso, antes que la velocidad: sin motor, estar en final
   * por cualquiera de las dos es lo que cambia la velocidad que se pide.
   */
  private enFinalPor: { enUso: number | null; otra: number | null } = {
    enUso: null,
    otra: null,
  };

  /**
   * La cabecera que la torre nombra **en lugar de la de uso**, solo mientras
   * la nombra: la que eligió quien vuela sin motor. Ver `autorizarSinMotor`.
   */
  private cabeceraParaLaTorre: string | null = null;

  /**
   * Las células de tormenta de hoy, si el tiempo las trae.
   *
   * Salen del parte meteorológico del sitio y de la semilla del escenario, así
   * que el mismo vuelo tiene la misma tormenta en el mismo sitio. Una tormenta
   * que cambia de sitio cada vez es un enemigo, no un fenómeno. Ver
   * `flight/tormentas.ts`.
   */
  private celdas: readonly Celda[] = [];

  /** Las células, para los bancos. */
  get celdasParaBanco(): readonly Celda[] {
    return this.celdas;
  }

  /** Y el depósito, para los bancos. Ver `elDeposito`. */
  get depositoParaBanco(): {
    kilos: number;
    cabe: number;
    reserva: number;
    estado: "bien" | "reserva" | "poco";
  } {
    return this.elDeposito();
  }

  /**
   * Las pistas de este vuelo: la de casa y, si la ruta lleva a otro
   * aeropuerto, la suya — ya en coordenadas de este mundo.
   *
   * Existe porque todo el juego preguntaba «¿estoy sobre la pista?» mirando
   * una sola, y desde que se puede volar a otro sitio eso rompe el avión de
   * quien acaba de aterrizar bien. Ver `world/pistas-del-vuelo.ts`.
   */
  /**
   * En qué campo está el avión ahora: el de salida o el de destino.
   *
   * El de la pista que tiene más cerca, que es la misma cuenta que decide si
   * una toma cuenta como aterrizaje. Hasta que hubo rutas, «el escenario» y
   * «dónde estoy» eran lo mismo y por eso medio juego pregunta por el
   * escenario; desde que se puede ir a otro aeropuerto hay que distinguirlos,
   * y esto es por dónde se empieza.
   */
  private elCampoDeAhora(): Scenario {
    return this.elCampo().escenario;
  }

  /**
   * El vecino cuya pista se tiene más cerca, o `null` si es la de casa.
   *
   * Una sola cuenta para todos los sitios que preguntan «¿dónde estoy?»: el
   * campo, su aeródromo y su pista salen de aquí, y así no hay forma de que
   * uno diga una cosa y otro diga otra.
   */
  private elVecinoDeAhora(): (typeof this.vecinos)[number] | null {
    if (this.vecinos.length === 0) return null;
    const s = this.flight.state.position;
    const cerca = laMasCerca(this.pistasDelVuelo(), s.x, s.z);
    return this.vecinos.find((v) => v.campo.pista === cerca) ?? null;
  }

  /**
   * El campo al que se va, en coordenadas del mundo, o `null` si el vuelo es
   * una vuelta al campo. Ver `elDestino`.
   */
  private elOtroCampo(): { x: number; z: number; oaci: string | null } | null {
    const d = this.elDestino();
    return d ? { x: d.x, z: d.z, oaci: d.oaci } : null;
  }

  /**
   * Los campos de este vuelo: el de salida y los vecinos cargados, cada uno
   * con su pista en coordenadas de este mundo.
   *
   * Una sola lista para las cuatro preguntas que se hacen sobre ellos —a dónde
   * se va, cuál es el alternativo, a cuál se desvía con la reserva y cuál es
   * el siguiente al tocar la tarjeta—, para que no haya forma de que una diga
   * una cosa y otra otra. Se hace una vez: los vecinos se cargan al construir
   * el juego y no cambian. Lo que sí cambia es su viento, y `ponerTiempo` la
   * tira para que el escenario de cada uno lleve su cabecera de hoy.
   */
  private camposDelVuelo(): readonly CampoConNombre[] {
    if (this.camposHechos?.length === this.vecinos.length + 1)
      return this.camposHechos;
    this.camposHechos = [
      {
        id: this.scenario.id,
        x: this.scenario.runway.x,
        z: this.scenario.runway.z,
        escenario: this.scenario,
      },
      ...this.vecinos.map((v) => ({
        id: v.campo.id,
        x: v.campo.pista.x,
        z: v.campo.pista.z,
        escenario: v.campo.escenario,
      })),
    ];
    return this.camposHechos;
  }

  private camposHechos: readonly CampoConNombre[] | null = null;

  /**
   * Si el vuelo va a otro campo y el que se tiene debajo es el de salida: el
   * circuito de aquí no sirve y «dar una vuelta» tampoco. Ver
   * `AhoraMismo.haciaOtroCampo`.
   */
  private haciaOtroCampo(): boolean {
    const destino = this.elDestino();
    return destino !== null && destino.id !== this.elCampo().id;
  }

  private campoPorId(id: string): CampoConNombre | null {
    return this.camposDelVuelo().find((c) => c.id === id) ?? null;
  }

  /**
   * **A qué aeropuerto se va, con su nombre.**
   *
   * Existe porque faltaba lo más básico del juego y nadie lo había echado en
   * falta desde dentro: «yo no sé la de veces que he querido despegar de una
   * pista y llegar a otra y todavía en Paraguay no he encontrado el modo, y
   * desde Gran Canaria no localizo Fuerteventura».
   *
   * Y tenía toda la razón. Fuerteventura **estaba cargada** —su relieve, su
   * aeropuerto, su pista donde se puede aterrizar— y en la pantalla no había
   * absolutamente nada que dijera que existe: ni su nombre, ni hacia dónde
   * cae, ni a qué distancia. El mundo tenía el destino y el juego no lo
   * enseñaba. Un aeropuerto al que no se puede apuntar no está en el juego,
   * está en el disco.
   *
   * **Es el que se eligió en el hangar**, y ya no el más cercano a donde esté
   * el avión. Se cargó combustible para él y para su alternativo, así que el
   * destino es una decisión tomada en tierra y no una sugerencia que cambia
   * según hacia dónde se mire. Se cambia a mano —la tarjeta, la J— o lo cambia
   * la reserva, que es para lo que está. Ver `desviarConLaReserva`.
   *
   * Devuelve `null` en una vuelta al campo: ahí la flecha señala la pista de
   * siempre, que es lo que hacen las lecciones y los circuitos.
   *
   * **Y la vuelta a casa no empieza a mitad de camino.** Antes, «ya en un
   * destino» se decidía por la pista más cercana al avión, y a mitad de ruta
   * la más cercana pasa a ser la del destino: la flecha daba media vuelta y
   * señalaba casa con la isla de llegada delante. Ahora un tramo empieza
   * donde se estuvo en tierra por última vez. Ver `mirarSiSeLlego`.
   */
  private elDestino(): {
    x: number;
    z: number;
    nameKey: string;
    id: string;
    oaci: string | null;
    escenario: Scenario;
  } | null {
    if (this.vecinos.length === 0) return null;
    const meta = this.desvioId ?? this.destinoId;
    // Una vuelta al campo no lleva a ningún otro sitio. Con desvío sí se
    // nombra, aunque sea el de salida: volver es una decisión, y tiene nombre.
    if (!this.desvioId && meta === this.salidaId) return null;
    const c = this.campoPorId(meta);
    if (!c) return null;
    return {
      x: c.x,
      z: c.z,
      nameKey: c.escenario.nameKey,
      id: c.id,
      oaci: oaciDe(c.escenario),
      escenario: c.escenario,
    };
  }

  /**
   * El alternativo del destino de ahora, si lo hay.
   *
   * En una vuelta al campo, el campo más cercano al de salida: también un
   * circuito tiene a dónde ir si la pista se cierra, y en Canarias casi
   * siempre hay otra isla con pista a la vista.
   */
  private elAlternoDeAhora(): CampoConNombre | null {
    if (this.vecinos.length === 0) return null;
    const campos = this.camposDelVuelo();
    const meta = this.campoPorId(this.desvioId ?? this.destinoId);
    return meta ? elAlterno(meta, campos) : null;
  }

  /**
   * A dónde se va en este tramo: el identificador de un campo del vuelo.
   *
   * Igual al de salida cuando es una vuelta al campo.
   */
  private destinoId = "";

  /** De dónde salió este tramo: el último campo donde se estuvo en tierra. */
  private salidaId = "";

  /**
   * Y de qué campo se despegó de verdad en este vuelo, para la bitácora.
   *
   * No es `salidaId`: esa pasa a ser el campo de llegada en cuanto se toca
   * tierra allí —es la salida del tramo siguiente—, y al apagar el motor, que
   * es cuando se apunta el vuelo, ya no dice de dónde se vino.
   */
  private despegoDe = "";

  /**
   * A dónde se desvió el vuelo con la reserva, si se desvió.
   *
   * Aparte del destino porque son dos cosas distintas: el destino es lo que se
   * planeó y el desvío es lo que se decidió en el aire. Tocar la tarjeta lo
   * borra, que es volver a decidir a mano.
   */
  private desvioId: string | null = null;

  /**
   * **Para qué tramo** se llenó el depósito por última vez: de dónde a dónde.
   * Ver `hayQueLlenar`.
   *
   * Se miraba el campo del último repostaje, y con el campo solo no basta.
   * Volviendo a casa de Los Rodeos, al apagar se cargaba para lo que decía la
   * ruta en ese momento —una vuelta al campo, porque al tocar tierra en casa
   * el destino pasa a ser casa—, y al arrancar el tramo nuevo iba otra vez a
   * Los Rodeos con el depósito de un circuito: treinta y dos kilos donde
   * hacían falta cincuenta y dos. El campo era el mismo; el tramo, no.
   *
   * Y con el tramo solo tampoco: dice para qué se llenó, no si sigue lleno.
   * Por eso `hayQueLlenar` mira además los kilos.
   */
  private tramoDelRepostaje = "";

  /** Lo que llegó del hangar, para poder volver a ello en cada vuelo. */
  private readonly destinoPedido: string | undefined;
  /** Los destinos de la ruta que este avión no puede hacer. Ver `noCaben`. */
  private readonly noCaben: readonly Scenario[];

  /**
   * El destino con el que empieza cada vuelo.
   *
   * El elegido en el hangar si vale; si no, el vecino más cercano al campo de
   * salida, que es lo que hacía el juego antes de que se pudiera elegir y lo
   * que sigue haciendo un enlace directo. Y en la lección de aterrizar, la
   * pista de delante: se empieza en final con los aros encendidos, y una
   * flecha señalando otra isla a setenta kilómetros es la que sobra.
   */
  private destinoDeSalida(): string {
    const casa = this.scenario.id;
    const pedido = this.destinoPedido;
    if (pedido && this.campoPorId(pedido)) return pedido;
    if (this.leccion.arranque === "aire") return casa;
    const campos = this.camposDelVuelo();
    const yo = campos[0]!;
    let mejor = casa;
    let corto = Infinity;
    for (const c of campos.slice(1)) {
      const d = Math.hypot(c.x - yo.x, c.z - yo.z);
      if (d < corto) {
        corto = d;
        mejor = c.id;
      }
    }
    return mejor;
  }

  /**
   * Pasa al siguiente destino de la lista, contando la vuelta al campo.
   *
   * La vuelta al campo entra en la ronda porque es una de las respuestas a
   * «¿a dónde vas?» —la que dan las lecciones y los peldaños de abajo— y así
   * con un solo vecino la tarjeta también hace algo: va y vuelve. Donde no hay
   * ningún otro campo no hace nada, que es mejor que desaparecer: un mando
   * que va y viene no se aprende.
   */
  siguienteDestino(): void {
    /*
     * **Y sin otro sitio, se dice.** Aquí no pasaba nada, y con el JAZ 120 en
     * Pettirossi —sus dos destinos le quedan cortos— tocar la tarjeta parecía
     * un botón roto. Ahora la tarjeta enseña la vuelta al campo, y a quien lee
     * le dice por qué y qué hacer: elegir un avión más chico en el hangar.
     */
    if (this.vecinos.length === 0) {
      const sitios = this.noCaben.map(
        (e) => t(e.nameKey as never).split(" · ")[0] ?? e.id,
      );
      this.hud.soloVueltaAlCampo(
        sitios.length
          ? t("vuelo.solo-vuelta.no-cabe", {
              sitios: new Intl.ListFormat(getLocale() === "gug" ? "es-PY" : getLocale(), {
                type: "disjunction",
              }).format(sitios),
            })
          : t("vuelo.solo-vuelta"),
      );
      return;
    }
    const campos = this.camposDelVuelo();
    const ahora = campos.findIndex(
      (c) => c.id === (this.desvioId ?? this.destinoId),
    );
    this.destinoId = campos[(ahora + 1) % campos.length]!.id;
    this.desvioId = null;
    /*
     * **Y en tierra, el depósito con él.** La tarjeta cambiaba la flecha y el
     * combustible seguía siendo el del destino de antes: desde Ciudad del Este,
     * 4629 kilos para ir a cualquier parte. Elegir en tierra es lo mismo que
     * elegir en el hangar, y el hangar enseña una barra por destino. Y se
     * recuerda para este campo, que si no, apagar y volver a arrancar
     * devolvía el destino del hangar. Ver `seCargaAlCambiarDeDestino`.
     */
    const s = this.flight.state;
    if (
      seCargaAlCambiarDeDestino({
        enUnCampo: s.onGround && this.campoEnCuyoSueloEsta() !== null,
        velocidad: s.groundSpeed,
      })
    ) {
      this.destinoElegidoEnTierra = {
        salida: this.salidaId,
        destino: this.destinoId,
      };
      this.llenarSiHaceFalta(this.salidaId, this.destinoId);
    }
    this.avisar("success");
  }

  /**
   * El destino que se eligió con la tarjeta **estando en tierra**, y desde qué
   * campo. Manda sobre el del hangar al empezar un tramo desde ese campo. Ver
   * `destinoDelTramoDesde`.
   */
  private destinoElegidoEnTierra: { salida: string; destino: string } | null =
    null;

  /**
   * Si el avión acaba de tocar tierra en otro campo, empieza el tramo nuevo.
   *
   * En cuanto se está en el suelo de un campo que no es el de salida, ése
   * pasa a ser la salida y el destino pasa a ser casa: es lo que hace la
   * flecha de volver, y ya no depende de por dónde vaya el avión en el aire.
   * Cinco kilómetros de radio, para que una toma fuera de campo en mitad del
   * mar no cuente como llegada a ninguna parte.
   */
  private mirarSiSeLlego(): void {
    if (this.vecinos.length === 0) return;
    const aqui = this.campoEnCuyoSueloEsta();
    if (!aqui || aqui.id === this.salidaId) return;
    this.salidaId = aqui.id;
    this.destinoId = this.scenario.id;
    this.desvioId = null;
  }

  /**
   * El campo en cuyo suelo está el avión, o `null` si no está en el suelo de
   * ninguno. Cinco kilómetros de radio, para que una toma fuera de campo en
   * mitad del mar no cuente como llegada a ninguna parte; y un avión roto no
   * ha llegado a ninguna parte.
   *
   * Lo preguntan dos: quien decide si se llegó a otro campo y quien decide si
   * el camión del combustible puede acercarse.
   */
  private campoEnCuyoSueloEsta(): CampoConNombre | null {
    const s = this.flight.state;
    if (!s.onGround || this.percance) return null;
    const c = this.campoPorId(this.elCampoDeAhora().id);
    if (!c || Math.hypot(c.x - s.position.x, c.z - s.position.z) > 5000)
      return null;
    return c;
  }

  /**
   * La ruta de un tramo que empieza en `salida`: a casa si se sale de fuera,
   * y si se sale de casa, al destino del hangar. Es lo que hace
   * `mirarSiSeLlego` al tocar tierra fuera, dicho para cuando se empieza.
   */
  private empezarLaRutaEn(salida: string): void {
    this.salidaId = salida;
    this.destinoId = this.destinoDelTramoDesde(salida);
    this.desvioId = null;
    this.rutaAutorizada = "";
    this.despegoDe = "";
  }

  /**
   * A dónde va un tramo que sale de `salida`: desde fuera, a casa; desde
   * casa, al destino del hangar. Una sola cuenta para la ruta y para el
   * depósito, que la necesitan los dos. Ver `tramoDelRepostaje`.
   */
  private destinoDelTramoDesde(salida: string): string {
    const elegido = this.destinoElegidoEnTierra;
    if (elegido?.salida === salida && this.campoPorId(elegido.destino))
      return elegido.destino;
    return salida === this.scenario.id ? this.destinoDeSalida() : this.scenario.id;
  }

  /** Muda el plan de tierra a un campo, si no estaba ya en él. */
  private mudarElPlanA(campo: CampoEnElMundo): void {
    if (!this.plan || !campo.aerodromo) return;
    if (campo.aerodromo === this.plan.aerodromoActual) return;
    this.plan.mudarseA(campo.aerodromo, campo.pista);
  }

  /**
   * **Otro tramo, desde donde está el avión.**
   *
   * Aterrizar en Los Rodeos, rodar al puesto, apagar y volver a arrancar
   * dejaba el juego parado en «en el puesto»: sin raya, sin lámpara, sin
   * «cleared to Gran Canaria», y la carrera de despegue que venía después se
   * tomaba por un aterrizaje, porque para la máquina de fases el vuelo de
   * antes seguía abierto. La vuelta solo funcionaba de rebote, tras un
   * reinicio. Y en casa pasaba lo mismo con el vuelo terminado: al cerrar el
   * panel del final y volver a volar, estrellarse no hacía nada y apagar otra
   * vez no apuntaba ningún vuelo.
   *
   * Arrancar el motor después de haber apagado es empezar a volar otra vez,
   * que es lo que es: se abre un tramo nuevo sin mover el avión, con la ruta
   * de aquí a donde toque, el depósito lleno para ella y la raya desde donde
   * se está hasta el punto de espera. Lo del vuelo anterior ya se apuntó al
   * apagar.
   */
  private empezarOtroTramo(): void {
    this.mirarSiSeLlego();
    const aqui = this.elCampo();
    this.empezarLaRutaEn(aqui.id);
    /*
     * Si el depósito no está lleno para este tramo, se llena: se viene de
     * apagar, y con el motor parado en un campo el camión llega. Casi siempre
     * ya vino al apagar —ver `toggleEngine`—; esto es para cuando no se pasó
     * por la llave, como un motor que se paró solo, y para quien cambió de
     * destino con el avión parado. Ver `hayQueLlenar`.
     */
    if (this.campoEnCuyoSueloEsta())
      this.llenarSiHaceFalta(this.salidaId, this.destinoId);
    this.percance = null;
    // Otro tramo, con motor: lo de la otra punta y el planeo eran del de antes.
    this.sinMotor = false;
    this.laOtraCabecera.reiniciar();
    this.laAproximacion.reiniciar();
    this.avisadoDeLaSenda = false;
    this.laTorreMandaEnLaLuz = false;
    this.permisoDeAterrizar = null;
    this.vaca.quitar();
    this.traza = [];
    this.sinCatar = 0;
    this.duracion = 0;
    this.dichoDeLaToma = false;
    this.avisadoDeLaPasada = false;
    this.avisosDeAltura.reiniciar();
    this.alturaEnGrande.reiniciar();
    this.laRecogida.reiniciar();
    this.maquina.callar();
    this.antesAlUmbral = Infinity;
    this.terrenoDicho = null;
    this.dichoDelTren = null;
    this.recordadoDelTren = NADA_RECORDADO;
    this.tormentasDichas.clear();
    this.estelas.vaciar();
    this.tcas.reiniciar();
    this.bandaDelTcas = "NORM";
    this.informacionDeTrafico.reiniciar();
    // Otro vuelo, otra final: las aves de la de antes se fueron.
    this.avesEnLaFinal.reiniciar();
    this.explicarLasAvesDespues = false;
    this.bandadas.quitar((b) => !!b.enFinal);
    this.atisDado = "";
    this.faseAnunciada = "";
    this.runwayGuide.reset();
    this.landing.reset();
    this.frustrada.reiniciar();
    // Esto también baja `vueloTerminado` y cierra el panel del final.
    this.reiniciarGalones();
    this.yaDespego = false;
    BOCA.empezarDeCero();
    this.megafonia.reiniciar();
    this.huecos.reiniciar();
    this.ventanilla.reiniciar();
    // Y lo que se estaba mirando, con ella: vuelo nuevo, cabeza al frente.
    this.loSenalado = null;
    this.mirada.reiniciar();
    this.reiniciarLaVentanillaAlt();
    // Vuelo nuevo: el primer turbohélice vuelve a esperar su rato.
    this.islenos?.reiniciar();
    this.loMasAltoDelVuelo = 0;
    this.radio.reiniciar(aqui.escenario.aerodrome?.id);
    // Y la raya, de aquí al punto de espera de este campo. Si de aquí no
    // sale —apagado lejos de toda calle—, el vuelo de antes se cierra igual:
    // ver `otroTramoDesde`.
    this.mudarElPlanA(aqui);
    const p = this.flight.state.position;
    this.plan?.otroTramoDesde([p.x, -p.z], this.leccion.arranque === "pista");
    /*
     * **Y quien te guía en tierra, otra vez desde el principio.** El
     * señalero y el coche del sígame eran los del final del tramo anterior:
     * el coche seguía «apartado» —ya había cedido el paso al llegar al
     * puesto— y la salida del tramo de vuelta empezaba con él parado a once
     * metros de la raya en vez de delante del avión. Es lo mismo que hace
     * `resetFlight`, con el avión donde está.
     */
    this.colocarSenalero();
    if (aqui.id !== this.campoMontado) this.montarElCampo(aqui);
    this.updateBadge();
  }

  /**
   * **Con la reserva empezada, la flecha se va sola a donde hay que ir.**
   *
   * Al alternativo, o al campo más cercano si hay uno más cerca —el propio
   * destino si ya se está llegando—. Ver `aDondeConLaReserva`.
   *
   * La voz decía «buscá dónde aterrizar» y no señalaba ninguno: dejaba la
   * decisión entera para el momento en que menos margen hay, a quien tiene
   * cuatro años. Ahora la decisión ya está tomada —es el alternativo, y se
   * escribió en tierra— y lo que hay que hacer es seguir la flecha. Eso es lo
   * que enseña un plan de vuelo: con calma, porque ya se pensó antes.
   */
  private desviarConLaReserva(): void {
    if (this.vecinos.length === 0) return;
    const p = this.flight.state.position;
    const a = aDondeConLaReserva(
      p.x,
      p.z,
      this.elAlternoDeAhora(),
      this.camposDelVuelo(),
    );
    if (a && a.id !== this.destinoId) this.desvioId = a.id;
  }

  /** El alternativo, como lo quieren la carta y el mapa. */
  private alternoParaLaCarta(): {
    x: number;
    z: number;
    oaci: string | null;
  } | null {
    const a = this.elAlternoDeAhora();
    return a ? { x: a.x, z: a.z, oaci: oaciDe(a.escenario) } : null;
  }

  /** A dónde se va y cuál es el alternativo, para los bancos. */
  get rutaParaBanco(): {
    salida: string;
    destino: string;
    desvio: string | null;
    alterno: string | null;
    flecha: string | null;
  } {
    return {
      salida: this.salidaId,
      destino: this.destinoId,
      desvio: this.desvioId,
      alterno: this.elAlternoDeAhora()?.id ?? null,
      flecha: this.elDestino()?.id ?? null,
    };
  }

  /**
   * Deja el depósito con estos kilos, para los bancos: la reserva llega a la
   * hora y media de vuelo, y el banco no puede esperarla.
   */
  ponerCombustibleParaBanco(kilos: number): void {
    this.combustible = Math.max(0, kilos);
  }

  /**
   * Lo que se carga para el tramo de ahora, para los bancos: con eso se mide
   * si el depósito salió lleno para lo que se va a volar. Ver `repostar`.
   */
  get cargaDelTramoParaBanco(): number {
    return this.cargaDelTramo(this.salidaId, this.destinoId);
  }

  /**
   * Pone el destino desde fuera, para los bancos: lo mismo que tocar la
   * tarjeta hasta llegar a él.
   */
  ponerDestinoParaBanco(id: string): void {
    if (!this.campoPorId(id)) return;
    this.destinoId = id;
    this.desvioId = null;
  }

  /** En qué campo está el avión ahora, para los bancos. */
  get campoDeAhoraParaBanco(): string {
    return this.elCampoDeAhora().id;
  }

  /**
   * Un campo del vuelo entero, para los bancos: su escenario, su aeródromo ya
   * corrido a este mundo, su pista y la cota de esa pista.
   *
   * El de `id`, o el de ahora si no se dice. Existe para que el banco del vuelo
   * entero pueda **aterrizar fuera** con el mismo piloto que aterriza en casa:
   * ese piloto pregunta por la pista, por el punto de final y por la cota del
   * asfalto, y las tres preguntas tenían una sola respuesta — la de casa.
   */
  campoParaBanco(id?: string): {
    escenario: Scenario;
    aerodromo: Aerodrome | null;
    pista: Pista;
    cotaDePista: (x: number, z: number) => number;
  } | null {
    if (id && id !== this.scenario.id && !this.vecinos.some((w) => w.campo.id === id))
      return null;
    // La misma fuente que usa el juego: ver `elCampo`.
    const campo = this.elCampo(id);
    return {
      escenario: campo.escenario,
      aerodromo: campo.aerodromo,
      pista: campo.pista,
      cotaDePista: (x, z) => this.cotaDePistaEn(campo, x, z),
    };
  }

  /** Las pistas de todos los destinos, para los bancos. */
  get pistasDeLosVecinos(): readonly Pista[] {
    return this.vecinos.map((v) => v.campo.pista);
  }

  /** La pista del primer vecino, para los bancos. */
  get pistaDelVecino(): Pista | null {
    return this.vecinos[0]?.campo.pista ?? null;
  }

  private pistasDelVuelo(): readonly Pista[] {
    /*
     * Se pregunta muchas veces por fotograma —es la base de `elCampo`—, así
     * que se guarda hasta que cambie algo: el escenario de casa o el campo de
     * algún vecino, que cambian los dos con el viento. Ver `ponerTiempo`.
     */
    if (this.pistasHechas && this.pistasDeEscenario === this.scenario)
      return this.pistasHechas;
    const casa = this.scenario.aerodrome ? [this.scenario.runway] : [];
    this.pistasDeEscenario = this.scenario;
    this.pistasHechas = [...casa, ...this.vecinos.map((v) => v.campo.pista)];
    return this.pistasHechas;
  }

  private pistasHechas: readonly Pista[] | null = null;
  private pistasDeEscenario: Scenario | null = null;

  /**
   * **La pista que se tiene debajo ahora mismo.**
   *
   * Todo lo que pregunta «¿estoy sobre la pista?», «¿cuánta me queda?» o «¿me
   * he pasado del final?» preguntaba por `this.scenario.runway`, que es la
   * **del campo de salida** y solo esa. Mientras el vuelo empezaba y acababa
   * en el mismo sitio daba igual; desde que se puede ir a otro aeropuerto, no:
   *
   * Aterrizando en Gran Canaria, a ciento ochenta kilómetros de Los Rodeos, la
   * distancia al centro de la pista de casa vale ciento ochenta mil metros. O
   * sea que en cuanto la fase pasaba a «aterrizado» se cumplía «te has pasado
   * del final» y saltaba el percance, **tocaras donde tocaras**; y al mismo
   * tiempo `setOnRunway` te declaraba fuera de pista, que en el modelo
   * sencillo es lo que decide si las ruedas están sobre asfalto, así que
   * encima frenabas sobre tierra. Contado jugando: «toqué tierra a principio
   * de pista, me quedaba para poder frenar, pero la instructora tenía ganas de
   * romper un 747».
   *
   * No hacía falta inventar nada: `pistasDelVuelo` y `laMasCerca` existen
   * justo para esto y este fichero ya las usa en otros sitios. Es el fallo de
   * siempre del repositorio — se arregló donde se mira y no donde también se
   * mira.
   */
  private laPistaDeAhora(): Pista {
    // La del campo de ahora, que sale de la misma cuenta. Ver `elCampo`.
    return this.elCampo().pista;
  }
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
  /**
   * La granja alrededor de la pista de casa, si la tiene: la casa, los
   * potreros, el ganado. Ver `world/granja.ts`. La de un campo de llegada va
   * con su vecino.
   */
  granja: Granja | null = null;
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
   * La cuenta de la toma: la del radioaltímetro, *twenty five hundred… ten*.
   *
   * Vive en el juego y no en el HUD porque no es un adorno de pantalla: es lo
   * que enseña el ritmo de la recogida. La dice la máquina, en el avión que la
   * lleva; en los demás no existe. Ver `flight/avisos-de-altura.ts`.
   */
  private avisosDeAltura: AvisosDeAltura;
  /**
   * **La voz de la máquina**: la cuenta y los avisos de las cajas del avión,
   * por su propia vía y sin esperar turno. Ver `audio/maquina.ts`.
   *
   * Toca las mismas grabaciones de cabina que el resto del pack, sacadas de la
   * bolsa de la instructora, por el bus de voz: el altavoz de la cabina.
   */
  readonly maquina = new VozDeLaMaquina({
    ahora: () => Date.now(),
    tocar: (clave, alAcabar) => {
      const piezas = this.instructor.piezasDe(clave);
      // Por el bus de avisos: una caja no baja del mínimo audible cuando se
      // baja el volumen. Ver `MINIMO_DE_AVISOS`.
      return piezas
        ? this.audio.encadenarVoz(piezas, alAcabar, false, false, true)
        : null;
    },
  });
  /**
   * **Cada número de la cuenta, con lo que marcaba el radar al pedirlo.** Para
   * el banco: es lo que dice si un «one hundred» sonó a cien pies o a
   * sesenta, que es la queja entera. Ver `cantarLaCuenta`.
   */
  readonly cuentaOida: {
    t: number;
    dice: string;
    pies: number | null;
    enTierra: boolean;
    como: string;
  }[] = [];
  /**
   * El momento de la recogida, para la instructora: veinte pies. Ver
   * `acompanarLaRecogida`.
   */
  private laRecogida = new AvisosDeAltura([{ metros: 20 * 0.3048, dice: "ahora" }]);
  /** Lo que marcaba el radioaltímetro en el último fotograma, m. */
  private radioAltura: number | null = null;
  /**
   * Si en esta toma las ruedas ya han tocado. Empieza en el suelo, que es
   * donde empieza el vuelo. Ver dónde se apunta.
   */
  private yaTocoTierra = true;
  /** La altura sobre la pista en grande: 150, 100 y 50. Ver `escalera.ts`. */
  private alturaEnGrande: AvisosDeAltura;
  /** Segundos seguidos fuera de la banda de velocidad. Ver el bucle. */
  private fueraDeBanda = 0;
  /** Qué se dijo la última vez, para no repetirlo mientras siga igual. */
  private dichoDeBanda: "lento" | "rapido" | null = null;
  /** La indicada del fotograma anterior, m/s. Ver `tendenciaDeVelocidad`. */
  private velocidadAntes = 0;
  /** Hacia dónde va la aguja, m/s², filtrada. Ver `yaLoEstaCorrigiendo`. */
  private tendenciaDeVelocidad = 0;
  /**
   * En qué banda va la velocidad **ahora mismo**. Ver `bandaDeVelocidad`.
   *
   * Se guarda porque lo necesitan los avisos de senda, y por una razón que es
   * de pilotar y no de código: **ir bajo y ir lento se arreglan al revés**.
   */
  private bandaDeAhora: BandaDeVelocidad = null;
  /** El último aviso de terreno dicho, para no repetirlo cada fotograma. */
  terrenoDicho: AvisoDelSuelo = null;
  /**
   * Y el que hay **ahora**, se diga o no. Lo mira el TCAS, que se calla
   * mientras suene el del suelo: en cualquier cabina el aviso de terreno
   * manda sobre el de tráfico. Ver `flight/tcas.ts`.
   */
  private terrenoAhora: AvisoDelSuelo = null;

  /** El aviso del suelo de este instante, se haya dicho o no. Para los bancos. */
  get terrenoParaBanco(): AvisoDelSuelo {
    return this.terrenoAhora;
  }
  /**
   * **Lo que ve por delante el avisador de terreno**, en el avión que lo
   * lleva, y cada cuánto se mira. Ver `mirarElTerrenoDelante`.
   */
  private delante: Delante | null = null;
  private desdeDelante = 0;
  private rumboDeDelante: number | null = null;
  /**
   * **El TCAS del avión de hoy**, si lo lleva: quién anda cerca y cuándo
   * mirarlo. Vive siempre y trabaja solo si la ficha dice que hay uno. Ver
   * `tcas` en `flight/aircraft.ts`.
   */
  private readonly tcas = new Tcas();
  /** La posición del selector de banda del TCAS. Ver `bandaPara`. */
  private bandaDelTcas: Banda = "NORM";
  /**
   * La dependencia en cuya frecuencia se está: tierra, torre, salida,
   * control o aproximación. Ver `flight/dependencia.ts`.
   */
  private dependencia: Dependencia | null = null;

  /** Con quién se habla ahora, mirando dónde se está. Ver `dependenciaDe`. */
  private laDependenciaDeAhora(): Dependencia {
    const s = this.flight.state;
    const campo = this.elCampoMontado();
    return dependenciaDe(
      {
        fase: this.faseDeAhora,
        enTierra: s.onGround,
        millas:
          Math.hypot(
            s.position.x - campo.pista.x,
            s.position.z - campo.pista.z,
          ) / MILLA,
        pies: (s.position.y - this.cotaDelCampo(campo)) / PIE_EN_METROS,
        esElDeSalida: campo.id === this.salidaId,
      },
      this.dependencia,
    );
  }

  /** La dependencia de ahora, para el banco. */
  get dependenciaParaBanco(): Dependencia | null {
    return this.dependencia;
  }
  /**
   * **Y lo que cuenta la radio del tráfico que se acerca**, lleve el avión
   * TCAS o no: es un servicio del control, no del equipo. Ver
   * `flight/informacion-de-trafico.ts`.
   */
  private readonly informacionDeTrafico = new InformacionDeTrafico();
  /**
   * Los del circuito que vienen a aterrizar, por su nombre en el TCAS. Los
   * mira la carta para abrir el rango desde el punto de espera. Ver
   * `Otro.abreElRango` en `ui/carta.ts`.
   */
  private llegandoAhora = new Set<string>();
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
   * La pantalla del teléfono, encendida mientras se vuela y libre en cuanto
   * no: en la pausa, en un panel y al irse. Ver `ui/pantalla-despierta.ts`.
   */
  private readonly despierta = new PantallaDespierta();
  /**
   * Las luces azules de las calles de rodaje, que se encienden con el sol
   * bajo. Se montan con las de aproximación, después de moldear el terreno.
   */
  private rodadura: LucesDeRodadura | null = null;
  /** Las luces del pueblo de noche. Ver `world/luces-de-ciudad.ts`. */
  private lucesDeCiudad: LucesDeCiudad | null = null;
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
  /** La nube que pasa al atravesar la capa. Ver `world/jirones.ts`. */
  private jirones!: JironesEnElMundo;
  /** El agua en el cristal, desde la cabina. Ver `world/gotas-en-el-parabrisas.ts`. */
  private gotas!: GotasEnElParabrisas;
  /** Cuánto tapa la capa del parte. Ver `ponerTecho`. */
  private tapaduraDeNubes = 0;
  /**
   * **La capa de nubes como cosa del mundo**: base y techo en altitud, y
   * cuánto tapa. La miran la lluvia, que no cae por encima; la ventanilla, que
   * no anuncia lo tapado, y el cielo, que la dibuja con su grosor. Ver
   * `colocarLaCapa`.
   */
  capaDeNubes: CapaDeNubes | null = null;
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

  /** Los aeródromos apuntados como visitados, para los bancos. */
  get aerodromosVisitadosParaBanco(): readonly string[] {
    return this.cuaderno.aerodromos;
  }
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
   * Jazlyn en bicicleta a buscarme»—, así que sale ella en bici. Se decidía
   * una vez, en el constructor, porque se creía que el aeródromo no cambia
   * dentro de un vuelo; desde que se aterriza en otro sí cambia, y con él
   * quien sale. Ver `cambiarDeSigueme`.
   */
  sigueme: Sigueme;
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
   * **Tu permiso para aterrizar, y si ya sonó.** Sin «cleared to land» oído no
   * hay permiso: la regla estaba escrita y se rompía, porque el juego daba la
   * frase por dicha en cuanto la pedía. En Pettirossi con el JAZ 120 no sonó
   * y la luz verde sí salió con tiempo; en La Palma llegó con la máquina
   * contando «one hundred». Ahora la lámpara y su tarjeta salen **cuando
   * empieza a sonar** —o, si no puede sonar, en el acto: la tarjeta es
   * entonces su canal—, y a la altura de decisión se mira si se oyó. Ver
   * `alSonarElPermiso` y `permisoSinOir` en `flight/turno-de-pista.ts`.
   *
   * - `esperando-su-voz`: dado, y su frase todavía espera turno o grabación.
   * - `sonando`: su frase está sonando, con la lámpara ya puesta.
   * - `oido`: sonó entera, o no podía sonar y salió su tarjeta.
   */
  private permisoDeAterrizar: "esperando-su-voz" | "sonando" | "oido" | null = null;
  /** Cuál de los permisos dados es el de ahora: lo que avisa tarde, no cuenta. */
  private permisosDados = 0;
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
   * `elegirOtroAvion` y `elegirComandante`, que devuelven la voz sintética del
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
    // Por radio: banda estrecha y más baja. Ver `porRadio`.
    true,
  );
  /**
   * La megafonía de cabina, que solo habla en los aviones con pasaje.
   *
   * Va con su propia voz —la comandante Jazlyn— y no comparte timbre con nadie:
   * es la única del juego que le habla a cien personas por un altavoz, y eso se
   * reconoce antes de entender una palabra. Ver `audio/megafonia.ts`.
   */
  private readonly megafonia = new Megafonia();

  /**
   * Y lo que se ve por la ventanilla, que es lo que hace que un crucero de
   * cuarenta minutos no sea una recta. Ver `flight/lo-que-se-ve.ts`.
   */
  private readonly ventanilla = new LoQueSeVe();

  /** Los hitos de este vuelo, para dárselos al plano cuando exista. */
  private hitosDelVuelo: readonly Hito[] = [];

  /** Cuántos hitos lleva señalados este vuelo. Para los bancos. */
  get hitosSenalados(): number {
    return this.ventanilla.cuantos;
  }
  private readonly otroAvion: Instructor = new InstructorGrabado(
    this.audio,
    elegirOtroAvion(this.vozDelSistema, this.torre),
    BOCA,
    this.grabaciones,
    // También por radio: es otro avión en la misma frecuencia.
    true,
  );
  /**
   * Y su voz. Es la única del juego que **no** es cercana —le habla a cien
   * personas por un altavoz— y por eso se reconoce sin saber quién es. Con el
   * pack de voz es Jazlyn; sin él, el timbre que quede libre.
   */
  private readonly comandante: Instructor = new InstructorGrabado(
    this.audio,
    elegirComandante(this.vozDelSistema, this.torre, this.otroAvion),
    /*
     * **Y la comandante va por la megafonía, no por la radio.**
     *
     * Son dos vías distintas en un avión de verdad y se solapan: ella suena
     * por los altavoces del pasaje y la torre entra por los auriculares.
     * Tenerlas en el mismo turno hacía que un indicativo le cortara la frase
     * de la llegada por la mitad. Ver `MEGAFONIA` en `audio/boca.ts`.
     */
    MEGAFONIA,
    this.grabaciones,
    false,
    // Y por el altavoz del techo, que es como suena una megafonía.
    true,
  );
  /**
   * **Y la tripulación de cabina**, que habla por el mismo altavoz.
   *
   * Solo existe en los aviones que la llevan —del JAZ 90 para arriba, ver
   * `conTripulacion`— y con el habla del sitio, como la torre: la voz la pone
   * la clave, `tripulacion.*` o `tripulacion.canario.*`. Es otra persona y
   * otra boca, pero la **misma vía** que la comandante: por la megafonía no
   * hablan dos a la vez, y eso lo cuida la boca `MEGAFONIA`.
   */
  private readonly tripulacion: Instructor = new InstructorGrabado(
    this.audio,
    elegirTripulacion(
      this.vozDelSistema,
      this.torre,
      this.otroAvion,
      this.comandante,
    ),
    MEGAFONIA,
    this.grabaciones,
    false,
    true,
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
      comandante: this.comandante,
      tripulacion: this.tripulacion,
    };
  }

  /** Lo último que dijo la lámpara, para que la torre no se repita. */
  private ultimaLuzDeTorre: string | null = null;
  /**
   * Por quién se dijo ya que se esperaba en esta roja: «aterriza:EC-FLY». Uno
   * por avión, porque el segundo que llega a la final es otro porqué aunque se
   * llame igual. Se vacía al cambiar la luz. Ver `explicarSiCambiaElPorque`.
   */
  private readonly porQuesExplicados = new Set<string>();
  /**
   * **Y el porqué pedido que todavía no se ha oído**: con qué clave espera
   * turno en la boca, desde cuántas frases habladas, por quién y cuántas veces
   * se ha pedido. Si la boca lo tira sin decirlo, se pide otra vez. Ver
   * `vigilarQueSeOyoElPorque`.
   */
  private porQuePendiente: {
    clave: string;
    desde: number;
    quien: string;
    veces: number;
  } | null = null;
  /** Cuántas veces se ha pedido ya cada porqué de esta roja. */
  private readonly vecesDelPorque = new Map<string, number>();
  /**
   * **Lo que la radio ha dicho de otros aviones, y de cuál**: la clave y la
   * matrícula —o el nombre que le da el TCAS— de cada vez que la torre, el
   * AFIS, otro avión, la instructora o la caja nombran a un tráfico. Es lo que
   * mira el banco para comprobar que cada uno de esos avisos habla de un avión
   * que está en el mundo en ese momento. Ver `nombrar`.
   */
  private readonly nombrados: { t: number; clave: string; quien: string | null }[] = [];
  private nombradosTotal = 0;
  private readonly radio = new Frecuencia();
  /**
   * **Y el turno de pista**: la frecuencia, el tráfico dibujado, la boca y tu
   * vuelo, cableados en un solo sitio que tiene sus pruebas. Aquí solo se le
   * dice cómo se dicen las cosas. Ver `flight/turno-de-pista.ts`.
   *
   * Todo lo que pregunta se pregunta al llamar, no al construirse: el campo,
   * el tráfico y la aproximación cambian a lo largo del vuelo.
   */
  private readonly turno = new TurnoDePista({
    radio: this.radio,
    boca: BOCA,
    trafico: () => this.trafico,
    torre: () => this.leccion.torre,
    privado: () => sinTorre(this.elCampoMontado().escenario.aerodrome),
    calleUnica: () => this.calleUnicaDelCampo(),
    alUmbral: () => {
      const p = this.flight.state.position;
      return distanciaAlUmbral(this.elCampo(), p.x, p.z);
    },
    alto: () =>
      this.flight.state.position.y - this.cotaDelCampo(this.elCampo()),
    decirAOtro: (dice) => this.decirleAOtro(dice),
    autorizarte: () => this.autorizarElAterrizaje(),
    mandarteAlAire: (alto, sigue) =>
      this.laAproximacion.mandarIrsePorLaPistaOcupada(alto, sigue),
    mandanFrustrar: () => this.laAproximacion.mandanFrustrar,
    avisarteOcupada: () => this.decirQueLaPistaEstaOcupada(),
    retirarteElPermiso: () => this.retirarElPermisoSinOir(),
    permisoSinOir: () => this.permisoSinOir,
  });
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

  /** Quién de la frecuencia tiene la pista ahora, para el banco. */
  get pistaDeLosDemasParaBanco(): readonly { matricula: string; orden: string }[] {
    return this.radio.conLaPista;
  }

  /**
   * Tu matrícula tal como va en las claves de la boca, detrás de la arroba:
   * las letras en el alfabeto, unidas. Ver `turnoDe` y `esDeLaLampara`.
   */
  private get misLetrasEnLaBoca(): string {
    return Object.values(rellenoDe(this.miIndicativo)).join("-");
  }

  /** La matrícula de tu avión, para el banco. Ver `miIndicativo`. */
  get miMatricula(): Indicativo {
    return this.miIndicativo;
  }

  cameraMode: CameraMode = vistaRecordada();
  private propellerAngle = 0;
  /** A qué ritmo gira ahora la hélice, rad/s. Ver `syncAircraftMesh`. */
  private giroDeHelice = 0;
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
   * **El giro de la cabeza**, encima de la vista que toque: arrastrando el
   * paisaje con el ratón o con un segundo dedo, o girándose hacia lo que
   * señala la comandante. Vuelve sola. Ver `cameras/mirada.ts`.
   */
  private readonly mirada = new MiradaLibre();
  /**
   * **Dónde dejó la cámara la vista, sin el giro.**
   *
   * Las vistas de fuera se suavizan partiendo de donde estaba la cámara el
   * fotograma anterior. Si se les diera la cámara ya girada, suavizarían
   * desde lo girado y el giro se iría sumando consigo mismo: la cámara
   * acabaría dando vueltas sola alrededor del avión. Así que antes de mover
   * la vista se le devuelve lo suyo, y el giro va siempre encima.
   */
  private readonly poseDeLaVista = {
    posicion: new Vector3(),
    giro: new Quaternion(),
    puesta: false,
  };
  /** El marco de la ventanilla del pasaje. Ver `world/marco-de-ventanilla.ts`. */
  private readonly marcoDeVentanilla = new MarcoDeVentanilla();
  /**
   * **Lo último que se señaló por la ventanilla**, mientras se pueda mirar:
   * qué es, por dónde se ve y qué tarjeta lo ofrece. Ver
   * `mirarHaciaLoSenalado`.
   */
  private loSenalado: { mirada: Mirada; dibujo: string } | null = null;
  /**
   * Lo que las cámaras necesitan saber del juego **sin conocer el juego**.
   *
   * Es un objeto y no cinco argumentos, y se reutiliza en vez de fabricarse
   * cada fotograma: son sesenta objetos por segundo que no hace falta crear
   * ni recoger. Se rellena justo antes de mover la cámara.
   */
  private readonly contextoDeCamara = {
    aircraft: { wingSpan: 0, chord: 0, largo: 0 },
    ojo: null as Contexto["ojo"],
    aLaVista: 0,
    suelo: (x: number, z: number): number => this.terrain.sampleSurface(x, z),
    movimientoReducido: false,
    traqueteo: 1,
    caidaMaxima: Number.POSITIVE_INFINITY,
    pasaje: null as Contexto["pasaje"],
    bajadaMaxima: Number.POSITIVE_INFINITY,
    caidaTope: Number.POSITIVE_INFINITY,
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
    /*
     * **La curva de la Tierra, antes de que se compile nada**: se cuelga del
     * trozo de three que proyecta los vértices, y un programa ya compilado
     * no se entera de que el trozo cambió. Ver `world/curvatura.ts`.
     */
    instalarCurvatura(options.curvatura ?? CURVAR_EL_DIBUJO);
    this.scenario = options.scenario ?? VALLE_CORDILLERA;
    this.sigueme = new Sigueme(this.scenario.aerodrome?.privado === true);
    this.pavimento = this.scenario.aerodrome
      ? mapaDePavimento(this.scenario.aerodrome)
      : null;
    /*
     * La cuenta depende del avión: la del radioaltímetro en el que lo lleva,
     * ninguna en los demás. Y del avión que viene en las opciones, que
     * `this.aircraft` se pone más abajo. Ver `laCuentaDeHoy`.
     */
    this.avisosDeAltura = this.laCuentaDeHoy(options.aircraft ?? PYKASU);
    /*
     * Y el segundo contador: el de la altura **en grande**, que es otro canal
     * y por eso es otro contador. La cuenta de arriba es la voz de la máquina
     * y tiene el ritmo apretado que enseña a recoger; esta son tres números
     * sueltos y grandes para empezar a leer una altura. Solo sale de Taguato
     * en adelante. Ver `flight/escalera.ts`.
     */
    this.alturaEnGrande = new AvisosDeAltura(
      this.tier.units === "aeronautical" ? EN_GRANDE_EN_PIES : EN_GRANDE,
    );
    this.leccion = options.leccion ?? LECCION_POR_DEFECTO;
    this.destinoPedido = options.destino;
    this.noCaben = options.noCaben ?? [];
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
    /*
     * **Y arrastrar el paisaje es mirar.** Con el ratón, o con un segundo dedo
     * mientras el pulgar lleva la palanca. Un toque sigue siendo un toque —a
     * un mando de la cabina—, y un arrastre ya no pulsa nada al soltar. Ver
     * `cameras/dedo-que-mira.ts`.
     */
    escucharLaMirada(options.canvas, {
      alArrastrar: (dx, dy) => {
        const k = this.radianesPorPixel();
        this.mirada.arrastrar(dx * k, dy * k);
      },
      alSoltar: () => this.mirada.soltar(),
      alTocar: (e) => {
        const [x, y] = enPantalla(e);
        this.pulsarElMando(x, y);
        this.mirarLosMandos(x, y);
      },
      alPasar: (e) => {
        const [x, y] = enPantalla(e);
        this.mirarLosMandos(x, y);
      },
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
      /*
       * **Y sin teselas, hasta donde llegue el mundo de este escenario**, que
       * es `vecesLejos` y no el seis de siempre. Con el seis fijo, Gran
       * Canaria —diecinueve veces— cortaba a noventa y seis kilómetros en un
       * mundo que llega a ciento noventa: Tenerife, a cien, y el Teide, a
       * ciento veintiocho, quedaban detrás del plano y rumbo oeste no había
       * «nada enfrente». La niebla escondía el corte, y la niebla se come
       * también la isla que tenía que verse.
       *
       * Más allá del plano no queda nada que dibujar: el mar sigue en la
       * cúpula, que va pegada a la cámara. Ver `world/sky.ts`.
       */
      this.claveDeTeselas()
        ? 120000
        : this.scenario.size *
            (this.scenario.relieveLejano
              ? vecesLejosDe(this.scenario) * 0.8
              : 1.6),
    );

    this.terrain = new Terrain(this.scenario);
    this.scene.add(this.terrain.group);
    // El marco de la ventanilla del pasaje, apagado hasta que se mira por ella.
    this.scene.add(this.marcoDeVentanilla.malla);
    /*
     * Las tormentas del día. Salen del tiempo de verdad: con buen tiempo no hay
     * ninguna y el radar está encendido sin pintar nada, que es lo que hace un
     * radar el noventa por ciento de los días.
     */
    this.celdas = celdasDe(
      this.scenario.meteo?.lluvia ?? "nada",
      this.scenario.meteo?.fuerzaDeLluvia ?? 0,
      this.scenario.size,
      this.scenario.seed,
    );
    /*
     * **Y el otro aeropuerto, si esta ruta lleva a alguno.**
     *
     * Un escenario entero puesto a su distancia: su mapa de alturas medido, su
     * pista con sus marcas, sus calles y su plataforma. No hace falta ni un
     * dato nuevo porque **el destino ya es un escenario** — ver
     * `mundo-vecino.ts`.
     *
     * Y su suelo se encadena al gancho que el terreno ya tenía para saber qué
     * hay fuera de su mapa: primero el vecino, que sabe de su isla con un metro
     * de detalle, y si la pregunta no cae ahí, lo que hubiera antes.
     */
    for (const [i, quien] of (options.vecinos ?? []).entries()) {
      /*
       * **Con su tiempo, no con el de casa.** El aeródromo se construye con
       * él —la manga tiesa o colgando— y de él sale por qué cabecera se opera.
       * Se montaba en calma, y después con el parte del campo de salida, que
       * mandaba también a doscientos kilómetros: llegando a El Hierro desde La
       * Palma, con el 150/3 de La Palma. Ahora cada campo empieza con su
       * tiempo típico y su METAR llega después, sin esperar a nadie. Ver
       * `tiempoDeUnVecino` y `ponerTiempoDe`.
       */
      const meteo = this.tiempoDeUnVecino(quien);
      const mundo = new MundoVecino(
        this.scenario,
        meteo ? conViento(quien, meteo) : quien,
        options.fotosVecinas?.[i],
      );
      /*
       * Y su aeródromo corrido igual, que es lo que le hace falta al plan
       * de tierra para trazar la raya de vuelta al hangar **allí**. Se
       * calcula una vez: son unos miles de puntos. Ver
       * `aerodromo-desplazado.ts`.
       */
      const aerodromo = quien.aerodrome
        ? desplazarAerodromo(
            quien.aerodrome,
            mundo.desplazamiento.x,
            mundo.desplazamiento.z,
          )
        : null;
      this.vecinos.push({
        mundo,
        base: quien,
        aerodromo,
        pavimento: aerodromo ? mapaDePavimento(aerodromo) : null,
        // La pista del vecino, ya trasladada: a partir de aquí es una pista
        // de este mundo como cualquier otra.
        campo: campoVecino(quien, mundo.desplazamiento, aerodromo, meteo),
        aproximacion: null,
        rodadura: null,
        lucesPuestas: false,
        /*
         * **Y su granja, si la tiene.** Llegando a casa desde Asunción, la
         * casa, el galpón y el hangar ya no los dibuja el aeródromo —los
         * dibuja ella—, así que sin esto se llegaba a una pista sin nada.
         * Cuelga del vecino, en sus coordenadas, y se apaga con él.
         */
        granja: quien.aerodrome
          ? crearGranja(
              quien.aerodrome,
              (x, z) => mundo.terreno.sampleHeight(x, z),
              new Date(),
              quien.seed,
            )
          : null,
      });
      const suGranja = this.vecinos[this.vecinos.length - 1]?.granja;
      if (suGranja) {
        mundo.colgarDeCerca(suGranja.grupo);
        mundo.terreno.pintarEncima(suGranja.pintura);
      }
      this.scene.add(mundo.grupo);
    }

    if (this.vecinos.length > 0) {
      /*
       * **Y los otros aviones de la ruta.**
       *
       * Con el destino puesto aparecen cuarenta minutos de recta, y un cielo
       * vacío enseña que volar es estar solo. No lo es: el corredor entre dos
       * islas de Canarias es de los más transitados de España.
       *
       * Vuelan **en su nivel** —ver `flight/nivel-de-crucero.ts`— así que los
       * que vienen de frente van siempre a otra altura. Quien vuele hacia el
       * este los verá pasar siempre por el mismo lado, y el día que alguien le
       * cuente la regla semicircular ya la sabía.
       */
      /*
       * **Y cada uno con su forma y su paso.** Eran todos el mismo avión, y
       * eso deshace lo que enseña el álbum de postales: un turbohélice
       * regional, un reactor de línea, un jet privado y uno de fuselaje ancho
       * se distinguen desde lejos por la silueta y desde más lejos todavía
       * por lo deprisa que cruzan. Quién anda por el corredor lo decide
       * `flight/trafico-en-ruta.ts`.
       */
      this.avionesDeRuta = crearAvionesDeRuta(
        { x: this.scenario.runway.x, z: this.scenario.runway.z },
        // Un corredor para empezar: el de verdad lo pone `ponerElCorredor`
        // en cuanto se sabe de dónde sale este tramo y a dónde va.
        { x: this.vecinos[0]!.campo.pista.x, z: this.vecinos[0]!.campo.pista.z },
      );
      this.scene.add(this.avionesDeRuta.grupo);
      /*
       * Y el suelo se encadena por **todos** los vecinos: cada uno contesta de
       * su isla y `null` fuera de ella, así que preguntarles por orden da el
       * primero que sepa. Ver `MundoVecino.cota`.
       */
      this.terrain.ponerSueloLejano((x, z) => {
        for (const v of this.vecinos) {
          const y = v.mundo.cota(x, z);
          if (y !== null) return y;
        }
        return null;
      });
      // Y lo que se pisa y su pavimento, preguntados por el mismo orden para
      // que conteste el mismo vecino que dio la cota. Ver `sampleSurface` y
      // `resalteEn` en `Terrain`.
      this.terrain.ponerSuperficieLejana((x, z) => {
        for (const v of this.vecinos) {
          const y = v.mundo.superficie(x, z);
          if (y !== null) return y;
        }
        return null;
      });
      this.terrain.ponerResalteLejano((x, z) => {
        for (const v of this.vecinos) {
          const r = v.mundo.resalte(x, z);
          if (r !== null) return r;
        }
        return null;
      });
      /*
       * **Y el horizonte se aparta donde manda el mapa fino del vecino.**
       *
       * El anillo del horizonte ya tenía un agujero recortado sobre el mapa
       * fino de casa —dos superficies a la misma cota se pelean por el fondo
       * de profundidad— y no lo tenía sobre el del vecino. Así que encima del
       * aeropuerto de destino había la malla detallada del aeródromo **y un
       * cuadro de trescientos metros de lado pisándola**, a la cota media de
       * la zona: donde ese cuadro queda por encima del asfalto aplanado, se
       * traga el avión, el coche del sígame y al señalero.
       *
       * Contado jugando en dos islas distintas, las dos siendo destino: «el
       * avión está metido en una duna, el coche no se ve», «el señor que me
       * señala está enterrado bajo la arena», «las dunas de Tenerife Sur». Y
       * no era arena.
       */
      this.terrain.recortarElHorizonte(
        this.vecinos.map((v) => ({
          x: v.mundo.desplazamiento.x,
          z: v.mundo.desplazamiento.z,
          medio: v.base.size / 2,
          // Y su agua, que tierra adentro no es la de casa. Ver
          // `mapasDeOrillas`.
          nivel: v.base.waterLevel,
        })),
      );
    }

    /*
     * **Y el mar y el cielo de Canarias, con vida de vez en cuando.**
     *
     * Pedido volando entre islas con el canal vacío: «que de vez en cuando se
     * vea un ferri por ahí, le daría un punto. En Canarias y muy de vez en
     * cuando», y «algún avión de los de aquí cruzando delante». Solo en
     * Canarias, que es donde están, y sin depender de que el vuelo tenga
     * destino: saliendo a dar una vuelta desde Los Rodeos también se ven los
     * barcos de Santa Cruz.
     *
     * Los aeropuertos que el tráfico de las islas necesita son los de los
     * escenarios, puestos con la misma proyección que coloca las islas
     * vecinas: así «lejos de los campos» es lejos de los que se ven.
     */
    const aqui = this.scenario.aerodrome?.origin;
    if (aqui && enCanarias(aqui)) {
      this.barcos = crearBarcos(aqui, this.scenario.waterLevel);
      this.scene.add(this.barcos.grupo);
      const aeropuertos: Aeropuerto[] = [];
      for (const s of SCENARIOS) {
        const alli = s.aerodrome?.origin;
        if (!alli || !enCanarias(alli)) continue;
        const d = dondeCae(aqui, alli);
        aeropuertos.push({
          id: s.id,
          x: d.x,
          z: d.z,
          cota: s.aerodrome?.elevationM ?? 0,
        });
      }
      this.islenos = new TraficoDeLasIslas(aeropuertos, (x, z) =>
        this.terrain.sampleHeight(x, z),
      );
      this.avionesDeLasIslas = crearAvionesDeLasIslas();
      this.scene.add(this.avionesDeLasIslas.grupo);
    }

    /*
     * **Y lo que se ve por la ventanilla**: lo destacado de la zona, puesto
     * con la misma cuenta que coloca a los aeródromos vecinos, y el relieve
     * entero —el de casa, el de los destinos y el del horizonte— para saber
     * qué se ve de verdad. Era la lista de pueblos de cada escenario, y desde
     * Los Rodeos se anunciaba Candelaria con la Dorsal en medio. Ver
     * `world/lo-destacado.ts` y `seVe` en `world/hitos.ts`.
     */
    const hitosDelVuelo = this.scenario.aerodrome
      ? destacadosDesde(this.scenario.aerodrome.origin)
      : [];
    this.ventanilla.ponerSuelo((x, z) => this.terrain.cotaConocida(x, z));
    this.ventanilla.ponerHitos(hitosDelVuelo);
    // Y se guardan para el plano, que todavía no existe en este punto del
    // constructor: se le dan unas líneas más abajo, al montar el HUD.
    this.hitosDelVuelo = hitosDelVuelo;

    /*
     * **La aproximación, con lo que no cambia en todo el vuelo.**
     *
     * Lo que cambia —dónde está el avión, en qué fase va, si hay aviso de
     * terreno— se le da en cada paso. Y **el campo al que se viene también se
     * le pregunta en cada paso**: se le daban el escenario y el terreno de
     * casa, copiados al construirla, y en el aeropuerto de llegada todo lo que
     * decide —el embudo, los mínimos, la orden de irse al aire, el PAPI— se
     * medía contra la pista de Gando a ciento trece kilómetros. Ver
     * `campoParaLaAproximacion` y `flight/la-aproximacion.ts`.
     */
    this.laAproximacion = new LaAproximacion({
      // El avión se pregunta también: se puede cambiar en pleno vuelo, y la
      // velocidad de referencia de los mínimos es la del que se vuela.
      avion: () => this.aircraft,
      hechos: this.hechos,
      vaca: this.vaca,
      campoDeAhora: () => this.campoParaLaAproximacion(),
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
     */
    if (this.scenario.aerodrome) {
      this.plan = new PlanDeVuelo(
        this.scenario.aerodrome,
        this.scenario.runway,
        (x, z) => this.terrain.sampleHeight(x, z),
        this.aircraft,
      );
      this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
      this.plan.ocupados = () => this.paradosEnLasCalles(false);
      this.plan.enCola = () => this.paradosEnLasCalles(true);
      this.plan.colaQueHay = () => this.paradosEnLasCalles(true, true);
    }
    /*
     * **Y el dibujo va con el plan, no con la lección.**
     *
     * «Dar una vuelta» montaba el plan y no su dibujo: la raya verde, el coche
     * del sígame, el señalero y la vaca se quedaban fuera de la escena. Y el
     * plan no se callaba por eso: al aterrizar trazaba la ruta al puesto, la
     * ayuda de rodaje giraba el avión hacia la salida —«se giró él solo, no sé
     * a dónde va»—, la tarjeta ponía «E3» y el señalero hacía gestos que salían
     * en la tarjeta, y nada de eso se veía. Esa lección es además la de viajar
     * —su destino de fábrica es el campo vecino— y la de las misiones, así que
     * era la llegada de casi todos los vuelos a otro sitio.
     *
     * Una ayuda que guía por un camino que no se ve es peor que ninguna. Lo
     * que no se quiere en una vuelta —una raya desde el puesto— ya no existe
     * sin dibujarlo: esa lección sale de la pista y el plan no traza nada
     * hasta tocar tierra. A partir de ahí la raya, el coche y el señalero son
     * los mismos que en cualquier otra, porque el sitio al que se va es el
     * mismo. Ver `senaleroALaVista` para la otra mitad: la tarjeta del
     * señalero no sale sin el señalero.
     */
    if (this.plan) {
      this.scene.add(this.plan.grupo);
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
    // Y lo que pasa al atravesar la nube: los jirones y el cristal mojado.
    // Ver `pasoDeLluvia`.
    this.jirones = crearJirones();
    this.scene.add(this.jirones.grupo);
    this.gotas = crearGotasEnElParabrisas();
    this.scene.add(this.gotas.grupo);
    this.nieblaDeCasa = this.sky.fog.density;
    /*
     * **Las cinco y media de la tarde**, y no el mediodía.
     *
     * Es la hora a la que un relieve se lee como relieve: sol bajo, sombras
     * largas, ladera al sol y ladera en sombra. El mediodía es la única hora
     * del día en la que un paisaje no tiene forma, y era la que estaba fijada.
     */
    this.horaDelVuelo = this.horaPedida();
    this.sky.ponerHora(this.horaDelVuelo);
    this.scene.add(this.sky.group);
    /*
     * **Y las aves**, con la hora ya puesta: de ella depende si hay térmica y
     * si es de día. Ver `poblarDeAves`.
     */
    this.scene.add(this.dibujoDeBandadas.grupo);
    this.poblarDeAves();
    this.scene.fog = this.sky.fog;
    // El agua con el mar del cielo: refleja el atardecer y casa con el que
    // la cúpula pinta más allá de su borde. Ver `materialDelAgua`.
    this.terrain.ponerMaterialDelAgua(this.sky.materialDelAgua, this.camera.far);

    // La ciudad antes que la vegetación: la vegetación pregunta por ella para
    // no plantar un bosque donde hay un barrio.
    // La manta del mundo, antes que nada de lo que va encima.
    if (options.ortofoto) this.terrain.ponerOrtofoto(options.ortofoto);
    /*
     * **Y el anillo se parte en dos si hay foto de en medio.**
     *
     * Va antes de ponerles nada: partir después dejaría las dos mallas
     * nuevas sin textura. Ver `partirElHorizonte`.
     */
    const partido =
      options.ortofotoMedia !== undefined &&
      this.terrain.partirElHorizonte(
        (options.ortofotoMedia.ficha.tamanoM ?? 0) / 2,
      );
    if (options.ortofotoHorizonte)
      /*
       * Con su exposición casada: el anillo del horizonte y el mapa fino son
       * dos fotos distintas del mismo sitio, y juntarlas sin corregir dejaba
       * un cuadrado dibujado en el suelo. Ver `exposicionDe`.
       */
      this.terrain.ponerOrtofotoLejana(
        options.ortofotoHorizonte,
        exposicionDe(options.ortofotoHorizonte.ficha),
      );
    if (partido && options.ortofotoMedia)
      this.terrain.ponerOrtofotoLejana(
        options.ortofotoMedia,
        exposicionDe(options.ortofotoMedia.ficha),
        "horizonte-medio",
      );
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
     * **Y las luces del pueblo, que de noche son la ciudad entera.**
     *
     * Contado jugando al llegar al anochecer: «Gran Canaria sin luces». Y no
     * era de Gran Canaria: de noche se apagaba el mundo salvo el aeropuerto,
     * y una isla a oscuras no es una isla de noche, es un agujero.
     *
     * Van de `luzDeCiudad` y no de `scenario.ciudad`, y esa es la mitad del
     * arreglo: la segunda se quita cuando la fotografía fina ya enseña la
     * ciudad, y eso vale de día — de noche la foto no enseña nada. Sin esto,
     * los dos escenarios con ciudad extraída eran justo los dos que se
     * quedaban a oscuras. Ver `world/luces-de-ciudad.ts`.
     */
    const paraLuces = options.luzDeCiudad ?? this.scenario.ciudad;
    if (paraLuces) {
      this.lucesDeCiudad = crearLucesDeCiudad(
        paraLuces,
        (x, z) => this.terrain.sampleHeight(x, z),
        // El mismo vacío alrededor de la pista que usa la ciudad para no
        // construir: una farola en la zona de toma dice «aquí hay calle»
        // donde hay pista.
        zonaDeAeropuerto(this.scenario, 60),
        this.scenario.waterLevel,
      );
      this.scene.add(this.lucesDeCiudad.grupo);
      this.lucesDeCiudad.ponerSol(this.sky.sunDirection.y);
    }
    // Y las de los vecinos, que se montaron antes de que hubiera cielo.
    for (const v of this.vecinos) v.mundo.ponerSol(this.sky.sunDirection.y);
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
    if (aero) this.apuntarLosEdificios(aero);
    /*
     * **Y los del aeropuerto de llegada, que también están.** La terminal, la
     * torre y los hangares de Los Rodeos se dibujaban y se atravesaban: el
     * índice solo sabía de los de casa. Con su aeródromo ya corrido, son
     * bultos de este mundo como cualquier otro.
     */
    for (const v of this.vecinos)
      if (v.aerodromo) this.apuntarLosEdificios(v.aerodromo);

    /*
     * **Y la granja, si el campo la tiene**, antes que el monte: el monte
     * pregunta dónde está para no plantarle un árbol en el camino.
     */
    if (aero) {
      this.granja = crearGranja(
        aero,
        (x, z) => this.terrain.sampleHeight(x, z),
        new Date(),
        this.scenario.seed,
      );
      if (this.granja) {
        this.scene.add(this.granja.grupo);
        // Y sus potreros, en el suelo: ver `potrerosDe`.
        this.terrain.pintarEncima(this.granja.pintura);
      }
    }
    const granja = this.granja;
    this.vegetacion = createVegetation(
      this.scenario,
      (x, z) => this.terrain.sampleHeight(x, z),
      // Sobre la fotografía, solo donde la fotografía es verde. Ver
      // `createVegetation`.
      options.ortofoto
        ? (x, z) =>
            options.ortofotoFina?.color(x, z) ?? options.ortofoto!.color(x, z)
        : undefined,
      granja ? (x, z) => granja.ocupa(x, z) : undefined,
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
    /*
     * Y el plano lleva los hitos también: con su dibujo desde el principio y
     * con su **nombre** en cuanto la comandante lo haya señalado. El mapa se
     * va llenando de nombres a medida que se vuela, y sigue sin haber nada que
     * haya que leer para saber dónde está uno. Ver `Mapa.ponerHitos`.
     */
    this.hud.mapa.ponerHitos(
      this.hitosDelVuelo,
      () => this.ventanilla.yaDichos,
    );
    /*
     * Y la pista del destino, que es la otra mitad del plano: sin ella, quien
     * vuela sobre el mar entre dos islas no tiene forma de saber en cuál de
     * las dos puede bajar. Ver `Mapa.ponerOtraPista`.
     */
    if (this.vecinos.length > 0) {
      this.hud.mapa.ponerOtrasPistas(this.vecinos.map((v) => v.campo.pista));
      // Y sus plataformas y calles, que de cerca son lo que se mira para
      // rodar. Ver `Mapa.ponerOtrosAerodromos`.
      this.hud.mapa.ponerOtrosAerodromos(
        this.vecinos.flatMap((v) => (v.aerodromo ? [v.aerodromo] : [])),
      );
      // Y cada campo con su nombre. Ver `Mapa.ponerCampos`.
      this.hud.mapa.ponerCampos(
        this.camposDelVuelo().map((c) => ({
          x: c.x,
          z: c.z,
          oaci: oaciDe(c.escenario),
          nombre: t(c.escenario.nameKey as TranslationKey),
        })),
      );
    }
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
      toggleCuadro: () => this.hud.alternarCuadro(),
      togglePausa: () => this.alternarPausa(),
      toggleEngine: () => this.toggleEngine(),
      toggleCredits: () => this.credits.toggle(),
      cycleAircraft: () => this.cycleAircraft(),
      cycleMission: () => this.cycleMission(),
      cycleDestino: () => this.siguienteDestino(),
      girarAltimetro: (pasos: number) => this.girarAltimetro(pasos),
      girarVentanillaAlt: (pasos: number) => this.girarLaVentanillaAlt(pasos),
      trenTrabado: () => this.trenTrabado(),
      /*
       * **Un paso del compensador se oye y se ve.** El clic de la rueda y la
       * aguja que salta con su flecha: es lo que dice, sin leer, que un toque
       * corto ha dejado el morro puesto. Ver `flight/palanca-de-teclado.ts`.
       */
      pasoDelCompensador: (sentido: number) => {
        this.avisar("compensador");
        this.hud.pasoDelCompensador(sentido);
      },
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
    // Ver `buildFlightModel`: el primer modelo se construyó antes que esto.
    this.input.compensadorVivo = this.tier.model !== "simple";

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
    /*
     * **Y lo que se pida antes de tener el pack, que lo espere.**
     *
     * El crosscheck de Jazlyn no sonaba en casa de Enrique: se pide en el
     * puesto a los cuatro segundos, y el pack todavía no había bajado —ni
     * empezado a bajar, si nadie había tocado nada en el juego—, así que se
     * le pasaba a la voz del navegador, muda en Brave para Linux, y se daba
     * por dicho. Ahora espera a su grabación y al audio despierto, con tope.
     * Ver `estaLista` en `audio/instructor-grabado.ts`.
     *
     * **Y si la página ya tuvo su gesto, el pack baja ya.** El primer gesto se
     * esperaba dentro del juego, y quien viene del hangar ya hizo el suyo —el
     * clic de despegar— antes de que el juego existiera: ese clic desbloquea
     * el audio de la página entera, y nadie lo aprovechaba. El pack no
     * empezaba a bajar hasta tocar la primera tecla, con el puesto ya pasado.
     */
    this.instructor.esperarAlPack();
    if (yaHuboGesto()) {
      this.audio.unlock();
      void this.instructor.cargar();
    }
    /*
     * Y el volumen que quedó guardado también manda sobre la voz, **desde el
     * arranque**: se guarda entre partidas, así que quien dejó el juego en
     * «bajo» lo encuentra en «bajo» — y hasta hoy se lo encontraba con el
     * instructor a tope hasta que tocara el botón. Ver `ponerVolumenDeVoz`.
     */
    this.alCambiarElVolumen(this.audio.level, false);
    // La pantalla de teclas se monta si existe su hueco. Es opcional a
    // propósito: el juego tiene que arrancar aunque falte.
    const teclasRoot = document.getElementById("teclas");
    if (teclasRoot)
      this.keyScreen = new KeyScreen(teclasRoot, this.input.keymap);
    this.ponerElDibujoDelMotor();
    // Sin letras, teclado dibujado. Con letras, la tabla.
    this.keyScreen?.setSimple(
      this.tier.instruments === "none" || this.tier.instruments === "pictorial",
    );
    this.keyScreen?.setCompensador(this.tier.model !== "simple");
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
    /*
     * **Y las dos van en el escalón de mando, no en el normal.**
     *
     * Iban en normal, o sea por debajo de la torre, y eso las dejaba fuera de
     * la cola en cuanto la torre abría la boca: medido en Los Rodeos, el
     * detector cantó «rotate» a 56 nudos y de la boca no salió. Es la misma
     * avería que hizo que la cola pasara de una plaza a tres —«en una carrera
     * de despegue, Vr le quitaba el sitio a V1»— y aquí se la quitaba la
     * torre.
     *
     * Y el orden es el correcto, no una excepción: una autorización **sigue
     * siendo verdad** cuando se dice tarde, y por eso aguanta doce segundos
     * en la cola. Un «V1» dicho tres segundos tarde ya no es un V1, es un
     * dato sobre el pasado. Lo que menos puede esperar es lo que va delante.
     */
    this.hud.onVelocidades((cual) => {
      if (cual === "V1") {
        this.avisar("v1");
        this.cantar(
          "V one",
          t("vuelo.comprometido"),
          "vuelo.comprometido",
          "mando",
        );
        return;
      }
      this.avisar("rotar");
      this.cantar("rotate", t("vuelo.rotar"), "vuelo.rotar", "mando");
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
      this.terrain.cotaConocida(x, z),
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
    // Y el encuadre, que cambia con ella: desde la cabina no hay cuadro que
    // esquivar. Ver `encuadrarSobreElCuadro`.
    this.encuadrarSobreElCuadro();
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
    // El interruptor del cinturón, en los aviones que llevan gente detrás.
    this.hud.ponerHayCinturon(conPasaje(this.aircraft.mass));
    this.hud.onCinturon(() => this.mandarElCinturon());
    /*
     * **Y el piloto automático, en el avión que lo lleva.**
     *
     * Era del peldaño: en Guyrami no había, y el JAZ 120 de los pequeños tenía
     * que sostener veintinueve mil pies a flechazos —«al no tener joystick es
     * difícil jugar con las flechas»—. El peldaño no le quita equipo al avión:
     * el botón sale donde el avión lo lleva, en los cuatro, y enseña lo que
     * enseña de verdad: que en crucero nadie pilota a mano, y que se suelta en
     * cuanto tocás los mandos. Ver `llevaPilotoAutomatico`.
     */
    this.hud.ponerHayPilotoAutomatico(llevaPilotoAutomatico(this.aircraft));
    // Y la marca del gas de nivel, que es del modelo. Ver `ponerGasDeNivel`.
    this.hud.ponerGasDeNivel(
      this.tier.model === "simple" ? MOTOR_QUE_SOSTIENE : null,
    );
    this.hud.onPilotoAutomatico(() => this.ponerPilotoAutomatico());
    this.hud.onVentanillaAlt((pasos) => this.girarLaVentanillaAlt(pasos));
    this.hud.onDestino(() => this.siguienteDestino());
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
    this.ponerTecho(deCasa.techoM, tapaduraDe(deCasa));
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
    this.hud.onVolumen((posicion, soltado) =>
      this.moverElVolumen(posicion, soltado),
    );
    /*
     * Y el tren y los flaps desde fuera, por el mismo camino que los botones
     * de dentro de la cabina: un mando que se toca en dos sitios tiene que
     * hacer una sola cosa. Ver `pulsarMandoDeCabina`.
     */
    this.hud.onMandoDeCabina((cual) => {
      // Los aerofrenos y el autofreno no se pulsan en la cabina 3D: en el HUD
      // y con su tecla.
      if (cual === "aerofrenos") this.input.alternarAerofrenos();
      else if (cual === "autofreno") this.input.alternarAutofreno();
      else this.pulsarMandoDeCabina(cual);
    });
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
    this.despierta.ponerse(true);
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
    this.despierta.ponerse(false);
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
  private mantenerElVueloRecto(mandos: ControlInputs): ControlInputs {
    const s = this.flight.state;
    if (s.onGround) return mandos;
    /*
     * **Y solo en los ejes que nadie mueve.** Era en todos, y con el mapa
     * abierto las flechas no hacían nada: «no me deja girar, ni subir o bajar
     * cuando tengo el mapa». Ahora manda quien se mueve, eje por eje, que es
     * la regla de `mandaQuienSeMueve`. Ver `flight/vuelo-recto.ts`.
     *
     * El piloto de pruebas escribe en los mandos sin pasar por el teclado,
     * así que para él «moverse» es tener el eje fuera del centro: si no, un
     * banco que vuela con el plano abierto volaría contra la mano invisible.
     */
    const c = this.input.controls;
    const m = this.input.mueve;
    const banco = this.pilotoDePruebas !== null;
    return conElVueloRecto(
      mandos,
      {
        // Y la mano del teclado o del dedo, que ya sostiene lo que se dejó.
        cabeceo: m.cabeceo || this.input.sostiene.cabeceo || (banco && c.elevator !== 0),
        alabeo: m.alabeo || this.input.sostiene.alabeo || (banco && c.aileron !== 0),
        timon: m.timon || (banco && c.rudder !== 0),
      },
      { alabeo: bankAngleOf(s.orientation), vertical: s.verticalSpeed },
      this.mandosConVueloRecto,
    );
  }

  /** La copia que lleva la mano invisible, para no escribir en la persona. */
  private readonly mandosConVueloRecto: ControlInputs = neutralControls();

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
    this.despierta.ponerse(false);
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
      // Y con qué tren tocó. Ver `trenAlTocar`.
      !this.aircraft.trenRetractil || this.input.controls.tren > 0.5,
      // Y si fue antes del umbral de aterrizaje. Ver `enLaZonaDeLasFlechas`.
      this.enLaZonaDeLasFlechas(),
    );
    /*
     * **Y tocar el monte volando se juzga al tocar, no dos segundos después.**
     *
     * El veredicto de abajo espera a que el avión se asiente, y rozando una
     * ladera a velocidad de vuelo no se asienta nunca: rebota y sigue. Así el
     * reactor del banco tocó las estribaciones de Anaga a ciento dieciséis
     * metros por segundo, siguió volando y el vuelo no se enteró. Ver
     * `percanceAlTocar`.
     */
    if (this.landing.acabaDeTocar) {
      const percance = percanceAlTocar({
        enLaPista: this.tocoEnElCampoDeVuelo(),
        superficie: this.superficie,
        velocidad: s.airspeed,
        caida: s.touchdownSinkRate,
        /*
         * **En verdadera**, como `velocidad`: la pérdida es de indicada, y en
         * un campo alto o con calor la misma indicada es más velocidad real.
         * Ver `atmosphere.ts`.
         */
        perdida: trueFromIndicated(
          velocidadDePerdida(this.aircraft),
          s.position.y,
          this.flight.aireDelDia(),
        ),
        rompe: this.flight.limiteDeCaida(),
      });
      if (percance) {
        this.sufrirPercance(percance);
        return null;
      }
    }
    if (!veredicto) return null;
    this.hud.flash(
      t(
        veredicto === "suave"
          ? "hud.landedSoft"
          : veredicto === "firme"
            ? "hud.landedFirm"
            : veredicto === "rapido"
              ? "hud.landedFast"
              : veredicto === "corto"
                ? "hud.landedShort"
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
    } else if (veredicto === "corto") {
      /*
       * **Tocar antes del umbral desplazado: dicho, dibujado y nada más.**
       *
       * No es un percance —el avión está en una pista, entero— ni lo canta la
       * cabina, que ningún avión lleva un aviso para esto. Lo dice la
       * instructora y lo enseña el dibujo: la barra blanca, las flechas
       * apuntando a ella y el avión posado sobre las flechas. Es lo que se ve
       * por la ventanilla el día que se aterriza en un umbral así, y la
       * próxima vez se toca pasada la barra. Ver `umbral-desplazado.ts`.
       */
      this.avisar("attention");
      this.instructor.decir(t("hud.landedShort"), "hud.landedShort");
      this.hud.senal.mostrar(
        "corto",
        this.rotulo("hud.landedShort", "palabra.corto"),
        null,
        { segundos: SE_QUEDA_EL_VEREDICTO, prioridad: URGENTE },
      );
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
     * **Y sin tren, que es un aterrizaje de panza y no un aterrizaje.**
     *
     * Va por delante del golpe porque una toma de panza puede ser suavísima
     * —el avión se posa sobre el fuselaje sin caída ninguna— y hasta hoy eso
     * entraba en el cuaderno como aterrizaje bueno: «me está dando por válida
     * la toma sin que me diga nada acerca del tren de aterrizaje, no lo había
     * sacado».
     *
     * No es un castigo añadido: es lo que pasa. Se va el tren, se van los
     * motores de debajo del ala y la pista se cierra. Y no llega sin avisar
     * —`avisaDelTren` canta desde doscientos cincuenta metros viniendo en
     * final, con su dibujo—, que es la regla de la casa: la norma se enseña
     * antes de que se vea la consecuencia.
     */
    else if (!this.landing.trenAlTocar) this.sufrirPercance("sintren");
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
   * Un aviso de vuelo, dicho por quien lo diría de verdad y como toca en este
   * peldaño.
   *
   * Hay dos clases de canto y no se reparten igual. Ver la cabecera de
   * `flight/escalera.ts`:
   *
   * - **Los de una caja del avión** —terreno, *sink rate*, pérdida, tráfico,
   *   mínimos— los dice la máquina, en inglés y en los cuatro peldaños, en el
   *   avión que la lleva. En los peldaños de abajo, detrás y con calma, la
   *   instructora explica qué ha sonado y qué se hace. En el avión que no la
   *   lleva no suena ninguna caja: lo dice ella, en casa.
   * - **Los de la tripulación** —*V one*, *rotate*, *gear up*— suben por la
   *   escalera: la instructora en casa abajo, el canto en inglés arriba.
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
     *
     * Es la urgencia de la instructora: la máquina no pide turno, y lo suyo
     * se ordena por lo que manda cada caja. Ver `audio/maquina.ts`.
     */
    urgencia: Urgencia = "normal",
  ): void {
    const deCabina = claveDeCabina(ingles);
    /*
     * **Una caja del avión: la máquina, si el avión la lleva.**
     *
     * En los cuatro peldaños, porque es lo que suena en ese avión: «es que ni
     * el "traffic" ni el "terrain" ni nada de eso, y yo sé que la cabina
     * habla». Y en el que no la lleva no suena, que un aviso sonoro solo se
     * pone en un avión que lo llevaría: en el JAZ 20 del peldaño de arriba
     * sonaba «terrain» con la voz de una caja que ese avión no tiene. Ahí lo
     * dice la instructora, en casa, que es quien lo diría sentada al lado.
     */
    if (deCabina && esDeUnaCaja(deCabina)) {
      if (loDiceElAvion(deCabina, this.aircraft)) {
        /*
         * **Y la explicación pesa como una orden**, sin cortar a nadie. Es la
         * otra mitad del aviso, no un comentario: con el peso normal, un
         * «girá a la base» o un saludo de la radio la echaban de la cola llena
         * y el *traffic, traffic* se quedaba sin su «mirá adelante». Medido en
         * Guyrami con el JAZ 90: «vuelo.trafico.delante: no cabía en la
         * cola». Lo urgente sigue siendo urgente.
         */
        const pesa: Urgencia = urgencia === "urgente" ? "urgente" : "mando";
        const explica =
          laInstructoraLoExplica(this.tier.avisos) && encasa && clave
            ? () => {
                this.apuntarCanto(`${ingles}: lo explica ${clave}`);
                this.instructor.decir(encasa, clave, pesa);
              }
            : undefined;
        const como = this.maquina.decir(deCabina, explica);
        this.apuntarCanto(`${ingles}→máquina(${deCabina}): ${como}`);
        if (como !== "no") return;
        /*
         * **Y si la máquina no puede sonar, un aviso no se queda mudo.** Pasa
         * sin el pack de voz o con el audio dormido: lo dice la instructora,
         * que es lo que había antes de que la caja tuviera voz propia.
         */
      }
      this.apuntarCanto(
        `${ingles}→${encasa ? (clave ?? "sin clave") : "NADA"} (lo dice la instructora)`,
      );
      if (encasa) this.instructor.decir(encasa, clave, urgencia);
      return;
    }
    if (cantaLaCabina(this.tier.avisos, "tripulacion")) {
      /*
       * **Y con la grabación de cabina si la hay.**
       *
       * Esto mandaba el inglés al sintetizador del navegador sin más, y por eso
       * las frases de cabina grabadas —«V one», «rotate»— se bajaban a cada
       * tablet con el resto del pack **para no sonar nunca**. Se preguntó
       * jugando: «¿y qué hay de esas voces robóticas? "Minimals", "five
       * hundred"… o "Terrain!"».
       *
       * Lo de la tripulación habla por la boca de la instructora a propósito:
       * lo dice quien va sentado a tu lado, y espera su turno como cualquier
       * persona. Ver `audio/cabina.ts`.
       */
      if (deCabina && this.instructor.vozDe(deCabina)) {
        this.apuntarCanto(`${ingles}→${deCabina}`);
        this.instructor.decir(ingles, deCabina, urgencia);
        return;
      }
      /*
       * **Y lo que la cabina no tiene grabado lo dice la instructora con su
       * grabación, antes que el robot.** «On the glide path» o «flaps» no son
       * cantos de ninguna caja —el primero es un elogio y el segundo un
       * consejo— y no tienen toma de cabina: salían por el sintetizador en
       * inglés, en mitad de una cabina que suena grabada. La instructora sí
       * los tiene, en casa.
       */
      if (!deCabina && encasa && clave && this.instructor.vozDe(clave)) {
        this.apuntarCanto(`${ingles}→${clave}`);
        this.instructor.decir(encasa, clave, urgencia);
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
   * **Un número de la cuenta**, por la voz de la máquina y en este instante.
   *
   * No pasa por `cantar` porque no tiene nada que repartir: la cuenta no sube
   * por la escalera, no la explica nadie y no tiene a quién pasársela si no
   * puede sonar —un número dicho tarde, o por otra boca, es una mentira—. Si
   * la máquina está diciendo un aviso, el número se pierde, y está bien.
   */
  private cantarLaCuenta(aviso: Aviso): void {
    const clave = claveDeCabina(aviso.dice);
    const como =
      clave && loDiceElAvion(clave, this.aircraft)
        ? this.maquina.decir(clave)
        : "no";
    this.apuntarCanto(`${aviso.dice}→máquina: ${como}`);
    if (!import.meta.env.DEV) return;
    this.cuentaOida.push({
      t: Date.now(),
      dice: aviso.dice,
      pies:
        this.radioAltura === null
          ? null
          : Math.round(this.radioAltura / 0.3048),
      enTierra: this.flight.state.onGround,
      como,
    });
    if (this.cuentaOida.length > 400) this.cuentaOida.shift();
  }

  /**
   * **Al tocar tierra, lo que hablaba del aire se retira de la cola.**
   *
   * Un «quitá el gas» o un «venís lento» que todavía esperan turno cuando las
   * ruedas tocan ya no describen nada, y dichos rodando son mentira: es la
   * misma regla que tira un número de la cuenta que no puede sonar a su
   * altura. Lo que ya está sonando se deja acabar. Ver `retirar` en
   * `audio/boca.ts`.
   */
  private alTocarTierra(): void {
    BOCA.retirar((clave) => !!clave && DEL_AIRE.test(clave));
  }

  /**
   * **La recogida, acompañada: «quitá el gas», y nada más.**
   *
   * En los últimos veinte pies ya no hay velocidad que corregir ni senda que
   * seguir: se deja de volar y se posa. Lo único que se puede hacer mal es
   * llegar con gas, que hace flotar el avión por encima de la pista y se la
   * come. Es la altura a la que los reactores que lo llevan cantan *retard*.
   *
   * Y es **lo único** que se dice ahí abajo, y eso es lo que arregla: con el
   * mínimo de velocidad bajando, la instructora pedía «metéle gas», se metía
   * gas y enseguida sonaba «bajás muy rápido». «Si estoy tomando tierra, ¿qué
   * se supone que tengo que hacer?» Ver `bandaDeVelocidad`, que se calla por
   * debajo de la recogida, y `RECOGIDA` en `flight/avisos-de-actitud.ts`.
   *
   * Una vez por aproximación, con la misma máquina que la cuenta: al cruzar
   * los veinte pies bajando, en la zona de la pista.
   */
  private acompanarLaRecogida(l: Lectura): void {
    if (!this.laRecogida.paso(l)) return;
    const c = this.input.controls;
    if (!c.engineOn || c.throttle <= GAS_EN_LA_RECOGIDA || this.sinMotor)
      return;
    this.hud.senal.mostrar(
      "toma",
      this.rotulo("vuelo.quitaElGas", "palabra.sinGas"),
      null,
      { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
    );
    this.instructor.decir(t("vuelo.quitaElGas"), "vuelo.quitaElGas");
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
    /*
     * **Y con los números del momento en que se dijo.**
     *
     * Dos veces se buscó leyendo el código de dónde salía un «vas muy rápido»
     * con el avión a la mitad de su velocidad de aproximación, y dos veces no
     * se encontró. Un canto apuntado sin las cifras que lo provocaron no sirve
     * para eso: dice qué se dijo y no por qué.
     *
     * Van la indicada, la de aproximación de este avión y la altura sobre el
     * suelo, que son las tres de las que dependen todas las bandas.
     */
    const s = this.flight.state;
    const kt = Math.round(s.airspeed * NUDOS);
    const vref = Math.round(this.aircraft.approachSpeed * NUDOS);
    const alto = Math.round(s.heightAboveGround);
    /*
     * **Y el ángulo de ataque, la carga y los flaps.**
     *
     * Un «stall, stall» a ciento ochenta y ocho nudos no se entiende con la
     * velocidad delante: una pérdida no la decide la velocidad sino el ángulo
     * con el que el ala ataca el aire, y ese ángulo depende de cuánto se tire
     * —la carga— y de los flaps que se lleven. Sin esas tres cifras al lado,
     * cada canto de pérdida raro vuelve a ser una adivinanza.
     */
    const alfa = ((s.alpha * 180) / Math.PI).toFixed(1);
    const n = s.loadFactor.toFixed(2);
    const flaps = this.input.controls.flaps.toFixed(2);
    this.cantados.push(
      `${que} [${kt} kt · vref ${vref} · ${alto} m · α ${alfa}° · n ${n} · flaps ${flaps}]`,
    );
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
  /**
   * **Si se viene lento, «subí» es el consejo contrario.**
   *
   * Un avión bajo la senda porque va lento no se arregla tirando: se arregla
   * con gas. Tirar con poca velocidad es exactamente como se entra en pérdida
   * a cien metros del suelo, y es lo que este juego estaba enseñando — dicho
   * por quien lo juega, bajando con el de fuselaje ancho: «voy a una velocidad
   * que no es real, un 747 se cae así, pero se empeña en que no, que tengo que
   * subir y no es verdad».
   *
   * Tenía razón en las dos mitades: el avión se caía porque iba lento, y el
   * juego le pedía lo único que lo empeora.
   *
   * Así que cuando la velocidad está por debajo de la banda, la senda se calla
   * y habla la velocidad, que es la que sabe por qué se está bajo. Es la misma
   * regla de «un suceso, una sola voz» — aquí con la causa mandando sobre el
   * síntoma. Ver `NO_A_LA_VEZ` en `audio/boca.ts`.
   */
  private get bajoPorqueVaLento(): boolean {
    return this.bandaDeAhora === "lento";
  }

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
          tipo === "ocupada" && !sinTorre(this.elCampo().escenario.aerodrome)
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

  /**
   * Y el aeródromo de hoy, que cuenta como sitio visitado.
   *
   * **El del campo donde se toca o de donde se despega**, que se llama al
   * aterrizar y al despegar. Apuntaba siempre el de casa: aterrizar en Los
   * Rodeos viniendo de Gran Canaria no contaba como sitio nuevo, y el grado
   * que pide haber visitado dos aeródromos no se podía ganar volando a otro.
   */
  private apuntarElSitio(): void {
    const campo = this.elCampo().escenario;
    const id = campo.aerodrome?.id ?? campo.id;
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
    /*
     * Con de dónde salió y dónde acabó, si no es casa: el mundo de la traza
     * sigue siendo el de casa, pero el vuelo es de allí a allá.
     */
    const llegada = this.elCampo().id;
    const salida = this.despegoDe || this.salidaId;
    apuntarVuelo({
      fecha: new Date().toISOString(),
      escenario: this.scenario.id,
      ...(salida && salida !== this.scenario.id ? { salida } : {}),
      ...(llegada !== this.scenario.id ? { llegada } : {}),
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
        //
        // **Encuadrado en lo volado, sin suelo de escala.** Se le pasaba el
        // tamaño del escenario, y con eso la ventana medía doce kilómetros
        // en Asunción: el aeródromo salía como un punto y la lección de rodar,
        // que se queda en un kilómetro, como nada. El suelo de escala es para
        // comparar fichas en el hangar; aquí solo hay un vuelo.
        plano(this.scenario, 0, this.traza, this.aerodromosDelTramo()),
        // Y lo que se lleva volado en total, en avioncitos. Ver `ui/reloj.ts`.
        this.relojDeHoras(),
      );
      this.avisar("achieved");
    });
  }

  /**
   * Apunta en el índice de bultos los edificios de un aeródromo, en
   * coordenadas de este mundo. Ver dónde se llama, en el constructor.
   */
  private apuntarLosEdificios(aero: Aerodrome): void {
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

  /**
   * Los aeródromos de los otros campos por los que pasó este tramo, ya
   * corridos, para el plano del final: el de salida si no es casa y el de
   * llegada. La traza está en coordenadas del mundo de casa, y ellos también.
   */
  private aerodromosDelTramo(): Aerodrome[] {
    const ids = new Set([this.despegoDe || this.salidaId, this.elCampo().id]);
    ids.delete(this.scenario.id);
    return this.vecinos
      .filter((v) => ids.has(v.campo.id) && v.aerodromo)
      .map((v) => v.aerodromo!);
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
   * Por dónde se sale de la pista, en coordenadas del mundo, y a cuántos
   * metros de ruta está.
   *
   * Es el punto de la ruta de vuelta donde ya no se pisa la pista **para no
   * volver a ella**. Sirve para plantar ahí el coche del «sígame» hasta que
   * llegue el avión: enseña por dónde hay que abandonar sin decir una
   * palabra, que es exactamente para lo que sirve un sígame.
   *
   * Cuenta como pista su rectángulo y `BIEN_FUERA_DE_LA_PISTA` alrededor. Ver
   * `salidaDeLaRuta`.
   */
  private bocaDeLaSalida(): { x: number; z: number; s: number } | null {
    const r = this.laPistaDeAhora();
    return salidaDeLaRuta(this.plan?.rutaVisible() ?? [], (x, z) => {
      const ejes = enEjesDePista(x, z, r.x, r.z, r.heading);
      return (
        Math.abs(ejes.across) <= r.width / 2 + BIEN_FUERA_DE_LA_PISTA &&
        Math.abs(ejes.along) <= r.length / 2 + BIEN_FUERA_DE_LA_PISTA
      );
    });
  }

  /**
   * Si en esta aproximación ya se avisó de que se venía alto o bajo.
   *
   * Es la condición entera de `loCorregiste`: sin aviso previo no hay nada que
   * corregir, y felicitar a quien no hizo nada convierte el elogio en ruido.
   */
  private avisadoDeLaSenda = false;

  /**
   * **Lo que ve por delante el avisador de terreno**, en el avión que lo
   * lleva: el TAWS de los de turbina con pasaje, que son los que llevan los
   * avisos que hablan —ver `avisosHablados` en `flight/aircraft.ts`—. En la
   * avioneta, el fumigador y el bimotor de pistón no hay quien mire, y no se
   * mira: un aviso solo se pone en el avión que lo llevaría.
   *
   * Cinco veces por segundo, que a ciento cuarenta nudos son catorce metros.
   * El giro sale de cómo cambia el rumbo sobre el suelo entre una mirada y la
   * siguiente, que es lo que usa el equipo de verdad para curvar su mirada.
   */
  private mirarElTerrenoDelante(dt: number): AvisoDelante {
    const s = this.flight.state;
    if (!this.aircraft.avisosHablados || s.onGround || s.crashed) {
      this.delante = null;
      this.rumboDeDelante = null;
      this.desdeDelante = 0;
      return null;
    }
    this.desdeDelante += dt;
    if (this.delante && this.desdeDelante < CADA_CUANTO_SE_MIRA_DELANTE)
      return this.delante.aviso;
    const rumbo = Math.atan2(s.velocity.x, -s.velocity.z);
    let giro = 0;
    if (this.rumboDeDelante !== null && this.desdeDelante > 0) {
      const d = ((rumbo - this.rumboDeDelante + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      giro = d / this.desdeDelante;
    }
    this.rumboDeDelante = rumbo;
    this.desdeDelante = 0;
    this.delante = mirarDelante(
      {
        x: s.position.x,
        z: s.position.z,
        altitud: s.position.y,
        vx: s.velocity.x,
        vz: s.velocity.z,
        vertical: s.verticalSpeed,
        giro,
      },
      this.cotaParaLaCarta,
      this.pistasConocidas(),
    );
    return this.delante.aviso;
  }

  /** Las pistas del vuelo como las conoce el avisador: con su cota. */
  private pistasConocidas(): readonly PistaConocida[] {
    const pistas = this.pistasDelVuelo();
    if (this.pistasConocidasDe !== pistas) {
      this.pistasConocidasDe = pistas;
      this.pistasConocidasHechas = pistas.map((p) => ({
        x: p.x,
        z: p.z,
        heading: p.heading,
        length: p.length,
        width: p.width,
        cota: this.terrain.sampleHeight(p.x, p.z),
      }));
    }
    return this.pistasConocidasHechas;
  }

  private pistasConocidasDe: readonly Pista[] | null = null;
  private pistasConocidasHechas: readonly PistaConocida[] = [];

  /**
   * El relieve que conoce el avisador de terreno, el que mira delante y el que
   * pinta la carta: la misma función siempre. Ver `elMapa`.
   */
  private readonly cotaParaLaCarta = (x: number, z: number): number | null =>
    this.terrain.cotaConocida(x, z);

  /** El aviso del bulto, con su antirrebote. Ver `SE_QUEDA_EL_BULTO`. */
  private avisarDelBulto(dibujo: string): void {
    if (this.avisandoDelBulto > 0) return;
    this.avisandoDelBulto = SE_QUEDA_EL_BULTO;
    this.hud.senal.mostrar(
      comoDibujo(dibujo),
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
    /*
     * **Y en `mando`: renunciar es ganar, y se dice.** En `normal` no cabía
     * en la cola —la orden de la torre, su porqué y los «muy rápido» de la
     * subida van todos a la vez—, y en Gando las dos frustradas por la pista
     * ocupada se obedecieron sin que nadie las felicitara.
     */
    this.hechos.on("frustrada", () =>
      this.cantar(
        "going around. good decision",
        laFrustrada.texto,
        laFrustrada.id,
        "mando",
      ),
    );

    /*
     * **El punto de descenso**: el ordenador de a bordo dice que toca bajar.
     *
     * Pedido jugando, y con la pega bien vista: «el descenso siempre empieza
     * clavado, casi de reloj… el ordenador de a bordo debería avisarme». Y lo
     * hace, en cualquier avión con plan de vuelo: el «T/D» de la carta es un
     * punto que se ve llegar, y al pasarlo sale el aviso con su dibujo y su
     * tono.
     *
     * **Lo que dice un ordenador de vuelo de verdad se lee, no se oye**: en
     * una cabina de línea el punto de descenso es un mensaje en la pantalla,
     * sin voz de ninguna caja. Así que en el peldaño de cabina es eso, un
     * mensaje en inglés, como el TA ONLY de la carta. En los de abajo la
     * instructora lo dice con calma, «empezamos a bajar», que es quien lo
     * diría sentada al lado. Y siempre con el dibujo: ningún canto es el único
     * canal.
     */
    this.hechos.on("puntoDeDescenso", () => {
      /*
       * Y la comandante hace su anuncio aquí, en el T/D del plan, que es
       * cuando lo hace una de verdad. Antes lo deducía viendo bajar al avión.
       * Ver `empezarElDescenso` en `audio/megafonia.ts`.
       */
      this.megafonia.empezarElDescenso();
      this.ponerLaVentanillaParaBajar();
      const cabina = !laInstructoraLoExplica(this.tier.avisos);
      this.hud.senal.mostrar(
        "descenso",
        cabina
          ? "TOP OF DESCENT"
          : this.rotulo("vuelo.empezamosABajar", "palabra.aBajar"),
        null,
        { segundos: SE_QUEDA_EL_DESCENSO, prioridad: IMPORTANTE },
      );
      this.avisar("attention");
      if (!cabina)
        this.instructor.decir(
          t("vuelo.empezamosABajar"),
          "vuelo.empezamosABajar",
        );
    });

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
        comoDibujo(`papi${blancas}`),
        blancas >= 3
          ? this.rotulo("vuelo.papiAlto", "palabra.baja")
          : blancas <= 1
            ? this.sinMotor
              ? /*
                 * **Sin motor, bajo no se arregla subiendo**: tirar sin gas
                 * solo gasta velocidad y acorta el planeo. Lento, la nariz
                 * abajo; si no, las luces y nada más, que dicen lo que hay.
                 */
                this.bajoPorqueVaLento
                ? this.rotulo("vuelo.planeoLento", "palabra.baja")
                : ""
              : this.bajoPorqueVaLento
                ? // Bajo **por ir lento**: lo que falta es gas, no cabeceo.
                  this.rotulo("vuelo.lentoYBajo", "palabra.gas")
                : this.rotulo("vuelo.papiBajo", "palabra.subi")
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
        /*
         * El señalero cruzando los bastones solo si se le ve: quien se ha
         * pasado del puesto lo tiene a la espalda casi siempre, y una tarjeta
         * con su dibujo y sin él en ningún sitio es lo que no puede salir.
         * Entonces, el freno, que es lo que hay que hacer. Ver
         * `senaleroALaVista`.
         */
        this.senaleroALaVista() ? "senalero-alto" : "freno",
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
      // La tarjeta, y la voz de las de parar. Ver `tarjetaDelSenalero`.
      const parando = this.tarjetaDelSenalero(gesto);
      const cortar = gesto === "cortar";
      if (parando) {
        const cual = gesto === "alto" ? "vuelo.alto" : "vuelo.despacio";
        this.instructor.decir(t(cual), cual);
      }
      /*
       * **Y la voz de apagar, con la seña de cortar y no antes.** Es la frase
       * que había, «llegaste, apagá el motor», que antes sonaba al pararse a
       * cuarenta y cinco metros del sitio. Ver `PENDIENTE-VOCES-tierra.md`:
       * falta grabar la de solo apagar, y el «llegaste» para después.
       */
      if (cortar) this.instructor.decir(t("vuelo.enPuesto"), "vuelo.enPuesto");
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
      /*
       * **Y por el lado del circuito que se vuela, no siempre por la
       * izquierda.** El dibujo, la tarjeta y la voz decían «girá a la
       * izquierda» también donde el campo lo publica por la derecha: en La
       * Gomera, que vuela el de la 09 por el sur sobre el mar, la frustrada
       * que manda el AFIS mandaba girar hacia la isla. Los dos tramos que
       * nombran un lado llevan el suyo; la subida y la base no nombran ninguno.
       */
      const derecha = this.circuito?.forma.mano === "derecha";
      const conLado = derecha && (tramo === "cruzado" || tramo === "encola");
      const clave = `circuito.${tramo}${conLado ? ".derecha" : ""}` as TranslationKey;
      this.hud.senal.mostrar(
        comoDibujo(`circuito-${derecha ? "derecha-" : ""}${tramo}`),
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
       *
       * **Y la de la derecha, solo grabada.** Sin toma saldría por la voz del
       * navegador, que en muchas tabletas no suena: mejor callar ese tramo y
       * que lo digan el dibujo y la raya que decir el lado contrario. Se
       * graban el 6 de octubre; ver `PENDIENTE-VOCES-terreno.md`.
       */
      if (!conLado || this.instructor.vozDe(clave)) this.instructor.decir(t(clave), clave);
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
      /*
       * **Por la otra punta.** La torre enciende la roja del aire y dice por
       * qué en fraseología —«go around, runway in use zero three»—; la
       * tarjeta y la instructora lo cuentan con el porqué de verdad, que es el
       * viento: si por esa punta pasa del límite del avión, eso es lo que se
       * dice, porque es lo que lo hace peligroso. Con el tono de atención y no
       * el de peligro: irse al aire es la maniobra buena, y se va a celebrar.
       * Ver `flight/la-otra-cabecera.ts`.
       */
      if (porque === "otraCabecera") {
        if (this.hayTorreQueHable()) {
          this.luzDeTorre("roja", "alAire", "enUso");
          this.laTorreMandaEnLaLuz = true;
        }
        const dicho = this.avisoCon(
          motivo === "vientoDeCola"
            ? "vuelo.alAireVientoDeCola"
            : "vuelo.alAireOtraPunta",
          "palabra.alAire",
        );
        this.hud.senal.mostrar("frustrada", dicho.rotulo, null, {
          segundos: Infinity,
          prioridad: URGENTE,
        });
        this.avisar("attention");
        /*
         * En el peldaño de cabina la orden ya la dice la torre en inglés, y el
         * canto de cabina de «go around» es el de haberlo hecho bien. Y en
         * `mando`, que es una orden con su porqué: en `normal`, detrás de la
         * lámpara, el banco la vio caerse de la cola una vez de cada dos.
         */
        if (!canalesDe(this.tier.avisos).cabina)
          this.instructor.decir(dicho.texto, dicho.id, "mando");
        return;
      }
      if (porque === "pistaOcupada") {
        /*
         * Vaca o lámpara según el campo **al que se viene**, y la vaca en su
         * pista. Las dos cosas miraban el de casa: llegando a la granja desde
         * Asunción se encendía la lámpara de una torre que no existe, y
         * saliendo de la granja la vaca aparecía en la pista de allí, a ciento
         * cuarenta kilómetros.
         */
        const campo = this.elCampo();
        if (sinTorre(campo.escenario.aerodrome)) {
          // En la zona de toma: pasado el umbral de aterrizar, que es donde
          // estorba. Ver `umbral-desplazado.ts`.
          const [x, z] = this.enLaPista(
            hastaElUmbralDeToma(campo.pista) - 150,
            campo,
          );
          this.vaca.poner(
            x,
            this.terrain.sampleHeight(x, z),
            z,
            (campo.pista.heading * Math.PI) / 180,
          );
        } else {
          // Roja, pero la del aire: «ida al aire», no «mantenga fuera». Ver
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
      /*
       * **Y con la pista ocupada, el porqué va en `mando`**, que es una orden
       * con su porqué y va detrás de la de la torre, como el de la otra punta.
       * En `normal` se caía de la cola: en Gando, con un avión en la pista, la
       * torre dijo «motor y al aire» y la instructora no llegó a decir nada,
       * con los «muy rápido» de la subida delante. Ver `explicaLaOtraPunta`.
       */
      this.cantar(
        porque === "pistaOcupada" ? "go around, runway occupied" : "go around",
        porque === "pistaOcupada"
          ? dicho.texto
          : `${t(`motivo.${motivo}` as never)}. ${dicho.texto}`,
        conMotivo,
        porque === "pistaOcupada" ? "mando" : "normal",
      );
    });

    /*
     * **La pista vuelve a ser tuya.** Si sigues en final, la lámpara se
     * enciende en verde y se apaga sola en cuanto pasa el aviso: en el aire no
     * hay lámpara que mirar, y dejarla encendida diría algo que ya no es
     * verdad. Si te estás yendo, se apaga y ya: puedes volver.
     */
    this.hechos.on("pistaLibreOtraVez", ({ porque }) => {
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
      /*
       * **Y la verde en el aire solo si sigues en final.** La verde a un
       * avión en vuelo es «puede aterrizar», y se encendía también en pleno
       * ascenso de la frustrada, en cuanto el de delante dejaba la pista:
       * «autorizado para aterrizar» y «cleared to land» a quien se está
       * yendo. Una torre de verdad te deja volver por el circuito y te
       * autoriza en la final nueva —ver `pedirAterrizaje`—. En tierra, con la
       * orden desobedecida, tampoco: la verde en tierra es «autorizado a
       * despegar». Ver `alLevantarLaOrden`.
       */
      /*
       * **Y sin motor, en silencio.** Una orden que se levanta porque el avión
       * ya no puede subir no es «la torre te deja volver»: es que ya no hay
       * vuelta. La pista la da `autorizarSinMotor` al alinearse.
       */
      if (this.sinMotor) {
        this.laTorreMandaEnLaLuz = false;
        this.luzDeTorre(null);
        return;
      }
      const queDice = alLevantarLaOrden(
        porque,
        this.faseDeAhora,
        this.flight.state.onGround,
      );
      if (queDice !== "aterrizar") {
        this.laTorreMandaEnLaLuz = false;
        this.luzDeTorre(null);
      }
      if (queDice === "nada") return;
      /*
       * **Y sigues en final: es tu permiso para aterrizar, y suena como él.**
       *
       * Aquí se daba de otra manera —la tarjeta de «podés volver», el «cleared
       * to land» solo por radio y, abajo, la instructora diciendo que podías
       * volver a intentarlo— y el mismo permiso no puede sonar a dos cosas.
       * Ver `autorizarElAterrizaje`.
       */
      if (queDice === "aterrizar") {
        this.autorizarElAterrizaje();
        return;
      }
      /*
       * La torre no dice nada —no hay nada que autorizar todavía—, así que lo
       * cuenta la instructora, en los cuatro peldaños: la voz es el canal, y
       * la frase no es fraseología sino lo que quiere decir.
       */
      // Donde no hay torre que deje nada —sin nadie en la radio, o un AFIS
      // que informa—, se ve que está libre.
      const sinLampara =
        sinTorre(this.elCampo().escenario.aerodrome) || this.esAfisAqui();
      const libre = this.avisoCon(
        sinLampara ? "vuelo.puedeVolverSinTorre" : "vuelo.puedeVolver",
        "palabra.volve",
      );
      /*
       * Y sin lámpara, sin el dibujo de la lámpara: el de volver por el
       * circuito. Ver `guionAfis` en `flight/vuelo.ts`.
       */
      this.hud.senal.mostrar(sinLampara ? "circuito-encola" : "verde", libre.rotulo, null, {
        segundos: SE_QUEDA_EL_ARO,
        prioridad: IMPORTANTE,
      });
      this.avisar("success");
      this.instructor.decir(libre.texto, libre.id);
    });
  }

  /**
   * **Tu permiso para aterrizar, por el mismo camino que el de despegar.**
   *
   * Iba solo por radio y solo en inglés —«cleared to land»—, sin lámpara, sin
   * tarjeta y sin una palabra en castellano, y en Guyrami ni eso: la
   * fraseología es de Taguató para arriba. Se oyó jugando: «no veo que la
   * torre en ningún momento comunique conmigo para darme permiso para la
   * toma». A los cuatro años una frase en inglés no es un permiso, y quien
   * juega en silencio no se enteraba de nada.
   *
   * Ahora es **la verde en vuelo**, que en las señales de luz de verdad
   * quiere decir justo eso: la lámpara, la tarjeta verde, «autorizado para
   * aterrizar» con tu matrícula en los cuatro peldaños y, de Taguató para
   * arriba, el «cleared to land» con el viento delante. Lo dice la torre y
   * nadie más: la instructora no lo repite, que un suceso es una voz. Ver
   * `luzDeTorre`.
   *
   * La lámpara se apaga sola cuando pasa, porque en el aire no hay lámpara
   * que mirar; si mientras tanto llega una orden de irse, la luz es suya.
   *
   * `cabecera` es la que se nombra si no es la de uso: sin motor se aterriza
   * por la que se tenga delante. Ver `autorizarSinMotor`.
   */
  private autorizarElAterrizaje(cabecera: string | null = null): void {
    /*
     * **Y en una pista sin torre no autoriza nadie**: se ve que está libre, y
     * lo dice la instructora. Encendía la lámpara de una torre que no existe
     * y la tarjeta decía «la torre te deja aterrizar» en la pista de casa.
     */
    if (sinTorre(this.elCampo().escenario.aerodrome)) {
      const libre = this.avisoCon(
        "vuelo.puedeAterrizarSinTorre",
        "palabra.aterriza",
      );
      // El dibujo de la toma, no el de una lámpara que aquí no hay.
      this.hud.senal.mostrar("toma", libre.rotulo, null, {
        segundos: SE_QUEDA_EL_PERMISO,
        prioridad: IMPORTANTE,
      });
      this.avisar("success");
      this.instructor.decir(libre.texto, libre.id);
      return;
    }
    this.cabeceraParaLaTorre = cabecera;
    this.laTorreMandaEnLaLuz = true;
    /*
     * **Y es permiso cuando suena, no cuando se pide.** La lámpara se pone
     * por dentro, pero no se pinta ni sale su tarjeta hasta que su frase
     * empieza a sonar: la luz y la voz son el mismo suceso. Ver
     * `permisoDeAterrizar`.
     */
    this.permisoDeAterrizar = "esperando-su-voz";
    const este = ++this.permisosDados;
    const hablo = this.luzDeTorre("verde", "esperar", "ocupada", (que) =>
      this.alSonarElPermiso(este, que, cabecera),
    );
    this.cabeceraParaLaTorre = null;
    // Si la luz ya estaba verde no se dice otra vez: lo de antes vale.
    if (!hablo) this.alSonarElPermiso(este, "no-suena", cabecera);
  }

  /**
   * **Lo que pasa con la voz de tu permiso**: la lámpara y la tarjeta salen
   * cuando empieza —o en el acto si no puede sonar—, y es permiso oído
   * cuando acaba. Si algo urgente lo corta a medias y se sigue en final sin
   * orden de irse, se repite: «I say again». Ver `permisoDeAterrizar`.
   */
  private alSonarElPermiso(
    este: number,
    que: Parameters<AlSonar>[0],
    cabecera: string | null,
  ): void {
    if (este !== this.permisosDados || this.permisoDeAterrizar === null) return;
    switch (que) {
      case "empieza":
        this.permisoDeAterrizar = "sonando";
        this.mostrarElPermiso(cabecera);
        return;
      case "no-suena":
        this.permisoDeAterrizar = "oido";
        this.mostrarElPermiso(cabecera);
        return;
      case "acaba":
        this.permisoDeAterrizar = "oido";
        return;
      case "cortada":
        if (
          this.faseDeAhora === "final" &&
          this.laTorreMandaEnLaLuz &&
          !this.laAproximacion.mandanFrustrar
        ) {
          // Se repite la frase, con la lámpara ya puesta.
          this.ultimaLuzDeTorre = null;
          this.cabeceraParaLaTorre = cabecera;
          this.luzDeTorre("verde", "esperar", "ocupada", (q) =>
            this.alSonarElPermiso(este, q, cabecera),
          );
          this.cabeceraParaLaTorre = null;
        } else this.permisoDeAterrizar = null;
        return;
      case "se-cae":
        // La retiró quien sabía que ya no valía: ver `retirarElPermisoSinOir`.
        if (this.permisoDeAterrizar === "esperando-su-voz") this.retirarElPermisoSinOir();
        this.permisoDeAterrizar = null;
        return;
    }
  }

  /** La lámpara verde pintada, su tarjeta y su sonido: el permiso, a la vista. */
  private mostrarElPermiso(cabecera: string | null): void {
    if (!this.laTorreMandaEnLaLuz) return;
    // La luz ya es verde por dentro: esto la pinta, con su pista. Ver `luzDeTorre`.
    this.cabeceraParaLaTorre = cabecera;
    this.luzDeTorre("verde");
    this.cabeceraParaLaTorre = null;
    this.hud.senal.mostrar(
      /*
       * Y en un AFIS no te deja nadie: te dicen que está libre y bajás vos.
       * Por eso tampoco va el dibujo de la lámpara, que allí no hay, sino el
       * de la toma. Ver `guionAfis` en `flight/vuelo.ts`.
       */
      this.esAfisAqui() ? "toma" : "verde",
      this.rotulo(
        this.esAfisAqui() ? "vuelo.puedeAterrizarAfis" : "vuelo.puedeAterrizar",
        "palabra.aterriza",
      ),
      null,
      { segundos: SE_QUEDA_EL_PERMISO, prioridad: IMPORTANTE },
    );
    this.avisar("success");
    const este = this.permisosDados;
    this.agenda.luego(SE_QUEDA_EL_PERMISO, () => {
      if (this.laAproximacion.mandanFrustrar || este !== this.permisosDados) return;
      this.luzDeTorre(null);
      this.laTorreMandaEnLaLuz = false;
    });
  }

  /**
   * Si tu permiso para aterrizar está dado y **todavía no ha empezado a
   * sonar**. Lo mira el turno a la altura de decisión: sin permiso oído no se
   * aterriza. Ver `permisoSinOir` en `flight/turno-de-pista.ts`.
   */
  private get permisoSinOir(): boolean {
    return this.permisoDeAterrizar === "esperando-su-voz";
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
  /**
   * Una frase de la torre **dirigida a vos**, en fraseología.
   *
   * Va en `mando` por omisión y no en `normal`: una instrucción de control
   * manda sobre cualquier comentario, y al final de un vuelo hay tres
   * comentarios por segundo. Lo que la torre le dice a **otro** avión no pasa
   * por aquí — eso es charla de la frecuencia y va en `baja`.
   */
  private porRadio(
    dice: string,
    urgencia: Urgencia = "mando",
    destino?: DestinoEnRadio,
    /**
     * Si se escribe también en la tira de la radio. La autorización de la
     * ruta ya lo hacía; la pista en uso también, que es un número que se lee.
     */
    conTira = false,
  ): string | null {
    const base = claveDeTorre(dice);
    if (!base) return null;
    return this.porRadioClave(base, urgencia, destino, conTira);
  }

  /**
   * Lo mismo, **por la clave**: lo que dice un AFIS no se pide por su texto,
   * porque sus dos «runway free» se dicen igual y son dos claves. Ver
   * `DICE_UN_AFIS`.
   */
  private porRadioClave(
    base: string,
    urgencia: Urgencia = "mando",
    destino?: DestinoEnRadio,
    conTira = false,
  ): string | null {
    const montada = this.deTorre(base, this.miIndicativo, destino);
    if (!montada) return null;
    this.torre.decir(montada.texto, montada.clave, urgencia, montada.relleno);
    if ((destino || conTira) && this.tier.instruments !== "none")
      this.hud.radio(montada.texto, undefined, true);
    // Con qué clave espera turno en la boca. Ver `turnoDe`.
    return turnoDe(montada.clave, montada.relleno) ?? null;
  }

  /** Si en el campo de ahora contesta un AFIS. Ver `Aerodrome.afis`. */
  private esAfisAqui(): boolean {
    return esAfis(this.elCampo().escenario.aerodrome);
  }

  /**
   * **Lo que le quita la pista a otro, dicho por la torre**: el que despegue o
   * el que se vaya al aire antes de dártela a ti. Lo decide el turno —ver
   * `alSerTuya` en `flight/turno-de-pista.ts`—; aquí se monta con su pista y
   * su voz, y se devuelve con qué clave espera turno en la boca.
   *
   * Va en `mando` y no en `baja` como el resto de la frecuencia porque no es
   * charla: es la mitad de tu autorización. Entre iguales la boca dice
   * primero lo primero que llegó, y esto llega antes.
   */
  private decirleAOtro(dice: Transmision): string | null {
    const montada = this.deTorre(dice.clave, dice.de);
    if (!montada) return null;
    this.nombrar(dice.clave, dice.de.matricula);
    this.torre.decir(montada.texto, montada.clave, "mando", montada.relleno);
    if (this.tier.instruments !== "none") this.hud.radio(montada.texto, undefined, false);
    return turnoDe(montada.clave, montada.relleno) ?? null;
  }

  /** Si la pista es tuya ahora mismo: su fase, y que no seas el número dos. */
  get laPistaEsTuyaParaBanco(): boolean {
    return this.turno.laPistaEsTuya(this.faseDeAhora);
  }

  /** Quién ocupa la pista, para el banco. Ver `ocupanLaPista`. */
  get ocupanLaPistaParaBanco(): readonly { matricula: string; orden: string }[] {
    return this.radio.ocupanLaPista;
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
    pedida: string,
    quien: Indicativo,
    destino?: DestinoEnRadio,
  ): { clave: string; relleno: Record<string, string>; texto: string } | null {
    /*
     * **Y donde contesta un AFIS, lo que diría un AFIS.** La frecuencia pide
     * órdenes de torre —es como lleva la cuenta de quién tiene la pista— y un
     * AFIS no da órdenes: informa. Se traduce aquí, al decirlo, que es el
     * único sitio por el que pasa todo lo que dice la radio del campo, a vos
     * y a los demás. Ver `EN_UN_AFIS`.
     */
    let base = pedida;
    if (this.esAfisAqui() && !(pedida in DICE_UN_AFIS)) {
      const suya = enUnAfis(pedida);
      if (!suya) return null;
      base = suya;
    }
    const orden = DICE_LA_TORRE[base];
    if (!orden) return null;
    // El límite de la autorización va detrás de la orden, como se dice.
    const dice = destino ? `${orden} ${destino.dicho}` : orden;
    const relleno: Record<string, string> = rellenoDe(quien);
    if (destino) relleno.destino = destino.pieza;
    // Y con la voz de este campo, que es lo que hacía que una torre sonara a
    // dos personas. Ver `comoSeDiceAqui` en `i18n/habla.ts`.
    /*
     * **Y el campo es el de ahora, no el de casa.** La pista y la voz salían
     * del escenario de salida, así que llegando a Los Rodeos por la 12 la
     * torre decía «runway zero three left, cleared to land» —la 03L de Gando,
     * con un «left» en un campo de una sola pista—, y llegando a Yvytu Rape
     * nombraba la 02 de Asunción. El número de pista es lo único escrito en
     * el suelo de un aeropuerto: tiene que ser el que se tiene delante.
     */
    const campo = this.elCampo();
    let clave = comoSeDiceAqui(base, hablaDe(campo.escenario.aerodrome?.id));
    /*
     * La de uso, salvo que alguien sin motor haya elegido la otra: entonces la
     * que se tiene delante. Ver `autorizarSinMotor`.
     */
    const pista = NOMBRA_LA_PISTA.has(base)
      ? pistaEnPiezas(
          this.cabeceraParaLaTorre ?? cabeceraEnUso(campo.escenario),
        )
      : null;
    /*
     * **Y el viento, al dar la pista para despegar o aterrizar.**
     *
     * Es lo último que hace falta saber antes de hacerlo, y toda torre lo da
     * ahí: «wind zero five zero degrees, one two knots, runway zero five,
     * cleared to land». Esta no lo daba nunca. El del campo en el que se está,
     * que es el que empuja al avión, el que señala la manga y el que eligió la
     * cabecera en uso: los tres salen del mismo parte, y si la torre dijera
     * otro, una de las cuatro cosas mentiría. En magnéticos, como las pistas.
     * Ver `vientoEnPiezas`.
     */
    /*
     * **Y a vos, no a los demás de la frecuencia.** Una torre se lo da a
     * todos, pero aquí los demás son ambiente, y con el viento cada una de sus
     * autorizaciones duraba cuatro segundos más: la tuya esperaba detrás y
     * caducaba sin oírse —medido en Los Rodeos, «clearedTakeoff: caducó
     * esperando»—. Se simplifica lo que se oye de fondo, no lo que te dicen.
     */
    const conViento =
      (base === "torre.clearedTakeoff" ||
        base === "torre.clearedLand" ||
        // Y lo que te dice un AFIS para salir o para bajar: el viento es la
        // mitad de lo que informa. Ver `DICE_UN_AFIS`.
        base === "torre.afisFree" ||
        base === "torre.afisFreeTakeoff" ||
        base === "torre.afisNoTraffic") &&
      quien.matricula === this.miIndicativo.matricula;
    const viento = conViento ? this.vientoDeLaTorre(campo) : null;
    /*
     * Y en el orden en que se dice: indicativo, viento y pista. El turno de
     * la boca junta el relleno en ese orden —ver `turnoDe`—, y lo que mira
     * qué pista se nombró lee las dos últimas cifras.
     */
    if (viento) relleno.viento = viento.relleno;
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
    const antes = viento ? `${quien.dicho}, ${viento.dicho}` : quien.dicho;
    // Y la pista en uso se nombra detrás, que es como se informa. Ver
    // `PISTA_DETRAS`.
    // Y las de un AFIS, con la pista donde la pone quien informa: «runway
    // zero two free», «runway in use zero two, no reported traffic».
    const texto = !pista
      ? `${antes}, ${dice}`
      : PISTA_DETRAS.has(base)
        ? `${antes}, ${dice} ${pista.dicho}`
        : PISTA_EN_MEDIO.has(base)
          ? `${antes}, runway ${pista.dicho} ${dice}`
          : PISTA_EN_USO_DELANTE.has(base)
            ? `${antes}, runway in use ${pista.dicho}, ${dice}`
            : `${antes}, runway ${pista.dicho}, ${dice}`;
    return { clave, relleno, texto };
  }

  /**
   * El viento que da la torre de ese campo: el suyo, en magnéticos. Ver
   * `deTorre` y `vientoEnPiezas`.
   */
  private vientoDeLaTorre(
    campo: CampoEnElMundo,
  ): { relleno: string; dicho: string } {
    const tiempo = campo.escenario.meteo ?? TIEMPO_DE_CASA;
    return vientoEnPiezas(
      tiempo.vientoDe,
      tiempo.vientoKt,
      campo.escenario.magneticVariation ?? 0,
    );
  }

  /** Lo mismo, para el banco: el viento que diría la torre de aquí. */
  get vientoDeLaTorreParaBanco(): { relleno: string; dicho: string } {
    return this.vientoDeLaTorre(this.elCampo());
  }

  /**
   * **La torre dice a dónde se va**, una vez por tramo y antes de rodar.
   *
   * En un vuelo a otro aeródromo lo primero que da el control es la
   * autorización, y su primer elemento es el límite: «cleared to Tenerife
   * Norte». La torre del juego no lo decía nunca; se elegía el destino en el
   * hangar y nadie lo nombraba hasta que la comandante daba la bienvenida al
   * llegar.
   *
   * Se dice al arrancar o al empezar a rodar, lo que llegue antes: es cuando
   * se recibe de verdad, con el avión todavía en su puesto y antes de pedir
   * rodaje. Y como la lámpara, en dos capas:
   *
   * - **En castellano, en los cuatro peldaños**: «autorizado a
   *   Encarnación», que es como lo dice una torre en castellano. Lo que no se
   *   entienda a los cuatro años lo cuenta la instructora, no la torre.
   * - **Y detrás, en fraseología, de Taguató para arriba** y solo en los
   *   aviones de línea. «Cleared to» es la autorización de un plan
   *   instrumental, y una avioneta que va de isla en isla con la vista no la
   *   recibe así: ponérsela sería enseñar un procedimiento que no le toca.
   *
   * En una vuelta al campo no se dice nada, que es lo que hace una torre con
   * un vuelo local: no hay límite que nombrar. Ni en un campo sin torre.
   */
  private autorizarLaRuta(): void {
    const ruta = `${this.salidaId}>${this.destinoId}`;
    if (ruta === this.rutaAutorizada) return;
    this.rutaAutorizada = ruta;
    if (this.vecinos.length === 0 || this.destinoId === this.salidaId) return;
    /*
     * Ni en un AFIS: no autoriza, y «autorizado a» es una autorización. La
     * de un vuelo instrumental la retransmite de un control, y eso aquí no se
     * vuela. Ver `Aerodrome.afis`.
     */
    const deSalida = this.campoPorId(this.salidaId)?.escenario.aerodrome;
    if (sinTorre(deSalida) || esAfis(deSalida)) return;
    const destino = destinoEnRadio(this.destinoId);
    if (!destino) return;
    const yo = this.miIndicativo;
    // La torre que autoriza es la del campo del que se sale.
    const clave = comoSeDiceAqui(
      "torre.destino",
      hablaDe(this.campoPorId(this.salidaId)?.escenario.aerodrome?.id),
    ) as TranslationKey;
    const texto = t(clave, { indicativo: yo.dicho, destino: destino.dicho });
    this.torre.decir(texto, clave, "mando", {
      ...rellenoDe(yo),
      destino: destino.pieza,
    });
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    if (conCifras && conPasaje(this.aircraft.mass))
      this.porRadio("cleared to", "mando", destino);
    else if (this.tier.instruments !== "none") this.hud.radio(texto, undefined, true);
  }

  /** Qué tramo ya tiene su autorización dicha. Ver `autorizarLaRuta`. */
  private rutaAutorizada = "";

  /**
   * **El corredor de los aviones de ruta, el de este tramo.**
   *
   * Se fijaba al cargar entre casa y el primer destino de la lista, así que
   * volando de Gran Canaria a Lanzarote todo el tráfico iba por el corredor
   * de Los Rodeos y no se cruzaba a nadie: se perdía la regla semicircular
   * justo en la ruta elegida. Ahora va del campo de salida del tramo al de
   * destino —o al del desvío—, y cambia cuando cambian ellos.
   *
   * En una vuelta al campo no hay ruta propia: se ve el corredor hacia el
   * campo más cercano, que es el que más se vuela desde ahí.
   */
  private ponerElCorredor(): void {
    if (!this.avionesDeRuta) return;
    const meta = this.desvioId ?? this.destinoId;
    const clave = `${this.salidaId}>${meta}`;
    if (clave === this.corredorPuesto) return;
    this.corredorPuesto = clave;
    const campos = this.camposDelVuelo();
    const de = this.campoPorId(this.salidaId) ?? campos[0]!;
    let a = this.campoPorId(meta);
    if (!a || a.id === de.id) {
      let corto = Infinity;
      for (const c of campos) {
        if (c.id === de.id) continue;
        const d = Math.hypot(c.x - de.x, c.z - de.z);
        if (d < corto) {
          corto = d;
          a = c;
        }
      }
    }
    if (!a || a.id === de.id) return;
    this.avionesDeRuta.ponerCorredor({ x: de.x, z: de.z }, { x: a.x, z: a.z });
  }

  /** Qué tramo lleva puesto el corredor. Ver `ponerElCorredor`. */
  private corredorPuesto = "";

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
    /**
     * Y por qué al aire, para la fraseología: la pista ocupada, o que se viene
     * por la cabecera que no está en uso. Ver `flight/la-otra-cabecera.ts`.
     */
    alAirePor: "ocupada" | "enUso" = "ocupada",
    /**
     * Y quien necesita saber si sonó la frase de la lámpara: tu permiso para
     * aterrizar. Ver `alSonarElPermiso`.
     */
    alSonar?: AlSonar,
  ): boolean {
    /*
     * **Y la verde no dice lo mismo en el aire que en tierra.** En las señales
     * de luz de verdad, la verde fija a un avión en tierra es «puede
     * despegar» y a uno en vuelo, «puede aterrizar». Aquí la verde en el aire
     * —la que se enciende al levantar una orden de frustrar— decía «podés
     * entrar» y, por radio, **«cleared for take-off»** con el avión en final.
     */
    const enElAire = !this.flight.state.onGround;
    /*
     * **Y un AFIS no tiene lámpara.** Lo que tiene es la radio: informa de la
     * pista y del tráfico, y quien vuela decide. La luz se sigue llevando por
     * dentro —es la cuenta de cuándo la pista está libre para vos—, pero no
     * se pinta, y lo que se dice es lo que diría quien informa. Ver
     * `Aerodrome.afis`.
     */
    const afis = this.esAfisAqui();
    /*
     * **Y la verde nombra la pista**, en castellano: «pista dos cero,
     * autorizado para aterrizar», y lo mismo al despegar. La torre en casa
     * autorizaba sin decir por dónde, y la fraseología de verdad lo dice: es
     * el número pintado delante del morro. La de uso, o la que haya elegido
     * quien viene sin motor. Ver `pistaEnCastellano`.
     *
     * **Y la roja del punto de espera, también**, pero detrás: «mantenga
     * fuera de pista dos cero». La verde la lleva delante de la orden y la
     * roja detrás, como en la fraseología; por eso la verde va pegada a la
     * matrícula y la roja se pone al final de la frase. Ni la una ni la otra
     * son un hueco del diccionario: cada idioma la dice a su manera, y el
     * guaraní no la dice. Ver `torre.roja` en `i18n/es-PY.ts`.
     */
    const verde = luz === "verde";
    const pistaEs =
      !afis && (verde || (luz === "roja" && rojaDice === "esperar"))
        ? pistaEnCastellano(
            this.cabeceraParaLaTorre ?? cabeceraEnUso(this.elCampo().escenario),
          )
        : null;
    /*
     * **Y la verde de tu permiso no se pinta hasta que suena.** Ver
     * `permisoDeAterrizar`.
     */
    const esperaSuVoz =
      verde && enElAire && this.permisoDeAterrizar === "esperando-su-voz";
    this.hud.setLuzDeTorre(
      afis || esperaSuVoz ? null : luz,
      rojaDice,
      this.conLaPista(this.miIndicativo.dicho, verde ? pistaEs : null, "escrito"),
      enElAire,
      verde ? "" : this.laPista(pistaEs, "escrito"),
    );
    const cual = luz === null ? null : `${luz}:${rojaDice}:${enElAire}`;
    if (cual === this.ultimaLuzDeTorre) {
      if (luz === "roja" && rojaDice === "esperar")
        this.explicarSiCambiaElPorque();
      return false;
    }
    this.ultimaLuzDeTorre = cual;
    if (!luz) return false;
    /*
     * **Y lo que decía la luz de antes, si todavía espera turno, se retira.**
     *
     * Al llegar al punto de espera la lámpara se pone roja y un momento
     * después verde, y cada cambio son dos frases —la de la lámpara y su
     * fraseología—. El «hold short» de la roja seguía en la cola cuando la luz
     * ya estaba verde: se decía tarde y al revés de lo que pasaba, y empujaba
     * detrás el «cleared for take-off», que caducaba esperando. En Gran
     * Canaria, con Taguató, la autorización propia se caía en cada vuelo y la
     * comprobación de la fraseología pasaba solo si la torre autorizaba a
     * algún avión del ambiente.
     *
     * Apagarse no retira nada: la luz se apaga al usar el permiso, y el
     * permiso sigue siendo verdad. Ver `Boca.retirar`.
     *
     * Y solo lo que va a tu matrícula: en el mismo fotograma en que la luz se
     * pone verde, la torre le acaba de quitar la pista a quien la tuviera, y
     * eso no es de tu lámpara. Ver `alSerTuya` en `flight/turno-de-pista.ts`.
     */
    this.turno.alCambiarLaLuz(this.misLetrasEnLaBoca);
    /*
     * **Y la dice como se dice aquí.** La torre no habla el castellano del
     * juego: habla el de su campo, y en Canarias eso quiere decir sin vosear y
     * con otra voz. La clave cambia con el habla porque el pack de voz busca
     * por clave — ver `i18n/habla.ts`.
     */
    /*
     * En un AFIS, lo mismo dicho como información: la pista libre para salir
     * o para bajar, ocupada para quien viene, y en el punto de espera el
     * tráfico que se conoce —o que no se conoce ninguno—. Quien viene por la
     * otra punta no oye nada en castellano: se lo cuenta la instructora, y la
     * pista en uso va por radio.
     */
    const conocido =
      afis && luz === "roja" && rojaDice === "esperar"
        ? this.turno.traficoConocidoDe
        : null;
    const trafico = conocido?.porque ?? null;
    const base: string | null = afis
      ? luz === "verde"
        ? enElAire
          ? "torre.afisLibreEnFinal"
          : "torre.afisLibre"
        : rojaDice === "alAire"
          ? alAirePor === "enUso"
            ? null
            : "torre.afisOcupada"
          : trafico === "aterriza"
            ? "torre.afisTraficoAterriza"
            : trafico === "despega"
              ? "torre.afisTraficoDespega"
              : "torre.afisSinTrafico"
      : luz === "verde"
        ? enElAire
          ? "torre.aterrizar"
          : "torre.verde"
        : rojaDice === "alAire"
          ? "torre.alAire"
          : "torre.roja";
    const clave = base
      ? (comoSeDiceAqui(
          base,
          hablaDe(this.elCampo().escenario.aerodrome?.id),
        ) as TranslationKey)
      : null;
    /*
     * La orden de irse al aire **corta lo que haya**: es la única de las tres
     * que no puede esperar a que termine una frase. Las otras dos son normales
     * y se ponen en la cola de la boca como todo lo demás. Ver `audio/boca.ts`.
     */
    /*
     * Y las otras dos van en `mando`, que es el escalón de la torre: no
     * cortan a nadie, pero tampoco se dejan echar de la cola por un «más
     * despacio». Medido en El Hierro antes de tener ese escalón: la torre
     * abrió la boca cinco veces en un vuelo y se oyó una. Ver `Urgencia`.
     */
    const urgencia =
      rojaDice === "alAire" && luz === "roja" ? "urgente" : "mando";
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
    /*
     * Con la pista, su lado en la clave —en las paralelas— y sus cifras en el
     * relleno, como la fraseología en inglés. Ver `deTorre`.
     */
    if (clave)
      this.torre.decir(
        [
          t(clave, {
            indicativo: this.conLaPista(yo.dicho, verde ? pistaEs : null, "dicho"),
          }),
          verde ? "" : this.laPista(pistaEs, "dicho"),
        ]
          .filter(Boolean)
          .join(" "),
        `${clave}${pistaEs?.sufijo ?? ""}`,
        urgencia,
        { ...rellenoDe(yo), ...(pistaEs?.relleno ?? {}) },
        alSonar,
      );
    /*
     * **Y si se espera por alguien, por quién.** La roja podía durar tres
     * minutos con un «esperá acá» y nada más, que a los cuatro años es un
     * juego colgado. Se mira al encenderse: mientras está roja nadie más
     * puede quedarse la pista —ver `Momento.esperandoLaPista`—, así que el
     * porqué no cambia hasta la verde. Ver `porQueEsperas`.
     */
    const porQueDe =
      luz === "roja" && rojaDice === "esperar"
        ? this.turno.porQueEsperasDe
        : null;
    const porQue = porQueDe?.porque ?? null;
    // Luz nueva, porqués nuevos: lo que se explicó en la roja anterior no vale.
    this.porQuesExplicados.clear();
    this.vecesDelPorque.clear();
    this.porQuePendiente = null;
    if (porQueDe) this.porQuesExplicados.add(esperaPorQuien(porQueDe));
    // Y el tráfico que da un AFIS ya va dicho en su frase: no se repite.
    if (conocido) this.porQuesExplicados.add(esperaPorQuien(conocido));
    // El AFIS, que nombra el tráfico en la frase de su lámpara apagada.
    if (clave && conocido) this.nombrar(clave, conocido.matricula);
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    /*
     * En los peldaños de abajo lo cuenta la instructora, en una línea y con
     * calma; en los de arriba lo dice la torre en la fraseología, más abajo.
     */
    if (porQueDe && !conCifras) {
      const explica = EXPLICA_LA_ESPERA[porQueDe.porque];
      this.instructor.decir(t(explica), explica);
      this.esperarQueSeOiga(explica, porQueDe);
    }

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
        ? enElAire
          ? "cleared to land"
          : "cleared for take-off"
        : rojaDice === "alAire"
          ? alAirePor === "enUso"
            ? "go around, runway in use"
            : "go around, runway occupied"
          : porQue
            ? HOLD_SHORT_POR[porQue]
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
    /*
     * Y en un AFIS, su fraseología: «runway zero two free», «runway zero two
     * occupied», «runway in use zero two, no reported traffic» o con el
     * tráfico que haya. Ver `DICE_UN_AFIS`.
     */
    if (conCifras && afis) {
      const dicha = this.porRadioClave(
        luz === "verde"
          ? enElAire
            ? "torre.afisFree"
            : "torre.afisFreeTakeoff"
          : rojaDice === "alAire"
            ? alAirePor === "enUso"
              ? "torre.pistaEnUso"
              : "torre.afisOccupied"
            : trafico === "aterriza"
              ? "torre.afisInUseLanding"
              : trafico === "despega"
                ? "torre.afisInUseDeparting"
                : "torre.afisNoTraffic",
        urgencia,
      );
      if (dicha && conocido) this.esperarQueSeOiga(dicha, conocido);
    } else if (conCifras) {
      const dicha = this.porRadio(enRadio, urgencia);
      if (dicha && porQueDe) this.esperarQueSeOiga(dicha, porQueDe);
    }
    return !!clave;
  }

  /**
   * **El porqué de la espera, apuntado para comprobar que se oye**, y por
   * quién. La boca puede tirar una frase que espera turno demasiado —en el
   * punto de espera hablan casi a la vez la lámpara, su fraseología, la
   * instructora y el que viene a aterrizar—, y entonces la espera se quedaba
   * sin porqué: «ocupaban la pista a los 97 s: EC-FLY otro.final · no se dijo
   * por qué», en el banco de Los Rodeos. Ver `vigilarQueSeOyoElPorque`.
   */
  private esperarQueSeOiga(clave: string, por: EsperaPor, veces = 1): void {
    this.porQuePendiente = {
      clave,
      desde: BOCA.cuantasHabladas,
      quien: esperaPorQuien(por),
      veces,
    };
    this.nombrar(clave, por.matricula);
  }

  /**
   * Si el porqué pedido ya no espera turno y no llegó a oírse, se olvida que
   * se dijo para que `explicarSiCambiaElPorque` lo pida otra vez, si sigue
   * siendo verdad. Lo que lo vuelve a pedir es que **no se oyó**, no que pase
   * un rato; y como mucho tres veces, que una boca que tira siempre lo mismo
   * no se arregla insistiendo.
   */
  private vigilarQueSeOyoElPorque(): void {
    const p = this.porQuePendiente;
    if (!p || BOCA.espera(p.clave)) return;
    this.porQuePendiente = null;
    const nuevas = BOCA.cuantasHabladas - p.desde;
    const oida =
      nuevas > 0 &&
      BOCA.habladas.slice(-nuevas).some((h) => h.clave === p.clave);
    if (oida || p.veces >= 3) return;
    this.porQuesExplicados.delete(p.quien);
    this.vecesDelPorque.set(p.quien, p.veces);
  }

  /**
   * **Apunta que la radio ha nombrado a un tráfico**: con qué clave y a cuál.
   * Ver `nombrados`.
   */
  private nombrar(clave: string, quien: string | null): void {
    this.nombrados.push({ t: this.relojDelJuego, clave, quien });
    this.nombradosTotal += 1;
    if (this.nombrados.length > 400) this.nombrados.shift();
  }

  /** Lo que la radio ha nombrado, para el banco. Ver `nombrados`. */
  get nombradosParaBanco(): {
    lista: readonly { t: number; clave: string; quien: string | null }[];
    total: number;
  } {
    return { lista: [...this.nombrados], total: this.nombradosTotal };
  }

  /**
   * **La matrícula con la pista detrás**, para la verde que la nombra: «Zulu
   * Papa Alfa, pista dos cero» en la voz, «pista 20» en la tarjeta, que es
   * como está pintada. En inglés, «runway»; en guaraní, la matrícula sola, que
   * esa frase la dice a su manera. Ver `torre.verde` en `i18n/es-PY.ts`.
   */
  private conLaPista(
    indicativo: string,
    pista: ReturnType<typeof pistaEnCastellano>,
    como: "dicho" | "escrito",
  ): string {
    if (!pista) return indicativo;
    const idioma = getLocale();
    if (idioma === "gug") return indicativo;
    const suya = this.laPista(pista, como);
    return idioma === "en" ? `${indicativo}, runway ${suya}` : `${indicativo}, pista ${suya}`;
  }

  /**
   * El número de la pista en el idioma del juego: como está pintado en la
   * tarjeta —«20»— y con las cifras de cada idioma en la voz —«dos cero»,
   * «two zero»—. Vacío si no hay pista, y en guaraní, que sus frases de la
   * lámpara no la nombran. Ver `conLaPista`.
   */
  private laPista(
    pista: ReturnType<typeof pistaEnCastellano>,
    como: "dicho" | "escrito",
  ): string {
    if (!pista || getLocale() === "gug") return "";
    if (como === "escrito") return pista.escrito;
    return getLocale() === "en"
      ? (pistaEnPiezas(pista.escrito)?.dicho ?? pista.escrito)
      : pista.dicho;
  }

  /**
   * **Y si el porqué llega con la roja ya encendida, se dice entonces.**
   *
   * La roja se enciende siempre al llegar a la doble raya —la torre te
   * mira antes de dejarte entrar— y el porqué se miraba solo en ese momento,
   * con esta cuenta: «mientras está roja nadie más puede quedarse la pista».
   * Dejó de ser verdad cuando el permiso de aterrizar pasó a darse en final:
   * esperando en la roja, el que viene por la base canta su final y la ocupa.
   * Medido en Pettirossi con el JAZ 90: roja al llegar con la pista libre, el
   * otro canta final unos segundos después, y cuarenta y dos segundos de roja
   * sin que nadie dijera por quién.
   *
   * Se dice una vez por porqué, y solo cuando cambia: es un suceso, no un
   * reloj.
   */
  private explicarSiCambiaElPorque(): void {
    this.vigilarQueSeOyoElPorque();
    // Mientras el pedido espera turno no se pide otro: el que espera se oirá.
    if (this.porQuePendiente) return;
    const de = this.turno.porQueEsperasDe;
    if (!de) return;
    const quien = esperaPorQuien(de);
    if (this.porQuesExplicados.has(quien)) return;
    this.porQuesExplicados.add(quien);
    const veces = (this.vecesDelPorque.get(quien) ?? 0) + 1;
    const porQue = de.porque;
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    // Un AFIS no te para: te dice qué tráfico hay. Ver `luzDeTorre`.
    let dicha: string | null;
    if (conCifras && this.esAfisAqui())
      dicha = this.porRadioClave(
        porQue === "aterriza"
          ? "torre.afisInUseLanding"
          : "torre.afisInUseDeparting",
      );
    else if (conCifras) dicha = this.porRadio(HOLD_SHORT_POR[porQue]);
    else {
      const explica = EXPLICA_LA_ESPERA[porQue];
      this.instructor.decir(t(explica), explica);
      dicha = explica;
    }
    if (dicha) this.esperarQueSeOiga(dicha, de, veces);
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
   *
   * En el campo del que sale el vuelo, que no tiene por qué ser el de casa:
   * ver `resetFlight`. La lección de aterrizar es siempre en casa.
   */
  private startPosition(campo: CampoEnElMundo = this.laCasa): Vector3 {
    const { runway } = this.scenario;

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
      // Desde el umbral de aterrizar: con el umbral desplazado, la final
      // acaba pista adentro. Ver `umbral-desplazado.ts`.
      const [x, z] = puntoDePista(
        runway,
        hastaElUmbralDeToma(runway) + APROXIMACION,
      );
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
        // Sobre el asfalto del puesto, no sobre el terreno de debajo.
        this.terrain.sampleSurface(puesto[0], puesto[1]) +
          this.aircraft.gearHeight,
        puesto[1],
      );
    }
    // El arranque de un aeródromo real sale de su umbral medido, sesenta
    // metros pista adentro. Lo de abajo es para las pistas inventadas.
    const pista = campo.aerodromo?.runways[0];
    const p = pista ? arranqueEnPista(pista, campo.pista.heading) : null;
    const [x, z] = p ?? this.enLaPista(campo.pista.length * 0.42, campo);
    return new Vector3(
      x,
      this.terrain.sampleSurface(x, z) + this.aircraft.gearHeight,
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
   *
   * **Y en el campo que se tiene debajo**, si no se dice otro. Era siempre el
   * de casa, y de aquí sacaban el umbral la distancia de la final, la aguja y
   * la vaca: en el aeropuerto de llegada los tres miraban a Gando. La cuenta
   * vive en `enLaPistaDe`.
   */
  private enLaPista(
    atras: number,
    campo: CampoEnElMundo = this.elCampo(),
  ): readonly [number, number] {
    return enLaPistaDe(campo, atras);
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
    const r = this.laPistaDeAhora();
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
      // Y la palanca de la pantalla también, que si no lo vuelve a abrir en
      // el fotograma siguiente. Ver `cerrarGas`.
      this.input.cerrarGas();
      this.hud.flash(t("hud.engineBusy"));
      return;
    }
    if (!s.onGround || s.groundSpeed > 2) {
      this.hud.flash(t("hud.engineBusy"));
      return;
    }
    c.engineOn = !c.engineOn;
    this.hud.flash(t(c.engineOn ? "hud.engineOn" : "hud.engineOff"));
    // Arrancar después de haber volado y apagado es otro vuelo, y también
    // después de un vuelo que ya se dio por terminado. Ver `empezarOtroTramo`.
    if (
      c.engineOn &&
      arrancarAbreOtroTramo(this.leccion, this.faseDeAhora, this.vueloTerminado)
    )
      this.empezarOtroTramo();
    /*
     * **Y con el motor parado en un campo, se reposta para lo que sigue.**
     *
     * Se sale con lo del tramo de ida más el alternativo, no con la vuelta: en
     * el campo de llegada hay combustible, como en cualquier aeropuerto. Pero
     * el camión no se acerca a un avión con el motor en marcha, así que llega
     * cuando se apaga, que es cuando llega de verdad.
     *
     * **En cualquier campo, también en el de salida.** Esto pedía un campo
     * distinto del último repostaje, y en casa el camión no venía nunca: quien
     * se volvía a medio camino y apagaba salía otra vez hacia Los Rodeos con
     * lo que le quedaba, y los circuitos seguidos iban vaciando el depósito.
     * Ver `hayQueLlenar`.
     *
     * Para el tramo que sale de aquí, que no es siempre el que dice la ruta
     * al apagar: al volver a casa la ruta dice «vuelta al campo» hasta que se
     * arranca, y el tramo siguiente va al destino del hangar. Ver
     * `tramoDelRepostaje`.
     */
    if (!c.engineOn && this.campoEnCuyoSueloEsta()) {
      this.mirarSiSeLlego();
      this.llenarSiHaceFalta(
        this.salidaId,
        this.destinoDelTramoDesde(this.salidaId),
      );
    }
  }

  resetFlight(): void {
    /*
     * **Dónde empieza el vuelo nuevo, lo primero.**
     *
     * Se empieza donde se estuvo en tierra por última vez, que es `salidaId`:
     * el vuelo que se repite es el tramo que empezó ahí. Tras apagar en Los
     * Rodeos, «otro vuelo» sale de Los Rodeos hacia casa; tras un percance en
     * el aire camino de allí, se vuelve a salir de Gran Canaria.
     *
     * Antes aquí ponía que cada vuelo empieza en casa, y no era verdad: el
     * plan se había mudado al campo de llegada y el avión aparecía allí, pero
     * con la ruta, el depósito, la tarjeta y la insignia del tramo de ida. Era
     * medio reinicio en cada sitio. La lección que empieza en final es de
     * casa: aterrizar se practica en la pista de siempre.
     */
    const salida =
      this.leccion.arranque !== "aire" && this.campoPorId(this.salidaId)
        ? this.salidaId
        : this.scenario.id;
    const campo = this.elCampo(salida);
    this.percance = null;
    // Y con el depósito lleno, otra vez con motor. Ver `quedarseSinMotor`.
    this.sinMotor = false;
    this.laOtraCabecera.reiniciar();
    // Todo lo de venir a aterrizar se reinicia de una vez, que es lo que gana
    // tenerlo junto: antes eran cinco líneas repartidas por este método.
    this.laAproximacion.reiniciar();
    this.avisadoDeLaSenda = false;
    this.laTorreMandaEnLaLuz = false;
    this.permisoDeAterrizar = null;
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
    this.laRecogida.reiniciar();
    this.maquina.callar();
    // Y el otro avión vuelve a empezar su vuelo con nosotros, y **con otro
    // nombre**: es otro avión, no el mismo dando vueltas para siempre. En la
    // frecuencia del campo del que se sale.
    /*
     * **Y el dibujo con ella, que se quedaba.** Reiniciar solo la frecuencia
     * dejaba los aviones dibujados de la partida anterior donde estuvieran,
     * con matrículas que ya nadie nombraba: el que aterrizaba seguía en la
     * pista sin que nadie lo olvidara, y la avioneta aparecía otra vez parada
     * junto al punto de espera con la roja encendida. Ver `Trafico.vaciar`.
     */
    this.turno.reiniciar(campo.escenario.aerodrome?.id);
    this.trafico?.vaciar();
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
    this.dichoDelTren = null;
    this.recordadoDelTren = NADA_RECORDADO;
    this.tormentasDichas.clear();
    this.estelas.vaciar();
    this.tcas.reiniciar();
    this.bandaDelTcas = "NORM";
    this.informacionDeTrafico.reiniciar();
    // Otro vuelo, otra final: las aves de la de antes se fueron.
    this.avesEnLaFinal.reiniciar();
    this.explicarLasAvesDespues = false;
    this.bandadas.quitar((b) => !!b.enFinal);
    this.atisDado = "";
    this.avisandoDelBulto = 0;
    /*
     * Y la ruta de este vuelo, **antes** del depósito: lo que se carga sale de
     * a dónde se va. Desde casa, al destino del hangar; desde fuera, a casa.
     */
    this.empezarLaRutaEn(salida);
    // Y el depósito, lleno para lo que se va a volar hoy. Ver `repostar`.
    this.repostar();
    /*
     * Y el tren fuera, con la palanca abajo: se empiece en el puesto, en la
     * cabecera o en final, un avión empieza su vuelo con las patas fuera.
     * Quedaba como lo hubiera dejado el vuelo anterior, así que meterlo
     * volando y reiniciar sentaba el avión en la pista con el tren dentro.
     * Ver `ponerElTrenFuera`.
     */
    this.input.ponerElTrenFuera();
    // Y los aerofrenos cerrados, y la cabina con su aire. Ver `olvidarLaCabina`.
    this.input.recogerAerofrenos();
    this.olvidarLaCabina();
    /*
     * Y lo de arriba va **antes** de la bifurcación, que es la otra mitad del
     * mismo problema: hay dos caminos de reinicio —éste y `reiniciarEnFinal`,
     * para las lecciones que empiezan en el aire— y lo que se reinicia en cada
     * uno se fue copiando a mano hasta divergir. Todo lo que sea «estado de
     * este vuelo» tiene que quedar limpio por los dos.
     */
    if (this.leccion.arranque === "aire") return this.reiniciarEnFinal();
    // El plan se reinicia **antes** de colocar el avión: es él quien decide si
    // hoy se sale del puesto o de la cabecera, y de eso depende dónde y hacia
    // dónde aparece. Y en el campo de salida, que puede no ser el de casa.
    this.mudarElPlanA(campo);
    const rodando =
      this.plan?.reiniciar(this.leccion.arranque === "pista") ?? false;
    this.colocarSenalero();
    const start = this.startPosition(campo);
    const heading = rodando
      ? this.rumboDeSalida(start, campo)
      : MathUtils.degToRad(campo.pista.heading);

    this.flight.reset({ position: start, heading, airspeed: 0 });
    // Y lo que va con el campo —circuito, tráfico, frecuencia, insignia—,
    // montado en el de salida, que puede no ser el que estaba montado.
    if (campo.id !== this.campoMontado) this.montarElCampo(campo);
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
    // Un vuelo nuevo es un avión en su puesto: flaps sanos y sin alivio.
    this.cargaDeFlaps = FLAPS_SANOS;
    this.input.topeDeFlaps = 1;
    this.dichoTrasLaToma = NADA_DICHO;
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
    this.huecos.reiniciar();
    this.ventanilla.reiniciar();
    // Y lo que se estaba mirando, con ella: vuelo nuevo, cabeza al frente.
    this.loSenalado = null;
    this.mirada.reiniciar();
    this.reiniciarLaVentanillaAlt();
    // Vuelo nuevo: el primer turbohélice vuelve a esperar su rato.
    this.islenos?.reiniciar();
    this.loMasAltoDelVuelo = 0;
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
    if (Number.isFinite(h)) return h;
    /*
     * **Y si no se pide ninguna, la que es de verdad donde se está volando.**
     *
     * Era siempre `HORA_BUENA`, y por eso todos los vuelos tenían el mismo
     * cielo aunque el tiempo fuera de verdad: «no aprecio el cambio de clima,
     * parece como que siempre esté igual el cielo en todas las pruebas que
     * hago». El METAR llegaba bien —viento, nubes y temperatura del sitio— y la
     * luz no se enteraba.
     *
     * Hora **solar** del aeródromo, no de reloj de pared: lo que hace falta
     * saber es dónde está el sol, y eso lo dice la longitud y no el huso, que
     * cambia con la política. Ver `hora.ts`.
     *
     * Sin aeródromo extraído no hay longitud de la que tirar, y entonces se
     * queda la hora buena de siempre.
     */
    const lon = this.scenario.aerodrome?.origin.lon;
    return lon === undefined ? HORA_BUENA : horaSolarEn(lon, new Date());
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
    if (this.aproximacion) {
      this.scene.add(this.aproximacion.grupo);
      this.tienePapi.set(
        this.aproximacion,
        !!this.aproximacion.grupo.getObjectByName("papi"),
      );
    }

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
    // Lo que la pantalla dijo del PAPI era de las luces de antes.
    this.laAproximacion.papiEnPantalla = null;
  }

  /**
   * **Y las mismas luces en el aeropuerto de llegada.**
   *
   * Luces de aproximación, PAPI y azules de rodaje, con la misma regla que en
   * casa —solo donde la pista tiene luces— y en su cabecera en uso. Se cuelgan
   * del mundo del vecino, en sus coordenadas, para que se apaguen con su
   * aeródromo cuando la isla queda lejos. Ver `MundoVecino.colgarDeCerca`.
   *
   * Se montan la primera vez que la isla se acerca, no al cargar: desde Gran
   * Canaria son cinco aeropuertos y a casi todos no se va a ir hoy.
   */
  private ponerLucesDelVecino(v: (typeof this.vecinos)[number]): void {
    v.lucesPuestas = true;
    if (v.aproximacion) {
      v.mundo.descolgar(v.aproximacion.grupo);
      v.aproximacion.dispose();
      v.aproximacion = null;
    }
    if (v.rodadura) {
      v.mundo.descolgar(v.rodadura.grupo);
      v.rodadura.dispose();
      v.rodadura = null;
    }
    // El aeródromo sin correr, que es el que casa con su propio mapa.
    const aero = v.campo.escenario.aerodrome;
    const pista = aero?.runways[0];
    if (!aero || !pista?.lit) return;
    const suelo = (p: readonly [number, number]): number =>
      v.mundo.terreno.sampleHeight(p[0], -p[1]);
    v.aproximacion = crearAproximacion(
      pista,
      cabeceraEnUso(v.campo.escenario),
      suelo,
      aero.visualAids ?? [],
    );
    if (v.aproximacion) {
      v.mundo.colgarDeCerca(v.aproximacion.grupo);
      this.tienePapi.set(
        v.aproximacion,
        !!v.aproximacion.grupo.getObjectByName("papi"),
      );
    }
    v.rodadura = crearLucesDeRodadura(aero, suelo);
    if (v.rodadura) {
      v.mundo.colgarDeCerca(v.rodadura.grupo);
      v.rodadura.ponerSol(this.sky.sunDirection.y);
    }
    if (this.elCampo().id === v.campo.id)
      this.laAproximacion.papiEnPantalla = null;
  }

  /**
   * **Lo que se dice por la megafonía, ya montado**, y quién lo dice.
   *
   * La megafonía decide **cuándo** —ver `audio/megafonia.ts`— y aquí se
   * decide **qué**: con el nombre del campo, con el plan del vuelo, con el
   * tiempo que hace en el destino o con el producto de la granja de hoy. Y
   * por qué boca: la comandante o la tripulación de cabina, que es otra
   * persona con el habla del sitio.
   */
  private decirPorMegafonia(anuncio: Anuncio): void {
    /*
     * Los dos sucesos del cartel: se apaga con el anuncio de crucero y se
     * vuelve a encender con el del descenso. El cartel y la frase cuentan lo
     * mismo porque son lo mismo. Ver `flight/cinturon.ts`.
     */
    if (anuncio === "comandante.crucero") this.dijoSoltarse = true;
    if (anuncio === "comandante.descenso") this.pidioAbrocharse = true;

    const dicho = this.loQueDiceLaMegafonia(anuncio);
    const boca = anuncio.startsWith("tripulacion.")
      ? this.tripulacion
      : this.comandante;
    boca.decir(dicho.texto, dicho.clave, "baja", dicho.relleno);
    if (this.tier.instruments !== "none") this.hud.radio(dicho.texto);

    /*
     * **Y el servicio se ve**, en los cuatro peldaños: una botella de agua en
     * su bandeja. En Guyrami es lo único que llega de este anuncio a quien
     * no lo oye —la pestaña muda, un niño que no oye bien—, y con eso basta
     * para entender que ahora viene algo para tomar. La palabra, desde el
     * peldaño que lee. Prioridad cero: cualquier aviso lo tapa, y hace bien.
     */
    if (anuncio === "tripulacion.servicio") {
      const canales = canalesDe(this.tier.avisos);
      this.hud.senal.mostrar(
        "servicio",
        canales.texto ? t("servicio.rotulo") : "",
        null,
        { segundos: 8, prioridad: 0 },
      );
    }
  }

  /**
   * El texto, la receta y su relleno de cada anuncio de la megafonía.
   *
   * Lo que no lleva nada que montar se dice tal cual, con `unaForma` para que
   * no suene siempre igual.
   */
  private loQueDiceLaMegafonia(anuncio: Anuncio): {
    texto: string;
    clave: string;
    relleno?: Readonly<Record<string, string>>;
  } {
    /*
     * **Y la llegada, la de este campo si la tiene.**
     *
     * Cada aeródromo tiene la suya y cuenta algo verdadero del sitio — el
     * silbo de La Gomera, la tierra negra de Lanzarote, el piloto que le da
     * nombre a Asunción. La genérica con el hueco del nombre queda de
     * reserva, para un campo nuevo que todavía no tenga la suya: sirve y no
     * dice nada de él, que era justo la pega — «dirá cosas distintas en cada
     * aeropuerto y no una frase siempre igual con un hueco».
     *
     * Se pregunta por el diccionario y no por una lista: si la clave no
     * está, `hayTexto` dice que no y sale la de reserva. Añadir un campo es
     * escribir su frase, y nada más.
     */
    /*
     * **Y la llegada nombra el campo donde se aterrizó, no el de salida.**
     *
     * Contado jugando, tras volar de Tenerife Sur a Tenerife Norte: «¿bien-
     * venidos al Tenerife Sur? Aterricé en Tenerife Norte Los Rodeos». El
     * anuncio salía del escenario que se abrió, que hasta que hubo rutas era
     * lo mismo que el sitio donde se acaba — y desde que se puede ir a otro
     * aeropuerto, no.
     *
     * De quién es la pista que se tiene debajo ya lo sabe el juego: es la
     * misma cuenta que decide si una toma es un aterrizaje o un percance.
     * Ver `world/pistas-del-vuelo.ts`.
     */
    const donde = this.elCampoDeAhora();
    switch (anuncio) {
      case "comandante.descenso": {
        /*
         * **Hacia dónde, cuánto falta y qué tiempo hace allí.** El tiempo es
         * el del destino si se sabe, y si no el que haya: lo que le importa a
         * quien va a bajarse es el de donde se baja. Y cuánto falta, a la
         * velocidad que se lleva y desde donde se está, que es la cuenta que
         * hace cualquier comandante mirando su pantalla.
         */
        const destino = this.elDestino();
        const s = this.flight.state;
        const alla = destino ?? this.campoPorId(this.salidaId);
        /*
         * **Y cuánto falta, de la hora del plan** si se va por él: la misma
         * cuenta que dio la duración al salir, desde donde se está y a lo que
         * se vuela. Se sacaba aparte —la recta hasta el campo a la velocidad
         * de ese instante—, y con eso «quince minutos» al salir y «faltan
         * diez» al empezar a bajar no tenían nada que ver entre sí. La recta
         * queda para la vuelta al campo, que no lleva plan.
         */
        const delPlan = destino ? this.segundosDelPlanHasta(destino.id) : null;
        const segundos =
          delPlan ??
          (alla
            ? segundosHastaTocar(
                Math.hypot(alla.x - s.position.x, alla.z - s.position.z),
                s.groundSpeed,
              )
            : null);
        const meteo =
          destino?.escenario.meteo ?? this.scenario.meteo ?? TIEMPO_DE_CASA;
        const campo =
          destino && destino.id !== this.salidaId ? destino.id : null;
        return descensoPara(campo, segundos, meteo);
      }
      case "tripulacion.servicio": {
        const habla = this.hablaDeLaTripulacion();
        /*
         * **Y lo de hoy, que no es lo de ayer.** Se recuerda lo último que se
         * ofreció —entre vuelos y entre sesiones, que un niño juega un vuelo
         * al día— y se elige entre lo demás. Es una preferencia del juego y
         * no un dato de nadie: no sale del navegador.
         */
        let ultimo: string | null = null;
        try {
          ultimo = leerTexto("servicio.ultimo");
        } catch {
          // Sin almacenamiento se sirve igual: puede repetir, y ya está.
        }
        const producto = elegirProducto(habla, ultimo);
        try {
          ponerTexto("servicio.ultimo", producto);
        } catch {
          // Lo mismo.
        }
        const plan = this.planDelTramo();
        const s = servicioPara(habla, producto, (plan?.segundos ?? 0) / 60);
        return {
          clave: s.clave,
          relleno: s.relleno,
          texto: s.piezas.map((p) => t(p as TranslationKey)).join(" "),
        };
      }
      case "tripulacion.cinturones": {
        const clave = comoSeDiceAqui(
          "tripulacion.cinturones",
          this.hablaDeLaTripulacion(),
        ) as TranslationKey;
        return { clave, texto: t(clave) };
      }
      default:
        break;
    }
    const suya = `${anuncio}.${donde.id}`;
    /*
     * **Y la bienvenida dice a dónde se va**, o que se vuelve aquí. Con el
     * destino de este tramo, que es el que se eligió en el hangar o el que
     * toca al volver a casa. Ver `audio/destino-dicho.ts`.
     */
    const cual: TranslationKey =
      anuncio === "comandante.bienvenida"
        ? bienvenidaPara(
            this.salidaId,
            this.vecinos.length > 0 ? this.destinoId : null,
          )
        : anuncio === "comandante.llegada" && hayTexto(suya)
          ? suya
          : (anuncio as TranslationKey);
    /*
     * **Y con el nombre del campo de hoy, y en una de sus formas.**
     *
     * La llegada lleva `{campo}` —«bienvenidos a Lanzarote»— porque una
     * llegada que no nombra el sitio no es una llegada: en un avión de
     * verdad es lo primero que se dice al parar, y es de las pocas frases
     * del vuelo que quien viaja escucha entera. Los demás anuncios no
     * llevan huecos y el relleno no les hace nada.
     *
     * Y por `unaForma`, que es lo que hace que aterrizar once veces no
     * suene once veces igual. Ver `audio/variantes.ts`.
     */
    const forma = unaForma(cual, Math.random, {
      /*
       * Y el nombre **dicho**, no escrito. Cinco campos llevan un punto
       * medio que en pantalla separa el aeropuerto de su ciudad —«Guaraní ·
       * Ciudad del Este»— y que en voz alta no es nada: se lee como un
       * tropiezo o no se lee. En coma es una frase: «bienvenidos a Guaraní,
       * Ciudad del Este», que además es como lo diría cualquiera.
       */
      campo: t(donde.nameKey as TranslationKey).replace(" · ", ", "),
    });
    if (anuncio !== "comandante.bienvenida")
      return { clave: forma.id, texto: forma.texto };
    /*
     * **Y detrás de la bienvenida, el plan**: cuánto dura y a qué altura se
     * va, que es lo que dice cualquier comandante antes de salir. En una
     * vuelta al campo no hay plan que contar. Ver `bienvenidaConPlan`.
     */
    const plan = this.planDelTramo();
    return bienvenidaConPlan(
      forma,
      plan?.segundos ?? null,
      plan?.nivel ?? null,
    );
  }

  /**
   * El plan de este tramo tal como lo cuenta la comandante: cuánto dura y a
   * qué nivel se cruza, o `null` si es una vuelta al campo.
   *
   * **Es el plan que se vuela, no otro**: la ruta y el crucero con los que
   * `seguirLaRuta` pone el punto de descenso. Se contaba aparte, con la recta
   * entre los dos campos y una cuenta de nivel propia, y de Los Rodeos a
   * Tenerife Sur se anunciaban diez mil pies para un plan de doce mil. Si
   * el plan todavía no está puesto, se traza aquí con las mismas funciones.
   * Ver `cruceroDelPlan` en `flight/ruta.ts` y `nivelDicho`.
   */
  private planDelTramo(): { segundos: number; nivel: number | null } | null {
    const destino = this.elDestino();
    if (!destino || destino.id === this.salidaId) return null;
    const salida = this.elCampo(this.salidaId);
    const llegada = this.elCampo(destino.id);
    const cabSalida = cabeceraEnUso(salida.escenario);
    const cabLlegada = cabeceraEnUso(llegada.escenario);
    const puesto =
      this.navegacion.plan !== null &&
      this.claveDeLaRuta === `${salida.id}:${cabSalida}>${llegada.id}:${cabLlegada}`;
    const ruta = puesto
      ? this.navegacion.plan
      : this.trazarLaRuta(salida, llegada);
    if (!ruta) return null;
    const crucero = puesto ? this.navegacion.cruceroPlaneado : this.cruceroDe(ruta, salida);
    /*
     * **Y lo que dura, por la misma cuenta que la hora del plan.** Era la
     * ruta a la velocidad de crucero y cuatro minutos más, sin subida ni
     * bajada: de Los Rodeos a La Palma salían quince minutos, y en Binter son
     * treinta de calzos a calzos. Ahora es la hora que da el plan antes de
     * despegar —el mismo `segundosPorElPerfil` que pone la hora en la pantalla
     * de navegación—, desde la pista de salida y con el viento de hoy.
     */
    const a = ruta.fijos[0];
    if (!a) return null;
    return {
      segundos: segundosPorElPerfil(ruta, 1, a.x, a.z, {
        avion: this.aircraft,
        altitud: this.cotaDelCampo(salida),
        crucero,
        bajando: false,
        viento: this.vientoDeLaRuta(),
        atmosfera: this.flight.aireDelDia(),
        verdadera: null,
      }),
      nivel: nivelDicho(crucero),
    };
  }

  /**
   * Lo que falta según la hora del plan, s, si el plan que se sigue va a
   * `id`; si no, `null`. Ver `seguirLaRuta`.
   */
  private segundosDelPlanHasta(id: string): number | null {
    const p = this.navegacion.progreso;
    if (!this.navegacion.plan || !p || !Number.isFinite(p.segundos)) return null;
    return this.claveDeLaRuta.includes(`>${id}:`) ? p.segundos : null;
  }

  /**
   * Cómo habla la tripulación de este vuelo: como se habla donde sale.
   *
   * Es la tripulación de una base, y la base es el campo de salida: en un
   * salto entre Gran Canaria y Tenerife habla canario, y entre Asunción y
   * Ciudad del Este, paraguayo. Ver `i18n/habla.ts`.
   */
  private hablaDeLaTripulacion(): Habla {
    return hablaDe(
      this.campoPorId(this.salidaId)?.escenario.aerodrome?.id ??
        this.scenario.aerodrome?.id,
    );
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
    this.loMasAltoDelVuelo = Math.max(
      this.loMasAltoDelVuelo,
      this.flight.state.position.y,
    );
    /*
     * Lo que se pidió y todavía espera su voz, si se le pasó el momento, se
     * retira: «armar toboganes» con el avión rodando no se dice. Ver
     * `seLePasoElMomento`.
     */
    BOCA.retirar((c) => seLePasoElMomento(c, this.faseDeAhora as Fase));
    const anuncio = this.megafonia.paso(dt, {
      fase: this.faseDeAhora as Fase,
      conPasaje: conPasaje(this.aircraft.mass),
      conTripulacion: conTripulacion(this.aircraft.mass),
      /*
       * **Y un anuncio detrás de otro**: ni con otro sonando ni con otro
       * esperando turno. Lo demás lo reparte la boca, que es un solo turno
       * para todas las voces. Ver `audio/turnos.ts`.
       */
      megafoniaHablando:
        this.comandante.hablando ||
        this.tripulacion.hablando ||
        BOCA.esperaAlguna((c) => esDeLaMegafonia(c)),
      cartelPuesto: this.cinturonPuesto,
      // Y sin «pueden soltarse» con una turbulencia anunciada por delante.
      turbulenciaPorPasar: this.turbulenciaDelVuelo.porPasarTodavia,
      /*
       * Y a qué altura se va **sobre el campo**, no sobre el mar: el cartel
       * del cinturón se apaga cuando el avión está arriba, y «arriba» en La
       * Palma con el aeródromo a treinta y tres metros no es lo mismo que en
       * un aeropuerto al nivel del mar. Ver `ARRIBA_DEL_TODO`.
       */
      sobreElCampo: this.flight.state.position.y - this.cotaDeLaPistaAqui(),
      vertical: this.flight.state.verticalSpeed,
      /*
       * Y cuánto se ha bajado ya desde lo más alto del vuelo, que es lo único
       * que distingue «acabo de llegar arriba» de «voy bajando al destino».
       * La fase no lo distingue: en una ruta entre dos aeropuertos el descenso
       * entero pasa dentro de `en-vuelo`.
       */
      desdeLoMasAlto: Math.max(
        0,
        this.loMasAltoDelVuelo - this.flight.state.position.y,
      ),
    });
    /*
     * **Y en un descenso de emergencia, el guion de siempre se calla**: su
     * momento pasa y no se dice después. «Empezamos a bajar hacia…» en mitad
     * de un descenso de emergencia no lo dice nadie; lo que se dice lo dice
     * `seguirElDescenso`.
     */
    const enEmergencia =
      this.descensoDeEmergencia !== null && !this.descensoDeEmergencia.terminado;
    if (anuncio && !enEmergencia) this.decirPorMegafonia(anuncio);

    this.mirarPorLaVentanilla(dt);

    /*
     * **El reloj, antes de la puerta.**
     *
     * Estaba debajo del `return` de los campos privados, o sea que en Yvytu
     * Rape no avanzaba nunca — y de él cuelga el destello de la luz de choque,
     * que con el reloj parado se queda **encendida fija**. Un aparato no deja
     * de tener reloj porque el campo no tenga torre.
     */
    this.relojDeRuta += dt;
    /*
     * Y los de la ruta, que no llevan reloj propio: se les da el del vuelo y
     * de ahí sale dónde están. Sin estado y repetible — ver
     * `flight/trafico-en-ruta.ts`.
     *
     * **Antes de la puerta del campo privado**, que estaba delante: saliendo
     * de la granja el corredor iba vacío, y el corredor no depende de que el
     * campo tenga torre.
     */
    this.pilotoSeSolto = Math.max(0, this.pilotoSeSolto - dt);
    this.ponerElCorredor();
    this.avionesDeRuta?.paso(this.relojDeRuta, this.flight.state.position);
    /*
     * Y los barcos y los turbohélices de las islas, también antes de la
     * puerta del campo privado: el mar no depende de que haya torre.
     */
    this.barcos?.paso(
      this.relojDeRuta + this.adelantoDeLosBarcos,
      this.flight.state.position,
      luzDeLaEstela(this.sky.sunDirection.y),
    );
    if (this.islenos) {
      this.islenos.paso(dt, this.yoParaLasIslas());
      // Con el reloj del vuelo, que es el de los destellos de sus luces.
      this.avionesDeLasIslas?.poner(this.islenos.quienes(), this.relojDeRuta);
    }
    /*
     * Y las aves, también antes de la puerta: vuelan igual haya torre o no.
     * Lo que pide torre —el aviso de la final— lo mira el aviso. Ver
     * `vigilarLasAves`.
     */
    this.moverLasAves(dt);
    // La frecuencia es la del campo en el que se está, no la de casa. Ver
    // `montarElCampo`. Y donde no hay torre no hay frecuencia que oír.
    if (!sinTorre(this.elCampoMontado().escenario.aerodrome)) this.oirElCampo(dt);
    /*
     * **Y el TCAS, con todos ya en su sitio**, también en un campo sin torre:
     * un transpondedor no deja de contestar porque no haya quien hable.
     *
     * Y detrás de la frecuencia del campo, no delante, que es lo que decía
     * este comentario y no hacía: el tráfico del circuito se mueve —y se
     * retira, y aparece donde dice su llamada— al oír el campo, en
     * `turno.oir`. Mirado antes, el TCAS pintaba al del circuito donde estaba
     * en el paso anterior, y al que acababa de retirarse lo seguía pintando un
     * paso más: en el vuelo a La Gomera, «2 sin avión: circuito:EC-OOT», un
     * rombo de un avión que ya no estaba en el mundo. Lo que se ve, lo que
     * pinta el radar y lo que nombra la radio son el mismo paso.
     */
    this.vigilarElTrafico(dt);
  }

  /**
   * **La frecuencia del campo montado**: con quién se habla, lo que pasa en
   * ella y en su dibujo, y quién lo dice. Ver `oirLaRadio`.
   */
  private oirElCampo(dt: number): void {
    /*
     * **Y solo se oye si se está en su frecuencia.** A veinticuatro mil pies
     * se oía al de la plataforma del aeropuerto de salida pedir rodar a la
     * cabecera. Fuera de la zona de la torre se habla con salida, con control
     * o con aproximación, y la del campo deja de oírse; lo que tenía
     * esperando turno, también. El campo sigue vivo —sus aviones despegan y
     * aterrizan igual—, pero callado para vos. Ver `flight/dependencia.ts`.
     */
    const antes = this.dependencia;
    this.dependencia = this.laDependenciaDeAhora();
    const seOye = seOyeElCampo(this.dependencia);
    if (!seOye && antes !== null && seOyeElCampo(antes)) this.turno.dejarDeOir();
    /*
     * Pasa el tiempo en la frecuencia y en su dibujo, y quien habla ya está
     * donde dice. Ver `oir` en `flight/turno-de-pista.ts`.
     */
    const dice = this.turno.oir(dt, {
      fase: this.faseDeAhora,
      deDia: this.sky.sunDirection.y > 0,
      // Sin oírla, ni la instructora ni la boca le quitan el turno: es otra
      // frecuencia y no espera a nadie de esta cabina.
      instructorHablando: seOye && this.instructor.hablando,
      // La radio es de uno en uno: se transmite con el canal libre, y no a la
      // cola. Ver `Momento.canalOcupado`.
      canalOcupado: seOye && !BOCA.libre,
    });
    if (!dice || !seOye) return;
    this.nombrar(dice.clave, dice.de.matricula);

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
      if (this.tier.instruments !== "none") this.hud.radio(montada.texto, undefined, false);
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
    if (this.tier.instruments !== "none") this.hud.radio(texto, undefined, false);
  }

  /**
   * El circuito de tráfico de la cabecera en uso.
   *
   * Se monta con la aproximación porque depende de lo mismo —qué cabecera se
   * está usando— y se rehace cuando cambia el viento: un circuito dibujado
   * para la otra punta de la pista es un circuito que lleva al revés.
   *
   * **Y en el campo en el que se está.** Había uno, montado en casa, y en el
   * aeropuerto de llegada no había hilo ocre ni tramos cantados — tampoco
   * después de una orden de irse al aire, que es justo cuando el circuito
   * enseña el camino de vuelta. Ver `montarElCampo`.
   */
  private ponerCircuito(): void {
    if (this.circuito) {
      this.scene.remove(this.circuito.grupo);
      this.circuito.dispose();
      this.circuito = null;
    }
    this.laAproximacion.tramoDelCircuito = null;
    if (!this.tier.circuito) return;
    const campo = this.elCampoMontado();
    // El circuito de **este** avión: el del de fuselaje ancho es tres veces
    // el de la avioneta. Ver `escalaDeCircuito`.
    const escala = escalaDeCircuito(this.aircraft.approachSpeed);
    this.circuito = crearCircuito(
      campo.pista,
      this.cotaDelCampo(campo),
      (x, z) => this.terrain.sampleHeight(x, z),
      escala,
      // Y por el lado que publica el campo, si lo publica: la cabecera es la
      // del viento, la misma que la de todo lo demás. Ver `manoPublicada`.
      manoPublicada(campo.escenario, cabeceraEnUso(campo.escenario), escala),
      // Y el pasillo contra el terreno, a la velocidad a la que **este**
      // avión vuela el circuito. Ver `pasilloDelCircuito`.
      this.aircraft.velocidadDeCircuito,
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
    // El del campo en el que se está, y solo si allí hay con quién compartir
    // la frecuencia. Ver `montarElCampo`.
    this.calleUnicaDelCampo = () => false;
    const campo = this.elCampoMontado();
    const aero = campo.escenario.aerodrome;
    if (!aero) return;
    /*
     * **Y quién vuela aquí lo dice el campo**: en una pista particular o en
     * una sin torre, nadie más que vos, salvo que el campo diga otra cosa.
     * Ver `tiposDelCampo`.
     */
    const tipos = tiposDelCampo(aero.id, campo.pista.length, sinTorre(aero));
    if (tipos.length === 0) return;
    /*
     * **Y no tiene tu silueta.** Ver tu propio avión pasando por el viento en
     * cola es un espejo, no un vecino: lo primero que se aprende mirando al
     * cielo de un aeródromo es que no todos son iguales. Se coge el entrenador,
     * o el biplano si el entrenador sos vos.
     */
    const mia = modeloPorId(this.aircraft.id)?.silueta;
    const otra = FLOTA.find((m) => m.silueta !== mia)?.silueta;
    if (!otra) return;
    const cota = this.cotaDelCampo(campo);
    /*
     * El mismo lado **y la misma altura** que el hilo ocre, sacados de la
     * misma cuenta: con la mano de la avioneta y la altura de costumbre, en
     * Los Rodeos el otro avión volaba su viento en cola por el sur mientras
     * al reactor se le dibujaba por el norte. Ver `formaDelCircuito`.
     */
    const escala = escalaDeCircuito(this.aircraft.approachSpeed);
    const suelo = (x: number, z: number): number => {
      if (campo.esCasa) return this.terrain.sampleHeight(x, z);
      const v = this.vecinos.find((w) => w.campo.id === campo.id);
      return v?.mundo.cota(x, z) ?? this.terrain.sampleHeight(x, z);
    };
    /*
     * **Cada tipo, su circuito**, con la misma regla de lado y altura que el
     * hilo ocre de quien juega a esa escala. Ver `formaDelCircuito`.
     */
    const forma = (esc: number, velocidadDeCircuito?: number) =>
      formaDelCircuito(
        campo.pista,
        cota,
        suelo,
        esc,
        manoPublicada(campo.escenario, cabeceraEnUso(campo.escenario), esc),
        velocidadDeCircuito,
      );
    const deTu = forma(escala, this.aircraft.velocidadDeCircuito);
    /*
     * **Por las calles del aeródromo, y en la pista en uso**, la misma que
     * todo lo tuyo: el tráfico no tiene pista propia. Se piden al hablar el
     * primero de cada tipo, que es cuando el plan ya sabe a qué doble raya
     * vas. Ver `world/suelo-del-trafico.ts`.
     */
    const aerodromo = campo.aerodromo;
    const pista = campo.pista;
    const ancho =
      aerodromo?.runways
        .map((r) => {
          const a = r.centerline[0] ?? [0, 0];
          const b = r.centerline[r.centerline.length - 1] ?? a;
          const cx = (a[0] + b[0]) / 2;
          const cz = -(a[1] + b[1]) / 2;
          return { r, d: Math.hypot(cx - pista.x, cz - pista.z) };
        })
        .sort((p, q) => p.d - q.d)[0]?.r.widthM ?? 45;
    let sueloDelCampo: SueloDelTrafico | null | undefined;
    // Y si entre la plataforma y la pista hay una sola calle, con la misma
    // cuenta de calles que rueda el tráfico. Ver `unaSolaCalle`.
    this.calleUnicaDelCampo = () => {
      if (!aerodromo) return false;
      if (sueloDelCampo === undefined)
        sueloDelCampo = sueloDelTrafico(aerodromo, pista, ancho);
      return sueloDelCampo?.unaSolaCalle() ?? false;
    };
    this.trafico = crearTrafico(
      pista,
      cota,
      otra,
      deTu.mano,
      escala,
      deTu.altura,
      {
        tipos,
        forma,
        cuerposDeVerdad: true,
        /*
         * **Y tu aproximación entra en la fila**, y tu pista cuenta como
         * ocupada: el tráfico que viene detrás de ti te deja tu hueco, y el
         * que llega a la decisión contigo encima de la pista se va al aire.
         * Ver `QuienJuega` en `world/trafico.ts`.
         */
        quienJuega: () => this.tuLlegada(),
        tierra: () => {
          if (!aerodromo) return null;
          if (sueloDelCampo === undefined)
            sueloDelCampo = sueloDelTrafico(aerodromo, pista, ancho);
          if (!sueloDelCampo) return null;
          const yo = this.flight.state.position;
          const ruta = this.plan?.rutaVisible() ?? [];
          const raya = ruta.at(-1);
          return {
            suelo: sueloDelCampo,
            /*
             * Sobre el asfalto, como el avión de quien juega: el terreno está
             * treinta y cinco centímetros por debajo. Ver `sampleSurface`.
             */
            alto: (x, z) => {
              if (campo.esCasa) return this.terrain.sampleSurface(x, z);
              const v = this.vecinos.find((w) => w.campo.id === campo.id);
              return v?.mundo.superficie(x, z) ?? this.terrain.sampleSurface(x, z);
            },
            evitar: [
              { x: yo.x, z: yo.z },
              ...(raya ? [{ x: raya[0], z: raya[1] }] : []),
            ],
            /*
             * **Y tu raya entera, no solo su final.** Se apartaba de tu
             * puesto y de tu doble raya, y nada más: su espera podía caer en
             * mitad de la calle por la que el juego te manda a ti, con el
             * avión plantado encima de tu raya verde. Ver `Ocupados` en
             * `rodaje.ts` para la otra mitad: tu raya también lo rodea a él.
             */
            porDondeVas: cadaTanto(ruta, 10),
            /*
             * **Y el que aterriza no sale por donde estás tú**, si tiene
             * otra salida: tu avión y tu raya, con la separación de ala. Ver
             * `OCUPADA_CUESTA` en `world/suelo-del-trafico.ts`.
             */
            ocupados: this.flight.state.onGround
              ? {
                  puntos: [
                    { x: yo.x, z: yo.z },
                    ...(raya ? [{ x: raya[0], z: raya[1] }] : []),
                    ...cadaTanto(ruta, 30),
                  ],
                  radio: separacionEnTierra(this.aircraft.wingSpan),
                }
              : undefined,
          };
        },
      },
    );
    this.scene.add(this.trafico.grupo);
  }

  /**
   * **Tu llegada, vista desde el tráfico**: cuánto te falta para el umbral si
   * vuelas la final, y si estás encima de la pista. Ver `QuienJuega` en
   * `world/trafico.ts`.
   */
  private tuLlegada(): QuienJuega {
    const s = this.flight.state;
    const fase = this.faseDeAhora;
    const velocidad = Math.max(15, s.groundSpeed);
    /*
     * **Y con prioridad, a la fila desde lejos.** Quien va justo de
     * combustible entra en la fila de llegadas en cuanto baja hacia el campo,
     * no al llegar a la final: así los demás se apartan a tiempo, que es lo
     * que hace un control con un MAYDAY. Ver `QuienJuega.prioridad`.
     */
    const p = this.navegacion.progreso;
    // Y solo en el campo al que se va: el tráfico es el del campo montado.
    const alli = this.elDestino()?.id === this.elCampoMontado().id;
    const deLejos =
      this.conPrioridad && alli && !s.onGround && this.navegacion.bajando && p !== null
        ? p.restante / velocidad
        : null;
    /*
     * **Y en la final del plan, a la fila aunque todavía no sea «final».**
     *
     * La fase de final empieza a trescientos metros y alineado; la final de
     * una llegada empieza en el punto de final, a seis o siete millas. En
     * medio la torre no te veía, y daba la salida a otro con vos bajando hacia
     * la pista: a la decisión seguía corriendo por ella, o ya rotado a pocos
     * metros sobre el asfalto, delante del morro. Medido en el banco de Gando:
     * dos salidas autorizadas entre la base y tu final, y las dos acabaron en
     * frustrada. Una torre de verdad te tiene en la secuencia desde el punto
     * de final, y no suelta a nadie que no vaya a haber pasado el final de la
     * pista antes de que llegues. Ver `llegaAntesDeQueSalga` en
     * `world/trafico.ts`.
     */
    const enLaFinalDelPlan =
      fase !== "final" &&
      alli &&
      !s.onGround &&
      this.navegacion.enElTramoFinal(this.lecturaDeRuta());
    const alUmbral =
      (fase === "final" || enLaFinalDelPlan) && !s.onGround
        ? distanciaAlUmbral(this.elCampo(), s.position.x, s.position.z) / velocidad
        : deLejos;
    return {
      alUmbral: alUmbral !== null && alUmbral > 0 ? alUmbral : null,
      enLaPista: s.onGround && ENCIMA_DE_LA_PISTA.has(fase),
      velocidad,
      prioridad: this.conPrioridad,
      enTierra: s.onGround ? this.tuSitioEnTierra() : null,
    };
  }

  /**
   * **Tu avión en el suelo, visto desde el tráfico que rueda**: dónde está,
   * cuánto ocupa y por dónde va a pasar en los próximos segundos —la raya por
   * delante y hacia donde apunta el morro—. Con esto el tráfico se para
   * detrás de ti y te cede los cruces. Ver `cedeA` en `world/trafico.ts`.
   */
  private tuSitioEnTierra(): EnTierra {
    const s = this.flight.state;
    const v = Math.hypot(s.velocity.x, s.velocity.z);
    /*
     * Cuatro segundos de lo que rueda, y nada si está parado: un avión parado
     * no va a pasar por ningún cruce, y reservárselo dejaría al tráfico
     * esperando a alguien que no viene.
     */
    const metros = v < 0.5 ? 0 : Math.max(15, v * 4);
    const porDondeVa = this.plan?.porDondeVas(metros) ?? [];
    for (let d = 6; d <= metros; d += 6)
      porDondeVa.push({
        x: s.position.x + (s.velocity.x / v) * d,
        z: s.position.z + (s.velocity.z / v) * d,
      });
    return {
      x: s.position.x,
      z: s.position.z,
      separacion: separacionEnTierra(this.aircraft.wingSpan),
      porDondeVa,
      esperandoLaPista: this.faseDeAhora === "esperando",
    };
  }

  /**
   * **El permiso que no llegó a oírse no se dio**: se apaga la verde y su
   * tarjeta, y en la final siguiente la torre lo da otra vez, con su voz. Si
   * mientras tanto hay una orden de irse al aire, la luz es suya y no se
   * toca. Ver `retirarteElPermiso` en `flight/turno-de-pista.ts`.
   */
  private retirarElPermisoSinOir(): void {
    this.permisoDeAterrizar = null;
    if (this.laAproximacion.mandanFrustrar || !this.laTorreMandaEnLaLuz) return;
    this.hud.senal.caducar(this.esAfisAqui() ? "toma" : "verde");
    this.luzDeTorre(null);
    this.laTorreMandaEnLaLuz = false;
  }

  /**
   * **Que la pista está ocupada, dicho por quien lo diría**: donde contesta
   * un AFIS, al llegar a final con alguien encima. Un AFIS no te para ni te
   * manda al aire; te dice lo que hay, en castellano en los cuatro peldaños
   * y, de Taguató para arriba, en su fraseología. Donde hay torre no se dice
   * nada: la torre te deja de número dos y la luz ya lo cuenta. Ver
   * `avisarteOcupada` en `flight/turno-de-pista.ts`.
   */
  private decirQueLaPistaEstaOcupada(): void {
    if (!this.esAfisAqui()) return;
    const yo = this.miIndicativo;
    const clave = comoSeDiceAqui(
      "torre.afisOcupada",
      hablaDe(this.elCampo().escenario.aerodrome?.id),
    ) as TranslationKey;
    this.torre.decir(t(clave, { indicativo: yo.dicho }), clave, "mando", rellenoDe(yo));
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    if (conCifras) this.porRadioClave("torre.afisOccupied");
  }

  /**
   * **Si el campo de ahora no tiene más que una calle** entre la plataforma y
   * la pista en uso: la torre no mueve dos aviones a la vez por ella. La pone
   * `ponerTrafico`, que es quien sabe las calles del campo; ver `USAN_LA_CALLE`
   * en `flight/turno-de-pista.ts`.
   */
  private calleUnicaDelCampo: () => boolean = () => false;

  /**
   * Dónde hay aviones del tráfico parados, o a punto de parar, en las calles
   * del campo en el que se está, en los ejes del fichero. Ver `dondeParan`.
   * `sale`: los que van a despegar, que son la cola de quien también va; ver
   * `enCola` en `plan-de-vuelo.ts`. `soloLosQueHay`: sin la doble raya de
   * cada tipo cuando no hay nadie esperando en ella; ver `colaQueHay`.
   */
  private paradosEnLasCalles(sale: boolean, soloLosQueHay = false): Punto[] {
    return (this.trafico?.dondeParan() ?? [])
      .filter((p) => p.sale === sale && (p.hay || !soloLosQueHay))
      .map((p) => [p.x, -p.z] as Punto);
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
    const suelo = this.terrain.sampleSurface(s.position.x, s.position.z);
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
    // Y se vuelve a medir: el modelo de verdad no mide lo que medían las
    // cajas, y de esa medida sale a qué distancia va la cámara de costado.
    this.largoMedido = 0;
  }

  /** Lo que mide el avión de morro a cola, m. Cero hasta que se mide. */
  private largoMedido = 0;

  /**
   * A cuánto va el coche del sígame por delante de este avión, m, y de qué
   * malla se sacó. Ver `adelantoDelSigueme`.
   *
   * Guardado **con la malla y no con el avión**: al cambiar de aeronave se
   * montan primero las cajas y el modelo llega después, y cada una tapa lo
   * suyo. Una medida guardada por avión se quedaría con la de las cajas.
   */
  private adelantoMedido: { de: AircraftMesh; metros: number } | null = null;

  get adelantoDelSigueme(): number {
    const malla = this.aircraftMesh;
    if (this.adelantoMedido?.de !== malla)
      this.adelantoMedido = {
        de: malla,
        metros: adelantoDelSigueme({
          ojo: malla.ojo,
          vista: malla.vista,
          tren: this.aircraft.gearHeight,
          cola: sitioDeLaCola(this.aircraft.wingSpan),
        }),
      };
    return this.adelantoMedido.metros;
  }

  /**
   * Lo largo que es el avión **que se está dibujando**, m.
   *
   * De morro a cola, sacado de la caja que ocupa la malla, y no de la ficha:
   * la ficha no lo tiene —lleva envergadura y cuerda, que es lo que necesita
   * el modelo de vuelo— y sobre todo porque lo que hay que encuadrar es lo que
   * se ve. Si un día el modelo cambia, la cámara cambia con él sin que nadie
   * tenga que acordarse de un número.
   *
   * **Y se mide con el avión puesto recto**, que es lo que costó la primera
   * vez: `setFromObject` da la caja en coordenadas del mundo, así que con el
   * avión alineado a una pista 03 lo que sale por el eje Z es una mezcla del
   * largo y de la envergadura, y el número no significa nada. Se le quita la
   * rotación un instante, se mide y se le devuelve.
   *
   * Una vez por modelo y guardado: recorrer la malla entera sesenta veces por
   * segundo para un número que no cambia sería pagar un repintado por nada.
   * Ver `ponerModeloSiLoHay` y `CamaraDeFuera`.
   */
  private get largoDelAvion(): number {
    if (this.largoMedido <= 0) {
      const g = this.aircraftMesh.group;
      const giro = g.quaternion.clone();
      const donde = g.position.clone();
      g.quaternion.identity();
      g.position.set(0, 0, 0);
      g.updateMatrixWorld(true);
      const caja = new Box3().setFromObject(g);
      g.quaternion.copy(giro);
      g.position.copy(donde);
      g.updateMatrixWorld(true);
      const largo = caja.max.z - caja.min.z;
      // Si la caja sale vacía —la malla todavía no tiene geometría— se
      // devuelve la envergadura, que es lo que se usaba antes y nunca es cero.
      this.largoMedido =
        Number.isFinite(largo) && largo > 0 ? largo : this.aircraft.wingSpan;
    }
    return this.largoMedido;
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
    /*
     * **Y se rehace en el campo en el que se está, no siempre en el de casa.**
     *
     * Esto tomaba el aeródromo del escenario sin mirar, así que un cambio de
     * viento con el avión ya rodando por la plataforma del destino devolvía el
     * plan a sesenta kilómetros de allí y dejaba a quien juega sin raya.
     */
    const suyo = this.vecinos.find(
      (v) => v.aerodromo === this.plan!.aerodromoActual,
    );
    const aero = suyo?.aerodromo ?? this.scenario.aerodrome;
    const pista = suyo?.campo.pista ?? this.scenario.runway;
    this.scene.remove(this.plan.grupo);
    this.plan = new PlanDeVuelo(
      aero,
      pista,
      (x, z) => this.terrain.sampleHeight(x, z),
      this.aircraft,
    );
    this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
    this.plan.ocupados = () => this.paradosEnLasCalles(false);
    this.plan.enCola = () => this.paradosEnLasCalles(true);
    this.plan.colaQueHay = () => this.paradosEnLasCalles(true, true);
    // Y el dibujo con él, en todas las lecciones. Ver dónde se monta.
    this.scene.add(this.plan.grupo);
    this.colocarSenalero();
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
    // Y si el avión de hoy mete las patas, que decide si hay palanca de tren,
    // y lo que tardan sus flaps. Ver `flight/flaps.ts`.
    this.input.ponerAeronave(
      this.aircraft.trenRetractil,
      this.aircraft.tardanLosFlaps,
      this.aircraft.llevaFlaps,
      {
        aerofrenos: this.aircraft.aerofrenos !== null,
        frenosDeTierra: this.aircraft.frenosDeTierra !== null,
        autofreno: this.aircraft.autofreno,
      },
    );
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
    this.alCambiarElVolumen(this.audio.ponerNivel(ajustes.volumen), false);
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
    this.horaDelVuelo = hora;
    this.sky.ponerHora(hora);
    // Y con ella se enciende o se apaga el balizamiento. `sunDirection.y` es
    // el seno de la altura del sol, que el cielo acaba de recalcular.
    this.rodadura?.ponerSol(this.sky.sunDirection.y);
    this.lucesDeCiudad?.ponerSol(this.sky.sunDirection.y);
    for (const v of this.vecinos) {
      v.mundo.ponerSol(this.sky.sunDirection.y);
      v.rodadura?.ponerSol(this.sky.sunDirection.y);
    }
    // Y las aves, que salen con el sol y suben con la térmica de la tarde.
    this.poblarDeAves();
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
  /**
   * La presión de hoy aquí, hPa, y la que lleva puesta el altímetro.
   *
   * La primera la trae el METAR y hasta ahora no la usaba nadie. La segunda
   * empieza igual que ella —como si se hubiera puesto en la revisión antes de
   * arrancar, que es cuando se pone— y desde ahí la mueve quien vuela. Ver
   * `flight/altimetro.ts`.
   */
  private qnhDelSitio = QNH_ESTANDAR;
  private qnhPuesta = QNH_ESTANDAR;

  /** Lo que enseña el altímetro, m: la altitud corregida por el reglaje. */
  altitudIndicada(): number {
    return alturaIndicada(
      this.flight.state.position.y,
      this.qnhPuesta,
      this.qnhDelSitio,
    );
  }

  /** Gira la rueda del altímetro un hectopascal. */
  girarAltimetro(pasos: number): void {
    this.qnhPuesta = girarRueda(this.qnhPuesta, pasos);
    this.avisar("attention");
  }

  ponerTiempo(meteo: Meteo): void {
    this.scenario = conViento(this.scenario, meteo);
    /*
     * **Y el altímetro se entera del día que hace.**
     *
     * Se pone en la del sitio al recibir el parte, que es lo que hace quien
     * vuela antes de arrancar: se pide el reglaje y se gira la rueda. A
     * partir de ahí es suya, y si la mueve, el instrumento miente sin
     * quejarse — que es lo que hace uno de verdad.
     */
    this.qnhDelSitio = meteo.qnh;
    this.qnhPuesta = meteo.qnh;
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
    // Y donde haya más de un campo, el de cada uno: ver `seguirElViento`,
    // que lo rehace en el próximo paso con el avión donde esté.
    this.desdeElViento = Infinity;
    /*
     * **Y las nubes del parte, que estaban ahí sin usar.**
     *
     * `Meteo.techoM` se leía del METAR desde el primer día —la base de las
     * nubes sobre el aeropuerto— y no la miraba nadie: el cielo lo ponían solo
     * los tres botones. Así que se podía pedir el tiempo de verdad de un día
     * cerrado en Tenerife y volar con el cielo azul. Ahora el parte pone su
     * nube, y con ella su altura de decisión.
     */
    this.ponerTecho(meteo.techoM, tapaduraDe(meteo));
    /*
     * **Y el agua del parte.** `Meteo.lluvia` sale del grupo de tiempo presente
     * del METAR —`RA`, `+TSRA`, `DZ`— y hasta hoy no la miraba nadie: se podía
     * pedir el tiempo de verdad de un día de tormenta en Tenerife y volar con
     * el cielo despejado y seco. Ver `world/lluvia.ts`.
     */
    this.visibilidadDelParte = meteo.visibilidadM;
    this.ponerLluvia(meteo.lluvia, meteo.fuerzaDeLluvia);
    this.terrain.rehacerAerodromo(this.scenario);
    /*
     * **Y los otros campos, con el suyo.**
     *
     * Aquí se les ponía a todos el mismo parte, el de casa: con 300/15 en Los
     * Rodeos, cada vecino elegía cabecera con el viento de Los Rodeos. Era
     * mejor que lo de antes —el destino con la cabecera de la calma—, pero
     * seguía siendo el tiempo de otro sitio. Ahora cada campo tiene su parte
     * —ver `ponerTiempoDe`—, y este solo se reparte a todos **cuando es a
     * mano**: el panel del tiempo o `?viento=`, que están para ensayar una
     * situación y la quieren igual en todas partes.
     */
    this.camposHechos = null;
    this.pistasHechas = null;
    if (meteo.fuente === "mano")
      for (const v of this.vecinos) this.tiempoAlVecino(v, meteo);
    // Y otra vez al acabar: lo de dentro del bucle puede haber preguntado
    // dónde se está con la mitad de los vecinos ya cambiados.
    this.pistasHechas = null;
    this.camposHechos = null;
    if (this.vecinos.length > 0)
      this.hud.mapa.ponerOtrasPistas(this.vecinos.map((v) => v.campo.pista));
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
    // Y las aves: con otro calor y otras nubes, otra térmica.
    this.poblarDeAves();
  }

  /**
   * **El parte de un campo del vuelo que no es el de casa**, cuando llega.
   *
   * Lo pide `main.ts` al arrancar, uno por cada campo al que se puede ir, y
   * lo pone aquí en cuanto contesta el proxy —o no lo pone, si no contesta:
   * el campo se queda con su tiempo típico—. De él salen su cabecera en uso,
   * su manga, lo que dice su torre y el viento que empuja al avión cuando se
   * llega. Con tiempo a mano no se toca: lo que se ensaya manda en todos.
   */
  ponerTiempoDe(id: string, meteo: Meteo): void {
    if (this.scenario.meteo?.fuente === "mano") return;
    const v = this.vecinos.find((w) => w.base.id === id);
    if (!v) return;
    this.camposHechos = null;
    this.pistasHechas = null;
    const cambiaLaPista = this.tiempoAlVecino(v, meteo);
    this.pistasHechas = null;
    this.camposHechos = null;
    this.hud.mapa.ponerOtrasPistas(this.vecinos.map((w) => w.campo.pista));
    // Y si el plan de tierra está allí, su raya va por la cabecera nueva.
    if (cambiaLaPista && this.plan && v.aerodromo === this.plan.aerodromoActual)
      this.rehacerPlanDeVuelo();
    this.desdeElViento = Infinity;
  }

  /**
   * Le pone su parte a un vecino y rehace lo que depende de su cabecera: su
   * aeródromo con su manga y sus luces. Devuelve si la cabecera cambió.
   *
   * Con el mismo viento no hay nada que rehacer —es lo que pasa al arrancar,
   * que el vecino ya se montó con su tiempo—, pero el campo sí se cambia:
   * trae la presión y las nubes de hoy, que es lo que dice su torre.
   */
  private tiempoAlVecino(
    v: (typeof this.vecinos)[number],
    meteo: Meteo,
  ): boolean {
    const antes = v.campo;
    v.campo = campoVecino(v.base, v.mundo.desplazamiento, v.aerodromo, meteo);
    const mismoViento =
      antes.escenario.meteo?.vientoDe === meteo.vientoDe &&
      antes.escenario.meteo?.vientoKt === meteo.vientoKt;
    const mismaPista = antes.pista.heading === v.campo.pista.heading;
    if (mismoViento && mismaPista) return false;
    v.mundo.ponerTiempo(v.campo.escenario);
    if (v.lucesPuestas) this.ponerLucesDelVecino(v);
    return !mismaPista;
  }

  /**
   * El tiempo con el que empieza un vecino: **el suyo**, su viento dominante,
   * mientras no llegue su METAR. Con el tiempo de casa puesto a mano, ese:
   * quien pide `?viento=290/14` está ensayando y lo quiere en todas partes.
   */
  private tiempoDeUnVecino(quien: Scenario): Meteo {
    const casa = this.scenario.meteo;
    return casa?.fuente === "mano" ? casa : vientoDeCasa(quien.vientoDominante);
  }

  /**
   * **El viento y la presión donde está el avión**, con el parte de cada
   * campo. Ver `tiempoEntreCampos`.
   *
   * Se recalcula dos veces por segundo, que es de sobra para algo que cambia
   * a lo largo de cien kilómetros, y de aquí salen el viento del motor de
   * vuelo, el de la pantalla de navegación y la manga del HUD, y la presión
   * que de verdad hay para el altímetro. Una cuenta para los tres, para que
   * no digan cosas distintas.
   */
  private seguirElViento(dt: number): void {
    this.desdeElViento += dt;
    if (this.desdeElViento < 0.5) return;
    this.desdeElViento = 0;
    const campos = [
      {
        x: this.scenario.runway.x,
        z: this.scenario.runway.z,
        meteo: this.scenario.meteo ?? TIEMPO_DE_CASA,
        cota: this.terrain.cotaDeLaPista(
          this.scenario.runway.x,
          this.scenario.runway.z,
        ),
      },
      ...this.vecinos.map((v) => ({
        x: v.campo.pista.x,
        z: v.campo.pista.z,
        meteo: v.campo.escenario.meteo ?? TIEMPO_DE_CASA,
        cota: this.cotaDePistaEn(v.campo, v.campo.pista.x, v.campo.pista.z),
      })),
    ];
    const p = this.flight.state.position;
    const aqui = tiempoEntreCampos(campos, p.x, p.z);
    this.vientoAqui = aqui;
    this.flight.ponerViento(aqui.aire.x, aqui.aire.z);
    /*
     * **Y el aire del día, con el mismo reparto que el viento.** La
     * temperatura del parte venía en cada campo y no la usaba nadie más que
     * la comandante para decirla: la densidad era siempre la de un día
     * estándar. Ver `atmosphere.ts`.
     */
    this.flight.ponerAire(aqui.delDia);
    this.qnhDelSitio = aqui.qnh;
    /*
     * **Y en los peldaños que no leen cifras, la rueda la gira la
     * instructora.** La ventanilla de presión es de Taguató para arriba; abajo
     * no hay a quién pedirle que la ponga, y un altímetro que se desvía ocho
     * metros por hectopascal al llegar a otro campo enseñaría a desconfiar de
     * él sin saber por qué.
     */
    if (this.tier.instruments === "none" || this.tier.instruments === "pictorial")
      this.qnhPuesta = Math.round(aqui.qnh);
    this.darElAtis();
  }

  /**
   * El aire del día en el campo de casa, con su parte: lo que hay antes de
   * que `seguirElViento` lo reparta entre campos.
   *
   * La primera vez se pregunta antes de que haya terreno, y entonces se da el
   * campo por puesto al nivel del mar: dura hasta el primer repaso, medio
   * segundo después.
   */
  private aireDeCasa(): AireDelDia {
    const meteo = this.scenario.meteo ?? TIEMPO_DE_CASA;
    const r = this.scenario.runway;
    const terreno = this.terrain as Terrain | undefined;
    const cota = terreno ? terreno.cotaDeLaPista(r.x, r.z) : 0;
    return aireDelParte(meteo.temp, cota, meteo.qnh);
  }

  /** Lo que se lleva sin recalcular el viento, s. Ver `seguirElViento`. */
  private desdeElViento = Infinity;

  /** El viento que sopla donde está el avión. Ver `seguirElViento`. */
  private vientoAqui: ReturnType<typeof tiempoEntreCampos> | null = null;

  /**
   * **El ATIS del destino, antes de empezar a bajar.**
   *
   * Es lo que hace todo piloto antes de la llegada: escuchar el parte del
   * campo al que va —pista en uso, viento, visibilidad, nubes, temperatura y
   * QNH— y ponerse el reglaje. Aquí no había nada de eso: el tiempo del
   * destino era el de la salida y no se decía en ningún sitio.
   *
   * De Taguató para arriba, en la tira de la radio y escrito como se imprime
   * en cabina —ver `atisEnTexto`—, a sesenta kilómetros del destino o al pasar
   * un poco de la mitad del camino si la ruta es más corta: lo bastante
   * lejos para ponerse la presión con calma. Abajo no se escribe: ahí el
   * viento lo dice la manga, dibujado.
   */
  private darElAtis(): void {
    if (this.tier.instruments !== "numeric" && this.tier.instruments !== "full")
      return;
    const destino = this.elDestino();
    const s = this.flight.state;
    if (!destino || s.onGround) return;
    const clave = `${this.salidaId}>${destino.id}`;
    if (clave === this.atisDado) return;
    const salida = this.campoPorId(this.salidaId);
    const ruta = salida
      ? Math.hypot(destino.x - salida.x, destino.z - salida.z)
      : Infinity;
    const falta = Math.hypot(destino.x - s.position.x, destino.z - s.position.z);
    if (falta > Math.min(60000, ruta * 0.6)) return;
    this.atisDado = clave;
    const esc = destino.escenario;
    /*
     * **Y donde no hay nadie en la radio, no hay parte que oír**: en Ayolas o
     * en la pista de casa el viento lo dice la manga. Y donde contesta un
     * AFIS, te lo da él, con su nombre. Ver `atisEnTexto`.
     */
    if (sinTorre(esc.aerodrome)) return;
    this.hud.radio(
      atisEnTexto(
        destino.oaci ?? esc.aerodrome?.id ?? destino.id,
        cabeceraEnUso(esc),
        esc.meteo ?? TIEMPO_DE_CASA,
        esc.magneticVariation ?? 0,
        esAfis(esc.aerodrome) ? "AFIS" : "ATIS",
      ),
      14,
      null,
    );
  }

  /** De qué tramo se dio ya el ATIS. Ver `darElAtis`. */
  private atisDado = "";

  /**
   * **«Vacate next available»**: te pasaste la salida y la raya ya va por la
   * siguiente.
   *
   * El plan rehacía la raya en silencio —ver `salidasPasadas`—, y quien se
   * había pasado la salida no sabía si seguir, frenar o dar la vuelta, que
   * en una pista no se hace. Una torre lo dice con esas palabras: abandone
   * por la próxima disponible. De Taguató para arriba la dice ella; abajo,
   * la instructora en casa y con calma, que pasarse una salida es lo más
   * corriente del mundo. Y la tarjeta con la salida dibujada, en los cuatro.
   */
  private decirSalPorLaSiguiente(): void {
    const dicho = this.avisoCon(
      "vuelo.salidaSiguiente",
      "palabra.salidaSiguiente",
    );
    this.hud.senal.mostrar("salida", dicho.rotulo, null, { segundos: 4 });
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    // Un AFIS no te manda salir por ninguna: lo cuenta la instructora.
    if (conCifras && this.hayTorreQueHable() && !this.esAfisAqui())
      this.porRadio("vacate next available", "mando", undefined, true);
    else this.instructor.decir(dicho.texto, dicho.id, "normal");
  }

  /**
   * **«Hace calor: vamos a necesitar más pista»**, antes de despegar, cuando
   * pesa. Ver `flight/caliente-y-alto.ts`, que es quien decide si pesa.
   *
   * Solo en los peldaños que leen cifras: la instructora lo dice y la tarjeta
   * lo pone con los números —la temperatura y cuánta más carrera hace falta,
   * y la altitud de densidad en la cabina que vuela en pies—. Abajo el calor
   * también alarga la carrera, y se vuela igual, sin contarlo: todavía no hay
   * número que leer.
   *
   * Una vez por despegue: se rearma al estar en el aire. Un aviso vuelve
   * cuando pasa otra vez lo que avisa, no cuando pasa un rato.
   */
  private decirElCalor(): void {
    if (this.calorDicho) return;
    this.calorDicho = true;
    if (!canalesDe(this.tier.avisos).cifra) return;
    const campo = this.elCampo();
    const calor = calorQuePesa(
      this.aircraft,
      campo.escenario.meteo ?? TIEMPO_DE_CASA,
      this.cotaDelCampo(campo),
      this.superficie,
    );
    if (!calor) return;
    const idioma = getLocale() === "gug" ? "es-PY" : getLocale();
    const cifras = {
      grados: String(Math.round(calor.grados)),
      mas: String(Math.round(calor.masLarga * 100)),
      pies: (Math.round(calor.alturaDeDensidad / 0.3048 / 100) * 100).toLocaleString(
        idioma,
      ),
    };
    const rotulo =
      this.tier.units === "aeronautical"
        ? t("calor.tarjetaCabina", cifras)
        : t("calor.tarjeta", cifras);
    this.hud.senal.mostrar("calor", rotulo, null, { segundos: 6 });
    this.instructor.decir(t("vuelo.calor"), "vuelo.calor", "normal");
  }

  /** Si ya se dijo el calor en este despegue. Ver `decirElCalor`. */
  private calorDicho = false;

  /**
   * **Y si toca decirlo en cuanto quede sitio.** La fase que da la pista pone
   * su propia tarjeta en ese mismo fotograma —«alineá», «acelerá»—, y lo del
   * calor, puesto a la vez, se borraba antes de verse. Un suceso, una voz, y
   * una tarjeta: primero lo que hay que hacer, y en cuanto se ha visto, el
   * porqué de que hoy la carrera sea más larga. Si el avión se va al aire
   * antes, ya no se dice: ya no hay carrera que alargar.
   */
  private calorPorDecir = false;

  /** Con qué plan y cuántas salidas pasadas se llevan dichas. */
  private salidasDichas: {
    plan: PlanDeVuelo | null;
    cuantas: number;
    /** Si ya se dijo en esta carrera en tierra. */
    dicha: boolean;
  } = { plan: null, cuantas: 0, dicha: false };

  /**
   * **Nuestro avión es Zulu Papa…**: la instructora presenta la matrícula al
   * empezar, una vez por avión.
   *
   * La torre te llama por tu matrícula en el alfabeto, y hasta aquí nadie te
   * había dicho cuál era: «cuando se dirigen a mí desde la torre "Zulu, Echo,
   * Juliett, Juliett… permiso para despegar" ¿cómo sé que soy yo?». Se dice
   * al principio, con las mismas piezas del alfabeto que usa la torre, y la
   * placa del cuadro se enciende a la vez: lo que se oye y lo que se ve son
   * lo mismo. Solo donde hay torre que vaya a llamarte.
   */
  private presentarLaMatricula(): void {
    if (!this.leccion.torre) return;
    const yo = this.miIndicativo;
    if (this.matriculaPresentada === yo.matricula) return;
    this.matriculaPresentada = yo.matricula;
    this.instructor.decir(
      t("vuelo.nuestroAvion", { indicativo: yo.dicho }),
      "vuelo.nuestroAvion",
      "normal",
      rellenoDe(yo),
    );
    this.hud.destacarMatricula();
  }

  /** De qué matrícula se dijo ya cuál era. Ver `presentarLaMatricula`. */
  private matriculaPresentada: string | null = null;

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
    // Una nube que llueve es más gorda: ver `grosorDeLaCapa`.
    this.colocarLaCapa();
    const espesa =
      clase === "nada"
        ? 0
        : (clase === "llovizna" ? 0.4 : 1) * (0.3 + 0.7 * fuerza);
    /*
     * **Y la visibilidad del parte pone el mínimo.** Se leía del METAR y no la
     * miraba nadie: con «4000 RA BKN010» se veía el Teide a veinte kilómetros.
     * Con esta niebla —exponencial al cuadrado— lo que está a la distancia del
     * parte se funde con el horizonte al noventa y cinco por ciento, que es lo
     * que quiere decir «visibilidad cuatro kilómetros». Solo por debajo de
     * diez: «9999» es «diez o más», y ahí manda el horizonte de siempre. La
     * lluvia puede cerrarlo más, nunca abrirlo.
     */
    const porElParte =
      this.visibilidadDelParte < 10000 ? 1.73 / this.visibilidadDelParte : 0;
    /*
     * La bruma de siempre se queda abajo —ver `brumaALaAltura`— y lo que
     * pone la lluvia o el parte no: por encima de un aguacero no se sale
     * subiendo quinientos metros, y la visibilidad del parte es el mínimo.
     */
    this.sky.ponerNiebla(
      this.nieblaDeCasa,
      Math.max(espesa > 0 ? this.nieblaDeCasa * (1 + espesa * 5) : 0, porElParte),
    );
  }

  /**
   * **Las fotos que llegan con el juego ya en marcha**: los anillos de en
   * medio y del horizonte, y las de los campos vecinos.
   *
   * No hacen falta para despegar —pintan mallas que ya existen—, y en un
   * teléfono de gama baja con 3G eran cinco de los diez megas que había que
   * bajar antes de ver nada: cincuenta y cuatro segundos hasta poder jugar en
   * Pettirossi. La foto base se queda en el arranque, porque decide dónde se
   * plantan árboles y si se dibujan casas. Ver la carga en `main.ts`.
   *
   * Partir el anillo rehace sus mallas sin textura, así que después de partir
   * se vuelve a pintar lo que hubiera.
   */
  ponerAnillos(anillos: { horizonte?: Ortofoto; medio?: Ortofoto }): void {
    if (anillos.horizonte) this.anilloHorizonte = anillos.horizonte;
    if (anillos.medio && !this.anilloMedio) {
      this.anilloMedio = anillos.medio;
      this.anilloPartido = this.terrain.partirElHorizonte(
        (anillos.medio.ficha.tamanoM ?? 0) / 2,
      );
    }
    if (this.anilloHorizonte) {
      this.terrain.ponerOrtofotoLejana(
        this.anilloHorizonte,
        exposicionDe(this.anilloHorizonte.ficha),
      );
      // Y el borde de la foto de cada vecino, fundido con esta. Ver
      // `MundoVecino.fundirConElHorizonte`.
      for (const v of this.vecinos)
        v.mundo.fundirConElHorizonte({
          textura: this.anilloHorizonte.textura,
          uv: this.anilloHorizonte.uv,
          exposicion: exposicionDe(this.anilloHorizonte.ficha),
        });
    }
    if (this.anilloPartido && this.anilloMedio)
      this.terrain.ponerOrtofotoLejana(
        this.anilloMedio,
        exposicionDe(this.anilloMedio.ficha),
        "horizonte-medio",
      );
  }

  private anilloHorizonte: Ortofoto | undefined;
  private anilloMedio: Ortofoto | undefined;
  private anilloPartido = false;

  /** La foto del vecino `i`, cuando llegue. Ver `ponerAnillos`. */
  ponerFotoDelVecino(i: number, foto: Ortofoto): void {
    this.vecinos[i]?.mundo.ponerFoto(foto);
  }

  /**
   * La rejilla de ciudad del vecino `i`, cuando llegue: sus luces de noche.
   * Ver `MundoVecino.ponerLuces`.
   */
  ponerCiudadDelVecino(i: number, ciudad: Ciudad): void {
    const v = this.vecinos[i];
    if (!v) return;
    v.mundo.ponerLuces(
      ciudad,
      zonaDeAeropuerto(v.campo.escenario, 60),
      v.campo.escenario.waterLevel,
    );
    // Y en el plano, que la ciudad de llegada también se busca en él.
    this.hud.mapa.ponerOtraCiudad(
      ciudad,
      v.mundo.desplazamiento.x,
      v.mundo.desplazamiento.z,
    );
  }

  /** La visibilidad del último parte, m. Ver `ponerLluvia`. */
  private visibilidadDelParte = 10000;

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
    const ojo = this.camera.position;
    const viento = this.vientoAqui?.aire;
    /*
     * **Solo donde cae.** Debajo de la capa, toda la del parte; por encima
     * del techo, nada —«sobre las nubes no llueve»—. Salvo dentro de un
     * cumulonimbo, que es una torre: en tormenta, donde el radar pinta la
     * célula llueve a cualquier altura. Ver `lluviaALaAltura`.
     */
    const aqui = (x: number, y: number, z: number): number =>
      lluviaALaAltura(
        y,
        this.capaDeNubes,
        this.lloviendo.clase === "tormenta" && ecoEn(this.celdas, x, z) >= 0.18,
      );
    const caeDondeElOjo = aqui(ojo.x, ojo.y, ojo.z);
    const alumbra = this.lluvia.paso(dt, {
      camara: ojo,
      velocidad: this.flight.state.velocity,
      ...(viento ? { viento } : {}),
      aqui: caeDondeElOjo,
      // Desde la cabina, lo que cae a dos metros y medio de los ojos cae
      // dentro de la cabina: ahí no llueve.
      hueco: this.cameraMode === "cockpit" ? 2.5 : 0,
    });
    /*
     * **Y la nube que pasa.** Cerca de la capa —de doscientos metros por
     * debajo de la base a doscientos por encima del techo— los jirones, que
     * es lo que dice que se está atravesando. Ver `world/jirones.ts`.
     */
    const capa = this.capaDeNubes;
    this.jirones.paso(dt, {
      camara: ojo,
      ...(viento ? { viento } : {}),
      densidad: (x, y, z) => this.sky.densidadEn(x, y, z),
      color: this.sky.colorDeLaNube,
      cerca:
        capa !== null && ojo.y > capa.base - 200 && ojo.y < capa.techo + 200,
    });
    /*
     * **Y el cristal mojado, desde la cabina.** Lo moja la lluvia que cae
     * aquí y la propia nube, que es agua: al atravesarla el parabrisas se
     * llena de gotas aunque no llueva. Ver `world/gotas-en-el-parabrisas.ts`.
     */
    const s = this.flight.state;
    const cuanta =
      this.lloviendo.clase === "nada"
        ? 0
        : this.lloviendo.clase === "llovizna"
          ? 0.35
          : 0.55 + 0.45 * this.lloviendo.fuerza;
    this.gotas.paso(dt, {
      camara: this.camera,
      mojado: Math.min(
        1,
        cuanta * aqui(s.position.x, s.position.y, s.position.z) +
          0.6 * this.sky.enLaNube,
      ),
      velocidad: s.airspeed,
      desdeDentro: this.cameraMode === "cockpit",
    });
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
      // Y encima de las nubes no se oye llover, que tampoco llueve.
      aqui(s.position.x, s.position.y, s.position.z),
    );
  }

  /** Lo que alumbraba el rayo del fotograma anterior. Ver `pasoDeLluvia`. */
  private fogonazoAnterior = 0;

  ponerTecho(techoM: number | null, tapadura: number): void {
    this.techoDeNubes = techoM;
    this.tapaduraDeNubes = tapadura;
    this.colocarLaCapa();
  }

  /**
   * **La capa entera, con su grosor**: el cielo la dibuja, la lluvia sabe
   * dónde deja de caer y la ventanilla qué tapa. Se rehace con el techo y con
   * la lluvia, porque el grosor depende de si llueve: ver `grosorDeLaCapa`.
   */
  private colocarLaCapa(): void {
    const capa = capaDelParte(
      this.techoDeNubes === null
        ? null
        : (this.terrain?.runwayElevation ?? 0) + this.techoDeNubes,
      this.tapaduraDeNubes,
      this.lloviendo.clase,
    );
    this.capaDeNubes = capa;
    this.ventanilla.ponerNubes(capa);
    if (!this.sky) return;
    ponerNubes(
      this.sky,
      capa?.base ?? null,
      this.tapaduraDeNubes,
      capa ? capa.techo - capa.base : undefined,
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
    // En casa, que es donde se practica: el plan vuelve a ella si se había
    // mudado a otro campo.
    this.mudarElPlanA(this.laCasa);
    this.plan?.reiniciar();
    this.colocarSenalero();
    /*
     * **Y un avión de los grandes empieza la final como la empieza de verdad:
     * configurado.** Tren fuera, flaps de aterrizaje y su velocidad de
     * aproximación. Arrancaba limpio y a vez y media de ella —que en la
     * avioneta es lento y en un reactor es disparatado—: medido en Tenerife
     * Norte, el JAZ 90 empezaba a 199 nudos con flaps arriba, bajaba a 39 m/s y
     * a los diez segundos estaba en el suelo a 225. La lección de aterrizar no
     * se podía jugar con él. Los de tren fijo siguen como estaban: su final
     * está afinada así.
     */
    const configurado = this.aircraft.trenRetractil;
    const entrada = configurado
      ? this.aircraft.approachSpeed * 1.1
      : this.flight.velocidadDeEntradaEnFinal(this.aircraft.approachSpeed);
    this.flight.reset({
      position: this.startPosition(),
      heading: MathUtils.degToRad(runway.heading),
      airspeed: entrada,
    });
    if (this.campoMontado !== this.scenario.id) this.montarElCampo(this.laCasa);
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
    this.cargaDeFlaps = FLAPS_SANOS;
    this.input.topeDeFlaps = 1;
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
    if (configurado) {
      // El tren ya viene fuera y con su palanca abajo desde `resetFlight`.
      // Los flaps, también abajo: la final empieza configurada, no
      // configurándose. Ver `flight/flaps.ts`.
      if (this.aircraft.llevaFlaps) {
        this.input.ponerPalancaDeFlaps(1);
        this.input.controls.flaps = 1;
      }
    }
    this.input.controls.throttle = this.flight.gasPara(entrada);
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
    this.huecos.reiniciar();
    this.ventanilla.reiniciar();
    // Y lo que se estaba mirando, con ella: vuelo nuevo, cabeza al frente.
    this.loSenalado = null;
    this.mirada.reiniciar();
    this.reiniciarLaVentanillaAlt();
    // Vuelo nuevo: el primer turbohélice vuelve a esperar su rato.
    this.islenos?.reiniciar();
    this.loMasAltoDelVuelo = 0;
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
  private rumboDeSalida(
    desde: Vector3,
    campo: CampoEnElMundo = this.laCasa,
  ): number {
    const hacia = this.plan?.primerPaso();
    if (!hacia) return MathUtils.degToRad(campo.pista.heading);
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
    const r = this.laPistaDeAhora();
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
      this.terrain.llevarElAguaA(this.camera.position.x, this.camera.position.z);
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
    /*
     * **Y el del campo en el que se está, no siempre el de casa.** Esto
     * preguntaba por el aeródromo de salida, y en el de llegada no hay nada
     * suyo a ciento y pico kilómetros: la pista, las calles y la plataforma
     * del destino eran todas «campo». Se aterrizaba y se rodaba por el
     * asfalto de Los Rodeos con el rozamiento de un prado. Ver
     * `superficie.test.ts`.
     */
    const aqui = this.elVecinoDeAhora();
    this.superficie = superficieEn(
      aqui?.campo.comoCampo ?? this.scenario,
      aqui ? aqui.pavimento : this.pavimento,
      this.flight.state.position.x,
      this.flight.state.position.z,
    );
    this.flight.ponerSuperficie(this.superficie);
    /*
     * **Y si la pista está mojada**: llueve donde está el avión. La rueda
     * agarra menos, y menos cuanto más deprisa va. Ver `flight/frenada.ts`.
     */
    this.flight.ponerPistaMojada?.(this.lloviendo.clase !== "nada");

    // El interruptor de tierra/aire del tren: con el peso encima, la palanca
    // no lo mete. Ver `alternarTren` en `flight/input.ts`.
    this.input.pesoEnLasRuedas = this.flight.state.onGround;
    // Y a qué velocidad corre: los frenos de tierra salen solos corriendo, no
    // rodando por la plataforma. Ver `flight/palanca-de-aerofrenos.ts`.
    this.input.velocidadEnElSuelo = this.flight.state.groundSpeed;
    // Y hasta dónde pueden bajar los flaps: el alivio de carga o unos flaps
    // tocados. Antes de mover los mandos, que es quien los lleva.
    this.atenderALosFlaps(dt);
    /*
     * **Y lo que ve la mano del teclado y del dedo**, antes de mover los
     * mandos: en el aire, la tecla y el dedo le piden un ritmo o un sitio, y
     * ella sostiene lo conseguido. Con el piloto de pruebas no: el banco
     * escribe en los mandos como siempre. Ver `flight/mano.ts`.
     */
    this.input.ponerAvion(this.pilotoDePruebas ? null : this.loQueVeLaMano());
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
      /*
       * Con un instrumento abierto —el plano, el tiempo— el avión se mantiene
       * recto **mientras nadie lo pilote**. Ver `mantenerElVueloRecto`.
       *
       * Y va **después** del piloto automático y solo si no está puesto: el
       * automático ya lleva el avión, y lo lleva mejor. Iba antes y escribiendo
       * en los mandos de la persona, y el automático los leía como si alguien
       * hubiera tocado la palanca: abrir el mapa lo soltaba, con su alarma.
       */
      let mandos = this.conElPilotoAutomatico(dt);
      // La nivelada de los peldaños de abajo, si no manda el automático.
      if (!this.pilotoPuesto) mandos = this.sostenerElNivel(dt, mandos);
      if (this.hayInstrumentoAbierto && !this.pilotoPuesto && !this.nivelada)
        mandos = this.mantenerElVueloRecto(mandos);
      this.flight.step(dt, mandos);
      this.mirarSiChocaConAlgo();
    }
    this.quemarCombustible(dt);
    this.atenderALaCabina(dt);
    this.seguirElViento(dt);
    this.mirarLaCabecera();
    this.mirarSiCambiaDeCampo();
    this.avisarDeLosBultos(dt);

    /*
     * **La cuenta de la toma, con lo que marca el radioaltímetro.**
     *
     * Se dice **y** se enseña: hay quien juega en silencio, hay quien tiene la
     * pestaña muteada y hay quien no oye. La voz acompaña; el número manda.
     *
     * Lo que se le da a la cuenta es lo que mediría un radar de verdad —las
     * ruedas sobre el suelo que hay debajo, hasta dos mil quinientos pies— y
     * si esto es una aproximación: la zona de llegada de la pista en uso o
     * encima de ella. Lo demás —solo bajando, una vez por aproximación, nunca
     * con peso en las ruedas— lo decide ella. Ver `flight/avisos-de-altura.ts`.
     */
    const ya = this.flight.state;
    this.radioAltura = radioaltimetro(
      ya.heightAboveGround,
      this.aircraft.gearHeight,
    );
    const lectura: Lectura = {
      radioAltura: this.radioAltura,
      enTierra: ya.onGround,
      enAproximacion:
        enLaZonaDeAproximacion(
          this.laPistaDeAhora(),
          ya.position.x,
          ya.position.z,
          ya.heading,
        ) || this.sobreLaPista(),
      vertical: ya.verticalSpeed,
      altitud: ya.position.y,
    };
    const aviso = this.avisosDeAltura.paso(lectura);
    if (aviso) this.cantarLaCuenta(aviso);
    this.acompanarLaRecogida(lectura);
    /*
     * **Y si en esta toma ya se ha tocado tierra, con las ruedas.**
     *
     * La máquina de fases da el avión por «aterrizado» a doce metros del
     * suelo —es lo que la protege de un bote—, y de ahí colgaban el «frená» y
     * el «ya podés tocar». Medido con el volcado de voces del JAZ 90 en Los
     * Rodeos, con el radioaltímetro al lado: «thirty», **«frená»**, «twenty»,
     * «ten»… y después, ya rodando, «quitá el gas», que había esperado en la
     * cola detrás del «frená». Pedirle frenar a quien todavía vuela y decirle
     * lo del aire a quien ya rueda son la misma avería que el «cinco» de la
     * queja.
     *
     * Así que se apunta el contacto de verdad, y se queda apuntado hasta
     * volver a subir de verdad —treinta metros—, que un bote no es un vuelo.
     */
    if (ya.onGround) {
      if (!this.yaTocoTierra) this.alTocarTierra();
      this.yaTocoTierra = true;
    } else if (ya.heightAboveGround - this.aircraft.gearHeight > 30) {
      this.yaTocoTierra = false;
    }

    /*
     * **Y el número en grande, que es otro peldaño.**
     *
     * Salía siempre, en los cuatro tramos y en los seis escalones de la cuenta
     * atrás: a los cuatro años, un «30» apareciendo en el centro de la pantalla
     * mientras se recoge no es información, es una cosa que parpadea. Los
     * números son el peldaño de Taguato —150, 100 y 50 sobre la pista, tres
     * veces y grandes— y ahí sí enseñan a leer una altura. Ver
     * `flight/escalera.ts`.
     *
     * Con la misma lectura que la cuenta: el número en grande usa la misma
     * máquina, y con otras guardas parpadeaba tantas veces como se cantaba.
     */
    const grande = this.alturaEnGrande.paso(lectura);
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
    /*
     * **Y sobre el asfalto de la pista no hay banda. Ni voz, ni color.**
     *
     * Se calcula aquí arriba y no diez líneas más abajo porque la vez anterior
     * se calculó abajo y **solo calló a la voz**: la banda se seguía pintando,
     * y en los peldaños de los pequeños la banda *es* el aviso —la tortuga se
     * pone en rojo y no hay ninguna frase que matizar—. Contado jugando, con
     * el de fuselaje ancho en la cabecera a ochenta y dos nudos: «¿voy muy
     * rápido? ¡¿en serio!?».
     *
     * Y llevaba razón. A esa velocidad la banda de aproximación dice «lento»
     * —viene a la mitad de su Vref—; la que decía «rápido» era la de
     * **rodaje**, que avisa desde los veintitrés nudos y que se creía en una
     * calle porque la fase todavía no había pasado a «aterrizado» en el
     * instante en que las ruedas tocan. Una banda para rodar juzgando una toma.
     *
     * La regla ya estaba escrita y ya estaba explicada; lo que faltaba era
     * aplicarla donde se ve. Ver `bandaDeAhora`.
     */
    const enElAsfalto =
      this.flight.state.onGround && this.flight.state.onRunway;
    let banda = bandaDeAhora(
      {
        // Las ruedas sobre el suelo, que es lo que separa la recogida del
        // resto de la final. Ver `bandaDeVelocidad`.
        sobreElSuelo: Math.max(
          0,
          this.flight.state.heightAboveGround - this.aircraft.gearHeight,
        ),
        enElSuelo: this.flight.state.onGround,
        enLaPista: this.flight.state.onRunway,
        vertical: this.flight.state.verticalSpeed,
        /*
         * **Y rodando, la del suelo.** Iba la del aire en los dos casos, y
         * rodar se mide contra el suelo —ver `groundSpeed` en `model.ts`: «lo
         * que hace volar es el aire; lo que hace avanzar es el suelo»—. Con
         * doce nudos de cara, rodar a nueve metros por segundo son quince de
         * aire, y el juego decía «más despacio» a quien rodaba a paso: en el
         * circuito de Los Rodeos con el JAZ 90, hasta cinco veces en la
         * vuelta. En el aire las dos bandas de volar siguen con la del aire,
         * que es la que sostiene el ala.
         */
        velocidad: this.flight.state.onGround
          ? this.flight.state.groundSpeed
          : this.flight.state.airspeed,
      },
      this.aircraft.approachSpeed,
      // Correr es despegar o aterrizar. Lo demás, en el suelo, es rodar.
      CORRIENDO.has(this.faseDeAhora),
      /*
       * **Y volando el circuito, la de circuito de este avión.** Nadie la
       * pedía, y el circuito se volaba a lo que diera el gas: con un reactor,
       * a doscientos treinta nudos y tres kilómetros de radio de viraje. Por
       * el mismo camino que la de aproximación —el color de la tortuga, la
       * instructora y, sin gas que quitar, los flaps—, y solo donde el
       * circuito va dibujado. Ver `bandaDeCircuito`.
       */
      this.laAproximacion.enElCircuito
        ? this.aircraft.velocidadDeCircuito
        : null,
      // Y la de antes, para que salir de la banda no sea rozar su borde.
      this.bandaDeAhora,
    );
    /*
     * **Y hacia dónde va la aguja**, filtrada en un segundo: el aviso de
     * velocidad miraba dónde estaba y no hacia dónde iba. Ver
     * `yaLoEstaCorrigiendo`.
     */
    if (dt > 0) {
      const acel = (this.flight.state.airspeed - this.velocidadAntes) / dt;
      const k = Math.min(1, dt / 1);
      this.tendenciaDeVelocidad += (acel - this.tendenciaDeVelocidad) * k;
    }
    this.velocidadAntes = this.flight.state.airspeed;
    /*
     * **Y sin motor, la de mejor planeo hasta estar en final.** La de
     * aproximación mira la altura y si se baja, y sin motor se baja siempre:
     * a diez kilómetros de la pista juzgaba el planeo con la vara de posarse.
     * Ver `bandaSinMotor`.
     */
    let sinMotorDe: "planeo" | "aproximacion" | null = null;
    if (this.sinMotor) {
      const s = this.flight.state;
      const b = bandaSinMotor({
        enElSuelo: s.onGround,
        enFinal: this.enFinalPor.enUso !== null || this.enFinalPor.otra !== null,
        deSiempre: banda,
        indicada: indicatedAirspeed(
          s.airspeed,
          s.position.y,
          this.flight.aireDelDia(),
        ),
        planeo: planeoDe(this.aircraft),
      });
      banda = b.banda;
      sinMotorDe = b.de;
    }
    this.bandaDeAhora = banda;
    this.hud.setBandaDeVelocidad(banda);
    this.hud.mostrarFps(dt, {
      llamadas: this.renderer.info.render.calls,
      triangulos: this.renderer.info.render.triangles,
    });
    /*
     * Y con la banda callada en la pista, aquí solo queda olvidar la cuenta.
     *
     * Es el cuarto arreglo del mismo «Más despacio», y los tres anteriores
     * fueron en el sitio equivocado: primero el aviso de rodaje de
     * `plan-de-vuelo` —que ya miraba `onRunway` y que no era el que hablaba—,
     * después este lazo, que calló la voz y dejó el color puesto. El sitio
     * bueno es de dónde sale el veredicto, arriba, porque de ahí beben los
     * dos. Ver `enElAsfalto`.
     *
     * «Lo que quiero es que cuando despego no me diga una voz "más despacio",
     * que llevo un millón de veces que te lo digo.» Y llevaba razón las cuatro.
     */
    if (enElAsfalto) {
      // Y se olvida lo acumulado: al salir de la pista se empieza a contar de
      // cero, que si no el aviso salta en la primera curva de la calle por lo
      // que pasó en la carrera.
      this.fueraDeBanda = 0;
      this.dichoDeBanda = null;
    }
    if (!enElAsfalto && (banda === "lento" || banda === "rapido")) {
      this.fueraDeBanda += dt;
      if (
        this.fueraDeBanda > 3 &&
        this.dichoDeBanda !== banda &&
        !yaLoEstaCorrigiendo(banda, this.tendenciaDeVelocidad)
      ) {
        this.dichoDeBanda = banda;
        /*
         * **Sin motor, la velocidad sale de la nariz.** «Venís lento: metéle
         * gas» a un avión sin motor era el consejo de un vuelo que ya no
         * existe: «¿cómo es que la instructora me dice que acelere, que voy
         * despacito?». Lento es bajar la nariz, en los dos tramos; rápido
         * lejos de la pista es levantarla, que así se llega más lejos. Rápido
         * ya en final sigue por abajo, con los flaps, como siempre. Lo dice la
         * instructora en los cuatro peldaños: no hay canto de cabina que diga
         * esto, y es la voz de la calma. Ver `queSeDiceSinMotor`.
         */
        const sinMotorDice = sinMotorDe
          ? queSeDiceSinMotor(
              { banda, de: sinMotorDe },
              this.flight.state.onGround,
            )
          : null;
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
          // En el avión que no los lleva, el consejo sería tocar un mando
          // que no tiene: ahí se dice la velocidad a secas, abajo.
          this.aircraft.llevaFlaps &&
          !this.flight.state.onGround &&
          banda === "rapido" &&
          // Sin motor no hay gas que quitar, esté donde esté la palanca.
          (this.input.controls.throttle < 0.25 || this.sinMotor) &&
          // Lo pedido y no dónde están: si ya bajaste la palanca, los flaps
          // están saliendo y pedírtelos otra vez sería avisar de lo hecho.
          this.input.palancaDeFlaps < 0.5 &&
          /*
           * **Y por debajo de su tope.** Pedir flaps pasado de su placa es
           * pedir que se rompan, y el juego avisa justo de eso en cuanto
           * salen. Con la banda solo en final no llegaba a pasar —una Vref y
           * cuarto cae por debajo del tope en toda la flota—; en el circuito
           * sí, que ahí «rápido» empieza bastante más arriba. Por encima, lo
           * que se dice es la velocidad a secas: primero gas y paciencia.
           *
           * Y el tope es **el de la muesca que se va a pedir**, que es la de
           * después de la palanca: la primera de un reactor aguanta mucho más
           * que la de aterrizaje. Ver `vfePorMuesca`.
           */
          this.flight.state.airspeed * NUDOS <
            vfeDeLaMuesca(
              this.aircraft.vfePorMuesca,
              siguienteDetente(this.input.palancaDeFlaps),
            );
        if (sinMotorDice) {
          this.hud.senal.mostrar(
            "senda",
            this.rotulo(
              sinMotorDice,
              sinMotorDice === "vuelo.planeoLento"
                ? "palabra.baja"
                : "palabra.subi",
            ),
            null,
            { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
          );
          this.instructor.decir(t(sinMotorDice), sinMotorDice);
        } else if (sinGasQueQuitar) {
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
        } else if (
          queSeDice(banda, this.flight.state.onGround) === "vuelo.lentoYBajo" &&
          // Sin motor no se pide gas: lo lento ya lo dijo la rama de arriba.
          !this.sinMotor &&
          /*
           * **Y no a un palmo del suelo.** En la recogida se va despacio a
           * propósito —se está posando—, y con un rebote las ruedas quedan un
           * instante en el aire: en Pedro Juan salía «Venís lento: metéle
           * gas» ya rodando por la pista. Por debajo de quince metros no se
           * pide gas, que es la misma altura a la que calla el PAPI.
           */
          this.flight.state.heightAboveGround > 15
        ) {
          /*
           * **Venís lento: metéle gas.** Y esta rama faltaba entera.
           *
           * Aquí ponía una sola línea —«en el suelo, más despacio; en el aire,
           * vas muy rápido»— que **no miraba la banda**. Y el `if` de arriba
           * entra con las dos: `lento` y `rapido`. O sea que volando despacio,
           * el juego decía «vas muy rápido».
           *
           * No es un mensaje mal elegido: es el consejo contrario al que salva
           * la vida. Quien lo oye baja el gas, y bajar el gas yendo lento en
           * aproximación es exactamente cómo se entra en pérdida a cien metros
           * del suelo. Contado jugando, con el de fuselaje ancho a ciento
           * dieciséis nudos sobre una Vref de ciento cuarenta y seis: «¿es
           * serio, esto es ir muy rápido?» — y, después de obedecer: «me hace
           * ir tan lento que me caigo al agua».
           *
           * Medido con el instrumento de cantos, que es lo que lo encontró:
           * `airspeed→vuelo.rapido [118 kt · vref 146 · 154 m]`.
           *
           * La frase ya existía —`vuelo.lentoYBajo`, «venís lento: metéle
           * gas»— y no la decía nadie. Y el dibujo es el del motor, que es el
           * mando que hay que tocar: en este peldaño no se lee, así que lo que
           * enseña es **qué mando**, no qué pasa.
           *
           * En el suelo no hay rama de lento porque la banda de rodaje no la
           * tiene: rodar despacio no tiene nada de malo. Ver `bandaDeRodaje`.
           */
          this.hud.senal.mostrar(
            "motor",
            this.rotulo("vuelo.lentoYBajo", "palabra.gas"),
            null,
            { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
          );
          this.cantar(
            "airspeed low",
            t("vuelo.lentoYBajo"),
            "vuelo.lentoYBajo",
          );
        } else {
          // Y el resto, también de `queSeDice`: la decisión vive en un solo
          // sitio y tiene prueba. Ver `flight/velocidad-de-aproximacion.ts`.
          const suave = queSeDice(banda, this.flight.state.onGround);
          // Y rodando donde el juego lleva el gas, la banda se ve pero no
          // riñe: esa velocidad no es de quien juega. Ver
          // `laVelocidadEsDelJuego`.
          if (suave && !this.laVelocidadEsDelJuego())
            this.cantar(
              this.flight.state.onGround ? "slow down" : "airspeed",
              t(suave),
              suave,
            );
        }
      }
    } else {
      this.fueraDeBanda = 0;
      /*
       * **Y lo dicho se olvida cuando cambia algo, no cuando se roza.** Vuelve
       * a poder decirse al volver a la banda de verdad —por el umbral de
       * dentro—, al tocar el suelo o al dejar de aproximar. Se olvidaba con
       * cualquier fotograma fuera de «lento» o «rápido», y un avión que
       * nivelaba un instante —la banda se calla si no se baja— volvía a oír
       * el mismo aviso tres segundos después.
       */
      if (
        banda === "bien" ||
        this.flight.state.onGround ||
        this.flight.state.heightAboveGround > 400
      )
        this.dichoDeBanda = null;
    }

    this.atenderAlTren();
    this.atenderALaListaDeAterrizaje();

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
       *
       * **Y «final» es venir por el embudo, no solo lo que diga la fase.** La
       * fase entra en «final» bajando, así que quien viene alineado y
       * nivelado todavía no está en ella —y hasta que dejó de salirse al
       * nivelarse, ver `SUBIDA_QUE_SACA_DE_FINAL` en `vuelo.ts`, una final a
       * Los Rodeos soltaba «too low» cinco veces en diez segundos—. Es la
       * misma lección que ya está escrita para el circuito: venir a aterrizar
       * es venir por el embudo. Por debajo de la mitad de la senda sigue sin
       * haber excusa.
       *
       * **Y por el embudo quiere decir hacia la pista**, alineado. El embudo
       * solo mira la posición: cruzarlo de través por encima de media senda
       * callaba el aviso de terreno entero y armaba el detector de
       * frustradas. Ver `vieneEnFinal`.
       */
      enFinal:
        (this.faseDeAhora === "final" ||
          vieneEnFinal(
            this.laPistaDeAhora(),
            this.flight.state.position.x,
            this.flight.state.position.z,
            this.flight.state.heading,
          ) !== null ||
          /*
           * **Y por la otra punta también es venir a aterrizar.** Sin esto el
           * aviso de terreno cantaba «too low» a quien se alinea con la
           * cabecera contraria, y la frustrada que la torre le manda hacer no
           * se reconocía. Ver `flight/la-otra-cabecera.ts`.
           */
          this.enFinalPor.otra !== null) &&
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
      /*
       * **Y puesto para aterrizar: tren, flaps y ritmo de bajada.**
       *
       * Los tres a la vez, porque cada uno solo miente. El tren fuera puede
       * ser que se te olvidó meterlo; los flaps fuera, que vas lento; y bajar
       * despacio, cualquier cosa. Juntos no hay otra lectura posible: eso es
       * un avión aterrizando.
       *
       * El ritmo va con el mismo número que usan los mínimos para decir que
       * una aproximación se ha ido de las manos —`MARGENES.cayendo`— y no con
       * uno nuevo: caer más que eso no es aterrizar, sea cual sea la
       * configuración, y ahí el aviso tiene que seguir. Ver
       * `puestoParaAterrizar` en `flight/aviso-de-terreno.ts`.
       */
      puestoParaAterrizar:
        this.input.controls.tren > 0.9 &&
        /*
         * Los flaps fuera son el «vas lento» de los tres. En el avión que no
         * los lleva lo dice la velocidad, que es lo que ellos decían: la de
         * aproximación y poco más. Sin esto, en el fumigador no había forma
         * de estar puesto para aterrizar.
         */
        (this.aircraft.llevaFlaps
          ? this.input.controls.flaps > 0.3
          : this.flight.state.airspeed < this.aircraft.approachSpeed * 1.2) &&
        this.flight.state.verticalSpeed > MARGENES.cayendo,
    };
    /*
     * **Y lo que viene por delante**, en el avión que lo mira. El aviso de
     * debajo se calla en final y por encima de ciento veinte metros, y así
     * llegando a La Palma por la final recta de la 18, a mil ochocientos pies
     * sobre la ladera de Barlovento, no sonó nada: «que me avise, que tengo
     * una montaña bien grande delante». Ver `flight/terreno-delante.ts`.
     */
    const terreno = juntarAvisos(avisoDeTerreno(cerca), this.mirarElTerrenoDelante(dt));
    this.terrenoAhora = terreno;
    /*
     * El HUD enseña el mismo aviso que dice la voz, no uno suyo. Ver
     * `Hud.ponerTerreno`. **Menos la precaución de delante**, que no es un
     * «pull up» rojo parpadeando: hay un minuto, y se dice en ámbar.
     */
    this.hud.ponerTerreno(terreno === "monte" ? null : terreno);
    /*
     * **Y el panel de avisos, que cuenta estados y no sucesos.**
     *
     * Las tarjetas y las voces ya avisan de todo esto una vez. Una luz es otra
     * cosa: se queda encendida **mientras la cosa siga pasando**, que es lo
     * que hace falta cuando se mira tarde. Ver `flight/avisos-de-cabina.ts`.
     *
     * Ninguna luz inventa un estado: todas cuelgan de algo que el juego ya
     * sabe y ya dice por otro canal.
     */
    /*
     * **Y la pérdida se canta, que es el aviso que no tenía voz.**
     *
     * El estado estaba calculado desde siempre y tenía su luz en el panel, y
     * el canto de cabina no existía: quien mira la pantalla se enteraba y
     * quien depende del sonido, no. Un canal menos, y justo en el aviso más
     * importante que da un avión.
     *
     * «Stall, stall» en inglés aeronáutico y sin traducir jamás, como IAS o
     * HDG: el día que alguien lo oiga en una cabina de verdad tiene que
     * reconocerlo. Ver `audio/cabina.ts`.
     *
     * **Y se rearma saliendo de la pérdida, no con un reloj.** Un aviso vuelve
     * cuando cambia algo que pasa, no cuando pasa un rato: si volviera por
     * tiempo, un avión que se queda colgado lo repetiría en bucle y el bucle
     * enseña a no hacer caso.
     */
    this.cantarLaPerdida();
    this.cantarLaActitud();

    this.hud.ponerLucesDeAviso({
      // La luz de terreno es roja: la precaución de delante va en ámbar, en
      // la tarjeta y en el relieve de la pantalla de navegación.
      terreno: terreno !== null && terreno !== "monte",
      perdida: avisaLaPerdida(this.flight.state),
      rapido: this.sobrandoVelocidad > 0 && !this.rapidoSinLuz,
      trenMal: this.trenFueraDeSitio(),
      frustrada: this.laAproximacion.mandanFrustrar,
      pilotoSuelto: this.pilotoSeSolto > 0,
      // Y el depósito, que es la única luz de este panel que se enciende
      // sola con el tiempo: las demás las enciende algo que se hizo.
      pocoCombustible:
        comoVaElDeposito(this.aircraft, this.combustible) !== "bien",
      frenoPuesto:
        this.input.controls.brakes > 0.5 &&
        this.input.controls.throttle > 0.25,
      // Y la cabina sin aire, en los presurizados. Ver `despresurizacion.ts`.
      cabinaAlta:
        this.aircraft.presurizacion !== null &&
        this.cabinaDelAvion.altitud > AVISO_DE_CABINA,
    });

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
      // Y no en el bote de después de tocar: ahí ya se dijo «frená», y «ya
      // podés tocar» detrás es contar el pasado. Ver `yaTocoTierra`.
      !this.yaTocoTierra &&
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
      // Donde se puede tocar, que no es toda la pista. Ver `sobreLaZonaDeToma`.
      this.sobreLaZonaDeToma() &&
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
      /*
       * **Y en el avión que lleva la cuenta, lo dice ella.** A esa altura la
       * máquina está diciendo *fifty, forty, thirty*, y la instructora encima
       * serían dos voces para el mismo momento. La tarjeta se queda, que es
       * el dibujo; la voz es la de la caja.
       */
      if (!laCuentaDe(this.aircraft).length)
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
    /*
     * **Y mientras te mandan frustrar, la senda desaparece.**
     *
     * Los aros dicen por dónde bajar a esta pista. Una orden de irse al aire
     * dice exactamente lo contrario: esa bajada se abandona. Seguir
     * dibujándolos es el juego contradiciéndose a sí mismo, y encima con el
     * objeto más grande que tiene en pantalla — un aro de la senda visto desde
     * dentro ocupa media pantalla y le queda al avión alrededor.
     *
     * Contado con una captura de una frustrada y dos palabras: «hasta los
     * huevos». En esa pantalla había tres cosas distintas diciendo lo mismo y
     * las tres encima del avión: el aro verde, la luz roja de la torre y la
     * tarjeta. Quitando la senda queda **una orden y su luz**, que es lo que
     * hay que mirar.
     *
     * Y con la geometría se callan también sus veredictos, que ya miraban
     * `seVenLosAros` por esta misma razón escrita allí: nada juzga por un
     * canal que quien juega no tiene delante.
     *
     * Vuelve sola al levantarse la orden —la pista vuelve a ser tuya y la
     * senda también—, que es lo que hace `levantarLaOrden`.
     */
    if (this.leccion.id === "aterrizaje") {
      const conSenda = !this.laAproximacion.mandanFrustrar;
      if (this.runwayGuide.group.visible !== conSenda) {
        this.runwayGuide.group.visible = conSenda;
        this.seVenLosAros = conSenda;
      }
    }

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
    /*
     * **Pero ir a más se dice siempre.** Sin esto, la precaución de delante
     * tapaba su propio aviso: el «monte» seguía puesto sin un respiro hasta
     * que el suelo ya pedía «pull up», y el «pull up» no podía sonar porque
     * no había habido calma. Lo que no se repite es lo mismo o lo de menos.
     */
    const puedeAvisar =
      this.terrenoDicho === null ||
      this.terrenoTranquiloDesde >= SE_REARMA ||
      gravedadDelSuelo(terreno) > gravedadDelSuelo(this.terrenoDicho);
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
      if (terreno === "monte") {
        /*
         * **La precaución de delante, en ámbar y con calma.** Su canto de
         * verdad es «caution terrain», y no está grabado: hasta el 6 de
         * octubre la caja no lo dice —«too low» es otro aviso y enseñaría
         * otra cosa— y en los peldaños de abajo lo cuenta la instructora,
         * que es la explicación que iría detrás. Ver `PENDIENTE-VOCES-terreno.md`.
         */
        const explica = laInstructoraLoExplica(this.tier.avisos);
        this.apuntarCanto(`caution terrain→${explica ? cual : "NADA"} (sin toma de cabina)`);
        if (explica) this.instructor.decir(t(cual), cual, "mando");
      } else
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
    // El ganado de la granja pasta a su aire. Ver `world/granja.ts`.
    {
      const p = this.flight.state.position;
      this.granja?.paso(dt, p);
      for (const v of this.vecinos)
        v.granja?.paso(dt, {
          x: p.x - v.mundo.desplazamiento.x,
          z: p.z - v.mundo.desplazamiento.z,
        });
    }
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
    /*
     * **Y los aros son de la pista de casa**, que es donde se montan. En el
     * campo de llegada se les preguntaba igual con el avión a ciento trece
     * kilómetros, y los daban todos por perdidos de golpe: seis «aro
     * fallado» en menos de un segundo al entrar en final, sin un aro en
     * pantalla.
     */
    const enCasa = this.elCampo().esCasa;
    const aro =
      this.flight.state.onGround || !acercandose || !enCasa
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
      // Y sin motor, «subí» es tirar sin gas: el planeo se acorta. Ver
      // `flight/sin-motor.ts`.
      if (donde === "bajo" && (this.bajoPorqueVaLento || this.sinMotor)) {
        // Se calla la senda: lo que hay que hacer es meter gas, y de eso
        // habla la banda de velocidad. Ver `bajoPorqueVaLento`.
      } else if ((donde === "alto" || donde === "bajo") && this.seVenLosAros) {
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
      // Sobre el campo al que se viene: ver `techoSobre`.
      techoDeNubes: this.techoSobre(this.elCampo()),
      terrenoDicho: this.terrenoDicho,
      vueloTerminado: this.vueloTerminado,
      haciaOtroCampo: this.haciaOtroCampo(),
      sinMotor: this.sinMotor,
      conPrioridad: this.conPrioridad,
    });
    /*
     * **El aire, que no está quieto.**
     *
     * La ráfaga va cada fotograma y el viento del parte solo cuando cambia: son
     * dos cosas distintas —el dato del día y lo que pasa ahora— y por eso entran
     * por puertas distintas. Ver `flight/turbulencia.ts`.
     */
    /*
     * **Y lo que sacude es lo que el radar pinta.**
     *
     * El mismo número: lo que el radar ve es el agua subiendo y bajando, y lo
     * que sacude es esa agua subiendo y bajando. Que el instrumento y la
     * sensación salgan del mismo sitio es lo que hace que se aprenda a creerle
     * al instrumento — si no coincidieran, lo que se aprendería es lo
     * contrario. Ver `flight/tormentas.ts`.
     *
     * **Y ahora sacude de verdad.** Este número solo encendía el cartel: la
     * ráfaga no lo miraba, y cruzar una célula roja no movía el avión.
     */
    const s0 = this.flight.state.position;
    const enLaTormenta = cuantoSacude(this.celdas, s0.x, s0.z);
    const meteo = this.scenario.meteo;
    this.mirarElBarlovento(dt);
    const aire: Aire = {
      sobreElSuelo: this.flight.state.heightAboveGround,
      // El que sopla aquí, no el de casa: ver `seguirElViento`.
      vientoKt: this.vientoAqui?.vientoKt ?? meteo?.vientoKt ?? 0,
      baseDeNubes:
        this.techoDeNubes === null
          ? null
          : this.terrain.runwayElevation + this.techoDeNubes,
      altura: s0.y,
      rugosidad: this.rugosidadAqui,
      /*
       * El suelo de debajo, con el sol y el calor del parte: la térmica de la
       * tarde. Sin parte, un día templado. Ver `calorDelSuelo`. La temperatura
       * y las nubes son las del parte de casa: el tiempo que se reparte entre
       * campos es el viento y la presión, ver `tiempoEntreCampos`.
       */
      calor: calorDelSuelo(
        this.horaDelVuelo,
        meteo?.temp ?? 20,
        meteo?.tapadura ?? (this.techoDeNubes === null ? 0 : 0.5),
        esAguaDeCasa(
          this.terrain.sampleHeight(s0.x, s0.z),
          this.scenario.waterLevel,
        ),
      ),
      tormenta: enLaTormenta,
      // Y la del camino de este vuelo. Ver `flight/turbulencia-del-vuelo.ts`.
      camino: this.turbulenciaDelVuelo.sacude(s0.y, this.flight.state.heightAboveGround),
    };
    // El campo de ráfagas lo lleva el viento del sitio, el mismo que el avión.
    const viento =
      this.vientoAqui?.aire ?? vientoComoVector(meteo ?? TIEMPO_DE_CASA);
    const racha = rachaEn(aire, {
      x: s0.x,
      y: s0.y,
      z: s0.z,
      t: this.clock.elapsedTime,
      vientoX: viento.x,
      vientoZ: viento.z,
      envergadura: this.aircraft.wingSpan,
    });
    /*
     * **Y la estela del de delante**, que no es del aire sino de otro avión, y
     * se suma a lo que traiga el aire. Ver `flight/estela.ts`.
     */
    const estela = this.estelas.aqui(
      this.clock.elapsedTime,
      s0.x,
      s0.y,
      s0.z,
      this.aircraft.wingSpan,
      this.flight.state.heading,
      viento.x,
      viento.z,
    );
    this.flight.ponerRacha?.(
      racha.x,
      racha.y + estela.vertical,
      racha.z,
      racha.alabeo + estela.alabeo,
    );
    /*
     * Y el cartel del cinturón, que se apaga **con** el anuncio de la
     * comandante y no por su cuenta. Las banderas se consumen aquí: son
     * sucesos de un fotograma. Ver `flight/cinturon.ts`.
     */
    const loDijo = this.dijoSoltarse;
    this.dijoSoltarse = false;
    const loEncendio = this.pidioAbrocharse;
    this.pidioAbrocharse = false;
    this.avisarDeLaTormenta();
    // Ya con la tormenta dentro: ver `causasDe` en `flight/turbulencia.ts`.
    const movimiento = cuantoSeMueve(aire);
    this.atenderAlCinturon(movimiento, loDijo, loEncendio);
    this.hablarDeLosBaches(dt, movimiento);
    this.buscarNivelTranquilo(dt, movimiento, aire);
    this.atenderALaSobrevelocidad(dt);

    this.oirLaRadio(dt);
    this.syncAircraftMesh(dt);
    this.updateCamera(dt);
    updateSky(this.sky, this.camera.position);
    // El mar, con el ojo en el centro de sus anillos. Ver `discoDeAgua`.
    this.terrain.llevarElAguaA(this.camera.position.x, this.camera.position.z);
    for (const v of this.vecinos) {
      v.mundo.alPaso(this.camera.position.x, this.camera.position.z);
      if (!v.lucesPuestas && v.mundo.cerca) this.ponerLucesDelVecino(v);
    }
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
        // Y a partir de aquí, fuera del escenario manda la fotografía, y lo
        // que se pisa allí es ella: sin el agua ni el pavimento del vecino.
        this.terrain.ponerSueloLejano(
          (x, z) => this.teselas?.cotaLejana(x, z) ?? null,
        );
        this.terrain.ponerSuperficieLejana(null);
        this.terrain.ponerResalteLejano(null);
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
    // Y el del campo de llegada, que vive en las coordenadas de su mapa.
    const alli = this.elVecinoDeAhora();
    alli?.aproximacion?.mirarDesde(
      this.flight.state.position.x - alli.mundo.desplazamiento.x,
      this.flight.state.position.y,
      this.flight.state.position.z - alli.mundo.desplazamiento.z,
    );
    // El plan de vuelo, antes que todo lo que lo enseña. Ver `seguirLaRuta`.
    this.seguirLaRuta();
    // Y la ventanilla ALT: el control, el avisador y el plan. Ver abajo.
    this.atenderALaVentanilla();
    // Las pantallas de la cabina, si el avión las trae. Van aquí y no en el
    // HUD porque son parte del avión: se ven desde dentro y desde fuera, y se
    // apagan solas cuando se cambia a un modelo que no las tiene.
    this.aircraftMesh.pantallas?.actualizar(
      {
        /*
         * **Velocidad indicada, no verdadera. Aquí iba la verdadera.**
         *
         * Lo vio quien juega poniendo las dos pantallas una al lado de la
         * otra: la cabina marcaba 321 nudos y el cuadro plano 302 en el mismo
         * vuelo. A cuatro mil cuatrocientos pies, 321 verdaderos son 300
         * indicados — o sea que no era ruido ni dos instantes distintos: eran
         * dos magnitudes.
         *
         * Y la que hay que enseñar es la indicada, por dos motivos que van en
         * el mismo sentido: es la que marca el instrumento de cualquier avión,
         * y es la que dice si te caés. Un ala entra en pérdida a una indicada
         * fija, suba lo que suba la verdadera con la altura.
         *
         * Es el fallo recurrente de esta casa —dos superficies que enseñan lo
         * mismo y una se queda atrás— y esta vez le tocó a la de dentro.
         */
        velocidad: indicatedAirspeed(
          this.flight.state.airspeed,
          this.flight.state.position.y,
          this.flight.aireDelDia(),
        ),
        // Y a cuál hay que ir para aterrizar, que es lo que la cinta no decía.
        vref: this.aircraft.approachSpeed,
        altura: this.flight.state.position.y,
        vertical: this.flight.state.verticalSpeed,
        rumbo: this.flight.state.heading,
        // La del campo en el que se está: sus pistas van numeradas con la
        // suya, y el rumbo tiene que casar con el número pintado.
        declinacion: this.elCampoMontado().escenario.magneticVariation ?? 0,
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
        /*
         * Y dónde está la cabina, que no es donde está el avión. Ver
         * `flight/cabina-presurizada.ts`, y la pregunta que lo trajo: «¿qué
         * pasa si tengo una despresurización a mucha altitud?».
         */
        cabina: this.cabinaDelAvion.altitud,
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
        // Y el tope de lo sacado, que baja la banda roja de la cinta: el mismo
        // que recibe el cuadro plano. Ver `topeDeLoSacado`.
        topeKt: topeDeLoSacado(this.aircraft, {
          tren: this.input.controls.tren,
          flaps: this.input.controls.flaps,
        }),
        // El Mach, de la misma cuenta que el cuadro plano. Ver `DatosDeCabina`.
        mach: esDeChorro(this.aircraft)
          ? this.flight.state.airspeed /
            velocidadDelSonido(
              this.flight.state.position.y,
              this.flight.aireDelDia(),
            )
          : null,
        // Y el aire del día, para la temperatura de fuera. Ver `atmosphere.ts`.
        aire: this.flight.aireDelDia(),
        viento: this.vientoDeHoy,
        // Y el depósito, el mismo que ve el cuadro plano. Ver `elDeposito`.
        combustible: this.elDeposito(),
        // Y la misma ventanilla que el cuadro plano, del mismo par de
        // números: una cuenta, dos dibujos. Ver `flight/altimetro.ts`.
        presion: { puesta: this.qnhPuesta, delSitio: this.qnhDelSitio },
        /*
         * **Y el mundo, para que la pantalla de navegación lo dibuje.**
         *
         * Era una brújula sobre un fondo vacío: giraba y ya. Con esto pasa a
         * ser lo que dice su nombre — dónde estoy, dónde está la pista con su
         * forma y su rumbo, y quién más anda por aquí. Ver `ui/carta.ts`.
         */
        mapa: this.elMapa(),
        // Y la ventanilla ALT, la misma que el cuadro plano. Ver `ventanillaAlt`.
        ventanilla: this.ventanillaParaElCuadro(),
        // Y la velocidad que toca y el FMA, los mismos que el cuadro plano.
        spd: this.laSpdDelPanel(),
        fma: this.elFma(),
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
    /*
     * Y los flaps, donde **están**, no donde está la palanca: la misma cifra
     * que sustenta en el modelo de vuelo y que marca la aguja. Ver
     * `flight/flaps.ts` y `world/flaps.ts`.
     */
    this.aircraftMesh.flaps?.poner(this.input.controls.flaps);
    /*
     * **Y los aerofrenos, que son también los frenos de tierra**: los de vuelo
     * hasta su tope y todos arriba al tocar, donde **están**, como los flaps.
     * Y la palanca del pedestal en su sitio: abajo, armada, en el tope de
     * vuelo o arriba del todo con los de tierra fuera. Ver
     * `flight/palanca-de-aerofrenos.ts` y `world/aerofrenos.ts`.
     */
    const deTierra = this.input.controls.frenosDeTierra ?? 0;
    this.aircraftMesh.aerofrenos?.poner(
      this.input.controls.aerofrenos ?? 0,
      deTierra,
    );
    const palanca = this.input.palancaDeAerofrenos.palanca;
    this.aircraftMesh.palancaDeAerofrenos?.poner(
      palanca === "armada"
        ? POSICIONES_DE_LA_PALANCA.armada
        : palanca === "fuera"
          ? deTierra > 0
            ? POSICIONES_DE_LA_PALANCA.arriba
            : POSICIONES_DE_LA_PALANCA.topeDeVuelo
          : POSICIONES_DE_LA_PALANCA.recogida,
    );
    /*
     * Y las luces de posición: la de choque parpadea con el motor en marcha,
     * que es su regla de verdad —se enciende **antes** de arrancar y dice
     * «esto está vivo, no te acerques»—. Ver `world/luces-de-posicion.ts`.
     */
    this.aircraftMesh.luces?.paso(
      this.relojDeRuta,
      this.input.controls.engineOn,
      /*
       * Y el foco: con el tren fuera o por debajo de diez mil pies, que es la
       * regla de verdad y tiene porqué — a esa altura es donde hay tráfico y
       * donde hay pájaros, y el foco es lo que hace que te vean. Ver
       * `focoEncendido`.
       */
      focoEncendido(
        this.flight.state.position.y - this.cotaDeLaPistaAqui(),
        this.input.controls.tren > 0.5,
      ),
    );
    // La luz de dentro sigue al sol: de día la que rebota, de noche la roja
    // del panel. Cada fotograma porque el avión puede cambiar en cualquiera;
    // si el sol no se ha movido no toca nada. Ver `luz-de-cabina.ts`.
    this.aircraftMesh.luzDeCabina?.ponerSol(this.sky.sunDirection.y);
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
        /*
         * **Y lo que hace falta para que los seis de vuelo marquen**, en las
         * unidades del cuadro plano y de la misma cuenta.
         *
         * No lo eran, y cada diferencia se veía poniendo las dos vistas una
         * al lado de la otra: la velocidad era la verdadera y la del cuadro la
         * indicada; el rumbo, el verdadero en radianes leído como grados —la
         * rosa no se movía—; y el cabeceo y el alabeo, radianes leídos como
         * grados, así que el horizonte de dentro seguía nivelado con el avión
         * alabeado treinta grados.
         */
        velocidad:
          indicatedAirspeed(
            this.flight.state.airspeed,
            this.flight.state.position.y,
            this.flight.aireDelDia(),
          ) * NUDOS,
        pies: this.flight.state.position.y * PIES,
        fpm: this.flight.state.verticalSpeed * PIES_POR_MINUTO,
        rumbo:
          (this.flight.state.heading * 180) / Math.PI +
          (this.elCampoMontado().escenario.magneticVariation ?? 0),
        cabeceo: (pitchAngleOf(this.flight.state.orientation) * 180) / Math.PI,
        alabeo: (bankAngleOf(this.flight.state.orientation) * 180) / Math.PI,
        derrape: this.flight.state.beta,
        presion: { puesta: this.qnhPuesta, delSitio: this.qnhDelSitio },
        combustible: this.elDeposito(),
        tren: this.input.controls.tren,
        cuadro: cuadroDe(this.aircraft),
      },
      dt,
    );

    /*
     * Y a dónde se va, si se va a algún sitio: el objetivo de la misión, y si
     * no hay misión, el aeropuerto de destino con su alternativo. Eran solo
     * las misiones, y el plano no decía a cuál de las cinco pistas pintadas
     * se iba.
     */
    const objetivo = this.missions.current;
    this.hud.mapa.update(
      this.flight.state.position.x,
      this.flight.state.position.z,
      this.flight.state.heading,
      objetivo ? objectiveTarget(objetivo) : this.elOtroCampo(),
      objetivo ? null : this.alternoParaLaCarta(),
      // Y si es una ruta a otro aeropuerto, para pintarla. Ver `Mapa.update`.
      !objetivo,
      /*
       * Y los otros aviones, **los mismos que pinta la carta**: los del TCAS,
       * y solo si el avión lo lleva. Ver `pintarElTrafico` en `ui/mapa.ts`.
       */
      this.aircraft.tcas ? this.tcas.enPantalla : [],
    );
    /*
     * Y dónde está el compensador, que es un mando que **se queda puesto** y
     * por tanto hay que poder verlo sin tocarlo. Ver `ControlInputs.trim`.
     */
    this.hud.setTrim(this.input.controls.trim);
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
        palancaDeFlaps: this.input.palancaDeFlaps,
        tren: this.input.controls.tren,
        objetivo: this.aDondeVoy,
        viento: this.vientoDeHoy,
        aire: this.flight.aireDelDia(),
        // Y el mismo mundo que reciben las pantallas de la cabina: una sola
        // cuenta, dos dibujos. Ver `elMapa`.
        mapa: this.elMapa(),
        combustible: this.elDeposito(),
        /*
         * Y la ventanilla del altímetro. La presión del sitio la leía el
         * METAR desde el principio y **no la usaba nadie**: el altímetro
         * enseñaba la altitud verdadera, que es la única que un altímetro de
         * verdad no sabe. Ver `flight/altimetro.ts`.
         */
        presion: { puesta: this.qnhPuesta, delSitio: this.qnhDelSitio },
        ventanilla: this.ventanillaParaElCuadro(),
        // Y la cabina de verdad, la misma que la de las pantallas de dentro.
        cabina: this.cabinaDelAvion.altitud,
        aerofrenos: {
          donde: this.input.controls.aerofrenos ?? 0,
          pedidos: this.input.aerofrenosAbiertos,
          palanca: this.input.palancaDeAerofrenos.palanca,
          deTierra: this.input.controls.frenosDeTierra ?? 0,
          autofreno: this.input.palancaDeAerofrenos.modo,
          frenando: this.input.palancaDeAerofrenos.frenando,
        },
        // La velocidad que toca y lo que hace el automático. Ver `elFma`.
        spd: this.laSpdDelPanel(),
        fma: this.elFma(),
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
        this.laPistaDeAhora(),
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
    /*
     * **Y la lección de rodar se termina en la doble raya.** Va detrás de los
     * galones para que el de rodaje, que se gana en este mismo fotograma,
     * entre en la bitácora y en el panel. Ver `acabaEnLaEspera`.
     */
    if (this.vistaActual?.leccionHecha) this.terminarElVuelo();
    this.hud.senal.update(dt);
    this.hud.noRepetirElTutor();
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
    /*
     * Las aves se colocan aquí y no en cada paso: dónde está cada una es una
     * cuenta con el reloj, y con el reloj acelerado se harían ocho veces para
     * pintarlas una. Y con la cámara ya puesta, que es la que decide cuáles
     * se ven. Ver `world/bandadas-dibujo.ts`.
     */
    this.dibujoDeBandadas.pintar(
      this.bandadas,
      this.relojDeRuta,
      this.camera,
      this.renderer.domElement.height,
    );
    /*
     * **Y los otros aviones, no más pequeños de dos píxeles**, con la misma
     * regla que las aves: el rombo del TCAS a cinco kilómetros tiene que
     * poder buscarse por la ventanilla. Con la cámara ya puesta, que es la
     * que decide cuánto mide cada uno. Ver `world/se-ve-de-lejos.ts`.
     */
    const alto = this.renderer.domElement.height;
    for (const grupo of [
      this.trafico?.grupo,
      this.avionesDeRuta?.grupo,
      this.avionesDeLasIslas?.grupo,
    ])
      if (grupo) ponerTamanoMinimo(grupo.children, this.camera, alto);
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
    // Sobre el asfalto, no sobre el terreno de debajo. Ver `resalteEn`.
    this.senalero.colocar(puesto, this.plan?.primerPaso() ?? null, (x, z) =>
      this.terrain.sampleSurface(x, z),
    );
  }

  /**
   * Pone al señalero en el puesto al que lleva la raya, si no estaba ya.
   *
   * Solo mueve al señalero: `colocarSenalero` reinicia además el coche del
   * sígame, y reiniciarlo a mitad de la vuelta sería quitarlo de en medio
   * justo cuando está guiando.
   */
  private senaleroAlPuestoDeLlegada(): void {
    /*
     * **Donde acaba la raya, que no es donde empezó.**
     *
     * Esto preguntaba por `plan.arranque()`, o sea el puesto **de salida**. Y
     * el propio plan tiene escrito lo contrario tres mil líneas más arriba:
     * «al volver, al puesto más cercano; al salir, al de siempre» — la ruta
     * de vuelta iba a cruzar el aeropuerto entero para dejar el avión donde
     * se cogió, y se cambió. O sea que el señalero esperaba en un sitio y el
     * avión aparcaba en otro. Medido en Silvio Pettirossi: **novecientos
     * metros**, con el avión ya en el puesto y el señalero todavía a
     * novecientos de distancia.
     *
     * Contado tres veces y siempre con el mismo tono: «nadie me esperaba en
     * Gran Canaria», «no estaba el de las lucecitas para ayudarme a aparcar,
     * yo que le iba a dar un eurito».
     *
     * El final de la raya **es** el puesto al que se va, y no puede
     * discrepar de adónde va el avión porque es lo mismo que sigue el avión.
     * Y el tramo anterior dice por dónde entra, que es la otra mitad: el
     * señalero se pone mirando a la llegada, y si la llegada viene por el
     * otro lado se le da la vuelta. Sin eso se queda de espaldas y tampoco
     * aparece, aunque esté en el sitio bueno. Ver `senalero.test.ts`.
     */
    const ruta = this.plan?.rutaVisible() ?? [];
    const fin = ruta[ruta.length - 1];
    /*
     * **Y solo si la raya acaba en un puesto de verdad.**
     *
     * Al empezar a abandonar la pista, la ruta que hay puesta todavía puede
     * ser la anterior —la que acababa en el punto de espera— y plantar ahí al
     * señalero sería ponerlo en mitad de una calle de rodaje durante un par
     * de fotogramas. Se comprueba contra los puestos del aeródromo, que es lo
     * único que de verdad es un puesto.
     */
    if (!fin || !this.esUnPuesto(fin)) return;
    const puesto = [fin[0], fin[1]] as const;
    const porDonde = this.plan?.ultimoPaso() ?? null;
    const donde = this.senalero.donde;
    // Un metro de holgura: el puesto no se mueve solo, y comparar en coma
    // flotante exacta sería recolocarlo cada fotograma.
    const enSuSitio =
      donde !== null &&
      Math.hypot(donde.x - puesto[0], donde.z - puesto[1]) < 1;
    if (enSuSitio && !this.deEspaldas(puesto, porDonde)) return;
    this.senalero.colocar(puesto, porDonde, (x, z) =>
      this.terrain.sampleSurface(x, z),
    );
  }

  /** Si ese punto del mundo es uno de los puestos de este aeródromo. */
  private esUnPuesto(donde: readonly [number, number]): boolean {
    /*
     * **Del aeródromo del plan, que es el del campo en el que se está.**
     *
     * Miraba los del escenario, o sea los de casa. En el aeropuerto de
     * llegada ningún final de raya casaba con un puesto de Gando, así que el
     * señalero no se movía nunca de donde lo dejó la mudanza —el puesto de
     * **salida** de allí— y la raya acababa en otro. Medido aterrizando en
     * Tenerife Norte con el JAZ 90: la raya en (-93878, -61624) y el
     * señalero esperando a cuatrocientos metros. Y como solo se le ve a
     * doscientos veinte de su sitio, no aparecía. Contado jugando: «no había
     * nadie esperando, ni coche ni señor con señales».
     */
    const puestos = (this.plan?.aerodromoActual ?? this.scenario.aerodrome)
      ?.parkingPositions;
    if (!puestos?.length) return false;
    // Los puestos vienen en coordenadas del aeródromo, con la Y al revés que
    // la Z del mundo. Diez metros de holgura: la ruta acaba en el nudo del
    // puesto, que no cae clavado en el punto de la ficha.
    return puestos.some(
      (p) => Math.hypot(p.xy[0] - donde[0], -p.xy[1] - donde[1]) < 10,
    );
  }

  /**
   * Si el señalero está mirando al revés de por donde llega el avión.
   *
   * El listón es generoso —se da la vuelta solo cuando el avión viene de más
   * atrás que de costado— porque recolocarlo por dos grados le reiniciaría la
   * postura cada fotograma, y eso se ve peor que mirar un poco torcido.
   */
  private deEspaldas(
    puesto: readonly [number, number],
    porDonde: readonly [number, number] | null,
  ): boolean {
    if (!porDonde) return false;
    const vx = puesto[0] - porDonde[0];
    const vz = puesto[1] - porDonde[1];
    const largo = Math.hypot(vx, vz);
    if (largo < 1) return false;
    const mira = this.senalero.mirando;
    return (vx / largo) * mira.x + (vz / largo) * mira.z < 0;
  }

  /**
   * Y si el campo de abajo ya es el otro, el plan se muda con el avión.
   *
   * **La raya verde no viaja sola.** El mundo vecino trae su pista, sus calles
   * y su plataforma dibujadas y pisables desde que se puede volar a otro
   * aeropuerto, pero el plan de tierra seguía siendo el de casa: se aterrizaba
   * en La Gomera y lo que contaba quien jugaba era «no hay coche, no sé la
   * ruta a mi hangar». Y no la había: el grafo de rodaje que la traza estaba a
   * sesenta kilómetros.
   *
   * El criterio de «en qué campo estoy» es el mismo que ya decide si una toma
   * cuenta como aterrizaje —la pista que se tiene más cerca—, y por eso el
   * cambio ocurre a mitad de camino, con el avión en el aire. Que es cuando
   * tiene que ocurrir: a partir de ahí la fase de final, el número de pista
   * que se canta y la salida por la que se deja el asfalto son las de allí.
   *
   * Y se vuelve a sacar a quien te espera, porque es otra gente en otro campo.
   */
  private mudarElPlanSiCambiaDeCampo(): void {
    if (!this.plan || this.vecinos.length === 0) return;
    const campo = this.elCampo();
    if (!campo.aerodromo || campo.aerodromo === this.plan.aerodromoActual)
      return;
    this.plan.mudarseA(campo.aerodromo, campo.pista);
    this.colocarSenalero();
  }

  /** El campo para el que está montado lo que va con él. Ver `montarElCampo`. */
  private campoMontado: string | null = null;

  /**
   * Si el campo de ahora ya es otro, se monta lo que va con él.
   *
   * Con un kilómetro de holgura en el aire: el campo de ahora cambia a mitad
   * de camino, y quien vuele justo por esa raya no puede hacer que se rehagan
   * el circuito, el tráfico y la frecuencia sesenta veces por segundo.
   */
  private mirarSiCambiaDeCampo(): void {
    if (this.vecinos.length === 0) return;
    const ahora = this.elCampo();
    if (ahora.id === this.campoMontado) return;
    if (this.campoMontado !== null && !this.flight.state.onGround) {
      const antes = this.elCampo(this.campoMontado);
      const p = this.flight.state.position;
      const aAhora = Math.hypot(ahora.pista.x - p.x, ahora.pista.z - p.z);
      const aAntes = Math.hypot(antes.pista.x - p.x, antes.pista.z - p.z);
      if (aAhora > aAntes - HOLGURA_PARA_CAMBIAR_DE_CAMPO) return;
    }
    this.montarElCampo(ahora);
  }

  /**
   * **Lo que va con el campo, montado en el campo de ahora.**
   *
   * El circuito dibujado, el tráfico que lo vuela, la frecuencia que se oye,
   * quien sale a buscarte, la declinación con la que se lee el rumbo y el
   * nombre de la insignia. Todo eso se montaba una vez, en casa, y en el
   * aeropuerto de llegada seguía siendo de casa: en Los Rodeos se oía el
   * circuito de Gando con los aviones a ciento trece kilómetros, en la pista
   * de hierba de la granja hablaba una torre que no existe, y en Pettirossi,
   * saliendo de la granja, la frecuencia estaba muda.
   *
   * Un aeropuerto de verdad es su pista, su gente y su radio; cambiar de campo
   * es cambiar de las tres cosas.
   */
  private montarElCampo(campo: CampoEnElMundo): void {
    this.campoMontado = campo.id;
    this.ponerCircuito();
    this.ponerTrafico();
    /*
     * Otra frecuencia, otra gente: con las matrículas de allí. **Y lo que la
     * de aquí dejó esperando turno en la boca se va con ella**: se oía ya en
     * el campo nuevo, con la pista del viejo —llegando a Gando, un «cleared to
     * land» a un avión de Los Rodeos por la 12—, porque la frase se monta con
     * su pista al decirse la llamada y no al sonar. Ver `esDeLaFrecuencia`.
     */
    this.turno.cambiarDeCampo(campo.escenario.aerodrome?.id);
    this.cambiarDeSigueme(campo);
    this.hud.setMagneticVariation(campo.escenario.magneticVariation);
    this.updateBadge();
    this.laAproximacion.otroCampo();
    // La distancia al umbral acaba de saltar de una pista a otra: el
    // fotograma que viene no puede leer eso como «alejándose».
    this.antesAlUmbral = Infinity;
    // Y de vuelta en casa, los aros empiezan por el que queda delante.
    if (campo.esCasa) this.runwayGuide.reset(this.flight.state.position);
  }

  /** El campo montado, que es el de casa hasta que se sale de él. */
  private elCampoMontado(): CampoEnElMundo {
    return this.elCampo(this.campoMontado ?? this.scenario.id);
  }

  /**
   * Coche o bici, según el campo.
   *
   * Se decidía una vez con el campo de salida, así que en la granja te
   * recogía el coche con su baliza y en el aeropuerto una bicicleta. Quien
   * sale a buscarte es de allí.
   */
  private cambiarDeSigueme(campo: CampoEnElMundo): void {
    const enBici = campo.escenario.aerodrome?.privado === true;
    if (this.sigueme.enBici === enBici) return;
    const donde = this.sigueme.grupo.parent;
    donde?.remove(this.sigueme.grupo);
    this.sigueme = new Sigueme(enBici);
    donde?.add(this.sigueme.grupo);
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
  /**
   * Y decir qué son los círculos del radar, la primera vez que aparecen.
   *
   * Preguntado jugando con una foto de la pantalla de navegación delante:
   * «¿qué son esos círculos?». Y ahí estaba el fallo: el radar los pintaba
   * con la escala de color de verdad —verde, ámbar, rojo, magenta— y **no
   * los nombraba nadie**. En este juego lo esencial se entiende sin leer, y
   * un color en una pantalla no es un canal: hace falta que alguien lo diga
   * la primera vez, con su dibujo.
   *
   * Y lo que se dice es la lección, no el dato: a una tormenta no se entra,
   * se rodea. Es la regla de las tres eses dicha en meteorología.
   *
   * Una vez por vuelo, que de eso ya se encarga `NO_REPETIR` en la boca — y
   * solo de lo que viene por delante, dentro del cono del morro. Ver
   * `laQueVieneDelante`.
   */
/**
   * Lo que se quema en este fotograma, y lo que pasa cuando ya no queda.
   *
   * Por el empuje que el avión está dando de verdad y no por el gas que se
   * pide: arriba, donde el aire es cuarto de denso, el mismo mando da mucho
   * menos empuje y gasta mucho menos. Con eso, subir a volar alto sale a
   * cuenta solo — que es exactamente la lección de por qué se vuela alto, y no
   * hay que contarla. Ver `flight/combustible.ts`.
   *
   * Y cuando se acaba, **el motor se para**. No es un castigo ni una pantalla
   * roja: es lo que pasa, y a partir de ahí el avión planea, que es una cosa
   * que los aviones hacen. Quedarse sin combustible y que no pase nada sería
   * enseñar que el combustible no importa, que es lo contrario de por qué está
   * aquí.
   */
  private quemarCombustible(dt: number): void {
    // Antes que nada, dónde empieza el tramo: el desvío de la reserva se
    // calcula contra él. Ver `mirarSiSeLlego`.
    this.mirarSiSeLlego();
    const antes = this.combustible;
    /*
     * Y con el Mach y el aire de donde está: el mismo empuje cuesta más deprisa
     * y en aire caliente, y menos arriba. Ver `consumoEspecifico`.
     */
    const s0 = this.flight.state;
    const aire = this.flight.aireDelDia();
    this.quemaDeAhora = this.input.controls.engineOn
      ? quemaPorSegundo(this.aircraft, this.flight.empujeAhora(), {
          mach: s0.airspeed / velocidadDelSonido(s0.position.y, aire),
          theta: (temperaturaExterior(s0.position.y, aire) + 273.15) / 288.15,
        })
      : 0;
    this.combustible = Math.max(0, antes - this.quemaDeAhora * dt);

    /*
     * El aviso de reserva, una vez. Ámbar y en voz de aviso —nunca de
     * alarma—, porque lo que hay que hacer con él es decidir, y quien se
     * acelera decide peor. La luz del panel se queda encendida mientras dure,
     * que es lo que hace una luz. Ver `flight/avisos-de-cabina.ts`.
     */
    const como = comoVaElDeposito(this.aircraft, this.combustible);
    if (como !== "bien" && !this.avisadoDeLaReserva && antes > 0) {
      this.avisadoDeLaReserva = true;
      /*
       * Y la flecha, al sitio donde se va a aterrizar: el aviso ya no dice
       * «buscá», dice «seguí». La tarjeta del destino destella con el nombre
       * nuevo, que es lo que ve quien no lee. En tierra no hay a dónde
       * desviarse: se está donde se está.
       */
      /*
       * **Y mirando dónde se está.** Entrando ya al destino se decía «vamos al
       * aeropuerto más cercano, seguí la flecha», y el más cercano era ese
       * mismo destino: «es una gilipollez si el más cercano es el de destino
       * al que ya estaba entrando». Llegando —en la aproximación o en la
       * final— o si el más cercano es el destino, lo que se dice es lo que
       * toca: a la pista, que se aterriza aquí. Lejos y con otro campo más
       * cerca, el desvío de siempre.
       *
       * PENDIENTE-VOCES-automatico: `vuelo.reservaAqui` en lugar de «Andá a
       * la pista» cuando esté grabada.
       */
      const llegando = this.llegandoAlDestino();
      if (!this.flight.state.onGround && !llegando) this.desviarConLaReserva();
      const aqui = llegando || this.desvioId === null;
      const dicho = this.avisoCon(
        aqui ? "vuelo.enVueloAterrizando" : "vuelo.reserva",
        "palabra.reserva",
      );
      this.hud.senal.mostrar("combustible", dicho.rotulo, null, { segundos: 6 });
      this.instructor.decir(dicho.texto, dicho.id);
    }
    this.vigilarElCombustible();

    /*
     * Y sin combustible el motor no arranca, por mucho que se pida. La llave
     * está siempre a mano —es el primer paso del vuelo— y sin esto se podía
     * volver a arrancar con el depósito a cero y seguir volando para siempre,
     * que es la forma más rápida de enseñar que el combustible no importa.
     */
    if (this.combustible <= 0) this.input.controls.engineOn = false;
    if (antes > 0 && this.combustible <= 0) {
      // En el aire es otro vuelo, y se dice de otra manera. Ver `quedarseSinMotor`.
      if (!this.flight.state.onGround) {
        this.quedarseSinMotor();
        return;
      }
      const dicho = this.avisoCon(
        "vuelo.sinCombustible",
        "palabra.sinCombustible",
      );
      this.hud.senal.mostrar("combustible", dicho.rotulo, null, { segundos: 8 });
      this.instructor.decir(dicho.texto, dicho.id);
    }
  }

  /**
   * **Se paró el motor en el aire: empieza otro vuelo.** Ver
   * `flight/sin-motor.ts`.
   *
   * Tres cosas, y en el orden en que las hace una tripulación de verdad:
   *
   * 1. **A dónde**: la pista más cercana a la que se llega planeando, que no
   *    tiene por qué ser la del plan. La flecha se va allí y la tarjeta del
   *    destino destella con su nombre, como con la reserva.
   * 2. **Cómo**: la instructora lo dice con calma y en plural —«no tenemos
   *    motor: bajamos la nariz, mantenemos esta velocidad y vamos a esa
   *    pista»—, en los cuatro peldaños, que la voz es el canal de quien no
   *    lee. El dibujo del combustible en los cuatro, una palabra en el
   *    segundo y la frase con la velocidad de mejor planeo desde el tercero.
   * 3. **Quién más se entera**: la torre. De Taguató para arriba se ve la
   *    llamada de socorro en la tira de la radio y se oye la respuesta,
   *    «roger MAYDAY»; abajo, la prioridad se ve en la lámpara al alinearse.
   *
   * Ni pantalla roja, ni pitido, ni música: un fallo de motor se entrena
   * para que sea una maniobra y no un susto, y quien se acelera decide peor.
   */
  private quedarseSinMotor(): void {
    this.sinMotor = true;
    this.laOtraCabecera.reiniciar();
    const s = this.flight.state;
    const planeo = planeoDe(this.aircraft);
    const campos = this.camposDelVuelo().map((c) => ({
      ...c,
      cota: this.cotaDelCampo(this.elCampo(c.id)),
    }));
    const alli = pistaDelPlaneo(s.position.x, s.position.z, s.position.y, campos, planeo);
    // Al destino, sin desvío que nombrar; a otro campo, con él.
    if (alli && this.vecinos.length > 0)
      this.desvioId = alli.campo.id === this.destinoId ? null : alli.campo.id;

    const dicho = this.avisoCon("vuelo.sinMotor", "palabra.planea");
    const unidades = UNIT_SYSTEMS[this.tier.units];
    const rotulo =
      canalesDe(this.tier.avisos).cifra && dicho.rotulo
        ? `${dicho.rotulo} · ${Math.round(unidades.speed(planeo.velocidad))} ${unidades.speedLabel()}`
        : dicho.rotulo;
    this.hud.senal.mostrar("combustible", rotulo, null, {
      segundos: 10,
      prioridad: IMPORTANTE,
    });
    /*
     * **Y corta lo que se estuviera diciendo**, que es de las pocas cosas que
     * pueden: lo de antes —la reserva, un «más despacio»— ya no describe este
     * vuelo. Medido en el banco: en `mando`, detrás de la reserva que todavía
     * sonaba, la frase caducaba esperando y el planeo empezaba sin que nadie
     * dijera qué hacer. Cortar no es alarmar: la voz sigue siendo la de la
     * calma, y lo que dice es qué hacer. Ver `audio/boca.ts`.
     */
    this.instructor.decir(dicho.texto, dicho.id, "urgente");
    this.declararMayday();
  }

  /**
   * **Si se llega ya al destino**: bajando por el plan a menos de cuarenta
   * millas, en el tramo final o en la final. Ahí, con la reserva, se aterriza
   * donde se va.
   */
  private llegandoAlDestino(): boolean {
    if (this.faseDeAhora === "final") return true;
    const p = this.navegacion.progreso;
    if (!this.navegacion.plan || !p) return false;
    return this.navegacion.bajando && p.restante < 40 * MILLA;
  }

  /**
   * **Lo que se le dice a la torre del combustible**: «minimum fuel» y, si
   * ya no se llega con la reserva final, «MAYDAY FUEL». Una vez cada una, y
   * en orden. Ver `llamadaDeCombustible` en `flight/combustible.ts`.
   *
   * Y con cualquiera de las dos, **prioridad**: la secuencia de llegadas lo
   * pone primero y a ése no se le inventa una frustrada. Ver `conPrioridad`.
   */
  private vigilarElCombustible(): void {
    const s = this.flight.state;
    if (s.onGround || !this.input.controls.engineOn || this.combustible <= 0) return;
    const p = this.navegacion.progreso;
    const segundos =
      this.navegacion.plan && p && Number.isFinite(p.segundos) ? p.segundos : null;
    const llamada = llamadaDeCombustible(this.aircraft, this.combustible, segundos);
    const grado = { nada: 0, minimo: 1, mayday: 2 } as const;
    if (grado[llamada] <= grado[this.llamadaDicha]) return;
    this.llamadaDicha = llamada;
    if (llamada === "mayday") this.declararMayday("fuel");
    else this.declararCombustibleMinimo();
  }

  /**
   * **Con poco combustible, se tiene prioridad**: el MAYDAY de la reserva, el
   * «minimum fuel», o sin motor.
   */
  private get conPrioridad(): boolean {
    return this.sinMotor || this.llamadaDicha !== "nada";
  }

  /**
   * **«Minimum fuel»**, escrito en la tira de la radio de Taguató para
   * arriba, como el MAYDAY: no es una emergencia, es avisar a la torre de que
   * no se puede esperar.
   *
   * PENDIENTE-VOCES-automatico: la respuesta de la torre,
   * `torre.minimumFuel`, y `vuelo.reservaMinimo` de la instructora abajo.
   */
  private declararCombustibleMinimo(): void {
    if (!this.hayTorreQueHable()) return;
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    if (!conCifras) return;
    this.hud.radio(`${this.miIndicativo.dicho}, minimum fuel`, 9, true);
  }

  /**
   * **La llamada de socorro y su respuesta**, de Taguató para arriba.
   *
   * MAYDAY y no PAN-PAN: PAN-PAN es urgencia —algo va mal y hay tiempo—, y un
   * avión sin motor está en peligro grave e inminente, que es la definición de
   * socorro. La llamada la hace quien vuela y en este juego nadie habla por
   * quien vuela, así que se ve escrita en la tira de la radio; la respuesta de
   * la torre se oye, con su voz y la matrícula de siempre.
   */
  private declararMayday(motivo = "fuel exhaustion"): void {
    if (!this.hayTorreQueHable()) return;
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    if (!conCifras) return;
    const yo = this.miIndicativo;
    const montada = this.deTorre("torre.mayday", yo);
    if (!montada) return;
    this.hud.radio(
      `MAYDAY MAYDAY MAYDAY, ${yo.dicho}, ${motivo} — ${montada.texto}`,
      9,
      true,
    );
    this.torre.decir(montada.texto, montada.clave, "mando", montada.relleno);
  }

  // ── La cabina: el aire que se enseña y el que se pierde ─────────────

  /**
   * **Un paso de la cabina**: dónde está, qué enseña el aire y cómo va el
   * descenso de emergencia si hay uno. Ver `flight/cabina-presurizada.ts`.
   */
  private atenderALaCabina(dt: number): void {
    const s = this.flight.state;
    this.relojDeCabina += dt;
    /*
     * El silencio de todas las voces, para el reparto de lo que puede
     * esperar: cualquier boca y la máquina. Ver `Huecos`.
     */
    const megafoniaHabla = this.comandante.hablando || this.tripulacion.hablando;
    this.huecos.paso(dt, {
      alguienHabla:
        megafoniaHabla ||
        !BOCA.libre ||
        this.maquina.ocupada ||
        this.instructor.hablando ||
        this.torre.hablando ||
        this.otroAvion.hablando,
      megafoniaHabla,
    });
    /*
     * Un vuelo nuevo, otro avión, o el avión puesto en otro sitio de golpe
     * —un banco, una lección que empieza en final—: la cabina se pone donde
     * estaría, y lo que se estaba contando se olvida.
     */
    const salto =
      this.alturaDeAntes !== null && Math.abs(s.position.y - this.alturaDeAntes) > 300;
    this.alturaDeAntes = s.position.y;
    if (this.cabinaPorPoner || salto || this.cabinaDe !== this.aircraft) {
      this.cabinaPorPoner = false;
      this.cabinaDe = this.aircraft;
      this.descensoDeEmergencia = null;
      this.porDecirDelDescenso = [];
      this.leccionesDelAire.olvidarElVuelo();
      for (const p of this.leccionesPorContar) this.leccionesDelAire.noSeConto(p.leccion);
      this.leccionesPorContar = [];
      this.cabinaDelAvion.reiniciar(s.position.y, s.onGround, this.aircraft);
    }
    this.cabinaDelAvion.paso(dt, {
      altura: s.position.y,
      enTierra: s.onGround,
      campo: this.cotaDelCampo(this.elCampo()),
    });
    this.contarElAire(dt);
    this.seguirElDescenso();
  }

  /** Vuelo nuevo: la cabina con su aire, y sin ejercicio a medias. */
  private olvidarLaCabina(): void {
    this.cabinaPorPoner = true;
    this.descensoDeEmergencia = null;
    this.tarjetaDelDescenso = false;
    this.porDecirDelDescenso = [];
    this.hastaDelDescenso = { instructor: 0, megafonia: 0 };
  }

  /** Pide una frase del descenso, detrás de las que ya esperan en su boca. */
  private encolarDelDescenso(por: "instructor" | "megafonia", clave: TranslationKey): void {
    this.porDecirDelDescenso.push({ por, clave, desde: Date.now() });
  }

  /**
   * **Dice lo siguiente del descenso**, una por boca y en su orden: cuando
   * se calcula que ya acabó lo anterior que se dijo del descenso por esa
   * boca, y cuando la boca está libre —la instructora, sin ella ni la caja
   * hablando; la megafonía, sin nadie en el altavoz—.
   *
   * **Y si la boca no se libera, a los tres segundos se pide igual**, con peso
   * de orden: espera en su cola, que ya no la pisa ninguna frase del descenso
   * porque van de una en una. Esperar a que esté libre sin tope dejaba la
   * frase sin decir en un aeropuerto con la frecuencia llena.
   */
  private decirLoQueQueda(): void {
    const ahora = Date.now();
    const libre = {
      instructor: !this.instructor.hablando && !this.maquina.ocupada,
      megafonia: !this.comandante.hablando && !this.tripulacion.hablando,
    };
    for (const por of ["instructor", "megafonia"] as const) {
      const i = this.porDecirDelDescenso.findIndex((f) => f.por === por);
      const f = this.porDecirDelDescenso[i];
      const hasta = this.hastaDelDescenso[por];
      if (!f || ahora < hasta) continue;
      if (!libre[por] && ahora - Math.max(f.desde, hasta) < ESPERA_DEL_DESCENSO) continue;
      this.porDecirDelDescenso.splice(i, 1);
      this.hastaDelDescenso[por] = ahora + loQueTardaEnDecirse(t(f.clave));
      if (por === "instructor") this.instructor.decir(t(f.clave), f.clave, "mando");
      else
        this.porMegafoniaYa(
          f.clave.startsWith("tripulacion.") ? this.tripulacion : this.comandante,
          f.clave,
        );
    }
  }

  /**
   * **Lo que el aire enseña por el camino**, en el momento en que se ve. Ver
   * `flight/lecciones-del-aire.ts`.
   *
   * Lo cuenta la instructora en los tres peldaños de abajo, con el peso de un
   * elogio —«bien» no pisa a nadie, y esto tampoco—, y nunca en mitad de una
   * emergencia ni sin motor: ahí la palabra es de lo que hay que hacer.
   */
  private contarElAire(dt: number): void {
    const s = this.flight.state;
    const aire = this.flight.aireDelDia();
    const oat = temperaturaExterior(s.position.y, aire);
    const lectura = {
      dt,
      enTierra: s.onGround,
      altura: s.position.y,
      vertical: s.verticalSpeed,
      oat,
      cabina: this.cabinaDelAvion.altitud,
      ritmoDeCabina: this.cabinaDelAvion.ritmo,
      presurizada:
        this.aircraft.presurizacion !== null && !this.cabinaDelAvion.despresurizada,
      crucero: this.navegacion.plan ? this.navegacion.cruceroPlaneado : null,
      bajando: this.navegacion.bajando,
    };
    const toca = this.leccionesDelAire.paso(lectura);
    if (
      !laInstructoraLoExplica(this.tier.avisos) ||
      this.descensoDeEmergencia !== null ||
      this.sinMotor
    ) {
      if (toca) this.leccionesDelAire.noSeConto(toca);
      for (const p of this.leccionesPorContar) this.leccionesDelAire.noSeConto(p.leccion);
      this.leccionesPorContar = [];
      return;
    }
    if (toca) this.leccionesPorContar.push({ leccion: toca, desde: this.relojDeCabina });
    /*
     * **Y se cuenta cuando hay hueco, si todavía es verdad.** Se contaba en el
     * instante en que tocaba, y ese instante era el de otra voz: la del frío
     * encima de Jazlyn contando el Teide, la de los oídos encima del azafato
     * anunciando la bajada. Lo que deja de ser verdad mientras espera, o
     * espera demasiado, no se cuenta —y puede volver a tocar otro día—.
     */
    this.leccionesPorContar = this.leccionesPorContar.filter((p) => {
      const vale =
        sigueValiendo(p.leccion, lectura) &&
        this.relojDeCabina - p.desde <= ESPERA_SU_HUECO;
      if (!vale) this.leccionesDelAire.noSeConto(p.leccion);
      return vale;
    });
    const siguiente = this.leccionesPorContar[0];
    if (!siguiente || !this.huecos.hayHueco) return;
    this.leccionesPorContar.shift();
    this.huecos.usar();
    this.contarLaLeccion(siguiente.leccion, oat);
  }

  private contarLaLeccion(leccion: LeccionDelAire, oat: number): void {
    const canales = canalesDe(this.tier.avisos);
    let clave: TranslationKey;
    switch (leccion) {
      case "frio": {
        /*
         * Y el termómetro, que es lo que se ve: en el peldaño de las cifras con
         * su rótulo de cabina, OAT, que no se traduce.
         */
        const grados = Math.round(oat);
        const rotulo = !canales.texto
          ? ""
          : canales.corto
            ? t("palabra.frio")
            : `OAT ${grados > 0 ? "+" : ""}${grados} °C`;
        this.hud.senal.mostrar("frio", rotulo, null, { segundos: 6 });
        clave = "vuelo.aire.frio";
        break;
      }
      case "crucero":
        clave = canales.cifra ? "vuelo.aire.cruceroConCifras" : "vuelo.aire.crucero";
        break;
      case "bolsa":
        clave = "vuelo.aire.bolsa";
        break;
      case "oidos":
        clave = "vuelo.aire.oidos";
        break;
    }
    this.instructor.decir(t(clave), clave, "baja");
  }

  /**
   * **Se va el aire de la cabina: empieza el descenso de emergencia.** Ver
   * `flight/despresurizacion.ts`.
   *
   * Es el ejercicio, y se dispara desde fuera: el selector de ejercicios de
   * emergencia —ver `EJERCICIO_DE_DESPRESURIZACION`— o un banco. Nunca por
   * sorpresa. Devuelve si pudo: en un avión sin presurizar no hay aire que
   * perder, en tierra no hay nada que ensayar y un ejercicio no se pisa con
   * otro.
   *
   * Lo que pasa después lo lleva `seguirElDescenso`, paso a paso.
   */
  despresurizar(): boolean {
    const s = this.flight.state;
    if (
      this.descensoDeEmergencia !== null ||
      s.onGround ||
      !EJERCICIO_DE_DESPRESURIZACION.sirveEn(this.aircraft)
    )
      return false;
    if (!this.cabinaDelAvion.despresurizar()) return false;
    this.tarjetaDelDescenso = false;
    this.descensoDeEmergencia = new DescensoDeEmergencia({
      t: this.relojDeCabina,
      altura: s.position.y,
      objetivo: alturaSegura(this.minimaDelSector()),
    });
    return true;
  }

  /**
   * **La mínima del sector**, m: la altitud mínima en ruta más alta de lo que
   * se tiene delante en los próximos minutos de descenso, o `null` si no se
   * sabe nada del suelo. Un descenso de emergencia avanza cincuenta
   * kilómetros; con el Teide delante no se baja a diez mil pies. Ver
   * `minimaEnRuta` en `ruta.ts`.
   */
  private minimaDelSector(): number | null {
    const s = this.flight.state;
    const cota = (x: number, z: number): number | null => this.terrain.cotaConocida(x, z);
    const dx = Math.sin(s.heading);
    const dz = -Math.cos(s.heading);
    let alto: number | null = null;
    for (let d = 0; d <= 50000; d += 10000) {
      const m = minimaEnRuta(cota, s.position.x + dx * d, s.position.z + dz * d);
      if (m !== null && (alto === null || m > alto)) alto = m;
    }
    return alto;
  }

  /**
   * **El descenso de emergencia, paso a paso**: lo que suena, lo que se ve y
   * quién habla, en el orden de un avión de verdad. Ver
   * `flight/despresurizacion.ts`.
   *
   * Ni pantalla roja ni música: la luz roja del panel es la de cualquier
   * cabina, y lo que se oye es la caja —en el avión que la lleva—, la
   * megafonía y la instructora con calma. Es un procedimiento.
   */
  private seguirElDescenso(): void {
    const d = this.descensoDeEmergencia;
    if (!d) return;
    const s = this.flight.state;
    const suceso = d.paso({
      t: this.relojDeCabina,
      cabina: this.cabinaDelAvion.altitud,
      altura: s.position.y,
    });
    if (suceso === "aviso") this.avisarDeLaCabina(d);
    else if (suceso === "mascaras") this.caenLasMascaras(d);
    else if (suceso === "abajo") this.llegarDondeSeRespira(d);
    this.decirLoQueQueda();
    /*
     * Y detrás de la máscara, la tarjeta de qué hacer y hasta dónde, que se
     * queda mientras se baja: es lo que se mira de reojo con las manos
     * ocupadas.
     */
    if (
      !this.tarjetaDelDescenso &&
      d.avisoEn !== null &&
      !d.terminado &&
      this.relojDeCabina - d.avisoEn > 5
    ) {
      this.tarjetaDelDescenso = true;
      this.hud.senal.mostrar(
        this.aircraft.aerofrenos !== null ? "aerofrenos" : "descenso",
        this.rotuloDelDescenso(d),
        null,
        { segundos: 25, prioridad: IMPORTANTE },
      );
    }
    // Parado en el suelo, el ejercicio se acabó: lo demás es otro vuelo.
    if (d.terminado && s.onGround && s.groundSpeed < 1) {
      this.descensoDeEmergencia = null;
      this.porDecirDelDescenso = [];
    }
  }

  /**
   * Lo que pone la tarjeta del descenso: en el peldaño de las cifras, hasta
   * dónde y a qué velocidad, en las unidades del cuadro.
   */
  private rotuloDelDescenso(d: DescensoDeEmergencia): string {
    const canales = canalesDe(this.tier.avisos);
    if (!canales.texto) return "";
    if (canales.corto) return t("palabra.aBajar");
    const u = UNIT_SYSTEMS[this.tier.units];
    const paso = this.tier.units === "aeronautical" ? 100 : 10;
    const altura = Math.round(u.altitude(d.objetivo) / paso) * paso;
    const velocidad = Math.round(
      u.speed(velocidadDelDescenso(this.aircraft, d.objetivo, this.flight.aireDelDia())),
    );
    return `${t("palabra.descensoDeEmergencia")} · ${altura} ${u.altitudeLabel()} · ${velocidad} ${u.speedLabel()}`;
  }

  /**
   * **La cabina pasa de diez mil pies**: la luz roja, la voz de la caja en el
   * avión que la lleva, la instructora detrás en los peldaños de abajo —o en
   * todos, en el que no la lleva—, la llamada de socorro y la comandante a su
   * tripulación. Ver `cantar`.
   */
  private avisarDeLaCabina(d: DescensoDeEmergencia): void {
    const clave: TranslationKey =
      this.aircraft.aerofrenos !== null
        ? "vuelo.cabinaSinPresion"
        : "vuelo.cabinaSinPresionConTren";
    const dicho = this.avisoCon(clave, "palabra.mascara");
    const canales = canalesDe(this.tier.avisos);
    const tuc = concienciaUtil(d.alturaAlEmpezar);
    const rotulo = canales.cifra
      ? `${t("palabra.mascara")} · ${Math.round(tuc.min)}–${Math.round(tuc.max)} s`
      : dicho.rotulo;
    this.hud.senal.mostrar("mascara", rotulo, null, { segundos: 5, prioridad: IMPORTANTE });
    this.cantar("cabin", dicho.texto, dicho.id, "urgente");
    // Lo siguiente de la instructora va detrás de esto, que va detrás de la caja.
    this.hastaDelDescenso.instructor = Date.now() + 1000 + loQueTardaEnDecirse(dicho.texto);
    /*
     * **Y se declara la emergencia**, que cambia lo que hace todo el mundo en
     * tierra: MAYDAY, porque sin aire el peligro es grave e inminente. Con la
     * misma respuesta de la torre que sin motor.
     */
    this.declararMayday("emergency descent");
    /*
     * La ventanilla, abajo: en los peldaños que explican la pone la
     * instructora, como pone la que autoriza la torre; en el de cabina, quien
     * vuela, que es lo primero que hace una tripulación de verdad.
     */
    if (this.llevaVentanillaAlt && laInstructoraLoExplica(this.tier.avisos))
      this.ventanillaAlt = Math.ceil(d.objetivo / PIE_EN_METROS / 100 - 1e-9) * 100;
    if (conTripulacion(this.aircraft.mass))
      this.encolarDelDescenso("megafonia", "comandante.descensoDeEmergencia");
  }

  /**
   * **Caen las máscaras**: la tripulación lo cuenta al pasaje —o la
   * comandante, donde no hay tripulación— y la instructora cuenta por qué
   * primero la tuya, con el número de la tabla.
   */
  private caenLasMascaras(d: DescensoDeEmergencia): void {
    /*
     * Y el cartel del cinturón, que se enciende solo con las máscaras, como en
     * la familia de Embraer: con su *ding*. Lo apaga quien vuela, que es quien
     * lo apagaría. Ver `atenderAlCinturon`.
     */
    if (conPasaje(this.aircraft.mass)) this.cinturon.ponerMando("puesto");
    if (conTripulacion(this.aircraft.mass)) {
      const clave = comoSeDiceAqui(
        "tripulacion.mascaras",
        this.hablaDeLaTripulacion(),
      ) as TranslationKey;
      this.encolarDelDescenso("megafonia", clave);
    } else if (conPasaje(this.aircraft.mass)) {
      this.encolarDelDescenso("megafonia", "comandante.mascaras");
    }
    if (!laInstructoraLoExplica(this.tier.avisos)) return;
    const clave: TranslationKey = `vuelo.primeroLaTuya.${comoSeDiceLaConciencia(d.alturaAlEmpezar)}`;
    this.encolarDelDescenso("instructor", clave);
  }

  /**
   * **Ya se respira**: se llegó a la altura segura. La instructora lo dice en
   * los cuatro peldaños —es el cierre del ejercicio y es un elogio—, la
   * comandante avisa a la tripulación y al pasaje, y la flecha se va al
   * aeropuerto más cercano, que es lo que viene después de verdad.
   */
  private llegarDondeSeRespira(d: DescensoDeEmergencia): void {
    const canales = canalesDe(this.tier.avisos);
    const segundos = Math.round(d.segundos ?? 0);
    const rotulo = !canales.texto
      ? ""
      : canales.corto
        ? t("palabra.yaSeRespira")
        : `${t("palabra.yaSeRespira")} · ${Math.floor(segundos / 60)} min ${segundos % 60} s`;
    this.hud.senal.mostrar("corregido", rotulo, null, { segundos: 8, prioridad: IMPORTANTE });
    // Lo que no se llegó a decir bajando ya no toca: se está abajo.
    this.porDecirDelDescenso = this.porDecirDelDescenso.filter((f) => f.por === "megafonia");
    this.encolarDelDescenso("instructor", "vuelo.yaSeRespira");
    if (conTripulacion(this.aircraft.mass))
      this.encolarDelDescenso("megafonia", "comandante.alturaSegura");
    if (conPasaje(this.aircraft.mass))
      this.encolarDelDescenso("megafonia", "comandante.yaSeRespira");
    if (!this.flight.state.onGround) this.desviarConLaReserva();
  }

  /**
   * Un anuncio de la megafonía **que no puede esperar a un momento
   * tranquilo**: los de la emergencia. Con peso de orden y con su texto en la
   * tira. Ver `porMegafonia`, que es el de los anuncios sueltos de siempre.
   */
  private porMegafoniaYa(boca: Instructor, clave: TranslationKey): void {
    boca.decir(t(clave), clave, "mando");
    if (this.tier.instruments !== "none") this.hud.radio(t(clave));
  }

  /** Si en el campo de ahora hay una torre que conteste: con lección de torre y con torre. */
  private hayTorreQueHable(): boolean {
    return this.leccion.torre && !sinTorre(this.elCampo().escenario.aerodrome);
  }

  /**
   * **Por qué cabecera se viene, y qué se dice por ello.** Ver
   * `flight/la-otra-cabecera.ts`.
   *
   * Corre cada paso antes de la velocidad, que sin motor depende de estar en
   * final por cualquiera de las dos puntas. Y aquí se acaba el vuelo sin
   * motor: parado en el suelo ya no es un planeo, es un avión en tierra.
   */
  private mirarLaCabecera(): void {
    const s = this.flight.state;
    if (this.sinMotor && s.onGround && s.groundSpeed < 1) this.sinMotor = false;
    if (s.onGround) {
      this.enFinalPor = { enUso: null, otra: null };
      return;
    }
    const campo = this.elCampo();
    const por = porQueCabecera(
      campo.pista,
      s.position.x,
      s.position.z,
      s.heading,
    );
    this.enFinalPor = { enUso: por.enUso, otra: por.otra };
    // Sin pista con dos cabeceras de verdad no hay otra punta que decir.
    if (!campo.escenario.aerodrome || !cabeceraContraria(campo.escenario)) return;
    const meteo = campo.escenario.meteo;
    const alto = s.position.y - this.cotaDelCampo(campo);
    const pasa = this.laOtraCabecera.paso({
      ...por,
      alto,
      // El viento de cara en la de uso es el de cola en la otra.
      deColaEnLaOtra: meteo ? deFrente(campo.pista.heading, meteo) : 0,
      sinMotor: this.sinMotor,
    });
    if (!pasa) return;
    if (pasa.que === "autorizada")
      this.autorizarSinMotor(
        pasa.cabecera === "otra"
          ? cabeceraContraria(campo.escenario)
          : cabeceraEnUso(campo.escenario),
      );
    else if (pasa.que === "pistaEnUso") this.decirLaPistaEnUso();
    else this.laAproximacion.mandarIrsePorLaOtraCabecera(alto, pasa.porque);
  }

  /**
   * **La pista en uso, a quien viene por la otra punta**, todavía lejos.
   *
   * Es información, no una orden: da tiempo a dar la vuelta sin que sea una
   * maniobra. De Taguató para arriba la dice la torre en fraseología
   * —«runway in use zero three»—; abajo, la instructora con el porqué, que es
   * el viento. El dibujo de dar la vuelta, en los cuatro peldaños.
   */
  private decirLaPistaEnUso(): void {
    const dicho = this.avisoCon("vuelo.laOtraPunta", "palabra.otraPunta");
    this.hud.senal.mostrar("media-vuelta", dicho.rotulo, null, {
      segundos: SE_QUEDA_EL_ARO,
      prioridad: IMPORTANTE,
    });
    this.avisar("attention");
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    if (conCifras && this.hayTorreQueHable())
      this.porRadio("runway in use", "mando", undefined, true);
    else this.instructor.decir(dicho.texto, dicho.id, "mando");
  }

  /**
   * **Sin motor, la pista que se elija**, con prioridad.
   *
   * Al alinearse con cualquiera de las dos cabeceras la torre le quita la
   * pista a quien la tuviera —también al que va delante en final: con un
   * MAYDAY en la frecuencia, se aparta— y da la verde con el número de la que
   * se tiene delante. «Podés aterrizar» en los cuatro peldaños y, de Taguató
   * para arriba, «runway two one, cleared to land».
   */
  private autorizarSinMotor(cabecera: string | null): void {
    if (!this.hayTorreQueHable()) return;
    this.turno.alSerTuya("");
    this.autorizarElAterrizaje(cabecera);
  }

  /**
   * El depósito, para los dos sitios que lo dibujan.
   *
   * Uno solo, porque el cuadro plano y las pantallas de la cabina son dos
   * dibujos de **la misma** cabina: que uno diga una cosa y el otro otra es el
   * fallo clásico de esta casa y no se va a estrenar con el combustible.
   */
  private elDeposito(): {
    kilos: number;
    cabe: number;
    reserva: number;
    estado: "bien" | "reserva" | "poco";
  } {
    return {
      kilos: this.combustible,
      cabe: loQueCabe(this.aircraft),
      reserva: reservaEnKilos(this.aircraft),
      estado: comoVaElDeposito(this.aircraft, this.combustible),
    };
  }

  /**
   * Llenar para este vuelo: el tramo al destino, el del destino a su
   * alternativo, la maniobra y la reserva. Ver `cargaParaElPlan`.
   *
   * Cargaba ida y vuelta al destino **más lejano** de los posibles, fuera cual
   * fuera el elegido, con el argumento de que se puede cambiar de idea en el
   * aire. Es un argumento cómodo y es lo contrario de lo que se hace: un avión
   * sale con lo de **su** plan más un plan B con nombre —el alternativo—, y si
   * en el aire cambia de idea, es esa cuenta la que dice si puede. Y con el
   * destino elegido en el hangar, el número por fin depende de algo que se
   * decide: ir a Lanzarote pesa más que ir a Tenerife Norte.
   *
   * La vuelta ya no se carga desde casa porque ya no hace falta: al apagar el
   * motor en el campo de llegada se vuelve a llenar para el tramo de vuelta,
   * que es lo que pasa en cualquier aeropuerto. Ver `toggleEngine`.
   */
  private repostar(): void {
    this.repostarPara(this.salidaId, this.destinoId);
  }

  /** Llenar para el tramo de `salidaId` a `destinoId`. Ver `repostar`. */
  private repostarPara(salidaId: string, destinoId: string): void {
    this.combustible = this.cargaDelTramo(salidaId, destinoId);
    this.tramoDelRepostaje = this.tramoParaCargar(salidaId, destinoId).clave;
    this.quemaDeAhora = 0;
    this.avisadoDeLaReserva = false;
    this.llamadaDicha = "nada";
  }

  /**
   * Llenar para ese tramo **si no está ya lleno para él**. Ver `hayQueLlenar`.
   */
  private llenarSiHaceFalta(salidaId: string, destinoId: string): void {
    if (
      hayQueLlenar(
        { tramo: this.tramoDelRepostaje, kilos: this.combustible },
        this.tramoParaCargar(salidaId, destinoId).clave,
        this.cargaDelTramo(salidaId, destinoId),
      )
    )
      this.repostarPara(salidaId, destinoId);
  }

  /** Lo que se carga para un tramo: ida, alternativo, maniobra y reserva. */
  private cargaDelTramo(salidaId: string, destinoId: string): number {
    const { salida, destino } = this.tramoParaCargar(salidaId, destinoId);
    return cargaParaElPlan(
      this.aircraft,
      tramosDelPlan(salida, destino, this.camposDelVuelo()),
    );
  }

  /** Los dos campos de un tramo, como los carga el depósito, y su nombre. */
  private tramoParaCargar(
    salidaId: string,
    destinoId: string,
  ): { salida: CampoConNombre; destino: CampoConNombre; clave: string } {
    const salida = this.campoPorId(salidaId) ?? this.camposDelVuelo()[0]!;
    const destino = this.campoPorId(destinoId) ?? salida;
    return { salida, destino, clave: `${salida.id}>${destino.id}` };
  }

  /** Las estelas de los demás. Ver `flight/estela.ts`. */
  private readonly estelas = new Estelas();

  /**
   * **Por dónde pasan los que dejan estela**, con su peso y su ala.
   *
   * Los tres tráficos, cada uno con la clase que es: la del circuito dice su
   * tipo, la de la ruta su silueta, y el de las islas es siempre el turbohélice
   * regional. Ver `DE_CLASE` en `flight/estela.ts`.
   */
  private apuntarLasEstelas(): void {
    const suelo = (x: number, z: number) => this.terrain.sampleHeight(x, z);
    const quienes: QuienVuela[] = [];
    const uno = (id: string, x: number, y: number, z: number, clase: string) => {
      const c = DE_CLASE[clase];
      if (!c) return;
      quienes.push({ id, x, y, z, ...c, sobreElSuelo: y - suelo(x, z) });
    };
    for (const q of this.trafico?.quienes() ?? [])
      uno(`circuito:${q.matricula}`, q.x, q.y, q.z, q.tipo);
    for (const q of this.avionesDeRuta?.quienes() ?? [])
      uno(`ruta:${q.id}`, q.x, q.y, q.z, q.silueta);
    for (const q of this.islenos?.quienes() ?? [])
      uno(`islas:${q.id}`, q.x, q.y, q.z, "turbohelice");
    this.estelas.anotar(this.clock.elapsedTime, quienes, suelo);
  }

  /**
   * Las células de las que ya se avisó en este vuelo. Ver `avisarDeLaTormenta`.
   */
  private readonly tormentasDichas = new Set<Celda>();

  private avisarDeLaTormenta(): void {
    // Rodando no se rodea nada: esto es un aviso de vuelo.
    if (!this.celdas.length || this.flight.state.onGround) return;
    const s = this.flight.state;
    /*
     * **Solo las que se rodean de verdad**: las de núcleo rojo. Una célula
     * verde de lluvia floja se cruza, y pedir rodearla enseña que toda la
     * lluvia es peligrosa. Ver `seRodea`.
     */
    const viene = laQueVieneDelante(
      this.celdas.filter(seRodea),
      s.position.x,
      s.position.z,
      s.heading,
    );
    /*
     * **Y una vez por célula, no una vez por rato.** Esto se pedía cada
     * fotograma y lo único que lo frenaba era la regla de no repetirse de la
     * boca, que es un reloj de veinticinco segundos: con una célula delante
     * durante dos minutos, cinco avisos iguales y ciento ochenta y ocho
     * descartes en la cola. Lo que rearma el aviso es que venga **otra**.
     */
    if (!viene || this.tormentasDichas.has(viene.celda)) return;
    this.tormentasDichas.add(viene.celda);
    const dicho = this.avisoCon("vuelo.tormenta", "palabra.tormenta");
    /*
     * El dibujo va en los cuatro peldaños y el rótulo desde el segundo: eso
     * lo resuelve `avisoCon` devolviendo el rótulo vacío donde no toca. Ver
     * `flight/escalera.ts`.
     */
    this.hud.senal.mostrar("tormenta", dicho.rotulo, null, { segundos: 5 });
    this.instructor.decir(dicho.texto, dicho.id);
  }

  /**
   * **Si al señalero se le ve**: está en la escena, está de pie y cae dentro
   * de lo que enseña la cámara.
   *
   * Es la condición de su tarjeta, y está escrita contra el dibujo y no
   * contra lo que él cree: su `visible` dice que se ha puesto a trabajar,
   * no que haya nadie mirándole. Con el grupo fuera de la escena, o detrás de
   * la cámara, la bandera seguía en verdad.
   *
   * Con histéresis en el borde del cuadro, para que la tarjeta no parpadee
   * cuando el señalero roza el marco de la pantalla al girar.
   */
  private senaleroALaVista(): boolean {
    const g = this.senalero.grupo;
    if (!g.visible || g.parent !== this.scene) {
      this.senaleroEnCuadro = false;
      return false;
    }
    // A media altura de la figura, que es lo que se reconoce.
    const p = this.puntoDelSenalero
      .copy(g.position)
      .setY(g.position.y + 1.5)
      .project(this.camera);
    const borde = this.senaleroEnCuadro ? 1.15 : 1;
    this.senaleroEnCuadro =
      p.z < 1 && Math.abs(p.x) < borde && Math.abs(p.y) < borde;
    return this.senaleroEnCuadro;
  }

  /**
   * Si el campo en el que se está es particular: sin señalero ni coche de
   * sígame, que son servicios de un aeropuerto. Ver `Aerodrome.privado`.
   */
  private get campoParticular(): boolean {
    return this.elCampoMontado().escenario.aerodrome?.privado === true;
  }

  /**
   * **Si la llegada al puesto la lleva el señalero**, y entonces la fase de
   * haber llegado no se anuncia todavía.
   *
   * «Llegaste, apagá el motor» y la tarjeta del final salían en cuanto el
   * avión se paraba a cuarenta y cinco metros del puesto —ver `LLEGADA` en
   * `flight/vuelo.ts`—, con el señalero todavía haciendo señas o sin haber
   * cruzado los bastones. El orden de verdad lo lleva él: alto, frenos,
   * calzos y cortar motores; la llave sale con esa última seña. La fase se
   * apunta igual —es lo que es—, solo que callada. Si se para antes de su
   * sitio y no sigue, al rato se da por llegado igual: ver
   * `PACIENCIA_EN_EL_PUESTO`.
   */
  private elSenaleroLlevaLaLlegada(vista: Vista): boolean {
    return (
      vista.fase === "en-puesto" &&
      this.gestoEnPantalla !== null &&
      this.paradoSinLlegar < PACIENCIA_EN_EL_PUESTO
    );
  }

  /** Segundos parado en «en-puesto» con el señalero llamando todavía. */
  private paradoSinLlegar = 0;

  /**
   * **La tarjeta de la seña del señalero**, sin su voz: el mismo señalero
   * dibujado, y la tecla de lo que se hace con esa seña. Devuelve si la seña
   * es de parar, que es la que además se dice.
   */
  private tarjetaDelSenalero(gesto: string): boolean {
    /*
     * **El «despacio» del señalero se ve siempre y se dice solo a quien
     * lleva el gas.** Donde el juego lleva la velocidad, pedirle a quien
     * juega que frene es reñirle por lo que hace el juego: el gesto sigue en
     * el mundo y en la tarjeta, que es lo que hace el señalero de verdad,
     * pero sin la voz ni la tecla del freno. El «alto» sí: dice dónde se
     * para, y eso se aprende igual lleve quien lleve el gas. Ver
     * `laVelocidadEsDelJuego`.
     */
    const parando =
      gesto === "alto" ||
      (gesto === "despacio" && !this.laVelocidadEsDelJuego());
    /*
     * **Y las de ya parado, con lo que se hace en cada una**: con «frenos»,
     * la tecla del freno; con «calzos», nada, que eso lo hace quien está
     * abajo; y con «cortar motores», la llave, que se puede tocar como la de
     * la fase. Ver `YA_PARADO` en `flight/senalero.ts`.
     */
    const cortar = gesto === "cortar";
    const tecla =
      parando || gesto === "frenos"
        ? nombreDeTecla(this.input.preferredKey("brakes"))
        : cortar
          ? nombreDeTecla(this.input.preferredKey("engine"))
          : null;
    this.hud.senal.mostrar(comoDibujo(`senalero-${gesto}`), "", null, {
      segundos: Infinity,
      tecla,
      accion: cortar ? () => this.toggleEngine() : null,
    });
    return parando;
  }

  /** Si el señalero estaba en el cuadro el fotograma anterior. */
  private senaleroEnCuadro = false;
  private readonly puntoDelSenalero = new Vector3();

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
    /*
     * **Y en el puesto al que se va ahora, no en el que se salió.**
     *
     * Se colocaba una vez, al empezar el vuelo, y ahí se quedaba. El puesto
     * de llegada puede ser otro —se cambia de aeronave a mitad y la grande no
     * cabe donde cabía la chica, o se aterriza en otro campo y el plan se
     * muda— y entonces el señalero se queda de pie donde ya no para nadie. No
     * es que llegue tarde: es que **no aparece**, porque solo se le ve a
     * doscientos veinte metros de su sitio. Contado dos veces, y las dos con
     * el mismo tono: «no estaba el de las lucecitas para ayudarme a aparcar,
     * yo que le iba a dar un eurito».
     *
     * Comprobarlo cuesta una resta por fotograma y solo mientras se vuelve.
     */
    /*
     * **Y en un campo particular no hay señalero.**
     *
     * El señor de los bastones es un servicio de plataforma de aeropuerto,
     * igual que el coche del sígame, y en la granja seguía esperando en el
     * puesto con su chaleco. Allí quien recibe es quien salió a buscarte en
     * la bici: te lleva hasta el hueco y se queda a un lado. Ver
     * `Aerodrome.privado` y `construirBici`.
     */
    const hayQuienSenale = !this.campoParticular;
    if (!hayQuienSenale && this.senalero.grupo.visible) this.senalero.reiniciar();
    if (volviendo && hayQuienSenale) this.senaleroAlPuestoDeLlegada();
    const s = this.flight.state;
    /*
     * **Lo que rueda por el suelo, no lo que marca el anemómetro.** Con viento
     * de cara un avión parado en su puesto marca la velocidad del viento: en
     * Los Rodeos, siete metros por segundo. El señalero no lo daba nunca por
     * parado —ni frenos, ni calzos, ni cortar motores— y se quedaba en el
     * alto. Es la misma corrección que ya se hizo en el tope de rodaje.
     */
    const porElSuelo = Math.hypot(s.velocity.x, s.velocity.z);
    const gesto = hayQuienSenale
      ? this.senalero.paso(
          dt,
          {
            x: s.position.x,
            z: s.position.z,
            velocidad: porElSuelo,
            enElSuelo: s.onGround,
            motor: this.input.controls.engineOn,
          },
          volviendo,
        )
      : null;
    /*
     * **La red de quien se para antes de su sitio**: con el señalero todavía
     * llamando y el avión quieto, al rato se da la llegada por buena y sale la
     * llave, como antes. Ver `elSenaleroLlevaLaLlegada`.
     */
    const llamando =
      fase === "en-puesto" &&
      porElSuelo < 0.5 &&
      (gesto === "adelante" || gesto === "izquierda" || gesto === "derecha");
    const antesDeLaRed = this.paradoSinLlegar;
    this.paradoSinLlegar = llamando ? this.paradoSinLlegar + dt : 0;
    // Y al saltar la red, la llegada se anuncia entera, con su voz.
    if (antesDeLaRed < PACIENCIA_EN_EL_PUESTO && this.paradoSinLlegar >= PACIENCIA_EN_EL_PUESTO)
      this.faseAnunciada = "";

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
    /*
     * **Y solo si quien se pasó fue quien juega.** Donde el juego lleva la
     * velocidad —Guyrami y Tukã—, es él quien frena el avión en el puesto; si
     * se pasa, se ha pasado el juego, y «frená y volvé» sería reñir a quien no
     * tenía el freno. Ver `laVelocidadEsDelJuego`.
     */
    if (
      volviendo &&
      pasado > SE_PASO_DEL_PUESTO &&
      porElSuelo > 2 &&
      !this.laVelocidadEsDelJuego()
    ) {
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
    /*
     * **Y la tarjeta solo repite lo que se ve.** Es el mismo señalero dibujado
     * con los brazos donde los tiene él; si él no está en el cuadro, la
     * tarjeta es un fantasma que da órdenes. Pasó dos veces por dos caminos:
     * con el señalero fuera de la escena —ver dónde se monta el plan— y con
     * el avión pasando por otra calle, lejos y de lado. Ver
     * `senaleroALaVista`.
     */
    const enPantalla = !this.senaleroALaVista() ? null : gesto;
    /*
     * **Y si otra tarjeta le quitó el sitio y ya se fue, vuelve la suya.** Con
     * la llegada callada mientras la lleva el señalero —ver
     * `elSenaleroLlevaLaLlegada`— su tarjeta es la única: la de recoger los
     * flaps la tapó al pararse en Los Rodeos y, al irse, la pantalla se quedó
     * vacía quince segundos con el avión parado en el puesto.
     */
    if (
      enPantalla !== null &&
      enPantalla === this.gestoEnPantalla &&
      this.hud.senal.puesto.dibujo === ""
    )
      this.tarjetaDelSenalero(enPantalla);
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
      /*
       * **Y con el avión ya en el puesto, la bici sigue con la raya que tenía.**
       *
       * Al llegar el plan quita la raya, y quien te había salido a buscar se
       * quedaba plantada donde la pillara: si el avión la había adelantado
       * —ella se aparta para dejarlo pasar, ver `sitioParaLaBici`—, a noventa
       * metros del puesto y sin forma de llegar. Quien recibe tiene que
       * acabar junto al avión aparcado: sigue pedaleando por la raya de antes
       * hasta el hueco, y el avión se busca en ella por dónde está, que la
       * cuenta del plan ya se fue con su raya.
       */
      const enBiciEnElPuesto =
        this.sigueme.enBici &&
        this.sigueme.grupo.visible &&
        (fase === "en-puesto" || fase === "apagado");
      if (!enBiciEnElPuesto) this.sigueme.ponerRuta(this.plan.rutaVisible());
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
          fase === "a-plataforma" ||
          /*
           * **Y en el puesto se queda**: es quien te recibe, que en la granja
           * no hay señalero. Si ya había salido, se queda a un lado del hueco
           * mientras parás y apagás, en vez de esfumarse en el momento en
           * que llegás. Ver `NO_LLEGA_EN_BICI`.
           */
          ((fase === "en-puesto" || fase === "apagado") &&
            this.sigueme.grupo.visible)
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
      /*
       * **Y te espera en la salida mientras sigas en la pista, no solo
       * mientras frenás.**
       *
       * Esto miraba una sola fase —«aterrizado»— y en cuanto pasaba a
       * «abandonando», que es justo cuando la instructora dice «salí de la
       * pista, que viene otro», el tope desaparecía: el coche volvía a
       * plantarse treinta metros por delante del morro, **en la pista**. Y un
       * sígame va a velocidad de coche; quien acelera hacia una salida lejana
       * va mucho más rápido, lo alcanza y se lo lleva por delante.
       *
       * Contado jugando en Fuerteventura: «ya la locución me había dicho salí
       * de la pista que viene otro, acelero porque en esta pista las salidas
       * están lejos, y "se rompió, volvemos a empezar"». Te mandan salir, te
       * ponen el coche delante y adelantarlo cuesta el vuelo.
       *
       * El porqué ya estaba escrito aquí al lado —«por una pista en uso no
       * circula nadie»— y la guarda cubría una fase de las tres. Ahora la
       * condición es **dónde están las ruedas**, que es el hecho, y no en qué
       * fase cree el plan que va el vuelo: mientras el avión pise pista, el
       * coche espera en la boca de la salida.
       */
      /*
       * **Y hasta que el avión llega a la salida, no solo mientras pisa pista.**
       *
       * Mirar las ruedas era mirar un fotograma, y el avión que da la vuelta
       * en la pista —porque se pasó la salida o porque la única está atrás,
       * como en El Hierro— pisa la hierba un segundo al girar. En ese segundo
       * se apagaba la espera y el coche, que guía desde el morro, salía de la
       * calle a ponerse delante **sobre la pista**; al volver el avión al
       * asfalto la espera volvía y el coche bajaba la pista hacia la salida
       * con el avión detrás. Medido en Guaraní con el JAZ 90, treinta metros.
       *
       * Lo que decide si el coche tiene que esperar no es dónde están las
       * ruedas ahora: es **si el avión ha llegado ya a la salida**, contado
       * sobre la misma ruta.
       */
      const enLaPistaAun = s.onGround && s.onRunway;
      const trasLaToma =
        fase === "aterrizado" ||
        fase === "abandonando" ||
        fase === "a-plataforma";
      const boca = trasLaToma ? this.bocaDeLaSalida() : null;
      const antesDeLaSalida =
        boca !== null && (this.plan?.avanceEnLaRuta ?? 0) < boca.s;
      const espera =
        boca && (fase === "aterrizado" || enLaPistaAun || antesDeLaSalida)
          ? boca
          : null;
      /*
       * **Y a la bici se le deja sitio siempre.**
       *
       * El coche se deja atropellar porque es un chiste y porque enseña algo:
       * en una plataforma no se adelanta. Una persona en bicicleta, no. Así
       * que en cuanto la tenés encima se aparta y te deja pasar, y el
       * percance de más abajo no se le aplica. Lo que aprende quien juega
       * sigue siendo lo mismo: detrás de quien te guía, no encima.
       *
       * Cuándo es «encima» lo decide ella, que sabe lo deprisa que se le
       * acerca el avión: ver `sitioParaLaBici`. Aquí se decía con una
       * distancia fija, y la distancia fija la dejaba apartada desde el
       * primer metro. Lo que queda aquí es el señalero, que es de los dos.
       */
      const cede = gesto !== null;
      this.sigueme.paso(
        dt,
        {
          x: s.position.x,
          z: s.position.z,
          adelanto: this.adelantoDelSigueme,
          enPista: enLaPistaAun,
        },
        // Y si está en la pista y no hay salida que esperar, no sale: lo
        // contrario es ponerlo a correr por una pista en uso. Ver `espera`.
        rodando &&
          s.onGround &&
          !((fase === "aterrizado" || enLaPistaAun) && !espera),
        cede,
        // Por el asfalto, como el avión: ver `Terrain.resalteEn`.
        (x, z) => this.terrain.sampleSurface(x, z),
        espera,
        enBiciEnElPuesto ? undefined : this.plan?.avanceEnLaRuta,
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
        leccionHecha: this.vistaActual?.leccionHecha ?? false,
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
    /*
     * **Y mira todas las pistas del vuelo, no solo la de casa.**
     *
     * Mirando una sola, tomar tierra en el otro aeropuerto daba «fuera de
     * pista» y rompía el avión: «tomé tierra con estos parámetros y se rompió,
     * no lo considera un aterrizaje». Aterrizar bien no puede ser un percance.
     */
    return sobreAlguna(
      this.pistasDelVuelo(),
      this.flight.state.position.x,
      this.flight.state.position.z,
      LA_FRANJA,
    );
  }

  private sobreLaPista(): boolean {
    const r = this.laPistaDeAhora();
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

  /**
   * Lo mismo, pero **donde se puede tocar**: del umbral de aterrizaje en
   * adelante, sin margen por delante.
   *
   * Contaba desde la barra pero con los trescientos metros de margen de
   * `sobreLaPista`, así que en la 01 de Fuerteventura el «ya podés tocar»
   * seguía saliendo sobre los últimos trescientos metros de flechas —el único
   * sitio de la pista donde no se puede—. Ver `sobreDondeSeToca`. El aviso de
   * terreno sigue mirando la pista entera con su margen, que sobre asfalto no
   * hay terreno que avisar.
   */
  private sobreLaZonaDeToma(): boolean {
    const r = this.laPistaDeAhora();
    const { along, across } = enEjesDePista(
      this.flight.state.position.x,
      this.flight.state.position.z,
      r.x,
      r.z,
      r.heading,
    );
    return (
      Math.abs(across) < r.width / 2 + A_UN_LADO_DEL_EJE &&
      sobreDondeSeToca(r, along, (this.flight.state.heading * 180) / Math.PI)
    );
  }

  /**
   * Si las ruedas están en la pista **antes de su umbral de aterrizaje**, en
   * la zona de las flechas. Es lo que convierte una toma en «corta». Ver
   * `Aterrizaje`.
   */
  private enLaZonaDeLasFlechas(): boolean {
    const r = this.laPistaDeAhora();
    const { along, across } = enEjesDePista(
      this.flight.state.position.x,
      this.flight.state.position.z,
      r.x,
      r.z,
      r.heading,
    );
    return (
      Math.abs(across) < r.width &&
      antesDelUmbralDeToma(
        r,
        along,
        (this.flight.state.heading * 180) / Math.PI,
      )
    );
  }

  /**
   * Cuánto queda hasta el umbral en uso **del campo de ahora**, m.
   *
   * Medía hasta el de casa. Volando de Gran Canaria a Los Rodeos eso son
   * ciento trece kilómetros en plena final, y con ellos el aviso de terreno
   * creía que se iba muy por debajo de la senda —la mitad de tres grados a
   * esa distancia son casi tres mil metros— y sonaba «terrain, pull up» en
   * una final perfecta. Y el detector de frustradas, que solo se arma en
   * final, no se armaba nunca: renunciar allí no se reconocía.
   */
  private distanceToRunway(): number {
    const p = this.flight.state.position;
    return distanciaAlUmbral(this.elCampo(), p.x, p.z);
  }

  /** La cota del centro de la pista de un campo, m. */
  private cotaDelCampo(campo: CampoEnElMundo): number {
    if (campo.esCasa) return this.terrain.runwayElevation;
    const v = this.vecinos.find((w) => w.campo.id === campo.id);
    return v ? v.mundo.terreno.runwayElevation : this.terrain.runwayElevation;
  }

  /**
   * El techo de nubes sobre un campo, m, o `null` si no hay o si la capa
   * queda por debajo de su pista.
   *
   * La capa es una sola y está a una altura del mundo: la del parte, medida
   * sobre el aeródromo que lo dio, que es el de casa. Sobre otro campo el
   * techo es lo que quede entre esa capa y su pista, y si la pista está por
   * encima —Los Rodeos a seiscientos metros con la capa de Gando a
   * trescientos— se llega por encima de las nubes y la pista se ve.
   */
  private techoSobre(campo: CampoEnElMundo): number | null {
    if (this.techoDeNubes === null) return null;
    if (campo.esCasa) return this.techoDeNubes;
    const sobre =
      this.terrain.runwayElevation + this.techoDeNubes - this.cotaDelCampo(campo);
    return sobre > 0 ? sobre : null;
  }

  /**
   * Las luces de aproximación de un campo, si las tiene. Las de casa son
   * `aproximacion`; las de cada vecino van con él.
   */
  private lucesDe(campo: CampoEnElMundo): Aproximacion | null {
    if (campo.esCasa) return this.aproximacion;
    return this.vecinos.find((v) => v.campo.id === campo.id)?.aproximacion ?? null;
  }

  /** Las luces de aproximación del campo de ahora, para los bancos. */
  get papiDeAhora(): Aproximacion | null {
    return this.lucesDe(this.elCampo());
  }

  /**
   * El campo de ahora, tal y como lo mira la aproximación. Ver
   * `CampoDeLaAproximacion`.
   */
  private campoParaLaAproximacion(): CampoDeLaAproximacion {
    const campo = this.elCampo();
    const p = this.flight.state.position;
    const luces = this.lucesDe(campo);
    return {
      pista: campo.pista,
      cota: this.cotaDePistaEn(campo, p.x, p.z),
      alUmbral: distanciaAlUmbral(campo, p.x, p.z),
      // Las luces se cuentan desde el umbral de aterrizar, que con el umbral
      // desplazado no es la punta. Ver `crearAproximacion`.
      senda:
        luces && this.tienePapi.get(luces)
          ? enLaPistaDe(
              campo,
              hastaElUmbralDeToma(campo.pista) - luces.papiAdentro,
            )
          : null,
    };
  }

  /**
   * Si unas luces de aproximación llevan PAPI. Se mira una vez al montarlas:
   * buscarlo por nombre en cada fotograma es recorrer el grupo entero.
   */
  private readonly tienePapi = new WeakMap<Aproximacion, boolean>();

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
      (v, desde) => this.flight.gasParaRodar(v, desde),
      this.tier,
      this.vistaActual,
      this.techoDeLaCarrera,
    );
  }

  /**
   * **Si la velocidad por el suelo la lleva ahora el juego**, y entonces no
   * se le riñe a quien juega por ella.
   *
   * La pregunta es la del tope, hecha por la misma función: los cuatro
   * avisos que juzgan la velocidad en tierra —el «más despacio» de la raya, el
   * de la banda, el del señalero y el «te pasaste, frená y volvé»— la hacen
   * antes de hablar. Ver `laVelocidadEsDelJuego` en `flight/tope-de-rodaje.ts`.
   */
  private laVelocidadEsDelJuego(): boolean {
    return laVelocidadEsDelJuego(
      this.flight.state,
      this.tier,
      this.vistaActual,
    );
  }

  /**
   * **«Motor a fondo», justo cuando el juego suelta el gas.**
   *
   * En Guyrami el juego lleva el gas hasta que el morro mira pista abajo
   * —ver `entraConElJuego` en `flight/tope-de-rodaje.ts`— y quien tenía la
   * palanca a fondo no sabía por qué el avión no corría: «hay que rodar un
   * poco antes de que los motores respondan». Al soltarlo se dice, con la
   * frase de la fase de despegar y su tarjeta; la fase, cuando llegue, ya no
   * lo repite. Un suceso, una voz.
   */
  private decirElGasSuelto(vista: Vista): void {
    const conduce = anticipacionDeRodaje(this.tier.assists.taxiAssist) >= 1;
    if (conduce && vista.fase === "alineando" && vista.mirandoLaPista) {
      if (this.gasSueltoDicho) return;
      this.gasSueltoDicho = true;
      const clave = GUION.despegando.clave as TranslationKey;
      this.hud.senal.mostrar(
        comoDibujo(GUION.despegando.icono),
        this.tier.instruments !== "none" ? t(clave) : "",
        null,
        { segundos: 4 },
      );
      this.instructor.decir(t(clave), clave);
      return;
    }
    if (!DE_LA_CARRERA.has(vista.fase)) this.gasSueltoDicho = false;
  }

  /** Si ya se dijo «motor a fondo» en esta entrada en pista. */
  private gasSueltoDicho = false;

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
    /*
     * **Y el volante de quien juega manda siempre.** Aquí se repartía: la
     * ayuda pesaba menos cuanto más se giraba, pero seguía sumando, y con el
     * dedo a media palanca tiraba hacia la raya lo bastante para anular el
     * giro. Llegando a Fuerteventura con el JAZ 90, la raya se rehízo por la
     * salida siguiente y el avión «se quedó pegado a la raya verde» sin poder
     * salir por la que tenía delante. Es la regla de `mandaQuienSeMueve`: si
     * alguien gira, gira él, en todos los aviones y en todos los peldaños; y
     * si sale por otra salida, la raya se rehace desde allí. La ayuda vuelve
     * en cuanto suelta. Un dedo apoyado en la palanca sin girar no es girar:
     * por eso el listón y no el cero.
     */
    const pide = this.input.pide;
    if (Math.abs(pide.alabeo) >= GIRA_QUIEN_JUEGA || Math.abs(pide.timon) >= GIRA_QUIEN_JUEGA)
      return;
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
  /**
   * Lo que se ve por la ventanilla.
   *
   * Es lo que hace una comandante en un vuelo largo —«miren a la izquierda,
   * el Teide»— y aquí arregla tres cosas de una vez: el rato muerto del
   * crucero, que era la pega («durante los vuelos largos pueden pasar cosas»),
   * la geografía, que se aprende mirando, y una razón para mirar por la
   * ventana en vez de a los relojes.
   *
   * **Y no es solo la voz.** Sale la tarjeta con el dibujo de lo que es y una
   * flecha al lado hacia el que hay que mirar, que es lo que entiende quien
   * todavía no lee. El nombre —que es el dato, y sale de OpenStreetMap— se
   * escribe a partir del segundo peldaño y la cota a partir del tercero.
   *
   * Cuándo se puede hablar lo decide `LoQueSeVe`; aquí solo se dice.
   */
  /**
   * Lo que se mueve y se puede señalar: los barcos que navegan y, desde una
   * avioneta, el turbohélice que se cruza.
   *
   * Con el alcance de cada cosa: un barco con su estela se distingue a una
   * docena de kilómetros; otro avión, a unos pocos. Y **el avión solo lo
   * señala la instructora**: en un avión de pasaje nadie anuncia por la
   * megafonía que pasa otro, que solo serviría para asustar al de atrás.
   */
  private loQueSeMueve(): Hito[] {
    const lista: Hito[] = [];
    for (const b of this.barcos?.quienes() ?? []) {
      if (b.nudos < 5) continue;
      lista.push({
        nombre: t("hito.unBarco"),
        clase: "barco",
        x: b.x,
        z: b.z,
        ele: null,
        alcance: 12_000,
      });
    }
    if (!conPasaje(this.aircraft.mass))
      for (const a of this.islenos?.quienes() ?? []) {
        /*
         * Y el que ya contó la radio —o el TCAS— no se vuelve a señalar: un
         * suceso, una sola voz. Ver `informarDelTrafico`.
         */
        const id = `islas:${a.id}`;
        if (this.informacionDeTrafico.yaContados.has(id)) continue;
        lista.push({
          nombre: t("hito.otroAvion"),
          clase: "avion",
          x: a.x,
          z: a.z,
          ele: null,
          alcance: 6_000,
          id,
        });
      }
    return lista;
  }

  /**
   * **El momento, para la ventanilla**: dónde va el avión, a qué altura, a
   * cuánto del campo y si hay hueco para hablar. Aparte porque lo preguntan
   * dos: la comandante, para saber si puede contar algo, y la cámara, para
   * saber si se puede girar a mirarlo. Ver `enFaseDeTrabajo`.
   */
  private momentoDeMirar(): MomentoDeMirar {
    const s = this.flight.state;
    /*
     * A cuánto está el campo más cercano del vuelo —el de salida o el de
     * llegada—, que es lo que decide si se está en la cabina estéril. Ver
     * `enFaseDeTrabajo` en `flight/lo-que-se-ve.ts`.
     */
    let alCampo = Infinity;
    for (const p of this.pistasDelVuelo())
      alCampo = Math.min(
        alCampo,
        Math.hypot(p.x - s.position.x, p.z - s.position.z),
      );
    return {
      fase: this.faseDeAhora as Fase,
      x: s.position.x,
      z: s.position.z,
      rumbo: MathUtils.radToDeg(s.heading),
      altitud: s.position.y,
      // Sobre el campo que se tiene debajo: Los Rodeos está seiscientos
      // metros por encima de Gando. Ver `cotaDeLaPistaAqui`.
      sobreElCampo: s.position.y - this.cotaDeLaPistaAqui(),
      alCampo,
      conPasaje: conPasaje(this.aircraft.mass),
      /*
       * Cualquiera de las bocas, y también la máquina. Esto es lo que menos
       * urge de todo lo que suena: una autorización no puede esperar y el
       * paisaje sí. Un suceso, una voz.
       */
      /*
       * **Y no solo que no hable nadie: que haya hueco.** Con mirar si
       * hablaba alguien, «a la izquierda, el Teide» salía en el primer
       * silencio, pegado a lo anterior o con la lección del frío detrás. Lo
       * que se ve espera su hueco, como las lecciones del aire, y se reparte
       * con ellas. Ver `Huecos` en `audio/turnos.ts`.
       */
      alguienHabla:
        // Y en un descenso de emergencia no se mira el paisaje: se baja.
        (this.descensoDeEmergencia !== null && !this.descensoDeEmergencia.terminado) ||
        !this.huecos.hayHueco,
    };
  }

  private mirarPorLaVentanilla(dt: number): void {
    const conGente = conPasaje(this.aircraft.mass);
    const momento = this.momentoDeMirar();
    /*
     * **Y en cuanto empieza el trabajo, la cámara deja de ofrecerse.** Girarse
     * a mirar el paisaje en una aproximación es exactamente lo que la cabina
     * estéril prohíbe: la tarjeta se retira y, si estaba mirando, vuelve.
     */
    if (this.loSenalado && enFaseDeTrabajo(momento)) this.olvidarLoSenalado();
    const mirada = this.ventanilla.paso(dt, momento, () => this.loQueSeMueve());
    if (!mirada) return;
    this.huecos.usar();
    // Y al revés: el avión que se señaló aquí ya no lo cuenta la radio.
    if (mirada.hito.id) this.contadoPorOtro(mirada.hito.id);

    /*
     * **Y lo dice quien de verdad lo diría, con su frase.**
     *
     * Un Pykasu no lleva megafonía ni a quién hablarle por ella: la comandante
     * solo existe donde hay pasaje. En una avioneta quien señala el paisaje es
     * la instructora, que va sentada al lado — y entonces no es «miren», es
     * «mirá». Ver `conPasaje` y los dos registros del castellano en AGENTS.md.
     *
     * Y la frase ya no es una plantilla con el nombre en un hueco: es la de
     * ese sitio, escrita a mano y grabada entera. Ver `audio/ventanilla.ts`.
     */
    const dicho = loQueSeDice(mirada, conGente, this.ventanilla.cuantos - 1);
    if (dicho) {
      const boca = conGente ? this.comandante : this.instructor;
      boca.decir(dicho.texto, dicho.clave, "baja", dicho.relleno);
    }

    const canales = canalesDe(this.tier.avisos);
    /*
     * Y en el peldaño del dibujo, la tarjeta va sin una palabra: la flecha y
     * la figura dicen «mirá hacia allá, es una montaña», que es todo lo que
     * hace falta para girar la cabeza. El nombre lo dice la voz igual.
     */
    const rotulo = !canales.texto
      ? ""
      : canales.cifra && mirada.hito.ele !== null
        ? `${mirada.hito.nombre} · ${mirada.hito.ele} m`
        : mirada.hito.nombre;
    const dibujo = comoDibujo(`hito-${mirada.hito.clase}-${mirada.lado}`);
    /*
     * **Y la tarjeta se toca para mirarlo.** El dibujo del sitio con su
     * flecha ya decía hacia dónde mirar; tocándolo, la cámara se gira hacia
     * allí, se queda un rato y vuelve sola. Sin leer y sin soltar los mandos:
     * el pulgar sigue en la palanca y el otro dedo toca el dibujo. Ver
     * `mirarHaciaLoSenalado`.
     */
    this.loSenalado = mirada.punto ? { mirada, dibujo } : null;
    this.hud.senal.mostrar(
      dibujo,
      rotulo,
      null,
      /*
       * Prioridad cero: esto es lo que menos importa de todo lo que sale en
       * esa esquina. Un aviso de terreno, un tren sin bajar o la orden de la
       * torre tapan al paisaje, y hacen bien.
       *
       * Y doce segundos y no siete, ahora que se toca: siete eran para
       * leerla, y para tocarla hay que oír la frase, encontrar la tarjeta y
       * tener un dedo libre.
       */
      {
        segundos: mirada.punto ? 12 : 7,
        prioridad: 0,
        accion: mirada.punto ? () => this.mirarHaciaLoSenalado() : null,
      },
    );
  }

  /**
   * **Girarse hacia lo que se acaba de señalar**: la cámara va hacia allí con
   * suavidad, se queda ocho segundos y vuelve sola.
   *
   * Desde la vista que se tenga: desde la cabina se gira la cabeza, desde
   * fuera se da la vuelta al avión, y en el pasaje se mira por la ventanilla
   * **del lado del sitio** — si el Teide está a la izquierda y se iba sentado
   * a la derecha, se cambia de asiento, que es lo que haría cualquiera.
   *
   * Y nunca en las fases de trabajo: ahí se vuela. Devuelve si se giró.
   */
  mirarHaciaLoSenalado(): boolean {
    const senalado = this.loSenalado;
    const punto = senalado?.mirada.punto;
    if (!senalado || !punto) return false;
    if (enFaseDeTrabajo(this.momentoDeMirar())) {
      this.olvidarLoSenalado();
      return false;
    }
    if (esDePasaje(this.cameraMode) && this.hayPasaje) {
      const p = this.flight.state.position;
      const haciaEl = Math.atan2(punto.x - p.x, -(punto.z - p.z));
      const relativo = Math.atan2(
        Math.sin(haciaEl - this.flight.state.heading),
        Math.cos(haciaEl - this.flight.state.heading),
      );
      const suyo = relativo < 0 ? "pasaje-izquierda" : "pasaje-derecha";
      if (suyo !== this.cameraMode) {
        this.cameraMode = suyo;
        recordarVista(suyo);
      }
    }
    this.mirada.empezarAMirar();
    return true;
  }

  /**
   * Lo señalado deja de poder mirarse: se retira su tarjeta y, si se estaba
   * mirando, la cabeza vuelve.
   */
  private olvidarLoSenalado(): void {
    if (this.loSenalado) this.hud.senal.caducar(this.loSenalado.dibujo);
    this.loSenalado = null;
    this.mirada.dejarDeMirar();
  }

  /** Lo señalado y hacia dónde se mira, para el banco. */
  get miradaParaBanco(): {
    senalado: { nombre: string; clase: string; lado: string; punto: { x: number; y: number; z: number } } | null;
    guinada: number;
    cabeceo: number;
    apuntando: boolean;
    vista: CameraMode;
  } {
    const m = this.loSenalado?.mirada;
    return {
      senalado:
        m?.punto
          ? { nombre: m.hito.nombre, clase: m.hito.clase, lado: m.lado, punto: m.punto }
          : null,
      guinada: this.mirada.guinada,
      cabeceo: this.mirada.cabeceo,
      apuntando: this.mirada.apuntando,
      vista: this.vistaQueHay(),
    };
  }

  /** Arrastrar el paisaje desde el banco, en píxeles, como un dedo. */
  arrastrarLaMiradaParaBanco(dx: number, dy: number, soltar: boolean): void {
    const k = this.radianesPorPixel();
    this.mirada.arrastrar(dx * k, dy * k);
    if (soltar) this.mirada.soltar();
  }

  private avanzarPlan(dt: number): void {
    if (!this.plan) return;
    this.mudarElPlanSiCambiaDeCampo();
    const faseDeAntes = this.vistaActual?.fase ?? "";
    const suelo =
      this.flight.state.position.y -
      this.terrain.sampleHeight(
        this.flight.state.position.x,
        this.flight.state.position.z,
      );
    /*
     * **Y la lámpara del punto de espera mira la frecuencia.** Con alguien
     * ocupando la pista —alineado, autorizado a aterrizar o en final—, la
     * torre te deja en la roja y aterriza el que viene. Se pregunta justo
     * antes del paso, con la frecuencia como está ahora. Ver `pistaDeOtros`
     * en `flight/turno-de-pista.ts`.
     */
    this.plan.pistaDeOtros = this.turno.pistaDeOtros;
    this.plan.aire = this.flight.aireDelDia();
    const vista = this.plan.paso(
      this.flight.state,
      suelo,
      this.input.controls.engineOn,
      dt,
    );
    this.vistaActual = vista;
    this.decirElGasSuelto(vista);
    this.flapsTrasLaToma(faseDeAntes, vista.fase);
    /*
     * **Y si te pasaste la salida, se dice.** El plan cuenta las veces que
     * rehace la raya por la siguiente; aquí se dice una vez por cada una.
     * Ver `decirSalPorLaSiguiente`.
     */
    if (this.salidasDichas.plan !== this.plan)
      this.salidasDichas = {
        plan: this.plan,
        cuantas: this.plan.salidasPasadas,
        dicha: false,
      };
    else if (this.plan.salidasPasadas > this.salidasDichas.cuantas) {
      this.salidasDichas.cuantas = this.plan.salidasPasadas;
      /*
       * **Una vez por carrera.** Frenando despacio por una pista larga se
       * pasan dos y tres salidas seguidas, y la raya se rehace en cada una;
       * decirlo en cada una era repetir lo mismo tres veces en medio minuto.
       * Una torre lo dice una vez: «next available» ya incluye las demás. Se
       * rearma al volver a despegar.
       */
      if (!this.salidasDichas.dicha) this.decirSalPorLaSiguiente();
      this.salidasDichas.dicha = true;
    }
    if (!this.flight.state.onGround) {
      this.salidasDichas.dicha = false;
      this.calorDicho = false;
      this.calorPorDecir = false;
    } else if (this.calorPorDecir && !this.hud.senal.puesto.dibujo) {
      this.calorPorDecir = false;
      this.decirElCalor();
    }
    this.presentarLaMatricula();
    /*
     * **La pista acaba de pasar a ser tuya**: antes de que la torre te la dé
     * —la lámpara verde y el «cleared to land» se dicen más abajo, en este
     * mismo paso— se le quita a quien la tuviera. Ver `alSerTuya` en
     * `flight/turno-de-pista.ts`.
     */
    if (PISTA_TUYA.has(vista.fase) && !PISTA_TUYA.has(faseDeAntes))
      this.turno.alSerTuya(vista.fase);

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
    // Y en tierra de verdad: una avioneta ligera se despega del suelo todavía
    // «alineando», y la verde en el aire es la de «autorizado para
    // aterrizar» — la torre la decía nada más rotar.
    // Y donde hay torre: en la pista de casa no hay lámpara, se mira. Ver
    // `guionSinTorre`.
    const enTierraEsperando =
      this.hayTorreQueHable() &&
      this.flight.state.onGround &&
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
       * **Y con el señalero llevando la llegada, la fase se apunta pero no se
       * anuncia**: ni su tarjeta ni su voz. La llave sale con su seña de
       * cortar motores. Ver `elSenaleroLlevaLaLlegada`.
       */
      const callada = this.elSenaleroLlevaLaLlegada(vista);
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
      /*
       * **Y si hace calor, se dice antes de correr**: al tener la pista, por
       * la fase que llegue primero, que no en todos los campos son las
       * mismas. Se apunta aquí y se dice en cuanto la tarjeta de la fase haya
       * hecho su trabajo: ver `calorPorDecir`.
       */
      if (!repuesta && ANTES_DE_CORRER.has(vista.fase) && !this.calorDicho)
        this.calorPorDecir = true;
      if (
        vista.fase === "alineando" &&
        this.flight.state.airspeed < ALINEANDO_DE_VERDAD
      ) {
        // La de la pista en la que se está alineando, no la de casa: saliendo
        // de vuelta desde Los Rodeos destellaba «03L».
        const cabecera = cabeceraEnUso(this.elCampo().escenario);
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
        // Y en un campo sin torre no autoriza nadie: en la pista de hierba
        // de la granja no hay a quién oír.
        // Sin motor la pista la da `autorizarSinMotor`, por la punta que sea.
        if (
          vista.fase === "final" &&
          !this.sinMotor &&
          !sinTorre(this.elCampo().escenario.aerodrome)
        )
          this.turno.pedirAterrizaje();
        if (vista.fase === "arrancando" || vista.fase === "rodando")
          this.autorizarLaRuta();
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
        this.despegoDe = this.elCampo().id;
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
      /*
       * **Y yendo a otro aeropuerto, tampoco se da una vuelta**: se sigue la
       * flecha hasta allí. Ver `haciaOtroCampo`.
       */
      /*
       * **Y en una pista sin torre, su guion**: sin lámpara que esperar y sin
       * nadie detrás que meta prisa. Ver `guionSinTorre`. Con la bici, si hoy
       * sale: es la misma condición que la saca a ella, y solo en la pista
       * particular, que es donde hay quien pedalee. En Ayolas no es casa.
       */
      const aqui = this.elCampo().escenario.aerodrome;
      const guion = sinTorre(aqui)
        ? guionSinTorre(
            vista.fase,
            this.tier.sigueme && aqui?.privado === true,
            aqui?.privado === true,
          )
        : esAfis(aqui)
          ? guionAfis(vista.fase)
          : vista;
      const clave =
        this.leccion.id === "aterrizaje" && vista.fase === "en-vuelo"
          ? "vuelo.enVueloAterrizando"
          : vista.fase === "en-vuelo" && this.haciaOtroCampo()
            ? "vuelo.enVueloDestino"
            : guion.clave;
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
      if (!callada) this.hud.senal.mostrar(
        comoDibujo(guion.icono),
        conLetras ? frase : "",
        letra,
        {
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
        },
      );
      // Y con su clave: los ficheros de voz se llaman por clave, no por
      // texto. Ver `audio/banco-de-voz.ts`.
      /*
       * **Y el punto de no retorno ya tiene voz: la del V1.** Pasar a
       * «comprometido» y cantar V1 son el mismo suceso visto por dos
       * detectores —la pista que queda y la aguja—, y en el peldaño de cabina
       * sonaba dos veces: «V one» y, detrás, «ya despegamos: seguí». Ahí lo
       * dice la cabina; en los de abajo el V1 ya se canta con esta misma frase,
       * y la boca no la repite. Ver `onVelocidades`.
       */
      const loDiceElV1 =
        vista.fase === "comprometido" && canalesDe(this.tier.avisos).cabina;
      if (!repuesta && !callada) {
        /*
         * **Y la de la fase de antes, si todavía espera turno, ya no vale.**
         * Lo que cuenta una fase aguanta en la cola lo que dure esa fase, no
         * un reloj; al cambiar, se retira aquí. Ver `anunciaLaFase` en
         * `audio/boca.ts`.
         */
        BOCA.retirar((c) => anunciaLaFase(c) && c !== clave);
        // Y «motor a fondo» ya se dijo al soltar el gas. Ver `decirElGasSuelto`.
        const yaDicho = vista.fase === "despegando" && this.gasSueltoDicho;
        if (!loDiceElV1 && !yaDicho) this.instructor.decir(frase, clave);
        if (conLetras) {
          this.hud.flash(`${frase}${tecla}${letra ? ` · ${letra}` : ""}`, 5);
        }
        if (vista.fase === "autorizado" || vista.fase === "apagado")
          this.avisar("success");
      }
      // Y apagar el motor en el suelo **termina el vuelo**: es el momento de
      // decir qué te llevás. Ver `terminarElVuelo`.
      if (vista.fase === "apagado") this.terminarElVuelo();
    } else if (
      vista.rapido &&
      // Si la velocidad la lleva el juego, ir rápido no es cosa de nadie a
      // quien decírselo. Ver `laVelocidadEsDelJuego`.
      !this.laVelocidadEsDelJuego() &&
      this.plan.avisarDeSalida(dt)
    ) {
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
     * falta. La máquina de fases ya resuelve eso: baja al suelo al tocar y no
     * vuelve al aire por un bote —ver `pisa` en `vuelo.ts`—, y «aterrizado» y
     * «abandonando» **significan** estar en el suelo después de haber volado.
     * Preguntarlo dos veces era discutirle a quien sabe.
     */
    /*
     * **Y frenar es por el suelo, y hasta velocidad de rodaje.**
     *
     * Miraba el anemómetro contra doce metros por segundo, en las dos fases.
     * Y el rodaje del juego va a trece: en El Hierro, rodando pista atrás
     * hasta la única salida a la velocidad que pone el propio juego y con
     * viento de cara, la tarjeta de «frená» estuvo puesta cuarenta segundos
     * seguidos. Lo que se frena es lo que se avanza —la del suelo—, y en
     * «abandonando» ya se rueda: ahí solo hace falta frenar si se va a
     * velocidad de carrera, que es lo que dice `YA_ES_RODAJE`.
     */
    const porElSuelo = this.flight.state.groundSpeed;
    const corriendo =
      // Y con las ruedas en el suelo de verdad, no a doce metros de él. Ver
      // `yaTocoTierra`.
      this.yaTocoTierra &&
      ((vista.fase === "aterrizado" && porElSuelo > RODAJE_DE_VERDAD) ||
        (vista.fase === "abandonando" && porElSuelo > YA_ES_RODAJE));
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

    // Tu «cleared to land», cuando toca. Ver `paso` en `flight/turno-de-pista.ts`.
    this.turno.paso(vista.fase);

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

  /**
   * A cuánto y hacia dónde señala la aguja, para los bancos: en los peldaños
   * de abajo la tarjeta no escribe la distancia, y lo que se quiere medir es
   * a qué apunta.
   */
  agujaParaBanco: { metros: number; relativo: number; por: PorDeLaAguja } | null = null;

  private updateHomeIndicator(): void {
    /*
     * **El umbral de la pista que se tiene debajo**, no el de casa. En la
     * final a Los Rodeos, y rodando después, la aguja señalaba la pista de
     * Gando a ciento trece kilómetros —hacia atrás— justo cuando lo que hay
     * que encontrar es la pista de delante o la calle de salida.
     */
    const campo = this.elCampo();

    /*
     * Con misión en curso, la aguja señala el objetivo; sin ella, la pista.
     * Es la misma aguja: no hay dos cosas que aprender.
     *
     * **Y si te has salido de la raya, señala la raya.**
     *
     * Cuando el juego dice «volvé a la raya verde» es porque estás lejos de
     * ella — lo bastante como para que te quede fuera de la pantalla. Un
     * consejo correcto que no se puede obedecer es tan inútil como uno
     * equivocado: «la instructora me dice que vuelva a la raya verde, será que
     * se la metió por la nariz, porque yo no la veo».
     *
     * Así que mientras estés fuera, la aguja deja de apuntar a la plataforma
     * lejana y apunta al **punto más cercano de la raya**, que es adonde hay
     * que ir primero. En cuanto vuelves, vuelve ella también a lo de siempre.
     * Es la misma aguja otra vez: sigue habiendo una sola cosa que aprender.
     */
    const objective = this.missions.current;
    const target = objective ? objectiveTarget(objective) : null;
    const aLaRaya =
      this.vistaActual?.fuera === true && this.plan
        ? puntoMasCercanoDe(
            [this.flight.state.position.x, this.flight.state.position.z],
            this.plan.laRaya,
          )
        : null;
    /*
     * **Y volando, la aguja señala el aeropuerto al que se va.**
     *
     * Es la pieza que faltaba para que este juego cumpla lo que promete:
     * despegar de una pista y llegar a otra. El destino estaba cargado en el
     * mundo y no se enseñaba en ninguna parte, así que desde la cabina no
     * existía. Ahora es la misma aguja de siempre —no hay dos cosas que
     * aprender— y la tarjeta dice **cuál** es, que es la diferencia entre
     * «hacia allá» y «a Fuerteventura».
     *
     * **En el suelo no**, y esto no es un detalle: rodando, lo que hay que
     * encontrar es la cabecera de esta pista, y una flecha que apunte a otra
     * isla mientras se busca la calle de salida es exactamente el consejo
     * correcto que no se puede obedecer. En tierra manda la pista de casa;
     * en cuanto se despega, manda el destino.
     */
    /*
     * **Y en final tampoco**: ahí la pista que importa es la que tienes
     * delante. Aterrizando en Gran Canaria la tarjeta seguía diciendo «112 km
     * Tenerife North», a la espalda, justo cuando hay que mirar el eje. Es lo
     * mismo que ya se hizo con la lección de aterrizar; ver `elDestino`.
     */
    /*
     * **Y en la final del propio destino, el destino sigue siendo él.** Ahí
     * la pista de delante *es* el destino: se señala su umbral, pero la
     * tarjeta no deja de decir a dónde se va. Sin esto, cada vez que la fase
     * bailaba entre «en vuelo» y «final» la tarjeta cambiaba de nombre y el
     * aviso del destino salía otra vez: cuatro veces en tres segundos.
     */
    const aDonde = this.elDestino();
    /*
     * **Y volando sin otro destino, la pista del tramo, no la más cercana.**
     *
     * Sin destino es una vuelta al campo: el de salida. Y decidir volverse a
     * medio camino es eso —la tarjeta pasa por la vuelta al campo—, pero la
     * aguja señalaba el umbral del campo **más cercano**, y pasada la mitad
     * del camino el más cercano es la otra isla: de Gran Canaria hacia Los
     * Rodeos, volviéndose al sesenta por ciento, señalaba Los Rodeos a
     * cuarenta y cinco kilómetros en vez de Gando a sesenta y ocho. En casa
     * no se notaba, porque ahí el más cercano es casa. Volverse tiene que
     * ser lo más fácil del juego —renunciar es ganar—, y una aguja que señala
     * al sitio del que te estás volviendo lo hace lo más difícil.
     *
     * En tierra y en final sigue mandando la pista que se tiene debajo o
     * delante, que es la que hay que encontrar.
     */
    /*
     * Lo que se decide con todo eso está en `flight/aguja.ts`, sin HUD, para
     * poder comprobarlo sin volar. Del destino que es el campo de ahora se
     * señala el umbral en uso, que es por donde se entra: seguir la aguja deja
     * alineado. **Y con plan de vuelo, al punto siguiente del plan**, no al
     * aeropuerto: la aguja al campo llevaba al avión en línea recta hasta
     * encima de la pista, y desde ahí no se entra en final; los puntos de la
     * aproximación te dejan en el eje a diez millas.
     */
    const [ux, uz] = umbralEnUso(campo);
    const [tx, tz] = umbralEnUso(this.elCampo(this.destinoId));
    const senalado = aDondeSenala({
      enTierra: this.flight.state.onGround,
      enFinal: this.faseDeAhora === "final",
      objetivo: target,
      aLaRaya: aLaRaya ? { x: aLaRaya[0], z: aLaRaya[1] } : null,
      destino: aDonde,
      debajo: { id: campo.id, umbral: { x: ux, z: uz } },
      delTramo: { umbral: { x: tx, z: tz } },
      siguiente: this.navegacion.progreso?.siguiente ?? null,
    });
    const destino = senalado.destino;
    const punto = senalado.delPlan;

    const dx = senalado.punto.x - this.flight.state.position.x;
    const dz = senalado.punto.z - this.flight.state.position.z;
    const bearing = Math.atan2(dx, -dz);

    let relative = bearing - this.flight.state.heading;
    while (relative > Math.PI) relative -= Math.PI * 2;
    while (relative < -Math.PI) relative += Math.PI * 2;
    this.agujaParaBanco = {
      metros: Math.hypot(dx, dz),
      relativo: relative,
      por: senalado.por,
    };

    /*
     * Y en la vuelta al campo, el propio campo: GCLP, SGAS. Sin esto, al pasar
     * por «vuelta al campo» la tarjeta se quedaba vacía y parecía rota.
     */
    const vuelta = aDonde === null ? this.campoPorId(this.destinoId) : null;
    const delVuelo =
      destino ??
      aDonde ??
      (vuelta
        ? {
            nameKey: vuelta.escenario.nameKey,
            oaci: oaciDe(vuelta.escenario),
            escenario: vuelta.escenario,
          }
        : null);
    this.hud.setHome(
      relative,
      Math.hypot(dx, dz),
      target !== null || aLaRaya !== null
        ? "objetivo"
        : destino
          ? "destino"
          : "pista",
      // El destino del vuelo va siempre, aunque la flecha señale otra cosa:
      // ver `setHome`.
      delVuelo
        ? {
            nombre: t(delVuelo.nameKey as TranslationKey),
            oaci: delVuelo.oaci,
            escenario: delVuelo.escenario,
          }
        : undefined,
      target === null && aLaRaya === null ? (punto?.nombre ?? null) : null,
    );
  }

  /**
   * **El plan de vuelo de este tramo, y por dónde se va de él.**
   *
   * Se rehace cuando cambia algo que lo cambia —el destino, la cabecera en
   * uso de cualquiera de los dos campos, el tramo al tocar tierra—, no con el
   * reloj. En tierra sale de la cabecera de despegue con su salida publicada;
   * en el aire, desde donde está el avión directo a la aproximación, que es
   * lo que hace un ordenador de vuelo cuando se decide un desvío.
   *
   * Sin destino no hay plan: una vuelta al campo se vuela por el circuito, y
   * una misión por su objetivo. Ver `flight/ruta.ts`.
   */
  private seguirLaRuta(): void {
    const destino = this.elDestino();
    const s = this.flight.state;
    const salida = this.elCampo(this.salidaId);
    const llegada = destino ? this.elCampo(destino.id) : null;
    const sinPlan =
      !llegada ||
      !this.scenario.aerodrome ||
      this.missions.current !== null ||
      (s.onGround && llegada.id === salida.id);
    if (sinPlan) {
      if (this.claveDeLaRuta) {
        this.navegacion.poner(null);
        this.claveDeLaRuta = "";
      }
      this.hud.ponerTrayecto(null);
      this.hud.mapa.ponerRuta(null);
      return;
    }
    const cabSalida = cabeceraEnUso(salida.escenario);
    const cabLlegada = cabeceraEnUso(llegada.escenario);
    const clave = `${salida.id}:${cabSalida}>${llegada.id}:${cabLlegada}`;
    if (clave !== this.claveDeLaRuta) {
      this.claveDeLaRuta = clave;
      const ruta = this.trazarLaRuta(salida, llegada);
      this.navegacion.poner(
        ruta,
        ruta ? this.cruceroDe(ruta, salida) : 0,
        this.aircraft,
      );
    }
    const lectura = this.lecturaDeRuta();
    const paso = this.navegacion.paso(lectura);
    if (paso.descenso)
      this.hechos.emit("puntoDeDescenso", {
        destino: llegada.id,
        oaci: oaciDe(llegada.escenario),
        restante: this.navegacion.progreso?.restante ?? 0,
        desde: s.position.y,
      });
    const p = this.navegacion.progreso;
    const plan = this.navegacion.plan;
    if (!p || !plan) return;
    const hora = this.horaDeLlegada(p.segundos);
    this.hud.ponerTrayecto({
      restante: p.restante,
      total: p.total,
      segundos: p.segundos,
      hora,
    });
    this.hud.mapa.ponerRuta({
      fijos: plan.fijos,
      activo: this.navegacion.indice,
      descenso: p.puntoDeDescenso,
      conNombres: this.tier.avisos === "cifra" || this.tier.avisos === "cabina",
    });
  }

  /** El plan de vuelo de ahora, y la clave con la que se hizo. */
  private readonly navegacion = new Seguimiento();
  private claveDeLaRuta = "";

  /**
   * Lo que el plan necesita saber del avión. La velocidad, la de ahora
   * volando y la de crucero en tierra: antes de despegar, la hora de llegada
   * es la del plan, no la de estar parado.
   */
  private lecturaDeRuta(): LecturaDeRuta {
    const s = this.flight.state;
    return {
      x: s.position.x,
      z: s.position.z,
      altitud: s.position.y,
      vertical: s.velocity.y,
      aire: s.onGround ? this.aircraft.cruiseSpeed : Math.max(s.airspeed, 1),
      enTierra: s.onGround,
      viento: this.vientoDeLaRuta(),
      atmosfera: this.flight.aireDelDia(),
      ventanilla: this.ventanillaEnMetros(),
    };
  }

  /** El viento de hoy como lo quiere el plan: de dónde y cuánto, en m/s. */
  private vientoDeLaRuta(): { desde: number; fuerza: number } | null {
    const v = this.vientoDeHoy;
    return v ? { desde: v.desde, fuerza: v.nudos * (MILLA / 3600) } : null;
  }

  /**
   * **La hora de llegada al punto siguiente, como la escribe una pantalla de
   * navegación**: horas, minutos y décimas, en tiempo universal —«1432.5z»—.
   *
   * Con el reloj de verdad, que es el mismo que pone el sol del escenario: la
   * hora de este juego es la de fuera. Ver `world/hora.ts`.
   */
  private horaDeLlegada(segundos: number): string | null {
    if (!Number.isFinite(segundos)) return null;
    const llega = new Date(Date.now() + segundos * 1000);
    const hh = String(llega.getUTCHours()).padStart(2, "0");
    const mm = String(llega.getUTCMinutes()).padStart(2, "0");
    const decima = Math.floor(llega.getUTCSeconds() / 6);
    return `${hh}${mm}.${decima}z`;
  }

  /**
   * Lo que el plan de vuelo necesita saber del juego: el origen del mundo,
   * si se va en el aire, la cota del asfalto de cada campo y el relieve del
   * mundo entero —el fino, el de los destinos y el del horizonte—. Ver
   * `world/ruta-del-tramo.ts`, que es donde se traza para el juego y para
   * las pruebas.
   */
  private delJuego(): DelJuego | null {
    const origen = this.scenario.aerodrome?.origin;
    if (!origen) return null;
    const s = this.flight.state;
    return {
      origen,
      enElAire: s.onGround
        ? null
        : { x: s.position.x, z: s.position.z, altitud: s.position.y },
      cotaDePista: (campo, x, z) => this.cotaDePistaEn(campo, x, z),
      cota: (x, z) => this.terrain.cotaConocida(x, z),
      techo: this.aircraft.alturaDeCrucero,
      visual: this.aircraft.reglasDeVuelo === "visual",
    };
  }

  /** El plan de este tramo. Ver `rutaDelTramo`. */
  private trazarLaRuta(salida: CampoEnElMundo, llegada: CampoEnElMundo): Ruta | null {
    const juego = this.delJuego();
    return juego ? rutaDelTramo(salida, llegada, juego) : null;
  }

  /**
   * El crucero que se planea para esta ruta, m: el mismo que anuncia la
   * comandante. Ver `cruceroDelTramo`.
   */
  private cruceroDe(ruta: Ruta, salida: CampoEnElMundo): number {
    return cruceroDelTramo(ruta, salida, {
      cotaDePista: (campo, x, z) => this.cotaDePistaEn(campo, x, z),
      cota: (x, z) => this.terrain.cotaConocida(x, z),
      techo: this.aircraft.alturaDeCrucero,
      visual: this.aircraft.reglasDeVuelo === "visual",
      // Y por kilos: el nivel que ahorra. Ver `nivelQueAhorra`.
      ficha: this.aircraft,
    });
  }

  /**
   * **Avisa cuando se llega al punto de descenso.** Devuelve cómo dejar de
   * escuchar.
   *
   * Existe para quien tenga algo que decir en ese momento sin tener que
   * saber cómo se calcula: los anuncios de cabina, un logro, una misión. El
   * aviso de cabina y la instructora ya escuchan aquí mismo.
   */
  alEmpezarElDescenso(
    oyente: (d: {
      readonly destino: string;
      readonly oaci: string | null;
      readonly restante: number;
      readonly desde: number;
    }) => void,
  ): () => void {
    return this.hechos.on("puntoDeDescenso", oyente);
  }

  /** A dónde manda ir el piloto automático, para los bancos. */
  get objetivosParaBanco(): Objetivos {
    return this.objetivos;
  }

  /** El plan de vuelo y su progreso, para los bancos. */
  get planParaBanco(): {
    fijos: readonly { nombre: string; x: number; z: number; papel: string }[];
    activo: number;
    progreso: Seguimiento["progreso"];
    bajando: boolean;
  } | null {
    const plan = this.navegacion.plan;
    if (!plan) return null;
    return {
      fijos: plan.fijos,
      activo: this.navegacion.indice,
      progreso: this.navegacion.progreso,
      bajando: this.navegacion.bajando,
    };
  }

  private syncAircraftMesh(dt: number): void {
    const state = this.flight.state;
    this.aircraftMesh.group.position.copy(state.position);
    this.aircraftMesh.group.quaternion.copy(state.orientation);
    this.inclinarConElSuelo(state, dt);

    // La hélice gira con el motor. No se intenta reproducir las rpm reales:
    // se busca que se vea girar y que el ritmo suba al acelerar.
    /*
     * **Y solo con el motor en marcha, y con su inercia.** Giraba siempre,
     * también con el motor apagado y el avión aparcado; y pasaba de nada a
     * todo en un fotograma. Una hélice de verdad arranca despacio, se para
     * despacio y, apagada, está quieta.
     */
    const quiere = this.input.controls.engineOn
      ? 6 + this.input.controls.throttle * 96
      : 0;
    const prisa = quiere > this.giroDeHelice ? 1.4 : 0.6;
    this.giroDeHelice +=
      (quiere - this.giroDeHelice) * (1 - Math.exp(-dt * prisa));
    this.propellerAngle += dt * this.giroDeHelice;
    // Y deprisa, disco: ver `discoDeHelice`. Desde veinte radianes por
    // segundo empieza a verse borrosa y a cuarenta y cinco ya es un disco.
    this.aircraftMesh.borrarHelices?.((this.giroDeHelice - 20) / 25);
    // Todas las que haya, cada una sobre su eje. Ver `AircraftMesh.helices`.
    for (const h of this.aircraftMesh.helices ?? [
      this.aircraftMesh.propeller,
    ]) {
      h.rotation.z = this.propellerAngle;
    }

    this.updateBlobShadow(state);
  }

  /** La inclinación del suelo que lleva ahora el dibujo, rad. */
  private readonly conElSuelo = { cabeceo: 0, alabeo: 0 };
  private readonly giroConElSuelo = new Quaternion();
  private readonly eulerConElSuelo = new Euler();

  /**
   * **En tierra, el avión dibujado se inclina con el suelo**, que si no
   * apoya una pata y mete las otras en el hormigón: ver
   * `pendiente-bajo-el-tren.ts`. Con un poco de retardo, que el relieve va por
   * casillas y a paso de rodaje cada una sería un respingo; y al despegar se
   * suelta igual de suave.
   */
  private inclinarConElSuelo(state: FlightState, dt: number): void {
    const quiere = state.onGround
      ? pendienteBajoElTren(
          (x, z) => this.terrain.sampleSurface(x, z),
          state.position.x,
          state.position.z,
          state.heading,
          this.aircraft.batalla,
          // La vía del tren principal, más o menos la sexta parte del ala en
          // toda la flota: la inclinación de lado es la parte pequeña.
          this.aircraft.wingSpan / 6,
        )
      : { cabeceo: 0, alabeo: 0 };
    // Recién puesto en el suelo, sin retardo: el primer dibujo ya apoya.
    const k = dt > 0 && dt < 1 ? 1 - Math.exp(-dt * 8) : 1;
    this.conElSuelo.cabeceo += (quiere.cabeceo - this.conElSuelo.cabeceo) * k;
    this.conElSuelo.alabeo += (quiere.alabeo - this.conElSuelo.alabeo) * k;
    if (!this.conElSuelo.cabeceo && !this.conElSuelo.alabeo) return;
    // El morro está en la z negativa: cabeceo sobre la x, alabeo sobre la z.
    this.eulerConElSuelo.set(this.conElSuelo.cabeceo, 0, this.conElSuelo.alabeo);
    this.giroConElSuelo.setFromEuler(this.eulerConElSuelo);
    this.aircraftMesh.group.quaternion.multiply(this.giroConElSuelo);
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

    // A la altura de siempre sobre el terreno, que en el asfalto son cinco
    // centímetros sobre él: `ground` ya lleva el pavimento dentro.
    this.blobShadow.position.set(
      state.position.x,
      ground +
        0.4 -
        this.terrain.resalteEn(state.position.x, state.position.z),
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
    const modo = this.vistaQueHay();
    const rig: CameraRig = this.camaras[modo];

    // El avión, escondido solo en la vista de pájaro. Va aquí y no al cambiar
    // de vista para que valga también cuando el modelo se carga o se cambia.
    this.aircraftMesh.group.visible = rig.muestraElAvion;

    const ctx = this.contextoDeCamara;
    ctx.aircraft.wingSpan = this.aircraft.wingSpan;
    ctx.aircraft.chord = this.aircraft.chord;
    ctx.aircraft.largo = this.largoDelAvion;
    ctx.ojo = this.aircraftMesh.ojo ?? null;
    ctx.aLaVista = this.adelantoDelSigueme;
    ctx.movimientoReducido = this.reducedMotion;
    ctx.traqueteo = TRAQUETEO[this.superficie];
    ctx.pasaje = this.aircraftMesh.pasaje ?? null;

    // Lo que puso la vista el paso anterior, sin el giro de la cabeza encima.
    // Ver `poseDeLaVista`.
    if (this.poseDeLaVista.puesta) {
      this.camera.position.copy(this.poseDeLaVista.posicion);
      this.camera.quaternion.copy(this.poseDeLaVista.giro);
    }
    rig.update(this.camera, state, dt, ctx);
    this.poseDeLaVista.posicion.copy(this.camera.position);
    this.poseDeLaVista.giro.copy(this.camera.quaternion);
    this.poseDeLaVista.puesta = true;
    this.girarLaMirada(modo, dt);
    /*
     * Y el encuadre sobre el HUD, repasado dos veces por segundo: la barra de
     * arriba y el cuadro cambian de alto sin que cambie la ventana —se baja el
     * cuadro, se parte la barra, sale el freno—, y medirlos en cada fotograma
     * costaría un recálculo de estilos por imagen.
     */
    this.relojDelEncuadre += dt;
    if (this.relojDelEncuadre > 0.5) {
      this.relojDelEncuadre = 0;
      this.encuadrarSobreElCuadro(false);
    }
    this.ajustarElAngulo(rig.fovDeseado(state, ctx), dt);
    this.ponerElMarco(modo);
  }

  /**
   * **La vista que se puede poner con este avión**: la elegida, salvo que sea
   * una de pasaje y este avión no lo lleve —o su modelo todavía no ha
   * llegado—, que entonces es la de detrás. La elegida no se toca: al volver
   * a un avión con pasaje, ahí sigue.
   *
   * La de detrás y no la cabina: el HUD se pone de cabina solo en la cabina
   * —ver `ponerVistaDeCabina`—, y una cabina de respaldo con el cuadro plano
   * encima serían dos tableros a la vez.
   */
  private vistaQueHay(): CameraMode {
    return esDePasaje(this.cameraMode) && !this.hayPasaje ? "chase" : this.cameraMode;
  }

  /**
   * Si este avión lleva pasaje y su modelo trae las ventanillas por las que
   * mirar. Ver `world/asiento-de-pasaje.ts`.
   */
  private get hayPasaje(): boolean {
    return conPasaje(this.aircraft.mass) && !!this.aircraftMesh.pasaje;
  }

  /** El asiento de ventanilla de esa vista, si es de pasaje y lo hay. */
  private asientoDe(modo: CameraMode): AsientoDePasaje | null {
    const pasaje = this.aircraftMesh.pasaje;
    if (!pasaje || !esDePasaje(modo)) return null;
    return modo === "pasaje-izquierda" ? pasaje.izquierda : pasaje.derecha;
  }

  /**
   * Si desde la cámara de ahora se ve ese punto **por el cristal** de la
   * ventanilla, o `null` si no se está en el pasaje. Para el banco.
   */
  seVePorLaVentanillaParaBanco(p: { x: number; y: number; z: number }): boolean | null {
    const asiento = this.asientoDe(this.vistaQueHay());
    if (!asiento) return null;
    return seVePorLaVentanilla(this.camera.position, p, this.flight.state, asiento.ventanilla);
  }

  /**
   * Cuántos radianes gira la cabeza por cada píxel que se arrastra: los que
   * mide un píxel en el centro de la imagen. Así el paisaje se queda debajo
   * del dedo, que es lo que hace que arrastrar se entienda solo.
   */
  private radianesPorPixel(): number {
    const alto = this.renderer.domElement.clientHeight || window.innerHeight || 1;
    return (2 * Math.tan(MathUtils.degToRad(this.camera.fov) / 2)) / alto;
  }

  /**
   * **El giro de la cabeza, encima de la vista.** Desde dentro gira la
   * cabeza; desde fuera, da la vuelta al avión. Y si se está mirando lo
   * señalado, hacia dónde queda ahora, que el avión avanza. Ver
   * `cameras/mirada.ts`.
   */
  private girarLaMirada(modo: CameraMode, dt: number): void {
    const state = this.flight.state;
    const { como, topes } = comoSeMiraDesde(modo);
    this.mirada.ponerTopes(topes);
    const punto = this.loSenalado?.mirada.punto;
    if (this.mirada.apuntando && punto)
      this.mirada.apuntarA(
        como === "cabeza"
          ? giroDeCabezaHacia(this.camera, state.orientation, punto)
          : giroDeVueltaHacia(this.camera, state.position, punto),
      );
    this.mirada.paso(dt);
    const giro = { guinada: this.mirada.guinada, cabeceo: this.mirada.cabeceo };
    const asiento = this.asientoDe(modo);
    // En el pasaje no se gira la cabeza a secas: se asoma uno al cristal.
    if (asiento) asomarse(this.camera, state.orientation, asiento, giro);
    else if (como === "cabeza") girarLaCabeza(this.camera, state.orientation, giro);
    else
      darLaVuelta(this.camera, state.position, giro, (x, z) =>
        this.terrain.sampleSurface(x, z),
      );
  }

  /**
   * **El marco de la ventanilla**, en la vista de pasaje: encendido, en su
   * sitio y con la luz de la hora. Y la losa de las ventanillas del modelo,
   * escondida mientras tanto, que desde dentro taparía el cristal. Ver
   * `world/marco-de-ventanilla.ts`.
   */
  private ponerElMarco(modo: CameraMode): void {
    const pasaje = this.aircraftMesh.pasaje;
    const asiento = this.asientoDe(modo);
    this.marcoDeVentanilla.visible = !!asiento;
    if (pasaje) pasaje.ventanillas.visible = !asiento;
    if (!asiento) return;
    this.marcoDeVentanilla.poner(
      this.camera,
      this.flight.state,
      asiento.ventanilla,
      diaEnLaCabina(this.sky.sunDirection.y),
    );
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
  /**
   * Se pidió meter el tren en el suelo y el cerrojo lo impidió.
   *
   * **Que se note, sin dramatizar.** El botón no cambia —el tren sigue
   * fuera y en verde—, suenan las dos notas que bajan, que en este juego
   * quieren decir «así no», el botón da un respingo y sale un momento la
   * tarjeta de la rueda apoyada en el suelo. No es un error del jugador ni
   * una emergencia: es un mando que tiene un porqué, y se enseña mostrándolo.
   */
  private trenTrabado(): void {
    this.audio.cue("error");
    this.hud.trenTrabado();
    this.hud.senal.mostrar("tren-en-el-suelo", t("vuelo.trenEnElSuelo"), null, {
      segundos: 3,
    });
  }

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

  /**
   * Y quién decide si está puesto. Ver `flight/cinturon.ts`, que cuenta por
   * qué esto dejó de mirar la altura sobre el terreno.
   */
  private readonly cinturon = new Cinturon();

  /**
   * Si la comandante acaba de decir que ya se pueden soltar el cinturón.
   *
   * Un suceso de un fotograma: lo pone la megafonía y lo consume el cartel. Se
   * pasa así y no como estado para que no puedan separarse — el cartel y la
   * frase tienen que contar lo mismo, y antes no lo hacían: «dice que se
   * pueden quitar el cinturón pero la señal ya hace rato que se apagó».
   */
  private dijoSoltarse = false;

  /**
   * Y si acaba de anunciar que se empieza a bajar, que es cuando el cartel
   * se vuelve a encender. El mismo suceso de un fotograma, en el otro
   * sentido.
   */
  private pidioAbrocharse = false;

  /**
   * Cuántos segundos lleva encendida la luz de piloto automático suelto.
   *
   * Un piloto automático que se desengancha es un suceso, no un estado, así
   * que su luz necesita un rato propio: en una cabina de verdad el aviso se
   * queda hasta que alguien lo reconoce. Aquí se apaga sola a los diez
   * segundos, que es lo que tarda en enterarse quien estaba mirando fuera.
   */
  private pilotoSeSolto = 0;

  /**
   * Si la luz roja del tren está encendida: el tren no está donde dice la
   * palanca, o se viene a aterrizar sin él. Ver `luzRojaDelTren` en
   * `flight/tren.ts`, que cuenta por qué dejó de mirar «bajo y lento».
   *
   * Y en el avión de tren fijo no existe: no hay palanca con la que estar en
   * desacuerdo ni luz que encender. Un Cessna de escuela no la lleva.
   */
  private trenFueraDeSitio(): boolean {
    if (!this.aircraft.trenRetractil) return false;
    return luzRojaDelTren(
      this.input.controls.tren,
      this.input.trenQueSePide,
      this.vieneSinTren(),
    );
  }

  /**
   * Si se viene a aterrizar sin el tren: bajo, bajando, en final y sin
   * haberlo pedido. Ver `avisaDelTren` en `flight/tren.ts`.
   *
   * Aparte porque lo miran dos: la voz y la tarjeta de «sacá el tren», y la
   * luz roja. Dos cuentas de lo mismo acaban diciendo cosas distintas, y una
   * luz que se enciende sin que nada lo diga —o una voz sin su luz— es un
   * canal que miente. Ver `atenderAlTren`.
   */
  private vieneSinTren(): boolean {
    const s = this.flight.state;
    return avisaDelTren(
      this.input.controls.tren,
      s.heightAboveGround,
      s.verticalSpeed < -0.5,
      // Y lo que ya se ha pedido: el tren tarda diez segundos en salir, y
      // avisar de lo que acabás de hacer enseña a no hacer caso.
      this.input.trenQueSePide,
      /*
       * Y **solo viniendo en final**. Sin esto, meter el tren justo después
       * de despegar disparaba el aviso de sacarlo: el avión se queda limpio,
       * pega una bajadita de un par de segundos y sigue por debajo de los
       * doscientos cincuenta metros. Es el mismo embudo que usan los mínimos
       * y la orden de frustrar. Ver `enElEmbudoDeFinal`.
       */
      enElEmbudoDeFinal(this.laPistaDeAhora(), s.position.x, s.position.z) !==
        null,
    );
  }

  /** Lo más alto que se ha llegado en este vuelo, en metros. */
  private loMasAltoDelVuelo = 0;

  /**
   * A dónde le manda ir el piloto automático, si está puesto.
   *
   * `null` en los dos es estar apagado. Ver `flight/piloto-automatico.ts`, que
   * cuenta por qué existe: desde que se puede ir a otro aeropuerto hay rectas
   * de cuarenta minutos, y una recta de cuarenta minutos a mano no enseña nada.
   */
  private objetivos: Objetivos = {
    rumbo: null,
    altitud: null,
    velocidad: null,
  };

  /**
   * El último timón que pidió el automático, para dejarlo en el trim al
   * soltar. Ver `ponerPilotoAutomatico`.
   */
  private timonDelAutomatico = 0;

  /**
   * **Si los gases automáticos llevan las palancas.** Se ponen con el
   * automático en el avión que los lleva —ver `llevaGasesAutomaticos`— y se
   * sueltan con él, o solos si quien vuela mueve el gas. Ver
   * `flight/gases-automaticos.ts`.
   */
  private gasesPuestos = false;
  /** Cómo cambia de altura el automático ahora. Ver `ModoVertical`. */
  private modoVertical: ModoVertical = "ALT";
  /** Y qué lleva de lado. Ver `ModoLateral`. */
  private modoLateral: ModoLateral = "HDG HOLD";
  /** La altura pedida del paso anterior, para saber si es nueva. */
  private alturaPedidaAntes: number | null = null;
  /**
   * **La velocidad que toca ahora**, de la escalera de velocidades: la que
   * enseñan la ventanilla SPD y la marca de la cinta, y la que sostienen los
   * gases. Se cuenta una vez por paso. Ver `laVelocidadQueToca`.
   */
  private velocidadDeAhora: VelocidadQueToca | null = null;
  /**
   * **La nivelada de los peldaños de abajo**: lo que la sostiene mientras
   * dura, o `null`. Ver `sostenerElNivel`.
   */
  private nivelada: { memoria: Memoria; nivel: number } | null = null;
  /** Si en esta aproximación ya se puso la frustrada en la ventanilla. */
  private frustradaEnLaVentanilla = false;
  /** Y si ya se bajó a la del punto de final. Ver `bajarLaVentanillaEnLaFinal`. */
  private finalEnLaVentanilla = false;
  /** Qué se le ha dicho a la torre del combustible. Ver `vigilarElCombustible`. */
  private llamadaDicha: LlamadaDeCombustible = "nada";

  /**
   * Lo que el automático recuerda de un fotograma al siguiente: sus topes de
   * ritmo lo necesitan. Se hace nueva cada vez que se engancha, para que coja
   * el avión como está. Ver `Memoria` en `flight/piloto-automatico.ts`.
   */
  private memoriaDelAutomatico = memoriaNueva();

  /** Si el piloto automático está gobernando algo ahora mismo. */
  get pilotoPuesto(): boolean {
    return this.objetivos.rumbo !== null || this.objetivos.altitud !== null;
  }

  // ── La ventanilla ALT ───────────────────────────────────────────────

  /**
   * **La altura de la ventanilla ALT del automático**, en pies, o `null` si
   * no hay ninguna puesta. Ver `flight/altitud-seleccionada.ts`.
   *
   * Pies y no metros, que es lo que marca la ventanilla de cualquier panel del
   * mundo; y altura **del altímetro**, con el reglaje que lleve puesto: el
   * automático sostiene lo que marca el instrumento, no lo que sabe el modelo.
   * Ver `ventanillaEnMetros`.
   */
  private ventanillaAlt: number | null = null;
  private readonly avisadorDeAltitud = new AvisadorDeAltitud();
  /** Lo que enseña el avisador ahora. Ver `atenderALaVentanilla`. */
  private alertaDeAltitud: Alerta = "nada";
  private readonly autorizacionDeSubida = new AutorizacionDeSubida();
  /** El plan para el que ya se preparó la subida. Ver `prepararLaSubida`. */
  private subidaPreparada: Ruta | null = null;
  /**
   * Lo que la instructora ya contó en este vuelo. Cada cosa, una vez: la
   * segunda no dice nada que no dijera la primera.
   */
  private explicado = { altura: false, cerca: false, fuera: false, masAlto: false };
  /** Cuánto llevan los baches en crucero, s. Ver `buscarNivelTranquilo`. */
  private bachesEnCrucero = 0;
  /** Si en este tramo ya se pidió otro nivel. Uno por tramo. */
  private pidioOtroNivel = false;
  /** A qué nivel se sube por los baches, pies, mientras se sube. */
  private subiendoPorBaches: number | null = null;

  /** Si este avión lleva ventanilla ALT. Ver `llevaVentanillaDeAltitud`. */
  private get llevaVentanillaAlt(): boolean {
    return llevaVentanillaDeAltitud(this.aircraft);
  }

  /** La ventanilla en pies, si este avión la lleva; nunca más allá de su tope. */
  private ventanillaEnPies(): number | null {
    if (!this.llevaVentanillaAlt || this.ventanillaAlt === null) return null;
    return Math.min(this.ventanillaAlt, topeDeLaVentanilla(this.aircraft));
  }

  /**
   * La ventanilla en metros **del modelo**: lo que marca el altímetro menos lo
   * que le suma el reglaje. Con el reglaje bien puesto es la misma; con él
   * mal, el automático nivela donde el altímetro dice la ventanilla, que es
   * justo lo que hace uno de verdad. Ver `flight/altimetro.ts`.
   */
  private ventanillaEnMetros(): number | null {
    const pies = this.ventanillaEnPies();
    if (pies === null) return null;
    return pies * PIE_EN_METROS - alturaIndicada(0, this.qnhPuesta, this.qnhDelSitio);
  }

  /** La ventanilla y el avisador, para los bancos. */
  get ventanillaParaBanco(): {
    pies: number | null;
    alerta: Alerta;
    autorizada: number | null;
  } {
    return {
      pies: this.ventanillaEnPies(),
      alerta: this.alertaDeAltitud,
      autorizada: this.autorizacionDeSubida.autorizada,
    };
  }

  /**
   * **Gira la rueda de la ventanilla ALT**, de millar en millar. Lo llaman la
   * tecla y el dedo. Con un clic, que es lo que hace una rueda con dientes.
   */
  girarLaVentanillaAlt(pasos: number): void {
    if (!this.llevaVentanillaAlt || pasos === 0) return;
    const desde = this.ventanillaAlt ?? aLaVentanilla(this.altitudIndicada());
    this.ventanillaAlt = girarLaVentanilla(desde, pasos, topeDeLaVentanilla(this.aircraft));
    this.avisar("compensador");
  }

  /**
   * La ventanilla ALT puesta a mano, en pies. Para el banco: plantar el avión
   * a una altura y que el automático la guarde, sin girar la rueda a ciegas.
   */
  ponerVentanillaAltParaBanco(pies: number): void {
    if (!this.llevaVentanillaAlt) return;
    this.ventanillaAlt = Math.min(
      Math.round(pies / 100) * 100,
      topeDeLaVentanilla(this.aircraft),
    );
  }

  /** Cuánto llueve, hay de jirones y de agua en el cristal ahora. Para el banco. */
  get aguaParaBanco(): { rayas: number; jirones: number; gotas: number } {
    return {
      rayas: this.lluvia?.pintadas ?? 0,
      jirones: this.jirones?.vistos ?? 0,
      gotas: this.gotas?.enElCristal ?? 0,
    };
  }

  /** Lo que el cuadro y las pantallas enseñan de la ventanilla. */
  private ventanillaParaElCuadro(): { pies: number; alerta: Alerta } | null {
    const pies = this.ventanillaEnPies();
    return pies === null ? null : { pies, alerta: this.alertaDeAltitud };
  }

  /** Vuelo nuevo: la ventanilla vacía y nada contado. */
  private reiniciarLaVentanillaAlt(): void {
    this.ventanillaAlt = null;
    this.alertaDeAltitud = "nada";
    this.autorizacionDeSubida.poner(null);
    this.subidaPreparada = null;
    this.explicado = { altura: false, cerca: false, fuera: false, masAlto: false };
    this.bachesEnCrucero = 0;
    this.pidioOtroNivel = false;
    this.subiendoPorBaches = null;
  }

  /**
   * **Un plan nuevo en tierra: la ventanilla en su crucero y los escalones
   * del control.**
   *
   * La ventanilla propone el nivel del plan, que es lo que se lee en el plan y
   * lo que dice la comandante; lo que cambia después es cosa del control y de
   * quien vuela. Y los escalones, solo a quien vuela por instrumentos con
   * pasaje y desde un campo con torre: un AFIS no autoriza nada, y una
   * avioneta con reglas visuales no sube por escalones de control.
   */
  private prepararLaSubida(ruta: Ruta, salida: CampoEnElMundo): void {
    this.subidaPreparada = ruta;
    this.explicado.masAlto = false;
    this.pidioOtroNivel = false;
    this.subiendoPorBaches = null;
    this.bachesEnCrucero = 0;
    const crucero = aLaVentanilla(this.navegacion.cruceroPlaneado);
    if (this.llevaVentanillaAlt)
      this.ventanillaAlt = Math.min(crucero, topeDeLaVentanilla(this.aircraft));
    const campo = salida.escenario.aerodrome;
    const conControl =
      this.llevaVentanillaAlt &&
      conPasaje(this.aircraft.mass) &&
      !sinTorre(campo) &&
      !esAfis(campo);
    if (!conControl) {
      this.autorizacionDeSubida.poner(null);
      return;
    }
    const a = ruta.fijos[0];
    const minima = a
      ? minimaEnRuta((x, z) => this.terrain.cotaConocida(x, z), a.x, a.z)
      : null;
    this.autorizacionDeSubida.poner(
      escalonesDeSubida(
        crucero,
        altitudDeTransicion(oaciDe(salida.escenario)),
        minima === null ? null : minima / PIE_EN_METROS,
      ),
    );
  }

  /**
   * **Un paso de la ventanilla**: lo que autoriza el control, lo que dice el
   * avisador de altitud, y si se va más alto que el plan.
   */
  private atenderALaVentanilla(): void {
    const s = this.flight.state;
    const plan = this.navegacion.plan;
    if (s.onGround && plan && this.subidaPreparada !== plan)
      this.prepararLaSubida(plan, this.elCampo(this.salidaId));
    const lectura = this.lecturaDeRuta();
    const enLaFinal = this.navegacion.enLaFinal(lectura);
    this.bajarLaVentanillaEnLaFinal(enLaFinal);
    this.ponerLaFrustradaEnLaVentanilla(this.navegacion.enElTramoFinal(lectura));
    const pies = this.altitudIndicada() / PIE_EN_METROS;
    const escalon = this.autorizacionDeSubida.paso({
      pies,
      sobreElSuelo: s.heightAboveGround / PIE_EN_METROS,
      enTierra: s.onGround,
    });
    if (escalon !== null) this.autorizarAltura(escalon);
    /*
     * **Y callado con el tren fuera o en final**, como el de un avión de línea:
     * ahí se baja a propósito por debajo de la ventanilla —la del punto de
     * final—, y un tono de «te estás yendo» en la final enseña a no hacerle
     * caso. Boeing lo inhibe con la senda capturada o con el tren y los flaps
     * de aterrizar; aquí, con el tren.
     */
    const callado =
      s.onGround ||
      this.input.controls.tren > 0.5 ||
      this.faseDeAhora === "final" ||
      enLaFinal;
    const paso = this.avisadorDeAltitud.paso(pies, callado ? null : this.ventanillaEnPies());
    this.alertaDeAltitud = paso.alerta;
    if (paso.tono) this.sonarElAvisador(paso.alerta);
    this.avisarSiVaMasAlto(pies);
  }

  /**
   * **El control autoriza una altura**: «ascienda a…», por radio.
   *
   * Como la autorización de la ruta, en dos capas: en castellano en los
   * cuatro peldaños, con la voz de su torre y la fraseología de su sitio
   * —«ascienda a nivel de vuelo uno uno cero», «suba a…» en Canarias—, y
   * detrás, en inglés, de Taguató para arriba: «climb to flight level one one
   * zero». Ver `autorizarLaRuta` y `flight/autorizacion-de-altitud.ts`.
   *
   * Y la ventanilla: en los tres peldaños de abajo la pone la instructora y lo
   * cuenta; en el de cabina la pone quien vuela, que es quien la pondría en un
   * avión de verdad. Si no la pone, el avión sigue yendo a donde diga la
   * ventanilla: la norma se muestra, no se impone.
   */
  private autorizarAltura(pies: number): void {
    const campo = this.campoPorId(this.salidaId)?.escenario ?? this.elCampo().escenario;
    const habla = hablaDe(campo.aerodrome?.id);
    const yo = this.miIndicativo;
    const clave = comoSeDiceAqui("torre.subir", habla) as TranslationKey;
    const transicion = altitudDeTransicion(oaciDe(campo));
    const enCastellano = alturaEnCastellano(
      pies,
      transicion,
      comoSeDiceAqui("torre.solo", habla),
    );
    const enRadio = alturaEnRadio(pies, transicion);
    /*
     * La altura, dicha en el idioma de la frase: la tarjeta y la voz del
     * navegador leen lo mismo que suena grabado. El guaraní no tiene esta
     * frase y cae al castellano, así que va con la castellana.
     */
    const altura =
      getLocale() === "en"
        ? (enRadio?.dicho ?? `${pies} feet`)
        : (enCastellano?.dicho ?? `${pies} pies`);
    const texto = t(clave, { indicativo: yo.dicho, altura });
    this.torre.decir(texto, clave, "mando", {
      ...rellenoDe(yo),
      ...(enCastellano ? { subir: enCastellano.piezas } : {}),
    });
    const conCifras =
      this.tier.instruments === "numeric" || this.tier.instruments === "full";
    if (conCifras && enRadio) {
      const textoEn = `${yo.dicho}, climb to ${enRadio.dicho}`;
      this.torre.decir(textoEn, comoSeDiceAqui("torre.climbTo", habla), "mando", {
        ...rellenoDe(yo),
        altura: enRadio.piezas,
      });
      this.hud.radio(textoEn, undefined, true);
    } else if (this.tier.instruments !== "none") {
      this.hud.radio(texto, undefined, true);
    }
    if (!laInstructoraLoExplica(this.tier.avisos)) return;
    if (this.llevaVentanillaAlt)
      this.ventanillaAlt = Math.min(pies, topeDeLaVentanilla(this.aircraft));
    const dice: TranslationKey = this.explicado.altura
      ? "vuelo.otraAlturaDeLaTorre"
      : this.tier.id === "guyrami"
        ? "vuelo.alturaDeLaTorreRaya"
        : "vuelo.alturaDeLaTorre";
    this.explicado.altura = true;
    this.instructor.decir(t(dice), dice);
  }

  /**
   * **El tono del avisador de altitud**, que es de una caja del avión y suena
   * en los cuatro peldaños. Y detrás, en los tres de abajo y la primera vez,
   * la instructora cuenta qué ha sonado: así se aprende a oírlo con calma.
   * Ver `escalera.ts`.
   */
  private sonarElAvisador(alerta: Alerta): void {
    this.avisar("altitud");
    if (!laInstructoraLoExplica(this.tier.avisos)) return;
    if (alerta === "cerca" && !this.explicado.cerca) {
      this.explicado.cerca = true;
      this.instructor.decir(t("vuelo.tonoDeAltitudCerca"), "vuelo.tonoDeAltitudCerca");
    } else if (alerta === "fuera" && !this.explicado.fuera) {
      this.explicado.fuera = true;
      this.instructor.decir(t("vuelo.tonoDeAltitudFuera"), "vuelo.tonoDeAltitudFuera");
    }
  }

  /**
   * **Y si se va más alto que el plan, se dice a tiempo**: hay más que bajar,
   * así que se empieza antes. El punto de descenso ya lo cuenta con la altura
   * de verdad —ver `Seguimiento.desde`—; esto es que alguien lo diga en cuanto
   * se nivela arriba, y no al llegar al punto, que es cuando «bajar costó».
   * Una vez por plan.
   */
  private avisarSiVaMasAlto(pies: number): void {
    const s = this.flight.state;
    if (
      this.explicado.masAlto ||
      !this.navegacion.plan ||
      s.onGround ||
      this.navegacion.bajando ||
      Math.abs(s.verticalSpeed) > 1.5 ||
      pies < this.navegacion.cruceroPlaneado / PIE_EN_METROS + 1000
    )
      return;
    this.explicado.masAlto = true;
    if (!laInstructoraLoExplica(this.tier.avisos)) return;
    this.instructor.decir(t("vuelo.masAltoQueElPlan"), "vuelo.masAltoQueElPlan");
  }

  /**
   * **Al empezar a bajar, la ventanilla a la altura del punto de final.**
   *
   * Es lo que se hace en una cabina antes de dejar que el ordenador baje:
   * poner abajo la altura hasta la que se autoriza bajar. Sin ella, el
   * automático se quedaría arriba —la ventanilla es un suelo que el plan no
   * cruza— y el avisador pitaría al irse. Se pone en los cuatro peldaños: la
   * autorización para bajar todavía no la dice nadie por radio.
   */
  private ponerLaVentanillaParaBajar(): void {
    if (!this.llevaVentanillaAlt) return;
    const alli = this.navegacion.alturaDelFinal;
    if (alli === null) return;
    const indicada = alli + alturaIndicada(0, this.qnhPuesta, this.qnhDelSitio);
    const pies = Math.ceil(indicada / PIE_EN_METROS / 100) * 100;
    if (this.ventanillaAlt === null || pies < this.ventanillaAlt) this.ventanillaAlt = pies;
  }

  /**
   * **En la final, la ventanilla no por encima del punto de final**, aunque
   * nadie la bajara antes.
   *
   * Lo normal es que la baje `ponerLaVentanillaParaBajar` en el T/D del plan.
   * Pero en una vuelta al campo no hay T/D —se vuela por debajo de lo que
   * cuenta como bajada—, ni lo hay para quien empezó a bajar por su cuenta: la
   * ventanilla seguía en el crucero planeado, y el banco vio un 6.000 en
   * magenta en la final de Los Rodeos con el avión a trescientos metros. Es el
   * mismo «subí» encima de quien baja a la pista que vio Enrique en Gando.
   *
   * Una vez por aproximación, y solo hacia abajo: quien gire la rueda en la
   * final no ve que se le deshace.
   */
  private bajarLaVentanillaEnLaFinal(enLaFinal: boolean): void {
    if (!enLaFinal) {
      this.finalEnLaVentanilla = false;
      return;
    }
    if (this.finalEnLaVentanilla) return;
    this.finalEnLaVentanilla = true;
    this.ponerLaVentanillaParaBajar();
  }

  /**
   * **En la final, la ventanilla lleva la altitud de la frustrada, cuando
   * baja la senda.**
   *
   * Es lo de una cabina de verdad: con la senda capturada, la bajada la manda
   * el `G/S` del automático y en la ventanilla se pone la altitud de irse al
   * aire. Se ponía en cuanto se pasaba el punto de final, en los cuatro
   * peldaños y con el automático puesto o sin él, y en Guyrami eso era un
   * 2.100 que saltaba a 3.000 con el avión bajando a la pista: «ningún
   * sentido». Ahora, de Taguato para arriba y con el `G/S` escrito en el FMA;
   * si no, se queda en la del punto de final. Ver `ventanillaEnLaFinal`.
   *
   * Una vez por aproximación; se rearma al dejar el tramo final.
   */
  private ponerLaFrustradaEnLaVentanilla(enElTramoFinal: boolean): void {
    if (!enElTramoFinal) {
      this.frustradaEnLaVentanilla = false;
      return;
    }
    if (this.frustradaEnLaVentanilla || !this.llevaVentanillaAlt) return;
    const alli = this.navegacion.alturaDelFinal;
    if (alli === null) return;
    const reglaje = alturaIndicada(0, this.qnhPuesta, this.qnhDelSitio);
    const pies = ventanillaEnLaFinal({
      conCifras: canalesDe(this.tier.avisos).cifra,
      // El FMA solo lo lleva la pantalla de los de línea. Ver `elFma`.
      enAproximacion:
        this.pilotoPuesto &&
        this.modoVertical === "G/S" &&
        familiaDe(this.aircraft) === "linea",
      delFinal: (alli + reglaje) / PIE_EN_METROS,
      campo: (this.cotaDelCampo(this.elCampo()) + reglaje) / PIE_EN_METROS,
      tope: topeDeLaVentanilla(this.aircraft),
    });
    if (pies === null) return;
    this.ventanillaAlt = pies;
    this.frustradaEnLaVentanilla = true;
  }

  /**
   * **Otro nivel por los baches, pedido al control.** Ver
   * `flight/nivel-tranquilo.ts`.
   *
   * En crucero, con pasaje y con los baches durando: se mira si arriba el
   * aire va más quieto —con la misma cuenta que mueve el avión— y, si va, el
   * control lo autoriza y se sube; si no, la comandante lo cuenta: hay baches
   * en todos los niveles. Al llegar arriba, lo cuenta también. Nunca cambia
   * de nivel sola: primero la autorización. Uno por tramo.
   */
  private buscarNivelTranquilo(dt: number, movimiento: number, aire: Aire): void {
    const s = this.flight.state;
    const pies = this.altitudIndicada() / PIE_EN_METROS;
    if (this.subiendoPorBaches !== null) {
      if (Math.abs(pies - this.subiendoPorBaches) < 300 && Math.abs(s.verticalSpeed) < 1.5) {
        this.subiendoPorBaches = null;
        this.porMegafonia(
          movimiento < YA_NO_SACUDE ? "comandante.nivelMasTranquilo" : "comandante.bachesEnTodos",
        );
      }
      return;
    }
    const ventanilla = this.ventanillaEnPies();
    const p = this.navegacion.progreso;
    if (
      this.pidioOtroNivel ||
      !conPasaje(this.aircraft.mass) ||
      ventanilla === null ||
      p === null ||
      this.navegacion.bajando ||
      s.onGround ||
      this.faseDeAhora !== "en-vuelo" ||
      Math.abs(pies - ventanilla) >= 300 ||
      ventanilla < this.navegacion.cruceroPlaneado / PIE_EN_METROS - 300
    ) {
      this.bachesEnCrucero = 0;
      return;
    }
    this.bachesEnCrucero = movimiento >= YA_NO_SACUDE ? this.bachesEnCrucero + dt : 0;
    if (this.bachesEnCrucero < ESPERA_CON_BACHES) return;
    this.pidioOtroNivel = true;
    /*
     * Y con sitio para volver a bajar: el nivel nuevo adelanta el descenso
     * tres millas por cada mil pies, y subir para tener que bajar enseguida
     * no le sirve a nadie.
     */
    const cabe = (p.restante - (p.descenso ?? 0)) / MILLA > 20;
    const nivel = cabe
      ? nivelMasTranquilo({
          nivel: ventanilla,
          techo: topeDeLaVentanilla(this.aircraft),
          sacudeA: (otro) => {
            const mas = (otro - pies) * PIE_EN_METROS;
            return cuantoSeMueve({
              ...aire,
              sobreElSuelo: aire.sobreElSuelo + mas,
              altura: aire.altura + mas,
            });
          },
        })
      : null;
    if (nivel === null) {
      this.porMegafonia("comandante.bachesEnTodos");
      return;
    }
    this.explicado.masAlto = true;
    this.subiendoPorBaches = nivel;
    this.autorizacionDeSubida.autorizar(nivel);
    this.autorizarAltura(nivel);
  }

  /** Un anuncio suelto de la comandante, con su texto en la tira. */
  private porMegafonia(clave: TranslationKey): void {
    this.comandante.decir(t(clave), clave, "baja");
    if (this.tier.instruments !== "none") this.hud.radio(t(clave));
  }

  /**
   * Pone o quita el piloto automático.
   *
   * Al ponerlo coge **lo que se está haciendo ahora**: el rumbo y la altura de
   * este instante. Es lo que hace cualquier piloto automático del mundo al
   * apretar el botón, y es lo que hace que no dé un tirón al engancharse —
   * enganchar con un objetivo distinto del vuelo actual es la forma más rápida
   * de asustar a quien va dentro.
   */
  ponerPilotoAutomatico(puesto = !this.pilotoPuesto): void {
    /*
     * **Y en tierra no engancha**, que es la raíz de la alarma sin motivo.
     *
     * Enganchaba, y al fotograma siguiente `conElPilotoAutomatico` lo soltaba
     * por estar en tierra y cantaba la desconexión: se oía la alarma por
     * apretar un botón rodando. Ahora el botón contesta que no —se sacude,
     * que se entiende sin leer, y dice por qué a quien lee— y no pasa nada
     * más: no hubo nada conectado, así que no hay nada que se suelte. Ver
     * `sePuedeConectar`.
     */
    if (puesto && !sePuedeConectar({ enTierra: this.flight.state.onGround })) {
      this.hud.pilotoAutomaticoNoEngancha(t("vuelo.pilotoEnTierra"));
      return;
    }
    /*
     * **Y en el avión que no lo lleva, tampoco**: el fumigador no tiene
     * automático en ningún peldaño, y su botón ni se pinta. Ver
     * `llevaPilotoAutomatico`.
     */
    if (puesto && !llevaPilotoAutomatico(this.aircraft)) return;
    // Al soltarse, la luz de cabina se enciende un rato. Ver `pilotoSeSolto`.
    if (!puesto && this.pilotoPuesto) this.pilotoSeSolto = 10;
    /*
     * **Y al soltarlo deja el avión trimado donde lo llevaba.**
     *
     * Mientras gobierna la altura, el timón lo pone él y el trim queda a cero
     * —ver `conElPilotoAutomatico`—. Si al desconectar no se devolviera ese
     * timón al trim, el avión se quedaría de golpe sin nada de lo que lo
     * estaba sosteniendo y daría un bandazo en el momento exacto en que quien
     * vuela acaba de coger los mandos.
     *
     * Es lo que hace un piloto automático de verdad: trima antes de soltar.
     */
    if (!puesto && this.objetivos.altitud !== null) {
      this.input.controls.trim = this.timonDelAutomatico;
    }
    /*
     * **Y al soltarse se canta**, que es la otra mitad de la luz.
     *
     * Un piloto automático que se desconecta lo dice en toda cabina del mundo,
     * y por un motivo que no es de adorno: quien no estaba mirando acaba de
     * quedarse a los mandos sin saberlo. Aquí había luz y no había voz.
     *
     * Solo al soltarse, no al ponerlo: enganchar es una decisión que se toma
     * mirando; soltarse es lo que pasa sin querer.
     */
    if (!puesto && this.pilotoPuesto) {
      this.cantar(
        "autopilot disconnect",
        t("vuelo.pilotoSuelto"),
        "vuelo.pilotoSuelto",
        "mando",
      );
    }
    const s = this.flight.state;
    if (puesto) {
      this.memoriaDelAutomatico = memoriaNueva();
      this.modoVertical = "ALT";
      this.modoLateral = "HDG HOLD";
      this.alturaPedidaAntes = null;
      // La nivelada de los peldaños de abajo se aparta: manda el automático.
      this.nivelada = null;
      this.hud.proponerPilotoAutomatico(false);
    }
    /*
     * **Y los gases, en el avión que los lleva**: el mismo botón los pone y
     * los quita, como el A/T de un Boeing armado de antemano. En la cabina de
     * verdad son dos interruptores; aquí, para que se pueda volar sin leer,
     * uno, y la pantalla de vuelo dice qué hace cada mano. Ver
     * `flight/gases-automaticos.ts`.
     *
     * PENDIENTE-VOCES-automatico: `vuelo.gasesAutomaticos` al ponerlos.
     */
    this.gasesPuestos = puesto && llevaGasesAutomaticos(this.aircraft);
    /*
     * **Y con ventanilla ALT, a la altura de la ventanilla.**
     *
     * Un automático sin preselector se queda en la altura que llevabas; uno
     * con ventanilla va a la que dice ella, que es para lo que está. No da
     * ningún tirón por eso: coge el ritmo de subida que llevabas y lo cambia a
     * una décima de g, como cualquier cambio de altura. Ver `CARGA_QUE_PIDE`.
     * Y si la ventanilla está vacía —una vuelta al campo, sin plan—, se pone
     * en la de ahora, que es lo que hace el panel al sincronizarse.
     */
    if (puesto && this.llevaVentanillaAlt && this.ventanillaAlt === null)
      this.ventanillaAlt = aLaVentanilla(this.altitudIndicada());
    this.objetivos = puesto
      ? {
          rumbo: s.heading,
          altitud: this.ventanillaEnMetros() ?? s.position.y,
          /*
           * **Y la velocidad, en el avión que lleva gases**: la que toca por la
           * escalera de velocidades, no la que llevabas al apretar el botón.
           * Sin gases, la velocidad es de quien lleva la palanca, como en el
           * turbohélice o la avioneta de verdad. Ver `laVelocidadQueToca`.
           */
          velocidad: this.gasesPuestos ? this.laVelocidadQueToca().kt * NUDO : null,
        }
      : { rumbo: null, altitud: null, velocidad: null };
    this.hud.ponerPilotoAutomatico(puesto);
    this.avisar(puesto ? "success" : "attention");
  }

  /**
   * **Lo que ve la mano** del teclado y del dedo: el avión, el peldaño y si
   * otra mano —el automático, la nivelada— lleva ya un eje. Se rellena el
   * mismo objeto en cada fotograma, para no reservar memoria sesenta veces
   * por segundo. Ver `flight/mano.ts`.
   */
  private loQueVeLaMano(): LoQueVeLaMano {
    const s = this.flight.state;
    const v = this.vistoPorLaMano;
    v.aircraft = this.aircraft;
    v.sencillo = this.tier.model === "simple";
    v.amortiguaExtra = this.tier.assists.extraDamping;
    v.protegePerdida = this.tier.assists.stallProtection > 0;
    v.peldanoBajo = this.tier.inclinacionProtegida;
    v.enTierra = s.onGround;
    v.alabeo = bankAngleOf(s.orientation);
    v.cabeceo = pitchAngleOf(s.orientation);
    v.ritmoDeAlabeo = s.rollRate;
    v.ritmoDeCabeceo = s.pitchRate;
    v.vertical = s.verticalSpeed;
    v.carga = s.loadFactor;
    v.verdadera = s.airspeed;
    v.alfa = s.alpha;
    v.alfaDeAviso = s.stallWarningAlpha;
    v.flaps = this.input.controls.flaps;
    /*
     * El timón que sostiene el avión, para que la mano lo coja sin tirón: el
     * de ahora si quien vuela está tirando —rotando, al despegar—, que el de
     * `timonAhora` va promediado y llega tarde; si no, ése, que cuenta también
     * lo que empuja la ayuda del peldaño.
     */
    const c = this.input.controls;
    v.timon =
      Math.abs(c.elevator) > 0.08
        ? Math.max(-1, Math.min(1, c.elevator + c.trim))
        : this.flight.timonAhora();
    v.mandoParaSubir = this.flight.mandoParaSubir ? this.mandoParaSubirDeLaMano : undefined;
    v.otraManoAlabeo = this.pilotoPuesto && this.objetivos.rumbo !== null;
    v.otraManoCabeceo =
      (this.pilotoPuesto && this.objetivos.altitud !== null) || this.nivelada !== null;
    return v;
  }

  /** El modelo de ahora, preguntado por la mano. Ver `mandoParaSubir`. */
  private readonly mandoParaSubirDeLaMano = (ritmo: number): number =>
    this.flight.mandoParaSubir?.(ritmo) ?? 0;

  /** El objeto que se rellena para la mano. Ver `loQueVeLaMano`. */
  private readonly vistoPorLaMano: { -readonly [K in keyof LoQueVeLaMano]: LoQueVeLaMano[K] } = {
    aircraft: AIRCRAFT[0]!,
    sencillo: false,
    amortiguaExtra: 0,
    protegePerdida: false,
    peldanoBajo: false,
    enTierra: true,
    alabeo: 0,
    cabeceo: 0,
    ritmoDeAlabeo: 0,
    ritmoDeCabeceo: 0,
    vertical: 0,
    carga: 1,
    verdadera: 0,
    alfa: 0,
    alfaDeAviso: Math.PI,
    flaps: 0,
    timon: 0,
    mandoParaSubir: undefined,
    otraManoAlabeo: false,
    otraManoCabeceo: false,
  };

  /**
   * **Si quien vuela está moviendo un eje que lleva el automático**: la tecla
   * apretada, el dedo moviendo la palanca o el mando de juego.
   *
   * El automático miraba solo los mandos —`loSolto`—, y con la mano de en
   * medio la tecla ya no mueve el alerón a fondo: pide un ritmo, y en un
   * reactor rápido el alerón que lo da puede no pasar de una décima. Sin esto
   * la flecha no soltaba el automático y la mano se quedaba pidiendo contra
   * él. Ver `flight/mano.ts`.
   */
  private tocanLoQueLleva(): boolean {
    const m = this.input.mueve;
    return (
      (this.objetivos.rumbo !== null && m.alabeo) ||
      (this.objetivos.altitud !== null && m.cabeceo)
    );
  }

  /**
   * Un fotograma del piloto automático.
   *
   * Va **después** de quien pilota y antes del modelo de vuelo, en el mismo
   * sitio que las ayudas: primero se lee lo que pide quien vuela —que puede
   * ser soltarlo— y luego se manda.
   */
  private conElPilotoAutomatico(dt: number): ControlInputs {
    const c = this.input.controls;
    if (!this.pilotoPuesto) return c;
    const s = this.flight.state;
    /*
     * **Y se suelta en cuanto lo tocan.** No hay nada más desconcertante que
     * un avión que se resiste, y en uno de verdad pasa exactamente lo mismo.
     */
    if (s.onGround || loSolto(this.objetivos, c) || this.tocanLoQueLleva()) {
      this.ponerPilotoAutomatico(false);
      return c;
    }
    /*
     * **Y los gases se sueltan si quien vuela mueve el gas**, que es lo que
     * pasa en un avión de verdad al empujar las palancas con los gases
     * puestos: se desconectan y la velocidad pasa a ser suya. El automático
     * sigue con la altura y el rumbo. Ni un regulador escondido peleando con
     * la mano: «no me deja bajar gas, se va al tope».
     */
    if (this.gasesPuestos && this.input.mueveElGas) this.soltarLosGases();
    const lecturaDeAhora = this.lecturaDeRuta();
    /*
     * **En la final manda la senda**: el `G/S` del automático baja por la de
     * tres grados hasta poco antes de la pista, y el `LOC` lo lleva al eje.
     * La ventanilla ya no es «hasta dónde bajar», y no se sigue: de Taguato
     * para arriba lleva la altitud de la frustrada, y en los de abajo se queda
     * en la del punto de final. Ver `ponerLaFrustradaEnLaVentanilla`.
     */
    const enLaFinal =
      this.objetivos.altitud !== null && this.navegacion.enElTramoFinal(lecturaDeAhora);
    if (enLaFinal) {
      const senda = this.navegacion.sendaDeLaFinal(lecturaDeAhora);
      const sobreLaPista = s.position.y - this.cotaDelCampo(this.elCampo());
      /*
       * **Y a seiscientos pies se suelta para aterrizar a mano.** Un
       * automático de los de este juego no recoge el avión: bajaría por la
       * senda hasta el asfalto. En una aproximación de verdad sin aterrizaje
       * automático se desconecta antes de los mínimos, y aquí se hace entre
       * los «one thousand» y «five hundred» del radioaltímetro para que su
       * aviso no pise ninguno.
       *
       * PENDIENTE-VOCES-automatico: `vuelo.automaticoParaAterrizar`.
       */
      if (sobreLaPista < SUELTA_PARA_ATERRIZAR) {
        this.ponerPilotoAutomatico(false);
        return c;
      }
      if (senda) {
        /*
         * Nunca subir hacia la senda: viniendo por debajo, se sostiene la
         * altura hasta que la senda baja a buscarla, que es como se captura
         * una senda de planeo de verdad.
         */
        const debajo = s.position.y < senda.altitud;
        const altitud = debajo ? s.position.y : senda.altitud;
        const ritmo = debajo ? 0 : senda.ritmo;
        if (altitud !== this.objetivos.altitud || ritmo !== this.objetivos.ritmo)
          this.objetivos = { ...this.objetivos, altitud, ritmo };
      }
      const loc = this.rumboDelLocalizador();
      this.modoLateral = loc === null ? "HDG HOLD" : "LOC";
      if (loc !== null) this.objetivos = { ...this.objetivos, rumbo: loc };
    } else {
      this.modoLateral = "HDG HOLD";
      /*
       * **Y pasado el punto de descenso, baja por la senda del plan.**
       *
       * Un piloto automático de los de mantener altura no baja solo: se le
       * pone una altitud más baja. Aquí es lo que hace el plan al llegar al
       * «T/D», que es lo que hace el ordenador de un avión de línea: la
       * altitud que se sostiene pasa a ser la de la senda de tres grados, que
       * va bajando, hasta la del punto de final. Solo hacia abajo: si quien
       * vuela lo puso más bajo, se respeta. Ver
       * `Seguimiento.alturaParaElAutomatico`.
       *
       * **Y con ventanilla ALT, la ventanilla manda.** Sin bajar: el avión va
       * a la altura que dice. Bajando: por la senda, pero nunca por debajo de
       * la ventanilla, que es lo que hace el ordenador de un avión de línea
       * —la altura del panel es un suelo que el plan no cruza—. Al llegar al
       * T/D se pone en la altura del punto de final: ver
       * `ponerLaVentanillaParaBajar`.
       */
      const ventanilla = this.ventanillaEnMetros();
      if (this.objetivos.altitud !== null && ventanilla !== null) {
        let sostiene = ventanilla;
        let ritmo = 0;
        if (this.navegacion.bajando) {
          const lectura = this.lecturaDeRuta();
          const senda = this.navegacion.alturaParaElAutomatico(lectura);
          if (senda !== null && senda > ventanilla + 1) {
            sostiene = senda;
            ritmo = this.navegacion.ritmoParaElAutomatico(lectura) ?? 0;
          }
        }
        if (sostiene !== this.objetivos.altitud || ritmo !== (this.objetivos.ritmo ?? 0))
          this.objetivos = { ...this.objetivos, altitud: sostiene, ritmo };
      } else if (this.objetivos.altitud !== null && this.navegacion.bajando) {
        const lectura = this.lecturaDeRuta();
        const senda = this.navegacion.alturaParaElAutomatico(lectura);
        let sostiene = this.objetivos.altitud;
        if (senda !== null && senda < sostiene - 1) {
          sostiene = senda;
          this.objetivos = { ...this.objetivos, altitud: senda };
        }
        /*
         * **Y el ritmo de la senda**, mientras lo que se sostiene sea ella: con
         * la altitud sola, el automático iba siempre por detrás de una senda que
         * no para de bajar. Si quien vuela lo puso más bajo, la altitud ya no es
         * la de la senda y no se mueve: ritmo cero. Ver `Objetivos.ritmo`.
         */
        const ritmo =
          senda !== null && senda <= sostiene + 1
            ? (this.navegacion.ritmoParaElAutomatico(lectura) ?? 0)
            : 0;
        if (ritmo !== this.objetivos.ritmo)
          this.objetivos = { ...this.objetivos, ritmo };
      }
      /*
       * **Y en la final, nunca hacia arriba.** Alineado y bajando a la pista
       * fuera del tramo final del plan —una vuelta al campo sin plan, o por
       * la otra punta—, aquí arriba manda la ventanilla, y un automático que
       * sube hacia ella con la pista delante es el 3.000 de Gando hecho de
       * verdad. Se queda en la altura que lleva, como uno que la sostiene:
       * irse al aire lo decide quien vuela.
       */
      if (
        this.faseDeAhora === "final" &&
        this.objetivos.altitud !== null &&
        this.objetivos.altitud > s.position.y
      )
        this.objetivos = { ...this.objetivos, altitud: s.position.y, ritmo: 0 };
    }
    /*
     * **El modo vertical**, el que se escribe arriba de la pantalla de vuelo:
     * bajando por la senda de la final, `G/S`; por la del plan, `VNAV PTH`;
     * y si no, cambiar de nivel hasta capturar y sostener. Ver `modoVertical`.
     */
    const pedida = this.objetivos.altitud ?? s.position.y;
    const porLaSenda = !enLaFinal && (this.objetivos.ritmo ?? 0) < 0;
    const sencillo = this.tier.model === "simple";
    this.modoVertical = enLaFinal
      ? "G/S"
      : porLaSenda
        ? "VNAV PTH"
        : modoVertical(
            this.modoVertical === "G/S" || this.modoVertical === "VNAV PTH"
              ? "V/S"
              : this.modoVertical,
            {
              falta: pedida - s.position.y,
              vertical: s.velocity.y,
              nueva:
                this.alturaPedidaAntes !== null &&
                Math.abs(pedida - this.alturaPedidaAntes) > 30,
              conGases: this.gasesPuestos && !sencillo,
            },
          );
    this.alturaPedidaAntes = pedida;
    /*
     * **Y lo que hacen los gases**: en `FLCH SPD` subiendo, el empuje de la
     * subida, y bajando, ralentí; en los demás, la velocidad de la escalera.
     */
    const gases: ModoDeGases | null = !this.gasesPuestos
      ? null
      : this.modoVertical === "FLCH SPD"
        ? pedida > s.position.y
          ? "THR"
          : "IDLE"
        : "SPD";
    const toca = this.laVelocidadQueToca();
    if (this.gasesPuestos) this.objetivos = { ...this.objetivos, velocidad: toca.kt * NUDO };
    const minima = this.velocidadMinimaDelAutomatico();
    const aire = this.flight.aireDelDia();
    const modelo = this.flight;
    const m = mandosPara(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: indicatedAirspeed(s.airspeed, s.position.y, aire),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        // Solo cuenta al engancharse: coger el avión con el timón que lo
        // sostenía, ayuda incluida. Ver `timonAhora` en `model.ts`.
        timon: this.flight.timonAhora(),
        // Lo que empuja el motor aquí y lo que pesa el avión: los gases miden
        // con eso cuánto acelera cada trozo de palanca.
        empujeAFondo: empujeLleno(this.aircraft, airDensity(s.position.y, aire), s.airspeed),
        masa: this.aircraft.mass,
        /*
         * **Y en el modelo sencillo, con sus propias cuentas**: ahí la palanca
         * es cuánto se sube y el gas es la velocidad, y las dos cosas se le
         * preguntan al modelo. Ver `mandoParaSubir` y `gasPara` en `arcade.ts`.
         */
        ...(sencillo && modelo.mandoParaSubir
          ? {
              subirCon: (ritmo: number) => modelo.mandoParaSubir?.(ritmo) ?? 0,
              equilibrio: modelo.gasPara(
                trueFromIndicated(toca.kt * NUDO, s.position.y, aire),
              ),
            }
          : {}),
      },
      {
        ...this.objetivos,
        modo: this.modoVertical === "FLCH SPD" ? "FLCH SPD" : "V/S",
        gases,
        ...(minima !== undefined ? { minima } : {}),
      },
      dt,
      this.memoriaDelAutomatico,
    );
    /*
     * **Y el piloto automático NO escribe en los mandos del piloto.**
     *
     * Escribía, y se desenganchaba solo al fotograma siguiente: el módulo de
     * entrada no borra los mandos, los devuelve al centro poco a poco, así que
     * al leerlos otra vez encontraba **sus propios valores** y creía que
     * alguien había tocado la palanca. Medido: enganchaba, mandaba un
     * fotograma —alerón 0,55— y a los ciento cincuenta milisegundos ya estaba
     * suelto; el avión se iba con el ala caída y el rumbo derivaba cincuenta
     * grados en tres cuartos de minuto.
     *
     * Es la misma lección que este código ya tenía escrita en el banco de
     * despegue —«el guion le ponía timón al avión y el teclado se lo quitaba
     * al instante»— y que aquí se había vuelto a colar por el otro lado.
     *
     * Así que los mandos del piloto se quedan como están, y lo que va al
     * modelo de vuelo es una copia con lo del automático encima. Y la copia es
     * **la misma siempre**, para no reservar memoria sesenta veces por
     * segundo.
     */
    Object.assign(this.mandosConAutomatico, c);
    this.mandosConAutomatico.aileron = m.aileron;
    this.mandosConAutomatico.elevator = m.elevator;
    // Y el modelo sabe que los lleva él, para que las ayudas que imitan a
    // quien suelta la palanca no se turnen con él. Ver `ControlInputs.automatico`.
    this.mandosConAutomatico.automatico = true;
    this.mandosConAutomatico.sostieneLaAltura = false;
    /*
     * **Y el automático toma el trim; no pelea contra él.**
     *
     * El trim se **suma** al timón —`fdm.ts`: `clamp(elevator + trim, -1, 1)`—
     * así que copiar los mandos de quien vuela con el trim dentro y pisar solo
     * `elevator` deja al automático corrigiendo contra un sesgo constante. Y
     * no es un sesgo cualquiera: quien engancha el automático **acaba de
     * subir**, o sea que lleva el trim con morro arriba, que es justo el que
     * lo manda hacia arriba.
     *
     * Contado jugando: «¿por qué el piloto automático sube hasta la
     * estratosfera el avión cuando estoy en modo que permite el piloto?». Y
     * medido, con el automático pidiendo mantener dos mil metros durante cinco
     * minutos:
     *
     *     trim   jaz-60    jaz-90    jaz-120
     *     0      2.014 m   1.996 m   1.969 m
     *     0,5    2.123 m   2.056 m   2.359 m
     *     1      3.996 m   8.774 m   7.205 m
     *
     * Ocho mil setecientos metros es, literalmente, la estratosfera.
     *
     * La cura es la misma frase que este módulo ya tenía escrita dos veces
     * —«coge el avión como está»— aplicada al tercer mando: mientras el
     * automático lleva la altura, el timón que ve el avión es **solo** el
     * suyo. La prueba de lazo cerrado no lo veía porque volaba con
     * `neutralControls()`, y ahí el trim vale cero.
     */
    if (this.objetivos.altitud !== null) {
      this.mandosConAutomatico.trim = 0;
      this.timonDelAutomatico = m.elevator;
    }
    /*
     * **Y el gas, en el avión que lleva gases, lo mueve su servo**: la
     * palanca de quien vuela —la de la pantalla también— se mueve sola, que
     * es lo que se ve en una cabina de verdad, y se queda donde la deje al
     * soltarse. Es **la única mano que escribe el gas en el aire** además de
     * quien vuela: medido con un espía en los mandos, ver
     * `scripts/verificar-crucero.mjs`.
     */
    if (m.throttle !== null) {
      this.input.servoDelGas(m.throttle);
      this.mandosConAutomatico.throttle = m.throttle;
    }
    return this.mandosConAutomatico;
  }

  /**
   * **Se sueltan los gases**, y el automático sigue con lo demás. Se ve en la
   * pantalla de vuelo —la columna de los gases se queda en blanco— y la
   * palanca se queda donde la dejó el servo, que es donde la encuentra quien
   * la toca.
   *
   * PENDIENTE-VOCES-automatico: `vuelo.gasesSueltos`, en los peldaños de
   * abajo, la primera vez.
   */
  private soltarLosGases(): void {
    if (!this.gasesPuestos) return;
    this.gasesPuestos = false;
    this.objetivos = { ...this.objetivos, velocidad: null };
    this.avisar("attention");
  }

  /**
   * **La velocidad que toca ahora**, por la escalera de velocidades: ver
   * `flight/escalera-de-velocidades.ts`. Una vez por paso.
   *
   * Y en el modelo sencillo, nunca más de lo que ese modelo da a esta
   * altura: allí el gas es la velocidad y la punta sube con la altura sin
   * llegar a las cifras de un reactor de verdad a media altura. Pedirle más
   * es dejar los gases clavados al tope sin llegar nunca —el «se va al tope»
   * de Guyrami—, así que la marca y la ventanilla enseñan lo que de verdad se
   * va a sostener.
   */
  private laVelocidadQueToca(): VelocidadQueToca {
    if (this.velocidadDeAhora && this.velocidadDeAhoraEn === this.relojDelJuego)
      return this.velocidadDeAhora;
    const s = this.flight.state;
    const aire = this.flight.aireDelDia();
    const p = this.navegacion.progreso;
    const altitud = this.altitudIndicada();
    const ventanilla = this.ventanillaEnMetros();
    let v = velocidadQueToca(this.aircraft, {
      altitud,
      restante: this.navegacion.plan && p ? p.restante : null,
      bajando: this.navegacion.bajando,
      enFinal: this.faseDeAhora === "final",
      subiendo:
        s.velocity.y > 2 ||
        (ventanilla !== null && ventanilla - s.position.y > 300 * 0.3048),
      topeKt: topeDeLoSacado(this.aircraft, {
        tren: this.input.controls.tren,
        flaps: this.input.controls.flaps,
      }),
      aire,
    });
    if (s.onGround) {
      /*
       * En tierra, la de la subida inicial: la Vr y veinte nudos, que es la V2
       * y el margen con que se sale. Es la que se lleva puesta al despegar.
       */
      v = { kt: Math.round(this.aircraft.rotationSpeed / NUDO + 20), mach: null, tramo: "subida" };
    }
    if (this.tier.model === "simple") {
      const punta = indicatedAirspeed(this.flight.velocidadMaxima(), s.position.y, aire) / NUDO;
      if (v.kt > punta * 0.97) v = { ...v, kt: Math.floor(punta * 0.97), mach: null };
    }
    /*
     * PENDIENTE-VOCES-automatico: al pasar el `tramo` a `terminal` y a
     * `aproximacion`, en los tres peldaños de abajo, `vuelo.velocidadTerminal`
     * y `vuelo.velocidadAproximacion`. Hoy lo dicen la ventanilla SPD y la
     * muesca de la cinta, que se mueven solas.
     */
    this.velocidadDeAhora = v;
    this.velocidadDeAhoraEn = this.relojDelJuego;
    return v;
  }

  /** Cuándo se contó `velocidadDeAhora`, en el reloj del juego. */
  private velocidadDeAhoraEn = -1;

  /**
   * **La velocidad mínima del automático**, indicada, m/s, o ninguna: por
   * debajo baja el morro. La Vref y un diez por ciento con el ala limpia —un
   * margen de una vez y cuarto sobre la pérdida sin flaps— y algo menos que la
   * Vref con los de aterrizaje fuera, para que la final a su velocidad no la
   * toque. Ver `Objetivos.minima`.
   *
   * **En el modelo sencillo, ninguna**: allí no hay pérdida, y bajar el morro
   * no da velocidad —la velocidad es el gas—, así que lo único que haría es
   * bajar el avión cada vez que se quita gas.
   */
  private velocidadMinimaDelAutomatico(): number | undefined {
    if (this.tier.model === "simple") return undefined;
    const flaps = Math.max(0, Math.min(1, this.input.controls.flaps));
    return this.aircraft.approachSpeed * (1.1 - 0.15 * flaps);
  }

  /**
   * **El rumbo del localizador**: el de la pista, corregido hacia su eje, si
   * se viene a ella de frente y cerca. `null` si no se está en su haz. Es el
   * `LOC` del automático en la final: lo que lo lleva al eje sin que nadie
   * gire la rueda del rumbo.
   */
  private rumboDelLocalizador(): number | null {
    const destino = this.elDestino();
    const campo = destino ? this.elCampo(destino.id) : this.elCampo();
    const pista = campo.pista;
    const s = this.flight.state;
    const { along, across } = enEjesDePista(
      s.position.x,
      s.position.z,
      pista.x,
      pista.z,
      pista.heading,
    );
    const alUmbral = -along - pista.length / 2;
    if (alUmbral < 0 || alUmbral > 25000 || Math.abs(across) > 2500) return null;
    const torcido = (((s.heading * 180) / Math.PI - pista.heading + 540) % 360) - 180;
    if (Math.abs(torcido) > 45) return null;
    // A kilómetro y medio por delante: una entrada en el eje de unos treinta
    // grados como mucho, que es como captura un localizador.
    const corrige = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, -Math.atan(across / 1500)));
    const rumbo = (pista.heading * Math.PI) / 180 + corrige;
    return ((rumbo % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }

  /**
   * **La nivelada de los peldaños de abajo**: al llegar a la altura de la
   * ventanilla —o al crucero del plan, en el avión que no la lleva— con la
   * palanca suelta, el avión se queda ahí y el gas pasa a ser velocidad. Ver
   * `Tier.nivelada`, que cuenta de dónde sale.
   *
   * Usa la ley de la altura del automático —con sus topes de una décima de g
   * y su captura, que llega frenando— y nada más: ni toca el gas ni el
   * alabeo, y se aparta en cuanto se mueve la palanca o el compensador, o
   * cuando el plan empieza a bajar. No es un automático escondido: es el
   * avión compensado que se queda donde se le deja, que es lo que hace un
   * avión bien compensado de verdad.
   *
   * Y al nivelar, en el avión que lleva automático, el botón se ofrece. Ver
   * `proponerPilotoAutomatico`.
   */
  private sostenerElNivel(dt: number, c: ControlInputs): ControlInputs {
    const s = this.flight.state;
    const nivel = this.tier.nivelada ? this.nivelQueSeSostiene() : null;
    const tocan =
      this.input.mueve.cabeceo ||
      // La profundidad de la mano no es un toque: es la mano sosteniendo.
      (!this.input.sostiene.cabeceo && Math.abs(c.elevator) > TOQUE) ||
      (this.nivelada !== null && Math.abs(c.trim - this.trimDeLaNivelada) > 1e-6);
    if (
      nivel === null ||
      s.onGround ||
      tocan ||
      this.faseDeAhora === "final" ||
      (this.nivelada !== null && Math.abs(this.nivelada.nivel - nivel) > 30)
    ) {
      this.soltarLaNivelada();
      return c;
    }
    if (!this.nivelada) {
      const falta = nivel - s.position.y;
      // Se captura viniendo hacia ella, como la captura del automático.
      const viene = falta * s.velocity.y > 0 || Math.abs(falta) < 30;
      if (!viene || Math.abs(falta) > aCuantoCaptura(s.velocity.y)) return c;
      this.nivelada = { memoria: memoriaNueva(), nivel };
      this.trimDeLaNivelada = c.trim;
      /*
       * PENDIENTE-VOCES-automatico: `vuelo.niveladaAsistida` aquí, y
       * `vuelo.automaticoArriba` si lo lleva.
       */
      if (llevaPilotoAutomatico(this.aircraft)) this.hud.proponerPilotoAutomatico(true);
    }
    const aire = this.flight.aireDelDia();
    const modelo = this.flight;
    const m = mandosPara(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: indicatedAirspeed(s.airspeed, s.position.y, aire),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        timon: this.flight.timonAhora(),
        ...(modelo.mandoParaSubir
          ? { subirCon: (ritmo: number) => modelo.mandoParaSubir?.(ritmo) ?? 0 }
          : {}),
      },
      { rumbo: null, altitud: this.nivelada.nivel, velocidad: null, gases: null },
      dt,
      this.nivelada.memoria,
    );
    Object.assign(this.mandosConAutomatico, c);
    this.mandosConAutomatico.elevator = m.elevator;
    this.mandosConAutomatico.trim = 0;
    this.mandosConAutomatico.sostieneLaAltura = true;
    this.mandosConAutomatico.automatico = false;
    this.timonDeLaNivelada = m.elevator;
    return this.mandosConAutomatico;
  }

  /** El compensador al capturar, para saber si alguien lo mueve. */
  private trimDeLaNivelada = 0;
  /** El último timón de la nivelada: queda en el compensador al soltarla. */
  private timonDeLaNivelada = 0;

  /**
   * Se suelta la nivelada, y como el automático, **deja el avión compensado
   * donde lo llevaba**: su timón al compensador, para que no dé un bandazo en
   * la mano de quien lo coge. En el modelo sencillo no hay compensador.
   */
  private soltarLaNivelada(): void {
    if (!this.nivelada) return;
    this.nivelada = null;
    if (this.tier.model !== "simple") this.input.controls.trim = this.timonDeLaNivelada;
    this.mandosConAutomatico.sostieneLaAltura = false;
    if (!this.pilotoPuesto) this.hud.proponerPilotoAutomatico(false);
  }

  /**
   * **A qué altura se nivela solo**, m, o `null` si a ninguna: la de la
   * ventanilla, o el crucero del plan en el avión que no la lleva, mientras
   * no se esté bajando. Bajando no: ahí quitar gas tiene que seguir siendo
   * bajar, que es lo que se enseña en esos peldaños.
   */
  private nivelQueSeSostiene(): number | null {
    if (this.navegacion.bajando) return null;
    const ventanilla = this.ventanillaEnMetros();
    if (ventanilla !== null) return ventanilla;
    if (!this.navegacion.plan) return null;
    const crucero = this.navegacion.cruceroPlaneado;
    return crucero > 0 ? crucero : null;
  }

  /**
   * **La velocidad de la ventanilla SPD y de la muesca de la cinta**: la que
   * toca, en el aire y en tierra. Ver `laVelocidadQueToca`.
   */
  private laSpdDelPanel(): { kt: number; mach: number | null } {
    const v = this.laVelocidadQueToca();
    return { kt: v.kt, mach: v.mach };
  }

  /**
   * **Lo que hace cada mano del automático**, para el FMA de los reactores,
   * o `null` si no hay nada puesto. Ver `Fma` en `ui/tablero.ts`.
   */
  private elFma(): Fma | null {
    if (!this.pilotoPuesto) return null;
    const gases = !this.gasesPuestos
      ? ""
      : this.modoVertical === "FLCH SPD"
        ? (this.objetivos.altitud ?? 0) > this.flight.state.position.y
          ? "THR"
          : "IDLE"
        : "SPD";
    return {
      gases,
      lateral: this.objetivos.rumbo !== null ? this.modoLateral : "",
      vertical: this.objetivos.altitud !== null ? this.modoVertical : "",
      piloto: true,
    };
  }

  /** La copia de los mandos que se le pasa al modelo. Ver arriba. */
  private readonly mandosConAutomatico: ControlInputs = neutralControls();

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
  /**
   * Y **qué** se dijo, para no repetirlo mientras siga pasando lo mismo.
   *
   * Qué y no si: era un sí o un no, y con eso el primer aviso gastaba el
   * único. En una frustrada con el JAZ 90 salía «muy rápido con los flaps»,
   * los flaps acababan de subir, el que quedaba pasado de su tope era el
   * tren, y del tren ya no se decía nada: de 205 nudos a 293 con las patas
   * fuera y callado. Un aviso vuelve cuando cambia lo que pasa.
   */
  private dichoDeSobrevelocidad: string | null = null;
  /**
   * Si lo que se pasa son los flaps de un avión que no tiene luz para eso.
   * Ver `atenderALaSobrevelocidad`.
   */
  private rapidoSinLuz = false;
  /**
   * Cómo van los flaps: el alivio de carga y el abuso. Ver
   * `flight/carga-de-flaps.ts` y `atenderALosFlaps`.
   */
  private cargaDeFlaps: CargaDeFlaps = FLAPS_SANOS;

  /** Lo que ya se dijo de los flaps en esta toma. Ver `flapsTrasLaToma`. */
  private dichoTrasLaToma: LoDicho = NADA_DICHO;
  /** Dónde estaba la palanca de flaps en el paso anterior. */
  private palancaDeFlapsVista = 0;

  /**
   * **Los flaps después de tocar: arriba al dejar la pista, no en la
   * carrera.** La regla y el porqué están en `flight/despues-de-aterrizar.ts`;
   * aquí se elige la frase según el peldaño y se dice.
   *
   * Con la escalera: abajo, la instructora con la frase corta —«ahora sí,
   * subí los flaps»—; en el de cabina, **la lista de después del
   * aterrizaje**, que es como lo hace una tripulación de verdad y como se lo
   * va a encontrar quien vuele un día. En el dibujo, la tarjeta con los flaps
   * y su tecla, que es lo que se entiende sin leer.
   */
  private flapsTrasLaToma(antes: Fase | "", ahora: Fase): void {
    const palanca = this.input.palancaDeFlaps;
    const paso = flapsTrasLaToma(
      { fase: antes, palanca: this.palancaDeFlapsVista },
      { fase: ahora, palanca },
      this.dichoTrasLaToma,
    );
    this.palancaDeFlapsVista = palanca;
    this.dichoTrasLaToma = paso.dicho;
    if (!paso.toca || !this.aircraft.llevaFlaps) return;
    const clave: TranslationKey =
      paso.toca === "enLaCarrera"
        ? "vuelo.flapsEnLaCarrera"
        : paso.toca === "alPuesto"
          ? "vuelo.alPuestoConFlaps"
          : canalesDe(this.tier.avisos).cabina
            ? "vuelo.despuesDelAterrizaje"
            : "vuelo.flapsArribaAlSalir";
    this.hud.senal.mostrar(
      "flaps",
      this.rotulo(clave, "palabra.flaps"),
      null,
      {
        segundos: SE_QUEDA_EL_ARO * 2,
        prioridad: IMPORTANTE,
        // La tecla solo cuando lo que toca es subirlos.
        ...(paso.toca === "alSalir"
          ? { tecla: nombreDeTecla(this.input.preferredKey("flaps")) }
          : {}),
      },
    );
    this.instructor.decir(t(clave), clave);
  }

  /**
   * **Lo que les pasa a los flaps por pasarse**, y contarlo una vez.
   *
   * La cuenta está en `flight/carga-de-flaps.ts`; aquí se le pasa al mando
   * hasta dónde pueden bajar y se dice lo que cambia, **cuando cambia** —el
   * alivio que salta, los flaps que quedan tocados—, que es la regla de esta
   * casa para los avisos: vuelven cuando pasa algo, no cuando pasa un rato.
   *
   * Y con la escalera: el alivio de un reactor no lo canta ninguna caja de
   * verdad —se ve en el indicador de flaps, que sube con la palanca quieta—,
   * así que en el peldaño de cabina es la tarjeta y nada más. Abajo lo cuenta
   * la instructora, con calma, porque sin ella nadie sabría por qué los flaps
   * han subido solos. Lo de los flaps tocados lo dice ella en todos: en una
   * avioneta no hay más aviso que la persona de al lado.
   */
  private atenderALosFlaps(dt: number): void {
    const s = this.flight.state;
    const antes = this.cargaDeFlaps;
    const ahora = cuidarLosFlaps(this.aircraft, antes, {
      kt: s.airspeed * NUDOS,
      flaps: this.input.controls.flaps,
      palanca: this.input.palancaDeFlaps,
      paradoEnTierra:
        s.onGround && Math.hypot(s.velocity.x, s.velocity.z) < PARADO_DE_VERDAD,
      dt,
    });
    this.cargaDeFlaps = ahora;
    this.input.topeDeFlaps = hastaDondeBajan(ahora);
    const cabina = canalesDe(this.tier.avisos).cabina;
    if (ahora.aliviados && !antes.aliviados) {
      this.hud.senal.mostrar(
        "flaps",
        this.rotulo("vuelo.alivioDeFlaps", "palabra.flaps"),
        null,
        { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
      );
      if (!cabina)
        this.instructor.decir(t("vuelo.alivioDeFlaps"), "vuelo.alivioDeFlaps");
    }
    if (ahora.tocados && !antes.tocados) {
      this.hud.senal.mostrar(
        "flaps",
        this.rotulo("vuelo.flapsTocados", "palabra.flaps"),
        null,
        { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
      );
      this.instructor.decir(t("vuelo.flapsTocados"), "vuelo.flapsTocados");
    }
  }

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
      this.dichoDeSobrevelocidad = null;
      return;
    }
    /*
     * **Y el tope no es solo el del avión: es el de lo que lleva sacado.**
     *
     * Un avión con las patas fuera no es el mismo avión. Sus compuertas
     * aguantan mucho menos que el fuselaje —doscientos setenta nudos contra
     * trescientos sesenta y cinco en uno de línea— y un flap, menos todavía.
     * Sin esto el juego enseñaba media lección: contaba que el tren frena y no
     * que el tren **se rompe**.
     *
     * El de lo sacado manda cuando es más bajo, que es siempre que haya algo
     * fuera, y entonces el aviso dice **qué recoger** — que es lo accionable.
     * «Vas muy rápido» a secas deja a quien lo oye sin saber qué tocar. Ver
     * `loQueSePasa` en `flight/limites.ts`.
     */
    const kt = s.airspeed * NUDOS;
    const forzando = loQueSePasa(kt, this.aircraft, this.input.controls);
    // El de los flaps es el de **su posición**: ver `vfeEn`.
    const tope = forzando
      ? (forzando === "flaps"
          ? vfeEn(this.aircraft.vfePorMuesca, this.input.controls.flaps)
          : this.aircraft.vleKt) / NUDOS
      : this.flight.limiteDeVelocidad();
    const pasado = s.airspeed > tope;
    this.sobrandoVelocidad = pasado ? this.sobrandoVelocidad + dt : 0;
    /*
     * **Y la luz roja, solo en el avión que la lleva.** Una avioneta no tiene
     * ningún aviso de flaps pasados: tiene el arco blanco del anemómetro y a
     * la instructora al lado, que es quien lo dice. Encender aquí la luz de
     * sobrevelocidad de un avión de línea sería enseñar una luz que ese avión
     * no tiene. Del tope del avión entero sí avisa, como siempre.
     */
    this.rapidoSinLuz =
      forzando === "flaps" &&
      !this.aircraft.avisosHablados &&
      s.airspeed <= this.flight.limiteDeVelocidad();
    /*
     * **Y con el alivio de carga puesto, el avión ya se está encargando.**
     * Los flaps de aterrizaje están subiendo solos a la muesca de antes —ver
     * `flight/carga-de-flaps.ts`—, igual que el tren que ya entra: si con los
     * flaps donde van no queda nada que se pase, no hay nada que pedir. Lo
     * que se cuenta es el alivio, una vez, en `atenderALosFlaps`.
     */
    if (
      forzando === "flaps" &&
      this.cargaDeFlaps.aliviados &&
      !loQueSePasa(kt, this.aircraft, {
        tren: this.input.controls.tren,
        flaps: Math.min(
          this.input.controls.flaps,
          hastaDondeBajan(this.cargaDeFlaps),
        ),
      }) &&
      s.airspeed <= this.flight.limiteDeVelocidad()
    ) {
      this.sobrandoVelocidad = 0;
      return;
    }
    if (!pasado) {
      // Se rearma al volver a estar dentro con holgura: si no, volvería a
      // cantar en cuanto la aguja rozara el tope otra vez.
      if (s.airspeed < tope * 0.94) this.dichoDeSobrevelocidad = null;
      return;
    }
    /*
     * **Y lo que se dice es lo que se puede hacer.** Con la palanca de flaps
     * ya arriba, los flaps están subiendo —tardan, ver `flight/flaps.ts`— y
     * «recogélos» pedía lo que ya está hecho: quien obedece pulsa la F y los
     * vuelve a bajar, porque la palanca va en ciclo. Así que se pregunta
     * otra vez sin ellos: si el tren también se pasa, es el tren; si no, la
     * velocidad a secas, que es lo que queda por hacer. El tope sigue siendo
     * el de los flaps mientras estén fuera, que se están forzando igual.
     */
    /*
     * **Y con el tren, igual: se mira la palanca, no las ruedas.** El tren
     * tarda en entrar lo que tarda uno de verdad, y mientras entra sigue
     * «fuera»: la instructora pedía «metelo» con la palanca ya arriba, una y
     * otra vez. Se oyó así: «Sí, ya, si está entrando. Agobiosa». Con la
     * palanca arriba, si no queda nada más que se pase, no hay nada que
     * pedir: se calla.
     */
    const trenYaSube = forzando === "tren" && !this.input.trenQueSePide;
    if (
      trenYaSube &&
      !loQueSePasa(kt, this.aircraft, {
        tren: 0,
        flaps: this.input.controls.flaps,
      }) &&
      s.airspeed <= this.flight.limiteDeVelocidad()
    ) {
      this.sobrandoVelocidad = 0;
      return;
    }
    const queSeDice =
      forzando === "flaps" && this.input.palancaDeFlaps <= 0
        ? loQueSePasa(kt, this.aircraft, {
            tren: this.input.trenQueSePide ? this.input.controls.tren : 0,
            flaps: 0,
          })
        : trenYaSube
          ? loQueSePasa(kt, this.aircraft, {
              tren: 0,
              flaps: this.input.controls.flaps,
            })
          : forzando;
    /*
     * **Y sin motor, «bajá el motor» no dice nada.** Pasado del tope del avión
     * sin motor, lo que queda es la nariz: levantarla un poco, que además es
     * volver a la velocidad que más lejos lleva. Los de los flaps y el tren
     * se quedan como están: recoger lo que se está forzando sigue siendo lo
     * que hay que hacer, con motor o sin él. Ver `flight/sin-motor.ts`.
     */
    const clave =
      queSeDice === "flaps"
        ? "vuelo.flapsPasados"
        : queSeDice === "tren"
          ? "vuelo.trenPasado"
          : this.sinMotor
            ? "vuelo.planeoRapido"
            : // Con los flaps subiendo, el tope es el suyo y no el del aire.
              !forzando && this.flight.quienLimita() === "aire"
              ? "vuelo.sobrevelocidadAire"
              : "vuelo.sobrevelocidad";
    if (this.sobrandoVelocidad < 2 || this.dichoDeSobrevelocidad === clave)
      return;
    this.dichoDeSobrevelocidad = clave;
    this.hud.senal.mostrar(
      "sobrevelocidad",
      this.rotulo(clave as TranslationKey, "palabra.rapido"),
      null,
      { segundos: SE_QUEDA_EL_ARO, prioridad: IMPORTANTE },
    );
    /*
     * **Y avisa, no corta.** Era «urgente», o sea que se llevaba por delante
     * a quien estuviera hablando — y venir rápido no es una emergencia: es un
     * dato que se dice y ya. Lo urgente son el terreno, la pista ocupada y la
     * frustrada, y poco más. Ver `audio/boca.ts`.
     */
    this.cantar("too fast", t(clave as TranslationKey), clave);
  }

  /**
   * Por encima de cuánto sobre el suelo una pérdida es una pérdida, m.
   *
   * Por debajo es la recogida del aterrizaje, que es una pérdida hecha a
   * propósito. Ver `cantarLaPerdida`.
   */
  private static readonly ALTO_PARA_LA_PERDIDA = 30;

  /** El último aviso de actitud que se cantó, para no repetirlo. */
  private actitudDicha: AvisoDeActitud = null;

  /**
   * «Sink rate» y «bank angle»: los dos avisos de **cómo** se vuela.
   *
   * La cuenta de altura dice dónde estás y el aviso de terreno dice qué tienes
   * debajo. Éstos dicen que lo que estás haciendo con el avión no da para lo
   * que queda, y los dos salían de números que el juego calcula desde siempre
   * sin decirlos nunca. Ver `flight/avisos-de-actitud.ts`, donde están las dos
   * cuentas con su derivación.
   *
   * **El rearme va en la condición, no en un reloj**, que es la regla de esta
   * casa: mientras siga siendo el mismo aviso no se repite, y vuelve cuando
   * deja de darse y se vuelve a dar. Un avión que ronda el umbral no suelta
   * una frase por fotograma.
   *
   * Y en `normal`, que es lo que son: avisos. No cortan a nadie — lo que corta
   * son el terreno, la pista ocupada y la orden de irse al aire.
   */
  private cantarLaActitud(): void {
    const s = this.flight.state;
    const ahora = avisoDeActitud(
      {
        enSuelo: s.onGround,
        /*
         * **Con lo que marca el radioaltímetro**, las ruedas sobre el suelo:
         * es lo que mira la caja de verdad, y es lo que hace que la recogida
         * sea la misma para todos. Con la altura del centro del avión, al de
         * seis metros de tren le sonaba *sink rate* a treinta pies, en plena
         * recogida y tapando la cuenta: medido en Los Rodeos con el JAZ 90,
         * «fifty», *sink rate*, y «forty, thirty, twenty» perdidos detrás.
         */
        altura: Math.max(0, s.heightAboveGround - this.aircraft.gearHeight),
        vertical: s.velocity.y,
        alabeo: bankAngleOf(s.orientation),
      },
      this.actitudDicha,
    );
    if (ahora === this.actitudDicha) return;
    this.actitudDicha = ahora;
    if (!ahora) return;
    this.avisar("attention");
    /*
     * **Y bajando de golpe por ir lento, lo que se explica es ir lento.**
     *
     * Las dos cosas se arreglan distinto: con velocidad de sobra, el ritmo de
     * bajada se corta levantando un poco la nariz; sin ella, levantar la nariz
     * es el camino a la pérdida, y lo que corta la bajada es el gas. La caja
     * dice *sink rate* igual en los dos casos —mide la bajada, no el porqué—;
     * quien explica lo que hay que hacer es la instructora, y tiene que
     * explicar lo que sirve. Ver `bandaDeAhora`.
     */
    const clave =
      ahora === "sink rate"
        ? this.bandaDeAhora === "lento"
          ? "vuelo.lentoYBajo"
          : "vuelo.bajasRapido"
        : "vuelo.muyInclinado";
    this.cantar(ahora, t(clave), clave, "normal");
  }

  /** Si la pérdida ya se cantó, para no repetirla mientras dure. */
  private perdidaDicha = false;

  /**
   * El canto de pérdida: «stall, stall».
   *
   * Urgente, y es de los pocos que lo son: el terreno, la pista ocupada, la
   * frustrada y esto. Una pérdida no es un dato que se dice y ya — es lo único
   * que hay que arreglar **ahora**, y por eso corta lo que haya.
   *
   * En el suelo no, claro: el modelo marca pérdida a cero nudos con el avión
   * parado en la plataforma, y un avión aparcado gritando «stall» es ruido.
   *
   * **Y en la recogida tampoco, que es la parte que hubo que medir.**
   *
   * Un aterrizaje **es** una pérdida: se toma tirando hasta que el ala deja de
   * sustentar, a un palmo del asfalto y a propósito. El primer intento cantaba
   * ahí, y con urgencia —o sea cortando—, así que se comía las autorizaciones
   * de la torre: el banco de vuelo entero pasó de 24 de 24 a 22 de 24, con
   * «torre.clearedTakeoff: caducó esperando» en la traza.
   *
   * Un avión de verdad hace lo mismo: el aviso de pérdida se inhibe cerca del
   * suelo, porque ahí ya no avisa de nada —estás haciendo lo correcto— y solo
   * tapa lo que sí importa. Y encaja con la regla de la casa: aterrizar no se
   * dramatiza.
   *
   * Treinta metros: por encima de eso una pérdida es una pérdida; por debajo,
   * es la recogida.
   */
  private cantarLaPerdida(): void {
    const s = this.flight.state;
    const hay =
      avisaLaPerdida(s) && s.heightAboveGround > Game.ALTO_PARA_LA_PERDIDA;
    /*
     * **Y el rearme es el del modelo, no uno mío encima.**
     *
     * Aquí había una holgura propia sobre el ángulo de ataque, puesta para que
     * el ala entrando y saliendo del filo no soltara diez cantos en cinco
     * segundos. Estaba de más, y lo estaba por no haber leído el modelo
     * primero: `stalled` **ya lleva su propia histéresis**, y mejor razonada
     * —entra si el ángulo se mantiene un tercio de segundo por encima, y no
     * sale hasta bajar tres grados y medio por debajo, «porque recuperar
     * cuesta más que entrar»—. Ver `STALL_DELAY` y `STALL_RECOVERY` en
     * `fdm.ts`.
     *
     * Dos umbrales distintos para la misma cosa es como se acaba teniendo dos
     * definiciones de «pérdida» que un día dicen cosas contrarias. Manda el
     * del modelo.
     *
     * **Y ahora es el avisador del modelo, no la pérdida.** Un «stall, stall»
     * a ciento ochenta y ocho nudos parecía un aviso que miraba la velocidad,
     * y el registro de cantos con el ángulo al lado dijo otra cosa: α 18,6°
     * con una pérdida a 14,9°, o sea **pérdida de verdad**, a alta velocidad,
     * porque el piloto del banco tiraba de la palanca hasta ahí. Lo que sí
     * faltaba era que avisara antes: miraba `stalled`, el ala ya ida. Ver
     * `stallWarning` y `anguloDeAviso`, que llevan su propia holgura.
     *
     * Y probado: con una holgura del diez por ciento salían cuarenta y cinco
     * cantos en un vuelo, y con una del treinta, cincuenta. Que el número no
     * bajara al triplicar la holgura era el aviso de que el problema no estaba
     * aquí — **el avión entra y sale de pérdida de verdad cincuenta veces**,
     * porque ese vuelo está roto. Ver el JAZ 90 en Taguató, que acaba fuera de
     * pista. Tapar el canto habría escondido eso.
     */
    if (hay && !this.perdidaDicha) {
      this.perdidaDicha = true;
      this.avisar("attention");
      /*
       * **Y en `mando`, no en `urgente`.**
       *
       * `urgente` corta a quien esté hablando, y eso se reserva a lo que no
       * puede esperar a que acabe una frase: el terreno que sube, la pista
       * ocupada y la orden de irse al aire. Una pérdida en altura se arregla
       * bajando el morro y da tiempo a oír la frase entera — cortar aquí solo
       * conseguía tirar autorizaciones de la torre. Ver `Urgencia`.
       */
      this.cantar("stall, stall", t("vuelo.perdida"), "vuelo.perdida", "mando");
    } else if (!hay) {
      this.perdidaDicha = false;
    }
  }

  /** Lo último que avisó del tren, para no repetírselo. Ver `seVuelveADecir`. */
  private dichoDelTren: LoDichoDelTren | null = null;

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

  /**
   * Y de dónde sopla **aquí**, que es dato auxiliar y va en cian. Era el
   * del campo de salida en todo el vuelo; ahora es el de donde está el avión,
   * el mismo que lo empuja. Ver `seguirElViento`.
   */
  private get vientoDeHoy(): { desde: number; nudos: number } | null {
    const aqui = this.vientoAqui;
    if (aqui)
      return aqui.vientoDe !== null
        ? { desde: aqui.vientoDe, nudos: aqui.vientoKt }
        : null;
    const m = this.scenario.meteo;
    return m && m.vientoDe !== null
      ? { desde: m.vientoDe, nudos: m.vientoKt }
      : null;
  }

  private atenderAlTren(): void {
    if (!this.aircraft.trenRetractil) return;
    const s = this.flight.state;
    const donde = this.input.controls.tren;
    const pedido = this.input.trenQueSePide;
    const sobreElSuelo = s.heightAboveGround;
    /*
     * **Y cada despegue es un despegue nuevo.**
     *
     * Lo dicho del tren solo se olvidaba al mover la palanca, y comparando
     * con lo que estaba pedido cuando se dijo. Una vuelta entera de palanca
     * —meterlo al subir, sacarlo para aterrizar— deja la palanca donde
     * estaba, así que en el tramo siguiente, con el tren fuera otra vez,
     * «metélo» ya constaba como dicho: aterrizar en Guaraní y salir hacia
     * Encarnación era subir con las patas fuera sin que nadie lo pidiera.
     *
     * Tocar el suelo es el suceso que lo rearma, y no uno que pueda fabricar
     * el reloj: el aviso vuelve una vez por despegue, que es cuando se canta
     * en cualquier cabina. Ver `seVuelveADecir` en `flight/tren.ts`.
     */
    if (s.onGround) this.dichoDelTren = null;

    /*
     * El de sacarlo es un aviso de seguridad y manda: se dice aunque se acabe
     * de decir lo otro. El de meterlo es un consejo y espera su turno. Y es el
     * mismo que enciende la luz roja. Ver `vieneSinTren`.
     */
    if (this.vieneSinTren()) {
      if (!seVuelveADecir(this.dichoDelTren, "saca", pedido)) return;
      this.dichoDelTren = { que: "saca", pedido };
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
      // Sacar el tren se avisa, no se grita: quedan diez segundos de tren y
      // kilómetros de final. Era «urgente» y cortaba a quien hablara.
      this.cantar("gear down", t("vuelo.sacaElTren"), "vuelo.sacaElTren");
      return;
    }

    /*
     * Y metélo, cuando ya no hace falta: en el aire, subiendo y por encima de
     * la altura que diga **su ficha**.
     *
     * **Y por tipo, que antes no lo era.** Había una constante de trescientos
     * metros para los cuatro, con la explicación de que es la altura a la que
     * un despegue deja de poder volver a la pista de la que salió. El
     * razonamiento es bonito y mezcla dos cosas que no son la misma —el viraje
     * imposible y el momento de meter el tren— y no describe lo que hace
     * ningún avión:
     *
     * - Un avión de línea mete el tren **a los pocos segundos de despegar**,
     *   con «positive rate, gear up». Volar trescientos metros con las patas
     *   fuera es pasarse de su propia velocidad de tren.
     * - Una avioneta retráctil lo mete **cuando ya no queda pista donde
     *   posarse delante**, que son decenas de metros.
     *
     * Un niño que aprendiera aquí «el tren entra a trescientos metros» tendría
     * que desaprenderlo, y esa es justo la línea que este proyecto no cruza.
     * Ver `meteElTrenA` en la ficha de cada avión.
     */
    const meteA = this.aircraft.meteElTrenA ?? METE_EL_TREN;
    /*
     * **Y en el peldaño de abajo, con margen; y una segunda vez si se deja.**
     * «Dame tiempo de soltar el timón»: ver `recordarElTren` en
     * `flight/tren.ts`, que dice cuándo y por qué no con un reloj.
     */
    if (s.onGround) this.recordadoDelTren = NADA_RECORDADO;
    const toca = recordarElTren(
      {
        enElAire: !s.onGround,
        subiendo: s.verticalSpeed > 1,
        alto: sobreElSuelo,
        donde,
        pedido,
        nudos:
          indicatedAirspeed(s.airspeed, s.position.y, this.flight.aireDelDia()) *
          NUDOS,
        vleKt: this.aircraft.vleKt,
        primeroA:
          this.tier.model === "simple" ? meteA + MARGEN_DEL_PRIMER_PELDANO : meteA,
      },
      this.recordadoDelTren,
    );
    if (toca) {
      this.recordadoDelTren =
        toca === "primero"
          ? { primero: true, segundo: false }
          : { primero: true, segundo: true };
      this.dichoDelTren = { que: "mete", pedido };
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
      /*
       * **Y «positive rate» delante, que es lo que ata la pareja.**
       *
       * En un avión de verdad se cantan juntas: uno ve la subida asentada y
       * lo dice, y el otro contesta metiendo el tren. Sin la primera, «gear
       * up» llega suelta y no se aprende de dónde sale.
       *
       * Van seguidas y no a la vez: la boca hace cola y las dice una tras
       * otra con su silencio en medio, igual que la pareja de la torre en
       * castellano y en inglés. Ver `audio/boca.ts`.
       *
       * **Pero la pareja es de la cabina, y en casa es una frase.** La
       * instructora decía las dos —«Ya subís: metélo» y detrás «Metélo, el
       * tren te frena»—, que es la misma orden dos veces, y la segunda, que
       * es la que nombra el tren, esperaba turno detrás de la primera y de la
       * radio y **caducaba**: en el banco de Pettirossi con el JAZ 60,
       * «vuelo.meteElTren: caducó esperando». Lo que quedaba era un «metélo»
       * sin decir qué, y así se contó volando a Encarnación: subiendo por
       * 1420 ft con las patas fuera y nadie había pedido meterlas. En casa va
       * sola la que dice qué y por qué.
       *
       * **Y en el escalón de V1 y «rotate»**, que es la serie a la que
       * pertenece: son las llamadas del despegue, una detrás de otra. En
       * `normal` quedaba detrás de cualquier comentario de esos segundos —la
       * ruta, la comandante— y caducaba: también en Los Rodeos con el JAZ 90.
       */
      /*
       * La segunda vez ya no es «positive rate»: la subida está asentada hace
       * rato. Es el recordatorio, con la misma frase.
       */
      if (toca === "primero")
        this.cantar("positive rate", undefined, undefined, "mando");
      this.cantar(
        "gear up",
        t("vuelo.meteElTren"),
        "vuelo.meteElTren",
        "mando",
      );
    }
  }

  /** Lo recordado del tren en este despegue. Ver `recordarElTren`. */
  private recordadoDelTren: LoRecordado = NADA_RECORDADO;

  /**
   * **La lista antes de aterrizar: los aerofrenos armados y el autofreno.**
   *
   * En un avión de línea se arman antes de tocar —es una línea de la lista
   * de aterrizaje— para que al tocar salgan solos los frenos de tierra y el
   * autofreno entre con ellos. Sin armarlos, al tocar el ala sigue llevando
   * el avión y los frenos casi no muerden. Ver
   * `flight/palanca-de-aerofrenos.ts` y `flight/frenada.ts`.
   *
   * Se pide **una vez por aproximación**, al entrar en final con el tren
   * abajo, con la tarjeta del panel armado —que se toca para armarlos, o con
   * su tecla—. Y en los tres peldaños de abajo, si al pasar los quinientos
   * pies todavía no están, los arma la instructora, que es quien va al lado:
   * es lo que hace el piloto que no vuela con la lista en un avión de dos. En
   * el de cabina, la lista es de quien vuela.
   *
   * La voz que lo dice está por grabar: ver PENDIENTE-VOCES-aterrizaje.md.
   */
  private atenderALaListaDeAterrizaje(): void {
    const p = this.input.palancaDeAerofrenos;
    if (!p.hayPalanca && !p.hayAutofreno) return;
    const s = this.flight.state;
    /*
     * **En la aproximación, no en el embudo de final**: el embudo empieza a
     * tres kilómetros y medio, por debajo de los mil pies, y la lista de
     * aterrizaje está hecha antes. La zona de aproximación es la de la cuenta
     * del radioaltímetro: veinte kilómetros y yendo hacia la pista.
     */
    const enFinal =
      !s.onGround &&
      /*
       * Y por debajo de mil metros sobre el suelo: la zona es un cono de
       * veinte kilómetros que no mira la altura, y a treinta y seis mil pies
       * sobre el campo no se está aproximando nadie. Es la altura a la que se
       * baja el tren en un reactor que viene a aterrizar.
       */
      s.heightAboveGround < 1000 &&
      enLaZonaDeAproximacion(
        this.laPistaDeAhora(),
        s.position.x,
        s.position.z,
        s.heading,
      );
    // Una aproximación nueva, una lista nueva: al tocar o al salir de ella.
    if (!enFinal) {
      this.listaDeAterrizaje = { pedida: false, hecha: false };
      return;
    }
    const trenAbajo =
      !this.aircraft.trenRetractil || this.input.trenQueSePide;
    const faltaLaPalanca = p.hayPalanca && p.palanca === "recogida";
    const faltaElAutofreno = p.hayAutofreno && p.modo === "off";
    if (!trenAbajo || (!faltaLaPalanca && !faltaElAutofreno)) return;

    const armar = (): void => {
      if (p.hayPalanca && p.palanca === "recogida") p.ponerPalanca("armada");
      if (p.hayAutofreno && p.modo === "off")
        p.ponerAutofreno(this.autofrenoParaLaPista());
    };
    if (!this.listaDeAterrizaje.pedida) {
      this.hud.senal.mostrar(
        "aerofrenos-armados",
        this.rotulo("hud.armaAerofrenos", "palabra.aerofrenos"),
        null,
        {
          /*
           * Seis segundos, los de una tarjeta corriente: es una línea de la
           * lista y se le da tiempo a encontrar el botón o la tecla. Los dos
           * segundos y medio de un aro no dan para eso.
           */
          segundos: 6,
          /*
           * Por encima del PAPI y del motor, que en final salen cada vez que
           * cambian: con la misma importancia la tapaban al fotograma
           * siguiente y la lista se daba por pedida sin haberse visto. Por
           * debajo de lo urgente, que es el terreno o un bulto.
           */
          prioridad: (IMPORTANTE + URGENTE) / 2,
          tecla: nombreDeTecla(this.input.preferredKey("aerofrenos")),
          accion: armar,
        },
      );
      /*
       * Dada es **cuando se ve**: con otra tarjeta más importante puesta —un
       * aviso de terreno, la frustrada— ésta no entra, y se vuelve a ofrecer en
       * cuanto quede sitio. No es un reloj: es la cola de las tarjetas.
       */
      if (this.hud.senal.puesto.dibujo === "aerofrenos-armados")
        this.listaDeAterrizaje = { ...this.listaDeAterrizaje, pedida: true };
      return;
    }
    if (
      this.tier.avisos !== "cabina" &&
      !this.listaDeAterrizaje.hecha &&
      s.heightAboveGround < 500 * 0.3048
    ) {
      this.listaDeAterrizaje = { ...this.listaDeAterrizaje, hecha: true };
      armar();
      this.hud.senal.mostrar(
        "aerofrenos-armados",
        this.rotulo("hud.aerofrenosArmados", "palabra.aerofrenos"),
        null,
        { segundos: 4 },
      );
    }
  }

  /** Lo hecho de la lista en esta aproximación. */
  private listaDeAterrizaje = { pedida: false, hecha: false };

  /**
   * **El autofreno que pide esta pista**: LO si sobra pista, MED si va justa,
   * MAX si ni así. Es la cuenta que se hace en la cabina con la tabla de
   * distancias: la de aterrizaje con ese punto —el aire de los quince metros,
   * unos trescientos, y la rodadura—, con un quince por ciento de margen, y
   * contra la pista que hay. Con la pista mojada, la rodadura de mojado.
   */
  private autofrenoParaLaPista(): "lo" | "med" | "max" {
    const largo = this.laPistaDeAhora().length;
    const mojada = this.lloviendo.clase !== "nada";
    for (const modo of ["lo", "med"] as const) {
      const hace =
        300 +
        rodaduraDeFrenada(this.aircraft, this.superficie, {
          autofreno: modo,
          mojada,
        });
      if (hace * 1.15 <= largo) return modo;
    }
    return "max";
  }

  /** La hora solar del vuelo, para la térmica. Ver `calorDelSuelo`. */
  private horaDelVuelo = HORA_BUENA;
  /** La rugosidad del terreno de barlovento. Ver `mirarElBarlovento`. */
  private rugosidadAqui = CAMPO_ABIERTO;
  /** Segundos desde que se miró el barlovento. */
  private relojDelBarlovento = Infinity;

  /**
   * **Por dónde viene el viento**: cómo de rugoso es el terreno de los dos
   * kilómetros y medio de antes de llegar aquí. Ver `rugosidadDe`.
   *
   * Es lo que hace que la mecánica sea la de ese sitio: con el alisio entrando
   * por el mar, Gando se mueve poco; con el mismo viento pasando por encima de
   * las lomas de La Esperanza, Los Rodeos se mueve bastante. Se mira cada dos
   * segundos —doce muestras del terreno—, que es mucho más de lo que tarda el
   * relieve en cambiar debajo de un avión.
   */
  private mirarElBarlovento(dt: number): void {
    this.relojDelBarlovento += dt;
    if (this.relojDelBarlovento < 2) return;
    this.relojDelBarlovento = 0;
    // El que sopla aquí, no el de casa: ver `seguirElViento`.
    const viento =
      this.vientoAqui?.aire ??
      vientoComoVector(this.scenario.meteo ?? TIEMPO_DE_CASA);
    const fuerza = Math.hypot(viento.x, viento.z);
    if (!(fuerza > 0)) {
      this.rugosidadAqui = CAMPO_ABIERTO;
      return;
    }
    const p = this.flight.state.position;
    // De donde viene: al revés de hacia donde va.
    const de = Math.atan2(-viento.x, -viento.z);
    const alturas: number[] = [];
    let mar = 0;
    for (const lejos of [300, 800, 1500, 2500])
      for (const abierto of [-0.44, 0, 0.44]) {
        const a = de + abierto;
        const h = this.terrain.sampleHeight(
          p.x + Math.sin(a) * lejos,
          p.z + Math.cos(a) * lejos,
        );
        alturas.push(h);
        if (esAguaDeCasa(h, this.scenario.waterLevel)) mar++;
      }
    this.rugosidadAqui = rugosidadDe(alturas, mar);
  }

  /** Si ya se habló de esta racha de baches. Ver `hablarDeLosBaches`. */
  private bachesDichos = false;

  /**
   * **La turbulencia del camino de este vuelo**, y su anuncio atado a ella.
   * Ver `flight/turbulencia-del-vuelo.ts`.
   */
  private readonly turbulenciaDelVuelo = new TurbulenciaDelVuelo();
  /**
   * Si el cartel lo encendió el anuncio de la turbulencia, con el pasaje
   * suelto: al pasar se vuelve a apagar. Si ya estaba puesto —la bajada—, se
   * queda como estaba.
   */
  private cartelPorLaTurbulencia = false;
  /**
   * La turbulencia que pide un banco para este vuelo, en lugar de la sorteada.
   * Ver `ponerTurbulencia`.
   */
  private turbulenciaPedida: readonly Zona[] | null = null;

  /**
   * **Un banco pide la turbulencia del vuelo**: las zonas, por lo volado desde
   * el despegue. Vale para el vuelo de ahora si ya despegó, y si no para el
   * siguiente despegue.
   */
  ponerTurbulencia(zonas: readonly Zona[]): void {
    this.turbulenciaPedida = zonas;
    if (this.yaDespego) this.turbulenciaDelVuelo.empezar(zonas);
  }

  /** La turbulencia de este vuelo, para los bancos. */
  get turbulenciaParaBanco(): {
    zonas: readonly Zona[];
    volado: number;
    sucesos: readonly { volado: number; suceso: SucesoDelCamino }[];
  } {
    return {
      zonas: this.turbulenciaDelVuelo.deEsteVuelo,
      volado: this.turbulenciaDelVuelo.loVolado,
      sucesos: [...this.turbulenciaDelVuelo.sucesos],
    };
  }

  /**
   * **La turbulencia del camino, repartida al despegar**: según el tiempo de
   * los dos campos, lo largo del tramo y la variedad de lo real —a veces
   * nada, unos minutos, más rato o casi todo el vuelo con tormenta—. Una
   * vuelta al campo no tiene camino. Ver `turbulenciaDelCamino`.
   */
  private repartirLaTurbulencia(): void {
    this.cartelPorLaTurbulencia = false;
    if (this.turbulenciaPedida) {
      this.turbulenciaDelVuelo.empezar(this.turbulenciaPedida);
      return;
    }
    const destino = this.elDestino();
    const salida = this.campoPorId(this.salidaId);
    if (!destino || !salida || destino.id === this.salidaId) {
      this.turbulenciaDelVuelo.empezar([]);
      return;
    }
    const aqui = this.scenario.meteo ?? TIEMPO_DE_CASA;
    const alli = destino.escenario.meteo ?? aqui;
    const plan = this.navegacion.plan;
    const recta = Math.hypot(destino.x - salida.x, destino.z - salida.z);
    const origen = this.scenario.aerodrome?.origin;
    this.turbulenciaDelVuelo.empezar(
      turbulenciaDelCamino(
        {
          vientoKt: Math.max(aqui.vientoKt, alli.vientoKt),
          tormenta:
            aqui.lluvia === "tormenta" || alli.lluvia === "tormenta" || this.celdas.length > 0,
          nubes: aqui.techoM !== null || alli.techoM !== null,
          montana: !!origen && enCanarias(origen),
        },
        {
          largo: plan?.total ?? recta * 1.15,
          velocidad: this.aircraft.cruiseSpeed,
          crucero: plan ? this.navegacion.cruceroPlaneado : this.flight.state.position.y + 1500,
        },
      ),
    );
  }

  /**
   * **El anuncio de la turbulencia, atado a la de verdad.** Ver
   * `TurbulenciaDelVuelo`.
   *
   * - **Prevista**: antes de llegar, la comandante la anuncia y enciende el
   *   cartel —el *ding*—, y luego llega.
   * - **Sin avisar**: primero los baches, en seguida el cartel —que se enciende
   *   solo, ver `cinturon.ts`— y el anuncio.
   * - **Y al pasar**, se apaga el cartel si fue ella quien lo encendió.
   *
   * Lo dice con la frase que hay grabada, que todavía habla de «movimiento»;
   * las de la palabra turbulencia, por grados, la segunda vez dicha de otro
   * modo y el «ya estamos tranquilos» están en `PENDIENTE-VOCES-turbulencia.md`
   * para grabarse. Sin pasaje no hay a quién anunciar: ahí la instructora
   * cuenta los baches cuando se sienten. Ver `hablarDeLosBaches`.
   */
  private anunciarLaTurbulencia(suceso: SucesoDelCamino): void {
    if (suceso.que === "paso") {
      if (this.cartelPorLaTurbulencia && !this.megafonia.bajandoAlDestino)
        this.dijoSoltarse = true;
      this.cartelPorLaTurbulencia = false;
      return;
    }
    if (this.cinturon.pasajeSuelto) this.cartelPorLaTurbulencia = true;
    this.pidioAbrocharse = true;
    const forma = unaForma("comandante.turbulencia");
    this.comandante.decir(forma.texto, forma.id, "baja");
    if (this.tier.instruments !== "none") this.hud.radio(forma.texto);
  }

  /**
   * **Y los baches se explican, con calma.**
   *
   * Para muchos niños esta será la primera turbulencia que sientan, y lo que
   * aprendan a sentir aquí se lo llevan puesto. Así que lo que se dice es lo
   * verdadero y lo tranquilo: es el aire, el avión está hecho para esto, y por
   * eso va el cinturón. Nada de alarma: no es una emergencia.
   *
   * - **Con pasaje**, lo dice la comandante por megafonía, que es lo que se
   *   oye en cualquier avión de línea: se enciende el cartel, suena el *ding*
   *   y ella lo cuenta.
   * - **Sin pasaje**, la instructora, porque no hay nadie más a bordo.
   *
   * Sin pasaje, una vez por racha y en crucero: en la subida y la
   * aproximación la cabina tiene otras cosas que hacer. Vuelve a decirse
   * cuando el aire se calma y se vuelve a mover, no porque pase el rato —
   * con la misma banda muerta del cartel. Ver `SACUDE` en `cinturon.ts`.
   */
  private hablarDeLosBaches(dt: number, movimiento: number): void {
    const s = this.flight.state;
    /*
     * **Con pasaje, lo que se anuncia es lo que hay en el camino.** Esto
     * anunciaba cualquier racha de más de lo que enciende el cartel en
     * cuanto se pasaban los trescientos metros, y la primera que se cruza
     * siempre es la de la capa de abajo, en la subida: «siempre la anuncia en
     * el mismo sitio, al poco de despegar, y luego el vuelo es una balsa de
     * aceite». Ver `anunciarLaTurbulencia`.
     */
    const conGente = conPasaje(this.aircraft.mass);
    const enEmergencia =
      this.descensoDeEmergencia !== null && !this.descensoDeEmergencia.terminado;
    // Lo volado se lleva siempre: es lo que sitúa la turbulencia del camino.
    const suceso = this.turbulenciaDelVuelo.paso(dt, {
      enElAire: !s.onGround && this.yaDespego,
      velocidad: s.groundSpeed,
      movimiento,
      sePuedeAnunciar:
        conGente && this.faseDeAhora === "en-vuelo" && !enEmergencia && !this.sinMotor,
      pasajeSuelto: this.cinturon.pasajeSuelto,
    });
    if (conGente) {
      if (suceso) this.anunciarLaTurbulencia(suceso);
      return;
    }
    if (movimiento < YA_NO_SACUDE) this.bachesDichos = false;
    if (
      this.bachesDichos ||
      movimiento < SACUDE ||
      s.onGround ||
      this.faseDeAhora !== "en-vuelo" ||
      s.heightAboveGround < 300
    )
      return;
    this.bachesDichos = true;
    const forma = unaForma("vuelo.baches");
    this.instructor.decir(forma.texto, forma.id);
  }

  private atenderAlCinturon(
    movimiento: number,
    loDijo: boolean,
    loEncendio: boolean,
  ): void {
    const toca = this.cinturon.paso({
      fase: this.faseDeAhora as Fase,
      conPasaje: conPasaje(this.aircraft.mass),
      movimiento,
      loDijoLaComandante: loDijo,
      loEncendioLaComandante: loEncendio,
    });
    if (toca === this.cinturonPuesto) return;
    this.cinturonPuesto = toca;
    // El botón dice si el cartel está encendido, que es lo que se pregunta.
    this.hud.ponerMandoDeCinturon(toca);
    this.avisar("cinturon");
    this.hud.ponerCinturon(toca);
  }

  /**
   * El interruptor del cinturón, el de la cabina.
   *
   * Pedido tal cual: «es una decisión del piloto mandar a ponerlo
   * (turbulencia, inicio de aproximación, etc.)».
   *
   * **Enciende y apaga el cartel, que es lo que hace un interruptor.** Iba y
   * venía entre «automático» y «puesto a mano», y en tierra, en el despegue y
   * en la aproximación el cartel ya está puesto siempre: pulsarlo no cambiaba
   * nada que se viera. «Sigue sin pasar nada, que yo sepa, al pulsar esto.»
   * Ahora cambia el cartel al momento, y el botón dice si está encendido.
   * Apagado a mano, se vuelve a encender solo al alinearse y al entrar en
   * final: ver `Cinturon.paso`.
   */
  mandarElCinturon(): void {
    this.cinturon.ponerMando(this.cinturonPuesto ? "quitado" : "puesto");
    this.hud.destellarCinturon();
  }

  private cotaDeLaPistaAqui(): number {
    const { x, z } = this.flight.state.position;
    /*
     * **La del campo que se tiene debajo.** El terreno de casa no sabe de
     * otras pistas: fuera de la suya contesta con la cota de su umbral, y
     * Los Rodeos está seiscientos metros por encima de Gando. Aterrizando
     * allí desde Gran Canaria se estaba siempre «a seiscientos metros de la
     * pista», y la tarjeta de «ya podés tocar» no salía nunca.
     */
    return this.cotaDePistaEn(this.elCampo(), x, z);
  }

  /** La misma vuelta de cámara, para que el banco pueda pedir una vista. */
  cicloDeCamara(): void {
    this.cycleCamera();
  }

  private cycleCamera(): void {
    // Las de pasaje, solo en el avión que lo lleva. Ver `vistasDe`.
    this.cameraMode = siguienteVista(this.cameraMode, this.hayPasaje);
    recordarVista(this.cameraMode);
    this.hud.ponerVistaDeCabina(this.cameraMode === "cockpit");
    // Y el encuadre, que cambia con ella: desde la cabina no hay cuadro que
    // esquivar. Ver `encuadrarSobreElCuadro`.
    this.encuadrarSobreElCuadro();
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
     * Y si el toque de flecha tiene compensador que mover: en el modelo
     * sencillo no lo hay. Ver `compensadorVivo` en `flight/input.ts`.
     *
     * La primera vez se construye antes que los mandos, y entonces lo pone
     * el constructor al crearlos.
     */
    const mandos = this.input as InputManager | undefined;
    if (mandos) {
      mandos.compensadorVivo = tier.model !== "simple";
      if (!mandos.compensadorVivo) mandos.controls.trim = 0;
    }
    /*
     * **Y el viento que ya sopla, que si no se pierde al cambiar de modelo.**
     *
     * `ponerTiempo` se lo dice al motor de vuelo, pero cambiar de peldaño o de
     * avión construye uno nuevo y el nuevo nace en calma. Se vería como un
     * viento que desaparece al cambiar de avión en mitad del vuelo.
     */
    const aire =
      this.vientoAqui?.aire ??
      vientoComoVector(this.scenario.meteo ?? TIEMPO_DE_CASA);
    modelo.ponerViento(aire.x, aire.z);
    // Y el aire del día, por lo mismo: el modelo nuevo nacería en un día
    // estándar hasta el siguiente repaso del tiempo.
    modelo.ponerAire(this.vientoAqui?.delDia ?? this.aireDeCasa());
    return modelo;
  }

  /**
   * Cambia de aeronave: **empieza un vuelo nuevo con la siguiente**.
   *
   * Montaba el avión nuevo donde estaba el anterior y seguía volando, y eso
   * dejaba el vuelo a medias: los destinos y el combustible se deciden al
   * arrancar y para el avión de ese arranque. Se cambió del cuatrimotor a la
   * avioneta en Pettirossi y la avioneta se quedó sin destinos —«no me deja
   * elegir otro aeropuerto»— y con veinte mil ochocientos cuarenta y dos kilos
   * en el depósito. Ahora hace lo que hace el hangar: guarda el avión y vuelve
   * a arrancar, por el mismo camino. Ver `flight/cambio-de-avion.ts`.
   *
   * Se cambia con la tecla del avión —la P, de fábrica—, que es el único
   * sitio: la placa del nombre de arriba no es un botón.
   */
  private cycleAircraft(): void {
    /*
     * **Y solo en tierra y parado.** En el aire no se cambia de avión, y
     * enseñarlo sería enseñar algo que no es. Se dice con el freno, que es lo
     * que hay que hacer, y con palabras para quien lee.
     */
    const s = this.flight.state;
    if (
      !sePuedeCambiarDeAvion({
        enTierra: s.onGround,
        velocidad: Math.hypot(s.velocity.x, s.velocity.z),
      })
    ) {
      this.hud.senal.mostrar("freno", t("avion.cambiarParado"), null, {
        segundos: 4,
      });
      return;
    }
    /*
     * **Y solo entre los que caben en esta pista.**
     *
     * El hangar ya lo comprobaba —`cabeEn`— y esta tecla no: se podía estar en
     * El Hierro, con mil doscientos cincuenta y cuatro metros, y pasar al de
     * fuselaje ancho, que necesita dos mil quinientos sesenta. A partir de ahí
     * no hay pilotaje que valga: el avión no llega nunca a la velocidad de
     * rotación, se va de la pista con el viento cruzado y acaba en el agua.
     *
     * Contado jugando, y las tres quejas eran la misma: «¿por qué con Tukã se
     * me va a la derecha?», «le doy a la flecha como un desesperado», «y ahora
     * es un barco».
     */
    // La pista que se tiene debajo, no la de casa: en El Hierro, llegando de
    // La Palma, se podía pasar al JAZ 90, que ahí no cabe.
    const aqui = this.elCampo().escenario;
    const campo = campoDe(aqui);
    const quepan = AIRCRAFT.filter(
      (a) => a === this.aircraft || cabeEn(a, campo).cabe,
    );
    const next =
      quepan[(quepan.indexOf(this.aircraft) + 1) % quepan.length] ?? PYKASU;
    /*
     * Y si no hay otro, se dice. Una tecla que no hace nada se aprieta más
     * fuerte; una tecla que contesta «aquí no cabe otro» enseña algo — que la
     * pista manda, que es media lección de este juego.
     */
    if (next === this.aircraft) {
      this.hud.senal.mostrar("fuera", t("avion.noCabeAqui"), null, {
        segundos: 4,
      });
      return;
    }
    /*
     * La preferencia, como la guarda el hangar, y el recado para que el
     * arranque no vuelva a preguntar quién vuela ni dónde. En el campo donde
     * se está: si se acaba de llegar a otro aeropuerto, el vuelo nuevo sale
     * de allí.
     */
    ponerTexto("aeronave", next.id);
    ponerTexto("escenario", aqui.id);
    escribirYa();
    /*
     * **Y el destino, que se perdía.** Al volver a arrancar se proponía el
     * vecino más cercano, fuera cual fuera el elegido: cambiar de avión
     * devolvía siempre el mismo destino y el mismo depósito. Se deja dicho; si
     * el avión nuevo no llega allí, el arranque lo descarta solo, como descarta
     * los del hangar. Ver `destinoDeSalida`.
     */
    pedirRearranque(sesionDeLaPestana(), {
      escenario: aqui.id,
      avion: next.id,
      destino: this.destinoId,
    });
    location.reload();
  }

  /**
   * **La cuenta de la toma de este avión**: la del radioaltímetro si lo
   * lleva, ninguna si no. Ver `laCuentaDe`.
   *
   * Ya no depende del peldaño —el radioaltímetro canta en pies en cualquier
   * cabina—, pero se rehace igual al cambiar de peldaño: es un contador, y un
   * peldaño nuevo es un vuelo nuevo. Lo mismo la altura en grande, que sí va
   * en las unidades del instrumento.
   */
  private laCuentaDeHoy(avion: AircraftConfig): AvisosDeAltura {
    return new AvisosDeAltura(laCuentaDe(avion));
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
    const { position, heading, airspeed, onGround } = this.flight.state;
    /*
     * Volando, el modelo nuevo nace **equilibrado**: con el ala sosteniendo
     * el peso. Sin eso nacía con el morro en el horizonte —sin sustentación—
     * y lo primero que hacía era caerse. Ver `InitialConditions.equilibrado`.
     */
    const carried = {
      position: position.clone(),
      heading,
      airspeed,
      equilibrado: !onGround,
    };

    this.tier = next;
    rememberTier(next);
    this.avisosDeAltura = this.laCuentaDeHoy(this.aircraft);
    this.alturaEnGrande = new AvisosDeAltura(
      next.units === "aeronautical" ? EN_GRANDE_EN_PIES : EN_GRANDE,
    );
    this.flight = this.buildFlightModel(next);
    this.flight.reset(carried);
    /*
     * **Y nada queda mandando sin verse.**
     *
     * De Taguató Ruvichá con el automático puesto a Guyrami: «no me deja
     * bajar gas, se va al tope; es como si alguien estuviera tirando del
     * timón». Era el automático, enganchado y escondido —Guyrami no tenía
     * botón— y con su canal de gas empujando hacia una velocidad que el modelo
     * sencillo no da. Al tocar la flecha sonó «autopilot disconnect».
     *
     * Ahora, al cambiar de peldaño en vuelo:
     *
     * - **El automático sigue puesto y a la vista**, porque es del avión y su
     *   botón sale en los cuatro peldaños. Y **vuelve a coger el avión** —el
     *   modelo es otro—, como al engancharlo: sin tirón.
     * - **Los gases**, igual: siguen, con la velocidad que ese modelo puede
     *   sostener, y se sueltan en cuanto se toca el gas.
     * - **La nivelada** de los peldaños de abajo se olvida: si toca, vuelve a
     *   capturar con el modelo nuevo.
     * - **El compensador**, en el modelo completo, se deja en el que sostiene
     *   el avión nivelado —el sencillo no tiene—: lo que quedaba del modelo
     *   viejo era el de otro avión, y soltar la palanca lo mandaba arriba o
     *   abajo sin que nadie lo hubiera pedido.
     *
     * Lo comprueba `scripts/verificar-cambio-de-peldano.mjs`, en cada fase.
     */
    this.memoriaDelAutomatico = memoriaNueva();
    this.alturaPedidaAntes = null;
    this.nivelada = null;
    this.mandosConAutomatico.sostieneLaAltura = false;
    if (!onGround && next.model !== "simple")
      this.input.controls.trim = this.flight.timonDeEquilibrio?.() ?? 0;

    this.hud.setUnits(next.units);
    this.hud.setEscalera(next.avisos);
    this.hud.setInstruments(next.instruments);
    /*
     * **Y el botón del piloto automático, a la vista si el avión lo lleva**,
     * y en la posición en que está: se ponía una sola vez al arrancar, y quien
     * subía de peldaño se quedaba sin él —«yo no veo piloto automático»—; y
     * al bajar a Guyrami se escondía con el automático todavía puesto. Ver
     * `ponerHayPilotoAutomatico`.
     */
    this.hud.ponerHayPilotoAutomatico(llevaPilotoAutomatico(this.aircraft));
    this.hud.ponerPilotoAutomatico(this.pilotoPuesto);
    this.hud.proponerPilotoAutomatico(false);
    /*
     * Y la marca del gas que sostiene el nivel, que **solo es verdad en el
     * modelo sencillo**: allí el motor es la velocidad y hay un punto exacto
     * en el que no se sube ni se baja. En el de coeficientes eso lo hace el
     * compensador, y una marca aquí mentiría. Ver `ponerGasDeNivel`.
     */
    this.hud.ponerGasDeNivel(
      next.model === "simple" ? MOTOR_QUE_SOSTIENE : null,
    );
    this.keyScreen?.setSimple(
      next.instruments === "none" || next.instruments === "pictorial",
    );
    this.keyScreen?.setCompensador(next.model !== "simple");
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
      /*
       * **Y lo que decía la senda se retira al tocar.** En la recogida todo
       * avión va por debajo del PAPI —se está posando—, y la tarjeta que salía
       * a quince metros duraba unos segundos: en Pedro Juan, ya rodando por
       * la pista, seguía puesto «Venís lento: metéle gas», que es lo contrario
       * de lo que toca. Se hace aquí, en el toque, y no con las ruedas en el
       * suelo sin más: el dibujo del motor es también el de «motor a fondo»
       * en la carrera de despegue, y ésa sí vale en tierra.
       */
      for (const d of ["motor", "papi0", "papi1", "papi2", "papi3", "papi4"])
        this.hud.senal.caducar(d);
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
      this.repartirLaTurbulencia();
    }
    if (avisaLaPerdida(state) && !this.wasStalled) this.avisar("perdida");
    if (state.crashed && !this.wasCrashed) this.avisar("error");

    this.wasOnGround = state.onGround;
    this.wasStalled = avisaLaPerdida(state);
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

  /**
   * El toque del altavoz —o la tecla V—: callar, o devolver lo que había.
   * Ver `Audio.alternarSilencio`.
   */
  private toggleSound(): void {
    this.alCambiarElVolumen(this.audio.alternarSilencio(), true);
  }

  /**
   * El deslizador de volumen. `soltado` cuando se deja: mientras se arrastra
   * suena, y al soltar se guarda. Sin cartel: el relleno del propio
   * deslizador ya dice dónde quedó, y un aviso cada vez que se toca la música
   * de fondo sería ruido.
   */
  private moverElVolumen(posicion: number, soltado: boolean): void {
    this.alCambiarElVolumen(this.audio.ponerPosicion(posicion, soltado), false);
  }

  /**
   * Lo que va detrás de cualquier cambio de volumen, venga del altavoz, del
   * deslizador o de la fila de los ajustes: son tres mandos sobre una cosa, y
   * los tres tienen que dejar lo mismo.
   */
  private alCambiarElVolumen(level: AudioLevel, avisar: boolean): void {
    // La voz obedece al mismo botón que el resto del sonido. Quien pone el
    // juego en mudo lo pone en mudo entero, y una voz que sigue hablando con
    // el altavoz tachado es exactamente lo que nadie espera.
    permitirVoz(level.id !== "mudo");
    /*
     * Y **el volumen también mueve la voz**. La voz del navegador no pasa por
     * la mezcla, así que el volumen maestro no la alcanza: hasta que se le
     * pasó, el botón solo la callaba del todo o la dejaba a tope. Veinte
     * tablets en un aula a medio volumen con el instructor gritando en las
     * veinte.
     */
    ponerVolumenDeVoz(level.gain);
    // En mudo no queda nadie hablando, así que la mezcla se levanta: si no,
    // se quedaba agachada con la última voz cortada a medias.
    if (level.id === "mudo") this.audio.callarLasVoces();
    // Y al instructor se le calla ahora mismo, no en la frase siguiente.
    if (level.id === "mudo") this.instructor.callar();
    this.hud.setSoundLevel(
      level.id,
      t(`sound.${level.id}` as never),
      this.audio.enElMando,
    );
    if (avisar) this.hud.flash(t(`sound.${level.id}` as never));
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
    // El campo donde se está, que en el aeropuerto de llegada no es el de
    // salida: con el de salida la insignia decía un sitio que no era.
    const campo = this.elCampoMontado().escenario;
    this.hud.setBadge(
      `${this.aircraft.name} · ${t(campo.nameKey as never)} · ${this.tier.name}`,
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
    this.hud.setHabla(hablaDe(campo.aerodrome?.id));
    this.ponerElDibujoDelMotor();
  }

  /**
   * Hélice o reactor en los mandos que viven fuera del HUD: la tecla dibujada
   * del gas y la palanca táctil. El HUD lo decide solo con la ficha.
   *
   * Un reactor con una hélice dibujada en la palanca de gases enseña algo que
   * luego hay que desaprender. Ver `fan` en ui/pictogramas.ts.
   */
  private ponerElDibujoDelMotor(): void {
    const chorro = esDeChorro(this.aircraft);
    this.keyScreen?.setChorro(chorro);
    const gas = document.querySelector<SVGElement>(
      '[data-touch="throttle"] .pad__dibujo',
    );
    if (gas) gas.innerHTML = dibujoDelGasTactil(chorro);
    /*
     * Y las marcas de la palanca, que también son de este avión y de este
     * modelo de vuelo: el gas de rodaje de un reactor no es el de una
     * avioneta, ni el del modelo sencillo el del completo. La misma cuenta que
     * usa el tope de rodaje, para que la marca y el tope digan lo mismo. Ver
     * `flight/palanca-de-gas.ts`.
     */
    this.input.ponerMarcasDeGas(this.flight.gasParaRodar(RODAJE));
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.encuadrarSobreElCuadro();
  };

  /**
   * **Le reserva sitio al cuadro de mandos en vez de dejar que tape el avión.**
   *
   * Desde fuera, el cuadro va clavado al borde de abajo y ocupa más de un
   * tercio de la pantalla; la cámara de cola encuadra el avión en el centro,
   * así que el avión quedaba justo detrás. Dicho mirándolo: «me gusta la idea,
   * pero tapa al avión».
   *
   * Lo que **no** se hace es mover la cámara: el sitio desde donde se mira un
   * avión es una decisión de cámara —la de cola está a seis décimas de
   * envergadura de alto y a una y media de atrás, y eso es lo que hace que se
   * vea como se ve— y torcerla para esquivar un adorno de pantalla estropea
   * las dos cosas. Lo que se mueve es **el encuadre**: se le dice a la lente
   * que el lienzo es más alto de lo que es y se recorta la parte de arriba, o
   * sea exactamente lo que hace un fotógrafo con un objetivo descentrable.
   * El avión sube media altura de cuadro y el mundo no se deforma.
   *
   * Desde la cabina no hay cuadro que esquivar —ahí el cuadro es el del
   * avión— y el encuadre vuelve al centro.
   */
  /**
   * El mundo que necesita una carta para dibujarse.
   *
   * Lo piden las dos superficies —las pantallas de la cabina y el cuadro
   * plano— y sale de aquí para las dos. Estaba escrito en línea en la llamada
   * de la cabina, así que el cuadro plano se quedó sin él y seguía enseñando
   * una brújula sobre un fondo vacío: «en Lanzarote no veo la pista».
   */
  private elMapa(): Mapa {
    return {
      x: this.flight.state.position.x,
      z: this.flight.state.position.z,
      /*
       * **La pista que se dibuja es la del campo que se tiene debajo.**
       *
       * Era siempre la del escenario de salida, que hasta que hubo rutas era
       * lo mismo. Contado jugando, ya en Tenerife Norte tras salir del Sur:
       * «no veo la pista en mi pantalla». Y no la veía porque la carta seguía
       * enseñando la de casa, a cincuenta kilómetros y fuera del alcance.
       *
       * La de más cerca es la misma cuenta que decide si una toma es un
       * aterrizaje. Ver `world/pistas-del-vuelo.ts`.
       */
      pista: this.scenario.aerodrome
        ? (laMasCerca(
            this.pistasDelVuelo(),
            this.flight.state.position.x,
            this.flight.state.position.z,
          ) ?? this.scenario.runway)
        : null,
      /*
       * **Los que ve el TCAS, y solo si el avión lo lleva.**
       *
       * Estaban todos los del mundo, a cualquier altura y con el mismo rombo,
       * también en los aviones que no llevan con qué verlos. Ahora la carta
       * pinta lo que le pasa el TCAS, como la de un avión de verdad: el del
       * circuito, el de la ruta y el turbohélice de las islas, con el símbolo
       * de lo que es cada uno. Ver `flight/tcas.ts`.
       */
      otros: this.aircraft.tcas ? this.traficoParaLaCarta() : [],
      /*
       * Y el modo: «TA ONLY» trabajando, «TCAS STBY» en espera —rodando por
       * la plataforma, que es cuando una carta vacía con aviones en el cielo
       * hay que poder entenderla—, y la banda si no es la normal. Ver
       * `modoEnPantalla` en `flight/tcas.ts`.
       */
      modoTcas: modoEnPantalla(
        this.aircraft.tcas,
        this.tcas.enMarcha,
        this.bandaDelTcas,
      ),
      /*
       * **Y el aeropuerto de destino, si esta ruta lleva a otro.**
       *
       * Sale del mundo vecino y no de una cuenta aparte: el sitio donde está
       * dibujado y el sitio que dice la carta tienen que ser **el mismo**, y la
       * única forma de que no puedan separarse es que salgan del mismo dato.
       * Ver `MundoVecino.desplazamiento`.
       *
       * Pedido jugando: «si salgo de un aeropuerto y me estoy acercando a otro,
       * estaría bien que se fuera mostrando también en el cuadro».
       */
      celdas: this.celdas,
      /*
       * **Y el relieve del avisador de terreno**, en el avión que lo lleva —el
       * mismo que mira hacia delante, ver `mirarElTerrenoDelante`—: verde,
       * ámbar y rojo por lo que queda por debajo o por encima. Ver
       * `relieveEnLaCarta` en `ui/carta.ts`.
       */
      relieve: this.aircraft.avisosHablados
        ? {
            cota: this.cotaParaLaCarta,
            altitud: this.flight.state.position.y,
            trenFuera: this.input.controls.tren > 0.5,
          }
        : null,
      /*
       * Y el símbolo de destino marca **el otro** campo, no el que se tiene
       * debajo: llegando a Tenerife Norte, el destino que queda por delante es
       * volver al Sur. Con los dos señalando lo mismo, la carta diría que
       * queda por llegar a donde ya se está.
       */
      destino: this.elOtroCampo(),
      /*
       * Y el alternativo, rotulado: el plan B se sabe dónde está antes de
       * necesitarlo. Ver `flight/alterno.ts`.
       */
      alterno: this.alternoParaLaCarta(),
      /*
       * **Y el plan de vuelo**, la línea magenta de verdad: por sus puntos y
       * hasta el eje de la pista. La carta abre el rango hasta el punto
       * siguiente mientras se vuela por la ruta; en tierra y en final manda
       * la pista, que es lo que se mira ahí. Ver `ui/carta.ts`.
       */
      ruta: this.rutaParaLaCarta(),
    };
  }

  /** El plan de vuelo como lo quiere la carta. Ver `RutaDeLaCarta`. */
  private rutaParaLaCarta(): Mapa["ruta"] {
    const plan = this.navegacion.plan;
    const p = this.navegacion.progreso;
    if (!plan || !p || this.missions.current) return null;
    return {
      fijos: plan.fijos,
      activo: this.navegacion.indice,
      descenso: p.puntoDeDescenso,
      subida: p.puntoDeSubida,
      crucero:
        this.navegacion.cruceroPlaneado > 0
          ? Math.round(this.navegacion.cruceroPlaneado / PIE_EN_METROS / 100) * 100
          : null,
      restante: p.restante,
      hora: this.horaDeLlegada(p.alSiguiente),
      abreElRango: !this.flight.state.onGround && this.faseDeAhora !== "final",
    };
  }

  /**
   * Los tráficos del TCAS, con lo que la carta necesita para abrir el rango.
   *
   * Uno con aviso se mira siempre; y en tierra, esperando para entrar en la
   * pista, el que viene a aterrizar a menos de ocho millas, que es lo que cabe
   * holgado en la carta de diez. Ver `Otro.abreElRango` en `ui/carta.ts`.
   */
  private traficoParaLaCarta(): Mapa["otros"] {
    const s = this.flight.state;
    const ocho = 8 * MILLA;
    return this.tcas.enPantalla.map((b) => ({
      x: b.x,
      z: b.z,
      clase: b.clase,
      relativa: b.relativa,
      tendencia: b.tendencia,
      abreElRango:
        b.clase === "aviso" ||
        (s.onGround &&
          this.llegandoAhora.has(b.id) &&
          Math.hypot(b.x - s.position.x, b.z - s.position.z) <= ocho),
    }));
  }

  /** Ver `updateCamera`. */
  private relojDelEncuadre = 0;
  /** El último corrimiento puesto, para no rehacer la lente si no cambia. */
  private corrimientoPuesto = Number.NaN;
  /** Y lo último acercado. Ver `encuadrarSobreElCuadro`. */
  private acercarPuesto = 1;

  /**
   * `forzar`: rehacer la lente aunque el corrimiento no haya cambiado. Lo
   * piden el cambio de ventana y el de vista, que cambian la lente por su
   * cuenta; el repaso periódico no.
   */
  private encuadrarSobreElCuadro(forzar = true): void {
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    /*
     * **En todas las vistas de fuera, y en la cabina no.**
     *
     * Esto sube la imagen lo que ocupa el cuadro de mandos para que no esconda
     * el avión: el avión está en el medio y el cuadro se le come los pies.
     *
     * Las de costado estuvieron fuera, porque subirlas metía el JAZ 90 debajo
     * de la fila de pictogramas. Eso era contando los pictogramas como parte
     * de «arriba»; contando solo la barra —ver `altoDeArriba`— el avión queda
     * en la franja libre, y fuera de ella el cuadro le tapaba medio fuselaje,
     * parado en el puesto. Desde la cabina no: ahí encuadra la propia cabina,
     * con su visera. Ver `encuadreDeCabina`.
     */
    const propio = this.cameraMode === "cockpit";
    /*
     * **Y centrado en la franja libre, no en lo que queda debajo del borde.**
     *
     * Se contaba solo el cuadro, como si encima del avión estuviera el borde
     * de la pantalla. Encima están la barra de botones y los pictogramas —en
     * un teléfono, dos filas y la cuarta parte de la pantalla—, así que el
     * avión subía hasta meterse debajo de ellos: en Pettirossi, parado en el
     * puesto, se le veían las alas asomando entre los botones y la llave
     * encima del fuselaje. El centro que vale es el de la franja que queda
     * entre lo de arriba y lo de abajo.
     */
    const arriba = this.hud.altoDeArriba;
    const abajo = alto - this.hud.altoDelCuadro;
    const corrimiento = propio ? 0 : (arriba - (alto - abajo)) / 2;
    /*
     * **Y el avión, dentro de la franja.** La cámara de cola mira lejos para
     * que se vea hacia dónde se va, y eso baja el avión unos diecisiete grados
     * por debajo del centro: en una tablet, con el cuadro ocupando media
     * pantalla, el avión quedaba **siempre** detrás de él. Se le dice a la
     * cámara cuánto puede bajar: hasta el 62 % de la franja libre, contado
     * con la lente que se va a poner.
     */
    const franja = Math.max(0, abajo - arriba);
    /*
     * La focal es la de la pantalla entera: el corrimiento ya no acerca nada.
     * Ver más abajo, donde se pone la lente.
     */
    /*
     * **Y en el teléfono, un poco más cerca.** «El avión se ve pequeño.» Con
     * el mismo ángulo de arriba abajo en una pantalla dos veces más ancha que
     * alta, a lo ancho se abren más de cien grados y el avión queda en un
     * cuarto de la pantalla de un aparato que ya es pequeño. Un doce por
     * ciento lo acerca sin quitar el horizonte. Desde la cabina, nada: ahí
     * encuadra la propia cabina.
     */
    const acercar = !propio && ahoraEsTelefonoApaisado() ? 1.12 : 1;
    const focal =
      (acercar * (alto / 2)) / Math.tan(((this.camera.fov / 2) * Math.PI) / 180);
    const sinTope = Number.POSITIVE_INFINITY;
    const ctx = this.contextoDeCamara;
    ctx.caidaMaxima = propio ? sinTope : Math.atan((franja * 0.12) / focal);
    /*
     * **Y el horizonte, siempre a la vista.**
     *
     * Parado en la pista con el cuadro abierto, la cámara de cola miraba al
     * avión desde arriba y el cielo quedaba por encima de la pantalla: «no
     * veo el cielo cuando estoy en la pista; está bien ver algo de horizonte,
     * porque parece que va uno encajonado». Se le dice a la cámara cuánto
     * puede mirar hacia abajo como mucho: lo que deja el horizonte por debajo
     * del borde de arriba de la franja libre, a un octavo de ella. Y como eso
     * baja el avión, hasta dónde puede bajar él en ese caso: su centro, nueve
     * grados por encima del borde de abajo. Son los que ocupan, mirando desde
     * detrás y desde arriba, la cola y el estabilizador, que quedan más cerca
     * de la cámara y salen más abajo: contado por porcentaje de la franja, en
     * el portátil la cola se quedaba debajo del tirador. Si las dos cosas no
     * caben a la vez, gana el avión. Ver `sinPerderElAvion` en
     * `cameras/fuera.ts`.
     */
    const mitadDeLaFranja = Math.atan(franja / 2 / focal);
    const cola = (9 * Math.PI) / 180;
    ctx.bajadaMaxima = propio ? sinTope : Math.atan((franja * 0.38) / focal);
    ctx.caidaTope = propio ? sinTope : Math.max(0.02, mitadDeLaFranja - cola);
    if (
      !forzar &&
      Math.abs(corrimiento - this.corrimientoPuesto) < 1 &&
      acercar === this.acercarPuesto
    )
      return;
    this.corrimientoPuesto = corrimiento;
    this.acercarPuesto = acercar;
    if (Math.abs(corrimiento) < 1) {
      this.camera.clearViewOffset();
      /*
       * `setViewOffset` deja puesta su proporción, y quitarlo no la devuelve:
       * la cabina —que no se corre— heredaba la del último encuadre de fuera
       * y salía estirada.
       */
      this.camera.aspect = ancho / alto;
      this.camera.zoom = acercar;
    } else {
      const extra = Math.abs(corrimiento) * 2;
      // Una imagen más alta de la que se recorta la ventana: recortando por
      // abajo el centro sube, y por arriba baja.
      this.camera.setViewOffset(
        ancho,
        alto + extra,
        0,
        corrimiento < 0 ? extra : 0,
        ancho,
        alto,
      );
      /*
       * **Y sin acercar.** El ángulo de visión se reparte entre el alto de la
       * imagen grande, no de la ventana, así que recortar era también hacer
       * zoom: con el cuadro abierto en el portátil, un treinta y cinco por
       * ciento más cerca, y el mundo se veía por una rendija. Es lo que hacía
       * sentir el cuadro como un cajón. Con el zoom a la inversa queda lo que
       * se quería desde el principio, un objetivo descentrable: la misma
       * lente, corrida hacia arriba.
       */
      this.camera.zoom = (acercar * alto) / (alto + extra);
    }
    this.camera.updateProjectionMatrix();
  }

}

/**
 * Círculo oscuro y translúcido que hace de sombra. Se orienta con el avión y
 * es un óvalo, no un disco: así insinúa la silueta sin modelar nada.
 */
/**
 * Puntos de una polilínea del mundo cada `paso` metros, con sus puntas. Es lo
 * que se le da al tráfico para que no espere encima de tu raya: ver `evitar`
 * en `ponerTrafico`.
 */
function cadaTanto(
  linea: readonly (readonly [number, number])[],
  paso: number,
): { x: number; z: number }[] {
  const puntos: { x: number; z: number }[] = [];
  for (let i = 0; i < linea.length - 1; i++) {
    const [ax, az] = linea[i]!;
    const [bx, bz] = linea[i + 1]!;
    const largo = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < largo; d += paso) {
      const t = d / largo;
      puntos.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t });
    }
  }
  const fin = linea[linea.length - 1];
  if (fin) puntos.push({ x: fin[0], z: fin[1] });
  return puntos;
}

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
  // En sRGB, que es en lo que pinta un lienzo: tomado por lineal, el verde
  // casi negro de la sombra salía gris. Ver `relojes-cabina.ts`.
  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  return textura;
}

export type { FlightModel };

/**
 * Cuánto tapa el techo de un parte: lo que dice el parte si lo dice —BKN casi
 * todo, OVC todo—, y si no, lo que se suponía por la altura de la capa.
 */
function tapaduraDe(m: Meteo): number {
  if (m.techoM === null) return 0;
  if (m.tapadura !== undefined) return m.tapadura;
  return m.techoM < 300 ? 0.9 : 0.45;
}
