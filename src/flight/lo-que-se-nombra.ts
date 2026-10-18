/**
 * **Lo que nombra la instructora: solo si se ve, señalado y diciendo dónde.**
 *
 * Es la tercera vez del mismo fallo, y por eso va a la raíz:
 *
 * - El 263: «¿Ves el arco verde en el mapa?… Pero no hay arco verde en el
 *   mapa». Se arregló para las presentaciones —`sigueEnPantalla` en
 *   `ui/explicaciones.ts`— y en ningún otro sitio.
 * - El 272, bajando con el JAZ 60: «¿Qué rombo es ese que siempre dice "hasta
 *   que el rombo llegue al medio"?». En la pantalla hay varios rombos —los del
 *   tráfico en el mapa, el de la senda— y la voz no decía cuál.
 * - El 273, en final a 1.360 pies y desde fuera: «Nariz un poco arriba hasta
 *   ver dos blancas y dos rojas, ¿qué dos blancas y qué dos rojas?». Era el
 *   PAPI, y en la pantalla no estaban ni la pista ni sus luces.
 *
 * Las tres son la misma regla rota, que es la de cualquier instructora de
 * verdad sentada al lado: **no se nombra lo que el otro no puede ver**, y lo
 * que se nombra se señala con el dedo mientras se dice. Aquí:
 *
 * 1. **Solo se nombra si se ve ahora.** Lo del cuadro, si la pieza está
 *    pintada y el cuadro a la vista —el plano del HUD, o la pantalla de la
 *    cabina con la cámara mirándola—. Lo del mundo, como el PAPI, si cae
 *    delante, dentro de la vista y a una distancia en la que se distingue.
 *    Si no, se dice lo mismo sin nombrarlo —`SIN_VER`— o se calla.
 * 2. **Lo nombrado se señala**: la pieza del cuadro late unos segundos, y el
 *    PAPI lleva un aro con su flecha en la pantalla. Sin leer, en los cuatro
 *    peldaños.
 * 3. **La frase dice dónde está**: «el rombo rosa, el de al lado de la
 *    altura», «las cuatro luces de al lado de la pista», «la marca rosa de la
 *    velocidad». Eso va en los textos de `i18n`.
 *
 * **Y la puerta es una sola.** Cada frase que nombra una pieza está en
 * `NOMBRA`, y la boca de la instructora la mira antes de hablar y otra vez
 * cuando le toca —ver `LoNombrado` en `audio/instructor-grabado.ts`—: una
 * frase que nombra lo que no se ve no llega a sonar, la diga quien la diga.
 * Quien habla elige antes la que sí se puede decir —`laQueSePuedeDecir`—, y
 * la puerta es la red para lo que se escape. La prueba de este módulo mira
 * el diccionario entero: una frase nueva que nombre el rombo, la marca o el
 * PAPI sin estar aquí no pasa.
 *
 * Este módulo no dibuja ni habla: decide. Lo que se ve lo apuntan las
 * superficies que lo pintan —el cuadro, la pantalla de la cabina, el
 * teléfono— con `seVeEnPantalla`; lo del mundo lo mide `Game`.
 */

/**
 * **Las piezas que nombra la instructora.**
 *
 * - `rombo`: el rombo rosa de la escala de la senda, en la pantalla de vuelo,
 *   al lado de la cinta de la altura —el perfil de la bajada y la senda de la
 *   final—. No el de los tráficos: ese es `trafico`.
 * - `marca`: la marca rosa de la cinta de la velocidad, la velocidad que toca.
 *   Solo cuenta si cae dentro de la ventana de la cinta: fuera de ella no se
 *   pinta.
 * - `ritmo`: la marca rosa del variómetro, el ritmo de la senda.
 * - `altimetro`: la cinta de la altura.
 * - `raya`: la altura pedida en esa cinta: la raya, o el bug, y su ventanilla.
 * - `cota`: la cifra de la pista, debajo de la cinta de la altura.
 * - `carta`: la pantalla del mapa.
 * - `trafico`: un rombo de otro avión en el mapa.
 * - `motor`: la marca del motor, en la palanca del gas.
 * - `papi`: las cuatro luces al lado de la pista. Es la única del mundo.
 */
