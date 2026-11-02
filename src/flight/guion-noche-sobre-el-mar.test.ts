/**
 * El segundo capítulo: la entrada, las cifras de las islas, los pasos del guion, lo que
 * se nombra y lo que se recoge. El vuelo de verdad lo vuela
 * `scripts/verificar-inicio-4.mjs`, con `OGA_CAPITULO=2`.
 */

import { describe, expect, it } from "vitest";
import ARA from "../../data/voces/ara/manifiesto.json";
import COMANDANTE from "../../data/voces/comandante/manifiesto.json";
import DERLIS from "../../data/voces/tripulacion/manifiesto.json";
import TRIPULANTE from "../../data/voces/tripulacion-canarias/manifiesto.json";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { dondeCae } from "../world/entre-aerodromos";
import type { Linea } from "./conversacion";
import { GUION_NOCHE_SOBRE_EL_MAR, ISLAS_DE_LA_NOCHE } from "./guion-noche-sobre-el-mar";
import { GUION_LLEGADA_A_ASUNCION, SE_DESAYUNA_A } from "./guion-llegada-a-asuncion";
import { planDeLaNoche } from "./noche-en-el-mapa";
import { MotorDelPasaje, type DelVueloLargo, type LecturaDelPasaje, type SitioDelPaisaje, type VistaDelSitio } from "./motor-del-pasaje";
import {
  cuandoPasa,
  DE_MADRID_A_ASUNCION,
  dondeVa,
  entradaDeLaLlegada,
  entradaDeLaNoche,
  ENTRA_LA_NOCHE_ANTES,
  horarioDelDia,
  NIVELES_DE_CRUCERO,
  PASA_EL_HIERRO,
  perfilDelVuelo,
  respectoALaRuta,
  SITIOS_DEL_CAMINO,
  solEnElVuelo,
} from "./ruta-larga";
import { destinoDelSalto, mundoDelTramo } from "./salto-bajo-tapa";
import { VECINOS_A_LA_VEZ } from "../world/vecinos-del-vuelo";

/** Node, que las pruebas corren en él: el proyecto no lleva sus tipos. Como en `ui/ilustraciones.test.ts`. */
const { readFileSync } = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string, cod: string): string };

const DT = 1 / 10;
const VERANO = perfilDelVuelo(horarioDelDia(new Date("2026-07-15T12:00:00Z")));
const INVIERNO = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
/** Dieciocho veces sus dieciocho kilómetros, y la mitad: ver `TENERIFE_NORTE`. */
const EL_MUNDO_LLEGA_A = 162_000;

describe("las islas, respecto a la ruta", () => {
  it("El Hierro, debajo; Tenerife, a 73 km a la izquierda; La Palma, a 43 km a la derecha", () => {
    const { valverde, tenerife, laPalma } = SITIOS_DEL_CAMINO;
    expect(respectoALaRuta(DE_MADRID_A_ASUNCION, valverde).lado / 1000).toBeCloseTo(-2.2, 1);
    expect(respectoALaRuta(DE_MADRID_A_ASUNCION, tenerife).lado / 1000).toBeCloseTo(-72.9, 1);
    expect(respectoALaRuta(DE_MADRID_A_ASUNCION, laPalma).lado / 1000).toBeCloseTo(43.4, 1);
  });

  it("y se pasa por encima a las 2 h 24 del despegue, en verano y en invierno", () => {
    expect(cuandoPasa(VERANO, PASA_EL_HIERRO) / 3600).toBeCloseTo(2.4, 1);
    expect(cuandoPasa(INVIERNO, PASA_EL_HIERRO) / 3600).toBeCloseTo(2.4, 1);
  });
});

