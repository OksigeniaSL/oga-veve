/**
 * La final de la torre: desde dónde te da la pista. Ver
 * `flight/final-de-la-torre.ts`.
 *
 * «La torre me dio el permiso con el avión ya en la cabecera, con la máquina
 * contando "one hundred"» (Enrique, en La Palma). El permiso se pedía al
 * entrar en la fase «final» del plan, que empieza a mil pies como muy pronto
 * y a cuarenta metros si uno se alinea tarde; y cada vez que esa fase se salía
 * un instante y volvía, se pedía otro.
 */
import { describe, expect, it } from "vitest";
import {
  FINAL_DE_LA_TORRE,
  FinalDeLaTorre,
  SUBIDA_CON_GAS,
  SUBIDA_QUE_SACA,
  TECHO_DE_LA_FINAL,
  type LoQueVeLaTorre,
} from "./final-de-la-torre";
import { MILLA } from "./ruta";
import { Boca } from "../audio/boca";
import { Frecuencia } from "./radio";
import { TurnoDePista } from "./turno-de-pista";

/** Una final de tres grados, a `metros` del umbral. */
function enLaSenda(metros: number, extra: Partial<LoQueVeLaTorre> = {}): LoQueVeLaTorre {
  return {
    enElAire: true,
    faseDelPlan: "en-vuelo",
    enLaFinalDelPlan: false,
    alUmbral: metros,
    torcido: 0,
    sobreLaPista: metros * Math.tan((3 * Math.PI) / 180),
    vertical: -3.5,
    ...extra,
  };
}

describe("la final de la torre", () => {
  it("empieza a cinco millas en la senda, no a los mil pies de la fase del plan", () => {
    const f = new FinalDeLaTorre();
    expect(f.paso(enLaSenda(FINAL_DE_LA_TORRE + 300))).toBe(false);
    expect(f.paso(enLaSenda(FINAL_DE_LA_TORRE - 100))).toBe(true);
    // A esa distancia la senda va a mil seiscientos pies, lejos de los mil.
    expect(enLaSenda(FINAL_DE_LA_TORRE - 100).sobreLaPista / 0.3048).toBeGreaterThan(1500);
  });

  it("y la del plan de vuelo, desde su punto de final, aunque llegue de lado", () => {
    const f = new FinalDeLaTorre();
    // La 19 de La Palma: se llega por el mar, fuera del cono, por los puntos.
    expect(
      f.paso(enLaSenda(7 * MILLA, { alUmbral: null, enLaFinalDelPlan: true, torcido: 40 })),
    ).toBe(true);
  });

  it("no se entra subiendo, ni de través, ni pasando alto por encima", () => {
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { vertical: 4 }))).toBe(false);
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { torcido: 90 }))).toBe(false);
    expect(
      new FinalDeLaTorre().paso(enLaSenda(3000, { sobreLaPista: TECHO_DE_LA_FINAL + 50 })),
    ).toBe(false);
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { alUmbral: null }))).toBe(false);
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { enElAire: false }))).toBe(false);
  });

  /*
   * **La causa del permiso repetido.** La fase del plan se sale de «final» en
   * un fotograma —«en-vuelo» no espera— y vuelve medio segundo después; cada
   * vuelta era un permiso nuevo, con su lámpara y su voz, a la altura que
   * fuera. La final de la torre no se entera de ese parpadeo.
   */
  it("y no se sale porque la fase del plan parpadee en la final corta", () => {
    const f = new FinalDeLaTorre();
    const dentro: boolean[] = [];
    for (let d = 4000; d > 0; d -= 50) {
      const fase = d < 2000 && Math.floor(d / 100) % 3 === 0 ? "en-vuelo" : "final";
      dentro.push(f.paso(enLaSenda(d, { faseDelPlan: fase, torcido: (d % 7) - 3 })));
    }
    expect(dentro.every(Boolean)).toBe(true);
  });

  it("se sale yéndose al aire, dándose la vuelta o pasando la pista", () => {
    const sube = new FinalDeLaTorre();
    expect(sube.paso(enLaSenda(2000))).toBe(true);
    // Con el gas de despegue y subiendo: la frustrada de manual.
    expect(
      sube.paso(enLaSenda(1900, { sobreLaPista: 105 + SUBIDA_CON_GAS + 1, vertical: 6, gas: 1 })),
    ).toBe(false);
    // Y no vuelve a entrar subiendo.
    expect(sube.paso(enLaSenda(1800, { sobreLaPista: 140, vertical: 6 }))).toBe(false);

    // Sin gas, subiendo de verdad: trescientos pies sobre lo más bajo.
    const sinGas = new FinalDeLaTorre();
    expect(sinGas.paso(enLaSenda(2000))).toBe(true);
    expect(sinGas.paso(enLaSenda(1950, { sobreLaPista: 105 + 40, vertical: 4 }))).toBe(true);
    expect(
      sinGas.paso(enLaSenda(1900, { sobreLaPista: 105 + SUBIDA_QUE_SACA + 1, vertical: 4 })),
    ).toBe(false);

    // Y con la orden de irse puesta, quien la obedece y sube, se va.
    const obedece = new FinalDeLaTorre();
    expect(obedece.paso(enLaSenda(2000))).toBe(true);
    expect(
      obedece.paso(enLaSenda(1900, { sobreLaPista: 105 + SUBIDA_CON_GAS + 1, vertical: 5, ordenDeIrse: true })),
    ).toBe(false);

    const vuelta = new FinalDeLaTorre();
    vuelta.paso(enLaSenda(3000));
    expect(vuelta.paso(enLaSenda(3000, { torcido: 150 }))).toBe(false);

    const pasada = new FinalDeLaTorre();
    pasada.paso(enLaSenda(500));
    expect(pasada.paso(enLaSenda(0, { alUmbral: null, sobreLaPista: 20 }))).toBe(false);
  });

  it("y tocar tierra la acaba", () => {
    const f = new FinalDeLaTorre();
    f.paso(enLaSenda(300));
    expect(f.paso(enLaSenda(0, { enElAire: false, faseDelPlan: "aterrizado" }))).toBe(false);
  });
});

