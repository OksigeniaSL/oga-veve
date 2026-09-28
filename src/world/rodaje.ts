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

import { ANCHO_RODADURA, type Aerodrome, type Punto } from "./aerodrome";

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
  /**
   * Si por aquí no cabe el avión que se está volando.
   *
   * No es un dato del aeropuerto: depende de la envergadura. Un callejón
   * entre hangares por el que pasa la avioneta es un sitio donde el de
   * fuselaje ancho mete el ala dentro del hangar — medido en Silvio
   * Pettirossi, donde hay diecisiete edificios con una esquina a menos de
   * quince metros de un eje de calle y el peor a **cuatro y medio**.
   *
   * Contado jugando con el 747: «hay edificios en mitad de las calles de
   * rodadura y el ala del avión pasa a través de ellos, aquí no cabe un
   * avión».
   */
  readonly estrecho?: boolean;
}

export interface Grafo {
  readonly nudos: readonly Punto[];
  readonly tramos: readonly Tramo[];
  /** Tramos que salen de cada nudo, por índice de nudo. */
  readonly desde: readonly (readonly number[])[];
  /**
   * Si en ese punto hay pavimento por el que rodar: pista, calle o plataforma.
   *
   * Lo pregunta el buscador antes de tirar la recta que une un punto suelto
   * —el puesto, la doble raya, el avión— con la calle más cercana. Ver
   * `enganches`. Sin ella, cualquier recta vale, que es lo que hacía esto
   * antes y lo que siguen usando los grafos hechos a mano de las pruebas.
   */
  readonly rodable?: (p: Punto) => boolean;
  /**
   * Y si ese pavimento es **de una pista**. La recta del enganche no la
   * cuenta el buscador como pista, así que no puede ir por ella de gorra:
   * en Pedro Juan Caballero, a falta de calle, la raya del puesto a la
   * salida se enganchaba con doscientos treinta metros de recta **por encima
   * de la pista**. Ver `porPavimento`.
   */
  readonly enPista?: (p: Punto) => boolean;
  /** Y si es de una plataforma, que se cruza en recta. Ver `A_CAMPO_ABIERTO`. */
  readonly enPlataforma?: (p: Punto) => boolean;
}

/**
 * Cuánto se encarece un tramo por el que el avión no pasa sin rozar.
 *
 * Cuarenta: mucho más que la pista, porque esto no es una preferencia sino un
 * «por aquí no». Y **penalización y no prohibición**, por el mismo motivo que
 * con la pista: hay aeródromos donde la única salida del puesto es estrecha,
 * y dejar al avión sin ruta es peor que hacerle pasar justo. Lo que no puede
 * pasar es que se elija un callejón entre hangares **habiendo calle**.
 */
const PENALIZACION_ESTRECHO = 40;

/**
 * Lo que se le deja de sobra a cada punta de ala, en metros.
 *
 * Siete y medio. OACI pide entre 3 y 10,5 metros de margen entre la punta del
 * ala y un obstáculo según la clave de referencia del aeródromo; siete y
 * medio es el de la clave C, que es la de casi todos los campos del juego.
 */
const MARGEN_DE_ALA = 7.5;

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

export function construirGrafo(
  aero: Aerodrome,
  /**
   * Media envergadura del avión que va a rodar, en metros.
   *
   * Cero —lo de siempre— deja el grafo como estaba: todas las calles valen.
   * Con un valor, los tramos que no dejan pasar el ala se encarecen. Ver
   * `PENALIZACION_ESTRECHO`.
   */
  semiala = 0,
): Grafo {
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

  /*
   * Los edificios, con su caja envolvente, para no medir contra los ciento
   * treinta y cinco de Asunción en cada tramo.
   */
  const estorbos = (aero.buildings ?? []).map((e) => {
    const xs = e.polygon.map((p) => p[0]);
    const ys = e.polygon.map((p) => p[1]);
    return {
      poligono: e.polygon,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });

  const tramos: Tramo[] = [];
  for (const t of trozos) {
    const a = nudoDe(t.path[0]!);
    const b = nudoDe(t.path[t.path.length - 1]!);
    if (a === b) continue;
    const largo = largoDe(t.path);
    /*
     * Y si el ala no pasa, el tramo se encarece. La pista nunca es estrecha:
     * es lo más ancho que hay y además tiene su propia penalización.
     */
    const estrecho =
      !t.pista && semiala > 0 && aprieta(t.path, estorbos, semiala);
    const base = t.pista ? largo * PENALIZACION_PISTA : largo;
    tramos.push({
      a,
      b,
      largo,
      ref: t.ref,
      puntos: t.path,
      pista: !!t.pista,
      estrecho,
      coste: estrecho ? base * PENALIZACION_ESTRECHO : base,
    });
  }

  const desde: number[][] = nudos.map(() => []);
  tramos.forEach((t, i) => {
    desde[t.a]!.push(i);
    desde[t.b]!.push(i);
  });

  return {
    nudos,
    tramos,
    desde,
    rodable: pavimentoGuardado(aero, "todo", MARGEN_DEL_PAVIMENTO),
    enPista: pavimentoGuardado(aero, "pista", 0),
    enPlataforma: pavimentoGuardado(aero, "plataforma", MARGEN_DEL_PAVIMENTO),
  };
}

/**
 * Lo que se le perdona a un punto por caer fuera del pavimento dibujado, m:
 * **media calle de rodaje**.
 *
 * OpenStreetMap da las calles como un eje y un ancho, y las plataformas como
 * un polígono, y donde se juntan el dibujo no siempre se toca. En Los Rodeos,
 * entre la plataforma y la paralela quedan de siete a dieciséis metros sin
 * dibujar; en Tenerife Sur, las plataformas son islas con quince metros de
 * nada hasta la calle que las rodea. Y en la foto aérea que el juego pone
 * debajo, esas franjas son **hormigón**: es el dibujo el que está corto, no el
 * aeropuerto. Con un metro de holgura, la mitad de los puestos de Tenerife
 * Sur se quedaban sin salida.
 *
 * Media calle cose esas rendijas y no cose nada más: la hierba de verdad, la
 * que separa una paralela de su pista, son decenas de metros —ochenta y seis
 * en Los Rodeos—. Es la misma cuenta con la que la prueba de los dieciocho
 * campos dice qué es pisar hierba: ver `rodar-por-el-asfalto.test.ts`.
 */
export const MARGEN_DEL_PAVIMENTO = ANCHO_RODADURA / 2;

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
  /**
   * Metros de rodaje. **Metros, no coste.**
   *
   * Esto devolvía el coste de Dijkstra, que en la pista va multiplicado por
   * seis —ver `PENALIZACION_PISTA`—, y lo leía como distancia todo el que la
   * pedía. Medido en La Gomera: la ruta de vuelta a casa son 568 metros de
   * pista y 250 de calle, o sea unos 900, y aquí salía **3.720**. Con ese
   * número, `parDeSalida` comparaba puestos que no tocan la pista contra
   * puestos que sí con la vara de medir cambiada, el listón de «lo más que se
   * rueda para ir a despegar» se cruzaba sin rodar, y el jugador se quedaba
   * plantado en mitad del campo esperando una ruta que el juego creía
   * kilométrica.
   *
   * El coste sigue existiendo y sigue eligiendo el camino; lo que no puede es
   * llamarse metros.
   */
  readonly largo: number;
  /**
   * Lo que le costó al buscador, en metros equivalentes.
   *
   * Es lo que decide **qué** camino se elige —la pista va cara a propósito— y
   * no vale para medir nada del mundo. Se saca fuera para poder mirarlo.
   */
  readonly coste: number;
  /**
   * Si pasa por una calle en la que hay un avión parado. Solo pasa cuando no
   * hay otra: ver `Ocupados`.
   */
  readonly ocupada?: boolean;
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
  /**
   * Desde qué punto de `puntos` la geometría es **exacta** y no se alisa, si
   * lo es.
   *
   * Lo usa la media vuelta del back-taxi: es un arco trazado con el radio de
   * giro de ese avión, y pasado por el quitatemblores y el redondeo de codos
   * salía convertido en un codo de 2,66 m —más cerrado de lo que el reactor
   * puede girar— pedido a seis metros por segundo. Ver `backTaxiDesde` en
   * `plan-de-vuelo.ts`.
   */
  readonly exactaDesde?: number;
  /**
   * Y hasta qué punto, si lo exacto no llega al final de la ruta.
   *
   * La media vuelta del back-taxi acaba la ruta —de ahí se despega—, pero la
   * de volver por la pista después de aterrizar no: detrás vienen la salida y
   * las calles hasta el puesto, y esas se alisan como siempre. Sin esto el
   * arco se quedaba sin marcar o las calles salían con codos de ángulo recto.
   * Ver `vueltaPorLaPista` en `plan-de-vuelo.ts`.
   */
  readonly exactaHasta?: number;
}

