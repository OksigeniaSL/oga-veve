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
  | "sinpermiso";

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
