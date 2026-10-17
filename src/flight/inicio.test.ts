/**
 * El modo inicio, paso a paso: que cada paso espere su gesto con el mundo
 * quieto, que equivocarse lo vuelva a pedir con otras palabras, que la mano de
 * la mamá ayude a acabar lo empezado, y que el final dé el sello. Ver
 * `flight/inicio.ts`.
 *
 * El avión de aquí es de mentira y obedece al momento: lo que se prueba es la
 * secuencia, no el vuelo. El vuelo de verdad lo mira
 * `scripts/verificar-inicio.mjs`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";
import { Boca, SILENCIO, type Urgencia } from "../audio/boca";
import { ArcadeFlightModel } from "./arcade";
import { PYKASU } from "./aircraft";
import { neutralControls } from "./model";
import COMANDANTE from "../../data/voces/comandante/manifiesto.json";
import ARA from "../../data/voces/ara/manifiesto.json";
import {
  ALTURA_PARA_VIRAR,
  ENFRIA_EL_ERROR,
  esDeLaEscena,
  ESPERA_SIN_HACER,
  GUION_DEL_INICIO,
  Inicio,
  inicioGrabado,
  LINEAS_DEL_INICIO,
  PISTA_QUE_SE_GUARDA,
  SIN_INTENTO,
  SUBE_AL_SOLTAR,
  VOZ_DE,
  type Intento,
  type Lectura,
  type Linea,
  type PasoId,
  type SalidaDelInicio,
} from "./inicio";

const GRADO = Math.PI / 180;
const DT = 1 / 30;

/** La voz: apunta lo que se dice y lo da por dicho al momento. */
function vozQueApunta(): { dichas: Linea[]; calladas: number; voz: ConstructorParameters<typeof Inicio>[0] } {
  const dichas: Linea[] = [];
  const r = {
    dichas,
    calladas: 0,
    voz: {
      decir: (l: Linea, alAcabar: (s: number) => void) => {
        dichas.push(l);
        alAcabar(0);
      },
      callar: () => {
        r.calladas++;
      },
    },
  };
  return r;
}

/** Un avión de mentira, parado en la cabecera con el motor apagado. */
function enLaCabecera(): { -readonly [K in keyof Lectura]: Lectura[K] } {
  return {
    motor: false,
    gas: 0,
    intento: SIN_INTENTO,
    velocidad: 0,
    vr: 28,
    altura: 0,
    enTierra: true,
    alabeo: 0,
    mando: "teclado",
    pistaQueQueda: 1400,
    // Como en el modelo sencillo: rodando, el gas es la fracción de la punta del suelo.
    gasQueSostiene: (v) => v / 37.2,
  };
}

const con = (i: Partial<Intento>): Intento => ({ ...SIN_INTENTO, ...i });

/** Unos segundos de secuencia con el avión como esté. */
function pasar(inicio: Inicio, l: Lectura, segundos: number): SalidaDelInicio {
  let s: SalidaDelInicio = {
    congelado: false,
    ayuda: { gas: null, gasTope: null, cabeceo: null, centrar: false },
  };
  for (let t = 0; t < segundos; t += DT) s = inicio.paso(DT, l);
  return s;
}

/** Hasta que la secuencia llegue a un paso, con un tope. */
function hasta(inicio: Inicio, l: Lectura, paso: PasoId, tope = 60): void {
  for (let t = 0; t < tope && inicio.estado.paso !== paso; t += DT) inicio.paso(DT, l);
  expect(inicio.estado.paso).toBe(paso);
}

