/**
 * **La Cruz del Sur, sin navegador**: que el cielo sea el de verdad y que se gane siempre.
 * Ver `flight/cruz-del-sur.ts`.
 */
import { describe, expect, it } from "vitest";
import FICHA from "../../data/cielo/estrellas.json";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import {
  alturaYAcimut,
  aplicar,
  cieloDe,
  CRUZ_DEL_SUR,
  GRADO,
  mundoDesdeJ2000,
  PUNTEROS_DE_CENTAURO,
  unitario,
} from "../world/cielo-de-noche";
import {
  aPantalla,
  DICHO_DE_LA_CRUZ,
  DURA_EL_FINAL,
  EN_EL_CIELO,
  EN_EL_DIBUJO,
  EN_EL_PLANO,
  enElCielo,
  enElPlano,
  entre,
  FIN_DEL_BRAZO,
  HORIZONTE,
  INSTANTE_DEL_CIELO,
  JuegoDeLaCruz,
  LA_CRUZ,
  LARGO_DEL_BRAZO,
  LAS_SEIS,
  LINEAS_DE_LA_CRUZ,
  LO_QUE_SE_QUEDA_DEL_POLO,
  LOS_PUNTEROS,
  loQuePasanLosPunterosDe,
  POLO_SUR,
  SITIO_DEL_CIELO,
  vistaDelSur,
  vistaEntre,
  vistaParaTocar,
  type EstrellaDelJuego,
} from "./cruz-del-sur";
import { PELDANOS } from "./escalera";
import { JUEGOS_DE_LA_CONSOLA, JUEGOS_DEL_KIT, KitDeViaje, LO_QUE_HAY, LO_QUE_HAY_EN_LA_CONSOLA } from "./kit-de-viaje";

/** Horas, minutos y segundos a grados: como los dan los catálogos. */
const ar = (h: number, m: number, s: number): number => (h + m / 60 + s / 3600) * 15;
const dec = (g: number, m: number, s: number): number => -(g + m / 60 + s / 3600);

/**
 * **Hipparcos, la reducción de van Leeuwen (2007)**, que no es de donde salieron las del
 * juego: A&A 474(2), 653–664, con las coordenadas J2000 que citan sus fichas. Ver
 * `docs/historias/fuentes.md`.
 */
const HIPPARCOS = {
  acrux: { ra: ar(12, 26, 35.89522), dec: dec(63, 5, 56.7343) },
  mimosa: { ra: ar(12, 47, 43.26877), dec: dec(59, 41, 19.5792) },
  gacrux: { ra: ar(12, 31, 9.96), dec: dec(57, 6, 47.57) },
  delta: { ra: ar(12, 15, 8.71673), dec: dec(58, 44, 56.1369) },
  alfa: { ra: ar(14, 39, 36.494), dec: dec(60, 50, 2.3737) },
  beta: { ra: ar(14, 3, 49.40535), dec: dec(60, 22, 22.9266) },
} as const;

const DEL_JUEGO = {
  ...CRUZ_DEL_SUR,
  alfa: PUNTEROS_DE_CENTAURO.alfa,
  beta: PUNTEROS_DE_CENTAURO.beta,
} as const;

/** La más cercana del catálogo Yale del juego: `data/cielo/estrellas.json`. */
function enElCatalogo(ra: number, dc: number): { readonly d: number; readonly v: number } {
  const e = FICHA.estrellas as readonly number[];
  const y = unitario(ra, dc);
  let mejor = { d: Infinity, v: 0 };
  for (let i = 0; i + 3 < e.length; i += 4) {
    const d = entre(y, unitario(e[i]! / 100, e[i + 1]! / 100));
    if (d < mejor.d) mejor = { d, v: e[i + 2]! / 100 };
  }
  return mejor;
}

