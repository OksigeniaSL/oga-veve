/**
 * El cartel del cinturón.
 *
 * Lo que se comprueba son las dos quejas que lo trajeron aquí: que no
 * parpadee, y que **diga lo mismo que la comandante**.
 */

import { describe, expect, it } from "vitest";
import { Megafonia } from "../audio/megafonia";
import { APAGA_LA_LUZ, Cinturon, SACUDE, YA_NO_SACUDE } from "./cinturon";
import type { Fase } from "./vuelo";

const momento = (
  fase: string,
  extra: Partial<{
    movimiento: number;
    loDijoLaComandante: boolean;
    loEncendioLaComandante: boolean;
  }> = {},
) => ({
  fase: fase as never,
  conPasaje: true,
  movimiento: 0,
  loDijoLaComandante: false,
  ...extra,
});

/** Lleva el cartel hasta el crucero con el anuncio ya dicho. */
function hastaElCrucero(c: Cinturon): void {
  c.paso(momento("despegando"));
  c.paso(momento("en-vuelo"));
  c.paso(momento("en-vuelo", { loDijoLaComandante: true }));
}

describe("el cartel del cinturón", () => {
  it("empieza puesto, y sigue puesto todo el despegue y la subida", () => {
    const c = new Cinturon();
    for (const f of ["estacionado", "rodando", "alineando", "despegando"])
      expect(c.paso(momento(f)), f).toBe(true);
  });

  it("y no se apaga solo por estar arriba: lo apaga la comandante", () => {
    /*
     * **Ésta es la queja.** Se oía «ya estamos arriba, pueden soltarse el
     * cinturón» con el cartel apagado desde hacía rato: el anuncio y el cartel
     * contaban cosas distintas del mismo vuelo. Ahora el cartel se apaga **con
     * la frase**, porque son lo mismo.
     */
    const c = new Cinturon();
    c.paso(momento("despegando"));
    // Muchos fotogramas de crucero tranquilo, sin anuncio: sigue puesto.
    for (let i = 0; i < 500; i++)
      expect(c.paso(momento("en-vuelo"))).toBe(true);
    expect(c.paso(momento("en-vuelo", { loDijoLaComandante: true }))).toBe(
      false,
    );
    // Y se queda apagado, que es lo que pasa después de ese anuncio.
    expect(c.paso(momento("en-vuelo"))).toBe(false);
  });

  it("y vuelve a ponerse al empezar a bajar, con el anuncio de la comandante", () => {
    /*
     * En cualquier vuelo de línea el cartel se enciende al empezar el
     * descenso, con el anuncio, y detrás la tripulación pide cinturones,
     * respaldos y mesitas. Esperar a la final era tarde.
     */
    const c = new Cinturon();
    hastaElCrucero(c);
    expect(c.paso(momento("en-vuelo"))).toBe(false);
    expect(c.paso(momento("en-vuelo", { loEncendioLaComandante: true }))).toBe(
      true,
    );
    // Y se queda: ya no hay crucero que valga, aunque el aire esté quieto.
    for (let i = 0; i < 200; i++)
      expect(c.paso(momento("en-vuelo"))).toBe(true);
  });

  it("y un cartel quitado a mano vuelve con ese anuncio", () => {
    // La tripulación dice por megafonía que se encendió: debajo no puede
    // estar apagado.
    const c = new Cinturon();
    hastaElCrucero(c);
    c.ponerMando("quitado");
    expect(c.paso(momento("en-vuelo"))).toBe(false);
    expect(c.paso(momento("en-vuelo", { loEncendioLaComandante: true }))).toBe(
      true,
    );
  });

  it("y vuelve a ponerse al empezar la aproximación", () => {
    const c = new Cinturon();
    hastaElCrucero(c);
    expect(c.paso(momento("en-vuelo"))).toBe(false);
    expect(c.paso(momento("final"))).toBe(true);
  });

  it("y con turbulencia de verdad, aunque sea en crucero", () => {
    const c = new Cinturon();
    hastaElCrucero(c);
    expect(c.paso(momento("en-vuelo", { movimiento: SACUDE }))).toBe(true);
  });

  it("y el aire justo en el umbral no lo hace parpadear", () => {
    /*
     * La queja de origen: «se quita y se pone con mucha facilidad». Con un solo
     * número para encender y apagar, una racha rondando el umbral enciende y
     * apaga el cartel —y su *ding*— cada pocos fotogramas.
     */
    const c = new Cinturon();
    hastaElCrucero(c);
    c.paso(momento("en-vuelo", { movimiento: SACUDE }));
    let cambios = 0;
    let antes = true;
    for (let i = 0; i < 200; i++) {
      // Oscilando alrededor del umbral de encender, sin bajar del de soltar.
      const mov = SACUDE + (i % 2 === 0 ? 0.02 : -0.08);
      const ahora = c.paso(momento("en-vuelo", { movimiento: mov }));
      if (ahora !== antes) cambios++;
      antes = ahora;
    }
    expect(cambios).toBe(0);
  });

  it("y cuando el aire se calma de verdad, se suelta", () => {
    // Para que la de arriba no pase por estar el cartel clavado.
    const c = new Cinturon();
    hastaElCrucero(c);
    expect(c.paso(momento("en-vuelo", { movimiento: SACUDE }))).toBe(true);
    expect(
      c.paso(momento("en-vuelo", { movimiento: YA_NO_SACUDE - 0.01 })),
    ).toBe(false);
  });

  it("y quien vuela lo manda, que para eso es una decisión suya", () => {
    /*
     * Pedido tal cual: «es una decisión del piloto mandar a ponerlo
     * (turbulencia, inicio de aproximación, etc.)». Un interruptor de cabina
     * manda sobre el automático mientras esté puesto.
     */
    const c = new Cinturon();
    hastaElCrucero(c);
    expect(c.paso(momento("en-vuelo"))).toBe(false);
    c.ponerMando("puesto");
    expect(c.paso(momento("en-vuelo"))).toBe(true);
    // Y quitado manda en crucero; al entrar en final se vuelve a encender.
    c.ponerMando("quitado");
    expect(c.paso(momento("en-vuelo"))).toBe(false);
    expect(c.paso(momento("final"))).toBe(true);
    // Al soltar el mando, vuelve a mandar el vuelo.
    c.ponerMando("auto");
    expect(c.paso(momento("final"))).toBe(true);
  });

  it("apagado a mano, se vuelve a encender al alinearse y al entrar en final", () => {
    const c = new Cinturon();
    c.ponerMando("quitado");
    expect(c.paso(momento("rodando"))).toBe(false);
    expect(c.paso(momento("alineando"))).toBe(true);
    expect(c.comoEsta).toBe("auto");
  });

  it("en el puesto, con el avión parado, lo apaga la comandante; y en ningún otro sitio", () => {
    /*
     * Punto 303: Ara sigue con el cinturón «hasta que se apague la luz», y la
     * luz se apaga en el puesto, con los motores parados, cuando la apaga la
     * comandante. Antes, ni parado en el puesto: el cartel no se apagaba nunca.
     */
    const c = new Cinturon();
    expect(c.paso(momento("apagado"))).toBe(true);
    expect(c.paso({ ...momento("apagado"), apagadoEnElPuesto: true })).toBe(false);
    expect(c.paso({ ...momento("en-puesto"), apagadoEnElPuesto: true })).toBe(false);
    // Rodando o en la pista no vale: ahí el cartel va puesto pase lo que pase.
    for (const f of ["a-plataforma", "abandonando", "rodando", "arrancando"])
      expect(c.paso({ ...momento(f), apagadoEnElPuesto: true }), f).toBe(true);
    // Y el interruptor manda sobre todo, como siempre.
    c.ponerMando("puesto");
    expect(c.paso({ ...momento("apagado"), apagadoEnElPuesto: true })).toBe(true);
  });

  it("y en una avioneta sin pasaje no hay cartel", () => {
    const c = new Cinturon();
    expect(c.paso({ ...momento("despegando"), conPasaje: false })).toBe(false);
  });

  it("y un vuelo nuevo empieza con el cartel puesto y sin mandos", () => {
    const c = new Cinturon();
    hastaElCrucero(c);
    c.ponerMando("quitado");
    c.reiniciar();
    expect(c.comoEsta).toBe("auto");
    expect(c.paso(momento("en-vuelo"))).toBe(true);
  });
});

