/**
 * HUD: los cinco números que hacen falta para volar y nada más.
 *
 * AVISO PARA QUIEN EDITE ESTE FICHERO: nada de acentos graves dentro de los
 * comentarios HTML de las plantillas. Un acento grave cierra la plantilla y
 * el fichero deja de compilar con un error que señala a otro sitio. Ha
 * pasado tres veces.
 *
 * Es DOM y CSS, no canvas. Un canvas obligaría a redibujar texto a mano, a
 * pelearse con el dpi de cada pantalla y a reimplementar la accesibilidad.
 * El navegador ya sabe pintar texto nítido; que lo haga él.
 *
 * Cada instrumento se rotula dos veces. Arriba, la abreviatura aeronáutica
 * real —IAS, ALT, HDG, V/S, THR—, que es la misma en todo el mundo y en
 * todos los idiomas, exactamente como en una cabina de verdad. Debajo, en
 * pequeño, la palabra corriente en el idioma activo. Quien todavía no lee
 * se guía por la posición y el tamaño del número; quien empieza a leer lee
 * la palabra; y para cuando lea bien, ya conoce la abreviatura que va a
 * encontrarse el día que se suba a un avión. Ver AGENTS.md, regla 3.
 *
 * Las unidades siguen al modo de vuelo, no a un ajuste aparte: en Arcade se
 * ve km/h y metros, y en Piloto nudos y pies, que es lo que marca un
 * altímetro real. Así el paso a las unidades de verdad llega cuando alguien
 * decide que quiere volar en serio, y no antes.
 */

import type { FlightState } from "../flight/model";
import type { AudioLevel } from "../audio/audio";
import { indicatedAirspeed, velocidadDelSonido } from "../flight/atmosphere";
import { t, type TranslationKey } from "../i18n";
import { leerTexto, ponerTexto } from "../datos/guardado";
import { cuantaLuz } from "../world/hora";
import { Tutor } from "./tutor";
import { bankAngleOf, pitchAngleOf } from "./actitud";
import type { Accion } from "../flight/keymap";
import { peldanoDe } from "./familia";
import type { Mapa as MapaDeLaCarta } from "./carta";
import { Tablero } from "./tablero";
import type { Estado as EstadoDeAvisos } from "../flight/avisos-de-cabina";
import { regimen } from "./cuadro";
import { comoSeDiceAqui, type Habla } from "../i18n/habla";
import { PYKASU, esDeChorro, type AircraftConfig } from "../flight/aircraft";
import { Pictogramas, motorMas, motorMenos } from "./pictogramas";
import { DIBUJOS, Senal } from "./senal";
import { OJO } from "./teclas";
import { luzDeTren } from "../flight/tren";
import { Mapa } from "./mapa";
import type { Scenario } from "../world/scenarios";
import { botonesDeLosPaneles } from "./paneles";
import { PanelDelTiempo } from "./tiempo";
import type { Tier } from "../flight/tiers";
import { canalesDe, type Peldano } from "../flight/escalera";
import type { Galon } from "../flight/galones";
import { manga as dibujarManga, MANGA_ALTO } from "./manga";
import { reconocer } from "../flight/reconocimiento";
import { aPxDelHud, escribirRincon } from "./escala";
import { avisaLaPerdida } from "../flight/avisos-de-actitud";

/**
 * Rótulos de instrumento. No se traducen a propósito: son los mismos en
 * cualquier cabina del mundo, y aprenderlos es parte de lo que el juego
 * enseña sin proponérselo.
 */
/**
 * Lo que dura un destello de pantalla, en segundos. Ver `destellar`.
 *
 * Y sirve para dos cosas: para que la animación no se pise a sí misma y para
 * que dos destellos seguidos —V1 y Vr, que en una avioneta van a un segundo
 * uno del otro— salgan uno después del otro y no encima.
 */
const DURA_EL_DESTELLO = 1.6;

/** Lo que dura la salida del botón de freno al pasar V1, en segundos. */
const BRAKE_EXIT = 0.9;

const INSTRUMENTS = {
  speed: "IAS",
  vspeed: "V/S",
  altitude: "ALT",
  heading: "HDG",
  throttle: "THR",
  brakes: "BRK",
} as const;

/** Conversión y rótulo de unidades para un sistema de medida. */
interface UnitSystem {
  /** Velocidad indicada, desde m/s. */
  speed: (metresPerSecond: number) => number;
  speedLabel: () => string;
  /** Altitud, desde metros. */
  altitude: (metres: number) => number;
  altitudeLabel: () => string;
  /** Velocidad vertical, desde m/s. */
  vspeed: (metresPerSecond: number) => number;
  vspeedLabel: () => string;
  /** Decimales de la velocidad vertical: los pies por minuto son enteros. */
  vspeedDecimals: number;
}

const METRIC: UnitSystem = {
  speed: (v) => v * 3.6,
  speedLabel: () => t("units.kmh"),
  altitude: (h) => h,
  altitudeLabel: () => t("units.metres"),
  vspeed: (v) => v,
  vspeedLabel: () => t("units.mps"),
  vspeedDecimals: 1,
};

/** Nudos, pies y pies por minuto. Lo que marca un avión de verdad. */
const AERONAUTICAL: UnitSystem = {
  speed: (v) => v * 1.943844,
  speedLabel: () => t("units.knots"),
  altitude: (h) => h * 3.28084,
  altitudeLabel: () => t("units.feet"),
  vspeed: (v) => v * 196.8504,
  vspeedLabel: () => t("units.fpm"),
  vspeedDecimals: 0,
};


/**
 * El cartel del cinturón: **una persona sentada de frente, con el cinturón
 * cruzándole la cintura y la hebilla en medio.**
 *
 * Es el dibujo del cartel de cabina de verdad. El primero era una U con un
 * rectángulo debajo que quería ser la hebilla y se leía como un tenedor. El
 * segundo, una persona sentada de perfil con una raya en el regazo: a
 * veinticuatro píxeles el perfil se perdía y quedaba un grifo con su chorro.
 *
 * De frente se lee sin querer: cabeza, hombros, piernas, y una banda que va de
 * lado a lado y **sobresale** del cuerpo —eso es lo que la hace cinturón y no
 * una prenda—, separada del tronco y de las piernas por un hueco para que no
 * se funda con ellos. La hebilla es un marco con su agujero, que es lo que es.
 */
const CINTURON = `
  <circle cx="12" cy="4" r="2.7" fill="currentColor"/>
  <path d="M6.6 12 V10 a2.8 2.8 0 0 1 2.8-2.8 h5.2 a2.8 2.8 0 0 1 2.8 2.8 V12 Z"
        fill="currentColor"/>
  <path d="M7 16.6 h4 v5.2 H8.2 a1.2 1.2 0 0 1-1.2-1.2 Z M13 16.6 h4 v4
           a1.2 1.2 0 0 1-1.2 1.2 H13 Z" fill="currentColor"/>
  <path d="M2.6 14.3 H8.6 M15.4 14.3 H21.4" stroke="currentColor" stroke-width="2.4"
        stroke-linecap="round"/>
  <path fill-rule="evenodd" fill="currentColor"
        d="M9.2 12.3 h5.6 a0.8 0.8 0 0 1 .8.8 v2.4 a0.8 0.8 0 0 1-.8.8 H9.2
           a0.8 0.8 0 0 1-.8-.8 v-2.4 a0.8 0.8 0 0 1 .8-.8 Z
           M10.6 13.6 v1.4 h2.8 v-1.4 Z"/>
`;
export const UNIT_SYSTEMS = {
  metric: METRIC,
  aeronautical: AERONAUTICAL,
} as const;
export type UnitSystemName = keyof typeof UNIT_SYSTEMS;

/**
 * **El altavoz del sonido, con sus ondas.** Dos ondas es fuerte, una es bajo y
 * un aspa es callado: se lee contando, sin saber leer.
 *
 * Eran los emoji 🔊 🔉 🔇, y un emoji no es un dibujo del juego: lo pinta cada
 * sistema a su manera —en color, con su propio sombreado, en alguna tableta
 * como un recuadro vacío— y en la fila de botones era el único con otro
 * estilo. Aquí va del mismo trazo y el mismo color que sus vecinos.
 */
const altavoz = (resto: string): string => `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9.2 h3.6 L12 4.6 v14.8 L6.6 14.8 H3 Z" />
    <g fill="none" stroke="currentColor" stroke-width="2.2"
       stroke-linecap="round">${resto}</g>
  </svg>`;
const ALTAVOZ: Record<AudioLevel["id"], string> = {
  normal: altavoz(
    '<path d="M15.2 9 a4.2 4.2 0 0 1 0 6" /><path d="M18 6.2 a8.2 8.2 0 0 1 0 11.6" />',
  ),
  bajo: altavoz('<path d="M15.2 9 a4.2 4.2 0 0 1 0 6" />'),
  mudo: altavoz('<path d="M15.4 9.4 l5.2 5.2 M20.6 9.4 l-5.2 5.2" />'),
};

/**
 * **El hangar: la nave de techo curvo con su portón abierto.**
 *
 * La misma puerta tenía dos dibujos: en la barra de arriba un arco de trazo
 * fino, y en la pantalla del final una casita. Una casa es «volver a casa», que
 * aquí no es lo que pasa: se vuelve al hangar, que es como se llama la
 * pantalla. Ahora es uno, relleno y con el portón grande, que es lo que hace
 * que un hangar no sea una casa.
 */
const HANGAR = `
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path fill-rule="evenodd"
          d="M1.8 21 V12.6 A10.2 8.6 0 0 1 22.2 12.6 V21 Z
             M6.2 21 V13.4 h11.6 V21 Z" />
    <path d="M6.2 16.6 h11.6" stroke="currentColor" stroke-width="1.2"
          opacity="0.5" />
  </svg>`;

/** La mano abierta de parar. La misma que el botón de freno, a propósito. */
const MANO_PARAR = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 20 v-6 l-2.4-2.4 a1.4 1.4 0 0 1 2-2 L9.4 11.2 V4.6
             a1.3 1.3 0 0 1 2.6 0 v5 v-5.6 a1.3 1.3 0 0 1 2.6 0 V10
             v-4.4 a1.3 1.3 0 0 1 2.6 0 V14 a6 6 0 0 1-6 6 Z" />
  </svg>
`;

/** La flecha de seguir. */
const FLECHA_SEGUIR = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 L20 13 H15.4 V21 H8.6 V13 H4 Z" />
  </svg>
`;

/**
 * La manga con sus galones.
 *
 * No es una estrella y no es una medalla, y eso está elegido: una estrella es
 * la moneda de los juegos de móvil y trae consigo lo que trae, repetir hasta
 * sacar las tres. Esto es lo que lleva en la manga quien vuela.
 *
 * **Y no es un chevrón.** El primer intento eran uves invertidas de diecisiete
 * píxeles apiladas al lado de la insignia, y a tamaño real de pantalla dos de
 * ellas se leen exactamente como lo que se dijo al verlas: «las insignias
 * parecen las orejas de un murciélago». Además un chevrón es de sargento; un
 * galón de piloto son **barras horizontales alrededor del puño**, que es lo
 * que ya dibuja el hangar para los peldaños. Dos dibujos para la misma palabra
 * eran uno de más.
 *
 * Así que se dibuja la manga entera: el azul marino del uniforme —el único
 * sitio del juego con ese color, a propósito— con su puño, y las barras
 * apareciendo de abajo arriba. Una manga vacía no se enseña: hasta que no hay
 * un galón, no hay manga.
 */

/**
 * ¿Se juega con el dedo?
 *
 * Se pregunta una vez: el aparato no cambia a mitad de vuelo, y `matchMedia`
 * en cada fotograma es trabajo tirado.
 */
const ESTO_ES_TACTIL =
  typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

export class Hud {
  readonly tutor = new Tutor();
  readonly mapa = new Mapa();
  readonly tiempo = new PanelDelTiempo();
  private readonly root: HTMLElement;
  private units: UnitSystem = METRIC;
  /** Si ya se marcó V1 en esta carrera de despegue. Ver `update`. */
  private dijoV1 = false;
  /**
   * Si esto **ya es** una carrera de despegue, aunque ahora mismo parpadee.
   *
   * La condición de V1 era una conjunción de cuatro cosas —fase de despegue,
   * en la pista, por encima de la velocidad de decisión y con gas— mirada
   * fotograma a fotograma. Basta con que **una** de ellas parpadee justo en el
   * instante en que la aguja cruza V1 para perder el aviso, y entonces ya no
   * vuelve: el destello se marca una sola vez por carrera. Medido en el banco,
   * el mismo avión en el mismo aeropuerto lo canta en una tirada y no en la
   * siguiente, y pasa con la avioneta igual que con el 747. Se vio jugando:
   * «al despegar no me avisa del V1 ni VR ni nada».
   *
   * Y no es así como se canta una V1: se canta **cuando la aguja pasa**, no si
   * en ese fotograma se daban cuatro condiciones. Empezada la carrera, esto se
   * queda puesto hasta que la carrera acaba —se vuela, o el avión se para—, y
   * los dos avisos solo miran la velocidad.
   */
  private enLaCarrera = false;
  /**
   * En la carrera de despegue y pasado V1: ya no se frena, se vuela. Lo usa
   * el aviso de fin de pista, que no puede pedir frenar justo cuando el juego
   * enseña que ya no se frena. Ver `setWarning`.
   */
  private comprometido = false;

  /**
   * El aviso de terreno que decide el juego, el mismo que dice la voz.
   *
   * El HUD tenía el suyo: «menos de seis segundos para tocar el suelo». Y en
   * cualquier aterrizaje faltan menos de seis segundos para tocar el suelo,
   * que es de lo que se trata: en Gran Canaria salía «Ground. Pull up» en rojo
   * y parpadeando justo al posarse. El del juego ya sabe que sobre la pista y
   * puesto para aterrizar no se avisa —ver `flight/aviso-de-terreno.ts`—, así
   * que es ése, y hay uno solo.
   */
  private terreno: "sube" | "bajo" | null = null;

  ponerTerreno(terreno: "sube" | "bajo" | null): void {
    this.terreno = terreno;
  }

  /**
   * **Y el tutor calla lo que ya dice la orden.**
   *
   * Los dos se deciden por separado —la señal es la orden y el tutor su
   * explicación—, y a veces la explicación es la misma frase: en la carrera
   * de despegue salían dos tarjetas lado a lado diciendo «Tirá para arriba».
   * Dos veces lo mismo no es más claro, es más ruido. Cuando las dos frases
   * coinciden, se queda la orden.
   */
  noRepetirElTutor(): void {
    const tutor = this.root.querySelector<HTMLElement>('[data-hud="tutor"]');
    const suyo = tutor?.querySelector('[data-hud="tutor-text"]')?.textContent;
    const senal = this.root.querySelector<HTMLElement>('[data-hud="senal"]');
    const orden = senal?.querySelector('[data-hud="senal-texto"]')?.textContent;
    const repite =
      !!suyo &&
      !!orden &&
      !!senal &&
      !senal.hidden &&
      suyo.trim().toLowerCase() === orden.trim().toLowerCase();
    tutor?.classList.toggle("tutor--repetido", repite);
  }

  /** Lo que ve el detector de V1, para los bancos. Ver `sondas.ts`. */
  get sondaDeV1(): Record<string, number | boolean> {
    return {
      enLaCarrera: this.enLaCarrera,
      dijoV1: this.dijoV1,
      dijoVr: this.dijoVr,
      // Y si hay alguien escuchando, que es la pregunta que faltaba.
      hayQuienEscuche: this.velocidadesHandler !== null,
      vr: this.vr,
      destello: +this.destelloRestante.toFixed(2),
    };
  }
  /** Y si ya se marcó Vr, que va justo detrás. */
  private dijoVr = false;
  /** Velocidad de rotación de la aeronave de hoy, m/s. Ver `setAeronave`. */
  private vr = Infinity;
  /** Lo que le queda al destello de pantalla, s. Ver `destellar`. */
  private destelloRestante = 0;
  private cuadernoHandler: (() => void) | null = null;
  /** Quién se entera de que se ha pasado V1 o Vr. Ver `onVelocidades`. */
  private velocidadesHandler: ((cual: "V1" | "Vr") => void) | null = null;
  /** Quién vigila el alto de la barra. Ver `medirLaBarra`. */
  private barraObservada: ResizeObserver | null = null;
  /**
   * Cuántos instrumentos enseña el HUD.
   *
   * Es la mitad visible de la escalera de tramos: de ninguno a los cinco. Un
   * niño de cinco años no necesita saber su rumbo, y enseñárselo solo le
   * quita paisaje.
   */
  private instruments: Tier["instruments"] = "numeric";

  /**
   * En qué peldaño de la escalera de comunicación se está avisando.
   *
   * Va aparte de `instruments` porque son dos preguntas distintas —cuántos
   * instrumentos marca la cabina, y cómo se cuenta lo que pasa— y el aviso de
   * peligro se estaba escribiendo con la primera. Ver `flight/escalera.ts`.
   */
  private escalera: Peldano = "cifra";

  /**
   * El cuadro de mandos. Solo existe en el peldaño más alto: seis esferas son
   * ruido para quien todavía está aprendiendo a mantener el rumbo, y son *la
   * cabina* para quien ya vuela.
   *
   * Y no es el mismo cuadro en los seis aviones: un pistón lleva relojes, el
   * turbohélice cristal y los reactores la cabina de línea entera. Ver
   * `tablero.ts` y `familia.ts`.
   */
  private readonly tablero = new Tablero();
  /**
   * Cómo habla la torre de este aeródromo. Ver `i18n/habla.ts`.
   *
   * El cartel de la luz tiene que decir lo mismo que se oye, y lo que se oye
   * cambia con el sitio: en Tenerife la torre no vosea.
   */
  private habla: Habla = "paraguayo";
  /** Y la ficha entera, que es lo que sabe a cuánto gira su motor. */
  private ficha: AircraftConfig = PYKASU;

