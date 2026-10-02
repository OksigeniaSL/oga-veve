/**
 * **La mano que sostiene**: lo que hace la mano de un piloto en la palanca
 * cuando la palanca es un teclado o un dedo sobre un cristal.
 *
 * ## De dónde viene
 *
 * Contado volando, en tres frases:
 *
 * - «El movimiento izquierda/derecha es brusco en vuelo; al pulsar la tecla
 *   hace un movimiento rapidísimo, eso en realidad no es así; como alguna vez
 *   sea así, los pasajeros vomitan hasta la primera papilla.»
 * - «Bajo muy de golpe: o bajo o subo, el teclado no me deja ir suave.»
 * - Y con el dedo: «tengo que dejar el dedo puesto para mantener la subida o
 *   la bajada durante un buen rato hasta alcanzar la altitud deseada, se cansa
 *   la mano, es una tortura».
 *
 * Las tres tienen la misma causa. Una tecla solo sabe estar apretada o
 * suelta, así que la tecla era **el alerón o la profundidad a fondo**
 * mientras se apretaba y el centro al soltarla: el JAZ 90 se tumbaba a más de
 * veinte grados por segundo y, al soltar, el ala volvía —o no— según el
 * peldaño. Y el dedo hacía lo mismo con un muelle: lo que se conseguía se
 * perdía al levantarlo.
 *
 * ## Qué hace una mano de verdad
 *
 * Un piloto no lleva la palanca a fondo para virar: **inclina el ala a un
 * ritmo tranquilo, la deja en la inclinación que quiere y centra el mando**.
 * El avión se queda inclinado. Para subir, levanta el morro hasta la
 * trayectoria que quiere y **compensa**, y el avión se queda subiendo. Lo que
 * se consigue se queda; la mano solo se mueve para cambiarlo.
 *
 * Es también, literalmente, lo que hacen los mandos de los reactores de hoy
 * —Airbus desde el A320, Embraer en los E2—: la palanca pide **un ritmo** de
 * alabeo y de cabeceo, y suelta, el avión **sostiene** la inclinación y la
 * trayectoria. Con una protección que se ve: pasado de 33° de inclinación, al
 * soltar vuelve a 33° solo.
 *
 * ## Qué hace este módulo
 *
 * Lleva dos **consignas**: la inclinación que se quiere y la trayectoria que
 * se quiere —subir, nivelado, bajar—, y mueve el alerón y la profundidad
 * para que el avión las siga. La tecla mueve la consigna **a un ritmo**, con
 * rampa al apretar y al soltar; el dedo la lleva **a un sitio**, el de la
 * palanca, que se queda donde se deja. Ninguno de los dos mueve el mando a
 * fondo.
 *
 * - **El ritmo de alabeo sale del avión**: una parte de lo que rueda a fondo a
 *   esa velocidad, que es la cuenta de la ficha. Sale unos 15–20 °/s en las
 *   avionetas, 10 en el turbohélice, 5–6 en el JAZ 90 y 4 en el de fuselaje
 *   ancho, y **menos despacio y con flaps**, como en el de verdad.
 * - **El ritmo de la trayectoria sale de lo que se nota en el asiento**: un
 *   cuarto de g, que deprisa es poco ángulo y despacio es más.
 * - **La trayectoria, no el morro.** Lo que se quiere sostener es si se sube o
 *   se baja, y eso es la trayectoria: el morro es como se consigue. La mano
 *   lo hace como la del piloto automático de este juego —la trayectoria pide
 *   morro, el morro pide giro y el giro pide profundidad— y con el
 *   compensador: lo que la sostiene se queda en el TRIM, que es lo que hace un
 *   piloto al soltar y lo que se ve en la aguja.
 * - **Y no lleva el avión a la pérdida.** Soltada, si el ala se acerca al
 *   avisador —poco gas sosteniendo una subida—, cede el morro antes que
 *   pasarse: es lo que haría el avión compensado, que vuelve a su velocidad.
 *   Apretando, quien manda es quien aprieta, y en los peldaños que dejan
 *   entrar en pérdida se entra.
 *
 * ## Dónde no está
 *
 * **En tierra.** Rodando, la palanca es el volante y la profundidad, como
 * siempre, y el avión no tiene inclinación ni trayectoria que sostener. La
 * mano coge el avión medio segundo después de dejar el suelo y lo suelta al
 * tocarlo.
 *
 * **Con otra mano a los mandos.** El piloto automático y la nivelada de los
 * peldaños de abajo llevan su eje; mientras lo llevan, ésta se aparta, y
 * vuelve en cuanto quien juega toca ese eje. Ver `otraManoAlabeo`.
 *
 * **Con un mando de juego o un joystick**, que tienen muelle de verdad y su
 * propia posición: ahí manda la mano de quien lo lleva, como en cualquier
 * simulador. Ver `flight/mandos-fisicos.ts`.
 */

import { GRAVITY } from "./atmosphere";
import { esDeChorro, type AircraftConfig } from "./aircraft";
import { ascensoMaximo } from "./carrera";
import { VISUAL_BANK } from "./arcade";