describe("el guion", () => {
  it("cada frase tiene su texto en castellano paraguayo y en inglés", () => {
    for (const l of LINEAS_DEL_INICIO) {
      expect(ES_PY[l.clave as keyof typeof ES_PY], l.clave).toBeTruthy();
      expect(EN[l.clave as keyof typeof EN], l.clave).toBeTruthy();
    }
  });

  /*
   * **Ara no es niño ni niña**, ni en lo que dice ni en lo que se dice de Ara:
   * así quien juega se pone en su sitio, sea quien sea. Lo que mira es lo que
   * más fácil se cuela —«hijo», «solito», «campeón», «her son»—; un «y listo»
   * que habla del gesto, no de Ara, se queda.
   */
  it("y nada de la escena dice si Ara es niño o niña", () => {
    const conGenero = /\b(hij[oa]s?|niñ[oa]s?|nen[ea]s?|solit[oa]s?|campe[oó]na?)\b/i;
    const withGender = /\b(son|daughter|boy|girl|his|him|he|she)\b/i;
    const claves = Object.keys(ES_PY).filter((k) => k.startsWith("inicio."));
    expect(claves.length).toBeGreaterThan(LINEAS_DEL_INICIO.length);
    for (const k of claves) {
      expect(ES_PY[k as keyof typeof ES_PY], k).not.toMatch(conGenero);
      expect(EN[k as keyof typeof EN] ?? "", k).not.toMatch(withGender);
    }
  });

  it("Jazlyn con la voz de la comandante y Ara con la suya, y Ara pregunta antes de que ella enseñe", () => {
    expect(VOZ_DE.mama).toBe("comandante");
    expect(VOZ_DE.ara).toBe("ara");
    for (const p of GUION_DEL_INICIO) {
      const i = p.entra.findIndex((l) => l.quien === "ara");
      const j = p.entra.findIndex((l) => l.quien === "mama");
      if (i >= 0 && j >= 0) expect(i, p.id).toBeLessThan(j);
    }
  });

  it("y ninguna de las de ella es tan corta que la voz se invente lo que falta", () => {
    // Ver «con chispa, una frase muy corta se inventa lo que falta» en docs/voces/LEEME.md.
    for (const l of LINEAS_DEL_INICIO) {
      const texto = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(texto.length, l.clave).toBeGreaterThanOrEqual(30);
    }
  });

  it("es primera experiencia solo con todas sus frases grabadas, las de los dos", () => {
    expect(inicioGrabado(() => true)).toBe(true);
    expect(inicioGrabado(() => false)).toBe(false);
    // Con Jazlyn grabada y Ara no, todavía no.
    expect(inicioGrabado((voz) => voz === "comandante")).toBe(false);
    // Y una sola que falte basta para que no.
    const falta = LINEAS_DEL_INICIO.at(-1)!.clave;
    expect(inicioGrabado((_, clave) => clave !== falta)).toBe(false);
  });
});

describe("cada paso espera su gesto", () => {
  it("empieza saludando, con el mundo quieto, y pasa a la llave", () => {
    const v = vozQueApunta();
    const inicio = new Inicio(v.voz, { primerSello: true });
    expect(inicio.estado.paso).toBe("hola");
    expect(inicio.estado.congelado).toBe(true);
    const l = enLaCabecera();
    const s = pasar(inicio, l, 2);
    expect(inicio.estado.paso).toBe("motor");
    expect(s.congelado).toBe(true);
    expect(inicio.estado.gesto).toBe("motor");
    expect(v.dichas.map((d) => d.clave)).toEqual([
      "inicio.ara.hola",
      "inicio.mama.hola",
      "inicio.ara.motor",
      "inicio.mama.motor",
    ]);
  });

  it("sin hacer nada, el mundo sigue quieto y el paso no se mueve", () => {
    const inicio = new Inicio(vozQueApunta().voz, { primerSello: true });
    const l = enLaCabecera();
    hasta(inicio, l, "motor");
    const s = pasar(inicio, l, 40);
    expect(inicio.estado.paso).toBe("motor");
    expect(s.congelado).toBe(true);
    expect(s.ayuda.gas).toBeNull();
  });

  it("y arrancar el motor lo da por hecho: pasa al gas, que también espera", () => {
    const inicio = new Inicio(vozQueApunta().voz, { primerSello: true });
    const l = enLaCabecera();
    hasta(inicio, l, "motor");
    l.motor = true;
    hasta(inicio, l, "gas");
    expect(inicio.estado.congelado).toBe(true);
    expect(inicio.estado.gesto).toBe("gas");
  });

  it("el gas: empujarlo suelta el mundo, y la mano lo lleva hasta arriba", () => {
    const inicio = new Inicio(vozQueApunta().voz, { primerSello: true });
    const l = enLaCabecera();
    l.motor = true;
    hasta(inicio, l, "gas");
    // Un toque del más: una vez.
    l.intento = con({ gas: 1 });
    let s = inicio.paso(DT, l);
    expect(s.congelado).toBe(false);
    l.intento = SIN_INTENTO;
    for (let t = 0; t < 3 && inicio.estado.paso === "gas" && inicio.estado.fase === "hace"; t += DT) {
      s = inicio.paso(DT, l);
      // El avión obedece a la mano: el gas es el que ella sostiene.
      if (s.ayuda.gas !== null) l.gas = Math.max(l.gas, s.ayuda.gas);
    }
    expect(l.gas).toBeGreaterThan(0.85);
    expect(inicio.estado.fase).not.toBe("hace");
    expect(s.ayuda.gas).toBeGreaterThan(0.85);
  });

  it("y en la Vr, con la carrera ya explicada, el mundo se para a esperar la flecha de subir", () => {
    const inicio = new Inicio(vozQueApunta().voz, { primerSello: true });
    const l = enLaCabecera();
    l.motor = true;
    hasta(inicio, l, "gas");
    l.intento = con({ gas: 1 });
    inicio.paso(DT, l);
    l.intento = SIN_INTENTO;
    l.gas = 1;
    // Corre: la velocidad sube sola con el mundo suelto.
    for (let t = 0; t < 30 && inicio.estado.paso !== "despegar"; t += DT) {
      const s = inicio.paso(DT, l);
      if (!s.congelado) l.velocidad += 2.5 * DT;
    }
    expect(inicio.estado.paso).toBe("despegar");
    expect(inicio.estado.congelado).toBe(true);
    expect(inicio.estado.gesto).toBe("subir");
    const v = l.velocidad;
    pasar(inicio, l, 5);
    expect(inicio.estado.linea?.clave).toBe("inicio.mama.despegar");
    expect(l.velocidad).toBe(v);
  });
});

