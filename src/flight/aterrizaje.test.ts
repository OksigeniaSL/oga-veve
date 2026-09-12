import { describe, expect, it } from "vitest";
import { LandingWatcher } from "./aterrizaje";

/** Un vuelo completo: rodar, volar, tocar y frenar. */
/** La velocidad de aproximación de las pruebas. La del Pykasu. */
const VREF = 33;

function volarYAterrizar(
  sink: number,
  enPista = true,
  crashed = false,
  alTocar = VREF,
) {
  const w = new LandingWatcher();
  const veredictos = [];
  const paso = 0.5;
  veredictos.push(w.update(true, 0, 0, false, true, VREF, paso)); // parado al principio
  /*
   * **Y se vuela un rato de verdad antes de tocar.**
   *
   * Eran cinco pasos, o sea dos segundos y medio en el aire, y eso dejó de
   * contar como un vuelo el día que un bote dejó de contar como uno: rodando
   * por una plataforma, un badén daba un salto corto y al volver a tocar salía
   * «aterrizaste fuera de la pista», con percance y vuelo terminado. Ver
   * `ALGO_MAS_QUE_UN_BOTE`. Dos segundos y medio no es una aproximación por
   * ningún lado, así que aquí se vuela veinte.
   */
  for (let i = 0; i < 40; i++)
    veredictos.push(w.update(false, VREF, 0, false, false, VREF, paso));
  // El contacto.
  veredictos.push(w.update(true, alTocar, sink, crashed, enPista, VREF, paso));
  /*
   * Y la carrera. **El veredicto ya no espera a frenar, espera dos segundos.**
   * Esperar a bajar de velocidad de rodaje podía tardar un minuto entero en
   * una pista de tres kilómetros, y para entonces ya nadie lo relaciona con la
   * toma. Aquí se rueda medio segundo por paso, así que sale al quinto.
   */
  for (let i = 0; i < 6; i++)
    veredictos.push(
      w.update(true, 40 - i * 4, 0, crashed, enPista, VREF, paso),
    );
  return veredictos.filter(Boolean);
}

describe("el aterrizaje se reconoce y se dice", () => {
  it("un contacto suave se celebra como tal", () => {
    expect(volarYAterrizar(0.4)).toEqual(["suave"]);
  });

  it("uno duro también cuenta, pero se llama por su nombre", () => {
    expect(volarYAterrizar(2.6)).toEqual(["firme"]);
  });

  it("fuera de la pista sigue siendo un aterrizaje", () => {
    expect(volarYAterrizar(0.4, false)).toEqual(["fuera"]);
  });

  it("si se rompió, no se felicita nada", () => {
    expect(volarYAterrizar(0.4, true, true)).toEqual([]);
  });

  it("se dice una sola vez, no una por fotograma", () => {
    const w = new LandingWatcher();
    // Un rato en el aire de verdad: un bote no arma el detector. Ver
    // `ALGO_MAS_QUE_UN_BOTE`.
    for (let i = 0; i < 30; i++)
      w.update(false, 50, 0, false, false, VREF, 0.2);
    w.update(true, 40, 0.5, false, true, VREF, 0.2);
    const dichos = [];
    for (let i = 0; i < 30; i++) {
      const v = w.update(true, 5, 0, false, true, VREF, 0.2);
      if (v) dichos.push(v);
    }
    expect(dichos).toEqual(["suave"]);
  });

  /**
   * Estar quieto en la pista al empezar la partida no es un aterrizaje. Es la
   * primera condición y la más fácil de olvidar.
   */
  it("arrancar parado en la pista no cuenta como aterrizaje", () => {
    const w = new LandingWatcher();
    const dichos = [];
    for (let i = 0; i < 20; i++) {
      const v = w.update(true, 0, 0, false, true, VREF);
      if (v) dichos.push(v);
    }
    expect(dichos).toEqual([]);
  });
});

describe("la velocidad de la toma", () => {
  it("tocar muy rápido no cuenta como suave, por suave que fuera", () => {
    // Descenso de pluma —la toma más suave posible— pero a un cincuenta por
    // ciento por encima de la velocidad de aproximación.
    expect(volarYAterrizar(0.2, true, false, VREF * 1.5)).toEqual(["rapido"]);
  });

  it("a su velocidad, la suavidad vuelve a mandar", () => {
    expect(volarYAterrizar(0.2, true, false, VREF)).toEqual(["suave"]);
  });

  it("un pelo rápido todavía cuenta: la banda no es un filo", () => {
    expect(volarYAterrizar(0.2, true, false, VREF * 1.1)).toEqual(["suave"]);
  });
});