export type Pieza =
  | "rombo"
  | "marca"
  | "ritmo"
  | "altimetro"
  | "raya"
  | "cota"
  | "carta"
  | "trafico"
  | "motor"
  | "papi";

export const PIEZAS: readonly Pieza[] = [
  "rombo",
  "marca",
  "ritmo",
  "altimetro",
  "raya",
  "cota",
  "carta",
  "trafico",
  "motor",
  "papi",
];

/**
 * **Las piezas del cuadro**, que se apuntan con `seVeEnPantalla` desde lo que
 * las pinta. La marca del motor vive en la palanca del HUD y el PAPI en el
 * mundo: esas dos las mide `Game` por su cuenta.
 */
export const DEL_CUADRO: ReadonlySet<Pieza> = new Set<Pieza>([
  "rombo",
  "marca",
  "ritmo",
  "altimetro",
  "raya",
  "cota",
  "carta",
  "trafico",
]);

/**
 * **Qué nombra cada frase.** Todas las que dice la instructora en vuelo y
 * apuntan a algo de la pantalla o de fuera. Las que nombran dos cosas —«hasta
 * la raya de la altura, a la velocidad de la marca rosa»— necesitan las dos.
 *
 * Lo que no está: lo que se ve siempre que se dice —la palanca y los botones
 * del HUD, la flecha de adónde se va, la luz de la torre—; la raya verde del
 * rodaje, que es del suelo y la lleva el sígame; las presentaciones del arco,
 * el T/D y el T/C, que ya solo se dicen con su pieza a la vista
 * (`presentarLoNuevo`); y el modo inicio, que tiene su propia cámara y sus
 * aros delante. Ver la prueba.
 */
export const NOMBRA: Readonly<Record<string, readonly Pieza[]>> = {
  // ── El rombo de la senda ────────────────────────────────────────────
  "vuelo.consejo.narizAbajoSenda": ["rombo"],
  "vuelo.consejo.narizArribaSenda": ["rombo"],
  "vuelo.consejo.masGasSenda": ["rombo"],
  "vuelo.consejo.menosGasSenda": ["rombo"],
  "vuelo.consejo.nivelarPerfil": ["rombo"],
  "vuelo.consejo.narizAbajoPerfil": ["rombo"],
  "vuelo.consejo.aerofrenosPerfil": ["rombo"],
  "vuelo.consejo.masGasPerfil": ["rombo"],
  "vuelo.consejo.menosGasPerfil": ["rombo"],
  "explica.senda.presenta": ["rombo"],
  // ── El PAPI ─────────────────────────────────────────────────────────
  "vuelo.consejo.narizAbajoPapi": ["papi"],
  "vuelo.consejo.narizArribaPapi": ["papi"],
  "vuelo.consejo.masGasPapi": ["papi"],
  "vuelo.consejo.menosGasPapi": ["papi"],
  // ── La marca rosa de la velocidad ──────────────────────────────────
  "vuelo.consejo.masGas": ["marca"],
  "vuelo.consejo.menosGas": ["marca"],
  "vuelo.consejo.aerofrenos": ["marca"],
  "vuelo.consejo.narizAbajoMarca": ["marca"],
  "vuelo.consejo.narizArribaMarca": ["marca"],
  "vuelo.paso.subir": ["raya", "marca"],
  "vuelo.paso.acelerarGas": ["marca"],
  "vuelo.paso.acelerarNariz": ["marca"],
  "vuelo.paso.frenarGas": ["marca"],
  "vuelo.paso.frenarAerofrenos": ["marca"],
  "vuelo.paso.frenarNariz": ["marca"],
  "vuelo.paso.mantener": ["marca"],
  "vuelo.paso.marcaDelAutomatico": ["marca"],
  "vuelo.paso.crucero": ["motor", "marca"],
  "vuelo.paso.bajarConAutomatico": ["raya", "marca"],
  "vuelo.paso.flaps1": ["marca"],
  "vuelo.paso.flaps2": ["marca"],
  "vuelo.paso.flaps3": ["marca"],
  "vuelo.paso.recogerAerofrenos": ["marca"],
  "vuelo.paso.senda": ["marca"],
  "vuelo.paso.sendaConGases": ["marca"],
  "vuelo.paso.sendaConAyuda": ["marca"],
  "vuelo.paso.gasTuyo": ["marca"],
  "vuelo.gasesAutomaticos": ["marca"],
  // ── El variómetro ──────────────────────────────────────────────────
  "vuelo.consejo.narizArribaRitmo": ["ritmo"],
  // ── La altura: la raya, la ventanilla, el altímetro y la cota ──────
  "vuelo.paso.bajar": ["raya"],
  "vuelo.paso.nivelar": ["raya"],
  "vuelo.alturaDeLaTorreRaya": ["raya"],
  "vuelo.alturaDeLaTorre": ["raya"],
  "vuelo.paso.cotaAlMar": ["altimetro"],
  "vuelo.paso.cotaEnAlto": ["altimetro", "cota"],
  "vuelo.cotaDeLaPista": ["altimetro", "carta"],
  // ── La marca del motor ─────────────────────────────────────────────
  "vuelo.paso.crucero.sinVer": ["motor"],
  "vuelo.paso.cruceroConAutomatico": ["motor"],
  "vuelo.paso.cruceroConGases": ["motor"],
  // ── El radar meteorológico, en la carta ────────────────────────────
  "ejercicio.tormenta.radar": ["carta"],
  // ── Los tráficos del mapa ──────────────────────────────────────────
  "vuelo.traficoArriba": ["trafico"],
  "vuelo.traficoAbajo": ["trafico"],
  "vuelo.traficoNivel": ["trafico"],
};

