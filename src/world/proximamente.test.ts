/**
 * Que no se prometa lo que ya está.
 *
 * El hangar dibuja los escenarios construidos y detrás, apagados, los que van
 * a estar. Las dos listas viven en sitios distintos y **nadie las cruzaba**:
 * Encarnación, Ciudad del Este y Mariscal Estigarribia se construyeron y se
 * quedaron también en la lista de promesas, así que salían dos veces —una
 * para volar y otra en gris, prometiendo lo que ya se podía hacer—. Para
 * alguien de cuatro años eso no es una lista con un error: es que el juego le
 * enseña dos veces el mismo sitio y uno de los dos no se deja tocar.
 *
 * Se compara por **nombre de ciudad** y no por identificador a propósito: los
 * identificadores eran distintos —`mariscal-estigarribia` aquí y
 * `estigarribia` en el escenario— así que cruzarlos por id no habría cazado
 * nada. Lo que ve quien juega es el nombre.
 */
import { describe, expect, it } from "vitest";
import { ES_PY } from "../i18n/es-PY";
import { PROXIMAMENTE } from "./proximamente";
import { SCENARIOS } from "./scenarios";

/** Los nombres que el hangar enseña de lo ya construido. */
const construidos = SCENARIOS.map(
  (e) => (ES_PY as Record<string, string>)[e.nameKey] ?? e.id,
);

describe("los sitios que van a estar", () => {
  it("ninguno está ya construido", () => {
    for (const p of PROXIMAMENTE) {
      const yaEsta = construidos.find((n) => n.includes(p.ciudad));
      expect(yaEsta ?? null, `${p.ciudad} ya se puede volar: «${yaEsta}»`).toBe(
        null,
      );
    }
  });

  it("y ninguno se repite entre ellos", () => {
    const ciudades = PROXIMAMENTE.map((p) => p.ciudad);
    expect(new Set(ciudades).size).toBe(ciudades.length);
  });

  it("todos dicen de qué país son, para salir en su grupo", () => {
    for (const p of PROXIMAMENTE) {
      expect(["py", "es", "inventado"], p.ciudad).toContain(p.pais);
    }
  });
});
