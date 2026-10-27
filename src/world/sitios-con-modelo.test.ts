/**
 * **Que los sitios con modelo caigan sobre su foto, entren al acercarse y
 * salgan al alejarse.**
 *
 * - Que se colocan en el marco del suelo que los dibuja, y no con `dondeCae`:
 *   volando de Asunción a Ciudad del Este, Itaipú cae en el mapa de Guaraní,
 *   y con `dondeCae` desde casa quedaba a doscientos metros de su foto.
 * - Que se bajan dentro del alcance, se sueltan pasado el margen y no bailan
 *   en el borde.
 * - Que el ciclo entero funciona con un `.glb` de verdad —el de prueba—: se
 *   pone, se choca con su bulto, se suelta de la tarjeta y se vuelve a poner
 *   sin apuntar el bulto dos veces.
 * - Y que lo que diga el catálogo tiene su fichero y su línea en CREDITOS.md.
 */

import { describe, expect, it } from "vitest";
import type { BufferGeometry, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { enTeselas, LADO_DE_TESELA } from "./cobertura-de-teselas";
import { dondeCae } from "./entre-aerodromos";
import { glbDePrueba } from "./glb-de-prueba";
import { Obstaculos } from "./obstaculos";
import { SCENARIOS } from "./scenarios";
import {
  SITIOS,
  SUELTA,
  SitiosConModelo,
  dondeSeDibuja,
  enSuMarco,
  queToca,
  type FichaDeSitio,
} from "./sitios-con-modelo";
import { aPixelesDelIndice, marcoDeTeselas } from "./teselas-de-ortofoto";

const fs = () =>
  (
    globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
  ).process.getBuiltinModule("node:fs") as {
    readFileSync(ruta: string, codificacion: string): string;
    existsSync(ruta: string): boolean;
  };

const origenDe = (id: string) => SCENARIOS.find((e) => e.id === id)!.aerodrome!.origin;

/** Itaipú, la central: las coordenadas de Wikidata (Q244169). */
const ITAIPU = { lat: -25.40778, lon: -54.59 };

/** El Auditorio de Tenerife: las de Wikidata (Q28964). */
const AUDITORIO = { lat: 28.45607, lon: -16.25128 };

/** Cuántos metros hay entre donde se pone y donde lo pinta la foto de ese marco, a z16. */
function apartaDeSuFoto(origen: { lat: number; lon: number }, local: { x: number; z: number }, p: { lat: number; lon: number }) {
  const nivel = 16;
  const marco = marcoDeTeselas(origen, nivel, { x: 0, y: 0 });
  const dibujado = aPixelesDelIndice(marco, local.x, local.z);
  const real = enTeselas(p.lat, p.lon, nivel);
  const metrosPorPixel = (2 * Math.PI * 6378137 * Math.cos((p.lat * Math.PI) / 180)) / (LADO_DE_TESELA * 2 ** nivel);
  return Math.hypot(dibujado.x - real.x * LADO_DE_TESELA, dibujado.y - real.y * LADO_DE_TESELA) * metrosPorPixel;
}

describe("dónde se pone un sitio", () => {
  it("en el marco de casa, sobre su foto al metro; con `dondeCae`, a doscientos", () => {
    // De Asunción a Ciudad del Este, Itaipú cae fuera del mapa fino de Guaraní:
    // lo dibuja el horizonte de casa, en el marco de casa.
    const casa = origenDe("pettirossi");
    const puesto = dondeSeDibuja(ITAIPU, casa, []);
    expect(apartaDeSuFoto(casa, puesto, ITAIPU)).toBeLessThan(1);
    const conDondeCae = dondeCae(casa, ITAIPU);
    expect(Math.hypot(conDondeCae.x - puesto.x, conDondeCae.z - puesto.z)).toBeGreaterThan(150);
  });

  it("en el mapa de un vecino, en el marco del vecino corrido a su sitio", () => {
    // De Gran Canaria a Los Rodeos, el Auditorio está en el mapa fino de Los Rodeos.
    const casa = origenDe("gran-canaria");
    const tfn = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
    const origen = tfn.aerodrome!.origin;
    const vecino = { origen, desplazamiento: dondeCae(casa, origen), medioLado: tfn.size / 2 };
    const puesto = dondeSeDibuja(AUDITORIO, casa, [vecino]);
    // Lo que dibuja el vecino es su foto en su marco, corrida: se deshace el corrimiento.
    const local = { x: puesto.x - vecino.desplazamiento.x, z: puesto.z - vecino.desplazamiento.z };
    expect(apartaDeSuFoto(origen, local, AUDITORIO)).toBeLessThan(1);
    // Y en el marco de casa caería a casi doscientos metros de su foto.
    const enCasa = enSuMarco(casa, AUDITORIO);
    expect(Math.hypot(enCasa.x - puesto.x, enCasa.z - puesto.z)).toBeGreaterThan(150);
  });

  it("fuera de los vecinos, en el de casa", () => {
    const casa = origenDe("pettirossi");
    const lejos = { origen: origenDe("encarnacion"), desplazamiento: dondeCae(casa, origenDe("encarnacion")), medioLado: 10_000 };
    expect(dondeSeDibuja(ITAIPU, casa, [lejos])).toEqual(enSuMarco(casa, ITAIPU));
  });
});

describe("cuándo se baja y cuándo se suelta", () => {
  it("dentro del alcance se baja; pasado el margen se suelta; en medio, nada", () => {
    expect(queToca("fuera", 9_000, 10_000)).toBe("bajar");
    expect(queToca("fuera", 11_000, 10_000)).toBe(null);
    expect(queToca("puesto", 11_000, 10_000)).toBe(null);
    expect(queToca("puesto", 10_000 * SUELTA + 1, 10_000)).toBe("soltar");
    expect(queToca("bajando", 10_000 * SUELTA + 1, 10_000)).toBe("soltar");
  });

  it("y uno roto no se vuelve a pedir", () => {
    expect(queToca("roto", 0, 10_000)).toBe(null);
  });
});

describe("el ciclo entero, con el .glb de prueba", () => {
  const casa = origenDe("tenerife-norte");
  const ficha: FichaDeSitio = {
    id: "prueba",
    nombre: "Sitio de prueba",
    lat: casa.lat + 0.05,
    lon: casa.lon,
    giro: 30,
    cota: null,
    alcance: 8_000,
    de: "prueba",
  };
  const glb = glbDePrueba(6_000);
  /** Sin red: se lee el `.glb` de la memoria, que es lo mismo que haría el cargador con lo bajado. */
  const leer = async () => (await new GLTFLoader().parseAsync(glb.slice().buffer, "")).scene;
  const url = "assets/sitios/prueba.glb";

  /** Espera a que se ponga: la lectura del `.glb` es asíncrona. */
  async function hastaQue(cond: () => boolean): Promise<void> {
    for (let i = 0; i < 200 && !cond(); i++) await new Promise((r) => setTimeout(r, 10));
  }

  it("se pone al acercarse, con su bulto en el índice y sus vértices de color", async () => {
    const bultos = new Obstaculos();
    const sitios = new SitiosConModelo({ casa, vecinos: [], suelo: () => 120, bultos, leer }, []);
    sitios.anadir(ficha, url);
    const [s] = sitios.estado();
    sitios.paso(1, s!.x + 20_000, s!.z);
    expect(sitios.estado()[0]!.estado).toBe("fuera");

    sitios.paso(1, s!.x + 2_000, s!.z);
    await hastaQue(() => sitios.estado()[0]!.estado === "puesto");
    const puesto = sitios.estado()[0]!;
    expect(puesto.estado).toBe("puesto");
    // Las cajas de dibujo, sin la del bulto: ése no se ve.
    expect(puesto.triangulos).toBeGreaterThan(5_000);
    expect(puesto.triangulos).toBeLessThan(6_100);
    expect(bultos.cuantos).toBe(1);
    // La torre del medio está en el origen, y se choca con ella; a su lado, no.
    expect(bultos.choca(s!.x, 120 + 60, s!.z)).toBe(true);
    expect(bultos.choca(s!.x, 120 + 200, s!.z)).toBe(false);
    const modelo = sitios.grupo.children[0]!;
    expect(modelo.position.y).toBe(120);
    let conColor = false;
    modelo.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) conColor ||= (m.material as { vertexColors?: boolean }).vertexColors === true;
    });
    expect(conColor).toBe(true);
  });

  it("se suelta al alejarse, de la escena y de la tarjeta, y vuelve sin repetir el bulto", async () => {
    const bultos = new Obstaculos();
    const sitios = new SitiosConModelo({ casa, vecinos: [], suelo: () => 0, bultos, leer }, []);
    sitios.anadir(ficha, url);
    const [s] = sitios.estado();
    sitios.paso(1, s!.x, s!.z);
    await hastaQue(() => sitios.estado()[0]!.estado === "puesto");
    const geometrias: BufferGeometry[] = [];
    sitios.grupo.traverse((o) => {
      if ((o as Mesh).isMesh) geometrias.push((o as Mesh).geometry);
    });
    let soltadas = 0;
    for (const g of geometrias) g.addEventListener("dispose", () => soltadas++);

    // En el margen, todavía no.
    sitios.paso(1, s!.x + ficha.alcance * 1.1, s!.z);
    expect(sitios.estado()[0]!.estado).toBe("puesto");
    sitios.paso(1, s!.x + ficha.alcance * SUELTA * 1.05, s!.z);
    expect(sitios.estado()[0]!.estado).toBe("fuera");
    expect(sitios.grupo.children.length).toBe(0);
    expect(soltadas).toBe(geometrias.length);

    sitios.paso(1, s!.x, s!.z);
    await hastaQue(() => sitios.estado()[0]!.estado === "puesto");
    expect(sitios.estado()[0]!.estado).toBe("puesto");
    expect(bultos.cuantos).toBe(1);
  });

  it("si el fichero no llega, se vuela sin él y no se vuelve a pedir", async () => {
    const roto = async () => (await new GLTFLoader().parseAsync(new ArrayBuffer(8), "")).scene;
    const sitios = new SitiosConModelo({ casa, vecinos: [], suelo: () => 0, bultos: null, leer: roto }, []);
    sitios.anadir(ficha, url);
    const [s] = sitios.estado();
    const aviso = console.warn;
    console.warn = () => {};
    try {
      sitios.paso(1, s!.x, s!.z);
      await hastaQue(() => sitios.estado()[0]!.estado === "roto");
    } finally {
      console.warn = aviso;
    }
    expect(sitios.estado()[0]!.estado).toBe("roto");
  });
});

describe("el catálogo", () => {
  const creditos = fs().readFileSync("CREDITOS.md", "utf8");

  it("cada sitio con su fichero, su línea en CREDITOS.md y su fuente", () => {
    for (const s of SITIOS) {
      expect(fs().existsSync(`public/assets/sitios/${s.id}.glb`), s.id).toBe(true);
      expect(creditos.includes(`assets/sitios/${s.id}.glb`), `${s.id} en CREDITOS.md`).toBe(true);
      expect(s.de.length, s.id).toBeGreaterThan(5);
    }
  });

  it("con datos que tienen sentido", () => {
    expect(new Set(SITIOS.map((s) => s.id)).size).toBe(SITIOS.length);
    for (const s of SITIOS) {
      expect(Math.abs(s.lat), s.id).toBeLessThanOrEqual(90);
      expect(Math.abs(s.lon), s.id).toBeLessThanOrEqual(180);
      expect(s.giro, s.id).toBeGreaterThanOrEqual(0);
      expect(s.giro, s.id).toBeLessThan(360);
      expect(s.alcance, s.id).toBeGreaterThan(0);
      expect(s.alcance, s.id).toBeLessThanOrEqual(80_000);
    }
  });
});
