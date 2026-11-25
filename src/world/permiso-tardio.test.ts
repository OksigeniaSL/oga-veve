/**
 * **El permiso tardío** (H96): quien llega a la decisión con la pista ocupada
 * sigue si al umbral va a estar libre, y el permiso le llega por debajo; y si
 * no, al aire. Ver `sigueHastaElUmbral` en `trafico.ts` y `quedaLibreATiempo` en
 * `flight/turno-de-pista.ts`.
 *
 * Con quien juega ya corriendo su despegue, o con otro a tres segundos de dejar
 * la pista, se iba al aire en la decisión siempre, uno del tráfico y quien
 * juega. Una torre le dice «continue approach» y le da el permiso cuando la
 * tiene libre (OACI, Doc 4444, 7.10.1 y 7.10.2).
 */
import { describe, expect, it } from "vitest";
import { Boca } from "../audio/boca";
import { ESPERAN_SU_TOMA, esTuContinua } from "../audio/torre";
import { GUIONES, Frecuencia, type Momento } from "../flight/radio";
import {
  TurnoDePista,
  type AlrededorDelTurno,
  type DibujoDelTurno,
} from "../flight/turno-de-pista";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import fuenteDelJuego from "../game.ts?raw";
import frases from "../../docs/voces/frases.json";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { porDondeSigues, verticesDelCircuito, type Pista, type PuntoDeCircuito } from "./circuito";
import { SCENARIOS } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import {
  crearTrafico,
  LIBRE_ANTES_DEL_UMBRAL,
  tiposDelCampo,
  type QuienJuega,
  type Sitio,
  type TuSalida,
} from "./trafico";

const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 2400 };
const COTA = 100;
const PASO = 0.1;
const EC = "EC-LLE";
const EN_TIERRA: QuienJuega = { alUmbral: null, enLaPista: false };

/** Uno que llega por el circuito de una pista inventada hasta la decisión, y quien juega. */
function enLaDecision(conPermiso = false) {
  let tu: QuienJuega = EN_TIERRA;
  const trafico = crearTrafico(PISTA, COTA, "ala-alta", "izquierda", 1, undefined, {
    quienJuega: () => tu,
  });
  trafico.anuncia(EC, "otro.enCola");
  const dentro = () => trafico.porDentro().find((q) => q.matricula === EC)!;
  const sitio = () => trafico.quienes().find((q) => q.matricula === EC)!;
  const pedidos: number[] = [];
  let idos: string[] = [];
  const k = {
    trafico,
    dentro,
    sitio,
    /** Las veces que se le preguntó a la torre si se le da. */
    pedidos,
    get idos() {
      return idos;
    },
    seas: (q: Partial<QuienJuega>) => (tu = { ...EN_TIERRA, ...q }),
    paso() {
      idos = [
        ...idos,
        ...trafico.paso(PASO, () => {
          pedidos.push(dentro().recorrido);
          return true;
        }),
      ];
    },
    hasta(ya: () => boolean, comoMucho = 900) {
      for (let t = 0; t < comoMucho; t += PASO) {
        if (ya()) return t;
        k.paso();
      }
      return null;
    },
    /** Los segundos que le quedan al umbral, que está en `x = -1200`. */
    alUmbral: () => (-PISTA.length / 2 - sitio().x) / dentro().velocidad,
  };
  if (conPermiso) trafico.anuncia(EC, "torre.clearedLand", true);
  k.hasta(() => dentro().recorrido >= dentro().decide! - 20);
  return k;
}

/** Tú corriendo tu despegue: en el aire dentro de tanto, y sobre la pista de ahí a su final. */
const corriendo = (enElAire: number, carrera: number): Partial<QuienJuega> => ({
  enLaPista: true,
  sale: { enElAire, conLaPista: true, carrera, velocidad: 60, sube: 8 } satisfies TuSalida,
});

