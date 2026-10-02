/**
 * El TCAS: quién anda cerca, y cuándo hay que mirarlo.
 *
 * Pedido despegando de Pettirossi con el avión grande: «un avión de frente y
 * ni aviso ni radar ni nada». Y antes, parado en el punto de espera: el que
 * viene a aterrizar tendría que verse «incluso en el radar». Tenía razón las
 * dos veces, y por lo mismo: el avión que se volaba **lleva TCAS** —todo
 * reactor de pasaje lo lleva, por ley— y el juego no lo tenía.
 *
 * ## Qué hace un TCAS de verdad, y qué hace éste
 *
 * Interroga a los transpondedores de alrededor una vez por segundo y de cada
 * respuesta saca tres cosas: **a qué distancia está, a qué altura y cómo
 * cambian las dos**. No sabe a dónde va nadie ni qué le ha dicho la torre:
 * sabe la distancia y la altura, y cuánto se acercan. Todo lo de aquí sale de
 * eso, con las cuentas publicadas y no con unas parecidas:
 *
 * - **El aviso de tráfico (TA)** salta cuando falta poco para el punto de
 *   máximo acercamiento —el *tau*, distancia partida por lo que se acerca— y
 *   la altura está cerca o se va a juntar en ese mismo rato. Los segundos
 *   crecen con la altitud: veinte pegado al suelo, cuarenta y ocho en
 *   crucero, porque arriba se va más deprisa. Ver `sensibilidad`.
 * - **La pantalla** pinta cada tráfico con el símbolo de su estado —rombo
 *   hueco, rombo lleno si está cerca, círculo ámbar si hay aviso— y su altura
 *   relativa. Eso lo dibuja `ui/carta.ts`; aquí se decide qué es cada uno.
 *
 * Las cifras son las de la tabla 2 del folleto de la FAA *Introduction to
 * TCAS II Version 7.1* (2011), que es la versión que obliga Europa desde 2015.
 *
 * ## Y lo que no hace: el RA
 *
 * El TCAS II, además del aviso, da **la maniobra**: «climb, climb», «descend,
 * descend». Aquí no está, y es a propósito y no un olvido. Un RA de verdad
 * no es solo la voz: es la franja roja y verde en el variómetro del
 * horizonte, que dice cuánto subir, y sin ella se enseñaría una orden a medias.
 * Así que el sistema de este juego trabaja como uno de verdad con el selector
 * en **TA ONLY**, que es un modo que existe y que se usa, y la pantalla lo
 * dice con esas dos palabras. Ver `SOLO_TA`.
 *
 * ## Cuándo se calla
 *
 * Donde se calla uno de verdad, y por los mismos motivos:
 *
 * - **En el suelo** no hay avisos: el TCAS se da a sí mismo por posado por
 *   debajo de cincuenta pies de radioaltímetro, y en tierra lo que se ve en
 *   la pantalla es para mirar, no para avisar.
 * - **Por debajo de quinientos pies** no hay voz: cerca del suelo la cabeza
 *   está en la toma o en el despegue, y un «traffic, traffic» ahí estorba más
 *   de lo que ayuda. El símbolo sí se pone ámbar.
 * - **Mientras avisa el terreno** tampoco: el aviso de suelo manda sobre el de
 *   tráfico en cualquier cabina, porque el suelo no se aparta.
 * - **Contra quien está posado** no se avisa nunca: un transpondedor en tierra
 *   lo dice, y el TCAS no avisa de un avión que rueda.
 *
 * Y a quien está posado **tampoco se le pinta**, que eso sí es una decisión de
 * presentación y se firma como tal. En el punto de espera los que ruedan
 * detrás o esperan al lado caían justo encima del propio avión, tres rombos
 * con «00» tapando el símbolo, y no enseñaban nada que no se vea mejor
 * mirando por la ventana. El TCAS es para el tráfico que vuela; lo que rueda
 * se mira afuera y lo cuenta la torre.
 *
 * ## En espera, y diciéndolo
 *
 * Rodando por la plataforma el selector está en espera —se pasa a trabajar en
 * el punto de espera, ver `Game.vigilarElTrafico`— y la pantalla lo escribe:
 * **TCAS STBY**. Sin eso, una carta vacía con dos aviones en el cielo se leía
 * como un radar que no ve —las capturas 107 a 109—, cuando lo que pasaba era
 * lo de verdad: el equipo, en espera. Ver `modoEnPantalla`.
 *
 * Un TCAS II de verdad pasa además a **TA/RA** al entrar en la pista. Éste
 * se queda en TA ONLY, por lo dicho del RA: el cuadrado rojo, la franja del
 * variómetro y las voces de la maniobra —«climb, climb»— esperan a que haya
 * con qué grabarlas. Ver `PENDIENTE-VOCES-radar.md`.
 *
 * ## La banda de altura
 *
 * Se pinta lo que vuela a menos de dos mil setecientos pies, como cualquier
 * TCAS en su posición normal, y subiendo o bajando la banda se abre por ese
 * lado. Lo que vuela más lejos en altura se ve por la ventanilla y no en la
 * carta, que es lo que pasa en una cabina de verdad. Ver `BANDAS`.
 */

