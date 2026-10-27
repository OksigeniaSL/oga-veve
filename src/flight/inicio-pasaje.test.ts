/**
 * La tercera escena del modo inicio, el primer vuelo de pasaje de Ara: que
 * cada cosa se diga en su momento del vuelo y en su orden, que nada se pise,
 * que la tripulación no arranque, ni ruede, ni entre en pista antes de lo
 * que en un avión de verdad espera a la cabina de pasaje, que lo que pregunta
 * Ara lo contesten anuncios para todo el pasaje —y después—, que lo de la
 * ventanilla se diga arriba y por el lado de Ara, y que nada de lo que se
 * dice diga si Ara es niño o niña. Ver `flight/inicio-pasaje.ts`.
 *
 * El vuelo es de mentira: una tripulación que obedece los permisos de la
 * escena y pasa por los tramos de un vuelo de Los Rodeos a La Palma a su
 * ritmo. La tripulación de verdad la prueba `vuelo-de-linea.test.ts`, y las
 * dos juntas en el navegador, `scripts/verificar-inicio-3.mjs`.
 */

import { describe, expect, it } from "vitest";
import { BAJANDO_A_LA_PISTA } from "../audio/hilo-musical";
import { seLePasoElMomento } from "../audio/megafonia";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";
import { Conversacion, ENTRE_FRASES, TOPE_DE_UNA_FRASE, type Linea } from "./conversacion";
import { esDeLaEscena, VOZ_DE } from "./inicio";
import {
  ADELANTO,
  EMPIEZA_LA_LLEGADA,
  CHARLAS_DEL_PASAJE,
  CORTE_DE_PLANO,
  DIEZ_MIL_PIES,
  DURA_EL_PLANO,
  esAnuncioDeSiempre,
  esDeCerca,
  esDeFuera,
  GUION_DEL_PASAJE,
  LINEAS_DEL_PASAJE,
  proyectar,
  RED_DE_LA_ESPERA,
  VueloDePasaje,
  type LecturaDelPasaje,
  type MomentoDelPasaje,
  type Plano,
  type Senalado,
  type SitioDelPaisaje,
  type Tocable,
  type VistaDelSitio,
} from "./inicio-pasaje";
import { REDUCE_EL_GAS, type PermisosDeLaEscena, type PotenciaDeLinea, type TramoDeLinea } from "./vuelo-de-linea";
import { DIBUJOS_DEL_PASAJE, esDibujoDelPasaje } from "../ui/dibujos-del-pasaje";
import { ilustracion, ilustracionPedida, RECETAS } from "../ui/ilustraciones";
import { JuegoDelAvion, LUCES, NIVELES } from "./kit-de-viaje";
import { LINEAS_DE_LA_VENTANILLA_VIVA } from "./lo-que-se-toca";
import type { Fase } from "./vuelo";
import { FORMAS_CON_GRACIA, GRACIA, type FormaDeLaDemostracion } from "./demostracion-con-gracia";

const DT = 1 / 10;
const entorno = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;

/** Lo que se dice, con su hora: una voz que tarda lo que tarde cada frase. */
interface Dicha {
  readonly linea: Linea;
  readonly desde: number;
  hasta: number | null;
}

/** Una voz de mentira: cada frase dura `dura` segundos de reloj de la prueba. */
function vozQueTarda(dura: (l: Linea) => number, reloj: () => number) {
  const dichas: Dicha[] = [];
  let sonando: { fin: number; alAcabar: (n: number) => void; d: Dicha } | null = null;
  return {
    dichas,
    voz: {
      decir: (linea: Linea, alAcabar: (esperaMas: number) => void) => {
        const d: Dicha = { linea, desde: reloj(), hasta: null };
        dichas.push(d);
        sonando = { fin: reloj() + dura(linea), alAcabar, d };
      },
      callar: () => {
        if (sonando) sonando.d.hasta = reloj();
        sonando = null;
      },
    },
    /** Pasa el tiempo: lo que acaba, acaba. */
    tic: () => {
      if (sonando && reloj() >= sonando.fin) {
        const s = sonando;
        sonando = null;
        s.d.hasta = reloj();
        s.alAcabar(0);
      }
    },
  };
}

/**
 * **Una tripulación de mentira** que obedece los permisos de la escena y pasa
 * por los tramos de un vuelo de línea corto, con sus alturas y sus tiempos.
 */
class VueloDeMentira {
  tramo: TramoDeLinea = "puerta";
  enTramo = 0;
  motor = false;
  enTierra = true;
  porElSuelo = 0;
  altura = 0;
  altitud = 632;
  vertical = 0;
  autorizado = false;
  flaps = 0;
  /** Los aerofrenos de tierra: suben en un segundo al tocar y se recogen al rodar. */
  frenosDeTierra = 0;
  cabina = 0;
  falta = 200000;
  arrancoA: number | null = null;
  rodoA: number | null = null;
  entroA: number | null = null;
  despegoA: number | null = null;
  /** Cuándo tocaron las ruedas, s de la prueba. */
  tocoA: number | null = null;
  alineado = false;

  /**
   * Con `deUnSalto`, la carrera dura un segundo: para ver qué se salta. Con
   * `entreNubes`, la subida pasa entre las nubes sin meterse en ninguna. Y con
   * `conPrisa`, da gas en cuanto se alinea, sin esperar a la cabina.
   */
  constructor(
    private readonly deUnSalto = false,
    private readonly entreNubes = false,
    private readonly conPrisa = false,
    /**
     * Y con `faseTardia`, la fase del juego, que se queda en «arrancando» unos
     * segundos después de echar a rodar: como la del juego, que cambia con su
     * histéresis.
     */
    private readonly faseTardia = false,
  ) {}

  private get fase(): Fase | undefined {
    if (!this.faseTardia) return undefined;
    const tramos: Partial<Record<TramoDeLinea, Fase>> = {
      puerta: "estacionado",
      arrancando: "arrancando",
      rodando: this.enTramo < 4 ? "arrancando" : "rodando",
      esperando: this.autorizado ? "autorizado" : "esperando",
      entrando: "alineando",
      carrera: "despegando",
      final: "final",
      frenando: "aterrizado",
      "al-puesto": "a-plataforma",
      aparcado: "en-puesto",
      apagado: "en-puesto",
    };
    return tramos[this.tramo] ?? "en-vuelo";
  }

  private pasar(t: TramoDeLinea): void {
    this.tramo = t;
    this.enTramo = 0;
  }

  paso(dt: number, p: PermisosDeLaEscena, t: number): void {
    this.enTramo += dt;
    switch (this.tramo) {
      case "puerta":
        if (p.arrancar) {
          this.motor = true;
          this.arrancoA = t;
          this.pasar("arrancando");
        }
        break;
      case "arrancando":
        if (this.enTramo >= 12 && p.rodar) {
          this.rodoA = t;
          this.pasar("rodando");
          this.porElSuelo = 8;
        }
        break;
      case "rodando":
        if (this.enTramo >= 70) {
          this.porElSuelo = 0;
          this.pasar("esperando");
        }
        break;
      case "esperando":
        if (this.enTramo >= 6) this.autorizado = true;
        if (this.autorizado && p.entrar) {
          this.entroA = t;
          this.pasar("entrando");
        }
        break;
      case "entrando":
        if (this.enTramo >= 10) this.alineado = true;
        if (this.alineado && (p.despegar || this.conPrisa)) {
          this.despegoA = t;
          this.alineado = false;
          this.pasar("carrera");
        }
        break;
      case "carrera":
        this.porElSuelo += (this.deUnSalto ? 80 : 2.4) * dt;
        if (this.porElSuelo >= 78) {
          this.enTierra = false;
          this.vertical = 11;
          this.pasar("subida");
        }
        break;
      case "subida":
        this.altitud += 11 * dt;
        this.altura += 11 * dt;
        this.falta -= 130 * dt;
        this.cabina = 2;
        if (this.altitud >= 4877) {
          this.vertical = 0;
          this.cabina = 0;
          this.pasar("crucero");
        }
        break;
      case "crucero":
        this.falta -= 200 * dt;
        if (this.enTramo >= 260) {
          this.vertical = -8;
          this.cabina = -1.2;
          this.pasar("bajada");
        }
        break;
      case "bajada":
      case "final":
        this.altitud = Math.max(33, this.altitud - 8 * dt);
        this.altura = this.altitud - 33;
        this.falta -= 150 * dt;
        if (this.falta < 26000) this.flaps = Math.min(1, this.flaps + dt / 9);
        if (this.tramo === "bajada" && this.falta < 15000) this.pasar("final");
        if (this.altura < 9) {
          this.pasar("frenando");
          this.tocoA = t;
          this.enTierra = true;
          this.altura = 0;
          this.vertical = 0;
          this.porElSuelo = 60;
        }
        break;
      case "frenando":
        this.porElSuelo = Math.max(12, this.porElSuelo - 2 * dt);
        this.frenosDeTierra = Math.min(1, this.frenosDeTierra + dt);
        if (this.enTramo >= 20) {
          this.porElSuelo = 8;
          this.frenosDeTierra = 0;
          this.pasar("al-puesto");
        }
        break;
      case "al-puesto":
        if (this.enTramo >= 60) {
          this.porElSuelo = 0;
          this.pasar("aparcado");
        }
        break;
      case "aparcado":
        if (this.enTramo >= 6) {
          this.motor = false;
          this.pasar("apagado");
        }
        break;
      default:
        break;
    }
  }

  get lectura(): LecturaDelPasaje {
    return {
      tramo: this.tramo,
      enTramo: this.enTramo,
      motor: this.motor,
      enTierra: this.enTierra,
      porElSuelo: this.porElSuelo,
      altura: this.altura,
      altitud: this.altitud,
      vertical: this.vertical,
      autorizado: this.autorizado,
      flaps: this.flaps,
      frenosDeTierra: this.frenosDeTierra,
      nubes: { base: 1532, techo: 1982 },
      // Una nube entre los 1.600 y los 1.800 m, si se sube por dentro de ella.
      enNube: !this.entreNubes && this.altitud > 1600 && this.altitud < 1800 ? 0.6 : 0,
      cabina: this.cabina,
      faltaParaTocar: this.falta,
      alineado: this.tramo === "entrando" && this.alineado,
      fase: this.fase,
    };
  }
}

const sitio = (que: string, lado: "izquierda" | "derecha"): Senalado => ({
  que,
  lado,
  dicho: { texto: `Ese es ${que}.`, clave: "ventanilla", relleno: { que: `ventanilla.${que}` } },
  historia: que === "teide" ? { texto: "Y su historia.", clave: "ventanilla.historia", relleno: {} } : null,
});

interface Corrido {
  readonly escena: VueloDePasaje;
  readonly vuelo: VueloDeMentira;
  readonly dichas: Dicha[];
  readonly t: number;
}

/** Vuela la escena entera con la tripulación de mentira y una voz que tarda `dura`. */
function correr(
  dura: (l: Linea) => number,
  opciones: {
    sitios?: boolean;
    seguir?: boolean;
    deUnSalto?: boolean;
    entreNubes?: boolean;
    conPrisa?: boolean;
    faseTardia?: boolean;
    demostracion?: FormaDeLaDemostracion;
  } = {},
): Corrido {
  let t = 0;
  const v = vozQueTarda(dura, () => t);
  const forma = opciones.demostracion;
  const escena = new VueloDePasaje(v.voz, { lado: "izquierda", ...(forma ? { demostracion: () => forma } : {}) });
  const vuelo = new VueloDeMentira(opciones.deUnSalto, opciones.entreNubes, opciones.conPrisa, opciones.faseTardia);
  const porSenalar = opciones.sitios ? [sitio("orotava", "izquierda"), sitio("teide", "izquierda"), sitio("hierro", "derecha"), sitio("garajonay", "izquierda")] : [];
  for (; t < 3000; t += DT) {
    v.tic();
    const p = escena.paso(DT, vuelo.lectura);
    vuelo.paso(DT, p, t);
    if (porSenalar.length && escena.puedeSenalar) escena.senalar(porSenalar.shift()!);
    if (escena.estado.puedeSeguir && opciones.seguir !== false) escena.seguir();
    if (escena.estado.terminado) break;
  }
  return { escena, vuelo, dichas: v.dichas, t };
}

const claves = (r: Corrido): string[] => r.dichas.map((d) => d.linea.clave);
const indice = (r: Corrido, clave: string): number => claves(r).indexOf(clave);

describe("el guion", () => {
  it("cada frase nueva tiene su texto en castellano paraguayo y en inglés, y ninguna es corta", () => {
    expect(LINEAS_DEL_PASAJE.length).toBeGreaterThanOrEqual(20);
    for (const l of LINEAS_DEL_PASAJE) {
      const es = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(es, l.clave).toBeTruthy();
      expect(EN[l.clave as keyof typeof EN], l.clave).toBeTruthy();
      // Con chispa, una frase muy corta se inventa lo que falta: docs/voces/LEEME.md.
      expect(es.length, l.clave).toBeGreaterThanOrEqual(30);
    }
  });

  it("cada uno con su voz: Ara la suya, la comandante y la tripulación por la megafonía", () => {
    // La tripulación de Canarias: el vuelo es de Los Rodeos a La Palma.
    expect(VOZ_DE.tripulacion).toBe("tripulacion-canarias");
    for (const l of LINEAS_DEL_PASAJE) {
      expect(esDeLaEscena(l.clave), l.clave).toBe(true);
      if (l.quien === "ara") {
        expect(l.clave.startsWith("inicio.ara.pasaje."), l.clave).toBe(true);
        expect(l.megafonia, l.clave).toBeFalsy();
      } else if (esDeCerca(l)) {
        // La tripulante en persona: sin altavoz, y con su clave de cerca.
        expect(l.quien, l.clave).toBe("tripulacion");
        expect(l.clave.startsWith("inicio.tripulacion.pasaje.cerca."), l.clave).toBe(true);
      } else {
        expect(l.megafonia, l.clave).toBe(true);
        expect(l.clave.startsWith(l.quien === "mama" ? "inicio.mama.pasaje." : "inicio.tripulacion.pasaje.")).toBe(true);
        expect(l.clave, l.clave).not.toMatch(/\.cerca\./);
      }
    }
  });

  /*
   * **La comandante no le contesta a un pasajero por la megafonía.** Lo suyo,
   * y lo de la tripulación, se le dice a todo el pasaje y de usted: sin voseo
   * y sin nombrar a nadie. Y cada anuncio empieza saludando a todo el pasaje
   * —«señoras y señores», «para quienes vuelan hoy por primera vez»—; lo que
   * sigue en el mismo anuncio, como cada cosa de la demostración, ya no.
   */
  it("lo de la megafonía es para todo el pasaje, de usted y sin voseo", () => {
    const voseo = /\b(vos|mirá|escuchá|tenés|querés|sabés|podés|tu|te|ti)\b/i;
    for (const l of LINEAS_DEL_PASAJE.filter((x) => x.megafonia)) {
      const es = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(es, l.clave).not.toMatch(voseo);
      expect(es, l.clave).not.toMatch(/\bAra\b/);
    }
    for (const m of [...GUION_DEL_PASAJE, ...CHARLAS_DEL_PASAJE]) {
      m.lineas.forEach((l, i) => {
        if (!l.megafonia || esAnuncioDeSiempre(l.clave)) return;
        // El primero de quien habla en ese momento: lo que sigue es el mismo anuncio, y lo que sigue otro momento, también.
        const empieza = !("sigue" in m && m.sigue) && !m.lineas.slice(0, i).some((x) => x.megafonia && x.quien === l.quien);
        if (empieza) expect(ES_PY[l.clave as keyof typeof ES_PY], `${m.id}: ${l.clave}`).toMatch(/señor|quienes/i);
      });
    }
  });

  /*
   * **Y la tripulante en persona, con su habla**: la de Canarias, con el tú y
   * sin voseo —ni «vos», ni «tenés»—, y sin nada que diga si Ara es niño o
   * niña, que a quien le habla es a Ara.
   */
  it("la tripulante, en persona: con el tú de Canarias, sin voseo y sin decir niño o niña", () => {
    const voseo = /\b(vos|mirá|escuchá|tenés|querés|sabés|podés|sentís)\b/i;
    const alQueOye =
      /\b(hij[oa]s?|niñ[oa]s?|nen[ea]s?|guap[oa]s?|campe[oó]na?|list[oa]s?|tranquil[oa]s?|nervios[oa]s?|content[oa]s?|asustad[oa]s?|sentad[oa]s?|solit[oa]s?|pequeñ[oa]s?|chiquit[oa]s?|precios[oa]s?|bonit[oa]s?|valient[ea]s?|dormid[oa]s?|dormilon[a]?|tapad[oa]s?|mi rey|mi reina)\b/i;
    const deCerca = LINEAS_DEL_PASAJE.filter(esDeCerca);
    expect(deCerca.length).toBeGreaterThanOrEqual(10);
    for (const l of deCerca) {
      const es = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(es, l.clave).not.toMatch(voseo);
      expect(es, l.clave).not.toMatch(alQueOye);
      // Le habla de tú: alguna lo dice, y ninguna de usted.
      expect(es, l.clave).not.toMatch(/\b(usted|ustedes)\b/i);
    }
    expect(deCerca.some((l) => /\b(tienes|sabes|ves|estás|déjame)\b/i.test(ES_PY[l.clave as keyof typeof ES_PY] as string))).toBe(true);
  });

  /*
   * **Y Ara sigue sin ser niño ni niña**, aquí con las palabras que se cuelan
   * al hablar de quien viaja por primera vez: «sentado», «solito», «nervioso»,
   * «contento», «pasajero»… En inglés, los pronombres.
   */
  it("y nada de lo que dice Ara, ni de lo que se dice de Ara, dice si es niño o niña", () => {
    const conGenero =
      /\b(hij[oa]s?|niñ[oa]s?|nen[ea]s?|solit[oa]s?|campe[oó]na?|list[oa]s?|tranquil[oa]s?|atent[oa]s?|asustad[oa]s?|cansad[oa]s?|nervios[oa]s?|content[oa]s?|orgullos[oa]s?|chiquit[oa]s?|sentad[oa]s?|abrochad[oa]s?|emocionad[oa]s?|pasajer[oa]|viajer[oa]|aviador[a]?|pilot[oa]s?|primeriz[oa]s?|dormid[oa]s?|despiert[oa]s?|tapad[oa]s?)\b/i;
    const withGender = /\b(son|daughter|boy|girl|his|him|he|she|her|hers|himself|herself|lad|lass|buddy|champ|princess)\b/i;
    const claves = Object.keys(ES_PY).filter((k) => k.startsWith("inicio.") && k.includes(".pasaje."));
    expect(claves.length).toBeGreaterThanOrEqual(LINEAS_DEL_PASAJE.length);
    for (const k of claves) {
      // Lo de la megafonía se le dice a todo el pasaje —«señores pasajeros»—,
      // que es como se dice; de Ara no dice nada, y lo mira la prueba de arriba.
      if (k.startsWith("inicio.ara.")) expect(ES_PY[k as keyof typeof ES_PY], k).not.toMatch(conGenero);
      expect(EN[k as keyof typeof EN] ?? "", k).not.toMatch(withGender);
    }
    // Y la ficha del hangar tampoco: «Viajá con Jazlyn», no «de pasajero».
    expect(ES_PY["inicio.modo.pasaje"]).not.toMatch(conGenero);
  });

  it("los anuncios de siempre los monta el juego, y no se vuelven a grabar", () => {
    const deSiempre = GUION_DEL_PASAJE.flatMap((m) => m.lineas).filter((l) => esAnuncioDeSiempre(l.clave));
    expect(deSiempre.map((l) => l.clave)).toEqual([
      "comandante.crosscheck",
      "comandante.bienvenida",
      "comandante.despegue",
      "comandante.crucero",
      "tripulacion.servicio",
      "comandante.descenso",
      "tripulacion.cinturones",
      "comandante.aproximacion",
      "comandante.llegada",
      "tripulacion.llegada",
    ]);
    for (const l of deSiempre) expect(l.megafonia).toBe(true);
    for (const l of LINEAS_DEL_PASAJE) expect(esAnuncioDeSiempre(l.clave), l.clave).toBe(false);
  });
});

