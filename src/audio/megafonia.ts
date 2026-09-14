/**
 * La megafonía de cabina: la comandante Jazlyn.
 *
 * Pedido así: «voz del piloto saludando o indicando cosas —"señores pasajeros
 * estamos iniciando la maniobra", "tripulación, armar rampas y crosscheck"—…
 * Si hace falta la voz de alguien que haga de capitán o comandante, será una
 * mujer y, obviamente, se llamará **Jazlyn**».
 *
 * ## Solo donde hay pasaje
 *
 * Del turbohélice para arriba. Una avioneta de escuela no lleva megafonía ni
 * tiene a quién hablarle, y eso es justo lo que enseña la escalera de la flota:
 * **cambiar de avión cambia el oficio**. En el Pykasu se vuela; en el Yvága se
 * lleva gente, y se nota antes de despegar.
 *
 * ## Qué decide que hable
 *
 * La fase del vuelo, y nada más. Cada anuncio tiene su momento, y el momento
 * pasa una vez: quien está rodando oye la bienvenida; quien acaba de recibir la
 * luz verde oye el crosscheck; quien llega arriba oye lo del cinturón. Si el
 * momento se fue —se despegó sin oír la bienvenida porque había otra cosa
 * sonando— **no se dice después**: un anuncio de bienvenida con el avión en el
 * aire no es un anuncio, es un error.
 *
 * ## Y nunca por encima de la instructora
 *
 * Es la regla de la casa y aquí importa más que en ningún sitio: la megafonía
 * es ambiente y la instructora es la lección. Si está hablando, Jazlyn espera
 * su turno; si el turno no llega, se calla. Ver `audio/boca.ts`, que es quien
 * reparte la palabra.
 */

import type { Fase } from "../flight/vuelo";

/** Lo que puede decir, en el orden en que pasa un vuelo. */
export const ANUNCIOS = [
  "capitana.bienvenida",
  "capitana.crosscheck",
  "capitana.despegue",
  "capitana.crucero",
  "capitana.descenso",
  "capitana.llegada",
] as const;

export type Anuncio = (typeof ANUNCIOS)[number];

/**
 * En qué fase toca cada uno.
 *
 * No es una lista de momentos bonitos: es lo que de verdad se dice en un vuelo
 * y cuándo. El crosscheck va con la autorización —es el aviso de que esto va en
 * serio— y el de sentarse, con la alineación.
 */
const CUANDO: Record<Anuncio, Fase> = {
  "capitana.bienvenida": "rodando",
  "capitana.crosscheck": "autorizado",
  "capitana.despegue": "alineando",
  "capitana.crucero": "en-vuelo",
  "capitana.descenso": "final",
  "capitana.llegada": "abandonando",
};

/**
 * Cuánto se espera dentro de la fase antes de hablar, en segundos.
 *
 * Un anuncio pegado al cambio de fase pisa a la instructora, que es la que dice
 * lo que hay que hacer justo en ese instante. Cuatro segundos después, la orden
 * ya se oyó y la megafonía suena a lo que es: alguien hablándole al pasaje
 * mientras tú vuelas.
 */
const ESPERA = 4;

/**
 * Y cuánto dura el momento. Pasado esto, ese anuncio ya no toca.
 *
 * Veinticinco segundos: lo que dura una fase corta. Si no se pudo decir en ese
 * rato —porque estaba hablando la instructora— es que ya no venía a cuento.
 */
const SE_PASA = 25;

/** Lo que la megafonía mira del vuelo para saber si le toca hablar. */
export interface Momento {
  readonly fase: Fase;
  /** Si este avión lleva pasaje. Ver `conPasaje`. */
  readonly conPasaje: boolean;
  /** Si la instructora está diciendo algo ahora mismo. */
  readonly instructorHablando: boolean;
}

export class Megafonia {
  /** Lo ya dicho en este vuelo: cada anuncio se dice una vez. */
  private readonly dichos = new Set<Anuncio>();
  /** En qué fase se está y cuánto lleva. */
  private fase: Fase | null = null;
  private desde = 0;

  /** Vuelo nuevo: se olvida de todo. */
  reiniciar(): void {
    this.dichos.clear();
    this.fase = null;
    this.desde = 0;
  }

  /**
   * Un paso. Devuelve la clave que toca decir, o `null`.
   *
   * Se llama cada fotograma y contesta `null` casi siempre, que es lo propio de
   * una megafonía: en un vuelo entero habla seis veces.
   */
  paso(dt: number, m: Momento): Anuncio | null {
    if (m.fase !== this.fase) {
      this.fase = m.fase;
      this.desde = 0;
    }
    this.desde += dt;
    if (!m.conPasaje || m.instructorHablando) return null;
    if (this.desde < ESPERA || this.desde > ESPERA + SE_PASA) return null;
    for (const anuncio of ANUNCIOS) {
      if (this.dichos.has(anuncio)) continue;
      if (CUANDO[anuncio] !== m.fase) continue;
      this.dichos.add(anuncio);
      return anuncio;
    }
    return null;
  }
}

/**
 * Si este avión lleva pasaje, y por tanto megafonía.
 *
 * Por el número de plazas de su ficha no, que no lo tiene: por lo que es. Del
 * turbohélice para arriba hay cabina de pasaje; del bimotor para abajo, no.
 * Se mira el peso porque es el dato que de verdad lo separa —cinco toneladas
 * largas— y no una lista de identificadores que habría que mantener a mano.
 */
export function conPasaje(masaKg: number): boolean {
  return masaKg >= 5000;
}
