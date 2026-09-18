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
  "comandante.bienvenida",
  "comandante.crosscheck",
  "comandante.despegue",
  "comandante.crucero",
  "comandante.descenso",
  "comandante.llegada",
] as const;

export type Anuncio = (typeof ANUNCIOS)[number];

/**
 * En qué fase toca cada uno.
 *
 * No es una lista de momentos bonitos: es lo que de verdad se dice en un vuelo
 * y cuándo. El crosscheck va con la autorización —es el aviso de que esto va en
 * serio— y el de sentarse, con la alineación.
 */
/**
 * ── **Y la fase no basta para el del cinturón** ──
 *
 * «¿Cómo dice la comandante que ya estamos arriba y pueden soltarse el
 * cinturón si todavía estoy empezando a levantar el avión en la pista?»
 *
 * Exacto: la fase `en-vuelo` empieza **en el instante en que las ruedas dejan
 * el asfalto**, así que el anuncio de crucero salía a veinte metros de altura
 * con el avión todavía rotando. Eso no lo dice nadie en ningún avión.
 *
 * El del cinturón no es un anuncio de fase, es un anuncio de **condiciones**:
 * se dice cuando el avión está arriba y ha dejado de subir. Las dos cosas, y
 * no una — a mitad de una subida fuerte tampoco se suelta nadie el cinturón.
 */
const CUANDO: Record<Anuncio, Fase> = {
  "comandante.bienvenida": "rodando",
  "comandante.crosscheck": "autorizado",
  "comandante.despegue": "alineando",
  "comandante.crucero": "en-vuelo",
  "comandante.descenso": "final",
  "comandante.llegada": "abandonando",
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

/**
 * A qué altura sobre el campo se apaga el cartel del cinturón, en metros.
 *
 * Cuatrocientos. En un avión de verdad son diez mil pies y aquí eso sería no
 * decirlo nunca: el circuito de tráfico entero se vuela a doscientos
 * cincuenta. Cuatrocientos es **por encima del circuito** —o sea, ya no estás
 * dando vueltas al campo, te has ido— y se alcanza en cualquier vuelo que
 * vaya a alguna parte.
 *
 * Y en un circuito de toques y despegues no se dice, que es lo correcto: ahí
 * el cinturón no se suelta nadie.
 */
export const ARRIBA_DEL_TODO = 400;

/**
 * Y cuánto puede estar subiendo para considerarse asentado, en m/s.
 *
 * Dos y medio, que son unos quinientos pies por minuto: por encima de eso el
 * avión sigue subiendo de verdad y el cartel no se apaga. Es la misma banda
 * muerta que usa el variómetro para decidir si la altitud se mueve.
 */
export const YA_NO_SUBE = 2.5;

/** Lo que la megafonía mira del vuelo para saber si le toca hablar. */
export interface Momento {
  readonly fase: Fase;
  /** Si este avión lleva pasaje. Ver `conPasaje`. */
  readonly conPasaje: boolean;
  /** Si la instructora está diciendo algo ahora mismo. */
  readonly instructorHablando: boolean;
  /** A qué altura se va sobre el aeródromo, en metros. */
  readonly sobreElCampo: number;
  /** Y cuánto se sube o se baja, en metros por segundo. */
  readonly vertical: number;
}

/**
 * Si este anuncio, además de su fase, pide condiciones.
 *
 * Solo el del cinturón las pide, y por eso está escrito como una excepción y
 * no como una tabla: lo demás sí es cosa de la fase. Ver `ARRIBA_DEL_TODO`.
 */
function seDanLasCondiciones(anuncio: Anuncio, m: Momento): boolean {
  if (anuncio !== "comandante.crucero") return true;
  return m.sobreElCampo >= ARRIBA_DEL_TODO && Math.abs(m.vertical) < YA_NO_SUBE;
}

export class Megafonia {
  /** Lo ya dicho en este vuelo: cada anuncio se dice una vez. */
  private readonly dichos = new Set<Anuncio>();
  /** En qué fase se está y cuánto lleva. */
  private fase: Fase | null = null;
  private desde = 0;
  /** Desde cuándo cada anuncio cumple sus condiciones. Ver `paso`. */
  private readonly listoDesde = new Map<Anuncio, number>();

  /** Vuelo nuevo: se olvida de todo. */
  reiniciar(): void {
    this.dichos.clear();
    this.listoDesde.clear();
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
    if (!m.conPasaje) return null;
    for (const anuncio of ANUNCIOS) {
      if (this.dichos.has(anuncio)) continue;
      if (CUANDO[anuncio] !== m.fase) continue;
      if (!seDanLasCondiciones(anuncio, m)) continue;
      /*
       * **Y la ventana se cuenta desde que se puede decir, no desde la fase.**
       *
       * El del cinturón pide altura y calma, y eso llega cuando llega: medido
       * desde el cambio de fase, los veinticinco segundos se agotaban durante
       * la subida y el anuncio no salía nunca. Un anuncio con condiciones
       * tiene su propio reloj, que arranca el día que las cumple.
       *
       * Y el reloj se pone en marcha **aunque la instructora esté hablando**:
       * el momento pasa igual. Si no se pudo decir mientras duraba, es que ya
       * no venía a cuento — que es justo lo que este módulo prometía y lo que
       * se rompía apuntando la hora solo cuando había silencio.
       */
      const listo = this.listoDesde.get(anuncio) ?? this.desde;
      this.listoDesde.set(anuncio, listo);
      if (m.instructorHablando) return null;
      const espera = this.desde - listo;
      if (espera < ESPERA || espera > ESPERA + SE_PASA) continue;
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