describe("los aerofrenos al tocar, vistos desde el ala (punto 296)", () => {
  const r = correr(() => 4);
  const e = r.escena.estado;
  const toco = r.vuelo.tocoA ?? Infinity;
  const desdeQue = (clave: string): number => r.dichas.find((d) => d.linea.clave === clave)?.desde ?? Infinity;

  it("la toma se ve desde la pista hasta tocar, y justo después se corta al ala", () => {
    const pista = e.planos.filter((p) => p.plano === "fuera-pista");
    const ala = e.planos.find((p) => p.plano === "fuera-ala" && p.desde >= toco - 1e-6);
    expect(pista.some((p) => p.desde < toco)).toBe(true);
    expect(ala, "el ala al tocar").toBeDefined();
    // En el primer paso con los paneles subiendo —el tercero de la prueba desde que se tocó—: se los ve moverse.
    expect(ala!.desde - toco).toBeLessThan(3.5 * DT);
    expect(r.escena.dichaLaCharla("aerofrenos")).toBe(true);
  });

  it("y se vuelve a la pista a ver frenar, con lo de la reversa detrás del ala", () => {
    const ala = e.planos.find((p) => p.plano === "fuera-ala" && p.desde >= toco - 1e-6)!;
    const vuelta = e.planos.find((p) => p.plano === "fuera-pista" && p.desde > ala.desde);
    expect(vuelta, "de vuelta a la pista").toBeDefined();
    expect(vuelta!.desde - ala.desde).toBeGreaterThanOrEqual(3.5 - 1e-6);
    expect(desdeQue("inicio.ara.pasaje.toma")).toBeGreaterThanOrEqual(vuelta!.desde + CORTE_DE_PLANO - 1e-6);
  });

  it("y lo cuenta Ara en el primer rato tranquilo rodando, detrás de la megafonía de la llegada", () => {
    const llegada = r.dichas.find((d) => d.linea.clave === "tripulacion.llegada")!;
    const explica = desdeQue("inicio.ara.pasaje.aerofrenos");
    expect(explica).toBeGreaterThan(llegada.hasta!);
    expect(desdeQue("inicio.ara.pasaje.aerofrenosPorque")).toBeGreaterThan(explica);
    // Y nadie de la cabina de mando: lo dice Ara.
    expect(r.dichas.filter((d) => /aerofrenos/.test(d.linea.clave)).every((d) => d.linea.quien === "ara")).toBe(true);
  });

  /** Vuela la escena con la toma que se diga, y devuelve lo dicho. */
  function conLaToma(toque: string | null): string[] {
    let t = 0;
    const v = vozQueTarda(() => 4, () => t);
    const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
    const vuelo = new VueloDeMentira();
    for (; t < 3000; t += DT) {
      v.tic();
      const p = escena.paso(DT, { ...vuelo.lectura, toque: vuelo.tocoA !== null ? toque : null });
      vuelo.paso(DT, p, t);
      if (escena.estado.puedeSeguir) escena.seguir();
      if (escena.estado.terminado) break;
    }
    return v.dichas.map((d) => d.linea.clave);
  }

  it("con una toma firme y en su sitio, Ara cuenta el golpecito justo antes de los aerofrenos", () => {
    const c = conLaToma("firme");
    const k = c.indexOf("inicio.ara.pasaje.golpecito");
    expect(k).toBeGreaterThan(-1);
    expect(c[k + 1]).toBe("inicio.ara.pasaje.aerofrenos");
  });

  it("y con una suave o una larga, no: decirlo sería mentir", () => {
    for (const toque of ["suave", "largo", null]) expect(conLaToma(toque)).not.toContain("inicio.ara.pasaje.golpecito");
  });

  it("sin aerofrenos que se vean, ni el corte al ala ni su explicación", () => {
    let t = 0;
    const v = vozQueTarda(() => 4, () => t);
    const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
    const vuelo = new VueloDeMentira();
    for (; t < 3000; t += DT) {
      v.tic();
      const { frenosDeTierra: _, ...sin } = vuelo.lectura;
      const p = escena.paso(DT, sin);
      vuelo.paso(DT, p, t);
      if (escena.estado.puedeSeguir) escena.seguir();
      if (escena.estado.terminado) break;
    }
    expect(escena.dichaLaCharla("aerofrenos")).toBe(false);
    expect(v.dichas.some((d) => /aerofrenos/.test(d.linea.clave))).toBe(false);
    expect(escena.estado.dichos).toContain("toma");
  });
});

describe("cada cosa en su momento del vuelo", () => {
  const r = correr(() => 4, { sitios: true });
  const dichos = r.escena.estado.dichos;

  it("pasa por todo, en el orden de un vuelo de verdad, y acaba", () => {
    // Con `OGA_PASAJE=1`, lo dicho con su hora.
    if (entorno?.OGA_PASAJE) console.log(r.dichas.map((d) => `${d.desde.toFixed(0)} s · ${d.linea.clave}`).join("\n"));
    const esperado: MomentoDelPasaje[] = [
      "ventanilla",
      "banoAntes",
      "cinturon",
      "puertas",
      "motores",
      "bienvenida",
      "demostracion",
      "demoSalidas",
      "demoEquipo",
      "revision",
      "espera",
      "despegue",
      "carrera",
      "volando",
      "nubes",
      "nubesRespuesta",
      "arriba",
      "servicio",
      "tcpNubes",
      "bajada",
      "oidos",
      "kit",
      "kitRecoger",
      "techo",
      "isla",
      "aproximacion",
      "tcpAterrizaje",
      "flaps",
      "aterrizando",
      "toma",
      "llegada",
      "impacientes",
      "seLevantan",
      "luz",
      "suelto",
      "gracias",
      "puesto",
    ];
    expect(dichos).toEqual(esperado);
    expect(r.escena.estado.saltados).toEqual([]);
    expect(r.escena.estado.terminado).toBe(true);
  });

  it("nunca dos frases a la vez, y con su silencio entre una y otra", () => {
    // Con el reloj de la escena, que es el que reparte los turnos.
    const registro = r.escena.registro;
    expect(registro.length).toBe(r.dichas.length);
    for (let i = 1; i < registro.length; i++) {
      const a = registro[i - 1]!;
      const b = registro[i]!;
      expect(a.hasta, a.clave).not.toBeNull();
      expect(a.cortada, a.clave).toBe(false);
      expect(b.desde, `${a.clave} → ${b.clave}`).toBeGreaterThanOrEqual(a.hasta! + ENTRE_FRASES - 1e-6);
    }
  });

  it("no arranca sin los toboganes armados, ni rueda sin oír los motores", () => {
    const crosscheck = r.dichas.find((d) => d.linea.clave === "comandante.crosscheck")!;
    expect(r.vuelo.arrancoA).not.toBeNull();
    expect(r.vuelo.arrancoA!).toBeGreaterThanOrEqual(crosscheck.hasta!);
    const motores = r.dichas.find((d) => d.linea.clave === "inicio.ara.pasaje.motores")!;
    expect(r.vuelo.rodoA!).toBeGreaterThanOrEqual(motores.hasta!);
  });

  it("y no entra en la pista hasta «tripulación, sentados para el despegue»", () => {
    const sentados = r.dichas.find((d) => d.linea.clave === "comandante.despegue")!;
    expect(r.vuelo.entroA!).toBeGreaterThanOrEqual(sentados.hasta!);
  });

  it("ni da gas con Ara a media frase: «¡cómo empuja!» llega con el empuje", () => {
    const ahoraSi = r.dichas.find((d) => d.linea.clave === "inicio.ara.pasaje.despegue")!;
    const empuja = r.dichas.find((d) => d.linea.clave === "inicio.ara.pasaje.carrera")!;
    expect(r.vuelo.despegoA!).toBeGreaterThanOrEqual(ahoraSi.hasta!);
    expect(empuja.desde).toBeGreaterThanOrEqual(r.vuelo.despegoA!);
    // Y en la carrera, que dura veintitantos segundos: no se dice volando alto.
    expect(empuja.desde - r.vuelo.despegoA!).toBeLessThan(10);
  });

  it("lo que pregunta Ara lo contesta un anuncio, y después", () => {
    expect(indice(r, "inicio.mama.pasaje.espera")).toBeGreaterThan(indice(r, "inicio.ara.pasaje.espera"));
    expect(indice(r, "inicio.mama.pasaje.nubes")).toBeGreaterThan(indice(r, "inicio.ara.pasaje.nubes"));
    expect(indice(r, "inicio.ara.pasaje.nubes")).toBeGreaterThan(-1);
    expect(indice(r, "inicio.tripulacion.pasaje.oidos")).toBeGreaterThan(indice(r, "inicio.ara.pasaje.oidos"));
    expect(indice(r, "inicio.mama.pasaje.reversa")).toBeGreaterThan(indice(r, "inicio.ara.pasaje.toma"));
  });

  it("las nubes, por dentro: Ara pregunta con la ventanilla blanca", () => {
    const nubes = r.dichas.find((d) => d.linea.clave.startsWith("inicio.ara.pasaje.nubes"))!;
    expect(nubes.linea.clave).toBe("inicio.ara.pasaje.nubes");
  });

  it("y si se sube entre ellas, al dejarlas abajo", () => {
    const entre = correr(() => 4, { entreNubes: true });
    const claves = entre.dichas.map((d) => d.linea.clave);
    expect(claves).toContain("inicio.ara.pasaje.nubesAbajo");
    expect(claves).not.toContain("inicio.ara.pasaje.nubes");
    expect(claves.indexOf("inicio.mama.pasaje.nubes")).toBeGreaterThan(claves.indexOf("inicio.ara.pasaje.nubesAbajo"));
  });

  it("y lo de las nubes, pasados los diez mil pies: por debajo la cabina de mando no habla", () => {
    const nubes = r.dichas.find((d) => d.linea.clave === "inicio.mama.pasaje.nubes")!;
    // La tripulación de mentira sube a once metros por segundo desde 632 m.
    const subida = r.dichas.find((d) => d.linea.clave === "inicio.ara.pasaje.volando")!;
    expect(nubes.desde).toBeGreaterThan(subida.desde);
    expect(r.escena.dicho("nubesRespuesta")).toBe(true);
  });

  it("lo de la ventanilla, arriba, y Ara solo dice algo de lo que va por su lado", () => {
    const k = claves(r);
    const arriba = indice(r, "comandante.crucero");
    const bajada = indice(r, "comandante.aproximacion");
    const ventanillas = k.flatMap((c, i) => (c === "ventanilla" ? [i] : []));
    expect(ventanillas.length).toBe(4);
    for (const i of ventanillas) {
      expect(i).toBeGreaterThan(Math.min(arriba, indice(r, "inicio.mama.pasaje.nubes")));
      expect(i).toBeLessThan(bajada);
    }
    // El Teide con su historia y lo de Ara detrás; El Hierro, por la derecha: Ara no dice nada.
    const teide = r.dichas.findIndex((d) => d.linea.texto === "Ese es teide.");
    expect(k[teide + 1]).toBe("ventanilla.historia");
    expect(k[teide + 2]).toBe("inicio.ara.pasaje.teide");
    const hierro = r.dichas.findIndex((d) => d.linea.texto === "Ese es hierro.");
    expect(k[hierro + 1]).not.toMatch(/^inicio\.ara\./);
    expect(r.escena.estado.senalados).toEqual(["orotava", "teide", "hierro", "garajonay"]);
  });

  it("y al final, el botón de volver", () => {
    expect(r.escena.estado.momento).toBe("fin");
    expect(r.escena.estado.terminado).toBe(true);
  });
});

describe("lo que se pasa de su momento se salta, y nada se pisa", () => {
  /*
   * Con una voz muy lenta —treinta segundos cada frase, más que lo que se
   * espera a una grabación que no baja—, una tripulación que da gas sin
   * esperar a la cabina y una carrera de un segundo, «¡cómo empuja!» llegaría
   * con el avión ya arriba: no se dice. Lo demás, en su orden.
   */
  const r = correr(() => 30, { deUnSalto: true, conPrisa: true });

  it("se salta lo que ya no viene a cuento, y la escena acaba igual", () => {
    expect(r.escena.estado.saltados).toContain("carrera");
    for (const m of r.escena.estado.saltados) expect(r.escena.dicho(m)).toBe(false);
    const orden = GUION_DEL_PASAJE.map((m) => m.id);
    const dichos = r.escena.estado.dichos.map((m) => orden.indexOf(m));
    expect(dichos).toEqual([...dichos].sort((a, b) => a - b));
    expect(r.escena.estado.terminado).toBe(true);
  });

  it("y con todo, ni una frase encima de otra", () => {
    const registro = r.escena.registro;
    for (let i = 1; i < registro.length; i++)
      expect(registro[i]!.desde).toBeGreaterThanOrEqual(registro[i - 1]!.hasta! + ENTRE_FRASES - 1e-6);
  });

  it("y la tripulación entra en pista aunque la frase se quede colgada", () => {
    expect(r.vuelo.entroA).not.toBeNull();
  });
});

describe("la red de la espera", () => {
  /*
   * Una frase que no avisa nunca de que acabó —una boca que se vació— deja la
   * escena esperando su tope; y en la doble raya, la red deja entrar igual al
   * rato: nadie se queda parado para siempre.
   */
  it("con «sentados para el despegue» colgada, se entra pasada la red", () => {
    let t = 0;
    const dichas: string[] = [];
    const escena = new VueloDePasaje(
      {
        decir: (l, alAcabar) => {
          dichas.push(l.clave);
          if (l.clave !== "comandante.despegue") setTimeout0(() => alAcabar(0));
        },
        callar: () => {},
      },
      { lado: "izquierda" },
    );
    const pendientes: (() => void)[] = [];
    function setTimeout0(f: () => void): void {
      pendientes.push(f);
    }
    const vuelo = new VueloDeMentira();
    for (; t < 600 && vuelo.entroA === null; t += DT) {
      pendientes.splice(0).forEach((f) => f());
      const p = escena.paso(DT, vuelo.lectura);
      vuelo.paso(DT, p, t);
    }
    expect(dichas).toContain("comandante.despegue");
    expect(vuelo.entroA).not.toBeNull();
  });

  it("y la red es larga: lo normal es que la comandante acabe mucho antes", () => {
    expect(RED_DE_LA_ESPERA).toBeGreaterThanOrEqual(60);
  });
});

/*
 * **La voz se mide con su reloj.** Con el reloj del juego acelerado —el de los
 * bancos—, una frase de cinco segundos dura un minuto de vuelo: la escena no
 * puede darla por perdida por el reloj del vuelo, ni dar por oído lo que se
 * dejó por el tope. Medido en el banco con las tomas grabadas: la tripulación
 * entraba en la pista antes de que sonara «sentados para el despegue».
 */
describe("la conversación, con el reloj de la voz", () => {
  it("no da por perdida una frase que suena, aunque el vuelo vaya doce veces más deprisa", () => {
    let juego = 0;
    let pared = 0;
    let acaba: ((n: number) => void) | null = null;
    const c = new Conversacion(
      { decir: (_l, alAcabar) => (acaba = alAcabar), callar: () => {} },
      () => juego,
      () => pared,
    );
    c.decir([{ quien: "mama", clave: "comandante.despegue", megafonia: true }]);
    c.atender();
    // Cuatro segundos de voz: cuarenta y ocho de vuelo.
    for (let i = 0; i < 40; i++) {
      juego += 1.2;
      pared += 0.1;
      c.atender();
    }
    expect(c.oida("comandante.despegue")).toBe(false);
    expect(c.callada).toBe(false);
    acaba!(0);
    expect(c.oida("comandante.despegue")).toBe(true);
  });

  it("y lo que dejó por el tope no se da por oído hasta que avisa de que sonó", () => {
    let t = 0;
    let acaba: ((n: number) => void) | null = null;
    const c = new Conversacion({ decir: (_l, alAcabar) => (acaba = alAcabar), callar: () => {} }, () => t);
    c.decir([{ quien: "mama", clave: "comandante.despegue", megafonia: true }]);
    c.atender();
    t += TOPE_DE_UNA_FRASE + 1;
    c.atender();
    expect(c.registro[0]!.como).toBe("tope");
    expect(c.oida("comandante.despegue")).toBe(false);
    acaba!(0);
    expect(c.registro[0]!.como).toBe("sono");
    expect(c.oida("comandante.despegue")).toBe(true);
  });
});

/*
 * **Un anuncio de tierra, cuando el juego dice que vale.** La bienvenida se
 * pedía al echar a rodar, con la fase del juego todavía en «arrancando», y la
 * boca la tiraba en el acto. Medido en el banco con las tomas grabadas.
 */
describe("los anuncios esperan la fase del juego", () => {
  const r = correr(() => 4, { faseTardia: true });

  it("la bienvenida se pide al echar a rodar, y suena", () => {
    const bienvenida = r.dichas.find((d) => d.linea.clave === "comandante.bienvenida")!;
    expect(bienvenida).toBeTruthy();
    /*
     * Ya no espera a que el juego diga «rodando»: desde que la bienvenida se
     * da en el puesto, detrás de los toboganes, vale también mientras se
     * arranca, y la boca no la tira. Ver `CUANDO` en `audio/megafonia.ts`. Lo
     * que se mira es que se pida con el avión ya rodando y que nada de la
     * escena salga a destiempo, que es la prueba de abajo.
     */
    expect(bienvenida.desde).toBeGreaterThanOrEqual(r.vuelo.rodoA! - 1e-6);
    expect(seLePasoElMomento("comandante.bienvenidaConPlan", "arrancando")).toBe(false);
  });

  it("y ninguno de la escena se pide a destiempo, y la escena acaba igual", () => {
    let t = 0;
    const v = vozQueTarda(() => 4, () => t);
    const vuelo = new VueloDeMentira(false, false, false, true);
    const aDestiempo: string[] = [];
    const escena = new VueloDePasaje(
      {
        decir: (l, alAcabar) => {
          if (l.megafonia && seLePasoElMomento(l.clave, vuelo.lectura.fase!)) aDestiempo.push(l.clave);
          v.voz.decir(l, alAcabar);
        },
        callar: () => v.voz.callar(),
      },
      { lado: "izquierda" },
    );
    for (; t < 3000 && !escena.estado.terminado; t += DT) {
      v.tic();
      vuelo.paso(DT, escena.paso(DT, vuelo.lectura), t);
      if (escena.estado.puedeSeguir) escena.seguir();
    }
    expect(aDestiempo).toEqual([]);
    expect(escena.estado.terminado).toBe(true);
    expect(r.escena.estado.saltados).toEqual([]);
  });
});

// ── El vuelo medido ──────────────────────────────────────────────────────

/*
 * **Con el vuelo de verdad y las voces de verdad.** La tripulación de mentira
 * de arriba sirve para los permisos; para saber si la escena se queda callada
 * hace falta el vuelo que se vuela —con sus tiempos, su giro, sus nubes y su
 * mar— y lo que dura cada frase. El vuelo, medido en el banco de la escena
 * (`scripts/verificar-inicio-3.mjs`, 18-10-2026, de Los Rodeos a La Palma):
 * rodaje de 129 s, subida de 446 s hasta 5.785 m con el giro a la izquierda a
 * 25° pasando los 2.300 m, crucero de 58 s, bajada de 904 s con la vuelta a
 * la final a la derecha, final de 184 s y 242 s de rodaje a la llegada. Las
 * frases, lo que duran sus tomas en el pack; las que no tienen toma, sus
 * letras al ritmo de las tomas de esa voz; y los anuncios de siempre, lo que
 * duraron en el mismo banco.
 */
const fsDeNode = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string, cod: string): string };

const PIEZAS: Readonly<Record<string, Readonly<Record<string, { ms: number }>>>> = Object.fromEntries(
  ["ara", "comandante", "tripulacion-canarias"].map((v) => [
    v,
    (JSON.parse(fsDeNode.readFileSync(`data/voces/${v}/manifiesto.json`, "utf8")) as { piezas: Record<string, { ms: number }> }).piezas,
  ]),
);

/** Letras por segundo de cada voz, en sus tomas de esta escena. */
const RITMO: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(PIEZAS).map(([voz, piezas]) => {
    let letras = 0;
    let segundos = 0;
    for (const [k, p] of Object.entries(piezas)) {
      const texto = ES_PY[k as keyof typeof ES_PY] as string | undefined;
      if (!k.includes(".pasaje.") || typeof texto !== "string") continue;
      letras += texto.length;
      segundos += p.ms / 1000;
    }
    return [voz, letras / segundos];
  }),
);

/** Lo que duraron los anuncios de siempre y lo de la ventanilla en el banco, s. */
const MEDIDO_EN_EL_BANCO: Readonly<Record<string, number>> = {
  "comandante.crosscheck": 4.5,
  "comandante.bienvenida": 9.8,
  "comandante.despegue": 3.4,
  "comandante.crucero": 5.0,
  "tripulacion.servicio": 9.7,
  "comandante.descenso": 10.0,
  "tripulacion.cinturones": 9.8,
  "comandante.aproximacion": 3.8,
  "comandante.llegada": 8.4,
  "tripulacion.llegada": 21.3,
  ventanilla: 12.5,
  "ventanilla.historia": 9.6,
};

/** **Lo que dura una frase**: su toma, o sus letras al ritmo de su voz. */
function loQueDura(l: Linea): number {
  const medido = MEDIDO_EN_EL_BANCO[l.clave];
  if (medido !== undefined) return medido;
  const voz = VOZ_DE[l.quien];
  const toma = PIEZAS[voz]?.[l.clave];
  if (toma) return toma.ms / 1000;
  const texto = (ES_PY[l.clave as keyof typeof ES_PY] as string | undefined) ?? l.texto ?? "";
  return texto.length / (RITMO[voz] ?? 14);
}

const GRADOS = Math.PI / 180;

/**
 * **La bajada medida en el banco**: segundos desde que empieza a bajar,
 * altitud en m y lo que falta para tocar en km. Con sus dos ratos nivelados
 * —a 3.180 m y a 1.960 m, encima del mar de nubes— que son los que hacen que
 * los tramos de la bajada no se repartan solos.
 */
