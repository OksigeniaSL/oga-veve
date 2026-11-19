/**
 * **La pista corta, en la mesa**: que el modelo de vuelo del juego ponga la Vx
 * y la Vy donde las pone el manual, y que elegir mal se pague en metros.
 *
 * Volando y no despejando ecuaciones, con el modelo de coeficientes sin una
 * sola ayuda, como en `prestaciones.test.ts`: lo que se mide es el avión.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel, timonQueSostiene } from "./fdm";
import { AIRCRAFT, PANAMBI, PYKASU, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import { flapsDeDespegue } from "./flaps";
import { indicatedAirspeed, type Aire } from "./atmosphere";
import { EJERCICIOS } from "./ejercicios";
import { lineaAzul } from "./velocidades-de-despegue";
import {
  dondeAcabaLaPista,
  monteDelCampo,
  PistaCorta,
  subidaDe,
  SUBIDA_DEL_JAZ_20,
  type LecturaDeLaPistaCorta,
  type SucesoDeLaPistaCorta,
} from "./pista-corta";

const KT = 0.514444;
const DT = 1 / 120;

/** Lo medido, para quien lo pida: `MESA_SALIDA=fichero`. Sin pedirlo, nada. */
const apuntar = (texto: string): void => {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const fichero = p?.env?.MESA_SALIDA;
  if (fichero) void import("node:fs" as string).then((fs: { appendFileSync(f: string, t: string): void }) => fs.appendFileSync(fichero, texto + "\n"));
};

/**
 * **La velocidad sostenida con el timón**: el de equilibrio a esa indicada más
 * un proporcional sobre lo que sobra, lo que acelera y el amortiguamiento de
 * cabeceo, que sin ellos el lazo da tumbos (ver `nivelado` en
 * `prestaciones.test.ts`).
 */
function timonPara(
  a: AircraftConfig,
  m: CoefficientFlightModel,
  indicada: number,
  quiere: number,
  flaps: number,
  acelera = 0,
): number {
  const base = timonQueSostiene(a, quiere * KT, flaps);
  // Y lo que acelera, que es lo que frena el fugoide: sin ello, la subida iba a tumbos de veinte metros.
  const e = base + (indicada - quiere) * KT * 0.05 + acelera * 0.3 - m.state.pitchRate * 1.2;
  return Math.max(-1, Math.min(1, e));
}

interface Subida {
  readonly kt: number;
  /** Metros ganados por metro recorrido. */
  readonly pendiente: number;
  /** m/s. */
  readonly regimen: number;
}

/** A tope y a esa indicada, a quinientos metros: cuánto sube por metro y por segundo. */
function subidaA(a: AircraftConfig, kt: number, flaps: number): Subida {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, 500, 0), heading: 0, airspeed: kt * KT, equilibrado: true });
  const paso = (): void => {
    const indicada = indicatedAirspeed(m.state.airspeed, m.state.position.y, m.aireDelDia()) / KT;
    m.step(DT, { ...neutralControls(), tren: 0, engineOn: true, throttle: 1, flaps, elevator: timonPara(a, m, indicada, kt, flaps) });
  };
  for (let k = 0; k < Math.round(30 / DT); k++) paso();
  const desde = m.state.position.clone();
  for (let k = 0; k < Math.round(20 / DT); k++) paso();
  const sube = m.state.position.y - desde.y;
  const avanza = Math.hypot(m.state.position.x - desde.x, m.state.position.z - desde.z);
  return { kt, pendiente: sube / avanza, regimen: sube / 20 };
}

function mejores(a: AircraftConfig, flaps: number, desde = 50, hasta = 96): { angulo: Subida; regimen: Subida; todas: Subida[] } {
  const todas: Subida[] = [];
  for (let kt = desde; kt <= hasta; kt += 2) todas.push(subidaA(a, kt, flaps));
  const angulo = todas.reduce((x, y) => (y.pendiente > x.pendiente ? y : x));
  const regimen = todas.reduce((x, y) => (y.regimen > x.regimen ? y : x));
  return { angulo, regimen, todas };
}

