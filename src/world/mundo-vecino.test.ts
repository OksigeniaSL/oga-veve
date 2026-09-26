/**
 * El otro aeropuerto, puesto a su distancia.
 *
 * Lo que se comprueba es lo que rompe de verdad: que el vecino **conteste solo
 * dentro de su isla**. Un mapa de alturas devuelve el borde repetido fuera de
 * sí mismo, así que un vecino que conteste a todo tapa el suelo del aeropuerto
 * de salida — con el avión rodando por su propia pista.
 */

import { describe, expect, it } from "vitest";
import { Group } from "three";
import { MundoVecino, sinHorizonte } from "./mundo-vecino";
import { conViento, destinosDe, SCENARIOS, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import { distanciaEntre } from "./entre-aerodromos";

const por = (id: string): Scenario => SCENARIOS.find((e) => e.id === id)!;
const norte = por("tenerife-norte");
const sur = por("tenerife-sur");

describe("el mundo de al lado", () => {
  it("se pone a la distancia de la carta", () => {
    const v = new MundoVecino(norte, sur);
    const medido = Math.hypot(v.desplazamiento.x, v.desplazamiento.z);
    expect(medido / 1000).toBeCloseTo(53.8, 0);
    // Y al sur, o sea con z positiva: la convención del juego.
    expect(v.desplazamiento.z).toBeGreaterThan(0);
  });

  it("y contesta el suelo en su propia pista", () => {
    const v = new MundoVecino(norte, sur);
    const cota = v.cota(
      v.desplazamiento.x + sur.runway.x,
      v.desplazamiento.z + sur.runway.z,
    );
    expect(cota).not.toBeNull();
    // Tenerife Sur está a sesenta y cuatro metros. Con holgura ancha: lo que
    // se comprueba es que hay suelo a su cota y no a la del mar ni a la del
    // aeropuerto de salida, que está a seiscientos treinta.
    expect(cota!).toBeGreaterThan(0);
    expect(cota!).toBeLessThan(200);
  });

  it("y **no** contesta en el aeropuerto de salida, que es lo que lo rompería", () => {
    /*
     * El origen del mundo de salida está a cincuenta y cuatro kilómetros del
     * vecino: muy fuera de su mapa de dieciséis. Si contestara ahí, el avión
     * rodaría por Tenerife Norte con el suelo de Tenerife Sur debajo.
     */
    const v = new MundoVecino(norte, sur);
    expect(v.cota(0, 0)).toBeNull();
    expect(v.cota(norte.runway.x, norte.runway.z)).toBeNull();
    expect(v.dentro(0, 0)).toBe(false);
  });

  it("y contesta justo hasta el borde de su mapa, y ni un metro más", () => {
    const v = new MundoVecino(norte, sur);
    const medio = sur.size / 2;
    const { x, z } = v.desplazamiento;
    expect(v.cota(x + medio - 1, z)).not.toBeNull();
    expect(v.cota(x + medio + 1, z)).toBeNull();
    expect(v.cota(x, z + medio - 1)).not.toBeNull();
    expect(v.cota(x, z + medio + 1)).toBeNull();
  });

  it("y el vecino no trae su propio horizonte", () => {
    /*
     * Dos anillos de más de cien kilómetros, uno centrado a cincuenta y cuatro
     * del otro, son dos horizontes solapados. El del escenario en el que se
     * vuela ya abarca al vecino entero.
     */
    /*
     * El relieve se carga en tiempo de ejecución, así que en pruebas los
     * escenarios vienen sin él y comprobar `sur.relieveLejano` a secas pasaría
     * siempre sin medir nada. Se le pone uno de mentira y se comprueba que lo
     * quita — que es lo único que hace esta función.
     */
    const conHorizonte: Scenario = {
      ...sur,
      relieveLejano: { datos: new Int16Array(4), resolucion: 2 },
    };
    expect(conHorizonte.relieveLejano).toBeDefined();
    expect(sinHorizonte(conHorizonte).relieveLejano).toBeUndefined();
    // Y no le toca nada más: el mapa fino, el aeródromo y el tamaño siguen.
    expect(sinHorizonte(conHorizonte).id).toBe(sur.id);
    expect(sinHorizonte(conHorizonte).size).toBe(sur.size);
    expect(sinHorizonte(conHorizonte).aerodrome).toBe(sur.aerodrome);
    expect(sinHorizonte(conHorizonte).relieve).toBe(sur.relieve);
  });

  it("y sin aeródromo extraído no se monta, en vez de salir en el sitio equivocado", () => {
    // Sin coordenadas de verdad no hay dónde ponerlo, y ponerlo en el cero
    // sería ponerlo encima del aeropuerto de salida.
    const sinCampo = { ...sur, aerodrome: undefined };
    expect(() => new MundoVecino(norte, sinCampo)).toThrow();
    expect(
      () => new MundoVecino({ ...norte, aerodrome: undefined }, sur),
    ).toThrow();
  });

  it("y la ruta declarada es la que se monta", () => {
    // Que el escenario apunte a uno y se monte otro sería un vuelo a un sitio
    // que no es el que dice la tarjeta.
    //
    // Y son varios desde que Los Rodeos tiene la red de Binter entera: cinco
    // islas, de Tenerife Sur a El Hierro. Ver `destinosDe`.
    expect(destinosDe(norte)).toContain(sur.id);
    expect(
      distanciaEntre(norte.aerodrome!.origin, sur.aerodrome!.origin) / 1000,
    ).toBeCloseTo(53.8, 0);
  });
});

describe("el tiempo de hoy, también en el campo de al lado", () => {
  /** El grupo de su aeródromo, por su nombre. */
  const aeropuerto = (v: MundoVecino) =>
    v.terreno.group.children.find((o) => o.name.startsWith("aerodromo:"));

  it("se rehace el aeródromo con el viento, que es de donde sale la manga", () => {
    /*
     * El vecino se construía una vez y en calma, y ningún cambio de tiempo le
     * llegaba: la manga de Tenerife Sur colgaba a plomo con veinte nudos.
     */
    const v = new MundoVecino(norte, sur);
    const antes = aeropuerto(v);
    v.ponerTiempo(conViento(sur, { ...TIEMPO_DE_CASA, vientoDe: 60, vientoKt: 20 }));
    const despues = aeropuerto(v);
    expect(despues).toBeDefined();
    expect(despues).not.toBe(antes);
    // Y uno solo: el de antes se va, no se queda debajo.
    expect(
      v.terreno.group.children.filter((o) => o.name.startsWith("aerodromo:")),
    ).toHaveLength(1);
  });

  it("y rehecho de lejos, sale apagado como el resto de la isla", () => {
    const v = new MundoVecino(norte, sur);
    // Con el ojo a trescientos kilómetros: la isla pasa a «de lejos».
    v.alPaso(v.desplazamiento.x + 300_000, v.desplazamiento.z);
    expect(v.cerca).toBe(false);
    v.ponerTiempo(conViento(sur, { ...TIEMPO_DE_CASA, vientoDe: 240, vientoKt: 20 }));
    expect(aeropuerto(v)?.visible).toBe(false);
  });

  it("y lo colgado de su aeródromo se apaga y se enciende con él", () => {
    const v = new MundoVecino(norte, sur);
    const luces = new Group();
    v.colgarDeCerca(luces);
    v.alPaso(v.desplazamiento.x + 300_000, v.desplazamiento.z);
    expect(luces.parent?.visible).toBe(false);
    v.alPaso(v.desplazamiento.x, v.desplazamiento.z);
    expect(luces.parent?.visible).toBe(true);
  });
});