const BAJADA_MEDIDA: readonly (readonly [number, number, number])[] = [
  [0, 5785, 131.7],
  [155, 4600, 110.4],
  [330, 3261, 85.3],
  [352, 3174, 82.1],
  [392, 3190, 77.0],
  [550, 1988, 55.8],
  [571, 1958, 53.1],
  [612, 1960, 47.4],
  [656, 1654, 42.2],
  [765, 934, 28.7],
  [807, 717, 24.2],
  [904, 730, 13.1],
];

/**
 * **La vuelta en la pista de La Palma**, s desde que se rueda al puesto: pista
 * adelante a nueve metros por segundo hasta la punta, la vuelta en el ensanche
 * —dieciocho segundos—, de vuelta por la pista hasta la calle C y fuera hacia
 * la terminal. Como la vuela el JAZ 90 en el banco: ver
 * `scripts/verificar-inicio-3.mjs`.
 */
const LA_VUELTA = { empieza: 100, acaba: 118, sale: 200 } as const;

/** Lo que vale la columna `col` de una tabla en `t`, interpolando. */
function enLaTabla(tabla: readonly (readonly number[])[], t: number, col: number): number {
  for (let i = 1; i < tabla.length; i++) {
    const a = tabla[i - 1]!;
    const b = tabla[i]!;
    if (t <= b[0]!) {
      const f = Math.max(0, (t - a[0]!) / (b[0]! - a[0]!));
      return a[col]! + (b[col]! - a[col]!) * f;
    }
  }
  return tabla[tabla.length - 1]![col]!;
}

/** **El vuelo medido**, del puesto al puesto, obedeciendo los permisos de la escena. */
class VueloMedido {
  tramo: TramoDeLinea = "puerta";
  enTramo = 0;
  motor = false;
  enTierra = true;
  porElSuelo = 0;
  altitud = 632;
  campo = 632;
  vertical = 0;
  autorizado = false;
  alineado = false;
  flaps = 0;
  tren = 1;
  cabina = 0;
  alabeo = 0;
  falta = 198000;
  sobreElMar = false;
  /** Lo que dura el crucero, s: el medido, y uno largo para ver despertar a Ara para bajar. */
  crucero = 58;
  /**
   * **La potencia de los motores**, la de la tripulación de verdad —ver
   * `potenciaPara` en `vuelo-de-linea.ts`—: el despegue hasta los mil
   * quinientos pies, la de subida arriba, el ralentí bajando y la de
   * aproximación con el tren fuera.
   */
  potencia: PotenciaDeLinea = "tierra";
  conEstaPotencia = 0;

  protected pasar(t: TramoDeLinea): void {
    this.tramo = t;
    this.enTramo = 0;
  }

  private ponerLaPotencia(): void {
    const p: PotenciaDeLinea =
      this.tramo === "carrera"
        ? "despegue"
        : this.tramo === "subida"
          ? this.potencia === "subida" || this.altitud - 632 >= REDUCE_EL_GAS
            ? "subida"
            : "despegue"
          : this.tramo === "crucero"
            ? "subida"
            : this.tramo === "bajada" || this.tramo === "final"
              ? this.tren > 0.99 ? "aproximacion" : "ralenti"
              : "tierra";
    if (p !== this.potencia) {
      this.potencia = p;
      this.conEstaPotencia = 0;
    }
  }

  get altura(): number {
    return Math.max(0, this.altitud - this.campo);
  }

  /** Lo que lleva el avión desde que despegó, s: dónde va. Ver `LO_QUE_SE_VIO`. */
  desdeQueDespego = 0;

  paso(dt: number, p: PermisosDeLaEscena): void {
    this.conEstaPotencia += dt;
    if (this.desdeQueDespego > 0 || !this.enTierra) this.desdeQueDespego += dt;
    this.pasoDelVuelo(dt, p);
    this.ponerLaPotencia();
  }

  private pasoDelVuelo(dt: number, p: PermisosDeLaEscena): void {
    this.enTramo += dt;
    const t = this.enTramo;
    switch (this.tramo) {
      case "puerta":
        if (p.arrancar) {
          this.motor = true;
          this.pasar("arrancando");
        }
        break;
      case "arrancando":
        if (t >= 12 && p.rodar) {
          this.porElSuelo = 8;
          this.pasar("rodando");
        }
        break;
      case "rodando":
        if (t >= 129) {
          this.porElSuelo = 0;
          this.pasar("esperando");
        }
        break;
      case "esperando":
        if (t >= 6) this.autorizado = true;
        if (this.autorizado && p.entrar) this.pasar("entrando");
        break;
      case "entrando":
        if (t >= 12) this.alineado = true;
        if (this.alineado && p.despegar) {
          this.alineado = false;
          this.pasar("carrera");
        }
        break;
      case "carrera":
        this.porElSuelo += 3.4 * dt;
        if (this.porElSuelo >= 78) {
          this.enTierra = false;
          this.pasar("subida");
        }
        break;
      case "subida": {
        this.vertical = 11.6;
        this.altitud = Math.min(5785, this.altitud + this.vertical * dt);
        this.tren = t < 6 ? 0.5 : 0;
        this.flaps = t < 40 ? 0.33 : 0;
        this.cabina = t < 45 ? -1.7 : t < 175 ? 0 : 2.4;
        this.alabeo = t > 130 && t < 180 ? -24.6 * GRADOS : t > 215 && t < 235 ? -18 * GRADOS : 0;
        this.porElSuelo = (this.altitud > 3048 ? 519 : 463) / 3.6;
        this.sobreElMar = t > 85 && !(t > 215 && t < 370);
        this.falta -= this.porElSuelo * dt * 0.4;
        if (t >= 446) {
          this.vertical = 0;
          this.cabina = 0.1;
          this.pasar("crucero");
        }
        break;
      }
      case "crucero":
        this.alabeo = 0;
        this.falta = Math.max(131700, this.falta - this.porElSuelo * dt);
        if (t >= this.crucero) {
          this.falta = 131700;
          this.pasar("bajada");
        }
        break;
      case "bajada": {
        // La bajada medida, con sus dos tramos nivelados: a 3.180 m y a 1.960 m.
        const antes = this.altitud;
        this.altitud = enLaTabla(BAJADA_MEDIDA, t, 1);
        this.vertical = dt > 0 ? (this.altitud - antes) / dt : 0;
        this.cabina = this.vertical < -1 ? -1.48 : 0.1;
        this.falta = enLaTabla(BAJADA_MEDIDA, t, 2) * 1000;
        this.porElSuelo = (this.altitud > 3048 ? 519 : this.falta > 31000 ? 463 : this.falta > 24000 ? 389 : 300) / 3.6;
        this.flaps = this.falta < 16600 ? 0.67 : this.falta < 24000 ? 0.33 : 0;
        this.alabeo = this.falta < 20600 && this.falta > 18600 ? 25 * GRADOS : 0;
        this.sobreElMar = true;
        // Sobre el mar, la altura es la altitud: el suelo es el agua.
        this.campo = 0;
        if (t >= 904) {
          this.campo = 33;
          this.pasar("final");
        }
        break;
      }
      case "final":
        this.vertical = -3.7;
        this.altitud = Math.max(33, 715 - (682 * t) / 184);
        this.falta = Math.max(0, 13100 * (1 - t / 184));
        this.tren = 1;
        this.flaps = 1;
        this.alabeo = 0;
        this.porElSuelo = 245 / 3.6;
        this.sobreElMar = this.falta > 400;
        if (t >= 184) {
          this.enTierra = true;
          this.altitud = 33;
          this.vertical = 0;
          this.porElSuelo = 60;
          this.pasar("frenando");
        }
        break;
      case "frenando":
        this.porElSuelo = Math.max(9, this.porElSuelo - 3.5 * dt);
        if (t >= 15) this.pasar("al-puesto");
        break;
      case "al-puesto":
        this.porElSuelo = t < LA_VUELTA.empieza || t > LA_VUELTA.acaba ? 9 : 4;
        if (t >= 242) {
          this.porElSuelo = 0;
          this.pasar("aparcado");
        }
        break;
      case "aparcado":
        if (t >= 5) {
          this.motor = false;
          this.pasar("apagado");
        }
        break;
      default:
        break;
    }
  }

  /** Si va metido en la nube: subiendo y bajando, en lo más espeso del mar de nubes. */
  get enLaNube(): boolean {
    return (
      (this.tramo === "subida" && this.altitud > 1600 && this.altitud < 1810) ||
      (this.tramo === "bajada" && this.altitud > 1650 && this.altitud < 1810)
    );
  }

  get lectura(): LecturaDelPasaje {
    const nubes = { base: 1532, techo: 1982 };
    const enLaNube = this.enLaNube;
    return {
      tramo: this.tramo,
      enTramo: this.enTramo,
      motor: this.motor,
      enTierra: this.enTierra,
      porElSuelo: this.porElSuelo,
      altura: this.altura,
      altitud: this.altitud,
      vertical: this.vertical,
      autorizado: this.autorizado,
      flaps: this.flaps,
      nubes,
      enNube: enLaNube ? 1 : 0,
      cabina: this.cabina,
      faltaParaTocar: this.falta,
      alineado: this.tramo === "entrando" && this.alineado,
      alabeo: this.alabeo,
      tren: this.tren,
      sobreElMar: this.sobreElMar,
      // Un día de verano en Canarias: diez grados más que la atmósfera estándar.
      temperatura: 25 - 6.5 * (this.altitud / 1000),
      // Dentro de la nube el aire sube y baja: turbulencia ligera. Ver `EN_LA_NUBE`.
      meneo: enLaNube ? 0.8 : 0.1,
      visibilidad: 10000,
      // Y el señalero, haciendo señas en los últimos noventa metros hasta el puesto.
      senalero: (this.tramo === "al-puesto" && this.enTramo > 215) || this.tramo === "aparcado",
      potencia: this.potencia,
      conEstaPotencia: this.conEstaPotencia,
      enLaPista: this.enTierra && this.tramo !== "puerta" ? this.enLaPista : null,
      ...(this.ver ? { ver: this.ver } : {}),
    };
  }

  /**
   * **Dónde va respecto a la pista**, en la llegada a La Palma: pista adelante
   * hasta la punta, la vuelta en el ensanche, de vuelta por la pista y fuera
   * por la calle hacia la terminal. Ver `LA_VUELTA`. Con `sinVuelta`, frena a
   * tiempo y sale por la calle sin dar ninguna vuelta.
   */
  sinVuelta = false;
  get enLaPista(): NonNullable<LecturaDelPasaje["enLaPista"]> {
    const t = this.enTramo;
    if (this.tramo === "frenando") return { alEje: 0, hastaElFinal: 1700 - 50 * t, vuelta: 0 };
    if (this.tramo !== "al-puesto") return { alEje: 200, hastaElFinal: 1200, vuelta: 2.4 };
    if (this.sinVuelta) {
      // A la calle, torciendo hacia la terminal a media pista: se aparta antes de girar mucho.
      const f = Math.min(1, Math.max(0, (t - 20) / 12));
      return { alEje: 140 * f, hastaElFinal: 1150, vuelta: 2.3 * f };
    }
    const v = LA_VUELTA;
    if (t < v.empieza) return { alEje: 0, hastaElFinal: 1150 - 9 * t, vuelta: 0 };
    if (t < v.acaba) {
      const f = (t - v.empieza) / (v.acaba - v.empieza);
      return { alEje: 25 * Math.sin(Math.PI * f), hastaElFinal: 160, vuelta: Math.PI * f };
    }
    if (t < v.sale) return { alEje: 0, hastaElFinal: 160 + 9 * (t - v.acaba), vuelta: Math.PI };
    const f = Math.min(1, (t - v.sale) / 8);
    return { alEje: 160 * f, hastaElFinal: 1000, vuelta: Math.PI - 0.8 * f };
  }

  /** Lo que se ve del paisaje, si se le pone. Ver `loQueSeVeEnElMedido`. */
  ver?: LecturaDelPasaje["ver"];
}

/**
 * Lo que el juego señala por la ventanilla, y cuándo lo vio en el banco, **s
 * desde que se despegó**: lo que dice dónde va el avión. Contado desde que
 * empieza la escena, cualquier frase de más en tierra —el baño, punto 293—
 * movía la Orotava a otro sitio del vuelo. Medido con el despegue a los 226 s.
 */
const LO_QUE_SE_VIO: readonly { t: number; s: Senalado }[] = [
  { t: 224, s: sitio("anaga", "izquierda") },
  { t: 394, s: sitio("orotava", "izquierda") },
  { t: 554, s: sitio("teide", "izquierda") },
  { t: 789, s: sitio("garajonay", "izquierda") },
];

interface Medido {
  readonly escena: VueloDePasaje;
  readonly vuelo: VueloMedido;
  readonly dichas: Dicha[];
  /** El tramo de cada momento de escena, para saber dónde cae cada silencio. */
  readonly tramos: { t: number; tramo: TramoDeLinea }[];
  /** Lo que tuvo la ventanita, cada vez que cambió, y cómo estaba el vuelo. Solo en `volarElMedido`. */
  readonly ventanita?: { t: number; dibujo: string | null; enTierra: boolean; cartelApagado: boolean }[];
}

/** Vuela la escena entera con el vuelo medido y las voces que duran lo que duran. */
function volarElMedido(
  vuelo: VueloMedido = new VueloMedido(),
  cadaPaso?: (escena: VueloDePasaje, t: number, l: LecturaDelPasaje) => void,
): Medido {
  let t = 0;
  const v = vozQueTarda(loQueDura, () => t);
  const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
  const porVer = [...LO_QUE_SE_VIO];
  const tramos: { t: number; tramo: TramoDeLinea }[] = [];
  const ventanita: NonNullable<Medido["ventanita"]> = [];
  for (; t < 4000; t += DT) {
    v.tic();
    if (tramos[tramos.length - 1]?.tramo !== vuelo.tramo) tramos.push({ t, tramo: vuelo.tramo });
    vuelo.paso(DT, escena.paso(DT, vuelo.lectura));
    const dibujo = escena.estado.dibujo;
    if ((ventanita[ventanita.length - 1]?.dibujo ?? null) !== dibujo)
      ventanita.push({
        t,
        dibujo,
        enTierra: vuelo.lectura.enTierra,
        cartelApagado: escena.dicho("arriba") && !escena.dicho("bajada"),
      });
    if (porVer[0] && porVer[0].t <= vuelo.desdeQueDespego && escena.puedeSenalar) escena.senalar(porVer.shift()!.s);
    cadaPaso?.(escena, t, vuelo.lectura);
    if (escena.estado.puedeSeguir) escena.seguir();
    if (escena.estado.terminado) break;
  }
  return { escena, vuelo, dichas: v.dichas, tramos, ventanita };
}

/** Los silencios entre frases, con su principio, su largo y el tramo del vuelo. */
function silencios(m: Medido): { desde: number; largo: number; tramo: TramoDeLinea }[] {
  const r = m.escena.registro;
  const salida: { desde: number; largo: number; tramo: TramoDeLinea }[] = [];
  for (let i = 1; i < r.length; i++) {
    const desde = r[i - 1]!.hasta ?? r[i - 1]!.desde;
    const tramo = [...m.tramos].reverse().find((x) => x.t <= desde)?.tramo ?? "puerta";
    salida.push({ desde, largo: r[i]!.desde - desde, tramo });
  }
  return salida;
}

/**
 * **El rato más largo callado**, s. Un vuelo de verdad tiene sus ratos de
 * motor y ventanilla, y está bien que los tenga; pero Enrique contó cinco
 * minutos seguidos sin nada bajando, y eso, con siete años, es una eternidad.
 * Un minuto largo, como mucho, con el avión en el aire —medido, lo más largo
 * sale de 65 s, y casi todos los silencios entre 35 y 55—; en la final, que es
 * cuando se calla todo el mundo en un avión de verdad, algo más.
 */
const CALLADO_COMO_MUCHO = 70;
const CALLADO_EN_LA_FINAL = 75;

