/**
 * El avión de verdad contra el que se miden los nuestros.
 *
 * Las fichas de `aircraft.ts` son diseños originales y tienen que serlo —los
 * fabricantes protegen sus nombres y sus siluetas—, pero un diseño original
 * no es una excusa para inventarse la física. La regla 4 del `AGENTS.md` dice
 * que lo que se enseña es real, y hasta hoy los coeficientes de las fichas
 * estaban puestos «en el orden de magnitud de una avioneta ligera real» sin
 * que hubiera en ningún sitio **cuál** avioneta real ni **qué** números.
 *
 * Esto es ese sitio.
 *
 * ## De dónde sale
 *
 * **NASA CR-96008**, Gary L. Teper, *Aircraft Stability and Control Data*,
 * abril de 1969 (informe STI TR-176-1), sección X: el juego completo de
 * derivadas del **Navion**, monomotor de ala baja de cuatro plazas, que es la
 * referencia clásica de avioneta en toda la literatura de mecánica del vuelo.
 * <https://ntrs.nasa.gov/citations/19690022405>
 *
 * Obra del Gobierno de los Estados Unidos: dominio público, sin restricción
 * de uso comercial. No hay que pedir permiso ni citar a nadie — aunque se
 * cita igual, porque un número sin procedencia no vale nada.
 *
 * Los recorridos de mando salen de la **TCDS A-782**, la especificación de
 * tipo de la FAA del propio avión, modelo Navion (L-17A), que es el de 2.750
 * libras — o sea exactamente la condición de vuelo del informe.
 *
 * ## Y no es un avión nuestro
 *
 * El Navion es de **ala baja** y tren retráctil; el JAZ 20 *Pykasu* es de ala
 * alta y tren fijo. No se parecen y no tienen que parecerse: esto no es una
 * plantilla que copiar, es una vara con la que medir. Lo que se compara es lo
 * que la física manda que se parezca —el margen estático, el amortiguamiento
 * de alabeo, la autoridad de los mandos por grado de deflexión— y lo que la
 * configuración manda que **no** se parezca queda dicho con su motivo: un ala
 * alta tiene más efecto diedro que un ala baja, y eso es correcto, no un
 * error.
 *
 * ## Los ejes y los signos
 *
 * Ejes estabilidad, ligados al cuerpo, convención aeronáutica estándar: x
 * adelante, y a la derecha, z abajo. Las velocidades angulares se
 * adimensionalizan como en `fdm.ts` —`p·b/2V`, `q·c/2V`, `r·b/2V`— y los
 * momentos son `q̄·S·b·Cl`, `q̄·S·c̄·Cm`, `q̄·S·b·Cn`. Son las mismas que usa
 * el informe, así que **los coeficientes se comparan directamente**, sin
 * convertir nada. Los de mando no: ver `A_MANDO_ENTERO`.
 *
 * ## La errata de la superficie alar
 *
 * La tabla X-A imprime `S = 180 ft²` y la figura X-1 de la página anterior
 * dice `S = 184 ft²`. Las dos no pueden ser. Gana 184, y no por votación:
 * **las veinte derivadas dimensionales del propio informe solo cuadran con
 * 184**. Con 180 fallan todas por el mismo 2,17 %, que es justo 184/180. Eso
 * está comprobado en `referencia.test.ts` y es la mitad del valor de tener
 * las dos formas transcritas.
 */

/** Los factores de conversión, escritos una vez. */
const PIE = 0.3048;
const LIBRA = 0.45359237;
/** Un slug·pie² en kg·m². */
const SLUG_PIE2 = 1.35581795;

/**
 * La condición de vuelo de la sección X: nivel, al nivel del mar.
 *
 * Un juego de derivadas **no vale fuera de su condición**: son las pendientes
 * de una linealización alrededor de este punto y nada más. Ciento setenta y
 * seis pies por segundo son 53,6 m/s, o sea crucero de avioneta.
 */
