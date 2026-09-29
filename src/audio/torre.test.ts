/**
 * Que no sobre ninguna grabación de torre.
 *
 * La torre tenía siete frases grabadas y decía dos. Las otras cinco solo
 * aparecían en el guion que las generó: en `src/` no las nombraba nada, así
 * que viajaban en el pack a cada tablet para no sonar nunca. Es exactamente el
 * mismo agujero que tuvieron los cantos de cabina, y se tapa con la misma
 * prueba.
 */

import { describe, expect, it } from "vitest";
import manifiesto from "../../data/voces/torre/manifiesto.json";
import canarias from "../../data/voces/torre-canarias/manifiesto.json";
import { recetaDe, type Manifiesto } from "./banco-de-voz";
import {
  CLAVE_DE_TORRE,
  claveDeTorre,
  DICE_UN_AFIS,
  EN_UN_AFIS,
  enUnAfis,
  NOMBRA_LA_PISTA,
  PISTA_DETRAS,
} from "./torre";
import { informacionEnPiezas } from "../flight/informacion-de-trafico";
import { pistaEnCastellano } from "../flight/matricula";

describe("lo que dice la torre", () => {
  const grabadas = Object.keys(
    (manifiesto as { recetas: Record<string, unknown> }).recetas,
  );

  /*
   * Las dos de la lámpara —«Podés entrar» y «Esperá acá»— no van en esta
   * tabla: las pide `luzDeTorre` por su clave del diccionario, porque son
   * castellano del sitio y no fraseología. Ver `i18n/habla.ts`.
   */
  const DE_LA_LAMPARA = new Set([
    "torre.verde",
    "torre.roja",
    "torre.aterrizar",
    // Y a dónde se va, en palabras de casa. Ver `autorizarLaRuta`.
    "torre.destino",
    /*
     * Y la información de tráfico, que tampoco es una orden de la tabla: la
     * pide `informarDelTrafico` por su clave, con la hora, las millas y la
     * altura en sus huecos. Ver `informacionEnPiezas`.
     */
    "torre.trafico",
    /*
     * Y lo que dice un AFIS en castellano, que es la lámpara dicha por quien
     * informa: lo pide `luzDeTorre` por su clave. Ver `Aerodrome.afis`.
     */
    "torre.afisLibre",
    "torre.afisLibreEnFinal",
    "torre.afisOcupada",
    "torre.afisSinTrafico",
    "torre.afisTraficoAterriza",
    "torre.afisTraficoDespega",
  ]);

  /*
   * Y **las piezas sueltas no son frases**: el alfabeto, las cifras, los lados
   * y los trozos de orden existen para rellenar huecos, no para pedirse por su
   * nombre. Se reconocen porque su receta es ella misma, que es lo que les deja
   * puesto el horneado. Ver `recetaDe` y `flight/matricula.ts`.
   */
  const recetas = (manifiesto as { recetas: Record<string, string[]> }).recetas;
  const esRelleno = (c: string) =>
    recetas[c]?.length === 1 && recetas[c]?.[0] === c;

  /*
   * Y las variantes por lado —`.L`, `.C`, `.R`— son la misma orden dicha en un
   * aeropuerto con pistas paralelas: en Gran Canaria, «zero three» a secas es
   * no decir cuál de las dos. Las elige `porRadio` a partir de la cabecera en
   * uso, no la tabla.
   */
  const sinLado = (c: string) => c.replace(/\.[LCR]$/, "");

  it("cada grabación de torre la pide alguien", () => {
    const apuntadas = new Set([
      ...Object.values(CLAVE_DE_TORRE),
      // Y lo de un AFIS en fraseología, que se pide por su clave.
      ...Object.keys(DICE_UN_AFIS),
    ]);
    expect(
      grabadas.filter(
        (c) =>
          !apuntadas.has(sinLado(c)) &&
          !DE_LA_LAMPARA.has(sinLado(c)) &&
          !esRelleno(c),
      ),
    ).toEqual([]);
  });

  it("y la tabla no apunta a grabaciones que no existen", () => {
    const hay = new Set(grabadas);
    expect(Object.values(CLAVE_DE_TORRE).filter((c) => !hay.has(c))).toEqual(
      [],
    );
  });

  /*
   * Y **cada una de las que nombran la pista tiene sus tres lados**. Si falta
   * uno, en el aeropuerto que lo use la frase no se monta y la dice la voz del
   * navegador, que suena a otra cosa y nadie se entera de por qué.
   */
  it("y las que nombran la pista tienen su versión de cada lado", () => {
    for (const cual of [
      "clearedTakeoff",
      "clearedLand",
      "lineUpWait",
      // Y las de quien viene por la otra punta. Ver `la-otra-cabecera.ts`.
      "pistaEnUso",
      "goAroundEnUso",
    ]) {
      for (const lado of ["L", "C", "R"]) {
        expect(grabadas).toContain(`torre.${cual}.${lado}`);
      }
    }
  });

  /*
   * La otra punta y el socorro: la pista en uso no es «runway occupied», y la
   * respuesta a un MAYDAY se pide tal cual se escribe en la tira de la radio.
   */
  it("la pista en uso, irse por ella y el MAYDAY tienen su grabación", () => {
    expect(claveDeTorre("runway in use")).toBe("torre.pistaEnUso");
    expect(claveDeTorre("go around, runway in use")).toBe("torre.goAroundEnUso");
    expect(claveDeTorre("roger MAYDAY")).toBe("torre.mayday");
    expect(grabadas).toContain("torre.mayday");
    // Y la pista en uso se dice detrás, que es como se informa.
    expect(PISTA_DETRAS.has("torre.pistaEnUso")).toBe(true);
    expect(PISTA_DETRAS.has("torre.clearedLand")).toBe(false);
  });

  it("reconoce la llamada tal y como la pide el juego", () => {
    expect(claveDeTorre("cleared for take-off")).toBe("torre.clearedTakeoff");
    expect(claveDeTorre("cleared to land")).toBe("torre.clearedLand");
  });

  it("y con punto al final, que es como se escribe una orden", () => {
    expect(claveDeTorre("Cleared for take-off.")).toBe("torre.clearedTakeoff");
  });

  it("lo que no está grabado se queda sin clave", () => {
    expect(claveDeTorre("cleared for the approach")).toBe(null);
    expect(claveDeTorre("")).toBe(null);
  });
  /*
   * **Y lo que la torre les da a los demás también está grabado**, que se
   * dice sin el viento: el viento te lo da a ti. Con el hueco del viento
   * obligatorio, sus «cleared for take-off» y «cleared to land» no se
   * montaban nunca: los decía la voz del navegador y, donde no la hay, no
   * sonaban. Se oía el «line up and wait» de otro, nunca su despegue, y
   * detrás tu «cleared to land» con él, para quien escucha, todavía en el eje.
   */
  it("las autorizaciones a los demás se montan sin viento, en las dos voces", () => {
    const aOtro = {
      c1: "fonetico.echo",
      c2: "fonetico.charlie",
      c3: "fonetico.kilo",
      c4: "fonetico.lima",
      c5: "fonetico.mike",
      r1: "cifra.1",
      r2: "cifra.2",
    };
    for (const [m, habla] of [
      [manifiesto, ""],
      [canarias, "canario."],
    ] as const)
      for (const orden of ["clearedTakeoff", "clearedLand", "lineUpWait"])
        for (const lado of ["", ".L"])
          expect(
            recetaDe(m as Manifiesto, `torre.${habla}${orden}${lado}`, aOtro),
            `${habla}${orden}${lado}`,
          ).not.toBeNull();
  });

  /*
   * **La información de tráfico está grabada, en las dos torres**, para
   * cualquier hora, distancia y altura que pueda salir. Se decía con la voz
   * del navegador, y en Brave para Linux esa voz es muda: de Taguató para
   * arriba, el tráfico no se oía.
   */
  it("la información de tráfico se monta con cualquier cifra, en las dos voces", () => {
    const yo = {
      c1: "fonetico.zulu",
      c2: "fonetico.papa",
      c3: "fonetico.alfa",
      c4: "fonetico.romeo",
      c5: "fonetico.india",
    };
    const PIE = 0.3048;
    for (const [m, clave] of [
      [manifiesto, "torre.trafico"],
      [canarias, "torre.canario.trafico"],
    ] as const)
      for (let hora = 1; hora <= 12; hora++)
        for (const millas of [0.2, 1, 2.6, 4, 5.9, 6.4])
          for (const pies of [-1250, -900, -310, 0, 120, 305, 640, 1000, 1200]) {
            const piezas = recetaDe(m as Manifiesto, clave, {
              ...yo,
              ...informacionEnPiezas({
                hora,
                distancia: millas * 1852,
                relativa: pies * PIE,
              }),
            });
            expect(piezas, `${clave} ${hora} h ${millas} NM ${pies} ft`).not.toBeNull();
          }
  });

  it("y «vacate next available», a quien se pasó la salida, también", () => {
    expect(claveDeTorre("vacate next available")).toBe("torre.vacateNext");
    const yo = {
      c1: "fonetico.echo",
      c2: "fonetico.charlie",
      c3: "fonetico.alfa",
      c4: "fonetico.romeo",
      c5: "fonetico.sierra",
    };
    expect(recetaDe(manifiesto as Manifiesto, "torre.vacateNext", yo)).not.toBeNull();
    expect(
      recetaDe(canarias as Manifiesto, "torre.canario.vacateNext", yo),
    ).not.toBeNull();
  });
});

