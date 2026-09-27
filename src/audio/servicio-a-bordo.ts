/**
 * El servicio a bordo: qué ofrece la tripulación, y en qué vuelo.
 *
 * Pedido porque «forma parte de la vida de volar», y con la vara puesta en lo
 * que se ve de verdad: «hasta en un vuelo de media hora entre islas te dan
 * agua…». No hay vuelo de línea tan corto que no lleve algo, y un juego que
 * enseña a volar con pasaje tiene que enseñar también que detrás de la puerta
 * de la cabina va gente a la que se atiende.
 *
 * ## Lo que se ofrece es de la casa
 *
 * La flota vuela con la librea de Granja Óga, así que lo que pasa por el
 * pasillo es de la granja: fruta deshidratada de mango, de piña y de banana,
 * y maní. **Productos inventados** —la granja no vende nada de esto— y sin
 * una sola marca ajena, que en un juego para niños sería publicidad.
 *
 * - **En Paraguay entran también la chipa y el mbejú.** Es la tradición de la
 *   chipera que sube al colectivo con la canasta, y es lo que se ofrece a
 *   quien llega a casa.
 * - **En Canarias, lo mismo dicho en canario**: plátano y no banana, manises y
 *   no maní. La granja es paraguaya, pero quien lo ofrece es de las islas y lo
 *   nombra como se nombra allí — igual que la torre de Tenerife no vosea. Y a
 *   veces se presenta como lo que es: «un sabor de Paraguay».
 *
 * ## Y rota, que es lo que lo hace entretenido
 *
 * Un anuncio que dice siempre lo mismo deja de oírse al tercer vuelo. Así que
 * el producto cambia **de un vuelo a otro y nunca repite seguido**: se
 * recuerda el último y se elige entre los demás. Varias grabaciones con la
 * misma plantilla y la misma voz, cambiando solo lo que se ofrece.
 *
 * ## Agua siempre; café y té, en los largos
 *
 * Es la regla de una aerolínea regional de verdad: el agua va en todos los
 * vuelos y lo caliente solo cuando da tiempo a servirlo y a recogerlo. Nada de
 * servicio de largo radio: aquí no hay vuelos transatlánticos.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

import { comoSeDiceAqui, type Habla } from "../i18n/habla";

/** Lo que puede pasar por el pasillo, por su identificador. */
export type Producto = "mango" | "pina" | "banana" | "mani" | "chipa" | "mbeju";

/** Lo de la granja que se ofrece en todas partes. */
export const DE_LA_GRANJA: readonly Producto[] = [
  "mango",
  "pina",
  "banana",
  "mani",
];

/**
 * Y lo que se ofrece en Paraguay, que es lo mismo **y lo de casa**.
 *
 * La chipa y el mbejú no se ofrecen en Canarias a propósito: fuera de
 * Paraguay nadie los reconocería por el nombre, y un anuncio que obliga a
 * preguntar qué es eso no se entiende a los cuatro años.
 */
export const DE_PARAGUAY: readonly Producto[] = [
  ...DE_LA_GRANJA,
  "chipa",
  "mbeju",
];

/** Lo que se ofrece en un vuelo de este sitio. */
export function productosDe(habla: Habla): readonly Producto[] {
  return habla === "paraguayo" ? DE_PARAGUAY : DE_LA_GRANJA;
}

/**
 * El producto de este vuelo: cualquiera de los de aquí **menos el del vuelo
 * anterior**.
 *
 * `ultimo` es lo que se ofreció la última vez, venga de donde venga —también
 * de un vuelo en la otra orilla—, o `null` si es el primero. Si el último no
 * es de aquí, no quita nada.
 */
export function elegirProducto(
  habla: Habla,
  ultimo: string | null,
  azar: () => number = Math.random,
): Producto {
  const hay = productosDe(habla).filter((p) => p !== ultimo);
  const i = Math.min(hay.length - 1, Math.floor(azar() * hay.length));
  return hay[Math.max(0, i)]!;
}

/**
 * Desde cuántos minutos de vuelo previsto un vuelo es «largo», y se sirve
 * además café y té.
 *
 * Media hora. Es la frontera que se ve en cualquier aerolínea de islas: en los
 * saltos de veinte minutos no da tiempo a servir algo caliente y recogerlo
 * antes de que se encienda el cartel, y en los de más sí. En el juego eso deja
 * los saltos entre islas en agua y algo de la granja, y las rutas largas de
 * Paraguay —el Chaco, Pedro Juan— con su café.
 */
export const VUELO_LARGO_MINUTOS = 30;

/** Si en este vuelo se sirve también café y té. */
export function esVueloLargo(minutosPrevistos: number): boolean {
  return minutosPrevistos >= VUELO_LARGO_MINUTOS;
}

/**
 * Cuántas veces de cada tres se presenta en Canarias como «un sabor de
 * Paraguay». Una: si fuera siempre, dejaría de sonar a detalle y sonaría a
 * lema.
 */
export const SABOR_DE_PARAGUAY = 1 / 3;

/** El anuncio del servicio, listo para decir: la receta y sus piezas. */
export interface AnuncioDelServicio {
  /** La receta del pack, que es la misma en todos los vuelos de esta habla. */
  readonly clave: string;
  /** Qué pieza va en cada hueco. Ver `recetaDe` en `banco-de-voz.ts`. */
  readonly relleno: Readonly<Record<string, string>>;
  /** Las piezas en orden, para montar el texto con `t()`. */
  readonly piezas: readonly string[];
}

/**
 * El anuncio del servicio de este vuelo.
 *
 * Dos trozos, y los dos son frases enteras: lo que se ofrece —siempre con el
 * agua delante— y, si el vuelo es largo, el café y el té detrás. Grabados
 * enteros y no palabra a palabra, porque un «mango» pegado en mitad de una
 * frase de megafonía se nota; ver `docs/voces/LEEME.md`.
 */
export function servicioPara(
  habla: Habla,
  producto: Producto,
  minutosPrevistos: number,
  azar: () => number = Math.random,
): AnuncioDelServicio {
  const aqui = (clave: string): string => comoSeDiceAqui(clave, habla);
  const deParaguay = habla === "canario" && azar() < SABOR_DE_PARAGUAY;
  const loQueSeOfrece = aqui(
    `tripulacion.servicio.${producto}${deParaguay ? ".paraguay" : ""}`,
  );
  const largo = esVueloLargo(minutosPrevistos)
    ? aqui("tripulacion.servicio.largo")
    : null;
  return {
    clave: aqui("tripulacion.servicio"),
    relleno: largo
      ? { producto: loQueSeOfrece, largo }
      : { producto: loQueSeOfrece },
    piezas: largo ? [loQueSeOfrece, largo] : [loQueSeOfrece],
  };
}
