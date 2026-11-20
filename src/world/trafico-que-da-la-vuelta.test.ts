/**
 * **El que aterriza y tiene que dar media vuelta en la pista la da casi
 * parado, y vuelve a paso de rodaje** (H41).
 *
 * En Los Rodeos, por la 12 y con la final del JAZ 90, el banco vio un avión
 * del tráfico «de frente» a dos kilómetros y medio, a ras de pista: EC-TIX,
 * un turbohélice que acababa de aterrizar delante. Con los puestos de su lado
 * cogidos, su salida era la de los 590 m —la rápida trazada para la 30—, por
 * detrás de los 900 m en los que acaba de frenar: seguía hasta ahí, daba la
 * vuelta y volvía por la pista. Y la velocidad bajaba en línea recta de la
 * toma a la boca de la salida contada por el camino, vuelta incluida, así que
 * la media vuelta se daba a 23 m/s y el remonte hacia el umbral, hacia quien
 * venía en final, a más de 20. Un reactor, a 32.
 *
 * Lo de verdad: se frena hasta casi parar, se da la vuelta y se remonta a
 * paso de rodaje, unos veinte nudos. Ver `alVirarEnLaPista` en `trafico.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  alVirarEnLaPista,
  crearTrafico,
  REMONTA_A,
  tiposDelCampo,
  VIRA_A,
  virajesCerrados,
  type Sitio,
} from "./trafico";
import { formaDelCircuito, manoPublicada } from "./circuito";
import { relieveDe } from "./relieve-en-disco";
import { SCENARIOS, conViento } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import { cabeceraEnUso } from "./terrain";
import { sueloDelTrafico } from "./suelo-del-trafico";

const sitio = (x: number, z: number): Sitio => ({ x, y: 0, z });

describe("dónde da media vuelta un camino", () => {
  it("una salida normal, recta o en curva, no es media vuelta", () => {
    // Por el eje y a la derecha en ángulo recto, con la curva en tramos cortos.
    const curva = [sitio(0, 0), sitio(500, 0)];
    for (let g = 10; g <= 90; g += 10) {
      const a = (g * Math.PI) / 180;
      curva.push(sitio(500 + 30 * Math.sin(a), 30 - 30 * Math.cos(a)));
    }
    curva.push(sitio(530, 300));
    expect(virajesCerrados(curva, 0, Infinity)).toEqual([]);
  });

  it("dar la vuelta en el eje sí, también partida por un tramo de centímetros", () => {
    const vuelta = [sitio(0, 0), sitio(900, 0), sitio(900, 0.01), sitio(600, 0), sitio(600, 200)];
    const giros = virajesCerrados(vuelta, 0, Infinity);
    expect(giros.length).toBeGreaterThan(0);
    expect(Math.min(...giros)).toBeCloseTo(900, 0);
  });

  it("y una salida rápida trazada para la cabecera contraria, también", () => {
    // La de los 590 m de la 12 en Los Rodeos: vuelve hacia atrás a unos quince grados.
    const salida = [sitio(0, 0), sitio(590, 0), sitio(551, -7), sitio(488, -22), sitio(367, -57)];
    expect(virajesCerrados(salida, 0, Infinity)).not.toEqual([]);
  });
});

describe("a cuánto va el que da media vuelta en la pista", () => {
  it("llega a la vuelta a paso de vuelta y remonta como mucho a veinte nudos", () => {
    const virajes = [900];
    // Lejos de la vuelta, lo suyo.
    expect(alVirarEnLaPista(40, 300, virajes, 1300)).toBe(40);
    // En la vuelta, casi parado.
    expect(alVirarEnLaPista(25, 900, virajes, 1300)).toBeCloseTo(VIRA_A, 5);
    // Y de vuelta por la pista, nunca más que el remonte.
    for (let r = 901; r < 1300; r += 10)
      expect(alVirarEnLaPista(25, r, virajes, 1300)).toBeLessThanOrEqual(REMONTA_A + 1e-9);
    // Fuera de la pista, ya no es suyo.
    expect(alVirarEnLaPista(7, 1300, virajes, 1300)).toBe(7);
  });
});

describe("en Los Rodeos, con el campo llenándose, nadie corre por la pista hacia el umbral", () => {
  const esc0 = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
  // Con el viento del banco, 040/12, se aterriza por la 12; y con el contrario, por la 30.
  for (const vientoDe of [40, 220]) {
    it(`con viento de ${vientoDe}`, () => {
      const esc = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 12 });
      const aero = esc.aerodrome!;
      const rel = relieveDe([esc.id], aero.origin);
      const cota = aero.elevationM ?? 0;
      const suelo = (x: number, z: number) => rel(x, z) ?? cota;
      const pista = esc.runway;
      const calles = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
      const h = (pista.heading * Math.PI) / 180;
      const ux = pista.x - (Math.sin(h) * pista.length) / 2;
      const uz = pista.z + (Math.cos(h) * pista.length) / 2;
      const along = (x: number, z: number) => (x - ux) * Math.sin(h) - (z - uz) * Math.cos(h);
      const across = (x: number, z: number) => (x - ux) * Math.cos(h) + (z - uz) * Math.sin(h);
      const t = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
        tipos: tiposDelCampo(aero.id, pista.length),
        forma: (escala) =>
          formaDelCircuito(pista, cota, suelo, escala, manoPublicada(esc, cabeceraEnUso(esc), escala)),
        tierra: () => (calles ? { suelo: calles, alto: suelo } : null),
      });
      const matriculas = ["EC-TIX", "EC-HWR", "EC-RTI", "EC-KRV", "EC-ABC", "EC-ESB", "EC-FYY", "EC-LMN"];
      const PASO = 0.25;
      const antes = new Map<string, { x: number; z: number }>();
      /** Lo más deprisa que alguien corrió por la pista hacia el umbral de aterrizar, m/s. */
      let peor = 0;
      let donde = "";
      /** Cuántas veces se vio a alguien volviendo por la pista: que la prueba mire algo. */
      let volviendo = 0;
      for (let k = 0; k * PASO < 900; k++) {
        if (k % Math.round(90 / PASO) === 0)
          t.anuncia(matriculas[(k / Math.round(90 / PASO)) % matriculas.length]!, "otro.final", true);
        t.paso(PASO);
        for (const a of t.quienes()) {
          const p = antes.get(a.matricula);
          antes.set(a.matricula, { x: a.x, z: a.z });
          if (!p) continue;
          const enLaPista = a.y - suelo(a.x, a.z) < 5 && Math.abs(across(a.x, a.z)) < 30;
          if (!enLaPista) continue;
          const haciaElUmbral = -(along(a.x, a.z) - along(p.x, p.z)) / PASO;
          if (haciaElUmbral > 1) volviendo++;
          if (haciaElUmbral > peor) {
            peor = haciaElUmbral;
            donde = `${(k * PASO).toFixed(1)} s ${a.matricula} ${a.tipo} a ${Math.round(along(a.x, a.z))} m del umbral`;
          }
        }
      }
      t.dispose();
      if (vientoDe === 40) expect(volviendo, "por la 12 alguien da la vuelta").toBeGreaterThan(0);
      expect(peor, donde).toBeLessThanOrEqual(REMONTA_A + 0.25);
    });
  }
});
