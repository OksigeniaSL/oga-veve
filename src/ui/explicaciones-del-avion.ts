/**
 * **Lo que cuenta cada punto de la tarjeta del avión**, como datos.
 *
 * Enrique pidió puntos que se tocan y se explican —alerones, flaps, timón,
 * pitot, motores, tren y luces— «con dibujo, texto y voz», y lo mismo en las
 * avionetas, con sus piezas. Aquí está lo que dice cada uno y nada más: la
 * tarjeta los pinta en un globo junto al punto, y el registro de
 * explicaciones al tocar del cuadro —otro fichero, `ui/explicaciones.ts`— los
 * puede recoger tal cual, porque cada uno lleva su `id`, su dibujo, su clave
 * de texto, su clave de voz y el hueco para un vídeo.
 *
 * ## Lo que se cuenta es lo de verdad
 *
 * Es la regla cuarta de AGENTS.md y aquí es donde más se nota, porque estas
 * frases son las primeras explicaciones de aeronáutica que va a oír mucha
 * gente. Tres cuidados:
 *
 * - **El flap no explica la sustentación con el aire que corre más por
 *   arriba.** Eso es falso aunque sea lo que se cuenta siempre. El flap hace
 *   el ala más curva y más grande, y con eso sostiene el avión más despacio:
 *   es lo que dice, y nada más.
 * - **El alerón sube un ala y baja la otra**: uno sube y el otro baja, y el
 *   avión se inclina, que es como gira. No «gira» sin más.
 * - **El pitot mide la velocidad con el aire que le entra de frente.** Así de
 *   sencillo y así de cierto: cuanto más rápido, más aprieta.
 *
 * ## Una variante por clase, no una frase para todos
 *
 * Un tren que se guarda y uno que va siempre fuera no se explican igual, y un
 * reactor no es una hélice. Por eso hay `avion.tren` y `avion.tren-fijo`, y
 * tres motores; `explicacionDe` elige el que lleva cada avión.
 */

import type { AircraftConfig } from "../flight/aircraft";
import type { TranslationKey } from "../i18n";
import type { PiezaDelAvion } from "../world/puntos-del-avion";

/** Una explicación de la tarjeta, lista para el registro del cuadro. */
export interface ExplicacionDelAvion {
  /** `avion.` y la pieza: `avion.alerones`. Único en todo el juego. */
  readonly id: `avion.${string}`;
  /** El dibujo, en un lienzo de 48 por 48. Va en los cuatro peldaños. */
  readonly dibujo: string;
  /** Lo que se lee en el globo. */
  readonly texto: TranslationKey;
  /**
   * Lo que dice la instructora.
   *
   * Una clave del diccionario como todas las de voz: la grabación se busca por
   * ella y, mientras no está grabada, no suena. Ver `PENDIENTE-VOCES-tarjeta.md`.
   */
  readonly voz: TranslationKey;
  /**
   * **El hueco para un vídeo**, vacío de momento.
   *
   * Pedido en la lista (el 252): historias con imágenes o minivídeos con
   * licencia verificable. Cuando haya uno, va aquí su dirección y el globo lo
   * enseña en lugar del dibujo; mientras no, `null`.
   */
  readonly video: string | null;
}

/*
 * Los dibujos, a trazo, en el color del globo. Lienzo de 48: se ven a 40 px
 * en el punto y a 72 en el globo, y a esos tamaños un trazo de 3 se lee.
 */
