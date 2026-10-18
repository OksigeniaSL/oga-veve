import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";
import {
  BASE,
  CIMA,
  escenaDeLaTormenta,
  radioDelEco,
  RADIO_DEL_ECO,
} from "../flight/practica-de-tormenta";
import {
  acercarParaVerse,
  bolasDelCumulonimbo,
  caminoDelRayo,
  crearCumulonimbo,
} from "./cumulonimbo";

const ESCENA = escenaDeLaTormenta({ x: 0, z: 0 }, 0);

describe("la forma del cumulonimbo", () => {
  const bolas = bolasDelCumulonimbo(ESCENA.yunque);

  it("la base plana y abajo, la cima en el techo: de mil doscientos a trece mil metros", () => {
    const abajo = Math.min(...bolas.map((b) => b.y - b.ry));
    const arriba = Math.max(...bolas.map((b) => b.y + b.ry));
    expect(abajo).toBeLessThan(BASE + 400);
    expect(arriba).toBeGreaterThan(CIMA - 300);
    expect(arriba).toBeLessThan(CIMA + 1200);
  });

  it("la torre, del ancho de lo que pinta el radar: lo que se ve es lo que sale en él", () => {
    const torre = bolas.filter((b) => b.y < CIMA - 1500);
    const ancho = Math.max(...torre.map((b) => Math.hypot(b.x, b.z) + b.rx));
    expect(ancho).toBeGreaterThan(radioDelEco(ESCENA.celda) * 0.8);
    expect(ancho).toBeLessThan(RADIO_DEL_ECO);
  });

  it("el yunque se estira hacia donde sopla el viento de arriba, y lejos", () => {
    const yunque = bolas.filter((b) => b.y > CIMA - 1500);
    const masLejos = Math.max(...yunque.map((b) => b.x * ESCENA.yunque.x + b.z * ESCENA.yunque.z));
    expect(masLejos).toBeGreaterThan(15000);
    // Y nada del yunque contra el viento: la torre no se estira hacia allí.
    for (const b of yunque)
      expect(b.x * ESCENA.yunque.x + b.z * ESCENA.yunque.z).toBeGreaterThan(0);
  });

  it("la misma semilla, la misma nube: una tormenta que cambia de forma no se aprende", () => {
    expect(bolasDelCumulonimbo(ESCENA.yunque, 3)).toEqual(bolasDelCumulonimbo(ESCENA.yunque, 3));
  });
});

describe("verse de lejos", () => {
  it("dentro del plano lejano, en su sitio; más allá, en la misma dirección y a escala", () => {
    expect(acercarParaVerse(40000, 100000)).toBe(1);
    expect(acercarParaVerse(200000, 100000)).toBeCloseTo(0.5, 9);
    expect(acercarParaVerse(Number.NaN, 100000)).toBe(1);
  });

  it("se acerca y encoge a la vez: en pantalla mide lo mismo", () => {
    const nube = crearCumulonimbo(ESCENA.yunque);
    nube.poner(0, -150000, 0);
    const camara = new PerspectiveCamera(62, 1, 0.6, 60000);
    camara.position.set(0, 3000, 0);
    nube.paso(0.016, { camara, luz: 0, rayo: 0 });
    const hijo = nube.grupo.children[0]!;
    const s = hijo.scale.x;
    expect(s).toBeLessThan(1);
    // El ángulo con que se ve su centro es el mismo que en su sitio.
    expect(-hijo.position.z / s).toBeCloseTo(150000, -1);
    nube.dispose();
  });

  it("y cuesta poco: una malla de menos de diez mil triángulos", () => {
    const nube = crearCumulonimbo(ESCENA.yunque);
    expect(nube.triangulos).toBeGreaterThan(2000);
    expect(nube.triangulos).toBeLessThan(10000);
    nube.dispose();
  });
});

describe("el rayo", () => {
  it("baja a saltos de la nube al suelo, con una rama, en pares de tramos", () => {
    const desde = { x: 0, y: BASE, z: 0 };
    const hasta = { x: 300, y: 0, z: 100 };
    const camino = caminoDelRayo(desde, hasta, 5);
    expect(camino.length % 2).toBe(0);
    expect(camino[0]).toEqual(desde);
    // El tronco acaba en el suelo, donde cae.
    const tronco = camino.slice(0, 24);
    expect(tronco[tronco.length - 1]).toEqual(hasta);
    // Y se quiebra: no es una raya recta.
    const rectos = tronco.filter((p) => Math.abs(p.x - (p.y / BASE) * 0 - 300 * (1 - p.y / BASE)) < 1);
    expect(rectos.length).toBeLessThan(tronco.length);
  });
});
