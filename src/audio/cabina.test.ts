/**
 * Que no sobre ninguna grabación de cabina.
 *
 * Es la prueba que faltaba el día que se grabaron veintiuna frases de cabina y
 * no sonó ninguna: el código las pedía por su texto en inglés y el pack las
 * guardaba por clave, y nadie unía las dos cosas. Una receta del manifiesto a
 * la que no apunta la tabla es una frase grabada, horneada, publicada, bajada a
 * cada tablet y tirada.
 */

import { describe, expect, it } from "vitest";
import manifiesto from "../../data/voces/cabina/manifiesto.json";
import fuenteDelJuego from "../game.ts?raw";
import { AIRCRAFT, ARAI, ARASUNU, PANAMBI, PYKASU, TIJERETA, YVAGA } from "../flight/aircraft";
import { LA_CUENTA } from "../flight/avisos-de-altura";
import { CANTOS_DEL_CONSEJO } from "../flight/consejo-de-la-bajada";
import {
  CLAVE_DE_CABINA,
  claveDeCabina,
  DE_A_BORDO,
  DE_LA_CARRERA,
  DE_LOS_AVISADORES,
  esDeUnaCaja,
  esTonoDeABordo,
  ESPERAN_SU_TOMA,
  loDiceElAvion,
  loQueSuenaEnEsteAvion,
  TONO_DE_A_BORDO,
  VOZ_DEL_AUTOMATICO_DE_EMBRAER,
  VOZ_DEL_RA,
} from "./cabina";
import { FORMAS } from "./tonos-de-aviso";

/**
 * Lo que el juego pide cantar: los textos en inglés que se le pasan a
 * `cantar`, sacados del propio `game.ts`. Se lee el primer argumento de cada
 * llamada hasta su coma, que puede ser un literal o un ternario con dos.
 */
function loQueCantaElJuego(por = "this.cantar("): string[] {
  const salida: string[] = [];
  let desde = 0;
  for (;;) {
    const i = fuenteDelJuego.indexOf(por, desde);
    if (i < 0) break;
    desde = i + 1;
    let j = i + por.length;
    let hondo = 0;
    let en: string | null = null;
    let primero = "";
    for (; j < fuenteDelJuego.length; j++) {
      const c = fuenteDelJuego[j]!;
      if (en) {
        if (c === en) en = null;
      } else if (c === '"' || c === "'" || c === "`") en = c;
      else if (c === "(") hondo++;
      else if (c === ")") {
        if (hondo === 0) break;
        hondo--;
      } else if (c === "," && hondo === 0) break;
      primero += c;
    }
    // Los literales que son lo que se dice: el argumento entero, o las dos
    // ramas de un ternario. Los de la condición —`veredicto === "rapido"`— no.
    for (const m of primero.trim().matchAll(/(?:^|[?:])\s*"([^"]+)"/g))
      salida.push(m[1]!);
  }
  return salida;
}