/*
 * **En el puesto, en cualquier vuelo con pasaje.** Solo lo apagaba la escena
 * de pasaje, que cuenta ese momento; en los demás vuelos el cartel seguía
 * encendido con el avión ya apagado en su sitio. Lo real es que se apaga con
 * el avión parado en el puesto y los motores parados, con su *ding*.
 */
describe("el cartel en el puesto, sin escena", () => {
  /** Unos segundos en una fase, de medio en medio; devuelve cómo quedó el cartel. */
  const durante = (c: Cinturon, fase: string, segundos: number): boolean => {
    let encendido = true;
    for (let t = 0; t < segundos - 1e-9; t += 0.5) encendido = c.paso({ ...momento(fase), dt: 0.5 });
    return encendido;
  };

  it("con los motores parados en el puesto se apaga sola, pasado lo que tardan en pararse", () => {
    const c = new Cinturon();
    expect(durante(c, "a-plataforma", 10)).toBe(true);
    // En el puesto con los motores en marcha, todavía no: el avión puede moverse.
    expect(durante(c, "en-puesto", 10)).toBe(true);
    expect(durante(c, "apagado", APAGA_LA_LUZ - 1)).toBe(true);
    expect(durante(c, "apagado", 1)).toBe(false);
    expect(durante(c, "apagado", 30)).toBe(false);
    // Y con el motor en marcha otra vez, vuelve.
    expect(durante(c, "en-puesto", 1)).toBe(true);
  });

  it("y los motores parados fuera del puesto no cuentan: en una calle, la gente sigue sentada", () => {
    const c = new Cinturon();
    expect(durante(c, "a-plataforma", 10)).toBe(true);
    expect(durante(c, "apagado", 60)).toBe(true);
  });

  it("y con escena, manda la escena: la de pasaje lo apaga con su guion", () => {
    const c = new Cinturon();
    durante(c, "en-puesto", 5);
    for (let t = 0; t < 30; t += 0.5)
      expect(c.paso({ ...momento("apagado"), dt: 0.5, apagadoEnElPuesto: false })).toBe(true);
    expect(c.paso({ ...momento("apagado"), dt: 0.5, apagadoEnElPuesto: true })).toBe(false);
  });

  it("y el interruptor, puesto a mano, sigue mandando", () => {
    const c = new Cinturon();
    durante(c, "en-puesto", 5);
    c.ponerMando("puesto");
    expect(durante(c, "apagado", 30)).toBe(true);
  });
});