/**
 * **Lo mismo, sin nombrar lo que no se ve.** La frase que se dice cuando la
 * pieza de la de la izquierda no está a la vista: la misma acción, sin el
 * objetivo que no se puede mirar. Lo que no tiene aquí su `.sinVer` tiene
 * una grabada que no nombra nada —«Bajá el motor», «Venís lento: metéle
 * gas»—, o se ve en la tarjeta y la voz calla.
 */
export const SIN_VER: Readonly<Record<string, string>> = {
  "vuelo.consejo.masGasSenda": "vuelo.consejo.masGasSenda.sinVer",
  "vuelo.consejo.menosGasSenda": "vuelo.consejo.menosGasSenda.sinVer",
  "vuelo.consejo.nivelarPerfil": "vuelo.consejo.nivelarPerfil.sinVer",
  "vuelo.consejo.aerofrenosPerfil": "vuelo.consejo.aerofrenosPerfil.sinVer",
  "vuelo.consejo.masGasPerfil": "vuelo.consejo.masGasPerfil.sinVer",
  "vuelo.consejo.menosGasPerfil": "vuelo.consejo.menosGasPerfil.sinVer",
  "vuelo.consejo.aerofrenos": "vuelo.consejo.aerofrenos.sinVer",
  "vuelo.consejo.narizArribaMarca": "vuelo.consejo.narizArribaMarca.sinVer",
  "vuelo.paso.subir": "vuelo.paso.subir.sinVer",
  "vuelo.paso.acelerarGas": "vuelo.paso.acelerarGas.sinVer",
  "vuelo.paso.acelerarNariz": "vuelo.paso.acelerarNariz.sinVer",
  "vuelo.paso.frenarAerofrenos": "vuelo.paso.frenarAerofrenos.sinVer",
  "vuelo.paso.frenarNariz": "vuelo.paso.frenarNariz.sinVer",
  "vuelo.paso.marcaDelAutomatico": "vuelo.paso.marcaDelAutomatico.sinVer",
  "vuelo.paso.crucero": "vuelo.paso.crucero.sinVer",
  "vuelo.paso.nivelar": "vuelo.paso.nivelar.sinVer",
  "vuelo.paso.recogerAerofrenos": "vuelo.paso.recogerAerofrenos.sinVer",
  "vuelo.paso.senda": "vuelo.paso.senda.sinVer",
  "vuelo.paso.sendaConGases": "vuelo.paso.sendaConGases.sinVer",
  "vuelo.paso.sendaConAyuda": "vuelo.paso.sendaConAyuda.sinVer",
  "vuelo.paso.gasTuyo": "vuelo.paso.gasTuyo.sinVer",
};

