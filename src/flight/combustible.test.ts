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
  comoVaElDeposito,
  loQueCabe,
  loQueQueda,
  quemaPorSegundo,
  reservaEnKilos,
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
  it("con el viaje entero por delante, no dice nada", () => {
    expect(comoVaElDeposito(YVAGA, cargaParaLaRuta(YVAGA, 200_000))).toBe(
      "bien",
    );
  });

  it("y salta al empezar a gastar la reserva, no al acabarse", () => {
    expect(comoVaElDeposito(YVAGA, reservaEnKilos(YVAGA) * 0.9)).toBe(
      "reserva",
    );
  });

  it("y se pone serio cuando ya no quedan ni esos", () => {
    expect(comoVaElDeposito(YVAGA, reservaEnKilos(YVAGA) * 0.2)).toBe("poco");
  });

  /*
   * **Y no salta despegando**, que es lo que tumbó la primera versión.
   *
   * Medía la autonomía al consumo de ahora, y con el motor a fondo la
   * autonomía de cualquier avión se cae por debajo de los cuarenta y cinco
   * minutos: el aviso sonaba en todos los despegues, con el depósito recién
   * llenado. Medido en el banco de Guaraní. Ver `comoVaElDeposito`.
   */
  it("y no salta con el motor a fondo y el depósito lleno", () => {
    for (const a of AIRCRAFT) {
      const lleno = cargaParaLaRuta(a, 40_000);
      expect(comoVaElDeposito(a, lleno)).toBe("bien");
      // Y que la trampa era de verdad: al consumo de despegue, ese mismo
      // depósito da para bastante menos de los cuarenta y cinco minutos.
      const aFondo = quemaPorSegundo(a, a.maxThrust);
      expect(loQueQueda(lleno, aFondo)).toBeLessThan(RESERVA_SEGUNDOS);
    }
  });

  it("y con los motores parados el reloj no sirve de nada: por eso no se usa", () => {
    expect(loQueQueda(1000, 0)).toBe(Infinity);
  });
});


/*
 * ── La raya del instrumento ──────────────────────────────────────────────
 *
 * El indicador pinta la reserva como una franja fija al principio de la
 * escala. Que sea fija es la mitad de lo que enseña —ver bajar la barra hacia
 * una meta que estaba ahí desde el despegue— y que quepa en la escala es lo
 * que impide que la franja se coma el instrumento entero.
 */
describe("la franja de la reserva", () => {
  it("son los cuarenta y cinco minutos de crucero de cada avión", () => {
    for (const a of AIRCRAFT) {
      const crucero = quemaPorSegundo(a, a.maxThrust / 3);
      expect(reservaEnKilos(a) / crucero).toBeCloseTo(RESERVA_SEGUNDOS, 3);
    }
  });

  it("y cabe holgada en el depósito de los seis: nunca más de un tercio", () => {
    // Si la franja ocupara media escala, el instrumento diría «vas justo»
    // desde el primer segundo y dejaría de significar nada.
    for (const a of AIRCRAFT) {
      expect(reservaEnKilos(a)).toBeGreaterThan(0);
      expect(reservaEnKilos(a)).toBeLessThan(loQueCabe(a) / 3);
    }
  });

  it("y sale de la carga: lo que se lleva de más es la ruta", () => {
    for (const a of AIRCRAFT)
      expect(cargaParaLaRuta(a, 0)).toBeGreaterThan(reservaEnKilos(a));
  });
});
