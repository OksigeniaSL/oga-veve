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
  MathUtils,
  Mesh,
  MeshBasicMaterial,
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
import { Terrain } from './world/terrain';
import { createSky, updateSky, type SkyRig } from './world/sky';
import { createAircraftMesh, type AircraftMesh } from './world/aircraft-mesh';
import { RunwayGuide } from './world/runway-guide';
import { createVegetation } from './world/vegetation';
import { MissionMarker } from './world/mission-marker';
import { MissionRunner } from './missions/runner';
import { objectiveTarget } from './missions/types';
import { missionsFor } from './content/missions';
import { VALLE_CORDILLERA, type Scenario } from './world/scenarios';
import { Hud } from './ui/hud';
import { CreditsScreen } from './ui/credits';
import { nombreDeTecla } from './flight/keymap';
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
}

export class Game {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly clock = new Clock();

  private readonly terrain: Terrain;
  private readonly sky: SkyRig;
  private aircraftMesh: AircraftMesh;
  private aircraft: AircraftConfig;
  private readonly scenario: Scenario;
  private flight: FlightModel;
  private tier: Tier = rememberedTier();
  private readonly input: InputManager;
  private readonly audio = new Audio();
  private readonly missions = new MissionRunner();
  private readonly missionMarker = new MissionMarker();
  private readonly runwayGuide: RunwayGuide;
  /** Índice de la misión de la lista del escenario, o -1 en vuelo libre. */
  private missionIndex = -1;
  private readonly hud: Hud;
  private credits: CreditsScreen;
  private readonly creditsRoot: HTMLElement;
  private keyScreen: KeyScreen | null = null;

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
    this.aircraft = options.aircraft ?? OGA_172;

    this.renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    // Tope de 2: por encima no se distingue y en una tablet cuesta la mitad
    // de los fotogramas. Ver AGENTS.md, regla de rendimiento.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new PerspectiveCamera(62, 1, 0.6, this.scenario.size * 1.6);

    this.terrain = new Terrain(this.scenario);
    this.scene.add(this.terrain.group);

    this.sky = createSky(this.scenario);
    this.scene.add(this.sky.group);
    this.scene.fog = this.sky.fog;

    this.scene.add(createVegetation(this.scenario, (x, z) => this.terrain.sampleHeight(x, z)));

    this.runwayGuide = new RunwayGuide(
      this.scenario,
      this.terrain.runwayElevation,
      (x: number, z: number) => this.terrain.sampleSurface(x, z),
    );
    this.scene.add(this.runwayGuide.group);

    this.aircraftMesh = createAircraftMesh(this.aircraft);
    this.scene.add(this.aircraftMesh.group);

    this.blobShadow = createBlobShadow(this.aircraft.wingSpan);
    this.scene.add(this.blobShadow);
    this.scene.add(this.missionMarker.group);

    this.flight = this.buildFlightModel(this.tier);

    this.hud = new Hud(options.hudRoot);
    this.hud.setInstruments(this.tier.instruments);
    this.hud.setUnits(this.tier.units);
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
    this.hud.flash(`${t('help.start')} · ${t('help.assist')}`, 8);
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
  private startPosition(heading: number): Vector3 {
    const { runway, aerodrome } = this.scenario;
    let x = runway.x - Math.sin(heading) * runway.length * 0.42;
    let z = runway.z - Math.cos(heading) * runway.length * 0.42;

    const pista = aerodrome?.runways[0];
    if (pista) {
      // El umbral por el que se despega con este rumbo, y unos metros dentro
      // de la pista para no arrancar pisando la raya.
      const umbral = Object.values(pista.thresholds).find(
        (u) => u?.xy != null && Math.abs(((u.headingTrue ?? 0) - runway.heading + 540) % 360 - 180) < 20,
      );
      if (umbral?.xy) {
        // La Y del fichero apunta al norte y aquí el norte es la Z negativa.
        const [ux, uy] = umbral.xy;
        x = ux + Math.sin(heading) * 60;
        z = -uy - Math.cos(heading) * 60;
      }
    }

    return new Vector3(x, this.terrain.sampleHeight(x, z) + this.aircraft.gearHeight, z);
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
    const rad = (r.heading * Math.PI) / 180;
    // Ejes de la pista: a lo largo y a lo ancho.
    const ax = Math.sin(rad);
    const az = -Math.cos(rad);
    const dx = p.x - r.x;
    const dz = p.z - r.z;
    const along = dx * ax + dz * az;
    const across = Math.abs(dx * -az + dz * ax);
    if (across > r.width) return Infinity;
    if (Math.abs(along) > r.length / 2) return Infinity;

    // Hacia dónde va el avión respecto al eje de la pista.
    const heading = this.flight.state.heading;
    const hacia = Math.sin(heading) * ax + -Math.cos(heading) * az;
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
    const heading = MathUtils.degToRad(runway.heading);
    const start = this.startPosition(heading);

    this.flight.reset({ position: start, heading, airspeed: 0 });
    if (this.missions.active) {
      this.missions.start(this.missions.active);
      this.hud.setMissionProgress(this.missions.progress);
      this.updateMissionMarker();
    }
    this.runwayGuide.reset();
    this.crashedFor = 0;
    this.wasOnGround = true;
    this.wasStalled = false;
    this.wasCrashed = false;
    this.input.releaseAll();
    this.hud.tutor.reset();
    this.updateBadge();
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

    this.input.update(dt);
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
    this.advanceMission();
    this.announce(this.flight.state);
    // La bocina avisa al 85 % del ángulo crítico de esta aeronave concreta,
    // que es donde la ponen los fabricantes.
    this.audio.update(this.flight.state, this.input.controls, this.aircraft.aero.alphaStall * 0.85);
    this.hud.update(
      this.flight.state,
      this.input.controls.throttle,
      dt,
      this.input.controls.brakes,
      this.aircraft.decisionSpeed,
      this.runwayRemaining(),
      this.input.controls.engineOn,
    );
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
    const { runway } = this.scenario;
    const heading = MathUtils.degToRad(runway.heading);
    return Math.hypot(
      runway.x - Math.sin(heading) * runway.length * 0.5 - this.flight.state.position.x,
      runway.z - Math.cos(heading) * runway.length * 0.5 - this.flight.state.position.z,
    );
  }

  private updateHomeIndicator(): void {
    const { runway } = this.scenario;
    const heading = MathUtils.degToRad(runway.heading);
    const thresholdX = runway.x - Math.sin(heading) * runway.length * 0.5;
    const thresholdZ = runway.z - Math.cos(heading) * runway.length * 0.5;

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
