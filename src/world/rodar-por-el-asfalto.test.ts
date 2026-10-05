/**
 * **Por el asfalto y no por la pista: los dieciocho campos, todos los puestos.**
 *
 * La raya verde cruzó el césped muchas veces, y cada vez se arregló en un
 * sitio: el paso de la pista, el cosido de las calles, el enganche, la recta
 * de emergencia. Volvió siempre por otro. Y en Los Rodeos, saliendo hacia La
 * Palma, salió todo junto: «me haces salir a la pista para volver a entrar
 * atravesando el jardín», «usas la pista de despegue y aterrizaje como pista
 * de rodadura por lo menos la mitad del trayecto, cuando hay una paralela
 * para eso». Así que esto no mira un aeródromo ni un caso: mira todos los
 * puestos de todos los campos, por las dos cabeceras, con el avión más chico
 * y el más grande que caben, con cola de tráfico delante, recalculando desde
 * cualquier punto del camino, y la vuelta después de aterrizar. Lo que se
 * pide es lo de verdad:
 *
 * - **(a) Ningún punto de la raya pisa hierba ni un edificio**: todo va por
 *   pavimento de calle, plataforma o pista, con margen de media calle —ver
 *   `MARGEN_DEL_PAVIMENTO` en `rodaje.ts`—, y nada atraviesa un hangar que
 *   la plataforma rodee.
 * - **(b) Ninguna recta inventada**: lo que no va por una calle del grafo va
 *   por una plataforma o por la pista.
 * - **(c) La pista, solo para alinearse**: del puesto a la doble raya no se
 *   rueda por ninguna pista; para despegar no se remonta la pista en uso más
 *   que para alinearse; y al volver no se vuelve por ella. Salvo en los campos
 *   que no tienen paralela hasta la cabecera, o salida por delante al
 *   aterrizar, que se listan abajo con su porqué — y la lista se comprueba
 *   contra la geometría del campo, para que no sirva de coladero.
 * - **(d) Y lo mismo al recalcular** desde cualquier punto de la raya, que es
 *   lo que pasa cuando el avión se aparta o la cola se mueve.
 * - **Y la cola de salida no se esquiva**: el de delante va a la misma pista,
 *   y detrás de él se espera por la misma calle.
 * - **(e) Ningún avión despega con menos pista de la que necesita**, con el
 *   margen de su clase —`pistaNecesariaHoy` en `flight/carrera.ts`: 1,33 de
 *   escuela la avioneta, con su suelo de seiscientos metros, y 1,15 de la
 *   norma de certificación el de línea—, y donde el AIP no deja salir por
 *   intersección, desde la cabecera. En toda la flota: cada
 *   avión que cabe en el campo, desde cada punto de espera que el plan
 *   considera.
 *
 * Con `OGA_TABLA=1` imprime la tabla de los dieciocho campos.
 */

