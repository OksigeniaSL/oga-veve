/**
 * **La torre te ve en su circuito aunque tu plan vaya a otra isla**
 * (enmienda H69 del ADR 0029).
 *
 * `tuCircuitoParaLaTorre` en `game.ts` era `null` entero con el plan hacia
 * otro campo: el JAZ 20 del banco, con el destino del juego en otra isla y
 * dando la vuelta al campo de Los Rodeos, volaba el viento en cola y la base
 * sin que la torre lo contara, y EC-IUV y EC-GIX entraron en la pista 47 y
 * 29 s antes de que cogiera la final. Aquí se vuela el circuito de verdad de
 * ese avión en esa pista —sus vértices y lo que queda por la línea quebrada,
 * como en el juego— y se mira si la torre te cuenta, por dónde vuelas:
 *
 * - **la vuelta al campo con el plan a otra isla**, a la altura del circuito:
 *   en el viento en cola y en la base, sí;
 * - **la salida a otra isla**, subiendo por la pista y su eje, o virando de
 *   vuelta subiendo a la de crucero: no, que no vuelve;
 * - **la frustrada**, por la subida: sí, aunque el plan vaya a otro sitio.
 */
import { describe, expect, it } from "vitest";
import { CircuitoDeLaTorre, type LoQueVeDeTuCircuito } from "./circuito-de-la-torre";
import { AIRCRAFT } from "./aircraft";
import { ALTO_PARA_EL_CIRCUITO } from "./la-aproximacion";
import {
  alturaDelCircuito,
  escalaDelCircuitoDe,
  loQueQuedaDeCircuito,
  verticesDelCircuito,
  type PuntoDeCircuito,
} from "../world/circuito";
import { SCENARIOS } from "../world/scenarios";

const JAZ_20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;
const RODEOS = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
const ESCALA = escalaDelCircuitoDe(JAZ_20);
const ALTURA = alturaDelCircuito(ESCALA);
const VERTICES = verticesDelCircuito(RODEOS.runway, 0, "izquierda", ESCALA, ALTURA);

/** Lo que dice el juego antes de H69: con el plan a otro campo, nada. */
const comoAntes = (v: LoQueVeDeTuCircuito): boolean => v.enSuFranja && v.vuelvesAqui;

/** Un punto del vuelo: dónde, a qué altura sobre la pista y con qué vertical. */
interface Punto {
  readonly x: number;
  readonly z: number;
  readonly alto: number;
  readonly vertical: number;
}

/** Lo que el juego le da a la torre en ese punto, como `tuCircuitoParaLaTorre`. */
function loQueVe(p: Punto, vuelvesAqui: boolean, trasIrse = false): LoQueVeDeTuCircuito {
  const enLaAltura = p.alto >= ALTO_PARA_EL_CIRCUITO && p.alto <= 2 * ALTURA;
  const queda = enLaAltura ? loQueQuedaDeCircuito(VERTICES, p.x, p.z, 2 * ESCALA) : null;
  return {
    enSuFranja: queda !== null,
    tramo: queda?.tramo ?? null,
    vuelvesAqui,
    trasIrse,
    vertical: p.vertical,
  };
}

/** Puntos cada veinte metros por un tramo, de `a` a `b`, con su altura. */
function porElTramo(a: PuntoDeCircuito, b: PuntoDeCircuito, vertical: number): Punto[] {
  const largo = Math.hypot(b.x - a.x, b.z - a.z);
  const puntos: Punto[] = [];
  for (let d = 0; d < largo; d += 20) {
    const t = d / largo;
    puntos.push({
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      alto: a.y + (b.y - a.y) * t,
      vertical,
    });
  }
  return puntos;
}

const [cabecera, finSubida, esquinaAlla, esquinaAca, entrada] = VERTICES as [
  PuntoDeCircuito,
  PuntoDeCircuito,
  PuntoDeCircuito,
  PuntoDeCircuito,
  PuntoDeCircuito,
];

/** El circuito entero, a la altura del circuito desde el final de la subida. */
const LA_VUELTA: { tramo: string; puntos: Punto[] }[] = [
  { tramo: "subida", puntos: porElTramo(cabecera, finSubida, 3.5) },
  { tramo: "cruzado", puntos: porElTramo(finSubida, esquinaAlla, 0) },
  { tramo: "encola", puntos: porElTramo(esquinaAlla, esquinaAca, 0.3) },
  { tramo: "base", puntos: porElTramo(esquinaAca, entrada, -2.5) },
];

