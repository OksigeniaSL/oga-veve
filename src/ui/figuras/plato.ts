/**
 * **El plato oscilante por dentro**: cómo se vuela un helicóptero. Arriba, la
 * cabeza del rotor del Super Puma girando a cámara lenta, con sus servos, el
 * plato fijo, el plato que gira, las varillas de paso y las palas cortadas para
 * que su sección enseñe el paso; abajo, el colectivo, el cíclico y los pedales
 * para tocar; y al lado, el Super Puma volando, que sube, avanza o gira el
 * morro con lo que se toque.
 *
 * El colectivo se queda donde se deja, como el de verdad, que tiene freno; el
 * cíclico y los pedales vuelven al centro al soltarlos.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * Del *Helicopter Flying Handbook* de la FAA (FAA-H-8083-21B), capítulo 4,
 * «Swash Plate Assembly», y su figura 4-11:
 *
 * - **El plato fijo** va unido a los mandos por varillas y no gira, pero sube
 *   y se inclina; su tijera no lo deja girar.
 * - **El plato que gira** va encima, arrastrado por el mástil con su propia
 *   tijera. Los dos suben, bajan y se inclinan juntos.
 * - **De cada brazo del plato que gira sube una varilla de paso** que tira del
 *   cuerno de su pala.
 * - **El cuarto de vuelta** (capítulos 2 y 3, «Gyroscopic Precession»): la
 *   pala sube un cuarto de vuelta después de que le den más paso. En la figura
 *   la mitad la pone el cuerno, 45° por delante de la pala, y la otra mitad el
 *   plato, que se inclina un poco de lado respecto al cíclico.
 *
 * Las cifras son las del modelo de vuelo, `flight/super-puma.ts`: el paso
 * colectivo de 9,5° a 26° en la raíz, el cíclico de ±10° adelante y atrás y de
 * ±7° a los lados, la torsión de −8° y el giro en el sentido de las agujas del
 * reloj visto desde arriba, que es por qué con potencia el morro se va a la
 * izquierda y se pisa el pedal derecho. **El paso que se lee es el del 75 % del
 * radio**, que es el que dan los manuales: el de la raíz menos seis grados de
 * torsión. Lo supuesto —el aleteo, la conicidad, el estacionario con el
 * colectivo a 0,55 y las medidas de la cabeza, a ojo de la foto de un Cougar—
 * está en el LEEME de la entrega y en `CREDITOS.md`.
 *
 * Por eso esta figura va **solo en la tarjeta del Super Puma**: es su cabeza,
 * con sus cuatro palas y sus cifras. Ver `figuras/montar.ts`.
 */

import {
  CABEZA,
  CABINA,
  DIBUJO,
  LUZ,
  PROYECCION_DE_LA_CABEZA,
  PROYECCION_DEL_PUMA,
  PUMA,
} from "./plato-dibujo";
import {
  Bucle,
  enElDibujo,
  hacerMando,
  isometrica,
  pieza,
  quieto,
  rellenar,
  type Edad,
  type Figura,
  type Proyeccion,
} from "./figura";
import "./plato.css";

/** Las palabras del dibujo, la frase de Tukã, las cifras de Taguato y lo que oye el lector. */
export interface TextosDelPlato {
  readonly dibujo: Readonly<
    Record<
      | "plato"
      | "platoFijo"
      | "servo"
      | "platoQueGira"
      | "varilla"
      | "pala"
      | "ciclico"
      | "colectivo"
      | "pedales"
      | "camaraLenta"
      | "aria",
      string
    >
  >;
  /** La frase de Tukã con lo que hace el helicóptero. */
  readonly quieto: string;
  readonly sube: string;
  readonly baja: string;
  readonly adelante: string;
  readonly atras: string;
  readonly derecha: string;
  readonly izquierda: string;
  readonly narizDer: string;
  readonly narizIzq: string;
  /** El par lo gira solo: hacia la izquierda con más potencia, a la derecha con menos. */
  readonly par: string;
  readonly parIzq: string;
  /** Los nombres de los cuatro deslizadores. */
  readonly colectivo: string;
  readonly ciclicoAdelante: string;
  readonly ciclicoLado: string;
  readonly pedales: string;
  /** El paso en el 75 % del radio, en grados: uno solo, o de cuánto a cuánto en la vuelta. */
  readonly paso: (de: number, a: number) => string;
  /** Hacia dónde mira la nariz, en grados: positivo a la derecha. */
  readonly nariz: (grados: number) => string;
  /** Lo que oye el lector de pantalla de cada mando. */
  readonly vColectivo: (porciento: number, paso: number) => string;
  readonly vAdelante: (v: number) => string;
  readonly vLado: (v: number) => string;
  readonly vPedales: (v: number) => string;
}

export interface OpcionesDelPlato {
  readonly edad: Edad;
  readonly textos: TextosDelPlato;
}

/** Lo que se le puede pedir desde fuera: para el banco y para enseñarla quieta. */
export interface FiguraDelPlato extends Figura {
  /** Deja los mandos puestos: colectivo de 0 a 1; cíclico y pedales de −1 a 1; el giro, en grados. */
  mover(m: { colectivo?: number; adelante?: number; lado?: number; pedales?: number; giro?: number }): void;
  /** El cíclico y los pedales, al centro. El colectivo se queda. */
  soltar(): void;
  /** El Super Puma de al lado, recto y a media altura. */
  enderezar(): void;
}

