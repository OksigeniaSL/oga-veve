/**
 * **Cada pista con la senda que publica su AIP** (punto 237 de la lista): el
 * PAPI dibujado, el rombo de la final y el perfil del automático, por ella.
 * Ver `sendas-publicadas.ts`.
 */
import { describe, expect, it } from "vitest";
import { Color, Mesh, type InstancedMesh } from "three";
import {
  angulosDelIndicador,
  angulosDelPapi,
  barrasDe,
  blancasDePapi,
  blancasEnLaSenda,
  crearAproximacion,
  destelloEncendido,
  sitiarPapi,
} from "./aproximacion";
import { DIBUJOS } from "../ui/senal";
import { SCENARIOS as SIN_COMPLETAR, conSuAerodromo, oaciDe } from "./scenarios";
import {
  ayudasVisuales,
  CALVERT,
  lucesDePistaPublicadas,
  separacionDelBorde,
  SENDAS,
  SENDA_DE_SIEMPRE,
  SIN_AYUDAS_VISUALES,
  sendaDeLaCabecera,
  tieneIls,
} from "./sendas-publicadas";
import { cabeceraEnUso } from "./terrain";
import { alturaDeLaSendaDeLaFinal, desvioEnLaFinal, ritmoDeLaSenda } from "../flight/perfil-vertical";
import { altitudDelPerfil, MILLA, perfilDeLaBajada } from "../flight/ruta";
import { COLOR_DE_PISTA, colorVisto, lucesDePista, type Pista, type Umbral } from "./aerodrome";

/** Con el aeródromo de los que lo traen aparte, como los monta `main.ts`: ver `aerodromoAparte`. */
const SCENARIOS = await Promise.all(SIN_COMPLETAR.map(conSuAerodromo));

describe("la senda de cada cabecera, la de su AIP", () => {
  it("la 21 de Lanzarote, a 3,7°; la 19 de Fuerteventura, a 3,45°; la 09 de Cuatro Vientos, a 2,8°", () => {
    expect(sendaDeLaCabecera("GCRR", "21")).toBe(3.7);
    expect(sendaDeLaCabecera("GCFV", "19")).toBe(3.45);
    expect(sendaDeLaCabecera("LECU", "09")).toBe(2.8);
  });

  it("y las demás de Canarias, a tres", () => {
    for (const [oaci, cab] of [
      ["GCXO", "12"],
      ["GCXO", "30"],
      ["GCTS", "07"],
      ["GCLP", "03L"],
      ["GCRR", "03"],
      ["GCFV", "01"],
      ["GCLA", "18"],
      ["GCHI", "34"],
      ["GCGM", "09"],
    ] as const)
      expect(sendaDeLaCabecera(oaci, cab), `${oaci} ${cab}`).toBe(3);
  });

  /*
   * **Y qué cabeceras tienen ILS**, del apartado 2.19 de su AIP o de sus
   * cartas: las RNP tienen senda y no ILS, y es lo que decide si el *five
   * hundred* del JAZ 60 se canta. Ver `tieneIls`.
   */
  it("el ILS, donde lo publica su AIP, y la RNP no cuenta como ILS", () => {
    for (const [oaci, cab] of [
      ["GCXO", "12"], ["GCXO", "30"], ["GCTS", "07"], ["GCTS", "25"], ["GCLP", "03L"], ["GCLP", "21R"],
      ["GCFV", "01"], ["GCFV", "19"], ["GCRR", "03"], ["SGAS", "20"], ["SGES", "23"],
    ] as const)
      expect(tieneIls(oaci, cab), `${oaci} ${cab}`).toBe(true);
    for (const [oaci, cab] of [
      ["GCLP", "03R"], ["GCLP", "21L"], ["GCLA", "36"], ["GCRR", "21"], ["GCHI", "34"], ["GCGM", "09"],
      ["LECU", "09"], ["SGAS", "02"], ["SGEN", "20"], ["SGME", "01"], ["SGPI", "20"],
    ] as const)
      expect(tieneIls(oaci, cab), `${oaci} ${cab}`).toBe(false);
    expect(tieneIls(null, null)).toBe(false);
  });

  it("y lo que no se sabe, a tres", () => {
    expect(sendaDeLaCabecera("SGPI", "20")).toBe(SENDA_DE_SIEMPRE);
    expect(sendaDeLaCabecera(null, null)).toBe(SENDA_DE_SIEMPRE);
  });

  it("cada cabecera de la tabla existe en el aeródromo del juego, con ese nombre", () => {
    for (const [oaci, cabeceras] of Object.entries(SENDAS)) {
      const esc = SCENARIOS.find((e) => oaciDe(e) === oaci);
      expect(esc, oaci).toBeDefined();
      const todas = new Set(
        esc!.aerodrome!.runways.flatMap((r) => Object.keys(r.thresholds)),
      );
      for (const cab of Object.keys(cabeceras)) expect(todas.has(cab), `${oaci} ${cab}`).toBe(true);
    }
  });
});

