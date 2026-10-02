/**
 * La información de tráfico: cuándo la da la radio, y que no la repita.
 *
 * Lo que se comprueba es la regla de la casa para los avisos: **una vez por
 * suceso**, y vuelve solo si cambia lo que pasa —el otro se aleja de verdad y
 * vuelve a acercarse—, nunca porque pase un rato.
 */

import { describe, expect, it } from "vitest";
import {
  ENTRE_DOS,
  InformacionDeTrafico,
  alturaDelOtro,
  cifrasDelTrafico,
  informacionEnPiezas,
  informacionEnRadio,
  ladoDeLaHora,
  type QuienEscucha,
} from "./informacion-de-trafico";
import { Tcas, type Intruso } from "./tcas";

const MILLA = 1852;
const PIE = 0.3048;

/** Volando al norte a mil quinientos metros, lejos del suelo. */
const YO: QuienEscucha = {
  x: 0,
  y: 1500,
  z: 0,
  rumbo: 0,
  sobreElSuelo: 1200,
  enElSuelo: false,
  callado: false,
};

/** Uno a `millas` al este y `pies` por encima. */
const al = (id: string, millas: number, pies: number): Intruso => ({
  id,
  x: millas * MILLA,
  y: YO.y + pies * PIE,
  z: 0,
});

describe("cuándo se da", () => {
  it("cuando otro pasa a estar cerca: dentro de seis millas y mil doscientos pies", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 9, 1000)])).toBeNull();
    const dicha = info.paso(0.1, YO, [al("A", 4, 1000)]);
    expect(dicha).not.toBeNull();
    // Al este yendo al norte: a las tres. Y mil pies por encima.
    expect(dicha!.hora).toBe(3);
    expect(dicha!.relativa / PIE).toBeCloseTo(1000, 0);
  });

  it("y no si va más separado en altura, aunque esté al lado", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 2, 2000)])).toBeNull();
  });

  it("ni contra uno posado, ni con quien escucha en tierra o muy bajo", () => {
    const info = new InformacionDeTrafico();
    expect(
      info.paso(0.1, YO, [{ ...al("A", 2, 0), enElSuelo: true }]),
    ).toBeNull();
    expect(info.paso(0.1, { ...YO, enElSuelo: true }, [al("B", 2, 0)])).toBeNull();
    expect(info.paso(0.1, { ...YO, sobreElSuelo: 100 }, [al("B", 2, 0)])).toBeNull();
  });

  it("ni con el terreno avisando, que manda", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, { ...YO, callado: true }, [al("A", 2, 0)])).toBeNull();
  });
});

describe("una vez por pasada", () => {
  it("mientras siga cerca no se repite, pase el tiempo que pase", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
    for (let i = 0; i < 3000; i++)
      expect(info.paso(0.1, YO, [al("A", 3 - i * 0.0005, 500)])).toBeNull();
  });

  it("y vuelve si se aleja de verdad y se vuelve a acercar", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
    // A siete millas todavía cuenta como la misma pasada.
    expect(info.paso(ENTRE_DOS, YO, [al("A", 7, 500)])).toBeNull();
    expect(info.paso(ENTRE_DOS, YO, [al("A", 3, 500)])).toBeNull();
    // Pasadas las ocho, se olvida; al volver, se cuenta otra vez.
    expect(info.paso(ENTRE_DOS, YO, [al("A", 10, 500)])).toBeNull();
    expect(info.paso(ENTRE_DOS, YO, [al("A", 3, 500)])).not.toBeNull();
  });

  it("el que ya contó el TCAS no se cuenta otra vez", () => {
    const info = new InformacionDeTrafico();
    info.darPorContado("A");
    expect(info.paso(0.1, YO, [al("A", 2, 300)])).toBeNull();
  });

  it("y dos a la vez, de uno en uno: primero el más cerca", () => {
    const info = new InformacionDeTrafico();
    const dos = [al("lejos", 5, 800), al("cerca", 2, 800)];
    expect(info.paso(0.1, YO, dos)!.id).toBe("cerca");
    expect(info.paso(0.1, YO, dos)).toBeNull();
    expect(info.paso(ENTRE_DOS, YO, dos)!.id).toBe("lejos");
  });

  it("vuelo nuevo, todos sin contar", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
    info.reiniciar();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
  });
});

