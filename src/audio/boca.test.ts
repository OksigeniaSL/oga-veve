/**
 * Quién tiene la palabra, probado sin navegador.
 *
 * `Boca` no sabe hablar: recibe una función que habla y un `listo` que hay que
 * llamar al terminar. Así que aquí se habla con cadenas y se termina a mano,
 * que es exactamente lo que hace falta para probar una política de turnos.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  anunciaLaFase,
  Boca,
  BOCA,
  CADUCA,
  CADUCA_LA_ORDEN,
  cuantoAguanta,
  explicaLaOtraPunta,
  MEGAFONIA,
  NO_REPETIR,
  RIÑEN,
  SILENCIO,
} from "./boca";
import { CADUCA_LA_MEGAFONIA } from "./turnos";
import { esLaInformacionDeTrafico } from "./torre";

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
   * La cuenta de la toma ya no pasa por aquí: es de una caja del avión y no
   * pide turno. Cómo se pisa un número con el siguiente, y cómo no pisa a un
   * aviso, está en `maquina.test.ts`.
   */

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

  it("y lo que esperaba turno no se lo quita quien llega en el hueco", () => {
    // Aterrizando en Los Rodeos: «frená» esperaba detrás de «quitá el gas»;
    // el temporizador que la suelta llegó tarde y, en el hueco, «salí por la
    // siguiente» se coló. «Frená» caducó esperando.
    let ahora = 0;
    const boca = new Boca({
      ahora: () => ahora,
      cancelar: () => {},
      // Un temporizador que no llega nunca: el peor caso del de verdad.
      esperar: () => {},
    });
    const dichas: string[] = [];
    let acabar = () => {};
    const decir = (clave: string) =>
      boca.pedir(
        "normal",
        (listo) => {
          dichas.push(clave);
          acabar = listo;
        },
        clave,
      );
    decir("vuelo.quitaElGas");
    ahora = 600;
    decir("vuelo.aterrizado");
    ahora = 1600;
    acabar();
    ahora = 1600 + SILENCIO + 200;
    decir("vuelo.salidaSiguiente");
    expect(dichas).toEqual(["vuelo.quitaElGas", "vuelo.aterrizado"]);
    // Y la que llegó en el hueco espera su turno, no se pierde.
    ahora += 1500;
    acabar();
    ahora += SILENCIO + 1;
    decir("vuelo.otroDeRelleno");
    expect(dichas).toEqual([
      "vuelo.quitaElGas",
      "vuelo.aterrizado",
      "vuelo.salidaSiguiente",
    ]);
  });

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

describe("y calla a quien tenía la palabra", () => {
  /*
   * El fallo del camarote. En este juego hay cuatro bocas —la instructora, la
   * torre, el otro avión y la comandante— y **cada una solo se callaba a sí
   * misma** antes de empezar. Cuando la torre cortaba a la comandante, la
   * torre se callaba a sí misma (que no estaba diciendo nada) y la comandante
   * seguía sonando. Al despegar coinciden las cuatro.
   */
  it("al cortar, se le dice al anterior que se calle", () => {
    const b = boca();
    let callada = false;
    b.pedir("normal", () => () => {
      callada = true;
    });
    expect(callada).toBe(false);
    b.pedir("urgente", () => undefined);
    expect(callada).toBe(true);
  });

  it("y no se le calla dos veces, ni al que ya terminó", () => {
    const b = boca();
    let veces = 0;
    let acabar = () => {};
    b.pedir("normal", (listo) => {
      acabar = listo;
      return () => {
        veces += 1;
      };
    });
    acabar();
    b.pedir("urgente", () => undefined);
    expect(veces).toBe(0);
  });

  it("y quien no sabe callarse tampoco rompe nada", () => {
    // Una boca puede no tener con qué cortarse —la voz del navegador cuando
    // el audio todavía duerme—, y eso no puede tirar a la que llega.
    const b = boca();
    b.pedir("normal", () => undefined);
    expect(() => b.pedir("urgente", () => undefined)).not.toThrow();
  });
});

describe("un suceso, una sola voz", () => {
  /*
   * «Eso no pega ni con pegamento»: la de terreno diciendo «subí» agobiada y,
   * un segundo después, el aro diciendo «venís un poco bajo, subí suave» tan
   * tranquilo. No sobra una frase: sobra **decir lo mismo dos veces con
   * registros opuestos**.
   */
  it("después del aviso de terreno, la senda se calla", () => {
    for (const otra of ["vuelo.aroBajo", "vuelo.papiBajo", "vuelo.enVuelo"]) {
      const { dicho, acabar, frase } = coro();
      const b = boca();
      b.pedir("urgente", frase("terreno"), "vuelo.terrenoSube");
      acabar["terreno"]!();
      b.pedir("normal", frase(otra), otra);
      expect(dicho, otra).toEqual(["terreno"]);
    }
  });

  it("y en una frustrada tampoco se comenta la senda", () => {
    const { dicho, acabar, frase } = coro();
    const b = boca();
    b.pedir("urgente", frase("frustrada"), "vuelo.mandanFrustrar");
    acabar["frustrada"]!();
    b.pedir("normal", frase("papi"), "vuelo.papiBajo");
    expect(dicho).toEqual(["frustrada"]);
  });

  it("pero pasado el rato vuelve a poder decirse", () => {
    // Callarse para siempre sería el otro extremo: la situación pasa.
    const { dicho, acabar, frase } = coro();
    const b = boca();
    b.pedir("urgente", frase("terreno"), "vuelo.terrenoSube");
    acabar["terreno"]!();
    reloj += RIÑEN + 1;
    b.pedir("normal", frase("papi"), "vuelo.papiBajo");
    expect(dicho).toEqual(["terreno", "papi"]);
  });
});

