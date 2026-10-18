/**
 * Que la comandante cuente algo en un crucero largo, **poco y a su momento**:
 * según lo que dure el tramo, en su hueco, sin pisar a nadie, y nunca fuera
 * del crucero.
 */
import { describe, expect, it } from "vitest";
import { hayTexto, t, type TranslationKey } from "../i18n";
import { EN } from "../i18n/en";
import { TIEMPO_DE_CASA } from "../world/meteo";
import type { Fase } from "../flight/vuelo";
import { recetaDe, type Manifiesto } from "./banco-de-voz";
import { seLePasoElMomento } from "./megafonia";
import {
  ANTES_DE_BAJAR,
  CURIOSIDADES,
  ENTRE_ANUNCIOS,
  MITADES,
  MomentosDeCrucero,
  PARTE,
  RECUERDOS,
  SALUDOS_A_LOS_CHICOS,
  cuantosSueltos,
  esUnMomentoDeCrucero,
  hayAlgoQueContar,
  loQueCuenta,
  piezaDeCuriosidad,
  piezaDeLaMitad,
  piezaDeLosChicos,
  type EnCrucero,
  type MomentoDeCrucero,
} from "./momentos-de-crucero";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, cod: string): string;
};

/** Un crucero tranquilo, con todo dicho y todo grabado. */
const crucero = (extra: Partial<EnCrucero> = {}): EnCrucero => ({
  fase: "en-vuelo",
  conPasaje: true,
  conTripulacion: true,
  cruceroDicho: true,
  servicioDicho: true,
  bajando: false,
  cartelPuesto: false,
  turbulenciaPorPasar: false,
  enFaseDeTrabajo: false,
  enEmergencia: false,
  hayHueco: true,
  megafoniaHabla: false,
  minutosDelTramo: 45,
  faltan: 40 * 60,
  primero: "curiosidad",
  hay: () => true,
  ...extra,
});

/**
 * **Un vuelo entero de crucero**, segundo a segundo: lo que falta baja con
 * el reloj, desde lo que falta al acabar el servicio hasta el descenso. Lo
 * que se cuenta habla unos quince segundos —la megafonía suena— y devuelve
 * cuándo y qué.
 */
function volar(
  minutos: number,
  extra: Partial<EnCrucero> = {},
  desdeFaltan = minutos * 60 - 8 * 60,
  hastaFaltan = 10 * 60,
): { que: MomentoDeCrucero; faltan: number }[] {
  const m = new MomentosDeCrucero();
  const dichos: { que: MomentoDeCrucero; faltan: number }[] = [];
  let hablando = 0;
  for (let faltan = desdeFaltan; faltan > hastaFaltan; faltan -= 1) {
    hablando = Math.max(0, hablando - 1);
    const que = m.paso(1, crucero({ minutosDelTramo: minutos, faltan, megafoniaHabla: hablando > 0, ...extra }));
    if (que) {
      dichos.push({ que, faltan });
      hablando = 15;
    }
  }
  return dichos;
}

describe("cuánto cuenta, según lo que dura el tramo", () => {
  it("en un salto de veinte minutos, nada más que el guion", () => {
    expect(cuantosSueltos(20)).toBe(0);
    expect(volar(20, {}, 15 * 60, 0)).toEqual([]);
  });

  it("en uno de media hora, una sola cosa y sin el punto del vuelo", () => {
    const dichos = volar(30, {}, 25 * 60, 8 * 60);
    expect(dichos.map((d) => d.que)).toEqual(["curiosidad"]);
  });

  it("desde los cuarenta minutos, además el punto del vuelo, a mitad de camino", () => {
    const dichos = volar(45);
    expect(dichos.map((d) => d.que)).toEqual(["curiosidad", "mitad"]);
    const mitad = dichos.find((d) => d.que === "mitad")!;
    expect(mitad.faltan).toBeLessThanOrEqual(45 * 30);
    expect(mitad.faltan).toBeGreaterThan(45 * 60 * 0.35);
  });

  it("y desde la hora, las tres: una al principio, la mitad en su sitio y otra después", () => {
    const dichos = volar(75);
    expect(dichos.map((d) => d.que)).toEqual(["curiosidad", "mitad", "chicos"]);
  });

  it("y fuera del plan, sin saber lo que falta, los dos sueltos y sin la mitad", () => {
    const m = new MomentosDeCrucero();
    const dichos: string[] = [];
    let hablando = 0;
    for (let s = 0; s < 20 * 60; s++) {
      hablando = Math.max(0, hablando - 1);
      const que = m.paso(1, crucero({ minutosDelTramo: 75, faltan: null, megafoniaHabla: hablando > 0 }));
      if (que) {
        dichos.push(que);
        hablando = 15;
      }
    }
    expect(dichos).toEqual(["curiosidad", "chicos"]);
  });

  it("repartidas: entre una y otra, minuto y medio largo de megafonía callada", () => {
    const dichos = volar(75);
    for (let i = 1; i < dichos.length; i++)
      expect(dichos[i - 1]!.faltan - dichos[i]!.faltan).toBeGreaterThanOrEqual(
        ENTRE_ANUNCIOS,
      );
  });

  it("y el primero es el que no se contó la última vez", () => {
    expect(volar(30, { primero: "chicos" }, 25 * 60, 8 * 60).map((d) => d.que)).toEqual([
      "chicos",
    ]);
  });
});