const RAD = Math.PI / 180;

/**
 * **La parte del alabeo a fondo que pide la tecla**: algo más de un quinto.
 *
 * La avioneta de escuela rueda a fondo a unos setenta grados por segundo y un
 * piloto entra en un viraje normal a unos quince: un quinto largo. Con la
 * misma parte, el JAZ 120 —que rueda a fondo a menos de veinte a su velocidad
 * de maniobra— sale a cuatro, que es lo que se ve hacer a un avión de fuselaje
 * ancho con pasaje. Una parte y no un número por avión: el número sale de la
 * ficha de cada uno, y la ficha es la que tiene que tener razón.
 */
export const PARTE_DEL_ALABEO = 0.22;

/** Con los flaps abajo del todo, el alabeo que se pide baja un 15 %. */
export const MENOS_CON_FLAPS = 0.15;

/**
 * **La carga con la que la mano cambia de trayectoria**, en g: un cuarto.
 *
 * Es lo que se nota en el asiento al empezar a subir o al nivelar. Un cuarto
 * de g es una maniobra tranquila con el pasaje sentado; el piloto automático
 * se permite una décima —ver `CARGA_QUE_PIDE`—, y la mano va algo más viva
 * porque la lleva alguien que quiere ver que el avión le responde.
 */
export const CARGA_DE_LA_MANO = 0.25;

/** Y nunca más deprisa que tres grados por segundo, aunque se vuele despacio. */
export const SENDA_POR_SEGUNDO = 3 * RAD;

/**
 * Lo que tarda el ritmo pedido en llegar entero al apretar, s.
 *
 * Es la rampa: el ala empieza a moverse despacio y se anima, como empieza a
 * girar un avión cuando la mano empieza a mover la palanca.
 */
export const RAMPA_AL_APRETAR = 0.45;

/** Y lo que tarda en pararse al soltar, s: el ala no se clava de golpe. */
export const RAMPA_AL_SOLTAR = 0.3;

/**
 * **La inclinación a la que vuelve el avión protegido**: 33°.
 *
 * Es la de Airbus y la de Embraer: pasado de ahí, al soltar, el avión vuelve
 * solo, despacio. Vale en los reactores y en los dos peldaños de abajo, en
 * cualquier avión.
 */
export const INCLINACION_PROTEGIDA = 33 * RAD;

/**
 * Hasta dónde se deja inclinar el reactor protegido **apretando**: 67°, el
 * tope de la protección de verdad. En los peldaños de abajo no se pasa de 33.
 */
export const INCLINACION_TOPE_DEL_REACTOR = 67 * RAD;

/**
 * Y sin protección, 60°: más allá ya no es un viraje, es acrobacia, y hay
 * reglamento que lo dice.
 */
export const INCLINACION_TOPE = 60 * RAD;

/** Lo que inclina la palanca del dedo a fondo, protegido o no. */
export const INCLINACION_DEL_DEDO_PROTEGIDA = 30 * RAD;
export const INCLINACION_DEL_DEDO = 45 * RAD;

/** Los topes de la trayectoria con la tecla, rad. */
export const SENDA_MAS_ALTA = 20 * RAD;
export const SENDA_MAS_BAJA = -15 * RAD;

/**
 * **Un toque corto mueve un poco y se queda.**
 *
 * Medio grado de trayectoria, que a cien nudos son cien pies por minuto: el
 * clic de la rueda de velocidad vertical de un automático. Y tres grados de
 * inclinación, una corrección pequeña de rumbo.
 */
export const TOQUE_DE_SENDA = 0.5 * RAD;
export const TOQUE_DE_ALABEO = 3 * RAD;

/**
 * Al soltar la tecla cerca de las alas niveladas o de volar nivelado, la
 * consigna se va al cero: es el imán de la palanca de gases puesto en el
 * mando —ver `alIman`— y es lo que deja volar recto sin puntería.
 */
export const IMAN_DE_ALABEO = 2 * RAD;
export const IMAN_DE_SENDA = 0.3 * RAD;

/**
 * Cuánto se queda la mano lejos del avisador de pérdida cuando sostiene, rad.
 *
 * Grado y medio: lo bastante para que el avisador no cante con la mano
 * sosteniendo, y poco para que no se pierda subida sin necesidad.
 */
export const LEJOS_DEL_AVISADOR = 1.5 * RAD;

/** Lo que espera la mano después de despegar antes de coger el avión, s. */
export const ESPERA_AL_DESPEGAR = 0.5;

/**
 * **Lo que la mano ve del avión en cada fotograma.** Lo rellena el juego, y
 * en las pruebas el banco: la mano no sabe de física y no la toca.
 */
