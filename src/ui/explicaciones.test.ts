/**
 * El registro de explicaciones: abrir, cerrar, la voz que calla mientras no
 * esté grabada y la primera vez que se presenta. Sin navegador: la ventana y
 * la voz se enchufan de mentira, que es para lo que son enchufes.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { AIRCRAFT } from "../flight/aircraft";
import { DIBUJOS } from "./senal";
import { Tablero } from "./tablero";
import {
  abrirCuriosidades,
  abrirExplicacion,
  apareceEnPantalla,
  cerrarExplicacion,
  comoSeEnsena,
  curiosidadesAbiertas,
  estaPresentada,
  explicacionAbierta,
  explicacionDe,
  explicacionesDe,
  olvidarTodo,
  ponerContextoDeLasExplicaciones,
  ponerPantallaDeExplicaciones,
  ponerVozDeLasExplicaciones,
  presentar,
  registrarExplicacion,
  repetirLaVoz,
  siguienteQuePresentar,
  type ComoSeEnsena,
  type Explicacion,
} from "./explicaciones";
import { DE_SERIE, ponerLasDeSerie } from "./explicaciones-de-serie";
import { piezaEn } from "./tocar-para-explicar";

/** Una ventana de mentira que apunta lo que le piden. */
function ventanaDePrueba() {
  const v = {
    mostradas: [] as ComoSeEnsena[],
    rincon: null as readonly ComoSeEnsena[] | null,
    ocultada: 0,
    mostrar(c: ComoSeEnsena) {
      v.mostradas.push(c);
    },
    mostrarRincon(c: readonly ComoSeEnsena[]) {
      v.rincon = c;
    },
    ocultar() {
      v.ocultada++;
    },
  };
  return v;
}

/** Y una voz de mentira, con las claves que tiene grabadas. */
function vozDePrueba(grabadas: readonly string[]) {
  const v = {
    dichas: [] as string[],
    calladas: 0,
    grabada: (clave: string) => grabadas.includes(clave),
    decir(clave: string) {
      v.dichas.push(clave);
    },
    callar() {
      v.calladas++;
    },
  };
  return v;
}

const T: Explicacion = {
  id: "td",
  rotulo: "T/D",
  dibujo: { svg: "<svg></svg>" },
  corta: "explica.td.corta",
  texto: "explica.td.texto",
  presenta: "explica.td.presenta",
};

beforeEach(() => olvidarTodo());
afterEach(() => olvidarTodo());

describe("abrir y cerrar", () => {
  it("abre la que está registrada, y la ventana la enseña", () => {
    const v = ventanaDePrueba();
    ponerPantallaDeExplicaciones(v);
    registrarExplicacion(T);
    expect(abrirExplicacion("td")).toBe(true);
    expect(explicacionAbierta()).toBe("td");
    expect(v.mostradas).toHaveLength(1);
    expect(v.mostradas[0]!.explicacion.id).toBe("td");
  });

  it("y una que no existe no abre nada", () => {
    const v = ventanaDePrueba();
    ponerPantallaDeExplicaciones(v);
    expect(abrirExplicacion("no-existe")).toBe(false);
    expect(explicacionAbierta()).toBeNull();
    expect(v.mostradas).toHaveLength(0);
  });

  it("cerrar la esconde y la olvida", () => {
    const v = ventanaDePrueba();
    ponerPantallaDeExplicaciones(v);
    registrarExplicacion(T);
    abrirExplicacion("td");
    cerrarExplicacion();
    expect(explicacionAbierta()).toBeNull();
    expect(v.ocultada).toBe(1);
  });

  it("y quien registra otra con el mismo id la sustituye", () => {
    registrarExplicacion(T);
    registrarExplicacion({ ...T, rotulo: "TOD" });
    expect(explicacionDe("td")?.rotulo).toBe("TOD");
  });

  it("el rincón de las curiosidades las enseña todas, y solo esas", () => {
    const v = ventanaDePrueba();
    ponerPantallaDeExplicaciones(v);
    ponerLasDeSerie();
    abrirCuriosidades();
    expect(curiosidadesAbiertas()).toBe(true);
    const ids = v.rincon!.map((c) => c.explicacion.id);
    expect(ids).toEqual(explicacionesDe("curiosidades").map((e) => e.id));
    expect(ids).toEqual([
      "persianas",
      "video-seguridad",
      "mascaras",
      "no-fumar",
      "cinturon",
      "mesitas",
      "modo-avion",
    ]);
  });
});

