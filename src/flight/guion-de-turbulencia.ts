/**
 * **El guion de la turbulencia de un vuelo**: cuántas veces se menea, dónde de
 * la ruta, cuánto rato y con qué fuerza. Se decide al despegar, con una
 * semilla, y con la misma semilla sale el mismo guion.
 *
 * Enrique, que ha volado mucho de pasajero: «hay vuelos desde Tenerife a
 * Madrid que pasan una o dos veces por turbulencias, otras nada y otros casi
 * todo el viaje, pero nosotros deberíamos regular eso. Además hay turbulencias
 * más fuertes y otras más suaves». Y su decisión: «realista mejor, pero con un
 * control para que no se vuelva tampoco muy recurrente».
 *
 * Así que esto son dos cosas, y van separadas a propósito:
 *
 * 1. **Lo que pasa de verdad** en el sitio, la época y la hora —ver
 *    `CANDIDATOS`—, con su fuente. Dice qué episodios *podrían* tocar hoy y
 *    con qué fuerza.
 * 2. **El control** —ver `TOPES`—: cuántos caben en un vuelo, cuánto duran,
 *    lo fuerte que pueden ser y el hueco entre uno y otro, por peldaño de la
 *    escalera. Un niño de cinco años no necesita un vuelo entero de meneo
 *    para aprender que el meneo es normal: le basta uno, corto y suave.
 *
 * ## Lo real, con su fuente
 *
 * **En Canarias** manda el alisio, el viento del nordeste que sopla casi todo
 * el verano y buena parte del invierno, con su **inversión térmica** encima:
 * una tapa de aire caliente entre los mil y los mil quinientos metros —más
 * baja en verano, más alta en invierno— bajo la que se queda el mar de nubes.
 * Por debajo de la tapa el aire va movido, sobre todo con viento; por encima,
 * quieto (AEMET, *Atlas climático de los archipiélagos de Canarias, Madeira y
 * Azores*, 2012; Font Tullot, *El tiempo atmosférico en las Islas Canarias*,
 * INM, 1956). Por eso **en Canarias se menea subiendo y bajando, y el
 * crucero va tranquilo**: es la capa que se cruza al salir y al llegar.
 *
 * Y las **islas altas** —Tenerife, Gran Canaria y La Palma— asoman por encima
 * de la tapa y le hacen al viento lo que una piedra al agua de un río: detrás
 * de ellas, a sotavento, el aire baja en ondas y remolinos durante decenas de
 * kilómetros, y es de lo que avisan los partes de Canarias cuando el alisio
 * sopla fuerte (AEMET, mismo atlas; OACI, *Manual of Aeronautical
 * Meteorological Practice*, Doc 8896, sobre la onda de montaña). Así que una
 * ruta que pasa por detrás de una de ellas, con viento, lo nota; la que pasa
 * por delante, no.
 *
 * **En el Paraguay** manda el calor: en la estación cálida —de octubre a
 * marzo, la de las lluvias— el suelo calienta el aire por la tarde, crecen los
 * cúmulos y por debajo de sus cimas se menea; por la mañana el aire está
 * quieto, y en el invierno seco, casi siempre (Dirección de Meteorología e
 * Hidrología, *Climatología del Paraguay*). Y las tormentas de verano son de
 * la tarde. Por eso las avionetas de allí salen temprano.
 *
 * **Y en cualquier sitio**, la de aire claro en crucero, que no sale en el
 * radar: rara, y algo menos rara en el invierno de cada hemisferio, cuando la
 * corriente en chorro subtropical pasa más cerca (FAA, *Aviation Weather
 * Handbook*, FAA-H-8083-28, cap. 19).
 *
 * **Las intensidades** son las de la OACI: la *moderada* es la de cambios de
 * 0,5 a 1 g en el acelerómetro, cuesta andar y se nota el cinturón (Doc 4444,
 * PANS-ATM, apéndice 1); por debajo, la *ligera*, en la que el café se mueve y
 * el servicio sigue (FAA, *Aeronautical Information Manual*, 7-1-21). La
 * *fuerte* existe, y en este juego **no se guioniza nunca**: lo que la produce
 * es una tormenta, y a una tormenta no se entra — eso lo enseña el radar.
 *
 * ## Por dónde de la ruta, no por coordenadas
 *
 * Los episodios se sitúan por **lo volado desde el despegue**, como en
 * `turbulencia-del-vuelo.ts`: quien aprende a volar no sigue la ruta al metro.
 * Los de una capa —la del alisio, la de los cúmulos— llevan además su capa de
 * alturas: solo sacuden dentro de ella. Y los que van con nube lo dicen
 * (`conNube`), para que la nube esté donde está el meneo.
 *
 * Sin three.js ni juego: entra lo que se sabe del vuelo y sale el guion. Las
 * unidades, SI: metros, segundos y m/s.
 */

