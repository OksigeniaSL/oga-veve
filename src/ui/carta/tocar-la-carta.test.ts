/**
 * **La carta se toca** (#72): qué se puede tocar en cada peldaño, que cada
 * cosa que se toca tiene su rótulo, su glosa y su frase, y que la frase está
 * en la lista de grabar —una frase sin grabar es muda—.
 */
import { describe, expect, it } from "vitest";
import { SCENARIOS, scenarioById } from "../../world/scenarios";
import { AIRCRAFT } from "../../flight/aircraft";
import { PELDANOS, type Peldano } from "../../flight/escalera";
import { EN } from "../../i18n/en";
import { hayTexto, t } from "../../i18n";
import { mapaDelPais } from "../mapa-del-pais";
import { rutasDelMapa } from "../hangar";
import { APROXIMACIONES } from "../../world/aproximaciones-publicadas";
import { RADIO } from "../../world/frecuencias-publicadas";
import { estacionesDe } from "../../world/radioayudas-publicadas";
import {
  comoSeDice,
  esTocable,
  fraseDe,
  glosaDe,
  ponerRadioDeLaCarta,
  PUNTUALES,
  seTocaEn,
  sintonizar,
  tocableDeEstacion,
  tocableDePunto,
  tocableDeServicio,
  TIPOS_TOCABLES,
  TOCABLES,
  type FrecuenciaTocada,
  type Tocable,
} from "./tocar-la-carta";
import { crujidos, DURA, FUERZA_DE_LA_CARTA, suenaLaCarta } from "../../audio/ruidos-de-la-carta";
import { FUERZA } from "../../audio/audio";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, cod: string): string;
};

