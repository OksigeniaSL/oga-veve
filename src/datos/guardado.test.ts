/**
 * El guardado, que es lo único de aquí que no se puede arreglar después.
 *
 * El código se reescribe; las horas de alguien, no. Así que lo que se
 * comprueba aquí no es que funcione en el caso bueno —eso se ve jugando—,
 * sino los tres casos malos: **que las trece claves sueltas de antes lleguen
 * enteras**, que un dato corrupto no impida jugar y no se borre, y que lo
 * guardado quepa en el presupuesto.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CUANTOS_VUELOS, PUNTOS_DE_TRAZA } from "../flight/bitacora";

import {
  CLAVES_VIEJAS,
  ESPERA_DE_ESCRITURA,
  LLAVE,
  LLAVE_COPIA,
  LLAVE_ROTA,
  PRESUPUESTO_KB,
  VERSION,
  escribirYa,
  guardadoNuevo,
  leerAjuste,
  leerGuardado,
  leerProgreso,
  migrarDeClavesSueltas,
  olvidar,
  ponerAjuste,
  ponerProgreso,
  subirDeVersion,
  tamanoKB,
} from "./guardado";

/** Un `localStorage` de mentira, en diez líneas. Ver `bitacora.test.ts`. */
const memoria = new Map<string, string>();
const almacen: Storage = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => void memoria.set(k, String(v)),
  removeItem: (k) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};
vi.stubGlobal("localStorage", almacen);

/**
 * Lo que había de verdad en el navegador antes de esto.
 *
 * No es un ejemplo inventado: son las trece claves con la forma exacta que
 * escribían `cuaderno.ts`, `bitacora.ts`, `keymap.ts`, `audio.ts`, `mundo.ts`,
 * `hangar.ts`, `tiers.ts`, `lecciones.ts`, `i18n` y `game.ts`. Una migración
 * probada contra un formato inventado no prueba nada.
 */
const FORMATO_VIEJO: Record<string, string> = {
  "oga-veve:escenario": "tenerife-norte",
  "oga-veve:leccion": "aterrizaje",
  "oga-veve:tramo": "guyrami",
  "oga-veve:idioma": "es-PY",
  "oga-veve:volumen": "bajo",
  "oga-veve:vista": "cockpit",
  "oga-veve:mundo": "dibujado",
  "oga-veve:mano": "izquierda",
  "oga-veve:teclas": '{"camera":"KeyJ","brakes":"Space"}',
  "oga-veve:teclas-vistas": "1",
  "oga-veve:recientes": '["pettirossi","yvytu-rape"]',
  "oga-veve:cuaderno":
    '{"segundos":4210,"despegues":9,"aterrizajes":7,"frustradas":2,' +
    '"completos":5,"percances":1,"aerodromos":["SGAS","GCXO"]}',
  "oga-veve:bitacora":
    '[{"fecha":"2026-09-01T10:00:00.000Z","escenario":"pettirossi",' +
    '"leccion":"aterrizaje","tramo":"tukã","segundos":412,' +
    '"galones":["suave","eje"],"traza":[[0,0],[10,20]]}]',
};

beforeEach(() => {
  memoria.clear();
  olvidar();
});

