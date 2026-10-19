/**
 * **Luz verde**: el tercer juego del kit de viaje. Quien juega es la torre de
 * La Palma, el aeropuerto adonde va Ara, y les da luz a los avioncitos que
 * llegan por el circuito con la lámpara de señales.
 *
 * Pedido por Enrique (punto 304 de su lista): «dar luz verde o roja a los
 * aviones que llegan, con las señales de luz de verdad; si dos se juntan, uno
 * se va al aire y se celebra. Engancha con la canción». Los dos juegos de antes
 * «se resuelven en medio minuto»; este dura de dos a tres, y tiene cosas que
 * descubrir.
 *
 * ## Lo que se enseña es lo de verdad
 *
 * Las señales son las de SERA (Reglamento UE 923/2012, apéndice 1, punto 3),
 * que son las del Anexo 2 de la OACI: con el avión en vuelo, **verde fija** es
 * «autorizado a aterrizar»; **roja fija**, «ceda el paso y siga en el
 * circuito»; **destellos rojos**, «aeródromo inseguro, no aterrice», y
 * **destellos verdes**, «vuelva para aterrizar». Y el avión contesta como
 * contesta uno de verdad: de día, **alabeando, excepto en el tramo de base y
 * en la final**, y de noche encendiendo y apagando dos veces los faros.
 *
 * Y lo que más importa contar: **la lámpara es el plan B de la radio**. Lo
 * normal es que la torre y los aviones hablen por radio; la lámpara es para
 * el avión que se quedó sin ella. Así que en el juego los aviones con la
 * radio rota llevan su dibujo —la radio tachada— y hay aviones con la radio
 * bien que hablan con la torre y aterrizan sin luz: son los que enseñan que
 * eso es lo normal. Lo dice Ara al empezar, y lo enseña el dibujo de la mesa
 * de la torre, sin palabras: la radio que no va y la luz que la sustituye.
 *
 * La pista es la de La Palma de verdad, la 36 con su umbral desplazado, su
 * salida C y la plataforma, sacadas de `gcla.aero.json`, y el circuito va por
 * el este, sobre el mar, que es por donde lo publica el AIP (AD 2-GCLA, 22.4).
 *
 * ## Renunciar es ganar, y nunca se pierde
 *
 * Con roja, el avión sigue en el circuito y da otra vuelta: **se celebra**,
 * que esperar su turno es volar bien. Si quien juega se equivoca y le da verde
 * al segundo con la pista ocupada, no pasa nada malo: el avión ve la pista
 * ocupada, **se va al aire solo** —que es lo que hace un piloto de verdad— y
 * también se celebra. Nada choca, no hay pantalla roja ni nada que se pierda.
 * Un avión sin radio y sin luz verde no aterriza —espera la luz—, y da vueltas
 * hasta que se la dan: lo que se le ayuda es a ver cuál pide luz y cuál.
 *
 * ## Por peldaños
 *
 * Abajo, verde y roja fijas. Arriba —desde el peldaño de las cifras—, también
 * los destellos: una ronda con el camión de los bomberos revisando la pista,
 * en la que hay que avisar con destellos rojos y después llamar con destellos
 * verdes. Y en el peldaño de cabina, una última ronda de noche, en la que el
 * avión contesta con los faros, en lugar de la primera. Ver `escalera.ts`.
 *
 * Esto es solo la lógica, en metros del aeródromo —x al este, y al norte, como
 * el fichero—: ni DOM ni audio. Lo dibuja `ui/luz-verde.ts`.
 */

import GCLA from "../../data/aerodromes/gcla.aero.json";
import type { Linea } from "./conversacion";
import type { Peldano } from "./escalera";

type P = readonly [number, number];

