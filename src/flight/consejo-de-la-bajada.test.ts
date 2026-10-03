/**
 * **La instructora de la final**, puesta a prueba con una final de mentira
 * llena de errores.
 *
 * Lo que la trajo, dicho tres veces jugando: «bajas muy lento, métele gas; le
 * meto gas y bajas muy rápido; ¿qué se supone que tengo que hacer?». Aquí se
 * comprueban las tres promesas del encargo:
 *
 * - **cada consejo nombra una acción**, de un solo mando;
 * - **nunca dos contrarios seguidos** sin que el avión haya respondido al
 *   primero —y la respuesta la mide esta prueba por su cuenta, en la
 *   trayectoria, no se la cree al consejero—;
 * - y con la velocidad baja **nunca se pide subir el morro**.
 */

import { describe, expect, it } from "vitest";
import { t, type TranslationKey } from "../i18n";
import { VARIANTES } from "../audio/variantes";
import {
  ConsejoDeLaBajada,
  contrarias,
  fraseDe,
  mandoDe,
  queHacer,
  RESPONDE_ACELERACION,
  RESPONDE_DESVIO,
  RESPONDE_KT,
  RESPONDE_VERTICAL,
  type Accion,
  type Consejo,
  type Lectura,
  type Objetivo,
} from "./consejo-de-la-bajada";
import {
  desvioEnLaBajada,
  juzgarLaSenda,
  type Senda,
  type Velocidad,
} from "./perfil-vertical";

const ACCIONES: readonly Accion[] = [
  "masGas",
  "menosGas",
  "frenar",
  "narizArriba",
  "narizAbajo",
];

const base = (cambios: Partial<Lectura> = {}): Lectura => ({
  activo: true,
  velocidad: "bien",
  senda: "bien",
  kt: 140,
  aceleracion: 0,
  vertical: -700,
  verticalObjetivo: -700,
  desvio: 0,
  quedaGas: true,
  puedeFrenar: true,
  dt: 0.1,
  ...cambios,
});

/** El texto de una frase grabada, con su forma. */
function textoDe(clave: string, forma: number): string {
  if (forma === 0) return t(clave as TranslationKey);
  return VARIANTES[clave as TranslationKey]?.[forma - 1] ?? "";
}

/**
 * Las palabras con las que se nombra un mando o lo que se hace con él. Una
 * frase sin ninguna de éstas dice lo que pasa, no qué hacer.
 */
const ACCION_NOMBRADA = /gas|motor|nariz|morro|flaps|aerofrenos|bajá|subí|levantá|soltá|tirá/i;