describe("cómo se dice", () => {
  it("en la radio, con la hora, las millas y la altura en pies", () => {
    expect(
      informacionEnRadio("Echo Charlie Oscar", {
        hora: 2,
        distancia: 3 * MILLA,
        relativa: 1000 * PIE,
      }),
    ).toBe("Echo Charlie Oscar, traffic, 2 o'clock, 3 miles, 1000 feet above");
    expect(
      informacionEnRadio("Echo", { hora: 11, distancia: 800, relativa: -500 * PIE }),
    ).toBe("Echo, traffic, 11 o'clock, 1 mile, 500 feet below");
    expect(
      informacionEnRadio("Echo", { hora: 12, distancia: 4000, relativa: 30 }),
    ).toBe("Echo, traffic, 12 o'clock, 2 miles, same level");
  });

  it("y en piezas grabadas, con los mismos números que la frase escrita", () => {
    expect(
      informacionEnPiezas({ hora: 2, distancia: 3 * MILLA, relativa: 1000 * PIE }),
    ).toEqual({
      hora: "trafico.hora.2",
      millas: "trafico.millas.3",
      altura: "trafico.pies.10 trafico.above",
    });
    expect(
      informacionEnPiezas({ hora: 11, distancia: 800, relativa: -500 * PIE }),
    ).toEqual({
      hora: "trafico.hora.11",
      millas: "trafico.millas.1",
      altura: "trafico.pies.5 trafico.below",
    });
    expect(
      informacionEnPiezas({ hora: 12, distancia: 4000, relativa: 30 }).altura,
    ).toBe("trafico.sameLevel");
  });

  it("y ninguna cifra se sale de lo grabado", () => {
    for (let m = 0; m <= 7 * MILLA; m += 97)
      for (let pies = -1300; pies <= 1300; pies += 37) {
        const c = cifrasDelTrafico({ hora: 3, distancia: m, relativa: pies * PIE });
        expect(c.millas).toBeGreaterThanOrEqual(1);
        expect(c.millas).toBeLessThanOrEqual(6);
        if (c.cientos !== null) {
          expect(c.cientos).toBeGreaterThanOrEqual(3);
          expect(c.cientos).toBeLessThanOrEqual(12);
        }
      }
  });

  it("y en casa, por el lado y la altura", () => {
    expect(ladoDeLaHora(12)).toBe("delante");
    expect(ladoDeLaHora(2)).toBe("derecha");
    expect(ladoDeLaHora(6)).toBe("detras");
    expect(ladoDeLaHora(9)).toBe("izquierda");
    expect(alturaDelOtro(300)).toBe("arriba");
    expect(alturaDelOtro(-300)).toBe("abajo");
    expect(alturaDelOtro(50)).toBe("nivel");
  });
});

/**
 * **Y el «traffic, traffic» se explica una vez por pasada.**
 *
 * El TCAS rearma su aviso cada vez que el otro sale de su volumen y vuelve a
 * entrar, y en un circuito con frustradas eso es cada vuelta: en La Gomera la
 * instructora dijo «mirá adelante: hay otro avión cerca» cinco veces, por el
 * mismo avión dando las mismas vueltas. La caja lo canta cada vez, que es lo
 * que hace una de verdad; lo que se explica en casa va con la regla de la
 * información de tráfico: se rearma cuando el otro se aleja de verdad o
 * aterriza. Es lo que hace `vigilarElTrafico` en `game.ts`: pregunta
 * `yaContados` antes de dar el aviso por contado.
 */
