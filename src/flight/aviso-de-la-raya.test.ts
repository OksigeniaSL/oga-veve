/**
 * «Volvé a la raya verde», una vez por salida: se rearma volviendo a la raya,
 * nunca por reloj. Ver `aviso-de-la-raya.ts`.
 */
import { describe, expect, it } from "vitest";
import { AvisoDeLaRaya, DE_VUELTA } from "./aviso-de-la-raya";

/** Pregunta `veces` fotogramas seguidos y cuenta cuántas veces se dice. */
function durante(a: AvisoDeLaRaya, veces: number, fuera: boolean, aLaRaya: number): number {
  let dichas = 0;
  for (let i = 0; i < veces; i++) {
    if (a.toca(fuera, aLaRaya)) {
      a.dicho();
      dichas++;
    }
  }
  return dichas;
}

describe("volvé a la raya verde", () => {
  it("se dice al salirse, una vez, aunque se siga fuera diez minutos", () => {
    const a = new AvisoDeLaRaya();
    expect(durante(a, 60, false, 2)).toBe(0);
    expect(durante(a, 60 * 600, true, 45)).toBe(1);
  });

  it("vuelve después de haber vuelto a la raya y haberse salido otra vez", () => {
    const a = new AvisoDeLaRaya();
    durante(a, 60, true, 45);
    durante(a, 60, false, DE_VUELTA - 2);
    expect(durante(a, 60, true, 40)).toBe(1);
  });

  it("y rodar por el borde de los treinta metros no lo rearma: hay que volver de verdad", () => {
    const a = new AvisoDeLaRaya();
    durante(a, 60, true, 31);
    let dichas = 0;
    for (let i = 0; i < 600; i++) {
      // Dentro y fuera del umbral de salirse, cada fotograma, sin acercarse a la raya.
      const fuera = i % 2 === 0;
      dichas += durante(a, 1, fuera, fuera ? 31 : 29);
    }
    expect(dichas).toBe(0);
  });

  it("lo tapado por otro aviso no se pierde: sigue tocando hasta que se dice", () => {
    const a = new AvisoDeLaRaya();
    expect(a.toca(true, 40)).toBe(true);
    expect(a.toca(true, 40)).toBe(true);
    a.dicho();
    expect(a.toca(true, 40)).toBe(false);
  });

  it("vuelo nuevo, armado otra vez", () => {
    const a = new AvisoDeLaRaya();
    durante(a, 10, true, 40);
    a.reiniciar();
    expect(a.toca(true, 40)).toBe(true);
  });
});
