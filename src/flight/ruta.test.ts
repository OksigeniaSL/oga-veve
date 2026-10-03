import { describe, expect, it } from "vitest";
import {
  MARGEN_EN_LLANO,
  MARGEN_EN_MONTANA,
  MILLA,
  PIE,
  Seguimiento,
  alturaDeLaSenda,
  avanzar,
  cruceroPorLaDistancia,
  distanciaDeDescenso,
  libra,
  minimaEnCrucero,
  minimaEnRuta,
  porElMar,
  puntoAFaltando,
  restante,
  rutaDe,
  segundosHastaElFinal,
  sobreElSuelo,
  trazar,
  type Fijo,
} from "./ruta";

/** Un punto con nombre, a tantas millas al este y al norte del origen. */
const f = (
  nombre: string,
  este: number,
  norte: number,
  papel: Fijo["papel"] = "ruta",
  minima: number | null = null,
): Fijo => ({ nombre, x: este * MILLA, z: -norte * MILLA, papel, minima });

describe("trazar: la ruta que menos vuela", () => {
  const desde = f("RW09", 0, 0, "despegue");
  const umbral = f("RW27", 60, 0, "umbral");
  // Aproximación a la 27 —se aterriza hacia el oeste—: el eje queda al este.
  const porElNorte = [f("NORTE", 70, 10, "iaf"), f("INTER", 72, 0, "if"), f("FINAL", 66, 0, "faf")];
  const porElSur = [f("SUR", 70, -30, "iaf"), f("INTER", 72, 0, "if"), f("FINAL", 66, 0, "faf")];

  it("elige la rama de aproximación que queda de camino", () => {
    const r = trazar({ desde, salidas: [], ramas: [porElSur, porElNorte], umbral, cotaDelUmbral: 0 });
    expect(r.fijos.map((x) => x.nombre)).toEqual(["RW09", "NORTE", "INTER", "FINAL", "RW27"]);
  });

  it("recorta la salida donde deja de ir hacia el destino", () => {
    // Una salida que sube al este y luego se va al norte, a la Península.
    const salida = [f("SAL1", 8, 0, "salida"), f("SAL2", 15, 2, "salida"), f("LEJOS", 20, 60, "salida")];
    const r = trazar({ desde, salidas: [salida], ramas: [porElNorte], umbral, cotaDelUmbral: 0 });
    expect(r.fijos.map((x) => x.nombre)).toEqual([
      "RW09",
      "SAL1",
      "SAL2",
      "NORTE",
      "INTER",
      "FINAL",
      "RW27",
    ]);
  });

  it("y la ruta acaba alineada con la pista, no en el centro del campo", () => {
    const r = trazar({ desde, salidas: [], ramas: [porElNorte], umbral, cotaDelUmbral: 0 });
    const n = r.fijos.length;
    const a = r.fijos[n - 3]!;
    const b = r.fijos[n - 2]!;
    const c = r.fijos[n - 1]!;
    // Los dos últimos tramos, del intermedio al final y del final al umbral,
    // van por el mismo rumbo.
    const r1 = Math.atan2(b.x - a.x, -(b.z - a.z));
    const r2 = Math.atan2(c.x - b.x, -(c.z - b.z));
    expect(Math.abs(r1 - r2)).toBeLessThan(0.01);
    expect(Math.hypot(a.x - c.x, a.z - c.z) / MILLA).toBeGreaterThanOrEqual(8);
  });

  it("sin nada publicado, va al umbral directo en vez de inventárselo", () => {
    const r = trazar({ desde, salidas: [], ramas: [], umbral, cotaDelUmbral: 0 });
    expect(r.fijos.map((x) => x.nombre)).toEqual(["RW09", "RW27"]);
    expect(r.total / MILLA).toBeCloseTo(60, 5);
  });
});