describe("el vuelo medido, con las voces que duran lo que duran", () => {
  const m = volarElMedido();
  const e = m.escena.estado;

  // El silbo de otras islas (punto 288), detrás de las islas de la tripulante: cabe en la bajada medida.
  it("lo del silbo cabe en la bajada, detrás de las islas y antes de preparar la cabina", () => {
    const k = m.dichas.map((d) => d.linea.clave);
    expect(k).toContain("inicio.ara.pasaje.garajonay");
    const pregunta = k.indexOf("inicio.ara.pasaje.silboOtras");
    expect(pregunta).toBeGreaterThan(k.indexOf("inicio.ara.pasaje.islas"));
    expect(k[pregunta + 1]).toBe("inicio.tripulacion.pasaje.cerca.silbo");
    expect(pregunta).toBeLessThan(k.indexOf("comandante.aproximacion"));
  });

  it("pasa por todo el guion, sin saltarse nada, y acaba", () => {
    if (entorno?.OGA_PASAJE)
      console.log(
        m.dichas
          .map((d) => `${d.desde.toFixed(0).padStart(5)}–${(d.hasta ?? 0).toFixed(0).padStart(5)} · ${d.linea.clave}`)
          .join("\n") +
          `\n${silencios(m)
            .filter((s) => s.largo > 30)
            .map((s) => `callado ${s.largo.toFixed(0)} s desde ${s.desde.toFixed(0)} (${s.tramo})`)
            .join("\n")}` +
          `\nplanos: ${e.planos.map((p) => `${p.plano}@${p.desde.toFixed(0)}`).join(" ")}\ncharlas: ${e.charlas.join(" ")}`,
      );
    expect(e.terminado).toBe(true);
    expect(e.saltados).toEqual([]);
    expect(e.dichos).toEqual(GUION_DEL_PASAJE.map((x) => x.id).filter((x) => x !== "fin"));
  });

  it("y lo que viene a cuento, en su sitio: el tren, el giro por su lado, las nubes otra vez, las ruedas", () => {
    const k = m.dichas.map((d) => d.linea.clave);
    const cuando = (clave: string): number => m.dichas.find((d) => d.linea.clave === clave)?.desde ?? NaN;
    for (const c of ["tren", "plop", "giro", "ala", "altoRapido", "tcpMotor", "bajando", "tcpIslas", "tcpRuta", "otraNube", "ruedas", "vueltaEnPista", "porQueLaVuelta", "repaso"] as const)
      expect(e.charlas, c).toContain(c);
    // El tren, después de «¡estamos volando!» y mucho antes del crucero.
    expect(cuando("inicio.ara.pasaje.tren")).toBeGreaterThan(cuando("inicio.ara.pasaje.volando"));
    // El giro de la subida es a la izquierda: el ala de Ara apunta abajo.
    expect(k).toContain("inicio.ara.pasaje.giroAbajo");
    expect(k).not.toContain("inicio.ara.pasaje.giroArriba");
    // La tripulante por el pasillo, del servicio a la cabina preparada.
    const servicio = cuando("tripulacion.servicio");
    const preparada = cuando("comandante.aproximacion");
    for (const d of m.dichas.filter((x) => esDeCerca(x.linea) && /\.(hola|nubes|motor|frio|islas|ruta|papi)/.test(x.linea.clave))) {
      expect(d.desde, d.linea.clave).toBeGreaterThan(servicio);
      expect(d.desde, d.linea.clave).toBeLessThan(preparada);
    }
    // Las nubes otra vez, bajando; y las ruedas, en la final.
    expect(cuando("inicio.ara.pasaje.otraNube")).toBeGreaterThan(cuando("comandante.descenso"));
    expect(cuando("inicio.ara.pasaje.ruedas")).toBeGreaterThan(preparada);
  });

  it("la comandante explica por encima de los diez mil pies, que por debajo la cabina de mando no habla", () => {
    const altitudes: { t: number; altitud: number }[] = [];
    const m2 = (() => {
      let t = 0;
      const v = vozQueTarda(loQueDura, () => t);
      const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
      const vuelo = new VueloMedido();
      for (; t < 4000 && !escena.estado.terminado; t += DT) {
        v.tic();
        altitudes.push({ t, altitud: vuelo.altitud });
        vuelo.paso(DT, escena.paso(DT, vuelo.lectura));
        if (escena.estado.puedeSeguir) escena.seguir();
      }
      return v.dichas;
    })();
    const altitudA = (t: number): number => altitudes.find((x) => x.t >= t)?.altitud ?? 0;
    for (const clave of ["inicio.mama.pasaje.ala", "inicio.mama.pasaje.altoRapido", "inicio.mama.pasaje.bajando", "inicio.mama.pasaje.nubes"]) {
      const d = m2.find((x) => x.linea.clave === clave);
      expect(d, clave).toBeTruthy();
      expect(altitudA(d!.desde), clave).toBeGreaterThanOrEqual(3048);
    }
  });

  it("la demostración de seguridad, entera y en su orden, antes de entrar en la pista", () => {
    const k = m.dichas.map((d) => d.linea.clave);
    const orden = ["intro", "cinturon", "salidas", "mascaras", "chaleco", "tarjeta", "aparatos"].map((x) =>
      k.indexOf(`inicio.tripulacion.pasaje.demo.${x}`),
    );
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
    // Antes de «sentados para el despegue»: la cabina, lista antes de despegar.
    expect(Math.max(...orden)).toBeLessThan(k.indexOf("comandante.despegue"));
    expect(k.indexOf("comandante.bienvenida")).toBeLessThan(orden[0]!);
  });

  it("ningún rato largo callado en el aire, contado con lo que dura cada frase", () => {
    const largos = silencios(m).filter(
      (s) =>
        (s.tramo === "subida" || s.tramo === "crucero" || s.tramo === "bajada") && s.largo > CALLADO_COMO_MUCHO,
    );
    expect(largos.map((s) => `${s.largo.toFixed(0)} s desde ${s.desde.toFixed(0)} (${s.tramo})`)).toEqual([]);
    const enLaFinal = silencios(m).filter((s) => (s.tramo === "final" || s.tramo === "recogida") && s.largo > CALLADO_EN_LA_FINAL);
    expect(enLaFinal.map((s) => `${s.largo.toFixed(0)} s desde ${s.desde.toFixed(0)}`)).toEqual([]);
  });

  it("y en tierra tampoco: ni rodando a la pista ni rodando al puesto", () => {
    const largos = silencios(m).filter(
      (s) =>
        (s.tramo === "rodando" || s.tramo === "al-puesto" || s.tramo === "aparcado") && s.largo > CALLADO_COMO_MUCHO + 15,
    );
    expect(largos.map((s) => `${s.largo.toFixed(0)} s desde ${s.desde.toFixed(0)} (${s.tramo})`)).toEqual([]);
  });

  /*
   * **Los planos no saltan a media frase**: cada corte —de la ventanilla a
   * fuera, de fuera a la ventanilla— cae en un silencio, y la escena calla el
   * rato del fundido. Asomarse al cristal no es un corte.
   */
  it("las cámaras no saltan en mitad de una frase", () => {
    const r = m.escena.registro;
    const planos = e.planos;
    let cortes = 0;
    for (let i = 1; i < planos.length; i++) {
      const antes = planos[i - 1]!.plano;
      const ahora = planos[i]!;
      if (!esDeFuera(antes) && !esDeFuera(ahora.plano)) continue;
      cortes++;
      for (const f of r) {
        const hasta = f.hasta ?? Infinity;
        // Ni sonando cuando se pide el corte, ni empezando antes de que acabe el fundido.
        expect(
          f.desde < ahora.desde + CORTE_DE_PLANO - 1e-6 && hasta > ahora.desde + 1e-6,
          `${ahora.plano}@${ahora.desde.toFixed(1)} · ${f.clave}`,
        ).toBe(false);
      }
    }
    expect(cortes).toBeGreaterThanOrEqual(10);
  });

  it("y se ve por fuera lo que se cuenta, y se vuelve a la ventanilla", () => {
    const fuera = e.planos.filter((p) => esDeFuera(p.plano)).map((p) => p.plano);
    for (const p of ["fuera-rodando", "fuera-despegue", "fuera-giro", "fuera-vuelta", "fuera-ala", "fuera-pista"] as const)
      expect(fuera, p).toContain(p);
    // Ara se pega al cristal: para el motor, y para mirar abajo.
    expect(e.planos.map((p) => p.plano)).toContain("asomado-motor");
    expect(e.planos.map((p) => p.plano)).toContain("asomado-abajo");
    // Y ningún plano de fuera se queda más de un minuto: se vuelve a la ventanilla.
    for (let i = 0; i < e.planos.length - 1; i++)
      if (esDeFuera(e.planos[i]!.plano))
        expect(e.planos[i + 1]!.desde - e.planos[i]!.desde, e.planos[i]!.plano).toBeLessThan(60);
    // Y el vuelo acaba en la ventanilla.
    expect(e.plano).toBe("ventanilla");
  });

  it("cada explicación con su dibujo en la ventanita, y el dibujo existe", () => {
    // Con lo que se dice al tocar la ventanilla: La Gomera solo sale ahí. Ver `flight/lo-que-se-toca.ts`.
    const conDibujo = [...GUION_DEL_PASAJE, ...CHARLAS_DEL_PASAJE, { lineas: LINEAS_DE_LA_VENTANILLA_VIVA }]
      .flatMap((x) => x.lineas)
      .filter((l) => l.dibujo && ilustracionPedida(l.dibujo) === null);
    expect(conDibujo.length).toBeGreaterThanOrEqual(20);
    for (const l of conDibujo) expect(esDibujoDelPasaje(l.dibujo!), `${l.clave}: ${l.dibujo}`).toBe(true);
    // Y todos los dibujos se usan.
    for (const d of Object.keys(DIBUJOS_DEL_PASAJE)) expect(conDibujo.map((l) => l.dibujo), d).toContain(d);
  });

  /*
   * **Las ilustraciones, con lo que pasa en ese instante** (punto 278): la
   * cabina vacía mientras se embarca, todos sentados al pedir el cinturón, la
   * tripulante al lado de Ara, Ara contra el cristal y la comandante en su
   * cabina. Las de la cabina y la de la comandante llevan el cielo y las nubes
   * por la ventanilla: en tierra no salen. Y Ara de rodillas en el asiento,
   * solo con el cartel del cinturón apagado. Ver `ilustrada`.
   */
  it("y las ilustraciones, cada una con lo que pasa: ninguna dice otra cosa que el vuelo", () => {
    const ventanita = m.ventanita ?? [];
    const vistas = ventanita.filter((v) => v.dibujo?.startsWith("ilustracion:"));
    const de = (clave: string) => vistas.filter((v) => v.dibujo === `ilustracion:${clave}`);
    // Las cinco salen en un vuelo normal, y existen de verdad, con su hueco.
    for (const c of ["pasaje-embarque", "pasaje-lleno", "pasaje-tripulante", "pasaje-ara-ventanilla", "pasaje-comandante"]) {
      expect(de(c).length, c).toBeGreaterThan(0);
      expect(ilustracion(c), c).not.toBeNull();
      expect(RECETAS[c]?.hueco, c).toBe("lamina");
    }
    // El embarque es lo primero y se queda, sin hueco, hasta que la bienvenida lo cambia por la cabina llena.
    const desdeElEmbarque = ventanita.slice(ventanita.findIndex((v) => v.dibujo === "ilustracion:pasaje-embarque"));
    expect(desdeElEmbarque[0]?.t).toBeLessThan(5);
    expect(desdeElEmbarque[1]?.dibujo).toBe("ilustracion:pasaje-lleno");
    expect(desdeElEmbarque[2]?.dibujo).toBe("cinturon");
    // Con el cielo por la ventanilla: nunca en tierra.
    for (const c of ["pasaje-tripulante", "pasaje-ara-ventanilla", "pasaje-comandante"])
      for (const v of de(c)) expect(v.enTierra, `${c} a los ${v.t.toFixed(0)} s`).toBe(false);
    // Y Ara de rodillas, con el cartel apagado.
    for (const v of de("pasaje-ara-ventanilla")) expect(v.cartelApagado, `a los ${v.t.toFixed(0)} s`).toBe(true);
  });
});

// ── El kit de viaje, en el vuelo ─────────────────────────────────────────

/**
 * **El vuelo medido con alguien que juega**: `jugador` se llama en cada paso
 * con la escena y su hora, y hace lo que haría quien tiene el kit en las
 * manos. Se apunta cuándo estaba ocupado con él y cuándo pausado.
 */
function volarConElKit(jugador: (escena: VueloDePasaje, t: number) => void): Medido & {
  readonly ocupado: { desde: number; hasta: number }[];
  readonly pausas: { t: number; megafonia: boolean; juego: boolean }[];
} {
  let t = 0;
  const v = vozQueTarda(loQueDura, () => t);
  const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
  const vuelo = new VueloMedido();
  const porVer = [...LO_QUE_SE_VIO];
  const tramos: { t: number; tramo: TramoDeLinea }[] = [];
  const ocupado: { desde: number; hasta: number }[] = [];
  const pausas: { t: number; megafonia: boolean; juego: boolean }[] = [];
  for (; t < 4000; t += DT) {
    v.tic();
    if (tramos[tramos.length - 1]?.tramo !== vuelo.tramo) tramos.push({ t, tramo: vuelo.tramo });
    vuelo.paso(DT, escena.paso(DT, vuelo.lectura));
    if (porVer[0] && porVer[0].t <= vuelo.desdeQueDespego && escena.puedeSenalar) escena.senalar(porVer.shift()!.s);
    jugador(escena, t);
    if (escena.kit.ocupaAAra) {
      const ultimo = ocupado[ocupado.length - 1];
      if (ultimo && t - ultimo.hasta < DT * 1.5) ultimo.hasta = t;
      else ocupado.push({ desde: t, hasta: t });
    }
    if (escena.kit.estaAbierto) pausas.push({ t, megafonia: escena.megafoniaSuena, juego: escena.kit.juego !== null });
    if (escena.estado.puedeSeguir) escena.seguir();
    if (escena.estado.terminado) break;
  }
  return { escena, vuelo, dichas: v.dichas, tramos, ocupado, pausas };
}

/** Quien juega: abre el kit en cuanto lo tiene, elige el avión y acierta una cosa cada `cada` segundos. */
function jugadorQueAcierta(cada = 4): (escena: VueloDePasaje, t: number) => void {
  const juego = "avion" as const;
  let ultimo = -Infinity;
  return (escena, t) => {
    const kit = escena.kit;
    if (!kit.aMano) return;
    if (!kit.estaAbierto && !kit.estado.hechos.includes(juego)) kit.abrir();
    if (!kit.estaAbierto || kit.estado.pausado) return;
    const j = kit.juego;
    if (!j) {
      if (!kit.estado.hechos.includes(juego)) kit.elegir(juego);
      else kit.cerrar();
      return;
    }
    if (t - ultimo < cada) return;
    ultimo = t;
    kit.tocado();
    if (j instanceof JuegoDelAvion) {
      const p = [...NIVELES[j.numero]!.piezas, ...LUCES].find((x) => j.aMano(x));
      if (p) j.soltar(p, p, kit.hayHueco);
    }
  };
}

// ── La siesta de Ara ─────────────────────────────────────────────────────

/**
 * **El vuelo medido, con lo que falta para nivelar y para bajar**: lo que el
 * juego le da a la escena para que Ara pueda dormirse —ver `ratosDelVuelo` en
 * `game.ts`—. Con `soloEnCrucero`, la subida no lo dice —sin `hastaElCrucero`
 * Ara no se duerme subiendo—, y con un crucero largo se ve despertar a Ara
 * para bajar.
 */
class VueloMedidoConRatos extends VueloMedido {
  constructor(
    crucero = 58,
    private readonly soloEnCrucero = false,
  ) {
    super();
    this.crucero = crucero;
  }

  override get lectura(): LecturaDelPasaje {
    const base = super.lectura;
    if (this.tramo === "subida") {
      const hastaElCrucero = Math.max(0, 5785 - this.altitud) / 11.6;
      return this.soloEnCrucero ? base : { ...base, hastaElCrucero, hastaLaBajada: hastaElCrucero + this.crucero };
    }
    if (this.tramo === "crucero") return { ...base, hastaLaBajada: Math.max(0, this.crucero - this.enTramo) };
    return base;
  }
}

/** Las claves de seguridad que no se pueden perder: la demostración, el cinturón y la bajada. */
const DE_SEGURIDAD = [
  "inicio.tripulacion.pasaje.demo.intro",
  "inicio.tripulacion.pasaje.demo.cinturon",
  "inicio.tripulacion.pasaje.demo.salidas",
  "inicio.tripulacion.pasaje.demo.mascaras",
  "inicio.tripulacion.pasaje.demo.chaleco",
  "inicio.tripulacion.pasaje.demo.tarjeta",
  "inicio.tripulacion.pasaje.demo.aparatos",
  "inicio.tripulacion.pasaje.cerca.revision",
  "comandante.crucero",
  "comandante.descenso",
  "tripulacion.cinturones",
  "inicio.tripulacion.pasaje.oidos",
  "inicio.tripulacion.pasaje.cerca.aterrizaje",
];

describe("la siesta de Ara: arriba y sin nada que contar, se duerme un rato", () => {
  const m = volarElMedido(new VueloMedidoConRatos());
  const e = m.escena.estado;
  const r = m.escena.registro;
  const s = e.siestas[0];
  const cuando = (clave: string): number => r.find((d) => d.clave === clave)?.desde ?? NaN;
  const empiezaA = (tramo: TramoDeLinea): number => m.tramos.find((x) => x.tramo === tramo)?.t ?? NaN;

  it("se duerme una vez, arriba, subiendo por encima del mar de nubes", () => {
    if (entorno?.OGA_PASAJE)
      console.log(
        `siestas: ${e.siestas.map((x) => `${x.desde.toFixed(0)}–${x.hasta?.toFixed(0)}${x.paraBajar ? " para bajar" : ""}`).join(" ")}` +
          ` · arriba a los ${empiezaA("crucero").toFixed(0)} · bajada a los ${empiezaA("bajada").toFixed(0)}`,
      );

    expect(e.siestas).toHaveLength(1);
    expect(s!.desde).toBeGreaterThan(empiezaA("subida"));
    expect(s!.hasta).not.toBeNull();
    /*
     * Y lo que dura se nota (19-10-2026): con minuto y medio Enrique se
     * despertó viendo lo mismo. Es lo que queda de subida desde que la
     * comandante acaba lo de los diez mil pies.
     */
    expect(s!.hasta! - s!.desde).toBeGreaterThanOrEqual(120);
    expect(e.durmiendo).toBe(false);
  });

  it("en cuanto la comandante acaba lo de los diez mil pies: lo que contesta a Ara, antes; lo que puede esperar, después", () => {
    // Lo que contesta a lo que Ara notó o preguntó: las nubes y el gas de subida.
    expect(cuando("inicio.mama.pasaje.nubes")).toBeLessThan(s!.desde);
    expect(cuando("inicio.mama.pasaje.menosGas")).toBeLessThan(s!.desde);
    // Y lo que viene a cuento igual más tarde —el ala, a qué altura se va—, al despertar.
    expect(cuando("inicio.mama.pasaje.ala")).toBeGreaterThan(s!.hasta!);
    expect(cuando("inicio.mama.pasaje.altoRapido")).toBeGreaterThan(s!.hasta!);
  });

  it("bosteza y lo dice antes de cerrar los ojos; durmiendo y al despertar, el mapa de la ruta en la ventanita", () => {
    const bostezo = r.find((d) => d.clave === "inicio.ara.pasaje.dormirse");
    expect(bostezo?.hasta).not.toBeNull();
    expect(bostezo!.hasta!).toBeLessThanOrEqual(s!.desde + 1e-6);
    const despierta = r.find((d) => d.clave === "inicio.ara.pasaje.despertarse");
    expect(despierta?.desde).toBeGreaterThanOrEqual(s!.hasta! - 1e-6);
    expect(LINEAS_DEL_PASAJE.find((l) => l.clave === "inicio.ara.pasaje.despertarse")?.dibujo).toBe("ruta");
    // La ventanita pone el mapa en cuanto Ara se duerme, y lo tiene hasta después de despertar.
    const ventanita = m.ventanita ?? [];
    const enLa = (t: number): string | null => [...ventanita].reverse().find((v) => v.t <= t)?.dibujo ?? null;
    expect(enLa(s!.desde + 0.5)).toBe("ruta");
    expect(enLa((s!.desde + s!.hasta!) / 2)).toBe("ruta");
    // Y otra vez con lo que dice Ara al despertar, detrás de la comandante.
    expect(enLa(cuando("inicio.ara.pasaje.despertarse") + 0.5)).toBe("ruta");
  });

  it("durmiendo, no se dice nada: ni el guion, ni lo señalado, ni las charlas", () => {
    const enLaSiesta = r.filter((d) => d.desde > s!.desde + 1e-6 && d.desde < s!.hasta! - 1e-6);
    expect(enLaSiesta.map((d) => d.clave)).toEqual([]);
  });

  it("y se despierta con el ding de la luz que se apaga con el «ya estamos arriba», que se oye entero", () => {
    expect(s!.paraBajar).toBe(false);
    expect(s!.porQue).toBe("ding");
    // Se despierta en el paso en que la comandante lo dice: el anuncio se oye entero.
    expect(cuando("comandante.crucero") - s!.hasta!).toBeGreaterThanOrEqual(-1e-6);
    expect(cuando("comandante.crucero") - s!.hasta!).toBeLessThan(CORTE_DE_PLANO + 1);
    // Y Ara lo cuenta detrás, antes del baño y del servicio.
    expect(cuando("inicio.ara.pasaje.despertarse")).toBeGreaterThan(cuando("comandante.crucero"));
    expect(cuando("inicio.ara.pasaje.despertarse")).toBeLessThan(cuando("tripulacion.servicio"));
    // El baño, con la luz apagada, sigue: después de despertar.
    expect(cuando("inicio.tripulacion.pasaje.cerca.banoAhora")).toBeGreaterThan(cuando("inicio.ara.pasaje.despertarse"));
    // Y antes de empezar a bajar, que bajando no se duerme: lo de los oídos.
    expect(s!.hasta!).toBeLessThan(empiezaA("bajada"));
  });

  it("nada de seguridad se pierde, ni se dice durmiendo; y el guion pasa entero y en orden", () => {
    for (const c of DE_SEGURIDAD) {
      const d = r.find((x) => x.clave === c);
      expect(d, c).toBeDefined();
      expect(d!.desde > s!.desde && d!.desde < s!.hasta!, c).toBe(false);
    }
    expect(e.saltados).toEqual([]);
    expect(e.dichos).toEqual(GUION_DEL_PASAJE.map((x) => x.id).filter((x) => x !== "fin"));
    expect(e.terminado).toBe(true);
  });

  it("y sin rato largo callado: lo que se pasa durmiendo no cuenta como silencio", () => {
    // Los silencios en el aire, sin lo que Ara pasó durmiendo.
    const largos = silencios(m).filter((x) => {
      if (!(x.tramo === "subida" || x.tramo === "crucero" || x.tramo === "bajada")) return false;
      const durmiendo = Math.max(0, Math.min(x.desde + x.largo, s!.hasta!) - Math.max(x.desde, s!.desde));
      return x.largo - durmiendo > CALLADO_COMO_MUCHO;
    });
    expect(largos.map((x) => `${x.largo.toFixed(0)} s desde ${x.desde.toFixed(0)} (${x.tramo})`)).toEqual([]);
  });
});

describe("y con un crucero largo, despierta a Ara la tripulante para bajar", () => {
  const m = volarElMedido(new VueloMedidoConRatos(420, true));
  const e = m.escena.estado;
  const r = m.escena.registro;
  const s = e.siestas[0];
  const cuando = (clave: string): number => r.find((d) => d.clave === clave)?.desde ?? NaN;
  const bajada = m.tramos.find((x) => x.tramo === "bajada")?.t ?? NaN;

  it("se duerme en el crucero, después del servicio, y se despierta antes de bajar", () => {
    expect(e.siestas).toHaveLength(1);
    expect(s!.paraBajar).toBe(true);
    expect(s!.desde).toBeGreaterThan(cuando("inicio.ara.pasaje.nubesSostiene"));
    expect(s!.hasta!).toBeLessThan(bajada);
  });

  it("por lo que es: el cinturón y los oídos; y después, lo de siempre al bajar", () => {
    const despertar = cuando("inicio.tripulacion.pasaje.cerca.despertar");
    expect(despertar).toBeGreaterThanOrEqual(s!.hasta! - 1e-6);
    expect(despertar).toBeLessThan(cuando("inicio.ara.pasaje.despertarse"));
    expect(cuando("inicio.ara.pasaje.despertarse")).toBeLessThan(cuando("comandante.descenso"));
    // Lo de los oídos, preguntando o —si el plop de la subida ya se explicó— sabiendo que es al revés.
    expect(cuando("comandante.descenso")).toBeLessThan(
      Math.min(...["inicio.ara.pasaje.oidos", "inicio.ara.pasaje.oidosAlReves"].map(cuando).filter((x) => !Number.isNaN(x))),
    );
    for (const c of DE_SEGURIDAD) expect(r.some((x) => x.clave === c), c).toBe(true);
    expect(e.saltados).toEqual([]);
  });

  it("y sin los números del juego, Ara no se duerme: sin saber cuándo llega lo siguiente, no se puede despertar a tiempo", () => {
    expect(volarElMedido().escena.estado.siestas).toEqual([]);
  });
});