describe("el PAPI reglado a la senda de su pista", () => {
  const umbral = (xy: [number, number], headingTrue: number): Umbral => ({
    elevM: 0,
    headingTrue,
    displacedM: 0,
    xy,
  });
  const PISTA: Pista = {
    ref: "03/21",
    widthM: 45,
    surface: "asphalt",
    lit: true,
    centerline: [
      [0, 0],
      [2400, 0],
    ],
    thresholds: { "21": umbral([0, 0], 90), "03": umbral([2400, 0], 270) },
    magneticVariation: 0,
  };
  const blancas = (senda: number, grados: number): number => {
    const a = crearAproximacion(PISTA, "21", () => 0, [], { ...SIN_AYUDAS_VISUALES, papi: senda })!;
    const d = 2000 + a.papiAdentro;
    a.mirarDesde(-2000, Math.tan((grados * Math.PI) / 180) * d + 1, 0);
    const papi = a.grupo.getObjectByName("papi") as InstancedMesh;
    const c = new Color();
    let n = 0;
    for (let k = 0; k < 4; k++) {
      papi.getColorAt(k, c);
      if (c.b > 0.5) n++;
    }
    return n;
  };

  it("los cuatro ángulos, treinta y diez minutos a cada lado de la senda, el más alto junto a la pista", () => {
    // Doc 9157, parte 4, tabla 8-1: de la de junto a la pista a la de fuera.
    const a = angulosDelPapi(3);
    expect(a[0]).toBeCloseTo(3.5, 6);
    expect(a[1]).toBeCloseTo(3 + 10 / 60, 6);
    expect(a[2]).toBeCloseTo(2 + 50 / 60, 6);
    expect(a[3]).toBeCloseTo(2.5, 6);
  });

  it("en la senda, las rojas junto a la pista y las blancas por fuera, como el de verdad", () => {
    const a = crearAproximacion(PISTA, "21", () => 0, [], { ...SIN_AYUDAS_VISUALES, papi: 3 })!;
    const d = 2000 + a.papiAdentro;
    a.mirarDesde(-2000, Math.tan((3 * Math.PI) / 180) * d + 1, 0);
    const papi = a.grupo.getObjectByName("papi") as InstancedMesh;
    const c = new Color();
    // La malla va de la de junto a la pista a la de fuera.
    const colores = Array.from({ length: 4 }, (_, k) => (papi.getColorAt(k, c), c.b > 0.5 ? "blanca" : "roja"));
    expect(colores).toEqual(["roja", "roja", "blanca", "blanca"]);
  });

  it("y la tarjeta las dibuja igual: blancas a la izquierda, rojas junto a la pista", () => {
    const rojas = (svg: string) =>
      [...svg.matchAll(/<circle[^>]*>/g)].map((m) => m[0].includes("senal__roja"));
    expect(rojas(DIBUJOS.papi2)).toEqual([false, false, true, true]);
    expect(rojas(DIBUJOS.papi1)).toEqual([false, true, true, true]);
    expect(rojas(DIBUJOS.apapi1)).toEqual([false, true]);
    expect(rojas(DIBUJOS.apapi2)).toEqual([false, false]);
    expect(rojas(DIBUJOS.apapi0)).toEqual([true, true]);
  });

  it("en la 21 de Lanzarote, a 3,7° dos y dos; y por tres grados, cuatro rojas", () => {
    expect(blancas(3.7, 3.7)).toBe(2);
    expect(blancas(3.7, 3)).toBe(0);
    expect(blancasDePapi(3.7, 3.7)).toBe(2);
    expect(blancasDePapi(3, 3.7)).toBe(0);
  });

  it("y en una de tres grados, como siempre", () => {
    expect(blancas(3, 3)).toBe(2);
    expect(blancasDePapi(3)).toBe(2);
  });
});