/** Cuántos puntos de cada tramo te cuenta la torre, con una regla. */
function cuenta(
  vuelo: readonly { tramo: string; puntos: readonly Punto[] }[],
  regla: (v: LoQueVeDeTuCircuito) => boolean,
  vuelvesAqui: boolean,
  trasIrse = false,
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const { tramo, puntos } of vuelo) {
    const si = puntos.filter((p) => regla(loQueVe(p, vuelvesAqui, trasIrse))).length;
    salida[tramo] = `${si} de ${puntos.length}`;
  }
  return salida;
}

/** Con la regla del juego, que tiene memoria: un vuelo entero, en orden. */
function conLaTorre(): (v: LoQueVeDeTuCircuito) => boolean {
  const torre = new CircuitoDeLaTorre();
  return (v) => torre.paso(v);
}

describe("la torre y tu circuito, con el plan a otra isla (H69)", () => {
  it("el circuito del JAZ 20 en Los Rodeos es el de una avioneta", () => {
    expect(ALTURA).toBeGreaterThanOrEqual(250);
    expect(ALTURA).toBeLessThan(320);
  });

  it("la vuelta al campo: en el viento en cola y en la base te cuenta", () => {
    const ahora = cuenta(LA_VUELTA, conLaTorre(), false);
    const total = (t: string) => LA_VUELTA.find((x) => x.tramo === t)!.puntos.length;
    // Menos la esquina, que es todavía del viento cruzado.
    expect(ahora.encola).toBe(`${total("encola") - 1} de ${total("encola")}`);
    expect(ahora.base).toBe(`${total("base")} de ${total("base")}`);
  });

  it("y antes no: con el plan a otro campo, la torre no te veía en ninguno", () => {
    const antes = cuenta(LA_VUELTA, comoAntes, false);
    for (const tramo of ["subida", "cruzado", "encola", "base"])
      expect(antes[tramo]).toMatch(/^0 de /);
  });

  it("un bache que te sube en el viento en cola no te borra de su fila", () => {
    const torre = conLaTorre();
    // Desde el segundo punto: el primero es la esquina, del viento cruzado.
    const encola = LA_VUELTA[2]!.puntos.slice(1);
    const conBache = encola.map((p, i) =>
      i > encola.length / 3 && i < encola.length / 2 ? { ...p, vertical: 2.5 } : p,
    );
    const no = conBache.filter((p) => !torre(loQueVe(p, false)));
    expect(no.length).toBe(0);
  });

  it("la salida a otra isla, por la pista y su eje subiendo, no la cuenta", () => {
    const torre = conLaTorre();
    const subida = porElTramo(cabecera, { ...finSubida, y: 2 * ALTURA }, 3.5);
    expect(subida.filter((p) => torre(loQueVe(p, false))).length).toBe(0);
  });

  it("ni quien vira de vuelta hacia su isla subiendo por el viento en cola", () => {
    const torre = conLaTorre();
    const deVuelta = [
      ...porElTramo(cabecera, { ...finSubida, y: 200 }, 3.5),
      ...porElTramo({ ...finSubida, y: 200 }, { ...esquinaAlla, y: 280 }, 3.5),
      ...porElTramo({ ...esquinaAlla, y: 280 }, { ...esquinaAca, y: 2 * ALTURA + 50 }, 3.5),
    ];
    expect(deVuelta.filter((p) => torre(loQueVe(p, false))).length).toBe(0);
  });

  it("y tras irse al aire, la subida sí, vaya a donde vaya el plan", () => {
    const ahora = cuenta(LA_VUELTA.slice(0, 1), conLaTorre(), false, true);
    const n = LA_VUELTA[0]!.puntos;
    const enLaFranja = n.filter((p) => loQueVe(p, false, true).enSuFranja).length;
    expect(enLaFranja).toBeGreaterThan(0);
    expect(ahora.subida).toBe(`${enLaFranja} de ${n.length}`);
  });

  it("con el plan en este campo, como siempre: todo el circuito", () => {
    const torre = conLaTorre();
    for (const { puntos } of LA_VUELTA)
      for (const p of puntos) {
        const v = loQueVe(p, true);
        expect(torre(v)).toBe(v.enSuFranja);
      }
  });
});