describe("trazar: y sin mandar a nadie contra un monte", () => {
  // Un monte de tres mil metros a veinte millas, justo en la recta.
  const monte = {
    cota: (x: number, z: number) =>
      Math.hypot(x - 20 * MILLA, z) < 3 * MILLA ? 3000 : 0,
    techo: 11000,
    cotaDeSalida: 0,
  };
  const desde = f("RW09", 0, 0, "despegue");
  const umbral = f("RW09B", 50, 0, "umbral");
  const rama = [f("IF", 40, 0, "if")];
  // Una salida que sube al norte antes de ir al este: la de verdad, que rodea.
  const salida = [f("S1", 4, 0, "salida"), f("S2", 6, 10, "salida"), f("S3", 20, 12, "salida")];

  it("sin relieve, suelta la salida en cuanto deja de acercar", () => {
    const r = trazar({ desde, salidas: [salida], ramas: [rama], umbral, cotaDelUmbral: 0 });
    expect(r.fijos.map((x) => x.nombre)).toEqual(["RW09", "S1", "IF", "RW09B"]);
  });

  it("con el monte delante, sigue la salida hasta librarlo", () => {
    const r = trazar({
      desde,
      salidas: [salida],
      ramas: [rama],
      umbral,
      cotaDelUmbral: 0,
      terreno: monte,
    });
    // De S2 al IF todavía se pasa a menos de ocho kilómetros de la ladera,
    // que es donde la regla del aire pide dos mil pies sobre ella: hasta S3.
    expect(r.fijos.map((x) => x.nombre)).toEqual(["RW09", "S1", "S2", "S3", "IF", "RW09B"]);
    expect(libra(r.fijos, monte, 0)).toBe(true);
  });

  it("y lo que es de una carta no lo mira: ya lo libró quien la publicó", () => {
    // La misma recta por encima del monte, pero toda de la salida publicada.
    const publicada = [f("S1", 4, 0, "salida"), f("S2", 30, 0, "salida")];
    expect(libra([desde, ...publicada], monte, 0)).toBe(true);
    // Y una aproximación calculada sí: esa no la hizo nadie.
    const calculada = [{ ...f("CF", 30, 0, "if"), calculado: true }];
    expect(libra([f("RW", 10, 0, "despegue"), ...calculada, f("U", 40, 0, "umbral")], monte, 0)).toBe(false);
  });

  it("el crucero no queda por debajo de la mínima en ruta", () => {
    const r = rutaDe([desde, f("X", 20, 0), umbral], 0);
    expect(minimaEnCrucero(r, monte.cota)).toBe(3000 + MARGEN_EN_MONTANA);
  });
});

describe("la mínima en ruta, con la regla del aire", () => {
  // Una loma de quinientos metros y un monte de dos mil, los dos de tres
  // millas de radio y con el llano a cero alrededor.
  const loma = (x: number, z: number) => (Math.hypot(x, z) < 3 * MILLA ? 500 : 0);
  const monte = (x: number, z: number) => (Math.hypot(x, z) < 3 * MILLA ? 2000 : 0);

  it("mil pies sobre lo más alto a ocho kilómetros en el llano", () => {
    expect(minimaEnRuta(loma, 0, 0)).toBe(500 + MARGEN_EN_LLANO);
    expect(MARGEN_EN_LLANO).toBe(300);
  });

  it("dos mil en la montaña: novecientos metros de desnivel a diez millas", () => {
    expect(minimaEnRuta(monte, 0, 0)).toBe(2000 + MARGEN_EN_MONTANA);
    expect(MARGEN_EN_MONTANA).toBe(600);
  });

  it("a ocho kilómetros de la ladera todavía cuenta; a diez ya no", () => {
    const ladera = 3 * MILLA;
    expect(minimaEnRuta(monte, ladera + 7500, 0)).toBe(2000 + MARGEN_EN_MONTANA);
    // Más allá del radio queda el llano, pero sigue siendo montaña: el monte
    // está a menos de diez millas.
    expect(minimaEnRuta(monte, ladera + 10000, 0)).toBe(0 + MARGEN_EN_MONTANA);
  });
});

