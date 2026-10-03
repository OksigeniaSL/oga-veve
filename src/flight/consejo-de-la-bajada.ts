/**
 * **La instructora en la bajada y en la final: una acción y un objetivo.**
 *
 * Es la queja que más veces ha vuelto, y siempre con la misma forma:
 *
 * > «Bajas muy lento, métele gas; le meto gas y bajas muy rápido; ¿qué se
 * > supone que tengo que hacer?»
 *
 * > «Vas despacito», luego «bajas muy rápido»… «no es que la instructora me
 * > corrija, es que no sé lo que tengo que hacer».
 *
 * Y bajando a Gran Canaria, a la vez: *sink rate*, *airspeed low*, «metéle
 * gas» y «bajás rápido». «El avión hay que bajarlo.»
 *
 * Se arregló dos veces en el sitio equivocado —se cambió una frase, se
 * calló otra— y por eso volvía. Las frases no eran el problema: **había
 * cuatro sitios del juego dando consejos de la final cada uno por su cuenta**
 * —la banda de velocidad, la explicación del *sink rate*, los aros y el
 * tutor— y cada uno decía **el síntoma** que veía. Ninguno sabía lo que había
 * dicho el otro ni esperaba a ver qué hacía el avión. Así salen dos consejos
 * contrarios seguidos.
 *
 * Ahora hay uno solo, éste, y sigue las reglas de una instructora de verdad:
 *
 * 1. **Dice la acción y el objetivo**, no lo que pasa: «un poquito más de gas,
 *    hasta la marca», «nariz un pelín abajo, hasta ver dos blancas y dos
 *    rojas». Con **un solo mando** por consejo.
 * 2. **La técnica de la final de cualquier avión**: con el morro se lleva la
 *    senda y con el gas la velocidad. Lento y alto se arreglan a la vez
 *    bajando el morro; rápido y bajo, levantándolo. Y **lento nunca se
 *    arregla subiendo el morro**: con poca velocidad, tirar es el camino a la
 *    pérdida. Con *speed low* en la final, gas y la nariz quieta.
 * 3. **Espera el efecto** antes de volver a corregir. Un consejo dado queda
 *    esperando a que el avión responda —la aguja que acelera, el variómetro
 *    que se mueve— y **nunca va detrás otro contrario** sin que haya
 *    respondido. Lo que ya se está corrigiendo no se dice.
 * 4. **Un suceso, una voz.** Cuando el que avisa es una caja del avión —*sink
 *    rate*, *airspeed low*—, el consejo es la explicación que va detrás de la
 *    máquina, y sale de aquí igual: ver `porLaCaja`.
 *
 * Este módulo no habla ni dibuja: decide. Lo que dice cada consejo, con qué
 * frase grabada y con qué dibujo, lo pone `game.ts` con `FRASES`.
 */

import type { Senda, Velocidad } from "./perfil-vertical";

export type { Senda, Velocidad } from "./perfil-vertical";

/**
 * **Lo que se le pide a quien vuela.** Cada una es un solo mando:
 *
 * - `masGas` y `menosGas`: la palanca del gas.
 * - `frenar`: algo que frene cuando ya no queda gas que quitar —los flaps en
 *   la final, los aerofrenos en la bajada—. Cuál, lo decide quien lo dice,
 *   que sabe qué lleva el avión.
 * - `narizArriba` y `narizAbajo`: la palanca de mando, un pelín.
 */
export type Accion = "masGas" | "menosGas" | "frenar" | "narizArriba" | "narizAbajo";

/** Por qué se pide: lo que se ha visto. */
export type Motivo = "lento" | "rapido" | "alto" | "bajo" | "hundiendose";

export interface Consejo {
  readonly accion: Accion;
  readonly motivo: Motivo;
}

/**
 * **Los consejos que se contradicen**: el mismo mando hacia el otro lado, o
 * el gas contra lo que frena. No se dan seguidos sin que el avión haya
 * respondido al primero. Ver `ConsejoDeLaBajada`.
 */
export function contrarias(a: Accion, b: Accion): boolean {
  const par = (x: Accion, y: Accion) => (a === x && b === y) || (a === y && b === x);
  return (
    par("masGas", "menosGas") ||
    par("masGas", "frenar") ||
    par("narizArriba", "narizAbajo")
  );
}