/** Lleva la secuencia hasta un paso, haciendo bien todo lo de antes. */
function volarHasta(paso: PasoId, mando: Lectura["mando"] = "teclado"): {
  inicio: Inicio;
  l: ReturnType<typeof enLaCabecera>;
  v: ReturnType<typeof vozQueApunta>;
} {
  const v = vozQueApunta();
  const inicio = new Inicio(v.voz, { primerSello: true });
  const l = enLaCabecera();
  l.mando = mando;
  const orden: PasoId[] = GUION_DEL_INICIO.map((p) => p.id);
  for (let t = 0; t < 400 && inicio.estado.paso !== paso; t += DT) {
    const e = inicio.estado;
    l.intento = SIN_INTENTO;
    // Se hace lo que se pide cuando se ha terminado de pedir, como haría alguien que escucha.
    if (e.congelado && e.fase === "espera") {
      if (e.paso === "motor") l.motor = true;
      if (e.paso === "gas") l.intento = con({ gas: 1 });
      if (e.paso === "despegar") l.intento = con({ cabeceo: 1 });
      if (e.paso === "izquierda") l.intento = con({ alabeo: -1 });
      if (e.paso === "derecha") l.intento = con({ alabeo: 1 });
      if (e.paso === "nivelar") l.intento = con({ alabeo: -Math.sign(l.alabeo) });
    }
    const s = inicio.paso(DT, l);
    if (s.congelado) continue;
    // El avión de mentira, que hace lo que se le pide.
    if (s.ayuda.gas !== null) l.gas = Math.max(l.gas, s.ayuda.gas);
    if (l.gas > 0.5) l.velocidad += 2.5 * DT;
    if (s.ayuda.cabeceo !== null && l.velocidad >= l.vr) {
      l.enTierra = false;
      l.altura += 6 * DT;
    } else if (!l.enTierra) l.altura += 4 * DT;
    if (e.paso === "izquierda" && e.fase === "hace") l.alabeo -= 15 * GRADO * DT;
    if (e.paso === "derecha" && e.fase === "hace") l.alabeo += 15 * GRADO * DT;
    if (s.ayuda.centrar || (e.paso === "nivelar" && e.fase === "hace")) l.alabeo *= 0.9;
  }
  expect(orden).toContain(paso);
  expect(inicio.estado.paso).toBe(paso);
  return { inicio, l, v };
}

