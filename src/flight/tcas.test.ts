/**
 * Que el TCAS avise cuando avisa uno de verdad, y en los aviones que lo llevan.
 *
 * Las cuentas se prueban contra los números publicados —la tabla 2 del
 * folleto de la FAA— y no contra lo que salga: un aviso que salta diez
 * segundos tarde es un aviso que llega cuando ya no hay nada que mirar.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import {
  CALLADO_POR_DEBAJO,
  Tcas,
  horaDelReloj,
  pideAviso,
  sensibilidad,
  soloAvisa,
  type Intruso,
  type Propio,
} from "./tcas";

const PIE = 0.3048;
const MILLA = 1852;
const NUDO = 1852 / 3600;

describe("quién lleva TCAS", () => {
  it("las avionetas y el fumigador, ninguno", () => {
    for (const id of ["jaz-20", "jaz-25", "jaz-40"])
      expect(aircraftById(id).tcas, id).toBeNull();
  });

  it("el turbohélice de diecinueve plazas, el TCAS I, que solo avisa", () => {
    expect(aircraftById("jaz-60").tcas).toBe("TCAS I");
  });

  it("los dos reactores, el TCAS II", () => {
    expect(aircraftById("jaz-90").tcas).toBe("TCAS II");
    expect(aircraftById("jaz-120").tcas).toBe("TCAS II");
  });

  it("cumple la raya de la OACI: turbina de más de 5 700 kg, ACAS II", () => {
    /*
     * La norma, escrita como prueba: si mañana entra un avión de turbina más
     * pesado en la flota, tiene que llegar con su TCAS II o esto falla.
     */
    for (const a of AIRCRAFT) {
      const turbina =
        a.sound.engine === "turbofan" || a.sound.engine === "turboprop";
      if (turbina && a.mass > 5700) expect(a.tcas, a.id).toBe("TCAS II");
      if (!turbina) expect(a.tcas, a.id).toBeNull();
    }
  });

  it("y el TCAS II de aquí dice TA ONLY, porque no da maniobras", () => {
    expect(soloAvisa("TCAS II")).toBe(true);
    expect(soloAvisa("TCAS I")).toBe(false);
  });
});

describe("la tabla de sensibilidad", () => {
  it("pegado al suelo, veinte segundos", () => {
    expect(sensibilidad(500, 500)).toMatchObject({ nivel: 2, tau: 20 });
  });

  it("de mil a dos mil trescientos cincuenta pies sobre el suelo, veinticinco", () => {
    expect(sensibilidad(1500, 1500)).toMatchObject({ nivel: 3, tau: 25, dmod: 0.33 });
  });

  it("y por altitud a partir de ahí, hasta cuarenta y ocho en crucero", () => {
    expect(sensibilidad(4000, 4000).tau).toBe(30);
    expect(sensibilidad(8000, 8000).tau).toBe(40);
    expect(sensibilidad(15000, 15000).tau).toBe(45);
    expect(sensibilidad(35000, 35000)).toMatchObject({ tau: 48, zthr: 850 });
    expect(sensibilidad(43000, 43000).zthr).toBe(1200);
  });

  it("los dos primeros tramos van sobre el suelo, no sobre el mar", () => {
    // Los Rodeos está a dos mil pies: a quinientos sobre la pista es el 2.
    expect(sensibilidad(2600, 500).nivel).toBe(2);
  });
});

