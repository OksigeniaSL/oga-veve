/**
 * Que la pista que hace falta sea la de **este** avión.
 *
 * El juego decidía por dónde entrar a la pista con dos números escritos a
 * mano, los dos sacados del JAZ 20. En La Palma la calle de rodaje muere en el
 * medio de una pista de dos mil doscientos, así que entrar por ahí deja mil
 * cien metros: pista de sobra para la avioneta y la mitad de lo que necesita el
 * de fuselaje ancho. «Me hace despegar desde la mitad de la pista, vaya locos.»
 */

import { describe, it, expect } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import {
  carreraHastaVr,
  paraEntrarYDespegar,
  pistaQueHaceFalta,
} from "./carrera";

const pequeno = aircraftById("jaz-20")!;
const grande = aircraftById("jaz-120")!;

describe("la pista que hace falta", () => {
  it("crece con el avión, sin excepciones", () => {
    /*
     * El orden de la flota es el del tamaño, y la pista que necesita cada uno
     * tiene que seguir ese mismo orden. Si algún día no lo sigue, es que una
     * ficha se ha escrito con un empuje o un peso que no pega con los demás —y
     * eso vale más cazarlo aquí que jugando.
     */
    const carreras = AIRCRAFT.filter((a) => a.id !== "jaz-25").map((a) =>
      carreraHastaVr(a),
    );
    for (let i = 1; i < carreras.length; i++)
      expect(carreras[i]!).toBeGreaterThan(carreras[i - 1]!);
  });

  it("le da al entrenador los mismos metros de siempre", () => {
    /*
     * **Esto es lo que protege los diez aeródromos ya medidos.** Los
     * seiscientos y los mil doscientos de antes están escritos en los
     * comentarios de `aerodrome.ts` con el veredicto de cada campo: Pettirossi,
     * Tenerife Norte, Guaraní, La Palma y Cuatro Vientos entran y despegan;
     * Estigarribia y Encarnación hacen el back-taxi. Si la cuenta nueva moviera
     * al Pykasu, todos esos veredictos cambiarían de golpe y en silencio.
     */
    expect(paraEntrarYDespegar(pequeno)).toBe(600);
    expect(pistaQueHaceFalta(pequeno)).toBe(1200);
  });

  it("al de fuselaje ancho no le deja entrar por una intersección", () => {
    // La Palma entera son 2.200 m y entrando por la calle quedan 1.100.
    expect(paraEntrarYDespegar(grande)).toBeGreaterThan(1100);
    // Y de hecho ni con la pista entera: este avión no cabe en La Palma, que
    // es la verdad y es lo que dice la cuenta.
    expect(carreraHastaVr(grande)).toBeGreaterThan(2200);
  });

  it("dice que no despega el avión que no acelera", () => {
    /*
     * Un empuje que no vence al rozamiento no despega en ninguna pista, y ahí
     * hay que decir `Infinity` y no un número: cualquier número sería una
     * pista en la que ese avión cabe, y no la hay.
     */
    const parado = { ...pequeno, maxThrust: 1 };
    expect(carreraHastaVr(parado)).toBe(Infinity);
  });

  it("necesita más pista en hierba que en asfalto", () => {
    expect(carreraHastaVr(pequeno, "hierba")).toBeGreaterThan(
      carreraHastaVr(pequeno, "asfalto"),
    );
  });
});
