/**
 * La radio de navegación, con casos medidos a mano: dónde está la estación,
 * qué rumbo lleva el avión, y qué tiene que marcar cada aguja. Ver la
 * cabecera de `radio-de-navegacion.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import {
  EMISORAS,
  MILLA,
  RadioDeCabina,
  centrado,
  declinacionDeLaEstacion,
  emisorasEn,
  leerAdf,
  leerNav,
  lineaDeVistaNm,
  radioDeSalida,
  radiosDe,
  rumboOrtodromico,
  siguienteEmisora,
  type Avion,
  type Emisora,
} from "./radio-de-navegacion";
import type { Estacion } from "../world/radioayudas-publicadas";

/** Una estación de mentira, en el ecuador de la prueba, con la declinación que se le diga. */
function emisora(clase: Estacion["clase"], lat: number, lon: number, mhz: number, declinacion = 0, extra: Partial<Estacion> = {}): Emisora {
  const estacion: Estacion = {
    oaci: "ZZZZ",
    clase,
    id: "ZZ",
    cifra: String(clase === "NDB" ? mhz * 1000 : mhz),
    unidad: clase === "NDB" ? "kHz" : "MHz",
    canal: null,
    idDme: null,
    lat,
    lon,
    pista: null,
    senda: null,
    curso: null,
    rumboVerdadero: null,
    morse: ["–··", "–··"],
    ...extra,
  };
  return { estacion, caja: clase === "NDB" ? "adf" : "nav", mhz, declinacion, declinacionPublicada: true, dme: !!extra.canal };
}

/** Un avión a tres mil pies, con el rumbo verdadero que se diga. */
const avion = (lat: number, lon: number, rumbo: number, pies = 3000): Avion => ({ lat, lon, rumbo, altitud: pies * 0.3048 });

/** Diez millas en grados de latitud. */
const DIEZ_NM = (10 * MILLA) / 111_195;

describe("el ADF apunta a la estación, y nada más", () => {
  const ndb = emisora("NDB", 28 + DIEZ_NM, -16, 0.4);
  const todas = [ndb];

  it("un NDB al norte con rumbo 360 da 000 de relativa", () => {
    const l = leerAdf(0.4, avion(28, -16, 0), undefined, todas);
    expect(l.emisora).toBe(ndb);
    expect(l.relativa).toBeCloseTo(0, 6);
  });

  it("el mismo NDB con rumbo 090 queda a la izquierda: 270", () => {
    expect(leerAdf(0.4, avion(28, -16, 90), undefined, todas).relativa).toBeCloseTo(270, 6);
  });

  it("y con rumbo 180, detrás: 180", () => {
    expect(leerAdf(0.4, avion(28, -16, 180), undefined, todas).relativa).toBeCloseTo(180, 6);
  });

  it("sin la frecuencia de nadie, o fuera de alcance, no hay aguja", () => {
    expect(leerAdf(0.401, avion(28, -16, 0), undefined, todas).relativa).toBeNull();
    expect(leerAdf(0.4, avion(28 - 60 * DIEZ_NM, -16, 0), undefined, todas).emisora).toBeNull();
  });

  it("el FV de Fuerteventura, tocado en la carta a 0,397 MHz, se oye desde veinte millas al sur", () => {
    const fv = emisorasEn("adf", 0.397).find((e) => e.estacion.id === "FV")!;
    expect(fv).toBeDefined();
    const l = leerAdf(0.397, avion(fv.estacion.lat - 2 * DIEZ_NM, fv.estacion.lon, 0));
    expect(l.emisora?.estacion.id).toBe("FV");
    expect(l.relativa).toBeCloseTo(0, 3);
  });
});

