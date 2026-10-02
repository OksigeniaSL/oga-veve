/**
 * **Las rutas entre las islas, sobre el relieve de verdad**: que ninguna vaya
 * contra un monte con menos margen del que pide la regla del aire, que
 * ninguna cruce una isla de montaña teniendo mar, que ninguna dé más vuelta
 * de la que obliga lo publicado, y que la comandante anuncie el mismo crucero
 * que se vuela.
 *
 * Lo pidió quien voló de Los Rodeos a Tenerife Sur: «para aterrizar en GCTS me
 * manda casi hasta La Gomera para girar», y «yo no pondría un avión desde TFN
 * hasta TFS sobrevolando la cordillera dorsal teniendo mar». Las dos cosas
 * eran verdad: el plan salía por el VOR de Los Rodeos, cruzaba la Dorsal y
 * entraba a la 07 por XANOS, el punto de inicio que hay frente a La Gomera.
 *
 * `procedimientos.test.ts` prueba la geometría sin relieve; esto prueba el
 * mundo. Cada ruta se traza con `rutaDelTramo`, la misma función que usa el
 * juego, con los campos puestos como los pone el juego —la cabecera en uso la
 * elige el viento, y aquí se sopla por cada una— y con el relieve **de los
 * mismos ficheros que carga el juego**, `data/terrain/*.bin`, leídos del
 * disco: el fino de cada campo (MDT05 del IGN) y el lejano (Copernicus
 * GLO-30). El juego ve a la vez el de casa, el de sus destinos y su
 * horizonte; aquí están todos a la vez, que es lo más que puede ver.
 */

import { describe, expect, it } from "vitest";
import fuenteDelJuego from "../game.ts?raw";
import { AIRCRAFT } from "../flight/aircraft";
import {
  Seguimiento,
  cruceroDelPlan,
  libra,
  minimaEnCrucero,
  porElMar,
  puntoAFaltando,
  segundosPorElPerfil,
  type Ruta,
} from "../flight/ruta";
import { airDensity, SEA_LEVEL_DENSITY } from "../flight/atmosphere";
import { NUDO, velocidadQueToca } from "../flight/escalera-de-velocidades";
import { minutosDichos, nivelDicho } from "../audio/partes-de-la-comandante";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { campoDeCasa, campoVecino, type CampoEnElMundo } from "./campo-del-vuelo";
import { dondeCae, type Sitio } from "./entre-aerodromos";
import { TIEMPO_DE_CASA, type Meteo } from "./meteo";
import { procedimientosDe } from "./procedimientos";
import { cruceroDelTramo, rutaDelTramo, type DelJuego } from "./ruta-del-tramo";
import { SCENARIOS, conViento, destinosDe, oaciDe, type Scenario } from "./scenarios";
import { cabeceraEnUso } from "./terrain";

/*
 * El `fs` de Node pedido en marcha, como en `circuito-terreno.test.ts`: así no
 * hay que meter sus tipos en el `tsconfig`, y vitest corre en Node.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, codificacion?: string): Uint8Array | string;
  existsSync(ruta: string): boolean;
};

/** Radio terrestre, m: el de los extractores y el de `entre-aerodromos.ts`. */
const R = 6371008;
const RAD = Math.PI / 180;

/** Un mapa de alturas de `data/terrain`, con su proyección. */
interface Mapa {
  readonly lat0: number;
  readonly lon0: number;
  readonly mitad: number;
  readonly paso: number;
  readonly lado: number;
  readonly datos: Int16Array;
}

function mapa(id: string): Mapa | null {
  const base = `data/terrain/${id}`;
  if (!fs.existsSync(`${base}.bin`) || !fs.existsSync(`${base}.json`)) return null;
  const ficha = JSON.parse(fs.readFileSync(`${base}.json`, "utf8") as string) as {
    origen: { lat: number; lon: number };
    tamanoM: number;
  };
  const b = fs.readFileSync(`${base}.bin`) as Uint8Array;
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const lado = Math.round(Math.sqrt(datos.length));
  return {
    lat0: ficha.origen.lat,
    lon0: ficha.origen.lon,
    mitad: ficha.tamanoM / 2,
    paso: ficha.tamanoM / (lado - 1),
    lado,
    datos,
  };
}

/**
 * La cota de un mapa en un punto, interpolada como la interpola `Terrain`, o
 * `null` fuera de él. La proyección es la de `scripts/copernicus-a-relieve.mjs`:
 * equirrectangular con el coseno de su centro.
 */