/** Y tú ya en el aire, por el eje, a tantos metros de la cabecera. */
const subiendo = (desdeLaCabecera: number): Partial<QuienJuega> => {
  const p = (d: number, y: number): Sitio => ({ x: -PISTA.length / 2 + d, y: COTA + y, z: 0 });
  return {
    velocidad: 60,
    porDondeVuela: () => [p(desdeLaCabecera, 60), p(desdeLaCabecera + 2000, 250)],
  };
};

describe("el que llega a la decisión contigo en la pista", () => {
  it("sigue si al umbral va a estar libre, y el permiso le llega por debajo", () => {
    const k = enLaDecision();
    expect(k.alUmbral()).toBeGreaterThan(20);
    k.seas(corriendo(1, 2300));
    k.hasta(() => k.dentro().recorrido > k.dentro().decide! + 5);
    expect(k.dentro()).toMatchObject({ camino: "llegada", continua: true, conPermiso: false });
    expect(k.sitio().y - COTA).toBeLessThan(60);
    // Todavía encima de la pista, ya en el aire: sigue sin permiso.
    k.seas(subiendo(2000));
    k.paso();
    expect(k.dentro()).toMatchObject({ continua: true, conPermiso: false });
    expect(k.pedidos).toEqual([]);
    // Pasado el final de la pista, se le da, y aterriza.
    k.seas(subiendo(2500));
    k.paso();
    expect(k.dentro()).toMatchObject({ camino: "llegada", continua: false, conPermiso: true });
    expect(k.alUmbral()).toBeGreaterThan(LIBRE_ANTES_DEL_UMBRAL);
    k.seas({});
    k.hasta(() => k.dentro().recorrido > k.dentro().toca! + 50);
    expect(k.sitio().y - COTA).toBeLessThan(5);
    expect(k.idos).toEqual([]);
  });

  it("y con el permiso ya dado, lo mismo", () => {
    const k = enLaDecision(true);
    k.seas(corriendo(1, 2300));
    k.hasta(() => k.dentro().recorrido > k.dentro().decide! + 5);
    expect(k.dentro()).toMatchObject({ camino: "llegada", continua: true, conPermiso: true });
    k.seas(subiendo(2500));
    k.paso();
    expect(k.dentro()).toMatchObject({ continua: false, conPermiso: true });
    expect(k.idos).toEqual([]);
  });

  it("y si no va a estarlo, al aire en la decisión, como siempre", () => {
    const k = enLaDecision();
    k.seas(corriendo(15, 1000));
    k.hasta(() => k.dentro().recorrido > k.dentro().decide! + 5 || k.idos.length > 0);
    expect(k.idos).toEqual([EC]);
    expect(k.sitio().y - COTA).toBeGreaterThan(55);
  });

  it("y si te paras en ella, al aire en cuanto se sabe", () => {
    const k = enLaDecision();
    k.seas(corriendo(1, 2300));
    k.hasta(() => k.dentro().recorrido > k.dentro().decide! + 5);
    expect(k.dentro().continua).toBe(true);
    // Abortas: en la pista, sin salir, no se sabe cuándo la dejarás.
    k.seas({ enLaPista: true });
    k.paso();
    expect(k.idos).toEqual([EC]);
    expect(k.alUmbral()).toBeGreaterThan(LIBRE_ANTES_DEL_UMBRAL);
  });

  it("y quien va siempre a punto de irse no le lleva hasta el umbral: a cinco segundos, al aire", () => {
    const k = enLaDecision();
    k.seas(corriendo(0.5, 2400));
    k.hasta(() => k.idos.length > 0);
    expect(k.idos).toEqual([EC]);
    expect(k.alUmbral()).toBeLessThan(LIBRE_ANTES_DEL_UMBRAL + 2);
    expect(k.alUmbral()).toBeGreaterThan(LIBRE_ANTES_DEL_UMBRAL - 1);
    // Y sube desde donde está, sin saltar ni tocar la pista.
    const antes = k.sitio();
    expect(antes.y - COTA).toBeGreaterThan(8);
    k.hasta(() => false, 10);
    expect(k.sitio().y).toBeGreaterThan(antes.y);
    expect(k.dentro()).toMatchObject({ camino: "otro", continua: false, conPermiso: false });
  });

  it("y cruzándola por el medio, que no sales por ella, no te espera nadie", () => {
    const k = enLaDecision();
    // A la altura de la pista y de través: no la ocupas.
    k.seas({
      velocidad: 60,
      porDondeVuela: () => [
        { x: 0, y: COTA + 200, z: 10 },
        { x: 0, y: COTA + 200, z: -2000 },
      ],
    });
    k.hasta(() => k.dentro().conPermiso);
    expect(k.dentro()).toMatchObject({ conPermiso: true, continua: false });
  });
});

