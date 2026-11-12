/**
 * **Por dónde anda la gente** alrededor de un helicóptero posado, y cuándo.
 *
 * Es la mitad que se puede probar sin navegador de `world/gente-de-la-mision.ts`:
 * aquí no hay figuras, solo caminos y relojes.
 *
 * ## La norma, que es lo que se enseña
 *
 * A un helicóptero con el rotor en marcha **se llega por delante y por el lado
 * de la puerta, a la vista del piloto, y nunca por la cola**: el rotor de cola
 * gira a la altura de una cabeza y casi no se ve. Es lo que dicen las frases de
 * la misión —«la gente se acerca por delante, donde la ve el piloto»— y lo que
 * hacen las tripulaciones de verdad. Así que los caminos no son «el más corto»:
 * son el más corto **que rodea el helicóptero por el morro**.
 *
 * Para eso se le pone alrededor un estadio: todo lo que queda a menos de
 * `MARGEN` metros más que el radio del rotor del segmento que va del mástil al
 * rotor de cola. Dentro solo se entra por el pasillo de la puerta, que va de
 * frente y a la derecha, con todo él por delante de la puerta. Por fuera se
 * rodea siempre por el lado del morro: un camino que tuviera que dar la vuelta
 * por detrás de la cola no existe aquí.
 *
 * Los ejes, los del juego: x al este, z al sur, y el rumbo en radianes desde el
 * norte creciendo al este. «Adelante» y «derecha» son los del helicóptero.
 */

/** Un punto del suelo, m. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Lo que hace falta saber del helicóptero posado para andar a su alrededor. */
export interface Posado {
  /** Dónde está, bajo el mástil. */
  readonly x: number;
  readonly z: number;
  /** Rumbo, rad. */
  readonly rumbo: number;
  /** Radio del rotor principal, m. */
  readonly rotor: number;
  /** Del mástil al buje del rotor de cola, m. */
  readonly cola: number;
  /** La puerta, en ejes del helicóptero: metros por delante del mástil y a la derecha. */
  readonly puerta: { readonly adelante: number; readonly derecha: number };
}

/**
 * Cuánto más allá del disco se rodea, m. Tres: lo que deja el morro a la vista
 * desde la cabina y el rotor de cola a casi once metros.
 */
export const MARGEN = 3;

/**
 * **Desde dónde se entra al pasillo de la puerta**, en grados desde el morro
 * hacia la derecha. Cincuenta: de frente y a la derecha, que es donde el
 * piloto, sentado a la derecha, ve a quien viene sin girar la cabeza. Y a un
 * metro del borde del disco, que es donde uno se agacha.
 */
const ENTRADA = (50 * Math.PI) / 180;

/** Los dos ejes del helicóptero, en el mundo. */
function ejes(p: Posado): { fx: number; fz: number; rx: number; rz: number } {
  return { fx: Math.sin(p.rumbo), fz: -Math.cos(p.rumbo), rx: Math.cos(p.rumbo), rz: Math.sin(p.rumbo) };
}

/** Del mundo a los ejes del helicóptero: `f` adelante y `r` a la derecha. */
export function aLocal(p: Posado, q: Punto): { f: number; r: number } {
  const e = ejes(p);
  const dx = q.x - p.x;
  const dz = q.z - p.z;
  return { f: dx * e.fx + dz * e.fz, r: dx * e.rx + dz * e.rz };
}

/** Y de vuelta. */
export function aMundo(p: Posado, f: number, r: number): Punto {
  const e = ejes(p);
  return { x: p.x + f * e.fx + r * e.rx, z: p.z + f * e.fz + r * e.rz };
}

/** El radio del estadio: el disco más el margen. */
export function radioSeguro(p: Posado): number {
  return p.rotor + MARGEN;
}

/** Distancia de (f, r) al segmento del mástil al rotor de cola, en ejes locales. */
export function aLaColaYAlMastil(p: Posado, f: number, r: number): number {
  const fc = Math.max(-p.cola, Math.min(0, f));
  return Math.hypot(f - fc, r);
}

