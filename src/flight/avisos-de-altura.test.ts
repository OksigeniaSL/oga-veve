/**
 * La cuenta de la toma, que es la del radioaltímetro.
 *
 * Lo que se comprueba no son los números —esos están en la lista— sino **las
 * reglas que hacen que un número diga la verdad**: se canta en el instante en
 * que se cruza, una vez por aproximación, solo bajando, solo aproximando y
 * nunca con peso en las ruedas. Y la queja entera que lo trajo aquí: «lee
 * 400-300-200 todo seguido cuando estoy lejos… un buen rato después me dice
 * 100… y cuando estoy ya en tierra rodando y frenando me dice 5».
 */

import { describe, expect, it } from "vitest";
import {
  ALCANCE_DEL_RADIOALTIMETRO,
  AvisosDeAltura,
  holguraDe,
  LA_CUENTA,
  laCuentaDe,
  radioaltimetro,
  type Lectura,
} from "./avisos-de-altura";
import { AIRCRAFT } from "./aircraft";
import {
  claveDeCabina,
  DE_LA_CUENTA,
  esDeUnaCaja,
  loDiceElAvion,
} from "../audio/cabina";

const PIE = 0.3048;

/**
 * Una lectura de un fotograma. Por defecto: en el aire, aproximando, bajando
 * a tres metros por segundo y sobre un suelo llano a cota cero, así que la
 * altitud es la propia altura del radar.
 */
function lee(pies: number | null, extra: Partial<Lectura> = {}): Lectura {
  const radioAltura = pies === null ? null : pies * PIE;
  return {
    radioAltura,
    enTierra: false,
    enAproximacion: true,
    vertical: -3,
    altitud: radioAltura ?? 3000 * PIE,
    ...extra,
  };
}

interface Oido {
  dice: string;
  pies: number;
}

/** Baja de una altura a otra, en pies y de pie en pie, y anota lo cantado. */
function bajar(
  a: AvisosDeAltura,
  desde: number,
  hasta: number,
  extra: Partial<Lectura> = {},
  paso = 1,
): Oido[] {
  const oidos: Oido[] = [];
  for (let h = desde; h >= hasta; h -= paso) {
    const aviso = a.paso(lee(h, extra));
    if (aviso) oidos.push({ dice: aviso.dice, pies: h });
  }
  return oidos;
}

const dichos = (o: Oido[]): string[] => o.map((x) => x.dice);

describe("la cuenta canta cada número al cruzarlo", () => {
  it("una toma entera, de fuera del alcance del radar al suelo", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    const oidos = bajar(a, 3000, 0);
    expect(dichos(oidos)).toEqual(LA_CUENTA.map((e) => e.dice));
  });

  it("y cada uno en el instante del cruce, no después", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    for (const o of bajar(a, 3000, 0)) {
      const numero = LA_CUENTA.find((e) => e.dice === o.dice)!;
      const pies = numero.metros / PIE;
      // El fotograma del cruce: a menos de un pie por debajo del número.
      expect(o.pies, o.dice).toBeLessThanOrEqual(pies);
      expect(o.pies, o.dice).toBeGreaterThan(pies - 1.01);
    }
  });

  /*
   * **Y aquí estaba el «todo seguido».** La cuenta de antes cantaba, fotograma
   * a fotograma, el escalón más alto *de los que quedaban por debajo* de la
   * altura: entrar en el embudo de final a doscientos metros soltaba
   * cuatrocientos, trescientos y doscientos seguidos. Ahora lo que se cruzó
   * fuera de la aproximación se cruzó, y no se canta después.
   */
  it("entrar en la aproximación por debajo de varios números no los suelta", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null, { enAproximacion: false }));
    // Bajando lejos de la pista, fuera de la zona de llegada.
    expect(bajar(a, 3000, 650, { enAproximacion: false })).toEqual([]);
    // Y ya en la aproximación, a seiscientos cincuenta pies.
    const oidos = bajar(a, 650, 0);
    expect(dichos(oidos)[0]).toBe("five hundred");
    expect(oidos[0]!.pies).toBeGreaterThan(499);
  });

  it("un número que ya quedó atrás no se canta tarde", () => {
    // El suelo sube de golpe bajo el avión: un acantilado, o el banco que
    // teletransporta el avión a la final de otro campo.
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 1100);
    expect(a.paso(lee(700))).toBeNull();
    // Y la cuenta sigue desde donde se está.
    expect(dichos(bajar(a, 700, 400))).toEqual(["five hundred", "four hundred"]);
  });

  it("si se cruzan varios en un fotograma, se canta el que describe dónde se está", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 45);
    expect(a.paso(lee(25))?.dice).toBe("thirty");
  });

  it("y nunca a más de un quince por ciento de su número", () => {
    /*
     * Es la misma vara con la que el banco mide lo que se oye. Aquí, con un
     * suelo que tiembla bajo el avión en cada fotograma y bajadas a ritmos
     * distintos: lo cantado tiene que describir la altura del momento.
     */
    let semilla = 7;
    const azar = (): number => {
      semilla = (semilla * 16807) % 2147483647;
      return semilla / 2147483647;
    };
    for (const ritmo of [0.5, 2, 5, 12]) {
      const a = new AvisosDeAltura();
      let altitud = 3200 * PIE;
      a.paso(lee(null, { altitud }));
      while (altitud > 0) {
        altitud -= ritmo * PIE;
        const suelo = Math.max(0, (azar() - 0.5) * 60 * PIE);
        const pies = Math.max(0, (altitud - suelo) / PIE);
        const aviso = a.paso(
          lee(pies > 2500 ? null : pies, { altitud }),
        );
        if (!aviso) continue;
        expect(
          Math.abs(pies - aviso.metros / PIE),
          `${aviso.dice} a ${pies.toFixed(0)} ft`,
        ).toBeLessThanOrEqual(holguraDe(aviso.metros) / PIE + 1e-6);
      }
    }
  });
});