function cotaEn(m: Mapa, lat: number, lon: number): number | null {
  const x = (lon - m.lon0) * RAD * R * Math.cos(m.lat0 * RAD);
  const z = -(lat - m.lat0) * RAD * R;
  if (Math.abs(x) > m.mitad || Math.abs(z) > m.mitad) return null;
  const gx = (x + m.mitad) / m.paso;
  const gz = (z + m.mitad) / m.paso;
  const max = m.lado - 1;
  const x0 = Math.min(max, Math.floor(gx));
  const z0 = Math.min(max, Math.floor(gz));
  const x1 = Math.min(max, x0 + 1);
  const z1 = Math.min(max, z0 + 1);
  const tx = gx - x0;
  const tz = gz - z0;
  const h = (c: number, f: number) => m.datos[f * m.lado + c] ?? 0;
  return (
    (h(x0, z0) * (1 - tx) + h(x1, z0) * tx) * (1 - tz) +
    (h(x0, z1) * (1 - tx) + h(x1, z1) * tx) * tz
  );
}

const canarias = SCENARIOS.filter(
  (e) => e.pais === "es" && e.aerodrome && procedimientosDe(oaciDe(e)),
);
// Primero los finos, que contestan con más detalle; luego los lejanos.
const finos = canarias.map((e) => mapa(e.id)).filter((m): m is Mapa => m !== null);
const lejanos = canarias
  .map((e) => mapa(`${e.id}-lejos`))
  .filter((m): m is Mapa => m !== null);

/** El relieve de las islas en el mundo cuyo origen es `origen`. */
function relieveDesde(origen: Sitio): (x: number, z: number) => number | null {
  return (x, z) => {
    // La inversa de `dondeCae`, con el coseno de la latitud media.
    const lat = origen.lat - z / (R * RAD);
    const lon = origen.lon + x / (R * RAD * Math.cos(((origen.lat + lat) / 2) * RAD));
    for (const m of finos) {
      const c = cotaEn(m, lat, lon);
      if (c !== null) return c;
    }
    for (const m of lejanos) {
      const c = cotaEn(m, lat, lon);
      if (c !== null) return c;
    }
    return null;
  };
}

/** Las cabeceras de un campo, por su nombre. */
function cabeceras(e: Scenario): string[] {
  const pista = e.aerodrome!.runways[0]!;
  return Object.entries(pista.thresholds)
    .filter(([, u]) => u?.xy)
    .map(([n]) => n);
}

/**
 * El viento que pone en uso esa cabecera: de frente a ella, quince nudos. Es
 * como la elige el juego —ver `conViento`—, y así se prueba cada una.
 */
function vientoPara(e: Scenario, cabecera: string): Meteo {
  const pista = e.aerodrome!.runways[0]!;
  const u = pista.thresholds[cabecera]!.xy!;
  const otro = Object.entries(pista.thresholds).find(([n, v]) => n !== cabecera && v?.xy)![1]!.xy!;
  const rumbo = ((Math.atan2(otro[0] - u[0], otro[1] - u[1]) / RAD) + 360) % 360;
  return { ...TIEMPO_DE_CASA, vientoDe: Math.round(rumbo), vientoKt: 15 };
}

/** El avión de las rutas: el reactor de la flota. Ver la nota de abajo. */
const JAZ_90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;

interface Tramo {
  readonly nombre: string;
  readonly salida: CampoEnElMundo;
  readonly llegada: CampoEnElMundo;
  readonly juego: DelJuego;
  readonly ruta: Ruta;
  /** La recta de la pista de salida al umbral de llegada, m. */
  readonly directo: number;
}

/**
 * Un tramo como lo traza el juego en tierra, con las dos cabeceras elegidas
 * por el viento.
 *
 * **Con el techo del JAZ 90**, y vale para los cuatro de la flota que vuelan
 * por instrumentos entre islas: el techo solo cambia la ruta si queda por
 * debajo de la mínima en ruta más alta, y la más alta de Canarias es la del
 * Teide, 3715 m más 600, que queda por debajo de todos ellos —el más bajo, el
 * JAZ 40, sube a 5500—.
 */
function tramo(sal: Scenario, cs: string, lle: Scenario, cl: string): Tramo {
  const origen = sal.aerodrome!.origin;
  const salida = campoDeCasa(conViento(sal, vientoPara(sal, cs)));
  const d = dondeCae(origen, lle.aerodrome!.origin);
  const llegada = campoVecino(
    lle,
    d,
    desplazarAerodromo(lle.aerodrome!, d.x, d.z),
    vientoPara(lle, cl),
  );
  expect(cabeceraEnUso(salida.escenario)).toBe(cs);
  expect(cabeceraEnUso(llegada.escenario)).toBe(cl);
  const juego: DelJuego = {
    origen,
    enElAire: null,
    cotaDePista: (campo) => campo.escenario.aerodrome?.elevationM ?? 0,
    cota: relieveDesde(origen),
    techo: JAZ_90.alturaDeCrucero,
  };
  const ruta = rutaDelTramo(salida, llegada, juego);
  const a = ruta.fijos[0]!;
  const b = ruta.fijos[ruta.fijos.length - 1]!;
  return {
    nombre: `${oaciDe(sal)} ${cs} → ${oaciDe(lle)} ${cl}`,
    salida,
    llegada,
    juego,
    ruta,
    directo: Math.hypot(b.x - a.x, b.z - a.z),
  };
}

