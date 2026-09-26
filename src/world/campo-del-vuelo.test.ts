/**
 * El campo de ahora, con las cuentas que se hacían contra el de casa.
 *
 * Se comprueba con el caso que lo destapó: volar de Gran Canaria a Los
 * Rodeos. La final a la 12 de allí medía la distancia al umbral de Gando, y
 * con ciento trece kilómetros de distancia la aproximación entera quedaba
 * «fuera de la senda»: el aviso de terreno sonaba en una final perfecta, los
 * mínimos no se cantaban y la torre no mandaba nunca irse al aire.
 */

import { describe, expect, it } from "vitest";
import { cabeceraEnUso } from "./terrain";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { dondeCae } from "./entre-aerodromos";
import { enEjesDePista } from "./rumbo";
import { GRAN_CANARIA, TENERIFE_NORTE } from "./scenarios";
import { TIEMPO_DE_CASA, type Meteo } from "./meteo";
import {
  campoDeCasa,
  campoVecino,
  distanciaAlUmbral,
  enLaPistaDe,
  umbralEnUso,
} from "./campo-del-vuelo";

const viento = (de: number, kt: number): Meteo => ({
  ...TIEMPO_DE_CASA,
  vientoDe: de,
  vientoKt: kt,
});

const donde = dondeCae(
  GRAN_CANARIA.aerodrome!.origin,
  TENERIFE_NORTE.aerodrome!.origin,
);
const corrido = desplazarAerodromo(
  TENERIFE_NORTE.aerodrome!,
  donde.x,
  donde.z,
);

/** Un punto a `d` metros antes del umbral en uso, sobre el eje. */
function enFinal(
  campo: ReturnType<typeof campoVecino>,
  d: number,
): readonly [number, number] {
  const [ux, uz] = umbralEnUso(campo);
  const h = (campo.pista.heading * Math.PI) / 180;
  // Hacia delante es (sin h, −cos h): la final queda por detrás del umbral.
  return [ux - Math.sin(h) * d, uz + Math.cos(h) * d];
}

describe("el campo de llegada, corrido y con su viento", () => {
  it("su umbral cae en Los Rodeos y no en Gando", () => {
    const tfn = campoVecino(TENERIFE_NORTE, donde, corrido, TIEMPO_DE_CASA);
    const [ux, uz] = umbralEnUso(tfn);
    // A unos ciento trece kilómetros de casa, y a menos de dos del centro de
    // su propia pista corrida.
    expect(Math.hypot(ux, uz)).toBeGreaterThan(100_000);
    expect(Math.hypot(ux - tfn.pista.x, uz - tfn.pista.z)).toBeLessThan(2000);
  });

  it("en una final de cuatro kilómetros, el umbral está a cuatro", () => {
    const tfn = campoVecino(TENERIFE_NORTE, donde, corrido, TIEMPO_DE_CASA);
    const [x, z] = enFinal(tfn, 4000);
    expect(distanciaAlUmbral(tfn, x, z)).toBeCloseTo(4000, 0);
    // Y medido contra casa, que es lo que hacía el juego: ciento y pico
    // kilómetros, o sea «fuera de la senda» en toda la final.
    expect(distanciaAlUmbral(campoDeCasa(GRAN_CANARIA), x, z)).toBeGreaterThan(
      100_000,
    );
  });

  it("el umbral en uso queda por detrás del centro, en el sentido de la pista", () => {
    const tfn = campoVecino(TENERIFE_NORTE, donde, corrido, TIEMPO_DE_CASA);
    const [ux, uz] = umbralEnUso(tfn);
    const { along, across } = enEjesDePista(
      ux,
      uz,
      tfn.pista.x,
      tfn.pista.z,
      tfn.pista.heading,
    );
    expect(along).toBeLessThan(-tfn.pista.length * 0.4);
    expect(Math.abs(across)).toBeLessThan(tfn.pista.width);
    // Con media pista de sobra se llega al otro umbral: la cuenta va hacia
    // la cabecera de salida y no hacia la de enfrente.
    const [cx, cz] = enLaPistaDe(tfn, 0);
    expect(Math.hypot(cx - tfn.pista.x, cz - tfn.pista.z)).toBeLessThan(200);
  });

  it("con viento del trescientos, se aterriza por la 30 también llegando", () => {
    /*
     * El viento del modelo de vuelo es uno para todo el mundo. Con él del
     * trescientos a quince nudos, Los Rodeos como casa opera por la 30; como
     * destino se quedaba en la 12, con quince nudos de cola.
     */
    const con = viento(300, 15);
    const tfn = campoVecino(TENERIFE_NORTE, donde, corrido, con);
    expect(cabeceraEnUso(tfn.escenario)).toBe("30");
    expect(tfn.pista.heading).toBeCloseTo(290.7, 0);
    // Y es lo mismo que elige siendo casa.
    const casa = campoDeCasa(
      campoVecino(TENERIFE_NORTE, { x: 0, z: 0 }, null, con).escenario,
    );
    expect(cabeceraEnUso(casa.escenario)).toBe("30");
  });

  it("y el umbral en uso se muda al otro extremo con el viento", () => {
    const doce = campoVecino(TENERIFE_NORTE, donde, corrido, TIEMPO_DE_CASA);
    const treinta = campoVecino(TENERIFE_NORTE, donde, corrido, viento(300, 15));
    const [ax, az] = umbralEnUso(doce);
    const [bx, bz] = umbralEnUso(treinta);
    expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThan(
      TENERIFE_NORTE.runway.length * 0.8,
    );
  });

  it("el campo corrido lleva la pista y el aeródromo corridos, y su escenario no", () => {
    const tfn = campoVecino(TENERIFE_NORTE, donde, corrido, TIEMPO_DE_CASA);
    expect(tfn.comoCampo.runway).toBe(tfn.pista);
    expect(tfn.comoCampo.aerodrome).toBe(corrido);
    expect(tfn.escenario.runway.x).toBeCloseTo(TENERIFE_NORTE.runway.x, 6);
    expect(tfn.esCasa).toBe(false);
    expect(campoDeCasa(GRAN_CANARIA).esCasa).toBe(true);
  });
});