/** Distancia entre dos segmentos del plano. */
function entreSegmentos(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  d: readonly [number, number],
): number {
  const cruza = (p: readonly [number, number], q: readonly [number, number], s: readonly [number, number]) =>
    (q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0]);
  const d1 = cruza(c, d, a);
  const d2 = cruza(c, d, b);
  const d3 = cruza(a, b, c);
  const d4 = cruza(a, b, d);
  if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
  const alPunto = (p: readonly [number, number], s0: readonly [number, number], s1: readonly [number, number]) => {
    const vx = s1[0] - s0[0];
    const vy = s1[1] - s0[1];
    const l2 = vx * vx + vy * vy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - s0[0]) * vx + (p[1] - s0[1]) * vy) / l2)) : 0;
    return Math.hypot(p[0] - (s0[0] + t * vx), p[1] - (s0[1] + t * vy));
  };
  return Math.min(alPunto(a, c, d), alPunto(b, c, d), alPunto(c, a, b), alPunto(d, a, b));
}

/** Si de `a` a `b`, en ejes locales, se va sin pisar el estadio. */
function despejado(p: Posado, a: { f: number; r: number }, b: { f: number; r: number }): boolean {
  return entreSegmentos([a.f, a.r], [b.f, b.r], [0, 0], [-p.cola, 0]) >= radioSeguro(p) - 0.05;
}

/*
 * **El borde del estadio, medido a lo largo**: `u` es cuánto se ha andado por
 * el borde desde el punto de delante del morro, positivo por la derecha y
 * negativo por la izquierda. Detrás de la cola está el corte, en ±`mitad`, y
 * por ahí no se pasa: ir de un `u` a otro en línea recta nunca lo cruza.
 */
function mitad(p: Posado): number {
  return radioSeguro(p) * Math.PI + p.cola;
}

function bordeEn(p: Posado, u: number): { f: number; r: number } {
  const R = radioSeguro(p);
  const lado = u < 0 ? -1 : 1;
  const v = Math.abs(u);
  const arco = (R * Math.PI) / 2;
  if (v <= arco) {
    const a = v / R;
    return { f: R * Math.cos(a), r: lado * R * Math.sin(a) };
  }
  if (v <= arco + p.cola) return { f: -(v - arco), r: lado * R };
  const a = Math.PI / 2 + Math.min(Math.PI / 2, (v - arco - p.cola) / R);
  return { f: -p.cola + R * Math.cos(a), r: lado * R * Math.sin(a) };
}

function uDe(p: Posado, f: number, r: number): number {
  const R = radioSeguro(p);
  const arco = (R * Math.PI) / 2;
  const lado = r < 0 ? -1 : 1;
  const ar = Math.abs(r);
  let u: number;
  if (f >= 0) u = R * Math.atan2(ar, f);
  else if (f >= -p.cola) u = arco - f;
  else u = arco + p.cola + R * (Math.atan2(ar, f + p.cola) - Math.PI / 2);
  return lado * Math.min(u, mitad(p) - 0.01);
}

/**
 * **El camino de `desde` a `hasta` rodeando el helicóptero por el morro.**
 *
 * Recto si se puede; si no, por el borde del estadio, por el lado que no pasa
 * por detrás de la cola, y tirando del hilo: el más corto de los que rodean
 * por ese lado. Si `desde` está dentro del estadio —el helicóptero se posó
 * muy cerca—, lo primero es salir de él apartándose del eje.
 */
export function rodeo(p: Posado, desde: Punto, hasta: Punto): Punto[] {
  const a = aLocal(p, desde);
  const b = aLocal(p, hasta);
  if (despejado(p, a, b)) return [desde, hasta];
  const ua = uDe(p, a.f, a.r);
  const ub = uDe(p, b.f, b.r);
  // Un pelo por fuera del borde, para que la cuerda entre dos puntos no lo pise.
  const fuera = 1.02;
  const pasos = Math.max(1, Math.ceil(Math.abs(ub - ua) / 0.75));
  const puntos: { f: number; r: number }[] = [a];
  for (let i = 0; i <= pasos; i++) {
    const q = bordeEn(p, ua + ((ub - ua) * i) / pasos);
    // Hacia fuera desde el eje, que en los lados no es desde el mástil.
    const fc = Math.max(-p.cola, Math.min(0, q.f));
    puntos.push({ f: fc + (q.f - fc) * fuera, r: q.r * fuera });
  }
  puntos.push(b);
  // Tirar del hilo: desde cada punto, al más lejano que se ve sin pisar el estadio.
  const hilo = [puntos[0] as { f: number; r: number }];
  let i = 0;
  while (i < puntos.length - 1) {
    let j = puntos.length - 1;
    while (j > i + 1 && !despejado(p, puntos[i] as { f: number; r: number }, puntos[j] as { f: number; r: number })) j--;
    hilo.push(puntos[j] as { f: number; r: number });
    i = j;
  }
  return hilo.map((q) => aMundo(p, q.f, q.r));
}

