/**
 * El combustible: cuánto se lleva, cuánto se gasta y cuánto queda.
 *
 * Pedido jugando, en la lista de lo que se echaba de menos: «indicador de
 * combustible y carga preprogramada para la ruta».
 *
 * ## Por qué esto enseña algo
 *
 * Porque el combustible es **la única cuenta atrás de verdad que tiene un
 * vuelo**, y porque la decisión que enseña no es «repostar»: es **la
 * reserva**. Un avión no sale con el depósito lleno ni con lo justo — sale
 * con lo del viaje más lo que hace falta para llegar al alternativo y para
 * esperar cuarenta y cinco minutos. Eso está en la ley de todos los países y
 * es la misma idea que gobierna este juego entero: se decide antes, con
 * margen, para no tener que decidir después, sin él.
 *
 * Y sale gratis de explicar: el número baja, se ve bajar, y cuando baja
 * demasiado el aviso llega **con tiempo para hacer algo**, que es lo
 * contrario de una alarma.
 *
 * ## Cómo se gasta
 *
 * Por el empuje que se está dando, no por el gas que se pide: un motor a
 * fondo arriba, donde el aire es cuarto de denso, da mucho menos empuje y
 * gasta mucho menos. Con el consumo atado al empuje, subir a volar alto sale
 * a cuenta — y eso es exactamente la lección de por qué se vuela alto.
 *
 * El número que lo ata es el **consumo específico**: kilos por newton y por
 * hora. Es el dato con el que se compara un motor con otro en cualquier
 * ficha, y por eso se pone ése y no un litro por hora inventado:
 *
 *   - **turbofán**: 0,061 — los 0,6 lb/lbf·h de un turbofán de la época del
 *     JT9D, pasados a unidades SI.
 *   - **turbohélice** y **radial**: 0,05.
 *   - **pistón**: 0,03.
 *
 * Y los tres últimos son **mucho más bajos** que el del reactor, que es lo
 * contrario de lo que parece: una hélice saca mucho más empuje de la misma
 * potencia a poca velocidad. Comprobado contra lo que gastan de verdad, con
 * el motor a un tercio de su empuje estático, que es el crucero de estos
 * aviones:
 *
 *   JAZ 20 Pykasu       26 kg/h   ·  una avioneta de escuela: 27
 *   JAZ 25 Mainumby     87 kg/h   ·  un monomotor de trabajo: 90
 *   JAZ 60 Arasunu     233 kg/h   ·  un turbohélice de 19 plazas: 200
 *   JAZ 120 Yvága   12.500 kg/h   ·  un cuatrimotor clásico: 10.500
 *
 * **Y `maxThrust` es el empuje de todos los motores juntos**, no el de uno:
 * lo dice su ficha —«cuatro turbofanes de doscientos kilonewtons» con 820.000
 * escrito— y multiplicarlo otra vez por `motores` es el error que esta cuenta
 * cometió el primer día, con un 747 gastando cincuenta toneladas a la hora.
 */

import type { AircraftConfig } from "./aircraft";
import { tramosDelPlan, type CampoDelVuelo } from "./alterno";
import { PARADO } from "./cambio-de-avion";
import { DE_SU_CLASE } from "./ficha-tecnica";
import {
  airDensity,
  GRAVITY,
  temperaturaExterior,
  velocidadDelSonido,
} from "./atmosphere";

/**
 * Consumo específico de cada clase de motor, kg por newton y por hora.
 *
 * Ver la cabecera: son los de las fichas de motor, pasados a SI.
 */
const POR_NEWTON_Y_HORA: Record<AircraftConfig["sound"]["engine"], number> = {
  turbofan: 0.061,
  turboprop: 0.05,
  radial: 0.05,
  piston: 0.03,
};

/**
 * **Dónde está el motor**: a qué Mach va y qué temperatura traga, en
 * proporción a la del día estándar al nivel del mar (θ = T/288,15 K).
 */
export interface DondeQuema {
  readonly mach: number;
  readonly theta: number;
}

/**
 * El Mach y la θ a los que vale el consumo de la tabla para un turbofán: el
 * crucero de un avión de línea, Mach 0,78 en la tropopausa.
 */
