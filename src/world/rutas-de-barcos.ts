/**
 * Los barcos entre islas: por dónde van, a cuánto y cuándo.
 *
 * Pedido volando entre Gran Canaria y Tenerife con el canal vacío: «que de
 * vez en cuando se vea un ferri por ahí, le daría un punto. En Canarias y muy
 * de vez en cuando». Y tiene todo el sentido: lo que se ve desde el aire en
 * ese canal, además de la isla de enfrente, es la raya blanca de un barco
 * rápido cruzándolo. Un mar sin nadie es un mar de maqueta.
 *
 * Aquí solo está la cuenta —dónde está cada barco a cada hora—, sin three.js,
 * para poder probarla sin abrir un navegador. El dibujo está en `barcos.ts`.
 *
 * ## Las líneas son las de verdad, y por eso son pocas
 *
 * Cuatro líneas, comprobadas una a una, con el tipo de barco que las hace:
 *
 * - **Agaete – Santa Cruz de Tenerife**, con catamarán rápido.
 * - **Los Cristianos – San Sebastián de La Gomera**, con trimarán.
 * - **Corralejo – Playa Blanca**, la más concurrida del archipiélago: un
 *   catamarán y un ferri convencional, porque ahí se cruzan los dos.
 * - **Las Palmas – Santa Cruz de Tenerife**, con ferri grande de carga y
 *   pasaje, que para salir hacia el oeste tiene que rodear La Isleta.
 *
 * Y una que se pidió y **no está**: Las Palmas – Puerto del Rosario –
 * Arrecife. Puerto del Rosario está en la costa de levante de Fuerteventura,
 * así que el barco tiene que rodear la isla, y no se ha podido comprobar por
 * qué lado lo hace. Dibujarlo por el lado equivocado sería enseñar un camino
 * que no existe, que es lo único que aquí no se hace. Queda para cuando se
 * sepa.
 *
 * Los puntos de cada línea no son adorno: son los de los puertos y los de la
 * costa que hay que rodear, y hay una prueba que recorre cada una cada ciento
 * cincuenta metros contra el relieve medido y exige mar debajo. Ver
 * `rutas-de-barcos.test.ts`.
 *
 * ## Las velocidades salen de lo que tardan
 *
 * Un catamarán rápido de esos pasa de treinta y cinco nudos en pruebas, pero
 * la travesía que anuncia la naviera entre Agaete y Santa Cruz es de una hora
 * y veinte, y la del trimarán a La Gomera, de unos cincuenta minutos. Con
 * veintiocho nudos en mar abierto y las maniobras de puerto salen esos
 * tiempos, así que van a veintiocho: es a lo que navegan, no a lo que pueden.
 * Los ferris grandes, a unos veinte; el convencional de Corralejo, a quince,
 * que es lo que le hace tardar la media hora larga que tarda.
 *
 * ## Y muy de vez en cuando
 *
 * **Un barco por línea**, y dos en la de Corralejo: cinco en todo el
 * archipiélago. Una naviera de verdad pone más —la de Agaete sale media docena
 * de veces al día— y aquí se queda en uno a propósito, que es lo que se pidió:
 * que se vea de vez en cuando, no una autopista. Pasan también su rato
 * amarrados en cada punta, como los de verdad, y amarrados no dejan estela.
 */

import { dondeCae, type Sitio } from "./entre-aerodromos";

/** La forma del barco, que es lo que se reconoce desde el aire. */
export type ClaseDeBarco = "ferri" | "catamaran" | "trimaran";

/** Una línea regular entre dos puertos. */
export interface Linea {
  readonly id: string;
  readonly clase: ClaseDeBarco;
  /** Eslora y manga del barco que la hace, m. */
  readonly eslora: number;
  readonly manga: number;
  /** A cuánto navega en mar abierto, en nudos. Ver la cabecera. */
  readonly nudos: number;
  /** Cuánto se queda amarrado en cada punta, s. */
  readonly amarre: number;
  /**
   * Por dónde va: del muelle de un puerto al del otro, con los puntos de la
   * costa que hay que rodear en medio.
   */
  readonly por: readonly Sitio[];
  /**
   * En qué punto del ciclo empieza, de 0 a 1. Fijo, y distinto en cada línea,
   * para que no salgan todos a la vez y el mismo vuelo vea el mismo mar.
   */
  readonly desfase: number;
}