/**
 * **El pasillo de la puerta**: de la entrada, de frente y a la derecha fuera del
 * disco, hasta dentro de la cabina, con todo él por delante de la puerta. En
 * orden de subida; para bajar se recorre al revés.
 */
export function pasilloDeLaPuerta(p: Posado): Punto[] {
  const R = p.rotor + 1;
  const { adelante: fd, derecha: rd } = p.puerta;
  return [
    aMundo(p, R * Math.cos(ENTRADA), R * Math.sin(ENTRADA)),
    // Un paso por delante de la puerta y a dos metros de ella: el tripulante
    // está ahí y desde ahí se entra de frente al hueco.
    aMundo(p, fd + 0.8, rd + 2.2),
    aMundo(p, fd, rd + 0.35),
    aMundo(p, fd, rd - 0.6),
  ];
}

/** Dónde espera el tripulante: al lado de la puerta, un paso por delante. */
export function sitioDelTripulante(p: Posado): Punto {
  return aMundo(p, p.puerta.adelante + 1.0, p.puerta.derecha + 1.0);
}

/** Lo largo de un camino, m. */
export function largo(camino: readonly Punto[]): number {
  let l = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1] as Punto;
    const b = camino[i] as Punto;
    l += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return l;
}

/** El punto a `s` metros del principio de un camino, y hacia dónde va ahí. */
export function enElCamino(camino: readonly Punto[], s: number): { x: number; z: number; dx: number; dz: number } {
  let resto = Math.max(0, s);
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1] as Punto;
    const b = camino[i] as Punto;
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (resto <= l || i === camino.length - 1) {
      const k = l > 0 ? Math.min(1, resto / l) : 1;
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dx: l > 0 ? (b.x - a.x) / l : 0, dz: l > 0 ? (b.z - a.z) / l : 0 };
    }
    resto -= l;
  }
  const u = camino[camino.length - 1] ?? { x: 0, z: 0 };
  return { x: u.x, z: u.z, dx: 0, dz: 0 };
}

/**
 * **El reloj de cada uno**: en qué segundo va por qué metro de su camino. Una
 * lista de marcas `[segundos, metros]`; entre dos, a velocidad constante.
 */
export type Horario = readonly (readonly [number, number])[];

/** Por qué metro va a los `t` segundos. */
export function metrosA(h: Horario, t: number): number {
  const primera = h[0];
  if (!primera) return 0;
  if (t <= primera[0]) return primera[1];
  for (let i = 1; i < h.length; i++) {
    const a = h[i - 1] as readonly [number, number];
    const b = h[i] as readonly [number, number];
    if (t <= b[0]) return b[0] > a[0] ? a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]) : b[1];
  }
  return (h[h.length - 1] as readonly [number, number])[1];
}

/** Ritmos, m/s y s. */
export const RITMO = {
  /** Andando ligero por fuera del disco. */
  andando: 1.7,
  /**
   * Lo más rápido, un trote suave que aguanta un niño. Si ni así da tiempo,
   * la espera dura lo que tarden: no se despega con gente andando hacia el
   * rotor. Ver `lista` en `missions/gente.ts`.
   */
  corriendo: 3.0,
  /** Agachados bajo el disco. */
  agachados: 1.7,
  /** Cuándo echan a andar: cuando el tripulante asoma por la puerta. */
  saleElTripulante: 1.0,
  /** Lo que se deja entre dos en la puerta. */
  entreDos: 0.6,
  /** Y lo que necesita el tripulante para entrar detrás y cerrar. */
  cerrar: 1.6,
} as const;

