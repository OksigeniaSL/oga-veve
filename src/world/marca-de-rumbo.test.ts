/**
 * **La marca de rumbo del direccional** (ADR 0031, enmienda H26o).
 *
 * En «Rumbo de noche» el rumbo pedido no se veía desde el asiento de la
 * avioneta: el cuadro plano no se pinta en la vista de cabina y el
 * direccional del panel en 3D no llevaba marca. Aquí se mira que la lleve, en
 * magenta y girada a su rumbo, en el panel en 3D y en el cuadro plano.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { cuadroDe } from "../ui/cuadro";
import { PALETA } from "../ui/paleta";
import { SixPack } from "../ui/six-pack";
import { loQueMarcaLaBrujula, pintarReloj, type DatosDeRelojes } from "./relojes-cabina";

/** Un lienzo que no pinta: apunta cada relleno con su color y el giro puesto antes. */
function lienzoQueApunta() {
  const rellenos: { color: string; giro: number }[] = [];
  let giro = 0;
  const estado: Record<string, unknown> = { fillStyle: "", strokeStyle: "", lineWidth: 1 };
  const g = new Proxy(estado, {
    get(obj, clave: string) {
      if (clave === "rotate") return (a: number) => (giro += a);
      if (clave === "save" || clave === "restore" || clave === "setTransform") return () => (giro = 0);
      if (clave === "fill") return () => rellenos.push({ color: String(obj.fillStyle), giro });
      if (clave === "measureText") return () => ({ width: 10 });
      if (clave in obj) return obj[clave];
      return () => undefined;
    },
    set(obj, clave: string, valor) {
      obj[clave] = valor;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, rellenos };
}

const AVIONETA = AIRCRAFT.find((a) => a.id === "jaz-20")!;

function datos(rumboPedido: number | null): DatosDeRelojes {
  return {
    motores: [0.7],
    flaps: 0,
    peldano: 3,
    velocidad: 100,
    pies: 1500,
    fpm: 0,
    rumbo: 200,
    cabeceo: 0,
    alabeo: 0,
    derrape: 0,
    presion: { puesta: 1013, delSitio: 1013 },
    combustible: { kilos: 100, estado: "bien" },
    tren: 1,
    cuadro: cuadroDe(AVIONETA),
    radio: null,
    rumboPedido,
  };
}

describe("la marca de rumbo del direccional", () => {
  it("en el panel en 3D, magenta y girada lo que va del morro a la marca", () => {
    const { g, rellenos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos(225));
    const marca = rellenos.filter((r) => r.color === PALETA.objetivo);
    expect(marca).toHaveLength(1);
    // Del 200 del morro al 225 de la marca: veinticinco grados a la derecha.
    expect((marca[0]!.giro * 180) / Math.PI).toBeCloseTo(25, 6);
  });

  it("sin rumbo pedido, sin marca", () => {
    const { g, rellenos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos(null));
    expect(rellenos.filter((r) => r.color === PALETA.objetivo)).toEqual([]);
  });

  it("la brújula del parabrisas, con la misma cara, ni lleva la marca ni marca el rumbo del direccional: el suyo, el que baila (H26q)", () => {
    const { g, rellenos } = lienzoQueApunta();
    const giros: number[] = [];
    const g2 = new Proxy(g as unknown as Record<string, unknown>, {
      get(obj, clave: string) {
        if (clave === "rotate") return (a: number) => (giros.push(a), (obj.rotate as (a: number) => void)(a));
        return obj[clave];
      },
      set(obj, clave: string, valor) {
        obj[clave] = valor;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    pintarReloj(g2, "dg", -1, loQueMarcaLaBrujula({ ...datos(225), brujula: 187 }));
    expect(rellenos.filter((r) => r.color === PALETA.objetivo)).toEqual([]);
    // La rosa gira con lo que marca la brújula, 187, y no con el 200 del direccional.
    expect((giros[0]! * 180) / Math.PI).toBeCloseTo(-187, 6);
    // Y sin lo suyo, el rumbo de siempre.
    expect(loQueMarcaLaBrujula(datos(null)).rumbo).toBe(200);
  });

  it("y en el cuadro plano, la misma marca dentro de la rosa que gira", () => {
    const svg = SixPack.grupo(cuadroDe(AVIONETA));
    const rosa = svg.indexOf('data-needle="dg-card"');
    const marca = svg.indexOf('data-needle="dg-bug"');
    // Detrás de la rosa que gira y antes del avioncito fijo: va pintada en ella.
    expect(rosa).toBeGreaterThan(0);
    expect(marca).toBeGreaterThan(rosa);
    expect(marca).toBeLessThan(svg.indexOf('class="dg__avion"'));
    expect(svg).toContain('class="dg__marca"');
  });
});

describe("el direccional que se va (H26r)", () => {
  /** Lo que gira el lienzo en cada `rotate`, en grados. */
  function giros(d: DatosDeRelojes): number[] {
    const { g } = lienzoQueApunta();
    const vistos: number[] = [];
    const g2 = new Proxy(g as unknown as Record<string, unknown>, {
      get(obj, clave: string) {
        if (clave === "rotate") return (a: number) => (vistos.push((a * 180) / Math.PI), (obj.rotate as (a: number) => void)(a));
        return obj[clave];
      },
      set(obj, clave: string, valor) {
        obj[clave] = valor;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    pintarReloj(g2, "dg", -1, d);
    return vistos;
  }

  it("en el panel en 3D, la rosa gira con lo que marca el direccional, y la marca va en ella", () => {
    const v = giros({ ...datos(225), direccional: 192 });
    // La rosa, con el 192 del direccional que se fue ocho grados, no con el 200 de verdad.
    expect(v[0]).toBeCloseTo(-192, 6);
    // La marca, a 225 de la rosa: treinta y tres a la derecha de la línea de fe.
    const { g, rellenos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, { ...datos(225), direccional: 192 });
    const marca = rellenos.filter((r) => r.color === PALETA.objetivo);
    expect(marca).toHaveLength(1);
    expect((marca[0]!.giro * 180) / Math.PI).toBeCloseTo(33, 6);
  });

  it("sin poner, la rosa marca el rumbo, como antes; y la brújula no hereda lo que se fue", () => {
    expect(giros(datos(null))[0]).toBeCloseTo(-200, 6);
    expect(loQueMarcaLaBrujula({ ...datos(null), direccional: 192, brujula: 201 }).direccional).toBeNull();
    expect(giros(loQueMarcaLaBrujula({ ...datos(null), direccional: 192, brujula: 201 }))[0]).toBeCloseTo(-201, 6);
  });

  it("en el cuadro plano, la perilla en las dos mitades de abajo, por debajo de la radio", () => {
    const svg = SixPack.grupo(cuadroDe(AVIONETA));
    expect(svg.match(/data-radio-mando="dg"/g)).toHaveLength(2);
    // Antes que la radio en el dibujo: con la radio puesta, la mitad de abajo es del OBS, que va encima.
    expect(svg.indexOf('data-radio-mando="dg"')).toBeLessThan(svg.indexOf('data-radio-mando="obs"'));
    expect(svg.indexOf('data-radio-mando="dg"')).toBeGreaterThan(svg.indexOf('data-needle="dg-card"'));
  });
});
