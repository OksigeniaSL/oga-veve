import { afterEach, describe, expect, it, vi } from "vitest";

/** Un `localStorage` de mentira. Ver `datos/guardado.test.ts`. */
function almacenDeMentira(): { almacen: Storage; memoria: Map<string, string> } {
  const memoria = new Map<string, string>();
  return {
    memoria,
    almacen: {
      getItem: (k) => memoria.get(k) ?? null,
      setItem: (k, v) => void memoria.set(k, String(v)),
      removeItem: (k) => void memoria.delete(k),
      clear: () => memoria.clear(),
      key: (i) => [...memoria.keys()][i] ?? null,
      get length() {
        return memoria.size;
      },
    },
  };
}

/** El módulo de nuevo, con el guardado sin nada en memoria: el guardado lo guarda por módulo. */
async function deNuevo(): Promise<typeof import("./capitulos-hechos")> {
  vi.resetModules();
  return import("./capitulos-hechos");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("los capítulos del viaje largo que ya se acabaron", () => {
  it("se apuntan una vez cada uno, se leen después y se guardan en el acto", async () => {
    const { almacen, memoria } = almacenDeMentira();
    vi.stubGlobal("localStorage", almacen);
    const m = await deNuevo();
    expect([...m.capitulosHechos()]).toEqual([]);
    m.apuntarCapituloHecho(3);
    m.apuntarCapituloHecho(1);
    m.apuntarCapituloHecho(3);
    expect([...m.capitulosHechos()].sort()).toEqual([1, 3]);
    // Escrito ya, sin esperar al freno: el final del primero recarga la página enseguida.
    const escrito = memoria.get("oga-veve:guardado") ?? "";
    expect(escrito).toContain('"capitulosDelLargo":[1,3]');
  });

  it("y siguen ahí en la siguiente carga, por perfil y sin nada de quien juega", async () => {
    const { almacen, memoria } = almacenDeMentira();
    vi.stubGlobal("localStorage", almacen);
    (await deNuevo()).apuntarCapituloHecho(2);
    const otra = await deNuevo();
    expect([...otra.capitulosHechos()]).toEqual([2]);
    const doc = JSON.parse(memoria.get("oga-veve:guardado") ?? "{}") as { perfiles: { progreso: Record<string, unknown> }[] };
    expect(doc.perfiles[0]?.progreso.capitulosDelLargo).toEqual([2]);
  });

  it("lo que no es un capítulo, guardado a mano o roto, no cuenta", async () => {
    const { almacen } = almacenDeMentira();
    vi.stubGlobal("localStorage", almacen);
    const m = await deNuevo();
    const { ponerProgreso } = await import("../datos/guardado");
    ponerProgreso("capitulosDelLargo", [1, "2", 4, null, 3]);
    expect([...m.capitulosHechos()].sort()).toEqual([1, 3]);
    ponerProgreso("capitulosDelLargo", "todos");
    expect([...m.capitulosHechos()]).toEqual([]);
  });

  it("sin almacenamiento, o con uno que no deja, se juega igual", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    const m = await deNuevo();
    expect(() => m.apuntarCapituloHecho(1)).not.toThrow();
    expect(m.capitulosHechos().has(2)).toBe(false);
  });
});