/**
 * **Dónde hay un avión parado en las calles**, y cuánto ocupa.
 *
 * Existe por Los Rodeos: aterrizando, la raya verde y el coche del sígame
 * llevaron por una calle en la que un avión del tráfico esperaba en su doble
 * raya para salir. «Eso es un accidente seguro.» Y lo es: una torre de verdad
 * no te manda rodar por encima de quien está esperando, te da otra calle.
 *
 * `radio` es lo que tienen que separarse los dos ejes para que las alas no se
 * toquen: las dos semialas y el margen de ala. Un tramo que pasa más cerca
 * de un punto ocupado se encarece —ver `POR_UN_OCUPADO`—, así que se elige
 * otro camino **si lo hay**.
 *
 * **Y son los de otras calles, no los de tu cola.** Quien va a la misma pista
 * que vos, por delante, no es un estorbo que rodear: es el de delante, y
 * detrás de él se espera. Eso lo decide quien llama, que es quien sabe a dónde
 * va cada uno; ver `ocupadosAhora` en `plan-de-vuelo.ts`.
 */
export interface Ocupados {
  readonly puntos: readonly Punto[];
  readonly radio: number;
}

/*
 * ── Lo que se paga por cada cosa, y en qué orden ──────────────────────────
 *
 * **La pista no es una calle, y eso no se compra con metros.** Antes todo iba
 * en un solo número: la pista a seis veces lo que mide y la calle con un avión
 * parado a veinte kilómetros de más. Y dos precios en la misma moneda se
 * cambian el uno por el otro: con un avión parado en la paralela de Los
 * Rodeos, mil quinientos metros de pista costaban nueve mil y la paralela
 * veinte mil, así que la raya mandaba por la pista. Es justo lo que no se
 * hace: en Los Rodeos la paralela existe precisamente para que la pista no
 * sea una calle.
 *
 * Así que el buscador lleva la cuenta en dos estados, y en cada uno la pista
 * vale otra cosa:
 *
 * - **Todavía en la pista**, que es quien acaba de aterrizar y rueda hacia
 *   una salida. Ahí la pista es por donde se está, y seguir por ella hasta la
 *   salida siguiente es lo normal si la de delante tiene a alguien esperando:
 *   se paga a seis, como siempre, y un avión parado pesa más que eso. Es lo
 *   que dice una torre: «siga hasta la próxima».
 * - **Ya fuera de ella**, que es todo lo demás: del puesto a la doble raya,
 *   de la salida al puesto, el avión que se salió de la raya a media calle.
 *   Ahí volver a meterse en una pista pesa más que cualquier otra cosa junta
 *   —ver `POR_METRO_DE_PISTA`—: se rueda por pista solo si no hay otro
 *   camino, y entonces lo menos posible, que es cruzarla o entrar en ella
 *   para despegar. Y un avión parado en otra calle se rodea si hay por dónde,
 *   pero **nunca por la pista**.
 *
 * Van sumados con escalas que no se pisan —ningún rodeo de calle llega a lo
 * que pesa un avión parado, ni cien aviones a lo que pesa un metro de pista—,
 * que es la forma de comparar por orden sin dejar de usar Dijkstra.
 */

/** Lo que pesa un metro de pista para quien ya la ha dejado. */
const POR_METRO_DE_PISTA = 1e10;

/** Lo que pesa un tramo con un avión parado. Ver `Ocupados`. */
const POR_UN_OCUPADO = 1e7;

/** Lo que dista un punto de una polilínea, m. */
function aLaLinea(p: Punto, linea: readonly Punto[]): number {
  let mejor = Infinity;
  for (let i = 0; i < linea.length - 1; i++) {
    const [ax, ay] = linea[i]!;
    const [bx, by] = linea[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l));
    mejor = Math.min(mejor, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy));
  }
  return mejor;
}

/** Si por esta línea pasa cerca algún avión parado. Ver `Ocupados`. */
function pasaPorUnOcupado(
  linea: readonly Punto[],
  ocupados: Ocupados | undefined,
): boolean {
  if (!ocupados?.puntos.length || linea.length < 2) return false;
  return ocupados.puntos.some((p) => aLaLinea(p, linea) < ocupados.radio);
}

