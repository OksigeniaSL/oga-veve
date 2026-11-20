/**
 * **El gas del bimotor en la recogida se quita con el reloj, no solo con la
 * altura** (H45). Ver `gas-de-la-recogida.mjs`.
 *
 * El JAZ 40 de la tanda 19 del vuelo entero recogió a 8 m de ruedas y 76 m del
 * umbral, a 89 nudos, y tocó a 816 m y 76 nudos: flotó setecientos metros
 * frenando 0,4 m/s². No era el avión —al ralentí, con el tren y los flaps de
 * aterrizar, frena 1,5 m/s²—, era el gas del piloto del banco, que solo bajaba
 * con la altura: si el avión dejaba de bajar, el de la senda se quedaba puesto.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "../src/flight/fdm";
import { aircraftById } from "../src/flight/aircraft";
import { TAGUATO } from "../src/flight/tiers";
import { neutralControls } from "../src/flight/model";
import { airDensity, SEA_LEVEL_DENSITY } from "../src/flight/atmosphere";
import { mandosPara, memoriaNueva } from "../src/flight/piloto-automatico";
import { muescaDeAterrizaje } from "../src/flight/flaps";
import { pitchAngleOf } from "../src/ui/actitud";
import { duracionDelPerfil, FLOTA, gasDelBimotorEnLaRecogida } from "./gas-de-la-recogida.mjs";

const NUDO = 0.514444;
/** La recogida del JAZ 40 en la tanda 19: a 8 m, bajando lo que pide la senda. */
const RECOGIDA = { altura: 8, caida: 2.4, alTocar: 1.2, gas: 0.47 };

/** La cuenta de antes, la de H34d: el gas de la senda por la parte de la altura que queda. */
const deAntes = (p, queda) =>
  Math.min(1, p.gas * queda + Math.max(0, p.falta) + Math.max(0, 1 - p.carga));

