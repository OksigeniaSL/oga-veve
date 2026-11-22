/**
 * La carga que se suelta (H38g, #91, #90): la maleta sin amarrar se va al
 * fondo de la bodega, el centro de gravedad con ella hacia la cola, y el
 * avión pide empujar y compensar; la amarrada no se mueve; y el ejercicio
 * solo se ofrece donde la hoja de centrado lo enseña.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, PYKASU, conCentrado, conMasa, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import {
  centradoDeSuTipo,
  conAmarre,
  desplazamientoDelCentrado,
  puntoNeutro,
  repartoDeLaHoja,
  repartoQueVale,
  todoAmarrado,
} from "./centrado";
import {
  cargaSuelta,
  corrimientoDeLaCarga,
  cuantoSeHaCorrido,
  MALETAS_DEL_EJERCICIO,
  repartoDelEjercicio,
  TARDA_EN_CORRERSE,
} from "./carga-suelta";
import { MALETA, masaSinCombustibleDeLaHoja, pasajerosDeSuFicha } from "./hoja-de-carga";
import { ejercicioPorId, ejerciciosPara, esAvisado, seOfrece } from "./ejercicios";
import { Practica, type Lectura, type Suceso } from "./practica";

const T172 = centradoDeSuTipo(PYKASU)!;
const PULGADA = 0.0254;
const COMBUSTIBLE = 60;

/** La carga del ejercicio con la gente de su ficha: la hoja que arma el juego sin hoja del hangar. */
function delEjercicio(amarrada = false) {
  const pasajeros = pasajerosDeSuFicha(PYKASU);
  const base = repartoDelEjercicio(T172, repartoDeLaHoja(T172, pasajeros));
  const reparto = amarrada ? conAmarre(T172, base, true) : base;
  const masa = masaSinCombustibleDeLaHoja(PYKASU, pasajeros, reparto) + COMBUSTIBLE;
  const dx = desplazamientoDelCentrado(PYKASU, pasajeros, COMBUSTIBLE, reparto);
  return { pasajeros, reparto, masa, dx };
}

describe("la carga se corre y el centro va hacia la cola", () => {
  it("sin maletas en la hoja, el ejercicio pone las suyas en la bodega 1, sin amarrar", () => {
    const { reparto } = delEjercicio();
    expect(reparto.bodegas).toEqual([MALETAS_DEL_EJERCICIO * MALETA, 0]);
    expect(reparto.amarradas).toEqual([false, false]);
    // Por debajo del rótulo de su bodega: 120 lb.
    expect(reparto.bodegas![0]!).toBeLessThan(T172.bodegas[0]!.maximo);
  });

  it("y con maletas en la hoja, las de la hoja, con su amarre", () => {
    const hoja = { filas: [1, 0], bodegas: [0, 22], amarradas: [false, true] };
    const r = repartoDelEjercicio(T172, repartoQueVale(T172, 1, hoja));
    expect(r.bodegas).toEqual([0, 22]);
    expect(r.amarradas).toEqual([false, true]);
  });

  it("se va poco a poco, y llega al fondo de la bodega, la estación 142", () => {
    const { reparto, masa } = delEjercicio();
    expect(T172.fondoDeLaBodega).toBeCloseTo(142 * PULGADA, 6);
    expect(corrimientoDeLaCarga(T172, reparto, masa, 0)).toBe(0);
    let antes = 0;
    for (let s = 1; s <= TARDA_EN_CORRERSE; s++) {
      const aqui = corrimientoDeLaCarga(T172, reparto, masa, s);
      expect(aqui).toBeGreaterThan(antes);
      antes = aqui;
    }
    // Al fondo, la palanca entera: 44 kg de la estación 95 a la 142.
    const kg = MALETAS_DEL_EJERCICIO * MALETA;
    const todo = (kg * (142 - 95) * PULGADA) / masa;
    expect(corrimientoDeLaCarga(T172, reparto, masa, TARDA_EN_CORRERSE)).toBeCloseTo(todo, 6);
    // Y de ahí no pasa: la pared es la pared.
    expect(corrimientoDeLaCarga(T172, reparto, masa, 60)).toBeCloseTo(todo, 6);
    expect(cuantoSeHaCorrido(TARDA_EN_CORRERSE / 2)).toBeCloseTo(0.5, 6);
    // Cinco centímetros largos en un 172: dos pulgadas de centro, un 3,5 % de la cuerda.
    expect(todo).toBeGreaterThan(0.045);
    expect(todo).toBeLessThan(0.06);
  });

  it("y el avión lo nota: menos estable, y pide empujar y compensar", () => {
    const { masa, dx, reparto } = delEjercicio();
    const corrido = dx + corrimientoDeLaCarga(T172, reparto, masa, TARDA_EN_CORRERSE);
    // Más cerca del punto neutro del modelo, sin pasarlo: el avión sigue volviendo solo, pero menos.
    const neutro = puntoNeutro(PYKASU);
    expect(neutro - corrido).toBeLessThan(neutro - dx);
    expect(neutro - corrido).toBeGreaterThan(0);
    // El timón que lo sostiene a nivel, más hacia adelante con la maleta al fondo.
    const timon = (a: AircraftConfig): number => {
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
      m.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: a.rotationSpeed * 1.5, equilibrado: true });
      return m.timonDeEquilibrio();
    };
    const antes = timon(conCentrado(conMasa(PYKASU, masa), dx));
    const despues = timon(conCentrado(conMasa(PYKASU, masa), corrido));
    expect(despues).toBeLessThan(antes);
  });

  it("en vuelo y sin tocar nada, la nariz sube y la velocidad cae: hacia la pérdida", () => {
    const { masa, dx, reparto } = delEjercicio();
    const vuela = (seSuelta: boolean) => {
      const a = conCentrado(conMasa(PYKASU, masa), dx);
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
      const v = a.rotationSpeed * 1.5;
      m.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: v, equilibrado: true });
      const trim = m.timonDeEquilibrio();
      const gas = m.gasPara?.(v, { flaps: 0, tren: 0 }) ?? 0.6;
      let alfa = 0;
      for (let i = 0; i < 60 * (TARDA_EN_CORRERSE + 4); i++) {
        const s = i / 60;
        if (seSuelta) m.ponerCentrado(dx + corrimientoDeLaCarga(T172, reparto, masa, s));
        m.step(1 / 60, { ...neutralControls(), throttle: gas, trim, tren: 0 });
        alfa = Math.max(alfa, m.state.alpha);
      }
      return { alfa, velocidad: m.state.airspeed };
    };
    const quieta = vuela(false);
    const suelta = vuela(true);
    expect(suelta.alfa).toBeGreaterThan(quieta.alfa + (0.3 * Math.PI) / 180);
    expect(suelta.velocidad).toBeLessThan(quieta.velocidad);
  });
});

