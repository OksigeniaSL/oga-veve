/**
 * **El remolque**: el tractor que saca de espaldas a un avión de línea de su
 * puesto de contacto, y la persona de tierra que va a su lado.
 *
 * Un avión de línea que aparca pegado a la terminal lo hace **con el morro
 * hacia el edificio**, y de ahí no sale solo: desde la cabina no se ve lo que
 * hay detrás, y para ir marcha atrás con las reversas el chorro iría contra la
 * terminal y la gente de tierra. Le
 * empuja un tractor enganchado a la rueda de morro, hacia atrás, hasta la
 * calle de rodaje, girándolo para que se quede mirando hacia donde va a rodar.
 * Al lado camina una persona con casco y cascos de oír, enchufada al avión por
 * un cable, que es quien habla con la cabina de mando. Al acabar: freno de
 * aparcamiento, se desengancha el tractor, la persona quita el pasador de la
 * rueda de morro —el que deja la dirección suelta para que el tractor la
 * gire— y se lo **enseña** a la cabina con su cinta roja, y saluda. Desde ese
 * saludo el avión ya es de sus pilotos.
 *
 * Es lo que se ve en cualquier aeropuerto del mundo, y lo primero que se
 * enseña de él es lo que dice AGENTS.md, regla 4: quien lo aprenda aquí tiene
 * que reconocerlo el día que vuele. Así que:
 *
 * - **Solo en los puestos de contacto, y solo los aviones de línea.** Una
 *   avioneta en una plataforma de aviación general sale de frente, que es lo
 *   que hace. Ver `saleConRemolque`.
 * - **A paso de persona**: un metro por segundo, que es lo que anda quien va
 *   al lado con el cable. Ver `VA_EMPUJANDO`.
 * - **Con un giro que el avión y el tractor pueden hacer**: el radio sale de la
 *   batalla del avión y del ángulo que se le da a la rueda de morro, como en el
 *   rodaje. Ver `trayectoriaDelEmpuje`.
 *
 * Esto es solo la lógica, sin Three ni DOM: qué puesto es de remolque, hacia
 * dónde mira el avión en él, por dónde va el empuje y en qué punto está cada
 * cosa en cada instante. Lo dibuja `tractor-de-remolque.ts`, lo engancha
 * `game.ts` y lo prueba `remolque.test.ts`. Ver el ADR 0025.
 *
 * Coordenadas del mundo: `x` al este y `z` al sur, en metros; rumbos en
 * radianes, cero al norte y positivos hacia el este, como en
 * `flight/vuelo-de-linea.ts`. Los edificios vienen del aeródromo, con su `y`
 * al norte: se le da la vuelta aquí.
 */

import type { Aerodrome, Punto } from "./aerodrome";

const GRADO = Math.PI / 180;

/** Una postura en el suelo: dónde y hacia dónde mira. */
export interface Pose {
  readonly x: number;
  readonly z: number;
  /** Rad, cero al norte y positivo hacia el este. */
  readonly rumbo: number;
}

/** Un punto del suelo del mundo, m. */
export interface PuntoXZ {
  readonly x: number;
  readonly z: number;
}

/** Los edificios del aeródromo, como los trae: polígonos con `y` al norte. */
export type Edificios = readonly { readonly polygon: readonly Punto[] }[];

// ── Qué puesto es de remolque ────────────────────────────────────────────

/**
 * **El largo de un avión de línea por su batalla**: de 2,4 a 2,6 en los de
 * verdad —un 787-9 mide 62,8 m con 25,8 de batalla; un E-170, 29,9 con 11,5;
 * un 737-800, 39,5 con 15,6—. La ficha no lleva el largo, y la batalla sí:
 * con dos y medio, el error es de un par de metros.
 */
export const LARGO_POR_BATALLA = 2.5;

/** El largo de un avión de esa batalla, m. Ver `LARGO_POR_BATALLA`. */
export function largoPorLaBatalla(batalla: number): number {
  return batalla * LARGO_POR_BATALLA;
}

/**
 * **Lo que puede quedar del morro a la pared en un puesto de contacto**, m: lo
 * que alcanza una pasarela telescópica desde su rótula, más el trozo de
 * plataforma entre la rótula y la fachada. Las de verdad estiran de veinte a
 * cuarenta metros. Más allá, el puesto es de plataforma: se sale de frente, o
 * en autobús.
 */
export const ALCANCE_DE_LA_PASARELA = 50;

/**
 * **Lo que se deja como poco entre el morro y la pared**, m. Un puesto que no
 * lo deja no es para este avión: el morro se metería en el edificio.
 */
export const HOLGURA_DEL_MORRO = 5;

