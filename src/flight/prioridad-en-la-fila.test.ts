/**
 * **El que va justo de combustible entra primero.**
 *
 * Gando mandó «motor y al aire» al JAZ 120 en reserva: «¿los controladores de
 * Gando son unos psicópatas?». Lo real: con «minimum fuel» o «MAYDAY FUEL» el
 * control le da prioridad, aparta a los demás y no lo manda al aire salvo que
 * la pista esté ocupada de verdad. Ver `QuienJuega.prioridad` en
 * `world/trafico.ts` y `AhoraMismo.conPrioridad` en `la-aproximacion.ts`.
 *
 * Aquí se vuela la fila de llegadas de cada campo con tráfico, con quien juega
 * llegando de lejos —entra en la fila a diez minutos del umbral, como hace el
 * juego con prioridad— y se cuentan los del tráfico que, habiendo girado a la
 * base después de entrar él, le cruzan el umbral en los dos minutos de más que
 * le deja libres la prioridad, por delante del hueco de siempre.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "./radio";
import { TurnoDePista } from "./turno-de-pista";
import { crearTrafico, tiposDelCampo, type QuienJuega } from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS, type Scenario } from "../world/scenarios";
import { sinTorre, type Aerodrome } from "../world/aerodrome";
import { Vector3 } from "three";
import { LaAproximacion } from "./la-aproximacion";
import type { FlightState } from "./model";
import { PYKASU } from "./aircraft";
import { Reparto } from "../hechos";
import type { Vaca } from "../world/vaca";
import { GRAN_CANARIA } from "../world/scenarios";
import { campoDeCasa, distanciaAlUmbral, umbralEnUso } from "../world/campo-del-vuelo";

const PASO = 0.5;
/** A cuánto se acerca quien juega, m/s: un reactor en la llegada. */
const LLEGA_A = 80;
/**
 * Desde cuántos segundos del umbral está en la fila: diez minutos, que es
 * cuando entra en el juego un reactor con prioridad —bajando por el plan, a
 * cuarenta millas—. Lo que se puede apartar es lo que todavía no ha girado a
 * la base: lo que ya la vuela aterriza delante, como con un control de verdad.
 */
const DESDE = 600;
/** Lo que se le deja libre por delante con prioridad. Ver `PRIORIDAD`. */
const LIBRE = 120;
/**
 * Y el hueco que deja siempre, con prioridad o sin ella: la separación entre
 * llegadas y el colchón. Ver `SEPARACION_ENTRE_LLEGADAS` y `COLCHON`.
 */
const SIEMPRE = 135;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const CON_TRAFICO = SCENARIOS.filter((e) => {
  const aero = e.aerodrome;
  return !!aero && tiposDelCampo(aero.id, e.runway.length, sinTorre(aero)).length > 0;
});

/**
 * Una llegada: el tráfico vuela su rato y, a los `antes` segundos, quien juega
 * entra en la fila. Devuelve cuántos del tráfico le cruzan el umbral en los dos
 * minutos de antes de él, sin contar los que ya volaban la final al entrar.
 */
function llegar(esc: Scenario, semilla: number, prioridad: boolean, antes: number): number {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  let alUmbral: number | null = null;
  const quienJuega = (): QuienJuega => ({
    alUmbral,
    enLaPista: false,
    velocidad: LLEGA_A,
    prioridad,
  });
  const trafico = crearTrafico(pista, 0, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    tierra: suelo ? () => ({ suelo, alto: () => 0 }) : undefined,
    quienJuega,
  });
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(semilla), aero.id),
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    alUmbral: () => alUmbral ?? Infinity,
    alto: () => 1000,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
  const cruzaron = new Set<string>();
  const entra = antes;
  const llegaEl = antes + DESDE;
  /*
   * Cuándo giró cada uno a la base —cuando entra en la fila—, que es donde
   * decide si le cabe o espera. Lo que giró antes de que él entrara en la
   * fila no lo podía saber, y aterriza delante: como con un control de verdad.
   */
  const giro = new Map<string, number>();
  let vistos = new Map<string, number>();
  for (let t = 0; t < llegaEl + 30; t += PASO) {
    turno.oir(PASO, { fase: "en-vuelo", deDia: true, instructorHablando: false });
    turno.paso("en-vuelo");
    if (t >= entra && alUmbral === null) alUmbral = DESDE;
    else if (alUmbral !== null) alUmbral = Math.max(0, alUmbral - PASO);
    const ahora = new Map(trafico.secuencia().map((x) => [x.matricula, x.alUmbral]));
    for (const [matricula] of ahora) if (!vistos.has(matricula)) giro.set(matricula, t);
    for (const [matricula, antesQuedaba] of vistos) {
      const queda = ahora.get(matricula);
      const cruza = queda === undefined ? antesQuedaba < 5 : antesQuedaba > 0 && queda <= 0;
      if (!cruza || (giro.get(matricula) ?? -1) < entra) continue;
      // En el hueco que la prioridad le deja libre, y fuera del de siempre.
      const faltaba = llegaEl - t;
      if (faltaba > SIEMPRE && faltaba <= SIEMPRE + LIBRE) cruzaron.add(matricula);
    }
    vistos = ahora;
  }
  trafico.dispose();
  return cruzaron.size;
}

