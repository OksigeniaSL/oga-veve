/**
 * Las pistas de este vuelo.
 *
 * Lo que se comprueba es el fallo tal cual se vio: **una toma buena en la pista
 * del otro aeropuerto no puede ser un percance**. Y el otro lado, que se olvida
 * solo: que seguir mirando solo la de casa no vuelva a pasar inadvertido.
 */

import { describe, expect, it } from "vitest";
import { finDeLaZonaDeToma } from "../flight/toma-larga";
import {
  dondeSeToca,
  enLaZonaDeLasFlechas,
  LA_TOMA_SE_ADELANTA,
  llegandoALaZonaDeToma,
  laMasCerca,
  pistaPorDelante,
  sobreAlguna,
  sobreLaPistaConMargen,
  sobreLaZonaDeToma,
  type Pista,
} from "./pistas-del-vuelo";

/** La de casa, en el origen, orientada al norte. */
const CASA: Pista = { x: 0, z: 0, heading: 0, length: 3000, width: 45 };
/** Y la del otro aeropuerto, a cincuenta y cuatro kilómetros al sursuroeste. */
const OTRA: Pista = {
  x: -22800,
  z: 48700,
  heading: 70,
  length: 3200,
  width: 45,
};

describe("sobre qué pista estoy", () => {
  it("en medio de la de casa, sí", () => {
    expect(sobreAlguna([CASA], 0, 0)).toBe(true);
    expect(sobreAlguna([CASA], 0, 1400)).toBe(true);
  });

  it("y en el campo, no", () => {
    expect(sobreAlguna([CASA], 500, 0)).toBe(false);
    expect(sobreAlguna([CASA], 0, 2000)).toBe(false);
  });

  it("**y en la del otro aeropuerto, sí** — que es lo que rompía el avión", () => {
    /*
     * Con una sola pista en la lista esto da `false`, el veredicto sale «fuera
     * de pista» y el juego rompe el avión de alguien que acaba de aterrizar
     * perfectamente. Es lo que se contó: «tomé tierra y se rompió, no lo
     * considera un aterrizaje».
     */
    expect(sobreAlguna([CASA], OTRA.x, OTRA.z)).toBe(false);
    expect(sobreAlguna([CASA, OTRA], OTRA.x, OTRA.z)).toBe(true);
  });

  it("y la franja de antes del umbral cuenta, si se pide margen", () => {
    const justoAntes = CASA.length / 2 + 40;
    expect(sobreAlguna([CASA], 0, justoAntes)).toBe(false);
    expect(sobreAlguna([CASA], 0, justoAntes, 80)).toBe(true);
  });

  it("y el rumbo de cada pista es el suyo, no el de la primera", () => {
    // La otra está girada setenta grados. Un punto a lo largo de **su** eje
    // tiene que contar, y el mismo punto medido con el eje de casa, no.
    const rad = (OTRA.heading * Math.PI) / 180;
    const p = {
      x: OTRA.x + Math.sin(rad) * 1200,
      z: OTRA.z - Math.cos(rad) * 1200,
    };
    expect(sobreAlguna([OTRA], p.x, p.z)).toBe(true);
    expect(sobreAlguna([{ ...OTRA, heading: 0 }], p.x, p.z)).toBe(false);
  });

  it("y sin ninguna pista no se está sobre ninguna", () => {
    expect(sobreAlguna([], 0, 0)).toBe(false);
  });
});

describe("y en cuál estoy aterrizando", () => {
  it("la de más cerca, que es la que manda", () => {
    expect(laMasCerca([CASA, OTRA], 100, 100)).toBe(CASA);
    expect(laMasCerca([CASA, OTRA], OTRA.x, OTRA.z + 300)).toBe(OTRA);
  });

  it("y a mitad de camino gana la que se tiene más cerca", () => {
    const medio = { x: OTRA.x / 2, z: OTRA.z / 2 };
    expect(laMasCerca([CASA, OTRA], medio.x - 1000, medio.z - 1000)).toBe(CASA);
    expect(laMasCerca([CASA, OTRA], medio.x + 1000, medio.z + 1000)).toBe(OTRA);
  });

  it("y sin pistas, nada", () => {
    expect(laMasCerca([], 0, 0)).toBeNull();
  });
});

/**
 * Una pista de dos kilómetros al norte, con el umbral de la cabecera en uso
 * trescientos metros pista adentro: el norte es la Z negativa, así que se
 * llega desde Z positiva con rumbo cero.
 */
const AL_NORTE: Pista = { x: 0, z: 0, heading: 0, length: 2000, width: 45, desplazado: 300 };
const NORTE = 0;
const SUR = Math.PI;

describe("pistaPorDelante", () => {
  it("cuenta lo que queda hacia donde apunta el avión", () => {
    expect(pistaPorDelante(AL_NORTE, 0, 0, NORTE)).toBeCloseTo(1000);
    expect(pistaPorDelante(AL_NORTE, 0, -500, NORTE)).toBeCloseTo(500);
    // Rodando hacia atrás, lo que queda es lo de detrás.
    expect(pistaPorDelante(AL_NORTE, 0, -500, SUR)).toBeCloseTo(1500);
  });

  it("fuera del asfalto no hay pista que se acabe", () => {
    expect(pistaPorDelante(AL_NORTE, 50, 0, NORTE)).toBe(Infinity);
    expect(pistaPorDelante(AL_NORTE, 0, -1100, NORTE)).toBe(Infinity);
  });
});

