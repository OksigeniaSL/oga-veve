/**
 * **Las salidas que la torre soltaba delante de quien vuelve a su campo con
 * el plan puesto en otra isla** (enmienda H69 del ADR 0029).
 *
 * En el banco del vuelo entero del JAZ 20 en Los Rodeos con la pista ocupada
 * (H68), EC-IUV y EC-GIX entraron en la pista a los 497,5 y 947,5 s, con el
 * JAZ 20 en el viento en cola y la base, 47 y 29 s antes de coger la final, y
 * las dos le mandaron al aire. Para no soltar a nadie así está
 * `llegaAntesDeQueSalga` en `world/trafico.ts`, que te mira también por el
 * circuito; pero la llegada por el circuito (`tuCircuitoParaLaTorre` en
 * `game.ts`) era `null` con el plan hacia otro campo, y el banco daba la
 * vuelta al campo con el destino del juego en otra isla.
 *
 * Aquí se vuela lo que monta el juego —la frecuencia de Los Rodeos, su
 * tráfico dibujado con sus calles y el turno de pista, como en
 * `permiso-a-tiempo.test.ts`— con el JAZ 20 por su viento en cola y su base y
 * el plan en otra isla. Lo que la torre sabe de ti en el circuito lo decide
 * la regla del juego (`CircuitoDeLaTorre`), o la de antes, que con el plan
 * fuera no te veía. Se apunta quién sale y entra en la pista en el minuto de
 * antes de tu final, y si la torre te manda al aire.
 */
import { describe, expect, it } from "vitest";
import { Boca } from "../audio/boca";
import { Frecuencia, PISTA_TUYA } from "./radio";
import { TurnoDePista } from "./turno-de-pista";
import { AIRCRAFT } from "./aircraft";
import { CircuitoDeLaTorre, type LoQueVeDeTuCircuito } from "./circuito-de-la-torre";
import { crearTrafico, tiposDelCampo, type QuienJuega } from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS, conViento, type Scenario } from "../world/scenarios";
import { TIEMPO_DE_CASA } from "../world/meteo";
import { sinTorre, type Aerodrome } from "../world/aerodrome";

