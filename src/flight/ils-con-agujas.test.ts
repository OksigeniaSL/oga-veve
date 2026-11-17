/**
 * **«Aterrizar con las agujas», en la mesa**: la senda de planeo de la radio,
 * medida a mano contra su escala, y el ejercicio entero volado por un piloto
 * de prueba con la radio de verdad (`leerNav` y su `senda`) y un avión de
 * cinemática —rumbo, la verdadera, giros de régimen estándar como mucho, el
 * ritmo de bajada que se pida y el viento que lo empuja—, sin navegador.
 *
 * Lo que tiene que salir: que las dos agujas dicen lo que tienen que decir,
 * en puntos y con la escala de verdad —el localizador a tope a 2,5°, la senda
 * a 0,24 veces su ángulo—; que la senda tiene bandera fuera de sus diez
 * millas, de sus ocho grados y por encima de 1,75 veces su ángulo; que su
 * frecuencia es la emparejada con la del localizador en cada ILS del juego;
 * y que quien sigue las dos agujas con el alisio de costado llega a los
 * mínimos dentro de un punto, y quien llega fuera oye la frustrada y se va,
 * y eso cierra el ejercicio igual que aterrizar.
 */

import { describe, expect, it } from "vitest";
import { PYKASU, ARAI } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import {
  ALCANCE_GS_NM,
  anguloDeLaSenda,
  EMISORAS,
  ESCALA_DE_LA_SENDA,
  ESCALA_LOC,
  GS_HASTA,
  leerNav,
  MILLA,
  mismaFrecuencia,
  puntosDelLocalizador,
  puntosDeLaSenda,
  SECTOR_GS,
  sendaEmparejada,
  type Emisora,
} from "./radio-de-navegacion";
import { sitioDelMundo } from "./salto-bajo-tapa";
import { ALTURA_DE_DECISION } from "./minimos";
import {
  APARTADO_LOC,
  colocacionDelIls,
  CORTADA_LOC,
  IlsConAgujas,
  ilsDeLaCabecera,
  ilsDelCampo,
  rotuloDelIls,
  type SucesoDelIls,
} from "./ils-con-agujas";
import type { PuntoDelMundo } from "./seguir-la-aguja";
import { dondeCae } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
const ORIGEN = { lat: 28.45, lon: -13.865 };
const IFV = ilsDeLaCabecera("GCFV", "01")!;
const ILS = ejercicioPorId("ils")!;
const LOC = dondeCae(ORIGEN, IFV.estacion);
const GP = dondeCae(ORIGEN, IFV.estacion.senda!);
const ANGULO = anguloDeLaSenda(IFV.estacion)!;
const RF = IFV.estacion.rumboVerdadero!;
/** Hacia la pista y su derecha, en x, z del mundo. */
const HACIA = { x: Math.sin(RF * GRADO), z: -Math.cos(RF * GRADO) };
const DERECHA = { x: -HACIA.z, z: HACIA.x };

function vientoDe(de: number, kt: number): PuntoDelMundo {
  const ms = kt * NUDO;
  return { x: -Math.sin(de * GRADO) * ms, z: Math.cos(de * GRADO) * ms };
}
const ALISIO = vientoDe(30, 20);
const CALMA = { x: 0, z: 0 };

/** Lo que marcan las agujas en un punto del mundo, con la cota de las antenas en cero. */
function agujas(x: number, z: number, altitud: number, e: Emisora = IFV) {
  const s = sitioDelMundo(ORIGEN, x, z);
  return leerNav(e.mhz, 5, { lat: s.lat, lon: s.lon, altitud, rumbo: RF });
}

/** De la antena del localizador a la de la senda, a lo largo del eje, m. */
const ENTRE_ANTENAS = (LOC.x - GP.x) * HACIA.x + (LOC.z - GP.z) * HACIA.z;
/**
 * Un punto en la prolongación del eje —la recta del localizador—, a `d` m de
 * la antena de la senda hacia fuera, y `aparte` a la derecha mirando a la
 * pista. La senda está a un lado de la pista, y su antena no está en el eje.
 */
const enLaFinal = (d: number, aparte = 0) => ({
  x: LOC.x - HACIA.x * (d + ENTRE_ANTENAS) + DERECHA.x * aparte,
  z: LOC.z - HACIA.z * (d + ENTRE_ANTENAS) + DERECHA.z * aparte,
});