describe("el modo rápido (⏩), puesto en cuanto sale y sin tocarlo más", () => {
  const sinBoton = volarElMedido(new VueloMedidoConRatos());
  const ratos: { desde: number; hasta: number }[] = [];
  const mal: string[] = [];
  const enLaLlegada: string[] = [];
  const despuesDeLaLlegada: string[] = [];
  let antes = false;
  let puesto = false;
  const m = volarElMedido(new VueloMedidoConRatos(), (escena, t, l) => {
    const b = escena.boton;
    // Como quien se aburre: lo pone en cuanto sale, una vez, y se olvida.
    if (b.sale && !puesto) puesto = escena.adelantar();
    const ahora = escena.adelantaAhora;
    if (ahora && !antes) ratos.push({ desde: t, hasta: Infinity });
    if (!ahora && antes) ratos[ratos.length - 1]!.hasta = t;
    if (b.sale && (l.enTierra || escena.durmiendo || l.flaps > 0.05 || (l.tren ?? 0) > 0.05 || escena.dicho("aproximacion")))
      mal.push(`${t.toFixed(0)} ${l.tramo}`);
    const bajandoYa = l.tramo === "bajada" || l.tramo === "final" || l.tramo === "recogida";
    if (ahora && bajandoYa && l.altitud < EMPIEZA_LA_LLEGADA) enLaLlegada.push(`${t.toFixed(0)} a ${l.altitud.toFixed(0)} m`);
    const llegada = escena.adelanto.llegada;
    if (llegada !== null && (b.sale || b.puesto || ahora)) despuesDeLaLlegada.push(`${t.toFixed(0)} ${l.tramo}`);
    antes = ahora;
  });
  const e = m.escena.estado;
  const r = m.escena.registro;
  const adelantando = (t: number): boolean => ratos.some((x) => t > x.desde + 1e-6 && t < x.hasta - 1e-6);

  it("un toque lo deja puesto: corre en cada rato sin nada que contar, muchas más veces que el botón de antes", () => {
    const total = ratos.reduce((s, x) => s + (Math.min(x.hasta, 4000) - x.desde), 0);
    if (entorno?.OGA_PASAJE)
      console.log(`corriendo ${ratos.length} veces, ${total.toFixed(0)} s: ${ratos.map((x) => `${x.desde.toFixed(0)}–${x.hasta.toFixed(0)}`).join(" ")}`);
    expect(e.adelanto.pulsado).toBe(1);
    /*
     * El vuelo va contado de punta a punta, y con el kit arriba —llega en lo
     * alto de la bajada y se recoge a los diez mil pies— el modo rápido se
     * queda quieto mientras se juega: corre menos, pero corre.
     */
    expect(ratos.length).toBeGreaterThanOrEqual(3);
    expect(total).toBeGreaterThan(45);
    // Y la escena apunta los mismos ratos que se ven desde fuera.
    expect(e.adelanto.ratos.length).toBe(ratos.length);
  });

  it("nunca en tierra, ni con Ara durmiendo, ni preparando la cabina, ni con el tren o los flaps fuera", () => {
    expect(mal).toEqual([]);
    expect(ratos.every((x) => x.hasta < Infinity)).toBe(true);
  });

  it("mientras corre no habla nadie: lo que se dice, con el vuelo ya a su paso", () => {
    expect(r.filter((d) => adelantando(d.desde)).map((d) => `${d.clave}@${d.desde.toFixed(0)}`)).toEqual([]);
  });

  it("se para solo un poco antes de lo siguiente: casi siempre con su rato de llegar", () => {
    const despues = ratos.map((x) => (r.find((d) => d.desde >= x.hasta - 1e-6)?.desde ?? Infinity) - x.hasta);
    if (entorno?.OGA_PASAJE) console.log(`después de parar: ${despues.map((d) => d.toFixed(0)).join(" ")}`);
    const aTiempo = despues.filter((d) => d >= ADELANTO.PARA_ANTES / 2);
    expect(aTiempo.length / despues.length).toBeGreaterThanOrEqual(0.6);
  });

  it("y la llegada se vive a su paso: en los diez mil pies bajando se apaga solo, y el botón ya no vuelve", () => {
    // Donde empieza la música de llegada: la misma marca.
    expect(EMPIEZA_LA_LLEGADA).toBe(BAJANDO_A_LA_PISTA);
    expect(e.adelanto.llegada).not.toBeNull();
    expect(e.adelanto.seApagoSolo).toBe(true);
    expect(e.adelanto.puesto).toBe(false);
    expect(enLaLlegada).toEqual([]);
    expect(despuesDeLaLlegada).toEqual([]);
    // Y corrió también bajando, por encima: la parte alta de la bajada, sobre el mar.
    const bajada = m.tramos.find((x) => x.tramo === "bajada")?.t ?? Infinity;
    expect(ratos.some((x) => x.desde > bajada)).toBe(true);
  });

  it("y no se salta nada: el guion entero y en orden, lo de seguridad y lo que se enseña", () => {
    expect(e.saltados).toEqual([]);
    expect(e.dichos).toEqual(GUION_DEL_PASAJE.map((x) => x.id).filter((x) => x !== "fin"));
    for (const c of DE_SEGURIDAD) expect(r.some((x) => x.clave === c), c).toBe(true);
    const sin = new Set(sinBoton.escena.estado.charlas);
    expect(e.charlas.filter((c) => !sin.has(c))).toEqual([]);
    expect([...sin].filter((c) => !e.charlas.includes(c))).toEqual([]);
  });
});

describe("el vuelo de dentro de un rato, para saber qué viene", () => {
  const arriba: LecturaDelPasaje = {
    tramo: "crucero",
    enTramo: 10,
    motor: true,
    enTierra: false,
    porElSuelo: 150,
    altura: 4877,
    altitud: 4877,
    vertical: 0,
    autorizado: true,
    flaps: 0,
    nubes: { base: 1300, techo: 1900 },
    enNube: 0,
    cabina: 0,
    faltaParaTocar: 140000,
    potencia: "subida",
    conEstaPotencia: 300,
    hastaLaBajada: 40,
  };

  it("pasado el punto de descenso, se baja al ralentí y la cabina baja: lo de los oídos", () => {
    const p = proyectar(arriba, 60);
    expect(p.tramo).toBe("bajada");
    expect(p.potencia).toBe("ralenti");
    expect(p.conEstaPotencia).toBeCloseTo(20);
    expect(p.cabina).toBeLessThan(-0.6);
    expect(p.altitud).toBeLessThan(arriba.altitud);
    expect(p.faltaParaTocar).toBeCloseTo(140000 - 150 * 60);
  });

  it("y subiendo, se nivela al llegar arriba", () => {
    const p = proyectar({ ...arriba, tramo: "subida", vertical: 10, altitud: 4000, hastaElCrucero: 30, hastaLaBajada: 100 }, 50);
    expect(p.tramo).toBe("crucero");
    expect(p.altitud).toBeCloseTo(4300);
    expect(p.vertical).toBe(0);
    expect(p.hastaElCrucero).toBeUndefined();
    expect(p.hastaLaBajada).toBeCloseTo(50);
  });

  it("y metido en la capa de nubes, dentro de la nube", () => {
    const p = proyectar({ ...arriba, tramo: "bajada", altitud: 2100, vertical: -8, hastaLaBajada: undefined }, 40);
    expect(p.enNube).toBe(1);
  });
});

/**
 * **El kit no pierde su sitio contra lo que viene a cuento.** El kit llega en
 * la bajada a los 104 km de la pista, tras diez segundos callados; el ala de
 * la comandante, que puede esperar, en cuanto hay quince. En el vuelo del
 * banco los dos se podían decir en el mismo instante —el kit a los 1.048,7 s,
 * justo a los quince del frío—, y bastaba que la bajada llegara un segundo
 * más tarde a los 104 km para que empezara el ala: el kit se iba treinta
 * segundos más allá y caía encima de lo de la ventanilla. Se vio con el
 * relieve fino del ADR 0022, que mueve un poco cuándo se nombra el paisaje.
 * Aquí, la bajada de unos cientos de metros a unos kilómetros más larga: con
 * el vuelo de los ratos y un kilómetro más, el ala se colaba antes del kit.
 * Ver `kitAPuntoDeLlegar`.
 */
describe("el kit, antes que el ala, aunque la bajada llegue un poco más tarde a su sitio", () => {
  for (const extra of [0, 1000, 3000, 5000])
    it(`con la bajada ${extra} m más larga`, () => {
      class V extends VueloMedidoConRatos {
        override get lectura(): LecturaDelPasaje {
          const base = super.lectura;
          return base.tramo === "bajada" ? { ...base, faltaParaTocar: base.faltaParaTocar + extra } : base;
        }
      }
      const m = volarElMedido(new V(58));
      const k = m.dichas.map((d) => d.linea.clave);
      const kit = k.indexOf("inicio.tripulacion.pasaje.cerca.kitAqui");
      const ala = k.indexOf("inicio.mama.pasaje.ala");
      expect(kit).toBeGreaterThanOrEqual(0);
      expect(ala).toBeGreaterThan(kit);
    });
});

describe("el kit de viaje, en el vuelo", () => {
  const alturas: { t: number; altitud: number }[] = [];
  const m = volarElMedido(undefined, (_e, t, l) => alturas.push({ t, altitud: l.altitud }));
  const altitudA = (t: number): number => [...alturas].reverse().find((x) => x.t <= t)?.altitud ?? NaN;
  const cuando = (dichas: Dicha[], clave: string): number => dichas.find((d) => d.linea.clave === clave)?.desde ?? NaN;
  const tramoA = (tramos: { t: number; tramo: TramoDeLinea }[], t: number): TramoDeLinea =>
    [...tramos].reverse().find((x) => x.t <= t)?.tramo ?? "puerta";

  it("la tripulante lo trae en la parte alta de la bajada: sin megafonía cerca y con rato para jugar antes de los diez mil pies", () => {
    const dado = cuando(m.dichas, "inicio.tripulacion.pasaje.cerca.kitAqui");
    expect(dado).toBeGreaterThan(0);
    expect(tramoA(m.tramos, dado)).toBe("bajada");
    // Con la frase del rato y la de Ara detrás, en ese orden.
    const k = m.dichas.map((d) => d.linea.clave);
    const i = k.indexOf("inicio.tripulacion.pasaje.cerca.kitAqui");
    expect(k.slice(i, i + 3)).toEqual([
      "inicio.tripulacion.pasaje.cerca.kitAqui",
      "inicio.tripulacion.pasaje.cerca.kitRato",
      "inicio.ara.pasaje.kitGracias",
    ]);
    // Ni megafonía en el medio minuto de antes ni en el minuto de después: la de La Gomera, más tarde, lo pausa.
    const megafonia = m.dichas.filter((d) => d.linea.megafonia);
    expect(megafonia.filter((d) => d.desde > dado - 30 && d.desde < dado + 60).map((d) => d.linea.clave)).toEqual([]);
    // Bien por encima de los diez mil pies, y con más de tres minutos hasta que se pide guardarlo.
    expect(altitudA(dado)).toBeGreaterThan(3048 + 900);
    expect(cuando(m.dichas, "inicio.tripulacion.pasaje.cerca.kitGuardar") - dado).toBeGreaterThan(180);
  });

  it("y al empezar la llegada, cruzando los diez mil pies bajando, pide guardarlo: la llegada, sin juego", () => {
    const guardar = cuando(m.dichas, "inicio.tripulacion.pasaje.cerca.kitGuardar");
    expect(tramoA(m.tramos, guardar)).toBe("bajada");
    expect(altitudA(guardar)).toBeLessThan(3048);
    expect(altitudA(guardar)).toBeGreaterThan(3048 - 300);
    // Antes de preparar la cabina, y en la última revisión ya no se repite.
    expect(guardar).toBeLessThan(cuando(m.dichas, "comandante.aproximacion"));
    expect(m.dichas.filter((d) => d.linea.clave === "inicio.tripulacion.pasaje.cerca.kitGuardar")).toHaveLength(1);
    expect(m.escena.estado.kit.recogido).toBe(true);
  });

  for (const juego of ["avion"] as const) {
    it(`se juega en el vuelo —${juego}— hasta que despega, y mientras se juega la escena no cuenta encima`, () => {
      const r = volarConElKit(jugadorQueAcierta());
      const e = r.escena.estado;
      expect(e.kit.hechos).toContain(juego);
      const k = r.dichas.map((d) => d.linea.clave);
      // Lo de cada pieza, con hueco; lo de las luces, siempre. Ver `JuegoDelAvion.poner`.
      expect(k).toContain("inicio.ara.pasaje.kit.piezas.ala");
      expect(k).toContain("inicio.ara.pasaje.kit.avion.luces");
      expect(k).toContain("inicio.ara.pasaje.kit.piezas.empezar");
      expect(k).toContain("inicio.ara.pasaje.kit.piezas.fin");
      // Nunca dos frases a la vez.
      const reg = r.escena.registro;
      for (let i = 1; i < reg.length; i++)
        expect(reg[i]!.desde, reg[i]!.clave).toBeGreaterThanOrEqual(reg[i - 1]!.hasta ?? Infinity);
      // Ninguna charla empieza con el kit en las manos: lo que viene a cuento espera.
      const deCharla = new Set(CHARLAS_DEL_PASAJE.flatMap((c) => c.lineas.map((l) => l.clave)));
      const encima = r.dichas.filter(
        (d) => deCharla.has(d.linea.clave) && r.ocupado.some((o) => d.desde > o.desde + DT && d.desde < o.hasta),
      );
      expect(encima.map((d) => `${d.linea.clave}@${d.desde.toFixed(0)}`)).toEqual([]);
      expect(r.ocupado.length).toBeGreaterThan(0);
      // Y el vuelo sigue entero: nada del guion se salta por jugar.
      expect(e.saltados).toEqual([]);
      expect(e.terminado).toBe(true);
    });
  }

  it("se pausa mientras habla la megafonía: no se juega, y se sigue al acabar", () => {
    let senalado = false;
    const acierta = jugadorQueAcierta(6);
    const r = volarConElKit((escena, t) => {
      acierta(escena, t);
      // Con el kit abierto, la comandante señala algo por la ventanilla.
      if (!senalado && escena.kit.estaAbierto && escena.kit.juego) {
        senalado = true;
        escena.senalar(sitio("teide", "izquierda"));
      }
    });
    const conMegafonia = r.pausas.filter((p) => p.megafonia);
    expect(conMegafonia.length).toBeGreaterThan(10);
    // Mientras suena, el juego no se deja tocar.
    expect(conMegafonia.every((p) => !p.juego)).toBe(true);
    // Y al acabar, se vuelve a jugar.
    const despues = r.pausas.filter((p) => p.t > conMegafonia[conMegafonia.length - 1]!.t + 1);
    expect(despues.some((p) => p.juego)).toBe(true);
    expect(r.escena.estado.kit.hechos).toContain("avion");
  });

  it("se recoge antes de aterrizar aunque se esté jugando: y ya no se abre", () => {
    // Quien no acaba nunca: sigue con el kit abierto cuando llega la aproximación.
    let recogidoA: number | null = null;
    let abiertoTrasRecoger = false;
    const r = volarConElKit((escena, t) => {
      const kit = escena.kit;
      if (kit.aMano && !kit.estaAbierto) kit.abrir();
      if (kit.estaAbierto && !kit.juego && !kit.estado.pausado) kit.elegir("avion");
      if (kit.estaAbierto) kit.tocado();
      if (kit.estado.recogido) {
        recogidoA ??= t;
        kit.abrir();
        abiertoTrasRecoger ||= kit.estaAbierto;
      }
    });
    expect(recogidoA).not.toBeNull();
    // Recogido cuando la tripulante lo pide, que es antes de la final.
    const guardar = cuando(r.dichas, "inicio.tripulacion.pasaje.cerca.kitGuardar");
    expect(recogidoA!).toBeGreaterThanOrEqual(guardar);
    expect(recogidoA! - guardar).toBeLessThan(1);
    expect(tramoA(r.tramos, recogidoA!)).toBe("bajada");
    expect(abiertoTrasRecoger).toBe(false);
    // Desde la aproximación hasta recogerlo, pausado.
    const aprox = cuando(r.dichas, "comandante.aproximacion");
    expect(r.pausas.filter((p) => p.t > aprox + DT).every((p) => !p.juego)).toBe(true);
  });

  it("con las frases del kit encadenadas, lo pide la tripulante a los diez mil pies y no lo recoge la red", () => {
    // Quien pone una pieza cada segundo y vuelve a armar en cuanto acaba: cada pieza, su frase, sin un silencio.
    let recogidoA: number | null = null;
    let ultimo = -Infinity;
    const r = volarConElKit((escena, t) => {
      const kit = escena.kit;
      if (kit.estado.recogido) {
        recogidoA ??= t;
        return;
      }
      if (!kit.aMano) return;
      if (!kit.estaAbierto) kit.abrir();
      if (!kit.estaAbierto || kit.estado.pausado) return;
      const j = kit.juego;
      if (!j) {
        kit.elegir("avion");
        return;
      }
      if (t - ultimo < 1) return;
      ultimo = t;
      kit.tocado();
      if (j instanceof JuegoDelAvion) {
        const p = [...NIVELES[j.numero]!.piezas, ...LUCES].find((x) => j.aMano(x));
        if (p) j.soltar(p, p, true);
      }
    });
    const guardar = r.dichas.find((d) => d.linea.clave === "inicio.tripulacion.pasaje.cerca.kitGuardar");
    expect(guardar, "la tripulante pide guardarlo").toBeDefined();
    expect(recogidoA).not.toBeNull();
    // Lo recoge al pedirlo ella, no la red de mil pies más abajo.
    expect(recogidoA! - guardar!.desde).toBeGreaterThanOrEqual(0);
    expect(recogidoA! - guardar!.desde).toBeLessThan(1);
  });

  it("con el kit de prueba, en la mano desde el puesto, la tripulante no lo trae otra vez y lo pide a los diez mil pies", () => {
    // Lo que hace `?inicio=3&kit`: ver `kitDePrueba` en `game.ts`.
    const alturasDeLaPrueba: { t: number; altitud: number }[] = [];
    const r = volarElMedido(undefined, (escena, t, l) => {
      if (t < 1) escena.kit.dar();
      alturasDeLaPrueba.push({ t, altitud: l.altitud });
    });
    const k = r.dichas.map((d) => d.linea.clave);
    expect(k).not.toContain("inicio.tripulacion.pasaje.cerca.kitAqui");
    expect(r.escena.estado.saltados).toEqual(["kit"]);
    const guardar = cuando(r.dichas, "inicio.tripulacion.pasaje.cerca.kitGuardar");
    const altitud = [...alturasDeLaPrueba].reverse().find((x) => x.t <= guardar)?.altitud ?? NaN;
    expect(altitud).toBeLessThan(3048);
    expect(altitud).toBeGreaterThan(3048 - 300);
    expect(r.escena.estado.kit.recogido).toBe(true);
    expect(r.escena.estado.terminado).toBe(true);
  });
});

// ── Lo que se nombra del paisaje, solo si se ve ──────────────────────────

/*
 * **Solo se nombra lo que se ve** (18-10-2026, puntos 281, 286 y 287). Enrique
 * encontró cinco veces en un vuelo la escena nombrando lo que por la
 * ventanilla de Ara no se veía. Aquí el vuelo medido con un mundo de mentira
 * que se porta como el mar de nubes del alisio —base a 1.532 m y techo a
 * 1.982 m—: dentro de la nube no se ve nada; desde encima, solo lo que asoma
 * por encima de la capa, el Teide y las cumbres de La Palma; y desde debajo,
 * el mar, la costa y lo que no tapa la nube. Lo que se comprueba no lo mira la
 * escena: lo mira la voz, con ese mundo, en el instante en que empieza cada
 * frase que nombra algo.
 */

const NADA: VistaDelSitio = { como: null, lado: null };
const BASE = 1532;
const TECHO = 1982;

/** Lo que asoma por encima del mar de nubes: el Teide y las cumbres de La Palma. */
const ASOMA = new Set(["teide", "taburiente"]);

/** **Lo que se ve en el vuelo medido**, con el mar de nubes. Ver la cabecera. */
function loQueSeVeEnElMedido(v: VueloMedido): (sitio: SitioDelPaisaje, plano?: Plano) => VistaDelSitio {
  return (sitio, plano) => {
    if (v.enLaNube) return NADA;
    const debajo = v.altitud < BASE;
    const encima = v.altitud > TECHO;
    const como = plano ? (esDeFuera(plano) ? "fuera" : plano === "ventanilla" ? "ventanilla" : "asomado") : null;
    const visto = (c: "ventanilla" | "asomado" | "fuera", lado: "izquierda" | "derecha" = "izquierda"): VistaDelSitio => ({
      como: como ?? c,
      lado,
    });
    if (sitio === "mar-abajo") return v.sobreElMar && debajo ? visto("asomado") : NADA;
    if (sitio === "nubes-abajo") return encima ? visto("asomado") : NADA;
    if (sitio === "tierra-abajo") return !v.sobreElMar && debajo ? visto("ventanilla") : NADA;
    if (sitio === "isla-de-llegada")
      return v.falta < 50000 && (debajo || encima) ? visto(v.falta > 30000 ? "fuera" : "ventanilla") : NADA;
    if (sitio === "costa-de-llegada") return v.falta < 40000 && debajo ? visto("fuera") : NADA;
    /*
     * La ladera de Mazo, por el cristal de Ara y solo así: con el relieve y la
     * final de la 36 del juego, desde unos tres kilómetros del umbral, que es
     * cuando el pueblo queda a tres y se distinguen sus casas. Ver
     * `docs/historias/fuentes.md`.
     */
    if (sitio === "ladera-de-mazo") return v.tramo === "final" && v.falta < 3000 && (!plano || como === "asomado") ? visto("asomado") : NADA;
    const que = sitio.slice("hito:".length);
    return ASOMA.has(que) ? (encima || debajo ? visto("ventanilla") : NADA) : debajo ? visto("ventanilla") : NADA;
  };
}

