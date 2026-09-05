/**
 * El reconocimiento del final.
 *
 * Lo que se comprueba es la regla, no la escala: **que ningún final sea un
 * reproche**. Es fácil que eso se rompa sin querer el día que alguien añada un
 * quinto nivel «podría estar mejor», así que queda escrito aquí.
 */

import { describe, expect, it } from "vitest";
import { reconocer } from "./reconocimiento";
import { GALONES } from "./galones";

describe("el reconocimiento del final", () => {
  it("sin galones también hay final, y no es malo", () => {
    const f = reconocer([]);
    expect(f.nivel).toBe("llegaste");
    // Y sin manga: una manga vacía sería el hueco que este juego no dibuja.
    expect(f.manga).toBe(false);
  });

  it("con uno ya hay manga que enseñar", () => {
    expect(reconocer(["toma"]).manga).toBe(true);
  });

  it("y crece con lo que se llevó", () => {
    expect(reconocer(["toma"]).nivel).toBe("bien");
    expect(reconocer(["toma", "aros", "rodaje"]).nivel).toBe("muyBien");
    expect(reconocer(GALONES).nivel).toBe("redondo");
  });

  it("nunca baja al añadir un galón, que sería quitarle a alguien lo suyo", () => {
    const orden = ["llegaste", "bien", "muyBien", "redondo"];
    let previo = -1;
    for (let n = 0; n <= GALONES.length; n++) {
      const donde = orden.indexOf(reconocer(GALONES.slice(0, n)).nivel);
      expect(donde).toBeGreaterThanOrEqual(previo);
      previo = donde;
    }
  });

  it("y el vuelo perfecto llega: el último peldaño es alcanzable", () => {
    expect(reconocer(GALONES).galones).toBe(GALONES.length);
    expect(reconocer(GALONES).nivel).toBe("redondo");
  });
});