export interface LoQueVeLaMano {
  readonly aircraft: AircraftConfig;
  /** Si vuela el modelo sencillo, el del primer peldaño. Ver `arcade.ts`. */
  readonly sencillo: boolean;
  /** La ayuda que amortigua del peldaño. Ver `AssistLayers.extraDamping`. */
  readonly amortiguaExtra: number;
  /** Si el peldaño no deja entrar en pérdida. Ver `stallProtection`. */
  readonly protegePerdida: boolean;
  /** Si el peldaño es de los de abajo, con la inclinación protegida. */
  readonly peldanoBajo: boolean;
  readonly enTierra: boolean;
  /** Alabeo, rad, positivo a la derecha. */
  readonly alabeo: number;
  /** Cabeceo, rad, positivo morro arriba. */
  readonly cabeceo: number;
  /** Ritmos en ejes del avión, rad/s. Ver `FlightState`. */
  readonly ritmoDeAlabeo: number;
  readonly ritmoDeCabeceo: number;
  /** Velocidad vertical, m/s. */
  readonly vertical: number;
  /** El factor de carga, g: lo que se nota en el asiento. */
  readonly carga: number;
  /** Velocidad verdadera, m/s. */
  readonly verdadera: number;
  /** Ángulo de ataque y el del avisador, rad. */
  readonly alfa: number;
  readonly alfaDeAviso: number;
  /** Dónde están los flaps, 0 a 1. */
  readonly flaps: number;
  /** El timón que sostiene el avión ahora. Ver `FlightModel.timonAhora`. */
  readonly timon: number;
  /** En el modelo sencillo, qué palanca da un ritmo de subida. */
  readonly mandoParaSubir?: ((ritmo: number) => number) | undefined;
  /** Si otra mano —el automático, la nivelada— lleva ya ese eje. */
  readonly otraManoAlabeo: boolean;
  readonly otraManoCabeceo: boolean;
}

/** Lo que pide quien vuela en este fotograma, eje por eje. */
export interface LoQuePide {
  /** La tecla de alabeo: +1 derecha, −1 izquierda, 0 suelta. */
  teclaAlabeo: number;
  /** La de cabeceo: +1 morro arriba, con el signo de los ajustes ya puesto. */
  teclaCabeceo: number;
  /** Los toques cortos que llegaron desde el último fotograma, con su signo. */
  toqueAlabeo: number;
  toqueCabeceo: number;
  /** Si un mando de juego se está moviendo en ese eje: entonces manda él. */
  mandoAlabeo: boolean;
  mandoCabeceo: boolean;
}

/**
 * **Una consigna que se mueve a un ritmo**, con rampa al empezar y al parar.
 *
 * Es la pieza que quita el golpe: la tecla no pone el ala en ningún sitio,
 * pide que la consigna se mueva, y la consigna se anima y se frena.
 */
export class Consigna {
  /** Dónde está, rad. */
  valor = 0;
  /** A qué ritmo se mueve ahora, rad/s. */
  ritmo = 0;

  /**
   * Un fotograma pidiendo `pide` (−1 a 1) del ritmo `ritmoMaximo`, sin pasar
   * de `[min, max]`.
   */
  mover(dt: number, pide: number, ritmoMaximo: number, min: number, max: number): void {
    const quiere = pide * ritmoMaximo;
    const acelera =
      Math.abs(quiere) > Math.abs(this.ritmo) &&
      (this.ritmo === 0 || Math.sign(quiere) === Math.sign(this.ritmo));
    const paso =
      (Math.max(ritmoMaximo, 1e-6) / (acelera ? RAMPA_AL_APRETAR : RAMPA_AL_SOLTAR)) * dt;
    this.ritmo += acotar(quiere - this.ritmo, paso);
    let v = this.valor + this.ritmo * dt;
    if (v > max) {
      v = max;
      if (this.ritmo > 0) this.ritmo = 0;
    }
    if (v < min) {
      v = min;
      if (this.ritmo < 0) this.ritmo = 0;
    }
    this.valor = v;
  }

  /**
   * Un fotograma yendo **hacia un sitio**: tan deprisa como deja el ritmo y
   * frenando a tiempo de pararse justo ahí, sin pasarse.
   */
  hacia(dt: number, sitio: number, ritmoMaximo: number, min: number, max: number): void {
    const meta = Math.max(min, Math.min(max, sitio));
    const falta = meta - this.valor;
    if (Math.abs(falta) < 1e-5 && Math.abs(this.ritmo) < 1e-4) {
      this.valor = meta;
      this.ritmo = 0;
      return;
    }
    // Lo que se puede llevar y aún pararse en lo que falta: v² = 2·a·d.
    const frena = Math.sqrt(
      2 * (Math.max(ritmoMaximo, 1e-6) / RAMPA_AL_SOLTAR) * Math.abs(falta),
    );
    const pide =
      (Math.sign(falta) * Math.min(ritmoMaximo, frena)) / Math.max(ritmoMaximo, 1e-6);
    this.mover(dt, pide, ritmoMaximo, min, max);
    if ((meta - this.valor) * falta <= 0) {
      this.valor = meta;
      this.ritmo = 0;
    }
  }

  /** Coger el avión como está: aquí, quieta. */
  poner(valor: number): void {
    this.valor = valor;
    this.ritmo = 0;
  }
}

