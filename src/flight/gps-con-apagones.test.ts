/**
 * **«Se apaga el GPS», volado por un piloto de prueba**: el ejercicio entero
 * con la radio de verdad (`leerNav`) y un avión de cinemática —rumbo, la
 * verdadera del avión y el viento que lo empuja—, sin navegador.
 *
 * Lo que tiene que salir, y es la lección: con el GPS se vuela derecho a la
 * radio; a mitad de camino se va, y el plano se queda donde lo supo; con el
 * OBS hasta la barra al medio con TO y siguiéndola, se pasa por encima de FTV
 * con el viento de costado, y ahí el GPS vuelve. Y sin centrar la barra
 * también se llega: nadie suspende.
 */

import { describe, expect, it } from "vitest";
import { ARAI, MAINUMBY, PANAMBI, PYKASU } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import { centrado, leerNav, vuelta } from "./radio-de-navegacion";
import { sitioDelMundo } from "./salto-bajo-tapa";
import { comoEnElObs, vorDelCampo } from "./en-que-radial-estoy";
import {
  A_MITAD,
  ANTES_DEL_APAGON,
  ANTES_DEL_PLAN_B,
  CAUSA_DEL_EJERCICIO,
  colocacionDelGps,
  ENCIMA,
  LEJOS,
  OBS_APARTADO,
  SeApagaElGps,
  type SucesoDelGps,
} from "./gps-con-apagones";
import { type PuntoDelMundo } from "./seguir-la-aguja";
import { dondeCae } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
/** El origen del mundo de la prueba: cerca del aeropuerto de Fuerteventura. */
const ORIGEN = { lat: 28.45, lon: -13.865 };
const FTV = vorDelCampo("GCFV")!;
const ESTACION = { id: FTV.estacion.id, ...dondeCae(ORIGEN, FTV.estacion) };
const GPS = ejercicioPorId("gps")!;
const ALTITUD = 900;

function vientoDe(de: number, kt: number): PuntoDelMundo {
  const ms = kt * NUDO;
  return { x: -Math.sin(de * GRADO) * ms, z: Math.cos(de * GRADO) * ms };
}

/** Fuerteventura al oeste de FTV y el mar al este, como en «¿En qué radial estoy?». */
const SUELO = (x: number): number => (x - ESTACION.x < -2000 ? 600 : 0);
/** El alisio de Fuerteventura, del treinta a veinte nudos. */
const ALISIO = vientoDe(30, 20);

function nav(x: number, z: number, curso: number, rumbo = 0) {
  const s = sitioDelMundo(ORIGEN, x, z);
  return leerNav(FTV.mhz, curso, { lat: s.lat, lon: s.lon, altitud: ALTITUD, rumbo });
}

type Vuelo = {
  sucesos: { t: number; s: SucesoDelGps }[];
  ejercicio: SeApagaElGps;
  /** Dónde se fue el GPS, y lo que quedaba hasta la radio. */
  apagon: { x: number; z: number; lejos: number; t: number } | null;
  /** Lo que el plano decía mientras estuvo apagado: siempre el mismo sitio. */
  sitiosDelPlano: PuntoDelMundo[];
  segundos: number;
};

/**
 * **Un vuelo entero**: con GPS, el morro derecho a la radio, como el «directo
 * a»; sin GPS y con el plan B pedido, el OBS de grado en grado hacia el curso
 * a la radio, dos toques por segundo, y luego la barra: el rumbo del curso más
 * tres veces lo que se aparta, con un tope de treinta. `sinCentrar`: el OBS
 * no se toca, y se sigue con el morro donde estaba.
 */