describe("las estrellas, contra los catálogos", () => {
  for (const e of LAS_SEIS) {
    it(`${e}: a menos de un minuto de arco de Hipparcos, y en el catálogo del juego`, () => {
      const nuestra = DEL_JUEGO[e];
      const suya = HIPPARCOS[e];
      expect(entre(unitario(nuestra.ra, nuestra.dec), unitario(suya.ra, suya.dec))).toBeLessThan(1 / 60);
      expect(enElCatalogo(nuestra.ra, nuestra.dec).d).toBeLessThan(0.02);
    });
  }

  it("con el brillo que tienen", () => {
    expect(enElCatalogo(DEL_JUEGO.alfa.ra, DEL_JUEGO.alfa.dec).v).toBeCloseTo(-0.01, 2);
    expect(enElCatalogo(DEL_JUEGO.beta.ra, DEL_JUEGO.beta.dec).v).toBeCloseTo(0.61, 2);
    expect(enElCatalogo(DEL_JUEGO.delta.ra, DEL_JUEGO.delta.dec).v).toBeCloseTo(2.8, 2);
  });
});

describe("el cielo que se enseña: Asunción, el 6 de febrero de 2027 a las 04:20", () => {
  const donde = (e: EstrellaDelJuego) => alturaYAcimut(EN_EL_CIELO[e]);
  const c = cieloDe(INSTANTE_DEL_CIELO, SITIO_DEL_CIELO.lat, SITIO_DEL_CIELO.lon);

  it("es Asunción, a 25° S, y las 04:20 de allí, que va con UTC−3", () => {
    expect(SITIO_DEL_CIELO.lat).toBeCloseTo(-25.26, 2);
    expect(SITIO_DEL_CIELO.lon).toBeCloseTo(-57.58, 2);
    expect(INSTANTE_DEL_CIELO.toISOString()).toBe("2027-02-06T07:20:00.000Z");
  });

  it("noche cerrada: el Sol, más de dieciocho grados bajo el horizonte, y sin Luna", () => {
    expect(alturaYAcimut(c.sol).altura).toBeLessThan(-18);
    expect(alturaYAcimut(c.luna).altura).toBeLessThan(0);
    expect(c.fase).toBeLessThan(0.02);
  });

  it("la Cruz, en lo más alto y de pie sobre el sur, con la altura de verdad", () => {
    expect(donde("gacrux").altura).toBeCloseTo(58.0, 0);
    expect(donde("acrux").altura).toBeCloseTo(52.0, 0);
    expect(donde("mimosa").altura).toBeCloseTo(55.3, 0);
    expect(donde("delta").altura).toBeCloseTo(56.2, 0);
    // Lo que da la declinación y la latitud a mano, en el meridiano: 90 − |δ − φ|.
    const culmina = 90 - Math.abs(CRUZ_DEL_SUR.gacrux.dec - SITIO_DEL_CIELO.lat);
    expect(donde("gacrux").altura).toBeLessThan(culmina + 0.5);
    expect(donde("gacrux").altura).toBeGreaterThan(culmina - 0.5);
    expect(Math.abs(donde("gacrux").acimut - 180)).toBeLessThan(1);
  });

  it("los punteros, a su izquierda, que mirando al sur es el este", () => {
    expect(donde("alfa").acimut).toBeLessThan(170);
    expect(EN_EL_PLANO.alfa.x).toBeLessThan(EN_EL_PLANO.mimosa.x);
    expect(EN_EL_PLANO.beta.x).toBeLessThan(EN_EL_PLANO.mimosa.x);
    expect(EN_EL_PLANO.alfa.x).toBeLessThan(EN_EL_PLANO.beta.x);
  });

  it("y de pie como de pie se ve: Gácrux arriba, Ácrux abajo, Mimosa al este y Delta al oeste", () => {
    expect(EN_EL_PLANO.gacrux.y).toBeGreaterThan(EN_EL_PLANO.acrux.y);
    expect(EN_EL_PLANO.mimosa.x).toBeLessThan(EN_EL_DIBUJO.cruce.x);
    expect(EN_EL_PLANO.delta.x).toBeGreaterThan(EN_EL_DIBUJO.cruce.x);
  });

  it("el polo sur del cielo está a la altura de la latitud, sobre el sur", () => {
    const polo = alturaYAcimut(enElCielo(POLO_SUR));
    expect(polo.altura).toBeCloseTo(Math.abs(SITIO_DEL_CIELO.lat), 2);
    expect(polo.acimut).toBeCloseTo(180, 1);
  });

  it("el horizonte del dibujo es el de altura cero de la misma cuenta", () => {
    const enElHorizonte = (acimut: number) => {
      const a = acimut * GRADO;
      return enElPlano([Math.sin(a), 0, -Math.cos(a)])!;
    };
    for (const a of [150, 180, 210]) expect(enElHorizonte(a).y).toBeCloseTo(HORIZONTE, 6);
    expect(EN_EL_DIBUJO.sur.y).toBe(HORIZONTE);
    // Y la columna del sur es la del polo, que es la del meridiano.
    expect(EN_EL_DIBUJO.sur.x).toBeCloseTo(enElHorizonte(180).x, 3);
  });

  it("todo lo del dibujo sale de la cuenta y no de otro sitio", () => {
    const m = mundoDesdeJ2000(INSTANTE_DEL_CIELO, SITIO_DEL_CIELO.lat, SITIO_DEL_CIELO.lon);
    const g = aplicar(m, unitario(CRUZ_DEL_SUR.gacrux.ra, CRUZ_DEL_SUR.gacrux.dec));
    expect(enElPlano(g)!.x).toBeCloseTo(EN_EL_PLANO.gacrux.x, 9);
    expect(enElPlano(g)!.y).toBeCloseTo(EN_EL_PLANO.gacrux.y, 9);
  });
});

