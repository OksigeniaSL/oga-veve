/**
 * La frustrada.
 *
 * Lo que se comprueba es sobre todo **lo que no puede contar como frustrada**,
 * porque una frustrada que se regala no enseña nada: el rebote de una toma
 * mala, el bache de un vuelo bajo y el despegue de siempre no son renunciar.
 */

import { describe, expect, it } from "vitest";
import { Frustrada, type EnAproximacion } from "./frustrada";

const aire = (f: Partial<EnAproximacion> = {}): EnAproximacion => ({
  enFinal: true,
  sobreElSuelo: 100,
  vertical: -3,
  enElSuelo: false,
  ...f,
});

/** Baja hasta la altura que se diga, en pasos de diez metros. */
function bajarHasta(f: Frustrada, hasta: number, desde = 180): void {
  for (let h = desde; h >= hasta; h -= 10) f.paso(aire({ sobreElSuelo: h }));
}

/** Sube desde donde se esté y devuelve la altura a la que saltó, o `null`. */
function subirDesde(f: Frustrada, desde: number, hasta: number): number | null {
  for (let h = desde; h <= hasta; h += 5)
    if (f.paso(aire({ sobreElSuelo: h, vertical: 4 }))) return h;
  return null;
}

describe("la frustrada", () => {
  it("bajar hasta la pista y volver a subir es una frustrada", () => {
    const f = new Frustrada();
    bajarHasta(f, 20);
    expect(subirDesde(f, 20, 200)).not.toBeNull();
  });

  it("y se reconoce enseguida, no cuando ya se está en el circuito", () => {
    const f = new Frustrada();
    bajarHasta(f, 20);
    // Cuarenta metros sobre lo más bajo: el aviso llega a tiempo de servir.
    expect(subirDesde(f, 20, 200)).toBeLessThan(80);
  });

  it("un bache volando bajo no es una frustrada", () => {
    const f = new Frustrada();
    bajarHasta(f, 15);
    // Sube diez metros y vuelve a bajar: eso es aire, no una decisión.
    expect(subirDesde(f, 15, 25)).toBeNull();
  });

  it("un rebote al aterrizar tampoco: eso es una toma mala, no renunciar", () => {
    const f = new Frustrada();
    bajarHasta(f, 5);
    f.paso(aire({ enElSuelo: true, sobreElSuelo: 0, vertical: -2 }));
    // Rebota y se va: ha tocado, así que ya no es una frustrada.
    expect(subirDesde(f, 2, 200)).toBeNull();
  });

  it("ni el despegue de siempre, que también es subir con la pista debajo", () => {
    const f = new Frustrada();
    for (let i = 0; i < 20; i++)
      f.paso(
        aire({ enElSuelo: true, enFinal: false, sobreElSuelo: 0, vertical: 0 }),
      );
    expect(subirDesde(f, 0, 300)).toBeNull();
  });

  it("no cuenta si nunca se estuvo en aproximación", () => {
    const f = new Frustrada();
    for (let h = 900; h >= 400; h -= 20)
      f.paso(aire({ enFinal: false, sobreElSuelo: h }));
    expect(subirDesde(f, 400, 900)).toBeNull();
  });

  it("ni subir despacito, que no es irse al aire", () => {
    const f = new Frustrada();
    bajarHasta(f, 20);
    let salto = false;
    for (let h = 20; h <= 200; h += 5)
      salto ||= f.paso(aire({ sobreElSuelo: h, vertical: 0.4 }));
    expect(salto).toBe(false);
  });

  it("se cuenta una sola vez por aproximación", () => {
    const f = new Frustrada();
    bajarHasta(f, 20);
    expect(subirDesde(f, 20, 200)).not.toBeNull();
    // Sigue subiendo: ya es un vuelo, no una renuncia repetida.
    expect(subirDesde(f, 200, 600)).toBeNull();
  });

  it("y se puede volver a intentar: bajar otra vez la rearma", () => {
    const f = new Frustrada();
    bajarHasta(f, 20);
    expect(subirDesde(f, 20, 200)).not.toBeNull();
    bajarHasta(f, 20, 190);
    expect(subirDesde(f, 20, 200)).not.toBeNull();
  });

  it("y reiniciar la deja como nueva, que es otro vuelo", () => {
    const f = new Frustrada();
    bajarHasta(f, 20);
    f.reiniciar();
    expect(subirDesde(f, 20, 200)).toBeNull();
  });
});