/** La granja: 258 m de cota y el día de veintiocho grados, quince menos de la estándar allí. */
const COTA = 258;
const AIRE_DE_LA_GRANJA: Aire = { desviacion: 28 - (15 - 0.0065 * COTA), qnh: 1013.25 };
/** Los novecientos metros de hierba de Yvytu Rape. */
const LARGO = 900;

interface Despegue {
  /** Desde que se sueltan los frenos hasta irse del suelo, m. */
  readonly rodando: number;
  /** Lo que van las ruedas sobre el suelo a tantos metros del final de la pista, m. */
  alturaA(pasado: number): number;
  /** El primer sitio, desde el final de la pista, donde las ruedas pasan de esa altura, m. */
  readonly pasaLos15: number;
}

/**
 * **Un despegue corto en la granja**: frenos y motor a tope cuatro segundos,
 * soltar, rotar a los 51 nudos de la tabla del 172S y, en el aire, la
 * velocidad que se diga hasta `hasta` metros pasado el final, y la Vy después.
 */
function despegar(a: AircraftConfig, subirA: number, hasta = Infinity): Despegue {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => COTA, assist: 0 });
  m.ponerSuperficie("hierba");
  m.ponerAire(AIRE_DE_LA_GRANJA);
  m.reset({ position: new Vector3(0, COTA + a.gearHeight, 0), heading: 0, airspeed: 0 });
  const flaps = flapsDeDespegue(a);
  const v = subidaDe(a)!;
  const perfil: { s: number; h: number }[] = [];
  let rodando = 0;
  let t = 0;
  let quiere = 0;
  let antes = 0;
  for (let k = 0; k < Math.round(90 / DT); k++, t += DT) {
    const frenos = t < 4 ? 1 : 0;
    const indicada = indicatedAirspeed(m.state.airspeed, m.state.position.y, m.aireDelDia()) / KT;
    // Recorrido desde la cabecera, hacia el norte: z negativa.
    const s = -m.state.position.z;
    const pasado = s - LARGO;
    let elevator = 0;
    if (m.state.onGround) {
      elevator = indicada >= 51 ? 0.55 : 0;
      quiere = indicada;
    } else {
      /*
       * **Sin tirones**: la velocidad que se busca va hacia la pedida a dos
       * nudos por segundo, que es como cambia de velocidad quien vuela con
       * la mano y no un lazo que pide dieciocho nudos de golpe.
       */
      const meta = pasado < hasta ? subirA : v.vy;
      quiere += Math.max(-2 * DT, Math.min(2 * DT, meta - quiere));
      elevator = timonPara(a, m, indicada, quiere, flaps, (indicada - antes) * KT / DT);
    }
    antes = indicada;
    m.step(DT, { ...neutralControls(), engineOn: true, throttle: 1, flaps, brakes: frenos, elevator });
    if (m.state.onGround) rodando = -m.state.position.z;
    perfil.push({ s: -m.state.position.z - LARGO, h: m.state.position.y - a.gearHeight - COTA });
    if (-m.state.position.z > LARGO + 1500) break;
  }
  const alturaA = (pasado: number): number => {
    const i = perfil.findIndex((p) => p.s >= pasado);
    return i < 0 ? NaN : perfil[i]!.h;
  };
  const pasa = perfil.find((p) => p.h >= 15);
  return { rodando, alturaA, pasaLos15: pasa ? pasa.s : NaN };
}

