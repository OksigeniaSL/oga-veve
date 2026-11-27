/**
 * **Ni tu raya verde pasa por encima de un avión parado, ni él se para encima
 * de tu raya verde.**
 *
 * Aterrizando en Los Rodeos, la raya verde y el coche del sígame llevaron por
 * una calle en la que había un avión del tráfico esperando: «eso es un
 * accidente seguro». Las dos mitades del arreglo, con los datos de cada
 * aeródromo de verdad:
 *
 * - la raya rodea las calles ocupadas **si hay por dónde** —ver `Ocupados`
 *   en `rodaje.ts`—, y dice cuándo no lo hay;
 * - y el tráfico, al elegir su doble raya, no la pone encima de la tuya si
 *   tiene otra —ver `PASA_A_TU_LADO` en `suelo-del-trafico.ts`—.
 */
import { describe, expect, it } from "vitest";
import type { Aerodrome, Punto } from "./aerodrome";
import {
  construirGrafo,
  rodajeEntre,
  type Grafo,
  type Ocupados,
} from "./rodaje";
import { admite } from "./puestos-del-aip";
import { enEjesDePista } from "./rumbo";
import { SCENARIOS, type Scenario } from "./scenarios";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import { tiposDelCampo } from "./trafico";

const CON_CALLES = SCENARIOS.filter(
  (e) => e.aerodrome && !e.aerodrome.privado && e.aerodrome.taxiways.length,
);

/** El JAZ 90: una semiala de las grandes de la flota. */
const SEMIALA = 14;
/** Lo que se aparta la raya de un parado: ver `ocupadosAhora` en el plan. */
const RADIO = SEMIALA + 17 + 7.5;

/** El punto de un camino a tantos metros de su principio. */
function aLosMetros(camino: readonly EnElPlano[], metros: number): EnElPlano {
  let recorrido = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    if (recorrido + d >= metros) {
      const t = d > 0 ? (metros - recorrido) / d : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    recorrido += d;
  }
  return camino[camino.length - 1]!;
}

/** El mismo grafo sin los tramos que pasan a menos de `radio` de un punto. */
function sinTramosCerca(grafo: Grafo, p: Punto, radio: number): Grafo {
  const fuera = new Set<number>();
  grafo.tramos.forEach((t, i) => {
    if (cerca(densa(t.puntos), p, radio)) fuera.add(i);
  });
  return {
    ...grafo,
    desde: grafo.desde.map((ts) => ts.filter((i) => !fuera.has(i))),
  };
}

/** Una polilínea con un punto cada metro, para medir distancias a ella. */
function densa(linea: readonly Punto[]): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < linea.length - 1; i++) {
    const [ax, ay] = linea[i]!;
    const [bx, by] = linea[i + 1]!;
    const l = Math.hypot(bx - ax, by - ay);
    for (let d = 0; d < l; d += 1)
      puntos.push([ax + ((bx - ax) * d) / l, ay + ((by - ay) * d) / l]);
  }
  const fin = linea[linea.length - 1];
  if (fin) puntos.push(fin);
  return puntos;
}

const cerca = (ruta: readonly Punto[], p: Punto, radio: number): boolean =>
  ruta.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < radio);

/** Las dos cabeceras de un campo, que cada una pone al tráfico en otro sitio. */
function porLasDos(esc: Scenario): Scenario[] {
  return [0, 180].map((giro) => ({
    ...esc,
    runway: { ...esc.runway, heading: (esc.runway.heading + giro) % 360 },
  }));
}