describe("lo que le falta a uno para dejar la pista, contado de verdad", () => {
  const esc = SCENARIOS.find((s) => s.id === "tenerife-norte")!;
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const h = (pista.heading * Math.PI) / 180;
  const conUno = () => {
    let tu: QuienJuega | null = null;
    const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
      tierra: () => (suelo ? { suelo, alto: () => cota } : null),
      quienJuega: () => tu,
    });
    return { trafico, seas: (q: QuienJuega | null) => (tu = q) };
  };
  const MATRICULAS = ["EC-SAL", "EC-SAM", "EC-SAN", "EC-SAO", "EC-SAP", "EC-SAQ", "EC-SAR", "EC-SAS"];

  it("el que aterriza, a pocos segundos de lo que tarda", () => {
    const vistos = new Set<string>();
    for (const m of MATRICULAS) {
      const { trafico } = conUno();
      trafico.anuncia(m, "otro.final", true);
      const tipo = trafico.quienes()[0]!.tipo;
      if (vistos.has(tipo)) continue;
      vistos.add(tipo);
      for (let t = 0; t < 300 && !trafico.ocupanLaPista().length; t += 0.5) trafico.paso(0.5);
      expect(trafico.ocupanLaPista()).toEqual([m]);
      // A los diez segundos de tocar, que es cuando te importa.
      for (let t = 0; t < 10; t += 0.5) trafico.paso(0.5);
      const dice = trafico.libreDentroDe(1000);
      let tarda = 0;
      while (tarda < 300 && trafico.ocupanLaPista().length) {
        trafico.paso(0.5);
        tarda += 0.5;
      }
      expect(Math.abs(dice - tarda), `${tipo}: dice ${dice.toFixed(1)} y tarda ${tarda}`).toBeLessThan(4);
      expect(trafico.libreDentroDe(1000)).toBe(0);
    }
    expect(vistos.size).toBeGreaterThan(1);
  });

  it("el que sale, corriendo, también; y alineado sin su salida, no se sabe", () => {
    const { trafico } = conUno();
    const m = MATRICULAS[0]!;
    trafico.anuncia(m, "otro.rodando");
    for (let t = 0; t < 900 && trafico.todaviaNo(m, "torre.lineUpWait"); t += 0.5) trafico.paso(0.5);
    trafico.anuncia(m, "torre.lineUpWait");
    for (let t = 0; t < 90; t += 0.5) trafico.paso(0.5);
    expect(trafico.ocupanLaPista()).toEqual([m]);
    expect(trafico.libreDentroDe(1000)).toBe(Infinity);
    trafico.anuncia(m, "torre.clearedTakeoff");
    for (let t = 0; t < 8; t += 0.5) trafico.paso(0.5);
    const dice = trafico.libreDentroDe(1000);
    let tarda = 0;
    while (tarda < 300 && trafico.ocupanLaPista().length) {
      trafico.paso(0.5);
      tarda += 0.5;
    }
    expect(Math.abs(dice - tarda), `dice ${dice.toFixed(1)} y tarda ${tarda}`).toBeLessThan(4);
  });

  it("y el que va delante de ti en la final cuenta, y el de detrás no", () => {
    const { trafico } = conUno();
    trafico.anuncia(MATRICULAS[0]!, "otro.final", true);
    expect(trafico.ocupanLaPista()).toEqual([]);
    expect(trafico.libreDentroDe(1000)).toBeGreaterThan(30);
    expect(trafico.libreDentroDe(2)).toBe(0);
  });

  it("recién ido al aire tú antes del umbral, no sale uno por debajo", () => {
    const { trafico, seas } = conUno();
    const sal = MATRICULAS.find((m) => {
      trafico.anuncia(m, "otro.rodando");
      if (trafico.quienes()[0]?.tipo === "turbohelice") return true;
      trafico.vaciar();
      return false;
    })!;
    for (let t = 0; t < 900 && trafico.todaviaNo(sal, "torre.clearedTakeoff"); t += 0.5)
      trafico.paso(0.5);
    expect(trafico.todaviaNo(sal, "torre.clearedTakeoff")).toBe(false);
    const vs = verticesDelCircuito(pista, cota, "izquierda", 1);
    const media = pista.length / 2;
    const enElEje = (a: number, y: number): PuntoDeCircuito => ({
      x: pista.x + Math.sin(h) * a,
      y: cota + y,
      z: pista.z - Math.cos(h) * a,
    });
    const yo = { ...enElEje(-media - 800, 80), rumbo: h };
    const umbral = enElEje(-media, 0);
    // En la final, hasta el umbral; subiendo, por la pista y la subida.
    const largo = (q: readonly Sitio[]) =>
      q.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - q[i]!.x, p.z - q[i]!.z), 0);
    const bajando = porDondeSigues(vs, umbral, yo, 41)!;
    const arriba = porDondeSigues(vs, umbral, yo, 41, 1, true)!;
    expect(largo(bajando)).toBeLessThan(900);
    expect(largo(arriba)).toBeGreaterThan(8000);
    expect(arriba[0]).toMatchObject({ y: cota + 80 });
    seas({ alUmbral: null, enLaPista: false, velocidad: 41, porDondeVuela: () => bajando });
    trafico.paso(0.6);
    expect(trafico.todaviaNo(sal, "torre.clearedTakeoff")).toBe(false);
    seas({ alUmbral: null, enLaPista: false, velocidad: 41, porDondeVuela: () => arriba });
    trafico.paso(0.6);
    expect(trafico.todaviaNo(sal, "torre.clearedTakeoff")).toBe(true);
  });
});

