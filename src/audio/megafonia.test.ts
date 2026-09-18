/**
 * Que la comandante hable cuando toca y se calle cuando no.
 *
 * Lo que se comprueba aquí no es el texto: es **el momento**. Una megafonía que
 * saluda con el avión en el aire, o que repite la bienvenida cada vez que se
 * pasa por «rodando», no suena a vuelo: suena a máquina.
 */
import { describe, expect, it } from "vitest";
import { Megafonia, conPasaje } from "./megafonia";
import type { Fase } from "../flight/vuelo";

/*
 * Por defecto, **arriba y asentado**: así las pruebas de fase siguen midiendo
 * la fase y no se les cuela la condición del cinturón. Las que van de eso la
 * ponen a mano.
 */
const CON_PASAJE = {
  conPasaje: true,
  instructorHablando: false,
  sobreElCampo: 900,
  vertical: 0,
};

/** Corre unos segundos en una fase y devuelve lo que se dijo. */
function correr(m: Megafonia, fase: Fase, segundos: number, extra = {}) {
  const dichos: string[] = [];
  for (let t = 0; t < segundos; t += 0.5) {
    const dice = m.paso(0.5, { fase, ...CON_PASAJE, ...extra });
    if (dice) dichos.push(dice);
  }
  return dichos;
}

describe("la megafonía de cabina", () => {
  it("saluda al pasaje mientras se rueda", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 12)).toEqual(["comandante.bienvenida"]);
  });

  it("pero no en el primer segundo, que ahí habla la instructora", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 3)).toEqual([]);
  });

  it("y no repite lo ya dicho aunque se vuelva a la misma fase", () => {
    const m = new Megafonia();
    correr(m, "rodando", 12);
    correr(m, "esperando", 6);
    expect(correr(m, "rodando", 12)).toEqual([]);
  });

  it("no habla por encima de la instructora", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 12, { instructorHablando: true })).toEqual([]);
  });

  it("y si el momento se pasa, ese anuncio ya no se dice", () => {
    const m = new Megafonia();
    // Media fase entera con la instructora hablando: el momento se va.
    correr(m, "rodando", 40, { instructorHablando: true });
    expect(correr(m, "rodando", 10)).toEqual([]);
  });

  it("dice lo suyo en cada fase del vuelo, y en orden", () => {
    const m = new Megafonia();
    const todo = [
      ...correr(m, "rodando", 10),
      ...correr(m, "autorizado", 10),
      ...correr(m, "alineando", 10),
      ...correr(m, "en-vuelo", 10),
      ...correr(m, "final", 10),
      ...correr(m, "abandonando", 10),
    ];
    expect(todo).toEqual([
      "comandante.bienvenida",
      "comandante.crosscheck",
      "comandante.despegue",
      "comandante.crucero",
      "comandante.descenso",
      "comandante.llegada",
    ]);
  });

  it("y en un vuelo entero habla seis veces y ni una más", () => {
    const m = new Megafonia();
    let veces = 0;
    for (const fase of [
      "estacionado",
      "arrancando",
      "rodando",
      "esperando",
      "autorizado",
      "alineando",
      "despegando",
      "comprometido",
      "en-vuelo",
      "final",
      "aterrizado",
      "abandonando",
      "a-plataforma",
      "en-puesto",
    ] as Fase[]) {
      veces += correr(m, fase, 30).length;
    }
    expect(veces).toBe(6);
  });

  it("un vuelo nuevo la vuelve a dejar hablar", () => {
    const m = new Megafonia();
    correr(m, "rodando", 10);
    m.reiniciar();
    expect(correr(m, "rodando", 10)).toEqual(["comandante.bienvenida"]);
  });
});

describe("quién lleva megafonía", () => {
  it("los que llevan pasaje", () => {
    // Turbohélice, reactor regional y de fuselaje ancho.
    expect(conPasaje(7200)).toBe(true);
    expect(conPasaje(35000)).toBe(true);
    expect(conPasaje(255826)).toBe(true);
  });

  it("y no una avioneta, que no tiene a quién hablarle", () => {
    expect(conPasaje(1100)).toBe(false);
    expect(conPasaje(1500)).toBe(false);
    expect(conPasaje(2100)).toBe(false);
  });
});

describe("y el del cinturón pide altura, no fase", () => {
  /*
   * «¿Cómo dice la comandante que ya estamos arriba y pueden soltarse el
   * cinturón si todavía estoy empezando a levantar el avión en la pista?»
   *
   * La fase `en-vuelo` empieza en el instante en que las ruedas dejan el
   * asfalto, así que el anuncio salía a veinte metros con el avión rotando.
   */
  it("no se dice recién despegado, a ras del campo", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 40, { sobreElCampo: 20, vertical: 6 }),
    ).toEqual([]);
  });

  it("ni subiendo fuerte, por muy alto que se vaya", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 40, { sobreElCampo: 1200, vertical: 7 }),
    ).toEqual([]);
  });

  it("ni volando el circuito, que es donde nadie se suelta el cinturón", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 60, { sobreElCampo: 250, vertical: 0 }),
    ).toEqual([]);
  });

  it("y sí arriba y asentado", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 12, { sobreElCampo: 900, vertical: 0 }),
    ).toEqual(["comandante.crucero"]);
  });

  it("y la ventana se cuenta desde que se cumplen, no desde la fase", () => {
    /*
     * El anuncio pide altura y calma, y eso llega cuando llega. Medido desde
     * el cambio de fase, los veinticinco segundos de ventana se agotaban
     * durante la subida y no salía nunca — que es el otro modo de fallar,
     * más silencioso y por eso peor.
     */
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 90, { sobreElCampo: 80, vertical: 6 }),
    ).toEqual([]);
    expect(
      correr(m, "en-vuelo", 12, { sobreElCampo: 900, vertical: 0 }),
    ).toEqual(["comandante.crucero"]);
  });
});
