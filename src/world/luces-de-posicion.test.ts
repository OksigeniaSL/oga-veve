/**
 * Las luces de tu avión: el patrón que hace que un avión de noche sea un
 * avión.
 *
 * Preguntado jugando: «¿y si es de noche, el avión no lleva luces de
 * posición?». No las llevaba. Lo que se comprueba aquí es lo que puede estar
 * mal de verdad: **el lado** —verde a estribor y roja a babor no es una
 * convención del juego, es la de la navegación entera, barcos incluidos, y
 * ponerlas al revés enseña a leer mal un avión que viene de frente—, **el
 * cuándo** de cada una, que es la misma tabla que la del tráfico, y **dónde
 * van en cada avión**, que no es lo mismo en una avioneta que en un reactor.
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
  DE_CARRERA,
  faseDelTuyo,
  lucesDelTrafico,
} from "./luces-del-trafico";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Object3D,
  type Points,
} from "three";

const avion = { wingSpan: 30, chord: 4 };

/** Índices de las luces: ver `ORDEN` en `luces-del-trafico.ts`. */
const VERDE = 0;
const ROJA = 1;
const BLANCA = 2;
const BALIZA = 3;
const BALIZA_ABAJO = 4;
const ESTROBO_COLA = 7;
const FOCO = 8;
const RODAJE = 10;

/** Las luces, con su sitio y su color. */
function puestas(luces = crearLucesDePosicion(avion)): {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
}[] {
  const p = luces.grupo.children[0] as Points;
  const pos = p.geometry.getAttribute("position");
  const col = p.geometry.getAttribute("color");
  return Array.from({ length: pos.count }, (_, i) => ({
    x: pos.getX(i),
    y: pos.getY(i),
    z: pos.getZ(i),
    r: col.getX(i),
    g: col.getY(i),
    b: col.getZ(i),
  }));
}

describe("dónde va cada luz", () => {
  it("la verde a estribor, que es la derecha", () => {
    const verde = puestas()[VERDE]!;
    expect(verde.g).toBeGreaterThan(0.5);
    expect(verde.r).toBeLessThan(0.4);
    expect(verde.x, "la verde tiene que estar a la derecha").toBeGreaterThan(0);
    expect(verde.x).toBeCloseTo(avion.wingSpan / 2, 6);
  });

  it("y la roja a babor, que es la izquierda", () => {
    const roja = puestas()[ROJA]!;
    expect(roja.r).toBeGreaterThan(0.5);
    expect(roja.g).toBeLessThan(0.4);
    expect(roja.x, "la roja tiene que estar a la izquierda").toBeLessThan(0);
    expect(roja.x).toBeCloseTo(-avion.wingSpan / 2, 6);
  });

  it("y la blanca atrás, en la cola", () => {
    const blanca = puestas()[BLANCA]!;
    expect(Math.min(blanca.r, blanca.g, blanca.b)).toBeGreaterThan(0.8);
    // El morro mira a −Z, así que la cola es Z positiva.
    expect(blanca.z).toBeGreaterThan(0);
  });

  it("y van con el avión: las puntas al final del ala que tenga", () => {
    const grande = crearLucesDePosicion({ wingSpan: 60, chord: 8 });
    expect(puestas(grande)[VERDE]!.x).toBeCloseTo(30, 6);
  });

  it("y está en el grupo que los bancos saben apartar", () => {
    // `verificar-cabina` mide la envergadura sin lo que brilla encima.
    expect(crearLucesDePosicion(avion).grupo.name).toBe("luces-de-posicion");
  });
});

