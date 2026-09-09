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

import type { Aerodrome, Punto } from "./aerodrome";

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
  /**
   * Si esto es la pista y no una calle de rodaje.
   *
   * Hace falta fuera: para elegir una salida de pista hay que saber qué nudos
   * tienen de verdad una calle colgando, y no solo más pista.
   */
  readonly pista: boolean;
  /**
   * Lo que **cuesta** recorrerlo, que no siempre es lo que mide.
   *
   * Existe por la pista: está en el grafo porque después de aterrizar se rueda
   * por ella hasta la salida, pero no debe usarse como atajo para ir de un
   * lado del aeropuerto al otro. Con un coste alto el buscador solo la elige
   * cuando no hay otra, que es exactamente cuando estás encima.
   *
   * Sin esto, un aeropuerto con una calle paralela larga mandaba a todo el
   * mundo por la pista, que es de las cosas que más asustan a una torre.
   */
  readonly coste?: number;
}

export interface Grafo {
  readonly nudos: readonly Punto[];
  readonly tramos: readonly Tramo[];
  /** Tramos que salen de cada nudo, por índice de nudo. */
  readonly desde: readonly (readonly number[])[];
}

/**
 * Cuánto se encarece rodar por la pista frente a rodar por una calle.
 *
 * Seis: lo bastante para que cualquier rodeo razonable por calles gane, y no
 * tanto como para que el buscador se rinda cuando el único camino es la pista
 * —que es lo que pasa nada más aterrizar—.
 */
const PENALIZACION_PISTA = 6;

/**
 * Cuánto se perdona más allá del borde de la pista al coser una calle, m.
 *
 * Cinco. Las puntas de calle de OpenStreetMap no caen exactamente en el borde:
 * unas se quedan un poco cortas y otras se pasan. Más margen que este ya
 * empezaría a coser calles que pasan **al lado** de la pista sin tocarla.
 */
const MARGEN_DE_PISTA = 5;

const clave = (p: Punto): string =>
  `${Math.round(p[0] / REJILLA)},${Math.round(p[1] / REJILLA)}`;