/** Qué mando toca cada acción. Uno por consejo. */
export function mandoDe(a: Accion): "gas" | "freno" | "nariz" {
  return a === "masGas" || a === "menosGas"
    ? "gas"
    : a === "frenar"
      ? "freno"
      : "nariz";
}

/** Lo que el consejero necesita ver del avión en cada paso. */
export interface Lectura {
  /**
   * Si toca aconsejar ahora: bajando hacia una pista, en la bajada del plan o
   * en la final, con el avión en manos de quien vuela. Mientras no toca no se
   * dice nada, **pero no se olvida lo dicho**: subir un momento para coger la
   * senda no es empezar otra bajada. Lo que hace olvidar es acabar la bajada
   * —tocar tierra, irse al aire, salir de ella—, y eso lo dice quien sabe
   * llamando a `reiniciar`.
   */
  readonly activo: boolean;
  /**
   * La velocidad frente a la marca, ya juzgada con su histéresis, o `null` si
   * la velocidad no es de quien vuela —los gases automáticos la llevan—.
   */
  readonly velocidad: Velocidad | null;
  /** Si va muy lejos de la marca. Ver `velocidadMuyFuera`. */
  readonly velocidadMuyFuera?: boolean;
  /**
   * La senda, ya juzgada, o `null` si no hay senda a la vista —o la lleva el
   * automático—.
   */
  readonly senda: Senda | null;
  readonly sendaMuyFuera?: boolean;
  /** Si la caja de proximidad al suelo está diciendo *sink rate*. */
  readonly hundiendose?: boolean;
  /**
   * **Si un mando lo lleva el automático**: el morro, con el automático
   * bajando por la senda; el gas, con los gases automáticos. Lo que lleva él
   * no se le pide a quien vuela —tocarlo lo suelta—, tampoco detrás de una
   * caja que canta.
   */
  readonly morroDelAutomatico?: boolean;
  readonly gasDelAutomatico?: boolean;
  /**
   * La marca de la velocidad, nudos: la de la escalera de velocidades. Si
   * salta un peldaño, lo que pasa ha cambiado aunque el avión no se haya
   * movido. Ver `sePuedeDar`.
   */
  readonly marca?: number;
  /** Si se va por la bajada del plan o por la final. Ver `Desvio.modo`. */
  readonly modo?: "bajada" | "final";
  /** Indicada, nudos. */
  readonly kt: number;
  /** Cómo cambia la indicada, nudos por segundo. */
  readonly aceleracion: number;
  /** Velocidad vertical, pies por minuto. */
  readonly vertical: number;
  /** El ritmo de la senda, pies por minuto, o `null` si no lo hay. */
  readonly verticalObjetivo: number | null;
  /** Lo que se va sobre la senda, en puntos, o `null`. */
  readonly desvio: number | null;
  /** Si queda gas que quitar. Sin él, lo que frena es otra cosa. */
  readonly quedaGas: boolean;
  /** Si hay con qué frenar cuando ya no queda gas: flaps o aerofrenos. */
  readonly puedeFrenar: boolean;
  /**
   * **Si «lento» lo canta una caja del avión**, y entonces su consejo llega
   * solo por `porLaCaja`, detrás de la máquina: dicho antes por la
   * instructora, la caja sonaría detrás repitiendo lo mismo, al revés del
   * orden de una cabina.
   */
  readonly lentoLoCantaLaCaja?: boolean;
  /** El paso, s. */
  readonly dt: number;
}

/**
 * **Cuánto tiene que durar lo que se ve para decir algo**, s.
 *
 * Tres segundos fuera es una tendencia, no un bache: es lo que ya pedía la
 * banda de velocidad antes de hablar. Y la mitad cuando se va muy fuera, que
 * ahí esperar es perder lo que queda para corregir.
 *
 * No es un reloj que rearme nada: es cuánto tiene que sostenerse una cosa
 * para que sea verdad. Lo que vuelve a abrir un consejo es que cambie lo que
 * pasa, nunca que pase un rato. Ver la memoria del proyecto «el reloj no
 * rearma un aviso».
 */
export const SOSTENER = 3;
export const SOSTENER_MUY_FUERA = 1.5;