describe("la pista corta, en la mesa (H35a)", () => {
  /*
   * **Lo que da el modelo**, 1.100 kg, a 500 m y al día estándar, de dos en
   * dos nudos:
   *
   *     limpio          Vx 60 kt  9,9 %   ·  Vy 76 kt  3,52 m/s
   *     flaps 10°       Vx 60 kt  8,9 %   ·  Vy 70 kt  3,05 m/s
   *
   * Con los flaps la pendiente es casi plana entre 56 y 64 nudos (8,8–8,9 %)
   * y el régimen entre 66 y 74 (3,01–3,05 m/s).
   *
   * Las del Cessna 172S: Vx 62 y Vy 74 limpio, 56 sobre el obstáculo con
   * 10°. Ver `SUBIDA_DEL_JAZ_20`.
   */
  it("el JAZ 20 sube más empinado cerca de la Vx y más deprisa cerca de la Vy, como su manual", () => {
    const limpio = mejores(PYKASU, 0);
    const conFlaps = mejores(PYKASU, flapsDeDespegue(PYKASU));
    const fila = (s: Subida): string => `${s.kt} kt ${(s.pendiente * 100).toFixed(1)} % ${s.regimen.toFixed(2)} m/s`;
    apuntar(
      `limpio: Vx ${fila(limpio.angulo)} · Vy ${fila(limpio.regimen)}\n` +
        `flaps:  Vx ${fila(conFlaps.angulo)} · Vy ${fila(conFlaps.regimen)}\n` +
        conFlaps.todas.map(fila).join("\n"),
    );
    // Limpio, contra las del manual: a cinco nudos, el ancho del examen práctico.
    expect(Math.abs(limpio.angulo.kt - SUBIDA_DEL_JAZ_20.vx)).toBeLessThanOrEqual(5);
    expect(Math.abs(limpio.regimen.kt - SUBIDA_DEL_JAZ_20.vy)).toBeLessThanOrEqual(5);
    // Con los flaps del despegue corto, la del obstáculo es la de más pendiente, o casi.
    expect(Math.abs(conFlaps.angulo.kt - SUBIDA_DEL_JAZ_20.sobreElObstaculo)).toBeLessThanOrEqual(5);
    // Y las dos no son la misma: la Vx, más lenta y más empinada.
    expect(limpio.regimen.kt - limpio.angulo.kt).toBeGreaterThanOrEqual(8);
    expect(limpio.angulo.pendiente).toBeGreaterThan(limpio.regimen.pendiente);
    expect(limpio.regimen.regimen).toBeGreaterThan(limpio.angulo.regimen);
  });

  /*
   * **Y el JAZ 40, con sus hélices de paso variable** (H37a), 2.000 kg, a 500 m
   * y al día estándar, de dos en dos nudos:
   *
   *     pendiente   16,1 % a 70 kt, y del 15,8 al 16,1 de 66 a 78
   *     régimen     7,15 m/s (1.410 ft/min) a 98 y a 100 kt
   *     a 76 kt     15,9 %, el 99 % de la mejor
   *     a 92 kt     7,07 m/s, el 99 % de la mejor
   *
   * Con la recta de la hélice de paso fijo que llevaba, en esta misma mesa:
   * pendiente máxima del 11,9 % a 72 nudos y régimen máximo de 5,69 m/s
   * (1.120 ft/min) a 110; a 92, un 5 % menos que a la suya, y no pasa.
   *
   * Las de su clase, del manual del Seneca III (Piper, PA-34-220T, VB-1110,
   * § 4.3 y 2.3): Vx 76, Vy 92 y línea azul 92 nudos indicados; las del Seneca
   * I, en millas, dicen lo mismo —90 y 105 mph, 78 y 91 nudos— (VB-423). La
   * subida del Seneca II, 1.340 ft/min a 4.570 lb (*Plane & Pilot*), que a
   * los 2.000 kg de la ficha son unos 1.390.
   *
   * **Las dos curvas son planas**, como en el avión de verdad, y el máximo de
   * cada una cae a seis nudos de su cifra —la pendiente por debajo, el
   * régimen por encima—. Lo que se comprueba es lo que importa en cabina:
   * que a las cifras de su manual el avión sube lo que puede, a un 2 %.
   */
  it("el JAZ 40, a la Vx y a la Vy de su manual, sube lo que puede", () => {
    const limpio = mejores(PANAMBI, 0, 66, 116);
    const a = (kt: number): Subida => limpio.todas.find((s) => s.kt === kt)!;
    const vx = a(76);
    const vy = a(92);
    const fila = (s: Subida): string => `${s.kt} kt ${(s.pendiente * 100).toFixed(1)} % ${s.regimen.toFixed(2)} m/s`;
    apuntar(
      `JAZ 40 limpio: Vx ${fila(limpio.angulo)} · Vy ${fila(limpio.regimen)} · a 76 ${fila(vx)} · a 92 ${fila(vy)}\n` +
        limpio.todas.map(fila).join("\n"),
    );
    // A las de su manual, lo mejor que puede: a un 2 %.
    expect(vx.pendiente).toBeGreaterThan(limpio.angulo.pendiente * 0.98);
    expect(vy.regimen).toBeGreaterThan(limpio.regimen.regimen * 0.98);
    // Y los máximos, cerca: a ocho nudos.
    expect(Math.abs(limpio.angulo.kt - 76)).toBeLessThanOrEqual(8);
    expect(Math.abs(limpio.regimen.kt - 92)).toBeLessThanOrEqual(8);
    // Las dos no son la misma: a la Vx, más empinado; a la Vy, más deprisa.
    expect(vx.pendiente).toBeGreaterThan(vy.pendiente);
    expect(vy.regimen).toBeGreaterThan(vx.regimen);
    // Lo que sube: los 1.390 ft/min del Seneca II a esta masa, a un 7 %.
    expect(limpio.regimen.regimen).toBeGreaterThan(7.06 * 0.93);
    expect(limpio.regimen.regimen).toBeLessThan(7.06 * 1.07);
    // Y con un motor, la línea azul a cinco nudos de la suya.
    expect(Math.abs(lineaAzul(PANAMBI) / KT - 92)).toBeLessThanOrEqual(5);
  });

  /*
   * **Y en la granja**, con la hierba, los 258 m y los veintiocho grados:
   * rueda 322 m, y a los 120 m del final, donde está el monte,
   *
   *     a la del obstáculo, 56 kt        54,7 m · 39,7 sobre las copas
   *     a buscar la Vy recién despegado  20,0 m ·  5,0 sobre las copas
   */
  it("en la granja, a la del obstáculo se pasa el monte con margen; buscando la Vy recién despegado, con mucho menos", () => {
    const monte = monteDelCampo("SGOG")!;
    const bien = despegar(PYKASU, SUBIDA_DEL_JAZ_20.sobreElObstaculo, monte.pasadaLaPista);
    const mal = despegar(PYKASU, SUBIDA_DEL_JAZ_20.vy);
    const sobreBien = bien.alturaA(monte.pasadaLaPista) - monte.alto;
    const sobreMal = mal.alturaA(monte.pasadaLaPista) - monte.alto;
    apuntar(
      `rodando ${bien.rodando.toFixed(0)} m · a ${monte.pasadaLaPista} m del final: ` +
        `bien ${sobreBien.toFixed(1)} m sobre las copas (15 m a ${bien.pasaLos15.toFixed(0)}), ` +
        `mal ${sobreMal.toFixed(1)} m (15 m a ${mal.pasaLos15.toFixed(0)})`,
    );
    apuntar([0, 60, 120, 180, 240, 300, 360].map((d) => `${d} m: bien ${bien.alturaA(d).toFixed(1)} · mal ${mal.alturaA(d).toFixed(1)}`).join("\n"));
    expect(bien.rodando).toBeLessThan(LARGO);
    expect(sobreBien).toBeGreaterThanOrEqual(10);
    expect(sobreMal).toBeLessThan(sobreBien - 20);
  });
});