/*
 * **Un vuelo con pasaje de punta a punta**, con la megafonía y el cartel
 * cosidos como los cose el juego —ver `atenderAlCinturon` y
 * `decirPorMegafonia` en `game.ts`—: lo que la tripulación de verdad hace con
 * la luz en un vuelo tranquilo. Se apaga arriba con el anuncio de crucero, se
 * enciende al empezar a bajar y se apaga en el puesto con los motores parados.
 */
describe("el cartel en un vuelo normal con pasaje, con la megafonía", () => {
  const m = new Megafonia();
  const c = new Cinturon();
  const cambios: { t: number; fase: Fase; encendido: boolean; porQue: string | null }[] = [];
  let t = 0;
  let encendido: boolean | null = null;
  const tramo = (fase: Fase, segundos: number, aire: { sobreElCampo?: number; vertical?: number; desdeLoMasAlto?: number } = {}) => {
    for (let s = 0; s < segundos - 1e-9; s += 0.5, t += 0.5) {
      const dice = m.paso(0.5, {
        fase,
        conPasaje: true,
        conTripulacion: true,
        sobreElCampo: aire.sobreElCampo ?? 0,
        vertical: aire.vertical ?? 0,
        desdeLoMasAlto: aire.desdeLoMasAlto ?? 0,
        cartelPuesto: encendido ?? true,
      });
      const ahora = c.paso({
        fase,
        conPasaje: true,
        movimiento: 0,
        loDijoLaComandante: dice === "comandante.crucero",
        loEncendioLaComandante: dice === "comandante.descenso",
        dt: 0.5,
      });
      if (ahora !== encendido) cambios.push({ t, fase, encendido: ahora, porQue: dice });
      encendido = ahora;
    }
  };
  tramo("estacionado", 20);
  tramo("rodando", 60);
  tramo("autorizado", 10);
  tramo("alineando", 10);
  tramo("despegando", 30, { sobreElCampo: 200, vertical: 10 });
  tramo("en-vuelo", 300, { sobreElCampo: 2500, vertical: 10 });
  tramo("en-vuelo", 120, { sobreElCampo: 5000 });
  m.empezarElDescenso();
  tramo("en-vuelo", 600, { sobreElCampo: 3000, vertical: -8, desdeLoMasAlto: 2000 });
  tramo("final", 120, { sobreElCampo: 300, vertical: -4, desdeLoMasAlto: 4700 });
  tramo("aterrizado", 20);
  tramo("abandonando", 20);
  tramo("a-plataforma", 120);
  tramo("en-puesto", 10);
  const motoresParados = t;
  tramo("apagado", 20);

  it("empieza encendido, se apaga arriba con el anuncio de crucero y se enciende con el de la bajada", () => {
    expect(cambios[0]).toMatchObject({ t: 0, encendido: true });
    const apagaArriba = cambios[1];
    expect(apagaArriba).toMatchObject({ fase: "en-vuelo", encendido: false, porQue: "comandante.crucero" });
    expect(cambios[2]).toMatchObject({ fase: "en-vuelo", encendido: true, porQue: "comandante.descenso" });
  });

  it("y se apaga en el puesto con los motores parados, con su rato; y en ningún otro sitio", () => {
    expect(cambios.map((x) => `${x.fase}:${x.encendido ? "on" : "off"}`)).toEqual([
      "estacionado:on",
      "en-vuelo:off",
      "en-vuelo:on",
      "apagado:off",
    ]);
    // El paso que la apaga empieza medio segundo antes de cumplirse el rato.
    const enElPuesto = cambios[3]!;
    expect(enElPuesto.t - motoresParados).toBeGreaterThanOrEqual(APAGA_LA_LUZ - 0.5);
    expect(enElPuesto.t - motoresParados).toBeLessThanOrEqual(APAGA_LA_LUZ);
  });
});

