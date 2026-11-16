/**
 * De qué está hecho el suelo, comprobado.
 *
 * Es una pregunta que se hace sesenta veces por segundo y de la que cuelgan
 * cosas que se notan —cuánta carrera pide un despegue, cuánto traquetea el
 * rodaje— así que equivocarse aquí no se ve como un fallo: se ve como que el
 * avión va raro.
 */

import { describe, expect, it } from "vitest";
import gcxo from "../../data/aerodromes/gcxo.aero.json";
import lemd from "../../data/aerodromes/lemd.aero.json";
import sgas from "../../data/aerodromes/sgas.aero.json";
import yvytu from "../../data/aerodromes/yvytu.aero.json";
import { enElPavimento, type Aerodrome, type Punto } from "./aerodrome";
import { pavimentoDe, ROZAMIENTO, superficieEn, TRAQUETEO } from "./superficie";
import { scenarioById } from "./scenarios";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { mapaDePavimento } from "./vegetation";

describe("la superficie de debajo", () => {
  it("en Yvytu Rape la pista es de hierba, porque lo es", () => {
    const e = scenarioById("yvytu-rape");
    const { x, z } = e.runway;
    expect(superficieEn(e, x, z)).toBe("hierba");
  });

  it("y en Tenerife Norte es asfalto", () => {
    const e = scenarioById("tenerife-norte");
    const { x, z } = e.runway;
    expect(superficieEn(e, x, z)).toBe("asfalto");
  });

  it("lejos de todo es campo", () => {
    const e = scenarioById("tenerife-norte");
    expect(superficieEn(e, 5000, 5000)).toBe("campo");
  });

  it("un escenario sin aeródromo tiene su pista y su campo", () => {
    const e = scenarioById("valle-cordillera");
    const { x, z } = e.runway;
    expect(superficieEn(e, x, z)).toBe("asfalto");
    expect(superficieEn(e, x + 4000, z + 4000)).toBe("campo");
  });

  /*
   * **Y en el aeropuerto de llegada, su asfalto es asfalto.**
   *
   * El juego preguntaba siempre con el escenario de salida, y el aeródromo
   * de destino —el mismo escenario, corrido hasta donde cae visto desde
   * casa— no estaba en esa pregunta: su pista y sus calles eran «campo». Se
   * pregunta con el campo corrido, que es lo que hace ahora `Game`.
   */
  it("en el campo de llegada, su pista y sus calles son asfalto, no campo", () => {
    const casa = scenarioById("gran-canaria");
    const alli = scenarioById("tenerife-norte");
    const DX = -93_000;
    const DZ = -61_000;
    const aero = desplazarAerodromo(alli.aerodrome!, DX, DZ);
    const campo = {
      ...alli,
      aerodrome: aero,
      runway: { ...alli.runway, x: alli.runway.x + DX, z: alli.runway.z + DZ },
    };
    const pista = [campo.runway.x, campo.runway.z] as const;
    const calle = aero.taxiways.find((t) => t.path.length >= 2)!;
    const [cx, cy] = calle.path[Math.floor(calle.path.length / 2)]!;
    // Lo que contestaba antes, preguntando a casa.
    expect(superficieEn(casa, ...pista)).toBe("campo");
    // Y lo que contesta el campo de allí.
    expect(superficieEn(campo, ...pista)).toBe("asfalto");
    expect(superficieEn(campo, cx, -cy)).toBe("asfalto");
  });

  /*
   * Los números salen de los coeficientes de rodadura de verdad, y lo que
   * importa es el orden: rodar por hierba cuesta más que por asfalto y menos
   * que por un campo. Si alguna vez se tocan, que se toquen sin romper eso.
   */
  it("cuesta más rodar según lo blando que sea", () => {
    expect(ROZAMIENTO.asfalto).toBeLessThan(ROZAMIENTO.hierba);
    expect(ROZAMIENTO.hierba).toBeLessThan(ROZAMIENTO.campo);
    expect(TRAQUETEO.asfalto).toBeLessThan(TRAQUETEO.hierba);
    expect(TRAQUETEO.hierba).toBeLessThan(TRAQUETEO.campo);
  });
});

/**
 * Un punto a `aparte` metros del eje de alguna calle, en la hierba de verdad:
 * fuera de toda pista, calle y plataforma. Del fichero, con la Y al norte.
 */
function alLadoDeUnaCalle(aero: Aerodrome, aparte: number): Punto {
  for (const calle of aero.taxiways) {
    for (let i = 0; i < calle.path.length - 1; i++) {
      const [ax, ay] = calle.path[i]!;
      const [bx, by] = calle.path[i + 1]!;
      const largo = Math.hypot(bx - ax, by - ay);
      if (largo < 20) continue;
      const nx = -(by - ay) / largo;
      const ny = (bx - ax) / largo;
      for (const lado of [1, -1]) {
        const p: Punto = [(ax + bx) / 2 + nx * aparte * lado, (ay + by) / 2 + ny * aparte * lado];
        if (!enElPavimento(aero, p)) return p;
      }
    }
  }
  throw new Error(`${aero.id}: ninguna calle con hierba a ${aparte} m`);
}

