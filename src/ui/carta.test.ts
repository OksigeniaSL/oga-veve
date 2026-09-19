/**
 * Que la carta ponga cada cosa donde está.
 *
 * Es una cuenta de tres líneas y por eso mismo hay que probarla: escrita a
 * mano sale del revés una de cada dos, y una pista dibujada en el lado
 * contrario no es un error de dibujo — es enseñar a girar hacia donde no es.
 */
import { describe, expect, it } from "vitest";
import {
  MILLA,
  dibujarLaCarta,
  RANGOS,
  enLaCarta,
  extremosDePista,
  millasHasta,
  pixelesPorMetro,
  rangoPara,
} from "./carta";

const YO = { x: 0, z: 0 };
/** Un punto a `m` metros al norte, al este, al sur o al oeste. */
const norte = (m: number) => ({ x: 0, z: -m });
const este = (m: number) => ({ x: m, z: 0 });

describe("con el morro arriba", () => {
  it("mirando al norte, lo que está al norte sale arriba", () => {
    const { dx, dy } = enLaCarta(norte(1000), YO, 0, 1);
    expect(dx).toBeCloseTo(0);
    expect(dy).toBeCloseTo(-1000);
  });

  it("y lo que está al este, a la derecha", () => {
    const { dx, dy } = enLaCarta(este(1000), YO, 0, 1);
    expect(dx).toBeCloseTo(1000);
    expect(dy).toBeCloseTo(0);
  });

  it("mirando al este, lo que está al este pasa a salir arriba", () => {
    /*
     * La propiedad entera del módulo. Si esto sale al revés, la pista aparece
     * a la izquierda del cristal estando a la derecha de verdad.
     */
    const { dx, dy } = enLaCarta(este(1000), YO, 90, 1);
    expect(dx).toBeCloseTo(0);
    expect(dy).toBeCloseTo(-1000);
  });

  it("y lo que está al norte pasa a la izquierda", () => {
    const { dx, dy } = enLaCarta(norte(1000), YO, 90, 1);
    expect(dx).toBeCloseTo(-1000);
    expect(dy).toBeCloseTo(0);
  });

  it("lo que se deja atrás sale abajo, con cualquier rumbo", () => {
    for (const rumbo of [0, 37, 90, 180, 241, 359]) {
      const detras = enLaCarta(
        // El punto que queda justo a la espalda: se construye girando.
        {
          x: -Math.sin((rumbo * Math.PI) / 180) * 500,
          z: Math.cos((rumbo * Math.PI) / 180) * 500,
        },
        YO,
        rumbo,
        1,
      );
      expect(detras.dy, `rumbo ${rumbo}`).toBeGreaterThan(400);
      expect(Math.abs(detras.dx), `rumbo ${rumbo}`).toBeLessThan(1);
    }
  });

  it("y la distancia no cambia por mucho que gire la carta", () => {
    const p = { x: 900, z: -1200 };
    const largo = Math.hypot(900, 1200);
    for (const rumbo of [0, 45, 123, 270]) {
      const { dx, dy } = enLaCarta(p, YO, rumbo, 1);
      expect(Math.hypot(dx, dy)).toBeCloseTo(largo, 6);
    }
  });

  it("estando encima, cae en el centro", () => {
    expect(enLaCarta(YO, YO, 45, 3)).toEqual({ dx: 0, dy: -0 });
  });
});

describe("el rango se elige solo", () => {
  it("coge el menor en el que quepa lo que hay que ver", () => {
    expect(rangoPara(1)).toBe(2);
    expect(rangoPara(1.7)).toBe(5);
    expect(rangoPara(6)).toBe(10);
    expect(rangoPara(15)).toBe(20);
  });

  it("y lo que está lejísimos se queda en el mayor, no se sale de la lista", () => {
    expect(rangoPara(500)).toBe(RANGOS[RANGOS.length - 1]);
  });

  it("y con holgura: lo que se persigue no va pegado al canto", () => {
    // A cuatro quintos del radio. Pegado al borde es justo donde no se ve.
    for (const r of RANGOS) expect(rangoPara(r * 0.79)).toBeLessThanOrEqual(r);
  });

  it("y la escala cuadra con el rango elegido", () => {
    const radio = 120;
    const por = pixelesPorMetro(10, radio);
    // Diez millas tienen que caer justo en el borde de la rosa.
    expect(10 * MILLA * por).toBeCloseTo(radio);
  });

  it("y las millas se cuentan de un solo sitio", () => {
    // Para que la cifra que se escribe y el rango que se elige no puedan
    // discrepar: una carta que dice «4,0 NM» con el aeródromo fuera del
    // cristal es peor que una carta sin cifra.
    expect(millasHasta(este(MILLA * 4), YO)).toBeCloseTo(4);
    expect(rangoPara(millasHasta(este(MILLA * 4), YO))).toBe(5);
  });
});

