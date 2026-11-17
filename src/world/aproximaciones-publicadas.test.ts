/**
 * Lo que imprime cada carta de aproximación, contra lo que ya tiene el juego:
 * el procedimiento transcrito de esa misma carta y el umbral de su pista. Ver
 * `aproximaciones-publicadas.ts`.
 *
 * Es lo que hace fiable una transcripción a mano: casi todas las cifras de
 * una carta se pueden sacar de otras dos —la OCA de su OCH y de la cota, la
 * altura de la senda de su ángulo y de la distancia—, y si una se copió mal,
 * deja de cuadrar.
 */

import { describe, expect, it } from "vitest";
import {
  APROXIMACIONES,
  PENDIENTES,
  cartaDeAproximacion,
  gradosDeLaCarta,
  type CartaDeAproximacion,
  type PuntoDelPerfil,
} from "./aproximaciones-publicadas";
import { CANARIAS } from "./procedimientos-canarias";
import { PARAGUAY } from "./procedimientos-paraguay";
import { procedimientosDe } from "./procedimientos";
import { SCENARIOS as SIN_COMPLETAR, conSuAerodromo, oaciDe } from "./scenarios";
import { dondeCae } from "./entre-aerodromos";

const SCENARIOS = await Promise.all(SIN_COMPLETAR.map(conSuAerodromo));

const PIE = 0.3048;
const MILLA = 1852;

const metros = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const { x, z } = dondeCae(a, b);
  return Math.hypot(x, z);
};

const enGrados = (p: { readonly lat: string; readonly lon: string }) => ({
  lat: gradosDeLaCarta(p.lat),
  lon: gradosDeLaCarta(p.lon),
});

const todas: { oaci: string; cabecera: string; c: CartaDeAproximacion }[] = Object.entries(APROXIMACIONES).flatMap(
  ([oaci, porCabecera]) => Object.entries(porCabecera).map(([cabecera, c]) => ({ oaci, cabecera, c })),
);

const conNombre = (p: PuntoDelPerfil): p is PuntoDelPerfil & { lat: string; lon: string } =>
  p.lat !== undefined && p.lon !== undefined;

describe("las coordenadas de la carta", () => {
  it("lee las de ENAIRE y las de la tabla de codificación de la DINAC", () => {
    expect(gradosDeLaCarta("283119.1N")).toBeCloseTo(28 + 31 / 60 + 19.1 / 3600, 8);
    expect(gradosDeLaCarta("S 25:20:10.57")).toBeCloseTo(-(25 + 20 / 60 + 10.57 / 3600), 8);
    expect(gradosDeLaCarta("W 57:32:33.36")).toBeCloseTo(-(57 + 32 / 60 + 33.36 / 3600), 8);
    expect(() => gradosDeLaCarta("25:20")).toThrow();
  });
});

describe("cada aproximación del juego, o con su carta o pendiente", () => {
  it("las de todos los campos con procedimiento publicado, transcritas", () => {
    for (const [oaci, cab] of [
      ["GCXO", "12"], ["GCXO", "30"], ["GCTS", "07"], ["GCTS", "25"],
      ["GCLP", "03L"], ["GCLP", "21R"], ["SGAS", "02"], ["SGAS", "20"],
      ["GCFV", "01"], ["GCFV", "19"], ["GCRR", "03"], ["GCLA", "36"],
      ["SGES", "05"], ["SGES", "23"], ["SGME", "01"], ["SGME", "19"],
      ["SGPJ", "03"], ["SGPJ", "21"], ["SGEN", "20"], ["GCRR", "21"], ["GCLA", "18"],
    ] as const)
      expect(cartaDeAproximacion(oaci, cab), `${oaci} ${cab}`).not.toBeNull();
    expect(cartaDeAproximacion("gcxo", "12")?.carta).toMatch(/IAC 1/);
    expect(cartaDeAproximacion(null, null)).toBeNull();
  });

  it("toda aproximación publicada del juego está transcrita o en la lista de pendientes, y no en las dos", () => {
    for (const [oaci, p] of Object.entries({ ...CANARIAS, ...PARAGUAY }))
      for (const cabecera of Object.keys(p.aproximaciones)) {
        const hecha = APROXIMACIONES[oaci]?.[cabecera] !== undefined;
        const pendiente = PENDIENTES[oaci]?.[cabecera] !== undefined;
        expect(hecha !== pendiente, `${oaci} ${cabecera}`).toBe(true);
      }
    for (const [oaci, porCabecera] of Object.entries(PENDIENTES))
      for (const [cabecera, por] of Object.entries(porCabecera)) {
        expect(procedimientosDe(oaci)?.aproximaciones[cabecera], `${oaci} ${cabecera}`).toBeDefined();
        expect(por.length, `${oaci} ${cabecera}`).toBeGreaterThan(0);
      }
  });

  it("cada carta es la del procedimiento que ya vuela el juego, con el mismo nombre", () => {
    for (const { oaci, cabecera, c } of todas)
      expect(procedimientosDe(oaci)?.aproximaciones[cabecera]?.carta, `${oaci} ${cabecera}`).toBe(c.carta);
  });

  it("cada dato lleva su fuente: el AIP, la página y la enmienda", () => {
    for (const { oaci, cabecera, c } of todas) {
      expect(c.fuente, `${oaci} ${cabecera}`).toMatch(/^AIP (España, ENAIRE|Paraguay, DINAC)/);
      expect(c.fuente, `${oaci} ${cabecera}`).toMatch(/IAC \d+[.-]\d|AD 2\.\d+-\d+/);
      // La enmienda: AIRAC, o la de fuera de ciclo de ENAIRE, «AMDT 408/26».
      expect(c.fuente, `${oaci} ${cabecera}`).toMatch(/AIRAC|AMDT \d+\/\d+/);
      // Y la fecha de la página.
      expect(c.fuente, `${oaci} ${cabecera}`).toMatch(/\d\d[- ][A-Z]{3}[- ]\d\d/);
    }
  });
});