describe("cuándo, con la misma tabla que el tráfico", () => {
  const tuyo = (
    a: Partial<Parameters<typeof faseDelTuyo>[0]>,
  ): ReturnType<typeof faseDelTuyo> =>
    faseDelTuyo({
      motor: true,
      enElSuelo: true,
      enLaPista: false,
      velocidad: 0,
      ...a,
    });

  it("con el motor parado en el suelo, aparcado: solo la navegación", () => {
    const l = crearLucesDePosicion(avion);
    l.paso(0.01, lucesDelTrafico(tuyo({ motor: false })));
    const t = l.luces.tamanosAhora;
    expect(t.filter((x) => x > 0)).toHaveLength(3);
    expect(t[BALIZA]).toBe(0);
  });

  it("la baliza, con el motor en marcha, que es su regla de verdad", () => {
    /*
     * La roja se enciende **antes** de arrancar y dice «esto está vivo, no te
     * acerques». Con el motor parado no tiene nada que avisar.
     */
    const l = crearLucesDePosicion(avion);
    l.paso(0.01, lucesDelTrafico(tuyo({ motor: true })));
    expect(l.luces.tamanosAhora[BALIZA]).toBeGreaterThan(0);
  });

  it("rodando, el faro de rodaje; parado esperando, apagado; y sin destellos fuera de la pista", () => {
    expect(tuyo({ velocidad: 6 })).toBe("rodando");
    expect(tuyo({ velocidad: 0 })).toBe("esperando");
    const rodando = lucesDelTrafico(tuyo({ velocidad: 6 }));
    expect(rodando.rodaje).toBe(true);
    expect(rodando.estroboscopicas).toBe(false);
    expect(lucesDelTrafico(tuyo({ velocidad: 0 })).rodaje).toBe(false);
  });

  it("al pisar la pista, los destellos; corriendo, además los focos", () => {
    expect(tuyo({ enLaPista: true, velocidad: 0 })).toBe("alineado");
    expect(tuyo({ enLaPista: true, velocidad: 4 })).toBe("entrando");
    expect(tuyo({ enLaPista: true, velocidad: DE_CARRERA + 5 })).toBe("carrera");
    const alineado = lucesDelTrafico(tuyo({ enLaPista: true }));
    expect(alineado.estroboscopicas).toBe(true);
    expect(alineado.aterrizaje).toBe(false);
    expect(lucesDelTrafico(tuyo({ enLaPista: true, velocidad: 40 })).aterrizaje).toBe(true);
  });

  it("y en el aire, volando, aunque se pare el motor", () => {
    expect(tuyo({ enElSuelo: false, motor: false })).toBe("volando");
    const arriba = lucesDelTrafico("volando", 9000, false);
    expect(arriba.estroboscopicas).toBe(true);
    expect(arriba.baliza).toBe(true);
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

  it("y entre cuarenta y cien destellos por minuto, que es lo que pide el 25.1401", () => {
    const porMinuto = 60 / CADA_DESTELLO;
    expect(porMinuto).toBeGreaterThanOrEqual(40);
    expect(porMinuto).toBeLessThanOrEqual(100);
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
    expect(lucesDelTrafico("volando", 9000, true).aterrizaje).toBe(true);
  });

  it("y por debajo de diez mil pies aunque el tren esté dentro", () => {
    expect(focoEncendido(2000, false)).toBe(true);
  });

  it("y arriba, apagado", () => {
    expect(focoEncendido(9000, false)).toBe(false);
    expect(lucesDelTrafico("volando", 9000, false).aterrizaje).toBe(false);
  });

  it("y los diez mil pies son diez mil pies, no una cifra redonda inventada", () => {
    // 3.048 metros. Justo por debajo enciende y justo por encima no.
    expect(focoEncendido(3047, false)).toBe(true);
    expect(focoEncendido(3049, false)).toBe(false);
  });

  it("y aparcado con el motor parado no alumbra nadie", () => {
    const l = crearLucesDePosicion(avion);
    l.paso(0.5, lucesDelTrafico("aparcado"));
    expect(l.luces.tamanosAhora[FOCO]).toBe(0);
    l.paso(0.5, lucesDelTrafico("carrera"));
    expect(l.luces.tamanosAhora[FOCO]).toBeGreaterThan(0);
  });
});

/*
 * ── Y cada avión con las suyas ─────────────────────────────────────────────
 *
 * Un reactor lleva dos balizas —arriba y abajo del fuselaje— y destellos en
 * las puntas y en la cola; una avioneta de ala alta, una baliza en lo alto
 * de la deriva y destellos solo en las puntas, y el faro de rodaje en el ala;
 * el biplano fumigador, ningún destello. Se comprueba con el avión de la
 * flota, por su silueta.
 */
describe("cada avión con su equipo", () => {
  /** Lo que se enciende volando, en un destello. */
  const enElDestello = (id: string): readonly number[] => {
    const l = crearLucesDePosicion({ ...avion, id });
    l.paso(0, lucesDelTrafico("volando", 500));
    return l.luces.tamanosAhora;
  };

  it("el reactor: dos balizas y tres destellos", () => {
    const t = enElDestello("jaz-90");
    expect(t[BALIZA]).toBeGreaterThan(0);
    expect(t[BALIZA_ABAJO]).toBeGreaterThan(0);
    expect(t[ESTROBO_COLA]).toBeGreaterThan(0);
  });

  it("la avioneta: una baliza, en la deriva, y destellos solo en las puntas", () => {
    const t = enElDestello("jaz-20");
    expect(t[BALIZA]).toBeGreaterThan(0);
    expect(t[BALIZA_ABAJO]).toBe(0);
    expect(t[5]).toBeGreaterThan(0);
    expect(t[ESTROBO_COLA]).toBe(0);
    const l = crearLucesDePosicion({ ...avion, id: "jaz-20" });
    const baliza = puestas(l)[BALIZA]!;
    // En la deriva: detrás del ala y más alta que el lomo.
    expect(baliza.z).toBeGreaterThan(0);
    expect(baliza.y).toBeGreaterThan(l.sitios.lomo.y);
    // Y el faro de rodaje en el ala, no en el morro.
    expect(Math.abs(puestas(l)[RODAJE]!.x)).toBeGreaterThan(1);
  });

  it("el biplano fumigador: sin destellos, su anticolisión es la baliza", () => {
    const t = enElDestello("jaz-25");
    expect([5, 6, 7].map((i) => t[i])).toEqual([0, 0, 0]);
    expect(t[BALIZA]).toBeGreaterThan(0);
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
      // choque de un reactor.
      [0, 6, 9],
    ].flat();
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(puntos, 3));
    return new Mesh(geo);
  }

  const conCuerpo = () => puestas(crearLucesDePosicion(avion, conAlaEnFlecha()));

  it("la verde en la punta de ala de verdad, con su flecha y su diedro", () => {
    const p = conCuerpo()[VERDE]!;
    // En la punta y un dedo por fuera, que si no la tapa el ala. Ver `dedo`.
    expect(p.x).toBeGreaterThan(15);
    expect(p.x).toBeLessThan(15.5);
    expect(p.y).toBeCloseTo(-1.2, 5);
    // Lo que se perdía: la punta está cinco metros por detrás del centro.
    expect(p.z).toBeCloseTo(5, 5);
  });

  it("y la roja en la otra, que no tiene por qué ser simétrica de oficio", () => {
    const p = conCuerpo()[ROJA]!;
    expect(p.x).toBeLessThan(-15);
    expect(p.x).toBeGreaterThan(-15.5);
    expect(p.z).toBeCloseTo(5, 5);
  });

  it("y la de choque de un reactor en el lomo, no en la punta del timón", () => {
    const p = conCuerpo()[BALIZA]!;
    expect(p.y).toBeCloseTo(2.3, 5);
    expect(p.y, "el timón no lleva luz de choque").toBeLessThan(6);
  });

  it("pero la de la avioneta, en lo alto de la deriva", () => {
    const l = crearLucesDePosicion({ ...avion, id: "jaz-20" }, conAlaEnFlecha());
    expect(puestas(l)[BALIZA]!.y).toBeGreaterThan(6);
  });

  it("y el foco en la raíz del ala mirando adelante, uno por ala", () => {
    const [d, i] = [conCuerpo()[FOCO]!, conCuerpo()[FOCO + 1]!];
    expect(Math.abs(d.x)).toBeCloseTo(3.5, 5);
    expect(i.x).toBeCloseTo(-d.x, 5);
    // Y asomando por el borde de ataque, no enrasado con él.
    expect(d.z).toBeLessThan(-4);
    expect(d.z).toBeGreaterThan(-4.5);
  });

  it("y sin modelo se sigue tirando de la ficha, que es lo que hay", () => {
    expect(puestas()[VERDE]!.x).toBeCloseTo(avion.wingSpan / 2, 6);
  });
});