const por = (id: string) => SCENARIOS.find((e) => e.id === id)!;

/** Todos los tramos que ofrece el juego entre campos de Canarias. */
const TRAMOS: Tramo[] = [];
for (const sal of canarias)
  for (const id of destinosDe(sal)) {
    const lle = por(id);
    if (!lle.aerodrome || !procedimientosDe(oaciDe(lle))) continue;
    for (const cs of cabeceras(sal))
      for (const cl of cabeceras(lle)) TRAMOS.push(tramo(sal, cs, lle, cl));
  }

const nombres = (r: Ruta) => r.fijos.map((f) => f.nombre).join(" ");
const destinoDe = (t: Tramo) => t.nombre.split(" → ")[1]!;

/**
 * **Las cabeceras cuya aproximación calculada no libra el relieve**, y por qué.
 *
 * Son las de Canarias sin aproximación publicada en línea recta —ver
 * `procedimientos-canarias.ts`—, y no es casualidad: si no la tienen es porque
 * el relieve no la deja. Donde el juego hace la aproximación calculada sobre
 * el eje, a diez millas, esa final recta pasa por donde la carta de verdad no
 * pasa. Lo que se comprueba de sus rutas es lo que es de la ruta —ver `libra`
 * con `soloEnRuta`—, salvo donde ni eso se puede. Y lo que vale para volarlas
 * —el margen de cada tramo y el avisador de terreno— lo mira
 * `aproximaciones-sobre-el-relieve.test.ts`.
 *
 * La 21 de Lanzarote salió de aquí al entrar su RNP con su maniobra visual
 * publicada, que es carta de punta a punta.
 */
const FINAL_QUE_NO_LIBRA: Readonly<Record<string, string>> = {
  "GCGM 09":
    "La Gomera no tiene aproximación instrumental: se entra a la vista. La final recta a la 09 viene por el oeste, bajo los acantilados de la costa sur.",
  "GCHI 16":
    "Las NDB de El Hierro acaban en circuito. La final recta a la 16 baja pegada a la ladera del norte de la isla.",
  /*
   * Y la 18 de La Palma, pero ya no por lo que era. Su RNP A se vuela sobre
   * el mar hasta LA505 y de ahí a la vista al eje, que libra con el agua
   * debajo hasta media milla del umbral. Lo que no cabe es la regla de la
   * final calculada —mil pies a una milla a cada lado—: a una milla al oeste
   * del eje están las laderas de Santa Cruz y de Breña Baja, a doscientos y
   * trescientos metros. Es el sitio de la pista, el mismo para la 36 con su
   * carta, y lo mide con su margen `aproximaciones-sobre-el-relieve.test.ts`.
   */
  "GCLA 18":
    "La final a la vista entra en el eje a dos millas y media, sobre el mar; a una milla al oeste del eje están las laderas de Santa Cruz y Breña Baja, que es el sitio de la pista.",
};
/**
 * De ellas, las que no libran ni la ruta hasta la final. **Ninguna.**
 *
 * Estaba la 18 de La Palma: su punto intermedio calculado caía a diez millas
 * al norte, contra la costa este, y la final recta cruzaba la ladera de
 * Barlovento —«es peligroso, se puede entrar antes desde el mar»—. Ahora se
 * llega por lo publicado, su RNP A sobre el mar, y se entra a la vista al eje
 * a dos millas y media. Ver `Aproximacion.aLaVista`.
 */
const NI_LA_RUTA = new Set<string>();

