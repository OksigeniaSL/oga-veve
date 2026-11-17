/**
 * **El avisador de pérdida en el circuito**: con los flaps de en medio, a la de
 * maniobra de su muesca, se vira sin que suene.
 *
 * En el vuelo entero del JAZ 90 en Los Rodeos sonó «stall, stall» dos veces
 * virando al viento en cola: 126 nudos verdaderos, quince grados de flaps,
 * 1,14 g, α 11,3° con el avisador a 11,28°. No era el avisador —sale de la
 * pérdida con esos flaps y su siete por ciento, `anguloDeAviso`— ni la
 * velocidad que pide el juego, que con la segunda muesca es la Vref y veinte
 * (`escalera-de-velocidades.ts`): era la que volaba el banco, la Vref y quince
 * con cualquier muesca, y en verdadera. Con la Vref de 132 eso le dejaba 1,24
 * veces la pérdida con la segunda; con la de la FAA, 118, 1,18 en Los Rodeos, y
 * un viraje de treinta grados la pide a 1,15 (enmienda H25a del ADR 0027).
 *
 * Lo que se vuela de verdad con unos flaps es la de maniobra de esos flaps,
 * 1,3 veces su pérdida (`maniobraCon`): es lo que aquí se prueba, en cada
 * muesca de cada avión, contra el umbral al que el modelo pone su avisador.
 * El caso del banco va al final, con el fallo y sin él.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, aircraftById, masaDe, type AircraftConfig } from "./aircraft";
import { aireDelParte, airDensity, GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { type AssistLayers } from "./assists";
import { CoefficientFlightModel, liftCoefficient } from "./fdm";
import { muescaDeAproximacion, muescasDeLaPalanca } from "./flaps";
import { neutralControls } from "./model";
import { TAGUATO, TAGUATO_RUVICHA, TUKA } from "./tiers";
import { maniobraCon, perdidaCon } from "./velocidades-de-despegue";

const grados = (g: number): number => (g * Math.PI) / 180;
const enGrados = (r: number): number => (r * 180) / Math.PI;
const NUDO = 0.514444;

const PELDANOS: readonly (readonly [string, AssistLayers])[] = [
  ["Tukã", TUKA.assists],
  ["Taguató", TAGUATO.assists],
  ["Taguato Ruvicha", TAGUATO_RUVICHA.assists],
];

/** El circuito de Los Rodeos: su cota y trescientos metros, a 21 °C en el campo. */
const COTA = 632;
const ALTO = COTA + 300;
const AIRE = aireDelParte(21, COTA);

/** La raíz de la densidad relativa, que es lo que separa la indicada de la verdadera. */
const raiz = (): number => Math.sqrt(airDensity(ALTO, AIRE) / SEA_LEVEL_DENSITY);

/** El ángulo de pérdida del modelo en ese peldaño. Ver `stallAngle` en `fdm.ts`. */
const perdidaDe = (a: AircraftConfig, capas: AssistLayers): number =>
  a.aero.alphaStall * (1 + 0.45 * capas.stallProtection);

/** A qué ángulo pone el modelo su avisador con estos flaps, en ese peldaño. */
function umbralCon(a: AircraftConfig, capas: AssistLayers, flaps: number): number {
  const modelo = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: capas });
  const s = modelo.state;
  s.onGround = false;
  s.position.set(0, ALTO, 0);
  s.velocity.set(0, 0, -maniobraCon(a, flaps) / raiz());
  s.orientation.setFromAxisAngle(new Vector3(1, 0, 0), grados(4));
  modelo.step(1 / 60, { ...neutralControls(), flaps, tren: 1, throttle: 0.4 });
  return s.stallWarningAlpha;
}

/**
 * **El ángulo que pide un viraje nivelado** a esta indicada y con esta carga:
 * el ala tiene que dar `n` veces el peso. Se busca en la curva del modelo, que
 * es la que vuela.
 */
function anguloQuePide(
  a: AircraftConfig,
  capas: AssistLayers,
  flaps: number,
  indicada: number,
  carga: number,
): number {
  const q = 0.5 * SEA_LEVEL_DENSITY * indicada * indicada;
  const pide = (carga * masaDe(a) * GRAVITY) / (q * a.wingArea);
  let alfa = 0;
  while (liftCoefficient(alfa, a.aero, perdidaDe(a, capas)) + a.flapsLift * flaps < pide && alfa < 1)
    alfa += grados(0.02);
  return alfa;
}

