/**
 * **La pista es una, y se turna**: la frecuencia, los aviones dibujados y tu
 * vuelo, juntos.
 *
 * Las pruebas de `radio.test.ts` miran la frecuencia sola y las de
 * `world/trafico.test.ts` el dibujo solo. Lo que se rompía estaba entre los
 * dos, y entre ellos y tu vuelo: la torre mandaba al aire al que tenía el
 * «cleared to land» para dártela a vos en el punto de espera; el que venía
 * sin permiso bajaba igual a tu pista porque el dibujo no sabía de permisos; y
 * «pista libre» se decía con el avión todavía rodando por ella.
 *
 * Así que aquí se montan las tres cosas como las monta `game.ts` —la
 * frecuencia habla, el dibujo se mueve, los que llegan a la decisión sin
 * permiso se van al aire y la frecuencia lo apunta— y se vuela el ciclo de
 * quien juega por encima, con cuatrocientas frecuencias sorteadas.
 */
import { describe, expect, it } from "vitest";
import {
  Frecuencia,
  laQueSeDice,
  PISTA_TUYA,
  type Momento,
  type Transmision,
} from "./radio";
import { crearTrafico } from "../world/trafico";
import type { Pista } from "../world/circuito";

const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 2400 };
const COTA = 100;
const PASO = 0.5;
/** Lo que tarda la torre en mirarte en la raya. Ver `TORRE_TARDA` en `vuelo.ts`. */
const TORRE_TARDA = 2.2;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const momento = (fase: string, esperandoLaPista = false): Momento => ({
  fase,
  deDia: true,
  instructorHablando: false,
  esperandoLaPista,
});

/** Lo que se oye, con su instante y la matrícula a la que va. */
interface Oido {
  readonly t: number;
  readonly clave: string;
  readonly de: string;
}

/**
 * La frecuencia y su dibujo, cableados como en `game.ts`: ver el bloque de la
 * radio en `actualizarAmbiente` y `quitarleLaPistaALosDemas`.
 */
