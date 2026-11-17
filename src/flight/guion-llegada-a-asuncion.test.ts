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
import {
  dondeVa,
  ENTRA_LA_LLEGADA_A,
  entradaDeLaLlegada,
  horaLocal,
  horarioDelDia,
  horasEn,
  HUSO_DE_ASUNCION,
  perfilDelVuelo,
  PETTIROSSI,
  solEnElVuelo,
} from "./ruta-larga";
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
  recorrido: 8_789_000,
  entraLaLlegada: 38_400,
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
    // Es lo mismo que dice la cuenta: 06:25 y 07:30 en la hora de Asunción.
    const calzos = (fecha: string): number => horaLocal(horarioDelDia(new Date(fecha)).llegada, HUSO_DE_ASUNCION) / 60;
    expect(calzos("2026-07-15T12:00:00Z")).toBeCloseTo(6 * 60 + 25, 0);
    expect(calzos("2026-12-15T12:00:00Z")).toBeCloseTo(7 * 60 + 30, 0);
    expect(ES_PY[claves("invierno") as keyof typeof ES_PY]).toMatch(/siete y media/);
  });
});

/*
 * **Con la cuenta de verdad**, mes a mes: es lo que decide la lámina del desayuno y la
 * hora del anuncio. La tabla, la del apartado 1.4 del plan.
 */