describe("y una frase no se corta por la mitad", () => {
  /*
   * Esto cortaba en cuanto llegaba algo «más urgente», con tres pesos. Y la
   * comandante habla en baja —es megafonía, no tiene prisa— mientras la
   * instructora y la torre hablan en normal: por diseño, cualquiera la cortaba
   * a media frase.
   *
   *     Comandante: «Bienvenidos a La Gomera, aquí la gent…»
   *     Voz inglesa: «eco charlie, charlie…»
   *
   * «No, eso no puede ser… la española ni tiempo, se le interrumpe. Y la
   * instructora es la que más interrumpe.»
   */
  const montar = () => {
    const cortados: string[] = [];
    const vivos = new Map<string, () => void>();
    const b = boca();
    const decir = (clave: string, urgencia: "baja" | "normal" | "urgente") =>
      b.pedir(
        urgencia,
        (listo) => {
          vivos.set(clave, listo);
          // Lo que devuelve una frase es cómo callarla. Si alguien la llama,
          // es que la han cortado. Ver `Hablar` en `boca.ts`.
          return () => cortados.push(clave);
        },
        clave,
      );
    return { b, decir, cortados, acabar: (c: string) => vivos.get(c)?.() };
  };

  it("la instructora no corta a la comandante", () => {
    const { decir, cortados } = montar();
    decir("comandante.llegada.la-gomera", "baja");
    decir("vuelo.rapido", "normal");
    expect(cortados).toEqual([]);
  });

  it("ni la torre, ni el otro avión", () => {
    const { decir, cortados } = montar();
    decir("comandante.llegada.la-gomera", "baja");
    decir("torre.canario.clearedLand", "normal");
    decir("otro.final", "normal");
    expect(cortados).toEqual([]);
  });

  it("pero el aviso de terreno sí, que para eso es urgente", () => {
    const { decir, cortados } = montar();
    decir("comandante.llegada.la-gomera", "baja");
    decir("vuelo.terrenoSube", "urgente");
    expect(cortados).toEqual(["comandante.llegada.la-gomera"]);
  });

  it("y un urgente no corta a otro urgente", () => {
    // Dos cosas graves en el mismo segundo: la primera merece acabarse.
    const { decir, cortados } = montar();
    decir("vuelo.terrenoSube", "urgente");
    decir("vuelo.mandanFrustrar", "urgente");
    expect(cortados).toEqual([]);
  });
});

describe("y la megafonía va por el mismo turno", () => {
  /*
   * **Lo pidió quien juega, sabiendo lo de las dos vías.**
   *
   * Fue otra boca con este argumento: en un avión la megafonía y los
   * auriculares van por dos vías y se solapan. Y se oía así: «todo el vuelo en
   * silencio y cuando hablan lo hacen todos juntos». Su regla: «en el juego,
   * para lo poco que hablan, que la megafonía no la pise nadie». Ver
   * `MEGAFONIA` en `boca.ts` y `audio/turnos.ts`.
   */
  it("es la misma boca", () => {
    expect(MEGAFONIA).toBe(BOCA);
  });

  it("y mientras habla la megafonía, la radio espera", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("baja", frase("comandante.servicio"), "tripulacion.servicio");
    b.pedir("baja", frase("charlie alfa, en final"), "otro.final@c-a");
    expect(dicho).toEqual(["comandante.servicio"]);
    expect(cortes).toBe(0);
    acabar["comandante.servicio"]!();
    expect(dicho).toEqual(["comandante.servicio", "charlie alfa, en final"]);
  });

  it("y tampoco la pisa la instructora: espera a que acabe", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("baja", frase("descenso"), "comandante.descenso");
    b.pedir("normal", frase("oídos"), "vuelo.aire.oidos");
    expect(dicho).toEqual(["descenso"]);
    acabar["descenso"]!();
    expect(dicho).toEqual(["descenso", "oídos"]);
  });

  it("y lo que es para ti pasa delante de lo que espera, sin cortar", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("hablando"), "vuelo.rodando");
    b.pedir("baja", frase("bienvenida"), "comandante.bienvenida");
    b.pedir("baja", frase("otro"), "otro.enCola@x");
    b.pedir("mando", frase("permiso"), "torre.verde@z-p");
    expect(cortes).toBe(0);
    acabar["hablando"]!();
    expect(dicho).toEqual(["hablando", "permiso"]);
    acabar["permiso"]!();
    // Y la megafonía, por delante de la frecuencia de los demás.
    expect(dicho).toEqual(["hablando", "permiso", "bienvenida"]);
  });

  it("y lo urgente sí corta la megafonía, pero no barre sus anuncios", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("baja", frase("llegada"), "comandante.llegada");
    b.pedir("baja", frase("cinturones"), "tripulacion.cinturones");
    b.pedir("urgente", frase("¡Subí!"), "vuelo.terrenoSube");
    expect(cortes).toBe(1);
    expect(dicho).toEqual(["llegada", "¡Subí!"]);
    acabar["¡Subí!"]!();
    expect(dicho).toEqual(["llegada", "¡Subí!", "cinturones"]);
  });

  it("un anuncio aguanta más en la cola que un aviso", () => {
    expect(cuantoAguanta("comandante.turbulencia")).toBe(CADUCA_LA_MEGAFONIA);
    expect(cuantoAguanta("tripulacion.canario.servicio@mani")).toBe(CADUCA_LA_MEGAFONIA);
    expect(cuantoAguanta("ventanilla@saludo-teide")).toBe(CADUCA_LA_MEGAFONIA);
    // La de la instructora en avioneta es suya, no de la megafonía.
    expect(cuantoAguanta("ventanilla.vos@teide")).toBe(CADUCA);
  });
});

