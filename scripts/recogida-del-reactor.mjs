/**
 * **Lo que nota en el asiento un reactor en la recogida**, el término de la
 * carga de `recoger` en `verificar-vuelo-entero.mjs`. Vive aparte para poder
 * probarlo: el banco lo mete en la página tal cual, como texto, y
 * `recogida-del-reactor.test.mjs` lo vuela contra el modelo del juego.
 *
 * Cuatro centésimas de radián de ángulo por cada m/s² que falte para la
 * aceleración hacia arriba que pide el perfil, medida con la carga —`n − 1`
 * g—, pasadas a palanca con el cabeceo del avión como lo demás de la
 * recogida. Es lo que nota en el asiento un piloto al que una racha le quita
 * el ala: que se hunde antes de que lo diga el variómetro. Sin esto el lazo
 * solo veía el error de ritmo, que llega un segundo tarde; medido con la traza
 * del ala del JAZ 90 en Los Rodeos, una racha de cola de cinco metros por
 * segundo al empezar a recoger lo dejó a 0,87 g durante segundo y medio, y
 * tocó a 4,57 m/s.
 *
 * **Y en un avión grande, con su tamaño** (H46), como lo que se pide por
 * delante (`porDelante` en `recoger`): el corto período crece con el largo del
 * avión, y un ala de sesenta metros tarda el doble que la de veintiséis en dar
 * lo que se le pide. Las cuatro centésimas se afinaron con el JAZ 90, y el
 * JAZ 120 se quedaba con la mitad de lo que necesita: en la mesa de la
 * recogida (el modelo, el automático en la senda, el gas del banco y las
 * rachas del juego, σ_w 1 m/s, veinte nudos de cara en Gran Canaria,
 * doscientas finales), 51 tomas de más de 2 m/s y 44 pasadas de los 600 m; con
 * el tamaño, 20 y 14. La misma recogida fallaba por los dos lados —la racha
 * que hunde llegaba tarde al lazo, y la que sube lo hacía pasarse y flotar—, y
 * las dos cosas son lo mismo: el morro que llega tarde.
 */

/**
 * **El término de la carga, en ángulo pasado a palanca.** Sin nada de fuera:
 * el banco lo copia a la página como texto.
 *
 * @param {{
 *   porAngulo: number,   // la palanca que da un radián de ángulo, −cmα/cmδ
 *   envergadura: number, // m
 *   acelera: number,     // la aceleración hacia arriba que pide el perfil, m/s²
 *   carga: number,       // el factor de carga, g
 * }} p
 */
export function porLoQueAceleraElReactor(p) {
  const porSuTamano = Math.max(1, p.envergadura / 30);
  return p.porAngulo * 0.04 * porSuTamano * (p.acelera - (p.carga - 1) * 9.81);
}

/**
 * **Y a la pista en su punto, sin aguantarlo en el aire** (H53): lo que pide
 * bajar la recogida de un reactor para estar en el suelo al llegar al punto de
 * toma, o `null` si el perfil ya pide eso o más.
 *
 * El perfil de `recoger` reparte lo que baja la senda hasta tocar a dos pies
 * por segundo, y no mira dónde. Con el colchón del efecto suelo el avión del
 * juego se recoge casi solo —en la mesa de H53, el JAZ 120 en aire quieto sube
 * el morro tres grados con la palanca quieta en la de la senda—, y cuando una
 * racha le da energía de más, el perfil lo sostiene a medio metro mientras la
 * velocidad se va: tomas a 650–730 m y por debajo de la Vref menos cinco, de
 * doce segundos de recogida. El manual dice lo contrario: «Do not allow the
 * airplane to float or attempt to hold it off. Fly the airplane onto the
 * runway at the desired touchdown point and at the desired airspeed», y la
 * recogida de un reactor de Boeing va de 1.000 a 2.000 pies pasado el umbral
 * (Boeing, *777/787 Flight Crew Training Manual*, FCT 777/787 (TM), rev. 14,
 * 2021, pp. 6.9-6.10). El punto, a 1.500 pies, el medio de esos dos.
 *
 * Lo que se pide es lo que hay que bajar para llegar al suelo en el tiempo que
 * falta hasta el punto —medio segundo como poco, pasado ya—, y nunca más
 * deprisa que la senda de la que viene la recogida: quien flota no se tira al
 * suelo más fuerte de lo que bajaba en la final. Mientras el avión va a llegar
 * antes del punto, el perfil manda como siempre.
 * @param {{
 *   pide: number,       // lo que pide el perfil, m/s, negativo bajando
 *   ruedas: number,     // m sobre la pista
 *   pasado: number,     // m pasado el umbral de aterrizar
 *   porElSuelo: number, // m/s
 *   caida: number,      // lo que bajaba la senda al empezar a recoger, m/s
 * }} p
 * @returns {number | null}
 */
