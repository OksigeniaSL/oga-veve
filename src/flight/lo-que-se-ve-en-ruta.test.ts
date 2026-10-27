/**
 * **Lo que se cuenta por la ventanilla en una ruta de verdad**, sobre el
 * relieve de verdad.
 *
 * Se oyó volando de Los Rodeos a La Palma: «Ahí abajo, a la izquierda,
 * Candelaria», con la voz del navegador y con la Dorsal en medio. «Se ve mejor
 * Anaga a tu derecha, el Teide a la izquierda.» Esto vuela ese tramo —y uno
 * de Paraguay— sin navegador: el plan que traza el juego, `rutaDelTramo`, con
 * el relieve de los mismos ficheros que carga, `data/terrain/*.bin`, y
 * `LoQueSeVe` mirando por la ventanilla cada medio segundo.
 *
 * El perfil es el de cualquier reactor: sube al siete por ciento, cruza a su
 * nivel y baja por la senda de tres grados. No es el vuelo del banco, que no
 * cruza de verdad —se pone en final del otro campo—; es la ruta, que es lo
 * que hace falta para saber qué se ve y cuándo.
 *
 * Con `OGA_VENTANILLA=1` en el entorno imprime lo que se dice, dónde y con qué
 * palabras.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import { puntoAFaltando } from "./ruta";
import {
  CERCA_DEL_CAMPO,
  DIEZ_MIL_PIES,
  enFaseDeTrabajo,
  LoQueSeVe,
} from "./lo-que-se-ve";
import { conPasaje } from "../audio/megafonia";
import { laHistoria, loQueSeDice } from "../audio/ventanilla";
import { desplazarAerodromo } from "../world/aerodromo-desplazado";
import { campoDeCasa, campoVecino } from "../world/campo-del-vuelo";
import { dondeCae } from "../world/entre-aerodromos";
import { seVe } from "../world/hitos";
import { destacadosDesde } from "../world/lo-destacado";
import { relieveDe } from "../world/relieve-en-disco";
import { cruceroDelTramo, rutaDelTramo, type DelJuego } from "../world/ruta-del-tramo";
import { SCENARIOS } from "../world/scenarios";

const por = (id: string) => SCENARIOS.find((e) => e.id === id)!;
const entorno = (
  globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

interface Dicho {
  readonly minuto: string;
  readonly km: number;
  readonly pies: number;
  readonly alCampo: number;
  readonly nombre: string;
  readonly lado: string;
  readonly texto: string;
  /** La historia que va detrás, si el sitio la tiene: su clave. */
  readonly historia: string | null;
  /** Si se dijo en crucero, nivelado y antes de bajar. Ver `enFaseDeTrabajo`. */
  readonly enCrucero: boolean;
}

/** Cuánto tiene que llevar nivelado para ir en crucero, s: como el juego. */
const RATO_EN_CRUCERO = 20;

/**
 * Vuela el tramo y devuelve lo que se contó. `mapas` son los campos cuyo
 * relieve se carga: los dos extremos y los que caigan por medio.
 */