/**
 * **La pared más cercana**: a qué distancia está del punto y en qué rumbo.
 * A la pared y no a la esquina, como en `puestosCandidatos`: un edificio largo
 * tiene las esquinas lejos de su fachada.
 */
export function paredMasCercana(
  x: number,
  z: number,
  edificios: Edificios,
): { readonly distancia: number; readonly rumbo: number } | null {
  let mejor = Infinity;
  let hacia: PuntoXZ | null = null;
  for (const e of edificios) {
    const n = e.polygon.length;
    if (n < 2) continue;
    for (let i = 0; i < n; i++) {
      const a = e.polygon[i]!;
      const b = e.polygon[(i + 1) % n]!;
      // Del aeródromo al mundo: la `y` al norte es la `z` al sur, con el signo cambiado.
      const ax = a[0];
      const az = -a[1];
      const dx = b[0] - ax;
      const dz = -b[1] - az;
      const l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const qx = ax + dx * t;
      const qz = az + dz * t;
      const d = Math.hypot(qx - x, qz - z);
      if (d < mejor) {
        mejor = d;
        hacia = { x: qx, z: qz };
      }
    }
  }
  if (!hacia) return null;
  return { distancia: mejor, rumbo: rumboEntre({ x, z }, hacia) };
}

/**
 * **Si un puesto es de contacto para un avión de este largo**: pegado a un
 * edificio, con el morro a menos de lo que alcanza una pasarela y sin meterse
 * en él. El avión se pone con su centro en el punto del puesto, así que el
 * morro queda a medio largo por delante.
 */
export function esPuestoDeContacto(x: number, z: number, edificios: Edificios, largo: number): boolean {
  const pared = paredMasCercana(x, z, edificios);
  if (!pared) return false;
  const delMorro = pared.distancia - largo / 2;
  return delMorro >= HOLGURA_DEL_MORRO && delMorro <= ALCANCE_DE_LA_PASARELA;
}

/**
 * **Los edificios junto a los que puede haber un puesto de contacto**: los del
 * campo si embarca por pasarela, y ninguno si no. La regla de los cincuenta
 * metros sola daba por puestos de pasarela los de cualquier campo con un
 * edificio cerca de la plataforma —La Gomera, Ayolas, Cuatro Vientos—, y allí un
 * reactor salía empujado de una pasarela que no hay. Ver `Aerodrome.pasarelas`.
 */
export function edificiosDePasarela(aero: Pick<Aerodrome, "pasarelas" | "buildings"> | null | undefined): Edificios {
  return aero?.pasarelas?.hay === true ? (aero.buildings ?? []) : [];
}

/**
 * **Si este avión sale de este puesto empujado por un tractor**: los de línea,
 * de un puesto de contacto. Lo demás sale de frente, que es lo que hace: una
 * avioneta en la plataforma de aviación general rueda sola hacia delante.
 */
export function saleConRemolque(
  deLinea: boolean,
  x: number,
  z: number,
  edificios: Edificios,
  largo: number,
): boolean {
  return deLinea && esPuestoDeContacto(x, z, edificios, largo);
}

/**
 * **Hacia dónde mira un avión aparcado en un puesto de contacto**: con el
 * morro al edificio, hacia su pared más cercana. Es como se aparca en una
 * pasarela, que sale de la fachada hasta la puerta de delante. Rad, o `null`
 * si el campo no tiene edificios.
 */
export function rumboAlEdificio(x: number, z: number, edificios: Edificios): number | null {
  return paredMasCercana(x, z, edificios)?.rumbo ?? null;
}

/**
 * **Hacia dónde mira el avión en un puesto de contacto, sabiendo por dónde sale**:
 * con el morro al edificio y la cola hacia la raya del puesto, que es la línea de
 * entrada pintada en el suelo. Si la raya sale del puesto apuntando lejos del
 * edificio —menos de cincuenta grados de lo contrario a la pared—, el avión se
 * pone en su eje, que es como para uno de verdad: en la línea de entrada. Si no,
 * mirando a la pared.
 */
export function rumboEnElPuesto(
  x: number,
  z: number,
  edificios: Edificios,
  raya: readonly PuntoXZ[],
): number | null {
  const alEdificio = rumboAlEdificio(x, z, edificios);
  if (alEdificio === null) return null;
  let lejos: PuntoXZ | null = null;
  for (const p of raya) {
    if (Math.hypot(p.x - x, p.z - z) > 15) {
      lejos = p;
      break;
    }
  }
  if (!lejos) return alEdificio;
  const porLaRaya = rumboEntre(lejos, { x, z });
  return Math.abs(diferencia(alEdificio, porLaRaya)) < 50 * GRADO ? normalizar(porLaRaya) : alEdificio;
}

// ── Por dónde va el empuje ───────────────────────────────────────────────

