/**
 * **La hoja de carga, dibujada**: lo que dice cuando el plan no cabe en los
 * depósitos. Ver `ui/hoja-de-carga.ts` y el ADR 0019, enmienda H38c.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import { aircraftById, conCentrado, conMasa } from "../flight/aircraft";
import { loQueCabe } from "../flight/combustible";
import { desplazamientoDelCentrado } from "../flight/centrado";
import { compensadorDeDespegue } from "../flight/compensador-de-despegue";
import { hojaDeSuFicha, MALETA, masaSinCombustibleDeLaHoja, type Hoja } from "../flight/hoja-de-carga";
import { setLocale } from "../i18n";
import {
  amarrarEnLaHoja,
  centroDeLaHoja,
  conGente,
  hojaDelPeldano,
  llevaCentrado,
  pasarEnLaHoja,
  tocarAsiento,
  tocarBodega,
  veredicto,
  vistaDeLaHoja,
  type VueloDeLaHoja,
} from "./hoja-de-carga";

const vuelo = (id: string, delPlan: number, peldano: VueloDeLaHoja["peldano"]): VueloDeLaHoja => {
  const avion = aircraftById(id);
  return {
    avion,
    hoja: hojaDeSuFicha(avion),
    delPlan,
    tora: 3000,
    aire: { temp: 15, qnh: 1013, cota: 0, superficie: "asfalto" },
    peldano,
  };
};

/*
 * `setLocale` le pone el idioma a la página, y aquí no hay página: se le da una
 * de mentira para ponerlo, como en `pie-de-oksigenia.test.ts`.
 */
beforeAll(() => {
  vi.stubGlobal("document", { documentElement: {} });
  setLocale("es-PY");
  vi.unstubAllGlobals();
});

describe("cuando el plan no cabe en los depósitos", () => {
  it("no sale: el sello ámbar y el arreglo es otro destino, en todos los peldaños", () => {
    const a = aircraftById("jaz-40");
    for (const peldano of ["dibujo", "palabra", "cifra", "cabina"] as const) {
      const v = vuelo("jaz-40", loQueCabe(a) + 35, peldano);
      expect(veredicto(v).pesada.llega).toBe(false);
      const html = vistaDeLaHoja(v);
      expect(html, peldano).toContain("hoja__veredicto--no");
      expect(html, peldano).toContain('data-pantalla="adonde"');
      // Ni bajar gente ni dejar de llenar lo arreglan.
      expect(html, peldano).not.toContain("data-hoja-quitar");
      expect(html, peldano).not.toContain('data-hoja-llenos="0"');
    }
  });

  it("y lo dice como lo que es: no llega con la reserva", () => {
    const a = aircraftById("jaz-40");
    expect(vistaDeLaHoja(vuelo("jaz-40", loQueCabe(a) + 35, "palabra"))).toContain("No llega");
    expect(vistaDeLaHoja(vuelo("jaz-40", loQueCabe(a) + 35, "cifra"))).toContain("No llega con la reserva");
  });

  it("con lo que cabe, como siempre", () => {
    const a = aircraftById("jaz-40");
    const v = vuelo("jaz-40", loQueCabe(a) - 60, "cifra");
    expect(veredicto(v).pesada.llega).toBe(true);
    expect(vistaDeLaHoja(v)).not.toContain("No llega");
  });
});

/*
 * **El centrado, en la hoja** (#91, ADR 0033): desde Taguató, en el 172, la
 * hoja enseña dónde va cada uno y el punto del centro de gravedad en la
 * envolvente de su manual.
 */