const MACH_DE_LA_TABLA = 0.78;
const THETA_DE_LA_TABLA = 216.65 / 288.15;

/**
 * **El consumo específico de este motor aquí**, kg por newton y por hora.
 *
 * El de la tabla —ver `POR_NEWTON_Y_HORA`— es el de crucero, y para la
 * hélice y el pistón se queda así: su consumo va con la potencia y la cuenta
 * de este juego ya lo mide por el empuje. El de un turbofán, no: **cuesta más
 * cada newton cuanto más deprisa va y cuanto más caliente es el aire que
 * traga**. Con la ley de un turbofán de doble flujo de Mattingly (*Elements
 * of Propulsion*, AIAA, 2006: el consumo va como `0,4 + 0,45·M` y como la
 * raíz de θ), escalada para que en crucero dé lo de la tabla: un 25 % menos
 * despegando, que son los 0,35 lb/lbf·h de un JT9D parado frente a sus 0,6
 * en crucero, y algo menos arriba que abajo a igual Mach, porque arriba hace
 * frío. El ADR 0011 lo dejó escrito como pendiente; esto es lo que faltaba
 * para que el mismo empuje gaste menos arriba, que es media lección del
 * crucero.
 *
 * Sin `donde`, el de crucero, que es con el que se planea la carga.
 */
export function consumoEspecifico(avion: AircraftConfig, donde?: DondeQuema): number {
  const tabla = POR_NEWTON_Y_HORA[avion.sound.engine];
  if (!donde || avion.sound.engine !== "turbofan") return tabla;
  const porElMach = (0.4 + 0.45 * Math.max(0, donde.mach)) / (0.4 + 0.45 * MACH_DE_LA_TABLA);
  const porElFrio = Math.sqrt(Math.max(0.5, donde.theta) / THETA_DE_LA_TABLA);
  return tabla * porElMach * porElFrio;
}

/**
 * Lo que se quema ahora mismo, en kilos por segundo.
 *
 * `empuje` es el que está dando el avión **de verdad**, en newtons, no el
 * que pediría el mando a nivel del mar. Y `donde`, a qué Mach y con qué aire:
 * ver `consumoEspecifico`.
 */
export function quemaPorSegundo(
  avion: AircraftConfig,
  empuje: number,
  donde?: DondeQuema,
): number {
  const especifico = consumoEspecifico(avion, donde);
  return (Math.max(0, empuje) * especifico) / 3600;
}

/**
 * Lo que cabe en los depósitos, en kilos.
 *
 * No es un dato que traiga la ficha de cada avión, y tampoco hace falta que
 * lo traiga: la capacidad de un avión guarda una proporción muy estable con
 * lo que pesa, porque las dos salen de para qué está hecho. Un tercio del
 * peso máximo es la proporción de un avión de transporte —el JAZ 120 sale
 * con 85 toneladas de combustible sobre 255 de peso— y la de una avioneta
 * de escuela anda por el diez por ciento.
 *
 * Se usa **sólo como tope**: lo que se carga de verdad sale de la ruta. Ver
 * `cargaParaLaRuta`.
 */
export function loQueCabe(avion: AircraftConfig): number {
  // Y si la hoja de tipo lo dice, lo que dice ella: el JAZ 110 lleva combustible
  // para un océano, más de la mitad de lo que pesa a su máximo al aterrizaje.
  if (avion.combustibleUtilizable !== undefined) return avion.combustibleUtilizable;
  const parte = avion.sound.engine === "turbofan" ? 0.33 : 0.14;
  return avion.mass * parte;
}

/**
 * **Lo que pesa el avión con estos kilos en los depósitos**, kg: su masa sin
 * combustible —el avión, la tripulación y su carga— más lo que lleve.
 *
 * Es la que vuela el modelo de vuelo y con la que se cuenta la pista de hoy:
 * un vuelo largo sale más pesado y necesita más pista, y se aterriza más
 * ligero que se despegó. Ver `masaSinCombustible` en la ficha.
 */
export function masaConCombustible(avion: AircraftConfig, kilos: number): number {
  return avion.masaSinCombustible + Math.max(0, Number.isFinite(kilos) ? kilos : 0);
}

