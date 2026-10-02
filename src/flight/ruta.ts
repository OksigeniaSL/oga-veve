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

import { HASTA, haciaElEste, MEDIO_NIVEL, nivelPara, UN_NIVEL } from "./nivel-de-crucero";
import { nivelQueAhorra } from "./nivel-que-ahorra";
import type { AircraftConfig } from "./aircraft";

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
  /**
   * Si el punto es también el último que se vuela de la salida: un VOR que
   * sirve para salir de un campo y para empezar la aproximación a otro. El
   * tramo que llega a él es de la salida, y el que sale de él, de la
   * aproximación. Ver `sinRepetidos`.
   */
  readonly deSalida?: boolean;
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
 * su punto de inicio— y elige la combinación que **menos vuela entre las que
 * volaría un avión de verdad**, que es lo que hace un despachador y lo que
 * autoriza un controlador.
 *
 * ## Las piezas
 *
 * Las publicadas, y entre ellas se va directo:
 *
 * - **La salida se sigue mientras vaya hacia donde se va**, y se suelta en el
 *   primer tramo que ya no va: una salida publicada puede llevar cuarenta
 *   millas hacia la Península antes de dejar que el avión se desvíe, y entre
 *   dos islas la torre te suelta mucho antes. Ver `acerca`. Y si soltarla ahí
 *   no libra el relieve o cruza una isla, se sigue un punto más, que es para
 *   lo que existe: se sale por la carta hasta donde se puede dejar.
 * - **A la aproximación se entra por el punto de inicio de una de sus ramas,
 *   o directo a su punto intermedio** si el giro allí no pasa de cuarenta y
 *   cinco grados, que es el «directo al IF» que un controlador da a diario y
 *   que la OACI admite con ese tope en una RNP (Manual PBN, Doc 9613, vol. II,
 *   parte C, cap. 5; y en Europa la AMC 20-27 de EASA). Es lo que quita la
 *   vuelta de ir a buscar un punto de inicio que queda más allá del
 *   intermedio: de Los Rodeos a la 25 de Tenerife Sur eran veinticinco millas
 *   de más.
 *
 * ## Cuál de todas
 *
 * La más corta de las que cumplen, por este orden, lo que se pueda cumplir:
 *
 * 1. **Que libre el relieve con el margen de la regla del aire.** Ver `libra`.
 * 2. **Que lo que no es de ninguna carta no cruce una isla de montaña**
 *    teniendo mar. Ver `porElMar`. Lo pidió quien lo voló, y con razón: de
 *    Los Rodeos a Tenerife Sur el plan cruzaba la cordillera Dorsal por
 *    encima del Teide. Las cartas de las islas están hechas sobre el mar —las
 *    salidas rodean la isla por la costa, las aproximaciones entran desde el
 *    agua— y lo que se une entre ellas va también por el agua.
 * 3. **Que entre por el lado de la aproximación que mira a donde viene el
 *    avión.** Ver `alOtroLado`. Es lo que hace un controlador con las ramas de
 *    una aproximación: la de cada lado es para quien llega por ese lado, y a
 *    nadie se le manda a la del otro lado del campo si tiene una en el suyo.
 *    Era la otra mitad de la queja: para la 07 de Tenerife Sur, el plan que
 *    salía de Los Rodeos iba a entrar por XANOS, frente a La Gomera, teniendo
 *    KUTUR por el lado del que venía.
 *
 * Si ninguna combinación cumple las tres, se renuncia primero al lado, luego
 * al mar y nunca antes al relieve. Y si ninguna libra el relieve, la más
 * corta, que es lo que hace el juego donde no sabe qué hay debajo.
 *
 * No se elige a secas la combinación más corta: la más corta es siempre ir
 * directo —la recta es lo más corto que hay—, y eso es justo lo que no se
 * vuela. El primer punto de la salida se coge siempre que haya salida
 * publicada; y solo si todas obligan a un rodeo de más de la mitad del camino
 * se sale directo, que es lo que haría una torre con una salida que se va al
 * otro lado.
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
   * El relieve, para no mandar a nadie contra un monte ni por encima de una
   * isla. Ver `libra` y `porElMar`. Sin él —en las pruebas de geometría— no
   * se mira.
   */
  readonly terreno?: Terreno;
}): Ruta {
  const { desde, umbral, terreno } = entrada;
  const candidatas: Candidata[] = [];
  const poner = (todo: readonly Fijo[], conSalida: boolean, e: Entrada) => {
    const limpia = sinRepetidos(todo);
    candidatas.push({ todo: limpia, conSalida, l: largo(limpia), entrada: e });
  };
  const entradas = entradasDe(entrada.ramas);
  for (const e of entradas) {
    const inicio = e.fijos[0] ?? umbral;
    const tras = e.fijos[1] ?? umbral;
    // Directo al intermedio, solo si el giro en él cabe en el tope.
    const cabe = (antes: Punto) => !e.alIF || giroEn(antes, inicio, tras) <= GIRO_EN_EL_IF;
    if (cabe(desde)) poner([desde, ...e.fijos, umbral], false, e);
    for (const salida of entrada.salidas) {
      if (salida.length === 0) continue;
      let k = 1;
      while (k < salida.length && acerca(salida[k - 1]!, salida[k]!, inicio)) k++;
      for (; k <= salida.length; k++)
        if (cabe(salida[k - 1]!))
          poner([desde, ...salida.slice(0, k), ...e.fijos, umbral], true, e);
    }
  }
  candidatas.sort((a, b) => a.l - b.l);

  /*
   * Las cuentas del relieve son caras —cien catas por cada milla de ruta— y
   * los tramos se repiten entre candidatas, así que se guardan por tramo y
   * solo se hacen para las que llegan a mirarse: en orden de largo, la
   * primera que vale corta la búsqueda.
   */
  const memoria: Memoria = new Map();
  const recordar = (f: (c: Candidata) => boolean) => {
    const hechas = new Map<Candidata, boolean>();
    return (c: Candidata): boolean => {
      let v = hechas.get(c);
      if (v === undefined) hechas.set(c, (v = f(c)));
      return v;
    };
  };
  const libre = recordar(
    (c) => !terreno || libra(c.todo, terreno, entrada.cotaDelUmbral, memoria, true),
  );
  const seca = recordar((c) => !terreno || porElMar(c.todo, terreno.cota, memoria));
  const deSuLado = recordar((c) => !alOtroLado(c.entrada, desde, umbral));
  // Lo barato primero: el lado es una cuenta, el mar una cata por punto y el
  // relieve cien.
  const exigencias: ((c: Candidata) => boolean)[] = [
    (c) => deSuLado(c) && seca(c) && libre(c),
    (c) => seca(c) && libre(c),
    libre,
    () => true,
  ];
  for (const vale of exigencias) {
    const conSalida = candidatas.find((c) => c.conSalida && vale(c));
    const directa = candidatas.find((c) => !c.conSalida && vale(c));
    if (!conSalida && !directa) continue;
    const mejor =
      conSalida && (!directa || conSalida.l <= directa.l * 1.5) ? conSalida : directa!;
    return rutaDe(mejor.todo, entrada.cotaDelUmbral);
  }
  return rutaDe([desde, umbral], entrada.cotaDelUmbral);
}

