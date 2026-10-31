/**
 * **La tarjeta del tiempo se explica en voz, y deja de explicarse cuando se
 * pide.** Lo que se mira: cuándo se ofrece «no volver a explicar», que lo
 * quitado se recuerda y se recupera, y que lo que se dice crece con el
 * peldaño y existe en los dos idiomas que hablan.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import {
  AL_SENALAR,
  ExplicacionDelParte,
  leerLaExplicacion,
  montarLaExplicacion,
  OFRECER_DESDE_LA_VEZ,
  PIEZAS_DE_LA_EXPLICACION,
  type GuardadoDeLaExplicacion,
} from "./explicacion-del-parte";
import type { Decision } from "./parte-de-salida";

/** Un almacén en memoria, como el progreso del perfil. */
function almacen(inicial: unknown = undefined) {
  const caja = { valor: inicial as unknown };
  return {
    caja,
    leer: () => caja.valor,
    escribir: (v: GuardadoDeLaExplicacion) => {
      caja.valor = { ...v };
    },
  };
}

const niebla: Decision = {
  salir: false,
  motivos: [
    { papel: "salida", motivo: "visibilidad" },
    { papel: "salida", motivo: "techo" },
  ],
};

describe("cuándo se explica la tarjeta del tiempo", () => {
  it("la primera vez se explica y no se ofrece quitarla; desde la segunda, sí", () => {
    expect(OFRECER_DESDE_LA_VEZ).toBe(2);
    const e = new ExplicacionDelParte(almacen());
    expect(e.alAbrir()).toEqual({ explicar: true, ofrecerQuitarla: false });
    expect(e.alAbrir()).toEqual({ explicar: true, ofrecerQuitarla: true });
    expect(e.alAbrir()).toEqual({ explicar: true, ofrecerQuitarla: true });
    expect(e.veces).toBe(3);
  });

  it("quitada, no se explica ni se ofrece; y queda guardada en el perfil", () => {
    const a = almacen();
    const e = new ExplicacionDelParte(a);
    e.alAbrir();
    e.alAbrir();
    e.quitar();
    expect(e.alAbrir()).toEqual({ explicar: false, ofrecerQuitarla: false });
    // Otra partida, el mismo perfil: sigue quitada.
    const otra = new ExplicacionDelParte(a);
    expect(otra.quitada).toBe(true);
    expect(otra.veces).toBe(3);
  });

  it("desde los ajustes se recupera, y la cuenta sigue: el botón vuelve en cuanto salga", () => {
    const e = new ExplicacionDelParte(almacen({ veces: 4, quitada: true }));
    e.recuperar();
    expect(e.quitada).toBe(false);
    expect(e.alAbrir()).toEqual({ explicar: true, ofrecerQuitarla: true });
  });

  it("al cambiar de perfil se relee lo del perfil nuevo", () => {
    const a = almacen({ veces: 7, quitada: true });
    const e = new ExplicacionDelParte(a);
    a.caja.valor = undefined;
    e.releer();
    expect(e.quitada).toBe(false);
    expect(e.veces).toBe(0);
  });

  it("lo guardado se lee con desconfianza", () => {
    expect(leerLaExplicacion(null)).toEqual({ veces: 0, quitada: false });
    expect(leerLaExplicacion({ veces: "tres", quitada: "sí" })).toEqual({ veces: 0, quitada: false });
    expect(leerLaExplicacion({ veces: 2.7, quitada: true })).toEqual({ veces: 2, quitada: true });
  });
});

describe("qué se dice al abrirse", () => {
  it("abajo, sencillo: qué es, la niebla de acá dicha junta, y que se puede elegir", () => {
    for (const peldano of ["dibujo", "palabra"] as const) {
      const e = montarLaExplicacion(niebla, peldano);
      expect(e.trozos).toEqual([
        "parte.explica.miramos",
        "parte.explica.aca.visibilidadYTecho",
        "parte.explica.elegis",
      ]);
      expect(e.relleno).toEqual({
        porque: "parte.explica.aca.visibilidadYTecho",
        eleccion: "parte.explica.elegis",
      });
    }
  });

  it("desde Taguato, el porqué argumentado del parte y que salir igual también se puede", () => {
    for (const peldano of ["cifra", "cabina"] as const) {
      expect(montarLaExplicacion(niebla, peldano).trozos).toEqual([
        "parte.explica.miramos",
        "parte.propone.visibilidad",
        "parte.explica.tambienSalir",
      ]);
    }
  });

  it("lo de la llegada es «donde vamos», y un motivo solo va solo", () => {
    const viento: Decision = { salir: false, motivos: [{ papel: "llegada", motivo: "cruzado" }] };
    expect(montarLaExplicacion(viento, "dibujo").relleno.porque).toBe("parte.explica.alla.cruzado");
    // La visibilidad en un campo y el techo en otro no son «se ve poco y las nubes bajas» de un sitio.
    const repartido: Decision = {
      salir: false,
      motivos: [
        { papel: "salida", motivo: "visibilidad" },
        { papel: "llegada", motivo: "techo" },
      ],
    };
    expect(montarLaExplicacion(repartido, "dibujo").relleno.porque).toBe("parte.explica.aca.visibilidad");
  });

  it("con buen tiempo, que se puede salir, sin elección que ofrecer", () => {
    const e = montarLaExplicacion({ salir: true, motivos: [] }, "dibujo");
    expect(e.trozos).toEqual(["parte.explica.miramos", "parte.explica.bien"]);
    expect(e.relleno.eleccion).toBeUndefined();
  });

  it("cada pieza que se puede montar está en la lista de grabar", () => {
    const piezas = new Set(PIEZAS_DE_LA_EXPLICACION);
    const motivos = ["tormenta", "visibilidad", "techo", "cruzado", "pista"] as const;
    for (const papel of ["salida", "llegada"] as const)
      for (const motivo of motivos)
        for (const peldano of ["dibujo", "palabra"] as const) {
          if (papel === "llegada" && motivo === "pista") continue;
          const e = montarLaExplicacion({ salir: false, motivos: [{ papel, motivo }] }, peldano);
          for (const k of e.trozos) expect(piezas.has(k), k).toBe(true);
        }
  });

  it("cada frase nueva tiene su texto en castellano y en inglés, y pasa de treinta letras", () => {
    const es = ES_PY as Record<string, string>;
    const en = EN as Record<string, string | undefined>;
    for (const k of [...PIEZAS_DE_LA_EXPLICACION, ...Object.values(AL_SENALAR)]) {
      expect(es[k], `${k} en es-PY`).toBeTruthy();
      expect(en[k], `${k} en en`).toBeTruthy();
      expect(es[k]!.length, `${k}: una frase corta grabada se inventa lo que falta`).toBeGreaterThan(30);
    }
  });
});
