/**
 * La palanca de tres posiciones, los frenos de tierra que salen solos y el
 * autofreno. Ver `palanca-de-aerofrenos.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  PalancaDeAerofrenos,
  type LoQueVeLaPalanca,
  type LoQueSale,
} from "./palanca-de-aerofrenos";

const REACTOR = { aerofrenos: true, frenosDeTierra: true, autofreno: true };

function palanca(lleva = REACTOR): PalancaDeAerofrenos {
  const p = new PalancaDeAerofrenos();
  p.ponerAeronave(lleva);
  return p;
}

const EN_EL_AIRE: LoQueVeLaPalanca = {
  enElSuelo: false,
  velocidadSuelo: 70,
  gas: 0.3,
  reversa: 0,
  pie: 0,
};

/** Recién tocado: en el suelo, deprisa y con el gas atrás. */
const AL_TOCAR: LoQueVeLaPalanca = {
  enElSuelo: true,
  velocidadSuelo: 62,
  gas: 0,
  reversa: 0,
  pie: 0,
};

/** Unos segundos de lo mismo. Devuelve lo último que salió. */
function durante(p: PalancaDeAerofrenos, segundos: number, e: LoQueVeLaPalanca): LoQueSale {
  let sale: LoQueSale = { aerofrenos: 0, frenosDeTierra: 0, autofreno: 0 };
  for (let t = 0; t < segundos; t += 1 / 60) sale = p.paso(1 / 60, e);
  return sale;
}

describe("la palanca de los aerofrenos", () => {
  it("tiene tres posiciones y el botón las recorre en orden", () => {
    const p = palanca();
    expect(p.palanca).toBe("recogida");
    p.alternar();
    expect(p.palanca).toBe("armada");
    p.alternar();
    expect(p.palanca).toBe("fuera");
    p.alternar();
    expect(p.palanca).toBe("recogida");
  });

  it("y en el avión que no los lleva no hay palanca que mover", () => {
    const p = palanca({ aerofrenos: false, frenosDeTierra: false, autofreno: false });
    expect(p.alternar()).toBe(false);
    expect(p.alternarAutofreno()).toBe(false);
    expect(p.palanca).toBe("recogida");
    expect(durante(p, 2, AL_TOCAR).frenosDeTierra).toBe(0);
  });

  it("en el aire, fuera son los de vuelo a medias, y los de tierra no", () => {
    const p = palanca();
    p.ponerPalanca("fuera");
    const sale = durante(p, 3, EN_EL_AIRE);
    expect(sale.aerofrenos).toBe(1);
    expect(sale.frenosDeTierra).toBe(0);
  });

  it("y con gas por encima de la mitad se cierran solos", () => {
    const p = palanca();
    p.ponerPalanca("fuera");
    durante(p, 3, EN_EL_AIRE);
    const sale = durante(p, 3, { ...EN_EL_AIRE, gas: 0.7 });
    expect(p.palanca).toBe("recogida");
    expect(sale.aerofrenos).toBe(0);
  });

  it("armada en el aire no saca nada", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    const sale = durante(p, 5, EN_EL_AIRE);
    expect(sale.aerofrenos).toBe(0);
    expect(sale.frenosDeTierra).toBe(0);
  });
});

describe("los frenos de tierra", () => {
  it("salen solos al tocar con la palanca armada, del todo y en un segundo", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    durante(p, 2, EN_EL_AIRE);
    expect(durante(p, 0.5, AL_TOCAR).frenosDeTierra).toBeGreaterThan(0.3);
    expect(durante(p, 0.6, AL_TOCAR).frenosDeTierra).toBe(1);
    // Y la palanca sube sola, como en un 737.
    expect(p.palanca).toBe("fuera");
  });

  it("sin armar, al tocar no sale nada: hay que haberlos armado", () => {
    const p = palanca();
    expect(durante(p, 3, AL_TOCAR).frenosDeTierra).toBe(0);
  });

  it("pero la reversa los saca, esté como esté la palanca", () => {
    const p = palanca();
    durante(p, 1, AL_TOCAR);
    expect(durante(p, 1.2, { ...AL_TOCAR, reversa: 1 }).frenosDeTierra).toBe(1);
  });

  it("no salen con gas: armada y tocando, solo con el gas atrás", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    expect(durante(p, 2, { ...AL_TOCAR, gas: 0.1 }).frenosDeTierra).toBe(0);
    expect(durante(p, 1.2, AL_TOCAR).frenosDeTierra).toBe(1);
  });

  it("ni rodando despacio por la plataforma", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    expect(durante(p, 3, { ...AL_TOCAR, velocidadSuelo: 8 }).frenosDeTierra).toBe(0);
  });

  it("y en el despegue abortado: armada, corriendo y el gas al ralentí", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    // La carrera, con gas a fondo: nada.
    expect(
      durante(p, 10, { ...AL_TOCAR, gas: 1, velocidadSuelo: 45 }).frenosDeTierra,
    ).toBe(0);
    // Se aborta: gas atrás.
    expect(
      durante(p, 1.2, { ...AL_TOCAR, gas: 0, velocidadSuelo: 50 }).frenosDeTierra,
    ).toBe(1);
  });

  it("se recogen al meter gas, y la palanca baja sola", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    durante(p, 2, AL_TOCAR);
    const sale = durante(p, 1.2, { ...AL_TOCAR, velocidadSuelo: 6, gas: 0.3 });
    expect(sale.frenosDeTierra).toBe(0);
    expect(p.palanca).toBe("recogida");
  });

  it("y a mano en tierra, fuera los saca todos aunque esté parado", () => {
    const p = palanca();
    p.ponerPalanca("fuera");
    expect(durante(p, 1.2, { ...AL_TOCAR, velocidadSuelo: 0 }).frenosDeTierra).toBe(1);
    p.ponerPalanca("recogida");
    expect(durante(p, 1.2, { ...AL_TOCAR, velocidadSuelo: 0 }).frenosDeTierra).toBe(0);
  });
});

