/**
 * Por dónde se va rodando de un sitio a otro del aeropuerto.
 *
 * OpenStreetMap da las calles de rodaje como polilíneas sueltas: cincuenta y
 * cuatro trozos en Silvio Pettirossi, cada uno con su letra, sin decir en
 * ningún sitio cuál empalma con cuál. Para poder decirle a un niño «seguí la A
 * hasta la doble raya» hace falta antes saber que desde el puesto 14 se sale a
 * la M, la M lleva a la A y la A llega a la cabecera. Eso es un grafo, y esto
 * lo construye.
 *
 * Dos decisiones que hacen que funcione con datos reales:
 *
 * **Los nudos se juntan por cercanía, no por identidad.** Dos calles que se
 * cruzan en OSM comparten el nodo casi siempre, pero «casi» no vale: basta un
 * empalme dibujado con medio metro de diferencia para partir el aeropuerto en
 * dos mitades incomunicadas. Se redondean a una rejilla y santas pascuas.
 *
 * **Casi todos los empalmes son en T, no punta con punta.** Esto no se dedujo,
 * se midió: en Tenerife Norte, de las setenta puntas de calle, solo treinta
 * caen cerca de la punta de otra — pero **sesenta caen sobre el costado de
 * otra**. Una calle de rodaje termina en medio de otra, que es como se
 * construyen los aeropuertos. Soldando solo punta con punta, el grafo salía en
 * diecinueve trozos incomunicados y el mayor tenía siete nudos de cuarenta y
 * cinco: inservible.
 *
 * Así que antes de nada se hace el «nodado»: cada punta que cae sobre el
 * costado de otra calle se mete como vértice de esa calle. Después ya se puede
 * partir por vértices compartidos y soldar por cercanía.
 */

import type { Aerodrome, Punto } from './aerodrome';

/** A cuánto se consideran el mismo sitio dos puntas de calle, m. */
const SOLDADURA = 12;

/** Lado de la rejilla de redondeo. La mitad de la soldadura, para no perder pares. */
const REJILLA = SOLDADURA / 2;

export interface Tramo {
  /** Índice del nudo de salida. */
  readonly a: number;
  /** Índice del nudo de llegada. */
  readonly b: number;
  /** Metros que se recorren. */
  readonly largo: number;
  /** La letra de la calle, si la tiene. Es lo que se le enseña al jugador. */
  readonly ref: string | null;
  /** La geometría, para pintarla. Va de `a` a `b`. */
  readonly puntos: readonly Punto[];
}

export interface Grafo {
  readonly nudos: readonly Punto[];
  readonly tramos: readonly Tramo[];
  /** Tramos que salen de cada nudo, por índice de nudo. */
  readonly desde: readonly (readonly number[])[];
}

const clave = (p: Punto): string =>
  `${Math.round(p[0] / REJILLA)},${Math.round(p[1] / REJILLA)}`;

const largoDe = (puntos: readonly Punto[]): number => {
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    total += Math.hypot(puntos[i + 1]![0] - puntos[i]![0], puntos[i + 1]![1] - puntos[i]![1]);
  }
  return total;
};

/**
 * Construye el grafo de un aeródromo.
 *
 * Las calles de rodaje y, además, **la pista**: un avión que aterriza tiene que
 * poder salir de ella, y para el grafo la pista es una calle más —una por la
 * que solo se pasa con permiso, pero por la que se pasa—.
 */