describe("la frustrada del guion, con alguien saliendo por delante, no se manda", () => {
  it("espera, y con la pista libre aterriza", () => {
    const k = enLaDecision();
    expect(k.trafico.todaviaNo(EC, "torre.goAround")).toBe(false);
    k.seas(subiendo(1500));
    expect(k.trafico.todaviaNo(EC, "torre.goAround")).toBe(true);
    k.seas({});
    expect(k.trafico.todaviaNo(EC, "torre.goAround")).toBe(false);
  });

  it("y la frecuencia lo autoriza en vez de mandarlo al aire", () => {
    // Una frecuencia con uno de la frustrada que ya cantó final.
    const enFinal = (): { radio: Frecuencia; m: string } => {
      for (let semilla = 1; semilla < 600; semilla++) {
        let x = semilla;
        const radio = new Frecuencia(() => {
          x = (x * 1664525 + 1013904223) >>> 0;
          return x / 4294967296;
        }, "GCXO");
        // Un vuelo cada vez: lo primero que toque a alguien tras cantar final, su «go around».
        for (let t = 0; t < 900; t += 0.5) {
          radio.update(0.5, { fase: "en-vuelo", deDia: true, instructorHablando: false });
          for (const m of radio.matriculas)
            if (radio.loQueToca(m)?.clave === "torre.goAround" && !radio.matriculas.some((o) => o !== m && radio.laTiene(o)))
              return { radio, m };
        }
      }
      throw new Error("ninguna frecuencia tiene una frustrada a punto");
    };
    const momento: Momento = { fase: "en-vuelo", deDia: true, instructorHablando: false };
    const a = enFinal();
    expect(a.radio.autorizarAlLlegar(a.m, momento, false)).toBeNull();
    expect(a.radio.loQueToca(a.m)?.clave).toBe("torre.goAround");
    const b = enFinal();
    b.radio.todaviaNo = (m, clave) => m === b.m && clave === "torre.goAround";
    expect(b.radio.autorizarAlLlegar(b.m, momento, false)).not.toBeNull();
    expect(b.radio.loQueToca(b.m)?.clave).toBe("otro.pistaLibre");
    expect(b.radio.puedeAterrizar(b.m)).toBe(true);
    // Y fuera de la pista sin haberlo cantado, se da por dicho.
    b.radio.dejoLaPista(b.m);
    expect(b.radio.laTiene(b.m)).toBe(false);
    expect(GUIONES.llega.at(-1)!.clave).toBe("otro.pistaLibre");
  });
});