/**
 * **Cuándo ha respondido el avión** a un consejo.
 *
 * Medio nudo por segundo es una aguja que se mueve de verdad, y tres nudos
 * ya ganados no son ruido. Doscientos pies por minuto en el variómetro es el
 * morro movido a propósito; y un tercio de punto menos de desvío es la senda
 * acercándose.
 */
export const RESPONDE_ACELERACION = 0.5;
export const RESPONDE_KT = 3;
export const RESPONDE_VERTICAL = 200;
export const RESPONDE_DESVIO = 0.3;

/**
 * **Lo que ya se está corrigiendo no se dice.** Algo más que una respuesta:
 * la aguja yendo hacia la marca con ganas, o el variómetro bajando trescientos
 * pies por minuto más deprisa que la senda cuando se va alto. Decirlo
 * entonces es regañar por lo que se acaba de hacer bien.
 */
export const YA_CORRIGE_ACELERACION = 0.6;
export const YA_CORRIGE_VERTICAL = 300;

/**
 * **Qué hay que hacer, mirando todo a la vez.** Uno solo, y el que arregla lo
 * que más importa. Ver la cabecera.
 *
 * Con *sink rate* sonando, si se va lento se pide gas —tirar sin velocidad es
 * el camino a la pérdida— y si no, nariz arriba.
 */
export function queHacer(l: Lectura, hundiendose = false): Consejo | null {
  const c = queHacerConTodo(l, hundiendose);
  if (!c) return null;
  // Y nada de lo que lleva el automático. Ver `Lectura.morroDelAutomatico`.
  const mando = mandoDe(c.accion);
  if (mando === "nariz" && l.morroDelAutomatico) return null;
  if (mando === "gas" && l.gasDelAutomatico) return null;
  return c;
}

function queHacerConTodo(l: Lectura, hundiendose: boolean): Consejo | null {
  const v = l.velocidad ?? "bien";
  const s = l.senda ?? "bien";
  if (hundiendose)
    return v === "lento"
      ? { accion: "masGas", motivo: "lento" }
      : { accion: "narizArriba", motivo: "hundiendose" };
  if (v === "lento")
    return s === "alto"
      ? // Lento y alto: el morro abajo da velocidad y baja a la senda.
        { accion: "narizAbajo", motivo: "lento" }
      : // Lento y en la senda o bajo: gas, y la nariz quieta.
        { accion: "masGas", motivo: "lento" };
  if (v === "rapido") {
    // Rápido y bajo: el morro arriba frena y sube a la senda.
    if (s === "bajo") return { accion: "narizArriba", motivo: "bajo" };
    if (l.quedaGas) return { accion: "menosGas", motivo: "rapido" };
    if (l.puedeFrenar) return { accion: "frenar", motivo: "rapido" };
    // Sin gas que quitar y sin nada que frene no hay mando que pedir: si así
    // no se llega bien, es una aproximación que no va a salir, y eso lo dicen
    // los mínimos. Ver `porQueNoSeSigue`.
    return null;
  }
  if (s === "alto") return { accion: "narizAbajo", motivo: "alto" };
  if (s === "bajo") return { accion: "narizArriba", motivo: "bajo" };
  return null;
}

/** Lo que se dijo y cómo estaba el avión entonces. */
interface Dado {
  readonly consejo: Consejo;
  readonly kt: number;
  readonly vertical: number;
  readonly desvio: number | null;
  /** Cómo estaba todo al decirlo. Ver `claseDe`. */
  readonly clase: string;
  readonly muyFuera: boolean;
  readonly marca: number | null;
  readonly modo: string | null;
  respondio: boolean;
  /**
   * Si lo que lo motivó ya se arregló. **Se sigue recordando**: lo que se
   * arregló sin que el avión hiciera nada —porque la marca bajó un peldaño,
   * por ejemplo— no deja decir lo contrario enseguida.
   */
  resuelto: boolean;
}

/** Lo que el consejero devuelve en un paso. */
export type Paso = Consejo | "bien" | null;

/**
 * **El consejero de la bajada.** Un paso por fotograma con `paso`; las cajas
 * del avión piden su explicación con `porLaCaja`; un aro perdido, con
 * `porElAro`. Las tres pasan por las mismas reglas.
 */
export class ConsejoDeLaBajada {
  private dado: Dado | null = null;
  /** Lo que se querría decir y desde cuándo se sostiene. */
  private quiere: { consejo: Consejo; durante: number } | null = null;
  /** Si en esta bajada se ha corregido algo: para decir «¡eso es!» al final. */
  private huboConsejo = false;

