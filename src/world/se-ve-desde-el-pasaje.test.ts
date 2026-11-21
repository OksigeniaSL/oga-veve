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
  cuantoSeVeLoDeDebajo,
  ladoDe,
  ojosEnElMundo,
  miradaDe,
  SE_DISTINGUE,
  SE_VE_LO_DE_DEBAJO,
  seVeDesdeFuera,
  seVeElMarDeNubes,
  seVeLoDeDebajo,
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

/*
 * **El mar de nubes es lo que llena la vista, no lo que cruza una recta**
 * (H38m). Ara dice «¡Mirá para abajo: nubes y más nubes, como un mar de
 * algodón!», y eso es la vista entera. Se miraba una recta suelta, y falla
 * por los dos lados: con el mar de nubes del alisio, una recta por un jirón
 * fino —en el banco, 0 m de nube densa a 9,2 km— con la vista blanca
 * alrededor; y con unas nubes sueltas, la recta que cae en una, que como el
 * mar de nubes de Ara espera a verse, acababa diciéndose sobre un cielo
 * casi limpio. Desde FL160 mirando abajo a 9,2 km, como en el banco.
 */
describe("el mar de nubes, por lo que llena la mirada (H38m)", () => {
  const mirar = (tapadura: number, i: number) => {
    const d = marDeNubes(tapadura);
    const ojo = { x: (i * 911) % 6000, y: 4900, z: (i * 577) % 6000 };
    const a = (i / 97) * Math.PI * 2;
    const mirado = { x: ojo.x + Math.cos(a) * 7800, y: 0, z: ojo.z + Math.sin(a) * 7800 };
    const m = mundo({ bruma: 0 });
    const conLaCapa: ElMundoQueSeMira = {
      ...m,
      nubes: (desde, hasta) => transparenciaDeLaCapa(d, opacidadDeLaLamina(tapadura), RADIO, 0.45, desde, hasta),
    };
    const deja = conLaCapa.nubes(ojo, mirado);
    // La regla de antes: la recta suelta, con la capa por medio y lo de debajo sin distinguirse.
    const unaRecta = deja < 0.85 && claridad(ojo, mirado, conLaCapa) < SE_DISTINGUE;
    return { unaRecta, porLaMirada: seVeElMarDeNubes(ojo, mirado, conLaCapa) };
  };
  const vuelta = (tapadura: number) => Array.from({ length: 400 }, (_, i) => mirar(tapadura, i));

  it("con el mar de nubes del alisio, la recta que pasa por un jirón no quita el mar: alrededor sigue blanco", () => {
    const jirones = vuelta(0.45).filter((v) => !v.unaRecta);
    expect(jirones.length).toBeGreaterThan(40);
    expect(jirones.filter((v) => v.porLaMirada).length / jirones.length).toBeGreaterThan(0.6);
  });

  it("y mirando abajo desde crucero se ve casi siempre", () => {
    const todas = vuelta(0.45);
    expect(todas.filter((v) => v.porLaMirada).length / todas.length).toBeGreaterThan(0.8);
  });

  it("con unas nubes sueltas, la que pasa por debajo de la mirada no es un mar de nubes", () => {
    const enUna = vuelta(0.2).filter((v) => v.unaRecta);
    // Con la regla de antes, una de cada siete miradas lo daba por mar.
    expect(enUna.length).toBeGreaterThan(40);
    expect(enUna.filter((v) => v.porLaMirada)).toHaveLength(0);
    expect(vuelta(0.1).filter((v) => v.porLaMirada)).toHaveLength(0);
  });

  it("y un monte que asoma por encima de la capa no es nube", () => {
    const d = marDeNubes(1);
    const ojo = { x: 0, y: 4900, z: 0 };
    const mirado = { x: 7800, y: 0, z: 0 };
    const cubierta: ElMundoQueSeMira = {
      ...mundo({ bruma: 0 }),
      nubes: (desde, hasta) => transparenciaDeLaCapa(d, opacidadDeLaLamina(1), RADIO, 0.45, desde, hasta),
    };
    expect(seVeElMarDeNubes(ojo, mirado, cubierta)).toBe(true);
    // El Teide entero en la mirada: por encima de la capa, roca y no algodón.
    const teide: ElMundoQueSeMira = { ...cubierta, suelo: () => 3700 };
    expect(seVeElMarDeNubes(ojo, mirado, teide)).toBe(false);
  });
});

