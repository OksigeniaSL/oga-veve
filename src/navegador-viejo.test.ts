/**
 * **Que el juego siga en pie en la pizarra de un aula con un navegador viejo.**
 *
 * Hay pizarras digitales con un Android 8 que ya no se actualiza y su Firefox
 * 98, de 2022. Ese navegador no entiende `:has()`, las unidades ni las
 * consultas de contenedor, `dvh`, `color-mix()`, `roundRect`,
 * `DecompressionStream` ni `AbortSignal.timeout`. Y no hay pantalla táctil que
 * tenga «pasar por encima»: un `:hover` se queda pegado al tocar.
 *
 * Nada de eso se ve en el portátil donde se programa, que tiene un navegador
 * de este año y ratón. Así que se vigila aquí, sobre el código:
 *
 * - cada `:hover`, dentro de `@media (hover: hover)`;
 * - cada `:has(X)`, escrito `:is(:has(X), .clase)` con la clase que pone
 *   `ui/espejo-de-has.ts` —Firefox 98 se salta dentro de `:is()` lo que no
 *   entiende, medido en el de verdad—;
 * - cada medida con `cq…`, con su reserva en `@supports not (container-type:
 *   size)`, que tira de lo que mide `ui/medidas-de-contenedor.ts`;
 * - `dvh`, `color-mix()` y `oklch()`, solo dentro de un `@supports` que los
 *   pregunte: con `var()` al lado, la reserva escrita delante no sirve, porque
 *   esa declaración no se descarta al leerla sino al aplicarla;
 * - y en el código, ninguna función posterior a 2022 a pelo: van por
 *   `navegador-viejo.ts`, que pone la reserva.
 */

import { describe, expect, it, vi } from "vitest";
import HOJA from "./style.css?raw";
import { ESPEJOS, reflejar } from "./ui/espejo-de-has";
import {
  desgzip,
  descomprimirGzip,
  inflar,
  rectanguloRedondeado,
  senalConPlazo,
} from "./navegador-viejo";

const FIGURAS = import.meta.glob("./ui/figuras/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const HOJAS: Record<string, string> = { "style.css": HOJA, ...FIGURAS };

/** Una regla con su selector, sus declaraciones y las reglas `@` que la envuelven. */
interface Regla {
  readonly hoja: string;
  readonly linea: number;
  readonly selector: string;
  readonly envoltorio: readonly string[];
  readonly declaraciones: readonly { prop: string; valor: string }[];
}

/** Las reglas de una hoja, sin comentarios y llevando la cuenta de las llaves. */
function reglas(hoja: string, css: string): Regla[] {
  const fuera: Regla[] = [];
  const pila: { cabecera: string; linea: number; cuerpo: string }[] = [];
  let trozo = "";
  let linea = 1;
  let comillas: string | null = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i]!;
    if (c === "\n") linea++;
    if (comillas) {
      trozo += c;
      if (c === comillas && css[i - 1] !== "\\") comillas = null;
      continue;
    }
    if (c === "/" && css[i + 1] === "*") {
      const fin = css.indexOf("*/", i + 2);
      const salto = fin < 0 ? css.length : fin + 2;
      linea += (css.slice(i, salto).match(/\n/g) ?? []).length;
      i = salto - 1;
      continue;
    }
    if (c === '"' || c === "'") comillas = c;
    if (c === "{") {
      // Lo que va antes de la llave, sin las declaraciones que la preceden.
      const partes = trozo.split(";");
      const cabecera = partes.pop()!.trim();
      if (pila.length) pila[pila.length - 1]!.cuerpo += partes.join(";") + ";";
      pila.push({ cabecera, linea, cuerpo: "" });
      trozo = "";
    } else if (c === "}") {
      const abierta = pila.pop();
      if (!abierta) continue;
      abierta.cuerpo += trozo;
      trozo = "";
      if (!abierta.cabecera.startsWith("@")) {
        const declaraciones = abierta.cuerpo
          .split(";")
          .map((d) => d.trim())
          .filter((d) => d.includes(":"))
          .map((d) => {
            const dos = d.indexOf(":");
            return { prop: d.slice(0, dos).trim(), valor: d.slice(dos + 1).trim() };
          });
        fuera.push({
          hoja,
          linea: abierta.linea,
          selector: abierta.cabecera.replace(/\s+/g, " "),
          envoltorio: pila.map((p) => p.cabecera.replace(/\s+/g, " ")),
          declaraciones,
        });
      }
    } else trozo += c;
  }
  return fuera;
}