describe("qué se pide", () => {
  const VELOCIDADES: readonly Velocidad[] = ["lento", "bien", "rapido"];
  const SENDAS: readonly Senda[] = ["alto", "bien", "bajo"];

  it("lento, nunca subir el morro: ni con sink rate ni yendo bajo", () => {
    for (const velocidad of VELOCIDADES)
      for (const senda of SENDAS)
        for (const hundiendose of [false, true]) {
          const c = queHacer(base({ velocidad, senda }), hundiendose);
          if (velocidad === "lento")
            expect(c?.accion, `${velocidad}/${senda}/${hundiendose}`).not.toBe("narizArriba");
        }
  });

  it("lento y en la senda o bajo, gas; lento y alto, morro abajo", () => {
    expect(queHacer(base({ velocidad: "lento", senda: "bajo" }))?.accion).toBe("masGas");
    expect(queHacer(base({ velocidad: "lento", senda: "bien" }))?.accion).toBe("masGas");
    expect(queHacer(base({ velocidad: "lento", senda: "alto" }))?.accion).toBe("narizAbajo");
  });

  it("con el morro la senda y con el gas la velocidad", () => {
    expect(queHacer(base({ senda: "alto" }))?.accion).toBe("narizAbajo");
    expect(queHacer(base({ senda: "bajo" }))?.accion).toBe("narizArriba");
    expect(queHacer(base({ velocidad: "rapido" }))?.accion).toBe("menosGas");
    // Rápido y bajo: el morro arriba arregla las dos.
    expect(queHacer(base({ velocidad: "rapido", senda: "bajo" }))?.accion).toBe("narizArriba");
    // Y sin gas que quitar, lo que frena.
    expect(queHacer(base({ velocidad: "rapido", quedaGas: false }))?.accion).toBe("frenar");
    expect(queHacer(base())).toBeNull();
  });

  it("lo que lleva el automático no se le pide a quien vuela", () => {
    // Con el automático en la senda, ni detrás del sink rate.
    expect(queHacer(base({ morroDelAutomatico: true }), true)).toBeNull();
    expect(queHacer(base({ senda: "alto", morroDelAutomatico: true }))).toBeNull();
    // Y con los gases, el gas tampoco.
    expect(queHacer(base({ velocidad: "lento", gasDelAutomatico: true }))).toBeNull();
    // Lo demás, sí.
    expect(queHacer(base({ senda: "alto", gasDelAutomatico: true }))?.accion).toBe("narizAbajo");
  });

  it("un solo mando por consejo, y los contrarios son el mismo mando al revés", () => {
    for (const a of ACCIONES) {
      expect(["gas", "freno", "nariz"]).toContain(mandoDe(a));
      for (const b of ACCIONES) {
        expect(contrarias(a, b)).toBe(contrarias(b, a));
        if (contrarias(a, b)) expect(a).not.toBe(b);
      }
    }
    expect(contrarias("masGas", "menosGas")).toBe(true);
    expect(contrarias("narizArriba", "narizAbajo")).toBe(true);
    expect(contrarias("masGas", "narizAbajo")).toBe(false);
  });
});

describe("lo que se dice", () => {
  const OBJETIVOS: readonly Objetivo[] = ["marca", "papi", "senda", "aro", "ritmo", "nada"];

  it("cada consejo nombra una acción, en la frase nueva y en las grabadas", () => {
    for (const accion of ACCIONES)
      for (const motivo of ["lento", "rapido", "alto", "bajo", "hundiendose"] as const)
        for (const objetivo of OBJETIVOS)
          for (const frena of ["flaps", "aerofrenos"] as const) {
            const f = fraseDe({ accion, motivo }, objetivo, frena);
            const donde = `${accion}/${motivo}/${objetivo}/${frena}`;
            if (f.nueva) expect(t(f.nueva as TranslationKey), donde).toMatch(ACCION_NOMBRADA);
            for (const g of f.grabadas)
              expect(textoDe(g.clave, g.forma), `${donde} ${g.clave}~${g.forma}`).toMatch(
                ACCION_NOMBRADA,
              );
            expect(t(f.corta as TranslationKey), donde).not.toBe(f.corta);
          }
  });

  it("y las nuevas dicen hasta dónde: la marca, las luces, el rombo o el variómetro", () => {
    const hasta = /hasta|para bajar/i;
    for (const clave of [
      "vuelo.consejo.masGas",
      "vuelo.consejo.menosGas",
      "vuelo.consejo.narizAbajoPapi",
      "vuelo.consejo.narizArribaPapi",
      "vuelo.consejo.narizAbajoSenda",
      "vuelo.consejo.narizArribaSenda",
      "vuelo.consejo.narizArribaRitmo",
      "vuelo.consejo.narizArribaSuave",
      "vuelo.consejo.aerofrenos",
    ])
      expect(t(clave as TranslationKey), clave).toMatch(hasta);
  });

  it("de los aros no sale la forma que pide dos mandos", () => {
    // «Venís bajo. Tirá un poquito y un toque de motor»: nariz y gas a la vez.
    const f = fraseDe({ accion: "narizArriba", motivo: "bajo" }, "aro", "flaps");
    for (const g of f.grabadas) expect(textoDe(g.clave, g.forma)).not.toMatch(/motor/);
  });
});