/*
 * ── Lo que espera a su voz ────────────────────────────────────────────────
 *
 * El crosscheck de Jazlyn no sonaba en casa de Enrique: se pedía en el puesto
 * antes de que su grabación hubiera bajado y se le pasaba a la voz del
 * navegador, muda en Brave para Linux. Ahora espera en la cola sin que le
 * toque, con tope. Ver `AlPedir.lista`.
 */
describe("lo que espera a su voz", () => {
  function conReloj() {
    let ahora = 0;
    const pendientes: { cuando: number; hacer: () => void }[] = [];
    const b = new Boca({
      ahora: () => ahora,
      cancelar: () => {},
      esperar: (ms, hacer) => void pendientes.push({ cuando: ahora + ms, hacer }),
    });
    const correr = (ms: number) => {
      const hasta = ahora + ms;
      for (;;) {
        pendientes.sort((p, q) => p.cuando - q.cuando);
        const p = pendientes[0];
        if (!p || p.cuando > hasta) break;
        pendientes.shift();
        ahora = Math.max(ahora, p.cuando);
        p.hacer();
      }
      ahora = hasta;
    };
    return { b, correr };
  }

  it("no le toca hasta que su voz está lista, y entonces suena", () => {
    const { b, correr } = conReloj();
    const { dicho, frase } = coro();
    let lista = false;
    b.pedir("baja", frase("crosscheck"), "comandante.crosscheck", {
      lista: () => lista,
      tope: 25000,
    });
    expect(dicho).toEqual([]);
    expect(b.espera("comandante.crosscheck")).toBe(true);
    correr(10000);
    expect(dicho).toEqual([]);
    lista = true;
    correr(500);
    expect(dicho).toEqual(["crosscheck"]);
  });

  it("y lo que tarda en estar lista no le cuenta para caducar", () => {
    const { b, correr } = conReloj();
    const { dicho, frase } = coro();
    let lista = false;
    // Un aviso de los de cuatro segundos, que espera doce a su grabación.
    b.pedir("normal", frase("arrancá"), "vuelo.arrancando", {
      lista: () => lista,
      tope: 25000,
    });
    correr(12000);
    lista = true;
    correr(300);
    expect(dicho).toEqual(["arrancá"]);
  });

  it("y con su tope cumplido le toca como esté: la espera tiene salida", () => {
    const { b, correr } = conReloj();
    const { dicho, frase } = coro();
    b.pedir("baja", frase("crosscheck"), "comandante.crosscheck", {
      lista: () => false,
      tope: 25000,
    });
    correr(24000);
    expect(dicho).toEqual([]);
    correr(1500);
    expect(dicho).toEqual(["crosscheck"]);
  });

  it("mientras espera a su voz, no ocupa la frecuencia", () => {
    const { b } = conReloj();
    const { dicho, frase } = coro();
    b.pedir("baja", frase("crosscheck"), "comandante.crosscheck", {
      lista: () => false,
      tope: 25000,
    });
    expect(b.libre).toBe(true);
    b.pedir("normal", frase("arrancá"), "vuelo.arrancando");
    expect(dicho).toEqual(["arrancá"]);
  });

  it("y se puede retirar mientras espera, y quien la pidió se entera", () => {
    const { b } = conReloj();
    const { frase } = coro();
    const caidas: string[] = [];
    b.pedir("mando", frase("permiso"), "torre.aterrizar@z-p", {
      lista: () => false,
      tope: 25000,
      alCaer: (porque) => caidas.push(porque),
    });
    b.retirar((c) => c === "torre.aterrizar@z-p");
    expect(b.espera("torre.aterrizar@z-p")).toBe(false);
    expect(caidas).toEqual(["ya no es verdad"]);
  });

  it("lo que no tenía con qué sonar no deja silencio ni cuenta como oído", () => {
    const { b } = conReloj();
    const { dicho, frase } = coro();
    b.pedir("normal", (listo) => listo(true), "vuelo.rodando");
    expect(b.habladas.map((h) => h.clave)).toEqual([]);
    b.pedir("normal", frase("seguí"), "vuelo.raya");
    expect(dicho).toEqual(["seguí"]);
  });

  it("y tu permiso se dice otra vez aunque haga poco del anterior", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("mando", frase("permiso 1"), "torre.aterrizar@z-p");
    acabar["permiso 1"]!();
    reloj = 20000;
    b.pedir("mando", frase("permiso 2"), "torre.aterrizar@z-p");
    expect(dicho).toEqual(["permiso 1", "permiso 2"]);
  });
});

