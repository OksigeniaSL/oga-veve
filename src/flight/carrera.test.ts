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
import { AIRCRAFT, MEDIDOS, aircraftById, masaDe } from "./aircraft";
import { GRAVITY as G } from "./atmosphere";
import { ROZAMIENTO } from "../world/superficie";
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
  it("crece con lo que piden la Vr, el peso y el empuje de cada ficha", () => {
    /*
     * **Lo que rueda un avión no lo dice su tamaño: lo dicen su Vr, su peso y
     * su empuje.** Acelerando con lo que le sobra de empuje, `a = (T − μ·W)/m`,
     * llega a la Vr en `Vr² / 2a`. Esta prueba pedía que la carrera creciera
     * con el orden de la flota, que es el del tamaño, y eso no es verdad tal
     * cual: el Twin Otter, el JAZ 50, pesa más que el Seneca y rueda menos
     * —209 m a la masa de su ficha, donde el Seneca rueda 376—, porque rota a
     * 73 nudos con un ala de pista corta. Es lo que dicen sus fabricantes: 244
     * m a su peso máximo el uno (dehavilland.com, Series 400), unos 247 el otro
     * a la masa de su ficha (ADR 0027). Y entre el 747 y el 787 ya había que
     * hacer una excepción.
     *
     * **Lo que vigilaba sigue vigilado**: una ficha con un empuje o un peso que
     * no pega con los demás. Si la carrera que integra la cuenta se aleja de la
     * de esas tres cifras, algo de la ficha o de la ley de su motor no casa con
     * su Vr: es lo que pasó con los dos turbofanes, que con la ley de empuje de
     * una hélice rodaban cuatro veces lo que pedían —el JAZ 120, 4.404 m—, y que
     * con esto se ve de un vistazo. Lo que dice cada manual de cada avión lo
     * mira `despegue-y-toma-del-manual.test.ts`.
     *
     * La banda: por encima de uno, porque la cuenta tiene lo que la de tres
     * cifras no —la resistencia del aire y el empuje que pierde una hélice al
     * correr—; y por debajo de uno y medio. Las de hélice salen de 1,25 a
     * 1,33 y los reactores, a 1,15 o 1,16; el turbofán con la ley de la hélice
     * se iba a cuatro.
     */
    for (const a of MEDIDOS.filter((x) => !x.helicoptero)) {
      const m = masaDe(a);
      const sobra = (a.maxThrust - ROZAMIENTO.asfalto * m * G) / m;
      const pide = (a.rotationSpeed * a.rotationSpeed) / (2 * sobra);
      const r = carreraHastaVr(a) / pide;
      const dicho = `${a.id}: rueda ${Math.round(carreraHastaVr(a))} m y pide ${Math.round(pide)}`;
      expect(r, dicho).toBeGreaterThan(1);
      expect(r, dicho).toBeLessThan(1.5);
    }
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
     * Ahora rueda unos 1.070 m hasta la rotación, con la Vr de su peso, y el
     * hangar le pide 1.715 de pista, que es lo que da el manual de aeropuertos
     * de Boeing para un 747-100 a este peso (ADR 0027).
     */
    expect(carreraHastaVr(grande)).toBeLessThan(1300);
    expect(carreraHastaVr(grande)).toBeGreaterThan(900);
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
