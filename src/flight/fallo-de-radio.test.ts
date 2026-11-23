/**
 * **El fallo de radio** (H71): la regla de la lámpara para quien no tiene
 * radio, las cifras del 7600, las alas que contestan, dónde y con qué se
 * ofrece y el orden de la práctica. Las fuentes, en el ADR 0014, enmienda H71.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT, PANAMBI, PYKASU } from "./aircraft";
import { campoConLamparaYSera, ejercicioPorId, ejerciciosPara } from "./ejercicios";
import {
  ACUSE_EN,
  AlasQueContestan,
  CADA_CIFRA,
  cifrasMarcadas,
  hayLampara,
  LA_TORRE_LO_VE,
  LamparaSinRadio,
  luzParaQuienNoTieneRadio,
  MARCADO_EN,
  type LoQueVeLaTorre,
} from "./fallo-de-radio";
import { FinalDeLaTorre } from "./final-de-la-torre";
import { loQueCallaElEjercicio } from "./lo-que-calla-el-ejercicio";
import { Practica, type Lectura, type Suceso } from "./practica";
import { valeHastaElPasoSiguiente } from "../audio/boca";
import { esAfis, sinTorre } from "../world/aerodrome";
import { oaciDe, SCENARIOS } from "../world/scenarios";

const EN_SU_CIRCUITO: LoQueVeLaTorre = {
  enElAire: true,
  teMandaIrte: false,
  teDejaAterrizar: false,
  teCuenta: true,
  enLaBaseOEnLaFinal: false,
  conElCodigo: LA_TORRE_LO_VE + 1,
};

const GRADO = Math.PI / 180;

describe("la lámpara para quien no tiene radio", () => {
  it("los destellos verdes, regresar para aterrizar, en su circuito y con el 7600 visto", () => {
    expect(luzParaQuienNoTieneRadio(EN_SU_CIRCUITO)).toBe("destellos");
  });

  it("y nada antes de que la torre vea el código, ni sin él", () => {
    expect(luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, conElCodigo: null })).toBeNull();
    expect(luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, conElCodigo: LA_TORRE_LO_VE - 0.5 })).toBeNull();
  });

  it("ni fuera de su circuito: lo que no cuenta, no se llama", () => {
    expect(luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, teCuenta: false })).toBeNull();
  });

  it("ni en la base ni en la final: ahí no se pide alabear, y lo que toca es la fija", () => {
    expect(luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, enLaBaseOEnLaFinal: true })).toBeNull();
  });

  it("la verde fija con el permiso de siempre, también en la final", () => {
    expect(luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, teDejaAterrizar: true })).toBe("verde");
    expect(
      luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, teDejaAterrizar: true, enLaBaseOEnLaFinal: true }),
    ).toBe("verde");
  });

  it("la roja fija si te manda irte, aunque hubiera permiso: la pista ocupada gana", () => {
    expect(luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, teMandaIrte: true })).toBe("roja");
    expect(
      luzParaQuienNoTieneRadio({
        ...EN_SU_CIRCUITO,
        teMandaIrte: true,
        teDejaAterrizar: true,
        enLaBaseOEnLaFinal: true,
      }),
    ).toBe("roja");
  });

  it("y en tierra, ninguna: las de en vuelo no dicen lo mismo en el suelo", () => {
    expect(
      luzParaQuienNoTieneRadio({ ...EN_SU_CIRCUITO, enElAire: false, teDejaAterrizar: true }),
    ).toBeNull();
  });
});

describe("la lámpara no se apaga por geometría", () => {
  it("llamado con los destellos, se quedan aunque la torre deje de contarte un rato", () => {
    const l = new LamparaSinRadio();
    expect(l.paso(EN_SU_CIRCUITO)).toBe("destellos");
    // La esquina del tramo cruzado, fuera de su circuito: era un hueco apagado.
    expect(l.paso({ ...EN_SU_CIRCUITO, teCuenta: false })).toBe("destellos");
    // Y en la base y la final, hasta la verde.
    expect(l.paso({ ...EN_SU_CIRCUITO, enLaBaseOEnLaFinal: true })).toBe("destellos");
    expect(l.paso({ ...EN_SU_CIRCUITO, enLaBaseOEnLaFinal: true, teDejaAterrizar: true })).toBe("verde");
  });

  it("la verde sin permiso y la roja sin orden no se quedan: vuelven los destellos", () => {
    const l = new LamparaSinRadio();
    l.paso(EN_SU_CIRCUITO);
    expect(l.paso({ ...EN_SU_CIRCUITO, teMandaIrte: true })).toBe("roja");
    expect(l.paso({ ...EN_SU_CIRCUITO, teCuenta: false })).toBe("destellos");
    expect(l.paso({ ...EN_SU_CIRCUITO, teDejaAterrizar: true })).toBe("verde");
    expect(l.paso({ ...EN_SU_CIRCUITO, enLaBaseOEnLaFinal: true })).toBe("destellos");
  });

  it("y un bote no la cambia: lo que había antes de tocar, hasta que se vuela de verdad", () => {
    const l = new LamparaSinRadio();
    l.paso(EN_SU_CIRCUITO);
    expect(l.paso({ ...EN_SU_CIRCUITO, teDejaAterrizar: true, enLaBaseOEnLaFinal: true })).toBe("verde");
    expect(l.paso({ ...EN_SU_CIRCUITO, enElAire: false })).toBeNull();
    // El permiso se gastó al tocar; en el bote, la verde de antes.
    expect(l.paso({ ...EN_SU_CIRCUITO, desdeQueToco: 1 })).toBe("verde");
    // Pasado el bote, ya es irse: la torre lo llama otra vez.
    expect(l.paso({ ...EN_SU_CIRCUITO, desdeQueToco: 6 })).toBe("destellos");
  });

  it("los primeros no se encienden en la base ni en la final, y en tierra se apaga", () => {
    const l = new LamparaSinRadio();
    expect(l.paso({ ...EN_SU_CIRCUITO, enLaBaseOEnLaFinal: true })).toBeNull();
    expect(l.paso(EN_SU_CIRCUITO)).toBe("destellos");
    expect(l.paso({ ...EN_SU_CIRCUITO, enElAire: false })).toBeNull();
    // Y otro vuelo empieza sin llamar.
    expect(l.paso({ ...EN_SU_CIRCUITO, teCuenta: false })).toBeNull();
  });
});

describe("el 7600, cifra a cifra", () => {
  it("se marca de una en una", () => {
    expect(cifrasMarcadas(-1)).toBe("");
    expect(cifrasMarcadas(0)).toBe("7");
    expect(cifrasMarcadas(CADA_CIFRA)).toBe("76");
    expect(cifrasMarcadas(CADA_CIFRA * 2.5)).toBe("760");
    expect(cifrasMarcadas(MARCADO_EN)).toBe("7600");
    expect(cifrasMarcadas(600)).toBe("7600");
  });
});

describe("las alas que contestan", () => {
  /** Alabea por esta lista de grados, un segundo cada uno en pasos de una décima. */
  const vuelo = (grados: readonly number[]): boolean => {
    const a = new AlasQueContestan();
    let contesta = false;
    for (const g of grados) for (let i = 0; i < 10; i++) contesta = a.paso(g * GRADO, 0.1) || contesta;
    return contesta;
  };

  it("de un lado al otro, enseguida, es contestar", () => {
    expect(vuelo([0, 15, 0, -15, 0])).toBe(true);
    expect(vuelo([-20, 20])).toBe(true);
  });

  it("un viraje del circuito no: un lado solo, y largo", () => {
    expect(vuelo([0, 20, 20, 20, 20, 20, 0, 0])).toBe(false);
    // Y el viraje siguiente, que va del mismo lado.
    expect(vuelo([20, 20, 20, 0, 0, 0, 0, 0, 0, 0, 20, 20, 20])).toBe(false);
  });

  it("ni volver al otro lado mucho después", () => {
    const quieto = Array.from({ length: Math.ceil(ACUSE_EN) + 2 }, () => 0);
    expect(vuelo([15, ...quieto, -15])).toBe(false);
  });

  it("ni balancearse por debajo de los diez grados", () => {
    expect(vuelo([8, -8, 8, -8])).toBe(false);
  });
});

