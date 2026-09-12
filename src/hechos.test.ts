/**
 * El reparto de hechos: que llegue a quien escucha, y solo a quien escucha.
 *
 * Son cuarenta líneas y se prueban enteras aquí porque es el único sitio del
 * juego donde una equivocación no se ve jugando: un hecho que no llega no
 * rompe nada, simplemente **no pasa** lo que tenía que pasar, y eso desde
 * fuera se parece mucho a que la cosa todavía no está hecha.
 */
import { describe, expect, it } from "vitest";
import { Reparto } from "./hechos";

describe("el reparto de hechos", () => {
  it("le llega a quien se apuntó, con sus datos", () => {
    const r = new Reparto();
    const oido: boolean[] = [];
    r.on("frustrada", (d) => oido.push(d.mandada));
    r.emit("frustrada", { mandada: true });
    expect(oido).toEqual([true]);
  });

  it("les llega a todos, y en el orden en que se apuntaron", () => {
    const r = new Reparto();
    const orden: string[] = [];
    r.on("frustrada", () => orden.push("tarjeta"));
    r.on("frustrada", () => orden.push("sonido"));
    r.on("frustrada", () => orden.push("cuaderno"));
    r.emit("frustrada", { mandada: false });
    expect(orden).toEqual(["tarjeta", "sonido", "cuaderno"]);
  });

  it("sin nadie escuchando no pasa nada, y no revienta", () => {
    const r = new Reparto();
    expect(() => r.emit("frustrada", { mandada: false })).not.toThrow();
  });

  it("darse de baja deja de oírlo", () => {
    const r = new Reparto();
    let veces = 0;
    const baja = r.on("frustrada", () => veces++);
    r.emit("frustrada", { mandada: false });
    baja();
    r.emit("frustrada", { mandada: false });
    expect(veces).toBe(1);
  });

  /*
   * **Y darse de baja mientras suena no se salta al siguiente.**
   *
   * Es el fallo clásico de recorrer la lista viva, y es el que tiene una
   * celebración que solo pasa una vez: se apunta, se entera, se da de baja — y
   * de paso se lleva por delante al que venía detrás, que nunca se entera de
   * nada. Ya se pagó una vez en `flight/agenda.ts`.
   */
  it("uno que se da de baja al enterarse no le quita el turno al siguiente", () => {
    const r = new Reparto();
    const orden: string[] = [];
    const baja = r.on("frustrada", () => {
      orden.push("primero");
      baja();
    });
    r.on("frustrada", () => orden.push("segundo"));
    r.emit("frustrada", { mandada: false });
    expect(orden).toEqual(["primero", "segundo"]);
  });

  it("dice cuántos escuchan, que es lo que se comprueba desde fuera", () => {
    const r = new Reparto();
    expect(r.cuantosEscuchan("frustrada")).toBe(0);
    const baja = r.on("frustrada", () => {});
    r.on("frustrada", () => {});
    expect(r.cuantosEscuchan("frustrada")).toBe(2);
    baja();
    expect(r.cuantosEscuchan("frustrada")).toBe(1);
  });
});
