/**
 * La ruta del plan de vuelo: por qué puntos se va, cuánto falta y dónde se
 * empieza a bajar.
 *
 * ## Por qué existe
 *
 * Hasta aquí ir a otro aeropuerto era una raya recta de pista a pista, y lo
 * dijo quien lo voló: «el mapa pone una línea recta, pero para tomar la pista
 * recto y estable tengo que abrirme, para eso existen los planes de vuelo». Y
 * es exactamente así. **Nadie vuela de un aeropuerto a otro en línea recta**:
 * se sale por una salida publicada, se va por puntos con nombre y se llega por
 * una aproximación que acaba alineada con la pista a diez millas, no en el
 * centro del aeropuerto. La recta llevaba al avión al campo con cualquier
 * rumbo, y desde ahí hay que inventarse la vuelta para entrar en final; la
 * ruta de verdad te deja en el eje con tiempo para estabilizar, que es de lo
 * que va una aproximación.
 *
 * Los puntos no se inventan: salen de las cartas publicadas. Ver
 * `world/procedimientos.ts`. Aquí solo está la geometría, sin mundo, sin
 * escena y sin datos: se puede comprobar sin volar.
 *
 * ## Las tres cuentas que se enseñan
 *
 * - **Lo que falta, por la ruta.** No la recta hasta el destino: la suma de
 *   los tramos que quedan, que es lo que marca cualquier ordenador de vuelo y
 *   lo que de verdad hay que volar.
 * - **Cuándo se llega**, tramo a tramo y con el viento de cada uno: un tramo
 *   con el viento de cara se vuela más despacio sobre el suelo que el de
 *   vuelta, aunque el avión lleve la misma velocidad. Ver `segundosHastaElFinal`.
 * - **Dónde se empieza a bajar**, con la regla de siempre: tres millas por
 *   cada mil pies que haya que perder. Ver `distanciaDeDescenso`.
 */

/** Una milla náutica, en metros. La misma que la de la carta. */
export const MILLA = 1852;

/** Un pie, en metros. */
export const PIE = 0.3048;

/** Un punto del mundo del juego, en metros: `x` al este y `z` al sur. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/**
 * Qué es cada punto dentro del plan.
 *
 * - `despegue`: la cabecera por la que se sale, rotulada como la rotula un
 *   ordenador de vuelo, «RW30».
 * - `salida`: un punto de una salida publicada.
 * - `ruta`: uno de en medio. Se deja por si hace falta; hoy las rutas entre
 *   islas van de la salida a la llegada sin nada entre medias, que es como
 *   se vuelan.
 * - `iaf`, `if`, `faf`: los tres de la aproximación — el de inicio, el
 *   intermedio (ya en el eje de la pista) y el de final.
 * - `umbral`: donde se toca, el final del plan.
 * - `aqui`: la posición del avión cuando el plan se rehace volando —un
 *   desvío, otra pista en uso—. Es el «PPOS» de un ordenador de vuelo:
 *   desde donde estás, directo a lo que queda.
 */
export type Papel =
  | "despegue"
  | "salida"
  | "ruta"
  | "iaf"
  | "if"
  | "faf"
  | "umbral"
  | "aqui";

/** Un punto del plan, ya en coordenadas del mundo. */
export interface Fijo extends Punto {
  /** Su nombre publicado: «BUNIX», «XO69E», «RW30». */
  readonly nombre: string;
  readonly papel: Papel;
  /**
   * La altitud mínima publicada para cruzarlo, m, o `null` si no lleva.
   *
   * Solo las de «a o por encima de», que son las que importan para bajar: no
   * se baja de ahí hasta pasarlo. Ver `alturaDeLaSenda`.
   */
  readonly minima: number | null;
  /**
   * Si el punto no está en ninguna carta: es de una aproximación calculada
   * sobre el eje, a falta de una publicada. Ver `aproximacionCalculada`.
   */
  readonly calculado?: boolean;
}

/** Un plan de vuelo hecho: sus puntos y lo que mide. */
export interface Ruta {
  readonly fijos: readonly Fijo[];
  /** Metros desde el primer punto hasta cada uno, por los tramos. */
  readonly acumulado: readonly number[];
  /** Lo que mide la ruta entera, m. */
  readonly total: number;
  /** A qué altitud está el umbral de llegada, m. Donde acaba la bajada. */
  readonly cotaDelUmbral: number;
}

const entre = (a: Punto, b: Punto): number => Math.hypot(b.x - a.x, b.z - a.z);

/** Lo que mide una cadena de puntos, tramo a tramo. */
function largo(puntos: readonly Punto[]): number {
  let l = 0;
  for (let i = 1; i < puntos.length; i++) l += entre(puntos[i - 1]!, puntos[i]!);
  return l;
}

