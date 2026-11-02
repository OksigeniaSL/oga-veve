/**
 * El esqueleto del segundo capítulo: la entrada, las cifras de las islas y los pasos
 * del guion, con frases que ya están grabadas. El vuelo de verdad lo vuela
 * `scripts/verificar-inicio-4.mjs`, con `OGA_CAPITULO=2`.
 */

import { describe, expect, it } from "vitest";
import ARA from "../../data/voces/ara/manifiesto.json";
import TRIPULANTE from "../../data/voces/tripulacion-canarias/manifiesto.json";
import { dondeCae } from "../world/entre-aerodromos";
import type { Linea } from "./conversacion";
import { GUION_NOCHE_SOBRE_EL_MAR, ISLAS_DE_LA_NOCHE } from "./guion-noche-sobre-el-mar";
import { GUION_LLEGADA_A_ASUNCION } from "./guion-llegada-a-asuncion";
import { MotorDelPasaje, type DelVueloLargo, type LecturaDelPasaje } from "./motor-del-pasaje";
import {
  cuandoPasa,
  DE_MADRID_A_ASUNCION,
  dondeVa,
  entradaDeLaLlegada,
  entradaDeLaNoche,
  ENTRA_LA_NOCHE_ANTES,
  horarioDelDia,
  NIVELES_DE_CRUCERO,
  PASA_EL_HIERRO,
  perfilDelVuelo,
  respectoALaRuta,
  SITIOS_DEL_CAMINO,
  solEnElVuelo,
} from "./ruta-larga";
import { destinoDelSalto, mundoDelTramo } from "./salto-bajo-tapa";
import { VECINOS_A_LA_VEZ } from "../world/vecinos-del-vuelo";

const DT = 1 / 10;
const VERANO = perfilDelVuelo(horarioDelDia(new Date("2026-07-15T12:00:00Z")));
const INVIERNO = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
/** Dieciocho veces sus dieciocho kilómetros, y la mitad: ver `TENERIFE_NORTE`. */
const EL_MUNDO_LLEGA_A = 162_000;

describe("las islas, respecto a la ruta", () => {
  it("El Hierro, debajo; Tenerife, a 73 km a la izquierda; La Palma, a 43 km a la derecha", () => {
    const { valverde, tenerife, laPalma } = SITIOS_DEL_CAMINO;
    expect(respectoALaRuta(DE_MADRID_A_ASUNCION, valverde).lado / 1000).toBeCloseTo(-2.2, 1);
    expect(respectoALaRuta(DE_MADRID_A_ASUNCION, tenerife).lado / 1000).toBeCloseTo(-72.9, 1);
    expect(respectoALaRuta(DE_MADRID_A_ASUNCION, laPalma).lado / 1000).toBeCloseTo(43.4, 1);
  });

  it("y se pasa por encima a las 2 h 24 del despegue, en verano y en invierno", () => {
    expect(cuandoPasa(VERANO, PASA_EL_HIERRO) / 3600).toBeCloseTo(2.4, 1);
    expect(cuandoPasa(INVIERNO, PASA_EL_HIERRO) / 3600).toBeCloseTo(2.4, 1);
  });
});

describe("la entrada", () => {
  it("cae hacia las 2 h 05, en crucero, al primer nivel y antes de pasar nada", () => {
    for (const p of [VERANO, INVIERNO]) {
      const t = entradaDeLaNoche(p);
      const d = dondeVa(p, t);
      expect(t / 3600).toBeGreaterThan(2);
      expect(t / 3600).toBeLessThan(2.15);
      expect(d.fase).toBe("crucero");
      expect(d.altitud).toBe(NIVELES_DE_CRUCERO[0]);
      expect(d.recorrido).toBeCloseTo(PASA_EL_HIERRO - ENTRA_LA_NOCHE_ANTES, -1);
      expect(respectoALaRuta(p.ruta, SITIOS_DEL_CAMINO.tenerife).recorrido).toBeGreaterThan(d.recorrido);
    }
  });

  it("dentro del mundo de Tenerife Norte, y de noche también en verano", () => {
    for (const p of [VERANO, INVIERNO]) {
      const { x, z } = dondeCae(SITIOS_DEL_CAMINO.tenerife, dondeVa(p, entradaDeLaNoche(p)).sitio);
      expect(Math.abs(x)).toBeLessThan(EL_MUNDO_LLEGA_A);
      expect(Math.abs(z)).toBeLessThan(EL_MUNDO_LLEGA_A);
      expect(solEnElVuelo(p, entradaDeLaNoche(p)).deNoche).toBe(true);
    }
  });

  it("las islas de abajo no pasan del tope de vecinos medido", () => {
    expect(ISLAS_DE_LA_NOCHE.length).toBeLessThanOrEqual(VECINOS_A_LA_VEZ);
  });
});