describe("la raya verde rodea los aviones parados", () => {
  it("hay campos que mirar", () => {
    expect(CON_CALLES.length).toBeGreaterThan(8);
  });

  for (const esc0 of CON_CALLES) {
    it(`${esc0.id}: de la pista al puesto, sin pasarle por encima si hay otra calle`, () => {
      const aero = esc0.aerodrome as Aerodrome;
      const ancho = aero.runways[0]?.widthM ?? 45;
      const grafo = construirGrafo(aero, SEMIALA);
      let pasaban = 0;
      let rodean = 0;
      for (const esc of porLasDos(esc0)) {
        const suelo = sueloDelTrafico(aero, esc.runway, ancho);
        if (!suelo) continue;
        /*
         * Dónde para el tráfico en tierra: la doble raya del que sale y el
         * final del camino del que llega, que es donde se queda aparcado.
         */
        const parados: Punto[] = [];
        const sale = suelo.salida();
        if (sale) {
          const raya = aLosMetros(sale.camino, sale.espera);
          parados.push([raya.x, -raya.z]);
        }
        for (const tipo of tiposDelCampo(aero.id, esc.runway.length)) {
          const fin = suelo.llegada(tipo.toca + tipo.frena)?.camino.at(-1);
          if (fin) parados.push([fin.x, -fin.z]);
        }
        const bocas = grafo.nudos.filter((n) => {
          const e = enEjesDePista(
            n[0],
            -n[1],
            esc.runway.x,
            esc.runway.z,
            esc.runway.heading,
          );
          return (
            Math.abs(e.across) < ancho / 2 &&
            Math.abs(e.along) < esc.runway.length / 2
          );
        });
        for (const parado of parados) {
          const ocupados: Ocupados = { puntos: [parado], radio: RADIO };
          for (const boca of bocas)
            for (const puesto of (aero.parkingPositions ?? []).slice(0, 10)) {
              const antes = rodajeEntre(grafo, boca, puesto.xy, 600);
              /*
               * Por la línea entera, no por sus vértices: la ruta cruza la
               * plataforma en recta desde la calle hasta el puesto, y esa
               * recta puede pasar a dos metros del parado sin que ninguna de
               * sus dos puntas le quede cerca. Mirando solo los vértices, en
               * Los Rodeos no se medía ni un caso.
               */
              if (!antes || !cerca(densa(antes.puntos), parado, RADIO / 2)) continue;
              // El puesto de llegada puede ser justo donde está el parado:
              // ahí no hay rodeo que valga, y no es lo que se mide.
              if (Math.hypot(puesto.xy[0] - parado[0], puesto.xy[1] - parado[1]) < RADIO)
                continue;
              pasaban++;
              const ahora = rodajeEntre(grafo, boca, puesto.xy, 600, ocupados);
              expect(ahora, `${esc.id}: la raya no desaparece`).not.toBeNull();
              /*
               * **Si hay otra calle, la coge.** «Hay otra» se mira quitando
               * del grafo los tramos que pasan junto al parado y buscando
               * otra vez: si así también se llega, había por dónde.
               *
               * **Y se llega sin pasarle cerca**, que no es lo mismo. La ruta
               * acaba cruzando la plataforma en recta hasta el puesto, y esa
               * recta no es un tramo del grafo: quitar tramos no la quita. En
               * Los Rodeos el «otro camino» acababa con ciento noventa metros
               * de plataforma a veinticinco del parado.
               */
              const sinEsos = sinTramosCerca(grafo, parado, RADIO);
              const otra = rodajeEntre(sinEsos, boca, puesto.xy, 600, ocupados);
              if (otra && !otra.ocupada)
                expect(
                  ahora!.ocupada,
                  `${esc.id}: había otra calle de ${boca.map(Math.round)} a ${puesto.xy.map(Math.round)}`,
                ).toBe(false);
              /*
               * Lo que dice la ruta de sí misma es verdad: si no se marca como
               * ocupada, no pasa por encima del parado.
               */
              if (!ahora!.ocupada) {
                expect(
                  cerca(densa(ahora!.puntos), parado, RADIO / 2),
                  `${esc.id}: de ${boca.map(Math.round)} a ${puesto.xy.map(Math.round)}`,
                ).toBe(false);
                rodean++;
              }
            }
        }
      }
      // Que se haya medido algo o, si no, que sea porque nadie pasaba.
      expect(rodean).toBeLessThanOrEqual(pasaban);
    });
  }

  /*
   * **En Los Rodeos, que es donde se vio.** El que aterrizaba se quedaba aparcado donde
   * acababa su camino, y su camino se recortaba al asfalto: acababa al final del ramal de
   * la entrada de la plataforma, (-312, 255), por donde se llega a todos los puestos de
   * ese lado. Desde que prefiere un puesto al que se llega entero (`rutaEntre` en
   * `suelo-del-trafico.ts`), aparca en un puesto y ninguna ruta de la pista a otro pasa
   * por encima de él; y si uno se queda parado en ese ramal, tu raya lo rodea casi
   * siempre.
   */
  it("en Los Rodeos, que es donde se vio, ya no aparca en la calle, y si uno se para ahí la raya lo rodea", () => {
    const esc0 = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
    const aero = esc0.aerodrome as Aerodrome;
    const ancho = aero.runways[0]?.widthM ?? 45;
    const grafo = construirGrafo(aero, SEMIALA);
    const salida = aero.runways[0]!.centerline[1] ?? aero.runways[0]!.centerline[0]!;
    /*
     * Las rutas de la pista a los puestos que pasan junto a `parado`, y cuántas lo rodean. A los puestos que admiten un
     * avión de las alas que mide esto, `SEMIALA`: desde la H105 la avioneta del tráfico aparca en el AG1, y la raya del
     * AG3, que es de G150, nace a diecisiete metros de él. Ahí no va un avión de veintiocho metros de ala.
     */
    const medir = (parado: Punto) => {
      let pasaban = 0;
      let rodean = 0;
      for (const puesto of aero.parkingPositions ?? []) {
        if (!admite(puesto.aip, 2 * SEMIALA)) continue;
        if (Math.hypot(puesto.xy[0] - parado[0], puesto.xy[1] - parado[1]) < RADIO) continue;
        const antes = rodajeEntre(grafo, salida, puesto.xy, 600);
        if (!antes || !cerca(densa(antes.puntos), parado, RADIO / 2)) continue;
        pasaban++;
        const ahora = rodajeEntre(grafo, salida, puesto.xy, 600, { puntos: [parado], radio: RADIO });
        if (ahora && !ahora.ocupada) rodean++;
      }
      return { pasaban, rodean };
    };
    for (const esc of porLasDos(esc0)) {
      const suelo = sueloDelTrafico(aero, esc.runway, ancho)!;
      for (const tipo of tiposDelCampo(aero.id, esc.runway.length)) {
        const fin = suelo.llegada(tipo.toca + tipo.frena)?.camino.at(-1);
        if (!fin) continue;
        expect(medir([fin.x, -fin.z]).pasaban, `${tipo.id} por la ${Math.round(esc.runway.heading)}`).toBe(0);
      }
    }
    const enElRamal = medir([-312.3, 255]);
    expect(enElRamal.pasaban).toBeGreaterThan(0);
    expect(enElRamal.rodean / enElRamal.pasaban).toBeGreaterThan(0.5);
  });
});

