/**
 * La carta de la pantalla de navegación: del mundo al cristal.
 *
 * Hasta hoy esa pantalla era **una brújula sobre un fondo vacío**. Giraba, y
 * ya: dos arcos de puntos que no medían nada, una raya magenta apuntando al
 * aeródromo y una cifra de millas. Eso no es una pantalla de navegación, es
 * una rosa de rumbos grande — y lo que se pidió jugando fue exactamente esto:
 * «¿por qué no tengo datos como distancia al aeropuerto, información en el
 * cuadro de mandos en aviones complejos?».
 *
 * Aquí está la cuenta que faltaba: **dónde cae cada cosa del mundo en el
 * cristal**. Con eso se puede dibujar la pista donde está y con su forma, el
 * eje por el que se entra, los otros aviones que se oyen por la radio y los
 * anillos de distancia con su cifra.
 *
 * ## Con el morro arriba, que es como se lee una carta en vuelo
 *
 * Nada de norte arriba: la pantalla gira con el avión y lo que uno tiene
 * delante está arriba. Es lo que hace que un niño de cuatro años pueda usarla
 * sin que nadie se lo explique — la pista aparece a la derecha del cristal
 * cuando la pista está a su derecha de verdad. Ver `enLaCarta`.
 *
 * ## Y el rango se elige solo
 *
 * Una carta con un rango fijo es una carta que la mitad del vuelo no enseña
 * nada: o la pista está fuera, o está tan pegada al centro que no se ve su
 * forma. Se coge el menor de los rangos de siempre en el que quepa lo que hay
 * que ver. Es lo que hace un piloto con el mando del rango, y aquí no hay
 * mando que tocar porque no se lee.
 */

import { hastaElUmbralDeToma } from "../world/umbral-desplazado";
import type { Clase } from "../flight/tcas";
import { colorDelRelieve, type ColorDelRelieve } from "../flight/terreno-delante";

/** Una milla náutica, en metros. La unidad de distancia del aire. */
export const MILLA = 1852;

/**
 * Los rangos de la carta, en millas náuticas.
 *
 * Los de un avión de verdad. Empiezan en dos y no en uno porque por debajo de
 * dos millas ya se está viendo la pista por la ventana, y acaban en cuarenta
 * porque más lejos que eso el aeródromo no es un sitio: es una dirección.
 */
export const RANGOS = [2, 5, 10, 20, 40] as const;

/**
 * Qué rango hace falta para que algo a `millas` quepa en la carta.
 *
 * Cabe con holgura —a cuatro quintos del radio— para que lo que se persigue no
 * vaya pegado al canto del cristal, que es donde no se ve.
 */
export function rangoPara(millas: number): number {
  for (const r of RANGOS) if (millas <= r * 0.8) return r;
  return RANGOS[RANGOS.length - 1]!;
}

/**
 * **El rango que eligió la carta y por qué**, para elegir el siguiente con
 * memoria. Ver `rangoConMemoria`.
 */
export interface RangoElegido {
  readonly rango: number;
  /**
   * Lo que se estaba mirando: el punto del plan al que se iba
   * —«fijo:3»—, la pista en el aire o la pista en tierra.
   */
  readonly clave: string;
}

/**
 * **El rango, con memoria: no se cierra mientras se va hacia lo que se mira.**
 *
 * Elegido sin memoria, el rango se cerraba cada vez que el punto siguiente
 * pasaba de los cuatro quintos del rango de abajo: el punto bajaba por la
 * pantalla hacia el avión y, de golpe, volvía a salir arriba, otra vez a la
 * misma distancia del avión en el cristal. Enrique, bajando a Gando: «esa
 * marca, es la cuarta vez que aparece más adelante… cuando estoy llegando,
 * se recoloca el radar y me pone el símbolo otra vez más adelante». Es la
 * zanahoria delante del burro: una carta que nunca deja ver que se llega.
 *
 * Un piloto no toca el mando del rango mientras va hacia un punto: lo deja
 * bajar por la pantalla hasta él. Así que:
 *
 * - **Se abre** siempre que haga falta para que quepa lo que se mira.
 * - **Se cierra** solo **al pasar el punto** —el siguiente se mira de cero— o
 *   **cuando el que viene detrás ya cabe** en el rango de abajo: entonces se
 *   cierra para ver los dos, el punto y el giro que sigue.
 * - **Con la pista**, en el aire, se cierra cuando la pista cabe en la mitad
 *   del rango de abajo, no en sus cuatro quintos: el salto es uno, y pequeño.
 * - **En tierra, sin memoria**, como siempre: ahí se mira la pista y lo que
 *   rueda alrededor.
 */