import type { Peldano } from "./escalera";
import type { Fuente, Intensidad, Zona } from "./turbulencia-del-vuelo";

/** El azar de este guion: números entre cero y uno, repetibles con su semilla. */
export type Azar = () => number;

/** De dónde sale cada episodio. Ver la cabecera. */
export type Causa =
  /** Por debajo de la inversión del alisio, al subir o al bajar. */
  | "alisio"
  /** A sotavento de una isla alta, con viento. */
  | "sotavento"
  /** Los cúmulos de la tarde del Paraguay. */
  | "cumulos"
  /** El viento fuerte de abajo, sin montaña: un frente que pasa. */
  | "viento"
  /** La de aire claro, en crucero. */
  | "aire-claro"
  /** Con tormenta en el parte: casi todo el vuelo. */
  | "tormenta";

/** Un episodio del guion: una zona de `turbulencia-del-vuelo.ts`, con su causa. */
export interface Episodio extends Zona {
  readonly causa: Causa;
  /**
   * Si el meneo va dentro o al borde de una nube: el estratocúmulo del alisio,
   * los cúmulos de la tarde. Quien pinte las nubes la pone aquí. Ver la
   * lámina «el meneo dentro de la nube».
   */
  readonly conNube: boolean;
}

/** Una isla que asoma por encima de la inversión. */
export interface IslaAlta {
  readonly nombre: string;
  /** Su cumbre, en los mismos metros que la ruta. */
  readonly x: number;
  readonly z: number;
  /** La altura de la cumbre, m. */
  readonly alto: number;
  /** Lo que mide de radio la parte alta, m. */
  readonly radio: number;
}

/**
 * **Las tres islas altas**, por sus cumbres (IGN): el Teide, el Pico de las
 * Nieves y el Roque de los Muchachos. La Gomera y El Hierro suben de mil
 * cuatrocientos, pero apenas asoman de la tapa del alisio y su estela es
 * mucho menor; aquí se dejan con su capa de abajo.
 */
export const ISLAS_ALTAS: readonly {
  readonly nombre: string;
  readonly lat: number;
  readonly lon: number;
  readonly alto: number;
  readonly radio: number;
}[] = [
  { nombre: "tenerife", lat: 28.2724, lon: -16.6425, alto: 3715, radio: 22_000 },
  { nombre: "gran-canaria", lat: 27.9606, lon: -15.5728, alto: 1949, radio: 20_000 },
  { nombre: "la-palma", lat: 28.7543, lon: -17.8848, alto: 2426, radio: 14_000 },
];

/** Lo que el guion necesita saber del vuelo. */
export interface DatosDelVuelo {
  readonly region: "canarias" | "paraguay";
  /** El mes del vuelo, de 1 a 12. */
  readonly mes: number;
  /** La hora solar del sitio, de 0 a 24. */
  readonly hora: number;
  /** El viento del parte, nudos, y de dónde viene, grados verdaderos o `null` en calma. */
  readonly vientoKt: number;
  readonly vientoDe: number | null;
  /** Si el parte trae tormenta. */
  readonly tormenta: boolean;
  /** La capa de nubes del parte, m sobre el mar, o `null` sin ella. */
  readonly nubes: { readonly base: number; readonly techo: number } | null;
  /** La ruta, en metros, con la salida en el primer punto. */
  readonly ruta: readonly { readonly x: number; readonly z: number }[];
  /** Lo que se va a volar, m: lo de la ruta, con sus vueltas. */
  readonly largo: number;
  /** La velocidad de crucero, m/s. */
  readonly velocidad: number;
  /** El nivel de crucero, m sobre el mar. */
  readonly crucero: number;
  /** La cota de los dos campos, m sobre el mar. */
  readonly cotaSalida: number;
  readonly cotaLlegada: number;
  /** Las islas altas, en los metros de la ruta. Vacío fuera de Canarias. */
  readonly islas: readonly IslaAlta[];
  /** El peldaño de la escalera: dice los topes. Ver `TOPES`. */
  readonly peldano: Peldano;
}

