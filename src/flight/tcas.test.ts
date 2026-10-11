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
  bandaPara,
  daLaManiobra,
  distanciaDeCruce,
  elegirSentido,
  modoEnPantalla,
  ordenPara,
  pideResolucion,
  ritmoQueBasta,
  RITMO_DE_LA_MANIOBRA,
  SIN_BAJAR_POR_DEBAJO,
  SIN_RA_POR_DEBAJO,
  Tcas,
  horaDelReloj,
  pideAviso,
  sensibilidad,
  type CambioDelRa,
  type EquipoTcas,
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

  it("y la maniobra, el RA, solo la da el TCAS II: el TCAS I solo avisa", () => {
    expect(daLaManiobra("TCAS II")).toBe(true);
    expect(daLaManiobra("TCAS I")).toBe(false);
    expect(daLaManiobra(null)).toBe(false);
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

  it("a quien está posado no se le pinta", () => {
    /*
     * Visto en el banco con la GPU: en el punto de espera, los que esperaban
     * al lado salían encima del propio avión, tres rombos con «00».
     */
    expect(
      pinta([{ id: "a", x: 60, y: 8000 * PIE, z: 0, enElSuelo: true }]),
    ).toHaveLength(0);
  });

  it("y en espera no está en marcha, que es cuando no se dice TA ONLY", () => {
    const tcas = new Tcas();
    tcas.paso(1, "TCAS II", yo(0, 0, { pantalla: false }), []);
    expect(tcas.enMarcha).toBe(false);
    tcas.paso(1, "TCAS II", yo(0, 0, { pantalla: true }), []);
    expect(tcas.enMarcha).toBe(true);
    tcas.paso(1, null, yo(0, 0, { pantalla: true }), []);
    expect(tcas.enMarcha).toBe(false);
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

describe("la banda de altura y lo que escribe la pantalla", () => {
  const pinta = (intrusos: Intruso[], propio: Propio) => {
    const tcas = new Tcas();
    tcas.paso(1, "TCAS II", propio, intrusos);
    tcas.paso(1, "TCAS II", propio, intrusos);
    return tcas.enPantalla;
  };
  // Uno 5 000 ft por encima y otro 5 000 por debajo, a cinco millas.
  const arribaYAbajo: Intruso[] = [
    { id: "arriba", x: 5 * MILLA, y: 13000 * PIE, z: 0 },
    { id: "abajo", x: -5 * MILLA, y: 3000 * PIE, z: 0 },
  ];

  it("NORM: dos mil setecientos pies a cada lado, y ninguno de los dos", () => {
    expect(pinta(arribaYAbajo, yo(0, 8000))).toHaveLength(0);
  });

  it("ABV abre por arriba hasta 9 900 ft, y BLW por abajo", () => {
    expect(pinta(arribaYAbajo, yo(0, 8000, { banda: "ABV" })).map((b) => b.id)).toEqual([
      "arriba",
    ]);
    expect(pinta(arribaYAbajo, yo(0, 8000, { banda: "BLW" })).map((b) => b.id)).toEqual([
      "abajo",
    ]);
  });

  it("la banda la pone la ventanilla: subiendo a ella ABV, bajando BLW, nivelado NORM", () => {
    expect(bandaPara(null, 8000)).toBe("NORM");
    expect(bandaPara(14000, 8000)).toBe("ABV");
    expect(bandaPara(4000, 8000)).toBe("BLW");
    expect(bandaPara(8100, 8000, "ABV")).toBe("NORM");
    // Entre trescientos y mil pies se queda como estaba: no parpadea.
    expect(bandaPara(8600, 8000, "ABV")).toBe("ABV");
    expect(bandaPara(8600, 8000, "NORM")).toBe("NORM");
  });

  it("TCAS STBY en espera, TA ONLY trabajando, y la banda detrás", () => {
    expect(modoEnPantalla(null, false)).toBeNull();
    expect(modoEnPantalla("TCAS II", false)).toBe("TCAS STBY");
    expect(modoEnPantalla("TCAS I", false)).toBe("TCAS STBY");
    expect(modoEnPantalla("TCAS II", true)).toBe("TA ONLY");
    expect(modoEnPantalla("TCAS II", true, "ABV")).toBe("TA ONLY ABV");
    // En TA/RA, que es el modo normal, no se escribe: solo la banda.
    expect(modoEnPantalla("TCAS II", true, "NORM", true)).toBeNull();
    expect(modoEnPantalla("TCAS II", true, "BLW", true)).toBe("BLW");
    // El TCAS I no tiene otro modo que avisar: no lo escribe.
    expect(modoEnPantalla("TCAS I", true)).toBeNull();
    expect(modoEnPantalla("TCAS I", true, "BLW")).toBe("BLW");
  });
});

/*
 * ── El aviso de resolución, el RA ─────────────────────────────────────────
 *
 * Contra la tabla 2 del folleto de la FAA —columna del RA— y su copia con el
 * HMD en Muñoz y otros (2013), no contra lo que salga.
 */
describe("los umbrales del RA", () => {
  it("pegado al suelo no hay: el escalón 2 no tiene columna de RA", () => {
    expect(sensibilidad(500, 500).ra).toBeNull();
    expect(SIN_RA_POR_DEBAJO).toBe(1000);
  });

  it("las seis filas de la tabla, con su tau, DMOD, ZTHR, ALIM y HMD", () => {
    expect(sensibilidad(1500, 1500).ra).toEqual({
      tau: 15,
      dmod: 0.2,
      zthr: 600,
      alim: 300,
      hmd: 1215,
    });
    expect(sensibilidad(4000, 4000).ra).toEqual({
      tau: 20,
      dmod: 0.35,
      zthr: 600,
      alim: 300,
      hmd: 2126,
    });
    expect(sensibilidad(8000, 8000).ra).toEqual({
      tau: 25,
      dmod: 0.55,
      zthr: 600,
      alim: 350,
      hmd: 3342,
    });
    expect(sensibilidad(15000, 15000).ra).toEqual({
      tau: 30,
      dmod: 0.8,
      zthr: 600,
      alim: 400,
      hmd: 4861,
    });
    expect(sensibilidad(35000, 35000).ra).toEqual({
      tau: 35,
      dmod: 1.1,
      zthr: 700,
      alim: 600,
      hmd: 6683,
    });
    expect(sensibilidad(43000, 43000).ra).toEqual({
      tau: 35,
      dmod: 1.1,
      zthr: 800,
      alim: 700,
      hmd: 6683,
    });
  });

  it("y el RA salta antes que el aviso, nunca después: umbrales más cortos", () => {
    for (const pies of [1500, 4000, 8000, 15000, 35000, 43000]) {
      const s = sensibilidad(pies, pies);
      expect(s.ra!.tau).toBeLessThan(s.tau);
      expect(s.ra!.dmod).toBeLessThan(s.dmod);
      expect(s.ra!.zthr).toBeLessThan(s.zthr);
    }
  });
});

describe("cuándo pide maniobra", () => {
  const u = sensibilidad(8000, 8000).ra!;
  // Quinientos nudos de cierre, en millas por segundo.
  const cierre = -500 / 3600;

  it("de frente y a la misma altura, a unos veinticinco segundos", () => {
    expect(pideResolucion(u, { r: 3.4, rPunto: cierre, a: 0, aPunto: 0, hmd: 0 })).toBe(true);
    expect(pideResolucion(u, { r: 3.7, rPunto: cierre, a: 0, aPunto: 0, hmd: 0 })).toBe(false);
  });

  it("a setecientos pies y sin juntarse, no: ZTHR es seiscientos", () => {
    expect(pideResolucion(u, { r: 2, rPunto: cierre, a: 700, aPunto: 0, hmd: 0 })).toBe(false);
    // Y el aviso de tráfico sí, que su ZTHR es ochocientos cincuenta.
    expect(pideAviso(sensibilidad(8000, 8000), { r: 2, rPunto: cierre, a: 700, aPunto: 0 })).toBe(
      true,
    );
  });

  it("y el que va a pasar de lado, a más del HMD, tampoco", () => {
    expect(pideResolucion(u, { r: 3, rPunto: cierre, a: 0, aPunto: 0, hmd: 4000 })).toBe(false);
    // Salvo que ya esté dentro de DMOD: entonces se pide aunque pase de lado.
    expect(pideResolucion(u, { r: 0.5, rPunto: cierre, a: 0, aPunto: 0, hmd: 4000 })).toBe(true);
  });

  it("la distancia de cruce es la menor de aquí en adelante", () => {
    // Uno a mil metros al este que viene derecho hacia mí: cero.
    expect(distanciaDeCruce(1000, 0, -100, 0)).toBeCloseTo(0);
    // Uno que viene hacia el sur por una paralela a trescientos metros.
    expect(distanciaDeCruce(300, -2000, 0, 100)).toBeCloseTo(300);
    // Y el que ya se aleja, lo que hay ahora.
    expect(distanciaDeCruce(300, 400, 0, 100)).toBeCloseTo(500);
  });
});

describe("hacia dónde, y qué se pide", () => {
  it("con el otro por debajo, subir; con el otro por encima, bajar", () => {
    expect(elegirSentido(-200, 0, 0, 25, 350, 8000)).toBe("sube");
    expect(elegirSentido(200, 0, 0, 25, 350, 8000)).toBe("baja");
  });

  it("y sin cruzar su altura, aunque cruzando quede más, si sin cruzar llega a ALIM", () => {
    /*
     * El otro, cien pies por encima y bajando a seiscientos por minuto:
     * subiendo se le cruza y quedarían casi ochocientos; bajando quedan unos
     * trescientos ochenta. Con ALIM de trescientos cincuenta, bajar basta y se
     * baja; con cuatrocientos, no basta y se sube cruzando.
     */
    expect(elegirSentido(100, 0, -10, 30, 350, 8000)).toBe("baja");
    expect(elegirSentido(100, 0, -10, 30, 400, 8000)).toBe("sube");
  });

  it("y por debajo de mil cien pies sobre el suelo, nunca bajar", () => {
    expect(SIN_BAJAR_POR_DEBAJO).toBe(1100);
    expect(elegirSentido(200, 0, 0, 15, 300, 1050)).toBe("sube");
  });

  it("nivelados y a la misma altura, subir a mil quinientos con su franja", () => {
    const basta = ritmoQueBasta("sube", 0, 0, 25, 350);
    expect(basta).toBeGreaterThan(0);
    const { orden, franja } = ordenPara("sube", 0, basta);
    expect(orden).toBe("climb");
    expect(RITMO_DE_LA_MANIOBRA).toBe(1500);
    expect(franja.verde).toEqual([1500, 2000]);
    // Lo rojo, de abajo del todo a los mil quinientos.
    expect(franja.rojo[0]![1]).toBe(1500);
    expect(franja.rojo[0]![0]).toBeLessThan(-2000);
  });

  it("y bajar es lo mismo del revés", () => {
    const { orden, franja } = ordenPara("baja", 0, ritmoQueBasta("baja", 0, 0, 25, 350));
    expect(orden).toBe("descend");
    expect(franja.verde).toEqual([-2000, -1500]);
    expect(franja.rojo[0]![0]).toBe(-1500);
  });

  it("si lo que se hace ya basta, que no se cambie: monitor vertical speed", () => {
    // El otro quinientos pies por debajo y subiendo despacio: nivelado ya basta.
    const basta = ritmoQueBasta("sube", -500, 2, 25, 350);
    expect(basta * 60).toBeLessThan(0);
    const { orden, franja } = ordenPara("sube", 0, basta);
    expect(orden).toBe("monitor");
    expect(franja.verde).toBeNull();
    // Lo rojo es bajar más de lo que el límite deja.
    expect(franja.rojo[0]![1]).toBeLessThanOrEqual(0);
  });

  it("y si basta con no bajar pero se baja deprisa: level off, a cero", () => {
    const basta = ritmoQueBasta("sube", -500, 2, 25, 350);
    const { orden, franja } = ordenPara("sube", -2500 / 60, basta);
    expect(orden).toBe("levelOff");
    expect(franja.rojo[0]![1]).toBe(0);
    expect(franja.verde![0]).toBe(0);
  });
});

/**
 * Un encuentro de frente con el selector en TA/RA, con un piloto que hace lo
 * que pide la caja —lo verde, o el cero al nivelar— con un cuarto de g a los
 * cinco segundos, o que no hace nada. Devuelve lo que cambió del RA, con su
 * hora, a cuántas millas y a cuántos pies del otro, y los avisos de tráfico.
 */
function encuentroConRa(
  opciones: {
    pies?: number;
    diferencia?: number;
    equipo?: EquipoTcas;
    obedece?: boolean;
    propio?: Partial<Propio>;
    terrenoDesde?: number;
  } = {},
) {
  const {
    pies = 8000,
    diferencia = 0,
    equipo = "TCAS II",
    obedece = true,
    propio = {},
    terrenoDesde = Infinity,
  } = opciones;
  const tcas = new Tcas();
  const v = 250 * NUDO;
  const dt = 0.1;
  const millas = 10;
  let miAltura = pies * PIE;
  let miRitmo = 0;
  let desdeLaOrden = 0;
  const cambios: (CambioDelRa & { t: number; millas: number; pies: number })[] = [];
  const avisos: number[] = [];
  const clases = new Set<string>();
  for (let t = 0; t < (millas * MILLA) / (2 * v) + 40; t += dt) {
    const miZ = -v * t;
    const suZ = -millas * MILLA + v * t;
    const ra = tcas.resolucion;
    if (ra && obedece) {
      desdeLaOrden += dt;
      const objetivo =
        ra.orden === "climb"
          ? 1750
          : ra.orden === "descend"
            ? -1750
            : ra.orden === "levelOff"
              ? 0
              : (miRitmo / PIE) * 60;
      const quiero = (objetivo * PIE) / 60;
      if (desdeLaOrden > 5) {
        const paso = 0.25 * 9.80665 * dt;
        miRitmo += Math.max(-paso, Math.min(paso, quiero - miRitmo));
      }
    } else desdeLaOrden = 0;
    miAltura += miRitmo * dt;
    avisos.push(
      ...tcas
        .paso(
          dt,
          equipo,
          {
            ...yo(miZ, pies),
            y: miAltura,
            sobreElSuelo: miAltura,
            vertical: miRitmo,
            resuelve: true,
            terrenoAvisando: t >= terrenoDesde,
            ...propio,
          },
          [{ id: "el-otro", x: 30, y: (pies + diferencia) * PIE, z: suZ }],
        )
        .map(() => t),
    );
    for (const b of tcas.enPantalla) clases.add(b.clase);
    for (const c of tcas.cambiosDelRa)
      cambios.push({
        ...c,
        t,
        millas: Math.abs(miZ - suZ) / MILLA,
        pies: miAltura / PIE - (pies + diferencia),
      });
  }
  return { cambios, avisos, clases, tcas };
}

/** Lo que fue diciendo el RA, en una lista que se lee. */
const loQueDijo = (cambios: readonly CambioDelRa[]) =>
  cambios.map((c) => (c.que === "orden" ? c.resolucion.orden : c.que));

describe("el RA volando", () => {
  it("de frente a ocho mil pies: primero el aviso, después la maniobra, a unas tres millas y media", () => {
    const { cambios, avisos } = encuentroConRa();
    expect(avisos).toHaveLength(1);
    const primera = cambios[0]!;
    expect(primera.que).toBe("orden");
    expect(primera.resolucion.orden).toBe("climb");
    expect(primera.millas).toBeGreaterThan(3.1);
    expect(primera.millas).toBeLessThan(3.7);
    expect(primera.t).toBeGreaterThan(avisos[0]!);
  });

  it("obedeciendo, se afloja a nivelar y vuelve a clear of conflict", () => {
    const { cambios, tcas } = encuentroConRa();
    expect(loQueDijo(cambios)).toEqual(["climb", "levelOff", "libre"]);
    // Al aflojar ya hay ALIM por encima: trescientos cincuenta a ocho mil pies.
    expect(cambios[1]!.pies).toBeGreaterThan(300);
    // Y se acaba al alejarse, no antes del cruce.
    const libre = cambios[2]!;
    expect(libre.t).toBeGreaterThan((10 * MILLA) / (2 * 250 * NUDO));
    expect(tcas.resolucion).toBeNull();
    expect(tcas.resolucionesDadas).toBe(1);
  });

  it("y sin obedecer no se afloja, pero también se acaba al cruzarse", () => {
    expect(loQueDijo(encuentroConRa({ obedece: false }).cambios)).toEqual(["climb", "libre"]);
  });

  it("el de la maniobra se pinta con el cuadrado rojo", () => {
    expect(encuentroConRa().clases.has("resolucion")).toBe(true);
  });

  it("con el otro trescientos pies por encima, bajar", () => {
    const { cambios } = encuentroConRa({ diferencia: 300 });
    expect(cambios[0]?.resolucion.orden).toBe("descend");
    expect(cambios[0]?.resolucion.sentido).toBe("baja");
    expect(cambios.at(-1)?.que).toBe("libre");
  });

  it("en TA ONLY, nada: avisa y ya", () => {
    const { cambios, avisos } = encuentroConRa({ propio: { resuelve: false } });
    expect(cambios).toHaveLength(0);
    expect(avisos).toHaveLength(1);
  });

  it("el TCAS I, nunca: solo avisa", () => {
    const { cambios, avisos, clases } = encuentroConRa({ equipo: "TCAS I" });
    expect(cambios).toHaveLength(0);
    expect(avisos).toHaveLength(1);
    expect(clases.has("resolucion")).toBe(false);
  });

  it("por debajo de mil pies sobre el suelo, tampoco", () => {
    expect(encuentroConRa({ pies: 900 }).cambios).toHaveLength(0);
  });

  it("y con el terreno avisando se retira sin decir nada", () => {
    // La maniobra empieza a los cuarenta y ocho segundos, y el terreno suena a los 55.
    const { cambios } = encuentroConRa({ terrenoDesde: 55 });
    expect(cambios[0]?.que).toBe("orden");
    expect(cambios.at(-1)?.que).toBe("retirada");
    expect(cambios.some((c) => c.que === "libre")).toBe(false);
  });

  it("y contra quien pasa a una milla de lado, aviso sí pero maniobra no", () => {
    const tcas = new Tcas();
    const v = 250 * NUDO;
    let ras = 0;
    let tas = 0;
    for (let t = 0; t < 80; t += 0.1) {
      tas += tcas.paso(0.1, "TCAS II", { ...yo(-v * t, 8000), resuelve: true }, [
        { id: "de-lado", x: MILLA, y: 8000 * PIE, z: -10 * MILLA + v * t },
      ]).length;
      ras += tcas.cambiosDelRa.length;
    }
    expect(tas).toBe(1);
    expect(ras).toBe(0);
  });
});
