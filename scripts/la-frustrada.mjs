/**
 * **La palanca de la frustrada de un avión de hélice**, la del piloto del
 * vuelo entero (`subirDeVerdad` en `verificar-vuelo-entero.mjs`). Vive aparte
 * para poder probarla: el banco la mete en la página tal cual, como texto, y
 * `la-frustrada.test.mjs` la vuela contra el modelo del juego.
 *
 * Cuando la torre mandaba al aire, el banco pedía de golpe la actitud de
 * subida entera, doce grados, desde la palanca adelantada de la final. En el
 * JAZ 40 de H45b, la palanca pasó de −0,14 a +0,19 en un fotograma —el tope
 * de `limitarElAngulo`, que es el ángulo del avisador menos dos grados *en
 * equilibrio* y no frena el morro que llega lanzado—: 2,04 g y 12,1° de ala con
 * el avisador en 11,9. Y la avioneta, con la mano a su ritmo pero a por los
 * mismos doce grados, se quedaba a 57–59 nudos con la primera muesca, 1,25
 * veces su pérdida: la racha de Taguató la llevó a 1,50 g y al avisador a
 * 125 m (ronda c31). Ninguna de las dos cosas es una frustrada.
 *
 * El manual dice otra cosa, y lo mismo en los dos aviones: **gas a fondo, el
 * morro a la actitud de subida sin tirón, y la velocidad que toca**. El 172R:
 * «Throttle — FULL OPEN. Wing Flaps — RETRACT TO 20°. Climb Speed — 55 KIAS»
 * (Cessna 172R *Information Manual*, sección 4, *Balked Landing*, pp. 4-17 y
 * 4-33). El Seneca III: «apply takeoff power to both engines. While the pitch
 * attitude is increased to obtain the balked landing climb speed of 85 KIAS,
 * retract the landing gear and slowly retract the flaps, when a positive climb
 * is established» (PA-34-220T, VB-1110, 4.43, p. 4-34). Es decir, una actitud
 * que se lleva a la velocidad de subida de la frustrada, nunca un ángulo que
 * se persigue aunque la velocidad se caiga. Las dos velocidades son 1,3 veces
 * la pérdida con los flaps que llevan, o algo más.
 *
 * Así que la ley es esta, para todos los de hélice:
 *
 * - **El morro, a `CABECEO_DE_LA_FRUSTRADA` y a `RITMO_DE_LA_FRUSTRADA`**:
 *   ocho grados, subidos a tres grados por segundo —el ritmo de rotar,
 *   `RITMO_DE_ROTACION`— desde el que llevaba la final. Lo que se persigue
 *   es esa referencia que sube despacio, no la actitud final: el error nunca
 *   es grande, y la palanca no salta.
 * - **Y menos morro si falta velocidad**: dos grados por cada m/s que la
 *   indicada quede por debajo de la de la frustrada (`minima`, la de maniobra
 *   con los flaps de ahora y un margen). **Y más si sobra**: uno por cada m/s,
 *   hasta los doce de la subida (`CABECEO_MAXIMO_DE_LA_FRUSTRADA`). Es «pitch
 *   to obtain the balked landing climb speed»: la actitud es la que da la
 *   velocidad, y los ocho grados son por donde se empieza.
 * - **Y el ala, lejos del avisador**: si el ángulo se acerca a
 *   `MARGEN_AL_AVISADOR` del aviso, la referencia no sube más y la palanca se
 *   afloja en proporción a lo que se pasa.
 * - **La palanca, desde la que llevaba**: lo que acumula empieza en la
 *   palanca de la final —sin salto al cambiar de ley—, y encima va lo que
 *   falta de actitud y lo que gira el morro, que se frena como en
 *   `AMORTIGUA_EL_MORRO`. Y la mano no la mueve más deprisa de lo que la
 *   mueve una mano (`mano`, palanca por segundo).
 *
 * El gas a fondo y los flaps por muescas no son de esta función: son del
 * banco, con la misma regla para todos (ver `irseConFlaps`).
 *
 * **Y los reactores, con la de su FCTM** (H56b), la misma ley con otras
 * cifras (`LEY_DEL_REACTOR`). El de Boeing: «Push TO/GA switch […] rotate
 * toward 15° pitch attitude», al ritmo de rotar, y luego lo que mande el
 * director; y lo que no se cruza nunca es el *stick shaker*, con dos grados y
 * medio de ala de margen. Así que la actitud de partida y la de techo son
 * quince grados, y la velocidad que no se deja caer es la de la aproximación,
 * la que lleva puesta el MCP: un reactor vuela la final a 1,23 veces su
 * pérdida, no a 1,3, y bajar dos grados de morro por cada m/s que le faltara
 * para la de maniobra de la muesca siguiente lo dejaría sin subir hasta
 * acelerar. **Y llega a los quince sin pasarse**: un avión pesado gira el morro
 * despacio, y lo que acumula la palanca para seguir la actitud que sube a tres
 * grados por segundo lo pasaba de largo al pararse de golpe —el 747 a 18,9°
 * en la mesa de H56b—; así que la actitud pedida frena los últimos grados
 * (`acerca`, segundos) y el morro que gira se frena el doble (`amortigua`).
 * El ala se aparta del avisador desde los cuatro grados, como en las hélices:
 * con dos y medio de aviso, la racha de la mesa lo dejaba a 1,4°; con cuatro,
 * a 2,6° como poco. Los de hélice siguen con sus ocho grados y su techo de
 * doce.
 */

