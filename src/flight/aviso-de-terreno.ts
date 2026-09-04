/**
 * *Terrain, pull up*: el aviso de que el suelo viene a buscarte.
 *
 * Es el aviso que salva más vidas de toda la aviación, y hasta hoy este juego
 * no lo tenía. Se hicieron maniobras malas a propósito para ver si decía algo
 * —volar bajísimo sobre un pueblo, pasar rozando un edificio— y la pantalla se
 * quedó callada: «hice maniobras mal hechas a ver si me avisaba, y nada».
 *
 * El propio código lo tenía escrito como advertencia y sin cumplir: «un panel
 * bonito que esconde un *terrain, pull up* es peor que no tener panel».
 *
 * ## Cuándo avisa, y cuándo se calla
 *
 * Volar bajo no es malo: se vuela bajo para aterrizar, y se vuela bajo para
 * seguir un río, que es una de las lecciones de este juego. Lo malo es volar
 * bajo **donde no toca** o **bajando cuando ya no queda sitio**.
 *
 * Así que hay dos avisos y no uno, como en un avión de verdad:
 *
 * - **`bajo`** — vas cerca del suelo fuera de una aproximación. Es un aviso de
 *   atención: mira dónde estás.
 * - **`sube`** — además estás bajando. Ese es el que no admite discusión, y es
 *   el que dice *pull up*.
 *
 * Y se calla en tres sitios, porque si no sería ruido: en el suelo, en la
 * aproximación final —ahí estar bajo y bajando es exactamente lo que toca— y
 * subiendo, porque quien sube ya está resolviendo el problema.
 */

/** Por debajo de esta altura sobre el suelo hay que mirar dónde se está, m. */
const ATENCION = 120;

/** Y por debajo de esta, bajando, ya no hay conversación posible, m. */
const URGENTE = 60;

/** Bajando de verdad, m/s. Un descenso suave no dispara nada. */
const BAJANDO = -1.5;

/**
 * Por debajo de esto no se avisa de nada, m.
 *
 * **Porque a esa altura ya no hay aviso que dar.** El primer intento se
 * callaba solo con `enElSuelo`, y en la carrera de aterrizaje el contacto
 * parpadea —las ruedas botan, el suelo se pierde por veinte centímetros— así
 * que el avión salía «en el aire» a un metro del asfalto y bajando: «en pista,
 * ya aterrizado, me advierte que voy a chocar».
 *
 * Un radioaltímetro de verdad inhibe estos avisos por debajo de treinta pies
 * por el mismo motivo. Quince metros aquí.
 */
const YA_ES_TARDE = 15;

export type AvisoDeTerreno = "bajo" | "sube" | null;

export interface Cerca {
  /** Metros sobre el terreno, no sobre el mar. */
  readonly sobreElSuelo: number;
  readonly vertical: number;
  readonly enElSuelo: boolean;
  /**
   * Si esto es una aproximación en regla a la pista.
   *
   * Lo dice la máquina de fases, que es quien sabe: alineado, por delante del
   * umbral y bajando. Ahí estar bajo **es** el objetivo y avisar sería
   * enseñar lo contrario.
   */
  readonly enFinal: boolean;
}

/** Qué hay que decir, o `null` si no hay nada que decir. */
export function avisoDeTerreno(s: Cerca): AvisoDeTerreno {
  if (s.enElSuelo || s.enFinal) return null;
  if (s.sobreElSuelo > ATENCION || s.sobreElSuelo < YA_ES_TARDE) return null;
  // Subiendo no se avisa: quien sube ya está haciendo lo que había que hacer.
  if (s.vertical >= 0) return null;
  if (s.sobreElSuelo < URGENTE && s.vertical < BAJANDO) return "sube";
  return s.vertical < BAJANDO ? "sube" : "bajo";
}
