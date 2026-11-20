/**
 * **El gas de un bimotor de hélice en la recogida**, el del piloto del vuelo
 * entero (`recoger` en `verificar-vuelo-entero.mjs`). Vive aparte para poder
 * probarlo: el banco lo mete en la página tal cual, como texto, y
 * `gas-de-la-recogida.test.mjs` lo vuela contra el modelo del juego.
 *
 * Un bimotor de hélice no corta el gas al empezar a recoger: lo va quitando,
 * y llega al ralentí al tocar (H34d, ver el comentario de `recoger`). Se
 * quitaba **solo con la altura**: el gas de la senda por la parte que quedaba
 * de la altura de la recogida. Mientras el avión baja es lo mismo; pero si
 * deja de bajar —se pasa un poco al recoger, o una racha lo sube—, la altura
 * no cambia y el gas de la senda se queda puesto. Con la palanca sostenida,
 * que es lo que hace la recogida cuando el avión baja menos de lo pedido, eso
 * es volar nivelado a seis u ocho metros con el gas de una final: el avión
 * frena lo que frenaría bajando la senda, unos 0,4 m/s², y no lo que frena al
 * ralentí, 1,5. El JAZ 40 de la tanda 19 recogió a 8 m y 76 m del umbral, a
 * 89 nudos, y no tocó hasta 816 m, a 76 (H45). En la mesa de la recogida, con
 * el modelo y las rachas del juego, trescientas finales: 6 tomas pasados los
 * 600 m, la peor a 1.762.
 *
 * Así que ahora se quita **también con el reloj**: nunca más que lo que deja
 * el tiempo que dura el perfil si se sigue (`duracionDelPerfil`), y lo que ya
 * se quitó no vuelve aunque el avión suba. Siguiendo el perfil no cambia nada
 * —el perfil baja más deprisa que la recta del reloj, así que manda la altura,
 * como antes—; flotando, a los cuatro o cinco segundos está al ralentí, que es
 * lo que hace cualquiera al que se le queda el avión en el aire. Lo que la
 * racha pide de más —gas entero por cada m/s que se hunde de más y por cada g
 * que falta, ver `BIMOTOR_EN_LA_RECOGIDA`— va encima, como iba.
 */

/**
 * **Lo que dura la recogida si el avión sigue su perfil**, s.
 *
 * El perfil pide bajar `alTocar + (caida − alTocar)·h/altura`: es
 * `dh/dt = −(a + b·h)`, y de `altura` a cero tarda
 * `(altura/(caida − alTocar))·ln(caida/alTocar)`. Con la recogida del JAZ 40,
 * ocho metros desde 2,4 m/s hasta 1,2, son 4,6 s.
 *
 * @param {number} altura las ruedas al empezar a recoger, m.
 * @param {number} caida lo que bajaba al empezar, m/s.
 * @param {number} alTocar lo que se busca bajar al tocar, m/s.
 */
export function duracionDelPerfil(altura, caida, alTocar) {
  const a = Math.max(0.3, alTocar);
  if (!(altura > 0)) return 0;
  if (caida <= a * 1.01) return altura / a;
  return (altura / (caida - a)) * Math.log(caida / a);
}

/**
 * **El gas de ahora**, de 0 a 1. Sin nada de fuera: el banco lo copia a la
 * página como texto.
 *
 * @param {{
 *   gas: number,          // el de la senda, al empezar a recoger
 *   quedaMasBaja: number, // la parte más baja de la altura de la recogida que se ha visto, 0–1
 *   segundos: number,     // desde que empezó la recogida, s
 *   altura: number,       // las ruedas al empezar, m
 *   caida: number,        // lo que bajaba al empezar, m/s
 *   alTocar: number,      // lo que se busca bajar al tocar, m/s
 *   falta: number,        // lo que baja de más sobre lo que pide el perfil, m/s (positivo: se hunde)
 *   carga: number,        // el factor de carga, g
 * }} p
 */
export function gasDelBimotorEnLaRecogida(p) {
  // La cuenta de `duracionDelPerfil`, repetida aquí porque esto viaja como texto.
  const a = Math.max(0.3, p.alTocar);
  let dura = p.altura / a;
  if (!(p.altura > 0)) dura = 0;
  else if (p.caida > a * 1.01) dura = (p.altura / (p.caida - a)) * Math.log(p.caida / a);
  const porElReloj = dura > 0 ? Math.max(0, 1 - p.segundos / dura) : 0;
  const queda = Math.max(0, Math.min(1, p.quedaMasBaja, porElReloj));
  const deLaRacha = Math.max(0, p.falta) + Math.max(0, 1 - p.carga);
  return Math.max(0, Math.min(1, p.gas * queda + deLaRacha));
}
