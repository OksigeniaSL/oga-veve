/**
 * **Lo que cuenta la comandante en un crucero largo**, además del guion.
 *
 * Pedido así, tras un Chaco → Asunción: «en todo el vuelo solo ofrecieron
 * agua al principio». El guion de un vuelo de línea —ver `megafonia.ts`— se
 * dice entero, pero en un crucero de media hora el pasaje se quedaba en
 * silencio desde el servicio hasta la bajada. Lo que hace una comandante de
 * verdad en ese rato son tres cosas, y ninguna es inventada:
 *
 * - **El punto del vuelo**: «ya vamos por la mitad del camino; vamos a
 *   aterrizar en unos veinte minutos», con **el último parte del tiempo en
 *   destino**. Es el anuncio a mitad de vuelo de cualquier ruta larga, y es
 *   también donde se da el tiempo actualizado. Ver `MITADES`.
 * - **Un saludo a los chicos, o a quien vuela por primera vez**, sin
 *   un nombre ni un dato de nadie: a quien le toque, que lo oiga como suyo.
 *   Ver `SALUDOS_A_LOS_CHICOS`.
 * - **Una curiosidad** en un crucero tranquilo: que el ala se dobla hacia
 *   arriba porque la empuja el aire que nos sostiene, que las rayas blancas
 *   son nubes, que los aviones no tienen llave. Verdaderas, y que se pueden
 *   comprobar el día que se suba a uno. Ver `CURIOSIDADES`.
 *
 * El aviso de turbulencia leve ya existe y va por su cuenta —ver
 * `anuncio-de-turbulencia.ts`—; aquí no se repite.
 *
 * ## Una comandante de verdad habla poco y a su momento
 *
 * Así que no se dice todo en todos los vuelos. **Cuánto, lo pone la duración
 * del tramo**: en un salto entre islas de veinte minutos, nada más que el
 * guion —o el saludo y la curiosidad, si no hay tripulación que llene ese
 * rato—; desde media hora larga, una cosa; desde cuarenta minutos, además el
 * punto del vuelo; y desde la hora, todo. Ver `cuantosSueltos`.
 *
 * Y nunca encima de nadie: cada cosa espera **su hueco** —el reparto de
 * `Huecos` en `turnos.ts`, el mismo de lo que se ve por la ventanilla y de las
 * lecciones del aire—, y además un minuto y medio desde la última vez que sonó
 * la megafonía, para que no suene a que la comandante no suelta el micrófono.
 * Una vez pedida, la boca le da su turno detrás de la radio y de la
 * instructora. Ver `ENTRE_ANUNCIOS`.
 *
 * ## Y nada fuera de tiempo
 *
 * Solo en crucero de verdad: arriba, después del anuncio de crucero y del
 * servicio, antes de empezar a bajar, fuera de la cabina estéril, sin una
 * turbulencia anunciada por delante y sin emergencia. Con el descenso a menos
 * de ocho minutos ya no se empieza nada: lo siguiente que dice la comandante
 * es la bajada. Lo que se pidió y espera turno cuando empieza la bajada se
 * retira: ver `esUnMomentoDeCrucero`.
 *
 * Cada cosa, una vez por vuelo; lo rearma el vuelo siguiente, no un reloj. Y
 * entre vuelos, **nunca lo mismo seguido**: la curiosidad, el saludo y la
 * forma del punto del vuelo se recuerdan en el navegador, por piloto y sin
 * ningún dato de nadie. Ver `elegirSinRepetir`.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

import { hayTexto, t, type TranslationKey } from "../i18n";
import type { Fase } from "../flight/vuelo";
import type { Meteo } from "../world/meteo";
import {
  elTiempoDeAlla,
  minutosQueSeDicen,
  piezaDeMinutos,
  textoDeLaDuracion,
  type AnuncioMontado,
} from "./partes-de-la-comandante";
import { elegirSinRepetir } from "./sin-repetir";

/** Lo que cuenta, por su nombre. */
export type MomentoDeCrucero = "chicos" | "curiosidad" | "mitad";

/** Los dos que no van atados a un punto del vuelo. */
export type Suelto = "chicos" | "curiosidad";