describe("el gas del bimotor en la recogida", () => {
  it("siguiendo el perfil, el de siempre: el de la senda por la altura que queda", () => {
    // El perfil, integrado: dh/dt = −(a + b·h).
    const { altura, caida, alTocar, gas } = RECOGIDA;
    const b = (caida - alTocar) / altura;
    let h = altura;
    for (let t = 0; h > 0.05; t += 0.05) {
      const queda = h / altura;
      const p = { ...RECOGIDA, quedaMasBaja: queda, segundos: t, falta: 0, carga: 1 };
      expect(gasDelBimotorEnLaRecogida(p)).toBeCloseTo(gas * queda, 6);
      h -= (alTocar + b * h) * 0.05;
    }
  });

  it("y si el avión baja menos de lo pedido, al ralentí cuando el perfil ya habría tocado", () => {
    const dura = duracionDelPerfil(RECOGIDA.altura, RECOGIDA.caida, RECOGIDA.alTocar);
    expect(dura).toBeGreaterThan(4);
    expect(dura).toBeLessThan(5);
    // Medio metro por segundo menos de lo pedido: se queda la altura, sin llegar a flotar.
    const casiQuieto = (segundos) => ({ ...RECOGIDA, quedaMasBaja: 1, segundos, falta: -0.5, carga: 1 });
    expect(gasDelBimotorEnLaRecogida(casiQuieto(0))).toBeCloseTo(RECOGIDA.gas, 6);
    expect(gasDelBimotorEnLaRecogida(casiQuieto(dura / 2))).toBeCloseTo(RECOGIDA.gas / 2, 6);
    expect(gasDelBimotorEnLaRecogida(casiQuieto(dura))).toBe(0);
    // La de antes se quedaba con el de la senda mientras no bajara.
    expect(deAntes(casiQuieto(dura * 3), 1)).toBeCloseTo(RECOGIDA.gas, 6);
  });

  it("y lo quitado no vuelve aunque una racha lo suba", () => {
    const p = { ...RECOGIDA, quedaMasBaja: 0.3, segundos: 1, falta: -0.5, carga: 1 };
    expect(gasDelBimotorEnLaRecogida(p)).toBeCloseTo(RECOGIDA.gas * 0.3, 6);
  });

  /*
   * **Y si flota, el gas fuera del todo** (H45b): bajando más de `FLOTA` m/s
   * menos de lo que pide el perfil, cero, aunque la carga baje de un g al
   * nivelarse —que con la cuenta de H34d volvía como gas—; y desde que ha
   * flotado, el de la senda ya no vuelve: solo el de la racha que lo hunde.
   */
  it("y si flota, el gas fuera del todo, y el de la senda ya no vuelve", () => {
    expect(FLOTA).toBe(0.6);
    const flotando = { ...RECOGIDA, quedaMasBaja: 1, segundos: 0, falta: -2.4, carga: 0.8 };
    expect(gasDelBimotorEnLaRecogida(flotando)).toBe(0);
    // Con la cuenta de H45, el de la senda entero y dos décimas por la carga.
    expect(deAntes(flotando, 1)).toBeCloseTo(RECOGIDA.gas + 0.2, 6);
    // Justo en la holgura, todavía no flota.
    expect(gasDelBimotorEnLaRecogida({ ...flotando, falta: -FLOTA, carga: 1 })).toBeCloseTo(RECOGIDA.gas, 6);
    // Ya flotó: lo de la senda no vuelve aunque vuelva a bajar lo pedido…
    const yaFloto = { ...RECOGIDA, quedaMasBaja: 0.8, segundos: 1, falta: 0, carga: 1, floto: true };
    expect(gasDelBimotorEnLaRecogida(yaFloto)).toBe(0);
    // …y si una racha lo hunde, su pelo de gas, como en H34d.
    expect(gasDelBimotorEnLaRecogida({ ...yaFloto, falta: 0.3, carga: 0.9 })).toBeCloseTo(0.4, 6);
  });

  it("y la racha que lo hunde sigue pidiendo gas encima, como en H34d", () => {
    const p = { ...RECOGIDA, quedaMasBaja: 0.5, segundos: 1, falta: 0.4, carga: 0.9 };
    expect(gasDelBimotorEnLaRecogida(p)).toBeCloseTo(RECOGIDA.gas * 0.5 + 0.4 + 0.1, 6);
    expect(gasDelBimotorEnLaRecogida({ ...p, falta: 2 })).toBe(1);
  });

  /*
   * **Con el modelo del juego**: el JAZ 40 sostenido a ocho metros sobre la
   * pista de Los Rodeos con la palanca del automático —lo peor que puede
   * hacer la recogida si el avión deja de bajar: aguantarlo—, desde los 89
   * nudos de la tanda 19, con un gas y con el otro. Se mide cuánto vuela
   * hasta perder los trece nudos que perdió aquel antes de tocar.
   */
  it("y con el modelo del juego, el JAZ 40 aguantado a ocho metros pierde trece nudos en mucho menos sitio", () => {
    const vuela = (conElReloj) => {
      const a = aircraftById("jaz-40");
      const cota = 632;
      const flaps = muescaDeAterrizaje(a);
      const raiz = (y) => Math.sqrt(airDensity(y) / SEA_LEVEL_DENSITY);
      const y0 = cota + a.gearHeight + RECOGIDA.altura;
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => cota, assist: TAGUATO.assists });
      m.reset({
        position: new Vector3(0, y0, 0),
        heading: 0,
        airspeed: (89 * NUDO) / raiz(y0),
        equilibrado: true,
        flapsDelEquilibrio: flaps,
      });
      const c = neutralControls();
      c.flaps = flaps;
      c.tren = 1;
      c.trim = m.timonDeEquilibrio(flaps);
      c.automatico = true;
      const gas = m.gasPara(m.state.airspeed, { flaps, tren: 1, aerofrenos: 0 }, (-3 * Math.PI) / 180);
      const mem = memoriaNueva();
      const dt = 1 / 60;
      const z0 = m.state.position.z;
      for (let t = 0; t < 60; t += dt) {
        const s = m.state;
        const ias = (s.airspeed * raiz(s.position.y)) / NUDO;
        if (ias <= 76 || s.onGround) return { metros: z0 - s.position.z, segundos: t, gas };
        const out = mandosPara(
          {
            heading: s.heading,
            alabeo: 0,
            cabeceo: pitchAngleOf(s.orientation),
            altitud: s.position.y,
            vertical: s.velocity.y,
            velocidad: s.airspeed * raiz(s.position.y),
            gas: c.throttle,
            verdadera: s.airspeed,
            ritmoDeCabeceo: s.pitchRate,
          },
          { rumbo: null, altitud: y0, ritmo: 0, velocidad: null },
          dt,
          mem,
        );
        c.elevator = out.elevator;
        const p = {
          gas,
          quedaMasBaja: 1,
          segundos: t,
          altura: RECOGIDA.altura,
          caida: RECOGIDA.caida,
          alTocar: RECOGIDA.alTocar,
          falta: -RECOGIDA.caida - s.verticalSpeed,
          carga: s.loadFactor,
        };
        c.throttle = conElReloj ? gasDelBimotorEnLaRecogida(p) : deAntes(p, 1);
        m.step(dt, c);
      }
      return { metros: Infinity, segundos: Infinity, gas };
    };
    const antes = vuela(false);
    const ahora = vuela(true);
    // El gas de la senda del JAZ 40 a 89 nudos, el que llevaba al recoger.
    expect(antes.gas).toBeGreaterThan(0.35);
    expect(antes.gas).toBeLessThan(0.6);
    // Con el de antes, los setecientos metros de la tanda 19.
    expect(antes.metros).toBeGreaterThan(600);
    // Con el del reloj, lo que tarda un Seneca al ralentí: menos de la mitad.
    expect(ahora.metros).toBeLessThan(antes.metros / 2);
    expect(ahora.metros).toBeLessThan(350);
  });
});
