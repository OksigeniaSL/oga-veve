/**
 * **La hoja de carga**: la gente, el combustible y el peso máximo de su manual
 * no caben todos a tope, y la pista de hoy sale de lo que se elija. Ver
 * `hoja-de-carga.ts` y el ADR 0019, enmienda H38a.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import { cargaParaElPlan, combustibleDelPlan, loQueCabe, masaConCombustible } from "./combustible";
import { camposDeLaRuta, tramosDelPlan } from "./alterno";
import { campoDe, destinosParaEsteAvion } from "./cabe";
import { pistaNecesariaHoy } from "./carrera";
import { aireDelParte, airDensity } from "./atmosphere";
import { destinosDe, SCENARIOS } from "../world/scenarios";
import {
  CARGA_DE_SU_TIPO,
  cargaDeSuTipo,
  hojaDeSuFicha,
  masaSinCombustibleDeLaHoja,
  pasajerosDeSuFicha,
  pesar,
  pesoMaximo,
  pistaDeHoy,
} from "./hoja-de-carga";

const sitio = (id: string) => SCENARIOS.find((s) => s.id === id)!;

/** El combustible del plan de `salida` a `destino`, sin el tope del peso. */
function delPlan(avionId: string, salida: string, destino: string): number {
  const a = aircraftById(avionId);
  const s = sitio(salida);
  const destinos = destinosParaEsteAvion(
    a,
    destinosDe(s)
      .map((id) => SCENARIOS.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => !!e),
  );
  const campos = camposDeLaRuta(s, destinos);
  const aqui = campos.find((c) => c.id === destino);
  expect(aqui, `${destino} no es un destino del ${avionId} desde ${salida}`).toBeTruthy();
  return combustibleDelPlan(a, tramosDelPlan(campos[0]!, aqui!, campos));
}

describe("lo que pesa cada renglón", () => {
  it("el avión vacío con su gente, a la masa estándar de cada uno", () => {
    const a = aircraftById("jaz-60");
    const t = cargaDeSuTipo(a)!;
    expect(masaSinCombustibleDeLaHoja(a, 0)).toBe(t.vacio);
    expect(masaSinCombustibleDeLaHoja(a, 19)).toBe(t.vacio + 19 * 95);
    // Ni menos de nadie ni más de los asientos que tiene.
    expect(masaSinCombustibleDeLaHoja(a, -3)).toBe(t.vacio);
    expect(masaSinCombustibleDeLaHoja(a, 40)).toBe(t.vacio + 19 * 95);
  });

  it("sin la masa en vacío leída, la carga de su ficha y nada que elegir", () => {
    for (const id of ["jaz-25", "jaz-40", "jaz-110"]) {
      const a = aircraftById(id);
      expect(cargaDeSuTipo(a), id).toBeNull();
      expect(masaSinCombustibleDeLaHoja(a, 50), id).toBe(a.masaSinCombustible);
    }
  });

  it.each(Object.keys(CARGA_DE_SU_TIPO))(
    "el %s se abre con su ficha o un poco menos, nunca más: lo que cabía sigue cabiendo",
    (id) => {
      const a = aircraftById(id);
      const n = pasajerosDeSuFicha(a);
      const t = cargaDeSuTipo(a)!;
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(t.plazas);
      const m = masaSinCombustibleDeLaHoja(a, n);
      expect(m).toBeLessThanOrEqual(a.masaSinCombustible);
      expect(a.masaSinCombustible - m).toBeLessThan(t.porPersona);
    },
  );

  it.each(Object.keys(CARGA_DE_SU_TIPO))(
    "el %s vacío con su tripulación pesa menos que su ficha y su peso máximo",
    (id) => {
      const a = aircraftById(id);
      expect(cargaDeSuTipo(a)!.vacio).toBeLessThan(a.masaSinCombustible);
      expect(cargaDeSuTipo(a)!.vacio).toBeLessThan(pesoMaximo(a)!);
    },
  );
});

describe("la báscula", () => {
  it("suma el avión, la gente y el combustible, y lo compara con su máximo", () => {
    const a = aircraftById("jaz-90");
    const p = pesar(a, { pasajeros: 40, llenos: false }, 3000);
    expect(p.sinCombustible).toBe(20700 + 40 * 95);
    expect(p.combustible).toBe(3000);
    expect(p.despegue).toBe(20700 + 40 * 95 + 3000);
    expect(p.maximo).toBe(37200);
    expect(p.cabe).toBe(true);
    expect(p.deMas).toBe(0);
  });

  it("los depósitos llenos son lo que cabe en ellos, y el plan nunca más que eso", () => {
    const a = aircraftById("jaz-60");
    expect(pesar(a, { pasajeros: 0, llenos: true }, 100).combustible).toBe(loQueCabe(a));
    expect(pesar(a, { pasajeros: 0, llenos: false }, 1e6).combustible).toBe(loQueCabe(a));
  });

  it("sin el tope del peso, el plan es el de siempre: el tope solo lo pone la carga de la ficha", () => {
    for (const a of AIRCRAFT) {
      const tramos = { alDestino: 300000, alAlterno: 100000 };
      expect(combustibleDelPlan(a, tramos), a.id).toBeGreaterThanOrEqual(cargaParaElPlan(a, tramos));
      // Y con la carga de su ficha, lo que sale cabe en su máximo, como antes.
      const mtow = pesoMaximo(a);
      if (mtow) expect(masaConCombustible(a, cargaParaElPlan(a, tramos)), a.id).toBeLessThanOrEqual(mtow + 1);
    }
  });
});