/** Hace el plan a partir de sus puntos, ya elegidos y en orden. */
export function rutaDe(fijos: readonly Fijo[], cotaDelUmbral: number): Ruta {
  const acumulado: number[] = [0];
  for (let i = 1; i < fijos.length; i++)
    acumulado.push(acumulado[i - 1]! + entre(fijos[i - 1]!, fijos[i]!));
  return {
    fijos,
    acumulado,
    total: acumulado[acumulado.length - 1] ?? 0,
    cotaDelUmbral,
  };
}

/**
 * **El plan de un tramo: salida, llegada y aproximación.**
 *
 * Recibe todo lo publicado —las salidas de la cabecera de despegue y las ramas
 * de la aproximación a la cabecera en uso del destino, cada una empezando en
 * su punto de inicio— y elige la combinación que **menos vuela**, que es lo
 * que hace un despachador y lo que pediría cualquier tripulación.
 *
 * **Y la salida se recorta**, que es la parte simplificada: una salida
 * publicada puede llevar cuarenta millas hacia la Península antes de dejar
 * que el avión se desvíe, y entre dos islas la torre te suelta mucho antes.
 * Se sigue cada salida **mientras cada tramo vaya hacia el inicio de la
 * aproximación**, y se deja en el primero que ya no va: los puntos que quedan
 * son los de verdad, por donde se sale de verdad, y la salida se abandona
 * donde deja de ir hacia donde se va. Ver `acerca`.
 *
 * Por eso no se elige a secas la combinación más corta: la más corta es
 * siempre ir directo —la recta es lo más corto que hay—, y eso es justo lo
 * que no se vuela. El primer punto de la salida se coge siempre que haya
 * salida publicada; entre las salidas, la que deja la ruta más corta. Y solo
 * si todas obligan a un rodeo de más de la mitad del camino se sale directo,
 * que es lo que haría una torre con una salida que se va al otro lado.
 *
 * `desde` es la cabecera de despegue o, rehaciendo el plan en el aire, la
 * posición del avión: en ese caso no se ofrecen salidas, que ya se salió.
 */
export function trazar(entrada: {
  readonly desde: Fijo;
  readonly salidas: readonly (readonly Fijo[])[];
  readonly ramas: readonly (readonly Fijo[])[];
  readonly umbral: Fijo;
  readonly cotaDelUmbral: number;
  /**
   * El relieve, para no mandar a nadie contra un monte. Ver `libra`. Sin él
   * —en las pruebas de geometría— no se mira.
   */
  readonly terreno?: Terreno;
}): Ruta {
  const { desde, umbral } = entrada;
  // Sin ramas publicadas, al umbral directo: no se inventa una aproximación.
  const ramas = entrada.ramas.length > 0 ? entrada.ramas : [[]];
  const pasa = (todo: readonly Fijo[]): boolean =>
    !entrada.terreno || libra(todo, entrada.terreno, entrada.cotaDelUmbral);
  const candidatas: { todo: readonly Fijo[]; conSalida: boolean }[] = [];
  for (const rama of ramas) {
    const inicio = rama[0] ?? umbral;
    candidatas.push({ todo: [desde, ...rama, umbral], conSalida: false });
    for (const salida of entrada.salidas) {
      if (salida.length === 0) continue;
      let k = 1;
      while (k < salida.length && acerca(salida[k - 1]!, salida[k]!, inicio)) k++;
      /*
       * **Y si por ahí se va contra el relieve, se sigue la salida un punto
       * más**, que es para lo que existe: las salidas de Los Rodeos rodean el
       * Teide por la costa, y soltarlas antes de tiempo para ir derecho a La
       * Gomera es cruzarlo a ocho mil pies.
       */
      while (k < salida.length && !pasa([desde, ...salida.slice(0, k), ...rama, umbral])) k++;
      candidatas.push({
        todo: [desde, ...salida.slice(0, k), ...rama, umbral],
        conSalida: true,
      });
    }
  }
  const buenas = candidatas.filter((c) => pasa(c.todo));
  const pool = buenas.length > 0 ? buenas : candidatas;
  const corta = (conSalida: boolean) =>
    pool
      .filter((c) => c.conSalida === conSalida)
      .reduce<{ todo: readonly Fijo[]; l: number } | null>((m, c) => {
        const l = largo(c.todo);
        return !m || l < m.l ? { todo: c.todo, l } : m;
      }, null);
  const directa = corta(false);
  const conSalida = corta(true);
  const mejor =
    conSalida && (!directa || conSalida.l <= directa.l * 1.5)
      ? conSalida.todo
      : (directa?.todo ?? [desde, umbral]);
  return rutaDe(sinRepetidos(mejor), entrada.cotaDelUmbral);
}