describe("las rutas de Canarias, sobre el relieve", () => {
  it("están todos los tramos de los ocho aeropuertos, con sus dos cabeceras", () => {
    expect(new Set(TRAMOS.map((t) => t.nombre.split(" ")[0])).size).toBe(8);
    expect(TRAMOS.length).toBeGreaterThanOrEqual(80);
  });

  /*
   * (a) Ninguna contra el relieve: la regla del aire —SERA.5015, ENR 1.3 del
   * AIP de España— en ruta, con dos mil pies en la montaña, y la final de la
   * aproximación calculada con su margen. Ver `libra`.
   */
  for (const t of TRAMOS)
    it(`${t.nombre}: libra el relieve con el margen de la montaña`, () => {
      const cabecera = destinoDe(t);
      const terreno = {
        cota: t.juego.cota!,
        techo: t.juego.techo,
        cotaDeSalida: t.juego.cotaDePista(t.salida, 0, 0),
      };
      const cota = t.juego.cotaDePista(t.llegada, 0, 0);
      if (NI_LA_RUTA.has(cabecera)) {
        expect(libra(t.ruta.fijos, terreno, cota, new Map(), true), nombres(t.ruta)).toBe(false);
        return;
      }
      expect(libra(t.ruta.fijos, terreno, cota, new Map(), true), nombres(t.ruta)).toBe(true);
      // Y la final entera, salvo donde la de manual no cabe.
      expect(libra(t.ruta.fijos, terreno, cota), nombres(t.ruta)).toBe(
        !(cabecera in FINAL_QUE_NO_LIBRA),
      );
    });

  it("y las excepciones del relieve siguen haciendo falta: una que sobra se quita", () => {
    for (const cabecera of Object.keys(FINAL_QUE_NO_LIBRA))
      expect(TRAMOS.some((t) => destinoDe(t) === cabecera), cabecera).toBe(true);
  });

  /*
   * (b) Ninguna cruza una isla de montaña por lo que no es de ninguna carta
   * teniendo mar. Ver `porElMar`. Había dos que no podían, las de El Hierro a
   * la 18 de La Palma, por lo mismo de arriba: su punto intermedio calculado
   * estaba contra la costa este de la isla. Por NASOL van por el mar.
   */
  const NO_PUEDE_IR_POR_EL_MAR = new Set<string>();
  for (const t of TRAMOS)
    it(`${t.nombre}: lo que no es de ninguna carta va por el mar`, () => {
      expect(porElMar(t.ruta.fijos, t.juego.cota!), nombres(t.ruta)).toBe(
        !NO_PUEDE_IR_POR_EL_MAR.has(t.nombre),
      );
    });

  /*
   * (c) Sin más vuelta de la que obliga lo publicado: **tres veces y media la
   * recta**.
   *
   * Es la cuenta del salto más corto de las islas con los dos extremos en
   * contra, con las cartas que hay. Entre los campos de Tenerife, o entre
   * Lanzarote y Fuerteventura, hay unas treinta millas. Una salida que se
   * aleja del destino antes de dejar girar lleva hasta veinte —la 30 de Los
   * Rodeos al este, por su VOR y ARTEM, son diecinueve y media—, que son
   * cuarenta de ida y vuelta; y una aproximación entrada por el otro lado del
   * campo, unas treinta desde su punto de inicio —KUTUR a la 07 de Tenerife
   * Sur, veintinueve; SOTAD a la 01 de Fuerteventura, veintiocho—. Treinta,
   * cuarenta y treinta son cien: tres veces y un tercio. Y rodear una isla por
   * el mar en vez de cruzarla por arriba es otro diez por ciento. Es el «tengo
   * que abrirme» que ya pedía `procedimientos.test.ts`, que sin relieve ni mar
   * se queda en tres.
   *
   * Y la que pasa, con su porqué: las dos pistas en contra y además la isla
   * entera por medio.
   */
  const VECES_LA_RECTA = 3.5;
  const MAS_VUELTA: Readonly<Record<string, string>> = {
    "GCTS 07 → GCXO 12":
      "La 07 de Tenerife Sur sale al este y la 12 de Los Rodeos se entra por el noroeste —BASUX, o directo a XO11W— o por el VOR, al que desde el sur solo se llega rodeando Anaga por LUCSI. La más corta por el mar es rodear Teno: por TS901 y MOROD, frente a La Gomera, y de vuelta al este.",
  };
  for (const t of TRAMOS)
    it(`${t.nombre}: no da más vuelta de la que obliga lo publicado`, () => {
      const veces = t.ruta.total / t.directo;
      if (t.nombre in MAS_VUELTA) {
        expect(veces, nombres(t.ruta)).toBeGreaterThan(VECES_LA_RECTA);
        expect(veces, nombres(t.ruta)).toBeLessThan(4);
      } else {
        expect(veces, `×${veces.toFixed(2)}: ${nombres(t.ruta)}`).toBeLessThanOrEqual(VECES_LA_RECTA);
      }
    });

  it("y las excepciones de la vuelta siguen haciendo falta", () => {
    for (const nombre of Object.keys(MAS_VUELTA))
      expect(TRAMOS.some((t) => t.nombre === nombre), nombre).toBe(true);
  });
});

