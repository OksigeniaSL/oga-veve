/**
 * **El cielo de noche de verdad**: dónde está cada estrella, la Luna y la Vía
 * Láctea para un sitio, un día y una hora.
 *
 * Las estrellas eran mil doscientos puntos sorteados con semilla fija: el
 * mismo cielo siempre y ninguna estrella en su sitio. Para lo que se quiere
 * enseñar —orientarse con la Cruz del Sur en Paraguay y con la Polar en
 * Canarias— eso no vale: la Cruz tiene que estar donde está esa noche, a la
 * altura que tiene desde Asunción, y la Polar baja sobre el norte de Tenerife,
 * a la altura de su latitud. **Quien aprenda a encontrarla aquí tiene que
 * encontrarla igual el día que mire al cielo de verdad.**
 *
 * ## Qué cuentas, y por qué estas
 *
 * Las de cualquier efeméride de bolsillo, sin una dependencia: es astronomía
 * de posición de la de toda la vida y cabe en este fichero.
 *
 * - **El tiempo sidéreo** (IAU 1982): cuánto ha girado la Tierra respecto a
 *   las estrellas. Con él y la longitud, qué estrellas pasan por el meridiano.
 * - **La precesión** de J2000 a la fecha (IAU 1976, Lieske): el catálogo da
 *   las posiciones de 2000 y el eje de la Tierra se ha ido un tercio de grado
 *   desde entonces. Se ve poco, pero cuesta una matriz.
 * - **El Sol y la Luna** con las fórmulas de baja precisión del *Astronomical
 *   Almanac*: un cuarto de grado para la Luna, más fino de lo que mide su
 *   disco. La Luna, además, **vista desde el sitio** y no desde el centro de
 *   la Tierra: la paralaje la mueve casi un grado, dos discos.
 * - **La galaxia**, con la matriz de la IAU que pasa de J2000 a coordenadas
 *   galácticas: es lo que dibuja la Vía Láctea en la cúpula.
 *
 * No se cuentan la nutación ni la aberración, que mueven las estrellas veinte
 * segundos de arco —una décima de píxel—, ni la refracción, que levanta medio
 * grado lo que está pegado al horizonte, justo donde la bruma ya se lo come.
 *
 * ## El Sol que alumbra no es este
 *
 * El sol que pinta y alumbra el juego sigue siendo el de `sky.ts`, que sale a
 * las seis y se pone a las dieciocho: es una decisión con su porqué, escrita
 * allí. El de aquí solo sirve para saber **qué cara de la Luna alumbra**, que
 * tiene que ser la de verdad para que la fase esté bien. De día no se pinta la
 * Luna, que es donde los dos soles podrían no casar.
 *
 * ## Los ejes
 *
 * El mundo del juego tiene la X al este, la Y arriba y la Z **al sur** —el
 * norte es la Z negativa—, igual que el aeródromo. Todo lo de aquí acaba en
 * esos ejes, para que el dibujo no tenga que saber astronomía.
 */

/** Grados a radianes. */
export const GRADO = Math.PI / 180;

/** Una matriz de 3×3 por filas: `[a, b, c, d, e, f, g, h, i]`. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Un vector de tres. */
export type Vec3 = readonly [number, number, number];