function volar(viento: PuntoDelMundo, o: { velocidad?: number; sinCentrar?: boolean; quitarLaNavA?: number } = {}): Vuelo {
  const v = o.velocidad ?? PYKASU.cruiseSpeed;
  const c = colocacionDelGps({
    estacion: ESTACION,
    declinacion: FTV.declinacion,
    viento,
    velocidad: v,
    suelo: SUELO,
    cotaDeLaPista: 0,
  });
  const ej = new SeApagaElGps(GPS, ESTACION);
  ej.colocar(c);
  let { x, z, rumbo } = c;
  let curso = c.obs;
  const sucesos: Vuelo["sucesos"] = [];
  const sitiosDelPlano: PuntoDelMundo[] = [];
  let apagon: Vuelo["apagon"] = null;
  let planB = false;
  const dt = 0.5;
  let t = 0;
  for (; t < 3600 && ej.fase !== "cerrada"; t += dt) {
    const quitada = o.quitarLaNavA !== undefined && t >= o.quitarLaNavA && t < o.quitarLaNavA + 10;
    const n = nav(x, z, curso, vuelta(rumbo / GRADO));
    const nuevos = ej.paso(
      {
        x,
        z,
        enElSuelo: false,
        parado: false,
        percance: false,
        sintonizada: !quitada,
        desviacion: quitada ? null : n.desviacion,
        toFrom: quitada ? null : n.toFrom,
        bandera: quitada ? true : n.bandera,
      },
      dt,
    );
    for (const s of nuevos) {
      sucesos.push({ t, s });
      if (s.que === "seFue") apagon = { x, z, lejos: Math.hypot(ESTACION.x - x, ESTACION.z - z), t };
      if (s.que === "planB") planB = true;
    }
    const plano = ej.sinGps;
    if (plano) sitiosDelPlano.push(plano);
    let quiero = rumbo;
    if (ej.fase === "conGps") {
      // El «directo a» del GPS: la recta a la radio, con el viento corregido, como la lleva su CDI.
      quiero = conElViento(Math.atan2(ESTACION.x - x, -(ESTACION.z - z)), v, viento);
    } else if (planB && !o.sinCentrar) {
      if (curso !== c.alaRadio && n.desviacion !== null) curso = comoEnElObs(curso + Math.sign(centrado(c.alaRadio - curso)));
      if (n.desviacion !== null && !quitada) {
        const verdadero = (curso - FTV.declinacion) * GRADO;
        quiero = conElViento(verdadero, v, viento) + Math.max(-30, Math.min(30, 3 * n.desviacion)) * GRADO;
      }
    }
    const falta = centrado((quiero - rumbo) / GRADO);
    rumbo += Math.max(-3, Math.min(3, falta * 0.8)) * GRADO * dt;
    x += (Math.sin(rumbo) * v + viento.x) * dt;
    z += (-Math.cos(rumbo) * v + viento.z) * dt;
  }
  return { sucesos, ejercicio: ej, apagon, sitiosDelPlano, segundos: t };
}

/**
 * **El rumbo que lleva por esa recta con este viento**: el que deja la
 * velocidad sobre el suelo apuntando por ella. Buscado de décima en décima,
 * que para la prueba sobra.
 */
function conElViento(recta: number, v: number, viento: PuntoDelMundo): number {
  let mejor = recta;
  let menos = Infinity;
  for (let g = -30; g <= 30; g += 0.1) {
    const h = recta + g * GRADO;
    const gx = Math.sin(h) * v + viento.x;
    const gz = -Math.cos(h) * v + viento.z;
    const fuera = Math.abs(centrado((Math.atan2(gx, -gz) - recta) / GRADO));
    if (fuera < menos) {
      menos = fuera;
      mejor = h;
    }
  }
  return mejor;
}

const que = (v: Vuelo): string[] => v.sucesos.map((x) => x.s.que);

describe("dónde se ofrece «Se apaga el GPS»", () => {
  it("en el peldaño de la radio, en los de esferas con NAV y en un campo con VOR", () => {
    const ids = (p: Parameters<typeof ejerciciosPara>[0], a = PYKASU, oaci: string | null = "GCFV") =>
      ejerciciosPara(p, a, oaci).map((e) => e.id);
    expect(ids("taguato-ruvicha")).toContain("gps");
    expect(ids("taguato-ruvicha", PANAMBI)).toContain("gps");
    for (const p of ["guyrami", "tuka", "taguato"] as const) expect(ids(p)).not.toContain("gps");
    // El biplano no lleva radio; el reactor, inercial y pantalla: lo suyo queda escrito y no hecho.
    expect(ids("taguato-ruvicha", MAINUMBY)).not.toContain("gps");
    expect(ids("taguato-ruvicha", ARAI)).not.toContain("gps");
    // Se vende al mundo: Los Rodeos y Asunción tienen VOR; La Palma, no.
    for (const oaci of ["GCXO", "SGAS"]) expect(ids("taguato-ruvicha", PYKASU, oaci)).toContain("gps");
    expect(ids("taguato-ruvicha", PYKASU, "GCLA")).not.toContain("gps");
    expect(GPS.averias).toEqual([]);
    expect(GPS.escena).toBe("radio");
    expect(GPS.acabaEnElAire).toBe(true);
  });

  it("el apagón es el de un NOTAM: nunca por sorpresa", () => {
    expect(CAUSA_DEL_EJERCICIO).toBe("interferencia");
  });
});

