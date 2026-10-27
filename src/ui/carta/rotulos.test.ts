/**
 * La colocación de los rótulos de la carta: que ninguno pise a otro.
 *
 * Aquí, sin navegador, con la letra medida a ojo; la medida de verdad la hace
 * `verificar-carteles.mjs`, con la carta abierta en el hangar. Las dos miran lo
 * mismo —las regiones del juego, los cuatro calcos y los tamaños de carta que
 * salen en los tamaños de pantalla del banco— y esta corre en cada `vitest`.
 */

import { describe, expect, it } from "vitest";
import { colocar, cruza, envolvente, sePisan, sitiosAlrededor, type Caja } from "./rotulos";
import { anchoDe, mapaDelPais, sitiosDe, type Etiqueta } from "../mapa-del-pais";
import { scenarioById, SCENARIOS } from "../../world/scenarios";
import { AIRCRAFT } from "../../flight/aircraft";
import { rutasDelMapa } from "../hangar";
import { PELDANOS } from "../../flight/escalera";

describe("las cajas", () => {
  it("dos cajas derechas se pisan si se solapan, y no si solo se tocan", () => {
    const a: Caja = { cx: 0, cy: 0, w: 10, h: 10 };
    expect(sePisan(a, { cx: 9, cy: 0, w: 10, h: 10 })).toBe(true);
    expect(sePisan(a, { cx: 10, cy: 0, w: 10, h: 10 })).toBe(false);
    // Con holgura, tocarse ya cuenta.
    expect(sePisan(a, { cx: 10, cy: 0, w: 10, h: 10 }, 1)).toBe(true);
  });

  it("y una girada se mide girada: en diagonal no pisa lo que pisaría su caja envolvente", () => {
    const larga: Caja = { cx: 0, cy: 0, w: 100, h: 10, giro: Math.PI / 4 };
    const e = envolvente(larga);
    // En la esquina de su envolvente, lejos de la raya en diagonal.
    const esquina: Caja = { cx: e.x1 - 6, cy: e.y0 + 6, w: 8, h: 8 };
    expect(sePisan(larga, esquina)).toBe(false);
    expect(sePisan(larga, { cx: 0, cy: 0, w: 8, h: 8 })).toBe(true);
  });

  it("una raya cruza la caja que atraviesa, y no la que solo bordea", () => {
    const c: Caja = { cx: 50, cy: 50, w: 20, h: 10 };
    expect(cruza(c, { a: [0, 50], b: [100, 50] })).toBe(true);
    expect(cruza(c, { a: [0, 60], b: [100, 60] })).toBe(false);
    expect(cruza(c, { a: [55, 0], b: [45, 100] })).toBe(true);
  });
});

describe("colocar", () => {
  it("pone el segundo donde no pisa al primero, y si no cabe en ningún sitio, no lo pone", () => {
    const sitios = sitiosAlrededor(100, 100, 9, [60, 16]);
    const r = colocar(400, 400, [{ cx: 100, cy: 100, w: 18, h: 18 }], [], [{ formas: [sitios] }, { formas: [sitios] }]);
    expect(r[0]).not.toBeNull();
    expect(r[1]).not.toBeNull();
    expect(sePisan(r[0]!.caja, r[1]!.caja)).toBe(false);
    // Un rótulo más grande que la carta no cabe en ningún sitio.
    const grande = colocar(50, 50, [], [], [{ formas: [sitiosAlrededor(25, 25, 9, [200, 16])] }]);
    expect(grande[0]).toBeNull();
  });

  it("si la forma entera no cabe, prueba la corta", () => {
    const r = colocar(120, 60, [], [], [
      { formas: [sitiosAlrededor(20, 30, 9, [200, 40]), sitiosAlrededor(20, 30, 9, [60, 14])] },
    ]);
    expect(r[0]?.forma).toBe(1);
  });

  it("entre dos sitios libres, el que no tapa una ruta", () => {
    const sitios = sitiosAlrededor(100, 100, 9, [60, 16]);
    // Una ruta que sale hacia la derecha: el rótulo se va a la izquierda.
    const r = colocar(400, 400, [], [{ a: [100, 100], b: [300, 100] }], [{ formas: [sitios] }]);
    expect(r[0]!.caja.cx).toBeLessThan(100);
  });
});

// ── La carta entera, con la letra a ojo ──────────────────────────────────

/** Un renglón de un rótulo: qué es, lo que dice y lo que dice sin sus cifras. */
interface Renglon {
  readonly que: string;
  readonly texto: string;
  readonly corto: string;
}