/**
 * **El bamboleo no es irse al aire.** Se salía de la final al subir veinte
 * metros sobre lo más bajo de ella, y el JAZ 120 con flaps sube y baja solo
 * unos cinco metros por segundo con un periodo de veinte a cincuenta; quien
 * vuela la final con el teclado va «o bajo o subo». Salir era perder el
 * permiso y pedir otro —«la torre me da permiso para aterrizar dos veces»— y,
 * si el segundo no se oía antes de los mínimos, al aire. Enrique, con el JAZ
 * 120 en Tenerife Sur: «tener que hacer frustradas todos los vuelos es una
 * basura».
 */
describe("una final con bamboleo", () => {
  /**
   * Una final de cinco millas: nivelada a `nivel` metros sobre la pista
   * esperando la senda —«nos quedamos acá, nivelados, hasta que la senda nos
   * venga a buscar»— y luego por ella, con la altura yendo y viniendo
   * `amplitud` metros con ese periodo, y el variómetro que eso da. Devuelve
   * lo que ve la torre en cada paso.
   */
  function finalConBamboleo(
    amplitud: number,
    periodo: number,
    nivel = 1200 * 0.3048,
    extra: Partial<LoQueVeLaTorre> = {},
  ): LoQueVeLaTorre[] {
    const vistas: LoQueVeLaTorre[] = [];
    const v = 70;
    const dt = 0.1;
    const altoEn = (t: number, d: number) =>
      Math.min(nivel, d * Math.tan((3 * Math.PI) / 180)) +
      amplitud * Math.sin((2 * Math.PI * t) / periodo + Math.PI);
    for (let t = 0, d = 4.9 * MILLA; d > 300; t += dt, d -= v * dt) {
      const alto = altoEn(t, d);
      const vertical = (alto - altoEn(t - dt, d + v * dt)) / dt;
      vistas.push(enLaSenda(d, { sobreLaPista: alto, vertical, gas: 0.6, ...extra }));
    }
    return vistas;
  }

  it("arriba y abajo quince metros, cada veinte, treinta o cincuenta segundos, no saca de la final", () => {
    for (const periodo of [20, 30, 50]) {
      const f = new FinalDeLaTorre();
      const dentro = finalConBamboleo(15, periodo).map((v) => f.paso(v));
      // Se entra en el primer paso y no se sale nunca.
      expect(dentro.every(Boolean), `periodo ${periodo} s`).toBe(true);
    }
  });

  it("ni el de cinco metros por segundo del JAZ 120 nivelado, que de cresta a valle son ochenta", () => {
    // ±5 m/s con un periodo de cincuenta segundos son ±40 m de altura.
    const amplitud = (5 * 50) / (2 * Math.PI);
    const f = new FinalDeLaTorre();
    expect(finalConBamboleo(amplitud, 50).map((v) => f.paso(v)).every(Boolean)).toBe(true);
  });

  /*
   * **Y con el turno de pista, como en el juego**: la fase de la torre es
   * «final» mientras se está en su final, el permiso se pide al entrar en ella
   * y el turno da un paso por fotograma. Ver `faseParaLaTorre` en `game.ts`.
   */
  function volarConElTurno(vistas: LoQueVeLaTorre[]) {
    const final = new FinalDeLaTorre();
    const permisos: number[] = [];
    const alAire: number[] = [];
    let retirados = 0;
    let alto = 0;
    const turno = new TurnoDePista({
      radio: new Frecuencia(() => 0.5, "GCTS"),
      boca: new Boca({ ahora: () => 0, cancelar: () => {} }),
      trafico: () => null,
      torre: () => true,
      privado: () => false,
      alUmbral: () => 3000,
      alto: () => alto,
      decirAOtro: () => null,
      autorizarte: () => void permisos.push(Math.round(alto)),
      mandarteAlAire: (a) => void alAire.push(Math.round(a)),
      retirarteElPermiso: () => void retirados++,
      permisoSinOir: () => false,
    });
    let antes = "";
    for (const v of vistas) {
      alto = v.sobreLaPista;
      const fase = final.paso(v) ? "final" : "en-vuelo";
      if (fase === "final" && antes !== "final") turno.pedirAterrizaje();
      turno.paso(fase);
      antes = fase;
    }
    return { permisos, alAire, retirados };
  }

  it("con el permiso dado, el bamboleo de quince metros no lo quita: la torre lo dice una vez y nadie va al aire", () => {
    for (const periodo of [20, 30, 50]) {
      const r = volarConElTurno(finalConBamboleo(15, periodo));
      expect(r.permisos.length, `periodo ${periodo} s: ${r.permisos}`).toBe(1);
      expect(r.alAire).toEqual([]);
      expect(r.retirados).toBe(0);
    }
  });
});

