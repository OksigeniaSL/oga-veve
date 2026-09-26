/**
 * La frecuencia: quién habla, cuándo, y sobre todo cuándo no.
 *
 * Lo que se comprueba aquí es que suene a un aeropuerto con gente dentro y no
 * a un altavoz: que sean **varios** aviones con su propia matrícula, que cada
 * uno cuente **una historia en orden**, que la torre **conteste** y conteste
 * pronto, y que ninguno se le suba encima al instructor, que es la única voz
 * que enseña algo.
 *
 * Y una que vale por todas: que ninguna llamada pida una frase que no está
 * grabada. Es el fallo que ya pasó una vez —siete frases de torre grabadas y
 * dos dichas— y no avisa: la frase se cae a la voz del navegador y nadie se
 * entera.
 */

import { describe, expect, it } from "vitest";

import {
  CON_SALUDO,
  CUALES,
  CUANTOS,
  ESPERA_ENTRE_VUELOS,
  ESPERA_MAXIMA,
  ESPERA_MINIMA,
  ESPERA_PRIMERA,
  Frecuencia,
  GUIONES,
  HUECO_DEL_CANAL,
  PISTA_TUYA,
  RESPUESTA_MAXIMA,
  type Momento,
  type Transmision,
} from "./radio";
import { CLAVE_DE_TORRE } from "../audio/torre";
import { ES_PY } from "../i18n/es-PY";

/**
 * Un azar repetible pero **que cambia**.
 *
 * Con un azar clavado —`() => 0.3`— las tres letras de cada matrícula salen
 * iguales y los dos aviones de la frecuencia acaban llamándose lo mismo, que
 * es justo lo que estas pruebas tienen que poder distinguir. Repetible porque
 * una prueba que sale distinta cada vez no sirve de nada.
 */
function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Un momento tranquilo: rodando, de día y con el instructor callado. */
const TRANQUILO: Momento = {
  fase: "rodando",
  deDia: true,
  instructorHablando: false,
};

/** Deja pasar `segundos` y devuelve todo lo que se oyó, con su instante. */
function escuchar(
  radio: Frecuencia,
  segundos: number,
  m: Momento = TRANQUILO,
  paso = 0.5,
): Array<Transmision & { cuando: number }> {
  const oido: Array<Transmision & { cuando: number }> = [];
  for (let t = 0; t < segundos; t += paso) {
    const dice = radio.update(paso, m);
    if (dice) oido.push({ ...dice, cuando: t });
  }
  return oido;
}

describe("quiénes están en la frecuencia", () => {
  it("son varios, y cada uno con su matrícula", () => {
    const radio = new Frecuencia(() => 0.5, "GCXO");
    expect(radio.matriculas).toHaveLength(CUANTOS);
    expect(new Set(radio.quienes.map((q) => q.dicho)).size).toBeGreaterThan(0);
  });

  it("y con el prefijo del país del aeródromo, no siempre el nuestro", () => {
    expect(
      new Frecuencia(() => 0.5, "GCXO").matriculas.every((m) =>
        m.startsWith("EC-"),
      ),
    ).toBe(true);
    expect(
      new Frecuencia(() => 0.5, "SGAS").matriculas.every((m) =>
        m.startsWith("ZP-"),
      ),
    ).toBe(true);
  });

  it("no arrancan todos a la vez, que es lo que sonaba a bucle", () => {
    const radio = new Frecuencia(() => 0.5, "SGAS");
    const oido = escuchar(radio, 60);
    // Alguien habla dentro del primer minuto, pero no los dos a la vez.
    expect(oido.length).toBeGreaterThan(0);
    for (let i = 1; i < oido.length; i++) {
      expect(oido[i]!.cuando - oido[i - 1]!.cuando).toBeGreaterThanOrEqual(
        HUECO_DEL_CANAL - 0.01,
      );
    }
  });
});

describe("cada uno cuenta su vuelo en orden", () => {
  it("las llamadas de una matrícula salen en el orden de su guion", () => {
    const radio = new Frecuencia(dados(7), "SGAS");
    const oido = escuchar(radio, 900);
    const porAvion = new Map<string, string[]>();
    for (const o of oido) {
      const lista = porAvion.get(o.de.matricula) ?? [];
      lista.push(o.clave);
      porAvion.set(o.de.matricula, lista);
    }
    expect(porAvion.size).toBeGreaterThan(CUANTOS);
    for (const claves of porAvion.values()) {
      // El saludo es la primera llamada de quien sale, con otra clave.
      const normalizadas = claves.map((c) =>
        c === CON_SALUDO ? "otro.rodando" : c,
      );
      const cabe = Object.values(GUIONES).some((g) => {
        const suyas = g.map((p) => p.clave);
        return normalizadas.every((c, i) => suyas[i] === c);
      });
      expect(cabe, normalizadas.join(" · ")).toBe(true);
    }
  });

  it("cuando uno termina su vuelo se va, y el que llega es otro", () => {
    const radio = new Frecuencia(dados(7), "SGAS");
    const primeras = new Set(radio.matriculas);
    escuchar(radio, 2000);
    const ahora = new Set(radio.matriculas);
    expect([...ahora].some((m) => !primeras.has(m))).toBe(true);
  });
});

