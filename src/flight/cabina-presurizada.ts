/**
 * La presurización: a qué altura está la cabina cuando el avión está arriba.
 *
 * Pedido tal cual, junto con la temperatura de fuera: «no veo temperatura
 * exterior, ni presurización de cabina». Y con la pregunta buena detrás:
 *
 * > «¿Qué pasa si tengo una despresurización a mucha altitud? Tengo pocos
 * > minutos para ponerme a altura de aire respirable.»
 *
 * Esa pregunta es la razón de que esto exista. Un avión de línea vuela a diez
 * mil metros, donde el aire **no se puede respirar**, y lo único que separa a
 * las personas de dentro de eso es que la cabina va soplada a presión. La
 * altitud de cabina es el número que lo dice, y en cualquier avión de pasaje
 * está en un reloj a la vista.
 *
 * ## Lo que se enseña con un número
 *
 * Que la cabina **también sube**. No se queda al nivel del mar: sube despacio
 * y se para en unos dos mil cuatrocientos metros, y por eso duelen los oídos
 * en el descenso. Quien lo vea subir mientras sube el avión ya no necesita
 * que se lo cuenten.
 *
 * ## Y lo que todavía no hay
 *
 * La avería. Este módulo dice dónde está la cabina cuando todo va bien; no
 * simula una despresurización ni el descenso de emergencia que viene detrás.
 * Cuando se haga, se hace aquí, y la maniobra que hay que enseñar es la de
 * verdad: máscara, y bajar a tres mil metros cuanto antes. Es la regla de las
 * tres eses aplicada al aire que se respira.
 */

/**
 * Hasta dónde deja subir la cabina un presurizado, m.
 *
 * Dos mil cuatrocientos, que son los ocho mil pies de cualquier avión de
 * línea: es el tope que fija la normativa y el que llevan puesto todos. Por
 * encima de eso, el aire empieza a no dar.
 */
export const TOPE_DE_CABINA = 2400;

/**
 * A qué altura está la cabina con el avión a esta altura, m.
 *
 * Los presurizados llevan la cabina subiendo **más despacio que el avión**
 * hasta que topa: un reparto lineal hasta la altura de crucero, que es lo que
 * hace un programador de presión de verdad —no exactamente, pero sí en lo que
 * se ve—. Los que no presurizan llevan la cabina donde está el avión, que es
 * la verdad y es también por lo que no suben más.
 */
export function altitudDeCabina(
  alturaDelAvion: number,
  avion: { readonly presurizada: boolean; readonly alturaDeCrucero: number },
): number {
  const alto = Math.max(0, alturaDelAvion);
  if (!avion.presurizada) return alto;
  const hasta = Math.max(1, avion.alturaDeCrucero);
  return Math.min(TOPE_DE_CABINA, alto, (alto / hasta) * TOPE_DE_CABINA);
}