describe("los cantos de cabina", () => {
  const grabadas = Object.keys(
    (manifiesto as { recetas: Record<string, unknown> }).recetas,
  );

  it("cada grabación de cabina la pide alguien", () => {
    /*
     * Por su texto en inglés o, las del RA, por la orden del TCAS: ésas se
     * piden por clave y con la toma puesta. Ver `VOZ_DEL_RA`.
     */
    const apuntadas = new Set([
      ...Object.values(CLAVE_DE_CABINA),
      ...Object.values(VOZ_DEL_RA),
      // Y la del automático de Embraer, que se pide por el avión. Ver `loQueSuenaEnEsteAvion`.
      VOZ_DEL_AUTOMATICO_DE_EMBRAER,
    ]);
    expect(grabadas.filter((c) => !apuntadas.has(c))).toEqual([]);
  });

  it("y la tabla no apunta a grabaciones que no existen", () => {
    const hay = new Set(grabadas);
    expect(
      Object.values(CLAVE_DE_CABINA).filter(
        (c) => !hay.has(c) && !ESPERAN_SU_TOMA.has(c),
      ),
    ).toEqual([]);
  });

  /*
   * **Y las que esperan su toma, la esperan de verdad**: en cuanto se graban
   * salen de `ESPERAN_SU_TOMA`, que es una excepción y no un cajón. Y el
   * juego las pide solo por `cantarLoGrabado`, que mira antes si están en el
   * pack: por `cantar`, en el peldaño de cabina, sin toma las diría la voz del
   * navegador —y en el Brave de Enrique, nadie—.
   */
  it("y lo que espera su toma no está grabado, y solo se pide si lo está", () => {
    const hay = new Set(grabadas);
    const apuntadas = new Set(Object.values(CLAVE_DE_CABINA));
    for (const c of ESPERAN_SU_TOMA) {
      expect(hay.has(c), `${c} ya tiene toma: sácala de ESPERAN_SU_TOMA`).toBe(false);
      expect(apuntadas.has(c), c).toBe(true);
    }
    const porCantar = loQueCantaElJuego().map(claveDeCabina);
    for (const c of ESPERAN_SU_TOMA) expect(porCantar, c).not.toContain(c);
    const porLoGrabado = loQueCantaElJuego("this.cantarLoGrabado(").map(claveDeCabina);
    for (const c of ESPERAN_SU_TOMA) expect(porLoGrabado, c).toContain(c);
  });

  it("reconoce la llamada tal y como la pide el juego", () => {
    expect(claveDeCabina("V one")).toBe("cabina.v1");
    expect(claveDeCabina("rotate")).toBe("cabina.vr");
    expect(claveDeCabina("five hundred")).toBe("cabina.fiveHundred");
  });

  it("y la reconoce con cola, que es como salen dos de ellas", () => {
    expect(claveDeCabina("go around, runway occupied")).toBe(
      "cabina.goAroundOrder",
    );
    expect(claveDeCabina("go around")).toBe("cabina.goAroundOrder");
  });

  it("y la orden de frustrar no suena con el elogio de después", () => {
    /*
     * `cabina.goAround` se grabó con «going around. good decision», y la
     * orden «go around» apuntaba a ella: en el peldaño de cabina, al mandar
     * frustrar, se oía el elogio antes de que nadie hiciera nada.
     */
    expect(claveDeCabina("going around. good decision")).toBe(
      "cabina.goAround",
    );
    expect(claveDeCabina("go around")).not.toBe(
      claveDeCabina("going around. good decision"),
    );
  });

  it("y «too low» no se queda con «too low, climb»", () => {
    expect(claveDeCabina("too low")).toBe("cabina.tooLow");
    expect(claveDeCabina("too low, climb")).toBe("cabina.tooLowClimb");
  });

  it("lo que el juego no dice se queda sin clave", () => {
    /*
     * **Y el ejemplo dejó de moverse, que costó cuatro vueltas.**
     *
     * Esta prueba usaba como ejemplo frases «todavía sin grabar», y fallaba
     * cada vez que alguien hacía su trabajo: cayó con «minimums», con «sink
     * rate» y con «positive rate». Falló bien —avisaba de que el ejemplo
     * caducaba— pero un ejemplo que caduca cada semana es un ejemplo mal
     * elegido.
     *
     * Ahora son dos que **no van a estar**, y por decisión y no por pereza:
     *
     * - «retard» es la llamada de un Airbus en la recogida, y en esta flota
     *   no hay ninguno: el JAZ 90 es de la clase del E170, cuyas voces no la
     *   llevan —sus gases van al ralentí en silencio, ver `flight/recogida.ts`—.
     *   La regla de la casa es que un aviso sonoro solo se pone en un avión
     *   que lo llevaría.
     * - «cleared to land» es de la torre, no de la cabina: tiene su propia
     *   voz, su propia tabla y su propio pack.
     *
     * Lo que se comprueba, entonces, es lo de siempre y mejor dicho: esta
     * tabla es para lo que **esta** cabina canta, y no un cajón donde meter
     * frases de aviación.
     */
    expect(claveDeCabina("retard")).toBe(null);
    expect(claveDeCabina("cleared to land")).toBe(null);
  });

  /*
   * **Y todo lo que el juego canta en inglés tiene su toma**, o está aquí
   * dicho por qué no.
   *
   * «Four hundred→sin clave», «airspeed low→navegador(sin voz)»: cantos que
   * el juego pedía y el pack no tenía, y que por eso decía el sintetizador del
   * navegador —o nadie, donde no hay voces instaladas—. Una tabla escrita a
   * mano se queda atrás en cuanto alguien añade un canto; ésta se lee del
   * propio `game.ts`.
   */
  it("cada canto que pide el juego tiene toma de cabina", () => {
    /*
     * Los que no la tienen a propósito: no son cantos de ninguna cabina de
     * verdad —un elogio, un consejo— y en el peldaño de cabina los dice la
     * instructora con su grabación. Y «cleared to land» es de la torre.
     */
    const SIN_TOMA_A_PROPOSITO = new Set([
      "on the glide path",
      "flaps",
      "cleared to land",
    ]);
    const pedidos = [
      ...loQueCantaElJuego(),
      ...loQueCantaElJuego("this.cantarLoGrabado("),
      ...LA_CUENTA.map((e) => e.dice),
      // Y los del consejero de la bajada, que se piden desde su módulo.
      ...CANTOS_DEL_CONSEJO,
    ];
    // Y que el lector vea lo que tiene que ver, ramas de ternario incluidas:
    // una regla de medir que no ve nada da siempre verde.
    expect(pedidos).toEqual(
      expect.arrayContaining([
        "airspeed low",
        "stall, stall",
        "going around. good decision",
        "too fast",
        "off the runway",
        "go around, runway occupied",
        "too low, climb",
      ]),
    );
    const sinToma = pedidos.filter(
      (p) => !claveDeCabina(p) && !SIN_TOMA_A_PROPOSITO.has(p),
    );
    expect(sinToma).toEqual([]);
  });

  /*
   * **Y ya no hay cuenta en casa.** La instructora contaba en metros en los
   * aviones sin radioaltímetro —«cuatrocientos, trescientos, doscientos» todo
   * seguido, y un «cinco» ya rodando—, que es una cuenta que no existe en
   * ninguna cabina. Si vuelve a aparecer una clave así, esto lo dice.
   */
  it("y la cuenta de la toma no tiene versión en casa", () => {
    expect(fuenteDelJuego).not.toMatch(/["'`]cuenta\./);
  });
});

/*
 * **Qué avión canta qué.** Un aviso sonoro solo se pone en un avión que lo
 * llevaría: la cuenta del radioaltímetro, el «terrain» o el «stall, stall»
 * los dice una caja que lleva el de transporte y no la avioneta de escuela.
 */
describe("los cantos de cada avión", () => {
  it("la avioneta de escuela no lleva radioaltímetro que cante", () => {
    expect(loDiceElAvion("cabina.fifty", PYKASU)).toBe(false);
    expect(loDiceElAvion("cabina.terrainPullUp", PYKASU)).toBe(false);
    expect(loDiceElAvion("cabina.stall", PYKASU)).toBe(false);
  });

  it("ni el bimotor de pistón, aunque meta el tren", () => {
    expect(loDiceElAvion("cabina.fiveHundred", PANAMBI)).toBe(false);
    // Y lo que dice quien vuela, sí: «gear up» no lo dice una caja.
    expect(loDiceElAvion("cabina.gearUp", PANAMBI)).toBe(true);
  });

  it("el turbohélice de pasaje y los reactores, sí", () => {
    for (const a of [ARASUNU, ARAI])
      for (const clave of DE_LOS_AVISADORES) {
        // Los de a bordo, cada tipo a su manera: ver el bloque de abajo.
        if (DE_A_BORDO[clave]) continue;
        expect(loDiceElAvion(clave, a), `${a.id} ${clave}`).toBe(
          // Menos el *minimums* del JAZ 60: ver el siguiente.
          !(a === ARASUNU && clave === "cabina.minimums"),
        );
      }
  });

  /*
   * **Y *minimums*, solo con la fuente de su clase.** No lo pide la norma del
   * TAWS —es de las llamadas que elige quien lo instala (FAA, AC 23-18)— y en
   * el JAZ 60 no se ha encontrado: ahí lo dice la instructora.
   */
  it("y *minimums* lo canta la caja del E-Jet y no la del JAZ 60", () => {
    expect(loDiceElAvion("cabina.minimums", ARAI)).toBe(true);
    expect(loDiceElAvion("cabina.minimums", ARASUNU)).toBe(false);
    expect(loDiceElAvion("cabina.minimums", PYKASU)).toBe(false);
    for (const a of AIRCRAFT)
      expect(loDiceElAvion("cabina.minimums", a), a.id).toBe(a.avisosHablados && a.cantaLosMinimos);
  });

  it("y el «traffic, traffic» lo canta quien lleva TCAS, y nadie más", () => {
    for (const a of AIRCRAFT)
      expect(loDiceElAvion("cabina.traffic", a), a.id).toBe(a.tcas !== null);
  });

  it("y la maniobra del RA, solo el TCAS II: el TCAS I solo avisa", () => {
    for (const a of AIRCRAFT)
      for (const clave of Object.values(VOZ_DEL_RA)) {
        expect(loDiceElAvion(clave, a), `${a.id} ${clave}`).toBe(a.tcas === "TCAS II");
        // Y es de una caja: suena en los cuatro peldaños, con su voz de máquina.
        expect(esDeUnaCaja(clave), clave).toBe(true);
      }
  });

  it("y los de la tripulación los canta cualquiera", () => {
    for (const a of AIRCRAFT) expect(loDiceElAvion("cabina.vr", a)).toBe(true);
  });

  /*
   * **Menos los de la carrera de aterrizaje**, que son de un procedimiento
   * (punto 259, leídos en sus manuales): los de Boeing, en el JAZ 120 y en el JAZ
   * 110, como el FCOM del 747-400 —aerofrenos y sesenta nudos, y las reversas sin
   * cantarlas—; y en el JAZ 90 ninguno, que el SOPM de Embraer no los lleva.
   * En la flota no hay ningún Airbus.
   */
  it("y los de la carrera, solo los de su manual: los dos grandes los de Boeing, el JAZ 90 ninguno", () => {
    const del747 = new Set(["cabina.speedbrakesUp", "cabina.speedbrakesNotUp", "cabina.sixtyKnots"]);
    for (const a of AIRCRAFT)
      for (const clave of DE_LA_CARRERA) {
        const canta = (a.id === YVAGA.id || a.id === TIJERETA.id) && del747.has(clave);
        expect(loDiceElAvion(clave, a), `${a.id} ${clave}`).toBe(canta);
        // De la tripulación: suben por la escalera.
        expect(esDeUnaCaja(clave), clave).toBe(false);
      }
    // Las reversas, nadie: el 747-400 las mira sin cantarlas.
    for (const a of AIRCRAFT) expect(loDiceElAvion("cabina.reversersNormal", a), a.id).toBe(false);
    // El E-Jet, nada en la carrera.
    expect(loDiceElAvion("cabina.speedbrakesUp", ARAI)).toBe(false);
    expect(loDiceElAvion("cabina.sixtyKnots", ARAI)).toBe(false);
    expect(Object.values(CLAVE_DE_CABINA)).toEqual(expect.arrayContaining([...DE_LA_CARRERA]));
  });

  it("y todo lo de los avisadores está grabado", () => {
    const grabadas = new Set(Object.values(CLAVE_DE_CABINA));
    for (const c of DE_LOS_AVISADORES) expect(grabadas.has(c), c).toBe(true);
  });
});

/*
 * **La pérdida, la velocidad baja y el automático suenan como en su tipo**
 * (#178, ADR 0027, enmienda H10a). Colgaban los tres de `avisosHablados` y
 * los cuatro aviones de transporte los decían con voz.
 */
describe("los avisos de a bordo de cada tipo", () => {
  it("el 747 y el 787 no dicen ninguno: sacudidor, pitido y sirena", () => {
    for (const a of [YVAGA, TIJERETA]) {
      for (const clave of Object.keys(DE_A_BORDO))
        expect(loDiceElAvion(clave, a), `${a.id} ${clave}`).toBe(false);
      expect(loQueSuenaEnEsteAvion("cabina.stall", a)).toBe("mientras dura");
      expect(loQueSuenaEnEsteAvion("cabina.airspeedLow", a)).toBe(TONO_DE_A_BORDO.pitido);
      expect(loQueSuenaEnEsteAvion("cabina.autopilotDisconnect", a)).toBe(TONO_DE_A_BORDO.sirena);
      expect(a.avisosDeABordo?.perdida.suena).toBe("sacudidor");
    }
  });

  it("el E170 se suelta diciendo «autopilot», y su pérdida es el sacudidor", () => {
    expect(loDiceElAvion("cabina.autopilotDisconnect", ARAI)).toBe(false);
    expect(loQueSuenaEnEsteAvion("cabina.autopilotDisconnect", ARAI)).toBe(
      VOZ_DEL_AUTOMATICO_DE_EMBRAER,
    );
    expect(ARAI.avisosDeABordo?.perdida.suena).toBe("sacudidor");
  });

  it("el 1900D avisa la pérdida con bocina, sin voz, y no tiene voz de velocidad baja", () => {
    expect(loDiceElAvion("cabina.stall", ARASUNU)).toBe(false);
    expect(loQueSuenaEnEsteAvion("cabina.stall", ARASUNU)).toBe("mientras dura");
    expect(ARASUNU.avisosDeABordo?.perdida.suena).toBe("bocina");
    expect(loDiceElAvion("cabina.airspeedLow", ARASUNU)).toBe(false);
    expect(loQueSuenaEnEsteAvion("cabina.airspeedLow", ARASUNU)).toBeNull();
  });

  it("en la avioneta no hay caja: lo dice la instructora", () => {
    for (const a of [PYKASU, PANAMBI])
      for (const clave of Object.keys(DE_A_BORDO)) {
        expect(loDiceElAvion(clave, a)).toBe(false);
        expect(loQueSuenaEnEsteAvion(clave, a)).toBeNull();
      }
  });

  it("los tonos son de una caja, cada uno con su forma, y no son grabaciones", () => {
    for (const tono of Object.values(TONO_DE_A_BORDO)) {
      expect(esTonoDeABordo(tono)).toBe(true);
      expect(esDeUnaCaja(tono)).toBe(true);
      expect(FORMAS[tono].notas.length).toBeGreaterThan(0);
      expect(Object.values(CLAVE_DE_CABINA)).not.toContain(tono);
    }
    expect(esDeUnaCaja(VOZ_DEL_AUTOMATICO_DE_EMBRAER)).toBe(true);
  });

  /*
   * **La sirena del automático, como la midió la CAA en un 747**: ráfagas de
   * 260 ms separadas por 140, dos y media por segundo, que suben de tono (CAA
   * Paper 82017, tabla B1).
   */
  it("la sirena son ráfagas de 260 ms cada 400 que suben de tono", () => {
    const { notas } = FORMAS["tono.sirenaDelAutomatico"];
    for (const [i, n] of notas.entries()) {
      expect(n.dura).toBeCloseTo(0.26, 9);
      expect(n.hasta).toBeGreaterThan(n.desde);
      if (i > 0) expect(n.en - notas[i - 1]!.en).toBeCloseTo(0.4, 9);
    }
  });
});

