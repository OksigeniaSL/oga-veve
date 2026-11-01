/**
 * El esqueleto del tercer capítulo del vuelo largo: la entrada, y un guion que
 * no dice nada falso ni nada sin grabar. El vuelo de verdad lo vuela
 * `scripts/verificar-inicio-4.mjs`.
 */

import { describe, expect, it } from "vitest";
import { anuncioDeLaBajadaDelVueloLargo } from "../audio/partes-de-la-comandante";
import ARA from "../../data/voces/ara/manifiesto.json";
import COMANDANTE from "../../data/voces/comandante/manifiesto.json";
import TRIPULACION from "../../data/voces/tripulacion/manifiesto.json";
import TRIPULANTE from "../../data/voces/tripulacion-canarias/manifiesto.json";
import FILAS from "../../docs/voces/frases.json";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import type { Meteo } from "../world/meteo";
import { dondeCae } from "../world/entre-aerodromos";
import type { Linea } from "./conversacion";
import { GUION_LLEGADA_A_ASUNCION } from "./guion-llegada-a-asuncion";
import { escenaPedida } from "./inicio";
import { MotorDelPasaje, TAPA_A_OSCURAS, type DelVueloLargo, type GuionDelPasaje, type LecturaDelPasaje } from "./motor-del-pasaje";
import { entradaDeLaLlegada, ENTRA_LA_LLEGADA_A, dondeVa, horarioDelDia, perfilDelVuelo, PETTIROSSI } from "./ruta-larga";
import { DEJA_LA_ORTODROMICA } from "./salto-bajo-tapa";

/** Las frases que pueden salir en el guion, con y sin lo que depende del vuelo. */
function lasFrases(l: LecturaDelPasaje): readonly Linea[] {
  const e = new MotorDelPasaje({ decir: () => {}, callar: () => {} }, GUION_LLEGADA_A_ASUNCION);
  return GUION_LLEGADA_A_ASUNCION.momentos.flatMap((m) => [...m.lineas, ...(m.segun?.(l, e) ?? [])]);
}

const EN_CRUCERO: LecturaDelPasaje = {
  tramo: "crucero",
  enTramo: 10,
  motor: true,
  enTierra: false,
  porElSuelo: 230,
  altura: 12000,
  altitud: 12192,
  vertical: 0,
  autorizado: false,
  flaps: 0,
  nubes: null,
  enNube: 0,
  cabina: 0,
  faltaParaTocar: 400_000,
  hastaLaBajada: 480,
};

/** Un día de diciembre: horario de invierno de Europa, con el sol ya alto al abrir la ventanilla. */
const HOY_DE_DIA: DelVueloLargo = {
  temporada: "invierno",
  conSolAlDesayunar: true,
  sol: 17,
  solPorMiVentanilla: true,
  anuncioDeLaBajada: () => ({ clave: "comandante.largo.anuncio", texto: "…", relleno: {} }),
};

describe("la entrada", () => {
  it("`?inicio=4` abre el vuelo largo, y los otros siguen abriendo lo suyo", () => {
    expect(escenaPedida("4")).toBe("largo");
    expect(escenaPedida("3")).toBe("pasaje");
    expect(escenaPedida("2")).toBe("aterrizar");
    expect(escenaPedida("1")).toBe("despegar");
  });

  it("entra hacia las 10 h 35 en verano y un poco después en invierno, en el mismo sitio", () => {
    const verano = perfilDelVuelo(horarioDelDia(new Date("2026-07-15T12:00:00Z")));
    const invierno = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
    expect(entradaDeLaLlegada(verano) / 3600).toBeCloseTo(10 + 35 / 60, 1);
    expect(entradaDeLaLlegada(invierno) / 3600).toBeCloseTo(10 + 40 / 60, 1);
    for (const p of [verano, invierno]) {
      const d = dondeVa(p, entradaDeLaLlegada(p));
      expect(d.fase).toBe("crucero");
      expect(p.ruta.distancia - d.recorrido).toBeCloseTo(ENTRA_LA_LLEGADA_A, -1);
    }
  });

  it("con el avión ya dentro del mundo del Paraguay, que llega a 374 km de su centro", () => {
    const p = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
    const { x, z } = dondeCae(PETTIROSSI, dondeVa(p, entradaDeLaLlegada(p)).sitio);
    expect(Math.abs(x)).toBeLessThan(374_000);
    expect(Math.abs(z)).toBeLessThan(374_000);
  });

  it("y se deja la ortodrómica después de entrar, no antes", () => {
    expect(DEJA_LA_ORTODROMICA).toBeLessThan(ENTRA_LA_LLEGADA_A);
  });
});

