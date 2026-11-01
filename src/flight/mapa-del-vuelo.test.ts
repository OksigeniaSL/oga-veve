/**
 * El mapa del respaldo tiene que decir lo mismo que la ruta y enseñar lo que
 * dice enseñar: que el camino más corto, en plano, sale curvo.
 */
import { describe, expect, it } from "vitest";
import { COSTAS_DE_LA_RUTA } from "../ui/costas-de-la-ruta";
import {
  avionEnElMapa,
  barrigaDelCamino,
  caminoEnElMapa,
  enElMapa,
  ENCUADRE,
  PROPORCION_DEL_MAPA,
  sitioEnElMapa,
} from "./mapa-del-vuelo";
import {
  BARAJAS,
  cruceDelEcuador,
  DE_MADRID_A_ASUNCION,
  dondeVa,
  horarioDelDia,
  perfilDelVuelo,
  PETTIROSSI,
  SITIOS_DEL_CAMINO,
} from "./ruta-larga";

const perfil = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));

describe("La proyección", () => {
  it("es 16:10, la de la pantalla, y a la misma escala en los dos ejes", () => {
    expect(PROPORCION_DEL_MAPA).toBeCloseTo(1.6, 5);
  });

  it("pone el norte arriba y el este a la derecha", () => {
    expect(enElMapa(ENCUADRE.oeste, ENCUADRE.norte)).toEqual({ x: 0, y: 0 });
    expect(enElMapa(ENCUADRE.este, ENCUADRE.sur)).toEqual({ x: 1, y: 1 });
  });

  it("deja ver Madrid y Asunción, sin apurar el borde", () => {
    for (const s of [BARAJAS, PETTIROSSI]) {
      const p = sitioEnElMapa(s);
      expect(p.x).toBeGreaterThan(0.15);
      expect(p.x).toBeLessThan(0.85);
      expect(p.y).toBeGreaterThan(0.1);
      expect(p.y).toBeLessThan(0.9);
    }
  });
});

describe("El camino", () => {
  it("va de Madrid a Asunción", () => {
    const c = caminoEnElMapa();
    expect(c[0]!.x).toBeCloseTo(sitioEnElMapa(BARAJAS).x, 6);
    expect(c[c.length - 1]!.y).toBeCloseTo(sitioEnElMapa(PETTIROSSI).y, 6);
  });

  it("sale curvo: se aparta de la recta más de un tres por ciento", () => {
    expect(Math.abs(barrigaDelCamino())).toBeGreaterThan(0.03);
  });

  it("y toda la barriga va hacia el mismo lado, no es un quiebro", () => {
    const c = caminoEnElMapa();
    const a = c[0]!;
    const b = c[c.length - 1]!;
    // Sin el último tramo: la curva y la recta se juntan al llegar, y ahí el signo baila en la décima de píxel.
    const cerca = c.slice(3, Math.floor(c.length * 0.85));
    const lados = new Set(
      cerca.map((p) => Math.sign((b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y))),
    );
    expect(lados.size).toBe(1);
  });

  it("pasa por encima de El Hierro y cruza el ecuador donde dice la ruta", () => {
    const hierro = sitioEnElMapa(SITIOS_DEL_CAMINO.valverde);
    const c = caminoEnElMapa();
    const cerca = Math.min(...c.map((p) => Math.hypot((p.x - hierro.x) * PROPORCION_DEL_MAPA, p.y - hierro.y)));
    expect(cerca).toBeLessThan(0.01);
    const ecuador = cruceDelEcuador(DE_MADRID_A_ASUNCION)!;
    expect(sitioEnElMapa(ecuador.sitio).y).toBeCloseTo(enElMapa(0, 0).y, 6);
  });
});

describe("El avión en el mapa", () => {
  it("va donde dice la ruta a esa hora del vuelo", () => {
    for (const t of [0, 3600, 4 * 3600, 7 * 3600, 10 * 3600]) {
      const a = avionEnElMapa(perfil, t);
      const d = dondeVa(perfil, t);
      expect(a.recorrido).toBeCloseTo(d.recorrido, 3);
      expect(a.x).toBeCloseTo(sitioEnElMapa(d.sitio).x, 6);
      expect(a.y).toBeCloseTo(sitioEnElMapa(d.sitio).y, 6);
    }
  });

  it("avanza con la hora, hacia el suroeste, y apunta por donde va el camino", () => {
    let antes = avionEnElMapa(perfil, 600);
    for (let t = 1800; t < perfil.enElAire; t += 1800) {
      const a = avionEnElMapa(perfil, t);
      expect(a.x).toBeLessThan(antes.x);
      expect(a.y).toBeGreaterThan(antes.y);
      // Hacia abajo y a la izquierda: del sur al oeste, de −π a −π/2.
      expect(a.apunta).toBeLessThan(-Math.PI / 2);
      expect(a.apunta).toBeGreaterThan(-Math.PI);
      antes = a;
    }
  });

  it("en el puesto de Barajas está en Madrid, sin salirse del camino", () => {
    const a = avionEnElMapa(perfil, -3000);
    expect(a.recorrido).toBe(0);
    expect(a.x).toBeCloseTo(sitioEnElMapa(BARAJAS).x, 6);
    expect(Number.isFinite(a.apunta)).toBe(true);
  });
});

describe("Las costas de Natural Earth", () => {
  it("son solo las que caen cerca de la ruta, y sin pasarse de peso", () => {
    const puntos = COSTAS_DE_LA_RUTA.flat();
    expect(puntos.length).toBeLessThan(4000);
    for (const [lon, lat] of puntos) {
      expect(lon).toBeGreaterThanOrEqual(-110);
      expect(lon).toBeLessThanOrEqual(48);
      expect(lat).toBeGreaterThanOrEqual(-45);
      expect(lat).toBeLessThanOrEqual(58);
    }
  });

  it("traen las islas que se cuentan: alguna costa pasa por Canarias y otra por Cabo Verde", () => {
    const hay = (oeste: number, este: number, sur: number, norte: number): boolean =>
      COSTAS_DE_LA_RUTA.some((c) => c.every(([lon, lat]) => lon > oeste && lon < este && lat > sur && lat < norte));
    expect(hay(-19, -13, 27, 30)).toBe(true);
    expect(hay(-26, -22, 14, 18)).toBe(true);
  });

  it("y el mapa tiene tierra a los dos lados del Atlántico", () => {
    const enTierra = (lon: number, lat: number): boolean =>
      COSTAS_DE_LA_RUTA.some((c) => {
        // Rayo por los lados del polígono: dentro si cruza un número impar.
        let dentro = false;
        for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
          const [xi, yi] = c[i]!;
          const [xj, yj] = c[j]!;
          if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
        }
        return dentro;
      });
    expect(enTierra(-3.5, 40.5)).toBe(true); // Madrid
    expect(enTierra(-57.5, -25.2)).toBe(true); // Asunción
    expect(enTierra(-30, 10)).toBe(false); // el Atlántico
  });
});