describe("el tráfico no espera encima de tu raya", () => {
  for (const esc0 of CON_CALLES) {
    it(`${esc0.id}: su doble raya se aparta de por donde vas, si tiene otra`, () => {
      const aero = esc0.aerodrome as Aerodrome;
      const ancho = aero.runways[0]?.widthM ?? 45;
      for (const esc of porLasDos(esc0)) {
        const suelo = sueloDelTrafico(aero, esc.runway, ancho);
        const deSiempre = suelo?.salida();
        if (!suelo || !deSiempre) continue;
        const raya = aLosMetros(deSiempre.camino, deSiempre.espera);
        /*
         * Tu raya pasa justo por su doble raya de siempre, **camino de otra**:
         * acaba lejos de ahí. Si acabara ahí, sería tu doble raya, y en la
         * tuya sí se espera, en la fila —ver `FILA_DE_SALIDA` en
         * `suelo-del-trafico.ts`—.
         */
        const porDondeVas: EnElPlano[] = [-40, -20, 0, 20, 40].map((d) => ({
          x: raya.x + d,
          z: raya.z,
        }));
        porDondeVas.push({ x: raya.x + 2000, z: raya.z + 2000 });
        const ahora = suelo.salida(undefined, porDondeVas);
        expect(ahora, esc.id).not.toBeNull();
        const nueva = aLosMetros(ahora!.camino, ahora!.espera);
        const igual = Math.hypot(nueva.x - raya.x, nueva.z - raya.z) < 1;
        // O se ha ido a otra, apartada de ti, o no había otra y es la de antes.
        if (!igual)
          for (const p of porDondeVas.slice(0, -1))
            expect(
              Math.hypot(nueva.x - p.x, nueva.z - p.z),
              `${esc.id}`,
            ).toBeGreaterThan(17 + 18 + 7.5);
      }
    });
  }
});
