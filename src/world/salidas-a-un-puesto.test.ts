/**
 * **De cada salida de pista se llega a un puesto, en todos los campos.**
 *
 * La raya verde, el coche del sígame y el señalero salen los tres de la misma
 * ruta: si el plan no sabe llevarte de la salida por la que dejaste la pista
 * hasta un puesto, no hay ninguno de los tres. Se contó llegando a Guaraní con
 * el JAZ 120 —«ni coche, ni señalero, ni raya»— y aterrizando en Los Rodeos, y
 * de Guaraní se sospechaba de los cuatro puestos, que están puestos a mano
 * porque OpenStreetMap no trae ninguno. Aquí se mira en los dieciséis campos,
 * los tres del norte incluidos —Concepción, Pedro Juan y Mariscal
 * Estigarribia—, por las dos cabeceras y por cada salida: se aterriza, se deja
 * la pista por esa salida y la ruta tiene que acabar en un puesto y pasar por
 * donde está el avión.
 *
 * Que además se **vea** —raya, coche y señalero en la escena y en el cuadro—
 * lo mira `scripts/verificar-llegadas.mjs` en el juego, con la tarjeta de
 * verdad; esto es la mitad que no necesita navegador.
 *
 * Y la otra mitad del encargo: **pasarse la salida**. Se frena tarde, la boca
 * queda atrás, y lo que dice una torre es «vacate next available». La raya se
 * rehace por la primera salida que quede por delante; no vuelve a buscar la
 * que se dejó atrás dando media vuelta en la pista. Ver `seHaPasadoLaSalida`
 * en `plan-de-vuelo.ts`.
 */