describe("el brazo alargado cuatro veces y media", () => {
  it("mide seis grados, de Gácrux a Ácrux", () => {
    expect(LARGO_DEL_BRAZO).toBeCloseTo(6.01, 2);
  });

  it("cae a menos de cinco grados del polo sur: la cifra real, 2,68", () => {
    expect(LO_QUE_SE_QUEDA_DEL_POLO).toBeLessThan(5);
    expect(LO_QUE_SE_QUEDA_DEL_POLO).toBeCloseTo(2.68, 2);
  });

  it("y no es que sea poco alargarlo: el arco nunca se acerca más de 2,6 grados", () => {
    // Es lo que tiene de regla: no pasa por el polo a ninguna distancia. Se mira cada décima de vez.
    const g = unitario(CRUZ_DEL_SUR.gacrux.ra, CRUZ_DEL_SUR.gacrux.dec);
    const a = unitario(CRUZ_DEL_SUR.acrux.ra, CRUZ_DEL_SUR.acrux.dec);
    const t = Math.acos(g[0] * a[0] + g[1] * a[1] + g[2] * a[2]);
    let menor = Infinity;
    for (let k = 2; k < 9; k += 0.1) {
      const [p, q] = [Math.sin(t * (1 - k)) / Math.sin(t), Math.sin(t * k) / Math.sin(t)];
      menor = Math.min(menor, entre([g[0] * p + a[0] * q, g[1] * p + a[1] * q, g[2] * p + a[2] * q], POLO_SUR));
    }
    expect(menor).toBeGreaterThan(2.6);
    expect(LO_QUE_SE_QUEDA_DEL_POLO - menor).toBeLessThan(0.1);
  });

  it("el aro del polo tiene dentro el final de la línea, que no se fuerza", () => {
    const d = EN_EL_DIBUJO;
    expect(Math.hypot(d.fin.x - d.polo.x, d.fin.y - d.polo.y)).toBeLessThan(d.radioDelPolo);
    expect(entre(FIN_DEL_BRAZO, POLO_SUR)).toBeGreaterThan(2);
  });

  it("sobre una recta del plano, que es por lo que se puede dibujar recta", () => {
    const [a, f] = [EN_EL_PLANO.acrux, EN_EL_DIBUJO.fin];
    const g = EN_EL_PLANO.gacrux;
    const cruz = (p: { x: number; y: number }) => ((p.x - a.x) * (f.y - a.y) - (p.y - a.y) * (f.x - a.x)) / Math.hypot(f.x - a.x, f.y - a.y);
    expect(Math.abs(cruz(g))).toBeLessThan(1e-9);
    for (const m of EN_EL_DIBUJO.marcas) expect(Math.abs(cruz(m))).toBeLessThan(1e-9);
  });

  it("y los punteros señalan a la Cruz de verdad: su línea pasa a un grado de Gácrux", () => {
    const g = unitario(CRUZ_DEL_SUR.gacrux.ra, CRUZ_DEL_SUR.gacrux.dec);
    const pasa = loQuePasanLosPunterosDe(g);
    expect(pasa.grados).toBeLessThan(1.2);
    expect(pasa.veces).toBeGreaterThan(3);
  });
});

