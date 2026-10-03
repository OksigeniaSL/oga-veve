/**
 * Las luces del tráfico: qué lleva encendido cada uno y cuándo.
 *
 * Lo que se comprueba es **la regla**, que es lo que se enseña: el destello
 * blanco dice «estoy en la pista o volando», la baliza «tengo los motores en
 * marcha», los focos «me voy» o «vengo». Una luz encendida a destiempo enseña
 * a leer mal un aeropuerto de noche.
 */

import { describe, expect, it } from "vitest";
import type { Points } from "three";
import {
  alumbraHacia,
  CADA_ESTROBO,
  DE_PASAJE,
  DURA_EL_ESTROBO,
  equipoDe,
  estroboAhora,
  LucesDeUnAvion,
  lucesDelTrafico,
  materialDeLuces,
  SECTORES,
  sitiosDeGeometria,
  sitiosPorMedidas,
  type FaseDeLuces,
} from "./luces-del-trafico";
import { crearTrafico } from "./trafico";
import { fabricarTurbohelice, LIBREAS_DE_LAS_ISLAS } from "./aviones-de-las-islas";
import type { Pista } from "./circuito";

describe("qué lleva encendido según lo que hace", () => {
  it("la navegación, siempre, también aparcado", () => {
    const fases: FaseDeLuces[] = [
      "aparcado",
      "rodando",
      "esperando",
      "entrando",
      "alineado",
      "carrera",
      "volando",
    ];
    for (const f of fases) expect(lucesDelTrafico(f).navegacion, f).toBe(true);
  });

  it("la baliza con los motores en marcha: aparcado, apagada", () => {
    expect(lucesDelTrafico("aparcado").baliza).toBe(false);
    expect(lucesDelTrafico("rodando").baliza).toBe(true);
    expect(lucesDelTrafico("esperando").baliza).toBe(true);
    expect(lucesDelTrafico("volando").baliza).toBe(true);
  });

  it("los destellos, al entrar en la pista y en vuelo, y no rodando", () => {
    expect(lucesDelTrafico("rodando").estroboscopicas).toBe(false);
    expect(lucesDelTrafico("esperando").estroboscopicas).toBe(false);
    expect(lucesDelTrafico("entrando").estroboscopicas).toBe(true);
    expect(lucesDelTrafico("alineado").estroboscopicas).toBe(true);
    expect(lucesDelTrafico("carrera").estroboscopicas).toBe(true);
    expect(lucesDelTrafico("volando").estroboscopicas).toBe(true);
  });

  it("el faro de rodaje rodando, y parado en la doble raya se apaga", () => {
    expect(lucesDelTrafico("rodando").rodaje).toBe(true);
    expect(lucesDelTrafico("esperando").rodaje).toBe(false);
    expect(lucesDelTrafico("volando").rodaje).toBe(false);
  });

  it("los focos con el despegue, no alineado esperando", () => {
    expect(lucesDelTrafico("alineado").aterrizaje).toBe(false);
    expect(lucesDelTrafico("carrera").aterrizaje).toBe(true);
  });

  it("y en vuelo, por debajo de diez mil pies y no por encima", () => {
    expect(lucesDelTrafico("volando", 900).aterrizaje).toBe(true);
    expect(lucesDelTrafico("volando", 3000).aterrizaje).toBe(true);
    expect(lucesDelTrafico("volando", 3100).aterrizaje).toBe(false);
    expect(lucesDelTrafico("volando", 11000).aterrizaje).toBe(false);
  });
});

describe("el destello", () => {
  it("es corto y se repite", () => {
    expect(estroboAhora(0)).toBe(true);
    expect(estroboAhora(DURA_EL_ESTROBO * 1.5)).toBe(false);
    expect(estroboAhora(CADA_ESTROBO * 3 + DURA_EL_ESTROBO / 2)).toBe(true);
    expect(estroboAhora(CADA_ESTROBO / 2)).toBe(false);
  });

  it("y no se queda encendido la mayor parte del tiempo", () => {
    let encendido = 0;
    for (let i = 0; i < 1000; i++) if (estroboAhora(i * 0.01)) encendido++;
    expect(encendido / 1000).toBeLessThan(0.15);
  });
});