  /** Lo último que se dijo y si el avión respondió. Para el banco. */
  get ultimo(): (Consejo & { respondio: boolean }) | null {
    return this.dado ? { ...this.dado.consejo, respondio: this.dado.respondio } : null;
  }

  /** Vuelo nuevo, o la bajada acabada: se olvida todo. */
  reiniciar(): void {
    this.dado = null;
    this.quiere = null;
    this.huboConsejo = false;
  }

  paso(l: Lectura): Paso {
    this.mirarLaRespuesta(l);
    if (!l.activo) {
      this.quiere = null;
      return null;
    }
    /*
     * **Lo que se arregló, se suelta.** Y si con eso todo está en su sitio y
     * había hecho falta corregir, se dice: callarse no es lo mismo que decir
     * que salió bien, y a los cuatro años esa diferencia es todo.
     */
    const d = this.dado;
    if (d && !d.resuelto && resuelto(d.consejo.motivo, l)) {
      d.resuelto = true;
      /*
       * **Y se celebra lo que hizo quien vuela**, no lo que se arregló solo:
       * si el avión no respondió —la marca bajó un peldaño, o el dato saltó—,
       * no hay nada que felicitar. Medido en el banco: un «¡eso es!» tres
       * décimas después de «metéle gas», sin que nadie hubiera tocado nada.
       */
      if (this.huboConsejo && d.respondio && todoBien(l)) {
        this.huboConsejo = false;
        this.quiere = null;
        return "bien";
      }
    }
    const quiere = queHacer(l);
    if (!quiere || (quiere.motivo === "lento" && l.lentoLoCantaLaCaja)) {
      this.quiere = null;
      return null;
    }
    const igual =
      this.quiere &&
      this.quiere.consejo.accion === quiere.accion &&
      this.quiere.consejo.motivo === quiere.motivo;
    this.quiere = igual
      ? { consejo: quiere, durante: this.quiere!.durante + l.dt }
      : { consejo: quiere, durante: 0 };
    const hace = muyFuera(quiere, l) ? SOSTENER_MUY_FUERA : SOSTENER;
    if (this.quiere.durante < hace) return null;
    if (yaLoEstaCorrigiendo(quiere, l)) return null;
    if (!this.sePuedeDar(quiere, l)) return null;
    return this.dar(quiere, l);
  }

  /**
   * **La explicación de lo que acaba de cantar una caja del avión**: *sink
   * rate* o *airspeed low*. La caja ya esperó lo suyo para cantarlo, así que
   * aquí no se espera más; pero las reglas son las mismas: si lo que tocaría
   * es lo mismo que ya se dijo, o lo contrario sin que el avión haya
   * respondido, la máquina suena sola y la instructora calla.
   */
  porLaCaja(que: "hundiendose" | "lento", l: Lectura): Consejo | null {
    if (!l.activo) return null;
    this.mirarLaRespuesta(l);
    const c =
      que === "hundiendose"
        ? queHacer(l, true)
        : queHacer({ ...l, velocidad: "lento" });
    if (!c || !this.sePuedeDar(c, l)) return null;
    return this.dar(c, l);
  }

  /**
   * **Un aro perdido por arriba o por abajo.** Es una prueba de golpe de
   * cómo va la senda, y no hace falta que se sostenga: el aro ya pasó.
   */
  porElAro(donde: "alto" | "bajo", l: Lectura): Consejo | null {
    if (!l.activo) return null;
    this.mirarLaRespuesta(l);
    const c = queHacer({ ...l, senda: donde });
    if (!c || !this.sePuedeDar(c, l)) return null;
    return this.dar(c, l);
  }

  /**
   * **Lo que acaba de pedir otro, anotado como dicho.** Lo usa la cadena del
   * «¿y ahora qué?»: al cambiar la marca de peldaño dice «menos gas, hasta la
   * marca», y tres segundos después aquí se vería la velocidad lejos de la
   * marca nueva y se diría lo mismo. Es el mismo suceso, y lleva una sola
   * voz: con esto, lo que se pidió allí sigue aquí las mismas reglas —no se
   * repite mientras dure, ni va detrás lo contrario sin que el avión haya
   * respondido—. Ver `flight/siguiente-paso.ts`.
   *
   * No se celebra: no fue una corrección, fue el paso siguiente.
   */
  anotar(c: Consejo, l: Lectura): void {
    this.mirarLaRespuesta(l);
    const hubo = this.huboConsejo;
    this.dar(c, l);
    this.huboConsejo = hubo;
  }

