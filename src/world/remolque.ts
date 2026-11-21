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
import type { MorroDelAvion } from "./rueda-de-morro";

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
 * **Lo que puede quedar de la puerta a la pared en un puesto de contacto**, m: lo
 * que alcanza una pasarela telescópica desde su rótula, más lo que hay entre la
 * rótula y la fachada, que en los aeropuertos grandes es un pasillo fijo. Los
 * túneles de verdad estiran de veinte a cuarenta y pico metros, y el pasillo
 * puede llevar otros tantos. Más allá, el puesto es de plataforma: se sale de
 * frente, o en autobús.
 *
 * **Setenta y nueve, contados desde la puerta.** Eran cincuenta desde el morro con el
 * centro del avión en el punto del puesto. Desde que el punto es donde para la
 * rueda de morro (#191), lo que cuenta es la puerta, y en OpenStreetMap los
 * puestos de pasarela quedan lejos de la fachada dibujada: en La Palma, que
 * tiene dos pasarelas, los siete puestos más cercanos a la terminal tienen la
 * rueda de morro entre 51 y 58 m de ella; en Los Rodeos el 23, a 57; y el T5 de
 * la T1 de Barajas, del que sale el primer capítulo, a 78, con la puerta del
 * JAZ 110 a 78,7. Con cincuenta, La Palma se quedaba sin ninguno. Y no ochenta: con
 * ochenta, el JAZ 120 entra en Barajas en un puesto cuyo empuje acaba a sesenta y nueve
 * metros de la raya (`remolque-en-cada-campo.test.ts`), y eso está sin mirar.
 */
export const ALCANCE_DE_LA_PASARELA = 79;

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
 * **Si un puesto es de contacto para este avión**: pegado a un edificio, con la
 * puerta de delante a menos de lo que alcanza una pasarela y el morro sin
 * meterse en él. El punto del puesto es donde para la rueda de morro (#191), y
 * el avión mira a la pared: la puerta y la punta del morro quedan a lo que les
 * saca su `MorroDelAvion` por delante de ese punto. Contaba medio largo desde el
 * centro del avión, que era lo que se ponía en el punto, y la pasarela no llega
 * al morro: llega a la puerta.
 */
export function esPuestoDeContacto(
  x: number,
  z: number,
  edificios: Edificios,
  morro: Pick<MorroDelAvion, "puerta" | "punta">,
): boolean {
  const pared = paredMasCercana(x, z, edificios);
  if (!pared) return false;
  return (
    pared.distancia - morro.punta >= HOLGURA_DEL_MORRO && pared.distancia - morro.puerta <= ALCANCE_DE_LA_PASARELA
  );
}

/**
 * **Cómo mira a la terminal un avión parado en un puesto**, para el banco (H51): desde
 * su rueda de morro y contra los edificios de pasarela, que es donde y contra lo que
 * deciden `esPuestoDeContacto` y `rumboEnElPuesto`. Lo que queda de la punta del morro a
 * la pared, m; lo que se aparta el morro de mirarla de frente, rad; y si es de contacto.
 *
 * Existe porque el banco lo medía con otra regla —desde el centro del avión, contra
 * cualquier edificio y con cincuenta metros de tope— y las dos reglas solo coincidían
 * en algunos puestos. En el 24 de Los Rodeos, el de la 12, el edificio más cercano al
 * centro es el tejado alargado que sale del extremo oeste de la terminal, a un lado del
 * avión, y la terminal queda a 62 m: el banco veía 67° de desvío donde el juego, con su
 * regla, pone el morro a 22° de la pared, en la raya del puesto.
 */
export function comoMiraALaTerminal(
  rueda: PuntoXZ,
  rumbo: number,
  edificios: Edificios,
  morro: Pick<MorroDelAvion, "puerta" | "punta">,
): { readonly delMorro: number; readonly desviado: number; readonly deContacto: boolean } | null {
  const pared = paredMasCercana(rueda.x, rueda.z, edificios);
  if (!pared) return null;
  return {
    delMorro: pared.distancia - morro.punta,
    desviado: diferencia(rumbo, pared.rumbo),
    deContacto: esPuestoDeContacto(rueda.x, rueda.z, edificios, morro),
  };
}

/**
 * **Los edificios junto a los que puede haber un puesto de contacto**: los del
 * campo si embarca por pasarela, y ninguno si no. La regla de los cincuenta
 * metros sola daba por puestos de pasarela los de cualquier campo con un
 * edificio cerca de la plataforma —La Gomera, Ayolas, Cuatro Vientos—, y allí un
 * reactor salía empujado de una pasarela que no hay. Ver `Aerodrome.pasarelas`.
 *
 * **Y de esos, solo la terminal**, que es de donde salen las pasarelas. Con
 * todos los edificios, un hangar contaba como fachada de embarque: en la punta
 * oeste de Tenerife Sur, la de aviación general, el JAZ 90 salía empujado por un
 * tractor de un puesto de avioneta porque tenía una nave a menos de sesenta
 * metros. Los nueve campos con pasarelas traen su terminal de OpenStreetMap
 * (`aeroway=terminal`, que el extractor guarda como `kind: "terminal"`).
 */
export function edificiosDePasarela(
  aero: Pick<Aerodrome, "pasarelas" | "buildings"> | null | undefined,
): Edificios {
  return aero?.pasarelas?.hay === true ? (aero.buildings ?? []).filter((e) => e.kind === "terminal") : [];
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
  morro: Pick<MorroDelAvion, "puerta" | "punta">,
): boolean {
  return deLinea && esPuestoDeContacto(x, z, edificios, morro);
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
  /**
   * **La línea de entrada pintada**, si el puesto la tiene (H60b): de fuera hacia la
   * parada, acabando en el puesto. Manda sobre la raya del plan, que va hacia donde va
   * la calle y no hacia donde está pintado el puesto. Ver `entradaDelPuesto`.
   */
  entrada?: readonly PuntoXZ[] | null,
): number | null {
  const alEdificio = rumboAlEdificio(x, z, edificios);
  if (alEdificio === null) return null;
  const pintada = entrada ? rumboDeLaEntrada(x, z, entrada) : null;
  if (pintada !== null && Math.abs(diferencia(alEdificio, pintada)) < SALE_DE_LADO) return pintada;
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

/**
 * **La línea de entrada pintada del puesto que hay en `x`, `z`**, en los ejes del mundo y
 * de fuera hacia la parada, o `null` si no la tiene (H60, H60b). El puesto, el de la
 * ficha más cercano a menos de cinco metros, que es lo que se le deja a quien juega para
 * pararse en él (`prepararElRemolque` en `game.ts`).
 */
export function entradaDelPuesto(
  aero: Pick<Aerodrome, "parkingPositions"> | null | undefined,
  x: number,
  z: number,
): readonly PuntoXZ[] | null {
  let mejor: { readonly entrada?: readonly Punto[] } | null = null;
  let cerca = 5;
  for (const p of aero?.parkingPositions ?? []) {
    const d = Math.hypot(p.xy[0] - x, -p.xy[1] - z);
    if (d < cerca) {
      cerca = d;
      mejor = p;
    }
  }
  const e = mejor?.entrada;
  return e && e.length >= 2 ? e.map(([a, b]) => ({ x: a, z: -b })) : null;
}

/**
 * **Hacia dónde va la raya pintada al llegar a la parada**: el rumbo de sus últimos quince
 * metros, como la lee el señalero y como la sigue quien entra. Una curva de entrada que
 * viene de la calle no cuenta: lo que manda es el tramo que acaba en el puesto.
 */
function rumboDeLaEntrada(x: number, z: number, entrada: readonly PuntoXZ[]): number | null {
  let lejos: PuntoXZ | null = null;
  for (let i = entrada.length - 2; i >= 0; i--) {
    lejos = entrada[i]!;
    if (Math.hypot(lejos.x - x, lejos.z - z) > 15) break;
  }
  if (!lejos || Math.hypot(lejos.x - x, lejos.z - z) < 3) return null;
  return normalizar(rumboEntre(lejos, { x, z }));
}

/**
 * **Lo que sigue el tractor desde un puesto en el que el avión está sobre su raya pintada**
 * (H60b): de espaldas por la prolongación de la línea de entrada —la de retroceso, que es
 * la misma recta— hasta donde se encuentra con la raya del plan, y desde ahí la raya. Es el
 * primer punto de la raya, pasados cinco metros del puesto, que cae en el eje del avión
 * por detrás de él, a menos de `SIGUE_LA_RAYA`. `null` si la prolongación no la encuentra:
 * la línea de entrada lleva a una calle por la que el plan no va.
 *
 * Devuelve la raya entera desde el puesto, el punto del eje donde la encuentra y el primer
 * punto de la raya a tres metros o más de él, que dice hacia dónde sigue.
 */
function rayaDeRetroceso(
  puesto: PuntoXZ,
  rumbo: number,
  raya: readonly PuntoXZ[],
): { readonly raya: PuntoXZ[]; readonly enElEje: PuntoXZ; readonly sigue: PuntoXZ } | null {
  const atras = vector(rumbo + Math.PI);
  const t = (q: PuntoXZ) => (q.x - puesto.x) * atras.x + (q.z - puesto.z) * atras.z;
  const lado = (q: PuntoXZ) => cruz(atras, { x: q.x - puesto.x, z: q.z - puesto.z });
  let andado = 0;
  for (let i = 1; i < raya.length; i++) {
    const a = raya[i - 1]!;
    const b = raya[i]!;
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(l));
    for (let k = 1; k <= n; k++) {
      const s = andado + (l * k) / n;
      if (s < 5) continue;
      const p = { x: a.x + ((b.x - a.x) * (k - 1)) / n, z: a.z + ((b.z - a.z) * (k - 1)) / n };
      const q = { x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n };
      const lp = lado(p);
      const lq = lado(q);
      if (Math.abs(lq) > 0.5 && Math.sign(lp) === Math.sign(lq)) continue;
      // Donde cruza el eje: entre `p` y `q`, por la parte que le toca a cada uno.
      const f = Math.abs(lp - lq) > 1e-9 ? Math.max(0, Math.min(1, lp / (lp - lq))) : 1;
      const x = { x: p.x + (q.x - p.x) * f, z: p.z + (q.z - p.z) * f };
      const hasta = t(x);
      if (hasta <= 0) continue;
      if (hasta > SIGUE_LA_RAYA) return null;
      let enElEje: PuntoXZ = { x: puesto.x + atras.x * hasta, z: puesto.z + atras.z * hasta };
      // Si cae junto a un punto de la raya, a menos de tres metros, ese punto: es donde la raya sigue.
      for (const r of [a, b]) if (Math.hypot(r.x - enElEje.x, r.z - enElEje.z) < 3) enElEje = r;
      const eje = enElEje;
      const despues = raya.slice(i).filter((r) => r !== eje && Math.hypot(r.x - eje.x, r.z - eje.z) > 0.5);
      const sigue = despues.find((r) => Math.hypot(r.x - eje.x, r.z - eje.z) >= 3);
      if (!sigue) return null;
      return { raya: [{ ...puesto }, enElEje, ...despues], enElEje, sigue };
    }
    andado += l;
  }
  return null;
}

/** Lo que puede torcer la raya donde la encuentra la prolongación de la pintada y seguirse como un quiebro. */
const ESQUINA_QUE_SE_SIGUE = 10 * GRADO;

/**
 * **Si el avión va de culo en todo el empuje, y girando lo que puede**: cada medio metro, lo
 * que se mueve va a menos de veinticinco grados de lo contrario al morro, que es lo que exige
 * el banco (`ver-remolque-de-quien-juega.mjs`), y el morro no gira más de lo que da la rueda
 * a `DIRECCION_MAXIMA`. Un avión empujado no derrapa ni pivota: si una trayectoria lo hace,
 * está mal hecha, y con la pintada se vuelve a lo de antes.
 */
function vaDeCulo(e: Empuje, batalla: number): boolean {
  const radio = batalla / Math.tan(DIRECCION_MAXIMA);
  for (let i = 1; i < e.poses.length; i++) {
    const a = e.poses[i - 1]!;
    const b = e.poses[i]!;
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    if (d < 0.01) continue;
    const n = vector(a.rumbo);
    if (((b.x - a.x) * n.x + (b.z - a.z) * n.z) / d > -0.9) return false;
    if (Math.abs(diferencia(a.rumbo, b.rumbo)) > d / radio + 0.5 * GRADO) return false;
  }
  return true;
}

/**
 * **Si el morro acaba hacia donde sigue la raya desde la calle**: la raya de los treinta
 * metros que siguen al cruce, a menos de cinco grados del morro, y el cruce por delante. Es
 * lo que mide `empuje-hasta-la-calle.test.ts` (H47): con la calle en una esquina, el cruce
 * puede quedar en ella y la raya torcer enseguida, y entonces el avión no sale mirando por
 * donde va a rodar.
 */
function miraALaCalle(e: Empuje, raya: readonly PuntoXZ[]): boolean {
  const fin = e.poses.at(-1)!;
  const n = vector(fin.rumbo);
  if ((e.cruce.x - fin.x) * n.x + (e.cruce.z - fin.z) * n.z <= 0) return false;
  let mejor = Infinity;
  let s = 0;
  let andado = 0;
  for (let k = 1; k < raya.length; k++) {
    const a = raya[k - 1]!;
    const b = raya[k]!;
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (l > 1e-9) {
      const t = Math.max(0, Math.min(1, ((e.cruce.x - a.x) * (b.x - a.x) + (e.cruce.z - a.z) * (b.z - a.z)) / (l * l)));
      const d = Math.hypot(a.x + (b.x - a.x) * t - e.cruce.x, a.z + (b.z - a.z) * t - e.cruce.z);
      if (d < mejor) {
        mejor = d;
        s = andado + t * l;
      }
    }
    andado += l;
  }
  const aLos = (m: number): PuntoXZ => {
    let quedan = Math.max(0, Math.min(andado, m));
    for (let k = 1; k < raya.length; k++) {
      const a = raya[k - 1]!;
      const b = raya[k]!;
      const l = Math.hypot(b.x - a.x, b.z - a.z);
      if (quedan <= l || k === raya.length - 1) {
        const t = l > 1e-9 ? Math.min(1, quedan / l) : 0;
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      }
      quedan -= l;
    }
    return raya.at(-1)!;
  };
  return Math.abs(diferencia(fin.rumbo, rumboEntre(aLos(s), aLos(s + MIRA_LA_CALLE)))) < 5 * GRADO;
}

/**
 * **Si el empuje deja el avión sobre la raya y mirando por ella**: de la raya por delante
 * del morro, hasta ciento cincuenta metros, algún sitio en su eje —a menos de tres metros—
 * desde el que la raya va a menos de cinco grados del morro en sus quince metros
 * siguientes. Es lo que se le pide al tractor: que la tripulación arranque recto (H47b), y
 * con lo que se elige si el avión se aparca sobre su raya pintada (`empujeDesdeElPuesto`).
 */
export function quedaSobreLaRaya(fin: Pose, raya: readonly PuntoXZ[]): boolean {
  const n = vector(fin.rumbo);
  const acum: number[] = [0];
  for (let i = 1; i < raya.length; i++) acum.push(acum[i - 1]! + Math.hypot(raya[i]!.x - raya[i - 1]!.x, raya[i]!.z - raya[i - 1]!.z));
  const total = acum.at(-1)!;
  const aLos = (s: number): PuntoXZ => {
    const d = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < raya.length - 1 && acum[i]! < d) i++;
    const a = raya[i - 1]!;
    const b = raya[i]!;
    const k = (d - acum[i - 1]!) / (acum[i]! - acum[i - 1]! || 1);
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
  };
  for (let s = 0; s <= Math.min(total, 600); s += 1) {
    const q = aLos(s);
    const delante = (q.x - fin.x) * n.x + (q.z - fin.z) * n.z;
    if (delante < 0 || delante > 150) continue;
    if (Math.abs((q.x - fin.x) * -n.z + (q.z - fin.z) * n.x) >= 3) continue;
    if (Math.abs(diferencia(fin.rumbo, rumboEntre(q, aLos(s + 15)))) < 5 * GRADO) return true;
  }
  return false;
}

/**
 * **Cómo queda el avión en el puesto y por dónde lo saca el tractor** (H60b): sobre su raya
 * pintada, si el puesto la tiene, y de espaldas por ella hasta la raya del plan; y si no,
 * como antes, con el morro al edificio y la cola por la raya del plan.
 *
 * En un aeropuerto de verdad el avión aparca sobre su línea de entrada, y el tractor lo
 * empuja de espaldas por esa misma recta —la línea de retroceso, que es su prolongación—
 * hasta la calle, donde lo gira para que salga mirando por ella. La raya del plan sale del
 * puesto por el grafo, y no por la línea de entrada: con el avión en la pintada y el empuje
 * siguiendo la del plan, el avión acababa atravesado (H60). Así que el tractor va por la
 * recta de la pintada hasta donde se encuentra con la del plan (`rayaDeRetroceso`), y desde
 * ahí la sigue con el giro de siempre (`trayectoriaDelEmpuje`).
 *
 * **Y la pintada se queda solo si así el avión acaba en la calle** (`quedaSobreLaRaya`).
 * Hay líneas de entrada que llegan de una calle por la que el plan no va —la del 13 de Los
 * Rodeos, del que se sale por la 30, llega del sur-suroeste y deja el avión a 18°, y la raya
 * del plan sale recta hacia el sur, veinte grados más allá, sin volver a juntarse con ella—,
 * y con ellas el tractor no tiene por dónde llegar a la raya del plan. Ahí el avión se pone
 * como antes. Y también si el empuje lo pone de lado en algún momento (`vaDeCulo`). Lo
 * correcto de verdad sería que la raya del plan saliera por la línea de entrada; eso es del
 * rodaje, y no está hecho.
 *
 * **El tráfico, siempre sobre la pintada** (`siempreLaPintada`): entra por ella
 * (`alPuestoPorSuRaya` en `suelo-del-trafico.ts`) sin saber todavía por dónde saldrá, y de
 * donde aparcó sale. Su empuje es el corto, que no acaba en la calle sino a medio largo de
 * avión, y lo demás lo rueda (`empujado`); si la prolongación de la pintada no encuentra su
 * raya, el tractor sigue la del camino desde el avión sobre la pintada.
 *
 * `centroCon` da el centro del avión con la rueda de morro en el puesto y ese rumbo.
 */
export function empujeDesdeElPuesto(
  puesto: PuntoXZ,
  edificios: Edificios,
  raya: readonly PuntoXZ[],
  entrada: readonly PuntoXZ[] | null | undefined,
  batalla: number,
  centroCon: (rumbo: number) => PuntoXZ,
  {
    porLaPlataforma = true,
    siempreLaPintada = false,
  }: { readonly porLaPlataforma?: boolean; readonly siempreLaPintada?: boolean } = {},
): {
  readonly rumbo: number;
  readonly centro: PuntoXZ;
  readonly empuje: Empuje | null;
  /** Si el avión está sobre su raya pintada. */
  readonly porLaPintada: boolean;
  /** El rumbo que tendría sin ella, con el morro al edificio y la cola por la raya del plan. */
  readonly porLaRuta: number;
  /** El de la raya pintada, si la tiene y mira al edificio, se use o no. */
  readonly pintada: number | null;
  /**
   * Si la tiene y no se usa, por qué: su prolongación no encuentra la raya del plan, o la
   * encuentra y el empuje no acaba sobre ella. Para el barrido.
   */
  readonly porQueNo: "no-la-encuentra" | "no-acaba-en-ella" | null;
} | null {
  const porLaRuta = rumboEnElPuesto(puesto.x, puesto.z, edificios, raya);
  if (porLaRuta === null) return null;
  const opciones = { porLaPlataforma };
  const alEdificio = rumboAlEdificio(puesto.x, puesto.z, edificios);
  const deLaEntrada = entrada ? rumboDeLaEntrada(puesto.x, puesto.z, entrada) : null;
  const pintada =
    deLaEntrada !== null && alEdificio !== null && Math.abs(diferencia(alEdificio, deLaEntrada)) < SALE_DE_LADO ? deLaEntrada : null;
  let porQueNo: "no-la-encuentra" | "no-acaba-en-ella" | null = null;
  if (pintada !== null) {
    const retroceso = rayaDeRetroceso(puesto, pintada, raya);
    const centro = centroCon(pintada);
    const desde = { ...centro, rumbo: pintada };
    let empuje: Empuje | null = null;
    if (!retroceso || !porLaPlataforma) empuje = trayectoriaDelEmpuje(desde, retroceso?.raya ?? raya, batalla, opciones);
    else {
      /*
       * **Donde la prolongación encuentra la raya con esquina, la calle empieza ahí.** Hasta
       * ahí el tractor va recto por la pintada, y la esquina no es un quiebro que se pueda
       * doblar: con la raya entera, `trayectoriaDelEmpuje` la seguía con sus quiebros
       * (`siguiendoLaRaya`) y empezaba a girar antes de la esquina, cortándola. En el 24 de
       * Los Rodeos la prolongación llega a la Z a 40° de ella, a 124 m, y la Z tuerce al oeste
       * veinticinco metros más allá: el morro saltaba dieciocho grados en medio metro, con el
       * avión de lado (el banco lo vio: −0,86 contra el morro). Así que la calle es la raya
       * desde la esquina, seguida mientras tuerce hacia el mismo lado —la curva entera, como
       * en la H47b— y hasta `MIRA_LA_CALLE`, y el tractor gira el avión a ella como en
       * cualquier puesto. Lo que sigue casi recto, a menos de `ESQUINA_QUE_SE_SIGUE`, se sigue
       * como la raya de siempre.
       */
      const tras = retroceso.raya.slice(1);
      let calle = rumboEntre(retroceso.enElEje, retroceso.sigue);
      let cruce = retroceso.enElEje;
      const esquina = diferencia(pintada + Math.PI, calle);
      if (Math.abs(esquina) <= ESQUINA_QUE_SE_SIGUE) empuje = trayectoriaDelEmpuje(desde, retroceso.raya, batalla, opciones);
      else {
        const lado = Math.sign(esquina);
        for (let k = tras.indexOf(retroceso.sigue); k >= 0 && k < tras.length - 1; k++) {
          const p = tras[k]!;
          if (Math.hypot(p.x - retroceso.enElEje.x, p.z - retroceso.enElEje.z) > MIRA_LA_CALLE) break;
          const va = rumboEntre(p, tras[k + 1]!);
          if (lado * diferencia(calle, va) <= GRADO) break;
          calle = va;
          cruce = p;
        }
        empuje = rectaArcoRecta(desde, cruce, calle, batalla);
      }
    }
    if (
      siempreLaPintada ||
      (retroceso && empuje && vaDeCulo(empuje, batalla) && quedaSobreLaRaya(empuje.poses.at(-1)!, raya) && miraALaCalle(empuje, raya))
    )
      return { rumbo: pintada, centro, empuje, porLaPintada: true, porLaRuta, pintada, porQueNo };
    porQueNo = retroceso ? "no-acaba-en-ella" : "no-la-encuentra";
  }
  const centro = centroCon(porLaRuta);
  return {
    rumbo: porLaRuta,
    centro,
    empuje: trayectoriaDelEmpuje({ ...centro, rumbo: porLaRuta }, raya, batalla, opciones),
    porLaPintada: false,
    porLaRuta,
    pintada,
    porQueNo,
  };
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
export const LA_CALLE_TUERCE = 40 * GRADO;
/**
 * **Cuándo sale la raya del puesto de lado**, y no hacia atrás: los mismos cincuenta
 * grados que en `rumboEnElPuesto`, que con menos pone el avión en el eje de la raya.
 */
const SALE_DE_LADO = 50 * GRADO;
/** Cuántos metros de raya se miran para saber hacia dónde va la calle. */
export const MIRA_LA_CALLE = 30;
/**
 * **Hasta dónde se busca la calle**, en largos del avión y nunca menos de cuarenta
 * metros: la calle de servicio de detrás de un puesto de contacto está a un largo
 * de avión y poco más. Una raya que sigue recta más allá no es la calle del
 * puesto: es una calle que sale de frente. Ver `trayectoriaDelEmpuje`.
 */
const BUSCA_LA_CALLE = 1.3;
/**
 * **Salvo si la raya sale de espaldas por la plataforma**, recta: entonces la calle
 * está donde acaba esa recta, aunque quede más lejos, y como mucho a estos metros.
 *
 * La calle de servicio de detrás de un puesto no siempre está en OpenStreetMap, y
 * sin ella la raya va del puesto a la primera calle que haya, en línea recta por la
 * plataforma. En Los Rodeos, desde el 23 —en la esquina oeste de la terminal, desde
 * que los puestos están donde para la rueda de morro (#191)—, son noventa y seis
 * metros hasta la Z, y la Z es por donde se rueda. Medida en largos del JAZ 90, la Z
 * no era la calle: el empuje giraba noventa grados a los veintinueve metros, dejaba
 * el avión atravesado a la raya y al soltarlo giraba 78° en sus primeros treinta
 * metros. El tractor lleva el avión hasta la calle, que es lo que hace de verdad:
 * ciento veinte metros son dos minutos a paso de persona, un empuje largo de los que
 * se ven en las plataformas grandes. Más allá, una raya recta es una calle que sale
 * de frente. Ver `trayectoriaDelEmpuje`.
 *
 * **Y la calle es la curva entera con la que acaba la recta** (H47), no el metro de
 * después: la raya no tuerce en una esquina, sino en una curva de varios puntos, y
 * la primera vez que lo que viene por delante se aparta los cuarenta grados de
 * `LA_CALLE_TUERCE` cae unos metros dentro de ella. Con el metro de más, la calle se
 * quedaba fuera en cuanto el primer tramo de la curva torcía poco: desde el 24 de Los
 * Rodeos —que el plan elige desde que el grafo no suelda los cruces (H41c)—, la recta
 * acaba a los 90 m con un tramo de 6°, los cuarenta se ven a los 94, y el empuje se
 * hacía de frente: noventa grados a los 34 m y el avión atravesado a la raya, girando
 * 78° en sus primeros treinta metros. Por eso se mira hasta `MIRA_LA_CALLE` más allá
 * del final de la recta, que es lo que se mira para saber hacia dónde va la calle.
 */
export const RECTA_DE_LA_PLATAFORMA = 120;
/**
 * **Y si la raya sale de espaldas y tuerce más lejos**, el tractor la sigue hasta su
 * calle, con sus quiebros, como mucho estos metros (H47b). Es lo que se hace de verdad:
 * el empuje sigue la línea pintada hasta la calle y deja el avión en ella, con el morro
 * hacia donde va a rodar; girarlo noventa grados a medio camino lo dejaba atravesado a
 * la raya, y lo demás lo tenía que rodar la tripulación girando en el sitio. Con el tope
 * de `RECTA_DE_LA_PLATAFORMA` salían así, de los puestos que elige el plan, Los Rodeos
 * por la 30 desde el 13 (la recta, 132 m), Tenerife Sur desde el H43 y el J8 (124 y
 * 156) y, con un quiebro que sigue lejos, Pettirossi desde el 6 (la calle, a 234 m),
 * La Palma desde el 7 (114) y Lanzarote desde el T2 (276). Trescientos metros son cinco
 * minutos a paso de persona; más allá, la raya es una calle que sale de frente.
 */
export const SIGUE_LA_RAYA = 300;
/** Lo que puede torcer cada tramo de la raya y seguir siendo esa recta. */
const SIGUE_RECTA = 5 * GRADO;
/**
 * **Lo más que gira un empuje**: ciento cincuenta grados. Más es media vuelta, que no
 * se empuja: se gira noventa y lo demás lo rueda el avión. Hasta ahí, sí: un puesto
 * en esquina o en espiga sale a su calle con más de un cuarto de vuelta. Con el tope
 * en ciento veinte, el avión se quedaba a medio girar y torcido respecto a la calle:
 * 54° en Gran Canaria con los dos grandes y 45° en Barajas con el JAZ 90; y el 23 de
 * Los Rodeos, que pide 140°, no llegaba a la Z. Medido en `remolque-en-cada-campo.test.ts`.
 */
const MEDIA_VUELTA = 150 * GRADO;
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
 *   puesto, seguido hasta donde acaba de torcer. El morro acaba mirando hacia
 *   donde va desde ahí. Se busca a un largo de avión y poco más, o, si la raya
 *   sale de espaldas por la plataforma, hasta donde acaba esa recta: ver
 *   `RECTA_DE_LA_PLATAFORMA`.
 * - **Y si sale de espaldas y tuerce más lejos**, con quiebros o sin ellos, el
 *   tractor la sigue hasta un largo de avión antes de la curva y gira desde ahí:
 *   ver `SIGUE_LA_RAYA` y `siguiendoLaRaya`.
 * - **El giro**, el del tren principal con la rueda de morro a cuarenta y cinco
 *   grados: un radio igual a la batalla. Si la calle está demasiado cerca para
 *   ese giro, se cierra hasta los setenta; y si ni así cabe, se empieza a girar
 *   desde el puesto.
 * - **Y si la raya da media vuelta** —una calle que sigue de frente, por donde
 *   se vino—, el empuje gira noventa grados y lo demás lo rueda el avión. Ver
 *   `MEDIA_VUELTA`.
 * - **Y si sale del puesto de lado**, a lo largo de la fachada y sin torcer
 *   cerca, el morro acaba mirando hacia donde va la raya.
 *
 * `desde` es el avión en el puesto, mirando al edificio; `raya`, la del plan,
 * que empieza en el puesto. `null` si no hay raya que seguir. Con
 * `porLaPlataforma` en falso, la calle se busca solo a un largo de avión y poco
 * más, como antes de `RECTA_DE_LA_PLATAFORMA`: es lo que usa el tráfico, ver
 * `empujado` en `suelo-del-trafico.ts`.
 */
export function trayectoriaDelEmpuje(
  desde: Pose,
  raya: readonly PuntoXZ[],
  batalla: number,
  { porLaPlataforma = true }: { readonly porLaPlataforma?: boolean } = {},
): Empuje | null {
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
  /*
   * Lo que la raya sigue recta desde el puesto, si sale de espaldas: la calle puede
   * estar al final de esa recta. Ver `RECTA_DE_LA_PLATAFORMA`.
   */
  let recta = 0;
  const deEspaldas = Math.abs(diferencia(desde.rumbo + Math.PI, salida)) <= SALE_DE_LADO;
  if (porLaPlataforma && deEspaldas)
    for (let i = 1; i < raya.length && Math.abs(diferencia(salida, rumboEntre(raya[i - 1]!, raya[i]!))) <= SIGUE_RECTA; i++)
      recta = acum[i]!;
  /*
   * Hasta el final de la curva que cierra la recta, si la recta cabe en la plataforma; si
   * no, el metro de más del punto donde acaba, como antes. Ver `RECTA_DE_LA_PLATAFORMA`.
   */
  const cierraLaRecta = recta > 0 && recta <= RECTA_DE_LA_PLATAFORMA ? MIRA_LA_CALLE : 1;
  const alcance = Math.max(40, BUSCA_LA_CALLE * largoDelAvion, Math.min(recta, RECTA_DE_LA_PLATAFORMA) + cierraLaRecta);
  let cruce: PuntoXZ | null = null;
  let calle = salida;
  /** El primer sitio donde tuerce la raya, a cualquier distancia, y hacia dónde va desde ahí. */
  let tuerce: { readonly s: number; readonly k: number; readonly va: number } | null = null;
  for (let k = 1; k < raya.length && !tuerce; k++) {
    if (acum[k]! < 8) continue;
    const va = rumboEntre(enLaRaya(acum[k]!), enLaRaya(acum[k]! + MIRA_LA_CALLE));
    if (Math.abs(diferencia(salida, va)) > LA_CALLE_TUERCE) tuerce = { s: acum[k]!, k, va };
  }
  /*
   * **La calle es la raya cuando ha acabado de torcer** (H47b), y no la cuerda de los
   * treinta metros desde donde empieza la curva: dentro de una curva de varios puntos esa
   * cuerda va a medio torcer. En La Palma, desde el 10 por la 18, la raya tuerce 90° en una
   * curva de veintinueve metros y la cuerda iba a 45°: el JAZ 110 giraba 134° hacia una
   * calle que no existe, con el cruce en el principio de la curva, y no le cabía el giro.
   * Acababa a 7 m de la raya. Se sigue la curva hasta `MIRA_LA_CALLE` más allá y la calle
   * es el primer punto desde el que la raya ya no se aparta más. El tráfico, que se empuja
   * corto (`porLaPlataforma` en falso), sigue con la cuerda, y la raya que sale del puesto
   * de lado también: su curva no es la de una calle por detrás.
   */
  const acabaDeTorcer = (t: { readonly s: number; readonly k: number; readonly va: number }) => {
    if (!porLaPlataforma || !deEspaldas) return t;
    const lado = Math.sign(diferencia(salida, t.va)) || 1;
    let mejor = t;
    for (let k = t.k + 1; k < raya.length && acum[k]! <= t.s + MIRA_LA_CALLE; k++) {
      const va = rumboEntre(enLaRaya(acum[k]!), enLaRaya(acum[k]! + MIRA_LA_CALLE));
      if (lado * diferencia(salida, va) > lado * diferencia(salida, mejor.va) + GRADO) mejor = { s: acum[k]!, k, va };
    }
    return mejor;
  };
  if (tuerce && tuerce.s <= alcance) {
    const fin = acabaDeTorcer(tuerce);
    cruce = raya[fin.k]!;
    calle = fin.va;
  } else if (
    porLaPlataforma &&
    tuerce &&
    tuerce.s <= SIGUE_LA_RAYA &&
    recta > 0 &&
    Math.abs(diferencia(desde.rumbo + Math.PI, salida)) <= SIGUE_RECTA
  ) {
    /*
     * **La raya sale de espaldas y tuerce lejos**: el tractor la sigue hasta la calle, con
     * sus quiebros, y allí gira. Ver `SIGUE_LA_RAYA`.
     */
    const fin = acabaDeTorcer(tuerce);
    const tramo = (i: number): number => rumboEntre(raya[i]!, raya[i + 1]!);
    /*
     * Donde empieza la curva de la calle: hacia atrás desde el primer punto que ya tuerce,
     * mientras cada tramo tuerza más hacia la calle que el anterior. Un quiebro que se
     * aparta y vuelve no es de la curva: lo sigue el tractor.
     */
    const lado = Math.sign(diferencia(salida, fin.va)) || 1;
    let j = tuerce.k;
    while (j > 1 && lado * diferencia(tramo(j - 2), tramo(j - 1)) > 2 * GRADO) j--;
    return siguiendoLaRaya(desde, raya, acum, acum[j]!, largoDelAvion, raya[fin.k]!, fin.va, batalla);
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
  return rectaArcoRecta(desde, cruce, calle, batalla);
}

/**
 * **Lo que el tractor sigue de la raya antes de girar a la calle** (H47b): desde el
 * puesto, la raya tal cual, con sus quiebros, hasta un largo de avión antes de la curva
 * de la calle (`curva`, en metros de raya); y desde ahí, la recta, el arco y la recta de
 * `rectaArcoRecta`. Así la cola va por donde va la raya, y no campo a través por la
 * plataforma, y al giro le queda el sitio que le queda en cualquier calle.
 */
function siguiendoLaRaya(
  desde: Pose,
  raya: readonly PuntoXZ[],
  acum: readonly number[],
  curva: number,
  largoDelAvion: number,
  cruce: PuntoXZ,
  calle: number,
  batalla: number,
): Empuje {
  const total = acum[acum.length - 1]!;
  const enLaRaya = (s: number): PuntoXZ => {
    const d = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < raya.length - 1 && acum[i]! < d) i++;
    const a = raya[i - 1]!;
    const b = raya[i]!;
    const k = (d - acum[i - 1]!) / (acum[i]! - acum[i - 1]! || 1);
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
  };
  const atras = vector(desde.rumbo + Math.PI);
  // Dónde está el avión sobre la raya: la cola sale por ella, de espaldas.
  const s0 = Math.max(0, (desde.x - raya[0]!.x) * atras.x + (desde.z - raya[0]!.z) * atras.z);
  const s1 = Math.max(s0, curva - largoDelAvion);
  // Desde ahí, recto hacia el principio de la curva.
  const deja = enLaRaya(s1);
  const llega = rumboEntre(deja, enLaRaya(Math.max(curva, s1 + 1)));
  const desdeAhi = s1 > s0 ? { ...deja, rumbo: llega + Math.PI } : desde;
  let giro = rectaArcoRecta(desdeAhi, cruce, calle, batalla);
  /*
   * **Y sin alejarse de la raya más de un largo de avión**: si la raya tuerce en una curva
   * ancha, la calle por la que sale se cruza con la recta que llega lejos de la propia
   * curva, y el giro holgado acaba aún más allá —en Lanzarote desde el T2, a 33 m de la
   * raya con el JAZ 90—. Entonces se gira tan cerrado como se puede, que es lo que hace el
   * tractor para dejar el avión junto a la calle.
   */
  const fin = giro.poses.at(-1)!;
  let lejos = Infinity;
  for (let i = 1; i < raya.length; i++) {
    const a = raya[i - 1]!;
    const b = raya[i]!;
    const l2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((fin.x - a.x) * (b.x - a.x) + (fin.z - a.z) * (b.z - a.z)) / l2));
    lejos = Math.min(lejos, Math.hypot(a.x + (b.x - a.x) * t - fin.x, a.z + (b.z - a.z) * t - fin.z));
  }
  if (lejos > largoDelAvion) giro = rectaArcoRecta(desdeAhi, cruce, calle, batalla, DIRECCION_MAXIMA);
  if (s1 <= s0) return giro;
  const enS0 = enLaRaya(s0);
  const aparte = { x: desde.x - enS0.x, z: desde.z - enS0.z };
  /** Lo que le queda al avión de lo que se aparta de la raya en el puesto, que se pierde en quince metros. */
  const AL_ENTRAR = 15;
  // Lo que sigue a la raya y, desde `deja`, la recta hacia la curva: sin esquina entre los dos.
  const hacia = vector(llega);
  const enElCamino = (s: number): PuntoXZ =>
    s <= s1 ? enLaRaya(s) : { x: deja.x + hacia.x * (s - s1), z: deja.z + hacia.z * (s - s1) };
  const poses: Pose[] = [];
  // Una postura cada medio metro o algo menos, a pasos iguales: `poseDelEmpuje` cuenta con ello.
  const n = Math.ceil((s1 - s0) / PASO);
  for (let i = 0; i < n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    const k = Math.max(0, 1 - (s - s0) / AL_ENTRAR);
    const p = enLaRaya(s);
    // Hacia dónde va la cola: la cuerda de seis metros alrededor, que dobla los quiebros sin saltos.
    const va = rumboEntre(enElCamino(Math.max(s0, s - 3)), enElCamino(s + 3));
    const rumbo = normalizar(va + Math.PI + k * diferencia(va + Math.PI, desde.rumbo));
    poses.push({ x: p.x + aparte.x * k, z: p.z + aparte.z * k, rumbo });
  }
  poses[0] = { ...desde };
  return {
    poses: [...poses, ...giro.poses],
    largo: s1 - s0 + giro.largo,
    radio: giro.radio,
    giro: diferencia(desde.rumbo, giro.poses.at(-1)!.rumbo),
    cruce,
  };
}