const MINUTO = 60;

export const LINEAS: readonly Linea[] = [
  {
    id: "agaete-santa-cruz",
    clase: "catamaran",
    eslora: 96,
    manga: 26,
    nudos: 28,
    amarre: 45 * MINUTO,
    por: [
      { lat: 28.099, lon: -15.7135 },
      { lat: 28.108, lon: -15.728 },
      { lat: 28.456, lon: -16.23 },
      { lat: 28.4665, lon: -16.244 },
    ],
    desfase: 0.18,
  },
  {
    id: "los-cristianos-san-sebastian",
    clase: "trimaran",
    eslora: 127,
    manga: 30,
    nudos: 28,
    amarre: 40 * MINUTO,
    por: [
      { lat: 28.046, lon: -16.715 },
      { lat: 28.044, lon: -16.73 },
      { lat: 28.083, lon: -17.095 },
      { lat: 28.0865, lon: -17.107 },
    ],
    desfase: 0.61,
  },
  {
    id: "corralejo-playa-blanca-rapido",
    clase: "catamaran",
    eslora: 70,
    manga: 20,
    nudos: 24,
    amarre: 30 * MINUTO,
    por: [
      { lat: 28.7395, lon: -13.859 },
      { lat: 28.748, lon: -13.856 },
      { lat: 28.851, lon: -13.83 },
      { lat: 28.858, lon: -13.829 },
    ],
    desfase: 0.07,
  },
  {
    id: "corralejo-playa-blanca",
    clase: "ferri",
    eslora: 80,
    manga: 16,
    nudos: 15,
    amarre: 35 * MINUTO,
    por: [
      { lat: 28.7385, lon: -13.86 },
      { lat: 28.747, lon: -13.858 },
      { lat: 28.85, lon: -13.832 },
      { lat: 28.8575, lon: -13.831 },
    ],
    desfase: 0.55,
  },
  {
    id: "las-palmas-santa-cruz",
    clase: "ferri",
    eslora: 170,
    manga: 27,
    nudos: 20,
    amarre: 60 * MINUTO,
    por: [
      // El muelle, dentro del puerto de La Luz, y la bocana al sur del dique.
      { lat: 28.132, lon: -15.415 },
      { lat: 28.104, lon: -15.412 },
      // Y la vuelta a La Isleta por fuera del dique, para salir al norte.
      { lat: 28.1, lon: -15.39 },
      { lat: 28.14, lon: -15.385 },
      { lat: 28.185, lon: -15.392 },
      { lat: 28.198, lon: -15.425 },
      { lat: 28.2, lon: -15.47 },
      // Y de ahí, recto al puerto de Santa Cruz por el sur de Anaga.
      { lat: 28.458, lon: -16.228 },
      { lat: 28.4735, lon: -16.244 },
    ],
    desfase: 0.34,
  },
];

/** De nudos a metros por segundo. */
export const NUDO = 0.514444;

/**
 * A cuánto se maniobra dentro del puerto, en nudos.
 *
 * Seis. Nadie entra en una dársena a veintiocho nudos, y un barco que llega a
 * toda máquina hasta el muelle y se para en seco se ve raro incluso desde
 * arriba: la estela se corta de golpe.
 */
const NUDOS_EN_PUERTO = 6;

/** Cuántos metros tarda en pasar de maniobra a velocidad de servicio. */
const RAMPA = 1200;

/** Cada cuántos metros se apunta el horario de una travesía. */
const PASO = 25;

/**
 * Cuánto tarda en girar amarrado, s.
 *
 * Llega con la proa hacia el muelle y sale con la proa hacia el otro puerto:
 * en medio gira en la dársena, como hacen, en unos minutos. Sin esto el barco
 * daría media vuelta de golpe al soltar amarras.
 */
const GIRO_EN_PUERTO = 240;

/** Un barco en este instante. Lo que necesita el dibujo y nada más. */
export interface BarcoEnElMar {
  readonly id: string;
  readonly clase: ClaseDeBarco;
  readonly eslora: number;
  readonly manga: number;
  /** En metros del mundo del escenario, con la Z hacia el sur. */
  readonly x: number;
  readonly z: number;
  /** Rumbo verdadero, en grados. */
  readonly rumbo: number;
  /** A cuánto va ahora, en nudos. Cero amarrado. */
  readonly nudos: number;
  /** A cuánto va en mar abierto, para medir la estela contra eso. */
  readonly deServicio: number;
}

