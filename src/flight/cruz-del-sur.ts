/**
 * **La Cruz del Sur**: el tercer juego de la consola de la pantalla del asiento.
 * Sale el cielo de noche con sus estrellas de verdad, se tocan las cuatro de la
 * Cruz y se unen; y su brazo largo, alargado cuatro veces y media, lleva al polo
 * sur del cielo, y de ahí se baja al horizonte. Es como se encuentra el sur de
 * verdad, con los ojos y sin brújula.
 *
 * Lo eligió Enrique el 31-10-2026 (plan del largo radio, 4.3): es lo que solo
 * enseña este vuelo, el que cruza al otro hemisferio.
 *
 * ## El cielo que se enseña no es el del cristal
 *
 * Y aquí está la trampa. A 28° N, en Canarias, Ácrux ni llega a salir; y en la
 * mitad del vuelo, según la hora y la fecha, la Cruz puede estar o no estar, y
 * casi nunca a mano de la ventanilla de Ara. Así que este juego **no enseña lo que
 * hay por el cristal**: enseña **el cielo de Asunción, adonde vamos**, y lo dice
 * sin palabras con una Tierra chiquita y su marca en Asunción, y con palabras en
 * lo que dice Ara.
 *
 * Es un cielo concreto, no un dibujo: el de la madrugada del **6 de febrero de
 * 2027, a las 04:20 de Asunción** (07:20 UTC; Paraguay va con UTC−3 todo el año).
 * Se eligió ese instante porque se ve mejor que ningún otro:
 *
 * - **La Cruz está en lo más alto, de pie sobre el sur**: Gácrux a 58,0° y a un
 *   medio grado del meridiano, Ácrux a 52,0°. Es noche cerrada, con el Sol a 27° bajo
 *   el horizonte.
 * - **Sin Luna**: esa noche es luna nueva (y bajo el horizonte, a −24°).
 * - **Y a la hora del viaje de verdad**: en febrero el vuelo aterriza en Asunción a
 *   las 07:23, y a las cuatro y veinte ya está sobre Brasil.
 *
 * Las posiciones no se colocan a mano: salen de `world/cielo-de-noche.ts`, con su
 * tiempo sidéreo y su precesión, para ese sitio y ese instante. La altura del polo
 * sur del cielo, sin ir más lejos, sale 25,26°, que es la latitud de Asunción, como
 * tiene que ser. Y el horizonte es el de altura cero de esa misma cuenta.
 *
 * ## La línea no cae justo en el polo, y se dice
 *
 * Alargado desde Ácrux, por el cielo, el brazo se queda a **2,68°** del polo sur
 * (el arco que pasa por Gácrux y Ácrux nunca se le acerca a menos de 2,65°). La
 * regla dice «más o menos», y es verdad que es más o menos. Así que el dibujo no
 * lo fuerza: la línea acaba donde acaba, y lo que se marca es el polo de verdad
 * con un aro en el que la línea cae dentro. Y se baja **desde el polo**, que es de
 * donde sale el sur de verdad: así el punto cardinal no se lleva los tres grados
 * de error de la regla.
 *
 * ## Se gana siempre
 *
 * Sin reloj, sin vidas y sin fallo. Se toca en el orden que se quiera; tocar otra
 * estrella o el cielo vacío no hace nada, ni bueno ni malo; y si tarda, la mano
 * señala la que falta. Las normas se muestran, no se imponen.
 *
 * ## Por peldaños
 *
 * Con los canales de `escalera.ts`: en los dos de abajo, nada que leer. Desde
 * Taguato, que es donde entran las cifras, también **los dos punteros de Centauro**,
 * que señalan a la Cruz: su línea pasa a un grado de Gácrux. Y en Taguato Ruvicha,
 * además, el nombre de cada estrella al tocarla.
 *
 * Esto es solo la lógica y la cuenta: ni DOM ni audio. Lo dibuja `ui/cruz-del-sur.ts`
 * y lo que dice lo dice la conversación de la escena, como en los otros juegos.
 */