const largoDe = (puntos: readonly Punto[]): number => {
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    total += Math.hypot(
      puntos[i + 1]![0] - puntos[i]![0],
      puntos[i + 1]![1] - puntos[i]![1],
    );
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
/**
 * Cada cuánto se pone un nudo a lo largo de la pista, m.
 *
 * **Una pista de tres kilómetros tenía dos nudos y los de sus cruces con las
 * calles, y nada más.** Como el buscador de rutas se agarra al nudo más
 * cercano y no al punto más cercano, pedirle que llevara a un sitio del eje
 * que cayera entre dos cruces era pedirle un imposible: en Tenerife Norte, el
 * punto por donde había que entrar en la pista quedaba a ciento veintiún
 * metros del nudo más próximo, así que contestaba «no hay camino» y el juego
 * caía a la recta de emergencia — la que cruza la hierba. «Me sale
 * atravesando el jardín, pues ya ves.»
 *
 * Ochenta metros: la pista pasa a tener cuarenta nudos en vez de dos, cualquier
 * punto de ella queda a menos de cuarenta de uno, y el camino sale por el
 * asfalto. Cuarenta nudos más en un grafo de cientos no se nota en ninguna
 * parte.
 */
const PASO_DE_PISTA = 80;

/** Parte una polilínea en trozos de como mucho `paso` metros. */
function densificar(path: Punto[], paso: number): Punto[] {
  const salida: Punto[] = [path[0]!];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const trozos = Math.max(1, Math.ceil(largo / paso));
    for (let k = 1; k <= trozos; k++) {
      const t = k / trozos;
      salida.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return salida;
}

export function construirGrafo(aero: Aerodrome): Grafo {
  /*
   * **Y la pista también es un camino por el que se rueda.**
   *
   * Estaba fuera del grafo, así que quien aterrizaba se encontraba con que la
   * ruta a casa **saltaba en línea recta** desde donde estaba hasta la calle
   * más cercana —hasta doscientos veinte metros—, cruzando la hierba: «lo de
   * salir por E4 me saca de la pista de asfalto».
   *
   * Y no era que la salida estuviera mal: es que no había manera de llegar a
   * ella rodando, porque el trozo de pista que hay entre las ruedas y la boca
   * de la salida no existía para el buscador.
   *
   * Va con un coste alto —ver `Tramo.coste`— para que se use solo cuando no
   * hay otra, que es justo cuando estás encima de ella.
   */
  const crudas = [
    ...aero.taxiways
      .filter((c) => c.path.length > 1)
      .map((c) => ({
        ref: c.ref ?? null,
        path: [...c.path] as Punto[],
        pista: false,
      })),
    ...aero.runways
      .filter((p) => p.centerline.length > 1)
      .map((p) => ({
        ref: p.ref ?? null,
        // **Partida en trozos**, y no de punta a punta. Ver `PASO_DE_PISTA`.
        path: densificar([...p.centerline] as Punto[], PASO_DE_PISTA),
        pista: true,
      })),
  ];

  /*
   * ── Coser las calles a la pista ──────────────────────────────────────────
   *
   * **Una calle que muere en el borde de la pista está conectada a la pista.**
   *
   * El nodado de abajo suelda puntas a doce metros, que es lo que mide una
   * soldadura entre dos calles. Pero una pista tiene cuarenta y cinco metros de
   * ancho, así que una calle de rodaje que llega hasta su borde se queda a
   * veintitrés del eje: para el grafo, a un mundo de distancia. Resultado: el
   * aeropuerto tenía la pista por un lado y las calles por otro, sin más
   * uniones que las de las dos cabeceras.
   *
   * De ahí salían dos cosas que se vieron jugando. Una, que no había ninguna
   * salida por intersección: para entrar en pista había que ir a la cabecera,
   * dos kilómetros y cuatro minutos de rodaje. Y otra, que al aterrizar la
   * ruta a casa saltaba en línea recta desde la pista hasta la calle más
   * cercana, por encima de la hierba — «salgo por E4 atravesando los
   * jardines».
   *
   * Así que la punta se **alarga hasta el eje** y ahí se suelda. El trozo que
   * se añade es medio ancho de pista de asfalto de verdad: es exactamente por
   * donde se entra y por donde se sale.
   */
  const pistas = aero.runways.filter((p) => p.centerline.length > 1);
  for (const calle of crudas) {
    if (calle.pista) continue;
    for (const extremo of [0, calle.path.length - 1]) {
      const p = calle.path[extremo]!;
      let mejor: { d: number; q: Punto } | null = null;
      for (const pista of pistas) {
        const media = (pista.widthM ?? 45) / 2;
        for (let i = 0; i < pista.centerline.length - 1; i++) {
          const a = pista.centerline[i]!;
          const b = pista.centerline[i + 1]!;
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const l2 = dx * dx + dy * dy;
          if (l2 < 1) continue;
          const t = Math.max(
            0,
            Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
          );
          const q: Punto = [a[0] + dx * t, a[1] + dy * t];
          const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
          // Ni pegada ya —eso lo resuelve el nodado— ni en el campo: solo las
          // que mueren dentro del asfalto de la pista o justo en su borde.
          if (d > media + MARGEN_DE_PISTA) continue;
          if (!mejor || d < mejor.d) mejor = { d, q };
        }
      }
      if (!mejor || mejor.d < 0.5) continue;
      if (extremo === 0) calle.path.unshift(mejor.q);
      else calle.path.push(mejor.q);
    }
  }

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
          if (Math.hypot(ultimo[0] - p[0], ultimo[1] - p[1]) > 0.5)
            nuevo.push(p);
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
  const trozos: {
    ref: string | null;
    path: readonly Punto[];
    pista: boolean;
  }[] = [];
  for (const calle of crudas) {
    let trozo: Punto[] = [];
    for (let i = 0; i < calle.path.length; i++) {
      const p = calle.path[i]!;
      trozo.push(p);
      /*
       * Se parte en los cruces y, **en la pista, en cada vértice**.
       *
       * Los nudos del grafo son las puntas de los trozos, así que partir solo
       * por los cruces dejaba la pista entera como un trozo único: tres
       * kilómetros con un nudo en cada punta. Y como el buscador se agarra al
       * nudo más cercano, entrar en la pista por un sitio que no fuera un
       * cruce era imposible — ciento veintiún metros hasta el nudo más
       * próximo, medido en Tenerife Norte. Partida cada ochenta metros, se
       * entra por donde toca. Ver `PASO_DE_PISTA`.
       */
      const corta = calle.pista || (usos.get(clave(p)) ?? 0) > 1;
      if (i > 0 && i < calle.path.length - 1 && corta) {
        trozos.push({ ref: calle.ref, path: trozo, pista: calle.pista });
        trozo = [p];
      }
    }
    if (trozo.length > 1)
      trozos.push({ ref: calle.ref, path: trozo, pista: calle.pista });
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
    const largo = largoDe(t.path);
    tramos.push({
      a,
      b,
      largo,
      ref: t.ref,
      puntos: t.path,
      pista: !!t.pista,
      coste: t.pista ? largo * PENALIZACION_PISTA : largo,
    });
  }

  const desde: number[][] = nudos.map(() => []);
  tramos.forEach((t, i) => {
    desde[t.a]!.push(i);
    desde[t.b]!.push(i);
  });

  return { nudos, tramos, desde };
}

/** El nudo más cercano a un punto, y a cuánto está. */
export function nudoCercano(
  grafo: Grafo,
  p: Punto,
): { nudo: number; distancia: number } {
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
  readonly tramos: readonly {
    readonly ref: string | null;
    readonly puntos: readonly Punto[];
  }[];
  /** La polilínea completa, de principio a fin. */
  readonly puntos: readonly Punto[];
  /** Metros de rodaje. */
  readonly largo: number;
  /**
   * Lo que la ruta se aparta del asfalto por sus dos puntas, m.
   *
   * Los tramos de en medio son aristas del grafo, o sea calles de rodaje; los
   * dos de las puntas los inventa el buscador para enganchar el principio y el
   * final, y son los únicos que pueden ir por la hierba. Quien llama lo usa
   * para descartar el atajo en diagonal por el campo.
   *
   * Lo dice el buscador y no se deduce mirando la polilínea, que era como se
   * hacía antes: desde que la ruta puede acabar **a mitad de arista** —ver
   * `recortada`—, su última pata puede ser calle de rodaje de verdad. En
   * Mariscal Estigarribia la calle entera es una sola arista de 262 m entre
   * dos nudos, y medir la polilínea daba un enganche de 203 m de asfalto: el
   * aeródromo se descartaba y el juego arrancaba ya autorizado.
   */
  readonly enganche: number;
  /** Las letras por las que se pasa, sin repetir seguidas. Es la instrucción. */
  readonly letras: readonly string[];
}

/**
 * El camino más corto entre dos nudos, con Dijkstra.
 *
 * Dijkstra y no A*: un aeropuerto tiene decenas de nudos, no millones, y aquí
 * la sencillez vale más que los microsegundos que ahorraría la heurística.
 */
export function rutaEntre(
  grafo: Grafo,
  desdeNudo: number,
  hastaNudo: number,
): Ruta | null {
  if (desdeNudo === hastaNudo)
    return { tramos: [], puntos: [], largo: 0, letras: [], enganche: 0 };

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
      const nuevo = mejor + (t.coste ?? t.largo);
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
      if (ultimo && Math.hypot(ultimo[0] - p[0], ultimo[1] - p[1]) < 0.5)
        continue;
      puntos.push(p);
    }
  }

  const letras: string[] = [];
  for (const paso of pasos) {
    if (paso.ref && paso.ref !== letras[letras.length - 1])
      letras.push(paso.ref);
  }

  return {
    tramos: pasos,
    puntos,
    largo: coste[hastaNudo]!,
    letras,
    enganche: 0,
  };
}

