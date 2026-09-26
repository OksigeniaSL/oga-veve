/**
 * Quién tiene la palabra, probado sin navegador.
 *
 * `Boca` no sabe hablar: recibe una función que habla y un `listo` que hay que
 * llamar al terminar. Así que aquí se habla con cadenas y se termina a mano,
 * que es exactamente lo que hace falta para probar una política de turnos.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  Boca,
  BOCA,
  CADUCA,
  MEGAFONIA,
  NO_REPETIR,
  RIÑEN,
  SILENCIO,
} from "./boca";

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

describe("y la megafonía va por otra vía", () => {
  /*
   * **Lo corrigió quien juega, y tenía razón.**
   *
   * Esto empezó con una sola boca para todo el juego, con el argumento de que
   * una radio es un solo canal. El argumento vale para la radio y no para la
   * comandante:
   *
   * > «Pero en la realidad, la comandante le habla a los pasajeros por la
   * > megafonía interna del avión, y lo que escucha en sus auriculares va por
   * > otra vía.»
   *
   * En un avión hay dos vías y se solapan. Meterlas en el mismo turno no era
   * prudencia: era un error de modelo, y se pagaba con la frase larga de la
   * llegada cortada por un indicativo.
   */
  it("son dos suelos distintos, no el mismo", () => {
    expect(MEGAFONIA).not.toBe(BOCA);
  });

  it("y hablar por una no ocupa la otra", () => {
    const dichas: string[] = [];
    BOCA.pedir("normal", () => {
      dichas.push("radio");
      // No se llama a `listo`: la radio se queda hablando.
    });
    MEGAFONIA.pedir("baja", () => {
      dichas.push("megafonia");
    });
    expect(dichas).toEqual(["radio", "megafonia"]);
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
});
