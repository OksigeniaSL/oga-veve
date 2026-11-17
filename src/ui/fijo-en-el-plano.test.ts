/**
 * El fijo de dos radiales en el plano del final (H26h): que se dibuje lo que
 * se vio en el plano en vuelo —las dos rayas con su número, la cruz y el
 * avión—, con el encuadre del fijo y no el del aeródromo, y que los números no
 * se pisen ni pisen la cruz ni el avión.
 */

import { describe, expect, it } from "vitest";
import { sePisan, type Caja } from "./carta/rotulos";
import { ANCHO_DEL_PLANO, dibujarElFijo, encajeDelFijo, type FijoEnElPlano } from "./fijo-en-el-plano";
import { plano } from "./hangar";
import { scenarioById } from "../world/scenarios";

const MILLA = 1852;
const GRADO = Math.PI / 180;
const desde = (p: readonly [number, number], rumbo: number, m: number): [number, number] => [
  p[0] + Math.sin(rumbo * GRADO) * m,
  p[1] + Math.cos(rumbo * GRADO) * m,
];

/*
 * Como en Fuerteventura con el alisio y tarde: FTV en casa, LTE a treinta y
 * cuatro millas al norte; la primera raya, el 099 verdadero de FTV; el avión
 * vira hacia LTE, y la cruz se queda a milla y pico detrás, en la primera
 * raya.
 */
const FTV: [number, number] = [0, 0];
const LTE: [number, number] = [12_000, 62_000];
const cruz = desde(FTV, 99, 10 * MILLA);
const avion = desde(cruz, 20, 1.32 * MILLA);
const traza: [number, number][] = [];
for (let i = 0; i <= 30; i++) traza.push(desde(desde(FTV, 99, 10.8 * MILLA), 279, (i / 30) * 0.8 * MILLA));
for (let i = 1; i <= 30; i++) traza.push(desde(traza[30]!, 20, (i / 30) * 1.6 * MILLA));
const rumboDeLte = (Math.atan2(cruz[0] - LTE[0], cruz[1] - LTE[1]) * 180) / Math.PI;
const fijo: FijoEnElPlano = {
  rayas: [
    { desde: FTV, hasta: desde(FTV, 99, 13.5 * MILLA), rotulo: "R-102 FTV", corto: "R-102" },
    {
      desde: LTE,
      hasta: desde(LTE, rumboDeLte, 1.35 * Math.hypot(cruz[0] - LTE[0], cruz[1] - LTE[1])),
      rotulo: "R-192 LTE",
      corto: "R-192",
    },
  ],
  cruz,
  avion,
  tolerancia: 0.74 * MILLA,
};

describe("el fijo en el plano del final", () => {
  it("encuadra la traza, la cruz y el avión, y no las radios", () => {
    const e = encajeDelFijo(fijo, traza);
    for (const [x, y] of [cruz, avion, ...traza]) {
      expect(Math.abs(x - e.cx)).toBeLessThanOrEqual(e.lado / 2 + 1);
      expect(Math.abs(y - e.cy)).toBeLessThanOrEqual(e.lado / 2 + 1);
    }
    // Las radios, a diez y treinta millas, fuera: si no, la cruz y el avión serían un punto.
    expect(e.lado).toBeLessThan(5 * MILLA);
    // Y lo que da el VOR, como mucho la sexta parte: una cruz buena cae dentro de su aro.
    expect(e.lado).toBeGreaterThanOrEqual(6 * fijo.tolerancia);
    expect(Math.abs(FTV[0] - e.cx)).toBeGreaterThan(e.lado);
  });

  it("dibuja las dos rayas, la cruz, el avión y los dos números, sin pisarse", () => {
    const e = encajeDelFijo(fijo, traza);
    const v = e.lado * 1.15;
    const ancho = (v * 5) / 3;
    const vb = { x: e.cx - ancho / 2, y: -e.cy - v / 2, ancho, alto: v };
    const svg = dibujarElFijo(fijo, traza, vb);
    expect(svg.match(/class="plano__radial"/g)).toHaveLength(2);
    expect(svg).toContain('class="plano__cruz"');
    expect(svg).toContain('class="plano__avion"');
    const textos = [
      ...svg.matchAll(/<text[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)">([^<]+)<\/text>/g),
    ];
    expect(textos.map((t) => t[4])).toEqual(["R-102 FTV", "R-192 LTE"]);
    // En píxeles del plano: dentro, y sin pisarse ni pisar la cruz ni el avión.
    const k = ancho / ANCHO_DEL_PLANO;
    const enPx = (x: number, y: number): [number, number] => [(x - vb.x) / k, (y - vb.y) / k];
    const cajas: Caja[] = textos.map((t) => {
      const [cx, cy] = enPx(Number(t[1]), Number(t[2]));
      return { cx, cy, w: t[4]!.length * 0.56 * 16, h: 16, giro: (Number(t[3]) * Math.PI) / 180 };
    });
    for (const c of cajas) {
      expect(c.cx).toBeGreaterThan(0);
      expect(c.cx).toBeLessThan(ANCHO_DEL_PLANO);
      expect(c.cy).toBeGreaterThan(0);
      expect(c.cy).toBeLessThan(v / k);
    }
    expect(sePisan(cajas[0]!, cajas[1]!)).toBe(false);
    for (const [x, y] of [cruz, avion]) {
      const [cx, cy] = enPx(x, -y);
      for (const c of cajas) expect(sePisan(c, { cx, cy, w: 20, h: 20 })).toBe(false);
    }
    // Y la cruz tarde, apartada del avión lo que se ve sin buscarlo.
    const [ax, ay] = enPx(avion[0], -avion[1]);
    const [kx, ky] = enPx(cruz[0], -cruz[1]);
    expect(Math.hypot(ax - kx, ay - ky)).toBeGreaterThan(40);
  });

  it("y el panel del final lo lleva, con el encuadre del fijo", () => {
    const sitio = scenarioById("fuerteventura");
    const svg = plano(sitio, 0, traza, [], fijo);
    expect(svg).toContain("plano__fijo");
    expect(svg).toContain("plano__traza");
    const [x, y, w, h] = svg.match(/viewBox="([^"]+)"/)![1]!.split(" ").map(Number) as [number, number, number, number];
    for (const [px, py] of [cruz, avion]) {
      expect(px).toBeGreaterThan(x);
      expect(px).toBeLessThan(x + w);
      expect(-py).toBeGreaterThan(y);
      expect(-py).toBeLessThan(y + h);
    }
    // Sin fijo, el de siempre.
    expect(plano(sitio, 0, traza)).not.toContain("plano__fijo");
  });
});
