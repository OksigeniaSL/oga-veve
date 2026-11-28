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
 *
 * **Y a ras de suelo, como mucho una toma firme** (H34f). El medio segundo de
 * suelo era lo que hacía tocar duro: pasado el punto, a metro y medio de
 * ruedas pedía 3 m/s —lo que queda entre medio segundo—, y más arriba la
 * senda entera; en la tanda 20 el JAZ 120 empujó el morro de 0° a −2,8° en los
 * últimos cuatro metros y tocó a 2,59 m/s, con la rueda de morro por delante.
 * El manual no pide eso: «Do not allow the airplane to float or attempt to
 * hold it off» es no sostenerlo, no tirarlo al suelo; la recogida es subir el
 * morro dos o tres grados a los treinta pies y el gas al ralentí, y tocar no
 * por debajo de la Vref menos cinco (el mismo FCTM). Lo normal de un avión de
 * línea al tocar son de dos a cuatro pies por segundo, y diez ya es duro (ver
 * `aterrizaje.ts`, con las series de cargas en servicio de la FAA y la CS
 * 25.473). Así que por debajo de los treinta pies —donde el manual recoge y
 * quita el gas, y el banco también lo quita— lo que pide el punto es, como
 * mucho, la bajada de la senda repartida en lo que queda hasta el suelo, y en
 * el suelo esos cuatro pies por segundo: una toma firme y no dura. Por encima,
 * como antes, la senda: es donde el punto le quita al avión lo que flota con
 * energía de más. Medido en la mesa de la prueba (el JAZ 120 con veinte nudos
 * de cara, doscientas finales con σ_w 1): las de más de 2 m/s, de 35 a 23; las
 * pasadas de 600 m, de 4 a 7; el morro al tocar, de 0,3° a 1,7° como poco.
 * Repartirlo desde donde empieza la recogida, y no desde los treinta pies,
 * quitaba más duras (20) pero flotaba más (12). Sin `altura`, como antes.
 *
 * **Y el punto, dentro de la zona de toma del juego** (H108). Los 1.500 pies
 * son 457 m, y la zona que mira el juego —`finDeLaZonaDeToma` en
 * `flight/toma-larga.ts`, la visada y doscientos metros sin pasar del primer
 * tercio— acaba en 600 m en las pistas de 2.400 o más, pero en 500 en La
 * Palma: el punto quedaba a 43 m del final de la zona, y el JAZ 110 tocó allí
 * a 560 m, toma larga y sin gafas. Así que el punto se queda ciento cincuenta
 * metros dentro de la zona —dos segundos del 787 por el suelo—: en las pistas
 * de 2.400 m o más, 450 m, siete menos que antes; en La Palma, 350, cincuenta
 * pasada la visada.
 * Es lo que hace quien vuela ese avión ahí: el punto de toma sale de la pista
 * que tiene delante, y la AC 91-79A lo dice de las dos maneras —el objetivo,
 * unos mil pies; el típico, en el primer tercio y a veces más allá de esos
 * mil—. En la mesa de la recogida (`recogida-del-banco.test.mjs`: el modelo,
 * el automático, las rachas del juego, cien finales del JAZ 110 en La Palma
 * con 035/10), las pasadas de la zona de 500 m bajan de 29 a 7 y las duras
 * de 9 a 7; en Los Rodeos y Gran Canaria, con el JAZ 90, el 787 y el 747,
 * ninguna pasada de más y ninguna dura de más que una. Lo que todavía flota
 * pasada la zona se va al aire: ver `al-aire-por-larga.mjs`. Sin `zona`, el
 * punto de antes.
 * @param {{
 *   pide: number,       // lo que pide el perfil, m/s, negativo bajando
 *   ruedas: number,     // m sobre la pista
 *   pasado: number,     // m pasado el umbral de aterrizar
 *   porElSuelo: number, // m/s
 *   caida: number,      // lo que bajaba la senda al empezar a recoger, m/s
 *   altura?: number,    // m de ruedas a los que empezó la recogida (H34f)
 *   zona?: number,      // m pasado el umbral donde acaba la zona de toma del juego (H108)
 * }} p
 * @returns {number | null}
 */
export function pideAlPuntoDeToma(p) {
  // Los ciento cincuenta metros dentro de la zona, aquí porque esto viaja como texto.
  const punto = Math.min(1500 * 0.3048, (p.zona ?? Infinity) - 150);
  const quedan = Math.max(0.5, (punto - p.pasado) / Math.max(1, p.porElSuelo));
  // Los cuatro pies por segundo de una toma firme, repetidos aquí porque esto viaja como texto.
  const firme = 4 * 0.3048;
  // Y los treinta pies de la recogida del manual, por lo mismo.
  const recogeDesde = Math.min(p.altura ?? 0, 30 * 0.3048);
  const tope =
    recogeDesde > 0
      ? Math.max(
          -p.pide,
          firme + (Math.max(firme, p.caida) - firme) * Math.min(1, Math.max(0, p.ruedas) / recogeDesde),
        )
      : Math.max(-p.pide, p.caida);
  const alPunto = -Math.min(Math.max(0, p.ruedas) / quedan, tope);
  return alPunto < p.pide ? alPunto : null;
}

