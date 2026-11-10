/**
 * **La tripulación con el remolque**: de un puesto de contacto se sale empujado, en el
 * orden de un vuelo de verdad. Baliza, empuje, los motores arrancando empujando, freno, y a
 * rodar solo cuando la persona de tierra ha saludado. Sin remolque, como siempre. Ver
 * `world/remolque.ts` y el ADR 0025.
 */
import { describe, expect, it } from "vitest";
import {
  ARRANCA_EMPUJANDO,
  ASIENTAN_LOS_MOTORES,
  BALIZA_ANTES_DE_EMPUJAR,
  motoresYaEnMarcha,
  VueloDeLinea,
  type LecturaDeLinea,
  type PermisosDeLaEscena,
} from "./vuelo-de-linea";

const FICHA = { vr: 70, vref: 68, alturaDeLaRecogida: 9, alturaDelGas: 9, reversa: true, trenQueSeMete: true };
const DT = 0.1;
const TODO: PermisosDeLaEscena = { arrancar: true, rodar: true, entrar: false, despegar: false };

/** Un avión parado en su puesto, con lo que haga falta de la lectura. */
function enElPuesto(remolque: LecturaDeLinea["remolque"], motor: boolean): LecturaDeLinea {
  return {
    enTierra: true,
    enPista: false,
    x: 0,
    z: 0,
    rumbo: 0,
    velocidad: 0,
    porElSuelo: 0,
    altitud: 600,
    altura: 0,
    vertical: 0,
    motor,
    flaps: 0,
    tren: 1,
    fase: motor ? "arrancando" : "estacionado",
    autorizado: false,
    raya: [
      { x: 0, z: 0 },
      { x: 0, z: 50 },
      { x: 200, z: 50 },
    ],
    remolque,
    pista: { rumbo: 0, lado: 0, queda: 3000 },
    tramo: null,
    alturaPedida: 1600,
    ritmoPedido: 0,
    faltaParaTocar: Infinity,
    enLaFinal: false,
    localizador: null,
    senda: null,
    cotaDelCampo: 600,
  };
}

describe("la tripulación con el remolque", () => {
  it("baliza, empuje con los motores arrancando, y a rodar solo tras el saludo", () => {
    const t = new VueloDeLinea(FICHA);
    let remolque = { acabado: false, libre: false };
    let motor = false;
    let empezo: number | null = null;
    let arranco: number | null = null;
    let reloj = 0;
    const paso = (): ReturnType<VueloDeLinea["paso"]> => {
      const m = t.paso(DT, enElPuesto(remolque, motor), TODO);
      reloj += DT;
      if (m.motor) motor = true;
      if (m.empujar && empezo === null) empezo = reloj;
      if (m.motor && arranco === null) arranco = reloj;
      return m;
    };
    // Con las puertas cerradas, a empujar: la baliza ya, sin frenos, y los motores parados.
    let m = paso();
    expect(t.estado.tramo).toBe("empujando");
    expect(m.baliza).toBe(true);
    expect(m.freno).toBe(0);
    expect(m.motor).toBe(false);
    for (let i = 0; i < 300; i++) m = paso();
    // El tractor, con la baliza ya encendida un rato; los motores, empujando.
    expect(empezo).toBeCloseTo(BALIZA_ANTES_DE_EMPUJAR, 0);
    expect(arranco).toBeCloseTo(ARRANCA_EMPUJANDO, 0);
    expect(motoresYaEnMarcha({ tramo: "empujando", enTramo: ARRANCA_EMPUJANDO + 3 }, 3)).toBe(true);
    expect(t.estado.tramo).toBe("empujando");
    // Acaba de empujar: freno de aparcamiento, y quieto hasta que el tractor se va y la persona saluda.
    remolque = { acabado: true, libre: false };
    m = paso();
    expect(t.estado.tramo).toBe("arrancando");
    for (let i = 0; i < (ASIENTAN_LOS_MOTORES + 30) / DT; i++) m = paso();
    expect(t.estado.tramo).toBe("arrancando");
    expect(m.freno).toBe(1);
    expect(m.baliza).toBe(true);
    remolque = { acabado: true, libre: true };
    paso();
    expect(t.estado.tramo).toBe("rodando");
  });

  it("y sin remolque, como siempre: del puesto a arrancar, sin baliza antes ni empuje", () => {
    const t = new VueloDeLinea(FICHA);
    const m = t.paso(DT, enElPuesto(null, false), TODO);
    expect(t.estado.tramo).toBe("arrancando");
    expect(m.empujar).toBeUndefined();
  });
});