/** Los tipos que lleva marcados un trozo de HTML, sin repetir. */
const marcados = (html: string): Set<string> => new Set([...html.matchAll(/data-toca="([^"]+)"/g)].map((m) => m[1]!));

const fichaDe = (id: string, peldano: Peldano): string => {
  const sitio = scenarioById(id);
  return mapaDelPais(sitio, SCENARIOS, rutasDelMapa(sitio, AIRCRAFT[0]!), sitio.id, peldano, AIRCRAFT[0]!.id);
};

describe("cada cosa que se toca, con su rótulo, su glosa y su frase", () => {
  it("en castellano y en inglés", () => {
    for (const tipo of TIPOS_TOCABLES) {
      expect(hayTexto(fraseDe(tipo)), `${tipo}: sin frase`).toBe(true);
      expect(hayTexto(glosaDe(tipo)), `${tipo}: sin glosa`).toBe(true);
      expect(EN[fraseDe(tipo)], `${tipo}: sin frase en inglés`).toBeTruthy();
      expect(EN[glosaDe(tipo)], `${tipo}: sin glosa en inglés`).toBeTruthy();
    }
  });

  it("y la frase, en la lista de grabar con la voz de la instructora", () => {
    const frases = JSON.parse(fs.readFileSync("docs/voces/frases.json", "utf8")) as { id: string; voz: string; texto: string }[];
    const porId = new Map(frases.map((f) => [f.id, f]));
    for (const tipo of TIPOS_TOCABLES) {
      const fila = porId.get(fraseDe(tipo));
      expect(fila, `${tipo}: no está en frases.json (node scripts/frases-para-grabar.mjs)`).toBeDefined();
      expect(fila?.voz).toBe("instructor");
      // Y con el texto de hoy: una frase cambiada y no regrabada diría otra cosa que la que se lee.
      expect(fila?.texto, tipo).toBe(t(fraseDe(tipo)));
    }
  });

  it("el rótulo aeronáutico no se traduce: es el mismo en los tres idiomas", () => {
    // Regla 3: «VOR», «MAPt», «OCA (OCH)». Lo que se traduce es la glosa.
    expect(TOCABLES.vor.rotulo).toBe("VOR");
    expect(TOCABLES.mapt.rotulo).toBe("MAPt");
    expect(TOCABLES.minimos.rotulo).toBe("OCA (OCH)");
    for (const tipo of TIPOS_TOCABLES) {
      const r = TOCABLES[tipo].rotulo;
      if (r) expect(r, tipo).toMatch(/^[A-Z][A-Za-z ()]*$/);
    }
  });
});

describe("lo que se enseña al tocar, por peldaños", () => {
  it("la voz en los cuatro; el rótulo y la glosa desde Tukã; la frase escrita desde Taguato", () => {
    const [dibujo, palabra, cifra, cabina] = PELDANOS.map((p) => comoSeDice("vor", p, "VOR/DME TFN 117.700"));
    for (const c of [dibujo, palabra, cifra, cabina]) expect(c!.voz.clave).toBe("carta.toca.vor");
    expect(dibujo).toMatchObject({ rotulo: null, glosa: null, texto: null });
    expect(palabra).toMatchObject({ rotulo: "VOR/DME TFN 117.700", glosa: t("carta.toca.vor.corta"), texto: null });
    expect(cifra!.texto).toBe(t("carta.toca.vor"));
    expect(cabina!.texto).toBe(t("carta.toca.vor"));
    // Y el lector de pantalla lo oye siempre, también en Guyrami.
    expect(dibujo!.nombre).toContain("VOR");
  });

  it("sin rótulo propio, el de serie; tu avión no lleva ninguno", () => {
    expect(comoSeDice("pista", "palabra").rotulo).toBe("RWY");
    expect(comoSeDice("avion", "cabina").rotulo).toBeNull();
    expect(comoSeDice("avion", "cabina").glosa).toBe(t("carta.toca.avion.corta"));
  });

  it("solo existe lo que dibuja su calco: el territorio en los cuatro, la radio en el de cabina", () => {
    for (const p of PELDANOS)
      for (const tipo of ["pista", "calle", "plataforma", "aerodromo", "avion", "norte"] as const)
        expect(seTocaEn(tipo, p), `${tipo} en ${p}`).toBe(true);
    for (const tipo of TIPOS_TOCABLES.filter((x) => TOCABLES[x].calco === "radio")) {
      expect(seTocaEn(tipo, "cabina"), tipo).toBe(true);
      for (const p of ["dibujo", "palabra", "cifra"] as const) expect(seTocaEn(tipo, p), `${tipo} en ${p}`).toBe(false);
    }
  });
});

describe("lo que la ficha del campo deja tocar", () => {
  it("en Guyrami, la pista, el campo, el norte y tu avión; nada de la radio", () => {
    const tocables = marcados(fichaDe("tenerife-norte", "dibujo"));
    expect([...tocables].sort()).toEqual(["avion", "calle", "norte", "pista", "plataforma"]);
  });

  it("en Taguato Ruvicha, además las radioayudas, las frecuencias y la carta de aproximación", () => {
    const tocables = marcados(fichaDe("tenerife-norte", "cabina"));
    for (const tipo of ["pista", "avion", "norte", "vor", "ils", "twr", "atis", "app", "msa", "if", "faf", "mapt", "minimos", "frustrada"] as const)
      expect(tocables.has(tipo), tipo).toBe(true);
  });

  it("en ningún campo ni peldaño se marca lo que su calco no dibuja, ni un tipo que no existe", () => {
    for (const e of SCENARIOS.filter((x) => x.aerodrome && x.pais !== "inventado")) {
      for (const p of PELDANOS) {
        const html = mapaDelPais(e, SCENARIOS, rutasDelMapa(e, AIRCRAFT[0]!), e.id, p, AIRCRAFT[0]!.id);
        for (const tipo of marcados(html)) {
          expect(esTocable(tipo), `${e.id} ${p}: «${tipo}»`).toBe(true);
          expect(seTocaEn(tipo as Tocable, p), `${e.id} ${p}: ${tipo}`).toBe(true);
        }
      }
    }
  });

  it("cada frecuencia y cada radioayuda con frecuencia lleva sus megahercios, para la radio", () => {
    const html = fichaDe("tenerife-norte", "cabina");
    // La torre de Los Rodeos, AD 2-GCXO-9: 118.700 MHz. Y el VOR TFN, 117.700.
    expect(html).toMatch(/data-toca="twr" data-rotulo="TWR 118\.700" data-mhz="118\.7"/);
    expect(html).toMatch(/data-toca="vor" data-rotulo="VOR\/DME TFN 117\.700" data-mhz="117\.7"/);
    // El NDB de Hierro, en kilohercios en la carta y en megahercios en la marca.
    expect(fichaDe("el-hierro", "cabina")).toMatch(/data-toca="ndb" data-rotulo="NDB HIE 376\.000 kHz" data-mhz="0\.376"/);
  });
});

describe("debajo del dedo, un punto gana a una raya", () => {
  it("las radioayudas, los puntos del perfil, el norte y tu avión son puntos; la pista, las calles y las cajas no", () => {
    for (const tipo of ["vor", "dme", "ndb", "ils", "if", "faf", "mapt", "norte", "avion"] as const) expect(PUNTUALES.has(tipo), tipo).toBe(true);
    // Si la calle ganara a la pista, tocar la pista en su cruce diría «calle de rodaje».
    for (const tipo of ["pista", "calle", "plataforma", "aerodromo", "minimos", "frustrada", "msa", "twr"] as const)
      expect(PUNTUALES.has(tipo), tipo).toBe(false);
  });
});

describe("las traducciones de la carta a lo que se toca", () => {
  it("cada servicio del AIP, cada estación y cada punto del perfil con su tipo", () => {
    for (const radio of Object.values(RADIO))
      for (const s of radio.servicios) expect(esTocable(tocableDeServicio(s.servicio)), s.servicio).toBe(true);
    expect(tocableDeServicio("SMC")).toBe("gnd");
    expect(tocableDeServicio("ACC")).toBe("frecuencia");
    for (const oaci of ["GCXO", "GCHI", "LEMD", "SGAS"])
      for (const e of estacionesDe(oaci)) expect(TOCABLES[tocableDeEstacion(e.clase)].calco, e.id).toBe("radio");
    expect(tocableDeEstacion("VOR/DME")).toBe("vor");
    expect(tocableDePunto("FAP")).toBe("faf");
    expect(tocableDePunto("MAPT")).toBe("mapt");
    expect(tocableDePunto("THR")).toBeNull();
  });

  it("toda carta de aproximación tiene algún punto que se toca", () => {
    for (const [oaci, cabeceras] of Object.entries(APROXIMACIONES))
      for (const [cab, c] of Object.entries(cabeceras ?? {}))
        expect(c.perfil.puntos.some((p) => tocableDePunto(p.rotulo)), `${oaci} ${cab}`).toBe(true);
  });
});

describe("tocar la frecuencia la pondría en la radio", () => {
  const torre: FrecuenciaTocada = { tipo: "twr", radio: "com", mhz: 118.7, rotulo: "TWR 118.700" };

  it("sin radio enchufada —el juego no tiene ninguna que se sintonice— no se pone", () => {
    ponerRadioDeLaCarta(null);
    expect(sintonizar(torre, "cabina")).toBe(false);
  });

  it("con una, se pone en el calco de la radio si el avión la lleva, y solo entonces", () => {
    const puestas: FrecuenciaTocada[] = [];
    let lleva = true;
    ponerRadioDeLaCarta({ lleva: () => lleva, poner: (f) => (puestas.push(f), true) });
    try {
      expect(sintonizar(torre, "cifra")).toBe(false);
      expect(sintonizar(torre, "cabina")).toBe(true);
      expect(puestas).toEqual([torre]);
      lleva = false;
      expect(sintonizar(torre, "cabina")).toBe(false);
      // Lo que no tiene frecuencia que poner no llega a la radio.
      lleva = true;
      expect(sintonizar({ tipo: "msa", radio: "com", mhz: 1, rotulo: "MSA" }, "cabina")).toBe(false);
      expect(puestas).toHaveLength(1);
    } finally {
      ponerRadioDeLaCarta(null);
    }
  });
});

describe("el papel y el clic", () => {
  it("si suena un aviso, la carta se calla", () => {
    expect(suenaLaCarta(false)).toBe(true);
    expect(suenaLaCarta(true)).toBe(false);
  });

  it("bajos y cortos: menos que un toque del cuadro, y el papel en un tercio de segundo", () => {
    expect(FUERZA_DE_LA_CARTA.papel).toBeLessThan(FUERZA);
    expect(FUERZA_DE_LA_CARTA.clic).toBeLessThan(FUERZA);
    expect(DURA.papel).toBeLessThanOrEqual(0.4);
    expect(DURA.clic).toBeLessThanOrEqual(0.05);
    let n = 0;
    const azar = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
    const c = crujidos(azar);
    expect(c.length).toBeGreaterThan(2);
    for (const x of c) expect(x.en).toBeLessThan(DURA.papel);
  });
});
