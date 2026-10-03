/**
 * El cielo de noche, comprobado contra el cielo de verdad.
 *
 * Las cifras esperadas no salen de este código: salen de PyEphem 4.2.1 —la
 * biblioteca de efemérides de Brandon Rhodes, sobre el libastro de XEphem—,
 * calculadas sin refracción para los mismos sitios e instantes, y de los
 * ejemplos resueltos del *Astronomical Algorithms* de Meeus. Si una cuenta de
 * aquí se tuerce, la estrella se va de su sitio y estas pruebas lo dicen en
 * grados.
 */

import { describe, expect, it } from "vitest";
import {
  alturaYAcimut,
  aplicar,
  CENTRO_DE_LA_CRUZ,
  cieloDe,
  CRUZ_DEL_SUR,
  GALACTICAS_DESDE_J2000,
  instanteDeLaHora,
  mundoDesdeJ2000,
  POLAR,
  precesion,
  siglos,
  solDeVerdad,
  lunaDeVerdad,
  tiempoSidereo,
  traspuesta,
  unitario,
  type Mat3,
  type Vec3,
} from "./cielo-de-noche";
import { horaSolarEn } from "./hora";

/** Asunción, la ciudad; y el punto de referencia de Los Rodeos. */
const ASUNCION = { lat: -25.2637, lon: -57.5759 };
const TENERIFE_NORTE = { lat: 28.482752, lon: -16.341707 };

/** Dónde se ve una estrella del catálogo, en grados. */
function donde(
  e: { ra: number; dec: number },
  sitio: { lat: number; lon: number },
  dia: string,
  hora: number,
): { altura: number; acimut: number } {
  const t = instanteDeLaHora(new Date(`${dia}T12:00:00Z`), hora, sitio.lon);
  const m = mundoDesdeJ2000(t, sitio.lat, sitio.lon);
  return alturaYAcimut(aplicar(m, unitario(e.ra, e.dec)));
}

describe("el reloj de las estrellas", () => {
  it("el tiempo sidéreo de Greenwich, el del ejemplo 12.a de Meeus", () => {
    // 10 de abril de 1987 a las 0 h UT: 13 h 10 min 46,3668 s.
    const t = new Date(Date.UTC(1987, 3, 10, 0, 0, 0));
    expect(tiempoSidereo(t)).toBeCloseTo(197.693195, 4);
  });

  it("la precesión: θ de Perseo en 2028, la estrella del ejemplo 21.b de Meeus", () => {
    /*
     * J2000: 2 h 44 min 11,986 s y +49° 13′ 42,48″, con su movimiento propio
     * sumado hasta el 13 de noviembre de 2028 a las 4:33 —28,867 años—.
     * PyEphem la lleva a 41,551337° y +49,348473°.
     */
    const ra0 = 41.054063 + 0.0041196;
    const dec0 = 49.228467 - 0.00071767;
    const T = (2_462_088.69 - 2_451_545) / 36_525;
    const [x, y, z] = aplicar(precesion(T), unitario(ra0, dec0));
    const ra = (Math.atan2(y, x) * 180) / Math.PI;
    const dec = (Math.asin(z) * 180) / Math.PI;
    expect(ra).toBeCloseTo(41.551337, 4);
    expect(dec).toBeCloseTo(49.348473, 4);
  });

  it("la hora solar y el instante son la misma cosa vista desde dos sitios", () => {
    // Si la hora es la de ahora en el sitio, el instante es ahora.
    const ahora = new Date(Date.UTC(2026, 9, 3, 23, 17, 0));
    const hora = horaSolarEn(ASUNCION.lon, ahora);
    const t = instanteDeLaHora(ahora, hora, ASUNCION.lon);
    expect(Math.abs(t.getTime() - ahora.getTime())).toBeLessThan(1000);
  });

  it("y las once de la noche en Asunción son ya mañana en Greenwich, con el cielo de esta noche", () => {
    const t = instanteDeLaHora(new Date(Date.UTC(2026, 9, 3, 15)), 23, ASUNCION.lon);
    expect(t.toISOString().slice(0, 13)).toBe("2026-10-04T02");
  });
});