/**
 * **El control**: lo que cabe en un vuelo, por peldaño. Todos los números del
 * control están aquí, y solo aquí.
 *
 * - `episodios`: cuántos como mucho. Guyrami, uno: el primer meneo de avión
 *   de un niño de cinco años tiene que ser uno, para poder contarlo.
 * - `dura`: lo que dura como mucho cada uno, s. En Guyrami un minuto: lo
 *   bastante para notarlo y que la comandante lo cuente, y no tanto como
 *   para marearse. Arriba, hasta ocho: lo que dura de verdad cruzar la
 *   estela de Tenerife con alisio fuerte.
 * - `fuerte`: hasta dónde sube. En Guyrami, nunca de la ligera: la moderada
 *   de un turbohélice pequeño son sacudidas de medio g, y eso a los cinco
 *   años es susto, no lección.
 * - `delVuelo`: la parte del vuelo que puede ir meneándose, sumándolo todo.
 *   Es lo que impide un vuelo entero de meneo a los pequeños, también con
 *   tormenta.
 * - `enLaFinal`: si un episodio puede llegar a la final. En Guyrami, no: en
 *   la final el niño tiene que poder mirar la pista y nada más.
 */
export const TOPES: Readonly<
  Record<
    Peldano,
    {
      readonly episodios: number;
      readonly dura: number;
      readonly fuerte: Exclude<Intensidad, "fuerte">;
      readonly delVuelo: number;
      readonly enLaFinal: boolean;
    }
  >
> = {
  dibujo: { episodios: 1, dura: 60, fuerte: "ligera", delVuelo: 0.15, enLaFinal: false },
  palabra: { episodios: 2, dura: 150, fuerte: "moderada", delVuelo: 0.25, enLaFinal: false },
  cifra: { episodios: 3, dura: 300, fuerte: "moderada", delVuelo: 0.35, enLaFinal: true },
  cabina: { episodios: 4, dura: 480, fuerte: "moderada", delVuelo: 0.5, enLaFinal: true },
};

/**
 * **El hueco mínimo entre dos episodios**, s: dos minutos de aire tranquilo.
 * Lo bastante para que el cartel se apague y se note que pasó —un episodio
 * pegado a otro es el mismo, contado dos veces— y para que la comandante no
 * hable de la turbulencia dos veces seguidas.
 */
export const HUECO = 120;

/**
 * **Lo que mide la final**, m antes del final de la ruta: los últimos doce
 * kilómetros, unos tres minutos en un turbohélice. Es donde no cae ningún
 * episodio en los peldaños que no lo dejan. Ver `TOPES.enLaFinal`.
 */
export const LA_FINAL = 12_000;

/** Por debajo de esto, sobre el suelo, manda la capa de abajo, m. Ver `turbulencia-del-vuelo.ts`. */
const POR_ENCIMA_DE = 300;

/** Lo que sube un avión de línea por cada metro que avanza subiendo: unos cuatro grados. */
const PENDIENTE_DE_SUBIDA = 0.07;
/** Y lo que baja: la senda de tres grados. */
const PENDIENTE_DE_BAJADA = 0.0524;

/**
 * **La tapa del alisio**, m sobre el mar: la cima del mar de nubes si se ve, y
 * si no, la de la época —mil en pleno verano, mil seiscientos en invierno—.
 * La inversión es justo eso, la tapa donde se acaba la nube. Ver la cabecera.
 */
export function inversionDelAlisio(
  mes: number,
  nubes: DatosDelVuelo["nubes"],
): number {
  if (nubes) return nubes.techo;
  return 1300 + 300 * Math.cos((2 * Math.PI * (mes - 1)) / 12);
}

