/**
 * Las teselas de ortofoto: la cuenta del mosaico, la regla de la distancia y
 * el índice que lee el sombreador. Sin tarjeta: lo que se prueba aquí es lo
 * que decide qué se ve, no cómo se pinta.
 */
import { describe, expect, it } from "vitest";
import { MeshLambertMaterial, type WebGLRenderer } from "three";
import {
  CALIDAD,
  CAPAS,
  FIN_DE_LA_FOTO,
  GLSL_DE_LAS_TESELAS,
  IndiceDeCapas,
  aPixelesDelIndice,
  constanteDeDetalle,
  elegirTeselas,
  juegoDeTeselas,
  llevaTeselas,
  marcoDeTeselas,
  nivelParaDistancia,
  rectanguloEnElMarco,
  rejillaDelMundo,
  vestirConTeselas,
} from "./teselas-de-ortofoto";
import {
  ISLAS_CANARIAS,
  aIndice,
  deLlave,
  enTeselas,
  madresHasta,
  pistasEnGrados,
  planDeLaIsla,
  tierraDeLosRelieves,
  type Tesela,
} from "./cobertura-de-teselas";
import { mapasDeCanarias } from "./relieve-en-disco";
import { GLSL_DEL_FUNDIDO } from "./mundo-vecino";
import { GLSL_DEL_GRANO, ponerGrano } from "./grano";

const fs = () =>
  (
    globalThis as unknown as {
      process: { getBuiltinModule(nombre: string): unknown };
    }
  ).process.getBuiltinModule("node:fs") as {
    readFileSync(ruta: string, codificacion?: string): Uint8Array | string;
  };

const R = 6371008;
const RAD = Math.PI / 180;
const LA_PALMA = { lat: 28.626499, lon: -17.7556 };
const LOS_RODEOS = { lat: 28.482752, lon: -16.341707 };

/** El sitio exacto de un punto del marco local en el mosaico, con doble precisión. */
function exacto(origen: { lat: number; lon: number }, x: number, z: number, nivel: number) {
  const lat = origen.lat - z / R / RAD;
  const lon = origen.lon + x / (R * Math.cos(origen.lat * RAD)) / RAD;
  const p = enTeselas(lat, lon, nivel);
  return { x: p.x * 256, y: p.y * 256 };
}

describe("del marco local al mosaico", () => {
  it("cae en su sitio a menos de medio píxel de z16 —un metro— hasta a doscientos kilómetros", () => {
    const rejilla = rejillaDelMundo(LOS_RODEOS, 324000, 11, 16);
    const marco = marcoDeTeselas(LOS_RODEOS, 16, rejilla.esquina);
    let peor = 0;
    for (const x of [-200000, -150000, -50000, 0, 3000, 80000, 160000])
      for (const z of [-160000, -90000, -1000, 0, 2500, 70000, 160000]) {
        const e = exacto(LOS_RODEOS, x, z, 16);
        const p = aPixelesDelIndice(marco, x, z);
        const dx = p.x + rejilla.esquina.x * 256 - e.x;
        const dy = p.y + rejilla.esquina.y * 256 - e.y;
        peor = Math.max(peor, Math.hypot(dx, dy));
      }
    expect(peor).toBeLessThan(0.5);
  });

  it("y una recta no bastaría: a ciento cincuenta kilómetros al norte se iría casi un kilómetro", () => {
    const rejilla = rejillaDelMundo(LOS_RODEOS, 324000, 11, 16);
    const marco = marcoDeTeselas(LOS_RODEOS, 16, rejilla.esquina);
    const z = -150000;
    const e = exacto(LOS_RODEOS, 0, z, 16);
    const recta = marco.origen.y + rejilla.esquina.y * 256 + z * marco.mercator[0];
    // En píxeles de z16, a dos metros cada uno.
    expect(Math.abs(recta - e.y) * 2.1).toBeGreaterThan(900);
  });

  it("la rejilla del índice empieza en un borde de tesela gruesa y cubre el mundo entero", () => {
    const r = rejillaDelMundo(LOS_RODEOS, 324000, 11, 16);
    expect(r.esquina.x % 32).toBe(0);
    expect(r.esquina.y % 32).toBe(0);
    // 324 km son unas seiscientas teselas de z16; con el redondeo a z11, algo más.
    expect(r.ancho).toBeGreaterThanOrEqual(604);
    expect(r.ancho).toBeLessThanOrEqual(1024);
    const casa = marcoDeTeselas(LOS_RODEOS, 16, r.esquina);
    // El aeropuerto cae dentro.
    expect(casa.origen.x / 256).toBeGreaterThan(0);
    expect(casa.origen.x / 256).toBeLessThan(r.ancho);
  });
});

