/**
 * **Con la verde, a la pista a paso de viraje y no de caracol.**
 *
 * Enrique, en Los Rodeos con el JAZ 120 y en Guyrami: autorizado a despegar y
 * entrando en la pista «sin pasar de 5 —es ir montado sobre un caracol—».
 * Lo de verdad es girar para alinearse a unos diez nudos —«10 knots or less
 * prior to turn entry», 737 FCTM, «Taxi Speed and Braking»— y, con la
 * autorización dada, alinear y meter gas sin pararse.
 *
 * El perfil de la raya ya pedía eso: diez nudos en el viraje, la velocidad de
 * viraje de cada avión —ver `flight/velocidades-en-tierra.ts`—. Lo que no
 * llegaba era el avión. En Guyrami el juego lleva el gas hasta que el morro
 * mira la pista —ver `entraConElJuego` en `tope-de-rodaje.ts`— y el modelo
 * sencillo, donde el gas es la velocidad, se acercaba a la pedida al ritmo de
 * su carrera de despegue: casi un minuto en el JAZ 120. Desde parado en la
 * doble raya, el viraje entero se hacía a cuatro o cinco nudos. Medido en el
 * juego con la sonda del banco: 2,8 nudos al soltar el freno, 4,2 a mitad del
 * viraje y 8,4 al acabarlo.
 *
 * Aquí se suelta el freno con la verde y el gas a fondo, como hace un crío al
 * ver la luz, y el tope de Guyrami sujeta: cada avión tiene que ponerse a su
 * velocidad de viraje en pocos segundos y sin pasarse de ella más que la
 * holgura del tope.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { neutralControls } from "./model";
import { limitarElRodaje } from "./tope-de-rodaje";
import { GUYRAMI } from "./tiers";
import { velocidadesEnTierra } from "./velocidades-en-tierra";

/** Un nudo, m/s. */
const NUDO = 0.514444;

/** Lo que se tarda, como mucho, en ponerse a la de viraje desde parado, s. */
const EN_PONERSE = 15;

/** La vista del plan entrando en la pista con la verde. */
function entrando(a: AircraftConfig): never {
  const t = velocidadesEnTierra(a);
  return {
    fase: "autorizado",
    luzVerde: true,
    mirandoLaPista: false,
    velocidadSugerida: t.viraje,
    velocidadMaxima: t.rectaLarga,
    clave: "",
    icono: "",
    letra: null,
    rapido: false,
    restante: 300,
    saltoLaLuz: false,
    leccionHecha: false,
    fuera: false,
    cambio: false,
  } as never;
}

function soltarElFreno(a: AircraftConfig) {
  const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
  const s = m.state;
  s.onGround = true;
  s.onRunway = false;
  s.position.set(0, a.gearHeight, 0);
  s.velocity.set(0, 0, 0);
  s.heading = 0;
  const vista = entrando(a);
  const dt = 1 / 60;
  let enLaDeViraje: number | null = null;
  let maximo = 0;
  const viraje = velocidadesEnTierra(a).viraje;
  for (let t = 0; t < 40; t += dt) {
    const mandos = { ...neutralControls(), engineOn: true, throttle: 1, brakes: 0 };
    limitarElRodaje(
      m.state,
      mandos,
      (v, desde) => m.gasParaRodar(v, desde),
      GUYRAMI,
      vista,
      Infinity,
    );
    m.step(dt, mandos);
    const v = Math.hypot(m.state.velocity.x, m.state.velocity.z);
    maximo = Math.max(maximo, v);
    if (enLaDeViraje === null && v >= viraje * 0.9) enLaDeViraje = t;
  }
  return { enLaDeViraje, maximo, viraje };
}

describe("con la verde, el viraje de alineación a la de viraje de cada avión", () => {
  for (const a of AIRCRAFT)
    it(`${a.id}: de parado a su velocidad de viraje en pocos segundos, sin pasarse`, () => {
      const r = soltarElFreno(a);
      const kt = (v: number) => `${(v / NUDO).toFixed(1)} kt`;
      expect(r.enLaDeViraje, `${a.id}: no llegó a ${kt(r.viraje * 0.9)}`).not.toBeNull();
      expect(r.enLaDeViraje!, `${a.id}: tardó ${r.enLaDeViraje!.toFixed(1)} s`).toBeLessThan(
        EN_PONERSE,
      );
      // La holgura del tope de rodaje y no más: ver `topeDeRodaje`.
      expect(r.maximo, `${a.id}: llegó a ${kt(r.maximo)}`).toBeLessThan(r.viraje * 1.2);
    });
});