describe("junto a una calle, la hierba es hierba (#193)", () => {
  /*
   * **La superficie miraba el mapa de los árboles**, que lleva treinta metros
   * de franja a cada lado del eje de cada calle: rodando por la hierba al lado
   * de una calle, el avión frenaba y sonaba como en el asfalto. El primer
   * `expect` es el contraste, el que dice que la prueba mira donde estaba el
   * fallo: ese punto, para los árboles, sigue siendo «no plantar».
   */
  it("en Los Rodeos, a veinte metros del eje de una calle ya es campo", () => {
    const e = scenarioById("tenerife-norte");
    const aero = e.aerodrome!;
    const [x, y] = alLadoDeUnaCalle(aero, 20);
    expect(mapaDePavimento(aero)!.hay(x, -y)).toBe(true);
    expect(superficieEn(e, x, -y)).toBe("campo");
  });

  it("y sobre el eje de esa calle, asfalto", () => {
    const e = scenarioById("tenerife-norte");
    const calle = e.aerodrome!.taxiways.find((t) => t.path.length >= 2)!;
    const [a, b] = [calle.path[0]!, calle.path[1]!];
    expect(superficieEn(e, (a[0] + b[0]) / 2, -(a[1] + b[1]) / 2)).toBe("asfalto");
  });

  /*
   * Y en la granja, que es de hierba entera: la calle segada es «hierba» —se
   * rueda, traqueteando— y lo de al lado, sin segar, ya es campo.
   */
  it("en Yvytu Rape la calle segada es hierba, y fuera de ella, campo", () => {
    const e = scenarioById("yvytu-rape");
    const aero = e.aerodrome!;
    const calle = aero.taxiways[1]!;
    const [a, b] = [calle.path[0]!, calle.path[1]!];
    expect(superficieEn(e, (a[0] + b[0]) / 2, -(a[1] + b[1]) / 2)).toBe("hierba");
    const [x, y] = alLadoDeUnaCalle(aero, 15);
    expect(superficieEn(e, x, -y)).toBe("campo");
  });

  /*
   * **Y la rejilla contesta lo mismo que `enElPavimento` sin margen**, que es
   * la geometría que se dibuja y la que usan el tráfico y la vuelta a la raya.
   * Miles de puntos al azar —con semilla, que una prueba que cambia en cada
   * tirada no prueba nada— alrededor de las calles de cuatro campos, Barajas
   * entre ellos, que es el de más calles con diferencia. Sin las pistas, que
   * las mira `sueloEn` por su cuenta.
   */
  it("la rejilla da lo mismo que la cuenta entera, punto a punto", () => {
    let semilla = 193;
    const azar = () => {
      semilla = (semilla * 1103515245 + 12345) % 2147483648;
      return semilla / 2147483648;
    };
    for (const crudo of [gcxo, sgas, lemd, yvytu]) {
      const aero = { ...(crudo as unknown as Aerodrome), runways: [] };
      const xs = aero.taxiways.flatMap((t) => t.path.map((p) => p[0]));
      const ys = aero.taxiways.flatMap((t) => t.path.map((p) => p[1]));
      const x0 = Math.min(...xs) - 60;
      const x1 = Math.max(...xs) + 60;
      const y0 = Math.min(...ys) - 60;
      const y1 = Math.max(...ys) + 60;
      const pav = pavimentoDe(aero);
      let dentro = 0;
      let distintos = 0;
      for (let i = 0; i < 20_000; i++) {
        // La mitad, pegados a una calle: es en el borde donde se equivocaría.
        let p: Punto;
        if (i % 2) {
          const calle = aero.taxiways[Math.floor(azar() * aero.taxiways.length)]!;
          const q = calle.path[Math.floor(azar() * calle.path.length)]!;
          p = [q[0] + (azar() - 0.5) * 60, q[1] + (azar() - 0.5) * 60];
        } else {
          p = [x0 + azar() * (x1 - x0), y0 + azar() * (y1 - y0)];
        }
        const deVerdad = enElPavimento(aero, p);
        if (deVerdad) dentro++;
        if (pav.cubre(p[0], -p[1]) !== deVerdad) distintos++;
      }
      expect(distintos, aero.id).toBe(0);
      // Y que haya de los dos, que si no esto no compara nada.
      expect(dentro, aero.id).toBeGreaterThan(1000);
      expect(dentro, aero.id).toBeLessThan(19_000);
    }
  });

  it("y un aeródromo sin calles ni plataformas no tiene pavimento fuera de la pista", () => {
    const aero = { ...(sgas as unknown as Aerodrome), taxiways: [], aprons: [] };
    expect(pavimentoDe(aero).cubre(0, 0)).toBe(false);
  });
});
