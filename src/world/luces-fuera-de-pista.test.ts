/**
 * Que ninguna luz de calle de rodaje caiga sobre la pista.
 *
 * Contado jugando, con foto de noche en Los Rodeos: «luces cruzando la
 * pista». OpenStreetMap dibuja las salidas rápidas hasta el eje de la pista,
 * así que los bordes calculados de esas calles la atravesaban.
 *
 * Y no es un detalle de dibujo: el azul dice **«esto no es pista»**, y una
 * fila de azules cruzándola enseña lo contrario de lo que enseña. En un
 * aeropuerto de verdad las azules se paran en el punto de espera.
 *
 * Se comprueba con los aeródromos de verdad y sin abrir un navegador: son
 * puntos y rectángulos.
 */

import { describe, expect, it } from "vitest";
import {
  ANCHO_POR_DEFECTO,
  bordesDe,
  dondeVanLasLuces,
} from "./luces-de-rodadura";
import { sobreLaPista, type Aerodrome } from "./aerodrome";

const FICHAS = import.meta.glob("../../data/aerodromes/*.aero.json", {
  eager: true,
  import: "default",
}) as Record<string, Aerodrome>;

const conPista = Object.entries(FICHAS)
  .map(
    ([ruta, aero]) =>
      [ruta.split("/").pop()!.replace(".aero.json", ""), aero] as const,
  )
  .filter(([, a]) => a.runways.some((p) => p.lit));

describe("las luces de rodadura", () => {
  it("hay aeródromos con pista iluminada, que si no esto no mide nada", () => {
    expect(conPista.length).toBeGreaterThan(3);
  });

  it("y en al menos uno las había de verdad cruzando", () => {
    const cruzan = conPista.some(([, aero]) =>
      aero.taxiways.some(
        (c) =>
          c.path.length >= 2 &&
          bordesDe(c.path, c.widthM ?? ANCHO_POR_DEFECTO).some((p) =>
            sobreLaPista(aero, p, 3),
          ),
      ),
    );
    expect(cruzan, "sin ninguna cruzando, el filtro no arregla nada").toBe(
      true,
    );
  });

  it.each(conPista)("%s: y las que se ponen, ninguna encima", (_id, aero) => {
    // Lo que se comprueba es la salida de verdad de la función, no una
    // repetición del filtro: si mañana alguien añade otra fuente de luces
    // —las medidas del fichero, por ejemplo— tiene que pasar por aquí igual.
    const encima = dondeVanLasLuces(aero).filter(([p]) =>
      sobreLaPista(aero, p, 3),
    );
    expect(encima.map(([p]) => p)).toEqual([]);
  });

  it("y quedan luces: quitarlas todas no es arreglarlo", () => {
    for (const [id, aero] of conPista)
      // Diez: Mariscal Estigarribia es un campo de una calle y tiene
      // dieciséis. Lo que caza esto es un filtro que se lo lleve todo.
      expect(dondeVanLasLuces(aero).length, id).toBeGreaterThan(10);
  });
});
