/**
 * Las bandadas: la uve con la física de la estela, el susto que las tira
 * hacia abajo, la térmica hasta donde llega y cada una en su sitio. Ver
 * `bandadas.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  Bandadas,
  CAIDA_DEL_SUSTO,
  CORREDOR,
  DISTANCIA_DE_SUSTO,
  bandadasDelCampo,
  enElCorredor,
  ordenDeLaUve,
  sitiosEnLaUve,
  type Bandada,
  type CampoConAves,
  type EstadoDeAve,
  type Entorno,
} from "./bandadas";
import { ATRAS_EN_LA_UVE, ESPECIES, RELEVO_EN_CABEZA, type Especie } from "./aves";
import { separacionDeTorbellinos } from "../flight/estela";

const especie = (id: string): Especie => ESPECIES.find((e) => e.id === id)!;

function bandada(e: Especie, cambios: Partial<Bandada> = {}): Bandada {
  return {
    id: `prueba:${e.id}`,
    campo: "prueba",
    especie: e,
    cuantas: 9,
    x: 0,
    z: 0,
    radioLargo: 1500,
    radioCorto: 600,
    giro: 30,
    altura: 60,
    suelo: 0,
    sentido: 1,
    semilla: 0.2,
    ...cambios,
  };
}

const llano = (): number => 0;

describe("la uve", () => {
  /*
   * La misma cuenta que la estela: de lado, la separación de los torbellinos
   * de un ala, π/4 de la envergadura; hacia atrás, una envergadura, que es lo
   * que midieron con GPS en los ibis (Portugal et al., Nature 2014).
   */
  it("cada ave va a π/4 de envergadura de lado y a una detrás de la de delante", () => {
    const b = 1.02;
    const sitios = sitiosEnLaUve(9, 0, b);
    const porRango = [...sitios].sort((p, q) => p.atras - q.atras);
    expect(porRango[0]).toEqual({ atras: 0, lado: 0 });
    for (const s of sitios) {
      const rango = Math.round(s.atras / (ATRAS_EN_LA_UVE * b));
      expect(Math.abs(s.lado)).toBeCloseTo(rango * separacionDeTorbellinos(b), 6);
    }
    // Los dos brazos, uno a cada lado.
    expect(sitios.filter((s) => s.lado < 0).length).toBe(4);
    expect(sitios.filter((s) => s.lado > 0).length).toBe(4);
  });

  it("los relevos son por parejas: cada uno cambia de sitio a dos y no pierde a nadie", () => {
    const antes = (n: number) => sitiosEnLaUve(11, n, 1);
    const cabezas = new Set<number>();
    for (let n = 1; n < 40; n++) {
      const a = antes(n - 1);
      const b = antes(n);
      const movidas = a.filter((s, i) => s.atras !== b[i]!.atras || s.lado !== b[i]!.lado);
      expect(movidas.length).toBe(2);
      const o = ordenDeLaUve(11, n);
      expect(new Set([o.cabeza, ...o.izquierda, ...o.derecha]).size).toBe(11);
      cabezas.add(o.cabeza);
    }
    // Con el tiempo, la cabeza la llevan varias.
    expect(cabezas.size).toBeGreaterThanOrEqual(3);
  });

  it("baten en fase con el sitio: donde batió la de delante", () => {
    const e = especie("cuervillo-de-canada");
    const bs = new Bandadas(llano);
    const b = bandada(e);
    const aves: EstadoDeAve[] = [];
    const t = RELEVO_EN_CABEZA * 3 + 20;
    bs.aves(b, t, aves);
    const sitios = sitiosEnLaUve(b.cuantas, 3, e.envergadura);
    for (let i = 0; i < b.cuantas; i++) {
      const esperada = (-2 * Math.PI * e.aleteo * sitios[i]!.atras) / e.velocidad;
      expect(aves[i]!.fase).toBeCloseTo(esperada, 6);
    }
  });
});

describe("el susto", () => {
  const e = especie("gaviota-patiamarilla");
  const b = bandada(e, { radioLargo: 90, radioCorto: 60, altura: 150 });

  it("con el avión encima, se tiran hacia abajo con las alas plegadas", () => {
    const bs = new Bandadas(llano);
    bs.poner([b]);
    const t0 = 100;
    const d = bs.dondeEsta(b, t0);
    const tranquilas: EstadoDeAve[] = [];
    bs.aves(b, t0 + 1.5, tranquilas);
    const yTranquilas = tranquilas.slice(0, b.cuantas).map((a) => a.y);
    bs.paso(t0, { x: d.x + DISTANCIA_DE_SUSTO * 0.5, y: d.y, z: d.z });
    expect(bs.sustoDe(b.id)).toBe(t0);
    const asustadas: EstadoDeAve[] = [];
    bs.aves(b, t0 + 1.5, asustadas);
    for (let i = 0; i < b.cuantas; i++) {
      expect(asustadas[i]!.y).toBeLessThan(yTranquilas[i]! - 5);
      expect(asustadas[i]!.y).toBeGreaterThan(yTranquilas[i]! - CAIDA_DEL_SUSTO - 1);
      expect(asustadas[i]!.pliegue).toBe(1);
    }
  });

  it("y no se vuelve a asustar por el reloj: solo si el avión se va y vuelve", () => {
    const bs = new Bandadas(llano);
    bs.poner([b]);
    const d = bs.dondeEsta(b, 0);
    const cerca = { x: d.x + 100, y: d.y, z: d.z };
    bs.paso(0, cerca);
    // Minutos con el avión cerca: el susto es el mismo.
    for (let t = 1; t < 300; t += 5) bs.paso(t, { ...cerca, ...bs.dondeEsta(b, t) });
    expect(bs.sustoDe(b.id)).toBe(0);
    // Se va lejos: se le pasa. Y al volver, otro susto.
    const lejos = bs.dondeEsta(b, 300);
    bs.paso(300, { x: lejos.x + 5000, y: lejos.y, z: lejos.z });
    expect(bs.sustoDe(b.id)).toBeNull();
    const aqui = bs.dondeEsta(b, 310);
    bs.paso(310, { x: aqui.x + 50, y: aqui.y, z: aqui.z });
    expect(bs.sustoDe(b.id)).toBe(310);
  });
});

