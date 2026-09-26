/**
 * El plano de la tarjeta.
 *
 * Se prueba la geometría y no el dibujo, porque la geometría es donde hemos
 * metido la pata diez veces: medir desde el punto de referencia del aeropuerto
 * en vez de desde lo que hay dibujado, que son dos cosas distintas y en Silvio
 * Pettirossi se llevan casi trescientos metros.
 */

import { describe, expect, it } from "vitest";
import {
  caja,
  designador,
  destinosPosibles,
  destinosQueNoCaben,
  recientes,
} from "./hangar";
import { AIRCRAFT } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import {
  PETTIROSSI,
  SCENARIOS,
  TENERIFE_NORTE,
  VALLE_CORDILLERA,
} from "../world/scenarios";

describe("la caja de un escenario", () => {
  it("encierra la pista de Silvio Pettirossi, que mide 3,4 km", () => {
    const { lado } = caja(PETTIROSSI);
    // El lado es el mayor de los dos lados más un diez por ciento de margen.
    expect(lado).toBeGreaterThan(3300);
    expect(lado).toBeLessThan(4600);
  });

  it("está centrada en lo dibujado, no en el punto de referencia", () => {
    // El origen del fichero es el punto de referencia del aeropuerto, y en
    // Silvio Pettirossi no está ni en el centro de la pista ni en el de las
    // plataformas. Si el centro de la caja saliera en (0, 0), es que se está
    // midiendo desde donde no se debe.
    const { cx, cy } = caja(PETTIROSSI);
    expect(Math.hypot(cx, cy)).toBeGreaterThan(50);
  });

  it("deja el aeródromo mayor más grande que el menor", () => {
    // Es la única razón de que todas compartan escala: que se vea de un
    // vistazo cuál es la pista larga sin saber leer «3,4 km».
    expect(caja(PETTIROSSI).lado).toBeGreaterThan(caja(VALLE_CORDILLERA).lado);
  });

  it("no devuelve nada infinito para ningún escenario", () => {
    for (const escenario of SCENARIOS) {
      const c = caja(escenario);
      expect(Number.isFinite(c.cx)).toBe(true);
      expect(Number.isFinite(c.cy)).toBe(true);
      expect(c.lado).toBeGreaterThan(0);
    }
  });
});

describe("el designador de la tarjeta", () => {
  it("sale del fichero cuando el aeródromo es real", () => {
    // No se calcula: en Tenerife Norte el asfalto corre a 110,7° y la cabecera
    // pone 12, que no es lo que daría redondear el rumbo verdadero.
    expect(designador(TENERIFE_NORTE)).toBe("12/30");
    expect(designador(PETTIROSSI)).toBe("20/02");
  });

  it("en una pista inventada son dos números opuestos", () => {
    const [a, b] = designador(VALLE_CORDILLERA).split("/").map(Number);
    expect(Math.abs(((a! - b! + 36) % 36) - 18)).toBeLessThanOrEqual(1);
  });
});

/**
 * Las tres fichas de la portada.
 *
 * Esto existe por dos fallos seguidos que se vieron jugando y que ninguna
 * comprobación mía cazó, los dos al primer vistazo:
 *
 * El primero, que **el panel se contradecía**: la barra de abajo decía
 * «Tenerife Norte» y arriba había tres fichas entre las que no estaba, ninguna
 * marcada. El historial solo se escribe al despegar, así que estaba vacío.
 *
 * El segundo lo provocó el arreglo del primero: al meter el elegido delante, el
 * relleno por orden de fichero echó a **Silvio Pettirossi** de la portada. El
 * aeropuerto del que va este juego, fuera, por el orden en que están escritos
 * en un array.
 */
describe("las tres fichas de la portada", () => {
  it("siempre incluye el sitio elegido, y de primero", () => {
    for (const escenario of SCENARIOS) {
      const tres = recientes(escenario);
      expect(tres[0]!.id).toBe(escenario.id);
    }
  });

  it("rellena con aeródromos de verdad antes que con sitios inventados", () => {
    // Elegido Tenerife y sin historial, Silvio Pettirossi tiene que seguir en
    // la portada: es el otro aeropuerto de verdad, y es el del juego.
    const tres = recientes(TENERIFE_NORTE);
    expect(tres.map((e) => e.id)).toContain("pettirossi");
  });

  it("da tres sitios distintos", () => {
    for (const escenario of SCENARIOS) {
      const ids = recientes(escenario).map((e) => e.id);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
    }
  });
});

/*
 * **Los destinos a los que el avión no llega se ven, no se esconden.**
 *
 * Con el JAZ 120 en Pettirossi el hangar no enseñaba ningún destino: los dos
 * de la ruta le quedan cortos, el paso desaparecía y nadie sabía por qué. Que
 * no vaya es verdad; lo que se prueba aquí es que se dice y que se propone el
 * avión que sí iría.
 */
describe("los destinos que no caben", () => {
  const jaz = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

  it("con el JAZ 120 en Pettirossi salen los dos, con su porqué", () => {
    const grande = jaz("jaz-120");
    expect(destinosPosibles(PETTIROSSI, grande)).toHaveLength(0);
    const fuera = destinosQueNoCaben(PETTIROSSI, grande);
    expect(fuera.map((f) => f.destino.id).sort()).toEqual(["encarnacion", "yvytu-rape"]);
    for (const f of fuera) {
      expect(f.veredicto.cabe).toBe(false);
      expect(f.veredicto.porQueNo).not.toBeNull();
      expect(f.veredicto.necesita).toBeGreaterThan(f.veredicto.hay);
    }
  });

  it("y propone el mayor que cabe en los dos campos", () => {
    for (const f of destinosQueNoCaben(PETTIROSSI, jaz("jaz-120"))) {
      const con = f.propuesto!;
      expect(con, f.destino.id).not.toBeNull();
      expect(cabeEn(con, campoDe(PETTIROSSI)).cabe).toBe(true);
      expect(cabeEn(con, campoDe(f.destino)).cabe).toBe(true);
      // Y ninguno mayor cabría: es el que más se parece al que se pidió.
      const mayores = AIRCRAFT.slice(AIRCRAFT.indexOf(con) + 1);
      for (const m of mayores)
        expect(
          cabeEn(m, campoDe(PETTIROSSI)).cabe && cabeEn(m, campoDe(f.destino)).cabe,
          `${m.id} también cabe en ${f.destino.id}`,
        ).toBe(false);
    }
  });

  it("el que cabe en todo no tiene ninguno fuera", () => {
    expect(destinosQueNoCaben(PETTIROSSI, jaz("jaz-20"))).toHaveLength(0);
  });
});