/** Lo que nombra esta frase; nada si no nombra ninguna pieza. */
export function piezasDe(clave: string | null | undefined): readonly Pieza[] {
  return (clave && NOMBRA[clave]) || [];
}

/** **Si esta frase nombra algo que ahora no se ve.** */
export function nombraLoQueNoSeVe(
  clave: string | null | undefined,
  seVe: (p: Pieza) => boolean,
): boolean {
  return piezasDe(clave).some((p) => !seVe(p));
}

/**
 * **De las que dirían lo mismo, la primera que solo nombra lo que se ve.**
 * Van de la que más dice a la que menos: la que nombra el objetivo, la misma
 * sin él, la grabada de siempre. `null` si ninguna: entonces se ve en la
 * tarjeta y la voz calla.
 */
export function laQueSePuedeDecir(
  candidatas: readonly (string | null | undefined)[],
  seVe: (p: Pieza) => boolean,
): string | null {
  for (const c of candidatas) if (c && !nombraLoQueNoSeVe(c, seVe)) return c;
  return null;
}

/**
 * **Las de una frase, en ese orden**: ella, su `SIN_VER` y lo que se diga
 * cuando ninguna de las dos sirva.
 */
export function conSuSinVer(
  clave: string,
  y: readonly (string | null | undefined)[] = [],
): (string | null | undefined)[] {
  return [clave, SIN_VER[clave], ...y];
}

// ── Lo señalado ────────────────────────────────────────────────────────

/**
 * **Cuánto late lo nombrado**, s: lo que dura una frase de consejo y un poco
 * más, para que dé tiempo a buscarlo con los ojos. Es el mismo rato que la
 * pieza que se presenta —`resaltarLoQueSeExplica`, seis segundos—: una sola
 * manera de señalar en todo el juego.
 */
export const DURA_EL_SENALADO = 6;

/**
 * **Lo que está señalado ahora y desde cuándo.** Lo leen el cuadro plano, la
 * pantalla de la cabina y el aro del PAPI, cada uno para pintarlo a su
 * manera. No sabe de relojes de pared: avanza con el paso del juego.
 */
export class LoSenalado {
  private readonly vivos = new Map<Pieza, number>();

  /** Señala esa pieza desde ahora, o vuelve a empezar si ya latía. */
  senalar(p: Pieza): void {
    this.vivos.set(p, 0);
  }

  paso(dt: number): void {
    for (const [p, edad] of this.vivos) {
      const nueva = edad + dt;
      if (nueva >= DURA_EL_SENALADO) this.vivos.delete(p);
      else this.vivos.set(p, nueva);
    }
  }

  /** Si esa pieza está señalada. */
  vivo(p: Pieza): boolean {
    return this.vivos.has(p);
  }

  /** Cuánto lleva cada una señalada, s. */
  get edades(): Readonly<Partial<Record<Pieza, number>>> {
    const r: Partial<Record<Pieza, number>> = {};
    for (const [p, edad] of this.vivos) r[p] = edad;
    return r;
  }

  /** Vuelo nuevo: nada señalado. */
  olvidar(): void {
    this.vivos.clear();
  }
}

/**
 * **Cómo late lo señalado en un lienzo**, de 0 a 1: un latido por segundo y
 * pico, como `.explica--presenta` en la hoja; con «Movimiento: reducido», luce
 * quieto. Para la pantalla de la cabina, que se pinta con un lienzo y no con
 * la hoja.
 */