/**
 * Cuánto se tarda en recorrer una distancia, en segundos, a su crucero.
 *
 * Con un suelo, porque **un vuelo nunca es solo crucero**: rodar hasta la
 * cabecera, subir, dar la vuelta al circuito y aproximar son minutos que no
 * cuentan un metro de ruta y sí queman. En un plan de verdad eso son tres
 * partidas —combustible de rodaje, de contingencia y de aproximación— y aquí
 * se juntan en una porque lo que enseña es que **existen**, no cómo se
 * llaman.
 *
 * Media hora, y no los diez minutos que había: con diez, una lección de
 * circuito salía con setenta minutos de autonomía y el aviso de reserva
 * entraba antes de la tercera vuelta. Media hora es además lo que tarda de
 * verdad un reactor en subir a crucero.
 */
const MANIOBRA_SEGUNDOS = 30 * 60;

function cuantoDura(avion: AircraftConfig, metros: number): number {
  const crucero = Math.max(20, avion.cruiseSpeed);
  return metros / crucero + MANIOBRA_SEGUNDOS;
}

/**
 * Cuánto se carga para este viaje, en kilos.
 *
 * **Lo del viaje más lo de reserva**, que es como se carga un avión de verdad
 * y es la única parte de esto que enseña algo. Lo de reserva son cuarenta y
 * cinco minutos al consumo de crucero —el número de la ley para los de motor
 * de pistón, y en los de turbina lo que suman la reserva final de treinta
 * minutos de espera, la contingencia y el combustible extra que se lleva por
 * si hay que esperar o desviarse—: es lo que evita que un desvío o una espera
 * se conviertan en una emergencia. Y nunca menos que la reserva final, lo que
 * cuesta un cambio y la contingencia, que en los de pistón es más que esos
 * cuarenta y cinco minutos: ver `cargaParaLaRuta`.
 *
 * Se calcula con el motor a un tercio, que es el empuje de crucero de
 * cualquiera de estos aviones: a fondo solo se está en el despegue y son dos
 * minutos.
 *
 * Y nunca más de lo que cabe: si la ruta no cabe en los depósitos, se llena.
 * Que la ruta no quepa es un problema de la ruta, y lo resuelve `cabe.ts`
 * antes de ofrecerla.
 */
export const RESERVA_SEGUNDOS = 45 * 60;

/**
 * **Lo que dura la reserva final**, s: treinta minutos de espera en un avión
 * de turbina y cuarenta y cinco en uno de pistón, que es lo que pide la OACI
 * (Anexo 6, parte I, 4.3.6.3) y en Europa EASA (CAT.OP.MPA.181): lo que tiene
 * que quedar en los depósitos al tocar, y lo único que no se gasta nunca a
 * propósito.
 */
export function duracionDeLaReservaFinal(avion: AircraftConfig): number {
  return (avion.sound.engine === "piston" || avion.sound.engine === "radial" ? 45 : 30) * 60;
}

/** A qué altura se espera para contar la reserva final: 1500 ft sobre el campo. */
const ALTURA_DE_ESPERA = 1500 * 0.3048;

/**
 * **Lo que se quema esperando**, kg/s: el avión nivelado a 1500 ft a la
 * velocidad de menos resistencia, que es como se espera de verdad —un 747 da
 * vueltas a unos 240 nudos—, por el consumo de su motor a esa velocidad.
 *
 * Con la polar de la ficha la resistencia mínima sale sola: es el peso por
 * `2·√(cd0·k)`, la que da la fineza máxima. Ver `aero` en la ficha.
 */
export function quemaEsperando(avion: AircraftConfig): number {
  const peso = avion.mass * GRAVITY;
  const ar = (avion.wingSpan * avion.wingSpan) / avion.wingArea;
  const k = 1 / (Math.PI * ar * avion.aero.oswald);
  const resistencia = peso * 2 * Math.sqrt(avion.aero.cd0 * k);
  const cl = Math.sqrt(avion.aero.cd0 / k);
  const rho = airDensity(ALTURA_DE_ESPERA);
  const v = Math.sqrt((2 * peso) / (rho * avion.wingArea * cl));
  const theta = (temperaturaExterior(ALTURA_DE_ESPERA) + 273.15) / 288.15;
  return quemaPorSegundo(avion, resistencia, {
    mach: v / velocidadDelSonido(ALTURA_DE_ESPERA),
    theta,
  });
}

