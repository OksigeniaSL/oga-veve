/**
 * **La recogida de un bimotor de turbina libre** (H72). Ver
 * `recogida-del-turbohelice.mjs`.
 *
 * El JAZ 50 del vuelo entero de Los Rodeos tocó a 2,37, 3,34 y 2,47 m/s en tres
 * vuelos de tres. Aquí se vuela la recogida del banco **tal cual está escrita**
 * —el texto de `recoger`, leído del fichero— con el modelo, el automático, las
 * rachas y el suelo del juego, en la misma pista y con el mismo alisio. La de
 * antes es ese mismo texto sin la mano del turbohélice.
 */
import { describe, expect, it } from "vitest";
import { laRecogidaDelBanco, mesa, textoDelBanco } from "./mesa-de-la-recogida.mjs";
import {
  gasDelTurboheliceEnLaRecogida,
  palancaDeLaActitudDelTurbohelice,
  porLoQueAceleraElTurbohelice,
} from "./recogida-del-turbohelice.mjs";

const banco = textoDelBanco();
const ahora = laRecogidaDelBanco(banco);
const antes = laRecogidaDelBanco(banco, { antesDeH72: true });
const FINALES = 60;
/** El gas de la final de antes, el del pistón. */
const DE_ANTES = { recogida: antes, gasDeLaFinal: { kp: 0.08, ki: 0.03 } };

/** La recogida del JAZ 50 en el vuelo entero: a 8 m, bajando 2,2. */
const RECOGIDA = {
  gas: 0.42,
  quedaMasBaja: 1,
  ruedas: 8,
  segundos: 0,
  altura: 8,
  caida: 2.2,
  alTocar: 1.2,
  verdadera: 37,
  alEmpezar: 37,
  tendencia: 0,
  tarda: 4,
};

describe("el gas del turbohélice en la recogida", () => {
  it("siguiendo el perfil a su velocidad, el de la senda por la altura que queda", () => {
    expect(gasDelTurboheliceEnLaRecogida(RECOGIDA)).toBeCloseTo(0.42, 9);
    const aMedias = { ...RECOGIDA, quedaMasBaja: 0.5, ruedas: 4, segundos: 2, verdadera: 36 };
    expect(gasDelTurboheliceEnLaRecogida(aMedias)).toBeCloseTo(0.21, 9);
    // Y ni la racha que lo hunde ni el globo lo mueven: no los mira.
    const conRacha = { ...aMedias, falta: 1.5, carga: 0.7 };
    expect(gasDelTurboheliceEnLaRecogida(conRacha)).toBeCloseTo(0.21, 9);
  });

  it("sostiene la velocidad que va a llevar cuando el empuje llegue", () => {
    // Pierde un metro por segundo cada segundo: dentro de 1,6 s, 1,6 menos.
    const frena = { ...RECOGIDA, tendencia: -1 };
    expect(gasDelTurboheliceEnLaRecogida(frena)).toBeCloseTo(0.42 + 0.2 * 1.6, 9);
    // Con un motor que no tardara, la de ahora: nada que sostener.
    expect(gasDelTurboheliceEnLaRecogida({ ...frena, tarda: 0 })).toBeCloseTo(0.42, 9);
    // Al ras, la de la recogida normal: una décima menos.
    const alRas = { ...RECOGIDA, quedaMasBaja: 0, ruedas: 0, verdadera: 37 * 0.9 };
    expect(gasDelTurboheliceEnLaRecogida(alRas)).toBeCloseTo(0, 9);
  });

  it("y no para siempre: al doble de lo que dura el perfil, al ralentí", () => {
    // El perfil dura 4,8 s: 8/(2,2 − 1,2)·ln(2,2/1,2).
    const flota = { ...RECOGIDA, verdadera: 33 };
    expect(gasDelTurboheliceEnLaRecogida({ ...flota, segundos: 4.8 })).toBeGreaterThan(0.9);
    expect(gasDelTurboheliceEnLaRecogida({ ...flota, segundos: 9.8 })).toBe(0);
  });
});