export function rangoConMemoria(
  m: Mapa | null,
  antes: RangoElegido | null,
  enTierra: boolean,
): RangoElegido {
  if (!m) return { rango: RANGOS[1]!, clave: "nada" };
  const ruta = m.ruta;
  const siguiente = ruta?.abreElRango ? ruta.fijos[ruta.activo] : undefined;
  const despues = siguiente ? ruta?.fijos[ruta.activo + 1] : undefined;
  let lejos = siguiente
    ? millasHasta(siguiente, m)
    : m.pista
      ? millasHasta(m.pista, m)
      : RANGOS[1]!;
  for (const o of m.otros) if (o.abreElRango) lejos = Math.max(lejos, millasHasta(o, m));
  const hace = rangoPara(lejos);
  const clave = enTierra ? "tierra" : siguiente ? `fijo:${ruta!.activo}` : "pista";
  if (enTierra || !antes || antes.clave !== clave || hace > antes.rango)
    return { rango: hace, clave };
  if (siguiente) {
    // Se cierra para ver los dos, el punto y el que viene detrás.
    const ambos = despues ? rangoPara(Math.max(lejos, millasHasta(despues, m))) : antes.rango;
    return { rango: Math.min(antes.rango, ambos), clave };
  }
  const abajo = RANGOS[RANGOS.indexOf(antes.rango as (typeof RANGOS)[number]) - 1];
  return { rango: abajo !== undefined && lejos <= abajo * 0.5 ? abajo : antes.rango, clave };
}

/** Un punto del mundo, en metros. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/**
 * Dónde cae un punto del mundo en el cristal, en píxeles desde el avión.
 *
 * `rumbo` es hacia dónde mira el avión, en grados; la carta gira con él. `por`
 * es cuántos píxeles mide un metro. Devuelve `dx` a la derecha y `dy` **hacia
 * abajo**, que es como crece la pantalla: lo que está delante sale con `dy`
 * negativo, o sea arriba.
 *
 * La cuenta es un giro y nada más, pero escrita a mano sale del revés una vez
 * de cada dos —es el mismo cepo que `rumbo.ts` documenta para los ejes de la
 * pista— y aquí se paga caro: una pista dibujada en el lado contrario enseña a
 * girar hacia donde no es.
 */
export function enLaCarta(
  p: Punto,
  yo: Punto,
  rumbo: number,
  por: number,
): { dx: number; dy: number } {
  // Norte es −Z y este es +X: es el mundo del juego, no una convención nueva.
  const norte = -(p.z - yo.z);
  const este = p.x - yo.x;
  const h = (rumbo * Math.PI) / 180;
  const cos = Math.cos(h);
  const sen = Math.sin(h);
  // Girar el mundo **al revés** que el avión: si el avión mira al este, lo que
  // está al este tiene que salir arriba.
  return {
    dx: (este * cos - norte * sen) * por,
    dy: -(norte * cos + este * sen) * por,
  };
}

/** Cuántos píxeles mide un metro con este rango y este radio de rosa. */
export function pixelesPorMetro(rangoEnMillas: number, radio: number): number {
  return radio / (rangoEnMillas * MILLA);
}

/**
 * A cuántas millas está un punto.
 *
 * Existe para que la cifra que se escribe y el rango que se elige salgan de la
 * misma cuenta: **dos fuentes para una misma distancia** es cómo se llega a
 * una carta que dice «4,0 NM» con el aeródromo fuera del cristal.
 */
export function millasHasta(p: Punto, yo: Punto): number {
  return Math.hypot(p.x - yo.x, p.z - yo.z) / MILLA;
}

/**
 * Los dos extremos de una pista, en el mundo.
 *
 * La pista se guarda por su centro, su rumbo y su largo —ver `Pista`— y lo que
 * se dibuja son sus dos cabeceras. Con esto la carta enseña **su forma y su
 * orientación de verdad**, que es lo que convierte un punto en una pista: se
 * ve si está cruzada, y por dónde hay que entrar.
 */
