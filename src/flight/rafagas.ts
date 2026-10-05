/**
 * **Las ráfagas**: cómo se mueve el aire que el avión cruza, bache a bache.
 *
 * `turbulencia.ts` dice **cuánto** se mueve el aire aquí —el σ_w de la zona,
 * con sus causas— y esto dice **cómo** llega al avión. Hasta ahora era un
 * campo de ruido quieto en el espacio con la misma fuerza en toda la zona, y
 * medido en vuelo salió esto (`scripts/medir-sacudidas.mjs`, JAZ 120 en
 * crucero con turbulencia moderada): el 95 % de la carga vertical por debajo
 * de 0,3 Hz y nada por encima de 2 Hz. O sea, un vaivén largo que no paraba
 * nunca y ni un solo bache. Enrique, que ha volado mucho de pasajero, lo dijo
 * así: «sacudidas según su intensidad, y no un temblor continuo como si
 * tuviera el mal de San Vito», «real y de vez en cuando».
 *
 * Lo real tiene tres partes, y aquí van las tres:
 *
 * 1. **Por tramos.** La turbulencia de verdad no es continua: se cruzan
 *    rachas con aire tranquilo entre medias. El AIM de la FAA lo tiene
 *    escrito en el parte de turbulencia (párrafo 7-1-21, tabla TBL 7-1-11):
 *    *ocasional*, menos de un tercio del tiempo; *intermitente*, de un tercio
 *    a dos tercios; *continua*, más de dos tercios. Cuánto del rato es racha
 *    lo dice la causa —ver `constanciaDe` en `turbulencia.ts`—.
 * 2. **El fondo, Dryden.** Dentro de la racha el aire se mueve con el modelo
 *    de MIL-F-8785C (y MIL-HDBK-1797), con sus filtros de forma y sus escalas:
 *    ruido blanco pasado por las funciones de transferencia de cada componente,
 *    con el tiempo de cada una igual a su escala partida por la velocidad —el
 *    avión cruza el aire, que es la hipótesis de Taylor—.
 * 3. **Los baches.** Encima, ráfagas sueltas con la forma de «uno menos
 *    coseno» de la norma de certificación (14 CFR 25.341(a)): `U/2·(1 −
 *    cos(π·s/H))` a lo largo de `2H`, con la semilongitud `H` entre 30 y 350
 *    pies y la fuerza creciendo con `(H/350)^⅙`. Lo fuertes que son sale de la
 *    intensidad publicada: ver `fuerzaDelBache`.
 *
 * Y lo que el ala tarda en enterarse: la sustentación no salta al entrar en
 * una ráfaga, crece mientras el ala la recorre —la función de Küssner, con la
 * aproximación de Jones—. Sin eso, un bache corto a velocidad de crucero
 * sería un golpe de un fotograma, que es justo el temblor que no se quiere.
 *
 * El avión lo nota por su física, no por un número de aquí: la ráfaga entra
 * en el modelo de vuelo como viento, y la carga que sale es la de Pratt y
 * Walker —`ρ·V·a·U/(2·W/S)`—, así que la avioneta salta y el cuatrimotor
 * apenas se entera. Ver `cargaPorRafaga`.
 *
 * Unidades SI, como todo el modelo de vuelo.
 */

import { mulberry32 } from "../world/noise";
import { escalasDeDryden, QUIETO, type Racha } from "./turbulencia";

/** La densidad a nivel del mar, kg/m³: la de la velocidad equivalente. */
const RHO_0 = 1.225;

/** Pies a metros: la norma está escrita en pies. */
const PIE = 0.3048;

/**
 * La semilongitud de los baches, m: de 30 a 350 pies, la horquilla de
 * 14 CFR 25.341(a)(2) para la ráfaga discreta.
 */
export const H_MINIMA = 30 * PIE;
export const H_MAXIMA = 350 * PIE;