describe("y lo que nota en el asiento", () => {
  it("tira con la carga que falta y afloja con la que sobra", () => {
    const p = { porAngulo: 2, acelera: 0, carga: 1 };
    expect(porLoQueAceleraElTurbohelice(p)).toBe(0);
    expect(porLoQueAceleraElTurbohelice({ ...p, carga: 0.8 })).toBeGreaterThan(0.1);
    expect(porLoQueAceleraElTurbohelice({ ...p, carga: 1.2 })).toBeLessThan(-0.1);
    // Con la carga que pide el perfil, nada.
    expect(porLoQueAceleraElTurbohelice({ ...p, acelera: 0.981, carga: 1.1 })).toBeCloseTo(0, 9);
  });
});

describe("y si flota, sostiene la actitud", () => {
  const p = { base: -0.25, porAngulo: 2, alSostener: 0, cabeceo: 0, ritmoDeCabeceo: 0 };

  it("con el morro donde estaba, la palanca de ese instante; si baja o sube, la corrige", () => {
    expect(palancaDeLaActitudDelTurbohelice(p)).toBeCloseTo(-0.25, 9);
    // Baja seis grados, lo que bajaba sosteniendo la palanca: tira.
    expect(palancaDeLaActitudDelTurbohelice({ ...p, cabeceo: (-6 * Math.PI) / 180 })).toBeGreaterThan(-0.06);
    // Y si sube siete, afloja: la de antes se iba a dieciséis metros.
    const sube = { ...p, base: 0.1, cabeceo: (7 * Math.PI) / 180 };
    expect(palancaDeLaActitudDelTurbohelice(sube)).toBeLessThan(-0.1);
    // Y frena lo que gira, sin salirse de lo que da la mano.
    expect(palancaDeLaActitudDelTurbohelice({ ...p, ritmoDeCabeceo: -0.1 })).toBeGreaterThan(-0.2);
    expect(palancaDeLaActitudDelTurbohelice({ ...p, cabeceo: 1 })).toBe(-0.6);
  });
});

describe("y en la mesa, con el modelo y las rachas del juego", () => {
  it("el JAZ 50 toca recogido, y la mesa ve el fallo con la mano de antes", () => {
    const era = mesa({ avion: "jaz-50", masa: 4950, ...DE_ANTES }, FINALES);
    const es = mesa({ avion: "jaz-50", masa: 4950, recogida: ahora }, FINALES);
    // Con la de antes, 20 de 60 a más de 2 m/s y la peor a 4,7: lo que se vio volando.
    expect(era.duras).toBeGreaterThan(12);
    expect(era.laMasDura).toBeGreaterThan(3);
    // Con la de ahora, una de cada cincuenta, y la mediana sin caerse.
    expect(es.duras).toBeLessThanOrEqual(3);
    expect(es.laMasDura).toBeLessThan(2.5);
    expect(es.caidaMediana).toBeLessThan(1.4);
    expect(es.largas).toBe(0);
    expect(es.cortas).toBe(0);
  }, 60_000);

  it("y el JAZ 60, que lleva el mismo motor, también, y flota la cuarta parte", () => {
    const era = mesa({ avion: "jaz-60", ...DE_ANTES }, FINALES);
    const es = mesa({ avion: "jaz-60", recogida: ahora }, FINALES);
    expect(era.duras).toBeGreaterThan(15);
    expect(era.largas).toBeGreaterThan(15);
    expect(es.duras).toBeLessThanOrEqual(4);
    expect(es.laMasDura).toBeLessThan(2.5);
    expect(es.largas).toBeLessThan(era.largas / 2);
  }, 60_000);

  it("y el JAZ 40, de pistón, no cambia: su recogida es la misma", () => {
    const era = mesa({ avion: "jaz-40", ...DE_ANTES }, 10);
    const es = mesa({ avion: "jaz-40", recogida: ahora }, 10);
    expect(es.r.map((x) => [x.metros, x.caida])).toEqual(era.r.map((x) => [x.metros, x.caida]));
    expect(es.duras).toBeLessThanOrEqual(1);
  }, 60_000);

  it("y en aire quieto, los dos de turbina tocan recogidos y en la zona", () => {
    for (const avion of ["jaz-50", "jaz-60"]) {
      const es = mesa({ avion, sigma: 0, recogida: ahora }, 1);
      expect(es.laMasDura).toBeGreaterThan(0.8);
      expect(es.laMasDura).toBeLessThan(1.4);
      expect(es.laMasLarga).toBeGreaterThan(200);
      expect(es.laMasLarga).toBeLessThan(400);
    }
  }, 60_000);
});
