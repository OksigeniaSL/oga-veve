/**
 * **La toma del piloto del vuelo entero, contra la del juego** (H108).
 *
 * El JAZ 110 en La Palma tocó a 560 m del umbral: el banco le dio la zona por
 * buena —la suya acababa en 600— y el juego la toma por larga —la suya, en
 * 500—, sin gafas. Y el JAZ 90 en Gran Canaria, con 025/20, tocó a 10,1 m del
 * eje. Aquí: que la zona del banco sea la del juego, que su piloto se vaya al
 * aire cuando el juego lo propondría, y la recogida del banco **tal cual está
 * escrita** —leída del fichero, con su mano de la final— volada con el modelo,
 * el automático, las rachas y el suelo del juego en Los Rodeos, Gran Canaria
 * y La Palma. Lo de antes es el mismo texto sin el arreglo.
 */
import { describe, expect, it } from "vitest";
import { finDeLaZonaDeToma, TomaLarga } from "../src/flight/toma-larga";
import { alAirePorLarga } from "./al-aire-por-larga.mjs";
import { laManoDelBanco, laRecogidaDelBanco, mesa, textoDelBanco } from "./mesa-de-la-recogida.mjs";
import { pideAlPuntoDeToma } from "./recogida-del-reactor.mjs";

const banco = textoDelBanco();
/** El banco de antes de H108: el punto de toma sin la zona y la mirada de la final al recoger. */
const deAntes = banco
  .replace("          zona: recogida.zona,\n", "")
  .replace("const MIRADA_AL_RECOGER = 120;", "const MIRADA_AL_RECOGER = 0;");

/** La 36 de La Palma —2.058 m para aterrizar— y la 03L de Gran Canaria, que baja un 0,4 %. */
const LA_PALMA = { cabecera: 30, otraPunta: 33, largo: 2058, grados: 22 };
const GRAN_CANARIA = { cabecera: 24, otraPunta: 11.6, largo: 3100, grados: 23 };
/** Los vientos de los bancos: 035/10 contra la 36, 025/20 contra la 03L y el alisio de casa en Los Rodeos. */
const CAMPOS = {
  "La Palma": { campo: LA_PALMA, vientoDesde: 35, viento: 10 },
  "Gran Canaria": { campo: GRAN_CANARIA, vientoDesde: 2, viento: 20 },
  "Los Rodeos": {},
};
const FINALES = 100;

function vuela(texto, avion, donde) {
  return mesa(
    {
      ...CAMPOS[donde],
      avion,
      recogida: laRecogidaDelBanco(texto),
      mano: laManoDelBanco(texto, avion),
    },
    FINALES,
  );
}
const abiertas = (m) => m.r.filter((x) => Math.abs(x.eje) > 9).length;

describe("la zona de toma del banco es la del juego", () => {
  it("la lee del juego y no tiene otra", () => {
    expect(banco).toContain('server.ssrLoadModule("/src/flight/toma-larga.ts")');
    expect(banco).toContain("const hasta = finDeLaZonaDeToma(lda);");
    expect(banco).not.toContain("Math.min(600, lda / 3)");
    // Y la página, la misma: la del punto de toma y la de irse al aire.
    expect(banco).toContain('await import("/src/flight/toma-larga.ts")');
  });

  it("y en La Palma acaba en 500 m, donde el JAZ 110 tocó a 560", () => {
    expect(finDeLaZonaDeToma(2116)).toBe(500);
    expect(560 > finDeLaZonaDeToma(2116)).toBe(true);
    expect(560 <= Math.min(600, 2116 / 3)).toBe(true);
  });
});