/** Una línea ya puesta en el mundo, con su horario calculado. */
interface Trazada {
  readonly linea: Linea;
  readonly xs: Float64Array;
  readonly zs: Float64Array;
  /** Metros recorridos al llegar a cada punto. */
  readonly acumulado: Float64Array;
  readonly largo: number;
  /** Segundos desde que suelta amarras hasta cada `PASO` metros. */
  readonly horario: Float64Array;
  /** Lo que dura una travesía, s. */
  readonly travesia: number;
  /** Lo que dura el ciclo entero: ida, amarre, vuelta y amarre, s. */
  readonly ciclo: number;
}

/** Suave al empezar y al acabar. */
function suave(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/** Rumbo de compás de un desplazamiento en el mundo: la Z apunta al sur. */
function rumboDe(dx: number, dz: number): number {
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

/** A cuánto va a `s` metros de la salida en una travesía de `largo`. */
export function nudosEn(s: number, largo: number, deServicio: number): number {
  const alPuerto = Math.min(s, largo - s);
  return (
    NUDOS_EN_PUERTO + (deServicio - NUDOS_EN_PUERTO) * suave(alPuerto / RAMPA)
  );
}

/**
 * Las navieras de este mundo: todas las líneas, puestas en las coordenadas
 * del escenario desde el que se vuela.
 */
export class Navieras {
  private readonly trazadas: readonly Trazada[];
  /** Los de este instante, reutilizados para no crear objetos cada fotograma. */
  private readonly barcos: {
    -readonly [K in keyof BarcoEnElMar]: BarcoEnElMar[K];
  }[];

  /**
   * `origen` es el punto del que cuelga el mundo del escenario: el origen de
   * su aeródromo. La misma proyección que coloca las islas vecinas, así que un
   * barco amarrado en Santa Cruz cae en el muelle que se ve y no a cien metros
   * de él. Ver `MundoVecino`.
   */
  constructor(origen: Sitio, lineas: readonly Linea[] = LINEAS) {
    this.trazadas = lineas.map((l) => trazar(origen, l));
    this.barcos = lineas.map((l) => ({
      id: l.id,
      clase: l.clase,
      eslora: l.eslora,
      manga: l.manga,
      x: 0,
      z: 0,
      rumbo: 0,
      nudos: 0,
      deServicio: l.nudos,
    }));
  }

  /** Lo que dura una travesía de cada línea, s. Para las pruebas. */
  travesias(): Record<string, number> {
    return Object.fromEntries(
      this.trazadas.map((t) => [t.linea.id, t.travesia]),
    );
  }

  /**
   * Dónde está cada barco a los `t` segundos del reloj del vuelo.
   *
   * Sin memoria: la misma hora da el mismo mar. Es lo que permite medirlo en
   * un banco y lo que evita que un barco aparezca de la nada.
   */
  en(t: number): readonly BarcoEnElMar[] {
    for (let i = 0; i < this.trazadas.length; i++) {
      const tr = this.trazadas[i]!;
      const b = this.barcos[i]!;
      const { travesia, ciclo } = tr;
      const amarre = tr.linea.amarre;
      const fase =
        (((t + tr.linea.desfase * ciclo) % ciclo) + ciclo) % ciclo;
      if (fase < travesia) {
        this.navegando(tr, b, fase, false);
      } else if (fase < travesia + amarre) {
        this.amarrado(tr, b, fase - travesia, true);
      } else if (fase < 2 * travesia + amarre) {
        this.navegando(tr, b, fase - travesia - amarre, true);
      } else {
        this.amarrado(tr, b, fase - 2 * travesia - amarre, false);
      }
    }
    return this.barcos;
  }

  private navegando(
    tr: Trazada,
    b: { x: number; z: number; rumbo: number; nudos: number },
    tiempo: number,
    deVuelta: boolean,
  ): void {
    const recorrido = recorridoEn(tr, tiempo);
    const s = deVuelta ? tr.largo - recorrido : recorrido;
    const [x, z] = puntoEn(tr, s);
    /*
     * El rumbo, entre un poco antes y un poco después: así en los puntos donde
     * la ruta dobla una punta el barco gira en ochenta metros en vez de en
     * seco, que es lo que se vería desde arriba.
     */
    const sentido = deVuelta ? -1 : 1;
    const [ax, az] = puntoEn(tr, s - 40 * sentido);
    const [dx, dz] = puntoEn(tr, s + 40 * sentido);
    b.x = x;
    b.z = z;
    b.rumbo = rumboDe(dx - ax, dz - az);
    b.nudos = nudosEn(recorrido, tr.largo, tr.linea.nudos);
  }

  private amarrado(
    tr: Trazada,
    b: { x: number; z: number; rumbo: number; nudos: number },
    tiempo: number,
    enElSegundo: boolean,
  ): void {
    const s = enElSegundo ? tr.largo : 0;
    const [x, z] = puntoEn(tr, s);
    // Llega con la proa hacia el muelle y gira hasta tenerla hacia la salida.
    const [ax, az] = puntoEn(tr, enElSegundo ? s - 40 : s + 40);
    const llegada = rumboDe(x - ax, z - az);
    b.x = x;
    b.z = z;
    b.rumbo = (llegada + 180 * suave(tiempo / GIRO_EN_PUERTO)) % 360;
    b.nudos = 0;
  }
}

function trazar(origen: Sitio, linea: Linea): Trazada {
  const n = linea.por.length;
  const xs = new Float64Array(n);
  const zs = new Float64Array(n);
  const acumulado = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = dondeCae(origen, linea.por[i]!);
    xs[i] = p.x;
    zs[i] = p.z;
    if (i > 0)
      acumulado[i] =
        acumulado[i - 1]! + Math.hypot(p.x - xs[i - 1]!, p.z - zs[i - 1]!);
  }
  const largo = acumulado[n - 1]!;
  /*
   * El horario de la travesía, apuntado cada veinticinco metros: lo que se
   * tarda en llegar a cada punto con la velocidad de ese punto. Así la
   * velocidad y la posición salen de la misma cuenta y no pueden discrepar,
   * y buscar dónde está el barco a una hora es una búsqueda en una tabla.
   */
  const pasos = Math.ceil(largo / PASO) + 1;
  const horario = new Float64Array(pasos);
  for (let i = 1; i < pasos; i++) {
    const s0 = (i - 1) * PASO;
    const s1 = Math.min(largo, i * PASO);
    const v = nudosEn((s0 + s1) / 2, largo, linea.nudos) * NUDO;
    horario[i] = horario[i - 1]! + (s1 - s0) / v;
  }
  const travesia = horario[pasos - 1]!;
  return {
    linea,
    xs,
    zs,
    acumulado,
    largo,
    horario,
    travesia,
    ciclo: 2 * travesia + 2 * linea.amarre,
  };
}

/** Cuántos metros lleva recorridos a los `tiempo` segundos de soltar amarras. */
function recorridoEn(tr: Trazada, tiempo: number): number {
  const h = tr.horario;
  if (tiempo <= 0) return 0;
  if (tiempo >= h[h.length - 1]!) return tr.largo;
  let lo = 0;
  let hi = h.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (h[m]! <= tiempo) lo = m;
    else hi = m;
  }
  const t0 = h[lo]!;
  const t1 = h[hi]!;
  const f = t1 > t0 ? (tiempo - t0) / (t1 - t0) : 0;
  return Math.min(tr.largo, (lo + f) * PASO);
}

/** El punto de la ruta a `s` metros del primer muelle, recortado a la ruta. */
function puntoEn(tr: Trazada, s: number): [number, number] {
  const a = tr.acumulado;
  const n = a.length;
  const d = Math.min(tr.largo, Math.max(0, s));
  let i = 1;
  while (i < n - 1 && a[i]! < d) i++;
  const tramo = a[i]! - a[i - 1]!;
  const f = tramo > 0 ? (d - a[i - 1]!) / tramo : 0;
  return [
    tr.xs[i - 1]! + (tr.xs[i]! - tr.xs[i - 1]!) * f,
    tr.zs[i - 1]! + (tr.zs[i]! - tr.zs[i - 1]!) * f,
  ];
}
