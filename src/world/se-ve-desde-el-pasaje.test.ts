/**
 * **Lo que se ve desde el asiento de Ara, y desde fuera**, sin tarjeta: la
 * nube que se pinta entre medias, el ojo metido en una, el relieve, la
 * cabeza que gira hacia lo que se nombra y la toma del avión con el sitio al
 * fondo. Ver `se-ve-desde-el-pasaje.ts`, y el vuelo entero en
 * `flight/inicio-pasaje.test.ts`.
 */

import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  opacidadDeLaLamina,
  ruidoDeNube,
  transparenciaDeLaCapa,
  umbralDeLaNube,
  type DibujoDeLaCapa,
} from "./capa-de-nubes";
import type { VentanillaDePasaje } from "./asiento-de-pasaje";
import {
  asomadoHacia,
  claridad,
  ladoDe,
  ojosEnElMundo,
  miradaDe,
  SE_DISTINGUE,
  seVeDesdeFuera,
  tomaDelPaisaje,
  type ElMundoQueSeMira,
} from "./se-ve-desde-el-pasaje";

const ruidos = [0, 1, 2, 3, 4].map((i) => ruidoDeNube(0xc10d + i * 977));

/** El mar de nubes del alisio en Los Rodeos, como lo pone `ponerNubes`. */
function marDeNubes(tapadura: number): DibujoDeLaCapa {
  return {
    base: 1532,
    separacion: 450 / 4,
    ruidos,
    desfases: ruidos.map((_, i) => [i * 0.17, i * 0.31] as const),
    paso: 6000,
    umbral: umbralDeLaNube(tapadura),
  };
}

/** El radio al que se desvanece del todo la capa de Tenerife Norte, m. */
const RADIO = 33_120;

describe("lo que deja ver la capa, lámina a lámina", () => {
  it("una recta que no la cruza la ve entera", () => {
    const d = marDeNubes(1);
    expect(transparenciaDeLaCapa(d, opacidadDeLaLamina(1), RADIO, 0.45, { x: 0, y: 5000, z: 0 }, { x: 9000, y: 3700, z: 0 })).toBe(1);
    expect(transparenciaDeLaCapa(d, opacidadDeLaLamina(1), RADIO, 0.45, { x: 0, y: 800, z: 0 }, { x: 9000, y: 40, z: 0 })).toBe(1);
  });

  it("y cubierta, de arriba abajo y cerca, casi no deja ver nada", () => {
    const d = marDeNubes(1);
    const t = transparenciaDeLaCapa(d, opacidadDeLaLamina(1), RADIO, 0.45, { x: 0, y: 5000, z: 0 }, { x: 2000, y: 0, z: 1000 });
    expect(t).toBeLessThan(0.1);
  });

  it("el mar de nubes del alisio, que el parte da por roto, tapa casi siempre lo de debajo", () => {
    /*
     * Es lo que se le escapaba a `laCapaTapa`: cuatro octavos y medio son un
     * SCT y para el parte no tapan, y en la pantalla son una alfombra. Desde
     * crucero, mirando a lo de debajo a veinte kilómetros, casi ninguna recta
     * pasa por un hueco de las cinco láminas a la vez: lo poco de nube que
     * hay brilla más que el mar. Ver `BRILLA_LA_NUBE`.
     */
    const d = marDeNubes(0.45);
    let tapadas = 0;
    const n = 200;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const desde = { x: (i * 911) % 6000, y: 5800, z: (i * 577) % 6000 };
      const hasta = { x: desde.x + Math.cos(a) * 20000, y: 300, z: desde.z + Math.sin(a) * 20000 };
      const deja = transparenciaDeLaCapa(d, opacidadDeLaLamina(0.45), RADIO, 0.45, desde, hasta);
      if (claridad(desde, hasta, mundo({ deja, bruma: 0 })) < SE_DISTINGUE) tapadas++;
    }
    expect(tapadas / n).toBeGreaterThan(0.6);
  });

  it("y lo que se pinta lejos se desvanece: más allá del radio de la capa, ya no tapa", () => {
    const d = marDeNubes(1);
    // La recta cruza la capa a más de cuarenta kilómetros del ojo.
    const t = transparenciaDeLaCapa(d, opacidadDeLaLamina(1), RADIO, 0.45, { x: 0, y: 6000, z: 0 }, { x: 60000, y: 1000, z: 0 });
    expect(t).toBeGreaterThan(0.95);
  });
});

/** Un mundo de mentira: el suelo que se diga, la capa de ahí arriba y una bruma fina. */
function mundo(o: { suelo?: (x: number, z: number) => number; deja?: number; dentro?: number; bruma?: number } = {}): ElMundoQueSeMira {
  return {
    suelo: o.suelo ?? (() => 0),
    nubes: () => o.deja ?? 1,
    dentro: () => o.dentro ?? 0,
    bruma: () => o.bruma ?? 5e-6,
  };
}