import { describe, expect, it } from "vitest";
import { aLaPolilinea, ANCHO_RODADURA, type Aerodrome, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { pistaNecesariaHoy } from "../flight/carrera";
import { esDeLinea } from "../flight/velocidades-en-tierra";
import { construirGrafo, LEJOS_DE_LA_PARED, type Grafo } from "./rodaje";
import { enEjesDePista } from "./rumbo";
import { SCENARIOS, conViento, type Scenario } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { tiposDelCampo } from "./trafico";
import { TIEMPO_DE_CASA } from "./meteo";

/** «Con margen de medio ancho»: media calle de rodaje. */
const MEDIO_ANCHO = ANCHO_RODADURA / 2;

/** Cada cuánto se mira la raya, m. */
const PASO = 2;

/** Cada cuánto se recalcula desde un punto de la raya, m. */
const CADA = 80;

/** Lo más largo que puede ser una recta que no va por ninguna calle, m. */
const RECTA_SUELTA = 60;

/**
 * Lo que se tolera avanzar a lo largo de una pista rodando hacia la doble
 * raya, m: cruzarla en diagonal, que en Gran Canaria —dos pistas— es la única
 * forma de ir de una plataforma a la otra pista, son cuarenta y pico.
 */
const PISTA_AL_RODAR = 60;

/**
 * Lo que se puede remontar la pista para alinearse, m, contado desde la boca
 * más cercana a la cabecera: entrar por una calle que llega a la pista y
 * girar hacia donde se despega.
 */
const ALINEARSE = 60;

/**
 * Hasta dónde puede quedar del final de la pista la boca más cercana y ser
 * todavía la de una paralela que llega a la cabecera, m. En Tenerife Sur,
 * por la 25, la paralela está y su última boca entra a 175 m del final; el
 * primer campo sin paralela, Encarnación por la 20, tiene la suya a 299.
 */
const CABECERA = 250;

/**
 * Lo que hace falta por delante para tomar una salida rodando a ocho metros
 * por segundo, que es como para el avión la prueba, m: `HUECO_PARA_GIRAR`.
 */
const PARA_TOMAR_UNA_SALIDA = 25;

/** Un campo que se lista, el porqué y las cabeceras en uso a las que toca. */
interface Listado {
  readonly porque: string;
  readonly cabeceras: readonly number[];
}

/**
 * **Los campos sin paralela hasta la cabecera**, donde para despegar se
 * remonta la pista porque no hay otra: ninguna calle llega a menos de
 * `CABECERA` del final por el que se despega. Por campo, con las cabeceras
 * en uso —el rumbo del juego— y el porqué.
 *
 * Y la lista no se puede inflar ni quedarse corta: la prueba mide en el grafo
 * a qué bocas de la pista se llega desde los puestos sin pisar ninguna pista,
 * y cada cabecera está en la lista **si y solo si** ninguna llega a la
 * cabecera. Aun listada, lo que se remonta es lo que va de la boca más
 * cercana a la cabecera, y ni un metro más.
 *
 * Donde la pista es más estrecha que `ANCHO_PARA_LA_VUELTA` no hay back-taxi
 * dibujado —ver esa constante en `plan-de-vuelo.ts`—, y ahí se despega desde
 * la boca con lo que queda: se lista igual, porque la paralela tampoco está.
 */
const SIN_PARALELA: Readonly<Record<string, Listado>> = {
  "yvytu-rape": {
    porque:
      "Dieciocho metros de pista y una sola calle, a media pista. Sin back-taxi por lo estrecha: " +
      "se despega desde la boca con lo que queda.",
    cabeceras: [140, 320],
  },
  guarani: {
    porque:
      "Las dos calles de la plataforma llegan a la pista a media pista, a 1.480 y 2.337 m de la " +
      "cabecera 05. Las bocas de los extremos son de las raquetas, y a ellas solo se llega por la pista.",
    cabeceras: [41, 221],
  },
  encarnacion: {
    porque: "Una sola calle, que llega a la pista a 300 m de la cabecera 20 y a 1.600 de la 02.",
    cabeceras: [12, 192],
  },
  concepcion: {
    porque: "Una sola calle, a mitad de pista.",
    cabeceras: [16, 196],
  },
  ayolas: {
    porque: "La única calle llega a la cabecera 02: para despegar por la 20 se remonta la pista entera.",
    cabeceras: [190],
  },
  pilar: {
    porque:
      "Dieciocho metros de pista y una sola calle, a un tercio de ella. Sin back-taxi por lo " +
      "estrecha: se despega desde la boca.",
    cabeceras: [5, 185],
  },
  estigarribia: {
    porque: "Una sola calle, a 550 m de la cabecera 19: por la 01 se remonta casi toda la pista.",
    cabeceras: [178, 358],
  },
  "pedro-juan": {
    porque:
      "Una sola calle, a media pista. Treinta metros de ancho: sin back-taxi, se despega desde la boca.",
    cabeceras: [14, 194],
  },
  "la-palma": {
    porque:
      "AIP AD 2-GCLA: se entra en la pista por las calles A, B y C, que llegan a ella desde la " +
      "plataforma, a media pista, y la vuelta se da en la raqueta del final («back-track at the " +
      "end of the runway»).",
    cabeceras: [179, 359],
  },
  "el-hierro": {
    porque:
      "Las calles de la plataforma llegan a la pista entre 360 y 590 m de la cabecera 34; a las " +
      "raquetas de los extremos solo se llega por la pista. Treinta metros de ancho: sin back-taxi.",
    cabeceras: [152, 332],
  },
  "la-gomera": {
    porque:
      "Una sola calle, la A. El AIP (AD 2-GCGM) permite despegar desde su intersección, y en los dos " +
      "extremos hay raquetas. Treinta metros de ancho: sin back-taxi.",
    cabeceras: [81, 261],
  },
};

/**
 * **Y los que, aterrizando, no tienen salida por delante** de donde para el
 * avión en la prueba: se vuelve por la pista hasta la boca que quedó atrás,
 * o hasta la raqueta del final y de vuelta. La misma regla: listado si y solo
 * si ninguna boca a la que se llega sin pisar pista queda delante.
 */
const VUELTA_POR_LA_PISTA: Readonly<Record<string, Listado>> = {
  "yvytu-rape": { porque: "La única calle queda a media pista, donde para el avión o poco antes.", cabeceras: [140, 320] },
  encarnacion: { porque: "Aterrizando por la 20, la única calle queda a 300 m del umbral.", cabeceras: [192] },
  concepcion: { porque: "Aterrizando por la 21, la única calle queda antes de mitad de pista.", cabeceras: [196] },
  ayolas: { porque: "Aterrizando por la 02, la única calle está en el umbral.", cabeceras: [10] },
  pilar: { porque: "Aterrizando por la 02, la única calle queda a un tercio de la pista.", cabeceras: [5] },
  estigarribia: { porque: "Aterrizando por la 19, la única calle queda a 550 m del umbral.", cabeceras: [178] },
  "pedro-juan": { porque: "La única calle, a media pista, queda detrás de donde para el avión.", cabeceras: [14, 194] },
  "el-hierro": {
    porque: "Aterrizando por la 34, las calles de la plataforma quedan antes de donde para el avión.",
    cabeceras: [332],
  },
  "la-gomera": {
    porque: "Aterrizando por la 27, la calle A queda a 400 m del umbral, y delante solo está la raqueta.",
    cabeceras: [261],
  },
};

const CAMPOS = SCENARIOS.filter((e) => e.aerodrome);

/** Las cabeceras en uso posibles: las que da el viento, como en el juego. */
function cabeceras(esc0: Scenario): Scenario[] {
  const por = new Map<number, Scenario>();
  for (let v = 0; v < 360; v += 10) {
    const e = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

/** El avión más chico y el más grande que caben en el campo. */
function avionesDe(esc: Scenario): AircraftConfig[] {
  const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
  return [...new Set([caben[0] ?? AIRCRAFT[0]!, caben[caben.length - 1] ?? AIRCRAFT[0]!])];
}

function dentro(p: Punto, poligono: readonly Punto[]): boolean {
  let d = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i]!;
    const b = poligono[j]!;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0])
      d = !d;
  }
  return d;
}

/**
 * Líneas repartidas en casillas, para preguntar «¿está este punto a menos de
 * tanto de alguna?» sin recorrerlas todas: un aeropuerto grande son ochenta
 * calles y cientos de puntos por raya.
 */
function porCasillas(lineas: { linea: readonly Punto[]; hasta: number }[]) {
  const LADO = 50;
  const casillas = new Map<string, { a: Punto; b: Punto; hasta: number }[]>();
  for (const { linea, hasta } of lineas)
    for (let i = 0; i < linea.length - 1; i++) {
      const a = linea[i]!;
      const b = linea[i + 1]!;
      for (let x = Math.floor((Math.min(a[0], b[0]) - hasta) / LADO); x <= Math.floor((Math.max(a[0], b[0]) + hasta) / LADO); x++)
        for (let y = Math.floor((Math.min(a[1], b[1]) - hasta) / LADO); y <= Math.floor((Math.max(a[1], b[1]) + hasta) / LADO); y++) {
          const k = `${x},${y}`;
          if (!casillas.has(k)) casillas.set(k, []);
          casillas.get(k)!.push({ a, b, hasta });
        }
    }
  return (q: Punto) =>
    (casillas.get(`${Math.floor(q[0] / LADO)},${Math.floor(q[1] / LADO)}`) ?? []).some(
      (s) => aLaPolilinea(q, [s.a, s.b]) < s.hasta,
    );
}