describe("en el aire", () => {
  it("la flecha de subir suelta el mundo y la mano sostiene el morro hasta que vuela", () => {
    const { inicio, l } = volarHasta("despegar");
    pasar(inicio, l, 3);
    l.intento = con({ cabeceo: 1 });
    const s = inicio.paso(DT, l);
    expect(s.congelado).toBe(false);
    l.intento = SIN_INTENTO;
    // Un toque y ya: la mano no lo suelta aunque se suelte la tecla.
    expect(inicio.paso(DT, l).ayuda.cabeceo).toBeGreaterThan(0.5);
  });

  it("vira a la izquierda cuando se llega a la altura de virar, con el mundo quieto", () => {
    const { inicio, l } = volarHasta("izquierda");
    expect(l.altura).toBeGreaterThanOrEqual(ALTURA_PARA_VIRAR);
    expect(inicio.estado.congelado).toBe(true);
    expect(inicio.estado.gesto).toBe("izquierda");
  });

  it("a un lado, al otro, y enderezar: con el mando de consola, enderezar es soltar", () => {
    const { inicio, l } = volarHasta("nivelar", "consola");
    // Todavía con la palanca a la derecha, que es como acaba el viraje.
    l.intento = con({ alabeo: 1 });
    pasar(inicio, l, 3);
    expect(inicio.estado.congelado).toBe(true);
    // La palanca suelta, en el centro.
    l.intento = SIN_INTENTO;
    const s = inicio.paso(DT, l);
    expect(s.congelado).toBe(false);
  });

  it("y con el teclado, soltar no basta: hay que apretar la del otro lado", () => {
    const { inicio, l } = volarHasta("nivelar");
    pasar(inicio, l, 3);
    expect(inicio.estado.congelado).toBe(true);
    expect(Math.abs(l.alabeo)).toBeGreaterThan(5 * GRADO);
    l.intento = SIN_INTENTO;
    expect(inicio.paso(DT, l).congelado).toBe(true);
    l.intento = con({ alabeo: -Math.sign(l.alabeo) });
    const s = inicio.paso(DT, l);
    expect(s.congelado).toBe(false);
    // Y la mano de ella termina de enderezar.
    expect(s.ayuda.centrar).toBe(true);
  });

  it("y en el aire, bajo, la mano levanta el morro: una vuelta de prueba no acaba en el suelo", () => {
    const { inicio, l } = volarHasta("izquierda");
    l.intento = con({ alabeo: -1 });
    l.altura = 12;
    const s = inicio.paso(DT, l);
    expect(s.ayuda.cabeceo).toBeGreaterThan(0.3);
  });
});

describe("si se equivoca, no pasa nada", () => {
  it("se le vuelve a pedir con otras palabras, nunca con las mismas dos veces seguidas", () => {
    const { inicio, l, v } = volarHasta("izquierda");
    pasar(inicio, l, 3);
    const antes = v.dichas.length;
    // Para el otro lado.
    l.intento = con({ alabeo: 1 });
    pasar(inicio, l, 0.2);
    expect(inicio.estado.congelado).toBe(true);
    const primera = v.dichas.slice(antes);
    expect(primera.map((d) => d.clave)).toEqual(["inicio.mama.izquierda.otra1"]);
    // Y si insiste, otra cosa, y no antes de que se enfríe.
    pasar(inicio, l, ENFRIA_EL_ERROR + 0.5);
    const segunda = v.dichas.slice(antes + 1).map((d) => d.clave);
    expect(segunda[0]).toBe("inicio.mama.izquierda.otra2");
    expect(v.dichas.slice(antes).length).toBeLessThanOrEqual(3);
    expect(inicio.estado.otraVez).toBeGreaterThanOrEqual(2);
  });

  it("y sin hacer nada, también, pasado un rato", () => {
    const { inicio, l, v } = volarHasta("despegar");
    pasar(inicio, l, 2);
    const antes = v.dichas.length;
    pasar(inicio, l, ESPERA_SIN_HACER + 0.5);
    expect(v.dichas.slice(antes).map((d) => d.clave)).toEqual(["inicio.mama.despegar.otra1"]);
  });

  it("y apretar la buena después de equivocarse sigue valiendo, a la primera", () => {
    const { inicio, l } = volarHasta("derecha");
    pasar(inicio, l, 3);
    l.intento = con({ alabeo: -1 });
    pasar(inicio, l, 1);
    l.intento = con({ alabeo: 1 });
    expect(inicio.paso(DT, l).congelado).toBe(false);
    expect(inicio.estado.fase).toBe("hace");
  });

  it("si se apaga el motor en tierra, se vuelve a la llave", () => {
    const { inicio, l } = volarHasta("gas");
    l.motor = false;
    inicio.paso(DT, l);
    expect(inicio.estado.paso).toBe("motor");
    expect(inicio.estado.congelado).toBe(true);
  });
});