describe("el rombo de la final y el perfil, por la misma senda", () => {
  it("a 3,7° el rombo queda en el medio, y la senda baja más deprisa", () => {
    const d = 3000;
    const alto = d * Math.tan((3.7 * Math.PI) / 180);
    expect(desvioEnLaFinal(alto, d, 70, 3.7).puntos).toBeCloseTo(0, 6);
    expect(desvioEnLaFinal(alto, d, 70).grados!).toBeCloseTo(0.7, 6);
    expect(alturaDeLaSendaDeLaFinal(d, 3.7)).toBeCloseTo(alto, 6);
    expect(ritmoDeLaSenda(70, 3.7)).toBeLessThan(ritmoDeLaSenda(70));
  });

  it("y la final del perfil de la bajada va por ella", () => {
    const p = perfilDeLaBajada(14, null, 5 * MILLA, 3.7);
    expect(altitudDelPerfil(p, 2 * MILLA) - 14).toBeCloseTo(
      2 * MILLA * Math.tan((3.7 * Math.PI) / 180),
      6,
    );
  });
});

/*
 * **El PAPI y las luces de aproximación, solo donde los publica su AIP**: ver
 * «Las luces, solo donde las hay» en `sendas-publicadas.ts`. Se montan con el
 * aeródromo de verdad de cada campo y por la cabecera que se pide, que es lo
 * que hace el juego con la cabecera en uso.
 */