describe("espera el efecto", () => {
  it("dicho una vez, no se repite mientras no cambie nada", () => {
    const c = new ConsejoDeLaBajada();
    const lento = base({ velocidad: "lento", kt: 128 });
    const dichos: Consejo[] = [];
    for (let i = 0; i < 300; i++) {
      const p = c.paso(lento);
      if (p && p !== "bien") dichos.push(p);
    }
    expect(dichos.map((d) => d.accion)).toEqual(["masGas"]);
  });

  it("lo que ya se está corrigiendo no se dice", () => {
    const c = new ConsejoDeLaBajada();
    const acelerando = base({ velocidad: "lento", kt: 128, aceleracion: 1 });
    for (let i = 0; i < 300; i++) expect(c.paso(acelerando)).toBeNull();
  });

  it("el contrario solo después de que el avión responda", () => {
    const c = new ConsejoDeLaBajada();
    for (let i = 0; i < 40; i++) c.paso(base({ velocidad: "lento", kt: 128 }));
    expect(c.ultimo?.accion).toBe("masGas");
    // Pasa a rápido sin que la aguja se haya movido —un dato que salta—: no
    // se pide quitar el gas que se acaba de pedir.
    for (let i = 0; i < 60; i++)
      expect(c.paso(base({ velocidad: "rapido", kt: 128 }))).toBeNull();
    // Y en cuanto la aguja ha respondido, sí.
    let dicho: ReturnType<ConsejoDeLaBajada["paso"]> = null;
    for (let i = 0; i < 60; i++) {
      const p = c.paso(base({ velocidad: "rapido", kt: 165, aceleracion: 0.2 }));
      if (p) dicho = p;
    }
    expect(dicho).not.toBe(null);
    expect(dicho !== "bien" && dicho?.accion).toBe("menosGas");
  });

  it("lo corregido se celebra una vez", () => {
    const c = new ConsejoDeLaBajada();
    for (let i = 0; i < 40; i++) c.paso(base({ senda: "alto", vertical: -700 }));
    expect(c.ultimo?.accion).toBe("narizAbajo");
    const bien: unknown[] = [];
    // El morro abajo: el variómetro baja trescientos pies más, y la senda llega.
    for (let i = 0; i < 20; i++) c.paso(base({ senda: "alto", vertical: -1000 }));
    for (let i = 0; i < 40; i++) {
      const p = c.paso(base());
      if (p === "bien") bien.push(p);
    }
    expect(bien).toHaveLength(1);
  });

  it("y lo que se arregló solo, sin que el avión respondiera, no se celebra", () => {
    const c = new ConsejoDeLaBajada();
    for (let i = 0; i < 40; i++) c.paso(base({ velocidad: "lento", kt: 128 }));
    expect(c.ultimo?.accion).toBe("masGas");
    // La marca baja un peldaño y la aguja, quieta, ya está en ella.
    for (let i = 0; i < 40; i++) expect(c.paso(base({ kt: 128, marca: 130 }))).toBeNull();
  });

  it("con sink rate y lento, detrás de la caja va el gas; y airspeed low detrás no añade nada", () => {
    // Bajando a Gran Canaria: sink rate, airspeed low, «metéle gas» y «bajás
    // rápido», todo a la vez. Ahora: una explicación, la buena.
    const c = new ConsejoDeLaBajada();
    const l = base({ velocidad: "lento", kt: 126, vertical: -1500, senda: "bajo", hundiendose: true });
    expect(c.porLaCaja("hundiendose", l)?.accion).toBe("masGas");
    expect(c.porLaCaja("lento", l)).toBeNull();
    for (let i = 0; i < 100; i++) {
      const p = c.paso({ ...l, lentoLoCantaLaCaja: true });
      expect(p).toBeNull();
    }
  });

  it("y con sink rate a la velocidad buena, nariz arriba", () => {
    const c = new ConsejoDeLaBajada();
    const l = base({ vertical: -1600, hundiendose: true });
    expect(c.porLaCaja("hundiendose", l)?.accion).toBe("narizArriba");
  });

  it("mientras no toca aconsejar calla, pero no olvida lo dicho", () => {
    const c = new ConsejoDeLaBajada();
    for (let i = 0; i < 40; i++) c.paso(base({ senda: "bajo" }));
    expect(c.ultimo?.accion).toBe("narizArriba");
    // Un momento subiendo para coger la senda: callado y sin olvidar.
    for (let i = 0; i < 40; i++) expect(c.paso(base({ activo: false, senda: "alto" }))).toBeNull();
    expect(c.ultimo?.accion).toBe("narizArriba");
    // Y acabada la bajada, se olvida y vuelve a poder decirse.
    c.reiniciar();
    expect(c.ultimo).toBeNull();
  });
});

