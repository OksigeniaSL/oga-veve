/**
 * Un bote en la carrera de despegue no es un aterrizaje.
 *
 * El modelo sencillo tiene una regla buena: **aterrizado es aterrizado**. Una
 * vez que las ruedas tocan viniendo de volar, no se vuelve a despegar
 * rebotando —«el avión se vuela después de haber aterrizado»—; hay que rodar
 * despacio primero, y entonces ya es un despegue nuevo.
 *
 * Lo que esa regla no distinguía es **de dónde venían las ruedas**. En una
 * carrera de despegue el avión se levanta un palmo y vuelve a tocar por
 * cualquier cosa: un bache, una ráfaga, o tirar de la palanca y soltarla. Ese
 * palmo se apuntaba como toma, y a partir de ahí el modelo se negaba a dejarlo
 * subir hasta rodar por debajo de doce metros por segundo — que es justo lo
 * que no va a pasar, porque está acelerando.
 *
 * Medido en Mariscal Estigarribia con el banco de vuelo entero:
 *
 *     117s 28m/s elev 0.80  sube  0.0  suelo 1.4m ruedas enPista eje 0m
 *     118s 29m/s elev -0.19 sube -0.1  suelo 1.4m  aire  enPista eje 1m
 *     118s 29m/s elev 0.80  sube  0.0  suelo 1.4m ruedas enPista eje 1m
 *     …
 *     223s 31m/s  →  fuera de la pista, 2,5 km de campo, sin despegar
 *
 * Un fotograma en el aire —menos de diez centímetros— y el avión recorría la
 * pista entera y dos kilómetros y medio de campo **con el gas a fondo y la
 * palanca atrás**, sin despegar y sin que nada lo explicara. Desde la cabina
 * eso es lo peor que puede pasar: estoy haciendo lo correcto y no pasa nada.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ArcadeFlightModel } from "./arcade";
import { PYKASU } from "./aircraft";
import { neutralControls } from "./model";

/** Un avión en la cabecera, con el suelo plano y la pista debajo. */
function enLaCabecera(): ArcadeFlightModel {
  const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
  m.reset({
    position: new Vector3(0, PYKASU.gearHeight, 0),
    heading: 0,
    airspeed: 0,
  });
  // Sin esto el modelo no deja despegar, y con razón: de una calle de rodaje
  // no se despega. Ver `canClimb`.
  m.state.onRunway = true;
  return m;
}

const aFondo = { ...neutralControls(), engineOn: true, throttle: 1 };

/** Acelera hasta la velocidad pedida sin tocar la palanca. */
function correrHasta(m: ArcadeFlightModel, hasta: number): void {
  for (let t = 0; t < 120 && m.state.airspeed < hasta; t += 0.05) {
    m.step(0.05, aFondo);
    m.state.onRunway = true;
  }
}

/** Y ahora tira, y dice cuánto ha subido en los segundos siguientes. */
function tirarYSubir(m: ArcadeFlightModel, segundos = 8): number {
  const y0 = m.state.position.y;
  const tirando = { ...aFondo, elevator: 0.8 };
  for (let t = 0; t < segundos; t += 0.05) {
    m.step(0.05, tirando);
    m.state.onRunway = true;
  }
  return m.state.position.y - y0;
}

describe("el bote en la carrera de despegue", () => {
  it("de partida, con carrerilla y tirando, despega", () => {
    const m = enLaCabecera();
    correrHasta(m, PYKASU.rotationSpeed + 2);
    expect(tirarYSubir(m)).toBeGreaterThan(10);
  });

  it("y después de dar un bote, **también**", () => {
    /*
     * El bote: un tirón corto que lo levanta un palmo y se suelta. Es lo que
     * hace cualquiera —y lo que hacía el piloto del banco— y lo que dejaba al
     * avión pegado al suelo para el resto del vuelo.
     */
    const m = enLaCabecera();
    correrHasta(m, PYKASU.rotationSpeed + 2);
    const tiron = { ...aFondo, elevator: 0.8 };
    for (let t = 0; t < 0.15; t += 0.05) {
      m.step(0.05, tiron);
      m.state.onRunway = true;
    }
    const arriba = m.state.heightAboveGround;
    /*
     * Y se empuja para que vuelva a tocar, que es lo que hacía el piloto del
     * banco sin querer: al pasar a su lazo de vuelo pedía −0,19 y el avión se
     * posaba otra vez en el mismo segundo.
     */
    const soltando = { ...aFondo, elevator: -1 };
    for (let t = 0; t < 6 && !m.state.onGround; t += 0.05) {
      m.step(0.05, soltando);
      m.state.onRunway = true;
    }
    // Un bote, no un vuelo: lo que se levantó cabe en un escalón.
    expect(arriba - PYKASU.gearHeight).toBeLessThan(3);
    expect(m.state.onGround).toBe(true);
    // Lo que se comprueba: que el bote no le haya quitado el permiso de volar.
    expect(tirarYSubir(m)).toBeGreaterThan(10);
  });

  it("pero después de aterrizar de verdad, no se rebota al aire", () => {
    /*
     * La regla original sigue en pie, que es lo que hay que no romper: quien
     * llega volando y toca, aterriza. Si lo que quería era no aterrizar, eso
     * se decide en el aire y se llama frustrada.
     */
    const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    m.reset({
      position: new Vector3(0, 60, 0),
      heading: 0,
      airspeed: PYKASU.approachSpeed,
    });
    m.state.onRunway = true;
    // Bajar hasta tocar, con el motor puesto: es la toma que se describía.
    const bajando = { ...neutralControls(), engineOn: true, throttle: 0.3 };
    for (let t = 0; t < 60 && !m.state.onGround; t += 0.05) {
      m.step(0.05, bajando);
      m.state.onRunway = true;
    }
    expect(m.state.onGround).toBe(true);
    // Y ahora, a fondo y tirando: no se despega, porque ya aterrizó.
    expect(tirarYSubir(m, 4)).toBeLessThan(1);
  });
});
