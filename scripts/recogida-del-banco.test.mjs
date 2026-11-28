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
import { readFileSync } from "node:fs";
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

/**
 * Sin lo de H111: al que flota, el suelo del morro le sigue pidiendo los dos
 * grados de la recogida. Ver `morroQueFaltaAlPunto`.
 */
const deH108 = banco.replace("flota: falta < 0,", "flota: false,");
/**
 * **La 36 de La Palma —2.058 m para aterrizar— baja un 0,5 %**, de 31,0 m en su
 * umbral desplazado a 20,6 en el de la 18 (H111): sus dos cabeceras están a
 * 31,7 y 20,3 m en `gcla.aero.json`, que es lo que pisa el juego
 * (`cotaDeLaPista`). La mesa la tenía subiendo tres metros, de 30 a 33, y el
 * 787 que en ella tocaba a 431 m tocaba en el navegador a 484: la pista se le
 * iba por debajo 2,4 m en la recogida. La 03L de Gran Canaria baja un 0,4 %.
 */
const LA_PALMA = { cabecera: 31.0, otraPunta: 20.6, largo: 2058, grados: 22 };
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

describe("la mesa vuela lo que vuela el banco (H111)", () => {
  it("la pista de La Palma, la del juego: baja por la 36 lo que bajan sus cabeceras", () => {
    const gcla = JSON.parse(readFileSync("data/aerodromes/gcla.aero.json", "utf8"));
    const { 18: norte, 36: sur } = gcla.runways[0].thresholds;
    const entre = Math.hypot(norte.xy[0] - sur.xy[0], norte.xy[1] - sur.xy[1]);
    const delJuego = (norte.elevM - sur.elevM) / entre;
    const deLaMesa = (LA_PALMA.otraPunta - LA_PALMA.cabecera) / LA_PALMA.largo;
    // Un 0,5 % hacia abajo, y no un 0,15 % hacia arriba.
    expect(delJuego).toBeLessThan(-0.004);
    expect(deLaMesa).toBeCloseTo(delJuego, 3);
  });

  it("y con el punto de toma del reactor: no se lo traga el `catch` de la recogida", () => {
    // Con la mesa de antes, `forzandoLaLarga` (H109) no estaba, y el punto no mandaba en ninguna.
    expect(vuela(banco, "jaz-110", "La Palma").sinElPunto).toBe(0);
  });
});

describe("con el modelo del juego, la recogida del banco", () => {
  it("el JAZ 110 en La Palma flota menos con el punto en la zona (H108), y menos aún si no se le aguanta (H111)", () => {
    const conH108 = vuela(deH108, "jaz-110", "La Palma");
    const ahora = vuela(banco, "jaz-110", "La Palma");
    /*
     * Medido con la pista que baja: de 45 a 31 pasadas de los 500 m en cien
     * finales, y 4 duras las dos. Sin el punto en la zona ni la mirada corta
     * (`deAntes`) salen 33: en la pista de verdad, H108 sola flotaba más.
     */
    expect(conH108.largas).toBeGreaterThanOrEqual(40);
    expect(ahora.largas).toBeLessThanOrEqual(conH108.largas - 10);
    expect(ahora.duras).toBeLessThanOrEqual(conH108.duras + 1);
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
        // Y lo de H111, contra el banco de justo antes: el morro del que flota.
        const conH108 = vuela(deH108, avion, donde);
        const ahora = vuela(banco, avion, donde);
        antesAbiertas += abiertas(antes);
        ahoraAbiertas += abiertas(ahora);
        antesDuras += conH108.duras;
        ahoraDuras += ahora.duras;
        // Y nada a peor en ninguno: ni más largas ni más duras que dos de más.
        expect(ahora.largas, `${avion} en ${donde}`).toBeLessThanOrEqual(conH108.largas);
        expect(ahora.duras, `${avion} en ${donde}`).toBeLessThanOrEqual(conH108.duras + 2);
      }
    // Medido: de 14 a 6 de setecientas finales.
    expect(antesAbiertas).toBeGreaterThanOrEqual(12);
    expect(ahoraAbiertas).toBeLessThanOrEqual(8);
    expect(ahoraDuras).toBeLessThanOrEqual(antesDuras + 2);
  });
});