describe("la torre contesta", () => {
  it("y lo hace: se la oye nombrar a los demás", () => {
    const radio = new Frecuencia(dados(7), "SGAS");
    const oido = escuchar(radio, 900);
    expect(oido.some((o) => o.voz === "torre")).toBe(true);
  });

  it("contesta a quien llamó, no a otro", () => {
    const radio = new Frecuencia(dados(7), "SGAS");
    for (const o of escuchar(radio, 900)) {
      // Una respuesta de torre nombra siempre una matrícula de la frecuencia.
      if (o.voz === "torre") expect(o.de.matricula).toMatch(/^ZP-[A-Z]{3}$/);
    }
  });

  it("y lo que **no** es respuesta se toma su tiempo", () => {
    /*
     * Que a uno lo paren en el punto de espera y le autoricen cuarenta
     * segundos después no es un retraso: es el turno. La lección de la radio
     * es que la pista es de todos, y eso solo se oye si alguien espera de
     * verdad.
     */
    const radio = new Frecuencia(dados(7), "SGAS");
    const oido = escuchar(radio, 1500);
    const esperas = oido.filter((o, i) => i > 0 && !o.respuesta);
    expect(esperas.length).toBeGreaterThan(0);
  });

  it("y contesta en segundos, no en minutos", () => {
    /*
     * Es el detalle que separa una conversación de dos monólogos. Una torre
     * que contesta cuarenta segundos después no está contestando: está
     * diciendo otra cosa por su cuenta, y se nota sin saber decir por qué.
     */
    const radio = new Frecuencia(dados(7), "SGAS");
    const oido = escuchar(radio, 900);
    let respuestas = 0;
    for (let i = 1; i < oido.length; i++) {
      if (!oido[i]!.respuesta) continue;
      respuestas += 1;
      expect(oido[i]!.cuando - oido[i - 1]!.cuando).toBeLessThan(
        RESPUESTA_MAXIMA + HUECO_DEL_CANAL + 1,
      );
    }
    expect(respuestas).toBeGreaterThan(0);
  });
});

describe("cuándo se calla", () => {
  it("no habla en final ni en la toma", () => {
    const radio = new Frecuencia(() => 0.5, "SGAS");
    expect(escuchar(radio, 300, { ...TRANQUILO, fase: "final" })).toHaveLength(
      0,
    );
  });

  it("ni encima del instructor", () => {
    const radio = new Frecuencia(() => 0.5, "SGAS");
    expect(
      escuchar(radio, 300, { ...TRANQUILO, instructorHablando: true }),
    ).toHaveLength(0);
  });

  it("pero no pierde el turno: espera y lo dice después", () => {
    const radio = new Frecuencia(() => 0.5, "SGAS");
    escuchar(radio, 300, { ...TRANQUILO, instructorHablando: true });
    expect(escuchar(radio, 10).length).toBeGreaterThan(0);
  });

  it("y nunca dos a la vez", () => {
    const radio = new Frecuencia(dados(11), "SGAS");
    const oido = escuchar(radio, 1200, TRANQUILO, 0.25);
    for (let i = 1; i < oido.length; i++) {
      expect(oido[i]!.cuando - oido[i - 1]!.cuando).toBeGreaterThanOrEqual(
        HUECO_DEL_CANAL - 0.01,
      );
    }
  });
});

describe("los buenos días", () => {
  it("de día los da quien abre la frecuencia", () => {
    const radio = new Frecuencia(() => 0.1, "SGAS");
    const oido = escuchar(radio, 600);
    expect(oido.some((o) => o.clave === CON_SALUDO)).toBe(true);
  });

  it("de noche no, pero la llamada se dice igual", () => {
    const noche: Momento = { ...TRANQUILO, deDia: false };
    const radio = new Frecuencia(() => 0.1, "SGAS");
    const oido = escuchar(radio, 600, noche);
    expect(oido.some((o) => o.clave === CON_SALUDO)).toBe(false);
    expect(oido.some((o) => o.clave === "otro.rodando")).toBe(true);
  });
});