describe("el guion", () => {
  /** Las que todavía esperan su toma: están en la lista de grabar y son mudas hasta entonces. */
  const FRASES = FILAS as readonly { readonly id: string; readonly voz: string }[];

  const con = (largo: Partial<DelVueloLargo>): LecturaDelPasaje => ({ ...EN_CRUCERO, largo: { ...HOY_DE_DIA, ...largo } });

  it("empieza por el despertar, y la frase que llevaba tiempo muda suena por fin", () => {
    const m = GUION_LLEGADA_A_ASUNCION.momentos;
    expect(m[0]?.id).toBe("despertar");
    expect(m[0]?.lineas.map((l) => l.clave)).toContain("inicio.tripulacion.pasaje.cerca.despertar");
    expect(m.at(-1)?.id).toBe("fin");
  });

  it("todas sus frases están grabadas o en la lista de grabar, con la voz que les toca", () => {
    const bocaDe = (l: Linea): { readonly piezas: object } =>
      l.quien === "ara" ? ARA : l.quien === "mama" ? COMANDANTE : l.megafonia || l.clave.includes(".derlis.") ? TRIPULACION : TRIPULANTE;
    // Los anuncios los monta el juego con el campo de hoy: se mira lo que sale aquí, con Pettirossi.
    const montados: Record<string, string> = {
      "comandante.descenso": "comandante.descenso.hacia.pettirossi",
      "comandante.llegada": "comandante.llegada.pettirossi",
      "tripulacion.llegada": "tripulacion.bienvenidos.pettirossi",
    };
    const nombreDeLaVoz = (l: Linea): string =>
      l.quien === "ara" ? "ara" : l.quien === "mama" ? "comandante" : l.clave.includes(".derlis.") ? "tripulacion" : "tripulacion-canarias";
    const faltan: string[] = [];
    for (const l of lasFrases({ ...EN_CRUCERO, potencia: "ralenti", conEstaPotencia: 1, largo: HOY_DE_DIA })) {
      const clave = montados[l.clave] ?? l.clave;
      if (clave === "comandante.largo.anuncio") continue;
      if (clave in bocaDe(l).piezas) continue;
      const fila = FRASES.find((f) => f.id === clave);
      if (fila?.voz !== nombreDeLaVoz(l)) faltan.push(clave);
    }
    expect(faltan).toEqual([]);
  });

  it("ni una dice otro sitio: lo de La Palma se queda en su guion", () => {
    const claves = lasFrases(EN_CRUCERO).map((l) => l.clave);
    expect(claves).not.toContain("inicio.ara.pasaje.fin");
  });

  it("y lo falso que corre por ahí no se cuenta, en ningún idioma", () => {
    const textos = Object.entries({ ...ES_PY, ...EN })
      .filter(([k]) => k.includes(".largo.") || k.includes(".derlis."))
      .map(([, v]) => String(v));
    expect(textos.length).toBeGreaterThanOrEqual(30);
    for (const t of textos) {
      // Ni que el avión deshidrate, ni beber mucho, ni melatonina, ni el agua del lavabo.
      expect(t).not.toMatch(/deshidrat|dehydrat|beb[eé] mucho|melatonin|lavabo|sink|remolino/i);
      // Ni un adjetivo que le ponga género a Ara: sentada, dormido, cansada…
      expect(t).not.toMatch(/\b(sentad[oa]|dormid[oa]|despiert[oa]|cansad[oa]|tranquil[oa])\b/i);
    }
  });

  it("de ninguna marca: ni aerolínea ni fabricante", () => {
    for (const [k, v] of Object.entries(ES_PY))
      if (k.includes(".largo.") || k.includes(".derlis.")) expect(String(v), k).not.toMatch(/boeing|airbus|air europa|ux ?23|787/i);
  });

  /** La escena entera de la apertura, con las frases acabando en el acto, y lo que va pidiendo. */
  function laApertura(l: LecturaDelPasaje): { readonly dichas: string[]; readonly tapas: (string | null)[]; readonly e: MotorDelPasaje<string, string> } {
    const dichas: string[] = [];
    const tapas: (string | null)[] = [];
    const e = new MotorDelPasaje<string, string>(
      {
        decir: (x, alAcabar) => {
          dichas.push(x.clave);
          alAcabar(0);
        },
        callar: () => {},
      },
      GUION_LLEGADA_A_ASUNCION as unknown as GuionDelPasaje<string, string>,
    );
    for (let i = 0; i < 3000 && !e.dicho("anuncio"); i++) {
      e.paso(0.1, l);
      if (tapas.at(-1) !== e.tapaDeAhora) tapas.push(e.tapaDeAhora);
    }
    return { dichas, tapas, e };
  }

  it("arranca tapado: el mundo no asoma ni antes del primer paso", () => {
    const e = new MotorDelPasaje<string, string>({ decir: () => {}, callar: () => {} }, GUION_LLEGADA_A_ASUNCION as unknown as GuionDelPasaje<string, string>);
    expect(e.tapaDeAhora).toBe(TAPA_A_OSCURAS);
    expect(e.enLaApertura).toBe(true);
  });

  it("cuenta lo de la mañana en su orden y bajo sus láminas, y la ventanilla se abre después", () => {
    const { dichas, tapas, e } = laApertura(con({}));
    expect(dichas.map((c) => c.replace(/^inicio\.(tripulacion|ara)\.pasaje\./, "")).slice(0, 18)).toEqual([
      "cerca.despertar",
      "largo.meDormi",
      "cerca.largo.mapa",
      "largo.mapa",
      "derlis.desayuno",
      "largo.chipa",
      "largo.nariz",
      "derlis.agua",
      "largo.huso",
      "cerca.largo.huso",
      "cerca.largo.husoInvierno",
      "cerca.largo.ecuador1",
      "largo.ecuador",
      "cerca.largo.ecuador2",
      "derlis.piernas",
      "derlis.desfase",
      "largo.deDia",
      "comandante.largo.anuncio",
    ]);
    expect(tapas).toEqual(["desayuno", null, "desayuno", "huso-invierno", "ecuador", "desayuno", "huso-invierno", null]);
    expect(e.enLaApertura).toBe(false);
    expect(e.estado.planos.map((p) => p.plano)).toEqual(["ventanilla", "respaldo", "ventanilla"]);
  });

  it("el huso, el de hoy: con el horario de verano de Europa son cinco horas y su lámina", () => {
    const { dichas, tapas } = laApertura(con({ temporada: "verano" }));
    expect(dichas).toContain("inicio.tripulacion.pasaje.cerca.largo.husoVerano");
    expect(dichas).not.toContain("inicio.tripulacion.pasaje.cerca.largo.husoInvierno");
    expect(tapas).toContain("huso-verano");
    expect(tapas).not.toContain("huso-invierno");
  });

  it("el sol, el que da la cuenta: sin él, ni en la lámina ni en lo que dice Ara", () => {
    const noche = laApertura(con({ conSolAlDesayunar: false, sol: -20, solPorMiVentanilla: false }));
    expect(noche.tapas).toContain("desayuno-noche");
    expect(noche.tapas).not.toContain("desayuno");
    expect(noche.dichas).toContain("inicio.ara.pasaje.largo.deNoche");
    expect(noche.dichas).not.toContain("inicio.ara.pasaje.largo.deDia");
    expect(noche.dichas).not.toContain("inicio.ara.pasaje.largo.amanece");
    const sale = laApertura(con({ sol: 3, solPorMiVentanilla: true }));
    expect(sale.dichas).toContain("inicio.ara.pasaje.largo.amanece");
    // Saliendo, pero por el otro lado: Ara no lo ve, así que no lo dice.
    const alOtroLado = laApertura(con({ sol: 3, solPorMiVentanilla: false }));
    expect(alOtroLado.dichas).not.toContain("inicio.ara.pasaje.largo.amanece");
  });

  it("mientras dura la apertura no sale el ⏩; al abrirse, sí", () => {
    const e = new MotorDelPasaje<string, string>({ decir: (_x, a) => a(0), callar: () => {} }, GUION_LLEGADA_A_ASUNCION as unknown as GuionDelPasaje<string, string>);
    const l = con({});
    let salio = false;
    for (let i = 0; i < 3000; i++) {
      e.paso(0.1, l);
      if (e.enLaApertura) salio ||= e.estado.adelanto.sale;
      else break;
    }
    expect(salio).toBe(false);
    for (let i = 0; i < 20; i++) e.paso(0.1, l);
    expect(e.estado.adelanto.sale).toBe(true);
  });

  it("Ara no se duerme, con catorce minutos de crucero callado por delante", () => {
    const { e } = laApertura(con({}));
    for (let i = 0; i < 2000; i++) e.paso(0.1, con({}));
    expect(e.estado.siestas).toEqual([]);
    expect(e.estado.durmiendo).toBe(false);
    expect(e.estado.momento).toBe("bajada");
  });

  it("al bajar: el ralentí, los cinturones y, sin repetir que se baja, el anuncio ya dicho", () => {
    const { dichas, e } = laApertura(con({}));
    dichas.length = 0;
    const bajando: LecturaDelPasaje = { ...con({}), tramo: "bajada", enTramo: 0, potencia: "ralenti", conEstaPotencia: 0 };
    for (let i = 0; i < 40; i++) e.paso(0.1, bajando);
    expect(dichas).toEqual(["inicio.ara.pasaje.ralenti", "tripulacion.cinturones"]);
  });

  it("los oídos, con los tres remedios en boca de Idaira y su lámina", () => {
    const linea = GUION_LLEGADA_A_ASUNCION.momentos.find((m) => m.id === "oidos")!.lineas;
    expect(linea.map((l) => l.clave)).toContain("inicio.tripulacion.pasaje.cerca.largo.oidos");
    expect(linea.find((l) => l.clave.endsWith("largo.oidos"))?.dibujo).toBe("oido");
    expect(ES_PY["inicio.tripulacion.pasaje.cerca.largo.oidos"]).toMatch(/Traga, bosteza o mastica/);
  });

  it("lo que nombra Ara, solo por su cristal y con luz: y si no se ve, no se dice", () => {
    const { charlas } = GUION_LLEGADA_A_ASUNCION;
    for (const id of ["rio", "chaco", "asuncion", "asuncionNoche"] as const) {
      const c = charlas.find((x) => x.id === id)!;
      expect(c.plano, id).toBe("ventanilla");
      expect(c.nombra, id).toBeTruthy();
    }
    const e = new MotorDelPasaje<string, string>({ decir: () => {}, callar: () => {} }, GUION_LLEGADA_A_ASUNCION as unknown as GuionDelPasaje<string, string>);
    const rio = charlas.find((x) => x.id === "rio")!;
    const bajando: LecturaDelPasaje = { ...EN_CRUCERO, tramo: "bajada", altura: 2000 };
    const asi = (sol: number): LecturaDelPasaje => ({ ...bajando, largo: { ...HOY_DE_DIA, sol } });
    expect(rio.cuando(asi(10), e as never)).toBe(true);
    // De noche cerrada, el río no se nombra. De mayo a agosto se aterriza así.
    expect(rio.cuando(asi(-15), e as never)).toBe(false);
    expect(charlas.find((x) => x.id === "asuncionNoche")!.cuando(asi(-15), e as never)).toBe(true);
    // Y ninguna frase dice de qué lado: lo dice lo que se ve. Con viento del sur va todo al revés.
    for (const c of charlas) for (const l of c.lineas) expect(String(ES_PY[l.clave as keyof typeof ES_PY]), l.clave).not.toMatch(/izquierda|derecha/);
  });

  it("la hora de llegada, la del horario de hoy: 06:25 o 07:30", () => {
    const hora = GUION_LLEGADA_A_ASUNCION.momentos.find((m) => m.id === "hora")!;
    const e = new MotorDelPasaje<string, string>({ decir: () => {}, callar: () => {} }, GUION_LLEGADA_A_ASUNCION as unknown as GuionDelPasaje<string, string>);
    const claves = (temporada: "verano" | "invierno"): string | undefined =>
      hora.segun?.({ ...EN_CRUCERO, largo: { ...HOY_DE_DIA, temporada } }, e as never)[0]?.clave;
    expect(ES_PY[claves("verano") as keyof typeof ES_PY]).toMatch(/seis y veinticinco/);
    expect(ES_PY[claves("invierno") as keyof typeof ES_PY]).toMatch(/siete y media/);
  });
});