describe("el salto de la noche", () => {
  it("cae en el mismo sitio y a la misma hora que abre el tercer capítulo: un punto y un mundo, no dos", () => {
    for (const p of [VERANO, INVIERNO]) {
      const hasta = destinoDelSalto(p, cuandoPasa(p, PASA_EL_HIERRO + 40_000), entradaDeLaLlegada(p));
      expect(hasta).toBe(entradaDeLaLlegada(p));
      const mundos = [
        { id: "tenerife-norte", origen: SITIOS_DEL_CAMINO.tenerife },
        { id: "pettirossi", origen: p.ruta.hasta },
      ];
      expect(mundoDelTramo(mundos, dondeVa(p, hasta!).sitio)?.id).toBe("pettirossi");
    }
  });
});

describe("el guion", () => {
  const VOCES = new Set([...Object.keys(ARA.piezas), ...Object.keys(TRIPULANTE.piezas)]);
  const lasFrases = (): readonly Linea[] => GUION_NOCHE_SOBRE_EL_MAR.momentos.flatMap((m) => m.lineas);

  it("no trae frases nuevas: todas, ya grabadas", () => {
    const frases = [...lasFrases(), GUION_NOCHE_SOBRE_EL_MAR.siesta.seDuerme];
    expect(frases.length).toBeGreaterThan(0);
    for (const f of frases) expect(VOCES.has(f.clave), f.clave).toBe(true);
  });

  it("las láminas del capítulo que sigue, ya bajadas antes de caer en ellas", () => {
    expect(GUION_NOCHE_SOBRE_EL_MAR.apertura?.laminas).toEqual(GUION_LLEGADA_A_ASUNCION.apertura?.laminas);
  });

  /** Vuela lo que dura el capítulo con una voz de un segundo por frase, hasta que Ara se duerma. */
  function hastaDormirse(): { readonly escena: MotorDelPasaje; readonly orden: readonly string[]; readonly planos: readonly string[] } {
    let t = 0;
    const dichas: string[] = [];
    let acaba: { fin: number; alAcabar: (esperaMas: number) => void } | null = null;
    const voz = {
      decir: (linea: Linea, alAcabar: (esperaMas: number) => void) => {
        dichas.push(linea.clave);
        acaba = { fin: t + 1, alAcabar };
      },
      callar: () => {
        acaba = null;
      },
    };
    const escena = new MotorDelPasaje(voz, GUION_NOCHE_SOBRE_EL_MAR, { pared: () => t }) as unknown as MotorDelPasaje;
    const delVuelo: Omit<DelVueloLargo, "recorrido"> = {
      temporada: "invierno",
      conSolAlDesayunar: true,
      sol: -80,
      solPorMiVentanilla: false,
      entraLaLlegada: entradaDeLaLlegada(INVIERNO),
      anuncioDeLaBajada: () => ({ clave: "", texto: "", relleno: {} }),
    };
    const planos: string[] = [];
    const orden: string[] = [];
    for (let recorrido = PASA_EL_HIERRO - ENTRA_LA_NOCHE_ANTES; t < 1800 && !escena.durmiendo; recorrido += 231 * DT) {
      t += DT;
      if (acaba && t >= (acaba as { fin: number }).fin) {
        const a = acaba as { alAcabar: (esperaMas: number) => void };
        acaba = null;
        a.alAcabar(0);
      }
      const l: LecturaDelPasaje = {
        tramo: "crucero",
        enTramo: 60,
        motor: true,
        enTierra: false,
        porElSuelo: 231,
        altura: 10_972,
        altitud: 10_972,
        vertical: 0,
        autorizado: false,
        flaps: 0,
        nubes: null,
        enNube: 0,
        cabina: 0,
        faltaParaTocar: 8_000_000,
        hastaLaBajada: 30_000,
        largo: { ...delVuelo, recorrido },
      };
      escena.paso(DT, l);
      const e = escena.estado;
      if (planos.at(-1) !== e.plano) planos.push(e.plano);
      for (const m of e.dichos) if (!orden.includes(m)) orden.push(m);
    }
    return { escena, orden, planos };
  }

  it("arranca tapado, se abre la ventanilla, pasa Tenerife, se asoma a El Hierro y baja las luces", () => {
    const { orden, planos } = hastaDormirse();
    expect(orden).toEqual(["cena", "ventanilla", "tenerife", "hierro", "luces"]);
    expect(planos).toContain("asomado-abajo");
  });

  it("y se duerme, pidiendo saltar a la hora del despertar", () => {
    const { escena } = hastaDormirse();
    expect(escena.durmiendo).toBe(true);
    expect(escena.saltoPedido).toBe(entradaDeLaLlegada(INVIERNO));
    expect(escena.sigueOtroCapitulo).toBe(true);
  });

  it("del salto no se despierta con la frase de aquí, que abre el capítulo que sigue", () => {
    const { escena } = hastaDormirse();
    const antes = escena.registro.length;
    escena.trasElSalto();
    expect(escena.durmiendo).toBe(false);
    expect(escena.estado.linea?.clave).not.toBe(GUION_NOCHE_SOBRE_EL_MAR.siesta.seDespierta.clave);
    expect(escena.registro.length).toBe(antes);
  });
});
