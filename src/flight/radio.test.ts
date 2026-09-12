/**
 * El otro avión de la frecuencia: cuándo habla y, sobre todo, cuándo no.
 *
 * Lo que se comprueba aquí es que sea **una historia y no cinco frases al
 * azar** —saluda, rueda, viento en cola, final, pista libre— y que no se le
 * suba encima al instructor, que es la única voz que enseña algo.
 */

import { describe, expect, it } from "vitest";

import {
  ESPERA_ENTRE_VUELOS,
  ESPERA_MAXIMA,
  ESPERA_MINIMA,
  ESPERA_PRIMERA,
  LLAMADAS,
  Radio,
  type Momento,
} from "./radio";

/** El silencio que sale con el azar clavado a la mitad, en segundos. */
const HUECO = ESPERA_MINIMA + (ESPERA_MAXIMA - ESPERA_MINIMA) / 2;
/** Y lo que tarda el otro avión en contar su vuelo entero. */
const UN_VUELO = ESPERA_PRIMERA + HUECO * (LLAMADAS.length - 1) + 2;

/** Un momento tranquilo: rodando, de día y con el instructor callado. */
const TRANQUILO: Momento = {
  fase: "rodando",
  deDia: true,
  instructorHablando: false,
};

/** Deja pasar `segundos` y devuelve todo lo que se oyó. */
function escuchar(radio: Radio, segundos: number, m: Momento = TRANQUILO) {
  const oido: string[] = [];
  for (let t = 0; t < segundos; t += 1) {
    const dice = radio.update(1, m);
    if (dice) oido.push(dice);
  }
  return oido;
}

describe("el otro avión", () => {
  it("saluda al principio, y no antes de tiempo", () => {
    const radio = new Radio(() => 0.5);
    expect(escuchar(radio, ESPERA_PRIMERA - 2)).toEqual([]);
    expect(escuchar(radio, 4)).toEqual(["otro.buenosDias"]);
  });

  it("cuenta su vuelo en orden, que es lo que lo hace un avión", () => {
    const radio = new Radio(() => 0.5);
    // Justo para las cinco, y ni un segundo para empezar otra vuelta.
    const oido = escuchar(radio, UN_VUELO);
    expect(oido).toEqual([...LLAMADAS]);
  });

  it("y después se calla un buen rato antes de volver a empezar", () => {
    const radio = new Radio(() => 0.5);
    escuchar(radio, UN_VUELO);
    // Justo después de la última no vuelve a hablar enseguida.
    expect(escuchar(radio, ESPERA_ENTRE_VUELOS - 10)).toEqual([]);
    expect(escuchar(radio, 20)).toEqual(["otro.buenosDias"]);
  });

  it("de noche no da los buenos días, pero sigue volando", () => {
    const radio = new Radio(() => 0.5);
    const noche = { ...TRANQUILO, deDia: false };
    const oido = escuchar(radio, ESPERA_PRIMERA + 4, noche);
    expect(oido).toEqual(["otro.rodando"]);
  });

  it("no habla en final ni en la toma", () => {
    // Ahí quien habla es el instructor y quien escucha tiene las manos
    // ocupadas.
    const radio = new Radio(() => 0.5);
    expect(escuchar(radio, 200, { ...TRANQUILO, fase: "final" })).toEqual([]);
    expect(escuchar(radio, 200, { ...TRANQUILO, fase: "aterrizado" })).toEqual(
      [],
    );
  });

  it("ni encima del instructor", () => {
    const radio = new Radio(() => 0.5);
    expect(
      escuchar(radio, 200, { ...TRANQUILO, instructorHablando: true }),
    ).toEqual([]);
  });

  it("pero no pierde el turno: espera y lo dice después", () => {
    // Saltarse una frase deja el relato cojo, y el relato es lo único que
    // hace que esto suene a otro avión y no a un altavoz.
    const radio = new Radio(() => 0.5);
    escuchar(radio, 200, { ...TRANQUILO, fase: "final" });
    expect(escuchar(radio, 2)).toEqual(["otro.buenosDias"]);
  });

  it("guarda lo último dicho, para que se pueda enseñar en pantalla", () => {
    const radio = new Radio(() => 0.5);
    expect(radio.ultima).toBeNull();
    escuchar(radio, ESPERA_PRIMERA + 2);
    expect(radio.ultima).toBe("otro.buenosDias");
  });

  it("y al reiniciar el vuelo, el otro avión también empieza de nuevo", () => {
    const radio = new Radio(() => 0.5);
    escuchar(radio, UN_VUELO);
    radio.reiniciar();
    expect(radio.ultima).toBeNull();
    expect(escuchar(radio, ESPERA_PRIMERA + 2)).toEqual(["otro.buenosDias"]);
  });

  it("el silencio entre frases no es siempre el mismo", () => {
    // Con la espera clavada, cinco frases a intervalos idénticos suenan a
    // reloj y no a radio.
    const corta = new Radio(() => 0);
    const larga = new Radio(() => 1);
    const t = ESPERA_PRIMERA + 40;
    expect(escuchar(corta, t).length).toBeGreaterThan(
      escuchar(larga, t).length,
    );
  });
});