describe("la pista se dibuja con su forma", () => {
  it("los dos extremos salen separados por su largo y en su rumbo", () => {
    const [a, b] = extremosDePista({ x: 0, z: 0, heading: 90, length: 2000 });
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(2000);
    // Rumbo 90 es al este: la cabecera de salida al oeste y el final al este.
    expect(a.x).toBeCloseTo(-1000);
    expect(b.x).toBeCloseTo(1000);
    expect(a.z).toBeCloseTo(0);
  });

  it("y con rumbo norte, una punta al sur y otra al norte", () => {
    const [a, b] = extremosDePista({ x: 0, z: 0, heading: 0, length: 1000 });
    expect(a.z).toBeCloseTo(500);
    expect(b.z).toBeCloseTo(-500);
  });

  it("y respetan dónde está la pista, no solo su forma", () => {
    const [a, b] = extremosDePista({
      x: 300,
      z: -400,
      heading: 90,
      length: 1000,
    });
    expect((a.x + b.x) / 2).toBeCloseTo(300);
    expect((a.z + b.z) / 2).toBeCloseTo(-400);
  });
});

describe("el aeropuerto de destino en la carta", () => {
  /*
   * Pedido jugando: «si salgo de un aeropuerto y me estoy acercando a otro,
   * estaría bien que se fuera mostrando también en el cuadro». Es lo que hace
   * cualquier navegador, y es la primera lección de navegación que se puede
   * dar aquí: poner rumbo a algo que todavía no se ve.
   */
  const RADIO = 100;
  const yo = { x: 0, z: 0 };
  /*
   * La pista de casa a ocho millas, y no a quinientos metros: **el rango de la
   * carta sale de lo lejos que esté ella**, así que con la pista debajo la
   * carta enseña dos millas y cualquier destino cae fuera. No es un detalle de
   * la prueba: es cómo funciona, y ponerlo mal hacía fallar la prueba y no el
   * código.
   */
  const mapa = (destino: { x: number; z: number } | null) => ({
    ...yo,
    pista: { x: 0, z: 8 * MILLA, heading: 0, length: 2000 },
    otros: [],
    destino,
  });

  it("sin destino no se dibuja nada, y eso no es un hueco", () => {
    expect(dibujarLaCarta(mapa(null), 0, RADIO).destino).toBeNull();
  });

  it("cerca, cae dentro del disco y en su sitio", () => {
    // A tres millas al norte, volando al norte: arriba del todo.
    const tres = 3 * MILLA;
    const d = dibujarLaCarta(mapa({ x: 0, z: -tres }), 0, RADIO).destino!;
    expect(d.dentro).toBe(true);
    expect(d.millas).toBeCloseTo(3, 1);
    expect(Math.abs(d.dx)).toBeLessThan(1);
    expect(d.dy).toBeLessThan(0);
  });

  it("y lejos se pega al borde, sin mentir con las millas", () => {
    /*
     * **Ésta es la que importa.** Al despegar, el otro aeropuerto está a
     * veintinueve millas y la carta enseña diez. Dibujarlo sin más lo pondría
     * tres veces más lejos que el borde, o sea en ninguna parte.
     */
    const lejos = 29 * MILLA;
    const d = dibujarLaCarta(mapa({ x: 0, z: -lejos }), 0, RADIO).destino!;
    expect(d.dentro).toBe(false);
    // Pegado al borde, ni un píxel más.
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(RADIO, 5);
    // Y las millas siguen siendo las de verdad, que es lo que no se puede
    // falsear: el dibujo se recorta, el número no.
    expect(d.millas).toBeCloseTo(29, 1);
  });

  it("y gira con la rosa, como todo lo demás", () => {
    // El mismo destino al norte, pero volando al este: tiene que salir a la
    // izquierda. Si no girara, el rumbo no serviría para nada.
    const tres = 3 * MILLA;
    const d = dibujarLaCarta(mapa({ x: 0, z: -tres }), 90, RADIO).destino!;
    expect(d.dx).toBeLessThan(0);
    expect(Math.abs(d.dy)).toBeLessThan(1);
  });

  it("y el que está detrás sale detrás", () => {
    const tres = 3 * MILLA;
    const d = dibujarLaCarta(mapa({ x: 0, z: tres }), 0, RADIO).destino!;
    expect(d.dy).toBeGreaterThan(0);
  });
});