/**
 * La ruta se corta donde más se acerca al destino, no donde acaba la calle.
 *
 * El buscador de arriba solo sabe enganchar en los **nudos** del grafo, y un
 * punto de espera no tiene por qué caer en un nudo: el de Mariscal
 * Estigarribia está a mitad de la única calle del campo. Sin este recorte la
 * ruta se iba hasta el final de la calle y **volvía por el mismo sitio** para
 * llegar al punto de espera, que ya se había pisado noventa metros antes.
 *
 * Medido con el banco de despegue: ruta de 319 m para un rodaje de 228, el
 * avión parado a un metro del último punto y el juego diciendo, con razón, que
 * quedaban 92. La cuenta del plan no estaba mal; lo que estaba mal era la
 * ruta. Ver #151.
 *
 * El recorte nunca empeora el remate en línea recta que hace quien llama: el
 * punto por el que se corta es, por construcción, el más cercano al destino de
 * toda la polilínea. Pero sí puede quitar maniobra, así que solo se aplica
 * cuando el remate que había era largo de verdad. Ver `EL_TROCITO_QUE_FALTA`.
 */
function recortarAlDestino(
  pasos: { ref: string | null; puntos: Punto[] }[],
  destino: Punto,
): {
  pasos: { ref: string | null; puntos: Punto[] }[];
  quitado: number;
  cerca: number;
} {
  let mejor = { d: Infinity, paso: 0, i: 0, punto: destino, hasta: 0 };
  let acumulado = 0;
  for (let iPaso = 0; iPaso < pasos.length; iPaso++) {
    const puntos = pasos[iPaso]!.puntos;
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i]!;
      const b = puntos[i + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      const largo = Math.sqrt(l2);
      const t =
        l2 < 1e-9
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((destino[0] - a[0]) * dx + (destino[1] - a[1]) * dy) / l2,
              ),
            );
      const sobre: Punto = [a[0] + t * dx, a[1] + t * dy];
      const d = Math.hypot(destino[0] - sobre[0], destino[1] - sobre[1]);
      if (d < mejor.d) {
        mejor = {
          d,
          paso: iPaso,
          i,
          punto: sobre,
          hasta: acumulado + t * largo,
        };
      }
      acumulado += largo;
    }
  }
  // Sin tramos no hay nada que recortar, y con el punto más cercano al final
  // tampoco: el recorte se queda en un no-op y la ruta sale entera.
  if (mejor.d === Infinity) return { pasos, quitado: 0, cerca: Infinity };

  const cortados = pasos.slice(0, mejor.paso + 1).map((paso, iPaso) => {
    if (iPaso < mejor.paso) return paso;
    const puntos = paso.puntos.slice(0, mejor.i + 1);
    const ultimo = puntos[puntos.length - 1]!;
    if (
      Math.hypot(ultimo[0] - mejor.punto[0], ultimo[1] - mejor.punto[1]) > 0.5
    )
      puntos.push(mejor.punto);
    return { ref: paso.ref, puntos };
  });
  // Y un paso que se queda en un solo punto no es un tramo por el que se pase:
  // es el final de la ruta, y su letra no se canta.
  const limpios = cortados.filter(
    (paso, i) => paso.puntos.length > 1 || i < cortados.length - 1,
  );
  return { pasos: limpios, quitado: acumulado - mejor.hasta, cerca: mejor.d };
}

