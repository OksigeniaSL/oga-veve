/**
 * El cartel del cinturón.
 *
 * Lo que se comprueba son las dos quejas que lo trajeron aquí: que no
 * parpadee, y que **diga lo mismo que la comandante**.
 */

import { describe, expect, it } from "vitest";
import { Cinturon, SACUDE, YA_NO_SACUDE } from "./cinturon";

const momento = (
  fase: string,
  extra: Partial<{ movimiento: number; loDijoLaComandante: boolean }> = {},
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
    // Y quitado manda igual, incluso en aproximación.
    c.ponerMando("quitado");
    expect(c.paso(momento("final"))).toBe(false);
    // Al soltar el mando, vuelve a mandar el vuelo.
    c.ponerMando("auto");
    expect(c.paso(momento("final"))).toBe(true);
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