describe("y quien juega, con uno en la pista que la está dejando", () => {
  /** Tú en la final con el turno de verdad y el dibujo a mano. */
  function enTuFinal(cambios: Partial<AlrededorDelTurno> = {}, dibujoDe: Partial<DibujoDelTurno> = {}) {
    const e = {
      alto: 300,
      segundos: 100 as number | null,
      ocupan: ["EC-OTR"] as string[],
      libreDentroDe: 30,
      reloj: 0,
    };
    const boca = new Boca({ ahora: () => e.reloj, cancelar: () => {} });
    const pasos: string[] = [];
    const dibujo: DibujoDelTurno = {
      anuncia: () => {},
      paso: () => [],
      todaviaNo: () => false,
      enFinal: () => null,
      ocupanLaPista: () => e.ocupan,
      libreDentroDe: () => (e.ocupan.length ? e.libreDentroDe : 0),
      ...dibujoDe,
    };
    const turno = new TurnoDePista({
      radio: new Frecuencia(() => 0.5, "GCXO"),
      boca,
      trafico: () => dibujo,
      torre: () => true,
      privado: () => false,
      alUmbral: () => (e.segundos ?? 0) * 60,
      alto: () => e.alto,
      enTierra: () => false,
      decirAOtro: () => null,
      autorizarte: () => pasos.push("permiso"),
      darteElPermisoYa: () => pasos.push("a la vista"),
      mandarteAlAire: (alto) => pasos.push(`al aire a ${alto}`),
      avisarteOcupada: (conPermiso) => pasos.push(conPermiso ? "ocupada, con permiso" : "sigue"),
      tuLlegada: () =>
        e.segundos === null ? null : { segundos: e.segundos, donde: "final", alto: e.alto },
      ...cambios,
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    return { e, boca, pasos, turno, paso: () => turno.paso("final") };
  }

  it("te dice que sigas, y por debajo de la decisión el permiso, a la vista", () => {
    const k = enTuFinal();
    k.paso();
    k.paso();
    expect(k.pasos).toEqual(["sigue"]);
    Object.assign(k.e, { alto: 55, segundos: 14, libreDentroDe: 6 });
    k.paso();
    expect(k.pasos).toEqual(["sigue"]);
    Object.assign(k.e, { alto: 40, segundos: 9, ocupan: [] });
    k.paso();
    expect(k.pasos).toEqual(["sigue", "permiso", "a la vista"]);
  });

  it("y si no le va a dar tiempo, al aire en la decisión, como siempre", () => {
    const k = enTuFinal();
    Object.assign(k.e, { alto: 59, segundos: 15, libreDentroDe: 12 });
    k.paso();
    expect(k.pasos).toEqual(["sigue", "al aire a 59"]);
  });

  it("y si se para, o se sigue sin saber, al aire antes del umbral", () => {
    const k = enTuFinal();
    Object.assign(k.e, { alto: 55, segundos: 14, libreDentroDe: 6 });
    k.paso();
    Object.assign(k.e, { alto: 45, segundos: 10, libreDentroDe: Infinity });
    k.paso();
    expect(k.pasos).toEqual(["sigue", "al aire a 45"]);
    const l = enTuFinal();
    // Siempre a medio segundo de dejarla: a cinco del umbral, al aire.
    for (let s = 14; s > 0 && l.pasos.length < 2; s -= 0.1) {
      Object.assign(l.e, { alto: 15 + s * 3, segundos: s, libreDentroDe: 0.5 });
      l.paso();
    }
    expect(l.pasos[1]).toMatch(/^al aire a 3[01]/);
  });

  it("y sin saber a cuánto vienes, lo de antes: al aire en la decisión", () => {
    const k = enTuFinal();
    Object.assign(k.e, { alto: 59, segundos: null, libreDentroDe: 1 });
    k.paso();
    expect(k.pasos).toEqual(["sigue", "al aire a 59"]);
  });

  it("y con el permiso ya dado, se ocupa y la va a dejar: sigue valiendo", () => {
    const k = enTuFinal();
    k.e.ocupan = [];
    k.paso();
    expect(k.pasos).toEqual(["permiso"]);
    Object.assign(k.e, { alto: 55, segundos: 14, ocupan: ["EC-OTR"], libreDentroDe: 6 });
    k.paso();
    expect(k.pasos).toEqual(["permiso", "ocupada, con permiso"]);
    Object.assign(k.e, { alto: 45, segundos: 10, libreDentroDe: 8 });
    k.paso();
    expect(k.pasos.at(-1)).toBe("al aire a 45");
  });

  it("y con la pista ya libre a la vista, lo que falte por oír de ella no te tapa el permiso", () => {
    const k = enTuFinal();
    k.boca.pedir("mando", () => {}, "torre.otraCosa");
    k.boca.pedir("baja", () => {}, "otro.pistaLibre@EC-OTR");
    Object.assign(k.e, { alto: 90, segundos: 20, ocupan: [] });
    k.paso();
    // Por encima de la decisión se espera a que se oiga.
    expect(k.pasos).toEqual([]);
    Object.assign(k.e, { alto: 50, segundos: 11 });
    k.paso();
    expect(k.pasos).toEqual(["permiso", "a la vista"]);
  });

  it("y dejada la final, el «continúe» que esperaba turno se retira", () => {
    const k = enTuFinal();
    k.paso();
    k.boca.pedir("mando", () => {}, "torre.otraCosa");
    k.boca.pedir("mando", () => {}, "torre.canario.continue@EC-YOO");
    expect(k.boca.esperaAlguna(esTuContinua)).toBe(true);
    k.turno.paso("en-vuelo");
    expect(k.boca.esperaAlguna(esTuContinua)).toBe(false);
  });
});

describe("«continúe aproximación», dicho en los tres sitios y a la espera de su toma", () => {
  it("está en los diccionarios, con las dos torres", () => {
    for (const d of [ES_PY, EN])
      for (const clave of ["torre.continue", "torre.canario.continue"] as const)
        expect(d[clave]).toMatch(/^\{indicativo\}, /);
  });

  it("su pieza está en la lista de grabar, y hasta entonces no se pide", () => {
    const lista = frases as { id: string; voz: string; texto: string }[];
    const de = (id: string) => lista.find((f) => f.id === id);
    for (const [voz, solo] of [
      ["torre", "torre.solo"],
      ["torre-canarias", "torre.canario.solo"],
    ]) {
      expect(de(`${solo}.continueAproximacion`)).toMatchObject({ voz, texto: "continúe aproximación" });
      expect(de(`${solo}.continueApproach`)).toMatchObject({ voz, texto: "continue approach" });
    }
    expect(ESPERAN_SU_TOMA.has("torre.continue")).toBe(true);
    expect(ESPERAN_SU_TOMA.has("torre.continueApproach")).toBe(true);
    // Y el juego no la pide sin su toma: sería muda en el navegador de quien más juega.
    const dice = fuenteDelJuego.slice(
      fuenteDelJuego.indexOf("private decirQueSigas()"),
      fuenteDelJuego.indexOf("private decirQueSigas()") + 1400,
    );
    expect(dice.match(/this\.instructor\.vozDe\(/g)).toHaveLength(2);
  });
});
