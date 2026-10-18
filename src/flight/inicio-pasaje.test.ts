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
  esAnuncioDeSiempre,
  GUION_DEL_PASAJE,
  LINEAS_DEL_PASAJE,
  RED_DE_LA_ESPERA,
  VueloDePasaje,
  type LecturaDelPasaje,
  type MomentoDelPasaje,
  type Senalado,
} from "./inicio-pasaje";
import type { PermisosDeLaEscena, TramoDeLinea } from "./vuelo-de-linea";
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
      } else {
        expect(l.megafonia, l.clave).toBe(true);
        expect(l.clave.startsWith(l.quien === "mama" ? "inicio.mama.pasaje." : "inicio.tripulacion.pasaje.")).toBe(true);
      }
    }
  });

  /*
   * **La comandante no le contesta a un pasajero por la megafonía.** Lo suyo,
   * y lo de la tripulación, se le dice a todo el pasaje y de usted: sin voseo
   * y sin nombrar a nadie.
   */
  it("lo de la megafonía es para todo el pasaje, de usted y sin voseo", () => {
    const voseo = /\b(vos|mirá|escuchá|tenés|querés|sabés|podés|tu|te|ti)\b/i;
    for (const l of LINEAS_DEL_PASAJE.filter((x) => x.megafonia)) {
      const es = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(es, l.clave).not.toMatch(voseo);
      expect(es, l.clave).not.toMatch(/\bAra\b/);
      expect(es, l.clave).toMatch(/señor|quienes/i);
    }
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
      "espera",
      "despegue",
      "carrera",
      "volando",
      "nubes",
      "nubesRespuesta",
      "arriba",
      "servicio",
      "bajada",
      "oidos",
      "isla",
      "aproximacion",
      "flaps",
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

  it("la bienvenida se pide ya rodando para el juego, y suena", () => {
    const bienvenida = r.dichas.find((d) => d.linea.clave === "comandante.bienvenida")!;
    expect(bienvenida).toBeTruthy();
    // Cuatro segundos de «arrancando» después de echar a rodar.
    expect(bienvenida.desde).toBeGreaterThanOrEqual(r.vuelo.rodoA! + 4 - 1e-6);
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
