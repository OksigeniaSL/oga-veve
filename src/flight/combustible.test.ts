/**
 * El combustible, y la única decisión que enseña: **la reserva**.
 *
 * Pedido jugando: «indicador de combustible y carga preprogramada para la
 * ruta». Lo que se comprueba aquí no es una tabla de litros —eso cambia con
 * cada ficha y debe poder cambiar— sino que los números salen donde los pone
 * la realidad: un cuatrimotor de fuselaje ancho gasta toneladas a la hora y
 * una avioneta de escuela, decenas de kilos.
 */

import { describe, expect, it } from "vitest";
import {
  cargaParaLaRuta,
  comoVaElCombustible,
  loQueCabe,
  loQueQueda,
  quemaPorSegundo,
  RESERVA_SEGUNDOS,
} from "./combustible";
import { aircraftById, AIRCRAFT } from "./aircraft";

const PYKASU = aircraftById("jaz-20");
const YVAGA = aircraftById("jaz-120");

/** Lo que quema a un empuje dado, en kilos por hora, que es como se lee. */
const porHora = (a: typeof PYKASU, empuje: number) =>
  quemaPorSegundo(a, empuje) * 3600;

describe("lo que se quema", () => {
  it("el de fuselaje ancho, toneladas a la hora en crucero", () => {
    // `maxThrust` es el de los cuatro juntos; a un cuarto, el crucero.
    const crucero = YVAGA.maxThrust / 4;
    const kgh = porHora(YVAGA, crucero);
    // Un 747 clásico anda por los diez u once mil kilos a la hora.
    expect(kgh).toBeGreaterThan(9000);
    expect(kgh).toBeLessThan(15000);
  });

  it("y la avioneta, decenas de kilos", () => {
    const crucero = PYKASU.maxThrust / 3;
    const kgh = porHora(PYKASU, crucero);
    // Treinta y ocho litros a la hora son unos veintisiete kilos.
    expect(kgh).toBeGreaterThan(15);
    expect(kgh).toBeLessThan(50);
  });

  it("y a más empuje, más: es la cuenta entera del asunto", () => {
    expect(porHora(YVAGA, 200000)).toBeGreaterThan(porHora(YVAGA, 100000));
    expect(porHora(YVAGA, 0)).toBe(0);
  });

  it("y el empuje negativo no rellena el depósito", () => {
    expect(quemaPorSegundo(YVAGA, -50000)).toBe(0);
  });
});

describe("lo que se carga para la ruta", () => {
  it("es lo del viaje más la reserva, no el depósito lleno", () => {
    // Un circuito: cuatro kilómetros. No puede salir con los depósitos a tope.
    const circuito = cargaParaLaRuta(YVAGA, 4000);
    expect(circuito).toBeLessThan(loQueCabe(YVAGA));
    expect(circuito).toBeGreaterThan(0);
  });

  it("y una ruta más larga carga más", () => {
    expect(cargaParaLaRuta(YVAGA, 200_000)).toBeGreaterThan(
      cargaParaLaRuta(YVAGA, 4000),
    );
  });

  it("pero nunca más de lo que cabe", () => {
    for (const a of AIRCRAFT)
      expect(cargaParaLaRuta(a, 5_000_000)).toBeLessThanOrEqual(loQueCabe(a));
  });

  it("y con la reserva dentro: siempre da para los cuarenta y cinco minutos", () => {
    for (const a of AIRCRAFT) {
      const crucero = quemaPorSegundo(a, a.maxThrust / 3);
      expect(cargaParaLaRuta(a, 4000) / crucero).toBeGreaterThan(
        RESERVA_SEGUNDOS,
      );
    }
  });
});

describe("el aviso", () => {
  const crucero = quemaPorSegundo(YVAGA, YVAGA.maxThrust / 3);

  it("con el viaje entero por delante, no dice nada", () => {
    expect(comoVaElCombustible(cargaParaLaRuta(YVAGA, 200_000), crucero)).toBe(
      "bien",
    );
  });

  it("y salta al empezar a gastar la reserva, no al acabarse", () => {
    // Justo por debajo de los cuarenta y cinco minutos.
    const kilos = crucero * (RESERVA_SEGUNDOS - 60);
    expect(comoVaElCombustible(kilos, crucero)).toBe("reserva");
  });

  it("y se pone serio cuando ya no quedan ni esos", () => {
    expect(comoVaElCombustible(crucero * 300, crucero)).toBe("poco");
  });

  it("y con los motores parados no queda «poco»: queda todo", () => {
    expect(loQueQueda(1000, 0)).toBe(Infinity);
    expect(comoVaElCombustible(1000, 0)).toBe("bien");
  });
});
