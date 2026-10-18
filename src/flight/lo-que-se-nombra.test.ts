/**
 * **Lo que nombra la instructora: solo si se ve, señalado y diciendo dónde.**
 *
 * Las tres quejas que lo trajeron —el arco verde que no estaba en el mapa
 * (263), el rombo que no se sabía cuál era (272) y las «dos blancas y dos
 * rojas» de un PAPI que no salía en la pantalla (273)— son la misma regla
 * rota tres veces. Aquí se comprueba la regla, no cada frase:
 *
 * - no se nombra lo que no se ve, y la tabla cubre el diccionario entero;
 * - si no se ve, se dice la alternativa, que no nombra nada;
 * - lo nombrado se señala;
 * - y el PAPI, solo a su distancia y en la vista.
 */

import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { ES_PY } from "../i18n/es-PY";
import { t, type TranslationKey } from "../i18n";
import {
  A_LOS_LADOS,
  DURA_EL_SENALADO,
  LoSenalado,
  NOMBRA,
  PAPI_SE_DISTINGUE_PX,
  PAPI_SE_VE_DESDE,
  PIEZAS,
  SIN_VER,
  conSuSinVer,
  laQueSePuedeDecir,
  latido,
  nombraLoQueNoSeVe,
  piezasDe,
  seDistingueElPapi,
  type PapiVisto,
  type Pieza,
} from "./lo-que-se-nombra";
import { fraseDe, type Accion, type Motivo, type Objetivo } from "./consejo-de-la-bajada";
import { comoSeDice, type ComoVa, type Paso } from "./siguiente-paso";
import { VARIANTES } from "../audio/variantes";

const NADA_SE_VE = (): boolean => false;
const TODO_SE_VE = (): boolean => true;
const soloSeVe =
  (...que: Pieza[]) =>
  (p: Pieza): boolean =>
    que.includes(p);

/** El texto de una forma grabada: la del diccionario, o una de sus variantes. */
function textoDe(clave: string, forma: number): string {
  if (forma === 0) return t(clave as TranslationKey);
  return VARIANTES[clave as TranslationKey]?.[forma - 1] ?? "";
}

/**
 * **Las palabras que nombran una pieza de la pantalla o de fuera.** Si una
 * frase de las que se dicen en vuelo las lleva, tiene que estar en `NOMBRA`.
 */
const NOMBRA_ALGO =
  /rombo|marca rosa|marca del motor|dos blancas|cuatro luces|raya de la|ventanilla de la altura|la cinta|variómetro|altímetro|la carta|el mapa|del mapa|la pantalla/i;

/** Lo que dice la instructora en vuelo: los grupos que se graban con su voz. */
const EN_VUELO = /^(vuelo|tutor|circuito|motivo|explica\.[^.]+\.presenta|ejercicio|mission)\b/;

/**
 * **Las que nombran algo y no pasan por la tabla, con su porqué.** Cada una
 * tiene que tener aquí su razón: es la lista de lo que se decidió no tocar.
 */
const FUERA_DE_LA_TABLA: Readonly<Record<string, string>> = {
  // Las presentaciones ya solo se dicen con su pieza a la vista: `presentarLoNuevo`.
  "explica.arco.presenta": "se presenta con el arco a la vista (263)",
  "explica.td.presenta": "se presenta con el círculo a la vista",
  "explica.tc.presenta": "se presenta con el círculo a la vista",
  "explica.gs-rodaje.presenta": "se presenta con la barra a la vista",
  // El rótulo de la tarjeta del PAPI: nombra las luces dibujadas en ella.
  "vuelo.papiAlto": "rótulo de la tarjeta que dibuja las cuatro luces",
  "vuelo.papiBajo": "rótulo de la tarjeta que dibuja las cuatro luces",
  "vuelo.papiBien": "rótulo de la tarjeta que dibuja las cuatro luces",
};