type V = readonly [number, number, number];
const mas = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const menos = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const por = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const punto = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unidad = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const v3 = (a: readonly number[]): V => [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0];
/** Gira `v` alrededor del eje unitario `eje`, por la mano derecha. */
function girarSobre(v: V, eje: V, a: number): V {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = punto(v, eje);
  const cr = cruz(eje, v);
  return [
    v[0] * c + cr[0] * s + eje[0] * d * (1 - c),
    v[1] * c + cr[1] * s + eje[1] * d * (1 - c),
    v[2] * c + cr[2] * s + eje[2] * d * (1 - c),
  ];
}
const GRADO = Math.PI / 180;
const limitar = (v: number, a = -1, b = 1): number => Math.max(a, Math.min(b, v));

const proyeccionDe = (q: { o: readonly number[]; sa: number; ca: number; se: number; ce: number; k: number }): Proyeccion => ({
  ...q,
  o: [q.o[0] ?? 0, q.o[1] ?? 0],
});
const QH = proyeccionDe(PROYECCION_DE_LA_CABEZA);
const isoH = isometrica(QH);
/** Hacia dónde mira quien ve el dibujo: lo de delante se pinta encima. */
const vistaDe = (q: Proyeccion): V => [q.ca * q.ce, q.sa * q.ce, q.se];
const VISTA_H = vistaDe(QH);
const L = v3(LUZ);

/** Cuánto se baja o sube cada rótulo respecto a su pieza, en unidades del dibujo. */
const DY: Readonly<Record<Llamada, number>> = { plate: -6, splate: -6, servo: 26, rplate: 4, rod: -10, cut: -14 };
type Llamada = "plate" | "splate" | "rplate" | "rod" | "servo" | "cut";
const LLAMADAS: readonly Llamada[] = ["plate", "splate", "rplate", "rod", "servo", "cut"];
const { CY, CO, PD, BB } = CABINA;

/** Una cara de la cabeza, en metros, con su material y la normal hacia fuera. */
interface Cara {
  readonly p: readonly V[];
  readonly m: string;
  readonly n: V;
  readonly c: V;
}
interface Pala {
  readonly corte: V;
}
interface Mandos {
  /** El giro del rotor, en grados. */
  readonly psi: number;
  readonly c: number;
  readonly sx: number;
  readonly sy: number;
}

/**
 * **La cabeza del rotor con estos mandos, en caras.** Lo que hace cada mando:
 * el colectivo sube los dos platos y da a las cuatro palas el mismo paso; el
 * cíclico los inclina, y cada pala, al pasar, toma más paso por un lado y menos
 * por el otro.
 */
