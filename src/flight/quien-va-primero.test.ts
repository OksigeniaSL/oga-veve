/**
 * **Quien está en final va primero** (OACI, Doc 4444, 7.8), cableado en el
 * turno de pista: lo que hace `mirarTuSalida` con cada remedio de
 * `remedioParaTuSalida`, en la final corta y con torre.
 *
 * El banco de mesa de `salida-tapada.test.ts` monta el tráfico entero, y con
 * sus repartos de salidas la final corta con uno en tu salida casi no se da:
 * en El Hierro y Encarnación, 192 llegadas, solo en la calle única de
 * Encarnación, donde irse al aire es lo que toca. Aquí se pone el caso a mano:
 * el dibujo dice quién tapa tu salida, dónde está y si te deja otra, y se mira
 * qué pide la torre.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "./radio";
import { TurnoDePista, type DibujoDelTurno } from "./turno-de-pista";
import { VUELTA_DESDE_EN_FINAL } from "./salida-tapada";
import type { QuienTapaTuSalida } from "../world/trafico";

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** La torre con uno en tu salida, y lo que te pide en la final corta. */
function conUnoEnTuSalida(como: { enLaPista: boolean; teDejaOtra: boolean }) {
  const radio = new Frecuencia(dados(1), "tenerife-norte");
  const matricula = radio.matriculas[0]!;
  const tapa: QuienTapaTuSalida = {
    matricula,
    // No le da tiempo: llegas en sesenta segundos.
    leHace: 150,
    espera: 0,
    ...como,
  };
  const dibujo: DibujoDelTurno = {
    anuncia: () => {},
    paso: () => [],
    todaviaNo: () => false,
    enFinal: () => null,
    tapanTuSalida: () => [tapa],
    enTuSalida: () => [],
    ocupanLaPista: () => (como.enLaPista ? [matricula] : []),
  };
  const pedido = { alAire: [] as string[], vueltas: [] as string[] };
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    alUmbral: () => 4000,
    alto: () => 200,
    enTierra: () => false,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
    mandanFrustrar: () => pedido.alAire.length > 0,
    tuLlegada: () => ({ segundos: VUELTA_DESDE_EN_FINAL - 30, donde: "final", alto: 200 }),
    rumbo: () => 0,
    darteUnaVuelta: (por) => pedido.vueltas.push(por),
    mandarteAlAirePorTuSalida: (_alto, por) => pedido.alAire.push(por),
  });
  for (let i = 0; i < 10; i++) turno.paso("final");
  return { pedido, retenidos: turno.porTuSalida.retenidos, matricula };
}

describe("en la final corta, con uno en tu salida", () => {
  it("todavía fuera de la pista y con otra salida para ti: se le retiene, y aterrizas", () => {
    const r = conUnoEnTuSalida({ enLaPista: false, teDejaOtra: true });
    expect(r.pedido.alAire).toEqual([]);
    expect(r.pedido.vueltas).toEqual([]);
    expect(r.retenidos).toBe(1);
  });

  it("ya en la pista: no tapa tu salida, la ocupa; que se vaya, y lo decide la altura de decisión", () => {
    const r = conUnoEnTuSalida({ enLaPista: true, teDejaOtra: false });
    expect(r.pedido.alAire).toEqual([]);
    expect(r.pedido.vueltas).toEqual([]);
    expect(r.retenidos).toBe(0);
  });

  it("y en tu única salida: retenerle te cerraría el paso, al aire por él", () => {
    const r = conUnoEnTuSalida({ enLaPista: false, teDejaOtra: false });
    expect(r.pedido.alAire).toEqual([r.matricula]);
  });
});