describe("el VOR dice en qué radial estás", () => {
  // Una estación a diez millas al este del avión, con el norte verdadero.
  const vor = emisora("VOR/DME", 28, -16 + DIEZ_NM / Math.cos((28 * Math.PI) / 180), 113.0, 0, { canal: "CH 77X" });
  const todas = [vor];
  const aqui = (rumbo: number) => avion(28, -16, rumbo);

  it("un VOR al este te pone en el radial 270, mires a donde mires", () => {
    for (const rumbo of [0, 90, 200, 315]) {
      const l = leerNav(113.0, 270, aqui(rumbo), undefined, todas);
      expect(Math.abs(centrado(l.radial! - 270))).toBeLessThan(0.1);
    }
  });

  it("con el OBS en 270, FROM y la aguja en el centro; con 090, TO y en el centro", () => {
    const from = leerNav(113.0, 270, aqui(0), undefined, todas);
    expect(from.toFrom).toBe("FROM");
    expect(Math.abs(from.desviacion!)).toBeLessThan(0.1);
    const to = leerNav(113.0, 90, aqui(0), undefined, todas);
    expect(to.toFrom).toBe("TO");
    expect(Math.abs(to.desviacion!)).toBeLessThan(0.1);
  });

  it("en el 270: con el OBS en 260 FROM la aguja va a la izquierda; con 080 TO, a la derecha; con 100 TO, a la izquierda", () => {
    // Volando el 260 hacia fuera, el 270 está al norte, a la derecha: el radial elegido queda a la izquierda.
    const from = leerNav(113.0, 260, aqui(0), undefined, todas);
    expect(from.toFrom).toBe("FROM");
    expect(from.desviacion!).toBeCloseTo(-10, 0);
    // Con 080 hacia la estación se llega por el 260, que queda al sur; mirando al 080 el sur es la derecha.
    const to = leerNav(113.0, 80, aqui(0), undefined, todas);
    expect(to.toFrom).toBe("TO");
    expect(to.desviacion!).toBeCloseTo(10, 0);
    // Y con 100 se llega por el 280, que queda al norte: la izquierda.
    expect(leerNav(113.0, 100, aqui(0), undefined, todas).desviacion!).toBeCloseTo(-10, 0);
  });

  it("de través al curso no sabe si TO o FROM: bandera", () => {
    const l = leerNav(113.0, 0, aqui(0), undefined, todas);
    expect(l.bandera).toBe(true);
    expect(l.toFrom).toBeNull();
  });

  it("con la declinación de la estación: 4° W suma cuatro, y el radial al oeste es el 274", () => {
    const conVar = { ...vor, declinacion: 4 };
    const l = leerNav(113.0, 274, aqui(0), undefined, [conVar]);
    expect(l.radial!).toBeCloseTo(274, 0);
    expect(Math.abs(l.desviacion!)).toBeLessThan(0.1);
  });

  it("el DME mide la oblicua: a diez millas y tres mil pies, poco más de diez", () => {
    const l = leerNav(113.0, 270, aqui(0), undefined, todas);
    expect(l.distanciaNm!).toBeGreaterThan(10);
    expect(l.distanciaNm!).toBeLessThan(10.05);
  });

  it("encima de la estación, en el cono, bandera y sin aguja", () => {
    const l = leerNav(113.0, 270, avion(vor.estacion.lat, vor.estacion.lon - 0.002, 0, 5000), undefined, todas);
    expect(l.bandera).toBe(true);
    expect(l.desviacion).toBeNull();
  });

  it("la línea de vista: a mil pies se oye a treinta millas y no a sesenta", () => {
    expect(lineaDeVistaNm(1000)).toBeGreaterThan(40);
    expect(lineaDeVistaNm(1000)).toBeLessThan(46);
    const lejos = (nm: number) => avion(28, vor.estacion.lon - (nm * MILLA) / (111_195 * Math.cos((28 * Math.PI) / 180)), 0, 1000);
    expect(leerNav(113.0, 270, lejos(30), undefined, todas).bandera).toBe(false);
    expect(leerNav(113.0, 270, lejos(60), undefined, todas).emisora).toBeNull();
  });

  it("TFN con su «4° W»: diez millas al este de la antena se está en el 094", () => {
    const tfn = EMISORAS.find((e) => e.estacion.id === "TFN" && e.caja === "nav")!;
    expect(tfn.declinacion).toBe(4);
    const lon = tfn.estacion.lon + DIEZ_NM / Math.cos((tfn.estacion.lat * Math.PI) / 180);
    const l = leerNav(117.7, 94, avion(tfn.estacion.lat, lon, 270, 4000));
    expect(l.emisora?.estacion.id).toBe("TFN");
    expect(l.radial!).toBeCloseTo(94, 0);
    expect(l.toFrom).toBe("FROM");
  });
});