/** Si el viento de hoy es alisio: del nordeste, entre el norte y el este, y soplando. */
export function hayAlisio(d: Pick<DatosDelVuelo, "region" | "vientoKt" | "vientoDe">): boolean {
  if (d.region !== "canarias" || d.vientoDe === null || d.vientoKt < 8) return false;
  const de = ((d.vientoDe % 360) + 360) % 360;
  return de >= 330 || de <= 100;
}

/** Si el mes es de la estación cálida del Paraguay: de octubre a marzo. */
function estacionCalida(mes: number): boolean {
  return mes >= 10 || mes <= 3;
}

/** Si es la tarde de la convección: de la una a las siete, hora solar. */
function deTarde(hora: number): boolean {
  const h = ((hora % 24) + 24) % 24;
  return h >= 13 && h < 19;
}

/** Si es el invierno de ese hemisferio, cuando el chorro pasa más cerca. */
function inviernoDe(region: DatosDelVuelo["region"], mes: number): boolean {
  return region === "canarias" ? mes === 12 || mes <= 3 : mes >= 6 && mes <= 8;
}

/**
 * **La capa de un episodio con nube**: de un poco por debajo de la base —el
 * aire que sube a alimentarla— hasta su techo. Así el meneo está donde se ve
 * la nube, y no a ras de suelo con el cielo despejado. Sin nube, de abajo
 * hasta `hasta`.
 */
function conLaNube(nubes: DatosDelVuelo["nubes"], hasta: number): Zona["capa"] {
  return { de: nubes ? nubes.base - DEBAJO_DE_LA_NUBE : -1000, a: hasta };
}

/** Lo que se menea por debajo de la base de una nube, m: el aire que sube a ella. */
const DEBAJO_DE_LA_NUBE = 300;

/** Un candidato: lo que podría pasar, antes de pasar por el control. */
interface Candidato {
  readonly causa: Causa;
  /** Dónde podría estar, en metros volados. */
  readonly desde: number;
  readonly hasta: number;
  /** Lo que lo hace probable hoy, de 0 a 1. */
  readonly probable: number;
  /** De cada cuántos, moderados. */
  readonly moderada: number;
  readonly capa: Zona["capa"];
  readonly conNube: boolean;
  readonly como: Zona["como"];
  /** Lo que dura como mucho por su naturaleza, s: la ventana ya lo acota. */
  readonly duraTipica: readonly [number, number];
}

