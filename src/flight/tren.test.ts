/**
 * El tren: que tarde, que cueste y que no mienta.
 */

import { describe, expect, it } from "vitest";
import {
  AVISA_DESDE,
  LO_MAS_QUE_TARDA_EL_TREN,
  avisaDelTren,
  luzDeTren,
  luzRojaDelTren,
  mueveElTren,
  resistenciaDelTren,
  sePuedeMeter,
  seVuelveADecir,
} from "./tren";
import { AIRCRAFT, aircraftById } from "./aircraft";
import { DETENTES, resistenciaDeLosFlaps } from "./flaps";

describe("el tren se mueve, no salta", () => {
  const tarda = { sale: 8, entra: 6 };

  it("tarda lo suyo en salir", () => {
    let donde = 0;
    for (let t = 0; t < tarda.sale - 1; t += 0.5) {
      donde = mueveElTren({ donde, quiero: true }, 0.5, tarda);
    }
    expect(donde).toBeLessThan(1);
    expect(donde).toBeGreaterThan(0.85);
  });

  it("y lo suyo en meterse, que no tiene por qué ser lo mismo", () => {
    let donde = 1;
    donde = mueveElTren({ donde, quiero: false }, tarda.entra / 2, tarda);
    expect(donde).toBeCloseTo(0.5, 6);
  });

  it("no se pasa por ningún extremo", () => {
    expect(mueveElTren({ donde: 0.9, quiero: true }, 100, tarda)).toBe(1);
    expect(mueveElTren({ donde: 0.1, quiero: false }, 100, tarda)).toBe(0);
  });

  it("y con el paso parado no se mueve", () => {
    expect(mueveElTren({ donde: 0.4, quiero: true }, 0, tarda)).toBe(0.4);
  });
});

/**
 * **Lo que tarda es de cada avión**, que eran diez segundos para todos.
 *
 * «Tarda mucho en ponerse y quitarse; creo que en los aviones tarda poco.» El
 * bimotor de pistón tardaba lo de un avión de línea. Ahora cada ficha dice lo
 * suyo y de dónde lo saca; aquí se mira que lo diga quien tiene que decirlo y
 * que no se salga de lo que tarda un tren de verdad.
 */
describe("el tren tarda lo de su avión", () => {
  it("el que mete el tren dice lo que tarda, y el de tren fijo no", () => {
    for (const a of AIRCRAFT) {
      if (a.trenRetractil) expect(a.tardaElTren, a.id).not.toBeNull();
      else expect(a.tardaElTren, a.id).toBeNull();
    }
  });

  it("entre los cuatro y los quince segundos, a salir y a entrar", () => {
    for (const a of AIRCRAFT) {
      if (!a.tardaElTren) continue;
      for (const s of [a.tardaElTren.sale, a.tardaElTren.entra]) {
        expect(s, a.id).toBeGreaterThanOrEqual(4);
        expect(s, a.id).toBeLessThanOrEqual(15);
      }
    }
  });

  it("y el bimotor de pistón, lo de su manual: seis o siete segundos", () => {
    // PA-34 Seneca II, manual de vuelo, sección 7: «gear extension or
    // retraction normally takes six to seven seconds».
    const t = aircraftById("jaz-40").tardaElTren!;
    expect(t.sale).toBeLessThanOrEqual(7);
    expect(t.entra).toBeLessThanOrEqual(7);
  });

  it("y nadie tarda más que el tope de la flota, que es el que esperan los bancos", () => {
    for (const a of AIRCRAFT) {
      if (!a.tardaElTren) continue;
      expect(a.tardaElTren.sale, a.id).toBeLessThanOrEqual(LO_MAS_QUE_TARDA_EL_TREN);
      expect(a.tardaElTren.entra, a.id).toBeLessThanOrEqual(LO_MAS_QUE_TARDA_EL_TREN);
    }
  });
});

describe("con el peso encima no se mete", () => {
  it("en el suelo, no", () => {
    expect(sePuedeMeter(true)).toBe(false);
  });

  it("en el aire, sí", () => {
    expect(sePuedeMeter(false)).toBe(true);
  });
});