export function pideAlPuntoDeToma(p) {
  const punto = 1500 * 0.3048;
  const quedan = Math.max(0.5, (punto - p.pasado) / Math.max(1, p.porElSuelo));
  const alPunto = -Math.min(Math.max(0, p.ruedas) / quedan, Math.max(-p.pide, p.caida));
  return alPunto < p.pide ? alPunto : null;
}

/**
 * **La recogida de un reactor en el banco del cangrejo** (H46), la de
 * `recoger` en `verificar-vuelo-entero.mjs` para una pista llana y fuera de
 * Guyrami: el ritmo de
 * bajada repartido en la altura que queda, desde la palanca que llevaba el
 * automático, con un término proporcional, uno que acumula solo hacia arriba,
 * lo que pide la velocidad que se pierde, lo que pide el perfil por delante y
 * lo que nota en el asiento (`porLoQueAceleraElReactor`); amortiguado con el
 * giro del morro, y sin empujar si baja menos de lo pedido. Ver allí el porqué
 * de cada término.
 *
 * `ver-el-cruzado.mjs` recogía el JAZ 90 con la ley de la avioneta —un
 * escalón a 0,6 m/s a los 6,7 m—, que sumaba su error mientras volaba el
 * automático y lo soltaba de golpe al recoger (H43): unas veces se pasaba y
 * flotaba, otras no recogía. Sin lo sumado es peor —en la mesa toca a 4,7 m/s
 * en aire quieto—: la avioneta recogía con lo que había sumado por error.
 *
 * Sin nada de fuera más que `porLoQueAceleraElReactor`: el banco copia las dos
 * a la página como texto. Cambia `rec`: lo que acumula y la última palanca.
 *
 * @param {{
 *   ruedas: number,       // m sobre la pista
 *   vertical: number,     // m/s, positivo subiendo
 *   verdadera: number,    // m/s
 *   ritmoDeCabeceo: number, // rad/s
 *   carga: number,        // g
 *   porAngulo: number,    // −cmα/cmδ
 *   envergadura: number,  // m
 *   dt: number,           // s
 *   pasado?: number,     // m pasado el umbral de aterrizar, si se sabe (H53)
 *   porElSuelo?: number, // m/s, con `pasado`
 *   presion?: number,     // lo que pide la presión que lleva: ver `porLaPresion` en `recoger`; 1 si no se da
 *   rec: { altura: number, caida: number, palanca: number, acumulado: number, velocidad: number, ultimo?: number },
 * }} p
 * @returns {number} la palanca, de −0,6 a 0,8
 */
export function palancaDelReactorEnLaRecogida(p) {
  const rec = p.rec;
  const alSuelo = 2 * 0.3048;
  const queda = Math.max(0, Math.min(1, p.ruedas / rec.altura));
  const delPerfil = -(alSuelo + (rec.caida - alSuelo) * queda);
  // Y a la pista en su punto, si se sabe dónde está (H53): ver `pideAlPuntoDeToma`.
  const alPunto =
    p.pasado !== undefined && p.porElSuelo !== undefined
      ? pideAlPuntoDeToma({
          pide: delPerfil,
          ruedas: p.ruedas,
          pasado: p.pasado,
          porElSuelo: p.porElSuelo,
          caida: rec.caida,
        })
      : null;
  const pide = alPunto ?? delPerfil;
  const falta =
    p.ruedas < 1.5 && alPunto === null ? Math.max(0, pide - p.vertical) : pide - p.vertical;
  rec.acumulado = Math.max(0, Math.min(2, rec.acumulado + falta * p.dt));
  const k = p.porAngulo;
  const porLoQueFrena =
    k * 0.1 * Math.min(0.6, Math.max(0, (rec.velocidad / Math.max(1, p.verdadera)) ** 2 - 1));
  const acelera = ((rec.caida - alSuelo) / rec.altura) * Math.max(0, -p.vertical);
  const porDelante = k * 0.01 * Math.max(1, p.envergadura / 30) * acelera;
  const porLoQueAcelera = porLoQueAceleraElReactor({
    porAngulo: k,
    envergadura: p.envergadura,
    acelera,
    carga: p.carga,
  });
  const calculado = Math.max(
    -0.6,
    Math.min(
      0.8,
      rec.palanca +
        (p.presion ?? 1) *
          (porLoQueFrena +
            porDelante +
            k * 0.035 * falta +
            k * 0.02 * rec.acumulado +
            porLoQueAcelera) -
        k * 0.4 * p.ritmoDeCabeceo,
    ),
  );
  const aRas = p.ruedas < 1.5 && pide - p.vertical < 0;
  const palanca =
    (falta < -0.6 || aRas) && rec.ultimo !== undefined && alPunto === null
      ? rec.ultimo
      : calculado;
  rec.ultimo = palanca;
  return palanca;
}
