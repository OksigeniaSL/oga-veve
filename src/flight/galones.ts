/**
 * Los galones: seis por vuelo, ganados por partes y sin castigo.
 *
 * Es lo que convierte un vuelo en un ejercicio con nota. El juego ya sabía
 * medirlo todo —el veredicto de la toma, los aros cruzados y perdidos, la
 * banda de velocidad, la salida de la pista— pero no lo **juntaba**: se
 * volaba, salía mejor o peor, y no quedaba nada.
 *
 * ## Se ganan, no se pierden
 *
 * Seis galones que se encienden **durante** el vuelo, uno a uno, no una nota
 * al final. Encenderse mientras haces las cosas enseña qué las hizo bien; una
 * nota al aterrizar solo dice que algo salió regular.
 *
 * Y por eso, ganado es ganado: nada de aquí quita un galón puesto. Un vuelo
 * puede empezar bien y torcerse, y a los cuatro años quitarle a alguien lo que
 * ya se había ganado no enseña nada — enseña a no intentarlo.
 *
 * ## Y no puede castigar
 *
 * Un galón que no se ha ganado **no se enseña apagado**: sencillamente todavía
 * no está. La diferencia parece pequeña y es toda: un hueco vacío es un
 * reproche, y un galón que aparece es un premio. Aquí eso se nota en que esta
 * clase no sabe cuántos galones hay en total. Solo sabe decir cuáles hay.
 *
 * ## Nada de estrellas
 *
 * Tres estrellas de cinco es la moneda de los juegos de móvil y trae consigo
 * lo que trae: repetir hasta sacarlas. El galón es de la manga de un uniforme,
 * que es lo que se lleva quien vuela, y encaja con la escalera de tramos, que
 * ya son cuatro peldaños con nombre de ave.
 *
 * Esto no dibuja ni suena: dice qué se acaba de ganar y quien lo use decide
 * cómo se celebra.
 */

import type { Aterrizaje } from "./aterrizaje";
import type { BandaDeVelocidad } from "./velocidad-de-aproximacion";
import type { Fase } from "./vuelo";

/**
 * Un galón por cada parte del vuelo que se puede hacer bien.
 *
 * Y uno de ellos —`frustrada`— por la parte que se hace bien **no haciéndola**.
 */
export type Galon =
  "aproximacion" | "frustrada" | "toma" | "aros" | "velocidad" | "rodaje";

/** El orden en que se llevan en la manga. El de las partes de un vuelo. */
export const GALONES: readonly Galon[] = [
  "aproximacion",
  "frustrada",
  "toma",
  "aros",
  "velocidad",
  "rodaje",
];

/** Lo que ve esta clase de un fotograma. */
export interface Fotograma {
  readonly fase: Fase;
  /** En qué banda va la velocidad, o `null` si aquí no hay banda que juzgar. */
  readonly banda: BandaDeVelocidad;
  /** Rodando fuera de la raya verde. Lo dice el plan de vuelo. */
  readonly fuera: boolean;
  /** Qué pasó con un aro **en este fotograma**, si pasó algo. */
  readonly aro: "cruzado" | "perdido" | null;
  /** Y el veredicto de la toma, que llega una sola vez. */
  readonly toma: Aterrizaje;
  /** Si **en este fotograma** se ha reconocido una frustrada. Llega una vez. */
  readonly frustrada: boolean;
}

/*
 * ## Los listones
 *
 * Todos salen de la misma pregunta: ¿esto lo saca alguien de cinco años
 * haciéndolo con cuidado, y no lo saca quien va a lo loco? Si el listón lo
 * pasa cualquiera, el galón no dice nada; si no lo pasa casi nadie, deja de
 * ser un premio y pasa a ser un examen.
 */

/** Aros cruzados que hacen falta para el galón de los aros. */
const AROS_LIMPIOS = 4;

/**
 * Y cuántos se pueden perder por el camino.
 *
 * Uno. Cero sería que el primer aro fallado te cierra la puerta del resto del
 * vuelo, y eso es exactamente el castigo que aquí no toca: quien falla el
 * primero y hace los cinco siguientes bordados ha aprendido la senda.
 */
const AROS_PERDIDOS = 1;

/** Segundos de aproximación que hay que volar para que haya algo que juzgar. */
const FINAL_MINIMO = 8;

/** Y qué parte de ese rato hay que ir en la banda buena. */
const FINAL_BIEN = 0.6;

/** Segundos con la velocidad en su sitio para ganar el galón de velocidad. */
const VELOCIDAD_BIEN = 30;

/** Y cuántos se pueden ir fuera de banda antes de que deje de contar. */
const VELOCIDAD_MAL = 6;

/** Segundos rodando que hacen falta para que el rodaje cuente como rodaje. */
const RODAJE_MINIMO = 12;

/** Y cuántos se pueden ir fuera de la raya verde. */
const RODAJE_FUERA = 5;

/**
 * La cuenta de los galones de un vuelo.
 *
 * Se le da un fotograma y devuelve el galón que se acaba de ganar, o `null`.
 * Uno por fotograma: dos premios a la vez no se ven como dos premios.
 */
export class Galones {
  private readonly ganados: Galon[] = [];

  private cruzados = 0;
  private perdidos = 0;

  /**
   * El veredicto de la toma, guardado.
   *
   * Llega en **un solo fotograma** y hacen falta dos galones: el de la toma y
   * el de la aproximación, que se cierra al posarse. Como aquí se da un galón
   * por fotograma, el segundo llegaba al siguiente y para entonces el
   * veredicto ya se había ido — se ganaba la aproximación y la toma no se
   * ganaba nunca. Se queda guardado hasta el próximo vuelo.
   */
  private veredicto: Aterrizaje = null;

