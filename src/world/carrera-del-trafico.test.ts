/**
 * **El tráfico despega como su tipo.**
 *
 * Esperando en el punto de espera B de Tenerife Sur con el JAZ 60, Enrique
 * vio salir al de delante «muy despacio, como si estuviera rodando». Lo era:
 * la velocidad crecía con la distancia y no con el tiempo, así que arrancaba a
 * cuatro metros por segundo y seguía a paso de calle diez o quince segundos.
 * Medido antes del arreglo, en Tenerife Sur: el reactor tardaba 72,6 s de
 * alinearse a su Vr y el turbohélice 49,5, y la pista quedaba libre 118 s
 * después de su autorización.
 *
 * Se mide lo que se ve —la posición del avión dibujado, fotograma a
 * fotograma— y no la cuenta: de alinearse a Vr en la banda de su clase (un
 * reactor de línea, de veinticinco a treinta y cinco segundos; un turbohélice,
 * en menos), el morro que sube antes que las ruedas, y la subida de su tipo.
 * Ver `TIPOS` y `enSuCarrera` en `trafico.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  crearTrafico,
  TIPOS,
  velocidadDeDespegue,
  type TipoDeTrafico,
} from "./trafico";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { SCENARIOS } from "./scenarios";
import type { Aerodrome } from "./aerodrome";

const DT = 0.05;

/** De alinearse a Vr, s: la banda de cada clase. */
const BANDA: Record<TipoDeTrafico["id"], readonly [number, number]> = {
  reactor: [25, 35],
  turbohelice: [18, 28],
  bimotor: [12, 24],
  avioneta: [10, 22],
};

interface Salida {
  /** De la autorización en la doble raya a alinearse, s. */
  alinea: number;
  /** De alinearse a Vr, y a despegar, s. */
  aVr: number;
  aDespegar: number;
  /** A diez segundos de alinearse, m/s. */
  aLosDiez: number;
  /** El cabeceo al dejar el suelo y el más alto, grados. */
  cabeceoAlDespegar: number;
  cabeceoAntesDeVr: number;
  cabeceoMaximo: number;
  /** Lo que sube a los quince segundos de despegar, m/s. */
  sube: number;
  /** De la autorización a dejar libre la pista, s. */
  libre: number;
}

function salir(escId: string, tipo: TipoDeTrafico): Salida {
  const esc = SCENARIOS.find((e) => e.id === escId)!;
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const t = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: [tipo],
    tierra: () => (suelo ? { suelo, alto: () => cota } : null),
  });
  const M = "EC-ABC";
  t.anuncia(M, "otro.rodando");
  for (let s = 0; s < 900; s += DT) {
    t.paso(DT);
    const d = t.porDentro()[0]!;
    if (d.recorrido >= (d.espera ?? 0) - 1) break;
  }
  t.anuncia(M, "torre.clearedTakeoff");
  const despega = t.porDentro()[0]!.despega ?? 0;
  const eje = despega - tipo.carrera;
  const r: Partial<Salida> = { cabeceoAntesDeVr: 0, cabeceoMaximo: 0 };
  let tEje: number | null = null;
  let tLof: number | null = null;
  let yLof = 0;
  let antes = t.quienes()[0]!;
  let ocupo = false;
  const avion = t.grupo.children[0]!;
  for (let reloj = 0; reloj < 600; reloj += DT) {
    t.paso(DT);
    const q = t.quienes()[0];
    if (!q) break;
    const v = Math.hypot(q.x - antes.x, q.z - antes.z) / DT;
    antes = q;
    const d = t.porDentro()[0]!;
    const cabeceo = (avion.rotation.x * 180) / Math.PI;
    if (tEje === null && d.recorrido >= eje) tEje = reloj;
    if (tEje !== null && r.aVr === undefined && v >= tipo.rota - 0.3)
      r.aVr = reloj - tEje;
    if (r.aVr === undefined) r.cabeceoAntesDeVr = Math.max(r.cabeceoAntesDeVr!, cabeceo);
    r.cabeceoMaximo = Math.max(r.cabeceoMaximo!, cabeceo);
    if (tEje !== null && r.aLosDiez === undefined && reloj - tEje >= 10) r.aLosDiez = v;
    if (tLof === null && d.recorrido >= despega) {
      tLof = reloj;
      yLof = q.y;
      r.aDespegar = reloj - (tEje ?? 0);
      r.cabeceoAlDespegar = cabeceo;
    }
    if (tLof !== null && r.sube === undefined && reloj - tLof >= 15)
      r.sube = (q.y - yLof) / (reloj - tLof);
    const oc = t.ocupanLaPista().includes(M);
    if (oc) ocupo = true;
    if (ocupo && !oc && r.libre === undefined) r.libre = reloj;
    if (r.libre !== undefined && r.sube !== undefined) break;
  }
  r.alinea = tEje ?? NaN;
  t.dispose();
  return r as Salida;
}

