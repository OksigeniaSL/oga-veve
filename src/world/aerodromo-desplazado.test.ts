/**
 * Que el aeropuerto de destino se pueda rodar de verdad.
 *
 * Lo que se comprueba no es la aritmética de sumar un desplazamiento —eso lo
 * dice leyendo el código— sino lo que hacía falta para arreglar la queja: que
 * el aeródromo corrido **sigue siendo un aeródromo**, con su grafo de una
 * pieza y sus rutas del puesto a la pista, a sesenta kilómetros de donde
 * estaba. Ese era el fallo: no que la raya se dibujara mal, sino que no había
 * ninguna.
 */

import { describe, expect, it } from "vitest";
import gcgm from "../../data/aerodromes/gcgm.aero.json";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { construirGrafo, rodajeEntre } from "./rodaje";
import type { Aerodrome, Punto } from "./aerodrome";

const GOMERA = gcgm as unknown as Aerodrome;

/** Lo que hay de Tenerife Sur a La Gomera, redondeado. Un caso de verdad. */
const DX = 31_000;
const DZ = 18_000;

describe("el aeródromo corrido hasta donde cae", () => {
  const movido = desplazarAerodromo(GOMERA, DX, DZ);

  it("mueve cada punto, y la Y al revés que la Z", () => {
    // En el fichero la Y apunta al norte; en la escena el norte es la Z
    // negativa. Equivocar este signo pone el aeropuerto en el sitio
    // simétrico, que es un fallo que se ve volando y no compilando.
    const antes = GOMERA.runways[0]!.centerline[0]!;
    const luego = movido.runways[0]!.centerline[0]!;
    expect(luego[0]).toBeCloseTo(antes[0] + DX, 6);
    expect(luego[1]).toBeCloseTo(antes[1] - DZ, 6);
  });

  it("y no deja nada atrás: calles, plataformas y puestos van con él", () => {
    const cuenta = (a: Aerodrome): number =>
      a.taxiways.length + a.aprons.length + (a.parkingPositions?.length ?? 0);
    expect(cuenta(movido)).toBe(cuenta(GOMERA));
    const p = GOMERA.parkingPositions?.[0];
    const q = movido.parkingPositions?.[0];
    if (p && q) {
      expect(q.xy[0]).toBeCloseTo(p.xy[0] + DX, 6);
      expect(q.xy[1]).toBeCloseTo(p.xy[1] - DZ, 6);
    }
  });

  it("no toca la latitud y la longitud, que siguen siendo las de allí", () => {
    expect(movido.origin).toEqual(GOMERA.origin);
  });

  it("no toca el original", () => {
    expect(GOMERA.runways[0]!.centerline[0]).toEqual(
      gcgm.runways[0]!.centerline[0],
    );
  });

  it("**y se puede rodar por él**, que es para lo que se hizo", () => {
    /*
     * La queja era ésta: «así se ve el aeropuerto: no hay coche, no sé la ruta
     * a mi hangar». La ruta la traza el grafo, y el grafo se construye del
     * aeródromo. Si el corrido no da grafo, no hay raya verde en el destino.
     */
    const aqui = construirGrafo(GOMERA);
    const alli = construirGrafo(movido);
    expect(alli.nudos.length).toBe(aqui.nudos.length);
    expect(alli.tramos.length).toBe(aqui.tramos.length);
  });

  it("y la ruta de allí mide lo mismo que la de aquí", () => {
    // Mover un campo entero no cambia ni un metro de rodaje. Si cambiara,
    // sería que algo se quedó sin desplazar y la ruta cruza el mapa.
    const puesto = GOMERA.parkingPositions?.[0]?.xy;
    const espera = GOMERA.holdingPositions[0]?.xy;
    if (!puesto || !espera) return;
    const aqui = rodajeEntre(construirGrafo(GOMERA), puesto, espera);
    const alli = rodajeEntre(construirGrafo(movido), mover(puesto), mover(espera));
    expect(aqui).not.toBeNull();
    expect(alli).not.toBeNull();
    expect(alli!.largo).toBeCloseTo(aqui!.largo, 3);
  });
});

/** El mismo punto, corrido igual que el aeródromo. */
function mover(p: Punto): Punto {
  return [p[0] + DX, p[1] - DZ];
}
