/**
 * Si este avión cabe en este campo.
 *
 * > «Si un avión no [cabe] en una pista, no se ofrece. El que sí, se ofrece con
 * > sus condiciones de vuelo.»
 *
 * El hangar ofrecía **los seis aviones en los once campos**, sin mirar el sitio
 * ni una sola vez, y el sitio se podía cambiar después sin que nadie revisara el
 * avión. Medido con las cuentas del propio juego: el JAZ 120 necesita 2.562
 * metros y La Palma tiene 2.202, así que el juego lo colocaba, la torre lo
 * autorizaba y el avión se salía por el final. Está en el banco: percance
 * «fuera», y quien lo jugó lo dijo con otras palabras — «vaya locos».
 *
 * ## Qué es caber
 *
 * Cuatro cosas, y las cuatro tienen que darse:
 *
 * - **La pista es bastante larga, para despegar y para aterrizar.** Cada
 *   maniobra con su distancia publicada y su margen de verdad: la distancia
 *   de despegue por el margen de su clase tiene que caber en la TORA, y la de
 *   aterrizaje en el 60 % de la LDA en un reactor y en el 70 % en los demás
 *   (Reglamento (UE) 965/2012, CAT.POL.A.230 y CAT.POL.A.330). Ver
 *   `pistaQueNecesita`. Con las distancias declaradas de su AIP y no con el
 *   largo del asfalto, que no siempre se puede usar entero: en Fuerteventura,
 *   despegando por la 19, sobran mil metros que no son pista para eso.
 * - **La pista es bastante ancha.** Una pista tiene que dar para maniobrar con
 *   la envergadura que se lleva. Las anchuras normalizadas de OACI van por
 *   clave de referencia, y la regla de andar por casa que sale de ellas es que
 *   el ancho de pista no baja de un tercio de la envergadura.
 * - **Se puede dar la vuelta al final.** Un avión que entra en pista por la
 *   mitad tiene que poder volver a la cabecera, y eso es un giro de ciento
 *   ochenta grados cuyo radio sale de su batalla. En una pista más estrecha que
 *   ese giro, el avión no cabe aunque la longitud le sobre.
 * - **Los bomberos pueden atenderlo**, si lleva pasaje. Cada aeródromo tiene
 *   bomberos para el avión más grande que recibe, y publica su categoría; un
 *   avión de línea va adonde su categoría, o una menos, está cubierta. Lo
 *   pidió Enrique al ver la tabla: «pues aplica la regla de los bomberos».
 *   Ver `flight/bomberos.ts`.
 *
 * ## Con qué cabecera
 *
 * Con la mejor de cada campo para cada maniobra, en aire en calma: es lo que
 * pide la norma para despachar un vuelo —que la toma quepa en «la pista más
 * favorable en aire en calma», CAT.POL.A.230 b 1— y es lo que dice si ese
 * avión opera en ese campo. Qué cabecera da hoy el viento y si con ella cabe
 * es la cuenta del día, que se hace antes de salir: ver `pistaNecesariaHoy`.
 *
 * ## Y lo que no se comprueba aquí
 *
 * La altitud del campo, la temperatura, el viento, la pendiente y el peso de
 * cada vuelo. Mueven la cuenta de verdad —es la lección de «pesado, caliente,
 * alto y corto»—, pero cambian de un día a otro y de un vuelo a otro, y qué
 * avión se ofrece en un campo no puede cambiar con ellos: se decide con la
 * masa de la ficha, que es la del vuelo típico, al nivel del mar y en un día
 * de tablas. Lo de cada día lo cuenta `pistaNecesariaHoy`, con el peso de lo
 * que se lleva en los depósitos.
 */

import type { AircraftConfig } from "./aircraft";
// Solo el tipo: se borra al compilar, así que no ata `flight` a `world`.
import type { Scenario } from "../world/scenarios";
import { pistaQueNecesita } from "./carrera";
import { GIRO_DE_MORRO } from "./fdm";
import type { Superficie } from "../world/superficie";
import { umbralPublicado } from "../world/umbrales-publicados";
import { bomberosDe } from "../world/bomberos-publicados";
import { categoriaQueAcepta } from "./bomberos";