/**
 * **La reserva final de este avión**, en kilos: la que pinta la franja ámbar
 * del instrumento y la que, si se empieza a gastar, convierte el vuelo en una
 * emergencia de combustible.
 *
 * Eran cuarenta y cinco minutos **al consumo de crucero con el motor a un
 * tercio a nivel del mar**, y eso en un reactor es tres veces la reserva de
 * verdad: el JAZ 120 entraba en reserva con 12.500 kilos —la captura de Gran
 * Canaria, en final con 12.478 y la barra en ámbar— cuando un cuatrimotor de
 * su clase tiene de reserva final unos cuatro o cinco mil. Ahora son los
 * treinta minutos de espera de la ley, al consumo de esperar: unos 4.000 kilos
 * en el JAZ 120, unos 450 en el JAZ 90. La avioneta, que espera cuarenta y
 * cinco minutos y gastaba lo mismo de las dos maneras, se queda como estaba.
 *
 * Es un número de tierra, que no se mueve con el acelerador: una raya que se
 * mueve con el gas no es una raya, y lo que hay que ver bajar es la barra, no
 * la meta.
 */
export function reservaEnKilos(avion: AircraftConfig): number {
  return quemaEsperando(avion) * duracionDeLaReservaFinal(avion);
}

/**
 * **Lo que cuesta un cambio**, s de espera: una vuelta más al circuito, una
 * espera, una frustrada y otra aproximación. Es lo que «minimum fuel» mira
 * que siga en el depósito encima de la reserva final —ver
 * `llamadaDeCombustible`— y por eso es también lo que se carga encima de ella.
 *
 * Un cuarto de hora para todos, que es la media reserva final de un avión de
 * turbina, lo que el aviso usaba. En los de pistón la media reserva eran
 * veintidós minutos y medio, porque la ley les pide cuarenta y cinco de reserva
 * final; pero un cambio no cuesta más minutos en una avioneta que en un
 * reactor: cuesta los mismos o menos.
 */
const LO_QUE_CUESTA_UN_CAMBIO = 15 * 60;

/** Lo que cuesta un cambio, en kilos: al consumo de esperar. */
function margenDelMinimo(avion: AircraftConfig): number {
  return quemaEsperando(avion) * LO_QUE_CUESTA_UN_CAMBIO;
}

/**
 * **La contingencia**, kg: lo que se carga para lo que no se ha previsto —un
 * viento de cara que no estaba en el parte, una vuelta de más—. La de la OACI
 * (Anexo 6, parte I, 4.3.6.3 c): el cinco por ciento del viaje, y nunca menos
 * de cinco minutos esperando a 1500 ft.
 */
function contingencia(avion: AircraftConfig, viaje: number): number {
  return Math.max(0.05 * viaje, quemaEsperando(avion) * 5 * 60);
}

export function cargaParaLaRuta(
  avion: AircraftConfig,
  /** Lo que se va a volar, en metros. Un circuito son unos pocos miles. */
  metros: number,
): number {
  // `maxThrust` ya es el de todos los motores juntos. Ver la cabecera.
  const crucero = quemaPorSegundo(avion, avion.maxThrust / 3);
  const viaje = crucero * cuantoDura(avion, metros);
  /*
   * **Y la reserva que se carga nunca es menos que la reserva final, lo que
   * cuesta un cambio y la contingencia**, contados como los cuenta el aviso.
   *
   * Los cuarenta y cinco minutos a crucero ya lo cubren de sobra en los de
   * turbina —su crucero gasta dos o tres veces lo de esperar—, y en los de
   * pistón eran la reserva final de la ley y nada más; en la avioneta, ni eso,
   * porque su crucero gasta un poco menos que esperar. Así que un vuelo local,
   * que sin tramos es la media hora de maniobra, despegaba con «minimum fuel»
   * a la vuelta de la esquina: la avioneta lo pedía a los cinco minutos, el
   * JAZ 25 a los cuatro y el JAZ 40 a los quince. Un vuelo bien preparado no
   * llega a pedirlo si va como se planeó; lo pide el que se ha alargado y se
   * ha comido lo que llevaba para un cambio. Ver
   * `combustible-del-vuelo-local.test.ts`.
   */
  const reserva = Math.max(
    crucero * RESERVA_SEGUNDOS,
    reservaEnKilos(avion) + margenDelMinimo(avion) + contingencia(avion, viaje),
  );
  return Math.min(loQueCabe(avion), loQueDejaElPeso(avion), viaje + reserva);
}