describe("el perfil vertical", () => {
  it("sus puntos con nombre son los del procedimiento: mismo nombre, a menos de 50 m y a la misma altitud", () => {
    for (const { oaci, cabecera, c } of todas) {
      const ramas = procedimientosDe(oaci)!.aproximaciones[cabecera]!.ramas;
      const delProcedimiento = ramas.flat();
      for (const p of c.perfil.puntos.filter(conNombre)) {
        const q = delProcedimiento.find((x) => x.nombre === p.nombre);
        /*
         * Salvo el punto de frustrada de la 18 de La Palma, LA510: el juego
         * deja la carta en LA505 y sigue a la vista al eje (`aLaVista`), así
         * que su procedimiento no llega a él.
         */
        if (!q && `${oaci} ${cabecera} ${p.nombre}` === "GCLA 18 LA510") continue;
        expect(q, `${oaci} ${cabecera} ${p.nombre}`).toBeDefined();
        expect(metros(enGrados(p), q!), `${oaci} ${cabecera} ${p.nombre}`).toBeLessThan(50);
        if (p.pies !== null && q!.minimaPies !== null) expect(p.pies, `${oaci} ${cabecera} ${p.nombre}`).toBe(q!.minimaPies);
        // Y el mismo papel: el intermedio es el intermedio, y el de final, el de final.
        if (p.rotulo === "IF") expect(q!.papel, `${oaci} ${cabecera} ${p.nombre}`).toBe("if");
        if (p.rotulo === "FAP" || p.rotulo === "FAF") expect(q!.papel, `${oaci} ${cabecera} ${p.nombre}`).toBe("faf");
      }
      /*
       * Todas las ramas pasan por el intermedio del perfil y por su punto de
       * final, y las directas acaban en él. La 21 de Lanzarote sigue hasta su
       * punto de frustrada, RR551, que es el último de su perfil.
       */
      const intermedio = c.perfil.puntos.find((p) => p.rotulo === "IF")!.nombre;
      const final = c.perfil.puntos.find((p) => p.rotulo === "FAP" || p.rotulo === "FAF")!.nombre;
      const ultimo = c.perfil.puntos[c.perfil.puntos.length - 1]!.nombre;
      for (const r of ramas) {
        const nombres = r.map((x) => x.nombre);
        expect(nombres, `${oaci} ${cabecera}`).toContain(intermedio);
        expect(nombres, `${oaci} ${cabecera}`).toContain(final);
        if (c.final === "circuito") expect([final, ultimo], `${oaci} ${cabecera}`).toContain(nombres[nombres.length - 1]);
        else expect(nombres[nombres.length - 1], `${oaci} ${cabecera}`).toBe(final);
      }
    }
  });

  /*
   * **La 19 de Fuerteventura** tenía TUVIL como un punto más de la ruta, sin
   * ningún «if» en la rama, y su carta lo rotula «(IF)» en la planta y en el
   * perfil (IAC 16.1). Ya es el intermedio; que no vuelva a faltar en ninguna.
   */
  it("toda aproximación del juego tiene su intermedio, el que rotula la carta", () => {
    const sinIf = todas
      .filter(({ oaci, cabecera }) => !procedimientosDe(oaci)!.aproximaciones[cabecera]!.ramas.flat().some((p) => p.papel === "if"))
      .map(({ oaci, cabecera }) => `${oaci} ${cabecera}`);
    expect(sinIf).toEqual([]);
  });

  it("cada punto con nombre está a las millas que dice la carta de su umbral, o de su MAPt en circuito", () => {
    for (const { oaci, cabecera, c } of todas) {
      const umbral = enGrados(c.perfil.hasta);
      for (const p of c.perfil.puntos.filter(conNombre)) {
        const millas = metros(umbral, enGrados(p)) / MILLA;
        /*
         * La tabla codificada da décimas de milla por tramo, y la distancia del
         * intermedio es la suma de dos tramos: hasta una décima de redondeo,
         * 12,6 en la carta por 12,70 medidas del LIRBU de la 01 de
         * Fuerteventura. Y en la final, media décima.
         */
        const holgura = p.rotulo === "IF" || p.rotulo === undefined ? 0.11 : 0.06;
        expect(Math.abs(millas - p.millas), `${oaci} ${cabecera} ${p.nombre}: ${millas.toFixed(2)}`).toBeLessThan(holgura);
      }
    }
  });

  it("el umbral de la carta es el de la pista del juego, a menos de cien metros", () => {
    for (const { oaci, cabecera, c } of todas) {
      if (c.final === "circuito") continue;
      const esc = SCENARIOS.find((e) => oaciDe(e) === oaci)!;
      const o = esc.aerodrome!.origin;
      const pista = esc.aerodrome!.runways.find((r) => r.thresholds[cabecera])!;
      const t = pista.thresholds[cabecera]!;
      const otro = Object.entries(pista.thresholds).find(([n]) => n !== cabecera)![1]!.xy!;
      // El de aterrizaje: en Fuerteventura y en la 36 de La Palma, desplazado pista adentro.
      const largo = Math.hypot(otro[0] - t.xy![0], otro[1] - t.xy![1]) || 1;
      const k = (t.displacedM ?? 0) / largo;
      const ux = t.xy![0] + (otro[0] - t.xy![0]) * k;
      const uy = t.xy![1] + (otro[1] - t.xy![1]) * k;
      const { x, z } = dondeCae(o, enGrados(c.perfil.hasta));
      const d = Math.hypot(x - ux, -z - uy);
      expect(d, `${oaci} ${cabecera}`).toBeLessThan(100);
    }
  });

  it("las altitudes bajan hacia el umbral, en los puntos y en la tabla", () => {
    for (const { oaci, cabecera, c } of todas) {
      const { puntos, tabla } = c.perfil;
      for (let i = 1; i < puntos.length; i++) expect(puntos[i]!.millas, `${oaci} ${cabecera}`).toBeLessThan(puntos[i - 1]!.millas);
      const conAltitud = puntos.filter((p) => p.pies !== null);
      for (let i = 1; i < conAltitud.length; i++)
        expect(conAltitud[i]!.pies!, `${oaci} ${cabecera} ${conAltitud[i]!.nombre}`).toBeLessThanOrEqual(conAltitud[i - 1]!.pies!);
      for (let i = 1; i < tabla.length; i++) {
        expect(tabla[i]!.millas, `${oaci} ${cabecera}`).toBeLessThan(tabla[i - 1]!.millas);
        expect(tabla[i]!.pies, `${oaci} ${cabecera}`).toBeLessThan(tabla[i - 1]!.pies);
      }
      // Y todo por encima de la cota a la que se refiere.
      for (const p of conAltitud) expect(p.pies!, `${oaci} ${cabecera} ${p.nombre}`).toBeGreaterThan(c.perfil.cotaPies);
      expect(puntos[puntos.length - 1]!.millas, `${oaci} ${cabecera}`).toBe(0);
    }
  });

  it("la altura entre paréntesis es la altitud menos la cota a la que se refiere", () => {
    for (const { oaci, cabecera, c } of todas) {
      const u = c.perfil.cotaPies;
      // ENAIRE redondea la altitud y la altura de la tabla a decenas, cada una por su lado.
      for (const p of c.perfil.puntos)
        if (p.alturaPies !== undefined) expect(Math.abs(p.pies! - u - p.alturaPies), `${oaci} ${cabecera} ${p.nombre}`).toBeLessThanOrEqual(10);
      for (const f of c.perfil.tabla) expect(Math.abs(f.pies - u - f.alturaPies), `${oaci} ${cabecera} ${f.millas}`).toBeLessThanOrEqual(10);
    }
  });

  it("la tabla de la senda es la de su ángulo y su altura de cruce del umbral", () => {
    for (const { oaci, cabecera, c } of todas) {
      const { sendaGrados, rdhPies, tabla } = c.perfil;
      // Las de circuito no tienen senda, ni tabla, ni RDH; las directas, todo.
      if (c.final === "circuito") {
        expect([sendaGrados, rdhPies, tabla.length], `${oaci} ${cabecera}`).toEqual([null, null, 0]);
        continue;
      }
      if (sendaGrados === null || rdhPies === null) throw new Error(`${oaci} ${cabecera}: directa sin senda`);
      expect(tabla.length, `${oaci} ${cabecera}`).toBeGreaterThan(0);
      const tan = Math.tan((sendaGrados * Math.PI) / 180);
      for (const f of tabla) {
        const enLaSenda = rdhPies + (f.millas * MILLA * tan) / PIE;
        /*
         * Cincuenta pies: ENAIRE cuenta la curvatura de la Tierra, que a cinco
         * millas sube la senda unos treinta, y redondea a la decena.
         */
        expect(Math.abs(f.alturaPies - enLaSenda), `${oaci} ${cabecera} ${f.millas} NM`).toBeLessThan(50);
      }
      expect(sendaGrados).toBeGreaterThanOrEqual(2.5);
      expect(sendaGrados).toBeLessThanOrEqual(3.5);
      expect(rdhPies).toBeGreaterThanOrEqual(40);
      expect(rdhPies).toBeLessThanOrEqual(60);
    }
  });
});

