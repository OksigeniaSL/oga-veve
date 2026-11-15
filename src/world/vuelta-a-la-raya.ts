/**
 * **La vuelta a la raya**: el niño que rueda, se sale de la calle o de la pista y se
 * queda parado en la hierba, sin saber volver.
 *
 * Es uno de los líos de la guía de diseño por edades —«cada lío, un arreglo de un toque
 * que el guía señala solo»— y lo decidió Enrique el 15-11-2026: tras un rato parado, la
 * instructora se lo dice con calma, y con un toque viene el tractor del remolque y lo
 * devuelve a la raya, **como pasa en un aeródromo de verdad**. Un avión que se sale al
 * campo no vuelve por sus medios: el servicio de plataforma le engancha un tractor a la
 * rueda de morro y lo remolca hasta el pavimento.
 *
 * Aquí está la lógica, sin Three ni DOM:
 *
 * - **Cuándo está parado fuera de la raya**, y cuándo se rearma el aviso: no con el
 *   reloj, sino porque el avión se ha movido y ha vuelto a quedarse parado fuera. Ver
 *   `VigiaDeLaHierba`.
 * - **A qué punto de la raya lo lleva el tractor**: el más cercano al que se llega en
 *   línea recta sin atravesar un edificio ni una pista —por donde pasaría un tractor de
 *   verdad—, y sobre el pavimento. Ver `destinoEnLaRaya`.
 * - **Por dónde va el avión remolcado**: hacia delante, girando con la rueda de morro
 *   como gira un avión enganchado, y acabando sobre la raya y mirando hacia donde sigue.
 *   Ver `remolqueALaRaya`.
 *
 * Lo engancha `game.ts`, lo mueve y lo dibuja el mismo remolque del puesto
 * (`remolque.ts`, `tractor-de-remolque.ts`) y lo prueba `vuelta-a-la-raya.test.ts`.
 *
 * **Y donde no hay tractor, no se ofrece.** En un campo sin servicio de tránsito aéreo
 * —la pista de la granja, Ayolas— no hay servicio de plataforma con tractor: allí una
 * avioneta se mueve a mano, con la barra de remolque en la rueda de morro, y el avión de
 * línea no va. Ver `hayTractor`.
 *
 * Coordenadas del mundo, como en `remolque.ts`: `x` al este y `z` al sur, en metros;
 * rumbos en radianes, cero al norte y positivos hacia el este.
 */

import { enElPavimento, sinTorre, type Aerodrome } from "./aerodrome";
import {
  DIRECCION_MAXIMA,
  diferencia,
  paredMasCercana,
  rumboEntre,
  vector,
  type Empuje,
  type Pose,
  type PuntoXZ,
} from "./remolque";
import { enAlgunaPista } from "./superficie";

// ── Cuándo está parado fuera de la raya ──────────────────────────────────

/**
 * **Por debajo de qué velocidad está parado**, m/s: medio metro por segundo, que en el
 * suelo es no moverse. Un avión que rueda despacio por la hierba buscando la calle no
 * está atascado: está volviendo solo, y eso es lo mejor que puede hacer.
 */
export const PARADO = 0.5;

/**
 * **Cuánto rato parado fuera antes de decirlo**, s. Ocho: lo bastante para que quien se ha
 * parado a pensar, o a mirar dónde está, lo haga sin que nadie le meta prisa; y lo bastante
 * poco para que quien no sabe qué hacer no se aburra esperando. Es el primer aviso, el
 * único que mira el reloj: los siguientes los rearma lo que pasa. Ver `VigiaDeLaHierba`.
 */
export const UN_RATO = 8;

/**
 * **Lo que se tiene que mover el avión para que el aviso vuelva**, m: cinco. Menos es lo
 * que baila un avión parado con el motor en marcha; más, haber ido a alguna parte. Es una
 * posición, que no tiembla, y no una velocidad que cruza su umbral sola.
 */
export const SE_MOVIO = 5;

/** Lo que se mira de un fotograma. */
export interface FotogramaDeLaHierba {
  readonly enElSuelo: boolean;
  /** Por el suelo, m/s. */
  readonly velocidad: number;
  /**
   * **Si lo que pisa es campo**: ni pista, ni calle, ni plataforma. En un aeródromo de
   * hierba la pista y la plataforma son hierba segada, y salirse es pisar el campo de al
   * lado. Ver `Superficie` en `superficie.ts`.
   */
  readonly enElCampo: boolean;
  /**
   * **Si se está rodando con una raya que seguir**: en una fase de rodar, con plan y sin
   * que nadie más lleve el avión —el tractor del puesto, el de esta misma vuelta—.
   */
  readonly conRaya: boolean;
  readonly x: number;
  readonly z: number;
}