function aeropuerto(semilla: number) {
  const radio = new Frecuencia(dados(semilla), "GCXO");
  const trafico = crearTrafico(PISTA, COTA, "ala-alta");
  radio.sigueEnLaPista = (m) => trafico.sigueEnLaPista(m);
  const oido: Oido[] = [];
  /** «Pista libre» dichas con el avión todavía en la pista. */
  const libreEnLaPista: string[] = [];
  /** Los que llegaron a la decisión sin permiso y se fueron al aire. */
  const seFueron: string[] = [];
  let t = 0;
  const anunciar = (d: Transmision) =>
    trafico.anuncia(d.de.matricula, d.clave, radio.puedeAterrizar(d.de.matricula));
  return {
    radio,
    trafico,
    oido,
    libreEnLaPista,
    seFueron,
    get t() {
      return t;
    },
    paso(m: Momento): Transmision | null {
      let alAire: Transmision | null = null;
      for (const x of trafico.paso(PASO)) {
        seFueron.push(x);
        alAire = radio.seFueAlAire(x, m) ?? alAire;
      }
      const dice = radio.update(PASO, m) ?? alAire;
      t += PASO;
      if (!dice) return null;
      if (dice.clave === "otro.pistaLibre" && trafico.sigueEnLaPista(dice.de.matricula))
        libreEnLaPista.push(`${t} s ${dice.de.matricula}`);
      anunciar(dice);
      oido.push({ t, clave: dice.clave, de: dice.de.matricula });
      return dice;
    },
    /** La pista pasa a ser tuya. Se dice una; el resto pasa callado. */
    tuya(respetar: string | null = null): Transmision[] {
      const dichas = radio.despejarLaPista(respetar);
      for (const d of dichas) anunciar(d);
      const dicha = laQueSeDice(dichas);
      if (dicha) oido.push({ t, clave: dicha.clave, de: dicha.de.matricula });
      return dichas;
    },
    /**
     * Los permisos a otros **que se oyeron y no se han anulado de viva voz**.
     * Es lo que no puede quedar cuando suena tu autorización.
     */
    permisosSinAnular(): string[] {
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
    while (a.t < rodar) a.paso(momento("rodando"));
    const alLlegar = a.radio.ocupanLaPista.length;
    // En la raya: la torre te mira solo con la pista libre. Ver `Vuelo`.
    let mirando = 0;
    const desde = a.t;
    const oidoAlLlegar = a.oido.length;
    while (mirando <= TORRE_TARDA && a.t - desde < 1200) {
      mirando = a.radio.ocupanLaPista.length ? 0 : mirando + PASO;
      a.paso(momento("esperando", true));
    }
    const hablaronEsperando = a.oido.slice(oidoAlLlegar);
    const alVerde = a.tuya();
    return {
      a,
      alLlegar,
      espera: a.t - desde,
      alVerde,
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
          `semilla ${semilla}: ${r.alVerde.map((d) => `${d.de.matricula} ${d.clave}`).join(", ")}`,
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

  it("mientras esperás, habla quien ocupa la pista, y solo él", () => {
    let hablaron = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = salir(semilla);
      if (r.alLlegar) hablaron += r.hablaronEsperando.length ? 1 : 0;
      r.a.trafico.dispose();
    }
    expect(hablaron).toBeGreaterThan(50);
  });

  it("y «pista libre» se dice fuera de la pista", () => {
    const mal: string[] = [];
    for (let semilla = 1; semilla <= 200; semilla++) {
      const r = salir(semilla);
      // Un rato más de frecuencia normal, para ver más llegadas.
      for (let i = 0; i < 1200; i++) r.a.paso(momento("en-vuelo"));
      mal.push(...r.a.libreEnLaPista.map((x) => `semilla ${semilla}: ${x}`));
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
  });
});

describe("llegando: nadie baja a tu pista, y lo que se oyó se anula antes que lo tuyo", () => {
  /*
   * El que había cantado final sin permiso seguía bajando delante de ti hasta
   * once metros; el que esperaba su «cleared to land» en el viento en cola
   * entraba en final detrás de ti y bajaba hasta veintitrés. Y el que iba
   * delante en final con su permiso se iba al aire para dártela.
   */
  function aterrizar(semilla: number) {
    const a = aeropuerto(semilla);
    const azar = dados(semilla * 104729);
    const volar = 20 + azar() * 900;
    while (a.t < volar) a.paso(momento("en-vuelo"));
    const delante = a.radio.vaDelante;
    a.tuya(delante);
    const mal: string[] = [];
    let autorizado = delante === null;
    let sinAnularAlAutorizar: string[] = autorizado ? a.permisosSinAnular() : [];
    let numeroDos = delante;
    // Noventa segundos de final, veinte de carrera y cuarenta para salir.
    for (const [fase, segundos] of [
      ["final", 90],
      ["aterrizado", 20],
      ["abandonando", 40],
    ] as const) {
      for (let s = 0; s < segundos; s += PASO) {
        if (numeroDos && !a.radio.laTiene(numeroDos)) {
          // Se fue: ahora sí es tuya. Ver `autorizarCuandoToque`.
          numeroDos = null;
          a.tuya();
          if (fase === "final") {
            autorizado = true;
            sinAnularAlAutorizar = a.permisosSinAnular();
          }
        }
        a.paso(momento(fase, fase === "final" && numeroDos !== null));
        if (!numeroDos && PISTA_TUYA.has(fase))
          mal.push(...a.bajandoATuPista().map((x) => `${fase} ${s} s: ${x}`));
      }
    }
    return { a, delante, autorizado, sinAnularAlAutorizar, mal };
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
      if (r.sinAnularAlAutorizar.length)
        mal.push(`semilla ${semilla}: ${r.sinAnularAlAutorizar.join(", ")}`);
      r.a.trafico.dispose();
    }
    expect(mal.slice(0, 5)).toEqual([]);
    // Y el caso del que va delante pasa, no solo en teoría.
    expect(conDelante).toBeGreaterThan(5);
  });

  it("al que va delante en final con su permiso no se le manda al aire", () => {
    let vistos = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
      const r = aterrizar(semilla);
      if (r.delante) {
        vistos++;
        const alAire = r.a.oido.filter(
          (o) => o.de === r.delante && o.clave === "torre.goAround",
        );
        expect(alAire, `semilla ${semilla}`).toEqual([]);
      }
      r.a.trafico.dispose();
    }
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
      while (a.t < volar) a.paso(momento("en-vuelo"));
      // Tu final larga: la pista es tuya y nadie recibe permiso.
      a.tuya();
      const antes = a.oido.length;
      for (let s = 0; s < 150; s += PASO) a.paso(momento("final"));
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
        const d = a.paso(momento("a-plataforma"));
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
