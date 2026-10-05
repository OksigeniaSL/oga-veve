/**
 * **La hora del plan, de Fuerteventura a Gran Canaria.**
 *
 * Enrique, con el JAZ 120: la comandante dijo quince minutos y a los quince,
 * siguiendo el plan, aún quedaban la final y la toma. Aquí se mira lo que
 * pidió el encargo —que la hora cuente la ruta de llegada entera y con la
 * velocidad de cada tramo: 250 nudos por debajo del FL100, la de maniobra en
 * el área terminal y la de aproximación en la final— y lo que destapó
 * medirlo volando el plan con `verificar-escalones.mjs`: nivelado en un
 * escalón de la subida, la hora contaba la ruta entera a esa altura.
 */

import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../world/scenarios";
import { campoDeCasa, campoVecino } from "../world/campo-del-vuelo";
import { dondeCae } from "../world/entre-aerodromos";
import { desplazarAerodromo } from "../world/aerodromo-desplazado";
import { cruceroDelTramo, rutaDelTramo, type DelJuego } from "../world/ruta-del-tramo";
import {
  MILLA,
  PIE,
  Seguimiento,
  altitudDelPerfil,
  distanciaDelPerfil,
  perfilDeLaBajada,
  segundosPorElPerfil,
  velocidadesDeLaBajada,
  type Lectura,
} from "./ruta";
import { YVAGA } from "./aircraft";
import { velocidadQueToca, vrefKt } from "./escalera-de-velocidades";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import type { Meteo } from "../world/meteo";

const NUDO = 1852 / 3600;

function elPlan() {
  const casa = SCENARIOS.find((e) => e.id === "fuerteventura")!;
  const lle = SCENARIOS.find((e) => e.id === "gran-canaria")!;
  const origen = casa.aerodrome!.origin;
  const d = dondeCae(origen, lle.aerodrome!.origin);
  const meteo = { vientoDe: 21, vientoKt: 15, qnh: 1013, temp: 15, techoM: null, visibilidadM: 10000 } as Meteo;
  const llegada = campoVecino(lle, d, desplazarAerodromo(lle.aerodrome!, d.x, d.z), meteo);
  const juego: DelJuego = {
    origen,
    enElAire: null,
    cotaDePista: () => 20,
    cota: null,
    techo: YVAGA.alturaDeCrucero,
    ficha: YVAGA,
  };
  const ruta = rutaDelTramo(campoDeCasa(casa), llegada, juego);
  return { ruta, crucero: cruceroDelTramo(ruta, campoDeCasa(casa), juego) };
}

const tas = (kt: number, altitud: number) =>
  (kt * NUDO) / Math.sqrt(airDensity(altitud) / SEA_LEVEL_DENSITY);

describe("la hora del plan, de Fuerteventura a Gran Canaria", () => {
  const { ruta, crucero } = elPlan();
  const a = ruta.fijos[0]!;

  it("de ruedas arriba a ruedas abajo, lo que tarda un reactor: entre veinte y treinta minutos", () => {
    const s = segundosPorElPerfil(ruta, 1, a.x, a.z, {
      avion: YVAGA,
      altitud: 20,
      crucero,
      bajando: false,
      viento: null,
      verdadera: null,
    });
    expect(s / 60).toBeGreaterThan(20);
    expect(s / 60).toBeLessThan(30);
  });

  it("cuenta la ruta de llegada entera, con la velocidad de cada tramo", () => {
    /*
     * La misma ruta contada a mano, tramo a tramo y con las velocidades del
     * encargo escritas aquí y no sacadas de la escalera: desde el punto de
     * descenso del FL190, por la senda de tres grados, a 250 por debajo de
     * diez mil pies, a la de maniobra en las últimas treinta millas, con los
     * flaps en las doce y a la de aproximación en las cinco. La altura, la del
     * perfil con sus tramos para frenar, que se comprueba en `ruta.test.ts`.
     */
    const vref = vrefKt(YVAGA);
    const perfil = perfilDeLaBajada(20, velocidadesDeLaBajada(YVAGA));
    const desde = distanciaDelPerfil(perfil, 20 + 19000 * PIE);
    let s = 0;
    const paso = 100;
    for (let queda = desde; queda > 0; queda -= paso) {
      const altitud = altitudDelPerfil(perfil, queda);
      const kt =
        queda < 5 * MILLA
          ? vref + 5
          : queda < 8 * MILLA
            ? vref + 20
            : queda < 12 * MILLA
              ? vref + 50
              : queda < 30 * MILLA
                ? Math.min(250, vref + 80)
                : altitud < 11000 * PIE
                  ? 250
                  : velocidadQueToca(YVAGA, { altitud, restante: queda, bajando: true, enFinal: false, subiendo: false }).kt;
      s += paso / tas(kt, altitud);
    }
    // Y el plan, desde el mismo punto de la ruta.
    let i = ruta.fijos.length - 1;
    while (i > 1 && ruta.total - ruta.acumulado[i - 1]! < desde) i--;
    const p0 = ruta.fijos[i - 1]!;
    const p1 = ruta.fijos[i]!;
    const resto = desde - (ruta.total - ruta.acumulado[i]!);
    const largo = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    const x = p1.x + ((p0.x - p1.x) * resto) / largo;
    const z = p1.z + ((p0.z - p1.z) * resto) / largo;
    const plan = segundosPorElPerfil(ruta, i, x, z, {
      avion: YVAGA,
      altitud: 20 + 19000 * PIE,
      crucero: 20 + 19000 * PIE,
      bajando: true,
      viento: null,
      verdadera: null,
    });
    expect(Math.abs(plan - s) / s, `plan ${(plan / 60).toFixed(1)} min, a mano ${(s / 60).toFixed(1)}`).toBeLessThan(0.03);
  });

  it("nivelado en un escalón de la subida, la hora no cuenta la ruta entera a esa altura", () => {
    const seguir = (vertical: number) => {
      const s = new Seguimiento();
      s.poner(ruta, crucero, YVAGA);
      const l: Lectura = {
        x: a.x,
        z: a.z,
        altitud: 6000 * PIE,
        vertical,
        aire: tas(250, 6000 * PIE),
        enTierra: false,
        viento: null,
      };
      s.paso(l);
      return s.progreso!.segundos;
    };
    const subiendo = seguir(8);
    const nivelado = seguir(0);
    expect(Math.abs(nivelado - subiendo) / subiendo).toBeLessThan(0.03);
  });
});