/**
 * **El ángulo de la rueda de morro en el giro del empuje**: cuarenta y cinco
 * grados, con el radio en el tren principal igual a la batalla. Es un giro
 * holgado, de los que se hacen sin forzar nada: el tractor sin barra deja
 * llevarla hasta unos setenta, y los manuales de remolque de los fabricantes
 * marcan su tope más allá. Ver `DIRECCION_MAXIMA`.
 */
export const DIRECCION_EN_EL_GIRO = 45 * GRADO;

/**
 * **Y el ángulo más cerrado que se le pide**, si la calle está tan cerca del
 * puesto que con el holgado no da: setenta grados, que un tractor sin barra
 * hace y que queda por debajo del tope de giro con el pasador quitado de los
 * aviones de línea.
 */
export const DIRECCION_MAXIMA = 70 * GRADO;

/** Lo que se empuja recto al final para dejar la rueda de morro derecha, m. */
export const ENDEREZA = 8;

/** Cuánto tiene que torcer la raya para que eso sea la calle, y no el puesto. */
const LA_CALLE_TUERCE = 40 * GRADO;
/**
 * **Cuándo sale la raya del puesto de lado**, y no hacia atrás: los mismos cincuenta
 * grados que en `rumboEnElPuesto`, que con menos pone el avión en el eje de la raya.
 */
const SALE_DE_LADO = 50 * GRADO;
/** Cuántos metros de raya se miran para saber hacia dónde va la calle. */
const MIRA_LA_CALLE = 30;
/**
 * **Hasta dónde se busca la calle**, en largos del avión y nunca menos de cuarenta
 * metros: la calle de servicio de detrás de un puesto de contacto está a un largo
 * de avión y poco más. Una raya que sigue recta más allá no es la calle del
 * puesto: es una calle que sale de frente. Ver `trayectoriaDelEmpuje`.
 */
const BUSCA_LA_CALLE = 1.3;
/** Cada cuánto se apunta una postura del empuje, m. */
const PASO = 0.5;

/** **El empuje entero**: las posturas del avión, una cada medio metro, y cómo es. */
export interface Empuje {
  /** Las posturas del avión, de la del puesto a la del final. */
  readonly poses: readonly Pose[];
  /** Lo que se recorre, m. */
  readonly largo: number;
  /** El radio del giro en el tren principal, m. */
  readonly radio: number;
  /** Lo que gira el avión, rad, positivo a la derecha. */
  readonly giro: number;
  /** Dónde se cruza la raya del puesto con la calle. */
  readonly cruce: PuntoXZ;
}

/**
 * **Por dónde va el empuje**: desde el puesto, con el morro al edificio, hacia
 * atrás por la raya del puesto hasta la calle, y girando para que el morro
 * acabe mirando hacia donde sigue la raya. El tren principal dibuja una recta,
 * un arco y otra recta: es lo que hace un avión empujado, que no derrapa.
 *
 * - **La calle** es donde la raya tuerce: el primer punto en el que lo que
 *   viene por delante se aparta más de cuarenta grados de la salida del
 *   puesto. El morro acaba mirando hacia allí.
 * - **El giro**, el del tren principal con la rueda de morro a cuarenta y cinco
 *   grados: un radio igual a la batalla. Si la calle está demasiado cerca para
 *   ese giro, se cierra hasta los setenta; y si ni así cabe, se empieza a girar
 *   desde el puesto.
 * - **Y si la raya da media vuelta** —una calle que sigue de frente, por donde
 *   se vino—, el empuje gira noventa grados y lo demás lo rueda el avión.
 * - **Y si sale del puesto de lado**, a lo largo de la fachada y sin torcer
 *   cerca, el morro acaba mirando hacia donde va la raya.
 *
 * `desde` es el avión en el puesto, mirando al edificio; `raya`, la del plan,
 * que empieza en el puesto. `null` si no hay raya que seguir.
 */