describe("el PAPI y las luces de aproximación, solo donde los publica su AIP", () => {
  const escenario = (id: string) => {
    const e = SCENARIOS.find((x) => x.id === id);
    if (!e?.aerodrome) throw new Error(`sin aeródromo: ${id}`);
    return e;
  };
  const pistaCon = (id: string, cabecera: string): Pista =>
    escenario(id).aerodrome!.runways.find((r) => r.thresholds[cabecera]?.xy)!;
  /** Lo que se monta en esa cabecera del campo, o `null` si nada. */
  const montado = (id: string, cabecera: string) => {
    const esc = escenario(id);
    return crearAproximacion(
      pistaCon(id, cabecera),
      cabecera,
      () => 0,
      esc.aerodrome!.visualAids ?? [],
      ayudasVisuales(oaciDe(esc), cabecera),
    );
  };
  /** El eje hacia dentro y el umbral de esa cabecera, en el plano del aeródromo. */
  const ejeDe = (id: string, cabecera: string) => {
    const pista = pistaCon(id, cabecera);
    const u = pista.thresholds[cabecera]!.xy!;
    const otro = Object.values(pista.thresholds).find((v) => v?.xy && v.xy !== u)!.xy!;
    const l = Math.hypot(otro[0] - u[0], otro[1] - u[1]);
    return { u, ux: (otro[0] - u[0]) / l, uy: (otro[1] - u[1]) / l };
  };
  /** Cada luz de una malla, en metros sobre el eje y a qué costado (izquierda, positivo). */
  const sobreElEje = (id: string, cabecera: string, malla: InstancedMesh) => {
    const { u, ux, uy } = ejeDe(id, cabecera);
    const a = malla.instanceMatrix.array;
    return Array.from({ length: malla.count }, (_, k) => {
      const px = a[k * 16 + 12]! - u[0];
      const py = -a[k * 16 + 14]! - u[1];
      return { adentro: px * ux + py * uy, lado: px * -uy + py * ux };
    });
  };
  /** De la primera luz a la última de la fila blanca, m. */
  const largoDeLaFila = (id: string, cabecera: string): number => {
    const fila = montado(id, cabecera)!.grupo.getObjectByName("luces-aproximacion") as InstancedMesh;
    const d = sobreElEje(id, cabecera, fila).map((l) => l.adentro);
    return Math.max(...d) - Math.min(...d);
  };

  it("la 36L de Barajas, que es de despegar: ni PAPI ni luces de aproximación", () => {
    expect(ayudasVisuales("LEMD", "36L")).toEqual(SIN_AYUDAS_VISUALES);
    expect(montado("barajas", "36L")).toBeNull();
    // Y es la cabecera por la que se opera en ese mundo.
    expect(cabeceraEnUso(escenario("barajas"))).toBe("36L");
  });

  it("la 18R, la de llegar: el PAPI y novecientos metros de categoría II/III, con sus filas rojas", () => {
    const a = montado("barajas", "18R")!;
    expect(a.grupo.getObjectByName("papi")).toBeDefined();
    expect(a.senda).toBe(3);
    // De la luz de los treinta metros a la de los novecientos.
    expect(largoDeLaFila("barajas", "18R")).toBeCloseTo(870, -1);
    const rojas = a.grupo.getObjectByName("luces-aproximacion-rojas") as InstancedMesh;
    expect(rojas.count).toBe(9 * 2 * 3);
  });

  it("Concepción y Mariscal Estigarribia no publican PAPI ni luces de aproximación: no se pinta nada", () => {
    for (const cab of ["03", "21"]) {
      expect(ayudasVisuales("SGCO", cab).papi, `SGCO ${cab}`).toBeNull();
      expect(montado("concepcion", cab), `SGCO ${cab}`).toBeNull();
    }
    for (const cab of ["01", "19"]) expect(montado("estigarribia", cab), `SGME ${cab}`).toBeNull();
  });

  it("Tenerife Norte, por la cabecera en uso: su PAPI y sus 420 m de luces", () => {
    const cab = cabeceraEnUso(escenario("tenerife-norte"))!;
    expect(["12", "30"]).toContain(cab);
    const a = montado("tenerife-norte", cab)!;
    expect(a.grupo.getObjectByName("papi")).toBeDefined();
    expect(largoDeLaFila("tenerife-norte", cab)).toBeCloseTo(390, -1);
  });

  it("y el PAPI de la 12 de Tenerife Norte, solo a la derecha; el de la 30, a la izquierda", () => {
    const lado = (cab: string) => {
      const papi = montado("tenerife-norte", cab)!.grupo.getObjectByName("papi") as InstancedMesh;
      return sobreElEje("tenerife-norte", cab, papi).map((l) => l.lado);
    };
    for (const l of lado("12")) expect(l).toBeLessThan(0);
    for (const l of lado("30")) expect(l).toBeGreaterThan(0);
  });

  it("donde hay PAPI y no luces de aproximación, el PAPI solo: la 18 de La Palma", () => {
    const a = montado("la-palma", "18")!;
    expect(a.grupo.getObjectByName("papi")).toBeDefined();
    expect(a.grupo.getObjectByName("luces-aproximacion")).toBeUndefined();
  });

  it("la barra de la 03 de Lanzarote, a 377 m; la 21L de Gran Canaria, sin barra; las Calvert, cinco", () => {
    expect(barrasDe(SENDAS.GCRR!["03"]!.luces!)).toEqual([377]);
    expect(barrasDe(SENDAS.GCLP!["21L"]!.luces!)).toEqual([]);
    expect(barrasDe(SENDAS.SGAS!["20"]!.luces!)).toEqual(CALVERT);
    expect(barrasDe(SENDAS.LEMD!["18R"]!.luces!)).toEqual([150, 300]);
    // La PALS de la 21R mide trescientos: su barra, en la última luz.
    expect(barrasDe(SENDAS.GCLP!["21R"]!.luces!)).toEqual([300]);
  });

  it("lo que no está en la tabla no se sabe, y no se pinta: Yvytu Rape y Ayolas", () => {
    expect(ayudasVisuales(oaciDe(escenario("yvytu-rape")), "15")).toEqual(SIN_AYUDAS_VISUALES);
    expect(ayudasVisuales("SGAY", "02")).toEqual(SIN_AYUDAS_VISUALES);
    expect(ayudasVisuales(null, null)).toEqual(SIN_AYUDAS_VISUALES);
    expect(montado("yvytu-rape", "15")).toBeNull();
  });

  it("cada cabecera de cada pista con luces del juego tiene su fila del AIP: ninguna se queda sin saber", () => {
    for (const esc of SCENARIOS) {
      const oaci = oaciDe(esc);
      if (!oaci) continue;
      for (const pista of esc.aerodrome!.runways.filter((r) => r.lit))
        for (const cab of Object.keys(pista.thresholds))
          expect(SENDAS[oaci]?.[cab], `${oaci} ${cab}`).toBeDefined();
    }
  });
});