describe("la migración de las trece claves sueltas", () => {
  it("no deja ni una atrás", () => {
    const g = migrarDeClavesSueltas((k) => FORMATO_VIEJO[k] ?? null);
    const p = g.perfiles[0]!;
    for (const llave of CLAVES_VIEJAS.ajustes) {
      expect(p.ajustes).toHaveProperty(llave.replace("oga-veve:", ""));
    }
    for (const llave of CLAVES_VIEJAS.progreso) {
      expect(p.progreso).toHaveProperty(llave.replace("oga-veve:", ""));
    }
  });

  it("conserva las horas voladas, que es lo que de verdad importa", () => {
    const g = migrarDeClavesSueltas((k) => FORMATO_VIEJO[k] ?? null);
    const cuaderno = g.perfiles[0]!.progreso["cuaderno"] as {
      segundos: number;
      aerodromos: string[];
    };
    expect(cuaderno.segundos).toBe(4210);
    expect(cuaderno.aerodromos).toEqual(["SGAS", "GCXO"]);
  });

  it("y la bitácora entera, con su traza", () => {
    const g = migrarDeClavesSueltas((k) => FORMATO_VIEJO[k] ?? null);
    const vuelos = g.perfiles[0]!.progreso["bitacora"] as { traza: number[][] }[];
    expect(vuelos).toHaveLength(1);
    expect(vuelos[0]!.traza).toEqual([
      [0, 0],
      [10, 20],
    ]);
  });

  it("distingue lo que era JSON de lo que era una cadena suelta", () => {
    // `oga-veve:vista` guardaba «cockpit» a pelo y `oga-veve:teclas` un
    // objeto. Meter los dos por el mismo sitio sin mirar dejaba uno roto.
    const g = migrarDeClavesSueltas((k) => FORMATO_VIEJO[k] ?? null);
    const a = g.perfiles[0]!.ajustes;
    expect(a["vista"]).toBe("cockpit");
    expect(a["teclas"]).toEqual({ camera: "KeyJ", brakes: "Space" });
  });

  it("con el navegador vacío, un guardado limpio y no un error", () => {
    const g = migrarDeClavesSueltas(() => null);
    expect(g.version).toBe(VERSION);
    expect(g.perfiles).toHaveLength(1);
    expect(g.perfiles[0]!.ajustes).toEqual({});
  });
});

describe("al abrir el juego", () => {
  it("migra lo viejo, deja copia y retira las claves de antes", () => {
    for (const [k, v] of Object.entries(FORMATO_VIEJO)) memoria.set(k, v);
    expect(leerAjuste("escenario")).toBe("tenerife-norte");
    escribirYa();

    // La copia está, entera y sin tocar: si la migración estuvo mal, los
    // datos siguen ahí.
    const copia = JSON.parse(memoria.get(LLAVE_COPIA)!) as Record<string, string>;
    expect(copia["oga-veve:cuaderno"]).toBe(FORMATO_VIEJO["oga-veve:cuaderno"]);
    // Y las claves sueltas ya no están: manda el documento.
    expect(memoria.has("oga-veve:cuaderno")).toBe(false);
    expect(memoria.has(LLAVE)).toBe(true);
  });

  it("un guardado corrupto no impide jugar, y no se borra", () => {
    memoria.set(LLAVE, "{esto no es json,,,");
    const g = leerGuardado();
    expect(g.version).toBe(VERSION);
    expect(g.perfiles).toHaveLength(1);
    // Apartado, no borrado: es la única forma de recuperar unas horas si el
    // fallo fue nuestro.
    expect(memoria.get(LLAVE_ROTA)).toBe("{esto no es json,,,");
  });

  it("y algo con la forma equivocada, tampoco", () => {
    memoria.set(LLAVE, '{"version":1,"perfiles":"no soy una lista"}');
    expect(leerGuardado().perfiles).toHaveLength(1);
    expect(memoria.has(LLAVE_ROTA)).toBe(true);
  });

  it("un guardado de una versión más nueva no se toca", () => {
    // Alguien abrió una versión nueva del juego y volvió a esta. Migrar
    // hacia atrás sería inventarse datos, así que se deja como está.
    const futuro = { ...guardadoNuevo(), version: VERSION + 7 };
    expect(subirDeVersion(futuro).version).toBe(VERSION + 7);
  });
});

/**
 * La primera migración de verdad, con un guardado de la versión 1 congelado.
 *
 * Y congelado quiere decir eso: este objeto es una foto de lo que escribía el
 * juego el día que la versión 1 era la de hoy. No se actualiza cuando cambie
 * el formato — si se actualizara, dejaría de probar la migración y pasaría a
 * probar el presente contra sí mismo.
 */
const VERSION_1 = {
  version: 1,
  activo: "p-viejo",
  perfiles: [
    {
      id: "p-viejo",
      avatar: "🐦",
      ajustes: { vista: "cockpit", tramo: "taguato" },
      progreso: {
        cuaderno: { segundos: 7200, despegues: 14, aterrizajes: 11 },
        bitacora: [{ fecha: "2026-09-01T10:00:00.000Z", segundos: 400 }],
      },
    },
  ],
};

