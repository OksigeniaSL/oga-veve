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
  CRUZA_DESDE,
  bandaPara,
  cruzaSuAltura,
  daLaManiobra,
  distanciaDeCruce,
  elegirSentido,
  esPositiva,
  franjaDe,
  modoEnPantalla,
  ordenPara,
  pideResolucion,
  reforzarOInvertir,
  ritmoQueBasta,
  ritmoQuePide,
  RESPUESTA_A_LA_SEGUNDA,
  RITMO_DE_LA_MANIOBRA,
  RITMO_DEL_REFUERZO,
  SIN_BAJAR_POR_DEBAJO,
  SIN_REFUERZO_DE_BAJADA_POR_DEBAJO,
  SIN_RA_POR_DEBAJO,
  TOPE_DE_MANTENER,
  Tcas,
  horaDelReloj,
  pideAviso,
  sensibilidad,
  type CambioDelRa,
  type EquipoTcas,
  type Intruso,
  type Orden,
  type OrdenPuesta,
  type Propio,
  type Resolucion,
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

  it("y sin obedecer no se afloja: se refuerza, y también se acaba al cruzarse", () => {
    /*
     * Quien no sube con «climb, climb» deja de llegar a ALIM, y la caja pide
     * más: «increase climb». Ver `reforzarOInvertir`, donde queda dicho que
     * esto, con el propio piloto quieto, está por verificar.
     */
    expect(loQueDijo(encuentroConRa({ obedece: false }).cambios)).toEqual([
      "climb",
      "increaseClimb",
      "libre",
    ]);
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

/*
 * ── El RA completo: cruzar, mantener, reforzar e invertir ──────────────────
 *
 * Contra las tablas 3 y 4 del folleto de la FAA (versión 7.1) y el boletín 13
 * de EUROCONTROL: cada anuncio con su franja, y las secuencias que se ven en
 * los sucesos de verdad —«descend», «increase descent», «climb, climb NOW»—.
 */
describe("cada orden del RA, con su franja", () => {
  it("cruzando su altura, «crossing»: el mismo ritmo y la misma franja que subir", () => {
    const basta = ritmoQueBasta("sube", 300, -20, 25, 350);
    const sube = ordenPara("sube", 0, basta, true);
    expect(sube.orden).toBe("crossingClimb");
    expect(sube.franja).toEqual(ordenPara("sube", 0, basta).franja);
    expect(sube.franja.verde).toEqual([1500, 2000]);
    const baja = ordenPara("baja", 0, ritmoQueBasta("baja", -300, 20, 25, 350), true);
    expect(baja.orden).toBe("crossingDescend");
    expect(baja.franja.verde).toEqual([-2000, -1500]);
  });

  it("y se cruza su altura con el otro a cien pies o más del lado al que se va", () => {
    expect(CRUZA_DESDE).toBe(100);
    expect(cruzaSuAltura("sube", 100)).toBe(true);
    expect(cruzaSuAltura("sube", 50)).toBe(false);
    expect(cruzaSuAltura("sube", -300)).toBe(false);
    expect(cruzaSuAltura("baja", -100)).toBe(true);
    expect(cruzaSuAltura("baja", 300)).toBe(false);
  });

  it("quien ya sube a 1500 o más: «maintain», con lo verde hasta 4400", () => {
    const basta = ritmoQueBasta("sube", 0, 0, 25, 350);
    const { orden, franja } = ordenPara("sube", 2000 / 60, basta);
    expect(orden).toBe("maintain");
    expect(TOPE_DE_MANTENER).toBe(4400);
    expect(franja.verde).toEqual([1500, 4400]);
    expect(franja.rojo[0]![1]).toBe(1500);
    // Y bajando, del revés; cruzando, la suya.
    expect(ordenPara("baja", -2000 / 60, -basta).franja.verde).toEqual([-4400, -1500]);
    expect(ordenPara("sube", 2000 / 60, basta, true).orden).toBe("crossingMaintain");
    // A 1400 todavía no: ésa es la de subir.
    expect(ordenPara("sube", 1400 / 60, basta).orden).toBe("climb");
  });

  it("el refuerzo, a 2500: lo rojo hasta ahí y lo verde por encima", () => {
    expect(RITMO_DEL_REFUERZO).toBe(2500);
    const sube = franjaDe("increaseClimb", "sube");
    expect(sube.rojo[0]![1]).toBe(2500);
    expect(sube.verde![0]).toBe(2500);
    const baja = franjaDe("increaseDescent", "baja");
    expect(baja.rojo[0]![0]).toBe(-2500);
    expect(baja.verde![1]).toBe(-2500);
  });

  it("la inversión, a 1500 como la de subir o bajar", () => {
    expect(franjaDe("climbNow", "sube")).toEqual(franjaDe("climb", "sube"));
    expect(franjaDe("descendNow", "baja")).toEqual(franjaDe("descend", "baja"));
  });

  it("y el ritmo que se escribe en la tarjeta, el de cada una", () => {
    const pide: [Orden, number | null][] = [
      ["climb", 1500],
      ["crossingDescend", 1500],
      ["climbNow", 1500],
      ["increaseClimb", 2500],
      ["increaseDescent", 2500],
      ["maintain", null],
      ["crossingMaintain", null],
      ["monitor", null],
      ["levelOff", 0],
    ];
    for (const [orden, ritmo] of pide) expect(ritmoQuePide(orden), orden).toBe(ritmo);
    expect(esPositiva("increaseDescent")).toBe(true);
    expect(esPositiva("monitor")).toBe(false);
    expect(esPositiva("levelOff")).toBe(false);
  });
});

describe("reforzar o invertir: qué se pide cuando lo pedido ya no basta", () => {
  /** Subiendo a 1500 contra uno a la misma altura y a veinte segundos. */
  const subiendo: OrdenPuesta = {
    orden: "climb",
    sentido: "sube",
    a: 0,
    vo: 1500 / 60,
    vi: 0,
    t: 20,
    alim: 350,
    sobreElSuelo: 8000,
    desdeLaOrden: 8,
    invertida: false,
  };
  const con = (cambio: Partial<OrdenPuesta>) => reforzarOInvertir({ ...subiendo, ...cambio });

  it("si basta, nada", () => {
    expect(con({})).toBeNull();
  });

  it("si el otro sube hacia nosotros y reforzar basta: «increase climb»", () => {
    expect(con({ vi: 1000 / 60 })).toEqual({ orden: "increaseClimb", sentido: "sube" });
  });

  it("si sube más deprisa que eso, reforzar no basta: «descend, descend NOW»", () => {
    expect(con({ vi: 1500 / 60 })).toEqual({ orden: "descendNow", sentido: "baja" });
  });

  it("una sola inversión por encuentro: la segunda vez, lo mejor que hay es reforzar", () => {
    expect(con({ vi: 1500 / 60, invertida: true })).toEqual({
      orden: "increaseClimb",
      sentido: "sube",
    });
  });

  it("bajando, lo mismo: «increase descent»", () => {
    expect(con({ orden: "descend", sentido: "baja", vo: -1500 / 60, vi: -800 / 60 })).toEqual({
      orden: "increaseDescent",
      sentido: "baja",
    });
  });

  it("y por debajo de 1450 ft no se refuerza la bajada: se invierte", () => {
    expect(SIN_REFUERZO_DE_BAJADA_POR_DEBAJO).toBe(1450);
    expect(
      con({ orden: "descend", sentido: "baja", vo: -1500 / 60, vi: -800 / 60, sobreElSuelo: 1400 }),
    ).toEqual({ orden: "climbNow", sentido: "sube" });
  });

  it("ni se invierte hacia abajo por debajo de 1100 ft: se refuerza la subida", () => {
    expect(con({ vi: 1500 / 60, sobreElSuelo: 1050 })).toEqual({
      orden: "increaseClimb",
      sentido: "sube",
    });
  });

  it("una preventiva que deja de bastar pasa a subir o bajar, no a reforzar", () => {
    expect(con({ orden: "monitor", a: -400, vo: 0, vi: 1000 / 60 })).toEqual({
      orden: "climb",
      sentido: "sube",
    });
    expect(con({ orden: "monitor", a: -400, vo: 0, vi: 0 })).toBeNull();
    expect(con({ orden: "levelOff", sentido: "baja", a: 400, vo: 0, vi: -1500 / 60 })).toEqual({
      orden: "descend",
      sentido: "baja",
    });
  });

  it("y se ensaya como el TCAS: la de entrada, con sus cinco segundos; el refuerzo, con 2,5", () => {
    expect(RESPUESTA_A_LA_SEGUNDA).toBe(2.5);
    // Recién dada la orden, el piloto todavía tiene sus cinco segundos: basta.
    expect(con({ vo: 0, t: 25, desdeLaOrden: 0 })).toBeNull();
    // Diez segundos después, sin haber respondido, ya no: se refuerza.
    expect(con({ vo: 0, t: 15, desdeLaOrden: 10 })).toEqual({
      orden: "increaseClimb",
      sentido: "sube",
    });
  });
});

/**
 * Un encuentro de frente con el selector en TA/RA, más libre que
 * `encuentroConRa`: cada avión con su ritmo de salida, y el otro con un ritmo
 * que puede cambiar cuando ya hay maniobra —`suRitmo` recibe los segundos
 * desde la primera, o −1 si todavía no hay—, que es como se refuerza y se
 * invierte un RA de verdad. El piloto obedece cada orden con su respuesta: a
 * los cinco segundos con un cuarto de g, o a los dos y medio con 0,35 g las de
 * detrás. Devuelve lo que dijo el RA, con su franja, y los pies que quedaron
 * al cruzarse: positivos, yo por encima.
 */
function encuentroCompleto(
  opciones: {
    pies?: number;
    diferencia?: number;
    miRitmo?: number;
    suRitmo?: (desdeLaPrimera: number) => number;
    obedece?: boolean;
  } = {},
) {
  const { pies = 8000, diferencia = 0, miRitmo = 0, suRitmo = () => 0, obedece = true } = opciones;
  const tcas = new Tcas();
  const v = 250 * NUDO;
  const dt = 0.1;
  const millas = 10;
  let miAltura = pies * PIE;
  let mio = (miRitmo * PIE) / 60;
  let suAltura = (pies + diferencia) * PIE;
  let ordenAntes: Orden | null = null;
  let desdeLaOrden = 0;
  let primera: number | null = null;
  let alCruce = Infinity;
  let piesAlCruce = NaN;
  const dichas: Resolucion[] = [];
  const cambios: CambioDelRa[] = [];
  for (let t = 0; t < (millas * MILLA) / (2 * v) + 40; t += dt) {
    const miZ = -v * t;
    const suZ = -millas * MILLA + v * t;
    const ra = tcas.resolucion;
    if (ra && primera === null) primera = t;
    if ((ra?.orden ?? null) !== ordenAntes) {
      ordenAntes = ra?.orden ?? null;
      desdeLaOrden = 0;
    }
    if (ra && obedece) {
      desdeLaOrden += dt;
      const s = ra.sentido === "sube" ? 1 : -1;
      const ahora = (mio / PIE) * 60;
      const objetivo =
        ra.orden === "levelOff"
          ? 0
          : ra.orden === "monitor"
            ? ahora
            : ra.orden === "increaseClimb" || ra.orden === "increaseDescent"
              ? s * 2750
              : ra.orden === "maintain" || ra.orden === "crossingMaintain"
                ? s * Math.max(s * ahora, 1600)
                : s * 1750;
      const deDetras = ["increaseClimb", "increaseDescent", "climbNow", "descendNow"].includes(
        ra.orden,
      );
      if (desdeLaOrden > (deDetras ? 2.5 : 5)) {
        const paso = (deDetras ? 0.35 : 0.25) * 9.80665 * dt;
        mio += Math.max(-paso, Math.min(paso, (objetivo * PIE) / 60 - mio));
      }
    }
    miAltura += mio * dt;
    suAltura += ((suRitmo(primera === null ? -1 : t - primera) * PIE) / 60) * dt;
    tcas.paso(
      dt,
      "TCAS II",
      { ...yo(miZ, pies), y: miAltura, sobreElSuelo: miAltura, vertical: mio, resuelve: true },
      [{ id: "el-otro", x: 30, y: suAltura, z: suZ }],
    );
    const distancia = Math.abs(miZ - suZ);
    if (distancia < alCruce) {
      alCruce = distancia;
      piesAlCruce = (miAltura - suAltura) / PIE;
    }
    for (const c of tcas.cambiosDelRa) {
      cambios.push(c);
      if (c.que === "orden") dichas.push(c.resolucion);
    }
  }
  return { cambios, dichas, piesAlCruce };
}

describe("el RA completo, volando", () => {
  // El otro, por encima y bajando: a los 47 s, cuando salta, va a 300 ft.
  const bajandoDesdeArriba = (fpm: number) => ({
    diferencia: 300 + (fpm * 47) / 60,
    suRitmo: () => -fpm,
  });

  it("con el otro arriba y bajando, subir cruzando su altura: «climb, crossing climb»", () => {
    const { cambios, piesAlCruce } = encuentroCompleto(bajandoDesdeArriba(1200));
    expect(loQueDijo(cambios)).toEqual(["crossingClimb", "levelOff", "libre"]);
    // Y queda por encima, con ALIM: lo que se buscaba al cruzar.
    expect(piesAlCruce).toBeGreaterThan(350);
  });

  it("y si bajando él ya pasa de largo sin que hagamos nada, preventiva", () => {
    expect(loQueDijo(encuentroCompleto(bajandoDesdeArriba(2000)).cambios)).toEqual([
      "monitor",
      "libre",
    ]);
  });

  it("subiendo ya a 2000 ft/min: «maintain vertical speed, maintain»", () => {
    const { cambios, dichas } = encuentroCompleto({ miRitmo: 2000, diferencia: 1600 });
    expect(loQueDijo(cambios)).toEqual(["maintain", "levelOff", "libre"]);
    expect(dichas[0]!.franja.verde).toEqual([1500, 4400]);
  });

  it("y si así se cruza su altura: «maintain vertical speed, crossing maintain»", () => {
    const { cambios, piesAlCruce } = encuentroCompleto({ miRitmo: 2000, diferencia: 1750 });
    expect(loQueDijo(cambios)).toEqual(["crossingMaintain", "levelOff", "libre"]);
    expect(piesAlCruce).toBeGreaterThan(350);
  });

  it("el otro sube hacia nosotros: «climb», «increase climb», y la franja de 2500", () => {
    const { cambios, dichas, piesAlCruce } = encuentroCompleto({
      suRitmo: (desde) => (desde > 2 ? 1000 : 0),
    });
    expect(loQueDijo(cambios)).toEqual(["climb", "increaseClimb", "levelOff", "libre"]);
    expect(dichas[1]!.franja).toEqual(franjaDe("increaseClimb", "sube"));
    expect(piesAlCruce).toBeGreaterThan(300);
  });

  it("y bajando, como en la figura 19 del folleto: «descend», «increase descent»", () => {
    const { cambios, piesAlCruce } = encuentroCompleto({
      diferencia: 300,
      suRitmo: (desde) => (desde > 2 ? -1500 : 0),
    });
    expect(loQueDijo(cambios)).toEqual(["descend", "increaseDescent", "levelOff", "libre"]);
    expect(piesAlCruce).toBeLessThan(-300);
  });

  it("si sube más deprisa que lo que se le saca, se invierte: «descend, descend NOW»", () => {
    const { cambios, dichas, piesAlCruce } = encuentroCompleto({
      suRitmo: (desde) => (desde > 2 ? 1500 : 0),
    });
    expect(loQueDijo(cambios)).toEqual(["climb", "descendNow", "levelOff", "libre"]);
    expect(dichas[1]!.sentido).toBe("baja");
    expect(dichas[1]!.franja).toEqual(franjaDe("descend", "baja"));
    expect(piesAlCruce).toBeLessThan(-350);
  });

  it("y el del boletín 13: preventiva, «descend» y «climb, climb NOW» cuando el otro se tira", () => {
    /*
     * El tercer suceso del boletín: el pequeño, arriba, ve al grande y se
     * tira para abajo; el grande, que bajaba con su «descend», acaba subiendo
     * con «climb, climb NOW». Aquí la de entrada es la preventiva de no subir
     * —el otro, arriba y nivelado—, y hay una sola inversión.
     */
    const { cambios, piesAlCruce } = encuentroCompleto({
      diferencia: 500,
      suRitmo: (desde) => (desde > 3 ? -3000 : 0),
    });
    const dijo = loQueDijo(cambios);
    expect(dijo).toEqual(["monitor", "descend", "climbNow", "levelOff", "libre"]);
    expect(dijo.filter((o) => o === "climbNow" || o === "descendNow")).toHaveLength(1);
    expect(piesAlCruce).toBeGreaterThan(350);
  });

  it("cada orden de subir o bajar sale con la franja que le toca", () => {
    for (const { dichas } of [
      encuentroCompleto(bajandoDesdeArriba(1200)),
      encuentroCompleto({ suRitmo: (desde) => (desde > 2 ? 1000 : 0) }),
      encuentroCompleto({ suRitmo: (desde) => (desde > 2 ? 1500 : 0) }),
      encuentroCompleto({ miRitmo: 2000, diferencia: 1750 }),
    ])
      for (const r of dichas)
        if (esPositiva(r.orden)) expect(r.franja, r.orden).toEqual(franjaDe(r.orden, r.sentido));
  });
});