/** Los tramos por los que pasa cerca algún avión parado. Ver `Ocupados`. */
function tramosOcupados(grafo: Grafo, ocupados: Ocupados | undefined): Set<number> {
  const ocupadosAqui = new Set<number>();
  if (!ocupados?.puntos.length) return ocupadosAqui;
  grafo.tramos.forEach((t, i) => {
    if (pasaPorUnOcupado(t.puntos, ocupados)) ocupadosAqui.add(i);
  });
  return ocupadosAqui;
}

/**
 * Lo que cuesta una recta de enganche en la cuenta del buscador: sus metros y,
 * si va por encima de una pista y ya se ha dejado la pista, lo que pesan esos
 * metros de pista. Una recta **no es gratis por no ser un tramo**: desde la
 * doble raya de la 02 de Silvio Pettirossi, llegar al eje por la calle y
 * rodar treinta y cuatro metros de pista perdía contra saltar cuarenta y
 * cuatro por encima de ella en recta, que la cuenta no veía como pista.
 */
function laRecta(grafo: Grafo, a: Punto, b: Punto, fuera: boolean): number {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const enPista = grafo.enPista;
  if (!fuera || !enPista || d < 1e-6) return d * POR_METRO_DE_RECTA;
  const n = Math.max(1, Math.ceil(d / MUESTRA));
  let dentro = 0;
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) / n;
    if (enPista([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s])) dentro++;
  }
  return d * POR_METRO_DE_RECTA + (dentro / n) * d * POR_METRO_DE_PISTA;
}

/**
 * **Y una recta cuesta el doble que la calle que va al mismo sitio.** Las
 * rectas del enganche son para juntarse con la calle, no para sustituirla: en
 * Los Rodeos, recalculando en la paralela a cuarenta metros de la calle de la
 * doble raya, dos rectas de cuarenta —por la paralela hasta la esquina y de
 * la esquina a la doble raya— empataban con las dos calles que hacen lo
 * mismo, y la raya salía como un codo sin calle. Al doble, la calle gana
 * siempre que exista; y donde no hay más remedio —cruzar una plataforma hasta
 * su calle—, la recta sigue saliendo.
 */
const POR_METRO_DE_RECTA = 2;

/**
 * Lo que cuesta recorrer tantos metros de un tramo: la clave con la que
 * compara el buscador y el coste en metros equivalentes, que es lo que se
 * cuenta hacia fuera. `fuera` es si ya se ha dejado la pista. Ver arriba.
 */
function precio(
  t: Tramo,
  metros: number,
  ocupado: boolean,
  fuera: boolean,
): { clave: number; coste: number } {
  const porMetro = t.largo > 0 ? (t.coste ?? t.largo) / t.largo : 1;
  const coste = metros * porMetro;
  return {
    clave:
      (t.pista && fuera ? metros * POR_METRO_DE_PISTA : 0) +
      (ocupado ? POR_UN_OCUPADO : 0) +
      coste,
    coste,
  };
}

/**
 * **Dónde se engancha un punto suelto a las calles**: el punto de un tramo
 * más cercano, no el nudo más cercano.
 *
 * ## El fallo que arregla, que salía por cinco sitios
 *
 * El buscador enganchaba cada punta de la ruta al **nudo** más cercano y tiraba
 * una recta hasta él. Y los nudos solo están donde se cruzan dos calles, así
 * que el más cercano puede quedar a cien metros y al otro lado de un césped:
 *
 * - En Los Rodeos, saliendo por la 30, la doble raya está sobre la paralela a
 *   mitad de campo, y el nudo más cercano era la punta de una salida rápida,
 *   pegada a la pista. La ruta iba hasta allí y volvía a la doble raya
 *   cruzando la hierba en diagonal: «me haces salir a la pista para volver a
 *   entrar atravesando el jardín».
 * - En Tenerife Sur, del puesto al primer nudo había ciento nueve metros, y
 *   treinta y ocho de ellos eran campo.
 * - Y al recalcular a mitad de camino, con el avión y la doble raya enganchados
 *   **al mismo nudo**, la ruta era una recta de noventa metros de un sitio a
 *   otro, por donde cayera. Medido en Guaraní.
 *
 * Todos los remiendos que tuvo esto —el recorte al destino, el no pasarse de
 * largo, la recta de emergencia— eran maneras de tapar ese salto. La causa era
 * enganchar en el nudo.
 *
 * ## Lo que se hace
 *
 * Se proyecta el punto sobre **cada tramo** y se engancha donde cae, partiendo
 * el tramo en dos: si el avión está a mitad de la paralela, la ruta sale de
 * ahí mismo, hacia un lado o hacia el otro. Y la recta que va del punto a la
 * calle **se mira**: tiene que ir por pavimento de punta a punta. Si no va,
 * ese tramo no vale y se prueba el siguiente. Si ninguno vale, no hay ruta:
 * que no haya camino es una respuesta, inventarlo no.
 *
 * `desdeFuera` es para el avión que ya está en la hierba —se salió—: su recta
 * puede empezar fuera, pero una vez en el asfalto no puede volver a salirse.
 * Volver al pavimento no es un atajo; cruzar un césped para ahorrarse una
 * curva, sí.
 */
interface Enganche {
  readonly tramo: number;
  /** El punto del tramo donde se engancha. */
  readonly punto: Punto;
  /** Metros de tramo desde su principio hasta el punto. */
  readonly desdeA: number;
  /** Metros en línea recta del punto suelto al tramo. */
  readonly salto: number;
}

/** Cuántos enganches se prueban por punta, de los más cercanos. */
const ENGANCHES = 6;

/** Cada cuánto se mira que la recta del enganche vaya por pavimento, m. */
const MUESTRA = 2;

function enganches(
  grafo: Grafo,
  p: Punto,
  maxSalto: number,
  desdeFuera: boolean,
): Enganche[] {
  /*
   * Los puestos, los puntos de espera y los nudos se preguntan una y otra vez
   * —elegir el par de salida son cientos de rutas entre los mismos puntos—,
   * y buscar por dónde sale un puesto de una plataforma mal cosida cuesta.
   * Se guarda por grafo, y se vacía si crece: el avión pregunta cada vez
   * desde un sitio distinto.
   */
  let guardados = ENGANCHES_GUARDADOS.get(grafo);
  if (!guardados) ENGANCHES_GUARDADOS.set(grafo, (guardados = new Map()));
  const clave = `${p[0].toFixed(2)},${p[1].toFixed(2)},${maxSalto},${desdeFuera}`;
  const ya = guardados.get(clave);
  if (ya) return ya;
  if (guardados.size > 4000) guardados.clear();
  const hechos = buscarEnganches(grafo, p, maxSalto, desdeFuera);
  guardados.set(clave, hechos);
  return hechos;
}

const ENGANCHES_GUARDADOS = new WeakMap<Grafo, Map<string, Enganche[]>>();