describe("la decisión de verdad: la gente o el combustible, no las dos", () => {
  /*
   * **El 1900D lleno no llega a Pedro Juan Caballero.** 10.874 lb vacío
   * (Raytheon), dos de cabina y diecinueve de pasaje a 84 + 11 kg: 6.927 kg.
   * Su máximo, 17.120 lb (7.766 kg). El plan de Pettirossi a Pedro Juan con
   * su alternativo y su reserva, 893 kg: no cabe por 54, y se queda en tierra
   * uno. Su hoja da 382 NM con diecinueve a bordo contando cien de
   * alternativo, y este plan son 358 con el suyo: va justo, como el de
   * verdad. Eran 1.194 kg y se quedaban cuatro, con el combustible contado
   * por el empuje (ADR 0027, enmienda H37h).
   */
  it("el JAZ 60 con sus diecinueve plazas llenas no sale de Pettirossi a Pedro Juan", () => {
    const a = aircraftById("jaz-60");
    const plan = delPlan("jaz-60", "pettirossi", "pedro-juan");
    const lleno = pesar(a, { pasajeros: 19, llenos: false }, plan);
    expect(lleno.sinCombustible).toBe(6927);
    expect(lleno.maximo).toBe(7766);
    expect(lleno.cabe).toBe(false);
    expect(lleno.quitar).toBe(Math.ceil(lleno.deMas / 95));
    expect(lleno.quitar).toBe(1);
    // Quitando a los que dice, cabe.
    const sinEllos = pesar(a, { pasajeros: 19 - lleno.quitar!, llenos: false }, plan);
    expect(sinEllos.cabe).toBe(true);
    // Y con la gente de su ficha, como siempre.
    expect(pesar(a, hojaDeSuFicha(a), plan).cabe).toBe(true);
  });

  /*
   * **El 172 con cuatro adultos no llena los depósitos.** 1.639 lb vacío y
   * cuatro de 84 kg: 1.079 kg, a 32 kg de sus 2.450 lb, once galones y medio.
   * Le llega para la vuelta al campo —media hora y la reserva, 28 kg—, y no
   * para ir a ningún sitio: a Yvytu Rape, el más cerca de Pettirossi, pide 58.
   * Es lo que le pasa a un 172 de verdad, que gasta 8,2 galones a la hora a
   * crucero. Con el combustible contado por el empuje la vuelta al campo
   * pedía 42 y tampoco cabía (ADR 0027, enmienda H37h).
   */
  it("el JAZ 20 con quien pilota y tres más da la vuelta al campo y no va a ningún sitio", () => {
    const a = aircraftById("jaz-20");
    const local = pesar(a, { pasajeros: 3, llenos: false }, delPlan("jaz-20", "pettirossi", "pettirossi"));
    expect(local.sinCombustible).toBe(1079);
    expect(local.maximo).toBe(1111);
    expect(local.cabe).toBe(true);
    expect(pesar(a, { pasajeros: 3, llenos: true }, 0).cabe).toBe(false);
    const lejos = pesar(a, { pasajeros: 3, llenos: false }, delPlan("jaz-20", "pettirossi", "yvytu-rape"));
    expect(lejos.cabe).toBe(false);
    expect(lejos.quitar).toBe(1);
    // Con uno menos, sí.
    expect(pesar(a, { pasajeros: 2, llenos: false }, delPlan("jaz-20", "pettirossi", "yvytu-rape")).cabe).toBe(
      true,
    );
  });

  /*
   * **El JAZ 40 de Pettirossi a Mariscal Estigarribia no llega con la
   * reserva**, en los dos sentidos: con su alternativo, el plan pide más de lo
   * que cabe en sus depósitos. Salía con ellos a tope y el sello verde; ni
   * llenando se lleva el combustible legal, y la hoja lo dice (H38c).
   */
  it("el JAZ 40 entre Pettirossi y Estigarribia no llega con la reserva, ni llenando", () => {
    const a = aircraftById("jaz-40");
    for (const [salida, destino] of [
      ["pettirossi", "estigarribia"],
      ["estigarribia", "pettirossi"],
    ] as const) {
      const plan = delPlan("jaz-40", salida, destino);
      expect(plan, salida).toBeGreaterThan(loQueCabe(a));
      for (const llenos of [false, true]) {
        const p = pesar(a, { ...hojaDeSuFicha(a), llenos }, plan);
        expect(p.llega, `${salida} ${llenos}`).toBe(false);
        expect(p.pide).toBe(plan);
        // Lo que se carga sigue siendo lo que cabe: el plan no se vuelve depósito.
        expect(p.combustible).toBe(loQueCabe(a));
      }
    }
    // Y a un destino más cerca, sí.
    expect(pesar(a, hojaDeSuFicha(a), delPlan("jaz-40", "pettirossi", "pettirossi")).llega).toBe(true);
  });

  it("y llega quien carga lo que pide su plan, por justo que vaya", () => {
    const a = aircraftById("jaz-60");
    expect(pesar(a, hojaDeSuFicha(a), loQueCabe(a)).llega).toBe(true);
    expect(pesar(a, hojaDeSuFicha(a), loQueCabe(a) + 1).llega).toBe(false);
  });

  it.each(Object.keys(CARGA_DE_SU_TIPO))(
    "el %s sin pasaje cabe hasta con los depósitos llenos: lo que se quita es gente",
    (id) => {
      const a = aircraftById(id);
      expect(pesar(a, { pasajeros: 0, llenos: true }, 0).cabe).toBe(true);
    },
  );
});