/** Las etiquetas de una carta y lo que dice cada una, sacadas de su HTML como las lee la página. */
function etiquetasDe(html: string): { e: Etiqueta; renglones: Renglon[] }[] {
  const salen: { e: Etiqueta; renglones: Renglon[] }[] = [];
  const abre = /<span class="[^"]*pais__letra[^"]*"[^>]*data-e='([^']*)'[^>]*>/g;
  const sinEtiquetas = (h: string): string => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  for (let m = abre.exec(html); m; m = abre.exec(html)) {
    // Lo de dentro, hasta su cierre, contando los que se abren dentro.
    const etiqueta = /<\/?span\b[^>]*>/g;
    etiqueta.lastIndex = abre.lastIndex;
    let hondo = 1;
    let fin = abre.lastIndex;
    for (let t = etiqueta.exec(html); t; t = etiqueta.exec(html)) {
      hondo += t[0].startsWith("</") ? -1 : 1;
      if (hondo === 0) {
        fin = t.index;
        break;
      }
    }
    const dentro = html.slice(abre.lastIndex, fin);
    const renglones = [
      ...dentro.matchAll(/<span class="(pais__rotulo-nombre|pais__numeros pais__oaci|pais__numeros pais__radio)">(.*?)<\/span>(?=<span class="pais__|$)/g),
    ].map((r) => ({
      que: r[1]!,
      texto: sinEtiquetas(r[2]!),
      corto: sinEtiquetas(r[2]!.replace(/<span class="pais__cifras">.*$/, "")),
    }));
    const todo = sinEtiquetas(dentro);
    salen.push({ e: JSON.parse(m[1]!) as Etiqueta, renglones: renglones.length ? renglones : [{ que: "", texto: todo, corto: todo }] });
  }
  return salen;
}

/** Lo que mide un rótulo a ojo, en cada una de sus formas: la entera, sin radio, sin cifras, solo el primer renglón, solo el indicativo. */
function medidasDe({ e, renglones }: { e: Etiqueta; renglones: Renglon[] }): [number, number][] {
  const alto = 15.5;
  const mide = (r: readonly string[]): [number, number] => [Math.max(...r.map((t) => anchoDe(t, 13.5))), r.length * alto];
  if (e.tipo !== "campo") {
    const cuerpo = e.tipo === "isla" ? 15 * 1.3 : e.tipo === "ruta" ? 13 : 14;
    return [[anchoDe(renglones[0]!.texto, cuerpo), alto]];
  }
  const sinRadio = renglones.filter((r) => !r.que.includes("radio"));
  const indicativo = renglones.find((r) => r.que.includes("oaci"));
  return [
    mide(renglones.map((r) => r.texto)),
    mide(sinRadio.map((r) => r.texto)),
    mide(sinRadio.map((r) => r.corto)),
    mide(renglones.slice(0, 1).map((r) => r.corto)),
    mide([indicativo?.corto ?? ""]),
  ];
}

/**
 * Los altos de carta que salen en los tamaños de pantalla de `verificar-carteles.mjs`
 * —del portátil al teléfono pequeño tumbado—, y con ficha al lado o sin ella da
 * igual: el lienzo es el mismo.
 */
const ALTOS = [448, 325, 284, 244, 214, 194, 164];

describe("la carta, en todas sus regiones, calcos y tamaños", () => {
  for (const id of ["pettirossi", "tenerife-norte", "cuatro-vientos"]) {
    const sitio = scenarioById(id);
    for (const peldano of PELDANOS)
      it(`${id} en el calco «${peldano}»: ningún rótulo pisa a otro ni a un aeródromo`, () => {
        const html = mapaDelPais(sitio, SCENARIOS, rutasDelMapa(sitio, AIRCRAFT[0]!), sitio.id, peldano, AIRCRAFT[0]!.id);
        const proporcion = Number(html.match(/--proporcion: ([\d.]+)/)?.[1]);
        const etiquetas = etiquetasDe(html).sort((a, b) => a.e.orden - b.e.orden);
        const campos = etiquetas.filter((x) => x.e.tipo === "campo");
        expect(campos.length).toBeGreaterThan(0);
        for (const alto of ALTOS) {
          const ancho = alto * proporcion;
          const fijos: Caja[] = campos.map(({ e }) => ({ cx: e.x * ancho, cy: e.y * alto, w: 2 * (e.r ?? 9) + 4, h: 2 * (e.r ?? 9) + 4 }));
          const porColocar = etiquetas
            .filter((x) => x.e.tipo !== "cota" && x.e.tipo !== "grado")
            .map((x) => sitiosDe(x.e, medidasDe(x), ancho, alto));
          const puestos = colocar(ancho, alto, fijos, [], porColocar);
          const cajas = puestos.flatMap((p) => (p ? [p.caja] : []));
          for (const [i, a] of cajas.entries()) {
            const e = envolvente(a);
            expect(e.x0 >= 0 && e.y0 >= 0 && e.x1 <= ancho && e.y1 <= alto, `${alto} px: se sale`).toBe(true);
            for (const b of [...cajas.slice(i + 1), ...fijos]) expect(sePisan(a, b), `${alto} px`).toBe(false);
          }
          // Y casa lleva su rótulo en una carta de tamaño de tablet.
          if (alto >= 284) expect(puestos[0], `${id} ${peldano} ${alto} px: casa sin rótulo`).not.toBeNull();
        }
      });
  }
});