/** Lo que dice el vigía en cada fotograma. */
export interface LoQueVeElVigia {
  /** Si en este fotograma toca avisar: decirlo y hacer latir el tractor. */
  readonly avisa: boolean;
  /** Si el tractor se ofrece: parado fuera desde hace un rato. */
  readonly ofrecido: boolean;
}

/**
 * **El vigía de la hierba**: cuándo se ha quedado el avión parado fuera de la raya, y
 * cuándo toca decirlo.
 *
 * - **El tractor se ofrece** mientras el avión siga parado fuera, pasado `UN_RATO`. En
 *   cuanto se mueve, se retira: está volviendo solo.
 * - **El aviso se dice una vez** al ofrecerse. Y vuelve solo si cambia algo que pasa: que
 *   el avión se haya movido más de `SE_MOVIO` desde donde se le avisó, o que haya vuelto a
 *   la raya, y que se vuelva a quedar parado fuera. **Nunca porque pase otro rato**: la
 *   segunda vez no dice nada que no dijera la primera, y a la tercera se aprende a no
 *   escuchar. Parado en el mismo sitio, la tarjeta sigue ahí, latiendo, y la voz no.
 */
export class VigiaDeLaHierba {
  private parado = 0;
  private armado = true;
  private dondeSeAviso: PuntoXZ | null = null;

  paso(dt: number, f: FotogramaDeLaHierba): LoQueVeElVigia {
    const fuera = f.enElSuelo && f.conRaya && f.enElCampo;
    // El rearme mira dónde está el avión, que no tiembla: ver `SE_MOVIO`.
    if (!this.armado) {
      const lejos = this.dondeSeAviso ? Math.hypot(f.x - this.dondeSeAviso.x, f.z - this.dondeSeAviso.z) : Infinity;
      if (!fuera || lejos > SE_MOVIO) this.armado = true;
    }
    this.parado = fuera && f.velocidad < PARADO ? this.parado + dt : 0;
    const ofrecido = this.parado >= UN_RATO;
    const avisa = ofrecido && this.armado;
    if (avisa) {
      this.armado = false;
      this.dondeSeAviso = { x: f.x, z: f.z };
    }
    return { avisa, ofrecido };
  }

  /** Vuelo nuevo: nada visto. */
  reiniciar(): void {
    this.parado = 0;
    this.armado = true;
    this.dondeSeAviso = null;
  }
}

// ── A qué punto de la raya ───────────────────────────────────────────────

/**
 * **Hasta dónde va el tractor a buscar un avión**, m en línea recta del avión a la raya.
 * Trescientos: más que todo lo que un avión se sale rodando, y lo que un tractor recorre
 * por la hierba en un par de minutos. Más lejos el avión no se ha salido de la calle: está
 * en otra parte, y eso es otro lío —el de quien se pierde, que la flecha de casa lleva de
 * vuelta—.
 */
export const HASTA_DONDE_VA = 300;

/** Cada cuánto se mira la raya buscando dónde dejar el avión, m. */
const CADA_CUANTO = 2;
/** Cada cuánto se mira la recta del tractor, m. */
const MIRA_LA_RECTA = 2;
/** Cuántos puntos de la raya se prueban, de los más cercanos. */
const SE_PRUEBAN = 80;

/** Dónde deja el tractor el avión: un punto de la raya, lo que lleva de ella y hacia dónde va. */
export interface DestinoEnLaRaya {
  readonly punto: PuntoXZ;
  /** Metros de raya desde su principio. */
  readonly s: number;
  /** Hacia dónde sigue la raya desde ahí, rad. */
  readonly rumbo: number;
}

/** Lo que hay que saber del sitio para buscar por dónde pasa un tractor. */
export interface ElSitio {
  /**
   * **Si en el punto se puede dejar un avión rodando**: pavimento —o la hierba segada de
   * un campo de hierba—, y no pista. Una pista no es sitio donde dejar a nadie: por ella
   * viene otro.
   */
  pisable(x: number, z: number): boolean;
  /**
   * **Si un tractor pasa por ahí remolcando este avión**: ni dentro de un edificio ni con
   * el ala encima de uno, ni en una pista. Se pregunta cada dos metros de la recta.
   */
  libre(x: number, z: number): boolean;
}

