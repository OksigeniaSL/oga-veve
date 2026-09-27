/**
 * El vuelo recto mientras se mira un instrumento: solo si nadie toca nada.
 *
 * ## De dónde viene
 *
 * #70 pidió que un panel abierto no dejara caer el avión —«nunca se cae el
 * avión mientras alguien está eligiendo gorra»— y para el plano y el tiempo,
 * que no congelan el vuelo, se resolvió con una mano invisible que pone las
 * alas al horizonte y el morro sin subir ni bajar. Estaba bien pensado para
 * **mirar**, y mal para **volar**: la mano escribía encima de los mandos de
 * quien jugaba, así que con el mapa abierto las flechas no hacían nada.
 *
 * Contado jugando: «me gustaría poder volar con el mapa puesto, no me deja
 * girar, ni subir o bajar cuando tengo el mapa». Y tiene toda la razón: un
 * piloto de verdad vuela mirando la carta, y un plano que existe para ver por
 * dónde vas no puede quitarte el mando para ir a otro sitio.
 *
 * ## La regla
 *
 * La de siempre en este juego —`mandaQuienSeMueve` en `input.ts`—: **manda
 * quien se mueve**. Eje por eje, si quien juega lo está moviendo, manda su
 * mando; si lo ha soltado, la mano invisible lo tiene recto. Es lo mismo que
 * hace el teclado con un mando de juego olvidado encima de la mesa, y por el
 * mismo motivo: lo quieto no puede pisar a lo que se mueve.
 *
 * ## Y no escribe en los mandos de quien juega
 *
 * Los devolvía reescritos, y eso rompía dos cosas a la vez. La primera, que
 * el módulo de entrada no borra los mandos sino que los lleva al centro poco a
 * poco, así que al fotograma siguiente partía de lo que había escrito la mano.
 * La segunda, peor: el piloto automático se suelta cuando ve los mandos
 * movidos —`loSolto`—, y veía los de la mano. **Abrir el mapa soltaba el
 * piloto automático**, cantando la desconexión: «si pulso el botón de mapa,
 * pierdo el de piloto automático». Es la misma lección que ya dejó escrita el
 * propio piloto automático —ver `conElPilotoAutomatico` en `game.ts`—: lo que
 * gobierna el avión va en una copia, no en los mandos de la persona.
 */

import type { ControlInputs } from "./model";

/** Qué ejes está moviendo quien vuela en este fotograma. */
export interface QuienMueve {
  readonly cabeceo: boolean;
  readonly alabeo: boolean;
  readonly timon: boolean;
}

/** Lo que el vuelo necesita saber del avión para tenerlo recto. */
export interface Actitud {
  /** Alabeo, en radianes. Positivo a la derecha. */
  readonly alabeo: number;
  /** Velocidad vertical, m/s. Positiva subiendo. */
  readonly vertical: number;
}

const tope = (v: number, t: number): number => Math.max(-t, Math.min(t, v));

/**
 * Los mandos que tienen el avión recto: alas al horizonte y sin subir ni bajar.
 *
 * Se manda **inclinación**, no velocidad de alabeo, o el avión seguiría
 * girando sobre su eje: es la misma lección que el piloto del banco aprendió
 * cayendo en espiral. Y el morro amortiguado con la velocidad vertical, con
 * topes suaves: esto no es un piloto automático, es soltar la palanca de un
 * avión bien compensado.
 */
export function mandosParaIrRecto(a: Actitud): {
  aileron: number;
  elevator: number;
  rudder: number;
} {
  return {
    aileron: tope(-a.alabeo * 1.6, 0.35),
    elevator: tope(-a.vertical * 0.08, 0.3),
    rudder: 0,
  };
}

/**
 * Los mandos que van al avión con un instrumento abierto.
 *
 * Copia los de quien vuela en `salida` —que se reutiliza, para no reservar
 * memoria sesenta veces por segundo— y pone la mano invisible **solo en los
 * ejes que nadie mueve**. Los mandos de quien vuela no se tocan.
 */
export function conElVueloRecto(
  piloto: Readonly<ControlInputs>,
  mueve: QuienMueve,
  actitud: Actitud,
  salida: ControlInputs,
): ControlInputs {
  Object.assign(salida, piloto);
  const recto = mandosParaIrRecto(actitud);
  if (!mueve.alabeo) salida.aileron = recto.aileron;
  if (!mueve.cabeceo) salida.elevator = recto.elevator;
  if (!mueve.timon) salida.rudder = recto.rudder;
  return salida;
}