/** Los dos TCAS que existen en la flota. Ver `tcas` en `aircraft.ts`. */
export type EquipoTcas = "TCAS I" | "TCAS II";

const PIE = 0.3048;
const MILLA = 1852;

/**
 * **Por qué el TCAS II de aquí trabaja en TA ONLY.** Ver la cabecera.
 *
 * En el TCAS I no hace falta decirlo: no tiene otro modo.
 */
export function soloAvisa(equipo: EquipoTcas): boolean {
  return equipo === "TCAS II";
}

/** Un escalón de sensibilidad, con los umbrales del aviso de tráfico. */
export interface Sensibilidad {
  /** El número del escalón, de 2 a 7. El 1 es el selector en espera. */
  readonly nivel: number;
  /** Segundos de tau por debajo de los cuales hay aviso. */
  readonly tau: number;
  /** La distancia que avisa sola, aunque no se acerque deprisa, NM. */
  readonly dmod: number;
  /** La diferencia de altura que avisa sola, ft. */
  readonly zthr: number;
}

/**
 * Qué escalón toca a esta altura.
 *
 * La tabla 2 del folleto de la FAA, columna del TA. Los dos primeros tramos
 * van **sobre el suelo** —por radioaltímetro, que es lo que importa cerca del
 * terreno— y el resto sobre el mar, por altímetro. Cuanto más alto, más
 * segundos: arriba se va más deprisa y el mismo susto llega antes.
 */
export function sensibilidad(
  altitudPies: number,
  sobreElSueloPies: number,
): Sensibilidad {
  if (sobreElSueloPies < 1000) return { nivel: 2, tau: 20, dmod: 0.3, zthr: 850 };
  if (sobreElSueloPies < 2350) return { nivel: 3, tau: 25, dmod: 0.33, zthr: 850 };
  if (altitudPies < 5000) return { nivel: 4, tau: 30, dmod: 0.48, zthr: 850 };
  if (altitudPies < 10000) return { nivel: 5, tau: 40, dmod: 0.75, zthr: 850 };
  if (altitudPies < 20000) return { nivel: 6, tau: 45, dmod: 1.0, zthr: 850 };
  if (altitudPies < 42000) return { nivel: 7, tau: 48, dmod: 1.3, zthr: 850 };
  return { nivel: 7, tau: 48, dmod: 1.3, zthr: 1200 };
}

/** Lo que el TCAS sabe de un tráfico: dónde está y cómo cambia. */
export interface Geometria {
  /** Distancia, NM. */
  readonly r: number;
  /** Cómo cambia, NM/s. Negativo, acercándose. */
  readonly rPunto: number;
  /** Su altura menos la mía, ft. */
  readonly a: number;
  /** Cómo cambia esa diferencia, ft/s. */
  readonly aPunto: number;
}