describe("el anuncio de la bajada", () => {
  const METEO = { temp: 24, visibilidadM: 10_000, techoM: null } as Meteo;

  it("dice la hora de allí con el horario de hoy, los minutos, el cielo y los grados", () => {
    const a = anuncioDeLaBajadaDelVueloLargo(6 * 3600 + 44 * 60, 35 * 60, METEO);
    expect(a.clave).toBe("comandante.largo.anuncio");
    expect(a.relleno.hora).toBe("comandante.largo.hora.0645");
    expect(a.relleno.minutos).toBe("comandante.minutos.35");
    expect(a.relleno.cielo).toBe("comandante.cielo.despejado");
    expect(a.relleno.temperatura).toBe("comandante.temperatura.24");
    expect(a.texto).toMatch(/En unos minutos empezamos a bajar hacia Asunción/);
    expect(a.texto).toMatch(/seis y cuarenta y cinco/);
    expect(anuncioDeLaBajadaDelVueloLargo(5 * 3600 + 41 * 60, 35 * 60, METEO).relleno.hora).toBe("comandante.largo.hora.0545");
  });

  it("y una hora que no tiene su trozo no se dice, que el resto sí suena", () => {
    const a = anuncioDeLaBajadaDelVueloLargo(9 * 3600, 35 * 60, METEO);
    expect(a.relleno.hora).toBeUndefined();
    expect(a.relleno.temperatura).toBe("comandante.temperatura.24");
  });

  it("no promete bajar ya: la bajada todavía no ha empezado", () => {
    expect(ES_PY["comandante.largo.bajada"]).not.toMatch(/Empezamos a bajar/);
  });
});