/**
 * **Lo que rueda el avión con el alerón a fondo**, rad/s por unidad de mando,
 * a esta velocidad. Es la cuenta de la ficha —`clAileron/|clP| · 2V/b`, ver
 * `AircraftConfig.aero.clAileron`— con el amortiguamiento que añade el
 * peldaño, y con el mismo suelo de velocidad que el modelo de vuelo.
 */
export function alabeoAFondo(a: AircraftConfig, verdadera: number, amortiguaExtra = 0): number {
  const vRef = Math.max(verdadera, a.cruiseSpeed * 0.35);
  return (
    (a.aero.clAileron * 2 * vRef) /
    ((Math.abs(a.aero.clP) + 0.5 * Math.max(0, amortiguaExtra)) * a.wingSpan)
  );
}

/**
 * **El ritmo de alabeo que pide la mano**, rad/s: una parte del que da el
 * avión a fondo, y menos con flaps. Despacio sale más lento porque el avión
 * de verdad también lo es: el alerón muerde con la velocidad.
 */
export function ritmoDeAlabeoDeLaMano(
  a: AircraftConfig,
  verdadera: number,
  flaps: number,
): number {
  return (
    PARTE_DEL_ALABEO *
    alabeoAFondo(a, verdadera) *
    (1 - MENOS_CON_FLAPS * Math.max(0, Math.min(1, flaps)))
  );
}

/**
 * **El ritmo al que la mano cambia de trayectoria**, rad/s: el que aprieta un
 * cuarto de g, con su tope. Girar la trayectoria a `ω` volando a `V` aprieta
 * `ω·V/g` ges.
 */
export function ritmoDeSendaDeLaMano(verdadera: number): number {
  return Math.min(SENDA_POR_SEGUNDO, (CARGA_DE_LA_MANO * GRAVITY) / Math.max(verdadera, 15));
}

/**
 * **Lo que sube y lo que baja la palanca del dedo a fondo**, rad de
 * trayectoria. Arriba, la subida que da el avión a su velocidad de subida —la
 * cuenta de `ascensoMaximo`—, entre cuatro y doce grados; abajo, otro tanto
 * hasta un tope de ocho, que ya es bajar con prisa.
 */
export function sendasDelDedo(a: AircraftConfig): { sube: number; baja: number } {
  const v = a.rotationSpeed * 1.2;
  const sube = Math.max(4 * RAD, Math.min(12 * RAD, Math.asin(Math.min(1, ascensoMaximo(a) / v))));
  return { sube, baja: -Math.max(4 * RAD, Math.min(8 * RAD, sube)) };
}

/**
 * **La curva de la palanca del dedo**: zona muerta en el centro y suave al
 * principio. Con una recta, el primer milímetro ya inclinaba el ala, y el
 * pulgar no es tan fino: «súper sensible». Con esto la mitad del recorrido da
 * algo más de un cuarto, y a fondo, todo.
 */
export const ZONA_MUERTA_DEL_DEDO = 0.06;
const LINEAL = 0.35;

export function curvaDelDedo(v: number): number {
  const u = (Math.abs(v) - ZONA_MUERTA_DEL_DEDO) / (1 - ZONA_MUERTA_DEL_DEDO);
  if (u <= 0) return 0;
  const w = Math.min(1, u);
  return Math.sign(v) * (LINEAL * w + (1 - LINEAL) * w * w * w);
}

/** La vuelta de la curva: qué palanca da esta parte. Para pintar el punto. */
export function palancaDeLaCurva(c: number): number {
  const m = Math.min(1, Math.abs(c));
  if (m <= 0) return 0;
  // La curva es creciente: la mitad por bisección basta y no se equivoca.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (LINEAL * mid + (1 - LINEAL) * mid * mid * mid < m) lo = mid;
    else hi = mid;
  }
  const w = (lo + hi) / 2;
  return Math.sign(c) * (ZONA_MUERTA_DEL_DEDO + w * (1 - ZONA_MUERTA_DEL_DEDO));
}

/** Un eje de la mano. */
interface Eje {
  /** Si la mano lleva este eje ahora. */
  activo: boolean;
  readonly consigna: Consigna;
  /**
   * El sitio al que va la consigna, rad, o `null` si la mueve la tecla. Lo
   * pone el dedo, el doble toque, el imán al soltar y los toques cortos.
   */
  meta: number | null;
  /** Si la meta la puso el dedo: entonces la palanca se pinta en la meta. */
  metaDelDedo: boolean;
  /** La tecla del fotograma anterior, para ver cuándo se suelta. */
  teclaAntes: number;
}

const ejeNuevo = (): Eje => ({
  activo: false,
  consigna: new Consigna(),
  meta: null,
  metaDelDedo: false,
  teclaAntes: 0,
});

/**
 * **La mano.** Un fotograma: `paso`. Lo que pide a los mandos queda en
 * `aileron`, `elevator` y `trim`, y si lleva cada eje, en `llevaAlabeo` y
 * `llevaCabeceo`.
 */