/**
 * Las curiosidades, por su pieza: `comandante.curiosidad.<nombre>`. Ninguna
 * repite lo que ya cuenta otra voz —el frío de allá arriba y los oídos son de
 * la instructora; las luces de otro avión de noche, también—.
 */
export const CURIOSIDADES = ["alas", "rayas", "ventanilla", "ingles", "llave", "viento"] as const;

/** Los saludos a los chicos y a quien vuela por primera vez. */
export const SALUDOS_A_LOS_CHICOS = ["primeraVez", "tripulacion", "aterrizar"] as const;

/** Las dos formas de decir que se va por la mitad. */
export const MITADES = ["camino", "viaje"] as const;

/** Y la frase que presenta el parte de allá, detrás de la mitad. */
export const PARTE = "comandante.mitad.parte";

export const piezaDeCuriosidad = (c: string): string => `comandante.curiosidad.${c}`;
export const piezaDeLosChicos = (c: string): string => `comandante.chicos.${c}`;
export const piezaDeLaMitad = (c: string): string => `comandante.mitad.${c}`;

/** Dónde se recuerda lo último de cada cosa. Ver `datos/guardado.ts`. */
export const RECUERDOS = {
  curiosidad: "megafonia.curiosidad",
  chicos: "megafonia.chicos",
  mitad: "megafonia.mitad",
  /** Y cuál de los dos sueltos se contó la última vez: el otro va primero. */
  suelto: "megafonia.suelto",
} as const;

/**
 * Desde cuántos minutos de vuelo previsto cabe cada cosa.
 *
 * - **Veinticinco**: un salto entre islas de veinte minutos es subir, servir
 *   el agua y bajar; ahí no cabe nada más sin pisarse. Pasado eso, uno de los
 *   dos sueltos.
 * - **Cuarenta**: el punto del vuelo, que en un vuelo corto no lo hace nadie.
 * - **Sesenta**: los dos sueltos y el punto del vuelo.
 */
export const PARA_UNO = 25;
export const PARA_LA_MITAD = 40;
export const PARA_TODO = 60;

/**
 * **Y sin servicio, desde los quince, las dos.** Lo que llena un salto de
 * veinte minutos es la tripulación —el servicio, los cinturones, prepararse
 * para aterrizar—, y en un avión sin tripulación de cabina —el JAZ 60, de
 * diecinueve plazas— no pasa nadie: ese rato queda libre, y de El Hierro a La
 * Gomera se volaba entero en silencio entre el cartel y la bajada. Ahí caben
 * el saludo y la curiosidad, repartidos por el crucero.
 */
export const PARA_DOS_SIN_SERVICIO = 15;

/**
 * Cuánto tiene que haber callado la megafonía antes de contar algo, s.
 *
 * Un minuto y medio. El hueco de `Huecos` es de quince segundos detrás de un
 * anuncio, que es lo que pide una lección de la instructora; pero dos
 * anuncios de la comandante a quince segundos uno del otro suenan a que no
 * suelta el micrófono. Esto los reparte por el crucero.
 */
export const ENTRE_ANUNCIOS = 90;

/**
 * Con cuánto vuelo por delante ya no se empieza nada, s.
 *
 * Ocho minutos: con menos, lo que viene es la bajada, y una curiosidad a dos
 * minutos de «empezamos a bajar» la pisa o la empuja.
 */
export const ANTES_DE_BAJAR = 8 * 60;

/**
 * **Y con el punto de descenso a la vista, lo que falta para él**, s: con
 * menos de esto ya no se empieza nada.
 *
 * Los ocho minutos de arriba se cuentan hasta tocar tierra, y en un vuelo
 * alto eso cae ya bajando; en un salto corto a cuatro mil pies, con la bajada
 * de cinco minutos, cerraban el crucero tres minutos antes de empezar a
 * bajar, y ese rato se volaba en silencio. Lo que se quería guardar era el
 * aire entre lo que se cuenta y «empezamos a bajar»: dos minutos y medio.
 */
export const ANTES_DEL_DESCENSO = 150;

/** Y la última ocasión de contar algo, s antes de ese punto. Ver `paso`. */
const ULTIMA_OCASION = 15;