describe("lo que se guarda y lo que se reinicia", () => {
  it("guarda lo último dicho, para enseñarlo en pantalla", () => {
    const radio = new Frecuencia(() => 0.5, "SGAS");
    expect(radio.ultima).toBeNull();
    const oido = escuchar(radio, 200);
    expect(radio.ultima?.clave).toBe(oido[oido.length - 1]!.clave);
  });

  it("y al reiniciar el vuelo, la frecuencia también", () => {
    const radio = new Frecuencia(() => 0.5, "SGAS");
    escuchar(radio, 200);
    radio.reiniciar("SGAS");
    expect(radio.ultima).toBeNull();
    expect(escuchar(radio, ESPERA_PRIMERA - 2)).toHaveLength(0);
  });

  it("el silencio entre llamadas no es siempre el mismo", () => {
    const corto = escuchar(new Frecuencia(() => 0, "SGAS"), 400);
    const largo = escuchar(new Frecuencia(() => 0.99, "SGAS"), 400);
    expect(corto.length).toBeGreaterThan(largo.length);
  });
});

describe("todo lo que se pide está grabado", () => {
  /*
   * La comprobación que vale por todas. Ya pasó una vez: siete frases de torre
   * grabadas, dos dichas, y las cinco restantes bajándose a cada tablet sin
   * que nada las nombrara. Una clave que no existe no rompe nada — se cae a la
   * voz del navegador y suena distinto, que es peor que fallar.
   */
  const deTorre = new Set(Object.values(CLAVE_DE_TORRE));

  it("las claves de torre de los guiones son de las grabadas", () => {
    for (const guion of CUALES) {
      for (const paso of GUIONES[guion]) {
        if (paso.voz !== "torre") continue;
        expect(deTorre.has(paso.clave), `${guion}: ${paso.clave}`).toBe(true);
      }
    }
  });

  it("y las del otro avión tienen texto en castellano", () => {
    const claves = new Set<string>([CON_SALUDO]);
    for (const guion of CUALES) {
      for (const paso of GUIONES[guion]) {
        if (paso.voz === "otro") claves.add(paso.clave);
      }
    }
    for (const c of claves) {
      expect(Object.hasOwn(ES_PY, c), c).toBe(true);
    }
  });

  it("y todo guion acaba: ninguno se queda a medias", () => {
    for (const guion of CUALES) {
      expect(GUIONES[guion].length, guion).toBeGreaterThan(1);
    }
    expect(ESPERA_ENTRE_VUELOS).toBeGreaterThan(ESPERA_MAXIMA);
    expect(ESPERA_MINIMA).toBeLessThan(ESPERA_MAXIMA);
  });
});

describe("la pista que es tuya no se le da a nadie", () => {
  /*
   * Aterrizando en Los Rodeos, con el «cleared to land» propio ya dicho, la
   * torre autorizó a otro a despegar; y con el avión rodando por la pista
   * para dejarla, a otro a entrar en ella. Una torre de verdad no da la misma
   * pista a dos a la vez.
   */
  const DAN_LA_PISTA = /^torre\.(lineUpWait|clearedTakeoff|clearedLand)$/;

  it("mientras la usas, la torre no autoriza a nadie a usarla", () => {
    for (const fase of PISTA_TUYA) {
      for (let semilla = 1; semilla <= 20; semilla++) {
        const radio = new Frecuencia(dados(semilla), "GCXO");
        const oido = escuchar(radio, 600, { ...TRANQUILO, fase });
        const dadas = oido.filter((d) => DAN_LA_PISTA.test(d.clave));
        expect(dadas, `${fase}, semilla ${semilla}`).toEqual([]);
      }
    }
  });

  it("y en cuanto la dejas libre, se la da: nadie pierde su turno", () => {
    let alguna = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      escuchar(radio, 300, { ...TRANQUILO, fase: "abandonando" });
      const luego = escuchar(radio, 300, { ...TRANQUILO, fase: "a-plataforma" });
      alguna += luego.filter((d) => DAN_LA_PISTA.test(d.clave)).length;
    }
    expect(alguna).toBeGreaterThan(0);
  });

  it("y con la pista libre, se dan como siempre", () => {
    let alguna = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      alguna += escuchar(radio, 600).filter((d) =>
        DAN_LA_PISTA.test(d.clave),
      ).length;
    }
    expect(alguna).toBeGreaterThan(0);
  });
});