describe("dónde va cada uno", () => {
  const avion = aircraftById("jaz-20");
  const del172 = (hoja: Hoja, peldano: VueloDeLaHoja["peldano"] = "cifra"): VueloDeLaHoja => ({
    ...vuelo("jaz-20", 60, peldano),
    hoja,
  });
  const punto = (html: string): { x: number; y: number; fuera: boolean } => {
    const m = /class="(hoja__punto[^"]*)" cx="([\d.]+)"\s+cy="([\d.]+)"/.exec(html);
    if (!m) throw new Error("no hay punto");
    return { x: Number(m[2]), y: Number(m[3]), fuera: m[1]!.includes("hoja__punto--fuera") };
  };
  const simbolo = (html: string): number =>
    Number(/class="hoja__cg[^"]*"\s+style="left: ([\d.]+)%/.exec(html)?.[1]);

  it("solo desde Taguató y en el avión con hoja de centrado", () => {
    expect(llevaCentrado(avion, "dibujo")).toBe(false);
    expect(llevaCentrado(avion, "palabra")).toBe(false);
    expect(llevaCentrado(avion, "cifra")).toBe(true);
    expect(llevaCentrado(avion, "cabina")).toBe(true);
    expect(llevaCentrado(aircraftById("jaz-60"), "cifra")).toBe(false);
    expect(vistaDeLaHoja(del172(hojaDeSuFicha(avion), "palabra"))).not.toContain("hoja__centrado");
    expect(vistaDeLaHoja(vuelo("jaz-60", 300, "cifra"))).not.toContain("hoja__centrado");
    const html = vistaDeLaHoja(del172(hojaDeSuFicha(avion)));
    expect(html).toContain("hoja__centrado");
    // Con la carga de su ficha, dentro y en verde.
    expect(punto(html).fuera).toBe(false);
    expect(html).toContain("hoja__veredicto--bien");
  });

  it("el punto se mueve al pasar a alguien de delante a atrás", () => {
    const antes = hojaDeSuFicha(avion);
    const html1 = vistaDeLaHoja(del172(antes));
    // Un toque en el pasajero de delante, y pasa a la fila de atrás.
    const despues = tocarAsiento(avion, antes, 0, 0);
    expect(despues.reparto?.filas).toEqual([0, 1]);
    expect(despues.pasajeros).toBe(antes.pasajeros);
    const html2 = vistaDeLaHoja(del172(despues));
    // En la envolvente, hacia la cola y a la misma altura: pesa lo mismo.
    expect(punto(html2).x).toBeGreaterThan(punto(html1).x + 10);
    expect(punto(html2).y).toBeCloseTo(punto(html1).y, 5);
    // En el avión dibujado, el símbolo se corre hacia la cola.
    expect(simbolo(html2)).toBeGreaterThan(simbolo(html1));
    // Y se ve ir: el punto sale de donde estaba.
    expect(html2).toContain("hoja__punto--mueve");
    expect(html2).toContain("hoja__cg--mueve");
    // Los 7,9 cm del ADR 0033.
    const c1 = centroDeLaHoja(del172(antes), veredicto(del172(antes)).pesada)!;
    const c2 = centroDeLaHoja(del172(despues), veredicto(del172(despues)).pesada)!;
    expect(c2.cg.brazo - c1.cg.brazo).toBeCloseTo(0.079, 2);
    // Y otro toque en el de atrás lo devuelve adelante.
    expect(tocarAsiento(avion, despues, 1, 0).reparto?.filas).toEqual([1, 0]);
  });

  it("las maletas van a la bodega y pesan", () => {
    let h = hojaDeSuFicha(avion);
    h = tocarBodega(avion, h, 1, 1);
    h = tocarBodega(avion, h, 1, 1);
    expect(h.reparto?.bodegas).toEqual([0, 2 * MALETA]);
    expect(veredicto(del172(h)).pesada.sinCombustible).toBe(
      veredicto(del172(hojaDeSuFicha(avion))).pesada.sinCombustible + 2 * MALETA,
    );
    // Una tercera en la bodega 2 pasa de su rótulo, 50 lb: se pinta en ámbar.
    expect(vistaDeLaHoja(del172(h))).not.toContain("hoja__maleta--demas");
    const tres = vistaDeLaHoja(del172(tocarBodega(avion, h, 1, 1)));
    expect(tres).toContain("hoja__maleta--demas");
    // Y se dice, con su arreglo: el centro sigue en su zona, pero el piso de la bodega no es para eso.
    expect(tres).toContain("hoja__veredicto--no");
    expect(tres).toContain("La bodega 2 admite 23 kg y lleva 33 kg");
    expect(tres).toContain('data-hoja-maleta="1,-1"');
    expect(tocarBodega(avion, tocarBodega(avion, h, 1, -1), 1, -1).reparto?.bodegas).toEqual([0, 0]);
  });

  it("las maletas se amarran con un toque, y la cinta se ve encima (H38g)", () => {
    // Sin maletas no hay nada que amarrar, y el toque no sale.
    expect(vistaDeLaHoja(del172(hojaDeSuFicha(avion)))).not.toContain("data-hoja-amarre");
    const h = tocarBodega(avion, hojaDeSuFicha(avion), 0, 1);
    const suelta = vistaDeLaHoja(del172(h));
    expect(suelta).toContain('data-hoja-amarre="1"');
    expect(suelta).not.toContain("hoja__maletas--amarradas");
    const atada = amarrarEnLaHoja(avion, h, true);
    expect(atada.reparto?.amarradas).toEqual([true, true]);
    const html = vistaDeLaHoja(del172(atada));
    expect(html).toContain('data-hoja-amarre="0"');
    expect(html).toContain("hoja__maletas--amarradas");
    // Amarrar no mueve el centro, y el amarre sobrevive a otra maleta y a otro asiento.
    const c1 = centroDeLaHoja(del172(h), veredicto(del172(h)).pesada)!;
    const c2 = centroDeLaHoja(del172(atada), veredicto(del172(atada)).pesada)!;
    expect(c2.cg.brazo).toBe(c1.cg.brazo);
    expect(tocarBodega(avion, atada, 0, 1).reparto?.amarradas).toEqual([true, true]);
    expect(tocarAsiento(avion, atada, 1, 0).reparto?.amarradas).toEqual([true, true]);
    expect(amarrarEnLaHoja(avion, atada, false).reparto?.amarradas).toEqual([false, false]);
  });

  it("fuera de la zona se ve en ámbar y se dice con calma, con su arreglo", () => {
    // Quien pilota solo, dos atrás y tres maletas en la bodega 2.
    const h: Hoja = { pasajeros: 2, llenos: false, reparto: { filas: [0, 2], bodegas: [0, 3 * MALETA] } };
    const v = del172(h);
    expect(centroDeLaHoja(v, veredicto(v).pesada)?.donde).toBe("detras");
    // No pesa de más ni le falta pista: es solo dónde está.
    expect(veredicto(v).pesada.cabe).toBe(true);
    expect(veredicto(v).cabePista).toBe(true);
    const html = vistaDeLaHoja(v);
    expect(punto(html).fuera).toBe(true);
    expect(html).toContain("hoja__cg--fuera");
    expect(html).toContain("hoja__veredicto--no");
    expect(html).toContain("Así no sale bien");
    // El arreglo: pasar adelante al de atrás, que delante hay sitio.
    expect(html).toContain('data-hoja-pasar="1,0"');
    expect(pasarEnLaHoja(avion, h, 1, 0).reparto?.filas).toEqual([1, 1]);
    /*
     * Y sin nadie atrás a quien pasar, sacar una maleta de la bodega de más
     * atrás: quien pilota solo con las dos bodegas a tope. Con alguien
     * delante, el 172 llega antes al peso máximo que al límite trasero.
     */
    const maletas: Hoja = { pasajeros: 0, llenos: false, reparto: { filas: [0, 0], bodegas: [6 * MALETA, 6 * MALETA] } };
    const vMaletas = del172(maletas);
    expect(centroDeLaHoja(vMaletas, veredicto(vMaletas).pesada)?.donde).toBe("detras");
    expect(veredicto(vMaletas).pesada.cabe).toBe(true);
    expect(vistaDeLaHoja(vMaletas)).toContain('data-hoja-maleta="1,-1"');
  });

  it("el reparto elegido llega al vuelo: al modelo y a la marca del compensador", () => {
    const comb = 60;
    const ficha = hojaDeSuFicha(avion);
    const atras = tocarAsiento(avion, ficha, 0, 0);
    // La hoja que vuela es la del peldaño: en Taguató lleva el reparto; en Tukã, no.
    expect(hojaDelPeldano(avion, atras, "cifra").reparto?.filas).toEqual([0, 1]);
    expect(hojaDelPeldano(avion, atras, "palabra").reparto).toBeUndefined();
    // Lo que `Game.centradoDeAhora` le pasa a `ponerCentrado`.
    const dx = desplazamientoDelCentrado(avion, atras.pasajeros, comb, atras.reparto);
    expect(dx).toBeCloseTo(0.079, 2);
    expect(desplazamientoDelCentrado(avion, ficha.pasajeros, comb, ficha.reparto)).toBe(0);
    // Y lo que `Game.avionConPeso` le da al compensador de despegue: la marca baja.
    const masa = (h: Hoja): number => masaSinCombustibleDeLaHoja(avion, h.pasajeros, h.reparto) + comb;
    const marca = (h: Hoja, d: number): number =>
      compensadorDeDespegue(conCentrado(conMasa(avion, masa(h)), d)).marca;
    expect(marca(ficha, 0) - marca(atras, dx)).toBeGreaterThan(0.1);
    // El deslizador cambia cuántos van sin deshacer quién va atrás.
    expect(conGente(avion, atras, 2).reparto?.filas).toEqual([1, 1]);
    expect(conGente(avion, atras, 0).reparto?.filas).toEqual([0, 0]);
  });
});