describe("dónde y con qué se ofrece", () => {
  it("en las avionetas de pistón, de Taguató para arriba, y en un campo con torre del SERA", () => {
    expect(campoConLamparaYSera("GCXO")).toBe(true);
    expect(campoConLamparaYSera("GCLP")).toBe(true);
    for (const peldano of ["taguato", "taguato-ruvicha"] as const)
      for (const a of [PYKASU, PANAMBI])
        expect(ejerciciosPara(peldano, a, "GCXO").map((e) => e.id), `${a.id} ${peldano}`).toContain(
          "fallo-de-radio",
        );
    for (const peldano of ["guyrami", "tuka"] as const)
      expect(ejerciciosPara(peldano, PYKASU, "GCXO").map((e) => e.id)).not.toContain("fallo-de-radio");
  });

  it("ni en los de turbina, ni en el fumigador, ni en un helicóptero", () => {
    for (const a of AIRCRAFT) {
      if (a.id === "jaz-20" || a.id === "jaz-40") continue;
      expect(ejerciciosPara("taguato-ruvicha", a, "GCXO").map((e) => e.id), a.id).not.toContain(
        "fallo-de-radio",
      );
    }
  });

  it("ni en un AFIS, ni sin torre, ni en Paraguay mientras no se lea la fuente del 7600 allí", () => {
    expect(campoConLamparaYSera("GCGM")).toBe(false); // La Gomera, AFIS
    expect(campoConLamparaYSera("SGAS")).toBe(false); // Asunción: la DINAC leída no manda el 7600 en VFR
    expect(campoConLamparaYSera(null)).toBe(false);
    expect(campoConLamparaYSera("XXXX")).toBe(false);
  });

  it("y `hayLampara` dice lo mismo que `sinTorre` y `esAfis` en todos los escenarios", () => {
    for (const e of SCENARIOS) {
      const a = e.aerodrome;
      expect(hayLampara(a), oaciDe(e) ?? e.id).toBe(!!a && !sinTorre(a) && !esAfis(a));
    }
  });
});