/**
 * **La frustrada de los reactores**, la de su FCTM: quince grados de partida y
 * de techo, los últimos grados frenando y el morro frenado el doble. Va como
 * `ley` a `palancaDeLaFrustrada`; sin ella, la de las hélices.
 */
export const LEY_DEL_REACTOR = Object.freeze({
  cabeceo: (15 * Math.PI) / 180,
  techo: (15 * Math.PI) / 180,
  margen: (4 * Math.PI) / 180,
  acerca: 2,
  amortigua: 3,
});

/** La actitud de la frustrada, rad: ocho grados, entre los siete y los diez del manual. */
export const CABECEO_DE_LA_FRUSTRADA = (8 * Math.PI) / 180;
/**
 * **Y lo más que se sube si sobra velocidad**, rad: los doce grados de la
 * subida del banco (`CABECEO_DE_SUBIDA`). Con ocho y el gas a fondo, el JAZ 40
 * llegaba a los 120 m a 103 nudos, catorce por encima de los de su subida; el
 * automático, al engancharse, se los comía subiendo el morro a veinte grados
 * por segundo (H34e, primera tirada).
 */
export const CABECEO_MAXIMO_DE_LA_FRUSTRADA = (12 * Math.PI) / 180;
/** Lo deprisa que sube la actitud pedida, rad/s: el ritmo de rotar. */
export const RITMO_DE_LA_FRUSTRADA = (3 * Math.PI) / 180;
/** Lo que el ala se queda del avisador como poco, rad. */
export const MARGEN_AL_AVISADOR = (4 * Math.PI) / 180;

/**
 * Un paso de la ley. Todo en SI y en radianes.
 *
 * @param {{
 *   cabeceo: number, ritmo: number, alfa: number, avisador: number,
 *   indicada: number, minima: number, referencia: number, acumulado: number,
 *   palanca: number, dt: number, ganancia?: number, mano?: number,
 *   ley?: { cabeceo: number, techo: number, margen: number, acerca?: number, amortigua?: number },
 * }} p `ritmo`, lo que sube el morro sobre el horizonte (rad/s); `minima`, la
 *   indicada de la frustrada con los flaps de ahora; `referencia` y
 *   `acumulado`, lo que devolvió el paso anterior (al empezar, el cabeceo y la
 *   palanca de la final); `palanca`, la que lleva el avión; `ley`, la de los
 *   reactores (`LEY_DEL_REACTOR`) o, sin ella, la de las hélices.
 * @returns {{ palanca: number, referencia: number, acumulado: number }}
 */
export function palancaDeLaFrustrada(p) {
  // Las constantes de arriba, repetidas aquí porque esto viaja como texto.
  const tope = p.ley?.cabeceo ?? (8 * Math.PI) / 180;
  const techo = p.ley?.techo ?? (12 * Math.PI) / 180;
  const ritmo = (3 * Math.PI) / 180;
  const margen = p.ley?.margen ?? (4 * Math.PI) / 180;
  const ganancia = p.ganancia ?? 1;
  const mano = p.mano ?? 1;
  const dt = Math.max(0, p.dt);
  const sobra = p.avisador - p.alfa;
  // La actitud a la que se va: la de la frustrada, menos lo que falte de
  // velocidad y más lo que sobre, hasta la de subida.
  const sobraVelocidad = p.indicada - p.minima;
  const quiere = Math.min(
    techo,
    tope +
      (sobraVelocidad < 0 ? 2 * sobraVelocidad : sobraVelocidad) * (Math.PI / 180),
  );
  // Y los últimos grados, frenando, si la ley lo pide: ver `LEY_DEL_REACTOR`.
  const acerca = p.ley?.acerca ?? 0;
  const ritmoAhora = acerca > 0 ? Math.min(ritmo, Math.abs(quiere - p.referencia) / acerca) : ritmo;
  let referencia =
    p.referencia + Math.max(-ritmoAhora * dt, Math.min(ritmoAhora * dt, quiere - p.referencia));
  // Y con el ala cerca del avisador, ni un grado más de morro que el que ya lleva.
  if (sobra < margen) referencia = Math.min(referencia, p.cabeceo);
  const error = referencia - p.cabeceo;
  const acumulado = Math.max(-0.6, Math.min(0.6, p.acumulado + ganancia * error * 1.5 * dt));
  const quiereLaMano =
    acumulado +
    ganancia * (error * 4 - p.ritmo * (p.ley?.amortigua ?? 1.5)) -
    ganancia * Math.max(0, margen - sobra) * 8;
  const cabe = mano * dt;
  const palanca = p.palanca + Math.max(-cabe, Math.min(cabe, quiereLaMano - p.palanca));
  return { palanca: Math.max(-1, Math.min(1, palanca)), referencia, acumulado };
}