/**
 * ¿Pide esta geometría un aviso de tráfico?
 *
 * Las dos pruebas del TCAS, y tienen que cumplirse las dos:
 *
 * - **En distancia**: o ya está dentro de DMOD, o se acerca y el tau
 *   *modificado* —`(r² − DMOD²) / (r·ṙ)`— baja del umbral. El modificado y no
 *   el simple porque con el simple uno que se acerca muy despacio llegaría
 *   hasta encima sin avisar: el tau sería enorme todo el rato.
 * - **En altura**: o la diferencia ya es menor que ZTHR, o se están juntando
 *   y el tiempo hasta estar a la misma altura baja del mismo umbral.
 *
 * Es la forma del algoritmo publicada por la NASA (Muñoz y otros, *A TCAS-II
 * Resolution Advisory Detection Algorithm*, 2013), con los umbrales del TA.
 */
export function pideAviso(s: Sensibilidad, g: Geometria): boolean {
  const { r, rPunto, a, aPunto } = g;
  const enDistancia =
    r <= s.dmod ||
    (rPunto < 0 && -(r * r - s.dmod * s.dmod) / (r * rPunto) <= s.tau);
  const enAltura =
    Math.abs(a) <= s.zthr || (a * aPunto < 0 && -a / aPunto <= s.tau);
  return enDistancia && enAltura;
}

/**
 * Cada cuánto mira, s.
 *
 * Uno: es lo que tarda un TCAS en interrogar otra vez a quien está cerca, y
 * mirar más a menudo no daría otra cosa que ritmos más ruidosos.
 */
export const CICLO = 1;

/**
 * Cuánto tiene que dejar de cumplirse un aviso para quitarlo, s.
 *
 * Desde la versión 7.0 un TA se retira con más exigencia que la que hace
 * falta para ponerlo, porque se vieron avisos que entraban y salían contra el
 * mismo avión en aproximaciones paralelas. Cuatro ciclos.
 */
const SE_QUITA_TRAS = 4;

/** Por debajo de esto, sobre el suelo, no hay voz, ft. */
export const CALLADO_POR_DEBAJO = 500;

/** Por debajo de esto se da por posado, ft de radioaltímetro. */
const POSADO = 50;

/**
 * Tráfico cercano: dentro de seis millas y de mil doscientos pies. Es el
 * *proximate traffic* del TCAS, el rombo relleno, y también lo que la torre
 * o el control te cuentan por radio. Ver `informacion-de-trafico.ts`.
 */
export const CERCA_MILLAS = 6;
export const CERCA_PIES = 1200;

/**
 * **La banda de altura que se pinta**, y las tres posiciones del selector.
 *
 * La normal —NORM en Boeing, ALL en Airbus— son dos mil setecientos pies
 * arriba y abajo. Lo que cruza a cinco mil pies por encima existe, pero no es
 * asunto de ahora, y por eso en la 115 se veían por la ventanilla aviones que
 * la pantalla no pintaba: el de la ruta de vuelta va mil pies por debajo del
 * nivel de quien sube, y el siguiente, tres mil.
 *
 * Las otras dos posiciones abren la banda por un lado hasta nueve mil
 * novecientos pies, y son las que se usan subiendo —ABV, para ver en qué se
 * va a meter uno— y bajando —BLW—. Las tienen los dos equipos de la flota: el
 * selector ABV/N/BLW está en el panel del TCAS II de los reactores y en el del
 * TCAS I del turbohélice. Ver `bandaPara`.
 */
export type Banda = "NORM" | "ABV" | "BLW";

export const BANDAS: Readonly<
  Record<Banda, { readonly arriba: number; readonly abajo: number }>
> = {
  NORM: { arriba: 2700, abajo: 2700 },
  ABV: { arriba: 9900, abajo: 2700 },
  BLW: { arriba: 2700, abajo: 9900 },
};

/**
 * **Qué banda pondría quien vuela**, mirando la ventanilla de altitud.
 *
 * El selector no lo toca nadie en este juego —no hay mando que se lea a los
 * cuatro años, igual que el del rango de la carta—, así que lo mueve el avión
 * como lo movería el piloto: con la ventanilla mil pies o más por encima de
 * donde se va, subiendo, ABV; mil o más por debajo, bajando, BLW; y a menos de
 * trescientos de ella, nivelado, NORM. Entre medias se queda como estaba, y
 * eso es lo que impide que parpadee: lo que la cambia es acercarse a la altura
 * pedida o pedir otra, no un variómetro que tiembla.
 *
 * Sin ventanilla —un avión que no la lleva, o en tierra—, NORM.
 */