export function trayectoriaDelEmpuje(desde: Pose, raya: readonly PuntoXZ[], batalla: number): Empuje | null {
  if (raya.length < 2) return null;
  const acum: number[] = [0];
  for (let i = 1; i < raya.length; i++)
    acum.push(acum[i - 1]! + Math.hypot(raya[i]!.x - raya[i - 1]!.x, raya[i]!.z - raya[i - 1]!.z));
  const total = acum[acum.length - 1]!;
  if (total < 5) return null;
  const enLaRaya = (s: number): PuntoXZ => {
    const d = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < raya.length - 1 && acum[i]! < d) i++;
    const a = raya[i - 1]!;
    const b = raya[i]!;
    const l = acum[i]! - acum[i - 1]! || 1;
    const k = (d - acum[i - 1]!) / l;
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
  };
  const salida = rumboEntre(enLaRaya(0), enLaRaya(Math.min(20, total)));
  // ── La calle: donde la raya tuerce ──
  const largoDelAvion = largoPorLaBatalla(batalla);
  const alcance = Math.max(40, BUSCA_LA_CALLE * largoDelAvion);
  let cruce: PuntoXZ | null = null;
  let calle = salida;
  /** El primer sitio donde tuerce la raya, a cualquier distancia, y hacia dónde va desde ahí. */
  let tuerce: { readonly s: number; readonly k: number; readonly va: number } | null = null;
  for (let k = 1; k < raya.length && !tuerce; k++) {
    if (acum[k]! < 8) continue;
    const va = rumboEntre(enLaRaya(acum[k]!), enLaRaya(acum[k]! + MIRA_LA_CALLE));
    if (Math.abs(diferencia(salida, va)) > LA_CALLE_TUERCE) tuerce = { s: acum[k]!, k, va };
  }
  if (tuerce && tuerce.s <= alcance) {
    cruce = raya[tuerce.k]!;
    calle = tuerce.va;
  } else {
    /*
     * **La raya sale de frente**: sigue recta hacia atrás más allá de un largo de avión.
     * Se empuja hasta dejar el puesto libre y se gira noventa grados, con el morro hacia
     * el lado al que la raya tuerce después; lo demás lo rueda el avión, que es lo que se
     * hace cuando el puesto da a una calle que sale de frente.
     */
    cruce = enLaRaya(Math.min(total, largoDelAvion / 2 + 15));
    if (Math.abs(diferencia(desde.rumbo + Math.PI, salida)) > SALE_DE_LADO) {
      /*
       * **Y si sale del puesto de lado**, a lo largo de la fachada, la calle es la propia raya:
       * el morro acaba mirando hacia donde va. Con el giro de noventa grados de la de frente
       * se quedaba de espaldas a ella en la mitad de los casos —Barajas fuera del T5, con los
       * dos grandes—, y tenía que dar media vuelta rodando por la plataforma.
       */
      calle = salida;
    } else {
      const lado = tuerce ? Math.sign(diferencia(salida, tuerce.va)) || 1 : 1;
      calle = salida + lado * (Math.PI / 2);
    }
  }

  // ── Las dos rectas: la de la cola saliendo del puesto y la de la calle ──
  const atras = desde.rumbo + Math.PI;
  const b = vector(atras);
  let giro = diferencia(atras, calle + Math.PI);
  // Media vuelta no se empuja: noventa grados, hacia el lado que tuerce la calle.
  const mediaVuelta = Math.abs(giro) > 120 * GRADO;
  if (mediaVuelta) giro = Math.sign(giro || 1) * 90 * GRADO;
  const w = vector(atras + giro);
  const sx = cruce.x - desde.x;
  const sz = cruce.z - desde.z;
  const det = -b.x * w.z + w.x * b.z;
  const proyectado = sx * b.x + sz * b.z;
  let hastaElCruce = proyectado;
  if (!mediaVuelta && Math.abs(det) > 0.05) hastaElCruce = (-sx * w.z + w.x * sz) / det;
  /*
   * Si las dos rectas casi no se cortan —la cola sale torcida respecto a la raya—, el corte
   * se va lejos: entonces vale lo que queda del cruce por detrás, que es donde está la calle.
   */
  if (hastaElCruce > Math.hypot(sx, sz) + 30) hastaElCruce = proyectado;
  hastaElCruce = Math.max(0, hastaElCruce);

  // ── El giro, con el radio que dé ──
  const medio = Math.tan(Math.abs(giro) / 2);
  let radio = batalla / Math.tan(DIRECCION_EN_EL_GIRO);
  const minimo = batalla / Math.tan(DIRECCION_MAXIMA);
  if (medio > 1e-3 && radio * medio > hastaElCruce - 1)
    radio = Math.max(minimo, (hastaElCruce - 1) / medio);
  const recto = Math.max(0, hastaElCruce - radio * medio);

  const poses: Pose[] = [];
  const sentido = Math.sign(giro) || 1;
  const arco = radio * Math.abs(giro);
  const largo = recto + arco + ENDEREZA;
  const inicioDelArco = { x: desde.x + b.x * recto, z: desde.z + b.z * recto };
  const centro = vector(atras + (sentido * Math.PI) / 2);
  const cx = inicioDelArco.x + centro.x * radio;
  const cz = inicioDelArco.z + centro.z * radio;
  const finDelArco = posicionEnElArco(cx, cz, radio, atras, sentido, Math.abs(giro));
  for (let s = 0; ; s = Math.min(largo, s + PASO)) {
    let p: PuntoXZ;
    let va: number;
    if (s <= recto) {
      p = { x: desde.x + b.x * s, z: desde.z + b.z * s };
      va = atras;
    } else if (s <= recto + arco) {
      const th = (s - recto) / radio;
      p = posicionEnElArco(cx, cz, radio, atras, sentido, th);
      va = atras + sentido * th;
    } else {
      const r = s - recto - arco;
      p = { x: finDelArco.x + w.x * r, z: finDelArco.z + w.z * r };
      va = atras + giro;
    }
    // El avión va de culo: mira al revés de por donde va.
    poses.push({ x: p.x, z: p.z, rumbo: normalizar(va + Math.PI) });
    if (s >= largo) break;
  }
  return { poses, largo, radio, giro, cruce };
}

