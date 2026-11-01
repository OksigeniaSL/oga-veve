/**
 * El motor del pasaje con un guion que no es el de las islas: que cuenta
 * cualquier guion que se le dé, en su orden y con sus frases, y que no sabe de
 * qué vuelo se trata. Es el hueco del segundo guion, el del vuelo largo de
 * Madrid a Asunción (T1, 1-11-2026). La escena de verdad, con el guion de Los
 * Rodeos a La Palma, la prueba `inicio-pasaje.test.ts`.
 */

import { describe, expect, it } from "vitest";
import type { Linea } from "./conversacion";
import { MotorDelPasaje, type GuionDelPasaje, type LecturaDelPasaje } from "./motor-del-pasaje";
import fuenteDelMotor from "./motor-del-pasaje.ts?raw";

const DT = 1 / 10;

/** Una voz de mentira: cada frase dura un segundo, y se apunta lo que se dijo. */
function vozDeUnSegundo(reloj: () => number) {
  const dichas: string[] = [];
  let sonando: { fin: number; alAcabar: (esperaMas: number) => void } | null = null;
  return {
    dichas,
    voz: {
      decir: (linea: Linea, alAcabar: (esperaMas: number) => void) => {
        dichas.push(linea.clave);
        sonando = { fin: reloj() + 1, alAcabar };
      },
      callar: () => {
        sonando = null;
      },
    },
    tic: () => {
      if (sonando && reloj() >= sonando.fin) {
        const s = sonando;
        sonando = null;
        s.alAcabar(0);
      }
    },
  };
}

/** Lo justo de un vuelo para el motor: en el puesto antes de salir, arriba y nivelado, o ya apagado al llegar. */
function lectura(tramo: "puerta" | "crucero" | "apagado", enNube = 0): LecturaDelPasaje {
  const arriba = tramo === "crucero";
  return {
    tramo,
    enTramo: 10,
    motor: arriba,
    enTierra: !arriba,
    porElSuelo: 0,
    altura: arriba ? 9000 : 0,
    altitud: arriba ? 9000 : 0,
    vertical: 0,
    autorizado: false,
    flaps: 0,
    nubes: null,
    enNube,
    cabina: 0,
    faltaParaTocar: 500000,
  };
}

const ara = (clave: string): Linea => ({ quien: "ara", clave: `juguete.${clave}` });

/**
 * **Un guion de juguete**, lo más corto que se puede contar: un saludo, el
 * «ya estamos arriba» —que es un ancla, y por eso se llama así—, una charla
 * cuando se cruza una nube, la despedida y el final. La charla se cuenta en
 * los huecos de un momento que espera, como en el guion de verdad: la
 * despedida, que espera a los motores apagados. Con Ara a la derecha, que el
 * lado también es del guion.
 */
const DE_JUGUETE: GuionDelPasaje<"saludo" | "arriba" | "adios" | "fin", "nube"> = {
  lado: "derecha",
  momentos: [
    { id: "saludo", cuando: (_l, e) => e.segundos >= 1, lineas: [ara("hola")] },
    { id: "arriba", cuando: (l) => l.tramo === "crucero", lineas: [{ quien: "mama", clave: "juguete.arriba", megafonia: true }] },
    { id: "adios", cuando: (l) => l.tramo === "apagado", lineas: [ara("adios")] },
    { id: "fin", cuando: () => true, lineas: [] },
  ],
  charlas: [{ id: "nube", tras: 2, cuando: (l, e) => e.dicho("arriba") && l.enNube > 0.5, lineas: [ara("nube")] }],
  seSenalaDesde: ["arriba"],
  tripulanteEnElPasillo: () => false,
  siesta: {
    seDuerme: ara("bostezo"),
    seDespierta: ara("despierta"),
    laDespiertan: ara("laDespiertan"),
    puedenEsperar: new Set(),
    trasAlDespertar: {},
    antesDeDormirse: [],
  },
  senalado: { suyas: {}, loVeo: ara("loVeo"), contestaALaHistoria: new Set() },
  sellosAlDecirlo: () => [],
  seQuedanHastaLaSiguiente: new Set(),
  elPlop: [],
  elOficio: [],
  bano: null,
  kit: null,
};