import {
  aplicar,
  CIELO_DE_ASUNCION,
  CRUZ_DEL_SUR,
  GRADO,
  mundoDesdeJ2000,
  precesion,
  PUNTEROS_DE_CENTAURO,
  siglos,
  traspuesta,
  unitario,
  type Vec3,
} from "../world/cielo-de-noche";
import type { Linea } from "./conversacion";
import { canalesDe, type Peldano } from "./escalera";

// ── El cielo de Asunción ─────────────────────────────────────────────────

/** **Desde dónde y cuándo**: ver la cabecera. El mismo sitio que el cielo de los escenarios de Paraguay. */
export const SITIO_DEL_CIELO = CIELO_DE_ASUNCION;
export const INSTANTE_DEL_CIELO = new Date("2027-02-06T07:20:00Z");

/** Del catálogo J2000 a los ejes del juego —X al este, Y arriba, Z al sur—, en ese sitio y ese instante. */
const DESDE_J2000 = mundoDesdeJ2000(INSTANTE_DEL_CIELO, SITIO_DEL_CIELO.lat, SITIO_DEL_CIELO.lon);

/** Dónde queda en el cielo de Asunción una dirección del catálogo. */
export const enElCielo = (j2000: Vec3): Vec3 => aplicar(DESDE_J2000, j2000);

/**
 * **Mirando al sur, un poco hacia arriba**, con la perspectiva de una foto: el plano
 * tangente, en el que **todo arco del cielo es una recta**. Por eso la línea del brazo
 * y el horizonte se dibujan rectos sin mentir, y lo que se aleja al alejar la vista
 * es la misma foto, sin que nada cambie de sitio. El oeste queda a la derecha, como
 * cuando se mira al sur de pie.
 */
const ALTURA_DE_LA_MIRADA = 30 * GRADO;
const SENO_M = Math.sin(ALTURA_DE_LA_MIRADA);
const COSENO_M = Math.cos(ALTURA_DE_LA_MIRADA);

export interface EnElPlano {
  readonly x: number;
  readonly y: number;
}

/** De una dirección en los ejes del juego al plano. `null` si queda a la espalda. */
export function enElPlano(v: Vec3): EnElPlano | null {
  const hondo = SENO_M * v[1] + COSENO_M * v[2];
  if (hondo < 0.05) return null;
  return { x: -v[0] / hondo, y: (COSENO_M * v[1] - SENO_M * v[2]) / hondo };
}

/** Lo mismo, de un punto que se sabe delante: lo de la Cruz y lo que la rodea. */
const delante = (v: Vec3): EnElPlano => enElPlano(v)!;

/** La altura del horizonte en el plano: lo que da la cuenta para altura cero. */
export const HORIZONTE = -Math.tan(ALTURA_DE_LA_MIRADA);

// ── Las estrellas del juego ──────────────────────────────────────────────

export type EstrellaDeLaCruz = "gacrux" | "acrux" | "mimosa" | "delta";
export type Puntero = "alfa" | "beta";
export type EstrellaDelJuego = EstrellaDeLaCruz | Puntero;

export const LA_CRUZ: readonly EstrellaDeLaCruz[] = ["gacrux", "acrux", "mimosa", "delta"];
export const LOS_PUNTEROS: readonly Puntero[] = ["alfa", "beta"];
export const LAS_SEIS: readonly EstrellaDelJuego[] = [...LA_CRUZ, ...LOS_PUNTEROS];

const J2000: Readonly<Record<EstrellaDelJuego, Vec3>> = {
  gacrux: unitario(CRUZ_DEL_SUR.gacrux.ra, CRUZ_DEL_SUR.gacrux.dec),
  acrux: unitario(CRUZ_DEL_SUR.acrux.ra, CRUZ_DEL_SUR.acrux.dec),
  mimosa: unitario(CRUZ_DEL_SUR.mimosa.ra, CRUZ_DEL_SUR.mimosa.dec),
  delta: unitario(CRUZ_DEL_SUR.delta.ra, CRUZ_DEL_SUR.delta.dec),
  alfa: unitario(PUNTEROS_DE_CENTAURO.alfa.ra, PUNTEROS_DE_CENTAURO.alfa.dec),
  beta: unitario(PUNTEROS_DE_CENTAURO.beta.ra, PUNTEROS_DE_CENTAURO.beta.dec),
};

