/**
 * **Las fotos de las historias: cada una existe, pesa poco y lleva su crédito.**
 *
 * La regla octava de AGENTS.md —cada asset se anota en `CREDITOS.md` con su
 * licencia y su origen, antes de entrar; sin licencia verificable no entra—
 * puesta donde se cumple sola: aquí. Y la del rendimiento: se ven a 240 de
 * ancho, se hacen a 480 y no pasan de sesenta kilobytes.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import {
  CON_FOTO,
  FOTOS,
  SIN_FOTO,
  TAMANO_DE_FOTO,
  claveDelAlt,
  firmaDe,
  fotoDeLaHistoria,
  pideFirma,
} from "./fotos-de-las-historias";

/*
 * El módulo de Node se pide al propio proceso, como en `historias.test.ts`:
 * el proyecto no carga los tipos de Node.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  readFileSync(ruta: string, cod: string): string;
  readdirSync(ruta: string): string[];
  existsSync(ruta: string): boolean;
};

const CARPETA = "src/assets/historias";
const claves = Object.keys(FOTOS);
const historias = Object.keys(ES_PY)
  .map((k) => /^ventanilla\.historia\.(.+)$/.exec(k)?.[1])
  .filter((x): x is string => !!x);

/** El ancho y el alto de un WebP, leídos de su cabecera. */
function medidasDeWebp(b: Uint8Array): { ancho: number; alto: number } | null {
  const txt = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (txt(0, 4) !== "RIFF" || txt(8, 4) !== "WEBP") return null;
  const trozo = txt(12, 4);
  const le16 = (i: number) => b[i]! | (b[i + 1]! << 8);
  const le24 = (i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
  if (trozo === "VP8 ") return { ancho: le16(26) & 0x3fff, alto: le16(28) & 0x3fff };
  if (trozo === "VP8X") return { ancho: le24(24) + 1, alto: le24(27) + 1 };
  if (trozo === "VP8L") {
    const v = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { ancho: (v & 0x3fff) + 1, alto: ((v >> 14) & 0x3fff) + 1 };
  }
  return null;
}

describe("las fotos de las historias", () => {
  it("cada historia tiene su foto, o está apuntada sin ella con su motivo", () => {
    for (const h of historias)
      expect(h in FOTOS || h in SIN_FOTO, `${h}: ni foto ni motivo en SIN_FOTO`).toBe(true);
    for (const [h, porque] of Object.entries(SIN_FOTO)) expect(porque.length, h).toBeGreaterThan(20);
  });

  it("y solo hay fotos de historias que existen", () => {
    for (const c of claves) expect(historias, c).toContain(c);
  });

  it("cada foto está en su carpeta, y en la carpeta no sobra ninguna", () => {
    const ficheros = fs.readdirSync(CARPETA).sort();
    expect(ficheros).toEqual(claves.map((c) => `${c}.webp`).sort());
    expect([...CON_FOTO].sort()).toEqual([...claves].sort());
  });

  it.each(claves.map((c) => [c]))(
    "%s es un WebP de 480 × 320 y de menos de sesenta kilobytes",
    (clave) => {
      const b = fs.readFileSync(`${CARPETA}/${clave}.webp`);
      expect(b.length, clave).toBeLessThan(60 * 1024);
      // Y de más de cuatro: por debajo, Vite la metería dentro del JavaScript.
      expect(b.length, clave).toBeGreaterThan(4 * 1024);
      expect(medidasDeWebp(b), clave).toEqual({
        ancho: TAMANO_DE_FOTO.ancho,
        alto: TAMANO_DE_FOTO.alto,
      });
    },
  );

  it.each(claves.map((c) => [c]))(
    "%s está en CREDITOS.md con su autor, su licencia y su página de Commons",
    (clave) => {
      const creditos = fs.readFileSync("CREDITOS.md", "utf8");
      const f = FOTOS[clave]!;
      const fila = creditos
        .split("\n")
        .find((l) => l.includes(`\`${CARPETA}/${clave}.webp\``));
      expect(fila, `falta \`${CARPETA}/${clave}.webp\` en CREDITOS.md`).toBeDefined();
      expect(fila).toContain(f.autor);
      expect(fila).toContain(f.licencia === "dominio público" ? "Dominio público" : f.licencia);
      expect(fila).toContain(f.pagina);
      // Y lo que se le hizo, que CC BY y CC BY-SA piden decirlo.
      expect(fila).toMatch(/recortada|recorte/i);
      expect(f.pagina).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    },
  );

  it.each(claves.map((c) => [c]))("%s tiene su texto alternativo, corto, en castellano y en inglés", (clave) => {
    const k = claveDelAlt(clave);
    for (const dicc of [ES_PY, EN] as Record<string, string>[]) {
      expect(dicc[k], k).toBeTruthy();
      expect(dicc[k]!.length, k).toBeLessThanOrEqual(70);
    }
  });

  it("la firma sale cuando la licencia la pide, y solo entonces", () => {
    for (const c of claves) {
      const f = FOTOS[c]!;
      const firma = firmaDe(c);
      if (pideFirma(f.licencia)) {
        expect(firma, c).toContain(f.autor);
        expect(firma, c).toContain(f.licencia);
      } else expect(firma, c).toBeNull();
    }
    expect(pideFirma("CC BY-SA 4.0")).toBe(true);
    expect(pideFirma("CC BY 2.0")).toBe(true);
    expect(pideFirma("CC0")).toBe(false);
    expect(pideFirma("dominio público")).toBe(false);
  });

  it("cada foto se encuentra por la clave de su historia, con su URL y su alt", () => {
    for (const c of claves) {
      const foto = fotoDeLaHistoria(c);
      expect(foto?.url, c).toMatch(new RegExp(`${c}\\.webp`));
      expect(foto?.alt, c).toBe(ES_PY[claveDelAlt(c) as keyof typeof ES_PY]);
    }
    expect(fotoDeLaHistoria("fuerteventura")).toBeNull();
  });
});