/**
 * Si el tramo de `a` a `b` **va hacia** `meta`: si al menos la mitad de lo que
 * se vuela en él se descuenta de lo que queda hasta allí. Es decir, si no se
 * aparta más de sesenta grados del camino.
 *
 * Con «acercarse» a secas no bastaba: de Los Rodeos a La Gomera, la salida de
 * La Palma se va treinta y tres millas al oeste para acercarse nueve, y seguirla
 * era cruzar hasta ARACO para volver. Un tramo que acerca tan poco no es de
 * camino, es un rodeo.
 */
function acerca(a: Punto, b: Punto, meta: Punto): boolean {
  const l = entre(a, b);
  if (l < 1) return true;
  return (entre(a, meta) - entre(b, meta)) / l >= 0.5;
}

/** El relieve que tiene que librar un plan. */
export interface Terreno {
  /** La cota del suelo, m, o `null` donde no se sabe. */
  readonly cota: (x: number, z: number) => number | null;
  /** Lo más alto que sube el avión, m. */
  readonly techo: number;
  /** La cota de la pista de salida, m: de ahí se empieza a subir. */
  readonly cotaDeSalida: number;
}

/** Lo que se deja por encima del relieve en ruta, m: mil pies. */
const MARGEN_EN_RUTA = 1000 * PIE;

/**
 * **Si un plan libra el relieve** volado como se vuela: subiendo a un ritmo
 * de avión de línea desde la salida, sin pasar del techo del avión, y bajando
 * por la senda de tres grados hacia el umbral — con mil pies por encima de lo
 * que haya a una milla a cada lado, que es el margen en ruta de las cartas.
 *
 * Solo se miran **los tramos que no son de nadie**: los que unen la salida con
 * la aproximación, y los de una aproximación calculada. Los de una salida o
 * una aproximación publicadas ya libran su terreno a las altitudes que manda
 * su carta, y esa cuenta la hizo quien la publicó. Es lo que se pidió con
 * otras palabras: la regla de las tres eses, antes que la ruta corta.
 */
export function libra(
  fijos: readonly Fijo[],
  terreno: Terreno,
  cotaDelUmbral: number,
): boolean {
  const total = largo(fijos);
  let recorrido = 0;
  for (let i = 1; i < fijos.length; i++) {
    const a = fijos[i - 1]!;
    const b = fijos[i]!;
    const l = entre(a, b);
    const deNadie =
      a.calculado === true ||
      b.calculado === true ||
      !mismoProcedimiento(a, b);
    if (deNadie && l > 1) {
      const pasos = Math.max(1, Math.ceil(l / (0.5 * MILLA)));
      const ux = (b.x - a.x) / l;
      const uz = (b.z - a.z) / l;
      for (let k = 0; k <= pasos; k++) {
        const t = (k / pasos) * l;
        const hecho = recorrido + t;
        const falta = total - hecho;
        // La última milla es del aeródromo, no de la ruta.
        if (falta < MILLA) continue;
        const senda = cotaDelUmbral + (falta / (MILLAS_POR_MIL_PIES * MILLA)) * 1000 * PIE;
        const subida = terreno.cotaDeSalida + (hecho / (2 * MILLA)) * 1000 * PIE;
        const puede = Math.min(terreno.techo, senda, Math.max(subida, cotaDelUmbral));
        // Cerca del umbral el margen se reparte: a tres millas no quedan mil
        // pies de senda, y la mitad de lo que haya es lo que protege una final.
        const margen = Math.min(MARGEN_EN_RUTA, (senda - cotaDelUmbral) * 0.5);
        const x = a.x + ux * t;
        const z = a.z + uz * t;
        for (const lado of [-1, 0, 1]) {
          const c = terreno.cota(x - uz * lado * MILLA, z + ux * lado * MILLA);
          if (c !== null && c + margen > puede) return false;
        }
      }
    }
    recorrido += l;
  }
  return true;
}

/**
 * Si dos puntos seguidos son un tramo de una misma carta: de salida los dos,
 * de la cabecera a la salida, o de una aproximación hasta su umbral.
 */
function mismoProcedimiento(a: Fijo, b: Fijo): boolean {
  if (a.papel === "despegue" && b.papel === "salida") return true;
  if (a.papel === "salida" && b.papel === "salida") return true;
  const deAproximacion = (f: Fijo) =>
    f.papel === "iaf" || f.papel === "if" || f.papel === "faf" || f.papel === "ruta";
  if (deAproximacion(a) && (deAproximacion(b) || b.papel === "umbral") && b.papel !== "iaf")
    return true;
  return false;
}

/**
 * Quita los puntos que salen dos veces seguidas.
 *
 * Pasa cuando la salida acaba en el mismo punto donde empieza la
 * aproximación —en Canarias, un VOR que sirve para las dos cosas—, y un tramo
 * de cero metros no tiene rumbo: la flecha se volvería loca en él.
 */