function buscarEnganches(
  grafo: Grafo,
  p: Punto,
  maxSalto: number,
  desdeFuera: boolean,
): Enganche[] {
  const todos: Enganche[] = [];
  grafo.tramos.forEach((t, k) => {
    // Un tramo que sus nudos ya no nombran no es parte de la red: quien quita
    // una calle del grafo la quita de `desde`, y ahí no se engancha nadie.
    if (!grafo.desde[t.a]?.includes(k)) return;
    const pts = t.puntos;
    let mejor: Enganche | null = null;
    let recorrido = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      const l = Math.sqrt(l2);
      const u =
        l2 < 1e-9
          ? 0
          : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
      const q: Punto = [a[0] + dx * u, a[1] + dy * u];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (!mejor || d < mejor.salto)
        mejor = { tramo: k, punto: q, desdeA: recorrido + u * l, salto: d };
      recorrido += l;
    }
    if (mejor && mejor.salto <= maxSalto) todos.push(mejor);
  });
  todos.sort((x, y) => x.salto - y.salto);
  const buenos: Enganche[] = [];
  /*
   * Por la pista solo va la recta de quien ya está en ella —el avión que
   * rueda por ella, o el punto del eje al que se va para despegar—. Ver
   * `Grafo.enPista`. **Y no la de quien va a ella desde fuera**: desde la
   * doble raya de la 02 de Silvio Pettirossi la recta más corta al eje es una
   * diagonal de cuarenta y tres metros por encima del borde de la pista, y la
   * calle de entrada, que es por donde se entra, se quedaba sin usar.
   */
  const desdeLaPista = !!grafo.enPista?.(p);
  for (const e of todos) {
    if (buenos.length >= ENGANCHES) break;
    if (porPavimento(grafo, p, e.punto, desdeFuera, desdeLaPista)) buenos.push(e);
  }
  /*
   * **Y si la perpendicular cruza hierba, se busca por dónde no.**
   *
   * En Los Rodeos, entre la plataforma y la paralela hay en el dibujo una
   * franja de hierba de diez a quince metros, y las bocas que la cruzan no
   * llegan a tocar la plataforma: la perpendicular desde cualquier puesto cae
   * en la franja. La plataforma solo sale a la red por la calle que se mete
   * en ella en diagonal, y esa queda lejos en línea recta. Así que, si faltan
   * enganches, se prueba también a lo largo de los tramos más cercanos, de la
   * proyección hacia fuera, hasta dar con una recta limpia: es salir de la
   * plataforma por donde la plataforma sale.
   */
  for (const e of todos.slice(0, TRAMOS_QUE_SE_MIRAN)) {
    if (buenos.length >= ENGANCHES) break;
    if (buenos.some((b) => b.tramo === e.tramo)) continue;
    const otra = porOtroSitio(grafo, p, e, maxSalto, desdeFuera, desdeLaPista);
    if (otra) buenos.push(otra);
  }
  return buenos;
}

/** Cuántos tramos, de los más cercanos, se miran para enganchar. */
const TRAMOS_QUE_SE_MIRAN = 40;

/** Cada cuánto se prueba a lo largo de un tramo, m. Ver `porOtroSitio`. */
const PASO_POR_EL_TRAMO = 8;

/**
 * El punto del tramo de `e` más cercano a `p` al que se llega en recta por
 * pavimento, probando desde la proyección hacia las dos puntas. Ver
 * `enganches`.
 */
function porOtroSitio(
  grafo: Grafo,
  p: Punto,
  e: Enganche,
  maxSalto: number,
  desdeFuera: boolean,
  porLaPista: boolean,
): Enganche | null {
  const t = grafo.tramos[e.tramo]!;
  const candidatos: Enganche[] = [];
  for (let s = 0; s <= t.largo; s += PASO_POR_EL_TRAMO) {
    const q = puntoDelTramo(t, s);
    const salto = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (salto <= maxSalto) candidatos.push({ tramo: e.tramo, punto: q, desdeA: s, salto });
  }
  candidatos.sort((x, y) => x.salto - y.salto);
  for (const c of candidatos.slice(0, 40))
    if (porPavimento(grafo, p, c.punto, desdeFuera, porLaPista)) return c;
  return null;
}

/** El punto de un tramo a tantos metros de su principio. */
function puntoDelTramo(t: Tramo, s: number): Punto {
  const pts = t.puntos;
  let recorrido = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (recorrido + l >= s) {
      const u = l > 0 ? (s - recorrido) / l : 0;
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    }
    recorrido += l;
  }
  return pts[pts.length - 1]!;
}

/**
 * Si la recta de `p` a `q` va por pavimento, y por pista solo si se puede.
 * Ver `enganches` y `Grafo.enPista`.
 */
function porPavimento(
  grafo: Grafo,
  p: Punto,
  q: Punto,
  desdeFuera: boolean,
  porLaPista: boolean,
): boolean {
  const rodable = grafo.rodable;
  if (!rodable) return true;
  const pista = porLaPista ? null : grafo.enPista;
  const plataforma = grafo.enPlataforma;
  const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const n = Math.ceil(d / MUESTRA);
  let yaDentro = !desdeFuera;
  for (let k = 0; k <= n; k++) {
    const t = n > 0 ? k / n : 1;
    const x: Punto = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const dentro = rodable(x);
    if (dentro) yaDentro = true;
    else if (yaDentro) return false;
    if (pista?.(x)) return false;
    /*
     * Lejos de las dos puntas, solo por la plataforma —o por la pista, si se
     * puede ir por ella—: ver `A_CAMPO_ABIERTO`.
     */
    if (
      plataforma &&
      yaDentro &&
      Math.min(t, 1 - t) * d > A_CAMPO_ABIERTO &&
      !plataforma(x) &&
      !(porLaPista && grafo.enPista?.(x))
    )
      return false;
  }
  return yaDentro;
}

/**
 * Cuánto de la recta de un enganche puede ir por fuera de una plataforma, m,
 * contado desde cada punta.
 *
 * Una plataforma es asfalto para ir por donde se quiera: se cruza en recta del
 * puesto a la calle, que es lo que se hace. Una calle no: es un eje, y se va
 * por él. Sin este límite, la recta del enganche se escapaba por encima de
 * las calles —asfalto al fin y al cabo— para ahorrarse sus curvas, y de paso
 * se saltaba al avión que esperaba en ellas, que el buscador solo mira en los
 * tramos. Veinticinco metros son una calle entera y algo: lo que mide
 * juntarse con el eje desde un lado, cruzando además la rendija que el dibujo
 * deja entre la calle y la plataforma. Ver `MARGEN_DEL_PAVIMENTO`.
 */