describe("el autofreno", () => {
  it("recorre OFF, LO, MED, MAX y vuelve a OFF", () => {
    const p = palanca();
    const visto = [p.modo];
    for (let i = 0; i < 4; i++) {
      p.alternarAutofreno();
      visto.push(p.modo);
    }
    expect(visto).toEqual(["off", "lo", "med", "max", "off"]);
  });

  it("entra cuando salen los frenos de tierra y pasa su espera: LO a los cuatro segundos", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    p.ponerAutofreno("lo");
    durante(p, 2, EN_EL_AIRE);
    expect(durante(p, 3.5, AL_TOCAR).autofreno).toBe(0);
    expect(durante(p, 0.6, AL_TOCAR).autofreno).toBe(1.7);
    expect(p.frenando).toBe(true);
  });

  it("MED a los dos, con 3 m/s², y MAX en el acto, a fondo", () => {
    const med = palanca();
    med.ponerPalanca("armada");
    med.ponerAutofreno("med");
    expect(durante(med, 1.5, AL_TOCAR).autofreno).toBe(0);
    expect(durante(med, 0.6, AL_TOCAR).autofreno).toBe(3);
    const max = palanca();
    max.ponerPalanca("armada");
    max.ponerAutofreno("max");
    expect(durante(max, 0.1, AL_TOCAR).autofreno).toBe(Infinity);
  });

  it("sin frenos de tierra no entra: por eso se arman los dos", () => {
    const p = palanca();
    p.ponerAutofreno("med");
    expect(durante(p, 6, AL_TOCAR).autofreno).toBe(0);
    expect(p.modo).toBe("med");
  });

  it("el pie lo desarma, y meter gas también", () => {
    const pie = palanca();
    pie.ponerPalanca("armada");
    pie.ponerAutofreno("med");
    durante(pie, 3, AL_TOCAR);
    expect(durante(pie, 0.1, { ...AL_TOCAR, pie: 1 }).autofreno).toBe(0);
    expect(pie.modo).toBe("off");

    const gas = palanca();
    gas.ponerPalanca("armada");
    gas.ponerAutofreno("lo");
    durante(gas, 5, AL_TOCAR);
    expect(durante(gas, 0.1, { ...AL_TOCAR, gas: 0.4 }).autofreno).toBe(0);
    expect(gas.modo).toBe("off");
  });

  it("pisar el freno rodando hacia la pista con MAX armado no lo quita", () => {
    const p = palanca();
    p.ponerAutofreno("max");
    durante(p, 2, { ...AL_TOCAR, velocidadSuelo: 5, gas: 0.1, pie: 1 });
    expect(p.modo).toBe("max");
  });

  it("y un vuelo nuevo lo deja todo abajo y desarmado", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    p.ponerAutofreno("lo");
    durante(p, 6, AL_TOCAR);
    p.recoger();
    expect(p.palanca).toBe("recogida");
    expect(p.modo).toBe("off");
    expect(p.paneles).toEqual({ enVuelo: 0, enTierra: 0 });
  });
});

describe("el aterrizaje rebotado que acaba en frustrada", () => {
  it("con gas en el aire, los de tierra se recogen", () => {
    const p = palanca();
    p.ponerPalanca("armada");
    p.ponerAutofreno("lo");
    durante(p, 1.2, AL_TOCAR);
    const sale = durante(p, 1.2, { ...EN_EL_AIRE, gas: 1 });
    expect(sale.frenosDeTierra).toBe(0);
    expect(p.palanca).toBe("recogida");
    // El autofreno no llegó a frenar: sigue armado, y no frena en el aire.
    expect(sale.autofreno).toBe(0);
    expect(p.frenando).toBe(false);
  });
});