/** El punto del arco a `th` radianes de su principio. */
function posicionEnElArco(cx: number, cz: number, radio: number, atras: number, sentido: number, th: number): PuntoXZ {
  const r = vector(atras - (sentido * Math.PI) / 2 + sentido * th);
  return { x: cx + r.x * radio, z: cz + r.z * radio };
}

/** La postura del avión a `s` metros del principio del empuje, entre dos apuntadas. */
export function poseDelEmpuje(e: Empuje, s: number): Pose {
  const n = e.poses.length;
  const f = Math.max(0, Math.min(n - 1, (s / e.largo) * (n - 1)));
  const i = Math.min(n - 2, Math.floor(f));
  if (n < 2) return e.poses[0]!;
  const a = e.poses[i]!;
  const b = e.poses[i + 1]!;
  const k = f - i;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, rumbo: normalizar(a.rumbo + diferencia(a.rumbo, b.rumbo) * k) };
}

// ── El remolque, paso a paso ─────────────────────────────────────────────

/**
 * **A qué velocidad se empuja**, m/s: un metro por segundo, tres kilómetros y
 * medio por hora, que es el paso de quien va andando al lado con el cable. Los
 * manuales de plataforma ponen el tope del empuje en el paso de una persona.
 */
export const VA_EMPUJANDO = 1;
/** Lo que acelera y frena el tractor, m/s²: que no se note el tirón en el asiento. */
export const ACELERA_EMPUJANDO = 0.12;
/** Lo que anda la persona de tierra, m/s, y lo que rueda el tractor ya suelto. */
const ANDA = 1.4;
const RUEDA_SUELTO = 4;
/** Con el avión parado, lo que tarda en ponerse el freno de aparcamiento, s. */
export const SE_FRENA = 4;
/** Y lo que tarda en soltarse: bajar la rueda, desenchufar el cable y quitar el pasador, s. */
export const SE_SUELTA = 8;
/** Lo que enseña el pasador, s, y lo que dura el saludo. */
export const ENSENA_EL_PASADOR = 3;
export const SALUDA = 3;

/** Lo que va pasando, en su orden. */
export type FaseDelRemolque =
  /** En el puesto, enganchado, esperando a que la cabina diga que se empuje. */
  | "enganchado"
  /** Empujando, hacia atrás. */
  | "empujando"
  /** Parado al final, con el freno de aparcamiento poniéndose. */
  | "frenado"
  /** Soltándose: la rueda baja, el cable fuera, el pasador fuera. */
  | "soltando"
  /** El tractor se aparta hacia la plataforma. */
  | "apartandose"
  /** La persona va a su sitio, a la vista de la cabina. */
  | "andando"
  /** Enseña el pasador y saluda. */
  | "saludando"
  /** Ya está: el avión es de sus pilotos. */
  | "libre";

/** Lo que hace la persona de tierra con los brazos. */
export type GestoDeTierra = "anda" | "quieto" | "pasador" | "saludo";

/** Las medidas que hacen falta del avión, m. */
export interface MedidasDelAvion {
  readonly batalla: number;
  readonly envergadura: number;
}

/** **El tractor de este avión**: largo y ancho, m. Ver `tractorPara`. */
export interface MedidasDelTractor {
  readonly largo: number;
  readonly ancho: number;
  readonly alto: number;
}

/**
 * **El tractor que empuja a un avión de este tamaño**, sin barra: los de
 * fuselaje ancho, con uno de los grandes —nueve metros por cuatro y pico, como
 * los que mueven un 787 o un A350—, y los regionales y de pasillo único, con
 * uno de seis y medio por tres. Ver el ADR 0025.
 */
export function tractorPara(batalla: number): MedidasDelTractor {
  return batalla >= 20 ? { largo: 9, ancho: 4.3, alto: 1.8 } : { largo: 6.5, ancho: 3.1, alto: 1.6 };
}

