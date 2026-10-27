/**
 * **Dónde va cada figura, y cómo se monta.**
 *
 * Las cinco van en la ventana de explicación, en el sitio del dibujo —el
 * hueco que se dejó para el vídeo—: se abre una ventana que ya existe en vez
 * de una nueva, y con ella vienen el título, el texto según el peldaño, la
 * voz, el altavoz, cerrar con Escape o tocando fuera y el vuelo congelado
 * mientras se mira. Ver `ui/ventana-de-explicacion.ts`.
 *
 * - **El velocímetro**, al tocar la IAS del cuadro —en los seis aviones: el
 *   pitot y la toma estática son los mismos, y la avioneta del dibujo es un
 *   ejemplo con su esfera— y en el punto del pitot de la tarjeta de las
 *   avionetas, que lo llevan bajo el ala como el dibujo. En la de los
 *   reactores y turbohélices el pitot va a los lados de la nariz, la tarjeta
 *   lo dice así y la figura diría otra cosa: ahí no va.
 * - **El altímetro**, al tocar la ALT del cuadro, en los seis. La tarjeta no
 *   tiene punto de la toma estática —sus puntos se miden en las piezas del
 *   modelo y ninguno la lleva—, y la toma ya está dibujada en esta figura y en
 *   la del pitot.
 * - **El PAPI**, al tocar su tarjeta —las cuatro luces dibujadas que salen en
 *   la final— que es lo que lo representa en el vuelo. Ver `Game` y
 *   `explica.papi`.
 * - **El motor**, en el punto del motor de la tarjeta, cada avión con el que
 *   lleva: el turbohélice de turbina libre en el JAZ 60 —el único que lo
 *   lleva, de la clase del 1900D con su PT6— y el turbofán en los dos
 *   reactores. Las avionetas de pistón siguen con su globo: su figura no
 *   está hecha todavía. La elección es la de siempre, `explicacionDe` en
 *   `ui/explicaciones-del-avion.ts`, por el motor de cada avión.
 * - **Los mandos y los flaps**, en los puntos de la tarjeta del avión que
 *   dibujan: el JAZ 20. Los grados, los cables, el volante y los topes de la
 *   palanca son los suyos, de la clase del Cessna 172S; el biplano lleva
 *   bastón, el Seneca un estabilizador entero, el reactor mandos eléctricos y
 *   los otros, otros topes. Ver `figuraEnLaTarjeta`.
 *
 * Cada figura es un trozo aparte del paquete, que se pide con `import()` la
 * primera vez que se abre: el juego no las carga para volar.
 */

import type { AircraftConfig } from "../../flight/aircraft";
import type { Edad, Figura } from "./figura";
import type { FocoDeLosMandos } from "./mandos";
import {
  textosDeLosFlaps,
  textosDeLosMandos,
  textosDelAltimetro,
  textosDelPapi,
  textosDelTurbofan,
  textosDelTurbohelice,
  textosDelVelocimetro,
} from "./textos";

export type CualFigura = "papi" | "velocimetro" | "altimetro" | "mandos" | "flaps" | "turbohelice" | "turbofan";

/** La figura que lleva una explicación, y la superficie de delante si son los mandos. */
export interface FiguraPedida {
  readonly cual: CualFigura;
  readonly foco?: FocoDeLosMandos;
}

/**
 * **Las figuras de las explicaciones**, por el `id` de cada una. Lo usa el
 * registro de serie para apuntarlas. Ver `ui/explicaciones-de-serie.ts`.
 */
export const FIGURAS = {
  velocidad: { cual: "velocimetro" },
  altitud: { cual: "altimetro" },
  papi: { cual: "papi" },
  "avion.pitot": { cual: "velocimetro" },
  "avion.alerones": { cual: "mandos", foco: "alerones" },
  "avion.profundidad": { cual: "mandos", foco: "profundidad" },
  "avion.timon": { cual: "mandos", foco: "timon" },
  "avion.flaps": { cual: "flaps" },
  "avion.turbohelice": { cual: "turbohelice" },
  "avion.reactor": { cual: "turbofan" },
} as const satisfies Readonly<Record<string, FiguraPedida>>;

/** La figura de la explicación con ese `id`, si lleva. */
export function figuraDe(id: string): FiguraPedida | undefined {
  return (FIGURAS as Readonly<Record<string, FiguraPedida>>)[id];
}

/** El avión que dibujan los mandos y los flaps. */
const EL_DEL_DIBUJO = "jaz-20";

/**
 * **Si el punto de la tarjeta de este avión lleva figura.** El velocímetro,
 * en todas las que usan `avion.pitot`; los mandos y los flaps, solo en la del
 * avión que dibujan. Ver la cabecera.
 */
export function figuraEnLaTarjeta(id: string, a: Pick<AircraftConfig, "id">): FiguraPedida | null {
  const f = figuraDe(id);
  if (!f || !id.startsWith("avion.")) return null;
  if ((f.cual === "mandos" || f.cual === "flaps") && a.id !== EL_DEL_DIBUJO) return null;
  return f;
}

/**
 * **Monta la figura en ese elemento**, pidiendo su trozo si hace falta. Lo
 * que haya dentro del elemento —el dibujo quieto de la explicación— se queda
 * hasta que la figura llega, y se queda del todo si no llega: sin red, la
 * ventana sigue explicando con su dibujo.
 */
export async function montarFigura(el: HTMLElement, f: FiguraPedida, edad: Edad): Promise<Figura> {
  switch (f.cual) {
    case "papi":
      return (await import("./papi")).montarPapi(el, { edad, textos: textosDelPapi() });
    case "velocimetro":
      return (await import("./velocimetro")).montarVelocimetro(el, { edad, textos: textosDelVelocimetro() });
    case "altimetro":
      return (await import("./altimetro")).montarAltimetro(el, { edad, textos: textosDelAltimetro() });
    case "mandos":
      return (await import("./mandos")).montarMandos(el, {
        edad,
        foco: f.foco ?? null,
        textos: textosDeLosMandos(),
      });
    case "flaps":
      return (await import("./flaps")).montarFlaps(el, { edad, textos: textosDeLosFlaps() });
    case "turbohelice":
      return (await import("./turbohelice")).montarTurbohelice(el, { edad, textos: textosDelTurbohelice() });
    case "turbofan":
      return (await import("./turbofan")).montarTurbofan(el, { edad, textos: textosDelTurbofan() });
  }
}