/**
 * **Un AFIS no autoriza: informa.** Donde contesta uno, lo que la frecuencia
 * pide como orden de torre se dice como lo diría quien informa, y lo que un
 * AFIS no dice no se dice. Ver `EN_UN_AFIS`.
 */
describe("lo que dice un AFIS", () => {
  const recetas = (manifiesto as { recetas: Record<string, string[]> }).recetas;
  const deCanarias = (canarias as { recetas: Record<string, string[]> }).recetas;
  const aOtro = {
    c1: "fonetico.echo",
    c2: "fonetico.charlie",
    c3: "fonetico.kilo",
    c4: "fonetico.lima",
    c5: "fonetico.mike",
    r1: "cifra.0",
    r2: "cifra.2",
  };

  it("ninguna orden se queda en autorización", () => {
    for (const orden of [
      "torre.clearedTakeoff",
      "torre.clearedLand",
      "torre.holdShort",
      "torre.goAround",
    ]) {
      const dice = enUnAfis(orden);
      expect(dice, orden).not.toBeNull();
      expect(dice, orden).not.toMatch(/cleared|holdShort|lineUp|goAround/);
    }
  });

  it("y lo que no dice, no lo dice", () => {
    expect(enUnAfis("torre.vacateNext")).toBeNull();
    expect(enUnAfis("torre.clearedTo")).toBeNull();
    // Lo que es información se dice igual.
    expect(enUnAfis("torre.pistaEnUso")).toBe("torre.pistaEnUso");
    expect(enUnAfis("torre.mayday")).toBe("torre.mayday");
  });

  /*
   * **Y a nadie le hace esperar en el eje.** «Line up and wait» se decía
   * «runway free», el despegue de ese avión se callaba, y ese «runway free»
   * se quedaba oído sin que nada lo anulara: en La Gomera sonaba después tu
   * «pista libre», con la pista libre para dos. Entrar al eje se hace callado,
   * y su «runway free» suena al salir, que se la da y se la quita a la vez.
   */
  it("entrar al eje no se dice, y el despegue sí, siempre", () => {
    expect(enUnAfis("torre.lineUpWait")).toBeNull();
    expect(enUnAfis("torre.clearedTakeoff")).toBe("torre.afisFreeTakeoff");
  });

  it("todo lo que dice está grabado, en las dos voces y con su pista", () => {
    const dice = new Set([
      ...Object.keys(DICE_UN_AFIS),
      ...Object.values(EN_UN_AFIS).filter((c): c is string => !!c),
    ]);
    for (const c of dice) {
      expect(NOMBRA_LA_PISTA.has(c), `${c} nombra la pista`).toBe(true);
      expect(recetaDe(manifiesto as Manifiesto, c, aOtro), c).not.toBeNull();
      const suya = c.replace("torre.", "torre.canario.");
      expect(recetaDe(canarias as Manifiesto, suya, aOtro), suya).not.toBeNull();
    }
    for (const c of [
      "torre.afisLibre",
      "torre.afisLibreEnFinal",
      "torre.afisOcupada",
      "torre.afisSinTrafico",
      "torre.afisTraficoAterriza",
      "torre.afisTraficoDespega",
    ]) {
      expect(recetas[c], c).toBeDefined();
      expect(deCanarias[c.replace("torre.", "torre.canario.")], c).toBeDefined();
    }
  });
});

