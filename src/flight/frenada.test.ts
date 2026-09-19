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
import { rodaduraDeFrenada } from "./carrera";
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
): { metros: number; g: number; segundos: number; enElAire: number } {
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
  const mandos = { ...neutralControls(), brakes: 1, throttle: 0 };
  const dt = 1 / 60;
  let metros = 0;
  let segundos = 0;
  let enElAire = 0;
  let pasos = 0;
  let v = desde;
  while (v > 0.5 && segundos < 180) {
    const antes = s.position.clone();
    modelo.step(dt, mandos);
    metros += Math.hypot(s.position.x - antes.x, s.position.z - antes.z);
    if (!s.onGround) enElAire++;
    pasos++;
    v = Math.hypot(s.velocity.x, s.velocity.z);
    segundos += dt;
  }
  return {
    metros,
    segundos,
    enElAire: enElAire / Math.max(1, pasos),
    g: (desde * desde) / (2 * metros) / GRAVEDAD,
  };
}

describe("la frenada en tierra", () => {
  it("frena como un avión, no como un coche", () => {
    /*
     * Entre 0,2 y 0,45 g de media. Por debajo no se para en ninguna pista; por
     * encima es un coche, y un avión que se planta como un coche enseña a no
     * planificar la carrera de frenada — que es justo lo que hay que aprender.
     *
     * Medido: los seis salen entre 0,31 y 0,33 g, o sea el coeficiente de
     * freno del modelo —0,28 más la rodadura del asfalto— más lo poco que
     * añade la resistencia aerodinámica promediada hasta pararse. Una avioneta
     * de verdad en asfalto seco anda justo por ahí.
     */
    for (const a of AIRCRAFT) {
      const { g } = frenarDesde(a.id, a.approachSpeed);
      expect(g, `${a.id}: ${g.toFixed(2)} g`).toBeGreaterThan(0.2);
      expect(g, `${a.id}: ${g.toFixed(2)} g`).toBeLessThan(0.45);
    }
  });

  it("y para en lo que dice la cuenta que decide qué avión cabe", () => {
    /*
     * **Ésta es la que importa.** `rodaduraDeFrenada` es la que dice si un
     * avión entra en una pista, y la que usa el motor de Guyrami, que no tiene
     * fuerzas. Si el motor de coeficientes frenara distinto, media flota
     * estaría autorizada a pistas donde no para.
     *
     * Medido, los seis paran **algo antes** de lo que dice la cuenta —×0,79 a
     * ×0,92—, y esa dirección es la buena: la cuenta va del lado seguro, así
     * que ningún avión se cuela en una pista donde no pare. Lo que esto caza
     * es un signo cambiado o un factor perdido, no un cinco por ciento.
     *
     *     jaz-20   174 m medidos · 207 de cuenta   ×0,84   0,32 g
     *     jaz-25   131 m ·  142   ×0,92   0,33 g
     *     jaz-40   308 m ·  363   ×0,85   0,32 g
     *     jaz-60   369 m ·  450   ×0,82   0,32 g
     *     jaz-90   764 m ·  962   ×0,79   0,31 g
     *     jaz-120  932 m · 1112   ×0,84   0,31 g
     */
    for (const a of AIRCRAFT) {
      const medido = frenarDesde(a.id, a.approachSpeed).metros;
      const cuenta = rodaduraDeFrenada(a);
      expect(
        medido / cuenta,
        `${a.id}: ${Math.round(medido)} m medidos contra ${Math.round(cuenta)} de la cuenta`,
      ).toBeGreaterThan(0.75);
      expect(
        medido / cuenta,
        `${a.id}: ${Math.round(medido)} m medidos contra ${Math.round(cuenta)} de la cuenta`,
      ).toBeLessThan(1.25);
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
    // El rozamiento de rodadura de la hierba ayuda a frenar, pero la cuenta de
    // qué cabe la usa al revés para el despegue. Que no se crucen los signos.
    for (const a of AIRCRAFT)
      expect(rodaduraDeFrenada(a, "hierba"), a.id).toBeLessThan(
        rodaduraDeFrenada(a, "asfalto"),
      );
  });
});