describe("con prioridad, se le apartan", () => {
  it("en los campos con tráfico, la mitad o menos se le cuelan en sus dos minutos de más", () => {
    /*
     * **La mitad, y no ninguno**, y es lo que hay: la prioridad se decide
     * donde el tráfico decide si le cabe, en la esquina de la base. Quien gira
     * con hueco y luego se retrasa detrás de otro —porque va detrás de uno más
     * lento— acaba cruzando el umbral un poco más tarde de lo que decía, y a
     * veces dentro del hueco. Apartarlo después es cosa de la secuencia de
     * llegadas entera, no de esta prioridad. Medido: 49 frente a 92.
     */
    let conPrioridad = 0;
    let sinPrioridad = 0;
    for (const esc of CON_TRAFICO)
      for (let semilla = 1; semilla <= 4; semilla++)
        for (const antes of [300, 900]) {
          conPrioridad += llegar(esc, semilla, true, antes);
          sinPrioridad += llegar(esc, semilla, false, antes);
        }
    // Que la cuenta los ve: sin prioridad se cuelan.
    expect(sinPrioridad).toBeGreaterThan(20);
    expect(conPrioridad, `${conPrioridad} con prioridad, ${sinPrioridad} sin ella`).toBeLessThanOrEqual(
      sinPrioridad * 0.6,
    );
  });
});

describe("y a quien tiene prioridad no se le inventa una frustrada", () => {
  /** La final de Gando, a `d` metros del umbral y `alto` sobre la pista. */
  const GANDO = campoDeCasa(GRAN_CANARIA);
  function enFinal(d: number, alto: number): FlightState {
    const [ux, uz] = umbralEnUso(GANDO);
    const h = (GANDO.pista.heading * Math.PI) / 180;
    return {
      position: new Vector3(ux - Math.sin(h) * d, alto, uz + Math.cos(h) * d),
      heading: h,
      airspeed: PYKASU.approachSpeed,
      verticalSpeed: -3,
      onGround: false,
    } as unknown as FlightState;
  }
  function mandan(conPrioridad: boolean): string[] {
    const hechos = new Reparto();
    const dicho: string[] = [];
    hechos.on("mandaronIrseAlAire", (d) => dicho.push(d.porque));
    const s = enFinal(1500, 100);
    const a = new LaAproximacion({
      avion: () => PYKASU,
      hechos,
      vaca: { quitar: () => {} } as unknown as Vaca,
      campoDeAhora: () => ({
        pista: GANDO.pista,
        cota: 0,
        alUmbral: distanciaAlUmbral(GANDO, s.position.x, s.position.z),
        senda: null,
        /*
         * El sorteo queda solo donde no hay torre, que es donde se cruza la
         * vaca y se ve: con torre, la orden sale de quien ocupa la pista de
         * verdad. Ver `mirarSiMandanFrustrar`.
         */
        sinTorre: true,
      }),
    });
    a.ordenes = "auto";
    // El sorteo, amañado para que toque: lo que se mide es quién lo tira.
    const azar = Math.random;
    Math.random = () => 0;
    try {
      a.paso({
        estado: s,
        acercandose: true,
        circuito: null,
        faseDeAhora: "final",
        techoDeNubes: null,
        terrenoDicho: null,
        vueloTerminado: false,
        conPrioridad,
      });
    } finally {
      Math.random = azar;
    }
    return dicho;
  }

  it("sin prioridad, el sorteo manda irse al aire: la cuenta lo ve", () => {
    expect(mandan(false)).toContain("pistaOcupada");
  });

  it("con prioridad, no", () => {
    expect(mandan(true)).toEqual([]);
  });
});
