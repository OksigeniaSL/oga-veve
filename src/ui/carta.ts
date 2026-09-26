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
   * Si el TCAS trabaja sin maniobras, que la pantalla lo dice: **TA ONLY**.
   * Ver `soloAvisa` en `flight/tcas.ts`.
   */
  readonly soloTa?: boolean;

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

  /** Si se escribe «TA ONLY». Ver `Mapa.soloTa`. */
  readonly soloTa: boolean;

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
  // Y lo que el piloto abriría el rango para ver. Ver `Otro.abreElRango`.
  for (const o of m?.otros ?? [])
    if (o.abreElRango) lejos = Math.max(lejos, millasHasta(o, m!));
  const rango = rangoPara(lejos);
  const por = pixelesPorMetro(rango, r);
  if (!m)
    return {
      rango,
      pista: null,
      eje: null,
      otros: [],
      soloTa: false,
      destino: null,
      alterno: null,
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
  const destino = alBorde(m.destino);
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
    soloTa: m.soloTa ?? false,
    destino,
    alterno,
    celdas,
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
