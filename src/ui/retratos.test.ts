/**
 * Que los retratos del hangar sean los del avión de hoy.
 *
 * Un retrato es una foto hecha de antemano (`npm run retratos`), y una foto no
 * se entera de que el avión cambió: se toca un color en la ficha o se rehace
 * un `.glb`, y el hangar sigue enseñando el de antes — prometiendo un avión
 * que luego no es. El guion guarda al lado de cada imagen de qué salió —su
 * modelo, su ficha y la librea que la vistió— y aquí se compara con lo que
 * hay ahora.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import huellas from "./retratos-huellas.json";
import { CARPETA_DE_RETRATOS, TAMANO_DE_RETRATO, retratoDe } from "./retratos";

/*
 * `fs` y `crypto` de Node, pedidos en marcha: ver `flaps-del-modelo.test.ts`,
 * que explica por qué no se importan por su nombre.
 */
const pedir = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule;
const fs = pedir("node:fs") as {
  existsSync(ruta: string): boolean;
  readFileSync(ruta: string): Uint8Array;
  readdirSync(ruta: string): string[];
};
const crypto = pedir("node:crypto") as {
  createHash(algo: string): {
    update(datos: Uint8Array): { digest(como: "hex"): string };
  };
};
const sha = (ruta: string): string =>
  crypto.createHash("sha256").update(fs.readFileSync(ruta)).digest("hex");

const CON_MODELO = AIRCRAFT.filter((a) =>
  fs.existsSync(`public/assets/aeronaves/${a.id}.glb`),
);
const HUELLAS = huellas as Record<
  string,
  { glb: string; librea: string; ficha: unknown; retrato?: string }
>;
/** El fichero del retrato de un avión, como lo pide el hangar. */
const fichero = (id: string): string =>
  `public/${CARPETA_DE_RETRATOS}/${HUELLAS[id]?.retrato ?? `${id}.webp`}`;
const REHACER = "rehacelos con `npm run retratos`";

describe("los retratos de la flota", () => {
  it("hay uno por cada avión que tiene modelo", () => {
    expect(CON_MODELO.length).toBeGreaterThan(0);
    for (const a of CON_MODELO) {
      expect(HUELLAS[a.id], `${a.id}: sin huella; ${REHACER}`).toBeDefined();
      expect(fs.existsSync(fichero(a.id)), fichero(a.id)).toBe(true);
    }
  });

  /*
   * **Y con la huella de la imagen en el nombre**, que es lo que impide que
   * una caché enseñe el de antes. Con el retrato nuevo del JAZ 120 en el
   * servidor, Enrique seguía viendo en «¿Con qué volás?» el viejo, de puntas
   * rectas y sin terracota: se llamaba igual, y el navegador, Cloudflare y el
   * service worker guardan por nombre. Ver `ui/retratos.ts`.
   */
  it("llevan en el nombre la huella de su imagen, y el hangar pide ése", () => {
    for (const a of CON_MODELO) {
      const nombre = HUELLAS[a.id]?.retrato ?? "";
      expect(nombre, `${a.id}: sin nombre con huella; ${REHACER}`).toMatch(
        new RegExp(`^${a.id}-[0-9a-f]{8}\\.webp$`),
      );
      expect(sha(fichero(a.id)).slice(0, 8), `${nombre}: la imagen no es la de su nombre`).toBe(
        nombre.slice(a.id.length + 1, a.id.length + 9),
      );
      expect(retratoDe(a.id).endsWith(`/${CARPETA_DE_RETRATOS}/${nombre}`), a.id).toBe(true);
    }
  });

  it("y no queda ninguno de antes en la carpeta", () => {
    const pedidos = new Set(CON_MODELO.map((a) => HUELLAS[a.id]?.retrato));
    const sobran = fs
      .readdirSync(`public/${CARPETA_DE_RETRATOS}`)
      .filter((f) => !pedidos.has(f));
    expect(sobran).toEqual([]);
  });

  it("son del modelo de hoy", () => {
    for (const a of CON_MODELO)
      expect(
        HUELLAS[a.id]?.glb,
        `${a.id}.glb cambió y su retrato no; ${REHACER}`,
      ).toBe(sha(`public/assets/aeronaves/${a.id}.glb`));
  });

  it("llevan los colores de su ficha de hoy", () => {
    for (const a of CON_MODELO)
      expect(
        HUELLAS[a.id]?.ficha,
        `la ficha del ${a.id} cambió y su retrato no; ${REHACER}`,
      ).toEqual(a.appearance);
  });

  it("y la librea de hoy", () => {
    const librea = sha("src/world/librea.ts");
    for (const a of CON_MODELO)
      expect(
        HUELLAS[a.id]?.librea,
        `librea.ts cambió y el retrato del ${a.id} no; ${REHACER}`,
      ).toBe(librea);
  });

  /*
   * Y que sigan siendo lo que el hangar espera: WebP con el fondo
   * transparente —la tarjeta pone el suyo— y del tamaño de siempre, que es
   * el que dice el `<img>` para reservar el hueco antes de que llegue.
   */
  it("son WebP transparentes, del tamaño que espera la tarjeta y ligeros", () => {
    for (const a of CON_MODELO) {
      const b = fs.readFileSync(fichero(a.id));
      const texto = (desde: number, hasta: number): string =>
        String.fromCharCode(...b.subarray(desde, hasta));
      expect(texto(0, 4) + texto(8, 12), a.id).toBe("RIFFWEBP");
      // Con transparencia, el primer trozo es el extendido: `VP8X`, con la
      // marca de alfa y el tamaño del lienzo.
      expect(texto(12, 16), `${a.id}: sin transparencia`).toBe("VP8X");
      expect((b[20]! & 0x10) !== 0, `${a.id}: sin alfa`).toBe(true);
      const ancho = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16));
      const alto = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16));
      expect([ancho, alto], a.id).toEqual([
        TAMANO_DE_RETRATO.ancho,
        TAMANO_DE_RETRATO.alto,
      ]);
      // Decenas de kilobytes: el hangar se abre en un teléfono con 3G.
      expect(b.length, a.id).toBeLessThan(80 * 1024);
    }
  });
});