/** Una combinación posible de salida, entrada y aproximación. */
interface Candidata {
  readonly todo: readonly Fijo[];
  readonly conSalida: boolean;
  /** Lo que mide, m. */
  readonly l: number;
  readonly entrada: Entrada;
}

/** Por dónde se entra a una aproximación: una rama entera, o desde su IF. */
interface Entrada {
  readonly fijos: readonly Fijo[];
  /** Si se entra directo al punto intermedio, saltándose el de inicio. */
  readonly alIF: boolean;
}

/**
 * Lo más que puede girar un avión en el punto intermedio si se le manda allí
 * directo, en grados. Ver `trazar`.
 */
export const GIRO_EN_EL_IF = 45;

/**
 * Las entradas a la aproximación: cada rama desde su punto de inicio y, una
 * vez por cada punto intermedio distinto, desde él. Sin ramas publicadas, al
 * umbral directo: no se inventa una aproximación.
 */
function entradasDe(ramas: readonly (readonly Fijo[])[]): Entrada[] {
  if (ramas.length === 0) return [{ fijos: [], alIF: false }];
  const entradas: Entrada[] = [];
  const vistas = new Set<string>();
  for (const rama of ramas) {
    entradas.push({ fijos: rama, alIF: false });
    const i = rama.findIndex((f) => f.papel === "if");
    if (i <= 0) continue;
    const resto = rama.slice(i);
    const clave = resto.map((f) => f.nombre).join(" ");
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    entradas.push({ fijos: resto, alIF: true });
  }
  return entradas;
}

/** Lo que se gira en `b` yendo de `a` a `c`, en grados, por el lado corto. */
function giroEn(a: Punto, b: Punto, c: Punto): number {
  return Math.abs(diferencia(rumbo(a, b), rumbo(b, c)));
}

/**
 * A cuánto de la perpendicular por el umbral tiene que quedar un punto de
 * entrada para estar a un lado del campo y no de través, m: cinco millas, la
 * mitad de lo que hay del umbral al punto intermedio de manual
 * (`INTERMEDIO_SIN_CARTA` en `world/procedimientos.ts`).
 *
 * Con eso los puntos de inicio que las cartas ponen de través del campo
 * —KUTUR en Tenerife Sur, a una milla de la perpendicular; el VOR de Los
 * Rodeos, a menos de cuatro— sirven para llegar por los dos lados, que es para
 * lo que están, y los que están a un lado —XANOS, a dieciséis; BASUX, a
 * veintitrés— son de quien llega por ese lado.
 */
const DE_TRAVES = 5 * MILLA;

/**
 * **Si una entrada a la aproximación queda al otro lado del campo** respecto
 * de donde viene el avión.
 *
 * Los lados se cuentan a lo largo del eje de la pista, que es como están
 * puestas las ramas de una aproximación: la de detrás de la final para quien
 * llega por detrás, y las de delante del campo para quien llega por delante y
 * tiene que rodearlo. Cada cosa se mide a su escala:
 *
 * - **El punto de entrada**, que está junto al campo, por lo que queda por
 *   delante o por detrás de la perpendicular al eje por el umbral. De través,
 *   a menos de `DE_TRAVES`, no está a ningún lado.
 * - **El avión**, que puede venir de cien millas, por la dirección de la que
 *   viene: la vuelta entera en tres tercios iguales, por delante del campo si
 *   llega a menos de sesenta grados del sentido de aterrizaje, por detrás si
 *   llega a menos de sesenta del contrario y de costado entre medias. Quien
 *   llega de costado no tiene lado: le vale cualquier rama.
 */