describe("el amarre la sujeta", () => {
  it("amarrada no se corre nada, ni al fondo del reloj", () => {
    const { reparto, masa } = delEjercicio(true);
    expect(todoAmarrado(T172, reparto)).toBe(true);
    expect(cargaSuelta(T172, reparto).kg).toBe(0);
    for (const s of [0, 4, TARDA_EN_CORRERSE, 60]) expect(corrimientoDeLaCarga(T172, reparto, masa, s)).toBe(0);
  });

  it("y si solo va amarrada una bodega, se corre la otra", () => {
    const r = repartoQueVale(T172, 1, { filas: [1, 0], bodegas: [22, 11], amarradas: [true, false] });
    expect(cargaSuelta(T172, r)).toEqual({ kg: 11, brazo: T172.bodegas[1]!.brazo });
    expect(todoAmarrado(T172, r)).toBe(false);
  });

  it("amarrar no mueve el centro: lo que cambia es lo que pasa en vuelo", () => {
    const suelta = delEjercicio(false);
    const atada = delEjercicio(true);
    expect(atada.dx).toBe(suelta.dx);
    expect(atada.masa).toBe(suelta.masa);
  });
});

describe("el ejercicio solo sale donde debe", () => {
  const carga = ejercicioPorId("carga")!;

  it("desde Taguató y en el avión con hoja de centrado, hoy el 172", () => {
    expect(seOfrece(carga, "taguato", PYKASU)).toBe(true);
    expect(seOfrece(carga, "taguato-ruvicha", PYKASU)).toBe(true);
    expect(seOfrece(carga, "tuka", PYKASU)).toBe(false);
    expect(seOfrece(carga, "guyrami", PYKASU)).toBe(false);
    for (const a of AIRCRAFT) {
      const conHoja = centradoDeSuTipo(a) !== null;
      expect(ejerciciosPara("taguato", a).some((e) => e.id === "carga"), a.id).toBe(conHoja && !a.helicoptero);
    }
  });

  it("se elige y se anuncia: nunca por sorpresa", () => {
    expect(esAvisado(carga)).toBe(true);
    expect(carga.leccion).toBe("vuelta");
    expect(carga.averias).toEqual([{ que: "carga", cuando: { en: "subida", metros: 400 * 0.3048 } }]);
  });
});

describe("cómo se vuela el ejercicio", () => {
  const QUIETO: Lectura = {
    enElSuelo: true,
    corriendo: false,
    enPista: true,
    indicada: 0,
    sobreElCampo: 0,
    vertical: 0,
    parado: true,
    percance: false,
    enFinal: false,
    tren: "fuera",
  };
  const durante = (p: Practica, l: Lectura, segundos: number): Suceso[] => {
    const todo: Suceso[] = [];
    for (let i = 0; i < segundos * 10; i++) todo.push(...p.paso(l, 0.1));
    return todo;
  };

  it("se presenta, se suelta subiendo a 400 ft, se vuelve sin declarar y se cierra bien", () => {
    const p = new Practica(ejercicioPorId("carga")!, PYKASU, { v1: 25, vr: 28 }, () => 0.1);
    expect(durante(p, QUIETO, 1).map((s) => s.que)).toEqual(["presentar"]);
    durante(p, { ...QUIETO, corriendo: true, indicada: 25, parado: false }, 5);
    // Subiendo, por debajo de los 400 ft: todavía nada.
    const subiendo = { ...QUIETO, enElSuelo: false, enPista: false, parado: false, indicada: 37, vertical: 3.5 };
    expect(durante(p, { ...subiendo, sobreElCampo: 100 }, 5)).toEqual([]);
    expect(p.segundosDesdeElFallo).toBe(0);
    const fallo = durante(p, { ...subiendo, sobreElCampo: 125 }, 1);
    expect(fallo[0]).toEqual({ que: "fallo", averia: "carga", motor: null, parar: false, enElSuelo: false });
    expect(p.motorParado).toBeNull();
    // El circuito y la final: ni velocidad de un motor, ni bandera, ni llamada, ni bomberos.
    const despues = [
      ...durante(p, { ...subiendo, sobreElCampo: 250, vertical: 0 }, 60),
      ...durante(p, { ...subiendo, enFinal: true, sobreElCampo: 100, vertical: -3 }, 30),
    ];
    expect(despues).toEqual([]);
    expect(p.segundosDesdeElFallo).toBeGreaterThan(TARDA_EN_CORRERSE);
    expect(p.declaradaYa).toBe(false);
    const cierre = durante(p, { ...QUIETO, enFinal: true }, 1);
    expect(cierre).toEqual([{ que: "cerrar", como: "vuelta" }]);
  });
});