/*
 * ── La final de mentira ────────────────────────────────────────────────
 *
 * Un avión de juguete y alguien que lo vuela mal a propósito: tarda en
 * reaccionar, a veces se pasa, a veces no hace caso, y de vez en cuando mete
 * la pata por su cuenta. Encima, ráfagas. El avión no es el del juego: es lo
 * justo para que el gas mueva la velocidad y el morro la senda, con su retraso,
 * y que los dos se crucen un poco —con el morro arriba se pierde velocidad—,
 * que es lo que lo hace difícil de verdad.
 */

/** Un azar con semilla, para que cada vuelta sea la misma cada vez. */
function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

interface Instante {
  readonly t: number;
  readonly kt: number;
  readonly aceleracion: number;
  readonly vertical: number;
  readonly desvio: number;
  readonly velocidad: Velocidad;
  readonly senda: Senda;
}

const MARCA = 140;
const RITMO = -700;
const PASO = 0.1;

/** La velocidad juzgada como la juzga el juego en la final: Vref −4 % y +24 %, con su vuelta. */
function juzgarVelocidad(kt: number, antes: Velocidad | null): Velocidad {
  const vref = MARCA - 5;
  if (antes === "lento" && kt < vref * 1.01) return "lento";
  if (antes === "rapido" && kt > vref * 1.19) return "rapido";
  if (kt < vref * 0.96) return "lento";
  if (kt > vref * 1.24) return "rapido";
  return "bien";
}