import { describe, expect, it } from "vitest";
import { aLaPolilinea, type Aerodrome, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { construirGrafo } from "./rodaje";
import { enEjesDePista } from "./rumbo";
import { SCENARIOS, type Scenario } from "./scenarios";

type Pista = Scenario["runway"];

/** La misma pista, vista por quien entra por la otra cabecera. */
const alReves = (p: Pista): Pista => ({
  ...p,
  heading: (p.heading + 180) % 360,
  desplazado: p.desplazadoEnfrente ?? 0,
  desplazadoEnfrente: p.desplazado ?? 0,
});

/** Un punto del eje a `along` metros del centro, en coordenadas del mundo. */
function enElEje(p: Pista, along: number): { x: number; z: number } {
  const h = (p.heading * Math.PI) / 180;
  return { x: p.x + Math.sin(h) * along, z: p.z - Math.cos(h) * along };
}

function estado(
  x: number,
  z: number,
  rumbo: number,
  v: number,
  alto: number,
  enPista: boolean,
): never {
  return {
    position: { x, y: alto, z },
    heading: (rumbo * Math.PI) / 180,
    airspeed: v,
    groundSpeed: v,
    verticalSpeed: 0,
    onGround: alto < 1,
    onRunway: enPista && alto < 1,
  } as never;
}

function pasar(plan: PlanDeVuelo, e: never, alto: number, segundos: number): string {
  let fase = "";
  for (let t = 0; t < segundos; t += 0.1) fase = plan.paso(e, alto, true, 0.1).fase;
  return fase;
}

/** Volado de verdad —alto un buen rato— y posado pasado el umbral. */
function aterrizar(plan: PlanDeVuelo, p: Pista): void {
  const lejos = enElEje(p, -p.length / 2 - 3000);
  pasar(plan, estado(lejos.x, lejos.z, p.heading, 60, 400, false), 400, 20);
  const toma = enElEje(p, -p.length / 2 + 300);
  pasar(plan, estado(toma.x, toma.z, p.heading, 50, 0, true), 0, 1);
}

/** Los aviones con los que se mira un campo: el menor y el mayor que caben. */
function avionesDe(esc: Scenario): AircraftConfig[] {
  const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
  return [...new Set([caben[0]!, caben[caben.length - 1]!])];
}

const conAerodromo = SCENARIOS.filter((s) => s.aerodrome);

/**
 * Las salidas de una pista: los nudos del grafo sobre el asfalto de los que
 * cuelga una calle, cada una con un punto de esa calle **ya fuera de la
 * pista** —siguiendo calle, que hay salidas que dan dos codos antes de
 * dejarla—.
 */
function salidasDe(
  aero: Aerodrome,
  p: Pista,
  semiala: number,
): { nudo: Punto; fuera: Punto; rumbo: number }[] {
  const grafo = construirGrafo(aero, semiala);
  const ejes = (q: Punto) => enEjesDePista(q[0], -q[1], p.x, p.z, p.heading);
  const enLaPista = (q: Punto, margen: number) => {
    const e = ejes(q);
    return (
      Math.abs(e.across) <= p.width / 2 + margen &&
      Math.abs(e.along) <= p.length / 2 + margen
    );
  };
  const salidas: { nudo: Punto; fuera: Punto; rumbo: number }[] = [];
  grafo.nudos.forEach((nudo, i) => {
    if (!enLaPista(nudo, 0)) return;
    for (const t of grafo.desde[i] ?? []) {
      const primero = grafo.tramos[t]!;
      if (primero.pista) continue;
      // Por la calle, de tramo en tramo, hasta dejar el asfalto de la pista.
      let desde = i;
      let tramo = primero;
      let fuera: Punto | null = null;
      let anterior: Punto = nudo;
      for (let paso = 0; paso < 6 && !fuera; paso++) {
        const pts = tramo.a === desde ? tramo.puntos : [...tramo.puntos].reverse();
        for (const q of pts) {
          if (!enLaPista(q, 15)) {
            fuera = q;
            break;
          }
          anterior = q;
        }
        if (fuera) break;
        const siguiente = tramo.a === desde ? tramo.b : tramo.a;
        const otro = (grafo.desde[siguiente] ?? [])
          .map((k) => grafo.tramos[k]!)
          .find((k) => !k.pista && k !== tramo);
        if (!otro) break;
        desde = siguiente;
        tramo = otro;
      }
      if (!fuera) continue;
      const rumbo =
        ((Math.atan2(fuera[0] - anterior[0], fuera[1] - anterior[1]) * 180) /
          Math.PI +
          360) %
        360;
      salidas.push({ nudo, fuera, rumbo });
    }
  });
  return salidas;
}

describe("de cada salida de pista se llega a un puesto", () => {
  for (const esc of conAerodromo) {
    const aero = esc.aerodrome as Aerodrome;
    const puestos = aero.parkingPositions ?? [];
    for (const avion of avionesDe(esc)) {
      it(`${esc.id} con el ${avion.id}, por las dos cabeceras`, () => {
        expect(puestos.length, "sin puestos no hay adónde volver").toBeGreaterThan(0);
        let vistas = 0;
        for (const pista of [esc.runway, alReves(esc.runway)]) {
          for (const s of salidasDe(aero, pista, avion.wingSpan / 2)) {
            vistas++;
            const plan = new PlanDeVuelo(aero, pista, () => 0, avion);
            plan.reiniciar();
            aterrizar(plan, pista);
            // Y fuera de la pista por esa salida, rodando hacia la plataforma.
            pasar(
              plan,
              estado(s.fuera[0], -s.fuera[1], s.rumbo, 5, 0, false),
              0,
              5,
            );
            const ruta = plan.rutaVisible();
            const donde = `${esc.id} ${avion.id} pista ${Math.round(pista.heading)} salida (${s.nudo.map(Math.round).join(", ")})`;
            expect(ruta.length, `${donde}: sin ruta`).toBeGreaterThan(1);
            const fin = ruta[ruta.length - 1]!;
            const aPuesto = Math.min(
              ...puestos.map((q) => Math.hypot(q.xy[0] - fin[0], -q.xy[1] - fin[1])),
            );
            expect(aPuesto, `${donde}: la ruta no acaba en un puesto`).toBeLessThan(10);
            const aLaRaya = aLaPolilinea([s.fuera[0], -s.fuera[1]], ruta as Punto[]);
            expect(aLaRaya, `${donde}: la ruta no pasa por el avión`).toBeLessThan(30);
          }
        }
        // Un campo sin salidas que mirar no es un campo que pase: es uno que
        // esta prueba no sabe leer.
        expect(vistas, `${esc.id}: ninguna salida encontrada`).toBeGreaterThan(0);
      });
    }
  }
});

describe("pasarse la salida: la raya se rehace por la próxima, por delante", () => {
  for (const esc of conAerodromo) {
    const aero = esc.aerodrome as Aerodrome;
    const avion = avionesDe(esc)[0]!;
    it(`${esc.id}: rodando por toda la pista, la raya nunca manda volver atrás`, () => {
      for (const pista of [esc.runway, alReves(esc.runway)]) {
        const plan = new PlanDeVuelo(aero, pista, () => 0, avion);
        plan.reiniciar();
        aterrizar(plan, pista);
        const ejes = (q: readonly [number, number]) =>
          enEjesDePista(q[0], q[1], pista.x, pista.z, pista.heading);
        /*
         * Dónde están las bocas, a lo largo del eje: los nudos sobre el
         * asfalto de los que cuelga una calle, que es lo mismo que mira el
         * plan para elegir por dónde salir.
         */
        const grafo = construirGrafo(aero, avion.wingSpan / 2);
        const bocas = grafo.nudos.flatMap((n, i) => {
          const e = ejes([n[0], -n[1]]);
          const sobre =
            Math.abs(e.across) <= pista.width / 2 &&
            Math.abs(e.along) <= pista.length / 2;
          const calle = (grafo.desde[i] ?? []).some((t) => !grafo.tramos[t]!.pista);
          return sobre && calle ? [e.along] : [];
        });
        let a = -pista.length / 2 + 300;
        let v = 40;
        let pasadas = 0;
        while (a < pista.length / 2) {
          const p = enElEje(pista, a);
          plan.paso(estado(p.x, p.z, pista.heading, v, 0, true), 0, true, 0.1);
          a += v * 0.1;
          v = Math.max(12, v - 0.2);
          const ruta = plan.rutaVisible();
          if (v > 12 || ruta.length < 2) continue;
          /*
           * Sin ninguna boca por delante con sitio para girar, lo que toca es
           * lo que dice la torre en un campo de una sola calle: «backtrack»,
           * dar la vuelta por la pista. Eso no es volver a una pasada.
           */
          if (!bocas.some((b) => b > a + 25)) continue;
          /*
           * **La raya no da la vuelta en mitad de la pista.** Se sigue desde
           * donde va el avión en su ruta —no desde donde se trazó— mientras
           * vaya por el asfalto y hacia delante. Si ahí mismo ya se vuelve,
           * tiene que ser en una boca: la salida cruzada que se toma, la
           * raqueta del final, o la que se acaba de pasar mientras no se da
           * por pasada. Volverse lejos de toda boca es mandar a buscar una
           * salida que quedó atrás, que es lo que hacía antes: cientos de
           * metros de pista hacia atrás, cada dos segundos una vez más.
           */
          const desde = plan.avanceEnLaRuta;
          let recorrido = 0;
          let antes = -Infinity;
          let hastaDonde = -Infinity;
          for (let i = 1; i < ruta.length; i++) {
            recorrido += Math.hypot(
              ruta[i]![0] - ruta[i - 1]![0],
              ruta[i]![1] - ruta[i - 1]![1],
            );
            if (recorrido < desde + 1) continue;
            const e = ejes(ruta[i]!);
            if (Math.abs(e.across) > pista.width / 2 + 5) break;
            if (e.along < antes - 0.5) break;
            antes = e.along;
            hastaDonde = Math.max(hastaDonde, e.along - a);
          }
          if (hastaDonde < 5) {
            const aUnaBoca = Math.min(...bocas.map((b) => Math.abs(b - a)));
            pasadas = Math.max(pasadas, aUnaBoca);
          }
        }
        expect(
          pasadas,
          `${esc.id} ${avion.id} pista ${Math.round(pista.heading)}: la raya se volvía lejos de toda boca, a buscar una salida ya pasada`,
        ).toBeLessThan(50);
      }
    });
  }
});