/**
 * Y el listón de «rápido» tiene que existir en el mundo donde se juega.
 *
 * «Puedo aterrizar a la velocidad que me dé la gana», y era literal: el umbral
 * era vez y cuarto la velocidad de aproximación —cuarenta y un metros por
 * segundo— y el modelo del peldaño de los pequeños no pasa de treinta y siete.
 * La toma rápida no existía ahí: se podía llegar a tope de gas y con la
 * palanca a fondo y el juego contestaba «suave».
 */
describe("el listón de la toma rápida es alcanzable", () => {
  /** Lo que puede volar el modelo sencillo: dos tercios de su crucero. */
  const VMAX_ARCADE = 37.2;

  const conTope = (alTocar: number) => {
    const w = new LandingWatcher();
    const paso = 0.5;
    // Volando un rato antes, que es lo que arma el detector.
    for (let i = 0; i < 10; i++)
      w.update(false, VREF, 0, false, false, VREF, paso, VMAX_ARCADE);
    w.update(true, alTocar, 0.4, false, true, VREF, paso, VMAX_ARCADE);
    const dichos = [];
    for (let i = 0; i < 6; i++) {
      const v = w.update(true, 10, 0, false, true, VREF, paso, VMAX_ARCADE);
      if (v) dichos.push(v);
    }
    return dichos;
  };

  it("tocar a lo más que da el modelo cuenta como rápido", () => {
    expect(conTope(VMAX_ARCADE)).toEqual(["rapido"]);
  });

  it("y a velocidad de aproximación sigue siendo una toma buena", () => {
    expect(conTope(VREF)).toEqual(["suave"]);
  });
});

/**
 * Un bote no es un vuelo.
 *
 * El detector se armaba con **un solo fotograma** con las ruedas despegadas,
 * así que rodar por una plataforma con un badén daba un salto corto y, al
 * volver a tocar, veredicto de aterrizaje. Y fuera de la pista, porque una
 * plataforma no es pista: percance, pantalla y vuelo terminado, con el vuelo
 * ya hecho y el aterrizaje ya celebrado. Medido en Guaraní, rodando de vuelta
 * al puesto a trece metros por segundo.
 */
describe("un bote no es un vuelo", () => {
  /** Un paso del detector, con los valores de rodar por una plataforma. */
  const rodando = (w: LandingWatcher, enElSuelo: boolean) =>
    w.update(enElSuelo, 13, 0.2, false, false, 28, 0.1, 37);

  it("un salto de medio segundo rodando no da veredicto", () => {
    const w = new LandingWatcher();
    for (let i = 0; i < 20; i++) rodando(w, true);
    // Medio segundo en el aire: el badén.
    for (let i = 0; i < 5; i++) rodando(w, false);
    let veredicto = null;
    for (let i = 0; i < 60; i++) veredicto = veredicto ?? rodando(w, true);
    expect(veredicto).toBeNull();
  });

  it("pero volar de verdad y posarse fuera sí lo da", () => {
    const w = new LandingWatcher();
    for (let i = 0; i < 20; i++) rodando(w, true);
    // Cinco segundos en el aire: eso ya es volar.
    for (let i = 0; i < 50; i++) rodando(w, false);
    let veredicto = null;
    for (let i = 0; i < 60; i++) veredicto = veredicto ?? rodando(w, true);
    expect(veredicto).toBe("fuera");
  });

  it("y un rebote en la toma no da dos veredictos", () => {
    const w = new LandingWatcher();
    const enPista = (s: boolean) =>
      w.update(s, 28, 1.0, false, true, 28, 0.1, 37);
    for (let i = 0; i < 50; i++) enPista(false);
    // Toca, rebota medio segundo y vuelve a tocar.
    let primero = null;
    for (let i = 0; i < 30; i++) primero = primero ?? enPista(true);
    expect(primero).not.toBeNull();
    for (let i = 0; i < 5; i++) enPista(false);
    let segundo = null;
    for (let i = 0; i < 60; i++) segundo = segundo ?? enPista(true);
    expect(segundo).toBeNull();
  });
});
