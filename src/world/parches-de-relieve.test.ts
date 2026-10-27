/**
 * **Que los parches pongan el relieve fino sin costuras**, y que lo pongan
 * donde está.
 *
 * - En el borde de lo refinado, la cota es la del horizonte: la recta entre
 *   sus dos nudos, que es el lado del cuadro de al lado. Si no, se ve el cielo
 *   por la raja.
 * - Dentro, la del parche: el Teide a su cota, con el mapa de verdad.
 * - Lo que el horizonte no dibuja —el mapa fino de casa, el de un vecino— no
 *   se refina.
 * - Y la malla no se sale de los cuadros refinados ni de su mitad del anillo.
 */

import { describe, expect, it } from "vitest";
import type { BufferGeometry, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  RAMPA,
  asentar,
  cotaDelParche,
  mallarElParche,
  refinarElHorizonte,
  subdivisionDe,
  type ParcheDeRelieve,
  type RejillaDelHorizonte,
} from "./parches-de-relieve";

const R = 6371008;
const RAD = Math.PI / 180;

/** La proyección de los mapas, con su origen. */
function proyeccion(lat0: number, lon0: number) {
  const k = Math.cos(lat0 * RAD);
  return {
    aGrados: (x: number, z: number) => ({ lat: lat0 - z / (R * RAD), lon: lon0 + x / (R * RAD * k) }),
    aMetros: (lat: number, lon: number) => ({ x: (lon - lon0) * R * RAD * k, z: -(lat - lat0) * R * RAD }),
  };
}

/** Un parche de prueba: un cono de 300 m sobre un llano a 100, en su centro. */
function conoDePrueba(lat: number, lon: number, lado: number): ParcheDeRelieve {
  const filas = 201;
  const dLat = lado / 2 / (R * RAD);
  const dLon = dLat / Math.cos(lat * RAD);
  const datos = new Int16Array(filas * filas);
  for (let f = 0; f < filas; f++)
    for (let c = 0; c < filas; c++) {
      const d = Math.hypot(f - 100, c - 100) * (lado / 200);
      datos[f * filas + c] = Math.round(100 + Math.max(0, 300 - d / 2));
    }
  return {
    id: "cono",
    nombre: "Cono",
    fuente: "prueba",
    atribucion: "",
    sur: lat - dLat,
    norte: lat + dLat,
    oeste: lon - dLon,
    este: lon + dLon,
    filas,
    columnas: filas,
    dibujo: 50,
    minM: 100,
    maxM: 400,
    datos,
  };
}

/** Un horizonte de 101 nudos a 300 m, en rampa suave hacia el este. */
function rampa(dibujable: (f: number, c: number) => boolean = () => true): RejillaDelHorizonte {
  return {
    lado: 101,
    paso: 300,
    mitad: 15000,
    cota: (f, c) => 100 + c * 0.5 + f * 0.25,
    dibujable,
  };
}

