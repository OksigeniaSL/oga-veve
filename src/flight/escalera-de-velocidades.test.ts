/**
 * **La escalera de velocidades**, peldaño a peldaño y avión a avión.
 *
 * Lo que la trajo: la ventanilla SPD del JAZ 120 marcaba 146 —su Vref— en
 * plena subida, y llegando a La Palma no había nada que dijera a qué ir. Ver
 * la cabecera de `escalera-de-velocidades.ts`.
 */

import { describe, expect, it } from "vitest";
import { MEDIDOS, esDeChorro, type AircraftConfig } from "./aircraft";
import {
  ALTITUD_DEL_TOPE,
  CONFIGURADO_DESDE,
  FRENAR_ANTES,
  indicadaDeSubida,
  machDeCrucero,
  NUDO,
  TOPE_BAJO_EL_100,
  velocidadQueToca,
  vrefKt,
  type DondeVa,
} from "./escalera-de-velocidades";

const PIE = 0.3048;
const MILLA = 1852;
const de = (id: string): AircraftConfig => MEDIDOS.find((a) => a.id === id)!;

const subiendo = (pies: number): DondeVa => ({
  altitud: pies * PIE,
  restante: 150 * MILLA,
  bajando: false,
  enFinal: false,
  subiendo: true,
});
const llegando = (millas: number, pies = 3000): DondeVa => ({
  altitud: pies * PIE,
  restante: millas * MILLA,
  bajando: true,
  enFinal: false,
  subiendo: false,
});

