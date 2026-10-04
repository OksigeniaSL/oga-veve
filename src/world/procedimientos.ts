/**
 * Las salidas y las aproximaciones publicadas, por aeropuerto y cabecera.
 *
 * Es el otro medio del plan de vuelo: `flight/ruta.ts` sabe elegir y seguir
 * una ruta; aquí está **por dónde se va de verdad**, sacado de las cartas
 * oficiales. Los puntos llevan su nombre publicado —CANDE, BUNIX, XO69E— y su
 * posición tal cual la da la carta, porque la regla 4 aquí es literal: quien
 * aprenda a llegar a Los Rodeos por BUNIX tiene que encontrarse BUNIX el día
 * que abra la carta de verdad.
 *
 * ## De dónde sale cada cosa
 *
 * Canarias, del AIP de España que publica ENAIRE: la ficha de cada
 * aeródromo (AD 2) con sus cartas de aproximación (IAC) y de salida (SID), y
 * la lista de puntos significativos (ENR 4.4) y radioayudas (ENR 4.1). La
 * enmienda y la fecha van en `procedimientos-canarias.ts`, junto a los datos,
 * y en `CREDITOS.md`. Son hechos —dónde está un punto, por dónde pasa una
 * aproximación— y se citan como se cita un hecho.
 *
 * Paraguay, del AIP que publica la DINAC: la ficha AD 2 de cada aeródromo
 * con sus tablas de codificación, y las listas de radioayudas (ENR 4.1) y de
 * puntos significativos (ENR 4.3). La enmienda va en
 * `procedimientos-paraguay.ts`, con lo que entra y lo que no.
 *
 * Donde no hay nada publicado —los campos de vuelo visual, o una cabecera
 * cuya aproximación no acaba alineada con la pista— el plan hace lo único
 * honesto: calcular la aproximación sobre el eje de la pista con las
 * distancias de manual. Ver `aproximacionCalculada`.
 *
 * ## Lo que se simplifica, que es la presentación
 *
 * - De cada cabecera, **una** aproximación: la de navegación de área (RNP)
 *   cuando la hay, que es la que vuela hoy la línea, y si no la de
 *   instrumentos que haya. Con todas sus ramas de entrada, que es lo que deja
 *   llegar desde cualquier lado.
 * - De cada salida, **los puntos, y cómo empieza**: la subida con el rumbo de
 *   pista hasta donde la carta deja virar, y el corte del radial que lleva al
 *   primer punto si lo manda. Ver `Arranque`. Los demás tramos de solo rumbo,
 *   de arco o de radial se quedan en la carta: entre dos puntos se va
 *   directo. Y la salida se recorta donde deja de ir hacia el destino; ver
 *   `trazar` en `flight/ruta.ts`.
 * - Las altitudes: solo las «a o por encima de», que son las que libran el
 *   terreno y las que importan para bajar.
 */

import {
  MILLAS_POR_MIL_PIES_SUBIENDO,
  PIE,
  yaVaRecto,
  type Fijo,
  type Papel,
} from "../flight/ruta";
import { CANARIAS } from "./procedimientos-canarias";
import { PARAGUAY } from "./procedimientos-paraguay";

/** Un punto publicado, en coordenadas geográficas. */
export interface Publicado {
  /** Su nombre en la carta. */
  readonly nombre: string;
  readonly lat: number;
  readonly lon: number;
  /** Qué es en el procedimiento. Ver `Papel`. */
  readonly papel: Papel;
  /** La altitud mínima publicada para cruzarlo, en pies, o `null`. */
  readonly minimaPies: number | null;
}