/**
 * **Hasta cuándo es la mitad del camino**, en lo que queda del tramo.
 *
 * Se dice al pasar la mitad —con la mitad o menos por delante— y hasta que
 * queda un tercio largo. Más tarde ya no es la mitad, y no se dice: el
 * momento pasó.
 */
export const MITAD_HASTA = 0.35;

/** Lo que mira el crucero para saber si le toca contar algo. */
export interface EnCrucero {
  readonly fase: Fase;
  readonly conPasaje: boolean;
  readonly conTripulacion: boolean;
  /** Si ya se dijo el anuncio de crucero: el cartel apagado arriba. */
  readonly cruceroDicho: boolean;
  /** Si la tripulación ya anunció el servicio. Sin tripulación no se mira. */
  readonly servicioDicho: boolean;
  /** Si ya se empezó a bajar hacia el destino. Ver `bajandoAlDestino`. */
  readonly bajando: boolean;
  readonly cartelPuesto: boolean;
  readonly turbulenciaPorPasar: boolean;
  /** La cabina estéril: subida, llegada o cerca de un campo. Ver `enFaseDeTrabajo`. */
  readonly enFaseDeTrabajo: boolean;
  readonly enEmergencia: boolean;
  /** Si hay hueco para lo que puede esperar. Ver `Huecos`. */
  readonly hayHueco: boolean;
  /** Si la megafonía suena o tiene algo esperando turno. */
  readonly megafoniaHabla: boolean;
  /** Lo que dura el tramo según el plan, en minutos, o `null` sin plan. */
  readonly minutosDelTramo: number | null;
  /** Lo que falta para tocar según el plan, s, o `null` si no se sabe. */
  readonly faltan: number | null;
  /**
   * Lo que falta para el punto de descenso del plan, s, o `null` si no se
   * sabe o ya se pasó. Ver `ANTES_DEL_DESCENSO`.
   */
  readonly alDescenso?: number | null;
  /** Cuál de los dos sueltos va primero: el que no se contó la última vez. */
  readonly primero: Suelto;
  /** Si hay algo grabado que contar de cada cosa. */
  readonly hay: (m: MomentoDeCrucero) => boolean;
}

/**
 * Cuántos de los dos sueltos caben en un tramo de estos minutos: con servicio
 * a bordo, o sin él. Ver `PARA_UNO_SIN_SERVICIO`.
 */
export function cuantosSueltos(minutos: number | null, conServicio = true): number {
  if (minutos === null) return 0;
  if (!conServicio) return minutos < PARA_DOS_SIN_SERVICIO ? 0 : 2;
  if (minutos < PARA_UNO) return 0;
  return minutos < PARA_TODO ? 1 : 2;
}

/** Si en un tramo de estos minutos cabe el punto del vuelo. */
export const cabeLaMitad = (minutos: number | null): boolean =>
  minutos !== null && minutos >= PARA_LA_MITAD;

const elOtro = (s: Suelto): Suelto => (s === "chicos" ? "curiosidad" : "chicos");

/**
 * **El reparto del crucero**: cuándo cuenta algo la comandante, y qué.
 *
 * Se llama cada fotograma y contesta `null` casi siempre. Lo que devuelve se
 * da por dicho: quien llama lo pide a la boca en ese mismo momento.
 */
export class MomentosDeCrucero {
  private readonly dichos = new Set<MomentoDeCrucero>();
  /** Segundos desde la última vez que sonó o esperó turno la megafonía. */
  private callada = Infinity;
  /** Si a la mitad del camino ya se le pasó el momento en este vuelo. */
  private mitadPasada = false;

  /** Vuelo nuevo: se olvida de lo dicho. */
  reiniciar(): void {
    this.dichos.clear();
    this.callada = Infinity;
    this.mitadPasada = false;
  }

  /** Si ya se contó en este vuelo. Para el juego y los bancos. */
  yaDicho(m: MomentoDeCrucero): boolean {
    return this.dichos.has(m);
  }