/**
 * **La recta, el arco y la recta del empuje**: desde `desde` hacia atrás por su eje,
 * girando para acabar en la recta que pasa por `cruce` con el morro hacia `calle`, con la
 * rueda de morro a `direccion` en el giro si cabe.
 */
function rectaArcoRecta(
  desde: Pose,
  cruce: PuntoXZ,
  calle: number,
  batalla: number,
  direccion = DIRECCION_EN_EL_GIRO,
): Empuje {
  // ── Las dos rectas: la de la cola saliendo del puesto y la de la calle ──
  const atras = desde.rumbo + Math.PI;
  const b = vector(atras);
  let giro = diferencia(atras, calle + Math.PI);
  // Media vuelta no se empuja: noventa grados, hacia el lado que tuerce la calle. Ver `MEDIA_VUELTA`.
  const mediaVuelta = Math.abs(giro) > MEDIA_VUELTA;
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
  let radio = batalla / Math.tan(direccion);
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
/**
 * **A qué velocidad se remolca de vuelta a la raya**, m/s: dos, siete kilómetros por
 * hora. Es un remolque hacia delante por la hierba, más rápido que un empuje por la
 * plataforma y bastante por debajo de lo que se remolca por una calle: lo que anda
 * deprisa quien va al lado con el cable.
 */
export const VA_REMOLCANDO = 2;
/** Lo que tarda en engancharse: la cuna abraza la rueda, el pasador y el cable, s. */
export const SE_ENGANCHA = 6;
/**
 * **Lo que levanta la cuna la rueda de morro**, m. Un tractor sin barra no empuja la
 * rueda por el suelo: la abraza entre sus dos compuertas y la sube sobre la pala, y el
 * avión va con la rueda de morro en vilo y apoyado en las principales. Lo justo para
 * que no toque el asfalto: quince centímetros. Antes la rueda se quedaba en el suelo y
 * la pala la atravesaba (H20c puso la cuna justo debajo de ella).
 */
export const LEVANTA_LA_RUEDA = 0.15;
/**
 * **Lo que anda el tractor marcha atrás** los últimos metros hasta la rueda de morro,
 * m/s, y cuántos metros son: se para delante del morro, mirando hacia donde va a tirar,
 * y retrocede despacio hasta abrazar la rueda con la cuna.
 */
const RECULA = 1;
const RECULA_DESDE = 12;
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
  /**
   * **El tractor viene a buscar al avión**, solo en la vuelta a la raya: desde la calle
   * hasta delante del morro, y los últimos metros marcha atrás, con la cuna hacia la
   * rueda de morro. Ver `ALaRaya`.
   */
  | "llegando"
  /** Y la engancha: la cuna abraza la rueda, el pasador puesto y el cable enchufado. */
  | "enganchando"
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
  /**
   * **De la referencia del avión a su rueda de morro**, que es donde se engancha el
   * tractor (`MorroDelAvion.rueda`). Sin ella, la batalla, que es contar la
   * referencia como si fuera el tren principal: en el JAZ 90 la cuna quedaba metro y
   * medio por delante de la rueda, y en el del tráfico, que se dibuja una vez y tres
   * décimas más grande, casi dos por detrás.
   */
  readonly rueda?: number;
  /**
   * **Si el tractor no le levanta la rueda**: el de rueda de cola, que no tiene rueda de
   * morro que llevar en vilo. Ver `Remolque.ruedaEnVilo`.
   */
  readonly sinVilo?: boolean;
  /**
   * **Con barra a las principales**, lo que va de ellas a la trasera del tractor, m: el de
   * rueda de cola, que se remolca hacia delante por su tren principal y no con la cuna.
   * Entonces `rueda` es la de las principales. Ver `barraAlTrenDe` en `rueda-de-morro.ts`.
   */
  readonly barra?: number;
}