/**
 * Cuánto puede quedar el destino del final de la ruta sin que eso sea un
 * rodeo, m.
 *
 * Cuarenta es el mismo número que `SALTO_A_LA_ESPERA` en el plan de vuelo, y
 * por el mismo motivo: es el ancho de la boca de una calle donde se une a la
 * pista. Un punto de espera que queda a menos de eso del final de la ruta está
 * **en esa boca**, y el trozo de calle que lleva hasta él es la curva de
 * entrada; recortarla sería quitarle al avión la maniobra.
 *
 * Los dos casos, medidos: en Tenerife Norte el buscador acaba a 15,2 m del
 * punto de espera y los quince metros que sobran son el bulbo de giro —cortar
 * ahí dejó al avión dando vueltas trescientos cincuenta segundos a veintidós
 * metros de la doble raya—. En Mariscal Estigarribia acaba a 59,5 m, y esos
 * cincuenta y nueve son calle recorrida en el sentido contrario.
 */
const EL_TROCITO_QUE_FALTA = 40;

/** La misma ruta, cortada en su punto más cercano al destino. */
function recortada(ruta: Ruta, destino: Punto): Ruta {
  const fin = ruta.puntos[ruta.puntos.length - 1];
  if (
    !fin ||
    Math.hypot(fin[0] - destino[0], fin[1] - destino[1]) <= EL_TROCITO_QUE_FALTA
  )
    return ruta;

  const pasos = ruta.tramos.map((t) => ({
    ref: t.ref,
    puntos: [...t.puntos] as Punto[],
  }));
  const { pasos: cortados, quitado, cerca } = recortarAlDestino(pasos, destino);
  /*
   * **Y solo si la ruta llega de verdad hasta el destino.**
   *
   * Costó otra medida. Si el punto más cercano de toda la polilínea sigue
   * quedando lejos, el destino no está sobre esta ruta: está a campo través, y
   * cortar por ahí abarata un camino que no existe. En Mariscal Estigarribia
   * eso puso el juego en «autorizado» nada más cargar, con el motor en marcha
   * y sin haber rodado un metro: un punto de espera cualquiera salía a
   * doscientos metros de hierba y ganaba a la doble raya de verdad.
   */
  if (quitado < 0.5 || cerca > EL_TROCITO_QUE_FALTA) return ruta;

  const puntos: Punto[] = [];
  for (const paso of cortados) {
    for (const p of paso.puntos) {
      const ultimo = puntos[puntos.length - 1];
      if (ultimo && Math.hypot(ultimo[0] - p[0], ultimo[1] - p[1]) < 0.5)
        continue;
      puntos.push(p);
    }
  }
  const letras: string[] = [];
  for (const paso of cortados) {
    if (paso.ref && paso.ref !== letras[letras.length - 1])
      letras.push(paso.ref);
  }
  // El largo es un **coste**, no una longitud: cruzar una pista se paga caro
  // para que el buscador no lo elija por gusto. Restarle lo que se ha quitado
  // lo deja algo por encima de lo que cuesta de verdad cuando el trozo que se
  // va cruzaba pista, y eso es lo prudente: nunca hace parecer un camino más
  // barato de lo que es.
  return {
    tramos: cortados,
    puntos,
    largo: Math.max(0, ruta.largo - quitado),
    letras,
    enganche: ruta.enganche,
  };
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
  const entera = rutaEntre(grafo, a.nudo, b.nudo);
  if (!entera) return null;
  const ruta = recortada(entera, destino);

  // **La ruta empieza en las ruedas y acaba en el destino**, no en el nudo más
  // cercano a cada uno. Un puesto de estacionamiento puede estar a cien metros
  // de la calle más próxima, y sin estos dos remates la raya verde nacía lejos
  // del avión: al empezar la partida el juego decía «volvé a la raya verde»
  // antes de que nadie se hubiera movido.
  const puntos = [origen, ...ruta.puntos, destino].filter((p, i, todos) => {
    const anterior = todos[i - 1];
    return (
      !anterior || Math.hypot(anterior[0] - p[0], anterior[1] - p[1]) > 0.5
    );
  });
  // Y el remate se mide desde donde acaba la ruta de verdad, que con el
  // recorte ya no es el nudo del final: cobrarle al camino los noventa metros
  // que se le acaban de quitar lo haría perder contra uno peor.
  const fin = ruta.puntos[ruta.puntos.length - 1];
  const remate = fin
    ? Math.hypot(fin[0] - destino[0], fin[1] - destino[1])
    : b.distancia;
  return {
    ...ruta,
    puntos,
    largo: ruta.largo + a.distancia + remate,
    enganche: Math.max(a.distancia, remate),
  };
}
