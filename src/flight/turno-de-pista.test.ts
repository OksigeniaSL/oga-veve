/**
 * **El cableado del turno de pista**, que es lo que `game.ts` hacía a mano y
 * no vigilaba nada: la lámpara que mira la frecuencia, lo que se retira de la
 * boca al darte la pista, al cambiar la luz y al cambiar de campo, y tu
 * «cleared to land» detrás de lo que le quita la pista a otro.
 *
 * Con una boca de verdad —ver `audio/boca.ts`—, que es la que decide qué
 * suena y cuándo, y una frecuencia de verdad. El ciclo entero con el tráfico
 * dibujado está en `pista-compartida.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { Boca } from "../audio/boca";
import { Frecuencia, type Momento, type Transmision } from "./radio";
import {
  alLevantarLaOrden,
  EXPLICA_LA_ESPERA,
  HOLD_SHORT_POR,
  TurnoDePista,
  type AlrededorDelTurno,
} from "./turno-de-pista";
import { claveDeTorre } from "../audio/torre";
import { t as traducir } from "../i18n";

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const NORMAL: Momento = { fase: "en-vuelo", deDia: true, instructorHablando: false };

/** Una frecuencia que ya ha dado la pista a alguien, con la semilla que lo hace. */
function conAlguienEnLaPista(orden?: string): Frecuencia {
  for (let semilla = 1; semilla < 400; semilla++) {
    const radio = new Frecuencia(dados(semilla), "GCXO");
    for (let t = 0; t < 1500; t += 0.5) {
      radio.update(0.5, NORMAL);
      const ocupan = radio.ocupanLaPista;
      if (ocupan.length && (!orden || ocupan.some((o) => o.orden === orden)))
        return radio;
    }
  }
  throw new Error(`ninguna frecuencia dio la pista con ${orden}`);
}

/** El turno con una boca de verdad, y apuntando lo que pide decir. */
function montar(radio: Frecuencia, cambios: Partial<AlrededorDelTurno> = {}) {
  let reloj = 0;
  const boca = new Boca({ ahora: () => reloj, cancelar: () => {} });
  const aOtros: Transmision[] = [];
  const pasos: string[] = [];
  const turno = new TurnoDePista({
    radio,
    boca,
    trafico: () => null,
    torre: () => true,
    privado: () => false,
    alUmbral: () => 1800,
    alto: () => 90,
    /*
     * Como en el juego: la torre lo pide a la boca en `mando`, y devuelve con
     * qué clave espera turno.
     */
    decirAOtro(dice) {
      aOtros.push(dice);
      const clave = `${dice.clave}@${dice.de.matricula}`;
      boca.pedir(
        "mando",
        () => {
          pasos.push(clave);
        },
        clave,
      );
      return clave;
    },
    autorizarte: () => pasos.push("cleared to land"),
    mandarteAlAire: () => pasos.push("go around"),
    ...cambios,
  });
  return {
    turno,
    boca,
    aOtros,
    pasos,
    avanzar(s: number) {
      reloj += s;
    },
  };
}

