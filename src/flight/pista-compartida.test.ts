/**
 * **La pista es una, y se turna**: la frecuencia, los aviones dibujados y tu
 * vuelo, juntos.
 *
 * Las pruebas de `radio.test.ts` miran la frecuencia sola y las de
 * `world/trafico.test.ts` el dibujo solo. Lo que se rompía estaba entre los
 * dos, y entre ellos y tu vuelo: la torre mandaba al aire al que tenía el
 * «cleared to land» para dártela a vos en el punto de espera; el que venía
 * sin permiso bajaba igual a tu pista porque el dibujo no sabía de permisos;
 * «pista libre» se decía con el avión todavía rodando por ella; y «en final»
 * con el avión en la base, donde gira a final quien vuela el circuito del
 * juego, que quedaba de número dos detrás de un avión que se veía a su lado.
 *
 * Aquí se montan las tres cosas con **el mismo turno de pista que usa el
 * juego** —ver `flight/turno-de-pista.ts`—, y no con una copia del cableado:
 * con una copia, si el juego dejaba de hacer algo, la prueba seguía en verde.
 * Y se vuela por encima el ciclo de quien juega, con cuatrocientas frecuencias
 * sorteadas.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia, type Transmision } from "./radio";
import { TurnoDePista, type DibujoDelTurno } from "./turno-de-pista";
import { crearTrafico } from "../world/trafico";
import { BASE_A_FINAL, type Pista } from "../world/circuito";
import { GLIDE_SLOPE } from "../world/runway-guide";

const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 2400 };
const COTA = 100;
const PASO = 0.5;
/** Lo que tarda la torre en mirarte en la raya. Ver `TORRE_TARDA` en `vuelo.ts`. */
const TORRE_TARDA = 2.2;
/** A cuánto se acerca al umbral una avioneta en final, m/s. */
const APROXIMACION = 33;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Lo que se oye, con su instante y la matrícula a la que va. */
interface Oido {
  readonly t: number;
  readonly clave: string;
  readonly de: string;
}

/** La frecuencia, su dibujo y tu turno, como los monta `game.ts`. */
function aeropuerto(semilla: number) {
  const radio = new Frecuencia(dados(semilla), "GCXO");
  const trafico = crearTrafico(PISTA, COTA, "ala-alta");
  const oido: Oido[] = [];
  /** Llamadas dichas con el avión todavía lejos de donde dicen. */
  const dichasAntes: string[] = [];
  /** Los que llegaron a la decisión sin permiso y se fueron al aire. */
  const seFueron: string[] = [];
  /** Tu avión: cuánto le queda al umbral de aterrizar y a qué altura va. */
  const yo = { alUmbral: Infinity, alto: 1000 };
  /** Tus «cleared to land», con lo que había sin anular al sonar. */
  const autorizaciones: { t: number; sinAnular: string[] }[] = [];
  /** Cuándo te mandó la torre al aire por la pista ocupada. */
  const alAire: number[] = [];
  let t = 0;

  /**
   * Los permisos a otros **que se oyeron y no se han anulado de viva voz**.
   * Es lo que no puede quedar cuando suena tu autorización.
   */
  const permisosSinAnular = (): string[] => {
    const abiertos = new Map<string, string>();
    for (const o of oido) {
      if (o.clave === "torre.lineUpWait" || o.clave === "torre.clearedLand")
        abiertos.set(o.de, o.clave);
      if (
        o.clave === "torre.clearedTakeoff" ||
        o.clave === "torre.goAround" ||
        o.clave === "otro.pistaLibre"
      )
        abiertos.delete(o.de);
    }
    return [...abiertos].map(([de, clave]) => `${de} ${clave}`);
  };

  /**
   * El dibujo, mirando si quien habla está ya donde dice, **con su propia
   * cuenta**: la del turno es la que se prueba. «Pista libre», fuera de la
   * pista; «en final», en la prolongación del eje y no en la base, que corre
   * a mil metros de él.
   */
  const dibujo: DibujoDelTurno = {
    anuncia(m, clave, puede) {
      const visto = trafico.quienes().find((a) => a.matricula === m);
      const fueraDelEje = !!visto && Math.abs(visto.z - PISTA.z) > 30;
      if (
        (clave === "otro.pistaLibre" && trafico.sigueEnLaPista(m)) ||
        (clave === "otro.final" && fueraDelEje)
      )
        dichasAntes.push(`${t} s ${m} ${clave}`);
      trafico.anuncia(m, clave, puede);
    },
    paso(dt) {
      const idos = trafico.paso(dt);
      seFueron.push(...idos);
      return idos;
    },
    todaviaNo: (m, clave) => trafico.todaviaNo(m, clave),
    enFinal: (m) => trafico.enFinal(m),
  };

  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false },
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    alUmbral: () => yo.alUmbral,
    alto: () => yo.alto,
    decirAOtro(d) {
      oido.push({ t, clave: d.clave, de: d.de.matricula });
      return null;
    },
    autorizarte: () => autorizaciones.push({ t, sinAnular: permisosSinAnular() }),
    mandarteAlAire: () => alAire.push(t),
  });

  return {
    radio,
    trafico,
    turno,
    oido,
    dichasAntes,
    seFueron,
    yo,
    autorizaciones,
    alAire,
    permisosSinAnular,
    get t() {
      return t;
    },
    /** Pasa el tiempo en la frecuencia, como en `actualizarAmbiente`. */
    paso(fase: string): Transmision | null {
      const dice = turno.oir(PASO, { fase, deDia: true, instructorHablando: false });
      t += PASO;
      if (dice) oido.push({ t, clave: dice.clave, de: dice.de.matricula });
      return dice;
    },
    /**
     * Los que vienen a aterrizar y están sobre tu pista, o bajando a ella, por
     * debajo de treinta metros. Mientras es tuya no puede haber ninguno.
     */
    bajandoATuPista(): string[] {
      const umbral = PISTA.x - PISTA.length / 2;
      return trafico
        .quienes()
        .filter(
          (a) =>
            a.llegando &&
            a.x > umbral - 1500 &&
            a.x < umbral + PISTA.length &&
            Math.abs(a.z - PISTA.z) < 30 &&
            a.y - COTA < 30,
        )
        .map((a) => `${a.matricula} a ${Math.round(a.y - COTA)} m`);
    },
  };
}

