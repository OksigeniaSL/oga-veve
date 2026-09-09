/**
 * Los pilotos: doce huecos en el hangar y ningún dato personal.
 *
 * Sin cuentas, sin correo, sin nombre. El público son menores y la promesa es
 * cero datos personales, así que **no se recoge nada**: un perfil es un bicho
 * y un color, y con eso el juego compone un indicativo —*Tero Rojo*,
 * *Jaguareté Azul*—. Lo que no se recoge no se puede perder ni filtrar.
 *
 * ## Tu perfil no es un avatar: es tu avión
 *
 * Doce huecos porque la tablet es de aula. Una niña de cuatro años no lee
 * «Tero Rojo», pero **reconoce su avión entre los doce aparcados** igual que
 * reconoce su percha en el cole: por el color y por el bicho, que son las dos
 * cosas que un prelector distingue a un vistazo y a distancia.
 *
 * Y por eso son un bicho **y** un color, no uno de los dos: con cuatro
 * bichos y seis colores salen veinticuatro aviones distintos, que es el doble
 * de los que caben. Con solo color, dos niños del mismo aula acabarían
 * peleándose por el rojo.
 *
 * ## Los cuatro bichos
 *
 * Son de aquí, y esa es toda la razón: el tero que grita cuando alguien se
 * acerca al nido, el jaguareté, el karumbé y el mburucuyá. Un niño paraguayo
 * los conoce antes de saber leer su nombre.
 */

/** Los bichos, con su clave de traducción. El dibujo va aparte. */
export const BICHOS = ["tero", "jaguarete", "karumbe", "mburucuya"] as const;
export type Bicho = (typeof BICHOS)[number];

/**
 * Los seis colores, y ninguno es el del fondo.
 *
 * Se eligen para distinguirse **entre ellos** a tamaño de miniatura, que es
 * como se van a ver: doce aviones pequeños en una rejilla. Dos azules
 * parecidos serían dos aviones iguales.
 */
export const COLORES = [
  { id: "rojo", hex: "#c8503a" },
  { id: "azul", hex: "#3a6fc8" },
  { id: "verde", hex: "#3f9152" },
  { id: "amarillo", hex: "#d8a13c" },
  { id: "violeta", hex: "#8b5cb8" },
  { id: "naranja", hex: "#d97a35" },
] as const;

export type Color = (typeof COLORES)[number]["id"];

export const hexDe = (color: string): string =>
  COLORES.find((c) => c.id === color)?.hex ?? COLORES[0].hex;

/** ¿Es uno de los nuestros? Lo guardado puede ser cualquier cosa. */
export const esBicho = (x: string | undefined): x is Bicho =>
  BICHOS.includes(x as Bicho);

export const esColor = (x: string | undefined): x is Color =>
  COLORES.some((c) => c.id === x);

/**
 * Cuántos aviones distintos se pueden componer.
 *
 * Tiene que ser holgadamente más que los huecos, o dos niños del aula
 * acabarían con el mismo avión y la gracia entera se pierde.
 */
export const COMBINACIONES = BICHOS.length * COLORES.length;

/**
 * El siguiente avión libre, para que crear uno no obligue a elegir nada.
 *
 * A los cuatro años, «elegí bicho y color» es una pantalla; «este es el tuyo,
 * ¿lo cambiás?» es un avión. Así que se propone el primero que nadie tenga,
 * recorriendo colores antes que bichos: los primeros cuatro perfiles de un
 * aula salen de cuatro bichos distintos, que es lo que más se diferencia.
 */
export function siguienteLibre(
  usados: readonly { avatar: string; color?: string }[],
): { bicho: Bicho; color: Color } {
  const cogido = new Set(usados.map((u) => `${u.avatar}|${u.color ?? ""}`));
  for (const color of COLORES) {
    for (const bicho of BICHOS) {
      if (!cogido.has(`${bicho}|${color.id}`)) {
        return { bicho, color: color.id };
      }
    }
  }
  return { bicho: BICHOS[0], color: COLORES[0].id };
}