const PASO = 0.2;
/** Dónde coge el JAZ 20 la final en Los Rodeos, m al umbral: lo de H68. */
const LA_FINAL = 3400;
/** Desde cuántos segundos antes del umbral se vuela el viento en cola. */
const EN_EL_CIRCUITO = 240;
/** Lo que dura la base, s, antes de la final. */
const LA_BASE = 50;
/** El minuto de antes de la final, s: donde entraron EC-IUV y EC-GIX. */
const ANTES_DE_LA_FINAL = 60;
const DURA = { lampara: 5, fraseologia: 9, aOtro: 5, frecuencia: 4.5 };
const JAZ_20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Las dos cabeceras de Los Rodeos, por el viento. */
function cabeceras(): Scenario[] {
  const rodeos = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
  const por = new Map<number, Scenario>();
  for (const v of [0, 90, 180, 270]) {
    const e = conViento(rodeos, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

type Regla = "antes" | "ahora";

interface Llegada {
  /** Los que salen y entraron en la pista en el minuto de antes de tu final. */
  entraron: string[];
  /** Si la torre te mandó al aire. */
  alAire: boolean;
  oido: string[];
}

/**
 * Una llegada: el tráfico vuela `antes` segundos solo, y entonces el JAZ 20
 * vuela su viento en cola a `EN_EL_CIRCUITO` del umbral, la base y la final,
 * con el plan en otra isla.
 */
function llegar(esc: Scenario, semilla: number, antes: number, regla: Regla): Llegada {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const v = JAZ_20.approachSpeed + 5;
  let t = 0;
  let restante: number | null = null;
  const enFinal = (): boolean => restante !== null && restante * v <= LA_FINAL;
  const finalEn = LA_FINAL / v;
  /** Lo que el juego le da a la torre de tu circuito: ver `tuCircuitoParaLaTorre`. */
  const torre = new CircuitoDeLaTorre();
  const loQueVe = (): LoQueVeDeTuCircuito => ({
    enSuFranja: restante !== null && !enFinal(),
    tramo: restante !== null && restante > finalEn + LA_BASE ? "encola" : "base",
    vuelvesAqui: false,
    trasIrse: false,
    vertical: restante !== null && restante > finalEn + LA_BASE ? 0 : -2.5,
  });
  let teCuenta = false;
  const porElCircuito = (): number | null => (teCuenta && !enFinal() ? restante : null);
  const quienJuega = (): QuienJuega => ({
    alUmbral: enFinal() ? restante : null,
    llegada: enFinal() ? restante : porElCircuito(),
    porElCircuito: porElCircuito(),
    enLaPista: false,
    velocidad: v,
  });
  const trafico = crearTrafico(pista, 0, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    tierra: suelo ? () => ({ suelo, alto: () => 0 }) : undefined,
    quienJuega,
  });

  let ahora = 0;
  const pendientes: { cuando: number; hacer: () => void }[] = [];
  const boca = new Boca({
    ahora: () => ahora,
    cancelar: () => {},
    esperar: (ms, hacer) => void pendientes.push({ cuando: ahora + ms, hacer }),
  });
  const correr = (ms: number): void => {
    const hasta = ahora + ms;
    for (;;) {
      pendientes.sort((a, b) => a.cuando - b.cuando);
      const p = pendientes[0];
      if (!p || p.cuando > hasta) break;
      pendientes.shift();
      ahora = Math.max(ahora, p.cuando);
      p.hacer();
    }
    ahora = hasta;
  };
  const salida: Llegada = { entraron: [], alAire: false, oido: [] };
  const apunta = (que: string) =>
    salida.oido.push(`${t.toFixed(1)} [${restante === null ? "—" : Math.round(restante * v)} m] ${que}`);
  const frase =
    (que: string, s: number, alEmpezar?: () => void) =>
    (listo: () => void): void => {
      apunta(que);
      alEmpezar?.();
      pendientes.push({ cuando: ahora + s * 1000, hacer: listo });
    };

  let permisoSinOir = false;
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(semilla), aero.id),
    boca,
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    alUmbral: () => (restante === null ? Infinity : restante * v),
    alto: () => (restante === null ? 300 : Math.min(280, restante * v * Math.tan(Math.PI / 60))),
    enTierra: () => false,
    // Tu llegada para la torre: por la final, y por el circuito si te cuenta.
    tuLlegada: () =>
      enFinal()
        ? { segundos: restante!, donde: "final", alto: Math.min(280, restante! * v * Math.tan(Math.PI / 60)) }
        : porElCircuito() !== null
          ? { segundos: restante!, donde: "circuito", alto: 280 }
          : null,
    decirAOtro: (dice) => {
      const clave = `${dice.clave}@${dice.de.matricula}`;
      boca.pedir("mando", frase(`torre → ${dice.de.matricula}: ${dice.clave}`, DURA.aOtro), clave);
      return clave;
    },
    autorizarte: () => {
      permisoSinOir = true;
      apunta("pedido tu permiso");
      boca.pedir(
        "mando",
        frase("tu permiso", DURA.lampara, () => void (permisoSinOir = false)),
        "torre.canario.aterrizar@yo",
      );
    },
    permisoSinOir: () => permisoSinOir,
    darteElPermisoYa: () => {
      permisoSinOir = false;
      apunta("a la vista");
    },
    retirarteElPermiso: () => void (permisoSinOir = false),
    mandarteAlAire: () => {
      salida.alAire = true;
      apunta("al aire");
    },
    mandanFrustrar: () => salida.alAire,
  });

  let faseAntes = "en-vuelo";
  let enLaPista = new Set<string>();
  for (; t < antes + EN_EL_CIRCUITO; t += PASO) {
    if (t >= antes) restante = restante === null ? EN_EL_CIRCUITO : restante - PASO;
    if (restante !== null && restante > 0) teCuenta = regla === "ahora" ? torre.paso(loQueVe()) : false;
    const fase = enFinal() ? "final" : "en-vuelo";
    if (PISTA_TUYA.has(fase) && !PISTA_TUYA.has(faseAntes)) turno.alSerTuya(fase);
    if (fase === "final" && faseAntes !== "final") turno.pedirAterrizaje();
    faseAntes = fase;
    turno.paso(fase);
    const dice = turno.oir(PASO, {
      fase,
      deDia: true,
      instructorHablando: false,
      canalOcupado: !boca.libre,
    });
    if (dice)
      boca.pedir(
        "baja",
        frase(`${dice.de.matricula}: ${dice.clave}`, DURA.frecuencia),
        `${dice.clave}@${dice.de.matricula}`,
      );
    correr(PASO * 1000);
    // Quién entra en la pista y no llega: los que salen.
    const llegan = new Set(trafico.secuencia().map((s) => s.matricula));
    const ahoraEnLaPista = new Set(trafico.ocupanLaPista());
    const queda = restante === null ? null : restante - finalEn;
    for (const m of ahoraEnLaPista)
      if (!enLaPista.has(m) && !llegan.has(m) && queda !== null && queda <= ANTES_DE_LA_FINAL && queda > 0) {
        salida.entraron.push(`${m} a ${Math.round(queda)} s de tu final`);
        apunta(`${m} entra en la pista`);
      }
    enLaPista = ahoraEnLaPista;
    if (salida.alAire) break;
  }
  trafico.dispose();
  return salida;
}