/**
 * **El gas de un reactor en la recogida** (H55c): el de la senda hasta los
 * treinta pies, y al ralentí desde ahí **o desde que flota**, sin volver.
 *
 * El banco lo quitaba solo con la altura, a los treinta pies, que es donde lo
 * quita el automático de gases de un Embraer o de un Boeing. Pero si una
 * racha lo sube al empezar a recoger, o la recogida se pasa, el avión deja de
 * bajar por encima de los treinta pies y el gas de la final se queda puesto:
 * en la primera tirada de H53 el JAZ 120 casi se niveló a diez metros con
 * 0,30 de gas tres segundos y medio, y en la mesa de H55b, con las alas
 * sostenidas y a 142 nudos, una final de sesenta empezó a recoger a 12,2 m,
 * una racha la llevó de 150 a 157 nudos, dejó de bajar y flotó medio
 * kilómetro con él puesto, hasta los 814 m. El manual lo quita al empezar la
 * recogida, no a una altura: «after the flare is initiated, smoothly retard
 * the thrust levers to idle […] Ideally, main gear touchdown should occur
 * simultaneously with thrust levers reaching idle», y «Do not allow the
 * airplane to float» (Boeing, *777/787 Flight Crew Training Manual*, FCT
 * 777/787 (TM), rev. 14, 2021, pp. 6.9-6.10).
 *
 * Como en el bimotor (H45b), desde que ha flotado una vez el gas de la senda
 * ya no vuelve. Lo que es flotar, en `flotaElReactor`. Sin nada de fuera: el
 * banco lo copia a la página como texto.
 *
 * @param {{
 *   gas: number,     // el de la senda, al empezar a recoger
 *   ruedas: number,  // m sobre la pista
 *   floto: boolean,  // si en esta recogida ya ha flotado (`flotaElReactor`)
 * }} p
 * @returns {number} el gas, de 0 a 1
 */
export function gasDelReactorEnLaRecogida(p) {
  // Los treinta pies del *retard*, repetidos aquí porque esto viaja como texto.
  const retard = 30 * 0.3048;
  return p.floto || !(p.ruedas > retard) ? 0 : p.gas;
}

/**
 * **Si un reactor flota en la recogida**: si baja menos de la mitad de lo que
 * pide el perfil **y va más deprisa que cuando empezó a recoger**.
 *
 * No es la holgura del bimotor —bajar seis décimas de metro por segundo menos
 * de lo pedido, `FLOTA` en `gas-de-la-recogida.mjs`—, porque el perfil del
 * reactor no empieza en lo que baja el avión sino en lo que baja la senda
 * (H32c): un 747 al que el automático acaba de sacar de una racha empieza a
 * recoger bajando un metro por segundo menos que la senda, y con la holgura
 * del bimotor se le quitaba el gas en el primer fotograma. Medido en la mesa
 * de `recogida-del-reactor.test.mjs` (el JAZ 120 a 142 nudos con el punto de
 * toma, sesenta finales): en 25 de las 29 finales a las que cambiaba el gas
 * salía al empezar a recoger, y las de más de 2 m/s pasaban de 7 a 11, la
 * peor de 2,94 a 3,51 m/s, más que una toma dura de transporte.
 *
 * **Y con energía de sobra**, porque lo que el manual llama flotar es eso: el
 * avión que se queda en el aire porque lleva más velocidad de la que va a
 * gastar. Sin mirarla, el gas salía también en un globo que ya iba perdiendo
 * velocidad, que es justo cuando se necesita: en la mesa de H55b con las alas
 * sostenidas, el JAZ 110 con rachas de σ_w 1,5 (semilla 30) subió ocho metros
 * al empezar a recoger, se le quitó el gas arriba, tocó a 138 nudos y a
 * **9,25 m/s**; con el gas de antes, a 146 y 3,73. Con las dos condiciones, en
 * esa mesa (200 finales por avión, veinte nudos de cara en Gran Canaria y doce
 * en Los Rodeos), las tomas pasadas de los 600 m del 747 bajan de 6 a 4 con
 * σ_w 1 y de 5 a 3 con 1,5, la más larga de 871 a 653 m y de 1.565 a 784, y
 * la más dura queda igual. Sin nada de fuera: el banco lo copia a la página.
 *
 * @param {{
 *   vertical: number,  // m/s contra la pista, positivo subiendo
 *   pide: number,      // lo que pide el perfil, m/s, negativo bajando
 *   verdadera: number, // m/s
 *   alEmpezar: number, // la verdadera al empezar a recoger, m/s
 * }} p
 * @returns {boolean}
 */
