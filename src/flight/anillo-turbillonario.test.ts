/**
 * **El anillo turbillonario del Super Puma**, volado sin pantalla (issue #111).
 *
 * Bajando casi en vertical a la velocidad del aire que el rotor echa hacia
 * abajo, el rotor se mete en su propia estela y deja de sostener. La inducida
 * sale ahí del modelo de Johnson (NASA/TP-2005-213477), y estas pruebas miran
 * lo que tiene que notarse: que se entra bajando en vertical y no con velocidad
 * hacia delante, que el colectivo no saca, que hacia delante sí, y que lejos
 * del anillo el modelo es el de antes, al decimal. Ver el ADR 0026.
 *
 * Los pilotos de prueba son los de `helicoptero.test.ts`: no son quien juega,
 * sino la forma de preguntar al modelo «¿y si se vuela así?».
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { airDensity } from "./atmosphere";
import {
  ModeloDeHelicoptero,
  inducidaEnDescenso,
  mandosNeutros,
  resolverDisco,
  terminoDelSuelo,
  zonaDelAnillo,
  type MandosDeHelicoptero,
} from "./helicoptero";
import { SUPER_PUMA as F } from "./super-puma";

const GRADO = Math.PI / 180;
const NUDO = 1852 / 3600;
const RPM = (2 * Math.PI) / 60;
const DT = 1 / 60;

/** El aire que atraviesa el disco, en múltiplos de vh: Vz + v. */
const total = (vz: number, vx = 0): number => vz + inducidaEnDescenso(vz, vx);

/** La cantidad de movimiento sin dimensiones, la rama de trabajo, para comparar. */
function momento(vz: number, vx: number): number {
  let bajo = Math.max(0, -vz / 2);
  let alto = Math.max(0, -vz) + 3;
  for (let k = 0; k < 80; k++) {
    const v = (bajo + alto) / 2;
    if (v * Math.sqrt(vx * vx + (vz + v) * (vz + v)) < 1) bajo = v;
    else alto = v;
  }
  return (bajo + alto) / 2;
}

/**
 * **Quieto en el aire a 1.500 m** —lejos del suelo y de su efecto—, al peso
 * máximo: lo sostiene la estabilización de estacionario y después se pasa a la
 * de actitud, la de Taguató y Taguató Ruvicha, con la palanca donde la dejó.
 * Con `nudos`, volando a esa velocidad.
 */
function enElAire(nudos = 0) {
  const h = new ModeloDeHelicoptero(F, () => 0);
  h.ponerEstabilizacion("estacionario");
  h.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: nudos * NUDO, rotorEnMarcha: true });
  const m: MandosDeHelicoptero = mandosNeutros();
  m.tren = 0;
  m.colectivo = 0.5;
  m.cabeceo = -nudos / 136;
  for (let t = 0; t < 40; t += DT) h.step(DT, m);
  h.ponerEstabilizacion("actitud");
  m.colectivo = h.mandosAhora().colectivo;
  m.cabeceo = 0;
  m.alabeo = 0;
  return { h, m, colectivoQueSostiene: m.colectivo };
}

/** Vuela `segundos` con lo que haga `mandar` en cada paso; devuelve lo peor que pasó. */
function volar(h: ModeloDeHelicoptero, m: MandosDeHelicoptero, segundos: number, mandar: () => void = () => {}) {
  let bajaMas = 0;
  let menosVueltas = Infinity;
  let dentro = false;
  for (let t = 0; t < segundos; t += DT) {
    mandar();
    h.step(DT, m);
    bajaMas = Math.min(bajaMas, h.state.velocity.y);
    menosVueltas = Math.min(menosVueltas, h.rotor().vueltas / RPM);
    dentro ||= h.anillo().zona === "dentro";
  }
  return { bajaMas, menosVueltas, dentro };
}

/** Metido en el anillo: el colectivo un poco por debajo del que sostiene, hasta bajar a `hasta` m/s. */
function metido(hasta: number) {
  const vuelo = enElAire();
  vuelo.m.colectivo = vuelo.colectivoQueSostiene - 0.1;
  for (let t = 0; t < 30 && vuelo.h.state.velocity.y > hasta; t += DT) vuelo.h.step(DT, vuelo.m);
  return vuelo;
}

