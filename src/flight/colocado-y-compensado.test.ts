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
 * Nivelado, en Taguató, el peldaño del banco del navegador
 * (`ver-el-gas-al-colocar.mjs`), y en Taguató Ruvichá, sin ayuda ninguna. La
 * final, aquí, solo en Taguató Ruvichá, que es donde manda el compensador
 * solo; con la ayuda de subida de Tukã y Taguató, más abajo (nota H40c).
 *
 * Y con el compensador en cero, que es como lo dejaba `releaseAll`, no: las
 * avionetas se van hacia la velocidad que sostiene ese compensador, subiendo.
 * Eso también se mira, para que la prueba pueda ver el fallo, y sin ayuda: en
 * Taguató, desde H40c, la ayuda de subida sostiene el nivelado colocado por
 * encima del compensador y tapa media falta.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { comoIba, neutralControls, type ControlInputs } from "./model";
import { TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";

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
    trayectoria: -(o.senda * Math.PI) / 180,
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
    const r = suelto({ id, tier: TAGUATO_RUVICHA, kt, alto: 1000, senda: 0, flaps: 0, trim: 0 });
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
    // Nace por la senda, con su gas, y se queda en ella: el fugoide del avión suelto, como mucho.
    expect(Math.abs(r.kt - kt), que).toBeLessThan(3);
    expect(r.lejos, que).toBeLessThan(6);
    expect(r.sube, que).toBeLessThan(r.senda * 0.8);
    expect(r.sube, que).toBeGreaterThan(r.senda * 1.2);
  });
});

/*
 * **Y con la ayuda de subida, la final colocada también baja por su senda**
 * (ADR 0002, nota H40c).
 *
 * En Tukã y en Taguató, al soltar los mandos la ayuda de subida coge lo que
 * lleva el avión entre nivelado y subiendo, nunca una bajada, para no
 * memorizar un transitorio. Recién colocado eso era «nivelado», y con el gas
 * de bajar el avión frenaba por encima de la senda: el JAZ 20 en Taguató, de
 * 96 a 80 nudos y 59 m por encima en cincuenta segundos. Una colocación no es
 * un transitorio: es una petición, como un toque del compensador
 * (`InitialConditions.trayectoria`).
 *
 * La final es la de `reiniciarEnFinal`: el de tren fijo, limpio a vez y media
 * su aproximación; el de tren que se recoge, configurado y a 1,1 veces. Con
 * un avión de cada familia: el JAZ 20, los dos turbohélices y el JAZ 90. Y el
 * cambio de peldaño en el aire, que coloca el modelo nuevo con `comoIba`.
 */