describe("sobreLaPistaConMargen", () => {
  it("lleva trescientos metros antes de cada punta y cuarenta a cada lado", () => {
    expect(sobreLaPistaConMargen(AL_NORTE, 0, 1250)).toBe(true);
    expect(sobreLaPistaConMargen(AL_NORTE, 0, -1250)).toBe(true);
    expect(sobreLaPistaConMargen(AL_NORTE, 0, 1350)).toBe(false);
    expect(sobreLaPistaConMargen(AL_NORTE, 60, 0)).toBe(true);
    expect(sobreLaPistaConMargen(AL_NORTE, 65, 0)).toBe(false);
  });
});

describe("sobreLaZonaDeToma", () => {
  it("empieza en el umbral de aterrizaje, sin margen por delante", () => {
    // El umbral está a setecientos metros del centro, hacia el sur.
    expect(sobreLaZonaDeToma(AL_NORTE, 0, 690, NORTE)).toBe(true);
    expect(sobreLaZonaDeToma(AL_NORTE, 0, 710, NORTE)).toBe(false);
    expect(sobreLaZonaDeToma(AL_NORTE, 0, -1100, NORTE)).toBe(false);
    expect(sobreLaZonaDeToma(AL_NORTE, 70, 0, NORTE)).toBe(false);
  });

  it("por la otra cabecera vale su umbral, que aquí está en la punta", () => {
    expect(sobreLaZonaDeToma(AL_NORTE, 0, -990, SUR)).toBe(true);
  });
});

describe("llegandoALaZonaDeToma", () => {
  // El umbral de la cabecera sur está en z = 700 y se llega hacia el norte.
  const EN_FINAL = { suelo: 62, ruedas: 14, bajando: 3.5 };

  it("sobre la zona de toma, como siempre", () => {
    expect(llegandoALaZonaDeToma(AL_NORTE, 0, 690, NORTE, EN_FINAL)).toBe(true);
  });

  it("y segundo y medio antes del umbral, si desde ahí ya no se toca antes", () => {
    // A ochenta metros y sesenta y dos por segundo: 1,3 s del umbral, y 2 s
    // hasta el suelo aun bajando el doble.
    expect(llegandoALaZonaDeToma(AL_NORTE, 0, 780, NORTE, EN_FINAL)).toBe(true);
    // Más lejos, no: se dice en el umbral.
    const lejos = 700 + 62 * LA_TOMA_SE_ADELANTA + 10;
    expect(llegandoALaZonaDeToma(AL_NORTE, 0, lejos, NORTE, EN_FINAL)).toBe(false);
  });

  it("pero no si bajando así se llegaría al suelo antes del umbral, sobre las flechas", () => {
    const bajo = { suelo: 62, ruedas: 3, bajando: 3.5 };
    expect(llegandoALaZonaDeToma(AL_NORTE, 0, 780, NORTE, bajo)).toBe(false);
  });

  it("ni fuera del eje, ni pasada la pista de vuelta", () => {
    expect(llegandoALaZonaDeToma(AL_NORTE, 70, 780, NORTE, EN_FINAL)).toBe(false);
    // Llegando por la otra cabecera, z = 780 queda detrás: no hay umbral delante.
    expect(llegandoALaZonaDeToma(AL_NORTE, 0, 1080, SUR, EN_FINAL)).toBe(false);
  });
});

describe("enLaZonaDeLasFlechas", () => {
  it("es el trozo de pista antes del umbral de la cabecera por la que se llega", () => {
    expect(enLaZonaDeLasFlechas(AL_NORTE, 0, 900, NORTE)).toBe(true);
    expect(enLaZonaDeLasFlechas(AL_NORTE, 0, 600, NORTE)).toBe(false);
    // Llegando por la otra punta no hay flechas: su umbral no está desplazado.
    expect(enLaZonaDeLasFlechas(AL_NORTE, 0, -900, SUR)).toBe(false);
    // Y fuera del ancho, no se está en ninguna zona de la pista.
    expect(enLaZonaDeLasFlechas(AL_NORTE, 50, 900, NORTE)).toBe(false);
  });
});

describe("dondeSeToca", () => {
  it("mide lo pasado desde el umbral de aterrizaje de la cabecera por la que se llega", () => {
    const d = dondeSeToca(AL_NORTE, 0, 600, NORTE);
    expect(d?.pasado).toBeCloseTo(100);
    // Mil setecientos metros para aterrizar, del umbral a la punta.
    expect(d?.zona).toBeCloseTo(finDeLaZonaDeToma(1700));
  });

  it("por la otra cabecera, con la pista vista desde ella", () => {
    const d = dondeSeToca(AL_NORTE, 0, -600, SUR);
    expect(d?.pasado).toBeCloseTo(400);
    expect(d?.zona).toBeCloseTo(finDeLaZonaDeToma(2000));
  });

  it("fuera del ancho de la pista no hay toma que medir", () => {
    expect(dondeSeToca(AL_NORTE, 50, 0, NORTE)).toBeNull();
  });
});