/*
 * **Y las luces de la pista, donde no son las de siempre**: la barra verde
 * del umbral, la roja del final y el ámbar de los últimos seiscientos metros,
 * del mismo apartado 2.14. Ver `lucesDePistaPublicadas`.
 */
describe("las luces de umbral, de final y de borde, las de su AIP", () => {
  const { verde, roja, ambar } = COLOR_DE_PISTA;
  const lucesDe = (oaci: string, cabecera: string) => {
    const esc = SCENARIOS.find((e) => oaciDe(e) === oaci)!;
    const pista = esc.aerodrome!.runways.find((r) => r.thresholds[cabecera]?.xy)!;
    return lucesDePista(pista, () => 0, oaci);
  };
  const cuantas = (luces: ReturnType<typeof lucesDe>, color: number) =>
    luces.filter((l) => l.desdeElFin === color || l.desdeElPrincipio === color).length;

  it("en la 18R/36L de Barajas, la barra verde solo en la 18R: la 36L es de despegar", () => {
    expect(lucesDePistaPublicadas("LEMD", "36L")).toEqual({ umbral: false, extremo: true, ambar: true, ambarM: 600 });
    expect(lucesDePistaPublicadas("LEMD", "18R").umbral).toBe(true);
    // Una fila de once, y no dos.
    expect(cuantas(lucesDe("LEMD", "36L"), verde)).toBe(11);
  });

  it("Concepción, ni verde ni roja ni ámbar: «1.850M Blanca» y NIL lo demás", () => {
    const luces = lucesDe("SGCO", "03");
    expect(luces.length).toBeGreaterThan(0);
    expect(cuantas(luces, verde)).toBe(0);
    expect(cuantas(luces, roja)).toBe(0);
    expect(cuantas(luces, ambar)).toBe(0);
  });

  it("La Gomera, con sus barras y el borde blanco hasta el final; Tenerife Norte, con su ámbar", () => {
    const gomera = lucesDe("GCGM", "09");
    expect(cuantas(gomera, verde)).toBe(22);
    expect(cuantas(gomera, ambar)).toBe(0);
    expect(cuantas(lucesDe("GCXO", "12"), ambar)).toBeGreaterThan(0);
  });

  it("y lo que no está en la tabla, con las de siempre", () => {
    expect(lucesDePistaPublicadas("SGOG", "15")).toEqual({ umbral: true, extremo: true, ambar: true, ambarM: null });
  });
});

/*
 * **El APAPI de la 21 de Pedro Juan Caballero**: dos luces y no cuatro, a
 * 3°15' la de junto a la pista y a 2°45' la de fuera (Doc 9157, parte 4,
 * 8.3.6 y tabla 8-1). Las dos blancas, alto; una de cada, en la senda; las
 * dos rojas, bajo.
 */