const A_CAMPO_ABIERTO = 25;

/** El trozo de un tramo entre dos distancias desde su principio, orientado. */
function trozo(t: Tramo, desde: number, hasta: number): Punto[] {
  const pts = t.puntos;
  const del = Math.min(desde, hasta);
  const al = Math.max(desde, hasta);
  const salida: Punto[] = [];
  let recorrido = 0;
  const poner = (q: Punto) => {
    const ultimo = salida[salida.length - 1];
    if (!ultimo || Math.hypot(ultimo[0] - q[0], ultimo[1] - q[1]) > 0.01)
      salida.push(q);
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const en = (s: number): Punto => {
      const u = l > 0 ? Math.max(0, Math.min(1, (s - recorrido) / l)) : 0;
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    };
    if (recorrido + l >= del && recorrido <= al) {
      poner(en(Math.max(del, recorrido)));
      poner(en(Math.min(al, recorrido + l)));
    }
    recorrido += l;
  }
  if (!salida.length) salida.push(desde <= 0 ? pts[0]! : pts[pts.length - 1]!);
  return desde <= hasta ? salida : salida.reverse();
}

/** Un montón binario de estados por su clave: lo justo para Dijkstra. */
class Monton {
  private readonly estados: number[] = [];
  private readonly claves: number[] = [];
  get vacio(): boolean {
    return this.estados.length === 0;
  }
  meter(estado: number, clave: number): void {
    this.estados.push(estado);
    this.claves.push(clave);
    let i = this.estados.length - 1;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (this.claves[padre]! <= clave) break;
      this.cambiar(i, padre);
      i = padre;
    }
  }
  sacar(): { estado: number; clave: number } {
    const estado = this.estados[0]!;
    const clave = this.claves[0]!;
    const ultimoEstado = this.estados.pop()!;
    const ultimaClave = this.claves.pop()!;
    if (this.estados.length) {
      this.estados[0] = ultimoEstado;
      this.claves[0] = ultimaClave;
      let i = 0;
      for (;;) {
        const iz = 2 * i + 1;
        const de = iz + 1;
        let menor = i;
        if (iz < this.estados.length && this.claves[iz]! < this.claves[menor]!) menor = iz;
        if (de < this.estados.length && this.claves[de]! < this.claves[menor]!) menor = de;
        if (menor === i) break;
        this.cambiar(i, menor);
        i = menor;
      }
    }
    return { estado, clave };
  }
  private cambiar(i: number, j: number): void {
    [this.estados[i], this.estados[j]] = [this.estados[j]!, this.estados[i]!];
    [this.claves[i], this.claves[j]] = [this.claves[j]!, this.claves[i]!];
  }
}

/*
 * El buscador anda por **estados** y no por nudos: cada nudo dos veces,
 * según se haya dejado la pista o no. Ver «Lo que se paga». El estado de un
 * nudo es `2 · nudo + fuera`.
 */
const estadoDe = (nudo: number, fuera: boolean): number => nudo * 2 + (fuera ? 1 : 0);

/** Cómo se entra en la red: a qué estado, por qué trozo y cuánto cuesta. */
interface Semilla {
  readonly estado: number;
  readonly clave: number;
  readonly coste: number;
  readonly metros: number;
  readonly ocupado: boolean;
  /** El enganche del que sale, si sale de uno. */
  readonly enganche: Enganche | null;
  /** El trozo de calle del punto suelto al nudo, ya orientado. */
  readonly trozo: { readonly ref: string | null; readonly puntos: Punto[] } | null;
}

/**
 * Dijkstra desde las semillas. Devuelve lo que cuesta llegar a cada estado y
 * por dónde se llegó: por un tramo desde otro estado, o desde una semilla.
 *
 * Dijkstra y no A*: un aeropuerto tiene decenas de nudos, no millones, y aquí
 * la sencillez vale más que los microsegundos que ahorraría la heurística.
 */
function dijkstra(
  grafo: Grafo,
  semillas: readonly Semilla[],
  ocupadosAqui: ReadonlySet<number>,
): {
  clave: Float64Array;
  porTramo: Int32Array;
  anterior: Int32Array;
  semilla: Int32Array;
} {
  const n = grafo.nudos.length * 2;
  const clave = new Float64Array(n).fill(Infinity);
  const porTramo = new Int32Array(n).fill(-1);
  const anterior = new Int32Array(n).fill(-1);
  const semilla = new Int32Array(n).fill(-1);
  const cerrado = new Uint8Array(n);
  const monton = new Monton();
  semillas.forEach((s, i) => {
    if (s.clave < clave[s.estado]!) {
      clave[s.estado] = s.clave;
      semilla[s.estado] = i;
      porTramo[s.estado] = -1;
      monton.meter(s.estado, s.clave);
    }
  });
  while (!monton.vacio) {
    const { estado: actual, clave: c } = monton.sacar();
    if (cerrado[actual] || c > clave[actual]!) continue;
    cerrado[actual] = 1;
    const nudo = actual >> 1;
    const fuera = (actual & 1) === 1;
    for (const iTramo of grafo.desde[nudo]!) {
      const t = grafo.tramos[iTramo]!;
      const otro = estadoDe(t.a === nudo ? t.b : t.a, fuera || !t.pista);
      if (cerrado[otro]) continue;
      const nuevo = c + precio(t, t.largo, ocupadosAqui.has(iTramo), fuera).clave;
      if (nuevo < clave[otro]!) {
        clave[otro] = nuevo;
        porTramo[otro] = iTramo;
        anterior[otro] = actual;
        semilla[otro] = -1;
        monton.meter(otro, nuevo);
      }
    }
  }
  return { clave, porTramo, anterior, semilla };
}

/**
 * Deshace el camino hasta un estado, con los tramos orientados en el sentido
 * en que se recorren: la geometría de OSM va en el sentido que le vino bien a
 * quien la dibujó, y una ruta que salta de un lado a otro no se puede pintar.
 */
