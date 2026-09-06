/**
 * Dónde empieza la lección de aterrizar, y dónde el primer aro.
 *
 * Son dos números de la misma senda y estaban sueltos: tres mil metros de
 * entrada, 3200 el primer aro. O sea que la lección **empezaba pasada** del
 * primer punto de control, y con el medio kilómetro que vuela el avión
 * mientras carga la escena, pasada del segundo también. «Paso por arriba sin
 * que el juego me diga nada para corregir, lo hago especialmente en el primer
 * y segundo aro»: no es que el aviso fallara, es que esos dos aros ya estaban
 * dados por perdidos antes de que nadie tocara nada.
 */

import { describe, expect, it } from "vitest";
import { ENTRADA_EN_FINAL, FIRST_RING_DISTANCE } from "./runway-guide";

describe("la entrada en final", () => {
  it("queda por delante del primer aro, con margen", () => {
    expect(ENTRADA_EN_FINAL).toBeGreaterThan(FIRST_RING_DISTANCE + 300);
  });
});