const T = `fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
const F = `fill="currentColor"`;

const DIBUJOS = {
  // El ala vista de frente, con un alerón arriba y el otro abajo.
  alerones: `<path ${T} d="M4 26 H44" /><path ${T} d="M24 22 v8" />
    <path ${T} d="M6 26 l-2 -6 M42 26 l2 6" />
    <path ${F} d="M6 10 l4 6 h-8 Z M42 42 l4 -6 h-8 Z" />`,
  // La cola de lado, con la profundidad y las dos flechas.
  profundidad: `<path ${T} d="M4 30 H30 l10 -2" /><path ${T} d="M30 30 l10 6" />
    <path ${F} d="M42 12 l4 6 h-8 Z M42 46 l4 -6 h-8 Z" opacity="0.9" />`,
  // La deriva desde arriba, con el timón girado y la flecha al lado.
  timon: `<path ${T} d="M24 4 V30" /><path ${T} d="M24 30 l-8 12" />
    <path ${T} d="M34 40 q6 -6 6 -14" /><path ${F} d="M36 22 l4 -6 l4 6 Z" />`,
  // El perfil del ala con el flap bajado detrás.
  flaps: `<path ${T} d="M4 24 C8 16 22 14 34 20" /><path ${T} d="M4 24 C10 28 22 28 32 26" />
    <path ${T} d="M34 24 l10 10" />`,
  // El perfil con el panel levantado encima.
  aerofrenos: `<path ${T} d="M4 30 C8 22 24 20 44 28" /><path ${T} d="M4 30 C12 34 30 34 44 28" />
    <path ${T} d="M24 22 l10 -12" />`,
  // El tubo en ele y el aire que le entra de frente.
  pitot: `<path ${T} d="M30 6 V24 H10" /><circle cx="10" cy="24" r="2" ${F} />
    <path ${T} d="M2 34 H18 M2 40 H14" opacity="0.7" />`,
  // La hélice de tres palas, con su buje.
  helice: `<circle cx="24" cy="24" r="4" ${F} />
    <path ${F} d="M24 20 C20 12 22 4 26 4 C28 8 27 14 24 20 Z" />
    <path ${F} d="M27.5 26 C35 30 41 36 39 39 C35 39 30 34 27.5 26 Z" />
    <path ${F} d="M20.5 26 C16 34 9 38 7 35 C9 31 14 27 20.5 26 Z" />`,
  // La hélice delante de su turbina.
  turbohelice: `<path ${T} d="M6 10 V38" /><path ${T} d="M10 24 H40" />
    <path ${T} d="M14 16 H34 l8 4 v8 l-8 4 H14 Z" />`,
  // El reactor de frente: la góndola y las palas del ventilador.
  reactor: `<circle cx="24" cy="24" r="18" ${T} /><circle cx="24" cy="24" r="4" ${F} />
    <path ${T} d="M24 20 V8 M28 25 l10 6 M20 25 l-10 6 M27 21 l9 -8 M21 21 l-9 -8 M24 28 v12" />`,
  // La pata con su rueda, y la flecha de guardarse.
  tren: `<path ${T} d="M20 6 V28" /><circle cx="20" cy="36" r="8" ${T} />
    <path ${F} d="M36 8 l6 8 h-12 Z" /><path ${T} d="M36 16 V28" />`,
  // La rueda con su polaina, que no se guarda.
  "tren-fijo": `<path ${T} d="M24 4 V22" /><circle cx="24" cy="32" r="9" ${T} />
    <path ${T} d="M12 30 C12 20 36 20 36 30" />`,
  // Las tres de navegación: roja, verde y blanca.
  luces: `<circle cx="8" cy="24" r="6" fill="#e8352c" /><circle cx="40" cy="24" r="6" fill="#2ad04a" />
    <circle cx="24" cy="10" r="5" fill="#f4f4f0" /><path ${T} d="M14 24 H34" opacity="0.6" />`,
  // La baliza: una roja con su destello.
  baliza: `<circle cx="24" cy="26" r="8" fill="#e8352c" />
    <path ${T} d="M24 8 v4 M10 14 l3 3 M38 14 l-3 3 M6 28 h4 M38 28 h4" />`,
  // Los destellos: una estrella blanca.
  estrobos: `<path ${F} d="M24 4 l4 14 l14 6 l-14 6 l-4 14 l-4 -14 l-14 -6 l14 -6 Z" />`,
  // El faro y su haz.
  aterrizaje: `<circle cx="12" cy="24" r="7" ${F} />
    <path ${T} d="M20 18 L44 10 M20 24 H44 M20 30 L44 38" opacity="0.8" />`,
  // La placa de la matrícula.
  matricula: `<rect x="3" y="14" width="42" height="20" rx="3" ${T} />
    <path ${T} d="M10 24 h8 M22 24 h4 M30 24 h8" />`,
} as const;

/** El dibujo de una explicación, ya montado en su SVG. */
export function dibujoDe(e: ExplicacionDelAvion, clase = ""): string {
  return `<svg class="${clase}" viewBox="0 0 48 48" aria-hidden="true">${e.dibujo}</svg>`;
}

const de = (
  id: ExplicacionDelAvion["id"],
  dibujo: keyof typeof DIBUJOS,
  clave: string,
): ExplicacionDelAvion => ({
  id,
  dibujo: DIBUJOS[dibujo],
  texto: `tarjeta.${clave}` as TranslationKey,
  voz: `tarjeta.voz.${clave}` as TranslationKey,
  video: null,
});

/** Todas, por su `id`. Lo que recorre el registro y lo que mira la prueba. */
export const EXPLICACIONES_DEL_AVION: readonly ExplicacionDelAvion[] = [
  de("avion.alerones", "alerones", "alerones"),
  de("avion.profundidad", "profundidad", "profundidad"),
  de("avion.timon", "timon", "timon"),
  de("avion.flaps", "flaps", "flaps"),
  de("avion.aerofrenos", "aerofrenos", "aerofrenos"),
  de("avion.pitot", "pitot", "pitot"),
  de("avion.pitot-morro", "pitot", "pitotMorro"),
  de("avion.motor-piston", "helice", "motorPiston"),
  de("avion.motor-radial", "helice", "motorRadial"),
  de("avion.turbohelice", "turbohelice", "turbohelice"),
  de("avion.reactor", "reactor", "reactor"),
  de("avion.tren", "tren", "tren"),
  de("avion.tren-fijo", "tren-fijo", "trenFijo"),
  de("avion.luces", "luces", "luces"),
  de("avion.luz-baliza", "baliza", "luzBaliza"),
  de("avion.luz-estrobos", "estrobos", "luzEstrobos"),
  de("avion.luz-aterrizaje", "aterrizaje", "luzAterrizaje"),
  de("avion.matricula", "matricula", "matricula"),
];

const POR_ID = new Map(EXPLICACIONES_DEL_AVION.map((e) => [e.id, e]));

/** Una por su `id`. Lanza si no existe: un `id` mal escrito es un fallo. */
export function explicacion(id: ExplicacionDelAvion["id"]): ExplicacionDelAvion {
  const e = POR_ID.get(id);
  if (!e) throw new Error(`No hay explicación ${id}`);
  return e;
}

/**
 * **La explicación del punto de esta pieza en este avión.**
 *
 * La pieza es la misma en los seis —todos tienen motor y tren— pero lo que se
 * cuenta no: el pitot de una avioneta está bajo el ala y el de un reactor a
 * los lados del morro; un radial no es un motor de cuatro cilindros en fila y
 * un turbofán no tiene hélice.
 */
export function explicacionDe(
  pieza: PiezaDelAvion,
  a: AircraftConfig,
): ExplicacionDelAvion {
  switch (pieza) {
    case "motor":
      return explicacion(
        a.sound.engine === "turbofan"
          ? "avion.reactor"
          : a.sound.engine === "turboprop"
            ? "avion.turbohelice"
            : a.sound.engine === "radial"
              ? "avion.motor-radial"
              : "avion.motor-piston",
      );
    case "tren":
      return explicacion(a.trenRetractil ? "avion.tren" : "avion.tren-fijo");
    case "pitot":
      return explicacion(
        a.sound.engine === "turbofan" || a.sound.engine === "turboprop"
          ? "avion.pitot-morro"
          : "avion.pitot",
      );
    default:
      return explicacion(`avion.${pieza}`);
  }
}

/**
 * **Las luces que se encienden desde la tarjeta**, con su porqué.
 *
 * Las mismas cuatro reglas que siguen las luces de los aviones del juego —ver
 * `world/luces-del-trafico.ts`—, y en el orden en que se encienden de verdad:
 * las de navegación siempre, la baliza antes de arrancar, los destellos al
 * entrar en la pista y los faros por debajo de diez mil pies.
 */
export type LuzDeLaTarjeta = "navegacion" | "baliza" | "estroboscopicas" | "aterrizaje";

export const LUCES_DE_LA_TARJETA: readonly {
  readonly luz: LuzDeLaTarjeta;
  readonly explicacion: ExplicacionDelAvion["id"];
}[] = [
  { luz: "navegacion", explicacion: "avion.luces" },
  { luz: "baliza", explicacion: "avion.luz-baliza" },
  { luz: "estroboscopicas", explicacion: "avion.luz-estrobos" },
  { luz: "aterrizaje", explicacion: "avion.luz-aterrizaje" },
];