function volarUnaFinal(semilla: number): {
  dichos: { t: number; c: Consejo; l: Lectura }[];
  traza: Instante[];
} {
  const r = azar(semilla);
  const consejero = new ConsejoDeLaBajada();
  // Arranca mal: lento o rápido, alto o bajo, a suertes.
  let kt = MARCA + (r() - 0.5) * 50;
  let pies = (r() - 0.5) * 600;
  let gas = 0.5 + (r() - 0.5) * 0.4;
  let morro = (r() - 0.5) * 0.6;
  let vertical = RITMO;
  let aceleracion = 0;
  let velocidad: Velocidad | null = null;
  let senda: Senda | null = null;
  const pendiente: { cuando: number; hacer: () => void }[] = [];
  const dichos: { t: number; c: Consejo; l: Lectura }[] = [];
  const traza: Instante[] = [];
  for (let paso = 0; paso < 1800; paso++) {
    const ahora = paso * PASO;
    // Lo que hace quien vuela, con su retraso.
    for (let i = pendiente.length - 1; i >= 0; i--)
      if (pendiente[i]!.cuando <= ahora) {
        pendiente[i]!.hacer();
        pendiente.splice(i, 1);
      }
    // Y las suyas: de vez en cuando toca lo que no debe.
    if (r() < 0.004) gas = Math.max(0, Math.min(1, gas + (r() - 0.5) * 0.5));
    if (r() < 0.004) morro += (r() - 0.5) * 1.2;
    // El avión de juguete: el gas da velocidad, el morro la quita y sube.
    const racha = (r() - 0.5) * 1.5;
    const quiereAcel = 6 * (gas - 0.5) - 2.2 * morro + racha;
    aceleracion += (quiereAcel - aceleracion) * Math.min(1, PASO / 1.5);
    kt += aceleracion * PASO;
    const quiereVertical = RITMO + 500 * morro + 250 * (gas - 0.5) + (kt - MARCA) * 4 + (r() - 0.5) * 150;
    vertical += (quiereVertical - vertical) * Math.min(1, PASO / 1.2);
    pies += ((vertical - RITMO) / 60) * PASO;
    const d = desvioEnLaBajada(pies * 0.3048, (RITMO * 0.3048) / 60);
    velocidad = juzgarVelocidad(kt, velocidad);
    senda = juzgarLaSenda(d, senda);
    const l: Lectura = {
      activo: true,
      velocidad,
      velocidadMuyFuera: Math.abs(kt - MARCA) > 30,
      senda,
      sendaMuyFuera: Math.abs(pies) > 400,
      kt,
      aceleracion,
      vertical,
      verticalObjetivo: RITMO,
      desvio: d.puntos,
      quedaGas: gas > 0.05,
      puedeFrenar: true,
      dt: PASO,
    };
    traza.push({ t: ahora, kt, aceleracion, vertical, desvio: d.puntos, velocidad, senda });
    const p = consejero.paso(l);
    if (!p || p === "bien") continue;
    dichos.push({ t: ahora, c: p, l });
    // Quien vuela: a veces no hace caso, a veces se pasa del doble.
    if (r() < 0.2) continue;
    const cuanto = 0.5 + r() * 1.5;
    const tarda = 0.8 + r() * 2.5;
    const hacer: Record<Accion, () => void> = {
      masGas: () => (gas = Math.min(1, gas + 0.15 * cuanto)),
      menosGas: () => (gas = Math.max(0, gas - 0.15 * cuanto)),
      frenar: () => (gas = Math.max(0, gas - 0.1 * cuanto)),
      narizArriba: () => (morro += 0.35 * cuanto),
      narizAbajo: () => (morro -= 0.35 * cuanto),
    };
    pendiente.push({ cuando: ahora + tarda, hacer: hacer[p.accion] });
  }
  return { dichos, traza };
}

/**
 * **Si el avión respondió a un consejo entre dos instantes**, medido en la
 * traza y con los mismos listones que usa el consejero —pero sin preguntarle
 * a él—.
 */
function respondioEntre(c: Consejo, traza: readonly Instante[], desde: number, hasta: number): boolean {
  const tramo = traza.filter((x) => x.t >= desde && x.t <= hasta);
  const al = tramo[0];
  if (!al) return false;
  return tramo.some((x) => {
    switch (c.accion) {
      case "masGas":
        return x.aceleracion > RESPONDE_ACELERACION || x.kt - al.kt > RESPONDE_KT;
      case "menosGas":
      case "frenar":
        return x.aceleracion < -RESPONDE_ACELERACION || al.kt - x.kt > RESPONDE_KT;
      case "narizArriba":
        return (
          x.vertical - al.vertical > RESPONDE_VERTICAL ||
          Math.abs(x.desvio) < Math.abs(al.desvio) - RESPONDE_DESVIO
        );
      case "narizAbajo":
        return (
          al.vertical - x.vertical > RESPONDE_VERTICAL ||
          Math.abs(x.desvio) < Math.abs(al.desvio) - RESPONDE_DESVIO
        );
    }
  });
}

