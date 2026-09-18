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
