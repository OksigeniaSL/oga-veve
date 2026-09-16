/**
 * Quién tiene la palabra, probado sin navegador.
 *
 * `Boca` no sabe hablar: recibe una función que habla y un `listo` que hay que
 * llamar al terminar. Así que aquí se habla con cadenas y se termina a mano,
 * que es exactamente lo que hace falta para probar una política de turnos.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { Boca, CADUCA, NO_REPETIR, RIÑEN, SILENCIO } from "./boca";

let reloj = 0;
let cortes = 0;
const boca = () => {
  reloj = 0;
  cortes = 0;
  return new Boca({ ahora: () => reloj, cancelar: () => void cortes++ });
};

/** Lo que se va diciendo, y cómo terminar cada frase. */
function coro() {
  const dicho: string[] = [];
  const acabar: Record<string, () => void> = {};
  const frase = (texto: string) => (listo: () => void) => {
    dicho.push(texto);
    acabar[texto] = listo;
  };
  return { dicho, acabar, frase };
}

beforeEach(() => {
  reloj = 0;
  cortes = 0;
});

describe("la boca", () => {
  it("con nadie hablando, se habla", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("normal", frase("uno"));
    expect(dicho).toEqual(["uno"]);
    expect(b.ocupada).toBe(true);
  });

  /*
   * **Éste es el fallo que se vino a arreglar.**
   *
   * «En V1 te avisa con una exclamación y enseguida dice lo siguiente, y el
   * audio se medio corta para dar paso al otro.» V1 y rotar son dos cantos
   * separados por un segundo: el segundo no puede llevarse por delante al
   * primero, tiene que esperar a que acabe.
   */
  it("lo que no es más urgente espera su turno, no corta", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("V one"));
    b.pedir("normal", frase("rotate"));
    expect(dicho).toEqual(["V one"]);
    expect(cortes).toBe(0);
    acabar["V one"]!();
    expect(dicho).toEqual(["V one", "rotate"]);
  });

  it("y lo más urgente sí corta", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("normal", frase("vas bajo para la pista"));
    b.pedir("urgente", frase("¡Subí!"));
    expect(dicho).toEqual(["vas bajo para la pista", "¡Subí!"]);
    expect(cortes).toBe(1);
  });

  it("pero un elogio no corta nada", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("vas bajo"));
    b.pedir("baja", frase("¡bien!"));
    expect(dicho).toEqual(["vas bajo"]);
    acabar["vas bajo"]!();
    expect(dicho).toEqual(["vas bajo", "¡bien!"]);
  });

  /*
   * **Una cuenta atrás se pisa a sí misma.** Es lo que el comentario de `voz.ts`
   * pedía desde siempre: si todavía suena «twenty» cuando toca «ten», lo que
   * hay que oír es «ten» — no los dos. Decirlas seguidas es contar el pasado.
   */
  it("de una misma cuenta solo queda la última", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("thirty"), "cabina.thirty");
    b.pedir("normal", frase("twenty"), "cabina.twenty");
    b.pedir("normal", frase("ten"), "cabina.ten");
    acabar["thirty"]!();
    expect(dicho).toEqual(["thirty", "ten"]);
  });

  /*
   * **Pero dos sucesos distintos esperan los dos.**
   *
   * V1 y Vr son los dos momentos del despegue —«ya no puedo parar» y «ahora
   * toca tirar»— y van a un segundo el uno del otro. Con una sola plaza de
   * espera, Vr le quitaba el sitio a V1 y salía una de las dos sin que se
   * supiera cuál: medido en el banco, el detector dispara las dos y de la boca
   * no salía ninguna. Se oyó jugando: «al despegar no me avisa del V1 ni VR ni
   * nada».
   */
  it("y dos sucesos distintos se dicen los dos, en orden", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("alineando"), "vuelo.alineando");
    b.pedir("normal", frase("V one"), "cabina.v1");
    b.pedir("normal", frase("rotate"), "cabina.vr");
    acabar["alineando"]!();
    expect(dicho).toEqual(["alineando", "V one"]);
    acabar["V one"]!();
    expect(dicho).toEqual(["alineando", "V one", "rotate"]);
  });

  /*
   * **Y lo que espera demasiado no se dice.**
   *
   * Un aviso de vuelo habla del avión de ahora. «Vas bajo para la pista»
   * dicho cuatro segundos después, cuando ya has corregido, no llega tarde:
   * llega mintiendo.
   */
  it("lo que caduca no se dice", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("larga"));
    b.pedir("normal", frase("vas bajo"));
    reloj += CADUCA + 1;
    acabar["larga"]!();
    expect(dicho).toEqual(["larga"]);
    expect(b.ocupada).toBe(false);
  });

  it("y justo antes de caducar sí se dice", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("larga"));
    b.pedir("normal", frase("vas bajo"));
    reloj += CADUCA - 1;
    acabar["larga"]!();
    expect(dicho).toEqual(["larga", "vas bajo"]);
  });

  it("callar corta y olvida lo que esperaba", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("normal", frase("uno"));
    b.pedir("normal", frase("dos"));
    b.callar();
    expect(cortes).toBe(1);
    expect(b.ocupada).toBe(false);
    expect(dicho).toEqual(["uno"]);
  });

  /*
   * **Y un `listo` que llega tarde no arranca nada.**
   *
   * `speechSynthesis` avisa del final de frases que ya se cortaron, y a veces
   * con retraso. Atender ese aviso pondría a hablar a la siguiente **encima**
   * de la que está sonando, que es el fallo que se vino a arreglar, otra vez y
   * por la puerta de atrás.
   */
  it("el final de una frase ya cortada no cuenta", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("la cortada"));
    b.pedir("urgente", frase("¡Subí!"));
    b.pedir("normal", frase("la que espera"));
    // Llega, tarde, el final de la que se cortó.
    acabar["la cortada"]!();
    expect(dicho).toEqual(["la cortada", "¡Subí!"]);
    // Y cuando acaba la que de verdad estaba sonando, entonces sí.
    acabar["¡Subí!"]!();
    expect(dicho).toEqual(["la cortada", "¡Subí!", "la que espera"]);
  });
});