describe("el final", () => {
  it("felicita con el primer sello, espera a que se quiera seguir, y suelta el mundo", () => {
    const { inicio, l, v } = volarHasta("fin");
    expect(inicio.estado.congelado).toBe(true);
    pasar(inicio, l, 3);
    const claves = v.dichas.map((d) => d.clave);
    expect(claves.slice(-2)).toEqual(["inicio.ara.fin", "inicio.mama.fin"]);
    expect(inicio.estado.puedeSeguir).toBe(true);
    // Sin tocar «seguir», se queda: es su momento.
    pasar(inicio, l, 20);
    expect(inicio.estado.terminado).toBe(false);
    inicio.seguir();
    const s = inicio.paso(DT, l);
    expect(inicio.estado.terminado).toBe(true);
    expect(s.congelado).toBe(false);
    expect(s.ayuda).toEqual({ gas: null, gasTope: null, cabeceo: null, centrar: false });
  });

  it("y si no es el primer sello del cuaderno, no dice que lo sea", () => {
    const v = vozQueApunta();
    const inicio = new Inicio(v.voz, { primerSello: false, desde: "fin" });
    pasar(inicio, enLaCabecera(), 2);
    expect(v.dichas.map((d) => d.clave)).toContain("inicio.mama.finOtra");
    expect(v.dichas.map((d) => d.clave)).not.toContain("inicio.mama.fin");
  });

  it("la escena entera, de punta a punta, dice cada frase de los pasos una vez", () => {
    const { v } = volarHasta("fin");
    const dichas = v.dichas.map((d) => d.clave);
    for (const p of GUION_DEL_INICIO)
      for (const l of p.entra) expect(dichas.filter((c) => c === l.clave).length, l.clave).toBe(1);
  });
});

describe("la voz, en orden", () => {
  it("una frase detrás de otra, y lo que quedaba se calla en cuanto se hace", () => {
    const dichas: Linea[] = [];
    let acabar: ((s: number) => void) | null = null;
    let calladas = 0;
    const inicio = new Inicio(
      {
        decir: (l, alAcabar) => {
          dichas.push(l);
          acabar = alAcabar;
        },
        callar: () => calladas++,
      },
      { primerSello: true, desde: "motor" },
    );
    const l = enLaCabecera();
    inicio.paso(DT, l);
    // Pregunta Ara; Jazlyn no habla hasta que Ara acaba.
    expect(dichas.map((d) => d.clave)).toEqual(["inicio.ara.motor"]);
    pasar(inicio, l, 2);
    expect(dichas.length).toBe(1);
    acabar!(0);
    pasar(inicio, l, 1);
    expect(dichas.map((d) => d.clave)).toEqual(["inicio.ara.motor", "inicio.mama.motor"]);
    // Y arranca a media frase: se calla y se felicita.
    l.motor = true;
    pasar(inicio, l, 1);
    expect(calladas).toBeGreaterThan(0);
    expect(dichas.at(-1)!.clave).toBe("inicio.ara.motor.bien");
  });

  it("sin voz, el subtítulo se deja leer antes de la siguiente", () => {
    const dichas: Linea[] = [];
    const inicio = new Inicio(
      { decir: (l, alAcabar) => (dichas.push(l), alAcabar(3)), callar: () => {} },
      { primerSello: true },
    );
    const l = enLaCabecera();
    pasar(inicio, l, 1);
    expect(dichas.length).toBe(1);
    pasar(inicio, l, 3);
    expect(dichas.length).toBe(2);
  });
});

describe("la escena no se cuelga", () => {
  it("si la boca tira una frase sin avisar, a su tope se sigue", () => {
    const dichas: Linea[] = [];
    const inicio = new Inicio({ decir: (l) => dichas.push(l), callar: () => {} }, { primerSello: true });
    const l = enLaCabecera();
    pasar(inicio, l, 1);
    expect(dichas.length).toBe(1);
    pasar(inicio, l, 40);
    expect(dichas.length).toBeGreaterThan(1);
  });

  it("y si un reinicio vació la boca, se vuelve a pedir la que esperaba", () => {
    const dichas: Linea[] = [];
    const inicio = new Inicio({ decir: (l) => dichas.push(l), callar: () => {} }, { primerSello: true });
    const l = enLaCabecera();
    pasar(inicio, l, 1);
    inicio.retomarLaVoz();
    pasar(inicio, l, 1);
    expect(dichas.map((d) => d.clave)).toEqual(["inicio.ara.hola", "inicio.ara.hola"]);
  });
});

/**
 * **Lo que dura cada frase grabada**, s: la suma de las piezas de su receta
 * en el manifiesto de su voz. Con esto la carrera se prueba con el tiempo que
 * de verdad tarda Jazlyn en explicarla.
 */
function loQueDura(l: Linea): number {
  const m = (l.quien === "mama" ? COMANDANTE : ARA) as unknown as {
    recetas: Record<string, string[]>;
    piezas: Record<string, { ms: number }>;
  };
  const receta = m.recetas[l.clave];
  expect(receta, l.clave).toBeTruthy();
  return receta!.reduce((s, p) => s + (m.piezas[p]?.ms ?? 0), 0) / 1000;
}

