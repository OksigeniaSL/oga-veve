/**
 * **Las ilustraciones de las historias: cada una existe, pesa lo justo, está
 * anotada y no pierde en pequeño lo que cuenta.**
 *
 * La regla octava de AGENTS.md —cada asset se anota en `CREDITOS.md` con su
 * licencia y su origen, antes de entrar— puesta donde se cumple sola: aquí no
 * entra un fichero en `src/assets/historias/` que no tenga su receta y su fila
 * en la tabla de las ilustraciones. Y la del rendimiento: a 1280 × 960, que es
 * lo que pide la lámina grande del pasaje a densidad dos, y no más.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import {
  CON_ILUSTRACION,
  RECETAS_DE_LAS_HISTORIAS,
  SIN_ILUSTRACION,
  TAMANO_DE_LA_HISTORIA,
  claveDelAlt,
  ilustracionDeLaHistoria,
} from "./ilustraciones-de-las-historias";

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
};

const CARPETA = "src/assets/historias";
const claves = Object.keys(RECETAS_DE_LAS_HISTORIAS);
const historias = Object.keys(ES_PY)
  .map((k) => /^ventanilla\.historia\.(.+)$/.exec(k)?.[1])
  .filter((x): x is string => !!x);

const texto = (b: Uint8Array, i: number, n: number): string => String.fromCharCode(...b.slice(i, i + n));
const le32 = (b: Uint8Array, i: number): number => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24);

/** Los trozos de un WebP, por su nombre: `VP8 `, `VP8X`, `ALPH`, `EXIF`… */
function trozosDeWebp(b: Uint8Array): string[] {
  if (texto(b, 0, 4) !== "RIFF" || texto(b, 8, 4) !== "WEBP") return [];
  const trozos: string[] = [];
  for (let i = 12; i + 8 <= b.length; ) {
    trozos.push(texto(b, i, 4));
    const largo = le32(b, i + 4);
    i += 8 + largo + (largo % 2);
  }
  return trozos;
}