export function extremosDePista(pista: {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly length: number;
}): [Punto, Punto] {
  const h = (pista.heading * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const medio = pista.length / 2;
  return [
    { x: pista.x - fx * medio, z: pista.z - fz * medio },
    { x: pista.x + fx * medio, z: pista.z + fz * medio },
  ];
}

/**
 * El mundo que necesita una carta para dibujarse.
 *
 * Vive aquí y no en una de las dos superficies porque **las dos la dibujan**:
 * el cuadro plano en SVG y las pantallas de la cabina en lienzo. Declarada en
 * una de ellas, la otra acababa con su propia copia — y de ahí a que digan
 * cosas distintas hay un commit.
 */
export interface Mapa {
  /** Dónde estoy, en metros del mundo. */
  readonly x: number;
  readonly z: number;
  /**
   * La pista del campo que se tiene debajo, con su sitio, su largo y **el
   * rumbo de la cabecera en uso**, que es el que elige el viento. Ver
   * `world/campo-del-vuelo.ts`.
   */
  readonly pista: {
    readonly x: number;
    readonly z: number;
    readonly heading: number;
    readonly length: number;
    /** Asfalto antes del umbral de aterrizaje en uso, m. */
    readonly desplazado?: number;
  } | null;
  /**
   * Y los otros aviones, **los que ve el TCAS**. Ver `flight/tcas.ts`.
   *
   * Antes salían todos los que andaban por el mundo, a cualquier altura y
   * todos con el mismo rombo. Una pantalla de navegación de verdad no sabe de
   * nadie por su cuenta: el tráfico que pinta es el que le pasa el TCAS, con
   * el símbolo de lo que es cada uno. En un avión sin TCAS esto va vacío.
   */
  readonly otros: readonly Otro[];

  /**
   * **Lo que la pantalla escribe del modo del TCAS**: «TCAS STBY» en espera,
   * «TA ONLY» trabajando sin maniobras, y la banda si no es la normal. `null`
   * si no hay nada que escribir. Ver `modoEnPantalla` en `flight/tcas.ts`.
   */
  readonly modoTcas?: string | null;

  /**
   * El aeropuerto al que se va, si esta ruta lleva a otro.
   *
   * Pedido jugando, y es lo que convierte la rosa en una carta de navegación:
   * «si salgo de un aeropuerto y me estoy acercando a otro, estaría bien que
   * se fuera mostrando también en el cuadro». Es lo que hace cualquier
   * navegador de verdad, y es la primera lección de navegación que este juego
   * puede dar: **poner rumbo a algo que todavía no se ve**.
   */
  readonly destino?: {
    readonly x: number;
    readonly z: number;
    /** Su indicativo, para rotularlo. Ver `oaciDe`. */
    readonly oaci?: string | null;
  } | null;

  /**
   * Y el alternativo: a dónde se iría si al destino no se pudiera llegar.
   *
   * Se dibuja con el mismo símbolo de aeródromo pero en otro color y rotulado
   * con su indicativo, que es como va en una carta de verdad: el plan B
   * también es un sitio, y se sabe dónde está antes de necesitarlo. Ver
   * `flight/alterno.ts`.
   */
  readonly alterno?: {
    readonly x: number;
    readonly z: number;
    readonly oaci?: string | null;
  } | null;

  /**
   * Las células de tormenta, si el tiempo las trae. Ver `flight/tormentas.ts`.
   *
   * Van en el mapa y no en una capa aparte por lo mismo que todo lo demás de
   * este fichero: **dónde** va cada cosa se decide una vez. Un radar que pinta
   * la tormenta en un sitio distinto del que la pinta la otra pantalla enseña
   * a no creerle a ninguna de las dos.
   */
  readonly celdas?: readonly {
    readonly x: number;
    readonly z: number;
    readonly radio: number;
    readonly fuerza: number;
  }[];

  /**
   * **El relieve que pinta el avisador de terreno**, en el avión que lo lleva:
   * verde, ámbar y rojo según lo que esté por debajo o por encima del avión.
   * Ver `colorDelRelieve` en `flight/terreno-delante.ts` y `relieveEnLaCarta`.
   *
   * Llegando a La Palma por la final recta de la 18, la pantalla de
   * navegación estaba en blanco con la ladera de Barlovento delante: en un
   * avión de verdad esa ladera sale en ámbar y en rojo antes de verla por la
   * ventana. En los que no llevan el equipo, nada.
   */
  readonly relieve?: RelieveDeLaCarta | null;

  /**
   * **El plan de vuelo**, si se va a otro campo: sus puntos, a cuál se va y
   * dónde se empieza a bajar. Ver `flight/ruta.ts`.
   *
   * Es la línea magenta de una pantalla de navegación de verdad, que no es
   * una recta al destino: va de punto en punto, con sus giros, y acaba en el
   * eje de la pista. «El mapa pone una línea recta, pero para tomar la pista
   * recto y estable tengo que abrirme, para eso existen los planes de vuelo.»
   */
  readonly ruta?: RutaDeLaCarta | null;

  /**
   * **El rango ya elegido, con su memoria**, si quien pide la carta la
   * lleva: lo pide cada fotograma en las dos superficies, y la memoria es
   * del vuelo, no de cada una. Sin él, se elige aquí sin memoria. Ver
   * `rangoConMemoria`.
   */
  readonly rango?: number;
}

/** El plan de vuelo como lo necesita la carta. Ver `Mapa.ruta`. */
export interface RutaDeLaCarta {
  readonly fijos: readonly {
    readonly x: number;
    readonly z: number;
    readonly nombre: string;
    readonly papel: string;
  }[];
  /** El índice del punto al que se va. */
  readonly activo: number;
  /** Dónde se empieza a bajar, si cae por delante. */
  readonly descenso: Punto | null;
  /**
   * Dónde se acaba de subir, el «T/C», si cae por delante. Ver
   * `Progreso.puntoDeSubida` en `flight/ruta.ts`.
   */
  readonly subida?: Punto | null;
  /**
   * **El nivel del plan**, en pies: lo que dice el plan que hay que subir.
   * `null` si no hay. Ver `cruceroDelPlan`.
   */
  readonly crucero?: number | null;
  /** Lo que falta por la ruta hasta el umbral, m. */
  readonly restante: number;
  /**
   * La hora de llegada al punto siguiente como la escribe una pantalla de
   * navegación, «1432.5z», o `null` si no se sabe (parado).
   */
  readonly hora: string | null;
  /**
   * Si la carta abre el rango hasta el punto siguiente. Volando por la ruta,
   * sí: lo que hay que ver es a dónde se va. En tierra, no: ahí se mira la
   * pista. Ver `dibujarLaCarta`.
   */
  readonly abreElRango: boolean;
  /**
   * **La cota del umbral de llegada**, m, o `null` si no se sabe.
   *
   * Enrique la buscaba para calcular la aproximación, y no estaba en ninguna
   * parte. En una carta de aproximación de verdad va junto a la pista —«THR
   * ELEV», la cota del umbral— porque es la referencia de todo lo que se
   * hace al final: lo que marca el altímetro menos la cota es lo alto que se
   * va sobre la pista, y los mínimos se ponen sumándole la altura de
   * decisión. Se escribe junto al punto del umbral, el «RW19» del plan. Ver
   * `cotaEscrita`.
   */
  readonly cotaDelUmbral?: number | null;
}

/** Un pie, en metros. */
const PIE = 0.3048;

/**
 * **La cota como se escribe en una carta**: «ELEV 108 FT», en pies, que es
 * como vienen en las cartas de verdad —las de ENAIRE y las de la DINAC— y como
 * marca el altímetro de la pantalla de vuelo. Lo usan la carta y el plano.
 */
export function cotaEscrita(metros: number): string {
  return `ELEV ${Math.round(metros / PIE)} FT`;
}

/** Un tráfico, con lo que el TCAS dice de él. */
export interface Otro {
  readonly x: number;
  readonly z: number;
  /** Otro, cerca o con aviso. Ver `Clase` en `flight/tcas.ts`. */
  readonly clase: Clase;
  /** Su altura menos la mía, m. */
  readonly relativa: number;
  /** Sube (1), baja (−1) o ninguna de las dos a más de 500 ft/min. */
  readonly tendencia: -1 | 0 | 1;
  /**
   * **Si la carta tiene que abrirse hasta que quepa.**
   *
   * El rango se elige solo —es la mano del piloto en el mando del rango— y
   * hasta hoy solo miraba la pista. Parado en el punto de espera la pista
   * cabe en dos millas, y el que viene a aterrizar a cinco millas quedaba
   * fuera: «incluso en el radar» tendría que verse, y no se veía. Un piloto
   * ahí abre el rango para mirar la aproximación, y un tráfico con aviso se
   * mira siempre. Lo decide quien sabe la fase; ver `Game.elMapa`.
   */
  readonly abreElRango?: boolean;
}

/** Un tráfico puesto en la carta. */
export interface OtroEnLaCarta {
  readonly dx: number;
  readonly dy: number;
  readonly clase: Clase;
  /**
   * La altura relativa como la escribe un TCAS: centenas de pies con su
   * signo, «+05», «-12». `null` cuando no se escribe, que es cuando va pegado
   * al borde.
   */
  readonly etiqueta: string | null;
  /** Si la etiqueta va encima del símbolo (está más alto) o debajo. */
  readonly encima: boolean;
  readonly tendencia: -1 | 0 | 1;
  /**
   * Si está fuera del rango y va pegado al borde.
   *
   * Solo pasa con los que tienen aviso, que son los que no pueden dejar de
   * verse: el TCAS pinta **medio símbolo** en el canto de la pantalla, en su
   * marcación, hasta que el piloto abre el rango o el tráfico entra. El medio
   * sale solo, porque la carta se recorta al círculo y el símbolo va
   * centrado justo en el canto.
   */
  readonly alBorde: boolean;
}

/**
 * La altura relativa en centenas de pies, con su signo.
 *
 * Dos cifras siempre, que es lo que cabe en la etiqueta de un TCAS: +05 son
 * quinientos pies por encima, -12 mil doscientos por debajo. El menos es el
 * guion de siempre y no el signo tipográfico, porque así cuenta como cifra y
 * sale desde el primer peldaño como las demás de la carta. Ver `esCifra` en
 * `familia.ts`.
 */
export function etiquetaDeAltura(relativaMetros: number): string {
  const cientos = Math.min(99, Math.round(Math.abs(relativaMetros) / 0.3048 / 100));
  if (cientos === 0) return "00";
  return `${relativaMetros > 0 ? "+" : "-"}${String(cientos).padStart(2, "0")}`;
}

/** Qué se pinta antes cuando no caben todos: primero lo que avisa. */
const ORDEN: Record<Clase, number> = { aviso: 0, cerca: 1, otro: 2 };

/**
 * Lo que hay que dibujar en la carta, ya resuelto en píxeles.
 *
 * Una sola cuenta para las dos superficies: el SVG mueve atributos y el lienzo
 * pinta trazos, pero **dónde** va cada cosa se decide aquí. Es lo que impide
 * que la cabina enseñe la pista a la izquierda y el cuadro plano a la derecha.
 */
export interface Dibujo {
  readonly rango: number;
  /** Las dos cabeceras, en píxeles desde el centro de la rosa. */
  readonly pista:
    readonly [{ dx: number; dy: number }, { dx: number; dy: number }] | null;
  /** El eje de entrada: del umbral por el que se entra, hacia quien viene. */
  readonly eje: {
    desde: { dx: number; dy: number };
    hasta: { dx: number; dy: number };
  } | null;
  /**
   * Los tráficos que se pintan, **ya ordenados**: primero los que avisan,
   * luego los cercanos y luego el resto, cada grupo del más cercano al más
   * lejano. Así, si una superficie tiene sitio para menos de los que hay, se
   * queda sin los que menos importan. Y solo los que caen dentro del disco,
   * más los que avisan, que se pegan al borde.
   */
  readonly otros: readonly OtroEnLaCarta[];

  /** Lo que se escribe del modo del TCAS, o `null`. Ver `Mapa.modoTcas`. */
  readonly modoTcas: string | null;

  /**
   * El aeropuerto de destino, con las millas que faltan.
   *
   * Las millas van aquí y no se recalculan en cada superficie porque si no
   * acabarían siendo dos números distintos en la misma pantalla, que es
   * exactamente lo que este fichero existe para impedir.
   *
   * `dentro` dice si cae en el disco de la rosa. Cuando no cae —al principio
   * del vuelo, con el destino a treinta millas y la carta a diez— lo que se
   * enseña es una flecha en el borde, que es lo que hace un navegador de
   * verdad: el sitio no se ve todavía, pero se sabe por dónde cae.
   */
  readonly destino: EnLaCarta | null;

  /** El alternativo, resuelto igual que el destino. */
  readonly alterno: EnLaCarta | null;

  /**
   * Las células, ya en píxeles desde el centro de la rosa y con su radio.
   *
   * Se dan **todas**, incluidas las que caen fuera del disco: recortar aquí
   * dejaría media tormenta sin pintar al borde de la carta, que es justo
   * cuando hay que verla — se está llegando a ella.
   */
  readonly celdas: readonly {
    dx: number;
    dy: number;
    radio: number;
    fuerza: number;
  }[];

  /** El relieve, en celdas cuadradas del cristal. Ver `relieveEnLaCarta`. */
  readonly relieve: readonly CeldaDeRelieve[];

  /**
   * El plan en píxeles: la línea magenta del punto de donde se viene al que
   * se va y de ahí hasta el umbral, cada punto con su nombre, y el círculo
   * del punto de descenso. Se dan todos, también los de fuera del disco: la
   * línea tiene que salir por el borde hacia donde sigue, y el recorte lo
   * pone cada superficie.
   */
  readonly ruta: {
    readonly linea: readonly { dx: number; dy: number }[];
    readonly fijos: readonly {
      dx: number;
      dy: number;
      nombre: string;
      activo: boolean;
      /**
       * **Y en el umbral, su cota** como va en una carta: «ELEV 108 FT».
       * `null` en los demás puntos. Ver `RutaDeLaCarta.cotaDelUmbral`.
       */
      cota: string | null;
    }[];
    readonly descenso: { dx: number; dy: number } | null;
    /** Y el de subida, el T/C. */
    readonly subida: { dx: number; dy: number } | null;
    /** El nivel del plan, pies, o `null`. */
    readonly crucero: number | null;
    /** El punto al que se va, con sus millas: lo de arriba a la derecha. */
    readonly siguiente: { nombre: string; millas: number } | null;
    readonly hora: string | null;
    /**
     * **Lo que falta del tramo**, de 1 al salir del punto de antes a 0 al
     * llegar al siguiente, o `null` si no hay tramo. Es la barra que dice sin
     * leer que el punto se acerca: se vacía al llegar y se llena al pasarlo.
     * Ver `rangoConMemoria`, que es su otra mitad.
     */
    readonly falta: number | null;
  } | null;
}

/** Lo que hace falta para pintar el relieve. Ver `Mapa.relieve`. */
export interface RelieveDeLaCarta {
  /** La cota del relieve que conoce el juego, o `null` donde no se sabe. */
  readonly cota: (x: number, z: number) => number | null;
  /** La altitud del avión, m. */
  readonly altitud: number;
  /** Si lleva el tren fuera: el ámbar empieza más cerca. */
  readonly trenFuera: boolean;
}

/** Una celda del relieve en el cristal: su centro, su lado y su color. */
export interface CeldaDeRelieve {
  readonly dx: number;
  readonly dy: number;
  readonly lado: number;
  readonly color: ColorDelRelieve;
}

/**
 * **Con qué se pinta cada color del relieve**: el color de la cabina y su
 * opacidad. Las pantallas de verdad lo hacen con puntitos más o menos
 * apretados; aquí es la opacidad, que dice lo mismo a la escala de una
 * tablet. Ver `colorDelRelieve`.
 */
export const ASPECTO_DEL_RELIEVE: Readonly<
  Record<ColorDelRelieve, { readonly color: "limite" | "precaucion" | "normal"; readonly opacidad: number }>
> = {
  rojo: { color: "limite", opacidad: 0.55 },
  ambar: { color: "precaucion", opacidad: 0.5 },
  "ambar-flojo": { color: "precaucion", opacidad: 0.25 },
  verde: { color: "normal", opacidad: 0.42 },
  "verde-flojo": { color: "normal", opacidad: 0.18 },
};

/**
 * Cuántas celdas de relieve caben a lo ancho de la rosa.
 *
 * Veintiocho: con el rango en diez millas, celdas de unos 1.300 metros, que es
 * lo que deja ver la forma de una isla y de una ladera sin pagar más de
 * seiscientas catas; con el rango en dos, de 260.
 */
export const CELDAS_DEL_RELIEVE = 28;

/**
 * La última cuenta del relieve **de cada superficie**, por el radio de su
 * rosa: las dos lo piden cada fotograma y con radios distintos, y con una sola
 * cuenta guardada se la quitarían la una a la otra.
 */
const ultimoRelieve = new Map<number, { clave: string; celdas: readonly CeldaDeRelieve[] }>();

/**
 * Sin relieve, siempre la misma lista vacía: quien pinta compara la lista que
 * le llega con la que pintó, y una vacía nueva en cada fotograma le haría
 * borrar sesenta veces por segundo lo que ya estaba borrado.
 */
const SIN_RELIEVE: readonly CeldaDeRelieve[] = [];

/**
 * **El relieve en el cristal**, en celdas cuadradas con su color, o ninguna
 * si el avión no lleva con qué pintarlo.
 *
 * La rejilla es la del cristal, con el morro arriba, y cada celda cata el
 * relieve en su centro. El mar —cota cero— no se pinta, como en una pantalla
 * de verdad, que lo deja en negro.
 *
 * **Y no se rehace cada fotograma.** Lo piden las dos superficies sesenta
 * veces por segundo y el relieve no cambia tan deprisa: se guarda la última
 * cuenta y se rehace cuando el avión se ha movido media celda, ha girado un
 * grado, ha subido o bajado quince metros, o ha cambiado el rango.
 */
export function relieveEnLaCarta(
  m: Mapa,
  rumbo: number,
  por: number,
  r: number,
): readonly CeldaDeRelieve[] {
  const rel = m.relieve;
  if (!rel) return SIN_RELIEVE;
  const lado = (2 * r) / CELDAS_DEL_RELIEVE;
  const media = lado / por / 2;
  const clave = [
    Math.round(m.x / media),
    Math.round(m.z / media),
    Math.round(rumbo),
    Math.round(rel.altitud / 15),
    rel.trenFuera ? 1 : 0,
    por.toPrecision(6),
  ].join(",");
  const suya = Math.round(r);
  const guardada = ultimoRelieve.get(suya);
  if (guardada?.clave === clave) return guardada.celdas;
  const h = (rumbo * Math.PI) / 180;
  const cos = Math.cos(h);
  const sen = Math.sin(h);
  const celdas: CeldaDeRelieve[] = [];
  const dentro = (r + lado / 2) ** 2;
  for (let i = 0; i < CELDAS_DEL_RELIEVE; i++)
    for (let j = 0; j < CELDAS_DEL_RELIEVE; j++) {
      const dx = -r + (i + 0.5) * lado;
      const dy = -r + (j + 0.5) * lado;
      if (dx * dx + dy * dy > dentro) continue;
      // La cuenta de `enLaCarta`, al revés: del cristal al mundo.
      const a = dx / por;
      const b = -dy / por;
      const este = a * cos + b * sen;
      const norte = b * cos - a * sen;
      const c = rel.cota(m.x + este, m.z - norte);
      if (c === null || c < 1) continue;
      const color = colorDelRelieve(c - rel.altitud, rel.trenFuera);
      if (color) celdas.push({ dx, dy, lado, color });
    }
  if (ultimoRelieve.size > 4) ultimoRelieve.clear();
  ultimoRelieve.set(suya, { clave, celdas });
  return celdas;
}

/** Un aeródromo puesto en la carta: dentro del disco o pegado a su borde. */
export interface EnLaCarta {
  dx: number;
  dy: number;
  millas: number;
  dentro: boolean;
  /** Su indicativo OACI, para el rótulo; `null` si no tiene. */
  oaci: string | null;
}

/** Cuántas millas de final prolongado se dibujan. */
export const EJE_DE_ENTRADA = 8;

/**
 * Resuelve la carta: del mundo a píxeles desde el centro de la rosa.
 *
 * `rumbo` en grados **verdaderos**, que es en lo que está el mundo; la rosa va
 * en magnéticos y la diferencia entre las dos es la declinación, que es lo
 * correcto: una pista rotulada 07 cae bajo el 07 de la rosa.
 */
export function dibujarLaCarta(
  m: Mapa | null,
  rumbo: number,
  r: number,
): Dibujo {
  let lejos = m?.pista ? millasHasta(m.pista, m) : RANGOS[1]!;
  /*
   * **Y volando por el plan, hasta el punto siguiente**, que es lo que mira
   * un piloto al elegir el rango: a dónde va ahora. La pista de la que se
   * acaba de salir se queda atrás y no hay que verla.
   */
  const siguiente = m?.ruta?.fijos[m.ruta.activo];
  if (m?.ruta?.abreElRango && siguiente) lejos = millasHasta(siguiente, m);
  // Y lo que el piloto abriría el rango para ver. Ver `Otro.abreElRango`.
  for (const o of m?.otros ?? [])
    if (o.abreElRango) lejos = Math.max(lejos, millasHasta(o, m!));
  const rango = m?.rango ?? rangoPara(lejos);
  const por = pixelesPorMetro(rango, r);
  if (!m)
    return {
      rango,
      pista: null,
      eje: null,
      otros: [],
      modoTcas: null,
      destino: null,
      alterno: null,
      celdas: [],
      relieve: SIN_RELIEVE,
      ruta: null,
    };
  const aqui = (p: Punto) => enLaCarta(p, m, rumbo, por);
  let pista: Dibujo["pista"] = null;
  let eje: Dibujo["eje"] = null;
  if (m.pista) {
    const [a, b] = extremosDePista(m.pista);
    const pa = aqui(a);
    const pb = aqui(b);
    pista = [pa, pb];
    /*
     * **Por la cabecera en uso, que es la que dice el viento.**
     *
     * Salía de la cabecera **más cercana al avión**, y eso es decidir la
     * pista en uso por dónde se llega: volando a Fuerteventura desde
     * Lanzarote, la raya magenta metía por la 19, que es la punta que queda
     * al norte; al pasar por encima del aeropuerto la más cercana pasaba a
     * ser la del sur y la raya saltaba a la 01. «Ya sí me rectifica la
     * línea», y mientras tanto la torre, el PAPI, la aguja y la manga decían
     * la 01 desde el principio. Un aeropuerto de verdad no cambia de pista
     * porque se le pase por encima: la fijan el viento y la torre, y es una
     * para todos.
     *
     * Así que el eje sale del umbral de aterrizaje de la cabecera en uso
     * —con el desplazado, donde está la barra: es donde se toca y donde lleva
     * la senda— y se aleja por detrás de él, hacia donde hay que venir. Lo
     * que se dibuja es la misma pista que ya traía la carta, con su rumbo; no
     * hay una segunda cuenta de cuál es. Ver `world/campo-del-vuelo.ts`.
     */
    const h = (m.pista.heading * Math.PI) / 180;
    const fx = Math.sin(h);
    const fz = -Math.cos(h);
    const atras = hastaElUmbralDeToma(m.pista);
    const umbral = { x: m.pista.x - fx * atras, z: m.pista.z - fz * atras };
    const ocho = EJE_DE_ENTRADA * MILLA;
    eje = {
      desde: aqui(umbral),
      hasta: aqui({ x: umbral.x - fx * ocho, z: umbral.z - fz * ocho }),
    };
  }
  /*
   * **Y el destino, que puede caer fuera de la carta y aun así hay que verlo.**
   *
   * Al despegar de Tenerife Norte el otro aeropuerto está a veintinueve
   * millas y la carta enseña diez: dibujarlo sin más lo pondría en mitad del
   * negro, tres veces más lejos que el borde. Un navegador de verdad no lo
   * esconde ni miente con la distancia — lo pega al borde y sigue diciendo
   * cuántas millas faltan. Así se aprende lo que hay que aprender: que el
   * sitio está por ahí y todavía no se ve.
   */
  const alBorde = (
    sitio: { x: number; z: number; oaci?: string | null } | null | undefined,
  ): EnLaCarta | null => {
    if (!sitio) return null;
    const p = aqui(sitio);
    const d = Math.hypot(p.dx, p.dy);
    const dentro = d <= r;
    return {
      dx: dentro ? p.dx : (p.dx / (d || 1)) * r,
      dy: dentro ? p.dy : (p.dy / (d || 1)) * r,
      millas: millasHasta(sitio, m),
      dentro,
      oaci: sitio.oaci ?? null,
    };
  };
  const destinoSuelto = alBorde(m.destino);
  /*
   * Con plan, las millas del destino son **las que quedan por la ruta**, no
   * las de la recta: es lo que escribe un ordenador de vuelo, y lo que de
   * verdad hay que volar.
   */
  const destino =
    destinoSuelto && m.ruta
      ? { ...destinoSuelto, millas: m.ruta.restante / MILLA }
      : destinoSuelto;
  const alterno = alBorde(m.alterno);
  const celdas = (m.celdas ?? []).map((c) => {
    const p = aqui(c);
    return { dx: p.dx, dy: p.dy, radio: c.radio * por, fuerza: c.fuerza };
  });
  return {
    rango,
    pista,
    eje,
    otros: traficoEnLaCarta(m, aqui, r),
    modoTcas: m.modoTcas ?? null,
    destino,
    alterno,
    celdas,
    relieve: relieveEnLaCarta(m, rumbo, por, r),
    ruta: m.ruta ? rutaEnLaCarta(m.ruta, m, aqui) : null,
  };
}

/**
 * El plan, en píxeles. La línea empieza en el punto **de donde se viene**, no
 * en el avión: así es como la pinta una pantalla de navegación, y es lo que
 * enseña si uno va por el tramo o se ha ido a un lado.
 */
function rutaEnLaCarta(
  ruta: RutaDeLaCarta,
  yo: Punto,
  aqui: (p: Punto) => { dx: number; dy: number },
): NonNullable<Dibujo["ruta"]> {
  const desde = Math.max(0, ruta.activo - 1);
  const linea = ruta.fijos.slice(desde).map(aqui);
  const fijos = ruta.fijos
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) => i >= ruta.activo && f.papel !== "despegue" && f.papel !== "aqui")
    .map(({ f, i }) => ({
      ...aqui(f),
      nombre: f.nombre,
      activo: i === ruta.activo,
      cota:
        f.papel === "umbral" && ruta.cotaDelUmbral != null
          ? cotaEscrita(ruta.cotaDelUmbral)
          : null,
    }));
  const sig = ruta.fijos[ruta.activo];
  const antes = ruta.fijos[ruta.activo - 1];
  const tramo = sig && antes ? millasHasta(sig, antes) : 0;
  return {
    linea,
    fijos,
    descenso: ruta.descenso ? aqui(ruta.descenso) : null,
    subida: ruta.subida ? aqui(ruta.subida) : null,
    crucero: ruta.crucero ?? null,
    siguiente: sig ? { nombre: sig.nombre, millas: millasHasta(sig, yo) } : null,
    hora: ruta.hora,
    falta:
      sig && tramo > 0.05 && ruta.abreElRango
        ? Math.max(0, Math.min(1, millasHasta(sig, yo) / tramo))
        : null,
  };
}