describe("trazar: por el mar, y entrando por su lado", () => {
  // Una isla de montaña entre la salida y el destino: mil metros desde el
  // agua, diez millas de ancho y veinticuatro de norte a sur.
  const isla = (x: number, z: number) =>
    x > 20 * MILLA && x < 30 * MILLA && Math.abs(z) < 12 * MILLA ? 1000 : 0;
  const terreno = { cota: isla, techo: 11000, cotaDeSalida: 0 };
  const desde = f("RW09", 0, 0, "despegue");
  const umbral = f("RW09B", 60, 0, "umbral");
  const aprox = (iaf: Fijo) => [iaf, f("IF", 50, 0, "if"), f("FAF", 55, 0, "faf")];

  it("rodea por el mar una isla de montaña antes que cruzarla alto", () => {
    // Por encima se libra el monte —se llega alto—, pero hay mar al sur.
    const porEncima = [f("S1", 5, 0, "salida")];
    const porElSur = [f("S1", 5, 0, "salida"), f("S2", 25, -16, "salida")];
    const ramas = [aprox(f("IAF", 40, -5, "iaf"))];
    const encima = [desde, ...porEncima, ...ramas[0]!, umbral];
    expect(libra(encima, terreno, 0)).toBe(true);
    expect(porElMar(encima, isla)).toBe(false);
    const r = trazar({ desde, salidas: [porEncima, porElSur], ramas, umbral, cotaDelUmbral: 0, terreno });
    expect(r.fijos.map((x) => x.nombre)).toContain("S2");
    expect(porElMar(r.fijos, isla)).toBe(true);
  });

  it("directo al punto intermedio si el giro allí no pasa de cuarenta y cinco grados", () => {
    // El inicio queda al sur, más allá del intermedio: ir a buscarlo es una
    // vuelta de treinta millas.
    const r = trazar({
      desde: f("RW", 0, 5, "despegue"),
      salidas: [],
      ramas: [[f("LEJOS", 50, -25, "iaf"), f("IF", 50, 0, "if"), f("FAF", 55, 0, "faf")]],
      umbral,
      cotaDelUmbral: 0,
    });
    expect(r.fijos.map((x) => x.nombre)).toEqual(["RW", "IF", "FAF", "RW09B"]);
  });

  it("pero no si el giro es mayor: entonces por su punto de inicio", () => {
    const r = trazar({
      desde: f("RW", 50, 30, "despegue"),
      salidas: [],
      ramas: [[f("OESTE", 40, 3, "iaf"), f("IF", 50, 0, "if"), f("FAF", 55, 0, "faf")]],
      umbral,
      cotaDelUmbral: 0,
    });
    expect(r.fijos.map((x) => x.nombre)).toEqual(["RW", "OESTE", "IF", "FAF", "RW09B"]);
  });

  it("y entra por la rama de su lado, aunque la del otro lado mida algo menos", () => {
    // Se aterriza al este y se llega desde el este, desde más allá del campo:
    // la rama de detrás de la final queda al otro lado.
    const desdeElEste = f("RW", 90, 2, "despegue");
    const detras = [f("OESTE", 38, 0, "iaf"), f("IF", 50, 0, "if"), f("FAF", 55, 0, "faf")];
    const delante = [f("SUR", 62, -20, "iaf"), f("S2", 45, -8), f("IF", 50, 0, "if"), f("FAF", 55, 0, "faf")];
    const r = trazar({
      desde: desdeElEste,
      salidas: [],
      ramas: [detras, delante],
      umbral,
      cotaDelUmbral: 0,
    });
    expect(r.fijos.map((x) => x.nombre)[1]).toBe("SUR");
    // Y sin esa rama, por la de detrás: el lado se prefiere, no se impone.
    const sola = trazar({ desde: desdeElEste, salidas: [], ramas: [detras], umbral, cotaDelUmbral: 0 });
    expect(sola.fijos.map((x) => x.nombre)[1]).toBe("OESTE");
  });
});