describe("la escalera de velocidades", () => {
  it("por debajo de diez mil pies, nadie pasa de 250 nudos", () => {
    for (const a of MEDIDOS)
      for (const pies of [1500, 5000, 9900]) {
        const v = velocidadQueToca(a, subiendo(pies));
        expect(v.kt, `${a.id} a ${pies} ft`).toBeLessThanOrEqual(TOPE_BAJO_EL_100);
      }
  });

  it("y los reactores suben a 250 justo hasta allí, no a su Vref", () => {
    // El fallo de la captura: 146 en la ventanilla, subiendo.
    for (const a of MEDIDOS.filter(esDeChorro)) {
      const v = velocidadQueToca(a, subiendo(8000));
      expect(v.kt, a.id).toBe(TOPE_BAJO_EL_100);
      expect(v.kt, a.id).toBeGreaterThan(vrefKt(a) + 60);
    }
    expect(ALTITUD_DEL_TOPE / PIE).toBeCloseTo(10000, 6);
  });

  it("y bajando, la marca llega a 250 antes de los diez mil pies, para cruzarlos ya frenado", () => {
    // SPD TRANS 250/10000: se cruza a 250, no se empieza a frenar al cruzar.
    for (const a of MEDIDOS.filter(esDeChorro)) {
      const encima = velocidadQueToca(a, llegando(60, 10800));
      expect(encima.tramo, a.id).toBe("descenso");
      expect(encima.kt, a.id).toBe(TOPE_BAJO_EL_100);
      const masArriba = velocidadQueToca(a, llegando(60, 12000));
      expect(masArriba.kt, a.id).toBeGreaterThan(TOPE_BAJO_EL_100);
    }
    // Subiendo no: ahí el tope vale hasta los diez mil y no antes.
    for (const a of MEDIDOS.filter(esDeChorro))
      expect(velocidadQueToca(a, subiendo(10500)).kt, a.id).toBeGreaterThan(TOPE_BAJO_EL_100);
    expect(FRENAR_ANTES / PIE).toBeCloseTo(1000, 6);
  });

  it("el Mach de crucero de los reactores es el de su clase", () => {
    expect(machDeCrucero(de("jaz-120"))).toBeCloseTo(0.78, 2);
    expect(machDeCrucero(de("jaz-90"))).toBeCloseTo(0.75, 2);
    for (const a of MEDIDOS.filter((x) => !esDeChorro(x)))
      expect(machDeCrucero(a), a.id).toBeNull();
  });

  /*
   * **El 747-100 cruza a M0,84**, unos 500 nudos verdaderos: la ficha B741
   * de SKYbrary, que sale de la base de prestaciones de Eurocontrol —leída en
   * el resumen del buscador; la página no se dejó abrir, **por verificar**—.
   * Los 230 m/s a FL350 de su ficha son M0,78, y salen de un caso de vuelo de
   * la NASA (CR-2144), no de un crucero. No se ha encontrado una tabla de
   * Boeing del 747 clásico que lo diga, y subirlo mueve la caída de su empuje
   * con la velocidad, que en `empujeLleno` se cuenta con el crucero de la
   * ficha: ver la enmienda H37j del ADR 0027.
   */
  it.todo("el JAZ 120 cruza al M0,84 de su clase, con el empuje separado del crucero");

  it("a FL290 el JAZ 120 va por Mach, a los 270–290 nudos que se ven de verdad", () => {
    // Enrique: «lo real a FL290 son unos 270–280 kt, M 0,80». No 185.
    const v = velocidadQueToca(de("jaz-120"), { ...subiendo(29000), subiendo: false });
    expect(v.tramo).toBe("crucero");
    expect(v.mach).toBeCloseTo(0.78, 2);
    expect(v.kt).toBeGreaterThanOrEqual(255);
    expect(v.kt).toBeLessThanOrEqual(290);
  });

  it("y la indicada de subida cae con la altura en cuanto manda el Mach", () => {
    const a = de("jaz-120");
    const abajo = velocidadQueToca(a, subiendo(15000));
    const arriba = velocidadQueToca(a, subiendo(33000));
    expect(abajo.mach).toBeNull();
    expect(abajo.kt).toBe(indicadaDeSubida(a));
    expect(arriba.mach).not.toBeNull();
    expect(arriba.kt).toBeLessThan(abajo.kt);
  });

  it("ninguna pasa nunca de la Vmo", () => {
    for (const a of MEDIDOS)
      for (const pies of [500, 5000, 12000, 20000, 30000, 36000]) {
        const v = velocidadQueToca(a, subiendo(pies));
        expect(v.kt, `${a.id} a ${pies}`).toBeLessThan(a.vmoKt);
      }
  });

  /*
   * El 747 a 226 y 196, y el E170 más despacio: con la Vref de la FAA, 117,7
   * nudos a la masa de la ficha, la regla le da 198 y 168, donde con los 132
   * de antes eran 212 y 182 (enmienda H20e del ADR 0027).
   */
  it("llegando, los reactores van a la Vref y ochenta en el área terminal y a la Vref y cincuenta con los primeros flaps", () => {
    const bandas: Record<string, { terminal: [number, number]; aproximacion: [number, number] }> = {
      "jaz-90": { terminal: [195, 200], aproximacion: [165, 170] },
      "jaz-120": { terminal: [210, 230], aproximacion: [180, 200] },
    };
    for (const [id, b] of Object.entries(bandas)) {
      const a = de(id);
      const terminal = velocidadQueToca(a, llegando(20));
      const aproximacion = velocidadQueToca(a, llegando(10));
      expect(terminal.tramo).toBe("terminal");
      expect(terminal.kt, id).toBeGreaterThanOrEqual(b.terminal[0]);
      expect(terminal.kt, id).toBeLessThanOrEqual(b.terminal[1]);
      expect(aproximacion.tramo).toBe("aproximacion");
      expect(aproximacion.kt, id).toBeGreaterThanOrEqual(b.aproximacion[0]);
      expect(aproximacion.kt, id).toBeLessThanOrEqual(b.aproximacion[1]);
    }
  });

  it("y antes de la final, ya con el tren y los segundos flaps: a la final se llega frenado", () => {
    // «Pretende que entre a una velocidad de vértigo»: de la Vref y cincuenta
    // a la Vref y cinco en las cinco millas no lo frena ningún reactor.
    for (const a of MEDIDOS.filter(esDeChorro)) {
      const configurado = velocidadQueToca(a, llegando(6.5));
      expect(configurado.tramo, a.id).toBe("aproximacion");
      expect(configurado.kt, a.id).toBe(Math.round(vrefKt(a) + 20));
      const final = velocidadQueToca(a, llegando(4.5));
      expect(configurado.kt - final.kt, a.id).toBeLessThanOrEqual(15);
    }
    expect(CONFIGURADO_DESDE / MILLA).toBeCloseTo(8, 6);
  });

  it("llegando, aunque el plan no haya pasado su punto de descenso", () => {
    // Quien empieza a bajar antes no pasa el T/D, y la marca se quedaba en
    // 250 hasta la pista: «pretende que entre a una velocidad de vértigo».
    for (const a of MEDIDOS) {
      const sinTd = (millas: number) =>
        velocidadQueToca(a, { ...llegando(millas, 1900), bajando: false });
      expect(sinTd(4).tramo, a.id).toBe("final");
      expect(sinTd(4).kt, a.id).toBe(Math.round(vrefKt(a) + 5));
      expect(sinTd(10).tramo, a.id).toBe("aproximacion");
      expect(sinTd(20).tramo, a.id).toBe("terminal");
    }
  });

  it("y en final, todos a su Vref más cinco", () => {
    for (const a of MEDIDOS) {
      const v = velocidadQueToca(a, { ...llegando(3, 1200), enFinal: true });
      expect(v.tramo).toBe("final");
      expect(v.kt, a.id).toBe(Math.round(vrefKt(a) + 5));
    }
  });

  it("la escalera solo baja según se llega", () => {
    for (const a of MEDIDOS) {
      let antes = Infinity;
      for (const millas of [60, 25, 10, 4]) {
        // Bajando de su crucero, que en una avioneta no son doce mil pies.
        const alto = Math.min(12000, (a.alturaDeCrucero / PIE) * 0.9);
        const v = velocidadQueToca(a, llegando(millas, millas > 30 ? alto : 3000));
        expect(v.kt, `${a.id} a ${millas} NM`).toBeLessThanOrEqual(antes);
        antes = v.kt;
      }
    }
  });

  it("y con flaps fuera no pide más de lo que aguantan", () => {
    const a = de("jaz-90");
    const tope = a.vfePorMuesca[0]!;
    const v = velocidadQueToca(a, { ...subiendo(3000), topeKt: tope });
    expect(v.kt).toBeLessThanOrEqual(tope - 10);
  });

  it("la indicada de subida de cada uno sale de su ficha", () => {
    // Ningún número para los seis: cada uno el suyo, y con sentido.
    const kt = (id: string) => indicadaDeSubida(de(id));
    expect(kt("jaz-120")).toBeGreaterThan(kt("jaz-90") - 1);
    expect(kt("jaz-20")).toBeLessThan(100);
    expect(kt("jaz-60")).toBeGreaterThan(kt("jaz-20"));
    for (const a of MEDIDOS)
      expect(kt(a.id) * NUDO, a.id).toBeGreaterThan(a.approachSpeed);
  });
});