/** Una aproximación publicada a una cabecera. */
export interface Aproximacion {
  /** El nombre de su carta, que es por donde se comprueba. */
  readonly carta: string;
  /**
   * Sus ramas: cada una empieza en su punto de inicio y acaba en el de final.
   * El umbral no va: lo pone el aeródromo del juego, que es donde se toca.
   */
  readonly ramas: readonly (readonly Publicado[])[];
  /**
   * **Si acaba en circuito**: a cuántas millas del umbral se entra a la vista
   * en el eje de la pista. Ver `ramasDeLlegada`.
   *
   * Hay cabeceras cuya única aproximación publicada **no acaba alineada** con
   * la pista: llega a un punto de final a treinta grados del eje y se termina
   * a ojo, dando la vuelta que haga falta por el lado protegido. Antes el
   * juego las tiraba enteras y calculaba una final recta a diez millas por el
   * eje; en la 18 de La Palma esa recta cruzaba la ladera de Barlovento a mil
   * ochocientos pies. Lo que se vuela ahora es lo publicado —llegada, punto
   * de inicio, intermedio y punto de final, todo sobre el mar— y desde el
   * punto de final, **a la vista**, al eje.
   */
  readonly aLaVista?: number;
  /**
   * **O la maniobra visual con derrota prescrita (VPT) que publica la carta**
   * para terminarla: sus puntos, desde el punto de aproximación frustrada
   * hasta el primero de la final recta. Es lo que publica Lanzarote para la
   * 21: la RNP llega a RR551, sobre la Montaña de Tahíche, y la VPT sigue por
   * la cantera de Argana y la rotonda de la LZ-301 hasta el umbral. Cuando la
   * carta dice por dónde, no se calcula nada.
   */
  readonly vpt?: readonly Publicado[];
}

/**
 * **Cómo empieza una salida publicada**: lo que manda su carta antes del
 * primer punto con nombre.
 *
 * Toda salida empieza igual —en el final de la pista que se usa, subiendo con
 * el rumbo de pista— y lo que cambia es **hasta dónde**: hasta una altitud
 * («subir en rumbo de pista hasta alcanzar 1000 ft», la 18 de La Palma),
 * hasta una distancia DME («hasta 12.6 DME TFN», la 30 de Los Rodeos) o hasta
 * las dos («800 ft, sin virar antes de 3.0 DME HR», la 16 de El Hierro). Sin
 * esto el plan iba del arranque de la carrera directo al primer punto, y en
 * la 30 de Los Rodeos ese punto es el VOR, a cuatro millas y media por
 * detrás del hombro derecho: la raya nacía donde empieza la carrera y salía
 * hacia el nordeste. La salida de verdad sube recta ocho millas largas, mar
 * adentro, y vuelve al VOR por su radial 303.
 *
 * Las altitudes, en pies sobre el mar, como las da la carta. Si una salida
 * no trae nada, se sube recto los cuatrocientos pies de una salida sin carta
 * —ver `subidaSinCarta`—, salvo que su primer punto ya esté delante, en la
 * prolongación del eje: las de navegación de área lo ponen ahí.
 */
export interface Arranque {
  /** Se sube con el rumbo de pista hasta esta altitud, ft. */
  readonly pies?: number;
  /** Y no se vira antes de esta distancia de una radioayuda, NM. */
  readonly dme?: { readonly de: Publicado; readonly millas: number };
  /**
   * La altitud a la que hay que cruzar el punto del viraje, ft, si la carta
   * la da con «a o por encima de»: «cruzar 5.3 DME LTE a 1300 ft o superior».
   */
  readonly minimaPies?: number;
  /**
   * Y si al virar se va **a un rumbo hasta cortar un radial**: «virar a la
   * derecha a rumbo magnético 028º para interceptar y seguir R-303 TFN». En
   * grados verdaderos: los pasa a verdaderos quien escribe la carta, con la
   * declinación de cada cosa. Ver `cortando` en `procedimientos-canarias.ts`.
   */
  readonly corta?: {
    readonly rumbo: number;
    readonly de: Publicado;
    readonly radial: number;
  };
}

/** Una salida publicada: su nombre, su carta, sus puntos y cómo empieza. */
export interface Salida {
  readonly nombre: string;
  readonly carta: string;
  readonly fijos: readonly Publicado[];
  /** Ver `Arranque`. Sin él, lo de una salida sin carta. */
  readonly arranque?: Arranque;
}

