/**
 * **El sol de cada hemisferio** (#50): dónde está a mediodía en Los Rodeos y
 * en Pettirossi, en los equinoccios y los solsticios, y por dónde sale.
 *
 * Las cifras esperadas no salen de este código. Salen de la geometría de la
 * culminación, la de cualquier almanaque y la de la calculadora solar de la
 * NOAA: al pasar por el meridiano, el sol está a 90° − |φ − δ| de altura, al
 * sur si la latitud φ queda al norte de su declinación δ y al norte si no; δ
 * es cero en los equinoccios y ±23,44° en los solsticios. Y del orto: con el
 * sol en el horizonte, cos A = sen δ / cos φ, así que en los equinoccios sale
 * justo por el este en cualquier latitud. La ecuación del tiempo, la del
 * almanaque: el 3 de noviembre el sol pasa por el meridiano dieciséis minutos
 * y medio antes de las doce medias, y el 11 de febrero catorce después.
 *
 * Antes de esto el sol salía a las seis, se ponía a las dieciocho y culminaba
 * **al norte en todos los escenarios**, Canarias incluida: a las doce en Los
 * Rodeos estaba a setenta y dos grados de acimut, al este-nordeste.
 */

import { describe, expect, it } from "vitest";
import {
  alturaYAcimut,
  cieloDe,
  instanteDeLaHora,
  sitioDelCielo,
  solALaHora,
  CIELO_DE_ASUNCION,
} from "./cielo-de-noche";
import { PETTIROSSI, TENERIFE_NORTE } from "./scenarios";

const OBLICUIDAD = 23.44;
const LOS_RODEOS = sitioDelCielo(TENERIFE_NORTE);
const ASUNCION = sitioDelCielo(PETTIROSSI);

/** El día, a mediodía de Greenwich: `instanteDeLaHora` lo cuenta en el sitio. */
const dia = (d: string): Date => new Date(`${d}T12:00:00Z`);

const sol = (sitio: { lat: number; lon: number }, d: string, hora: number) =>
  solALaHora(dia(d), hora, sitio.lat, sitio.lon);

/**
 * La hora solar media a la que el sol pasa por el meridiano: cuando deja de
 * estar al este —X positiva— y pasa al oeste. Por bisección, al segundo.
 */