/**
 * **El remolque de un vuelo**, de enganchado a libre. El avión se mueve por la
 * trayectoria del empuje; el tractor va pegado a su rueda de morro hasta que se
 * suelta, y luego se aparta; la persona camina al lado con el cable y, al
 * final, se pone a la vista de la cabina, enseña el pasador y saluda.
 *
 * Quien lo usa dice cuándo empezar —con las puertas cerradas, los toboganes
 * armados y la baliza encendida— y da los pasos; lo demás lo lleva él.
 */
export class Remolque {
  private faseAhora: FaseDelRemolque = "enganchado";
  private enFase = 0;
  private recorrido = 0;
  private v = 0;
  private readonly tractorMide: MedidasDelTractor;
  /** El camino del tractor ya suelto, y lo que lleva de él. */
  private caminoDelTractor: readonly PuntoXZ[] = [];
  private delCaminoDelTractor = 0;
  private tractorAhora: Pose;
  private rumboDelTractor: number;
  /** El camino de la persona a su sitio, y lo que lleva de él. */
  private caminoDeLaPersona: readonly PuntoXZ[] = [];
  private delCaminoDeLaPersona = 0;
  private personaAhora: Pose;

  constructor(
    readonly empuje: Empuje,
    private readonly avionMide: MedidasDelAvion,
  ) {
    this.tractorMide = tractorPara(avionMide.batalla);
    this.tractorAhora = this.tractorEnganchado();
    this.rumboDelTractor = this.tractorAhora.rumbo;
    this.personaAhora = this.personaAlLado();
  }

  get fase(): FaseDelRemolque {
    return this.faseAhora;
  }
  /** Lo que lleva en la fase de ahora, s. */
  get enLaFase(): number {
    return this.enFase;
  }
  /** Lo empujado, m. */
  get empujado(): number {
    return this.recorrido;
  }
  /** La velocidad del avión hacia atrás, m/s. */
  get velocidad(): number {
    return this.v;
  }
  /** Si el avión ya está donde acaba el empuje. */
  get acabado(): boolean {
    return this.faseAhora !== "enganchado" && this.faseAhora !== "empujando";
  }
  /** Si ya es de sus pilotos: tractor fuera y la persona ha saludado. */
  get libre(): boolean {
    return this.faseAhora === "libre";
  }
  /** Si el cable va enchufado al avión. */
  get conCable(): boolean {
    return this.faseAhora === "enganchado" || this.faseAhora === "empujando" || this.faseAhora === "frenado";
  }
  /** Si el tractor tiene la rueda de morro. */
  get enganchado(): boolean {
    return this.conCable || (this.faseAhora === "soltando" && this.enFase < SE_SUELTA / 2);
  }
  get medidasDelTractor(): MedidasDelTractor {
    return this.tractorMide;
  }

  /** **El avión ahora**: lo que manda en el puesto, empujando y al acabar. */
  get avion(): Pose {
    return poseDelEmpuje(this.empuje, this.recorrido);
  }
  get tractor(): Pose {
    return this.tractorAhora;
  }
  get persona(): Pose {
    return this.personaAhora;
  }
  /** Lo que hace la persona con los brazos. */
  get gesto(): GestoDeTierra {
    switch (this.faseAhora) {
      case "empujando":
      case "andando":
        return "anda";
      case "saludando":
        return this.enFase < ENSENA_EL_PASADOR ? "pasador" : "saludo";
      default:
        return "quieto";
    }
  }
  /** Dónde está la rueda de morro, que es donde se engancha el tractor y el cable. */
  get ruedaDeMorro(): PuntoXZ {
    const a = this.avion;
    const n = vector(a.rumbo);
    return { x: a.x + n.x * this.avionMide.batalla, z: a.z + n.z * this.avionMide.batalla };
  }

  /**
   * **Si al acabar de empujar se espera a los motores para soltarse.** La persona
   * de tierra sigue enchufada al avión mientras se arrancan —mira los motores desde
   * fuera, que es lo que ve si algo va mal— y no suelta el tractor hasta que la
   * cabina le dice que están en marcha. La tripulación los arranca empujando y
   * nunca llega a esperar; quien juega puede no haberlo hecho todavía, y entonces
   * el tractor se queda enganchado, con el freno puesto, hasta que los arranque.
   * Ver `Game.prepararElRemolque`.
   */
  esperaLosMotores = false;
  /** Y si ya están en marcha: lo pone quien lleva el avión en cada paso. */
  motoresEnMarcha = false;

  /** **Que empiece a empujar**: lo pide la cabina. Solo vale enganchado. */
  empezar(): void {
    if (this.faseAhora === "enganchado") this.pasarA("empujando");
  }

