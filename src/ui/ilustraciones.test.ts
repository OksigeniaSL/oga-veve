/**
 * **Las ilustraciones: cada una existe, pesa poco, lleva su crédito y no dice
 * de Ara lo que la escena no dice.**
 *
 * La regla octava de AGENTS.md —cada asset se anota en `CREDITOS.md` con su
 * licencia y su origen, antes de entrar— puesta donde se cumple sola: aquí no
 * entra una ilustración que no esté en su tabla. Y la del rendimiento: cada una
 * al doble de su hueco y no más, y por encima de cuatro kilobytes, que por
 * debajo Vite la metería dentro del JavaScript, en la precarga.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import {
  CON_FICHERO,
  claveDelAlt,
  DIBUJOS_CON_SU_HISTORIA,
  ilustracion,
  ilustracionDelDibujo,
  ilustracionesDelAvion,
  RECETAS,
  RETRATO_DE_JAZLYN,
  TAMANO_DEL_HUECO,
  tamanoDeLaReceta,
} from "./ilustraciones";
import { ilustracionDeLaHistoria } from "./ilustraciones-de-las-historias";
import { DIBUJOS_DEL_PASAJE } from "./dibujos-del-pasaje";
import { ESTA_HECHO } from "../flight/flota";
import { DICHO_DE_LA_LUZ } from "../flight/luz-verde";

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

const CARPETA = "src/assets/ilustraciones";
const claves = Object.keys(RECETAS);
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

/** Lo más que pesa una de cada hueco: el doble de su hueco, en WebP, no necesita más. */
const TOPE_KB = { lamina: 140, ventanita: 60, tarjeta: 40, retrato: 12, historia: 240, esquema: 240 } as const;