/** Polígonos repartidos en casillas, para preguntar «¿está dentro de alguno?». */
function porDentro(poligonos: readonly (readonly Punto[])[]) {
  const LADO = 50;
  const casillas = new Map<string, (readonly Punto[])[]>();
  for (const poligono of poligonos) {
    if (poligono.length < 3) continue;
    const xs = poligono.map((q) => q[0]);
    const ys = poligono.map((q) => q[1]);
    for (let x = Math.floor(Math.min(...xs) / LADO); x <= Math.floor(Math.max(...xs) / LADO); x++)
      for (let y = Math.floor(Math.min(...ys) / LADO); y <= Math.floor(Math.max(...ys) / LADO); y++) {
        const k = `${x},${y}`;
        if (!casillas.has(k)) casillas.set(k, []);
        casillas.get(k)!.push(poligono);
      }
  }
  return (q: Punto) =>
    (casillas.get(`${Math.floor(q[0] / LADO)},${Math.floor(q[1] / LADO)}`) ?? []).some((p) =>
      dentro(q, p),
    );
}

/** Lo que hace falta para medir en un campo, hecho una vez. */
function medidorDe(aero: Aerodrome, pista: Scenario["runway"]) {
  const grafo = construirGrafo(aero);
  const cerrado = (p: readonly Punto[]) => [...p, p[0]!] as Punto[];
  const plataformas = aero.aprons.filter((a) => a.polygon.length >= 3);
  const bordeDePlataforma = porCasillas(
    plataformas.map((a) => ({ linea: cerrado(a.polygon), hasta: MEDIO_ANCHO })),
  );
  const enPlataforma = (q: Punto) =>
    bordeDePlataforma(q) || plataformas.some((a) => dentro(q, a.polygon));
  const pistas = aero.runways.filter((r) => r.centerline.length > 1);
  /*
   * Y la pista en uso tal como la vuela el juego: el rectángulo entre sus dos
   * umbrales. En Pedro Juan Caballero el eje de OpenStreetMap tiene un codo y
   * el de despegar es recto, y lo que va por el recto también es pista.
   */
  const enLaDelJuego = (q: Punto) => {
    const e = enEjesDePista(q[0], -q[1], pista.x, pista.z, pista.heading);
    return Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < pista.length / 2;
  };
  const enUnaPista = (q: Punto) =>
    pistas.find((r) => aLaPolilinea(q, r.centerline) < (r.widthM ?? 45) / 2) ??
    (enLaDelJuego(q) ? pistas[0] : undefined);
  const calleOPista = porCasillas([
    ...pistas.map((r) => ({ linea: r.centerline, hasta: (r.widthM ?? 45) / 2 + MEDIO_ANCHO })),
    ...aero.taxiways.map((c) => ({
      linea: c.path,
      hasta: (c.widthM ?? ANCHO_RODADURA) / 2 + MEDIO_ANCHO,
    })),
  ]);
  const enUnEdificio = porDentro(aero.buildings.map((e) => e.polygon));
  const pavimentado = (q: Punto) =>
    (calleOPista(q) || enPlataforma(q) || enLaDelJuego(q)) && !enUnEdificio(q);
  /*
   * Un puesto pegado a una pared tampoco es sitio de aparcar: el plan no
   * saca de ahí a nadie —ver `LEJOS_DE_LA_PARED` en `rodaje.ts`—, y en
   * Cuatro Vientos hay uno dibujado a metro y medio de un edificio.
   */
  const pegadoAUnaPared = porCasillas(
    aero.buildings
      .filter((e) => e.polygon.length >= 3)
      .map((e) => ({ linea: [...e.polygon, e.polygon[0]!], hasta: LEJOS_DE_LA_PARED })),
  );
  const sePuedeAparcar = (q: Punto) => pavimentado(q) && !pegadoAUnaPared(q);
  const enElGrafo = porCasillas(grafo.tramos.map((t) => ({ linea: t.puntos, hasta: 3 })));
  return { grafo, pavimentado, sePuedeAparcar, enPlataforma, enUnaPista, enElGrafo };
}

/**
 * **Las bocas de la pista en uso a las que se llega desde algún puesto por
 * las calles, sin pisar ninguna pista**, en metros desde la cabecera de
 * despegue: negativos si la calle llega antes del umbral.
 *
 * Una boca es un nudo de la pista dibujada del que sale una calle. Se sale
 * de cada puesto por la calle que tiene más cerca y se anda por todas las que
 * no son pista. Es geometría del campo, no la cuenta del plan: con esto se
 * decide qué campos se pueden listar.
 */