export function bandaPara(
  ventanillaPies: number | null,
  altitudPies: number,
  antes: Banda = "NORM",
): Banda {
  if (ventanillaPies === null) return "NORM";
  const falta = ventanillaPies - altitudPies;
  if (falta >= 1000) return "ABV";
  if (falta <= -1000) return "BLW";
  if (Math.abs(falta) < 300) return "NORM";
  return antes;
}

/**
 * **Lo que escribe la pantalla del modo del TCAS**, abajo a la izquierda.
 *
 * - **TCAS STBY** con el equipo en espera: rodando por la plataforma, antes
 *   del punto de espera y después de dejar la pista. Se escribe, porque una
 *   pantalla vacía en tierra no dice si no hay nadie o si no se está mirando:
 *   las capturas 107 a 109 eran eso, aviones en el cielo y la carta en blanco
 *   con el equipo en espera, que es lo real.
 * - **TA ONLY** con el TCAS II en marcha, que es como trabaja el de este juego.
 *   Ver la cabecera.
 * - Y la banda si no es la normal, detrás: **ABV** o **BLW**.
 *
 * El TCAS I no tiene otro modo que avisar, y en marcha no escribe nada más que
 * la banda. `null` es que no hay nada que escribir.
 */
export function modoEnPantalla(
  equipo: EquipoTcas | null,
  enMarcha: boolean,
  banda: Banda = "NORM",
): string | null {
  if (!equipo) return null;
  if (!enMarcha) return "TCAS STBY";
  const partes = [
    soloAvisa(equipo) ? "TA ONLY" : "",
    banda === "NORM" ? "" : banda,
  ].filter(Boolean);
  return partes.length ? partes.join(" ") : null;
}

/**
 * Hasta dónde se sigue a alguien, NM.
 *
 * Treinta: un TCAS sigue hasta treinta aviones en un radio de unas treinta
 * millas, y la carta más abierta de este juego enseña cuarenta.
 */
const ALCANCE_MILLAS = 30;

/** Sube o baja «de verdad» a partir de quinientos pies por minuto. */
const RITMO_QUE_SE_PINTA = 500 / 60; // ft/s

/** Un tráfico, tal como lo cuentan los que vuelan en el juego. */
export interface Intruso {
  /** Quién es. No se repite entre las tres fuentes de tráfico. */
  readonly id: string;
  /** En metros del mundo; `y` es altitud. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Si su transpondedor dice que está en el suelo. */
  readonly enElSuelo?: boolean;
}

/** Y lo que hace falta de quien lleva el TCAS. */
export interface Propio {
  readonly x: number;
  /** Altitud, m. */
  readonly y: number;
  readonly z: number;
  /** Radioaltímetro, m. */
  readonly sobreElSuelo: number;
  /** Rumbo verdadero, grados. Solo para decir por dónde mirar. */
  readonly rumbo: number;
  /**
   * Si la pantalla enseña el tráfico ahora mismo.
   *
   * En el aire, siempre. En tierra, desde el punto de espera: es cuando el
   * selector pasa de espera a TA ONLY o a TA/RA, y lo decide quien sabe en qué
   * fase se está. Ver `Game.vigilarElTrafico`.
   */
  readonly pantalla: boolean;
  /** Si está sonando el aviso de terreno, que manda sobre éste. */
  readonly terrenoAvisando: boolean;
  /** La banda de altura que se pinta. NORM si no se dice. Ver `bandaPara`. */
  readonly banda?: Banda;
}

/** Cómo se pinta un tráfico. Ver la figura 2 del folleto de la FAA. */
export type Clase = "otro" | "cerca" | "aviso";

/** Un tráfico en la pantalla. */
export interface Blanco {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly clase: Clase;
  /** Su altura menos la mía, m. La cifra en centenas de pies es cosa de la carta. */
  readonly relativa: number;
  /** Si sube (1), baja (−1) o ninguna de las dos a más de 500 ft/min. */
  readonly tendencia: -1 | 0 | 1;
}