export class ManoQueSostiene {
  readonly alabeo: Eje = ejeNuevo();
  readonly cabeceo: Eje = ejeNuevo();

  /** Lo que pide la mano a los mandos en este fotograma. */
  aileron = 0;
  elevator = 0;
  /** El compensador que sostiene la trayectoria. Ver la cabecera. */
  trim = 0;

  /** Lo que se ha ido sumando de trayectoria que faltaba, rad/s. */
  private suma = 0;
  /** Lo que lleva en el aire desde que despegó, s. */
  private enElAire = 0;
  /** Lo último visto, para pintar la palanca sin pedírselo otra vez al juego. */
  private ultimo: LoQueVeLaMano | null = null;

  get llevaAlabeo(): boolean {
    return this.alabeo.activo;
  }

  get llevaCabeceo(): boolean {
    return this.cabeceo.activo;
  }

  /**
   * Si la mano puede coger el avión ahora: en el aire, pasado el medio
   * segundo de después de despegar. Lo mira la palanca del dedo para saber si
   * es volante o palanca que se queda.
   */
  get puedeCoger(): boolean {
    return this.ultimo !== null && this.puedeLlevar(this.ultimo);
  }

  /**
   * **El dedo ha puesto la palanca aquí**: `x` alabeo y `y` cabeceo, −1 a 1
   * cada uno, morro arriba positivo, o `null` en el eje que el dedo no movió.
   *
   * La mano coge **los dos ejes** —el que no se movió, como está—, igual que
   * con la tecla: ver `cogerElAvion`. Y el que lleva otra mano, el piloto
   * automático con su rumbo por ejemplo, no se toca.
   */
  ponerPalanca(x: number | null, y: number | null): void {
    const ve = this.ultimo;
    if (!ve || !this.puedeLlevar(ve)) return;
    this.cogerElAvion(ve);
    if (x !== null && this.alabeo.activo) {
      this.alabeo.meta = curvaDelDedo(x) * this.inclinacionDelDedo(ve);
      this.alabeo.metaDelDedo = true;
    }
    if (y !== null && this.cabeceo.activo) {
      const { sube, baja } = sendasDelDedo(ve.aircraft);
      const c = curvaDelDedo(y);
      this.cabeceo.meta = c >= 0 ? c * sube : -c * baja;
      this.cabeceo.metaDelDedo = true;
    }
  }

  /**
   * **El doble toque**: alas niveladas y vuelo nivelado, despacio. La mano
   * sigue llevando los ejes que llevaba; solo cambia a dónde.
   */
  centrar(): void {
    for (const eje of [this.alabeo, this.cabeceo]) {
      if (!eje.activo) continue;
      eje.meta = 0;
      eje.metaDelDedo = false;
    }
  }

  /**
   * **Dónde se pinta la palanca del dedo**, −1 a 1: la meta del dedo si la
   * dejó él, y si no, la consigna de ahora —que se mueve con la tecla y que,
   * tras el doble toque, vuelve despacio al centro—. Cero en el eje que no
   * lleva.
   */
  palanca(): { x: number; y: number } {
    const ve = this.ultimo;
    if (!ve) return { x: 0, y: 0 };
    const a = this.alabeo;
    const c = this.cabeceo;
    const x = a.activo
      ? palancaDeLaCurva(
          (a.metaDelDedo && a.meta !== null ? a.meta : a.consigna.valor) /
            this.inclinacionDelDedo(ve),
        )
      : 0;
    let y = 0;
    if (c.activo) {
      const { sube, baja } = sendasDelDedo(ve.aircraft);
      const s = c.metaDelDedo && c.meta !== null ? c.meta : c.consigna.valor;
      y = palancaDeLaCurva(s >= 0 ? s / sube : -s / baja);
    }
    return { x, y };
  }

  /** Soltar los dos ejes: un vuelo nuevo, otro avión, el suelo. */
  soltar(): void {
    for (const eje of [this.alabeo, this.cabeceo]) {
      eje.activo = false;
      eje.meta = null;
      eje.metaDelDedo = false;
      eje.consigna.poner(0);
    }
    this.aileron = 0;
    this.elevator = 0;
  }

  /** Un fotograma de la mano. */
  paso(dt: number, ve: LoQueVeLaMano, pide: LoQuePide): void {
    this.ultimo = ve;
    this.enElAire = ve.enTierra ? 0 : this.enElAire + dt;
    if (!this.puedeLlevar(ve)) {
      if (this.alabeo.activo || this.cabeceo.activo) this.soltar();
      return;
    }
    if (ve.otraManoAlabeo || pide.mandoAlabeo) this.soltarEje(this.alabeo);
    if (ve.otraManoCabeceo || pide.mandoCabeceo) this.soltarEje(this.cabeceo);
    const tocan =
      pide.teclaAlabeo !== 0 ||
      pide.teclaCabeceo !== 0 ||
      pide.toqueAlabeo !== 0 ||
      pide.toqueCabeceo !== 0;
    if (tocan) this.cogerElAvion(ve, pide);
    this.pasoDelAlabeo(dt, ve, pide);
    this.pasoDelCabeceo(dt, ve, pide);
  }