describe("nada fuera de tiempo", () => {
  /** Lo que se dice en diez minutos de crucero con esto cambiado. */
  const enDiezMinutos = (extra: Partial<EnCrucero>): MomentoDeCrucero[] =>
    volar(75, extra, 60 * 60, 50 * 60).map((d) => d.que);

  it("con todo en orden, en diez minutos de crucero sí cuenta algo", () => {
    expect(enDiezMinutos({})).not.toEqual([]);
  });

  it.each<[string, Partial<EnCrucero>]>([
    ["antes del anuncio de crucero", { cruceroDicho: false }],
    ["antes del servicio, donde hay tripulación", { servicioDicho: false }],
    ["bajando ya hacia el destino", { bajando: true }],
    ["con una turbulencia anunciada por delante", { turbulenciaPorPasar: true }],
    ["en la cabina estéril", { enFaseDeTrabajo: true }],
    ["en una emergencia", { enEmergencia: true }],
    ["sin hueco", { hayHueco: false }],
    ["con la megafonía hablando o esperando turno", { megafoniaHabla: true }],
    ["en una avioneta, que no tiene a quién hablarle", { conPasaje: false }],
    ["sin nada grabado", { hay: () => false }],
  ])("%s, nada", (_, extra) => {
    expect(enDiezMinutos(extra)).toEqual([]);
  });

  it.each<Fase>(["rodando", "despegando", "final", "aterrizado", "a-plataforma"])(
    "y fuera del crucero —%s—, nada",
    (fase) => {
      expect(enDiezMinutos({ fase })).toEqual([]);
    },
  );

  it("sin tripulación no se espera al servicio, que no hay", () => {
    expect(enDiezMinutos({ conTripulacion: false, servicioDicho: false })).not.toEqual([]);
  });

  it("con el cartel puesto, los sueltos esperan; la mitad del camino, no", () => {
    const dichos = volar(45, { cartelPuesto: true });
    expect(dichos.map((d) => d.que)).toEqual(["mitad"]);
  });

  it("con la bajada a menos de ocho minutos ya no se empieza nada", () => {
    expect(volar(75, {}, ANTES_DE_BAJAR - 1, 0)).toEqual([]);
  });

  it("y si a la mitad del camino se le pasó el momento, ya no se dice", () => {
    // Todo el rato de la mitad sin hueco: cuando vuelve, queda menos de un tercio.
    const m = new MomentosDeCrucero();
    const dichos: string[] = [];
    for (let faltan = 45 * 30; faltan > 10 * 60; faltan -= 1) {
      const sinHueco = faltan > 45 * 60 * 0.3;
      const que = m.paso(1, crucero({ faltan, hayHueco: !sinHueco, hay: (x) => x === "mitad" }));
      if (que) dichos.push(que);
    }
    expect(dichos).toEqual([]);
  });

  it("cada cosa, una vez por vuelo; y el vuelo siguiente la vuelve a dejar", () => {
    const m = new MomentosDeCrucero();
    const dichos: string[] = [];
    for (let faltan = 70 * 60; faltan > 9 * 60; faltan -= 1) {
      const que = m.paso(1, crucero({ minutosDelTramo: 75, faltan }));
      if (que) dichos.push(que);
    }
    expect(new Set(dichos).size).toBe(dichos.length);
    m.reiniciar();
    let otra: string | null = null;
    for (let s = 0; s < 200 && !otra; s++) otra = m.paso(1, crucero({ minutosDelTramo: 75, faltan: 70 * 60 }));
    expect(otra).not.toBeNull();
  });

  it("lo que espera turno se retira al salir del crucero, y al empezar a bajar lo reconoce el juego", () => {
    for (const clave of ["comandante.mitad", "comandante.chicos.primeraVez", "comandante.curiosidad.alas"]) {
      expect(esUnMomentoDeCrucero(clave)).toBe(true);
      expect(seLePasoElMomento(clave, "en-vuelo")).toBe(false);
      expect(seLePasoElMomento(clave, "final")).toBe(true);
    }
    expect(esUnMomentoDeCrucero("comandante.crucero")).toBe(false);
    expect(esUnMomentoDeCrucero("comandante.descenso")).toBe(false);
  });
});