describe("del formato 1 al 2: el emoji pasa a ser un avión", () => {
  it("sube de versión sin tocar lo que había dentro", () => {
    memoria.set(LLAVE, JSON.stringify(VERSION_1));
    const g = leerGuardado();
    expect(g.version).toBe(VERSION);
    const p = g.perfiles[0]!;
    // Lo que importa: las horas siguen ahí.
    expect((p.progreso["cuaderno"] as { segundos: number }).segundos).toBe(7200);
    expect(p.ajustes["vista"]).toBe("cockpit");
    expect(p.id).toBe("p-viejo");
    expect(g.activo).toBe("p-viejo");
  });

  it("y el pájaro se convierte en un bicho de verdad, con su color", () => {
    memoria.set(LLAVE, JSON.stringify(VERSION_1));
    const p = leerGuardado().perfiles[0]!;
    expect(p.avatar).not.toBe("🐦");
    expect(["tero", "jaguarete", "karumbe", "mburucuya"]).toContain(p.avatar);
    expect(p.color).toBeTruthy();
  });

  it("y deja copia antes de tocar nada", () => {
    memoria.set(LLAVE, JSON.stringify(VERSION_1));
    leerGuardado();
    escribirYa();
    // Si la migración estuviera mal, el original sigue ahí.
    expect(JSON.parse(memoria.get(LLAVE_COPIA)!).version).toBe(1);
  });

  it("dos perfiles viejos no acaban con el mismo avión", () => {
    memoria.set(
      LLAVE,
      JSON.stringify({
        ...VERSION_1,
        perfiles: [
          { ...VERSION_1.perfiles[0], id: "a" },
          { ...VERSION_1.perfiles[0], id: "b" },
          { ...VERSION_1.perfiles[0], id: "c" },
        ],
      }),
    );
    const suyos = leerGuardado().perfiles.map((p) => `${p.avatar}|${p.color}`);
    expect(new Set(suyos).size).toBe(3);
  });
});

describe("leer y escribir", () => {
  it("lo que se pone se lee", () => {
    ponerAjuste("vista", "pajaro");
    ponerProgreso("cuaderno", { segundos: 10 });
    expect(leerAjuste("vista")).toBe("pajaro");
    expect(leerProgreso("cuaderno")).toEqual({ segundos: 10 });
  });

  it("y sobrevive a cerrar el juego", () => {
    ponerAjuste("tramo", "taguato");
    escribirYa();
    olvidar();
    expect(leerAjuste("tramo")).toBe("taguato");
  });

  it("no escribe una vez por cambio", async () => {
    // Quien mueve el mando de la hora dispara treinta cambios en dos
    // segundos, y cada escritura es síncrona y en el hilo que dibuja.
    leerGuardado();
    escribirYa();
    memoria.delete(LLAVE);
    for (let i = 0; i < 30; i++) ponerAjuste("hora", i);
    expect(memoria.has(LLAVE)).toBe(false);
    await new Promise((r) => setTimeout(r, ESPERA_DE_ESCRITURA + 60));
    expect(memoria.has(LLAVE)).toBe(true);
    expect(leerAjuste("hora")).toBe(29);
  });

  it("un ajuste que nunca se puso no existe, y eso no es un error", () => {
    expect(leerAjuste("loquesea")).toBeUndefined();
  });
});

describe("el presupuesto", () => {
  it("un guardado lleno hasta arriba cabe en cien kilobytes", () => {
    /*
     * El caso peor de verdad: sesenta vuelos —el tope de la bitácora— con
     * ciento veinte puntos de traza cada uno, que es el otro tope. Si esto no
     * cupiera, habría que bajar uno de los dos números, y más vale saberlo
     * aquí que cuando a alguien empiecen a fallar las escrituras.
     */
    // Los topes de verdad, no dos números copiados: si alguien sube uno de
    // los dos, esta prueba se entera el mismo día.
    const traza = Array.from({ length: PUNTOS_DE_TRAZA }, (_, i) => [
      i * 137,
      -i * 241,
    ]);
    const vuelos = Array.from({ length: CUANTOS_VUELOS }, (_, i) => ({
      fecha: `2026-09-0${(i % 9) + 1}T10:00:00.000Z`,
      escenario: "tenerife-norte",
      leccion: "aterrizaje",
      tramo: "taguato-ruvicha",
      segundos: 1234,
      galones: ["suave", "eje", "senda", "puntual"],
      traza,
    }));
    ponerProgreso("bitacora", vuelos);
    ponerProgreso("cuaderno", { segundos: 99999, aerodromos: ["SGAS"] });
    expect(tamanoKB()).toBeLessThan(PRESUPUESTO_KB);
  });
});