/**
 * **La ráfaga equivalente de cada intensidad**, m/s (velocidad equivalente):
 * dónde empieza cada una.
 *
 * Son los umbrales con los que los aviones de línea informan de turbulencia
 * desde el acelerómetro —la ráfaga vertical equivalente derivada de AMDAR:
 * ligera desde 2, moderada desde 4,5 y fuerte desde 9 m/s (Truscott, 2000,
 * EUMETNET E_AMDAR/TSC/003; tomado de Kim et al., *Atmos. Meas. Tech.* 13,
 * 2020)—. Y la extrema, en 15: los cincuenta pies por segundo de la tabla de
 * la Oficina de Meteorología de Australia (*Hazardous phenomena –
 * Turbulence*, 2025).
 *
 * Una ráfaga equivalente se convierte en carga con la fórmula de Pratt y
 * Walker para cada avión, y para uno de línea mediano en crucero estos
 * números dan lo que dice el ICAO Doc 4444 (PANS-ATM, apéndice 1): la
 * moderada, cambios de 0,5 a 1,0 g en el acelerómetro; la fuerte, más de 1 g.
 * Lo comprueba `rafagas.test.ts`.
 */
export const UDE_DE_CADA = {
  ligera: 2,
  moderada: 4.5,
  severa: 9,
  extrema: 15,
} as const;

/**
 * Los σ_w en los que empieza cada nivel, los de `nivelDe`: así la fuerza de
 * los baches y el nombre de lo que se siente salen del mismo número.
 */
const SIGMA_DE_CADA = { ligera: 0.4, moderada: 1.15, severa: 1.9, extrema: 2.8 } as const;

/**
 * **Lo fuerte que es el bache más fuerte de esta zona**, ráfaga equivalente
 * en m/s, con el σ_w de la zona: el umbral de su nivel, repartido hasta el
 * del siguiente. Por debajo de la ligera, bajando a cero.
 */
export function fuerzaDelBache(sigma: number): number {
  const s = Math.max(0, sigma);
  const tramos: [number, number][] = [
    [0, 0],
    [SIGMA_DE_CADA.ligera, UDE_DE_CADA.ligera],
    [SIGMA_DE_CADA.moderada, UDE_DE_CADA.moderada],
    [SIGMA_DE_CADA.severa, UDE_DE_CADA.severa],
    [SIGMA_DE_CADA.extrema, UDE_DE_CADA.extrema],
  ];
  for (let i = 1; i < tramos.length; i++) {
    const [s1, u1] = tramos[i]!;
    const [s0, u0] = tramos[i - 1]!;
    if (s <= s1) return u0 + ((u1 - u0) * (s - s0)) / (s1 - s0);
  }
  return UDE_DE_CADA.extrema;
}

/**
 * **La carga que pone una ráfaga**, en g por cada m/s de ráfaga verdadera:
 * la fórmula de Pratt y Walker sin el factor de alivio (NACA Report 1206,
 * 1954, ec. 11), `Δn/U = ρ·V·a/(2·W/S)`.
 *
 * Es lo que hace que el grande se note menos: a igualdad de aire, lo que
 * cuenta es la carga alar. La avioneta, con 666 N/m², lleva a ras de suelo un
 * cuarto de g por cada metro por segundo; el cuatrimotor, con casi cinco mil
 * y en crucero, la quinta parte de eso.
 */
export function cargaPorRafaga(a: {
  readonly densidad: number;
  readonly velocidad: number;
  /** Pendiente de sustentación, 1/rad. */
  readonly clAlpha: number;
  /** Peso entre superficie, N/m². */
  readonly cargaAlar: number;
}): number {
  if (!(a.cargaAlar > 0)) return 0;
  return (a.densidad * Math.max(0, a.velocidad) * a.clAlpha) / (2 * a.cargaAlar);
}

/** Lo que hace falta saber del momento. */
export interface Momento {
  /** Cuánto se mueve el aire en la zona: el σ_w de `cuantoSeMueve`, m/s. */
  readonly sigma: number;
  /**
   * Qué parte del rato hay racha, de 0 a 1: ocasional, intermitente o
   * continua. Ver `constanciaDe` en `turbulencia.ts`.
   */
  readonly constancia: number;
  /** Metros sobre el terreno. */
  readonly sobreElSuelo: number;
  /** Si las ruedas están en el suelo: ahí no hay baches sueltos. */
  readonly enTierra: boolean;
  /** Velocidad respecto al aire, m/s. Con el avión parado, la del viento. */
  readonly velocidad: number;
  /** Densidad del aire aquí, kg/m³. */
  readonly densidad: number;
  /** Envergadura, m. */
  readonly envergadura: number;
  /** Cuerda media, m: lo que tarda el ala en enterarse. */
  readonly cuerda: number;
  /** Rumbo de la trayectoria, rad: 0 al norte, creciendo al este. */
  readonly rumbo: number;
}