/**
 * **La verde nombra la pista, en castellano.** La torre de casa autorizaba
 * sin decir por dónde —«podés entrar», «podés aterrizar»— y la fraseología de
 * verdad la nombra: «pista dos cero, autorizado a aterrizar», y lo mismo al
 * despegar. Se monta por piezas, como la matrícula y las cifras del inglés:
 * diez cifras en castellano dicen cualquier pista, y el lado va en la clave.
 * Ver `pistaEnCastellano` en `flight/matricula.ts`.
 */
describe("la verde nombra la pista, en castellano", () => {
  const yo = {
    c1: "fonetico.zulu",
    c2: "fonetico.papa",
    c3: "fonetico.alfa",
    c4: "fonetico.romeo",
    c5: "fonetico.india",
  };

  it("las cifras de aquí, y el número como está pintado", () => {
    expect(pistaEnCastellano("20")).toEqual({
      relleno: { p1: "cifra.es.2", p2: "cifra.es.0" },
      sufijo: "",
      dicho: "dos cero",
      escrito: "20",
    });
    expect(pistaEnCastellano("3L")).toEqual({
      relleno: { p1: "cifra.es.0", p2: "cifra.es.3" },
      sufijo: ".L",
      dicho: "cero tres izquierda",
      escrito: "03L",
    });
    expect(pistaEnCastellano("cualquiera")).toBeNull();
  });

  it("y se monta entera en las dos voces, para despegar y aterrizar, con cada lado", () => {
    for (const cabecera of ["20", "03L", "21R", "12C"]) {
      const pista = pistaEnCastellano(cabecera)!;
      for (const [m, habla] of [
        [manifiesto, ""],
        [canarias, "canario."],
      ] as const)
        for (const orden of ["verde", "aterrizar"]) {
          const clave = `torre.${habla}${orden}${pista.sufijo}`;
          const piezas = recetaDe(m as Manifiesto, clave, { ...yo, ...pista.relleno });
          expect(piezas, clave).not.toBeNull();
          // Con la pista, sus dos cifras, y detrás la autorización.
          const texto = piezas!.join(" ");
          expect(texto, clave).toContain(`solo.pista ${pista.relleno.p1} ${pista.relleno.p2}`);
          expect(texto, clave).toMatch(
            orden === "verde" ? /autorizadoDespegar$/ : /autorizadoAterrizar$/,
          );
        }
    }
  });
});