describe("la final colocada, con la ayuda de subida, sostiene su senda", () => {
  const GRADO = Math.PI / 180;
  const SENDA = -3 * GRADO;
  const ALTO = 600;
  /** Cuánto se aparta de la velocidad con la que empieza y de la senda, como mucho. */
  function volar(m: CoefficientFlightModel, c: ControlInputs, segundos: number, v0: number, y0: number) {
    let senda = y0;
    let nudos = 0;
    let metros = 0;
    for (let t = 0; t < segundos; t += DT) {
      m.step(DT, c);
      const s = m.state;
      senda += Math.hypot(s.velocity.x, s.velocity.z) * Math.tan(SENDA) * DT;
      nudos = Math.max(nudos, Math.abs(s.airspeed - v0) / NUDO);
      metros = Math.max(metros, Math.abs(s.position.y - senda));
    }
    return { nudos, metros, kt: m.state.airspeed / NUDO, sobre: m.state.position.y - senda };
  }
  function enFinal(id: string, tier: Tier) {
    const a = AIRCRAFT.find((x) => x.id === id)!;
    const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
    const flaps = a.trenRetractil && a.llevaFlaps ? 1 : 0;
    const entrada = a.trenRetractil ? a.approachSpeed * 1.1 : m.velocidadDeEntradaEnFinal(a.approachSpeed);
    m.reset({
      position: new Vector3(0, ALTO, 0),
      heading: 0,
      airspeed: entrada,
      equilibrado: true,
      flapsDelEquilibrio: flaps,
      trayectoria: SENDA,
    });
    const c = { ...neutralControls(), flaps, tren: 1, engineOn: true };
    c.throttle = m.gasPara(entrada, c, SENDA);
    c.trim = m.timonDeEquilibrio(flaps);
    return { a, m, c, entrada, flaps };
  }
  const casos = [TUKA, TAGUATO].flatMap((tier) =>
    ["jaz-20", "jaz-50", "jaz-60", "jaz-90"].map((id) => ({ tier, id, peldano: tier.id })),
  );

  it.each(casos)("en $peldano, el $id suelto cincuenta segundos", ({ tier, id }) => {
    const { m, c, entrada } = enFinal(id, tier);
    const r = volar(m, c, 50, entrada, ALTO);
    const que = `${id} en ${tier.id}: ${(entrada / NUDO).toFixed(1)} → ${r.kt.toFixed(1)} kt, a ${r.sobre.toFixed(1)} m de la senda`;
    expect(r.nudos, que).toBeLessThan(5);
    expect(r.metros, que).toBeLessThan(10);
  });

  it.each(casos)("en $peldano, el $id que llega por la senda desde el otro peldaño con ayuda, sigue por ella", ({ tier, id }) => {
    // Quince segundos por la senda en el otro peldaño con ayuda, y se cambia.
    const { a, m, c, flaps } = enFinal(id, tier === TUKA ? TAGUATO : TUKA);
    volar(m, c, 15, 0, ALTO);
    const nuevo = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
    nuevo.reset(comoIba(m.state, flaps, m.subidaQueSostiene()));
    // Lo que hace `dejarloCompensado` en `cycleTier`.
    c.trim = nuevo.timonDeEquilibrio(flaps);
    const v0 = nuevo.state.airspeed;
    const r = volar(nuevo, c, 45, v0, nuevo.state.position.y);
    const que = `${id} a ${tier.id}: ${(v0 / NUDO).toFixed(1)} → ${r.kt.toFixed(1)} kt, a ${r.sobre.toFixed(1)} m de la senda`;
    expect(r.nudos, que).toBeLessThan(5);
    expect(r.metros, que).toBeLessThan(12);
  });

  it.each(casos.filter((k) => k.id === "jaz-20" || k.id === "jaz-90"))(
    "en $peldano, el $id que bajaba sin ayuda con el gas quitado no lleva esa bajada como petición",
    ({ tier, id }) => {
      // Lo de `verificar-cambio-de-peldano.mjs`: el gas quitado un momento, y se cambia de peldaño.
      const { a, m, c, flaps, entrada } = enFinal(id, TAGUATO_RUVICHA);
      c.throttle = 0;
      volar(m, c, 6, entrada, ALTO);
      const alCambiar = m.state.verticalSpeed;
      const nuevo = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
      nuevo.reset(comoIba(m.state, flaps, m.subidaQueSostiene()));
      c.trim = nuevo.timonDeEquilibrio(flaps);
      volar(nuevo, c, 3, entrada, ALTO);
      const pedida = nuevo.subidaQueSostiene();
      const que = `${id} a ${tier.id}: ${alCambiar.toFixed(2)} m/s al cambiar, la ayuda sostiene ${pedida?.toFixed(2)}`;
      expect(alCambiar, que).toBeLessThan(entrada * Math.sin(SENDA) * 1.3);
      expect(pedida, que).not.toBeNull();
      expect(pedida!, que).toBeGreaterThanOrEqual(0);
    },
  );

  it.each(casos.filter((k) => k.id === "jaz-20" || k.id === "jaz-90"))(
    "en $peldano, el $id soltado tras empujar no sostiene la bajada del empujón",
    ({ tier, id }) => {
      // Tras pilotar sigue la regla de siempre: al soltar coge nivelado, no la bajada que había.
      const { m, c, entrada } = enFinal(id, tier);
      c.elevator = -0.1;
      volar(m, c, 3, entrada, ALTO);
      const alSoltar = m.state.verticalSpeed;
      c.elevator = 0;
      volar(m, c, 10, entrada, ALTO);
      let vs = 0;
      const n = Math.round(10 / DT);
      for (let k = 0; k < n; k++) {
        m.step(DT, c);
        vs += m.state.verticalSpeed / n;
      }
      const porLaSenda = entrada * Math.sin(SENDA);
      const que = `${id} en ${tier.id}: ${alSoltar.toFixed(2)} m/s al soltar, ${vs.toFixed(2)} de media pasados diez segundos (la senda, ${porLaSenda.toFixed(2)})`;
      expect(alSoltar, que).toBeLessThan(porLaSenda * 1.5);
      // La regla misma: lo que sostiene la ayuda al soltar no es una bajada.
      expect(m.subidaQueSostiene(), que).toBeGreaterThanOrEqual(0);
      /*
       * Y lo que se ve: pasados diez segundos, de media, ya no baja ni a algo
       * más de la mitad de la senda. Era la mitad justa; con los flaps de la
       * actitud de su manual (enmienda H55 del ADR 0027) el JAZ 90 en Tukã
       * vuelve del empujón algo más despacio —de −6,6 m/s a −1,78 de media,
       * donde con los de antes daba −1,68 y la mitad de su senda es −1,74—, y
       * lo que mide la prueba, que no se queda con la bajada del empujón, es
       * lo mismo.
       */
      expect(vs, que).toBeGreaterThan(porLaSenda * 0.55);
    },
  );
});