describe("lo que cuesta llevar el tren fuera", () => {
  /*
   * **Fuera se suma; dentro no se resta.** Meterlo restaba veinte milésimas a
   * un `cd0` que ya era el del avión limpio, y dejaba el JAZ 90 en cero y el
   * JAZ 120 en −0,003: un avión que el aire empuja. Es el #170.
   */
  const jaz90 = aircraftById("jaz-90");

  it("con el tren dentro no cambia nada", () => {
    expect(resistenciaDelTren(jaz90, 0)).toBe(0);
  });

  it("y fuera suma, nunca resta", () => {
    expect(resistenciaDelTren(jaz90, 1)).toBeGreaterThan(0);
  });

  it("y a medio camino, la mitad", () => {
    expect(resistenciaDelTren(jaz90, 0.5)).toBeCloseTo(
      resistenciaDelTren(jaz90, 1) / 2,
      6,
    );
  });

  it("en los de tren fijo va ya dentro de su cd0, y no se cuenta dos veces", () => {
    for (const a of AIRCRAFT.filter((x) => !x.trenRetractil))
      expect(resistenciaDelTren(a, 1), a.id).toBe(0);
  });

  /*
   * La correlación de Mair y Birdsall (ecuación 6.1) con la masa y el ala de
   * cada ficha, contra la tabla 3.6 de Roskam, parte I: de 0,015 a 0,025 con
   * el tren fuera. Los dos de hélice, de ruedas pequeñas bajo un ala baja,
   * quedan algo por debajo, que es el lado que Roskam da a los de ala baja.
   */
  it("cuesta lo que dicen los libros para un avión de su clase", () => {
    const limpio = (id: string) => resistenciaDelTren(aircraftById(id), 1, 0);
    expect(limpio("jaz-90")).toBeCloseTo(0.0259, 3);
    expect(limpio("jaz-120")).toBeCloseTo(0.0196, 3);
    expect(limpio("jaz-60")).toBeCloseTo(0.0128, 3);
    expect(limpio("jaz-40")).toBeCloseTo(0.0117, 3);
    for (const a of AIRCRAFT.filter((x) => x.trenRetractil)) {
      expect(resistenciaDelTren(a, 1, 0), a.id).toBeGreaterThan(0.01);
      expect(resistenciaDelTren(a, 1, 0), a.id).toBeLessThan(0.03);
    }
  });

  it("y con los flaps abajo cuesta menos: le quitan corriente a las patas", () => {
    expect(resistenciaDelTren(jaz90, 1, 1)).toBeLessThan(
      resistenciaDelTren(jaz90, 1, 0),
    );
    // De 5,81 a 3,16: el 54 %.
    expect(
      resistenciaDelTren(jaz90, 1, 1) / resistenciaDelTren(jaz90, 1, 0),
    ).toBeCloseTo(3.16 / 5.81, 3);
  });

  /*
   * **La prueba que pedía el #170**: ningún avión de la flota se queda sin
   * resistencia parásita, con ninguna combinación de tren y flaps. Y ninguna
   * combinación le quita al avión nada de lo que tiene limpio.
   */
  it("ningún avión se queda con resistencia parásita cero o negativa", () => {
    for (const a of AIRCRAFT)
      for (const tren of [0, 0.25, 0.5, 1])
        for (const flaps of [...DETENTES, 0.5]) {
          const parasita =
            a.aero.cd0 +
            resistenciaDeLosFlaps(a, flaps) +
            resistenciaDelTren(a, tren, flaps);
          expect(parasita, `${a.id} tren ${tren} flaps ${flaps}`).toBeGreaterThan(
            0.01,
          );
          expect(parasita, a.id).toBeGreaterThanOrEqual(a.aero.cd0);
        }
  });
});

describe("las luces no mienten", () => {
  it("verde solo cuando está fuera y trabado", () => {
    expect(luzDeTren(1)).toBe("fuera");
    expect(luzDeTren(0.99)).toBe("moviendose");
  });

  it("y apagado cuando está dentro del todo", () => {
    expect(luzDeTren(0)).toBe("dentro");
    expect(luzDeTren(0.01)).toBe("moviendose");
  });
});

describe("la luz roja del tren", () => {
  it("apagada con el tren donde dice la palanca: abajo, o arriba", () => {
    expect(luzRojaDelTren(1, true)).toBe(false);
    expect(luzRojaDelTren(0, false)).toBe(false);
  });

  it("encendida mientras viaja, en los dos sentidos", () => {
    // Saliendo: palanca abajo y el tren todavía a medio camino.
    expect(luzRojaDelTren(0, true)).toBe(true);
    expect(luzRojaDelTren(0.6, true)).toBe(true);
    expect(luzRojaDelTren(0.99, true)).toBe(true);
    // Y metiéndose, desde el primer centímetro: antes no se encendía hasta
    // pasar de la mitad.
    expect(luzRojaDelTren(0.99, false)).toBe(true);
    expect(luzRojaDelTren(0.01, false)).toBe(true);
  });

  it("y subiendo con el tren metido no hay nada que decir", () => {
    // Era el fallo: «dentro, bajo y lento» es toda la subida inicial de quien
    // hace lo correcto. La altura y la velocidad no pintan nada aquí.
    expect(luzRojaDelTren(0, false, false)).toBe(false);
  });

  it("pero viniendo a aterrizar sin él, sí, como la de un reactor", () => {
    expect(luzRojaDelTren(0, false, true)).toBe(true);
  });
});