/** Un aviso nuevo, con lo que hace falta para decir por dónde mirar. */
export interface AvisoDeTrafico {
  readonly id: string;
  /** La hora del reloj a la que está: las doce, delante; las tres, a la derecha. */
  readonly hora: number;
  /** Su altura menos la mía, m. */
  readonly relativa: number;
  /** Distancia, m. */
  readonly distancia: number;
}

interface Seguido {
  r: number;
  a: number;
  yIntruso: number;
  /** Cuándo se tomó la muestra, s del reloj del TCAS. */
  cuando: number;
  rPunto: number;
  aPunto: number;
  /** Ritmo vertical del tráfico, ft/s. */
  vIntruso: number;
  /** Si ya hay dos muestras y el ritmo vale. */
  conRitmo: boolean;
  aviso: boolean;
  /** Segundos seguidos que el aviso lleva sin cumplirse. */
  sinCumplir: number;
}

/** La hora del reloj de algo que está en `rumbo` visto desde `miRumbo`. */
export function horaDelReloj(haciaEl: number, miRumbo: number): number {
  const relativo = (((haciaEl - miRumbo) % 360) + 360) % 360;
  const hora = Math.round(relativo / 30) % 12;
  return hora === 0 ? 12 : hora;
}

export class Tcas {
  private reloj = 0;
  private hastaElCiclo = 0;
  private readonly seguidos = new Map<string, Seguido>();
  private ahora: readonly Blanco[] = [];
  private encendido = false;
  /** Cuántos avisos ha dado este vuelo. Para el banco. */
  avisosDados = 0;

  /** Lo que enseña la pantalla. Vacío si no hay TCAS o está en espera. */
  get enPantalla(): readonly Blanco[] {
    return this.ahora;
  }

  /**
   * Si está trabajando y no en espera. Rodando por la plataforma está en
   * espera, y entonces la pantalla no dice **TA ONLY**: diría un modo que no
   * está puesto.
   */
  get enMarcha(): boolean {
    return this.encendido;
  }

  /** Vuelo nuevo, o avión nuevo: se empieza a seguir de cero. */
  reiniciar(): void {
    this.reloj = 0;
    this.hastaElCiclo = 0;
    this.seguidos.clear();
    this.ahora = [];
  }

  /**
   * Pasa el tiempo. Devuelve los avisos que **empiezan** en este paso y se
   * pueden decir; casi siempre, ninguno.
   *
   * Un aviso se dice una vez, al empezar, y vuelve a decirse solo si se quita
   * y vuelve a ponerse: lo que lo rearma es que cambie lo que pasa, no que
   * pase un rato.
   */
  paso(
    dt: number,
    equipo: EquipoTcas | null,
    yo: Propio,
    intrusos: readonly Intruso[],
  ): AvisoDeTrafico[] {
    this.encendido = !!equipo && yo.pantalla;
    if (!equipo) {
      if (this.seguidos.size || this.ahora.length) this.reiniciar();
      return [];
    }
    this.reloj += dt;
    this.hastaElCiclo -= dt;
    const nuevos: AvisoDeTrafico[] = [];
    if (this.hastaElCiclo <= 0) {
      this.hastaElCiclo += CICLO;
      if (this.hastaElCiclo <= 0) this.hastaElCiclo = CICLO;
      this.ciclo(yo, intrusos, nuevos);
    }
    this.ahora = yo.pantalla ? this.pintar(yo, intrusos) : [];
    return nuevos;
  }