describe("la senda de planeo, con la escala de verdad", () => {
  it("el ILS de la 01 de Fuerteventura: IFV, su senda a tres grados y su frecuencia emparejada", () => {
    expect(IFV.estacion.id).toBe("IFV");
    expect(ANGULO).toBe(3);
    expect(IFV.estacion.mhzSenda).toBeCloseTo(332.6, 3);
    expect(sendaEmparejada(109.5)).toBe(332.6);
    expect(anguloDeLaSenda(ilsDeLaCabecera("GCFV", "19")!.estacion)).toBe(3.45);
  });

  it("cada ILS del juego publica la senda emparejada con su localizador (Anexo 10, 3.1.6.1.1)", () => {
    const ils = EMISORAS.filter((e) => e.estacion.clase === "ILS" && e.estacion.mhzSenda !== null);
    expect(ils.length).toBeGreaterThan(15);
    for (const e of ils) expect(mismaFrecuencia(sendaEmparejada(e.mhz)!, e.estacion.mhzSenda!), e.estacion.id).toBe(true);
  });

  it("en la senda y en el eje, las dos agujas en el centro", () => {
    for (const nm of [2, 5, 9]) {
      const d = nm * MILLA;
      const p = enLaFinal(d);
      const l = agujas(p.x, p.z, Math.tan(ANGULO * GRADO) * d);
      expect(l.localizador).toBe(true);
      expect(Math.abs(puntosDelLocalizador(l.desviacion!)), `${nm} NM`).toBeLessThan(0.05);
      expect(l.senda!.bandera).toBe(false);
      expect(Math.abs(l.senda!.puntos!), `${nm} NM`).toBeLessThan(0.02);
    }
  });

  it("un punto de senda son 0,12 veces el ángulo, dos la aguja a fondo: 0,36° y 0,72° con tres grados", () => {
    const d = 5 * MILLA;
    const p = enLaFinal(d);
    const a = (g: number) => agujas(p.x, p.z, Math.tan(g * GRADO) * d).senda!;
    // A dos décimas de centésima: la antena de la senda está a un lado del eje, y la distancia a ella no es justo `d`.
    expect(a(ANGULO + 0.12 * ANGULO).puntos).toBeCloseTo(1, 2);
    expect(a(ANGULO + 0.24 * ANGULO).puntos).toBeCloseTo(2, 2);
    expect(a(ANGULO - 0.24 * ANGULO).puntos).toBeCloseTo(-2, 2);
    expect(a(ANGULO + 0.36).desviacion).toBeCloseTo(0.36, 2);
    // Lo de los manuales: ±0,7° a fondo, 1,4° de ancho.
    expect(2 * ESCALA_DE_LA_SENDA * ANGULO).toBeCloseTo(1.44, 6);
    expect(puntosDeLaSenda(0.72, 3)).toBeCloseTo(2, 6);
  });

  it("un punto de localizador son 1,25°, y a 2,5° la aguja a tope; a la izquierda del eje, la aguja a la derecha", () => {
    // Desde el localizador, 1,25° a la izquierda del eje mirando a la pista.
    const desdeElLoc = 8 * MILLA;
    const r = (RF + 180 + 1.25) * GRADO;
    const l = agujas(LOC.x + Math.sin(r) * desdeElLoc, LOC.z - Math.cos(r) * desdeElLoc, 600);
    expect(l.desviacion!).toBeCloseTo(1.25, 2);
    expect(puntosDelLocalizador(l.desviacion!)).toBeCloseTo(1, 2);
    expect(puntosDelLocalizador(ESCALA_LOC)).toBe(2);
  });

  it("bandera de la senda fuera de sus diez millas, a más de ocho grados del eje y por encima de 1,75 veces el ángulo", () => {
    const lejos = enLaFinal((ALCANCE_GS_NM + 0.5) * MILLA);
    expect(agujas(lejos.x, lejos.z, 1000).senda!.bandera).toBe(true);
    const cerca = enLaFinal((ALCANCE_GS_NM - 0.5) * MILLA);
    expect(agujas(cerca.x, cerca.z, 900).senda!.bandera).toBe(false);
    const d = 6 * MILLA;
    const deLado = enLaFinal(d, Math.tan((SECTOR_GS + 1) * GRADO) * d);
    expect(agujas(deLado.x, deLado.z, 500).senda!.bandera).toBe(true);
    const p = enLaFinal(d);
    expect(agujas(p.x, p.z, Math.tan(GS_HASTA * ANGULO * 1.02 * GRADO) * d).senda!.bandera).toBe(true);
    // Por debajo sí llega, a fondo: es la que dice «subí» a quien viene bajo.
    const bajo = agujas(p.x, p.z, 50).senda!;
    expect(bajo.bandera).toBe(false);
    expect(bajo.puntos!).toBeLessThan(-2);
  });

  it("con un VOR no hay senda", () => {
    const ftv = EMISORAS.find((e) => e.estacion.id === "FTV")!;
    expect(leerNav(ftv.mhz, 90, { lat: 28.4, lon: -13.8, altitud: 900, rumbo: 0 }).senda ?? null).toBeNull();
  });
});