describe("lo que dice la cuenta, según el mes", () => {
  const perfilDel = (mes: string) => perfilDelVuelo(horarioDelDia(new Date(`2026-${mes}-15T12:00:00Z`)));
  /** Lo que tarda en abrirse la ventanilla, s: lo que duran las frases de la apertura, de sobra. */
  const LA_APERTURA = 180;

  it("el amanecer por la ventanilla del desayuno, de noviembre a marzo y solo entonces", () => {
    const conSol = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].filter((m) => {
      const p = perfilDel(m);
      return solEnElVuelo(p, entradaDeLaLlegada(p)).asoma;
    });
    expect(conSol).toEqual(["01", "02", "03", "11", "12"]);
  });

  it("de mayo a agosto se aterriza de noche cerrada, y en diciembre con el sol alto", () => {
    for (const m of ["05", "06", "07", "08"]) {
      const p = perfilDel(m);
      expect(solEnElVuelo(p, p.enElAire).deNoche, m).toBe(true);
    }
    const dic = perfilDel("12");
    expect((solEnElVuelo(dic, dic.enElAire).altura * 180) / Math.PI).toBeGreaterThan(8);
  });

  it("la hora del anuncio cae siempre en una de las dos que tienen su trozo", () => {
    for (const m of ["01", "04", "07", "10", "12"]) {
      const p = perfilDel(m);
      for (const tras of [0, LA_APERTURA, 2 * LA_APERTURA]) {
        const a = anuncioDeLaBajadaDelVueloLargo(horasEn(p, entradaDeLaLlegada(p) + tras).asuncion, 1800, { temp: 20, visibilidadM: 10_000, techoM: null } as Meteo);
        expect(a.relleno.hora, `${m} +${tras} s`).toBe(p.horario.temporada === "verano" ? "comandante.largo.hora.0545" : "comandante.largo.hora.0645");
      }
    }
  });

  it("y faltan unos treinta y tantos minutos para tocar, que es el «unos cuarenta» de una comandante", () => {
    for (const m of ["07", "12"]) {
      const p = perfilDel(m);
      const falta = (p.enElAire - entradaDeLaLlegada(p) - LA_APERTURA) / 60;
      expect(falta, m).toBeGreaterThan(28);
      expect(falta, m).toBeLessThan(42);
    }
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
    expect(a.texto).toMatch(/En unos minutos empezamos a bajar/);
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

/*
 * **El ralentí, con cualquier crucero** (17-11-2026, H27b). En el vuelo corto,
 * con un crucero de medio minuto, el ralentí llegaba con la tripulante contando
 * las nubes en el asiento de Ara, y el anuncio de la bajada esperaba a que
 * acabara: Ara ya no lo podía notar. Aquí se mira lo mismo barriendo cuándo
 * llega el punto de descenso, con las frases durando lo que duran sus tomas.
 *
 * Y aquí no pasa, así que no se para nada (`paraEnLaBajada` vacío): lo largo de
 * este capítulo —la mañana bajo sus láminas, dos minutos de frases— va en la
 * apertura, que acaba con la ventanilla y el anuncio de la comandante unos seis
 * minutos antes del punto de descenso del perfil, y después solo queda lo que
 * se dice en una frase. Con el punto de descenso en cualquier sitio desde que
 * empieza el anuncio, Ara lo nota entre 0 y 13 s después del cambio. Antes de
 * eso no se mira: con la entrada a 400 km de Pettirossi, el punto de descenso
 * no puede caer en la apertura.
 */
describe("el ralentí al empezar a bajar, con cualquier crucero", () => {
  /** Lo que tarda como mucho Ara en notarlo, s: ver `SE_OYE_EL_CAMBIO` en `motor-del-pasaje.ts`. */
  const A_TIEMPO = 40;
  const DT_DEL_VUELO = 0.1;
  const PIEZAS = [ARA, COMANDANTE, TRIPULACION, TRIPULANTE].map((m) => (m as unknown as { piezas: Record<string, { ms: number }> }).piezas);
  /** Lo que dura una frase: su toma, o la suma de sus trozos si es un anuncio montado; sin toma, sus letras a catorce por segundo. */
  const dura = (l: Linea): number =>
    (l.relleno ? Object.values(l.relleno) : [l.clave]).reduce((s, clave) => {
      const toma = PIEZAS.find((p) => clave in p)?.[clave];
      const texto = (ES_PY[clave as keyof typeof ES_PY] as string | undefined) ?? l.texto ?? "";
      return s + (toma ? toma.ms / 1000 : texto.length / 14);
    }, 0);
  const ANUNCIO = anuncioDeLaBajadaDelVueloLargo(6 * 3600 + 44 * 60, 35 * 60, { temp: 24, visibilidadM: 10_000, techoM: null } as Meteo);

  /**
   * El capítulo desde su despertar, en crucero, y a los `crucero` segundos el punto de
   * descenso con los motores al ralentí. Con `conLaConsola`, la pantalla del asiento y
   * lo que se explica de ella, que es una frase más en la cola al abrirse la ventanilla.
   */
  function volar(
    crucero: number,
    conLaConsola = false,
  ): { dichas: { clave: string; desde: number; hasta: number }[]; e: MotorDelPasaje<string, string> } {
    let t = 0;
    const dichas: { clave: string; desde: number; hasta: number }[] = [];
    // Con `as`, y no anotado: lo cambia la voz desde fuera del bucle, y anotado se estrecharía a `null`.
    let sonando = null as { fin: number; alAcabar: (n: number) => void; d: { hasta: number } } | null;
    const e = new MotorDelPasaje<string, string>(
      {
        decir: (x, alAcabar) => {
          const d = { clave: x.clave, desde: t, hasta: NaN };
          dichas.push(d);
          sonando = { fin: t + dura(x), alAcabar, d };
        },
        callar: () => {
          if (sonando) sonando.d.hasta = t;
          sonando = null;
        },
      },
      GUION_LLEGADA_A_ASUNCION as unknown as GuionDelPasaje<string, string>,
      { conPantalla: conLaConsola, pared: () => t },
    );
    if (conLaConsola) e.explicarLaConsola();
    for (; t < crucero + 240; t += DT_DEL_VUELO) {
      if (sonando && t >= sonando.fin) {
        const s = sonando;
        sonando = null;
        s.d.hasta = t;
        s.alAcabar(0);
      }
      const bajando = t >= crucero;
      const enBajada = t - crucero;
      const altitud = bajando ? 12192 - 12 * enBajada : 12192;
      e.paso(DT_DEL_VUELO, {
        ...EN_CRUCERO,
        tramo: bajando ? "bajada" : "crucero",
        enTramo: bajando ? enBajada : t,
        altitud,
        altura: altitud - 101,
        vertical: bajando ? -12 : 0,
        cabina: bajando ? -1.5 : 0,
        faltaParaTocar: bajando ? 210_000 - 220 * enBajada : 210_000 + 240 * (crucero - t),
        hastaLaBajada: bajando ? undefined : crucero - t,
        potencia: bajando ? "ralenti" : "subida",
        conEstaPotencia: bajando ? enBajada : 600 + t,
        largo: { ...HOY_DE_DIA, anuncioDeLaBajada: () => ANUNCIO },
      });
    }
    return { dichas, e };
  }

  /** Cuándo empieza y cuándo acaba el anuncio de la comandante, s del capítulo, con un crucero que no se acaba. */
  const EL_ANUNCIO = (() => {
    const d = volar(3000).dichas.find((x) => x.clave === "comandante.largo.anuncio")!;
    return { desde: d.desde, hasta: d.hasta };
  })();

  it("con el crucero de verdad, el punto de descenso llega con la apertura y el anuncio ya dichos, y de sobra", () => {
    expect(EL_ANUNCIO.hasta).toBeGreaterThan(EL_ANUNCIO.desde);
    for (const mes of ["01", "04", "07", "10", "12"]) {
      const p = perfilDelVuelo(horarioDelDia(new Date(`2026-${mes}-15T12:00:00Z`)));
      const crucero = p.tramos.find((x) => x.fase === "bajada")!.desde - entradaDeLaLlegada(p);
      // Ocho minutos de crucero desde que se entra, y la apertura con el anuncio son dos y cuarto.
      expect(crucero, mes).toBeGreaterThan(3 * EL_ANUNCIO.hasta);
    }
  });

  it("y con el punto de descenso en cualquier sitio desde el anuncio, Ara lo nota a tiempo y nada se pierde ni se repite: aquí no hay nada que parar", () => {
    const cruceros = [...Array.from({ length: 41 }, (_, i) => EL_ANUNCIO.desde + 0.5 + 1.5 * i), 200, 300, 490, 700];
    for (const conLaConsola of [false, true])
      for (const crucero of cruceros) {
        const { dichas, e } = volar(crucero, conLaConsola);
        const claves = dichas.map((d) => d.clave);
        const que = `crucero de ${crucero.toFixed(1)} s${conLaConsola ? ", con la consola" : ""}`;
        const nota = dichas.find((d) => d.clave === "inicio.ara.pasaje.ralenti")?.desde ?? NaN;
        expect(nota - crucero, que).toBeGreaterThanOrEqual(0);
        expect(nota - crucero, que).toBeLessThan(A_TIEMPO);
        expect(claves.indexOf("inicio.ara.pasaje.ralenti"), que).toBeLessThan(claves.indexOf("tripulacion.cinturones"));
        if (conLaConsola) expect(claves, que).toContain("inicio.tripulacion.pasaje.cerca.largo.consolaBoton");
        expect(claves, que).toContain("inicio.ara.pasaje.bostezo");
        // Cada frase una vez, nada cortado y ningún momento saltado.
        expect(claves.filter((c, i) => claves.indexOf(c) !== i), que).toEqual([]);
        expect(dichas.filter((d) => d.hasta < d.desde + dura({ quien: "ara", clave: d.clave }) - 0.2 && d.clave !== "comandante.largo.anuncio").map((d) => d.clave), que).toEqual([]);
        expect(e.estado.saltados, que).toEqual([]);
      }
  });
});