describe("los parches de relieve", () => {
  const { aGrados, aMetros } = proyeccion(28, -16);
  const cono = conoDePrueba(28, -16, 8000);

  it("lee la cota del parche en grados, y se calla fuera", () => {
    expect(cotaDelParche(cono, 28, -16)).toBeCloseTo(400, 0);
    expect(cotaDelParche(cono, 28.2, -16)).toBeNull();
  });

  it("parte cada cuadro en los que pide su dibujo, y al menos en uno", () => {
    expect(subdivisionDe(316, 45)).toBe(7);
    expect(subdivisionDe(1719, 60)).toBe(29);
    expect(subdivisionDe(30, 60)).toBe(1);
  });

  it("refina solo los cuadros enteros dentro del parche", () => {
    const r = refinarElHorizonte(rampa(), [cono], aGrados, aMetros);
    expect(r.parches).toHaveLength(1);
    // El centro del mundo está en el nudo 50: dentro.
    expect(r.refinado(50, 50)).toBe(true);
    // A seis kilómetros, fuera del parche de ocho.
    expect(r.refinado(50, 70)).toBe(false);
    expect(r.cota(6000, 0)).toBeNull();
  });

  it("en el borde casa con el horizonte, y dentro es el parche", () => {
    const rej = rampa();
    const r = refinarElHorizonte(rej, [cono], aGrados, aMetros);
    const p = r.parches[0]!;
    // Los nudos del cerco: la cota del horizonte interpolada en su lado.
    for (let i = 0; i < p.filas; i++)
      for (const j of [0, p.columnas - 1]) {
        const gf = p.f0 + i / p.s;
        const gc = p.c0 + j / p.s;
        const esperado = 100 + gc * 0.5 + gf * 0.25;
        expect(p.alturas[i * p.columnas + j]).toBeCloseTo(esperado, 3);
      }
    // La cima, la del parche: el horizonte la dejaba en cien metros.
    expect(r.cota(0, 0)!).toBeGreaterThan(390);
    // Y la rampa entre los dos, del ancho que se dijo.
    expect(RAMPA).toBe(1000);
  });

  it("no refina lo que el horizonte no dibuja, ni funde contra ello", () => {
    // El mapa fino de casa ocupa los cuadros 45 a 54: ahí no hay horizonte.
    const casa = (f: number, c: number) => !(f >= 45 && f < 55 && c >= 45 && c < 55);
    const r = refinarElHorizonte(rampa(casa), [cono], aGrados, aMetros);
    expect(r.refinado(50, 50)).toBe(false);
    expect(r.refinado(50, 42)).toBe(true);
    const p = r.parches[0]!;
    /*
     * En el borde con el mapa fino, el parche y no el horizonte: los dos son
     * el relieve medido, y fundir hacia el horizonte ahí era bajar al Roque
     * de Agando a la loma de siempre.
     */
    const i = (50 - p.f0) * p.s;
    const j = (45 - p.c0) * p.s;
    const { lat, lon } = aGrados(-15000 + 45 * 300, -15000 + 50 * 300);
    expect(p.alturas[i * p.columnas + j]).toBeCloseTo(cotaDelParche(cono, lat, lon)!, 0);
  });

  it("la malla se queda en sus cuadros, y en su mitad del anillo", () => {
    const r = refinarElHorizonte(rampa(), [cono], aGrados, aMetros);
    const p = r.parches[0]!;
    const todos = mallarElParche(p, () => true);
    expect(todos.length % 3).toBe(0);
    expect(Math.max(...todos)).toBeLessThan(p.filas * p.columnas);
    // Solo la mitad oeste.
    const oeste = mallarElParche(p, (_f, c) => c < 50);
    expect(oeste.length).toBeGreaterThan(0);
    expect(oeste.length).toBeLessThan(todos.length);
    for (const v of oeste) {
      const j = v % p.columnas;
      expect(p.c0 + j / p.s).toBeLessThanOrEqual(50);
    }
  });

  it("retoca las cotas que se le pidan: el fondo de un lago", () => {
    const r = refinarElHorizonte(rampa(), [cono], aGrados, aMetros, (h) => h - 15);
    expect(r.cota(0, 0)!).toBeCloseTo(385, -1);
  });
});

/*
 * Con los mapas de verdad, que es lo que importa: el Teide visto desde Los
 * Rodeos tenía la cima en 3.648 m y la de verdad está en 3.715.
 */
const fs = () =>
  (
    globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
  ).process.getBuiltinModule("node:fs") as {
    readFileSync(ruta: string, codificacion?: string): Uint8Array | string;
  };

function leerMapa(id: string): { lat: number; lon: number; tamano: number; n: number; datos: Int16Array } {
  const ficha = JSON.parse(fs().readFileSync(`data/terrain/${id}.json`, "utf8") as string);
  const b = fs().readFileSync(`data/terrain/${id}.bin`) as Uint8Array;
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return { lat: ficha.origen.lat, lon: ficha.origen.lon, tamano: ficha.tamanoM, n: ficha.resolucion, datos };
}

function leerParche(id: string): ParcheDeRelieve {
  const ficha = JSON.parse(fs().readFileSync(`data/terrain/parches/${id}.json`, "utf8") as string);
  const b = fs().readFileSync(`data/terrain/parches/${id}.bin`) as Uint8Array;
  return { ...ficha, datos: new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) };
}