describe("la lámpara del punto de espera mira la frecuencia", () => {
  it("con alguien en la pista, espera; sin nadie, no", () => {
    expect(montar(conAlguienEnLaPista()).turno.pistaDeOtros).toBe(true);
    expect(montar(new Frecuencia(dados(3), "GCXO")).turno.pistaDeOtros).toBe(false);
  });

  it("y sin torre, o en un campo privado, no hay frecuencia que mirar", () => {
    const radio = conAlguienEnLaPista();
    expect(montar(radio, { torre: () => false }).turno.pistaDeOtros).toBe(false);
    expect(montar(radio, { privado: () => true }).turno.pistaDeOtros).toBe(false);
  });

  it("y sabe por quién se espera, para decirlo", () => {
    expect(montar(conAlguienEnLaPista("torre.clearedLand")).turno.porQueEsperas).toBe(
      "aterriza",
    );
    expect(montar(conAlguienEnLaPista("torre.lineUpWait")).turno.porQueEsperas).toBe(
      "despega",
    );
    expect(montar(new Frecuencia(dados(3), "GCXO")).turno.porQueEsperas).toBeNull();
  });

  /*
   * Lo que informa un AFIS en el punto de espera: no la pista de nadie, que
   * eso es de torre, sino el tráfico que conoce. Quien ya está en la pista, y
   * si no, quien viene a aterrizar o sale a la calle.
   */
  it("y un AFIS dice el tráfico que conoce: el de la pista antes que el que viene", () => {
    expect(montar(conAlguienEnLaPista("torre.clearedLand")).turno.traficoConocido).toBe(
      "aterriza",
    );
    expect(montar(conAlguienEnLaPista("torre.lineUpWait")).turno.traficoConocido).toBe(
      "despega",
    );
    const radio = conAlguienEnLaPista();
    expect(montar(radio, { privado: () => true }).turno.traficoConocido).toBeNull();
  });

  it("y sin nadie en la frecuencia, «sin tráfico conocido»", () => {
    const radio = new Frecuencia(dados(3), "GCXO");
    expect(radio.alguienViene || radio.alguienEnLaCalle).toBe(false);
    expect(montar(radio).turno.traficoConocido).toBeNull();
  });

  it("y lo que dice está grabado: la torre en fraseología, la instructora en castellano", () => {
    for (const porque of ["aterriza", "despega"] as const) {
      expect(claveDeTorre(HOLD_SHORT_POR[porque]), porque).not.toBeNull();
      const clave = EXPLICA_LA_ESPERA[porque];
      expect(traducir(clave)).not.toBe(clave);
    }
  });
});