function alOtroLado(e: Entrada, desde: Punto, umbral: Punto): boolean {
  const inicio = e.fijos[0];
  const final = e.fijos[e.fijos.length - 1];
  if (!inicio || !final) return false;
  const l = entre(final, umbral);
  const lejos = entre(desde, umbral);
  if (l < 1 || lejos < 1) return false;
  const ux = (umbral.x - final.x) / l;
  const uz = (umbral.z - final.z) / l;
  const delante = (p: Punto) => (p.x - umbral.x) * ux + (p.z - umbral.z) * uz;
  const cos = delante(desde) / lejos;
  const viene = cos > 0.5 ? 1 : cos < -0.5 ? -1 : 0;
  const s = delante(inicio);
  const esta = Math.abs(s) < DE_TRAVES ? 0 : Math.sign(s);
  return viene * esta < 0;
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
  /**
   * Si el avión vuela **con reglas visuales**: la avioneta de escuela y el
   * fumigador. Entonces el margen sobre el relieve es el de un vuelo visual y
   * no el de uno por instrumentos. Ver `MARGEN_VISUAL`.
   */
  readonly visual?: boolean;
}

/**
 * **El margen sobre el relieve en ruta**, m, y a qué distancia se mira: la
 * regla del aire, no una costumbre.
 *
 * Es el anexo 2 de la OACI (5.1.2), que en Europa es SERA.5015 b) y que el
 * AIP de España recoge tal cual en ENR 1.3, apartado 3, «Niveles mínimos»:
 * salvo para despegar o aterrizar, un vuelo por instrumentos va **por lo menos
 * 600 m (2000 ft) por encima del obstáculo más alto que haya en un radio de
 * 8 km** de su posición estimada sobre terreno elevado o en áreas montañosas,
 * y **300 m (1000 ft)** en cualquier otra parte. Es también la cuenta con la
 * que el mismo AIP define la altitud mínima de área (ENR 1.3, apartado 4).
 *
 * Aquí había mil pies a una milla a cada lado para todo. Mil pies es el margen
 * del llano; en Canarias, que es montaña desde el agua, la regla pide el doble
 * y a ocho kilómetros, y con mil pies a una milla el plan de Los Rodeos a
 * Tenerife Sur pasaba por encima del Teide.
 */
export const MARGEN_EN_LLANO = 300;
export const MARGEN_EN_MONTANA = 600;
export const RADIO_DE_OBSTACULOS = 8000;

/**
 * **Y el margen de quien vuela mirando por la ventana**, m, y a qué distancia
 * se mira.
 *
 * La avioneta de escuela y el fumigador no vuelan por instrumentos, y su
 * techo —tres mil y dos mil quinientos metros— queda por debajo de lo que la
 * regla de arriba pide cerca de las islas del oeste: el Teide más seiscientos
 * son cuatro mil trescientos. Con esa regla ninguna ruta entre esas islas les
 * cabía, y el plan caía a la más corta, que era peor: la que cruzaba.
 *
 * Lo que hace de verdad un avión así es otra cosa: **vuelo visual por la
 * costa, a la altura que se pueda**, con la isla a un lado y el mar debajo. Y
 * su regla es otra, la de los vuelos visuales: SERA.5005 f), que en España
 * recoge el AIP en ENR 1.2. Fuera de lo poblado pide ciento cincuenta metros
 * sobre el suelo, el agua o lo más alto a ciento cincuenta metros; sobre lo
 * poblado, **trescientos metros sobre lo más alto a seiscientos**. Aquí se
 * planea con la segunda en todas partes, que es la más exigente de las dos:
 * un plan no sabe dónde hay un pueblo, y quien planea un vuelo visual por una
 * costa de acantilados no apura el mínimo.
 */
export const MARGEN_VISUAL = 300;
export const RADIO_VISUAL = 600;

/**
 * **Qué es montaña**, con la definición de la OACI y no a ojo: «área de perfil
 * cambiante donde los cambios de elevación del terreno exceden de 900 m
 * (3000 ft) dentro de una distancia de 18,5 km (10 NM)» (PANS-OPS, Doc 8168,
 * vol. II, parte I, definiciones). Se mide con el mismo relieve que se vuela:
 * lo más alto y lo más bajo a 18,5 km del avión.
 *
 * Con eso las cinco islas del oeste son montaña por todos lados —del agua al
 * Teide hay 3715 m en menos de veinte kilómetros— y Lanzarote y Fuerteventura,
 * que no pasan de 671 y 807 m, no lo son: ahí vale el margen del llano.
 */
export const DESNIVEL_DE_MONTANA = 900;
export const DISTANCIA_DE_MONTANA = 18500;

/** Los rumbos de las catas alrededor de un punto: dieciséis, cada 22,5°. */
const ALREDEDOR = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * 2 * Math.PI;
  return [Math.sin(a), Math.cos(a)] as const;
});
/** Los anillos de catas: los de los obstáculos, y los de saber si es montaña. */
const ANILLOS_CERCA = [2000, 4000, 6000, RADIO_DE_OBSTACULOS];
const ANILLOS_LEJOS = [12500, DISTANCIA_DE_MONTANA];
/** Los de la regla visual: lo que hay a seiscientos metros. Ver `MARGEN_VISUAL`. */
const ANILLOS_VISUALES = [150, 300, 450, RADIO_VISUAL];

