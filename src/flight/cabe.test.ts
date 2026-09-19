/**
 * Qué avión cabe en qué campo.
 *
 * > «Si un avión no [cabe] en una pista, no se ofrece. El que sí, se ofrece con
 * > sus condiciones de vuelo.»
 *
 * El hangar ofrecía **los seis aviones en los once campos**, sin mirar el sitio
 * ni una sola vez. El juego colocaba el JAZ 120 en La Palma —2.202 metros de
 * pista para un avión que necesita 2.562—, la torre lo autorizaba, y el avión se
 * salía por el final. Está medido en el banco de vuelo entero: percance
 * «fuera».
 *
 * Lo que se comprueba aquí no es una lista de qué cabe dónde —eso cambia cada
 * vez que se toca una ficha, y debe poder cambiar— sino que **la regla dice lo
 * que la realidad dice**: el entrenador entra en todos los campos del juego, el
 * de fuselaje ancho solo en los grandes, y ninguno entra donde no puede.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import { cabeEn, campoDe, elQueQuepa, type Campo } from "./cabe";
import { SCENARIOS } from "../world/scenarios";

const pequeno = aircraftById("jaz-20")!;
const grande = aircraftById("jaz-120")!;

describe("qué avión cabe dónde", () => {
  it("el entrenador cabe en todos los campos del juego", () => {
    /*
     * Y tiene que seguir cabiendo: es el avión con el que se empieza, y un
     * escenario donde no entrase sería un escenario al que nadie puede ir el
     * primer día.
     */
    for (const e of SCENARIOS)
      expect(cabeEn(pequeno, campoDe(e)).cabe, e.id).toBe(true);
  });

  it("el de fuselaje ancho no cabe en La Palma, y ahí está el fallo que se vio", () => {
    const laPalma = SCENARIOS.find((e) => e.id === "la-palma")!;
    const v = cabeEn(grande, campoDe(laPalma));
    expect(v.cabe).toBe(false);
    expect(v.porQueNo).toBe("corta");
    // Y con los metros a mano, que es lo que hay que poder enseñar sin palabras.
    expect(v.necesita).toBeGreaterThan(v.hay);
  });

  it("y en El Hierro no cabe ni el turbohélice, que es lo que pasa de verdad", () => {
    /*
     * Mil doscientos cincuenta y cuatro metros de asfalto. Es el campo más
     * pequeño del juego con designador propio y el que enseña esta lección
     * sola: allí vuelan turbohélices pequeños y nada más, y no por costumbre.
     *
     * Y se vio jugando **con el juego dejándolo despegar**: «¿pero puedo
     * despegar un 747 en El Hierro?» — pues sí se podía, porque el hangar
     * comprobaba `cabeEn` al pulsar una ficha y al cambiar de aeropuerto, y no
     * al abrirse con un par ya puesto. La regla decía que no desde el primer
     * día; lo que faltaba era preguntárselo.
     */
    const elHierro = SCENARIOS.find((e) => e.id === "el-hierro")!;
    for (const a of [grande, AIRCRAFT.find((x) => x.id === "jaz-90")!]) {
      const v = cabeEn(a, campoDe(elHierro));
      expect(v.cabe, a.id).toBe(false);
      expect(v.porQueNo, a.id).toBe("corta");
      expect(v.necesita, a.id).toBeGreaterThan(v.hay);
    }
  });

  it("pero sí los cuatro pequeños, que son los que vuelan allí", () => {
    const elHierro = SCENARIOS.find((e) => e.id === "el-hierro")!;
    for (const id of ["jaz-20", "jaz-25", "jaz-40", "jaz-60"]) {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      expect(cabeEn(a, campoDe(elHierro)).cabe, id).toBe(true);
    }
  });

  it("pero sí en los campos grandes", () => {
    for (const id of [
      "pettirossi",
      "guarani",
      "tenerife-norte",
      "estigarribia",
    ]) {
      const e = SCENARIOS.find((x) => x.id === id)!;
      expect(cabeEn(grande, campoDe(e)).cabe, id).toBe(true);
    }
  });

  it("en una pista de hierba de novecientos metros solo entran los pequeños", () => {
    const yvytu = SCENARIOS.find((e) => e.id === "yvytu-rape")!;
    const quepan = AIRCRAFT.filter((a) => cabeEn(a, campoDe(yvytu)).cabe);
    expect(quepan.length).toBeGreaterThan(0);
    expect(quepan.length).toBeLessThan(AIRCRAFT.length);
    expect(quepan.map((a) => a.id)).toContain("jaz-20");
    expect(quepan.map((a) => a.id)).not.toContain("jaz-120");
  });

  it("una pista angosta echa a un avión de alas largas aunque sea larga", () => {
    /*
     * No todo es la longitud. Una pista de diez kilómetros y doce metros de
     * ancho no admite un avión de sesenta de envergadura: ni maniobra ni da la
     * vuelta. Es el motivo que el hangar tiene que saber distinguir, porque el
     * dibujo que enseña es otro.
     */
    const larga: Campo = { largo: 10000, ancho: 12, superficie: "asfalto" };
    const v = cabeEn(grande, larga);
    expect(v.cabe).toBe(false);
    expect(v.porQueNo).not.toBe("corta");
  });

  it("y todos los campos admiten a alguien", () => {
    // Un escenario en el que no cupiera ningún avión es un escenario al que no
    // se puede ir, y eso hay que verlo aquí y no jugando.
    for (const e of SCENARIOS)
      expect(
        AIRCRAFT.some((a) => cabeEn(a, campoDe(e)).cabe),
        e.id,
      ).toBe(true);
  });

  it("el grande es el que más pista pide, y el biplano de los que menos", () => {
    /*
     * **Y no es el orden del peso**, que es lo que uno escribiría de primeras y
     * es falso: el biplano pesa menos que el entrenador y necesita bastante
     * menos pista que él —234 metros contra 406—, porque tiene más ala y más
     * motor. Un fumigador está hecho para salir de un potrero.
     *
     * Lo que sí es cierto siempre es que el de fuselaje ancho pide más que
     * cualquier otro. Si un día deja de serlo, alguien ha tocado una ficha.
     */
    const campo: Campo = { largo: 1e9, ancho: 1e9, superficie: "asfalto" };
    const pide = (id: string) => cabeEn(aircraftById(id)!, campo).necesita;
    for (const a of AIRCRAFT)
      if (a.id !== "jaz-120")
        expect(pide("jaz-120"), a.id).toBeGreaterThan(pide(a.id));
    expect(pide("jaz-25")).toBeLessThan(pide("jaz-20"));
  });

  it("y en hierba hace falta más pista que en asfalto", () => {
    // Rodar por hierba cuesta más, así que la carrera se alarga. Es la lección
    // de por qué en un potrero no entra lo mismo que en un aeropuerto.
    const largo = 1e9;
    const asfalto: Campo = { largo, ancho: 1e9, superficie: "asfalto" };
    const hierba: Campo = { largo, ancho: 1e9, superficie: "hierba" };
    for (const a of AIRCRAFT)
      expect(cabeEn(a, hierba).necesita, a.id).toBeGreaterThan(
        cabeEn(a, asfalto).necesita,
      );
  });
});