/**
 * **Una voz que tarda lo que tarda**, con el silencio de la boca entre una
 * frase y la siguiente —ver `SILENCIO`—. `cuanto` dice lo que dura cada
 * frase; `null`, que se queda colgada y no avisa nunca.
 */
function vozQueTarda(cuanto: (l: Linea) => number | null): {
  voz: ConstructorParameters<typeof Inicio>[0];
  /** Avisa de lo que ha acabado a esta hora de escena. */
  paso(t: number): void;
} {
  let ahora = 0;
  let libreDesde = 0;
  let pendientes: { acaba: number; avisar: (s: number) => void }[] = [];
  return {
    voz: {
      decir: (l, alAcabar) => {
        const dura = cuanto(l);
        if (dura === null) return;
        const empieza = Math.max(ahora, libreDesde);
        libreDesde = empieza + dura + SILENCIO / 1000;
        pendientes.push({ acaba: empieza + dura, avisar: alAcabar });
      },
      callar: () => {
        pendientes = [];
        libreDesde = ahora + SILENCIO / 1000;
      },
    },
    paso: (t) => {
      ahora = t;
      const ya = pendientes.filter((p) => p.acaba <= t);
      pendientes = pendientes.filter((p) => p.acaba > t);
      for (const p of ya) p.avisar(0);
    },
  };
}

/** Lo que se mide de una carrera de verdad. Ver `correrLaCarrera`. */
interface Carrera {
  /** Lo más rápido que se fue mientras se hablaba de la carrera, m/s. */
  readonly masRapidoHablando: number;
  /** Y a qué velocidad se pasó a «¡ahora!», m/s. */
  readonly enElAhora: number;
  /** Metros rodados hasta el «¡ahora!», y hasta los quince metros de altura. */
  readonly hastaElAhora: number;
  readonly hastaQuince: number;
  /** Lo que quedaba de pista al pasar a «¡ahora!», m. */
  readonly quedabaEnElAhora: number;
  /** El gas más bajo al que la mano sostuvo la carrera. */
  readonly gasSostenido: number;
  /** Lo más deprisa que subió el gas pasado el paso del gas, por segundo. */
  readonly subidaMasBrusca: number;
  /** Y el gas a los quince metros. */
  readonly gasEnQuince: number;
  readonly registro: Inicio["registro"];
}

/**
 * **La carrera, con el JAZ 20 de verdad**: el modelo de vuelo del peldaño de
 * los pequeños, en la cabecera de los 1.400 metros del Chaco, con el motor en
 * marcha. Se empuja el gas una vez, la mano lo lleva, y se aprieta la flecha
 * de subir en cuanto se pide. Lo que la mano escribe en los mandos es lo
 * mismo que escribe `atenderAlInicio` en `game.ts`.
 */
function correrLaCarrera(voz: ReturnType<typeof vozQueTarda>, pista = 1400): Carrera {
  const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
  m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
  m.setOnRunway(true);
  const c = { ...neutralControls(), engineOn: true, throttle: 0 };
  const inicio = new Inicio(voz.voz, { primerSello: true, desde: "gas" });
  let empujado = false;
  let tirado = false;
  let masRapidoHablando = 0;
  let enElAhora = NaN;
  let hastaElAhora = NaN;
  let quedabaEnElAhora = NaN;
  let hastaQuince = NaN;
  let gasSostenido = 1;
  let subidaMasBrusca = 0;
  let gasEnQuince = NaN;
  for (let t = 0; t < 120 && Number.isNaN(hastaQuince); t += DT) {
    voz.paso(t);
    const s = m.state;
    const rodados = Math.hypot(s.position.x, s.position.z);
    const e = inicio.estado;
    let intento = SIN_INTENTO;
    if (e.paso === "gas" && e.fase === "espera" && !empujado) {
      intento = con({ gas: 1 });
      empujado = true;
    }
    if (e.paso === "despegar" && e.fase === "espera" && !tirado) {
      intento = con({ cabeceo: 1 });
      tirado = true;
    }
    const salida = inicio.paso(DT, {
      motor: true,
      gas: c.throttle,
      intento,
      velocidad: s.airspeed,
      vr: PYKASU.rotationSpeed,
      altura: Math.max(0, s.heightAboveGround - PYKASU.gearHeight),
      enTierra: s.onGround,
      alabeo: 0,
      mando: "teclado",
      pistaQueQueda: pista - rodados,
      gasQueSostiene: (v) => m.gasParaRodar(v),
    });
    const ahora = inicio.estado;
    if ((ahora.paso === "gas" || ahora.paso === "carrera") && ahora.hablando)
      masRapidoHablando = Math.max(masRapidoHablando, s.airspeed);
    if (ahora.paso === "despegar" && Number.isNaN(enElAhora)) {
      enElAhora = s.airspeed;
      hastaElAhora = rodados;
      quedabaEnElAhora = pista - rodados;
    }
    if (s.heightAboveGround - PYKASU.gearHeight >= 15) {
      hastaQuince = rodados;
      gasEnQuince = c.throttle;
    }
    const a = salida.ayuda;
    const antes = c.throttle;
    if (a.gas !== null && c.throttle < a.gas) c.throttle = a.gas;
    if (a.gasTope !== null && c.throttle > a.gasTope) c.throttle = a.gasTope;
    if (ahora.paso !== "gas") {
      subidaMasBrusca = Math.max(subidaMasBrusca, (c.throttle - antes) / DT);
      gasSostenido = Math.min(gasSostenido, c.throttle);
    }
    c.elevator = a.cabeceo ?? 0;
    if (!salida.congelado) m.step(DT, c);
  }
  return {
    masRapidoHablando,
    enElAhora,
    hastaElAhora,
    hastaQuince,
    quedabaEnElAhora,
    gasSostenido,
    subidaMasBrusca,
    gasEnQuince,
    registro: inicio.registro,
  };
}