describe("y solo cuando la cuenta es de verdad", () => {
  it("con peso en las ruedas, nada", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 0);
    // Rodando y frenando: el «cinco» ya rodando era la queja.
    for (let i = 0; i < 50; i++)
      expect(a.paso(lee(0, { enTierra: true }))).toBeNull();
  });

  it("subiendo, nada", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(0, { enTierra: true, altitud: 0 }));
    for (let h = 0; h <= 3000; h += 1)
      expect(a.paso(lee(h > 2500 ? null : h, { vertical: 5, altitud: h * PIE }))).toBeNull();
  });

  it("fuera de la aproximación, nada: una sierra en crucero no es una toma", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null, { enAproximacion: false }));
    let oidos = 0;
    // Nivelado a 2000 pies sobre el mar, con crestas que suben hasta 1900.
    for (let i = 0; i < 200; i++) {
      const cresta = (i % 20) * 95;
      const aviso = a.paso(
        lee(2000 - cresta, { enAproximacion: false, altitud: 2000 * PIE, vertical: 0 }),
      );
      if (aviso) oidos++;
    }
    expect(oidos).toBe(0);
  });

  it("rondar un número no lo repite", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 55);
    const oidos: string[] = [];
    for (const h of [52, 48, 53, 47, 51, 46]) {
      const aviso = a.paso(lee(h));
      if (aviso) oidos.push(aviso.dice);
    }
    expect(oidos).toEqual(["fifty"]);
  });

  /*
   * **El barranco de La Palma.** Sobre relieve, la altura sobre el suelo sube
   * y baja con cada pliegue aunque el avión baje recto: con un rearme que
   * mirara solo esa altura, «cien» sonó seiscientas siete veces en un vuelo.
   * Lo que rearma es subir de verdad, y eso lo dice la altitud.
   */
  it("un barranco debajo no rearma lo cantado", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 95);
    // El avión sigue bajando y el suelo cae trescientos pies y vuelve.
    let altitud = 95 * PIE;
    const oidos: string[] = [];
    for (let i = 0; i < 40; i++) {
      altitud -= 0.1;
      const hondo = i % 10 < 5 ? 300 * PIE : 0;
      const aviso = a.paso(
        lee((altitud + hondo) / PIE, { altitud }),
      );
      if (aviso) oidos.push(aviso.dice);
    }
    expect(oidos).not.toContain("one hundred");
    expect(oidos).not.toContain("two hundred");
  });

  it("pero una frustrada sí: se sube de verdad y la siguiente cuenta va entera", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 30);
    // Al aire: subiendo de verdad hasta el circuito, a mil quinientos pies.
    for (let h = 30; h <= 1500; h += 1)
      a.paso(lee(h, { vertical: 5 }));
    const segunda = dichos(bajar(a, 1500, 0));
    expect(segunda).toEqual(
      LA_CUENTA.filter((e) => e.metros < 1500 * PIE).map((e) => e.dice),
    );
  });

  it("el rebote de una toma no rearma nada", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 0);
    a.paso(lee(0, { enTierra: true }));
    const oidos: string[] = [];
    // Un bote de ocho pies, arriba y abajo.
    for (const h of [2, 5, 8, 6, 3, 1]) {
      const aviso = a.paso(lee(h, { vertical: h > 6 ? 1 : -1 }));
      if (aviso) oidos.push(aviso.dice);
    }
    expect(oidos).toEqual([]);
  });

  it("la carrera de despegue, rebotando, tampoco canta", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(0, { enTierra: true }));
    let oidos = 0;
    for (let i = 0; i < 100; i++) {
      const enTierra = i % 3 === 0;
      if (a.paso(lee(i % 3 === 1 ? 12 : 4, { enTierra, vertical: -1 }))) oidos++;
    }
    expect(oidos).toBe(0);
  });

  it("y un toque y despegue sí vuelve a contar la siguiente", () => {
    const a = new AvisosDeAltura();
    a.paso(lee(null));
    bajar(a, 3000, 0);
    a.paso(lee(0, { enTierra: true }));
    for (let h = 0; h <= 1200; h += 1) a.paso(lee(h, { vertical: 5 }));
    expect(dichos(bajar(a, 1200, 0))[0]).toBe("one thousand");
  });

  it("una lección que empieza en final canta desde donde está", () => {
    const a = new AvisosDeAltura();
    // Sin pasado: el primer fotograma ya es a setecientos pies.
    expect(a.paso(lee(700))).toBeNull();
    expect(dichos(bajar(a, 699, 0))[0]).toBe("five hundred");
  });
});