/*
 * ── Cuando la cola se llena, la cola es una cola ──────────────────────────
 *
 * Se caía la más vieja, con este argumento: «la que más cerca está de dejar
 * de describir lo que pasa». El argumento es bueno y ya lo cumple otro —
 * `CADUCA` tira a los cuatro segundos lo que dejó de ser verdad—, así que
 * tirar además la más vieja era cobrar dos veces por lo mismo. Y lo que se
 * cobraba era siempre lo primero que había pasado.
 *
 * Al final de un vuelo, lo primero que pasa es la torre. Medido en el
 * barrido, cinco escenarios fallando la misma prueba y siempre así:
 * `torre.clearedTakeoff: no cabía en la cola`.
 */
/**
 * Un descarte sin su sello de hora.
 *
 * `apuntarDescarte` antepone el segundo del vuelo —«12.4s torre.verde: …»—
 * porque una lista de descartes sin reloj no dice si tres frases perdidas son
 * tres momentos del vuelo o una ráfaga de medio segundo. Aquí lo que se clava
 * es qué se cayó y por qué; el cuándo lo lee quien mira un banco.
 */
const sinHora = (d: string | undefined): string =>
  (d ?? "").replace(/^[\d.]+s /, "");

describe("qué se cae cuando la cola se llena", () => {
  /** Ocupa la boca y llena la cola con lo que se diga. */
  function conLaColaLlena(...claves: string[]) {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    for (const c of claves) b.pedir("normal", frase(c), c);
    return { b, dicho, acabar };
  }

  it("se queda la que llegó primero, no la última", () => {
    // Cuatro plazas: la quinta no cabe. Antes se caía «torre», que era la
    // primera en llegar; ahora se cae la que llega con la cola llena.
    const { b } = conLaColaLlena("torre", "despacio", "alto", "otra", "tarde");
    expect(b.cuantasEsperan).toBe(4);
    expect(sinHora(b.descartadas.at(-1))).toBe("tarde: no cabía en la cola");
  });

  it("y se dicen en orden de llegada", () => {
    const { dicho, acabar } = conLaColaLlena("torre", "despacio", "alto");
    acabar["hablando"]!();
    expect(dicho.at(-1)).toBe("torre");
  });

  it("pero lo de menos peso se cae antes que lo de más, venga cuando venga", () => {
    // El orden de llegada manda **entre iguales**. Un elogio no le quita el
    // sitio a una instrucción por haber llegado antes.
    const b = boca();
    const { frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("baja", frase("elogio"), "elogio");
    b.pedir("normal", frase("uno"), "uno");
    b.pedir("normal", frase("dos"), "dos");
    b.pedir("normal", frase("tres"), "tres");
    b.pedir("normal", frase("cuatro"), "cuatro");
    expect(sinHora(b.descartadas.at(-1))).toBe("elogio: no cabía en la cola");
    expect(b.cuantasEsperan).toBe(4);
  });

  /*
   * Aterrizando en Los Rodeos con el JAZ 90: las fases de tierra y los flaps
   * llenaban la cola, y lo que sobraba, por pesar menos, era la despedida de
   * Jazlyn. Lo de la megafonía no se echa: lo tira su reloj si espera de más.
   */
  it("y un anuncio de la megafonía no se echa de una cola llena", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("normal", frase("aterrizado"), "vuelo.aterrizado");
    b.pedir("baja", frase("llegada"), "comandante.llegada.tenerife-norte~4");
    b.pedir("normal", frase("abandonando"), "vuelo.abandonando");
    b.pedir("normal", frase("flaps"), "vuelo.flapsArribaAlSalir");
    b.pedir("normal", frase("plataforma"), "vuelo.aPlataforma");
    // Lo que sobra es el último comentario, no la despedida.
    expect(b.descartadas.map(sinHora)).toEqual(["vuelo.aPlataforma: no cabía en la cola"]);
    // Y se dice, detrás de lo que pesa más.
    while (dicho.at(-1) !== "llegada" && b.ocupada) acabar[dicho.at(-1)!]!();
    expect(dicho).toEqual(["hablando", "aterrizado", "abandonando", "flaps", "llegada"]);
  });
});

/*
 * ── El escalón de la torre ────────────────────────────────────────────────
 *
 * En una frecuencia de verdad una instrucción de control manda sobre
 * cualquier comentario. Aquí no mandaba: la autorización iba en `normal`,
 * igual que «más despacio», y al final de un vuelo hay tres de ésas por
 * segundo. Medido en El Hierro: la torre abrió la boca cinco veces en un
 * vuelo entero y se oyó **una**.
 */