describe("saliendo: la torre te deja en la roja y aterriza el que viene", () => {
  /*
   * Medido antes de arreglarlo, con este mismo ciclo: al ponerse la lámpara
   * en verde, en 121 de 400 frecuencias la torre mandaba a alguien al aire
   * para dártela a vos, 44 de ellos ya en final con su permiso.
   */
  function salir(semilla: number) {
    const a = aeropuerto(semilla);
    const azar = dados(semilla * 7919);
    const rodar = 20 + azar() * 900;
    while (a.t < rodar) a.paso("rodando");
    const alLlegar = a.radio.ocupanLaPista.length;
    const porQue = a.turno.porQueEsperas;
    // En la raya: la torre te mira solo con la pista libre. Ver `Vuelo`.
    let mirando = 0;
    const desde = a.t;
    const oidoAlLlegar = a.oido.length;
    while (mirando <= TORRE_TARDA && a.t - desde < 1200) {
      mirando = a.turno.pistaDeOtros ? 0 : mirando + PASO;
      a.paso("esperando");
    }
    const hablaronEsperando = a.oido.slice(oidoAlLlegar);
    const antes = a.oido.length;
    a.turno.alSerTuya("autorizado");
    return {
      a,
      alLlegar,
      porQue,
      espera: a.t - desde,
      alVerde: a.oido.slice(antes),
      hablaronEsperando,
      sinAnular: a.permisosSinAnular(),
    };
  }

  it("con la verde nadie tiene que irse al aire, y ningún permiso queda sin anular", () => {
    let conAlguien = 0;
    const mal: string[] = [];
    const esperas: number[] = [];
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = salir(semilla);
      if (r.alLlegar) conAlguien++;
      esperas.push(r.espera);
      if (r.alVerde.length)
        mal.push(
          `semilla ${semilla}: ${r.alVerde.map((d) => `${d.de} ${d.clave}`).join(", ")}`,
        );
      if (r.sinAnular.length) mal.push(`semilla ${semilla}: ${r.sinAnular.join(", ")}`);
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
    // El instrumento ve el caso: muchas veces había alguien al llegar.
    expect(conAlguien).toBeGreaterThan(50);
    // Y la espera se acaba: nadie se queda en la roja para siempre.
    esperas.sort((x, y) => x - y);
    expect(esperas[esperas.length - 1]).toBeLessThan(400);
  });

  it("mientras esperas, habla quien ocupa la pista, y solo él", () => {
    let hablaron = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = salir(semilla);
      if (r.alLlegar) hablaron += r.hablaronEsperando.length ? 1 : 0;
      r.a.trafico.dispose();
    }
    expect(hablaron).toBeGreaterThan(50);
  });

  /*
   * La roja podía durar tres minutos con un «hold short» a secas. Cuando se
   * espera por alguien, hay un porqué que decir; cuando no, no se inventa.
   */
  it("y si esperas por alguien, la torre sabe por quién", () => {
    let aterrizando = 0;
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = salir(semilla);
      if (!!r.alLlegar !== (r.porQue !== null))
        mal.push(`semilla ${semilla}: ${r.alLlegar} ocupan y el porqué es ${r.porQue}`);
      if (r.porQue === "aterriza") aterrizando++;
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
    expect(aterrizando).toBeGreaterThan(20);
  });

  it("y «pista libre» se dice fuera de la pista", () => {
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 200; semilla++) {
      const r = salir(semilla);
      // Un rato más de frecuencia normal, para ver más llegadas.
      for (let i = 0; i < 1200; i++) r.a.paso("en-vuelo");
      mal.push(
        ...r.a.dichasAntes
          .filter((x) => x.endsWith("otro.pistaLibre"))
          .map((x) => `semilla ${semilla}: ${x}`),
      );
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
  });

  it("y «en final» se dice en final, no en la base", () => {
    const mal: string[] = [];
    let finales = 0;
    for (let semilla = 1; semilla <= 200; semilla++) {
      const r = salir(semilla);
      for (let i = 0; i < 1200; i++) r.a.paso("en-vuelo");
      finales += r.a.oido.filter((o) => o.clave === "otro.final").length;
      mal.push(
        ...r.a.dichasAntes
          .filter((x) => x.endsWith("otro.final"))
          .map((x) => `semilla ${semilla}: ${x}`),
      );
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
    expect(finales).toBeGreaterThan(50);
  });
});