  /**
   * Si en este vuelo se renunció a una aproximación, guardado.
   *
   * Igual que el veredicto: llega en un fotograma y lo miran dos galones.
   */
  private renuncio = false;

  private enFinal = 0;
  private enFinalBien = 0;

  private conBanda = 0;
  private fueraDeBanda = 0;

  private rodando = 0;
  private fueraDeRaya = 0;

  /** Los que se llevan puestos, en el orden de la manga. */
  get lista(): readonly Galon[] {
    return GALONES.filter((g) => this.ganados.includes(g));
  }

  /** Un fotograma. Devuelve el galón recién ganado, si se ganó alguno. */
  paso(f: Fotograma, dt: number): Galon | null {
    this.contar(f, dt);
    for (const galon of GALONES) {
      if (this.ganados.includes(galon)) continue;
      if (!this.merecido(galon, f)) continue;
      this.ganados.push(galon);
      return galon;
    }
    return null;
  }

  /** Vuelta a empezar: otro vuelo, otros galones. */
  reiniciar(): void {
    this.ganados.length = 0;
    this.veredicto = null;
    this.renuncio = false;
    this.cruzados = 0;
    this.perdidos = 0;
    this.enFinal = 0;
    this.enFinalBien = 0;
    this.conBanda = 0;
    this.fueraDeBanda = 0;
    this.rodando = 0;
    this.fueraDeRaya = 0;
  }

  private contar(f: Fotograma, dt: number): void {
    if (f.toma) this.veredicto = f.toma;
    if (f.frustrada) this.renuncio = true;
    if (f.aro === "cruzado") this.cruzados++;
    else if (f.aro === "perdido") this.perdidos++;

    if (f.fase === "final") {
      this.enFinal += dt;
      if (f.banda === "bien") this.enFinalBien += dt;
    }

    /*
     * **La velocidad se cuenta en todo el vuelo, no solo en la aproximación.**
     *
     * `bandaDeVelocidad` habla bajando hacia el suelo y `bandaDeRodaje` habla
     * rodando; en crucero no hay banda porque no hay una velocidad correcta.
     * Así que aquí llega `null` la mayor parte del vuelo y no se cuenta: el
     * galón se gana en los ratos en los que **sí** hay una respuesta buena.
     */
    if (f.banda === "bien") this.conBanda += dt;
    else if (f.banda) this.fueraDeBanda += dt;

    // Rodar es estar en el suelo yendo o volviendo, no correr por la pista.
    if (RODANDO.has(f.fase)) {
      this.rodando += dt;
      if (f.fuera) this.fueraDeRaya += dt;
    }
  }

  private merecido(galon: Galon, f: Fotograma): boolean {
    switch (galon) {
      /*
       * Llegar en la senda y a su velocidad. Se juzga al posarse, que es
       * cuando la aproximación ha terminado de contar: antes de eso todavía
       * se puede arreglar, y premiar a mitad de final sería premiar el primer
       * tramo bueno de una aproximación que aún no ha pasado por lo difícil.
       */
      case "aproximacion":
        return (
          /*
           * **Y una frustrada cierra la aproximación igual que una toma.**
           *
           * La aproximación se juzga cuando ha terminado de contar, y termina
           * de las dos maneras: posándose o yéndose. Quien vuela una final
           * buena y decide no aterrizar ha hecho la aproximación bien —
           * exigirle además una toma sería pedirle que se quede.
           */
          (this.renuncio ||
            (this.veredicto !== null && this.veredicto !== "fuera")) &&
          this.enFinal >= FINAL_MINIMO &&
          this.enFinalBien >= this.enFinal * FINAL_BIEN
        );

      /*
       * **La frustrada, que es la regla número uno de este juego.**
       *
       * Sin listón: haberla hecho ya es haberla ganado. No hay una frustrada
       * bien y otra mal — irse al aire cuando la cosa no sale es siempre la
       * decisión buena, y el galón dice exactamente eso. Es el único que se
       * gana renunciando, y por eso vale lo mismo que el de la toma.
       */
      case "frustrada":
        return this.renuncio;

      /*
       * La toma. Suave y firme valen las dos: firme es como se posa un avión
       * en una pista corta y no es un defecto. Rápido y fuera de pista no,
       * que son las dos maneras de que la toma salga mal.
       */
      case "toma":
        return this.veredicto === "suave" || this.veredicto === "firme";

      /*
       * Los aros, y este se enciende **en el aire**, a mitad de aproximación.
       * Es el único que se ve venir mientras se hace, y por eso es el que
       * mejor enseña: cruzas, se celebra, cruzas otro, y de pronto está.
       */
      case "aros":
        return this.cruzados >= AROS_LIMPIOS && this.perdidos <= AROS_PERDIDOS;

      case "velocidad":
        return (
          this.conBanda >= VELOCIDAD_BIEN && this.fueraDeBanda <= VELOCIDAD_MAL
        );

      /*
       * Y el rodaje se cierra al llegar al puesto, que es donde acaba un
       * vuelo de verdad. No basta con aterrizar: hay que dejar el avión donde
       * va, que es la mitad del vuelo que casi ningún juego cuenta.
       */
      case "rodaje":
        return (
          f.fase === "en-puesto" &&
          this.rodando >= RODAJE_MINIMO &&
          this.fueraDeRaya <= RODAJE_FUERA
        );
    }
  }
}

/** Las fases en las que uno está rodando de verdad. */
const RODANDO = new Set<Fase>([
  "rodando",
  "esperando",
  "autorizado",
  "alineando",
  "abandonando",
  "a-plataforma",
]);