/**
 * Los tráficos del TCAS, en píxeles y en el orden en que importan.
 *
 * Los que caen fuera del disco no se pintan —no se verían, y ocuparían el
 * sitio de uno que sí—, salvo los que tienen aviso, que se pegan al canto en
 * su marcación: medio círculo ámbar asomando es lo que enseña un TCAS de
 * verdad cuando el que avisa está más lejos que el rango. Ver
 * `OtroEnLaCarta.alBorde`.
 */
function traficoEnLaCarta(
  m: Mapa,
  aqui: (p: Punto) => { dx: number; dy: number },
  r: number,
): OtroEnLaCarta[] {
  const puestos: { d: number; o: OtroEnLaCarta }[] = [];
  for (const o of m.otros) {
    const p = aqui(o);
    const d = Math.hypot(p.dx, p.dy);
    const dentro = d <= r;
    if (!dentro && o.clase !== "aviso") continue;
    puestos.push({
      d,
      o: {
        dx: dentro ? p.dx : (p.dx / (d || 1)) * r,
        dy: dentro ? p.dy : (p.dy / (d || 1)) * r,
        clase: o.clase,
        etiqueta: dentro ? etiquetaDeAltura(o.relativa) : null,
        encima: o.relativa >= 0,
        tendencia: o.tendencia,
        alBorde: !dentro,
      },
    });
  }
  puestos.sort((a, b) => ORDEN[a.o.clase] - ORDEN[b.o.clase] || a.d - b.d);
  return puestos.map((p) => p.o);
}