describe("la voz", () => {
  it("sin grabar, calla: ni la grabación ni la voz del navegador", () => {
    const v = vozDePrueba([]);
    ponerPantallaDeExplicaciones(ventanaDePrueba());
    ponerVozDeLasExplicaciones(v);
    registrarExplicacion(T);
    abrirExplicacion("td");
    expect(v.dichas).toEqual([]);
    repetirLaVoz();
    expect(v.dichas).toEqual([]);
  });

  it("grabada, la dice al abrir y otra vez con el altavoz", () => {
    const v = vozDePrueba(["explica.td.texto"]);
    ponerPantallaDeExplicaciones(ventanaDePrueba());
    ponerVozDeLasExplicaciones(v);
    registrarExplicacion(T);
    abrirExplicacion("td");
    expect(v.dichas).toEqual(["explica.td.texto"]);
    repetirLaVoz();
    expect(v.dichas).toEqual(["explica.td.texto", "explica.td.texto"]);
  });

  it("y al cerrar se calla lo que decía", () => {
    const v = vozDePrueba(["explica.td.texto"]);
    ponerPantallaDeExplicaciones(ventanaDePrueba());
    ponerVozDeLasExplicaciones(v);
    registrarExplicacion(T);
    abrirExplicacion("td");
    cerrarExplicacion();
    expect(v.calladas).toBeGreaterThan(0);
  });

  it("y si no dijo nada, cerrar no calla a nadie", () => {
    const v = vozDePrueba([]);
    ponerPantallaDeExplicaciones(ventanaDePrueba());
    ponerVozDeLasExplicaciones(v);
    registrarExplicacion(T);
    abrirExplicacion("td");
    cerrarExplicacion();
    expect(v.calladas).toBe(0);
  });

  it("con vídeo no habla la instructora: el vídeo trae su voz", () => {
    const v = vozDePrueba(["explica.td.texto"]);
    ponerPantallaDeExplicaciones(ventanaDePrueba());
    ponerVozDeLasExplicaciones(v);
    registrarExplicacion({ ...T, video: { src: "luna-td.webm" } });
    abrirExplicacion("td");
    expect(v.dichas).toEqual([]);
  });
});

describe("lo que se enseña en cada peldaño", () => {
  const grabada = () => false;

  it("en el del dibujo, ni una letra: el dibujo y la voz", () => {
    const c = comoSeEnsena(T, { peldano: "dibujo", enTierra: false }, grabada);
    expect(c.rotulo).toBeNull();
    expect(c.palabra).toBeNull();
    expect(c.texto).toBeNull();
    // El lector de pantalla no pasa por la escalera.
    expect(c.nombre).toContain("T/D");
  });

  it("en el de la palabra, el rótulo y la palabra corta", () => {
    const c = comoSeEnsena(T, { peldano: "palabra", enTierra: false }, grabada);
    expect(c.rotulo).toBe("T/D");
    expect(c.palabra).toBe(ES_PY["explica.td.corta"]);
    expect(c.texto).toBeNull();
  });

  it("desde el de las cifras, el texto entero", () => {
    for (const peldano of ["cifra", "cabina"] as const) {
      const c = comoSeEnsena(T, { peldano, enTierra: false }, grabada);
      expect(c.texto).toBe(ES_PY["explica.td.texto"]);
    }
  });

  it("y la pantalla de navegación, en tierra, dice que el TCAS descansa", () => {
    ponerLasDeSerie();
    const nd = explicacionDe("carta")!;
    const enElAire = comoSeEnsena(nd, { peldano: "cifra", enTierra: false }, grabada);
    const enTierra = comoSeEnsena(nd, { peldano: "cifra", enTierra: true }, grabada);
    expect(enElAire.texto).toContain("cerca de tu altura");
    expect(enTierra.texto).toContain("descansa");
    expect(enTierra.voz.clave).toBe("explica.carta.tierra");
  });

  it("el contexto lo pone el juego", () => {
    const v = ventanaDePrueba();
    ponerPantallaDeExplicaciones(v);
    registrarExplicacion(T);
    ponerContextoDeLasExplicaciones(() => ({ peldano: "dibujo", enTierra: false }));
    abrirExplicacion("td");
    expect(v.mostradas[0]!.texto).toBeNull();
    // Y quien abre puede forzar parte: el hangar está siempre en tierra.
    abrirExplicacion("td", { peldano: "cabina" });
    expect(v.mostradas[1]!.texto).not.toBeNull();
  });
});

describe("la primera vez, presentada", () => {
  it("lo que sale y tiene frase de presentación, se presenta una vez", () => {
    registrarExplicacion(T);
    expect(siguienteQuePresentar()).toBeNull();
    apareceEnPantalla("td");
    expect(siguienteQuePresentar()?.id).toBe("td");
    presentar(T);
    expect(estaPresentada("td")).toBe(true);
    expect(siguienteQuePresentar()).toBeNull();
    // Y si vuelve a salir, ya no.
    apareceEnPantalla("td");
    expect(siguienteQuePresentar()).toBeNull();
  });

  it("lo que no tiene frase de presentación no se presenta", () => {
    registrarExplicacion({ ...T, id: "velocidad", presenta: undefined });
    apareceEnPantalla("velocidad");
    expect(siguienteQuePresentar()).toBeNull();
  });

  it("espera a que sea momento, sin darla por presentada", () => {
    registrarExplicacion(T);
    apareceEnPantalla("td");
    expect(siguienteQuePresentar(() => false)).toBeNull();
    expect(estaPresentada("td")).toBe(false);
    expect(siguienteQuePresentar(() => true)?.id).toBe("td");
  });

  it("sin grabar, se presenta igual pero callada", () => {
    const v = vozDePrueba([]);
    ponerVozDeLasExplicaciones(v);
    registrarExplicacion(T);
    apareceEnPantalla("td");
    expect(presentar(T)).toBe(false);
    expect(v.dichas).toEqual([]);
    expect(estaPresentada("td")).toBe(true);
  });

  it("grabada, la dice", () => {
    const v = vozDePrueba(["explica.td.presenta"]);
    ponerVozDeLasExplicaciones(v);
    registrarExplicacion(T);
    expect(presentar(T)).toBe(true);
    expect(v.dichas).toEqual(["explica.td.presenta"]);
  });
});