describe("lo que cuenta, y nunca lo mismo seguido", () => {
  const todo = (): boolean => true;

  it("la curiosidad y el saludo, enteros y nunca el de la última vez", () => {
    for (const [m, nombres, pieza] of [
      ["curiosidad", CURIOSIDADES, piezaDeCuriosidad],
      ["chicos", SALUDOS_A_LOS_CHICOS, piezaDeLosChicos],
    ] as const)
      for (const ultima of nombres)
        for (let i = 0; i < 20; i++) {
          const d = loQueCuenta(m, {
            grabada: todo,
            ultima: (llave) => (llave === RECUERDOS[m] ? ultima : null),
            faltan: null,
            alla: null,
            azar: () => (i * 0.37) % 1,
          })!;
          expect(d.recuerdo).toEqual({ llave: RECUERDOS[m], valor: d.recuerdo.valor });
          expect(d.recuerdo.valor).not.toBe(ultima);
          expect(d.clave).toBe(pieza(d.recuerdo.valor));
          expect(d.texto).toBe(t(d.clave as TranslationKey));
        }
  });

  it("y sin nombres de nadie: a quien le toque", () => {
    for (const n of SALUDOS_A_LOS_CHICOS) {
      const texto = t(piezaDeLosChicos(n) as TranslationKey);
      expect(texto).toMatch(/comandante/);
      expect(texto).not.toMatch(/Jazlyn|Ara\b/);
    }
  });

  it("la mitad del camino, con lo que falta y el último parte de allá", () => {
    const d = loQueCuenta("mitad", {
      grabada: todo,
      ultima: () => "camino",
      faltan: 21 * 60,
      alla: { ...TIEMPO_DE_CASA, temp: 31, lluvia: "lluvia" },
      azar: () => 0,
    })!;
    expect(d.clave).toBe("comandante.mitad");
    expect(d.recuerdo.valor).toBe("viaje");
    expect(d.relleno).toEqual({
      mitad: "comandante.mitad.viaje",
      minutos: "comandante.minutos.20",
      parte: PARTE,
      cielo: "comandante.cielo.lluvia",
      temperatura: "comandante.temperatura.31",
    });
    expect(d.texto).toMatch(/mitad del viaje\. Vamos a aterrizar en unos 20 minutos\./);
    expect(d.texto).toMatch(/último parte.*Allá está lloviendo\. La temperatura es de 31 grados\./);
  });

  it("y sin el parte grabado, la mitad sin el tiempo, que lo demás ya suena", () => {
    const d = loQueCuenta("mitad", {
      grabada: (id) => id !== PARTE,
      ultima: () => null,
      faltan: 30 * 60,
      alla: TIEMPO_DE_CASA,
      azar: () => 0,
    })!;
    expect(Object.keys(d.relleno)).toEqual(["mitad", "minutos"]);
  });

  it("lo que no tiene nada grabado no se cuenta", () => {
    const hoy = JSON.parse(
      fs.readFileSync("data/voces/comandante/manifiesto.json", "utf8"),
    ) as Manifiesto;
    // El pack sin lo nuevo, que es el de hoy: así vale igual el día que se grabe.
    const sinLoNuevo = (id: string): boolean =>
      !/^comandante\.(?:mitad|chicos|curiosidad)\./.test(id) && !!hoy.recetas[id];
    for (const m of ["curiosidad", "chicos", "mitad"] as const) {
      expect(hayAlgoQueContar(m, sinLoNuevo)).toBe(false);
      expect(
        loQueCuenta(m, { grabada: sinLoNuevo, ultima: () => null, faltan: 600, alla: null }),
      ).toBeNull();
    }
    /*
     * Y la receta de la mitad ya está en el pack, esperando sus piezas: se
     * monta el día que estén, y no antes.
     */
    expect(hoy.recetas["comandante.mitad"]).toBeTruthy();
    const monta = recetaDe(hoy, "comandante.mitad", {
      mitad: piezaDeLaMitad("camino"),
      minutos: "comandante.minutos.20",
      parte: PARTE,
      cielo: "comandante.cielo.nubes",
      temperatura: "comandante.temperatura.22",
    });
    expect(monta === null).toBe(!hoy.piezas[piezaDeLaMitad("camino")] || !hoy.piezas[PARTE]);
    // Y con sus piezas puestas, lo que monta `loQueCuenta` se monta entero.
    const conTodo: Manifiesto = {
      ...hoy,
      piezas: { ...hoy.piezas, [piezaDeLaMitad("viaje")]: { ms: 1000 }, [PARTE]: { ms: 1000 } },
    };
    const d = loQueCuenta("mitad", {
      grabada: () => true,
      ultima: () => "camino",
      faltan: 25 * 60,
      alla: TIEMPO_DE_CASA,
    })!;
    expect(recetaDe(conTodo, d.clave, d.relleno)).toHaveLength(5);
  });

  it("y cada frase existe, en castellano y en inglés", () => {
    const todas = [
      ...CURIOSIDADES.map(piezaDeCuriosidad),
      ...SALUDOS_A_LOS_CHICOS.map(piezaDeLosChicos),
      ...MITADES.map(piezaDeLaMitad),
      PARTE,
    ];
    for (const id of todas) {
      expect(hayTexto(id), id).toBe(true);
      expect(EN[id as TranslationKey], id).toBeTruthy();
    }
  });
});