describe("el aviso de aterrizar sin tren", () => {
  it("avisa bajo, bajando y sin tren", () => {
    expect(avisaDelTren(0, AVISA_DESDE - 10, true)).toBe(true);
  });

  it("no avisa con el tren fuera", () => {
    expect(avisaDelTren(1, 50, true)).toBe(false);
  });

  it("ni subiendo", () => {
    expect(avisaDelTren(0, 50, false)).toBe(false);
  });

  it("ni arriba, que ahí no hay prisa", () => {
    expect(avisaDelTren(0, AVISA_DESDE + 10, true)).toBe(false);
  });

  it("y con el tren a medias todavía avisa: no está trabado", () => {
    expect(avisaDelTren(0.8, 100, true)).toBe(true);
  });
});

describe("y no se avisa de lo que ya se ha hecho", () => {
  /*
   * «Si ya bajé el tren en la aproximación, ¿para qué me dice "sacá el tren"?»
   *
   * Porque el aviso miraba **dónde está** el tren y no **qué se ha pedido**, y
   * un tren tarda diez segundos en salir: quien lo bajaba a trescientos metros
   * y seguía descendiendo cruzaba los doscientos cincuenta con el tren a medio
   * camino y se llevaba la bronca por algo que acababa de hacer.
   */
  it("con el tren a medio salir pero ya pedido, no avisa", () => {
    expect(avisaDelTren(0.4, 200, true, true)).toBe(false);
    expect(avisaDelTren(0, 200, true, true)).toBe(false);
  });

  it("y sin pedirlo sí, que para eso está", () => {
    expect(avisaDelTren(0.4, 200, true, false)).toBe(true);
    expect(avisaDelTren(0, 200, true, false)).toBe(true);
  });

  it("y lo demás sigue mandando: alto o sin bajar, no hay aviso", () => {
    expect(avisaDelTren(0, AVISA_DESDE + 1, true, false)).toBe(false);
    expect(avisaDelTren(0, 100, false, false)).toBe(false);
    // Y con el tren fuera del todo tampoco, esté pedido o no.
    expect(avisaDelTren(1, 100, true, false)).toBe(false);
  });
});

describe("y solo viniendo a aterrizar", () => {
  /*
   * «Bajo y bajando» describe también el despegue: se mete el tren, el avión
   * pega la sacudida de quedarse limpio, baja medio metro por segundo un par
   * de segundos y sigue por debajo de los doscientos cincuenta. Dicho jugando:
   * «me ha vuelto a poner el icono del tren cuando ya lo había guardado».
   */
  it("fuera del embudo de final no avisa, aunque esté bajo y bajando", () => {
    expect(avisaDelTren(0, 120, true, false, false)).toBe(false);
  });

  it("y dentro sí, que es para lo que existe", () => {
    expect(avisaDelTren(0, 120, true, false, true)).toBe(true);
  });

  it("y lo ya pedido manda sobre todo lo demás", () => {
    // Aunque se venga en final, bajo y bajando: si ya lo pediste, no hay nada
    // que avisar. Ver `sePide`.
    expect(avisaDelTren(0.3, 120, true, true, true)).toBe(false);
  });
});

describe("el aviso se dice una vez por decisión, no cada rato", () => {
  /*
   * Medido con el instrumento de cantos: subiendo de trescientos a novecientos
   * metros, «metélo, el tren» salía ocho veces. Nada había cambiado entre una
   * y la siguiente salvo el reloj. Ver `seVuelveADecir`.
   */
  it("sin nada dicho, se dice", () => {
    expect(seVuelveADecir(null, "mete", true)).toBe(true);
    expect(seVuelveADecir(null, "saca", false)).toBe(true);
  });

  it("y dicho ya, con el mando igual, se calla", () => {
    const dicho = { que: "mete", pedido: true } as const;
    expect(seVuelveADecir(dicho, "mete", true)).toBe(false);
  });

  it("aunque pase todo el rato del mundo: no hay reloj que lo rearme", () => {
    // La firma no tiene tiempo a propósito. Si algún día vuelve a tenerlo,
    // esta prueba deja de compilar y hay que explicar por qué.
    expect(seVuelveADecir.length).toBe(3);
  });

  it("y en cuanto se toca el mando, vuelve a tener sentido", () => {
    const dicho = { que: "mete", pedido: true } as const;
    expect(seVuelveADecir(dicho, "mete", false)).toBe(true);
  });

  it("y el otro aviso no lo tapa el primero", () => {
    // Dicho «metélo» y después, ya sin tren pedido, toca «sacálo»: son dos
    // cosas distintas y la segunda se dice.
    const dicho = { que: "mete", pedido: true } as const;
    expect(seVuelveADecir(dicho, "saca", false)).toBe(true);
  });

  it("una subida entera con las patas fuera se avisa una sola vez", () => {
    let dicho: { que: "mete" | "saca"; pedido: boolean } | null = null;
    let veces = 0;
    // Cuatro minutos de subida, paso de medio segundo, sin tocar el mando.
    for (let t = 0; t < 240; t += 0.5) {
      if (seVuelveADecir(dicho, "mete", true)) {
        veces++;
        dicho = { que: "mete", pedido: true };
      }
    }
    expect(veces).toBe(1);
  });
});
