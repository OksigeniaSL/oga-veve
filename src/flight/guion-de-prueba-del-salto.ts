/**
 * **El guion más corto con el que se puede probar un salto en el juego de
 * verdad**: arriba, Ara se duerme, salta y se despierta. No sale en ningún menú;
 * se abre con `?inicio=3&largo=<s>&hasta=<s>`, como `?inicio=3&kit`, y lo vuela
 * `scripts/verificar-salto.mjs`.
 *
 * Es del banco y no del vuelo: el guion de Madrid a Asunción, con su cena, su
 * noche y su desayuno, es de los capítulos. Las frases son las de la siesta de
 * Los Rodeos, que ya están grabadas: lo que se prueba es que suenen en su sitio,
 * y que no suene nada más.
 */

import { GUION_TENERIFE_LA_PALMA, type CharlaDelPasaje, type MomentoDelPasaje } from "./guion-tenerife-la-palma";
import type { GuionDelPasaje } from "./motor-del-pasaje";

/** La siesta de este guion, y adónde cae: a `hasta` segundos del despegue. */
export function guionDePruebaDelSalto(hasta: number): GuionDelPasaje<MomentoDelPasaje, CharlaDelPasaje> {
  const { siesta } = GUION_TENERIFE_LA_PALMA;
  return {
    ...GUION_TENERIFE_LA_PALMA,
    momentos: [
      // Hasta bajar no hay nada que contar: es lo que deja a Ara dormirse. Ver `ratoTranquilo`.
      { id: "bajada", cuando: (l) => l.tramo === "bajada", lineas: [] },
      { id: "fin", cuando: () => true, lineas: [] },
    ],
    charlas: [],
    seSenalaDesde: [],
    kit: null,
    bano: null,
    siesta: {
      seDuerme: siesta.seDuerme,
      seDespierta: siesta.seDespierta,
      laDespiertan: siesta.laDespiertan,
      puedenEsperar: new Set(),
      trasAlDespertar: {},
      antesDeDormirse: [],
      salto: () => hasta,
    },
  };
}
