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
 * Lo que se quema ahora mismo, en kilos por segundo.
 *
 * `empuje` es el que está dando el avión **de verdad**, en newtons, no el
 * que pediría el mando a nivel del mar.
 */
export function quemaPorSegundo(
  avion: AircraftConfig,
  empuje: number,
): number {
  const especifico = POR_NEWTON_Y_HORA[avion.sound.engine];
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
  const parte = avion.sound.engine === "turbofan" ? 0.33 : 0.14;
  return avion.mass * parte;
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
 * **Lo del viaje más la reserva**, que es como se carga un avión de verdad y
 * es la única parte de esto que enseña algo. La reserva son cuarenta y cinco
 * minutos al consumo de crucero: el número de la ley, el mismo en Europa y
 * en América, y el que evita que un desvío o una espera se conviertan en una
 * emergencia.
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
 * La reserva de este avión, en kilos.
 *
 * Los cuarenta y cinco minutos de ley al consumo de crucero, que es con lo
 * que se calculan de verdad: un plan de vuelo no dice «cuarenta y cinco
 * minutos», dice los kilos que son cuarenta y cinco minutos, y ese número se
 * decide en tierra y ya no se toca.
 *
 * Por eso el instrumento pinta la franja ámbar aquí y no donde caiga según lo
 * que se esté gastando ahora: una raya que se mueve con el acelerador no es
 * una raya, y lo que hay que ver bajar es la barra, no la meta.
 */
export function reservaEnKilos(avion: AircraftConfig): number {
  return quemaPorSegundo(avion, avion.maxThrust / 3) * RESERVA_SEGUNDOS;
}

export function cargaParaLaRuta(
  avion: AircraftConfig,
  /** Lo que se va a volar, en metros. Un circuito son unos pocos miles. */
  metros: number,
): number {
  // `maxThrust` ya es el de todos los motores juntos. Ver la cabecera.
  const crucero = quemaPorSegundo(avion, avion.maxThrust / 3);
  const viaje = crucero * cuantoDura(avion, metros);
  return Math.min(loQueCabe(avion), viaje + crucero * RESERVA_SEGUNDOS);
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
 * por eso es ámbar y no rojo — el rojo es para cuando ya no quedan ni los
 * cuarenta y cinco minutos de ley.
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
 * «cuarenta y cinco minutos», dice los kilos que son cuarenta y cinco minutos
 * al consumo de crucero, y ese número se decide en tierra y ya no se toca. Se
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