describe("el APAPI: dos luces, y la senda es una de cada", () => {
  it("sus dos ángulos, quince minutos a cada lado de la senda", () => {
    const a = angulosDelIndicador(3, 2);
    expect(a).toHaveLength(2);
    expect(a[0]).toBeCloseTo(3.25, 6);
    expect(a[1]).toBeCloseTo(2.75, 6);
    expect(blancasEnLaSenda(2)).toBe(1);
    expect(blancasEnLaSenda(4)).toBe(2);
  });

  it("alto, las dos blancas; en la senda, una y una; bajo, las dos rojas", () => {
    expect(blancasDePapi(3.6, 3, 2)).toBe(2);
    expect(blancasDePapi(3.0, 3, 2)).toBe(1);
    expect(blancasDePapi(2.5, 3, 2)).toBe(0);
    // Y un PAPI desde los mismos ángulos, con las suyas.
    expect(blancasDePapi(3.0)).toBe(2);
  });

  it("la de dentro a diez metros del borde, y seis entre las dos", () => {
    const s = sitiarPapi([0, 0], [1, 0], 30, 1800, [], false, 2);
    expect(s.luces).toHaveLength(2);
    expect(s.luces[0]![1]).toBeCloseTo(15 + 10, 6);
    expect(s.luces[1]![1] - s.luces[0]![1]).toBeCloseTo(6, 6);
  });

  it("la 21 de Pedro Juan monta un APAPI, y no un PAPI; la 03, nada", () => {
    const esc = SCENARIOS.find((e) => e.id === "pedro-juan")!;
    const aero = esc.aerodrome!;
    const publicado = ayudasVisuales(oaciDe(esc), "21");
    expect(publicado.apapi).toBe(true);
    expect(publicado.papi).toBe(3);
    const a = crearAproximacion(aero.runways[0]!, "21", () => 0, aero.visualAids ?? [], publicado)!;
    const luces = a.grupo.getObjectByName("papi") as InstancedMesh;
    expect(luces.count).toBe(2);
    expect(a.unidades).toBe(2);
    // Sin luces de aproximación: «NIL» en su 2.14.
    expect(a.grupo.getObjectByName("luces-aproximacion")).toBeUndefined();
    // Y en la senda, la de junto a la pista roja y la de fuera blanca.
    const dentro = 2000 + a.papiAdentro;
    const { u, ux, uy } = (() => {
      const pista = aero.runways[0]!;
      const p = pista.thresholds["21"]!.xy!;
      const q = pista.thresholds["03"]!.xy!;
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return { u: p, ux: (q[0] - p[0]) / l, uy: (q[1] - p[1]) / l };
    })();
    a.mirarDesde(u[0] - ux * 2000, Math.tan((3 * Math.PI) / 180) * dentro + 1, -(u[1] - uy * 2000));
    const c = new Color();
    const colores = [0, 1].map((k) => (luces.getColorAt(k, c), c.b > 0.5 ? "blanca" : "roja"));
    expect(colores).toEqual(["roja", "blanca"]);
    expect(crearAproximacion(aero.runways[0]!, "03", () => 0, aero.visualAids ?? [], ayudasVisuales("SGPJ", "03"))).toBeNull();
  });

  it("y su pista, con las luces que publica su AIP: puestas a mano, con su fuente", () => {
    const esc = SCENARIOS.find((e) => e.id === "pedro-juan")!;
    const aero = esc.aerodrome!;
    expect(aero.runways[0]!.lit).toBe(true);
    expect(aero.lucesAMano?.pistas["03/21"]).toBe(true);
    expect(aero.lucesAMano?.fuente).toMatch(/AD 2\.4-14.*AMDT AIRAC 02\/2026/);
    const { verde, roja, ambar } = COLOR_DE_PISTA;
    const luces = lucesDePista(aero.runways[0]!, () => 0, "SGPJ");
    const con = (color: number) => luces.some((l) => l.desdeElFin === color || l.desdeElPrincipio === color);
    expect(con(verde) && con(roja) && con(ambar)).toBe(true);
  });

  it("y en todos los ficheros, cada pista puesta a mano con las luces que dice su nota", () => {
    for (const esc of SCENARIOS) {
      const aero = esc.aerodrome;
      if (!aero?.lucesAMano) continue;
      for (const [ref, conLuces] of Object.entries(aero.lucesAMano.pistas)) {
        const pista = aero.runways.find((r) => r.ref === ref);
        expect(pista, `${aero.id} ${ref}`).toBeDefined();
        expect(pista!.lit, `${aero.id} ${ref}`).toBe(conLuces);
      }
    }
  });
});