describe("la regla de la distancia", () => {
  // Una pantalla de 720 de alto con sesenta grados: la del banco.
  const k = constanteDeDetalle(720, 60);

  it("pide z16 a mil pies sobre la costa y z11 en el horizonte", () => {
    const n = (d: number) => nivelParaDistancia(d, LA_PALMA.lat, k, 11, 16);
    expect(n(300)).toBe(16);
    expect(n(1000)).toBe(16);
    expect(n(2500)).toBe(15);
    expect(n(4000)).toBe(14);
    expect(n(8000)).toBe(13);
    expect(n(15000)).toBe(12);
    expect(n(30000)).toBe(11);
  });

  it("con más píxeles en pantalla, más detalle a la misma distancia", () => {
    expect(nivelParaDistancia(5000, LA_PALMA.lat, k, 11, 16)).toBe(14);
    const grande = constanteDeDetalle(1440, 60);
    expect(nivelParaDistancia(5000, LA_PALMA.lat, grande, 11, 16)).toBe(15);
  });

  it("un píxel de tesela no cubre más de los que pide la calidad, en la frontera", () => {
    // Justo antes de partir una de z14, su píxel mide lado/256 y uno de
    // pantalla d·2·tan(30°)/720.
    const lado = (2 * Math.PI * 6378137 * Math.cos(LA_PALMA.lat * RAD)) / 2 ** 14;
    const d = k * lado;
    const deTesela = lado / 256;
    const dePantalla = (d * 2 * Math.tan(30 * RAD)) / 720;
    expect(deTesela / dePantalla).toBeCloseTo(CALIDAD, 5);
  });
});