describe("y el que se vuela de verdad, quepa o no el pedido", () => {
  /*
   * Esta regla vivía **solo dentro del hangar**, y el hangar no siempre se
   * abre: con `?escenario=` en la dirección se va derecho a volar y el avión
   * sale de la dirección o del perfil guardado. Contado jugando: «despegar y
   * aterrizar en La Gomera con un 747, no sé si eso puede ser real, pero aquí
   * se hace». No lo es. Ver `elQueQuepa`.
   */
  const gomera = SCENARIOS.find((s) => s.id === "la-gomera")!;
  const ancho = AIRCRAFT[AIRCRAFT.length - 1]!;
  const avioneta = AIRCRAFT[0]!;

  it("el de fuselaje ancho no cabe en La Gomera, y se cambia", () => {
    expect(cabeEn(ancho, campoDe(gomera)).cabe).toBe(false);
    const vuela = elQueQuepa(ancho, campoDe(gomera), AIRCRAFT);
    expect(vuela).not.toBe(ancho);
    expect(cabeEn(vuela, campoDe(gomera)).cabe).toBe(true);
  });

  it("y se queda con el mayor que quepa, no con el primero", () => {
    const vuela = elQueQuepa(ancho, campoDe(gomera), AIRCRAFT);
    const quepan = AIRCRAFT.filter((a) => cabeEn(a, campoDe(gomera)).cabe);
    expect(vuela).toBe(quepan[quepan.length - 1]);
  });

  it("y si el pedido cabe, se respeta tal cual", () => {
    // Por identidad, que es lo que permite a quien llama enterarse de si hubo
    // cambio y decirlo.
    expect(elQueQuepa(avioneta, campoDe(gomera), AIRCRAFT)).toBe(avioneta);
  });

  it("y en un campo grande cabe el grande", () => {
    const sur = SCENARIOS.find((s) => s.id === "tenerife-sur")!;
    expect(elQueQuepa(ancho, campoDe(sur), AIRCRAFT)).toBe(ancho);
  });

  it("y en todos los campos sale algo que de verdad cabe", () => {
    // La regla no puede dejar a nadie con un avión que no entra, y tampoco
    // puede quedarse sin candidatos en ningún aeródromo de la lista.
    for (const e of SCENARIOS) {
      const vuela = elQueQuepa(ancho, campoDe(e), AIRCRAFT);
      expect(cabeEn(vuela, campoDe(e)).cabe).toBe(true);
    }
  });
});