function camino(
  grafo: Grafo,
  semillas: readonly Semilla[],
  hecho: ReturnType<typeof dijkstra>,
  ocupadosAqui: ReadonlySet<number>,
  estado: number,
): {
  pasos: { ref: string | null; puntos: Punto[] }[];
  metros: number;
  coste: number;
  ocupada: boolean;
  enganche: Enganche | null;
} | null {
  const pasos: { ref: string | null; puntos: Punto[] }[] = [];
  let metros = 0;
  let coste = 0;
  let ocupada = false;
  let aqui = estado;
  for (let vueltas = 0; vueltas <= hecho.clave.length; vueltas++) {
    const s = hecho.semilla[aqui]!;
    if (s >= 0) {
      const sem = semillas[s]!;
      if (sem.trozo) pasos.push(sem.trozo);
      metros += sem.metros;
      coste += sem.coste;
      ocupada ||= sem.ocupado;
      pasos.reverse();
      return { pasos, metros, coste, ocupada, enganche: sem.enganche };
    }
    const iTramo = hecho.porTramo[aqui]!;
    const antes = hecho.anterior[aqui]!;
    if (iTramo < 0 || antes < 0) return null;
    const t = grafo.tramos[iTramo]!;
    const nudo = aqui >> 1;
    pasos.push({
      ref: t.ref,
      puntos: t.b === nudo ? [...t.puntos] : [...t.puntos].reverse(),
    });
    metros += t.largo;
    coste += t.coste ?? t.largo;
    if (ocupadosAqui.has(iTramo)) ocupada = true;
    aqui = antes;
  }
  return null;
}

/** Cose los pasos en una polilínea, sin puntos repetidos en las costuras. */
function coser(
  pasos: readonly { readonly puntos: readonly Punto[] }[],
  inicio: readonly Punto[] = [],
  fin: readonly Punto[] = [],
): Punto[] {
  const puntos: Punto[] = [];
  const poner = (p: Punto) => {
    const ultimo = puntos[puntos.length - 1];
    if (ultimo && Math.hypot(ultimo[0] - p[0], ultimo[1] - p[1]) < 0.5) return;
    puntos.push(p);
  };
  for (const p of inicio) poner(p);
  for (const paso of pasos) for (const p of paso.puntos) poner(p);
  for (const p of fin) poner(p);
  return puntos;
}

function letrasDe(pasos: readonly { readonly ref: string | null }[]): string[] {
  const letras: string[] = [];
  for (const paso of pasos) {
    if (paso.ref && paso.ref !== letras[letras.length - 1]) letras.push(paso.ref);
  }
  return letras;
}

/**
 * El camino más corto entre dos nudos. Ver `dijkstra`. Se sale de un nudo
 * como quien sale de una calle: sin haber estado en la pista.
 */
export function rutaEntre(
  grafo: Grafo,
  desdeNudo: number,
  hastaNudo: number,
  ocupados?: Ocupados,
): Ruta | null {
  if (desdeNudo === hastaNudo)
    return {
      tramos: [],
      puntos: [],
      largo: 0,
      coste: 0,
      ocupada: false,
      letras: [],
      enganche: 0,
    };
  const ocupadosAqui = tramosOcupados(grafo, ocupados);
  const semillas: Semilla[] = [
    {
      estado: estadoDe(desdeNudo, true),
      clave: 0,
      coste: 0,
      metros: 0,
      ocupado: false,
      enganche: null,
      trozo: null,
    },
  ];
  const hecho = dijkstra(grafo, semillas, ocupadosAqui);
  const llegada = estadoDe(hastaNudo, true);
  if (hecho.clave[llegada] === Infinity) return null;
  const c = camino(grafo, semillas, hecho, ocupadosAqui, llegada);
  if (!c) return null;
  return {
    tramos: c.pasos,
    puntos: coser(c.pasos),
    largo: c.metros,
    coste: c.coste,
    ocupada: c.ocupada,
    letras: letrasDe(c.pasos),
    enganche: 0,
  };
}

/**
 * Las rutas de rodaje desde un punto cualquiera del aeropuerto a otros.
 *
 * Empiezan en `origen` y acaban en cada destino, enganchando cada uno a la calle
 * más cercana **por donde cae** y no por el nudo más próximo. Ver `enganches`.
 *
 * Devuelve `null` si alguno de los dos no llega al pavimento por pavimento, o
 * si no hay camino. Que no haya camino es un resultado legítimo y frecuente
 * con datos reales —hay aeropuertos con la plataforma mapeada y las calles
 * no—, y el juego tiene que saber apañárselas sin ruta, no reventar ni
 * inventarse una recta.
 */