/** Todas las llegadas: las dos cabeceras, ocho momentos y tres semillas. */
function todas(regla: Regla): { donde: string; l: Llegada }[] {
  const salen: { donde: string; l: Llegada }[] = [];
  for (const esc of cabeceras())
    for (const antes of [120, 240, 360, 480, 600, 720, 840, 960])
      for (const semilla of [1, 2, 3])
        salen.push({
          donde: `${Math.round(esc.runway.heading)}° tras ${antes} s, semilla ${semilla}`,
          l: llegar(esc, semilla, antes, regla),
        });
  return salen;
}

function parte(nombre: string, llegadas: readonly { l: Llegada }[]): string {
  return (
    `${nombre}: ${llegadas.filter((x) => x.l.entraron.length > 0).length} de ${llegadas.length}` +
    ` con una salida en la pista en el minuto de antes de la final,` +
    ` ${llegadas.filter((x) => x.l.alAire).length} al aire`
  );
}

describe("el JAZ 20 en Los Rodeos, de vuelta al campo con el plan en otra isla (H69)", () => {
  const ahora = todas("ahora");
  const antes = todas("antes");
  console.info([parte("con la regla de ahora", ahora), parte("con la de antes", antes)].join("\n"));

  it("la torre no suelta a nadie en la pista en el minuto de antes de tu final", () => {
    const mal = ahora.filter((x) => x.l.entraron.length > 0 || x.l.alAire);
    expect(
      mal.map((x) => `${x.donde}: ${x.l.entraron.join(", ")}${x.l.alAire ? ", al aire" : ""}\n  ` +
        x.l.oido.slice(-8).join("\n  ")),
    ).toEqual([]);
  });

  /*
   * Y la cuenta ve el fallo: con la regla de antes, la torre no te veía en el
   * circuito y soltaba salidas delante.
   */
  it("y con la de antes, se le metían salidas delante", () => {
    expect(antes.filter((x) => x.l.entraron.length > 0).length).toBeGreaterThan(0);
    expect(antes.filter((x) => x.l.alAire).length).toBeGreaterThan(0);
  });
});