/**
 * **El vuelo de El Hierro a La Gomera con el JAZ 60**, tal como se midió con
 * `scripts/verificar-turbulencia.mjs`: el mar de nubes del alisio de 1226 a
 * 1676 m, la comandante con todo listo para soltar el cinturón a 1211 m, y la
 * capa cruzada subiendo con σ entre 0,45 y 0,75. Ahí se quedaba el cartel
 * apagado y nadie decía nada.
 */
describe("el mar de nubes, con el cartel y la comandante", () => {
  /** Lo que sacude la capa subiendo por ella, con sus altibajos medidos. */
  const enLaCapa = [0.75, 0.75, 0.7, 0.67, 0.45, 0.56, 0.72, 0.67, 0.45, 0.45, 0.59, 0.73, 0.5];

  it("cruzar la capa enciende el cartel, aunque sea turbulencia ligera, y no parpadea", () => {
    const c = new Cinturon();
    hastaElCrucero(c);
    expect(c.paso(momento("en-vuelo"))).toBe(false);
    const dentro = enLaCapa.map((movimiento) => c.paso(momento("en-vuelo", { movimiento })));
    expect(dentro.every(Boolean)).toBe(true);
    // Encima de la capa, el aire quieto: se apaga.
    expect(c.paso(momento("en-vuelo", { movimiento: 0.1 }))).toBe(false);
    // Y lo que sacude dentro está por encima de lo que enciende el cartel.
    expect(Math.max(...enLaCapa)).toBeGreaterThanOrEqual(SACUDE);
  });

  it("y la comandante no suelta el cinturón dentro de la capa: lo dice encima, en aire quieto", () => {
    const m = new Megafonia();
    const c = new Cinturon();
    const dichos: { anuncio: string; movimiento: number }[] = [];
    const paso = (movimiento: number, sobreElCampo: number) => {
      const encendido = c.paso({
        fase: "en-vuelo",
        conPasaje: true,
        movimiento,
        loDijoLaComandante: false,
        dt: 0.5,
      });
      const dice = m.paso(0.5, {
        fase: "en-vuelo",
        conPasaje: true,
        sobreElCampo,
        vertical: 0,
        desdeLoMasAlto: 0,
        cartelPuesto: encendido,
        aireMovido: c.sacudiendoAhora,
      });
      if (dice) dichos.push({ anuncio: dice, movimiento });
      if (dice === "comandante.crucero")
        c.paso({ fase: "en-vuelo", conPasaje: true, movimiento, loDijoLaComandante: true });
    };
    // Arriba y asentado, pero en la base de la capa y con baches, un minuto largo.
    for (let i = 0; i < 160; i++) paso(enLaCapa[i % enLaCapa.length]!, 1200);
    expect(dichos.map((d) => d.anuncio)).not.toContain("comandante.crucero");
    expect(c.pasajeSuelto).toBe(false);
    // Encima de la capa, quieto: ahora sí.
    for (let i = 0; i < 40; i++) paso(0.05, 1700);
    const crucero = dichos.find((d) => d.anuncio === "comandante.crucero");
    expect(crucero).toBeDefined();
    expect(crucero!.movimiento).toBeLessThan(YA_NO_SACUDE);
  });
});