/** Lo que el registro de la escena dice de una frase: la última vez que se dijo. */
const dicha = (r: Inicio["registro"], clave: string) =>
  r.filter((d) => d.clave === clave).at(-1);

describe("la carrera, con tiempo para explicarla", () => {
  it("con lo que duran las grabaciones, no pasa de Vr mientras Jazlyn habla", () => {
    const c = correrLaCarrera(vozQueTarda(loQueDura));
    // Hablando se llega cerca —es una carrera de verdad— y no se pasa.
    expect(c.masRapidoHablando).toBeGreaterThan(PYKASU.rotationSpeed - 3);
    expect(c.masRapidoHablando).toBeLessThan(PYKASU.rotationSpeed);
  });

  it("y «¡ahora!» va después, con lo de antes entero, y en la Vr", () => {
    const c = correrLaCarrera(vozQueTarda(loQueDura));
    const todavia = dicha(c.registro, "inicio.mama.carrera");
    const ahora = dicha(c.registro, "inicio.mama.despegar");
    expect(todavia?.cortada).toBe(false);
    expect(todavia?.hasta).not.toBeNull();
    expect(ahora!.desde).toBeGreaterThanOrEqual(todavia!.hasta!);
    // Lo de antes, también entero y en orden.
    expect(c.registro.map((d) => d.clave).slice(2, 6)).toEqual([
      "inicio.mama.gas.bien",
      "inicio.ara.carrera",
      "inicio.mama.carrera",
      "inicio.mama.despegar",
    ]);
    expect(c.registro.slice(2, 5).every((d) => !d.cortada)).toBe(true);
    expect(c.enElAhora).toBeGreaterThanOrEqual(PYKASU.rotationSpeed);
    expect(c.enElAhora).toBeLessThan(PYKASU.rotationSpeed + 0.5);
  });

  it("y cabe en la pista del Chaco: a quince metros antes de la mitad", () => {
    const c = correrLaCarrera(vozQueTarda(loQueDura));
    expect(c.hastaElAhora).toBeLessThan(400);
    expect(c.hastaQuince).toBeLessThan(700);
  });

  /*
   * El gas pasaba de golpe de lo sostenido a fondo en cuanto acababa «…yo te
   * aviso», y el motor pegaba un salto. La mano lo sube como lo subiría una
   * mano. Ver `SUBE_AL_SOLTAR`.
   */
  it("al acabar de explicarla, el gas sube con la mano, no de golpe, y llega a fondo", () => {
    const c = correrLaCarrera(vozQueTarda(loQueDura));
    // Se sostuvo de verdad por debajo del fondo…
    expect(c.gasSostenido).toBeLessThan(0.9);
    // …y de ahí arriba, nunca más deprisa que la mano.
    expect(c.subidaMasBrusca).toBeLessThanOrEqual(SUBE_AL_SOLTAR + 1e-6);
    expect(c.subidaMasBrusca).toBeGreaterThan(SUBE_AL_SOLTAR * 0.9);
    // Y antes de irse del suelo, a fondo.
    expect(c.gasEnQuince).toBe(1);
  });

  it("sin voz, con el rato de leer cada frase, tampoco pasa de Vr ni de la mitad", () => {
    // El de `tiempoDeLectura` en `game.ts`: un segundo por dieciocho letras, de dos a seis.
    const leer = (l: Linea): number =>
      Math.min(6, Math.max(2, (ES_PY[l.clave as keyof typeof ES_PY] as string).length / 18));
    const c = correrLaCarrera(vozQueTarda(leer));
    expect(c.masRapidoHablando).toBeLessThan(PYKASU.rotationSpeed);
    expect(dicha(c.registro, "inicio.mama.carrera")?.cortada).toBe(false);
    expect(c.hastaQuince).toBeLessThan(700);
  });

  it("y si la voz se cuelga, manda la pista: se despega guardando la que hace falta", () => {
    // «Todavía no…» no avisa nunca de que acabó.
    const c = correrLaCarrera(
      vozQueTarda((l) => (l.clave === "inicio.mama.carrera" ? null : loQueDura(l))),
    );
    expect(c.masRapidoHablando).toBeLessThan(PYKASU.rotationSpeed + 0.5);
    expect(c.quedabaEnElAhora).toBeGreaterThan(PISTA_QUE_SE_GUARDA - 50);
    expect(c.quedabaEnElAhora).toBeLessThanOrEqual(PISTA_QUE_SE_GUARDA);
    expect(c.hastaQuince).toBeLessThan(1400 - 300);
  });
});

