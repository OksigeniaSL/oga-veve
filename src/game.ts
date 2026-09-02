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
} from 'three';
import { CoefficientFlightModel } from './flight/fdm';
import { ArcadeFlightModel } from './flight/arcade';
import { GUYRAMI, TIERS, rememberTier, rememberedTier, type Tier } from './flight/tiers';
import { AIRCRAFT, OGA_172, type AircraftConfig } from './flight/aircraft';
import { InputManager } from './flight/input';
import type { FlightModel, FlightState } from './flight/model';
import { Terrain, cabeceraEnUso } from './world/terrain';
import { crearAproximacion, type Aproximacion } from './world/aproximacion';
import { createSky, ponerNubes, updateSky, type SkyRig } from './world/sky';
import { createAircraftMesh, type AircraftMesh } from './world/aircraft-mesh';
import { RunwayGuide } from './world/runway-guide';
import { createVegetation, zonaDeAeropuerto } from './world/vegetation';
import { LECCION_POR_DEFECTO, type Leccion } from './flight/lecciones';
import { pedirMetar, TIEMPO_DE_CASA, type Meteo } from './world/meteo';

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
const APROXIMACION = 3000;
/** Y a qué altura sobre la pista: senda de tres grados y medio. */
const ALTURA_DE_FINAL = 180;
/** Lo menos que se pasa por encima del terreno de debajo, m. */
const SUELO_MINIMO = 150;
/** Y a qué velocidad. La de aproximación de un ligero, en metros por segundo. */
const VELOCIDAD_DE_FINAL = 33;
import { crearCiudad } from './world/ciudad';
import { MissionMarker } from './world/mission-marker';
import { MissionRunner } from './missions/runner';
import { objectiveTarget } from './missions/types';
import { missionsFor } from './content/missions';
import { conViento, VALLE_CORDILLERA, VECES_LEJOS, type Scenario } from './world/scenarios';
import { crearTeselas, type Teselas } from './world/teselas';
import { mundoElegido } from './ui/mundo';

/**
 * La clave de las teselas fotorrealistas. Ver `workers/meteo.js` y `.env.example`.
 *
 * Sin ella el juego pinta su mundo de polígonos, que es el de siempre y el que
 * arranca en cualquier máquina. Eso no es un modo degradado: es el suelo sobre
 * el que se construye todo lo demás.
 */
const CLAVE_TESELAS: string | null = import.meta.env.VITE_GOOGLE_TILES ?? null;
import { Hud } from './ui/hud';
import { CreditsScreen } from './ui/credits';
import { nombreDeTecla } from './flight/keymap';
import { elegirInstructor, type Instructor } from './audio/instructor';
import type { ControlInputs } from './flight/model';
import { delante, enEjesDePista, puntoDePista } from './world/rumbo';
import { PlanDeVuelo } from './world/plan-de-vuelo';
import { LandingWatcher } from './flight/aterrizaje';
import { arranqueEnPista } from './world/aerodrome';
import { KeyScreen } from './ui/teclas';
import { LOCALE_NAMES, cycleLocale, t } from './i18n';
import { Audio } from './audio/audio';