export const CONDICION = {
  /** Altura, pies. Nivel del mar. */
  alturaPies: 0,
  mach: 0.158,
  /** Velocidad verdadera, pies por segundo. */
  velocidadPiesPorSegundo: 176,
  /** Presión dinámica, libras por pie cuadrado. */
  presionDinamicaLibrasPorPie2: 36.8,
  /** Densidad, slugs por pie cúbico. */
  densidadSlugsPorPie3: 0.002378,
  /** Ángulo de ataque de equilibrio, grados. */
  alfaGrados: 0.6,
  /** Ángulo de trayectoria, grados. Cero: vuelo nivelado. */
  gammaGrados: 0,
} as const;

/**
 * Tabla X-A: geometría, masa e inercias.
 *
 * `superficiePies2` es 184 y no el 180 que imprime la tabla. Ver la cabecera.
 */
export const GEOMETRIA = {
  superficiePies2: 184,
  envergaduraPies: 33.4,
  cuerdaPies: 5.7,
  pesoLibras: 2750,
  masaSlugs: 85.4,
  /** Centro de gravedad, en tanto por ciento de la cuerda media. */
  cgPorCiento: 29.5,
  inerciaSlugPies2: { xx: 1048, yy: 3000, zz: 3530, xz: 0 },
} as const;

/**
 * Lo mismo en unidades de las nuestras, que es como entra en una ficha.
 *
 * Se calcula, no se copia: una tabla de conversiones escritas a mano es una
 * tabla que se queda desfasada en cuanto alguien toque un número de arriba.
 */
export const EN_SI = {
  superficie: GEOMETRIA.superficiePies2 * PIE * PIE,
  envergadura: GEOMETRIA.envergaduraPies * PIE,
  cuerda: GEOMETRIA.cuerdaPies * PIE,
  masa: GEOMETRIA.pesoLibras * LIBRA,
  inercia: {
    xx: GEOMETRIA.inerciaSlugPies2.xx * SLUG_PIE2,
    yy: GEOMETRIA.inerciaSlugPies2.yy * SLUG_PIE2,
    zz: GEOMETRIA.inerciaSlugPies2.zz * SLUG_PIE2,
  },
  velocidad: CONDICION.velocidadPiesPorSegundo * PIE,
} as const;

/** Alargamiento, que es lo que manda en la pendiente de sustentación. */
export const ALARGAMIENTO =
  (EN_SI.envergadura * EN_SI.envergadura) / EN_SI.superficie;

/**
 * Tabla X-B: derivadas longitudinales adimensionales, **por radián**.
 *
 * `cd` es la resistencia **total** en equilibrio, no la parásita: a CL 0,41
 * la inducida se lleva 0,0116, así que el CD0 del Navion sale 0,038. Es un
 * detalle que se cuela fácil —copiar 0,05 como `cd0` engorda la resistencia
 * un treinta por ciento— y por eso el nombre aquí es `cd` y no `cd0`.
 *
 * `cmDeltaE` **no está en la tabla**: el informe solo da el elevador en forma
 * dimensional (`mDeltaE`, tabla X-D). Se recupera de ahí, y eso también se
 * comprueba.
 */
export const LONGITUDINAL = {
  cl: 0.41,
  cd: 0.05,
  clAlfa: 4.44,
  clAlfaPunto: 0,
  clMach: 0,
  clDeltaE: 0.355,
  cdAlfa: 0.33,
  cdMach: 0,
  cdDeltaE: 0,
  cmAlfa: -0.683,
  cmAlfaPunto: -4.36,
  cmMach: 0,
  cmQ: -9.96,
} as const;