describe("la Cruz del Sur, desde Asunción una noche de octubre", () => {
  /*
   * En octubre la Cruz es de madrugada: al anochecer se está poniendo por el
   * sudoeste, rozando el horizonte, y al amanecer vuelve a estar alta por el
   * sudeste. Es lo que se ve de verdad, y por eso se mira a las cinco.
   */
  it("a las cinco de la madrugada del 15, alta sobre el sudeste", () => {
    const acrux = donde(CRUZ_DEL_SUR.acrux, ASUNCION, "2026-10-15", 5);
    expect(acrux.altura).toBeCloseTo(23.237, 1);
    expect(acrux.acimut).toBeCloseTo(150.683, 1);
    const gacrux = donde(CRUZ_DEL_SUR.gacrux, ASUNCION, "2026-10-15", 5);
    expect(gacrux.altura).toBeCloseTo(21.432, 1);
    expect(gacrux.acimut).toBeCloseTo(144.482, 1);
  });

  it("y a las siete y media de la tarde, poniéndose por el sudoeste", () => {
    const acrux = donde(CRUZ_DEL_SUR.acrux, ASUNCION, "2026-10-15", 19.5);
    expect(acrux.altura).toBeCloseTo(6.862, 1);
    expect(acrux.acimut).toBeCloseTo(200.328, 1);
    const delta = donde(CRUZ_DEL_SUR.delta, ASUNCION, "2026-10-15", 19.5);
    expect(delta.altura).toBeCloseTo(2.729, 1);
  });

  it("y su palo largo apunta al sur: de Gácrux a Ácrux, hacia el polo del cielo", () => {
    const t = instanteDeLaHora(new Date("2026-10-15T12:00:00Z"), 5, ASUNCION.lon);
    const m = mundoDesdeJ2000(t, ASUNCION.lat, ASUNCION.lon);
    const g = aplicar(m, unitario(CRUZ_DEL_SUR.gacrux.ra, CRUZ_DEL_SUR.gacrux.dec));
    const a = aplicar(m, unitario(CRUZ_DEL_SUR.acrux.ra, CRUZ_DEL_SUR.acrux.dec));
    // Prolongado cuatro veces y media desde Ácrux, el palo cae en el polo sur
    // del cielo: a la altura de la latitud, sobre el sur.
    const paso: Vec3 = [a[0] - g[0], a[1] - g[1], a[2] - g[2]];
    const fin: Vec3 = [a[0] + 4.5 * paso[0], a[1] + 4.5 * paso[1], a[2] + 4.5 * paso[2]];
    const l = Math.hypot(...fin);
    const polo = alturaYAcimut([fin[0] / l, fin[1] / l, fin[2] / l]);
    expect(Math.abs(polo.altura - Math.abs(ASUNCION.lat))).toBeLessThan(3);
    expect(Math.abs(polo.acimut - 180)).toBeLessThan(5);
  });

  it("y el centro de la Cruz es el de sus cuatro brillantes", () => {
    // En ecuatoriales, la Z es el polo: su arcoseno es la declinación.
    const dec = (Math.asin(CENTRO_DE_LA_CRUZ[2]) * 180) / Math.PI;
    expect(dec).toBeCloseTo(-59.67, 1);
  });
});

describe("la Polar, desde Tenerife", () => {
  it("sobre el norte, a la altura de la latitud", () => {
    for (const hora of [21, 3]) {
      const p = donde(POLAR, TENERIFE_NORTE, "2026-10-03", hora);
      /*
       * La Polar está a dos tercios de grado del polo y da una vuelta a su
       * alrededor cada día: su altura es la latitud más o menos eso. El polo
       * del cielo, exacto, está a la altura de la latitud: ver abajo.
       */
      expect(Math.abs(p.altura - TENERIFE_NORTE.lat)).toBeLessThan(0.75);
      expect(Math.min(p.acimut, 360 - p.acimut)).toBeLessThan(1.5);
    }
    expect(donde(POLAR, TENERIFE_NORTE, "2026-10-03", 21).altura).toBeCloseTo(28.596, 1);
    expect(donde(POLAR, TENERIFE_NORTE, "2026-10-03", 3).altura).toBeCloseTo(29.1, 1);
  });

  it("y el polo del cielo, exactamente a la altura de la latitud", () => {
    const t = instanteDeLaHora(new Date("2026-10-03T12:00:00Z"), 21, TENERIFE_NORTE.lon);
    const m = mundoDesdeJ2000(t, TENERIFE_NORTE.lat, TENERIFE_NORTE.lon);
    // El polo de la fecha, llevado a J2000: la precesión al revés.
    const polo = aplicar(traspuesta(precesion(siglos(t))), [0, 0, 1]);
    const p = alturaYAcimut(aplicar(m, polo));
    expect(p.altura).toBeCloseTo(TENERIFE_NORTE.lat, 6);
  });

  it("y desde Asunción, nunca: está bajo el horizonte toda la noche", () => {
    for (let hora = 0; hora < 24; hora += 2)
      expect(donde(POLAR, ASUNCION, "2026-10-03", hora).altura).toBeLessThan(0);
  });
});

