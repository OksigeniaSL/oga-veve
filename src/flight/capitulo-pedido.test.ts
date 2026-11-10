import { describe, expect, it } from "vitest";
import { diaDelHorario, fechaDelDia, leerElCapituloPedido, pedirElCapitulo } from "./capitulo-pedido";
import { horarioDelDia } from "./ruta-larga";

/** Una pestaña de mentira. */
function pestana(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe("el recado del capítulo que sigue", () => {
  it("lleva el capítulo y el día, y vale para una carga", () => {
    const p = pestana();
    expect(pedirElCapitulo(p, 2, "2026-12-15")).toBe(true);
    expect(leerElCapituloPedido(p)).toEqual({ capitulo: 2, dia: "2026-12-15" });
    expect(leerElCapituloPedido(p)).toBeNull();
  });

  it("el tercero también se pide así, y sin día sigue valiendo", () => {
    const p = pestana();
    pedirElCapitulo(p, 3);
    expect(leerElCapituloPedido(p)).toEqual({ capitulo: 3, dia: null });
  });

  it("entiende el de antes, el número a secas, y tira lo que no es suyo", () => {
    const p = pestana();
    p.setItem("oga-capitulo-pedido", "2");
    expect(leerElCapituloPedido(p)).toEqual({ capitulo: 2, dia: null });
    p.setItem("oga-capitulo-pedido", '{"capitulo":7,"dia":"2026-12-15"}');
    expect(leerElCapituloPedido(p)).toBeNull();
    p.setItem("oga-capitulo-pedido", "{roto");
    expect(leerElCapituloPedido(p)).toBeNull();
    pedirElCapitulo(p, 2, "mañana");
    expect(leerElCapituloPedido(p)).toEqual({ capitulo: 2, dia: null });
  });

  it("sin almacenamiento, o con uno que no deja, no se rompe nada", () => {
    expect(pedirElCapitulo(null, 2, "2026-12-15")).toBe(false);
    expect(leerElCapituloPedido(null)).toBeNull();
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {},
      setItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(pedirElCapitulo(roto, 2, "2026-12-15")).toBe(false);
    expect(leerElCapituloPedido(roto)).toBeNull();
  });
});

describe("el día del vuelo, de un capítulo al siguiente", () => {
  /*
   * Los casos de la costura. El día cambia a la medianoche UTC, que no es la de nadie que
   * juegue: la una de la madrugada en Madrid en invierno, las dos en verano, y las nueve de
   * la noche en Asunción. Por eso las 23:50 de Madrid y pasada su medianoche no cambiaban
   * de vuelo, y la una y media sí. Y los dos fines de semana del cambio de hora de Europa,
   * donde el día de después es además de la otra temporada.
   */
  const casos: [string, string, string, boolean][] = [
    ["23:50 de Madrid en invierno, y el segundo a las 00:10", "2026-12-15T22:50:00Z", "2026-12-15T23:10:00Z", false],
    ["00:50 de Madrid en invierno, y el segundo a la 01:10", "2026-12-15T23:50:00Z", "2026-12-16T00:10:00Z", true],
    ["01:50 de Madrid en verano, y el segundo a las 02:10", "2026-07-15T23:50:00Z", "2026-07-16T00:10:00Z", true],
    ["20:50 de Asunción, y el segundo pasadas las 21:00", "2026-07-15T23:50:00Z", "2026-07-16T00:10:00Z", true],
    ["el sábado del cambio de octubre, con la de verano", "2026-10-24T23:50:00Z", "2026-10-25T00:10:00Z", true],
    ["el sábado del cambio de marzo, con la de invierno", "2026-03-28T23:50:00Z", "2026-03-29T00:10:00Z", true],
  ];

  it.each(casos)("%s: el segundo cae en el mismo vuelo que el primero", (_, primero, segundo, cambiabaDeVuelo) => {
    const h1 = horarioDelDia(new Date(primero));
    const p = pestana();
    pedirElCapitulo(p, 2, diaDelHorario(h1.salida));
    const recado = leerElCapituloPedido(p);
    const h2 = horarioDelDia(fechaDelDia(recado?.dia ?? null) ?? new Date(segundo));
    expect(h2).toEqual(h1);
    // Y sin el día en el recado, eligiéndolo otra vez al recargar, caía en el de la noche siguiente.
    const sinRecado = horarioDelDia(new Date(segundo));
    expect(sinRecado.salida.getTime() !== h1.salida.getTime()).toBe(cambiabaDeVuelo);
  });

  it("el día del cambio, sin el recado, la comandante anunciaba una llegada y se llegaba a otra", () => {
    const sabado = horarioDelDia(new Date("2026-10-24T23:50:00Z"));
    const domingo = horarioDelDia(new Date("2026-10-25T00:10:00Z"));
    expect([sabado.temporada, domingo.temporada]).toEqual(["verano", "invierno"]);
  });

  it("los dos fines de semana del cambio, el día de después es de la otra temporada", () => {
    expect(horarioDelDia(new Date("2026-10-24T12:00:00Z")).temporada).toBe("verano");
    expect(horarioDelDia(new Date("2026-10-25T12:00:00Z")).temporada).toBe("invierno");
    expect(horarioDelDia(new Date("2026-03-28T12:00:00Z")).temporada).toBe("invierno");
    expect(horarioDelDia(new Date("2026-03-29T12:00:00Z")).temporada).toBe("verano");
  });

  it("el día del recado es el del horario que se vuela, y se lee igual que `?fecha=`", () => {
    for (const t of ["2026-12-15T00:30:00Z", "2026-12-15T23:59:00Z", "2026-07-15T21:00:00Z"]) {
      const h = horarioDelDia(new Date(t));
      expect(diaDelHorario(h.salida)).toBe(t.slice(0, 10));
      expect(fechaDelDia(t.slice(0, 10))?.toISOString()).toBe(`${t.slice(0, 10)}T12:00:00.000Z`);
    }
    expect(fechaDelDia(null)).toBeNull();
    expect(fechaDelDia("2026-13-45")).toBeNull();
  });
});
