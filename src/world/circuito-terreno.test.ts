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
import { AIRCRAFT } from "../flight/aircraft";
import {
  alturaDelCircuito,
  crearCircuito,
  escalaDeCircuito,
  manoPublicada,
  pasilloDelCircuito,
  SOBRE_EL_TERRENO,
} from "./circuito";
import { SCENARIOS, type Scenario } from "./scenarios";
import { cabeceraEnUso, Terrain } from "./terrain";

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

/** Un circuito por cada tamaño de circuito que hay en la flota. */
const ESCALAS = [
  ...new Set(AIRCRAFT.map((a) => escalaDeCircuito(a.approachSpeed))),
].sort((a, b) => a - b);

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
) {
  return crearCircuito(
    runway,
    campo.cota,
    campo.suelo,
    escala,
    manoPublicada(esc, cabecera, escala),
  );
}

describe("ningún circuito se mete en el monte", () => {
  it("hay campos con relieve medido y aviones de varios tamaños, que si no esto no mide nada", () => {
    expect(CON_RELIEVE.length).toBeGreaterThan(10);
    expect(ESCALAS.length).toBeGreaterThan(1);
  });

  it.each(CON_RELIEVE.map((e) => [e.id, e] as const))(
    "%s: por las dos cabeceras y con toda la flota, el circuito pasa por encima de su pasillo",
    (_id, esc) => {
      const campo = elCampo(esc);
      const malos: string[] = [];
      for (const { runway, cabecera } of porLasDos(esc)) {
        for (const escala of ESCALAS) {
          const c = elCircuito(esc, runway, cabecera, campo, escala);
          const altura = c.vertices[2]!.y;
          const peor = peorDelPasillo(c.vertices, campo.suelo, pasilloDelCircuito(escala));
          const sobra = altura - peor.alto;
          if (sobra < SOBRE_EL_TERRENO - CATA_DISTINTA)
            malos.push(
              `${cabecera} · escala ${escala.toFixed(2)} · ` +
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
      for (const escala of ESCALAS) {
        const c = elCircuito(esc, runway, cabecera, campo, escala);
        const toca = manoPublicada(esc, cabecera, escala);
        if (c.forma.mano !== toca)
          distintos.push(`${cabecera} · escala ${escala.toFixed(2)}: ${c.forma.mano}, publica ${toca}`);
        c.dispose();
      }
    }
    expect(distintos).toEqual([]);
  });

  it("en Lanzarote, las avionetas por su circuito y los reactores por el suyo", () => {
    const esc = CON_RELIEVE.find((e) => e.id === "lanzarote")!;
    // Por la 03: el regular por el este, a la derecha; el ligero por el oeste.
    expect(manoPublicada(esc, "03", 1)).toBe("izquierda");
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    expect(manoPublicada(esc, "03", escalaDeCircuito(jaz90.approachSpeed))).toBe("derecha");
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
    );
    expect(reactor.forma.mano).toBe("derecha");
    const avioneta = elCircuito(esc!, por30.runway, "30", campo, 1);
    expect(avioneta.forma.mano).toBe("izquierda");
    expect(avioneta.forma.altura).toBeGreaterThan(alturaDelCircuito(1));
    reactor.dispose();
    avioneta.dispose();
  });
});