/** Lo que dice el relieve de un punto de la ruta. */
interface Cata {
  /** La altitud mínima en ruta allí, m. */
  readonly minima: number;
  /** Si es montaña. Ver `DESNIVEL_DE_MONTANA`. */
  readonly montana: boolean;
}

/**
 * Lo más alto a ocho kilómetros y si es montaña, catado en anillos cada dos
 * kilómetros y dieciséis rumbos: con el Teide, que es un cono de kilómetros de
 * ancho, la cata más cercana a la cumbre se queda a unas decenas de metros de
 * ella. `null` si no se sabe nada del suelo alrededor.
 *
 * Con `visual`, lo más alto a seiscientos metros y el margen del vuelo
 * visual. La montaña se cuenta igual en los dos: es lo que decide si se va por
 * el mar, y eso no depende de las reglas con las que se vuele.
 */
function catar(cota: Terreno["cota"], x: number, z: number, visual = false): Cata | null {
  let alto = cota(x, z);
  let bajo = alto;
  let techo = alto;
  const ver = (c: number | null, cerca: boolean) => {
    if (c === null) return;
    if (cerca) alto = alto === null ? c : Math.max(alto, c);
    bajo = bajo === null ? c : Math.min(bajo, c);
    techo = techo === null ? c : Math.max(techo, c);
  };
  for (const r of visual ? ANILLOS_VISUALES : ANILLOS_CERCA)
    for (const [sx, sz] of ALREDEDOR) ver(cota(x + sx * r, z + sz * r), true);
  if (alto === null) return null;
  if (visual)
    for (const r of ANILLOS_CERCA)
      for (const [sx, sz] of ALREDEDOR) ver(cota(x + sx * r, z + sz * r), false);
  for (const r of ANILLOS_LEJOS)
    for (const [sx, sz] of ALREDEDOR) ver(cota(x + sx * r, z + sz * r), false);
  const montana = techo! - bajo! > DESNIVEL_DE_MONTANA;
  const margen = visual ? MARGEN_VISUAL : montana ? MARGEN_EN_MONTANA : MARGEN_EN_LLANO;
  return { minima: alto + margen, montana };
}

/**
 * **La altitud mínima en ruta en un punto**, m: lo más alto que haya a ocho
 * kilómetros, más el margen de la montaña o el del llano según lo que haya a
 * diez millas. `null` si no se sabe nada del suelo alrededor.
 *
 * Con `visual`, la de un vuelo visual: ver `MARGEN_VISUAL`.
 */
export function minimaEnRuta(
  cota: Terreno["cota"],
  x: number,
  z: number,
  visual = false,
): number | null {
  return catar(cota, x, z, visual)?.minima ?? null;
}

/**
 * Lo que ya se calculó de cada tramo, para no repetirlo entre candidatas.
 * Ver `catasDelTramo`.
 */
type Memoria = Map<string, readonly (Cata | null)[]>;

/** Cada cuánto se cata la mínima en ruta a lo largo de un tramo, m. */
const PASO_EN_RUTA = MILLA;

/** Las catas a lo largo de un tramo, una cada `PASO_EN_RUTA` o menos. */
function catasDelTramo(
  a: Punto,
  b: Punto,
  cota: Terreno["cota"],
  memoria: Memoria,
  visual = false,
): readonly (Cata | null)[] {
  const clave = `${visual ? "v" : ""}${Math.round(a.x)},${Math.round(a.z)}>${Math.round(b.x)},${Math.round(b.z)}`;
  const hecho = memoria.get(clave);
  if (hecho) return hecho;
  const pasos = Math.max(1, Math.ceil(entre(a, b) / PASO_EN_RUTA));
  const catas: (Cata | null)[] = [];
  for (let k = 0; k <= pasos; k++) {
    const t = k / pasos;
    catas.push(catar(cota, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, visual));
  }
  memoria.set(clave, catas);
  return catas;
}

/**
 * Qué es un tramo para el relieve:
 *
 * - `carta`: de una salida o de una aproximación publicadas. Ya libra su
 *   terreno a las altitudes que manda su carta, y esa cuenta la hizo quien la
 *   publicó, con las áreas de protección de su diseño.
 * - `final`: de una aproximación calculada, o directo al umbral. Es una
 *   aproximación, no ruta, y se mira como tal. Ver `libra`.
 * - `ruta`: lo que no es de nadie, lo que une la salida con la llegada. Ahí
 *   manda la regla del aire.
 */
export function queTramo(a: Fijo, b: Fijo): "carta" | "final" | "ruta" {
  if (a.calculado === true) return "final";
  if (b.calculado !== true && mismoProcedimiento(a, b)) return "carta";
  if (b.papel === "umbral") return "final";
  return "ruta";
}