function volar(desde: string, hasta: string, avion: string, mapas: readonly string[]) {
  const sal = por(desde);
  const lle = por(hasta);
  const origen = sal.aerodrome!.origin;
  const salida = campoDeCasa(sal);
  const d = dondeCae(origen, lle.aerodrome!.origin);
  const llegada = campoVecino(lle, d, desplazarAerodromo(lle.aerodrome!, d.x, d.z));
  const suyo = AIRCRAFT.find((a) => a.id === avion)!;
  const suelo = relieveDe(mapas, origen);
  const juego: DelJuego = {
    origen,
    enElAire: null,
    cotaDePista: (c) => c.escenario.aerodrome?.elevationM ?? 0,
    cota: suelo,
    techo: suyo.alturaDeCrucero,
  };
  const ruta = rutaDelTramo(salida, llegada, juego);
  const crucero = cruceroDelTramo(ruta, salida, juego);
  const cotaSalida = sal.aerodrome!.elevationM ?? 0;
  const cotaLlegada = lle.aerodrome!.elevationM ?? 0;
  const conGente = conPasaje(suyo.mass);
  const ventanilla = new LoQueSeVe(destacadosDesde(origen));
  ventanilla.ponerSuelo(suelo);

  const dichos: Dicho[] = [];
  const dt = 0.5;
  let habla = 0;
  let t = 0;
  let nivelado = 0;
  /** Cuánto rato se puede contar algo: fuera de la cabina estéril, s. */
  let abierta = 0;
  for (let s = 0; s < ruta.total; s += suyo.cruiseSpeed * dt, t += dt) {
    const p = puntoAFaltando(ruta, ruta.total - s)!;
    const q = puntoAFaltando(ruta, Math.max(0, ruta.total - s - 300))!;
    const rumbo = (Math.atan2(q.x - p.x, -(q.z - p.z)) * 180) / Math.PI;
    const altitud = Math.min(
      crucero,
      cotaSalida + 0.07 * s,
      cotaLlegada + Math.tan((3 * Math.PI) / 180) * (ruta.total - s),
    );
    const aSalida = Math.hypot(p.x - salida.pista.x, p.z - salida.pista.z);
    const aLlegada = Math.hypot(p.x - llegada.pista.x, p.z - llegada.pista.z);
    const alCampo = Math.min(aSalida, aLlegada);
    nivelado = altitud >= crucero - 1 ? nivelado + dt : 0;
    const enCrucero = nivelado >= RATO_EN_CRUCERO;
    const momento = {
      fase: (s < 500 ? "despegando" : "en-vuelo") as "despegando" | "en-vuelo",
      x: p.x,
      z: p.z,
      rumbo,
      altitud,
      sobreElCampo: altitud - (aSalida < aLlegada ? cotaSalida : cotaLlegada),
      alCampo,
      conPasaje: conGente,
      enCrucero,
      alguienHabla: habla > 0,
    };
    if (!enFaseDeTrabajo(momento)) abierta += dt;
    const mirada = ventanilla.paso(dt, momento);
    habla = Math.max(0, habla - dt);
    if (!mirada) continue;
    const dicho = loQueSeDice(mirada, conGente, ventanilla.cuantos - 1);
    const historia = laHistoria(mirada, conGente);
    // Lo que tarda en decirlo, con su historia detrás: nadie habla encima, ni
    // ella misma.
    habla = historia ? 28 : 14;
    dichos.push({
      minuto: `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`,
      km: Math.round(s / 1000),
      pies: Math.round(altitud / 0.3048 / 100) * 100,
      alCampo: Math.round(alCampo / 1000),
      nombre: mirada.hito.nombre,
      lado: mirada.lado,
      texto: dicho?.texto ?? "",
      historia: historia?.relleno.historia ?? null,
      enCrucero,
    });
  }
  if (entorno?.OGA_VENTANILLA) {
    console.log(
      `\n${desde} → ${hasta} con el ${avion}: ${Math.round(ruta.total / 1000)} km, ` +
        `crucero ${Math.round(crucero / 0.3048 / 100) * 100} ft\n` +
        dichos
          .map(
            (x) =>
              `  ${x.minuto} · km ${x.km} · ${x.pies} ft · a ${x.alCampo} km del campo · ` +
              `${x.lado}: ${x.nombre}\n      «${x.texto}»` +
              (x.historia ? `\n      y detrás: ${x.historia}` : ""),
          )
          .join("\n"),
    );
  }
  return { dichos, conGente, origen, suelo, abierta };
}

/**
 * Ninguna en la cabina estéril: subiendo o bajando por debajo de diez mil pies
 * cerca del campo. En crucero, con pasaje, sí: es la excepción de la regla.
 */
function fueraDeLaCabinaEsteril(dichos: readonly Dicho[], conGente: boolean) {
  const cerca = (conGente ? CERCA_DEL_CAMPO.conPasaje : CERCA_DEL_CAMPO.enAvioneta) / 1000;
  for (const x of dichos)
    expect(
      x.pies * 0.3048 >= DIEZ_MIL_PIES - 40 || x.alCampo >= cerca - 1 || (conGente && x.enCrucero),
      `${x.nombre} a ${x.pies} ft y ${x.alCampo} km del campo`,
    ).toBe(true);
}

const CANARIAS_OESTE = ["tenerife-norte", "tenerife-sur", "la-palma", "la-gomera", "el-hierro"];

describe("de Los Rodeos a La Palma, lo que se ve", () => {
  const vuelo = volar("tenerife-norte", "la-palma", "jaz-90", CANARIAS_OESTE);

  it("se cuenta algo, y el Teide entre lo que se cuenta", () => {
    const nombres = vuelo.dichos.map((d) => d.nombre);
    expect(nombres.length).toBeGreaterThanOrEqual(2);
    expect(nombres).toContain("Teide");
  });

  it("cada cosa con su frase escrita, y ninguna dos veces", () => {
    const nombres = vuelo.dichos.map((d) => d.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const d of vuelo.dichos) expect(d.texto.length, d.nombre).toBeGreaterThan(40);
  });

  it("y nada en la salida ni en la llegada", () => {
    fueraDeLaCabinaEsteril(vuelo.dichos, vuelo.conGente);
  });

  /*
   * **Y detrás del Teide, su historia**, contada por la megafonía: la del
   * sitio que se acaba de señalar, que es el que se tiene delante. Ninguna
   * historia sale sola: va pegada a lo que se vio.
   */
  it("y detrás de lo que se ve, su historia: la del Teide, por la megafonía", () => {
    const teide = vuelo.dichos.find((d) => d.nombre === "Teide")!;
    expect(teide.historia).toBe("ventanilla.historia.teide");
    for (const d of vuelo.dichos)
      if (d.historia) expect(d.historia).toMatch(/^ventanilla\.historia\./);
  });

  /*
   * **La queja, tal cual.** Sobre el mar al norte del Puerto de la Cruz, a
   * diez mil pies y rumbo a La Palma: Candelaria queda al otro lado de la
   * Dorsal y no se ve; el Teide, que es más alto que el avión, sí.
   */
  it("Candelaria, detrás de la Dorsal, no se ve; el Teide sí", () => {
    const donde = dondeCae(vuelo.origen, { lat: 28.47, lon: -16.55 });
    const avion = { ...donde, y: DIEZ_MIL_PIES };
    // Candelaria, OpenStreetMap: place=town, 28.3547 N 16.3710 O, a la orilla.
    const candelaria = dondeCae(vuelo.origen, { lat: 28.3547, lon: -16.371 });
    const teide = dondeCae(vuelo.origen, { lat: 28.27269, lon: -16.64227 });
    expect(seVe(avion, { ...candelaria, y: 30 }, vuelo.suelo)).toBe(false);
    expect(seVe(avion, { ...teide, y: 3715 }, vuelo.suelo)).toBe(true);
  });
});