/**
 * **Si en este campo hay un tractor que mandar**: donde hay servicio de tránsito aéreo
 * —torre o AFIS— hay servicio de plataforma, y el servicio de plataforma tiene tractores.
 * En uno sin nadie —la pista de hierba de la granja, Ayolas— no hay a quién llamar: allí
 * una avioneta se mueve a mano, con la barra de remolque en la rueda de morro, y no se
 * inventa un tractor que no hay. Ver la cabecera.
 */
export function hayTractor(aero: Pick<Aerodrome, "privado" | "sinTorre"> | null | undefined): boolean {
  return !!aero && !sinTorre(aero);
}

/**
 * **El sitio de un aeródromo, para el tractor**: dónde se puede dejar un avión —pavimento,
 * o hierba segada en un campo de hierba, y no pista— y por dónde pasa remolcándolo —ni en
 * una pista, ni dentro de un edificio, ni con media envergadura encima de uno—. Los
 * edificios se cogen por su caja antes de mirarles las paredes: un aeropuerto grande tiene
 * cientos, y la recta de un tractor pasa cerca de dos o tres.
 */
export function elSitioDe(aero: Aerodrome, envergadura: number): ElSitio {
  const margen = envergadura / 2;
  const cajas = aero.buildings.map((e) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const [px, py] of e.polygon) {
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      z0 = Math.min(z0, -py);
      z1 = Math.max(z1, -py);
    }
    return { e, x0: x0 - margen, x1: x1 + margen, z0: z0 - margen, z1: z1 + margen };
  });
  const pista = (x: number, z: number): boolean => enAlgunaPista(aero, x, z);
  return {
    pisable: (x, z) => !enElCampo(aero, x, z) && !pista(x, z),
    libre: (x, z) => {
      if (pista(x, z)) return false;
      const cerca = cajas.filter((c) => x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1).map((c) => c.e);
      if (cerca.length === 0) return true;
      if (cerca.some((e) => dentroDelPoligono(x, z, e.polygon))) return false;
      return (paredMasCercana(x, z, cerca)?.distancia ?? Infinity) >= margen;
    },
  };
}

/**
 * **Si un punto del mundo está en el campo**: fuera de toda pista, calle y plataforma, con
 * su ancho de verdad. No vale la `Superficie` del rozamiento: el mapa de pavimento lleva
 * treinta metros de margen a cada lado del eje de una calle —la franja sin árboles, ver
 * `MARGEN_RODADURA`—, y con él un avión parado en la hierba a veinte metros de la calle
 * contaba como en el asfalto. En un campo de hierba, la pista y las calles cuentan: son
 * hierba segada, y salirse es pisar el campo de al lado.
 */
export function enElCampo(aero: Aerodrome, x: number, z: number): boolean {
  return !enElPavimento(aero, [x, -z]);
}

/** Si un punto del mundo cae dentro de un polígono del aeródromo, que lleva la `y` al norte. */
function dentroDelPoligono(x: number, z: number, pol: readonly (readonly [number, number])[]): boolean {
  const y = -z;
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i]!;
    const [xj, yj] = pol[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) dentro = !dentro;
  }
  return dentro;
}

/**
 * **El punto de la raya al que lleva el tractor**: el más cercano al avión al que se llega
 * en línea recta por donde pasa un tractor —ver `ElSitio.libre`—, y en el que el avión
 * queda sobre el pavimento, él y los metros de raya de delante. Es la regla 4 de
 * `AGENTS.md`: un avión no se arrastra en línea recta atravesando un edificio, ni se le
 * cruza una pista para ahorrarse una vuelta. `null` si no hay ninguno a menos de
 * `HASTA_DONDE_VA`: entonces el tractor no se ofrece, y el avión se queda como estaba.
 */
