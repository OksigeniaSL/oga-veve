/**
 * Los percances: lo que pasa cuando algo sale mal de verdad.
 *
 * Hasta hoy no pasaba nada. Se podía atropellar al coche del «sígame», meter
 * el avión en un hangar, tomar tierra en un descampado o salirse por el final
 * de la pista, y el vuelo seguía como si tal cosa — con el avión arrastrando
 * un ala por el campo y la partida entera intacta. Y eso enseña exactamente lo
 * contrario de lo que enseña un aeropuerto: que da igual.
 *
 * Lo dijo quien lo juega: «debería pasar que si atropello al coche se vea una
 * pantalla graciosa con la avioneta rota y el conductor con cara de
 * circunstancias, y que tenga que volver a empezar la maniobra… que entienda
 * que metió la pata, sin sangre ni miembros desperdigados por ahí, pero que
 * vea que algo pasa».
 *
 * ## Las tres reglas
 *
 * 1. **El vuelo se para.** No es un aviso más: es el final del intento. Lo que
 *    hace que un error signifique algo no es el ruido que hace, es que después
 *    de él hay que volver a empezar.
 * 2. **Se cuenta con un dibujo, no con un reproche.** La avioneta con la
 *    hélice torcida y el del coche con cara de circunstancias. A los cuatro
 *    años eso se entiende entero y no da miedo; un mensaje rojo de error no se
 *    entiende y sí lo da.
 * 3. **No se quitan galones.** En aviación de verdad un galón no se pierde por
 *    meter la pata: se sube por horas y por pruebas superadas, y cuando algo
 *    sale mal lo que hay es repetir. Quien se estrelló intentando una frustrada
 *    ya se ganó el suyo, y se lo lleva.
 */

import type { Superficie } from "../world/superficie";

/** Qué salió mal. Cada uno tiene su dibujo y su frase. */
export type Percance =
  /** Se le pasó por encima al coche del «sígame». */
  | "coche"
  /** Contra un edificio: un hangar, la terminal, una casa del pueblo. */
  | "edificio"
  /** Tomó tierra fuera de la pista. */
  | "fuera"
  /** Llegó al suelo dando un golpe. */
  | "golpe"
  /** Se salió por el final de la pista, rodando. */
  | "pasada"
  /**
   * Entró en la pista sin autorización.
   *
   * En un aeropuerto de verdad esto tiene nombre propio —**incursión en
   * pista**— y es de las cosas más graves que pueden pasar en tierra, porque
   * la pista puede tener a alguien aterrizando encima. Es justo para lo que
   * existen el punto de espera, la doble raya y la lámpara de la torre.
   */
  | "sinpermiso"
  /**
   * Aterrizar en una pista ocupada, después de que te dijeran que no.
   *
   * Es el otro lado de la frustrada: la maniobra que salva existe porque a
   * veces **no se puede aterrizar**, y quien se empeña se lleva por delante lo
   * que hubiera en la pista. En un campo de hierba eso tiene cuatro patas y
   * está pastando; en un aeropuerto es otro avión que no ha salido todavía.
   *
   * No es un castigo por fallar la maniobra: es la consecuencia de haber
   * seguido bajando cuando ya te habían dicho que te fueras al aire.
   */
  | "ocupada"
  /**
   * Tomar tierra sin sacar el tren.
   *
   * Lo que en aviación se llama **aterrizaje de panza**, y es un accidente
   * con todas las letras: se va el tren, se van los motores de debajo del
   * ala y la pista se cierra. No hay avión retráctil en el mundo que no lleve
   * un aviso sonoro para esto, precisamente porque se olvida — y el juego lo
   * lleva también: `avisaDelTren` canta desde doscientos cincuenta metros
   * viniendo en final.
   *
   * Hasta hoy la toma se daba por buena y entraba en el cuaderno: «me está
   * dando por válida la toma sin que me diga nada acerca del tren de
   * aterrizaje, no lo había sacado». Un simulador que puntúa un aterrizaje de
   * panza enseña que el tren es opcional.
   */
  | "sintren"
  /**
   * **Se rompió el tren rodando deprisa por el campo.**
   *
   * Lo que no es pista, ni franja, ni hierba preparada no es sitio para
   * rodar deprisa: un surco, una piedra o la tierra blanda en la que se hunde
   * la rueda le meten al tren un golpe de abajo arriba, y a partir de cierta
   * velocidad ese golpe es más de lo que aguanta. Ver `TrenEnElCampo`.
   */
  | "tren"
  /**
   * **El agua no es un suelo.** Un avión de tierra que toca el agua —viniendo
   * del aire o rodando desde la orilla— no flota, y un helicóptero sin
   * flotadores tampoco. Ver `percanceEnElAgua`.
   */
  | "agua";

/**
 * A qué velocidad un contacto deja de ser un roce y pasa a ser un percance,
 * m/s.
 *
 * Cinco: un avión que rueda al paso y toca algo se para y ya está —eso es un
 * susto, no un accidente—, y a partir de dieciocho por hora hay daños. El
 * número importa porque sin él, arrimarse despacio a un hangar terminaría el
 * vuelo, y arrimarse despacio es justo lo que se hace en una plataforma.
 */