describe("una final con errores", () => {
  const VUELTAS = 60;

  it("nunca dos consejos contrarios seguidos sin que el avión haya respondido", () => {
    let pares = 0;
    let contrariosConRespuesta = 0;
    for (let semilla = 1; semilla <= VUELTAS; semilla++) {
      const { dichos, traza } = volarUnaFinal(semilla);
      for (let i = 1; i < dichos.length; i++) {
        const a = dichos[i - 1]!;
        const b = dichos[i]!;
        pares++;
        if (!contrarias(a.c.accion, b.c.accion)) continue;
        expect(
          respondioEntre(a.c, traza, a.t, b.t),
          `vuelta ${semilla}: ${a.c.accion} a los ${a.t.toFixed(1)} s y ${b.c.accion} a los ${b.t.toFixed(1)} s`,
        ).toBe(true);
        contrariosConRespuesta++;
      }
    }
    // Que la prueba de verdad haya visto consejos, y contrarios, y no haya
    // pasado por no tener nada que mirar.
    expect(pares).toBeGreaterThan(VUELTAS);
    expect(contrariosConRespuesta).toBeGreaterThan(0);
  });

  it("cada consejo nombra una acción, y lento nunca es subir el morro", () => {
    let vistos = 0;
    for (let semilla = 1; semilla <= VUELTAS; semilla++) {
      const { dichos } = volarUnaFinal(semilla);
      for (const { c, l } of dichos) {
        vistos++;
        expect(ACCIONES).toContain(c.accion);
        const f = fraseDe(c, "papi", "flaps");
        const texto = f.nueva
          ? t(f.nueva as TranslationKey)
          : textoDe(f.grabadas[0]!.clave, f.grabadas[0]!.forma);
        expect(texto).toMatch(ACCION_NOMBRADA);
        if (l.velocidad === "lento") expect(c.accion).not.toBe("narizArriba");
      }
    }
    expect(vistos).toBeGreaterThan(VUELTAS);
  });

  it("y no hace de loro: el mismo consejo dos veces seguidas, solo si se arregló entre medias o fue a peor", () => {
    let repetidos = 0;
    for (let semilla = 1; semilla <= VUELTAS; semilla++) {
      const { dichos, traza } = volarUnaFinal(semilla);
      for (let i = 1; i < dichos.length; i++) {
        const a = dichos[i - 1]!;
        const b = dichos[i]!;
        if (a.c.accion !== b.c.accion || a.c.motivo !== b.c.motivo) continue;
        repetidos++;
        const entre = traza.filter((x) => x.t > a.t && x.t < b.t);
        const m = a.c.motivo;
        const seArreglo = entre.some((x) =>
          m === "lento" || m === "rapido"
            ? x.velocidad !== m
            : m === "alto" || m === "bajo"
              ? x.senda !== m
              : true,
        );
        const empeoro =
          (!!b.l.velocidadMuyFuera && !a.l.velocidadMuyFuera) ||
          (!!b.l.sendaMuyFuera && !a.l.sendaMuyFuera);
        expect(
          seArreglo || empeoro,
          `vuelta ${semilla}: ${b.c.accion} otra vez a los ${b.t.toFixed(1)} s`,
        ).toBe(true);
      }
    }
    void repetidos;
  });
});

describe("lo que ya pidió el paso siguiente", () => {
  it("no se repite como consejo: la marca bajó, se dijo «frená» y no se oye detrás «menos gas»", () => {
    const consejero = new ConsejoDeLaBajada();
    // La cadena del «¿y ahora qué?» acaba de pedir frenar a la marca nueva.
    const rapida = base({ velocidad: "rapido", velocidadMuyFuera: true, kt: 212, marca: 182 });
    consejero.anotar({ accion: "menosGas", motivo: "rapido" }, rapida);
    // Y la velocidad sigue lejos de la marca un buen rato, sin que el avión
    // haya respondido todavía: la instructora calla.
    for (let i = 0; i < 200; i++) expect(consejero.paso(rapida)).toBeNull();
  });

  it("ni va detrás lo contrario sin que el avión haya respondido", () => {
    const consejero = new ConsejoDeLaBajada();
    consejero.anotar({ accion: "menosGas", motivo: "rapido" }, base({ kt: 212 }));
    // De golpe «lento» —un bache, la marca que se mueve—: sin respuesta al
    // «menos gas», no sale «más gas».
    const lenta = base({ velocidad: "lento", kt: 212, aceleracion: 0 });
    for (let i = 0; i < 200; i++) expect(consejero.paso(lenta)).toBeNull();
  });

  it("y no se celebra: no fue una corrección, fue el paso siguiente", () => {
    const consejero = new ConsejoDeLaBajada();
    consejero.anotar(
      { accion: "menosGas", motivo: "rapido" },
      base({ velocidad: "rapido", kt: 212 }),
    );
    // El avión responde y llega a la marca.
    const llega = base({ velocidad: "bien", kt: 180, aceleracion: -1 });
    for (let i = 0; i < 50; i++) expect(consejero.paso(llega)).not.toBe("bien");
  });
});