/**
 * **La cuna del tractor**, la parte de atrás que abraza la rueda de morro, en largos
 * del tractor. La rueda va en medio de ella, encima de la pala: ver `tractorEnganchado`
 * y el dibujo en `tractor-de-remolque.ts`.
 */
export const CUNA_DEL_TRACTOR = 0.32;

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
  if (batalla < BATALLA_DE_AVIONETA) return { largo: 3, ancho: 1.5, alto: 1.3 };
  return batalla >= 20 ? { largo: 9, ancho: 4.3, alto: 1.8 } : { largo: 6.5, ancho: 3.1, alto: 1.6 };
}

/**
 * **Hasta qué batalla es una avioneta**, m, y se le acerca el tractor pequeño: los
 * eléctricos de cuna que abrazan la rueda de morro de una avioneta, de tres metros por uno
 * y medio. Solo los llama la vuelta a la raya: del puesto de contacto solo salen empujados
 * los de línea, y el más corto pasa de diez metros de batalla.
 */
const BATALLA_DE_AVIONETA = 5;

/**
 * **La vuelta a la raya**: el tractor viene a buscar a un avión que se ha quedado parado
 * en la hierba, lo engancha y lo remolca **hacia delante** hasta la raya. `desde` es por
 * dónde llega el tractor —de la calle, por la hierba— hasta delante del morro; lo último,
 * marcha atrás hasta la rueda, lo pone el remolque. Ver `world/vuelta-a-la-raya.ts`.
 */
