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
  /** La pista de casa, con su sitio, su rumbo y su largo. */
  readonly pista: {
    readonly x: number;
    readonly z: number;
    readonly heading: number;
    readonly length: number;
  } | null;
  /** Y los otros aviones, los que se oyen por la radio. Ver `trafico.ts`. */
  readonly otros: readonly { readonly x: number; readonly z: number }[];

  /**
   * El aeropuerto al que se va, si esta ruta lleva a otro.
   *
   * Pedido jugando, y es lo que convierte la rosa en una carta de navegación:
   * «si salgo de un aeropuerto y me estoy acercando a otro, estaría bien que
   * se fuera mostrando también en el cuadro». Es lo que hace cualquier
   * navegador de verdad, y es la primera lección de navegación que este juego
   * puede dar: **poner rumbo a algo que todavía no se ve**.
   */
  readonly destino?: { readonly x: number; readonly z: number } | null;

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
}

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
  readonly otros: readonly { dx: number; dy: number }[];

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
  readonly destino: {
    dx: number;
    dy: number;
    millas: number;
    dentro: boolean;
  } | null;

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
  const lejos = m?.pista ? millasHasta(m.pista, m) : RANGOS[1]!;
  const rango = rangoPara(lejos);
  const por = pixelesPorMetro(rango, r);
  if (!m)
    return {
      rango,
      pista: null,
      eje: null,
      otros: [],
      destino: null,
      celdas: [],
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
     * **Por la cabecera más cercana**, que es la que se cruza primero al
     * aterrizar; y el eje sale de ella alejándose de la pista, o sea hacia
     * quien viene. Con la más lejana salían ocho millas de raya al otro lado
     * de la pista, invitando a seguir de largo.
     */
    const entraPorA = Math.hypot(pa.dx, pa.dy) < Math.hypot(pb.dx, pb.dy);
    const umbral = entraPorA ? pa : pb;
    const otro = entraPorA ? pb : pa;
    const largo = Math.hypot(otro.dx - umbral.dx, otro.dy - umbral.dy) || 1;
    const ux = (umbral.dx - otro.dx) / largo;
    const uy = (umbral.dy - otro.dy) / largo;
    const ocho = EJE_DE_ENTRADA * MILLA * por;
    eje = {
      desde: umbral,
      hasta: { dx: umbral.dx + ux * ocho, dy: umbral.dy + uy * ocho },
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
  let destino: Dibujo["destino"] = null;
  if (m.destino) {
    const p = aqui(m.destino);
    const d = Math.hypot(p.dx, p.dy);
    const dentro = d <= r;
    destino = {
      dx: dentro ? p.dx : (p.dx / (d || 1)) * r,
      dy: dentro ? p.dy : (p.dy / (d || 1)) * r,
      millas: millasHasta(m.destino, m),
      dentro,
    };
  }
  const celdas = (m.celdas ?? []).map((c) => {
    const p = aqui(c);
    return { dx: p.dx, dy: p.dy, radio: c.radio * por, fuerza: c.fuerza };
  });
  return { rango, pista, eje, otros: m.otros.map(aqui), destino, celdas };
}