/**
 * **Si un plan libra el relieve** volado como se vuela: subiendo a un ritmo
 * de avión de línea desde la salida, sin pasar del techo del avión, y bajando
 * por la senda de tres grados hacia el umbral.
 *
 * Solo se miran **los tramos que no son de nadie**. Los de una salida o una
 * aproximación publicadas ya libran su terreno a las altitudes que manda su
 * carta, y esa cuenta la hizo quien la publicó. Es lo que se pidió con otras
 * palabras: la regla de las tres eses, antes que la ruta corta. Y cada tramo
 * con su regla:
 *
 * - **En ruta**, la del aire: 600 m por encima de lo más alto a 8 km en la
 *   montaña, 300 m en el llano. Ver `MARGEN_EN_MONTANA` y `minimaEnRuta`.
 * - **Despegando sin carta** —una cabecera sin salida publicada—, la regla
 *   del aire exceptúa el despegue, y lo que protege esa subida es lo de una
 *   salida omnidireccional de PANS-OPS (Doc 8168, vol. II, parte I, sección
 *   3): un área que sale de la pista con ciento cincuenta metros a cada lado y
 *   se abre quince grados, y un margen del 0,8 % de lo recorrido sobre lo que
 *   haya en ella. Hasta que el avión llega a la mínima en ruta; de ahí en
 *   adelante, la regla del aire.
 * - **En una aproximación calculada**, mil pies a una milla a cada lado,
 *   repartidos cerca del umbral: a tres millas no quedan mil pies de senda, y
 *   la mitad de lo que haya es lo que protege una final. La última milla es
 *   del aeródromo.
 *
 * `soloEnRuta` deja fuera la aproximación calculada, que es la misma para
 * cualquier ruta a esa cabecera: es lo que mira `trazar` para elegir.
 */
export function libra(
  fijos: readonly Fijo[],
  terreno: Terreno,
  cotaDelUmbral: number,
  memoria: Memoria = new Map(),
  soloEnRuta = false,
): boolean {
  const total = largo(fijos);
  let recorrido = 0;
  let despegando = fijos[0]?.papel === "despegue";
  const puede = (hecho: number): number => {
    const falta = total - hecho;
    const senda = cotaDelUmbral + (falta / (MILLAS_POR_MIL_PIES * MILLA)) * 1000 * PIE;
    const subida = terreno.cotaDeSalida + (hecho / (2 * MILLA)) * 1000 * PIE;
    return Math.min(terreno.techo, senda, Math.max(subida, cotaDelUmbral));
  };
  for (let i = 1; i < fijos.length; i++) {
    const a = fijos[i - 1]!;
    const b = fijos[i]!;
    const l = entre(a, b);
    const tipo = queTramo(a, b);
    // Por una carta se sale del despegue: la subida es cosa de su diseño.
    if (tipo === "carta") despegando = false;
    if (tipo === "carta" || l <= 1 || (tipo === "final" && soloEnRuta)) {
      recorrido += l;
      continue;
    }
    const ux = (b.x - a.x) / l;
    const uz = (b.z - a.z) / l;
    if (tipo === "ruta") {
      const catas = catasDelTramo(a, b, terreno.cota, memoria, terreno.visual === true);
      const pasos = catas.length - 1;
      for (let k = 0; k <= pasos; k++) {
        const t = (k / pasos) * l;
        const hecho = recorrido + t;
        const altura = puede(hecho);
        const minima = catas[k]?.minima ?? null;
        if (despegando) {
          if (minima === null || altura >= minima) {
            despegando = false;
            continue;
          }
          const ancho = Math.min(RADIO_DE_OBSTACULOS, 150 + hecho * Math.tan(Math.PI / 12));
          const x = a.x + ux * t;
          const z = a.z + uz * t;
          for (const lado of [-1, -0.5, 0, 0.5, 1]) {
            const c = terreno.cota(x - uz * lado * ancho, z + ux * lado * ancho);
            if (c !== null && c + 0.008 * hecho > altura) return false;
          }
          continue;
        }
        if (minima !== null && minima > altura) return false;
      }
    } else {
      const pasos = Math.max(1, Math.ceil(l / (0.5 * MILLA)));
      for (let k = 0; k <= pasos; k++) {
        const t = (k / pasos) * l;
        const hecho = recorrido + t;
        const falta = total - hecho;
        if (falta < MILLA) continue;
        const senda = cotaDelUmbral + (falta / (MILLAS_POR_MIL_PIES * MILLA)) * 1000 * PIE;
        const margen = Math.min(1000 * PIE, (senda - cotaDelUmbral) * 0.5);
        const altura = puede(hecho);
        const x = a.x + ux * t;
        const z = a.z + uz * t;
        for (const lado of [-1, 0, 1]) {
          const c = terreno.cota(x - uz * lado * MILLA, z + ux * lado * MILLA);
          if (c !== null && c + margen > altura) return false;
        }
      }
    }
    recorrido += l;
  }
  return true;
}

/**
 * Lo que se tolera de montaña bajo un tramo de ruta antes de decir que cruza
 * una isla, m: media milla. Es la punta de un cabo, o la raya de la costa en
 * un relieve de treinta metros por muestra; una isla cruzada son millas.
 */
export const MONTANA_QUE_NO_CRUZA = 0.5 * MILLA;

