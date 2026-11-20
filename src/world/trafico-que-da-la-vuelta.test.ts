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
 *
 * Y en Los Rodeos no se remonta: tiene paralela. El de 590 m no era su salida
 * por falta de camino, sino porque al tocar veía de frente al que rodaba
 * delante de él por la R en su mismo sentido —la R iba en zigzag y la F tenía
 * un salto—, y se le buscaba otra sin pasar por ella (H41b). Donde no hay
 * paralela, como en Ayolas, se remonta, y la torre deja al de detrás en el
 * circuito hasta que la pista queda libre. Ver `colgadasDe` en `rodaje.ts` y
 * `ocupaLaPista` en `trafico.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  alVirarEnLaPista,
  crearTrafico,
  REMONTA_A,
  SEPARACION_ENTRE_LLEGADAS,
  tiposDelCampo,
  trazar,
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
import { construirGrafo } from "./rodaje";

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

describe("la paralela de Los Rodeos es una recta, y nadie remonta la pista teniéndola", () => {
  /*
   * Los rabos de diez metros que salen de la R hacia la plataforma y los
   * chaflanes del cruce de la F caen a menos de una soldadura de ella, y el
   * nodado metía su punta lejana en la R: la paralela iba en zigzag entre su
   * eje y el borde de la plataforma, y con una uve en la F. Ver `colgadasDe`
   * en `rodaje.ts`.
   */
  it("la R del grafo va por la R dibujada", () => {
    const aero = SCENARIOS.find((e) => e.id === "tenerife-norte")!.aerodrome!;
    const dibujada = aero.taxiways.filter((c) => c.ref === "R").flatMap((c) => {
      const tramos: [number, number, number, number][] = [];
      for (let i = 1; i < c.path.length; i++) tramos.push([...c.path[i - 1]!, ...c.path[i]!] as [number, number, number, number]);
      return tramos;
    });
    const aLaR = (x: number, y: number) =>
      Math.min(
        ...dibujada.map(([ax, ay, bx, by]) => {
          const dx = bx - ax;
          const dy = by - ay;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
          return Math.hypot(x - ax - t * dx, y - ay - t * dy);
        }),
      );
    const grafo = construirGrafo(aero, 14);
    const deLaR = grafo.tramos.filter((t) => t.ref === "R");
    expect(deLaR.length).toBeGreaterThan(10);
    const peor = Math.max(...deLaR.flatMap((t) => t.puntos.map(([x, y]) => aLaR(x, y))));
    expect(peor, "lo más que se aparta de la R dibujada, m").toBeLessThan(1);
  });
});

describe("en Los Rodeos, con el campo llenándose, nadie corre por la pista hacia el umbral", () => {
  const esc0 = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
  // Con el viento del banco, 040/12, se aterriza por la 12; y con el de poniente, por la 30.
  for (const vientoDe of [40, 270]) {
    it(`con viento de ${vientoDe}`, () => {
      const esc = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 12 });
      const aero = esc.aerodrome!;
      const rel = relieveDe([esc.id], aero.origin);
      const cota = aero.elevationM ?? 0;
      const suelo = (x: number, z: number) => rel(x, z) ?? cota;
      const pista = esc.runway;
      expect(Math.round(pista.heading), "la cabecera en uso").toBe(vientoDe === 40 ? 111 : 291);
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
      /**
       * Lo más que alguien volvió por la pista hacia el umbral de aterrizar desde
       * lo más lejos que llegó en ella, m. Con la paralela, ni por la 12 ni por
       * la 30 se remonta: la torre saca a cada uno por la salida de delante, y
       * por la R se rueda detrás del que va delante (H41b).
       */
      let remonto = 0;
      let dondeRemonto = "";
      const masLejos = new Map<string, number>();
      /** Cuántos tocaron la pista: que la prueba mire algo. */
      const aterrizaron = new Set<string>();
      for (let k = 0; k * PASO < 900; k++) {
        if (k % Math.round(90 / PASO) === 0)
          t.anuncia(matriculas[(k / Math.round(90 / PASO)) % matriculas.length]!, "otro.final", true);
        t.paso(PASO);
        for (const a of t.quienes()) {
          const p = antes.get(a.matricula);
          antes.set(a.matricula, { x: a.x, z: a.z });
          if (!p) continue;
          const enLaPista = a.y - suelo(a.x, a.z) < 5 && Math.abs(across(a.x, a.z)) < 30;
          // Cada vez que pisa la pista se cuenta de nuevo: la misma matrícula vuelve a llegar.
          if (!enLaPista) masLejos.delete(a.matricula);
          if (!enLaPista) continue;
          const haciaElUmbral = -(along(a.x, a.z) - along(p.x, p.z)) / PASO;
          aterrizaron.add(a.matricula);
          const lejos = Math.max(masLejos.get(a.matricula) ?? -Infinity, along(a.x, a.z));
          masLejos.set(a.matricula, lejos);
          if (lejos - along(a.x, a.z) > remonto) {
            remonto = lejos - along(a.x, a.z);
            dondeRemonto = `${(k * PASO).toFixed(1)} s ${a.matricula} ${a.tipo} a ${Math.round(along(a.x, a.z))} m del umbral`;
          }
          if (haciaElUmbral > peor) {
            peor = haciaElUmbral;
            donde = `${(k * PASO).toFixed(1)} s ${a.matricula} ${a.tipo} a ${Math.round(along(a.x, a.z))} m del umbral`;
          }
        }
      }
      t.dispose();
      expect(aterrizaron.size, "cuántos tocaron la pista").toBeGreaterThan(4);
      /*
       * Lo que retrocede, sin salir aún de la franja, quien coge casi parado una
       * salida trazada para la otra cabecera —la E4 por la 30, la de los 1.598 m
       * por la 12—, y nada más: 95 m medidos por la 30. Remontando hasta la
       * de 590 m eran 1.144.
       */
      expect(remonto, dondeRemonto).toBeLessThan(120);
      expect(peor, donde).toBeLessThanOrEqual(REMONTA_A + 0.25);
    });
  }
});

describe("en un campo sin paralela, el de detrás espera a que el de delante remonte", () => {
  /*
   * En Ayolas, por la 02, la única calle está en la cabecera de aterrizar: el
   * que llega frena, da la vuelta y vuelve por la pista hasta ella. Con dos
   * minutos entre llegadas, el de detrás se lo encontraba de frente en su
   * final corta. La torre no deja cruzar el umbral hasta que la pista queda
   * libre (OACI, Doc 4444, 7.10.1.2), y la separación se hace en el circuito:
   * al de detrás se le deja, en vez de los dos minutos de siempre, lo que el
   * de delante tiene la pista ocupada. Ver `ocupaLaPista` y `detrasDe`.
   */
  const esc0 = SCENARIOS.find((e) => e.id === "ayolas")!;
  const esc = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: 10, vientoKt: 10 });

  it("lo que tiene la pista ocupada quien remonta es más que la separación de siempre", () => {
    expect(Math.round(esc.runway.heading), "por la 02").toBe(10);
    const aero = esc.aerodrome!;
    const calles = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 45)!;
    const cota = aero.elevationM ?? 0;
    const reactor = tiposDelCampo(aero.id, esc.runway.length).find((t) => t.id === "reactor")!;
    const c = trazar(esc.runway, cota, "izquierda", 1, undefined, { suelo: calles, alto: () => cota, tipo: reactor });
    const ocupa = c?.enTierra?.ocupa ?? 0;
    // Del umbral a los 1.400 m, la vuelta y casi 1.400 m de vuelta a veinte nudos.
    expect(ocupa).toBeGreaterThan(SEPARACION_ENTRE_LLEGADAS);
    expect(ocupa).toBeLessThan(240);
  });
});
