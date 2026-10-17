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
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";
import {
  ALTURA_PARA_VIRAR,
  ENFRIA_EL_ERROR,
  ESPERA_SIN_HACER,
  GUION_DEL_INICIO,
  Inicio,
  inicioGrabado,
  LINEAS_DEL_INICIO,
  SIN_INTENTO,
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
  };
}

const con = (i: Partial<Intento>): Intento => ({ ...SIN_INTENTO, ...i });

/** Unos segundos de secuencia con el avión como esté. */
function pasar(inicio: Inicio, l: Lectura, segundos: number): SalidaDelInicio {
  let s: SalidaDelInicio = { congelado: false, ayuda: { gas: null, cabeceo: null, centrar: false } };
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

  it("y en la Vr el mundo se para, aunque quedara algo por decir, a esperar la flecha de subir", () => {
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
    expect(s.ayuda).toEqual({ gas: null, cabeceo: null, centrar: false });
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