describe("el tráfico despega como su tipo", () => {
  for (const tipo of Object.values(TIPOS)) {
    describe(tipo.id, () => {
      // Cada uno en un campo donde opera de verdad.
      const campo = tipo.id === "reactor" || tipo.id === "turbohelice" ? "tenerife-sur" : "pettirossi";
      const s = salir(campo, tipo);
      const [desde, hasta] = BANDA[tipo.id];

      it(`de alinearse a Vr en ${desde}–${hasta} s (${s.aVr?.toFixed(1)} s)`, () => {
        expect(s.aVr).toBeGreaterThanOrEqual(desde);
        expect(s.aVr).toBeLessThanOrEqual(hasta);
      });

      it(`a los diez segundos de alinearse ya no va a paso de calle (${s.aLosDiez?.toFixed(1)} m/s)`, () => {
        // Un tercio de su Vr, como poco: con la carrera de antes el reactor
        // iba a seis metros por segundo.
        expect(s.aLosDiez).toBeGreaterThan(tipo.rota / 3);
      });

      it("el morro sube después de Vr y antes de que las ruedas dejen el suelo", () => {
        expect(s.cabeceoAntesDeVr).toBeLessThan(0.5);
        expect(s.cabeceoAlDespegar).toBeGreaterThan(tipo.cabeceoAlDespegar * 0.8);
        expect(s.cabeceoMaximo).toBeGreaterThan(tipo.cabeceoSubiendo * 0.9);
        expect(s.cabeceoMaximo).toBeLessThan(tipo.cabeceoSubiendo + 0.5);
      });

      it(`deja el suelo poco después de Vr (${s.aDespegar?.toFixed(1)} s)`, () => {
        expect(s.aDespegar! - s.aVr!).toBeGreaterThan(1.5);
        expect(s.aDespegar! - s.aVr!).toBeLessThan(5);
        // Y a la velocidad de despegar de su tipo, no a la de su final.
        expect(velocidadDeDespegue(tipo)).toBeLessThan(tipo.rota * 1.15);
      });

      it(`sube como su tipo (${s.sube?.toFixed(1)} m/s)`, () => {
        expect(s.sube).toBeGreaterThan(tipo.subeAlDespegar * 0.75);
        expect(s.sube).toBeLessThan(tipo.subeAlDespegar * 1.6);
      });
    });
  }

  it("el turbohélice llega a su Vr antes que el reactor", () => {
    const turbo = salir("tenerife-sur", TIPOS.turbohelice);
    const reactor = salir("tenerife-sur", TIPOS.reactor);
    expect(turbo.aVr).toBeLessThan(reactor.aVr);
  });

  /*
   * **Y lo que tarda una salida**: alinearse y despegar ronda el minuto, y la
   * pista queda libre cuando ha pasado su final (Doc 4444, 7.9: el siguiente
   * no sale hasta que el de delante ha cruzado el final de la pista o ha
   * virado). En los tres kilómetros largos de Tenerife Sur, el reactor y el
   * turbohélice. Antes: 118 y 110 s.
   */
  it("en Tenerife Sur, de la autorización a despegar ronda el minuto, y a dejar la pista libre, minuto y medio", () => {
    for (const tipo of [TIPOS.reactor, TIPOS.turbohelice]) {
      const s = salir("tenerife-sur", tipo);
      const despegado = s.alinea + s.aDespegar;
      expect(despegado, tipo.id).toBeGreaterThan(40);
      expect(despegado, tipo.id).toBeLessThan(75);
      expect(s.libre, tipo.id).toBeLessThan(100);
    }
  });
});
