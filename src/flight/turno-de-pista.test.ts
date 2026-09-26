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