/**
 * **Y por qué se salió**, que decide si la aproximación siguiente es otra o
 * la misma: saliéndose del cono al coger la final —el reactor que se pasa del
 * eje en el viraje, quien se alinea a golpes de alabeo— y volviendo a entrar,
 * el permiso que se oyó sigue valiendo. En el banco de Gran Canaria con la
 * pista ocupada, la torre lo decía dos veces en la misma final.
 */
describe("por qué se sale de la final", () => {
  it("yéndose, dándose la vuelta, por fuera del cono o tocando", () => {
    const sube = new FinalDeLaTorre();
    sube.paso(enLaSenda(2000));
    sube.paso(enLaSenda(1900, { sobreLaPista: 105 + SUBIDA_QUE_SACA + 1, vertical: 4 }));
    expect(sube.ultimaSalida).toBe("seVa");

    const vuelta = new FinalDeLaTorre();
    vuelta.paso(enLaSenda(3000));
    vuelta.paso(enLaSenda(3000, { torcido: 150 }));
    expect(vuelta.ultimaSalida).toBe("vuelta");

    const pasado = new FinalDeLaTorre();
    pasado.paso(enLaSenda(3000));
    pasado.paso(enLaSenda(3000, { alUmbral: null, torcido: 50 }));
    expect(pasado.ultimaSalida).toBe("fuera");

    const toca = new FinalDeLaTorre();
    toca.paso(enLaSenda(300));
    toca.paso(enLaSenda(0, { enElAire: false, faseDelPlan: "aterrizado" }));
    expect(toca.ultimaSalida).toBe("tierra");
    // Y rodando sigue siendo eso: no se ha vuelto a salir de nada.
    toca.paso(enLaSenda(0, { enElAire: false, faseDelPlan: "aterrizado" }));
    expect(toca.ultimaSalida).toBe("tierra");
  });
});

