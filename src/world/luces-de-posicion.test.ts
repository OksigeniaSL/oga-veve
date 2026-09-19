/**
 * Las luces de posición: el patrón que hace que un avión de noche sea un
 * avión.
 *
 * Preguntado jugando: «¿y si es de noche, el avión no lleva luces de
 * posición?». No las llevaba. Lo que se comprueba aquí es lo único que puede
 * estar mal de verdad: **el lado**. Verde a estribor y roja a babor no es una
 * convención del juego, es la de la navegación entera —barcos incluidos— y
 * ponerlas al revés enseña a leer mal un avión que viene de frente.
 */

import { describe, expect, it } from "vitest";
import {
  CADA_DESTELLO,
  crearLucesDePosicion,
  destellaAhora,
  DURA_EL_DESTELLO,
  focoEncendido,
} from "./luces-de-posicion";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Object3D,
  type Points,
} from "three";

const avion = { wingSpan: 30, chord: 4 };

/** Los puntos fijos, con su sitio y su color. */
function fijas(): { x: number; z: number; r: number; g: number; b: number }[] {
  const luces = crearLucesDePosicion(avion);
  const p = luces.grupo.children[0] as Points;
  const pos = p.geometry.getAttribute("position");
  const col = p.geometry.getAttribute("color");
  return Array.from({ length: pos.count }, (_, i) => ({
    x: pos.getX(i),
    z: pos.getZ(i),
    r: col.getX(i),
    g: col.getY(i),
    b: col.getZ(i),
  }));
}

describe("dónde va cada luz", () => {
  it("la verde a estribor, que es la derecha", () => {
    const verde = fijas().find((l) => l.g > 0.5 && l.r < 0.4)!;
    expect(verde).toBeDefined();
    expect(verde.x, "la verde tiene que estar a la derecha").toBeGreaterThan(0);
    expect(verde.x).toBeCloseTo(avion.wingSpan / 2, 6);
  });

  it("y la roja a babor, que es la izquierda", () => {
    const roja = fijas().find((l) => l.r > 0.5 && l.g < 0.4)!;
    expect(roja).toBeDefined();
    expect(roja.x, "la roja tiene que estar a la izquierda").toBeLessThan(0);
    expect(roja.x).toBeCloseTo(-avion.wingSpan / 2, 6);
  });

  it("y la blanca atrás, en la cola", () => {
    const blanca = fijas().find((l) => l.r > 0.8 && l.g > 0.8 && l.b > 0.8)!;
    expect(blanca).toBeDefined();
    // El morro mira a −Z, así que la cola es Z positiva.
    expect(blanca.z).toBeGreaterThan(0);
  });

  it("y son tres, ni una más", () => {
    expect(fijas()).toHaveLength(3);
  });

  it("y van con el avión: las puntas al final del ala que tenga", () => {
    const grande = crearLucesDePosicion({ wingSpan: 60, chord: 8 });
    const p = grande.grupo.children[0] as Points;
    expect(p.geometry.getAttribute("position").getX(0)).toBeCloseTo(30, 6);
  });
});

describe("la de choque", () => {
  it("parpadea: poco encendida y mucho apagada", () => {
    let encendida = 0;
    const pasos = 2000;
    for (let i = 0; i < pasos; i++)
      if (destellaAhora((i / pasos) * CADA_DESTELLO * 10)) encendida++;
    const fraccion = encendida / pasos;
    expect(fraccion).toBeCloseTo(DURA_EL_DESTELLO / CADA_DESTELLO, 1);
  });

  it("y solo con el motor en marcha, que es su regla de verdad", () => {
    /*
     * La roja de arriba se enciende **antes** de arrancar y dice «esto está
     * vivo, no te acerques». Con el motor parado no tiene nada que avisar.
     */
    const luces = crearLucesDePosicion(avion);
    const choque = luces.grupo.children[1] as Points;
    luces.paso(0.01, false, false);
    expect(choque.visible).toBe(false);
    luces.paso(0.01, true, false);
    expect(choque.visible).toBe(true);
  });
});