describe("lo que manda la torre", () => {
  it("no lo echa de la cola un comentario", () => {
    const b = boca();
    const { frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("mando", frase("autorizado"), "autorizado");
    b.pedir("normal", frase("uno"), "uno");
    b.pedir("normal", frase("dos"), "dos");
    b.pedir("normal", frase("tres"), "tres");
    b.pedir("normal", frase("cuatro"), "cuatro");
    expect(b.descartadas.some((d) => sinHora(d).startsWith("autorizado"))).toBe(
      false,
    );
    expect(sinHora(b.descartadas.at(-1))).toBe("cuatro: no cabía en la cola");
  });

  it("y se dice antes que los comentarios que ya esperaban", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("normal", frase("comentario"), "comentario");
    b.pedir("mando", frase("autorizado"), "autorizado");
    acabar["hablando"]!();
    expect(dicho.at(-1)).toBe("autorizado");
  });

  it("pero no corta a nadie, que cortar es de lo urgente y de nadie más", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("mando", frase("autorizado"), "autorizado");
    // Sigue hablando el primero: el mando espera turno como todos.
    expect(dicho).toEqual(["hablando"]);
    expect(cortes).toBe(0);
  });

  it("y el aviso de terreno sí se lo lleva por delante", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("mando", frase("autorizado"), "autorizado");
    b.pedir("urgente", frase("terreno"), "terreno");
    expect(dicho).toEqual(["autorizado", "terreno"]);
  });
});

/**
 * **Lo que no suena se apunta con las mismas reglas que lo que suena.**
 *
 * Sin voz —ni grabada ni del navegador— la boca no pide la palabra, y eso está
 * bien. Pero el historial apuntaba la frase como dicha **sin la regla de no
 * repetirse**, así que el banco —que corre sin voces— contaba «despacio» nueve
 * veces en Tenerife Sur donde con voz habrían sonado una o dos, y daba un rojo
 * que no era del juego.
 */
describe("anotar sin voz", () => {
  it("la primera vez, toca", () => {
    const b = boca();
    expect(b.anotarSinVoz("normal", "vuelo.despacio")).toBe(true);
  });

  it("y repetida antes de tiempo, no — igual que si sonara", () => {
    const b = boca();
    b.anotarSinVoz("normal", "vuelo.despacio");
    reloj += NO_REPETIR - 1;
    expect(b.anotarSinVoz("normal", "vuelo.despacio")).toBe(false);
  });

  it("y pasado su tiempo, vuelve a tocar", () => {
    const b = boca();
    b.anotarSinVoz("normal", "vuelo.despacio");
    reloj += NO_REPETIR + 1;
    expect(b.anotarSinVoz("normal", "vuelo.despacio")).toBe(true);
  });

  it("y lo urgente no se calla nunca, que para eso es urgente", () => {
    const b = boca();
    b.anotarSinVoz("urgente", "vuelo.terrenoSube");
    reloj += 100;
    expect(b.anotarSinVoz("urgente", "vuelo.terrenoSube")).toBe(true);
  });

  it("y la misma regla que pedir la palabra: lo que se calla con voz se calla sin ella", () => {
    /*
     * La prueba que de verdad importa. Las dos ramas tienen que decir lo mismo
     * sobre la misma frase, porque la regla está en un solo sitio —
     * `noTocaDecirla`— y no en dos copias que un día digan cosas distintas.
     */
    const conVoz = boca();
    const sinVoz = new Boca({ ahora: () => reloj, cancelar: () => {} });
    let sonadas = 0;
    conVoz.pedir("normal", (listo) => { sonadas++; listo(); }, "vuelo.despacio");
    sinVoz.anotarSinVoz("normal", "vuelo.despacio");
    reloj += 1000;
    conVoz.pedir("normal", (listo) => { sonadas++; listo(); }, "vuelo.despacio");
    expect(sonadas).toBe(1);
    expect(sinVoz.anotarSinVoz("normal", "vuelo.despacio")).toBe(false);
  });
});

describe("lo que deja de ser verdad se retira de la cola", () => {
  /*
   * En el punto de espera la lámpara se pone roja y enseguida verde. El «hold
   * short» de la roja seguía esperando turno con la luz ya verde, y detrás de
   * él el «cleared for take-off» caducaba: la autorización propia no se oía.
   */
  it("se retira lo que se pide, y lo que suena sigue sonando", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("mando", frase("roja"), "torre.canario.roja@yo");
    b.pedir("mando", frase("hold short"), "torre.canario.holdShort@yo");
    b.pedir("baja", frase("otro"), "otro.enCola@el");
    b.retirar((c) => c === "torre.canario.holdShort@yo");
    b.pedir("mando", frase("verde"), "torre.canario.verde@yo");
    b.pedir("mando", frase("cleared"), "torre.canario.clearedTakeoff.L@yo");
    acabar["roja"]!();
    acabar["verde"]!();
    acabar["cleared"]!();
    expect(dicho).toEqual(["roja", "verde", "cleared", "otro"]);
    expect(b.descartadas.some((d) => d.includes("holdShort@yo: ya no es verdad"))).toBe(
      true,
    );
  });

  it("y la autorización llega antes de caducar", () => {
    // Cuatro frases de cinco segundos: sin retirar la de la roja, la
    // autorización espera quince y se cae; retirándola, espera diez.
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("mando", frase("roja"), "torre.canario.roja@yo");
    b.pedir("mando", frase("hold short"), "torre.canario.holdShort@yo");
    b.retirar((c) => c === "torre.canario.holdShort@yo");
    b.pedir("mando", frase("verde"), "torre.canario.verde@yo");
    b.pedir("mando", frase("cleared"), "torre.canario.clearedTakeoff.L@yo");
    reloj += 5000;
    acabar["roja"]!();
    reloj += 5000;
    acabar["verde"]!();
    expect(dicho).toContain("cleared");
  });

  it("y el porqué de la espera aguanta lo que la roja, no lo que un aviso", () => {
    // La roja y el «final» del que viene suenan antes: más de CADUCA.
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("mando", frase("roja"), "torre.roja@yo");
    b.pedir("normal", frase("por qué"), "vuelo.esperaQueAterrice");
    reloj += CADUCA + 2000;
    acabar["roja"]!();
    expect(dicho).toEqual(["roja", "por qué"]);
  });
});

