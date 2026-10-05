/**
 * Las vistas de fuera: la de detrás y las dos de ala.
 *
 * Comparten todo lo que cuesta —el suavizado, el retroceso por aceleración, el
 * traqueteo de pista y el suelo que no se puede atravesar— y se distinguen en
 * dos cosas: **desde dónde se mira** y **a dónde**. Por eso es una clase con
 * tres configuraciones y no tres clases con el mismo cuerpo copiado: lo que se
 * duplica se corrige en una copia y no en la otra.
 */

import { Vector3, type PerspectiveCamera } from "three";
import type { FlightState } from "../flight/model";
import { fovConVelocidad, type CameraRig, type Contexto } from "./tipos";

/** Lo deprisa que la posición alcanza la que se pide, 1/s. */
const SUAVIZADO = 7;

/** Cuánto retrocede la cámara por cada m/s² de aceleración. */
const ACCELERATION_LAG = 0.9;
/** Amplitud del traqueteo de pista, en metros. */
const SHAKE_AMPLITUDE = 0.42;
/** Velocidad, en m/s, a la que el traqueteo llega a su máximo. */
const SHAKE_REFERENCE = 30;
/** Segundos que tarda el traqueteo en apagarse al despegar. */
const SHAKE_FADE = 0.2;

/**
 * Cuánto por delante mira la cámara de detrás, y su mínimo.
 *
 * Miraba a donde el avión estaría un tercio de segundo después —diez metros—,
 * o sea prácticamente al avión, y eso lo dejaba clavado en el centro de la
 * pantalla **encima justo de la pista**: en corta final, un fuselaje a
 * dieciséis metros tapa exactamente los quince píxeles que mide una pista de
 * hierba de dieciocho metros de ancha a medio kilómetro. «No se ve dónde tengo
 * que tomar tierra», y no se veía porque lo tapaba la propia avioneta.
 *
 * Mirando lejos, la línea de visión se levanta y el avión baja al tercio de
 * abajo del cuadro: sigue viéndose entero —hace falta para saber cómo va— y
 * por encima de él aparece hacia dónde va, que es lo que hay que mirar para
 * aterrizar. Es lo que hace la cámara de cualquier juego de conducción.
 *
 * La distancia crece con la velocidad porque la cabeza mira más lejos cuanto
 * más deprisa se va, y tiene suelo para que rodando por la plataforma —donde
 * lo que importa está a veinte metros— la cámara no se vaya al horizonte.
 */
const MIRA_LEJOS = 2.4;
const MIRA_LO_MINIMO = 32;

/**
 * Dónde va la cámara de detrás, en coordenadas del avión.
 *
 * Más alta y algo más atrás que en la primera versión: estaba a la altura del
 * avión y el fuselaje tapaba justo el centro de la pantalla, que es donde uno
 * quiere mirar para saber adónde va.
 *
 * Aparte porque **también lo pregunta el coche del sígame**: lo que el lomo
 * del avión tapa desde aquí es lo que decide a cuánto se tiene que poner para
 * que quien juega lo vea. Ver `distanciaALaVista`.
 *
 * **De la envergadura, y no del largo**, al revés que las de costado y la de
 * frente, y por el mismo motivo que ellas: la distancia sale de lo que hay que
 * encuadrar. De costado ocupa la pantalla el fuselaje de morro a cola; desde
 * detrás, el ala de punta a punta.
 *
 * ## Y en tierra, en los que llevan frenos de tierra, más cerca
 *
 * Volando hace falta el aire de alrededor —el horizonte, la actitud, hacia
 * dónde se va—, y el avión ocupa un tercio del ancho. En tierra lo que pasa,
 * pasa en el ala: al tocar se levantan los frenos de tierra, y desde aquí no
 * se veían. En el JAZ 120 la cámara iba a ciento dos metros y cada panel
 * levantado ocupaba entre dos y cuatro píxeles de alto, casi de canto.
 * Enrique pidió la cámara **algo más cerca y algo más baja en tierra** en los
 * aviones grandes, y son estos los que los llevan.
 *
 * - `cerca`, de 0 —volando— a 1 —en tierra—, la acerca **sin cambiar el
 *   ángulo desde el que se mira**: así baja también, en metros, y el lomo
 *   tapa lo mismo que tapaba. Hasta donde las puntas del ala caben todavía en
 *   una tablet de 4:3 sin meterse debajo de los botones, y el coche del sígame
 *   se sigue viendo por encima de la deriva sin irse más allá de su tope.
 * - `bajo`, de 0 a 1, baja el ángulo **mientras los frenos de tierra están
 *   fuera**. Un panel levantado se ve desde atrás por lo que su ángulo le saca
 *   al de la cámara —cuarenta y cinco grados menos veintiuno era casi de
 *   canto—, así que bajar la cámara es lo que más lo abre. Solo entonces,
 *   porque rodando detrás del coche la deriva lo taparía: cuando se rueda, los
 *   paneles ya se recogieron al meter gas. Ver `palanca-de-aerofrenos.ts`.
 */