/**
 * **De Los Rodeos a Tenerife Sur**, que es de donde salió todo, con las cuatro
 * combinaciones de pistas.
 *
 * Antes y ahora, con el mismo relieve, el mismo avión y la recta de 28 a 30
 * millas:
 *
 * | Pistas  | Antes                                   | NM   | Ahora                                       | NM   |
 * |---------|-----------------------------------------|------|---------------------------------------------|------|
 * | 12 → 25 | RW12 XO400 QITTI TS518 TS511 TS506 RW25 | 68,0 | RW12 XO400 TS511 TS506 RW25                 | 43,7 |
 * | 12 → 07 | RW12 TFN XANOS TS710 TS705 RW07         | 69,4 | RW12 XO400 KUTUR TS717 TS710 TS705 RW07     | 84,1 |
 * | 30 → 25 | RW30 TFN QITTI TS518 TS511 TS506 RW25   | 67,6 | RW30 TFN ARTEM TS511 TS506 RW25             | 54,9 |
 * | 30 → 07 | RW30 XO500 XANOS TS710 TS705 RW07       | 64,6 | RW30 TFN ARTEM KUTUR TS717 TS710 TS705 RW07 | 94,4 |
 *
 * La 12 → 07, la de los vientos de siempre, cruzaba la Dorsal del VOR a
 * XANOS; la 30 → 07 pasaba por encima del Teide; la 30 → 25 cruzaba La
 * Laguna. Y las dos a la 25 iban a buscar QITTI, doce millas al sur del
 * punto intermedio, para volver. Las de la 07 son ahora más largas, y es lo
 * que cuesta entrar por el lado del que se viene sin cruzar la isla.
 */
describe("de Los Rodeos a Tenerife Sur", () => {
  const tfn = TRAMOS.filter((t) => t.nombre.startsWith("GCXO") && t.nombre.includes("GCTS"));
  const de = (cs: string, cl: string) =>
    nombres(tfn.find((t) => t.nombre === `GCXO ${cs} → GCTS ${cl}`)!.ruta);

  it("va por la costa este, y a la 25 directo a su punto intermedio", () => {
    expect(de("12", "25")).toBe("RW12 XO400 TS511 TS506 RW25");
    expect(de("30", "25")).toBe("RW30 TFN ARTEM TS511 TS506 RW25");
  });

  it("y a la 07 por KUTUR, el punto de inicio del lado del que viene", () => {
    expect(de("12", "07")).toBe("RW12 XO400 KUTUR TS717 TS710 TS705 RW07");
    expect(de("30", "07")).toBe("RW30 TFN ARTEM KUTUR TS717 TS710 TS705 RW07");
  });

  it("nunca por XANOS, frente a La Gomera, ni por encima de la Dorsal", () => {
    for (const t of tfn) {
      expect(nombres(t.ruta)).not.toContain("XANOS");
      expect(porElMar(t.ruta.fijos, t.juego.cota!)).toBe(true);
    }
  });
});

/**
 * **Un solo crucero**: el que pone el plan para el punto de descenso es el que
 * anuncia la comandante. Eran dos cuentas —la del plan y otra por kilómetros
 * en línea recta en `partes-de-la-comandante.ts`— y de Los Rodeos a Tenerife
 * Sur la comandante anunciaba diez mil pies para un plan de doce mil.
 */