describe("lo que espera turno, y lo que ya se dijo", () => {
  /*
   * Tu «cleared to land» no se pide hasta que suena lo que le quita la pista
   * a otro: pedidas a la vez con la boca ocupada, la tuya caducaba detrás.
   * Para eso hay que poder preguntar si una frase sigue esperando.
   */
  it("una frase pedida con la boca ocupada espera, y deja de esperar al sonar", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("lo de antes"), "instructor.algo");
    b.pedir("mando", frase("go around"), "torre.goAround@otro");
    expect(b.espera("torre.goAround@otro")).toBe(true);
    acabar["lo de antes"]!();
    expect(dicho).toEqual(["lo de antes", "go around"]);
    expect(b.espera("torre.goAround@otro")).toBe(false);
  });

  it("y la que suena a la primera no espera nunca", () => {
    const b = boca();
    const { frase } = coro();
    b.pedir("mando", frase("go around"), "torre.goAround@otro");
    expect(b.espera("torre.goAround@otro")).toBe(false);
  });

  it("y cuenta todo lo dicho, también lo que ya no cabe en la lista", () => {
    const b = boca();
    const { acabar, frase } = coro();
    for (let i = 0; i < 320; i++) {
      reloj += NO_REPETIR;
      b.pedir("normal", frase(`f${i}`), `clave.${i}`);
      acabar[`f${i}`]!();
    }
    expect(b.habladas).toHaveLength(300);
    expect(b.cuantasHabladas).toBe(320);
  });
});

describe("lo que explica una orden aguanta lo que la orden", () => {
  /*
   * El porqué de no entrar por la otra punta se pide detrás de la orden de la
   * torre, y con los cuatro segundos de un aviso caducaba siempre esperando.
   * Ver `explicaLaOtraPunta`.
   */
  it("el porqué de la otra punta, como una orden", () => {
    expect(cuantoAguanta("vuelo.alAireOtraPunta")).toBe(CADUCA_LA_ORDEN);
    expect(cuantoAguanta("vuelo.alAireVientoDeCola")).toBe(CADUCA_LA_ORDEN);
    expect(cuantoAguanta("vuelo.laOtraPunta")).toBe(CADUCA_LA_ORDEN);
    // Y la felicitación de haberla obedecido, que llega detrás.
    expect(cuantoAguanta("vuelo.frustrada~2")).toBe(CADUCA_LA_ORDEN);
  });

  /*
   * Y el porqué de la pista ocupada, que es el mismo caso: se pide detrás del
   * «motor y al aire» de la torre, que corta y dura lo suyo. En Gando, con la
   * pista ocupada a la decisión, la torre sonó y «Pista ocupada. Subí y volvé
   * por el circuito» caducó esperando las dos veces: en Guyrami la orden se
   * quedaba sin el porqué.
   */
  it("y el porqué de la pista ocupada, también", () => {
    expect(cuantoAguanta("vuelo.mandanFrustrar")).toBe(CADUCA_LA_ORDEN);
    expect(cuantoAguanta("vuelo.mandanFrustrar~3")).toBe(CADUCA_LA_ORDEN);
  });

  it("y un aviso de paso, con su reloj corto", () => {
    expect(cuantoAguanta("vuelo.rapido")).toBe(CADUCA);
    expect(explicaLaOtraPunta("vuelo.alAireOtraPuntaX")).toBe(false);
  });

  it("y el descenso de emergencia, que es un procedimiento, también", () => {
    // Ver `esDelDescenso`: en Pettirossi el «ya se respira» caducaba esperando.
    for (const clave of [
      "vuelo.cabinaSinPresion",
      "vuelo.cabinaSinPresionConTren",
      "vuelo.primeroLaTuya.segundos",
      "vuelo.yaSeRespira",
      "comandante.descensoDeEmergencia",
      "comandante.yaSeRespira",
      "tripulacion.mascaras",
      "tripulacion.canario.mascaras",
    ])
      expect(cuantoAguanta(clave), clave).toBe(CADUCA_LA_ORDEN);
    // Y lo que el aire enseña por el camino, no: es un comentario.
    expect(cuantoAguanta("vuelo.aire.bolsa")).toBe(CADUCA);
  });

  /*
   * El aviso de aves de la torre se daba al entrar en final, detrás de la
   * autorización y de la fase, y con los doce segundos de una orden caducaba
   * esperando. Espera lo que haga falta; lo retira el juego cuando las aves
   * ya no están delante. Ver `esElAvisoDeAves` en `torre.ts`.
   */
  it("el aviso de aves en la final no caduca con el reloj, en las dos torres", () => {
    const relleno = "@fonetico.zulu-fonetico.papa-trafico.pies.4";
    expect(cuantoAguanta(`torre.aves${relleno}`, "mando")).toBe(Infinity);
    expect(cuantoAguanta(`torre.canario.aves${relleno}`, "mando")).toBe(Infinity);
    expect(cuantoAguanta("torre.avesX", "mando")).toBe(CADUCA_LA_ORDEN);
  });
});