  /**
   * **La mano coge los dos ejes a la vez**, aunque se toque uno.
   *
   * Cogía solo el que se tocaba, y en el peldaño sin ayudas eso es una
   * espiral: se inclinaba el ala con la flecha, nadie sostenía la
   * trayectoria y el avión se iba de morro dentro del viraje. Medido con el
   * JAZ 90 a sesenta y siete grados: cien metros por segundo de bajada en
   * quince segundos. Una mano en la palanca lleva los dos ejes, y en un
   * viraje tira lo que hace falta para no bajar.
   *
   * Menos el que lleve otra mano o un mando de juego que se esté moviendo.
   */
  private cogerElAvion(ve: LoQueVeLaMano, pide?: LoQuePide): void {
    if (!ve.otraManoAlabeo && !pide?.mandoAlabeo) this.coger(this.alabeo, ve, "alabeo");
    if (!ve.otraManoCabeceo && !pide?.mandoCabeceo) this.coger(this.cabeceo, ve, "cabeceo");
  }

  private puedeLlevar(ve: LoQueVeLaMano): boolean {
    return !ve.enTierra && this.enElAire >= ESPERA_AL_DESPEGAR;
  }

  /** Coge un eje como está el avión, si no lo llevaba ya. */
  private coger(eje: Eje, ve: LoQueVeLaMano, cual: "alabeo" | "cabeceo"): void {
    if (eje.activo) return;
    eje.activo = true;
    eje.meta = null;
    eje.metaDelDedo = false;
    if (cual === "alabeo") {
      eje.consigna.poner(ve.alabeo);
    } else {
      eje.consigna.poner(trayectoria(ve));
      // El compensador coge lo que sostiene el avión, y la profundidad, nada:
      // así no hay tirón al coger el mando. Ver `timonAhora`.
      this.trim = acotar(ve.timon, 1);
      this.elevator = 0;
      this.suma = 0;
    }
  }

  private soltarEje(eje: Eje): void {
    eje.activo = false;
    eje.meta = null;
    eje.metaDelDedo = false;
  }

  private inclinacionDelDedo(ve: LoQueVeLaMano): number {
    return protegido(ve) ? INCLINACION_DEL_DEDO_PROTEGIDA : INCLINACION_DEL_DEDO;
  }

  // ── Alabeo ─────────────────────────────────────────────────────────────

  private pasoDelAlabeo(dt: number, ve: LoQueVeLaMano, pide: LoQuePide): void {
    const eje = this.alabeo;
    const tecla = Math.sign(pide.teclaAlabeo);
    if (!eje.activo) {
      eje.teclaAntes = tecla;
      return;
    }
    const ritmo = Math.max(ritmoDeAlabeoDeLaMano(ve.aircraft, ve.verdadera, ve.flaps), 0.5 * RAD);
    /*
     * Los topes. Sin protección, sesenta. Protegido, treinta y tres suelto; y
     * apretando, el reactor de los peldaños de arriba llega a sesenta y siete
     * —y vuelve a treinta y tres al soltar—, mientras que en los de abajo no
     * se pasa nunca de treinta y tres.
     */
    const conProteccion = protegido(ve);
    const topeApretando = !conProteccion
      ? INCLINACION_TOPE
      : ve.peldanoBajo
        ? INCLINACION_PROTEGIDA
        : INCLINACION_TOPE_DEL_REACTOR;
    const topeSuelto = conProteccion ? INCLINACION_PROTEGIDA : INCLINACION_TOPE;
    const c = eje.consigna;
    if (tecla !== 0) {
      eje.meta = null;
      eje.metaDelDedo = false;
      c.mover(dt, tecla, ritmo, -topeApretando, topeApretando);
    } else {
      if (eje.teclaAntes !== 0 && Math.abs(c.valor) < IMAN_DE_ALABEO) eje.meta = 0;
      if (pide.toqueAlabeo !== 0) {
        eje.meta = (eje.meta ?? c.valor) + Math.sign(pide.toqueAlabeo) * TOQUE_DE_ALABEO;
        eje.metaDelDedo = false;
      }
      if (eje.meta !== null) eje.meta = acotar(eje.meta, topeSuelto);
      // La protección: suelto y pasado de treinta y tres, vuelve despacio.
      else if (Math.abs(c.valor) > topeSuelto) eje.meta = Math.sign(c.valor) * topeSuelto;
      const rango = Math.max(topeSuelto, Math.abs(c.valor));
      if (eje.meta !== null) c.hacia(dt, eje.meta, ritmo, -rango, rango);
      else c.mover(dt, 0, ritmo, -rango, rango);
    }
    eje.teclaAntes = tecla;

    if (ve.sencillo) {
      // En el modelo sencillo el alerón **es** la inclinación que se ve: ver
      // `VISUAL_BANK` en `arcade.ts`.
      this.aileron = acotar(c.valor / VISUAL_BANK, 1);
      return;
    }
    /*
     * El alabeo que falta pide un ritmo, y el ritmo pide alerón: el que lo
     * sostiene —la cuenta de la ficha— más lo que falta para llegar a él. Con
     * el ritmo de la consigna de entrada, para no ir siempre detrás.
     */
    const aFondo = Math.max(alabeoAFondo(ve.aircraft, ve.verdadera, ve.amortiguaExtra), 1e-3);
    const falta = c.valor - ve.alabeo;
    const quiere = acotar(c.ritmo + POR_ALABEO * falta, 1.5 * ritmo + Math.abs(c.ritmo));
    this.aileron = acotar((quiere + POR_RITMO_DE_ALABEO * (quiere - ve.ritmoDeAlabeo)) / aFondo, 1);
  }