/**
 * **Lo que deja cargar el peso máximo al despegue**, kg: el de su clase menos
 * la masa sin combustible. Un despacho de verdad carga lo que pide el plan
 * hasta donde llegue el primero de los dos topes, el depósito o el peso; con
 * la gente ya a bordo no hay más. Pasa en una sola ruta: la avioneta de
 * Mariscal Estigarribia a Asunción, con su alternativo de vuelta a casa
 * —475 kilómetros cada tramo—, pide más de los 154 kilos de su depósito y en
 * el peso le caben 148: sale con el viaje, la maniobra y la reserva final, sin
 * lo de un cambio. De verdad se dejaría en tierra una mochila; aquí la gente
 * ya va puesta. Ver `peso.test.ts`.
 */
export function loQueDejaElPeso(avion: AircraftConfig): number {
  const mtow = DE_SU_CLASE[avion.id]?.mtow;
  return mtow ? Math.max(0, mtow - avion.masaSinCombustible) : Infinity;
}

/**
 * Cuánto se carga para ir a un sitio concreto, en kilos.
 *
 * **Las cuatro partidas de un despacho de verdad**, y en su orden: el tramo
 * hasta el destino, el tramo del destino a su **alternativo** —el aeródromo al
 * que se va si al llegar el destino no se puede usar—, la maniobra de rodar,
 * subir y aproximar, y los cuarenta y cinco minutos de reserva. Con el tope de
 * lo que cabe, como siempre.
 *
 * Existe porque la carga no dependía del destino: se cargaba ida y vuelta al
 * vecino **más lejano**, fuera cual fuera el elegido. Eso es cómodo y enseña
 * lo que no es: que el combustible se pide a ojo, «por si acaso». Un piloto no
 * carga para lo peor que se le ocurra; carga para lo que ha planeado **más un
 * plan B con nombre**, y el plan B es el alternativo. Que se note al elegir:
 * ir a Lanzarote pesa más que ir a Tenerife Norte, y el número lo dice.
 *
 * Sin destino —un circuito, una vuelta al campo— los dos tramos valen cero y
 * sale lo mismo que `cargaParaLaRuta` con un vuelo local.
 */
export function cargaParaElPlan(
  avion: AircraftConfig,
  tramos: {
    /** Del campo de salida al de destino, en metros. */
    readonly alDestino: number;
    /** Del destino a su alternativo, en metros. Cero si no lo hay. */
    readonly alAlterno: number;
  },
): number {
  return cargaParaLaRuta(
    avion,
    Math.max(0, tramos.alDestino) + Math.max(0, tramos.alAlterno),
  );
}

/**
 * **Lo que se carga para un ejercicio que empieza en el aire**, en kilos: el
 * vuelo que queda desde donde empieza hasta casa, el de casa a su
 * alternativo, la maniobra y la reserva. Las cuatro partidas de
 * `cargaParaElPlan`, con la salida donde de verdad empieza el vuelo.
 *
 * Existe porque un ejercicio en el aire salía con lo del tramo desde casa, y
 * sin destino eso es un vuelo local: unos minutos por encima de la reserva
 * final. La aguja empieza a seis minutos de la radio y la tormenta a ochenta
 * millas, y ese vuelo no estaba en el depósito: en la avioneta, a mitad de la
 * curva de la aguja se declaraba «minimum fuel», justo lo que una salida bien
 * preparada no hace. Lo arregló a mano la propia aguja sumando tres veces el
 * tramo; esto es lo mismo para todos, contado como se despacha un vuelo de
 * verdad: el avión que vuelve a casa desde ochenta millas salió con lo de
 * esas ochenta millas, con nombre para el plan B y con su reserva.
 *
 * Lo que el ejercicio vuela de más —rodear la tormenta, la curva del perro—
 * es lo que cubre la maniobra, que para eso está.
 */
