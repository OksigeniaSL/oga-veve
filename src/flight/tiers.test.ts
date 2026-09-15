/**
 * La escalera de peldaños, y lo que promete cada uno.
 */

import { describe, expect, it } from "vitest";
import {
  anticipacionDeRodaje,
  CONDUCE_EL_JUEGO,
  LA_QUE_MAS_CONDUCE,
} from "./gobernador";
import { TIERS } from "./tiers";

/**
 * Y **ningún peldaño conduce por quien juega**.
 *
 * La dirección en tierra es la única ayuda que no protege de nada: las otras
 * quitan la pérdida, nivelan las alas o coordinan el viraje —cosas que uno no
 * sabe que existen hasta que le fallan—, pero llevar el avión por la raya
 * amarilla es *jugar*. Estuvo a uno en Guyrami, con anticipación de curvas
 * incluida, y lo que salía era una demostración: «no tiene mucho sentido que
 * el juego conduzca por el jugador. Y si todo se hace solo, vaya aburrimiento».
 *
 * **Este comentario decía justo lo contrario, y se lo creyó de un fallo.**
 * Decía que medio era «el punto exacto en el que se apaga la anticipación»
 * porque la cuenta de `asistirRodaje` era `(fuerza − 0,5) × 2` y en Guyrami
 * daba cero. Pero medio es el techo de la escalera, no su umbral: lo que esa
 * cuenta apagaba no era el peldaño de abajo, eran **los cuatro**. Nadie
 * conducía, y la queja de arriba —«si todo se hace solo, vaya aburrimiento»—
 * llevaba resuelta desde entonces por accidente.
 *
 * Lo que sí sigue en pie es el techo: ningún peldaño pasa de medio, porque la
 * anticipación de Guyrami es lo más que el juego llega a conducir y ahí se
 * acaba. Ver `anticipacionDeRodaje`. Este número no puede subir sin que
 * alguien lo lea aquí.
 */
describe("la dirección en tierra", () => {
  it("nunca llega a conducir sola", () => {
    for (const tier of TIERS) {
      expect(tier.assists.taxiAssist).toBeLessThanOrEqual(0.5);
    }
  });

  it("y se afloja según se sube la escalera", () => {
    const escalera = TIERS.map((t) => t.assists.taxiAssist);
    for (let i = 1; i < escalera.length; i++) {
      expect(escalera[i]!).toBeLessThan(escalera[i - 1]!);
    }
  });

  /**
   * Y **el techo de la escalera es el techo de la escalera**.
   *
   * `LA_QUE_MAS_CONDUCE` vive en `gobernador.ts` porque lo que se necesita de
   * él no es el valor de Guyrami sino el extremo de arriba de la escala. Eso
   * son dos sitios para una misma cifra, que es exactamente la forma que tenía
   * el fallo de `CONDUCE_EL_JUEGO`. Aquí se atan.
   */
  it("y el tope de la escala es el peldaño de abajo", () => {
    const masAyuda = Math.max(...TIERS.map((t) => t.assists.taxiAssist));
    expect(LA_QUE_MAS_CONDUCE).toBe(masAyuda);
  });

  /**
   * Y **quién conduce y quién solo sujeta**, que es la otra mitad de la
   * escalera y llevaba sin existir desde que se escribió.
   *
   * Cuánto anticipa la ayuda no es lo mismo que cuánta ayuda hay: lo primero
   * dice si el juego toma la curva por ti. Con la cuenta vieja daba cero en los
   * cuatro peldaños —ver `anticipacionDeRodaje`—, así que ni el de cuatro años
   * llegaba al punto de espera con el mando suelto. Los cuatro números están
   * aquí para que apagarla otra vez sin querer cueste romper un test.
   */
  it("y solo conduce el peldaño de abajo", () => {
    const anticipa = Object.fromEntries(
      TIERS.map((t) => [t.id, anticipacionDeRodaje(t.assists.taxiAssist)]),
    );
    // Guyrami toma la curva; Tukã la insinúa; de Taguató para arriba, nada.
    expect(anticipa.guyrami).toBe(1);
    expect(anticipa.tuka).toBeGreaterThan(0);
    expect(anticipa.tuka).toBeLessThan(0.5);
    expect(anticipa.taguato).toBe(0);
    expect(anticipa["taguato-ruvicha"]).toBe(0);
  });
});

/**
 * Y **quién lleva tope de velocidad en tierra**, que llevaba mal desde
 * siempre y en tres sitios se daba por bueno.
 *
 * El tope se aplica donde el juego conduce, y eso se decide con un solo
 * número: `CONDUCE_EL_JUEGO`. Estaba en medio y Tukã tiene 0,35, así que el
 * segundo peldaño **no llevaba tope** mientras el comentario del bucle decía
 * «Guyrami y Tukã llevan tope», la prosa de la propia constante nombraba a
 * Taguató y Taguató Ruvicha como los de abajo, y el banco de vuelo comprobaba
 * el tope en los dos.
 *
 * Nadie lo vio porque **Tukã no se ejecuta en ningún banco con veredicto**: de
 * los nueve escenarios del barrido, siete van en Guyrami y dos en Taguató. Un
 * peldaño que nadie vuela es un peldaño donde cabe cualquier cosa, así que lo
 * que se puede comprobar sin volar, se comprueba aquí.
 */
describe("el tope de velocidad en tierra", () => {
  const conTope = TIERS.filter(
    (t) => t.assists.taxiAssist >= CONDUCE_EL_JUEGO,
  ).map((t) => t.id);

  it("lo llevan los dos peldaños de abajo y nadie más", () => {
    expect(conTope).toEqual(["guyrami", "tuka"]);
  });

  it("y la escalera de ayuda de rodaje baja peldaño a peldaño", () => {
    const ayudas = TIERS.map((t) => t.assists.taxiAssist);
    for (let i = 1; i < ayudas.length; i++) {
      expect(ayudas[i]!, TIERS[i]!.id).toBeLessThanOrEqual(ayudas[i - 1]!);
    }
  });
});