describe("el localizador dice a qué lado queda el eje de la final", () => {
  const inor = EMISORAS.find((e) => e.estacion.id === "INOR")!;
  const rv = inor.estacion.rumboVerdadero!;
  /** Un punto a `nm` millas de la antena, con rumbo `desde` visto desde ella. */
  const en = (nm: number, desde: number, pies = 2500): Avion => {
    const d = (nm * MILLA) / 6371008;
    const f1 = (inor.estacion.lat * Math.PI) / 180;
    const l1 = (inor.estacion.lon * Math.PI) / 180;
    const t = (desde * Math.PI) / 180;
    const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
    return { lat: (f2 * 180) / Math.PI, lon: (l2 * 180) / Math.PI, rumbo: rv, altitud: pies * 0.3048 };
  };

  it("el 12 de Los Rodeos: 114 MAG con 4° W es el 110 verdadero", () => {
    expect(rv).toBeCloseTo(110, 6);
  });

  it("en el eje, centrada y sin TO/FROM; dos grados al norte, la aguja a la derecha", () => {
    const eje = leerNav(108.7, 0, en(8, rv + 180));
    expect(eje.localizador).toBe(true);
    expect(Math.abs(eje.desviacion!)).toBeLessThan(0.01);
    expect(eje.toFrom).toBeNull();
    expect(eje.bandera).toBe(false);
    // Mirando al 110, el norte es la izquierda: el eje queda a la derecha.
    expect(leerNav(108.7, 0, en(8, rv + 182)).desviacion!).toBeCloseTo(2, 3);
  });

  it("el OBS no cuenta en un localizador", () => {
    expect(leerNav(108.7, 45, en(8, rv + 181)).desviacion).toBeCloseTo(leerNav(108.7, 300, en(8, rv + 181)).desviacion!, 9);
  });

  it("fuera de su sector, o a treinta millas, no se oye", () => {
    expect(leerNav(108.7, 0, en(8, rv + 180 + 50)).emisora).toBeNull();
    expect(leerNav(108.7, 0, en(30, rv + 180, 8000)).emisora).toBeNull();
    expect(leerNav(108.7, 0, en(20, rv + 180 + 20, 8000)).emisora).toBeNull();
    expect(leerNav(108.7, 0, en(20, rv + 180 + 5, 8000)).emisora).not.toBeNull();
  });

  it("de tres localizadores en 111.3, el que se oye es el cercano: IFA cerca de Fuerteventura", () => {
    expect(emisorasEn("nav", 111.3).map((e) => e.estacion.id).sort()).toEqual(["ICES", "IFA", "IMCL"]);
    const ifa = EMISORAS.find((e) => e.estacion.id === "IFA")!;
    const r = ifa.estacion.rumboVerdadero!;
    const a = { ...en(0, 0), lat: ifa.estacion.lat, lon: ifa.estacion.lon };
    // A cinco millas por detrás de la antena del 19, por donde se llega a la 19: hacia el norte.
    const b = { ...a, lat: a.lat + (5 * MILLA * Math.cos(((r + 180) * Math.PI) / 180)) / 111_195 };
    expect(leerNav(111.3, 0, b).emisora?.estacion.id).toBe("IFA");
  });
});

describe("las estaciones del juego", () => {
  it("la declinación publicada si el AIP la da, y la del WMM si no: VAS, unos quince al oeste", () => {
    const tfn = EMISORAS.find((e) => e.estacion.id === "TFN")!;
    expect(declinacionDeLaEstacion(tfn.estacion, 2026.9)).toEqual({ grados: 4, publicada: true });
    const vas = EMISORAS.find((e) => e.estacion.id === "VAS")!;
    const d = declinacionDeLaEstacion(vas.estacion, 2026.9);
    expect(d.publicada).toBe(false);
    expect(d.grados).toBeGreaterThan(10);
    expect(d.grados).toBeLessThan(20);
  });

  it("al salir, en la NAV el VOR del campo y en el ADF su NDB", () => {
    expect(radioDeSalida("GCXO").nav?.estacion.id).toBe("TFN");
    expect(radioDeSalida("GCXO").adf).toBeNull();
    expect(radioDeSalida("SGAS").nav?.estacion.id).toBe("VAS");
    expect(radioDeSalida("GCFV").nav?.estacion.id).toBe("FTV");
    expect(radioDeSalida("GCFV").adf?.estacion.id).toBe("FV");
    expect(radioDeSalida("GCHI").nav).toBeNull();
    expect(radioDeSalida("GCHI").adf?.estacion.id).toBe("HIE");
    expect(radioDeSalida("SGCO").adf?.estacion.id).toBe("CON");
    expect(radioDeSalida(null)).toEqual({ nav: null, adf: null });
  });

  it("el mando de la cabina pasa a la siguiente más cercana y vuelve a empezar", () => {
    const tfn = EMISORAS.find((e) => e.estacion.id === "TFN")!;
    const desde = { lat: tfn.estacion.lat, lon: tfn.estacion.lon };
    const primera = siguienteEmisora("nav", null, desde)!;
    expect(primera.estacion.id).toBe("TFN");
    const vistas = new Set<string>();
    let puesta: number | null = null;
    for (let i = 0; i < 8; i++) {
      const s: Emisora = siguienteEmisora("nav", puesta, desde)!;
      vistas.add(s.estacion.id);
      puesta = s.mhz;
    }
    expect(vistas.size).toBeGreaterThan(3);
    expect(siguienteEmisora("adf", null, desde)!.caja).toBe("adf");
  });

  it("la ortodrómica: de Asunción a Encarnación, al sureste", () => {
    const r = rumboOrtodromico({ lat: -25.24, lon: -57.52 }, { lat: -27.23, lon: -55.84 });
    expect(r).toBeGreaterThan(130);
    expect(r).toBeLessThan(150);
  });
});

