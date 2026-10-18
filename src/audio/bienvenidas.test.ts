/**
 * Que la bienvenida de Jazlyn sea siempre distinta y siempre de verdad: nunca
 * la misma dos vuelos seguidos, y todas con lo que dice una comandante al
 * saludar —quién habla, a dónde se va, cuánto dura, a qué altura y qué tiempo
 * hace allá—.
 */
import { describe, expect, it } from "vitest";
import { hayTexto, t, type TranslationKey } from "../i18n";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { TIEMPO_DE_CASA, type Meteo } from "../world/meteo";
import { recetaDe, type Manifiesto } from "./banco-de-voz";
import {
  FORMAS_DE_BIENVENIDA,
  SALUDOS_CON_GRACIA,
  formasQueCaben,
  horaDelSaludo,
  laBienvenida,
  piezasDe,
  type FormaDeBienvenida,
  type ParaLaBienvenida,
} from "./bienvenidas";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, cod: string): string;
};

const manifiesto = JSON.parse(
  fs.readFileSync("data/voces/comandante/manifiesto.json", "utf8"),
) as Manifiesto;

/** Lo que está grabado de verdad, por su receta en el pack. */
const grabadaHoy = (id: string): boolean => !!manifiesto.recetas[id];
/**
 * Y el pack de antes de grabar lo nuevo: lo de hoy sin las piezas de las
 * formas nuevas. Así estas pruebas valen igual el día que se graben.
 */
const LO_NUEVO = /^comandante\.bienvenida\.(?:saludo|gracia|a|detalle|cierre)\./;
const sinLoNuevo = (id: string): boolean => !LO_NUEVO.test(id) && grabadaHoy(id);
/** Y el día que se grabe todo lo nuevo. */
const todoGrabado = (): boolean => true;

/** Los destinos con su bienvenida de siempre. */
const DESTINOS = [
  "pettirossi",
  "guarani",
  "encarnacion",
  "concepcion",
  "pedro-juan",
  "estigarribia",
  "ayolas",
  "pilar",
  "yvytu-rape",
  "tenerife-norte",
  "tenerife-sur",
  "gran-canaria",
  "lanzarote",
  "fuerteventura",
  "la-palma",
  "el-hierro",
  "la-gomera",
];

/** Cómo se nombra cada destino en voz alta. */
const NOMBRE: Record<string, string> = {
  pettirossi: "Asunción",
  guarani: "Ciudad del Este",
  encarnacion: "Encarnación",
  concepcion: "Concepción",
  "pedro-juan": "Pedro Juan Caballero",
  estigarribia: "Mariscal Estigarribia",
  ayolas: "Ayolas",
  pilar: "Pilar",
  "yvytu-rape": "Yvytu Rape",
  "tenerife-norte": "Tenerife Norte",
  "tenerife-sur": "Tenerife Sur",
  "gran-canaria": "Gran Canaria",
  lanzarote: "Lanzarote",
  fuerteventura: "Fuerteventura",
  "la-palma": "La Palma",
  "el-hierro": "El Hierro",
  "la-gomera": "La Gomera",
};

const alla: Meteo = { ...TIEMPO_DE_CASA, temp: 24 };

const vuelo = (extra: Partial<ParaLaBienvenida> = {}): ParaLaBienvenida => ({
  salidaId: "tenerife-norte",
  destinoId: "lanzarote",
  hora: "tardes",
  segundos: 45 * 60,
  nivel: 15,
  alla,
  grabada: todoGrabado,
  ultima: null,
  ...extra,
});

/** Un azar que va dando vueltas, para recorrer todas las salidas. */
function rueda(semilla = 0): () => number {
  let i = semilla;
  return () => ((i++ * 0.618034) % 1);
}

