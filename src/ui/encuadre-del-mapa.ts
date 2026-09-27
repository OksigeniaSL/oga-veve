/**
 * Qué trozo del mundo enseña el plano, y cuándo hay que volver a pintarlo.
 *
 * ## Por qué aparte
 *
 * Porque era una cuenta repartida por el plano —un alcance fijo en fracciones
 * del escenario, un centro que según el caso era la casa, el punto medio de la
 * ruta o el avión— y lo que salía no respondía a lo que se pregunta al abrirlo.
 * Contado jugando: «veo sólo un trocito de mapa, si avanzo quiero seguir
 * viendo el mundo en el mapa».
 *
 * Y las dos mitades de esa frase eran verdad a la vez:
 *
 * - **Un trocito**: las lupas eran fracciones del escenario —veintidós
 *   kilómetros en Pettirossi—, así que la primera que acercaba ya se quedaba
 *   en diez, y el encuadre ancho saltaba de ahí a los trescientos setenta de
 *   la ruta a Encarnación. Entre un plano de barrio y uno de país no había
 *   nada, y en el de país el avión no se movía.
 * - **Si avanzo**: sin destino, el encuadre ancho seguía centrado en casa y
 *   solo se estiraba; el avión se iba hacia un borde en vez de seguir en
 *   medio del mundo.
 *
 * ## Lo que hace
 *
 * Dos clases de encuadre, que son las dos preguntas que se le hacen a un plano:
 *
 * - **Todo el vuelo**: el campo de salida, los destinos y el avión, con aire
 *   alrededor. El avión entra en la cuenta, así que el plano se va moviendo
 *   con él y nunca se sale del papel.
 * - **Siguiendo al avión**: el avión en medio, y el plano corre debajo. Las
 *   lupas van de dos en dos y media —como el mando de rango de una pantalla de
 *   navegación de verdad— desde el vuelo entero hasta un aeropuerto con sus
 *   calles, así que un vuelo largo tiene más escalones que uno corto y ninguno
 *   se queda con un hueco en medio.
 *
 * Y el fondo, que es lo caro de pintar, solo se repinta cuando el encuadre se
 * ha movido de verdad: ver `hayQueRepintar`.
 */

/** Un punto del mundo, en metros. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Un trozo cuadrado del mundo: su centro y lo que mide de lado, en metros. */
export interface Encuadre {
  readonly cx: number;
  readonly cz: number;
  readonly lado: number;
}

/**
 * Lo más cerca que se llega: un aeropuerto con sus plataformas y calles.
 *
 * Kilómetro y cuarto. Por debajo, una pista de tres kilómetros ya no cabe y se
 * pierde lo que se mira al rodar, que es por dónde se va.
 */
export const LADO_MINIMO = 1250;

/**
 * Cuánto acerca cada lupa: dos veces y media.
 *
 * Es el salto de los rangos de una pantalla de navegación —2, 5, 10, 20, 40
 * millas—, y por el mismo motivo: con menos, hacen falta demasiados toques; con
 * más, el sitio que se miraba se sale del papel al cambiar.
 */
export const PASO = 0.4;

/**
 * Cuánto aire se deja alrededor de lo que tiene que caber.
 *
 * Con el justo, la costa de la isla de casa se cortaba por la mitad aunque su
 * pista cupiera, y los rótulos de los campos se salían del borde.
 */
export const AIRE = 1.4;

/** Lo que miden de ancho y de alto unos puntos, y dónde está su medio. */
function caja(puntos: readonly Punto[]): Encuadre {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const p of puntos) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    z0 = Math.min(z0, p.z);
    z1 = Math.max(z1, p.z);
  }
  if (!Number.isFinite(x0)) return { cx: 0, cz: 0, lado: 0 };
  return {
    cx: (x0 + x1) / 2,
    cz: (z0 + z1) / 2,
    lado: Math.max(x1 - x0, z1 - z0),
  };
}

/**
 * El encuadre del vuelo entero: los campos y el avión, con aire alrededor.
 *
 * `minimo` es el escenario: aunque no haya a dónde ir, el plano ancho enseña
 * por lo menos el sitio de casa entero.
 */
export function encuadreDeTodo(
  campos: readonly Punto[],
  avion: Punto,
  minimo: number,
): Encuadre {
  const c = caja([...campos, avion]);
  return { cx: c.cx, cz: c.cz, lado: Math.max(minimo, c.lado * AIRE) };
}

/**
 * Lo que mide el vuelo **sin el avión**: los campos, con aire, y como poco el
 * escenario.
 *
 * Es de donde salen las lupas: si contaran el avión, cada una cambiaría de
 * tamaño mientras se vuela y el plano no se quedaría nunca quieto.
 */
export function ladoDelVuelo(campos: readonly Punto[], minimo: number): number {
  return Math.max(minimo, caja(campos).lado * AIRE);
}

/**
 * Los lados de las lupas, del vuelo entero al aeropuerto.
 *
 * Parten de `ladoDelVuelo`. El primero no se usa —es el del vuelo entero, que
 * sí lleva el avión—; está para que el índice de la lupa y el de esta lista
 * sean el mismo.
 */
export function escalones(ladoDelVuelo: number): readonly number[] {
  const lista = [ladoDelVuelo];
  for (let l = ladoDelVuelo * PASO; l >= LADO_MINIMO; l *= PASO) lista.push(l);
  /*
   * Y como poco una lupa, aunque el vuelo entero ya sea pequeño: en un
   * escenario de tres kilómetros sin destino no habría ninguna, y quien
   * quiere ver las calles de rodaje se quedaría sin poder acercarse.
   */
  if (lista.length === 1 && ladoDelVuelo > LADO_MINIMO * 1.5)
    lista.push(LADO_MINIMO);
  return lista;
}

/**
 * El encuadre que toca con una lupa puesta.
 *
 * `lupa` es el índice en `escalones`: cero es el vuelo entero y el resto
 * siguen al avión.
 */
export function encuadreCon(
  lupa: number,
  campos: readonly Punto[],
  avion: Punto,
  minimo: number,
): Encuadre {
  const lados = escalones(ladoDelVuelo(campos, minimo));
  const lado = lupa <= 0 ? null : lados[Math.min(lupa, lados.length - 1)];
  if (lado === null || lado === undefined)
    return encuadreDeTodo(campos, avion, minimo);
  return { cx: avion.x, cz: avion.z, lado };
}

/**
 * Si el fondo que hay pintado ya no sirve para el encuadre de ahora.
 *
 * Pintarlo cuesta —cincuenta mil preguntas al terreno y la ciudad entera—, así
 * que no se hace cada fotograma: la flecha se dibuja con el encuadre pintado
 * y el fondo se rehace cuando el de ahora se ha ido lo bastante.
 *
 * Una décima del lado para el centro y un ocho por ciento para el lado, que en
 * el encuadre ancho crece mientras el avión se aleja. Con el aire de `AIRE`,
 * las dos cuentas juntas dejan al avión siempre dentro del papel entre
 * repintado y repintado: está como mucho a 1/2,8 del lado del centro, y
 * sumando lo que puede crecer y correrse sin repintar se queda por debajo de
 * la mitad.
 */
export function hayQueRepintar(
  pintado: Encuadre | null,
  ahora: Encuadre,
): boolean {
  if (!pintado) return true;
  if (Math.abs(ahora.lado - pintado.lado) > pintado.lado * 0.08) return true;
  return (
    Math.hypot(ahora.cx - pintado.cx, ahora.cz - pintado.cz) >
    pintado.lado * 0.1
  );
}