  paso(dt: number, c: EnCrucero): MomentoDeCrucero | null {
    this.callada = c.megafoniaHabla ? 0 : this.callada + dt;
    if (!enCruceroDeVerdad(c)) return null;
    const minutos = c.minutosDelTramo;
    const total = minutos === null ? null : minutos * 60;
    /*
     * La mitad del camino se mira antes que el hueco: si se pasa su momento
     * esperando, se pasa igual, y el segundo suelto ya no la espera.
     */
    const conMitad = cabeLaMitad(minutos) && c.hay("mitad");
    const queda = c.faltan !== null && total ? c.faltan / total : null;
    if (conMitad && !this.dichos.has("mitad") && queda !== null && queda < MITAD_HASTA)
      this.mitadPasada = true;
    const alDescenso = c.alDescenso ?? null;
    if (alDescenso !== null ? alDescenso < ANTES_DEL_DESCENSO : c.faltan !== null && c.faltan < ANTES_DE_BAJAR)
      return null;
    if (!c.hayHueco || c.megafoniaHabla || this.callada < ENTRE_ANUNCIOS) return null;

    if (
      conMitad &&
      !this.dichos.has("mitad") &&
      !this.mitadPasada &&
      queda !== null &&
      queda <= 0.5
    )
      return this.decir("mitad");

    // Los sueltos piden además el cartel apagado: con él puesto, se está a otra cosa.
    if (c.cartelPuesto) return null;
    const sueltos = [c.primero, elOtro(c.primero)]
      .filter((s) => c.hay(s))
      .slice(0, cuantosSueltos(minutos, c.conTripulacion));
    const siguiente = sueltos.find((s) => !this.dichos.has(s));
    if (!siguiente) return null;
    /*
     * **Y el segundo, detrás del punto del vuelo**, si este vuelo lo lleva: así
     * quedan repartidos —uno al principio del crucero, la mitad en su sitio y
     * el otro después— en vez de los dos seguidos al acabar el servicio.
     */
    const yaUno = sueltos.some((s) => this.dichos.has(s));
    /*
     * Sin saber lo que falta —fuera del plan— la mitad no se puede medir, y
     * esperarla sería esperar para siempre: el segundo va igual.
     */
    if (yaUno && conMitad && !this.dichos.has("mitad") && !this.mitadPasada && queda !== null)
      return null;
    /*
     * **Y sin el punto del vuelo, repartidas hasta la bajada**: lo que queda
     * por contar se reparte a partes iguales entre lo último que dijo la
     * megafonía y el punto de descenso, que es donde habla otra vez. Con `r`
     * cosas por decir, la siguiente va cuando lo callado ya es la parte que le
     * toca: `callada · r ≥ lo que falta para bajar`. Soltadas al principio, de
     * El Hierro a La Gomera quedaban cinco minutos callados antes de empezar a
     * bajar; repartidas contra el crucero medido al nivelar, la segunda caía
     * después del punto de no empezar nada —la velocidad al nivelar es baja y
     * el crucero parecía más largo— y no se decía. Mirado a cada paso, también
     * vale si el crucero cambia: otro nivel por los baches, otra bajada.
     */
    /*
     * Y si el reparto cae ya dentro de los dos minutos y medio de antes de
     * bajar, la última ocasión es justo antes: mejor un rato más corto que
     * callarla.
     */
    if (!conMitad && alDescenso !== null) {
      const quedan = sueltos.filter((s) => !this.dichos.has(s)).length;
      const ultimaOcasion = alDescenso < ANTES_DEL_DESCENSO + ULTIMA_OCASION;
      if (!ultimaOcasion && this.callada * quedan < alDescenso) return null;
    }
    return this.decir(siguiente);
  }

  private decir(m: MomentoDeCrucero): MomentoDeCrucero {
    this.dichos.add(m);
    this.callada = 0;
    return m;
  }
}

/** Las condiciones de todo lo que se cuenta aquí, menos el cartel. */
function enCruceroDeVerdad(c: EnCrucero): boolean {
  return (
    c.conPasaje &&
    c.fase === "en-vuelo" &&
    c.cruceroDicho &&
    (!c.conTripulacion || c.servicioDicho) &&
    !c.bajando &&
    !c.turbulenciaPorPasar &&
    !c.enFaseDeTrabajo &&
    !c.enEmergencia
  );
}

/**
 * **Si esta frase es una de las de aquí**, por su clave. Lo que espera turno
 * cuando empieza la bajada se retira con esto: «un dato curioso» con el avión
 * ya bajando es justo lo que no se dice.
 */