/** Todas las maneras de ordenar. */
function ordenes<T>(lista: readonly T[]): T[][] {
  if (lista.length <= 1) return [[...lista]];
  return lista.flatMap((x, i) => ordenes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((r) => [x, ...r]));
}

/** Hasta el final de la animación. */
const acabar = (j: JuegoDeLaCruz): void => {
  for (let t = 0; t < DURA_EL_FINAL + 1; t += 0.1) j.paso(0.1, true);
};

describe("se gana siempre", () => {
  it("cualquier orden de los cuatro completa la Cruz: los veinticuatro", () => {
    const todas = ordenes(LA_CRUZ);
    expect(todas).toHaveLength(24);
    for (const orden of todas) {
      const j = new JuegoDeLaCruz("dibujo");
      for (const e of orden) {
        expect(j.terminado).toBe(false);
        j.tocar(e);
      }
      acabar(j);
      expect(j.terminado, orden.join()).toBe(true);
      expect(j.estado.punto).toBe(1);
      expect(j.estado.tocadas).toEqual(orden);
    }
  });

  it("con los punteros, cualquier orden de los seis: los setecientos veinte", () => {
    const todas = ordenes(LAS_SEIS);
    expect(todas).toHaveLength(720);
    for (const orden of todas) {
      const j = new JuegoDeLaCruz("cifra");
      for (const e of orden) j.tocar(e);
      acabar(j);
      expect(j.terminado, orden.join()).toBe(true);
    }
  });

  it("un toque en otra parte no cambia nada malo: ni tocadas, ni fallos, ni final", () => {
    const j = new JuegoDeLaCruz("dibujo");
    j.tocar("gacrux");
    const antes = JSON.stringify(j.estado);
    j.tocarOtraCosa();
    j.tocarOtraCosa();
    expect(JSON.stringify(j.estado)).toBe(antes);
    expect(j.faltan).toEqual(["acrux", "mimosa", "delta"]);
    // Sigue pudiéndose acabar sin más.
    for (const e of ["delta", "mimosa", "acrux"] as const) j.tocar(e);
    acabar(j);
    expect(j.terminado).toBe(true);
  });

  it("tocar dos veces la misma no cuenta dos, ni la deja sin tocar", () => {
    const j = new JuegoDeLaCruz("dibujo");
    j.tocar("acrux");
    j.tocar("acrux");
    expect(j.estado.tocadas).toEqual(["acrux"]);
  });

  it("sin reloj: se puede tardar lo que sea, y no se acaba ni se pierde nada", () => {
    const j = new JuegoDeLaCruz("dibujo");
    for (let t = 0; t < 3600; t++) j.paso(1, true);
    expect(j.terminado).toBe(false);
    expect(j.estado.tocadas).toEqual([]);
    expect(j.faltan).toHaveLength(4);
  });

  it("si tarda, la mano señala la que falta, y al tocar se va", () => {
    const j = new JuegoDeLaCruz("dibujo");
    expect(j.estado.mano).toBeNull();
    for (let t = 0; t < 8; t += 0.5) j.paso(0.5, true);
    expect(j.estado.mano).toBeNull();
    for (let t = 0; t < 2; t += 0.5) j.paso(0.5, true);
    expect(j.estado.mano).toBe("gacrux");
    j.tocar("gacrux");
    expect(j.estado.mano).toBeNull();
    for (let t = 0; t < 10; t += 0.5) j.paso(0.5, true);
    expect(j.estado.mano).toBe("acrux");
  });

  it("y a quien toca sin dar, antes: el cielo vacío a la tercera", () => {
    const j = new JuegoDeLaCruz("dibujo");
    for (let i = 0; i < 3; i++) j.tocarOtraCosa();
    j.paso(0.1, true);
    expect(j.estado.mano).toBe("gacrux");
  });

  it("mientras no está quieto nada, el estado no cambia: el dibujo no repinta", () => {
    const j = new JuegoDeLaCruz("dibujo");
    j.tocar("gacrux");
    for (let t = 0; t < 2; t += 0.1) j.paso(0.1, true);
    const quieto = JSON.stringify(j.estado);
    for (let t = 0; t < 5; t += 0.1) j.paso(0.1, true);
    expect(JSON.stringify(j.estado)).toBe(quieto);
  });

  it("el final no espera a nadie: acaba callada o no", () => {
    const j = new JuegoDeLaCruz("dibujo");
    for (const e of LA_CRUZ) j.tocar(e);
    for (let t = 0; t < DURA_EL_FINAL + 1; t += 0.1) j.paso(0.1, false);
    expect(j.terminado).toBe(true);
  });
});