describe("el aviso del TCAS, explicado una vez por pasada", () => {
  it("dos circuitos que se cruzan una y otra vez: muchos avisos, una explicación", () => {
    const tcas = new Tcas();
    const info = new InformacionDeTrafico();
    const R = 2000;
    const V = 40;
    const ALTO = 600;
    let avisos = 0;
    let explicadas = 0;
    let informadas = 0;
    for (let t = 0; t < 1800; t += 0.5) {
      // Vos en tu circuito, el otro en el mismo al revés: se cruzan dos veces
      // por vuelta, de frente y a la misma altura.
      const a = (V / R) * t;
      const yo = { x: R * Math.cos(a), z: R * Math.sin(a) };
      const rumbo = ((Math.atan2(-Math.sin(a), -Math.cos(a)) * 180) / Math.PI + 360) % 360;
      const b = -a + Math.PI / 3;
      const otro: Intruso = {
        id: "circuito:EC-ABC",
        x: R * Math.cos(b),
        y: ALTO + 20,
        z: R * Math.sin(b),
      };
      for (const aviso of tcas.paso(
        0.5,
        "TCAS II",
        {
          x: yo.x,
          y: ALTO,
          z: yo.z,
          sobreElSuelo: ALTO,
          rumbo,
          pantalla: true,
          terrenoAvisando: false,
        },
        [otro],
      )) {
        avisos++;
        if (!info.yaContados.has(aviso.id)) explicadas++;
        info.darPorContado(aviso.id);
      }
      const dada = info.paso(
        0.5,
        {
          x: yo.x,
          y: ALTO,
          z: yo.z,
          rumbo,
          sobreElSuelo: ALTO,
          enElSuelo: false,
          callado: false,
        },
        [otro],
      );
      if (dada) informadas++;
    }
    // El instrumento ve el caso: el TCAS avisa muchas veces por el mismo.
    expect(avisos).toBeGreaterThan(4);
    // Y en casa se cuenta una vez, por la radio o con el aviso.
    expect(explicadas + informadas).toBe(1);
  });

  it("y si se aleja de verdad y vuelve, es otra pasada y se vuelve a contar", () => {
    const info = new InformacionDeTrafico();
    info.darPorContado("circuito:EC-ABC");
    expect(info.yaContados.has("circuito:EC-ABC")).toBe(true);
    info.paso(0.5, YO, [al("circuito:EC-ABC", 10, 0)]);
    expect(info.yaContados.has("circuito:EC-ABC")).toBe(false);
  });
});

/**
 * **Con la boca ocupada, pide turno y espera mientras sea verdad.**
 *
 * Esperaba a que nadie hablara ni esperara turno, y en una final con todos en
 * el mismo turno eso no llegaba: camino de Tenerife Sur con el JAZ 90, el del
 * circuito a doscientos pies en tu final y doce segundos sin una palabra,
 * «callado: la boca (hablando, 2 en cola)». Ahora se pide en cuanto toca y lo
 * que se mira mientras espera es si sigue siendo verdad. Ver `revisar`.
 */