describe("el ejercicio de la pista corta", () => {
  const ejercicio = EJERCICIOS.find((e) => e.id === "pista-corta")!;

  it("se ofrece desde Tukã, en el JAZ 20 y en la granja, y en nada más", () => {
    expect(ejercicio.peldanos).toEqual(["tuka", "taguato", "taguato-ruvicha"]);
    const ofrecen = AIRCRAFT.filter((a) => ejercicio.valePara(a)).map((a) => a.id);
    expect(ofrecen).toEqual(["jaz-20"]);
    expect(ejercicio.dondeVale?.("SGOG")).toBe(true);
    expect(ejercicio.dondeVale?.("GCXO")).toBe(false);
  });

  const lectura = (l: Partial<LecturaDeLaPistaCorta>): LecturaDeLaPistaCorta => ({
    pasadoElFinal: -800,
    sobreLasCopas: -15,
    indicada: 0,
    sobreElSuelo: 0,
    vertical: 0,
    // En el aire, por encima del colchón del suelo salvo que se diga.
    sobreElTerreno: l.enElSuelo === false ? 30 : 0,
    enElSuelo: true,
    enLaPista: true,
    gas: 0,
    percance: false,
    ...l,
  });
  const volar = (p: PistaCorta, ls: Partial<LecturaDeLaPistaCorta>[], segundos = 1): SucesoDeLaPistaCorta[] => {
    const todos: SucesoDeLaPistaCorta[] = [];
    for (const l of ls) for (let t = 0; t < segundos; t += 0.1) todos.push(...p.avanzar(lectura(l), 0.1));
    return todos;
  };
  const nuevo = (): PistaCorta => new PistaCorta(ejercicio, SUBIDA_DEL_JAZ_20, monteDelCampo("SGOG")!);

  it("bien volado: suelta con el motor a tope, sostiene el ángulo, pasa con margen y cierra en la Vy", () => {
    const p = nuevo();
    const s = volar(p, [
      { gas: 1 },
      { gas: 1, sobreElSuelo: 5 },
      { gas: 1, sobreElSuelo: 26, indicada: 50 },
    ]);
    expect(s.map((x) => x.que)).toEqual(["presentar", "solta"]);
    const aire = volar(
      p,
      [{ gas: 1, enElSuelo: false, indicada: 56, sobreElSuelo: 29, vertical: 2.7, pasadoElFinal: -200, sobreLasCopas: 5 }],
      4,
    );
    expect(aire.map((x) => x.que)).toEqual(["alAngulo"]);
    const pasa = volar(p, [{ gas: 1, enElSuelo: false, indicada: 57, pasadoElFinal: 130, sobreLasCopas: 58 }], 0.1);
    expect(pasa).toEqual([{ que: "pasaste", como: "conMargen", margen: 58 }]);
    const vy = volar(p, [{ gas: 1, enElSuelo: false, indicada: 74, pasadoElFinal: 400, sobreLasCopas: 40 }], 4);
    expect(vy.map((x) => x.que)).toEqual(["enVy", "cerrar"]);
    expect(p.cierre).toBe("conMargen");
  });

  it("pasar por la banda acelerando no es sostener el ángulo", () => {
    const p = nuevo();
    volar(p, [{ gas: 1 }, { gas: 1, sobreElSuelo: 26, indicada: 50 }]);
    const s: SucesoDeLaPistaCorta[] = [];
    // De 51 a 61 nudos a dos por segundo, que es lo que hacía el banco saliendo a buscar la Vy.
    for (let t = 0; t < 5; t += 0.1)
      s.push(...p.avanzar(lectura({ gas: 1, enElSuelo: false, indicada: 51 + 2 * t, pasadoElFinal: -300, sobreLasCopas: 0 }), 0.1));
    expect(s.map((x) => x.que)).not.toContain("alAngulo");
  });

  it("a la del obstáculo pero sin subir —la nariz baja, acelerando— tampoco es el ángulo", () => {
    const p = nuevo();
    volar(p, [{ gas: 1 }, { gas: 1, sobreElSuelo: 26, indicada: 50 }]);
    const s = volar(p, [{ gas: 1, enElSuelo: false, indicada: 53, sobreElSuelo: 27, vertical: 0.6, pasadoElFinal: -400 }], 5);
    expect(s.map((x) => x.que)).not.toContain("alAngulo");
  });

  it("recién despegado, en el colchón del suelo, despacio y empinado no es todavía el ángulo", () => {
    const p = nuevo();
    volar(p, [{ gas: 1 }, { gas: 1, sobreElSuelo: 26, indicada: 50 }]);
    // Lo que hacía en el banco quien sale a buscar la Vy: 52 nudos quietos y el tirón de la rotación.
    const s = volar(
      p,
      [{ gas: 1, enElSuelo: false, indicada: 52, sobreElSuelo: 27, vertical: 3, sobreElTerreno: 6, pasadoElFinal: -450 }],
      5,
    );
    expect(s.map((x) => x.que)).not.toContain("alAngulo");
    // Y en cuanto sale del colchón a la misma velocidad y subiendo igual, sí.
    const fuera = volar(
      p,
      [{ gas: 1, enElSuelo: false, indicada: 56, sobreElSuelo: 29, vertical: 3, sobreElTerreno: 12, pasadoElFinal: -400 }],
      4,
    );
    expect(fuera.map((x) => x.que)).toEqual(["alAngulo"]);
  });

  it("los 17,5 m del banco saliendo a buscar la Vy se pasan justo, y los 57 a la del obstáculo, con margen", () => {
    const justo = nuevo();
    volar(justo, [{ gas: 1 }, { gas: 1, sobreElSuelo: 26, indicada: 50 }]);
    expect(volar(justo, [{ gas: 1, enElSuelo: false, indicada: 75, pasadoElFinal: 121, sobreLasCopas: 17.5 }], 0.1)[0]).toMatchObject({
      que: "pasaste",
      como: "justo",
    });
    const bien = nuevo();
    volar(bien, [{ gas: 1 }, { gas: 1, sobreElSuelo: 26, indicada: 50 }]);
    expect(volar(bien, [{ gas: 1, enElSuelo: false, indicada: 55, pasadoElFinal: 121, sobreLasCopas: 57 }], 0.1)[0]).toMatchObject({
      que: "pasaste",
      como: "conMargen",
    });
  });

  it("rápido antes del monte pide más morro una vez, y pasa justo", () => {
    const p = nuevo();
    volar(p, [{ gas: 1 }, { gas: 1, sobreElSuelo: 26, indicada: 50 }]);
    const s = volar(p, [{ gas: 1, enElSuelo: false, indicada: 72, pasadoElFinal: -100, sobreLasCopas: 0 }], 4);
    expect(s.map((x) => x.que)).toEqual(["masDespacio"]);
    // Los 13 m del banco saliendo a buscar la Vy: justo.
    const pasa = volar(p, [{ gas: 1, enElSuelo: false, indicada: 74, pasadoElFinal: 121, sobreLasCopas: 13 }], 0.1);
    expect(pasa[0]).toMatchObject({ que: "pasaste", como: "justo" });
  });

  it("rodando hasta la pista con el gas alto no empieza la carrera", () => {
    const p = nuevo();
    const s = volar(p, [{ gas: 1, enLaPista: false }, { gas: 1, enLaPista: false, sobreElSuelo: 8 }, { gas: 0, enLaPista: false }]);
    expect(s.map((x) => x.que)).toEqual(["presentar"]);
    expect(p.fase).toBe("frenos");
  });

  it("pararse en la pista, rodando, también se cierra felicitando", () => {
    const p = nuevo();
    volar(p, [{ gas: 1 }, { gas: 1, sobreElSuelo: 15, indicada: 30 }]);
    const s = volar(p, [{ gas: 0, sobreElSuelo: 0.2 }]);
    expect(s).toContainEqual({ que: "cerrar", como: "parado" });
  });

  it("el final de la pista sale por la cabecera hacia la que apunta el morro", () => {
    const pista = { x: 0, z: 0, heading: 140, length: 900 };
    const por33 = dondeAcabaLaPista(pista, 322);
    expect(por33.rumbo).toBe(320);
    expect(por33.x).toBeCloseTo(-450 * Math.sin((40 * Math.PI) / 180), 3);
    expect(por33.z).toBeCloseTo(-450 * Math.cos((40 * Math.PI) / 180), 3);
    expect(dondeAcabaLaPista(pista, 138).rumbo).toBe(140);
  });
});