describe("recién despegado, la torre no te ve en su final hasta que das la vuelta", () => {
  const subiendo = {
    enElAire: true,
    faseDelPlan: "en-vuelo",
    enLaFinalDelPlan: false,
    alUmbral: 3000,
    torcido: 0,
    sobreLaPista: 170,
    // Un bache: la vertical cae un momento por debajo de lo que es subir.
    vertical: 0.5,
  };

  it("sin más, un bache en la subida por el eje entra en su final: es lo que daba el permiso subiendo", () => {
    expect(new FinalDeLaTorre().paso(subiendo)).toBe(true);
  });

  it("y despegado, no, hasta haberse dado la vuelta; después sí", () => {
    const f = new FinalDeLaTorre();
    f.despegado();
    expect(f.paso(subiendo)).toBe(false);
    // El viento en cola, al revés de la pista: ya se dio la vuelta.
    expect(f.paso({ ...subiendo, torcido: 180, alUmbral: null })).toBe(false);
    expect(f.paso({ ...subiendo, sobreLaPista: 150, vertical: -2 })).toBe(true);
  });
});

describe("la radio callada calla la frecuencia, no la torre que te ve", () => {
  it("sin radio no se oye la frecuencia, y la torre sigue viendo su final", () => {
    const e = ejercicioPorId("fallo-de-radio")!;
    const calla = loQueCallaElEjercicio(e, false, false, false, true);
    expect(calla.laFrecuencia).toBe(true);
    expect(calla.laTorre).toBe(false);
    expect(calla.laFase).toBe(false);
    // Y cerrado, vuelve todo.
    expect(loQueCallaElEjercicio(e, true, false, false, true).laFrecuencia).toBe(false);
  });

  it("y lo que dice cada luz vale hasta la luz siguiente", () => {
    for (const k of [
      "ejercicio.radio.callada",
      "ejercicio.radio.destellos",
      "ejercicio.radio.roja",
      "ejercicio.radio.verde",
      "ejercicio.radio.alas",
    ])
      expect(valeHastaElPasoSiguiente(k), k).toBe(true);
  });
});