describe("cuándo pide aviso", () => {
  const sl5 = sensibilidad(8000, 8000); // tau 40, DMOD 0,75
  // Quinientos nudos de acercamiento, de frente.
  const cierre = -500 / 3600;

  it("de frente y a la misma altura, a unos cuarenta segundos", () => {
    // A cinco millas faltan treinta y seis segundos: aviso.
    expect(pideAviso(sl5, { r: 5, rPunto: cierre, a: 0, aPunto: 0 })).toBe(true);
    // A seis, cuarenta y tres: todavía no.
    expect(pideAviso(sl5, { r: 6, rPunto: cierre, a: 0, aPunto: 0 })).toBe(false);
  });

  it("a mil pies de altura y sin juntarse, no avisa aunque pase encima", () => {
    /*
     * Es la separación de una aerovía: mil pies de diferencia y cada uno a
     * su nivel. Un TCAS que avisara ahí avisaría en cada cruce del mundo.
     */
    expect(pideAviso(sl5, { r: 1, rPunto: cierre, a: 1000, aPunto: 0 })).toBe(false);
    // A ochocientos, dentro del umbral de altura, sí.
    expect(pideAviso(sl5, { r: 1, rPunto: cierre, a: 800, aPunto: 0 })).toBe(true);
  });

  it("y a mil pies si se van juntando deprisa, también", () => {
    // Subiendo a dos mil pies por minuto hacia él: mil pies en treinta segundos.
    expect(
      pideAviso(sl5, { r: 3, rPunto: cierre, a: 1000, aPunto: -2000 / 60 }),
    ).toBe(true);
  });

  it("uno que se acerca muy despacio avisa al entrar en DMOD", () => {
    // Diez nudos de cierre: el tau simple no avisaría hasta tenerlo encima.
    expect(pideAviso(sl5, { r: 0.7, rPunto: -10 / 3600, a: 0, aPunto: 0 })).toBe(true);
  });

  it("y uno que se aleja, fuera de DMOD, no avisa", () => {
    expect(pideAviso(sl5, { r: 2, rPunto: -cierre, a: 0, aPunto: 0 })).toBe(false);
  });
});

describe("la hora del reloj", () => {
  it("las doce delante, las tres a la derecha, las nueve a la izquierda", () => {
    expect(horaDelReloj(0, 0)).toBe(12);
    expect(horaDelReloj(90, 0)).toBe(3);
    expect(horaDelReloj(270, 0)).toBe(9);
    expect(horaDelReloj(180, 0)).toBe(6);
  });

  it("y con el rumbo propio restado", () => {
    // Volando al este, algo al sur queda a la derecha.
    expect(horaDelReloj(180, 90)).toBe(3);
    expect(horaDelReloj(45, 350)).toBe(2);
  });
});

/** Un vuelo a rumbo norte a `pies` de altitud y de altura. */
const yo = (z: number, pies: number, extra: Partial<Propio> = {}): Propio => ({
  x: 0,
  y: pies * PIE,
  z,
  sobreElSuelo: pies * PIE,
  rumbo: 0,
  pantalla: true,
  terrenoAvisando: false,
  ...extra,
});

/**
 * Un encuentro de frente: yo al norte a 250 nudos, el otro al sur a 250,
 * separados de salida por `millas` y con `diferencia` pies de altura.
 * Devuelve cuándo salió el aviso, s, y a cuántas millas.
 */
function deFrente(
  millas: number,
  pies: number,
  diferencia: number,
  extra: Partial<Propio> = {},
  intrusoExtra: Partial<Intruso> = {},
) {
  const tcas = new Tcas();
  const v = 250 * NUDO;
  const dt = 0.1;
  let t = 0;
  const avisos: { t: number; millas: number; hora: number }[] = [];
  const cuantos = Math.ceil((millas * MILLA) / (2 * v) / dt) + 100;
  for (let i = 0; i < cuantos; i++) {
    const miZ = -v * t;
    const suZ = -millas * MILLA + v * t;
    for (const a of tcas.paso(dt, "TCAS II", yo(miZ, pies, extra), [
      {
        id: "el-otro",
        x: 30,
        y: (pies + diferencia) * PIE,
        z: suZ,
        ...intrusoExtra,
      },
    ]))
      avisos.push({ t, millas: Math.abs(miZ - suZ) / MILLA, hora: a.hora });
    t += dt;
  }
  return { avisos, tcas };
}

