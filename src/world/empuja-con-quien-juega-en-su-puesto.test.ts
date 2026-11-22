/**
 * **El reactor del tráfico de Los Rodeos empuja con quien juega en su puesto** (H51, ADR
 * 0025), que es lo que monta el banco `ver-remolque-del-trafico.mjs`.
 *
 * El banco ponía a quien juega en el JAZ 20, en su puesto de salida con el viento de
 * siempre (−652,6, −553,0), y anunciaba EC-PSH, que se iba al 23. En la tanda 20 el
 * tractor no salió en cuatrocientos segundos. No era una regresión —lo mismo con el
 * código de la H48, 590a69b4—, ni le faltaba el permiso: la avioneta aparcada queda en
 * lo que barre el empuje del 23, a menos de la separación de ala, y el control de
 * tierra no autoriza un empuje que la barre (`calleLibreParaEmpujar`, H41d). En el
 * juego eso se resuelve solo, cuando quien juega rueda; el banco no rueda nunca.
 *
 * Con el JAZ 90 en su puesto, el 24, el reactor se va al 17 y empuja enseguida; sin
 * nadie, al 24, también. El banco pone ahora el JAZ 90, y esto mira las tres cosas con
 * la cuenta de tráfico de verdad: lo que el banco espera ver, y por qué con el JAZ 20
 * no lo veía. Desde la H60b el reactor aparca en el 23 sobre su raya pintada, y su
 * empuje ya no barre el sitio del JAZ 20: con él aparcado, también empuja.
 */
import { describe, expect, it } from "vitest";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { conSuAerodromo, conViento, SCENARIOS } from "./scenarios";
import { vientoDeCasa } from "./meteo";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, type QuienJuega } from "./trafico";
import { PlanDeVuelo, separacionEnTierra } from "./plan-de-vuelo";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";

const PASO = 0.25;
const MATRICULA = "EC-PSH";

describe("el reactor del tráfico de Los Rodeos, con quien juega en su puesto", async () => {
  const base = await conSuAerodromo(SCENARIOS.find((e) => e.id === "tenerife-norte")!);
  const esc = conViento(base, vientoDeCasa(base.vientoDominante));
  const aero = esc.aerodrome as Aerodrome;
  const cota = aero.elevationM ?? 0;

  /**
   * El tráfico como lo monta el juego con quien juega parado en su puesto de salida —su
   * sitio, su puesto y su raya, sin rodar todavía—, y cuándo sale el tractor de EC-PSH.
   */
  function tractorDe(avionId: string | null, segundos: number): { readonly puesto: { x: number; z: number } | null; readonly tractor: number | null } {
    const avion = avionId ? AIRCRAFT.find((a) => a.id === avionId)! : null;
    let arranque: readonly [number, number] | null = null;
    let raya: readonly (readonly [number, number])[] = [];
    if (avion) {
      const plan = new PlanDeVuelo(aero, esc.runway, () => cota, avion);
      plan.deContacto = vaALaPasarela(avion);
      plan.reiniciar();
      arranque = plan.arranque();
      raya = plan.rutaVisible();
    }
    const tu: QuienJuega | null =
      avion && arranque
        ? {
            alUmbral: null,
            enLaPista: false,
            enTierra: {
              x: arranque[0],
              z: arranque[1],
              separacion: separacionEnTierra(avion.wingSpan),
              porDondeVa: [],
              esperandoLaPista: false,
              ruta: [],
            },
          }
        : null;
    const suelo = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 45);
    const fin = raya.at(-1);
    const trafico = crearTrafico(esc.runway, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, esc.runway.length, sinTorre(aero)),
      quienJuega: () => tu,
      tierra: () =>
        suelo
          ? {
              suelo,
              alto: () => cota,
              evitar: arranque ? [{ x: arranque[0], z: arranque[1] }, ...(fin ? [{ x: fin[0], z: fin[1] }] : [])] : [],
              porDondeVas: raya.map(([x, z]) => ({ x, z })),
              tuPuesto: arranque && avion ? { x: arranque[0], z: arranque[1], semiala: avion.wingSpan / 2 } : null,
            }
          : null,
    });
    trafico.anuncia(MATRICULA, "otro.rodando");
    const puesto = trafico.porDentro().find((q) => q.matricula === MATRICULA)?.puesto ?? null;
    for (let t = 0; t < segundos; t += PASO) {
      trafico.paso(PASO);
      if (trafico.grupo.children.some((o) => o.name === "remolque")) return { puesto, tractor: t };
    }
    return { puesto, tractor: null };
  }

  /*
   * Desde el 14, de pasarela. Era el 17, a lo que alcanza una pasarela de la terminal, pero en el
   * AIP (AD 2-GCXO PDC 1.2) el 17 es de salida autónoma («A»), de ATR 72 como mucho y sin
   * pasarela: de él no sale nadie empujado (H60f).
   */
  it("con el JAZ 90 en el 24, el del banco, empuja desde el 14 enseguida", () => {
    const r = tractorDe("jaz-90", 60);
    expect(r.puesto?.x).toBeCloseTo(-360.5, 0);
    expect(r.tractor, "el tractor sale").not.toBeNull();
    expect(r.tractor!).toBeLessThan(5);
  });

  it("sin nadie, también", () => {
    expect(tractorDe(null, 60).tractor).not.toBeNull();
  });

  /*
   * **Y con el JAZ 20 aparcado junto al 23, ya no espera** (H60b): el reactor aparca en el 23
   * sobre su raya pintada, a 47° y no a los 78° de su camino, y el tractor lo saca de
   * espaldas hacia el suroeste; lo que barre ya no llega al sitio del JAZ 20, que le queda al
   * noroeste. Con el rumbo del camino lo barría, y esperaba a que rodara (H51). Que el
   * tractor espere cuando lo que barre alcanza a alguien lo mira `trafico-empujado.test.ts`.
   */
  it("y con el JAZ 20 aparcado junto al 23, empuja: sobre su raya pintada no barre su sitio", () => {
    const r = tractorDe("jaz-20", 60);
    expect(r.puesto?.x).toBeCloseTo(-596, 0);
    expect(r.tractor, "el tractor sale").not.toBeNull();
  });
});