/** Un plan de subida o de bajada: el camino de cada uno y su reloj, y cuándo entra el tripulante. */
export interface Plan {
  readonly caminos: readonly (readonly Punto[])[];
  readonly horarios: readonly Horario[];
  /** Cuándo entra el tripulante, s desde que empieza. */
  readonly entraElTripulante: number;
}

/**
 * **La subida**: cada uno de su sitio a la entrada del pasillo, rodeando por el
 * morro, y en fila hasta la puerta. Llegan a la entrada cada uno a su turno,
 * de modo que en el pasillo van de uno en uno, y el ritmo se elige para que
 * entre el último con tiempo de que el tripulante suba detrás y cierre antes
 * de `quedan` segundos. La fila se hace sola: el que tiene menos camino, el
 * primero. Devuelve los caminos en el orden de `desde`.
 */
export function planDeSubida(p: Posado, desde: readonly Punto[], quedan: number): Plan {
  const pasillo = pasilloDeLaPuerta(p);
  const entrada = pasillo[0] as Punto;
  const hastaLaEntrada = desde.map((d) => rodeo(p, d, entrada));
  const caminos = hastaLaEntrada.map((c) => [...c, ...pasillo.slice(1)]);
  const largos = hastaLaEntrada.map((c) => largo(c));
  // El turno en la fila de cada uno: por lo que le queda hasta la entrada.
  const fila = largos.map((l, i) => ({ l, i })).sort((a, b) => a.l - b.l);
  const turno: number[] = [];
  fila.forEach((f, k) => (turno[f.i] = k));
  const enElPasillo = largo(pasillo);
  const n = desde.length;
  const sale = RITMO.saleElTripulante;
  /*
   * Primero, a paso ligero: el turno del primero es el que deja a todos
   * llegar a su hora sin correr. Si así el último no entra a tiempo, se
   * aprieta: menos hueco en la puerta, más prisa bajo el disco y, por fuera,
   * la que haga falta hasta trotar.
   */
  const probar = (entreDos: number, agachados: number, andando: number) => {
    const pasilloT = enElPasillo / agachados;
    let primero = 0;
    fila.forEach((f, k) => (primero = Math.max(primero, sale + f.l / andando + pasilloT - k * entreDos)));
    return { primero, ultimo: primero + (n - 1) * entreDos, pasilloT, entreDos };
  };
  const limite = quedan - RITMO.cerrar - 0.6;
  // Cuánto se aprieta, de 0 a 1: lo justo para llegar, buscado a medias.
  const apretando = (k: number) =>
    probar(
      RITMO.entreDos * (1 - 0.35 * k),
      RITMO.agachados * (1 + 0.4 * k),
      RITMO.andando + (RITMO.corriendo - RITMO.andando) * k,
    );
  let r = apretando(0);
  if (r.ultimo > limite) {
    let poco = 0;
    let mucho = 1;
    r = apretando(1);
    if (r.ultimo <= limite)
      for (let i = 0; i < 20; i++) {
        const k = (poco + mucho) / 2;
        if (apretando(k).ultimo > limite) poco = k;
        else mucho = k;
      }
    r = apretando(mucho);
  }
  const horarios = caminos.map((c, i): Horario => {
    const entra = r.primero + (turno[i] as number) * r.entreDos;
    const enLaEntrada = entra - r.pasilloT;
    return [
      [sale, 0],
      [Math.max(sale + 0.01, enLaEntrada), largos[i] as number],
      [Math.max(sale + 0.02, entra), largo(c)],
    ];
  });
  return { caminos, horarios, entraElTripulante: r.ultimo + 0.6 };
}

/**
 * **La bajada**: de dentro, por el pasillo al revés y, ya fuera del disco, a
 * su sitio de `hasta` rodeando por el morro. Salen de uno en uno detrás del
 * tripulante, y él vuelve a entrar cuando el último ha salido del disco.
 */
