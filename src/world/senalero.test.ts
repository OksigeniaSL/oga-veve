/**
 * El señalero, y lo único que se le puede comprobar sin ojos: **que se aparta**.
 *
 * «Lo atropello sin problemas.» Y es verdad: un señalero de carne y hueso ve
 * venir un avión hacia él y se quita, que es lo que hace cualquiera. El de
 * aquí se quedaba clavado en su sitio dejándose pasar por encima.
 *
 * Los brazos y las posturas no se prueban aquí porque no se pueden probar así
 * —un gesto o se lee desde la cabina o no, y eso se mira, no se afirma—; para
 * eso está `posar`. Lo que sí es una regla es dónde se pone la persona.
 */

import { describe, expect, it } from "vitest";
import { Senalero } from "./senalero";

/** Un señalero plantado en un puesto, con la salida hacia el este. */
function puesto(): Senalero {
  const s = new Senalero();
  s.colocar([0, 0], [100, 0], () => 0);
  return s;
}

/** Dónde está de pie, en planta. */
const donde = (s: Senalero) => ({
  x: s.grupo.position.x,
  z: s.grupo.position.z,
});

/** Un rato de avión en un sitio, a paso de juego. */
function rato(
  s: Senalero,
  avion: { x: number; z: number; velocidad: number },
  segundos: number,
): void {
  for (let t = 0; t < segundos; t += 0.05)
    s.paso(0.05, { ...avion, enElSuelo: true }, true);
}

describe("el señalero", () => {
  it("se planta al lado del puesto, no en medio", () => {
    const p = donde(puesto());
    // Ni encima del avión parado ni a un kilómetro.
    expect(Math.hypot(p.x, p.z)).toBeGreaterThan(5);
    expect(Math.hypot(p.x, p.z)).toBeLessThan(30);
  });

  it("con el avión lejos se queda donde está", () => {
    const s = puesto();
    const antes = donde(s);
    rato(s, { x: -150, z: 0, velocidad: 8 }, 3);
    expect(Math.hypot(donde(s).x - antes.x, donde(s).z - antes.z)).toBeLessThan(
      0.5,
    );
  });

  it("y con el avión encima se quita de en medio", () => {
    const s = puesto();
    const suyo = donde(s);
    // El avión, viniendo justo a por él.
    rato(s, { x: suyo.x, z: suyo.z, velocidad: 8 }, 4);
    const ahora = donde(s);
    const seFue = Math.hypot(ahora.x - suyo.x, ahora.z - suyo.z);
    expect(seFue).toBeGreaterThan(4);
  });

  it("y se aparta **hacia el otro lado**, no hacia el avión", () => {
    const s = puesto();
    const suyo = donde(s);
    // El avión llega un poco por detrás de él: tiene que alejarse de ahí.
    const avion = { x: suyo.x - 3, z: suyo.z, velocidad: 8 };
    rato(s, avion, 4);
    const ahora = donde(s);
    expect(Math.hypot(ahora.x - avion.x, ahora.z - avion.z)).toBeGreaterThan(
      Math.hypot(suyo.x - avion.x, suyo.z - avion.z),
    );
  });

  it("un avión parado no le hace moverse: ahí es donde trabaja", () => {
    const s = puesto();
    const suyo = donde(s);
    rato(s, { x: suyo.x, z: suyo.z, velocidad: 0 }, 4);
    expect(Math.hypot(donde(s).x - suyo.x, donde(s).z - suyo.z)).toBeLessThan(
      0.5,
    );
  });

  it("y cuando pasa el peligro vuelve a su sitio", () => {
    const s = puesto();
    const suyo = donde(s);
    rato(s, { x: suyo.x, z: suyo.z, velocidad: 8 }, 4);
    rato(s, { x: -150, z: 0, velocidad: 8 }, 8);
    expect(Math.hypot(donde(s).x - suyo.x, donde(s).z - suyo.z)).toBeLessThan(
      0.5,
    );
  });

  it("reiniciar lo devuelve a su sitio de golpe: es otro vuelo", () => {
    const s = puesto();
    const suyo = donde(s);
    rato(s, { x: suyo.x, z: suyo.z, velocidad: 8 }, 4);
    s.reiniciar();
    expect(Math.hypot(donde(s).x - suyo.x, donde(s).z - suyo.z)).toBeLessThan(
      0.01,
    );
  });
});

/*
 * ── Y por dónde llega el avión ────────────────────────────────────────────
 *
 * «Nadie me esperaba en Gran Canaria.» «No estaba el de las lucecitas para
 * ayudarme a aparcar, yo que le iba a dar un eurito.» Dicho tres veces, y las
 * tres el banco decía «visto: no» y nada más, que es el síntoma.
 *
 * La causa es esta: el señalero se coloca **mirando por donde el avión se
 * fue**, porque al empezar el vuelo es lo único que se sabe. Y solo se le ve
 * cuando el avión está por delante de él —doscientos veinte metros de
 * alcance—. Si a la vuelta el rodaje trae el avión al mismo puesto **por el
 * otro lado**, el señalero se pasa la llegada entera de espaldas y no aparece
 * nunca. No es que llegue tarde: no aparece.
 */
describe("y por dónde llega el avión", () => {
  /** Si se le ve con el avión ahí, viniendo de vuelta. */
  const seLeVe = (s: Senalero, x: number, z: number): boolean => {
    s.paso(0.05, { x, z, velocidad: 6, enElSuelo: true }, true);
    return s.grupo.visible;
  };

  it("viniendo por donde se salió, se le ve desde bien lejos", () => {
    const s = puesto();
    expect(seLeVe(s, 200, 0)).toBe(true);
    expect(seLeVe(s, 60, 0)).toBe(true);
    expect(seLeVe(s, 5, 0)).toBe(true);
  });

  it("y a trescientos todavía no, que aparece con tiempo pero no de lejos", () => {
    expect(seLeVe(puesto(), 300, 0)).toBe(false);
  });

  /*
   * **Y aquí estaba el fallo.** Mismo puesto, misma persona, y el avión
   * llegando por el lado contrario: invisible todo el rato, hasta con el
   * morro dentro del puesto.
   */
  it("pero llegando por el otro lado no se le ve nunca", () => {
    const s = puesto();
    expect(seLeVe(s, -200, 0)).toBe(false);
    expect(seLeVe(s, -60, 0)).toBe(false);
  });

  it("y se arregla diciéndole por dónde llega de verdad", () => {
    const s = puesto();
    // El avión viene del oeste: el punto por el que llega está en la −X.
    s.colocar([0, 0], [-100, 0], () => 0);
    expect(seLeVe(s, -200, 0)).toBe(true);
    expect(seLeVe(s, -60, 0)).toBe(true);
  });

  it("y entonces se planta al otro lado, que es donde le ve el comandante", () => {
    const porElEste = puesto();
    const porElOeste = new Senalero();
    porElOeste.colocar([0, 0], [-100, 0], () => 0);
    /*
     * Catorce metros **por delante del morro** del avión ya parado, o sea al
     * otro lado del puesto de por donde viene. Los dos casos son simétricos,
     * y que lo sean es lo que dice que la colocación depende de la llegada y
     * no de una constante.
     */
    expect(donde(porElEste).x).toBeLessThan(-10);
    expect(donde(porElOeste).x).toBeGreaterThan(10);
  });
});
