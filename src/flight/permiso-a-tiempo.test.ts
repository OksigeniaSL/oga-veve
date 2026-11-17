/**
 * **Tu «cleared to land», a tiempo**: antes de las dos millas, y nunca
 * después de tocar.
 *
 * En el banco del vuelo entero del JAZ 90 en Los Rodeos con el reloj ×12
 * (H29a), la torre no dijo ningún permiso: «se aterrizó y no sonó ninguna».
 * En la cola de la boca, «torre.canario.aterrizar» y su «clearedLand» se
 * retiraron a los cincuenta metros «porque ya no era verdad», al darse el
 * permiso a la vista en la decisión. No esperaron turno en una boca llena:
 * se pidieron tarde. Delante iba EC-ZFP, uno del tráfico que había girado a
 * su base mientras el JAZ 90 volaba la suya, sin su hueco, y que a los 49 m
 * del JAZ 90 acababa de dejar la pista —«al costado: 722 s a 49 m: EC-ZFP a
 * 1541 m del umbral y -73 m del eje», ya pasado su punto de salida—. La torre
 * no autoriza con nadie encima, así que el permiso esperó a eso. El tráfico
 * solo te ponía en su fila de llegadas al coger la final, y el JAZ 90 la coge
 * a cuatro kilómetros y medio del umbral. Y por el mismo lado, más raro: al
 * que sale se le daba la pista si se iba antes de que cruzaras el umbral, no
 * antes de cuando tiene que sonar tu permiso.
 *
 * Lo real (OACI, PANS-ATM, Doc 4444, 16.ª edición, 2016):
 *
 * - **8.9.6.1.7**: «Clearance to land … should normally be passed to the
 *   aircraft before it reaches a distance of 4 km (2 NM) from touchdown.» Y
 *   8.9.6.1.8 a) iii): sin permiso a esa distancia, al aire.
 * - **7.7.1.2**: «Sufficient separation shall be effected between aircraft in
 *   flight in the traffic circuit to allow the spacing of arriving and
 *   departing aircraft». El hueco entre dos llegadas se hace en el circuito,
 *   no en la final.
 *
 * Aquí se vuela lo que monta el juego —la frecuencia de Los Rodeos, su tráfico
 * dibujado con sus calles, el turno de pista y una boca de verdad con lo que
 * tarda cada frase— y el JAZ 90 llegando por el circuito: a cinco minutos del
 * umbral entra en él, a cuatro kilómetros y medio coge la final de la torre
 * —lo medido en el banco— y ahí pide su permiso. La boca habla de la
 * frecuencia en cuanto el canal está libre, y lo que la torre les dice a los
 * demás para darte la pista va antes que lo tuyo. Se apunta a qué distancia
 * empieza a sonar tu permiso.
 *
 * Medido el 17-11-2026, en las 36 llegadas: con el código de antes, 6 tarde
 * —una al aire por la pista ocupada, la más tarde a 1.521 m—; ahora, ninguna,
 * y suena entre 4.064 y 4.497 m del umbral.
 */
import { describe, expect, it } from "vitest";
import { Boca } from "../audio/boca";
import { Frecuencia, PISTA_TUYA } from "./radio";
import { TurnoDePista } from "./turno-de-pista";
import { AIRCRAFT } from "./aircraft";
import {
  crearTrafico,
  PERMISO_ANTES_DE,
  tiposDelCampo,
  type QuienJuega,
} from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS, conViento, type Scenario } from "../world/scenarios";
import { TIEMPO_DE_CASA } from "../world/meteo";
import { sinTorre, type Aerodrome } from "../world/aerodrome";

const PASO = 0.2;
/**
 * Dónde coge el JAZ 90 la final de la torre en Los Rodeos, m al umbral:
 * medido en el banco del vuelo entero, al acabar el viraje de la base.
 */
const FINAL_DE_LA_TORRE = 4500;
/** Desde cuántos segundos antes del umbral se vuela el circuito. */
const EN_EL_CIRCUITO = 300;
/**
 * Lo que dura cada frase, s: la lámpara en castellano con tu matrícula y la
 * pista, su fraseología con el viento, y lo que se dice de los demás.
 */
const DURA = { lampara: 5, fraseologia: 9, aOtro: 5, frecuencia: 4.5 };
const JAZ_90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;

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

interface Llegada {
  /** A cuántos metros del umbral empezó a sonar tu permiso, o `null`. */
  sono: number | null;
  /** Si se dio a la vista, sin voz, a los mínimos. */
  aLaVista: boolean;
  /** Si la torre te mandó al aire. */
  alAire: boolean;
  /** Lo que se oyó, para leerlo si falla. */
  oido: string[];
}

/**
 * Una llegada: el tráfico vuela `antes` segundos solo, y entonces el JAZ 90
 * entra en el circuito a `EN_EL_CIRCUITO` del umbral y baja hasta tocar.
 */