export function cargaDelEjercicio(
  avion: AircraftConfig,
  /** Dónde empieza, en metros del mundo. */
  desde: { readonly x: number; readonly z: number },
  /** El campo de casa, donde se aterriza al acabar. */
  casa: CampoDelVuelo,
  /** Los campos del vuelo, de donde sale el alternativo de casa. */
  campos: readonly CampoDelVuelo[],
): number {
  // Una salida que no es ningún campo: así el tramo no sale local.
  return cargaParaElPlan(avion, tramosDelPlan({ id: "", x: desde.x, z: desde.z }, casa, campos));
}

/**
 * Si hay que llenar el depósito para salir a `tramo`, que pide `carga` kilos.
 *
 * Hay que llenarlo si se llenó para otro tramo **o si lo que hay no llega**.
 * Lo segundo es lo que faltaba: la clave del tramo —de dónde a dónde— dice
 * para qué se llenó el depósito, no si ese combustible sigue dentro. Quien
 * iba a Los Rodeos y se volvía a medio camino —renunciar es ganar—, tocaba
 * en casa, apagaba y arrancaba para intentarlo otra vez salía con lo que le
 * quedaba: 185 kilos de los 411 del tramo, con la reserva lista para saltar a
 * mitad de ruta. Y con circuitos seguidos en casa, apagando entre medias, el
 * depósito solo bajaba. El tramo era el mismo; el depósito, no.
 *
 * Lo que sobra no se tira: con más de lo que pide el mismo tramo se sale
 * como está.
 */
export function hayQueLlenar(
  deposito: { readonly tramo: string; readonly kilos: number },
  tramo: string,
  carga: number,
): boolean {
  return deposito.tramo !== tramo || deposito.kilos < carga;
}

/**
 * Si elegir otro destino **vuelve a cargar el depósito** para él.
 *
 * Con el avión en el suelo de un campo y parado, sí; en cualquier otro sitio,
 * no. Existe porque el destino se podía cambiar de dos maneras —en el hangar y
 * con la tarjeta del destino, en el juego— y solo la primera cargaba: la
 * tarjeta cambiaba la flecha y el depósito seguía con lo del destino de antes.
 * «No importa el destino que elija, que el combustible siempre es el mismo»,
 * con el JAZ 90 en Ciudad del Este y 4629 kilos para ir a cualquier sitio.
 * El hangar prometía una barra por destino y el avión llevaba siempre la del
 * primero.
 *
 * **Y con el motor en marcha también.** De verdad el camión no se acerca a un
 * motor encendido, y el juego ya lo respeta al apagar —ver `toggleEngine`—;
 * pero lo que se enseña aquí es la cuenta —ir más lejos pide más, y la cuenta
 * se hace en tierra, antes de salir—, no la logística de la plataforma. Pedir
 * que se apague y se vuelva a arrancar para ver cambiar un número es poner la
 * lección detrás de un trámite que a los cuatro años no se entiende. Se
 * simplifica el camión, no la cuenta.
 *
 * En el aire no: cambiar de destino volando es decidir con lo que se lleva, y
 * esa es justo la decisión que el combustible enseña. Ver `hayQueLlenar`.
 */
export function seCargaAlCambiarDeDestino(avion: {
  /** Si está en el suelo de un campo del vuelo, y no en mitad de la nada. */
  readonly enUnCampo: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly velocidad: number;
}): boolean {
  // Parado es lo mismo que para cambiar de avión: frenado en la plataforma.
  return avion.enUnCampo && avion.velocidad <= PARADO;
}

/**
 * Cuánto vuelo queda con lo que hay, en segundos.
 *
 * Al consumo de **ahora**, que es lo honesto: con el gas a fondo queda menos
 * que con el gas de crucero, y verlo cambiar al mover el mando es la mitad
 * de lo que hay que entender.
 */
export function loQueQueda(kilos: number, porSegundo: number): number {
  if (porSegundo <= 0) return Infinity;
  return kilos / porSegundo;
}

