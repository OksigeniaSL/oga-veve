/**
 * El esqueleto del tercer capítulo del vuelo largo: la entrada, y un guion que
 * no dice nada falso ni nada sin grabar. El vuelo de verdad lo vuela
 * `scripts/verificar-inicio-4.mjs`.
 */

import { describe, expect, it } from "vitest";
import ARA from "../../data/voces/ara/manifiesto.json";
import COMANDANTE from "../../data/voces/comandante/manifiesto.json";
import TRIPULACION from "../../data/voces/tripulacion/manifiesto.json";
import TRIPULANTE from "../../data/voces/tripulacion-canarias/manifiesto.json";
import { dondeCae } from "../world/entre-aerodromos";
import type { Linea } from "./conversacion";
import { GUION_LLEGADA_A_ASUNCION } from "./guion-llegada-a-asuncion";
import { escenaPedida } from "./inicio";
import { MotorDelPasaje, type LecturaDelPasaje } from "./motor-del-pasaje";
import { entradaDeLaLlegada, ENTRA_LA_LLEGADA_A, dondeVa, horarioDelDia, perfilDelVuelo, PETTIROSSI } from "./ruta-larga";
import { DEJA_LA_ORTODROMICA } from "./salto-bajo-tapa";

/** Las frases que pueden salir en el guion, con y sin lo que depende del vuelo. */
function lasFrases(l: LecturaDelPasaje): readonly Linea[] {
  const e = new MotorDelPasaje({ decir: () => {}, callar: () => {} }, GUION_LLEGADA_A_ASUNCION);
  return GUION_LLEGADA_A_ASUNCION.momentos.flatMap((m) => [...m.lineas, ...(m.segun?.(l, e) ?? [])]);
}

const EN_CRUCERO: LecturaDelPasaje = {
  tramo: "crucero",
  enTramo: 10,
  motor: true,
  enTierra: false,
  porElSuelo: 230,
  altura: 12000,
  altitud: 12192,
  vertical: 0,
  autorizado: false,
  flaps: 0,
  nubes: null,
  enNube: 0,
  cabina: 0,
  faltaParaTocar: 400_000,
  hastaLaBajada: 480,
};

describe("la entrada", () => {
  it("`?inicio=4` abre el vuelo largo, y los otros siguen abriendo lo suyo", () => {
    expect(escenaPedida("4")).toBe("largo");
    expect(escenaPedida("3")).toBe("pasaje");
    expect(escenaPedida("2")).toBe("aterrizar");
    expect(escenaPedida("1")).toBe("despegar");
  });

  it("entra hacia las 10 h 35 en verano y un poco después en invierno, en el mismo sitio", () => {
    const verano = perfilDelVuelo(horarioDelDia(new Date("2026-07-15T12:00:00Z")));
    const invierno = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
    expect(entradaDeLaLlegada(verano) / 3600).toBeCloseTo(10 + 35 / 60, 1);
    expect(entradaDeLaLlegada(invierno) / 3600).toBeCloseTo(10 + 40 / 60, 1);
    for (const p of [verano, invierno]) {
      const d = dondeVa(p, entradaDeLaLlegada(p));
      expect(d.fase).toBe("crucero");
      expect(p.ruta.distancia - d.recorrido).toBeCloseTo(ENTRA_LA_LLEGADA_A, -1);
    }
  });

  it("con el avión ya dentro del mundo del Paraguay, que llega a 374 km de su centro", () => {
    const p = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
    const { x, z } = dondeCae(PETTIROSSI, dondeVa(p, entradaDeLaLlegada(p)).sitio);
    expect(Math.abs(x)).toBeLessThan(374_000);
    expect(Math.abs(z)).toBeLessThan(374_000);
  });

  it("y se deja la ortodrómica después de entrar, no antes", () => {
    expect(DEJA_LA_ORTODROMICA).toBeLessThan(ENTRA_LA_LLEGADA_A);
  });
});

describe("el guion", () => {
  it("empieza por el hueco del despertar y el desayuno, sin frases, y acaba en `fin`", () => {
    const m = GUION_LLEGADA_A_ASUNCION.momentos;
    expect(m[0]?.id).toBe("despertar");
    expect(m[1]?.id).toBe("desayuno");
    expect(m[0]?.lineas).toEqual([]);
    expect(m[1]?.lineas).toEqual([]);
    expect(m.at(-1)?.id).toBe("fin");
  });

  it("todas sus frases están grabadas: ninguna frase nueva", () => {
    // La tripulante en persona lleva otra voz que la megafonía de la tripulación.
    const bocaDe = (l: Linea): { readonly piezas: object } =>
      l.quien === "ara" ? ARA : l.quien === "mama" ? COMANDANTE : l.megafonia ? TRIPULACION : TRIPULANTE;
    // Los anuncios los monta el juego con el campo de hoy: se mira lo que sale aquí, con Pettirossi.
    const montados: Record<string, string> = {
      "comandante.descenso": "comandante.descenso.hacia.pettirossi",
      "comandante.llegada": "comandante.llegada.pettirossi",
      "tripulacion.llegada": "tripulacion.bienvenidos.pettirossi",
    };
    const faltan: string[] = [];
    for (const l of lasFrases({ ...EN_CRUCERO, potencia: "ralenti", conEstaPotencia: 1 })) {
      const clave = montados[l.clave] ?? l.clave;
      if (!(clave in bocaDe(l).piezas)) faltan.push(clave);
    }
    expect(faltan).toEqual([]);
  });

  it("ni una dice otro sitio: lo de La Palma se queda en su guion", () => {
    const claves = lasFrases(EN_CRUCERO).map((l) => l.clave);
    expect(claves).not.toContain("inicio.ara.pasaje.fin");
  });

  it("Ara no se duerme, con catorce minutos de crucero callado por delante", () => {
    const e = new MotorDelPasaje<string, never>({ decir: () => {}, callar: () => {} }, GUION_LLEGADA_A_ASUNCION);
    for (let i = 0; i < 2000; i++) e.paso(0.1, EN_CRUCERO);
    expect(e.estado.siestas).toEqual([]);
    expect(e.estado.durmiendo).toBe(false);
    expect(e.estado.linea).toBeNull();
    expect(e.estado.momento).toBe("bajada");
  });

  it("la bajada se dice al bajar, con su anuncio y el de los cinturones", () => {
    const dichas: string[] = [];
    const e = new MotorDelPasaje<string, never>(
      {
        decir: (l, alAcabar) => {
          dichas.push(l.clave);
          alAcabar(0);
        },
        callar: () => {},
      },
      GUION_LLEGADA_A_ASUNCION,
    );
    for (let i = 0; i < 10; i++) e.paso(0.1, EN_CRUCERO);
    expect(dichas).toEqual([]);
    const bajando: LecturaDelPasaje = { ...EN_CRUCERO, tramo: "bajada", enTramo: 0, potencia: "ralenti", conEstaPotencia: 0 };
    for (let i = 0; i < 20; i++) e.paso(0.1, bajando);
    expect(dichas).toEqual(["inicio.ara.pasaje.ralenti", "comandante.descenso", "tripulacion.cinturones"]);
  });
});
