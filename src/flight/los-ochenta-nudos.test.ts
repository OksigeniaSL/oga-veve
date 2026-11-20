import { describe, expect, it } from "vitest";
import { AIRCRAFT, ARAI } from "./aircraft";
import { LosOchentaNudos, OCHENTA_NUDOS } from "./los-ochenta-nudos";
import { CANTOS_DEL_DESPEGUE, DEL_DESPEGUE, claveDeCabina, esDeUnaCaja, loDiceElAvion } from "../audio/cabina";

const NUDO = 0.514444;

/** Una carrera de despegue, nudo a nudo, hasta `hasta`; devuelve en qué nudos cantó. */
function correr(c: LosOchentaNudos, desde: number, hasta: number, corriendo = true): number[] {
  const cantados: number[] = [];
  const paso = desde <= hasta ? 1 : -1;
  for (let kt = desde; paso > 0 ? kt <= hasta : kt >= hasta; kt += paso)
    if (c.paso({ corriendo, enElSuelo: true, indicada: kt * NUDO })) cantados.push(kt);
  return cantados;
}

describe("los ochenta nudos de la carrera de despegue", () => {
  it("se cantan una vez, al pasar la aguja hacia arriba por los ochenta", () => {
    const c = new LosOchentaNudos();
    expect(correr(c, 0, 140)).toEqual([80]);
    expect(OCHENTA_NUDOS / NUDO).toBeCloseTo(80, 6);
  });

  it("un bandazo a media carrera que la saca de su fase no los repite", () => {
    const c = new LosOchentaNudos();
    expect(correr(c, 0, 85)).toEqual([80]);
    // Se va del eje: la fase pasa un momento a «alineando», y vuelve.
    c.paso({ corriendo: false, enElSuelo: true, indicada: 86 * NUDO });
    expect(correr(c, 87, 140)).toEqual([]);
  });

  it("y no en la carrera de aterrizaje, que baja", () => {
    const c = new LosOchentaNudos();
    c.paso({ corriendo: false, enElSuelo: false, indicada: 130 * NUDO });
    expect(correr(c, 130, 0, false)).toEqual([]);
  });

  it("se rearma al volar o al pararse: cada despegue tiene los suyos", () => {
    const c = new LosOchentaNudos();
    expect(correr(c, 0, 140)).toEqual([80]);
    c.paso({ corriendo: false, enElSuelo: false, indicada: 150 * NUDO });
    expect(correr(c, 0, 140)).toEqual([80]);
    // Un despegue abortado a 95 nudos, frenado hasta parar, y otra vez.
    const d = new LosOchentaNudos();
    expect(correr(d, 0, 95)).toEqual([80]);
    expect(correr(d, 95, 0)).toEqual([]);
    expect(correr(d, 0, 140)).toEqual([80]);
  });

  it("con la funda del pitot la aguja no se mueve, y no se cantan", () => {
    const c = new LosOchentaNudos();
    for (let i = 0; i < 100; i++)
      expect(c.paso({ corriendo: true, enElSuelo: true, indicada: 0 })).toBe(false);
  });
});

/*
 * **Y quién los canta**: solo el tipo cuyo procedimiento leído los lleva. El
 * E-Jet, sí (SOPM de Embraer, 3-15-01); los Boeing, por ahora no, que su
 * canto no se ha leído en un FCOM; los de hélice, tampoco.
 */
describe("qué tipo canta los ochenta nudos", () => {
  it("el JAZ 90, de la clase del E170, y ningún otro", () => {
    const clave = claveDeCabina("eighty knots");
    expect(clave).toBe("cabina.eightyKnots");
    for (const a of AIRCRAFT)
      expect(loDiceElAvion("cabina.eightyKnots", a), a.id).toBe(a.id === ARAI.id);
  });

  it("es de la tripulación, no de una caja: sube por la escalera", () => {
    for (const c of DEL_DESPEGUE) expect(esDeUnaCaja(c), c).toBe(false);
    expect(CANTOS_DEL_DESPEGUE.embraer.has("cabina.eightyKnots")).toBe(true);
    expect(CANTOS_DEL_DESPEGUE.boeing.size).toBe(0);
  });
});