function carasDeLaCabeza(st: Mandos) {
  const H = CABEZA;
  const F: Cara[] = [];
  // Una cara, con la normal vuelta hacia `fuera` si se da: así se sabe cuál se ve.
  const cara = (p: readonly V[], m: string, fuera?: V): void => {
    const c = por(p.reduce<V>((a, q) => mas(a, q), [0, 0, 0]), 1 / p.length);
    let n = unidad(cruz(menos(p[1]!, p[0]!), menos(p[2]!, p[0]!)));
    if (fuera && punto(n, fuera) < 0) n = por(n, -1);
    F.push({ p, m, n, c });
  };
  // Un prisma a lo largo de `u`, con la sección en pares [v, w], de s0 a s1.
  const prisma = (o: V, u: V, v: V, w: V, sec: readonly (readonly [number, number])[], s0: number, s1: number, m: string, tapas = true): void => {
    const en = (s: number, q: readonly [number, number]): V => mas(mas(mas(o, por(u, s)), por(v, q[0])), por(w, q[1]));
    const n = sec.length;
    const medio = sec.reduce<[number, number]>((a, q) => [a[0] + q[0] / n, a[1] + q[1] / n], [0, 0]);
    for (let i = 0; i < n; i++) {
      const a = sec[i]!;
      const b = sec[(i + 1) % n]!;
      const fuera = mas(por(v, (a[0] + b[0]) / 2 - medio[0]), por(w, (a[1] + b[1]) / 2 - medio[1]));
      cara([en(s0, a), en(s0, b), en(s1, b), en(s1, a)], m, fuera);
    }
    if (tapas) {
      cara(sec.map((q) => en(s1, q)), `${m}-cap`, u);
      cara([...sec].reverse().map((q) => en(s0, q)), m, por(u, -1));
    }
  };
  const aro = (r: number, k: number, fase = 0): [number, number][] =>
    Array.from({ length: k }, (_, i) => {
      const t = (i / k) * 2 * Math.PI + fase;
      return [r * Math.cos(t), r * Math.sin(t)];
    });
  const X: V = [1, 0, 0];
  const Z: V = [0, 0, 1];
  // Un cilindro entre dos puntos.
  const barra = (a: V, b: V, r: number, m: string, k = 8): void => {
    const u = unidad(menos(b, a));
    const v = unidad(Math.abs(u[2]) < 0.9 ? cruz(u, Z) : cruz(u, X));
    const w = cruz(u, v);
    const d = menos(b, a);
    prisma(a, u, v, w, aro(r, k), 0, Math.hypot(d[0], d[1], d[2]), m);
  };
  const caja = (o: V, u: V, v: V, w: V, hu: number, hv: number, hw: number, m: string): void =>
    prisma(mas(o, por(u, -hu)), u, v, w, [[-hv, -hw], [hv, -hw], [hv, hw], [-hv, hw]], 0, 2 * hu, m);
  const haciaAz = (az: number): V => [Math.cos(az * GRADO), Math.sin(az * GRADO), 0];

  // ── Los mandos y lo que hacen de los platos ──
  const c = limitar(st.c, 0, 1);
  const th0 = H.pitch[0] + (H.pitch[1] - H.pitch[0]) * c;
  const ax = H.cyc[0] * st.sx;
  const ay = H.cyc[1] * st.sy;
  const pasoEn = (psi: number): number => th0 + ax * Math.sin(psi * GRADO) - ay * Math.cos(psi * GRADO);
  const aleteoEn = (psi: number): number =>
    H.cone[0] + (H.cone[1] - H.cone[0]) * c - ax * Math.cos(psi * GRADO) - ay * Math.sin(psi * GRADO);
  /*
   * Un grado de paso es el largo del cuerno en recorrido de la varilla. La
   * altura del plato bajo una varilla en el acimut `phi` mueve la pala cuyo
   * cuerno sujeta, `H.lead` por detrás.
   */
  const G = H.horn * GRADO;
  const sube = (th0 - H.pitch[0]) * G;
  const alturaDelPlato = (phi: number, r: number): number => (pasoEn(phi - H.lead) - th0) * G * (r / H.armR);
  const p0 = alturaDelPlato(0, 1);
  const p90 = alturaDelPlato(90, 1);
  const normal = unidad([-p0, -p90, 1]);
  const enElPlano = (z0: number, r: number, az: number): V => {
    const d = haciaAz(az);
    return [d[0] * r, d[1] * r, z0 + sube + p0 * d[0] * r + p90 * d[1] * r];
  };
  const pu = unidad(menos(enElPlano(0, 1, 0), enElPlano(0, 0, 0)));
  const pv = unidad(cruz(normal, pu));

  // ── Lo que no gira ──
  // El mástil, por dentro de todo.
  barra([0, 0, -0.05], [0, 0, H.mastTop + 0.1], H.mastR, "mast", 14);
  // Los tres servos: el cuerpo sobre la caja y su varilla hasta la oreja del plato fijo.
  let servo: V = [0, 0, 0];
  for (const az of H.servoAz) {
    const d = haciaAz(az);
    const pie: V = [d[0] * H.servoR, d[1] * H.servoR, 0];
    barra(pie, mas(pie, [0, 0, 0.1]), 0.055, "servo", 10);
    const oreja = enElPlano(H.plateZ, H.servoR, az);
    barra(mas(pie, [0, 0, 0.1]), oreja, 0.022, "servo-rod", 6);
    if (az === H.servoAz[1]) servo = mas(pie, [0, 0, 0.08]);
    caja(oreja, Z, d, cruz(Z, d), 0.025, 0.05, 0.03, "plate");
  }
  // El plato fijo, y su tijera a la caja, a la izquierda (270°).
  prisma(enElPlano(H.plateZ, 0, 0), normal, pu, pv, aro(H.plateR, 20), -H.plateT / 2, H.plateT / 2, "plate");
  {
    const d = haciaAz(270);
    const base: V = [d[0] * 0.52, d[1] * 0.52, 0];
    const arriba = enElPlano(H.plateZ, H.plateR + 0.02, 270);
    const rodilla = mas(por(mas(base, arriba), 0.5), [d[0] * 0.1, d[1] * 0.1, 0.02]);
    barra(base, rodilla, 0.018, "link", 6);
    barra(rodilla, arriba, 0.018, "link", 6);
    barra(base, mas(base, [0, 0, 0.04]), 0.04, "servo", 8);
  }

  // ── Lo que gira ──
  const psi = st.psi;
  // El plato que gira, con sus cuatro brazos —uno bajo cada varilla— y su tijera al mástil.
  const zr = H.plateZ + (H.plateT + H.rplateT) / 2;
  prisma(enElPlano(zr, 0, 0), normal, pu, pv, aro(H.rplateR, 20), -H.rplateT / 2, H.rplateT / 2, "rplate");
  const pieDeVarilla: V[] = [];
  for (let i = 0; i < 4; i++) {
    const az = psi + i * 90 + H.lead;
    const a = enElPlano(zr, H.rplateR - 0.03, az);
    const b = enElPlano(zr, H.armR, az);
    barra(a, b, 0.028, "rplate", 6);
    pieDeVarilla.push(b);
  }
  {
    const az = psi + 90 + H.lead / 2;
    const d = haciaAz(az);
    const collar: V = [d[0] * H.mastR, d[1] * H.mastR, 0.62];
    const pie = enElPlano(zr, H.rplateR * 0.7, az);
    const rodilla = mas(por(mas(collar, pie), 0.5), [d[0] * 0.12, d[1] * 0.12, 0]);
    barra(collar, rodilla, 0.02, "link", 6);
    barra(rodilla, pie, 0.02, "link", 6);
    barra([0, 0, 0.58], [0, 0, 0.66], H.mastR + 0.02, "mast", 14);
  }
  // El buje.
  barra([0, 0, H.hubZ - H.hubH / 2], [0, 0, H.hubZ + H.hubH / 2], H.hubR, "hub", 16);
  const palas: Pala[] = [];
  const mediosDeVarilla: V[] = [];
  // El perfil de la pala, un NACA de cuatro cifras fino: la sección del corte.
  const espesor = (x: number): number =>
    0.6 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const seccion: [number, number][] = [];
  for (let k = 0; k <= 12; k++) seccion.push([(0.25 - k / 12) * H.chord, espesor(k / 12) * H.chord]);
  for (let k = 11; k >= 1; k--) seccion.push([(0.25 - k / 12) * H.chord, -0.35 * espesor(k / 12) * H.chord]);
  for (let i = 0; i < 4; i++) {
    const az = psi + i * 90;
    const d = haciaAz(az);
    // Hacia dónde avanza la pala.
    const t: V = [-d[1], d[0], 0];
    const beta = aleteoEn(az) * GRADO;
    const theta = pasoEn(az) * GRADO;
    // El brazo del buje hasta la bisagra de aleteo.
    caja(mas([0, 0, H.hubZ], por(d, (H.hubR + H.hingeR) / 2 - 0.02)), d, t, Z, (H.hingeR - H.hubR) / 2 + 0.04, 0.09, 0.06, "hub");
    // Pasada la bisagra, todo alea `beta` (alrededor de t) y cabecea `theta` (alrededor de su eje).
    const bisagra = mas([0, 0, H.hubZ], por(d, H.hingeR));
    const radial = girarSobre(d, t, -beta);
    const arriba = girarSobre(Z, t, -beta);
    // El paso: el borde de ataque, hacia `t`, sube.
    const lt = girarSobre(t, radial, theta);
    const lz = girarSobre(arriba, radial, theta);
    const P = (r: number, a: number, b: number): V =>
      mas(mas(mas(bisagra, por(radial, r - H.hingeR)), por(lt, a)), por(lz, b));
    // La pala, pasado el manguito, va torcida: en el corte lleva el paso de la raíz más la torsión hasta ahí.
    const tw = H.twist * (H.blade[1] / H.R) * GRADO;
    const bt = girarSobre(lt, radial, tw);
    const bz = girarSobre(lz, radial, tw);
    const PB = (r: number, a: number, b: number): V =>
      mas(mas(mas(bisagra, por(radial, r - H.hingeR)), por(bt, a)), por(bz, b));
    // El manguito, una caja que se estrecha.
    const s0 = H.sleeve[0];
    const s1 = H.sleeve[1];
    const sec0: readonly (readonly [number, number])[] = [[-0.085, -0.07], [0.085, -0.07], [0.085, 0.07], [-0.085, 0.07]];
    const sec1: readonly (readonly [number, number])[] = [[-0.07, -0.05], [0.07, -0.05], [0.07, 0.05], [-0.07, 0.05]];
    const ejeEn = (r: number): V => P(r, 0, 0);
    for (let j = 0; j < 4; j++) {
      const a0 = sec0[j]!;
      const b0 = sec0[(j + 1) % 4]!;
      const a1 = sec1[j]!;
      const b1 = sec1[(j + 1) % 4]!;
      const q = [P(s0, a0[0], a0[1]), P(s0, b0[0], b0[1]), P(s1, b1[0], b1[1]), P(s1, a1[0], a1[1])];
      const medio = por(q.reduce<V>((a, x) => mas(a, x), [0, 0, 0]), 0.25);
      cara(q, "sleeve", menos(medio, ejeEn((s0 + s1) / 2)));
    }
    cara([...sec0].reverse().map((q) => P(s0, q[0], q[1])), "sleeve", por(radial, -1));
    // El amortiguador de arrastre: del buje, por detrás del manguito, hasta su mitad.
    barra(mas(mas([0, 0, H.hubZ + 0.06], por(d, H.hubR - 0.02)), por(t, -0.17)), P(0.72, -0.1, 0.07), 0.035, "damper", 8);
    // La pala, un prisma con el perfil por sección: la cara del corte.
    const b0 = H.blade[0];
    const b1 = H.blade[1];
    const n = seccion.length;
    for (let j = 0; j < n; j++) {
      const a = seccion[j]!;
      const b = seccion[(j + 1) % n]!;
      cara(
        [PB(b0, a[0], a[1]), PB(b0, b[0], b[1]), PB(b1, b[0], b[1]), PB(b1, a[0], a[1])],
        "blade",
        menos(PB((b0 + b1) / 2, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2), PB((b0 + b1) / 2, -0.1 * H.chord, 0)),
      );
    }
    cara(seccion.map((q) => PB(b1, q[0], q[1])).reverse(), "cut", radial);
    cara(seccion.map((q) => PB(b0, q[0], q[1])), "blade", por(radial, -1));
    // El cuerno: del borde de ataque del manguito, abajo y adelante, hasta la punta de la varilla.
    const raizDelCuerno = P(0.42, 0.085, -0.03);
    const puntaBaja = P(0.42, 0.085 + H.horn * 0.55, -0.09);
    const pie = pieDeVarilla[i]!;
    const arribaDeLaVarilla: V = [pie[0], pie[1], puntaBaja[2]];
    barra(raizDelCuerno, arribaDeLaVarilla, 0.025, "horn", 6);
    barra(pie, arribaDeLaVarilla, 0.022, "prod", 8);
    mediosDeVarilla.push(por(mas(pie, arribaDeLaVarilla), 0.5));
    // El resto de la pala en fantasma: su contorno, plano, hasta `H.ghost`.
    const ataque = H.chord * 0.25;
    const salida = -H.chord * 0.75;
    cara([PB(b1, ataque, 0), PB(H.ghost, ataque, 0), PB(H.ghost, salida, 0), PB(b1, salida, 0)], "ghost", bz);
    palas.push({ corte: PB(b1, 0, 0) });
  }
  return {
    caras: F,
    palas,
    plato: enElPlano(H.plateZ, H.plateR, 200),
    platoQueGira: enElPlano(zr, H.rplateR, 60),
    mediosDeVarilla,
    servo,
    th0,
  };
}

