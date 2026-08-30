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
  Clock,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CoefficientFlightModel } from './flight/fdm';
import { OGA_172, type AircraftConfig } from './flight/aircraft';
import { InputManager } from './flight/input';
import type { FlightModel } from './flight/model';
import { Terrain } from './world/terrain';
import { createSky, updateSky, type SkyRig } from './world/sky';
import { createAircraftMesh, type AircraftMesh } from './world/aircraft-mesh';
import { VALLE_CORDILLERA, type Scenario } from './world/scenarios';
import { Hud } from './ui/hud';
import { CreditsScreen } from './ui/credits';
import { LOCALE_NAMES, cycleLocale, t } from './i18n';

/** Vistas disponibles, en el orden en que rota la tecla C. */
const CAMERA_MODES = ['chase', 'cockpit', 'wing'] as const;
type CameraMode = (typeof CAMERA_MODES)[number];

/** Segundos que se ve el avión roto antes de volver solo a la pista. */
const CRASH_RESET_DELAY = 3.5;

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
  private readonly aircraftMesh: AircraftMesh;
  private readonly aircraft: AircraftConfig;
  private readonly scenario: Scenario;
  private readonly flight: CoefficientFlightModel;
  private readonly input: InputManager;
  private readonly hud: Hud;
  private credits: CreditsScreen;
  private readonly creditsRoot: HTMLElement;

  private cameraMode: CameraMode = 'chase';
  private propellerAngle = 0;
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

    this.aircraftMesh = createAircraftMesh(this.aircraft);
    this.scene.add(this.aircraftMesh.group);

    this.flight = new CoefficientFlightModel({
      aircraft: this.aircraft,
      // El avión flota sobre el agua en vez de hundirse: es un juego para
      // chicos, y amerizar de morro y desaparecer no le divierte a nadie.
      ground: (x, z) => this.terrain.sampleSurface(x, z),
      assist: 1,
    });

    this.hud = new Hud(options.hudRoot);
    this.creditsRoot = options.creditsRoot;
    this.credits = new CreditsScreen(this.creditsRoot, this.flight.implementationName);

    this.input = new InputManager(options.touchRoot, {
      toggleCamera: () => this.cycleCamera(),
      toggleAssist: () => this.toggleAssist(),
      resetFlight: () => this.resetFlight(),
      toggleCredits: () => this.credits.toggle(),
      cycleLanguage: () => this.changeLanguage(),
    });

    window.addEventListener('resize', this.onResize);
    this.onResize();
    this.resetFlight();
    this.hud.flash(t('help.start'), 6);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(this.frame);
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.terrain.dispose();
    this.renderer.dispose();
  }

  /** Coloca el avión al principio de la pista, parado y con el motor al ralentí. */
  resetFlight(): void {
    const { runway } = this.scenario;
    const heading = MathUtils.degToRad(runway.heading);
    // Retrocede media pista a lo largo del eje para arrancar en la cabecera.
    const start = new Vector3(
      runway.x - Math.sin(heading) * runway.length * 0.42,
      this.terrain.runwayElevation + this.aircraft.gearHeight,
      runway.z - Math.cos(heading) * runway.length * 0.42,
    );

    this.flight.reset({ position: start, heading, airspeed: 0 });
    this.crashedFor = 0;
    this.input.controls.throttle = 0;
    this.updateBadge();
  }

  // ── Bucle ─────────────────────────────────────────────────────────────

  private frame = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.1);

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

    this.syncAircraftMesh(dt);
    this.updateCamera(dt);
    updateSky(this.sky, this.camera.position);
    this.hud.update(this.flight.state, this.input.controls.throttle, dt);

    this.renderer.render(this.scene, this.camera);
  };

  private syncAircraftMesh(dt: number): void {
    const state = this.flight.state;
    this.aircraftMesh.group.position.copy(state.position);
    this.aircraftMesh.group.quaternion.copy(state.orientation);

    // La hélice gira con el motor. No se intenta reproducir las rpm reales:
    // se busca que se vea girar y que el ritmo suba al acelerar.
    this.propellerAngle += dt * (6 + this.input.controls.throttle * 96);
    this.aircraftMesh.propeller.rotation.z = this.propellerAngle;
  }

  private updateCamera(dt: number): void {
    const state = this.flight.state;

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
      this.offset.set(this.aircraft.wingSpan * 0.9, this.aircraft.chord * 0.9, this.aircraft.wingSpan * 0.5);
    } else {
      this.offset.set(0, this.aircraft.wingSpan * 0.32, this.aircraft.wingSpan * 1.35);
    }
    this.offset.applyQuaternion(state.orientation);
    this.desiredCamera.copy(state.position).add(this.offset);

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
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  private cycleCamera(): void {
    const index = CAMERA_MODES.indexOf(this.cameraMode);
    this.cameraMode = CAMERA_MODES[(index + 1) % CAMERA_MODES.length] ?? 'chase';
  }

  /**
   * Cambia entre Arcade y Piloto.
   *
   * El modo arrastra consigo las unidades: en Arcade, km/h y metros; en
   * Piloto, nudos y pies, que es lo que marca un avión de verdad. Son dos
   * cosas distintas bajo un solo interruptor a propósito — quien decide que
   * quiere volar en serio se encuentra con las unidades de verdad en el
   * mismo gesto, sin tener que descubrir un segundo ajuste.
   */
  private toggleAssist(): void {
    const arcade = this.flight.assist <= 0.5;
    this.flight.assist = arcade ? 1 : 0;
    this.hud.setUnits(arcade ? 'metric' : 'aeronautical');
    this.updateBadge();
    this.hud.flash(
      t('mode.changed', { mode: this.flight.assist > 0.5 ? t('mode.arcade') : t('mode.pilot') }),
    );
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
    const mode = this.flight.assist > 0.5 ? t('mode.arcade') : t('mode.pilot');
    this.hud.setBadge(`${this.aircraft.name} · ${t(this.scenario.nameKey as never)} · ${mode}`);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
}

export type { FlightModel };