/**
 * **Lo que la torre te da o te manda no caduca: se dice en cuanto se pueda.**
 *
 * «Cleared to land» caducó esperando en Lanzarote con el JAZ 20; camino de
 * Tenerife Sur cayeron así el «cleared to land» de otro, la información de
 * tráfico y la fase de final. La frecuencia es de uno en uno, y lo que es para
 * ti y es una autorización no se pierde. Ver `noSePierde` en `torre.ts`.
 */
describe("tu autorización no se pierde esperando turno", () => {
  const TUYA = "torre.canario.clearedLand@fonetico.echo-fonetico.charlie";

  it("espera lo que haga falta, y se dice", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("mando", frase("larga"), "torre.canario.goAround@otro");
    b.pedir("mando", frase("tuya"), TUYA);
    reloj += 3 * CADUCA_LA_ORDEN;
    acabar["larga"]!();
    expect(dicho).toEqual(["larga", "tuya"]);
    expect(b.descartadas).toEqual([]);
  });

  it("ni se cae de una cola llena de comentarios", () => {
    const b = boca();
    const { frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("mando", frase("tuya"), TUYA);
    for (let i = 0; i < 8; i++)
      b.pedir("mando", frase(`orden ${i}`), `torre.trafico@${i}`);
    expect(b.espera(TUYA)).toBe(true);
    expect(b.descartadas.some((d) => d.includes("clearedLand"))).toBe(false);
  });

  it("ni la barre un aviso urgente: sigue siendo verdad", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("mando", frase("tuya"), TUYA);
    b.pedir("normal", frase("comentario"), "vuelo.rapido");
    b.pedir("urgente", frase("terreno"), "vuelo.terrenoSube");
    expect(b.espera(TUYA)).toBe(true);
    expect(b.espera("vuelo.rapido")).toBe(false);
    acabar["terreno"]!();
    expect(dicho.at(-1)).toBe("tuya");
  });

  it("y la retira solo quien sabe que ya no vale", () => {
    const b = boca();
    const { frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("mando", frase("tuya"), TUYA);
    b.retirar((c) => c === TUYA);
    expect(b.espera(TUYA)).toBe(false);
    expect(sinHora(b.descartadas.at(-1))).toBe(`${TUYA}: ya no es verdad`);
  });

  it("y lo de los demás, que va en voz baja, sigue con su reloj", () => {
    expect(cuantoAguanta("torre.clearedLand@otro", "baja")).toBe(
      CADUCA_LA_ORDEN,
    );
    expect(cuantoAguanta("torre.clearedLand@yo", "mando")).toBe(Infinity);
    expect(cuantoAguanta("torre.aterrizar@yo", "mando")).toBe(Infinity);
    expect(cuantoAguanta("torre.climbTo@yo", "mando")).toBe(CADUCA_LA_ORDEN);
  });
});

/**
 * **La información de tráfico que te dan a ti pide turno y espera mientras
 * sea verdad.** Esperaba a que la boca estuviera libre del todo, y en una
 * final con todos en el mismo turno no lo estaba nunca: camino de Tenerife
 * Sur, el del circuito a doscientos pies en tu final y ni una palabra. Y
 * pedida con la boca ocupada caducaba a los doce segundos de una orden. Ver
 * `esLaInformacionDeTrafico` en `torre.ts` y `revisar` en
 * `flight/informacion-de-trafico.ts`.
 */