export interface ALaRaya {
  readonly desde: readonly PuntoXZ[];
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
    /** Si es la vuelta a la raya, y no el empuje del puesto. Ver `ALaRaya`. */
    readonly aLaRaya: ALaRaya | null = null,
  ) {
    this.tractorMide = tractorPara(avionMide.batalla);
    this.tractorAhora = this.tractorEnganchado();
    this.rumboDelTractor = this.tractorAhora.rumbo;
    this.personaAhora = this.personaAlLado();
    if (aLaRaya && aLaRaya.desde.length > 0) {
      /*
       * **Llega por su camino y los últimos metros, marcha atrás**: se para delante del
       * morro mirando hacia donde va a tirar y recula hasta la rueda. Sin camino no hay
       * llegada que esperar, y se engancha ya.
       */
      const enganchado = this.tractorAhora;
      const n = vector(enganchado.rumbo);
      const delante = { x: enganchado.x + n.x * RECULA_DESDE, z: enganchado.z + n.z * RECULA_DESDE };
      this.caminoDeLlegada = [...aLaRaya.desde, delante, { x: enganchado.x, z: enganchado.z }];
      const p0 = this.caminoDeLlegada[0]!;
      const p1 = this.caminoDeLlegada[1]!;
      this.rumboDelTractor = rumboEntre(p0, p1);
      this.tractorAhora = { x: p0.x, z: p0.z, rumbo: this.rumboDelTractor };
      this.personaAhora = this.tractorAhora;
      this.faseAhora = "llegando";
    } else if (aLaRaya) this.faseAhora = "enganchando";
  }

  /** El camino del tractor hasta la rueda de morro, y lo que lleva de él. Ver `ALaRaya`. */
  private caminoDeLlegada: readonly PuntoXZ[] = [];
  private delCaminoDeLlegada = 0;

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
    return (
      this.faseAhora !== "llegando" &&
      this.faseAhora !== "enganchando" &&
      this.faseAhora !== "enganchado" &&
      this.faseAhora !== "empujando"
    );
  }
  /** Si ya es de sus pilotos: tractor fuera y la persona ha saludado. */
  get libre(): boolean {
    return this.faseAhora === "libre";
  }
  /** Si el cable va enchufado al avión. */
  get conCable(): boolean {
    return (
      this.faseAhora === "enganchando" ||
      this.faseAhora === "enganchado" ||
      this.faseAhora === "empujando" ||
      this.faseAhora === "frenado"
    );
  }
  /**
   * **Si la persona de tierra está a la vista**: mientras el tractor viene, va en él, y se
   * baja al llegar. Ver `ALaRaya`.
   */
  get personaALaVista(): boolean {
    return this.faseAhora !== "llegando";
  }
  /** Si el tractor tiene la rueda de morro. */
  get enganchado(): boolean {
    return this.conCable || (this.faseAhora === "soltando" && this.enFase < SE_SUELTA / 2);
  }
  /**
   * **Lo que lleva levantada la rueda de morro**, m: la sube la cuna en la segunda mitad
   * del enganche, ya abrazada; la lleva en vilo enganchado, empujando y frenado; y la
   * baja en la primera mitad de la suelta, que es lo que el tractor la sigue teniendo
   * (`enganchado`). Ver `LEVANTA_LA_RUEDA`.
   */
  get ruedaEnVilo(): number {
    if (this.avionMide.sinVilo) return 0;
    const deCeroAUno = (s: number) => Math.min(1, Math.max(0, s));
    switch (this.faseAhora) {
      case "enganchando":
        return LEVANTA_LA_RUEDA * deCeroAUno((this.enFase - SE_ENGANCHA / 2) / (SE_ENGANCHA / 2));
      case "enganchado":
      case "empujando":
      case "frenado":
        return LEVANTA_LA_RUEDA;
      case "soltando":
        return LEVANTA_LA_RUEDA * deCeroAUno(1 - this.enFase / (SE_SUELTA / 2));
      default:
        return 0;
    }
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
    const delante = this.avionMide.rueda ?? this.avionMide.batalla;
    return { x: a.x + n.x * delante, z: a.z + n.z * delante };
  }

  /**
   * **Lo que tiene el tractor del avión**: la rueda de morro en su cuna o, con barra, la
   * trasera del tractor, al final de ella. Es donde va la persona de tierra.
   */
  private get enganche(): PuntoXZ {
    const r = this.ruedaDeMorro;
    const barra = this.avionMide.barra ?? 0;
    const n = vector(this.avion.rumbo);
    return { x: r.x + n.x * barra, z: r.z + n.z * barra };
  }

  /** Lo que va la barra de las principales al tractor, m; cero con la cuna. */
  get barra(): number {
    return this.avionMide.barra ?? 0;
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

  /**
   * **Si el tractor de la vuelta a la raya puede acercarse ya**: con la hélice o los
   * motores todavía girando, no. Nadie de tierra se acerca a la rueda de morro con una
   * hélice girando delante, ni a un reactor en marcha; el tractor espera en la calle. Lo
   * pone quien lleva el avión en cada paso.
   */
  puedeLlegar = true;

  /** **Que empiece a empujar**: lo pide la cabina. Solo vale enganchado. */
  empezar(): void {
    if (this.faseAhora === "enganchado") this.pasarA("empujando");
  }

  /** **A qué velocidad se mueve el avión enganchado**: la del empuje, o la del remolque. */
  private get vaA(): number {
    return this.aLaRaya ? VA_REMOLCANDO : VA_EMPUJANDO;
  }

  /** Un paso de `dt` segundos. */
  paso(dt: number): void {
    this.enFase += dt;
    switch (this.faseAhora) {
      case "llegando":
        // Y no se acerca hasta que el motor está parado: ver `puedeLlegar`.
        if (!this.puedeLlegar) break;
        if (this.llegar(dt)) {
          this.tractorAhora = this.tractorEnganchado();
          this.rumboDelTractor = this.tractorAhora.rumbo;
          this.pasarA("enganchando");
        }
        break;
      case "enganchando":
        // En la vuelta a la raya nadie lo pide desde la cabina: el toque ya lo pidió.
        if (this.enFase >= SE_ENGANCHA) this.pasarA("empujando");
        break;
      case "enganchado":
        break;
      case "empujando": {
        const queda = this.empuje.largo - this.recorrido;
        // Arranca y para suave: lo que frena hasta el final, v² = 2·a·d.
        const paraParar = Math.sqrt(2 * ACELERA_EMPUJANDO * Math.max(0, queda));
        // Y nunca del todo parado antes de llegar, que el último centímetro también se empuja.
        this.v = Math.max(queda > 0.02 ? 0.03 : 0, Math.min(this.vaA, paraParar, this.v + ACELERA_EMPUJANDO * dt));
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

  /**
   * **El tractor pegado a la rueda de morro**: la rueda en medio de la cuna, encima de
   * la pala, y el cuerpo por delante. Iba a un metro de la trasera en todos, y en el
   * pequeño, de tres metros, eso era dentro del chasis, por delante de la cuna.
   */
  private tractorEnganchado(): Pose {
    const a = this.avion;
    const n = vector(a.rumbo);
    const r = this.ruedaDeMorro;
    // Con barra, la trasera del tractor al final de ella, delante de la hélice.
    const delante =
      this.avionMide.barra !== undefined
        ? this.avionMide.barra + this.tractorMide.largo / 2
        : (this.tractorMide.largo * (1 - CUNA_DEL_TRACTOR)) / 2;
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
    // Al lado de lo que tiene el tractor: la rueda de morro, o la barra junto al tractor.
    const r = this.enganche;
    const izquierda = vector(a.rumbo - Math.PI / 2);
    const aparte = this.tractorMide.ancho / 2 + 2.5;
    const andando = this.faseAhora === "empujando";
    // Andando hacia donde va el avión: hacia la cola en el empuje, hacia el morro en el remolque.
    const haciaDondeVa = this.aLaRaya ? a.rumbo : a.rumbo + Math.PI;
    return {
      x: r.x + izquierda.x * aparte,
      z: r.z + izquierda.z * aparte,
      rumbo: andando ? normalizar(haciaDondeVa) : normalizar(a.rumbo - Math.PI / 2 + Math.PI),
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
    /*
     * Hacia el lado del puesto, que es la plataforma. **Y de vuelta a la raya, al contrario**:
     * de donde vino el avión es la hierba de la que se le acaba de sacar.
     */
    const delPuesto = cruz(n, { x: puesto.x - a.x, z: puesto.z - a.z }) >= 0 ? 1 : -1;
    const lado = this.aLaRaya ? -delPuesto : delPuesto;
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

  /**
   * **El tractor, por su camino hasta la rueda de morro**: hacia delante a lo que rueda
   * suelto, y el último tramo marcha atrás y despacio, con la cuna por delante. Gira como
   * un vehículo, poco a poco. Devuelve si ya llegó.
   */
  private llegar(dt: number): boolean {
    const camino = this.caminoDeLlegada;
    const ultimo = camino.length - 2;
    let total = 0;
    let hastaElUltimo = 0;
    for (let i = 1; i < camino.length; i++) {
      if (i - 1 === ultimo) hastaElUltimo = total;
      total += Math.hypot(camino[i]!.x - camino[i - 1]!.x, camino[i]!.z - camino[i - 1]!.z);
    }
    const reculando = this.delCaminoDeLlegada >= hastaElUltimo;
    const s = Math.min(total, this.delCaminoDeLlegada + (reculando ? RECULA : RUEDA_SUELTO) * dt);
    this.delCaminoDeLlegada = s;
    let falta = s;
    let p = camino[0]!;
    let va = this.rumboDelTractor;
    for (let i = 1; i < camino.length; i++) {
      const a = camino[i - 1]!;
      const b = camino[i]!;
      const l = Math.hypot(b.x - a.x, b.z - a.z);
      if (l < 1e-6) continue;
      // Marcha atrás, el morro del tractor mira al revés de por donde va.
      va = rumboEntre(a, b) + (i - 1 === ultimo ? Math.PI : 0);
      if (falta <= l) {
        p = { x: a.x + ((b.x - a.x) * falta) / l, z: a.z + ((b.z - a.z) * falta) / l };
        break;
      }
      falta -= l;
      p = b;
    }
    this.rumboDelTractor = normalizar(this.rumboDelTractor + acotar(diferencia(this.rumboDelTractor, va), 35 * GRADO * dt));
    this.tractorAhora = { x: p.x, z: p.z, rumbo: this.rumboDelTractor };
    // Y la persona va en él, hasta que se baja a enganchar.
    this.personaAhora = this.tractorAhora;
    return s >= total - 1e-6;
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
/**
 * **El avión con la rueda de morro en vilo**, apoyado en las principales: lo que
 * cabecea, rad, morro arriba, y lo que sube su referencia, m, para que las
 * principales no se hundan al girar sobre ella. `principales` es lo que van por
 * detrás de la referencia, y `batalla` de ellas a la rueda de morro.
 */
export function morroEnVilo(
  levanta: number,
  batalla: number,
  principales: number,
): { cabeceo: number; sube: number } {
  if (levanta <= 0 || batalla <= 0) return { cabeceo: 0, sube: 0 };
  const cabeceo = Math.asin(Math.min(1, levanta / batalla));
  return { cabeceo, sube: Math.sin(cabeceo) * principales };
}

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