describe("dónde se ofrece y dónde empieza", () => {
  it("en el peldaño de cabina, con NAV, en un campo con un ILS cuya senda se sabe", () => {
    expect(ejerciciosPara("taguato-ruvicha", PYKASU, "GCFV").map((e) => e.id)).toContain("ils");
    expect(ejerciciosPara("taguato-ruvicha", ARAI, "GCFV").map((e) => e.id)).toContain("ils");
    expect(ejerciciosPara("taguato", PYKASU, "GCFV").map((e) => e.id)).not.toContain("ils");
    // Lanzarote no tiene ILS; La Gomera, tampoco.
    expect(ejerciciosPara("taguato-ruvicha", PYKASU, "GCRR").map((e) => e.id)).toContain("ils");
    expect(ejerciciosPara("taguato-ruvicha", PYKASU, "GCLA").map((e) => e.id)).not.toContain("ils");
    expect(ejerciciosPara("taguato-ruvicha", PYKASU, "GCGM").map((e) => e.id)).not.toContain("ils");
    // Mariscal Estigarribia tiene ILS, y el ángulo de su senda no se ha leído: no se ofrece.
    expect(ilsDelCampo("SGME")).toEqual([]);
  });

  it("la tarjeta lo escribe como una carta de aproximación", () => {
    expect(rotuloDelIls(IFV)).toBe("ILS 01 · IFV 109.50 · 005");
  });

  it("a doce millas, cinco grados apartado del lado del viento, cortando a treinta y por debajo de la senda", () => {
    const c = colocar(ALISIO);
    // El alisio viene del treinta: de la derecha de la final al dos.
    expect(c.lado).toBe(1);
    const l = agujas(c.x, c.z, c.alto);
    expect(l.localizador).toBe(true);
    expect(l.desviacion!).toBeLessThan(-ESCALA_LOC); // a tope, la aguja a la izquierda: el eje queda a la izquierda
    expect(Math.abs(l.desviacion!)).toBeCloseTo(APARTADO_LOC, 0);
    expect(l.senda!.bandera).toBe(true); // a doce millas, fuera de las diez
    expect(((RF - c.rumbo / GRADO + 540) % 360) - 180).toBeCloseTo(CORTADA_LOC, 6);
    // La senda cruza la altura de la salida a siete millas.
    expect(c.alto).toBeCloseTo(Math.tan(ANGULO * GRADO) * 7 * MILLA, 0);
    expect(colocar(CALMA).lado).toBe(-1);
  });
});

const colocar = (viento: PuntoDelMundo) =>
  colocacionDelIls({ localizador: LOC, senda: GP, rumboFinal: RF, angulo: ANGULO, viento, suelo: () => 0, cotaDeLaPista: 0 });

type Vuelo = {
  sucesos: SucesoDelIls[];
  ej: IlsConAgujas;
  /** Lo que marcaban las dos agujas al cruzar la altura de decisión, puntos. */
  enLosMinimos: { loc: number; senda: number } | null;
  /** El localizador cuando empezó a virar, grados. */
  empezoAVirarCon: number | null;
};

/**
 * **Una aproximación entera**: se coloca como lo coloca el juego y el piloto
 * hace lo que pide la instructora.
 *
 * - Corta el localizador a treinta grados mientras la aguja está a tope; en
 *   cuanto se despega, vira hacia el eje con el rumbo de la final más doce
 *   veces la aguja —a tope, los treinta de la cortada— y la corrección de
 *   viento que sabe.
 * - Nivelado hasta que la aguja de la senda llega al centro desde abajo; ahí
 *   baja al ritmo de la senda con su velocidad sobre el suelo, y corrige lo
 *   que marque la aguja.
 * - `apartado`: el que no sigue la del localizador del todo y va por el lado
 *   de la aguja, puntos —en los mínimos, fuera—.
 * - En los mínimos, si se le pide, frustra: sube a cinco metros por segundo.
 */