/** **Qué nombra cada frase**, para mirarlo con el mundo y no con la escena. */
const NOMBRA: Readonly<Record<string, SitioDelPaisaje>> = {
  "inicio.ara.pasaje.volando": "tierra-abajo",
  "inicio.ara.pasaje.sobreLaIsla": "tierra-abajo",
  "inicio.ara.pasaje.marArriba": "mar-abajo",
  "inicio.ara.pasaje.marQuieto": "mar-abajo",
  "inicio.ara.pasaje.marAbajo": "mar-abajo",
  "inicio.ara.pasaje.cerquita": "mar-abajo",
  "inicio.ara.pasaje.marDeNubes": "nubes-abajo",
  "inicio.ara.pasaje.isla": "isla-de-llegada",
  "inicio.ara.pasaje.islaCerca": "costa-de-llegada",
  "inicio.ara.pasaje.mazo": "ladera-de-mazo",
};

interface VueloConPaisaje extends Medido {
  /** Lo que nombró cada frase al empezar a sonar, y si se veía en el mundo. */
  readonly nombrado: { clave: string; sitio: SitioDelPaisaje; seVeia: boolean; enLaNube: boolean; t: number }[];
}

/**
 * **El vuelo medido, con el mar de nubes y lo señalado de verdad**: lo de la
 * ventanilla, cuando lo vio el banco —también Anaga y La Orotava, que van
 * debajo de la nube, y La Gomera—. Con `vuelo`, otro vuelo medido.
 */
function volarConElPaisaje(vuelo: VueloMedido = new VueloMedido()): VueloConPaisaje {
  let t = 0;
  const ver = loQueSeVeEnElMedido(vuelo);
  vuelo.ver = ver;
  const v = vozQueTarda(loQueDura, () => t);
  const nombrado: VueloConPaisaje["nombrado"] = [];
  const escena = new VueloDePasaje(
    {
      decir: (l, alAcabar, alEmpezar) => {
        const hito = l.clave === "ventanilla" ? /Ese es (\w+)/.exec(l.texto ?? "")?.[1] : undefined;
        const sitio: SitioDelPaisaje | undefined = NOMBRA[l.clave] ?? (hito ? `hito:${hito}` : undefined);
        if (sitio) nombrado.push({ clave: l.clave, sitio, seVeia: ver(sitio).como !== null, enLaNube: vuelo.enLaNube, t });
        v.voz.decir(l, alAcabar);
        alEmpezar?.();
      },
      callar: () => v.voz.callar(),
    },
    { lado: "izquierda" },
  );
  const porVer = [...LO_QUE_SE_VIO];
  const tramos: { t: number; tramo: TramoDeLinea }[] = [];
  for (; t < 4000; t += DT) {
    v.tic();
    if (tramos[tramos.length - 1]?.tramo !== vuelo.tramo) tramos.push({ t, tramo: vuelo.tramo });
    vuelo.paso(DT, escena.paso(DT, vuelo.lectura));
    if (porVer[0] && porVer[0].t <= vuelo.desdeQueDespego && escena.puedeSenalar) escena.senalar(porVer.shift()!.s);
    if (escena.estado.puedeSeguir) escena.seguir();
    if (escena.estado.terminado) break;
  }
  return { escena, vuelo, dichas: v.dichas, tramos, nombrado };
}

describe("lo que se nombra del paisaje, solo si se ve", () => {
  const m = volarConElPaisaje();
  const e = m.escena.estado;
  const claves = m.dichas.map((d) => d.linea.clave);

  it("nada del paisaje se nombra sin verse: ni debajo del mar de nubes, ni con el avión dentro de una nube", () => {
    expect(m.nombrado.length).toBeGreaterThan(4);
    for (const n of m.nombrado) {
      expect(n.seVeia, `${n.clave} (${n.sitio}) a los ${n.t.toFixed(0)} s`).toBe(true);
      expect(n.enLaNube, `${n.clave} a los ${n.t.toFixed(0)} s`).toBe(false);
    }
    // Y la escena lo apunta con desde dónde se veía.
    expect(e.nombrados.length).toBeGreaterThan(3);
    for (const n of e.nombrados) expect(n.como, n.clave).not.toBeNull();
  });

  it("Anaga, La Orotava y La Gomera, debajo del mar de nubes: no se nombran, y la escena sigue", () => {
    expect(e.senalados).toContain("teide");
    for (const que of ["anaga", "orotava", "garajonay"]) expect(e.senalados, que).not.toContain(que);
    expect(m.escena.olvidadosPorNoVerse).toEqual(expect.arrayContaining(["anaga", "orotava", "garajonay"]));
    expect(e.terminado).toBe(true);
    // Y Ara no contesta a lo que no se dijo.
    expect(claves).not.toContain("inicio.ara.pasaje.orotava");
    expect(claves).not.toContain("inicio.ara.pasaje.garajonay");
    // Lo que sí se ve por encima de la capa es la capa: el mar de nubes.
    expect(claves).toContain("inicio.ara.pasaje.marDeNubes");
  });

  it("y lo que se ve por fuera se enseña por fuera: la isla de llegada lejos, con el avión delante", () => {
    const isla = e.nombrados.find((n) => n.clave === "inicio.ara.pasaje.isla");
    expect(isla, "la isla").toBeTruthy();
    const plano = e.planos.filter((p) => p.desde <= isla!.desde + 1e-6).pop();
    const esperado = isla!.como === "fuera" ? "fuera-paisaje" : isla!.como === "asomado" ? "asomado-paisaje" : "ventanilla";
    expect(plano?.plano).toBe(esperado);
    if (plano?.plano === "fuera-paisaje") expect(plano.sitio).toBe("isla-de-llegada");
  });

  it("dentro de la nube no sale la frase de la isla: sale cuando se ve, y entretanto se cuenta la nube", () => {
    /*
     * Bajando, el avión se mete en la nube justo cuando tocaría ver la isla
     * —a los cuarenta y tantos kilómetros— y no sale de ella hasta los
     * treinta y tres. Con la ventanilla blanca, «¡ya se ve la isla!» es
     * mentira (captura 227): espera, y entretanto Ara cuenta la nube.
     */
    class MetidoEnLaNube extends VueloMedido {
      override get enLaNube(): boolean {
        return super.enLaNube || (this.tramo === "bajada" && this.falta < 47000 && this.falta > 33000);
      }
    }
    const r = volarConElPaisaje(new MetidoEnLaNube());
    const isla = r.nombrado.find((n) => n.clave === "inicio.ara.pasaje.isla");
    expect(isla, "la isla, cuando se ve").toBeTruthy();
    expect(isla!.enLaNube).toBe(false);
    expect(isla!.seVeia).toBe(true);
    // Y dentro, lo que es verdad: otra vez en una nube.
    const k = r.dichas.map((d) => d.linea.clave);
    expect(k.indexOf("inicio.ara.pasaje.otraNube")).toBeGreaterThan(-1);
    expect(k.indexOf("inicio.ara.pasaje.otraNube")).toBeLessThan(k.indexOf("inicio.ara.pasaje.isla"));
  });

  it("y la comandante dice el lado de cuando lo dice, no el de cuando se vio", () => {
    let t = 0;
    const v = vozQueTarda(() => 4, () => t);
    const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
    const vuelo = new VueloDeMentira();
    const lectura = (): LecturaDelPasaje => ({
      ...vuelo.lectura,
      // Visto por la izquierda, y para cuando se dice el avión ya giró: queda a la derecha.
      ver: () => ({ como: "fuera", lado: "derecha" }),
    });
    let dado = false;
    for (; t < 3000 && !escena.estado.terminado; t += DT) {
      v.tic();
      vuelo.paso(DT, escena.paso(DT, lectura()), t);
      if (!dado && escena.puedeSenalar) {
        dado = true;
        escena.senalar({
          ...sitio("teide", "izquierda"),
          porLado: {
            izquierda: { texto: "A la izquierda, el teide.", clave: "ventanilla", relleno: { lado: "izquierda" } },
            derecha: { texto: "A la derecha, el teide.", clave: "ventanilla", relleno: { lado: "derecha" } },
          },
        });
      }
      if (escena.estado.puedeSeguir) escena.seguir();
    }
    const dicha = v.dichas.find((d) => d.linea.clave === "ventanilla")!;
    expect(dicha.linea.texto).toBe("A la derecha, el teide.");
    // Y por la derecha, Ara no lo ve desde su ventanilla: no contesta.
    expect(v.dichas.map((d) => d.linea.clave)).not.toContain("inicio.ara.pasaje.teide");
    // Y se enseña por fuera, con el Teide al fondo.
    expect(escena.estado.planos.some((p) => p.plano === "fuera-paisaje" && p.sitio === "hito:teide")).toBe(true);
  });

  it("ni corta a nadie para enseñarlo: los planos del paisaje también caen en un silencio", () => {
    const r = m.escena.registro;
    for (let i = 1; i < e.planos.length; i++) {
      const ahora = e.planos[i]!;
      if (!esDeFuera(e.planos[i - 1]!.plano) && !esDeFuera(ahora.plano)) continue;
      for (const f of r)
        expect(
          f.desde < ahora.desde + CORTE_DE_PLANO - 1e-6 && (f.hasta ?? Infinity) > ahora.desde + 1e-6,
          `${ahora.plano}@${ahora.desde.toFixed(1)} · ${f.clave}`,
        ).toBe(false);
    }
  });
});

/*
 * **Una foto no sale sin la voz que la cuenta, y Ara no contesta a lo que no
 * se ha oído** (punto 287). La foto del gomero silbando salía con la historia
 * del silbo sin sonar: la escena ponía la foto al pedir la historia, no al
 * empezar a sonar, y detrás Ara preguntaba «¿hablar silbando?» a nada.
 */
describe("la foto del silbo no sale muda", () => {
  const gomera: Senalado = {
    que: "garajonay",
    lado: "izquierda",
    dicho: { texto: "Esa isla es La Gomera.", clave: "ventanilla", relleno: { que: "ventanilla.garajonay" } },
    historia: {
      texto: "Y en La Gomera se habla silbando.",
      clave: "ventanilla.historia",
      relleno: { historia: "ventanilla.historia.garajonay" },
      sitio: "garajonay",
    },
  };

  /** Vuela con una voz en la que la historia `suena` o no, y apunta la ventanita. */
  function conLaHistoria(suena: boolean): { fotos: number; claves: string[]; historia: string | null } {
    let t = 0;
    let fotos = 0;
    // En un objeto: lo cambia la voz por dentro, y el bucle lo tiene que ver.
    const voz: { sonando: { fin: number; acabar: () => void } | null } = { sonando: null };
    const claves: string[] = [];
    const escena = new VueloDePasaje(
      {
        decir: (l, alAcabar, alEmpezar) => {
          claves.push(l.clave);
          if (l.clave === "ventanilla.historia" && !suena) {
            // Su voz no llega: no empieza, y la boca la suelta sin sonar: se lee.
            voz.sonando = { fin: t + 0.2, acabar: () => alAcabar(4) };
            return;
          }
          alEmpezar?.();
          voz.sonando = { fin: t + 4, acabar: () => alAcabar(0) };
        },
        callar: () => (voz.sonando = null),
      },
      { lado: "izquierda" },
    );
    const vuelo = new VueloDeMentira();
    let dado = false;
    for (; t < 3000 && !escena.estado.terminado; t += DT) {
      const s = voz.sonando;
      if (s && t >= s.fin) {
        voz.sonando = null;
        s.acabar();
      }
      vuelo.paso(DT, escena.paso(DT, vuelo.lectura), t);
      if (escena.estado.dibujo === "foto:garajonay") fotos++;
      if (!dado && escena.puedeSenalar) {
        dado = true;
        escena.senalar(gomera);
      }
      if (escena.estado.puedeSeguir) escena.seguir();
    }
    return { fotos, claves, historia: escena.registro.find((d) => d.clave === "ventanilla.historia")?.como ?? null };
  }

  it("sin su voz, ni la foto ni lo que contesta Ara", () => {
    const r = conLaHistoria(false);
    expect(r.historia).toBe("muda");
    expect(r.fotos).toBe(0);
    expect(r.claves).not.toContain("inicio.ara.pasaje.garajonay");
  });

  it("y con su voz, la foto mientras suena y Ara detrás", () => {
    const r = conLaHistoria(true);
    expect(r.historia).toBe("sono");
    expect(r.fotos).toBeGreaterThan(10);
    expect(r.claves.indexOf("inicio.ara.pasaje.garajonay")).toBe(r.claves.indexOf("ventanilla.historia") + 1);
  });
});

describe("lo que se ve, cuando pasa: la nube, debajo de las nubes, el Teide, el tren y el señalero", () => {
  const m = volarConElPaisaje();
  const e = m.escena.estado;
  const k = m.dichas.map((d) => d.linea.clave);
  const empieza = (clave: string): Dicha | undefined => m.dichas.find((d) => d.linea.clave === clave);

  it("dentro de la nube, cuando el avión se menea, se cuenta en ese momento y con calma", () => {
    expect(e.charlas).toContain("meneo");
    const meneo = empieza("inicio.ara.pasaje.meneo");
    expect(meneo).toBeTruthy();
    // Lo nota Ara en el momento, lo explica la comandante detrás, y Ara lo cuenta con calma.
    const i = k.indexOf("inicio.ara.pasaje.meneo");
    expect(k[i + 1]).toBe("inicio.mama.pasaje.meneo");
    expect(k[i + 2]).toBe("inicio.ara.pasaje.meneoBien");
    // Con la cara contra el cristal, que es desde donde se ve el ala.
    expect(e.planos.some((p) => p.plano === "asomado-motor" && Math.abs(p.desde - meneo!.desde) < 2)).toBe(true);
  });

  it("al salir por debajo de las nubes, lo cuenta la tripulante: la base, el techo, los números de hoy y la visibilidad", () => {
    const i = k.indexOf("inicio.ara.pasaje.bajoLasNubes");
    expect(i).toBeGreaterThan(-1);
    expect(k.slice(i + 1, i + 4)).toEqual([
      "inicio.tripulacion.pasaje.cerca.techo",
      "inicio.tripulacion.pasaje.cerca.techoHoy",
      "inicio.tripulacion.pasaje.cerca.visibilidad",
    ]);
    // En el momento: antes de la isla, que se ve después de salir de la nube.
    expect(e.dichos.indexOf("techo")).toBeLessThan(e.dichos.indexOf("isla"));
  });

  it("y sin los números si no son los de hoy, ni la tripulante si ya está sentada", () => {
    const techo = GUION_DEL_PASAJE.find((x) => x.id === "techo")!;
    const vuelo = new VueloMedido();
    const conOtroTecho = { ...vuelo.lectura, tramo: "bajada" as const, altitud: 900, nubes: { base: 1000, techo: 1450 } };
    const escena = new VueloDePasaje(vozQueTarda(() => 1, () => 0).voz, { lado: "izquierda" });
    // Sin la tripulante por el pasillo —no ha empezado el servicio—: lo cuenta Ara, sin números.
    expect(techo.segun!(conOtroTecho, escena).map((l) => l.clave)).toEqual([
      "inicio.ara.pasaje.bajoLasNubes",
      "inicio.ara.pasaje.techo",
    ]);
    // Y con ella, sin el número de hoy si el techo no es el de hoy.
    const conTripulante = m.escena;
    const lineas = techo.segun!({ ...conOtroTecho, faltaParaTocar: 40000 }, conTripulante).map((l) => l.clave);
    expect(lineas).not.toContain("inicio.tripulacion.pasaje.cerca.techoHoy");
  });

  it("el Teide se presenta la primera vez que se nombra: antes de volar más alto que él", () => {
    const presenta = k.indexOf("inicio.mama.pasaje.teide");
    const alto = k.indexOf("inicio.mama.pasaje.altoRapido");
    const senalado = m.dichas.findIndex((d) => d.linea.texto === "Ese es teide.");
    expect(alto).toBeGreaterThan(-1);
    if (senalado > -1 && senalado < alto) expect(presenta).toBe(-1);
    else {
      expect(presenta).toBeGreaterThan(-1);
      expect(presenta).toBeLessThan(alto);
    }
    expect(k.filter((c) => c === "inicio.mama.pasaje.teide").length).toBeLessThanOrEqual(1);
  });

  it("y si el Teide ya se señaló, no se presenta otra vez", () => {
    let t = 0;
    const v = vozQueTarda(loQueDura, () => t);
    const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
    const vuelo = new VueloMedido();
    let dado = false;
    for (; t < 4000 && !escena.estado.terminado; t += DT) {
      v.tic();
      vuelo.paso(DT, escena.paso(DT, vuelo.lectura));
      if (!dado && escena.puedeSenalar) {
        dado = true;
        escena.senalar(sitio("teide", "izquierda"));
      }
      if (escena.estado.puedeSeguir) escena.seguir();
    }
    const claves = v.dichas.map((d) => d.linea.clave);
    expect(claves).toContain("inicio.mama.pasaje.altoRapido");
    expect(claves).not.toContain("inicio.mama.pasaje.teide");
  });

  it("el tren, desde abajo, cuando sale; y el señalero, desde el suelo, hasta parar", () => {
    const ruedas = empieza("inicio.ara.pasaje.ruedas");
    expect(ruedas).toBeTruthy();
    const tren = e.planos.find((p) => p.plano === "fuera-tren");
    expect(tren).toBeTruthy();
    expect(ruedas!.desde - tren!.desde).toBeGreaterThanOrEqual(CORTE_DE_PLANO - 1e-6);
    expect(ruedas!.desde - tren!.desde).toBeLessThan(CORTE_DE_PLANO + 1);
    expect(e.planos.some((p) => p.plano === "fuera-senalero")).toBe(true);
    expect(e.charlas).toContain("senalero");
    // Y la despedida, de vuelta en la ventanilla.
    expect(e.plano).toBe("ventanilla");
  });
});

// ── Lo que se oye cambiar ────────────────────────────────────────────────

/**
 * **El vuelo medido, apuntando cuándo cambia la potencia**: para mirar que lo
 * que se cuenta pasó de verdad, y cerca.
 */
function volarApuntandoLaPotencia(vuelo: VueloMedido = new VueloMedido()): Medido & {
  readonly cambios: { potencia: PotenciaDeLinea; t: number }[];
  readonly altitudA: (t: number) => number;
} {
  let t = 0;
  const v = vozQueTarda(loQueDura, () => t);
  const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
  const tramos: { t: number; tramo: TramoDeLinea }[] = [];
  const cambios: { potencia: PotenciaDeLinea; t: number }[] = [];
  const altitudes: { t: number; altitud: number }[] = [];
  const porVer = [...LO_QUE_SE_VIO];
  for (; t < 4000 && !escena.estado.terminado; t += DT) {
    v.tic();
    if (tramos[tramos.length - 1]?.tramo !== vuelo.tramo) tramos.push({ t, tramo: vuelo.tramo });
    if (cambios[cambios.length - 1]?.potencia !== vuelo.potencia) cambios.push({ potencia: vuelo.potencia, t });
    altitudes.push({ t, altitud: vuelo.altitud });
    vuelo.paso(DT, escena.paso(DT, vuelo.lectura));
    if (porVer[0] && porVer[0].t <= vuelo.desdeQueDespego && escena.puedeSenalar) escena.senalar(porVer.shift()!.s);
    if (escena.estado.puedeSeguir) escena.seguir();
  }
  return {
    escena,
    vuelo,
    dichas: v.dichas,
    tramos,
    cambios,
    altitudA: (x) => altitudes.find((a) => a.t >= x)?.altitud ?? 0,
  };
}