/**
 * La cadencia: ni repetirse, ni atropellarse, ni contradecirse.
 *
 * Las tres salen de jugar, y las tres se oían a la vez en el mismo vuelo:
 *
 * > «Cada vez que pulso P para cambiar de modelo: "Arrancá…", "Arrancá…",
 * > "Arrancá el motor"… Lo mismo "Seguí la raya verde", "seguí la raya verde",
 * > "seguí la raya verde". Lo mismo al aterrizar: "Salí de la pista, viene
 * > otro", "Más despacio", "Salí de la pista, viene otro"… O salgo de la pista
 * > o me doy prisa para salir.»
 */
describe("la cadencia", () => {
  /** Una boca con reloj y temporizador de mentira, para no esperar de verdad. */
  function conReloj() {
    let ahora = 0;
    const pendientes: { cuando: number; hacer: () => void }[] = [];
    const boca = new Boca({
      ahora: () => ahora,
      cancelar: () => {},
      esperar: (ms, hacer) =>
        void pendientes.push({ cuando: ahora + ms, hacer }),
    });
    const correr = (ms: number) => {
      ahora += ms;
      for (const p of [...pendientes]) {
        if (p.cuando <= ahora) {
          pendientes.splice(pendientes.indexOf(p), 1);
          p.hacer();
        }
      }
    };
    return { boca, correr };
  }

  it("la misma frase no se repite antes de tiempo", () => {
    const { boca, correr } = conReloj();
    const dichas: string[] = [];
    const decir = (clave: string) =>
      boca.pedir(
        "normal",
        (listo) => {
          dichas.push(clave);
          listo();
        },
        clave,
      );

    decir("vuelo.estacionado");
    correr(1000);
    decir("vuelo.estacionado");
    correr(1000);
    decir("vuelo.estacionado");
    expect(dichas).toEqual(["vuelo.estacionado"]);
  });

  it("y sí cuando ya ha pasado", () => {
    const { boca, correr } = conReloj();
    const dichas: string[] = [];
    const decir = () =>
      boca.pedir(
        "normal",
        (listo) => {
          dichas.push("rodando");
          listo();
        },
        "vuelo.rodando",
      );
    decir();
    correr(NO_REPETIR + 1);
    decir();
    expect(dichas).toHaveLength(2);
  });

  it("lo urgente se repite todas las veces que haga falta", () => {
    const { boca, correr } = conReloj();
    let veces = 0;
    const avisar = () =>
      boca.pedir(
        "urgente",
        (listo) => {
          veces++;
          listo();
        },
        "vuelo.terrenoSube",
      );
    avisar();
    correr(500);
    avisar();
    expect(veces).toBe(2);
  });

  it("entre una frase y la siguiente hay un silencio", () => {
    const { boca, correr } = conReloj();
    const dichas: string[] = [];
    boca.pedir(
      "normal",
      (listo) => {
        dichas.push("primera");
        listo();
      },
      "vuelo.rotar",
    );
    boca.pedir(
      "normal",
      (listo) => {
        dichas.push("segunda");
        listo();
      },
      "vuelo.enVuelo",
    );
    // La segunda no suena pegada a la primera.
    expect(dichas).toEqual(["primera"]);
    correr(SILENCIO);
    expect(dichas).toEqual(["primera", "segunda"]);
  });

  it("y dos órdenes que se contradicen no van seguidas", () => {
    const { boca, correr } = conReloj();
    const dichas: string[] = [];
    const decir = (clave: string) =>
      boca.pedir(
        "normal",
        (listo) => {
          dichas.push(clave);
          listo();
        },
        clave,
      );

    decir("vuelo.abandonando");
    correr(SILENCIO + 100);
    decir("vuelo.despacio");
    expect(dichas).toEqual(["vuelo.abandonando"]);
  });

  it("pero pasado el rato ya no riñen", () => {
    const { boca, correr } = conReloj();
    const dichas: string[] = [];
    const decir = (clave: string) =>
      boca.pedir(
        "normal",
        (listo) => {
          dichas.push(clave);
          listo();
        },
        clave,
      );
    decir("vuelo.abandonando");
    correr(RIÑEN + 1);
    decir("vuelo.despacio");
    expect(dichas).toEqual(["vuelo.abandonando", "vuelo.despacio"]);
  });

  it("cambiar de avión no borra lo que se acaba de decir", () => {
    const { boca, correr } = conReloj();
    const dichas: string[] = [];
    const decir = () =>
      boca.pedir(
        "normal",
        (listo) => {
          dichas.push("arrancá");
          listo();
        },
        "vuelo.estacionado",
      );
    decir();
    // Cambiar de aeronave llama a `callar`, y eso callaba y olvidaba.
    boca.callar();
    correr(500);
    decir();
    expect(dichas).toHaveLength(1);
    // Un vuelo nuevo sí empieza de cero.
    boca.empezarDeCero();
    decir();
    expect(dichas).toHaveLength(2);
  });
});