describe("qué teselas se quieren", () => {
  /** Un índice con La Palma entera de z11 a z16, a todos los niveles. */
  function islaEntera(): { raices: Tesela[]; indice: ReturnType<typeof aIndice> } {
    const todas: Tesela[] = [];
    for (let z = 11; z <= 16; z++) {
      const a = enTeselas(28.87, -18.02, z);
      const b = enTeselas(28.44, -17.7, z);
      for (let y = Math.floor(a.y); y <= Math.floor(b.y); y++)
        for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) todas.push({ z, x, y });
    }
    return { raices: todas.filter((t) => t.z === 11), indice: aIndice(todas) };
  }

  /** Y la de verdad: la cobertura que pide el extractor, sobre el relieve. */
  function laDeVerdad(): { raices: Tesela[]; indice: ReturnType<typeof aIndice> } {
    const plan = planDeLaIsla(ISLAS_CANARIAS.find((i) => i.id === "la-palma")!, {
      tierra: tierraDeLosRelieves(mapasDeCanarias()),
      pistas: pistasEnGrados(
        JSON.parse(fs().readFileSync("data/aerodromes/gcla.aero.json", "utf8") as string),
      ),
      cumbres: [],
    });
    const pedidas = [...plan.pedidas.values()].flatMap((s) => [...s]);
    const gruesas = madresHasta(plan.pedidas.get(14)!);
    const todas = [...pedidas, ...[...gruesas.values()].flatMap((s) => [...s])].map(deLlave);
    return { raices: todas.filter((t) => t.z === 11), indice: aIndice(todas) };
  }

  const rect = (t: Tesela) => rectanguloEnElMarco(t, LA_PALMA);
  const k720 = constanteDeDetalle(720, 60);
  const k1080 = constanteDeDetalle(1080, 60);

  it("a 1.800 ft sobre Santa Cruz: de z11 a z16 lo de debajo, y caben en la tarjeta", () => {
    const { raices, indice } = laDeVerdad();
    // Santa Cruz de La Palma, en el marco del aeropuerto, mirando al sur.
    const ojo = { x: -917, z: -6283, altura: 550, mira: { x: -0.1, z: 1 } };
    for (const k of [k720, k1080]) {
      const q = elegirTeselas(ojo, raices, indice, 16, k, rect);
      expect(q.length).toBeLessThanOrEqual(CAPAS);
      const lat = LA_PALMA.lat - ojo.z / R / RAD;
      const lon = LA_PALMA.lon + ojo.x / (R * Math.cos(LA_PALMA.lat * RAD)) / RAD;
      for (let z = 11; z <= 16; z++) {
        const p = enTeselas(lat, lon, z);
        expect(
          q.some((e) => e.t.z === z && e.t.x === Math.floor(p.x) && e.t.y === Math.floor(p.y)),
          `z${z}`,
        ).toBe(true);
      }
    }
  });

  it("desde crucero no se pide z16: a 3.700 m el detalle de debajo es z14", () => {
    const { raices, indice } = laDeVerdad();
    const q = elegirTeselas({ x: 0, z: -20000, altura: 3700 }, raices, indice, 16, k720, rect);
    expect(q.some((e) => e.t.z === 16)).toBe(false);
    expect(Math.max(...q.map((e) => e.t.z))).toBe(14);
  });

  it("lo que cae fuera del cuadro no se parte: mirando al mar, la isla de detrás va gruesa", () => {
    const { raices, indice } = laDeVerdad();
    const ojo = { x: 8000, z: 0, altura: 550 };
    const alMar = elegirTeselas({ ...ojo, mira: { x: 1, z: 0 } }, raices, indice, 16, k720, rect);
    const aLaIsla = elegirTeselas({ ...ojo, mira: { x: -1, z: 0 } }, raices, indice, 16, k720, rect);
    expect(alMar.length).toBeLessThan(aLaIsla.length);
  });

  it("las gruesas van antes que sus hijas", () => {
    const { raices, indice } = islaEntera();
    const q = elegirTeselas(
      { x: 0, z: 0, altura: 600, mira: { x: 0, z: -1 } },
      raices,
      indice,
      16,
      k720,
      rect,
    );
    const orden = new Map(q.map((e, i) => [e.llave, i]));
    for (const e of q) {
      if (e.t.z === 11) continue;
      const madre = { z: e.t.z - 1, x: Math.floor(e.t.x / 2), y: Math.floor(e.t.y / 2) };
      const im = orden.get((madre.z * 131072 + madre.x) * 131072 + madre.y);
      expect(im).toBeDefined();
      expect(im!).toBeLessThan(orden.get(e.llave)!);
    }
  });

  it("las más gruesas, solo cerca: una isla a cien kilómetros es la foto del horizonte", () => {
    const { raices, indice } = islaEntera();
    const q = elegirTeselas({ x: 120000, z: 0, altura: 3000 }, raices, indice, 16, k720, rect);
    expect(q.length).toBe(0);
  });

  it("con límite, se quedan las más urgentes", () => {
    const { raices, indice } = islaEntera();
    const todas = elegirTeselas({ x: 0, z: 0, altura: 300 }, raices, indice, 16, 8, rect);
    const pocas = elegirTeselas({ x: 0, z: 0, altura: 300 }, raices, indice, 16, 8, rect, 20);
    expect(todas.length).toBeGreaterThan(20);
    expect(pocas.map((e) => e.llave)).toEqual(todas.slice(0, 20).map((e) => e.llave));
  });
});

describe("el índice que lee el sombreador", () => {
  const rejilla = rejillaDelMundo(LA_PALMA, 304000, 11, 16);
  const centro = enTeselas(LA_PALMA.lat, LA_PALMA.lon, 14);
  const t14: Tesela = { z: 14, x: Math.floor(centro.x), y: Math.floor(centro.y) };
  const celdaDe = (t: Tesela) => ({ x: t.x * 4 - rejilla.esquina.x, y: t.y * 4 - rejilla.esquina.y });

  it("dice la tesela más fina de las puestas, y vuelve a la gruesa al quitarla", () => {
    const i = new IndiceDeCapas(rejilla);
    const c = celdaDe(t14);
    expect(i.celda(c.x, c.y)).toBeNull();
    i.poner(t14, 7);
    // Las dieciséis celdas de z16 que tapa.
    for (let dy = 0; dy < 4; dy++)
      for (let dx = 0; dx < 4; dx++) expect(i.celda(c.x + dx, c.y + dy)).toEqual({ nivel: 14, capa: 7 });
    const hija16: Tesela = { z: 16, x: t14.x * 4 + 1, y: t14.y * 4 + 2 };
    i.poner(hija16, 300);
    expect(i.celda(c.x + 1, c.y + 2)).toEqual({ nivel: 16, capa: 300 });
    expect(i.celda(c.x, c.y)).toEqual({ nivel: 14, capa: 7 });
    i.quitar(hija16);
    expect(i.celda(c.x + 1, c.y + 2)).toEqual({ nivel: 14, capa: 7 });
    i.quitar(t14);
    expect(i.celda(c.x + 1, c.y + 2)).toBeNull();
  });

  it("apunta las filas que cambian, para subir solo esas", () => {
    const i = new IndiceDeCapas(rejilla);
    i.poner(t14, 1);
    expect([...i.filasTocadas].sort((a, b) => a - b)).toEqual([0, 1, 2, 3].map((d) => celdaDe(t14).y + d));
  });
});

