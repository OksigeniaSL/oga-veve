/**
 * Los diccionarios, comprobados.
 *
 * Un idioma que no está no rompe nada: cae al castellano y se juega igual. Lo
 * que sí rompe son dos cosas que no se ven mirando la pantalla, porque hay que
 * estar en ese idioma **y** en ese momento del vuelo para verlas:
 *
 * - Perder un hueco `{name}` al traducir. El texto sale con un agujero o con
 *   la llave a la vista, y quien lo vea será alguien que juega en guaraní.
 * - Dejar una clave que ya no existe. No hace daño, pero es trabajo tirado y
 *   despista al siguiente que traduzca.
 */

import { describe, expect, it } from "vitest";
import { EN } from "./en";
import { ES_PY } from "./es-PY";
import { GUG } from "./gug";

const DICCIONARIOS = [
  ["guaraní", GUG],
  ["inglés", EN],
] as const;

const huecos = (texto: string): string[] =>
  [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe.each(DICCIONARIOS)("el diccionario en %s", (_nombre, dicc) => {
  it("no inventa claves que no existen en castellano", () => {
    const inventadas = Object.keys(dicc).filter((k) => !(k in ES_PY));
    expect(inventadas).toEqual([]);
  });

  it("conserva todos los huecos de cada texto", () => {
    const rotos: string[] = [];
    for (const [clave, texto] of Object.entries(dicc)) {
      const origen = huecos(ES_PY[clave as keyof typeof ES_PY] ?? "");
      const traducido = huecos(texto ?? "");
      if (origen.join() !== traducido.join()) {
        rotos.push(
          `${clave}: {${origen.join("} {")}} → {${traducido.join("} {")}}`,
        );
      }
    }
    expect(rotos).toEqual([]);
  });

  it("no deja ningún texto vacío", () => {
    // Una clave presente pero vacía es peor que ausente: la ausente cae al
    // castellano y la vacía deja el hueco en blanco.
    const vacias = Object.entries(dicc)
      .filter(([, v]) => !v || !v.trim())
      .map(([k]) => k);
    expect(vacias).toEqual([]);
  });
});

describe("los rótulos aeronáuticos", () => {
  it("no se traducen: las unidades son iguales en los tres idiomas", () => {
    // IAS, ALT y compañía no pasan por el diccionario. Las unidades sí, y
    // tienen que quedarse tal cual: un anemómetro marca «kt» en Asunción y en
    // Tenerife, y traducirlo sería enseñar algo falso.
    for (const clave of [
      "units.knots",
      "units.feet",
      "units.fpm",
      "units.kmh",
    ] as const) {
      for (const [, dicc] of DICCIONARIOS) {
        if (clave in dicc) expect(dicc[clave]).toBe(ES_PY[clave]);
      }
    }
  });
});

/**
 * El nombre que se retiró no vuelve por la puerta de atrás.
 *
 * El entrenador se llamó **«Óga 172»** y se le cambió el nombre a propósito:
 * ciento setenta y dos es el número de una avioneta de escuela que existe y
 * cuyo fabricante protege su nombre como marca, y puesto detrás de una palabra
 * y delante de un ala alta de cuatro plazas **cita** a una. Por eso la flota se
 * llama JAZ. Ver #69, `flight/flota.ts` y `CREDITOS.md`.
 *
 * Y aun así seguía saliendo por la radio: el otro avión de la frecuencia
 * saludaba con «Buenos días, Óga uno siete dos» y lo decía en voz alta en
 * todos los vuelos. Un nombre retirado en una tabla y vivo en una frase
 * hablada no está retirado.
 *
 * Se comprueba también el número escrito con letra, que es como se dice por
 * radio y como se escapó.
 */
describe("los nombres retirados", () => {
  const PROHIBIDO = [
    /óga\s*172/i,
    /óga\s+uno\s+siete\s+dos/i,
    /\bcessna\b/i,
    /\bpiper\b/i,
    /\bboeing\b/i,
  ];

  it.each(DICCIONARIOS)(
    "%s no nombra ninguna marca retirada",
    (_como, dicc) => {
      const culpables: string[] = [];
      for (const [clave, texto] of Object.entries(dicc)) {
        if (typeof texto !== "string") continue;
        for (const patron of PROHIBIDO)
          if (patron.test(texto)) culpables.push(`${clave}: ${texto}`);
      }
      /*
       * Menos los créditos, que **tienen** que nombrar de dónde vino cada cosa:
       * el modelo traído de fuera es obra de un autor concreto y su ficha se
       * llama como se llama. Atribuir es lo contrario de apropiarse.
       */
      expect(culpables.filter((c) => !c.startsWith("credits."))).toEqual([]);
    },
  );
});