/** Lo que hace falta saber de un campo para decidir. */
export interface Campo {
  /** Lo que mide la pista más larga, en metros. */
  readonly largo: number;
  /** Y lo que mide de ancho. */
  readonly ancho: number;
  readonly superficie: Superficie;
  /**
   * La mejor TORA de sus cabeceras, m: la pista que se puede correr
   * despegando. Sin ella, el largo: un campo que no sale en ningún AIP.
   */
  readonly tora?: number;
  /** Y la mejor LDA, m: la pista para aterrizar. Sin ella, el largo. */
  readonly lda?: number;
  /**
   * La categoría de sus bomberos, de su AIP: 0 si no tiene. Sin ella —un
   * escenario inventado, sin aeródromo—, la regla de los bomberos no se mira.
   * Ver `world/bomberos-publicados.ts`.
   */
  readonly bomberos?: number;
}

/** Por qué no cabe, si no cabe. */
export type PorQueNo = "corta" | "estrecha" | "no-da-la-vuelta" | "bomberos";

export interface Veredicto {
  readonly cabe: boolean;
  readonly porQueNo: PorQueNo | null;
  /** Lo que necesita y lo que hay, para poder enseñarlo sin palabras. */
  readonly necesita: number;
  readonly hay: number;
}

/**
 * El radio más cerrado que puede dar este avión, en metros.
 *
 * La geometría es la de un coche: `R = batalla / tan δ`. El ángulo de la rueda
 * de morro se **importa** del motor de vuelo y no se copia aquí, que si no esto
 * diría que cabe y el avión no daría la vuelta.
 */
export function radioDeGiro(a: AircraftConfig): number {
  return a.batalla / Math.tan(GIRO_DE_MORRO);
}

export function cabeEn(a: AircraftConfig, campo: Campo): Veredicto {
  const pide = pistaQueNecesita(a, campo.superficie);
  /*
   * Las dos maniobras, cada una contra su distancia declarada. Lo que se
   * enseña —lo que necesita y lo que hay— es el de la que va más justa, que
   * es la que decide: si no cabe, la que no cabe.
   */
  const despegar = { necesita: pide.despegar, hay: campo.tora ?? campo.largo };
  const aterrizar = { necesita: pide.aterrizar, hay: campo.lda ?? campo.largo };
  const justa =
    despegar.necesita / despegar.hay >= aterrizar.necesita / aterrizar.hay
      ? despegar
      : aterrizar;
  if (justa.necesita > justa.hay)
    return { cabe: false, porQueNo: "corta", necesita: justa.necesita, hay: justa.hay };

  const anchoQuePide = a.wingSpan / 3;
  if (anchoQuePide > campo.ancho)
    return {
      cabe: false,
      porQueNo: "estrecha",
      necesita: anchoQuePide,
      hay: campo.ancho,
    };

  /*
   * Y la media vuelta: dos radios de giro tienen que caber en el ancho de la
   * pista, con un par de metros de borde a cada lado para las ruedas de fuera.
   * Ver `esteGiro` en `fdm.ts`, que es de donde sale el radio.
   */
  const laVuelta = 2 * radioDeGiro(a) + 8;
  if (laVuelta > campo.ancho)
    return {
      cabe: false,
      porQueNo: "no-da-la-vuelta",
      necesita: laVuelta,
      hay: campo.ancho,
    };

  /*
   * **Y los bomberos**, la última: primero lo que se ve —la pista—, y después
   * lo que no se ve y también decide. Lo que pide es la categoría más baja que
   * acepta el avión, y lo que hay, la del aeródromo. Ver `flight/bomberos.ts`.
   */
  const acepta = categoriaQueAcepta(a);
  if (acepta !== null && campo.bomberos !== undefined && campo.bomberos < acepta)
    return { cabe: false, porQueNo: "bomberos", necesita: acepta, hay: campo.bomberos };

  return { cabe: true, porQueNo: null, necesita: justa.necesita, hay: justa.hay };
}