describe("por peldaños", () => {
  it("los punteros, solo en Taguato y Taguato Ruvicha", () => {
    const es = (p: (typeof PELDANOS)[number]) => new JuegoDeLaCruz(p).estado.conPunteros;
    expect(es("dibujo")).toBe(false);
    expect(es("palabra")).toBe(false);
    expect(es("cifra")).toBe(true);
    expect(es("cabina")).toBe(true);
  });

  it("los nombres, solo en Taguato Ruvicha", () => {
    expect(PELDANOS.map((p) => new JuegoDeLaCruz(p).estado.conNombres)).toEqual([false, false, false, true]);
  });

  it("abajo no hay nada que leer: ni cifras, ni nombres, ni letra", () => {
    for (const p of ["dibujo", "palabra"] as const) {
      const e = new JuegoDeLaCruz(p).estado;
      expect(e.conCifras).toBe(false);
      expect(e.conNombres).toBe(false);
    }
  });

  it("abajo, tocar un puntero no hace nada; arriba, sin ellos no se acaba", () => {
    const abajo = new JuegoDeLaCruz("dibujo");
    abajo.tocar("alfa");
    expect(abajo.estado.tocadas).toEqual([]);
    for (const e of LA_CRUZ) abajo.tocar(e);
    acabar(abajo);
    expect(abajo.terminado).toBe(true);

    const arriba = new JuegoDeLaCruz("cifra");
    for (const e of LA_CRUZ) arriba.tocar(e);
    acabar(arriba);
    expect(arriba.terminado).toBe(false);
    expect(arriba.faltan).toEqual(LOS_PUNTEROS);
  });
});

describe("lo que dice", () => {
  const dichas = (j: JuegoDeLaCruz): string[] => j.tomarLoQueDecir().map((l) => l.clave);

  it("al abrir, adónde mira y qué hacer; y en el orden de verlo", () => {
    expect(dichas(new JuegoDeLaCruz("dibujo"))).toEqual([DICHO_DE_LA_CRUZ.explica.clave, DICHO_DE_LA_CRUZ.empezar.clave]);
  });

  it("si se quitó la explicación, callada; y el botón, desde la segunda vez", () => {
    const j = new JuegoDeLaCruz("dibujo", { explicar: false, ofrecerQuitarla: false });
    expect(dichas(j)).toEqual([]);
    expect(new JuegoDeLaCruz("dibujo", { explicar: true, ofrecerQuitarla: true }).estado.ofreceNoExplicar).toBe(true);
    expect(new JuegoDeLaCruz("dibujo", { explicar: true, ofrecerQuitarla: false }).estado.ofreceNoExplicar).toBe(false);
  });

  it("al completar, abajo: una de Ara y el dato del sur", () => {
    const j = new JuegoDeLaCruz("dibujo");
    dichas(j);
    for (const e of LA_CRUZ) j.tocar(e);
    expect(dichas(j)).toEqual([DICHO_DE_LA_CRUZ.encendida.clave, DICHO_DE_LA_CRUZ.sur.clave]);
  });

  it("quien acaba antes de que Ara acabe de contar: lo de tocar ya no viene a cuento", () => {
    const j = new JuegoDeLaCruz("cifra");
    // Lo de abrir ya está en la cola de la conversación, y puede que sin sonar: que la escena lo quite.
    dichas(j);
    j.tocar("alfa");
    for (const e of ["beta", ...LA_CRUZ] as const) j.tocar(e);
    expect(j.tomarLoQueSobra()).toEqual([DICHO_DE_LA_CRUZ.explica.clave, DICHO_DE_LA_CRUZ.empezar.clave, DICHO_DE_LA_CRUZ.punteros.clave]);
    expect(j.tomarLoQueSobra()).toEqual([]);
    // Y lo de los punteros, que este juego no llegó a soltar, tampoco sale.
    expect(dichas(j)).toEqual([DICHO_DE_LA_CRUZ.encendida.clave, DICHO_DE_LA_CRUZ.sur.clave, DICHO_DE_LA_CRUZ.navegantes.clave]);
  });

  it("y arriba, los punteros una vez, y al acabar lo de los navegantes", () => {
    const j = new JuegoDeLaCruz("cifra");
    dichas(j);
    j.tocar("alfa");
    expect(dichas(j)).toEqual([DICHO_DE_LA_CRUZ.punteros.clave]);
    j.tocar("beta");
    for (const e of LA_CRUZ) j.tocar(e);
    expect(dichas(j)).toEqual([DICHO_DE_LA_CRUZ.encendida.clave, DICHO_DE_LA_CRUZ.sur.clave, DICHO_DE_LA_CRUZ.navegantes.clave]);
  });

  it("ninguna frase con género, de vos, y con su texto en los dos idiomas; ocho nuevas como mucho", () => {
    const todas = [...LINEAS_DE_LA_CRUZ, LO_QUE_HAY_EN_LA_CONSOLA];
    expect(todas.length).toBeLessThanOrEqual(8);
    for (const l of todas) {
      const es = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(es, l.clave).toBeTruthy();
      expect(EN[l.clave as keyof typeof EN], l.clave).toBeTruthy();
      expect(l.quien).toBe("ara");
      expect(es, l.clave).not.toMatch(/\b(tú|tienes|puedes|quieres|cansad|dormid|content|emocionad|encendid)[ao]s?\b/i);
    }
  });
});