export function flotaElReactor(p) {
  return p.vertical > p.pide / 2 && p.verdadera > p.alEmpezar;
}

/**
 * **Lo que le falta al morro para la actitud de la recogida, bajo el punto de
 * toma** (H34h), rad: cero si va en ella o por encima. Se suma a la palanca
 * pasado a ella con el cabeceo del avión, como lo demás de la recogida.
 *
 * El punto de toma (H53) le quita a la recogida lo que flota, y lo hacía
 * deshaciéndola: en el navegador, el 747 se nivelaba a dos metros y medio
 * —una racha en la recogida y la ley que tira de más—, el punto pedía hasta
 * 1,9 m/s y la palanca bajaba el morro de 4° a 1,3–1,9° en tres segundos;
 * luego la racha se iba o la velocidad no daba, y desde dos metros, con el
 * morro abajo, el ala de sesenta metros ya no llegaba a recoger otra vez: 2,03
 * m/s en Tukã con la pista ocupada (H34g) y 2,54 en Gran Canaria (H34h). El
 * manual recoge subiendo el morro dos o tres grados y, después, «make small
 * pitch attitude adjustments to maintain the desired descent rate to the
 * runway. Hold sufficient back pressure on the control column to keep the
 * pitch attitude constant», «Avoid rapid control column movements during the
 * flare»; y para no flotar, «Fly the airplane onto the runway at the desired
 * touchdown point» (Boeing, *777/787 Flight Crew Training Manual*, FCT
 * 777/787 (TM), rev. 14, 2021, pp. 6.9-6.10): quitar la recogida que sobra,
 * no deshacerla. Así que, mientras manda el punto, el morro no baja de la
 * actitud con la que empezó a recoger más esos dos grados.
 *
 * En la mesa de la recogida (el JAZ 120 con veinte nudos de cara, a la Vref
 * más diez, doscientas finales con σ_w 1), las de más de 2 m/s pasan de 21 a
 * 16 y las pasadas de 600 m de 4 a 5; con la pista bajando un 0,4 %, como la
 * 03 de Gran Canaria, de 39 a 23 y de 10 a 14. Con rachas de σ_w 1,5 se cambia
 * duras por largas (de 56 y 7 a 51 y 15). Con tres grados en vez de dos, menos
 * duras y más largas todavía. Sin nada de fuera: el banco lo copia a la página.
 *
 * **Y al que flota no se le sube el morro para sostenerlo** (H111). Esos dos
 * grados son los de una recogida que ya se hizo, y el suelo los pedía aunque
 * no se hubieran subido: el JAZ 110 del banco en La Palma empezó a recoger con
 * 1,3° y llegó a 3,1°, y con el punto pidiéndole bajar —la pista de la 36 cae
 * un 0,5 % por delante— el suelo le seguía subiendo el morro hacia 3,3°: de 2,0
 * a 0,4 m de ruedas en dos segundos y medio y 484 m, a dieciséis del final de la
 * zona. Eso es aguantarlo en el aire, lo que el mismo manual dice que no se
 * hace: «Do not allow the airplane to float or attempt to hold it off». Así que,
 * mientras baja menos de lo que pide el punto (`flota`), el suelo es lo que ya
 * subió recogiendo (`masAlto`), sin pasar de los dos grados ni bajar del de al
 * empezar. Al que baja lo que se le pide, lo de siempre.
 *
 * @param {{
 *   cabeceo: number,   // el morro sobre el horizonte, rad
 *   alEmpezar: number, // el de al empezar a recoger, rad
 *   masAlto?: number,  // lo más arriba que ha llevado el morro recogiendo, rad
 *   flota?: boolean,   // si baja menos de lo que pide el punto de toma
 * }} p
 * @returns {number}
 */