describe("la Luna, en su fase y en su sitio", () => {
  const CASOS = [
    // La madrugada del 4 de octubre: menguante, a un día del cuarto.
    { sitio: ASUNCION, dia: "2026-10-04", hora: 2, altura: 5.25, acimut: 58.359, fase: 0.4227 },
    { sitio: TENERIFE_NORTE, dia: "2026-10-04", hora: 2, altura: 29.645, acimut: 75.569, fase: 0.4357 },
    // Y creciente, alta al anochecer del 20.
    { sitio: ASUNCION, dia: "2026-10-20", hora: 21, altura: 69.175, acimut: 300.216, fase: 0.7223 },
  ];
  for (const c of CASOS)
    it(`${c.dia} a las ${c.hora} en ${c.sitio === ASUNCION ? "Asunción" : "Tenerife"}`, () => {
      const t = instanteDeLaHora(new Date(`${c.dia}T12:00:00Z`), c.hora, c.sitio.lon);
      const cielo = cieloDe(t, c.sitio.lat, c.sitio.lon);
      const l = alturaYAcimut(cielo.luna);
      // Las fórmulas de baja precisión: tres décimas de grado.
      expect(Math.abs(l.altura - c.altura)).toBeLessThan(0.5);
      expect(Math.abs(l.acimut - c.acimut)).toBeLessThan(0.6);
      expect(Math.abs(cielo.fase - c.fase)).toBeLessThan(0.01);
    });

  it("el 12 de agosto de 2026, el eclipse total de sol que cruzó España: Luna y Sol juntos", () => {
    const T = siglos(new Date(Date.UTC(2026, 7, 12, 17, 46)));
    const s = solDeVerdad(T);
    const l = lunaDeVerdad(T).direccion;
    const separacion =
      (Math.acos(s[0] * l[0] + s[1] * l[1] + s[2] * l[2]) * 180) / Math.PI;
    // Desde el centro de la Tierra, menos de un grado: desde España, encima.
    expect(separacion).toBeLessThan(1);
  });

  it("y el norte de la Luna, cabeza abajo en Paraguay respecto a Canarias", () => {
    /*
     * La misma noche y la misma Luna: el norte de su disco apunta hacia el
     * cenit en Canarias y hacia el horizonte en Paraguay. Es por lo que la
     * cara de la Luna se ve al revés en cada hemisferio.
     */
    const arribaEn = (sitio: { lat: number; lon: number }): number => {
      const t = instanteDeLaHora(new Date("2026-10-20T12:00:00Z"), 21, sitio.lon);
      const c = cieloDe(t, sitio.lat, sitio.lon);
      // La parte del norte de la Luna que va hacia arriba en la pantalla.
      const d = c.luna;
      const n = c.norteDeLaLuna;
      const k = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
      return n[1] - k * d[1];
    };
    expect(arribaEn(TENERIFE_NORTE)).toBeGreaterThan(0);
    expect(arribaEn(ASUNCION)).toBeLessThan(0);
  });
});

describe("la Vía Láctea", () => {
  it("la matriz galáctica es una rotación", () => {
    const m: Mat3 = GALACTICAS_DESDE_J2000;
    const p = aplicar(m, aplicar(traspuesta(m), [0.3, -0.5, 0.81]));
    expect(p[0]).toBeCloseTo(0.3, 6);
    expect(p[1]).toBeCloseTo(-0.5, 6);
    expect(p[2]).toBeCloseTo(0.81, 6);
  });

  it("y pone el centro de la galaxia en Sagitario", () => {
    // Sgr A*: 17 h 45 min 40 s, −29° 00′ 28″.
    const g = aplicar(GALACTICAS_DESDE_J2000, unitario(266.41683, -29.00781));
    expect(g[0]).toBeGreaterThan(0.9999);
  });
});