/** Un bache suelto en marcha. */
interface Bache {
  /** Lo recorrido cuando empezó, m. */
  readonly desde: number;
  /** Su semilongitud, m. */
  readonly h: number;
  /** Su pico, m/s verdaderos, con signo. */
  readonly u: number;
  /** Lo que se lleva de alabeo: la diferencia de un ala a la otra. */
  readonly alabeo: number;
}

/**
 * **Cuánto aire queda entre racha y racha**, en escalas de turbulencia: una
 * racha mide de media tres veces la escala de Dryden —un kilómetro y medio en
 * crucero, que es medio minuto en la avioneta y seis segundos en el reactor—
 * y lo de en medio sale de la constancia.
 */
const RACHA_EN_ESCALAS = 3;

/**
 * Lo que queda fuera de la racha, en fracción de la fuerza: algo, que el aire
 * de una zona movida no está quieto del todo entre baches; poco, que es lo
 * que lo distingue de estar dentro.
 */
const FONDO = 0.12;

/**
 * Cuánto aire hay de media entre bache y bache dentro de la racha, en largos
 * de bache. Seis: lo que deja que cada uno se note como uno, y no un
 * traqueteo.
 */
const ENTRE_BACHES = 6;

/**
 * Cuánto del bache va de un ala a la otra, como mucho: una ráfaga no le pega
 * igual a las dos puntas, y esa diferencia es lo que levanta un ala.
 */
const ASIMETRIA = 0.25;

/**
 * **Lo que dura como poco un bache**, s: un cuarto de segundo.
 *
 * A velocidad de crucero los treinta pies de la norma se cruzan en ocho
 * centésimas: cinco fotogramas. Medido con la carga de un avión de línea, eso
 * dejaba la sexta parte de la sacudida por encima de cinco hercios —un
 * chisporroteo, el temblor que no se quiere— y casi nada de ella llega al
 * asiento, que la filtra el propio avión. Así que el bache más corto que se
 * cruza dura un cuarto de segundo: es la presentación, no el aire.
 */
const DURA_COMO_POCO = 0.25;

/**
 * **Cuánto hay que empujar para que se sienta lo publicado.**
 *
 * La ráfaga equivalente de AMDAR es la que, metida en la fórmula de Pratt con
 * su factor de alivio, da la aceleración que midió el avión; los baches de
 * aquí son más cortos que los de esa fórmula —los de la norma, no los de doce
 * cuerdas y media— y el ala los nota menos, y el avión se va con ellos. Este
 * número es lo que hay que subirlos para que un avión de línea mediano en
 * crucero sienta lo que dice el ICAO Doc 4444: en el umbral de la moderada,
 * medio g de pico a pico; en el de la fuerte, uno. Lo mide `rafagas.test.ts`.
 */
const REFUERZO = 1.65;

/** El paso de integración más largo, s: los filtros van finos aunque el fotograma no. */
const PASO = 1 / 120;

export class Rafagas {
  private readonly azar: () => number;
  private gaussGuardado: number | null = null;

  // Los filtros de Dryden: una etapa de primer orden para la longitudinal y
  // dos para la lateral y la vertical. Ver `paso`.
  private u1 = 0;
  private v1 = 0;
  private v2 = 0;
  private w1 = 0;
  private w2 = 0;
  private p1 = 0;

  // La racha: si se está dentro, cuánto falta para cambiar y la envolvente.
  private dentro = false;
  private falta = 0;
  private envolvente = 0;

  // Los baches.
  private recorrido = 0;
  private proximo = 0;
  private readonly baches: Bache[] = [];

  // Lo que el ala ya ha notado: las dos partes de la de Jones.
  private wRapida = 0;
  private wLenta = 0;
  private pRapida = 0;
  private pLenta = 0;

  /** La última, en los ejes del mundo. */
  private ultima: Racha = QUIETO;

  constructor(semilla?: number) {
    this.azar = semilla === undefined ? Math.random : mulberry32(semilla);
    this.falta = -1;
  }

  /** Si se está ahora en una racha. Para los bancos y las pruebas. */
  get enRacha(): boolean {
    return this.dentro;
  }