function volar(viento: PuntoDelMundo, o: { velocidad?: number; apartado?: number } = {}): Vuelo {
  const v = o.velocidad ?? PYKASU.velocidadDeCircuito;
  const c = colocar(viento);
  const ej = new IlsConAgujas(ILS, IFV);
  let { x, z, rumbo } = c;
  let altitud = c.alto;
  const sucesos: SucesoDelIls[] = [];
  // La corrección de viento de quien leyó el parte: el viento de costado partido por la verdadera.
  const costado = viento.x * DERECHA.x + viento.z * DERECHA.z;
  const wca = Math.asin(Math.max(-1, Math.min(1, -costado / v))) / GRADO;
  let enLaSenda = false;
  let frustra = false;
  let enLosMinimos: { loc: number; senda: number } | null = null;
  let empezoAVirarCon: number | null = null;
  let enElSuelo = false;
  const dt = 0.5;
  for (let t = 0; t < 1200 && ej.fase !== "cerrada"; t += dt) {
    const l = agujas(x, z, altitud);
    const loc = l.desviacion;
    const senda = l.senda && !l.senda.bandera ? l.senda.puntos : null;
    for (const s of ej.paso(
      {
        enElSuelo,
        parado: false,
        percance: false,
        sintonizada: true,
        localizador: loc,
        senda: l.senda ?? null,
        altura: altitud,
      },
      dt,
    )) {
      sucesos.push(s);
      if (s.que === "minimos") {
        enLosMinimos = { loc: s.loc, senda: s.senda };
        frustra = !s.dentro;
      }
    }
    // Lateral.
    let quiere = rumbo / GRADO;
    if (loc !== null && Math.abs(loc) < ESCALA_LOC) {
      empezoAVirarCon ??= loc;
      const apartado = (o.apartado ?? 0) * (ESCALA_LOC / 2);
      quiere = RF + 12 * (loc - apartado) + wca;
    }
    const giro = ((quiere - rumbo / GRADO + 540) % 360) - 180;
    rumbo += Math.max(-3 * dt, Math.min(3 * dt, giro)) * GRADO;
    const vx = Math.sin(rumbo) * v + viento.x;
    const vz = -Math.cos(rumbo) * v + viento.z;
    const gs = Math.hypot(vx, vz);
    // Vertical.
    let vs = 0;
    if (senda !== null && senda > -0.5) enLaSenda = true;
    if (frustra) vs = 5;
    // Por debajo de los mínimos se mira afuera y se posa: la senda acaba en su antena.
    else if (enLaSenda && (altitud < ALTURA_DE_DECISION || senda === null)) vs = -gs * Math.tan(ANGULO * GRADO);
    else if (enLaSenda && senda !== null) vs = -gs * Math.tan(ANGULO * GRADO) - 1.5 * senda;
    x += vx * dt;
    z += vz * dt;
    altitud += vs * dt;
    if (altitud <= 0) {
      altitud = 0;
      enElSuelo = true;
    }
  }
  return { sucesos, ej, enLosMinimos, empezoAVirarCon };
}

const ques = (v: Vuelo) => v.sucesos.map((s) => s.que);


describe("el ILS volado con las dos agujas", () => {
  it("con el alisio de costado: localizador, senda desde abajo, los mínimos dentro de un punto y la pista", () => {
    const v = volar(ALISIO);
    expect(ques(v)).toEqual(["presentar", "aTope", "seMueve", "enElLocalizador", "capturada", "minimos", "cerrar"]);
    const capturada = v.sucesos.find((s) => s.que === "capturada");
    expect(capturada).toEqual({ que: "capturada", desdeAbajo: true });
    const m = v.enLosMinimos!;
    expect(Math.abs(m.loc)).toBeLessThan(1);
    expect(Math.abs(m.senda)).toBeLessThan(1);
    expect(v.sucesos.find((s) => s.que === "minimos")).toMatchObject({ dentro: true });
    expect(v.ej.cierre).toBe("pista");
    // Y desde mil pies, las dos dentro de un punto todo el rato.
    expect(v.ej.peorDesdeMilPies.loc).toBeLessThan(1);
    expect(v.ej.peorDesdeMilPies.senda).toBeLessThan(1);
  });

  it("en calma, lo mismo", () => {
    const v = volar(CALMA);
    expect(ques(v)).toEqual(["presentar", "aTope", "seMueve", "enElLocalizador", "capturada", "minimos", "cerrar"]);
    expect(v.ej.cierre).toBe("pista");
  });

  it("con un reactor a su velocidad de circuito, también", () => {
    const v = volar(ALISIO, { velocidad: ARAI.velocidadDeCircuito });
    expect(v.sucesos.find((s) => s.que === "minimos")).toMatchObject({ dentro: true });
    expect(v.ej.cierre).toBe("pista");
  });

  it("quien llega a los mínimos con el localizador fuera de un punto oye la frustrada, se va, y cierra como un acierto", () => {
    const v = volar(ALISIO, { apartado: 1.6 });
    const m = v.sucesos.find((s) => s.que === "minimos");
    expect(m).toMatchObject({ dentro: false });
    expect(Math.abs(v.enLosMinimos!.loc)).toBeGreaterThan(1);
    expect(v.ej.cierre).toBe("frustrada");
    expect(ques(v).at(-1)).toBe("cerrar");
  });

  it("los mínimos se cruzan a doscientos pies", () => {
    // Sesenta metros: los doscientos pies de una de categoría I, como los cuenta `minimos.ts`.
    expect(ALTURA_DE_DECISION).toBe(60);
    expect(ALTURA_DE_DECISION / 0.3048).toBeCloseTo(200, -1);
  });
});
