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
import { seLePasoElMomento } from "../audio/megafonia";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";
import { Conversacion, ENTRE_FRASES, TOPE_DE_UNA_FRASE, type Linea } from "./conversacion";
import { esDeLaEscena, VOZ_DE } from "./inicio";
import {
  CHARLAS_DEL_PASAJE,
  CORTE_DE_PLANO,
  esAnuncioDeSiempre,
  esDeCerca,
  esDeFuera,
  GUION_DEL_PASAJE,
  LINEAS_DEL_PASAJE,
  RED_DE_LA_ESPERA,
  VueloDePasaje,
  type LecturaDelPasaje,
  type MomentoDelPasaje,
  type Senalado,
} from "./inicio-pasaje";
import type { PermisosDeLaEscena, TramoDeLinea } from "./vuelo-de-linea";
import { DIBUJOS_DEL_PASAJE, esDibujoDelPasaje } from "../ui/dibujos-del-pasaje";
import { JuegoDeLasPiezas, JuegoDelCamino, PARADAS, PIEZAS as PIEZAS_DEL_AVION } from "./kit-de-viaje";
import type { Fase } from "./vuelo";

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
  cabina = 0;
  falta = 200000;
  arrancoA: number | null = null;
  rodoA: number | null = null;
  entroA: number | null = null;
  despegoA: number | null = null;
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
          this.enTierra = true;
          this.altura = 0;
          this.vertical = 0;
          this.porElSuelo = 60;
        }
        break;
      case "frenando":
        this.porElSuelo = Math.max(12, this.porElSuelo - 2 * dt);
        if (this.enTramo >= 20) {
          this.porElSuelo = 8;
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
  } = {},
): Corrido {
  let t = 0;
  const v = vozQueTarda(dura, () => t);
  const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
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
        // El primero de quien habla en ese momento: lo que sigue es el mismo anuncio.
        const empieza = !m.lineas.slice(0, i).some((x) => x.megafonia && x.quien === l.quien);
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
      /\b(hij[oa]s?|niñ[oa]s?|nen[ea]s?|guap[oa]s?|campe[oó]na?|list[oa]s?|tranquil[oa]s?|nervios[oa]s?|content[oa]s?|asustad[oa]s?|sentad[oa]s?|solit[oa]s?|pequeñ[oa]s?|chiquit[oa]s?|precios[oa]s?|bonit[oa]s?|valient[ea]s?|mi rey|mi reina)\b/i;
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
      /\b(hij[oa]s?|niñ[oa]s?|nen[ea]s?|solit[oa]s?|campe[oó]na?|list[oa]s?|tranquil[oa]s?|atent[oa]s?|asustad[oa]s?|cansad[oa]s?|nervios[oa]s?|content[oa]s?|orgullos[oa]s?|chiquit[oa]s?|sentad[oa]s?|abrochad[oa]s?|emocionad[oa]s?|pasajer[oa]|viajer[oa]|aviador[a]?|pilot[oa]s?|primeriz[oa]s?)\b/i;
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

describe("cada cosa en su momento del vuelo", () => {
  const r = correr(() => 4, { sitios: true });
  const dichos = r.escena.estado.dichos;

  it("pasa por todo, en el orden de un vuelo de verdad, y acaba", () => {
    // Con `OGA_PASAJE=1`, lo dicho con su hora.
    if (entorno?.OGA_PASAJE) console.log(r.dichas.map((d) => `${d.desde.toFixed(0)} s · ${d.linea.clave}`).join("\n"));
    const esperado: MomentoDelPasaje[] = [
      "ventanilla",
      "cinturon",
      "puertas",
      "motores",
      "bienvenida",
      "demostracion",
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
      "isla",
      "aproximacion",
      "tcpAterrizaje",
      "flaps",
      "aterrizando",
      "toma",
      "llegada",
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

  private pasar(t: TramoDeLinea): void {
    this.tramo = t;
    this.enTramo = 0;
  }

  get altura(): number {
    return Math.max(0, this.altitud - this.campo);
  }

  paso(dt: number, p: PermisosDeLaEscena): void {
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
        if (t >= 58) {
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
        this.porElSuelo = 8;
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

  get lectura(): LecturaDelPasaje {
    const nubes = { base: 1532, techo: 1982 };
    const enLaNube =
      (this.tramo === "subida" && this.altitud > 1600 && this.altitud < 1810) ||
      (this.tramo === "bajada" && this.altitud > 1650 && this.altitud < 1810);
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
    };
  }
}

/** Lo que el juego señala por la ventanilla, y cuándo lo vio en el banco, s. */
const LO_QUE_SE_VIO: readonly { t: number; s: Senalado }[] = [
  { t: 450, s: sitio("anaga", "izquierda") },
  { t: 620, s: sitio("orotava", "izquierda") },
  { t: 780, s: sitio("teide", "izquierda") },
  { t: 1015, s: sitio("garajonay", "izquierda") },
];

interface Medido {
  readonly escena: VueloDePasaje;
  readonly vuelo: VueloMedido;
  readonly dichas: Dicha[];
  /** El tramo de cada momento de escena, para saber dónde cae cada silencio. */
  readonly tramos: { t: number; tramo: TramoDeLinea }[];
}

/** Vuela la escena entera con el vuelo medido y las voces que duran lo que duran. */
function volarElMedido(): Medido {
  let t = 0;
  const v = vozQueTarda(loQueDura, () => t);
  const escena = new VueloDePasaje(v.voz, { lado: "izquierda" });
  const vuelo = new VueloMedido();
  const porVer = [...LO_QUE_SE_VIO];
  const tramos: { t: number; tramo: TramoDeLinea }[] = [];
  for (; t < 4000; t += DT) {
    v.tic();
    if (tramos[tramos.length - 1]?.tramo !== vuelo.tramo) tramos.push({ t, tramo: vuelo.tramo });
    vuelo.paso(DT, escena.paso(DT, vuelo.lectura));
    if (porVer[0] && porVer[0].t <= t && escena.puedeSenalar) escena.senalar(porVer.shift()!.s);
    if (escena.estado.puedeSeguir) escena.seguir();
    if (escena.estado.terminado) break;
  }
  return { escena, vuelo, dichas: v.dichas, tramos };
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
    for (const c of ["tren", "plop", "giro", "ala", "altoRapido", "tcpMotor", "bajando", "tcpIslas", "tcpRuta", "otraNube", "ruedas", "cinturonQuieto", "repaso"] as const)
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
    const conDibujo = [...GUION_DEL_PASAJE, ...CHARLAS_DEL_PASAJE].flatMap((x) => x.lineas).filter((l) => l.dibujo);
    expect(conDibujo.length).toBeGreaterThanOrEqual(20);
    for (const l of conDibujo) expect(esDibujoDelPasaje(l.dibujo!), `${l.clave}: ${l.dibujo}`).toBe(true);
    // Y todos los dibujos se usan.
    for (const d of Object.keys(DIBUJOS_DEL_PASAJE)) expect(conDibujo.map((l) => l.dibujo), d).toContain(d);
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
    if (porVer[0] && porVer[0].t <= t && escena.puedeSenalar) escena.senalar(porVer.shift()!.s);
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

/** Quien juega: abre el kit en cuanto lo tiene, elige `juego` y acierta una cosa cada `cada` segundos. */
function jugadorQueAcierta(juego: "piezas" | "camino", cada = 4): (escena: VueloDePasaje, t: number) => void {
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
    if (j instanceof JuegoDeLasPiezas) {
      const p = PIEZAS_DEL_AVION.find((x) => !j.puesta(x));
      if (p) j.soltar(p, p, kit.hayHueco);
    } else if (j instanceof JuegoDelCamino) {
      const p = PARADAS[j.estado.hechas];
      if (p) j.tocar(p, kit.hayHueco);
    }
  };
}

describe("el kit de viaje, en el vuelo", () => {
  const m = volarElMedido();
  const cuando = (dichas: Dicha[], clave: string): number => dichas.find((d) => d.linea.clave === clave)?.desde ?? NaN;
  const tramoA = (tramos: { t: number; tramo: TramoDeLinea }[], t: number): TramoDeLinea =>
    [...tramos].reverse().find((x) => x.t <= t)?.tramo ?? "puerta";

  it("la tripulante lo trae en un tramo tranquilo de la bajada: sin megafonía cerca y con rato por delante", () => {
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
    // Ni megafonía en el medio minuto de antes ni en los cinco de después.
    const megafonia = m.dichas.filter((d) => d.linea.megafonia);
    expect(megafonia.filter((d) => d.desde > dado - 30 && d.desde < dado + 300).map((d) => d.linea.clave)).toEqual([]);
    // Y más de cinco minutos antes de preparar la cabina para aterrizar.
    expect(cuando(m.dichas, "comandante.aproximacion") - dado).toBeGreaterThan(300);
  });

  it("y antes de aterrizar pide guardarlo, justo antes de la última revisión", () => {
    const k = m.dichas.map((d) => d.linea.clave);
    const guardar = k.indexOf("inicio.tripulacion.pasaje.cerca.kitGuardar");
    expect(guardar).toBeGreaterThan(k.indexOf("comandante.aproximacion"));
    expect(k[guardar + 1]).toBe("inicio.tripulacion.pasaje.cerca.aterrizaje");
    expect(m.escena.estado.kit.recogido).toBe(true);
  });

  for (const juego of ["piezas", "camino"] as const) {
    it(`se juega entero en el vuelo —${juego}—, y mientras se juega la escena no cuenta encima`, () => {
      const r = volarConElKit(jugadorQueAcierta(juego));
      const e = r.escena.estado;
      expect(e.kit.hechos).toContain(juego);
      const k = r.dichas.map((d) => d.linea.clave);
      if (juego === "piezas") for (const p of PIEZAS_DEL_AVION) expect(k, p).toContain(`inicio.ara.pasaje.kit.piezas.${p}`);
      else for (const p of PARADAS.slice(1)) expect(k, p).toContain(`inicio.ara.pasaje.kit.camino.${p}`);
      expect(k).toContain(`inicio.ara.pasaje.kit.${juego}.empezar`);
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
    const acierta = jugadorQueAcierta("piezas", 6);
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
    expect(r.escena.estado.kit.hechos).toContain("piezas");
  });

  it("se recoge antes de aterrizar aunque se esté jugando: y ya no se abre", () => {
    // Quien no acaba nunca: sigue con el kit abierto cuando llega la aproximación.
    let recogidoA: number | null = null;
    let abiertoTrasRecoger = false;
    const r = volarConElKit((escena, t) => {
      const kit = escena.kit;
      if (kit.aMano && !kit.estaAbierto) kit.abrir();
      if (kit.estaAbierto && !kit.juego && !kit.estado.pausado) kit.elegir("camino");
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
});