function sinRepetidos(fijos: readonly Fijo[]): Fijo[] {
  const quedan: Fijo[] = [];
  for (const f of fijos) {
    const antes = quedan[quedan.length - 1];
    if (antes && antes.nombre === f.nombre && entre(antes, f) < 50) continue;
    quedan.push(f);
  }
  return quedan;
}

/**
 * **A cuál se va ahora**, sabiendo a cuál se iba.
 *
 * `activo` es el índice del punto al que se vuela; empieza en 1, que es el
 * primero después de la cabecera. Solo avanza, nunca vuelve: un plan no se
 * desanda porque el avión haga una vuelta.
 *
 * Se pasa al siguiente de dos maneras, y las dos son las de un ordenador de
 * vuelo de verdad:
 *
 * - **Al llegar al través del punto**, un poco antes en los giros fuertes:
 *   los puntos de una ruta se sobrevuelan de pasada, con el giro empezado
 *   antes, y quien espera a estar encima para girar se pasa de largo. Por eso
 *   no vale «estar cerca»: con el giro acotado, un punto se puede rodear sin
 *   llegar nunca a él.
 * - **Si se ha cortado camino** y se está volando ya un tramo de más
 *   adelante. Pasa con los niños y pasa con los controladores —«directo a
 *   BUNIX»—, y un plan que se empeña en el punto que quedó atrás señala hacia
 *   atrás, que es lo peor que puede señalar una flecha.
 */
export function avanzar(r: Ruta, activo: number, x: number, z: number): number {
  const n = r.fijos.length;
  let i = Math.max(1, Math.min(n - 1, activo));
  const p = { x, z };
  // Pasar los que ya se han rebasado, uno detrás de otro.
  for (;;) {
    if (i >= n - 1) break;
    const a = r.fijos[i - 1]!;
    const b = r.fijos[i]!;
    const c = r.fijos[i + 1]!;
    const tramo = entre(a, b);
    const recorrido = alLargoDe(a, b, p);
    const giro = Math.abs(diferencia(rumbo(a, b), rumbo(b, c)));
    // Media milla por cada treinta grados de giro, hasta dos: lo que tarda en
    // girar un avión de línea a veinticinco grados de alabeo.
    const antes = Math.min(2 * MILLA, (giro / 30) * 0.5 * MILLA);
    if (recorrido >= tramo - antes || entre(p, b) < 0.3 * MILLA) i++;
    else break;
  }
  // Y si se está volando uno de más adelante, a ése.
  const aqui = aLaRaya(r.fijos[i - 1]!, r.fijos[i]!, p);
  for (let j = i + 1; j < n; j++) {
    const a = r.fijos[j - 1]!;
    const b = r.fijos[j]!;
    const dentro = alLargoDe(a, b, p);
    if (dentro <= 0 || dentro >= entre(a, b)) continue;
    const alli = aLaRaya(a, b, p);
    if (alli < 1.5 * MILLA && alli < aqui * 0.5) i = j;
  }
  return i;
}

/** Cuánto se ha recorrido a lo largo del tramo de `a` a `b`, m. */
function alLargoDe(a: Punto, b: Punto, p: Punto): number {
  const l = entre(a, b) || 1;
  return ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / l;
}

/** A cuánto se está del tramo de `a` a `b`, recortado a sus extremos, m. */
function aLaRaya(a: Punto, b: Punto, p: Punto): number {
  const l = entre(a, b);
  if (l < 1) return entre(a, p);
  const t = Math.max(0, Math.min(1, alLargoDe(a, b, p) / l));
  return Math.hypot(a.x + (b.x - a.x) * t - p.x, a.z + (b.z - a.z) * t - p.z);
}

/** El rumbo verdadero de `a` a `b`, en radianes. El de `world/rumbo.ts`. */
function rumbo(a: Punto, b: Punto): number {
  return Math.atan2(b.x - a.x, -(b.z - a.z));
}

/** La diferencia entre dos rumbos por el lado corto, en grados. */
function diferencia(a: number, b: number): number {
  let d = ((b - a) * 180) / Math.PI;
  d = ((d % 360) + 540) % 360 - 180;
  return d;
}

/** Lo que falta por volar hasta el umbral, por la ruta, m. */
export function restante(r: Ruta, activo: number, x: number, z: number): number {
  const i = Math.max(1, Math.min(r.fijos.length - 1, activo));
  const b = r.fijos[i];
  if (!b) return 0;
  return Math.hypot(b.x - x, b.z - z) + (r.total - r.acumulado[i]!);
}

/**
 * El punto de la ruta al que le faltan `falta` metros para el umbral.
 *
 * Es como se coloca el punto de descenso en la carta: no es un sitio con
 * nombre, es **una distancia antes del final**, y se pinta sobre la ruta allí
 * donde caiga. `null` si cae antes del principio.
 */