describe("con los mapas de verdad", () => {
  const casos = [
    { mundo: "tenerife-norte", parche: "teide", cima: [28.27269, -16.64227], minimo: 3690, antes: 3660 },
    /*
     * De los roques, el asiento: la roca la pone su modelo, y el parche baja
     * doce metros debajo de ella. Ver «el asiento de los roques», abajo.
     */
    { mundo: "gran-canaria", parche: "roque-nublo", cima: [27.97074, -15.61264], minimo: 1715, antes: 1700 },
    { mundo: "la-gomera", parche: "roque-agando", cima: [28.10521, -17.2135], minimo: 1180, antes: 1061 },
    // El río al pie de la central: va a ciento y pico metros, y el
    // horizonte lo ponía a ciento ochenta.
    { mundo: "guarani", parche: "itaipu", cima: [-25.4095, -54.5878], maximo: 130, antes: 170 },
    // Las ruinas de Trinidad, en su loma a 159 m: el horizonte las bajaba.
    { mundo: "encarnacion", parche: "trinidad", cima: [-27.132, -55.702], minimo: 157, antes: 150 },
    { mundo: "pettirossi", parche: "trinidad", cima: [-27.132, -55.702], minimo: 157, antes: 158 },
  ] as const;
  for (const c of casos)
    it(`${c.parche} desde ${c.mundo}`, () => {
      const m = leerMapa(`${c.mundo}-lejos`);
      const { aGrados, aMetros } = proyeccion(m.lat, m.lon);
      const rej: RejillaDelHorizonte = {
        lado: m.n,
        paso: m.tamano / (m.n - 1),
        mitad: m.tamano / 2,
        cota: (f, col) => m.datos[Math.min(m.n - 1, f) * m.n + Math.min(m.n - 1, col)]!,
        dibujable: () => true,
      };
      const r = refinarElHorizonte(rej, [leerParche(c.parche)], aGrados, aMetros);
      const { x, z } = aMetros(c.cima[0], c.cima[1]);
      // Lo de antes: el horizonte solo, interpolado.
      const gx = (x + rej.mitad) / rej.paso;
      const gz = (z + rej.mitad) / rej.paso;
      const x0 = Math.floor(gx);
      const z0 = Math.floor(gz);
      const tx = gx - x0;
      const tz = gz - z0;
      const antes =
        (rej.cota(z0, x0) * (1 - tx) + rej.cota(z0, x0 + 1) * tx) * (1 - tz) +
        (rej.cota(z0 + 1, x0) * (1 - tx) + rej.cota(z0 + 1, x0 + 1) * tx) * tz;
      const ahora = r.cota(x, z);
      expect(ahora).not.toBeNull();
      if ("minimo" in c) {
        expect(antes).toBeLessThan(c.antes);
        expect(ahora!).toBeGreaterThan(c.minimo);
      } else {
        expect(antes).toBeGreaterThan(c.antes);
        expect(ahora!).toBeLessThan(c.maximo);
      }
    });
});

/*
 * **El asiento de los roques.** El Roque Nublo y el de Agando llevan modelo,
 * sacado del mismo MDT05 que su parche por encima de una cota y afinado en la
 * cumbre y las paredes. Si el parche llevara la roca también, serían dos: la
 * del parche asomando por donde el modelo no llega, y las dos turnándose por
 * el fondo de profundidad donde coinciden. Así que el modelo pone la roca y el
 * parche se aparta debajo al dibujarlo (`asentar`): la pieza del modelo queda
 * por encima del suelo dibujado, y la faja que baja de ella, por debajo.
 */