describe("no se nombra lo que no se ve", () => {
  it("toda frase de vuelo que nombra una pieza está en la tabla, o tiene su porqué", () => {
    const sueltas: string[] = [];
    for (const [clave, texto] of Object.entries(ES_PY)) {
      if (!EN_VUELO.test(clave) || typeof texto !== "string") continue;
      if (!NOMBRA_ALGO.test(texto)) continue;
      if (NOMBRA[clave] || FUERA_DE_LA_TABLA[clave]) continue;
      sueltas.push(`${clave}: ${texto}`);
    }
    expect(sueltas).toEqual([]);
  });

  it("y la tabla no apunta a frases que no existen", () => {
    for (const clave of [...Object.keys(NOMBRA), ...Object.values(SIN_VER)])
      expect(clave in ES_PY, clave).toBe(true);
    for (const piezas of Object.values(NOMBRA))
      for (const p of piezas) expect(PIEZAS).toContain(p);
  });

  it("una frase que nombra algo no se puede decir sin eso a la vista", () => {
    for (const [clave, piezas] of Object.entries(NOMBRA)) {
      expect(nombraLoQueNoSeVe(clave, NADA_SE_VE), clave).toBe(true);
      expect(nombraLoQueNoSeVe(clave, TODO_SE_VE), clave).toBe(false);
      // Con una sola de las que nombra fuera de la vista, tampoco.
      for (const falta of piezas)
        expect(
          nombraLoQueNoSeVe(clave, (p) => p !== falta),
          `${clave} sin ${falta}`,
        ).toBe(true);
    }
    // Y lo que no nombra nada se dice siempre.
    expect(nombraLoQueNoSeVe("vuelo.rodando", NADA_SE_VE)).toBe(false);
    expect(nombraLoQueNoSeVe(undefined, NADA_SE_VE)).toBe(false);
  });

  it("la marca, la raya y el rombo dicen dónde están", () => {
    for (const [clave, piezas] of Object.entries(NOMBRA)) {
      const texto = t(clave as TranslationKey);
      if (piezas.includes("rombo")) expect(texto, clave).toMatch(/rombo rosa.*al lado de la altura/);
      if (piezas.includes("papi")) expect(texto, clave).toMatch(/cuatro luces de al lado de la pista/);
      if (piezas.includes("trafico")) expect(texto, clave).toMatch(/rombo del mapa/);
      // «La marca rosa» sola no dice cuál: hay cuatro cosas rosas en la pantalla.
      if (piezas.includes("marca")) expect(texto, clave).toMatch(/marca rosa de la velocidad|velocidad de la marca rosa|velocidad (siga )?en la marca rosa|velocidad la llevás vos, hasta la marca rosa/);
      if (piezas.includes("raya")) expect(texto, clave).toMatch(/de la altura/);
    }
  });
});