  /**
   * Los instrumentos del primer peldaño. Sin agujas y sin números: una
   * tortuga, un cerro y una hélice que gira.
   */
  private readonly pictos = new Pictogramas();
  readonly senal = new Senal();

  private speed: HTMLElement | null = null;
  private altitude: HTMLElement | null = null;
  private heading: HTMLElement | null = null;
  /** Grados que hay que sumar al rumbo verdadero para obtener el magnético. */
  private magneticVariation = 0;
  /** La tarjeta de la velocidad, para poder encenderla en la aproximación. */
  private tarjetaVelocidad: HTMLElement | null = null;
  private fps: HTMLElement | null = null;
  /**
   * Si se ha pedido el contador.
   *
   * Va como bandera y no como un `hidden` quitado a mano porque **el HUD se
   * vuelve a dibujar entero** cada vez que cambia el idioma o el peldaño, y
   * ahí el nodo se recrea con el `hidden` de la plantilla. Encenderlo una vez
   * no bastaba: al primer repintado desaparecía.
   */
  private conFps = false;
  /** Media móvil de fotogramas por segundo. Ver `mostrarFps`. */
  private fpsMedia = 0;
  private vspeed: HTMLElement | null = null;
  private throttleFill!: HTMLElement;
  /** El rótulo de reversa metida, si este peldaño lo enseña. */
  private reversaAviso!: HTMLElement | null;
  private brakes!: HTMLElement;
  private brakeKey!: HTMLElement;
  private brakesTouch!: HTMLElement;
  /** El botón del tren y el de los flaps, que solo existen desde fuera. */
  private trenTouch!: HTMLElement;
  private flapsTouch!: HTMLElement;
  /** A quién se le cuenta que se han pulsado. Ver `onMandoDeCabina`. */
  private alTocarMando: ((cual: "tren" | "flaps") => void) | null = null;

  /**
   * Si este avión tiene tren que meter.
   *
   * Sale de la ficha que el HUD ya tiene —la misma de la que sale el cuadro de
   * mandos— y no de un dato aparte que haya que acordarse de poner al día. Un
   * entrenador de escuela lleva las patas al aire y ahí no hay botón que
   * valga. Ver `trenRetractil` en `flight/aircraft.ts`.
   */
  private get hayTren(): boolean {
    return this.ficha.trenRetractil;
  }
  private brakeHandler: ((pressed: boolean) => void) | null = null;
  private throttleDown!: HTMLElement;
  private throttleUp!: HTMLElement;
  private throttleHandler: ((direction: number) => void) | null = null;

  /** Segundos que le quedan a la despedida del freno en V1. */
  private brakeExit = 0;
  private horizon: HTMLElement | null = null;
  private homeArrow!: HTMLElement;
  private homeDistance: HTMLElement | null = null;
  private homeGloss: HTMLElement | null = null;
  private homeOaci: HTMLElement | null = null;
  /**
   * El destino que está puesto en la tarjeta, para notar cuándo cambia. Ver
   * `setHome`.
   */
  private destinoPuesto: string | null = null;
  private home!: HTMLElement;
  private warning!: HTMLElement;
  private warningText!: HTMLElement;
  private warningArrow!: HTMLElement;
  private vignette!: HTMLElement;
  private badge!: HTMLElement;
  private galones!: HTMLElement;
  private fin!: HTMLElement;
  private progress!: HTMLElement;
  private sound!: HTMLElement;
  private hint!: HTMLElement;

