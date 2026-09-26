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
  CALLADAS,
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
  laPistaQueOcupa,
  laPistaQueTiene,
  laQueSeDice,
  PARA_QUITARSELA,
  PISTA_TUYA,
  RESPUESTA_MAXIMA,
  vaDelanteEnFinal,
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
      let hablo = 0;
      for (let semilla = 1; semilla <= 20; semilla++) {
        const radio = new Frecuencia(dados(semilla), "GCXO");
        const oido = escuchar(radio, 600, { ...TRANQUILO, fase });
        hablo += oido.length;
        const dadas = oido.filter((d) => DAN_LA_PISTA.test(d.clave));
        expect(dadas, `${fase}, semilla ${semilla}`).toEqual([]);
      }
      /*
       * **Y donde la frecuencia habla, que es donde esto prueba algo.** En las
       * fases calladas no dar la pista a nadie sale solo, con filtro o sin
       * él; en las otras dos se habla, y lo que no se dice es la pista.
       */
      if (!CALLADAS.has(fase)) expect(hablo, fase).toBeGreaterThan(0);
    }
  });

  it("y las fases en que eso se nota son las dos de la pista que no callan", () => {
    expect([...PISTA_TUYA].filter((f) => !CALLADAS.has(f)).sort()).toEqual([
      "abandonando",
      "back-taxi",
    ]);
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

  it("y la que tiene otro de la frecuencia no se le da a un tercero", () => {
    /*
     * La misma regla entre ellos. Sin ella, en 338 de 400 frecuencias de
     * veinte minutos había un rato con dos en la pista a la vez: los dos
     * alineados en el mismo eje, o uno en el eje y otro autorizado a aterrizar.
     */
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 400; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      for (let t = 0; t < 1200; t += 0.5) {
        radio.update(0.5, TRANQUILO);
        if (radio.conLaPista.length > 1)
          mal.push(
            `semilla ${semilla}, ${t} s: ${radio.conLaPista.map((c) => c.orden).join(" + ")}`,
          );
      }
    }
    expect(mal.slice(0, 3)).toEqual([]);
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

describe("y antes de dártela, se la quita a quien la tenga", () => {
  /*
   * Lo que faltaba de la mitad de arriba. La torre no daba la pista a nadie
   * mientras era tuya, pero al que ya la tenía no le decía nada: en 132 de
   * 400 frecuencias sorteadas había un avión alineado en el eje cuando
   * aterrizabas, y en 268 uno autorizado a aterrizar seguía cantando su final
   * durante tu toma. Ninguno se fue al aire.
   */
  const PISTA_DE_NADIE: Momento = TRANQUILO;
  /** Habla hasta que alguien ocupe la pista, o `null` si no pasa. */
  function hastaQueAlguienLaTenga(radio: Frecuencia): boolean {
    for (let t = 0; t < 2000; t += 0.5) {
      radio.update(0.5, PISTA_DE_NADIE);
      if (radio.ocupanLaPista.length) return true;
    }
    return false;
  }

  it("quién la tiene: el alineado hasta despegar, el autorizado hasta dejarla", () => {
    expect(laPistaQueTiene("espera", 2)).toBeNull();
    expect(laPistaQueTiene("espera", 3)).toBe("torre.lineUpWait");
    expect(laPistaQueTiene("sale", 2)).toBeNull();
    expect(laPistaQueTiene("llega", 1)).toBeNull();
    expect(laPistaQueTiene("llega", 2)).toBe("torre.clearedLand");
    expect(laPistaQueTiene("llega", 3)).toBe("torre.clearedLand");
    // El de la frustrada la suelta al irse al aire y la vuelve a tener al
    // volver a pedirla.
    expect(laPistaQueTiene("frustrada", 3)).toBeNull();
    expect(laPistaQueTiene("frustrada", 4)).toBeNull();
    expect(laPistaQueTiene("frustrada", 5)).toBe("torre.clearedLand");
  });

  it("y lo que se le dice a cada uno para quitársela está en su guion", () => {
    /*
     * Al alineado se le da la salida que ya le tocaba; al que se va al aire
     * le queda la vuelta de la frustrada. Si un guion nuevo no las tuviera,
     * `despejarLaPista` no sabría por dónde seguirlo.
     */
    for (const guion of CUALES) {
      const pasos = GUIONES[guion];
      pasos.forEach((p, i) => {
        if (p.clave !== "torre.lineUpWait") return;
        expect(
          pasos.slice(i + 1).some((q) => q.clave === PARA_QUITARSELA[p.clave]),
          guion,
        ).toBe(true);
      });
    }
    expect(GUIONES.frustrada.some((p) => p.clave === "torre.goAround")).toBe(true);
  });

  it("al alineado le da la salida y al que viene lo manda al aire, y la pista queda libre", () => {
    let alineados = 0;
    let alAire = 0;
    let enFinalSinPermiso = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      if (!hastaQueAlguienLaTenga(radio)) continue;
      const tenian = [...radio.ocupanLaPista];
      const dichas = radio.despejarLaPista();
      // A cada uno lo suyo, y a nadie más.
      expect(
        dichas.map((d) => `${d.de.matricula} ${d.clave}`).sort(),
        `semilla ${semilla}`,
      ).toEqual(
        tenian.map((t) => `${t.matricula} ${PARA_QUITARSELA[t.orden]}`).sort(),
      );
      expect(dichas.every((d) => d.voz === "torre")).toBe(true);
      // Y anula un permiso solo a quien lo tenía.
      for (const d of dichas)
        expect(d.quitaPermiso, `semilla ${semilla}`).toBe(
          tenian.find((t) => t.matricula === d.de.matricula)?.orden !==
            "otro.final",
        );
      expect(radio.ocupanLaPista, `semilla ${semilla}`).toEqual([]);
      for (const t of tenian)
        if (t.orden === "torre.lineUpWait") alineados++;
        else if (t.orden === "otro.final") enFinalSinPermiso++;
        else alAire++;
    }
    // Las tres cosas pasan de verdad con estos guiones, no solo en teoría.
    expect(alineados).toBeGreaterThan(50);
    expect(alAire).toBeGreaterThan(50);
    expect(enFinalSinPermiso).toBeGreaterThan(5);
  });

  it("y el que canta final sin permiso también la ocupa: va hacia ella", () => {
    // El de la frustrada canta «en final» y espera su «go around».
    expect(laPistaQueTiene("frustrada", 2)).toBeNull();
    expect(laPistaQueOcupa("frustrada", 2)).toBe("otro.final");
    expect(PARA_QUITARSELA["otro.final"]).toBe("torre.goAround");
    // Con permiso, lo que cuenta es el permiso.
    expect(laPistaQueOcupa("llega", 3)).toBe("torre.clearedLand");
    // Y en el viento en cola, esperando el suyo, todavía no.
    expect(laPistaQueOcupa("llega", 1)).toBeNull();
    expect(laPistaQueOcupa("frustrada", 4)).toBeNull();
    // Irse al aire la suelta.
    expect(laPistaQueOcupa("frustrada", 3)).toBeNull();
  });

  it("al que va delante en final con su permiso no se le quita: aterriza él primero", () => {
    expect(vaDelanteEnFinal("llega", 3)).toBe(true);
    // Autorizado pero todavía en el viento en cola: no va delante.
    expect(vaDelanteEnFinal("llega", 2)).toBe(false);
    expect(vaDelanteEnFinal("frustrada", 5)).toBe(false);
    expect(vaDelanteEnFinal("frustrada", 2)).toBe(false);
    let vistos = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      for (let t = 0; t < 2000 && !radio.vaDelante(); t += 0.5)
        radio.update(0.5, PISTA_DE_NADIE);
      const delante = radio.vaDelante();
      if (!delante) continue;
      vistos++;
      const dichas = radio.despejarLaPista(delante);
      expect(dichas.map((d) => d.de.matricula)).not.toContain(delante);
      expect(radio.laTiene(delante)).toBe(true);
    }
    expect(vistos).toBeGreaterThan(100);
  });

  /*
   * **Y dónde está lo dice el dibujo, no el guion.** El permiso lo dio la
   * frecuencia; si va delante de ti, lo dice dónde se ve el avión. Sin esto
   * la torre dejaba de número dos a quien entraba en final con el otro
   * todavía en la base, a su lado.
   */
  it("con dibujo, va delante quien el dibujo ve delante, y solo si tiene permiso", () => {
    let conPermiso = 0;
    for (let semilla = 1; semilla <= 200; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      for (let t = 0; t < 2000 && !radio.vaDelante(); t += 0.5)
        radio.update(0.5, PISTA_DE_NADIE);
      const delante = radio.vaDelante();
      if (!delante) continue;
      conPermiso++;
      // El dibujo lo ve detrás: no va delante, diga lo que diga el guion.
      expect(radio.vaDelante(() => false)).toBeNull();
      // Y lo ve delante: va delante.
      expect(radio.vaDelante((m) => m === delante)).toBe(delante);
    }
    expect(conPermiso).toBeGreaterThan(50);
    // Y sin permiso no va delante nadie, lo vea el dibujo donde lo vea.
    const radio = new Frecuencia(dados(7), "GCXO");
    expect(radio.vaDelante(() => true)).toBeNull();
  });

  it("y mientras es tuya nadie la vuelve a tener, ni canta su final", () => {
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 400; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      if (!hastaQueAlguienLaTenga(radio)) continue;
      const alAire = radio
        .despejarLaPista()
        .filter((d) => d.clave === "torre.goAround")
        .map((d) => d.de.matricula);
      for (const [fase, segundos] of [
        ["final", 60],
        ["aterrizado", 30],
        ["abandonando", 120],
      ] as const) {
        for (let t = 0; t < segundos; t += 0.5) {
          const dice = radio.update(0.5, { ...TRANQUILO, fase });
          for (const c of radio.conLaPista)
            mal.push(`semilla ${semilla}, ${fase}: ${c.matricula} ${c.orden}`);
          if (
            dice &&
            alAire.includes(dice.de.matricula) &&
            /otro\.(final|pistaLibre)/.test(dice.clave)
          )
            mal.push(`semilla ${semilla}, ${fase}: ${dice.clave}`);
        }
      }
    }
    expect(mal).toEqual([]);
  });

  it("y cuando la dejas, el que se fue al aire vuelve y aterriza", () => {
    let volvieron = 0;
    let seFueron = 0;
    for (let semilla = 1; semilla <= 100; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      if (!hastaQueAlguienLaTenga(radio)) continue;
      const alAire = radio
        .despejarLaPista()
        .filter((d) => d.clave === "torre.goAround")
        .map((d) => d.de.matricula);
      if (!alAire.length) continue;
      seFueron++;
      escuchar(radio, 60, { ...TRANQUILO, fase: "final" });
      const luego = escuchar(radio, 400, { ...TRANQUILO, fase: "a-plataforma" });
      if (
        luego.some(
          (d) => d.clave === "torre.clearedLand" && alAire.includes(d.de.matricula),
        )
      )
        volvieron++;
    }
    expect(seFueron).toBeGreaterThan(10);
    expect(volvieron).toBe(seFueron);
  });

  it("y de lo que se les dice, en voz alta una: la del que está en el eje", () => {
    const de = new Frecuencia(dados(5), "GCXO").quienes[0]!;
    const alAire = { voz: "torre" as const, clave: "torre.goAround", de, respuesta: false };
    const sale = { ...alAire, clave: "torre.clearedTakeoff" };
    expect(laQueSeDice([alAire, sale])).toBe(sale);
    expect(laQueSeDice([alAire])).toBe(alAire);
    expect(laQueSeDice([])).toBeNull();
  });

  it("pero antes que nada, la que anula un permiso que se oyó", () => {
    /*
     * El «cleared to land» del otro sonó; si lo que suena es el «go around» al
     * que cantaba final sin permiso, el primero queda sin anular y detrás
     * viene el tuyo por la misma pista.
     */
    const de = new Frecuencia(dados(5), "GCXO").quienes[0]!;
    const sinPermiso = { voz: "torre" as const, clave: "torre.goAround", de, respuesta: false };
    const conPermiso = { ...sinPermiso, quitaPermiso: true };
    const sale = { ...sinPermiso, clave: "torre.clearedTakeoff" };
    expect(laQueSeDice([sinPermiso, conPermiso])).toBe(conPermiso);
    expect(laQueSeDice([sale, conPermiso])).toBe(conPermiso);
  });

  it("y con la pista de nadie, no se dice nada", () => {
    const radio = new Frecuencia(dados(3), "GCXO");
    expect(radio.conLaPista).toEqual([]);
    expect(radio.despejarLaPista()).toEqual([]);
  });
});