/** Tabla X-C: derivadas laterales-direccionales adimensionales, por radián. */
export const LATERAL = {
  cyBeta: -0.564,
  cyDeltaA: 0,
  cyDeltaR: 0.157,
  clBeta: -0.074,
  clP: -0.41,
  clR: 0.107,
  clDeltaA: 0.1342,
  clDeltaR: 0.0118,
  cnBeta: 0.0701,
  cnP: -0.0575,
  cnR: -0.125,
  cnDeltaA: -0.00346,
  cnDeltaR: -0.0717,
} as const;

/**
 * Tabla X-D: derivadas longitudinales dimensionales.
 *
 * **Y esto es lo que hace que la transcripción se pueda probar.** Un juego de
 * números copiados a mano de un PDF escaneado no vale nada si no hay forma de
 * saber si se copiaron bien; aquí sí la hay, porque el informe trae las
 * mismas derivadas en las dos formas y la una se calcula de la otra. Si un
 * dígito se picó mal, la cuenta no cuadra. Ver `referencia.test.ts`.
 *
 * Unidades: las X y Z, 1/s; `mW` en 1/(pie·s); `mQ` en 1/s; `mDeltaE` en 1/s².
 */
export const LONGITUDINAL_DIMENSIONAL = {
  xW: 0.03607,
  xU: -0.0451,
  xDeltaE: 0,
  zW: -2.0244,
  zU: -0.3697,
  zDeltaE: -28.17,
  mW: -0.04997,
  mWPunto: -0.005165,
  mQ: -2.0767,
  mU: 0,
  mDeltaE: -11.1892,
} as const;

/** Tabla X-E: derivadas laterales dimensionales. Con `Ixz = 0`, las primas no priman. */
export const LATERAL_DIMENSIONAL = {
  /** Las de fuerza lateral vienen ya divididas por la velocidad. */
  yV: -0.2543,
  yDeltaA: 0,
  yDeltaR: 0.0708,
  lBeta: -15.982,
  lP: -8.402,
  lR: 2.193,
  lDeltaA: 28.984,
  lDeltaR: 2.548,
  nBeta: 4.495,
  nP: -0.3498,
  nR: -0.7605,
  nDeltaA: -0.2218,
  nDeltaR: -4.597,
} as const;

/**
 * Recorridos de mando, TCDS A-782, modelo Navion (L-17A). Grados.
 *
 * Son asimétricos, como en cualquier avioneta: el elevador sube más de lo que
 * baja y el alerón también, porque el que sube tiene que compensar la guiñada
 * adversa del que baja. Para la autoridad se usa el recorrido del lado que
 * manda —tirar es arriba, pie derecho es derecha— y para el alerón la media
 * de los dos, que es la definición estándar de δa.
 */
export const RECORRIDOS = {
  elevadorArriba: 30,
  elevadorAbajo: 20,
  aleronArriba: 25,
  aleronAbajo: 17,
  timonDerecha: 23,
  timonIzquierda: 17,
  flapsAbajo: 45,
} as const;

const rad = (grados: number) => (grados * Math.PI) / 180;

/**
 * Cuánto vale cada mando a fondo, en radianes.
 *
 * **Esta es la conversión que hay que hacer y que es fácil no hacer.** La
 * literatura tabula los coeficientes de mando **por radián de deflexión**;
 * nuestras fichas los guardan **por mando normalizado**, o sea por palanca a
 * fondo. Copiar un número de un libro tal cual multiplica la autoridad por
 * dos o por tres — ya pasó: el avión rodaba a doscientos cincuenta grados por
 * segundo, ritmo de caza, y bastaba rozar una flecha para perderlo. Ver
 * `clAileron` en `aircraft.ts`.
 *
 *     coeficiente_de_ficha = coeficiente_por_radián × recorrido_en_radianes
 */
export const A_MANDO_ENTERO = {
  elevador: rad(RECORRIDOS.elevadorArriba),
  aleron: rad((RECORRIDOS.aleronArriba + RECORRIDOS.aleronAbajo) / 2),
  timon: rad(RECORRIDOS.timonDerecha),
} as const;