  /** Un paso de `dt` segundos. */
  paso(dt: number): void {
    this.enFase += dt;
    switch (this.faseAhora) {
      case "enganchado":
        break;
      case "empujando": {
        const queda = this.empuje.largo - this.recorrido;
        // Arranca y para suave: lo que frena hasta el final, v² = 2·a·d.
        const paraParar = Math.sqrt(2 * ACELERA_EMPUJANDO * Math.max(0, queda));
        // Y nunca del todo parado antes de llegar, que el último centímetro también se empuja.
        this.v = Math.max(queda > 0.02 ? 0.03 : 0, Math.min(VA_EMPUJANDO, paraParar, this.v + ACELERA_EMPUJANDO * dt));
        this.recorrido = Math.min(this.empuje.largo, this.recorrido + this.v * dt);
        if (this.recorrido >= this.empuje.largo - 0.01) {
          this.recorrido = this.empuje.largo;
          this.v = 0;
          this.pasarA("frenado");
        }
        break;
      }
      case "frenado":
        if (this.enFase >= SE_FRENA && (!this.esperaLosMotores || this.motoresEnMarcha)) this.pasarA("soltando");
        break;
      case "soltando":
        if (this.enFase >= SE_SUELTA) {
          this.caminoDelTractor = this.salidaDelTractor();
          this.delCaminoDelTractor = 0;
          this.pasarA("apartandose");
        }
        break;
      case "apartandose":
        if (this.avanzar("tractor", dt)) {
          this.caminoDeLaPersona = this.caminoASuSitio();
          this.delCaminoDeLaPersona = 0;
          this.pasarA("andando");
        }
        break;
      case "andando":
        if (this.avanzar("persona", dt)) this.pasarA("saludando");
        break;
      case "saludando":
        if (this.enFase >= ENSENA_EL_PASADOR + SALUDA) this.pasarA("libre");
        break;
      case "libre":
        break;
    }
    if (this.conCable || this.faseAhora === "soltando") {
      if (this.enganchado) this.tractorAhora = this.tractorEnganchado();
      this.rumboDelTractor = this.tractorAhora.rumbo;
      this.personaAhora = this.personaAlLado();
    }
  }

  private pasarA(f: FaseDelRemolque): void {
    this.faseAhora = f;
    this.enFase = 0;
  }

  /** **El tractor pegado a la rueda de morro**: la cuna en la rueda, el cuerpo por delante. */
  private tractorEnganchado(): Pose {
    const a = this.avion;
    const n = vector(a.rumbo);
    const r = this.ruedaDeMorro;
    const delante = this.tractorMide.largo / 2 - 1;
    return { x: r.x + n.x * delante, z: r.z + n.z * delante, rumbo: a.rumbo };
  }

  /**
   * **La persona, al lado de la rueda de morro**, a la izquierda del avión, que
   * es el lado de quien manda: la comandante la ve por su ventanilla. Un poco
   * fuera del tractor, para que el cable vaya sin tensar y nadie pise a nadie.
   * Mirando hacia donde se va, que es hacia la cola.
   */
  private personaAlLado(): Pose {
    const a = this.avion;
    const r = this.ruedaDeMorro;
    const izquierda = vector(a.rumbo - Math.PI / 2);
    const aparte = this.tractorMide.ancho / 2 + 2.5;
    const andando = this.faseAhora === "empujando";
    return {
      x: r.x + izquierda.x * aparte,
      z: r.z + izquierda.z * aparte,
      rumbo: andando ? normalizar(a.rumbo + Math.PI) : normalizar(a.rumbo - Math.PI / 2 + Math.PI),
    };
  }

  /**
   * **A qué altura del avión saluda**, m por delante de su centro: la de la
   * ventanilla de quien va mirando, si se sabe. Sin poner, a la altura de la
   * cabina de mando. Ver `sitioDelSaludo`.
   */
  saludaA: number | null = null;

  /**
   * **El sitio desde donde saluda**: a la izquierda del avión, fuera de lo que
   * barre el ala al echar a rodar —media envergadura y ocho metros—, mirando a
   * la cabina. A la altura de la ventanilla de quien va sentado de ese lado, si
   * se sabe, que es como lo ve el pasaje de verdad: la gente de tierra se aparta
   * hacia la punta del ala y saluda, y desde las ventanillas de delante del ala
   * se la ve. Si no, a la altura de la cabina de mando.
   */
  sitioDelSaludo(): Pose {
    const a = this.avion;
    const n = vector(a.rumbo);
    const izquierda = vector(a.rumbo - Math.PI / 2);
    const r = this.ruedaDeMorro;
    const lado = this.avionMide.envergadura / 2 + 8;
    const desde = this.saludaA === null ? { x: r.x + n.x * 4, z: r.z + n.z * 4 } : { x: a.x + n.x * this.saludaA, z: a.z + n.z * this.saludaA };
    const x = desde.x + izquierda.x * lado;
    const z = desde.z + izquierda.z * lado;
    // Mirando a la cabina, que está encima de la rueda de morro y un poco por delante.
    return { x, z, rumbo: rumboEntre({ x, z }, r) };
  }