function bocasDe(
  aero: Aerodrome,
  pista: Scenario["runway"],
  /** Desde qué puestos; sin ellos, desde todos. */
  desde?: readonly Punto[],
  grafo: Grafo = construirGrafo(aero),
): number[] {
  const llega = new Set<number>();
  const pendientes: number[] = [];
  for (const xy of desde ?? (aero.parkingPositions ?? []).map((p) => p.xy)) {
    const puesto = { xy };
    let mejor: number | null = null;
    let d = Infinity;
    grafo.tramos.forEach((t, k) => {
      if (t.pista) return;
      const x = aLaPolilinea(puesto.xy, t.puntos);
      if (x < d) {
        d = x;
        mejor = k;
      }
    });
    if (mejor === null) continue;
    const t = grafo.tramos[mejor]!;
    for (const n of [t.a, t.b]) if (!llega.has(n)) llega.add(n), pendientes.push(n);
  }
  /*
   * **Y una calle dibujada encima de la pista es pista.** En El Hierro hay
   * trozos de calle que corren por el asfalto de la pista, a dos metros del
   * eje, uniendo las bocas de las dos mitades de la plataforma: ir por ellos
   * es rodar por la pista, y el plan lo sabe —lo cuenta como cruzarla—. Una
   * calle que solo entra en la pista por su boca, o una salida rápida que la
   * deja en diagonal, la cruza de través; ésta va a lo largo de ella.
   */
  const porEncima = (t: Grafo["tramos"][number]) => {
    // Lo que corre dentro de la pista: largo a lo largo del eje y estrecho de
    // través. Una boca o una salida rápida la atraviesan de través.
    let a0 = Infinity;
    let a1 = -Infinity;
    let t0 = Infinity;
    let t1 = -Infinity;
    for (const q of t.puntos) {
      const e = enEjesDePista(q[0], -q[1], pista.x, pista.z, pista.heading);
      if (Math.abs(e.across) >= pista.width / 2 || Math.abs(e.along) >= pista.length / 2) continue;
      a0 = Math.min(a0, e.along);
      a1 = Math.max(a1, e.along);
      t0 = Math.min(t0, e.across);
      t1 = Math.max(t1, e.across);
    }
    return a1 - a0 > 15 && t1 - t0 < 6;
  };
  while (pendientes.length) {
    const n = pendientes.pop()!;
    for (const k of grafo.desde[n] ?? []) {
      const t = grafo.tramos[k]!;
      if (t.pista || porEncima(t)) continue;
      const otro = t.a === n ? t.b : t.a;
      if (!llega.has(otro)) llega.add(otro), pendientes.push(otro);
    }
  }
  const bocas: number[] = [];
  for (const n of llega) {
    if (!(grafo.desde[n] ?? []).some((k) => grafo.tramos[k]!.pista)) continue;
    const q = grafo.nudos[n]!;
    const e = enEjesDePista(q[0], -q[1], pista.x, pista.z, pista.heading);
    if (Math.abs(e.across) > pista.width / 2 + MEDIO_ANCHO) continue;
    bocas.push(e.along + pista.length / 2);
  }
  return bocas.sort((a, b) => a - b);
}

/** Donde para el avión en la prueba de la vuelta, m desde el umbral. */
const paraEn = (pista: Scenario["runway"]) => Math.min(pista.length * 0.55, 1100);

/**
 * **Y más sitios donde parar**, en fracción de pista: la vuelta se mira
 * también parando antes y después, que es donde aparecen la media vuelta y
 * la raqueta del final. La prueba de siempre para en un sitio, y con uno
 * solo no se ve lo que pasa si se frena antes o se pasa la última salida.
 */
const OTRAS_PARADAS = [0.3, 0.45, 0.65, 0.8] as const;

/**
 * Lo que se pasa de largo antes de dar la media vuelta en la pista, m: el
 * hueco para girar, el radio y lo que se tarda en frenar a ocho metros por
 * segundo. Ver `vueltaPorLaPista` en el plan.
 */
const GIRO_EN_LA_PISTA = 120;

/**
 * Dos bocas a menos de esto son las dos ramas de una misma salida, o dos
 * seguidas, m: dando la media vuelta se puede volver a cualquiera de ellas.
 */
const MISMA_SALIDA = 150;

/**
 * Lo que se puede remontar volviendo, parando en `para`: con salida por
 * delante, lo de alinearse, o la media vuelta hasta la boca de atrás si sale
 * más a cuenta; sin ella, hasta el final y de vuelta, que es lo que manda el
 * AIP de La Palma —«back-track at the end of the runway»— y lo que dice la
 * torre en un campo sin paralela.
 */
function alVolverDesde(
  pista: Scenario["runway"],
  bocas: readonly number[],
  para: number,
): number {
  const detras = bocas.filter((b) => b <= para + PARA_TOMAR_UNA_SALIDA);
  const cerca = detras[detras.length - 1];
  if (cerca === undefined) return ALINEARSE;
  const boca = Math.min(...detras.filter((b) => b >= cerca - MISMA_SALIDA));
  const girando = Math.max(ALINEARSE, para + GIRO_EN_LA_PISTA - boca);
  const hayDelante = detras.length < bocas.length;
  if (hayDelante) return girando;
  return Math.max(girando, pista.length - cerca + ALINEARSE);
}

/** Qué dice la geometría de una cabecera: si va en cada lista, y cuánto se puede remontar. */
function loQueTocaEn(pista: Scenario["runway"], bocas: readonly number[]) {
  const primera = bocas[0] ?? Infinity;
  const para = paraEn(pista);
  const detras = bocas.filter((b) => b <= para + PARA_TOMAR_UNA_SALIDA);
  const sinSalidaDelante = detras.length === bocas.length;
  return {
    sinParalela: primera > CABECERA,
    sinSalidaDelante,
    /** Lo que se puede remontar para despegar, m. */
    alSalir: Math.max(0, primera) + ALINEARSE,
    /** Y volviendo: hasta la raqueta del final y de vuelta a la boca de atrás. */
    alVolver: sinSalidaDelante
      ? pista.length - (detras[detras.length - 1] ?? 0) + ALINEARSE
      : ALINEARSE,
    bocas,
  };
}

/** Una raya a trozos de `PASO` metros, con la dirección de cada trozo. */
function aTrozos(raya: readonly Punto[]): { q: Punto; dir: Punto }[] {
  const o: { q: Punto; dir: Punto }[] = [];
  for (let i = 0; i < raya.length - 1; i++) {
    const [ax, ay] = raya[i]!;
    const [bx, by] = raya[i + 1]!;
    const d = Math.hypot(bx - ax, by - ay);
    if (d < 1e-6) continue;
    const dir: Punto = [(bx - ax) / d, (by - ay) / d];
    for (let s = 0; s < d; s += PASO) o.push({ q: [ax + dir[0] * s, ay + dir[1] * s], dir });
  }
  return o;
}

interface Medida {
  /** Metros por hierba. (a) */
  hierba: number;
  /** Metros de rectas que no van por calle, plataforma ni pista. (b) */
  inventado: number;
  /**
   * Lo más que se avanza a lo largo de una pista sin salir de ella, m. (c)
   * Cruzarla, aunque sea en diagonal, es su ancho y poco más; rodar por ella
   * es mucho más.
   */
  porPista: number;
  /**
   * Lo más que se retrocede por la pista en uso sin salir de ella, m: la
   * distancia entre lo más adelante que se llegó y lo más atrás que se
   * volvió. Es lo que se remonta, y no cuenta la diagonal de una salida
   * tomada en ángulo ni el ir y venir de una media vuelta. (c)
   */
  remonta: number;
}