describe("el ámbar del borde, con los metros que da su AIP", () => {
  const { ambar } = COLOR_DE_PISTA;
  /** A cuántos metros del final de la pista está la luz ámbar más lejana, vista llegando por `cabecera`. */
  const ambarHasta = (oaci: string, cabecera: string): number => {
    const esc = SCENARIOS.find((e) => oaciDe(e) === oaci)!;
    const pista = esc.aerodrome!.runways.find((r) => r.thresholds[cabecera]?.xy)!;
    const u = pista.thresholds[cabecera]!.xy!;
    const otra = Object.entries(pista.thresholds).find(([n, v]) => n !== cabecera && v?.xy)![1]!.xy!;
    const l = Math.hypot(otra[0] - u[0], otra[1] - u[1]);
    const [ux, uy] = [(otra[0] - u[0]) / l, (otra[1] - u[1]) / l];
    // El ojo, en la final de esa cabecera: ve el lado de las luces que mira hacia ella.
    const ojo = { x: u[0] - ux * 1000, z: -(u[1] - uy * 1000) };
    let mas = 0;
    for (const luz of lucesDePista(pista, () => 0, oaci)) {
      if (colorVisto(luz, ojo) !== ambar) continue;
      const adentro = (luz.p[0] - u[0]) * ux + (-luz.p[2] - u[1]) * uy;
      mas = Math.max(mas, l - adentro);
    }
    return mas;
  };

  it("El Hierro, 400 m: «1250 m: 850 m white + 400 m yellow»", () => {
    expect(lucesDePistaPublicadas("GCHI", "16").ambarM).toBe(400);
    expect(ambarHasta("GCHI", "16")).toBeLessThan(400);
  });

  it("Cuatro Vientos, 600 m, que la regla del tercio dejaba en 500", () => {
    expect(lucesDePistaPublicadas("LECU", "09").ambarM).toBe(600);
    expect(ambarHasta("LECU", "09")).toBeGreaterThan(500);
    expect(ambarHasta("LECU", "09")).toBeLessThan(600);
  });

  it("y donde el AIP no da la cifra, la regla de la OACI", () => {
    expect(lucesDePistaPublicadas("SGAS", "20").ambarM).toBeNull();
    expect(lucesDePistaPublicadas("SGOG", "15").ambarM).toBeNull();
  });
});

describe("las luces de borde, cada los metros que publica su AIP", () => {
  /** La separación entre las luces de borde de un costado, m, medida sobre el eje. */
  const separacionMedida = (oaci: string): number => {
    const esc = SCENARIOS.find((e) => oaciDe(e) === oaci)!;
    const pista = esc.aerodrome!.runways[0]!;
    const [a, b] = Object.values(pista.thresholds).map((u) => u?.xy).filter((xy) => !!xy) as (readonly [number, number])[];
    const l = Math.hypot(b![0] - a![0], b![1] - a![1]);
    const [ux, uy] = [(b![0] - a![0]) / l, (b![1] - a![1]) / l];
    const sobre = lucesDePista(pista, () => 0, oaci)
      .map((luz) => {
        const px = luz.p[0] - a![0];
        const py = -luz.p[2] - a![1];
        return { adentro: px * ux + py * uy, lado: px * -uy + py * ux };
      })
      // Las de un costado. Las de cabecera, que cruzan la pista, quedan juntas
      // y dan pasos de nada: fuera con los de menos de cinco metros.
      .filter((p) => p.lado > 0)
      .map((p) => p.adentro)
      .sort((x, y) => x - y);
    const pasos = sobre
      .slice(1)
      .map((d, i) => d - sobre[i]!)
      .filter((d) => d > 5)
      .sort((x, y) => x - y);
    expect(pasos.length, `${oaci}: luces de borde`).toBeGreaterThan(10);
    // La mediana: el paso de casi todas.
    return pasos[Math.floor(pasos.length / 2)]!;
  };

  it("cincuenta en Tenerife Norte, El Hierro y Cuatro Vientos, como dice su 2.14", () => {
    expect(separacionDelBorde("GCXO")).toBe(50);
    expect(separacionMedida("GCXO")).toBeCloseTo(50, 0);
    expect(separacionMedida("GCHI")).toBeCloseTo(50, 0);
    expect(separacionMedida("LECU")).toBeCloseTo(50, 0);
  });

  it("sesenta en La Gomera, Barajas y Asunción, y donde no se da la cifra", () => {
    expect(separacionMedida("GCGM")).toBeCloseTo(60, 0);
    expect(separacionMedida("SGAS")).toBeCloseTo(60, 0);
    expect(separacionDelBorde("LEMD")).toBe(60);
    // Concepción solo dice «1.850M Blanca», y Yvytu Rape no tiene AIP.
    expect(separacionDelBorde("SGCO")).toBe(60);
    expect(separacionDelBorde("SGOG")).toBe(60);
  });
});

