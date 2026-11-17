/**
 * **El viraje a final del JAZ 90 no deja la puerta bajando a más de mil pies
 * por minuto.**
 *
 * Nace del #192 (H29b, H29g): en la final de Los Rodeos, el banco del vuelo
 * entero pedía al automático en el arco del viraje a final hasta 6,25 m/s,
 * 1.230 pies por minuto, con el ala a veinticinco grados y por debajo de los
 * mil pies. El avión llegó a bajar 7,3, al enderezar subió a 0,5, y la puerta
 * de los 500 ft llegó bajando a 5,3 de media. Ningún piloto de reactor vira a
 * final así: la aproximación visual se estabiliza a los quinientos pies en la
 * senda y sin pasar de mil pies por minuto, y alto y bajando de más es la
 * primera de las aproximaciones visuales sin estabilizar (FSF ALAR, *Briefing
 * Notes* 7.1 y 7.4). El banco pide ahora en el arco lo mismo que en la final
 * recta: la senda y un metro por segundo, y nunca menos de nueve décimas de
 * mil pies por minuto (`caidaQueSePide` en `verificar-vuelo-entero.mjs`).
 *
 * Se vuela como la final del banco: el JAZ 90 con el modelo completo y el
 * peldaño Taguató, con todo fuera sobre un campo a la cota de Los Rodeos y a
 * la Vref más cinco nudos, el automático del juego bajando por una senda de
 * tres grados que empieza cuarenta y cinco metros por debajo del avión, y el
 * ala que entra a veinticinco grados en cinco segundos, los sostiene y endereza
 * a grado y medio por segundo desde los veinte. Lo que se mira es lo que mira
 * la puerta: la media de cinco segundos de lo que baja, desde cinco segundos
 * después de empezar a enderezar.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { aircraftById } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { autoridadDelTimon, mandosPara, memoriaNueva } from "./piloto-automatico";
import { TAGUATO } from "./tiers";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

const DT = 1 / 60;
const NUDO = 0.514444;
const GRADO = Math.PI / 180;
const SENDA = Math.tan(3 * GRADO);
/** La cota de Los Rodeos, m. */
const COTA = 632;
/** Mil pies por minuto, m/s: el tope de la aproximación estabilizada. */
const MIL_PIES_POR_MINUTO = (1000 * 0.3048) / 60;
/** El alabeo del arco, rad, y cuándo empieza a enderezar, s. */
const ALABEO = 27 * GRADO;
const ENDEREZA_A_LOS = 20;

interface Arco {
  /** Lo más que baja en un instante con el ala inclinada, m/s. */
  readonly picoVirando: number;
  /** La peor media de cinco segundos desde cinco después de enderezar, m/s. */
  readonly peorMedia: number;
}

/**
 * El arco con el tope `tope(gs)` de lo que se pide estando alto, m/s, con la
 * velocidad por el suelo `gs`.
 */
function arco(tope: (gs: number) => number): Arco {
  const a = aircraftById("jaz-90");
  if (!a) throw new Error("no está el JAZ 90");
  const raiz = (y: number): number => Math.sqrt(airDensity(y) / SEA_LEVEL_DENSITY);
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => COTA, assist: TAGUATO.assists });
  const inicio = COTA + a.gearHeight + 320;
  const v0 = (a.approachSpeed + 5 * NUDO) / raiz(inicio);
  m.reset({ position: new Vector3(0, inicio, 0), heading: 0, airspeed: v0, equilibrado: true, flapsDelEquilibrio: 1 });
  const c = neutralControls();
  c.flaps = 1;
  c.tren = 1;
  c.trim = 0;
  c.automatico = true;
  c.throttle = Math.max(0, Math.min(1, m.gasPara(v0)));
  const memoria = memoriaNueva();
  let errorAntes: number | null = null;
  let senda = inicio - 45;
  let alabeoPedido = 0;
  const bajadas: { t: number; baja: number }[] = [];
  let picoVirando = 0;
  let peorMedia = 0;
  for (let i = 0, t = 0; i < 60 * 70; i++, t += DT) {
    const s = m.state;
    const phi = bankAngleOf(s.orientation);
    const gs = Math.hypot(s.velocity.x, s.velocity.z);
    // El ala: entra a cinco grados por segundo, sostiene y endereza.
    const quiere = t < ENDEREZA_A_LOS ? ALABEO : Math.max(0, ALABEO - 1.5 * GRADO * (t - ENDEREZA_A_LOS));
    alabeoPedido += Math.max(-5 * GRADO * DT, Math.min(5 * GRADO * DT, quiere - alabeoPedido));
    c.aileron = Math.max(-1, Math.min(1, 2.2 * (alabeoPedido - phi) - 0.4 * s.rollRate));
    // La senda, y estando alto, el tope: ver `volarLaSenda` del banco.
    const ritmo = -gs * SENDA;
    senda += ritmo * DT;
    const pedida = Math.max(senda, s.position.y + (-tope(gs) - ritmo) * 10);
    const r = mandosPara(
      {
        heading: s.heading,
        alabeo: phi,
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: s.airspeed * raiz(s.position.y),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        ...(i === 0 ? { timon: c.elevator } : {}),
        autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y), s.airspeed),
        subeElAire: 0,
      },
      { rumbo: null, altitud: pedida, ritmo, velocidad: null },
      DT,
      memoria,
    );
    c.elevator = r.elevator;
    // El gas del banco: a la Vref más cinco nudos.
    const quiereV = (a.approachSpeed + 5 * NUDO) / raiz(s.position.y);
    const error = quiereV - s.airspeed;
    c.throttle = Math.max(
      0,
      Math.min(1, c.throttle + (error - (errorAntes ?? error)) * 0.04 + error * 0.01 * DT),
    );
    errorAntes = error;
    bajadas.push({ t, baja: -s.velocity.y });
    while (bajadas.length > 0 && t - (bajadas[0]?.t ?? t) > 5) bajadas.shift();
    if (t > 5 && t < ENDEREZA_A_LOS) picoVirando = Math.max(picoVirando, -s.velocity.y);
    if (t > ENDEREZA_A_LOS + 5)
      peorMedia = Math.max(peorMedia, bajadas.reduce((x, b) => x + b.baja, 0) / bajadas.length);
    m.step(DT, c);
  }
  return { picoVirando, peorMedia };
}

describe("el arco del viraje a final del JAZ 90", () => {
  it("con lo que pide la final recta, endereza sin pasar de mil pies por minuto", () => {
    const r = arco((gs) => Math.max(gs * SENDA + 1, 0.9 * MIL_PIES_POR_MINUTO));
    /*
     * Medido (H29g): 4,70 m/s. Con el tope de antes en el arco, 6,25 m/s
     * pedidos, 6,39: es lo que hacía suspender la puerta en Los Rodeos.
     */
    expect(r.peorMedia, `${r.peorMedia.toFixed(2)} m/s`).toBeLessThan(MIL_PIES_POR_MINUTO);
    const antes = arco(() => 6.25);
    expect(antes.peorMedia, `${antes.peorMedia.toFixed(2)} m/s`).toBeGreaterThan(MIL_PIES_POR_MINUTO);
    /*
     * Lo que no fija esta prueba, y es del automático (ADR 0027, enmienda
     * H29g): aun con 4,57 pedidos, al inclinar el ala el avión llega a bajar
     * 6,05 m/s. El ala inclinada sostiene en vertical el coseno de lo que
     * sostenía, y el lazo del medio solo lo ve cuando lo cuenta el variómetro.
     */
    expect(r.picoVirando).toBeLessThan(antes.picoVirando);
  });
});