export function destinoEnLaRaya(
  desde: PuntoXZ,
  raya: readonly PuntoXZ[],
  sitio: ElSitio,
  delante = 6,
  /**
   * **Cuánta raya tiene que quedar por delante**, m. El final de la raya de salida es la
   * doble raya del punto de espera, y un tractor no deja a nadie encima de ella: lo deja en
   * la calle, y los últimos metros hasta la espera, y la luz de la torre, son de quien
   * rueda. En una raya corta, como mucho media raya: la de Los Rodeos, del puesto de la
   * aviación general a la espera, son setenta metros, y sin ese tope el tractor dejaba el
   * avión encima de la doble raya.
   */
  alFinal = 0,
): DestinoEnLaRaya | null {
  if (raya.length < 2) return null;
  const { enLaRaya, total } = recorrer(raya);
  const hasta = total - Math.min(alFinal, total / 2);
  const candidatos: { readonly s: number; readonly p: PuntoXZ; readonly d: number }[] = [];
  for (let s = 0; s <= hasta; s += CADA_CUANTO) {
    const p = enLaRaya(s);
    const d = Math.hypot(p.x - desde.x, p.z - desde.z);
    if (d <= HASTA_DONDE_VA) candidatos.push({ s, p, d });
  }
  candidatos.sort((a, b) => a.d - b.d);
  let probados = 0;
  for (const c of candidatos) {
    if (probados >= SE_PRUEBAN) break;
    if (!sitio.pisable(c.p.x, c.p.z)) continue;
    const mas = enLaRaya(Math.min(total, c.s + delante));
    if (!sitio.pisable(mas.x, mas.z)) continue;
    probados++;
    if (!rectaLibre(desde, c.p, sitio)) continue;
    const sigue = enLaRaya(Math.min(total, c.s + 4));
    const rumbo = Math.hypot(sigue.x - c.p.x, sigue.z - c.p.z) > 0.5 ? rumboEntre(c.p, sigue) : rumboEntre(enLaRaya(c.s - 4), c.p);
    return { punto: c.p, s: c.s, rumbo };
  }
  return null;
}

/**
 * Si la recta del tractor va libre: de dos en dos metros, sin contar el primero, que es
 * donde está el avión.
 */