describe("el foco de aterrizaje", () => {
  /*
   * «Los aviones encienden un foco al aterrizar, ¿o ya no?» Sí, y la regla de
   * verdad no es «al aterrizar»: es **por debajo de diez mil pies**, que es
   * donde hay tráfico y donde hay pájaros. Y con el tren fuera, siempre.
   */
  it("con el tren fuera, encendido, esté donde esté", () => {
    expect(focoEncendido(9000, true)).toBe(true);
  });

  it("y por debajo de diez mil pies aunque el tren esté dentro", () => {
    expect(focoEncendido(2000, false)).toBe(true);
  });

  it("y arriba, apagado", () => {
    expect(focoEncendido(9000, false)).toBe(false);
  });

  it("y los diez mil pies son diez mil pies, no una cifra redonda inventada", () => {
    // 3.048 metros. Justo por debajo enciende y justo por encima no.
    expect(focoEncendido(3047, false)).toBe(true);
    expect(focoEncendido(3049, false)).toBe(false);
  });

  it("y con el motor parado no alumbra nadie", () => {
    const luces = crearLucesDePosicion(avion);
    const foco = luces.grupo.children[2] as Points;
    luces.paso(0.5, false, true);
    expect(foco.visible).toBe(false);
    luces.paso(0.5, true, true);
    expect(foco.visible).toBe(true);
  });
});

/*
 * ── Y en el avión que se está dibujando, no en la caja que lo envuelve ─────
 *
 * «¿Una luz cuadrada en el lomo? ¿Y las de las alas dónde las pones?» Las
 * ponía a media envergadura y a media eslora: en un ala en flecha eso cae
 * **por dentro del ala y por delante de ella**, porque la caja que envuelve
 * al avión sabe hasta dónde llega en cada eje por separado pero no sabe dónde
 * está la punta. Medido en captura sobre el JAZ 120: al 79 % de la
 * semienvergadura y cincuenta píxeles por encima del plano.
 */
describe("las puntas son las del avión que hay", () => {
  /** Un avión de mentira con el ala en flecha y un timón alto. */
  function conAlaEnFlecha(): Object3D {
    const puntos = [
      // El morro, delante del todo.
      [0, 0, -10],
      // Las puntas de ala: muy atrás, que para eso es una flecha.
      [15, -1.2, 5],
      [-15, -1.2, 5],
      // La raíz del ala, por delante: ahí va el foco.
      [3.5, -1, -4],
      [-3.5, -1, -4],
      // El lomo del fuselaje.
      [0, 2, 0],
      // Y la punta del timón, que es lo más alto de todo y **no** lleva la de
      // choque.
      [0, 6, 9],
    ].flat();
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(puntos, 3));
    return new Mesh(geo);
  }

  const conCuerpo = () => crearLucesDePosicion(avion, conAlaEnFlecha());

  it("la verde en la punta de ala de verdad, con su flecha y su diedro", () => {
    const p = (conCuerpo().grupo.children[0] as Points).geometry.getAttribute(
      "position",
    );
    // En la punta y un dedo por fuera, que si no la tapa el ala. Ver `dedo`.
    expect(p.getX(0)).toBeGreaterThan(15);
    expect(p.getX(0)).toBeLessThan(15.5);
    expect(p.getY(0)).toBeCloseTo(-1.2, 5);
    // Lo que se perdía: la punta está cinco metros por detrás del centro.
    expect(p.getZ(0)).toBeCloseTo(5, 5);
  });

  it("y la roja en la otra, que no tiene por qué ser simétrica de oficio", () => {
    const p = (conCuerpo().grupo.children[0] as Points).geometry.getAttribute(
      "position",
    );
    expect(p.getX(1)).toBeLessThan(-15);
    expect(p.getX(1)).toBeGreaterThan(-15.5);
    expect(p.getZ(1)).toBeCloseTo(5, 5);
  });

  it("y la de choque en el lomo, no en la punta del timón", () => {
    const p = (conCuerpo().grupo.children[1] as Points).geometry.getAttribute(
      "position",
    );
    expect(p.getY(0)).toBeCloseTo(2.3, 5);
    expect(p.getY(0), "el timón no lleva luz de choque").toBeLessThan(6);
  });

  it("y el foco en la raíz del ala mirando adelante", () => {
    const p = (conCuerpo().grupo.children[2] as Points).geometry.getAttribute(
      "position",
    );
    expect(Math.abs(p.getX(0))).toBeCloseTo(3.5, 5);
    // Y asomando por el borde de ataque, no enrasado con él.
    expect(p.getZ(0)).toBeLessThan(-4);
    expect(p.getZ(0)).toBeGreaterThan(-4.5);
    // Y son dos, una por ala.
    expect(p.count).toBe(2);
  });

  it("y sin modelo se sigue tirando de la ficha, que es lo que hay", () => {
    const p = (
      crearLucesDePosicion(avion).grupo.children[0] as Points
    ).geometry.getAttribute("position");
    expect(p.getX(0)).toBeCloseTo(avion.wingSpan / 2, 6);
  });
});