describe("los mínimos, la MSA y la frustrada", () => {
  it("la OCA es la OCH más la cota sobre la que se mide, y no baja de la categoría A a la D", () => {
    for (const { oaci, cabecera, c } of todas) {
      expect(c.minimos.length, `${oaci} ${cabecera}`).toBeGreaterThan(0);
      for (const m of c.minimos) {
        // Las que tienen mínimos, en orden; la que la carta da «N.A» no está.
        const filas = (["A", "B", "C", "D"] as const).flatMap((k) => m.porCategoria[k] ?? []);
        // Al menos A, B y C, y si falta una, es de la cola: un avión más rápido.
        expect(filas.length, `${oaci} ${cabecera} ${m.tipo}`).toBeGreaterThanOrEqual(3);
        expect(m.porCategoria.A && m.porCategoria.B && m.porCategoria.C, `${oaci} ${cabecera} ${m.tipo}`).toBeTruthy();
        for (const f of filas)
          // Cada una redondeada por su lado, a la decena de pies por arriba.
          expect(Math.abs(f.oca - f.och - m.sobrePies), `${oaci} ${cabecera} ${m.tipo}`).toBeLessThanOrEqual(10);
        for (let i = 1; i < filas.length; i++) expect(filas[i]!.oca, `${oaci} ${cabecera} ${m.tipo}`).toBeGreaterThanOrEqual(filas[i - 1]!.oca);
        // Y la directa se mide sobre el umbral.
        if (!m.tipo.startsWith("CIRCLING")) expect(m.sobrePies, `${oaci} ${cabecera} ${m.tipo}`).toBe(c.perfil.cotaPies);
      }
    }
  });

  it("la altitud mínima cubre el círculo entero y libra más que la final", () => {
    for (const { oaci, cabecera, c } of todas) {
      const { sectores, radioMillas } = c.msa;
      expect(radioMillas, `${oaci} ${cabecera}`).toBe(25);
      const grados = sectores.reduce((s, x) => s + ((x.hasta - x.desde + 360) % 360 || 360), 0);
      expect(grados, `${oaci} ${cabecera}`).toBe(360);
      const masAlto = Math.max(...c.perfil.puntos.map((p) => p.pies ?? 0));
      for (const s of sectores) expect(s.pies, `${oaci} ${cabecera}`).toBeGreaterThanOrEqual(masAlto);
    }
  });

  it("la frustrada va en inglés, como la publica la carta, y sube a la altitud que dice su texto", () => {
    for (const { oaci, cabecera, c } of todas) {
      const { texto, pies, maximaPies } = c.frustrada;
      expect(texto, `${oaci} ${cabecera}`).toMatch(/^MISSED (APCH|APPROACH):/);
      expect(texto, `${oaci} ${cabecera}`).toMatch(/CLIMB/);
      expect(texto, `${oaci} ${cabecera}`).toContain(String(pies));
      if (maximaPies !== undefined) expect(texto, `${oaci} ${cabecera}`).toContain(String(maximaPies));
      expect(pies, `${oaci} ${cabecera}`).toBeGreaterThan(c.perfil.cotaPies);
      if (c.altitudDeTransicion !== null) expect(c.altitudDeTransicion, `${oaci} ${cabecera}`).toBeGreaterThanOrEqual(3000);
    }
  });

  it("las LPV de Canarias llevan el SUP que las deja fuera de servicio", () => {
    for (const { oaci, cabecera, c } of todas)
      if (/LPV/.test(c.carta)) expect(c.notas?.some((n) => /SUP 15[5-9]\/26/.test(n)), `${oaci} ${cabecera}`).toBe(true);
  });
});