describe("el sombreador, colgado detrás de la foto", () => {
  const sombreador = () => ({
    uniforms: {} as Record<string, unknown>,
    vertexShader: "void main() {\n#include <begin_vertex>\n}",
    fragmentShader: "void main() {\n#include <map_fragment>\n#include <color_fragment>\n}",
  });

  it("va después de leer la foto y antes del grano, aunque el grano se pusiera antes", () => {
    const m = new MeshLambertMaterial();
    ponerGrano(m, null as never);
    vestirConTeselas(m, { teselasPuestas: { value: 1 } }, { teselasEscalaX: { value: 1 } });
    const s = sombreador();
    m.onBeforeCompile(s as never, {} as WebGLRenderer);
    const f = s.fragmentShader;
    const foto = f.indexOf("#include <map_fragment>");
    const tesela = f.indexOf("texelFetch(teselasIndice");
    const grano = f.indexOf(GLSL_DEL_GRANO.cuerpo.trim().slice(0, 30));
    expect(foto).toBeGreaterThanOrEqual(0);
    expect(tesela).toBeGreaterThan(foto);
    expect(grano).toBeGreaterThan(tesela);
    expect(s.vertexShader).toContain("vTesela = teselasOrigen");
    expect(s.uniforms.teselasPuestas).toBeDefined();
    expect(s.uniforms.teselasEscalaX).toBeDefined();
    expect(m.customProgramCacheKey()).toContain("+teselas");
    expect(llevaTeselas(m)).toBe(true);
  });

  it("se cuelga también detrás del fundido del vecino, que se come la lectura de la foto", () => {
    expect(GLSL_DEL_FUNDIDO.mapa).toContain(FIN_DE_LA_FOTO);
    const m = new MeshLambertMaterial();
    m.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace("#include <map_fragment>", GLSL_DEL_FUNDIDO.mapa);
    };
    vestirConTeselas(m, {}, {});
    const s = sombreador();
    m.onBeforeCompile(s as never, {} as WebGLRenderer);
    expect(s.fragmentShader.indexOf("texelFetch(teselasIndice")).toBeGreaterThan(
      s.fragmentShader.indexOf(FIN_DE_LA_FOTO),
    );
  });

  it("vestir dos veces no las pone dos veces, y si otro pisa el gancho se nota", () => {
    const m = new MeshLambertMaterial();
    vestirConTeselas(m, {}, {});
    vestirConTeselas(m, {}, {});
    const s = sombreador();
    m.onBeforeCompile(s as never, {} as WebGLRenderer);
    expect(s.fragmentShader.split("texelFetch(teselasIndice").length).toBe(2);
    expect(m.customProgramCacheKey().split("+teselas").length).toBe(2);
    m.onBeforeCompile = () => {};
    expect(llevaTeselas(m)).toBe(false);
  });

  it("lee las derivadas sin cortar, para que no salga una raya en cada borde", () => {
    expect(GLSL_DE_LAS_TESELAS.cuerpo).toContain("textureGrad(");
    expect(GLSL_DE_LAS_TESELAS.cuerpo).toContain("dFdx(enLaTesela)");
  });
});

describe("qué juego de teselas toca", () => {
  it("el del PNOA a las fotos del PNOA, y ninguno a las de Sentinel-2", () => {
    expect(juegoDeTeselas("PNOA · Instituto Geográfico Nacional de España")).toBe("pnoa");
    expect(juegoDeTeselas("Sentinel-2 cloudless · EOX IT Services, sobre datos Copernicus/ESA")).toBeNull();
    expect(juegoDeTeselas(undefined)).toBeNull();
  });
});