describe("el saludo según la hora", () => {
  it("por la mañana, buenos días, también de madrugada", () => {
    expect(horaDelSaludo(5.5, false)).toBe("dias");
    expect(horaDelSaludo(9, true)).toBe("dias");
    expect(horaDelSaludo(11.9, true)).toBe("dias");
  });

  it("desde el mediodía, buenas tardes mientras haya sol, y buenas noches sin él", () => {
    expect(horaDelSaludo(12, true)).toBe("tardes");
    expect(horaDelSaludo(20.5, true)).toBe("tardes");
    expect(horaDelSaludo(18.5, false)).toBe("noches");
    expect(horaDelSaludo(2, false)).toBe("noches");
    expect(horaDelSaludo(23.9, false)).toBe("noches");
  });

  it("y cada forma con saludo lo da a su hora", () => {
    for (const hora of ["dias", "tardes", "noches"] as const)
      for (const forma of ["pasajeros", "cabina", "chicos"] as const) {
        const p = piezasDe(forma, vuelo({ hora }));
        expect(p?.saludo?.id).toBe(`comandante.bienvenida.saludo.${forma}.${hora}`);
      }
    expect(t("comandante.bienvenida.saludo.pasajeros.dias")).toMatch(/^Buenos días/);
    expect(t("comandante.bienvenida.saludo.cabina.tardes")).toMatch(/buenas tardes/);
    expect(t("comandante.bienvenida.saludo.chicos.noches")).toMatch(/buenas noches/);
  });
});

describe("las formas de la bienvenida", () => {
  it("sin lo nuevo grabado, sale la de siempre: lo que no suena no se sortea", () => {
    expect(formasQueCaben(vuelo({ grabada: sinLoNuevo }))).toEqual(["clasica"]);
    const { forma, anuncio } = laBienvenida(vuelo({ grabada: sinLoNuevo }));
    expect(forma).toBe("clasica");
    expect(anuncio.relleno.bienvenida).toBe("comandante.bienvenida.lanzarote");
  });

  it("y la de siempre ya dice el tiempo de allá, con lo que está grabado", () => {
    const { anuncio } = laBienvenida(vuelo({ grabada: sinLoNuevo }));
    expect(anuncio.clave).toBe("comandante.bienvenidaConPlan");
    expect(anuncio.relleno).toEqual({
      bienvenida: "comandante.bienvenida.lanzarote",
      vuelo: "comandante.previsto.vuelo.45",
      nivel: "comandante.previsto.nivel.15",
      cielo: "comandante.cielo.despejado",
      temperatura: "comandante.temperatura.24",
    });
    // Y se monta entera con el pack de hoy: la receta y todas sus piezas.
    expect(recetaDe(manifiesto, anuncio.clave, anuncio.relleno)).toHaveLength(5);
  });

  it("y cada forma que cabe con el pack de verdad se monta entera con él", () => {
    /*
     * Hoy cabe solo la de siempre; el día que se graben las nuevas, caben las
     * que tengan todas sus piezas, y cada una tiene que montarse con su
     * receta: una pieza nombrada y sin bajar se lleva la bienvenida entera a
     * la voz del navegador, que en Brave para Linux es muda.
     */
    for (const destinoId of [...DESTINOS, null])
      for (const hora of ["dias", "tardes", "noches"] as const)
        for (const ultima of [null, ...FORMAS_DE_BIENVENIDA])
          for (let i = 0; i < 6; i++) {
            const { forma, anuncio } = laBienvenida(
              vuelo({ destinoId, hora, grabada: grabadaHoy, ultima, azar: rueda(i) }),
            );
            // La de una vuelta al campo sin plan es su frase sola, sin receta montada.
            const monta = recetaDe(manifiesto, anuncio.clave, anuncio.relleno);
            expect(monta, `${forma} → ${destinoId ?? "vuelta"}, ${hora}`).not.toBeNull();
          }
  });

  it("y el día que se graben, cada forma se monta con la receta que ya está en el pack", () => {
    // El pack de hoy con las piezas nuevas puestas, cada una con su receta.
    const nuevas = Object.keys(ES_PY).filter((k) => LO_NUEVO.test(k));
    const conTodo: Manifiesto = {
      ...manifiesto,
      piezas: {
        ...manifiesto.piezas,
        ...Object.fromEntries(nuevas.map((k) => [k, { ms: 1000 }])),
      },
      recetas: { ...manifiesto.recetas, ...Object.fromEntries(nuevas.map((k) => [k, [k]])) },
    };
    const enElPack = (id: string): boolean => !!conTodo.recetas[id];
    for (const destinoId of [...DESTINOS, null])
      for (const forma of FORMAS_DE_BIENVENIDA) {
        const p = vuelo({ destinoId, salidaId: "otro-sitio" });
        const solo = soloLaForma(forma);
        const { forma: salio, anuncio } = laBienvenida({
          ...p,
          grabada: (id) => enElPack(id) && solo(id),
          ultima: forma === "clasica" ? null : "clasica",
        });
        expect(salio).toBe(forma);
        const monta = recetaDe(conTodo, anuncio.clave, anuncio.relleno);
        expect(monta, `${forma} → ${destinoId ?? "vuelta"}`).not.toBeNull();
        expect(monta).toHaveLength(Math.max(1, Object.keys(anuncio.relleno).length));
      }
  });

  it("con todo grabado, caben las cinco", () => {
    expect(formasQueCaben(vuelo())).toEqual([...FORMAS_DE_BIENVENIDA]);
  });

  it("una forma con una pieza sin grabar no entra en el sorteo", () => {
    const sinElCierre = (id: string): boolean => id !== "comandante.bienvenida.cierre.disfruten";
    expect(formasQueCaben(vuelo({ grabada: sinElCierre }))).not.toContain("pasajeros");
    const sinLaTarde = (id: string): boolean => !id.endsWith(".chicos.tardes");
    expect(formasQueCaben(vuelo({ grabada: sinLaTarde }))).not.toContain("chicos");
    // La de la gracia, con que suene uno de sus tres saludos, cabe.
    const unaGracia = (id: string): boolean =>
      !id.startsWith("comandante.bienvenida.gracia.") || id === SALUDOS_CON_GRACIA[1];
    expect(piezasDe("gracia", vuelo({ grabada: unaGracia }))?.saludo?.id).toBe(
      SALUDOS_CON_GRACIA[1],
    );
  });

  it("y un destino nuevo, sin su frase, se queda con la de siempre", () => {
    expect(formasQueCaben(vuelo({ destinoId: "un-campo-nuevo" }))).toEqual(["clasica"]);
    expect(laBienvenida(vuelo({ destinoId: "un-campo-nuevo" })).anuncio.relleno.bienvenida).toBe(
      "comandante.bienvenida",
    );
  });
});

