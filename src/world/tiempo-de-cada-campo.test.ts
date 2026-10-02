/**
 * **El tiempo de cada campo**: que el destino tenga su parte y no el de la
 * salida, que entre medias el aire pase de uno a otro sin saltos, y que con
 * viento flojo mande la pista preferente de cada sitio.
 *
 * Se vio llegando a El Hierro desde La Palma: el viento, la manga, la
 * cabecera y la torre de El Hierro salían del 150/3 del METAR de La Palma.
 * Ver `tiempoEntreCampos` en `meteo.ts` y `ponerTiempoDe` en `game.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  atisEnTexto,
  deFrente,
  leerMetar,
  tiempoEntreCampos,
  vientoComoVector,
  vientoDeCasa,
  type Meteo,
} from "./meteo";
import { EL_HIERRO, LA_PALMA, TENERIFE_NORTE, conViento } from "./scenarios";
import { campoVecino } from "./campo-del-vuelo";
import { cabeceraEnUso } from "./terrain";

const con = (vientoDe: number | null, vientoKt: number, extra: Partial<Meteo> = {}): Meteo => ({
  ...vientoDeCasa(undefined),
  vientoDe,
  vientoKt,
  fuente: "metar",
  ...extra,
});

describe("el viento entre dos campos", () => {
  const A = { x: 0, z: 0, meteo: con(360, 20, { qnh: 1020 }) };
  const B = { x: 100000, z: 0, meteo: con(180, 10, { qnh: 1010 }) };

  it("encima de cada campo sopla el suyo", () => {
    const enA = tiempoEntreCampos([A, B], 0, 0);
    expect(enA.vientoDe).toBeCloseTo(360 % 360, 0);
    expect(enA.vientoKt).toBeGreaterThan(19.9);
    expect(enA.qnh).toBeCloseTo(1020, 1);
    const enB = tiempoEntreCampos([A, B], 100000, 0);
    expect(enB.vientoDe).toBeCloseTo(180, 0);
    expect(enB.vientoKt).toBeCloseTo(10, 1);
    expect(enB.qnh).toBeCloseTo(1010, 1);
  });

  it("y a dos kilómetros de uno, casi entero el suyo", () => {
    const cerca = tiempoEntreCampos([A, B], 2000, 0);
    expect(cerca.vientoKt).toBeGreaterThan(19.8);
    expect(cerca.qnh).toBeGreaterThan(1019.9);
  });

  it("y entre medias pasa de uno a otro sin saltos", () => {
    let antes = tiempoEntreCampos([A, B], 0, 0).aire;
    for (let x = 1000; x <= 100000; x += 1000) {
      const ahora = tiempoEntreCampos([A, B], x, 0).aire;
      // Ni un metro por segundo de golpe en un kilómetro.
      expect(Math.hypot(ahora.x - antes.x, ahora.z - antes.z)).toBeLessThan(1);
      antes = ahora;
    }
  });

  it("y el vector del motor de vuelo es el mismo que el del parte", () => {
    const solo = tiempoEntreCampos([A], 5, 5);
    const v = vientoComoVector(A.meteo);
    expect(solo.aire.x).toBeCloseTo(v.x, 6);
    expect(solo.aire.z).toBeCloseTo(v.z, 6);
  });

  it("en calma en todos, calma", () => {
    const calma = tiempoEntreCampos([{ x: 0, z: 0, meteo: con(null, 0) }], 0, 0);
    expect(calma.vientoDe).toBeNull();
    expect(calma.vientoKt).toBe(0);
  });
});

describe("con viento flojo manda la pista preferente de cada campo", () => {
  const nombre = (e: typeof EL_HIERRO) => cabeceraEnUso(e);

  /*
   * El caso de la captura: el 150/3 de La Palma. Por la componente, la 16 de
   * El Hierro gana por tres nudos; pero la preferente es la 34, y tres nudos
   * de cola están dentro de los cinco que se aguantan.
   */
  it("El Hierro con 150/3 sigue en la 34", () => {
    expect(nombre(conViento(EL_HIERRO, con(150, 3)))).toBe("34");
  });

  it("y como destino también, que es donde fallaba", () => {
    const campo = campoVecino(EL_HIERRO, { x: 50000, z: 90000 }, null, con(150, 3));
    expect(cabeceraEnUso(campo.escenario)).toBe("34");
  });

  it("y con su propio tiempo típico, la 34", () => {
    expect(nombre(conViento(EL_HIERRO, vientoDeCasa(EL_HIERRO.vientoDominante)))).toBe(
      "34",
    );
  });

  it("pero con viento de verdad del sur se cambia", () => {
    const sur = conViento(EL_HIERRO, con(150, 12));
    expect(nombre(sur)).toBe("16");
    expect(deFrente(sur.runway.heading, con(150, 12))).toBeGreaterThan(0);
  });

  /*
   * **La Palma, con la preferente del AIP**: la 36 mientras la cola no pase de
   * diez nudos (AD 2-GCLA, 20.3). Estaba escrita la 18 con los cinco de
   * siempre, y con el viento de costado que marcaba la pantalla de navegación
   * llegando allí —089/4— ganaba la 18 por empate: la final recta calculada
   * sobre Barlovento.
   */
  it("La Palma, con viento de costado o en calma, la 36", () => {
    expect(nombre(conViento(LA_PALMA, con(89, 4)))).toBe("36");
    expect(nombre(conViento(LA_PALMA, con(null, 0)))).toBe("36");
  });

  it("y con suroeste flojo también, que diez nudos de cola se aguantan", () => {
    // 220/12: unos nueve de cola por la 36.
    expect(nombre(conViento(LA_PALMA, con(220, 12)))).toBe("36");
  });

  it("y con suroeste de verdad, la 18", () => {
    // 220/16: unos doce de cola por la 36, más de los diez.
    expect(nombre(conViento(LA_PALMA, con(220, 16)))).toBe("18");
  });

  it("y cada campo decide con su parte, no con el de otro", () => {
    // El METAR de La Palma no le cambia nada a El Hierro con su tiempo.
    const palma = leerMetar("GCLA 272100Z 15003KT CAVOK 25/22 Q1017")!;
    const hierro = leerMetar("GCHI 272100Z AUTO 02012KT CAVOK 26/18 Q1017")!;
    expect(nombre(conViento(LA_PALMA, palma))).toBe(nombre(LA_PALMA));
    expect(nombre(conViento(EL_HIERRO, hierro))).toBe("34");
    expect(nombre(conViento(TENERIFE_NORTE, con(300, 3)))).toBe("12");
  });
});

describe("el ATIS del destino", () => {
  it("dice pista, viento en magnéticos, visibilidad, nubes, temperatura y QNH", () => {
    const m = leerMetar("GCHI 272100Z 02012KT 9999 BKN030 22/17 Q1017")!;
    const atis = atisEnTexto("GCHI", "34", m, 7.4);
    expect(atis).toBe(
      "GCHI ATIS · RWY 34 · WIND 013/12KT · VIS 10KM · BKN 3000FT · T22 · QNH 1017",
    );
  });

  it("y la calma, el agua y el cielo limpio, con sus abreviaturas", () => {
    const m = leerMetar("SGAS 272100Z 00000KT 4000 -RA 30/25 Q1003")!;
    expect(atisEnTexto("SGAS", "02", m)).toBe(
      "SGAS ATIS · RWY 02 · WIND CALM · VIS 4000M · -RA · NSC · T30 · QNH 1003",
    );
  });
});