  private ciclo(
    yo: Propio,
    intrusos: readonly Intruso[],
    nuevos: AvisoDeTrafico[],
  ): void {
    const altitud = yo.y / PIE;
    const sobreElSuelo = yo.sobreElSuelo / PIE;
    const posado = sobreElSuelo < POSADO;
    const s = sensibilidad(altitud, sobreElSuelo);
    const vistos = new Set<string>();
    for (const i of intrusos) {
      const dx = i.x - yo.x;
      const dz = i.z - yo.z;
      const dy = i.y - yo.y;
      // Distancia inclinada, que es la que mide un TCAS: la del eco.
      const r = Math.hypot(dx, dy, dz) / MILLA;
      if (r > ALCANCE_MILLAS) continue;
      vistos.add(i.id);
      const a = dy / PIE;
      const yIntruso = i.y / PIE;
      const antes = this.seguidos.get(i.id);
      const seguido: Seguido = antes ?? {
        r,
        a,
        yIntruso,
        cuando: this.reloj,
        rPunto: 0,
        aPunto: 0,
        vIntruso: 0,
        conRitmo: false,
        aviso: false,
        sinCumplir: 0,
      };
      if (antes) {
        const lapso = this.reloj - antes.cuando;
        if (lapso > 0) {
          seguido.rPunto = (r - antes.r) / lapso;
          seguido.aPunto = (a - antes.a) / lapso;
          seguido.vIntruso = (yIntruso - antes.yIntruso) / lapso;
          seguido.conRitmo = true;
        }
        seguido.r = r;
        seguido.a = a;
        seguido.yIntruso = yIntruso;
        seguido.cuando = this.reloj;
      }
      this.seguidos.set(i.id, seguido);

      const cumple =
        !posado &&
        !i.enElSuelo &&
        seguido.conRitmo &&
        pideAviso(s, { r, rPunto: seguido.rPunto, a, aPunto: seguido.aPunto });
      if (cumple) {
        seguido.sinCumplir = 0;
        if (!seguido.aviso) {
          seguido.aviso = true;
          /*
           * **Y se dice solo si se puede decir en ese momento.** Un aviso que
           * empieza por debajo de quinientos pies o con el terreno sonando no
           * se guarda para después: cuando se pudiera decir ya sería otro
           * momento, y un «traffic, traffic» a destiempo manda a mirar a donde
           * ya no hay nada.
           */
          if (sobreElSuelo >= CALLADO_POR_DEBAJO && !yo.terrenoAvisando) {
            this.avisosDados += 1;
            nuevos.push({
              id: i.id,
              hora: horaDelReloj(
                (Math.atan2(dx, -dz) * 180) / Math.PI,
                yo.rumbo,
              ),
              relativa: dy,
              distancia: Math.hypot(dx, dz),
            });
          }
        }
      } else if (seguido.aviso) {
        seguido.sinCumplir += CICLO;
        if (posado || i.enElSuelo || seguido.sinCumplir >= SE_QUITA_TRAS)
          seguido.aviso = false;
      }
    }
    for (const id of [...this.seguidos.keys()])
      if (!vistos.has(id)) this.seguidos.delete(id);
  }

  /**
   * Lo que se pinta, con las posiciones de este fotograma y el estado del
   * último ciclo: el símbolo cambia una vez por segundo, como en una cabina,
   * pero no salta de sitio a tirones.
   */
  private pintar(yo: Propio, intrusos: readonly Intruso[]): Blanco[] {
    const lista: Blanco[] = [];
    const banda = BANDAS[yo.banda ?? "NORM"];
    for (const i of intrusos) {
      const seguido = this.seguidos.get(i.id);
      // Posado, no se pinta. Ver la cabecera.
      if (!seguido || i.enElSuelo) continue;
      const dy = i.y - yo.y;
      const a = dy / PIE;
      const r = Math.hypot(i.x - yo.x, dy, i.z - yo.z) / MILLA;
      const clase: Clase = seguido.aviso
        ? "aviso"
        : r < CERCA_MILLAS && Math.abs(a) < CERCA_PIES
          ? "cerca"
          : "otro";
      // Fuera de la banda solo se pinta lo que avisa, que se pinta siempre.
      if (clase !== "aviso" && (a > banda.arriba || a < -banda.abajo)) continue;
      const v = seguido.conRitmo ? seguido.vIntruso : 0;
      lista.push({
        id: i.id,
        x: i.x,
        z: i.z,
        clase,
        relativa: dy,
        tendencia:
          v > RITMO_QUE_SE_PINTA ? 1 : v < -RITMO_QUE_SE_PINTA ? -1 : 0,
      });
    }
    return lista;
  }
}