export function sitioDeLaCola(
  envergadura: number,
  cerca = 0,
  bajo = 0,
): { y: number; z: number } {
  const lejos = envergadura * (DETRAS + (DETRAS_EN_TIERRA - DETRAS) * cerca);
  const angulo = ANGULO_DE_LA_COLA + (ANGULO_CON_FRENOS - ANGULO_DE_LA_COLA) * bajo;
  return { y: lejos * Math.tan(angulo), z: lejos };
}

/**
 * Cuántas envergaduras por detrás va la de cola volando, y en tierra.
 *
 * **La de tierra, medida otra vez en una tablet de 4:3 con dedo** (punto 254):
 * a 1,15 la punta derecha del JAZ 90 quedaba debajo de la caja del gas, que
 * con el HUD táctil empieza al 76 % del ancho. A 1,26 las dos puntas caben
 * con un margen, y el avión sigue más cerca que volando, que es lo que se
 * pidió.
 */
const DETRAS = 1.6;
const DETRAS_EN_TIERRA = 1.26;

/**
 * El ángulo desde el que mira la de cola, rad: seis décimas de envergadura de
 * alto a uno coma seis de distancia, veintiún grados. Y en tierra con los
 * frenos fuera, trece: el panel de cuarenta y cinco grados se abre de 24 a 32
 * grados vistos. Y no menos: a trece la punta de la deriva ya llega al
 * horizonte, y más abajo se comería la pista de delante, que es adonde se va.
 */
const ANGULO_DE_LA_COLA = Math.atan2(0.6, DETRAS);
const ANGULO_CON_FRENOS = (13 * Math.PI) / 180;

/**
 * Lo que tarda la de cola en acercarse al tocar y en alejarse al despegar, s,
 * y en bajar cuando salen los frenos de tierra. **Sin saltos**: un tirón de
 * cámara justo al tocar es lo último que hace falta en el momento en que más
 * se mira. Con su arranque y su frenada suaves —ver `rampa`—, y encima del
 * suavizado de la posición, que ya va aparte.
 */
const TARDA_AL_TOCAR = 2.5;
const TARDA_AL_DESPEGAR = 3;
const TARDA_EN_BAJAR = 1.5;

/** Un paso de una rampa de 0 a 1 que tarda `tarda` s; `NaN`, sin empezar. */
function rampa(ahora: number, meta: number, dt: number, tarda: number): number {
  if (!Number.isFinite(ahora)) return meta;
  const paso = dt / tarda;
  return Math.abs(meta - ahora) <= paso ? meta : ahora + Math.sign(meta - ahora) * paso;
}

/** Con arranque y frenada: la rampa lineal pasada por una curva suave. */
function suave(t: number): number {
  const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  return x * x * (3 - 2 * x);
}

/** Desde dónde mira cada una de las tres. */
export type Sitio = "cola" | "derecha" | "izquierda" | "morro";

export class CamaraDeFuera implements CameraRig {
  readonly muestraElAvion = true;
  private readonly sitio: Sitio;

  /** Aceleración longitudinal filtrada, para el retroceso. */
  private surge = 0;
  private ultimaVelocidad = 0;
  /** Cuánto traqueteo hay ahora mismo, de 0 a 1. Se apaga solo al despegar. */
  private shake = 0;
  private relojDeTraqueteo = 0;
  /**
   * Cuánto se ha acercado la de cola por ir en tierra, y cuánto ha bajado por
   * los frenos de tierra, de 0 a 1 en rampa. `NaN` hasta el primer fotograma:
   * al abrir el juego en el puesto ya está cerca, sin acercarse delante de
   * nadie. Ver `sitioDeLaCola`.
   */
  private enTierra = Number.NaN;
  private conFrenos = Number.NaN;