/** Un trozo del dibujo ya proyectado: su camino, su clase y su fondo para ordenarlo. */
interface Trazo {
  readonly z: number;
  readonly d: string;
  readonly cls: string;
}

/** El tono de una cara según la luz: cuatro, como las demás figuras de manual. */
const tonoDe = (l: number): number => (l > 0.55 ? 3 : l > 0.2 ? 2 : l > -0.2 ? 1 : 0);

/** Las caras de la cabeza que se ven, de la más lejana a la más cercana. */
function pintarCaras(caras: readonly Cara[]): Trazo[] {
  const fuera: Trazo[] = [];
  for (const f of caras) {
    let n = f.n;
    // El corte y el fantasma se ven por las dos caras.
    const dos = f.m === "cut" || f.m === "ghost";
    const vis = punto(n, VISTA_H);
    if (vis <= 0) {
      if (!dos) continue;
      n = por(n, -1);
    }
    const d = `M${f.p
      .map((p) => {
        const q = isoH(p);
        return `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
      })
      .join("L")}Z`;
    fuera.push({ z: punto(f.c, VISTA_H), d, cls: `hd-f hd-${f.m.replace("-cap", "")} hd-t${tonoDe(punto(n, L))}` });
  }
  return fuera.sort((a, b) => a.z - b.z);
}

/** La actitud del Super Puma de al lado, en grados. */
interface Actitud {
  bank: number;
  pitch: number;
  yaw: number;
  alt: number;
  rate: number;
}

/**
 * **El Super Puma de al lado**, girado y con el disco del rotor inclinado con
 * el cíclico. El rotor de cola, en el costado derecho de la deriva.
 */
function pintarElPuma(act: Actitud, inclina: { adelante: number; derecha: number }, q: Proyeccion): Trazo[] {
  const iso = isometrica(q);
  const V = vistaDe(q);
  const LP = v3(PUMA.LIGHT);
  const f = act.bank * GRADO;
  const t = act.pitch * GRADO;
  const s = act.yaw * GRADO;
  const cf = Math.cos(f);
  const sf = Math.sin(f);
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const cs = Math.cos(s);
  const ss = Math.sin(s);
  // Alabeo (lado derecho abajo) sobre x, cabeceo (morro arriba) sobre y y guiñada (morro a la derecha) sobre z.
  const girar = (v: V): V => {
    const a: V = [v[0], v[1] * cf + v[2] * sf, -v[1] * sf + v[2] * cf];
    const b: V = [a[0] * ct - a[2] * st, a[1], a[0] * st + a[2] * ct];
    return [b[0] * cs - b[1] * ss, b[0] * ss + b[1] * cs, b[2]];
  };
  const CG: V = [0, 0, 1.8];
  const poner = (p: V): V => girar(menos(p, CG));
  const lista: Trazo[] = [];
  const meter = (pts: readonly V[], n: V, cls: string, dos?: boolean): void => {
    let nr = girar(n);
    if (punto(nr, V) <= 0) {
      if (!dos) return;
      nr = por(nr, -1);
    }
    const P = pts.map(poner);
    const z = P.reduce((a, p) => a + punto(p, V), 0) / P.length;
    const d = `M${P.map((p) => {
      const r = iso(p);
      return `${r[0].toFixed(1)} ${r[1].toFixed(1)}`;
    }).join("L")}Z`;
    lista.push({ z, d, cls: `sp-f sp-${cls} sp-t${tonoDe(punto(nr, LP))}` });
  };
  for (const fc of PUMA.faces) meter(fc.p.map(v3), v3(fc.n), fc.k, !!fc.two);
  const disco = (c: V, r: number, u: V, v: V, n: V, cls: string, k = 28): void => {
    const pts: V[] = [];
    for (let i = 0; i < k; i++) {
      const a = (i / k) * 2 * Math.PI;
      pts.push(mas(c, por(mas(por(u, Math.cos(a)), por(v, Math.sin(a))), r)));
    }
    meter(pts, n, cls, true);
  };
  const tf = inclina.adelante * GRADO;
  const tr = inclina.derecha * GRADO;
  disco(
    [0, 0, 4.3],
    CABEZA.R,
    [Math.cos(tf), 0, -Math.sin(tf)],
    [0, Math.cos(tr), -Math.sin(tr)],
    [Math.sin(tf), Math.sin(tr), Math.cos(tf) * Math.cos(tr)],
    "disc",
  );
  disco([-9.67, 0.42, 3.51], 1.525, [1, 0, 0], [0, 0, 1], [0, 1, 0], "tdisc", 18);
  return lista.sort((a, b) => a.z - b.z);
}

/** El paso en el 75 % del radio, el de los manuales: el de la raíz menos la torsión hasta ahí. */
const TORSION_AL_75 = CABEZA.twist * 0.75;
/** El paso que lee Taguato con el colectivo así, sin cíclico. */
export const pasoAl75 = (colectivo: number): number =>
  CABEZA.pitch[0] + (CABEZA.pitch[1] - CABEZA.pitch[0]) * limitar(colectivo, 0, 1) + TORSION_AL_75;

/** El colectivo del estacionario, con los pies al centro: ahí el rotor de cola aguanta el par. */
const ESTACIONARIO = 0.55;

export function montarPlato(el: HTMLElement, o: OpcionesDelPlato): FiguraDelPlato {
  const T = o.textos;
  el.classList.add("fig-plato");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector<SVGSVGElement>("svg");
  if (!svg) throw new Error("El plato no tiene dibujo");
  const de = <E extends Element = SVGElement>(nombre: string): E => pieza<E>(svg, nombre);
  const caraDeLaCabeza = [...de("head").children];
  const caraDelPuma = [...de("puma").children];
  const nubes = [...svg.querySelectorAll('[data-in="cloud"]')];
  const palanca = de("pv-stick");
  const empunadura = de("pv-grip");
  const colectivo = de("pv-coll");
  const cabezaDelColectivo = de("pv-head");
  const pedalIzq = de("pv-pedL");
  const pedalDer = de("pv-pedR");
  const frase = de("word");
  const pasoTxt = de("pitch");
  const narizTxt = de("nose");
  const par = de("torque");
  const empuje = de("push");
  const olas = de("waves");
  const llamadas = Object.fromEntries(
    LLAMADAS.map((k) => [k, { dot: de(`cd-${k}`), line: de(`cl-${k}`) }]),
  ) as Record<Llamada, { dot: SVGElement; line: SVGElement }>;
  const teclas = { c: de("k-coll"), sx: de("k-fwd"), sy: de("k-side"), pd: de("k-ped") };
  const nombres = { c: T.colectivo, sx: T.ciclicoAdelante, sy: T.ciclicoLado, pd: T.pedales };
  for (const k of ["c", "sx", "sy", "pd"] as const)
    hacerMando(teclas[k], "slider", nombres[k], {
      "aria-valuemin": k === "c" ? "0" : "-100",
      "aria-valuemax": "100",
      "aria-orientation": k === "c" || k === "sx" ? "vertical" : "horizontal",
    });

  // El colectivo se queda donde se deja, que tiene freno; el cíclico y los pedales vuelven al centro.
  const mando = { c: { v: ESTACIONARIO, t: ESTACIONARIO }, sx: { v: 0, t: 0 }, sy: { v: 0, t: 0 }, pd: { v: 0, t: 0 } };
  type Cual = keyof typeof mando;
  const vuelo: Actitud = { bank: 0, pitch: 0, yaw: 0, alt: 0, rate: 0 };
  let psi = 20;
  let deriva = 0;
  let mar = 0;
  let sinMovimiento = quieto();

  function pintarCabeza(): void {
    const r = carasDeLaCabeza({ psi, c: mando.c.v, sx: mando.sx.v, sy: mando.sy.v });
    const lista = pintarCaras(r.caras);
    for (let i = 0; i < caraDeLaCabeza.length; i++) {
      const f = lista[i];
      caraDeLaCabeza[i]!.setAttribute("d", f ? f.d : "M0 0");
      caraDeLaCabeza[i]!.setAttribute("class", f ? f.cls : "hd-f");
    }
    // Los rótulos siguen a su pieza; el de la varilla y el de la pala, a las más cercanas.
    const fondo = (p: V): number => punto(p, VISTA_H);
    const cercano = (l: readonly V[]): V => l.reduce((a, p) => (fondo(p) > fondo(a) ? p : a));
    // «Pala» va a la izquierda: señala la pala más cercana de ese lado.
    const cortes = r.palas.map((b) => b.corte);
    const deLaIzquierda = cortes.filter((p) => isoH(p)[0] < QH.o[0]);
    const anclas: Record<Llamada, readonly [number, number]> = {
      plate: isoH(r.plato),
      splate: isoH(r.plato),
      rplate: isoH(r.platoQueGira),
      rod: isoH(cercano(r.mediosDeVarilla)),
      servo: isoH(r.servo),
      cut: isoH(cercano(deLaIzquierda.length ? deLaIzquierda : cortes)),
    };
    for (const k of LLAMADAS) {
      const a = anclas[k];
      const txt = llamadas[k].dot.parentNode?.querySelector("text");
      if (!txt) continue;
      const tx = Number(txt.getAttribute("data-tx"));
      const ty = Math.max(24, Math.min(250, a[1] + DY[k]));
      txt.setAttribute("y", ty.toFixed(1));
      llamadas[k].dot.setAttribute("cx", a[0].toFixed(1));
      llamadas[k].dot.setAttribute("cy", a[1].toFixed(1));
      const hasta = tx + (txt.getAttribute("text-anchor") === "end" ? 3 : -3);
      llamadas[k].line.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${hasta} ${ty - 6}`);
    }
    // El cíclico suma y resta al pasar: lo más y lo menos de la vuelta.
    const ciclico = Math.hypot(CABEZA.cyc[0] * mando.sx.v, CABEZA.cyc[1] * mando.sy.v);
    pasoTxt.textContent = T.paso(r.th0 - ciclico + TORSION_AL_75, r.th0 + ciclico + TORSION_AL_75);
  }

  function pintarMandos(): void {
    const c = mando.c.v;
    const sx = mando.sx.v;
    const sy = mando.sy.v;
    const d = mando.pd.v;
    const gx = CY.x + 34 * sy;
    const gy = CY.top - 22 * sx;
    palanca.setAttribute("d", `M${CY.x} ${CY.base}L${gx.toFixed(1)} ${gy.toFixed(1)}`);
    empunadura.setAttribute(
      "transform",
      `translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${(1 - 0.14 * sx).toFixed(3)}) rotate(${(12 * sy).toFixed(1)})`,
    );
    const ang = (CO.a0 + (CO.a1 - CO.a0) * c) * GRADO;
    const hx = CO.px + CO.len * Math.cos(ang);
    const hy = CO.py + CO.len * Math.sin(ang);
    colectivo.setAttribute("d", `M${CO.px} ${CO.py}L${hx.toFixed(1)} ${hy.toFixed(1)}`);
    cabezaDelColectivo.setAttribute("transform", `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${(ang / GRADO).toFixed(1)})`);
    const pl = Math.max(0, -d);
    const pr = Math.max(0, d);
    pedalIzq.setAttribute(
      "transform",
      `translate(${PD.xl} ${(PD.y - 10 * pl + 5 * pr).toFixed(1)}) scale(${(1 - 0.16 * pl + 0.06 * pr).toFixed(3)})`,
    );
    pedalDer.setAttribute(
      "transform",
      `translate(${PD.xr} ${(PD.y - 10 * pr + 5 * pl).toFixed(1)}) scale(${(1 - 0.16 * pr + 0.06 * pl).toFixed(3)})`,
    );
  }

  const camino = (pts: readonly (readonly [number, number])[]): string =>
    pts.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("L");

  function pintarElDeAlLado(): void {
    const q: Proyeccion = { ...proyeccionDe(PROYECCION_DEL_PUMA) };
    const QB: Proyeccion = { ...q, o: [q.o[0], q.o[1] - 26 * vuelo.alt] };
    const lista = pintarElPuma(vuelo, { adelante: CABEZA.cyc[0] * mando.sx.v, derecha: CABEZA.cyc[1] * mando.sy.v }, QB);
    for (let i = 0; i < caraDelPuma.length; i++) {
      const f = lista[i];
      caraDelPuma[i]!.setAttribute("d", f ? f.d : "M0 0");
      caraDelPuma[i]!.setAttribute("class", f ? f.cls : "sp-f");
    }
    const iso = isometrica(QB);
    const cy = Math.cos(vuelo.yaw * GRADO);
    const sy = Math.sin(vuelo.yaw * GRADO);
    const en = (x: number, y: number, z: number): [number, number] => iso([x * cy - y * sy, x * sy + y * cy, z - 1.8]);
    /*
     * El par: un arco alrededor del mástil, hacia donde empuja al fuselaje —a
     * la izquierda, que el rotor gira como las agujas del reloj—; y el empuje
     * del rotor de cola, que lo aguanta, también hacia la izquierda.
     */
    const k = limitar((mando.c.v - 0.1) / 0.9, 0, 1);
    const punta = (e: readonly [number, number], ang: number): string =>
      camino([
        [e[0] - 8 * Math.cos(ang - 0.5), e[1] - 8 * Math.sin(ang - 0.5)],
        e,
        [e[0] - 8 * Math.cos(ang + 0.5), e[1] - 8 * Math.sin(ang + 0.5)],
      ]);
    if (k > 0.02) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 16; i++) {
        const a = (150 - ((40 + 110 * k) * i) / 16) * GRADO;
        pts.push(en(4.6 * Math.cos(a), 4.6 * Math.sin(a), 3.1));
      }
      const e = pts[pts.length - 1]!;
      const p = pts[pts.length - 2]!;
      par.setAttribute("d", `M${camino(pts)}M${punta(e, Math.atan2(e[1] - p[1], e[0] - p[0]))}`);
    } else par.setAttribute("d", "M0 0");
    const fuerza = limitar(0.55 * k + 0.45 * mando.pd.v, 0, 1.2);
    if (fuerza > 0.03) {
      const a = en(-9.67, 0.42, 3.51);
      const b = en(-9.67, -1 - 4.5 * fuerza, 3.51);
      empuje.setAttribute("d", `M${camino([a, b])}M${punta(b, Math.atan2(b[1] - a[1], b[0] - a[0]))}`);
    } else empuje.setAttribute("d", "M0 0");
    const CB = CABINA.CB;
    for (const n of nubes) {
      const x0 = Number(n.getAttribute("data-x"));
      const w = CB.w + 120;
      const dx = ((((x0 - CB.x + deriva) % w) + w) % w) + CB.x - 40 - x0;
      n.setAttribute("transform", `translate(${dx.toFixed(1)} 0)`);
    }
    olas.setAttribute("transform", `translate(${((((mar % 48) + 48) % 48) - 24).toFixed(1)} ${(14 * vuelo.alt).toFixed(1)})`);
    narizTxt.textContent = T.nariz(vuelo.yaw);
    frase.textContent =
      Math.abs(mando.pd.t) > 0.05
        ? mando.pd.t > 0
          ? T.narizDer
          : T.narizIzq
        : vuelo.rate < -4
          ? T.par
          : vuelo.rate > 4
            ? T.parIzq
            : mando.sx.t > 0.05
              ? T.adelante
              : mando.sx.t < -0.05
                ? T.atras
                : mando.sy.t > 0.05
                  ? T.derecha
                  : mando.sy.t < -0.05
                    ? T.izquierda
                    : mando.c.v > 0.62
                      ? T.sube
                      : mando.c.v < 0.48
                        ? T.baja
                        : T.quieto;
  }

  function leerParaElLector(): void {
    teclas.c.setAttribute("aria-valuenow", String(Math.round(mando.c.t * 100)));
    for (const k of ["sx", "sy", "pd"] as const) teclas[k].setAttribute("aria-valuenow", String(Math.round(mando[k].t * 100)));
    teclas.c.setAttribute("aria-valuetext", T.vColectivo(Math.round(mando.c.t * 100), pasoAl75(mando.c.t)));
    teclas.sx.setAttribute("aria-valuetext", T.vAdelante(mando.sx.t));
    teclas.sy.setAttribute("aria-valuetext", T.vLado(mando.sy.t));
    teclas.pd.setAttribute("aria-valuetext", T.vPedales(mando.pd.t));
  }

  function paso(dt: number): void {
    sinMovimiento = quieto();
    for (const m of Object.values(mando)) {
      const nv = sinMovimiento ? m.t : m.v + (m.t - m.v) * (1 - Math.exp(-dt * 10));
      m.v = Math.abs(nv - m.t) < 1e-3 ? m.t : nv;
    }
    // Una vuelta cada seis segundos: a cámara lenta. La de verdad da 4,4 por segundo.
    if (!sinMovimiento) psi = (psi + 60 * dt) % 360;
    const hacia = (ahora: number, meta: number, r = 3): number =>
      sinMovimiento ? meta : ahora + (meta - ahora) * (1 - Math.exp(-dt * r));
    /*
     * En estacionario y con los pies al centro, el rotor de cola aguanta el
     * par; con más potencia el morro se va a la izquierda, con menos a la
     * derecha, y los pedales lo giran.
     */
    const quiere = 26 * mando.pd.v - 30 * (mando.c.v - ESTACIONARIO);
    vuelo.rate = hacia(vuelo.rate, Math.abs(quiere) < 1 ? 0 : quiere, 2);
    if (!sinMovimiento) vuelo.yaw = limitar(vuelo.yaw + vuelo.rate * dt, -75, 75);
    vuelo.pitch = hacia(vuelo.pitch, -7 * mando.sx.v);
    vuelo.bank = hacia(vuelo.bank, 9 * mando.sy.v);
    if (!sinMovimiento) {
      vuelo.alt = limitar(vuelo.alt + (mando.c.v - ESTACIONARIO) * 1.6 * dt, -1, 1);
      deriva -= (45 * mando.sx.v + 50 * mando.sy.v) * dt;
      mar -= 60 * mando.sx.v * dt;
    }
    pintarCabeza();
    pintarMandos();
    pintarElDeAlLado();
  }

  const poner = (k: Cual, v: number): void => {
    mando[k].t = k === "c" ? limitar(v, 0, 1) : limitar(v);
    if (quieto()) paso(0);
    leerParaElLector();
  };

  /*
   * Con el dedo: el colectivo se arrastra arriba y abajo y se queda; el
   * cíclico, hacia cualquier lado, y vuelve; un pedal se pisa y vuelve.
   */
  let arrastre: { cual: "c"; y: number; c0: number } | { cual: "ciclico"; x: number; y: number } | { cual: "pd" } | null = null;
  const entrePedales = (PD.xl + PD.xr) / 2;
  svg.addEventListener("pointerdown", (ev) => {
    const p = enElDibujo(svg, ev);
    if (p.x < BB.x || p.x > BB.x + BB.w || p.y < BB.y || p.y > BB.y + BB.h) return;
    // Tocado con el dedo: sin el marco de foco hasta que se use una tecla.
    el.setAttribute("data-puntero", "");
    if (p.x < BB.x + 108) {
      arrastre = { cual: "c", y: p.y, c0: mando.c.t };
      (teclas.c as SVGElement).focus({ preventScroll: true });
    } else if (p.y < PD.y - 32) {
      arrastre = { cual: "ciclico", x: p.x, y: p.y };
      (teclas.sx as SVGElement).focus({ preventScroll: true });
    } else {
      arrastre = { cual: "pd" };
      poner("pd", p.x < entrePedales ? -1 : 1);
      (teclas.pd as SVGElement).focus({ preventScroll: true });
    }
    svg.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!arrastre) return;
    const p = enElDibujo(svg, ev);
    if (arrastre.cual === "c") poner("c", arrastre.c0 + (arrastre.y - p.y) / 70);
    else if (arrastre.cual === "ciclico") {
      poner("sy", (p.x - arrastre.x) / 50);
      poner("sx", (arrastre.y - p.y) / 40);
    } else poner("pd", p.x < entrePedales ? -1 : 1);
  });
  const soltarElDedo = (): void => {
    if (!arrastre) return;
    const cual = arrastre.cual;
    arrastre = null;
    if (cual !== "c") {
      poner("sx", 0);
      poner("sy", 0);
      poner("pd", 0);
    }
  };
  svg.addEventListener("pointerup", soltarElDedo);
  svg.addEventListener("pointercancel", soltarElDedo);

  /*
   * Con las teclas: el colectivo, a pasos, y se queda; el cíclico y los
   * pedales, mientras se mantiene la tecla, y vuelven al soltarla.
   */
  const flechas: Record<"sx" | "sy" | "pd", Readonly<Record<string, number>>> = {
    sx: { ArrowUp: 1, ArrowDown: -1 },
    sy: { ArrowLeft: -1, ArrowRight: 1 },
    pd: { ArrowLeft: -1, ArrowRight: 1 },
  };
  svg.addEventListener("keydown", () => el.removeAttribute("data-puntero"), true);
  teclas.c.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    const s = ({ ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1, PageUp: 0.25, PageDown: -0.25 } as Record<string, number>)[k];
    if (s) {
      ev.preventDefault();
      poner("c", mando.c.t + s);
    }
    if (k === "Home") {
      ev.preventDefault();
      poner("c", 0);
    }
    if (k === "End") {
      ev.preventDefault();
      poner("c", 1);
    }
  });
  for (const k of ["sx", "sy", "pd"] as const) {
    teclas[k].addEventListener("keydown", (ev) => {
      const e = ev as KeyboardEvent;
      const v = flechas[k][e.key];
      if (v !== undefined) {
        e.preventDefault();
        if (!e.repeat) poner(k, v);
      }
      if (e.key === "Home") {
        e.preventDefault();
        poner(k, 0);
      }
    });
    teclas[k].addEventListener("keyup", (ev) => {
      if (flechas[k][(ev as KeyboardEvent).key] !== undefined) poner(k, 0);
    });
    teclas[k].addEventListener("blur", () => {
      if (!arrastre) poner(k, 0);
    });
  }

  const bucle = new Bucle(el, paso);
  paso(0);
  leerParaElLector();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    mover({ colectivo: c, adelante = 0, lado = 0, pedales = 0, giro }) {
      if (c !== undefined) poner("c", c);
      poner("sx", adelante);
      poner("sy", lado);
      poner("pd", pedales);
      if (giro !== undefined) {
        psi = giro;
        paso(0);
      }
    },
    soltar() {
      poner("sx", 0);
      poner("sy", 0);
      poner("pd", 0);
    },
    enderezar() {
      Object.assign(vuelo, { bank: 0, pitch: 0, yaw: 0, alt: 0, rate: 0 });
      paso(0);
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-plato");
      delete el.dataset.edad;
      el.removeAttribute("data-puntero");
    },
  };
}