describe("si no se ve, se dice la alternativa", () => {
  it("cada `.sinVer` no nombra lo que nombraba la suya", () => {
    for (const [con, sin] of Object.entries(SIN_VER)) {
      const antes = piezasDe(con);
      const despues = piezasDe(sin);
      expect(despues.length, sin).toBeLessThan(antes.length);
      for (const p of despues) expect(antes, sin).toContain(p);
      if (!despues.length) expect(t(sin as TranslationKey), sin).not.toMatch(NOMBRA_ALGO);
    }
  });

  it("la que nombra el objetivo, si se ve; si no, la misma sin él", () => {
    expect(laQueSePuedeDecir(conSuSinVer("vuelo.paso.acelerarGas"), TODO_SE_VE)).toBe(
      "vuelo.paso.acelerarGas",
    );
    expect(laQueSePuedeDecir(conSuSinVer("vuelo.paso.acelerarGas"), NADA_SE_VE)).toBe(
      "vuelo.paso.acelerarGas.sinVer",
    );
    // La del crucero, sin la marca rosa pero con la del motor: la del motor.
    expect(
      laQueSePuedeDecir(conSuSinVer("vuelo.paso.crucero"), soloSeVe("motor")),
    ).toBe("vuelo.paso.crucero.sinVer");
    // Y sin ninguna que sirva, ninguna: se ve en la tarjeta y la voz calla.
    expect(laQueSePuedeDecir(conSuSinVer("vuelo.paso.cotaEnAlto"), NADA_SE_VE)).toBeNull();
    expect(laQueSePuedeDecir(conSuSinVer("vuelo.paso.frenarGas", ["tutor.slow"]), NADA_SE_VE)).toBe(
      "tutor.slow",
    );
  });

  const ACCIONES: readonly Accion[] = ["masGas", "menosGas", "frenar", "narizArriba", "narizAbajo", "nivelar"];
  const MOTIVOS: readonly Motivo[] = ["lento", "rapido", "alto", "bajo", "hundiendose"];

  it("los consejos sin nada a la vista no nombran nada, y siguen pidiendo un mando", () => {
    for (const accion of ACCIONES)
      for (const motivo of MOTIVOS)
        for (const frena of ["flaps", "aerofrenos"] as const)
          for (const modo of ["bajada", "final"] as const) {
            const f = fraseDe({ accion, motivo }, "nada", frena, modo);
            const donde = `${accion}/${motivo}/${frena}/${modo}`;
            if (f.nueva) {
              expect(piezasDe(f.nueva), `${donde}: ${f.nueva}`).toEqual([]);
              expect(t(f.nueva as TranslationKey), donde).not.toMatch(NOMBRA_ALGO);
            }
            for (const g of f.grabadas) {
              expect(piezasDe(g.clave), `${donde}: ${g.clave}`).toEqual([]);
              expect(textoDe(g.clave, g.forma), `${donde}: ${g.clave}~${g.forma}`).not.toMatch(
                NOMBRA_ALGO,
              );
            }
          }
  });

  it("y con su pieza a la vista, la nombran: las luces, el rombo o la marca", () => {
    const con = (accion: Accion, motivo: Motivo, objetivo: Objetivo, modo: "bajada" | "final" = "final") =>
      fraseDe({ accion, motivo }, objetivo, "flaps", modo).nueva;
    expect(piezasDe(con("narizArriba", "bajo", "papi"))).toEqual(["papi"]);
    expect(piezasDe(con("narizArriba", "bajo", "senda"))).toEqual(["rombo"]);
    expect(piezasDe(con("narizAbajo", "alto", "senda", "bajada"))).toEqual(["rombo"]);
    expect(piezasDe(con("nivelar", "bajo", "senda", "bajada"))).toEqual(["rombo"]);
    expect(piezasDe(con("masGas", "lento", "marca"))).toEqual(["marca"]);
    expect(piezasDe(con("narizAbajo", "lento", "marca"))).toEqual(["marca"]);
    // La del 273, sin las luces a la vista: el rombo, que sí se ve.
    expect(t(con("narizArriba", "bajo", "senda") as TranslationKey)).toMatch(/rombo rosa/);
    expect(con("narizArriba", "bajo", "nada")).toBeNull();
  });

  it("los pasos sin nada a la vista: o una que no nombra nada, o la voz calla", () => {
    const como = (cambios: Partial<ComoVa> = {}): ComoVa => ({
      gasDelAutomatico: false,
      alturaDelAutomatico: false,
      velocidadConElMorro: false,
      quedaGas: true,
      aerofrenos: false,
      conTorre: false,
      gasHacia: null,
      gasDeLaFinal: null,
      ...cambios,
    });
    const TODOS: readonly Paso["que"][] = [
      "subir", "acelerar", "frenar", "mantener", "crucero", "bajar", "nivelar",
      "flaps", "tren", "recogerAerofrenos", "senda", "cota",
    ];
    let conVoz = 0;
    for (const que of TODOS)
      for (const c of [
        como(),
        como({ gasDelAutomatico: true, gasDeLaFinal: "gases" }),
        como({ quedaGas: false, aerofrenos: true, gasDeLaFinal: "ayuda" }),
        como({ alturaDelAutomatico: true, gasHacia: "menos" }),
        como({ velocidadConElMorro: true, ofreceAutomatico: true }),
      ])
        for (const pies of [null, 30, 2000]) {
          const f = comoSeDice({ escalon: que, que, objetivo: { kt: 200, pies, muesca: 2 } }, c);
          const dicha = laQueSePuedeDecir(conSuSinVer(f.nueva, [f.grabada]), NADA_SE_VE);
          if (dicha === null) continue;
          conVoz++;
          expect(piezasDe(dicha), `${que}: ${dicha}`).toEqual([]);
          expect(t(dicha as TranslationKey), `${que}: ${dicha}`).not.toMatch(NOMBRA_ALGO);
        }
    // Casi todos tienen con qué decirse: callan solo los que no son más que la pieza.
    expect(conVoz).toBeGreaterThan(100);
  });
});

describe("lo nombrado se señala", () => {
  it("late lo que dura una frase, y vuelve a empezar si se nombra otra vez", () => {
    const s = new LoSenalado();
    expect(s.vivo("rombo")).toBe(false);
    s.senalar("rombo");
    expect(s.vivo("rombo")).toBe(true);
    s.paso(DURA_EL_SENALADO - 1);
    s.senalar("rombo");
    s.paso(DURA_EL_SENALADO - 1);
    expect(s.vivo("rombo")).toBe(true);
    expect(s.edades.rombo).toBeCloseTo(DURA_EL_SENALADO - 1);
    s.paso(1.01);
    expect(s.vivo("rombo")).toBe(false);
    s.senalar("papi");
    s.olvidar();
    expect(s.edades).toEqual({});
  });

  it("en la pantalla de la cabina late, y quieto con el movimiento reducido", () => {
    const luces = Array.from({ length: 60 }, (_, i) => latido(i * 0.1, false));
    expect(Math.max(...luces)).toBeGreaterThan(0.95);
    expect(Math.min(...luces)).toBeLessThan(0.05);
    expect(latido(2.3, true)).toBe(1);
    expect(latido(DURA_EL_SENALADO, false)).toBe(0);
  });
});