export function puntoAFaltando(r: Ruta, falta: number): Punto | null {
  const hasta = r.total - falta;
  if (hasta < 0 || r.fijos.length < 2) return null;
  for (let i = 1; i < r.fijos.length; i++) {
    if (r.acumulado[i]! < hasta) continue;
    const a = r.fijos[i - 1]!;
    const b = r.fijos[i]!;
    const l = r.acumulado[i]! - r.acumulado[i - 1]!;
    const t = l > 0 ? (hasta - r.acumulado[i - 1]!) / l : 0;
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }
  const ultimo = r.fijos[r.fijos.length - 1]!;
  return { x: ultimo.x, z: ultimo.z };
}

/** El viento, como lo da un parte: de dónde sopla y cuánto. */
export interface Viento {
  /** De dónde viene, en grados verdaderos. */
  readonly desde: number;
  /** Cuánto, en metros por segundo. */
  readonly fuerza: number;
}

/**
 * **La velocidad sobre el suelo en un tramo**, con el viento de ese tramo.
 *
 * El triángulo de velocidades de toda la vida: el avión apunta un poco al
 * viento para no derivar, y lo que avanza por el tramo es su velocidad por el
 * coseno de esa corrección, más o menos lo que empuje el viento a lo largo.
 * Es la cuenta que hace un ordenador de vuelo para dar la hora de llegada, y
 * la que se hacía a mano con el computador de cartón antes de que lo hubiera.
 */
export function sobreElSuelo(
  aire: number,
  rumboDelTramo: number,
  viento: Viento | null,
): number {
  if (!viento || viento.fuerza <= 0) return aire;
  // Hacia dónde va el aire, que es lo contrario de donde viene.
  const va = ((viento.desde + 180) * Math.PI) / 180;
  const aFavor = viento.fuerza * Math.cos(va - rumboDelTramo);
  const deCostado = viento.fuerza * Math.sin(va - rumboDelTramo);
  if (Math.abs(deCostado) >= aire) return Math.max(1, aFavor);
  return Math.max(1, Math.sqrt(aire * aire - deCostado * deCostado) + aFavor);
}

/**
 * **Cuánto se tarda en llegar**, s: tramo a tramo y con el viento de cada uno.
 *
 * `aire` es la velocidad verdadera, m/s: la de ahora volando, la de crucero
 * antes de despegar. Con la de ahora, que es lo que hace un ordenador de
 * vuelo en su versión más sencilla: si se vuela más despacio, se llega más
 * tarde, y la hora lo dice en el momento.
 */
export function segundosHastaElFinal(
  r: Ruta,
  activo: number,
  x: number,
  z: number,
  aire: number,
  viento: Viento | null,
): number {
  const i = Math.max(1, Math.min(r.fijos.length - 1, activo));
  if (aire <= 1) return Infinity;
  const aqui = { x, z };
  let s = 0;
  let desde: Punto = aqui;
  for (let j = i; j < r.fijos.length; j++) {
    const b = r.fijos[j]!;
    const l = entre(desde, b);
    if (l > 1) s += l / sobreElSuelo(aire, rumbo(desde, b), viento);
    desde = b;
  }
  return s;
}

/** Las millas que se recorren por cada mil pies que se bajan. La regla. */
export const MILLAS_POR_MIL_PIES = 3;

/**
 * **A qué distancia del umbral hay que empezar a bajar**, m.
 *
 * La regla de tres por uno: tres millas por cada mil pies que haya que perder.
 * No es un truco de juego; es lo que calcula de cabeza cualquier piloto de
 * línea y lo que dibuja el ordenador de vuelo como «T/D», porque sale de la
 * senda de tres grados —la misma de la final— estirada hasta el crucero: en
 * tres grados se bajan unos trescientos dieciocho pies por milla.
 *
 * **Y con el viento**: la regla es para aire en calma. Con viento de cola se
 * avanza más sobre el suelo en el mismo rato de bajada, así que hay que
 * empezar antes; con viento de cara, después. Se corrige con lo que corre el
 * avión sobre el suelo frente a lo que corre por el aire, que es lo que hace
 * la regla de «una milla más por cada diez nudos de cola» sin redondear.
 */
export function distanciaDeDescenso(
  desnivel: number,
  aire: number,
  suelo: number,
): number {
  const pies = Math.max(0, desnivel) / PIE;
  const viento = aire > 1 && suelo > 1 ? suelo / aire : 1;
  return (pies / 1000) * MILLAS_POR_MIL_PIES * MILLA * viento;
}

/**
 * La altitud de la senda de bajada a `falta` metros del umbral, m.
 *
 * La misma regla al revés: la bajada de tres grados, estirada desde el umbral
 * hacia atrás. Y nunca por debajo de lo que publica la carta para el siguiente
 * punto: esa altitud es la que libra el terreno, y se respeta hasta pasarlo.
 */
