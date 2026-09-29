/**
 * Las bandadas: **dónde está cada una y qué hace cada ave**, sin dibujar nada.
 *
 * Las especies y sus números —envergadura, altura, velocidad, aleteo— son de
 * `aves.ts`, con su fuente. Esto las pone en el mundo alrededor de cada campo
 * y las mueve. El dibujo es de `bandadas-dibujo.ts`.
 *
 * ## Dónde
 *
 * Se sortean sitios alrededor de la pista y cada especie va a los suyos:
 *
 * - **Junto al agua**: la orilla del mar, de un río o de un estero, que es
 *   donde comen las garzas, los biguás y las gaviotas.
 * - **Mar adentro**: donde no hay tierra en kilómetro y medio, que es por
 *   donde pasan las pardelas rozando las olas.
 * - **Sobre el campo**: tierra llana, donde se cierne el cernícalo y pasan las
 *   palomas.
 * - **En las térmicas**: sobre tierra seca, a media tarde y con sol. Ver
 *   `calorDelSuelo` en `flight/turbulencia.ts`, que es la misma cuenta que
 *   sacude al avión: donde el avión nota el bache, los buitres suben sin
 *   batir un ala.
 *
 * **Y lejos de la senda de la pista.** Un aeropuerto de verdad trabaja todos
 * los días para que no haya aves donde suben y bajan los aviones, así que los
 * sitios que caen en el corredor de despegue y de llegada se descartan. La
 * única bandada que se pone ahí es la de la final, a propósito, en los
 * peldaños que la avisan. Ver `flight/aviso-de-aves.ts`.
 *
 * ## Qué hacen
 *
 * Dónde está cada ave es **una cuenta con el reloj**, no un estado que se
 * avance paso a paso: con el mismo instante sale el mismo sitio. Así no cuesta
 * nada lo que no se ve —no se calcula— y el reloj acelerado de los bancos no
 * obliga a repetir nada. Lo único que se guarda es el susto, que depende de
 * por dónde pasó el avión, y el orden de la uve, que rota.
 */

import { mulberry32 } from "./noise";
import { delante, traves } from "./rumbo";
import { separacionDeTorbellinos } from "../flight/estela";
import {
  ATRAS_EN_LA_UVE,
  RELEVO_EN_CABEZA,
  especiesDelSitio,
  type Especie,
  type Region,
} from "./aves";

const G = 9.81;

/** Una bandada puesta en el mundo. */
export interface Bandada {
  readonly id: string;
  /** El campo alrededor del que está. */
  readonly campo: string;
  readonly especie: Especie;
  readonly cuantas: number;
  /** Centro de su recorrido, m del mundo. */
  readonly x: number;
  readonly z: number;
  /**
   * El recorrido es una elipse: sus dos radios, m, y hacia dónde apunta el
   * largo, en grados de rumbo. En la térmica, el radio largo es a cuánto se
   * alejan planeando al salir de ella.
   */
  readonly radioLargo: number;
  readonly radioCorto: number;
  readonly giro: number;
  /** Altura sobre el suelo, m. En la térmica, el techo al que suben. */
  readonly altura: number;
  /** El suelo en el centro, m sobre el mar. */
  readonly suelo: number;
  /** Hacia qué lado da la vuelta: +1 como las agujas del reloj, visto desde arriba. */
  readonly sentido: 1 | -1;
  /** De 0 a 1: dónde empieza y cómo se reparten las aves. */
  readonly semilla: number;
  /** Si es la bandada de la final, puesta por el aviso. */
  readonly enFinal?: boolean;
}

/** Lo que hace falta de un ave para dibujarla en un instante. */
export interface EstadoDeAve {
  x: number;
  y: number;
  z: number;
  /** Rumbo, rad, cero al norte. */
  rumbo: number;
  /** Alabeo, rad, positivo con el ala derecha abajo. */
  alabeo: number;
  /** Cabeceo, rad, positivo con el pico arriba. */
  cabeceo: number;
  /** Batidas por segundo. */
  aleteo: number;
  /** Fase de la batida, rad. */
  fase: number;
  /** Cuánto abre cada batida, rad. Cero es planear. */
  amplitud: number;
  /** De 0 a 1: alas pegadas al cuerpo, dejándose caer. */
  pliegue: number;
}

function nuevaAve(): EstadoDeAve {
  return {
    x: 0,
    y: 0,
    z: 0,
    rumbo: 0,
    alabeo: 0,
    cabeceo: 0,
    aleteo: 0,
    fase: 0,
    amplitud: 0,
    pliegue: 0,
  };
}