/** Lo publicado de un aeropuerto, por cabecera. */
export interface Procedimientos {
  /** De dónde sale, para citarlo: la enmienda y su fecha. */
  readonly fuente: string;
  /** La aproximación de cada cabecera que la tiene. Ver `Aproximacion`. */
  readonly aproximaciones: Readonly<Record<string, Aproximacion>>;
  /** Las salidas de cada cabecera, con sus puntos en orden. */
  readonly salidas: Readonly<Record<string, readonly Salida[]>>;
}

/** Lo que hay publicado de un aeropuerto, por su indicativo OACI. */
export function procedimientosDe(oaci: string | null): Procedimientos | null {
  if (!oaci) return null;
  const clave = oaci.toUpperCase();
  return CANARIAS[clave] ?? PARAGUAY[clave] ?? null;
}

/** Las ramas de la aproximación publicada a esa cabecera, o ninguna. */
export function ramasDe(
  oaci: string | null,
  cabecera: string | null,
): readonly (readonly Publicado[])[] {
  if (!cabecera) return [];
  return procedimientosDe(oaci)?.aproximaciones[cabecera]?.ramas ?? [];
}

/**
 * **Por dónde se llega a esta cabecera**, ya en el mundo: las ramas
 * publicadas; las de una aproximación en circuito, con su final a la vista;
 * o, sin nada publicado, la calculada sobre el eje.
 *
 * Es la única cuenta de esto: la usan el plan del juego —ver `rutaDelTramo`—
 * y las pruebas, que antes llevaban cada una su copia.
 *
 * `umbral` y `rumbo` en el mundo: el umbral de aterrizaje en uso y su rumbo
 * verdadero. `aMundo` pone un punto publicado en el mundo de quien pregunta.
 */