describe("qué lleva cada avión", () => {
  it("no falta ninguno de la flota, y el biplano agrícola no lleva nada", () => {
    for (const a of AIRCRAFT) expect(radiosDe(a), a.id).toBeDefined();
    expect(radiosDe({ id: "jaz-25" })).toEqual({ nav: false, adf: false });
    expect(radiosDe({ id: "jaz-20" })).toEqual({ nav: true, adf: true });
    for (const a of AIRCRAFT.filter((x) => x.id !== "jaz-25")) expect(radiosDe(a).nav, a.id).toBe(true);
  });
});

describe("la radio de la cabina", () => {
  const tfn = EMISORAS.find((e) => e.estacion.id === "TFN")!;
  // En la plataforma de Los Rodeos, más o menos: al oeste de TFN.
  const enLaPlataforma: Avion = { lat: 28.4826, lon: -16.3415, altitud: 640, rumbo: 120 };

  it("al salir de Los Rodeos, TFN en la NAV y el OBS en el radial donde se está, con la aguja en el centro", () => {
    const r = new RadioDeCabina({ nav: true, adf: true });
    r.alSalir("GCXO", { ...enLaPlataforma, altitud: 1500 });
    expect(r.navMhz).toBeCloseTo(tfn.mhz, 6);
    expect(r.adfMhz).toBeNull();
    const l = r.leer({ ...enLaPlataforma, altitud: 1500 }).nav!.lectura;
    expect(l.toFrom).toBe("FROM");
    expect(Math.abs(l.desviacion!)).toBeLessThan(1);
  });

  it("el biplano no pone nada, ni desde la carta", () => {
    const r = new RadioDeCabina(radiosDe({ id: "jaz-25" }));
    r.alSalir("GCXO", enLaPlataforma);
    expect(r.poner("nav", 117.7)).toBe(false);
    expect(r.leer(enLaPlataforma)).toEqual({ nav: null, adf: null });
  });

  it("un localizador tocado en la carta pone el OBS en su curso: INOR, 114", () => {
    const r = new RadioDeCabina({ nav: true, adf: false });
    expect(r.poner("nav", 108.7)).toBe(true);
    expect(r.curso).toBe(114);
    expect(r.poner("adf", 0.397)).toBe(false);
  });

  it("lo puesto a mano no lo pisa la salida, y cambiar de avión lo borra", () => {
    const r = new RadioDeCabina({ nav: true, adf: true });
    r.poner("nav", 116.2);
    r.girarCurso(-3);
    const curso = r.curso;
    r.alSalir("GCXO", enLaPlataforma);
    expect(r.navMhz).toBeCloseTo(116.2, 6);
    expect(r.curso).toBe(curso);
    r.cambiarDeAvion({ nav: true, adf: true });
    r.alSalir("GCXO", enLaPlataforma);
    expect(r.navMhz).toBeCloseTo(117.7, 6);
  });

  it("el OBS da la vuelta: de 360 a 001 y de 001 a 360", () => {
    const r = new RadioDeCabina({ nav: true, adf: false });
    r.curso = 360;
    r.girarCurso(1);
    expect(r.curso).toBe(1);
    r.girarCurso(-1);
    expect(r.curso).toBe(360);
  });
});