export function latido(edad: number, quieto: boolean): number {
  if (edad < 0 || edad >= DURA_EL_SENALADO) return 0;
  if (quieto) return 1;
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * edad) / 1.1);
}

// ── El PAPI, a la vista ────────────────────────────────────────────────

/**
 * **Hasta dónde se distinguen de día las luces del PAPI**, m: unas cinco
 * millas. «These lights are visible from about 5 miles during the day and up
 * to 20 miles at night» — FAA, *Aeronautical Information Manual*, 2-1-2 b,
 * *Precision Approach Path Indicator (PAPI)*. Las millas del AIM, sin decir,
 * son terrestres; se toma la de día, que es lo que se vuela aquí casi
 * siempre, y de noche se queda igual: el juego no le da más brillo de noche.
 */
export const PAPI_SE_VE_DESDE = 5 * 1609.344;

/**
 * **Lo que tienen que ocupar las cuatro luces en la pantalla para contarlas**,
 * px, de la primera a la última.
 *
 * Ojo y pantalla no ven lo mismo. Las luces van a nueve metros una de otra
 * —ver `PAPI_SEPARACION` en `world/aproximacion.ts`—, y a cinco millas eso son
 * casi cuatro minutos de arco, que un ojo separa sin esfuerzo. Pero un píxel
 * de una pantalla de 720 con sesenta y dos grados de campo son casi seis
 * minutos de arco: a esa distancia, en la pantalla, las cuatro son un punto.
 * Lo que manda es lo que se ve aquí, no lo que se vería por el parabrisas.
 *
 * Medido con la tarjeta de verdad en la final de Pettirossi, el JAZ 60 en la
 * senda y la pantalla de 1280 por 720: a 520 m de las luces ocupan 27 px y se
 * ven las cuatro con su color; a 820 m, 17 px, y todavía; a 1.120 m, 12 px, y
 * son cuatro puntitos que hay que buscar; a 1.400 m, 10 px, y ya no se cuentan.
 * De quince para arriba, cada luz mide algo más de un píxel y hay cinco entre
 * una y otra. Es una cuenta en píxeles a propósito: en una pantalla más grande
 * las luces también se pintan más grandes, y el límite se corre solo.
 */
export const PAPI_SE_DISTINGUE_PX = 15;

/** Dónde caen las luces del PAPI vistas desde la cámara de ahora. */
export interface PapiVisto {
  /** Si caen delante de la cámara. */
  readonly delante: boolean;
  /** El centro de las cuatro, de −1 a 1, como la pantalla de three. */
  readonly x: number;
  readonly y: number;
  /** De la primera luz a la última, en píxeles de la pantalla. */
  readonly anchoPx: number;
  /** A cuántos metros de la cámara. */
  readonly distancia: number;
  /**
   * Si algo del propio avión las tapa: el morro desde la cabina, el fuselaje
   * desde la cámara de detrás.
   */
  readonly tapado: boolean;
}

/** La franja de la pantalla que no tapa el HUD, de −1 a 1, como `FranjaLibre`. */
export interface Franja {
  readonly arriba: number;
  readonly abajo: number;
}

/**
 * **Hasta dónde a los lados cuenta como a la vista**, de 0 a 1 de la media
 * pantalla: en los costados están los mandos y la tarjeta.
 */
export const A_LOS_LADOS = 0.8;

/**
 * **Si el PAPI se distingue ahora**, en la pantalla de quien juega: delante,
 * dentro de lo que el HUD deja ver, sin el avión por medio, dentro de las
 * cinco millas del AIM y con las cuatro luces separadas en la pantalla.
 */
export function seDistingueElPapi(p: PapiVisto | null, franja: Franja): boolean {
  if (!p || !p.delante || p.tapado) return false;
  if (p.distancia > PAPI_SE_VE_DESDE) return false;
  if (p.anchoPx < PAPI_SE_DISTINGUE_PX) return false;
  if (Math.abs(p.x) > A_LOS_LADOS) return false;
  return p.y < franja.arriba && p.y > franja.abajo;
}
