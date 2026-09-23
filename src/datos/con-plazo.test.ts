/**
 * El plazo de las cargas del arranque.
 *
 * Lo que se comprueba es lo que costó encontrar: que **una promesa que no
 * resuelve nunca deje de parar el juego**. Es la avería más silenciosa que ha
 * tenido este proyecto —sin excepción, sin línea en consola, sin nada— y la
 * única pista que había era un número: arranque normal de 1,6 s contra un
 * tope de banco de 120.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  conPlazo,
  PLAZO_DE_DATO,
  PLAZO_DE_IMAGEN,
} from "./con-plazo";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("esperar con plazo", () => {
  it("si llega a tiempo, devuelve lo que llegó", async () => {
    await expect(conPlazo(Promise.resolve(42), 1000, "algo")).resolves.toBe(42);
  });

  /*
   * **La prueba que de verdad importa.**
   *
   * Una promesa que no se resuelve jamás: exactamente lo que hacía
   * `TextureLoader.loadAsync` cuando la petición de la imagen se quedaba a
   * medias sin llegar a fallar. Sin plazo, esto colgaría la prueba igual que
   * colgaba el arranque — y por eso se mide con reloj de mentira: si el plazo
   * no estuviera, el `await` no volvería nunca.
   */
  it("y si no llega nunca, sigue sin ello en vez de esperar para siempre", async () => {
    vi.useFakeTimers();
    const nuncaJamas = new Promise<number>(() => {});
    const espera = conPlazo(nuncaJamas, 5000, "la ortofoto de prueba");
    await vi.advanceTimersByTimeAsync(5000);
    await expect(espera).resolves.toBeUndefined();
  });

  it("y lo dice, que es lo que faltaba para poder encontrarlo", async () => {
    /*
     * El reverso de «que falte un recurso no deje a nadie sin volar» ya costó
     * caro una vez en esta casa: **nadie se entera de que se apagó**. Un
     * recurso que se cae en silencio es la avería que no se encuentra, así que
     * el plazo avisa por el canal que el banco mira.
     */
    vi.useFakeTimers();
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const espera = conPlazo(new Promise(() => {}), 3000, "la ficha de guaraní");
    await vi.advanceTimersByTimeAsync(3000);
    await espera;
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(String(aviso.mock.calls[0]?.[0])).toContain("la ficha de guaraní");
    expect(String(aviso.mock.calls[0]?.[0])).toContain("3 s");
  });

  it("y no avisa cuando no hace falta", async () => {
    vi.useFakeTimers();
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(conPlazo(Promise.resolve("ya"), 3000, "x")).resolves.toBe(
      "ya",
    );
    await vi.advanceTimersByTimeAsync(10000);
    expect(aviso).not.toHaveBeenCalled();
  });

  it("y un fallo de verdad sigue siendo un fallo, no un plazo agotado", async () => {
    // Si el recurso **falla**, eso no lo tapa este envoltorio: quien llama ya
    // sabe distinguir «no está» de «no llegó», y taparlo sería cambiar un
    // silencio por otro.
    await expect(
      conPlazo(Promise.reject(new Error("404")), 1000, "x"),
    ).rejects.toThrow("404");
  });
});

describe("y los dos plazos", () => {
  it("son holgados: esto no es una cuota, es un cortacircuitos", () => {
    /*
     * El arranque más lento medido en los diecisiete escenarios son 3,0 s.
     * Estos plazos tienen que quedar muy por encima de eso — se busca que no
     * salten **nunca** en uso normal, ni en la conexión de un colegio con una
     * ortofoto de megabyte y medio. Un plazo que salta a veces sería otra
     * fuente de fallos aleatorios, que es lo que se estaba quitando.
     */
    expect(PLAZO_DE_DATO).toBeGreaterThanOrEqual(10000);
    expect(PLAZO_DE_IMAGEN).toBeGreaterThanOrEqual(30000);
  });

  it("y por debajo del tope del banco, que si no no arreglan nada", () => {
    // El banco de vuelo entero da 120 s para arrancar. Un plazo por encima de
    // eso dejaría el cuelgue exactamente igual de invisible.
    expect(PLAZO_DE_IMAGEN).toBeLessThan(120000);
    expect(PLAZO_DE_DATO).toBeLessThan(120000);
  });
});