export function ramasDeLlegada(
  oaci: string | null,
  cabecera: string | null,
  umbral: { readonly x: number; readonly z: number },
  rumbo: number,
  aMundo: (p: Publicado) => Fijo,
): Fijo[][] {
  if (!cabecera) return [];
  const aproximacion = procedimientosDe(oaci)?.aproximaciones[cabecera];
  if (!aproximacion || aproximacion.ramas.length === 0)
    return [
      aproximacionCalculada(cabecera, umbral, rumbo).map(
        (f): Fijo => ({ ...f, minima: null, calculado: true }),
      ),
    ];
  const ramas = aproximacion.ramas.map((r) => r.map(aMundo));
  /*
   * **El punto de final de la carta pasa a ser uno más de la ruta**, con su
   * altitud mínima, cuando la aproximación acaba en circuito: la final de
   * verdad del juego empieza donde empieza la final recta, que es donde
   * empieza la senda que se enseña.
   */
  const hastaSuFinal = (r: readonly Fijo[]): Fijo[] =>
    r.map((f): Fijo => (f.papel === "faf" ? { ...f, papel: "ruta" } : f));
  const vpt = aproximacion.vpt?.map(aMundo);
  if (vpt && vpt.length > 0) {
    // La VPT de la carta: el último de sus puntos es donde empieza la final.
    const enLaVpt = vpt.map(
      (f, i): Fijo => ({ ...f, papel: i === vpt.length - 1 ? "faf" : "ruta" }),
    );
    return ramas.map((r) => [...hastaSuFinal(r), ...enLaVpt]);
  }
  const millas = aproximacion.aLaVista;
  if (millas === undefined) return ramas;
  /*
   * **Y si la carta no dice por dónde, a la vista al eje**, cortándolo a
   * treinta grados una milla antes de entrar en él: el corte de una
   * interceptación de manual, y el que deja girar en el eje sin pasarse.
   * Entrando de frente desde el punto de final de La Palma eran cuarenta y
   * cinco grados con la costa de Santa Cruz por delante, y el avisador de
   * terreno que mira hacia delante —ver `flight/terreno-delante.ts`— la
   * veía antes del giro.
   *
   * Los dos puntos no son de ninguna carta y llevan los nombres que les da
   * un ordenador de vuelo: «INTC», donde se empieza a cortar el eje, y «RX» y
   * el número de la cabecera, el punto de su prolongación donde se entra.
   */
  const h = (rumbo * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const enElEje: Fijo = {
    nombre: `RX${cabecera}`,
    x: umbral.x - fx * millas * MILLA,
    z: umbral.z - fz * millas * MILLA,
    papel: "faf",
    minima: null,
    calculado: true,
    aLaVista: true,
  };
  return ramas.map((r) => {
    const ultimo = r[r.length - 1];
    /*
     * Del lado del eje por el que se viene: el del último punto publicado.
     * Viniendo por la izquierda de la final —el este, en la 18 de La Palma—
     * se corta con treinta grados más que el rumbo de la pista y se gira a la
     * izquierda para entrar; por la derecha, al revés.
     */
    const izquierda = ultimo
      ? Math.sign((ultimo.x - enElEje.x) * fz - (ultimo.z - enElEje.z) * fx) || 1
      : 1;
    const c = h + izquierda * CORTE;
    const corte: Fijo = {
      nombre: "INTC",
      x: enElEje.x - Math.sin(c) * ANTES_DE_CORTAR,
      z: enElEje.z + Math.cos(c) * ANTES_DE_CORTAR,
      papel: "ruta",
      minima: null,
      calculado: true,
      aLaVista: true,
    };
    return [...hastaSuFinal(r), corte, enElEje];
  });
}

/** A cuántos grados se corta el eje entrando a la vista. Ver `ramasDeLlegada`. */
const CORTE = (30 * Math.PI) / 180;
/** Y desde cuánto antes de entrar en él, m: una milla larga. */
const ANTES_DE_CORTAR = 1.1 * 1852;

/** Las salidas publicadas desde esa cabecera, o ninguna. */
export function salidasDe(
  oaci: string | null,
  cabecera: string | null,
): readonly (readonly Publicado[])[] {
  if (!cabecera) return [];
  return (procedimientosDe(oaci)?.salidas[cabecera] ?? []).map((s) => s.fijos);
}

/** Una milla náutica, m. */
const MILLA = 1852;

/** La pista por la que se sale, ya en el mundo. Ver `salidasEnElMundo`. */
export interface PistaDeSalida {
  /**
   * **El final de la pista** que se usa, donde acaba el asfalto por delante:
   * el DER de la OACI, que es donde empieza a contar una salida publicada
   * (PANS-OPS, Doc 8168, vol. II, parte I, sección 3). No donde empieza la
   * carrera.
   */
  readonly x: number;
  readonly z: number;
  /** El rumbo de despegue, en grados verdaderos. */
  readonly rumbo: number;
  /** La cota del final de la pista, m. */
  readonly cota: number;
}

/**
 * **Lo que se sube recto sin carta**, ft sobre el final de la pista, antes de
 * virar: los 120 m (394 ft) por debajo de los cuales una salida
 * omnidireccional no deja virar (PANS-OPS, Doc 8168, vol. II, parte I,
 * sección 3), redondeados. Y el suelo de cualquier arranque publicado.
 */
export const SUBIDA_SIN_CARTA = 400;

/**
 * Cuánto hay que recorrer desde el final de la pista para llegar a `altitud`,
 * m, subiendo como sube el plan: dos millas por cada mil pies. Ver
 * `MILLAS_POR_MIL_PIES_SUBIENDO` en `flight/ruta.ts`.
 *
 * Desde el final y no desde la cabecera, como cuenta `libra`: aquí se decide
 * dónde se pinta el viraje, y un avión de verdad llega antes a esa altitud.
 * Pintado tarde, el viraje se pide cuando ya se puede; pintado pronto, se
 * pediría antes de poder.
 */
function hastaLaAltitud(pista: PistaDeSalida, altitud: number): number {
  return (Math.max(0, altitud - pista.cota) / (1000 * PIE)) * MILLAS_POR_MIL_PIES_SUBIENDO * MILLA;
}

/** El punto de la prolongación del eje a `d` metros del final de la pista. */
function enElEje(pista: PistaDeSalida, d: number): { x: number; z: number } {
  const h = (pista.rumbo * Math.PI) / 180;
  return { x: pista.x + Math.sin(h) * d, z: pista.z - Math.cos(h) * d };
}

/**
 * Una altitud como la escribe un ordenador de vuelo en el punto donde se
 * alcanza, «(2500)»: entre paréntesis, que no es un punto con nombre, y
 * redondeada a los cien pies de arriba.
 */
const altitudEscrita = (m: number): string => `(${Math.ceil(m / PIE / 100 - 1e-9) * 100})`;

/**
 * **Dónde acaba la subida recta de un plan sin carta**: a `SUBIDA_SIN_CARTA`
 * sobre el final de la pista, por la prolongación del eje. Con papel
 * `despegue`, que es lo que es: el plan todavía no ha salido por ninguna
 * carta, y lo que protege esa subida es lo del despegue. Ver `libra` en
 * `flight/ruta.ts`.
 */
export function subidaSinCarta(pista: PistaDeSalida, papel: Papel = "despegue"): Fijo {
  const altitud = pista.cota + SUBIDA_SIN_CARTA * PIE;
  return {
    ...enElEje(pista, hastaLaAltitud(pista, altitud)),
    nombre: altitudEscrita(altitud),
    papel,
    minima: null,
    recta: true,
    deArranque: true,
  };
}

/**
 * Cuánto hay que subir recto desde el final de la pista para estar a `radio`
 * metros de `v`, m: el cruce de la prolongación del eje con el arco DME, por
 * delante. `null` si el eje no corta el arco por delante.
 */
function alCruzarElArco(
  pista: PistaDeSalida,
  v: { readonly x: number; readonly z: number },
  radio: number,
): number | null {
  const h = (pista.rumbo * Math.PI) / 180;
  const ux = Math.sin(h);
  const uz = -Math.cos(h);
  const wx = pista.x - v.x;
  const wz = pista.z - v.z;
  const b = ux * wx + uz * wz;
  const disc = b * b - (wx * wx + wz * wz - radio * radio);
  if (disc < 0) return null;
  const t = -b + Math.sqrt(disc);
  return t > 0 ? t : null;
}

/**
 * **El corte de un radial**: desde `p`, al rumbo de la carta hasta encontrar
 * el radial, por el lado del radial que sale de la radioayuda. Lo que un
 * ordenador de vuelo llama «INTC». `null` si no se cortan por delante.
 */
function cortaElRadial(
  p: { readonly x: number; readonly z: number },
  corta: NonNullable<Arranque["corta"]>,
  aMundo: (p: Publicado) => Fijo,
): Fijo | null {
  const v = aMundo(corta.de);
  const a = (corta.rumbo * Math.PI) / 180;
  const r = (corta.radial * Math.PI) / 180;
  const ax = Math.sin(a);
  const az = -Math.cos(a);
  const bx = Math.sin(r);
  const bz = -Math.cos(r);
  const cruz = (x1: number, z1: number, x2: number, z2: number) => x1 * z2 - z1 * x2;
  const den = cruz(ax, az, bx, bz);
  if (Math.abs(den) < 1e-6) return null;
  const dx = v.x - p.x;
  const dz = v.z - p.z;
  const s = cruz(dx, dz, bx, bz) / den;
  const q = cruz(dx, dz, ax, az) / den;
  if (s <= 0 || q <= 0) return null;
  return {
    x: p.x + ax * s,
    z: p.z + az * s,
    nombre: "INTC",
    papel: "salida",
    minima: null,
    deArranque: true,
  };
}

/**
 * **Los puntos con que empieza una salida**, delante de los suyos con
 * nombre: dónde acaba su subida recta y, si la carta lo manda, dónde se corta
 * el radial que lleva al primero. Ver `Arranque`.
 *
 * Sin nada publicado, la subida de una salida sin carta, salvo que el primer
 * punto ya esté delante: ver `yaVaRecto` en `flight/ruta.ts`.
 */
export function arranqueDeLaSalida(
  pista: PistaDeSalida,
  arranque: Arranque | undefined,
  primero: Fijo | undefined,
  aMundo: (p: Publicado) => Fijo,
): Fijo[] {
  if (!arranque) {
    const subida = subidaSinCarta(pista, "salida");
    return primero && yaVaRecto(pista, subida, primero) ? [] : [subida];
  }
  const altitud = Math.max(
    pista.cota + SUBIDA_SIN_CARTA * PIE,
    (arranque.pies ?? 0) * PIE,
  );
  let d = hastaLaAltitud(pista, altitud);
  let nombre = altitudEscrita(altitud);
  if (arranque.dme) {
    const t = alCruzarElArco(pista, aMundo(arranque.dme.de), arranque.dme.millas * MILLA);
    if (t !== null && t > d) {
      d = t;
      nombre = `D${arranque.dme.millas.toFixed(1)} ${arranque.dme.de.nombre}`;
    }
  }
  const recta: Fijo = {
    ...enElEje(pista, d),
    nombre,
    papel: "salida",
    minima: arranque.minimaPies === undefined ? null : arranque.minimaPies * PIE,
    recta: true,
    deArranque: true,
  };
  const corte = arranque.corta ? cortaElRadial(recta, arranque.corta, aMundo) : null;
  return corte ? [recta, corte] : [recta];
}

/**
 * **Las salidas publicadas desde esa cabecera, ya en el mundo** y cada una
 * con su arranque delante. Es la única cuenta de esto: la usan el plan del
 * juego —ver `rutaDelTramo`— y las pruebas.
 */
export function salidasEnElMundo(
  oaci: string | null,
  cabecera: string | null,
  pista: PistaDeSalida,
  aMundo: (p: Publicado) => Fijo,
): Fijo[][] {
  if (!cabecera) return [];
  return (procedimientosDe(oaci)?.salidas[cabecera] ?? []).map((s) => {
    const fijos = s.fijos.map(aMundo);
    return [...arranqueDeLaSalida(pista, s.arranque, fijos[0], aMundo), ...fijos];
  });
}

/**
 * Dónde van los puntos de una aproximación **sin carta**, en millas del
 * umbral, por el eje de la pista.
 *
 * Los valores de diseño de la OACI (PANS-OPS, Doc 8168): el tramo final mide
 * de óptimo cinco millas, y el intermedio otras cinco, así que el punto
 * intermedio queda a diez. Es lo que tendría una aproximación de manual a esa
 * pista; no es la de ningún sitio concreto, y por eso sus puntos no llevan
 * nombre de punto publicado sino el que les pone un ordenador de vuelo a los
 * puntos sin nombre de una aproximación: «CF» y «FF» con el número de la
 * pista, del ARINC 424.
 */
export const INTERMEDIO_SIN_CARTA = 10;
export const FINAL_SIN_CARTA = 5;

/**
 * La aproximación calculada a una cabecera sin nada publicado aquí: el punto
 * intermedio y el de final, sobre el eje y por detrás del umbral.
 *
 * `umbral` y `rumbo` en coordenadas del mundo: el rumbo de aterrizaje, en
 * grados verdaderos, que es el de la pista en uso.
 */
export function aproximacionCalculada(
  cabecera: string,
  umbral: { readonly x: number; readonly z: number },
  rumbo: number,
): { nombre: string; x: number; z: number; papel: Papel }[] {
  const h = (rumbo * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const atras = (millas: number) => ({
    x: umbral.x - fx * millas * MILLA,
    z: umbral.z - fz * millas * MILLA,
  });
  return [
    { nombre: `CF${cabecera}`, ...atras(INTERMEDIO_SIN_CARTA), papel: "if" },
    { nombre: `FF${cabecera}`, ...atras(FINAL_SIN_CARTA), papel: "faf" },
  ];
}