describe("el banco se va al aire por toma larga cuando el juego lo propondría", () => {
  it("con la misma regla que `TomaLarga`, volando", () => {
    for (const ruedas of [0.5, 5, 14.9, 15.1, 40])
      for (const pasado of [300, 499, 501, 560, 900])
        for (const queda of [300, 401, 1500]) {
          const juego = new TomaLarga().paso({
            enFinal: true,
            enElSuelo: false,
            enLaPista: false,
            sobreLaPista: ruedas,
            pasado,
            queda,
            paraAterrizar: 2116,
            porElSuelo: 70,
            aproximacion: 74,
            reversa: false,
            paraParar: () => 0,
          });
          const zona = finDeLaZonaDeToma(2116);
          expect(alAirePorLarga({ ruedas, pasado, zona, queda })).toBe(juego === "largo");
        }
  });

  it("y la página lo recibe como texto: no toca nada de fuera", () => {
    const comoTexto = new Function(`return (${alAirePorLarga.toString()})`)();
    expect(comoTexto({ ruedas: 1.5, pasado: 560, zona: 500, queda: 1500 })).toBe(true);
  });
});

describe("el punto de toma de un reactor, dentro de la zona del juego", () => {
  const enLaPalma = { pide: -1.2, ruedas: 2, pasado: 300, porElSuelo: 73, caida: 4, altura: 13 };

  it("en La Palma, ciento cincuenta metros antes de acabar la zona: 350 m", () => {
    // A 300 m quedan cincuenta hasta el punto, menos de un segundo: pide bajar.
    expect(pideAlPuntoDeToma({ ...enLaPalma, zona: 500 })).toBeLessThan(-1.2);
    // Sin la zona, el punto de antes, a 457 m: el perfil manda todavía.
    expect(pideAlPuntoDeToma(enLaPalma)).toBeNull();
  });

  it("y en una pista de 2.400 m o más, casi el de antes: 450 m en vez de 457", () => {
    for (const pasado of [100, 200, 300, 400, 500])
      for (const ruedas of [0.5, 2, 6]) {
        const antes = pideAlPuntoDeToma({ ...enLaPalma, pasado, ruedas });
        const ahora = pideAlPuntoDeToma({ ...enLaPalma, pasado, ruedas, zona: 600 });
        expect(ahora === null, `${pasado} m, ${ruedas} m de ruedas`).toBe(antes === null);
        if (antes !== null) expect(ahora).toBeCloseTo(antes, 0);
      }
  });
});

describe("con el modelo del juego, la recogida del banco", () => {
  it("el JAZ 110 en La Palma deja de flotar pasada la zona, sin tocar más duro", () => {
    const antes = vuela(deAntes, "jaz-110", "La Palma");
    const ahora = vuela(banco, "jaz-110", "La Palma");
    // Medido: de 29 a 7 pasadas de los 500 m en cien finales, y de 9 a 7 duras.
    expect(antes.largas).toBeGreaterThanOrEqual(20);
    expect(ahora.largas).toBeLessThanOrEqual(12);
    expect(ahora.duras).toBeLessThanOrEqual(antes.duras + 1);
  });

  it("y ningún reactor toca a más de nueve metros del eje tantas veces como antes, ni más duro", () => {
    let antesAbiertas = 0;
    let ahoraAbiertas = 0;
    let antesDuras = 0;
    let ahoraDuras = 0;
    for (const avion of ["jaz-90", "jaz-110", "jaz-120"])
      for (const donde of Object.keys(CAMPOS)) {
        if (donde === "La Palma" && avion !== "jaz-110") continue;
        const antes = vuela(deAntes, avion, donde);
        const ahora = vuela(banco, avion, donde);
        antesAbiertas += abiertas(antes);
        ahoraAbiertas += abiertas(ahora);
        antesDuras += antes.duras;
        ahoraDuras += ahora.duras;
        // Y nada a peor en ninguno: ni más largas ni más duras que una de más.
        expect(ahora.largas, `${avion} en ${donde}`).toBeLessThanOrEqual(antes.largas);
        expect(ahora.duras, `${avion} en ${donde}`).toBeLessThanOrEqual(antes.duras + 1);
      }
    // Medido: de 14 a 6 de setecientas finales.
    expect(antesAbiertas).toBeGreaterThanOrEqual(12);
    expect(ahoraAbiertas).toBeLessThanOrEqual(8);
    expect(ahoraDuras).toBeLessThanOrEqual(antesDuras + 2);
  });
});
