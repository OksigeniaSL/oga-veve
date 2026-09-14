/**
 * Que todos los aviones suenen, y cada uno a lo suyo.
 *
 * **Tres de los seis no tenían tono de motor y nadie lo apuntó.** El
 * turbohélice y los dos reactores llevaban `cylinders: 0` —que es verdad, una
 * turbina no tiene cilindros— y la nota del motor sale de la frecuencia de
 * encendido, `vueltas × cilindros / 2`. O sea: **cero hercios**. Un oscilador a
 * cero hercios no suena.
 *
 * No se cazó jugando porque el motor no es una capa sino cuatro —la nota, el
 * armónico, el timbre y la hélice—, y las otras tres sí sonaban: el avión hacía
 * ruido, solo que sin la que dice de qué motor es. Y eso es precisamente lo que
 * este juego enseña sin decirlo: que un radial no suena como un reactor.
 *
 * Aquí se comprueba la cuenta, no el sonido. El sonido hay que oírlo; la cuenta
 * se puede vigilar, y es la que estaba en cero.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";

/**
 * La nota del motor, en hercios. **La misma cuenta que hace `audio.ts`**.
 *
 * Está repetida aquí y no importada porque la de allí vive dentro de un método
 * que necesita un `AudioContext`, y montar Web Audio para leer un número sería
 * cambiar lo que se mide. Si un día se separa, esta copia se va.
 */
function nota(a: AircraftConfig, gas: number): number {
  const s = a.sound;
  const rpm = s.idleRpm + gas * (s.maxRpm - s.idleRpm);
  return s.palasDeFan
    ? (rpm / 60) * s.palasDeFan
    : (rpm / 60) * (s.cylinders / 2);
}

describe("el motor de cada avión", () => {
  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "el %s suena al ralentí",
    (_id, a) => {
      // Veinte hercios es el suelo de lo que oye una persona. Por debajo de
      // eso no es una nota grave: es nada.
      expect(nota(a, 0)).toBeGreaterThan(20);
    },
  );

  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "el %s sube de nota con el gas",
    (_id, a) => {
      expect(nota(a, 1)).toBeGreaterThan(nota(a, 0) * 1.3);
    },
  );

  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "y el %s no chilla a tope",
    (_id, a) => {
      /*
       * Cinco mil hercios. Por encima de eso ya no es un motor: es un pitido,
       * y encima el armónico va al doble. El JAZ 120 llegó a 7.283 porque sus
       * vueltas eran un número de adorno —9.500— en vez de las de su fan.
       */
      expect(nota(a, 1)).toBeLessThan(5000);
    },
  );

  it("una turbina se distingue de un pistón por el oído", () => {
    /*
     * **Y esto es lo que el juego enseña sin decirlo.** Un radial golpea grave
     * y un turbofán silba agudo, y reconocerlo es de la misma familia que
     * reconocer un avión por su silueta. Si los seis sonaran en la misma banda,
     * el canal se perdería.
     */
    const deTurbina = AIRCRAFT.filter((a) => a.sound.palasDeFan);
    const dePiston = AIRCRAFT.filter((a) => !a.sound.palasDeFan);
    expect(deTurbina.length).toBeGreaterThan(0);
    expect(dePiston.length).toBeGreaterThan(0);

    const reactores = AIRCRAFT.filter((a) => a.sound.engine === "turbofan");
    const masGrave = Math.max(...dePiston.map((a) => nota(a, 1)));
    for (const r of reactores)
      expect(nota(r, 1), `${r.id}`).toBeGreaterThan(masGrave * 2);
  });
});