describe("llegando: nadie baja a tu pista, y lo que se oyó se anula antes que lo tuyo", () => {
  /*
   * El que había cantado final sin permiso seguía bajando delante de ti hasta
   * once metros; el que esperaba su «cleared to land» en el viento en cola
   * entraba en final detrás de ti y bajaba hasta veintitrés. Y el que iba
   * delante en final con su permiso se iba al aire para dártela.
   *
   * Tu avión entra en final donde la entra el circuito del juego —ver
   * `BASE_A_FINAL`— y baja por la senda a velocidad de avioneta: si el que
   * va delante no deja la pista antes de tu altura de decisión, la torre te
   * manda al aire, y eso también vale.
   */
  function aterrizar(semilla: number) {
    const a = aeropuerto(semilla);
    const azar = dados(semilla * 104729);
    const volar = 20 + azar() * 900;
    while (a.t < volar) a.paso("en-vuelo");
    a.yo.alUmbral = BASE_A_FINAL;
    a.yo.alto = BASE_A_FINAL * Math.tan(GLIDE_SLOPE);
    // Quién se ve con permiso en final delante de ti, al entrar.
    const vistosDelante = a.radio.conLaPista
      .filter((c) => c.orden === "torre.clearedLand")
      .map((c) => c.matricula)
      .filter((m) => (a.trafico.enFinal(m) ?? Infinity) < BASE_A_FINAL);
    const entra = a.t;
    a.turno.alSerTuya("final");
    a.turno.pedirAterrizaje();
    const delante = a.turno.vaDelante;
    const delanteAlEntrar = delante ? a.trafico.enFinal(delante) : null;
    const mal: string[] = [];
    let fase = "final";
    let tocado = 0;
    while (a.t < volar + 200) {
      a.paso(fase);
      a.turno.paso(fase);
      if (a.turno.laPistaEsTuya(fase))
        mal.push(...a.bajandoATuPista().map((x) => `${fase} ${a.t} s: ${x}`));
      if (fase === "final") {
        // Te mandaron al aire: subes, dejas la final, y aquí se acaba.
        if (a.alAire.length) break;
        a.yo.alUmbral -= APROXIMACION * PASO;
        a.yo.alto = Math.max(0, a.yo.alUmbral * Math.tan(GLIDE_SLOPE));
        if (a.yo.alUmbral <= 0) {
          fase = "aterrizado";
          tocado = a.t;
        }
      } else if (fase === "aterrizado" && a.t - tocado > 20) fase = "abandonando";
      else if (fase === "abandonando" && a.t - tocado > 60) break;
    }
    return { a, entra, delante, delanteAlEntrar, vistosDelante, mal };
  }

  it("mientras es tuya, nadie que venga a aterrizar baja a ella", () => {
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = aterrizar(semilla);
      mal.push(...r.mal.map((x) => `semilla ${semilla}, ${x}`));
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
  });

  it("y cuando suena tu autorización, lo que se le dio a otro ya se anuló de viva voz", () => {
    const mal: string[] = [];
    let conDelante = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = aterrizar(semilla);
      if (r.delante) conDelante++;
      for (const x of r.a.autorizaciones)
        if (x.sinAnular.length)
          mal.push(`semilla ${semilla}, ${x.t} s: ${x.sinAnular.join(", ")}`);
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
    // Y el caso del que va delante pasa, no solo en teoría.
    expect(conDelante).toBeGreaterThan(5);
  });

  it("y tu «cleared to land» suena una vez, o la torre te manda al aire", () => {
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = aterrizar(semilla);
      const veces = r.a.autorizaciones.length + r.a.alAire.length;
      if (veces !== 1)
        mal.push(
          `semilla ${semilla}: ${r.a.autorizaciones.length} autorizaciones y ${r.a.alAire.length} al aire`,
        );
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
  });

  it("al que va delante en final con su permiso no se le manda al aire", () => {
    let vistos = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = aterrizar(semilla);
      if (r.delante) {
        vistos++;
        // Desde que entras en final: antes pudo irse al aire por su cuenta.
        const alAire = r.a.oido.filter(
          (o) => o.t >= r.entra && o.de === r.delante && o.clave === "torre.goAround",
        );
        expect(alAire, `semilla ${semilla}`).toEqual([]);
      }
      r.a.trafico.dispose();
    }
    expect(vistos).toBeGreaterThan(5);
  });

  /*
   * **Y va delante el que se ve delante.** Se decidía por el guion, y el que
   * cantaba final estaba en la base, donde gira a final quien vuela el
   * circuito del juego: la torre te dejaba de número dos detrás de un avión
   * que se veía a tu lado, y a veces te mandaba al aire para dejarle a él.
   */
  it("y el que va delante se ve en final, delante de ti", () => {
    const mal: string[] = [];
    let vistos = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = aterrizar(semilla);
      if (r.delante) {
        vistos++;
        if (r.delanteAlEntrar === null || r.delanteAlEntrar >= BASE_A_FINAL)
          mal.push(`semilla ${semilla}: ${r.delante} a ${r.delanteAlEntrar} m del umbral`);
      }
      // Y si se veía a alguien con permiso delante, no se le quitó la pista.
      if (r.vistosDelante.length && !r.vistosDelante.includes(r.delante ?? ""))
        mal.push(`semilla ${semilla}: se veía delante a ${r.vistosDelante.join(", ")}`);
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
    expect(vistos).toBeGreaterThan(5);
  });
});

