/**
 * **La palanca de gases con el pulgar**, en cuentas que se pueden probar.
 *
 * «El acelerador/desacelerador cuesta bastante controlarlo», probado en un
 * teléfono. Y mirado, costaba por tres motivos que se sumaban:
 *
 * - **No se veía dónde estaba.** El punto de la palanca se movía un tercio de
 *   su propio tamaño —once píxeles en una palanca de ciento noventa—, así que
 *   con el motor a ralentí o a tope el punto seguía en medio. Una palanca que
 *   no enseña su posición obliga a mirar otra cosa para saberla.
 * - **No tenía sitios a los que llegar.** El dedo caía donde caía y el gas era
 *   ese: tres píxeles por encima del fondo ya son un dos por ciento, y con
 *   algo de gas puesto la llave no arranca. Arriba, lo mismo: a tope solo se
 *   llegaba acertando la última raya de la palanca.
 * - **Los botones de más y menos daban un hilito.** Empujaban a razón de un
 *   sesenta por ciento por segundo mientras se apretaban, o sea que un toque
 *   de dedo movía cinco centésimas y no se notaba en nada.
 *
 * Esto arregla lo que es cuenta —las marcas, el imán y los pasos— y deja el
 * dibujo a la hoja de estilos y el dedo a `input.ts`.
 *
 * ## Las marcas son las posiciones de tierra, y la de en medio se dice cuál es
 *
 * Ralentí, rodaje y despegue son las tres posiciones del gas que se usan en
 * tierra en cualquier avión: el ralentí para parar y esperar, un poco de gas
 * para rodar y todo para despegar. Las dos de las puntas son topes de verdad
 * —el de abajo en todas las palancas, y en los reactores de Airbus el de
 * arriba lleva además su muesca, TOGA—.
 *
 * **La de en medio no es una muesca en ninguna palanca de verdad**, y hay que
 * decirlo: en la cabina el gas de rodaje se busca mirando las revoluciones o
 * el empuje, no se nota en la mano. Aquí se marca porque en un teléfono no hay
 * reloj de revoluciones a la vista y la marca es lo que lo sustituye: una
 * ayuda de presentación, no un mando que no existe. Y no es un número fijo:
 * sale del modelo de este avión, porque es el gas que sostiene la velocidad
 * de rodaje y eso es distinto en cada uno. Ver `gasParaRodar` en
 * `flight/model.ts`.
 */

/** Ralentí y despegue: los dos topes de la palanca. */
export const RALENTI = 0;
export const DESPEGUE = 1;

/**
 * Cuánto tira cada marca del dedo, en fracción del recorrido.
 *
 * Seis centésimas: en una palanca de doscientos píxeles son doce de cada
 * lado, más o menos lo que mide la yema de un pulgar pequeño. Con menos, caer
 * encima del ralentí sigue siendo cuestión de puntería; con más, entre el
 * rodaje y el ralentí no quedaría sitio para rodar despacio.
 */
export const IMAN = 0.06;

/**
 * Lo que mueve un toque de los botones de más y menos.
 *
 * Una décima. Con el sesenta por ciento por segundo de antes, un toque de
 * dedo —un octavo de segundo— eran siete centésimas que no se notaban en la
 * palanca ni en el avión; una décima se ve saltar y se oye en el motor. Diez
 * toques de ralentí a despegue, o uno mantenido: ver `MANTENER`.
 */
export const PASO = 0.1;

/**
 * Cuánto hay que mantener un botón para que deje de dar pasos y empuje.
 *
 * Cuatro décimas de segundo, que es lo que distingue un toque de dejar el
 * dedo puesto: menos y un toque normal ya empuja; más y parece que no
 * responde.
 */
export const MANTENER = 0.4;

/**
 * Las marcas de la palanca para un avión: ralentí, rodaje y despegue.
 *
 * El rodaje se acota para que las tres se distingan siempre: pegado al
 * ralentí sería la misma marca, y pegado al despegue, lo mismo por arriba.
 */
export function marcasDeGas(gasDeRodaje: number): readonly number[] {
  const rodaje = Number.isFinite(gasDeRodaje)
    ? Math.min(0.6, Math.max(0.12, gasDeRodaje))
    : 0.3;
  return [RALENTI, rodaje, DESPEGUE];
}

/** El gas, pegado a la marca que tenga a mano; si no hay ninguna, el mismo. */
export function alIman(
  valor: number,
  marcas: readonly number[],
  iman = IMAN,
): number {
  const v = acotar(valor);
  let mejor = v;
  let distancia = iman;
  for (const m of marcas) {
    const d = Math.abs(v - m);
    if (d <= distancia) {
      mejor = m;
      distancia = d;
    }
  }
  return mejor;
}

/**
 * El siguiente sitio de la palanca con un toque de más o de menos.
 *
 * Las décimas y las marcas, y la marca manda: si una décima cae a menos de
 * media décima de una marca, no cuenta. Si no, de ralentí a rodaje saldría un
 * paso de tres centésimas —del 0,3 al 0,33— que no se nota en nada y hace
 * pensar que el botón no va.
 */
export function siguientePaso(
  actual: number,
  sentido: number,
  marcas: readonly number[],
): number {
  if (sentido === 0) return acotar(actual);
  const sitios = new Set<number>(marcas.map(acotar));
  for (let i = 0; i <= 10; i++) {
    const d = Math.round(i * PASO * 100) / 100;
    if (marcas.every((m) => Math.abs(m - d) >= PASO / 2)) sitios.add(d);
  }
  const orden = [...sitios].sort((a, b) => a - b);
  const HOLGURA = 0.01;
  if (sentido > 0) {
    return orden.find((s) => s > actual + HOLGURA) ?? DESPEGUE;
  }
  return [...orden].reverse().find((s) => s < actual - HOLGURA) ?? RALENTI;
}

/**
 * Si entre dos posiciones se ha cruzado —o se ha llegado a— una marca.
 *
 * Es lo que da el golpecito en la mano al pasar por una muesca: una palanca
 * de verdad se nota en los dedos sin mirarla.
 */
export function cruzaMarca(
  antes: number,
  ahora: number,
  marcas: readonly number[],
): boolean {
  if (antes === ahora) return false;
  const [a, b] = antes < ahora ? [antes, ahora] : [ahora, antes];
  return marcas.some((m) => m > a && m <= b) || marcas.includes(ahora);
}

/**
 * **La palanca en píxeles**: cuánto gas hay a una altura del dedo.
 *
 * `desdeAbajo` es la distancia del dedo al fondo del recorrido y `recorrido`
 * lo que se mueve el centro del punto de una punta a otra. Va aparte porque
 * tiene que decir lo mismo que la hoja de estilos, que pinta el punto con la
 * cuenta inversa: si se separan, el punto va por un lado y el dedo por otro.
 */
export function gasALaAltura(desdeAbajo: number, recorrido: number): number {
  if (!(recorrido > 0)) return 0;
  return acotar(desdeAbajo / recorrido);
}

function acotar(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