/** Un número de 0 a 1 que sale siempre igual para la misma ave. */
function azar(semilla: number, i: number, k: number): number {
  const s = Math.sin(semilla * 127.1 + i * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const suave = (x: number): number => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

// ── El susto ─────────────────────────────────────────────────────────────

/**
 * **A qué distancia se asusta una bandada** del avión que se le echa encima,
 * m. Ver `Bandadas.paso`.
 */
export const DISTANCIA_DE_SUSTO = 220;

/**
 * Y a qué distancia se le pasa: el susto no se rearma con un reloj sino
 * cuando el avión se ha ido de verdad.
 */
const SE_LE_PASA = 700;

/**
 * **Cuánto cae un ave asustada**, m, como mucho.
 *
 * Es la mitad de la lección: las aves que ven venir algo grande se tiran
 * hacia abajo —«birds in flocks generally distribute themselves downward»,
 * dice el AIM de la FAA; «some birds break downwards when threatened», la
 * guía de Transport Canada—. Por eso ante un ave de frente se sube: bajando se
 * va justo a donde va ella. Aquí pliegan las alas para caer, que es como se
 * ve desde la cabina. Ver `flight/aviso-de-aves.ts`.
 */
export const CAIDA_DEL_SUSTO = 30;

/** Cuánto tiempo va plegada, s, y cuánto tarda en recuperar la altura. */
const PLEGADA = 2.2;
const RECUPERA = 12;

interface Susto {
  readonly desde: number;
  /** Hacia dónde se apartan de lado, unitario: lejos de por donde pasa el avión. */
  readonly ladoX: number;
  readonly ladoZ: number;
}

// ── La uve ───────────────────────────────────────────────────────────────

/**
 * **El corro de la térmica**: hasta dónde se abren las vueltas, m, y cuánto
 * se escalonan en altura las aves de un mismo corro, m. Un corro de buitres
 * es un puñado de aves girando a alturas parecidas, no una columna de un
 * kilómetro con una en cada piso.
 */
const RADIO_DEL_CORRO = 60;
const ALTO_DEL_CORRO = 120;

/** Cuánto bajan planeando al salir de la térmica, m por metro recorrido. */
const PLANEO_DE_SALIDA = 0.06;

/** Cuánto tardan dos aves en cambiarse el sitio en un relevo, s. */
const CAMBIO_DE_SITIO = 8;

/**
 * El orden de una uve tras `turno` relevos.
 *
 * Nadie va en el aire de la cabeza, así que la cabeza es la que más trabaja,
 * y se turnan **por parejas**: la que va delante y la que la sigue se cambian
 * el sitio. Es lo que midieron Voelkl et al. (PNAS 2015) en una uve de ibis:
 * «frequent pairwise switches of the leading position». Cada relevo le toca a
 * una pareja, empezando por la cabeza con la primera de cada brazo y siguiendo
 * brazo abajo, y así con el tiempo todas pasan por delante.
 */
export function ordenDeLaUve(
  cuantas: number,
  turno: number,
): { cabeza: number; izquierda: number[]; derecha: number[] } {
  let cabeza = 0;
  const izquierda: number[] = [];
  const derecha: number[] = [];
  for (let i = 1; i < cuantas; i++) (i % 2 ? izquierda : derecha).push(i);
  // Las parejas que se relevan, de delante a atrás: `-1` es la cabeza.
  const parejas: [number[], number, number][] = [];
  const hondo = Math.max(izquierda.length, derecha.length);
  for (let k = 0; k < hondo; k++)
    for (const brazo of [izquierda, derecha])
      if (k < brazo.length) parejas.push([brazo, k - 1, k]);
  if (!parejas.length) return { cabeza, izquierda, derecha };
  for (let n = 0; n < turno; n++) {
    const [brazo, delante, detras] = parejas[n % parejas.length]!;
    const atras = brazo[detras]!;
    if (delante < 0) {
      brazo[detras] = cabeza;
      cabeza = atras;
    } else {
      brazo[detras] = brazo[delante]!;
      brazo[delante] = atras;
    }
  }
  return { cabeza, izquierda, derecha };
}

/**
 * **El sitio de cada ave en la uve**, en metros hacia atrás y hacia la
 * derecha de la cabeza.
 *
 * De lado, la separación de los torbellinos de un ala, `π/4` de la
 * envergadura —ver `separacionDeTorbellinos` en `flight/estela.ts`—: con eso
 * el torbellino de dentro de cada ave cae sobre el de fuera de la de delante y
 * su ala va entera en el aire que sube. Es la misma cuenta que dice por dónde
 * no hay que meter un avión detrás de otro. Hacia atrás, lo que dice
 * `ATRAS_EN_LA_UVE`.
 */
export function sitiosEnLaUve(
  cuantas: number,
  turno: number,
  envergadura: number,
): { atras: number; lado: number }[] {
  const { cabeza, izquierda, derecha } = ordenDeLaUve(cuantas, turno);
  const deLado = separacionDeTorbellinos(envergadura);
  const atras = ATRAS_EN_LA_UVE * envergadura;
  const sitios: { atras: number; lado: number }[] = new Array(cuantas);
  sitios[cabeza] = { atras: 0, lado: 0 };
  izquierda.forEach((i, k) => {
    sitios[i] = { atras: (k + 1) * atras, lado: -(k + 1) * deLado };
  });
  derecha.forEach((i, k) => {
    sitios[i] = { atras: (k + 1) * atras, lado: (k + 1) * deLado };
  });
  return sitios;
}

// ── Las bandadas vivas ──────────────────────────────────────────────────

export class Bandadas {
  private vivas: Bandada[] = [];
  private readonly sustos = new Map<string, Susto>();
  /** El orden de cada uve, guardado por turno: no se rehace cada cuadro. */
  private readonly uves = new Map<
    string,
    { turno: number; ahora: { atras: number; lado: number }[]; antes: { atras: number; lado: number }[] }
  >();

  constructor(private readonly suelo: (x: number, z: number) => number) {}

  get lista(): readonly Bandada[] {
    return this.vivas;
  }

  poner(nuevas: readonly Bandada[]): void {
    const ya = new Set(this.vivas.map((b) => b.id));
    for (const b of nuevas) if (!ya.has(b.id)) this.vivas.push(b);
  }

  quitar(quien: (b: Bandada) => boolean): void {
    this.vivas = this.vivas.filter((b) => {
      if (!quien(b)) return true;
      this.sustos.delete(b.id);
      this.uves.delete(b.id);
      return false;
    });
  }

  vaciar(): void {
    this.vivas = [];
    this.sustos.clear();
    this.uves.clear();
  }

  /** Si esta bandada está asustada ahora mismo, y desde cuándo. */
  sustoDe(id: string): number | null {
    return this.sustos.get(id)?.desde ?? null;
  }

  /**
   * **El avión pasa**: la bandada a la que se echa encima se asusta.
   *
   * Una vez por pasada. Se rearma cuando el avión se ha alejado de verdad
   * —`SE_LE_PASA`—, no cuando pasa un rato: lo que asusta es que venga algo,
   * no el reloj.
   */
  paso(t: number, avion: { x: number; y: number; z: number }): void {
    for (const b of this.vivas) {
      const d = this.dondeEsta(b, t);
      const lejos = Math.hypot(d.x - avion.x, d.y - avion.y, d.z - avion.z);
      const ya = this.sustos.get(b.id);
      if (ya) {
        if (lejos - d.radio > SE_LE_PASA) this.sustos.delete(b.id);
        continue;
      }
      if (lejos - d.radio > DISTANCIA_DE_SUSTO) continue;
      const dx = d.x - avion.x;
      const dz = d.z - avion.z;
      const n = Math.hypot(dx, dz) || 1;
      this.sustos.set(b.id, { desde: t, ladoX: dx / n, ladoZ: dz / n });
    }
  }

  /**
   * Dónde está la bandada entera y cuánto ocupa, para descartarla sin mirar
   * ave por ave si no se ve.
   */
  dondeEsta(
    b: Bandada,
    t: number,
  ): { x: number; y: number; z: number; radio: number } {
    const e = b.especie;
    if (e.forma === "termica") {
      const g = this.corro(b, t);
      return { x: g.x, y: g.y, z: g.z, radio: RADIO_DEL_CORRO + ALTO_DEL_CORRO };
    }
    if (e.forma === "cernido" || e.forma === "cetreria")
      return { x: b.x, y: b.suelo + b.altura, z: b.z, radio: b.radioLargo + 20 };
    const a = this.ancla(b, t);
    const extension =
      e.forma === "uve"
        ? (b.cuantas / 2 + 1) * ATRAS_EN_LA_UVE * e.envergadura +
          (b.cuantas / 2) * separacionDeTorbellinos(e.envergadura)
        : this.anchoDeLaNube(b) * 1.6;
    return { x: a.x, y: a.y, z: a.z, radio: extension + CAIDA_DEL_SUSTO };
  }

  /** El radio de una bandada suelta, m. */
  private anchoDeLaNube(b: Bandada): number {
    const e = b.especie;
    return e.separacion * e.envergadura * Math.sqrt(b.cuantas);
  }

  /**
   * El punto que lleva la bandada, en su elipse: dónde, hacia dónde y
   * cuánto se inclina al girar.
   */
  private ancla(
    b: Bandada,
    t: number,
  ): { x: number; y: number; z: number; rumbo: number; alabeo: number } {
    const e = b.especie;
    const medio = (b.radioLargo + b.radioCorto) / 2;
    const w = (e.velocidad / Math.max(1, medio)) * b.sentido;
    const [ux, uz] = delante(b.giro);
    const [vx, vz] = traves(b.giro);
    const donde = (tt: number): [number, number, number, number] => {
      const th = b.semilla * Math.PI * 2 + w * tt;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const x = b.x + ux * b.radioLargo * c + vx * b.radioCorto * s;
      const z = b.z + uz * b.radioLargo * c + vz * b.radioCorto * s;
      const dx = (-ux * b.radioLargo * s + vx * b.radioCorto * c) * Math.sign(w);
      const dz = (-uz * b.radioLargo * s + vz * b.radioCorto * c) * Math.sign(w);
      return [x, z, dx, dz];
    };
    const [x, z, dx, dz] = donde(t);
    const [, , dx2, dz2] = donde(t + 1);
    const rumbo = Math.atan2(dx, -dz);
    let giro = Math.atan2(dx2, -dz2) - rumbo;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    const alabeo = Math.atan((e.velocidad * giro) / G);
    const y = this.suelo(x, z) + b.altura;
    return { x, y, z, rumbo, alabeo };
  }

  /**
   * **Cada ave de la bandada en el instante `t`**, en `salida`. Devuelve
   * cuántas.
   */
  aves(b: Bandada, t: number, salida: EstadoDeAve[]): number {
    while (salida.length < b.cuantas) salida.push(nuevaAve());
    switch (b.especie.forma) {
      case "uve":
        this.enUve(b, t, salida);
        break;
      case "termica":
        this.enLaTermica(b, t, salida);
        break;
      case "cernido":
        this.cerniendose(b, t, salida);
        break;
      case "cetreria":
        this.conSuCetrero(b, t, salida);
        break;
      default:
        this.enNube(b, t, salida);
    }
    const susto = this.sustos.get(b.id);
    if (susto) this.asustadas(b, t, susto, salida);
    // Nunca por debajo del suelo que tienen debajo.
    for (let i = 0; i < b.cuantas; i++) {
      const a = salida[i]!;
      const suelo = this.suelo(a.x, a.z) + 1.5;
      if (a.y < suelo) a.y = suelo;
    }
    return b.cuantas;
  }

  /**
   * Si bate o planea ahora mismo. Las que planean mucho —las cigüeñas, las
   * gaviotas— alternan: unas batidas, un planeo. `planeo` es la parte del
   * tiempo que va con las alas quietas.
   */
  private bate(b: Bandada, i: number, t: number): number {
    const e = b.especie;
    if (e.planeo <= 0) return 1;
    if (e.planeo >= 1) return 0;
    const ritmo = 0.12 + 0.1 * azar(b.semilla, i, 7);
    const onda = Math.sin(t * ritmo * Math.PI * 2 + azar(b.semilla, i, 8) * 6.28);
    return suave((onda + 1 - 2 * e.planeo) * 3);
  }

  private enUve(b: Bandada, t: number, salida: EstadoDeAve[]): void {
    const e = b.especie;
    const a = this.ancla(b, t);
    const turno = Math.floor(Math.max(0, t) / RELEVO_EN_CABEZA);
    let orden = this.uves.get(b.id);
    if (!orden || orden.turno !== turno) {
      orden = {
        turno,
        ahora: sitiosEnLaUve(b.cuantas, turno, e.envergadura),
        antes: sitiosEnLaUve(b.cuantas, Math.max(0, turno - 1), e.envergadura),
      };
      this.uves.set(b.id, orden);
    }
    const cambio = suave((t - turno * RELEVO_EN_CABEZA) / CAMBIO_DE_SITIO);
    const [fx, fz] = [Math.sin(a.rumbo), -Math.cos(a.rumbo)];
    const [rx, rz] = [Math.cos(a.rumbo), Math.sin(a.rumbo)];
    for (let i = 0; i < b.cuantas; i++) {
      const p = orden.ahora[i]!;
      const q = orden.antes[i]!;
      const atras = q.atras + (p.atras - q.atras) * cambio;
      const lado = q.lado + (p.lado - q.lado) * cambio;
      const s = salida[i]!;
      s.x = a.x - fx * atras + rx * lado;
      s.z = a.z - fz * atras + rz * lado;
      s.y = a.y + 0.3 * Math.sin(t * 0.7 + i);
      s.rumbo = a.rumbo;
      s.alabeo = a.alabeo;
      s.cabeceo = 0;
      s.aleteo = e.aleteo;
      /*
       * **Y baten donde batió la de delante.** Cada ave mueve las alas con el
       * retraso de lo que tarda en llegar al sitio por donde pasó la cabeza,
       * así que todas suben el ala en el mismo punto del aire: es lo que
       * encontraron midiendo una uve de verdad, y es lo que la hace seguir la
       * corriente que sube en vez de pelearse con ella. Ver `aves.ts`.
       */
      s.fase = -2 * Math.PI * e.aleteo * (atras / e.velocidad);
      s.amplitud = e.amplitud * this.bate(b, 0, t);
      s.pliegue = 0;
    }
  }

  private enNube(b: Bandada, t: number, salida: EstadoDeAve[]): void {
    const e = b.especie;
    const a = this.ancla(b, t);
    const ancho = this.anchoDeLaNube(b);
    const [fx, fz] = [Math.sin(a.rumbo), -Math.cos(a.rumbo)];
    const [rx, rz] = [Math.cos(a.rumbo), Math.sin(a.rumbo)];
    const rasante = e.forma === "rasante";
    for (let i = 0; i < b.cuantas; i++) {
      const r = ancho * Math.sqrt(azar(b.semilla, i, 1));
      const ang = azar(b.semilla, i, 2) * Math.PI * 2;
      const w1 = 0.05 + 0.08 * azar(b.semilla, i, 3);
      const p1 = azar(b.semilla, i, 4) * 6.28;
      const adelante = r * Math.cos(ang) + 0.3 * ancho * Math.sin(t * w1 + p1);
      let lado = r * Math.sin(ang) + 0.3 * ancho * Math.cos(t * w1 * 1.3 + p1);
      let arriba = 0.15 * ancho * Math.sin(t * w1 * 0.7 + p1 * 2);
      const s = salida[i]!;
      s.rumbo = a.rumbo + 0.08 * Math.sin(t * w1 * 2 + p1);
      s.alabeo = a.alabeo;
      s.cabeceo = 0;
      if (rasante) {
        /*
         * **La pardela no bate: rema con el viento.** Va en arcos, subiendo
         * un par de metros de cara al viento y bajando de lado hasta rozar la
         * ola, con el ala casi vertical en cada vuelta. Es el vuelo dinámico
         * de las aves de mar, y desde un avión se ve como un zigzag pegado al
         * agua.
         */
        const w = 0.45 + 0.2 * azar(b.semilla, i, 5);
        const fase = t * w + p1;
        lado += 14 * Math.sin(fase);
        arriba = 1 + 5 * Math.sin(fase) ** 2 - b.altura;
        s.alabeo = 0.9 * Math.cos(fase);
      }
      s.x = a.x + fx * adelante + rx * lado;
      s.z = a.z + fz * adelante + rz * lado;
      s.y = a.y + arriba;
      s.aleteo = e.aleteo * (0.9 + 0.2 * azar(b.semilla, i, 6));
      s.fase = p1 * 3;
      s.amplitud = e.amplitud * this.bate(b, i, t);
      s.pliegue = 0;
    }
  }

  /**
   * **Dónde va el corro entero** en el instante `t`: llegando, subiendo en la
   * térmica o saliendo hacia la siguiente, y a qué altura.
   *
   * Van **juntos**, que es lo que es un corro: entran en la térmica casi a la
   * vez, suben dando vueltas cada uno en la suya y a alturas parecidas, y al
   * llegar arriba salen planeando hacia la siguiente en la misma dirección.
   * Por abajo, el corro siguiente entra por el otro lado. Así se ve dónde sube
   * el aire: hay un puñado de aves girando ahí.
   */
  private corro(
    b: Bandada,
    t: number,
  ): { fase: "llega" | "sube" | "sale"; dentro: number; x: number; y: number; z: number } {
    const e = b.especie;
    const abajo = b.suelo + e.alturas[0];
    const arriba = b.suelo + b.altura;
    const tSubida = Math.max(1, arriba - abajo) / e.trepa;
    const tPlaneo = b.radioLargo / e.velocidad;
    const ciclo = tSubida + 2 * tPlaneo;
    const tau = (((t + b.semilla * ciclo) % ciclo) + ciclo) % ciclo;
    const [fx, fz] = delante(b.giro);
    if (tau < tPlaneo) {
      const falta = (tPlaneo - tau) * e.velocidad;
      return { fase: "llega", dentro: tau, x: b.x - fx * falta, y: abajo, z: b.z - fz * falta };
    }
    if (tau < tPlaneo + tSubida) {
      const dentro = tau - tPlaneo;
      return { fase: "sube", dentro, x: b.x, y: abajo + dentro * e.trepa, z: b.z };
    }
    const fuera = (tau - tPlaneo - tSubida) * e.velocidad;
    return {
      fase: "sale",
      dentro: tau - tPlaneo - tSubida,
      x: b.x + fx * fuera,
      y: arriba - fuera * PLANEO_DE_SALIDA,
      z: b.z + fz * fuera,
    };
  }

  /**
   * **La térmica**: suben en corro sin batir un ala, cada una en su vuelta y
   * a su altura dentro del corro. Ver `corro`.
   */
  private enLaTermica(b: Bandada, t: number, salida: EstadoDeAve[]): void {
    const e = b.especie;
    const g = this.corro(b, t);
    const abajo = b.suelo + e.alturas[0];
    const arriba = b.suelo + b.altura;
    const [fx, fz] = delante(b.giro);
    const [tx, tz] = traves(b.giro);
    for (let i = 0; i < b.cuantas; i++) {
      const s = salida[i]!;
      const radio = 25 + (RADIO_DEL_CORRO - 25) * azar(b.semilla, i, 1);
      const w = (e.velocidad / radio) * b.sentido;
      const phi0 = azar(b.semilla, i, 2) * Math.PI * 2;
      // Cada una a su altura dentro del corro, y en la suya al llegar y al irse.
      const escalon = (azar(b.semilla, i, 3) - 0.5) * ALTO_DEL_CORRO;
      const deLado = (azar(b.semilla, i, 4) - 0.5) * 2 * RADIO_DEL_CORRO;
      const enElCorro = (tt: number): [number, number, number] => {
        const phi = phi0 + w * tt;
        return [
          b.x + radio * Math.sin(phi),
          b.z - radio * Math.cos(phi),
          phi + (Math.PI / 2) * b.sentido,
        ];
      };
      if (g.fase === "sube") {
        const [x, z, rumbo] = enElCorro(g.dentro);
        s.x = x;
        s.z = z;
        s.y = Math.min(arriba, Math.max(abajo, g.y + escalon));
        s.rumbo = rumbo;
        s.alabeo = Math.atan((e.velocidad * w) / G);
      } else {
        const atras = (azar(b.semilla, i, 5) - 0.5) * 2 * RADIO_DEL_CORRO;
        s.x = g.x + tx * deLado + fx * atras;
        s.z = g.z + tz * deLado + fz * atras;
        s.y = Math.min(arriba, g.y + escalon * 0.3);
        s.rumbo = (b.giro * Math.PI) / 180;
        s.alabeo = 0;
      }
      s.cabeceo = 0;
      s.aleteo = e.aleteo;
      s.fase = phi0;
      s.amplitud = e.amplitud * this.bate(b, i, t);
      s.pliegue = 0;
    }
  }

  /**
   * **El cernícalo cerniéndose**: quieto en el aire, de cara al viento,
   * batiendo deprisa y mirando abajo. Cada rato se cambia de sitio.
   */
  private cerniendose(b: Bandada, t: number, salida: EstadoDeAve[]): void {
    const e = b.especie;
    const quieto = 18;
    const cambia = 6;
    const vuelta = quieto + cambia;
    const k = Math.floor(t / vuelta);
    const dentro = t - k * vuelta;
    const sitio = (n: number): [number, number] => {
      const ang = azar(b.semilla, n, 1) * Math.PI * 2;
      const r = b.radioLargo * Math.sqrt(azar(b.semilla, n, 2));
      return [b.x + r * Math.sin(ang), b.z - r * Math.cos(ang)];
    };
    const [x0, z0] = sitio(k);
    const [x1, z1] = sitio(k + 1);
    const s = salida[0]!;
    const yendo = dentro > quieto ? suave((dentro - quieto) / cambia) : 0;
    s.x = x0 + (x1 - x0) * yendo;
    s.z = z0 + (z1 - z0) * yendo;
    s.y = b.suelo + b.altura + 0.4 * Math.sin(t * 1.3);
    s.rumbo =
      dentro > quieto
        ? Math.atan2(x1 - x0, -(z1 - z0))
        : (b.giro * Math.PI) / 180;
    s.alabeo = 0;
    s.cabeceo = dentro > quieto ? 0 : 0.35;
    s.aleteo = e.aleteo;
    s.fase = 0;
    s.amplitud = dentro > quieto ? e.amplitud * 0.4 : e.amplitud;
    s.pliegue = 0;
    for (let i = 1; i < b.cuantas; i++) Object.assign(salida[i]!, s);
  }

  /**
   * **El halcón del cetrero**: vueltas bajas alrededor de quien lo vuela, que
   * es lo que espanta a las demás aves del campo. Ver
   * `fauna-del-aeropuerto.ts`.
   */
  private conSuCetrero(b: Bandada, t: number, salida: EstadoDeAve[]): void {
    const e = b.especie;
    const s = salida[0]!;
    const w = (e.velocidad / b.radioLargo) * b.sentido;
    const phi = b.semilla * 6.28 + w * t;
    const r = b.radioLargo * (0.75 + 0.25 * Math.sin(t * 0.21));
    s.x = b.x + r * Math.sin(phi);
    s.z = b.z - r * Math.cos(phi);
    s.y = b.suelo + b.altura * (0.6 + 0.4 * Math.sin(t * 0.37));
    s.rumbo = phi + (Math.PI / 2) * b.sentido;
    s.alabeo = Math.atan((e.velocidad * w) / G);
    s.cabeceo = 0;
    s.aleteo = e.aleteo;
    s.fase = 0;
    s.amplitud = e.amplitud * this.bate(b, 0, t);
    s.pliegue = 0;
  }

  /**
   * **Asustadas**: pliegan las alas y se dejan caer, y se abren de lado lejos
   * de por donde viene el avión. Después recuperan la altura despacio.
   */
  private asustadas(
    b: Bandada,
    t: number,
    susto: Susto,
    salida: EstadoDeAve[],
  ): void {
    const tau = t - susto.desde;
    if (tau < 0) return;
    const cae =
      tau < 4
        ? 1 - Math.exp(-tau / 0.9)
        : (1 - Math.exp(-4 / 0.9)) * Math.exp(-(tau - 4) / RECUPERA);
    const abre = 1 - Math.exp(-tau / 1.5);
    for (let i = 0; i < b.cuantas; i++) {
      const s = salida[i]!;
      const cuanto = CAIDA_DEL_SUSTO * (0.5 + 0.5 * azar(b.semilla, i, 9));
      const deLado = 8 + 14 * azar(b.semilla, i, 10);
      const signo = azar(b.semilla, i, 11) < 0.5 ? -1 : 1;
      s.y -= cuanto * cae;
      s.x += (susto.ladoX + signo * 0.6 * susto.ladoZ) * deLado * abre;
      s.z += (susto.ladoZ - signo * 0.6 * susto.ladoX) * deLado * abre;
      if (tau < PLEGADA) {
        s.pliegue = 1;
        s.amplitud = 0;
        s.cabeceo = -0.6;
      } else if (tau < PLEGADA + 1) {
        s.pliegue = 1 - (tau - PLEGADA);
        s.cabeceo = -0.6 * s.pliegue;
      }
    }
  }
}

// ── Dónde se ponen ───────────────────────────────────────────────────────

/** Lo que hace falta saber de un campo para poblarlo. */
export interface CampoConAves {
  readonly id: string;
  /** El escenario: algunas especies viven solo en algunas islas. */
  readonly escenario: string;
  readonly region: Region;
  /** Centro de la pista, m del mundo, su rumbo en grados y su largo. */
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
  readonly largo: number;
}

/** Lo que hay alrededor. */
export interface Entorno {
  suelo(x: number, z: number): number;
  esAgua(x: number, z: number): boolean;
  /** Si en ese punto hay asfalto, edificios o algo del aeródromo. */
  ocupado?(x: number, z: number): boolean;
  /** Cuánto calienta el suelo al empezar, de 0 a 1. Ver `calorDelSuelo`. */
  readonly calor: number;
  /** Hasta dónde llega la térmica, m sobre el suelo. Ver `capaDeMezcla`. */
  readonly capa: number;
  /** El mes, de 1 a 12. */
  readonly mes: number;
}

/**
 * **El corredor de la pista**: por dónde suben y bajan los aviones. Aquí no se
 * pone ninguna bandada de paisaje. Metros de lado desde el eje y de largo
 * desde el centro de la pista.
 */
export const CORREDOR = { lado: 1000, largo: 9000 };

/** Entre qué distancias de la pista se buscan sitios, m. */
const DESDE = 1200;
const HASTA = 9000;

/** Qué es cada sitio sorteado. */
type Clase = "orilla" | "mar" | "campo" | "seco";

function clasificar(
  x: number,
  z: number,
  entorno: Entorno,
): Clase | null {
  const agua = entorno.esAgua(x, z);
  const alrededor = (r: number): number => {
    let tierra = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      if (!entorno.esAgua(x + r * Math.sin(a), z - r * Math.cos(a))) tierra++;
    }
    return tierra;
  };
  if (agua) {
    if (alrededor(300) > 0) return "orilla";
    if (alrededor(800) === 0 && alrededor(1500) === 0) return "mar";
    return null;
  }
  if (entorno.ocupado?.(x, z)) return null;
  const h = entorno.suelo(x, z);
  const pendiente =
    Math.hypot(entorno.suelo(x + 40, z) - h, entorno.suelo(x, z + 40) - h) / 40;
  if (alrededor(400) < 8) return "orilla";
  if (pendiente < 0.12) return "campo";
  return "seco";
}

/** Si un punto cae en el corredor de la pista. */
export function enElCorredor(campo: CampoConAves, x: number, z: number): boolean {
  const [fx, fz] = delante(campo.rumbo);
  const [tx, tz] = traves(campo.rumbo);
  const dx = x - campo.x;
  const dz = z - campo.z;
  const along = dx * fx + dz * fz;
  const across = dx * tx + dz * tz;
  return Math.abs(across) < CORREDOR.lado && Math.abs(along) < CORREDOR.largo;
}

/**
 * **Las bandadas de un campo**: qué especies hay allí, en qué sitios y a qué
 * altura. Sale siempre igual para el mismo campo, el mismo mes y el mismo
 * calor.
 */
export function bandadasDelCampo(
  campo: CampoConAves,
  entorno: Entorno,
): Bandada[] {
  const especies = especiesDelSitio(campo.region, campo.escenario, entorno.mes);
  if (!especies.length) return [];
  let semilla = 0;
  for (const c of campo.id) semilla = (semilla * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = mulberry32(semilla || 1);

  const sitios: Record<Clase, [number, number][]> = {
    orilla: [],
    mar: [],
    campo: [],
    seco: [],
  };
  for (let k = 0; k < 700; k++) {
    const r = Math.sqrt(DESDE ** 2 + rnd() * (HASTA ** 2 - DESDE ** 2));
    const a = rnd() * Math.PI * 2;
    const x = campo.x + r * Math.sin(a);
    const z = campo.z - r * Math.cos(a);
    if (enElCorredor(campo, x, z)) continue;
    const clase = clasificar(x, z, entorno);
    if (clase) sitios[clase].push([x, z]);
  }

  const puestas: Bandada[] = [];
  const cogidos: [number, number][] = [];
  const libre = (x: number, z: number): boolean =>
    cogidos.every(([a, b]) => Math.hypot(a - x, b - z) > 900);
  for (const e of especies) {
    for (let n = 0; n < e.bandadas; n++) {
      const deAqui =
        e.habitat === "agua"
          ? sitios.orilla
          : e.habitat === "mar"
            ? sitios.mar
            : e.habitat === "termica"
              ? [...sitios.seco, ...sitios.campo]
              : sitios.campo;
      const candidatos = deAqui.filter(([x, z]) => libre(x, z));
      if (!candidatos.length) break;
      const [x, z] = candidatos[Math.floor(rnd() * candidatos.length)]!;
      const b = unaBandada(campo, e, x, z, entorno, rnd, puestas.length);
      if (!b) continue;
      cogidos.push([x, z]);
      puestas.push(b);
    }
  }
  return puestas;
}

function unaBandada(
  campo: CampoConAves,
  e: Especie,
  x: number,
  z: number,
  entorno: Entorno,
  rnd: () => number,
  n: number,
): Bandada | null {
  const [pocas, muchas] = e.grupo;
  const cuantas = Math.round(pocas + (muchas - pocas) * rnd());
  const [baja, alta] = e.alturas;
  let altura = baja + (alta - baja) * rnd() ** 2;
  if (e.forma === "termica") {
    /*
     * **Hasta donde llega la térmica**, y no más: por encima de la capa que
     * mezcla el calor el aire vuelve a estar quieto y ahí no sube nadie. Sin
     * térmica —de mañana, de noche, con el cielo tapado— no hay corro.
     */
    const techo = Math.min(alta, 0.8 * entorno.capa);
    if (entorno.calor < 0.25 || techo < baja + 120) return null;
    altura = techo;
  }
  const suelo = e.habitat === "mar" ? Math.max(0, entorno.suelo(x, z)) : entorno.suelo(x, z);
  const [largo, corto] = e.recorrido;
  const radioLargo = largo * (0.6 + 0.4 * rnd());
  const radioCorto = Math.min(radioLargo, corto * (0.6 + 0.4 * rnd()));
  const giro = rnd() * 360;
  if (e.habitat === "mar") {
    // Que toda la vuelta quede sobre el agua.
    const [ux, uz] = delante(giro);
    const [vx, vz] = traves(giro);
    for (let k = 0; k < 12; k++) {
      const th = (k / 12) * Math.PI * 2;
      const px = x + ux * radioLargo * Math.cos(th) + vx * radioCorto * Math.sin(th);
      const pz = z + uz * radioLargo * Math.cos(th) + vz * radioCorto * Math.sin(th);
      if (!entorno.esAgua(px, pz)) return null;
    }
  }
  return {
    id: `${campo.id}:${e.id}:${n}`,
    campo: campo.id,
    especie: e,
    cuantas: e.forma === "cernido" || e.forma === "cetreria" ? 1 : Math.max(1, cuantas),
    x,
    z,
    radioLargo,
    radioCorto,
    giro,
    altura,
    suelo,
    sentido: rnd() < 0.5 ? 1 : -1,
    semilla: rnd(),
  };
}
