import { describe, expect, it } from "vitest";
import { CADA_CUANTO_SE_APUNTA, CADA_CUANTO_SE_CATA, Libreta } from "./libreta";

/** Pasos de un sesentavo, como el bucle del juego. */
function volar(l: Libreta, segundos: number, enElAire: boolean): number {
  let apuntado = 0;
  const dt = 1 / 60;
  for (let t = 0; t < segundos; t += dt) {
    apuntado += l.contarElAire(dt, enElAire);
    l.catar(dt, 100, -200);
  }
  return apuntado;
}

describe("Libreta", () => {
  it("apunta las horas cada medio minuto en el aire, y no cada paso", () => {
    const l = new Libreta();
    expect(l.contarElAire(1, true)).toBe(0);
    expect(l.contarElAire(CADA_CUANTO_SE_APUNTA - 1, true)).toBe(0);
    // Al pasar del medio minuto, todo lo que llevaba de una vez.
    expect(l.contarElAire(0.5, true)).toBeCloseTo(CADA_CUANTO_SE_APUNTA + 0.5);
    // Y vuelve a empezar la cuenta.
    expect(l.contarElAire(1, true)).toBe(0);
  });

  it("en el suelo no cuenta horas de vuelo, pero sí duración y traza", () => {
    const l = new Libreta();
    expect(volar(l, 60, false)).toBe(0);
    expect(l.volcar()).toBe(0);
    expect(l.duracion).toBeCloseTo(60, 0);
    expect(l.traza.length).toBeGreaterThan(0);
  });

  it("un minuto en el aire acaba entero en el cuaderno, con lo que se vuelca al final", () => {
    const l = new Libreta();
    const apuntado = volar(l, 61, true) + l.volcar();
    expect(apuntado).toBeCloseTo(61, 0);
    // Lo volcado ya no se vuelve a dar.
    expect(l.volcar()).toBe(0);
  });

  it("cata cada dos segundos, en coordenadas del fichero", () => {
    const l = new Libreta();
    l.catar(CADA_CUANTO_SE_CATA - 0.01, 10.4, -20.6);
    expect(l.traza).toEqual([]);
    l.catar(0.01, 10.4, -20.6);
    // La Y del norte es la Z negativa del mundo.
    expect(l.traza).toEqual([[10, 21]]);
    l.catar(CADA_CUANTO_SE_CATA, -3, 4);
    expect(l.traza).toEqual([
      [10, 21],
      [-3, -4],
    ]);
  });

  it("otro vuelo empieza con su traza y su duración, y no tira lo que quedaba por apuntar", () => {
    const l = new Libreta();
    volar(l, 10, true);
    l.empezarOtro();
    expect(l.traza).toEqual([]);
    expect(l.duracion).toBe(0);
    expect(l.volcar()).toBeCloseTo(10, 0);
  });

  it("un salto suma su duración, y en otro mundo deja la traza vacía", () => {
    const l = new Libreta();
    volar(l, 10, true);
    const antes = l.traza.length;
    l.saltar(3600, false);
    expect(l.duracion).toBeCloseTo(3610, 0);
    expect(l.traza).toHaveLength(antes);
    l.saltar(60, true);
    expect(l.traza).toEqual([]);
    expect(l.duracion).toBeCloseTo(3670, 0);
  });
});