/** Matriz por vector. */
export function aplicar(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Matriz por matriz. */
export function componer(a: Mat3, b: Mat3): Mat3 {
  const r: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r.push(
        a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!,
      );
  return r as unknown as Mat3;
}

/** La traspuesta, que en una rotación es la inversa. */
export function traspuesta(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/** El vector unidad de unas coordenadas esféricas, en grados. */
export function unitario(longitud: number, latitud: number): Vec3 {
  const l = longitud * GRADO;
  const b = latitud * GRADO;
  return [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
}

/** Días julianos de un instante. */
export function diaJuliano(t: Date): number {
  return t.getTime() / 86_400_000 + 2_440_587.5;
}

/**
 * Siglos julianos desde J2000.0. Se toma el tiempo universal por el
 * dinámico: los setenta segundos que los separan mueven la Luna medio
 * minuto de arco.
 */
export function siglos(t: Date): number {
  return (diaJuliano(t) - 2_451_545) / 36_525;
}

/** Un ángulo en grados, llevado a [0, 360). */
export function vuelta(grados: number): number {
  return ((grados % 360) + 360) % 360;
}

/**
 * **El tiempo sidéreo medio de Greenwich**, en grados: hacia qué ascensión
 * recta mira el meridiano de Greenwich en ese instante. Es la fórmula de la
 * IAU de 1982, la de Meeus en su capítulo 12.
 */
export function tiempoSidereo(t: Date): number {
  const d = diaJuliano(t) - 2_451_545;
  const T = d / 36_525;
  return vuelta(
    280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38_710_000,
  );
}

/** La oblicuidad media de la eclíptica, en grados. */
export function oblicuidad(T: number): number {
  return 23.439291 - 0.0130042 * T;
}

/**
 * **La precesión** de J2000 a la fecha: la matriz que lleva un vector
 * ecuatorial de 2000 al ecuador y equinoccio medios de `T` siglos después.
 * Lieske (1977), la de Meeus en su capítulo 21.
 */
export function precesion(T: number): Mat3 {
  const seg = GRADO / 3600;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * seg;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * seg;
  const th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * seg;
  const [cz, sz] = [Math.cos(z), Math.sin(z)];
  const [cZ, sZ] = [Math.cos(zeta), Math.sin(zeta)];
  const [ct, st] = [Math.cos(th), Math.sin(th)];
  return [
    cz * ct * cZ - sz * sZ,
    -cz * ct * sZ - sz * cZ,
    -cz * st,
    sz * ct * cZ + cz * sZ,
    -sz * ct * sZ + cz * cZ,
    -sz * st,
    st * cZ,
    -st * sZ,
    ct,
  ];
}

/**
 * **Del ecuador del cielo al horizonte del sitio**: la matriz que lleva un
 * vector ecuatorial de la fecha a los ejes del juego —X al este, Y arriba, Z
 * al sur—, con la latitud y el tiempo sidéreo local, los dos en grados.
 *
 * Se arma con tres direcciones del cielo vistas desde el sitio, que es como
 * se entiende: **el polo** está sobre el norte a la altura de la latitud; el
 * punto del ecuador que pasa por el meridiano está sobre el sur, a noventa
 * menos la latitud; y el que pasó hace seis horas se está poniendo por el
 * oeste. El resto del cielo gira alrededor del polo arrastrado por esos tres.
 */
export function alHorizonte(latitud: number, sidereoLocal: number): Mat3 {
  const f = latitud * GRADO;
  const L = sidereoLocal * GRADO;
  const [sf, cf] = [Math.sin(f), Math.cos(f)];
  const [sL, cL] = [Math.sin(L), Math.cos(L)];
  // En este, norte y arriba.
  const polo: Vec3 = [0, cf, sf];
  const meridiano: Vec3 = [0, -sf, cf];
  const oeste: Vec3 = [-1, 0, 0];
  // Las columnas: dónde caen los ejes ecuatoriales X (el equinoccio), Y y Z
  // (el polo) con la Tierra girada L.
  const x = [0, 1, 2].map((i) => cL * meridiano[i]! + sL * oeste[i]!);
  const y = [0, 1, 2].map((i) => sL * meridiano[i]! - cL * oeste[i]!);
  const z = polo;
  // Y de este-norte-arriba a los ejes del juego: (este, arriba, −norte).
  return [
    x[0]!, y[0]!, z[0],
    x[2]!, y[2]!, z[2],
    -x[1]!, -y[1]!, -z[1],
  ];
}

/**
 * El instante que corresponde a una **hora solar** del sitio en el día de
 * `fecha`.
 *
 * El juego lleva la hora solar media del sitio —ver `world/hora.ts`—, no la
 * del reloj de la pared, y el cielo tiene que girar con ella: las nueve de la
 * noche de sol en Asunción son las 00:50 en Greenwich. El día es el de quien
 * juega, contado también en el sitio: a las once de la noche en Asunción ya
 * es mañana en Greenwich, y el cielo es el de esta noche.
 */
export function instanteDeLaHora(
  fecha: Date,
  horaSolar: number,
  longitud: number,
): Date {
  const desfase = longitud / 15;
  const alli = new Date(fecha.getTime() + desfase * 3_600_000);
  const medianoche = Date.UTC(
    alli.getUTCFullYear(),
    alli.getUTCMonth(),
    alli.getUTCDate(),
  );
  return new Date(medianoche + (horaSolar - desfase) * 3_600_000);
}

/**
 * **La matriz galáctica de la IAU** (Hipparcos, 1997): de ecuatoriales J2000
 * a galácticas, con el centro de la galaxia en el eje X y su polo norte en el
 * Z. La Vía Láctea es lo que hay cerca del plano XY.
 */
export const GALACTICAS_DESDE_J2000: Mat3 = [
  -0.0548755604, -0.8734370902, -0.4838350155,
  0.4941094279, -0.44482963, 0.7469822445,
  -0.867666149, -0.1980763734, 0.4559837762,
];

/**
 * **El Sol de verdad**, en ecuatoriales de la fecha: la fórmula de baja
 * precisión de Meeus (capítulo 25), con un centésimo de grado de error.
 * Solo para alumbrar la Luna. Ver la cabecera.
 */
export function solDeVerdad(T: number): Vec3 {
  const L0 = 280.46646 + 36_000.76983 * T;
  const M = (357.52911 + 35_999.05029 * T) * GRADO;
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(M) +
    0.019993 * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  return deLaEcliptica(L0 + C, 0, T);
}

/** De eclípticas de la fecha, en grados, a un vector ecuatorial de la fecha. */
export function deLaEcliptica(lon: number, lat: number, T: number): Vec3 {
  const e = oblicuidad(T) * GRADO;
  const [x, y, z] = unitario(lon, lat);
  return [x, y * Math.cos(e) - z * Math.sin(e), y * Math.sin(e) + z * Math.cos(e)];
}

/** Lo que hace falta de la Luna. */
export interface LaLuna {
  /** Dirección desde el centro de la Tierra, ecuatoriales de la fecha. */
  readonly direccion: Vec3;
  /** A cuántos radios terrestres está: unos sesenta. */
  readonly radios: number;
}

/**
 * **La Luna**, con las fórmulas de baja precisión del *Astronomical Almanac*
 * —seis términos en longitud, cuatro en latitud y en paralaje—: tres décimas
 * de grado en el peor caso, menos que su disco.
 */
export function lunaDeVerdad(T: number): LaLuna {
  const s = (a: number, b: number): number => Math.sin((a + b * T) * GRADO);
  const c = (a: number, b: number): number => Math.cos((a + b * T) * GRADO);
  const lon =
    218.32 +
    481_267.881 * T +
    6.29 * s(135.0, 477_198.87) -
    1.27 * s(259.3, -413_335.36) +
    0.66 * s(235.7, 890_534.22) +
    0.21 * s(269.9, 954_397.74) -
    0.19 * s(357.5, 35_999.05) -
    0.11 * s(186.5, 966_404.03);
  const lat =
    5.13 * s(93.3, 483_202.02) +
    0.28 * s(228.2, 960_400.89) -
    0.28 * s(318.3, 6_003.15) -
    0.17 * s(217.6, -407_332.21);
  const paralaje =
    0.9508 +
    0.0518 * c(135.0, 477_198.87) +
    0.0095 * c(259.3, -413_335.36) +
    0.0078 * c(235.7, 890_534.22) +
    0.0028 * c(269.9, 954_397.74);
  return {
    direccion: deLaEcliptica(lon, lat, T),
    radios: 1 / Math.sin(paralaje * GRADO),
  };
}

/**
 * **La Luna vista desde el sitio**, en ecuatoriales de la fecha: la del
 * centro de la Tierra menos el radio que separa al que mira de ese centro.
 * Está a sesenta radios, así que el radio de uno la mueve hasta un grado —
 * más que su disco—, y siempre hacia el horizonte.
 */
export function lunaDesde(
  luna: LaLuna,
  latitud: number,
  sidereoLocal: number,
): Vec3 {
  const sitio = unitario(sidereoLocal, latitud);
  const v: Vec3 = [
    luna.direccion[0] * luna.radios - sitio[0],
    luna.direccion[1] * luna.radios - sitio[1],
    luna.direccion[2] * luna.radios - sitio[2],
  ];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * **Cuánto de la Luna está alumbrado**, de 0 —luna nueva— a 1 —llena—, por el
 * ángulo entre el Sol y la Luna vistos desde aquí. Es la fase, y es lo que se
 * pinta: la sombra en el disco no se dibuja a mano, sale de alumbrar una bola
 * desde donde está el Sol.
 */
export function iluminada(sol: Vec3, luna: Vec3): number {
  const cosElongacion = sol[0] * luna[0] + sol[1] * luna[1] + sol[2] * luna[2];
  return (1 - cosElongacion) / 2;
}

/** Todo lo del cielo de un instante y un sitio, en los ejes del juego. */
export interface CieloDeAhora {
  /** Del J2000 del catálogo al mundo del juego. */
  readonly mundoDesdeJ2000: Mat3;
  /** Del mundo del juego a coordenadas galácticas. Ver la Vía Láctea. */
  readonly galacticasDesdeMundo: Mat3;
  /** Hacia dónde está la Luna, vista desde aquí. */
  readonly luna: Vec3;
  /** Hacia dónde está el Sol de verdad. Ver la cabecera. */
  readonly sol: Vec3;
  /**
   * El norte de la Luna, aproximado por el polo de la eclíptica —el eje de
   * la Luna se separa de él grado y medio—. Es lo que hace que desde Paraguay
   * se vea **cabeza abajo** respecto a Canarias: la misma Luna, mirada desde
   * el otro lado del ecuador.
   */
  readonly norteDeLaLuna: Vec3;
  /** De 0 a 1. Ver `iluminada`. */
  readonly fase: number;
}

/** Del J2000 del catálogo al mundo del juego, para un sitio y un instante. */
export function mundoDesdeJ2000(
  t: Date,
  latitud: number,
  longitud: number,
): Mat3 {
  const T = siglos(t);
  const local = tiempoSidereo(t) + longitud;
  return componer(alHorizonte(latitud, local), precesion(T));
}

/** **El cielo de un sitio en un instante**: ver `CieloDeAhora`. */
export function cieloDe(t: Date, latitud: number, longitud: number): CieloDeAhora {
  const T = siglos(t);
  const local = tiempoSidereo(t) + longitud;
  const horizonte = alHorizonte(latitud, local);
  const desdeJ2000 = componer(horizonte, precesion(T));
  const sol = solDeVerdad(T);
  const luna = lunaDesde(lunaDeVerdad(T), latitud, local);
  const e = oblicuidad(T) * GRADO;
  return {
    mundoDesdeJ2000: desdeJ2000,
    galacticasDesdeMundo: componer(GALACTICAS_DESDE_J2000, traspuesta(desdeJ2000)),
    luna: aplicar(horizonte, luna),
    sol: aplicar(horizonte, sol),
    norteDeLaLuna: aplicar(horizonte, [0, -Math.sin(e), Math.cos(e)]),
    fase: iluminada(sol, luna),
  };
}

/**
 * Altura sobre el horizonte y acimut —desde el norte, por el este— de un
 * vector en los ejes del juego, en grados.
 */
export function alturaYAcimut(v: Vec3): { altura: number; acimut: number } {
  return {
    altura: Math.asin(Math.max(-1, Math.min(1, v[1]))) / GRADO,
    acimut: vuelta(Math.atan2(v[0], -v[2]) / GRADO),
  };
}

/**
 * **Las dos que se enseñan**, con sus coordenadas J2000 del propio catálogo
 * —el número HR al lado, para encontrarlas en él—.
 *
 * - **La Polar**, α de la Osa Menor (HR 424): a menos de un grado del polo
 *   norte del cielo, así que **su altura es la latitud** de quien la mira. En
 *   Tenerife, unos veintiocho grados sobre el norte; en Asunción, bajo el
 *   horizonte: no se ve nunca.
 * - **La Cruz del Sur**: sus cuatro brillantes, Ácrux (HR 4730), Gácrux (HR
 *   4763), Mimosa (HR 4853) y δ (HR 4656). El palo largo, de Gácrux a Ácrux,
 *   apunta al polo sur del cielo, que no tiene estrella: prolongado cuatro
 *   veces y media cae encima del sur. Desde Canarias asoma, como mucho, unos
 *   grados sobre el horizonte.
 */
export const POLAR = { ra: 37.9529, dec: 89.2642 } as const;
export const CRUZ_DEL_SUR = {
  acrux: { ra: 186.6496, dec: -63.0992 },
  gacrux: { ra: 187.7912, dec: -57.1133 },
  mimosa: { ra: 191.93, dec: -59.6886 },
  delta: { ra: 183.7863, dec: -58.7489 },
} as const;

/** El centro de la Cruz: la media de sus cuatro brillantes, en J2000. */
export const CENTRO_DE_LA_CRUZ: Vec3 = (() => {
  const s = Object.values(CRUZ_DEL_SUR)
    .map((e) => unitario(e.ra, e.dec))
    .reduce<[number, number, number]>(
      (a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]],
      [0, 0, 0],
    );
  const l = Math.hypot(s[0], s[1], s[2]);
  return [s[0] / l, s[1] / l, s[2] / l];
})();
