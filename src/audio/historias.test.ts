/**
 * **Las historias de Jazlyn: verdaderas, con fuente y donde se ven.**
 *
 * Detrás de lo que se señala por la ventanilla va su historia —el Garoé que
 * bebía de la niebla, Cabeza de Vaca cargando las canoas para rodear el
 * Iguazú—. Lo que se comprueba aquí es lo que se puede comprobar sin volar:
 *
 * - que cada historia está en los dos registros —la comandante y la
 *   instructora— y en inglés, y que la de la comandante no vosea;
 * - que es de algo que se señala: un sitio de `destacados.json` o una
 *   estrella. Una historia de algo que no se ve no tiene cuándo contarse;
 * - y que **su fuente está apuntada** en `docs/historias/fuentes.md`, con un
 *   enlace o un libro. Una historia sin fuente es un «dicen que», y eso aquí
 *   no se cuenta.
 *
 * Que salga volando, sobre el relieve de verdad, lo mira
 * `flight/lo-que-se-ve-en-ruta.test.ts`; que esté grabada,
 * `guion-grabado.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import type { Hito } from "../world/hitos";
import { DESTACADOS } from "../world/lo-destacado";
import { laHistoria } from "./ventanilla";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, cod: string): string;
};

const DE_LA_COMANDANTE = /^ventanilla\.historia\.(.+)$/;
const DE_LA_INSTRUCTORA = /^ventanilla\.vos\.historia\.(.+)$/;

const historias = (patron: RegExp): string[] =>
  Object.keys(ES_PY)
    .map((k) => patron.exec(k)?.[1])
    .filter((x): x is string => !!x);

const suyas = historias(DE_LA_COMANDANTE);
const deVos = historias(DE_LA_INSTRUCTORA);

/** Lo que se señala por la ventanilla: los sitios y las dos estrellas. */
const SE_SENALA = new Set([...DESTACADOS.map((d) => d.clave), "cruz-del-sur", "polar"]);

/** Las secciones de las fuentes, por la clave que llevan en el título. */
function secciones(): Map<string, string> {
  const texto = fs.readFileSync("docs/historias/fuentes.md", "utf8");
  const salida = new Map<string, string>();
  for (const trozo of texto.split(/^### /m).slice(1)) {
    const clave = /`([\w-]+)`/.exec(trozo.split("\n")[0] ?? "")?.[1];
    if (clave) salida.set(clave, trozo);
  }
  return salida;
}

describe("las historias de Jazlyn", () => {
  it("hay de Canarias y de Paraguay, y las mismas en los dos registros", () => {
    const zona = (clave: string) => DESTACADOS.find((d) => d.clave === clave)?.zona;
    expect(suyas.some((c) => zona(c) === "canarias")).toBe(true);
    expect(suyas.some((c) => zona(c) === "paraguay")).toBe(true);
    expect([...deVos].sort()).toEqual([...suyas].sort());
  });

  it.each(suyas.map((c) => [c]))("%s es de algo que se señala por la ventanilla", (clave) => {
    expect(SE_SENALA.has(clave), clave).toBe(true);
  });

  it.each(suyas.map((c) => [c]))("%s está en inglés, y la comandante no vosea", (clave) => {
    for (const k of [`ventanilla.historia.${clave}`, `ventanilla.vos.historia.${clave}`])
      expect(k in EN, `${k} en inglés`).toBe(true);
    const suya = ES_PY[`ventanilla.historia.${clave}` as keyof typeof ES_PY];
    expect(suya).not.toMatch(/\b(mirá|fijate|vos|tenés|podés|sabés|sabías)\b/i);
  });

  it.each(suyas.map((c) => [c]))(
    "%s es corta, que se oye una vez: ni de treinta letras ni de un minuto",
    (clave) => {
      for (const k of [`ventanilla.historia.${clave}`, `ventanilla.vos.historia.${clave}`]) {
        const texto = ES_PY[k as keyof typeof ES_PY];
        // Con chispa, una frase de menos de treinta letras se inventa lo que falta.
        expect(texto.length, k).toBeGreaterThanOrEqual(30);
        expect(texto.length, k).toBeLessThanOrEqual(240);
      }
    },
  );

  it.each(suyas.map((c) => [c]))("%s tiene su fuente apuntada", (clave) => {
    const seccion = secciones().get(clave);
    expect(seccion, `falta \`${clave}\` en docs/historias/fuentes.md`).toBeDefined();
    // Un enlace o un libro con su capítulo o su página.
    expect(seccion).toMatch(/https?:\/\/|cap\. [IVXL]+|pp?\. \d+/);
  });
});

describe("la historia, detrás de lo que se ve", () => {
  const sitio = (clave: string, clase: Hito["clase"] = "montana"): Hito => ({
    nombre: clave,
    clase,
    x: 0,
    z: 0,
    ele: null,
    clave,
  });
  const mirando = (hito: Hito) => ({
    hito,
    lado: "izquierda" as const,
    distancia: 20_000,
    desdeElMorro: 70,
  });

  it("la comandante la cuenta por la megafonía y la instructora, de vos", () => {
    const conPasaje = laHistoria(mirando(sitio("teide")), true)!;
    expect(conPasaje.clave).toBe("ventanilla.historia");
    expect(conPasaje.relleno).toEqual({ historia: "ventanilla.historia.teide" });
    expect(conPasaje.texto).toBe(ES_PY["ventanilla.historia.teide"]);
    const enAvioneta = laHistoria(mirando(sitio("teide")), false)!;
    expect(enAvioneta.clave).toBe("ventanilla.vos.historia");
    expect(enAvioneta.relleno).toEqual({ historia: "ventanilla.vos.historia.teide" });
  });

  it("y lo que no tiene historia, o se mueve, se queda con su frase", () => {
    const queSeMueve = (clase: Hito["clase"]): Hito => ({ nombre: clase, clase, x: 0, z: 0, ele: null });
    expect(laHistoria(mirando(sitio("fuerteventura", "isla")), true)).toBeNull();
    expect(laHistoria(mirando(queSeMueve("barco")), true)).toBeNull();
    expect(laHistoria(mirando(queSeMueve("avion")), false)).toBeNull();
  });
});