describe("el asiento de los roques", () => {
  const casos = [
    { sitio: "agando", parche: "roque-agando" },
    { sitio: "nublo", parche: "roque-nublo" },
  ] as const;
  const catalogo = JSON.parse(fs().readFileSync("data/sitios/sitios.json", "utf8") as string) as {
    sitios: { id: string; lat: number; lon: number; giro: number; cota: number | null }[];
  };
  for (const c of casos)
    it(`${c.sitio}: la roca, del modelo; el suelo, del parche`, async () => {
      const ficha = catalogo.sitios.find((s) => s.id === c.sitio)!;
      expect(ficha.giro).toBe(0);
      expect(ficha.cota).not.toBeNull();
      const parche = leerParche(c.parche);
      const asiento = parche.asientos!.find((a) => a.sitio === c.sitio)!;
      const b = fs().readFileSync(`public/assets/sitios/${c.sitio}.glb`) as Uint8Array;
      const escena = (
        await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, "")
      ).scene;
      escena.updateMatrixWorld(true);
      const k = Math.cos(ficha.lat * RAD);
      const pieza: number[] = [];
      const faja: number[] = [];
      escena.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh || /^bulto/i.test(m.name)) return;
        const pos = (m.geometry as BufferGeometry).getAttribute("position");
        const e = m.matrixWorld.elements;
        for (let i = 0; i < pos.count; i++) {
          const px = pos.getX(i);
          const py = pos.getY(i);
          const pz = pos.getZ(i);
          const x = e[0]! * px + e[4]! * py + e[8]! * pz + e[12]!;
          const y = e[1]! * px + e[5]! * py + e[9]! * pz + e[13]! + ficha.cota!;
          const z = e[2]! * px + e[6]! * py + e[10]! * pz + e[14]!;
          const la = ficha.lat - z / (R * RAD);
          const lo = ficha.lon + x / (R * RAD * k);
          const medido = cotaDelParche(parche, la, lo)!;
          const suelo = medido - asentar(medido, la, lo, parche.asientos);
          (y >= asiento.corte ? pieza : faja).push(y - suelo);
        }
      });
      pieza.sort((a, b) => a - b);
      faja.sort((a, b) => a - b);
      // Nueve de cada diez nudos de la roca, a cinco metros o más del suelo.
      expect(pieza[Math.floor(pieza.length * 0.1)]!).toBeGreaterThan(5);
      // Y la faja, debajo: nueve de cada diez nudos, bajo tierra.
      expect(faja[Math.floor(faja.length * 0.9)]!).toBeLessThan(0);
    });
});

/*
 * **El asiento del Monday, y que es solo del dibujo.** El modelo de los
 * Saltos del Monday trae su suelo hasta los 290 m —el río a su cota, las
 * paredes y la caída de cuarenta metros—, y el parche de Itaipú, a treinta
 * metros por muestra, deja la caída en una rampa que asomaba por el pozo. Su
 * asiento baja el dibujo cuarenta y cinco metros en 220 m y lo devuelve a los
 * 300. La cota que se pisa —y la que mira la ventanilla— no se mueve.
 */
describe("el asiento del Monday, en el parche de Itaipú", () => {
  const m = leerMapa("guarani-lejos");
  const { aGrados, aMetros } = proyeccion(m.lat, m.lon);
  const rej: RejillaDelHorizonte = {
    lado: m.n,
    paso: m.tamano / (m.n - 1),
    mitad: m.tamano / 2,
    cota: (f, col) => m.datos[Math.min(m.n - 1, f) * m.n + Math.min(m.n - 1, col)]!,
    dibujable: () => true,
  };
  const r = refinarElHorizonte(rej, [leerParche("itaipu")], aGrados, aMetros);
  const p = r.parches[0]!;
  const enLaRejilla = (lat: number, lon: number, cual: Float32Array): number => {
    const { x, z } = aMetros(lat, lon);
    const i = Math.round(((z + rej.mitad) / rej.paso - p.f0) * p.s);
    const j = Math.round(((x + rej.mitad) / rej.paso - p.c0) * p.s);
    return cual[i * p.columnas + j]!;
  };
  const monday = { lat: -25.5627515, lon: -54.6323698 };

  it("en los saltos, el dibujo baja cuarenta y cinco metros y lo que se pisa no", () => {
    const pisado = enLaRejilla(monday.lat, monday.lon, p.alturas);
    const dibujado = enLaRejilla(monday.lat, monday.lon, p.dibujadas);
    expect(pisado - dibujado).toBeCloseTo(45, 0);
    // Lo que se pisa es lo medido: en el origen, el borde del salto, a unos 150 m.
    expect(pisado).toBeGreaterThan(140);
  });

  it("y a cuatrocientos metros ya no se aparta nada", () => {
    const lejos = { lat: monday.lat + 400 / (R * RAD), lon: monday.lon };
    expect(enLaRejilla(lejos.lat, lejos.lon, p.dibujadas)).toBeCloseTo(enLaRejilla(lejos.lat, lejos.lon, p.alturas), 5);
  });

  it("y los roques siguen con el suyo de doce", () => {
    const nublo = leerParche("roque-nublo");
    const a = nublo.asientos![0]!;
    expect(asentar(1800, a.lat, a.lon, nublo.asientos)).toBeCloseTo(12, 5);
    expect(asentar(1600, a.lat, a.lon, nublo.asientos)).toBe(0);
  });
});