export function esUnMomentoDeCrucero(clave: string | undefined): boolean {
  return !!clave && /^comandante\.(?:curiosidad|chicos|mitad)(?:[.@~]|$)/.test(clave);
}

/** Lo que se cuenta, montado, y qué hay que recordar para la próxima vez. */
export interface LoQueCuenta extends AnuncioMontado {
  readonly recuerdo: { readonly llave: string; readonly valor: string };
}

/** Lo que hace falta para montar lo que se cuenta. */
export interface ParaContar {
  /** Si una pieza tiene su grabación. */
  readonly grabada: (pieza: string) => boolean;
  /** Lo último que se dijo de cada cosa, por su llave de `RECUERDOS`. */
  readonly ultima: (llave: string) => string | null;
  /** Lo que falta para tocar según el plan, s, o `null`. */
  readonly faltan: number | null;
  /** El tiempo de allá, o `null` si no se sabe. */
  readonly alla: Meteo | null;
  readonly azar?: () => number;
}

/** Las formas de una cosa que se pueden decir: escritas y grabadas. */
function lasQueSuenan(
  m: MomentoDeCrucero,
  grabada: (pieza: string) => boolean,
): readonly string[] {
  const nombres: readonly string[] =
    m === "curiosidad" ? CURIOSIDADES : m === "chicos" ? SALUDOS_A_LOS_CHICOS : MITADES;
  const pieza =
    m === "curiosidad" ? piezaDeCuriosidad : m === "chicos" ? piezaDeLosChicos : piezaDeLaMitad;
  return nombres.filter((n) => hayTexto(pieza(n)) && grabada(pieza(n)));
}

/** Si hay algo grabado que contar de esta cosa. */
export function hayAlgoQueContar(
  m: MomentoDeCrucero,
  grabada: (pieza: string) => boolean,
): boolean {
  return lasQueSuenan(m, grabada).length > 0;
}

/**
 * **Lo que se cuenta**, montado: la curiosidad o el saludo, enteros; y el
 * punto del vuelo con lo que falta y el último parte de allá.
 *
 * `null` si de esa cosa no hay nada grabado: lo que no suena no se pide.
 */
export function loQueCuenta(m: MomentoDeCrucero, p: ParaContar): LoQueCuenta | null {
  const azar = p.azar ?? Math.random;
  const llave = RECUERDOS[m];
  const nombre = elegirSinRepetir(lasQueSuenan(m, p.grabada), p.ultima(llave), azar);
  if (!nombre) return null;
  const recuerdo = { llave, valor: nombre };
  if (m !== "mitad") {
    const clave = m === "curiosidad" ? piezaDeCuriosidad(nombre) : piezaDeLosChicos(nombre);
    return { clave, relleno: {}, texto: t(clave as TranslationKey), recuerdo };
  }
  /*
   * **La mitad, con lo que falta y el último parte de allá.** Lo que falta,
   * con las mismas piezas que el descenso —«Vamos a aterrizar en unos veinte
   * minutos.»—, que es exactamente lo que se dice a mitad de camino; y el
   * parte, con las mismas del cielo y los grados. Nada de eso es nuevo de
   * grabar: lo nuevo son las dos frases de la mitad y la que presenta el
   * parte.
   */
  const mitad = piezaDeLaMitad(nombre);
  const relleno: Record<string, string> = { mitad };
  const textos = [t(mitad as TranslationKey)];
  const min =
    p.faltan === null ? null : minutosQueSeDicen(p.faltan, piezaDeMinutos, p.grabada);
  if (min !== null) {
    relleno.minutos = piezaDeMinutos(min);
    textos.push(textoDeLaDuracion("comandante.minutos", piezaDeMinutos, min));
  }
  if (p.alla && hayTexto(PARTE) && p.grabada(PARTE)) {
    const tiempo = elTiempoDeAlla(p.alla);
    relleno.parte = PARTE;
    Object.assign(relleno, tiempo.relleno);
    textos.push(t(PARTE as TranslationKey), tiempo.texto);
  }
  return { clave: "comandante.mitad", relleno, texto: textos.join(" "), recuerdo };
}
