/**
 * El panel de avisos.
 *
 * Lo que se comprueba es lo que hace que un panel sea un panel y no una fila
 * de bombillas: que **el orden sea el de la gravedad** y que el maestro diga
 * el escalón más alto. Quien mira de reojo tiene que encontrarse antes con
 * «terreno» que con «piloto automático desconectado».
 */

import { describe, expect, it } from "vitest";
import { elMaestro, encendidas, LUCES, type Estado } from "./avisos-de-cabina";

const nada: Estado = {
  terreno: false,
  perdida: false,
  rapido: false,
  trenMal: false,
  pocoCombustible: false,
  frustrada: false,
  pilotoSuelto: false,
  frenoPuesto: false,
};

describe("el panel de avisos", () => {
  it("con todo en orden, apagado", () => {
    expect(encendidas(nada)).toEqual([]);
    expect(elMaestro(nada)).toBeNull();
  });

  it("y cada cosa enciende la suya", () => {
    expect(encendidas({ ...nada, perdida: true }).map((l) => l.id)).toEqual([
      "perdida",
    ]);
    expect(encendidas({ ...nada, terreno: true }).map((l) => l.id)).toEqual([
      "terreno",
    ]);
  });

  it("**y salen por orden de gravedad, no de aparición**", () => {
    /*
     * El terreno antes que el piloto automático, siempre. Es la diferencia
     * entre un panel y una fila de bombillas, y es lo que decide qué mira
     * primero alguien que mira de reojo.
     */
    const todas = encendidas({
      terreno: true,
      perdida: true,
      rapido: true,
      trenMal: true,
      pocoCombustible: true,
      frustrada: true,
      pilotoSuelto: true,
      frenoPuesto: true,
    });
    expect(todas.map((l) => l.id)).toEqual(LUCES.map((l) => l.id));
    // Y ningún aviso por detrás de una precaución.
    const primeraPrecaucion = todas.findIndex((l) => l.grado === "precaucion");
    const ultimoAviso = todas.map((l) => l.grado).lastIndexOf("aviso");
    expect(ultimoAviso).toBeLessThan(primeraPrecaucion);
  });

  it("y no se esconde la segunda detrás de la primera", () => {
    // Enseñar solo la más grave hace que alguien arregle lo que no era.
    const dos = encendidas({ ...nada, perdida: true, frenoPuesto: true });
    expect(dos).toHaveLength(2);
  });

  it("el maestro dice el escalón más alto, no el último", () => {
    expect(elMaestro({ ...nada, pilotoSuelto: true })).toBe("precaucion");
    expect(elMaestro({ ...nada, perdida: true })).toBe("aviso");
    expect(elMaestro({ ...nada, pilotoSuelto: true, perdida: true })).toBe(
      "aviso",
    );
  });

  it("y toda luz tiene su palabra de cabina y su palabra de casa", () => {
    /*
     * La de cabina en inglés aeronáutico y sin traducir —es la que se va a
     * encontrar el día que vuele de verdad— y la de casa para los peldaños que
     * todavía no leen inglés. Una luz sin nombre es una luz que hay que
     * preguntar.
     */
    for (const l of LUCES) {
      expect(l.cabina, l.id).toMatch(/^[A-Z/ ]+$/);
      expect(l.clave, l.id).toMatch(/^luz\./);
    }
  });

  it("y ninguna luz sin estado detrás", () => {
    /*
     * Cada luz cuelga de algo que el juego ya sabe. Una luz que no se puede
     * encender con ninguna combinación es una luz que miente: enseña que ese
     * aviso no existe.
     */
    const todas = encendidas({
      terreno: true,
      perdida: true,
      rapido: true,
      trenMal: true,
      pocoCombustible: true,
      frustrada: true,
      pilotoSuelto: true,
      frenoPuesto: true,
    });
    expect(todas).toHaveLength(LUCES.length);
  });
});