  private badgeText = "";
  /** La última banda de velocidad, para poder pintarla en el pictograma. */
  private bandaActual: "lento" | "bien" | "rapido" | null = null;
  /**
   * La velocidad de aproximación de la aeronave que vuela hoy.
   *
   * Es la referencia de la escala del pictograma de velocidad. La pone el
   * juego al montar el avión: una avioneta y un biplano no se parecen en nada
   * aquí, y una escala fija los pintaba a los dos mal.
   */
  private vref = 33;
  /**
   * Lo más rápido que sabe volar el modelo de hoy, m/s.
   *
   * **Y hace falta, porque una escala que promete una velocidad imposible
   * miente.** El pájaro estaba a vez y seis décimas de la de aproximación —52,8
   * en el Pykasu— y el modelo sencillo no pasa de 37,2: a tope de gas la
   * marca se quedaba en el 41 % del recorrido y ahí se quedaba para siempre.
   * «A toda velocidad la señal entre la tortuga y el ave están a mitad», y era
   * literal: el ave estaba pintada en un sitio al que no se llega.
   */
  private vmax = Infinity;
  private galonesState: readonly Galon[] = [];
  private progressState: { done: number; total: number } | null = null;
  private soundState: { nivel: AudioLevel["id"]; label: string } = {
    nivel: "normal",
    label: "",
  };
  private soundHandler: (() => void) | null = null;
  private keysHandler: (() => void) | null = null;
  private camaraHandler: (() => void) | null = null;
  private gafasHandler: (() => void) | null = null;
  private gafas!: HTMLElement;
  private misionHandler: (() => void) | null = null;
  private mision!: HTMLElement;
  /**
   * Lo que hay que volver a poner después de cada `render()`.
   *
   * El HUD se rehace entero al cambiar de unidades o de idioma, y con el
   * marcado viejo se van **los oyentes y el estado**: un botón que nace
   * escondido vuelve a salir, y uno que alguien ató desde fuera se queda
   * muerto. El mapa y el tiempo ya se reataban aquí con ese motivo escrito al
   * lado; estos dos no existían entonces.
   *
   * Se vio con el panel de la misión: su botón seguía en pantalla y no abría
   * nada, y solo después de que el banco pasara por el ajuste de contraste
   * —que cambia las unidades y rehace el HUD—. Las gafas de sol tenían el
   * mismo fallo y nadie lo había notado.
   */
  private gafasState = { ganadas: false, puestas: false };
  private misionState = false;
  /** Qué cerrar cuando se abre el plano o el tiempo. Ver donde se usa. */
  private otraLamina: (() => void) | null = null;
  private pausaHandler: (() => void) | null = null;
  private creditsHandler: (() => void) | null = null;
  private alaHandler: (() => void) | null = null;
  private hangarHandler: (() => void) | null = null;
  private horaAtada: { hora: number; cambio: (h: number) => void } | null =
    null;
  private cieloAtado: {
    cielo: number;
    cambio: (alturaM: number | null, tapadura: number) => void;
  } | null = null;
  private tiempoAtado: {
    meteo: import("../world/meteo").Meteo;
    cambio: (m: import("../world/meteo").Meteo) => void;
    deVerdad: () => void;
  } | null = null;
  private mapaAtado: {
    esc: import("../world/scenarios").Scenario;
    cota: (x: number, z: number) => number;
  } | null = null;
  private torre: HTMLElement | null = null;
  /** La firma de quien hizo la fotografía que se está viendo. */
  private atribucionCaja: HTMLElement | null = null;
  private atribucionPuesta = "";
  /** La tira de la radio, y el reloj que la esconde. */
  private radioCaja: HTMLElement | null = null;
  private radioReloj = 0;
  private hintTimer = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    /*
     * **El tirador del cuadro, cableado una sola vez y por delegación.**
     *
     * Estaba dentro de `render`, que rehace el marcado entero al cambiar de
     * idioma, de unidades o de peldaño: con la escucha en el botón y la clase
     * puesta sobre un nodo capturado, cualquier repintado dejaba el mando
     * apuntando a algo que ya no estaba en la pantalla.
     *
     * Escuchando en la raíz y buscando el cuadro **en el momento del clic**,
     * no hay nada que se pueda quedar viejo.
     */
    /*
     * **Y se escucha `pointerdown`, no `click`.**
     *
     * Cuarto informe del mismo mando —«esto sigue ahí de adorno»— contra
     * pruebas que pasan: clic por coordenadas en ventanas de 1280, 1920 y
     * 2400, en dos peldaños, con tarjeta puesta y midiendo que el clic entra
     * en el tirador y que el cuadro baja. Cuando la prueba dice que va cuatro
     * veces y la persona dice que no cuatro veces, lo que está mal es la
     * prueba: mide un `click` de libro.
     *
     * Un `click` del navegador pide que el botón baje y suba **sobre el mismo
     * elemento y sin moverse**. En un panel táctil basta con que el dedo
     * resbale un píxel para que no llegue nunca; y si algo de encima se queda
     * el `pointerup`, tampoco. `pointerdown` no tiene ninguna de esas dos
     * condiciones: si el dedo aterriza ahí, el cuadro baja.
     *
     * No se pierde nada por el camino: esto no es un botón que dispare algo
     * irreversible, es una persiana.
     */
    this.root.addEventListener("pointerdown", (e) => {
      const donde = e.target as HTMLElement | null;
      if (!donde?.closest('[data-hud="cuadro-tirador"]')) return;
      // Y que no siga su camino: sin esto el gesto lo recoge además la palanca
      // táctil que hay debajo y el motor se mueve al bajar el cuadro.
      e.preventDefault();
      /*
       * **Lo que se invierte es lo que hay en la pantalla, no lo que yo creo.**
       *
       * Si por lo que sea el estado guardado y la clase del elemento se
       * separan —un repintado a destiempo, una pestaña vieja con el código
       * anterior— invertir el estado interno deja el clic sin efecto visible,
       * y quien lo pulsa solo sabe que «esto no cierra el panel». Leyendo la
       * clase, el mando siempre hace lo contrario de lo que se ve.
       */
      const bajadoAhora = !!this.root
        .querySelector('[data-hud="cuadro"]')
        ?.classList.contains("cuadro--bajado");
      this.ponerCuadroBajado(!bajadoAhora);
      ponerTexto("cuadro-bajado", this.cuadroBajado ? "1" : "0");
    });
    this.render();
  }

  /**
   * Baja el cuadro si está subido y al revés. La segunda vía del mismo mando.
   *
   * Lee **la clase que hay en la pantalla**, no el estado interno, por lo
   * mismo que el tirador: si los dos se separan, el mando siempre hace lo
   * contrario de lo que se ve. Ver el comentario del tirador en el
   * constructor.
   */
  alternarCuadro(): void {
    const bajado = !!this.root
      .querySelector('[data-hud="cuadro"]')
      ?.classList.contains("cuadro--bajado");
    this.ponerCuadroBajado(!bajado);
    ponerTexto("cuadro-bajado", this.cuadroBajado ? "1" : "0");
  }

  /** Si el cuadro está bajado ahora mismo. Se guarda por perfil. */
  private cuadroBajado = leerTexto("cuadro-bajado") === "1";

  /**
   * Baja o sube el cuadro de mandos.
   *
   * Se vuelve a aplicar después de cada repintado, porque el marcado nuevo
   * nace sin la clase: sin esto, cambiar de idioma con el cuadro bajado lo
   * subía solo.
   */
  private ponerCuadroBajado(bajado: boolean): void {
    this.cuadroBajado = bajado;
    const cuadro = this.root.querySelector('[data-hud="cuadro"]');
    cuadro?.classList.toggle("cuadro--bajado", bajado);
    const tirador = this.root.querySelector('[data-hud="cuadro-tirador"]');
    tirador?.setAttribute("aria-pressed", String(bajado));
    tirador?.setAttribute(
      "aria-label",
      t(bajado ? "hud.subirCuadro" : "hud.bajarCuadro"),
    );
  }

  /**
   * Vuelve a pintar los rótulos. Se llama al cambiar de idioma o de
   * unidades: los textos fijos se generan una vez y no se atan a variables,
   * así que la forma barata y sin sorpresas de traducirlos es rehacerlos.
   */
  render(): void {
    const gauges = this.instruments !== "none";
    const pictorial = this.instruments === "pictorial";
    // Reactor o hélice: decide el dibujo del motor en todo el HUD. Ver `fan`.
    const chorro = esDeChorro(this.ficha);
    this.tutor.setChorro(chorro);
    this.senal.chorro = chorro;
    /*
     * **El cuadro de mandos sale en los cuatro peldaños.**
     *
     * Aparecía de golpe en el de arriba, así que quien empezaba a los cuatro
     * años volaba sin instrumentos y a los catorce se encontraba seis de golpe.
     * Lo que hace el peldaño no es tener cuadro o no tenerlo: es **cuánto dice
     * el cuadro**. En el primero hay cintas con sus bandas de color, una rosa
     * con su flecha y una aguja de motor en el verde, sin una sola cifra —
     * porque no se lee—, y de ahí para arriba se encienden los números, las
     * escalas, los rótulos y los objetivos. Ver `markup` en `tablero.ts`.
     */
    const panel = true;
    /*
     * Qué peldaño es éste, de uno a cuatro. Lo mira el cuadro para crecer.
     *
     * **Y lo miran también las pantallas de la cabina**, que es por lo que la
     * cuenta ya no está escrita aquí: mientras vivió en el HUD, el cuadro
     * plano crecía con la escalera y la cabina no se enteraba. Ver `peldanoDe`.
     */
    const peldano = peldanoDe(this.instruments);
    // Los pictogramas cubren los dos peldaños de abajo. En el primero eran
    // «ningún instrumento», que sobre el papel suena limpio y en la práctica
    // dejaba a un niño de cuatro años volando a ciegas: sin saber si iba
    // deprisa, si subía, ni si el motor estaba puesto. Una tortuga no es un
    // instrumento, es un dibujo, y por eso sí cabe ahí.
    const pictos = this.instruments === "none" || pictorial;
    /*
     * **Y las cifras sueltas ya no existen en ningún peldaño.**
     *
     * Eran cuatro tarjetas —velocidad, vertical, altitud y rumbo— y vivían solo
     * en el tercero, porque en el cuarto ya estaban las esferas: «dejar las dos
     * cosas sería enseñar a mirar el número y no el instrumento». Ese argumento
     * vale igual ahora que el cuadro está en los cuatro, y encima el cuadro las
     * dice mejor: con su escala al lado, con su banda de color y moviéndose.
     */
    const numbers = false;

    this.root.innerHTML =
      `
      <!--
        La esquina de arriba a la izquierda, que estaba vacía.

        Aquí van los dos mandos que faltaban —cambiar de vista y parar—, y van
        aquí y no en la barra de arriba por una razón medida: la barra ya tenía
        siete botones y una insignia, y con dos más se partía en dos pisos y se
        metía encima de las tarjetas del vuelo en una tablet de 720 px.

        Y no son mandos de la misma familia que los otros: los de la barra
        abren cosas —el mapa, el cuaderno, los créditos— y estos dos actúan
        sobre el vuelo. Estar aparte también dice eso.
      -->
      <div class="hud__vistas">
        <!--
          La cámara, que hasta hoy solo se cambiaba con la tecla C.

          En el aparato del aula no hay teclado, así que **la mitad de las
          vistas del juego eran inalcanzables con el dedo**: la de cabina, las
          dos de ala y la de pájaro. Un botón redondo aquí arriba, fuera de la
          franja de los pulgares, y ya se recorren igual que con la tecla.
        -->
        <!--
          **Con el ojo, no con una cámara de fotos.** Una cámara de fotos
          dice «sacá una foto», que es lo que hace ese dibujo en cualquier
          teléfono; y la misma acción, en el teclado dibujado, ya llevaba el
          ojo: desde dónde se mira. Un dibujo por significado. Ver OJO en
          teclas.ts.
        -->
        <button class="sonido" type="button" data-hud="camara"
                aria-label="${t("hud.camara")}">${OJO}</button>
        <!--
          **Las gafas de sol**, y solo desde el día que se ganan.

          Nace escondido, no apagado: un botón gris con un candado es un
          reproche, y lo que hay que enseñar aquí es que un día apareció.
          Ver flight/gafas.ts y el issue 2.
        -->
        <button class="sonido gafas-boton" type="button" data-hud="gafas"
                aria-pressed="false" hidden
                aria-label="${t("hud.gafas")}">
          <!-- Las mismas gafas que la tarjeta que las da: un dibujo, un premio. -->
          ${DIBUJOS.gafas}
        </button>
        <!--
          Y la pausa, que no existía en ninguna plataforma. Es lo primero que
          se busca cuando llaman a la puerta, y es el criterio 2.2.2 de WCAG:
          si algo se mueve, tiene que poder pararse.
        -->
        <button class="sonido" type="button" data-hud="pausa"
                aria-label="${t("hud.pausa")}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6.5" y="5" width="4" height="14" rx="1.4" />
            <rect x="13.5" y="5" width="4" height="14" rx="1.4" />
          </svg>
        </button>
        <!--
          El cartel del cinturón, el de verdad: el de la fila de arriba de un
          avión de pasaje. Se enciende solo —no se pilota— y solo en los aviones
          que llevan gente. Lo enciende «atenderAlCinturon», en game.ts.

          Es un dibujo y nada más, como en un avión de verdad: lo que enseña no
          es el pictograma, es **cuándo** se enciende.
        -->
        <div class="cinturon" data-hud="cinturon" hidden role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">${CINTURON}</svg>
        </div>
      </div>
      <div class="hud__arriba">
        <div class="tarjeta insignia" data-hud="badge"></div>
        <!--
          Los galones del vuelo, apareciendo de uno en uno.

          Van al lado de la insignia porque es donde se lleva un galón: en la
          manga, a la vista, sin ocupar sitio. Y **no hay huecos**: lo que
          todavía no se ha ganado no se enseña apagado. Un hueco vacío es un
          reproche y un galón que aparece es un premio, y a los cuatro años
          esa diferencia es toda la diferencia.
        -->
        <div class="galones" data-hud="galones" hidden></div>
        <!--
          El contador de fotogramas, oculto salvo con fps=1 en la dirección.

          No es un adorno de programador: existe porque «va como una tortuga»
          y «no avanza en proporción a su velocidad» se dijeron cinco veces y
          las cinco tuve que pedir datos en vez de darlos. Un juego que se
          siente lento puede tener el reloj mal —ya pasó, tres veces— o
          simplemente ir a diez fotogramas por segundo, y esas dos cosas se
          arreglan en sitios opuestos. Con el número delante no hay que
          adivinar cuál de las dos es.
        -->
        <div class="tarjeta insignia" data-hud="fps" hidden></div>
        <!--
          Progreso de la misión, en puntos. Sin cifras ni fracciones: se ve
          cuántos faltan de un vistazo, y funciona igual con cinco años que
          con cuarenta.
        -->
        <div class="progreso" data-hud="progress" hidden></div>
        <!--
          La lámpara de señales de la torre.

          Verde autoriza, rojo manda parar. **No es un apaño para quien no
          lee**: es la lámpara de verdad, la que usa una torre para hablar con
          un avión sin radio, y está en el Anexo 2 de OACI desde siempre. Un
          niño de cuatro años entiende un semáforo, y resulta que un semáforo es
          exactamente lo que hay ahí arriba.

          Lleva texto alternativo porque un color solo no es información: quien
          no distinga el rojo del verde tiene que poder saber si puede entrar.
        -->
        <div class="torre" data-hud="torre" hidden role="status">
          <span class="torre__luz" data-hud="torre-luz"></span>
          <span class="torre__texto" data-hud="torre-texto"></span>
        </div>
        <!--
          **El compensador de profundidad**, que es el mando que faltaba.

          Contado jugando: «las flechas no tienen stops, o subo o bajo, y eso
          impide mantener el avión estable». El cabeceo es un muelle y vuelve
          al centro; el compensador se queda donde lo dejes, y es lo que
          permite volar nivelado sin tener una tecla apretada.

          El rótulo va en inglés y no se traduce, como IAS o ALT: es lo que
          pone en la cabina. Lo que se lee sin palabras es la aguja: arriba,
          el morro se queda arriba. Ver flight/model.ts, ControlInputs.trim.
        -->
        <div class="trim" data-hud="trim" hidden role="status">
          <span class="trim__rotulo">TRIM</span>
          <span class="trim__via">
            <span class="trim__marca" data-hud="trim-marca"></span>
          </span>
        </div>
        <!--
          Y el interruptor, que es lo que tiene un comandante de verdad.

          Pedido tal cual: «es una decisión del piloto mandar a ponerlo
          (turbulencia, inicio de aproximación, etc.)». Se enciende y se apaga
          solo cuando el vuelo lo pide; esto es para cuando lo pide quien
          vuela, que es lo que pasa en cualquier avión con gente detrás.

          Solo en los aviones con pasaje, como el cartel: una avioneta de
          escuela no tiene a quién avisar. Ver flight/cinturon.ts.
        -->
        <!--
          **El piloto automático.**

          Va junto al cinturón porque son la misma clase de cosa: mandos de la
          cabina que no pilotan el avión, lo gobiernan. Y va con dibujo y sin
          texto, como todo lo que tiene que entenderse a los cuatro años: un
          avión con una línea recta detrás.

          Lo que hace y lo que no está en flight/piloto-automatico.ts. En
          corto: mantiene el rumbo y la altura que llevabas al apretarlo, y se
          suelta en cuanto tocás los mandos.
        -->
        <button class="sonido piloto-auto" type="button"
                data-hud="piloto-auto" aria-pressed="false" hidden
                aria-label="${t("hud.pilotoAutomatico")}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 18h18" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" />
            <path d="M12 4 13.4 11 21 12.6v1.6l-7.6-1.2L12 20l-1.4-6.2L3 14.2v-1.6L10.6 11Z"
                  fill="currentColor" />
          </svg>
        </button>
        <button class="sonido cinturon-mando" type="button"
                data-hud="cinturon-mando" aria-pressed="false" hidden
                aria-label="${t("hud.mandarCinturon")}">
          <svg viewBox="0 0 24 24" aria-hidden="true">${CINTURON}</svg>
        </button>
        <!--
          La radio: lo que se acaba de oír decir a otro avión.

          Va aparte de todo lo demás y en pequeño **porque no es una
          instrucción**: nadie tiene que hacer nada con esto. Es el gemelo en
          pantalla de una voz —cada aviso hablado tiene el suyo, ver
          audio/voz.ts— y está por quien no oye o juega en silencio, que si no
          se perdería entero que hay alguien más ahí fuera.
        -->
        <div class="radio" data-hud="radio" hidden role="status"></div>
        <!--
          Botón de sonido. Es un botón de verdad y no un adorno: se pulsa con
          el dedo, se enfoca con el tabulador y dice su estado. Existe porque
          la tecla V silenciaba sin dejar rastro en pantalla, y un estado
          invisible no es un estado: es un fallo esperando.
        -->
        <button class="sonido" type="button" data-hud="sound" aria-pressed="false"></button>
        <!--
          Y la fila de paneles: mandos, plano, tiempo, ala, créditos y
          cuaderno. No están escritos aquí uno a uno a propósito — salen de
          «paneles.ts», que es la única lista. Antes eran seis sitios, y dos
          de ellos se quedaron sin banco de accesibilidad porque el banco
          tenía su propia copia de la lista. Ver #70.
        -->
        ${botonesDeLosPaneles()}
        <!--
          Y la puerta de vuelta al hangar. Un hangar al que solo se entra al
          arrancar es un hangar con la puerta tapiada: quien quiera cambiar de
          aeropuerto tendría que saber recargar la página.
        -->
        <button class="sonido" type="button" data-hud="hangar"
                aria-label="${t("hangar.volver")}">${HANGAR}</button>
      </div>
      <div class="hud__izquierda">
        ${numbers ? gauge("speed", INSTRUMENTS.speed, t("hud.speed"), this.units.speedLabel()) : ""}
        ${numbers ? gauge("vspeed", INSTRUMENTS.vspeed, t("hud.vspeed"), this.units.vspeedLabel()) : ""}
      </div>
      <div class="hud__derecha">
        ${numbers ? gauge("altitude", INSTRUMENTS.altitude, t("hud.altitude"), this.units.altitudeLabel()) : ""}
        ${numbers ? gauge("heading", INSTRUMENTS.heading, t("hud.heading"), "°") : ""}
        <!--
          El motor lleva sus dos teclas dibujadas al lado, y no una sola en
          el tutor cuando toca. Un mando que solo enseña la mitad de su
          pareja no se puede deducir: se veía «baja el motor» y no había
          manera de saber con qué se sube.
        -->
        <div class="tarjeta medidor motor">
          ${gauges ? `<span class="medidor__etiqueta">${INSTRUMENTS.throttle}</span>` : ""}
          <!--
            Y son botones de verdad, no dibujos. Estaban ahí para enseñar qué
            tecla usar y alguien intentó pulsarlos con el ratón, que es lo
            más razonable del mundo: si algo tiene forma de botón, se pulsa.
            Sirven igual con el dedo en una tablet.
          -->
          <!--
            En los peldaños con dibujos, los botones llevan **el motor con
            su flecha**: arriba para más motor, abajo para menos. El motor
            es el de este avión —hélice o reactor—; ver fan en
            pictogramas.ts.

            Llevaron la misma hélice en dos tamaños, y no valía: una hélice de
            cuatro palas de frente es una cruz, y en pantalla los dos botones
            se leían como dos ` +
      `. «Quiere que suba, pero no me deja meter gas
            ¿cómo subo?» — estaba apretando el de bajar.

            Llevaron un día la tortuga y el pájaro, y fue un error de bulto:
            esos dos son los extremos del velocímetro, no del gas. En pantalla
            quedaban dos escalas con los mismos dibujos midiendo cosas
            distintas, y en cuanto discrepaban —que es siempre, porque el motor
            manda y la velocidad obedece con retraso— parecía que una de las
            dos mentía.
          -->
          <div class="motor__fila">
            <button class="motor__tecla" type="button" data-hud="throttle-down"
                    data-objetivo="extendido"
                    aria-label="${t("hud.throttleDown")}">${pictos ? motorMenos(chorro) : "−"}</button>
            <!--
              Y la marca del gas que **sostiene el nivel**, en el peldaño donde
              eso existe. Ver ponerGasDeNivel.
            -->
            <div class="motor__pista"><div class="motor__relleno" data-hud="throttle"></div><span class="motor__nivel" data-hud="gas-nivel" hidden></span></div>
            <button class="motor__tecla" type="button" data-hud="throttle-up" data-objetivo="extendido"
                    aria-label="${t("hud.throttleUp")}">${pictos ? motorMas(chorro) : "+"}</button>
          </div>
          ${gauges ? `<span class="medidor__glosa">${t("hud.throttle")}</span>` : ""}
          <!--
            Y la reversa, encima del gas y solo cuando está metida.

            Va aquí y no con el freno porque **no es un freno**: es el motor
            empujando al revés, y en la cabina se maneja con el mando de
            potencia. Un avión que la lleva metida y no lo dice es un avión que
            miente sobre lo que están haciendo sus motores.
          -->
          <span class="motor__reversa" data-hud="reversa" hidden>REV</span>
        </div>
        <!--
          El freno. Sale solo cuando se está en el suelo, porque en el aire
          no sirve de nada y ocuparía sitio; y sale **con su tecla dibujada**,
          igual que el motor. Estaba conectado desde el principio y nadie lo
          encontraba: se aterrizaba y el avión rodaba hasta el fin del mundo.
          Un mando que no se anuncia no existe.
        -->
        <!--
          Y para quien no lee, el freno no es una tecla dibujada: es un botón
          rojo grande con una mano. Se toca, y funciona igual con el dedo que
          con el teclado. Un rótulo que pone «espacio» no sirve de nada a los
          cuatro años ni en una tablet.
        -->
        <button class="freno freno--boton" type="button" data-hud="brakes-touch" hidden
                aria-label="${t("hud.brakes")}">
          <!--
            **El avión y la barra donde se para** — el mismo dibujo que la
            tarjeta que pide frenar.

            Aquí hubo una mano, y la mano estaba mal: es «alto», y el alto lo
            dice el señalero y lo dice la tarjeta de parar. «El freno no se
            entiende con una mano que se usa también para el despegue antes de
            V1 y durante toda la fase de rodaje.» Se le puso una rueda debajo
            para desambiguar y tampoco: «le pones un circulito pequeño debajo
            pensando que eso deja claro el mensaje, pero no se trata de eso».

            Y no se trataba de eso. Lo que hace que un botón se entienda sin
            leer no es afinar su símbolo: es que sea **el mismo dibujo** que
            aparece cuando el juego te pide esa acción. La tarjeta dice «frená»
            con el avión y una barra gorda delante; el botón que frena lleva
            eso mismo. Se ve una vez en la pantalla, se busca en los mandos, y
            está. Ver el dibujo FRENO de ui/senal.ts.
          -->
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2.4" y="3.2" width="19.2" height="3" rx="1.5" />
            <path d="M2.6 16.6 L11.2 15.8 V9.6 a0.9 0.9 0 0 1 1.8 0 v6.2 l8.4 0.9 v2
                     l-8.4 0.9 v3 l2.1 1.2 v1 L12 24 L6.9 24.2 v-1 l2.1-1.2 v-3
                     l-6.4-0.9 Z"
                  transform="translate(0 -1.6)" />
          </svg>
        </button>
        <div class="tarjeta medidor freno" data-hud="brakes" hidden>
          ${gauges ? `<span class="medidor__etiqueta">${INSTRUMENTS.brakes}</span>` : ""}
          <!--
            La tecla se rellena desde el mapa al actualizar, no aquí. Escrita
            a mano decía «espacio» mientras el teclado dibujado encendía la B:
            el mismo fallo que ya tuvo el tutor, y por el mismo motivo.
          -->
          <span class="motor__tecla motor__tecla--ancha" data-hud="brake-key" aria-hidden="true"></span>
          ${gauges ? `<span class="medidor__glosa">${t("hud.brakes")}</span>` : ""}
        </div>
        <!--
          **El tren y los flaps, que hasta hoy no se podían tocar.**

          Volando desde fuera había palanca, gases, timón y freno al alcance
          del dedo, y nada más: el tren y los flaps solo existían como tecla
          —la G y la F— y como botón dentro de la cabina. O sea que en una
          tablet no existían, porque ahí no hay teclado; y en la vista de
          fuera, que es en la que se juega, tampoco.

          Dicho jugando, con el tren metido y el dibujo todavía puesto: «si
          pulsé la G para meter el tren ¿por qué sigo viéndolo? ¿en qué parte
          del panel veo que se está poniendo o quitando?». Las dos preguntas
          tienen la misma respuesta y hasta hoy no estaba en ninguna parte.

          Llevan **el mismo dibujo que la tarjeta que los pide**, que es la
          regla que ya se aprendió con el freno: lo que hace que un botón se
          entienda sin leer no es afinar su símbolo, es que sea el dibujo que
          se acaba de ver en pantalla pidiendo esa acción. Ver DIBUJOS en
          ui/senal.ts.

          Y el del tren **dice en qué estado está**, que es la otra mitad de
          la pregunta: apagado con el tren dentro, parpadeando mientras se
          mueve —esos diez segundos son media lección del mando— y encendido
          cuando está fuera y trabado. Los mismos tres estados que las luces
          del cuadro, porque son la misma cosa mirada desde otro sitio.
        -->
        <button class="mando mando--tren" type="button" data-hud="tren-touch" hidden
                aria-label="${t("tecla.tren")}">${DIBUJOS.tren}</button>
        <button class="mando mando--flaps" type="button" data-hud="flaps-touch" hidden
                aria-label="${t("tecla.flaps")}">${DIBUJOS.flaps}</button>
        ${
          numbers
            ? `<div class="tarjeta horizonte">
          <div class="horizonte__cielo" data-hud="horizon"></div>
          <div class="horizonte__cruz"></div>
        </div>`
            : ""
        }
        <!--
          **Y la tarjeta se toca para cambiar de destino.**

          Es un botón y no un adorno porque en una tablet no hay tecla J, y
          porque el sitio donde se pregunta «¿a dónde voy?» es el mismo donde
          se contesta «a otro». Donde hay un solo destino no hace nada, que es
          mejor que desaparecer: un mando que va y viene no se aprende.
        -->
        <button class="tarjeta casa" type="button" data-hud="home"
                aria-label="${t("tecla.destino")}">
          <!--
            **Y a cuál se va, también para quien no lee.**

            En Guyrami la tarjeta era una flecha y nada más: apuntaba a un
            sitio sin decir cuál. Después llevó el plano del aeródromo en
            miniatura, y a ese tamaño una pista es una raya blanca y todas
            las rayas son iguales: «¿y esto ayuda a entender a qué aeropuerto
            voy?». No ayudaba.

            Lo que va es **su indicativo OACI en una placa**, la misma que
            lleva la ficha del destino en el hangar. Cuatro letras son una
            forma que se reconoce antes de saber leerla —SGAS no se parece a
            GCXO—, se aprende sin estudiarla, y es exactamente lo que pone en
            la carta y en el aeropuerto de verdad. Donde se lee, además, el
            nombre debajo.
          -->
          <span class="casa__fila">
            <span class="casa__aguja" data-hud="home-arrow" aria-hidden="true">➤</span>
            <!-- El indicativo, al lado de la flecha y no en una línea más: con
                 un nombre largo, esa línea echaba la tarjeta fuera de la
                 pantalla en una tablet táctil. Lo midió verificar-carteles. -->
            <span class="casa__oaci${gauges ? "" : " casa__oaci--placa"}" data-hud="home-oaci" hidden></span>
          </span>
          ${gauges ? '<span class="casa__distancia" data-hud="home-distance">0</span>' : ""}
          ${gauges ? `<span class="medidor__glosa" data-hud="home-gloss">${t("hud.home")}</span>` : ""}
        </button>
      </div>
      <!--
        **La esquina de lo que el juego te enseña.**

        Los pictogramas y la tarjeta de aviso van juntos y en un solo
        contenedor, apilados por el navegador. Estaban cada uno por su lado,
        colocados con una medida que publicaba el HUD, y esa medida se toma
        una vez: en cuanto el bloque de pictogramas cambió de forma, la
        tarjeta se quedó encima de ellos. Dos cajas que tienen que ir una
        debajo de otra no se miden, se meten en la misma caja.

        Y en la esquina y no en medio porque el centro de la pantalla es del
        mundo: es donde se busca la pista de lejos y donde se mira adónde vas
        al despegar. Ver .rincon y .pictos en style.css.
      -->
      <div class="rincon">
      ${pictos ? Pictogramas.markup(chorro) : ""}
      <!--
        La señal del vuelo: qué toca hacer ahora, dibujado. Va en **todos** los
        peldaños y no solo en los que llevan texto — hay quien juega en
        silencio, hay quien tiene la pestaña muteada y hay quien no oye. Un
        juego que solo se puede seguir con sonido excluye por diseño.
      -->
      ${Senal.markup()}
      </div>
      ${Mapa.markup()}
      ${PanelDelTiempo.markup()}
      <div class="vineta" data-hud="vignette"></div>
      <!--
        **Y de pie, que se gire.**

        Con el dedo y la pantalla de pie no cabe un avión: la palanca, el
        motor, el timón, el cuadro y la columna de mandos piden una pantalla
        apaisada, y en cuatrocientos píxeles de ancho la barra de botones se
        parte en cuatro filas y los mandos caen fuera. Así que se pide girarla,
        como lo pide cualquier juego de esto: con el dibujo de un teléfono
        dando el cuarto de vuelta, que se entiende sin leer. La palabra
        acompaña. Solo sale con el dedo y de pie; ver la regla .gira de la hoja.
      -->
      <div class="gira" data-hud="gira" role="status">
        <svg class="gira__dibujo" viewBox="0 0 64 64" aria-hidden="true">
          <g class="gira__telefono">
            <rect x="22" y="10" width="20" height="36" rx="3.5" />
            <circle cx="32" cy="41" r="1.8" />
          </g>
          <path class="gira__flecha" d="M14 30 A18 18 0 0 1 30 12" />
          <path class="gira__punta" d="M26 8 L31 12 L26 16" />
        </svg>
        <span class="gira__texto">${t("hud.gira")}</span>
      </div>
      ${Tutor.markup()}
      <div class="hud__abajo">
        <!--
          **La firma de la fotografía, y no es un adorno.**
          La atribución de las teselas fotorrealistas es la condición de uso y
          **cambia con cada tesela**: quien fotografió esa ciudad tiene derecho
          a que se diga mientras se está viendo, no en un fichero del
          repositorio. CREDITOS.md llevaba meses afirmando que esto «se pinta
          siempre en pantalla» y no lo pintaba nadie. Va abajo del todo, en
          pequeño y sin papel de lector de pantalla, porque no es una
          instrucción para quien juega: es una obligación nuestra.
        -->
        <div class="atribucion" data-hud="atribucion" hidden></div>
        <!--
          Aquí sí: el aviso es assertive porque interrumpe (pérdida, suelo)
          y el mensaje efímero es polite porque puede esperar. Son las dos
          únicas cosas del HUD que un lector de pantalla debe leer.
        -->
        <div class="aviso-hud" role="alert" aria-live="assertive" data-hud="warning">
          <span class="aviso-hud__flecha" data-hud="warning-arrow" aria-hidden="true"></span>
          <span data-hud="warning-text"></span>
        </div>
        <div class="tarjeta insignia" aria-live="polite" data-hud="hint" style="margin-top:8px"></div>
        <!--
          El cuadro de mandos va aquí y no flotando aparte: compartiendo la
          franja de abajo se apila con el aviso en vez de taparlo, que es lo
          que pasaba. Un panel bonito que esconde un «terrain, pull up» es
          peor que no tener panel.
        -->
        ${
          panel
            ? `<div class="cuadro" data-hud="cuadro">
                 <!--
                   **El tirador para bajar el cuadro.**

                   Pedido jugando: «un botón para bajarlo o volver a
                   mostrarlo». Y tiene su motivo de verdad además del sitio en
                   pantalla: lo que se mira por la ventana es el instrumento
                   más importante que hay, y en un juego que enseña a mirar
                   fuera tiene que poder quitarse lo de dentro.

                   Es un tirador y no un aspa: se agarra por arriba y baja,
                   como la persiana que es. Sin texto, que aquí no se sabe
                   leer — la flecha dice a dónde va.
                 -->
                 <button class="sonido cuadro__tirador" type="button"
                         data-hud="cuadro-tirador" aria-pressed="false"
                         aria-label="${t("hud.bajarCuadro")}">
                   <svg viewBox="0 0 24 24" aria-hidden="true">
                     <path d="M6 9.5 12 15l6-5.5" fill="none"
                           stroke="currentColor" stroke-width="2.4"
                           stroke-linecap="round" stroke-linejoin="round" />
                   </svg>
                 </button>
                 ${this.tablero.markup(this.ficha, peldano)}
               </div>`
            : ""
        }
      </div>
      <!--
        El final del vuelo.

        Va dentro del HUD y no en una pantalla aparte porque no es un menú: es
        el último cuadro de lo que acabás de hacer, y lo que enseña es **la
        manga con lo que te llevaste**. Sin cifras, sin «dos de seis» y sin
        huecos apagados. Ver flight/reconocimiento.ts.
      -->
      <!--
        V1, en grande y tenue.

        Ocupa media pantalla y no tapa nada porque no tiene fondo ni recoge
        clics: es un destello, como el de un aro cruzado. Fuera de la carrera
        de despegue no existe.
      -->
      <div class="v1" data-hud="v1" aria-hidden="true">V1</div>
      <div class="fin" data-hud="fin" hidden>
        <div class="fin__panel">
          <!--
            La traza del vuelo sobre el plano del aeródromo, que se dibuja
            sola en poco más de un segundo. Es lo primero que se mira porque
            es lo único de esta pantalla que cuenta **este** vuelo y no otro:
            a los cuatro años eso se reconoce como «lo que acabo de hacer».
          -->
          <div class="fin__plano" data-hud="fin-plano" hidden></div>
          <div class="fin__manga" data-hud="fin-manga"></div>
          <p class="fin__frase" data-hud="fin-frase"></p>
          <!--
            Y las horas voladas, en avioncitos. Los galones dicen qué tal salió
            este vuelo y se olvidan al siguiente; esto dice cuánto llevas, que
            es lo que hace volver mañana. Ver ui/reloj.ts.
          -->
          <div class="fin__reloj" data-hud="fin-reloj"></div>
          <!--
            Y la salida, que la primera versión no tenía: «vale, pero habrá
            que salir de aquí». La flecha que vuelve a empezar se entiende sin
            leer; el texto solo aparece donde ya se lee.
          -->
          <div class="fin__botones">
          <button type="button" class="fin__otra" data-hud="fin-otra">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5 a7 7 0 1 0 6.6 4.7" fill="none" stroke="currentColor"
                    stroke-width="2.6" stroke-linecap="round" />
              <path d="M11.2 1.6 L17 5 L11.2 8.4 Z" />
            </svg>
            <span data-hud="fin-otra-texto"></span>
          </button>
          <!--
            Y la puerta de al lado: volver al hangar a elegir otra cosa.
            Pequeña y al lado de la grande, porque lo que uno quiere hacer
            justo ahí es volver a volar; pero si lo que quiere es cambiar de
            sitio, hasta hoy había que recargar la página.
          -->
          <button type="button" class="fin__hangar" data-hud="fin-hangar"
                  aria-label="${t("hangar.volver")}">${HANGAR}</button>
          </div>
        </div>
      </div>
    `;

    // Los instrumentos que este peldaño no enseña sencillamente no están en
    // el DOM, así que la actualización tiene que tolerar su ausencia.
    this.speed = optional(this.root, "speed");
    this.tarjetaVelocidad = optional(this.root, "tarjeta-speed");
    this.fps = optional(this.root, "fps");
    if (this.fps) this.fps.hidden = !this.conFps;
    this.altitude = optional(this.root, "altitude");
    this.heading = optional(this.root, "heading");
    this.torre = optional(this.root, "torre");
    this.atribucionCaja = optional(this.root, "atribucion");
    this.radioCaja = optional(this.root, "radio");
    this.vspeed = optional(this.root, "vspeed");
    this.throttleFill = pick(this.root, "throttle");
    this.reversaAviso = optional(this.root, "reversa");
    this.brakes = pick(this.root, "brakes");
    this.brakeKey = pick(this.root, "brake-key");
    this.brakesTouch = pick(this.root, "brakes-touch");
    this.brakesTouch.addEventListener("pointerdown", () =>
      this.setBraking(true),
    );
    /*
     * El tren y los flaps van **al soltar**, no al apretar, que es como
     * funciona cualquier botón: apretando se puede rectificar arrastrando el
     * dedo fuera. Es la misma regla que ya siguen los mandos de la cabina, y
     * la contraria que el freno — que es un pedal y se pisa. Ver
     * `pulsarMandoDeCabina` en `game.ts`.
     */
    this.trenTouch = pick(this.root, "tren-touch");
    this.flapsTouch = pick(this.root, "flaps-touch");
    for (const [boton, cual] of [
      [this.trenTouch, "tren"],
      [this.flapsTouch, "flaps"],
    ] as const) {
      boton.addEventListener("click", () => this.alTocarMando?.(cual));
    }
    // El «soltar» se escucha en la ventana y no en el botón: al despegar, el
    // botón se oculta con el dedo todavía encima, y un elemento oculto ya no
    // recibe el `pointerup`. El freno se quedaba puesto para siempre, y al
    // aterrizar el avión no había forma de moverlo hasta que algo lo
    // soltaba — y entonces salía disparado con el gas que hubiera puesto.
    for (const evento of ["pointerup", "pointercancel"] as const) {
      window.addEventListener(evento, () => this.setBraking(false));
    }

    this.throttleDown = pick(this.root, "throttle-down");
    this.throttleUp = pick(this.root, "throttle-up");
    for (const [boton, paso] of [
      [this.throttleDown, -1],
      [this.throttleUp, 1],
    ] as const) {
      boton.addEventListener("pointerdown", () => this.throttleHandler?.(paso));
      boton.addEventListener("pointerup", () => this.throttleHandler?.(0));
      boton.addEventListener("pointerleave", () => this.throttleHandler?.(0));
    }
    this.horizon = optional(this.root, "horizon");
    this.home = pick(this.root, "home");
    this.homeArrow = pick(this.root, "home-arrow");
    this.homeDistance = optional(this.root, "home-distance");
    this.homeGloss = optional(this.root, "home-gloss");
    this.homeOaci = optional(this.root, "home-oaci");
    // La tarjeta es nueva, así que lo puesto en ella también.
    this.destinoPuesto = null;
    this.warning = pick(this.root, "warning");
    this.warningText = pick(this.root, "warning-text");
    this.warningArrow = pick(this.root, "warning-arrow");
    this.vignette = pick(this.root, "vignette");
    this.badge = pick(this.root, "badge");
    this.galones = pick(this.root, "galones");
    this.progress = pick(this.root, "progress");
    this.sound = pick(this.root, "sound");
    this.sound.addEventListener("click", () => this.soundHandler?.());
    pick(this.root, "camara").addEventListener("click", () =>
      this.camaraHandler?.(),
    );
    this.gafas = pick(this.root, "gafas");
    this.gafas.addEventListener("click", () => this.gafasHandler?.());
    this.root
      .querySelector('[data-hud="cinturon-mando"]')
      ?.addEventListener("click", () => this.cinturonHandler?.());
    this.root
      .querySelector('[data-hud="piloto-auto"]')
      ?.addEventListener("click", () => this.pilotoAutoHandler?.());
    this.home.addEventListener("click", () => this.destinoHandler?.());
    this.mision = pick(this.root, "mision-boton");
    this.mision.addEventListener("click", () => this.misionHandler?.());
    pick(this.root, "pausa").addEventListener("click", () =>
      this.pausaHandler?.(),
    );
    pick(this.root, "keys").addEventListener("click", () =>
      this.keysHandler?.(),
    );
    pick(this.root, "ala").addEventListener("click", () => this.alaHandler?.());
    pick(this.root, "credits").addEventListener("click", () =>
      this.creditsHandler?.(),
    );
    pick(this.root, "cuaderno").addEventListener("click", () =>
      this.cuadernoHandler?.(),
    );
    pick(this.root, "hangar").addEventListener("click", () =>
      this.hangarHandler?.(),
    );
    // El mapa se vuelve a atar en cada `render()`, como todo lo demás: el HUD
    // se rehace entero al cambiar de idioma y los oyentes viejos se van con el
    // marcado viejo.
    if (this.mapaAtado)
      this.mapa.bind(this.root, this.mapaAtado.esc, this.mapaAtado.cota);
    // El panel del tiempo se reata igual, y hay que devolverle sus oyentes:
    // el marcado es nuevo y los de antes se fueron con el viejo.
    this.tiempo.bind(this.root);
    /*
     * Uno u otro, nunca dos: son láminas que se miran volando y la segunda
     * taparía a la primera sin que nadie entendiera por qué.
     *
     * Y desde que existe el panel de la misión son **tres**, no dos. Se vio en
     * una captura: «qué hay que hacer» abierto encima del plano, cada uno
     * tapando la mitad del otro.
     */
    this.mapa.onAbrir(() => {
      this.tiempo.cerrar();
      this.otraLamina?.();
    });
    this.tiempo.onAbrir(() => {
      this.mapa.cerrar();
      this.otraLamina?.();
    });
    if (this.tiempoAtado) {
      this.tiempo.onCambio(this.tiempoAtado.cambio);
      this.tiempo.onDeVerdad(this.tiempoAtado.deVerdad);
      this.tiempo.poner(this.tiempoAtado.meteo);
    }
    if (this.horaAtada) {
      this.tiempo.onHora(this.horaAtada.cambio);
      this.tiempo.ponerHoraSinAvisar(this.horaAtada.hora);
    }
    if (this.cieloAtado) {
      this.tiempo.onNubes(this.cieloAtado.cambio);
      this.tiempo.ponerCieloSinAvisar(this.cieloAtado.cielo);
    }
    this.paintSound();
    this.paintProgress();
    this.paintGalones();
    // Y los dos que nacen escondidos, que si no reaparecen al repintar.
    this.setGafas(this.gafasState.ganadas, this.gafasState.puestas);
    this.setMisionVisible(this.misionState);
    this.hint = pick(this.root, "hint");
    this.fin = pick(this.root, "fin");
    // Se cierra tocando en cualquier parte: a los cuatro años no se busca una
    // equis.
    this.fin.addEventListener("click", () => this.cerrarFinDeVuelo());
    // Y el botón vuelve a volar, que es lo que uno quiere hacer justo ahí.
    pick(this.root, "fin-otra").addEventListener("click", (e) => {
      e.stopPropagation();
      this.cerrarFinDeVuelo();
      this.otroVuelo?.();
    });
    /*
     * Y al hangar. Se hace recargando sin `?escenario=`, que es exactamente lo
     * que hace que el hangar salga: la dirección manda sobre lo guardado, y
     * sin ella el juego pregunta dónde, cómo y qué. Ver `main.ts`.
     */
    pick(this.root, "fin-hangar").addEventListener("click", (e) => {
      e.stopPropagation();
      location.href = location.pathname;
    });

    this.badge.textContent = this.badgeText;
    this.tablero.bind(this.root, this.ficha);
    this.pictos.bind(this.root);
    this.medirLaBarra();
    this.senal.bind(this.root);
    this.tutor.bind(this.root);
    this.reserveForPanel();
    this.reservarArriba();
    // Y el cuadro se queda como lo dejó quien juega: el marcado nuevo nace
    // sin la clase. Ver `ponerCuadroBajado`.
    this.ponerCuadroBajado(this.cuadroBajado);
    /*
     * **Y los mandos que este avión y este peldaño sí tienen, también.**
     *
     * Nacen `hidden` en el marcado y se encienden una vez al arrancar. Como
     * `render()` rehace el marcado entero —lo llaman cambiar de peldaño,
     * cambiar de unidades y cambiar de avión—, el botón volvía a esconderse y
     * **no había forma de recuperarlo en toda la partida**.
     *
     * Contado jugando después de pasar de Guyrami a Taguató: «yo no veo
     * piloto automático». Y no lo había: lo apagó el propio cambio de
     * peldaño que se hizo para tenerlo.
     *
     * Es el mismo fallo que el del tirador del cuadro, en el mismo sitio y por
     * el mismo motivo. Lo que dura más que un repintado se vuelve a aplicar
     * después de cada repintado.
     */
    this.ponerHayPilotoAutomatico(this.hayPilotoAuto);
    this.ponerHayCinturon(this.hayCinturon);
    this.ponerGasDeNivel(this.gasDeNivel);
  }

  /**
   * El tutor va fijo sobre el fondo de la pantalla y el cuadro de mandos
   * también vive abajo, así que sin esto el cartel se planta encima de las
   * esferas. Se mide el panel y se levanta el tutor exactamente eso: la
   * altura cambia con el tamaño de pantalla y con la fila única del modo
   * apaisado, y un número escrito a mano acertaría en un caso y fallaría en
   * los otros.
   */
  /**
   * Cuánto ocupa la franja de arriba, para que la lámpara de la torre no se
   * meta debajo de ella.
   *
   * La lámpara vivía a un catorce por ciento de la altura, y un porcentaje no
   * sabe qué hay encima: en una tablet de aula en horizontal ese catorce por
   * ciento son noventa píxeles, o sea justo la fila de botones redondos, y la
   * lámpara se encendía detrás. Es el mismo fallo que el del cartel del
   * cinturón y del mismo tipo: un aviso que se enciende solo y queda tapado no
   * se lee como un solape, se lee como que el juego no avisa.
   *
   * Es la hermana de `reserveForPanel`: se mide lo que hay y se reserva, en
   * vez de escribir un número que acierta en una pantalla y falla en las otras.
   */
  private reservarArriba(): void {
    let abajo = 0;
    for (const sel of ['[data-hud="pictos"]', ".hud__arriba", ".hud__vistas"]) {
      const caja = this.root.querySelector(sel)?.getBoundingClientRect();
      if (!caja) continue;
      /*
       * Y solo cuenta mientras **siga siendo una barra**. En una pantalla
       * estrecha la fila de botones de arriba se parte y se convierte en una
       * columna que baja media pantalla: preguntarle «dónde acabas» devuelve
       * 558 de 780, y la lámpara se iría a parar encima de la tarjeta de abajo.
       * Una columna no tiene un «debajo» que sirva para nada.
       */
      if (caja.height > caja.width) continue;
      abajo = Math.max(abajo, caja.bottom);
    }
    this.root.style.setProperty(
      "--arriba-alto",
      `${Math.round(aPxDelHud(this.root, abajo))}px`,
    );
    /*
     * Y lo que ocupa el rincón de la derecha —pictogramas y tarjeta—, para que
     * la columna de mandos no se le meta debajo.
     *
     * Los dos viven pegados al borde derecho y el rincón está fuera de la
     * rejilla: si estuviera dentro ensancharía su columna y le robaría sitio a
     * la barra de arriba, que es un fallo que ya costó una medida —ver
     * `.hud__vistas`—. Así que se mide y la columna de mandos se aparta.
     */
    escribirRincon(this.root);
  }

  /**
   * Cuánto alto le come el cuadro de mandos a la pantalla, en píxeles.
   *
   * Lo mide el HUD porque es suyo, y lo lee la cámara para no encuadrar el
   * avión detrás de él. Cero desde la cabina, donde el cuadro no se dibuja.
   */
  get altoDelCuadro(): number {
    const panel = this.root.querySelector('[data-hud="tablero"]');
    if (!panel) return 0;
    const caja = panel.getBoundingClientRect();
    /*
     * Desde el borde de abajo y no la altura del dibujo: con el dedo el cuadro
     * vive despegado, encima de los pedales, y lo que tapa es todo lo que hay
     * de su borde de arriba para abajo. Y bajado, lo que asome.
     */
    return caja.height > 0 ? Math.max(0, window.innerHeight - caja.top) : 0;
  }

  /**
   * Cuánto le come el HUD por arriba **encima del avión**, en píxeles de
   * pantalla: hasta dónde baja la barra de botones.
   *
   * Lo lee la cámara por lo mismo que lee el cuadro: **la franja útil de la
   * pantalla es la que queda entre los dos**, y es en ésa donde hay que
   * encuadrar. Ver `encuadrarSobreElCuadro`.
   *
   * Solo la barra, y no `--arriba-alto`, que cuenta también los pictogramas:
   * ésos viven en la esquina de la derecha, al lado del avión y no encima, y
   * en Guyrami bajan hasta media franja — contados, el avión no subía nada.
   */
  get altoDeArriba(): number {
    const barra = this.root.querySelector(".hud__arriba");
    if (!barra) return 0;
    const caja = barra.getBoundingClientRect();
    return caja.height > 0 && caja.height < caja.width ? caja.bottom : 0;
  }

  private reserveForPanel(): void {
    /*
     * Se mide con la caja del dibujo y no con `offsetHeight`: el cuadro es un
     * SVG, y un SVG no tiene `offsetHeight` — da `undefined`, y `undefined +
     * 10` es `NaN`, que en CSS no es cero sino «esta propiedad no existe». El
     * cartel del tutor se habría plantado encima de las esferas sin que nada
     * fallara por ningún sitio.
     */
    const panel = this.root.querySelector('[data-hud="tablero"]');
    const alto = panel
      ? aPxDelHud(this.root, panel.getBoundingClientRect().height)
      : 0;
    /*
     * **Y lo que el cuadro está despegado del borde**, que con el dedo no es
     * poco: sube por encima de la barra del timón. Se suma lo que dice la
     * hoja y no lo que se mide, porque bajado el cuadro se sale por abajo y
     * la caja medida no dice dónde vive. `bottom` ya viene en los píxeles del
     * propio cuadro.
     */
    const cuadro = this.root.querySelector('[data-hud="cuadro"]');
    const despegado = cuadro
      ? Number.parseFloat(getComputedStyle(cuadro).bottom) || 0
      : 0;
    this.root.style.setProperty(
      "--panel-alto",
      `${alto ? alto + despegado + 10 : 0}px`,
    );
  }

  /**
   * Hacia dónde queda la pista y a qué distancia.
   *
   * La aguja gira respecto al morro: arriba es de frente. Es el canal que
   * funciona sin leer — se gira hasta que la flecha apunta arriba y se va
   * hacia allá. El número está para quien ya lee.
   *
   * @param relativeBearing rad, 0 al frente, positivo a la derecha
   * @param modo a qué apunta: la pista de casa, un objetivo de misión, o el
   *   aeropuerto al que se va
   * @param destino a cuál se va, cuando se va a otro campo: su nombre, su
   *   indicativo y su escenario, que es de donde sale su dibujo
   */
  setHome(
    relativeBearing: number,
    metres: number,
    modo: "pista" | "objetivo" | "destino" = "pista",
    destino?: {
      readonly nombre: string;
      readonly oaci: string | null;
      readonly escenario: Scenario;
    },
  ): void {
    const nombre = destino?.nombre;
    const toObjective = modo === "objetivo";
    // El glifo apunta a la derecha en reposo, de ahí los noventa grados. La
    // rotación entera se calcula aquí y no repartida entre CSS y JS: dos
    // sitios distintos girando el mismo elemento es como nacen los errores
    // de signo.
    const degrees = (relativeBearing * 180) / Math.PI - 90;
    this.homeArrow.style.transform = `rotate(${degrees}deg)`;
    if (this.homeDistance) {
      this.homeDistance.textContent =
        metres >= 1000
          ? `${(metres / 1000).toFixed(1)} km`
          : `${Math.round(metres)} m`;
    }
    // Cerca y de frente, se apaga: ya la estás viendo por la ventanilla.
    this.home.classList.toggle("casa--cerca", metres < 900);
    // Y dice a qué apunta: con misión en curso no es la pista.
    this.home.classList.toggle("casa--objetivo", toObjective);
    /*
     * **Y yendo a otro aeropuerto, su nombre.**
     *
     * «Pista» vale mientras solo hay una. En cuanto se vuela a otra isla, esa
     * palabra es justo la que no se necesita: lo que hace falta saber es **a
     * cuál** se va, que es la diferencia entre una flecha y un viaje. Y es el
     * único sitio del juego donde aparece el nombre del sitio al que se va,
     * así que se aprende sin estudiarlo — igual que la matrícula por la radio.
     */
    this.home.classList.toggle("casa--destino", modo === "destino");
    if (this.homeGloss) {
      /*
       * El nombre corto: lo de antes del punto medio. «Guaraní · Ciudad del
       * Este» ocupaba dos líneas y echaba la tarjeta por debajo de la pantalla
       * en una tablet táctil; el aeropuerto se llama Guaraní, y la ciudad ya
       * la dice el aviso al cambiar de destino.
       */
      this.homeGloss.textContent =
        modo === "destino" && nombre
          ? (nombre.split(" · ")[0] ?? nombre)
          : t(toObjective ? "hud.objective" : "hud.home");
    }
    this.ponerDestino(modo === "destino" ? (destino ?? null) : null);
  }

  /**
   * **Cambiar de destino se tiene que notar.**
   *
   * Tocar la tarjeta cambiaba el nombre de debajo de la flecha y nada más:
   * quien no lee no se enteraba de que había cambiado nada, y quien lee lo
   * descubría al rato. Ahora la tarjeta destella, se pone el dibujo del sitio
   * nuevo y su nombre sale en la línea de avisos. Lo mismo cuando cambia solo
   * —al despegar, al llegar, al entrar en la reserva—, que es cuando más hace
   * falta enterarse.
   *
   * Se llama cada fotograma y solo hace algo cuando el destino cambia.
   */
  private ponerDestino(
    destino: {
      readonly nombre: string;
      readonly oaci: string | null;
      readonly escenario: Scenario;
    } | null,
  ): void {
    const id = destino?.escenario.id ?? null;
    if (id === this.destinoPuesto) return;
    this.destinoPuesto = id;
    if (this.homeOaci) {
      this.homeOaci.hidden = !destino?.oaci;
      this.homeOaci.textContent = destino?.oaci ?? "";
    }
    if (!destino) return;
    /*
     * El destello: la animación se quita y se vuelve a poner, y la lectura
     * del ancho de por medio es lo que obliga al navegador a empezarla otra
     * vez. Sin ella, dos cambios seguidos solo destellan una vez.
     */
    this.home.classList.remove("casa--destello");
    void this.home.offsetWidth;
    this.home.classList.add("casa--destello");
    // Y el nombre, donde se escriben los avisos cortos. Sin letras no se
    // escribe nada: ahí habla el dibujo de la tarjeta.
    if (this.instruments !== "none")
      this.flash(
        destino.oaci ? `${destino.nombre} · ${destino.oaci}` : destino.nombre,
        4,
      );
  }

  /**
   * La declinación del escenario. Ver por qué en la actualización de HDG.
   */
  setMagneticVariation(degrees: number): void {
    this.magneticVariation = degrees;
  }

  setUnits(name: UnitSystemName): void {
    this.units = UNIT_SYSTEMS[name];
    this.render();
  }

  /** En qué peldaño de la escalera de comunicación avisa este tramo. */
  setEscalera(peldano: Peldano): void {
    this.escalera = peldano;
  }

  /** Cuántos instrumentos enseña este peldaño de la escalera. */
  setInstruments(level: Tier["instruments"]): void {
    this.instruments = level;
    // Sin instrumentos es el peldaño de los pequeños, y ahí no va ni una
    // palabra: empiezan a los cuatro años y no leen.
    this.root.classList.toggle("hud--sin-letras", level === "none");
    this.render();
  }

  /**
   * **Desde la cabina, los instrumentos del juego se apartan del panel.**
   *
   * Las dos columnas del HUD van centradas a media altura, que es donde no
   * estorban en la vista de persecución. En la vista de cabina, media altura es
   * exactamente **donde está el salpicadero**: medido en el de fuselaje ancho,
   * la tarjeta del freno caía encima del reloj del motor 2 y la bola de
   * actitud, encima del 4. Dos instrumentos del avión tapados por dos tarjetas
   * que dicen lo mismo.
   *
   * Arriba no estorban a nadie: ahí está el cielo, y el cielo no lleva números.
   * Es la misma regla que ya aplicaba el teléfono, donde el sitio escaso es el
   * de abajo.
   */
  ponerVistaDeCabina(enCabina: boolean): void {
    this.root.classList.toggle("hud--cabina", enCabina);
    /*
     * Y se vuelve a medir el cuadro, porque acaba de cambiar de alto.
     *
     * Desde la cabina no se dibuja —ahí el cuadro es el del avión— así que
     * `--panel-alto` pasa a cero y todo lo que se apoyaba en él baja a ocupar
     * el sitio. Sin esta línea, la variable se queda con el alto de la última
     * vista y deja una franja muerta de cuatrocientos píxeles encima del
     * salpicadero.
     */
    this.reserveForPanel();
  }

  update(
    state: FlightState,
    throttle: number,
    dt: number,
    braking = 0,
    decisionSpeed = Infinity,
    runwayLeft = Infinity,
    engineOn = true,
    /**
     * Si esto es una **carrera de despegue** y no otra cosa.
     *
     * Lo dice el plan de vuelo, que es quien sabe, y hace falta porque el
     * despegue y la carrera de aterrizaje se parecen demasiado vistos solo con
     * la velocidad: en pista, rápido y con gas. Ver `despegando`.
     */
    enDespegue = true,
    /** Si la reversa está metida. Se enseña, porque es el motor al revés. */
    reversa = false,
    /**
     * Lo que el cuadro de mandos necesita y el HUD no tenía de antes: los
     * flaps, adónde se va y de dónde sopla. Va en un solo objeto porque son
     * datos del **cuadro**, no del aviso ni del acelerador, y engordar la
     * lista de argumentos con tres más era la vía rápida a equivocarse de
     * posición al llamar.
     */
    mandos?: {
      readonly flaps: number;
      readonly tren: number;
      readonly objetivo: {
        readonly rumbo: number;
        readonly distancia: number;
      } | null;
      readonly viento: {
        readonly desde: number;
        readonly nudos: number;
      } | null;
      /** El mundo, para la carta de la pantalla de navegación. */
      readonly mapa: MapaDeLaCarta | null;
      /** El depósito. Ver `flight/combustible.ts`. */
      readonly combustible: {
        readonly kilos: number;
        readonly cabe: number;
        readonly reserva: number;
        readonly estado: "bien" | "reserva" | "poco";
      } | null;
      /** La ventanilla del altímetro. Ver `flight/altimetro.ts`. */
      readonly presion: {
        readonly puesta: number;
        readonly delSitio: number;
      } | null;
    },
  ): void {
    // Velocidad indicada, no verdadera: es la que importa para no caerse, y
    // la que marcaría el instrumento de un avión real.
    const ias = indicatedAirspeed(state.airspeed, state.position.y);

    if (this.pictos.present) {
      // Fracciones, no unidades: aquí no hay nudos ni pies que valgan.
      // Altura **sobre el suelo**, no sobre el mar. Con la altitud absoluta
      // el avioncito arrancaba ya a media tarjeta —la pista está a ciento y
      // pico metros— y apenas se movía al despegar, que es justo lo único
      // que este dibujo tiene que contar. Y la escala es la del avión que
      // vuela aquí, no la de un reactor.
      // La altura no va lineal, va por raíz. Con escala lineal a 260 m, un
      // vuelo rasante sobre las lomas —que es lo que hace alguien de cuatro
      // años— movía el avioncito dos píxeles, y el dibujo parecía un adorno.
      // Con la raíz, los primeros cien metros ocupan la mitad de la tarjeta
      // y los cuatrocientos siguen cabiendo arriba.
      /*
       * **Y la escala sale de la aeronave, no de un cuarenta y seis suelto.**
       *
       * Cuarenta y seis metros por segundo no es el crucero de ningún avión
       * del juego: la avioneta cruza a sesenta y se aproxima a treinta y tres.
       * Con esa escala, en aproximación el avioncito iba al setenta y dos por
       * ciento del recorrido hacia el pájaro mientras el velocímetro numérico
       * marcaba el cincuenta y cinco por ciento del crucero. Los dos
       * instrumentos decían cosas distintas del mismo avión, y así se vio
       * jugando: «la tortuga y el ave dicen que estoy casi a tope y el
       * velocímetro está por debajo de la mitad».
       *
       * Ahora la tortuga es un pelo por debajo de la velocidad de
       * aproximación —por ahí abajo está el peligro— y el pájaro, bastante por
       * encima. De la ficha del avión, como todo lo demás.
       */
      const lenta = this.vref * 0.8;
      // El pájaro, donde de verdad se llega. Ver `vmax`.
      const rapida = Math.min(this.vref * 1.6, this.vmax);
      this.pictos.update(
        (ias - lenta) / (rapida - lenta),
        Math.sqrt(Math.max(0, state.heightAboveGround) / 400),
        engineOn ? throttle : 0,
        dt,
        engineOn,
        this.bandaActual,
        // Cómo está puesto el avión. Se calcula más abajo para las esferas y
        // la tarjeta del horizonte, pero esos dos solo existen de Taguato
        // para arriba: aquí es el único sitio donde se ve en los peldaños de
        // los pequeños.
        bankAngleOf(state.orientation),
        /*
         * **Y dónde cae su velocidad de aproximación en esta misma vía.**
         *
         * Con la misma cuenta que la aguja, y por eso va aquí y no dentro del
         * pictograma: dos sitios normalizando el mismo número con dos fórmulas
         * es la vía rápida a que la marca y el avioncito discrepen — y una
         * marca que miente es peor que ninguna.
         *
         * Sale de la ficha de cada aeronave, así que se mueve sola al cambiar
         * de avión: la avioneta y el de fuselaje ancho no aterrizan a la misma
         * velocidad y la marca tiene que decirlo.
         */
        (this.vref - lenta) / (rapida - lenta),
      );
    }

    if (this.pictos.present) {
      // Nada más que hacer: los pictogramas ya están actualizados arriba y
      // estos peldaños no tienen cifras que escribir.
    } else {
      if (this.speed)
        this.speed.textContent = Math.round(this.units.speed(ias)).toString();
      if (this.altitude) {
        this.altitude.textContent = Math.round(
          this.units.altitude(state.position.y),
        ).toString();
      }
      if (this.vspeed) {
        this.vspeed.textContent = this.units
          .vspeed(state.verticalSpeed)
          .toFixed(this.units.vspeedDecimals);
      }
      if (this.heading) {
        // **Magnético, no verdadero.** La brújula de un avión apunta al norte
        // magnético, y el número pintado en la cabecera de una pista es ese
        // rumbo dividido por diez. Enseñando el verdadero, el HUD decía 111 en
        // una pista donde pone 12, y ahí se pierde la lección mejor que tiene
        // este juego: alinearse, mirar el rumbo y reconocer el número del
        // suelo sin que nadie lo explique.
        const verdadero = (state.heading * 180) / Math.PI;
        const degrees =
          Math.round(verdadero + this.magneticVariation + 720) % 360;
        this.heading.textContent = degrees.toString().padStart(3, "0");
      }
    }

    this.throttleFill.style.width = `${Math.round(throttle * 100)}%`;
    // Y la reversa, si está metida. Ver el marcado de `motor__reversa`.
    if (this.reversaAviso) this.reversaAviso.hidden = !reversa;

    // El freno aparece al tocar suelo y se enciende al pisarlo.
    // Sin cifras, botón; con cifras, tarjeta con su tecla. Nunca los dos.
    const enSuelo = state.onGround;
    const sinLetras =
      this.instruments === "none" || this.instruments === "pictorial";
    // Y con el dedo, tampoco la tarjeta: enseña la tecla B de un teclado que
    // en una tablet no existe, y salía **además** del botón. En un teléfono
    // apaisado eran ciento veinte píxeles que echaban el destino fuera de la
    // pantalla. Ver `verificar-carteles.mjs`.
    this.brakes.hidden = !enSuelo || sinLetras || ESTO_ES_TACTIL;
    // El freno se retira en V1, no al despegar.
    //
    // V1 es la velocidad de decisión: el último instante en que queda pista
    // para pararse. Pasada, el despegue está comprometido y frenar deja de
    // ser una opción — así que el botón deja de estar. No es una comodidad:
    // es la única forma de enseñar qué es V1 a quien todavía no lee.
    //
    // Sigue apareciendo al aterrizar, porque ahí el motor está a ralentí y
    // frenar es justo lo que toca.
    /*
     * **Y esto solo pasa en la pista.**
     *
     * Faltaba mirar dónde está el avión, así que acelerando por una calle de
     * rodaje el freno se iba con la misma despedida que en la carrera de
     * despegue: «rodadura donde si acelero me quita la mano como para que
     * pueda despegar sobre pista R». Ahí no hay V1 que valga y quitarle el
     * freno a quien va rápido por una calle es exactamente lo contrario de lo
     * que hace falta.
     */
    /*
     * **Y solo si esto es un despegue.**
     *
     * «¿Por qué la retira si aumento la velocidad si lo que estoy haciendo es
     * aterrizar? Me marca V1 cuando debería decirme que bajara la velocidad.»
     * Exacto: en pista, rápido y con gas describe igual de bien una carrera de
     * despegue que una de aterrizaje en la que alguien acelera — y en la
     * segunda quitar el freno es justo lo contrario de lo que hace falta.
     *
     * **En un aterrizaje no hay V1.** V1 es el punto a partir del cual ya no
     * se puede abortar un despegue; después de tomar tierra no hay nada que
     * abortar, hay una pista que se acaba. Quién está en qué lo sabe el plan
     * de vuelo, no la velocidad.
     */
    // Empezar la carrera sí pide las cuatro cosas a la vez; seguir en ella, no.
    if (enDespegue && state.onRunway && throttle > 0.55)
      this.enLaCarrera = true;
    if (!enDespegue || (enSuelo && state.airspeed < 5))
      this.enLaCarrera = false;
    const despegando = this.enLaCarrera && state.airspeed > decisionSpeed;
    this.comprometido = despegando;
    // La tecla del freno, la que se enseña para la mano elegida.
    const tecla = this.teclaDe?.("brakes") ?? "";
    if (tecla && this.brakeKey.textContent !== tecla)
      this.brakeKey.textContent = tecla;
    this.brakeKey.classList.toggle(
      "motor__tecla--ancha",
      tecla.length > 1 || tecla === "␣",
    );

    /*
     * **Y con el dedo, el botón rojo sale en todos los peldaños.**
     *
     * Estaba atado a «no hay letras», porque en Taguató y arriba la idea era
     * enseñar la tarjeta con la tecla dibujada en vez del botón. Con teclado
     * eso está bien; con el dedo dejaba a esos dos peldaños **sin ninguna
     * forma de frenar**, y desde que se quitó el botón de texto de la capa
     * táctil —que decía «Frenos» en castellano fijo— eso pasó de discutible a
     * agujero. Un mando de seguridad no puede depender del peldaño.
     */
    /*
     * **Y el momento se marca en la pantalla, en grande y tenue.**
     *
     * V1 es el punto a partir del cual ya no se puede abortar un despegue: si
     * falla algo, se vuela y se resuelve en el aire. Es de los conceptos más
     * bonitos que tiene la aviación y hasta hoy solo se contaba quitando el
     * botón del freno, que se entiende **después**, no en el instante.
     *
     * «Ese V1 sí se podría mostrar incluso a los pequeños, pensaba en un V1
     * que parpadeara un poco en grande en casi toda la pantalla pero tenue.»
     * Y sí: no está ahí para leerse —a los cuatro años no se lee— sino para
     * marcar un momento, como el destello de un aro. Quien juegue esto durante
     * meses acabará sabiendo qué es V1, igual que acaba sabiendo qué es la I
     * del contacto o para qué sirve la manga.
     */
    this.destelloRestante = Math.max(0, this.destelloRestante - dt);
    if (despegando && !this.dijoV1) {
      this.dijoV1 = true;
      this.destellar("V1");
      this.velocidadesHandler?.("V1");
    } else if (
      /*
       * **Y detrás de V1 viene Vr, que es la que se usa de verdad.**
       *
       * V1 es de aviones grandes; en una avioneta la uve que se dice en voz
       * alta cada vez que se despega es esta: la velocidad a la que se tira
       * para levantar el morro. Cincuenta y cinco nudos en un 172, dos por
       * encima de la de decisión — o sea que llegan a un segundo una de otra,
       * y por eso Vr espera a que se apague el destello de V1 en vez de
       * salir encima. Ver `DURA_EL_DESTELLO`.
       */
      /*
       * **Y Vr no vuelve a preguntar si esto sigue siendo una carrera.**
       *
       * Lo hacía, y en un reactor eso se traga el aviso: en el 747 la de
       * decisión y la de rotación van a cinco nudos una de otra —ochenta y uno
       * y ochenta y seis metros por segundo, medido— o sea poco más de un
       * segundo, y el destello de V1 dura uno y medio. Cuando el destello se
       * apaga, el avión ya está en el aire y la carrera ha terminado: Vr se
       * perdía siempre. Haber cantado V1 **ya dice** que esto era un despegue;
       * lo único que falta es que la aguja pase.
       */
      this.dijoV1 &&
      !this.dijoVr &&
      ias >= this.vr &&
      this.destelloRestante <= 0
    ) {
      this.dijoVr = true;
      this.destellar("Vr");
      this.velocidadesHandler?.("Vr");
    } else if (
      /*
       * Y se rearma cuando de verdad se ha dejado de despegar: bien arriba, o
       * parado en el suelo. Con «en cuanto no toca la pista» bastaba un rebote
       * en la rotación para que V1 saliera dos veces en la misma carrera, y V1
       * hay uno por despegue — esa es toda su gracia.
       */
      (!enSuelo && state.heightAboveGround > 40) ||
      (enSuelo && state.airspeed < 5)
    ) {
      this.dijoV1 = false;
      this.dijoVr = false;
      this.enLaCarrera = false;
    }

    const escondeBoton =
      !enSuelo || (!sinLetras && !ESTO_ES_TACTIL) || despegando;

    // Y no se esfuma: **se va, y se ve adónde va.**
    //
    // Un botón que desaparece de golpe no enseña nada, o enseña que las
    // cosas se evaporan solas. Al llegar a V1 el freno sale volando hacia
    // arriba mientras la tarjeta de velocidad se enciende, que es lo más
    // parecido a decir «ya no puedes frenar, porque vas demasiado deprisa»
    // sin una sola palabra. Es una primera versión; la buena llevará su
    // animación y su voz.
    if (
      despegando &&
      enSuelo &&
      !this.brakesTouch.hidden &&
      this.brakeExit <= 0
    ) {
      this.brakeExit = BRAKE_EXIT;
      this.brakesTouch.classList.add("freno--se-va");
      this.root.querySelector(".picto")?.classList.add("picto--avisa");
    }
    if (this.brakeExit > 0) {
      this.brakeExit -= dt;
      if (this.brakeExit <= 0) {
        this.brakesTouch.classList.remove("freno--se-va");
        this.root.querySelector(".picto")?.classList.remove("picto--avisa");
      }
    }

    // Al ocultarlo se suelta, por si se ocultó con el dedo encima.
    if (escondeBoton && !this.brakesTouch.hidden) this.setBraking(false);
    // Mientras dura la despedida sigue en pantalla, aunque ya no frene.
    this.brakesTouch.hidden = escondeBoton && this.brakeExit <= 0;
    const pisado = braking > 0.05;
    this.brakes.classList.toggle("freno--pisado", pisado);
    this.brakesTouch.classList.toggle("freno--pisado", pisado);

    /*
     * **El tren y los flaps, que no se esconden al despegar.**
     *
     * El freno sí: en el aire no sirve de nada. Éstos dos son justamente los
     * que se tocan volando —el tren se mete al subir y se saca en final, los
     * flaps se mueven en los dos extremos— así que están puestos todo el rato.
     *
     * Y el del tren **solo donde hay tren que meter**: un entrenador de
     * escuela lleva las patas al aire, y un botón que no hace nada enseña que
     * los mandos son adorno. Lo dice el avión, no una lista. Ver
     * `hayPalancaDeTren` en `flight/input.ts`.
     */
    this.trenTouch.hidden = !this.hayTren;
    this.flapsTouch.hidden = false;
    /*
     * Y los tres estados del tren, que son la pregunta que se hizo jugando:
     * «¿en qué parte del panel veo que se está poniendo o quitando?». Dentro,
     * apagado; moviéndose, en ámbar; fuera y trabado, en verde. Los mismos
     * que las luces del cuadro, y con la misma regla: verde solo cuando de
     * verdad está trabado. Ver `luzDeTren` en `flight/tren.ts`.
     */
    const luz = luzDeTren(mandos?.tren ?? 1);
    this.trenTouch.classList.toggle("mando--fuera", luz === "fuera");
    this.trenTouch.classList.toggle("mando--moviendose", luz === "moviendose");
    this.flapsTouch.classList.toggle(
      "mando--fuera",
      (mandos?.flaps ?? 0) > 0.01,
    );

    // Alabeo y cabeceo los quieren dos consumidores —la tarjeta del horizonte
    // y el cuadro de mandos—, y solo uno de los dos existe a la vez. Se
    // calculan aquí una vez y no dentro de cada rama, que es como se acaba
    // teniendo dos definiciones del mismo signo.
    const bank = bankAngleOf(state.orientation);
    const pitch = pitchAngleOf(state.orientation);

    if (this.tablero.presente) {
      /*
       * Nudos y pies, siempre, sin pasar por el selector de unidades: un
       * anemómetro de verdad marca nudos aunque el resto de la pantalla esté
       * en kilómetros por hora. El instrumento no negocia.
       */
      const nudos = ias * 1.94384;
      this.tablero.medirAceleracion(nudos, dt);
      this.tablero.update(
        {
          estado: state,
          nudos,
          pies: state.position.y * 3.28084,
          fpm: state.verticalSpeed * 196.85,
          // Y la altura **sobre el suelo**, que es otra cosa: la del
          // radioaltímetro. En La Palma o El Hierro la diferencia con la del
          // altímetro son seiscientos metros de montaña.
          sobreElTerreno: state.heightAboveGround * 3.28084,
          alabeo: bank,
          cabeceo: pitch,
          sobreElSuelo:
            Math.hypot(state.velocity.x, state.velocity.z) * 1.94384,
          mach: esDeChorro(this.ficha)
            ? state.airspeed / velocidadDelSonido(state.position.y)
            : null,
          motores: Array.from({ length: this.ficha.motores }, () =>
            regimen(this.ficha, throttle, engineOn),
          ),
          flaps: mandos?.flaps ?? 0,
          tren: mandos?.tren ?? 1,
          reversa,
          v1: decisionSpeed * 1.94384,
          vr: this.vr * 1.94384,
          vref: this.vref * 1.94384,
          objetivo: mandos?.objetivo ?? null,
          viento: mandos?.viento ?? null,
          // La pérdida: marco rojo alrededor del horizonte, que es donde mira
          // quien ya está en apuros. Ver `cinta.ts` para el parpadeo.
          perdida: !state.onGround && state.alpha > this.ficha.aero.alphaStall,
          /*
           * Y el mundo, para la carta. Llegaba solo a las pantallas de la
           * cabina y por eso el cuadro plano seguía con la brújula sobre el
           * fondo vacío: «en Lanzarote no veo la pista».
           */
          mapa: mandos?.mapa ?? null,
          combustible: mandos?.combustible ?? null,
          presion: mandos?.presion ?? null,
        },
        dt,
      );
    }

    // El horizonte gira al revés que el avión y sube y baja con el cabeceo:
    // así el instrumento representa el mundo, no la máquina.
    if (this.horizon) {
      this.horizon.style.transform = `rotate(${(-bank * 180) / Math.PI}deg) translateY(${((pitch * 180) / Math.PI) * 1.6}px)`;
    }

    this.setWarning(state, runwayLeft);

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint.textContent = "";
    }
  }

  /**
   * Cuántos objetivos van y cuántos hay, como una fila de puntos.
   *
   * `null` esconde la fila: en vuelo libre no hay nada que contar.
   */
  setMissionProgress(progress: { done: number; total: number } | null): void {
    this.progressState = progress;
    this.paintProgress();
  }

  private paintProgress(): void {
    if (!this.progress) return;
    const progress = this.progressState;
    this.progress.hidden = progress === null;
    if (!progress) return;

    this.progress.innerHTML = Array.from(
      { length: progress.total },
      (_, index) =>
        `<span class="progreso__punto${index < progress.done ? " progreso__punto--hecho" : ""}"></span>`,
    ).join("");
  }

  /**
   * Los galones ganados en este vuelo.
   *
   * Se le da la lista entera y él añade los que falten: **los que ya estaban
   * no se vuelven a dibujar**, porque el galón nuevo entra con su animación y
   * rehacer la fila entera haría saltar a los cinco a la vez, que es
   * exactamente lo contrario de «aparecen de uno en uno».
   */
  setGalones(lista: readonly Galon[]): void {
    this.galonesState = lista;
    this.paintGalones();
  }

  private paintGalones(): void {
    if (!this.galones) return;
    const lista = this.galonesState;
    this.galones.hidden = lista.length === 0;
    if (!lista.length) {
      this.galones.innerHTML = "";
      return;
    }

    const svg = this.galones.querySelector("svg");
    const puestas = svg?.querySelectorAll(".manga__barra").length ?? 0;
    /*
     * **Las barras que ya estaban no se vuelven a dibujar.**
     *
     * La que llega entra con su animación, y rehacer la manga entera haría
     * saltar a las cinco a la vez, que es lo contrario de «aparecen de una en
     * una». Al rehacer el HUD —cambio de idioma o de peldaño— sí se repinta
     * todo, y ahí no hay animación que perder.
     */
    /*
     * **Y se repinta entera, marcando cuáles ya estaban.**
     *
     * Antes se le pegaba la barra nueva al final y las demás se quedaban
     * donde estaban. Eso solo vale mientras la separación no dependa de
     * cuántas hay, y depende: de la quinta en adelante se juntan para caber.
     * Ver `repartoDeBarras`.
     */
    this.galones.innerHTML = dibujarManga(
      lista.length,
      MANGA_ALTO,
      t("galon.manga"),
      svg ? Math.min(puestas, lista.length) : 0,
    );
  }

  /**
   * El final del vuelo, con lo que se llevó puesto.
   *
   * Se enseña al apagar el motor, que es cuando un vuelo termina de verdad.
   * La manga va grande —es lo único que hay que mirar— y la frase solo aparece
   * en los peldaños que leen: en Guyrami las barras **son** el mensaje.
   */
  mostrarFinDeVuelo(
    lista: readonly Galon[],
    frase: string,
    planoConTraza = "",
    reloj = "",
  ): void {
    if (!this.fin) return;
    this.ponerPlano(planoConTraza);
    this.ponerReloj(reloj);
    const final = reconocer(lista);
    const manga = pick(this.root, "fin-manga");
    manga.hidden = !final.manga;
    manga.innerHTML = final.manga
      ? dibujarManga(lista.length, MANGA_ALTO, t("galon.manga"))
      : "";
    const texto = pick(this.root, "fin-frase");
    texto.textContent = frase;
    texto.hidden = !frase;
    const otra = pick(this.root, "fin-otra");
    otra.setAttribute("aria-label", t("fin.otra"));
    pick(this.root, "fin-otra-texto").textContent = frase ? t("fin.otra") : "";
    this.fin.hidden = false;
    this.root.classList.add("hud--fin");
  }

  /**
   * Y el final que más importa: **has subido de grado**.
   *
   * Se enseña en la misma caja, con la hombrera del grado nuevo —no la de los
   * galones del vuelo— y su nombre. Hasta hoy esto pasaba en silencio: se
   * entraba al cuaderno un día cualquiera y ya ponía «Comandante», que es
   * tirar a la basura el único momento del juego que de verdad significa algo.
   *
   * Va con la manga grande y sin cifras, como todo lo demás de esta pantalla:
   * la barra nueva **es** el mensaje.
   */
  mostrarAscenso(barras: number, nombre: string, reloj = ""): void {
    if (!this.fin) return;
    this.ponerReloj(reloj);
    // El ascenso se enseña solo: es el único momento del juego que pasa una
    // vez, y la traza del vuelo que lo ganó no le añade nada.
    this.ponerPlano("");
    const manga = pick(this.root, "fin-manga");
    manga.hidden = false;
    manga.innerHTML = dibujarManga(barras, MANGA_ALTO, t("galon.manga"));
    const texto = pick(this.root, "fin-frase");
    texto.textContent = nombre;
    texto.hidden = !nombre;
    texto.classList.add("fin__frase--ascenso");
    const otra = pick(this.root, "fin-otra");
    otra.setAttribute("aria-label", t("fin.otra"));
    pick(this.root, "fin-otra-texto").textContent = nombre ? t("fin.otra") : "";
    this.fin.hidden = false;
    this.root.classList.add("hud--fin");
  }

  /**
   * El otro final: el percance.
   *
   * **Misma caja y mismo botón que el final bueno**, y eso es deliberado: un
   * niño aprende un sitio, no dos. Lo que cambia es el dibujo —la avioneta con
   * la hélice torcida, el del coche con cara de circunstancias— y que aquí no
   * hay manga que enseñar, porque el vuelo no llegó a su sitio.
   *
   * Los galones ganados **no se tocan**: se quedan en su rincón del HUD. Ver
   * `flight/percance.ts`.
   */
  mostrarPercance(dibujo: string, frase: string): void {
    if (!this.fin) return;
    this.ponerReloj("");
    // Un percance no enseña la traza: lo que hay que mirar es el dibujo de lo
    // que pasó, y una raya al lado solo repartiría la atención.
    this.ponerPlano("");
    const manga = pick(this.root, "fin-manga");
    manga.hidden = false;
    manga.innerHTML = dibujo;
    const texto = pick(this.root, "fin-frase");
    texto.textContent = frase;
    texto.hidden = !frase;
    const otra = pick(this.root, "fin-otra");
    otra.setAttribute("aria-label", t("fin.otra"));
    pick(this.root, "fin-otra-texto").textContent = frase ? t("fin.otra") : "";
    this.fin.hidden = false;
    this.root.classList.add("hud--fin");
  }

  /**
   * Pone —o quita— la fila de avioncitos de las horas voladas.
   *
   * Vacía en el percance: ahí lo que hay que mirar es lo que pasó, y una fila
   * de premios al lado del avión roto es exactamente el mensaje contrario.
   */
  private ponerReloj(svg: string): void {
    const caja = optional(this.root, "fin-reloj");
    if (!caja) return;
    caja.innerHTML = svg;
    caja.hidden = !svg;
  }

  /**
   * Pone —o quita— el plano con la traza en la pantalla de fin de vuelo.
   *
   * El SVG lo trae hecho quien lo llama: aquí no se sabe de aeródromos. Ver
   * `plano()` en `ui/hangar.ts`.
   */
  private ponerPlano(svg: string): void {
    const hueco = pick(this.root, "fin-plano");
    hueco.innerHTML = svg;
    hueco.hidden = !svg;
  }

  /**
   * El destello grande y tenue, con lo que se le diga.
   *
   * Va por CSS —se pone la clase y se quita al acabar la animación— porque lo
   * único que hace es aparecer y desaparecer, y para eso el navegador ya sabe
   * hacerlo mejor que nosotros con un temporizador.
   */
  destellar(texto: string): void {
    const v1 = this.root.querySelector('[data-hud="v1"]');
    if (!v1 || !texto) return;
    v1.textContent = texto;
    // Dos letras ocupan media pantalla; cuatro no caben. El tamaño sale del
    // largo para que «09» y «Vr» se lean igual de grandes sin desbordar.
    (v1 as HTMLElement).style.fontSize =
      texto.length > 2 ? "min(24vw, 30vh)" : "";
    this.destelloRestante = DURA_EL_DESTELLO;
    v1.classList.remove("v1--suena");
    // Forzar el reflujo, que si no la animación no vuelve a empezar.
    void (v1 as HTMLElement).offsetWidth;
    v1.classList.add("v1--suena");
  }

  /** Y se quita. Otro vuelo, otra manga. */
  cerrarFinDeVuelo(): void {
    if (this.fin) this.fin.hidden = true;
    pick(this.root, "fin-frase").classList.remove("fin__frase--ascenso");
    this.root.classList.remove("hud--fin");
  }

  /** Si está puesto ahora mismo. Para el banco de pruebas. */
  get finPuesto(): boolean {
    return !!this.fin && !this.fin.hidden;
  }

  /** Estado del sonido: el nivel y su etiqueta accesible. */
  setSoundLevel(nivel: AudioLevel["id"], label: string): void {
    this.soundState = { nivel, label };
    this.paintSound();
  }

  /** Quién vuelve a empezar cuando se toca el botón del final. */
  onOtroVuelo(handler: () => void): void {
    this.otroVuelo = handler;
  }

  private otroVuelo: (() => void) | null = null;

  /** Quién recibe el botón de freno táctil. */
  onBrake(handler: (pressed: boolean) => void): void {
    this.brakeHandler = handler;
  }

  /** Quién recibe los botones de motor: -1 baja, +1 sube, 0 suelta. */
  onThrottle(handler: (direction: number) => void): void {
    this.throttleHandler = handler;
  }

  private setBraking(pressed: boolean): void {
    this.brakeHandler?.(pressed);
  }

  /** De dónde sale el nombre de la tecla que se enseña para cada mando. */
  private teclaDe: ((accion: Accion) => string) | null = null;

  setKeySource(teclaDe: (accion: Accion) => string): void {
    this.teclaDe = teclaDe;
    this.tutor.setKeySource(teclaDe);
  }

  /** Quién abre la pantalla de mandos. */
  /**
   * Mide la barra de arriba y lo escribe donde la hoja lo pueda leer.
   *
   * Las tarjetas de dibujos flotan debajo de la barra, y la barra cambia de
   * alto: se parte en dos filas en cuanto los botones no caben, que en una
   * tablet de 720 px es siempre. Con la altura clavada a mano, ese día las
   * tarjetas se quedaban encima de los botones.
   *
   * Se vuelve a medir cuando cambia de tamaño —girar la tablet, abrir el
   * teclado del sistema— porque el número no es una constante: es una
   * consecuencia.
   */
  private medirLaBarra(): void {
    const barra = this.root.querySelector<HTMLElement>(".hud__arriba");
    if (!barra) return;
    const escribir = (): void => {
      const alto = Math.round(
        aPxDelHud(this.root, barra.getBoundingClientRect().height),
      );
      if (alto > 0) {
        this.root.style.setProperty("--alto-de-la-barra", `${alto}px`);
      }
    };
    /*
     * **Y lo ancha que es la columna de mandos**, para que el rincón de avisos
     * se ponga a su lado en las pantallas bajas. Se había escrito a mano —los
     * 116 de la tarjeta del destino— y la del motor mide 132 en un peldaño y
     * otra cosa en otro: el rincón quedaba encima del gas en ocho pantallas
     * de ocho. Cambia con lo que lleve puesto —el freno sale al tocar suelo—,
     * así que se observa.
     */
    const columna = this.root.querySelector<HTMLElement>(".hud__derecha");
    const escribirColumna = (): void => {
      if (!columna) return;
      const ancho = Math.round(
        aPxDelHud(this.root, columna.getBoundingClientRect().width),
      );
      this.root.style.setProperty("--columna-ancho", `${ancho}px`);
    };
    escribir();
    escribirColumna();
    this.barraObservada?.disconnect();
    if (typeof ResizeObserver === "undefined") return;
    const rincon = this.root.querySelector(".rincon");
    this.barraObservada = new ResizeObserver(() => {
      escribir();
      escribirColumna();
      /*
       * Y lo que ocupa todo lo de arriba, que también cambia: se medía una
       * sola vez al pintar, y los botones que se encienden después —el
       * piloto automático, el cinturón— parten la barra en dos filas. En un
       * teléfono, `--arriba-alto` se quedaba en la primera y los subtítulos
       * caían encima de la segunda. Mide también el rincón.
       */
      this.reservarArriba();
    });
    this.barraObservada.observe(barra);
    if (columna) this.barraObservada.observe(columna);
    if (rincon) this.barraObservada.observe(rincon);
  }

  /**
   * Los dos momentos del despegue, para quien quiera sonarlos o decirlos.
   *
   * El destello lo pone el HUD porque es pintura; **el sonido y la voz no son
   * suyos**, y hasta hoy no salían de ningún sitio: V1 se marcaba solo
   * quitando el botón del freno y con un destello mudo. Ver #105.
   */
  onVelocidades(handler: (cual: "V1" | "Vr") => void): void {
    this.velocidadesHandler = handler;
  }

  onKeys(handler: () => void): void {
    this.keysHandler = handler;
  }

  /** El botón de cámara: lo mismo que la tecla C, pero con el dedo. */
  onCamara(handler: () => void): void {
    this.camaraHandler = handler;
  }

  /** Y el de pausa, que no tenía tecla ni botón. */
  onPausa(handler: () => void): void {
    this.pausaHandler = handler;
  }

  /** El de las gafas de sol. Ver `flight/gafas.ts`. */
  onGafas(handler: () => void): void {
    this.gafasHandler = handler;
  }

  /** El de «qué hay que hacer». Ver `ui/pantalla-mision.ts`. */
  onMision(handler: () => void): void {
    this.misionHandler = handler;
  }

  /**
   * Qué más hay que cerrar al abrir el plano o el tiempo.
   *
   * El panel de la misión no lo lleva el HUD —lo lleva `Game`— pero es la
   * tercera lámina de las que solo puede haber una a la vez.
   */
  alAbrirUnaLamina(cb: () => void): void {
    this.otraLamina = cb;
  }

  /**
   * Enseña o esconde el botón de la misión.
   *
   * Nace escondido: sin misión no hay nada que mirar, y un botón que abre un
   * panel vacío enseña que el juego está roto. La misma regla que los galones
   * y que las gafas de sol.
   */
  setMisionVisible(hay: boolean): void {
    this.misionState = hay;
    this.mision.hidden = !hay;
  }

  /**
   * Enseña o esconde el botón de las gafas, y dice si están puestas.
   *
   * `aria-pressed` y no una etiqueta que cambie: es un interruptor, y un
   * lector de pantalla ya sabe decir «gafas de sol, activado». Cambiarle el
   * nombre según el estado —«ponerse» / «quitarse»— es lo que hace que un
   * lector diga dos cosas distintas sobre el mismo botón.
   */
  setGafas(ganadas: boolean, puestas: boolean): void {
    this.gafasState = { ganadas, puestas };
    this.gafas.hidden = !ganadas;
    this.gafas.setAttribute("aria-pressed", String(puestas));
    this.gafas.classList.toggle("gafas-boton--puestas", puestas);
  }

  /**
   * La luz de la torre: verde, roja o apagada.
   *
   * Apagada quiere decir que ahora mismo la torre no tiene nada que decirte,
   * que es lo normal durante casi todo el vuelo.
   */
  /**
   * Dónde está el compensador, de −1 a 1.
   *
   * Se enseña **solo cuando hay instrumentos**: en el peldaño del dibujo el
   * avión lo vuela el modelo sencillo, donde el cabeceo no es un timón sino
   * directamente cuánto sube, y ahí un compensador no compensa nada. Ver
   * `ControlInputs.trim`.
   *
   * Y se esconde en el centro, que es lo que hace que se vea cuando no lo
   * está: un indicador siempre encendido es un indicador que no se mira.
   */
  setTrim(valor: number): void {
    const caja = this.root.querySelector<HTMLElement>('[data-hud="trim"]');
    const marca = this.root.querySelector<HTMLElement>('[data-hud="trim-marca"]');
    if (!caja || !marca) return;
    const hay = this.instruments !== "none" && Math.abs(valor) > 0.005;
    caja.hidden = !hay;
    if (!hay) return;
    const v = Math.max(-1, Math.min(1, valor));
    // Arriba en la escala es morro arriba, así que el signo se invierte: en
    // pantalla la Y crece hacia abajo.
    marca.style.setProperty("--trim", String(-v));
    caja.setAttribute(
      "aria-label",
      `${t(v > 0 ? "hud.trimArriba" : "hud.trimAbajo")} ${Math.round(Math.abs(v) * 100)}%`,
    );
  }

  /**
   * Dónde está el gas que **mantiene el nivel**, de 0 a 1, o `null` si en este
   * modelo no hay uno.
   *
   * En el peldaño de los pequeños el motor *es* la velocidad y hay un punto
   * exacto en el que el avión ni sube ni baja: por encima sube solo, por
   * debajo planea. Esa es la lección entera de ese peldaño y **no había nada
   * que la señalara**, así que había que descubrirla a ciegas. Contado
   * jugando: «no puedo estabilizar el avión, o sube o baja, pero las flechas
   * no me lo mantienen estable».
   *
   * Y no lo mantienen porque ahí no es cosa de las flechas: es del gas. Con
   * la marca puesta se ve, y se entiende sin una palabra — que es exactamente
   * cómo tiene que entenderse a los cuatro años.
   *
   * En el modelo de coeficientes **no existe ese punto**: la velocidad de
   * equilibrio sale de la actitud, y ahí lo que mantiene el nivel es el
   * compensador. Por eso se apaga, en vez de enseñar una marca que mentiría.
   */
  ponerGasDeNivel(fraccion: number | null): void {
    this.gasDeNivel = fraccion;
    const m = this.root.querySelector<HTMLElement>('[data-hud="gas-nivel"]');
    if (!m) return;
    m.hidden = fraccion === null;
    if (fraccion !== null)
      m.style.setProperty("--nivel", `${Math.round(fraccion * 100)}%`);
  }

  /** Se recuerda: `render()` rehace el marcado. Ver `ponerGasDeNivel`. */
  private gasDeNivel: number | null = null;

  setLuzDeTorre(
    luz: "verde" | "roja" | null,
    /**
     * Qué dice la luz roja cuando no es la del punto de espera.
     *
     * La roja nació en tierra, mirándola desde el punto de espera, y por eso
     * dice «esperá acá». La orden de irse al aire la enciende **en el aire**,
     * y ahí «esperá acá» no quiere decir nada: se leía volando sobre unos
     * cerros, con la pista fuera de la pantalla. En el aire no se espera: se
     * sube y se vuelve a probar.
     */
    rojaDice: "esperar" | "alAire" = "esperar",
    /**
     * Quién es el que oye la luz. Las frases de la torre empiezan por el
     * indicativo —«Kilo Papa, podés entrar»— y sin él el hueco `{indicativo}`
     * salía tal cual en la tarjeta: se vio en la web, en Pettirossi.
     */
    indicativo = "",
    /** Si el avión está en el aire: ahí la verde es «podés aterrizar». */
    enElAire = false,
  ): void {
    const caja = this.torre;
    if (!caja) return;
    caja.hidden = luz === null;
    caja.classList.toggle("torre--verde", luz === "verde");
    caja.classList.toggle("torre--roja", luz === "roja");
    /*
     * Y lo ancha que es, para que la tarjeta se aparte de ella. Es la otra
     * mitad de lo que hace `medirse` en `ui/senal.ts`: cada una se corre media
     * anchura de la otra, así que juntas quedan centradas y separadas, y sola,
     * cada una se queda en el medio.
     */
    this.root.style.setProperty(
      "--torre-ancho",
      caja.hidden ? "0px" : `${caja.offsetWidth + 14}px`,
    );
    const texto = caja.querySelector('[data-hud="torre-texto"]');
    if (texto)
      texto.textContent =
        luz === "verde"
          ? t(
              comoSeDiceAqui(
                enElAire ? "torre.aterrizar" : "torre.verde",
                this.habla,
              ) as TranslationKey,
              { indicativo },
            )
          : luz
            ? t(
                comoSeDiceAqui(
                  rojaDice === "alAire" ? "palabra.alAire" : "torre.roja",
                  this.habla,
                ) as TranslationKey,
                { indicativo },
              )
            : "";
    // **Y una forma dentro de la luz**, no solo un color: la mano abierta de
    // parar o la flecha de seguir. Quien no distinga el rojo del verde —que es
    // uno de cada doce niños— tiene que enterarse igual, y quien no lea
    // también.
    const bombilla = caja.querySelector('[data-hud="torre-luz"]');
    if (bombilla)
      bombilla.innerHTML =
        luz === "verde"
          ? FLECHA_SEGUIR
          : luz
            ? // Y el dibujo va con las palabras: la mano de parar para el punto
              // de espera, la flecha de subir para la orden de irse al aire.
              rojaDice === "alAire"
              ? FLECHA_SEGUIR
              : MANO_PARAR
            : "";
  }

  /** De dónde saca el mapa el mundo que pinta. */
  ponerMapa(
    esc: import("../world/scenarios").Scenario,
    cota: (x: number, z: number) => number,
  ): void {
    this.mapaAtado = { esc, cota };
    this.mapa.bind(this.root, esc, cota);
  }

  /** De dónde saca el panel del tiempo lo que enseña y a quién avisa. */
  ponerTiempo(
    meteo: import("../world/meteo").Meteo,
    cambio: (m: import("../world/meteo").Meteo) => void,
    deVerdad: () => void,
  ): void {
    this.tiempoAtado = { meteo, cambio, deVerdad };
    this.tiempo.onCambio(cambio);
    this.tiempo.onDeVerdad(deVerdad);
    this.tiempo.poner(meteo);
  }

  /** Quién se entera de que se ha movido el sol. */
  ponerHora(hora: number, cambio: (h: number) => void): void {
    this.horaAtada = { hora, cambio };
    this.tiempo.onHora(cambio);
    this.tiempo.ponerHoraSinAvisar(hora);
    this.ponerLuzDeFuera(hora);
  }

  /**
   * Cuánta luz hay fuera, para que el cuadro se comporte como un cuadro.
   *
   * Un panel de verdad no se ve igual a mediodía que de noche: de día se lee
   * por la luz que le da y de noche **se enciende él**, con sus números
   * brillando sobre el negro. Pedido jugando: «el cuadro encendido en
   * oscuridad o más clarito en el momento claro».
   *
   * Va como variable de CSS y no como clase para que el paso sea continuo: el
   * anochecer dura, y un cuadro que salta de apagado a encendido de un
   * fotograma a otro se ve falso. Ver `cuantaLuz`.
   */
  private ponerLuzDeFuera(hora: number): void {
    this.root.style.setProperty("--luz-de-fuera", cuantaLuz(hora).toFixed(3));
  }

  /** Quién se entera de que han cambiado las nubes. */
  ponerCielo(
    cielo: number,
    cambio: (alturaM: number | null, tapadura: number) => void,
  ): void {
    this.cieloAtado = { cielo, cambio };
    this.tiempo.onNubes(cambio);
    this.tiempo.ponerCieloSinAvisar(cielo);
  }

  /** Quién vuelve al hangar. */
  onHangar(handler: () => void): void {
    this.hangarHandler = handler;
  }

  /**
   * Enciende la tarjeta de velocidad según se vaya en la aproximación.
   *
   * `null` la apaga, que es lo normal: fuera de la aproximación la velocidad
   * no tiene un valor «bueno» y pintarla de colores sería mentir.
   *
   * Y va en la tarjeta que ya existe en vez de en un instrumento nuevo porque
   * es la misma información: no hay que aprender a mirar otro sitio, hay que
   * mirar el de siempre y ver que ha cambiado de color.
   */
  /**
   * Enseña los fotogramas por segundo, si se han pedido con fps=1.
   *
   * Media móvil y no el instante: el número crudo baila tanto que no se puede
   * leer, y lo que hace falta saber es si esto va a sesenta o a diez.
   */
  mostrarFps(
    dt: number,
    coste?: { llamadas: number; triangulos: number },
  ): void {
    if (!this.fps || this.fps.hidden) return;
    const ahora = dt > 0 ? 1 / dt : 0;
    this.fpsMedia += (ahora - this.fpsMedia) * Math.min(1, dt * 3);
    /*
     * Y con lo que cuesta cada cuadro, que es lo que dice **por dónde** se va
     * el tiempo. Los fotogramas solos dicen que va lento; las llamadas de
     * dibujo y los triángulos dicen si es por dibujar demasiadas cosas o por
     * dibujar cosas demasiado gordas, y son arreglos distintos.
     */
    const n = (v: number): string =>
      v >= 1e6
        ? `${(v / 1e6).toFixed(1)}M`
        : v >= 1e3
          ? `${Math.round(v / 1e3)}k`
          : `${v}`;
    this.fps.textContent = coste
      ? `${Math.round(this.fpsMedia)} fps · ${coste.llamadas} dibujos · ${n(coste.triangulos)} △`
      : `${Math.round(this.fpsMedia)} fps`;
  }

  /** Enciende el contador. Lo llama el juego si se pidió por la dirección. */
  pedirFps(): void {
    this.conFps = true;
    if (this.fps) this.fps.hidden = false;
  }

  setBandaDeVelocidad(estado: "lento" | "bien" | "rapido" | null): void {
    // Se guarda para el pictograma, que es lo único que se ve en los peldaños
    // sin cifras. La tarjeta de abajo solo existe en Taguato.
    this.bandaActual = estado;
    const c = this.tarjetaVelocidad?.classList;
    if (!c) return;
    c.toggle("medidor--lento", estado === "lento");
    c.toggle("medidor--bien", estado === "bien");
    c.toggle("medidor--rapido", estado === "rapido");
  }

  /** Quién abre los créditos. Ver el botón en el marcado. */
  onCredits(handler: () => void): void {
    this.creditsHandler = handler;
  }

  /**
   * Quién atiende al tren y a los flaps cuando se tocan desde fuera.
   *
   * Lo mismo que hace el botón de dentro de la cabina, y por el mismo camino:
   * dos sitios que bajaran flaps con dos cuentas distintas sería la vía rápida
   * a que un día dijeran cosas distintas. Ver `pulsarMandoDeCabina`.
   */
  onMandoDeCabina(handler: (cual: "tren" | "flaps") => void): void {
    this.alTocarMando = handler;
  }

  /** Quién abre el esquema de cómo vuela un ala. */
  onAla(handler: () => void): void {
    this.alaHandler = handler;
  }

  /** Y quién abre el cuaderno de vuelo. */
  onCuaderno(handler: () => void): void {
    this.cuadernoHandler = handler;
  }

  onSoundClick(handler: () => void): void {
    this.soundHandler = handler;
  }

  private paintSound(): void {
    if (!this.sound) return;
    this.sound.innerHTML = ALTAVOZ[this.soundState.nivel];
    this.sound.setAttribute("aria-label", this.soundState.label);
    this.sound.setAttribute(
      "aria-pressed",
      String(this.soundState.nivel === "mudo"),
    );
  }

  /**
   * La aeronave y el modelo que vuelan hoy: de ellos sale la escala.
   *
   * Los dos, y no solo la aeronave: el mismo avión en el peldaño de los
   * pequeños y en el de los mayores tiene techos distintos, y la escala tiene
   * que acabar donde acaba el avión que se está volando.
   */
  setAeronave(
    vref: number,
    vmax = Infinity,
    vr = Infinity,
    /**
     * Y la ficha entera, que es de donde sale el cuadro de mandos.
     *
     * Se rehace el panel solo si **cambia de aeronave**: `setAeronave` se llama
     * también al cambiar de idioma o de peldaño, y rehacer el marcado en cada
     * una de esas sería tirar y volver a montar seis esferas por nada.
     */
    ficha?: AircraftConfig,
  ): void {
    this.vref = vref;
    this.vmax = vmax;
    this.vr = vr;
    if (ficha && ficha.id !== this.ficha.id) {
      this.ficha = ficha;
      this.render();
    }
  }

  /**
   * Cómo se habla en el aeródromo de hoy.
   *
   * Lo llama el juego al montar el escenario, y lo mira el cartel de la luz de
   * la torre. Ver `i18n/habla.ts`.
   */
  /**
   * Enciende o apaga el botón del piloto automático.
   *
   * El botón dice en qué posición está, que es lo que hace que sea un mando y
   * no un disparador: un piloto automático que no se ve si está puesto es la
   * forma más rápida de que alguien crea que el avión se pilota solo cuando
   * no. Ver `flight/piloto-automatico.ts`.
   */
  ponerPilotoAutomatico(puesto: boolean): void {
    const b = this.root.querySelector<HTMLElement>('[data-hud="piloto-auto"]');
    b?.setAttribute("aria-pressed", String(puesto));
    b?.classList.toggle("boton--puesto", puesto);
  }

  /** Si este peldaño lo trae. Se recuerda: `render()` rehace el marcado. */
  private hayPilotoAuto = false;

  /** Y si este avión lo lleva, para enseñar el botón. */
  ponerHayPilotoAutomatico(hay: boolean): void {
    this.hayPilotoAuto = hay;
    const b = this.root.querySelector<HTMLElement>('[data-hud="piloto-auto"]');
    if (b) b.hidden = !hay;
  }

  /** Quién se entera de que han tocado el botón del piloto automático. */
  private destinoHandler: (() => void) | null = null;

  /** Quién se entera de que se ha tocado la tarjeta del destino. */
  onDestino(fn: () => void): void {
    this.destinoHandler = fn;
  }

  private pilotoAutoHandler: (() => void) | null = null;

  onPilotoAutomatico(fn: () => void): void {
    this.pilotoAutoHandler = fn;
  }

  /** Quién se entera de que han tocado el interruptor del cinturón. */
  private cinturonHandler: (() => void) | null = null;

  onCinturon(fn: () => void): void {
    this.cinturonHandler = fn;
  }

  /**
   * Y si el interruptor del cinturón está puesto a mano.
   *
   * Se enseña en el propio botón, que es donde se mira: puesto a mano se queda
   * encendido, y en automático se apaga. Un mando que no dice en qué posición
   * está no es un mando.
   */
  ponerMandoDeCinturon(aMano: boolean): void {
    const b = this.root.querySelector<HTMLElement>(
      '[data-hud="cinturon-mando"]',
    );
    b?.setAttribute("aria-pressed", String(aMano));
    b?.classList.toggle("boton--puesto", aMano);
  }

  /**
   * Enciende o apaga el cartel del cinturón.
   *
   * No lleva texto traducido a propósito: es un cartel, y un cartel de cabina
   * es un dibujo iluminado. El que lo entiende lo entiende y el que no, aprende
   * que se enciende cuando se mueve — que es exactamente lo que aprende quien
   * vuela por primera vez.
   */
  /**
   * Y un destello del cartel, para que tocar el interruptor **se note**.
   *
   * En tierra el cartel ya está encendido siempre, así que ponerlo a mano no
   * cambiaba nada más que el color del botón. El interruptor tiene que
   * responder aunque el cartel ya estuviera como se pide: parpadea, que es lo
   * que hace un cartel de verdad cuando alguien lo toca.
   */
  destellarCinturon(): void {
    const caja = this.root.querySelector<HTMLElement>('[data-hud="cinturon"]');
    if (!caja) return;
    caja.classList.remove("cinturon--destello");
    void caja.offsetWidth;
    caja.classList.add("cinturon--destello");
  }

  ponerCinturon(encendido: boolean): void {
    const caja = this.root.querySelector<HTMLElement>('[data-hud="cinturon"]');
    if (caja) caja.hidden = !encendido;
  }

  /**
   * Y si este avión lleva cartel del cinturón, para enseñar su interruptor.
   *
   * El cartel se esconde y se enseña según se enciende; el interruptor tiene
   * que estar **siempre** en los aviones con pasaje, porque si solo apareciera
   * con el cartel puesto no habría forma de ponerlo. Ver `flight/cinturon.ts`.
   */
  /**
   * Enciende y apaga las señales luminosas del cuadro.
   *
   * El HUD no decide cuáles: le pasa el estado entero al tablero, que sabe qué
   * luces hay y en qué orden van. Ver `flight/avisos-de-cabina.ts`.
   */
  ponerLucesDeAviso(estado: EstadoDeAvisos): void {
    const raiz = this.root.querySelector('[data-hud="tablero"]');
    if (raiz) this.tablero.ponerLucesDeAviso(raiz, estado);
  }


  /** Si este avión lleva pasaje. Se recuerda, por lo mismo. */
  private hayCinturon = false;

  ponerHayCinturon(hay: boolean): void {
    this.hayCinturon = hay;
    const b = this.root.querySelector<HTMLElement>(
      '[data-hud="cinturon-mando"]',
    );
    if (b) b.hidden = !hay;
  }

  setHabla(habla: Habla): void {
    this.habla = habla;
  }

  setBadge(text: string): void {
    this.badgeText = text;
    this.badge.textContent = text;
  }

  /** Mensaje efímero: cambio de modo, de cámara, de idioma. */
  /**
   * Enseña lo que se acaba de oír por la radio, y lo quita solo.
   *
   * No usa `flash` a propósito: el destello es para avisos —cosas que hay que
   * atender ya— y esto es lo contrario, alguien hablando de lo suyo. Ponerlo
   * en el mismo sitio y con la misma pinta enseñaría a un chico que la radio
   * de otro avión le manda algo.
   */
  /**
   * Pone la firma de la fotografía, o la quita si no hay ninguna.
   *
   * Se llama por fotograma y compara antes de escribir: la atribución cambia
   * al moverse —cada tesela trae la suya— pero cambia despacio, y reescribir
   * el DOM sesenta veces por segundo para poner lo mismo no lo hace nadie.
   */
  setAtribucion(texto: string): void {
    const caja = this.atribucionCaja;
    if (!caja || texto === this.atribucionPuesta) return;
    this.atribucionPuesta = texto;
    caja.textContent = texto;
    caja.hidden = texto === "";
  }

  radio(texto: string, segundos = 6): void {
    const caja = this.radioCaja;
    if (!caja) return;
    /*
     * **Primero se enseña y después se escribe.**
     *
     * Es `role="status"`, o sea una región viva: lo que anuncia un lector de
     * pantalla es el **cambio** de contenido. Escribiendo con la caja todavía
     * escondida, el cambio ocurre sobre algo que no está en el árbol visible y
     * no se anuncia nunca; quitar el `hidden` después no vuelve a contarlo.
     * Quien depende del lector se perdía entera la radio.
     */
    caja.hidden = false;
    caja.textContent = texto;
    window.clearTimeout(this.radioReloj);
    this.radioReloj = window.setTimeout(() => {
      caja.hidden = true;
    }, segundos * 1000);
  }

  flash(text: string, seconds = 2.4): void {
    this.hint.textContent = text;
    this.hintTimer = seconds;
  }

  /**
   * Aviso de peligro, por tres canales a la vez: color en el borde de la
   * pantalla, una flecha que señala adónde hay que llevar la palanca, y el
   * texto. Los dos primeros funcionan sin saber leer, que es el caso de la
   * jugadora más joven. Ver AGENTS.md, regla 2.
   */
  private setWarning(state: FlightState, runwayLeft: number): void {
    let text = "";
    let arrow = "";
    let blink = false;
    /*
     * **El aviso y su texto son dos cosas.**
     *
     * `hay` dice si hay peligro y manda sobre el color, la flecha y el
     * parpadeo, que funcionan sin saber leer. El texto es el tercer canal y
     * sube con la escalera: ninguno en Guyrami, una palabra en Tukã, la frase
     * de Taguato en adelante. Antes iba todo junto, así que a los cuatro años
     * se leía «¡Pérdida! Bajá el morro» — o, peor, se dejaba de leer y con él
     * se apagaba el borde rojo. Ver `flight/escalera.ts`.
     */
    let corta: TranslationKey | null = null;

    if (state.crashed) {
      text = t("hud.crashed");
      corta = "palabra.roto";
      arrow = "↺";
    } else if (avisaLaPerdida(state)) {
      text = t("hud.stall");
      corta = "palabra.baja";
      arrow = "↓";
      blink = true;
    } else if (this.terreno !== null && !state.onGround) {
      text = t("hud.pullUp");
      corta = "palabra.subi";
      arrow = "↑";
      blink = true;
    } else if (!this.comprometido && runningOutOfRunway(state, runwayLeft)) {
      /*
       * **Y pasado V1, no.** Salía en la carrera de despegue de cualquier pista
       * corta —rápido, en el suelo y con poca pista delante es lo que es un
       * despegue—: en Yvytu Rape la mano con la flecha de frenar aparecía a la
       * vez que el destello de V1, y en el reactor «Runway ending» a la vez
       * que «ya volamos, seguí». Pasado V1 se vuela pase lo que pase; el aviso
       * es para la carrera de aterrizaje y para quien aborta antes de V1.
       */
      // Se puede rodar por el campo hasta el fin del mundo sin que pase nada,
      // que en el peldaño de los pequeños está bien. Pero que no avise es
      // otra cosa: en un avión de verdad, quedarse sin pista es **la**
      // decisión, y aquí no se anunciaba de ninguna manera.
      text = t("hud.runwayEnd");
      corta = "palabra.frena";
      arrow = "↤";
      blink = true;
    }
    const hay = text !== "";
    const canales = canalesDe(this.escalera);
    if (!canales.texto) text = "";
    else if (canales.corto && corta) text = t(corta);
    /*
     * Y **declarado en el marcado**, que es cómo se comprueba desde fuera sin
     * saber en qué idioma está el juego: contar palabras no vale —«Runway
     * ending» son dos y «¡Se acaba la pista!» son cuatro, y las dos son la
     * frase entera—. El banco lee esto y comprueba que el peldaño que llega
     * del tramo es el que acaba mandando aquí.
     */
    this.warning.dataset.escalera = !canales.texto
      ? "sin-texto"
      : canales.corto
        ? "corto"
        : "largo";

    // **Cuando hay un aviso, el tutor se calla.** El cartel del tutor va fijo
    // sobre el fondo de la pantalla y tapaba el aviso de que se acaba la
    // pista, que es justo el momento en que hay que mirarlo. Y no se arregla
    // subiendo capas: dos carteles a la vez son ruido, y de los dos manda el
    // aviso. La lección puede esperar diez segundos; la pista, no.
    this.root.classList.toggle("hud--avisando", hay);

    /*
     * **Solo se escribe cuando cambia.**
     *
     * Esto corre una vez por fotograma y reasignaba el texto siempre, aunque
     * fuera el mismo. El elemento es `role="alert"` con `aria-live="assertive"`
     * —el papel que dice «interrumpí lo que estés leyendo y decí esto»— así
     * que eran **sesenta interrupciones por segundo** a quien usa lector de
     * pantalla mientras hubiera un aviso puesto. Un aviso que no calla no
     * avisa: impide oír.
     */
    if (this.warningText.textContent !== text) {
      this.warningText.textContent = text;
    }
    if (this.warningArrow.textContent !== arrow) {
      this.warningArrow.textContent = arrow;
    }
    this.warning.classList.toggle("aviso-hud--visible", hay);
    this.warning.classList.toggle("aviso-hud--parpadeo", blink);
    this.vignette.classList.toggle("vineta--activa", hay);
  }
}