/** Vistas disponibles, en el orden en que rota la tecla C. */
const CAMERA_MODES = ['chase', 'cockpit', 'wing'] as const;
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
}

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
  /** Cuántos nudos eran tejado y no suelo. Para las comprobaciones. */
  private bultosQuitados = 0;
  private ciudadSobreLaFoto = false;
  /**
   * Segundos desde la última vez que se preguntó por los edificios de la foto.
   *
   * Se pregunta cada tres, y se sigue preguntando hasta tener respuesta. No hay
   * plazo: volando, el detalle de la ciudad se afina solo, y la respuesta puede
   * tardar en llegar lo que tarde el jugador en subir.
   */
  private esperaDeCiudad = 0;
  /**
   * Los desniveles medidos sobre manzanas, acumulados a lo largo del vuelo.
   *
   * No se decide con una tanda. La cata solo vale cerca del avión —el árbol de
   * teselas afina lo que la cámara mira y nada más—, así que cada tanda trae
   * pocas medidas y de un solo barrio. Se juntan hasta tener con qué.
   */
  private saltosDeCiudad: number[] = [];
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
  private readonly hud: Hud;
  private credits: CreditsScreen;
  private readonly creditsRoot: HTMLElement;
  private keyScreen: KeyScreen | null = null;

  /** Reconoce el aterrizaje y su calidad. Ver `flight/aterrizaje.ts`. */
  private readonly landing = new LandingWatcher();
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
  private faseAnunciada = '';

  private cameraMode: CameraMode = 'chase';
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
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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
    this.aircraft = options.aircraft ?? OGA_172;

    this.renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      powerPreference: 'high-performance',
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
        : this.scenario.size * (this.scenario.relieveLejano ? VECES_LEJOS * 0.8 : 1.6),
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
      this.plan = new PlanDeVuelo(this.scenario.aerodrome, this.scenario.runway, (x, z) =>
        this.terrain.sampleHeight(x, z),
      );
      this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
      this.scene.add(this.plan.grupo);
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
    if (this.scenario.ciudad) {
      this.scene.add(
        crearCiudad(
          this.scenario.ciudad,
          (x, z) => this.terrain.sampleHeight(x, z),
          // Con doscientos metros de margen: un edificio pegado a la pista es
          // un obstáculo, y un aeropuerto de verdad tiene a su alrededor
          // justamente eso, un vacío.
          zonaDeAeropuerto(this.scenario, 200),
          this.scenario.waterLevel,
        ),
      );
    }
    this.vegetacion = createVegetation(this.scenario, (x, z) => this.terrain.sampleHeight(x, z));
    this.scene.add(this.vegetacion);

    /*
     * Y el mundo de verdad, si lo hay. Se añade apagado: no se enseña hasta que
     * ha medido su desfase contra nuestro suelo, porque aparecer cuarenta metros
     * desplazado y luego dar un salto es peor que tardar un segundo más.
     */
    this.teselas = crearTeselas(this.scenario, this.claveDeTeselas(), (x, z) =>
      this.terrain.sampleHeight(x, z),
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
    if (this.leccion.id === 'aterrizaje') this.scene.add(this.runwayGuide.group);

    this.aircraftMesh = createAircraftMesh(this.aircraft);
    this.scene.add(this.aircraftMesh.group);

    this.blobShadow = createBlobShadow(this.aircraft.wingSpan);
    this.scene.add(this.blobShadow);
    this.scene.add(this.missionMarker.group);

    this.flight = this.buildFlightModel(this.tier);

    this.hud = new Hud(options.hudRoot);
    this.hud.setInstruments(this.tier.instruments);
    this.hud.setUnits(this.tier.units);
    this.hud.setMagneticVariation(this.scenario.magneticVariation);
    this.creditsRoot = options.creditsRoot;
    this.credits = new CreditsScreen(this.creditsRoot, this.flight.implementationName);


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
    this.hud.setSoundLevel(this.audio.level.glyph, t(`sound.${this.audio.level.id}` as never));
    // La pantalla de teclas se monta si existe su hueco. Es opcional a
    // propósito: el juego tiene que arrancar aunque falte.
    const teclasRoot = document.getElementById('teclas');
    if (teclasRoot) this.keyScreen = new KeyScreen(teclasRoot, this.input.keymap);
    // Sin letras, teclado dibujado. Con letras, la tabla.
    this.keyScreen?.setSimple(this.tier.instruments === 'none' || this.tier.instruments === 'pictorial');
    this.hud.onKeys(() => this.keyScreen?.toggle());
    // Volver al hangar es recargar. Suena brusco y es lo correcto: la elección
    // ya está guardada, cambiar de aeropuerto es empezar otro vuelo, y así no
    // hay que inventar el desmontaje en caliente de un escenario entero —que
    // es donde se quedan las fugas de memoria de los juegos web—.
    this.hud.onHangar(() => location.reload());
    this.hud.ponerMapa(this.scenario, (x, z) => this.terrain.sampleHeight(x, z));
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
    this.hud.setKeySource((accion) => nombreDeTecla(this.input.preferredKey(accion)));

    // La primera vez se abre sola. Una pantalla que explica los mandos no
    // sirve de nada si hay que saber que existe para encontrarla, y quien no
    // lee no va a descubrir una tecla por su cuenta.
    if (this.keyScreen && !localStorage.getItem('oga-veve:teclas-vistas')) {
      try {
        localStorage.setItem('oga-veve:teclas-vistas', '1');
        this.keyScreen.show();
      } catch {
        // Sin almacenamiento se abrirá cada vez, que tampoco es un drama.
      }
    }

    this.hud.onSoundClick(() => this.toggleSound());
    this.hud.onBrake((pressed) => this.input.setTouchBrakes(pressed));
    this.hud.onThrottle((direction) => this.input.setButtonThrottle(direction));

    window.addEventListener('resize', this.onResize);
    this.onResize();
    this.resetFlight();
    this.abrirVentanaDePruebas();
    this.hud.flash(`${t('help.start')} · ${t('help.assist')}`, 8);
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
      cotaCruda: (x: number, z: number) => this.teselas?.medidaDirecta(x, z) ?? null,
      /** De qué color se ven las cuatro del PAPI ahora mismo. */
      papi: () => {
        const m = this.aproximacion?.grupo.getObjectByName('papi') as
          | { instanceColor?: { array: ArrayLike<number> } }
          | undefined;
        const a = m?.instanceColor?.array;
        if (!a) return null;
        // Azul alto es blanco; azul bajo es rojo. Es la separación que hay.
        return Array.from({ length: 4 }, (_, k) => (a[k * 3 + 2]! > 0.5 ? 'blanca' : 'roja'));
      },
      /** La cota del suelo en un punto del mundo. Para medir el suelo, no el vuelo. */
      suelo: (x: number, z: number) => this.terrain.sampleHeight(x, z),
      /** El eje de la pista y las calles de rodaje, en coordenadas del mundo. */
      caminos: () => {
        const aero = this.scenario.aerodrome;
        if (!aero) return [];
        const enElMundo = (p: readonly [number, number]) => [p[0], -p[1]] as [number, number];
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
          return { que: 'plataforma', puntos: [...c, c[0]!, ...cruces] };
        });
        return [
          ...aero.runways.map((r) => ({ que: 'pista', puntos: r.centerline.map(enElMundo) })),
          ...aero.taxiways.map((t) => ({ que: 'rodadura', puntos: t.path.map(enElMundo) })),
          ...plataformas,
        ];
      },
      /** Cuánto se subió el aeródromo sobre el datum para librar la foto. */
      alzado: () => this.alzadoDelAerodromo,
      /** Cómo está el banco de nubes: si se ve, a qué altura y cuánto tapa. */
      nubes: () => {
        const banco = this.sky?.group.getObjectByName('nubes');
        if (!banco) return null;
        const capa = banco.children[0] as { material?: { opacity?: number } } | undefined;
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
        const l = Math.hypot(salida[0] - entrada[0], salida[1] - entrada[1]) || 1;
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
      aristas: (puntos: [number, number][]) =>
        puntos.map(([x, z]) => {
          const d = this.teselas?.detalleEn(x, z);
          return d ? [d.arista, d.error] : null;
        }),
      dondeCiudad: () =>
        this.scenario.ciudad ? this.dondeHayCiudad(this.scenario.ciudad) : [],
      casas: () => {
        const o = [...this.saltosDeCiudad].sort((a, b) => a - b);
        return {
          medidas: o.length,
          salto: o.length ? o[Math.floor(o.length / 2)]! : null,
          q1: o.length ? o[Math.floor(o.length * 0.25)]! : null,
          q3: o.length ? o[Math.floor(o.length * 0.75)]! : null,
          decidido: this.ciudadSobreLaFoto,
          levantadas: this.scene.getObjectByName('ciudad')?.children.length ?? 0,
        };
      },
      /** El estado del mundo de verdad, para las comprobaciones. */
      mundoReal: () => {
        if (!this.teselas) return null;
        const libres = (this.plan?.puestosPorOrden() ?? []).map((p) =>
          this.teselas!.estorboEn(p.xy[0], -p.xy[1]),
        );
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
          hundido: foto === null ? null : s.position.y - this.aircraft.gearHeight - foto,
          puestos: libres.map((e) => (e === null ? '—' : e.toFixed(1))).join(' '),
          puestoElegido: this.puestoElegido,
          bultos: this.bultosQuitados,
          volumen: this.saltosDeCiudad.length,
          casas: (this.scene.getObjectByName('ciudad')?.visible ?? false)
            ? (this.scene.getObjectByName('ciudad')!.children as { count?: number }[]).reduce(
                (n, m) => n + (m.count ?? 0),
                0,
              )
            : 0,
          masDespejado: libres.reduce<number>(
            (mejor, e, i) => (e !== null && (mejor < 0 || e < (libres[mejor] ?? Infinity)) ? i : mejor),
            -1,
          ),
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
        this.pilotoDePruebas = fn as ((c: typeof this.input.controls) => void) | null;
      },
      ruta: () => this.plan?.rutaVisible() ?? [],
      pista: () => this.scenario.runway,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.audio.setActive(true);
    this.renderer.setAnimationLoop(this.frame);
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.audio.setActive(false);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.terrain.dispose();
    this.renderer.dispose();
  }

  /** Coloca el avión al principio de la pista, parado y con el motor al ralentí. */
  /** Mira si se ha aterrizado y lo dice. La lógica vive en `aterrizaje.ts`. */
  private checkLanding(): void {
    const s = this.flight.state;
    const veredicto = this.landing.update(
      s.onGround,
      s.airspeed,
      s.touchdownSinkRate,
      s.crashed,
      Number.isFinite(this.runwayRemaining()),
    );
    if (!veredicto) return;
    this.hud.flash(
      t(
        veredicto === 'suave'
          ? 'hud.landedSoft'
          : veredicto === 'firme'
            ? 'hud.landedFirm'
            : 'hud.landedOffRunway',
      ),
      3.6,
    );
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
    if (this.leccion.arranque === 'aire') {
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
        this.terrain.sampleHeight(puesto[0], puesto[1]) + this.aircraft.gearHeight,
        puesto[1],
      );
    }
    // El arranque de un aeródromo real sale de su umbral medido, sesenta
    // metros pista adentro. Lo de abajo es para las pistas inventadas.
    const pista = aerodrome?.runways[0];
    const p = pista ? arranqueEnPista(pista, runway.heading) : null;
    const [x, z] = p ?? this.enLaPista(runway.length * 0.42);
    return new Vector3(x, this.terrain.sampleHeight(x, z) + this.aircraft.gearHeight, z);
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
      const p = arranqueEnPista(pista, runway.heading, runway.length * 0.5 - atras);
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
    const { along, across: lado } = enEjesDePista(p.x, p.z, r.x, r.z, r.heading);
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
    if (!s.onGround || s.airspeed > 2 || c.throttle > 0.05) {
      this.hud.flash(t('hud.engineBusy'));
      return;
    }
    c.engineOn = !c.engineOn;
    this.hud.flash(t(c.engineOn ? 'hud.engineOn' : 'hud.engineOff'));
  }

  resetFlight(): void {
    const { runway } = this.scenario;
    if (this.leccion.arranque === 'aire') return this.reiniciarEnFinal();
    // El plan se reinicia **antes** de colocar el avión: es él quien decide si
    // hoy se sale del puesto o de la cabecera, y de eso depende dónde y hacia
    // dónde aparece.
    const rodando = this.plan?.reiniciar() ?? false;
    const start = this.startPosition();
    const heading = rodando
      ? this.rumboDeSalida(start)
      : MathUtils.degToRad(runway.heading);

    this.flight.reset({ position: start, heading, airspeed: 0 });
    // Y con el motor parado, que es como está un avión en su puesto. Arrancarlo
    // es el primer paso del vuelo y hasta ahora no existía como paso.
    this.input.controls.engineOn = !rodando;
    this.faseAnunciada = '';
    if (this.missions.active) {
      this.missions.start(this.missions.active);
      this.hud.setMissionProgress(this.missions.progress);
      this.updateMissionMarker();
    }
    this.runwayGuide.reset();
    this.landing.reset();
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
    const q = new URLSearchParams(location.search).get('hora');
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
    const q = new URLSearchParams(location.search).get('teselas');
    if (q === '0') return null;
    if (!q && mundoElegido() === 'dibujado') return null;
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
    this.aproximacion = crearAproximacion(pista, cabeceraEnUso(this.scenario), (p) =>
      this.terrain.sampleHeight(p[0], -p[1]),
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
    this.terrain.reasentarAerodromo(this.scenario, datum);

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
    const alzado = datum + Math.min(1.5, Math.max(0, p85)) + 0.15;
    this.terrain.reasentarAerodromo(this.scenario, alzado);
    this.terrain.rehacerAerodromo(this.scenario);
    this.alzadoDelAerodromo = alzado - datum;
  }

  /** Cuánto hubo que subir el aeródromo sobre el datum. Para poder mirarlo. */
  private alzadoDelAerodromo = 0;

  private apagarElMundoDeMentira(): void {
    const fuera = (o: Object3D | undefined | null): void => {
      if (o) o.visible = false;
    };
    fuera(this.terrain.group.getObjectByName('terreno'));
    fuera(this.terrain.group.getObjectByName('horizonte'));
    fuera(this.terrain.group.getObjectByName('agua'));
    fuera(this.vegetacion);
    /*
     * Y la ciudad de cajas. Se veía exacto: «hay cubos en el aire flotando».
     *
     * Están colocadas sobre nuestro mapa de alturas, así que sobre la foto
     * quedan flotando; y en Tenerife además sobran, porque la fotogrametría ya
     * trae los edificios de verdad con su volumen y su sombra.
     *
     * En Asunción **sí harían falta** —allí la foto es una alfombra plana— pero
     * puestas sobre el suelo de la foto, no sobre el nuestro. Eso está probado
     * en `spike/aerodromo-real.js` y es lo siguiente.
     */
    fuera(this.scene.getObjectByName('ciudad'));

  }

  /**
   * Los sitios más poblados de la rejilla, para preguntarle a la foto si allí
   * tiene edificios. Medir en el aeropuerto no vale: allí no hay ninguno.
   */
  /**
   * Dónde catar para saber si la foto trae los edificios: **manzanas que estén
   * cerca del avión**.
   *
   * El primer intento cataba las doscientas celdas más densas de la ciudad, y
   * no daba respuesta nunca: las teselas de un barrio a ocho kilómetros y a la
   * espalda de la cámara son gruesas siempre, porque el árbol de teselas solo
   * afina lo que se está mirando. Salían doscientas catas de doscientas
   * descartadas, tanda tras tanda.
   *
   * Cerca sí hay detalle, siempre. Y en la plataforma «cerca» ya es la
   * terminal, que es un edificio como otro cualquiera: si la fotogrametría de
   * esta ciudad tiene volumen, ahí se ve desde el primer momento.
   */
  private dondeHayCiudad(ciudad: NonNullable<Scenario['ciudad']>): (readonly [number, number])[] {
    const { lado, clase } = ciudad.rejilla;
    const paso = ciudad.tamanoM / lado;
    const s = this.flight.state.position;
    const ALCANCE = 1500;
    const cerca: (readonly [number, number])[] = [];
    for (let f = 0; f < lado; f++) {
      for (let c = 0; c < lado; c++) {
        if (!clase[f * lado + c]) continue;
        const x = -ciudad.tamanoM / 2 + (c + 0.5) * paso;
        // El fichero tiene la Y al norte y el mundo el norte en la Z negativa.
        const z = -(-ciudad.tamanoM / 2 + (f + 0.5) * paso);
        if (Math.hypot(x - s.x, z - s.z) > ALCANCE) continue;
        cerca.push([x, z] as const);
        if (cerca.length >= 40) return cerca;
      }
    }
    return cerca;
  }


  /**
   * Nuestras casas encima de la foto, **solo donde la foto no las trae**.
   *
   * En Tenerife la fotogrametría tiene edificios de verdad, con su volumen y su
   * sombra, y añadir cajas encima es ruido. En Asunción no: allí es una foto
   * aérea pegada al relieve —el río, la bahía y las calles reales, y las casas
   * planas— y la rejilla de `data/cities/` es justo la pieza que falta.
   *
   * Cuál de las dos cosas es no se escribe a mano por aeropuerto: se mide. Y la
   * altura de cada casa sale de una rejilla de rayos contra la foto, no de
   * nuestro mapa: por eso salían «cubos en el aire flotando».
   */
  private async levantarCiudadSobreLaFoto(): Promise<void> {
    const ciudad = this.scenario.ciudad;
    if (!this.teselas || !ciudad || this.ciudadSobreLaFoto) return;

    /*
     * **No se decide de golpe: se junta.**
     *
     * Cada tanda cata las manzanas que caigan a menos de kilómetro y medio, que
     * son las únicas donde la fotografía está a resolución de edificio. Son
     * pocas, y todas del mismo barrio, así que una sola tanda no basta para
     * hablar de una ciudad. Se guardan y se sigue volando.
     *
     * Mientras no haya sesenta medidas no se toca nada — y **no tocar nada es
     * el lado seguro**: si nos equivocamos en Asunción faltan casas, y si nos
     * equivocamos en Tenerife plantamos veintinueve mil cajas encima de las
     * de verdad. Ante la duda, no plantar.
     */
    this.saltosDeCiudad.push(...this.teselas.catarVolumen(this.dondeHayCiudad(ciudad)));
    if (this.saltosDeCiudad.length < 60) return;
    this.ciudadSobreLaFoto = true;

    /*
     * **Una manzana de cada cuatro con más de cinco metros de desnivel.**
     *
     * No es la mediana, y eso importa. Medido en los dos aeródromos:
     *
     * | | mediana | q1 | q3 |
     * |---|---|---|---|
     * | Tenerife, la foto trae edificios | 5,3 m | 2,1 | **8,0** |
     * | Asunción, la foto es una sábana  | 2,5 m | 2,2 | **3,4** |
     *
     * La mediana casi no las distingue, porque en cualquier ciudad la mitad de
     * las catas caen en descampados, patios y calles anchas. El tercer cuartil
     * sí: en Asunción **todas** las manzanas dan lo mismo —entre dos y tres
     * metros y medio, que es la pendiente del terreno—, y en Tenerife hay una
     * cuarta parte que se va por encima de ocho. Eso son edificios.
     *
     * El corte en cinco no sale de ninguna teoría: sale de esos dos números y
     * está puesto **a propósito más cerca de Asunción que de Tenerife**. Los dos
     * errores no cuestan igual. Equivocarse hacia «la foto los trae» deja una
     * ciudad sin casas, que se nota y se arregla; equivocarse hacia «hay que
     * ponerlos» planta veintinueve mil cajas encima de los edificios de verdad.
     * Con dos aeropuertos medidos esto es lo que hay, y el margen se lo lleva el
     * fallo barato.
     */
    const orden = [...this.saltosDeCiudad].sort((a, b) => a - b);
    if (orden[Math.floor(orden.length * 0.75)]! > 5) {
      // La foto los trae. Nuestras cajas sobran, y el mundo de mentira ya está
      // apagado, así que aquí no hay nada más que hacer.
      return;
    }

    /*
     * Cuarenta mil casas necesitan cuarenta mil alturas, y un rayo por casa
     * contra un cuarto de millón de triángulos congela el navegador varios
     * segundos. Una rejilla gruesa —sesenta y cuatro por sesenta y cuatro— y se
     * interpola: un edificio mal puesto por medio metro no lo nota nadie desde
     * el aire.
     */
    const N = 64;
    const lado = ciudad.tamanoM;
    const paso = lado / (N - 1);
    const cotas = new Float32Array(N * N);
    for (let f = 0; f < N; f++) {
      for (let c = 0; c < N; c++) {
        const x = -lado / 2 + c * paso;
        const z = -lado / 2 + f * paso;
        cotas[f * N + c] = this.teselas.alturaEn(x, z) ?? this.terrain.sampleHeight(x, z);
      }
    }
    const cota = (x: number, z: number): number => {
      const fx = Math.max(0, Math.min(N - 1.001, (x + lado / 2) / paso));
      const fz = Math.max(0, Math.min(N - 1.001, (z + lado / 2) / paso));
      const c0 = Math.floor(fx);
      const f0 = Math.floor(fz);
      const tx = fx - c0;
      const tz = fz - f0;
      const v = (f: number, c: number): number => cotas[f * N + c]!;
      const a = v(f0, c0) * (1 - tx) + v(f0, c0 + 1) * tx;
      const b = v(f0 + 1, c0) * (1 - tx) + v(f0 + 1, c0 + 1) * tx;
      return a * (1 - tz) + b * tz;
    };

    const vieja = this.scene.getObjectByName('ciudad');
    if (vieja) this.scene.remove(vieja);
    // Sin calles: la foto ya las trae, y las nuestras encima son una losa.
    const grupo = crearCiudad(ciudad, cota, zonaDeAeropuerto(this.scenario, 200), -9999, false);
    grupo.name = 'ciudad';
    this.scene.add(grupo);
  }

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
      position: new Vector3(s.position.x, suelo + this.aircraft.gearHeight, s.position.z),
      heading: s.heading,
      airspeed: s.airspeed,
    });
    // `reset` apaga el motor, y quien lo tenía encendido lo tenía por algo.
    this.input.controls.engineOn = true;
  }

  /**
   * Busca un puesto de estacionamiento que no tenga un avión encima.
   *
   * En la fotogrametría están congelados los aviones que había el día que
   * Google voló, y el puesto que elige el plan en Tenerife tiene encima un
   * Boeing: el nuestro aparecía dentro de él. «Me comió un 737-800.»
   *
   * Se recorren los puestos del mejor al peor —el mejor es el más cercano a la
   * cabecera de salida— y se coge el primero libre. Si no hay ninguno, se deja
   * el que había: es mejor salir dentro de un avión que no salir.
   */
  private buscarPuestoLibre(): void {
    if (!this.teselas || !this.plan || this.leccion.arranque !== 'puesto') return;
    const puestos = this.plan.puestosPorOrden();
    if (puestos.length < 2) return;

    /*
     * **Se elige el más despejado, no el primero que pase una prueba.**
     *
     * La versión anterior preguntaba a cada puesto «¿estás libre?» y se
     * quedaba con el primer sí. Dos problemas: la pregunta no detectaba al
     * avión de al lado —solo lo que estuviera justo debajo—, y cuando no se
     * podía medir contestaba que sí. Con eso, el primer puesto de la lista
     * salía «libre» siempre y ahí es donde aparecíamos, dentro del 737.
     *
     * Comparar es más honesto que juzgar: entre varios puestos, el que menos
     * cosas tenga alrededor. Los que no se pueden medir se quedan fuera de la
     * comparación en vez de colarse como buenos.
     */
    const medidos = puestos
      .map((puesto) => ({
        puesto,
        // Del fichero al mundo: la Y del norte es la Z negativa.
        estorbo: this.teselas!.estorboEn(puesto.xy[0], -puesto.xy[1]),
      }))
      .filter((m): m is { puesto: (typeof puestos)[number]; estorbo: number } => m.estorbo !== null);
    if (!medidos.length) return;

    medidos.sort((a, b) => a.estorbo - b.estorbo);
    /*
     * Metro y medio: una plataforma vacía es plana y lo que sobresalga de eso
     * es una farola, un carro o un avión. Si el primero de la lista ya está
     * así de limpio, se queda — mover el arranque sin motivo desorienta a quien
     * ya conoce su aeropuerto.
     */
    const primero = medidos.find((m) => m.puesto === puestos[0]);
    if (primero && primero.estorbo <= 1.5) {
      this.puestoElegido = primero.estorbo;
      return;
    }
    /*
     * Y de los despejados, **el primero del que se pueda salir rodando**. Un
     * puesto sin ruta hasta el punto de espera no vale por muy limpio que
     * esté: el avión aparece allí y no hay raya verde que seguir. Es lo que
     * pasó al elegir bien el puesto por primera vez.
     */
    for (const { puesto, estorbo } of medidos) {
      if (puesto === puestos[0] || this.plan.reiniciarDesde(puesto.xy)) {
        this.puestoElegido = estorbo;
        return;
      }
    }
  }

  /** Lo que estorbaba en el puesto elegido, en metros. Para poder mirarlo. */
  private puestoElegido: number | null = null;
  /** Segundos desde el último intento de encontrar un puesto despejado. */
  private esperaDePuesto = 0;

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
    if (this.plan) {
      this.scene.remove(this.plan.grupo);
      this.plan = new PlanDeVuelo(this.scenario.aerodrome!, this.scenario.runway, (x, z) =>
        this.terrain.sampleHeight(x, z),
      );
      this.plan.soloRodaje = this.leccion.acabaEnLaEspera;
      this.scene.add(this.plan.grupo);
    }
    this.hud.mapa.rehacer(this.scenario);
    this.resetFlight();
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
    this.flight.reset({
      position: this.startPosition(),
      heading: MathUtils.degToRad(runway.heading),
      airspeed: VELOCIDAD_DE_FINAL,
    });
    this.input.controls.engineOn = true;
    this.input.controls.throttle = 0.45;
    this.faseAnunciada = '';
    this.runwayGuide.reset();
    this.landing.reset();
    this.crashedFor = 0;
    this.wasOnGround = false;
    this.wasStalled = false;
    this.wasCrashed = false;
    this.input.releaseAll();
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
    // El tope está en un cuarto de segundo y no en una décima.
    //
    // Con una décima, un aparato lento no perdía fotogramas: jugaba **a
    // cámara lenta**. A cuatro fotogramas por segundo cada uno dura 0,25 s
    // reales y el juego solo avanzaba 0,1, así que la simulación corría al
    // cuarenta por ciento y el avión tardaba el doble en todo. El modelo de
    // vuelo ya subdivide internamente a 240 Hz, así que un dt grande es
    // seguro; lo único que hay que evitar es el salto enorme al volver de
    // una pestaña en segundo plano, y de eso se encarga `visibilitychange`.
    const dt = Math.min(this.clock.getDelta(), 0.25);

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
      Math.abs(ejes.along) < r.length / 2 + 30 && Math.abs(ejes.across) < r.width / 2 + 6,
    );

    this.input.update(dt);
    // El piloto de pruebas hace de teclado, así que va donde va el teclado: y
    // **la ayuda va después de quien pilota**, no antes. Puestas al revés, el
    // mando del jugador borraba la asistencia y los cuatro peldaños daban
    // exactamente el mismo número.
    this.pilotoDePruebas?.(this.input.controls);
    this.asistirRodaje(dt);
    if (this.flight.state.crashed) {
      // Vuelve solo a la pista. La alternativa —dejar el avión roto hasta
      // que alguien pulse una tecla— exige leer un mensaje, y quien juega
      // puede tener cuatro años. La tecla sigue estando para quien la use.
      this.crashedFor += dt;
      if (this.crashedFor > CRASH_RESET_DELAY) this.resetFlight();
    } else {
      this.flight.step(dt, this.input.controls);
    }

    this.missionMarker.update(dt);
    this.runwayGuide.update(dt);
    // Cruzar un aro de la senda se celebra: destello, salto de escala y una
    // nota. Es la respuesta visual que pedía cualquiera que no sepa leer.
    if (this.runwayGuide.check(this.flight.state.position)) this.audio.cue('success');
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
        if (Math.abs(s.position.x) > borde * 0.7 || Math.abs(s.position.z) > borde * 0.7) {
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
        this.terrain.ponerSueloLejano((x, z) => this.teselas?.cotaLejana(x, z) ?? null);
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
        for (let i = 0; i < 2; i++) bultos += this.terrain.alisarPicos([0, 0], 6000, 6);
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
        this.buscarPuestoLibre();
        this.ponerAproximacion();
        if (escritos > 0) this.recolocarTrasElMoldeado();
      }
      /*
       * El puesto, hasta que se pueda medir de verdad.
       *
       * En el momento de moldear, las teselas de la plataforma pueden seguir
       * siendo gruesas, y sobre teselas gruesas no hay avión que valga: todo
       * sale despejado. Medido a los noventa segundos, los cuatro primeros
       * puestos de Tenerife dan entre tres y siete metros de estorbo —son los
       * que tienen aviones de línea aparcados— y en el moldeado no daban nada.
       *
       * **Solo mientras no se haya empezado a volar.** Mover el avión de sitio
       * a alguien que ya está rodando es peor que dejarlo mal puesto.
       */
      if (this.puestoElegido === null && !this.input.controls.engineOn && this.flight.state.airspeed <= 0.5) {
        this.esperaDePuesto += dt;
        if (this.esperaDePuesto >= 2) {
          this.esperaDePuesto = 0;
          this.buscarPuestoLibre();
          if (this.puestoElegido !== null) this.recolocarTrasElMoldeado();
        }
      }

      // Y los edificios, en cuanto la ciudad se vea con suficiente detalle para
      // poder decir si están o no. Puede ser ahora o puede ser a mil pies.
      if (!this.ciudadSobreLaFoto) {
        this.esperaDeCiudad += dt;
        if (this.esperaDeCiudad >= 3) {
          this.esperaDeCiudad = 0;
          void this.levantarCiudadSobreLaFoto();
        }
      }
    }
    this.advanceMission();
    this.announce(this.flight.state);
    // La bocina avisa al 85 % del ángulo crítico de esta aeronave concreta,
    // que es donde la ponen los fabricantes.
    this.audio.update(this.flight.state, this.input.controls, this.aircraft.aero.alphaStall * 0.85);
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
    this.hud.mapa.update(
      this.flight.state.position.x,
      this.flight.state.position.z,
      this.flight.state.heading,
    );
    this.hud.update(
      this.flight.state,
      this.input.controls.throttle,
      dt,
      this.input.controls.brakes,
      this.aircraft.decisionSpeed,
      this.runwayRemaining(),
      this.input.controls.engineOn,
    );
    this.checkLanding();
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
    this.hud.senal.update(dt);

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Rumbo y distancia a la cabecera de pista, en coordenadas del piloto.
   *
   * Se apunta a la cabecera y no al centro de la pista porque es por donde
   * se entra: seguir la aguja lleva al principio del asfalto, alineado, que
   * es exactamente donde uno quiere aparecer.
   */
  /** Metros hasta la cabecera de pista, mire donde mire la aguja. */
  private distanceToRunway(): number {
    const [tx, tz] = this.enLaPista(this.scenario.runway.length * 0.5);
    return Math.hypot(tx - this.flight.state.position.x, tz - this.flight.state.position.z);
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
  private asistirRodaje(dt: number): void {
    void dt;
    const fuerza = this.tier.assists.taxiAssist;
    if (!this.plan || fuerza <= 0) return;
    const s = this.flight.state;
    if (!s.onGround) return;

    const suelo = s.position.y - this.terrain.sampleHeight(s.position.x, s.position.z);
    const sugerido = this.plan.asistencia(s, suelo);
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
    const suelo = this.flight.state.position.y - this.terrain.sampleHeight(
      this.flight.state.position.x,
      this.flight.state.position.z,
    );
    const vista = this.plan.paso(
      this.flight.state,
      suelo,
      this.input.controls.engineOn,
      dt,
    );

    // La lámpara de la torre solo tiene sentido en tierra y antes de despegar:
    // es lo que se mira desde el punto de espera. En el aire no hay lámpara que
    // mirar, y dejarla encendida decía algo que ya no era verdad.
    const enTierraEsperando =
      this.leccion.torre &&
      (vista.fase === 'esperando' || vista.fase === 'autorizado' || vista.fase === 'alineando');
    this.hud.setLuzDeTorre(
      !enTierraEsperando ? null : vista.fase === 'esperando' ? 'roja' : vista.luzVerde ? 'verde' : null,
    );

    // Mientras manda el plan, el tutor calla. Vuelve al alinearse, que es
    // cuando toca despegar y el tutor sí sabe de eso.
    const rodaje =
      vista.fase === 'estacionado' ||
      vista.fase === 'arrancando' ||
      vista.fase === 'rodando' ||
      vista.fase === 'esperando' ||
      vista.fase === 'autorizado' ||
      vista.fase === 'abandonando' ||
      vista.fase === 'a-plataforma' ||
      vista.fase === 'en-puesto' ||
      vista.fase === 'apagado';
    this.hud.tutor.silenciar(rodaje);

    // **En el peldaño de los pequeños, ni una palabra.** No leen, así que un
    // cartel de texto es un cartel en blanco que además tapa el mundo. Ahí
    // manda la luz de la torre y la raya verde del suelo, que se entienden sin
    // saber leer; el instructor de voz vendrá a llenar este hueco.
    const conLetras = this.tier.instruments !== 'none';

    if (vista.fase !== this.faseAnunciada) {
      this.faseAnunciada = vista.fase;
      // Al lado del mensaje va **la tecla**, cuando la fase pide una. «Arrancá
      // el motor» no le sirve de nada a quien no sabe cuál es el motor.
      const tecla =
        vista.fase === 'estacionado' || vista.fase === 'en-puesto'
          ? ` · ${nombreDeTecla(this.input.preferredKey('engine'))}`
          : vista.fase === 'esperando' || vista.fase === 'aterrizado'
            ? ` · ${nombreDeTecla(this.input.preferredKey('brakes'))}`
            : '';
      /*
       * **En la lección de aterrizar, volar no es el premio: es el camino.**
       *
       * La fase «en vuelo» dice «andá a dar una vuelta», que es lo que toca
       * cuando se acaba de despegar y el mundo es tuyo. Pero quien eligió
       * aprender a aterrizar aparece ya volando y a tres kilómetros de la
       * cabecera: decirle que se dé una vuelta es mandarlo al sitio contrario.
       */
      const clave =
        this.leccion.id === 'aterrizaje' && vista.fase === 'en-vuelo'
          ? 'vuelo.enVueloAterrizando'
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
      const pendiente = vista.fase === 'estacionado' || vista.fase === 'en-puesto';
      const esperando = vista.fase === 'esperando';
      this.hud.senal.mostrar(vista.icono, conLetras ? frase : '', vista.letra, {
        segundos: pendiente || esperando ? Infinity : vista.fase === 'apagado' ? 9 : 6,
        // La tecla, dibujada. Sin esto, en el peldaño sin palabras no había
        // ninguna manera de saber que el contacto es la I.
        tecla: pendiente
          ? nombreDeTecla(this.input.preferredKey('engine'))
          : esperando
            ? nombreDeTecla(this.input.preferredKey('brakes'))
            : null,
        // Y la tarjeta **hace** lo que dice al tocarla. En una tablet no había
        // ninguna forma de arrancar el motor: los mandos táctiles son palanca,
        // timón, gas y freno, y el contacto no estaba por ningún lado.
        accion: pendiente ? () => this.toggleEngine() : null,
      });
      this.instructor.decir(frase);
      if (conLetras) {
        this.hud.flash(`${frase}${tecla}${vista.letra ? ` · ${vista.letra}` : ''}`, 5);
      }
      if (vista.fase === 'autorizado' || vista.fase === 'apagado') this.audio.cue('success');
    } else if (vista.rapido && this.plan.avisarDeSalida(dt)) {
      // **«¿Quién me indica si voy muy rápido o lento en rodadura?»** Nadie, y
      // esa era la respuesta honesta: el indicador de tortuga y pájaro está
      // calibrado para velocidad de vuelo, así que rodando se queda clavado en
      // la tortuga sin decir nada. Ahora lo dice la raya —que se pone ámbar y
      // roja donde hay que aflojar— y además se avisa.
      this.hud.senal.mostrar('freno', conLetras ? t('vuelo.despacio') : '', vista.letra, {
        segundos: 3.5,
      });
      this.instructor.decir(t('vuelo.despacio'));
    } else if (vista.fuera && this.plan.avisarDeSalida(dt)) {
      this.hud.senal.mostrar('amarillo', conLetras ? t('vuelo.fuera') : '', vista.letra, {
        segundos: 4,
      });
      this.instructor.decir(t('vuelo.fuera'));
      if (conLetras) this.hud.flash(t('vuelo.fuera'), 3);
    }

    if (vista.saltoLaLuz) {
      // El sonido sí, siempre: es la mitad del aviso que no necesita leerse.
      this.audio.cue('attention');
      this.hud.senal.mostrar('mano', conLetras ? t('vuelo.sinPermiso') : '', null, { segundos: 7 });
      this.instructor.decir(t('vuelo.sinPermiso'));
      if (conLetras) this.hud.flash(t('vuelo.sinPermiso'), 7);
    }
  }

  private updateHomeIndicator(): void {
    const [thresholdX, thresholdZ] = this.enLaPista(this.scenario.runway.length * 0.5);

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
    const ground = this.terrain.sampleSurface(state.position.x, state.position.z);
    const height = Math.max(0, state.position.y - ground);
    // Se ve hasta cuatrocientos metros. Antes se apagaba a doscientos veinte
    // y desaparecía justo cuando empezaba a ser útil como referencia de que
    // se está ganando altura.
    const fade = Math.max(0, 1 - height / 400);

    this.blobShadow.visible = fade > 0.02;
    if (!this.blobShadow.visible) return;

    this.blobShadow.position.set(state.position.x, ground + 0.4, state.position.z);
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

    if (this.cameraMode === 'cockpit') {
      // Desde dentro no hay suavizado: la cámara es la cabeza del piloto y
      // va rígidamente unida al avión.
      this.offset.set(0, this.aircraft.chord * 0.55, -this.aircraft.chord * 0.4);
      this.offset.applyQuaternion(state.orientation);
      this.camera.position.copy(state.position).add(this.offset);
      this.camera.quaternion.copy(state.orientation);
      return;
    }

    if (this.cameraMode === 'wing') {
      this.offset.set(this.aircraft.wingSpan * 0.9, this.aircraft.chord * 1.4, this.aircraft.wingSpan * 0.5);
    } else {
      // Más alta y algo más atrás que en la primera versión: estaba a la
      // altura del avión y el fuselaje tapaba justo el centro de la pantalla,
      // que es donde uno quiere mirar para saber adónde va.
      this.offset.set(0, this.aircraft.wingSpan * 0.52, this.aircraft.wingSpan * 1.5);
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
    const floor = this.terrain.sampleSurface(this.desiredCamera.x, this.desiredCamera.z) + 3;
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
    this.desiredCamera.y += amount * (Math.sin(t * 41) * 0.5 + Math.sin(t * 17.3) * 0.3 + bump * 1.4);
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
      this.reducedMotion || this.cameraMode === 'cockpit'
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
    this.cameraMode = CAMERA_MODES[(index + 1) % CAMERA_MODES.length] ?? 'chase';
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
    const ground = (x: number, z: number): number => this.terrain.sampleSurface(x, z);
    return tier.model === 'simple'
      ? new ArcadeFlightModel({ aircraft: this.aircraft, ground })
      : new CoefficientFlightModel({ aircraft: this.aircraft, ground, assist: tier.assists });
  }

  /**
   * Cambia de aeronave.
   *
   * Hasta ahora la flota existía en el código y no había forma de llegar a
   * ella: se volaba siempre la misma avioneta. Se cambia en tierra o en el
   * aire, y el avión nuevo aparece donde estaba el anterior.
   */
  private cycleAircraft(): void {
    const next = AIRCRAFT[(AIRCRAFT.indexOf(this.aircraft) + 1) % AIRCRAFT.length] ?? OGA_172;
    const { position, heading, airspeed } = this.flight.state;
    const carried = { position: position.clone(), heading, airspeed };

    this.aircraft = next;
    this.audio.setEngine(next.sound);

    this.scene.remove(this.aircraftMesh.group);
    this.aircraftMesh = createAircraftMesh(next);
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
    const next = TIERS[(TIERS.indexOf(this.tier) + 1) % TIERS.length] ?? GUYRAMI;
    const { position, heading, airspeed } = this.flight.state;
    const carried = { position: position.clone(), heading, airspeed };

    this.tier = next;
    rememberTier(next);
    this.flight = this.buildFlightModel(next);
    this.flight.reset(carried);

    this.hud.setUnits(next.units);
    this.hud.setInstruments(next.instruments);
    this.keyScreen?.setSimple(next.instruments === 'none' || next.instruments === 'pictorial');
    this.updateBadge();
    this.hud.flash(`${next.name} · ${next.ages}`, 3);
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
      this.audio.cue(state.touchdownSinkRate > 2.5 ? 'error' : 'touchdown');
    }
    if (!state.onGround && this.wasOnGround && !state.crashed) {
      this.audio.cue('achieved');
    }
    if (state.stalled && !this.wasStalled) this.audio.cue('attention');
    if (state.crashed && !this.wasCrashed) this.audio.cue('error');

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

    this.missionIndex = this.missionIndex + 1 >= available.length ? -1 : this.missionIndex + 1;
    const mission = available[this.missionIndex];

    if (!mission) {
      this.missions.abandon();
      this.hud.setMissionProgress(null);
      this.hud.flash(t('mission.none'), 3);
    } else {
      this.missions.start(mission);
      this.hud.setMissionProgress(this.missions.progress);
      this.hud.flash(t('mission.started', { name: t(mission.nameKey) }), 4);
      this.audio.cue('attention');
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
      this.audio.cue('achieved');
      this.hud.flash(t('mission.done'), 5);
    } else {
      this.audio.cue('success');
      this.hud.flash(t('mission.step'), 2);
    }
  }

  private updateMissionMarker(): void {
    const objective = this.missions.current;
    const target = objective ? objectiveTarget(objective) : null;
    this.missionMarker.moveTo(target, target ? this.terrain.sampleSurface(target.x, target.z) : 0);
  }

  private toggleSound(): void {
    const level = this.audio.cycleLevel();
    this.hud.setSoundLevel(level.glyph, t(`sound.${level.id}` as never));
    this.hud.flash(t(`sound.${level.id}` as never));
  }

  /** Pasa al siguiente idioma y repinta todo lo que lleva texto. */
  private changeLanguage(): void {
    const locale = cycleLocale();
    this.hud.render();
    this.credits = new CreditsScreen(this.creditsRoot, this.flight.implementationName);

    this.updateBadge();
    this.hud.flash(t('language.changed', { name: LOCALE_NAMES[locale] }));
  }

  private updateBadge(): void {
    this.hud.setBadge(
      `${this.aircraft.name} · ${t(this.scenario.nameKey as never)} · ${this.tier.name}`,
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
  mesh.name = 'sombra';
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
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(20,32,26,1)');
  gradient.addColorStop(0.55, 'rgba(20,32,26,0.72)');
  gradient.addColorStop(1, 'rgba(20,32,26,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export type { FlightModel };
