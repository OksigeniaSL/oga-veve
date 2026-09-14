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
import SGAS from "../../data/aerodromes/sgas.aero.json";
import GCXO from "../../data/aerodromes/gcxo.aero.json";
import YVYTU from "../../data/aerodromes/yvytu.aero.json";
import GCLA from "../../data/aerodromes/gcla.aero.json";
import LECU from "../../data/aerodromes/lecu.aero.json";
import SGES from "../../data/aerodromes/sges.aero.json";
import SGME from "../../data/aerodromes/sgme.aero.json";
import SGPJ from "../../data/aerodromes/sgpj.aero.json";
import SGEN from "../../data/aerodromes/sgen.aero.json";

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
    /*
     * La Palma entera son 2.200 m y entrando por la calle quedan 1.100. Con
     * eso no hay avión grande que salga, así que a éste se le manda hacer el
     * back-taxi hasta la cabecera — que es lo que se hace de verdad.
     */
    expect(paraEntrarYDespegar(grande)).toBeGreaterThan(1100);
    /*
     * **Y con la pista entera sí cabe**, que es lo que cambió al darle a los
     * reactores el empuje de su clase.
     *
     * Aquí ponía lo contrario, y decía la verdad de entonces: con la ley de
     * empuje de una hélice aplicada a un turbofán, este avión necesitaba 4.404
     * metros para irse del suelo y no despegaba en ningún escenario del juego.
     * Ahora rueda 1.423 hasta la rotación, que es lo que dice el manual de
     * aeropuertos para un 747 a este peso.
     */
    expect(carreraHastaVr(grande)).toBeLessThan(2200);
    expect(carreraHastaVr(grande)).toBeGreaterThan(1200);
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

/**
 * Y la guarda de flota: **ningún avión necesita más pista de la que hay**.
 *
 * Es la comprobación que faltaba y que habría cazado de un vistazo el fallo
 * más gordo de la flota: con la ley de empuje de una hélice aplicada a los dos
 * turbofanes, el JAZ 120 necesitaba 4.404 metros para irse del suelo y el JAZ
 * 90, 3.057. La pista más larga del juego son los 3.516 de Mariscal
 * Estigarribia. O sea que el avión grande no despegaba **en ningún escenario**
 * y nadie se enteró, porque el peldaño de los pequeños usa otro motor de vuelo
 * y ahí sí volaba.
 *
 * Las pistas salen de los ficheros de aeródromo, que es de donde las saca el
 * juego: preguntárselas a una lista escrita a mano aquí sería comprobar esta
 * lista contra sí misma.
 */
describe("la flota contra las pistas que hay", () => {
  /**
   * Lo que mide cada pista de verdad del juego, en metros.
   *
   * Los ficheros se importan como los importa el juego —ver `scenarios.ts`— y
   * no se leen del disco: una prueba que va al sistema de ficheros no compila
   * en este proyecto (el `tsconfig` solo trae los tipos de Vite, a propósito,
   * porque esto es una aplicación de navegador) y además estaría comprobando
   * otra cosa que lo que el juego carga.
   */
  const PISTAS = [SGAS, GCXO, YVYTU, GCLA, LECU, SGES, SGME, SGPJ, SGEN]
    .flatMap((j) =>
      (j.runways ?? []).map((r) => ({
        campo: `${j.id} ${r.ref ?? ""}`,
        ref: r.ref,
        centerline: r.centerline as number[][] | undefined,
      })),
    )
    .filter((r) => r.ref && r.centerline?.length === 2)
    .map((r) => {
      const [a, b] = r.centerline as number[][];
      return {
        campo: r.campo,
        largo: Math.hypot(b![0]! - a![0]!, b![1]! - a![1]!),
      };
    });

  it("hay pistas de las que hablar", () => {
    // Si un día los ficheros cambian de forma, esto avisa en vez de dar por
    // buena una comprobación sobre una lista vacía.
    expect(PISTAS.length).toBeGreaterThan(5);
  });

  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "el %s cabe en alguna pista del juego",
    (_id, a) => {
      const necesita = carreraHastaVr(a);
      const mayor = Math.max(...PISTAS.map((p) => p.largo));
      expect(necesita).toBeLessThan(mayor);
    },
  );

  it("y a cada uno le vale al menos una", () => {
    /*
     * No es un listón nuevo: es **la tabla**, y está aquí para que se vea
     * cambiar. El día que una ficha se toque, este recuento dice a cuántos
     * campos deja de poder ir ese avión antes de que nadie lo descubra
     * jugando.
     */
    for (const a of AIRCRAFT) {
      const necesita = carreraHastaVr(a) * 1.15;
      expect(PISTAS.filter((p) => p.largo > necesita).length).toBeGreaterThan(
        0,
      );
    }
  });
});