describe("la térmica", () => {
  it("suben en corro, juntas, sin pasar del techo ni bajar del suelo de la térmica", () => {
    const e = especie("cuervo-negro");
    const b = bandada(e, { cuantas: 12, altura: 700, radioLargo: 1800 });
    const bs = new Bandadas(llano);
    const aves: EstadoDeAve[] = [];
    let subiendo = 0;
    for (let t = 0; t < 3000; t += 37) {
      bs.aves(b, t, aves);
      const corro = bs.dondeEsta(b, t);
      const enElCorro = Math.hypot(corro.x - b.x, corro.z - b.z) < 1;
      if (enElCorro) subiendo++;
      const alturas = aves.slice(0, b.cuantas).map((a) => a.y);
      for (let i = 0; i < b.cuantas; i++) {
        const a = aves[i]!;
        expect(a.y).toBeGreaterThanOrEqual(e.alturas[0] - 40);
        expect(a.y).toBeLessThanOrEqual(b.altura + 1);
        if (!enElCorro) continue;
        // En el corro: cada una en su vuelta, con el ala inclinada.
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThanOrEqual(61);
        expect(Math.abs(a.alabeo)).toBeGreaterThan(0.1);
      }
      // Y juntas: un puñado de aves a alturas parecidas, no una por piso.
      expect(Math.max(...alturas) - Math.min(...alturas)).toBeLessThanOrEqual(121);
    }
    expect(subiendo).toBeGreaterThan(5);
  });
});

describe("dónde se ponen", () => {
  /*
   * Un sitio de prueba: mar al oeste, tierra al este con una laguna, y la
   * pista norte-sur en la orilla.
   */
  const campo: CampoConAves = {
    id: "prueba",
    escenario: "pettirossi",
    region: "paraguay",
    x: 0,
    z: 0,
    rumbo: 0,
    largo: 3000,
  };
  const esAgua = (x: number, z: number): boolean =>
    x < -4000 || Math.hypot(x - 5000, z - 3000) < 900;
  const entorno = (calor: number): Entorno => ({
    suelo: (x, z) => (esAgua(x, z) ? 0 : 20),
    esAgua,
    calor,
    capa: 300 + 1700 * calor,
    mes: 6,
  });

  it("siempre igual para el mismo campo y el mismo día", () => {
    expect(bandadasDelCampo(campo, entorno(0.8))).toEqual(bandadasDelCampo(campo, entorno(0.8)));
  });

  it("ninguna en el corredor de la pista, que un aeropuerto mantiene limpio", () => {
    const bs = bandadasDelCampo(campo, entorno(0.8));
    expect(bs.length).toBeGreaterThan(8);
    for (const b of bs) expect(enElCorredor(campo, b.x, b.z), b.id).toBe(false);
    expect(CORREDOR.lado).toBeGreaterThan(500);
  });

  it("cada una a su altura, y las de agua junto al agua", () => {
    for (const b of bandadasDelCampo(campo, entorno(0.8))) {
      const [baja, alta] = b.especie.alturas;
      expect(b.altura, b.id).toBeGreaterThanOrEqual(baja);
      expect(b.altura, b.id).toBeLessThanOrEqual(alta);
      if (b.especie.habitat === "agua") {
        let agua = false;
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          if (esAgua(b.x + 450 * Math.sin(a), b.z - 450 * Math.cos(a))) agua = true;
        }
        expect(agua || esAgua(b.x, b.z), b.id).toBe(true);
      }
    }
  });

  it("sin calor no hay térmica, y con calor el techo es el de la capa que mezcla", () => {
    const frias = bandadasDelCampo(campo, entorno(0));
    expect(frias.some((b) => b.especie.forma === "termica")).toBe(false);
    const calientes = bandadasDelCampo(campo, entorno(0.8));
    const termicas = calientes.filter((b) => b.especie.forma === "termica");
    expect(termicas.length).toBeGreaterThan(0);
    for (const b of termicas) expect(b.altura).toBeLessThanOrEqual(0.8 * (300 + 1700 * 0.8));
  });
});