describe("cómo cabe", () => {
  /** La hoja de cada pantalla, medida en el banco: portátil, tablet, teléfono tumbado y de pie. */
  const HOJAS = [
    { nombre: "portátil", w: 754, h: 400 },
    { nombre: "tablet", w: 754, h: 400 },
    { nombre: "teléfono tumbado", w: 500, h: 266 },
    { nombre: "teléfono de pie", w: 320, h: 480 },
  ];

  for (const hoja of HOJAS)
    for (const conPunteros of [false, true])
      it(`${hoja.nombre}, ${conPunteros ? "con" : "sin"} punteros: dianas de 44 px, dentro y sin pisarse`, () => {
        const v = vistaParaTocar(hoja.w, hoja.h, conPunteros);
        const ids = conPunteros ? LAS_SEIS : LA_CRUZ;
        const pos = ids.map((e) => aPantalla(v, hoja.w, hoja.h, EN_EL_PLANO[e]));
        for (const p of pos) {
          expect(p.x).toBeGreaterThanOrEqual(22);
          expect(p.x).toBeLessThanOrEqual(hoja.w - 22);
          expect(p.y).toBeGreaterThanOrEqual(22);
          expect(p.y).toBeLessThanOrEqual(hoja.h - 22);
        }
        for (let i = 0; i < pos.length; i++)
          for (let k = i + 1; k < pos.length; k++)
            expect(Math.hypot(pos[i]!.x - pos[k]!.x, pos[i]!.y - pos[k]!.y), `${ids[i]}–${ids[k]}`).toBeGreaterThanOrEqual(44);
      });

  for (const hoja of HOJAS)
    it(`${hoja.nombre}: de lejos caben Gácrux, el horizonte, el sur y los punteros`, () => {
      const v = vistaDelSur(hoja.w, hoja.h);
      const de = (p: { x: number; y: number }) => aPantalla(v, hoja.w, hoja.h, p);
      expect(de(EN_EL_PLANO.gacrux).y).toBeGreaterThan(8);
      const sur = de(EN_EL_DIBUJO.sur);
      expect(sur.y).toBeLessThan(hoja.h - 40);
      expect(sur.x).toBeCloseTo(hoja.w / 2, 3);
      expect(de(EN_EL_PLANO.alfa).x).toBeGreaterThan(8);
      expect(de(EN_EL_PLANO.delta).x).toBeLessThan(hoja.w - 8);
    });

  it("entre el cerca y el lejos, los dos extremos son los dos encuadres", () => {
    const a = vistaParaTocar(754, 400, true);
    const b = vistaDelSur(754, 400);
    expect(vistaEntre(a, b, 0)).toEqual(a);
    expect(vistaEntre(a, b, 1)).toEqual(b);
    const m = vistaEntre(a, b, 0.5);
    expect(m.f).toBeLessThan(a.f);
    expect(m.f).toBeGreaterThan(b.f);
  });
});

