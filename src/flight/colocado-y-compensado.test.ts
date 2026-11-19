/**
 * **Un avión colocado en el aire nace compensado, y suelto sigue como iba**
 * (ADR 0002, nota H40b).
 *
 * Es la colocación de `reiniciarEnFinal` en `game.ts` hecha con el modelo
 * solo: equilibrado con los flaps con los que empieza, el gas que sostiene su
 * velocidad —nivelado en un ejercicio, por la senda en la final— y el
 * compensador en `timonDeEquilibrio` con esos flaps, que es lo que pone
 * `dejarloCompensado`. Medio minuto sin nadie a los mandos.
 *
 * Nivelado, en Taguató, como el banco del navegador
 * (`ver-el-gas-al-colocar.mjs`), y en Taguató Ruvichá, sin ayuda ninguna. La
 * final, solo en Taguató Ruvichá: en Taguató, al soltar, la ayuda de subida
 * coge «nivelado» —nunca un descenso: ver `trimClimb` en `fdm.ts`— y la
 * sostiene por encima del compensador, así que allí la senda la lleva quien
 * vuela. Lo que se mira es el compensador, y sin ayuda manda él solo.
 *
 * Y con el compensador en cero, que es como lo dejaba `releaseAll`, no: las
 * avionetas se van hacia la velocidad que sostiene ese compensador, subiendo.
 * Eso también se mira, para que la prueba pueda ver el fallo.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { TAGUATO, TAGUATO_RUVICHA, type Tier } from "./tiers";

const NUDO = 0.514444;
const DT = 1 / 60;
const SEGUNDOS = 30;

function suelto(o: {
  id: string;
  tier: Tier;
  kt: number;
  alto: number;
  /** Grados de senda, bajando; cero, nivelado. */
  senda: number;
  flaps: number;
  /** Otro compensador que el de equilibrio: el cero de antes. */
  trim?: number;
}) {
  const a = AIRCRAFT.find((x) => x.id === o.id)!;
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: o.tier.assists });
  m.reset({
    position: new Vector3(0, o.alto, 0),
    heading: 0,
    airspeed: o.kt * NUDO,
    equilibrado: true,
    flapsDelEquilibrio: o.flaps,
  });
  const c = { ...neutralControls(), flaps: o.flaps, tren: o.flaps > 0 || !a.trenRetractil ? 1 : 0, engineOn: true };
  c.throttle = m.gasPara(o.kt * NUDO, c, -(o.senda * Math.PI) / 180);
  c.trim = o.trim ?? m.timonDeEquilibrio(o.flaps);
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let t = 0; t < SEGUNDOS; t += DT) {
    m.step(DT, c);
    vMin = Math.min(vMin, m.state.airspeed);
    vMax = Math.max(vMax, m.state.airspeed);
  }
  const s = m.state;
  return {
    kt: s.airspeed / NUDO,
    lejos: Math.max(Math.abs(vMin / NUDO - o.kt), Math.abs(vMax / NUDO - o.kt)),
    sube: s.position.y - o.alto,
    vs: s.verticalSpeed,
    // Lo que baja la senda en ese tiempo, a esa velocidad.
    senda: -o.kt * NUDO * Math.sin((o.senda * Math.PI) / 180) * SEGUNDOS,
  };
}

describe("colocado en el aire y compensado, suelto sigue como iba", () => {
  // Las velocidades de la deriva medidas en el navegador (nota H40a).
  const nivelados = [
    { id: "jaz-20", kt: 114.5 },
    { id: "jaz-25", kt: 106.9 },
    { id: "jaz-40", kt: 160.8 },
  ];
  for (const tier of [TAGUATO, TAGUATO_RUVICHA])
    it.each(nivelados)(`en ${tier.id}, el $id nivelado a $kt nudos`, ({ id, kt }) => {
      const r = suelto({ id, tier, kt, alto: 1000, senda: 0, flaps: 0 });
      const que = `${id}: ${kt} → ${r.kt.toFixed(1)} kt, ${r.sube.toFixed(0)} m`;
      expect(r.lejos, que).toBeLessThan(3);
      expect(Math.abs(r.sube), que).toBeLessThan(30);
    });

  it.each(nivelados)("con el compensador en cero, el $id no se queda: frena y sube", ({ id, kt }) => {
    const r = suelto({ id, tier: TAGUATO, kt, alto: 1000, senda: 0, flaps: 0, trim: 0 });
    const que = `${id}: ${kt} → ${r.kt.toFixed(1)} kt, ${r.sube.toFixed(0)} m`;
    expect(kt - r.kt, que).toBeGreaterThan(10);
    expect(r.sube, que).toBeGreaterThan(50);
  });

  // La final de la lección: el JAZ 20 limpio, y el JAZ 90 configurado, con los flaps de aterrizar.
  it.each([
    { id: "jaz-20", kt: 96.2, flaps: 0 },
    { id: "jaz-90", kt: 129, flaps: 1 },
  ])("sin ayuda, el $id en la final a $kt nudos con flaps $flaps baja por la senda a su velocidad", ({ id, kt, flaps }) => {
    const r = suelto({ id, tier: TAGUATO_RUVICHA, kt, alto: 300, senda: 3, flaps });
    const que = `${id}: ${kt} → ${r.kt.toFixed(1)} kt, ${r.sube.toFixed(0)} m (la senda, ${r.senda.toFixed(0)})`;
    // Nace nivelado y con el gas de bajar: los primeros segundos se asienta, y se va a la suya.
    expect(Math.abs(r.kt - kt), que).toBeLessThan(3);
    expect(r.lejos, que).toBeLessThan(6);
    expect(r.sube, que).toBeLessThan(r.senda * 0.8);
    expect(r.sube, que).toBeGreaterThan(r.senda * 1.2);
  });
});