/** Dónde está cada una, en el cielo de Asunción. */
export const EN_EL_CIELO = Object.fromEntries(LAS_SEIS.map((e) => [e, enElCielo(J2000[e])])) as Readonly<
  Record<EstrellaDelJuego, Vec3>
>;

/** Y en el plano. */
export const EN_EL_PLANO = Object.fromEntries(LAS_SEIS.map((e) => [e, delante(EN_EL_CIELO[e])])) as Readonly<
  Record<EstrellaDelJuego, EnElPlano>
>;

// ── El brazo, el polo y el sur ───────────────────────────────────────────

const punto = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** El ángulo entre dos direcciones, en grados. */
export const entre = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, punto(a, b)))) / GRADO;

/**
 * **Por el arco del cielo que va de `a` a `b`, `k` veces esa distancia desde `a`.**
 * Se mide por el cielo y no por una cuerda: «cuatro veces y media» es lo que se mide
 * con el puño levantado.
 */
function porElArco(a: Vec3, b: Vec3, k: number): Vec3 {
  const t = Math.acos(punto(a, b));
  const s = Math.sin(t);
  const f = Math.sin(t * (1 - k)) / s;
  const g = Math.sin(t * k) / s;
  return [a[0] * f + b[0] * g, a[1] * f + b[1] * g, a[2] * f + b[2] * g];
}

/** **Cuántas veces se alarga**, desde Ácrux, el brazo largo: de Gácrux a Ácrux. */
export const VECES_EL_BRAZO = 4.5;

/** Lo que mide el brazo largo, en grados. */
export const LARGO_DEL_BRAZO = entre(J2000.gacrux, J2000.acrux);

/** Dónde acaba, en J2000: desde Gácrux, una vez hasta Ácrux y cuatro y media más. */
export const FIN_DEL_BRAZO = porElArco(J2000.gacrux, J2000.acrux, 1 + VECES_EL_BRAZO);

/**
 * **El polo sur del cielo de esa fecha**, en J2000: el eje de la Tierra se ha ido más
 * de una décima de grado desde 2000, y el polo que importa es el de esa noche.
 */
export const POLO_SUR = aplicar(traspuesta(precesion(siglos(INSTANTE_DEL_CIELO))), [0, 0, -1]);

/** **Cuánto se queda el brazo del polo**, en grados. Ver la cabecera. */
export const LO_QUE_SE_QUEDA_DEL_POLO = entre(FIN_DEL_BRAZO, POLO_SUR);

/** **Lo más cerca que pasa la línea de los punteros**, de Alfa a Beta y siguiendo, de una estrella. */
export function loQuePasanLosPunterosDe(j2000: Vec3): { readonly grados: number; readonly veces: number } {
  let mejor = { grados: Infinity, veces: 0 };
  for (let k = 1; k <= 8; k += 0.002) {
    const grados = entre(porElArco(J2000.alfa, J2000.beta, k), j2000);
    if (grados < mejor.grados) mejor = { grados, veces: k };
  }
  return mejor;
}
const LOS_PUNTEROS_HACIA_GACRUX = loQuePasanLosPunterosDe(J2000.gacrux);

/** Las veces la distancia de los punteros que dibuja su línea: hasta casi Gácrux, que no la tape. */
const HASTA_DONDE_LOS_PUNTEROS = 1 + (LOS_PUNTEROS_HACIA_GACRUX.veces - 1) * 0.86;