const TODAS = Object.entries(HOJAS).flatMap(([nombre, css]) => reglas(nombre, css));
const donde = (r: Regla): string => `${r.hoja}:${r.linea} ${r.selector}`;

/** Si la regla va dentro de un `@supports` que pregunta por algo que case con `que`. */
const dentroDeSupports = (r: Regla, que: RegExp, negado = false): boolean =>
  r.envoltorio.some(
    (e) => e.startsWith("@supports") && que.test(e) && /^@supports\s+not\b/.test(e) === negado,
  );

const CQ = /(^|[^\w-])-?[\d.]+cq(w|h|i|b|min|max)\b/;
const DVH = /(^|[^\w-])-?[\d.]+(dvh|svh|lvh|dvw|svw|lvw|dvmin|dvmax)\b/;
const COLOR_NUEVO = /\b(color-mix|oklch|oklab|lab|lch|light-dark)\(/;

describe("la hoja de estilos en un navegador viejo y con el dedo", () => {
  it("sabe leer las reglas, también las de dentro de un @media", () => {
    const r = reglas("x", "@media (hover: hover) { .a:hover { color: red; } }\n.b { top: 0; }");
    expect(r.map((x) => [x.selector, x.envoltorio])).toEqual([
      [".a:hover", ["@media (hover: hover)"]],
      [".b", []],
    ]);
    expect(TODAS.length).toBeGreaterThan(2000);
  });

  it("pone cada :hover dentro de @media (hover: hover)", () => {
    /*
     * Salvo el que **deshace** con el dedo el `:hover` de una hoja que no es
     * nuestra: el del botón del panel de accesibilidad, que vive en su sombra y
     * solo se alcanza con `::part()`. Ese va en `(hover: none)` a propósito, que
     * es lo contrario de pegarse. Ver `ui/panel-de-acceso.ts`.
     */
    const deshaceElDeOtro = (r: Regla) =>
      r.selector.includes("::part(") &&
      r.envoltorio.some((e) => /^@media\b(?!\s+not\b).*\(\s*hover\s*:\s*none\s*\)/.test(e));
    const pegados = TODAS.filter(
      (r) =>
        r.selector.includes(":hover") &&
        !deshaceElDeOtro(r) &&
        !r.envoltorio.some((e) => /^@media\b(?!\s+not\b).*\(\s*hover\s*:\s*hover\s*\)/.test(e)),
    ).map(donde);
    expect(pegados).toEqual([]);
  });

  it("escribe cada :has() con la clase que pone el espejo", () => {
    const mal: string[] = [];
    const usados = new Set<string>();
    for (const r of TODAS) {
      let i = r.selector.indexOf(":has(");
      while (i >= 0) {
        // Lo de dentro, con los paréntesis equilibrados.
        let k = i + 5;
        for (let prof = 1; prof; k++) prof += r.selector[k] === "(" ? 1 : r.selector[k] === ")" ? -1 : 0;
        const dentro = r.selector.slice(i + 5, k - 1);
        const espejo = ESPEJOS.find((e) => e.si === dentro);
        const conIs = r.selector.slice(i - 4, i) === ":is(";
        const clase = conIs ? /^, \.([\w-]+)\)/.exec(r.selector.slice(k))?.[1] : undefined;
        // El sujeto: lo que va pegado delante del `:is(`, hasta el combinador.
        const sujeto =
          r.selector
            .slice(0, i - 4)
            .replace(/:not\($/, "")
            .split(/[\s>+~(]/)
            .pop() ?? "";
        if (!espejo || !conIs || clase !== espejo.clase || !sujeto.includes(espejo.en))
          mal.push(`${donde(r)}  ←  :has(${dentro})`);
        else usados.add(`${espejo.en} ${espejo.si}`);
        i = r.selector.indexOf(":has(", k);
      }
    }
    expect(mal).toEqual([]);
    // Y al revés: ninguna clase del espejo que la hoja ya no use.
    expect(ESPEJOS.filter((e) => !usados.has(`${e.en} ${e.si}`))).toEqual([]);
  });

  it("da a cada medida de contenedor su reserva", () => {
    const clave = (r: Regla, prop: string): string =>
      [
        ...r.envoltorio.filter((e) => !/^@supports\s+not\s*\(\s*container-type/.test(e)),
        r.selector,
        prop,
      ].join(" | ");
    const reservas = new Set(
      TODAS.filter((r) => dentroDeSupports(r, /container-type/, true)).flatMap((r) =>
        r.declaraciones.filter((d) => !CQ.test(d.valor)).map((d) => clave(r, d.prop)),
      ),
    );
    const sinReserva = TODAS.filter(
      (r) => !r.envoltorio.some((e) => e.startsWith("@container")) && !dentroDeSupports(r, /container/),
    ).flatMap((r) =>
      r.declaraciones
        .filter((d) => CQ.test(d.valor) && !reservas.has(clave(r, d.prop)))
        .map((d) => `${donde(r)} { ${d.prop} }`),
    );
    expect(sinReserva).toEqual([]);
  });

  it("deja dvh, color-mix() y oklch() solo dentro del @supports que los pregunta", () => {
    const fuera = TODAS.flatMap((r) =>
      r.declaraciones
        .filter(
          (d) =>
            (DVH.test(d.valor) && !dentroDeSupports(r, DVH)) ||
            (COLOR_NUEVO.test(d.valor) && !dentroDeSupports(r, COLOR_NUEVO)),
        )
        .map((d) => `${donde(r)} { ${d.prop}: ${d.valor} }`),
    );
    expect(fuera).toEqual([]);
  });
});

describe("el espejo de :has()", () => {
  /** Un documento de mentira: lo justo para `reflejar`. */
  function documento(hijos: Record<string, boolean>) {
    const clases = new Set<string>();
    const hud = {
      classList: { toggle: (c: string, si: boolean) => (si ? clases.add(c) : clases.delete(c)) },
      querySelector: (s: string) => (hijos[s] ? {} : null),
    };
    const doc = {
      querySelectorAll: (s: string) => (s === ".hud" ? [hud] : []),
    } as unknown as Document;
    return { doc, clases };
  }

  it("pone la clase cuando lo de dentro está y la quita cuando se va", () => {
    const { doc, clases } = documento({ ".cuadro--bajado": true });
    reflejar(doc);
    expect(clases.has("hay-cuadro-bajado")).toBe(true);
    expect(clases.has("hay-radio")).toBe(false);
    const otro = documento({});
    otro.clases.add("hay-cuadro-bajado");
    reflejar(otro.doc);
    expect(otro.clases.has("hay-cuadro-bajado")).toBe(false);
  });

  it("no repite una clase para dos preguntas distintas sobre el mismo sujeto", () => {
    const vistos = new Map<string, string>();
    for (const e of ESPEJOS) {
      const k = `${e.en} .${e.clase}`;
      expect(vistos.get(k) ?? e.si, k).toBe(e.si);
      vistos.set(k, e.si);
    }
  });
});

describe("el código, sin funciones de después de 2022 a pelo", () => {
  const FUENTES = import.meta.glob([
    "./**/*.ts",
    "!./**/*.test.ts",
    "!./navegador-viejo.ts",
    // Pregunta a `CSS.supports` por `:has()`, que no lanza en ningún navegador.
    "!./ui/espejo-de-has.ts",
  ], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  /** Lo que Firefox 98 no tiene, con la versión que lo trae. */
  const PROHIBIDO: readonly [RegExp, string][] = [
    [/\.roundRect\(/, "roundRect (Firefox 112): rectanguloRedondeado"],
    [/AbortSignal\.(timeout|any)\(/, "AbortSignal.timeout (Firefox 100): senalConPlazo"],
    [/new (De)?CompressionStream\(/, "DecompressionStream (Firefox 113): descomprimirGzip"],
    [/\.(findLast|findLastIndex|toSorted|toReversed|toSpliced)\(/, "Array de 2023 (Firefox 104-115)"],
    [/(Object|Map)\.groupBy\(/, "groupBy (Firefox 119)"],
    [/Intl\.Segmenter/, "Intl.Segmenter (Firefox 125)"],
    [/Promise\.withResolvers\(/, "Promise.withResolvers (Firefox 121)"],
    [/Array\.fromAsync\(/, "Array.fromAsync (Firefox 115)"],
    [/\.checkVisibility\(/, "checkVisibility (Firefox 106)"],
    [/\.(showPopover|hidePopover|togglePopover)\(/, "popover (Firefox 125)"],
    [/\.inert\s*=/, "inert (Firefox 112)"],
    [/createConicGradient\(/, "createConicGradient (Firefox 112)"],
    [/new OffscreenCanvas\(/, "OffscreenCanvas (Firefox 105)"],
    [/new (Shared)?Worker\([^)]*type:\s*["']module/, "trabajador de módulo (Firefox 114)"],
    [/["'`][^"'`\n]*:has\(/, ":has() en un selector de JavaScript: Firefox 98 lanza"],
  ];

  it("lee el código de verdad", () => {
    expect(Object.keys(FUENTES).length).toBeGreaterThan(200);
  });

  it("pasa por navegador-viejo.ts para lo que no tiene Firefox 98", () => {
    const mal: string[] = [];
    for (const [fichero, fuente] of Object.entries(FUENTES)) {
      // Sin comentarios: hablar de una función no es usarla.
      const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
      for (const [patron, que] of PROHIBIDO)
        if (patron.test(codigo)) mal.push(`${fichero}: ${que}`);
    }
    expect(mal).toEqual([]);
  });
});

describe("lo que navegador-viejo.ts hace a mano", () => {
  async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
    const flujo = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  }

  /** Un relieve como los de verdad: casi todo mar a cota cero y una isla. */
  function relieve(): Uint8Array {
    const n = 256;
    const r = new Int16Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const d = Math.hypot(i - n / 2, j - n / 2);
        r[i * n + j] = d < 60 ? Math.round(3700 * (1 - d / 60)) : 0;
      }
    return new Uint8Array(r.buffer);
  }

  it("descomprime gzip igual que el navegador", async () => {
    let semilla = 7;
    const azar = new Uint8Array(70_000).map(() => (semilla = (semilla * 1103515245 + 12345) >>> 0) >>> 24);
    const texto = new TextEncoder().encode("Seguridad, seguridad, seguridad. ".repeat(500));
    for (const crudo of [relieve(), azar, texto, new Uint8Array(0), new Uint8Array([42])]) {
      expect(desgzip(await gzip(crudo))).toEqual(crudo);
    }
  });

  it("agranda la salida si el tamaño previsto se queda corto", async () => {
    const crudo = relieve();
    const gz = await gzip(crudo);
    // Sin cabecera ni cola: deflate en crudo, sin saber cuánto va a salir.
    expect(inflar(gz.subarray(10, gz.length - 8), 16)).toEqual(crudo);
  });

  it("sin DecompressionStream descomprime a mano, y da lo mismo", async () => {
    const crudo = relieve();
    const gz = await gzip(crudo);
    const conNavegador = new Uint8Array(await descomprimirGzip(gz.slice().buffer));
    vi.stubGlobal("DecompressionStream", undefined);
    try {
      const aMano = new Uint8Array(await descomprimirGzip(gz.slice().buffer));
      expect(aMano).toEqual(conNavegador);
      expect(aMano).toEqual(crudo);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("no da por bueno lo que no es gzip", () => {
    expect(() => desgzip(new Uint8Array(40))).toThrow();
  });

  it("dibuja el rectángulo redondeado con arcos donde no hay roundRect", () => {
    const hecho: string[] = [];
    const g = {
      moveTo: () => hecho.push("moveTo"),
      lineTo: () => hecho.push("lineTo"),
      arcTo: (_a: number, _b: number, _c: number, _d: number, r: number) => hecho.push(`arcTo ${r}`),
      closePath: () => hecho.push("closePath"),
    } as unknown as CanvasRenderingContext2D;
    // Un radio mayor que medio lado se recorta, como hace roundRect.
    rectanguloRedondeado(g, 0, 0, 4, 10, 5);
    expect(hecho.filter((h) => h.startsWith("arcTo"))).toEqual(["arcTo 2", "arcTo 2", "arcTo 2", "arcTo 2"]);
    expect(hecho.at(-1)).toBe("closePath");

    const conTodo: unknown[] = [];
    rectanguloRedondeado({ roundRect: (...a: unknown[]) => conTodo.push(a) } as unknown as CanvasRenderingContext2D, 1, 2, 3, 4, 1);
    expect(conTodo).toEqual([[1, 2, 3, 4, 1]]);
  });

  it("corta la petición a su plazo donde no hay AbortSignal.timeout", () => {
    vi.useFakeTimers();
    const timeout = AbortSignal.timeout;
    try {
      (AbortSignal as { timeout?: unknown }).timeout = undefined;
      const s = senalConPlazo(4000);
      vi.advanceTimersByTime(3999);
      expect(s.aborted).toBe(false);
      vi.advanceTimersByTime(1);
      expect(s.aborted).toBe(true);
    } finally {
      AbortSignal.timeout = timeout;
      vi.useRealTimers();
    }
  });
});
