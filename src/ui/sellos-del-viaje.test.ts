/**
 * El cuaderno de viaje: que se guarda solo qué sellos se ganaron, que lo
 * ganado no se pierde, y que la página enseña cada sello con su dibujo y un
 * hueco por cada uno que falta, sin letras dentro. Ver
 * `flight/sellos-del-viaje.ts` y `ui/sellos-del-viaje.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { escribirYa, leerProgreso, olvidar, ponerProgreso } from "../datos/guardado";
import { ganarSellosDelViaje, leerSellosDelViaje, SELLOS_DEL_VIAJE } from "../flight/sellos-del-viaje";
import { islaDe } from "./sellos";
import { dibujoDelSelloDelViaje, paginaDelViaje } from "./sellos-del-viaje";

const memoria = new Map<string, string>();
const almacen: Storage = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => void memoria.set(k, String(v)),
  removeItem: (k) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};
vi.stubGlobal("localStorage", almacen);

beforeEach(() => {
  memoria.clear();
  olvidar();
});

describe("el cuaderno de viaje, guardado", () => {
  it("apunta lo visto, devuelve lo nuevo y no pierde nada de un vuelo al siguiente", () => {
    expect(leerSellosDelViaje()).toEqual([]);
    expect(ganarSellosDelViaje(["teide", "motor"])).toEqual(["motor", "teide"]);
    expect(ganarSellosDelViaje(["motor", "mazo"])).toEqual(["mazo"]);
    // En el orden de la página, que es el del vuelo, y una vez cada uno.
    expect(leerSellosDelViaje()).toEqual(["motor", "teide", "mazo"]);
    expect(ganarSellosDelViaje([])).toEqual([]);
    expect(leerSellosDelViaje()).toEqual(["motor", "teide", "mazo"]);
    escribirYa();
  });

  it("guarda solo qué sellos, y aguanta un guardado roto", () => {
    ganarSellosDelViaje(["ala"]);
    expect(leerProgreso("viaje.sellos")).toEqual(["ala"]);
    ponerProgreso("viaje.sellos", ["ala", "no-existe", 7, null]);
    expect(leerSellosDelViaje()).toEqual(["ala"]);
    ponerProgreso("viaje.sellos", "basura");
    expect(leerSellosDelViaje()).toEqual([]);
  });
});

describe("la página del viaje", () => {
  it("cada sitio en el orden del vuelo: los ganados con su dibujo y los que faltan, un hueco", () => {
    const html = paginaDelViaje(["motor", "teide", "mazo"], ["mazo"]);
    expect(html.match(/class="viaje__sitio/g)).toHaveLength(SELLOS_DEL_VIAJE.length);
    expect(html.match(/viaje__sitio--hueco/g)).toHaveLength(SELLOS_DEL_VIAJE.length - 3);
    expect(html.match(/data-sello-viaje="/g)).toHaveLength(3);
    // Solo el nuevo se estampa.
    expect(html.match(/viaje__sello--nuevo/g)).toHaveLength(1);
    // Con su nombre para quien no ve la pantalla, y la cuenta en la etiqueta del grupo.
    expect(html).toContain('aria-label="El Teide"');
    expect(html).toContain(`3 / ${SELLOS_DEL_VIAJE.length}`);
  });

  it("sin letras ni números dentro de los sellos: cada sello es su dibujo", () => {
    for (const s of SELLOS_DEL_VIAJE) {
      const svg = dibujoDelSelloDelViaje(s);
      expect(svg, s).not.toMatch(/<text/);
      expect(svg, s).toMatch(/<path|<circle/);
    }
  });

  it("La Gomera y La Palma con su costa de verdad, la de Natural Earth", () => {
    const gomera = islaDe(-17.248, 28.11);
    const palma = islaDe(-17.755, 28.626);
    expect(gomera?.length).toBeGreaterThan(10);
    expect(palma?.length).toBeGreaterThan(10);
    expect(gomera).not.toBe(palma);
    // La silueta entera está en el dibujo: tantos puntos como su costa.
    const puntos = (svg: string): number => Math.max(...[...svg.matchAll(/d="M([^"]+)Z"/g)].map((m) => m[1]!.split("L").length));
    expect(puntos(dibujoDelSelloDelViaje("gomera"))).toBe(gomera!.length);
    expect(puntos(dibujoDelSelloDelViaje("palma"))).toBe(palma!.length);
  });
});