/** **Lo que se dibuja del brazo y del sur, en el plano**: rectas, como dice `enElPlano`. */
export const EN_EL_DIBUJO = (() => {
  const p = EN_EL_PLANO;
  /** Donde se cruzan los dos palos de la Cruz. Cada estrella que se toca se une a este punto. */
  const cruce = ((): EnElPlano => {
    const [a, b, c, d] = [p.gacrux, p.acrux, p.mimosa, p.delta];
    const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
    const k = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den;
    return { x: a.x + k * (b.x - a.x), y: a.y + k * (b.y - a.y) };
  })();
  const polo = delante(enElCielo(POLO_SUR));
  return {
    cruce,
    /** Cada vez que se alarga el brazo, por el cielo: la última es la media. */
    marcas: [1, 2, 3, 4, VECES_EL_BRAZO].map((v) => delante(enElCielo(porElArco(J2000.gacrux, J2000.acrux, 1 + v)))),
    fin: delante(enElCielo(FIN_DEL_BRAZO)),
    polo,
    /** El aro del polo, en el plano: con su sitio para que la línea caiga dentro. */
    radioDelPolo: Math.tan((LO_QUE_SE_QUEDA_DEL_POLO + 0.6) * GRADO),
    /** El sur en el horizonte, debajo del polo: la misma columna, porque en esa dirección está el meridiano. */
    sur: { x: polo.x, y: HORIZONTE },
    /** Hasta dónde llega la línea de los punteros, que señala a la Cruz. */
    punteros: delante(enElCielo(porElArco(J2000.alfa, J2000.beta, HASTA_DONDE_LOS_PUNTEROS))),
  } as const;
})();

// ── Cómo se encuadra ─────────────────────────────────────────────────────

/** **Un encuadre del plano en la hoja**: píxeles por unidad, y qué punto del plano va en el centro de la hoja. */
export interface Vista {
  readonly f: number;
  readonly ox: number;
  readonly oy: number;
}

/** De un punto del plano a un píxel de una hoja de `w` × `h`. */
export const aPantalla = (v: Vista, w: number, h: number, p: EnElPlano): EnElPlano => ({
  x: w / 2 + v.f * (p.x - v.ox),
  y: h / 2 - v.f * (p.y - v.oy),
});

/**
 * **Lo más cerca que se mira**, en píxeles por unidad: con más, la Cruz se queda sola
 * en una pantalla grande y deja de ser un cielo.
 */
const LO_MAS_CERCA = 1700;

/** Lo que ocupa la Tierra chiquita, en px con su margen, en la esquina de abajo a la izquierda. */
const LO_QUE_OCUPA_LA_TIERRA = 76;

/**
 * **Para tocar**: de cerca, y con lo que se toca en el sitio libre de la hoja, sin caer
 * debajo de los botones de arriba ni de la Tierra chiquita. De pie sobra alto, y se
 * deja abajo para lo que se va a ver después; tumbado, se aparta a un lado.
 */
export function vistaParaTocar(w: number, h: number, conPunteros: boolean): Vista {
  const estrellas = (conPunteros ? LAS_SEIS : LA_CRUZ).map((e) => EN_EL_PLANO[e]);
  const [x0, x1] = [Math.min(...estrellas.map((s) => s.x)), Math.max(...estrellas.map((s) => s.x))];
  const [y0, y1] = [Math.min(...estrellas.map((s) => s.y)), Math.max(...estrellas.map((s) => s.y))];
  const deLado = w > h;
  const arriba = 58;
  const abajo = deLado ? 30 : Math.round(h * 0.38);
  // De pie, lo justo para que la diana quepa entera: es el ancho lo que da los 44 px entre estrellas.
  const izquierda = deLado ? LO_QUE_OCUPA_LA_TIERRA + 10 : 23;
  const derecha = deLado ? 30 : 23;
  const f = Math.min(LO_MAS_CERCA, (w - izquierda - derecha) / (x1 - x0), (h - arriba - abajo) / (y1 - y0));
  const cx = izquierda + (w - izquierda - derecha) / 2;
  const cy = arriba + (h - arriba - abajo) / 2;
  return { f, ox: (x0 + x1) / 2 - (cx - w / 2) / f, oy: (y0 + y1) / 2 + (cy - h / 2) / f };
}

/**
 * **Para ver el sur**: la misma foto, de lejos, de Gácrux al horizonte y con el sur en
 * el medio. Y sin que se salgan los punteros, en la hoja estrecha.
 */