export const ROCE = 5;

/**
 * Régimen de descenso al tocar por encima del cual la toma es un golpe, m/s.
 *
 * Cuatro metros por segundo son doscientos cuarenta pies por minuto largos, y
 * ahí ya no se rompe nada pero se nota en los riñones. El límite de rotura de
 * verdad está más arriba y depende del peldaño; este es el de «esto no ha sido
 * un aterrizaje».
 */
export const GOLPE = 4;

/**
 * **Tocar el suelo viniendo del aire, fuera de la pista y de lo preparado.**
 *
 * Un contacto así con velocidad de vuelo o dando un golpe no es un aterrizaje:
 * es tocar el monte. Y se decide **en el instante del contacto**, que es lo
 * que no se hacía. El veredicto de la toma espera dos segundos con las ruedas
 * apoyadas —ver `DESDE_EL_CONTACTO` en `aterrizaje.ts`—, y un avión que roza
 * una ladera a ciento dieciséis metros por segundo no se queda dos segundos
 * apoyado: rebota y sigue. Medido en el banco con el JAZ 90 en Los Rodeos:
 * tocó las estribaciones de Anaga en pleno viento en cola, el plan de vuelo
 * lo dio por aterrizado y rodando a su puesto, volvió a «en vuelo» y no hubo
 * percance ninguno.
 *
 * Las tres fronteras son de verdad y ninguna es un número puesto para el
 * banco:
 *
 * - **La superficie.** Solo cuenta `campo`, lo que no está ni segado ni
 *   allanado. En una pista, en su franja, en el asfalto de una calle o en la
 *   hierba de un campo que es de hierba no hay monte que tocar: ahí juzgan
 *   el veredicto de la toma y el golpe de siempre. Así un campo de hierba de
 *   Paraguay y la zona desplazada de un umbral quedan como estaban.
 * - **La velocidad.** Por encima de la de pérdida el ala todavía lleva el
 *   avión, así que no estaba rodando por ahí: estaba volando contra el suelo.
 *   Ver `velocidadDePerdida` en `aircraft.ts`.
 * - **La caída.** Por encima de lo que aguanta el tren de este modelo, un
 *   golpe, venga a la velocidad que venga. Es el mismo número que decide el
 *   golpe en la pista: ver `FlightModel.limiteDeCaida`.
 *
 * Por debajo de las dos, tocar el campo despacio y suave sigue siendo lo que
 * era: el veredicto «fuera» de la toma, a los dos segundos.
 */
export function percanceAlTocar(c: {
  /** Si las ruedas están sobre alguna pista del vuelo, franja incluida. */
  readonly enLaPista: boolean;
  readonly superficie: Superficie;
  /** A qué velocidad se tocó, m/s. */
  readonly velocidad: number;
  /** A qué caída se tocó, m/s, positiva hacia abajo. */
  readonly caida: number;
  /** La de pérdida de este avión, m/s. */
  readonly perdida: number;
  /** La caída que rompe el tren en este modelo, m/s. */
  readonly rompe: number;
}): Percance | null {
  if (c.enLaPista || c.superficie !== "campo") return null;
  if (c.caida > c.rompe) return "golpe";
  if (c.velocidad >= c.perdida) return "fuera";
  return null;
}

/**
 * **Lo empinado de los baches de un campo**, metros que sube la rueda por
 * metro que avanza.
 *
 * **Es una simplificación, y se dice como tal.** No hay una cifra
 * certificada de a qué velocidad se rompe un tren fuera de la pista. Lo que
 * dice la certificación es lo contrario: el tren tiene que aguantar rodar por
 * «el terreno más áspero que quepa esperar en operación normal» (CS-25.235 y
 * 14 CFR 25.235; CS-23 lo pide igual para las pistas sin pavimentar), y la
 * franja de una pista se allana para que un avión que se sale la cruce «sin
 * daños estructurales» (FAA AC 150/5300-13B, la RSA). Un campo no es ni lo
 * uno ni lo otro: ahí nadie promete nada.
 *
 * Lo que sí es de verdad es **qué** rompe el tren: un golpe de abajo arriba
 * más fuerte que el que aguanta, que es lo mismo que rompe una toma dura. Una
 * rueda que avanza a `v` y pilla un surco, una piedra o un borde de tierra
 * blanda sube a `v` por lo empinado del bache, de golpe. Para la rueda de
 * morro de una avioneta —unos dieciocho centímetros de radio—, un escalón de
 * centímetro y medio ya la hace subir en un ángulo de veinticuatro grados, y
 * eso son cuatro décimas; en tierra blanda la rueda se hunde y el escalón es
 * de palmos. Tres décimas es el bache corriente de un campo sin preparar, no
 * el peor.
 *
 * Con el tren del peldaño de arriba —seis metros por segundo, ver
 * `FlightModel.limiteDeCaida`—, se rompe por encima de veinte metros por
 * segundo: setenta y dos por hora, treinta y nueve nudos. **Rodar a ochenta
 * por un campo rompe el tren**, que es la lección; rodar al paso por la
 * hierba de al lado de una calle, no.
 */