describe("lo que se oye cambiar se cuenta: el gas de los motores y los oídos", () => {
  const m = volarApuntandoLaPotencia();
  const r = m.escena.registro;
  const cuando = (clave: string): number => r.find((d) => d.clave === clave)?.desde ?? NaN;
  const cuantas = (clave: string): number => r.filter((d) => d.clave === clave).length;
  const cambio = (p: PotenciaDeLinea): number => m.cambios.find((c) => c.potencia === p)?.t ?? NaN;
  /** Lo que tarda como mucho en notarse, s. Ver `SE_OYE_EL_CAMBIO`. */
  const A_TIEMPO = 40;

  it("el gas de subida: Ara lo nota en el momento, y lo explica la comandante pasados los diez mil pies", () => {
    const nota = cuando("inicio.ara.pasaje.menosGas");
    expect(nota).toBeGreaterThan(cambio("subida"));
    expect(nota - cambio("subida")).toBeLessThan(A_TIEMPO);
    const explica = cuando("inicio.mama.pasaje.menosGas");
    expect(explica).toBeGreaterThan(nota);
    expect(m.altitudA(explica)).toBeGreaterThanOrEqual(DIEZ_MIL_PIES);
    // Una vez cada cosa, y la explicación por la megafonía, para todo el pasaje.
    expect(cuantas("inicio.ara.pasaje.menosGas")).toBe(1);
    expect(cuantas("inicio.mama.pasaje.menosGas")).toBe(1);
    expect(LINEAS_DEL_PASAJE.find((l) => l.clave === "inicio.mama.pasaje.menosGas")?.megafonia).toBe(true);
  });

  it("el ralentí al empezar a bajar: Ara lo nota, la comandante dice que se baja, y después por qué", () => {
    const nota = cuando("inicio.ara.pasaje.ralenti");
    expect(nota).toBeGreaterThan(cambio("ralenti"));
    expect(nota - cambio("ralenti")).toBeLessThan(A_TIEMPO);
    expect(nota).toBeLessThan(cuando("comandante.descenso"));
    // Y el porqué del ralentí —para bajar no se apagan los motores—, por encima de los diez mil pies.
    const porque = cuando("inicio.mama.pasaje.bajando");
    expect(porque).toBeGreaterThan(nota);
    expect(m.altitudA(porque)).toBeGreaterThanOrEqual(DIEZ_MIL_PIES);
    // En el primer rato tranquilo: lo primero que se cuenta después de los oídos, salvo lo señalado por la ventanilla.
    const entreMedias = r.filter((d) => d.desde > cuando("inicio.ara.pasaje.bostezo") && d.desde < cuando("inicio.ara.pasaje.preguntaBajar"));
    expect(entreMedias.map((d) => d.clave).filter((c) => !/^(ventanilla|inicio\.ara\.pasaje\.(teide|garajonay|orotava|loVeo)$)/.test(c))).toEqual([]);
  });

  it("y los motores que suben con el tren: Ara lo nota después del tren, y lo explica la comandante al llegar, con la reversa", () => {
    const nota = cuando("inicio.ara.pasaje.masGas");
    expect(nota).toBeGreaterThan(cambio("aproximacion"));
    expect(nota - cambio("aproximacion")).toBeLessThan(A_TIEMPO);
    // Sin pisar al tren: después de «¡otro ruido abajo!» y de su plano.
    expect(nota).toBeGreaterThan(cuando("inicio.ara.pasaje.ruedas"));
    const tren = m.escena.estado.planos.find((p) => p.plano === "fuera-tren")!;
    expect(nota - tren.desde).toBeGreaterThanOrEqual(DURA_EL_PLANO["fuera-tren"]);
    // Y la explicación, en tierra, detrás de la de la reversa y antes de la despedida.
    const explica = cuando("inicio.mama.pasaje.masGas");
    expect(explica).toBeGreaterThan(cuando("inicio.mama.pasaje.reversa"));
    expect(explica).toBeLessThan(cuando("tripulacion.llegada"));
    expect(cuantas("inicio.mama.pasaje.masGas")).toBe(1);
  });

  it("el plop de los oídos: lo explica una vez la tripulante en persona, al llegar con el servicio", () => {
    const plop = cuando("inicio.ara.pasaje.plop");
    expect(plop).toBeGreaterThan(0);
    for (const c of ["inicio.tripulacion.pasaje.cerca.plop1", "inicio.tripulacion.pasaje.cerca.plop2"]) {
      expect(cuantas(c), c).toBe(1);
      expect(cuando(c), c).toBeGreaterThan(cuando("tripulacion.servicio"));
      expect(esDeCerca(LINEAS_DEL_PASAJE.find((l) => l.clave === c)!), c).toBe(true);
    }
    expect(cuando("inicio.tripulacion.pasaje.cerca.plop1")).toBeGreaterThan(cuando("inicio.ara.pasaje.nubesSostiene"));
    expect(m.escena.plopExplicado).toBe(true);
  });

  it("y al bajar, Ara ya sabe que es al revés: no pregunta lo que le explicaron, y el anuncio sigue para todos", () => {
    expect(cuantas("inicio.ara.pasaje.oidos")).toBe(0);
    expect(cuantas("inicio.ara.pasaje.oidosAlReves")).toBe(1);
    expect(cuando("inicio.ara.pasaje.oidosAlReves")).toBeGreaterThan(cuando("inicio.tripulacion.pasaje.cerca.plop2"));
    expect(cuantas("inicio.tripulacion.pasaje.oidos")).toBe(1);
  });

  it("sin saber qué suena, no se cuenta ningún cambio; y lo que se notó tarde, tampoco", () => {
    const sinPotencia = volarElMedido(
      new (class extends VueloMedido {
        override get lectura(): LecturaDelPasaje {
          const { potencia: _p, conEstaPotencia: _c, ...resto } = super.lectura;
          return resto;
        }
      })(),
    );
    const tarde = volarElMedido(
      new (class extends VueloMedido {
        override get lectura(): LecturaDelPasaje {
          return { ...super.lectura, conEstaPotencia: this.conEstaPotencia + A_TIEMPO };
        }
      })(),
    );
    const DEL_GAS = [
      "inicio.ara.pasaje.menosGas",
      "inicio.mama.pasaje.menosGas",
      "inicio.ara.pasaje.ralenti",
      "inicio.ara.pasaje.masGas",
      "inicio.mama.pasaje.masGas",
    ];
    for (const vuelo of [sinPotencia, tarde]) {
      const claves = vuelo.dichas.map((d) => d.linea.clave);
      for (const c of DEL_GAS) expect(claves, c).not.toContain(c);
      // Y la escena acaba igual, sin saltarse nada.
      expect(vuelo.escena.estado.terminado).toBe(true);
      expect(vuelo.escena.estado.saltados).toEqual([]);
    }
  });
});

/**
 * **El vuelo medido, apuntando la llegada**: en cada paso, el tramo, dónde va
 * respecto a la pista, el plano, la gente de la cabina y la luz del cinturón.
 */
function volarApuntandoLaLlegada(vuelo: VueloMedido = new VueloMedido()): Medido & {
  pasos: {
    t: number;
    tramo: TramoDeLinea;
    enTramo: number;
    pista: LecturaDelPasaje["enLaPista"];
    plano: Plano;
    gente: VueloDePasaje["gente"];
    luz: boolean;
  }[];
} {
  let t = 0;
  const v = vozQueTarda(loQueDura, () => t);
  const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
  const porVer = [...LO_QUE_SE_VIO];
  const tramos: { t: number; tramo: TramoDeLinea }[] = [];
  const pasos: ReturnType<typeof volarApuntandoLaLlegada>["pasos"] = [];
  for (; t < 4000; t += DT) {
    v.tic();
    if (tramos[tramos.length - 1]?.tramo !== vuelo.tramo) tramos.push({ t, tramo: vuelo.tramo });
    const l = vuelo.lectura;
    vuelo.paso(DT, escena.paso(DT, l));
    const e = escena.estado;
    if (["frenando", "al-puesto", "aparcado", "apagado"].includes(vuelo.tramo))
      pasos.push({ t, tramo: vuelo.tramo, enTramo: vuelo.enTramo, pista: l.enLaPista, plano: e.plano, gente: e.gente, luz: e.luzApagada });
    if (porVer[0] && porVer[0].t <= vuelo.desdeQueDespego && escena.puedeSenalar) escena.senalar(porVer.shift()!.s);
    if (e.puedeSeguir) escena.seguir();
    if (e.terminado) break;
  }
  return { escena, vuelo, dichas: v.dichas, tramos, pasos };
}

describe("la llegada a La Palma: la vuelta en la pista (punto 300)", () => {
  const m = volarApuntandoLaLlegada();
  const cuando = (clave: string): number => m.dichas.find((d) => d.linea.clave === clave)?.desde ?? NaN;
  const al = (cond: (p: (typeof m.pasos)[number]) => boolean): number => m.pasos.find(cond)?.t ?? NaN;
  const empiezaAGirar = al((p) => p.tramo === "al-puesto" && (p.pista?.vuelta ?? 0) > 0.1);
  const dejaLaPista = al((p) => p.tramo === "al-puesto" && (p.pista?.alEje ?? 0) > 75);

  it("Ara lo nota cuando el avión de verdad gira en la punta, no antes, y se ve por fuera", () => {
    const dicho = cuando("inicio.ara.pasaje.vueltaEnPista");
    expect(dicho).toBeGreaterThanOrEqual(empiezaAGirar);
    // Mientras gira o vuelve por la pista: antes de dejarla.
    expect(dicho).toBeLessThan(dejaLaPista);
    const plano = m.escena.estado.planos.find((p) => p.plano === "fuera-raqueta");
    expect(plano).toBeTruthy();
    expect(plano!.desde).toBeGreaterThanOrEqual(empiezaAGirar);
    expect(plano!.desde).toBeLessThanOrEqual(dicho);
  });

  it("y lo explica la comandante en cuanto deja la pista libre, para todos: el ensanche y el permiso de la torre", () => {
    const explica = cuando("inicio.mama.pasaje.vueltaEnPista");
    const permiso = cuando("inicio.mama.pasaje.permisoDeVuelta");
    expect(explica).toBeGreaterThan(dejaLaPista);
    expect(explica).toBeGreaterThan(cuando("inicio.ara.pasaje.vueltaEnPista"));
    expect(permiso).toBeGreaterThan(explica);
    // Por la megafonía, y antes de pararse en el puesto: ahí empieza lo de los cinturones.
    for (const c of ["inicio.mama.pasaje.vueltaEnPista", "inicio.mama.pasaje.permisoDeVuelta"])
      expect(m.dichas.find((d) => d.linea.clave === c)!.linea.megafonia, c).toBe(true);
    expect(permiso).toBeLessThan(cuando("inicio.ara.pasaje.seLevantan"));
    // Y una vez cada cosa.
    for (const c of ["inicio.ara.pasaje.vueltaEnPista", "inicio.mama.pasaje.vueltaEnPista", "inicio.mama.pasaje.permisoDeVuelta"])
      expect(m.dichas.filter((d) => d.linea.clave === c).length, c).toBe(1);
  });

  it("y si frena a tiempo para la calle y no da la vuelta, no se cuenta ninguna vuelta", () => {
    const sin = new VueloMedido();
    sin.sinVuelta = true;
    const r = volarApuntandoLaLlegada(sin);
    const claves = r.dichas.map((d) => d.linea.clave);
    for (const c of ["inicio.ara.pasaje.vueltaEnPista", "inicio.mama.pasaje.vueltaEnPista", "inicio.mama.pasaje.permisoDeVuelta"])
      expect(claves, c).not.toContain(c);
    expect(r.escena.estado.terminado).toBe(true);
    expect(r.escena.estado.saltados).toEqual([]);
  });
});

describe("la llegada al puesto: los que se levantan antes de tiempo, y lo que es la tripulación (punto 303)", () => {
  const m = volarApuntandoLaLlegada();
  const cuando = (clave: string): number => m.dichas.find((d) => d.linea.clave === clave)?.desde ?? NaN;
  const al = (cond: (p: (typeof m.pasos)[number]) => boolean): number => m.pasos.find(cond)?.t ?? NaN;
  const parado = al((p) => p.tramo === "aparcado");
  const motoresFuera = al((p) => p.tramo === "apagado");
  const seApagaLaLuz = al((p) => p.luz);
  const impacientes = al((p) => p.gente === "impacientes");

  it("parados en el puesto, con la luz encendida, se levantan los impacientes; Ara lo oye y sigue en su asiento", () => {
    expect(impacientes).toBeGreaterThanOrEqual(parado);
    expect(impacientes).toBeLessThan(seApagaLaLuz);
    // Primero se oye, y después lo dice.
    expect(cuando("inicio.ara.pasaje.seLevantan")).toBeGreaterThan(impacientes + 1);
    expect(cuando("inicio.ara.pasaje.cinturonQuieto")).toBeGreaterThan(cuando("inicio.ara.pasaje.seLevantan"));
    expect(cuando("inicio.ara.pasaje.cinturonQuieto")).toBeLessThan(seApagaLaLuz);
    // Y «todavía no» se dice una vez: ya no rodando, que es aquí donde viene a cuento.
    expect(m.dichas.filter((d) => d.linea.clave === "inicio.ara.pasaje.cinturonQuieto").length).toBe(1);
    // Y lo de fuera se deja para volver a la cabina, que es donde pasa.
    const enLaCabina = m.pasos.filter((p) => p.gente === "impacientes").every((p) => !esDeFuera(p.plano));
    expect(enLaCabina).toBe(true);
  });

  it("la luz se apaga con los motores ya parados, y Ara se suelta después del ding, no antes", () => {
    expect(seApagaLaLuz).toBeGreaterThan(motoresFuera);
    expect(cuando("inicio.ara.pasaje.luzApagada")).toBeGreaterThan(seApagaLaLuz + 1);
    expect(m.pasos.filter((p) => p.t >= seApagaLaLuz).every((p) => p.gente === "de-pie")).toBe(true);
  });

  it("la tripulante, ya de pie, se lo agradece, cuenta por qué y su cara seria; y después, la despedida", () => {
    const k = m.dichas.map((d) => d.linea.clave);
    const orden = [
      "inicio.ara.pasaje.luzApagada",
      "inicio.tripulacion.pasaje.cerca.gracias",
      "inicio.tripulacion.pasaje.cerca.maleteros",
      "inicio.tripulacion.pasaje.cerca.seria",
      "inicio.tripulacion.pasaje.cerca.adios",
      "inicio.ara.pasaje.fin",
    ].map((c) => k.indexOf(c));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
    for (const c of ["gracias", "maleteros", "seria"])
      expect(m.dichas.find((d) => d.linea.clave === `inicio.tripulacion.pasaje.cerca.${c}`)!.linea.megafonia, c).toBeFalsy();
  });

  it("lo que sabe hacer la tripulante, una vez, por el pasillo en el rato tranquilo de la bajada", () => {
    const oficio = m.dichas.filter((d) => d.linea.clave === "inicio.tripulacion.pasaje.cerca.oficio1");
    expect(oficio.length).toBe(1);
    expect(m.dichas.filter((d) => d.linea.clave === "inicio.tripulacion.pasaje.cerca.oficio2").length).toBe(1);
    const t = oficio[0]!.desde;
    const tramo = [...m.tramos].reverse().find((x) => x.t <= t)?.tramo;
    expect(tramo).toBe("bajada");
    expect(t).toBeGreaterThan(cuando("inicio.tripulacion.pasaje.cerca.estrellas"));
    expect(t).toBeLessThan(cuando("comandante.aproximacion"));
    expect(cuando("inicio.ara.pasaje.uniforme")).toBeGreaterThan(cuando("inicio.tripulacion.pasaje.cerca.oficio2"));
    expect(m.escena.estado.charlas).toContain("tcpOficio");
  });

  it("y si bajando no hubo hueco, lo cuenta en el puesto, detrás de su cara seria: una vez igual", () => {
    // Una bajada sin tramo tranquilo: de lejos a la cabina preparada de golpe.
    const sinHueco = volarApuntandoLaLlegada(
      new (class extends VueloMedido {
        override get lectura(): LecturaDelPasaje {
          const l = super.lectura;
          return l.faltaParaTocar < 56000 && l.faltaParaTocar > 28000 ? { ...l, faltaParaTocar: 27500 } : l;
        }
      })(),
    );
    const k = sinHueco.dichas.map((d) => d.linea.clave);
    expect(k.filter((c) => c === "inicio.tripulacion.pasaje.cerca.oficio1").length).toBe(1);
    expect(k.indexOf("inicio.tripulacion.pasaje.cerca.oficio1")).toBeGreaterThan(k.indexOf("inicio.tripulacion.pasaje.cerca.seria"));
    expect(k.indexOf("inicio.ara.pasaje.uniforme")).toBeLessThan(k.indexOf("inicio.tripulacion.pasaje.cerca.adios"));
    expect(sinHueco.escena.estado.terminado).toBe(true);
  });
});

/*
 * **El baño de Ara** (punto 293). Enrique, en broma: «pobre Ara, pregunta por
 * el baño y la azafata lo deja en su sitio». Lo que se enseña es la regla de
 * verdad: la luz manda, y cuando se apaga, se puede. No que en un avión no se
 * va al baño.
 */
describe("el baño de Ara: la luz manda, y cuando se apaga, se puede", () => {
  const m = volarElMedido();
  const r = m.escena.registro;
  const cuando = (clave: string): number => r.find((d) => d.clave === clave)?.desde ?? NaN;
  const acaba = (clave: string): number => r.find((d) => d.clave === clave)?.hasta ?? NaN;
  const empiezaA = (tramo: TramoDeLinea): number => m.tramos.find((x) => x.tramo === tramo)?.t ?? NaN;

  it("antes de subir: en el embarque, Ara cuenta que ya fue, antes de la bienvenida", () => {
    expect(cuando("inicio.ara.pasaje.banoAntes")).toBeLessThan(cuando("inicio.tripulacion.pasaje.cinturon"));
    expect(cuando("inicio.ara.pasaje.banoAntes")).toBeLessThan(empiezaA("arrancando"));
  });

  it("rodando, con la luz encendida, lo pregunta; y la tripulante, a su lado: cuando se apague, le acompaña", () => {
    const pregunta = cuando("inicio.ara.pasaje.bano");
    const respuesta = cuando("inicio.tripulacion.pasaje.cerca.banoLuz");
    expect(pregunta).toBeGreaterThan(cuando("inicio.tripulacion.pasaje.cerca.revision"));
    expect(respuesta).toBeGreaterThan(pregunta);
    expect(respuesta).toBeLessThan(empiezaA("carrera"));
  });

  it("arriba, con la luz apagada, va de verdad: tras el «pueden soltarse», en crucero, y vuelve antes de que se encienda", () => {
    expect(m.escena.estado.fueAlBano).toBe(true);
    const seVa = acaba("inicio.tripulacion.pasaje.cerca.banoAhora");
    const vuelve = cuando("inicio.ara.pasaje.banoVuelta");
    expect(cuando("inicio.tripulacion.pasaje.cerca.banoAhora")).toBeGreaterThan(acaba("comandante.crucero"));
    expect(seVa).toBeGreaterThan(empiezaA("crucero"));
    expect(seVa).toBeLessThan(empiezaA("bajada"));
    // Mientras Ara está dentro suena el anuncio del servicio, que da ella desde la cocina de atrás.
    expect(cuando("tripulacion.servicio")).toBeGreaterThan(seVa);
    expect(vuelve).toBeGreaterThan(acaba("tripulacion.servicio"));
    // Y vuelve a su asiento antes de que la bajada encienda la luz.
    expect(acaba("inicio.ara.pasaje.banoVuelta")).toBeLessThan(cuando("comandante.descenso"));
    expect(r.filter((d) => d.clave === "inicio.tripulacion.pasaje.cerca.banoAhora")).toHaveLength(1);
    expect(r.some((d) => d.clave === "inicio.ara.pasaje.servicio")).toBe(false);
  });

  it("y bajando, con la luz otra vez encendida, la tripulante lo recuerda: fue justo a tiempo", () => {
    const recuerda = cuando("inicio.tripulacion.pasaje.cerca.banoATiempo");
    expect(recuerda).toBeGreaterThan(cuando("comandante.descenso"));
    expect(recuerda).toBeLessThan(cuando("comandante.aproximacion"));
    expect(r.some((d) => d.clave === "inicio.ara.pasaje.banoEspero")).toBe(false);
  });

  /** Lo que se dijo en un vuelo, y cómo acabó la escena. */
  const delBano = (vuelo: VueloMedido) => {
    const v = volarElMedido(vuelo);
    return { claves: v.escena.registro.map((d) => d.clave), estado: v.escena.estado };
  };
  const SE_LEVANTA = [
    "inicio.tripulacion.pasaje.cerca.banoAhora",
    "inicio.ara.pasaje.banoVuelta",
    "inicio.tripulacion.pasaje.cerca.banoATiempo",
  ];

  it("con la luz encendida no se levanta nadie: si el aire no la deja apagar, Ara espera a aterrizar, sin drama", () => {
    const { claves, estado } = delBano(
      new (class extends VueloMedido {
        override get lectura(): LecturaDelPasaje {
          return { ...super.lectura, cinturon: true };
        }
      })(),
    );
    expect(estado.fueAlBano).toBe(false);
    for (const c of SE_LEVANTA) expect(claves, c).not.toContain(c);
    expect(claves).toContain("inicio.ara.pasaje.servicio");
    expect(claves).toContain("inicio.ara.pasaje.banoEspero");
    // Y el resto del vuelo, igual: nada se salta.
    expect(estado.saltados).toEqual([]);
    expect(estado.terminado).toBe(true);
  });

  it("y con la luz apagada pero sin crucero para ir y volver, tampoco: la bajada la va a encender", () => {
    const { claves, estado } = delBano(
      new (class extends VueloMedido {
        override get lectura(): LecturaDelPasaje {
          const l = super.lectura;
          return l.tramo === "crucero" ? { ...l, hastaLaBajada: 10 } : l;
        }
      })(),
    );
    expect(estado.fueAlBano).toBe(false);
    for (const c of SE_LEVANTA) expect(claves, c).not.toContain(c);
    expect(claves).toContain("inicio.ara.pasaje.banoEspero");
    expect(estado.saltados).toEqual([]);
  });
});

