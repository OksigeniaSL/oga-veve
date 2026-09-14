/**
 * La fila de motores del cuadro de mandos.
 *
 * Es la parte del panel que **cambia de verdad** de un avión a otro. Los seis
 * instrumentos clásicos son los mismos en una avioneta y en un Boeing —ese es
 * el hallazgo que se lleva quien aprende aquí— pero encima de ellos, en un
 * avión de línea, hay una fila de agujas que no está en una avioneta: una por
 * motor, y todas iguales, y todas moviéndose a la vez.
 *
 * Pedido jugando y con estas palabras: «el niño que juega quiere fliparlo y ver
 * botones y lucecitas, quiere un monstruo de avión, no una avioneta».
 *
 * ## Y qué marca cada una
 *
 * No es adorno: es el mando con el que se vuela cada tipo de motor.
 *
 * - **RPM** en un pistón o un radial: las vueltas de la hélice, que es lo que
 *   se ajusta con el gas.
 * - **TRQ** en un turbohélice: el par, porque su hélice gira a vueltas
 *   constantes y lo que cambia es la fuerza con la que muerde.
 * - **N1** en un turbofán: el régimen del fan. Es **el** número de una cabina
 *   de avión de línea — se despega «poniendo N1» y se cruza con un N1.
 *
 * Y la barra no empieza en cero con el motor en marcha, que es lo que confunde
 * a quien mira: un motor encendido gira, y un turbofán al ralentí anda por el
 * veinte por ciento.
 */

import { regimen, type Cuadro } from "./cuadro";
import type { AircraftConfig } from "../flight/aircraft";

/** El marcado de la fila. Vacío si este avión no la lleva. */
export function markupDeMotores(c: Cuadro): string {
  /*
   * **Un solo motor de pistón no lleva fila**, y no es por ahorrar: en una
   * avioneta de escuela el cuentavueltas es un instrumento más del montón y
   * meterlo aquí arriba sería enseñar una cabina que no existe. La fila
   * aparece cuando hay algo que mirar: más de un motor, o una turbina.
   */
  if (c.motores < 2 && c.queMarca === "rpm") return "";
  const agujas = Array.from(
    { length: c.motores },
    (_, i) => `
      <div class="aguja-motor" data-motor="${i}">
        <div class="aguja-motor__caja">
          <div class="aguja-motor__relleno" data-motor-relleno="${i}"></div>
        </div>
        <span class="aguja-motor__numero">${i + 1}</span>
      </div>`,
  ).join("");
  return `
    <div class="motores" data-hud="motores" role="group" aria-label="Motores">
      <span class="motores__rotulo">${c.rotulo}</span>
      <div class="motores__fila">${agujas}</div>
    </div>
  `;
}

/** Mueve las barras. Se le da el gas y si el motor está en marcha. */
export class Motores {
  private rellenos: HTMLElement[] = [];
  private caja: HTMLElement | null = null;

  bind(root: HTMLElement): void {
    this.caja = root.querySelector<HTMLElement>('[data-hud="motores"]');
    this.rellenos = this.caja
      ? [...this.caja.querySelectorAll<HTMLElement>("[data-motor-relleno]")]
      : [];
  }

  get present(): boolean {
    return this.rellenos.length > 0;
  }

  update(a: AircraftConfig, gas: number, encendido: boolean): void {
    const r = regimen(a, gas, encendido);
    for (const relleno of this.rellenos) {
      relleno.style.height = `${(r * 100).toFixed(0)}%`;
      /*
       * Y por encima del ochenta y cinco por ciento se pone ámbar, que es
       * régimen de despegue: el sitio donde un motor da todo lo que tiene y no
       * se está mucho rato. En un turbofán es además donde aparece el gruñido
       * del *buzz-saw*, o sea que lo que se ve y lo que se oye son lo mismo.
       */
      relleno.classList.toggle("aguja-motor__relleno--tope", r > 0.85);
    }
  }
}