export function alturaDeLaSenda(
  r: Ruta,
  activo: number,
  falta: number,
  /**
   * Lo que corre el avión por el aire frente a lo que corre sobre el suelo.
   * Con viento de cola la misma bajada se estira sobre el suelo —por eso el
   * punto de descenso se adelanta—, y la senda que se sigue tiene que ser la
   * misma que puso ese punto donde está. Ver `distanciaDeDescenso`.
   */
  aireSobreSuelo = 1,
  /** Si se respeta lo publicado para el siguiente punto. Ver `ritmoParaElAutomatico`. */
  conLaCarta = true,
): number {
  const senda =
    r.cotaDelUmbral +
    (falta / (MILLAS_POR_MIL_PIES * MILLA)) * 1000 * PIE * aireSobreSuelo;
  if (!conLaCarta) return senda;
  const siguiente = r.fijos[Math.max(1, Math.min(r.fijos.length - 1, activo))];
  return Math.max(senda, siguiente?.minima ?? -Infinity);
}

/**
 * **A qué altura se planea el crucero**, m.
 *
 * Lo que pide la distancia y lo que da el avión, en el nivel que le toca por
 * el rumbo:
 *
 * - **La distancia**: subir y bajar tienen que caber de sobra. Se sube a unas
 *   dos millas por cada mil pies y se baja a tres, así que se busca la altura
 *   con la que subida y bajada se comen dos tercios de la ruta y queda un
 *   tercio para ir nivelado. Es la cuenta de un despachador para un salto
 *   corto, y por eso un turbohélice va de Tenerife a Gran Canaria a nueve mil
 *   pies y no a veinticinco mil.
 * - **El avión**: nunca por encima de su altura de crucero.
 * - **La carta**: nunca por debajo de la mínima más alta que se publique en la
 *   ruta, que es la que libra el terreno.
 *
 * Y del resultado, el nivel legal más cercano por el rumbo: ver
 * `nivel-de-crucero.ts`. Eso lo pone quien llama, que es quien sabe la
 * declinación.
 */
export function cruceroPorLaDistancia(r: Ruta, techo: number, cotaDeSalida: number): number {
  const millas = r.total / MILLA;
  const pies = ((millas * 2) / 3 / (2 + MILLAS_POR_MIL_PIES)) * 1000;
  const base = Math.max(cotaDeSalida, r.cotaDelUmbral);
  let m = base + pies * PIE;
  for (const f of r.fijos) if (f.minima !== null) m = Math.max(m, f.minima);
  return Math.min(m, Math.max(techo, base + 1000 * PIE));
}

/** Lo que dice el plan de un instante del vuelo. */
export interface Progreso {
  /** El punto al que se va ahora. */
  readonly siguiente: Fijo;
  /** A cuánto está, m. */
  readonly hastaElSiguiente: number;
  /** Lo que falta por la ruta hasta el umbral, m. */
  readonly restante: number;
  /** Lo que mide la ruta entera, m. */
  readonly total: number;
  /** Cuánto falta para llegar, s; `Infinity` parado. */
  readonly segundos: number;
  /** Y para llegar al punto siguiente, s: la hora que da la carta. */
  readonly alSiguiente: number;
  /**
   * A cuánto del umbral cae el punto de descenso, m, o `null` si ya no hay
   * nada que bajar.
   */
  readonly descenso: number | null;
  /** Dónde cae en el mundo, si cae por delante del avión. */
  readonly puntoDeDescenso: Punto | null;
}

/**
 * Cuánto por debajo de la altitud de ahora pide como mucho el automático
 * bajando por el plan, m. Ver `alturaParaElAutomatico`.
 *
 * Con la ganancia del automático —un metro por segundo por cada diez de
 * error— noventa metros piden nueve por segundo, que el automático recorta a
 * su tope de siete y medio: unos mil quinientos pies por minuto, que es lo que
 * pide una senda de tres grados a doscientos ochenta nudos sobre el suelo. Con
 * menos, un reactor se quedaba colgado por encima de la senda.
 */
const POR_DELANTE = 90;

/**
 * **Lo más alto que hay debajo de la ruta en crucero**, m, o `null` si no se
 * sabe: el relieve a una milla a cada lado, sin contar las ocho primeras ni
 * las ocho últimas, que se vuelan subiendo o bajando por su carta.
 *
 * Sirve para que el crucero planeado no quede por debajo de un monte: ni el
 * Teide en medio de una ruta corta puede decidir el crucero la distancia sola.
 */