/** Una tarjeta de instrumento: abreviatura, número, unidad y glosa. */
function gauge(
  name: string,
  instrument: string,
  gloss: string,
  unit: string,
): string {
  return `
    <div class="tarjeta medidor" data-hud="tarjeta-${name}">
      <span class="medidor__etiqueta">${instrument}</span>
      <span class="medidor__valor"><span data-hud="${name}">0</span
        ><span class="medidor__unidad">${unit}</span></span>
      <span class="medidor__glosa">${gloss}</span>
    </div>
  `;
}

/**
 * Arco de aguja para el peldaño pictórico: sin una sola cifra.
 *
 * Es un `conic-gradient` de CSS, así que no hay canvas, ni SVG, ni un solo
 * byte de imagen. La banda verde marca dónde está bien y la roja dónde no,
 * que es toda la lectura que necesita alguien de siete años.
 */
function optional(root: HTMLElement, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-hud="${name}"]`);
}

function pick(root: HTMLElement, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-hud="${name}"]`);
  if (!element) throw new Error(`Falta el elemento del HUD: ${name}`);
  return element;
}

/**
 * Aviso de proximidad del suelo.
 *
 * No avisa por estar bajo —volar rasante sobre el valle es media gracia del
 * juego— sino por **ir a chocar**: mide cuánto falta para llegar al suelo al
 * ritmo al que se está bajando. Es como funciona un GPWS de verdad, y tiene
 * la ventaja de que no salta al pasar rozando una loma en horizontal.
 *
 * Va por el mismo canal que la pérdida: flecha, viñeta roja y palabra. Los
 * dos primeros funcionan sin saber leer.
 */