describe("la información de tráfico espera su turno", () => {
  const INFO = "torre.canario.trafico@fonetico.zulu-trafico.hora.2-trafico.millas.1-trafico.pies.3 trafico.above";

  it("detrás de la fraseología más larga, y se dice", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("mando", frase("permiso"), "torre.canario.clearedLand@yo");
    b.pedir("normal", frase("aros"), "vuelo.final");
    b.pedir("baja", frase("bienvenidos"), "comandante.aproximacion");
    b.pedir("mando", frase("tráfico"), INFO);
    // Diez segundos y medio de «cleared to land» con el viento, y más.
    reloj += 2 * CADUCA_LA_ORDEN;
    acabar["permiso"]!();
    // Lo que es para ti pasa delante de la instructora y de la megafonía.
    expect(dicho).toEqual(["permiso", "tráfico"]);
    expect(b.descartadas.some((d) => d.includes("trafico"))).toBe(false);
  });

  /*
   * En el circuito de Los Rodeos con el JAZ 90: la del que venía por la
   * izquierda esperaba detrás de la anterior, y cada vez que el otro cambiaba
   * de hora o de millas se retiraba y se volvía a pedir, al final de lo que
   * manda: «subí» y «climb to» se le colaban delante, y el rombo lleno estuvo
   * dieciocho segundos sin una palabra. Dicha con lo de ahora es la misma
   * información, y conserva su sitio.
   */
  it("y dicha otra vez con lo de ahora, conserva su turno", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    const A_LAS_SIETE = "torre.canario.trafico@yo-trafico.hora.7-trafico.millas.4";
    const A_LAS_OCHO = "torre.canario.trafico@yo-trafico.hora.8-trafico.millas.4";
    b.pedir("mando", frase("la anterior"), "torre.canario.trafico@yo-trafico.hora.6");
    reloj += 1000;
    b.pedir("mando", frase("a las siete"), A_LAS_SIETE);
    reloj += 1000;
    b.pedir("mando", frase("subí"), "torre.canario.subir@yo");
    reloj += 1000;
    b.retirar((c) => c === A_LAS_SIETE, { pasaSuTurnoA: esLaInformacionDeTrafico });
    b.pedir("mando", frase("a las ocho"), A_LAS_OCHO);
    acabar["la anterior"]!();
    expect(dicho).toEqual(["la anterior", "a las ocho"]);
    acabar["a las ocho"]!();
    expect(dicho).toEqual(["la anterior", "a las ocho", "subí"]);
  });

  it("y el turno solo pasa a lo que se dijo que lo heredaba, y una vez", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("mando", frase("a las siete"), INFO);
    reloj += 1000;
    b.pedir("mando", frase("subí"), "torre.canario.subir@yo");
    reloj += 1000;
    b.retirar((c) => c === INFO, { pasaSuTurnoA: esLaInformacionDeTrafico });
    // Lo siguiente que se pide no es una información: no hereda nada.
    b.pedir("mando", frase("climb"), "torre.canario.climbTo@yo");
    acabar["hablando"]!();
    expect(dicho).toEqual(["hablando", "subí"]);
  });

  it("en las dos torres y con la instructora; y la retira quien sabe", () => {
    expect(cuantoAguanta("torre.trafico@x-trafico.hora.2", "mando")).toBe(Infinity);
    expect(cuantoAguanta(INFO, "mando")).toBe(Infinity);
    expect(cuantoAguanta("vuelo.otroAvion.derecha.arriba", "mando")).toBe(Infinity);
    expect(cuantoAguanta("vuelo.otroAvionX", "normal")).toBe(CADUCA);
    const b = boca();
    const { frase } = coro();
    b.pedir("normal", frase("hablando"), "hablando");
    b.pedir("mando", frase("tráfico"), INFO);
    b.retirar((c) => c === INFO);
    expect(b.espera(INFO)).toBe(false);
    expect(sinHora(b.descartadas.at(-1))).toBe(`${INFO}: ya no es verdad`);
  });
});

/**
 * **El canal libre**: nadie hablando, nadie esperando y el silencio cumplido.
 * Es lo que mira quien habla por su cuenta —la frecuencia de los demás— antes
 * de abrir la boca, para no ponerse a la cola. Ver `libre`.
 */
describe("el canal libre", () => {
  it("libre al principio, ocupado hablando, y otra vez libre tras el silencio", () => {
    reloj = 0;
    const b = new Boca({ ahora: () => reloj, cancelar: () => {} });
    const { acabar, frase } = coro();
    expect(b.libre).toBe(true);
    b.pedir("baja", frase("otro avión"), "otro.final@x");
    expect(b.libre).toBe(false);
    acabar["otro avión"]!();
    expect(b.libre).toBe(false);
    reloj += SILENCIO;
    expect(b.libre).toBe(true);
  });

  it("y con alguien esperando turno, tampoco", () => {
    const b = boca();
    const { acabar, frase } = coro();
    b.pedir("normal", frase("uno"), "uno");
    b.pedir("normal", frase("dos"), "dos");
    b.pedir("normal", frase("tres"), "tres");
    acabar["uno"]!();
    reloj += SILENCIO;
    expect(b.cuantasEsperan).toBe(1);
    expect(b.libre).toBe(false);
  });
});

/**
 * **Lo que cuenta una fase aguanta lo que dura la fase.** Con el reloj de un
 * aviso, «estás en final» caducaba detrás del permiso de la torre, que se da
 * en ese mismo instante. Ver `anunciaLaFase`.
 */
describe("la fase se cuenta aunque la torre hable antes", () => {
  it("espera detrás de la torre y se dice", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("mando", frase("permiso"), "torre.aterrizar@yo");
    b.pedir("normal", frase("final"), "vuelo.final");
    reloj += 3 * CADUCA;
    acabar["permiso"]!();
    expect(dicho).toEqual(["permiso", "final"]);
  });

  it("y las de los tres guiones son de fase; un aviso suelto no", () => {
    expect(anunciaLaFase("vuelo.final")).toBe(true);
    expect(anunciaLaFase("vuelo.esperandoAfis")).toBe(true);
    expect(anunciaLaFase("vuelo.abandonandoSinTorre")).toBe(true);
    expect(anunciaLaFase("vuelo.enVueloDestino")).toBe(true);
    expect(anunciaLaFase("vuelo.rapido")).toBe(false);
    expect(cuantoAguanta("vuelo.rapido")).toBe(CADUCA);
  });
});
