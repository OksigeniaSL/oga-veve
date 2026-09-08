/**
 * La bitácora, comprobada.
 *
 * Lo que se guarda entre partidas es de lo poco que no se puede arreglar
 * después: un formato mal escrito hoy es el historial de alguien perdido
 * mañana. Y lo que más importa es que **nunca reviente**, porque el sitio
 * donde vive —`localStorage`— puede estar bloqueado, lleno o con basura
 * dentro.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { olvidar } from "../datos/guardado";
import {
  adelgazar,
  apuntarVuelo,
  CUANTOS_VUELOS,
  leerBitacora,
  PUNTOS_DE_TRAZA,
  segundosDeBitacora,
  type Vuelo,
} from "./bitacora";

const LLAVE = "oga-veve:bitacora";

/**
 * Un `localStorage` de mentira, en diez líneas.
 *
 * Las pruebas corren en Node, donde no hay navegador ni almacenamiento, y
 * traerse un DOM entero —jsdom, happy-dom— para guardar cuatro cadenas sería
 * arrastrar una dependencia grande por una función pequeña. Ver AGENTS.md,
 * regla 5.
 */
const memoria = new Map<string, string>();
const almacen: Storage = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => void memoria.set(k, String(v)),
  removeItem: (k) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};
(globalThis as { localStorage: Storage }).localStorage = almacen;

const vuelo = (n: number, puntos = 3): Vuelo => ({
  fecha: `2026-09-0${(n % 9) + 1}T10:00:00.000Z`,
  escenario: "yvytu-rape",
  leccion: "despegue",
  tramo: "guyrami",
  segundos: 60 + n,
  galones: ["toma"],
  traza: Array.from({ length: puntos }, (_, i) => [i, n] as const),
});

describe("la bitácora", () => {
  /*
   * Y se olvida lo leído, no solo lo guardado.
   *
   * Desde que la bitácora vive dentro del guardado con versión, hay una copia
   * en memoria que se lee una vez por sesión —para no volver a parsear en cada
   * consulta—, así que vaciar el almacenamiento sin más dejaba la prueba
   * mirando la sesión anterior. Ver `datos/guardado.ts`.
   */
  beforeEach(() => {
    localStorage.clear();
    olvidar();
  });

  it("empieza vacía y no se queja", () => {
    expect(leerBitacora()).toEqual([]);
  });

  it("apunta el último vuelo el primero", () => {
    apuntarVuelo(vuelo(1));
    apuntarVuelo(vuelo(2));
    expect(leerBitacora().map((v) => v.segundos)).toEqual([62, 61]);
  });

  it("no guarda más vuelos de la cuenta", () => {
    for (let i = 0; i < CUANTOS_VUELOS + 12; i++) apuntarVuelo(vuelo(i));
    expect(leerBitacora().length).toBe(CUANTOS_VUELOS);
  });

  it("recorta la traza larga sin perder ni el principio ni el final", () => {
    const larga = Array.from({ length: 900 }, (_, i) => [i, 0] as const);
    apuntarVuelo({ ...vuelo(1), traza: larga });
    const guardada = leerBitacora()[0]!.traza;
    expect(guardada.length).toBe(PUNTOS_DE_TRAZA);
    expect(guardada[0]).toEqual([0, 0]);
    expect(guardada[guardada.length - 1]).toEqual([899, 0]);
  });

  it("adelgazar reparte, no corta por el final", () => {
    const traza = Array.from({ length: 100 }, (_, i) => [i, 0] as const);
    const corta = adelgazar(traza, 10);
    expect(corta.length).toBe(10);
    // Repartidos: el de en medio está por la mitad del vuelo, no en el minuto
    // uno, que es lo que pasaría cortando por el final.
    expect(corta[5]![0]).toBeGreaterThan(40);
    expect(corta[5]![0]).toBeLessThan(60);
  });

  it("la basura de dentro no rompe nada", () => {
    localStorage.setItem(LLAVE, "esto no es json");
    expect(leerBitacora()).toEqual([]);
    localStorage.setItem(LLAVE, '{"no":"es un array"}');
    expect(leerBitacora()).toEqual([]);
    localStorage.setItem(LLAVE, '[{"fecha":"x"},{"nada":1}]');
    expect(leerBitacora()).toEqual([]);
  });

  it("suma las horas de todo lo guardado", () => {
    apuntarVuelo(vuelo(1));
    apuntarVuelo(vuelo(2));
    expect(segundosDeBitacora(leerBitacora())).toBe(123);
  });
});