describe("la entrada", () => {
  it("cae hacia las 2 h 05, en crucero, al primer nivel y antes de pasar nada", () => {
    for (const p of [VERANO, INVIERNO]) {
      const t = entradaDeLaNoche(p);
      const d = dondeVa(p, t);
      expect(t / 3600).toBeGreaterThan(2);
      expect(t / 3600).toBeLessThan(2.15);
      expect(d.fase).toBe("crucero");
      expect(d.altitud).toBe(NIVELES_DE_CRUCERO[0]);
      expect(d.recorrido).toBeCloseTo(PASA_EL_HIERRO - ENTRA_LA_NOCHE_ANTES, -1);
      expect(respectoALaRuta(p.ruta, SITIOS_DEL_CAMINO.tenerife).recorrido).toBeGreaterThan(d.recorrido);
    }
  });

  it("dentro del mundo de Tenerife Norte, y de noche también en verano", () => {
    for (const p of [VERANO, INVIERNO]) {
      const { x, z } = dondeCae(SITIOS_DEL_CAMINO.tenerife, dondeVa(p, entradaDeLaNoche(p)).sitio);
      expect(Math.abs(x)).toBeLessThan(EL_MUNDO_LLEGA_A);
      expect(Math.abs(z)).toBeLessThan(EL_MUNDO_LLEGA_A);
      expect(solEnElVuelo(p, entradaDeLaNoche(p)).deNoche).toBe(true);
    }
  });

  it("las islas de abajo no pasan del tope de vecinos medido", () => {
    expect(ISLAS_DE_LA_NOCHE.length).toBeLessThanOrEqual(VECINOS_A_LA_VEZ);
  });
});

describe("el salto de la noche", () => {
  it("cae en el mismo sitio y a la misma hora que abre el tercer capítulo: un punto y un mundo, no dos", () => {
    for (const p of [VERANO, INVIERNO]) {
      const hasta = destinoDelSalto(p, cuandoPasa(p, PASA_EL_HIERRO + 40_000), entradaDeLaLlegada(p));
      expect(hasta).toBe(entradaDeLaLlegada(p));
      const mundos = [
        { id: "tenerife-norte", origen: SITIOS_DEL_CAMINO.tenerife },
        { id: "pettirossi", origen: p.ruta.hasta },
      ];
      expect(mundoDelTramo(mundos, dondeVa(p, hasta!).sitio)?.id).toBe("pettirossi");
    }
  });
});