export function vistaDelSur(w: number, h: number): Vista {
  const arriba = 26;
  const abajo = 48;
  const alto = EN_EL_PLANO.gacrux.y - HORIZONTE;
  const ancho = 2 * Math.max(Math.abs(EN_EL_PLANO.alfa.x - EN_EL_DIBUJO.sur.x), Math.abs(EN_EL_PLANO.delta.x - EN_EL_DIBUJO.sur.x));
  const f = Math.min((h - arriba - abajo) / alto, (w - 40) / ancho);
  return { f, ox: EN_EL_DIBUJO.sur.x, oy: EN_EL_PLANO.gacrux.y - (h / 2 - arriba) / f };
}

/**
 * **Entre un encuadre y otro**, de 0 a 1. Se aleja en proporción, no en píxeles: un
 * alejamiento de cámara que va de ocho a uno tiene que tardar lo mismo en cada doble.
 */
export function vistaEntre(a: Vista, b: Vista, k: number): Vista {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const f = a.f * Math.pow(b.f / a.f, k);
  // El centro se mueve con el inverso de la escala: así no se ve que se desvíe mientras se aleja.
  const u = (1 / f - 1 / a.f) / (1 / b.f - 1 / a.f);
  return { f, ox: a.ox + (b.ox - a.ox) * u, oy: a.oy + (b.oy - a.oy) * u };
}

// ── Lo que se dice ───────────────────────────────────────────────────────

