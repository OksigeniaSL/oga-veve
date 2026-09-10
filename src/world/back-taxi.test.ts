/**
 * El back-taxi: rodar por la propia pista hasta la cabecera y dar la vuelta.
 *
 * Aquí se comprueban las dos decisiones que lo disparan, que son las que se
 * pueden medir sin navegador: **cuánta pista queda si se entra por donde hay
 * calle** y **cuándo el viento vale un back-taxi**. La maniobra en sí —la
 * media circunferencia sobre el asfalto— la mide el banco de despegue.
 *
 * Ver #151.
 */

import { describe, expect, it } from "vitest";
import sgme from "../../data/aerodromes/sgme.aero.json";
import sgas from "../../data/aerodromes/sgas.aero.json";
import sgen from "../../data/aerodromes/sgen.aero.json";
import yvytu from "../../data/aerodromes/yvytu.aero.json";
import gcxo from "../../data/aerodromes/gcxo.aero.json";
import { PARA_ENTRAR_Y_DESPEGAR, pistaTrasLaCalle } from "./aerodrome";
import type { Aerodrome } from "./aerodrome";
import { conViento, ESTIGARRIBIA, TENERIFE_NORTE } from "./scenarios";
import { ANCHO_PARA_LA_VUELTA } from "./plan-de-vuelo";
import sgpj from "../../data/aerodromes/sgpj.aero.json";
import { TIEMPO_DE_CASA, type Meteo } from "./meteo";

const como = (aero: unknown): Aerodrome => aero as Aerodrome;

describe("cuánta pista queda entrando por donde hay calle", () => {
  it("en Mariscal Estigarribia, todo por la 19 y casi nada por la 01", () => {
    // La única calle muere a quinientos y pico metros del umbral 19: por la 19
    // queda la pista entera y por la 01, quinientos cincuenta y nueve.
    expect(pistaTrasLaCalle(como(sgme), "19")).toBeGreaterThan(2900);
    expect(pistaTrasLaCalle(como(sgme), "01")).toBeCloseTo(559, -1);
    expect(pistaTrasLaCalle(como(sgme), "01")).toBeLessThan(
      PARA_ENTRAR_Y_DESPEGAR,
    );
  });

  it("en Encarnación, la 02 tampoco llega: es un back-taxi de siempre", () => {
    // Trescientos ochenta y nueve metros, menos de lo que corre el avión. Esta
    // no la mueve el viento: es la operación normal del campo.
    expect(pistaTrasLaCalle(como(sgen), "02")).toBeLessThan(
      PARA_ENTRAR_Y_DESPEGAR,
    );
  });

  it("y en Yvytu Rape, que tiene la calle en el medio, por las dos", () => {
    expect(pistaTrasLaCalle(como(yvytu), "15")).toBeLessThan(
      PARA_ENTRAR_Y_DESPEGAR,
    );
    expect(pistaTrasLaCalle(como(yvytu), "33")).toBeLessThan(
      PARA_ENTRAR_Y_DESPEGAR,
    );
  });

  it("en un aeropuerto con calle paralela no hace falta nunca", () => {
    for (const cabecera of ["02", "20"])
      expect(pistaTrasLaCalle(como(sgas), cabecera)).toBeGreaterThan(3000);
    for (const cabecera of ["12", "30"])
      expect(pistaTrasLaCalle(como(gcxo), cabecera)).toBeGreaterThan(3000);
  });

  it("sin calles dibujadas no dice que falte sitio", () => {
    const pelado = { ...como(sgme), taxiways: [] } as unknown as Aerodrome;
    expect(pistaTrasLaCalle(pelado, "01")).toBe(Infinity);
  });
});

describe("y en qué pistas cabe la maniobra", () => {
  const ancho = (aero: unknown): number =>
    como(aero).runways[0]!.widthM ?? Infinity;

  it("la hierba de Yvytu Rape es demasiado estrecha", () => {
    // Dieciocho metros: la raya de ida quedaría a cinco del eje, y ahí no hay
    // dos rayas sino una gorda que va en los dos sentidos.
    expect(ancho(yvytu)).toBeLessThan(ANCHO_PARA_LA_VUELTA);
  });

  it("y los dos campos que la piden, de sobra", () => {
    // Los únicos que se quedan sin pista entrando por donde hay calle. Los
    // demás no llegan a preguntárselo.
    for (const aero of [sgme, sgen]) {
      expect(
        pistaTrasLaCalle(como(aero), aero === sgme ? "01" : "02"),
      ).toBeLessThan(PARA_ENTRAR_Y_DESPEGAR);
      expect(ancho(aero)).toBeGreaterThanOrEqual(ANCHO_PARA_LA_VUELTA);
    }
  });

  it("y Pedro Juan Caballero se queda corto de ancho, pero no lo necesita", () => {
    // Treinta metros: por debajo del listón. Da igual, porque entrando por
    // donde muere su calle le quedan novecientos y pico metros por delante.
    expect(ancho(sgpj)).toBeLessThan(ANCHO_PARA_LA_VUELTA);
    for (const cabecera of ["03", "21"])
      expect(pistaTrasLaCalle(como(sgpj), cabecera)).toBeGreaterThan(
        PARA_ENTRAR_Y_DESPEGAR,
      );
  });
});

const viento = (de: number, kt: number): Meteo => ({
  ...TIEMPO_DE_CASA,
  vientoDe: de,
  vientoKt: kt,
});

describe("el viento y el back-taxi", () => {
  it("tres nudos de cola no valen un back-taxi", () => {
    // El tiempo de por defecto: tres nudos del norte. La 01 gana por seis, y
    // aun así se sale por la 19, que tiene la plataforma al lado.
    const con = conViento(ESTIGARRIBIA, TIEMPO_DE_CASA);
    expect(con.runway.heading).toBeCloseTo(ESTIGARRIBIA.runway.heading, 3);
  });

  it("pero doce sí", () => {
    const con = conViento(ESTIGARRIBIA, viento(0, 12));
    // La 01 corre a 357,8°, o sea al norte, que es de donde viene el viento.
    expect(con.runway.heading).toBeCloseTo(357.8, 0);
  });

  it("y con el viento del sur se sale por la 19 sin discusión", () => {
    const con = conViento(ESTIGARRIBIA, viento(180, 12));
    expect(con.runway.heading).toBeCloseTo(177.8, 0);
  });

  it("donde se llega rodando a las dos, manda el viento y punto", () => {
    // Tenerife Norte tiene calle hasta las dos cabeceras: aquí la tolerancia
    // no pinta nada y dos nudos bastan para cambiar de cabecera.
    const escrita = TENERIFE_NORTE.runway.heading;
    const alReves = (escrita + 180) % 360;
    const con = conViento(TENERIFE_NORTE, viento(Math.round(alReves), 2));
    expect(con.runway.heading).toBeCloseTo(alReves, 0);
  });
});