describe("la curva de Johnson (NASA/TP-2005-213477, tablas 3 y 4)", () => {
  it("bajando en vertical, el aire del disco tiene su mínimo en N y su máximo en X, los de la tabla", () => {
    expect(total(-0.45)).toBeCloseTo(0.85, 2);
    expect(total(-1.5)).toBeCloseTo(1.25, 2);
    // Sin pendiente en los dos: es el borde de la inestabilidad.
    expect(Math.abs(total(-0.44) - total(-0.46))).toBeLessThan(0.002);
    expect(Math.abs(total(-1.49) - total(-1.51))).toBeLessThan(0.002);
  });

  it("entre N y X, bajar más deprisa hace pasar más aire por el disco: lo que la cantidad de movimiento no da", () => {
    for (const vz of [-0.6, -0.8, -1.0, -1.2, -1.4]) {
      expect(total(vz - 0.05)).toBeGreaterThan(total(vz + 0.05));
      // Con la cantidad de movimiento, al revés: menos aire cuanto más deprisa se baja.
      expect(vz - 0.05 + momento(vz - 0.05, 0)).toBeLessThan(vz + 0.05 + momento(vz + 0.05, 0));
    }
  });

  it("con velocidad en el plano el anillo se estrecha, y a 0,95 vh ya no está", () => {
    expect(total(-1.0, 0.6) - total(-0.8, 0.6)).toBeGreaterThan(0);
    for (let vz = -0.1; vz > -2.4; vz -= 0.1) expect(total(vz - 0.05, 1.0)).toBeLessThan(total(vz + 0.05, 1.0));
  });

  it("fuera de la zona es la cantidad de movimiento", () => {
    for (const [vz, vx] of [
      [0.5, 0],
      [0, 0],
      [-0.1, 0],
      [-0.15, 0.3],
      [-1.0, 1.2],
      [-0.6, 2.5],
    ] as const)
      expect(inducidaEnDescenso(vz, vx)).toBeCloseTo(momento(vz, vx), 6);
  });

  it("y las zonas: cerca entre D y N, dentro pasado N, fuera con avance o bajando poco", () => {
    expect(zonaDelAnillo(0.1, 0)).toBe("fuera");
    expect(zonaDelAnillo(0.3, 0)).toBe("cerca");
    expect(zonaDelAnillo(0.8, 0)).toBe("dentro");
    expect(zonaDelAnillo(1.7, 0)).toBe("dentro");
    expect(zonaDelAnillo(0.8, 1.0)).toBe("fuera");
    expect(zonaDelAnillo(2.5, 0)).toBe("fuera");
  });
});

describe("el rotor con el anillo", () => {
  const rho = airDensity(0);
  const rot = F.rotor;
  const pasoDeEstacionario = rot.paso.minimo + 0.45 * (rot.paso.maximo - rot.paso.minimo);

  it("lejos del anillo da lo mismo que sin él, al decimal: estacionario, subidas, crucero, autorrotación, suelo", () => {
    const casos: [number, number, number, number][] = [
      // paso, lo que baja (m/s, positivo bajando), lo que avanza en el plano (m/s), el término del suelo
      [pasoDeEstacionario, 0, 0, 0],
      [pasoDeEstacionario, -5, 0, 0],
      [pasoDeEstacionario, 2, 0, 0],
      [pasoDeEstacionario, 0, 0, terminoDelSuelo(rot.radio, 5.3)],
      [pasoDeEstacionario, 1, 1, terminoDelSuelo(rot.radio, 6)],
      [pasoDeEstacionario - 2 * GRADO, 0, 40 * NUDO, 0],
      [pasoDeEstacionario, 3, 70 * NUDO, 0],
      [pasoDeEstacionario + 3 * GRADO, -1, 136 * NUDO, 0],
      [rot.paso.minimo, 11.6, 70 * NUDO, 0],
      [rot.paso.minimo, 8, 30 * NUDO, 0],
    ];
    for (const [paso, normal, plano, suelo] of casos) {
      const sin = resolverDisco(rot, rho, rot.vueltas, paso, normal, plano, 10, suelo, false);
      const con = resolverDisco(rot, rho, rot.vueltas, paso, normal, plano, 10, suelo, true);
      expect(con).toEqual(sin);
    }
  });

  it("con el mismo colectivo, bajar más deprisa da menos empuje; con la cantidad de movimiento, más", () => {
    const con = (baja: number) => resolverDisco(rot, rho, rot.vueltas, pasoDeEstacionario, baja, 0, 14, 0, true);
    const sin = (baja: number) => resolverDisco(rot, rho, rot.vueltas, pasoDeEstacionario, baja, 0, 14, 0, false);
    expect(con(14).empuje).toBeLessThan(con(9).empuje);
    expect(sin(14).empuje).toBeGreaterThan(sin(9).empuje);
    // Y lo que se lleva del eje para el mismo empuje, mucho más: el aire dando vueltas.
    expect(con(14).potencia / con(14).empuje).toBeGreaterThan(sin(14).potencia / sin(14).empuje);
  });
});

