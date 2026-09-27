/**
 * Por debajo de qué nivel el agua de casa es el mar, m. Ver `esAguaDeCasa`.
 */
const NIVEL_DEL_MAR = 10;

/**
 * Lo que puede quedar el suelo por debajo del agua de casa y seguir siendo
 * agua de casa, tierra adentro, m. Ver `esAguaDeCasa`.
 */
const CAIDA_DEL_RIO = 10;

/**
 * **Si un suelo a `h` metros queda bajo el agua de casa**, que está a `nivel`.
 *
 * El agua de un escenario es una lámina a una cota, y eso es verdad para el
 * mar —en Canarias, a dos metros alrededor de todas las islas— y para el río
 * de casa **junto a casa**. Lejos no: un río baja. El Paraná pasa por Ciudad
 * del Este a ciento cinco metros y por Encarnación a ochenta y dos, y el
 * horizonte de Guaraní mide seiscientos sesenta kilómetros con tierras a
 * cuarenta y siete. Con la lámina de casa en todas partes, todo lo que queda
 * por debajo de ciento cinco —valles, esteros, la cuenca entera del Paraguay—
 * salía inundado en el horizonte, un mar en medio del continente.
 *
 * Así que tierra adentro el agua de casa es la que está **a su altura**: el
 * suelo que el modelo de terreno pone en la lámina o poco por debajo —el río,
 * cuya superficie es lo que mide el relieve—, y no lo que queda decenas de
 * metros más abajo, que es otro tramo del río con su propia agua, o tierra.
 * Los mapas finos de todos los campos están dentro de esa banda (su punto más
 * bajo, a menos de tres metros de su lámina), así que esto solo cambia el
 * horizonte. Y el mar es el mar: por debajo de su nivel todo es agua.
 */
export function esAguaDeCasa(h: number, nivel: number): boolean {
  if (h > nivel) return false;
  return nivel < NIVEL_DEL_MAR || h >= nivel - CAIDA_DEL_RIO;
}