export const PENDIENTE_DEL_CAMPO = 0.3;

/**
 * Cuánto tiempo seguido deprisa por el campo hace falta para encontrar el
 * bache, s.
 *
 * Un campo tiene un surco cada pocos metros, y a la velocidad que rompe eso
 * son unas décimas. El número evita además que el borde de una calle, que el
 * avión pisa y deja en un fotograma, cuente como haber rodado por el campo.
 */
export const HASTA_EL_BACHE = 0.3;

/**
 * **La velocidad por el suelo que rompe el tren en el campo**, m/s.
 *
 * El golpe que se lleva la rueda es la velocidad por lo empinado de lo que
 * pisa: los baches del campo y, encima, la cuesta por la que va —entrar desde
 * la franja, que es llana, en una ladera es subir de golpe esa cuesta, y en
 * una ladera los baches de cara a la subida son más empinados—. Se rompe
 * cuando eso pasa de lo que aguanta el tren de este modelo: `rompe`, el mismo
 * número que decide el golpe al tocar.
 */
export function velocidadQueRompeElTren(rompe: number, cuesta: number): number {
  return rompe / (PENDIENTE_DEL_CAMPO + Math.abs(cuesta));
}

/**
 * **El tren rodando por el campo**: cuánto lleva deprisa por donde no se
 * rueda, y si ya se ha roto.
 *
 * Se gradúa como todo lo que rompe el avión, con la caída que aguanta el tren
 * en cada peldaño —`limiteDeCaida`, que crece con `crashTolerance`—: en
 * Taguató Ruvichá, veinte metros por segundo; en Taguató, casi cuarenta; en
 * Tukã, más de sesenta, que en una avioneta es ir volando. **En Guyrami no se
 * rompe nunca**, como no se rompe nada en ese peldaño (ver el final de
 * `ArcadeFlightModel.step`): ahí rodar por el campo traquetea, frena y
 * suena, y el tractor lo devuelve a la raya.
 */
export class TrenEnElCampo {
  private deprisa = 0;

  /** Un paso. Devuelve si en este se rompió el tren. */
  paso(
    dt: number,
    c: {
      /** Si las ruedas están sobre alguna pista del vuelo, franja incluida. */
      readonly enLaPista: boolean;
      readonly superficie: Superficie;
      readonly enElSuelo: boolean;
      /** Velocidad por el suelo, m/s. */
      readonly velocidad: number;
      /** La cuesta por la que va, m por m, en el sentido de la marcha. */
      readonly cuesta: number;
      /** La caída que rompe el tren en este modelo, m/s. */
      readonly rompe: number;
      /** Si en este peldaño se puede romper algo. En Guyrami, no. */
      readonly sePuedeRomper: boolean;
    },
  ): boolean {
    const enElCampo =
      c.sePuedeRomper && c.enElSuelo && !c.enLaPista && c.superficie === "campo";
    if (!enElCampo || c.velocidad <= velocidadQueRompeElTren(c.rompe, c.cuesta)) {
      this.deprisa = 0;
      return false;
    }
    this.deprisa += dt;
    return this.deprisa >= HASTA_EL_BACHE;
  }

  reiniciar(): void {
    this.deprisa = 0;
  }
}

/**
 * **Si tocar lo que hay debajo es tocar el agua.**
 *
 * Hasta hoy el agua era un suelo más a su cota —ver `Terrain.sampleSurface`—
 * y el avión se posaba en el mar y rodaba por él. Un avión de tierra no
 * flota: lo que se ve el día que pasa de verdad es un avión hundiéndose hasta
 * las alas, y es lo que cuenta el dibujo.
 *
 * Da igual cómo se llegue —del aire, a cualquier velocidad, o rodando desde
 * la orilla—, y da igual el peldaño, como el resto de lo que se toca fuera de
 * la pista: en Guyrami tocar el campo volando ya es un percance, y el agua
 * también.
 *
 * Dos cosas no son nunca agua, diga lo que diga el mapa de alturas: **la
 * pista con su franja y lo pavimentado**. El mapa va a treinta metros por
 * muestra, y en las pistas que acaban junto al mar —La Gomera, Gran Canaria—
 * la orilla interpolada no puede comerse la franja. Ver `agua.test.ts`.
 *
 * `flotadores` es para el avión o el helicóptero que los lleve: posarse en el
 * agua es otra lección, y todavía no hay ninguno en la flota que los lleve.
 */
export function percanceEnElAgua(c: {
  /** Si lo que hay debajo es agua. Ver `Terrain.esAgua`. */
  readonly agua: boolean;
  readonly enElSuelo: boolean;
  /** Si las ruedas están sobre alguna pista del vuelo, franja incluida. */
  readonly enLaPista: boolean;
  readonly superficie: Superficie;
  readonly flotadores: boolean;
}): boolean {
  return (
    c.agua &&
    c.enElSuelo &&
    !c.enLaPista &&
    c.superficie === "campo" &&
    !c.flotadores
  );
}
