/**
 * Que ningún circuito del juego se meta en el monte, **sobre el relieve de
 * verdad** de cada campo y con cada avión de la flota.
 *
 * Lo pidió el banco del vuelo entero: en Los Rodeos, con el JAZ 90, su piloto
 * volaba el circuito dibujado y acababa contra la ladera de Anaga a
 * trescientos cincuenta y siete metros sobre la pista, que es la altura del
 * circuito. El piloto del banco se abre de más en los virajes, y eso es cosa
 * suya; lo que no puede ser es que el juego dibuje y enseñe un circuito con
 * el monte **a la altura del circuito** a un radio de viraje del dibujo.
 *
 * `circuito-mano.test.ts` prueba la regla con una costa de mentira; esto
 * prueba el mundo. El relieve lo baja el navegador con `fetch`, así que aquí
 * se lee del disco, el mismo fichero: un banco que mide un mundo que no es el
 * del juego no mide nada.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, MEDIDOS, propulsionDe } from "../flight/aircraft";
import {
  alturaDelCircuito,
  altitudPublicada,
  bajadaDelVientoEnCola,
  crearCircuito,
  escalaDeCircuito,
  escalaDelCircuitoDe,
  loPublicado,
  manoPublicada,
  pasilloDelCircuito,
  SOBRE_EL_TERRENO,
} from "./circuito";
import { oaciDe, SCENARIOS, type Scenario } from "./scenarios";
import { sendaDeLaCabecera } from "./sendas-publicadas";
import { cabeceraEnUso, Terrain } from "./terrain";
import { porElCamino, TIPOS, tiposDelCampo, trazar } from "./trafico";

/*
 * El `fs` de Node pedido en marcha, como en `flaps-del-modelo.test.ts`: así no
 * hay que meter sus tipos en el `tsconfig`, y vitest corre en Node.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

const ruta = (id: string): string => `data/terrain/${id}.bin`;

/** El relieve de un escenario leído del disco, como lo dejaría `cargarRelieve`. */
function relieve(id: string): Scenario["relieve"] {
  if (!fs.existsSync(ruta(id))) return undefined;
  const b = fs.readFileSync(ruta(id));
  const datos = new Int16Array(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

const CON_RELIEVE = SCENARIOS.filter(
  (e) => e.aerodrome && fs.existsSync(ruta(e.id)),
);

/**
 * Un circuito por cada avión de la flota: su tamaño y **a qué lo vuela**.
 *
 * Eran solo los tamaños, y el pasillo se medía con la velocidad de
 * aproximación: un avión más lento que el que pasa por él. Ahora va cada uno
 * con su `velocidadDeCircuito`, que es la que ancha el pasillo. Ver
 * `pasilloDelCircuito`.
 */
const MEDIDAS = MEDIDOS.map((a) => ({
  id: a.id,
  escala: escalaDelCircuitoDe(a),
  velocidad: a.velocidadDeCircuito,
  reactor: propulsionDe(a) === "chorro",
}));

/**
 * Lo que se le perdona a la cata de la prueba frente a la del juego, m: las
 * dos miran la misma rejilla de cuarenta y tres metros con pasos distintos, y
 * en una ladera de las de Canarias eso son unos metros de diferencia.
 */
const CATA_DISTINTA = 15;

/** El campo con su relieve de verdad puesto, y su suelo. */
function elCampo(esc: Scenario) {
  const lejos = relieve(`${esc.id}-lejos`);
  const terreno = new Terrain({
    ...esc,
    relieve: relieve(esc.id),
    ...(lejos ? { relieveLejano: lejos } : {}),
  });
  return {
    cota: terreno.runwayElevation,
    suelo: (x: number, z: number) => terreno.sampleHeight(x, z),
  };
}

/**
 * Lo más alto que hay en el pasillo de los tramos a nivel, catado aquí con
 * paso propio. El pasillo es el que el juego dice que protege: un radio de
 * viraje a cada lado del viento cruzado y del viento en cola, por delante del
 * final de la subida y pasadas las esquinas. Ver `techoDelPasillo`.
 */
function peorDelPasillo(
  v: readonly { x: number; y: number; z: number }[],
  suelo: (x: number, z: number) => number,
  w: number,
): { alto: number; x: number; z: number } {
  let peor = { alto: -Infinity, x: 0, z: 0 };
  for (const [i, desde] of [
    [1, 0],
    [2, -w],
  ] as const) {
    const a = v[i]!;
    const b = v[i + 1]!;
    const largo = Math.hypot(b.x - a.x, b.z - a.z);
    const ux = (b.x - a.x) / largo;
    const uz = (b.z - a.z) / largo;
    for (let s = desde; s <= largo + w; s += 30) {
      for (let o = -w; o <= w; o += 30) {
        const x = a.x + ux * s - uz * o;
        const z = a.z + uz * s + ux * o;
        const alto = suelo(x, z);
        if (alto > peor.alto) peor = { alto, x, z };
      }
    }
  }
  return peor;
}

/** La pista del escenario por una cabecera u otra, con el nombre de esa cabecera. */
function porLasDos(esc: Scenario) {
  return [esc.runway.heading, (esc.runway.heading + 180) % 360].map((heading) => {
    const runway = { ...esc.runway, heading };
    return { runway, cabecera: cabeceraEnUso({ ...esc, runway }) };
  });
}

/** El circuito que monta el juego: con su terreno y con el lado publicado, si lo hay. */
function elCircuito(
  esc: Scenario,
  runway: Scenario["runway"],
  cabecera: string | null,
  campo: ReturnType<typeof elCampo>,
  escala: number,
  velocidad?: number,
  reactor = false,
) {
  return crearCircuito(
    runway,
    campo.cota,
    campo.suelo,
    escala,
    loPublicado(esc, cabecera, escala, reactor),
    velocidad,
  );
}

describe("ningún circuito se mete en el monte", () => {
  it("hay campos con relieve medido y aviones de varios tamaños, que si no esto no mide nada", () => {
    expect(CON_RELIEVE.length).toBeGreaterThan(10);
    expect(new Set(MEDIDAS.map((m) => m.escala)).size).toBeGreaterThan(1);
  });

  it.each(CON_RELIEVE.map((e) => [e.id, e] as const))(
    "%s: por las dos cabeceras y con toda la flota, el circuito pasa por encima de su pasillo",
    (_id, esc) => {
      const campo = elCampo(esc);
      const malos: string[] = [];
      for (const { runway, cabecera } of porLasDos(esc)) {
        for (const { id, escala, velocidad, reactor } of MEDIDAS) {
          const c = elCircuito(esc, runway, cabecera, campo, escala, velocidad, reactor);
          const altura = c.vertices[2]!.y;
          const peor = peorDelPasillo(
            c.vertices,
            campo.suelo,
            pasilloDelCircuito(escala, velocidad),
          );
          const sobra = altura - peor.alto;
          if (sobra < SOBRE_EL_TERRENO - CATA_DISTINTA)
            malos.push(
              `${cabecera} · ${id} · ` +
                `${c.forma.mano} a ${Math.round(altura - campo.cota)} m: ` +
                `el terreno a ${Math.round(sobra)} m por debajo en ` +
                `${Math.round(peor.x)},${Math.round(peor.z)}`,
            );
          c.dispose();
        }
      }
      expect(malos).toEqual([]);
    },
  );

  /*
   * **Y donde el AIP dice por dónde, por ahí.** Los de Canarias lo publican
   * del lado del mar, y en cuatro de sus cabeceras la regla del terreno se
   * quedaba en la izquierda de costumbre, tierra adentro: la 01 de
   * Fuerteventura, la 03 de Lanzarote para los reactores, la 07 de Tenerife
   * Sur y la 03L de Gando para la avioneta. El terreno sigue poniendo la
   * altura.
   */
  it.each(
    CON_RELIEVE.filter((e) => e.circuitoPublicado).map((e) => [e.id, e] as const),
  )("%s: el circuito va por el lado que publica el AIP", (_id, esc) => {
    const campo = elCampo(esc);
    const distintos: string[] = [];
    for (const { runway, cabecera } of porLasDos(esc)) {
      expect(cabecera, "una cabecera sin nombre no se puede buscar en el AIP").not.toBeNull();
      expect(esc.circuitoPublicado?.[cabecera!], `${cabecera} sin circuito publicado`).toBeDefined();
      for (const { id, escala, velocidad, reactor } of MEDIDAS) {
        const c = elCircuito(esc, runway, cabecera, campo, escala, velocidad, reactor);
        const toca = manoPublicada(esc, cabecera, escala);
        if (c.forma.mano !== toca)
          distintos.push(`${cabecera} · ${id}: ${c.forma.mano}, publica ${toca}`);
        c.dispose();
      }
    }
    expect(distintos).toEqual([]);
  });

  /*
   * **El lado, sobre el terreno y no por cabecera**: los campos que lo publican
   * lo dibujan a un lado de la pista, el mismo por las dos puntas, y lo que se
   * puede escribir al revés es la mano. De la carta de cada uno, adónde cae.
   */
  const ADONDE_CAE: Readonly<Record<string, number>> = {
    pettirossi: 90, // «sector "E"», AD 2.1-48 y 48.1
    guarani: 315, // dibujado al noroeste, AD 2.2-22
    estigarribia: 270, // dibujado al oeste, AD 2.3-16
    "pedro-juan": 270, // «sector "oeste"», AD 2.4-15
    encarnacion: 90, // «sector "este"», AD 2.5-16
    "cuatro-vientos": 180, // dibujado al sur, AD 2-LECU/LEVS-12
    "la-palma": 90,
    "tenerife-sur": 180,
    "gran-canaria": 90,
    fuerteventura: 90,
    "el-hierro": 90,
    "la-gomera": 180,
  };

  it.each(Object.entries(ADONDE_CAE))("%s: cae a %i° de la pista, por las dos cabeceras", (id, rumbo) => {
    const esc = CON_RELIEVE.find((e) => e.id === id)!;
    for (const { runway, cabecera } of porLasDos(esc)) {
      const mano = manoPublicada(esc, cabecera, 1);
      const lado = runway.heading + (mano === "derecha" ? 90 : -90);
      expect(Math.cos(((lado - rumbo) * Math.PI) / 180), `${cabecera} por la ${mano}`).toBeGreaterThan(0.7);
    }
  });

  it("y los que publican un lado y no están en la lista son solo el de los dos circuitos", () => {
    const otros = CON_RELIEVE.filter((e) => e.circuitoPublicado && !(e.id in ADONDE_CAE)).map((e) => e.id);
    expect(otros).toEqual(["lanzarote"]);
  });

  /*
   * **Y el tráfico, por el mismo que quien juega**: los dos salen de
   * `loPublicado`, y quien juega en Asunción por la 02 se cruzaría de frente con
   * un tráfico que siguiera por el oeste. En Lanzarote no: allí el AIP separa
   * las avionetas del resto, y el tipo va con los de su velocidad.
   */
  it.each(
    CON_RELIEVE.filter((e) => e.circuitoPublicado && e.id !== "lanzarote").map((e) => [e.id, e] as const),
  )("%s: el tráfico va por el mismo lado que quien juega", (_id, esc) => {
    for (const { cabecera } of porLasDos(esc)) {
      const lados = new Set([
        ...MEDIDAS.map((m) => loPublicado(esc, cabecera, m.escala, m.reactor).mano),
        ...Object.values(TIPOS).map(
          (t) => loPublicado(esc, cabecera, escalaDeCircuito(t.aproximacion), t.id === "reactor").mano,
        ),
      ]);
      expect([...lados], cabecera!).toHaveLength(1);
      expect([...lados][0]).toBeDefined();
    }
  });

  it("en Lanzarote, las avionetas por su circuito y los reactores por el suyo", () => {
    const esc = CON_RELIEVE.find((e) => e.id === "lanzarote")!;
    // Por la 03: el regular por el este, a la derecha; el ligero por el oeste.
    expect(manoPublicada(esc, "03", 1)).toBe("izquierda");
    // El E170 por el suyo aunque a la masa de la ficha cruce a 117,7 nudos: su
    // categoría es la C, la de su Vref a su máximo al aterrizar (enmienda H20e
    // del ADR 0027).
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    expect(manoPublicada(esc, "03", escalaDelCircuitoDe(jaz90))).toBe("derecha");
  });

  /*
   * **Y no pasa porque sí.** Si el terreno no le cambiara nada a ningún
   * circuito, lo de arriba solo diría que los campos son llanos. Los Rodeos
   * publica dos circuitos, el norte y el sur (AD 2-GCXO, 22.4), así que allí
   * decide el terreno: saliendo por la 30, el JAZ 120 se va al norte —por el
   * sur tiene la ladera de La Esperanza dentro de su radio de viraje— y la
   * avioneta, en su llano entre dos montes, se queda al sur pero más alta
   * que la costumbre.
   */
  it("en Los Rodeos el terreno decide: el reactor grande por el norte, la avioneta más alta", () => {
    const esc = CON_RELIEVE.find((e) => e.id === "tenerife-norte");
    expect(esc, "sin el relieve de Los Rodeos esto no mide nada").toBeDefined();
    expect(esc!.circuitoPublicado).toBeUndefined();
    const campo = elCampo(esc!);
    const por30 = porLasDos(esc!).find((p) => p.cabecera === "30")!;
    expect(por30.runway.heading).toBeCloseTo(291, -1);
    const jaz120 = AIRCRAFT.find((a) => a.id === "jaz-120")!;
    const reactor = elCircuito(
      esc!,
      por30.runway,
      "30",
      campo,
      escalaDeCircuito(jaz120.approachSpeed),
      jaz120.velocidadDeCircuito,
    );
    expect(reactor.forma.mano).toBe("derecha");
    const avioneta = elCircuito(esc!, por30.runway, "30", campo, 1);
    expect(avioneta.forma.mano).toBe("izquierda");
    expect(avioneta.forma.altura).toBeGreaterThan(alturaDelCircuito(1));
    reactor.dispose();
    avioneta.dispose();
  });
});

/**
 * **A la altitud que publica el AIP**, en los cinco campos que la publican, y
 * sin tocar la base ni la final (ADR 0014, enmienda H92).
 */
describe("el circuito, a la altitud publicada", () => {
  const CON_ALTITUD = CON_RELIEVE.filter((e) => e.altitudDelCircuito !== undefined);
  /** Los pies de la carta, para un convencional y para un reactor. */
  const PIES: Readonly<Record<string, readonly [number, number]>> = {
    pettirossi: [1500, 1800],
    estigarribia: [1700, 1700],
    "pedro-juan": [3000, 3000],
    encarnacion: [2100, 2100],
    "cuatro-vientos": [3000, 3000],
  };
  /** Donde la figura de este avión no da para bajarlos. Ver `formaDelCircuito`. */
  const NO_CABE: readonly string[] = ["encarnacion jaz-20", "encarnacion jaz-25"];

  it("son los cinco que la publican", () => {
    expect(CON_ALTITUD.map((e) => e.id).sort()).toEqual(Object.keys(PIES).sort());
  });

  it.each(CON_ALTITUD.map((e) => [e.id, e] as const))(
    "%s: el altímetro marca lo de la carta, y la base y la final son las de siempre",
    (id, esc) => {
      const campo = elCampo(esc);
      const sinCaber = new Set<string>();
      for (const p of porLasDos(esc)) {
        const senda = (sendaDeLaCabecera(oaciDe(esc), p.cabecera) * Math.PI) / 180;
        const runway = { ...p.runway, senda };
        for (const { id: avion, velocidad, reactor } of MEDIDAS) {
          const ficha = MEDIDOS.find((a) => a.id === avion)!;
          const escala = escalaDelCircuitoDe(ficha, runway);
          const dicho = `${p.cabecera} · ${avion}`;
          const con = elCircuito(esc, runway, p.cabecera, campo, escala, velocidad, reactor);
          const sin = crearCircuito(
            runway,
            campo.cota,
            campo.suelo,
            escala,
            { mano: manoPublicada(esc, p.cabecera, escala) },
            velocidad,
          );
          const [a, b] = [con.vertices, sin.vertices];
          const publicados = PIES[id]![reactor ? 1 : 0];
          const pies = a[2]!.y / 0.3048;
          if (Math.abs(pies - publicados) > 1) sinCaber.add(`${id} ${avion}`);
          if (Math.abs(pies - publicados) > 1) expect(con.forma, dicho).toEqual(sin.forma);
          // La línea por el suelo es la misma, y la entrada en final también.
          a.forEach((v, i) => {
            expect(v.x, dicho).toBeCloseTo(b[i]!.x, 6);
            expect(v.z, dicho).toBeCloseTo(b[i]!.z, 6);
          });
          expect(a[4]!.y, dicho).toBeCloseTo(b[4]!.y, 6);
          // La base baja, y nunca más empinada que sin la altitud.
          expect(a[3]!.y - a[4]!.y, dicho).toBeGreaterThan(0);
          expect(a[3]!.y, dicho).toBeLessThanOrEqual(b[3]!.y + 1e-6);
          // Con la publicada por encima, ningún tramo va más bajo que sin ella.
          if (con.forma.enLaBase !== undefined) {
            expect(a[1]!.y, dicho).toBeGreaterThanOrEqual(b[1]!.y - 1e-6);
            expect(a[2]!.y, dicho).toBeGreaterThan(b[2]!.y);
            expect(a[3]!.y, dicho).toBeCloseTo(b[3]!.y, 6);
            // Se sube al mismo paso por el eje y por el viento cruzado, o menos.
            const sube = (i: number) =>
              (a[i]!.y - a[i - 1]!.y) / Math.hypot(a[i]!.x - a[i - 1]!.x, a[i]!.z - a[i - 1]!.z);
            expect(sube(2), dicho).toBeLessThanOrEqual(sube(1) + 1e-6);
            // Y se baja por la senda, del través del centro de la pista en adelante.
            const baja = bajadaDelVientoEnCola(a, senda)!;
            expect(baja, dicho).not.toBeNull();
            const antes = Math.hypot(baja.x - a[3]!.x, baja.z - a[3]!.z);
            expect((baja.y - a[3]!.y) / antes, dicho).toBeCloseTo(Math.tan(senda), 6);
            const h = (runway.heading * Math.PI) / 180;
            const delante = (baja.x - runway.x) * Math.sin(h) - (baja.z - runway.z) * Math.cos(h);
            expect(delante, dicho).toBeLessThanOrEqual(1e-6);
          }
          con.dispose();
          sin.dispose();
        }
      }
      expect([...sinCaber].sort()).toEqual(NO_CABE.filter((x) => x.startsWith(`${id} `)));
    },
  );

  it("el reactor de Asunción, trescientos pies por encima de los de hélice", () => {
    const esc = CON_ALTITUD.find((e) => e.id === "pettirossi")!;
    expect(altitudPublicada(esc, false)).toBeCloseTo(1500 * 0.3048, 6);
    expect(altitudPublicada(esc, true)).toBeCloseTo(1800 * 0.3048, 6);
    // El JAZ 50 y el JAZ 60 son turbohélices: convencionales.
    const reactores = MEDIDAS.filter((m) => m.reactor).map((m) => m.id);
    expect(reactores).toEqual(["jaz-90", "jaz-110", "jaz-120"]);
  });

  it("y el tráfico la vuela también: llega a la esquina de allá a ella y baja por la misma línea", () => {
    const esc = CON_ALTITUD.find((e) => e.id === "pettirossi")!;
    const campo = elCampo(esc);
    const tipos = tiposDelCampo(oaciDe(esc), esc.runway.length);
    expect(tipos.map((t) => t.id)).toContain("reactor");
    for (const t of tipos) {
      const escala = escalaDeCircuito(t.aproximacion);
      const c = elCircuito(esc, esc.runway, "02", campo, escala, undefined, t.id === "reactor");
      const caminos = trazar(
        esc.runway,
        campo.cota,
        c.forma.mano,
        escala,
        c.forma.altura,
        null,
        t.subeAlAire,
        c.forma.enLaBase,
      )!;
      const pies = t.id === "reactor" ? 1800 : 1500;
      const enCola = porElCamino(caminos.llegada, 0)!.sitio;
      expect(enCola.y / 0.3048, t.id).toBeCloseTo(pies, 0);
      const baja = bajadaDelVientoEnCola(c.vertices)!;
      expect(caminos.llegada[1], t.id).toEqual(baja);
      expect(caminos.llegada[2]!.y, t.id).toBeCloseTo(c.vertices[3]!.y, 6);
      c.dispose();
    }
  });
});