describe("el motor del pasaje, con otro guion", () => {
  it("cuenta un guion de juguete entero, en su orden, y acaba", () => {
    let t = 0;
    const v = vozDeUnSegundo(() => t);
    const escena = new MotorDelPasaje(v.voz, DE_JUGUETE, { pared: () => t });
    const paso = (l: LecturaDelPasaje, segundos: number): void => {
      for (let i = 0; i < segundos / DT; i++) {
        t += DT;
        v.tic();
        escena.paso(DT, l);
      }
    };
    // En el puesto: el saludo, y el «ya estamos arriba» espera a estar arriba.
    paso(lectura("puerta"), 5);
    expect(escena.estado.dichos).toEqual(["saludo"]);
    // Arriba: el ancla, y ya se puede señalar por la ventanilla.
    paso(lectura("crucero"), 5);
    expect(escena.estado.dichos).toEqual(["saludo", "arriba"]);
    expect(escena.puedeSenalar).toBe(true);
    // Una nube: la charla, en su silencio, mientras la despedida espera.
    paso(lectura("crucero", 1), 5);
    expect(escena.estado.charlas).toEqual(["nube"]);
    expect(escena.estado.puedeSeguir).toBe(false);
    // Con los motores apagados, la despedida; y el final, con el botón de seguir.
    paso(lectura("apagado"), 5);
    expect(escena.estado.dichos).toEqual(["saludo", "arriba", "adios"]);
    expect(escena.estado.puedeSeguir).toBe(true);
    escena.seguir();
    paso(lectura("apagado"), 1);
    expect(escena.estado.terminado).toBe(true);
    expect(v.dichas).toEqual(["juguete.hola", "juguete.arriba", "juguete.nube", "juguete.adios"]);
  });

  it("toma del guion el lado de Ara", () => {
    const escena = new MotorDelPasaje(vozDeUnSegundo(() => 0).voz, DE_JUGUETE);
    expect(escena.comoSeVe("mar-abajo", lectura("crucero")).lado).toBe("derecha");
    expect(escena.bajaMiAla(0.2)).toBe(true);
  });

  describe("el salto bajo tapa", () => {
    /** Un crucero tranquilo, con mucho por delante hasta bajar: lo que deja dormirse. */
    const arribaYTranquilo: LecturaDelPasaje = { ...lectura("crucero"), hastaLaBajada: 5 * 3600 };
    /** Un guion que solo espera a la bajada, con su siesta, que salta o no. */
    const conSiesta = (salto?: () => number | null): GuionDelPasaje<"bajada" | "fin", "nube"> => ({
      ...(DE_JUGUETE as unknown as GuionDelPasaje<"bajada" | "fin", "nube">),
      momentos: [
        { id: "bajada", cuando: (l) => l.tramo === "bajada", lineas: [] },
        { id: "fin", cuando: () => true, lineas: [] },
      ],
      charlas: [],
      seSenalaDesde: [],
      siesta: {
        seDuerme: DE_JUGUETE.siesta.seDuerme,
        seDespierta: DE_JUGUETE.siesta.seDespierta,
        laDespiertan: DE_JUGUETE.siesta.laDespiertan,
        puedenEsperar: new Set(),
        trasAlDespertar: {},
        antesDeDormirse: [],
        ...(salto ? { salto } : {}),
      },
    });

    function hastaDormirse(salto?: () => number | null) {
      let t = 0;
      const v = vozDeUnSegundo(() => t);
      const escena = new MotorDelPasaje(v.voz, conSiesta(salto), { pared: () => t });
      const paso = (l: LecturaDelPasaje, segundos: number): void => {
        for (let i = 0; i < segundos / DT; i++) {
          t += DT;
          v.tic();
          escena.paso(DT, l);
        }
      };
      paso(arribaYTranquilo, 60);
      expect(escena.durmiendo).toBe(true);
      return { escena, v, paso };
    }

    it("un vuelo que no lo pide no salta: es el vuelo corto, que corre", () => {
      const { escena } = hastaDormirse();
      expect(escena.saltoPedido).toBeNull();
      const conNull = hastaDormirse(() => null);
      expect(conNull.escena.saltoPedido).toBeNull();
    });

    it("el guion dice adónde; mientras tanto se duerme, aunque el vuelo se acerque a la bajada", () => {
      const { escena, paso } = hastaDormirse(() => 34_000);
      expect(escena.saltoPedido).toBe(34_000);
      // Sin el salto, con esto se despertaría: ver `atenderALaSiesta`.
      paso({ ...arribaYTranquilo, hastaLaBajada: 10 }, 5);
      expect(escena.durmiendo).toBe(true);
    });

    it("hecho el salto, Ara se despierta con su frase, una sola, y no se vuelve a pedir", () => {
      const { escena, v, paso } = hastaDormirse(() => 34_000);
      const antes = v.dichas.length;
      escena.trasElSalto();
      expect(escena.durmiendo).toBe(false);
      expect(escena.saltoPedido).toBeNull();
      expect(escena.estado.siestas.at(-1)?.porQue).toBe("salto");
      paso(arribaYTranquilo, 30);
      expect(v.dichas.slice(antes)).toEqual(["juguete.despierta"]);
    });

    it("los relojes de la escena no ven el salto: lo que se cuenta por tiempo no se dispara", () => {
      const { escena, paso } = hastaDormirse(() => 34_000);
      const reloj = escena.segundos;
      escena.trasElSalto();
      expect(escena.segundos).toBe(reloj);
      paso(arribaYTranquilo, 1);
      expect(escena.segundos).toBeCloseTo(reloj + 1, 5);
    });

    it("sin tapa no se salta: la siesta sigue, corriendo como la de un vuelo corto", () => {
      const { escena } = hastaDormirse(() => 34_000);
      escena.saltoDejado();
      expect(escena.saltoPedido).toBeNull();
      expect(escena.durmiendo).toBe(true);
    });
  });

  it("no sabe de qué vuelo se trata: no importa ningún guion", () => {
    const importaciones = fuenteDelMotor.match(/^import[^;]*;/gm) ?? [];
    expect(importaciones.length).toBeGreaterThan(0);
    for (const i of importaciones) expect(i).not.toMatch(/guion|inicio-pasaje/);
  });
});