/**
 * Lo que no cuenta de un tramo de ruta junto a cada punta, m: tres millas.
 *
 * Hay puntos publicados tierra adentro —el VOR de Los Rodeos está a dos
 * millas de la costa norte— y la pista de la que se despega sin carta está en
 * tierra por fuerza. Llegar a ellos desde el mar o salir de ellos hacia el mar
 * no es cruzar la isla: es la tierra de ese punto. Tres millas dan para eso y
 * no para más: de ese VOR a la costa de Santa Cruz, cruzando La Laguna, hay
 * seis.
 */
export const ORILLA_DE_UN_PUNTO = 3 * MILLA;

/** Desde qué cota se cuenta como tierra, m: el mar del relieve es el cero. */
const TIERRA = 1;

/**
 * Lo que vuela un tramo **sobre tierra de montaña**, m, sin contar las
 * `orilla` primeras ni las últimas: catado cada décima de milla por su raya,
 * y con la montaña de la cata de ruta más cercana. Ver `DESNIVEL_DE_MONTANA`.
 * El suelo que no se sabe no cuenta.
 */
export function sobreLaMontana(
  a: Punto,
  b: Punto,
  cota: Terreno["cota"],
  memoria: Memoria = new Map(),
  orilla = 0,
): number {
  const l = entre(a, b);
  if (l <= 2 * orilla) return 0;
  const pasos = Math.max(1, Math.ceil(l / (0.1 * MILLA)));
  // Primero la tierra, que es una cata por punto; la montaña, que son cien,
  // solo si hay tierra: casi todos los tramos entre islas son mar entero.
  const enTierra: number[] = [];
  for (let k = 0; k < pasos; k++) {
    const t = (k + 0.5) / pasos;
    if (t * l < orilla || (1 - t) * l < orilla) continue;
    const c = cota(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    if (c !== null && c > TIERRA) enTierra.push(t);
  }
  if (enTierra.length === 0) return 0;
  const catas = catasDelTramo(a, b, cota, memoria);
  let montana = 0;
  for (const t of enTierra)
    if (catas[Math.round(t * (catas.length - 1))]?.montana) montana += l / pasos;
  return montana;
}

/**
 * **Si lo que no es de ninguna carta va por el mar** y no por encima de una
 * isla de montaña: si ningún tramo de ruta —ver `queTramo`— vuela más de
 * `MONTANA_QUE_NO_CRUZA` sobre ella, sin contar la tierra de sus puntas. Ver
 * `ORILLA_DE_UN_PUNTO`.
 *
 * De montaña, porque es lo que se pidió y lo que se hace: por encima de
 * Lanzarote o de Fuerteventura, que no llegan a novecientos metros, pasa a
 * diario el tráfico entre las dos, y rodearlas por el mar era doblar la ruta
 * sin ganar nada. Por encima de la Dorsal de Tenerife teniendo mar a los dos
 * lados no pasa nadie.
 *
 * No se mira lo publicado, que va por donde lo diseñaron —una salida de Los
 * Rodeos pasa por encima de La Laguna porque la pista está ahí—, ni la
 * aproximación, que acaba en tierra porque la pista está en tierra. Lo que
 * se mira es lo que se une entre las dos, que es lo único que decide quien
 * planea.
 */
export function porElMar(
  fijos: readonly Fijo[],
  cota: Terreno["cota"],
  memoria: Memoria = new Map(),
): boolean {
  for (let i = 1; i < fijos.length; i++) {
    const a = fijos[i - 1]!;
    const b = fijos[i]!;
    if (queTramo(a, b) !== "ruta") continue;
    if (sobreLaMontana(a, b, cota, memoria, ORILLA_DE_UN_PUNTO) > MONTANA_QUE_NO_CRUZA)
      return false;
  }
  return true;
}

/**
 * Si dos puntos seguidos son un tramo de una misma carta: de salida los dos,
 * de la cabecera a la salida, o de una aproximación hasta su umbral.
 */
function mismoProcedimiento(a: Fijo, b: Fijo): boolean {
  const deLaSalida = (f: Fijo) => f.papel === "salida" || f.deSalida === true;
  if ((a.papel === "despegue" || a.papel === "salida") && deLaSalida(b)) return true;
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
 *
 * **Y se queda el de la aproximación, sabiendo que también es de la salida.**
 * Se quedaba el de la salida, y el tramo que sale de él hacia la aproximación
 * —el primero de la carta de llegada— pasaba por no ser de nadie: se le pedía
 * la mínima en ruta a un tramo publicado, y se descartaba la entrada por el
 * VOR de Los Rodeos, que es la de quien llega por el este a la 12.
 */
function sinRepetidos(fijos: readonly Fijo[]): Fijo[] {
  const quedan: Fijo[] = [];
  for (const f of fijos) {
    const antes = quedan[quedan.length - 1];
    if (antes && antes.nombre === f.nombre && entre(antes, f) < 50) {
      if (antes.papel === "salida" && f.papel !== "salida")
        quedan[quedan.length - 1] = { ...f, deSalida: true };
      continue;
    }
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
 * Y del resultado, el nivel legal más cercano por el rumbo, con el relieve:
 * eso lo pone `cruceroDelPlan`, que es el crucero que se vuela y se anuncia.
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
  /**
   * **Y dónde se acaba de subir**, el «T/C» de una pantalla de navegación:
   * el punto de la ruta en el que se llega al crucero, o `null` si ya se está
   * en él o no cabe antes del descenso. Ver `DOS_MILLAS_POR_MIL_PIES`.
   */
  readonly puntoDeSubida: Punto | null;
}

/**
 * Las millas que se recorren subiendo mil pies, la regla con la que se planea
 * la subida: dos. Es la misma que usa el crucero —ver `cruceroPorLaDistancia`—
 * y la que mira `libra`, así que el T/C cae donde el plan cuenta que se sube.
 */
export const MILLAS_POR_MIL_PIES_SUBIENDO = 2;

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
 * **La mínima en ruta del crucero**, m, o `null` si no se sabe nada del
 * suelo: la más alta que pide la regla del aire a lo largo de la ruta —ver
 * `minimaEnRuta`—, sin contar las ocho primeras millas ni las ocho últimas,
 * que se vuelan subiendo o bajando por su carta.
 *
 * Sirve para que el crucero planeado no quede por debajo de un monte: ni el
 * Teide en medio de una ruta corta puede decidir el crucero la distancia sola.
 * Era lo más alto a una milla con mil pies encima; es lo mismo que se le pide
 * a cada tramo de la ruta, para que el plan y el crucero no midan el monte
 * con dos reglas distintas.
 */
export function minimaEnCrucero(
  r: Ruta,
  cota: Terreno["cota"],
  /** Con la regla del vuelo visual. Ver `MARGEN_VISUAL`. */
  visual = false,
): number | null {
  let alto: number | null = null;
  const orilla = 8 * MILLA;
  for (let i = 1; i < r.fijos.length; i++) {
    const a = r.fijos[i - 1]!;
    const b = r.fijos[i]!;
    const l = entre(a, b);
    if (l < 1) continue;
    const pasos = Math.ceil(l / PASO_EN_RUTA);
    for (let k = 0; k <= pasos; k++) {
      const t = k / pasos;
      const hecho = r.acumulado[i - 1]! + t * l;
      if (hecho < orilla || r.total - hecho < orilla) continue;
      const m = minimaEnRuta(cota, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, visual);
      if (m !== null && (alto === null || m > alto)) alto = m;
    }
  }
  return alto;
}

/**
 * **El crucero del plan**, m: el nivel al que se va. Uno solo, y lo usan los
 * dos que lo cuentan: el plan, que pone con él el punto de descenso, y la
 * comandante, que lo anuncia en la bienvenida. Eran dos cuentas distintas —
 * esta y otra por kilómetros en línea recta— y de Los Rodeos a Tenerife Sur la
 * comandante anunciaba diez mil pies para un plan de doce mil. Ver
 * `nivelDicho` en `audio/partes-de-la-comandante.ts`.
 *
 * Lo que pide la distancia —ver `cruceroPorLaDistancia`—, nunca por debajo de
 * la mínima en ruta —ver `minimaEnCrucero`—, y de ahí el nivel legal más
 * cercano por el rumbo magnético de la salida a la llegada: ver
 * `nivel-de-crucero.ts`. Si ese nivel cae por debajo de lo que hace falta se
 * sube uno en su sentido; si se pasa del techo del avión, se baja uno.
 *
 * `declinacion` es la del campo de salida, en grados, con el signo del
 * escenario: magnético = verdadero + declinación.
 *
 * **Y quien vuela mirando por la ventana va a su medio nivel**: 4500, 6500…
 * con el mismo rumbo, que es lo que separa a los que van con reglas visuales
 * de los que van por instrumentos. Ver `MEDIO_NIVEL` en `nivel-de-crucero.ts`.
 * Y nunca por encima de lo que da el avión: un vuelo visual va **a la altura
 * que se pueda**, y si la mínima pidiera más, es que esa ruta no es para él.
 */
export function cruceroDelPlan(
  r: Ruta,
  avion: {
    readonly techo: number;
    readonly cotaDeSalida: number;
    readonly declinacion: number;
    readonly visual?: boolean;
    /**
     * **La ficha del avión, para elegir por kilos.** Con ella el nivel es el
     * que menos quema de los legales —ver `nivelQueAhorra`—; sin ella, el de
     * la regla de la distancia, que es lo que había y lo que siguen usando las
     * cuentas que no saben qué avión vuela.
     */
    readonly ficha?: AircraftConfig;
  },
  minima: number | null,
): number {
  const a = r.fijos[0];
  const b = r.fijos[r.fijos.length - 1];
  if (!a || !b) return 0;
  const visual = avion.visual === true;
  const verdadero = (Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI;
  const magnetico = verdadero + avion.declinacion;
  const minimo = minima ?? 0;
  const tope = visual ? avion.techo : Math.max(avion.techo, minimo);
  const suelo = visual ? 1500 : 3000;
  if (avion.ficha) {
    /*
     * Los niveles legales por el rumbo, de la mínima al techo: los mismos que
     * da `nivelPara`, uno de cada dos millares.
     */
    const legales: number[] = [];
    const base = (haciaElEste(magnetico) ? UN_NIVEL : 0) + (visual ? MEDIO_NIVEL : 0);
    for (let n = base + UN_NIVEL; n <= HASTA; n += 2 * UN_NIVEL) {
      if (n < suelo || n * PIE < minimo - 1 || n * PIE > tope + 1) continue;
      legales.push(n * PIE);
    }
    const ahorra = nivelQueAhorra(
      avion.ficha,
      r.total,
      legales,
      avion.cotaDeSalida,
      r.cotaDelUmbral,
    );
    if (ahorra !== null) return ahorra;
  }
  const pedido = Math.max(cruceroPorLaDistancia(r, avion.techo, avion.cotaDeSalida), minimo);
  let nivel = nivelPara(magnetico, pedido / PIE, visual);
  while (nivel * PIE < minimo - 1 && nivel * PIE < avion.techo) nivel += 2000;
  while (nivel * PIE > tope + 1 && nivel > suelo) nivel -= 2000;
  return nivel * PIE;
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
  /**
   * La altitud de la ventanilla del automático, m, si el avión la lleva y
   * está puesta. Subiendo hacia ella por encima del plan, el descenso cuenta
   * con ella: es a donde se va. Ver `Seguimiento.desde`.
   */
  readonly ventanilla?: number | null;
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

  /** El crucero con el que se puso el plan, m. Ver `cruceroDelPlan`. */
  get cruceroPlaneado(): number {
    return this.crucero;
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
   * **A qué altitud se acaba la bajada del plan**, m: la del punto de final,
   * con lo que publique su carta. Es la que se pone en la ventanilla del
   * automático al empezar a bajar, y hasta la que baja él. Ver
   * `alturaParaElAutomatico`. `null` sin plan.
   */
  get alturaDelFinal(): number | null {
    const r = this.ruta;
    if (!r || r.fijos.length < 2) return null;
    const faf = r.fijos.findIndex((f) => f.papel === "faf");
    const suelo = faf > 0 ? r.total - r.acumulado[faf]! : 5 * MILLA;
    return alturaDeLaSenda(r, faf > 0 ? faf : r.fijos.length - 1, suelo);
  }

  /**
   * La altura de la que hay que bajar: la de ahora si se va nivelado, y la
   * del crucero planeado si todavía se sube hacia él. Así el punto de
   * descenso no se echa encima mientras se sube, ni se queda en el crucero
   * del plan si se decidió volar más bajo.
   *
   * **Y si se sube por encima del plan, la de verdad.** Contado jugando: «si
   * la comandante dice que vamos a ir a diez mil pies y yo subo hasta doce mil,
   * bajar me costó». Nivelado más alto ya contaba la altura de ahora; subiendo
   * hacia una ventanilla más alta que el plan, cuenta la ventanilla, que es
   * a donde se va: el descenso se adelanta en cuanto se decide subir, no al
   * llegar arriba.
   */
  private desde(l: Lectura): number {
    const va = Math.max(this.crucero, l.ventanilla ?? -Infinity);
    if (l.enTierra) return Math.max(l.altitud, this.crucero);
    return l.vertical > 1.5 ? Math.max(l.altitud, va) : l.altitud;
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
      puntoDeSubida: this.dondeSeAcabaDeSubir(l, falta, descenso),
    };
    return { descenso: ahora, cambio: this.activo !== antes };
  }

  /**
   * **El «T/C»**: dónde se llega al crucero, contado desde aquí con la regla
   * de la subida. Solo mientras queda por subir y si cae antes del punto de
   * descenso: en un salto tan corto que no llega a haber crucero, un T/C
   * detrás del T/D sería un punto que no se vuela.
   */
  private dondeSeAcabaDeSubir(
    l: Lectura,
    falta: number,
    descenso: number | null,
  ): Punto | null {
    const r = this.ruta;
    if (!r || this.yaBajando) return null;
    const queda = this.crucero - l.altitud;
    if (queda < 300 * PIE) return null;
    const subida = (queda / PIE / 1000) * MILLAS_POR_MIL_PIES_SUBIENDO * MILLA;
    const alli = falta - subida;
    if (alli <= (descenso ?? 0)) return null;
    return puntoAFaltando(r, alli);
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
   * **Si ya se vuela el último tramo, del punto de final al umbral.** Ahí
   * manda la senda de la final —el `G/S` del automático— y en la ventanilla
   * va la altitud de la frustrada. Media milla antes del punto, que es cuando
   * se captura la senda desde abajo.
   */
  enElTramoFinal(l: Lectura): boolean {
    const r = this.ruta;
    if (!r || !this.yaBajando || l.enTierra) return false;
    const falta = restante(r, this.activo, l.x, l.z);
    const faf = r.fijos.findIndex((f) => f.papel === "faf");
    const suelo = faf > 0 ? r.total - r.acumulado[faf]! : 5 * MILLA;
    return falta <= suelo + MILLA / 2;
  }

  /**
   * **La senda de la final**: a qué altitud va a esta distancia del umbral y
   * a qué ritmo baja, para el `G/S` del automático. Es la de tres grados hasta
   * el umbral, sin el suelo del punto de final —ése ya se ha pasado— ni lo
   * que publique la carta para él. `null` sin plan.
   */
  sendaDeLaFinal(l: Lectura): { readonly altitud: number; readonly ritmo: number } | null {
    const r = this.ruta;
    if (!r) return null;
    const falta = restante(r, this.activo, l.x, l.z);
    return {
      altitud: alturaDeLaSenda(r, this.activo, falta, this.aireSobreSuelo, false),
      ritmo: -Math.max(0, l.aire) * ((1000 * PIE) / (MILLAS_POR_MIL_PIES * MILLA)),
    };
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