  // ── Cabeceo ────────────────────────────────────────────────────────────

  private pasoDelCabeceo(dt: number, ve: LoQueVeLaMano, pide: LoQuePide): void {
    const eje = this.cabeceo;
    const tecla = Math.sign(pide.teclaCabeceo);
    if (!eje.activo) {
      eje.teclaAntes = tecla;
      return;
    }
    const v = Math.max(ve.verdadera, 15);
    const ritmo = ritmoDeSendaDeLaMano(v);
    const c = eje.consigna;
    if (tecla !== 0) {
      eje.meta = null;
      eje.metaDelDedo = false;
      c.mover(dt, tecla, ritmo, SENDA_MAS_BAJA, SENDA_MAS_ALTA);
    } else {
      if (eje.teclaAntes !== 0 && Math.abs(c.valor) < IMAN_DE_SENDA) eje.meta = 0;
      if (pide.toqueCabeceo !== 0) {
        eje.meta = (eje.meta ?? c.valor) + Math.sign(pide.toqueCabeceo) * TOQUE_DE_SENDA;
        eje.metaDelDedo = false;
      }
      if (eje.meta !== null) c.hacia(dt, eje.meta, ritmo, SENDA_MAS_BAJA, SENDA_MAS_ALTA);
      else c.mover(dt, 0, ritmo, SENDA_MAS_BAJA, SENDA_MAS_ALTA);
    }
    eje.teclaAntes = tecla;

    if (ve.sencillo) {
      // En el modelo sencillo la palanca **es** cuánto se sube: se le pide al
      // modelo la que da esta trayectoria. Ver `mandoParaSubir`.
      const ritmoDeSubida = v * Math.sin(c.valor);
      this.elevator = ve.mandoParaSubir
        ? acotar(ve.mandoParaSubir(ritmoDeSubida), 1)
        : acotar(c.valor / sendasDelDedo(ve.aircraft).sube, 1);
      return;
    }

    /*
     * **La trayectoria que falta pide girar el morro, y el giro que falta
     * mueve el compensador.** Son los pisos del piloto automático —ver
     * `mandosPara` en `piloto-automatico.ts`— con la viveza de una mano, y
     * con un amortiguador que aquél no necesita porque va despacio.
     *
     * El amortiguador es lo que deja ir deprisa sin pasarse: la trayectoria
     * va por detrás del morro —un avión tarda en cambiar de camino cuando
     * cambia de actitud—, y mandando solo por lo que falta, el morro llegaba
     * antes que el camino y se pasaba. Medido con la avioneta soltando la
     * tecla bajando a tres grados: llegaba a cuatro y medio y volvía a dos y
     * medio, ida y vuelta cada ocho segundos. Así que también se mira **lo
     * deprisa que cambia ya la trayectoria**, y eso sale de lo que se nota en
     * el asiento: `γ̇ = (g/V)·(n·cos φ − cos γ)`.
     */
    const gamma = trayectoria(ve);
    // Hasta setenta y dos grados: el tope del reactor apretando es sesenta y
    // siete, y acotado a sesenta el viraje pedía menos tirón del que hacía falta.
    const phi = acotar(ve.alabeo, 72 * RAD);
    const cambia = (GRAVITY / v) * (ve.carga * Math.cos(phi) - Math.cos(gamma));
    /*
     * Y lo que falta de **siempre** se va sumando, despacio: en un viraje
     * cerrado o con la velocidad cambiando, la cuenta de arriba se quedaba
     * corta —el JAZ 90 a sesenta y siete grados bajaba a tres grados de
     * trayectoria sosteniendo «nivelado»—, y esto es lo que la completa.
     */
    /*
     * **Y la firmeza, a la medida del avión.** La trayectoria va por detrás
     * del morro un tiempo que es `(V/g)·(α − α₀)` —lo que tarda la
     * sustentación de más en torcer el camino—: un tercio de segundo en la
     * avioneta y casi segundo y medio en el JAZ 120. Con la misma firmeza
     * para los dos, el grande bajaba y subía grado y pico alrededor de lo
     * pedido, cada dieciséis segundos. Ver `POR_TRAYECTORIA`.
     */
    const a = ve.aircraft.aero;
    const tarda = Math.max(
      0.2,
      (v / GRAVITY) * Math.max(0.02, ve.alfa + a.cl0 / Math.max(a.clAlpha, 0.1)),
    );
    const firmeza = Math.min(POR_TRAYECTORIA, FIRMEZA / tarda);
    const falta = c.valor - gamma;
    let giro =
      c.ritmo + firmeza * falta + AMORTIGUA_LA_SENDA * (c.ritmo - cambia) + this.suma;
    /*
     * **Y lejos del avisador.** Sosteniendo —y siempre en los peldaños que no
     * dejan entrar en pérdida—, si el ala va hacia el avisador el morro cede
     * en proporción y el compensador con él: el avión baja antes que perder
     * más velocidad, que es lo que hace un avión compensado al que se le
     * quita el gas. Mirando **a dónde va** el ángulo, no solo dónde está: con
     * el gas quitado subiendo, la velocidad se va deprisa.
     */
    const cuida = tecla <= 0 || ve.protegePerdida;
    const alfaQueViene = ve.alfa + MIRA_EL_ALFA * (ve.ritmoDeCabeceo * Math.cos(phi) - cambia);
    const pasado = alfaQueViene - (ve.alfaDeAviso - LEJOS_DEL_AVISADOR);
    const cede = cuida && pasado > 0;
    if (cede) giro = Math.min(giro, -POR_ALFA * pasado);
    const tope = (MAS_CARGA * GRAVITY) / v;
    giro = acotar(giro, Math.max(tope, Math.abs(c.ritmo)));
    // En ejes del avión: en un viraje, el morro gira sobre el ala para virar
    // nivelado sin que el cabeceo cambie. Ver `delViraje` en el automático.
    const delViraje = (GRAVITY / v) * Math.tan(phi) * Math.sin(phi) * Math.cos(gamma);
    const pedido = giro / Math.cos(phi) + delViraje;
    const faltaGiro = pedido - ve.ritmoDeCabeceo;
    // El servo no sube el morro mientras el ala va pasada: que no se acumule.
    if (!(cede && faltaGiro > 0)) this.trim = acotar(this.trim + SERVO * faltaGiro * dt, 1);
    if (cede) this.trim = acotar(this.trim - POR_ALFA_EN_EL_TRIM * pasado * dt, 1);
    this.elevator = acotar(AMORTIGUA * faltaGiro, 1);
    // La suma, con tope y quieta mientras cede o mientras se aprieta.
    if (!cede && tecla === 0)
      this.suma = acotar(
        this.suma + SUMA_DE_LA_SENDA * (firmeza / POR_TRAYECTORIA) ** 2 * falta * dt,
        SUMA_MAXIMA / v,
      );
  }
}