describe("y con la boca ocupada, pide turno", () => {
  /** Cómo se diría: la hora, las millas y la altura, como la clave de turno. */
  const comoSeDice = (a: Parameters<typeof cifrasDelTrafico>[0]) =>
    JSON.stringify(cifrasDelTrafico(a));

  it("y mientras espera no se da otra; al sonar, sigue la regla de siempre", () => {
    const info = new InformacionDeTrafico();
    const dos = [al("A", 2, 300), al("B", 4, 300)];
    const n = info.pedida("A", comoSeDice(info.paso(0.1, YO, dos)!));
    expect(info.esperando?.id).toBe("A");
    expect(info.paso(ENTRE_DOS, YO, dos)).toBeNull();
    expect(info.porQueCalla).toBe("esperando turno");
    info.seOyo(n);
    expect(info.esperando).toBeNull();
    expect(info.paso(ENTRE_DOS, YO, dos)?.id).toBe("B");
  });

  it("contado quiere decir oído: el TCAS explica entero lo que todavía espera", () => {
    const info = new InformacionDeTrafico();
    const n = info.pedida("A", comoSeDice(info.paso(0.1, YO, [al("A", 2, 300)])!));
    expect(info.yaContados.has("A")).toBe(true);
    expect(info.yaInformado("A")).toBe(false);
    info.seOyo(n);
    expect(info.yaInformado("A")).toBe(true);
  });

  it("si se cae de la cola sin sonar, no cuenta y se vuelve a dar", () => {
    const info = new InformacionDeTrafico();
    const n = info.pedida("A", comoSeDice(info.paso(0.1, YO, [al("A", 2, 300)])!));
    info.seCayo(n);
    expect(info.esperando).toBeNull();
    // Sin esperar el rato entre dos: ese rato es para dos que se oyen.
    expect(info.paso(0.1, YO, [al("A", 2, 300)])?.id).toBe("A");
  });

  it("si el otro se aleja mientras espera, se retira y no cuenta como dicha", () => {
    const info = new InformacionDeTrafico();
    const dice = comoSeDice(info.paso(0.1, YO, [al("A", 2, 300)])!);
    info.pedida("A", dice);
    expect(info.revisar(YO, [al("A", 2, 300)], comoSeDice)).toBeNull();
    expect(info.revisar(YO, [al("A", 7, 300)], comoSeDice)).toEqual({ retirar: dice });
    expect(info.esperando).toBeNull();
    // Y si vuelve, se cuenta: la primera vez no se oyó.
    expect(info.paso(0.1, YO, [al("A", 3, 300)])?.id).toBe("A");
  });

  it("y bajando de quinientos pies, o con el terreno, también se retira", () => {
    for (const yo of [{ ...YO, sobreElSuelo: 100 }, { ...YO, callado: true }]) {
      const info = new InformacionDeTrafico();
      const dice = comoSeDice(info.paso(0.1, YO, [al("A", 2, 300)])!);
      info.pedida("A", dice);
      expect(info.revisar(yo, [al("A", 2, 300)], comoSeDice)?.retirar).toBe(dice);
    }
  });

  it("si lo que diría ya es otro, se pide con lo de ahora, y lo de antes ya no cuenta", () => {
    const info = new InformacionDeTrafico();
    const antes = info.paso(0.1, YO, [al("A", 2, 300)])!;
    const n = info.pedida("A", comoSeDice(antes));
    // Pasa de las tres a las doce, a milla y media por delante.
    const delante: Intruso = { id: "A", x: 0, y: YO.y + 300 * PIE, z: -1.5 * MILLA };
    const r = info.revisar(YO, [delante], comoSeDice);
    expect(r?.retirar).toBe(comoSeDice(antes));
    expect(r?.otra?.aviso.hora).toBe(12);
    expect(info.esperando?.n).toBe(r?.otra?.n);
    // La que se retira avisa de que se cae: ya no es la que espera.
    info.seCayo(n);
    expect(info.esperando?.n).toBe(r?.otra?.n);
    // Y mientras diga lo mismo, no se toca.
    expect(info.revisar(YO, [delante], comoSeDice)).toBeNull();
  });

  it("y si lo cuenta otro mientras espera, se retira: un suceso, una voz", () => {
    const info = new InformacionDeTrafico();
    const dice = comoSeDice(info.paso(0.1, YO, [al("A", 2, 300)])!);
    const n = info.pedida("A", dice);
    expect(info.darPorContado("B")).toBeNull();
    expect(info.darPorContado("A")).toBe(dice);
    expect(info.esperando).toBeNull();
    // El aviso de la que se retira no la descuenta: ya la contó otro.
    info.seCayo(n);
    expect(info.paso(ENTRE_DOS, YO, [al("A", 2, 300)])).toBeNull();
  });
});
