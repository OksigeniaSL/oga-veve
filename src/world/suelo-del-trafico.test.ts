/**
 * **El tráfico dibujado rueda por el asfalto, en todos los campos.**
 *
 * Lo pidió una captura de Silvio Pettirossi: la avioneta del tráfico venía
 * «por el jardín» y, después de volver a empezar, seguía parada en la hierba
 * junto al punto de espera con la roja encendida. Sus caminos de tierra eran
 * dos puntos inventados al costado de la pista. Ahora salen del grafo de
 * calles —ver `suelo-del-trafico.ts`— y esto lo comprueba punto a punto, con
 * los datos de cada aeródromo de verdad y cada tipo que opera en él.
 */
import { describe, expect, it } from "vitest";
import { enElPavimento, type Aerodrome } from "./aerodrome";
import { SCENARIOS } from "./scenarios";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import { enEjesDePista } from "./rumbo";
import { tiposDelCampo, TIPOS } from "./trafico";

/** Cada cuánto se mira el camino, m. */
const CADA = 4;

/**
 * Lo que se le perdona al camino fuera del asfalto dibujado, m: los ejes de
 * OpenStreetMap se unen en los cruces con un par de metros de juego.
 */
const HOLGURA = 6;

/** Los puntos del camino cada `CADA` metros. */
function muestras(camino: readonly EnElPlano[]): EnElPlano[] {
  const fuera: EnElPlano[] = [];
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = 0; s < d; s += CADA) {
      const t = d > 0 ? s / d : 0;
      fuera.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  const ultimo = camino[camino.length - 1];
  if (ultimo) fuera.push(ultimo);
  return fuera;
}

const CON_CALLES = SCENARIOS.filter(
  (e) => e.aerodrome && !e.aerodrome.privado && e.aerodrome.taxiways.length,
);

describe("el tráfico rueda por las calles, nunca por la hierba", () => {
  it("hay campos que mirar", () => {
    expect(CON_CALLES.length).toBeGreaterThan(8);
  });

  for (const esc of CON_CALLES) {
    const aero = esc.aerodrome as Aerodrome;
    const ancho = aero.runways[0]?.widthM ?? 45;
    const suelo = sueloDelTrafico(aero, esc.runway, ancho);
    const sobreElAsfalto = (p: EnElPlano) =>
      enElPavimento(aero, [p.x, -p.z], HOLGURA);

    it(`${esc.id}: el que aterriza sale por una calle y rueda por asfalto hasta un puesto`, () => {
      expect(suelo, esc.id).not.toBeNull();
      for (const tipo of tiposDelCampo(aero.id, esc.runway.length)) {
        const llega = suelo!.llegada(tipo.toca + tipo.frena);
        expect(llega, `${esc.id} ${tipo.id}`).not.toBeNull();
        const fuera = muestras(llega!.camino).filter((p) => !sobreElAsfalto(p));
        expect(
          fuera.map((p) => `${p.x.toFixed(0)},${p.z.toFixed(0)}`).slice(0, 4),
          `${esc.id} ${tipo.id}`,
        ).toEqual([]);
        // Y la deja de verdad: el final del camino está fuera de la pista.
        const fin = llega!.camino[llega!.camino.length - 1]!;
        const { along, across } = enEjesDePista(
          fin.x,
          fin.z,
          esc.runway.x,
          esc.runway.z,
          esc.runway.heading,
        );
        expect(
          Math.abs(across) > ancho / 2 || Math.abs(along) > esc.runway.length / 2,
          `${esc.id} ${tipo.id}: acaba en ${along.toFixed(0)}/${across.toFixed(0)}`,
        ).toBe(true);
      }
    });

    it(`${esc.id}: el que sale rueda por asfalto hasta una doble raya fuera de la pista`, () => {
      const sale = suelo!.salida();
      expect(sale, esc.id).not.toBeNull();
      const hastaLaRaya = muestras(sale!.camino).filter(
        (_, i, todas) => i < todas.length - 1,
      );
      const fuera = hastaLaRaya.filter((p) => !sobreElAsfalto(p));
      expect(
        fuera.map((p) => `${p.x.toFixed(0)},${p.z.toFixed(0)}`).slice(0, 4),
        esc.id,
      ).toEqual([]);
      expect(sale!.espera).toBeGreaterThan(0);
      expect(sale!.eje).toBeGreaterThan(sale!.espera);
    });
  }
});

describe("y el tipo es el que opera allí", () => {
  it("en los campos de hierba y las pistas cortas, solo lo que cabe", () => {
    expect(tiposDelCampo("SGOG", 900, true)).toEqual([TIPOS.avioneta]);
    for (const t of tiposDelCampo("GCHI", 1256)) expect(t.id).toBe("turbohelice");
    for (const t of tiposDelCampo("SGPJ", 867)) expect(t.id).toBe("avioneta");
  });

  it("y en los aeropuertos grandes, reactores de pasaje", () => {
    expect(tiposDelCampo("SGAS", 3361).map((t) => t.id)).toContain("reactor");
    expect(tiposDelCampo("GCXO", 3390).map((t) => t.id)).toContain("turbohelice");
  });

  it("y ninguno en una pista más corta que la suya", () => {
    for (const esc of SCENARIOS)
      for (const t of tiposDelCampo(esc.aerodrome?.id, esc.runway.length))
        expect(t.pistaMinima, `${esc.id} ${t.id}`).toBeLessThanOrEqual(
          esc.runway.length,
        );
  });
});