  // Vectores de trabajo, reutilizados: uno por fotograma sería basura.
  private readonly offset = new Vector3();
  private readonly deseada = new Vector3();
  private readonly mirando = new Vector3();

  constructor(sitio: Sitio) {
    this.sitio = sitio;
  }

  update(
    camera: PerspectiveCamera,
    state: FlightState,
    dt: number,
    ctx: Contexto,
  ): void {
    // Aceleración longitudinal, filtrada. Sin filtrar salta con cada subpaso
    // del modelo y la cámara temblaría.
    const bruta = dt > 0 ? (state.airspeed - this.ultimaVelocidad) / dt : 0;
    this.ultimaVelocidad = state.airspeed;
    this.surge += (Math.min(bruta, 6) - this.surge) * Math.min(1, dt * 4);

    if (this.sitio === "morro") {
      /*
       * **De frente, que es como se mira un avión.**
       *
       * Pedida así: «un POV para ver el avión de frente, podría quedar
       * bonito». Y no es solo bonito: de frente es donde se lee el diedro del
       * ala, dónde van los motores y **de qué lado viene** —la verde a tu
       * izquierda quiere decir que te va a pasar por ahí—, que es media
       * lección de las luces de posición.
       *
       * Delante y algo por encima del morro, y mirando hacia atrás: el avión
       * viene hacia la cámara, que es lo que hace que se vea venir.
       *
       * **Y la distancia sale del largo, no de la envergadura.** Sacada de la
       * envergadura, el 747 quedaba a sesenta y cinco metros del origen y
       * treinta del morro: en captura, el radomo ocupando media pantalla y el
       * avión saliéndose por los cuatro lados. Delante lo que hay que librar
       * es el fuselaje entero, y eso lo mide el largo — el mismo criterio que
       * las de costado, por el mismo motivo.
       */
      const lejos = Math.max(ctx.aircraft.largo * 1.6, 26);
      this.offset.set(0, ctx.aircraft.chord * 1.4, -lejos);
    } else if (this.sitio === "cola") {
      // En tierra, más cerca; con los frenos de tierra fuera, más baja. Solo
      // en el avión que los lleva. Ver `sitioDeLaCola`.
      const frenos = ctx.frenosDeTierra;
      const lleva = frenos != null;
      const tocando = lleva && state.onGround;
      const metaTierra = tocando ? 1 : 0;
      this.enTierra = rampa(
        this.enTierra,
        metaTierra,
        dt,
        metaTierra > (this.enTierra || 0) ? TARDA_AL_TOCAR : TARDA_AL_DESPEGAR,
      );
      this.conFrenos = rampa(
        this.conFrenos,
        tocando ? Math.max(0, Math.min(1, frenos)) : 0,
        dt,
        TARDA_EN_BAJAR,
      );
      const cola = sitioDeLaCola(
        ctx.aircraft.wingSpan,
        suave(this.enTierra),
        suave(this.conFrenos),
      );
      this.offset.set(0, cola.y, cola.z);
    } else {
      /*
       * El mismo sitio a un lado y al otro: lo único que cambia es de qué
       * costado se mira.
       *
       * **Y de lejos, que es lo que faltaba.** La distancia salía de la
       * envergadura casi a uno por uno: la cámara quedaba a veintisiete metros
       * de un avión de veintiséis, o sea con el aparato ocupando la pantalla
       * de lado a lado y cortado por los dos extremos. Lo que se veía era una
       * plancha gris con la deriva asomando, y quien lo jugó lo dijo así:
       * «¿me has vuelto a poner los aviones asquerosamente diseñados de hace
       * semanas?». Era el modelo de siempre, cargado y sin tocar — visto desde
       * dentro del ala.
       *
       * Y la medida que manda es **el largo**, no la envergadura: de costado
       * lo que ocupa la pantalla es el fuselaje de morro a cola. Las dos no
       * guardan proporción entre sí a lo largo de la flota —la avioneta mide
       * once de ala y ocho de largo; el regional, veintiséis y veintiséis— así
       * que una distancia sacada de la envergadura encuadra bien a una y mete
       * la cámara dentro de la otra. Sacada del largo, las dos quedan igual de
       * lejos **en proporción a lo que se está mirando**, que es lo único que
       * importa aquí.
       *
       * Uno coma cuatro veces el largo es lo que ya tenía la avioneta cuando
       * se veía bien —once metros para ocho de avión—, así que el número no es
       * nuevo: es el que había, aplicado a la medida correcta.
       *
       * Medido con captura en las dos puntas de la flota.
       */
      const lejos = ctx.aircraft.largo * 1.4;
      this.offset.set(
        lejos * (this.sitio === "derecha" ? 1 : -1),
        ctx.aircraft.chord * 1.4,
        lejos * 0.55,
      );
    }

    /*
     * Retroceso por aceleración: la cámara se queda un poco atrás cuando el
     * avión empuja y vuelve a su sitio al estabilizarse. Es el mismo truco que
     * usa cualquier juego de coches y es lo que hace que se *sienta* la
     * aceleración en vez de solo verla en el marcador.
     *
     * **Menos de frente.** Ahí la cámara está delante, así que quedarse atrás
     * es metérsela al avión por el morro: con la aceleración de un despegue se
     * comía los veintidós metros de separación.
     */
    if (this.sitio !== "morro")
      this.offset.z += ACCELERATION_LAG * Math.max(0, this.surge);
    this.offset.applyQuaternion(state.orientation);
    this.deseada.copy(state.position).add(this.offset);
    /*
     * **Y en tierra, sin quedarse atrás.** El suavizado de abajo persigue al
     * avión y, a velocidad constante, se queda detrás lo que el avión recorre
     * en un séptimo de segundo: en la carrera del JAZ 120, a setenta metros por
     * segundo, diez metros más lejos de lo pedido —setenta y nueve en vez de
     * setenta, medido—, justo cuando suben los frenos de tierra. Se le pide ese
     * trecho por delante, en la misma rampa que la acerca: al tocar, sin salto.
     */
    if (this.sitio === "cola") {
      const adelanto = suave(this.enTierra);
      if (adelanto > 0) this.deseada.addScaledVector(state.velocity, adelanto / SUAVIZADO);
    }
    this.traquetear(state, dt, ctx);

    // Nunca por debajo del terreno: en un vuelo rasante la cámara de
    // persecución se metería dentro de la loma de atrás.
    const suelo = ctx.suelo(this.deseada.x, this.deseada.z) + 3;
    if (this.deseada.y < suelo) this.deseada.y = suelo;

    // Suavizado exponencial independiente de la tasa de fotogramas: sin el
    // `1 - exp`, la cámara iría distinta a 30 y a 120 fps.
    camera.position.lerp(this.deseada, 1 - Math.exp(-dt * SUAVIZADO));

    /*
     * **Y nunca más cerca de donde va el coche del sígame.**
     *
     * Los treinta y dos de suelo eran, a propósito o no, justo donde iba el
     * coche: rodando, la cámara miraba al coche. Con el coche puesto donde
     * cada avión lo ve —setenta metros en el JAZ 120— la cámara seguía
     * mirando a treinta y dos, que en ese avión es su propio morro. Es la
     * misma regla y el mismo número que el coche, no otro parecido. Volando no
     * cambia nada: ahí la velocidad ya mira más lejos que cualquier coche.
     */
    const lejos = Math.max(
      MIRA_LO_MINIMO,
      ctx.aLaVista ?? 0,
      state.airspeed * MIRA_LEJOS,
    );
    if (this.sitio === "cola" && state.velocity.lengthSq() > 1) {
      this.mirando
        .copy(state.velocity)
        .normalize()
        .multiplyScalar(lejos)
        .add(state.position);
      this.sinPerderElAvion(camera, state, ctx);
    } else if (this.sitio === "cola") {
      /*
       * **Y parado, también con horizonte.** Quieto, la de cola mira al
       * avión, y desde seis décimas de envergadura de alto eso es mirar al
       * suelo: en la pista, con el cuadro abierto, no se veía el cielo. El
       * mismo encuadre que andando. Ver `sinPerderElAvion`.
       */
      this.mirando.copy(state.position);
      this.sinPerderElAvion(camera, state, ctx);
    } else if (this.sitio === "morro") {
      /*
       * **De frente se mira al avión, y a nada más.**
       *
       * Las demás miran un poco por delante del avión, hacia donde va, y eso
       * desde detrás y desde el costado encuadra bien. Desde delante no: la
       * cámara está veintidós metros por delante y el punto de mira, a un
       * tercio de segundo de vuelo, caía **otros veinte por delante de la
       * cámara**. O sea que la vista nueva miraba al horizonte de espaldas al
       * avión: en captura, pantalla vacía de día y de noche.
       */
      this.mirando.copy(state.position);
    } else {
      this.mirando.copy(state.position).addScaledVector(state.velocity, 0.35);
    }
    camera.lookAt(this.mirando);
  }