function medir(
  m: ReturnType<typeof medidorDe>,
  raya: readonly Punto[],
  pista: Scenario["runway"],
  sentido: 1 | -1,
): Medida {
  const r: Medida = { hierba: 0, inventado: 0, porPista: 0, remonta: 0 };
  let tirada = 0;
  let masAdelante = -Infinity;
  for (const { q, dir } of aTrozos(raya)) {
    if (!m.pavimentado(q)) r.hierba += PASO;
    const enPista = m.enUnaPista(q);
    if (!enPista) tirada = 0;
    if (enPista) {
      const a = enPista.centerline[0]!;
      const b = enPista.centerline[enPista.centerline.length - 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      tirada += Math.abs((dir[0] * (b[0] - a[0]) + dir[1] * (b[1] - a[1])) / l) * PASO;
      r.porPista = Math.max(r.porPista, tirada);
    }
    /*
     * Por cualquier pista dibujada, no solo por el rectángulo de la del
     * juego: en Mariscal Estigarribia el eje de OpenStreetMap va a veinticinco
     * metros del de umbral a umbral, y lo que se rueda por aquél también es
     * pista.
     */
    if (enPista) {
      const aqui = enEjesDePista(q[0], -q[1], pista.x, pista.z, pista.heading).along * sentido;
      masAdelante = Math.max(masAdelante, aqui);
      r.remonta = Math.max(r.remonta, masAdelante - aqui);
    } else masAdelante = -Infinity;
  }
  for (let i = 0; i < raya.length - 1; i++) {
    const a = raya[i]!;
    const b = raya[i + 1]!;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < RECTA_SUELTA) continue;
    let suelta = 0;
    for (const { q } of aTrozos([a, b]))
      if (!m.enElGrafo(q) && !m.enPlataforma(q) && !m.enUnaPista(q)) suelta += PASO;
    if (suelta > RECTA_SUELTA / 2) r.inventado += suelta;
  }
  return r;
}

function aLosMetros(c: readonly Punto[], metros: number): Punto {
  let r = 0;
  for (let i = 1; i < c.length; i++) {
    const d = Math.hypot(c[i]![0] - c[i - 1]![0], c[i]![1] - c[i - 1]![1]);
    if (r + d >= metros) {
      const t = d > 0 ? (metros - r) / d : 0;
      return [c[i - 1]![0] + (c[i]![0] - c[i - 1]![0]) * t, c[i - 1]![1] + (c[i]![1] - c[i - 1]![1]) * t];
    }
    r += d;
  }
  return c[c.length - 1]!;
}

function largo(c: readonly Punto[]): number {
  let t = 0;
  for (let i = 1; i < c.length; i++) t += Math.hypot(c[i]![0] - c[i - 1]![0], c[i]![1] - c[i - 1]![1]);
  return t;
}

/** El rumbo de la raya en un punto, en radianes, como `FlightState.heading`. */
function rumboEn(c: readonly Punto[], metros: number): number {
  const a = aLosMetros(c, metros);
  const b = aLosMetros(c, metros + 3);
  return Math.atan2(b[0] - a[0], b[1] - a[1]);
}

/**
 * **La cola**: el tráfico que sale, esperando en su doble raya y dos más
 * detrás de él; y uno esperando en tu doble raya con dos detrás, por tu
 * misma calle. Todos van a la misma pista que vos.
 */
function colaDe(
  suelo: ReturnType<typeof sueloDelTrafico>,
  puesto: Punto,
  raya: readonly Punto[],
): Punto[] {
  const cola: Punto[] = [];
  const espera = raya[raya.length - 1]!;
  if (suelo) {
    const sale = suelo.salida(
      [
        { x: puesto[0], z: -puesto[1] },
        { x: espera[0], z: -espera[1] },
      ],
      aTrozos(raya)
        .filter((_, i) => i % 5 === 0)
        .map(({ q }) => ({ x: q[0], z: -q[1] })),
    );
    if (sale) {
      const camino = sale.camino.map((s) => [s.x, -s.z] as Punto);
      for (const atras of [0, 60, 120])
        if (sale.espera - atras > 0) cola.push(aLosMetros(camino, sale.espera - atras));
    }
  }
  const L = largo(raya);
  for (const atras of [0, 50, 100]) if (L - atras > 40) cola.push(aLosMetros(raya, L - atras));
  return cola;
}

/** Los que acaban de aterrizar y ruedan a su puesto: esos sí se rodean. */
function llegadasDe(
  suelo: ReturnType<typeof sueloDelTrafico>,
  aero: Aerodrome,
  pista: Scenario["runway"],
): Punto[] {
  if (!suelo) return [];
  const puntos: Punto[] = [];
  for (const tipo of tiposDelCampo(aero.id, pista.length)) {
    const fin = suelo.llegada(tipo.toca + tipo.frena)?.camino.at(-1);
    if (fin) puntos.push([fin.x, -fin.z]);
  }
  return puntos;
}

interface Fallo {
  readonly que: string;
  readonly donde: string;
  readonly medida: Medida | string;
}

interface Resultado {
  casos: number;
  sinPavimento: number;
  fallos: Fallo[];
}