describe("lo que mide el radioaltímetro", () => {
  it("las ruedas sobre el suelo, no el centro del avión", () => {
    // El JAZ 120 lleva casi seis metros de tren: con las ruedas tocando, cero.
    expect(radioaltimetro(5.9, 5.9)).toBe(0);
    expect(radioaltimetro(5.9 + 20 * PIE, 5.9)).toBeCloseTo(20 * PIE, 6);
  });

  it("y nada por encima de su alcance", () => {
    expect(radioaltimetro(ALCANCE_DEL_RADIOALTIMETRO + 10, 2)).toBeNull();
    expect(ALCANCE_DEL_RADIOALTIMETRO / PIE).toBeCloseTo(2500, 6);
  });
});

/*
 * **La cuenta de la máquina, en el avión que la lleva, y en ningún otro.** Ver
 * `laCuentaDe` y la cabecera de `flight/escalera.ts`.
 */
describe("qué cuenta lleva cada avión", () => {
  const conRadioaltimetro = AIRCRAFT.filter((a) => a.avisosHablados);

  it("la llevan el turbohélice y los dos reactores", () => {
    expect(conRadioaltimetro.map((a) => a.id).sort()).toEqual([
      "jaz-120",
      "jaz-60",
      "jaz-90",
    ]);
    for (const a of conRadioaltimetro) expect(laCuentaDe(a), a.id).toBe(LA_CUENTA);
  });

  it("y las avionetas no llevan ninguna: no hay caja que la cante", () => {
    for (const a of AIRCRAFT.filter((x) => !x.avisosHablados))
      expect(laCuentaDe(a), a.id).toEqual([]);
  });

  it("es la secuencia de verdad, en pies, de dos mil quinientos a diez", () => {
    expect(LA_CUENTA.map((e) => [e.dice, Math.round(e.metros / PIE)])).toEqual([
      ["twenty five hundred", 2500],
      ["one thousand", 1000],
      ["five hundred", 500],
      ["four hundred", 400],
      ["three hundred", 300],
      ["two hundred", 200],
      ["one hundred", 100],
      ["fifty", 50],
      ["forty", 40],
      ["thirty", 30],
      ["twenty", 20],
      ["ten", 10],
    ]);
  });

  it("cada número tiene su toma de cabina, y es de una caja", () => {
    for (const e of LA_CUENTA) {
      const clave = claveDeCabina(e.dice);
      expect(clave, e.dice).not.toBeNull();
      expect(DE_LA_CUENTA.has(clave!), e.dice).toBe(true);
      expect(esDeUnaCaja(clave!), e.dice).toBe(true);
      for (const a of conRadioaltimetro)
        expect(loDiceElAvion(clave!, a), `${a.id} ${e.dice}`).toBe(true);
    }
  });
});