describe("el TCAS volando", () => {
  it("de frente a ocho mil pies, avisa una vez a unos cuarenta segundos", () => {
    const { avisos } = deFrente(10, 8000, 0);
    expect(avisos).toHaveLength(1);
    // Quinientos nudos de cierre y cuarenta de tau: cinco millas y pico.
    const a = avisos[0]!;
    expect(a.millas).toBeGreaterThan(4.9);
    expect(a.millas).toBeLessThan(5.9);
    // Y por delante: las doce.
    expect(a.hora).toBe(12);
  });

  it("a tres mil pies avisa más cerca, que el tau es de treinta", () => {
    const { avisos } = deFrente(10, 3000, 0);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.millas).toBeLessThan(4.6);
    expect(avisos[0]!.millas).toBeGreaterThan(3.8);
  });

  it("a mil pies de diferencia y sin juntarse, callado", () => {
    expect(deFrente(10, 8000, 1000).avisos).toHaveLength(0);
  });

  it("por debajo de quinientos pies no hay voz", () => {
    expect(CALLADO_POR_DEBAJO).toBe(500);
    expect(deFrente(4, 400, 0).avisos).toHaveLength(0);
  });

  it("con el terreno sonando, tampoco", () => {
    expect(deFrente(10, 8000, 0, { terrenoAvisando: true }).avisos).toHaveLength(0);
  });

  it("contra quien está posado, nunca", () => {
    expect(deFrente(10, 8000, 0, {}, { enElSuelo: true }).avisos).toHaveLength(0);
  });

  it("en el suelo, nunca", () => {
    const tcas = new Tcas();
    let avisos = 0;
    for (let i = 0; i < 400; i++)
      avisos += tcas.paso(0.1, "TCAS II", yo(0, 0, { sobreElSuelo: 0 }), [
        { id: "llega", x: 0, y: 150, z: -3000 + i * 7 },
      ]).length;
    expect(avisos).toBe(0);
  });

  it("sin TCAS no hay nada que pintar ni que decir", () => {
    const tcas = new Tcas();
    expect(
      tcas.paso(1, null, yo(0, 8000), [{ id: "a", x: 0, y: 8000 * PIE, z: -100 }]),
    ).toHaveLength(0);
    expect(tcas.enPantalla).toHaveLength(0);
  });
});

describe("lo que pinta", () => {
  const pinta = (intrusos: Intruso[], propio = yo(0, 8000)) => {
    const tcas = new Tcas();
    // Dos ciclos, para que haya ritmo.
    tcas.paso(1, "TCAS II", propio, intrusos);
    tcas.paso(1, "TCAS II", propio, intrusos);
    return tcas.enPantalla;
  };

  it("rombo lleno a menos de seis millas y mil doscientos pies", () => {
    const [b] = pinta([{ id: "a", x: 5 * MILLA, y: 8900 * PIE, z: 0 }]);
    expect(b?.clase).toBe("cerca");
  });

  it("y hueco más lejos", () => {
    const [b] = pinta([{ id: "a", x: 10 * MILLA, y: 8500 * PIE, z: 0 }]);
    expect(b?.clase).toBe("otro");
  });

  it("fuera de la banda de dos mil setecientos pies no se pinta", () => {
    expect(pinta([{ id: "a", x: 5 * MILLA, y: 11000 * PIE, z: 0 }])).toHaveLength(0);
  });

  it("con la pantalla en espera, nada", () => {
    expect(
      pinta([{ id: "a", x: 5 * MILLA, y: 8900 * PIE, z: 0 }], yo(0, 8000, { pantalla: false })),
    ).toHaveLength(0);
  });

  it("la flecha, a partir de quinientos pies por minuto", () => {
    const tcas = new Tcas();
    const propio = yo(0, 8000);
    // Sube a mil pies por minuto: 16,7 pies por segundo.
    for (let s = 0; s < 3; s++)
      tcas.paso(1, "TCAS II", propio, [
        { id: "sube", x: 8 * MILLA, y: (7000 + (1000 / 60) * s) * PIE, z: 0 },
        { id: "quieto", x: -8 * MILLA, y: 7000 * PIE, z: 0 },
      ]);
    const sube = tcas.enPantalla.find((b) => b.id === "sube");
    const quieto = tcas.enPantalla.find((b) => b.id === "quieto");
    expect(sube?.tendencia).toBe(1);
    expect(quieto?.tendencia).toBe(0);
  });

  it("y el que avisa, en ámbar, mientras dure", () => {
    const { tcas } = deFrente(10, 8000, 0);
    // Al final del encuentro ya se han cruzado y se alejan: el aviso se quita.
    expect(tcas.enPantalla.every((b) => b.clase !== "aviso")).toBe(true);
    const otra = new Tcas();
    const v = 250 * NUDO;
    let visto = false;
    for (let i = 0; i < 1200 && !visto; i++) {
      const t = i * 0.1;
      otra.paso(0.1, "TCAS II", yo(-v * t, 8000), [
        { id: "x", x: 30, y: 8000 * PIE, z: -10 * MILLA + v * t },
      ]);
      visto = otra.enPantalla.some((b) => b.clase === "aviso");
    }
    expect(visto).toBe(true);
  });
});