  /**
   * **Si este consejo se puede dar ahora**, mirando el último que se dio.
   *
   * - El mismo otra vez, no mientras dure lo que lo motivó: se espera a que
   *   haga efecto. Solo si lo que pasa empeoró hasta ir muy fuera, que ya es
   *   otra cosa. Arreglado y vuelto a estropear, es otra vez.
   * - El contrario, solo si el avión respondió al primero. Así no sale nunca
   *   «metéle gas» y enseguida «quitá gas» sin que la aguja se haya movido.
   *   O si lo que se pide cambió de verdad: la marca bajó un peldaño de la
   *   escalera, o se pasó de la bajada a la final.
   * - Otro distinto, si el avión respondió, si lo primero se arregló o si
   *   cambió lo que pasa.
   */
  private sePuedeDar(c: Consejo, l: Lectura): boolean {
    const d = this.dado;
    if (!d) return true;
    if (c.accion === d.consejo.accion)
      return d.resuelto || (!d.respondio && !d.muyFuera && muyFuera(c, l));
    if (contrarias(c.accion, d.consejo.accion))
      return d.respondio || cambioElObjetivo(d, l);
    return d.respondio || d.resuelto || claseDe(l) !== d.clase;
  }

  private dar(c: Consejo, l: Lectura): Consejo {
    this.dado = {
      consejo: c,
      kt: l.kt,
      vertical: l.vertical,
      desvio: l.desvio,
      clase: claseDe(l),
      muyFuera: muyFuera(c, l),
      marca: l.marca ?? null,
      modo: l.modo ?? null,
      respondio: false,
      resuelto: false,
    };
    this.huboConsejo = true;
    this.quiere = null;
    return c;
  }

  /** Si el avión ya hizo lo que se le pidió. Ver `RESPONDE_KT`. */
  private mirarLaRespuesta(l: Lectura): void {
    const d = this.dado;
    if (!d || d.respondio) return;
    d.respondio = respondio(d, l);
  }
}

/** Si el avión respondió a lo que se le pidió. */
function respondio(d: Dado, l: Lectura): boolean {
  const desvioMejor =
    d.desvio !== null &&
    l.desvio !== null &&
    Math.abs(l.desvio) < Math.abs(d.desvio) - RESPONDE_DESVIO;
  switch (d.consejo.accion) {
    case "masGas":
      return l.aceleracion > RESPONDE_ACELERACION || l.kt - d.kt > RESPONDE_KT;
    case "menosGas":
    case "frenar":
      return l.aceleracion < -RESPONDE_ACELERACION || d.kt - l.kt > RESPONDE_KT;
    case "narizArriba":
      return l.vertical - d.vertical > RESPONDE_VERTICAL || desvioMejor;
    case "narizAbajo":
      return d.vertical - l.vertical > RESPONDE_VERTICAL || desvioMejor;
  }
}

/**
 * **Si lo que se pide cambió**, sin que el avión haya hecho nada: la marca de
 * la velocidad saltó un peldaño de la escalera —más de cinco nudos—, o se
 * pasó de la bajada del plan a la final. Ver `sePuedeDar`.
 */
function cambioElObjetivo(d: Dado, l: Lectura): boolean {
  const marca =
    d.marca !== null && l.marca !== undefined && Math.abs(l.marca - d.marca) > 5;
  const modo = d.modo !== null && l.modo !== undefined && l.modo !== d.modo;
  return marca || modo;
}

/** Si lo que motivó el consejo ya no está. */
function resuelto(m: Motivo, l: Lectura): boolean {
  switch (m) {
    case "lento":
      return l.velocidad !== "lento";
    case "rapido":
      return l.velocidad !== "rapido";
    case "alto":
      return l.senda !== "alto";
    case "bajo":
      return l.senda !== "bajo";
    case "hundiendose":
      return !l.hundiendose;
  }
}

function todoBien(l: Lectura): boolean {
  return (
    (l.velocidad === null || l.velocidad === "bien") &&
    (l.senda === null || l.senda === "bien") &&
    !l.hundiendose
  );
}