function pasoPorElMeridiano(sitio: { lat: number; lon: number }, d: string): number {
  let a = 11;
  let b = 13;
  for (let i = 0; i < 30; i++) {
    const m = (a + b) / 2;
    if (sol(sitio, d, m)[0] > 0) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/** La hora a la que sale: cuando la altura pasa por cero, de madrugada. */
function orto(sitio: { lat: number; lon: number }, d: string): number {
  let a = 3;
  let b = 9;
  for (let i = 0; i < 30; i++) {
    const m = (a + b) / 2;
    if (sol(sitio, d, m)[1] < 0) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

const FECHAS = [
  { d: "2026-03-20", que: "equinoccio de marzo", declinacion: 0 },
  { d: "2026-06-21", que: "solsticio de junio", declinacion: OBLICUIDAD },
  { d: "2026-09-22", que: "equinoccio de septiembre", declinacion: 0 },
  { d: "2026-12-21", que: "solsticio de diciembre", declinacion: -OBLICUIDAD },
] as const;

describe("el sol a mediodía, en cada hemisferio", () => {
  for (const { d, que, declinacion } of FECHAS) {
    it(`${que}: en Los Rodeos culmina al sur, a 90° − |φ − δ|`, () => {
      const h = pasoPorElMeridiano(LOS_RODEOS, d);
      const { altura, acimut } = alturaYAcimut(sol(LOS_RODEOS, d, h));
      expect(Math.abs(altura - (90 - Math.abs(LOS_RODEOS.lat - declinacion)))).toBeLessThan(0.3);
      expect(acimut).toBeCloseTo(180, 0);
      // Y en los ejes del juego, del lado del sur: la Z positiva.
      expect(sol(LOS_RODEOS, d, h)[2]).toBeGreaterThan(0);
    });

    it(`${que}: en Pettirossi culmina al norte, a 90° − |φ − δ|`, () => {
      const h = pasoPorElMeridiano(ASUNCION, d);
      const { altura, acimut } = alturaYAcimut(sol(ASUNCION, d, h));
      expect(Math.abs(altura - (90 - Math.abs(ASUNCION.lat - declinacion)))).toBeLessThan(0.3);
      expect(Math.min(acimut, 360 - acimut)).toBeLessThan(0.5);
      // Y en los ejes del juego, del lado del norte: la Z negativa.
      expect(sol(ASUNCION, d, h)[2]).toBeLessThan(0);
    });
  }

  it("los valores de referencia, escritos: 61,5° y 38,1° en Tenerife; 64,8° y 41,3° en Asunción", () => {
    const alto = (s: { lat: number; lon: number }, d: string) =>
      alturaYAcimut(sol(s, d, pasoPorElMeridiano(s, d))).altura;
    expect(Math.abs(alto(LOS_RODEOS, "2026-03-20") - 61.5)).toBeLessThan(0.3);
    expect(Math.abs(alto(LOS_RODEOS, "2026-06-21") - 85.0)).toBeLessThan(0.3);
    expect(Math.abs(alto(LOS_RODEOS, "2026-12-21") - 38.1)).toBeLessThan(0.3);
    expect(Math.abs(alto(ASUNCION, "2026-03-20") - 64.8)).toBeLessThan(0.3);
    expect(Math.abs(alto(ASUNCION, "2026-06-21") - 41.3)).toBeLessThan(0.3);
    expect(Math.abs(alto(ASUNCION, "2026-12-21") - 88.2)).toBeLessThan(0.3);
  });

  it("y la hora del paso es la de la ecuación del tiempo, no las doce", () => {
    // 3 de noviembre: 16 min 26 s antes; 11 de febrero: 14 min 14 s después.
    expect(Math.abs(pasoPorElMeridiano(LOS_RODEOS, "2026-11-03") - (12 - 16.43 / 60))).toBeLessThan(1 / 60);
    expect(Math.abs(pasoPorElMeridiano(ASUNCION, "2026-02-11") - (12 + 14.23 / 60))).toBeLessThan(1 / 60);
  });
});

describe("y por dónde sale", () => {
  for (const s of [
    { nombre: "Los Rodeos", sitio: LOS_RODEOS },
    { nombre: "Pettirossi", sitio: ASUNCION },
  ]) {
    it(`en ${s.nombre}, por el este en los equinoccios`, () => {
      for (const d of ["2026-03-20", "2026-09-22"]) {
        const { acimut } = alturaYAcimut(sol(s.sitio, d, orto(s.sitio, d)));
        expect(Math.abs(acimut - 90), d).toBeLessThan(0.5);
      }
    });

    it(`en ${s.nombre}, al nordeste en junio y al sudeste en diciembre: cos A = sen δ / cos φ`, () => {
      const esperado = (δ: number) =>
        (Math.acos(Math.sin((δ * Math.PI) / 180) / Math.cos((s.sitio.lat * Math.PI) / 180)) * 180) /
        Math.PI;
      const junio = alturaYAcimut(sol(s.sitio, "2026-06-21", orto(s.sitio, "2026-06-21")));
      const diciembre = alturaYAcimut(sol(s.sitio, "2026-12-21", orto(s.sitio, "2026-12-21")));
      expect(Math.abs(junio.acimut - esperado(OBLICUIDAD))).toBeLessThan(0.5);
      expect(Math.abs(diciembre.acimut - esperado(-OBLICUIDAD))).toBeLessThan(0.5);
    });
  }

  it("y el día dura lo que dura: en junio, más en Tenerife que en Asunción, y en diciembre al revés", () => {
    const largo = (s: { lat: number; lon: number }, d: string) =>
      2 * (pasoPorElMeridiano(s, d) - orto(s, d));
    // cos H = −tan φ · tan δ: 13 h 49 min en Los Rodeos, 10 h 26 min en
    // Asunción; y en diciembre, al revés: 10 h 11 min y 13 h 34 min.
    expect(Math.abs(largo(LOS_RODEOS, "2026-06-21") - 13.81)).toBeLessThan(0.1);
    expect(Math.abs(largo(ASUNCION, "2026-06-21") - 10.43)).toBeLessThan(0.1);
    expect(Math.abs(largo(LOS_RODEOS, "2026-12-21") - 10.19)).toBeLessThan(0.1);
    expect(Math.abs(largo(ASUNCION, "2026-12-21") - 13.57)).toBeLessThan(0.1);
  });
});

describe("un solo sol", () => {
  it("el del cielo, el de la Luna y el del relieve son el mismo", () => {
    const t = instanteDeLaHora(dia("2026-10-18"), 16, LOS_RODEOS.lon);
    const delCielo = cieloDe(t, LOS_RODEOS.lat, LOS_RODEOS.lon).sol;
    const aLaHora = sol(LOS_RODEOS, "2026-10-18", 16);
    for (let i = 0; i < 3; i++) expect(aLaHora[i]).toBeCloseTo(delCielo[i]!, 12);
  });

  it("y sin aeródromo extraído, el de Asunción", () => {
    expect(sitioDelCielo({})).toEqual({ lat: CIELO_DE_ASUNCION.lat, lon: CIELO_DE_ASUNCION.lon });
  });
});