describe("de Asunción a Pilar, lo que se ve", () => {
  const vuelo = volar("pettirossi", "pilar", "jaz-60", ["pettirossi", "pilar"]);

  it("el río Paraguay, que va al lado todo el vuelo", () => {
    expect(vuelo.dichos.map((d) => d.nombre)).toContain("Río Paraguay");
  });

  it("y detrás, la historia de sus curvas viejas", () => {
    const rio = vuelo.dichos.find((d) => d.nombre === "Río Paraguay")!;
    expect(rio.historia).toBe("ventanilla.historia.rio-paraguay");
  });

  it("sin repetir y fuera de la cabina estéril", () => {
    const nombres = vuelo.dichos.map((d) => d.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    fueraDeLaCabinaEsteril(vuelo.dichos, vuelo.conGente);
  });
});

describe("y en avioneta, la instructora", () => {
  const vuelo = volar("yvytu-rape", "pettirossi", "jaz-20", ["yvytu-rape", "pettirossi"]);

  it("cuenta de vos y fuera del circuito", () => {
    expect(vuelo.conGente).toBe(false);
    for (const d of vuelo.dichos) expect(d.texto).toMatch(/Mirá|Fijate/);
    fueraDeLaCabinaEsteril(vuelo.dichos, vuelo.conGente);
  });

  it("y la historia también la cuenta ella, de vos", () => {
    const conHistoria = vuelo.dichos.filter((d) => d.historia);
    expect(conHistoria.length).toBeGreaterThan(0);
    for (const d of conHistoria) expect(d.historia).toMatch(/^ventanilla\.vos\.historia\./);
  });
});

/*
 * **El Ybytyruzú, que se puso por esto**: de Asunción a Ciudad del Este, una
 * hora con el JAZ 60, no se contaba nada —lo que hay cerca de los dos campos
 * cae en la cabina estéril—. El Tres Kandú, el punto más alto del país, se ve
 * a la derecha a mitad de camino.
 */
describe("de Asunción a Ciudad del Este, el Ybytyruzú", () => {
  const vuelo = volar("pettirossi", "guarani", "jaz-60", ["pettirossi", "guarani"]);

  it("se ve, y fuera de la cabina estéril", () => {
    expect(vuelo.dichos.map((d) => d.nombre)).toContain("Cerro Tres Kandú");
    fueraDeLaCabinaEsteril(vuelo.dichos, vuelo.conGente);
  });
});

/*
 * **De El Hierro a La Gomera con el JAZ 60**, el vuelo que se jugó entero y
 * salió «aburrido, mucho rato volando en silencio». Setenta kilómetros: casi
 * todo el tramo cae a menos de treinta de uno de los dos campos, y con la
 * cabina estéril medida así no quedaba ni un minuto en el que contar nada.
 *
 * Y lo que hay a los lados en ese canal es mar: La Gomera y el Teide van
 * delante del morro todo el crucero, y El Hierro queda detrás. Que la
 * ventanilla calle ahí es verdad; lo que no lo era es que no pudiera hablar.
 */
describe("de El Hierro a La Gomera, lo que se ve", () => {
  const vuelo = volar("el-hierro", "la-gomera", "jaz-60", CANARIAS_OESTE);

  it("el crucero ya no es cabina estéril: hay rato para contar", () => {
    // Cuatro minutos largos de crucero; con la regla de los treinta
    // kilómetros, un par de minutos sueltos en medio del canal.
    expect(vuelo.abierta).toBeGreaterThan(200);
  });

  it("y lo que se cuente, en crucero y sin repetir", () => {
    for (const d of vuelo.dichos) expect(d.enCrucero, d.nombre).toBe(true);
    const nombres = vuelo.dichos.map((d) => d.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});