/** Si lo que lleva a este consejo va muy fuera. */
function muyFuera(c: Consejo, l: Lectura): boolean {
  return c.motivo === "lento" || c.motivo === "rapido"
    ? !!l.velocidadMuyFuera
    : c.motivo === "hundiendose"
      ? false
      : !!l.sendaMuyFuera;
}

/**
 * **Si eso ya se está haciendo.** Ver `YA_CORRIGE_ACELERACION`.
 */
function yaLoEstaCorrigiendo(c: Consejo, l: Lectura): boolean {
  switch (c.accion) {
    case "masGas":
      return l.aceleracion > YA_CORRIGE_ACELERACION;
    case "menosGas":
    case "frenar":
      return l.aceleracion < -YA_CORRIGE_ACELERACION;
    case "narizAbajo":
      // Alto y bajando más deprisa que la senda: la va a coger. Y lento y
      // alto ganando velocidad, igual: ya se bajó el morro.
      return c.motivo === "lento"
        ? l.aceleracion > YA_CORRIGE_ACELERACION
        : l.verticalObjetivo !== null &&
            l.vertical < l.verticalObjetivo - YA_CORRIGE_VERTICAL;
    case "narizArriba":
      return c.motivo === "hundiendose"
        ? false
        : l.verticalObjetivo !== null &&
            l.vertical > l.verticalObjetivo + YA_CORRIGE_VERTICAL;
  }
}

/**
 * **Cómo está todo**, en una palabra: la velocidad y la senda juzgadas, con
 * una marca si van muy fuera. Que cambie es «que cambie algo que pasa», lo
 * único que deja dar un consejo distinto sin esperar la respuesta al
 * anterior.
 */
function claseDe(l: Lectura): string {
  return `${l.velocidad ?? "-"}${l.velocidadMuyFuera ? "!" : ""}/${l.senda ?? "-"}${l.sendaMuyFuera ? "!" : ""}`;
}

// ── Lo que se dice ────────────────────────────────────────────────────

/**
 * **El objetivo que se nombra**, que es lo que se ve y a lo que se apunta:
 *
 * - `marca`: la muesca magenta de la cinta de velocidad —«la marca rosa»—.
 * - `papi`: las cuatro luces al costado de la pista —dos blancas y dos
 *   rojas—. Solo donde las hay y se ven.
 * - `senda`: el rombo del desvío vertical en la pantalla de vuelo, en el
 *   avión que lo lleva —ver `equipoDeSenda`—.
 * - `aro`: los aros de la lección de aterrizar, en casa.
 * - `ritmo`: la marca del ritmo en el variómetro.
 */
export type Objetivo = "marca" | "papi" | "senda" | "aro" | "ritmo" | "nada";

/** Una frase grabada concreta: la clave y cuál de sus formas. */
export interface Forma {
  readonly clave: string;
  /** La forma número tal de `audio/variantes.ts`; cero es la de `i18n`. */
  readonly forma: number;
}

/**
 * Lo que se dice para un consejo con un objetivo.
 *
 * Si no hay ni nueva ni grabada —los aerofrenos sin marca a la que
 * apuntar—, la tarjeta lleva el dibujo y la palabra corta, y la voz calla.
 */
export interface Frase {
  /**
   * **La frase nueva**, que nombra la acción y el objetivo. Sin grabar
   * todavía: ver `PENDIENTE-VOCES-bajada.md`. Se dice en cuanto tiene su
   * grabación; hasta entonces, `grabada`.
   */
  readonly nueva: string | null;
  /**
   * **Las que ya están grabadas y sirven**, porque nombran la acción. Una de
   * ellas, si hay varias. `[]` si ninguna sirve: entonces el consejo se ve
   * en la tarjeta y la voz se calla, que una frase sin grabar es muda.
   */
  readonly grabadas: readonly Forma[];
  /** La palabra corta de la tarjeta, para el peldaño que lee una palabra. */
  readonly corta: string;
}

const UNA = (clave: string, forma = 0): Forma => ({ clave, forma });