  /**
   * **Por dónde se va el tractor**: recto hacia delante, saliendo de debajo del
   * morro, y luego hacia el lado del puesto, que es la plataforma y no la calle
   * por la que va a rodar el avión, hasta quedar fuera del ala con holgura.
   */
  private salidaDelTractor(): PuntoXZ[] {
    const a = this.avion;
    const n = vector(a.rumbo);
    const t = this.tractorAhora;
    const puesto = this.empuje.poses[0]!;
    const lado = cruz(n, { x: puesto.x - a.x, z: puesto.z - a.z }) >= 0 ? 1 : -1;
    const haciaElPuesto = vector(a.rumbo + (lado * Math.PI) / 2);
    const fuera = this.avionMide.envergadura / 2 + 18;
    const p1 = { x: t.x + n.x * 10, z: t.z + n.z * 10 };
    const p2 = { x: p1.x + haciaElPuesto.x * fuera, z: p1.z + haciaElPuesto.z * fuera };
    return [{ x: t.x, z: t.z }, p1, p2];
  }

  /** Por dónde va la persona a su sitio: derecha, que el tractor ya se fue. */
  private caminoASuSitio(): PuntoXZ[] {
    const s = this.sitioDelSaludo();
    return [{ x: this.personaAhora.x, z: this.personaAhora.z }, { x: s.x, z: s.z }];
  }

  /** Avanza al tractor o a la persona por su camino. Devuelve si ya llegó. */
  private avanzar(quien: "tractor" | "persona", dt: number): boolean {
    const camino = quien === "tractor" ? this.caminoDelTractor : this.caminoDeLaPersona;
    const v = quien === "tractor" ? RUEDA_SUELTO : ANDA;
    const hecho = (quien === "tractor" ? this.delCaminoDelTractor : this.delCaminoDeLaPersona) + v * dt;
    let total = 0;
    for (let i = 1; i < camino.length; i++) total += Math.hypot(camino[i]!.x - camino[i - 1]!.x, camino[i]!.z - camino[i - 1]!.z);
    const s = Math.min(total, hecho);
    let falta = s;
    let p = camino[0]!;
    let va = quien === "tractor" ? this.rumboDelTractor : this.personaAhora.rumbo;
    for (let i = 1; i < camino.length; i++) {
      const a = camino[i - 1]!;
      const b = camino[i]!;
      const l = Math.hypot(b.x - a.x, b.z - a.z);
      if (l < 1e-6) continue;
      va = rumboEntre(a, b);
      if (falta <= l) {
        p = { x: a.x + ((b.x - a.x) * falta) / l, z: a.z + ((b.z - a.z) * falta) / l };
        break;
      }
      falta -= l;
      p = b;
    }
    if (quien === "tractor") {
      this.delCaminoDelTractor = s;
      // El tractor gira como gira un vehículo, poco a poco: no de golpe en la esquina.
      this.rumboDelTractor = normalizar(this.rumboDelTractor + acotar(diferencia(this.rumboDelTractor, va), 35 * GRADO * dt));
      this.tractorAhora = { x: p.x, z: p.z, rumbo: this.rumboDelTractor };
    } else {
      this.delCaminoDeLaPersona = s;
      const llega = s >= total - 1e-6;
      this.personaAhora = { x: p.x, z: p.z, rumbo: llega ? this.sitioDelSaludo().rumbo : va };
    }
    return s >= total - 1e-6;
  }
}

// ── Lo que queda ─────────────────────────────────────────────────────────

/** El rumbo de `a` a `b`, rad, cero al norte. */
export function rumboEntre(a: PuntoXZ, b: PuntoXZ): number {
  return Math.atan2(b.x - a.x, -(b.z - a.z));
}

/** El vector unitario de un rumbo, en `x` al este y `z` al sur. */
export function vector(rumbo: number): PuntoXZ {
  return { x: Math.sin(rumbo), z: -Math.cos(rumbo) };
}

/** Lo que hay que girar de `desde` a `hasta`, rad, entre −π y π. */
export function diferencia(desde: number, hasta: number): number {
  let d = (hasta - desde) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function normalizar(r: number): number {
  const d = r % (2 * Math.PI);
  return d < 0 ? d + 2 * Math.PI : d;
}

/** Positivo si `b` queda a la derecha de `a`. */
function cruz(a: PuntoXZ, b: PuntoXZ): number {
  // Con `x` al este y `z` al sur, la derecha del rumbo (dx, dz) es (−dz, dx).
  return b.x * -a.z + b.z * a.x;
}

function acotar(v: number, tope: number): number {
  return Math.max(-tope, Math.min(tope, v));
}