describe("lo de debajo, por lo que deja ver el cristal y no por un punto (H59b)", () => {
  // Desde 1.000 m, mirando abajo y hacia el norte: lo mirado, a 1.732 m por delante.
  const ojo = { x: 0, y: 1000, z: 0 };
  const mirado = { x: 0, y: 5, z: -1732 };
  const llano = (): number => 0;
  const todo = (): boolean => true;

  it("mira cinco por cinco puntos alineados con la mirada, en un cuadro de un 27 % de la distancia", () => {
    const vistos: { x: number; z: number }[] = [];
    cuantoSeVeLoDeDebajo(ojo, mirado, llano, todo, (q) => (vistos.push(q), true));
    expect(vistos).toHaveLength(25);
    const lejos = Math.hypot(mirado.x - ojo.x, mirado.y - ojo.y, mirado.z - ojo.z);
    const zs = vistos.map((q) => q.z);
    const xs = vistos.map((q) => q.x);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(lejos * 0.27 * 2, 0);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(lejos * 0.27 * 2, 0);
    // Y girado con la mirada: mirando al este, el cuadro se alarga hacia el este igual.
    const alEste: { x: number; z: number }[] = [];
    cuantoSeVeLoDeDebajo(ojo, { x: 1732, y: 5, z: 0 }, llano, todo, (q) => (alEste.push(q), true));
    expect(Math.max(...alEste.map((q) => q.x)) - Math.min(...alEste.map((q) => q.x))).toBeCloseTo(lejos * 0.27 * 2, 0);
  });

  it("con la góndola tapando la mitad de cerca, el mar de la mitad de lejos se ve", () => {
    // Lo de más cerca que lo mirado cae detrás del motor; lo mirado, también.
    const loVe = (q: { z: number }): boolean => q.z < mirado.z - 1;
    expect(loVe(mirado)).toBe(false);
    expect(cuantoSeVeLoDeDebajo(ojo, mirado, llano, todo, loVe)).toBeCloseTo(10 / 25, 5);
    expect(seVeLoDeDebajo(ojo, mirado, llano, todo, loVe)).toBe(true);
  });

  it("tapado del todo, o lo que se dice que no es lo que hay, no se ve", () => {
    expect(cuantoSeVeLoDeDebajo(ojo, mirado, llano, todo, () => false)).toBe(0);
    expect(seVeLoDeDebajo(ojo, mirado, llano, todo, () => false)).toBe(false);
    // Lo que asoma por un borde —una fila de cinco— tampoco: no es lo que se ve al mirar abajo.
    const unaFila = (q: { z: number }): boolean => q.z < mirado.z - 1732 * 0.2;
    expect(cuantoSeVeLoDeDebajo(ojo, mirado, llano, todo, unaFila)).toBeCloseTo(5 / 25, 5);
    expect(seVeLoDeDebajo(ojo, mirado, llano, todo, unaFila)).toBe(false);
  });

  it("lo que cae fuera del cristal no es de la vista: es la pared", () => {
    // Solo la mitad de lejos cae por el cristal, y ahí todo es mar: se ve entero.
    const cristal = (q: { z: number }): boolean => q.z < mirado.z - 1;
    expect(cuantoSeVeLoDeDebajo(ojo, mirado, llano, cristal, todo)).toBe(1);
    // Y si por el cristal no cae nada, no hay vista: ni se ve ni se deja de ver, y no se nombra.
    expect(cuantoSeVeLoDeDebajo(ojo, mirado, llano, () => false, todo)).toBeNull();
    expect(seVeLoDeDebajo(ojo, mirado, llano, () => false, todo)).toBe(false);
  });

  it("pide dos quintos, lo mismo que el banco al mar de nubes", () => {
    expect(SE_VE_LO_DE_DEBAJO).toBe(0.4);
  });

  it("los puntos van un poco por encima del suelo que haya, también en la ladera", () => {
    const vistos: { y: number }[] = [];
    cuantoSeVeLoDeDebajo(ojo, mirado, () => 600, todo, (q) => (vistos.push(q), true));
    expect(vistos.every((q) => q.y === 630)).toBe(true);
    // Y el mar, o lo que nadie sabe, a ras del agua.
    const alAgua: { y: number }[] = [];
    cuantoSeVeLoDeDebajo(ojo, mirado, () => null, todo, (q) => (alAgua.push(q), true));
    expect(alAgua.every((q) => q.y === 30)).toBe(true);
  });
});