/*
 * **Lo que se reconoce al llegar** (punto 314): la ladera de Villa de Mazo,
 * a la izquierda en la final de la 36, contada por Ara cuando se ve por su
 * cristal, y su nombre dicho por la comandante ya en tierra. Con el mundo de
 * mentira del mar de nubes, que la deja ver desde unos tres kilómetros del
 * umbral: ver `loQueSeVeEnElMedido`.
 */
describe("lo que se reconoce al llegar: la ladera de Mazo, y su nombre en tierra", () => {
  const m = volarConElPaisaje();
  const e = m.escena.estado;
  const r = m.escena.registro;
  const de = (clave: string) => r.filter((d) => d.clave === clave);
  const empiezaA = (tramo: TramoDeLinea): number => m.tramos.find((x) => x.tramo === tramo)?.t ?? NaN;

  it("Ara la cuenta en la final, con la cara contra el cristal mirando hacia ella, y solo viéndose", () => {
    const n = e.nombrados.find((x) => x.clave === "inicio.ara.pasaje.mazo");
    expect(n, "Mazo").toBeTruthy();
    expect(n!.sitio).toBe("ladera-de-mazo");
    expect(n!.como).toBe("asomado");
    const plano = e.planos.filter((p) => p.desde <= n!.desde + 1e-6).pop();
    expect(plano).toEqual({ plano: "asomado-paisaje", desde: expect.any(Number), sitio: "ladera-de-mazo" });
    // Las tres frases, una vez y en su orden, en la final y con el avión todavía en el aire.
    expect(de("inicio.ara.pasaje.mazo")).toHaveLength(1);
    expect(de("inicio.ara.pasaje.mazoCaminos")).toHaveLength(1);
    expect(de("inicio.ara.pasaje.mazoBici")).toHaveLength(1);
    expect(de("inicio.ara.pasaje.mazoCaminos")[0]!.desde).toBeGreaterThanOrEqual(de("inicio.ara.pasaje.mazo")[0]!.hasta!);
    expect(de("inicio.ara.pasaje.mazoBici")[0]!.desde).toBeGreaterThanOrEqual(de("inicio.ara.pasaje.mazoCaminos")[0]!.hasta!);
    expect(n!.desde).toBeGreaterThan(empiezaA("final"));
    expect(de("inicio.ara.pasaje.mazoBici")[0]!.hasta!).toBeLessThan(empiezaA("frenando"));
    // Y lo nombrado se veía en el mundo al empezar a decirlo: ver la prueba de arriba.
    expect(m.nombrado.find((x) => x.clave === "inicio.ara.pasaje.mazo")?.seVeia).toBe(true);
  });

  it("y no se come la toma: «ya casi» sale después, con el plano desde la pista", () => {
    const bici = de("inicio.ara.pasaje.mazoBici")[0]!;
    const yaCasi = de("inicio.ara.pasaje.yaCasi")[0];
    expect(yaCasi, "ya casi").toBeTruthy();
    expect(yaCasi!.desde).toBeGreaterThanOrEqual(bici.hasta!);
    expect(yaCasi!.desde).toBeLessThan(empiezaA("frenando"));
    expect(e.planos.some((p) => p.plano === "fuera-pista" && p.desde >= bici.hasta! - 1e-6)).toBe(true);
    expect(e.saltados).toEqual([]);
  });

  it("el nombre lo dice la comandante en tierra, con la pista libre y detrás de la vuelta, una vez", () => {
    const nombre = de("inicio.mama.pasaje.mazo");
    expect(nombre).toHaveLength(1);
    expect(nombre[0]!.desde).toBeGreaterThan(empiezaA("al-puesto"));
    expect(nombre[0]!.desde).toBeGreaterThan(de("inicio.mama.pasaje.permisoDeVuelta")[0]!.hasta!);
    // Y no en la final: ahí no habla nadie de lo que no es volar.
    expect(nombre[0]!.desde).toBeGreaterThan(de("inicio.ara.pasaje.toma")[0]!.desde);
  });

  it("si la ladera no se ve, Ara no la cuenta y la comandante no la nombra", () => {
    class SinMazo extends VueloMedido {
      override get lectura(): LecturaDelPasaje {
        const l = super.lectura;
        const ver = l.ver;
        return ver ? { ...l, ver: (s, p) => (s === "ladera-de-mazo" ? NADA : ver(s, p)) } : l;
      }
    }
    const sin = volarConElPaisaje(new SinMazo());
    const claves = sin.escena.registro.map((d) => d.clave);
    expect(claves).not.toContain("inicio.ara.pasaje.mazo");
    expect(claves).not.toContain("inicio.mama.pasaje.mazo");
    expect(claves).toContain("inicio.ara.pasaje.yaCasi");
    expect(sin.escena.estado.terminado).toBe(true);
  });
});

/*
 * **Por qué ponen música al bajar**: Ara pregunta poco después de que suene
 * la música de llegada, y contesta la tripulante en persona, que anda por los
 * asientos preparando la cabina. Con la música donde la pone el juego: desde
 * los diez mil pies bajando hasta el puesto. Ver `audio/hilo-musical.ts`.
 */
describe("por qué ponen música al bajar", () => {
  class ConMusica extends VueloMedido {
    override get lectura(): LecturaDelPasaje {
      const l = super.lectura;
      const suena = (l.tramo === "bajada" && l.altitud < BAJANDO_A_LA_PISTA) || ["final", "frenando", "al-puesto"].includes(l.tramo);
      return { ...l, musica: suena };
    }
  }
  let empieza: number | null = null;
  const m = volarElMedido(new ConMusica(), (_e, t, l) => {
    if (l.musica && empieza === null) empieza = t;
  });
  const r = m.escena.registro;

  it("Ara pregunta una vez, con la música ya sonando, y la tripulante contesta en persona", () => {
    const pregunta = r.filter((d) => d.clave === "inicio.ara.pasaje.musica");
    expect(pregunta).toHaveLength(1);
    expect(empieza).not.toBeNull();
    expect(pregunta[0]!.desde).toBeGreaterThanOrEqual(empieza! + 3);
    const i = r.indexOf(pregunta[0]!);
    expect(r[i + 1]?.clave).toBe("inicio.tripulacion.pasaje.cerca.musica");
    // Poco después: antes de preparar la cabina, que es cuando la tripulante se sienta.
    const aproximacion = r.find((d) => d.clave === "comandante.aproximacion");
    expect(pregunta[0]!.desde).toBeLessThan(aproximacion!.desde);
    expect(m.escena.estado.saltados).toEqual([]);
  });

  it("sin música no hay pregunta", () => {
    const sin = volarElMedido();
    expect(sin.escena.registro.map((d) => d.clave)).not.toContain("inicio.ara.pasaje.musica");
  });
});

/*
 * **La ventanilla viva** (19-10-2026): se toca lo que se ve por la ventanilla
 * y te lo cuentan. Que el juego no llame a la escena con lo que no se ve lo
 * mira el banco, con la imagen; aquí, lo que hace la escena con un toque:
 * quién contesta, cuándo, sin pisar a nadie, sin repetir y sin cortar la
 * llegada. Ver `flight/lo-que-se-toca.ts`.
 */
describe("la ventanilla viva: tocar lo que se ve y que te lo cuenten", () => {
  /** Vuela el vuelo medido tocando lo que diga cada toque cuando se cumple su condición. */
  function volarTocando(
    toques: { readonly que: Tocable; readonly cuando: (l: LecturaDelPasaje, e: VueloDePasaje) => boolean; readonly veces?: number }[],
    vuelo: VueloMedido = new VueloMedido(),
  ): Medido {
    const pendientes = toques.map((x) => ({ ...x, quedan: x.veces ?? 1, ultimo: -Infinity }));
    return volarElMedido(vuelo, (escena, t, l) => {
      // Uno por paso como mucho, y cada uno a su ritmo: lo que ya no viene a cuento no frena a los demás.
      const sig = pendientes.find((x) => x.quedan > 0 && t - x.ultimo >= 2 && x.cuando(l, escena));
      if (!sig) return;
      sig.ultimo = t;
      sig.quedan--;
      escena.tocar(sig.que);
    });
  }
  const arriba = (l: LecturaDelPasaje): boolean => !l.enTierra && l.altitud > DIEZ_MIL_PIES && l.tramo === "subida";
  const contado = (e: VueloDePasaje, que: Tocable): boolean => e.estado.toques.some((t) => t.que === que && t.dijo.length > 0);

  const m = volarTocando([
    // El Teide, en un silencio, hasta que se cuente.
    { que: "hito:teide", cuando: (l, e) => arriba(l) && !e.estado.hablando && !contado(e, "hito:teide"), veces: 8 },
    // El motor, hasta que se cuente, y otra vez: la segunda, ya contado.
    { que: "motor", cuando: (l, e) => !l.enTierra && !e.estado.hablando && !e.estado.durmiendo && !contado(e, "motor"), veces: 8 },
    { que: "motor", cuando: (l, e) => !l.enTierra && !e.estado.hablando },
  ]);
  const toques = m.escena.estado.toques;
  const r = m.escena.registro;

  it("un toque sobre lo que se ve lo cuenta Ara, con su lámina, y da su sello del cuaderno de viaje", () => {
    const teide = toques.find((t) => t.que === "hito:teide" && t.dijo.length);
    expect(teide, JSON.stringify(toques)).toBeTruthy();
    expect(teide!.dijo[0]).toBe("inicio.ara.pasaje.teide");
    const dicha = m.dichas.find((d) => d.linea.clave === "inicio.ara.pasaje.teide" && d.desde >= teide!.desde);
    expect(dicha?.linea.dibujo).toBe("islas");
    expect(m.escena.estado.vistos).toContain("teide");
  });

  it("la comandante no contesta nunca un toque: Ara, y la tripulante si está a mano", () => {
    expect(toques.some((t) => t.dijo.length)).toBe(true);
    for (const t of toques)
      for (const k of t.dijo) {
        expect(k, k).not.toMatch(/^inicio\.mama\.|^ventanilla|^comandante\./);
        expect(k, k).toMatch(/^inicio\.(ara|tripulacion)\.pasaje\./);
        if (k.startsWith("inicio.tripulacion.")) expect(k).toMatch(/\.cerca\./);
      }
  });

  it("no pisa a nadie: lo de un toque empieza cuando se calla quien hablaba", () => {
    for (let i = 1; i < r.length; i++) expect(r[i]!.desde, r[i]!.clave).toBeGreaterThanOrEqual(r[i - 1]!.hasta ?? Infinity);
    for (const t of toques.filter((x) => x.dijo.length)) {
      const primera = r.find((d) => d.clave === t.dijo[0] && d.desde >= t.desde - 1e-6);
      expect(primera, t.que).toBeTruthy();
      const antes = r.filter((d) => d.desde < primera!.desde).at(-1);
      if (antes) expect(primera!.desde).toBeGreaterThanOrEqual(antes.hasta ?? Infinity);
    }
  });

  it("y no se repite: lo ya contado, tocado otra vez, enseña su lámina sin voz", () => {
    const motores = toques.filter((t) => t.que === "motor");
    expect(motores.length, JSON.stringify(motores)).toBeGreaterThanOrEqual(2);
    expect(motores.some((t) => t.dijo.length > 0)).toBe(true);
    expect(motores.at(-1)!.calla).toBe("contado");
    expect(motores.at(-1)!.dijo).toEqual([]);
    // Ninguna frase de Ara suena dos veces en el vuelo por un toque.
    const deAra = toques.flatMap((t) => t.dijo).filter((k) => k.startsWith("inicio.ara."));
    expect(new Set(deAra).size).toBe(deAra.length);
    // Y lo de la tripulante que ya se contó al tocar no se cuenta otra vez en la bajada.
    for (const k of ["inicio.tripulacion.pasaje.cerca.motor1", "inicio.tripulacion.pasaje.cerca.islas1"])
      expect(r.filter((d) => d.clave === k).length, k).toBeLessThanOrEqual(1);
    expect(m.escena.estado.saltados).toEqual([]);
  });

  it("la invitación a tocar, una vez y con algo que tocar a la vista; sin nada, no", () => {
    class ConAlgoQueTocar extends VueloMedido {
      override get lectura(): LecturaDelPasaje {
        return { ...super.lectura, tocable: true };
      }
    }
    const con = volarElMedido(new ConAlgoQueTocar());
    expect(con.escena.registro.filter((d) => d.clave === "inicio.ara.pasaje.toque.invita")).toHaveLength(1);
    expect(con.escena.estado.invitado).toBe(true);
    expect(con.escena.estado.saltados).toEqual([]);
    expect(m.escena.registro.map((d) => d.clave)).not.toContain("inicio.ara.pasaje.toque.invita");
  });

  it("y no corta la llegada: Mazo tocado en la final se cuenta una vez, y su nombre llega en tierra", () => {
    const enLaFinal = volarTocando([
      { que: "ladera-de-mazo", cuando: (l, e) => (l.tramo === "final" || l.tramo === "recogida") && l.altura > 150 && !e.estado.hablando },
    ]);
    const claves = enLaFinal.escena.registro.map((d) => d.clave);
    expect(claves.filter((k) => k === "inicio.ara.pasaje.mazo")).toHaveLength(1);
    expect(claves).toContain("inicio.mama.pasaje.mazo");
    expect(enLaFinal.escena.estado.saltados).toEqual([]);
    expect(enLaFinal.escena.estado.vistos).toContain("mazo");
  });

  it("con Ara durmiendo, un toque no dice nada: tiene los ojos cerrados", () => {
    const dormida = volarTocando([{ que: "hito:teide", cuando: (_l, e) => e.estado.durmiendo }], new VueloMedidoConRatos());
    const t = dormida.escena.estado.toques[0];
    expect(dormida.escena.estado.siestas.length).toBeGreaterThan(0);
    expect(t?.calla).toBe("dormida");
    expect(t?.dijo).toEqual([]);
  });

  it("los sellos de un vuelo sin tocar nada: lo que la escena nombra cuando se ve", () => {
    const solo = volarElMedido();
    const vistos = solo.escena.estado.vistos;
    // El ala y el motor, lo primero; la isla de llegada y Mazo, y lo señalado por la ventanilla.
    for (const s of ["motor", "ala", "palma", "mazo", "teide", "gomera"] as const) expect(vistos, s).toContain(s);
    expect(new Set(vistos).size).toBe(vistos.length);
  });
});

/*
 * **La demostración con gracia, de vez en cuando** (punto 294): «sin pasarse:
 * aunque pueda ser divertido, no le quiero quitar la seriedad o importancia
 * que tiene todo lo que se dice y se hace» (Enrique). La gracia va en el
 * adorno —la entrada y la despedida— y las instrucciones son las mismas
 * frases grabadas en todas las formas. Ver `demostracion-con-gracia.ts`.
 */
describe("la demostración con gracia: un toque en la entrada y en la despedida, y las instrucciones iguales", () => {
  const INSTRUCCION = /^inicio\.(tripulacion\.pasaje\.demo\.(intro|cinturon|salidas|mascaras|chaleco|tarjeta|aparatos)|ara\.pasaje\.demo\w+)$/;
  /** Lo que suena de la demostración, de la intro a la revisión. */
  function laDemostracionCon(forma: FormaDeLaDemostracion): { r: Corrido; tramo: Linea[]; claves: string[] } {
    const r = correr(() => 4, { demostracion: forma });
    const desde = indice(r, "inicio.tripulacion.pasaje.demo.intro");
    const hasta = indice(r, "inicio.tripulacion.pasaje.cerca.revision");
    const tramo = r.dichas.slice(desde, hasta).map((d) => d.linea);
    return { r, tramo, claves: tramo.map((l) => l.clave) };
  }
  const sobria = laDemostracionCon("sobria");

  it("la de siempre, sin adorno", () => {
    expect(sobria.claves.some((c) => c.includes(".gracia."))).toBe(false);
    expect(sobria.r.escena.formaDeLaDemostracion).toBe("sobria");
  });

  for (const forma of FORMAS_CON_GRACIA) {
    it(`${forma}: la entrada detrás de «un momento de atención», la despedida detrás de «gracias por su atención», y nada más`, () => {
      const d = laDemostracionCon(forma);
      const g = GRACIA[forma];
      expect(d.claves.filter((c) => c.includes(".gracia."))).toEqual([g.entrada, g.despedida]);
      expect(d.claves.indexOf(g.entrada)).toBe(d.claves.indexOf("inicio.tripulacion.pasaje.demo.intro") + 1);
      expect(d.claves.indexOf(g.despedida)).toBe(d.claves.indexOf("inicio.tripulacion.pasaje.demo.aparatos") + 1);
      // Por la megafonía, como el resto de la demostración, y sin dibujo: no enseña nada que mirar.
      for (const l of d.tramo.filter((x) => x.clave.includes(".gracia."))) {
        expect(l.quien).toBe("tripulacion");
        expect(l.megafonia).toBe(true);
        expect(l.dibujo).toBeUndefined();
      }
      // Y la demostración entera antes de entrar en pista: nada saltado, y la revisión detrás.
      expect(d.r.escena.estado.saltados).toEqual([]);
      expect(indice(d.r, "inicio.tripulacion.pasaje.cerca.revision")).toBeGreaterThan(indice(d.r, g.despedida));
    });

    it(`${forma}: las instrucciones de seguridad suenan igual que en la de siempre, con las mismas frases y su dibujo`, () => {
      const d = laDemostracionCon(forma);
      const lasDe = (t: readonly Linea[]): string[] =>
        t.filter((l) => INSTRUCCION.test(l.clave)).map((l) => `${l.clave}·${l.dibujo ?? ""}`);
      expect(lasDe(d.tramo)).toEqual(lasDe(sobria.tramo));
      expect(lasDe(d.tramo).length).toBeGreaterThanOrEqual(10);
    });
  }

  it("la gracia no toca lo que se enseña: ni el cinturón, ni las salidas, ni las mascarillas, ni el chaleco", () => {
    for (const f of FORMAS_CON_GRACIA)
      for (const clave of [GRACIA[f].entrada, GRACIA[f].despedida]) {
        const es = ES_PY[clave as keyof typeof ES_PY] as string;
        expect(es, clave).not.toMatch(/cintur|salida|m[aá]scar|ox[ií]geno|chaleco|emergencia|tr[aá]mite/i);
        expect(EN[clave as keyof typeof EN], clave).toBeTruthy();
      }
  });
});

/*
 * **El silbo, también en otras islas** (punto 288): Ara pregunta si solo se
 * habla silbando en La Gomera, después de haber oído su historia, y la
 * tripulante lo cuenta en persona. Sin la historia, la pregunta no sale.
 */
describe("el silbo en otras islas: Ara pregunta después de la historia de La Gomera, y la tripulante contesta", () => {
  it("con la historia oída: la pregunta después, y la respuesta detrás, de la tripulante en persona", () => {
    const r = correr(() => 4, { sitios: true });
    const contesta = indice(r, "inicio.ara.pasaje.garajonay");
    const pregunta = indice(r, "inicio.ara.pasaje.silboOtras");
    expect(contesta).toBeGreaterThanOrEqual(0);
    expect(pregunta).toBeGreaterThan(contesta);
    expect(indice(r, "inicio.tripulacion.pasaje.cerca.silbo")).toBe(pregunta + 1);
    expect(claves(r).filter((c) => c === "inicio.ara.pasaje.silboOtras")).toHaveLength(1);
    expect(esDeCerca(r.dichas[pregunta + 1]!.linea)).toBe(true);
    // Detrás de las islas que cuenta la tripulante, que es de lo que se está hablando.
    expect(pregunta).toBeGreaterThan(indice(r, "inicio.ara.pasaje.islas"));
    // Volando, con la tripulante por el pasillo: después del servicio y antes de preparar la cabina.
    expect(pregunta).toBeGreaterThan(indice(r, "inicio.tripulacion.pasaje.cerca.hola"));
    expect(pregunta).toBeLessThan(indice(r, "comandante.aproximacion"));
  });

  it("sin la historia del silbo, no se pregunta", () => {
    const r = correr(() => 4);
    expect(claves(r)).not.toContain("inicio.ara.pasaje.garajonay");
    expect(claves(r)).not.toContain("inicio.ara.pasaje.silboOtras");
    expect(claves(r)).not.toContain("inicio.tripulacion.pasaje.cerca.silbo");
  });

  it("y lo que se cuenta es lo documentado: El Hierro, Tenerife y Gran Canaria, hoy sobre todo La Gomera; La Palma no", () => {
    const es = ES_PY["inicio.tripulacion.pasaje.cerca.silbo"];
    for (const isla of ["El Hierro", "Tenerife", "Gran Canaria", "La Gomera"]) expect(es).toContain(isla);
    expect(es).not.toContain("La Palma");
    expect(EN["inicio.tripulacion.pasaje.cerca.silbo"]).not.toContain("La Palma");
  });
});