export function planDeBajada(p: Posado, hasta: readonly Punto[], quedan: number): Plan {
  const pasillo = [...pasilloDeLaPuerta(p)].reverse();
  const salida = pasillo[pasillo.length - 1] as Punto;
  const caminos = hasta.map((h) => [...pasillo, ...rodeo(p, salida, h).slice(1)]);
  const enElPasillo = largo(pasillo);
  const n = hasta.length;
  let entreDos: number = RITMO.entreDos;
  let agachados: number = RITMO.agachados;
  // El último fuera del disco y el tripulante dentro, antes de que acabe la espera.
  const fin = () => RITMO.saleElTripulante + (n - 1) * entreDos + enElPasillo / agachados + RITMO.cerrar;
  for (let paso = 1; fin() > quedan && paso <= 12; paso++) {
    entreDos = RITMO.entreDos * (1 - 0.035 * paso);
    agachados = RITMO.agachados * (1 + 0.04 * paso);
  }
  const horarios = caminos.map((c, k): Horario => {
    const sale = RITMO.saleElTripulante + k * entreDos;
    const fuera = sale + enElPasillo / agachados;
    return [
      [sale, 0],
      [fuera, enElPasillo],
      [fuera + (largo(c) - enElPasillo) / RITMO.andando, largo(c)],
    ];
  });
  return {
    caminos,
    horarios,
    entraElTripulante: RITMO.saleElTripulante + (n - 1) * entreDos + enElPasillo / agachados + 0.3,
  };
}

/**
 * **Dónde se queda la gente que baja**: por delante, fuera del estadio, en
 * suelo que se pueda pisar. Se prueba primero de frente y a la derecha, que es
 * por donde sale el pasillo, y luego abriendo hacia los lados por delante;
 * nunca por detrás de la puerta. Si no hay ninguno —un muelle, un acantilado—,
 * el primero, que al menos está fuera del disco.
 */
export function sitioParaApartarse(p: Posado, pisable: (q: Punto) => boolean): Punto {
  const R = radioSeguro(p);
  const angulos = [40, 60, 20, 80, 0, -20, -40, -60];
  const distancias = [R + 8, R + 5, R + 12];
  for (const d of distancias)
    for (const g of angulos) {
      const a = (g * Math.PI) / 180;
      const q = aMundo(p, d * Math.cos(a), d * Math.sin(a));
      // Que quepa el grupo: el centro y cuatro puntos a tres metros.
      const cabe = [q, ...[0, 1, 2, 3].map((i) => ({ x: q.x + 3 * Math.cos(i * 1.57), z: q.z + 3 * Math.sin(i * 1.57) }))].every(pisable);
      if (cabe) return q;
    }
  const a = (40 * Math.PI) / 180;
  return aMundo(p, (R + 8) * Math.cos(a), (R + 8) * Math.sin(a));
}

/**
 * **El corro**: dónde se pone cada uno de un grupo de `cuantos` alrededor de
 * `centro`, de cara a `mirando`. Tres filas sueltas, a metro y pico entre uno
 * y otro, como se pone la gente que espera algo; los de delante, un poco más
 * abiertos. Siempre los mismos sitios para el mismo número, así el grupo que
 * se ve llegar es el mismo que se ve bajar.
 */
export function sitiosDeLaGente(centro: Punto, mirando: Punto, cuantos = 13): Punto[] {
  const rumbo = Math.atan2(mirando.x - centro.x, -(mirando.z - centro.z));
  const p: Posado = { x: centro.x, z: centro.z, rumbo, rotor: 0, cola: 0, puerta: { adelante: 0, derecha: 0 } };
  // [adelante, derecha], m.
  const corro: readonly (readonly [number, number])[] = [
    [0.3, -2.9],
    [0.5, -1.4],
    [0.2, 0.1],
    [0.45, 1.5],
    [0.15, 2.9],
    [-1.2, -2.1],
    [-1.0, -0.6],
    [-1.3, 0.8],
    [-1.1, 2.2],
    [-2.6, -1.4],
    [-2.4, 0.1],
    [-2.7, 1.5],
    [1.5, 0.8],
  ];
  return Array.from({ length: cuantos }, (_, i) => {
    const [f, r] = corro[i % corro.length] as readonly [number, number];
    // Si fueran más de trece, otra vuelta un paso más atrás.
    const atras = Math.floor(i / corro.length) * 4;
    return aMundo(p, f - atras, r);
  });
}
