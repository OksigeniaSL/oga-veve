/**
 * La gente de la misión de Teno entera, sin navegador: espera, sube, se
 * vuelve si se despega antes y baja en Garachico. Las figuras son geometría
 * de three, que se construye sin tarjeta gráfica.
 */
import { describe, expect, it } from "vitest";
import {
  EXPLANADA_DEL_PUERTO_DE_GARACHICO as GARACHICO,
  GENTE_EN_TENO,
  LLANO_DEL_FARO_DE_TENO as LLANO,
} from "../content/missions";
import type { EmpiezaLaGente } from "../missions/gente";
import { aLocal } from "../missions/caminos-de-la-gente";
import { CUANTOS, GenteDeLaMisionDibujada } from "./gente-de-la-mision";

const llano = () => 20;
const nueva = () => new GenteDeLaMisionDibujada(llano, () => true);

/** Posado en un sitio, mirando al nordeste. */
const posado = (
  que: "suben" | "bajan",
  sitio: { x: number; z: number },
  quedan = que === "suben" ? 25 : 20,
): EmpiezaLaGente => ({
  que,
  sitio,
  donde: sitio,
  rumbo: Math.PI / 4,
  puerta: null,
  rotor: { radio: 7.8, cola: 9.375 },
  segundos: que === "suben" ? 25 : 20,
  quedan,
});

const enElSuelo = (s: { x: number; z: number }) => ({ x: s.x, z: s.z, enElSuelo: true });

function correr(g: GenteDeLaMisionDibujada, segundos: number, heli: { x: number; z: number; enElSuelo: boolean }) {
  for (let t = 0; t < segundos; t += 1 / 30) g.paso(1 / 30, heli);
}

describe("la gente de la misión", () => {
  it("espera junto al faro desde que empieza la misión, y se ve", () => {
    const g = nueva();
    g.esperan({ en: GENTE_EN_TENO, mirando: LLANO });
    correr(g, 0.5, { x: LLANO.x + 2000, z: LLANO.z, enElSuelo: false });
    const b = g.paraBanco;
    expect(b.fuera).toBe(CUANTOS);
    expect(b.visible).toBe(true);
    for (const s of b.sitios) expect(Math.hypot(s.x - GENTE_EN_TENO.x, s.z - GENTE_EN_TENO.z)).toBeLessThan(5);
    // Y lejos, ni se dibuja.
    correr(g, 0.1, { x: LLANO.x + 9000, z: LLANO.z, enElSuelo: false });
    expect(g.paraBanco.visible).toBe(false);
  });

  it("sube entera en los veinticinco segundos, el tripulante detrás, y la puerta se cierra", () => {
    const g = nueva();
    g.esperan({ en: GENTE_EN_TENO, mirando: LLANO });
    g.empieza(posado("suben", LLANO));
    expect(g.lista).toBe(false);
    correr(g, 3, enElSuelo(LLANO));
    expect(g.paraBanco.tripulante).toBe("fuera");
    expect(g.puertaAbierta).toBe(1);
    correr(g, 22, enElSuelo(LLANO));
    const b = g.paraBanco;
    expect(b.dentro).toBe(CUANTOS);
    expect(b.tripulante).toBe("dentro");
    expect(b.puerta).toBe(0);
    expect(g.lista).toBe(true);
  });

  it("si despega a medias, quien iba vuelve a su sitio y quien subió sigue dentro", () => {
    const g = nueva();
    g.esperan({ en: GENTE_EN_TENO, mirando: LLANO });
    g.empieza(posado("suben", LLANO));
    correr(g, 20.5, enElSuelo(LLANO));
    const dentro = g.paraBanco.dentro;
    expect(dentro).toBeGreaterThan(0);
    expect(dentro).toBeLessThan(CUANTOS);
    g.para();
    correr(g, 40, { x: LLANO.x, z: LLANO.z, enElSuelo: false });
    const b = g.paraBanco;
    expect(b.dentro).toBe(dentro);
    expect(b.andando).toBe(0);
    expect(b.tripulante).toBe("dentro");
    for (const s of b.sitios.filter((s) => s.estado === "fuera"))
      expect(Math.hypot(s.x - GENTE_EN_TENO.x, s.z - GENTE_EN_TENO.z)).toBeLessThan(5);
    // Y al volver, suben los que quedaban, aunque la espera ya vaya a medias.
    g.empieza(posado("suben", LLANO, 9));
    correr(g, 30, enElSuelo(LLANO));
    expect(g.paraBanco.dentro).toBe(CUANTOS);
    expect(g.lista).toBe(true);
  });

  it("en Garachico bajan, se apartan por delante, fuera del disco, y se quedan al despegar", () => {
    const g = nueva();
    g.esperan({ en: GENTE_EN_TENO, mirando: LLANO });
    g.empieza(posado("suben", LLANO));
    correr(g, 26, enElSuelo(LLANO));
    g.acaba();
    g.empieza(posado("bajan", GARACHICO));
    correr(g, 20, enElSuelo(GARACHICO));
    expect(g.lista).toBe(true);
    g.acaba();
    correr(g, 10, { x: GARACHICO.x, z: GARACHICO.z - 300, enElSuelo: false });
    const b = g.paraBanco;
    expect(b.fuera).toBe(CUANTOS);
    const p = { ...GARACHICO, rumbo: Math.PI / 4, rotor: 7.8, cola: 9.375, puerta: { adelante: 0.155, derecha: 1.13 } };
    for (const s of b.sitios) {
      const l = aLocal(p, s);
      expect(Math.hypot(l.f, l.r)).toBeGreaterThan(7.8 + 3);
      expect(l.f).toBeGreaterThan(0);
    }
  });

  it("y sin misión no hay nadie", () => {
    const g = nueva();
    g.esperan({ en: GENTE_EN_TENO, mirando: LLANO });
    g.esperan(null);
    correr(g, 0.2, enElSuelo(LLANO));
    expect(g.paraBanco.visible).toBe(false);
    expect(g.lista).toBe(true);
  });
});