describe("la pista de hoy", () => {
  const xo = sitio("tenerife-norte");
  const cota = xo.aerodrome?.elevationM ?? 0;

  it("es la misma cuenta que hace el vuelo, con el aire del parte en la cota del campo", () => {
    const a = aircraftById("jaz-90");
    const aire = { temp: 30, qnh: 1013, cota, superficie: "asfalto" as const };
    expect(pistaDeHoy(a, 33000, aire)).toBeCloseTo(
      pistaNecesariaHoy(a, {
        densidad: airDensity(cota, aireDelParte(30, cota, 1013)),
        vientoDeFrente: 0,
        superficie: "asfalto",
        masa: 33000,
      }),
      6,
    );
  });

  it("crece con el peso y con el calor", () => {
    const a = aircraftById("jaz-60");
    const fresco = { temp: 15, qnh: 1013, cota, superficie: "asfalto" as const };
    const calor = { ...fresco, temp: 35 };
    expect(pistaDeHoy(a, 7700, fresco)).toBeGreaterThan(pistaDeHoy(a, 6500, fresco));
    expect(pistaDeHoy(a, 7700, calor)).toBeGreaterThan(pistaDeHoy(a, 7700, fresco));
  });

  it("Los Rodeos tiene 632 m de cota y 3.171 m de TORA", () => {
    expect(cota).toBeGreaterThan(600);
    expect(cota).toBeLessThan(660);
    expect(campoDe(xo).tora).toBe(3171);
  });

  /*
   * **Caliente y alto en Los Rodeos, con las cifras de cada manual: la barra
   * no se pasa a ningún peso que se pueda llevar.** Ni a cuarenta grados y a
   * su peso máximo: el que más se acerca es el 787-9, a 31 m del final. Pasa
   * solo pasándose de peso, con los tanques llenos, y eso ya lo para la
   * báscula. Se deja escrito para que nadie truque una cifra para que pase.
   */
  it("en Los Rodeos, ni a 40 °C ni a su peso máximo se pasa ningún avión de la flota", () => {
    for (const a of AIRCRAFT) {
      const mtow = pesoMaximo(a);
      if (!mtow) continue;
      const pide = pistaDeHoy(a, mtow, { temp: 40, qnh: 1013, cota, superficie: "asfalto" });
      expect(pide, a.id).toBeLessThan(3171);
    }
  });

  /*
   * **Donde sí pasa, a su peso máximo y con calor**: el Embraer 170 en La
   * Gomera, con 1.500 m de TORA, desde unos 36 °C; y el 1900D en El Hierro,
   * con 1.250, a 40. Días de ola de calor, no de cada verano.
   */
  it("el JAZ 90 en La Gomera y el JAZ 60 en El Hierro, a su peso máximo y a 40 °C, no caben", () => {
    const gm = sitio("la-gomera");
    const hi = sitio("el-hierro");
    const aire = (s: typeof gm, temp: number) => ({
      temp,
      qnh: 1013,
      cota: s.aerodrome?.elevationM ?? 0,
      superficie: "asfalto" as const,
    });
    const e170 = aircraftById("jaz-90");
    expect(pistaDeHoy(e170, 37200, aire(gm, 40))).toBeGreaterThan(campoDe(gm).tora!);
    expect(pistaDeHoy(e170, 37200, aire(gm, 25))).toBeLessThan(campoDe(gm).tora!);
    const b1900 = aircraftById("jaz-60");
    expect(pistaDeHoy(b1900, 7766, aire(hi, 40))).toBeGreaterThan(campoDe(hi).tora!);
    expect(pistaDeHoy(b1900, 7766, aire(hi, 25))).toBeLessThan(campoDe(hi).tora!);
  });
});