describe("avanzar: a qué punto se va", () => {
  const r = rutaDe(
    [f("A", 0, 0, "despegue"), f("B", 10, 0), f("C", 10, 10), f("D", 20, 10, "umbral")],
    0,
  );

  it("no pasa de punto hasta llegar a su través", () => {
    expect(avanzar(r, 1, 5 * MILLA, 0)).toBe(1);
  });

  it("pasa antes en un giro fuerte, que es como se vuela un punto de paso", () => {
    // Noventa grados de giro en B: se empieza a girar milla y media antes.
    expect(avanzar(r, 1, 8.7 * MILLA, 0)).toBe(2);
  });

  it("si se corta camino, se salta el punto que quedó atrás", () => {
    // Volando ya el tramo de C a D, a media milla de él.
    expect(avanzar(r, 1, 15 * MILLA, -10.5 * MILLA)).toBe(3);
  });

  it("y nunca vuelve atrás", () => {
    expect(avanzar(r, 3, 0, 0)).toBe(3);
  });
});

describe("lo que falta y cuándo se llega", () => {
  const r = rutaDe([f("A", 0, 0, "despegue"), f("B", 30, 0), f("C", 30, 30, "umbral")], 0);

  it("lo que falta es por la ruta, no en línea recta", () => {
    expect(restante(r, 1, 10 * MILLA, 0) / MILLA).toBeCloseTo(50, 5);
  });

  it("sin viento, la hora sale de la distancia y la velocidad", () => {
    // Sesenta millas a ciento veinte nudos: media hora.
    const s = segundosHastaElFinal(r, 1, 0, 0, 120 * (MILLA / 3600), null);
    expect(s / 60).toBeCloseTo(30, 3);
  });

  it("el viento cuenta tramo a tramo: de cara en uno, de costado en el otro", () => {
    const aire = 120 * (MILLA / 3600);
    // Viento del este de veinte nudos: de cara en el tramo al este, de
    // costado en el tramo al norte.
    const viento = { desde: 90, fuerza: 20 * (MILLA / 3600) };
    const s = segundosHastaElFinal(r, 1, 0, 0, aire, viento);
    const deCara = 30 / 100;
    const deCostado = 30 / Math.sqrt(120 * 120 - 20 * 20);
    expect(s / 3600).toBeCloseTo(deCara + deCostado, 4);
  });

  it("con viento de cola, sobre el suelo se va más deprisa", () => {
    const aire = 100;
    expect(sobreElSuelo(aire, Math.PI / 2, { desde: 270, fuerza: 10 })).toBeCloseTo(110, 5);
    expect(sobreElSuelo(aire, Math.PI / 2, { desde: 90, fuerza: 10 })).toBeCloseTo(90, 5);
  });
});

describe("el punto de descenso: tres millas por cada mil pies", () => {
  it("de diez mil pies a una pista al nivel del mar, treinta millas en calma", () => {
    expect(distanciaDeDescenso(10000 * PIE, 100, 100) / MILLA).toBeCloseTo(30, 5);
  });

  it("con viento de cola hay que empezar antes, y de cara después", () => {
    const calma = distanciaDeDescenso(10000 * PIE, 100, 100);
    expect(distanciaDeDescenso(10000 * PIE, 100, 110)).toBeGreaterThan(calma);
    expect(distanciaDeDescenso(10000 * PIE, 100, 90)).toBeLessThan(calma);
  });

  it("se cuenta desde la cota del destino, no desde el mar", () => {
    // Los Rodeos está a dos mil pies: desde nueve mil se bajan siete.
    expect(distanciaDeDescenso((9000 - 2076) * PIE, 100, 100) / MILLA).toBeCloseTo(20.8, 1);
  });

  it("y se pinta sobre la ruta, a esa distancia antes del umbral", () => {
    const r = rutaDe([f("A", 0, 0, "despegue"), f("B", 40, 0), f("C", 40, 20, "umbral")], 0);
    const p = puntoAFaltando(r, 30 * MILLA)!;
    expect(p.x / MILLA).toBeCloseTo(30, 5);
    expect(p.z).toBeCloseTo(0, 5);
  });

  it("la senda de tres grados baja trescientos pies por milla", () => {
    const r = rutaDe([f("A", 0, 0, "despegue"), f("B", 20, 0, "umbral")], 100);
    const a10 = alturaDeLaSenda(r, 1, 10 * MILLA);
    expect((a10 - 100) / PIE).toBeCloseTo(3333, 0);
  });

  it("pero no por debajo de la mínima publicada del siguiente punto", () => {
    const r = rutaDe(
      [f("A", 0, 0, "despegue"), f("BUNIX", 20, 0, "if", 5000 * PIE), f("RW", 32, 0, "umbral")],
      0,
    );
    expect(alturaDeLaSenda(r, 1, 13 * MILLA) / PIE).toBeCloseTo(5000, 0);
  });
});

