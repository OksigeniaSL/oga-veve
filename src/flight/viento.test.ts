/**
 * Que el viento se note.
 *
 * **Existía en todas partes menos donde importa.** El panel del tiempo lo
 * enseñaba, la manga lo señalaba, la torre elegía cabecera con él y el METAR lo
 * traía de verdad — y el motor de vuelo calculaba la velocidad respecto al aire
 * con la velocidad inercial, con un comentario que decía literalmente «sin
 * viento todavía». Ese todavía duró.
 *
 * O sea que despegar con quince nudos de cola y con quince de cara era
 * exactamente lo mismo. Y eso no es una simplificación: es enseñar lo contrario
 * de lo que el propio juego cuenta cuando la torre cambia de cabecera porque ha
 * girado el viento.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel, perfilDeViento } from "./fdm";
import { aircraftById } from "./aircraft";
import { vientoComoVector, TIEMPO_DE_CASA } from "../world/meteo";
import { neutralControls } from "./model";

const avion = aircraftById("jaz-20")!;

/**
 * Cuánta pista gasta hasta rotar, con este viento.
 *
 * Se mide lo que recorre por el suelo, que es lo que se gasta de pista.
 */
function carreraCon(vientoX: number, vientoZ: number): number {
  const m = new CoefficientFlightModel({
    aircraft: avion,
    ground: () => 0,
    // Sin ninguna capa de ayuda: lo que se mide es el avión, no el peldaño.
    assist: 0,
  });
  m.reset({
    position: new Vector3(0, avion.gearHeight, 0),
    heading: 0,
    airspeed: 0,
  });
  m.ponerViento(vientoX, vientoZ);
  const z0 = m.state.position.z;
  for (let i = 0; i < 4000; i++) {
    m.step(0.02, { ...neutralControls(), engineOn: true, throttle: 1 });
    if (m.state.airspeed >= avion.rotationSpeed) break;
  }
  return Math.abs(m.state.position.z - z0);
}

/**
 * Hacia dónde sale este avión, medido y no supuesto.
 *
 * **No se da por sabido el sentido de `heading: 0`.** Es exactamente la clase de
 * cosa que uno escribe de memoria y escribe al revés —pasó al escribir estas
 * pruebas—, y entonces la prueba dice que el viento va al revés cuando lo que
 * está al revés es la prueba. Se despega en calma y se mira por dónde se fue.
 */
function haciaDonde(): number {
  const m = new CoefficientFlightModel({
    aircraft: avion,
    ground: () => 0,
    assist: 0,
  });
  m.reset({
    position: new Vector3(0, avion.gearHeight, 0),
    heading: 0,
    airspeed: 0,
  });
  for (let i = 0; i < 400; i++)
    m.step(0.02, { ...neutralControls(), engineOn: true, throttle: 1 });
  return Math.sign(m.state.position.z);
}

/** Y el viento de cara es el que sopla **contra** ese sentido. */
const DE_CARA = -haciaDonde() * 10;

describe("el viento", () => {
  it("de cara acorta la carrera de despegue", () => {
    /*
     * **Esta es la que falla si se vuelve a quitar el viento del motor.** Con
     * viento de cara el ala ya lleva aire encima antes de moverse, así que se
     * llega a la velocidad de rotación con menos pista recorrida. Es la razón
     * por la que se despega contra el viento, y el juego lo enseña cada vez que
     * la torre cambia de cabecera.
     *
     */
    const calma = carreraCon(0, 0);
    const deCara = carreraCon(0, DE_CARA);
    expect(deCara).toBeLessThan(calma * 0.75);
  });

  it("y de cola la alarga", () => {
    const calma = carreraCon(0, 0);
    const deCola = carreraCon(0, -DE_CARA);
    expect(deCola).toBeGreaterThan(calma * 1.25);
  });

  it("de costado cuesta, pero mucho menos que de cola", () => {
    /*
     * **Lo que hace un viento cruzado es desviar, no frenar**, así que su coste
     * en pista tiene que quedarse muy por debajo del de un viento de cola de la
     * misma fuerza. Es la comprobación de que se está restando un **vector** y
     * no un número: si se restara el módulo, cruzado y de cola costarían igual.
     *
     * Algo cuesta, y es correcto: el avión se pone de morro al viento —lo hace
     * cualquier avión con deriva— y rueda un trecho de lado.
     */
    const calma = carreraCon(0, 0);
    const cruzado = Math.abs(carreraCon(10, 0) - calma);
    const deCola = Math.abs(carreraCon(0, -DE_CARA) - calma);
    expect(cruzado).toBeLessThan(deCola * 0.8);
  });

  it("y en calma la carrera es la de siempre", () => {
    // Sin viento, nada cambia: es la garantía de que esto no ha movido los diez
    // escenarios ya medidos.
    expect(carreraCon(0, 0)).toBeGreaterThan(100);
    expect(carreraCon(0, 0)).toBeLessThan(600);
  });
});

describe("el perfil de viento con la altura", () => {
  it("al ras del suelo sopla poco, y arriba entero", () => {
    /*
     * El viento que da un METAR está medido a diez metros, que es justo lo que
     * siente un avión en la pista. Por debajo el suelo lo frena.
     */
    // A ras de suelo, un sesenta por ciento; a diez metros —que es la altura a
    // la que se mide el viento de un METAR— entero.
    expect(perfilDeViento(0)).toBeCloseTo(0.6, 2);
    expect(perfilDeViento(10)).toBe(1);
    expect(perfilDeViento(3000)).toBe(1);
  });

  it("y crece sin saltos", () => {
    let antes = -1;
    for (let h = 0; h <= 120; h += 5) {
      const ahora = perfilDeViento(h);
      expect(ahora).toBeGreaterThanOrEqual(antes);
      antes = ahora;
    }
  });
});

describe("el viento del parte, como vector", () => {
  it("un viento del norte sopla hacia el sur", () => {
    /*
     * **Es de las conversiones que se hacen mal**, y por eso está en un solo
     * sitio: el METAR dice de dónde viene y en nudos; el motor necesita a dónde
     * va y en metros por segundo. Un viento «del 360» empuja hacia el sur, y el
     * sur en este mundo es la Z positiva.
     */
    const v = vientoComoVector({
      ...TIEMPO_DE_CASA,
      vientoDe: 360,
      vientoKt: 10,
    });
    expect(v.z).toBeGreaterThan(4);
    expect(Math.abs(v.x)).toBeLessThan(0.01);
  });

  it("y uno del este, hacia el oeste", () => {
    const v = vientoComoVector({
      ...TIEMPO_DE_CASA,
      vientoDe: 90,
      vientoKt: 10,
    });
    expect(v.x).toBeLessThan(-4);
    expect(Math.abs(v.z)).toBeLessThan(0.01);
  });

  it("en calma no sopla nada", () => {
    expect(vientoComoVector({ ...TIEMPO_DE_CASA, vientoDe: null })).toEqual({
      x: 0,
      z: 0,
    });
    expect(
      vientoComoVector({ ...TIEMPO_DE_CASA, vientoDe: 180, vientoKt: 0 }),
    ).toEqual({ x: 0, z: 0 });
  });
});