export function construirGrafo(aero: Aerodrome): Grafo {
  const crudas = aero.taxiways
    .filter((c) => c.path.length > 1)
    .map((c) => ({ ref: c.ref ?? null, path: [...c.path] as Punto[] }));

  // ── Nodado: meter cada punta ajena en el costado sobre el que cae ────────
  //
  // Se inserta **el punto de la punta**, no su proyección, para que las dos
  // calles compartan coordenadas exactas. El desvío es como mucho la
  // soldadura, doce metros, que sobre una calle de veintitrés de ancho no se
  // nota y a cambio hace que el aeropuerto sea uno solo.
  const puntas: { calle: number; p: Punto }[] = [];
  crudas.forEach((c, i) => {
    puntas.push({ calle: i, p: c.path[0]! });
    puntas.push({ calle: i, p: c.path[c.path.length - 1]! });
  });

  crudas.forEach((calle, i) => {
    const nuevo: Punto[] = [calle.path[0]!];
    for (let k = 0; k < calle.path.length - 1; k++) {
      const a = calle.path[k]!;
      const b = calle.path[k + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      if (l2 > 0) {
        const encima: { t: number; p: Punto }[] = [];
        for (const { calle: j, p } of puntas) {
          if (j === i) continue;
          const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
          if (t <= 0.001 || t >= 0.999) continue;
          const d = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
          if (d <= SOLDADURA) encima.push({ t, p });
        }
        encima.sort((x, y) => x.t - y.t);
        for (const { p } of encima) {
          const ultimo = nuevo[nuevo.length - 1]!;
          if (Math.hypot(ultimo[0] - p[0], ultimo[1] - p[1]) > 0.5) nuevo.push(p);
        }
      }
      nuevo.push(b);
    }
    calle.path = nuevo;
  });

  // ── Cuántas calles pasan por cada vértice ────────────────────────────────
  const usos = new Map<string, number>();
  for (const c of crudas) {
    const vistos = new Set<string>();
    for (const p of c.path) {
      const k = clave(p);
      if (vistos.has(k)) continue;
      vistos.add(k);
      usos.set(k, (usos.get(k) ?? 0) + 1);
    }
  }

  // ── Partir por los cruces ────────────────────────────────────────────────
  const trozos: { ref: string | null; path: readonly Punto[] }[] = [];
  for (const calle of crudas) {
    let trozo: Punto[] = [];
    for (let i = 0; i < calle.path.length; i++) {
      const p = calle.path[i]!;
      trozo.push(p);
      if (i > 0 && i < calle.path.length - 1 && (usos.get(clave(p)) ?? 0) > 1) {
        trozos.push({ ref: calle.ref, path: trozo });
        trozo = [p];
      }
    }
    if (trozo.length > 1) trozos.push({ ref: calle.ref, path: trozo });
  }

  // ── Soldar los nudos ─────────────────────────────────────────────────────
  const nudos: Punto[] = [];
  const nudoDe = (p: Punto): number => {
    for (let i = 0; i < nudos.length; i++) {
      const n = nudos[i]!;
      if (Math.hypot(n[0] - p[0], n[1] - p[1]) <= SOLDADURA) return i;
    }
    nudos.push(p);
    return nudos.length - 1;
  };

  const tramos: Tramo[] = [];
  for (const t of trozos) {
    const a = nudoDe(t.path[0]!);
    const b = nudoDe(t.path[t.path.length - 1]!);
    if (a === b) continue;
    tramos.push({ a, b, largo: largoDe(t.path), ref: t.ref, puntos: t.path });
  }

  const desde: number[][] = nudos.map(() => []);
  tramos.forEach((t, i) => {
    desde[t.a]!.push(i);
    desde[t.b]!.push(i);
  });

  return { nudos, tramos, desde };
}

/** El nudo más cercano a un punto, y a cuánto está. */
export function nudoCercano(grafo: Grafo, p: Punto): { nudo: number; distancia: number } {
  let nudo = -1;
  let distancia = Infinity;
  grafo.nudos.forEach((n, i) => {
    const d = Math.hypot(n[0] - p[0], n[1] - p[1]);
    if (d < distancia) {
      distancia = d;
      nudo = i;
    }
  });
  return { nudo, distancia };
}

export interface Ruta {
  /** Los tramos por los que se pasa, en orden y ya orientados. */
  readonly tramos: readonly { readonly ref: string | null; readonly puntos: readonly Punto[] }[];
  /** La polilínea completa, de principio a fin. */
  readonly puntos: readonly Punto[];
  /** Metros de rodaje. */
  readonly largo: number;
  /** Las letras por las que se pasa, sin repetir seguidas. Es la instrucción. */
  readonly letras: readonly string[];
}

/**
 * El camino más corto entre dos nudos, con Dijkstra.
 *
 * Dijkstra y no A*: un aeropuerto tiene decenas de nudos, no millones, y aquí
 * la sencillez vale más que los microsegundos que ahorraría la heurística.
 */
export function rutaEntre(grafo: Grafo, desdeNudo: number, hastaNudo: number): Ruta | null {
  if (desdeNudo === hastaNudo) return { tramos: [], puntos: [], largo: 0, letras: [] };

  const coste = new Array<number>(grafo.nudos.length).fill(Infinity);
  const porTramo = new Array<number>(grafo.nudos.length).fill(-1);
  const cerrado = new Array<boolean>(grafo.nudos.length).fill(false);
  coste[desdeNudo] = 0;

  for (;;) {
    let actual = -1;
    let mejor = Infinity;
    for (let i = 0; i < coste.length; i++) {
      if (!cerrado[i] && coste[i]! < mejor) {
        mejor = coste[i]!;
        actual = i;
      }
    }
    if (actual === -1) break;
    if (actual === hastaNudo) break;
    cerrado[actual] = true;

    for (const iTramo of grafo.desde[actual]!) {
      const t = grafo.tramos[iTramo]!;
      const otro = t.a === actual ? t.b : t.a;
      const nuevo = mejor + t.largo;
      if (nuevo < coste[otro]!) {
        coste[otro] = nuevo;
        porTramo[otro] = iTramo;
      }
    }
  }

  if (coste[hastaNudo] === Infinity) return null;

  // Se deshace el camino desde el final, orientando cada tramo en el sentido
  // en que se recorre: la geometría de OSM va en el sentido que le vino bien a
  // quien la dibujó, y una ruta que salta de un lado a otro no se puede pintar.
  const pasos: { ref: string | null; puntos: Punto[] }[] = [];
  let nodo = hastaNudo;
  while (nodo !== desdeNudo) {
    const iTramo = porTramo[nodo]!;
    if (iTramo < 0) return null;
    const t = grafo.tramos[iTramo]!;
    const anterior = t.a === nodo ? t.b : t.a;
    const puntos = t.b === nodo ? [...t.puntos] : [...t.puntos].reverse();
    pasos.push({ ref: t.ref, puntos });
    nodo = anterior;
  }
  pasos.reverse();

  const puntos: Punto[] = [];
  for (const paso of pasos) {
    for (const p of paso.puntos) {
      const ultimo = puntos[puntos.length - 1];
      if (ultimo && Math.hypot(ultimo[0] - p[0], ultimo[1] - p[1]) < 0.5) continue;
      puntos.push(p);
    }
  }

  const letras: string[] = [];
  for (const paso of pasos) {
    if (paso.ref && paso.ref !== letras[letras.length - 1]) letras.push(paso.ref);
  }

  return { tramos: pasos, puntos, largo: coste[hastaNudo]!, letras };
}

/**
 * La ruta de rodaje entre dos puntos cualesquiera del aeropuerto.
 *
 * Devuelve `null` si alguno de los dos queda lejos de cualquier calle o si no
 * hay camino. Que no haya camino es un resultado legítimo y frecuente con
 * datos reales —hay aeropuertos con la plataforma mapeada y las calles no—, y
 * el juego tiene que saber apañárselas sin ruta, no reventar.
 */
export function rodajeEntre(
  grafo: Grafo,
  origen: Punto,
  destino: Punto,
  maxSalto = 220,
): Ruta | null {
  const a = nudoCercano(grafo, origen);
  const b = nudoCercano(grafo, destino);
  if (a.nudo < 0 || b.nudo < 0) return null;
  if (a.distancia > maxSalto || b.distancia > maxSalto) return null;
  return rutaEntre(grafo, a.nudo, b.nudo);
}