  /**
   * Coloca el punto de mira de arriba abajo con tres reglas, en este orden:
   *
   * 1. **El avión no cae más de `caidaMaxima` por debajo del centro.** Mirar
   *    lejos levanta la vista y baja el avión; con el HUD comiéndose la mitad
   *    de abajo de una tablet, el avión acababa detrás del cuadro. Se sigue
   *    mirando tan lejos como se pueda, pero no más.
   * 2. **El eje no mira más abajo de `bajadaMaxima`**, para que el horizonte
   *    quede a la vista con algo de cielo: mirando al avión desde arriba, en
   *    la pista, se veía solo asfalto.
   * 3. **Y aun así, el avión no pasa de `caidaTope`**: si las dos de arriba
   *    no caben a la vez —una franja libre pequeña—, gana el avión.
   *
   * Solo se toca el ángulo de arriba abajo: el rumbo de la mirada es el de
   * siempre.
   */
  private sinPerderElAvion(
    camera: PerspectiveCamera,
    state: FlightState,
    ctx: Contexto,
  ): void {
    const caida = ctx.caidaMaxima ?? Infinity;
    const bajada = ctx.bajadaMaxima ?? Infinity;
    const tope = ctx.caidaTope ?? Infinity;
    if (![caida, bajada, tope].some(Number.isFinite)) return;
    const o = camera.position;
    const alAvion = Math.atan2(
      state.position.y - o.y,
      Math.hypot(state.position.x - o.x, state.position.z - o.z),
    );
    const dx = this.mirando.x - o.x;
    const dz = this.mirando.z - o.z;
    const llano = Math.hypot(dx, dz);
    if (llano < 1e-3) return;
    const alMirar = Math.atan2(this.mirando.y - o.y, llano);
    const al = mirarSinPerderNada(alMirar, alAvion, caida, bajada, tope);
    if (al !== alMirar) this.mirando.y = o.y + Math.tan(al) * llano;
  }