/** Lo que dice Ara: a quien juega a su lado, de vos. */
const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.kit.cruz.${clave}` });

export const DICHO_DE_LA_CRUZ = {
  /** Al abrir: adónde mira este cielo. Se explica como las demás pantallas: ver `flight/explicacion-al-abrir.ts`. */
  explica: ara("explica"),
  /** Qué hay que hacer: lo mismo que se repite si pasa un rato sin tocar. */
  empezar: ara("empezar"),
  /** Los punteros: desde Taguato. */
  punteros: ara("punteros"),
  /** Se encendió. */
  encendida: ara("encendida"),
  /** El dato del sur. */
  sur: ara("sur"),
  /** Los navegantes y la bandera: desde Taguato, que abajo con dos frases ya hay bastante. */
  navegantes: ara("navegantes"),
} as const;

/** Todas las frases de este juego, para la lista de grabar y las pruebas. */
export const LINEAS_DE_LA_CRUZ: readonly Linea[] = Object.values(DICHO_DE_LA_CRUZ);

// ── El juego ─────────────────────────────────────────────────────────────

/** **Cuánto sin tocar antes de que la mano señale**, s de pared. Un niño de cuatro años mira un rato antes de tocar. */
const LA_MANO_SIN_TOCAR = 9;
/** Y a los cuántos toques sin dar en nada, que quien toca busca: la mano ya, sin esperar el rato. */
const TOQUES_PARA_LA_MANO = 3;
/** Lo menos entre dos recordatorios de palabra, s. */
const ENTRE_RECUERDOS = 25;
/** Lo que tarda cada estrella en unirse, s. */
const TARDA_EN_UNIRSE = 0.45;

/**
 * **El final, en s desde que se tocó la última**: se enciende, se aleja, se dibuja el
 * brazo con su marca en cada vez, sale el polo, se baja al horizonte y aparece el sur.
 * Son tiempos y no esperas: nada espera a nadie, así que nada se puede colgar. El
 * reloj es el de pared, que el ⏩ acelera el avión de Ara y no este cielo.
 */
const ENCIENDE = [0, 0.9] as const;
const SE_ALEJA = [0.9, 3.4] as const;
const EL_BRAZO = [1.4, 4.6] as const;
const EL_POLO = [4.6, 5.1] as const;
const LA_BAJADA = [5.1, 6.1] as const;
const EL_PUNTO = [6.1, 6.7] as const;
export const DURA_EL_FINAL = EL_PUNTO[1];

const tramo = ([a, b]: readonly [number, number], t: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)));

/** Lo que se ve del juego: para el dibujo, el banco y las pruebas. */
export interface EstadoDeLaCruz {
  readonly juego: "cruz";
  /** Si este peldaño toca también los punteros, y si lee los nombres. */
  readonly conPunteros: boolean;
  readonly conNombres: boolean;
  /** Si este peldaño lee cifras: las marcas del brazo llevan su número, y el sur su letra. */
  readonly conCifras: boolean;
  /** Si este peldaño lee algo: el botón de «no volver a explicar» lleva su palabra. */
  readonly conLetras: boolean;
  /** Lo que ya se tocó, en el orden en que se tocó. */
  readonly tocadas: readonly EstrellaDelJuego[];
  /** Lo que lleva unido cada estrella tocada al cruce de la Cruz, de 0 a 1. */
  readonly unidas: Readonly<Partial<Record<EstrellaDelJuego, number>>>;
  /** A cuál señala la mano, si tarda. */
  readonly mano: EstrellaDelJuego | null;
  /** Lo del final, de 0 a 1 cada cosa. */
  readonly encendida: number;
  readonly lejos: number;
  readonly brazo: number;
  readonly polo: number;
  readonly bajada: number;
  readonly punto: number;
  readonly terminado: boolean;
  /** Si se ofrece «no volver a explicar»: desde la segunda vez. */
  readonly ofreceNoExplicar: boolean;
  /** Cuántas veces señaló la mano. Para las pruebas. */
  readonly ayudas: number;
}

export class JuegoDeLaCruz {
  readonly juego = "cruz" as const;
  private reloj = 0;
  private readonly tocadas: EstrellaDelJuego[] = [];
  private readonly cuandoSeToco = new Map<EstrellaDelJuego, number>();
  private final: number | null = null;
  private acabado = false;
  private quieto = 0;
  private toquesEnNada = 0;
  private mano: EstrellaDelJuego | null = null;
  private ayudas = 0;
  private recordado = -Infinity;
  private empezado = false;
  private punterosDichos = false;
  private readonly porDecir: Linea[] = [];
  /** Lo que ya no viene a cuento, si todavía no se dijo. Ver `tomarLoQueSobra`. */
  private sobra: readonly string[] = [];
  private ofreceNoExplicar: boolean;
  private readonly explicar: boolean;
  private readonly canales: ReturnType<typeof canalesDe>;

  constructor(peldano: Peldano = "dibujo", vez: { readonly explicar: boolean; readonly ofrecerQuitarla: boolean } = { explicar: true, ofrecerQuitarla: false }) {
    this.canales = canalesDe(peldano);
    this.explicar = vez.explicar;
    this.ofreceNoExplicar = vez.ofrecerQuitarla;
  }

  get terminado(): boolean {
    return this.acabado;
  }

  /** Desde Taguato, que es donde entran las cifras: ver la cabecera. */
  get conPunteros(): boolean {
    return this.canales.cifra;
  }

  /** Lo que hay que tocar en este peldaño. */
  get estrellas(): readonly EstrellaDelJuego[] {
    return this.conPunteros ? LAS_SEIS : LA_CRUZ;
  }

  /** Lo que falta por tocar. */
  get faltan(): readonly EstrellaDelJuego[] {
    return this.estrellas.filter((e) => !this.tocadas.includes(e));
  }

  /** Lo que quiere decir este juego desde la última vez, en orden. */
  tomarLoQueDecir(): Linea[] {
    if (!this.empezado) {
      this.empezado = true;
      if (this.explicar) this.porDecir.unshift(DICHO_DE_LA_CRUZ.explica, DICHO_DE_LA_CRUZ.empezar);
    }
    return this.porDecir.splice(0);
  }

  /**
   * **Lo que esperaba turno y ya no viene a cuento**, para que la escena lo quite: quien
   * toca deprisa acaba antes de que Ara acabe de contar, y «¡tocalas!» con la Cruz ya
   * encendida es una frase de otro rato. Y lo mismo con la explicación que se pidió quitar.
   */
  tomarLoQueSobra(): readonly string[] {
    const s = this.sobra;
    this.sobra = [];
    return s;
  }

  /** «No volver a explicar»: el botón se va, y lo de explicar, si no se dijo. Lo guardado en el perfil lo lleva el kit. */
  dejarDeOfrecer(): void {
    this.ofreceNoExplicar = false;
    this.sobra = [...this.sobra, DICHO_DE_LA_CRUZ.explica.clave];
  }

  /**
   * **Se toca una estrella de las del juego.** En cualquier orden, sin más regla que esa.
   * Una que ya está tocada, o una que este peldaño no pide, no hace nada.
   */
  tocar(e: EstrellaDelJuego): void {
    if (this.acabado || this.final !== null || !this.faltan.includes(e)) return;
    this.tocadas.push(e);
    this.cuandoSeToco.set(e, this.reloj);
    this.quieto = 0;
    this.toquesEnNada = 0;
    this.mano = null;
    const laCruzEsta = LA_CRUZ.every((c) => this.tocadas.includes(c));
    // Los punteros, una vez: al tocar el primero o al encenderse la Cruz, lo que llegue antes.
    if (this.conPunteros && !this.punterosDichos && (laCruzEsta || (LOS_PUNTEROS as readonly string[]).includes(e)) && this.faltan.length > 0) {
      this.punterosDichos = true;
      this.porDecir.push(DICHO_DE_LA_CRUZ.punteros);
    }
    if (this.faltan.length > 0) return;
    this.final = this.reloj;
    this.sobra = [DICHO_DE_LA_CRUZ.explica.clave, DICHO_DE_LA_CRUZ.empezar.clave, DICHO_DE_LA_CRUZ.punteros.clave];
    // Lo que pedía tocar y todavía no salió de este juego, tampoco: ya está todo tocado.
    this.porDecir.length = 0;
    this.porDecir.push(DICHO_DE_LA_CRUZ.encendida, DICHO_DE_LA_CRUZ.sur);
    if (this.conPunteros) this.porDecir.push(DICHO_DE_LA_CRUZ.navegantes);
  }

  /**
   * **Se toca otra cosa**: otra estrella o el cielo vacío. No pasa nada, ni bueno ni
   * malo. Solo cuenta para ayudar antes a quien está buscando.
   */
  tocarOtraCosa(): void {
    if (this.acabado || this.final !== null) return;
    this.toquesEnNada++;
  }

  /**
   * **Un paso**, s de pared. Si tarda, la mano señala la que falta y se queda ahí hasta
   * que se toque algo; y si sigue tardando, de palabra otra vez, en un silencio.
   */
  paso(dt: number, callada: boolean): void {
    this.reloj += dt;
    if (this.acabado) return;
    if (this.final !== null) {
      if (this.reloj - this.final >= DURA_EL_FINAL) this.acabado = true;
      return;
    }
    this.quieto += dt;
    if (this.mano === null && (this.quieto >= LA_MANO_SIN_TOCAR || this.toquesEnNada >= TOQUES_PARA_LA_MANO)) {
      this.mano = this.faltan[0] ?? null;
      this.ayudas++;
      this.quieto = 0;
      this.toquesEnNada = 0;
    } else if (this.mano !== null && this.quieto >= LA_MANO_SIN_TOCAR && callada && this.reloj - this.recordado >= ENTRE_RECUERDOS) {
      this.recordado = this.reloj;
      this.quieto = 0;
      this.porDecir.push(DICHO_DE_LA_CRUZ.empezar);
    }
  }

  get estado(): EstadoDeLaCruz {
    const unidas: Partial<Record<EstrellaDelJuego, number>> = {};
    for (const [e, en] of this.cuandoSeToco) unidas[e] = Math.min(1, (this.reloj - en) / TARDA_EN_UNIRSE);
    const t = this.final === null ? -1 : this.reloj - this.final;
    return {
      juego: "cruz",
      conPunteros: this.conPunteros,
      conNombres: this.canales.cabina,
      conCifras: this.canales.cifra,
      conLetras: this.canales.texto,
      tocadas: [...this.tocadas],
      unidas,
      mano: this.mano,
      encendida: tramo(ENCIENDE, t),
      lejos: tramo(SE_ALEJA, t),
      brazo: tramo(EL_BRAZO, t),
      polo: tramo(EL_POLO, t),
      bajada: tramo(LA_BAJADA, t),
      punto: tramo(EL_PUNTO, t),
      terminado: this.acabado,
      ofreceNoExplicar: this.ofreceNoExplicar && this.final === null,
      ayudas: this.ayudas,
    };
  }
}