describe("volado: el Super Puma al peso máximo, a 1.500 m", () => {
  it("bajando en vertical con el colectivo un poco por debajo del que sostiene, entra y se hunde solo", () => {
    const { h, m, colectivoQueSostiene } = enElAire();
    m.colectivo = colectivoQueSostiene - 0.1;
    volar(h, m, 6);
    expect(h.anillo().zona).toBe("dentro");
    const r = volar(h, m, 14);
    // Pasa de unos 7 m/s a más de 20, unos 4.000 pies por minuto, sin tocar nada.
    expect(r.bajaMas).toBeLessThan(-20);
    expect(h.state.velocity.y).toBeLessThan(-20);
    expect(h.anillo().zona).toBe("dentro");
  });

  it("con la misma bajada volando a 40 nudos no entra: baja a su ritmo y se queda", () => {
    const { h, m, colectivoQueSostiene } = enElAire(40);
    m.colectivo = colectivoQueSostiene - 0.12;
    const r = volar(h, m, 30);
    expect(r.dentro).toBe(false);
    expect(r.bajaMas).toBeGreaterThan(-8);
  });

  it("dentro, subir el colectivo no lo saca: los motores al tope, las vueltas fuera del verde, y sigue bajando igual", () => {
    const { h, m } = metido(-24);
    const bajaba = h.state.velocity.y;
    const subido = Math.min(1, m.colectivo + 0.3);
    const r = volar(h, m, 12, () => {
      m.colectivo = Math.min(subido, m.colectivo + 0.5 * DT);
    });
    expect(h.anillo().zona).toBe("dentro");
    expect(h.state.velocity.y).toBeLessThan(bajaba + 3);
    // Por debajo de las 245 rpm con motor de la ficha (TCDS III.9): lo que se pide, no lo hay.
    expect(r.menosVueltas).toBeLessThan(245);
    expect(h.rotor().potenciaMotores).toBeGreaterThan(0.95 * h.rotor().potenciaDisponible);
  });

  it("con el cíclico adelante sale: gana velocidad, deja de hundirse y sin tocar las vueltas", () => {
    const { h, m } = metido(-24);
    const empieza = h.state.position.y;
    let fuera = Infinity;
    let t = 0;
    const r = volar(h, m, 14, () => {
      // Morro doce grados abajo y alas a nivel, el colectivo donde estaba.
      const a = h.actitud();
      m.cabeceo = Math.max(-1, Math.min(1, (-12 * GRADO - a.cabeceo) * 3));
      m.alabeo = Math.max(-1, Math.min(1, -a.alabeo * 3));
      if (h.anillo().zona === "fuera" && fuera === Infinity) fuera = t;
      t += DT;
    });
    expect(fuera).toBeLessThan(10);
    expect(h.state.velocity.y).toBeGreaterThan(-6);
    expect(h.state.airspeed).toBeGreaterThan(40 * NUDO);
    expect(r.menosVueltas).toBeGreaterThan(245);
    // Unos doscientos metros, que es por qué se enseña a salir con altura de sobra.
    expect(empieza - h.state.position.y).toBeLessThan(300);
  });

  it("en la de estacionario, la de Guyrami y Tukã, no se entra: con la palanca abajo baja a 4 m/s y se queda ahí", () => {
    /*
     * Quieto un rato antes, y también con la palanca abajo nada más colocarlo en
     * el aire, que es como lo pone el banco del juego: ahí la ayuda se pasaba de los
     * 4 m/s a 5,4, cerca de donde empieza el anillo con poco peso.
     */
    for (const [masa, quieto] of [
      [F.masaMaxima, 5],
      [F.masaMaxima, 0],
      [7000, 0],
    ] as const) {
      const h = new ModeloDeHelicoptero(F, () => 0);
      h.ponerMasa(masa);
      h.ponerEstabilizacion("estacionario");
      h.reset({ position: new Vector3(0, 1500, 0), heading: 0, rotorEnMarcha: true });
      const m = mandosNeutros();
      m.tren = 0;
      m.colectivo = 0.5;
      volar(h, m, quieto);
      m.colectivo = 0;
      const r = volar(h, m, 60);
      expect(r.dentro).toBe(false);
      expect(h.state.velocity.y).toBeCloseTo(-4, 1);
      expect(r.bajaMas).toBeGreaterThan(-5);
    }
  });
});