  fovDeseado(state: FlightState, ctx: Contexto): number {
    return fovConVelocidad(state, ctx);
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
  private traquetear(state: FlightState, dt: number, ctx: Contexto): void {
    if (ctx.movimientoReducido) return;

    // Sube con el cuadrado de la velocidad hasta la de rotación: así el
    // traqueteo crece de verdad durante toda la carrera en vez de saturarse a
    // media pista, que era lo que hacía que después de arrancar pareciera que
    // ya no se aceleraba más.
    const rodando = Math.min(1, state.airspeed / SHAKE_REFERENCE);
    const meta = state.onGround ? rodando * rodando : 0;
    // Sube deprisa y se apaga en SHAKE_FADE segundos.
    const paso = meta > this.shake ? dt * 6 : dt / SHAKE_FADE;
    this.shake += Math.max(-paso, Math.min(paso, meta - this.shake));
    if (this.shake < 0.002) return;

    this.relojDeTraqueteo += dt;
    const t = this.relojDeTraqueteo;
    // Tres senos que no comparten periodo: se lee como suelo irregular y no
    // como una oscilación. Y un cuarto término lento hace los baches.
    const bache = Math.pow(Math.max(0, Math.sin(t * 5.3)), 8);
    // Y multiplicado por lo que traquetea el suelo de debajo: rodar por un
    // campo tiene que **notarse** antes de que nadie lo explique.
    const cuanto = SHAKE_AMPLITUDE * this.shake * ctx.traqueteo;
    this.deseada.y +=
      cuanto *
      (Math.sin(t * 41) * 0.5 + Math.sin(t * 17.3) * 0.3 + bache * 1.4);
    this.deseada.x += cuanto * Math.sin(t * 23.7) * 0.35;
  }
}

/**
 * Las tres reglas de `sinPerderElAvion`, en ángulos y sin cámara, para poder
 * probarlas. `alMirar` y `alAvion` son elevaciones desde la cámara —negativas
 * hacia abajo— y devuelve la elevación a la que mirar.
 */
export function mirarSinPerderNada(
  alMirar: number,
  alAvion: number,
  caida: number,
  bajada: number,
  tope: number,
): number {
  let al = alMirar;
  if (al - alAvion > caida) al = alAvion + caida;
  if (al < -bajada) al = -bajada;
  if (al - alAvion > tope) al = alAvion + tope;
  return al;
}