export function rodajesDesde(
  grafo: Grafo,
  origen: Punto,
  destinos: readonly Punto[],
  maxSalto = 220,
  /** Los aviones parados que hay que rodear si se puede. Ver `Ocupados`. */
  ocupados?: Ocupados,
  opciones: {
    /**
     * Si el origen es el avión, que puede estar ya fuera del asfalto: se le
     * deja volver a él por lo más corto. Ver `enganches`.
     */
    readonly desdeFuera?: boolean;
    /**
     * Si el destino es un punto del eje de la pista y hay que llegar a él
     * **por la pista**. Las calles se cosen hasta el eje —ver «Coser las
     * calles a la pista»—, así que el último trozo de cada una va por encima
     * del asfalto de la pista, y un punto del eje puede caer al lado de él.
     * Llegando por ahí, la raya de entrada acababa a medio girar, sin la
     * media vuelta que pide una calle que llega a la pista al revés —la de
     * la 02 de Silvio Pettirossi—. Ver `entradaEnPista` en `plan-de-vuelo.ts`.
     */
    readonly alEje?: boolean;
    /**
     * Si el origen es la boca de una salida de pista y de ahí **se sale por
     * la calle**. Sin esto, desde la boca el buscador podía seguir por la
     * pista —quien aún está en ella la paga a seis— y lo hacía para rodear a
     * un avión que esperaba en esa calle: en Los Rodeos, por la 12, la raya
     * de vuelta tomaba la salida de mitad de campo y remontaba mil metros de
     * pista hasta la siguiente. Una salida ocupada se cambia por otra antes de
     * tomarla —ver `SALIDA_OCUPADA` en `plan-de-vuelo.ts`—, no rodando hacia
     * atrás por la pista.
     */
    readonly desdeLaCalle?: boolean;
  } = {},
): (Ruta | null)[] {
  const salidas = enganches(grafo, origen, maxSalto, !!opciones.desdeFuera).filter(
    (e) => !opciones.desdeLaCalle || !grafo.tramos[e.tramo]!.pista,
  );
  if (!salidas.length) return destinos.map(() => null);
  const ocupadosAqui = tramosOcupados(grafo, ocupados);

  /*
   * Cada enganche del origen entra en la red por los dos nudos de su tramo,
   * con el trozo de tramo que hay hasta cada uno: un avión a mitad de calle
   * puede tirar hacia cualquiera de las dos puntas. Y quien se engancha a la
   * pista está todavía en ella: ver «Lo que se paga».
   */
  const semillas: Semilla[] = [];
  for (const e of salidas) {
    const t = grafo.tramos[e.tramo]!;
    const fuera = !t.pista;
    for (const [nudo, hasta] of [
      [t.a, 0],
      [t.b, t.largo],
    ] as const) {
      const puntos = trozo(t, e.desdeA, hasta);
      const metros = Math.abs(hasta - e.desdeA);
      // Y la recta del enganche también pasa por donde pasa.
      const ocupado =
        pasaPorUnOcupado(puntos, ocupados) ||
        pasaPorUnOcupado([origen, e.punto], ocupados);
      const p = precio(t, metros, ocupado, fuera);
      semillas.push({
        estado: estadoDe(nudo, fuera),
        clave: laRecta(grafo, origen, e.punto, fuera) + p.clave,
        coste: e.salto + p.coste,
        metros: e.salto + metros,
        ocupado,
        enganche: e,
        trozo: { ref: t.ref, puntos },
      });
    }
  }
  const hecho = dijkstra(grafo, semillas, ocupadosAqui);

  /*
   * Y desde ahí, a cada destino: el buscador corre una vez por origen, y lo
   * que cambia de un destino a otro es solo el último trozo. Elegir el par de
   * salida son cientos de rutas desde unos pocos puestos, y así cuestan lo que
   * cuestan unos pocos Dijkstra.
   */
  const alDestino = (destino: Punto): Ruta | null => {
    const llegadas = enganches(grafo, destino, maxSalto, false).filter(
      (e) => !opciones.alEje || grafo.tramos[e.tramo]!.pista,
    );
    if (!llegadas.length) return null;
    interface Hecha {
      pasos: { ref: string | null; puntos: Punto[] }[];
      metros: number;
      coste: number;
      ocupada: boolean;
      desde: Enganche;
      hasta: Enganche;
    }
    let mejor: { clave: number; armar: () => Hecha | null } | null = null;

    for (const f of llegadas) {
      const u = grafo.tramos[f.tramo]!;
      // Desde cada punta del tramo donde cae el destino, y en los dos estados.
      for (const [nudo, desde] of [
        [u.a, 0],
        [u.b, u.largo],
      ] as const)
        for (const fuera of [false, true]) {
          const estado = estadoDe(nudo, fuera);
          const base = hecho.clave[estado]!;
          if (base === Infinity) continue;
          const puntos = trozo(u, desde, f.desdeA);
          const metros = Math.abs(f.desdeA - desde);
          const ocupado =
            pasaPorUnOcupado(puntos, ocupados) ||
            pasaPorUnOcupado([f.punto, destino], ocupados);
          const p = precio(u, metros, ocupado, fuera);
          const clave = base + p.clave + laRecta(grafo, f.punto, destino, fuera);
          if (mejor && clave >= mejor.clave) continue;
          mejor = {
            clave,
            armar: () => {
              const c = camino(grafo, semillas, hecho, ocupadosAqui, estado);
              if (!c?.enganche) return null;
              return {
                pasos: [...c.pasos, { ref: u.ref, puntos }],
                metros: c.metros + metros + f.salto,
                coste: c.coste + p.coste + f.salto,
                ocupada: c.ocupada || ocupado,
                desde: c.enganche,
                hasta: f,
              };
            },
          };
        }
      /*
       * Y si origen y destino caen en el mismo tramo, **por el tramo**, sin
       * pasar por ningún nudo. Es el caso de la doble raya a mitad de la única
       * calle de Mariscal Estigarribia, y el de recalcular a mitad de la
       * paralela con la doble raya más adelante en ella.
       */
      for (const e of salidas) {
        if (e.tramo !== f.tramo) continue;
        const puntos = trozo(u, e.desdeA, f.desdeA);
        const metros = Math.abs(f.desdeA - e.desdeA);
        const ocupado =
          pasaPorUnOcupado(puntos, ocupados) ||
          pasaPorUnOcupado([origen, e.punto], ocupados) ||
          pasaPorUnOcupado([f.punto, destino], ocupados);
        const p = precio(u, metros, ocupado, !u.pista);
        const clave =
          laRecta(grafo, origen, e.punto, !u.pista) +
          p.clave +
          laRecta(grafo, f.punto, destino, !u.pista);
        if (mejor && clave >= mejor.clave) continue;
        mejor = {
          clave,
          armar: () => ({
            pasos: [{ ref: u.ref, puntos }],
            metros: e.salto + metros + f.salto,
            coste: e.salto + p.coste + f.salto,
            ocupada: ocupado,
            desde: e,
            hasta: f,
          }),
        };
      }
    }
    const hecha = mejor?.armar();
    if (!hecha) return null;
    const pasos = hecha.pasos.filter((paso) => paso.puntos.length > 1);
    return {
      tramos: pasos,
      // La ruta empieza en las ruedas y acaba en el destino, no en la calle: un
      // puesto puede estar a cien metros de ella, cruzando la plataforma.
      puntos: coser(pasos, [origen], [destino]),
      largo: hecha.metros,
      coste: hecha.coste,
      ocupada: hecha.ocupada,
      letras: letrasDe(pasos),
      enganche: Math.max(hecha.desde.salto, hecha.hasta.salto),
    };
  };
  return destinos.map(alDestino);
}

/** La ruta entre dos puntos. Ver `rodajesDesde`, que es quien la busca. */
export function rodajeEntre(
  grafo: Grafo,
  origen: Punto,
  destino: Punto,
  maxSalto = 220,
  ocupados?: Ocupados,
  opciones: Parameters<typeof rodajesDesde>[5] = {},
): Ruta | null {
  return rodajesDesde(grafo, origen, [destino], maxSalto, ocupados, opciones)[0] ?? null;
}

/**
 * Si una recta entre dos puntos va por pavimento de punta a punta, pista
 * incluida. Es la regla de las rectas de enganche para quien traza a mano
 * sobre la pista: ver `entradaEnPista` en `plan-de-vuelo.ts`.
 */
export function rectaPorPavimento(grafo: Grafo, a: Punto, b: Punto): boolean {
  return porPavimento(grafo, a, b, false, true);
}

/**
 * **Si en un punto hay pavimento**, con la cuenta de `enElPavimento` —y el
 * margen también alrededor de las plataformas, ver `MARGEN_DEL_PAVIMENTO`—
 * pero sin recorrer el aeropuerto entero cada vez.
 *
 * El buscador lo pregunta cada dos metros de cada recta de enganche, y un
 * aeropuerto grande son ochenta calles y catorce plataformas: preguntándolo a
 * lo bruto, las pruebas de rodaje pasaron de segundos a minutos. Así que las
 * piezas se reparten una vez en una rejilla y cada pregunta mira solo las de
 * su casilla.
 */
/**
 * `pavimentoDe`, hecho la primera vez que se pregunta y guardado por
 * aeródromo: un campo tiene su grafo para quien juega y otro por cada tipo
 * del tráfico, y el pavimento es el mismo para todos.
 */