function rectaLibre(a: PuntoXZ, b: PuntoXZ, sitio: ElSitio): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(d / MIRA_LA_RECTA));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    if (!sitio.libre(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}

// ── Por dónde va el avión remolcado ──────────────────────────────────────

/** Cada cuánto se da un paso del remolque, m. */
const PASO = 0.25;

/**
 * **Cuántos metros de raya remolca el tractor pasado el punto**, para que el avión acabe
 * encima de ella y mirando hacia donde sigue: tres batallas, que es lo que tarda en
 * enderezarse quien sigue un camino mirando a una batalla por delante.
 */
export function loQueSeSigue(batalla: number): number {
  return Math.max(24, 3 * batalla);
}

/**
 * **Lo que tiene que quedar de raya por delante del punto** para que el remolque acabe
 * antes de la doble raya del punto de espera, con holgura: ver `destinoEnLaRaya`.
 */
export function rayaQueQuedaPorDelante(batalla: number): number {
  return loQueSeSigue(batalla) + 15;
}

/**
 * **El remolque hasta la raya**: las posturas del avión, una cada medio metro, desde donde
 * se quedó parado hasta el punto de la raya y unos metros más por ella, para que acabe
 * sobre la raya y mirando hacia donde sigue.
 *
 * El avión va **hacia delante**, tirado por la rueda de morro, y gira como gira un avión
 * enganchado: el tractor le lleva la rueda como mucho a setenta grados —ver
 * `DIRECCION_MAXIMA`—, con el radio que sale de la batalla. Se sigue el camino como lo
 * sigue quien conduce, mirando un poco por delante: el avión no derrapa ni gira sobre sí
 * mismo, y si al empezar mira hacia otro lado, da la vuelta en el giro más cerrado que le
 * deja la rueda.
 *
 * Devuelve un `Empuje` —lo que mueve el remolque— con el destino como cruce, o `null` si
 * no llega a la raya: entonces el tractor no se ofrece.
 */
export function remolqueALaRaya(
  desde: Pose,
  raya: readonly PuntoXZ[],
  destino: DestinoEnLaRaya,
  batalla: number,
): Empuje | null {
  const { enLaRaya, total } = recorrer(raya);
  const sigue = loQueSeSigue(batalla);
  const camino: PuntoXZ[] = [{ x: desde.x, z: desde.z }, destino.punto];
  for (let s = destino.s + 2; s <= Math.min(total, destino.s + sigue); s += 2) camino.push(enLaRaya(s));
  const final = camino[camino.length - 1]!;
  const { enLaRaya: enElCamino, total: largoDelCamino } = recorrer(camino);
  const radio = Math.max(0.5, batalla / Math.tan(DIRECCION_MAXIMA));
  const mira = Math.max(5, 0.8 * batalla);
  let x = desde.x;
  let z = desde.z;
  let rumbo = desde.rumbo;
  let avance = 0;
  let giro = 0;
  const poses: Pose[] = [{ x, z, rumbo }];
  const tope = Math.ceil((largoDelCamino * 3 + 4 * Math.PI * radio) / PASO) + 400;
  for (let i = 0; i < tope; i++) {
    avance = proyectar(camino, { x, z }, avance, mira);
    const objetivo = enElCamino(Math.min(largoDelCamino, avance + mira));
    const alfa = diferencia(rumbo, rumboEntre({ x, z }, objetivo));
    // Lo que se curva: el seguidor de siempre, y si el objetivo queda detrás, el giro más cerrado.
    let curva = Math.abs(alfa) > Math.PI / 2 ? Math.sign(alfa) / radio : (2 * Math.sin(alfa)) / mira;
    curva = Math.max(-1 / radio, Math.min(1 / radio, curva));
    rumbo += curva * PASO;
    giro += curva * PASO;
    const v = vector(rumbo);
    x += v.x * PASO;
    z += v.z * PASO;
    if (i % 2 === 1) poses.push({ x, z, rumbo: normalizar(rumbo) });
    if (Math.hypot(final.x - x, final.z - z) < 0.6 || avance >= largoDelCamino - 0.05) break;
  }
  const fin = poses[poses.length - 1]!;
  if (fin.x !== x || fin.z !== z) poses.push({ x, z, rumbo: normalizar(rumbo) });
  // Y tiene que haber llegado: sobre la raya, cerca del final y mirando hacia donde sigue.
  const ultima = poses[poses.length - 1]!;
  if (Math.hypot(final.x - ultima.x, final.z - ultima.z) > 4) return null;
  if (aLaPolilinea(ultima, camino.slice(1)) > 1.5) return null;
  const haciaDondeSigue = rumboEntre(camino[camino.length - 2] ?? destino.punto, final);
  if (Math.abs(diferencia(ultima.rumbo, haciaDondeSigue)) > 20 * (Math.PI / 180)) return null;
  let largo = 0;
  for (let i = 1; i < poses.length; i++) largo += Math.hypot(poses[i]!.x - poses[i - 1]!.x, poses[i]!.z - poses[i - 1]!.z);
  return { poses, largo, radio, giro, cruce: destino.punto };
}

/**
 * **Por dónde llega el tractor**: por la raya hasta el punto donde va a dejar el avión, y
 * de ahí por la hierba hasta delante del morro. Lo último —recular hasta la rueda— lo
 * pone el remolque. Ver `ALaRaya` en `remolque.ts`.
 */
export function llegadaDelTractor(raya: readonly PuntoXZ[], destino: DestinoEnLaRaya): PuntoXZ[] {
  const { enLaRaya } = recorrer(raya);
  // Viene de la calle, de unos metros más atrás por la raya: el servicio de plataforma.
  return [enLaRaya(Math.max(0, destino.s - 40)), destino.punto];
}

// ── Lo que queda ─────────────────────────────────────────────────────────

/** Una polilínea medida: el punto a tantos metros de su principio, y su largo. */
function recorrer(raya: readonly PuntoXZ[]): { enLaRaya: (s: number) => PuntoXZ; total: number } {
  const acum: number[] = [0];
  for (let i = 1; i < raya.length; i++)
    acum.push(acum[i - 1]! + Math.hypot(raya[i]!.x - raya[i - 1]!.x, raya[i]!.z - raya[i - 1]!.z));
  const total = acum[acum.length - 1] ?? 0;
  const enLaRaya = (s: number): PuntoXZ => {
    if (raya.length < 2) return raya[0] ?? { x: 0, z: 0 };
    const d = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < raya.length - 1 && acum[i]! < d) i++;
    const a = raya[i - 1]!;
    const b = raya[i]!;
    const l = acum[i]! - acum[i - 1]! || 1;
    const k = (d - acum[i - 1]!) / l;
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
  };
  return { enLaRaya, total };
}

/**
 * **Lo que lleva recorrido del camino**, m: el punto más cercano a `p` sin volver atrás y
 * sin saltar más de lo que se mira por delante, que un camino que se dobla sobre sí mismo
 * no debe cambiarle a uno de tramo.
 */
function proyectar(camino: readonly PuntoXZ[], p: PuntoXZ, desde: number, mira: number): number {
  let mejor = Infinity;
  let donde = desde;
  let acum = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (l * l)));
    const s = acum + t * l;
    acum += l;
    if (s < desde - 0.01 || s > desde + mira) continue;
    const d = Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
    if (d < mejor) {
      mejor = d;
      donde = s;
    }
  }
  return Math.max(desde, donde);
}

/** Lo que queda un punto de una polilínea, m. */
function aLaPolilinea(p: PuntoXZ, pts: readonly PuntoXZ[]): number {
  let lejos = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
    lejos = Math.min(lejos, Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z));
  }
  return lejos;
}

function normalizar(r: number): number {
  const d = r % (2 * Math.PI);
  return d < 0 ? d + 2 * Math.PI : d;
}
