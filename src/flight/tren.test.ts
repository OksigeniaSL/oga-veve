/**
 * El tren: que tarde, que cueste y que no mienta.
 */

import { describe, expect, it } from "vitest";
import {
  AVISA_DESDE,
  CUESTA_EL_TREN,
  TARDA_EL_TREN,
  avisaDelTren,
  luzDeTren,
  mueveElTren,
  loQueCambiaElTren,
  sePuedeMeter,
  seVuelveADecir,
} from "./tren";

describe("el tren se mueve, no salta", () => {
  it("tarda lo suyo en salir", () => {
    let donde = 0;
    for (let t = 0; t < TARDA_EL_TREN - 1; t += 0.5) {
      donde = mueveElTren({ donde, quiero: true }, 0.5);
    }
    expect(donde).toBeLessThan(1);
    expect(donde).toBeGreaterThan(0.85);
  });

  it("y lo mismo en meterse", () => {
    let donde = 1;
    donde = mueveElTren({ donde, quiero: false }, TARDA_EL_TREN / 2);
    expect(donde).toBeCloseTo(0.5, 6);
  });

  it("no se pasa por ningún extremo", () => {
    expect(mueveElTren({ donde: 0.9, quiero: true }, 100)).toBe(1);
    expect(mueveElTren({ donde: 0.1, quiero: false }, 100)).toBe(0);
  });

  it("y con el paso parado no se mueve", () => {
    expect(mueveElTren({ donde: 0.4, quiero: true }, 0)).toBe(0.4);
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

describe("lo que cambia mover el tren", () => {
  /*
   * El signo es lo importante. Las fichas están medidas con el avión como
   * vuela hoy —patas fuera— así que con el tren fuera no cambia nada, y el
   * premio se lo lleva quien lo mete. La lección es la misma y llega por donde
   * tiene que llegar: por lo que hace quien juega.
   */
  it("con el tren fuera no cambia nada", () => {
    expect(loQueCambiaElTren(1)).toBe(0);
  });

  it("meterlo quita resistencia, no la suma", () => {
    expect(loQueCambiaElTren(0)).toBe(-CUESTA_EL_TREN);
  });

  it("y a medio camino, la mitad", () => {
    expect(loQueCambiaElTren(0.5)).toBeCloseTo(-CUESTA_EL_TREN / 2, 6);
  });

  it("y pesa casi tanto como el avión entero limpio", () => {
    // El `cd0` del bimotor son veintiséis milésimas: el tren es casi tanto, y
    // esa es la sensación que hay que dar al meterlo.
    expect(CUESTA_EL_TREN / 0.026).toBeGreaterThan(0.7);
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