/** La trayectoria del avión, rad: cuánto sube por cada metro que avanza. */
function trayectoria(ve: LoQueVeLaMano): number {
  return Math.asin(acotar(ve.vertical / Math.max(ve.verdadera, 1), 1));
}

/** Si este avión, en este peldaño, lleva la inclinación protegida. */
export function protegido(ve: {
  readonly aircraft: AircraftConfig;
  readonly peldanoBajo: boolean;
}): boolean {
  return ve.peldanoBajo || esDeChorro(ve.aircraft);
}

/** Cuánto ritmo de alabeo pide cada radián de alabeo que falta, 1/s. */
const POR_ALABEO = 1.4;
/** Y cuánto alerón de más por cada rad/s de ritmo que falta, en «a fondo». */
const POR_RITMO_DE_ALABEO = 1;
/** Cuánto giro de morro pide cada radián de trayectoria que falta, 1/s. */
const POR_TRAYECTORIA = 0.6;
/** Y en los que tardan en cambiar de camino, esto partido por lo que tardan. */
const FIRMEZA = 0.45;
/** Y cuánto frena por cada rad/s que la trayectoria ya cambia de más. */
const AMORTIGUA_LA_SENDA = 1.5;
/** Cuánto baja el morro cada radián que el ala se pasa del límite, 1/s. */
const POR_ALFA = 2;
/** Y cuánto baja el compensador por segundo, por radián pasado. */
const POR_ALFA_EN_EL_TRIM = 3;
/** Lo que suma por segundo cada radián de trayectoria que falta, 1/s². */
const SUMA_DE_LA_SENDA = 0.25;
/** Y hasta dónde, en giro por velocidad: m/s². Un tercio de g. */
const SUMA_MAXIMA = 0.33 * 9.80665;
/** Cuánto mira hacia delante el ángulo de ataque, s. */
const MIRA_EL_ALFA = 0.5;
/** El servo del compensador, por segundo, y el amortiguador. */
const SERVO = 1.2;
const AMORTIGUA = 0.4;
/** Lo más que aprieta la mano corrigiendo, g. */
const MAS_CARGA = 0.4;

function acotar(v: number, tope: number): number {
  return v < -tope ? -tope : v > tope ? tope : v;
}