/**
 * El avión que se va a volar de verdad en ese campo: el pedido si cabe, y si
 * no, **el mayor de los que caben**.
 *
 * ## Por qué hace falta fuera del hangar
 *
 * Porque esta regla vivía solo dentro de él, escrita dos veces, y el hangar no
 * siempre se abre: con `?escenario=` en la dirección se va derecho a volar, y
 * el avión sale de la dirección o del perfil guardado. Nadie volvía a mirar si
 * cabía.
 *
 * Contado jugando: «despegar y aterrizar en La Gomera con un 747, no sé si eso
 * puede ser real, pero aquí se hace». Y no lo es: esa pista mide mil
 * doscientos cincuenta metros y ese avión necesita mil cuatrocientos
 * veinticuatro para rotar. El juego se lo permitió porque la comprobación no
 * estaba en ese camino.
 *
 * Y esto no es una manía de exactitud: es la regla de la casa —lo que se
 * enseña es real— aplicada a lo que más se nota. Un simulador donde un
 * fuselaje ancho opera en una pista de isla pequeña enseña, sin decirlo, que
 * el tamaño de la pista da igual. Y da igual de todo menos igual.
 *
 * Devuelve el mismo objeto cuando cabe, para que quien llama pueda comparar
 * por identidad y enterarse de si hubo cambio.
 */
/**
 * El campo tal como lo ve esta regla: lo que mide su pista y de qué es.
 *
 * Vivía en el hangar, y por eso la comprobación de si un avión cabe solo se
 * hacía allí. La regla y su entrada van juntas o la regla no se puede usar
 * desde ningún otro sitio — que es exactamente lo que pasó.
 */
export function campoDe(escenario: Scenario): Campo {
  const pista = escenario.aerodrome?.runways[0];
  const blanda = /grass|dirt|gravel|earth|sand|ground/i.test(
    pista?.surface ?? "",
  );
  /*
   * Las distancias declaradas de sus cabeceras, del AIP: la mejor de cada
   * una, que es la de la cabecera más favorable en aire en calma. Ver la
   * cabecera de este fichero y `umbrales-publicados.ts`.
   */
  const oaci = escenario.aerodrome?.id ?? null;
  const publicadas = Object.keys(pista?.thresholds ?? {})
    .map((cabecera) => umbralPublicado(oaci, cabecera))
    .filter((u): u is NonNullable<typeof u> => u !== null);
  const largo = escenario.runway.length;
  return {
    largo,
    ancho: escenario.runway.width,
    superficie: blanda ? "hierba" : "asfalto",
    tora: publicadas.length ? Math.max(...publicadas.map((u) => u.tora)) : largo,
    lda: publicadas.length ? Math.max(...publicadas.map((u) => u.lda)) : largo,
    // Los bomberos, de su AIP. Sin aeródromo, no se miran.
    ...(oaci ? { bomberos: bomberosDe(oaci) ?? 0 } : {}),
  };
}

export function elQueQuepa(
  pedido: AircraftConfig,
  campo: Campo,
  flota: readonly AircraftConfig[],
): AircraftConfig {
  if (cabeEn(pedido, campo).cabe) return pedido;
  const quepan = flota.filter((a) => cabeEn(a, campo).cabe);
  // El mayor de los que caben, que es el que más se parece a lo que se pidió.
  // Y si no cabe ninguno —no debería pasar—, el pedido: mejor volar algo que
  // quedarse en una pantalla en blanco.
  return quepan[quepan.length - 1] ?? pedido;
}

/**
 * De los destinos de una ruta, **los que valen para este avión**.
 *
 * La regla de arriba —«si un avión no cabe en una pista, no se ofrece»— se
 * aplicaba al campo del que se sale y a ninguno más, o sea a la mitad del
 * vuelo. Desde Los Rodeos con el de fuselaje ancho, el juego cargaba La
 * Gomera, El Hierro y La Palma, las pintaba en la carta y dejaba poner rumbo
 * a ellas — y ese avión no cabe en ninguna de las tres: pide 2.361 m de TORA
 * y la más larga, La Palma, tiene 2.200. No hay pilotaje que arregle eso, y la
 * consecuencia no enseña nada porque el error no fue de quien volaba.
 *
 * Filtrado, desde Los Rodeos el grande tiene Tenerife Sur y Gran Canaria y la
 * avioneta las cinco, que es lo que pasa de verdad: a La Gomera no va el
 * de fuselaje ancho, y por este mismo motivo.
 */
export function destinosParaEsteAvion<T extends Scenario>(
  a: AircraftConfig,
  destinos: readonly T[],
): readonly T[] {
  return destinos.filter((d) => cabeEn(a, campoDe(d)).cabe);
}