/**
 * Cuarenta grados: los veinticinco de un viraje de circuito con quince de
 * propina, que es lo que tiene que aguantar la de maniobra de una muesca sin
 * aviso (los manuales de Boeing; en el E-Jet, «full bank protected»).
 */
const CARGA_DE_CUARENTA = 1 / Math.cos(grados(40));
/** Y treinta, lo más que vira el banco en el circuito: `TOPE_DE_INCLINACION_EN_LA_BASE`. */
const CARGA_DE_TREINTA = 1 / Math.cos(grados(30));

describe("el avisador de pérdida con los flaps de en medio", () => {
  for (const a of AIRCRAFT) {
    if (!a.llevaFlaps) continue;
    for (const [peldano, capas] of PELDANOS)
      for (const flaps of muescasDeLaPalanca(a))
        it(`${a.id} en ${peldano}, flaps ${flaps.toFixed(2)}: a la de maniobra, virando a cuarenta grados, calla`, () => {
          const umbral = umbralCon(a, capas, flaps);
          const alfa = anguloQuePide(a, capas, flaps, maniobraCon(a, flaps), CARGA_DE_CUARENTA);
          expect(enGrados(alfa), `${a.id}: avisa a ${enGrados(umbral).toFixed(2)}°`).toBeLessThan(
            enGrados(umbral),
          );
        });
  }
});

describe("el viento en cola del JAZ 90 en Los Rodeos", () => {
  const ARAI = aircraftById("jaz-90");
  const capas = TAGUATO.assists;
  const segunda = muescasDeLaPalanca(ARAI)[muescaDeAproximacion(ARAI)]!;
  const umbral = umbralCon(ARAI, capas, segunda);

  it("el avisador con la segunda muesca es el del vuelo entero: 11,28°", () => {
    // Lo que apuntó `cantar()` al sonar: «α 11.3° · n 1.14 · flaps 0.67».
    expect(segunda).toBeCloseTo(2 / 3, 5);
    expect(enGrados(umbral)).toBeCloseTo(11.28, 1);
  });

  it("con el fallo: a la Vref y quince en verdadera, como volaba el banco, no aguanta un viraje", () => {
    /*
     * La de antes del banco: la Vref más quince nudos, comparada con la
     * verdadera. En indicada, en el circuito de Los Rodeos, un 7 % menos.
     */
    const delBanco = (ARAI.approachSpeed + 15 * NUDO) * raiz();
    expect(delBanco / perdidaCon(ARAI, segunda)).toBeLessThan(1.2);
    // Cuarenta grados, lo que tiene que aguantar: suena.
    expect(enGrados(anguloQuePide(ARAI, capas, segunda, delBanco, CARGA_DE_CUARENTA))).toBeGreaterThan(
      enGrados(umbral),
    );
    /*
     * Y lo que se midió: el banco se quedaba unos seis nudos por debajo de lo
     * que pedía —126 verdaderos de 133— y viraba con 1,14 g. Suena, como sonó.
     */
    const volada = delBanco * (126 / 132.7);
    expect(enGrados(anguloQuePide(ARAI, capas, segunda, volada, 1.14))).toBeGreaterThan(
      enGrados(umbral),
    );
  });

  it("sin él: a la de maniobra de la segunda, con los mismos seis nudos de menos y treinta grados, calla", () => {
    const deManiobra = maniobraCon(ARAI, segunda);
    // Es la que pide el juego con esos flaps, la Vref y veinte, a dos nudos.
    expect(deManiobra / NUDO).toBeGreaterThan(ARAI.approachSpeed / NUDO + 18);
    expect(deManiobra / NUDO).toBeLessThan(ARAI.approachSpeed / NUDO + 22);
    const volada = deManiobra * (126 / 132.7);
    expect(enGrados(anguloQuePide(ARAI, capas, segunda, volada, CARGA_DE_TREINTA))).toBeLessThan(
      enGrados(umbral) - 0.5,
    );
  });

  it("y con los de aterrizar, la Vref y quince de la base sigue siendo de sobra", () => {
    // Por eso la base no cambia: la de maniobra de las de aterrizar queda debajo.
    const aterrizar = muescasDeLaPalanca(ARAI).at(-1)!;
    expect(maniobraCon(ARAI, aterrizar)).toBeLessThan(ARAI.approachSpeed + 15 * NUDO);
    const delBanco = (ARAI.approachSpeed + 15 * NUDO) * raiz();
    expect(
      enGrados(anguloQuePide(ARAI, capas, aterrizar, delBanco, CARGA_DE_TREINTA)),
    ).toBeLessThan(enGrados(umbralCon(ARAI, capas, aterrizar)));
  });
});
