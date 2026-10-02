/**
 * Lo que tarda en parar, medido sobre el propio motor de vuelo.
 *
 * Existe porque el banco de vuelo entero dio un fallo en la frontera —«rodó
 * 97 m desde que tocó a 32 m/s», con el listón en 101— y de un número en la
 * frontera no se puede decir si sobra frenada o falta listón: hay que medir la
 * frenada sin aeropuerto, sin viento y sin depender de dónde se tocó.
 *
 * Y lo que se comprueba no es un número inventado: es **la promesa que ya está
 * escrita en `carrera.ts`** y que nadie comprobaba —«el coeficiente de frenado
 * es el mismo que usa el motor de vuelo, porque si aquí se frenara distinto
 * que ahí, esta cuenta diría que el avión cabe y el avión se saldría
 * igualmente»—. `rodaduraDeFrenada` es la que decide qué avión entra en qué
 * pista; si el motor de vuelo frena distinto, la regla de qué cabe es papel
 * mojado.
 */

import { describe, expect, it } from "vitest";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT } from "./aircraft";
import { rodaduraDeFrenada, velocidadDeToma } from "./carrera";
import { neutralControls } from "./model";

const GRAVEDAD = 9.80665;

/**
 * Pone el avión en el suelo a `desde` m/s, pisa el freno a fondo y cuenta los
 * metros hasta pararse del todo.
 */
function frenarDesde(
  id: string,
  desde: number,
  /** Pendiente de la pista, en tanto por uno. Negativa es cuesta abajo. */
  pendiente = 0,
  /**
   * Y cómo se aterriza, si se quiere como de verdad: los flaps de aterrizaje
   * y los frenos de tierra en el que los lleva. Sin poner, el avión limpio.
   */
  comoSeAterriza = false,
): {
  metros: number;
  g: number;
  segundos: number;
  enElAire: number;
  /** La deceleración más fuerte mientras corre, en g. */
  pico: number;
} {
  const aircraft = AIRCRAFT.find((a) => a.id === id)!;
  const modelo = new CoefficientFlightModel({
    aircraft,
    ground: (_x: number, z: number) => -z * pendiente,
    assist: 0,
  });
  const s = modelo.state;
  s.onGround = true;
  s.position.set(0, 0, 0);
  s.velocity.set(0, 0, -desde);
  s.heading = 0;
  s.position.y = aircraft.gearHeight;
  const mandos = {
    ...neutralControls(),
    brakes: 1,
    throttle: 0,
    ...(comoSeAterriza
      ? { flaps: 1, frenosDeTierra: aircraft.frenosDeTierra ? 1 : 0 }
      : {}),
  };
  const dt = 1 / 60;
  let metros = 0;
  let segundos = 0;
  let enElAire = 0;
  let pasos = 0;
  let pico = 0;
  let v = desde;
  while (v > 0.5 && segundos < 180) {
    const antes = s.position.clone();
    modelo.step(dt, mandos);
    metros += Math.hypot(s.position.x - antes.x, s.position.z - antes.z);
    if (!s.onGround) enElAire++;
    pasos++;
    const ahora = Math.hypot(s.velocity.x, s.velocity.z);
    // Corriendo: el último paso, el del rozamiento estático, no es frenar.
    if (ahora > 2) pico = Math.max(pico, (v - ahora) / dt / GRAVEDAD);
    v = ahora;
    segundos += dt;
  }
  return {
    metros,
    segundos,
    enElAire: enElAire / Math.max(1, pasos),
    g: (desde * desde) / (2 * metros) / GRAVEDAD,
    pico,
  };
}