export function relieveEnCrucero(
  r: Ruta,
  cota: (x: number, z: number) => number | null,
): number | null {
  let alto: number | null = null;
  const orilla = 8 * MILLA;
  for (let i = 1; i < r.fijos.length; i++) {
    const a = r.fijos[i - 1]!;
    const b = r.fijos[i]!;
    const l = entre(a, b);
    if (l < 1) continue;
    const ux = (b.x - a.x) / l;
    const uz = (b.z - a.z) / l;
    const pasos = Math.ceil(l / (0.5 * MILLA));
    for (let k = 0; k <= pasos; k++) {
      const t = (k / pasos) * l;
      const hecho = r.acumulado[i - 1]! + t;
      if (hecho < orilla || r.total - hecho < orilla) continue;
      for (const lado of [-1, 0, 1]) {
        const c = cota(a.x + ux * t - uz * lado * MILLA, a.z + uz * t + ux * lado * MILLA);
        if (c !== null && (alto === null || c > alto)) alto = c;
      }
    }
  }
  return alto;
}

/** Lo que el seguimiento necesita saber del avión cada vez. */
export interface Lectura {
  readonly x: number;
  readonly z: number;
  /** Altitud, m. */
  readonly altitud: number;
  /** Velocidad vertical, m/s. */
  readonly vertical: number;
  /** Velocidad verdadera, m/s. */
  readonly aire: number;
  readonly enTierra: boolean;
  readonly viento: Viento | null;
}

/**
 * Cuánto tiene que haber que bajar para que el punto de descenso cuente, m.
 *
 * Mil quinientos pies: por debajo de eso ya se está en la altura de un
 * circuito, y avisar de que hay que empezar a bajar sería avisar de algo que
 * ya se está haciendo.
 */
const DESNIVEL_QUE_CUENTA = 1500 * PIE;

/**
 * **Sigue el plan mientras se vuela**: a qué punto se va, cuánto falta y
 * cuándo se pasa por el punto de descenso.
 *
 * El punto de descenso se avisa **una vez por plan**, y se rearma al cambiar
 * de plan —otro destino, otra pista, otro tramo—, no con el reloj: lo que
 * hace que vuelva un aviso es que cambie algo que pasa. Y solo si de verdad
 * hay que bajar: quien ya empezó por su cuenta no necesita que se lo digan.
 */
export class Seguimiento {
  private ruta: Ruta | null = null;
  private activo = 1;
  private yaBajando = false;
  /** El crucero planeado, m: el que vale mientras se sube hacia él. */
  private crucero = 0;
  private ultimo: Progreso | null = null;
  /** Aire entre suelo en el último paso: el viento de la bajada. */
  private aireSobreSuelo = 1;

  /** Pone un plan nuevo, o ninguno. */
  poner(ruta: Ruta | null, crucero = 0): void {
    this.ruta = ruta;
    this.activo = 1;
    this.yaBajando = false;
    this.crucero = crucero;
    this.ultimo = null;
  }

  get plan(): Ruta | null {
    return this.ruta;
  }

  /** El índice del punto al que se va. */
  get indice(): number {
    return this.activo;
  }

  /** Lo último que se calculó. */
  get progreso(): Progreso | null {
    return this.ultimo;
  }

  /** Si ya se pasó por el punto de descenso en este plan. */
  get bajando(): boolean {
    return this.yaBajando;
  }

  /**
   * La altura de la que hay que bajar: la de ahora si se va nivelado, y la
   * del crucero planeado si todavía se sube hacia él. Así el punto de
   * descenso no se echa encima mientras se sube, ni se queda en el crucero
   * del plan si se decidió volar más bajo.
   */
  private desde(l: Lectura): number {
    if (l.enTierra) return Math.max(l.altitud, this.crucero);
    return l.vertical > 1.5 ? Math.max(l.altitud, this.crucero) : l.altitud;
  }

