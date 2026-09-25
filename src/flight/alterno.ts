/**
 * El alternativo: a dónde se va si al destino no se puede llegar.
 *
 * Preguntado por el dueño del juego mirando una ruta: «¿hay un aeropuerto de
 * seguridad, o varios, durante el vuelo?». No había ninguno. Se salía con
 * combustible de sobra —ida y vuelta al más lejano— y al entrar en la reserva
 * la voz decía «buscá dónde aterrizar» sin señalar dónde. Eso deja la decisión
 * más importante del vuelo para el peor momento, que es justo lo contrario de
 * lo que enseña la regla de las tres eses: **se decide antes, con calma, para
 * no tener que decidir después, con prisa**.
 *
 * En un plan de vuelo de verdad el alternativo va escrito antes de despegar,
 * con su nombre, y el combustible se carga para llegar a él. Aquí igual.
 *
 * ## Cuál es
 *
 * El aeródromo más cercano al destino, **que no sea el destino**. Puede ser el
 * de salida: de Gran Canaria a Fuerteventura, el alternativo es Lanzarote; de
 * Tenerife Sur a Tenerife Norte, lo es el propio Sur. Se elige entre los campos
 * cargados en este vuelo, porque uno que no está en el mundo no es un sitio al
 * que se pueda ir.
 *
 * Todo en metros del mundo y sin nada de three.js, para poder comprobarlo sin
 * navegador.
 */

import { dondeCae } from "../world/entre-aerodromos";
import type { Scenario } from "../world/scenarios";

/** Un campo del vuelo: su identificador y dónde cae su pista. */
export interface CampoDelVuelo {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

/** El campo más cercano a un punto, o `null` si no hay ninguno. */
export function elMasCercano<C extends CampoDelVuelo>(
  x: number,
  z: number,
  campos: readonly C[],
): C | null {
  let mejor: C | null = null;
  let corto = Infinity;
  for (const c of campos) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < corto) {
      corto = d;
      mejor = c;
    }
  }
  return mejor;
}

/**
 * El alternativo de un destino: el más cercano a él, sin contarle a él.
 *
 * `null` cuando no hay otro campo en el vuelo, que es lo que pasa en los
 * escenarios de un solo aeródromo: ahí el vuelo es local y el plan B es la
 * misma pista.
 */
export function elAlterno<C extends CampoDelVuelo>(
  destino: CampoDelVuelo,
  campos: readonly C[],
): C | null {
  return elMasCercano(
    destino.x,
    destino.z,
    campos.filter((c) => c.id !== destino.id),
  );
}

/**
 * Los dos tramos que se cargan, en metros: al destino y de ahí al alternativo.
 *
 * Si el destino es el propio campo de salida —una vuelta al campo, un
 * circuito— los dos valen cero: el vuelo es local y la carga es la de siempre
 * para un vuelo local. Ver `cargaParaElPlan`.
 */
export function tramosDelPlan<C extends CampoDelVuelo>(
  salida: CampoDelVuelo,
  destino: CampoDelVuelo,
  campos: readonly C[],
): { alDestino: number; alAlterno: number; alterno: C | null } {
  if (destino.id === salida.id) return { alDestino: 0, alAlterno: 0, alterno: null };
  const alterno = elAlterno(destino, campos);
  return {
    alDestino: Math.hypot(destino.x - salida.x, destino.z - salida.z),
    alAlterno: alterno
      ? Math.hypot(alterno.x - destino.x, alterno.z - destino.z)
      : 0,
    alterno,
  };
}

/**
 * A dónde se va al entrar en la reserva, visto desde donde está el avión.
 *
 * Al alternativo, que para eso se planeó — **salvo que haya otro campo más
 * cerca**, incluido el propio destino si ya se está llegando. Con la reserva
 * empezada, cada minuto cuenta, y el plan B existe para usarse, no para
 * obedecerse: si el destino está a cinco kilómetros no se da media vuelta
 * hacia un alternativo a sesenta.
 *
 * La cuenta es, al final, el campo más cercano de todos; se escribe así para
 * que se lea el porqué.
 */
export function aDondeConLaReserva<C extends CampoDelVuelo>(
  x: number,
  z: number,
  alterno: C | null,
  campos: readonly C[],
): C | null {
  const cerca = elMasCercano(x, z, campos);
  if (!alterno) return cerca;
  if (!cerca) return alterno;
  const aAlterno = Math.hypot(alterno.x - x, alterno.z - z);
  const aCerca = Math.hypot(cerca.x - x, cerca.z - z);
  return aCerca < aAlterno ? cerca : alterno;
}

/** Un campo de la ruta, con su escenario: de ahí salen su nombre y su dibujo. */
export interface CampoDeLaRuta extends CampoDelVuelo {
  readonly escenario: Scenario;
}

/**
 * Los campos de una ruta que sale de `salida`, en metros del mundo de salida.
 *
 * La misma cuenta que usa el juego para poner cada vecino en su sitio —ver
 * `MundoVecino.desplazamiento`—, para que el hangar, que todavía no tiene
 * mundo, calcule el alternativo y la carga con **los mismos números** que va
 * a usar el vuelo. Un hangar que promete una carga y un vuelo que sale con
 * otra es el fallo de siempre de esta casa: dos sitios que dicen lo mismo con
 * dos cuentas.
 *
 * Los destinos sin aeródromo extraído se quedan fuera, igual que no pueden
 * ser vecinos.
 */
export function camposDeLaRuta(
  salida: Scenario,
  destinos: readonly Scenario[],
): CampoDeLaRuta[] {
  const aqui = salida.aerodrome?.origin;
  const campos: CampoDeLaRuta[] = [
    { id: salida.id, x: salida.runway.x, z: salida.runway.z, escenario: salida },
  ];
  if (!aqui) return campos;
  for (const d of destinos) {
    const alli = d.aerodrome?.origin;
    if (!alli) continue;
    const o = dondeCae(aqui, alli);
    campos.push({
      id: d.id,
      x: o.x + d.runway.x,
      z: o.z + d.runway.z,
      escenario: d,
    });
  }
  return campos;
}