describe("al darte la pista", () => {
  it("lo que se le daba a otro y espera turno en la boca, ya no se dice", () => {
    const { turno, boca } = montar(new Frecuencia(dados(3), "GCXO"));
    // Alguien habla, y detrás espera un «cleared to land» a otro, en `baja`.
    boca.pedir("normal", () => {}, "vuelo.final");
    const aOtro = "torre.clearedLand@fonetico.echo-cifra.0-cifra.3";
    boca.pedir("baja", () => {}, aOtro);
    expect(boca.espera(aOtro)).toBe(true);
    turno.alSerTuya("final");
    expect(boca.espera(aOtro)).toBe(false);
  });

  /*
   * **Pero el despegue del que estaba alineado, sí.** Se había oído su «line
   * up and wait»; su «cleared for take-off» esperaba turno detrás de la
   * instructora cuando entraste en final, y se retiraba con lo de arriba: no
   * se oía nunca, y detrás sonaba tu «cleared to land» con él en el eje para
   * quien escuchaba. Es lo que daba «la pista que es tuya la tiene otro» en el
   * banco del vuelo entero, en las tiradas con frustrada.
   */
  it("y el despegue del que estaba alineado no se retira: suena antes que lo tuyo", () => {
    const radio = conAlguienEnLaPista("torre.lineUpWait");
    const quien = radio.ocupanLaPista.find((o) => o.orden === "torre.lineUpWait")!
      .matricula;
    const { turno, boca, pasos } = montar(radio);
    // La instructora habla, y mientras tanto al alineado le toca despegar.
    let acabar = () => {};
    boca.pedir("normal", (listo) => (acabar = listo), "vuelo.final");
    let despegue: string | null = null;
    for (let t = 0; t < 400 && !despegue; t += 0.5) {
      const d = radio.update(0.5, NORMAL);
      if (d?.clave !== "torre.clearedTakeoff" || d.de.matricula !== quien) continue;
      const clave = `${d.clave}@${quien}`;
      despegue = clave;
      // Como la dice el juego: la frecuencia, en baja.
      boca.pedir("baja", () => void pasos.push(clave), clave);
    }
    expect(despegue).not.toBeNull();
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(boca.espera(despegue!)).toBe(true);
    expect(pasos).toEqual([]);
    // Calla la instructora: suena su despegue, y después lo tuyo.
    acabar();
    turno.paso("final");
    expect(pasos).toEqual([despegue, "cleared to land"]);
  });

  it("y a quien la ocupaba se le quita de viva voz, antes que tu autorización", () => {
    const radio = conAlguienEnLaPista("torre.clearedLand");
    // Sin dibujo, va delante quien el guion pone delante: aquí, nadie.
    const quien = radio.ocupanLaPista[0]!.matricula;
    const { turno, boca, aOtros, pasos } = montar(radio, {
      trafico: () => ({
        anuncia: () => {},
        paso: () => [],
        todaviaNo: () => false,
        // Se le ve en la base, lejos: no va delante de ti.
        enFinal: () => null,
      }),
    });
    // La boca está ocupada: lo que se pida, espera.
    let acabar = () => {};
    boca.pedir("normal", (listo) => (acabar = listo), "vuelo.final");
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    expect(aOtros.map((d) => d.de.matricula)).toContain(quien);
    // Tu autorización no se pide mientras lo suyo espera turno...
    turno.paso("final");
    expect(pasos).toEqual([]);
    // ...y en cuanto lo suyo empieza a sonar, sí: detrás.
    acabar();
    turno.paso("final");
    expect(pasos[0]).toMatch(/^torre\.goAround@/);
    expect(pasos[1]).toBe("cleared to land");
  });

  it("y al que se ve delante en final con su permiso, no: eres el número dos", () => {
    const radio = conAlguienEnLaPista("torre.clearedLand");
    const quien = radio.ocupanLaPista.find((o) => o.orden === "torre.clearedLand")!
      .matricula;
    let alto = 90;
    const { turno, aOtros, pasos } = montar(radio, {
      alto: () => alto,
      trafico: () => ({
        anuncia: () => {},
        paso: () => [],
        todaviaNo: () => false,
        enFinal: (m) => (m === quien ? 900 : null),
      }),
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    expect(turno.vaDelante).toBe(quien);
    expect(aOtros.map((d) => d.de.matricula)).not.toContain(quien);
    expect(turno.esperandoLaPista("final")).toBe(true);
    expect(turno.laPistaEsTuya("final")).toBe(false);
    // Sin dejarte la pista, a la altura de decisión te vas al aire.
    turno.paso("final");
    expect(pasos).toEqual([]);
    alto = 55;
    turno.paso("final");
    expect(pasos).toEqual(["go around"]);
  });

  /*
   * **Y si la deja por debajo de la decisión, tampoco hay permiso.** Pasó en
   * el banco del vuelo entero, en Los Rodeos: el de delante dejó la pista a
   * los cincuenta metros, su «pista libre» esperó turno en la boca y tu
   * permiso sonó a once metros del suelo. A la altura de decisión, o la
   * pista es tuya, o te vas.
   */
  it("y si el de delante la suelta por debajo de la decisión, al aire igual", () => {
    const radio = conAlguienEnLaPista("torre.clearedLand");
    const quien = radio.ocupanLaPista.find((o) => o.orden === "torre.clearedLand")!
      .matricula;
    let alto = 90;
    let suPistaLibre = false;
    const { turno, boca, pasos } = montar(radio, {
      alto: () => alto,
      trafico: () => ({
        anuncia: () => {},
        paso: () => [],
        todaviaNo: () => false,
        enFinal: (m) => (m === quien ? 900 : null),
      }),
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    expect(turno.vaDelante).toBe(quien);
    turno.paso("final");
    expect(pasos).toEqual([]);
    // Ya por debajo de la decisión, el de delante suelta la pista: su
    // «pista libre» espera turno detrás de la instructora.
    alto = 50;
    boca.pedir("normal", () => {}, "vuelo.final");
    boca.pedir("baja", () => void (suPistaLibre = true), `otro.pistaLibre@${quien}`);
    radio.laTiene = () => false;
    turno.paso("final");
    expect(suPistaLibre).toBe(false);
    expect(pasos).toEqual(["go around"]);
    // Y bajando más ya no llega ningún permiso para esta final.
    alto = 11;
    turno.paso("final");
    expect(pasos).toEqual(["go around"]);
  });

  it("y si la suelta por encima de la decisión, el permiso llega", () => {
    const radio = conAlguienEnLaPista("torre.clearedLand");
    const quien = radio.ocupanLaPista.find((o) => o.orden === "torre.clearedLand")!
      .matricula;
    const { turno, pasos } = montar(radio, {
      alto: () => 120,
      trafico: () => ({
        anuncia: () => {},
        paso: () => [],
        todaviaNo: () => false,
        enFinal: (m) => (m === quien ? 900 : null),
      }),
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(pasos).toEqual([]);
    radio.laTiene = () => false;
    turno.paso("final");
    expect(pasos).toContain("cleared to land");
    expect(pasos).not.toContain("go around");
  });
});

describe("y con una orden de irse al aire puesta", () => {
  /*
   * El permiso pendiente se cae: lo que toca decir al levantar la orden lo
   * sabe quien la levanta —ver `alLevantarLaOrden`—, y dicho desde aquí era
   * la verde encima de la roja.
   */
  it("tu permiso pendiente no suena, ni cuando la orden se levanta", () => {
    let orden = true;
    const { turno, pasos } = montar(new Frecuencia(dados(3), "GCXO"), {
      mandanFrustrar: () => orden,
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(pasos).toEqual([]);
    orden = false;
    turno.paso("final");
    expect(pasos).toEqual([]);
  });

  it("y la final nueva lo vuelve a pedir, y suena", () => {
    let orden = true;
    const { turno, pasos } = montar(new Frecuencia(dados(3), "GCXO"), {
      mandanFrustrar: () => orden,
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    turno.paso("final");
    orden = false;
    turno.paso("en-vuelo");
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land"]);
  });

  it("sin orden, suena en cuanto se pide", () => {
    const { turno, pasos } = montar(new Frecuencia(dados(3), "GCXO"), {
      mandanFrustrar: () => false,
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land"]);
  });
});

describe("lo que se retira de la boca", () => {
  it("al cambiar la luz: lo de tu lámpara y la explicación de la espera, no lo de otros", () => {
    const { turno, boca } = montar(new Frecuencia(dados(3), "GCXO"));
    const YO = "fonetico.zulu-fonetico.papa";
    boca.pedir("normal", () => {}, "vuelo.final");
    const tuya = `torre.holdShortLanding@${YO}`;
    const deOtro = "torre.holdShort@fonetico.echo";
    boca.pedir("mando", () => {}, tuya);
    boca.pedir("normal", () => {}, "vuelo.esperaQueAterrice");
    boca.pedir("baja", () => {}, deOtro);
    turno.alCambiarLaLuz(YO);
    expect(boca.espera(tuya)).toBe(false);
    expect(boca.espera("vuelo.esperaQueAterrice")).toBe(false);
    expect(boca.espera(deOtro)).toBe(true);
  });

  it("al cambiar de campo: la frecuencia de allí, y la de aquí empieza de cero", () => {
    const radio = conAlguienEnLaPista();
    const { turno, boca } = montar(radio);
    boca.pedir("normal", () => {}, "vuelo.final");
    const deAlli = "otro.final@fonetico.echo";
    boca.pedir("baja", () => {}, deAlli);
    turno.cambiarDeCampo("SGAS");
    expect(boca.espera(deAlli)).toBe(false);
    expect(radio.ocupanLaPista).toEqual([]);
    expect(radio.matriculas.every((m) => m.startsWith("ZP-"))).toBe(true);
  });
});

describe("con una sola calle", () => {
  /*
   * La raya verde no puede rodear al que espera en la doble raya de la única
   * calle: es la tuya. Así que la torre no deja a dos en ella. Ver
   * `USAN_LA_CALLE` y `Momento.calleOcupada` en `flight/radio.ts`.
   */
  const RUEDAN = /^otro\.(rodando|buenosDias)$/;
  /** Una frecuencia con alguien que ya salió a rodar y espera en la calle. */
  function conUnoEnLaCalle(): Frecuencia {
    for (let semilla = 1; semilla < 400; semilla++) {
      const radio = new Frecuencia(dados(semilla), "SGEN");
      let rueda = false;
      for (let t = 0; t < 20; t += 0.5)
        rueda = RUEDAN.test(radio.update(0.5, NORMAL)?.clave ?? "") || rueda;
      if (rueda && radio.alguienEnLaCalle && !radio.pistaOcupada) return radio;
    }
    throw new Error("nadie salió a rodar");
  }

  it("en la doble raya se espera al que ya está en la calle, y se dice por qué", () => {
    const radio = conUnoEnLaCalle();
    const una = montar(radio, { calleUnica: () => true }).turno;
    expect(una.pistaDeOtros).toBe(true);
    expect(una.porQueEsperas).toBe("despega");
    // Con más calles, se le rodea: no hay que esperarle.
    const varias = montar(radio, { calleUnica: () => false }).turno;
    expect(varias.pistaDeOtros).toBe(false);
    expect(varias.porQueEsperas).toBeNull();
  });

  it("y rodando vos, nadie sale de su puesto: la frecuencia lo sabe por el turno", () => {
    for (let semilla = 1; semilla <= 60; semilla++) {
      const radio = new Frecuencia(dados(semilla), "SGEN");
      const { turno } = montar(radio, { calleUnica: () => true });
      for (let t = 0; t < 600; t += 0.5) {
        const dice = turno.oir(0.5, { fase: "rodando", deDia: true, instructorHablando: false });
        expect(RUEDAN.test(dice?.clave ?? ""), `semilla ${semilla}, ${t} s`).toBe(false);
      }
    }
  });

  it("y llegando vos, al que espera en la calle se le da la salida antes que tu permiso", () => {
    const radio = conUnoEnLaCalle();
    const { turno, aOtros, pasos } = montar(radio, { calleUnica: () => true });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    expect(aOtros.map((d) => d.clave)).toEqual(["torre.clearedTakeoff"]);
    turno.paso("final");
    expect(pasos).toEqual([`torre.clearedTakeoff@${aOtros[0]!.de.matricula}`, "cleared to land"]);
  });

  /*
   * De Los Rodeos a La Gomera con el JAZ 60: «dos encima de la pista», los
   * dos turbohélices de la calle. Uno corría su despegue con su permiso; al
   * entrar tú en final, el que esperaba en la doble raya recibía también el
   * suyo y entraba detrás, en la pista que el otro todavía pisaba. La salida
   * se le da al de la calle con la pista libre, no con otro encima: la pista
   * es de uno por vez.
   */
  it("pero no con otro todavía encima de la pista: la pista es de uno por vez", () => {
    const radio = conUnoEnLaCalle();
    const anunciadas: string[] = [];
    const { turno, aOtros } = montar(radio, {
      calleUnica: () => true,
      trafico: () => ({
        anuncia: (m, clave) => anunciadas.push(`${clave}@${m}`),
        paso: () => [],
        todaviaNo: () => false,
        enFinal: () => null,
        // El que ya corre su despegue, con su permiso y fuera de la frecuencia.
        ocupanLaPista: () => ["EC-SAL"],
      }),
    });
    turno.alSerTuya("final");
    expect(aOtros).toEqual([]);
    expect(anunciadas).toEqual([]);
    // Y el de la calle sigue en ella, esperando: no pierde su turno.
    expect(radio.alguienEnLaCalle).toBe(true);
  });
});

describe("y la frecuencia pregunta al dibujo antes de hablar", () => {
  it("quien todavía no está donde dice, espera", () => {
    const radio = new Frecuencia(dados(5), "GCXO");
    let dejar = false;
    montar(radio, {
      trafico: () => ({
        anuncia: () => {},
        paso: () => [],
        todaviaNo: () => !dejar,
        enFinal: () => null,
      }),
    });
    expect(radio.todaviaNo("EC-ABC", "otro.final")).toBe(true);
    dejar = true;
    expect(radio.todaviaNo("EC-ABC", "otro.final")).toBe(false);
  });
});

describe("al levantarte la orden de irte al aire", () => {
  it("subiendo en la frustrada no se autoriza a aterrizar: se vuelve por el circuito", () => {
    expect(alLevantarLaOrden("pistaOcupada", "en-vuelo", false)).toBe("volver");
    // Ni aunque la fase no se haya enterado todavía de que ya no es final.
    expect(alLevantarLaOrden("pistaOcupada", "final", false)).toBe("volver");
    expect(alLevantarLaOrden("noEstabilizada", "en-vuelo", false)).toBe("volver");
  });

  it("corrigiendo en final, sí", () => {
    expect(alLevantarLaOrden("noEstabilizada", "final", false)).toBe("aterrizar");
  });

  it("y a quien venía por la otra punta, a volver por la buena", () => {
    // Levantada en final sería autorizar la toma por la punta equivocada.
    expect(alLevantarLaOrden("otraCabecera", "final", false)).toBe("volver");
    expect(alLevantarLaOrden("otraCabecera", "en-vuelo", false)).toBe("volver");
  });

  it("y en tierra no hay verde que dar", () => {
    expect(alLevantarLaOrden("pistaOcupada", "aterrizado", true)).toBe("nada");
    expect(alLevantarLaOrden("noEstabilizada", "aterrizado", true)).toBe("nada");
  });
});

describe("tu permiso para aterrizar, solo mientras hay final", () => {
  /*
   * Con la boca ocupada el permiso espera turno hasta doce segundos, y en una
   * final corta se tocaba antes: en Tenerife Norte sonó «cleared to land» con
   * el avión ya rodando.
   */
  function conElPermisoEnCola() {
    const dicho: string[] = [];
    const m = montar(new Frecuencia(dados(1), "GCXO"), {
      autorizarte: () =>
        m.boca.pedir("mando", () => void dicho.push("cleared to land"), "torre.canario.clearedLand@yo"),
    });
    // Alguien tiene la palabra: el permiso se queda esperando turno.
    m.boca.pedir("mando", () => void dicho.push("otra"), "torre.canario.roja@otro");
    m.turno.pedirAterrizaje();
    m.turno.paso("final");
    return { ...m, dicho };
  }

  it("si se toca con el permiso en cola, ya no se dice", () => {
    const { turno, boca } = conElPermisoEnCola();
    expect(boca.espera("torre.canario.clearedLand@yo")).toBe(true);
    turno.paso("aterrizado");
    expect(boca.espera("torre.canario.clearedLand@yo")).toBe(false);
  });

  it("y en final sigue esperando su turno", () => {
    const { turno, boca } = conElPermisoEnCola();
    turno.paso("final");
    expect(boca.espera("torre.canario.clearedLand@yo")).toBe(true);
  });
});

/**
 * **Con alguien encima de la pista no se te da, ni «cleared to land» ni
 * «pista libre».** La frecuencia dice quién la tiene; el dibujo, quién está
 * encima. En La Gomera sonó «pista libre» con el otro todavía en la pista, a
 * mil noventa metros del umbral. Ver `ocupanLaPista` en `world/trafico.ts`.
 */
describe("la pista que se ve, además de la que se oye", () => {
  /** Un dibujo con quien se diga encima de la pista, y nada más. */
  const dibujo = (encima: string[]) => ({
    anuncia: () => {},
    paso: () => [],
    todaviaNo: () => false,
    enFinal: () => null,
    ocupanLaPista: () => encima,
  });

  it("en final, con uno encima, se espera y se dice que está ocupada una vez", () => {
    const encima = ["EC-ABC"];
    let ocupada = 0;
    let alto = 90;
    const { turno, pasos } = montar(new Frecuencia(dados(3), "GCXO"), {
      trafico: () => dibujo(encima),
      alto: () => alto,
      avisarteOcupada: () => void ocupada++,
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    for (let i = 0; i < 20; i++) turno.paso("final");
    expect(pasos).toEqual([]);
    expect(ocupada).toBe(1);
    // La deja: ahora sí.
    encima.length = 0;
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land"]);
    // Y en otra final, con otro encima, se vuelve a decir.
    turno.paso("en-vuelo");
    encima.push("EC-XYZ");
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(ocupada).toBe(2);
    // Y si a la decisión sigue encima, al aire.
    alto = 50;
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land", "go around"]);
  });

  it("y la lámpara del punto de espera tampoco se pone verde", () => {
    const { turno } = montar(new Frecuencia(dados(3), "GCXO"), {
      trafico: () => dibujo(["EC-ABC"]),
    });
    expect(turno.pistaDeOtros).toBe(true);
    // Encima sin tenerla es el que ya corre su despegue.
    expect(turno.porQueEsperas).toBe("despega");
  });
});

/**
 * **Sin «cleared to land» oído no hay permiso.** Se dejó la final con el
 * permiso todavía esperando turno —la fase puede ir y volver en un segundo en
 * el borde de la final—: se retiró sin sonar, la luz siguió verde, y al volver
 * a final el permiso nuevo no sonó, porque la lámpara solo habla cuando
 * cambia. Llegando a Los Rodeos se aterrizó sin oír ninguno.
 */
describe("el permiso que no llegó a oírse no se dio", () => {
  it("al dejar la final con él esperando, se retira y se avisa; al volver, se da otra vez", () => {
    let retirados = 0;
    const boca = new Boca({ ahora: () => 0, cancelar: () => {} });
    // La boca está hablando: el permiso espera turno, como en el juego.
    boca.pedir("normal", () => {}, "circuito.base");
    const pedirlo = () =>
      boca.pedir("mando", () => {}, "torre.canario.aterrizar@yo");
    const turno = new TurnoDePista({
      radio: new Frecuencia(dados(3), "GCXO"),
      boca,
      trafico: () => null,
      torre: () => true,
      privado: () => false,
      alUmbral: () => 1800,
      alto: () => 90,
      decirAOtro: () => null,
      autorizarte: pedirlo,
      mandarteAlAire: () => {},
      retirarteElPermiso: () => void retirados++,
    });
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(boca.espera("torre.canario.aterrizar@yo")).toBe(true);
    // La fase baila: sale de final y vuelve.
    turno.paso("en-vuelo");
    expect(boca.espera("torre.canario.aterrizar@yo")).toBe(false);
    expect(retirados).toBe(1);
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(boca.espera("torre.canario.aterrizar@yo")).toBe(true);
  });

  it("y si ya se oyó, dejar la final no retira nada: el permiso se dio", () => {
    let retirados = 0;
    const { turno, pasos } = montar(new Frecuencia(dados(3), "GCXO"), {
      retirarteElPermiso: () => void retirados++,
    });
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land"]);
    turno.paso("aterrizado");
    expect(retirados).toBe(0);
  });

  /*
   * **Y es permiso cuando suena, no cuando se pide.** En La Palma llegó con
   * el avión en la cabecera y la máquina contando «one hundred». En los
   * mínimos o se tiene, oído, o se va uno al aire.
   */
  it("a la altura de decisión sin haberse oído, se retira y al aire", () => {
    let alto = 120;
    let sinOir = true;
    let retirados = 0;
    const { turno, pasos } = montar(new Frecuencia(dados(3), "GCXO"), {
      alto: () => alto,
      permisoSinOir: () => sinOir,
      retirarteElPermiso: () => void retirados++,
    });
    turno.pedirAterrizaje();
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land"]);
    // Por encima de la decisión se le espera.
    alto = 70;
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land"]);
    alto = 58;
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land", "go around"]);
    expect(retirados).toBe(1);
    sinOir = false;
  });

  it("y si empezó a sonar antes de la decisión, vale: se aterriza", () => {
    let alto = 120;
    let sinOir = true;
    const { turno, pasos } = montar(new Frecuencia(dados(3), "GCXO"), {
      alto: () => alto,
      permisoSinOir: () => sinOir,
    });
    turno.pedirAterrizaje();
    turno.paso("final");
    sinOir = false;
    alto = 40;
    turno.paso("final");
    expect(pasos).toEqual(["cleared to land"]);
  });
});
