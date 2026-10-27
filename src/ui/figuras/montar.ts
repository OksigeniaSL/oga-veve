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
 *   reactores; y el de pistones, el Lycoming IO-360-L2A de cuatro cilindros
 *   opuestos y hélice directa, solo en el JAZ 20, que es el que lo lleva. El
 *   bimotor de pistón, de la clase del Seneca II, lleva dos de seis cilindros
 *   con turbo y hélices que giran al revés, y el fumigador un radial: con
 *   esta figura dirían otra cosa, y siguen con su globo. La elección es la de
 *   siempre, `explicacionDe` en `ui/explicaciones-del-avion.ts`, por el motor
 *   de cada avión.
 * - **El tren**, en el punto del tren: el fijo de la avioneta de escuela, con
 *   sus patas de acero y su rueda de morro, solo en el JAZ 20 —el fumigador
 *   es de rueda de cola—; y el que se recoge, con su bomba eléctrica y sus
 *   tres verdes, solo en el JAZ 60, que es el del 1900D. El bimotor de pistón
 *   y los reactores lo recogen con otros sistemas y siguen con su globo.
 * - **Las luces**, en el punto de las luces y en sus cuatro interruptores de
 *   la tarjeta, con la que se tocó encendida, y la blanca de atrás donde la
 *   lleva cada avión: `Modelo.blanca` en `flight/flota.ts`, lo mismo que
 *   pintan el modelo y «Armá tu avión». El dibujo es la avioneta, con la
 *   baliza en la deriva y los destellos en las puntas; en el fumigador, que no
 *   lleva destellos, no va.
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
import { modeloPorId } from "../../flight/flota";
import { equipoDe } from "../../world/luces-del-trafico";
import type { Edad, Figura } from "./figura";
import type { Luz } from "./luces";
import type { FocoDeLosMandos } from "./mandos";
import {
  textosDeLasLuces,
  textosDeLosFlaps,
  textosDeLosMandos,
  textosDelAltimetro,
  textosDelPapi,
  textosDelPiston,
  textosDelTrenFijo,
  textosDelTrenRetractil,
  textosDelTurbofan,
  textosDelTurbohelice,
  textosDelVelocimetro,
} from "./textos";

export type CualFigura =
  | "papi"
  | "velocimetro"
  | "altimetro"
  | "mandos"
  | "flaps"
  | "turbohelice"
  | "turbofan"
  | "piston"
  | "tren-fijo"
  | "tren-retractil"
  | "luces";

/** La figura que lleva una explicación, y lo que cambia según el punto o el avión. */
export interface FiguraPedida {
  readonly cual: CualFigura;
  /** En los mandos, la superficie de delante. */
  readonly foco?: FocoDeLosMandos;
  /** En las luces, la que se tocó en la tarjeta, encendida al abrir. */
  readonly luz?: Luz;
  /** En las luces, dónde lleva este avión la blanca de atrás. */
  readonly blanca?: "cola" | "puntas";
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
  "avion.motor-piston": { cual: "piston" },
  "avion.tren-fijo": { cual: "tren-fijo" },
  "avion.tren": { cual: "tren-retractil" },
  "avion.luces": { cual: "luces" },
  "avion.luz-baliza": { cual: "luces", luz: "beacon" },
  "avion.luz-estrobos": { cual: "luces", luz: "strobe" },
  "avion.luz-aterrizaje": { cual: "luces", luz: "land" },
} as const satisfies Readonly<Record<string, FiguraPedida>>;

/** La figura de la explicación con ese `id`, si lleva. */
export function figuraDe(id: string): FiguraPedida | undefined {
  return (FIGURAS as Readonly<Record<string, FiguraPedida>>)[id];
}

/**
 * **El avión que dibuja cada figura de la tarjeta**, cuando dibuja uno: los
 * mandos, los flaps, el motor de pistones y el tren fijo son los del JAZ 20;
 * el tren que se recoge, el del JAZ 60.
 */
const AVION_DE_LA_FIGURA: Partial<Record<CualFigura, string>> = {
  mandos: "jaz-20",
  flaps: "jaz-20",
  piston: "jaz-20",
  "tren-fijo": "jaz-20",
  "tren-retractil": "jaz-60",
};

/**
 * **Si el punto de la tarjeta de este avión lleva figura.** El velocímetro,
 * en todas las que usan `avion.pitot`; los motores de turbina, en los que los
 * llevan; las que dibujan un avión, solo en el suyo. Ver la cabecera.
 */
export function figuraEnLaTarjeta(id: string, a: Pick<AircraftConfig, "id">): FiguraPedida | null {
  const f = figuraDe(id);
  if (!f || !id.startsWith("avion.")) return null;
  const suyo = AVION_DE_LA_FIGURA[f.cual];
  if (suyo && a.id !== suyo) return null;
  if (f.cual === "luces") {
    /*
     * Las luces, con la blanca donde la lleva este avión. Y no en el que no
     * lleva destellos —el fumigador—: la figura los tiene, y diría que sí.
     */
    const modelo = modeloPorId(a.id);
    if (!modelo || equipoDe(modelo.silueta).estroboscopicas === "ninguna") return null;
    return { ...f, blanca: modelo.blanca ?? "cola" };
  }
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
    case "piston":
      return (await import("./piston")).montarPiston(el, { edad, textos: textosDelPiston() });
    case "tren-fijo":
      return (await import("./tren-fijo")).montarTrenFijo(el, { edad, textos: textosDelTrenFijo() });
    case "tren-retractil":
      return (await import("./tren-retractil")).montarTrenRetractil(el, { edad, textos: textosDelTrenRetractil() });
    case "luces":
      return (await import("./luces")).montarLuces(el, {
        edad,
        textos: textosDeLasLuces(),
        ...(f.blanca ? { blanca: f.blanca } : {}),
        ...(f.luz ? { enciende: f.luz } : {}),
      });
  }
}