/** La salida de cada puesto, y la vuelta, de un campo con una cabecera y un avión. */
function mirar(
  esc: Scenario,
  avion: AircraftConfig,
  r: Resultado,
  toca: ReturnType<typeof loQueTocaEn>,
): void {
  const aero = esc.aerodrome!;
  const pista = esc.runway;
  const m = medidorDe(aero, pista);
  const ancho = aero.runways[0]?.widthM ?? 45;
  const suelo = sueloDelTrafico(aero, pista, ancho);
  const llegadas = llegadasDe(suelo, aero, pista);
  const entradasVistas = new Set<string>();
  const donde = (que: string) => `${esc.id} ${Math.round(pista.heading)}° ${avion.id} ${que}`;
  const mal = (que: string, dondeEs: string, medida: Medida | string) =>
    r.fallos.push({ que, donde: dondeEs, medida });
  const mirarSalida = (raya: readonly Punto[], d: string, que: string) => {
    const s = medir(m, raya, pista, 1);
    if (s.hierba > PASO) mal(`(a) ${que}`, d, s);
    if (s.inventado > 0) mal(`(b) ${que}`, d, s);
    if (s.porPista > PISTA_AL_RODAR) mal(`(c) ${que}`, d, s);
  };

  /*
   * Un plan para todos los puestos, como en el juego, que monta uno y lo
   * reinicia desde el puesto que toque. Y así lo que el plan se guarda de un
   * campo —las entradas en pista, los puestos candidatos— sirve para todos.
   */
  const plan = new PlanDeVuelo(aero, pista, () => 0, avion);
  plan.reiniciar();
  /*
   * Los recalculados ya mirados, por sitio y destino: las rutas de muchos
   * puestos comparten la paralela, y recalcular desde el mismo punto hacia la
   * misma doble raya da la misma raya.
   */
  const recalculados = new Set<string>();
  for (const puesto of aero.parkingPositions ?? []) {
    r.casos++;
    plan.enCola = () => [];
    plan.ocupados = () => [];
    // Un puesto dibujado fuera de todo pavimento no es sitio de aparcar.
    if (!m.sePuedeAparcar(puesto.xy)) {
      r.sinPavimento++;
      if (plan.reiniciarDesde(puesto.xy))
        mal("puesto fuera del pavimento, y se sale de él", donde(`puesto ${puesto.ref}`), "");
      continue;
    }
    if (!plan.reiniciarDesde(puesto.xy)) {
      mal("sin ruta", donde(`puesto ${puesto.ref}`), "");
      continue;
    }
    const sola = [...plan.rutaCruda()];
    const d = donde(`puesto ${puesto.ref}`);
    // La cola no se esquiva: con ella delante, la raya es la misma.
    const cola = colaDe(suelo, puesto.xy, sola);
    plan.enCola = () => cola;
    plan.reiniciarDesde(puesto.xy);
    const conCola = [...plan.rutaCruda()];
    if (Math.abs(largo(conCola) - largo(sola)) > 1)
      mal("la raya esquiva la cola", d, `${largo(sola).toFixed(0)} → ${largo(conCola).toFixed(0)} m`);
    // Y los que acaban de aterrizar sí se rodean, pero nunca por la pista.
    plan.ocupados = () => llegadas;
    plan.reiniciarDesde(puesto.xy);
    const raya = [...plan.rutaCruda()];
    mirarSalida(raya, d, "salida");

    // (d) Y recalculando desde cada punto de la raya, con la cola movida.
    const L = largo(raya);
    const fin = raya[raya.length - 1]!;
    for (let s = 10; s < L - 30; s += CADA) {
      const p = aLosMetros(raya, s);
      const yaVisto = `${Math.round(p[0] / 5)},${Math.round(p[1] / 5)}>${fin.map(Math.round)}`;
      if (recalculados.has(yaVisto)) continue;
      recalculados.add(yaVisto);
      plan.enCola = () => cola.map((q) => [q[0] + 5, q[1] + 5] as Punto);
      const antes = plan.vecesQueSePusoLaRuta;
      const otra = [...plan.recalcularDesde(p, rumboEn(raya, s), "rodando")];
      const dr = `${d} recalculando a ${s.toFixed(0)} m`;
      if (plan.vecesQueSePusoLaRuta === antes) {
        mal("(d) sin ruta al recalcular", dr, "");
        break;
      }
      const s2 = medir(m, otra, pista, 1);
      if (s2.hierba > PASO || s2.inventado > 0 || s2.porPista > PISTA_AL_RODAR) {
        mal("(d) salida", dr, s2);
        break;
      }
    }

    // La entrada en pista, una vez por punto de espera.
    const espera = raya[raya.length - 1]!;
    const k = `${espera[0].toFixed(0)},${espera[1].toFixed(0)}`;
    if (entradasVistas.has(k)) continue;
    entradasVistas.add(k);
    const entrada = plan.entradaDesde(espera);
    if (!entrada) {
      mal("sin entrada en pista", donde(`desde ${k}`), "");
      continue;
    }
    const e = medir(m, entrada, pista, 1);
    if (e.hierba > PASO) mal("(a) entrada", donde(`desde ${k}`), e);
    if (e.inventado > 0) mal("(b) entrada", donde(`desde ${k}`), e);
    /*
     * Y lo que se remonta, desde la boca más cercana a la cabecera **a la que
     * se llega desde este puesto**: en El Hierro la plataforma son dos trozos,
     * y del de la punta a las bocas del otro solo se va por la pista.
     */
    const propias = bocasDe(aero, pista, [puesto.xy], m.grafo);
    const alSalir = propias.length ? Math.max(0, propias[0]!) + ALINEARSE : toca.alSalir;
    if (e.remonta > alSalir) mal("(c) entrada", donde(`desde ${k}`), e);
  }

  // Y la vuelta: aterrizar, frenar y seguir la raya al puesto.
  mirarLaVuelta(esc, avion, r, m, suelo, llegadas, toca);
  for (const f of OTRAS_PARADAS) mirarLaVuelta(esc, avion, r, m, suelo, llegadas, toca, f);
}

/**
 * Lo que puede quedar sin usar de la pista despegando desde la cabecera, m:
 * lo que va del final al sitio donde se da la vuelta, o a la boca del
 * apartadero por donde se vuelve a la pista. En La Palma por la 18 son 75.
 */
const DESDE_LA_CABECERA = 100;

/**
 * La pista que queda por delante al empezar a correr, m: desde donde la raya
 * de entrar echa a andar pista abajo para ya no volver —el final de la media
 * vuelta, la salida del apartadero, la boca por la que se entra de frente—
 * hasta el final de la pista.
 */