function llegar(esc: Scenario, semilla: number, antes: number, conCircuito = true): Llegada {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const v = JAZ_90.approachSpeed + 5;
  let t = 0;
  /** Lo que te falta para el umbral, s; `null` mientras no vienes. */
  let restante: number | null = null;
  const enFinal = (): boolean => restante !== null && restante * v <= FINAL_DE_LA_TORRE;
  const quienJuega = (): QuienJuega => ({
    alUmbral: enFinal() ? restante : null,
    llegada: restante,
    porElCircuito: conCircuito && restante !== null && !enFinal() ? restante : null,
    enLaPista: false,
    velocidad: v,
  });
  const trafico = crearTrafico(pista, 0, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    tierra: suelo ? () => ({ suelo, alto: () => 0 }) : undefined,
    quienJuega,
  });

  // La boca, con su reloj y su silencio entre frases.
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
  const salida: Llegada = { sono: null, aLaVista: false, alAire: false, oido: [] };
  const apunta = (que: string) =>
    salida.oido.push(`${t.toFixed(1)} [${restante === null ? "—" : Math.round(restante * v)} m] ${que}`);
  /** Una frase que dura `s` segundos y apunta cuándo empieza. */
  const frase =
    (que: string, s: number, alEmpezar?: () => void) =>
    (listo: () => void): void => {
      apunta(que);
      alEmpezar?.();
      pendientes.push({ cuando: ahora + s * 1000, hacer: listo });
    };

  let permisoSinOir = false;
  const TUYA = "torre.canario.aterrizar@yo";
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(semilla), aero.id),
    boca,
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    alUmbral: () => (restante === null ? Infinity : restante * v),
    alto: () => (restante === null ? 300 : Math.min(300, restante * v * Math.tan(Math.PI / 60))),
    enTierra: () => false,
    tuLlegada: () =>
      restante === null
        ? null
        : { segundos: restante, donde: enFinal() ? "final" : "circuito", alto: 300 },
    // Lo que le quita la pista a otro, en `mando`, como el juego.
    decirAOtro: (dice) => {
      const clave = `${dice.clave}@${dice.de.matricula}`;
      boca.pedir("mando", frase(`torre → ${dice.de.matricula}: ${dice.clave}`, DURA.aOtro), clave);
      return clave;
    },
    // Tu permiso: la lámpara y detrás su fraseología, como `autorizarElAterrizaje`.
    autorizarte: () => {
      permisoSinOir = true;
      apunta("pedido tu permiso");
      boca.pedir(
        "mando",
        frase("tu permiso", DURA.lampara, () => {
          permisoSinOir = false;
          if (restante !== null) salida.sono ??= restante * v;
        }),
        TUYA,
      );
      boca.pedir(
        "mando",
        frase("tu cleared to land", DURA.fraseologia),
        "torre.canario.clearedLand@yo",
      );
    },
    permisoSinOir: () => permisoSinOir,
    darteElPermisoYa: () => {
      permisoSinOir = false;
      salida.aLaVista = true;
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
  for (; t < antes + EN_EL_CIRCUITO; t += PASO) {
    if (t >= antes) restante = restante === null ? EN_EL_CIRCUITO : restante - PASO;
    const fase = enFinal() ? "final" : "en-vuelo";
    if (PISTA_TUYA.has(fase) && !PISTA_TUYA.has(faseAntes)) turno.alSerTuya(fase);
    if (fase === "final" && faseAntes !== "final") turno.pedirAterrizaje();
    faseAntes = fase;
    turno.paso(fase);
    // La frecuencia habla con el canal libre, en voz baja, como en el juego.
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
    if (salida.alAire || salida.aLaVista) break;
  }
  trafico.dispose();
  return salida;
}

/** Todas las llegadas: las dos cabeceras, seis momentos y tres semillas. */
function todas(conCircuito: boolean): { donde: string; l: Llegada }[] {
  const salen: { donde: string; l: Llegada }[] = [];
  for (const esc of cabeceras())
    for (const antes of [120, 240, 360, 480, 600, 720])
      for (const semilla of [1, 2, 3])
        salen.push({
          donde: `${Math.round(esc.runway.heading)}° tras ${antes} s, semilla ${semilla}`,
          l: llegar(esc, semilla, antes, conCircuito),
        });
  return salen;
}

/** Las que no llegan a oírse antes de las dos millas. */
const tarde = (x: { l: Llegada }) => x.l.sono === null || x.l.sono < PERMISO_ANTES_DE;

/** El parte de una tanda, para leerlo: cuántas tarde y a qué distancia sonó. */
function parte(nombre: string, llegadas: readonly { l: Llegada }[]): string {
  const m = llegadas.map((x) => x.l.sono).filter((d): d is number => d !== null);
  const fmt = (d: number | undefined) => (d === undefined ? "—" : `${Math.round(d)} m`);
  const orden = [...m].sort((a, b) => a - b);
  return (
    `${nombre}: ${llegadas.filter(tarde).length} de ${llegadas.length} tarde` +
    ` (${llegadas.filter((x) => x.l.aLaVista).length} a la vista,` +
    ` ${llegadas.filter((x) => x.l.alAire).length} al aire)` +
    ` · sonó entre ${fmt(orden[0])} y ${fmt(orden.at(-1))} del umbral,` +
    ` mediana ${fmt(orden[Math.floor(orden.length / 2)])}`
  );
}

describe("tu permiso para aterrizar, en Los Rodeos con el JAZ 90 por el circuito", () => {
  const ahora = todas(true);
  const sinCircuito = todas(false);
  console.info(
    [parte("con la fila desde el circuito", ahora), parte("sin ella", sinCircuito)].join("\n"),
  );

  it("suena antes de las dos millas, sin irse al aire ni darse a la vista", () => {
    const mal = ahora.filter(tarde);
    expect(
      mal.map(
        (x) =>
          `${x.donde}: ${x.l.sono === null ? "no sonó" : `a ${Math.round(x.l.sono)} m`}` +
          `${x.l.aLaVista ? ", a la vista" : ""}${x.l.alAire ? ", al aire" : ""}\n  ` +
          x.l.oido.slice(-8).join("\n  "),
      ),
    ).toEqual([]);
  });

  /*
   * Y la cuenta ve el fallo: sin entrar en la fila desde el circuito, el
   * tráfico se te cuela delante y el permiso llega tarde o no llega.
   */
  it("y sin entrar en la fila desde el circuito, se te cuelan y llega tarde", () => {
    expect(sinCircuito.filter(tarde).length).toBeGreaterThan(0);
  });
});
