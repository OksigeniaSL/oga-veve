/**
 * **El mapa de la ruta: las islas de verdad, y el avión donde va.** Que
 * las costas son las de Natural Earth y no óvalos (punto 292), que cada isla
 * tiene dentro lo que tiene dentro —el Teide, el Roque de los Muchachos,
 * Garajonay, Malpaso—, que todo cabe en la hoja sin estirarse y que el avión
 * se pinta en su sitio y mirando hacia donde va. Ver `mapa-de-la-ruta.ts`.
 */

import { describe, expect, it } from "vitest";
import { dondeCae } from "../world/entre-aerodromos";
import { DIBUJOS_DEL_PASAJE } from "./dibujos-del-pasaje";
import {
  ALTO_DEL_MAPA,
  ANCHO_DEL_MAPA,
  CANARIAS_DE_PONIENTE,
  enLaHoja,
  LA_PALMA,
  LOS_RODEOS,
  mapaPara,
  partirElCamino,
  transformDelAvion,
  type PuntoXZ,
} from "./mapa-de-la-ruta";
import { SILUETAS } from "./siluetas";

/** Si un punto cae dentro de un anillo, por el número de cruces. */
function dentro(p: PuntoXZ, anillo: readonly PuntoXZ[]): boolean {
  let si = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const a = anillo[i]!;
    const b = anillo[j]!;
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) si = !si;
  }
  return si;
}

const mapa = mapaPara(LOS_RODEOS);
const enElMundo = (lat: number, lon: number): PuntoXZ => dondeCae(LOS_RODEOS, { lat, lon });

describe("el mapa de la ruta", () => {
  it("las cuatro islas de poniente, con la costa de Natural Earth: ni óvalos ni círculos", () => {
    expect(mapa.islas).toHaveLength(4);
    const deNaturalEarth = SILUETAS.es.filter((a) =>
      a.some(([lon, lat]) => lon >= CANARIAS_DE_PONIENTE.oeste && lon <= CANARIAS_DE_PONIENTE.este && lat >= CANARIAS_DE_PONIENTE.sur && lat <= CANARIAS_DE_PONIENTE.norte),
    );
    expect(mapa.islas.map((i) => i.length)).toEqual(deNaturalEarth.map((a) => a.length));
    // Una costa tiene sus entrantes: ninguna isla con menos de quince puntos.
    for (const isla of mapa.islas) expect(isla.length).toBeGreaterThanOrEqual(15);
  });

  it("y cada isla tiene dentro lo que tiene dentro", () => {
    const cumbres: readonly [string, number, number][] = [
      ["el Teide, en Tenerife", 28.272, -16.642],
      ["el Roque de los Muchachos, en La Palma", 28.754, -17.885],
      ["Garajonay, en La Gomera", 28.103, -17.237],
      ["Malpaso, en El Hierro", 27.735, -18.03],
    ];
    for (const [que, lat, lon] of cumbres)
      expect(mapa.islas.filter((i) => dentro(enElMundo(lat, lon), i)), que).toHaveLength(1);
    // Y el mar entre ellas es mar.
    expect(mapa.islas.some((i) => dentro(enElMundo(28.3, -17.0), i))).toBe(false);
  });

  it("todo cabe en la hoja, en tres por dos y sin estirar", () => {
    const e = mapa.encuadre;
    expect(e.ancho / e.alto).toBeCloseTo(ANCHO_DEL_MAPA / ALTO_DEL_MAPA, 6);
    for (const isla of mapa.islas)
      for (const p of isla) {
        const [x, y] = enLaHoja(e, p);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(ANCHO_DEL_MAPA);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(ALTO_DEL_MAPA);
      }
    // Un kilómetro mide lo mismo de este a oeste que de norte a sur.
    expect(ANCHO_DEL_MAPA / e.ancho).toBeCloseTo(ALTO_DEL_MAPA / e.alto, 9);
  });

  it("el avión, donde está y mirando hacia donde va", () => {
    const e = mapa.encuadre;
    const tfn = enElMundo(LOS_RODEOS.lat, LOS_RODEOS.lon);
    const [x, y] = enLaHoja(e, tfn);
    expect(transformDelAvion(e, { ...tfn, rumbo: Math.PI / 2 })).toBe(`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(0)`);
    expect(transformDelAvion(e, { ...tfn, rumbo: 0 })).toContain("rotate(-90)");
    expect(transformDelAvion(e, { ...tfn, rumbo: Math.PI })).toContain("rotate(90)");
    // Y La Palma, al oeste y un poco al norte de Los Rodeos.
    const [px, py] = enLaHoja(e, enElMundo(LA_PALMA.lat, LA_PALMA.lon));
    expect(px).toBeLessThan(x - 250);
    expect(py).toBeLessThan(y);
  });

  it("el camino, partido por el avión: lo volado y lo que falta", () => {
    const camino = [
      { x: 0, z: 0 },
      { x: 10000, z: 0 },
      { x: 10000, z: 10000 },
    ];
    const { hecho, falta } = partirElCamino(camino, { x: 10300, z: 4000 });
    expect(hecho).toEqual([camino[0], camino[1], { x: 10000, z: 4000 }]);
    expect(falta).toEqual([{ x: 10000, z: 4000 }, camino[2]]);
    expect(partirElCamino(camino, null)).toEqual({ hecho: [], falta: camino });
  });

  it("y el dibujo de la ruta de la ventanita es este mapa, sin un óvalo", () => {
    const ruta = DIBUJOS_DEL_PASAJE.ruta;
    expect(ruta).not.toContain("<ellipse");
    expect(ruta.match(/class="mapa__isla"/g)).toHaveLength(4);
    expect(ruta).toContain('class="mapa__avion"');
  });
});