describe("las ilustraciones", () => {
  it("cada receta tiene su fichero, y en la carpeta no sobra ninguno", () => {
    expect(fs.readdirSync(CARPETA).sort()).toEqual(claves.map((c) => `${c}.webp`).sort());
    expect([...CON_FICHERO].sort()).toEqual([...claves].sort());
  });

  it.each(claves.map((c) => [c]))("%s: el recorte va en la proporción de su hueco", (clave) => {
    const r = RECETAS[clave]!;
    const { ancho, alto } = TAMANO_DEL_HUECO[r.hueco];
    const [, , w, h] = r.recorte;
    expect(Math.abs(w / h - ancho / alto), clave).toBeLessThan(0.01);
  });

  it.each(claves.map((c) => [c]))(
    "%s es un WebP del tamaño de su hueco —o del original, si es más pequeño—, ligero y sin metadatos",
    (clave) => {
      const r = RECETAS[clave]!;
      const b = fs.readFileSync(`${CARPETA}/${clave}.webp`);
      const tamano = tamanoDeLaReceta(r);
      expect(medidasDeWebp(b), clave).toEqual(tamano);
      // Nunca más grande que su hueco ni que el trozo del original que se coge.
      expect(tamano.ancho, clave).toBeLessThanOrEqual(Math.min(TAMANO_DEL_HUECO[r.hueco].ancho, r.recorte[2]));
      expect(b.length, clave).toBeLessThan(TOPE_KB[r.hueco] * 1024);
      expect(b.length, clave).toBeGreaterThan(4 * 1024);
      /*
       * Sin EXIF, sin XMP y sin perfil de color: lo que traen los originales
       * de la herramienta con que se hicieron no sale del taller, y el color
       * va en sRGB, que es lo que se supone sin perfil.
       */
      const trozos = trozosDeWebp(b);
      expect(trozos.length, clave).toBeGreaterThan(0);
      for (const t of ["EXIF", "XMP ", "ICCP"]) expect(trozos, `${clave}: ${t}`).not.toContain(t);
    },
  );

  it("el retrato va en redondo: con el fondo transparente", () => {
    const b = fs.readFileSync(`${CARPETA}/retrato-jazlyn.webp`);
    expect(trozosDeWebp(b)).toContain("ALPH");
    expect(RETRATO_DE_JAZLYN).toMatch(/retrato-jazlyn.*\.webp/);
  });

  it("todas están en CREDITOS.md, con su original y lo que se les hizo", () => {
    const creditos = fs.readFileSync("CREDITOS.md", "utf8");
    expect(creditos).toContain("Ilustraciones: Oksigenia SL, con licencia de uso de su proveedor");
    for (const clave of claves) {
      const r = RECETAS[clave]!;
      const fila = creditos.split("\n").find((l) => l.includes(`\`${CARPETA}/${clave}.webp\``));
      expect(fila, `falta \`${CARPETA}/${clave}.webp\` en CREDITOS.md`).toBeDefined();
      expect(fila, clave).toContain(`\`${r.original}\``);
      const { ancho, alto } = tamanoDeLaReceta(r);
      expect(fila, clave).toContain(`${ancho} × ${alto}`);
      // Y si se recortó por algo, el porqué; y si va volteada, que se diga.
      if (r.porque) expect(fila, clave).toContain(r.porque);
      if (r.espejo) expect(fila, clave).toContain("en espejo");
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
    expect(ilustracion(clave)?.alt).toBe(ES_PY[k as keyof typeof ES_PY]);
  });

  /*
   * **Ara no tiene género**, y lo que se escribe de sus dibujos tampoco: ni el
   * texto alternativo, en los dos idiomas, ni lo que dicen las recetas y el
   * módulo. La misma lista que mira `inicio-pasaje.test.ts`, y en inglés, los
   * pronombres. Se mira en todas las ilustraciones, no solo en las de Ara:
   * así no hay que acordarse de qué dibujo la lleva.
   */
  it("y nada de lo que se escribe de ellas dice si Ara es niño o niña", () => {
    // Con letras de verdad alrededor, no `\b`: la de JavaScript no sabe que «é» y «ñ» son letras.
    const conGenero =
      /(?<!\p{L})(hij[oa]s?|niñ[oa]s?|nen[ea]s?|chic[oa]s?|varón|solit[oa]s?|content[oa]s?|chiquit[oa]s?|sentad[oa]s?|pegad[oa]s?|arrodillad[oa]s?|asomad[oa]s?|abrochad[oa]s?|emocionad[oa]s?|dormid[oa]s?|despiert[oa]s?|tapad[oa]s?|pasajer[oa]|viajer[oa]|él|ella)(?!\p{L})/iu;
    const withGender = /\b(son|daughter|boy|girl|his|him|he|she|her|hers|himself|herself|lad|lass)\b/i;
    for (const clave of claves) {
      const k = claveDelAlt(clave) as keyof typeof ES_PY & keyof typeof EN;
      expect(ES_PY[k], k).not.toMatch(conGenero);
      expect(EN[k], k).not.toMatch(withGender);
    }
    for (const fichero of ["src/ui/ilustraciones.ts", "src/ui/ilustraciones-recetas.ts"])
      expect(fs.readFileSync(fichero, "utf8"), fichero).not.toMatch(conGenero);
    // Y las que llevan a Ara lo dicen, que es lo que esta prueba vigila.
    expect(claves.filter((c) => RECETAS[c]!.conAra)).toEqual([
      "pasaje-lleno",
      "pasaje-tripulante",
      "pasaje-ara-ventanilla",
      "ara-durmiendo",
      "ara-sonando",
      "oido",
    ]);
  });

  it("cada avión de la flota, por fuera y por dentro; y nada de lo que no es de la flota", () => {
    for (const id of ESTA_HECHO) {
      const d = ilustracionesDelAvion(id);
      expect(d?.fuera.url, id).toMatch(new RegExp(`fuera-${id}.*\\.webp`));
      expect(d?.cabina.url, id).toMatch(new RegExp(`cabina-${id}.*\\.webp`));
    }
    const deLaTarjeta = claves.filter((c) => RECETAS[c]!.hueco === "tarjeta");
    expect(deLaTarjeta.sort()).toEqual(ESTA_HECHO.flatMap((id) => [`fuera-${id}`, `cabina-${id}`]).sort());
    // El largo radio y el helicóptero no son de la flota: no tienen sitio.
    for (const c of claves) expect(RECETAS[c]!.original, c).not.toMatch(/largo-radio|helicoptero/);
    expect(ilustracionesDelAvion("guyrami")).toBeNull();
  });
});

/*
 * **Los esquemas de lo que se explica** (punto 311): en la lámina del pasaje,
 * la ilustración sale en lugar del dibujo hecho en código que tiene su misma
 * clave. Ver `ilustracionDelDibujo`.
 */
describe("los esquemas, en lugar de los dibujos", () => {
  const esquemas = claves.filter((c) => RECETAS[c]!.hueco === "esquema");

  it("cada esquema es el de un dibujo de la lámina, menos la torre de «Luz verde», que se pide aparte", () => {
    expect(esquemas.length).toBeGreaterThanOrEqual(8);
    for (const c of esquemas)
      if (c !== "torre-radio") expect(Object.keys(DIBUJOS_DEL_PASAJE), c).toContain(c);
    // Enteros: en 4:3, sin quitar nada más que lo justo para la proporción.
    for (const c of esquemas) {
      const [x, y] = RECETAS[c]!.recorte;
      expect(Math.max(x, y), c).toBeLessThanOrEqual(6);
    }
  });

  it("un dibujo con su esquema enseña la ilustración, con su texto; los demás siguen dibujados", () => {
    for (const clave of Object.keys(DIBUJOS_DEL_PASAJE)) {
      const i = ilustracionDelDibujo(clave);
      const conHistoria = DIBUJOS_CON_SU_HISTORIA[clave];
      if (esquemas.includes(clave)) {
        expect(i?.url, clave).toMatch(new RegExp(`${clave}.*\\.webp`));
        expect(i?.alt, clave).toBe(ES_PY[claveDelAlt(clave) as keyof typeof ES_PY]);
      } else if (conHistoria) {
        expect(i?.url, clave).toBe(ilustracionDeLaHistoria(conHistoria)?.url);
        expect(i?.alt, clave).toBeTruthy();
      } else expect(i, clave).toBeNull();
    }
    // Lo que imita una señal de verdad no se cambia por un dibujo de cuento.
    for (const clave of ["cinturon", "salidas", "papi", "ruta", "modo-avion"]) expect(ilustracionDelDibujo(clave), clave).toBeNull();
  });

  it("las islas con el Teide en corte, y los telescopios con el cielo de La Palma", () => {
    expect(DIBUJOS_CON_SU_HISTORIA).toEqual({ islas: "teide", estrellas: "taburiente" });
    for (const [dibujo, historia] of Object.entries(DIBUJOS_CON_SU_HISTORIA)) {
      expect(Object.keys(DIBUJOS_DEL_PASAJE), dibujo).toContain(dibujo);
      expect(ilustracionDeLaHistoria(historia), historia).not.toBeNull();
    }
  });

  it("y la torre hablando por radio sale cuando Ara cuenta que lo normal es la radio", () => {
    expect(DICHO_DE_LA_LUZ.radio.dibujo).toBe("ilustracion:torre-radio");
    expect(ilustracion("torre-radio")?.url).toMatch(/torre-radio.*\.webp/);
  });
});