describe("las luces de identificación de umbral, donde las publica su AIP", () => {
  const montado = (id: string, cabecera: string) => {
    const esc = SCENARIOS.find((e) => e.id === id)!;
    const aero = esc.aerodrome!;
    const pista = aero.runways.find((r) => r.thresholds[cabecera]?.xy)!;
    return { pista, a: crearAproximacion(pista, cabecera, () => 0, aero.visualAids ?? [], ayudasVisuales(oaciDe(esc), cabecera))! };
  };

  it("en La Gomera, el SLIU: dos, una a cada lado del umbral y diez metros por fuera del borde", () => {
    const { pista, a } = montado("la-gomera", "09");
    const luces = a.grupo.getObjectByName("identificacion-de-umbral") as InstancedMesh;
    expect(luces.count).toBe(2);
    const u = pista.thresholds["09"]!.xy!;
    const otro = pista.thresholds["27"]!.xy!;
    const l = Math.hypot(otro[0] - u[0], otro[1] - u[1]);
    const [ux, uy] = [(otro[0] - u[0]) / l, (otro[1] - u[1]) / l];
    const m = new Mesh().matrix;
    const lados = [0, 1].map((k) => {
      luces.getMatrixAt(k, m);
      const px = m.elements[12]! - u[0];
      const py = -m.elements[14]! - u[1];
      expect(Math.abs(px * ux + py * uy), "en línea con el umbral").toBeLessThan(0.5);
      return px * -uy + py * ux;
    });
    const borde = (pista.widthM ?? 45) / 2 + 1.5;
    expect(Math.min(...lados)).toBeCloseTo(-(borde + 10), 1);
    expect(Math.max(...lados)).toBeCloseTo(borde + 10, 1);
  });

  it("y donde su AIP no las nombra, no las hay: Tenerife Norte, Cuatro Vientos, Barajas, Asunción", () => {
    for (const [id, cab] of [["tenerife-norte", "12"], ["cuatro-vientos", "09"], ["pettirossi", "20"]] as const)
      expect(montado(id, cab).a.grupo.getObjectByName("identificacion-de-umbral"), `${id} ${cab}`).toBeUndefined();
    expect(ayudasVisuales("LEMD", "18R").identificacion).toBe(false);
    for (const [oaci, cab] of [["GCLP", "21L"], ["GCFV", "19"], ["GCRR", "03"], ["GCLA", "18"], ["GCHI", "34"], ["GCGM", "27"]] as const)
      expect(ayudasVisuales(oaci, cab).identificacion, `${oaci} ${cab}`).toBe(true);
  });

  it("destellan a sesenta por minuto, una décima cada vez", () => {
    expect(destelloEncendido(0)).toBe(true);
    expect(destelloEncendido(0.05)).toBe(true);
    expect(destelloEncendido(0.5)).toBe(false);
    expect(destelloEncendido(12.04)).toBe(true);
    // En un minuto, una décima de cada segundo.
    let encendido = 0;
    for (let t = 0; t < 60; t += 0.01) if (destelloEncendido(t)) encendido++;
    expect(encendido / 6000).toBeCloseTo(0.1, 2);
  });

  it("y solo de noche y desde la final: de día y pasado el umbral, apagadas", () => {
    const { pista, a } = montado("la-gomera", "09");
    const luces = a.grupo.getObjectByName("identificacion-de-umbral") as InstancedMesh;
    const u = pista.thresholds["09"]!.xy!;
    const otro = pista.thresholds["27"]!.xy!;
    const l = Math.hypot(otro[0] - u[0], otro[1] - u[1]);
    const [ux, uy] = [(otro[0] - u[0]) / l, (otro[1] - u[1]) / l];
    const enLaFinal = { x: u[0] - ux * 1500, z: -(u[1] - uy * 1500) };
    const enLaPista = { x: u[0] + ux * 500, z: -(u[1] + uy * 500) };
    a.ponerSol(0.8);
    a.destellar(0, enLaFinal.x, enLaFinal.z);
    expect(luces.visible, "de día").toBe(false);
    a.ponerSol(-0.2);
    a.destellar(0, enLaFinal.x, enLaFinal.z);
    expect(luces.visible, "de noche, en el destello").toBe(true);
    a.destellar(0.5, enLaFinal.x, enLaFinal.z);
    expect(luces.visible, "de noche, entre destellos").toBe(false);
    a.destellar(0, enLaPista.x, enLaPista.z);
    expect(luces.visible, "pasado el umbral").toBe(false);
  });
});