/**
 * Cuándo se avisa de que queda poco.
 *
 * Con la reserva: no cuando se acaba, sino **cuando se está empezando a
 * gastar lo que no era para gastar**. Es el aviso que da tiempo a decidir, y
 * por eso es ámbar y no rojo — el rojo es para cuando ya no queda ni un tercio
 * de la reserva final. Ver `reservaEnKilos`.
 *
 * ## Y se mide en kilos, no en minutos
 *
 * Que es lo contrario de lo que parece, porque la reserva **es** minutos. La
 * primera versión preguntaba cuánto vuelo queda al consumo de ahora, que es
 * la definición de manual, y el banco la tumbó en el primer vuelo: con el
 * motor a fondo en la carrera de despegue se quema tres veces más que en
 * crucero, así que la autonomía instantánea de cualquier avión cae por debajo
 * de los cuarenta y cinco minutos **durante el despegue**, y el aviso saltaba
 * en todos los vuelos a los veinte segundos de empezar.
 *
 * No era un fallo del número: era la pregunta. Un despacho de vuelo no dice
 * «treinta minutos», dice los kilos que son treinta minutos esperando, y ese
 * número se decide en tierra y ya no se toca. Se
 * compara contra eso. De paso, la barra del instrumento y la raya de la
 * reserva pasan a decir lo mismo, que es lo mínimo que se le pide a un
 * instrumento.
 */
export function comoVaElDeposito(
  avion: AircraftConfig,
  kilos: number,
): "bien" | "reserva" | "poco" {
  const reserva = reservaEnKilos(avion);
  if (kilos > reserva) return "bien";
  // Un tercio de la reserva: quince minutos. Por debajo ya no hay decisión que
  // tomar, hay que estar aterrizando.
  if (kilos > reserva / 3) return "reserva";
  return "poco";
}

/**
 * **Lo que se le dice a la torre del combustible**: nada, «minimum fuel» o
 * «MAYDAY FUEL».
 *
 * Son las dos llamadas de la OACI (Doc 4444 y Anexo 6, 4.3.7.2), y no son
 * lo mismo que la barra ámbar: miran **lo que quedará al tocar**, no lo que
 * queda ahora.
 *
 * - **«Minimum fuel»** es un aviso, no una emergencia: se llega bien, pero
 *   cualquier espera o cualquier cambio dejaría el avión aterrizando con menos
 *   de la reserva final. La torre lo apunta y no le mete demoras.
 * - **«MAYDAY FUEL»** es socorro: lo que quedará al tocar en el campo más
 *   cercano ya es menos que la reserva final. Prioridad sobre todos, y a ése
 *   no se le manda al aire salvo que la pista esté ocupada de verdad.
 *
 * Lo que falta hasta tocar se cuenta al consumo de esperar, que es el de
 * bajar y aproximar. Y el margen del aviso es **lo que cuesta un cambio**, un
 * cuarto de hora de espera: «minimum fuel» es aterrizar con la reserva final y
 * poco más, sin sitio para una vuelta de más (AIM 5-5-15, Doc 4444). Era media
 * reserva final, que en un avión de turbina es ese mismo cuarto de hora y en
 * uno de pistón, veintidós minutos y medio. Ver `LO_QUE_CUESTA_UN_CAMBIO`.
 */
export type LlamadaDeCombustible = "nada" | "minimo" | "mayday";

/** Lo que quedará al tocar, kg, si se tarda `segundos` en llegar. */
export function kilosAlTocar(
  avion: AircraftConfig,
  kilos: number,
  segundos: number | null,
): number {
  if (segundos === null || !Number.isFinite(segundos)) return kilos;
  return kilos - quemaEsperando(avion) * Math.max(0, segundos);
}

export function llamadaDeCombustible(
  avion: AircraftConfig,
  kilos: number,
  /** Lo que se tarda en tocar, s, o `null` si ya se está llegando. */
  segundos: number | null,
): LlamadaDeCombustible {
  const final = reservaEnKilos(avion);
  const alTocar = kilosAlTocar(avion, kilos, segundos);
  if (alTocar < final) return "mayday";
  if (alTocar < final + margenDelMinimo(avion)) return "minimo";
  return "nada";
}