describe("las luces de un avión", () => {
  const luces = () =>
    new LucesDeUnAvion(sitiosPorMedidas(30), materialDeLuces(), 0);

  it("la verde a la derecha y la roja a la izquierda", () => {
    const l = luces();
    const pos = l.puntos.geometry.getAttribute("position");
    const col = l.puntos.geometry.getAttribute("color");
    const verde = Array.from({ length: pos.count }, (_, i) => i).find(
      (i) => col.getY(i) > 0.5 && col.getX(i) < 0.4,
    )!;
    const roja = Array.from({ length: pos.count }, (_, i) => i).find(
      (i) => col.getX(i) > 0.5 && col.getY(i) < 0.4 && col.getZ(i) < 0.4,
    )!;
    expect(pos.getX(verde)).toBeGreaterThan(0);
    expect(pos.getX(roja)).toBeLessThan(0);
  });

  it("y cada una alumbra hacia su lado: roja y verde a la vez, solo de frente", () => {
    /** Si la luz `i` se ve desde `angulo` grados desde el morro, a derechas. */
    const seVe = (i: number, angulo: number) => {
      const [centro, mitad] = SECTORES[i]!;
      const a = (angulo * Math.PI) / 180;
      const d = Math.abs(
        ((((a - centro + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI)) -
          Math.PI,
      );
      return d <= mitad + 1e-9;
    };
    const [VERDE, ROJA, COLA, , , , , , FOCO] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    // De frente se ven las dos de color y el foco, y la de cola no.
    expect(seVe(VERDE, 0) && seVe(ROJA, 0) && seVe(FOCO!, 0)).toBe(true);
    expect(seVe(COLA!, 0)).toBe(false);
    // Por la derecha, la verde sola.
    expect(seVe(VERDE, 90)).toBe(true);
    expect(seVe(ROJA, 90)).toBe(false);
    // Y de espaldas, la blanca y nada de color ni foco.
    expect(seVe(COLA!, 180)).toBe(true);
    expect(seVe(VERDE, 180) || seVe(ROJA, 180) || seVe(FOCO!, 180)).toBe(false);
    // Los destellos y la baliza, desde cualquier lado.
    for (const a of [0, 90, 180, 270]) expect(seVe(5, a) && seVe(3, a)).toBe(true);
  });

  it("apagada es tamaño cero, y aparcado solo quedan las tres de navegación", () => {
    const l = luces();
    l.paso(0, lucesDelTrafico("aparcado"));
    expect(l.tamanosAhora.filter((t) => t > 0)).toHaveLength(3);
  });

  it("volando, en el destello, lleva las tres blancas de las puntas y la cola", () => {
    const l = luces();
    l.paso(0, lucesDelTrafico("volando", 500));
    const encendidas = l.tamanosAhora.filter((t) => t > 0).length;
    // Tres de navegación, dos balizas, tres destellos y dos focos.
    expect(encendidas).toBe(10);
    l.paso(CADA_ESTROBO / 2, lucesDelTrafico("volando", 500));
    // Entre destellos: ni estroboscópicas ni baliza.
    expect(l.tamanosAhora.filter((t) => t > 0).length).toBe(5);
  });

  it("y los sitios de un cuerpo de verdad caen en sus puntas de ala", () => {
    const geo = fabricarTurbohelice(LIBREAS_DE_LAS_ISLAS[0]!);
    const s = sitiosDeGeometria(geo)!;
    // Veintisiete metros de ala: las puntas a trece y medio, un dedo fuera.
    expect(s.alaDerecha.x).toBeGreaterThan(13);
    expect(s.alaDerecha.x).toBeLessThan(14.5);
    expect(s.alaIzquierda.x).toBeLessThan(-13);
    // La cola detrás y el morro delante: el morro mira a −Z.
    expect(s.cola.z).toBeGreaterThan(10);
    expect(s.morro.z).toBeLessThan(-12);
    // Y la baliza de arriba por encima de la de abajo.
    expect(s.lomo.y).toBeGreaterThan(s.panza.y);
    // Y lo alto de la deriva, por encima del lomo y detrás.
    expect(s.deriva.y).toBeGreaterThan(s.lomo.y);
    expect(s.deriva.z).toBeGreaterThan(s.lomo.z);
  });
});

describe("de frente se ven las dos, aunque no sea exactamente de frente", () => {
  /*
   * Desde trescientos metros delante de un reactor, cada punta de ala ve el
   * ojo cuatro grados hacia el otro lado del eje: con el borde a cuchillo no
   * se veía ni la roja ni la verde. Las de verdad se desbordan —el 14 CFR
   * 25.1395 deja diez grados enteros— y aquí también.
   */
  const g = (x: number) => (x * Math.PI) / 180;
  const [VERDE, ROJA, BLANCA] = [SECTORES[0]!, SECTORES[1]!, SECTORES[2]!];

  it("a cuatro grados del morro, de un lado o del otro, las dos enteras", () => {
    for (const a of [-4, 4]) {
      expect(alumbraHacia(VERDE, g(a))).toBeGreaterThan(0.99);
      expect(alumbraHacia(ROJA, g(a))).toBeGreaterThan(0.99);
    }
  });

  it("y a treinta grados ya solo la de su lado", () => {
    expect(alumbraHacia(VERDE, g(30))).toBe(1);
    expect(alumbraHacia(ROJA, g(30))).toBe(0);
    expect(alumbraHacia(ROJA, g(-30))).toBe(1);
    expect(alumbraHacia(VERDE, g(-30))).toBe(0);
  });

  it("y de espaldas, la blanca sola: se aleja", () => {
    expect(alumbraHacia(BLANCA, g(180))).toBe(1);
    expect(alumbraHacia(VERDE, g(180))).toBe(0);
    expect(alumbraHacia(ROJA, g(180))).toBe(0);
    // Y de frente, la blanca no.
    expect(alumbraHacia(BLANCA, 0)).toBe(0);
  });
});

describe("cada clase con su equipo", () => {
  it("los de pasaje, dos balizas y destellos en las puntas y en la cola", () => {
    for (const silueta of ["cola-en-t", "reactor", "cuatrimotor"] as const)
      expect(equipoDe(silueta)).toEqual(DE_PASAJE);
  });

  it("la avioneta de ala alta, la baliza en la deriva y los dos faros en el ala izquierda", () => {
    expect(equipoDe("ala-alta")).toEqual({
      baliza: "deriva",
      estroboscopicas: "puntas",
      rodaje: "ala",
      focos: "ala-izquierda",
    });
  });

  it("y una avioneta del tráfico no enciende lo que no lleva", () => {
    const l = new LucesDeUnAvion(
      sitiosPorMedidas(11),
      materialDeLuces(),
      0,
      equipoDe("ala-alta"),
    );
    l.paso(0, lucesDelTrafico("volando", 500));
    const t = l.tamanosAhora;
    // Sin baliza de abajo ni destello en la cola.
    expect(t[4]).toBe(0);
    expect(t[7]).toBe(0);
    // Ni foco en el ala derecha: los dos faros del 172 van en la izquierda.
    expect(t[8]).toBe(0);
    // Y con todo lo demás: tres de navegación, una baliza, dos destellos y
    // el foco de aterrizaje.
    expect(t.filter((x) => x > 0)).toHaveLength(7);
  });
});

describe("el tráfico del aeródromo, con sus luces", () => {
  const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 1800 };

  /** Cuántas luces lleva encendidas el primer avión, y cuáles. */
  const suyas = (t: ReturnType<typeof crearTrafico>) => {
    const avion = t.grupo.children[0]!;
    const p = avion.getObjectByName("luces-del-trafico") as Points;
    const tam = p.geometry.getAttribute("tamano");
    return Array.from({ length: tam.count }, (_, i) => tam.getX(i));
  };
  /** Índices de las luces: ver `ORDEN` en `luces-del-trafico.ts`. */
  const RODAJE = 10;
  // El de aterrizaje del ala izquierda: la avioneta de ala alta lleva los dos
  // faros en esa ala, y en la derecha ninguno. Ver `equipoDe`.
  const FOCO = 9;

  it("rodando a la cabecera lleva el faro, y en la doble raya lo apaga", () => {
    const t = crearTrafico(PISTA, 100, "ala-alta");
    t.anuncia("ECO", "otro.rodando");
    t.paso(0.1);
    expect(suyas(t)[RODAJE]).toBeGreaterThan(0);
    // Hasta que llega a la doble raya y se para ahí.
    for (let i = 0; i < 600; i++) t.paso(0.1);
    expect(suyas(t)[RODAJE]).toBe(0);
  });

  it("alineado esperando, destellos sí y focos no; despegando, los dos", () => {
    const t = crearTrafico(PISTA, 100, "ala-alta");
    t.anuncia("ECO", "torre.lineUpWait");
    for (let i = 0; i < 400; i++) t.paso(0.05);
    // En el eje y parado: los focos, apagados.
    expect(suyas(t)[FOCO]).toBe(0);
    // Y los destellos van y vienen: alguno de estos pasos los pilla.
    let destello = false;
    for (let i = 0; i < 30; i++) {
      t.paso(0.05);
      if (suyas(t)[5]! > 0) destello = true;
    }
    expect(destello).toBe(true);
    t.anuncia("ECO", "torre.clearedTakeoff");
    t.paso(0.1);
    expect(suyas(t)[FOCO]).toBeGreaterThan(0);
  });

  it("y el que viene en final, con los focos puestos", () => {
    const t = crearTrafico(PISTA, 100, "ala-alta");
    t.anuncia("ECO", "otro.final", true);
    t.paso(0.1);
    expect(suyas(t)[FOCO]).toBeGreaterThan(0);
    expect(suyas(t)[RODAJE]).toBe(0);
  });
});