/**
 * El `Cmδe` que el informe no imprime, recuperado de su forma dimensional.
 *
 *     Cmδe = Mδe · Iy / (q̄ · S · c̄)
 *
 * Sale −0,870 por radián. El valor que circula por los libros es −0,923, que
 * viene de otra fuente y de otro Navion: aquí manda el informe que tenemos
 * delante, que además se cruza consigo mismo.
 */
export const CM_DELTA_E =
  (LONGITUDINAL_DIMENSIONAL.mDeltaE * GEOMETRIA.inerciaSlugPies2.yy) /
  (CONDICION.presionDinamicaLibrasPorPie2 *
    GEOMETRIA.superficiePies2 *
    GEOMETRIA.cuerdaPies);

/**
 * El Navion escrito como lo escribiríamos nosotros.
 *
 * Los de mando, convertidos; los demás, tal cual, porque la
 * adimensionalización es la misma. Los signos se pasan a la convención de la
 * ficha, que es la que usa `fdm.ts`: `cmElevator` y `cnRudder` positivos
 * —tirar levanta el morro, pie derecho guiña a la derecha—, donde el informe
 * los da negativos porque cuenta la deflexión con el signo contrario.
 */
export const EN_CONVENCION_DE_FICHA = {
  clAlpha: LONGITUDINAL.clAlfa,
  cmAlpha: LONGITUDINAL.cmAlfa,
  cmQ: LONGITUDINAL.cmQ,
  cyBeta: LATERAL.cyBeta,
  clBeta: LATERAL.clBeta,
  clP: LATERAL.clP,
  cnBeta: LATERAL.cnBeta,
  cnR: LATERAL.cnR,
  cmElevator: -CM_DELTA_E * A_MANDO_ENTERO.elevador,
  clAileron: LATERAL.clDeltaA * A_MANDO_ENTERO.aleron,
  cnRudder: -LATERAL.cnDeltaR * A_MANDO_ENTERO.timon,
  cnAileron: LATERAL.cnDeltaA * A_MANDO_ENTERO.aleron,
} as const;

/**
 * Pendiente de sustentación de un ala finita, por línea sustentadora.
 *
 *     CLα = 2π / (1 + 2/(AR·e))
 *
 * Está aquí y no en `fdm.ts` porque no es física del vuelo: es la cuenta que
 * dice si el número que alguien escribió en una ficha es defendible. Y el
 * Navion la valida —predice 4,38 donde el informe mide 4,44, un 1,3 % — así
 * que cuando dice que una ficha está un diez por ciento alta, lo está.
 *
 * **No vale para un biplano.** Dos alas cerca se estorban y el conjunto
 * sustenta menos por unidad de superficie, no más; el JAZ 25 *Mainumby* queda
 * fuera de esta vara a propósito.
 */
export function pendienteDeSustentacion(alargamiento: number, e: number) {
  return (2 * Math.PI) / (1 + 2 / (alargamiento * e));
}

/**
 * Margen estático, en tanto por uno de la cuerda media.
 *
 * `−Cmα/CLα`. Es lo que dice si un avión es estable y **cuánto**: cero es el
 * punto neutro, y una avioneta de escuela anda entre el diez y el veinte por
 * ciento. El Navion, con el centro de gravedad al 29,5 %, sale al 15,4 %.
 */
export function margenEstatico(clAlpha: number, cmAlpha: number): number {
  return -cmAlpha / clAlpha;
}

/**
 * Ritmo de alabeo estabilizado a mando entero, grados por segundo.
 *
 *     p = clAileron/|clP| · 2V/b
 *
 * Es la fórmula que ya estaba escrita al lado de `clAileron` en la ficha, y
 * ahora tiene un número real detrás: **el Navion sale a 72 °/s** con sus
 * recorridos certificados, a su crucero de 53,6 m/s. Justo dentro de los
 * 60-80 que la propia ficha se pone como regla.
 */