describe("nunca la misma dos vuelos seguidos", () => {
  it("la última no sale, por mucho que se tire", () => {
    for (const ultima of FORMAS_DE_BIENVENIDA)
      for (let i = 0; i < 40; i++) {
        const { forma } = laBienvenida(vuelo({ ultima, azar: rueda(i) }));
        expect(forma).not.toBe(ultima);
      }
  });

  it("y en cien vuelos seguidos, recordando la anterior, salen todas y ninguna repite", () => {
    let ultima: string | null = null;
    const vistas = new Set<FormaDeBienvenida>();
    for (let i = 0; i < 100; i++) {
      const { forma } = laBienvenida(vuelo({ ultima, azar: Math.random }));
      expect(forma).not.toBe(ultima);
      vistas.add(forma);
      ultima = forma;
    }
    expect(vistas.size).toBe(FORMAS_DE_BIENVENIDA.length);
  });

  it("con una sola forma que cabe, se dice esa aunque repita: mejor repetir que callar", () => {
    const { forma } = laBienvenida(vuelo({ grabada: grabadaHoy, ultima: "clasica" }));
    expect(forma).toBe("clasica");
  });
});

describe("cada forma dice lo que tiene que decir", () => {
  it("su nombre, el destino, cuánto dura, a qué altura y qué tiempo hace allá", () => {
    for (const destinoId of DESTINOS)
      for (const forma of FORMAS_DE_BIENVENIDA) {
        const p = vuelo({ destinoId, salidaId: "otro-sitio" });
        const piezas = piezasDe(forma, p)!;
        const texto = laBienvenidaCon(forma, p);
        const donde = `${forma} → ${destinoId}`;
        expect(texto, donde).toContain("Jazlyn");
        expect(texto, donde).toContain(NOMBRE[destinoId]!);
        expect(texto, donde).toMatch(/45 minutos/);
        expect(texto, donde).toMatch(/15 mil pies/);
        expect(texto, donde).toMatch(/Allá el cielo está despejado\. La temperatura es de 24 grados\./);
        // Y cada pieza existe, en castellano y en inglés.
        for (const tr of [piezas.saludo, piezas.bienvenida, piezas.cierre])
          if (tr) {
            expect(hayTexto(tr.id), tr.id).toBe(true);
            if (forma !== "clasica") expect(EN[tr.id as TranslationKey], tr.id).toBeTruthy();
          }
      }
  });

  it("y en el orden de una bienvenida: saludo, destino, plan, tiempo de allá y cierre", () => {
    const { anuncio } = laBienvenida(vuelo({ ultima: null, azar: () => 0.3 }));
    const orden = Object.keys(anuncio.relleno);
    const esperado = ["saludo", "bienvenida", "vuelo", "nivel", "cielo", "temperatura", "cierre"];
    expect(orden).toEqual(esperado.filter((k) => orden.includes(k)));
  });

  it("en una vuelta al campo: que se vuelve aquí, sin plan y sin el tiempo de «allá»", () => {
    for (const forma of FORMAS_DE_BIENVENIDA) {
      const p = vuelo({ destinoId: null, segundos: null, nivel: null, alla: null });
      const texto = laBienvenidaCon(forma, p);
      expect(texto, forma).toMatch(/volvemos acá mismo/);
      expect(texto, forma).not.toMatch(/minutos|mil pies|Allá/);
      expect(texto, forma).toContain("Jazlyn");
    }
  });

  it("y el detalle de cada sitio, para cada destino con bienvenida", () => {
    for (const destinoId of [...DESTINOS, "local"]) {
      for (const como of ["a", "detalle"]) {
        const id = `comandante.bienvenida.${como}.${destinoId}`;
        expect(hayTexto(id), id).toBe(true);
        expect(EN[id as TranslationKey], id).toBeTruthy();
      }
    }
  });
});

