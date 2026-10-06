/**
 * **El mismo avión, los mismos instrumentos**, en las dos vistas.
 *
 * Lo dijo quien juega poniendo el cuadro plano y la cabina una al lado de la
 * otra: «los paneles de los aviones no coinciden en diferentes vistas». Y no
 * coincidían en nada que se pudiera pasar por alto: el anemómetro del
 * fumigador rotulado de 35 en 35 en un sitio y de 17,5 en 17,5 en el otro, el
 * motor de pistón en tanto por ciento fuera y en vueltas dentro, un indicador
 * de flaps con las muescas en otro sitio, el depósito solo fuera y el tren
 * solo fuera.
 *
 * Cada dibujo por separado estaba bien hecho, y por eso ninguna prueba lo
 * veía: lo que fallaba era compararlos. Así que esto los compara. Del cuadro
 * plano se lee el SVG que sale de `Tablero.markup`; de la cabina, lo que
 * `pintarReloj` escribe en un lienzo de mentira que apunta cada letra y cada
 * arco; y del modelo, qué esferas trae el `.glb` de verdad. Las tres cosas
 * tienen que decir lo mismo que la escala de `cuadro.ts`, avión por avión.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import {
  COLOR_DE_ARCO,
  cuadroDe,
  instrumentosDe,
  type Cuadro,
  type Escala,
} from "./cuadro";
import { Tablero } from "./tablero";
import {
  pintarReloj,
  type DatosDeRelojes,
  type QueMide,
} from "../world/relojes-cabina";

const DE_ESFERAS = AIRCRAFT.filter((a) => cuadroDe(a).familia === "esferas");

/*
 * `fs` de Node, pedido en marcha: ver `flaps-del-modelo.test.ts`, que explica
 * por qué no se importa por su nombre.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

// ── El cuadro plano, leído del SVG ─────────────────────────────────────

interface Leido {
  /** Las cifras de la escala, en orden. */
  readonly cifras: readonly string[];
  /** Los rótulos y las unidades: todo lo que no es cifra de escala. */
  readonly rotulos: readonly string[];
  /** Los colores de los arcos. */
  readonly arcos: readonly string[];
  readonly raya: boolean;
}

/** El trozo de SVG de la esfera `id`, desde su `data-dial` hasta la siguiente. */
function trozo(svg: string, id: string): string {
  const desde = svg.indexOf(`data-dial="${id}"`);
  if (desde < 0) return "";
  const hasta = svg.indexOf("data-dial=", desde + 10);
  return svg.slice(desde, hasta < 0 ? undefined : hasta);
}

function textos(svg: string, clase: string): string[] {
  const re = new RegExp(`class="${clase}"[^>]*>([^<]+)<`, "g");
  return [...svg.matchAll(re)].map((m) => m[1]!);
}

function leerPlano(svg: string, id: string): Leido {
  const t = trozo(svg, id);
  return {
    cifras: textos(t, "esfera__cifra"),
    rotulos: [...textos(t, "esfera__rotulo"), ...textos(t, "esfera__unidad")],
    arcos: [...t.matchAll(/esfera__arco--(\w+)/g)].map((m) => m[1]!),
    raya: t.includes("esfera__raya"),
  };
}

// ── La cabina, leída de un lienzo que apunta ──────────────────────────

/**
 * Un lienzo que no pinta: apunta. Cada `fillText`, con su texto; y cada arco
 * trazado con el ancho de un arco de escala, con su color.
 */