export function ritmoDeAlabeo(
  clAileron: number,
  clP: number,
  velocidad: number,
  envergadura: number,
): number {
  const rads = ((clAileron / Math.abs(clP)) * (2 * velocidad)) / envergadura;
  return (rads * 180) / Math.PI;
}

/**
 * Los modos propios del avión, tal como los imprime el informe.
 *
 * Tablas X-F (Δ longitudinal) y X-G/X-H (Δ lateral). No son derivadas: son lo
 * que **hace** el avión con esas derivadas — el corto período, el fugoide, el
 * balanceo holandés, la convergencia de alabeo y la espiral—, o sea las cinco
 * cosas que un piloto nota.
 *
 * Están aquí porque cierran el círculo: las derivadas se cruzan con su forma
 * dimensional y las dimensionales se cruzan **con esto**, que es el
 * comportamiento. Si el juego de números fuera un juego de números cualquiera,
 * no saldría el fugoide de veintinueve segundos de este avión.
 */
export const MODOS = {
  /** Corto período: rápido y bien amortiguado. Lo que se siente al tirar. */
  cortoPeriodo: { omega: 3.6083, zeta: 0.6957 },
  /**
   * Fugoide: lento y casi sin amortiguar. Veintinueve segundos de período, y
   * es exactamente el que Guyrami no tiene porque su modelo no intercambia
   * altura por velocidad. Ver `tiers.ts`.
   */
  fugoide: { omega: 0.2137, zeta: 0.0801 },
  balanceoHolandes: { omega: 2.385, zeta: 0.204 },
  /** Convergencia de alabeo, en 1/T: se apaga en una décima de segundo. */
  convergenciaDeAlabeo: 8.435,
  /** Espiral, en 1/T. Positivo y diminuto: converge, pero tarda dos minutos. */
  espiral: 0.00876,
} as const;

/** La gravedad en las unidades del informe, pies por segundo al cuadrado. */
const G_PIES = 32.174;

type Matriz = readonly (readonly number[])[];

/**
 * Coeficientes del polinomio característico de una matriz, por
 * Faddeev-LeVerrier.
 *
 * Devuelve `[1, a₁, a₂, …]` de `sⁿ + a₁sⁿ⁻¹ + …`. Se usa esto y no las raíces
 * porque **no hacen falta las raíces**: comparar dos polinomios coeficiente a
 * coeficiente dice lo mismo y no necesita resolver una cuártica.
 */
export function polinomioCaracteristico(a: Matriz): number[] {
  const n = a.length;
  const por = (x: Matriz, y: Matriz) =>
    x.map((fila, i) =>
      y[0]!.map((_, j) =>
        fila.reduce((s, _v, k) => s + x[i]![k]! * y[k]![j]!, 0),
      ),
    );
  const traza = (x: Matriz) => x.reduce((s, fila, i) => s + fila[i]!, 0);
  let m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const c = [1];
  for (let k = 1; k <= n; k++) {
    const ultimo = c[c.length - 1]!;
    m = por(a, m).map((fila, i) =>
      fila.map((v, j) => v + (i === j ? ultimo : 0)),
    );
    c.push(-traza(por(a, m)) / k);
  }
  return c;
}

/**
 * La matriz longitudinal en ejes estabilidad, estado `[u, w, q, θ]`.
 *
 * La de cualquier libro de mecánica del vuelo para vuelo nivelado. El término
 * `Mẇ` se reparte por las filas de `q̇` porque `ẇ` no es una variable de
 * estado: hay que sustituirlo por su propia fila.
 */
export function matrizLongitudinal(): Matriz {
  const d = LONGITUDINAL_DIMENSIONAL;
  const U = CONDICION.velocidadPiesPorSegundo;
  return [
    [d.xU, d.xW, 0, -G_PIES],
    [d.zU, d.zW, U, 0],
    [d.mU + d.mWPunto * d.zU, d.mW + d.mWPunto * d.zW, d.mQ + d.mWPunto * U, 0],
    [0, 0, 1, 0],
  ];
}