/**
 * ¿Se está acabando la pista?
 *
 * Solo rodando y solo yendo deprisa: parado o a paso de peatón no hay nada
 * que avisar, y en el aire tampoco. El umbral va en segundos y no en metros,
 * porque lo que importa es **cuánto queda para llegar**, no cuánto falta.
 */
/**
 * ¿Se acaba la pista antes de que se pueda parar?
 *
 * **No es una cuenta de segundos, es una cuenta de frenada**, y ese fue el
 * error. Avisaba cuando quedaban cinco segundos de pista: a ciento cincuenta
 * por hora son doscientos metros, y en doscientos metros una avioneta a esa
 * velocidad **no para**. Un aviso que llega cuando ya no se puede hacer nada
 * no es un aviso, es un epitafio — y en el vídeo se ve exactamente eso: la
 * pista entera consumida y el avión saliéndose por el final.
 *
 * La cuenta buena es la de siempre: lo que se recorre mientras uno reacciona,
 * más `v²/2a`. Y se avisa con un tercio de margen encima, porque quien está a
 * los mandos tiene cinco años y el freno hay que encontrarlo.
 */
function runningOutOfRunway(state: FlightState, metresLeft: number): boolean {
  if (!state.onGround || state.crashed) return false;
  if (state.airspeed < 8) return false;
  const v = state.airspeed;
  return metresLeft < (v * REACCION + (v * v) / (2 * FRENADA)) * MARGEN_PISTA;
}

/** Lo que se tarda en reaccionar y encontrar el freno, s. */
const REACCION = 1.5;

/** Lo que frena una avioneta en asfalto seco, m/s². */
const FRENADA = 2.5;

/** Y cuánto antes se avisa de lo justo. */
const MARGEN_PISTA = 1.35;

