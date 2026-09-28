/**
 * Lo que la compilación escribe fuera del paquete, **donde Vite dice**.
 *
 * Dos complementos de `vite.config.ts` escriben por su cuenta: el pack de voz
 * se copia tal cual y el trabajador de servicio se escribe al cerrar. Los dos
 * llevaban `dist/` escrito a mano, así que `vite build --outDir otra` dejaba
 * el juego en `otra/` y las voces y el `sw.js` en `dist/`: un despliegue mudo
 * y con el trabajador de servicio de otra compilación, sin un solo error.
 *
 * Se prueba llamando a los dos complementos como los llama Vite —primero
 * `configResolved`, luego `closeBundle`— con una carpeta de salida que no es
 * `dist/`, y mirando dónde acaba cada cosa.
 */
import { afterEach, describe, expect, it } from "vitest";
import type { Plugin } from "vite";

/*
 * **El `fs` de Node pedido en marcha**, como en `flaps-del-modelo.test.ts`:
 * importarlo por su nombre obligaría a meter los tipos de Node en el
 * `tsconfig`. Y la configuración de Vite se trae igual, por una ruta que el
 * compilador no sigue: ella sí usa Node, y seguirla metería sus tipos en el
 * programa entero.
 */
const nodo = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown; cwd(): string };
  }
).process;
const fs = nodo.getBuiltinModule("node:fs") as {
  existsSync(ruta: string): boolean;
  mkdtempSync(prefijo: string): string;
  readdirSync(ruta: string, o: { recursive: true }): string[];
  rmSync(ruta: string, o: { recursive: true; force: true }): void;
};
const os = nodo.getBuiltinModule("node:os") as { tmpdir(): string };
const path = nodo.getBuiltinModule("node:path") as {
  join(...partes: string[]): string;
};
const { existsSync, mkdtempSync, readdirSync, rmSync } = fs;
const { join } = path;
const tmpdir = os.tmpdir;

// Vitest corre desde la raíz del proyecto, que es también la de Vite.
const RAIZ = nodo.cwd();
const RUTA_DE_LA_CONFIGURACION = "../vite.config";
const config = (
  (await import(/* @vite-ignore */ RUTA_DE_LA_CONFIGURACION)) as {
    default: { plugins?: unknown[] };
  }
).default;

function complemento(nombre: string): Plugin {
  const lista = (config.plugins ?? []).flat() as Plugin[];
  const p = lista.find((x) => x && x.name === nombre);
  if (!p) throw new Error(`no hay complemento ${nombre}`);
  return p;
}

/** Llama a un gancho de Vite, venga como función o como objeto con `handler`. */
async function llamar(gancho: unknown, ...args: unknown[]): Promise<void> {
  const f =
    typeof gancho === "function"
      ? gancho
      : (gancho as { handler: (...a: unknown[]) => unknown }).handler;
  await f.apply({}, args);
}

const creadas: string[] = [];
afterEach(() => {
  for (const c of creadas.splice(0)) rmSync(c, { recursive: true, force: true });
});

describe("la compilación escribe en la carpeta que se le pide", () => {
  it("el pack de voz y el sw.js van a --outDir, no a dist/", async () => {
    const salida = mkdtempSync(join(tmpdir(), "oga-outdir-"));
    creadas.push(salida);
    const resuelta = { root: RAIZ, build: { outDir: salida } };
    const dist = join(RAIZ, "dist");
    const habiaDist = existsSync(dist);

    const voz = complemento("pack-de-voz");
    const sw = complemento("hacer-sw");
    await llamar(voz.configResolved, resuelta);
    await llamar(sw.configResolved, resuelta);
    await llamar(voz.closeBundle);
    await llamar(sw.closeBundle);

    const enElRepo = readdirSync(join(RAIZ, "data/voces"), {
      recursive: true,
    }).filter((f: string) => /\.(ogg|m4a|json)$/.test(f)).length;
    const enLaSalida = readdirSync(join(salida, "data/voces"), {
      recursive: true,
    }).filter((f: string) => /\.(ogg|m4a|json)$/.test(f)).length;
    expect(enLaSalida).toBe(enElRepo);
    expect(existsSync(join(salida, "sw.js"))).toBe(true);
    // Y en dist/ no aparece nada que no estuviera.
    if (!habiaDist) expect(existsSync(dist)).toBe(false);
  }, 60_000);

  it("una carpeta relativa se cuenta desde la raíz del proyecto, como hace Vite", async () => {
    const salida = mkdtempSync(join(RAIZ, ".oga-outdir-"));
    creadas.push(salida);
    const voz = complemento("pack-de-voz");
    await llamar(voz.configResolved, {
      root: RAIZ,
      build: { outDir: salida.slice(RAIZ.length + 1) },
    });
    await llamar(voz.closeBundle);
    expect(existsSync(join(salida, "data/voces"))).toBe(true);
  }, 60_000);
});