function pistaPorDelante(entrada: readonly Punto[], pista: Scenario["runway"]): number {
  const ejes = entrada.map((q) => enEjesDePista(q[0], -q[1], pista.x, pista.z, pista.heading));
  // La última tirada pista abajo, contada desde el final.
  let i = ejes.length - 1;
  while (i > 0 && ejes[i - 1]!.along <= ejes[i]!.along + 0.5) i--;
  for (let k = i; k < ejes.length; k++) {
    const e = ejes[k]!;
    if (Math.abs(e.across) <= pista.width / 2 + 5 && Math.abs(e.along) <= pista.length / 2 + 60)
      return pista.length / 2 - e.along;
  }
  return 0;
}

/**
 * Las bocas de las calles que se llaman como alguna de `nombres`: los nudos
 * de la pista de los que salen. La calle de una boca es la primera con
 * nombre saliendo de ella por calles: en La Gomera los ramales que llegan a
 * la pista no lo llevan, y la A empieza unos metros más allá.
 */
function bocasDeLasCalles(
  aero: Aerodrome,
  nombres: readonly string[],
): Punto[] {
  const limpio = (n: string | null | undefined) => (n ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const quiero = new Set(nombres.map(limpio));
  const grafo = construirGrafo(aero);
  const bocas: Punto[] = [];
  grafo.nudos.forEach((nudo, i) => {
    const tramos = (grafo.desde[i] ?? []).map((k) => grafo.tramos[k]!);
    if (!tramos.some((t) => t.pista) || !tramos.some((t) => !t.pista)) return;
    let frente = [i];
    const vistos = new Set([i]);
    let calle = "";
    for (let paso = 0; paso < 4 && !calle; paso++) {
      const siguiente: number[] = [];
      for (const n of frente)
        for (const k of grafo.desde[n] ?? []) {
          const t = grafo.tramos[k]!;
          if (t.pista) continue;
          if (!calle && limpio(t.ref)) calle = limpio(t.ref);
          const otro = t.a === n ? t.b : t.a;
          if (!vistos.has(otro)) vistos.add(otro), siguiente.push(otro);
        }
      frente = siguiente;
    }
    if (!quiero.has(calle)) return;
    bocas.push(nudo);
  });
  return bocas;
}

/**
 * **(e) La pista de despegue**, con cada avión de la flota que cabe en el
 * campo y desde cada punto de espera que el plan considera. Ver «Y el
 * back-taxi no se salta nunca» en `plan-de-vuelo.ts`.
 */
function mirarLaPistaDeDespegue(esc: Scenario, r: Resultado): void {
  const pista = esc.runway;
  const aero = esc.aerodrome!;
  const regla = aero.salidasPorInterseccion;
  const soloLaCabecera = regla?.permitidas === false;
  const permitidas = regla?.soloDesde ? bocasDeLasCalles(aero, regla.soloDesde) : null;
  for (const avion of AIRCRAFT) {
    if (!cabeEn(avion, campoDe(esc)).cabe) continue;
    const plan = new PlanDeVuelo(aero, pista, () => 0, avion);
    plan.reiniciar();
    const hace = soloLaCabecera
      ? pista.length - DESDE_LA_CABECERA
      : Math.min(
          esDeLinea(avion) ? pistaNecesariaHoy(avion) : Math.max(600, pistaNecesariaHoy(avion)),
          pista.length - DESDE_LA_CABECERA,
        );
    const vistas = new Set<string>();
    for (const espera of plan.esperasVistas) {
      const k = `${espera[0].toFixed(0)},${espera[1].toFixed(0)}`;
      if (vistas.has(k)) continue;
      vistas.add(k);
      const entrada = plan.entradaDesde(espera);
      if (!entrada) continue;
      const hay = pistaPorDelante(entrada, pista);
      // Y por una intersección, solo por las que el AIP permite: la raya
      // tiene que entrar en la pista por una de sus bocas.
      if (
        permitidas &&
        hay < pista.length - DESDE_LA_CABECERA &&
        !permitidas.some((b) => aLaPolilinea(b, entrada) < 15)
      )
        r.fallos.push({
          que: "(e) sale por una intersección que el AIP no permite",
          donde: `${esc.id} ${Math.round(pista.heading)}° ${avion.id} desde ${k}`,
          medida: `a ${(pista.length - hay).toFixed(0)} m del umbral`,
        });
      if (hay < hace)
        r.fallos.push({
          que: "(e) despega con poca pista",
          donde: `${esc.id} ${Math.round(pista.heading)}° ${avion.id} desde ${k}`,
          medida: `${hay.toFixed(0)} m por delante, necesita ${hace.toFixed(0)}`,
        });
    }
  }
}

function mirarLaVuelta(
  esc: Scenario,
  avion: AircraftConfig,
  r: Resultado,
  m: ReturnType<typeof medidorDe>,
  suelo: ReturnType<typeof sueloDelTrafico>,
  llegadas: Punto[],
  toca: ReturnType<typeof loQueTocaEn>,
  /** Dónde se para, en fracción de pista; sin ella, donde para la prueba. */
  fraccion?: number,
): void {
  const aero = esc.aerodrome!;
  const pista = esc.runway;
  const para = fraccion === undefined ? paraEn(pista) : pista.length * fraccion;
  const hasta =
    fraccion === undefined ? toca.alVolver : alVolverDesde(pista, toca.bocas, para);
  const donde = (que: string) => `${esc.id} ${Math.round(pista.heading)}° ${avion.id} ${que}`;
  const mal = (que: string, dondeEs: string, medida: Medida | string) =>
    r.fallos.push({ que, donde: dondeEs, medida });
  const plan = new PlanDeVuelo(aero, pista, () => 0, avion);
  plan.reiniciar();
  plan.enCola = () => {
    const sale = suelo?.salida();
    return sale ? [aLosMetros(sale.camino.map((s) => [s.x, -s.z] as Punto), sale.espera)] : [];
  };
  plan.ocupados = () => llegadas;
  const h = (pista.heading * Math.PI) / 180;
  const enElEje = (along: number, alto = 0, v = 0, vy = 0) =>
    ({
      position: { x: pista.x + Math.sin(h) * along, y: alto, z: pista.z - Math.cos(h) * along },
      velocity: { x: Math.sin(h) * v, y: vy, z: -Math.cos(h) * v },
      heading: h,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: vy,
      yawRate: 0,
      onGround: alto < 1,
      onRunway: alto < 1,
    }) as never;
  const pasar = (e: never, alto: number, s: number) => {
    let fase = "";
    for (let t = 0; t < s; t += 0.05) fase = plan.paso(e, alto, true, 0.05).fase;
    return fase;
  };
  const umbral = -pista.length / 2;
  pasar(enElEje(-9000, 400, 60), 400, 25);
  pasar(enElEje(umbral + 300, 0, 45, -1), 0, 0.5);
  pasar(enElEje(umbral + para, 0, 8), 0, 3);
  const vuelta = [...plan.rutaCruda()];
  const dv = donde(`vuelta parando a ${para.toFixed(0)} m`);
  if (vuelta.length < 2) {
    mal("vuelta sin raya", dv, "");
    return;
  }
  const v = medir(m, vuelta, pista, 1);
  if (v.hierba > PASO) mal("(a) vuelta", dv, v);
  if (v.inventado > 0) mal("(b) vuelta", dv, v);
  if (v.remonta > hasta) mal("(c) vuelta", dv, v);
  // Recalculando, solo desde la parada de siempre: las otras miran la salida.
  if (fraccion !== undefined) return;
  const L = largo(vuelta);
  for (let s = 10; s < L - 30; s += CADA) {
    const p = aLosMetros(vuelta, s);
    const antes = plan.vecesQueSePusoLaRuta;
    const otra = [...plan.recalcularDesde(p, rumboEn(vuelta, s), "a-plataforma")];
    const dr = `${dv} recalculando a ${s.toFixed(0)} m`;
    if (plan.vecesQueSePusoLaRuta === antes) {
      mal("(d) vuelta sin ruta al recalcular", dr, "");
      break;
    }
    const w = medir(m, otra, pista, 1);
    if (w.hierba > PASO || w.inventado > 0 || w.remonta > toca.alVolver) {
      mal("(d) vuelta", dr, w);
      break;
    }
  }
}

const tabla: string[] = [];

/** Las variables del entorno, sin tipos de Node. */
const ENTORNO =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

describe("por el asfalto y no por la pista, en los dieciocho campos", () => {
  it("son dieciocho", () => {
    expect(CAMPOS.length).toBe(18);
  });

  for (const esc0 of CAMPOS) {
    it(`${esc0.id}: de cada puesto a despegar, y de vuelta, por pavimento y sin usar la pista de calle`, () => {
      const r: Resultado = { casos: 0, sinPavimento: 0, fallos: [] };
      for (const esc of cabeceras(esc0)) {
        const pista = esc.runway;
        const rumbo = Math.round(pista.heading);
        const bocas = bocasDe(esc.aerodrome!, pista);
        const toca = loQueTocaEn(pista, bocas);
        const donde = `${esc0.id} ${rumbo}° · bocas a ${bocas.map(Math.round).join(", ")} m`;
        /*
         * Y en los que se listan, no había otra; y los que no había otra, se
         * listan. Una lista que se aparta de la geometría es un permiso sin
         * motivo o un motivo sin escribir.
         */
        const listado = (l: Readonly<Record<string, Listado>>) =>
          l[esc0.id]?.cabeceras.includes(rumbo) ?? false;
        if (listado(SIN_PARALELA) !== toca.sinParalela)
          r.fallos.push({
            que: toca.sinParalela ? "lista: sin paralela y sin listar" : "lista: listado y con calle a la cabecera",
            donde,
            medida: "",
          });
        if (listado(VUELTA_POR_LA_PISTA) !== toca.sinSalidaDelante)
          r.fallos.push({
            que: toca.sinSalidaDelante
              ? "lista: sin salida por delante y sin listar"
              : "lista: listado para volver y con salida por delante",
            donde: `${donde}, para a ${paraEn(pista).toFixed(0)}`,
            medida: "",
          });
        for (const avion of avionesDe(esc)) mirar(esc, avion, r, toca);
        // (e) Y toda la flota, desde cada punto de espera que el plan considera.
        mirarLaPistaDeDespegue(esc, r);
      }
      const cuenta = (que: string) => r.fallos.filter((f) => f.que.startsWith(que)).length;
      tabla.push(
        `${esc0.id.padEnd(15)} ${String(r.casos).padStart(4)} salidas · ${r.sinPavimento} puestos fuera · ` +
          `a ${cuenta("(a)")} · b ${cuenta("(b)")} · c ${cuenta("(c)")} · d ${cuenta("(d)")} · e ${cuenta("(e)")} · ` +
          `lista ${cuenta("lista")} · ` +
          `otros ${r.fallos.length - ["(a)", "(b)", "(c)", "(d)", "(e)", "lista"].reduce((s, q) => s + cuenta(q), 0)}`,
      );
      expect(
        r.fallos.slice(0, 12).map((f) => `${f.que} · ${f.donde} · ${JSON.stringify(f.medida)}`),
        `${esc0.id}: ${r.fallos.length} fallos`,
      ).toEqual([]);
    });
  }

  it("lo que dice el AIP de salir por intersección va con su cita", () => {
    const conDato = CAMPOS.filter((e) => e.aerodrome!.salidasPorInterseccion);
    // Lanzarote, Fuerteventura y La Palma no las permiten; Los Rodeos y La
    // Gomera, solo desde algunas calles. Ver `Aerodrome.salidasPorInterseccion`.
    expect(conDato.map((e) => e.id).sort()).toEqual(
      ["fuerteventura", "la-gomera", "la-palma", "lanzarote", "tenerife-norte"],
    );
    for (const e of conDato) {
      const regla = e.aerodrome!.salidasPorInterseccion!;
      expect(regla.fuente, e.id).toMatch(/^AIP España AD 2-/);
      expect(regla.fuente, e.id).toMatch(/«.+»/);
    }
    expect(SCENARIOS.find((e) => e.id === "lanzarote")!.aerodrome!.salidasPorInterseccion!.permitidas).toBe(false);
  });

  it.runIf(ENTORNO.OGA_TABLA)("la tabla", () => {
    console.log(`\n${tabla.join("\n")}\n`);
  });
});