  /** Cuánta racha hay, de `FONDO` a uno. */
  get cuanta(): number {
    return this.envolvente;
  }

  /** La última ráfaga devuelta. */
  get ahora(): Racha {
    return this.ultima;
  }

  private gauss(): number {
    if (this.gaussGuardado !== null) {
      const g = this.gaussGuardado;
      this.gaussGuardado = null;
      return g;
    }
    const a = Math.max(1e-12, this.azar());
    const b = this.azar();
    const r = Math.sqrt(-2 * Math.log(a));
    this.gaussGuardado = r * Math.sin(2 * Math.PI * b);
    return r * Math.cos(2 * Math.PI * b);
  }

  /** Un largo al azar, exponencial —sin memoria: «de vez en cuando»—, con suelo. */
  private largo(media: number): number {
    return media * (0.3 + 0.7 * -Math.log(Math.max(1e-9, this.azar())));
  }

  /** Avanza `dt` segundos y devuelve la ráfaga, en los ejes del mundo. */
  paso(dt: number, m: Momento): Racha {
    if (!(dt > 0) || !(m.sigma > 0)) {
      // Aire quieto: nada que cruzar. Los baches a medias se olvidan.
      this.baches.length = 0;
      this.envolvente = 0;
      this.wRapida = this.wLenta = this.pRapida = this.pLenta = 0;
      this.ultima = QUIETO;
      return QUIETO;
    }
    const V = Math.max(2, m.velocidad);
    const e = escalasDeDryden(m.sobreElSuelo);
    const constancia = Math.max(0.15, Math.min(0.95, m.constancia));
    const mediaRacha = Math.max(400, RACHA_EN_ESCALAS * e.lw);
    const mediaCalma = (mediaRacha * (1 - constancia)) / constancia;
    const b = Math.max(1, m.envergadura);
    /*
     * **Los baches, hasta la mitad de la escala vertical.** Cerca del suelo
     * los remolinos son del tamaño de la altura —la escala de Dryden a baja
     * cota es la altura misma—, así que uno de cien metros a veinte del suelo
     * no cabe. Con el mínimo de la norma, treinta pies, quiere decir que por
     * debajo de dieciocho metros no hay baches sueltos: solo el fondo.
     */
    const hTope = Math.min(H_MAXIMA, 0.5 * e.lw);
    const hCorta = Math.min(hTope, Math.max(H_MINIMA, (V * DURA_COMO_POCO) / 2));
    const hayBaches = !m.enTierra && hTope >= H_MINIMA;
    const tope =
      REFUERZO * fuerzaDelBache(m.sigma) * Math.sqrt(RHO_0 / Math.max(0.05, m.densidad));
    const c = Math.max(0.3, m.cuerda);

    let total = dt;
    let wDryden = 0;
    let uDryden = 0;
    let vDryden = 0;
    let pDryden = 0;
    while (total > 1e-9) {
      const h = Math.min(PASO, total);
      total -= h;
      const anda = V * h;
      this.recorrido += anda;

      // ── La racha: dentro o fuera, por tramos ─────────────────────────
      if (this.falta < 0) {
        // Al empezar, en un sitio cualquiera de la calma.
        this.dentro = false;
        this.falta = this.azar() * this.largo(mediaCalma);
      }
      this.falta -= anda;
      if (this.falta <= 0) {
        this.dentro = !this.dentro;
        this.falta = this.largo(this.dentro ? mediaRacha : mediaCalma);
        if (this.dentro) this.proximo = this.recorrido + this.azar() * 0.5 * mediaRacha;
      }
      // Ni se entra ni se sale de golpe: en media escala.
      const meta = this.dentro ? 1 : FONDO;
      this.envolvente += (meta - this.envolvente) * (1 - Math.exp(-anda / (0.5 * e.lw)));

      // ── El fondo: los filtros de Dryden ──────────────────────────────
      /*
       * La vertical y la lateral, `σ·√T·(1 + √3·T·s)/(1 + T·s)²`, que es una
       * de primer orden de varianza uno —`z₁`— seguida de un adelanto-retraso
       * `√3 + (1 − √3)/(1 + T·s)`; con el factor `1/√2` la varianza sale σ².
       * La longitudinal, una de primer orden. Las de primer orden, exactas
       * para cualquier paso.
       */
      const tw = e.lw / V;
      const tuv = e.luv / V;
      const aw = Math.exp(-h / tw);
      const auv = Math.exp(-h / tuv);
      this.w1 = aw * this.w1 + Math.sqrt(1 - aw * aw) * this.gauss();
      this.w2 += (this.w1 - this.w2) * (1 - aw);
      this.v1 = auv * this.v1 + Math.sqrt(1 - auv * auv) * this.gauss();
      this.v2 += (this.v1 - this.v2) * (1 - auv);
      this.u1 = auv * this.u1 + Math.sqrt(1 - auv * auv) * this.gauss();
      // El alabeo, de primer orden con `T = 4b/(πV)` (MIL-F-8785C).
      const ap = Math.exp(-h / ((4 * b) / (Math.PI * V)));
      this.p1 = ap * this.p1 + Math.sqrt(1 - ap * ap) * this.gauss();
      const s = m.sigma * this.envolvente;
      const sh = s * e.horizontal;
      wDryden = (s / Math.SQRT2) * (Math.sqrt(3) * this.w1 + (1 - Math.sqrt(3)) * this.w2);
      vDryden = (sh / Math.SQRT2) * (Math.sqrt(3) * this.v1 + (1 - Math.sqrt(3)) * this.v2);
      uDryden = sh * this.u1;
      // La de alabeo de MIL-F-8785C: `σ_p = 1,9·σ_w/√(L_w·b)`.
      pDryden = ((1.9 * s) / Math.sqrt(e.lw * b)) * this.p1;

      // ── Los baches sueltos ────────────────────────────────────────────
      if (hayBaches && this.dentro && this.recorrido >= this.proximo) {
        // La semilongitud, repartida por igual en escala: tantos cortos como largos.
        const hb = hCorta * Math.pow(hTope / hCorta, this.azar());
        // La fuerza: `(H/350)^⅙` de la norma, y de la mitad al tope de la zona.
        const u =
          tope * Math.pow(hb / H_MAXIMA, 1 / 6) * (0.5 + 0.5 * this.azar()) *
          (this.azar() < 0.5 ? -1 : 1);
        this.baches.push({
          desde: this.recorrido,
          h: hb,
          u,
          alabeo: (2 * ASIMETRIA * (2 * this.azar() - 1) * u) / b,
        });
        this.proximo = this.recorrido + this.largo(ENTRE_BACHES * 2 * hb);
      }
      if (!this.dentro && this.envolvente < 0.5) this.proximo = Number.POSITIVE_INFINITY;

      let wBaches = 0;
      let pBaches = 0;
      for (let i = this.baches.length - 1; i >= 0; i--) {
        const k = this.baches[i]!;
        const x = this.recorrido - k.desde;
        if (x >= 2 * k.h) {
          this.baches.splice(i, 1);
          continue;
        }
        const forma = 0.5 * (1 - Math.cos((Math.PI * x) / k.h));
        wBaches += k.u * forma;
        pBaches += k.alabeo * forma;
      }

      /*
       * **Y lo que el ala ya ha notado.** La aproximación de Jones a la
       * función de Küssner, `ψ(s) ≈ 1 − 0,5·e^(−0,13·s) − 0,5·e^(−s)` con `s`
       * en semicuerdas recorridas: media sustentación llega en una semicuerda
       * y la otra media en ocho. Son dos retrasos de primer orden.
       */
      const semicuerdas = (2 * anda) / c;
      const rapida = 1 - Math.exp(-semicuerdas);
      const lenta = 1 - Math.exp(-0.13 * semicuerdas);
      const w = wDryden + wBaches;
      const p = pDryden + pBaches;
      this.wRapida += (w - this.wRapida) * rapida;
      this.wLenta += (w - this.wLenta) * lenta;
      this.pRapida += (p - this.pRapida) * rapida;
      this.pLenta += (p - this.pLenta) * lenta;
    }

    // En los ejes del mundo: la longitudinal por donde se va, la lateral a la derecha.
    const sin = Math.sin(m.rumbo);
    const cos = Math.cos(m.rumbo);
    this.ultima = {
      x: uDryden * sin + vDryden * cos,
      y: 0.5 * (this.wRapida + this.wLenta),
      z: -uDryden * cos + vDryden * sin,
      alabeo: 0.5 * (this.pRapida + this.pLenta),
    };
    return this.ultima;
  }
}