describe("la práctica sin radio", () => {
  const V = { v1: 50, vr: 55 };
  const nueva = () => new Practica(ejercicioPorId("fallo-de-radio")!, PYKASU, V, () => 0.1);
  const EN_EL_AIRE: Lectura = {
    enElSuelo: false,
    corriendo: false,
    enPista: false,
    indicada: 38,
    sobreElCampo: 250,
    vertical: 0,
    parado: false,
    percance: false,
    enFinal: false,
    tren: "fuera",
    lampara: null,
    alabeo: 0,
    deNoche: false,
  };
  const durante = (p: Practica, l: Lectura, segundos: number): Suceso[] => {
    const todo: Suceso[] = [];
    for (let i = 0; i < segundos * 10; i++) todo.push(...p.paso(l, 0.1));
    return todo;
  };
  /** Despega y sube hasta que se calla la radio. */
  const hastaQueSeCalla = (p: Practica): Suceso[] => [
    ...durante(p, { ...EN_EL_AIRE, enElSuelo: true, corriendo: true, enPista: true, sobreElCampo: 0, indicada: 30 }, 1),
    ...durante(p, { ...EN_EL_AIRE, sobreElCampo: 140, vertical: 3 }, 1),
  ];

  it("se calla subiendo, a los cuatrocientos pies, y no es un motor", () => {
    const p = nueva();
    const s = hastaQueSeCalla(p);
    const fallo = s.find((x) => x.que === "fallo");
    expect(fallo && fallo.que === "fallo" && fallo.averia).toBe("radio");
    expect(p.motorParado).toBeNull();
    // Ni se declara nada: no hay radio con qué, ni nada roto.
    expect(s.some((x) => x.que === "declarar" || x.que === "bomberos")).toBe(false);
  });

  it("cada luz nueva es un paso, en el orden en que la enciende la torre", () => {
    const p = nueva();
    hastaQueSeCalla(p);
    const s = [
      ...durante(p, { ...EN_EL_AIRE, lampara: "destellos" }, 2),
      ...durante(p, { ...EN_EL_AIRE, lampara: "roja" }, 2),
      ...durante(p, { ...EN_EL_AIRE, lampara: null }, 2),
      ...durante(p, { ...EN_EL_AIRE, lampara: "destellos" }, 2),
      ...durante(p, { ...EN_EL_AIRE, lampara: "verde" }, 2),
    ];
    expect(s.filter((x) => x.que === "senal").map((x) => (x.que === "senal" ? x.luz : ""))).toEqual([
      "destellos",
      "roja",
      "destellos",
      "verde",
    ]);
  });

  it("tras los destellos, de día, se espera a que contesten las alas", () => {
    const p = nueva();
    hastaQueSeCalla(p);
    const antes = durante(p, { ...EN_EL_AIRE, lampara: "destellos" }, 3);
    expect(antes.some((x) => x.que === "acuse")).toBe(false);
    const s = [
      ...durante(p, { ...EN_EL_AIRE, lampara: "destellos", alabeo: 15 * GRADO }, 1),
      ...durante(p, { ...EN_EL_AIRE, lampara: "destellos", alabeo: -15 * GRADO }, 1),
    ];
    expect(s.filter((x) => x.que === "acuse")).toEqual([{ que: "acuse", como: "alas" }]);
    expect(p.contestaciones).toBe(1);
  });

  it("a los destellos que vuelven en la base o la final, de día, no se pide alabear", () => {
    const p = nueva();
    hastaQueSeCalla(p);
    const s = [
      ...durante(p, { ...EN_EL_AIRE, lampara: "destellos", enLaBaseOEnLaFinal: true }, 1),
      ...durante(p, { ...EN_EL_AIRE, lampara: "destellos", enLaBaseOEnLaFinal: true, alabeo: 15 * GRADO }, 1),
      ...durante(p, { ...EN_EL_AIRE, lampara: "destellos", enLaBaseOEnLaFinal: true, alabeo: -15 * GRADO }, 1),
    ];
    expect(s.find((x) => x.que === "senal")).toEqual({
      que: "senal",
      luz: "destellos",
      deNoche: false,
      enLaBaseOEnLaFinal: true,
    });
    expect(s.some((x) => x.que === "acuse")).toBe(false);
  });

  it("y de noche contesta la instructora con los faros, con los destellos", () => {
    const p = nueva();
    hastaQueSeCalla(p);
    const s = durante(p, { ...EN_EL_AIRE, lampara: "destellos", deNoche: true }, 1);
    expect(s.filter((x) => x.que === "senal" || x.que === "acuse").map((x) => x.que)).toEqual(["senal", "acuse"]);
    expect(s.find((x) => x.que === "acuse")).toEqual({ que: "acuse", como: "faros" });
  });

  it("se cierra parado en la pista, y sabe si se tomó con la verde", () => {
    const p = nueva();
    hastaQueSeCalla(p);
    durante(p, { ...EN_EL_AIRE, lampara: "verde" }, 2);
    const suelo = { ...EN_EL_AIRE, enElSuelo: true, enPista: true, sobreElCampo: 0, lampara: "verde" as const };
    durante(p, suelo, 1);
    const s = durante(p, { ...suelo, parado: true }, 1);
    expect(s.find((x) => x.que === "cerrar")).toEqual({ que: "cerrar", como: "vuelta" });
    expect(p.tomoConLaVerde).toBe(true);
  });

  it("y si tocó sin la verde fija, lo sabe también: el cierre lo cuenta sin reproche", () => {
    const p = nueva();
    hastaQueSeCalla(p);
    durante(p, { ...EN_EL_AIRE, lampara: "destellos" }, 2);
    const suelo = { ...EN_EL_AIRE, enElSuelo: true, enPista: true, sobreElCampo: 0, parado: true };
    const s = durante(p, suelo, 1);
    expect(s.find((x) => x.que === "cerrar")).toEqual({ que: "cerrar", como: "vuelta" });
    expect(p.tomoConLaVerde).toBe(false);
  });
});
