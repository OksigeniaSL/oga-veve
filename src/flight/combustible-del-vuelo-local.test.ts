import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { camposDeLaRuta, tramosDelPlan } from "./alterno";
import { cabeEn, campoDe, destinosParaEsteAvion } from "./cabe";
import { destinosDe, SCENARIOS } from "../world/scenarios";
import {
  cargaParaElPlan,
  cargaParaLaRuta,
  llamadaDeCombustible,
  loQueCabe,
  loQueDejaElPeso,
  quemaEsperando,
  quemaPorSegundo,
  reservaEnKilos,
} from "./combustible";

/*
 * **Un vuelo local no pide «minimum fuel» a los pocos minutos.**
 *
 * La vuelta al campo —las lecciones, las misiones, el circuito— carga lo que
 * se va a volar, que sin tramos es la media hora de maniobra, más la reserva.
 * En los de pistón esa reserva eran cuarenta y cinco minutos **al consumo de
 * crucero**: la reserva final de la ley y nada más, y en la avioneta menos
 * aún, porque su crucero gasta menos que esperar. Y «minimum fuel» salta con
 * la reserva final más lo que cuesta un cambio. La avioneta lo pedía a los
 * cinco minutos de despegar, el JAZ 25 a los cuatro y el JAZ 40 a los quince.
 *
 * Aquí se vuela cada avión en papel, de diez en diez segundos: la media hora
 * entera, quemando lo más de la cuenta —el crucero del despacho o lo de
 * esperar—, y sin estar nunca a más de cinco minutos de tocar, que es lo que
 * se tarda en volver a la pista desde el circuito.
 */

const MEDIA_HORA = 30 * 60;
const A_CINCO_MINUTOS = 5 * 60;

const crucero = (a: AircraftConfig) => quemaPorSegundo(a, a.maxThrust / 3);
const loMasDeLaCuenta = (a: AircraftConfig) => Math.max(crucero(a), quemaEsperando(a));

/**
 * Cuándo se llama a la torre volando en local con `kilos`, en segundos desde
 * el despegue, o `null` si no se llama en `cuanto`. El vuelo acaba en
 * `cuanto`: los últimos cinco minutos son la vuelta a la pista.
 */
function cuandoSeLlama(
  a: AircraftConfig,
  kilos: number,
  cuanto: number,
  llamada: "minimo" | "mayday" = "minimo",
): number | null {
  const quema = loMasDeLaCuenta(a);
  for (let t = 0; t <= cuanto; t += 10) {
    const hastaTocar = Math.min(A_CINCO_MINUTOS, cuanto - t);
    const dice = llamadaDeCombustible(a, kilos - quema * t, hastaTocar);
    if (dice === llamada || (llamada === "minimo" && dice === "mayday")) return t;
  }
  return null;
}

const LOCAL = { alDestino: 0, alAlterno: 0 } as const;

describe("el combustible de un vuelo local", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: vuela su media hora sin llamar a la torre`, () => {
      const kilos = cargaParaElPlan(a, LOCAL);
      expect(cuandoSeLlama(a, kilos, MEDIA_HORA)).toBeNull();
    });

    it(`${a.id}: y si se alarga, pide «minimum fuel» antes del MAYDAY, con un cuarto de hora entre medias`, () => {
      const kilos = cargaParaElPlan(a, LOCAL);
      const largo = 6 * 3600;
      const minimo = cuandoSeLlama(a, kilos, largo);
      const mayday = cuandoSeLlama(a, kilos, largo, "mayday");
      expect(minimo).not.toBeNull();
      expect(mayday).not.toBeNull();
      // Un cuarto de hora de espera, a lo que se quema como mucho.
      const entreMedias = (15 * 60 * quemaEsperando(a)) / loMasDeLaCuenta(a);
      expect(mayday! - minimo!).toBeGreaterThanOrEqual(entreMedias - 10);
    });
  }

  it("con la carga de antes, los de pistón lo pedían a los pocos minutos: era el fallo", () => {
    for (const id of ["jaz-20", "jaz-25"]) {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      // La maniobra y los cuarenta y cinco minutos, los dos al consumo de crucero.
      const antes = crucero(a) * (30 + 45) * 60;
      const llama = cuandoSeLlama(a, antes, MEDIA_HORA);
      expect(llama, id).not.toBeNull();
      expect(llama!, id).toBeLessThan(10 * 60);
    }
  });

  it("y la reserva que se carga ya no es menos que la reserva final de la ley", () => {
    for (const a of AIRCRAFT) {
      const local = cargaParaElPlan(a, LOCAL);
      const maniobra = crucero(a) * MEDIA_HORA;
      expect(local - maniobra, a.id).toBeGreaterThan(reservaEnKilos(a));
    }
  });

  it("en los de turbina, cada ruta del juego carga lo de siempre: sus cuarenta y cinco minutos a crucero ya lo cubrían", () => {
    const turbinas = AIRCRAFT.filter(
      (a) => a.sound.engine === "turbofan" || a.sound.engine === "turboprop",
    );
    expect(turbinas.length).toBeGreaterThan(0);
    let rutas = 0;
    for (const a of turbinas)
      for (const salida of SCENARIOS) {
        if (!cabeEn(a, campoDe(salida)).cabe) continue;
        const destinos = destinosParaEsteAvion(
          a,
          destinosDe(salida)
            .map((id) => SCENARIOS.find((s) => s.id === id))
            .filter((s): s is NonNullable<typeof s> => !!s),
        );
        const campos = camposDeLaRuta(salida, destinos);
        for (const c of campos) {
          const t = tramosDelPlan(campos[0]!, c, campos);
          const metros = t.alDestino + t.alAlterno;
          const antes = Math.min(
            loQueCabe(a),
            crucero(a) * (metros / Math.max(20, a.cruiseSpeed) + (30 + 45) * 60),
          );
          // Con el tope del peso, que es nuevo y en estas rutas no muerde.
          expect(cargaParaLaRuta(a, metros), `${a.id} ${salida.id}>${c.id}`).toBeCloseTo(
            Math.min(antes, loQueDejaElPeso(a)),
            6,
          );
          expect(antes, `${a.id} ${salida.id}>${c.id}`).toBeLessThanOrEqual(loQueDejaElPeso(a) + 1);
          rutas++;
        }
      }
    expect(rutas).toBeGreaterThan(20);
  });
});