describe("el PAPI, solo a su distancia y en la vista", () => {
  const FRANJA = { arriba: 0.9, abajo: -0.4 };
  const bien: PapiVisto = {
    delante: true,
    x: 0.1,
    y: 0.1,
    anchoPx: PAPI_SE_DISTINGUE_PX + 4,
    distancia: 1500,
    tapado: false,
  };

  it("delante, dentro de lo que el HUD deja ver, sin nada por medio y separadas: sí", () => {
    expect(seDistingueElPapi(bien, FRANJA)).toBe(true);
  });

  it("y si falta cualquiera de las cosas, no", () => {
    expect(seDistingueElPapi(null, FRANJA)).toBe(false);
    expect(seDistingueElPapi({ ...bien, delante: false }, FRANJA)).toBe(false);
    expect(seDistingueElPapi({ ...bien, tapado: true }, FRANJA)).toBe(false);
    // Debajo del cuadro, o encima de la barra de botones.
    expect(seDistingueElPapi({ ...bien, y: -0.6 }, FRANJA)).toBe(false);
    expect(seDistingueElPapi({ ...bien, y: 0.95 }, FRANJA)).toBe(false);
    // En los costados, donde están los mandos.
    expect(seDistingueElPapi({ ...bien, x: A_LOS_LADOS + 0.05 }, FRANJA)).toBe(false);
    // Más allá de las cinco millas del AIM, aunque la pantalla lo pinte grande.
    expect(seDistingueElPapi({ ...bien, distancia: PAPI_SE_VE_DESDE + 10 }, FRANJA)).toBe(false);
    // Y con las cuatro luces juntas en un punto.
    expect(seDistingueElPapi({ ...bien, anchoPx: PAPI_SE_DISTINGUE_PX - 1 }, FRANJA)).toBe(false);
  });

  /**
   * **Con una cámara de verdad**, en la senda de tres grados de una pista
   * cualquiera: la del juego, sesenta y dos grados de campo y 1280 por 720.
   * Las cuatro luces van a nueve metros —`PAPI_SEPARACION`—, al costado.
   */
  const verDesde = (millas: number, mirando: "pista" | "atras"): PapiVisto => {
    const metros = millas * 1852;
    const camara = new PerspectiveCamera(62, 1280 / 720, 0.5, 1e6);
    const y = Math.tan((3 * Math.PI) / 180) * metros + 30;
    camara.position.set(0, y, metros + 40);
    camara.lookAt(0, mirando === "pista" ? 0 : y, mirando === "pista" ? 0 : metros + 1000);
    camara.updateMatrixWorld();
    const luces = [0, 1, 2, 3].map((k) => new Vector3(-30 - 9 * k, 1, 0));
    const centro = luces[0]!.clone().add(luces[3]!).multiplyScalar(0.5);
    const a = luces[0]!.clone().project(camara);
    const b = luces[3]!.clone().project(camara);
    const c = centro.clone().project(camara);
    return {
      delante: centro.clone().applyMatrix4(camara.matrixWorldInverse).z < 0,
      x: c.x,
      y: c.y,
      anchoPx: Math.hypot(((a.x - b.x) * 1280) / 2, ((a.y - b.y) * 720) / 2),
      distancia: camara.position.distanceTo(centro),
      tapado: false,
    };
  };

  it("en la final, a media milla se distinguen; a tres millas, en esta pantalla, no", () => {
    expect(seDistingueElPapi(verDesde(0.5, "pista"), { arriba: 1, abajo: -1 })).toBe(true);
    expect(seDistingueElPapi(verDesde(3, "pista"), { arriba: 1, abajo: -1 })).toBe(false);
  });

  it("y mirando a otro lado, tampoco aunque esté cerca: el 273", () => {
    expect(seDistingueElPapi(verDesde(0.5, "atras"), { arriba: 1, abajo: -1 })).toBe(false);
  });
});