describe("el crucero que se anuncia es el que se vuela", () => {
  it("en cada tramo y con cada avión de la flota", () => {
    for (const t of TRAMOS) {
      const minima = minimaEnCrucero(t.ruta, t.juego.cota!);
      for (const avion of AIRCRAFT) {
        const juego = { ...t.juego, techo: avion.alturaDeCrucero };
        const crucero =
          avion === JAZ_90
            ? cruceroDelTramo(t.ruta, t.salida, juego)
            : cruceroDelPlan(
                t.ruta,
                {
                  techo: avion.alturaDeCrucero,
                  cotaDeSalida: juego.cotaDePista(t.salida, 0, 0),
                  declinacion: t.salida.escenario.magneticVariation ?? 0,
                },
                minima,
              );
        // El plan lo guarda tal cual...
        const plan = new Seguimiento();
        plan.poner(t.ruta, crucero);
        expect(plan.cruceroPlaneado).toBe(crucero);
        // ...y la comandante dice ese, o ninguno si no está grabado.
        const dicho = nivelDicho(plan.cruceroPlaneado);
        if (dicho !== null) expect(dicho * 1000 * 0.3048).toBeCloseTo(crucero, 6);
      }
    }
  });

  it("y de Los Rodeos a Tenerife Sur se dice, y no por debajo del relieve", () => {
    for (const t of TRAMOS.filter((x) => x.nombre.startsWith("GCXO") && x.nombre.includes("GCTS"))) {
      const crucero = cruceroDelTramo(t.ruta, t.salida, t.juego);
      expect(nivelDicho(crucero), t.nombre).not.toBeNull();
      expect(crucero).toBeGreaterThanOrEqual(minimaEnCrucero(t.ruta, t.juego.cota!)!);
    }
  });

  it("y el juego no tiene otra cuenta: la bienvenida sale del mismo plan", () => {
    const deLaComandante = /private planDelTramo\(\)[\s\S]*?\n {2}\}\n/.exec(fuenteDelJuego)?.[0] ?? "";
    expect(deLaComandante).toContain("nivelDicho(");
    expect(deLaComandante).toContain("cruceroPlaneado");
    expect(deLaComandante).toContain("this.cruceroDe(");
    const delPlan = /private cruceroDe\([\s\S]*?\n {2}\}\n/.exec(fuenteDelJuego)?.[0] ?? "";
    expect(delPlan).toContain("cruceroDelTramo(");
    // Ninguna regla semicircular suelta ni el nivel de antes.
    expect(fuenteDelJuego).not.toMatch(/\bnivelPara\(/);
    expect(fuenteDelJuego).not.toMatch(/\bnivelPrevisto\(/);
  });
});

/**
 * **Lo que dura el vuelo, como lo dice la comandante.**
 *
 * De Los Rodeos a La Palma anunciaba «unos quince minutos» y al empezar a
 * bajar «faltan diez»; Binter pone treinta. Las dos cifras salían de cuentas
 * distintas y ninguna contaba la subida ni la bajada. Ahora salen de la hora
 * del plan —`segundosPorElPerfil`, la de la pantalla de navegación— y aquí se
 * mira que la primera sea lo que de verdad se tarda volando el plan, que la
 * segunda cuadre con la primera, y que las dos se parezcan a las de Binter.
 */
describe("lo que dura el vuelo", () => {
  /** El crucero con el que el juego planea este tramo para este avión. */
  const cruceroDe = (t: Tramo, avion: (typeof AIRCRAFT)[number]) =>
    cruceroDelTramo(t.ruta, t.salida, { ...t.juego, techo: avion.alturaDeCrucero, ficha: avion });

  /** Lo que anuncia la comandante en tierra: la hora del plan desde la pista. */
  function anunciado(t: Tramo, avion: (typeof AIRCRAFT)[number]): number {
    const a = t.ruta.fijos[0]!;
    return segundosPorElPerfil(t.ruta, 1, a.x, a.z, {
      avion,
      altitud: t.juego.cotaDePista(t.salida, a.x, a.z),
      crucero: cruceroDe(t, avion),
      bajando: false,
      viento: null,
      verdadera: null,
    });
  }

  /**
   * **Y lo que se tarda volándolo**, segundo a segundo y sin la cuenta de
   * arriba: el avión va por la ruta subiendo a dos millas por mil pies,
   * nivelado y bajando a tres, a la velocidad que pide la escalera en cada
   * sitio y multiplicada por `ritmo` en crucero y bajando —uno, como se
   * planea; menos, como voló Enrique—. El seguimiento del juego va leyendo la hora como la
   * lee la pantalla, y se apunta lo que dice al pasar el punto de descenso.
   */
  function volar(t: Tramo, avion: (typeof AIRCRAFT)[number], ritmo = 1) {
    const r = t.ruta;
    const crucero = cruceroDe(t, avion);
    const cota = t.juego.cotaDePista(t.salida, 0, 0);
    const sube = (1000 * 0.3048) / (2 * 1852);
    const baja = (1000 * 0.3048) / (3 * 1852);
    const plan = new Seguimiento();
    plan.poner(r, crucero, avion);
    const a = r.fijos[0]!;
    plan.paso({ x: a.x, z: a.z, altitud: cota, vertical: 0, aire: avion.cruiseSpeed, enTierra: true, viento: null });
    const enTierra = plan.progreso!.segundos;
    const dt = 2;
    let hecho = 0;
    let h = cota;
    let reloj = 0;
    let alBajar: { reloj: number; eta: number } | null = null;
    while (hecho < r.total && reloj < 4 * 3600) {
      const queda = r.total - hecho;
      const subida = cota + hecho * sube;
      const bajada = r.cotaDelUmbral + queda * baja;
      const nuevo = Math.min(crucero, subida, bajada);
      const subiendo = subida < Math.min(crucero, bajada);
      const bajando = plan.bajando || bajada <= Math.min(crucero, subida);
      const toca = velocidadQueToca(avion, { altitud: nuevo, restante: queda, bajando, enFinal: false, subiendo });
      const lento = toca.tramo === "crucero" || toca.tramo === "descenso" ? ritmo : 1;
      const verdadera =
        (toca.kt * lento * NUDO) / Math.sqrt(airDensity(nuevo) / SEA_LEVEL_DENSITY);
      const p = puntoAFaltando(r, queda) ?? a;
      const paso = plan.paso({
        x: p.x,
        z: p.z,
        altitud: nuevo,
        vertical: (nuevo - h) / dt,
        aire: verdadera,
        enTierra: false,
        viento: null,
      });
      if (paso.descenso) alBajar = { reloj, eta: plan.progreso!.segundos };
      h = nuevo;
      hecho += verdadera * dt;
      reloj += dt;
    }
    return { enTierra, total: reloj, alBajar };
  }

  const tramoDe = (nombre: string) => TRAMOS.find((t) => t.nombre.startsWith(nombre))!;

  it("la comandante dice en tierra lo que da la pantalla de navegación", () => {
    for (const t of TRAMOS) {
      const v = volar(t, JAZ_90);
      expect(Math.abs(v.enTierra - anunciado(t, JAZ_90)), t.nombre).toBeLessThan(30);
    }
  });

  it("y es lo que se tarda volando el plan, con su subida y su bajada", () => {
    for (const t of TRAMOS)
      for (const avion of [JAZ_90, AIRCRAFT.find((a) => a.id === "jaz-60")!]) {
        const v = volar(t, avion);
        expect(Math.abs(v.total - anunciado(t, avion)), `${t.nombre} ${avion.id}`).toBeLessThan(60);
      }
  });

  it("y lo que dice al empezar a bajar cuadra con lo primero", () => {
    let vistos = 0;
    for (const t of TRAMOS) {
      const v = volar(t, JAZ_90);
      if (!v.alBajar) continue;
      vistos++;
      // Lo volado hasta el punto de descenso y lo que dice que falta suman lo anunciado.
      expect(Math.abs(v.alBajar.reloj + v.alBajar.eta - anunciado(t, JAZ_90)), t.nombre).toBeLessThan(60);
      // Y lo que falta es lo que de verdad faltaba.
      expect(Math.abs(v.total - v.alBajar.reloj - v.alBajar.eta), t.nombre).toBeLessThan(60);
    }
    expect(vistos).toBeGreaterThan(TRAMOS.length / 2);
  });

  it("y volando más despacio de lo planeado, la hora lo dice", () => {
    /*
     * Enrique voló lento a propósito, porque con el teclado no sostenía el
     * nivel (#145). La primera cifra es lo que se planea; la de después, lo
     * que se está volando.
     */
    const t = tramoDe("GCXO 30 → GCLA 36");
    const deprisa = volar(t, JAZ_90);
    const despacio = volar(t, JAZ_90, 0.75);
    expect(despacio.enTierra).toBeCloseTo(deprisa.enTierra, 6);
    expect(despacio.total).toBeGreaterThan(deprisa.total + 60);
    expect(despacio.alBajar).not.toBeNull();
    expect(Math.abs(despacio.total - despacio.alBajar!.reloj - despacio.alBajar!.eta)).toBeLessThan(60);
  });

  /*
   * **Y contra las de verdad.** Binter publica la duración de calzos a calzos
   * —con el rodaje de los dos campos y su margen— en sus ATR 72 y E195-E2
   * (horarios de 2026, flightmapper.net): Los Rodeos–La Gomera, Gran Canaria y
   * La Palma, treinta minutos; Los Rodeos–El Hierro, cuarenta; Gran
   * Canaria–Lanzarote, cuarenta y cinco. Lo que anuncia la comandante es de
   * ruedas arriba a ruedas abajo, y el JAZ 90 es un reactor: va por debajo
   * —al menos los cinco minutos de rodar en los dos campos— y nunca por
   * debajo de la mitad. Lo que había antes no cabía: de Los Rodeos a La Palma
   * eran diecisiete minutos y medio, y se decían «quince».
   */
  const BINTER: Readonly<Record<string, number>> = {
    "GCXO → GCGM": 30,
    "GCXO → GCLP": 30,
    "GCXO → GCLA": 30,
    "GCXO → GCHI": 40,
    "GCLP → GCRR": 45,
  };
  const deLaRuta = (ruta: string) => {
    const [de, a] = ruta.split(" → ");
    return TRAMOS.filter((t) => t.nombre.startsWith(de!) && t.nombre.includes(`→ ${a}`));
  };
  for (const [ruta, bloque] of Object.entries(BINTER))
    it(`${ruta}: se parece a lo de Binter (${bloque} min de calzos a calzos)`, () => {
      const tramos = deLaRuta(ruta);
      expect(tramos.length).toBeGreaterThan(0);
      for (const t of tramos) {
        const min = anunciado(t, JAZ_90) / 60;
        expect(min, t.nombre).toBeLessThanOrEqual(bloque - 5);
        expect(min, t.nombre).toBeGreaterThanOrEqual(bloque / 2);
      }
    });

  it("y lo que en Binter es más largo, aquí también", () => {
    const media = (ruta: string) => {
      const ts = deLaRuta(ruta);
      return ts.reduce((s, t) => s + anunciado(t, JAZ_90), 0) / ts.length;
    };
    const cortas = Math.max(media("GCXO → GCGM"), media("GCXO → GCLP"), media("GCXO → GCLA"));
    expect(media("GCXO → GCHI")).toBeGreaterThan(cortas);
    expect(media("GCLP → GCRR")).toBeGreaterThan(cortas);
  });

  it("de Los Rodeos a La Palma ya no son quince minutos", () => {
    for (const t of TRAMOS.filter((x) => x.nombre.startsWith("GCXO") && x.nombre.includes("GCLA")))
      expect(minutosDichos(anunciado(t, JAZ_90)), t.nombre).toBeGreaterThanOrEqual(20);
  });

  it("y el juego no tiene otra cuenta: la bienvenida y el descenso salen del plan", () => {
    const deLaComandante = /private planDelTramo\(\)[\s\S]*?\n {2}\}\n/.exec(fuenteDelJuego)?.[0] ?? "";
    expect(deLaComandante).toContain("segundosPorElPerfil(");
    const delDescenso = /case "comandante\.descenso": \{[\s\S]*?descensoPara\(/.exec(fuenteDelJuego)?.[0] ?? "";
    expect(delDescenso).toContain("this.segundosDelPlanHasta(");
    // Y el plan sabe qué avión lo vuela, que es lo que le da el perfil.
    expect(fuenteDelJuego).toMatch(/this\.navegacion\.poner\(\s*ruta,[\s\S]*?this\.aircraft,?\s*\)/);
  });
});

/**
 * **Y las dos avionetas, por la costa y a la altura que da el avión.**
 *
 * El techo de la avioneta de escuela y el del fumigador —tres mil y dos mil
 * quinientos metros— quedan por debajo de lo que pide la regla de los vuelos
 * por instrumentos cerca de las islas del oeste. Con esa regla, las rutas de
 * Los Rodeos y de El Hierro a la 18 de La Palma no libraban el relieve —eran
 * las de su punto intermedio calculado, contra la costa— y caían a la más
 * corta, y el crucero del fumigador salía a nueve mil pies, ochocientos por
 * encima de lo que da. Lo que hace de verdad un avión así es
 * volar con reglas visuales: por el mar, a la altura que se pueda y con el
 * margen de un vuelo visual. Ver `MARGEN_VISUAL` en `flight/ruta.ts`.
 */
describe("las avionetas, con reglas visuales", () => {
  const avionetas = AIRCRAFT.filter((a) => a.reglasDeVuelo === "visual");
  /*
   * Aquí estaba la de siempre, de la 34 de El Hierro a la 18 de La Palma: el
   * punto intermedio calculado de esa cabecera estaba contra su costa este, y
   * no había ruta que librara ni por el mar ni con el margen. Por la RNP A
   * de la 18, sobre el mar, sí la hay. Ver `NI_LA_RUTA` arriba.
   */

  it("son la de escuela y el fumigador, y ninguna más", () => {
    expect(avionetas.map((a) => a.id).sort()).toEqual(["jaz-20", "jaz-25"]);
  });

  for (const avion of avionetas)
    it(`${avion.id}: libran el relieve por el mar y cruzan a la altura que da el avión`, () => {
      for (const t of TRAMOS) {
        const juego = { ...t.juego, techo: avion.alturaDeCrucero, visual: true };
        const ruta = rutaDelTramo(t.salida, t.llegada, juego);
        const terreno = {
          cota: juego.cota!,
          techo: juego.techo,
          cotaDeSalida: juego.cotaDePista(t.salida, 0, 0),
          visual: true,
        };
        const dicho = `${avion.id} ${t.nombre}: ${nombres(ruta)}`;
        expect(
          libra(ruta.fijos, terreno, juego.cotaDePista(t.llegada, 0, 0), new Map(), true),
          dicho,
        ).toBe(true);
        expect(porElMar(ruta.fijos, juego.cota!), dicho).toBe(true);
        const crucero = cruceroDelTramo(ruta, t.salida, juego);
        expect(crucero, dicho).toBeLessThanOrEqual(avion.alturaDeCrucero + 1);
        // Y al medio nivel de los vuelos visuales: 4500, 6500…
        expect(Math.round(crucero / 0.3048) % 1000, dicho).toBe(500);
      }
    });

  /*
   * Aquí había una prueba de «la de antes»: con la regla de los instrumentos
   * y el techo del fumigador, la ruta de Los Rodeos a la 18 de La Palma no
   * libraba. Era la del punto intermedio calculado contra la costa: por la RNP
   * A de la 18 ya libra con las dos reglas. Las avionetas siguen con la suya
   * porque es la suya —vuelan mirando por la ventana—, no porque la otra no
   * quepa.
   */
});