/**
 * **«Estás por encima de la senda, bajá un poquito» cuando ya se estaba
 * llegando a ella.** Enrique, con el JAZ 120: «avisa que estoy por encima
 * cuando la estaba ya tocando». Dentro de un punto de la senda se está
 * estabilizado —es el margen de la regla de verdad—, y lo que ya va hacia el
 * medio no se dice. Y el rombo de la pantalla y la instructora miden la misma
 * senda, con el mismo punto.
 */
describe("la senda que ya se está cogiendo", () => {
  const PUNTO = 0.35;
  /** Una final de puntos que van de `desde` a `hasta` en `segundos`. */
  function bajandoALaSenda(desde: number, hasta: number, segundos: number, vertical = -850) {
    const consejero = new ConsejoDeLaBajada();
    let senda: Senda | null = null;
    const dichos: { t: number; desvio: number; c: Consejo }[] = [];
    const paso = 0.1;
    for (let t = 0; t <= segundos; t += paso) {
      const desvio = desde + ((hasta - desde) * t) / segundos;
      const d = {
        modo: "final" as const,
        metros: 0,
        puntos: desvio,
        grados: desvio * PUNTO,
        ritmo: -3.8,
      };
      senda = juzgarLaSenda(d, senda);
      const p = consejero.paso(
        base({ senda, desvio, vertical, verticalObjetivo: -750, dt: paso }),
      );
      if (p && p !== "bien") dichos.push({ t, desvio, c: p });
    }
    return dichos;
  }

  it("dentro de un punto no se avisa, aunque el rombo se quede ahí", () => {
    expect(bajandoALaSenda(0.95, 0.95, 30, -750)).toEqual([]);
    expect(bajandoALaSenda(-0.95, -0.95, 30, -650)).toEqual([]);
  });

  it("entrando a la senda desde arriba a un ritmo normal, ningún «por encima»", () => {
    // Un punto y medio por encima, cogiéndola en un minuto: tres centésimas
    // de punto por segundo, bajando cien pies por minuto más que la senda.
    const dichos = bajandoALaSenda(1.6, -0.1, 57);
    expect(dichos.filter((d) => d.c.accion === "narizAbajo")).toEqual([]);
  });

  it("pero más de un punto por encima y sin ir hacia ella, sí: una vez", () => {
    const dichos = bajandoALaSenda(1.5, 1.5, 20, -750);
    expect(dichos.map((d) => d.c.accion)).toEqual(["narizAbajo"]);
  });

  it("y el rombo y la instructora miden el mismo punto", () => {
    // Un punto del rombo es el umbral de la instructora, en la final.
    const justoDentro = { modo: "final" as const, metros: 0, puntos: 0.99, grados: 0.99 * PUNTO, ritmo: -3.8 };
    const justoFuera = { ...justoDentro, puntos: 1.01, grados: 1.01 * PUNTO };
    expect(juzgarLaSenda(justoDentro, null)).toBe("bien");
    expect(juzgarLaSenda(justoFuera, null)).toBe("alto");
    expect(juzgarLaSenda({ ...justoFuera, puntos: -1.01, grados: -1.01 * PUNTO }, null)).toBe("bajo");
  });
});