function pavimentoGuardado(
  aero: Aerodrome,
  que: "todo" | "pista" | "plataforma",
  margen: number,
): (p: Punto) => boolean {
  let hecho: ((p: Punto) => boolean) | null = null;
  return (p) => {
    if (!hecho) {
      let delCampo = PAVIMENTOS.get(aero);
      if (!delCampo) PAVIMENTOS.set(aero, (delCampo = new Map()));
      const clave = `${que}:${margen}`;
      hecho = delCampo.get(clave) ?? null;
      if (!hecho) {
        const solo =
          que === "pista"
            ? { ...aero, taxiways: [], aprons: [] }
            : que === "plataforma"
              ? { ...aero, runways: [], taxiways: [] }
              : aero;
        hecho = pavimentoDe(solo, margen);
        delCampo.set(clave, hecho);
      }
    }
    return hecho(p);
  };
}

const PAVIMENTOS = new WeakMap<Aerodrome, Map<string, (p: Punto) => boolean>>();

function pavimentoDe(aero: Aerodrome, margen: number): (p: Punto) => boolean {
  /*
   * Casillas de dieciséis metros: de sesenta y cuatro, una casilla de Gran
   * Canaria llevaba dentro media plataforma y una docena de calles, y la
   * cuenta se comía casi medio segundo al elegir la salida. Y las casillas
   * que caen enteras dentro de una plataforma se apuntan aparte: ahí la
   * respuesta es «sí» sin mirar nada.
   */
  const CASILLA = 16;
  type Pieza =
    | { readonly a: Punto; readonly b: Punto; readonly media: number }
    | { readonly poligono: readonly Punto[] };
  const casillas = new Map<number, Pieza[]>();
  const llenas = new Set<number>();
  const claveDe = (i: number, j: number) => i * 100003 + j;
  const poner = (pieza: Pieza, minX: number, minY: number, maxX: number, maxY: number) => {
    for (let i = Math.floor(minX / CASILLA); i <= Math.floor(maxX / CASILLA); i++)
      for (let j = Math.floor(minY / CASILLA); j <= Math.floor(maxY / CASILLA); j++) {
        const k = claveDe(i, j);
        let lista = casillas.get(k);
        if (!lista) casillas.set(k, (lista = []));
        lista.push(pieza);
      }
  };
  const linea = (eje: readonly Punto[], media: number, cerrada = false) => {
    const n = cerrada ? eje.length : eje.length - 1;
    for (let i = 0; i < n; i++) {
      const a = eje[i]!;
      const b = eje[(i + 1) % eje.length]!;
      poner(
        { a, b, media },
        Math.min(a[0], b[0]) - media,
        Math.min(a[1], b[1]) - media,
        Math.max(a[0], b[0]) + media,
        Math.max(a[1], b[1]) + media,
      );
    }
  };
  for (const pista of aero.runways) linea(pista.centerline, (pista.widthM ?? 45) / 2 + margen);
  for (const calle of aero.taxiways)
    linea(calle.path, (calle.widthM ?? ANCHO_RODADURA) / 2 + margen);
  for (const plataforma of aero.aprons) {
    const poligono = plataforma.polygon;
    if (poligono.length < 3) continue;
    // El margen alrededor de la plataforma es el de su borde, como una calle.
    if (margen > 0) linea(poligono, margen, true);
    const xs = poligono.map((q) => q[0]);
    const ys = poligono.map((q) => q[1]);
    const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
    const [maxX, maxY] = [Math.max(...xs), Math.max(...ys)];
    const pieza: Pieza = { poligono };
    // Las casillas que pisa el borde, andándolo a medio paso de casilla.
    const borde = new Set<number>();
    for (let v = 0; v < poligono.length; v++) {
      const a = poligono[v]!;
      const b = poligono[(v + 1) % poligono.length]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(l / (CASILLA / 2)));
      for (let s = 0; s <= n; s++) {
        const x = a[0] + ((b[0] - a[0]) * s) / n;
        const y = a[1] + ((b[1] - a[1]) * s) / n;
        for (const dx of [-1, 0, 1])
          for (const dy of [-1, 0, 1])
            borde.add(claveDe(Math.floor(x / CASILLA) + dx, Math.floor(y / CASILLA) + dy));
      }
    }
    for (let i = Math.floor(minX / CASILLA); i <= Math.floor(maxX / CASILLA); i++)
      for (let j = Math.floor(minY / CASILLA); j <= Math.floor(maxY / CASILLA); j++) {
        const k = claveDe(i, j);
        if (llenas.has(k)) continue;
        if (!borde.has(k)) {
          // Sin borde dentro, la casilla está entera dentro o entera fuera.
          if (dentroDe([(i + 0.5) * CASILLA, (j + 0.5) * CASILLA], poligono)) llenas.add(k);
          continue;
        }
        let lista = casillas.get(k);
        if (!lista) casillas.set(k, (lista = []));
        lista.push(pieza);
      }
  }
  return (p) => {
    const k = claveDe(Math.floor(p[0] / CASILLA), Math.floor(p[1] / CASILLA));
    if (llenas.has(k)) return true;
    const lista = casillas.get(k);
    if (!lista) return false;
    for (const pieza of lista) {
      if ("poligono" in pieza) {
        if (dentroDe(p, pieza.poligono)) return true;
      } else if (alSegmento(p, pieza.a, pieza.b) < pieza.media) return true;
    }
    return false;
  };
}


/** Punto dentro de un polígono, por el número de cruces. */
function dentroDe(p: Punto, poligono: readonly Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i]!;
    const b = poligono[j]!;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      dentro = !dentro;
  }
  return dentro;
}

/** Si el ala de este avión no pasa por este tramo sin rozar un edificio. */
function aprieta(
  path: readonly Punto[],
  estorbos: readonly {
    poligono: readonly Punto[];
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }[],
  semiala: number,
): boolean {
  const holgura = semiala + MARGEN_DE_ALA;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const minX = Math.min(a[0], b[0]) - holgura;
    const maxX = Math.max(a[0], b[0]) + holgura;
    const minY = Math.min(a[1], b[1]) - holgura;
    const maxY = Math.max(a[1], b[1]) + holgura;
    for (const e of estorbos) {
      if (e.maxX < minX || e.minX > maxX || e.maxY < minY || e.minY > maxY)
        continue;
      for (const v of e.poligono) if (alSegmento(v, a, b) < holgura) return true;
    }
  }
  return false;
}

/** Distancia de un punto a un segmento, en metros. */
function alSegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const u = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
  );
  return Math.hypot(p[0] - (a[0] + dx * u), p[1] - (a[1] + dy * u));
}
