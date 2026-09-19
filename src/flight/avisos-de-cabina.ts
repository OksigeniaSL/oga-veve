/**
 * Las señales luminosas: el panel de avisos de la cabina.
 *
 * ## Qué es esto y por qué no sobra
 *
 * El juego ya avisa de todo lo que pasa: una tarjeta con su dibujo, una voz
 * que lo dice y, arriba del todo, el canto en inglés de cabina. Y aun así
 * faltaba algo, porque **una tarjeta cuenta un suceso y una luz cuenta un
 * estado**. La tarjeta dice «sacá el tren» una vez y se va; la luz de tren
 * inseguro se queda encendida mientras el tren siga fuera de sitio. Son dos
 * cosas distintas y las dos existen en cualquier cabina del mundo, por el
 * mismo motivo por el que existen aquí: se puede mirar tarde.
 *
 * Pedido con el resto del cuadro: «los cuadros de mandos de un avión tienen
 * radares, señales luminosas y botones, funciones que pueden ser útiles para
 * el aprendizaje».
 *
 * ## Los dos escalones, que son los de verdad
 *
 * Un avión no tiene «avisos»: tiene **precaución** y **aviso**, y la
 * diferencia es el tiempo que tenés.
 *
 * - **Precaución**, en ámbar: mirá esto, no ahora mismo. Una puerta, una
 *   bomba, el piloto automático que se soltó.
 * - **Aviso**, en rojo: ahora. Pérdida, terreno, sobrevelocidad.
 *
 * Esa diferencia es la lección entera y se aprende sola con el color, sin
 * leer. Por eso es lo primero que se decide aquí y no un adorno del final.
 *
 * ## Y la palabra sube con la escalera
 *
 * La luz está en los cuatro peldaños: es dibujo y color, que es el canal que
 * nunca se cierra. Lo que cambia es lo que lleva escrito encima —nada, una
 * palabra en casa, o la palabra de cabina en inglés aeronáutico— y eso lo
 * decide `escalera.ts`, no este módulo. Aquí se dice **qué está encendido**.
 *
 * ## Lo que no hace
 *
 * No inventa estados. Cada luz cuelga de algo que el juego ya sabe y ya dice
 * por otros canales: si algún día hay una luz sin nada detrás, será una luz
 * que miente. Y no hay luz de combustible porque este juego todavía no tiene
 * combustible — una luz apagada para siempre enseñaría que ese aviso no existe.
 */

/** Los dos escalones de un panel de avisos de verdad. */
export type Grado = "precaucion" | "aviso";

/** Cada luz, con lo que hace falta para pintarla y para nombrarla. */
export interface Luz {
  readonly id: string;
  readonly grado: Grado;
  /** La palabra de cabina, en inglés aeronáutico. No se traduce jamás. */
  readonly cabina: string;
  /** Y la clave de la palabra en casa, para los peldaños que la usan. */
  readonly clave: string;
}

/**
 * Todas las luces que este panel puede encender, en el orden en que se leen.
 *
 * El orden importa y es el de un panel real: **primero lo que mata**. Quien
 * mira de reojo tiene que encontrarse antes con «terreno» que con «piloto
 * automático desconectado», y eso se decide aquí y no con el orden en el que
 * se le ocurrieron a nadie.
 */
export const LUCES: readonly Luz[] = [
  {
    id: "terreno",
    grado: "aviso",
    cabina: "TERRAIN",
    clave: "luz.terreno",
  },
  {
    id: "perdida",
    grado: "aviso",
    cabina: "STALL",
    clave: "luz.perdida",
  },
  {
    id: "rapido",
    grado: "aviso",
    cabina: "OVERSPEED",
    clave: "luz.rapido",
  },
  {
    id: "tren",
    grado: "aviso",
    cabina: "GEAR",
    clave: "luz.tren",
  },
  {
    id: "frustrada",
    grado: "precaucion",
    cabina: "GO AROUND",
    clave: "luz.frustrada",
  },
  {
    id: "piloto",
    grado: "precaucion",
    cabina: "A/P OFF",
    clave: "luz.piloto",
  },
  {
    id: "freno",
    grado: "precaucion",
    cabina: "PARK BRK",
    clave: "luz.freno",
  },
];

/** Lo que el panel necesita saber del vuelo. Todo sale de algo que ya existe. */
export interface Estado {
  /** El aviso de terreno está sonando. Ver `aviso-de-terreno.ts`. */
  readonly terreno: boolean;
  /** El ala ya no sustenta. Ver `stalled` en el modelo de vuelo. */
  readonly perdida: boolean;
  /** Se pasa de su tope, el del avión o el de lo que lleva sacado. */
  readonly rapido: boolean;
  /**
   * El tren no está donde tendría que estar: fuera en aproximación, o dentro
   * con el avión bajo y lento. Ver `tren.ts`.
   */
  readonly trenMal: boolean;
  /** La torre mandó irse al aire y todavía no se ha obedecido. */
  readonly frustrada: boolean;
  /** El piloto automático acaba de soltarse. Ver `piloto-automatico.ts`. */
  readonly pilotoSuelto: boolean;
  /** El freno de estacionamiento, puesto con el avión queriendo moverse. */
  readonly frenoPuesto: boolean;
}

/**
 * Qué luces están encendidas ahora, en orden de importancia.
 *
 * Devuelve la lista, no un booleano: un panel con dos luces encendidas cuenta
 * algo distinto que uno con una, y esconder la segunda detrás de la primera
 * es lo que hace que alguien arregle lo que no era.
 */
export function encendidas(e: Estado): readonly Luz[] {
  const puesto: Record<string, boolean> = {
    terreno: e.terreno,
    perdida: e.perdida,
    rapido: e.rapido,
    tren: e.trenMal,
    frustrada: e.frustrada,
    piloto: e.pilotoSuelto,
    freno: e.frenoPuesto,
  };
  return LUCES.filter((l) => puesto[l.id]);
}

/**
 * El escalón más alto que hay encendido, o `null` si no hay nada.
 *
 * Es lo que enciende el maestro —ese botón grande que en una cabina de verdad
 * se pulsa para reconocer el aviso—: no dice **qué** pasa, dice **de qué
 * gravedad** es lo que pasa, y con eso basta para saber si hay que soltar lo
 * que estés haciendo.
 */
export function elMaestro(e: Estado): Grado | null {
  const luces = encendidas(e);
  if (luces.some((l) => l.grado === "aviso")) return "aviso";
  return luces.length > 0 ? "precaucion" : null;
}
