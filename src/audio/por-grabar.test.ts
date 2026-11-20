/**
 * Que **lo que el juego pide solo con su grabación llegue a grabarse**.
 *
 * Las frases nuevas entran en el juego antes que su toma, con una puerta: se
 * piden si están en el pack y, si no, no —ver `decirLoGrabado`,
 * `explicarUnaVez` y `cantarLoGrabado` en `game.ts`—. Esa puerta tiene una
 * trampa: una frase que no está en la lista de grabar o que no tiene receta no
 * se graba nunca, la puerta no se abre nunca, y nadie se entera, porque callar
 * es justo lo que tiene que hacer mientras tanto. Esto lo mira.
 */
import { describe, expect, it } from "vitest";
import fuenteDelJuego from "../game.ts?raw";
import { KMH_QUE_SE_DICEN } from "../flight/velocidad-dicha";
import { hayTexto } from "../i18n";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, cod: string): string;
};

const leer = <T>(ruta: string): T => JSON.parse(fs.readFileSync(ruta, "utf8")) as T;

/** Las claves de la instructora que el juego pide por una de sus puertas. */
function pedidasConPuerta(): string[] {
  const salida = new Set<string>();
  for (const m of fuenteDelJuego.matchAll(
    /\b(?:explicarUnaVez|decirLoGrabado)\(\s*"([\w.-]+)"/g,
  ))
    salida.add(m[1]!);
  for (const m of fuenteDelJuego.matchAll(/\bcantarLoGrabado\(\s*"[^"]*",\s*"([\w.-]+)"/g))
    salida.add(m[1]!);
  for (const m of fuenteDelJuego.matchAll(/\binstructor\.vozDe\(\s*"((?:vuelo|tutor)\.[\w.-]+)"/g))
    salida.add(m[1]!);
  return [...salida];
}

/**
 * **Las que esperan su toma**, ya en la lista de grabar y todavía sin receta:
 * una receta que nombra una pieza que no se ha grabado rompe el horneado, así
 * que la receta se pone al grabarla. Es la excepción escrita, como la de la
 * torre —ver `ESPERAN_SU_TOMA` en `audio/torre.ts`—; en cuanto tienen receta
 * salen de aquí, y la prueba lo recuerda.
 */
const ESPERAN_SU_TOMA: ReadonlySet<string> = new Set<string>([]);

describe("lo que se pide con su grabación, en la lista de grabar", () => {
  const recetas = leer<Record<string, string[]>>("crudo/instructor/recetas.json");
  const frases = leer<{ id: string; voz: string }[]>("docs/voces/frases.json");
  const deLaInstructora = new Set(frases.filter((f) => f.voz === "instructor").map((f) => f.id));

  it("el lector encuentra las puertas", () => {
    // Una regla de medir que no ve nada da siempre verde.
    expect(pedidasConPuerta()).toEqual(
      expect.arrayContaining([
        "vuelo.armaLosAerofrenos",
        "vuelo.salenLosFrenosDeTierra",
        "vuelo.reservaAqui",
        "tutor.pedales",
      ]),
    );
  });

  it("cada una tiene su texto, su receta y su fila con la voz de la instructora", () => {
    for (const clave of pedidasConPuerta()) {
      expect(hayTexto(clave), `${clave}: sin texto`).toBe(true);
      if (!ESPERAN_SU_TOMA.has(clave))
        expect(recetas[clave], `${clave}: sin receta`).toBeDefined();
      expect(deLaInstructora.has(clave), `${clave}: no está en frases.json`).toBe(true);
    }
  });

  it("y las que esperan su toma, la esperan de verdad: con receta, salen de la lista", () => {
    const pedidas = new Set(pedidasConPuerta());
    for (const clave of ESPERAN_SU_TOMA) {
      expect(pedidas.has(clave), `${clave}: nadie la pide`).toBe(true);
      expect(recetas[clave], `${clave} ya tiene receta: sácala de ESPERAN_SU_TOMA`).toBeUndefined();
    }
  });

  it("y cada cifra de la velocidad, también, y el paso que la lleva tiene su hueco", () => {
    for (const n of KMH_QUE_SE_DICEN) {
      const pieza = `vuelo.paso.velocidad.${n}`;
      expect(recetas[pieza], pieza).toEqual([pieza]);
      expect(deLaInstructora.has(pieza), pieza).toBe(true);
    }
    for (const paso of [
      "vuelo.paso.acelerarGas",
      "vuelo.paso.acelerarNariz",
      "vuelo.paso.frenarGas",
      "vuelo.paso.frenarAerofrenos",
      "vuelo.paso.frenarNariz",
      "vuelo.paso.mantener",
      "vuelo.paso.marcaDelAutomatico",
    ])
      expect(recetas[paso], paso).toEqual([paso, "{velocidad?}"]);
  });
});