/** Y la lateral, estado `[β, p, r, φ]`. Con `Ixz = 0` las primas no priman. */
export function matrizLateral(): Matriz {
  const d = LATERAL_DIMENSIONAL;
  const U = CONDICION.velocidadPiesPorSegundo;
  return [
    [d.yV, 0, -1, G_PIES / U],
    [d.lBeta, d.lP, d.lR, 0],
    [d.nBeta, d.nP, d.nR, 0],
    [0, 1, 0, 0],
  ];
}

/** Multiplica polinomios, que es lo único que hace falta para montar el otro lado. */
export function multiplicar(p: readonly number[], q: readonly number[]) {
  const r = Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (r[i + j] += a * b)));
  return r;
}

/** Un modo oscilatorio, como polinomio: `s² + 2ζωs + ω²`. */
export const comoPolinomio = (m: { omega: number; zeta: number }) => [
  1,
  2 * m.zeta * m.omega,
  m.omega * m.omega,
];

/**
 * Las raíces de un polinomio característico, como modos.
 *
 * Factoriza una cuártica en dos cuadráticas por Bairstow y devuelve cada una
 * como frecuencia y amortiguamiento. Un `zeta` de uno o más significa que esa
 * cuadrática no oscila: son dos raíces reales —la convergencia de alabeo y la
 * espiral, en el caso lateral— y entonces lo que vale son `raices`.
 *
 * **Se escribe aquí y no en una prueba porque aquí está lo que lo valida.** El
 * informe imprime los cinco modos del Navion, así que este buscador se puede
 * comprobar contra un avión de verdad antes de usarlo para medir los nuestros.
 * Un buscador de raíces sin validar es una forma elegante de inventarse la
 * dinámica de una flota entera.
 */
export interface Modo {
  readonly omega: number;
  readonly zeta: number;
  /** Las dos raíces reales, cuando no oscila. Vacío si es un par complejo. */
  readonly raices: readonly number[];
}

export function modosDe(p: readonly number[]): Modo[] {
  if (p.length !== 5) throw new Error("solo cuárticas");
  const [, a1, a2, a3, a4] = p as [number, number, number, number, number];
  // Bairstow: se busca el factor s² + us + v y el resto sale por división.
  let u = a1 / 2;
  let v = a2 / 2;
  for (let k = 0; k < 500; k++) {
    const b1 = a1 - u;
    const b2 = a2 - u * b1 - v;
    const b3 = a3 - u * b2 - v * b1;
    const b4 = a4 - u * b3 - v * b2;
    const c1 = b1 - u;
    const c2 = b2 - u * c1 - v;
    const c3 = b3 - u * c2 - v * c1;
    const det = c2 * c2 - c3 * c1;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-16) break;
    const du = (b3 * c2 - b4 * c1) / det;
    const dv = (b4 * c2 - b3 * c3) / det;
    u += du;
    v += dv;
    if (Math.abs(du) + Math.abs(dv) < 1e-12) break;
  }
  // El otro factor: el cociente de dividir por el primero.
  return [comoModo(u, v), comoModo(a1 - u, a4 / v)];
}

/** Una cuadrática `s² + us + v`, dicha como modo. */
function comoModo(u: number, v: number): Modo {
  const disc = u * u - 4 * v;
  if (disc >= 0) {
    // No oscila: dos raíces reales, y el amortiguamiento no significa nada.
    const r = Math.sqrt(disc);
    return {
      omega: Math.sqrt(Math.abs(v)),
      zeta: 1,
      raices: [(-u + r) / 2, (-u - r) / 2],
    };
  }
  const omega = Math.sqrt(v);
  return { omega, zeta: u / (2 * omega), raices: [] };
}