describe("las de serie", () => {
  beforeEach(() => ponerLasDeSerie());

  it("tienen sus textos en castellano y en inglés", () => {
    const falta: string[] = [];
    for (const id of DE_SERIE) {
      const e = explicacionDe(id)!;
      for (const k of [e.corta, e.texto, e.presenta, e.enTierra?.texto]) {
        if (!k) continue;
        if (!(k in ES_PY)) falta.push(`es-PY ${k}`);
        if (!(k in EN)) falta.push(`en ${k}`);
      }
    }
    expect(falta).toEqual([]);
  });

  it("y cada dibujo es un svg entero, o uno de la tarjeta de señal", () => {
    for (const id of DE_SERIE) {
      const d = explicacionDe(id)!.dibujo;
      if ("senal" in d) expect(Object.keys(DIBUJOS), id).toContain(d.senal);
      else {
        expect(d.svg.trimStart().startsWith("<svg"), id).toBe(true);
        expect(d.svg.trimEnd().endsWith("</svg>"), id).toBe(true);
      }
    }
  });

  it("y la tarjeta de la presentación es una de las que existen", () => {
    for (const id of DE_SERIE) {
      const tarjeta = explicacionDe(id)!.tarjeta;
      if (tarjeta) expect(Object.keys(DIBUJOS), id).toContain(tarjeta);
    }
  });

  /*
   * **Ninguna pieza del cuadro apunta a una explicación que no existe.** Es
   * el fallo que no se ve: el dedo toca, el registro no la encuentra y no
   * pasa nada, que para quien juega es lo mismo que un botón roto.
   */
  it("y cada pieza del cuadro con `data-explica` tiene la suya, en los seis aviones", () => {
    const huerfanas = new Set<string>();
    const vistas = new Set<string>();
    for (const a of AIRCRAFT) {
      const marcado = new Tablero().markup(a, 4);
      for (const m of marcado.matchAll(/data-explica="([^"]+)"/g)) {
        vistas.add(m[1]!);
        if (!explicacionDe(m[1]!)) huerfanas.add(m[1]!);
      }
    }
    expect([...huerfanas]).toEqual([]);
    // Y están las que pidió Enrique: el arco, el TCAS, el T/D, la senda…
    for (const id of ["arco", "tcas", "td", "tc", "senda", "gs-rodaje", "carta", "altitud", "rumbo", "tren", "flaps", "presurizacion"])
      expect([...vistas], id).toContain(id);
  });

  it("y no se pisan las que alguien ya afinó", () => {
    olvidarTodo();
    registrarExplicacion({ ...T, id: "arco", rotulo: "ARC" });
    ponerLasDeSerie();
    expect(explicacionDe("arco")?.rotulo).toBe("ARC");
  });
});

describe("dónde cae el dedo", () => {
  /** Una pieza de mentira con su caja en la pantalla. */
  const pieza = (id: string, x: number, y: number, w: number, h: number, bajado = false) =>
    ({
      id,
      getBoundingClientRect: () => ({ left: x, top: y, width: w, height: h }),
      closest: (sel: string) => (bajado && sel === ".cuadro--bajado" ? {} : null),
    }) as unknown as Element & { id: string };

  it("gana la más pequeña que contiene el punto: el rombo, no la pantalla", () => {
    const nd = pieza("carta", 0, 0, 300, 300);
    const rombo = pieza("tcas", 100, 100, 12, 12);
    expect(piezaEn([nd, rombo], 105, 105, 0)).toBe(rombo);
    expect(piezaEn([nd, rombo], 200, 200, 0)).toBe(nd);
  });

  it("lo pequeño se busca del tamaño del dedo", () => {
    const rombo = pieza("tcas", 100, 100, 10, 10);
    expect(piezaEn([rombo], 120, 105, 0)).toBeNull();
    expect(piezaEn([rombo], 120, 105, 44)).toBe(rombo);
  });

  it("y lo del cuadro recogido no se toca", () => {
    const luz = pieza("avisos", 0, 0, 100, 20, true);
    expect(piezaEn([luz], 10, 10, 0)).toBeNull();
  });
});