describe("la escena tiene la boca", () => {
  /**
   * Lo que pide la radio en un campo con tráfico: el otro avión, la torre a
   * otro, la torre a vos, lo urgente, la megafonía y un canto de cabina, que
   * va sin clave.
   */
  const RADIO: readonly (readonly [Urgencia, string | undefined])[] = [
    ["baja", "otro.buenosDias@fonetico.zulu-fonetico.papa"],
    ["baja", "torre.holdShort@fonetico.zulu-fonetico.papa"],
    ["mando", "torre.clearedTakeoff"],
    ["urgente", "torre.goAround"],
    ["baja", "comandante.bienvenida"],
    ["normal", undefined],
  ];

  it("en el modo inicio ninguna radio pide turno ni corta una frase de la escena", () => {
    // La boca de verdad, con un reloj de mentira, reservada como la reserva `empezarElInicio`.
    let t = 0;
    const boca = new Boca({ ahora: () => t, cancelar: () => {} });
    boca.reservar(esDeLaEscena);
    let cortes = 0;
    let acabar: (() => void) | null = null;
    boca.pedir(
      "normal",
      (listo) => {
        acabar = () => listo();
        return () => void cortes++;
      },
      "inicio.mama.carrera",
    );
    expect(boca.ocupada).toBe(true);
    const suenan: (string | undefined)[] = [];
    for (const [urgencia, clave] of RADIO) boca.pedir(urgencia, () => void suenan.push(clave), clave);
    // Ni espera turno, ni corta, ni suena: ni con la frase sonando…
    expect(boca.cuantasEsperan).toBe(0);
    expect(cortes).toBe(0);
    expect(boca.ocupada).toBe(true);
    t += 3000;
    acabar!();
    // …ni en el hueco entre dos frases de la escena.
    t += 2000;
    for (const [urgencia, clave] of RADIO) boca.pedir(urgencia, () => void suenan.push(clave), clave);
    expect(suenan).toEqual([]);
    expect(boca.ocupada).toBe(false);
    // Y la escena sí: la siguiente frase suena.
    boca.pedir("normal", () => {}, "inicio.mama.despegar");
    expect(boca.habladas.map((h) => h.clave)).toEqual([
      "inicio.mama.carrera",
      "inicio.mama.despegar",
    ]);
  });

  it("lo que esperaba turno al empezar la escena se cae, y acabada, la boca es de todos", () => {
    let t = 0;
    const boca = new Boca({ ahora: () => t, cancelar: () => {} });
    let acabar: (() => void) | null = null;
    boca.pedir("mando", (listo) => void (acabar = () => listo()), "torre.atis");
    boca.pedir("baja", () => {}, "otro.enFinal");
    expect(boca.cuantasEsperan).toBe(1);
    boca.reservar(esDeLaEscena);
    expect(boca.cuantasEsperan).toBe(0);
    // Lo que sonaba, acaba: no se corta a nadie.
    expect(boca.ocupada).toBe(true);
    acabar!();
    boca.reservar(null);
    t += 5000;
    boca.pedir("baja", () => {}, "otro.buenosDias");
    expect(boca.habladas.at(-1)?.clave).toBe("otro.buenosDias");
  });
});
