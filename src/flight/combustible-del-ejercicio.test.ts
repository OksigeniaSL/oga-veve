import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import {
  cargaDelEjercicio,
  cargaParaElPlan,
  llamadaDeCombustible,
  quemaEsperando,
  quemaPorSegundo,
} from "./combustible";
import { EJERCICIOS } from "./ejercicios";
import { colocacionDeLaTormenta } from "./practica-de-tormenta";
import { colocacionDeLaAguja, TOPE_POR_DEBAJO_DE_DIEZ_MIL } from "./seguir-la-aguja";

/*
 * **El depósito de un ejercicio que empieza en el aire lleva su vuelo.**
 *
 * La aguja y la tormenta empiezan lejos de casa —seis minutos de la radio,
 * ochenta millas— y el depósito se cargaba para el tramo desde casa, que sin
 * destino es un vuelo local: en la avioneta, a mitad de la curva de la aguja
 * salía «minimum fuel». Aquí se vuela cada uno en papel, en cada avión al que
 * se le ofrece y en un campo sin alternativo —el peor caso: sin el plan B no
 * hay su tramo en el depósito—, de donde empieza hasta casa con un tercio más
 * por lo que el ejercicio vuela de más (rodear la tormenta, la curva del
 * perro), a su velocidad y quemando lo más que diga la cuenta: el crucero del
 * despacho o lo de esperar. Y en ningún momento se llama a la torre.
 */

const CASA = { id: "casa", x: 0, z: 0 } as const;

/** Lo que dice la torre si se vuela `metros` de vuelta a casa, de diez en diez segundos. */
function loQueSeLlama(
  a: AircraftConfig,
  kilos: number,
  metros: number,
  velocidad: number,
): ReturnType<typeof llamadaDeCombustible> {
  const quema = Math.max(quemaPorSegundo(a, a.maxThrust / 3), quemaEsperando(a));
  let peor: ReturnType<typeof llamadaDeCombustible> = "nada";
  for (let falta = metros; falta > 0; falta -= velocidad * 10) {
    const llamada = llamadaDeCombustible(a, kilos, falta / velocidad);
    if (llamada !== "nada") peor = llamada;
    kilos -= quema * 10;
  }
  return peor;
}

/** Dónde empieza cada ejercicio lejano, y a qué velocidad se vuela. */
const LEJANOS = {
  tormenta: (a: AircraftConfig) => ({
    lejos: colocacionDeLaTormenta(a).lejos,
    velocidad: a.cruiseSpeed,
  }),
  aguja: (a: AircraftConfig) => {
    const velocidad = Math.min(a.cruiseSpeed, TOPE_POR_DEBAJO_DE_DIEZ_MIL);
    const c = colocacionDeLaAguja({
      estacion: { x: 0, z: 0 },
      viento: { x: 0, z: 0 },
      velocidad,
      suelo: () => 0,
      cotaDeLaPista: 0,
    });
    return { lejos: c.lejos, velocidad };
  },
} as const;

describe("el depósito de los ejercicios que empiezan lejos", () => {
  for (const [id, dondeEmpieza] of Object.entries(LEJANOS)) {
    const ejercicio = EJERCICIOS.find((e) => e.id === id)!;
    const aviones = AIRCRAFT.filter((a) => ejercicio.valePara(a));
    it(`${id}: se le ofrece a algún avión`, () => {
      expect(aviones.length).toBeGreaterThan(0);
    });
    for (const a of aviones) {
      it(`${id} en el ${a.id}: llega a casa sin «minimum fuel»`, () => {
        const { lejos, velocidad } = dondeEmpieza(a);
        const kilos = cargaDelEjercicio(a, { x: lejos, z: 0 }, CASA, [CASA]);
        expect(loQueSeLlama(a, kilos, lejos * 4 / 3, velocidad)).toBe("nada");
      });
    }
  }

  /*
   * Con lo del tramo desde casa —la carga de un vuelo local—, la avioneta
   * pedía «minimum fuel» en la aguja: era el fallo. Desde H28b la carga local
   * ya no está a cinco minutos del aviso —ver `combustible-del-vuelo-local.test.ts`—
   * y la aguja no llegaría a pedirlo con ella; pero el ejercicio sigue cargando
   * su vuelo entero, que es lo que se despacha de verdad.
   */
  it("y el ejercicio lejano carga su vuelo, más que la vuelta al campo", () => {
    const a = AIRCRAFT.find((x) => x.id === "jaz-20")!;
    const { lejos } = LEJANOS.aguja(a);
    expect(cargaDelEjercicio(a, { x: lejos, z: 0 }, CASA, [CASA])).toBeGreaterThan(
      cargaParaElPlan(a, { alDestino: 0, alAlterno: 0 }),
    );
  });

  it("y con alternativo, lleva también el tramo de casa a él", () => {
    const a = AIRCRAFT.find((x) => x.id === "jaz-90")!;
    const otro = { id: "otro", x: 0, z: 60000 };
    const sin = cargaDelEjercicio(a, { x: 100000, z: 0 }, CASA, [CASA]);
    const con = cargaDelEjercicio(a, { x: 100000, z: 0 }, CASA, [CASA, otro]);
    expect(con).toBeGreaterThan(sin);
    expect(con).toBeCloseTo(cargaParaElPlan(a, { alDestino: 100000, alAlterno: 60000 }), 6);
  });
});