/**
 * **Qué se dice para cada acción, según a qué se apunta.**
 *
 * Las grabadas que sirven: «Venís lento: metéle gas» nombra el gas; «Bajá el
 * motor», también; «Vamos lentos: bajá un poco la nariz» es justo lo que se
 * pide lento y alto; «Bajás muy de golpe: levantá un poco la nariz», lo del
 * *sink rate*. De las formas de los aros se quedan las que piden un solo
 * mando: «Venís bajo. Tirá un poquito y un toque de motor» pide dos.
 */
export function fraseDe(c: Consejo, objetivo: Objetivo, frena: "flaps" | "aerofrenos"): Frase {
  switch (c.accion) {
    /*
     * **La marca, solo donde hay marca.** La cinta de los de cristal la lleva
     * y los pictogramas de los pequeños también; el anemómetro redondo de una
     * avioneta, no. Ahí se dice la grabada, que nombra el gas sin apuntar a
     * una marca que no existe.
     */
    case "masGas":
      return {
        nueva: objetivo === "marca" ? "vuelo.consejo.masGas" : null,
        grabadas: [UNA("vuelo.lentoYBajo")],
        corta: "palabra.masGas",
      };
    case "menosGas":
      return {
        nueva: objetivo === "marca" ? "vuelo.consejo.menosGas" : null,
        grabadas: [UNA("tutor.slow")],
        corta: "palabra.menosGas",
      };
    case "frenar":
      return frena === "flaps"
        ? { nueva: null, grabadas: [UNA("vuelo.pediFlaps")], corta: "palabra.flaps" }
        : {
            nueva: objetivo === "marca" ? "vuelo.consejo.aerofrenos" : null,
            grabadas: [],
            corta: "palabra.aerofrenos",
          };
    case "narizAbajo": {
      if (objetivo === "aro")
        return {
          nueva: null,
          grabadas: [UNA("vuelo.aroAlto"), UNA("vuelo.aroAlto", 1), UNA("vuelo.aroAlto", 2), UNA("vuelo.aroAlto", 3)],
          corta: "palabra.narizAbajo",
        };
      const grabadas =
        c.motivo === "lento" ? [UNA("vuelo.planeoLento")] : [UNA("vuelo.aroAlto", 1)];
      return {
        nueva: objetivo === "papi" ? "vuelo.consejo.narizAbajoPapi" : "vuelo.consejo.narizAbajoSenda",
        grabadas,
        corta: "palabra.narizAbajo",
      };
    }
    case "narizArriba": {
      if (c.motivo === "hundiendose")
        return {
          nueva: objetivo === "ritmo" ? "vuelo.consejo.narizArribaRitmo" : "vuelo.consejo.narizArribaSuave",
          grabadas: [UNA("vuelo.bajasRapido")],
          corta: "palabra.narizArriba",
        };
      if (objetivo === "aro")
        return {
          nueva: null,
          grabadas: [UNA("vuelo.aroBajo"), UNA("vuelo.aroBajo", 2), UNA("vuelo.aroBajo", 3)],
          corta: "palabra.narizArriba",
        };
      return {
        nueva: objetivo === "papi" ? "vuelo.consejo.narizArribaPapi" : "vuelo.consejo.narizArribaSenda",
        grabadas: [UNA("vuelo.aroBajo", 3)],
        corta: "palabra.narizArriba",
      };
    }
  }
}

/**
 * **Lo que dice la cabina en el peldaño de arriba**, en inglés: el canto de
 * quien vuela al lado o el de la caja del avión. Ver `Game.cantar`.
 *
 * *Airspeed low* es de una caja; *airspeed*, *too high, come down* y *too
 * low, climb* son de la tripulación; *sink rate* lo canta la caja por su
 * cuenta y aquí solo se le pone la explicación.
 */
export function cantoDe(c: Consejo, cajaDeLento: boolean): string {
  return CANTOS[c.motivo === "lento" && cajaDeLento ? "lentoConCaja" : c.motivo];
}

const CANTOS = {
  lentoConCaja: "airspeed low",
  lento: "airspeed",
  rapido: "airspeed",
  alto: "too high, come down",
  bajo: "too low, climb",
  hundiendose: "sink rate",
} as const;

/**
 * Todos los cantos que puede pedir el consejero, para que la prueba de las
 * tomas de cabina los vea: viven aquí y no en `game.ts`. Ver `cabina.test.ts`.
 */
export const CANTOS_DEL_CONSEJO: readonly string[] = Object.values(CANTOS);