describe("el que llega sin permiso y no lo recibe, se va al aire y la frecuencia lo sabe", () => {
  it("no se le dice después ni un «go around» a destiempo ni un «cleared to land» que ya no vale", () => {
    /*
     * Medido antes en Gando: «otro.final» a los 146,8 s, tu «cleared to land»
     * a los 152,1, y el «go around» a ése a los 181,2, con vos ya en tierra.
     * Y el del viento en cola recibía su permiso después de haber bajado a
     * tu pista sin él.
     */
    let seFueron = 0;
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 400; semilla++) {
      const a = aeropuerto(semilla);
      const azar = dados(semilla * 31);
      const volar = 20 + azar() * 600;
      while (a.t < volar) a.paso("en-vuelo");
      // Tu final larga: la pista es tuya, sin nadie delante, y nadie recibe
      // permiso.
      a.turno.alSerTuya("");
      const antes = a.oido.length;
      for (let s = 0; s < 150; s += PASO) a.paso("final");
      for (const o of a.oido.slice(antes))
        mal.push(`semilla ${semilla}: ${o.de} ${o.clave} en final`);
      const idos = new Set(a.seFueron);
      if (!idos.size) {
        a.trafico.dispose();
        continue;
      }
      seFueron += idos.size;
      // Lo primero que se les oye después es su vuelta al circuito.
      const primera = new Map<string, string>();
      for (let s = 0; s < 400; s += PASO) {
        const d = a.paso("a-plataforma");
        if (d && idos.has(d.de.matricula) && !primera.has(d.de.matricula))
          primera.set(d.de.matricula, d.clave);
      }
      for (const [m, clave] of primera)
        if (clave !== "otro.enCola")
          mal.push(`semilla ${semilla}: ${m} oyó primero ${clave} después de irse`);
      a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
    expect(seFueron).toBeGreaterThan(20);
  });
});