describe("la frenada en tierra", () => {
  it("frena como un avión, no como un coche", () => {
    /*
     * Como se aterriza —flaps de aterrizaje, freno a fondo y los frenos de
     * tierra fuera en el que los lleva—, desde la velocidad de toma: entre 0,2
     * y 0,5 g de media, y nunca más de 0,5 en ningún instante. Por debajo no
     * se para en ninguna pista; por encima es un coche, y un avión que se
     * planta como un coche enseña a no planificar la carrera de frenada.
     *
     * Medido: de 0,28 a 0,30 g las avionetas y el turbohélice, 0,37 el
     * cuatrimotor y 0,47 el regional, que es lo que para un reactor con frenos
     * de carbono y los de tierra fuera. Ver `distancia-de-aterrizaje.test.ts`,
     * que lo compara con los manuales.
     */
    for (const a of AIRCRAFT) {
      const { g, pico } = frenarDesde(a.id, velocidadDeToma(a), 0, true);
      expect(g, `${a.id}: ${g.toFixed(2)} g`).toBeGreaterThan(0.2);
      expect(g, `${a.id}: ${g.toFixed(2)} g`).toBeLessThan(0.5);
      expect(pico, `${a.id}: pico de ${pico.toFixed(2)} g`).toBeLessThan(0.55);
    }
  });

  it("y para en lo que dice la cuenta que decide qué avión cabe", () => {
    /*
     * **Ésta es la que importa.** `rodaduraDeFrenada` es la que dice si un
     * avión entra en una pista, y la que integra lo mismo que pregunta el
     * motor de Guyrami, que no tiene fuerzas. Si el motor de coeficientes
     * frenara distinto, media flota estaría autorizada a pistas donde no
     * para.
     *
     * Antes salía entre ×0,79 y ×0,92: la cuenta frenaba sobre el peso que
     * cargan las ruedas y el motor sobre todo el peso. Ahora los dos lo hacen
     * sobre lo que cargan las ruedas, con la misma cuenta, y salen a menos de
     * un uno por ciento: se deja un cinco.
     */
    for (const a of AIRCRAFT) {
      const medido = frenarDesde(a.id, velocidadDeToma(a), 0, true).metros;
      const cuenta = rodaduraDeFrenada(a);
      expect(
        medido / cuenta,
        `${a.id}: ${Math.round(medido)} m medidos contra ${Math.round(cuenta)} de la cuenta`,
      ).toBeGreaterThan(0.95);
      expect(
        medido / cuenta,
        `${a.id}: ${Math.round(medido)} m medidos contra ${Math.round(cuenta)} de la cuenta`,
      ).toBeLessThan(1.05);
    }
  });

  it("y en una pista cuesta abajo las ruedas siguen en el suelo", () => {
    /*
     * **El fallo tal cual era, y costó toda una tarde de banco.**
     *
     * En tierra la velocidad vertical negativa se anula —para que el tren se
     * coma los botes— y el avión solo se pegaba al suelo **hacia arriba**. En
     * una pista con pendiente eso quiere decir que el suelo se escapa por
     * debajo: cuando el hueco pasa del palmo de holgura, `onGround` se apaga, y
     * como el freno solo frena si la rueda toca, el avión deja de frenar.
     *
     * Medido en La Palma, cuya pista cae dos metros en los cuatrocientos de la
     * frenada: 73 % de la frenada con la bandera en el aire y 0,09 g en vez de
     * 0,32. El banco lo contaba como «este avión frena mal» — y frenaba
     * perfectamente: no tocaba el suelo.
     *
     * Medio por ciento de pendiente es poco más de lo que tiene La Palma, y
     * mucho menos de lo que tienen pistas de verdad que llegan al dos.
     */
    for (const pendiente of [-0.005, -0.01, -0.02]) {
      const llano = frenarDesde("jaz-20", 30, 0);
      const cuesta = frenarDesde("jaz-20", 30, pendiente);
      expect(
        cuesta.enElAire,
        `${pendiente * 100} %: ${Math.round(cuesta.enElAire * 100)} % en el aire`,
      ).toBeLessThan(0.05);
      // Y frena casi lo mismo: cuesta abajo la gravedad ayuda un poco al
      // avión a seguir, pero no puede doblar la distancia.
      expect(
        cuesta.metros / llano.metros,
        `${pendiente * 100} %: ${Math.round(cuesta.metros)} m contra ${Math.round(llano.metros)}`,
      ).toBeLessThan(1.3);
    }
  });

  it("y en llano, ni un fotograma en el aire", () => {
    // El otro lado de la prueba de arriba: si en llano ya saliera en el aire,
    // aquélla no estaría midiendo la pendiente.
    for (const a of AIRCRAFT)
      expect(frenarDesde(a.id, a.approachSpeed).enElAire, a.id).toBe(0);
  });

  it("y en hierba se para más tarde que en asfalto, no antes", () => {
    /*
     * Rodar sin frenar cuesta más en hierba, pero frenar cuesta menos: la
     * rueda frenada patina. El manual del 172 lo dice con su número —en
     * hierba seca, la rodadura de aterrizaje un 45 % más larga—, y aquí se
     * comprobaba al revés, porque solo se contaba la rodadura. Que la hierba
     * pida más pista para parar, de un veinte a un sesenta por ciento.
     */
    for (const a of AIRCRAFT) {
      const r = rodaduraDeFrenada(a, "hierba") / rodaduraDeFrenada(a, "asfalto");
      expect(r, a.id).toBeGreaterThan(1.2);
      expect(r, a.id).toBeLessThan(1.6);
    }
  });
});