  /**
   * Un paso del seguimiento. Devuelve si **ahora mismo** se ha llegado al
   * punto de descenso, para que quien llame lo cuente una vez.
   */
  paso(l: Lectura): { readonly descenso: boolean; readonly cambio: boolean } {
    const r = this.ruta;
    if (!r || r.fijos.length < 2) {
      this.ultimo = null;
      return { descenso: false, cambio: false };
    }
    const antes = this.activo;
    if (!l.enTierra) this.activo = avanzar(r, this.activo, l.x, l.z);
    const siguiente = r.fijos[this.activo]!;
    const falta = restante(r, this.activo, l.x, l.z);
    const suelo = sobreElSuelo(
      Math.max(l.aire, 1),
      rumbo({ x: l.x, z: l.z }, siguiente),
      l.viento,
    );
    this.aireSobreSuelo = l.aire > 1 ? l.aire / suelo : 1;
    const desnivel = this.desde(l) - r.cotaDelUmbral;
    const hayQueBajar = desnivel > DESNIVEL_QUE_CUENTA;
    const descenso = hayQueBajar
      ? distanciaDeDescenso(desnivel, Math.max(l.aire, 1), suelo)
      : null;
    let ahora = false;
    /*
     * **Y solo si el avión, de verdad, tiene algo que bajar.** La distancia
     * se cuenta con el crucero planeado mientras se sube, pero el aviso mira
     * la altura de ahora: puesto en una final a cuatro kilómetros subiendo un
     * poco —el banco lo hace, y un rebote también—, el crucero del plan decía
     * que faltaba bajarlo todo y salía «empezamos a bajar» a dos millas del
     * umbral.
     */
    const tieneQueBajar = l.altitud - r.cotaDelUmbral > DESNIVEL_QUE_CUENTA;
    if (
      !this.yaBajando &&
      !l.enTierra &&
      descenso !== null &&
      tieneQueBajar &&
      falta <= descenso
    ) {
      this.yaBajando = true;
      ahora = true;
    }
    const hastaElSiguiente = Math.hypot(siguiente.x - l.x, siguiente.z - l.z);
    this.ultimo = {
      siguiente,
      hastaElSiguiente,
      alSiguiente: l.aire > 1 ? hastaElSiguiente / suelo : Infinity,
      restante: falta,
      total: r.total,
      segundos: segundosHastaElFinal(r, this.activo, l.x, l.z, l.aire, l.viento),
      descenso,
      puntoDeDescenso:
        descenso !== null && !this.yaBajando && descenso < falta
          ? puntoAFaltando(r, descenso)
          : null,
    };
    return { descenso: ahora, cambio: this.activo !== antes };
  }

  /**
   * La altitud que tiene que buscar un piloto automático que baja por el
   * plan, m, o `null` si todavía no toca bajar.
   *
   * Es la senda de tres grados hasta el punto de final y ni un pie más: de
   * ahí para abajo la aproximación se vuela mirando la pista, que es lo que
   * este juego enseña. Y nunca por debajo de lo publicado para el siguiente
   * punto. Ver `alturaDeLaSenda`.
   */
  alturaParaElAutomatico(l: Lectura): number | null {
    const r = this.ruta;
    if (!r || !this.yaBajando) return null;
    const falta = restante(r, this.activo, l.x, l.z);
    const faf = r.fijos.findIndex((f) => f.papel === "faf");
    const suelo = faf > 0 ? r.total - r.acumulado[faf]! : 5 * MILLA;
    const senda = alturaDeLaSenda(
      r,
      this.activo,
      Math.max(falta, suelo),
      this.aireSobreSuelo,
    );
    /*
     * **Y si se va muy por encima de la senda, se baja a un ritmo, no de
     * golpe.** Pasa si se conecta el automático tarde, ya pasado el punto: la
     * senda queda cientos de metros por debajo, y pedírsela de una vez es
     * pedirle al avión que pique para cogerla. Un ordenador de vuelo de
     * verdad no pica: baja a su ritmo de descenso hasta encontrarla. Aquí, la
     * altitud pedida va como mucho `POR_DELANTE` por debajo de la de ahora,
     * que al ritmo del automático son unos mil doscientos pies por minuto.
     */
    return Math.max(senda, l.altitud - POR_DELANTE);
  }

  /**
   * **Y a qué ritmo baja esa altitud**, m/s —negativo, bajando—, o `null` si
   * todavía no toca bajar.
   *
   * Es lo que hace un ordenador de vuelo de verdad al bajar por su senda: le
   * dice al automático la altitud **y el ritmo** al que se mueve. Con la
   * altitud sola, el automático va siempre por detrás de una altitud que no
   * para de bajar: tanto más cuanto más deprisa baja, y en un reactor eran
   * más de seiscientos pies por encima de la senda a quince millas del
   * umbral. Con el ritmo, la sigue.
   *
   * Es el de la senda de tres grados sobre el aire: lo que se recorre por el
   * aire por los trescientos pies de cada milla. Cero donde la senda no baja
   * —en el punto de final, o sujeta por lo publicado para el siguiente
   * punto— y cero también mientras la altitud pedida va por delante del
   * avión, que es cuando se baja al ritmo propio hasta encontrarla. Ver
   * `alturaParaElAutomatico`.
   */
  ritmoParaElAutomatico(l: Lectura): number | null {
    const r = this.ruta;
    if (!r || !this.yaBajando) return null;
    const falta = restante(r, this.activo, l.x, l.z);
    const faf = r.fijos.findIndex((f) => f.papel === "faf");
    const suelo = faf > 0 ? r.total - r.acumulado[faf]! : 5 * MILLA;
    if (falta <= suelo) return 0;
    const senda = alturaDeLaSenda(r, this.activo, falta, this.aireSobreSuelo);
    const libre = alturaDeLaSenda(r, this.activo, falta, this.aireSobreSuelo, false);
    if (senda > libre || senda < l.altitud - POR_DELANTE) return 0;
    return -Math.max(0, l.aire) * ((1000 * PIE) / (MILLAS_POR_MIL_PIES * MILLA));
  }
}
