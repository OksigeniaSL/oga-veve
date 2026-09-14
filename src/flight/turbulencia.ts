/**
 * La turbulencia: el aire que no está quieto.
 *
 * Pedida con el resto del tiempo —«climatología, atravesar mar de nubes o
 * nubes, lluvia, tormenta…»— y hace falta por algo más que el paisaje: **es lo
 * único que hace que el cielo se sienta**. Con aire perfectamente liso, volar
 * alto y volar bajo son lo mismo, entrar en una nube no se nota y el cartel del
 * cinturón no tiene motivo para existir.
 *
 * ## Qué se modela y qué no
 *
 * No es un campo de turbulencia de verdad —eso es un issue entero, #82— sino
 * **la ráfaga que llega al avión**: un vector de viento que cambia despacio y
 * se suma al del parte. Con eso salen las dos cosas que se notan pilotando: el
 * bamboleo y el bache.
 *
 * De dónde sale la intensidad, en orden de importancia:
 *
 * - **La capa de superficie.** El aire roza el suelo y se revuelve: cerca del
 *   terreno todo bailotea, y por eso el rato que más se mueve un avión de línea
 *   es el que va entre la pista y los mil metros. Se apaga hacia arriba.
 * - **El viento que haga.** Sin viento no hay nada que revolver. Con veinte
 *   nudos, la capa de abajo es un camino de tierra.
 * - **La nube.** Dentro de una capa de estratocúmulos y justo debajo, el aire
 *   sube y baja: es el borde de la nube, y atravesarla tiene que notarse.
 *
 * ## Por qué es una función y no un objeto con estado
 *
 * Para poder probarla sin volar: entra el reloj y sale un vector. La suavidad
 * la dan tres senos de períodos que no son múltiplos entre sí —el truco de
 * toda la vida para un ruido barato que no se repite a ojo— en vez de un
 * generador con memoria.
 */

/** Lo que hace falta saber del momento para calcular la ráfaga. */
export interface Aire {
  /** Metros sobre el terreno. */
  readonly sobreElSuelo: number;
  /** Viento del parte, en nudos. */
  readonly vientoKt: number;
  /** Altura de la base de las nubes sobre el mar, o `null` si no hay. */
  readonly baseDeNubes: number | null;
  /** Altura del avión sobre el mar. */
  readonly altura: number;
}

/**
 * Hasta dónde llega la capa que se revuelve por el roce del suelo, m.
 *
 * Mil. Es el orden de la capa límite de un día corriente: por debajo se nota el
 * terreno y por encima el aire va a lo suyo.
 */
const CAPA_DE_SUPERFICIE = 1000;

/**
 * Y cuánto se mueve el aire con un viento de veinte nudos a ras de suelo, m/s.
 *
 * Metro y medio. Es una ráfaga que se siente y no una que asuste: el avión
 * cabecea y bambolea, no salta. La turbulencia de verdad que mueve un vaso
 * empieza por ahí.
 */
const A_VEINTE_NUDOS = 1.5;

/** El grosor de la zona movida en el borde de la nube, m. */
const BORDE_DE_NUBE = 250;

/** Y cuánto añade estar en ese borde, m/s. */
const EN_LA_NUBE = 1.2;

/**
 * Cuánto se mueve el aire aquí y ahora, en m/s, de 0 a lo que sea.
 *
 * Es la **fuerza** de la ráfaga, sin dirección: la dirección la pone `rachaEn`.
 * Se saca aparte porque es lo que decide si se enciende el cartel del cinturón,
 * y eso tiene que poder mirarse sin calcular el vector.
 */
export function cuantoSeMueve(aire: Aire): number {
  const porElViento = (A_VEINTE_NUDOS * Math.min(aire.vientoKt, 40)) / 20 || 0;
  const cerca = Math.max(
    0,
    1 - Math.max(0, aire.sobreElSuelo) / CAPA_DE_SUPERFICIE,
  );
  let fuerza = porElViento * cerca;
  if (aire.baseDeNubes !== null) {
    const aLaNube = Math.abs(aire.altura - aire.baseDeNubes);
    if (aLaNube < BORDE_DE_NUBE)
      fuerza += EN_LA_NUBE * (1 - aLaNube / BORDE_DE_NUBE);
  }
  return fuerza;
}

/**
 * La ráfaga de este instante, en m/s, en ejes del mundo.
 *
 * `t` son segundos y puede ser el reloj del juego: lo único que importa es que
 * avance. Los tres períodos —7, 11 y 17 segundos y sus mitades— están elegidos
 * para que el conjunto no se repita en varios minutos, que es más de lo que
 * dura cualquier tramo de vuelo.
 *
 * La vertical pesa más que las horizontales, que es como se siente: lo que
 * mueve a un avión en una capa revuelta son los baches, no los empujones de
 * lado.
 */
export function rachaEn(
  t: number,
  aire: Aire,
): { x: number; y: number; z: number } {
  const fuerza = cuantoSeMueve(aire);
  if (fuerza <= 0) return { x: 0, y: 0, z: 0 };
  const onda = (periodo: number, fase: number): number =>
    Math.sin((t / periodo) * Math.PI * 2 + fase);
  return {
    x: fuerza * 0.6 * (onda(7, 0) * 0.6 + onda(3.1, 1.7) * 0.4),
    y: fuerza * (onda(11, 2.3) * 0.6 + onda(4.3, 0.4) * 0.4),
    z: fuerza * 0.6 * (onda(17, 1.1) * 0.6 + onda(5.7, 2.9) * 0.4),
  };
}
