/**
 * **El que despega tiene la pista hasta que pasa su final, o vira.**
 *
 * Es la regla de la OACI (PANS-ATM, Doc 4444, 7.10): quien llega no cruza el
 * umbral hasta que el que salió antes ha pasado el final de la pista en uso o
 * ha empezado a virar. Aquí la pista se soltaba al rotar, así que la torre te
 * daba la verde —y no te mandaba al aire a la altura de decisión— con el otro
 * todavía a pocos metros sobre el asfalto, delante del morro: desde la final,
 * de noche, eso es un avión en la pista. Es una de las dos maneras de llegar
 * a lo que vio Enrique en Gando, «tengo un avión en la pista y nadie me dice
 * que frustre»; la otra está en `turno-de-pista.test.ts`.
 */

import { describe, expect, it } from "vitest";
import type { Pista } from "./circuito";
import { crearTrafico } from "./trafico";

// La 03L de Gando, más o menos: tres kilómetros a 22° verdaderos.
const PISTA: Pista = { x: 0, z: 0, heading: 22, length: 3100 };
const COTA = 24;

describe("el que despega, dueño de la pista hasta pasar su final", () => {
  it("en el aire encima del asfalto la sigue ocupando; pasado el final o virado, no", () => {
    const t = crearTrafico(PISTA, COTA, "ala-alta");
    t.anuncia("EC-SAL", "torre.clearedTakeoff");
    const h = (PISTA.heading * Math.PI) / 180;
    let enElAireEncima = false;
    let yaSeFue = false;
    for (let i = 0; i < 4000 && !yaSeFue; i++) {
      t.paso(0.05);
      const a = t.quienes().find((q) => q.matricula === "EC-SAL");
      if (!a) break;
      const dx = a.x - PISTA.x;
      const dz = a.z - PISTA.z;
      const along = dx * Math.sin(h) - dz * Math.cos(h);
      const across = dx * Math.cos(h) + dz * Math.sin(h);
      const encima = Math.abs(along) <= PISTA.length / 2 && Math.abs(across) < 60;
      const ocupa = t.ocupanLaPista().includes("EC-SAL");
      if (encima && a.y - COTA > 15) {
        enElAireEncima = true;
        expect(ocupa, `a ${Math.round(a.y - COTA)} m sobre el asfalto`).toBe(true);
      }
      if (enElAireEncima && !encima) {
        yaSeFue = true;
        expect(ocupa, "pasado el final").toBe(false);
      }
    }
    expect(enElAireEncima).toBe(true);
    expect(yaSeFue).toBe(true);
  });
});