/** Lo que dice Ara en este juego: a quien juega a su lado, de vos. */
const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.kit.luz.${clave}` });

export const DICHO_DE_LA_LUZ = {
  /** El plan B, al empezar: lo normal es la radio. */
  radio: ara("radio"),
  /** Qué hay que hacer: lo mismo que se repite si pasa un rato sin tocar. */
  empezar: ara("empezar"),
  /** La primera vez que un avión alabea para contestar. */
  alas: ara("alas"),
  /** Y la primera vez que contesta sin alabear, en base o en final. */
  sinAlas: ara("sinAlas"),
  /** Con roja: da otra vuelta, y se celebra. */
  roja: ara("roja"),
  /** Con la pista ocupada, se fue al aire solo: también se celebra. */
  alAire: ara("alAire"),
  /** El primer avión con la radio bien: lo normal. */
  conRadio: ara("conRadio"),
  fin: ara("fin"),
  destellosRojos: ara("destellosRojos"),
  destellosVerdes: ara("destellosVerdes"),
  noche: ara("noche"),
} as const;

/** Todas las frases de este juego, para la lista de grabar y las pruebas. */
export const LINEAS_DE_LA_LUZ: readonly Linea[] = Object.values(DICHO_DE_LA_LUZ);

// ── La pista y el circuito ───────────────────────────────────────────────

const PISTA = GCLA.runways[0]!;
const CABECERA = PISTA.thresholds["36"];
const RUMBO = (CABECERA.headingTrue * Math.PI) / 180;
/** Hacia donde se aterriza, y a su derecha, que es el este: el lado del circuito. */
const U: P = [Math.sin(RUMBO), Math.cos(RUMBO)];
const N: P = [U[1], -U[0]];
/** **El umbral de la 36**, desplazado sus metros: donde empieza lo que se puede tocar. */
const CABEZA = CABECERA.xy as unknown as P;
const UMBRAL: P = [CABEZA[0] + U[0] * CABECERA.displacedM, CABEZA[1] + U[1] * CABECERA.displacedM];
/** De metros de la pista —`a` a lo largo desde el umbral, `c` a la derecha— a metros del aeródromo. */
export const enLaPista = (a: number, c: number): P => [UMBRAL[0] + U[0] * a + N[0] * c, UMBRAL[1] + U[1] * a + N[1] * c];
const aLoLargo = (p: P): number => (p[0] - UMBRAL[0]) * U[0] + (p[1] - UMBRAL[1]) * U[1];
const FIN_DE_PISTA = aLoLargo(PISTA.thresholds["18"].xy as unknown as P);
export const ANCHO_DE_PISTA = PISTA.widthM;
export const RUMBO_DE_LA_PISTA = RUMBO;

/**
 * **El circuito**, en metros de la pista. Un circuito de mano derecha para la
 * 36, por el este: después de la pista se gira a la derecha, el tramo de
 * viento en cola va hacia el sur sobre el mar y se gira a la derecha otra vez
 * a la base y a la final. Las medidas son las de un circuito de juguete —los
 * avioncitos van mucho más deprisa que uno de verdad—, pero el lado y el
 * orden de los tramos son los de verdad.
 */
const DECIDE = -220;
const ARRIBA = FIN_DE_PISTA + 100;
const ABAJO = -820;
const LADO = 1250;
/** Dónde toca, y la salida C, por donde deja la pista. */
const TOMA = 280;
const SALIDA_C: P = [0.2, -54.2];
const A_LA_SALIDA = aLoLargo(SALIDA_C);
/** La calle de la plataforma, de la salida C hacia el sur, y los puestos. */
const CALLE: readonly P[] = [[58.4, -27.8], [92.1, -65.6], [100.2, -79.1], [105.7, -92.9], [108.5, -109.1]];
const PUESTOS: readonly P[] = [[159.1, -168.6], [160.9, -229.8], [162.6, -280.5], [163.2, -341.1], [167.3, -399]];

export type Tramo = "subida" | "travesia" | "viento" | "base" | "final" | "pista" | "rodaje" | "puesto";

interface Camino {
  readonly puntos: readonly P[];
  readonly hasta: readonly number[];
  readonly tramos: readonly Tramo[];
  readonly largo: number;
}

function camino(puntos: readonly P[], tramos: readonly Tramo[]): Camino {
  const hasta = [0];
  for (let i = 1; i < puntos.length; i++)
    hasta.push(hasta[i - 1]! + Math.hypot(puntos[i]![0] - puntos[i - 1]![0], puntos[i]![1] - puntos[i - 1]![1]));
  return { puntos, hasta, tramos, largo: hasta[hasta.length - 1]! };
}

/** El punto, el rumbo y el tramo de un camino a `s` metros de su principio. */
function enElCamino(c: Camino, s: number): { readonly p: P; readonly rumbo: number; readonly tramo: Tramo } {
  const t = Math.max(0, Math.min(c.largo, s));
  let i = 1;
  while (i < c.puntos.length - 1 && c.hasta[i]! < t) i++;
  const a = c.puntos[i - 1]!;
  const b = c.puntos[i]!;
  const l = c.hasta[i]! - c.hasta[i - 1]!;
  const f = l > 0 ? (t - c.hasta[i - 1]!) / l : 0;
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], rumbo: Math.atan2(b[0] - a[0], b[1] - a[1]), tramo: c.tramos[i - 1]! };
}

/** **La vuelta del circuito**, desde el punto de decidir en la final corta hasta volver a él. */
const VUELTA: Camino = (() => {
  // Las esquinas, con su tramo: lo que va hasta la mitad de la curva es del tramo de antes.
  const esquinas: readonly { readonly a: number; readonly c: number; readonly antes: Tramo; readonly despues: Tramo }[] = [
    { a: ARRIBA, c: 0, antes: "subida", despues: "travesia" },
    { a: ARRIBA, c: LADO, antes: "travesia", despues: "viento" },
    { a: ABAJO, c: LADO, antes: "viento", despues: "base" },
    { a: ABAJO, c: 0, antes: "base", despues: "final" },
  ];
  const R = 260;
  const puntos: P[] = [enLaPista(DECIDE, 0)];
  const tramos: Tramo[] = [];
  const hacia = (de: { a: number; c: number }, a: { a: number; c: number }, d: number) => {
    const l = Math.hypot(a.a - de.a, a.c - de.c);
    return { a: de.a + ((a.a - de.a) * d) / l, c: de.c + ((a.c - de.c) * d) / l };
  };
  const todas = [{ a: DECIDE, c: 0 }, ...esquinas, { a: DECIDE, c: 0 }];
  for (let k = 0; k < esquinas.length; k++) {
    const antes = todas[k]!;
    const e = esquinas[k]!;
    const despues = todas[k + 2]!;
    const p0 = hacia(e, antes, R);
    const p2 = hacia(e, despues, R);
    puntos.push(enLaPista(p0.a, p0.c));
    tramos.push(e.antes);
    // La curva, con la esquina de control: ocho trocitos.
    for (let j = 1; j <= 8; j++) {
      const t = j / 8;
      const a = (1 - t) * (1 - t) * p0.a + 2 * (1 - t) * t * e.a + t * t * p2.a;
      const c = (1 - t) * (1 - t) * p0.c + 2 * (1 - t) * t * e.c + t * t * p2.c;
      puntos.push(enLaPista(a, c));
      tramos.push(t <= 0.5 ? e.antes : e.despues);
    }
  }
  puntos.push(enLaPista(DECIDE, 0));
  tramos.push("final");
  return camino(puntos, tramos);
})();
export const VUELTA_DEL_CIRCUITO = VUELTA.largo;

/** **El aterrizaje**: de la final corta a la toma, la carrera hasta la salida C, la calle y un puesto. */
function aterrizaje(puesto: P): Camino {
  const calle = CALLE[CALLE.length - 1]!;
  // Por la calle de la plataforma hasta la altura del puesto, y a él.
  const enLaCalle: P = [calle[0] + ((puesto[1] - calle[1]) / (-780.6 - calle[1])) * (119.6 - calle[0]), puesto[1]];
  const puntos: P[] = [enLaPista(DECIDE, 0), enLaPista(TOMA, 0), enLaPista(A_LA_SALIDA - 30, 0), SALIDA_C, ...CALLE, enLaCalle, puesto];
  const tramos: Tramo[] = ["final", "pista", "pista", "pista", ...CALLE.map((): Tramo => "rodaje"), "rodaje", "rodaje"];
  return camino(puntos, tramos);
}
/** Hasta dónde ocupa la pista un avión que aterriza, m del aterrizaje: hasta pasar el borde por la salida. */
const LIBRA_LA_PISTA = (() => {
  const c = aterrizaje(PUESTOS[0]!);
  return c.hasta[4]! + 10;
})();

/** **Las velocidades de juguete**, m/s: una vuelta al circuito en menos de medio minuto. */
const EN_EL_AIRE = 330;
const EN_LA_FINAL = 250;
const AL_TOCAR = 210;
const AL_SALIR = 45;
const RODANDO = 75;
/** Lo que ocupa la pista un avión que aterriza, s desde el punto de decidir. */
const OCUPA = (() => {
  const c = aterrizaje(PUESTOS[0]!);
  let t = 0;
  for (let s = 0; s < LIBRA_LA_PISTA; s += 5) t += 5 / velocidadAlAterrizar(s, c);
  return t;
})();

function velocidadAlAterrizar(s: number, c: Camino): number {
  const toma = c.hasta[1]!;
  const salida = c.hasta[3]!;
  if (s < toma) return EN_LA_FINAL + ((AL_TOCAR - EN_LA_FINAL) * s) / toma;
  if (s < salida) return AL_TOCAR + ((AL_SALIR - AL_TOCAR) * (s - toma)) / (salida - toma);
  // Rodando, y despacito al llegar al puesto.
  return Math.max(18, Math.min(RODANDO, (c.largo - s) * 0.8 + 18));
}

/** Lo alto que va, de 0 en el suelo a 1 en el circuito: para la sombra. */
function alturaEnLaVuelta(s: number): number {
  const finalLarga = DECIDE - ABAJO + 330;
  const hastaDecidir = VUELTA.largo - s;
  if (hastaDecidir < finalLarga) return 0.22 + (0.78 * hastaDecidir) / finalLarga;
  return Math.min(1, 0.22 + (0.78 * s) / 900);
}

// ── Las señales ──────────────────────────────────────────────────────────

export type Senal = "verde" | "roja" | "verde-destellos" | "roja-destellos";
/** Cómo contesta el avión: alabeando, con los faros, o siguiendo sin alabear —en base y en final—. */
export type Acuse = "alas" | "faros" | "sigue";

/** **Los peldaños que tienen destellos**: los de arriba. Ver la cabecera. */
const CON_DESTELLOS: ReadonlySet<Peldano> = new Set(["cifra", "cabina"]);

/** Lo que tarda el avión en contestar, s, y lo que dura la contestación. */
const TARDA_EN_CONTESTAR = 0.5;
const DURA_LA_CONTESTACION = 1.8;
/** Lo que dura la luz encendida, s. */
const DURA_LA_LUZ = 1.6;
/** **Cuánto sin tocar para ayudar**, s: brilla el avión que pide luz y la luz que le toca. */
const AYUDA_SIN_TOCAR = 5;
/** Y para recordarlo de palabra, s. */
const RECUERDA_SIN_TOCAR = 18;
/** **Lo que le falta al que pide luz para que brille ya**, s, aunque se acabe de tocar. */
const CORRE_PRISA = 9;

// ── Las rondas ───────────────────────────────────────────────────────────

/**
 * **Un avión de una ronda**: con radio o sin ella, dónde aparece —metros que le
 * faltan para el punto de decidir— y cuándo, s desde que empieza la ronda.
 */
interface Llega {
  readonly radio: boolean;
  readonly falta: number;
  readonly desde: number;
}
interface Ronda {
  readonly aviones: readonly Llega[];
  /** El camión de los bomberos revisando la pista. */
  readonly camion?: boolean;
  readonly noche?: boolean;
}

/** El primer tramo de viento en cola, m que faltan para decidir. */
const EN_LA_TRAVESIA = VUELTA.largo - (ARRIBA - DECIDE) - 200;

/**
 * **Las rondas**: un avión solo, para aprender la verde y ver cómo contesta;
 * dos seguidos, que se juntan en la pista —el primero ya en la base, que
 * contesta sin alabear—; y uno con la radio bien que aterriza solo, con dos
 * sin radio detrás. Arriba, la tercera es la de la pista insegura, y en el
 * peldaño de cabina se acaba de noche.
 */
function rondasDe(peldano: Peldano): readonly Ronda[] {
  const r: Ronda[] = [
    { aviones: [{ radio: false, falta: EN_LA_TRAVESIA, desde: 0 }] },
    { aviones: [{ radio: false, falta: 1450, desde: 0 }, { radio: false, falta: 3750, desde: 0 }] },
  ];
  if (CON_DESTELLOS.has(peldano))
    r.push({ camion: true, aviones: [{ radio: true, falta: 2100, desde: 0 }, { radio: false, falta: 3900, desde: 0 }] });
  else
    r.push({
      aviones: [
        { radio: true, falta: 1900, desde: 0 },
        { radio: false, falta: 3300, desde: 0 },
        { radio: false, falta: EN_LA_TRAVESIA, desde: 6 },
      ],
    });
  /*
   * En el peldaño de cabina, la de noche al final, y sin la primera, la del
   * avión solo, que a los catorce años sobra: así no se pasa de los tres
   * minutos.
   */
  if (peldano === "cabina") {
    r.shift();
    r.push({ noche: true, aviones: [{ radio: false, falta: EN_LA_TRAVESIA, desde: 0 }] });
  }
  return r;
}

// ── El camión ────────────────────────────────────────────────────────────

/** **El camión de los bomberos**: sale de su parque, al oeste, recorre un trozo de pista y vuelve. */
const CAMION: Camino = (() => {
  const parque: P = [-150, -846];
  const entra = enLaPista(aLoLargo([0, -846]), 0);
  const lejos = enLaPista(aLoLargo([0, -846]) + 480, 0);
  return camino([parque, entra, lejos, entra, parque], ["pista", "pista", "pista", "pista"]);
})();
const CAMION_VA = 80;

// ── El juego ─────────────────────────────────────────────────────────────

interface Avion {
  readonly id: number;
  readonly radio: boolean;
  /** Por dónde va: la vuelta del circuito o el aterrizaje. */
  ruta: "vuelta" | "aterrizaje";
  s: number;
  aterrizaje: Camino | null;
  /** Si tiene luz verde para esta vuelta. */
  autorizado: boolean;
  /** Si le pidieron con destellos rojos que no aterrice, y todavía no lo llamaron con verdes. */
  retenido: boolean;
  /** La última luz que vio, y cuándo; y cómo contesta. */
  luz: { readonly senal: Senal; readonly desde: number } | null;
  acuse: { readonly tipo: Acuse; readonly desde: number } | null;
  /** Desde cuándo está, para que aparezca poco a poco. */
  readonly nace: number;
  vueltas: number;
  /** En qué vuelta le dieron la roja: esa vuelta la da entera, por encima de la pista. */
  rojaEn: number | null;
  /** Lo que habló por radio, con la torre, y cuándo. */
  hablo: number | null;
}

/** Lo que se ve de un avión. */
export interface AvionDeLaLuz {
  readonly id: number;
  readonly radio: boolean;
  readonly x: number;
  readonly y: number;
  readonly rumbo: number;
  /** De 0 en el suelo a 1 en el circuito. */
  readonly altura: number;
  readonly tramo: Tramo;
  readonly enVuelo: boolean;
  readonly autorizado: boolean;
  /** La luz que tiene encima ahora, si se la están dando. */
  readonly luz: Senal | null;
  /** Cómo contesta ahora, y por dónde va la contestación, de 0 a 1. */
  readonly acuse: { readonly tipo: Acuse; readonly t: number } | null;
  /** La luz que le toca, si se ayuda: brilla. */
  readonly pide: Senal | null;
  /** Si está hablando por radio con la torre. */
  readonly hablando: boolean;
  /** Lo que lleva aparecido, de 0 a 1. */
  readonly aparece: number;
}

export interface EstadoDeLaLuz {
  readonly juego: "luz";
  readonly ronda: number;
  readonly rondas: number;
  readonly aviones: readonly AvionDeLaLuz[];
  readonly camion: { readonly x: number; readonly y: number; readonly rumbo: number } | null;
  readonly noche: boolean;
  /** Las luces que hay en la lámpara: abajo, dos; arriba, cuatro. */
  readonly luces: readonly Senal[];
  /** A qué avión apunta la lámpara. */
  readonly apunta: number | null;
  /** La luz encendida ahora, y hacia qué avión. */
  readonly haz: { readonly senal: Senal; readonly hacia: number } | null;
  /** La luz de la lámpara que brilla para ayudar. */
  readonly ayuda: Senal | null;
  /** Lo que se celebra ahora: un aterrizaje o un «al aire». */
  readonly fiesta: { readonly que: "aterrizo" | "alAire" | "roja"; readonly id: number; readonly t: number } | null;
  /** Lo contado, para el banco y las pruebas. */
  readonly aterrizados: number;
  readonly alAire: number;
  readonly rojas: number;
  readonly acuses: Readonly<Record<Acuse, number>>;
  /** Cada contestación con el tramo en que se dio la luz: en base y en final, de día, nunca alabea. */
  readonly contestaciones: readonly { readonly tipo: Acuse; readonly tramo: Tramo }[];
  readonly terminado: boolean;
  readonly ayudas: number;
}

export class JuegoDeLaLuz {
  readonly juego = "luz" as const;
  private reloj = 0;
  private readonly rondas: readonly Ronda[];
  private ronda = -1;
  private rondaDesde = 0;
  private porLlegar: Llega[] = [];
  private readonly aviones: Avion[] = [];
  private siguienteId = 1;
  private apunta: number | null = null;
  private haz: { senal: Senal; hacia: number; desde: number } | null = null;
  private fiesta: { que: "aterrizo" | "alAire" | "roja"; id: number; desde: number } | null = null;
  private camionS: number | null = null;
  private acabado = false;
  private empezado = false;
  private quieto = 0;
  private ayudas = 0;
  private recordado = -Infinity;
  private readonly porDecir: Linea[] = [];
  private readonly dichas = new Set<string>();
  private cuenta = { aterrizados: 0, alAire: 0, rojas: 0 };
  /** Cada contestación, con el tramo en que se dio la luz: para el banco y las pruebas. */
  private readonly contestaciones: { readonly tipo: Acuse; readonly tramo: Tramo }[] = [];
  private readonly acuses: Record<Acuse, number> = { alas: 0, faros: 0, sigue: 0 };
  private puestoLibre = 0;

  constructor(private readonly peldano: Peldano = "dibujo") {
    this.rondas = rondasDe(peldano);
  }

  get terminado(): boolean {
    return this.acabado;
  }

  /** Las luces de la lámpara en este peldaño. */
  get luces(): readonly Senal[] {
    return CON_DESTELLOS.has(this.peldano) ? ["verde", "roja", "verde-destellos", "roja-destellos"] : ["verde", "roja"];
  }

  /** Lo que quiere decir este juego desde la última vez, en orden: primero, el plan B y qué hay que hacer. */
  tomarLoQueDecir(): Linea[] {
    if (!this.empezado) {
      this.empezado = true;
      this.porDecir.unshift(DICHO_DE_LA_LUZ.radio, DICHO_DE_LA_LUZ.empezar);
    }
    return this.porDecir.splice(0);
  }

  private decir(l: Linea, unaVez = false): void {
    if (unaVez && this.dichas.has(l.clave)) return;
    this.dichas.add(l.clave);
    this.porDecir.push(l);
  }

  private get noche(): boolean {
    return this.rondas[this.ronda]?.noche === true;
  }

  private camionEnLaPista(): boolean {
    return this.camionS !== null;
  }

  /** Dónde va un avión ahora. */
  private donde(a: Avion): { p: P; rumbo: number; tramo: Tramo; altura: number } {
    if (a.ruta === "aterrizaje" && a.aterrizaje) {
      const e = enElCamino(a.aterrizaje, a.s);
      const toma = a.aterrizaje.hasta[1]!;
      return { ...e, altura: a.s < toma ? 0.22 * (1 - a.s / toma) : 0 };
    }
    const e = enElCamino(VUELTA, a.s);
    return { ...e, altura: alturaEnLaVuelta(a.s) };
  }

  private enVuelo(a: Avion): boolean {
    return a.ruta === "vuelta" || (a.aterrizaje !== null && a.s < a.aterrizaje.hasta[1]!);
  }

  /** Lo que le falta para el punto de decidir, s. */
  private eta(a: Avion): number {
    return a.ruta === "vuelta" ? (VUELTA.largo - a.s) / EN_EL_AIRE : Infinity;
  }

  /** **Si la pista está ocupada ahora**: un avión que aterriza y no la ha dejado, o el camión. */
  private ocupada(): boolean {
    return this.camionEnLaPista() || this.aviones.some((a) => a.ruta === "aterrizaje" && a.s < LIBRA_LA_PISTA);
  }

  /** **Cuándo queda libre la pista**, s desde ahora, contando con los que van a aterrizar sin contar a `sin`. */
  private libreEn(sin: Avion | null): number {
    let libre = this.camionEnLaPista() && this.camionS !== null ? (CAMION.largo - this.camionS) / CAMION_VA : 0;
    for (const a of this.aviones) {
      if (a === sin) continue;
      if (a.ruta === "aterrizaje" && a.aterrizaje && a.s < LIBRA_LA_PISTA) {
        let t = 0;
        for (let s = a.s; s < LIBRA_LA_PISTA; s += 10) t += 10 / velocidadAlAterrizar(s, a.aterrizaje);
        libre = Math.max(libre, t);
      } else if (a.ruta === "vuelta" && (a.autorizado || (a.radio && !a.retenido)) && this.eta(a) < (sin ? this.eta(sin) : Infinity)) {
        libre = Math.max(libre, this.eta(a) + OCUPA);
      }
    }
    return libre;
  }

  /** **La luz que le toca a un avión sin radio**, o `null` si ninguna. */
  private pide(a: Avion): Senal | null {
    if (a.radio || !this.enVuelo(a) || a.ruta !== "vuelta") return null;
    const destellos = CON_DESTELLOS.has(this.peldano);
    if (this.camionEnLaPista()) return destellos && !a.retenido ? "roja-destellos" : a.autorizado ? "roja" : null;
    if (a.retenido) return "verde-destellos";
    // Con la roja de esta vuelta, sigue en el circuito: la verde, para la siguiente.
    if (a.rojaEn === a.vueltas && !a.autorizado) return null;
    const libre = this.libreEn(a);
    const choca = libre > 0 && libre > this.eta(a) - 0.5;
    if (choca) return a.autorizado || a.luz?.senal !== "roja" ? "roja" : null;
    return a.autorizado ? null : "verde";
  }

  /** El avión con más prisa que pide luz: a donde apunta la lámpara si no se tocó ninguno. */
  private elQueMasPrisa(): Avion | null {
    let mejor: Avion | null = null;
    for (const a of this.aviones)
      if (this.pide(a) !== null && (!mejor || this.eta(a) < this.eta(mejor))) mejor = a;
    if (mejor) return mejor;
    for (const a of this.aviones) if (!a.radio && this.enVuelo(a) && a.ruta === "vuelta" && (!mejor || this.eta(a) < this.eta(mejor))) mejor = a;
    return mejor;
  }

  /** **Se toca un avión**: la lámpara le apunta. */
  apuntar(id: number): void {
    const a = this.aviones.find((x) => x.id === id);
    if (!a || !this.enVuelo(a) || a.ruta !== "vuelta") return;
    this.apunta = id;
    this.quieto = 0;
  }

  /**
   * **Se enciende una luz**, hacia donde apunta la lámpara —o, si no apunta a
   * nadie que vuele, al avión con más prisa—. El avión la ve, hace caso y
   * contesta.
   */
  encender(senal: Senal): void {
    if (this.acabado || !this.luces.includes(senal)) return;
    this.quieto = 0;
    let a = this.aviones.find((x) => x.id === this.apunta) ?? null;
    if (!a || !this.enVuelo(a) || a.ruta !== "vuelta") a = this.elQueMasPrisa();
    if (!a) return;
    // Se apunta para una luz: la siguiente, otra vez al que toque, si no se toca otro.
    this.apunta = null;
    this.haz = { senal, hacia: a.id, desde: this.reloj };
    a.luz = { senal, desde: this.reloj };
    const tramo = this.donde(a).tramo;
    const tipo: Acuse = this.noche ? "faros" : tramo === "base" || tramo === "final" ? "sigue" : "alas";
    a.acuse = { tipo, desde: this.reloj + TARDA_EN_CONTESTAR };
    this.acuses[tipo]++;
    this.contestaciones.push({ tipo, tramo });
    // Primero cómo contesta, la primera vez de cada manera; después, lo de la luz.
    if (tipo === "faros") this.decir(DICHO_DE_LA_LUZ.noche, true);
    else if (tipo === "sigue") this.decir(DICHO_DE_LA_LUZ.sinAlas, true);
    else this.decir(DICHO_DE_LA_LUZ.alas, true);
    if (senal === "verde") {
      a.autorizado = true;
      a.retenido = false;
    } else if (senal === "roja") {
      a.autorizado = false;
      a.rojaEn = a.vueltas;
      this.cuenta.rojas++;
      this.fiesta = { que: "roja", id: a.id, desde: this.reloj };
      this.decir(DICHO_DE_LA_LUZ.roja);
    } else if (senal === "roja-destellos") {
      a.autorizado = false;
      a.retenido = true;
    } else {
      a.retenido = false;
    }
  }

  private empezarRonda(): void {
    this.ronda++;
    this.rondaDesde = this.reloj;
    // Los que ya están en su puesto se van: la plataforma, para los nuevos.
    for (let i = this.aviones.length - 1; i >= 0; i--) {
      const a = this.aviones[i]!;
      if (a.ruta === "aterrizaje" && a.aterrizaje && a.s >= a.aterrizaje.largo - 1) this.aviones.splice(i, 1);
    }
    const r = this.rondas[this.ronda];
    if (!r) {
      this.acabado = true;
      this.decir(DICHO_DE_LA_LUZ.fin);
      return;
    }
    this.porLlegar = [...r.aviones];
    this.camionS = r.camion ? 0 : null;
    // El camión en la pista: se cuenta qué se hace, que es la primera vez.
    if (r.camion) this.decir(DICHO_DE_LA_LUZ.destellosRojos, true);
  }

  private nacer(l: Llega): void {
    const s = (((VUELTA.largo - l.falta) % VUELTA.largo) + VUELTA.largo) % VUELTA.largo;
    this.aviones.push({
      id: this.siguienteId++,
      radio: l.radio,
      ruta: "vuelta",
      s,
      aterrizaje: null,
      autorizado: false,
      retenido: false,
      luz: null,
      acuse: null,
      nace: this.reloj,
      vueltas: 0,
      rojaEn: null,
      hablo: null,
    });
    if (l.radio) this.decir(DICHO_DE_LA_LUZ.conRadio, true);
  }

  /**
   * **Un paso**, s de pared. La primera ronda espera a que Ara acabe de contar
   * el plan B: los aviones no llegan mientras se explica qué hacer.
   */
  paso(dt: number, callada: boolean): void {
    this.reloj += dt;
    if (this.acabado) return;
    if (this.ronda < 0) {
      if (this.reloj > 2 && callada) this.empezarRonda();
      return;
    }
    // Los que llegan en esta ronda, a su hora.
    for (let i = this.porLlegar.length - 1; i >= 0; i--) {
      const l = this.porLlegar[i]!;
      if (this.reloj - this.rondaDesde >= l.desde) {
        this.nacer(l);
        this.porLlegar.splice(i, 1);
      }
    }
    if (this.camionS !== null) {
      this.camionS += CAMION_VA * dt;
      if (this.camionS >= CAMION.largo) {
        this.camionS = null;
        // Ya se fue: a los que se les dijo que no aterrizaran, se les llama.
        if (this.aviones.some((a) => a.retenido)) this.decir(DICHO_DE_LA_LUZ.destellosVerdes, true);
      }
    }
    for (const a of this.aviones) this.mover(a, dt);
    if (this.haz && this.reloj - this.haz.desde > DURA_LA_LUZ) this.haz = null;
    if (this.fiesta && this.reloj - this.fiesta.desde > 3) this.fiesta = null;
    if (this.apunta !== null) {
      const a = this.aviones.find((x) => x.id === this.apunta);
      if (!a || !this.enVuelo(a) || a.ruta !== "vuelta") this.apunta = null;
    }
    // La ronda se acaba con todos fuera de la pista.
    if (
      this.porLlegar.length === 0 &&
      this.camionS === null &&
      this.aviones.every((a) => a.ruta === "aterrizaje" && a.s >= LIBRA_LA_PISTA + 120) &&
      this.reloj - this.rondaDesde > 3
    )
      this.empezarRonda();
    // La ayuda: si pasa un rato sin tocar y alguien pide luz.
    const alguienPide = this.aviones.some((a) => this.pide(a) !== null);
    this.quieto = alguienPide ? this.quieto + dt : 0;
    if (alguienPide && this.quieto >= RECUERDA_SIN_TOCAR && callada && this.reloj - this.recordado > 30) {
      this.recordado = this.reloj;
      this.ayudas++;
      this.decir(DICHO_DE_LA_LUZ.empezar);
    }
  }

  private mover(a: Avion, dt: number): void {
    if (a.ruta === "aterrizaje" && a.aterrizaje) {
      const antes = a.s;
      a.s = Math.min(a.aterrizaje.largo, a.s + velocidadAlAterrizar(a.s, a.aterrizaje) * dt);
      if (antes < a.aterrizaje.hasta[1]! && a.s >= a.aterrizaje.hasta[1]!) {
        this.cuenta.aterrizados++;
        this.fiesta = { que: "aterrizo", id: a.id, desde: this.reloj };
      }
      return;
    }
    // Los de radio hablan con la torre al entrar en la base: lo normal.
    const tramo = enElCamino(VUELTA, a.s).tramo;
    if (a.radio && tramo === "base" && a.hablo === null) {
      a.hablo = this.reloj;
      a.autorizado = !this.camionEnLaPista() && this.libreEn(a) < this.eta(a);
    }
    a.s += EN_EL_AIRE * dt;
    if (a.s < VUELTA.largo) return;
    // **El punto de decidir**: aterriza con la verde y la pista libre; si no, al aire.
    a.s -= VUELTA.largo;
    if (a.autorizado && !this.ocupada() && !a.retenido) {
      a.ruta = "aterrizaje";
      a.aterrizaje = aterrizaje(PUESTOS[this.puestoLibre++ % PUESTOS.length]!);
      a.s = 0;
      return;
    }
    a.vueltas++;
    a.hablo = null;
    if (a.autorizado) {
      // Tenía la verde y la pista estaba ocupada: se va al aire solo, y se celebra.
      this.cuenta.alAire++;
      this.fiesta = { que: "alAire", id: a.id, desde: this.reloj };
      if (!a.radio) this.decir(DICHO_DE_LA_LUZ.alAire);
    }
    // La verde era para esta vuelta: para la siguiente, otra.
    a.autorizado = false;
  }

  get estado(): EstadoDeLaLuz {
    const urgente = this.elQueMasPrisa();
    const pideUrgente = urgente ? this.pide(urgente) : null;
    // Se ayuda en la primera ronda, si pasa un rato sin tocar, o si al que pide le queda poco.
    const ayuda = this.quieto >= AYUDA_SIN_TOCAR || this.ronda === 0 || (!!urgente && this.eta(urgente) < CORRE_PRISA);
    const camion = this.camionS !== null ? enElCamino(CAMION, this.camionS) : null;
    return {
      juego: "luz",
      ronda: Math.max(0, this.ronda),
      rondas: this.rondas.length,
      aviones: this.aviones.map((a): AvionDeLaLuz => {
        const d = this.donde(a);
        const acuse = a.acuse && this.reloj >= a.acuse.desde && this.reloj - a.acuse.desde < DURA_LA_CONTESTACION
          ? { tipo: a.acuse.tipo, t: (this.reloj - a.acuse.desde) / DURA_LA_CONTESTACION }
          : null;
        return {
          id: a.id,
          radio: a.radio,
          x: d.p[0],
          y: d.p[1],
          rumbo: d.rumbo,
          altura: d.altura,
          tramo: d.tramo,
          enVuelo: this.enVuelo(a),
          autorizado: a.autorizado,
          luz: this.haz?.hacia === a.id ? this.haz.senal : null,
          acuse,
          pide: ayuda && urgente === a ? pideUrgente : null,
          hablando: a.hablo !== null && this.reloj - a.hablo < 2.5,
          aparece: Math.min(1, (this.reloj - a.nace) / 1.2),
        };
      }),
      camion: camion ? { x: camion.p[0], y: camion.p[1], rumbo: camion.rumbo } : null,
      noche: this.noche,
      luces: this.luces,
      apunta: this.apunta,
      haz: this.haz ? { senal: this.haz.senal, hacia: this.haz.hacia } : null,
      ayuda: ayuda ? pideUrgente : null,
      fiesta: this.fiesta ? { que: this.fiesta.que, id: this.fiesta.id, t: Math.min(1, (this.reloj - this.fiesta.desde) / 3) } : null,
      ...this.cuenta,
      acuses: { ...this.acuses },
      contestaciones: [...this.contestaciones],
      terminado: this.acabado,
      ayudas: this.ayudas,
    };
  }
}

/** Lo que se dibuja del aeródromo, en metros: para `ui/luz-verde.ts`. */
export const AERODROMO_DE_LA_LUZ = {
  pista: [enLaPista(-CABECERA.displacedM, 0), enLaPista(FIN_DE_PISTA, 0)] as const,
  umbral: UMBRAL,
  calles: GCLA.taxiways.map((t) => t.path as unknown as readonly P[]),
  plataforma: GCLA.aprons[0]!.polygon as unknown as readonly P[],
  edificios: GCLA.buildings.filter((b) => b.kind === "terminal" || b.kind === "fire_station" || b.kind === "yes").map((b) => b.polygon as unknown as readonly P[]),
  vuelta: VUELTA.puntos,
} as const;