describe("dónde empieza", () => {
  const c = colocacionDelGps({
    estacion: ESTACION,
    declinacion: FTV.declinacion,
    viento: ALISIO,
    velocidad: PYKASU.cruiseSpeed,
    suelo: SUELO,
    cotaDeLaPista: 0,
  });
  it("a siete minutos de la radio, entre diez y veinte millas, con el morro derecho a ella", () => {
    expect(c.lejos).toBeGreaterThanOrEqual(LEJOS.min);
    expect(c.lejos).toBeLessThanOrEqual(LEJOS.max);
    expect(Math.hypot(c.x - ESTACION.x, c.z - ESTACION.z)).toBeCloseTo(c.lejos, 0);
    const alaRadio = Math.atan2(ESTACION.x - c.x, -(ESTACION.z - c.z));
    expect(Math.abs(centrado((c.rumbo - alaRadio) / GRADO))).toBeLessThan(0.5);
  });
  it("el curso a la radio es el radial dado la vuelta, y el OBS va veinte grados apartado", () => {
    expect(c.alaRadio).toBe(comoEnElObs(c.radial + 180));
    expect(Math.abs(centrado(c.obs - c.alaRadio))).toBe(OBS_APARTADO);
    // En el sitio, con el curso a la radio, la barra está en el centro y dice TO.
    const n = nav(c.x, c.z, c.alaRadio);
    expect(n.toFrom).toBe("TO");
    expect(Math.abs(n.desviacion ?? 99)).toBeLessThan(5);
  });
});

describe("volado", () => {
  it("con el alisio: el GPS se va a mitad de camino, el plan B centra la barra con TO y se pasa por encima de FTV", () => {
    const v = volar(ALISIO);
    expect(que(v)).toEqual(["presentar", "seFue", "planB", "centrada", "pasada", "cerrar"]);
    expect(v.ejercicio.cierre).toBe("hecho");
    const c = v.ejercicio.colocacion!;
    expect(v.apagon!.t).toBeGreaterThanOrEqual(ANTES_DEL_APAGON);
    expect(v.apagon!.lejos).toBeLessThanOrEqual(A_MITAD * c.lejos + 50);
    expect(v.apagon!.lejos).toBeGreaterThan(0.4 * c.lejos);
    // El plan B, detrás de «se fue» y no a la vez: un suceso, una voz.
    const seFue = v.sucesos.find((s) => s.s.que === "seFue")!.t;
    const planB = v.sucesos.find((s) => s.s.que === "planB")!.t;
    expect(planB - seFue).toBeGreaterThanOrEqual(ANTES_DEL_PLAN_B - 0.5);
    // El plano, quieto donde lo supo por última vez, todo el apagón.
    expect(v.sitiosDelPlano.length).toBeGreaterThan(100);
    for (const p of v.sitiosDelPlano) {
      expect(p.x).toBeCloseTo(v.apagon!.x, 0);
      expect(p.z).toBeCloseTo(v.apagon!.z, 0);
    }
    // Y cerrado, vuelve a saberlo.
    expect(v.ejercicio.sinGps).toBeNull();
  });

  it("con el bimotor, más deprisa y más lejos, también", () => {
    const v = volar(ALISIO, { velocidad: PANAMBI.cruiseSpeed });
    expect(que(v)).toEqual(["presentar", "seFue", "planB", "centrada", "pasada", "cerrar"]);
  });

  it("sin centrar la barra se llega igual, y se dice igual: nadie suspende", () => {
    const v = volar(vientoDe(0, 0), { sinCentrar: true });
    expect(que(v)).toContain("pasada");
    expect(que(v)).not.toContain("centrada");
    expect(v.ejercicio.cierre).toBe("hecho");
  });

  it("si se quita el VOR de la NAV con el plan B pedido, se pide ponerlo una vez por cada vez", () => {
    const sinNav = volar(ALISIO);
    const planB = sinNav.sucesos.find((s) => s.s.que === "planB")!.t;
    const v = volar(ALISIO, { quitarLaNavA: planB + 2 });
    expect(que(v).filter((q) => q === "sintonizar")).toHaveLength(1);
    expect(que(v)).toContain("pasada");
  });

  it("encima es a menos de tres millas", () => {
    expect(ENCIMA).toBeCloseTo(3 * 1852);
  });

  it("con percance, otra vez; y reiniciar lo deja como al empezar", () => {
    const ej = new SeApagaElGps(GPS, ESTACION);
    const l = { x: 0, z: 0, enElSuelo: false, parado: false, percance: true, sintonizada: true, desviacion: 0, toFrom: "TO" as const, bandera: false };
    expect(ej.paso(l, 0.5).map((s) => s.que)).toEqual(["presentar", "cerrar"]);
    expect(ej.cierre).toBe("otraVez");
    ej.reiniciar();
    expect(ej.fase).toBe("conGps");
    expect(ej.cierre).toBeNull();
    expect(ej.sinGps).toBeNull();
  });
});