describe("el guion", () => {
  const GRABADAS = new Set(
    [ARA, TRIPULANTE, DERLIS, COMANDANTE].flatMap((m) => Object.keys(m.piezas)),
  );
  const consola = GUION_NOCHE_SOBRE_EL_MAR.consola!;
  const lasFrases = (): readonly Linea[] => [
    ...GUION_NOCHE_SOBRE_EL_MAR.momentos.flatMap((m) => m.lineas),
    consola.seRecoge,
  ];
  const texto = (l: Linea): string => String(ES_PY[l.clave as keyof typeof ES_PY]);

  it("cada frase, con su texto en los dos idiomas y en la lista de grabar; y treinta nuevas como mucho", () => {
    const lista = readFileSync("scripts/frases-para-grabar.mjs", "utf8");
    const nuevas = lasFrases().filter((f) => !GRABADAS.has(f.clave));
    expect(nuevas.length).toBeLessThanOrEqual(30);
    for (const f of lasFrases()) {
      expect(ES_PY[f.clave as keyof typeof ES_PY], f.clave).toBeTruthy();
      expect(EN[f.clave as keyof typeof EN], f.clave).toBeTruthy();
    }
    for (const f of nuevas) expect(lista, f.clave).toContain(`"${f.clave}"`);
  });

  it("no queda nada de lo de prueba", () => {
    const claves = lasFrases().map((f) => f.clave);
    for (const k of ["marAbajo", "cerca.estrellas", "cerca.persiana", "cerca.ruta", "pasaje.mapa"])
      expect(claves.filter((c) => c.endsWith(k)), k).toEqual([]);
  });

  it("lo de la salud, como lo dice la OMS: ni que el avión deshidrata, ni pastillas para dormir", () => {
    const todo = lasFrases().map(texto).join(" ");
    expect(todo).not.toMatch(/deshidrat|beber mucho|pastilla|melatonina/i);
    expect(texto(lasFrases().find((f) => f.clave.endsWith("derlis.aguaCena"))!)).toMatch(/vasito de agua.*sed/);
  });

  it("la recogida de este capítulo no dice que se va bajando", () => {
    expect(consola.seRecoge.clave).not.toBe(GUION_LLEGADA_A_ASUNCION.consola!.seRecoge.clave);
    expect(texto(consola.seRecoge)).not.toMatch(/bajando/);
    expect(texto(consola.seRecoge)).toMatch(/bajar las luces/);
  });

  it("las suyas y las del capítulo que sigue, ya bajadas antes de caer en ellas", () => {
    expect(GUION_NOCHE_SOBRE_EL_MAR.apertura?.laminas).toEqual(["cena", "manta", "medio-despertar", ...GUION_LLEGADA_A_ASUNCION.apertura!.laminas]);
  });

  interface ComoSeVuela {
    readonly ver?: (sitio: SitioDelPaisaje) => VistaDelSitio;
    readonly tocable?: boolean;
    /** Lo que se toca de la consola en cuanto sale. */
    readonly enLaConsola?: "mapa" | "juegos";
    /** Si el dibujo contesta al recoger; sin él, la red. */
    readonly contesta?: boolean;
  }

  /** Vuela lo que dura el capítulo con una voz de un segundo por frase, hasta que Ara se duerma. */
  function hastaDormirse(como: ComoSeVuela = {}): {
    readonly escena: MotorDelPasaje;
    readonly orden: readonly string[];
    readonly planos: readonly string[];
    readonly tapas: readonly (string | null)[];
    readonly dichas: readonly string[];
    readonly modos: readonly string[];
    readonly lucesBajasAlDecirlas: boolean;
    readonly lucesBajasAntes: boolean;
    readonly marcadoCon: ReadonlySet<string>;
    /** Sigue la noche, hasta que suelte el salto, con la voz diciendo lo suyo o sin contestar. */
    readonly seguirLaNoche: (lasVocesContestan: boolean) => {
      readonly dichas: readonly string[];
      readonly tapas: readonly (string | null)[];
      readonly horas: readonly number[];
      readonly pared: number;
      readonly dings: number;
    };
  } {
    let t = 0;
    let contestan = true;
    const dichas: string[] = [];
    let acaba: { fin: number; alAcabar: (esperaMas: number) => void } | null = null;
    const voz = {
      decir: (linea: Linea, alAcabar: (esperaMas: number) => void) => {
        dichas.push(linea.clave);
        acaba = contestan ? { fin: t + 1, alAcabar } : null;
      },
      callar: () => {
        acaba = null;
      },
    };
    const escena = new MotorDelPasaje(voz, GUION_NOCHE_SOBRE_EL_MAR, {
      pared: () => t,
      conPantalla: true,
    }) as unknown as MotorDelPasaje;
    const delVuelo: Omit<DelVueloLargo, "recorrido"> = {
      temporada: "invierno",
      conSolAlDesayunar: true,
      sol: -80,
      solPorMiVentanilla: false,
      entraLaLlegada: entradaDeLaLlegada(INVIERNO),
      planDeLaNoche: planDeLaNoche(INVIERNO, cuandoPasa(INVIERNO, PASA_EL_HIERRO + 20_000), SE_DESAYUNA_A),
      anuncioDeLaBajada: () => ({ clave: "", texto: "", relleno: {} }),
    };
    let lucesBajasAntes = false;
    let lucesBajasAlDecirlas = false;
    const marcadoCon = new Set<string>();
    const planos: string[] = [];
    const orden: string[] = [];
    const tapas: (string | null)[] = [];
    const modos: string[] = [];
    let tocada = false;
    for (let recorrido = PASA_EL_HIERRO - ENTRA_LA_NOCHE_ANTES; t < 1800 && !escena.durmiendo; recorrido += 231 * DT) {
      t += DT;
      if (acaba && t >= (acaba as { fin: number }).fin) {
        const a = acaba as { alAcabar: (esperaMas: number) => void };
        acaba = null;
        a.alAcabar(0);
      }
      const l: LecturaDelPasaje = {
        tramo: "crucero",
        enTramo: 60,
        motor: true,
        enTierra: false,
        porElSuelo: 231,
        altura: 10_972,
        altitud: 10_972,
        vertical: 0,
        autorizado: false,
        flaps: 0,
        nubes: null,
        enNube: 0,
        cabina: 0,
        faltaParaTocar: 8_000_000,
        hastaLaBajada: 30_000,
        largo: { ...delVuelo, recorrido },
        ...(como.ver ? { ver: como.ver } : {}),
        ...(como.tocable ? { tocable: true } : {}),
      };
      escena.paso(DT, l);
      const c = escena.consola!;
      if (como.enLaConsola && !tocada && c.estado.sale) {
        tocada = true;
        c.abrir();
        if (como.enLaConsola !== "mapa") c.elegir(como.enLaConsola);
      }
      if (como.contesta && c.estado.recogiendo) c.yaRecogida();
      const e = escena.estado;
      if (!e.dichos.includes("luces") && escena.lucesBajas) lucesBajasAntes = true;
      if (e.dichos.includes("luces") && escena.lucesBajas) lucesBajasAlDecirlas = true;
      if (escena.marcaDeLaPantalla && e.linea) marcadoCon.add(e.linea.clave);
      if (planos.at(-1) !== e.plano) planos.push(e.plano);
      if (tapas.at(-1) !== e.tapa) tapas.push(e.tapa);
      if (modos.at(-1) !== c.modoDeAhora) modos.push(c.modoDeAhora);
      for (const m of e.dichos) if (!orden.includes(m)) orden.push(m);
    }
    const seguirLaNoche = (lasVocesContestan: boolean) => {
      contestan = lasVocesContestan;
      const lectura = (recorrido: number): LecturaDelPasaje => ({
        tramo: "crucero",
        enTramo: 60,
        motor: true,
        enTierra: false,
        porElSuelo: 231,
        altura: 10_972,
        altitud: 10_972,
        vertical: 0,
        autorizado: false,
        flaps: 0,
        nubes: null,
        enNube: 0,
        cabina: 0,
        faltaParaTocar: 8_000_000,
        hastaLaBajada: 30_000,
        largo: { ...delVuelo, recorrido },
      });
      const desde = t;
      const antes = dichas.length;
      const lasTapas: (string | null)[] = [escena.estado.tapa];
      const horas: number[] = [];
      for (; t < desde + 200 && escena.laNocheRetieneElSalto; ) {
        t += DT;
        if (acaba && t >= (acaba as { fin: number }).fin) {
          const a = acaba as { alAcabar: (esperaMas: number) => void };
          acaba = null;
          a.alAcabar(0);
        }
        escena.paso(DT, lectura(PASA_EL_HIERRO + 40_000));
        const e = escena.estado;
        if (lasTapas.at(-1) !== e.tapa) lasTapas.push(e.tapa);
        if (e.noche) horas.push(e.noche.hora);
      }
      return { dichas: dichas.slice(antes), tapas: lasTapas, horas, pared: t - desde, dings: escena.estado.noche?.dings ?? 0 };
    };
    return { escena, orden, planos, tapas, dichas, modos, lucesBajasAlDecirlas, lucesBajasAntes, marcadoCon, seguirLaNoche };
  }

  it("la cabina baja las luces al anunciarlo, no antes, y es cosa de este guion", () => {
    const { lucesBajasAntes, lucesBajasAlDecirlas, escena } = hastaDormirse();
    expect(lucesBajasAntes).toBe(false);
    expect(lucesBajasAlDecirlas).toBe(true);
    expect(escena.lucesBajas).toBe(true);
    expect(GUION_LLEGADA_A_ASUNCION.lucesBajanCon).toBeUndefined();
  });

  it("la marca sale con lo que cuenta Idaira de El Hierro, en todas sus frases, y se va al acabar", () => {
    const { marcadoCon, escena } = hastaDormirse();
    // En el paso en que se pide, la última dicha aún es la de antes, y el plano ya es otro.
    expect([...marcadoCon].filter((c) => c !== "inicio.ara.pasaje.largo.tenerife")).toEqual([
      "inicio.tripulacion.pasaje.cerca.largo.hierroEncima",
      "inicio.ara.pasaje.largo.hierroNoSeVe",
      "inicio.tripulacion.pasaje.cerca.largo.hierroDebajo",
      "inicio.tripulacion.pasaje.cerca.largo.meridiano",
      "inicio.tripulacion.pasaje.cerca.largo.greenwich",
    ]);
    expect(escena.marcaDeLaPantalla).toBeNull();
  });

  it("la noche: se va la manta, corre el mapa, suena el ding una vez, hablan en su orden, y vuelve a dormirse", () => {
    const { seguirLaNoche, escena } = hastaDormirse();
    expect(escena.nocheEnElMapa).not.toBeNull();
    // Mientras dure, la ventanita no pone otro mapa encima.
    expect(escena.estado.dibujo).not.toBe("ruta");
    const r = seguirLaNoche(true);
    expect(r.tapas).toEqual(["manta", null, "medio-despertar", null]);
    expect(r.dichas).toEqual([
      "inicio.ara.pasaje.largo.medioDespertar",
      "inicio.tripulacion.pasaje.cerca.largo.nubesAltas",
      "inicio.tripulacion.pasaje.cerca.largo.nubesCinturon",
      "inicio.ara.pasaje.largo.sigoDurmiendo",
    ]);
    expect(r.dings).toBe(1);
    expect(escena.tomarElDing()).toBe(true);
    expect(escena.tomarElDing()).toBe(false);
    expect(r.horas.at(-1)).toBe(SE_DESAYUNA_A);
    expect(r.horas.every((h, i) => i === 0 || h >= r.horas[i - 1]!)).toBe(true);
    expect(r.pared).toBeLessThan(60);
    // Y lo demás sigue siendo de la siesta: Ara no se ha despertado, y el salto sigue pedido.
    expect(escena.durmiendo).toBe(true);
    expect(escena.saltoPedido).toBe(entradaDeLaLlegada(INVIERNO));
    expect(escena.estado.noche?.porElTope).toBe(false);
  });

  it("y si las voces no contestan, se suelta por el tope: nadie se queda en la siesta", () => {
    const { seguirLaNoche, escena } = hastaDormirse();
    const r = seguirLaNoche(false);
    expect(escena.laNocheRetieneElSalto).toBe(false);
    expect(r.pared).toBeLessThan(90);
    expect(r.tapas.at(-1)).toBeNull();
  });

  it("si el salto se deja, la noche se va con él, y no se queda esperando un mapa que no acaba en nada", () => {
    const { escena } = hastaDormirse();
    escena.saltoDejado();
    expect(escena.nocheEnElMapa).toBeNull();
    expect(escena.laNocheRetieneElSalto).toBe(false);
  });

  it("arranca tapado, y pasa por la cena, la ventanilla, Tenerife, El Hierro y las luces, en su orden", () => {
    const { orden, tapas } = hastaDormirse();
    expect(orden).toEqual(["cena", "cocina", "agua", "ventanilla", "tenerife", "hierro", "luces", "manta"]);
    expect(tapas).toEqual(["cena", null, "manta"]);
  });

  it("El Hierro, en la pantalla del asiento y enseñando el trozo de cerca; nunca mirando abajo por el cristal", () => {
    const { planos, modos, escena } = hastaDormirse();
    expect(planos).toContain("respaldo");
    expect(planos).not.toContain("asomado-abajo");
    expect(modos).toEqual(["mapa", "cerca"]);
    expect(escena.estado.nombrados.map((n) => n.sitio)).toEqual(["luces-de-tenerife"]);
  });

  it("Tenerife, solo si se ve: si hoy no, Ara no la nombra y sigue lo demás", () => {
    const nada: VistaDelSitio = { como: null, lado: null };
    const { escena, dichas, orden } = hastaDormirse({ ver: () => nada });
    expect(escena.estado.saltados).toContain("tenerife");
    expect(dichas).not.toContain("inicio.ara.pasaje.largo.tenerife");
    expect(escena.estado.nombrados).toEqual([]);
    expect(orden).toEqual(["cena", "cocina", "agua", "ventanilla", "hierro", "luces", "manta"]);
    expect(escena.durmiendo).toBe(true);
  });

  it("y si se ve, la nombra con lo que se ve, por su lado", () => {
    const { escena, dichas } = hastaDormirse({ ver: () => ({ como: "asomado", lado: "izquierda" }) });
    expect(dichas).toContain("inicio.ara.pasaje.largo.tenerife");
    expect(escena.estado.nombrados[0]).toMatchObject({ sitio: "luces-de-tenerife", como: "asomado", lado: "izquierda" });
  });

  it("aquí no se invita a tocar, aunque el juego diga que hay algo a la vista", () => {
    const { dichas } = hastaDormirse({ tocable: true });
    expect(dichas).not.toContain("inicio.ara.pasaje.toque.invita");
    // Y es de este guion: los demás siguen invitando.
    expect(GUION_LLEGADA_A_ASUNCION.sinInvitarATocar).toBeUndefined();
  });

  it("la consola sale al abrirse la ventanilla y se va al bajar las luces, también sin abrirla", () => {
    const { escena, dichas } = hastaDormirse();
    const c = escena.consola!.estado;
    expect(c.recogida).toBe(true);
    expect(c.sale).toBe(false);
    // Cerrada, no hay nada que pedir que se guarde.
    expect(dichas).not.toContain(consola.seRecoge.clave);
  });

  for (const contesta of [true, false])
    it(`con la pantalla abierta al bajar las luces, se recoge con su frase y Ara se duerme igual (${contesta ? "el dibujo contesta" : "por la red"})`, () => {
      const { escena, dichas, orden } = hastaDormirse({ enLaConsola: "mapa", contesta });
      const c = escena.consola!.estado;
      expect(c.abierta).toBe(false);
      expect(c.recogida).toBe(true);
      expect(c.porElTope).toBe(!contesta);
      expect(dichas.indexOf(consola.seRecoge.clave)).toBeGreaterThan(-1);
      expect(dichas.indexOf(consola.seRecoge.clave)).toBeLessThan(dichas.indexOf("comandante.largo.luces"));
      expect(orden).toContain("hierro");
      expect(escena.durmiendo).toBe(true);
    });

  it("con un juego abierto, El Hierro no se cuenta encima, y se recoge y se duerme igual: nadie se queda atrapado", () => {
    const { escena, dichas, orden } = hastaDormirse({ enLaConsola: "juegos", contesta: true });
    expect(escena.estado.saltados).toContain("hierro");
    expect(orden).not.toContain("hierro");
    expect(dichas).not.toContain("inicio.tripulacion.pasaje.cerca.largo.hierroEncima");
    expect(dichas).toContain(consola.seRecoge.clave);
    expect(escena.kit.estaAbierto).toBe(false);
    expect(escena.consola!.estado.abierta).toBe(false);
    expect(escena.durmiendo).toBe(true);
  });

  it("y se duerme, pidiendo saltar a la hora del despertar", () => {
    const { escena } = hastaDormirse();
    expect(escena.durmiendo).toBe(true);
    expect(escena.saltoPedido).toBe(entradaDeLaLlegada(INVIERNO));
    expect(escena.sigueOtroCapitulo).toBe(true);
  });

  it("del salto no se despierta con la frase de aquí, que abre el capítulo que sigue", () => {
    const { escena } = hastaDormirse();
    const antes = escena.registro.length;
    escena.trasElSalto();
    expect(escena.durmiendo).toBe(false);
    expect(escena.estado.linea?.clave).not.toBe(GUION_NOCHE_SOBRE_EL_MAR.siesta.seDespierta.clave);
    expect(escena.registro.length).toBe(antes);
  });
});
