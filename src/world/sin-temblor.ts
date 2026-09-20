/**
 * Quitarle el temblor a una polilínea de aeropuerto.
 *
 * Vive aparte porque hacen falta **las dos rayas**: la verde que traza el plan
 * de tierra y la amarilla que se pinta en el asfalto. Estaba solo en el plan,
 * así que la raya verde salía limpia y **la pintada seguía culebreando** — y
 * la que se mira desde la cabina para rodar es la amarilla. Contado jugando
 * con el vídeo delante: «esas curvas no las hago yo, he dejado que el avión se
 * guíe por las rayas que has pintado, mira los fotogramas y verás el avión
 * haciendo el movimiento izquierda derecha como si el piloto estuviera
 * borracho».
 */

import type { Punto } from "./aerodrome";

/**
 * Cuánto se puede apartar la raya de lo que dibujó OpenStreetMap, m.
 *
 * Dos metros y medio. Una calle de rodaje mide veintitrés de ancho, así que
 * dos y medio es una décima parte de su anchura: la raya sigue por el asfalto
 * con margen de sobra por los dos lados.
 *
 * Se empezó en metro y medio, que parecía lo prudente, y **no bastaba**: el
 * temblor de Cuatro Vientos son dos metros justos —la raya iba por x 332, 334,
 * 332, 330 en treinta metros— y se colaba entero por debajo del listón.
 */
const TEMBLOR = 2.5;

/**
 * Le quita el temblor a la raya verde.
 *
 * La geometría de las calles la dibuja alguien siguiendo una foto aérea con el
 * ratón, y eso deja los ejes con un serpenteo de un par de metros que sobre el
 * mapa no se ve y en el suelo del juego sí: medido en Cuatro Vientos, después
 * de redondear los codos la raya giraba **−11,8°, +11,3° y −11,7° en tres
 * puntos seguidos**. Quien la mira desde la cabina ve una raya torcida, y quien
 * la sigue tiene la sensación de que el juego le manda culebrear. Lo dijo quien
 * juega: «que el juego avance y no que siga viendo las rayas torcidas por la
 * pista para indicarme la salida».
 *
 * Es el mismo Douglas-Peucker que usa el extractor —ver `simplificar` en
 * `scripts/osm-comun.mjs`— con una tolerancia mayor: allí se conserva la
 * geometría por si alguien la quiere para otra cosa, y aquí se pinta para que
 * un niño la siga. **Los dos extremos no se tocan**, que son el avión y el
 * destino.
 *
 * Y va **antes** de redondear los codos, no después: redondear un temblor lo
 * convierte en una curva suave y sigue siendo un temblor. Lo que hay que hacer
 * es no tenerlo.
 *
 * Medido campo a campo, lo que **no** cambia: el largo de la ruta —en Cuatro
 * Vientos, 375 a 372 m, o sea que no se come ningún codo— y la distancia
 * mínima de la raya a un edificio, que era el riesgo obvio: 62,1 → 62,1 en
 * Tenerife Norte, 20,9 → 20,8 en Silvio Pettirossi, 31,2 → 31,2 en El Hierro.
 */
export function sinTemblor(puntos: readonly Punto[], tol = TEMBLOR): Punto[] {
  if (puntos.length < 3) return [...puntos];
  let peor = 0;
  let cual = 0;
  const a = puntos[0]!;
  const b = puntos[puntos.length - 1]!;
  for (let i = 1; i < puntos.length - 1; i++) {
    const d = aLaRecta(puntos[i]!, a, b);
    if (d > peor) {
      peor = d;
      cual = i;
    }
  }
  if (peor <= tol) return [a, b];
  return [
    ...sinTemblor(puntos.slice(0, cual + 1), tol).slice(0, -1),
    ...sinTemblor(puntos.slice(cual), tol),
  ];
}

/** Lo que se aparta un punto del segmento que une otros dos, m. */
function aLaRecta(p: Punto, a: Punto, b: Punto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const u = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
  );
  return Math.hypot(p[0] - (a[0] + dx * u), p[1] - (a[1] + dy * u));
}