/*
 * **Y todo lo nuevo de la comandante, en la lista de grabar**, con su voz. Se
 * pide solo con su grabación, así que una frase que no estuviera en la lista
 * no se grabaría nunca y la forma no entraría nunca en el sorteo, sin que
 * nadie se enterara: callar es justo lo que hace mientras tanto.
 */
describe("y lo nuevo de la comandante, en la lista de grabar", () => {
  it("cada frase, con la voz de Jazlyn", () => {
    const frases = JSON.parse(fs.readFileSync("docs/voces/frases.json", "utf8")) as {
      id: string;
      voz: string;
    }[];
    const nuevas = Object.keys(ES_PY).filter((k) =>
      /^comandante\.(?:bienvenida\.(?:saludo|gracia|a|detalle|cierre)\.|mitad\.|chicos\.|curiosidad\.)/.test(
        k,
      ),
    );
    expect(nuevas.length).toBe(63);
    const deJazlyn = frases.filter((f) => f.voz === "comandante").map((f) => f.id);
    for (const k of nuevas) expect(deJazlyn, k).toContain(k);
  });
});

/** Las piezas propias de cada forma nueva. */
const DE_CADA_FORMA: Record<FormaDeBienvenida, RegExp> = {
  clasica: /^$/,
  pasajeros: /\.saludo\.pasajeros\.|\.a\.|\.cierre\.disfruten$/,
  cabina: /\.saludo\.cabina\.|\.detalle\./,
  chicos: /\.saludo\.chicos\.|\.a\.|\.cierre\.gracias$/,
  gracia: /\.gracia\.|\.detalle\.|\.cierre\.acomodense$/,
};

/** Como si solo estuviera grabada esta forma, además de lo de siempre. */
function soloLaForma(forma: FormaDeBienvenida): (id: string) => boolean {
  return (id) => !LO_NUEVO.test(id) || DE_CADA_FORMA[forma].test(id);
}

/**
 * El texto de la bienvenida montada **con esta forma**, sin sortear: con una
 * pieza que solo tiene esa forma, la única que cabe es ella.
 */
function laBienvenidaCon(forma: FormaDeBienvenida, p: ParaLaBienvenida): string {
  const solo = soloLaForma(forma);
  const quedan = formasQueCaben({ ...p, grabada: solo });
  expect(quedan.filter((f) => f !== "clasica")).toEqual(forma === "clasica" ? [] : [forma]);
  const { forma: salio, anuncio } = laBienvenida({
    ...p,
    grabada: solo,
    ultima: forma === "clasica" ? null : "clasica",
  });
  expect(salio).toBe(forma);
  return anuncio.texto;
}