/** El ancho y el alto de un WebP, leídos de su cabecera. */
function medidasDeWebp(b: Uint8Array): { ancho: number; alto: number } | null {
  if (texto(b, 0, 4) !== "RIFF" || texto(b, 8, 4) !== "WEBP") return null;
  const trozo = texto(b, 12, 4);
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

/**
 * **Lo más que pesa una**, y entre todas. Hechas con la calidad de
 * `scripts/hacer-ilustraciones.mjs`, la que más pesa —el poblado guaraní, todo
 * hojas y lápiz— se queda en 190 KB, y las veinticinco en unos tres megas. Si
 * una nueva se pasa, antes de subir el tope hay que mirar por qué.
 */
const TOPE_KB = 240;
const TOPE_DE_TODAS_KB = 3600;

describe("las ilustraciones de las historias", () => {
  it("cada historia tiene la suya, o está apuntada sin ella con su motivo", () => {
    for (const h of historias)
      expect(h in RECETAS_DE_LAS_HISTORIAS || h in SIN_ILUSTRACION, `${h}: ni ilustración ni motivo en SIN_ILUSTRACION`).toBe(
        true,
      );
    for (const [h, porque] of Object.entries(SIN_ILUSTRACION)) expect(porque.length, h).toBeGreaterThan(20);
  });

  it("y solo hay ilustraciones de historias que existen", () => {
    for (const c of claves) expect(historias, c).toContain(c);
  });

  it("cada una está en su carpeta, y en la carpeta no sobra ninguna", () => {
    const ficheros = fs.readdirSync(CARPETA).sort();
    expect(ficheros).toEqual(claves.map((c) => `${c}.webp`).sort());
    expect([...CON_ILUSTRACION].sort()).toEqual([...claves].sort());
  });

  it.each(claves.map((c) => [c]))("%s sale entera de su original, en 4:3", (clave) => {
    const r = RECETAS_DE_LAS_HISTORIAS[clave]!;
    expect(r.original).toBe(`historias/${clave}.jpeg`);
    expect(r.hueco).toBe("historia");
    const [, , w, h] = r.recorte;
    expect(Math.abs(w / h - 4 / 3), clave).toBeLessThan(0.01);
    expect(TAMANO_DE_LA_HISTORIA).toEqual({ ancho: 1280, alto: 960 });
  });

  it.each(claves.map((c) => [c]))("%s es un WebP de 1280 × 960, ligero y sin metadatos", (clave) => {
    const b = fs.readFileSync(`${CARPETA}/${clave}.webp`);
    expect(medidasDeWebp(b), clave).toEqual(TAMANO_DE_LA_HISTORIA);
    expect(b.length, clave).toBeLessThan(TOPE_KB * 1024);
    // Y de más de cuatro: por debajo, Vite la metería dentro del JavaScript.
    expect(b.length, clave).toBeGreaterThan(4 * 1024);
    // Sin EXIF, sin XMP y sin perfil de color: lo del taller no sale del taller.
    const trozos = trozosDeWebp(b);
    expect(trozos.length, clave).toBeGreaterThan(0);
    for (const t of ["EXIF", "XMP ", "ICCP"]) expect(trozos, `${clave}: ${t}`).not.toContain(t);
  });

  it("y entre todas, unos tres megas: se bajan de una en una, cuando se cuentan", () => {
    const total = claves.reduce((s, c) => s + fs.readFileSync(`${CARPETA}/${c}.webp`).length, 0);
    expect(total).toBeLessThan(TOPE_DE_TODAS_KB * 1024);
  });

  /*
   * **Anotadas, y como lo que son.** Cada una con su fila en la tabla de las
   * ilustraciones de `CREDITOS.md`, con su original y su tamaño, debajo de la
   * línea que dice de quién son. Y ni rastro de las fotos de Wikimedia Commons
   * que había antes en esos mismos ficheros: una fila vieja que se quedara
   * diría de un dibujo nuestro que es la foto de otra persona.
   */
  it("todas están en CREDITOS.md, con su original y lo que se les hizo", () => {
    const creditos = fs.readFileSync("CREDITOS.md", "utf8");
    expect(creditos).toContain("Ilustraciones: Oksigenia SL, con licencia de uso de su proveedor");
    const filas = creditos.split("\n").filter((l) => l.startsWith("|") && l.includes(`\`${CARPETA}/`));
    expect(filas).toHaveLength(claves.length);
    for (const clave of claves) {
      const r = RECETAS_DE_LAS_HISTORIAS[clave]!;
      const fila = filas.find((l) => l.includes(`\`${CARPETA}/${clave}.webp\``));
      expect(fila, `falta \`${CARPETA}/${clave}.webp\` en CREDITOS.md`).toBeDefined();
      expect(fila, clave).toContain(`\`${r.original}\``);
      expect(fila, clave).toContain("1280 × 960");
      expect(fila, clave).not.toMatch(/commons|wikimedia|CC BY|CC0|dominio público/i);
    }
  });

  it.each(claves.map((c) => [c]))("%s tiene su texto alternativo, corto, en castellano y en inglés", (clave) => {
    const k = claveDelAlt(clave);
    for (const dicc of [ES_PY, EN] as Record<string, string>[]) {
      expect(dicc[k], k).toBeTruthy();
      expect(dicc[k]!.length, k).toBeLessThanOrEqual(80);
      // Va dentro de un atributo: sin comillas dobles.
      expect(dicc[k], k).not.toContain('"');
    }
  });

  /*
   * **El foco, solo donde hace falta y con su porqué.** Uno puesto sin motivo
   * es una ilustración recortada por donde nadie decidió.
   */
  it("cada foco va de 0 a 1 y dice qué se perdía centrada", () => {
    for (const c of claves) {
      const f = RECETAS_DE_LAS_HISTORIAS[c]!.foco;
      if (!f) continue;
      expect(f.y, c).toBeGreaterThanOrEqual(0);
      expect(f.y, c).toBeLessThanOrEqual(1);
      expect(f.y, c).not.toBe(0.5);
      expect(f.porque.length, c).toBeGreaterThan(30);
    }
  });

  it("cada una se encuentra por la clave de su historia, con su URL, su alt y su foco", () => {
    for (const c of claves) {
      const i = ilustracionDeLaHistoria(c);
      expect(i?.url, c).toMatch(new RegExp(`${c}.*\\.webp`));
      expect(i?.alt, c).toBe(ES_PY[claveDelAlt(c) as keyof typeof ES_PY]);
      expect(i?.foco, c).toBe(RECETAS_DE_LAS_HISTORIAS[c]!.foco?.y ?? 0.5);
    }
    expect(ilustracionDeLaHistoria("nieves")?.foco).toBe(0);
    expect(ilustracionDeLaHistoria("fuerteventura")).toBeNull();
  });
});
