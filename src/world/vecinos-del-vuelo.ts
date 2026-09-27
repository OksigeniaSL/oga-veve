/**
 * **Qué aeropuertos vecinos se montan en un vuelo**, cuando son más de los
 * que caben.
 *
 * Cada destino de una ruta cuesta un mundo entero —su relieve fino, su
 * fotografía, su aeródromo— y se monta al arrancar, lo vaya a pisar el vuelo
 * o no. Con una isla o dos al lado eso no importaba. Con el país entero sí:
 * desde Asunción salen seis rutas de verdad, y montar seis mundos es pagar
 * seis fotografías de treinta megas en la tarjeta de una tablet para volar a
 * uno. Medido en el ADR 0010: **lo que cuesta no es el ancho del mundo, es
 * cada vecino**, unos treinta y seis megas y siete décimas de segundo de
 * arranque cada uno con la CPU de una tablet.
 *
 * Así que hay un tope, y es el que ya se publica: Gran Canaria monta cuatro
 * vecinos y va. Hasta ahí se montan todos, como siempre. Por encima se monta
 * **lo que el vuelo necesita**:
 *
 * 1. el destino elegido, que es a donde se va;
 * 2. su alternativo, que es a donde se va si allí no se puede —y va escrito
 *    en el plan antes de salir, con su combustible cargado—;
 * 3. y los más cercanos a la salida hasta llenar el tope, que son los que se
 *    ven por la ventanilla y a los que se desviaría alguien que cambia de
 *    idea en el aire.
 *
 * Lo que queda fuera es lo lejano: el Chaco central visto desde un vuelo a
 * Encarnación. No está en el mundo de ese vuelo, igual que no está en su plan.
 * El paso siguiente —montarlos por tramos según se acercan— está escrito en el
 * ADR, y cuando exista este tope dejará de hacer falta.
 *
 * Todo en metros y sin three.js, para poder comprobarlo sin navegador.
 */

import { camposDeLaRuta, elAlterno } from "../flight/alterno";
import type { Scenario } from "./scenarios";

/**
 * Cuántos mundos vecinos se montan a la vez, como mucho.
 *
 * Cuatro: los de Gran Canaria, que es el mundo más gordo que ya se publica y
 * el que se usó de vara al medir. Ver el ADR 0010.
 */
export const VECINOS_A_LA_VEZ = 4;

/**
 * Los destinos que se montan en este vuelo, en el mismo orden en que venían.
 *
 * `destinos` son los de la ruta que **este avión** puede hacer —ya filtrados
 * por `destinosParaEsteAvion`—, y `elegido` el destino del hangar o de la
 * dirección; sin él, o si es la vuelta al campo, se montan los más cercanos.
 * El orden se conserva porque el juego y la carga de fotos los cuentan por
 * posición.
 */
export function vecinosQueSeMontan(
  salida: Scenario,
  destinos: readonly Scenario[],
  elegido: string | undefined,
  tope = VECINOS_A_LA_VEZ,
): readonly Scenario[] {
  if (destinos.length <= tope) return destinos;
  const campos = camposDeLaRuta(salida, destinos);
  const casa = campos[0]!;
  const quedan = new Set<string>();

  const destino = campos.find((c) => c.id === elegido && c.id !== casa.id);
  if (destino) {
    quedan.add(destino.id);
    /*
     * El alternativo con **la misma cuenta que el hangar**: entre todos los
     * campos de la ruta, no entre los montados. Si se calculara sobre los
     * montados, el hangar prometería un alternativo y el vuelo tendría otro.
     */
    const alterno = elAlterno(destino, campos);
    if (alterno && alterno.id !== casa.id) quedan.add(alterno.id);
  }

  const porCercania = campos
    .slice(1)
    .sort(
      (a, b) =>
        Math.hypot(a.x - casa.x, a.z - casa.z) -
        Math.hypot(b.x - casa.x, b.z - casa.z),
    );
  for (const c of porCercania) {
    if (quedan.size >= tope) break;
    quedan.add(c.id);
  }
  return destinos.filter((d) => quedan.has(d.id));
}