describe("Seguimiento", () => {
  const r = rutaDe(
    [f("RW09", 0, 0, "despegue"), f("B", 30, 0), f("FAF", 55, 0, "faf"), f("RW27", 60, 0, "umbral")],
    0,
  );
  const lectura = (este: number, pies: number, vertical = 0) => ({
    x: este * MILLA,
    z: 0,
    altitud: pies * PIE,
    vertical,
    aire: 100,
    enTierra: false,
    viento: null,
  });

  it("avisa del punto de descenso una vez, al llegar a él", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    // A nueve mil pies el descenso cae a veintisiete millas del final: en la
    // milla 33 de sesenta.
    expect(s.paso(lectura(20, 9000)).descenso).toBe(false);
    expect(s.progreso!.puntoDeDescenso!.x / MILLA).toBeCloseTo(33, 3);
    expect(s.paso(lectura(32, 9000)).descenso).toBe(false);
    expect(s.paso(lectura(33.5, 9000)).descenso).toBe(true);
    expect(s.paso(lectura(34, 9000)).descenso).toBe(false);
    expect(s.bajando).toBe(true);
  });

  it("quien bajó antes por su cuenta no pasa el T/D, pero la final se sabe igual", () => {
    // Mil pies sobre el umbral: por debajo de lo que cuenta como bajada, así
    // que el punto de descenso no llega nunca. La ventanilla tiene que saber
    // de la final igualmente: ver `bajarLaVentanillaEnLaFinal` en game.ts.
    const s = new Seguimiento();
    s.poner(r, 1000 * PIE);
    for (const este of [20, 40, 50]) {
      s.paso(lectura(este, 1000));
      expect(s.enLaFinal(lectura(este, 1000)), `milla ${este}`).toBe(false);
    }
    s.paso(lectura(57, 900));
    expect(s.bajando).toBe(false);
    expect(s.enElTramoFinal(lectura(57, 900))).toBe(false);
    expect(s.enLaFinal(lectura(57, 900))).toBe(true);
    expect(s.enLaFinal({ ...lectura(57, 900), enTierra: true })).toBe(false);
  });

  it("subiendo, cuenta con el crucero planeado y no con la altura de ahora", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso(lectura(5, 3000, 8));
    expect(s.progreso!.descenso! / MILLA).toBeCloseTo(27, 3);
  });

  /*
   * **Y si se sube por encima del plan, la altura de verdad.** «Si la
   * comandante dice que vamos a ir a diez mil pies y yo subo hasta doce mil,
   * bajar me costó.» Subiendo vale el plan; nivelado más alto, la de ahora; y
   * subiendo hacia una ventanilla más alta que el plan, la ventanilla, que es
   * a donde se va.
   */
  it("nivelado por encima del plan, cuenta con la altura de verdad", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso(lectura(5, 11000, 0));
    expect(s.progreso!.descenso! / MILLA).toBeCloseTo(33, 3);
  });

  it("subiendo hacia una ventanilla más alta que el plan, cuenta con ella", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso({ ...lectura(5, 9500, 8), ventanilla: 12000 * PIE });
    expect(s.progreso!.descenso! / MILLA).toBeCloseTo(36, 3);
  });

  it("pero con la ventanilla en un escalón por debajo del plan, cuenta el plan", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso({ ...lectura(5, 3000, 8), ventanilla: 6000 * PIE });
    expect(s.progreso!.descenso! / MILLA).toBeCloseTo(27, 3);
  });

  it("y el aviso llega antes cuanto más alto se va", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    // A doce mil pies el descenso cae a treinta y seis millas del final:
    // en la milla veinticuatro, nueve antes que la del plan.
    expect(s.paso(lectura(23.5, 12000)).descenso).toBe(false);
    expect(s.paso(lectura(24.5, 12000)).descenso).toBe(true);
  });

  it("el T/C cae donde se acaba de subir, a dos millas por cada mil pies", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso(lectura(5, 3000, 8));
    // Seis mil pies por subir son doce millas: en la milla diecisiete.
    expect(s.progreso!.puntoDeSubida!.x / MILLA).toBeCloseTo(17, 3);
  });

  it("y no está ya en el crucero, ni detrás del punto de descenso", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso(lectura(10, 8900, 0));
    expect(s.progreso!.puntoDeSubida).toBeNull();
    s.poner(r, 9000 * PIE);
    // A cuarenta millas y a mil pies, subir no acabaría antes de bajar.
    s.paso(lectura(40, 1000, 5));
    expect(s.progreso!.puntoDeSubida).toBeNull();
  });

  it("la bajada del plan se acaba en la altura del punto de final", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    // Cinco millas del umbral: mil seiscientos sesenta y siete pies.
    expect(s.alturaDelFinal! / PIE).toBeCloseTo(5 * (1000 / 3), 0);
  });

  it("quien ya bajó por su cuenta no necesita el aviso", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    // Nivelado a mil pies a veinte millas del final: no hay nada que bajar.
    expect(s.paso(lectura(40, 1000)).descenso).toBe(false);
    expect(s.progreso!.descenso).toBeNull();
  });

  it("subiendo en una final corta no avisa: ahí no queda nada que bajar", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    // A dos millas del umbral, a ochocientos pies y subiendo un poco.
    expect(s.paso(lectura(58, 800, 3)).descenso).toBe(false);
  });

  it("un plan nuevo rearma el aviso; el reloj no", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    expect(s.paso(lectura(34, 9000)).descenso).toBe(true);
    s.poner(r, 9000 * PIE);
    expect(s.paso(lectura(34, 9000)).descenso).toBe(true);
  });

  it("el automático baja por la senda y se queda en la altura del punto de final", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso(lectura(34, 9000));
    const alli = s.alturaParaElAutomatico(lectura(40, 6700))!;
    expect(alli / PIE).toBeCloseTo(20 * (1000 / 3), 0);
    s.paso(lectura(58, 1700));
    const abajo = s.alturaParaElAutomatico(lectura(58, 1700))!;
    // Cinco millas del final: mil seiscientos sesenta pies, y de ahí no baja.
    expect(abajo / PIE).toBeCloseTo(5 * (1000 / 3), 0);
  });

  it("muy por encima de la senda, baja a su ritmo en vez de picar", () => {
    const s = new Seguimiento();
    s.poner(r, 9000 * PIE);
    s.paso(lectura(45, 9000));
    const pide = s.alturaParaElAutomatico(lectura(45, 9000))!;
    expect(9000 * PIE - pide).toBeCloseTo(90, 5);
  });
});

describe("el crucero de un salto corto", () => {
  it("sesenta millas piden unos ocho mil pies, no el techo del avión", () => {
    const r = rutaDe([f("A", 0, 0, "despegue"), f("B", 60, 0, "umbral")], 0);
    expect(cruceroPorLaDistancia(r, 11000, 0) / PIE).toBeCloseTo(8000, -2);
  });

  it("y nunca por debajo de la mínima publicada de la ruta", () => {
    const r = rutaDe(
      [f("A", 0, 0, "despegue"), f("IAF", 10, 0, "iaf", 7000 * PIE), f("B", 20, 0, "umbral")],
      0,
    );
    expect(cruceroPorLaDistancia(r, 11000, 0) / PIE).toBeCloseTo(7000, 0);
  });

  it("ni por encima de lo que da el avión", () => {
    const r = rutaDe([f("A", 0, 0, "despegue"), f("B", 300, 0, "umbral")], 0);
    expect(cruceroPorLaDistancia(r, 3000, 0)).toBe(3000);
  });
});