/**
 * Las derivadas dimensionales de una ficha nuestra, en SI y a esa velocidad.
 *
 * Es el puente entre `aircraft.ts` y la misma maquinaria que reproduce los
 * modos del Navion a la cuarta cifra: con esto, «¿cómo se comporta el JAZ 20?»
 * se contesta con la cuenta de un libro de mecánica del vuelo y no con una
 * opinión.
 *
 * Vuelo nivelado a un g, que es donde están definidas todas las velocidades de
 * un avión: de ahí sale el `CL` de equilibrio y, con él, la resistencia.
 *
 * ## Las dos derivadas que una ficha nuestra no tiene
 *
 * `Clr` y `Cnp` —alabeo por guiñada y guiñada por alabeo— no están en
 * `AeroCoefficients` porque el modelo de vuelo no las usa: son términos
 * cruzados que casi no se sienten pilotando. Pero el **balanceo holandés** sí
 * los usa, así que aquí se estiman con las aproximaciones de siempre para un
 * ala recta, `Clr ≈ CL/4` y `Cnp ≈ −CL/8`. Con los números del Navion dan
 * 0,10 y −0,05 contra sus 0,107 y −0,0575 medidos: un siete y un trece por
 * ciento, que para decir si un avión se bambolea o no es de sobra.
 */
export function derivadasDeLaFicha(
  a: {
    mass: number;
    wingArea: number;
    wingSpan: number;
    chord: number;
    inertia: { xx: number; yy: number; zz: number };
    aero: {
      clAlpha: number;
      cd0: number;
      oswald: number;
      cmAlpha: number;
      cmQ: number;
      cyBeta: number;
      clBeta: number;
      clP: number;
      cnBeta: number;
      cnR: number;
    };
  },
  velocidad: number,
) {
  const RHO = 1.225;
  const G = 9.81;
  const U = velocidad;
  const qS = 0.5 * RHO * U * U * a.wingArea;
  const { xx: Ix, yy: Iy, zz: Iz } = a.inertia;
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const pi = Math.PI * alargamiento * a.aero.oswald;
  /** El CL que hace falta para sostenerse a esta velocidad. */
  const cl = (2 * a.mass * G) / (RHO * U * U * a.wingArea);
  const cd = a.aero.cd0 + (cl * cl) / pi;
  /** Cómo crece la resistencia con el ángulo de ataque, por la inducida. */
  const cdAlfa = ((2 * cl) / pi) * a.aero.clAlpha;
  const clR = cl / 4;
  const cnP = -cl / 8;
  const porEnvergadura = a.wingSpan / (2 * U);
  return {
    U,
    cl,
    cd,
    longitudinal: [
      [
        (-2 * cd * qS) / (a.mass * U),
        ((cl - cdAlfa) * qS) / (a.mass * U),
        0,
        -G,
      ],
      [
        (-2 * cl * qS) / (a.mass * U),
        (-(a.aero.clAlpha + cd) * qS) / (a.mass * U),
        U,
        0,
      ],
      [
        0,
        (a.aero.cmAlpha * qS * a.chord) / (Iy * U),
        (a.aero.cmQ * (a.chord / (2 * U)) * qS * a.chord) / Iy,
        0,
      ],
      [0, 0, 1, 0],
    ] as const,
    lateral: [
      [(a.aero.cyBeta * qS) / (a.mass * U), 0, -1, G / U],
      [
        (a.aero.clBeta * qS * a.wingSpan) / Ix,
        (a.aero.clP * porEnvergadura * qS * a.wingSpan) / Ix,
        (clR * porEnvergadura * qS * a.wingSpan) / Ix,
        0,
      ],
      [
        (a.aero.cnBeta * qS * a.wingSpan) / Iz,
        (cnP * porEnvergadura * qS * a.wingSpan) / Iz,
        (a.aero.cnR * porEnvergadura * qS * a.wingSpan) / Iz,
        0,
      ],
      [0, 1, 0, 0],
    ] as const,
  };
}