describe("lo que llega de un sitio al ojo", () => {
  const ojo = { x: 0, y: 3000, z: 0 };
  const sitio = { x: 20000, y: 1500, z: 0 };

  it("con el aire limpio y nada por medio, se ve", () => {
    expect(claridad(ojo, sitio, mundo())).toBeGreaterThan(0.9);
  });

  it("con el ojo metido en una nube, nada: la ventanilla está blanca", () => {
    expect(claridad(ojo, sitio, mundo({ dentro: 0.6 }))).toBe(0);
  });

  it("con la nube entre medias, o un monte, tampoco", () => {
    expect(claridad(ojo, sitio, mundo({ deja: 0.1 }))).toBeLessThan(SE_DISTINGUE);
    const monte = (x: number): number => (x > 9000 && x < 11000 ? 3500 : 0);
    expect(claridad(ojo, sitio, mundo({ suelo: monte }))).toBe(0);
  });

  it("y con la bruma del suelo, lo de muy lejos se pierde", () => {
    expect(claridad(ojo, { x: 90000, y: 500, z: 0 }, mundo({ bruma: 1.8e-5 }))).toBeLessThan(SE_DISTINGUE);
  });
});

describe("dónde va la cámara, y por qué lado cae", () => {
  // Rumbo norte: la −Z del mundo es el morro.
  const avion = { position: new Vector3(0, 3000, 0), orientation: new Quaternion(), largo: 30 };

  it("a la izquierda del morro, a la izquierda", () => {
    expect(ladoDe({ x: -5000, y: 0, z: -2000 }, avion)).toBe("izquierda");
    expect(ladoDe({ x: 5000, y: 0, z: -2000 }, avion)).toBe("derecha");
  });

  it("la toma del paisaje pone el avión delante y el sitio al fondo, dentro del cuadro", () => {
    const sitio = { x: -30000, y: 2400, z: -10000 };
    const { camara, mira } = tomaDelPaisaje(avion, sitio);
    const haciaElSitio = new Vector3().subVectors(mira, camara).normalize();
    const haciaElAvion = new Vector3().subVectors(avion.position, camara).normalize();
    // El avión, delante de la cámara según se mira al sitio, y a menos de la mitad del ángulo de la toma.
    const angulo = (haciaElSitio.angleTo(haciaElAvion) * 180) / Math.PI;
    expect(angulo).toBeLessThan(25);
    expect(angulo).toBeGreaterThan(5);
    // Y la cámara, detrás del avión según se mira al sitio.
    expect(camara.distanceTo(new Vector3(sitio.x, sitio.y, sitio.z))).toBeGreaterThan(
      avion.position.distanceTo(new Vector3(sitio.x, sitio.y, sitio.z)),
    );
  });

  it("y desde fuera no se ve lo que la nube tapa desde la cámara", () => {
    const sitio = { x: -20000, y: 1000, z: 0 };
    expect(seVeDesdeFuera(sitio, avion, mundo(), 40000)).toBe(true);
    expect(seVeDesdeFuera(sitio, avion, mundo({ deja: 0.05 }), 40000)).toBe(false);
    expect(seVeDesdeFuera(sitio, avion, mundo(), 10000)).toBe(false);
  });
});

describe("la cara contra el cristal, mirando hacia lo que se nombra", () => {
  // Una ventanilla del costado izquierdo, como las del JAZ 90.
  const v: VentanillaDePasaje = { centro: { x: -1.4, y: 0.4, z: -2 }, normal: { x: -1, y: 0, z: 0 }, ancho: 0.25, alto: 0.35 };
  const avion = { position: new Vector3(0, 3000, 0), orientation: new Quaternion(), largo: 30 };

  it("mira hacia el sitio, si cabe en lo que gira el cuello", () => {
    // Por delante del ala, treinta grados hacia el morro desde el través, y un poco abajo.
    const sitio = { x: -20000 * Math.cos(Math.PI / 6), y: 1500, z: -20000 * Math.sin(Math.PI / 6) };
    const pose = asomadoHacia(v, "izquierda", sitio, avion);
    const mira = miradaDe(pose, avion);
    const ojo = ojosEnElMundo(pose, avion);
    const hacia = new Vector3(sitio.x, sitio.y, sitio.z).sub(ojo).normalize();
    expect((mira.angleTo(hacia) * 180) / Math.PI).toBeLessThan(2);
  });

  it("y lo que queda por el otro lado no lo alcanza: el cuello tiene tope", () => {
    const sitio = { x: 20000, y: 1500, z: 0 };
    const pose = asomadoHacia(v, "izquierda", sitio, avion);
    const mira = miradaDe(pose, avion);
    expect(mira.x).toBeLessThan(0);
  });
});