function lienzoQueApunta() {
  const escrito: string[] = [];
  const arcos: string[] = [];
  const rayas: string[] = [];
  let hayArco = false;
  let segmentos = 0;
  const estado: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };
  const g = new Proxy(estado, {
    get(obj, clave: string) {
      if (clave === "fillText") return (texto: string) => escrito.push(texto);
      if (clave === "beginPath")
        return () => {
          hayArco = false;
          segmentos = 0;
        };
      if (clave === "arc") return () => (hayArco = true);
      if (clave === "lineTo") return () => (segmentos += 1);
      if (clave === "stroke")
        return () => {
          if (hayArco) arcos.push(String(obj.strokeStyle));
          else if (segmentos === 1) rayas.push(String(obj.strokeStyle));
        };
      if (clave === "measureText") return () => ({ width: 10 });
      if (clave in obj) return obj[clave];
      return () => undefined;
    },
    set(obj, clave: string, valor) {
      obj[clave] = valor;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, escrito, arcos, rayas };
}

function datos(a: AircraftConfig): DatosDeRelojes {
  return {
    motores: Array.from({ length: a.motores }, () => 0.7),
    flaps: 1 / 3,
    peldano: 4,
    velocidad: 90,
    pies: 1500,
    fpm: 300,
    rumbo: 120,
    cabeceo: 3,
    alabeo: 10,
    derrape: 0,
    presion: { puesta: 1013, delSitio: 1013 },
    combustible: { kilos: 100, estado: "bien" },
    tren: 1,
    cuadro: cuadroDe(a),
  };
}

const NOMBRE_DEL_COLOR = new Map(
  Object.entries(COLOR_DE_ARCO).map(([nombre, color]) => [color, nombre]),
);

function leerCabina(a: AircraftConfig, que: QueMide, motor = -1): Leido & { escrito: string[] } {
  const { g, escrito, arcos, rayas } = lienzoQueApunta();
  pintarReloj(g, que, motor, datos(a));
  const c = cuadroDe(a);
  const escala = escalaDe(c, que);
  const deEscala = new Set(
    escala?.marcas.flatMap((m) => (m.cifra ? [m.cifra] : [])) ?? [],
  );
  return {
    escrito,
    cifras: escrito.filter((t) => deEscala.has(t)),
    rotulos: escrito.filter((t) => !deEscala.has(t)),
    arcos: arcos
      .map((color) => NOMBRE_DEL_COLOR.get(color))
      .filter((n): n is string => !!n),
    raya: rayas.includes(COLOR_DE_ARCO.rojo),
  };
}

function escalaDe(c: Cuadro, que: QueMide): Escala | null {
  switch (que) {
    case "asi":
      return c.anemometro;
    case "alt":
      return c.altimetro;
    case "vsi":
      return c.variometro;
    case "dg":
      return c.rosa;
    case "fuel":
      return c.combustible;
    case "flaps":
      return c.escalaDeFlaps;
    case "rpm":
    case "par":
    case "n1":
      return c.motor;
    default:
      return null;
  }
}

/** Las cifras de la escala, en el orden de sus marcas. */
function cifrasDe(e: Escala | null): string[] {
  return e?.marcas.flatMap((m) => (m.cifra ? [m.cifra] : [])) ?? [];
}

// ── El modelo, leído del .glb ─────────────────────────────────────────

/**
 * Qué esferas trae el modelo **en el panel**, contadas por lo que miden.
 *
 * Sin la brújula, que no es del panel: cuelga del travesaño del parabrisas,
 * como en cualquier avioneta, y es de tarjeta vertical, así que gira con el
 * mismo dibujo que el direccional —su cara es un `reloj_dg`—. El cuadro
 * plano lleva los seis de vuelo y los de motor; la brújula de reserva, no.
 * Ver `parabrisas_por_dentro` en `modelos/comun.py`.
 */
function esferasDelModelo(id: string): Record<string, number> {
  // Un .glb es una cabecera de doce bytes y luego trozos: el primero es el
  // JSON, con su largo en los cuatro bytes de después de la cabecera.
  const glb = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const largo = new DataView(glb.buffer, glb.byteOffset).getUint32(12, true);
  const texto = new TextDecoder().decode(glb.subarray(20, 20 + largo));
  const json = JSON.parse(texto) as {
    nodes?: { mesh?: number; name?: string }[];
    meshes: { primitives: { material?: number }[] }[];
    materials?: { name?: string }[];
  };
  const cuenta: Record<string, number> = {};
  for (const n of json.nodes ?? []) {
    if (n.mesh === undefined || n.name === "brujula") continue;
    for (const p of json.meshes[n.mesh]!.primitives) {
      const nombre = json.materials?.[p.material ?? -1]?.name ?? "";
      if (!nombre.startsWith("reloj_")) continue;
      const que = nombre.slice("reloj_".length);
      cuenta[que] = (cuenta[que] ?? 0) + 1;
    }
  }
  return cuenta;
}

function contar(lista: readonly string[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const x of lista) cuenta[x] = (cuenta[x] ?? 0) + 1;
  return cuenta;
}

// ── Las comprobaciones ────────────────────────────────────────────────

describe("el mismo avión, los mismos instrumentos", () => {
  it("hay aviones de esferas que comparar", () => {
    expect(DE_ESFERAS.map((a) => a.id)).toEqual(["jaz-20", "jaz-25", "jaz-40"]);
  });

  for (const a of DE_ESFERAS) {
    const c = cuadroDe(a);
    const plano = new Tablero().markup(a);

    it(`${a.id}: el modelo trae las esferas que dice su escala`, () => {
      expect(esferasDelModelo(a.id)).toEqual(contar(instrumentosDe(a)));
    });

    it(`${a.id}: y el cuadro plano, las mismas`, () => {
      const diales = [...plano.matchAll(/data-dial="([\w-]+)"/g)].map((m) =>
        m[1]!.startsWith("motor-") ? c.queMarca : m[1]!,
      );
      // El tren del cuadro plano son sus tres ruedas en la placa, no una
      // esfera; en la cabina van en la suya. Es el mismo instrumento.
      const tren = plano.includes('data-cristal="tren"') ? ["tren"] : [];
      expect(contar([...diales, ...tren])).toEqual(contar(instrumentosDe(a)));
    });

    for (const que of ["asi", "alt", "vsi", "dg"] as const) {
      it(`${a.id}: ${que}, las mismas cifras, arcos y rótulos dentro y fuera`, () => {
        const fuera = leerPlano(plano, que);
        const dentro = leerCabina(a, que);
        expect(fuera.cifras).toEqual(cifrasDe(escalaDe(c, que)));
        expect(dentro.cifras).toEqual(fuera.cifras);
        expect([...dentro.arcos].sort()).toEqual([...fuera.arcos].sort());
        expect(dentro.raya).toBe(fuera.raya);
        for (const r of fuera.rotulos) expect(dentro.rotulos).toContain(r);
      });
    }

    it(`${a.id}: el motor es un tacómetro en vueltas en las dos vistas`, () => {
      expect(c.queMarca).toBe("rpm");
      const fuera = leerPlano(plano, "motor-0");
      const dentro = leerCabina(a, "rpm", 0);
      expect(fuera.cifras).toEqual(cifrasDe(c.motor));
      expect(dentro.cifras).toEqual(fuera.cifras);
      expect(fuera.rotulos).toContain("×100");
      expect(dentro.rotulos).toContain("×100");
      expect(dentro.arcos).toEqual(fuera.arcos);
      expect(fuera.raya && dentro.raya).toBe(true);
      // Y la cifra de debajo, en vueltas y no en tanto por ciento.
      const lectura = dentro.escrito.find((t) => /^\d{3,4}$/.test(t));
      expect(Number(lectura)).toBeGreaterThan(500);
    });

    it(`${a.id}: el depósito, en las dos vistas y con la misma escala`, () => {
      const fuera = leerPlano(plano, "fuel");
      const dentro = leerCabina(a, "fuel");
      expect(fuera.cifras).toEqual(["E", "F"]);
      expect(dentro.cifras).toEqual(fuera.cifras);
      expect(dentro.arcos).toEqual(fuera.arcos);
      expect(fuera.rotulos).toContain("FUEL");
      expect(dentro.rotulos).toContain("FUEL");
      expect(dentro.rotulos).toContain("KG");
    });

    it(`${a.id}: los flaps, con sus grados donde caen, o en ninguna`, () => {
      if (!c.escalaDeFlaps) {
        expect(plano).not.toContain('data-dial="flaps"');
        expect(esferasDelModelo(a.id).flaps).toBeUndefined();
        return;
      }
      const fuera = leerPlano(plano, "flaps");
      const dentro = leerCabina(a, "flaps");
      expect(fuera.cifras).toEqual(a.muescasDeFlaps.map(String));
      expect(dentro.cifras).toEqual(fuera.cifras);
      // Cada muesca en proporción a sus grados, no repartidas.
      const tope = a.muescasDeFlaps[a.muescasDeFlaps.length - 1]!;
      expect(c.escalaDeFlaps.marcas.map((m) => m.en)).toEqual(
        a.muescasDeFlaps.map((g) => g / tope),
      );
    });
  }
});

describe("las pantallas del de cristal, iguales dentro y fuera", () => {
  it("el cuadro plano lleva la franja de motor con el par, los flaps, el depósito y el tren", () => {
    const a = AIRCRAFT.find((x) => cuadroDe(x).familia === "cristal")!;
    const plano = new Tablero().markup(a);
    expect(plano).toContain('data-motor-barra="0"');
    expect(plano).toContain('data-cristal="combustible"');
    expect(plano).toContain('data-cristal="flaps"');
    expect(plano).toContain('data-cristal="tren"');
  });

  it("y el modelo ya no lleva relojes redondos de par: van en la pantalla", () => {
    for (const a of AIRCRAFT.filter((x) => cuadroDe(x).familia !== "esferas"))
      expect(esferasDelModelo(a.id), a.id).toEqual({});
  });
});