describe("en el kit", () => {
  const conCruz = (): KitDeViaje => {
    const k = new KitDeViaje();
    k.conLaCruz = true;
    k.peldanoDeQuienJuega = "cifra";
    k.dar();
    k.abrir();
    return k;
  };

  it("en «Viajá con Jazlyn» el kit no cambia: dos juegos, y la Cruz no se abre", () => {
    expect(JUEGOS_DEL_KIT).toEqual(["luz", "avion"]);
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    expect(k.juegos).toEqual(["luz", "avion"]);
    expect(k.tomarLoQueDecir().map((l) => l.clave)).toEqual([LO_QUE_HAY.clave]);
    k.elegir("cruz");
    expect(k.juegoDeAhora).toBeNull();
  });

  it("en la consola son tres, y se dice que son tres", () => {
    expect(JUEGOS_DE_LA_CONSOLA).toEqual(["luz", "avion", "cruz"]);
    const k = conCruz();
    expect(k.juegos).toEqual(JUEGOS_DE_LA_CONSOLA);
    expect(k.tomarLoQueDecir().map((l) => l.clave)).toEqual([LO_QUE_HAY_EN_LA_CONSOLA.clave]);
    k.elegir("cruz");
    expect(k.juegoDeAhora).toBeInstanceOf(JuegoDeLaCruz);
    // Con el peldaño de quien juega, no el de la escena.
    expect((k.juegoDeAhora as JuegoDeLaCruz).conPunteros).toBe(true);
  });

  it("con el mismo mecanismo: la megafonía lo pausa, y mientras tanto ni corre ni se toca", () => {
    const k = conCruz();
    k.elegir("cruz");
    const j = k.juegoDeAhora as JuegoDeLaCruz;
    let pared = 0;
    const paso = (megafonia: boolean): void => {
      pared += 0.1;
      k.paso(0.1, { megafonia, callada: true, pared });
    };
    paso(false);
    for (const e of LAS_SEIS) j.tocar(e);
    paso(false);
    paso(false);
    const antes = JSON.stringify(j.estado);
    for (let i = 0; i < 20; i++) paso(true);
    expect(k.estado.pausado).toBe(true);
    expect(k.juego).toBeNull();
    expect(JSON.stringify(j.estado)).toBe(antes);
    paso(false);
    paso(false);
    expect(JSON.stringify(j.estado)).not.toBe(antes);
  });

  it("y se recoge igual que los otros: se cierra y ya no se abre", () => {
    const k = conCruz();
    k.elegir("cruz");
    k.recoger();
    expect(k.estado.recogido).toBe(true);
    expect(k.estaAbierto).toBe(false);
    k.abrir();
    expect(k.estaAbierto).toBe(false);
  });

  it("volver a él sigue por donde iba y no cuenta otra vez la explicación", () => {
    let veces = 0;
    const k = conCruz();
    k.explicacionDeLaCruz = {
      alAbrir: () => {
        veces++;
        return { explicar: true, ofrecerQuitarla: veces >= 2 };
      },
      quitar: () => {},
    };
    k.elegir("cruz");
    const j = k.juegoDeAhora as JuegoDeLaCruz;
    j.tocar("gacrux");
    k.cerrar();
    k.abrir();
    k.elegir("cruz");
    expect(k.juegoDeAhora).toBe(j);
    expect(veces).toBe(1);
    k.volverAElegir();
    k.elegir("cruz");
    expect(veces).toBe(2);
    expect((k.juegoDeAhora as JuegoDeLaCruz).estado.ofreceNoExplicar).toBe(true);
  });

  it("«no volver a explicar» se guarda, se va el botón y se avisa a la escena", () => {
    let quitada = false;
    const k = conCruz();
    k.explicacionDeLaCruz = {
      alAbrir: () => ({ explicar: !quitada, ofrecerQuitarla: true }),
      quitar: () => {
        quitada = true;
      },
    };
    k.elegir("cruz");
    k.noExplicarLaCruz();
    expect(quitada).toBe(true);
    expect((k.juegoDeAhora as JuegoDeLaCruz).estado.ofreceNoExplicar).toBe(false);
    expect(k.tomarLoQueSobra()).toEqual([DICHO_DE_LA_CRUZ.explica.clave]);
    expect(k.tomarLoQueSobra()).toEqual([]);
  });
});