/** Dónde se está, de la ruta, a tantos metros volados. Lo volado se reparte por la ruta. */
function puntoDeLaRuta(
  ruta: DatosDelVuelo["ruta"],
  fraccion: number,
): { x: number; z: number } {
  if (ruta.length === 0) return { x: 0, z: 0 };
  if (ruta.length === 1) return ruta[0]!;
  let total = 0;
  for (let i = 1; i < ruta.length; i++)
    total += Math.hypot(ruta[i]!.x - ruta[i - 1]!.x, ruta[i]!.z - ruta[i - 1]!.z);
  let falta = Math.max(0, Math.min(1, fraccion)) * total;
  for (let i = 1; i < ruta.length; i++) {
    const a = ruta[i - 1]!;
    const b = ruta[i]!;
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (falta <= l || i === ruta.length - 1) {
      const t = l > 0 ? Math.min(1, falta / l) : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    falta -= l;
  }
  return ruta[ruta.length - 1]!;
}

/**
 * Lo que se aleja la estela de una isla, m: unos sesenta kilómetros. Es lo que
 * deja a La Gomera detrás de Tenerife con el alisio del nordeste, que es
 * donde la ponen los partes de allí.
 */
const ESTELA = 60_000;
/** Y lo que se abre a cada lado por cada metro que se aleja: unos veinte grados. */
const SE_ABRE = 0.36;

/**
 * **Si un punto queda a sotavento de una isla**: detrás de ella según el
 * viento, dentro de su estela. `haciaDonde` es el rumbo al que va el viento,
 * rad, 0 al norte y creciendo al este, como los rumbos del juego.
 */
export function aSotavento(
  p: { x: number; z: number },
  isla: IslaAlta,
  haciaDonde: number,
): boolean {
  const ex = Math.sin(haciaDonde);
  const ez = -Math.cos(haciaDonde);
  const dx = p.x - isla.x;
  const dz = p.z - isla.z;
  const detras = dx * ex + dz * ez;
  const lado = Math.abs(dx * -ez + dz * ex);
  if (detras < 0 || detras > isla.radio + ESTELA) return false;
  return lado < isla.radio + detras * SE_ABRE;
}

/**
 * **Lo que podría tocar hoy**, de la meteorología y la ruta, antes del control.
 * Ver la cabecera para la fuente de cada uno.
 */
function candidatos(d: DatosDelVuelo): Candidato[] {
  const { largo } = d;
  const lista: Candidato[] = [];
  // Lo volado que se tarda en subir a una altura y lo que falta al bajar desde ella.
  const subirA = (alto: number) => Math.max(0, alto - d.cotaSalida) / PENDIENTE_DE_SUBIDA;
  const bajarDesde = (alto: number) => Math.max(0, alto - d.cotaLlegada) / PENDIENTE_DE_BAJADA;
  // Desde dónde se va por encima de la capa de abajo, al salir y al llegar.
  const arriba = POR_ENCIMA_DE / PENDIENTE_DE_SUBIDA;
  const abajo = largo - POR_ENCIMA_DE / PENDIENTE_DE_BAJADA;
  const fuerte = d.vientoKt;

  /*
   * **Con tormenta en el parte, casi todo el vuelo**: del primer cuarto a
   * casi el final, moderada si sopla y si no ligera. Es la que pinta el radar,
   * así que se sabe antes. Las células, además, sacuden donde están: ver
   * `tormentas.ts`. El control la recorta para los pequeños.
   */
  if (d.tormenta)
    lista.push({
      causa: "tormenta",
      desde: largo * 0.1,
      hasta: largo * 0.9,
      probable: 1,
      moderada: fuerte >= 15 ? 0.8 : 0.4,
      capa: null,
      conNube: true,
      como: "tormenta",
      duraTipica: [Infinity, Infinity],
    });

  if (hayAlisio(d)) {
    /*
     * **Por debajo de la tapa del alisio**, al subir y al bajar. Más movido
     * cuanto más sopla; con nube, dentro y al borde del mar de nubes.
     */
    const tapa = inversionDelAlisio(d.mes, d.nubes);
    const probable = Math.max(0, Math.min(0.75, (fuerte - 6) / 20));
    const moderada = fuerte >= 25 ? 0.35 : fuerte >= 20 ? 0.12 : 0;
    const capa = conLaNube(d.nubes, tapa);
    const subida = Math.min(largo * 0.45, subirA(tapa));
    if (subida > arriba + 1000)
      lista.push({
        causa: "alisio",
        desde: arriba,
        hasta: subida,
        probable,
        moderada,
        capa,
        conNube: d.nubes !== null,
        como: "prevista",
        duraTipica: [40, 180],
      });
    const bajada = Math.max(largo * 0.55, largo - bajarDesde(tapa));
    if (abajo > bajada + 1000)
      lista.push({
        causa: "alisio",
        desde: bajada,
        hasta: abajo,
        probable,
        moderada,
        capa,
        conNube: d.nubes !== null,
        como: "prevista",
        duraTipica: [40, 180],
      });
  }

  /*
   * **A sotavento de las islas altas**, con viento: el tramo de la ruta que
   * queda detrás de una de ellas, hasta poco más alto que su cumbre. Sale en
   * el parte, y a veces lo avisa otro avión que pasó antes.
   */
  if (d.region === "canarias" && d.vientoDe !== null && fuerte >= 12 && d.islas.length) {
    const haciaDonde = ((d.vientoDe + 180) * Math.PI) / 180;
    for (const isla of d.islas) {
      let desde = -1;
      let hasta = -1;
      const pasos = 60;
      for (let i = 0; i <= pasos; i++) {
        const f = i / pasos;
        if (!aSotavento(puntoDeLaRuta(d.ruta, f), isla, haciaDonde)) continue;
        if (desde < 0) desde = f * largo;
        hasta = f * largo;
      }
      if (desde < 0 || hasta - desde < 2000) continue;
      lista.push({
        causa: "sotavento",
        desde: Math.max(arriba, desde),
        hasta: Math.min(abajo, hasta),
        probable: Math.max(0, Math.min(0.85, (fuerte - 8) / 16)),
        moderada: Math.max(0, Math.min(0.75, (fuerte - 15) / 14)),
        capa: { de: -1000, a: isla.alto * 1.3 },
        conNube: false,
        como: "prevista",
        duraTipica: [60, 360],
      });
    }
  }

  if (d.region === "paraguay") {
    /*
     * **Los cúmulos de la tarde**: en la estación cálida, por la tarde, por
     * debajo de sus cimas y dentro de ellos. Por la mañana y en invierno,
     * casi nunca.
     */
    const calida = estacionCalida(d.mes);
    const tarde = deTarde(d.hora);
    const probable = calida ? (tarde ? 0.7 : 0.2) : tarde ? 0.2 : 0.04;
    const base = d.nubes?.base ?? d.cotaSalida + 1200;
    const cimas = base + (calida && tarde ? 2500 : 1200);
    const capa = conLaNube(d.nubes, cimas);
    const subida = Math.min(largo * 0.45, subirA(cimas));
    const bajada = Math.max(largo * 0.55, largo - bajarDesde(cimas));
    const moderada = calida && tarde ? 0.3 : 0.05;
    if (subida > arriba + 1000)
      lista.push({
        causa: "cumulos",
        desde: arriba,
        hasta: subida,
        probable,
        moderada,
        capa,
        conNube: d.nubes !== null,
        como: "prevista",
        duraTipica: [40, 240],
      });
    if (abajo > bajada + 1000)
      lista.push({
        causa: "cumulos",
        desde: bajada,
        hasta: abajo,
        probable,
        moderada,
        capa,
        conNube: d.nubes !== null,
        como: "prevista",
        duraTipica: [40, 240],
      });
    /*
     * **Y el viento fuerte de abajo**, el de un frente que pasa: sin montaña
     * que lo rompa, se menea la capa de los primeros mil quinientos metros.
     */
    if (fuerte >= 15)
      lista.push({
        causa: "viento",
        desde: arriba,
        hasta: Math.min(largo * 0.45, subirA(d.cotaSalida + 1500)),
        probable: Math.min(0.7, (fuerte - 10) / 15),
        moderada: fuerte >= 25 ? 0.4 : 0.1,
        capa: { de: -1000, a: d.cotaSalida + 1500 },
        conNube: false,
        como: "prevista",
        duraTipica: [40, 180],
      });
  }

  /*
   * **La de aire claro**, en crucero y alto: rara, algo menos en el invierno
   * del sitio. No se sabe antes: es una capa alrededor del nivel.
   */
  if (d.crucero - Math.max(d.cotaSalida, d.cotaLlegada) > 2500) {
    const desde = Math.max(arriba, subirA(d.crucero));
    const hasta = Math.min(abajo, largo - bajarDesde(d.crucero));
    if (hasta - desde > 4000)
      lista.push({
        causa: "aire-claro",
        desde,
        hasta,
        probable: inviernoDe(d.region, d.mes) ? 0.15 : 0.07,
        moderada: 0.25,
        capa: { de: d.crucero - 600, a: d.crucero + 300 },
        conNube: false,
        como: "sin-avisar",
        duraTipica: [60, 420],
      });
  }
  return lista;
}

/** De cada cuántos previstos, uno lo avisa otro avión por radio: uno de cada tres. */
const AVISA_OTRO_AVION = 1 / 3;

/**
 * **El guion de este vuelo.** Primero lo que podría tocar hoy —ver
 * `candidatos`—, cada uno con su tirada; luego el control del peldaño
 * —`TOPES` y `HUECO`—. Con el mismo `azar` desde la misma semilla, el mismo
 * guion.
 */
export function guionDeTurbulencia(d: DatosDelVuelo, azar: Azar): Episodio[] {
  if (!(d.largo > 4000) || !(d.velocidad > 0)) return [];
  const tope = TOPES[d.peldano];
  const metros = (s: number) => s * d.velocidad;
  const finDelVuelo = tope.enLaFinal ? d.largo : d.largo - LA_FINAL;
  /*
   * **Cada candidato, con su tirada**, en el orden en que se dan. Se tira
   * siempre todo, toque o no: así un cambio en una causa no mueve el sorteo
   * de las demás, y la misma semilla sigue dando lo mismo en lo que no cambió.
   */
  const elegidos: Episodio[] = [];
  for (const c of candidatos(d)) {
    const sale = azar() < c.probable;
    const tiradaFuerza = azar();
    const tiradaLargo = azar();
    const tiradaSitio = azar();
    const tiradaFuente = azar();
    if (!sale) continue;
    const intensidad: Exclude<Intensidad, "fuerte"> =
      tope.fuerte === "moderada" && tiradaFuerza < c.moderada ? "moderada" : "ligera";
    // Lo que cabe: la ventana del candidato, sin la final si el peldaño no la deja.
    const desde = Math.max(0, c.desde);
    const hasta = Math.min(c.hasta, finDelVuelo);
    if (hasta - desde < metros(20)) continue;
    const [corto, largo] = c.duraTipica;
    const dura = Number.isFinite(largo)
      ? Math.min(metros(corto + (largo - corto) * tiradaLargo), hasta - desde)
      : hasta - desde;
    const tramo = Math.min(dura, metros(tope.dura));
    const sitio = desde + (hasta - desde - tramo) * tiradaSitio;
    const fuente: Fuente | undefined =
      c.como === "sin-avisar"
        ? undefined
        : c.como === "tormenta"
          ? "radar"
          : tiradaFuente < AVISA_OTRO_AVION
            ? "pirep"
            : "parte";
    elegidos.push({
      desde: sitio,
      hasta: sitio + tramo,
      intensidad,
      como: c.como,
      capa: c.capa,
      ...(fuente ? { fuente } : {}),
      causa: c.causa,
      conNube: c.conNube,
    });
  }
  return controlar(elegidos, d.largo, finDelVuelo, metros, tope);
}

/**
 * **El control**: en orden, con su hueco, hasta los que caben, y sin pasar de
 * la parte del vuelo que le toca al peldaño. Si sobran, se quedan los
 * moderados —son los que enseñan el cartel y el anuncio— y, entre iguales,
 * los primeros.
 */
function controlar(
  episodios: Episodio[],
  largo: number,
  fin: number,
  metros: (s: number) => number,
  tope: (typeof TOPES)[Peldano],
): Episodio[] {
  const hueco = metros(HUECO);
  const ordenados = [...episodios].sort((a, b) => a.desde - b.desde);
  // Los que se pisan o no dejan su hueco: el segundo se corre detrás del primero.
  const sinPisarse: Episodio[] = [];
  for (const e of ordenados) {
    const antes = sinPisarse[sinPisarse.length - 1];
    if (!antes || e.desde >= antes.hasta + hueco) {
      sinPisarse.push(e);
      continue;
    }
    const corrido = antes.hasta + hueco;
    const tramo = e.hasta - e.desde;
    // Y corrido, sin meterse en la final si el peldaño no la deja.
    if (corrido + tramo > fin) continue;
    sinPisarse.push({ ...e, desde: corrido, hasta: corrido + tramo });
  }
  const porImportancia = [...sinPisarse].sort(
    (a, b) =>
      Number(b.intensidad === "moderada") - Number(a.intensidad === "moderada") ||
      a.desde - b.desde,
  );
  const quedan: Episodio[] = [];
  let meneo = 0;
  const cabe = largo * tope.delVuelo;
  for (const e of porImportancia) {
    if (quedan.length >= tope.episodios) break;
    const tramo = e.hasta - e.desde;
    if (meneo + tramo > cabe) {
      // El que no cabe entero, recortado a lo que queda, si queda algo que se note.
      const resto = cabe - meneo;
      if (resto < metros(20)) continue;
      quedan.push({ ...e, hasta: e.desde + resto });
      meneo = cabe;
      continue;
    }
    quedan.push(e);
    meneo += tramo;
  }
  return quedan.sort((a, b) => a.desde - b.desde);
}