export function morroQueFaltaAlPunto(p) {
  // Los dos grados de la recogida del manual, aquí porque esto viaja como texto.
  const recoge = (2 * Math.PI) / 180;
  const hasta =
    p.flota && p.masAlto !== undefined
      ? Math.min(p.alEmpezar + recoge, Math.max(p.alEmpezar, p.masAlto))
      : p.alEmpezar + recoge;
  return Math.max(0, hasta - p.cabeceo);
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
 *   picado?: number,      // la palanca que pide el picado del suelo, `palancaDelSuelo` del modelo (H56); 0 si no se da
 *   cabeceo?: number,     // el morro sobre el horizonte, rad: con él, el punto no lo baja de la recogida (H34h)
 *   rec: { altura: number, caida: number, palanca: number, acumulado: number, velocidad: number, ultimo?: number, picado?: number, picadoDeLaPalanca?: number, morroAlEmpezar?: number },
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
          altura: rec.altura,
        })
      : null;
  const pide = alPunto ?? delPerfil;
  const falta =
    p.ruedas < 1.5 && alPunto === null ? Math.max(0, pide - p.vertical) : pide - p.vertical;
  rec.acumulado = Math.max(0, Math.min(2, rec.acumulado + falta * p.dt));
  // Y si flota, para el gas: ver `gasDelReactorEnLaRecogida`. La cuenta de
  // `flotaElReactor`, repetida aquí porque esto viaja como texto.
  if (p.vertical > pide / 2 && p.verdadera > rec.velocidad) rec.floto = true;
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
  /*
   * **Y lo que pica el suelo, sumado** (H56): la palanca que sostiene el morro
   * contra el picado del colchón, que es lo que hace quien sabe que el suelo
   * pica —más palanca en los últimos metros—. Menos el que ya lleve
   * `rec.palanca`: ninguno si es la media de la senda sin él, que es como la
   * da el banco (`picadoDeLaPalanca` a cero); si no se dice, el de al empezar,
   * que es lo que lleva una palanca que ya lo sostenía. Ver `palanca` abajo y
   * `momentoDelSuelo` en `src/flight/efecto-suelo.ts`.
   */
  const picado = p.picado ?? 0;
  if (rec.picadoDeLaPalanca === undefined) rec.picadoDeLaPalanca = picado;
  const calculado = Math.max(
    -0.6,
    Math.min(
      0.8,
      rec.palanca +
        (picado - rec.picadoDeLaPalanca) +
        (p.presion ?? 1) *
          (porLoQueFrena +
            porDelante +
            k * 0.035 * falta +
            k * 0.02 * rec.acumulado +
            porLoQueAcelera) -
        k * 0.4 * p.ritmoDeCabeceo,
    ),
  );
  /*
   * **Y bajo el punto de toma, el morro no baja de la recogida** (H34h): el
   * punto quita la recogida que flota, pero no deshace la actitud. Ver
   * `morroQueFaltaAlPunto`.
   */
  if (rec.morroAlEmpezar === undefined && p.cabeceo !== undefined) rec.morroAlEmpezar = p.cabeceo;
  const morroQueFalta =
    alPunto !== null && p.cabeceo !== undefined && rec.morroAlEmpezar !== undefined
      ? morroQueFaltaAlPunto({ cabeceo: p.cabeceo, alEmpezar: rec.morroAlEmpezar })
      : 0;
  const conElMorro = Math.min(0.8, calculado + k * morroQueFalta);
  const aRas = p.ruedas < 1.5 && pide - p.vertical < 0;
  /*
   * Sostener la palanca es sostener el morro: lo que pica el suelo de más
   * desde el último fotograma se le suma también a la sostenida (H56).
   */
  const picadoAntes = rec.picado ?? picado;
  const sostenida =
    rec.ultimo !== undefined
      ? Math.max(-0.6, Math.min(0.8, rec.ultimo + picado - picadoAntes))
      : undefined;
  rec.picado = picado;
  const sostiene = (falta < -0.6 || aRas) && sostenida !== undefined && alPunto === null;
  /*
   * **Y lo que se sostiene es la actitud, no la palanca** (H64): «Hold
   * sufficient back pressure on the control column to keep the pitch attitude
   * constant» (FCTM 777/787, p. 6.10). La palanca de ese instante puede ser la
   * de una corrección a medias: en Tukã, el 747 que se había nivelado a trece
   * metros empezó a recoger con −0,29, la del automático bajando el morro tras
   * el globo, y sostenerla dos segundos le bajó el morro de 2,7° a −0,9° y lo
   * tiró al suelo a 3,36 m/s. Así que, mientras se sostiene, el morro no baja
   * del que llevaba al empezar a sostener. La misma cuenta que `recoger` en
   * `verificar-vuelo-entero.mjs`.
   */
  let palanca;
  if (sostiene) {
    if (rec.sostenMorro === undefined) rec.sostenMorro = p.cabeceo;
    rec.sostenBase =
      rec.sostenBase === undefined
        ? sostenida
        : Math.max(-0.6, Math.min(0.8, rec.sostenBase + picado - picadoAntes));
    const caido =
      rec.sostenMorro !== undefined && p.cabeceo !== undefined
        ? Math.max(0, rec.sostenMorro - p.cabeceo)
        : 0;
    palanca = Math.min(0.8, rec.sostenBase + k * caido);
  } else {
    rec.sostenMorro = undefined;
    rec.sostenBase = undefined;
    palanca = conElMorro;
  }
  rec.ultimo = palanca;
  return palanca;
}