/*
 * **Y el ILS, colocado compensado, se vuela por la senda con la mano y la
 * rueda** (ADR 0030, enmienda H42). Nace como lo coloca `reiniciarEnFinal`: a
 * la de circuito, limpio y compensado para ella. Al capturar la senda, flaps
 * de aterrizar y tren, y tres grados abajo con la ley vertical del piloto de
 * `ver-ils-con-agujas.mjs`: la mano, tres décimas como mucho, y lo que
 * sostiene un rato, a la rueda. Sin tocar la rueda, el JAZ 50 se lleva la
 * mano casi a su tope, que es donde el banco, con el alisio y su masa, se
 * quedaba corto y se subía por encima de la senda.
 */
describe("el ILS colocado compensado, configurado y por la senda", () => {
  const GRADO = Math.PI / 180;
  const tope = (v: number, t: number) => Math.max(-t, Math.min(t, v));
  function porLaSenda(id: string, rueda: boolean) {
    const a = AIRCRAFT.find((x) => x.id === id)!;
    const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: TAGUATO_RUVICHA.assists });
    const alto = 600;
    m.reset({
      position: new Vector3(0, alto, 0),
      heading: 0,
      airspeed: a.velocidadDeCircuito,
      equilibrado: true,
      flapsDelEquilibrio: 0,
    });
    const c = { ...neutralControls(), flaps: 0, tren: a.trenRetractil ? 0 : 1, engineOn: true };
    c.throttle = m.gasPara(a.velocidadDeCircuito, c, 0);
    c.trim = m.timonDeEquilibrio(0);
    c.flaps = 1;
    c.tren = 1;
    let integral = 0;
    let senda = alto;
    let lejos = 0;
    let mano = 0;
    for (let t = 0; t < 120; t += DT) {
      const s = m.state;
      const ritmo = -Math.hypot(s.velocity.x, s.velocity.z) * Math.tan(3 * GRADO);
      senda += ritmo * DT;
      const vs = ritmo + 0.1 * (senda - s.position.y);
      integral = tope(integral + (vs - s.verticalSpeed) * 0.02 * DT, 0.2);
      if (rueda) {
        const pasa = integral * 0.5 * DT;
        c.trim = tope(c.trim + pasa, 1);
        integral -= pasa;
      }
      c.elevator = tope((vs - s.verticalSpeed) * 0.08 + integral, 0.3);
      c.throttle = Math.max(0, Math.min(1, 0.45 + (a.approachSpeed * 1.25 - s.airspeed) * 0.05));
      m.step(DT, c);
      // El primer medio minuto es la captura: los flaps, el tren y frenar.
      if (t > 30) {
        lejos = Math.max(lejos, Math.abs(m.state.position.y - senda));
        mano = Math.max(mano, Math.abs(c.elevator));
      }
    }
    return { lejos, mano, que: `${id}: a ${lejos.toFixed(1)} m de la senda, la mano hasta ${mano.toFixed(2)}, compensador ${c.trim.toFixed(2)}` };
  }

  it.each(["jaz-20", "jaz-40", "jaz-50"])("el %s, compensando, baja por la senda con la mano en el centro", (id) => {
    const r = porLaSenda(id, true);
    expect(r.lejos, r.que).toBeLessThan(2);
    expect(r.mano, r.que).toBeLessThan(0.05);
  });

  it("el jaz-50, sin tocar la rueda, se lleva la mano casi a su tope", () => {
    const r = porLaSenda("jaz-50", false);
    expect(r.mano, r.que).toBeGreaterThan(0.25);
  });
});
