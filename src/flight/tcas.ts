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
 * ## Y la maniobra: el RA, solo en el TCAS II
 *
 * El TCAS II, además del aviso, da **la maniobra**, el aviso de resolución:
 * «climb, climb», «descend, descend». Un RA de verdad son tres cosas a la vez,
 * y sin cualquiera de ellas se enseñaría una orden a medias:
 *
 * - **El cuadrado rojo** en la carta, en el sitio del que obliga a apartarse.
 *   Ver `Clase` y `ui/carta.ts`.
 * - **La franja roja y verde del variómetro**: lo rojo, los ritmos que no se
 *   pueden volar; lo verde, a dónde hay que llevar la aguja. Ver `Franja`.
 * - **La voz de la caja**, en los cuatro peldaños y en el instante en que pasa,
 *   y detrás la instructora en los tres de abajo. Eso lo reparte el juego;
 *   aquí se decide qué orden toca. Ver `Game.ordenDelTcas`.
 *
 * Cómo se decide, con las cuentas publicadas y no con unas parecidas:
 *
 * - **Cuándo**: las mismas dos pruebas del aviso de tráfico con los umbrales
 *   del RA, más cortos, y el filtro de la distancia de cruce. Ver
 *   `pideResolucion`.
 * - **Hacia dónde**: se ensayan las dos maniobras —subir y bajar a mil
 *   quinientos pies por minuto, empezando a los cinco segundos con un cuarto
 *   de g— y se elige la que deja más separación en el punto de máximo
 *   acercamiento, prefiriendo la que no cruza la altura del otro. Ver
 *   `elegirSentido`.
 * - **Cuánto**: si con lo que ya se hace basta, se pide que no se cambie
 *   —«monitor vertical speed»—; si basta con nivelar, «level off»; si ya se
 *   sube o se baja a mil quinientos o más, que no se afloje —«maintain
 *   vertical speed, maintain»—; y si no, subir o bajar. Y si el sentido pasa
 *   por la altura del otro, la orden lo dice: «climb, crossing climb». Ver
 *   `ordenPara`.
 * - **Y lo que cambia por el camino**: si el otro maniobra hacia nosotros y lo
 *   pedido ya no basta, se refuerza —una preventiva pasa a «climb, climb»;
 *   una de subir, a «increase climb», a dos mil quinientos— o, si ni así, se
 *   invierte una vez —«climb, climb NOW»—. Ver `reforzarOInvertir`.
 * - **Y cuándo se acaba**: al quedar asegurada la separación, la orden de
 *   subir o bajar se afloja a nivelar, y al alejarse el otro, «clear of
 *   conflict». Ver `Tcas.resolver`.
 *
 * Los anuncios y sus franjas son los de las tablas 3 y 4 del folleto de la
 * FAA, leídas en el documento; la inversión a mil quinientos y en dos segundos
 * y medio, del folleto de EUROCONTROL *TCAS II version 7.1 — Overview for
 * pilots* (2012) y de su *ACAS II Bulletin* 13, *Reversing to resolve* (2011),
 * leído en la copia de IFALPA (12ATSBL05). Lo que no está en ellos va marcado
 * «por verificar» donde se usa.
 *
 * Lo que este RA **no** hace, y queda escrito en `PENDIENTE-VOCES-cabina-2.md`:
 *
 * - **Coordinarse con el TCAS del otro.** Dos TCAS II se reparten los sentidos
 *   por el enlace Mode S, y el otro maniobra al revés que tú. Aquí el tráfico
 *   no lleva TCAS ni maniobra por él: su vuelo lo lleva `world/trafico.ts`, y
 *   una orden coordinada que el otro no cumple enseñaría algo falso.
 * - **Más de un tráfico a la vez.** Un RA contra un solo tráfico, que es casi
 *   todo RA de verdad: si aparece un segundo con el primero puesto, se le
 *   avisa de tráfico y se espera. Las órdenes de varios —«don't climb» y
 *   «don't descend» juntas— piden otra franja y otra tarjeta.
 * - **Volver a reforzar una aflojada.** Una de subir aflojada a «level off» se
 *   queda así hasta el final, aunque el otro vuelva a acercarse.
 *
 * El TCAS I del turbohélice no tiene nada de esto: solo avisa.
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
 *   tráfico en cualquier cabina, porque el suelo no se aparta. Y no hay
 *   maniobra: el TCAS se pasa solo a TA ONLY mientras suena el del suelo, y un
 *   RA puesto se retira sin decir nada (de memoria, por verificar: la prioridad
 *   del avisador de terreno sobre el TCAS sí está en el folleto de la FAA; el
 *   paso automático a TA ONLY, en la documentación de cada fabricante).
 * - **El RA, por debajo de mil pies sobre el suelo**, no existe: en el
 *   escalón 2 de la tabla no hay umbrales de RA. Y por debajo de mil cien no
 *   se pide bajar. Ver `SIN_RA_POR_DEBAJO` y `SIN_BAJAR_POR_DEBAJO`.
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
 * Y como uno de verdad, el selector va por pasos: **TA ONLY** en el punto de
 * espera, que avisa y no da maniobras, y **TA/RA** al entrar en la pista, que
 * es cuando se pasa en cualquier cabina de línea. En TA/RA la pantalla no
 * escribe nada del modo: es el normal. Ver `Propio.resuelve` y
 * `Game.vigilarElTrafico`.
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
 * **Si este equipo da la maniobra**, el RA. Solo el TCAS II: el TCAS I no
 * tiene otro modo que avisar. Ver la cabecera.
 */
export function daLaManiobra(equipo: EquipoTcas | null): boolean {
  return equipo === "TCAS II";
}

/**
 * Los umbrales del aviso de resolución en un escalón.
 *
 * Son los de la columna del RA de la tabla 2 del folleto de la FAA, más el
 * filtro de la distancia de cruce, `hmd`, que entró en la versión 7 para no
 * dar maniobras contra quien va a pasar de lado. Las seis filas, comprobadas
 * contra su copia en la tabla 1 de Muñoz, Narkawicz y Chamberlain, *A TCAS-II
 * Resolution Advisory Detection Algorithm* (NASA, AIAA GNC 2013), que es la
 * que trae también la columna del HMD.
 */
export interface UmbralesDeResolucion {
  /** Segundos de tau por debajo de los cuales hay maniobra. */
  readonly tau: number;
  /** La distancia que pide maniobra sola, NM. */
  readonly dmod: number;
  /** La diferencia de altura que la pide sola, ft. */
  readonly zthr: number;
  /** La separación vertical que busca la maniobra, ft. */
  readonly alim: number;
  /** A qué distancia horizontal de cruce, o menos, sigue habiendo maniobra, ft. */
  readonly hmd: number;
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
  /**
   * Y los del RA, o `null` en el escalón 2: pegado al suelo no hay maniobra.
   * Ver `UmbralesDeResolucion`.
   */
  readonly ra: UmbralesDeResolucion | null;
}

/**
 * Qué escalón toca a esta altura.
 *
 * La tabla 2 del folleto de la FAA, columnas del TA y del RA; ver
 * `UmbralesDeResolucion` para la del RA y de dónde sale el HMD. Los dos
 * primeros tramos van **sobre el suelo** —por radioaltímetro, que es lo que
 * importa cerca del terreno— y el resto sobre el mar, por altímetro. Cuanto
 * más alto, más segundos: arriba se va más deprisa y el mismo susto llega
 * antes. Y más separación buscada: el altímetro de arriba yerra más.
 */
export function sensibilidad(
  altitudPies: number,
  sobreElSueloPies: number,
): Sensibilidad {
  if (sobreElSueloPies < 1000)
    return { nivel: 2, tau: 20, dmod: 0.3, zthr: 850, ra: null };
  if (sobreElSueloPies < 2350)
    return {
      nivel: 3,
      tau: 25,
      dmod: 0.33,
      zthr: 850,
      ra: { tau: 15, dmod: 0.2, zthr: 600, alim: 300, hmd: 1215 },
    };
  if (altitudPies < 5000)
    return {
      nivel: 4,
      tau: 30,
      dmod: 0.48,
      zthr: 850,
      ra: { tau: 20, dmod: 0.35, zthr: 600, alim: 300, hmd: 2126 },
    };
  if (altitudPies < 10000)
    return {
      nivel: 5,
      tau: 40,
      dmod: 0.75,
      zthr: 850,
      ra: { tau: 25, dmod: 0.55, zthr: 600, alim: 350, hmd: 3342 },
    };
  if (altitudPies < 20000)
    return {
      nivel: 6,
      tau: 45,
      dmod: 1.0,
      zthr: 850,
      ra: { tau: 30, dmod: 0.8, zthr: 600, alim: 400, hmd: 4861 },
    };
  if (altitudPies < 42000)
    return {
      nivel: 7,
      tau: 48,
      dmod: 1.3,
      zthr: 850,
      ra: { tau: 35, dmod: 1.1, zthr: 700, alim: 600, hmd: 6683 },
    };
  return {
    nivel: 7,
    tau: 48,
    dmod: 1.3,
    zthr: 1200,
    ra: { tau: 35, dmod: 1.1, zthr: 800, alim: 700, hmd: 6683 },
  };
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

/** Lo que el TCAS sabe de un tráfico para el RA: lo del aviso y por dónde cruzará. */
export interface GeometriaDeResolucion extends Geometria {
  /** A qué distancia horizontal se cruzarán si nadie cambia nada, ft. */
  readonly hmd: number;
}

/**
 * ¿Pide esta geometría una maniobra?
 *
 * Las dos pruebas de `pideAviso` con los umbrales del RA, y en la de
 * distancia, además, **el filtro de la distancia de cruce**: el que se acerca
 * deprisa pero va a pasar de lado a más de `hmd` no pide maniobra, que una
 * orden de subir contra quien pasa a una milla enseñaría a desconfiar de la
 * caja. Es la forma de Muñoz y otros (2013), la misma de `pideAviso`.
 */
export function pideResolucion(
  u: UmbralesDeResolucion,
  g: GeometriaDeResolucion,
): boolean {
  const { r, rPunto, a, aPunto, hmd } = g;
  const enDistancia =
    r <= u.dmod ||
    (rPunto < 0 &&
      -(r * r - u.dmod * u.dmod) / (r * rPunto) <= u.tau &&
      hmd <= u.hmd);
  const enAltura =
    Math.abs(a) <= u.zthr || (a * aPunto < 0 && -a / aPunto <= u.tau);
  return enDistancia && enAltura;
}

/**
 * **A qué distancia horizontal se cruzarán**, si los dos siguen como van: la
 * menor de aquí en adelante. `dx`, `dz` es dónde está el otro respecto a mí y
 * `vx`, `vz` cómo cambia; sale en las unidades de entrada.
 */
export function distanciaDeCruce(
  dx: number,
  dz: number,
  vx: number,
  vz: number,
): number {
  const v2 = vx * vx + vz * vz;
  if (v2 < 1e-9) return Math.hypot(dx, dz);
  const t = Math.max(0, -(dx * vx + dz * vz) / v2);
  return Math.hypot(dx + vx * t, dz + vz * t);
}

/** Hacia dónde aparta la maniobra: subiendo o bajando. */
export type Sentido = "sube" | "baja";

/**
 * **Lo que pide la maniobra**, con el nombre de la voz que lo dice. Los
 * anuncios son los de la versión 7.1 en la tabla 4 del folleto de la FAA, y
 * los ritmos, los de su tabla 3:
 *
 * - `climb`, `descend`: subir o bajar a mil quinientos pies por minuto, con lo
 *   verde hasta dos mil. «Climb, climb»; «descend, descend».
 * - `crossingClimb`, `crossingDescend`: lo mismo, pero el sentido pasa por la
 *   altura del otro. «Climb, crossing climb; climb, crossing climb»: la
 *   palabra solo avisa de que se va a cruzar su altura, y se vuela igual. Ver
 *   `cruzaSuAltura`.
 * - `maintain`, `crossingMaintain`: ya se sube o se baja a mil quinientos o
 *   más y basta con no aflojar, con lo verde hasta cuatro mil cuatrocientos.
 *   «Maintain vertical speed, maintain», igual en los dos sentidos, y
 *   «maintain vertical speed, crossing maintain» si se cruza su altura.
 * - `increaseClimb`, `increaseDescent`: **el refuerzo**, a dos mil quinientos.
 *   «Increase climb, increase climb». Solo detrás de una de subir o bajar.
 * - `climbNow`, `descendNow`: **la inversión**, el sentido al revés a mil
 *   quinientos, una vez por encuentro. «Climb, climb NOW; climb, climb NOW».
 * - `levelOff`: dejar de subir o de bajar, a cero. Es la de la versión 7.1, que
 *   sustituyó a «adjust vertical speed» porque se respondía subiendo más; sale
 *   de entrada o al aflojar una de subir o bajar (EUROCONTROL, *TCAS II
 *   version 7.1 — Overview for pilots*, 2012).
 * - `monitor`: con lo que se hace ya basta, y lo que se pide es no meterse en
 *   lo rojo. Es la maniobra preventiva: no pide mover nada.
 */
export type Orden =
  | "climb"
  | "descend"
  | "crossingClimb"
  | "crossingDescend"
  | "maintain"
  | "crossingMaintain"
  | "increaseClimb"
  | "increaseDescent"
  | "climbNow"
  | "descendNow"
  | "levelOff"
  | "monitor";

/**
 * Si la orden pide subir o bajar —es **positiva**, en la palabra del
 * folleto—, y no solo quedarse fuera de lo rojo.
 */
export function esPositiva(orden: Orden): boolean {
  return orden !== "levelOff" && orden !== "monitor";
}

/** Si es de las que vienen detrás, con su respuesta más corta. Ver `RESPUESTA_A_LA_SEGUNDA`. */
function esDeLasDeDetras(orden: Orden): boolean {
  return (
    orden === "increaseClimb" ||
    orden === "increaseDescent" ||
    orden === "climbNow" ||
    orden === "descendNow"
  );
}

/**
 * **El ritmo que pide la orden**, en pies por minuto y sin signo: el que se
 * escribe en la tarjeta. `null` en las que no piden uno —mantener lo que se
 * lleva, o quedarse fuera de lo rojo—.
 */
export function ritmoQuePide(orden: Orden): number | null {
  if (orden === "increaseClimb" || orden === "increaseDescent") return RITMO_DEL_REFUERZO;
  if (orden === "maintain" || orden === "crossingMaintain" || orden === "monitor") return null;
  if (orden === "levelOff") return 0;
  return RITMO_DE_LA_MANIOBRA;
}

/**
 * **La franja del variómetro**, en pies por minuto: lo rojo, los ritmos que no
 * se pueden volar; lo verde, a dónde hay que llevar la aguja, o `null` si no
 * se pide ir a ninguna parte. Lo que se sale del variómetro se recorta al
 * pintarlo. Ver `variometro` en `ui/cristal.ts`.
 */
export interface Franja {
  readonly rojo: readonly (readonly [number, number])[];
  readonly verde: readonly [number, number] | null;
}

/** Un aviso de resolución puesto: contra quién, hacia dónde y qué se pide. */
export interface Resolucion {
  /** El tráfico del que se aparta. */
  readonly id: string;
  readonly sentido: Sentido;
  readonly orden: Orden;
  readonly franja: Franja;
}

/** Lo que cambia del RA en un paso. Ver `Tcas.cambiosDelRa`. */
export interface CambioDelRa {
  /**
   * `orden`: una nueva, de entrada, al aflojar, al reforzar o al invertir.
   * `libre`: el otro ya se aleja,
   * «clear of conflict». `retirada`: se quita sin decir nada, porque el TCAS
   * deja de dar maniobras —por debajo de mil pies, con el terreno avisando, el
   * otro posado o perdido—.
   */
  readonly que: "orden" | "libre" | "retirada";
  /** La que hay ahora, o la que había si se acabó. */
  readonly resolucion: Resolucion;
}

/**
 * **El piloto que ensaya el TCAS**: empieza a maniobrar a los cinco segundos,
 * con un cuarto de g, hasta mil quinientos pies por minuto. Es la respuesta
 * que el algoritmo da por supuesta para elegir el sentido y la que se espera
 * de quien vuela: el manual ACAS de la OACI (Doc 9863) y la circular de la FAA
 * AC 20-151C, comprobados en las dos.
 */
export const RESPUESTA = 5;
/** Un cuarto de g, ft/s². */
const ACELERACION = (0.25 * 9.80665) / PIE;
/** Lo que se pide al subir o al bajar, ft/min. Ver `RESPUESTA`. */
export const RITMO_DE_LA_MANIOBRA = 1500;
const RITMO = RITMO_DE_LA_MANIOBRA / 60;

/**
 * **Y las que vienen detrás** —el refuerzo y la inversión— se esperan antes y
 * más fuertes: a los dos segundos y medio, con 0,35 g. Folleto de la FAA, en
 * la nota de la versión 7.0 («0.35 g … within 2.5 seconds for subsequent
 * RAs») y en lo que se espera del piloto («1/3 g within 2 1/2 seconds», para
 * «an increase or reversal RA»).
 */
export const RESPUESTA_A_LA_SEGUNDA = 2.5;
const ACELERACION_A_LA_SEGUNDA = (0.35 * 9.80665) / PIE;

/**
 * El ritmo del refuerzo, ft/min: dos mil quinientos. El folleto de la FAA lo
 * pone en su figura 19 —de los mil quinientos de «descend» a dos mil
 * quinientos— y el boletín 13 de EUROCONTROL, en su tercer suceso.
 */
export const RITMO_DEL_REFUERZO = 2500;

/**
 * Hasta dónde llega lo verde de mantener, ft/min: cuatro mil cuatrocientos.
 * Es el tope de la tabla 3 para «maintain climb» y «maintain descend», y el
 * folleto lo explica: hay variómetros que no pintan más, así que la versión
 * 7.0 no da ninguna de mantener por encima y ensaya el menor de los dos, el
 * ritmo propio o éste.
 */
export const TOPE_DE_MANTENER = 4400;

/**
 * Por debajo de esto, sobre el suelo, no se refuerza la bajada, ft: mil
 * cuatrocientos cincuenta. Folleto de la FAA, junto a los mil cien de no
 * pedir bajar y los mil de no dar RA.
 */
export const SIN_REFUERZO_DE_BAJADA_POR_DEBAJO = 1450;

/**
 * **Desde cuánto se cruza su altura**, ft: la orden de subir es *crossing* si
 * ahora se va al menos cien pies por debajo del otro, y la de bajar, cien por
 * encima. El folleto de la FAA solo dice que el sentido pasa por la altura del
 * otro; los cien pies son la definición de RA de cruce del Anexo 10 de la
 * OACI, volumen IV, **de memoria y por verificar**. Ver `cruzaSuAltura`.
 */
export const CRUZA_DESDE = 100;

/**
 * Por debajo de esto, sobre el suelo, no hay RA, ft. Mil, con cien de
 * tolerancia (EUROCONTROL, en SKYbrary, *TCAS II RA at Very Low Altitude*).
 * Uno puesto se aguanta hasta `SE_RETIRA_POR_DEBAJO`, que es esa tolerancia:
 * así no entra y sale volando justo por la raya.
 */
export const SIN_RA_POR_DEBAJO = 1000;
const SE_RETIRA_POR_DEBAJO = 900;

/**
 * Y por debajo de esto no se pide bajar, ft: mil cien, con cien de tolerancia
 * (la misma fuente). Uno de bajar que cruza esta raya se afloja a nivelar, que
 * es lo que dice esa nota con las palabras de la versión 7.0 —«adjust
 * vertical speed»— y lo que es en la 7.1.
 */
export const SIN_BAJAR_POR_DEBAJO = 1100;

/**
 * **Lo que se ha movido en vertical en `t` segundos** quien empieza a
 * `vo` ft/s y, pasados `retardo` segundos —`RESPUESTA` si no se dice—,
 * acelera con `aceleracion` —un cuarto de g— hasta `objetivo` ft/s. ft.
 */
export function desplazamientoConManiobra(
  vo: number,
  objetivo: number,
  t: number,
  retardo = RESPUESTA,
  aceleracion = ACELERACION,
): number {
  const antes = Math.min(t, Math.max(0, retardo));
  const d = vo * antes;
  const resto = t - antes;
  if (resto <= 0) return d;
  const dv = objetivo - vo;
  const s = Math.sign(dv);
  const acelerando = Math.abs(dv) / aceleracion;
  if (resto <= acelerando)
    return d + vo * resto + 0.5 * s * aceleracion * resto * resto;
  return (
    d +
    vo * acelerando +
    0.5 * s * aceleracion * acelerando * acelerando +
    objetivo * (resto - acelerando)
  );
}

/**
 * **Cuánto queda entre los dos al máximo acercamiento**, del lado de la
 * maniobra, ft: positivo si se queda donde se quería —por encima del otro al
 * subir, por debajo al bajar—, negativo si no. Con el piloto de
 * `desplazamientoConManiobra` y el otro siguiendo como va.
 *
 * `a` es su altura menos la mía; `vo`, `vi` y `objetivo`, ft/s; `t`, los
 * segundos hasta el máximo acercamiento.
 */
export function separacionAlCruce(
  sentido: Sentido,
  a: number,
  vo: number,
  vi: number,
  t: number,
  objetivo: number,
  retardo = RESPUESTA,
  aceleracion = ACELERACION,
): number {
  const mio = desplazamientoConManiobra(vo, objetivo, t, retardo, aceleracion);
  const suyo = a + vi * t;
  return sentido === "sube" ? mio - suyo : suyo - mio;
}

/**
 * El ritmo que se ensaya para elegir el sentido, ft/s: mil quinientos, o el
 * que ya se lleve si es más, hasta el tope de mantener. Ver `TOPE_DE_MANTENER`.
 */
function ritmoEnsayado(sentido: Sentido, vo: number): number {
  const tope = TOPE_DE_MANTENER / 60;
  return sentido === "sube"
    ? Math.min(Math.max(vo, RITMO), tope)
    : Math.max(Math.min(vo, -RITMO), -tope);
}

/**
 * **Si ese sentido pasa por la altura del otro**: subir con él por encima, o
 * bajar con él por debajo, por al menos `CRUZA_DESDE`.
 */
export function cruzaSuAltura(sentido: Sentido, a: number): boolean {
  return sentido === "sube" ? a >= CRUZA_DESDE : a <= -CRUZA_DESDE;
}

/**
 * **Hacia dónde apartarse.**
 *
 * Se ensayan las dos maniobras con el piloto de `RESPUESTA` —quien ya sube o
 * baja más deprisa que eso sigue a su ritmo— y el otro siguiendo como va, y
 * se mira cuánto queda entre los dos en el punto de máximo acercamiento:
 * gana la que deja más. **Salvo que la que no cruza su altura ya llegue a
 * ALIM**, que entonces gana ella aunque la otra deje más: cruzar la altura de
 * un avión que se acerca es lo último que se le pide a nadie. Está así en el
 * folleto de la FAA, comprobado: «If the non-altitude crossing sense provides
 * at least ALIM feet of separation at CPA, this sense will be selected even if
 * the altitude crossing sense provides greater separation». Y pegado al
 * suelo, nunca bajar. Ver `SIN_BAJAR_POR_DEBAJO`.
 *
 * `a` es su altura menos la mía, ft; `vo` y `vi` los ritmos, mío y suyo,
 * ft/s; `t`, los segundos hasta el máximo acercamiento.
 */
export function elegirSentido(
  a: number,
  vo: number,
  vi: number,
  t: number,
  alim: number,
  sobreElSueloPies: number,
): Sentido {
  if (sobreElSueloPies < SIN_BAJAR_POR_DEBAJO) return "sube";
  const subiendo = separacionAlCruce("sube", a, vo, vi, t, ritmoEnsayado("sube", vo));
  const bajando = separacionAlCruce("baja", a, vo, vi, t, ritmoEnsayado("baja", vo));
  // Subir cruza si el otro está por encima; bajar, si está por debajo.
  const sinCruzar: Sentido | null = a > 0 ? "baja" : a < 0 ? "sube" : null;
  if (sinCruzar && (sinCruzar === "sube" ? subiendo : bajando) >= alim)
    return sinCruzar;
  return subiendo >= bajando ? "sube" : "baja";
}

/**
 * **El ritmo propio que basta**, sin maniobrar, para que al máximo
 * acercamiento queden `alim` pies en ese sentido: el mínimo subiendo, el
 * máximo bajando. ft/s.
 */
export function ritmoQueBasta(
  sentido: Sentido,
  a: number,
  vi: number,
  t: number,
  alim: number,
): number {
  return sentido === "sube" ? vi + (alim + a) / t : vi - (alim - a) / t;
}

/**
 * Los límites de la maniobra preventiva, ft/min: no bajar —o no subir— más
 * deprisa que esto. Son los de «do not descend» y «do not climb» de la tabla 3
 * del folleto de la FAA: cero, quinientos, mil y dos mil, comprobados.
 */
const LIMITES_PREVENTIVOS = [2000, 1000, 500, 0] as const;

/** Lo que se sale del variómetro, ft/min: el rojo «hasta el fondo». */
const FONDO = 9999;

/**
 * Lo verde de mil quinientos a dos mil al subir o bajar, que es lo de la
 * tabla 3 del folleto de la FAA para «climb» y «crossing climb», comprobado;
 * y de cero a doscientos hacia el lado que aparta al nivelar: el folleto de
 * EUROCONTROL solo dice «0 ft/min» y advierte de que sus pantallas son
 * genéricas, así que el ancho es de presentación.
 */
const VERDE_HASTA = 2000;
const VERDE_AL_NIVELAR = 200;

/**
 * Y lo verde del refuerzo, de dos mil quinientos a tres mil. Los dos mil
 * quinientos están en el folleto de la FAA; **el tope de arriba no** —la
 * tabla 3 es solo de las órdenes de entrada—, así que es de presentación, el
 * mismo ancho que el de subir, y **por verificar**.
 */
const VERDE_DEL_REFUERZO_HASTA = 3000;

/**
 * **Qué se pide, y con qué franja**, para ese sentido.
 *
 * `vo` es mi ritmo de ahora y `basta` el de `ritmoQueBasta`, los dos en ft/s:
 *
 * - Si para apartarse basta con no bajar —o con bajar menos—, y con lo que se
 *   hace ya basta: `monitor`, con lo rojo desde el límite preventivo más
 *   holgado que sigue bastando.
 * - Si basta con no bajar pero ahora se baja de más: `levelOff`, a cero.
 * - Si hace falta subir y ya se sube a mil quinientos o más: `maintain`, que
 *   no se afloje. Es la que hay en la tabla 3 para quien ya va así; pedirle
 *   «climb» con lo verde hasta dos mil a quien sube a tres mil sería pedirle
 *   que subiera menos.
 * - Y si hace falta subir: `climb`, a mil quinientos.
 *
 * Y si subir pasa por la altura del otro —`cruza`, ver `cruzaSuAltura`—, las
 * dos de subir son las de *crossing*. Bajando, todo lo mismo del revés.
 */
export function ordenPara(
  sentido: Sentido,
  vo: number,
  basta: number,
  cruza = false,
): { readonly orden: Orden; readonly franja: Franja } {
  const s = sentido === "sube" ? 1 : -1;
  // Todo en «hacia arriba» del sentido: subiendo como viene, bajando del revés.
  const voF = s * vo * 60;
  const bastaF = s * basta * 60;
  if (bastaF <= 0) {
    const limite = -(LIMITES_PREVENTIVOS.find((l) => -l >= bastaF) ?? 0);
    if (voF >= limite)
      return {
        orden: "monitor",
        franja: { rojo: [tramoDelSentido(s, -FONDO, limite)], verde: null },
      };
    return { orden: "levelOff", franja: franjaAlNivelar(sentido) };
  }
  if (voF >= RITMO_DE_LA_MANIOBRA)
    return { orden: cruza ? "crossingMaintain" : "maintain", franja: franjaDe("maintain", sentido) };
  const orden: Orden =
    sentido === "sube"
      ? cruza
        ? "crossingClimb"
        : "climb"
      : cruza
        ? "crossingDescend"
        : "descend";
  return { orden, franja: franjaDe(orden, sentido) };
}

/**
 * **La franja de una orden positiva** —las de subir o bajar, mantener,
 * reforzar e invertir— en su sentido: lo rojo hasta el ritmo que se pide y lo
 * verde de ahí hasta su tope. Las de nivelar y la preventiva llevan la suya:
 * ver `franjaAlNivelar` y `ordenPara`.
 */
export function franjaDe(orden: Orden, sentido: Sentido): Franja {
  const s = sentido === "sube" ? 1 : -1;
  if (orden === "levelOff") return franjaAlNivelar(sentido);
  const [desde, hasta] =
    orden === "increaseClimb" || orden === "increaseDescent"
      ? [RITMO_DEL_REFUERZO, VERDE_DEL_REFUERZO_HASTA]
      : orden === "maintain" || orden === "crossingMaintain"
        ? [RITMO_DE_LA_MANIOBRA, TOPE_DE_MANTENER]
        : [RITMO_DE_LA_MANIOBRA, VERDE_HASTA];
  return {
    rojo: [tramoDelSentido(s, -FONDO, desde)],
    verde: tramoDelSentido(s, desde, hasta),
  };
}

/** Un tramo escrito «hacia arriba» del sentido, puesto en el variómetro. */
function tramoDelSentido(
  s: 1 | -1,
  desde: number,
  hasta: number,
): [number, number] {
  return s > 0 ? [desde, hasta] : [-hasta, -desde];
}

/** La franja de nivelar en ese sentido: rojo hacia el otro, verde en el cero. */
export function franjaAlNivelar(sentido: Sentido): Franja {
  const s = sentido === "sube" ? 1 : -1;
  return {
    rojo: [tramoDelSentido(s, -FONDO, 0)],
    verde: tramoDelSentido(s, 0, VERDE_AL_NIVELAR),
  };
}

/** Lo que hace falta saber para reforzar o invertir una orden puesta. */
export interface OrdenPuesta {
  readonly orden: Orden;
  readonly sentido: Sentido;
  /** Su altura menos la mía, ft. */
  readonly a: number;
  /** Mi ritmo y el suyo, ft/s. */
  readonly vo: number;
  readonly vi: number;
  /** Segundos hasta el máximo acercamiento. */
  readonly t: number;
  /** La separación que se busca, ft. Ver `UmbralesDeResolucion`. */
  readonly alim: number;
  /** Radioaltímetro, ft. */
  readonly sobreElSuelo: number;
  /** Segundos desde que se dio la orden puesta. */
  readonly desdeLaOrden: number;
  /** Si ya se invirtió una vez en este encuentro. */
  readonly invertida: boolean;
}

/**
 * **Si lo pedido ya no basta, qué se pide ahora**: el refuerzo, la inversión
 * o nada.
 *
 * Es lo de *Strengthening Advisories* y *Sense Reversals* del folleto de la
 * FAA: si el otro maniobra de forma que lo pedido deja de dar ALIM al máximo
 * acercamiento, una de subir o bajar se refuerza a dos mil quinientos o se
 * invierte. Aquí, en este orden:
 *
 * 1. **Si lo pedido basta**, nada. Se ensaya como lo ensaya el TCAS: con el
 *    piloto que todavía no ha tenido tiempo de responder respondiendo a su
 *    hora, y con el que ya lo tuvo, desde lo que hace ahora.
 * 2. **Si reforzar basta, se refuerza.** Solo una de subir o bajar —«an
 *    Increase Climb/Descent RA can only be issued after a Climb/Descend RA»—,
 *    una vez, y la de bajar no por debajo de `SIN_REFUERZO_DE_BAJADA_POR_DEBAJO`.
 *    Detrás de «maintain» también: es de subir o bajar, pero el folleto no lo
 *    nombra, **por verificar**.
 * 3. **Si no, y el sentido contrario basta, se invierte**: a mil quinientos,
 *    una sola vez por encuentro —«only one sense reversal can occur per
 *    conflict», boletín 13—, y nunca hacia abajo por debajo de
 *    `SIN_BAJAR_POR_DEBAJO`. La inversión no dice *crossing*: su anuncio es
 *    otro, «climb, climb NOW».
 * 4. **Y si nada basta, se refuerza igual** si deja más que lo de ahora: lo
 *    mejor que hay, aunque no llegue.
 *
 * Lo de la versión 7.1 que reconoce «la persecución vertical» —los dos a menos
 * de cien pies, uno sin responder— cae dentro del paso 3: el otro bajando
 * contigo hace que bajar no baste y subir sí.
 *
 * Y también refuerza si quien no responde es uno mismo: lo pedido, ensayado
 * desde lo que se hace ahora, deja de bastar. El folleto solo nombra al otro
 * que maniobra; que el TCAS lo haga igual con el propio piloto quieto queda
 * **por verificar**.
 *
 * Las preventivas de entrada —«monitor vertical speed», «level off»— no se
 * refuerzan a dos mil quinientos: pasan a la de subir o bajar. Ver dentro.
 */
export function reforzarOInvertir(
  p: OrdenPuesta,
): { readonly orden: Orden; readonly sentido: Sentido } | null {
  const s = p.sentido === "sube" ? 1 : -1;
  if (!esPositiva(p.orden)) {
    /*
     * **Una preventiva que deja de bastar pasa a ser de subir o bajar**, en su
     * sentido: «A VSL is strengthened by changing to a more restrictive VSL or
     * to a positive Climb or Descend RA», en el folleto de la FAA. Aquí, sin
     * el paso por una más estrecha: directamente a la positiva, la que daría
     * `ordenPara` ahora. Y la de bajar, no pegado al suelo.
     */
    const ahora = separacionAlCruce(
      p.sentido,
      p.a,
      p.vo,
      p.vi,
      p.t,
      p.orden === "levelOff" ? 0 : p.vo,
      RESPUESTA - p.desdeLaOrden,
    );
    if (ahora >= p.alim) return null;
    if (p.sentido === "baja" && p.sobreElSuelo < SIN_BAJAR_POR_DEBAJO) return null;
    const basta = Math.max(1, s * ritmoQueBasta(p.sentido, p.a, p.vi, p.t, p.alim)) * s;
    const { orden } = ordenPara(p.sentido, p.vo, basta, cruzaSuAltura(p.sentido, p.a));
    return { orden, sentido: p.sentido };
  }
  const deDetras = esDeLasDeDetras(p.orden);
  const objetivo =
    p.orden === "increaseClimb" || p.orden === "increaseDescent"
      ? (s * RITMO_DEL_REFUERZO) / 60
      : p.orden === "maintain" || p.orden === "crossingMaintain"
        ? ritmoEnsayado(p.sentido, p.vo)
        : (s * RITMO_DE_LA_MANIOBRA) / 60;
  const ahora = separacionAlCruce(
    p.sentido,
    p.a,
    p.vo,
    p.vi,
    p.t,
    objetivo,
    (deDetras ? RESPUESTA_A_LA_SEGUNDA : RESPUESTA) - p.desdeLaOrden,
    deDetras ? ACELERACION_A_LA_SEGUNDA : ACELERACION,
  );
  if (ahora >= p.alim) return null;
  const yaReforzada = p.orden === "increaseClimb" || p.orden === "increaseDescent";
  const reforzada =
    !yaReforzada && (p.sentido === "sube" || p.sobreElSuelo >= SIN_REFUERZO_DE_BAJADA_POR_DEBAJO)
      ? separacionAlCruce(
          p.sentido,
          p.a,
          p.vo,
          p.vi,
          p.t,
          (s * RITMO_DEL_REFUERZO) / 60,
          RESPUESTA_A_LA_SEGUNDA,
          ACELERACION_A_LA_SEGUNDA,
        )
      : null;
  const reforzar = {
    orden: (p.sentido === "sube" ? "increaseClimb" : "increaseDescent") as Orden,
    sentido: p.sentido,
  };
  if (reforzada !== null && reforzada >= p.alim) return reforzar;
  const otro: Sentido = p.sentido === "sube" ? "baja" : "sube";
  const invertida =
    !p.invertida && (otro === "sube" || p.sobreElSuelo >= SIN_BAJAR_POR_DEBAJO)
      ? separacionAlCruce(
          otro,
          p.a,
          p.vo,
          p.vi,
          p.t,
          (-s * RITMO_DE_LA_MANIOBRA) / 60,
          RESPUESTA_A_LA_SEGUNDA,
          ACELERACION_A_LA_SEGUNDA,
        )
      : null;
  if (invertida !== null && invertida >= p.alim)
    return { orden: otro === "sube" ? "climbNow" : "descendNow", sentido: otro };
  if (reforzada !== null && reforzada > ahora) return reforzar;
  return null;
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
 * - **TA ONLY** con el TCAS II en marcha y el selector todavía sin la
 *   maniobra: en el punto de espera, antes de entrar en la pista.
 * - **Nada** con el TCAS II en TA/RA, que es el modo normal y no se escribe.
 * - Y la banda si no es la normal, detrás: **ABV** o **BLW**.
 *
 * El TCAS I no tiene otro modo que avisar, y en marcha no escribe nada más que
 * la banda. `null` es que no hay nada que escribir.
 */
export function modoEnPantalla(
  equipo: EquipoTcas | null,
  enMarcha: boolean,
  banda: Banda = "NORM",
  conManiobra = false,
): string | null {
  if (!equipo) return null;
  if (!enMarcha) return "TCAS STBY";
  const partes = [
    daLaManiobra(equipo) && !conManiobra ? "TA ONLY" : "",
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
  /** Mi ritmo vertical, m/s: lo que el RA ensaya. Cero si no se dice. */
  readonly vertical?: number;
  /**
   * **Si el selector está en TA/RA**: da maniobras. Desde que se entra en la
   * pista y en el aire; en el punto de espera, TA ONLY. Sin decirlo, TA ONLY.
   * Solo cuenta en el TCAS II. Ver `Game.vigilarElTrafico`.
   */
  readonly resuelve?: boolean;
}

/**
 * Cómo se pinta un tráfico. Ver la figura 2 del folleto de la FAA: rombo
 * hueco, rombo lleno, círculo ámbar del aviso y **cuadrado rojo** de la
 * maniobra, que es `resolucion`.
 */
export type Clase = "otro" | "cerca" | "aviso" | "resolucion";

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
  /** Dónde está en horizontal respecto a mí, m: este y sur. */
  hx: number;
  hz: number;
  /** Y cómo cambia, m/s. */
  hvx: number;
  hvz: number;
  /** La distancia horizontal de cruce, ft. Ver `distanciaDeCruce`. */
  hmd: number;
  /** Si su transpondedor dice que está posado. */
  enElSuelo: boolean;
}

/** Los segundos hasta el máximo acercamiento; uno como poco, que divide. */
function hastaElCruce(s: Seguido): number {
  return s.rPunto < 0 ? Math.max(1, s.r / -s.rPunto) : 1;
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
  /** Y cuántas maniobras ha empezado. Para el banco. */
  resolucionesDadas = 0;
  /** Con qué se pintó la última vez. Ver `comoVeA`. */
  private ultimoPintado: { banda: Banda; y: number; intrusos: number } | null = null;
  /** La maniobra puesta, si hay una. Ver `resolver`. */
  private ra: Resolucion | null = null;
  /**
   * Si la de ahora ya no va a cambiar: una de subir o bajar se afloja a
   * nivelar una vez, y ésa se queda hasta el final. Ver `resolver`.
   */
  private aflojada = false;
  /** Segundos desde que se dio la orden puesta. Ver `reforzarOInvertir`. */
  private desdeLaOrden = 0;
  /** Si ya se invirtió en este encuentro: una vez, como mucho. */
  private invertida = false;
  /** Lo que ha cambiado del RA en este paso. Ver `cambiosDelRa`. */
  private cambios: CambioDelRa[] = [];
  /** Si da maniobras: TCAS II, en marcha y con el selector en TA/RA. */
  private conRa = false;

  /** Lo que enseña la pantalla. Vacío si no hay TCAS o está en espera. */
  get enPantalla(): readonly Blanco[] {
    return this.ahora;
  }

  /** La maniobra puesta ahora, o `null`. Es lo que pinta la franja. */
  get resolucion(): Resolucion | null {
    return this.ra;
  }

  /**
   * **Lo que ha cambiado del RA en el último paso**: una orden nueva, el
   * «clear of conflict» o una retirada callada. Casi siempre, nada. Lo lee el
   * juego justo después de `paso` para decirlo. Ver `CambioDelRa`.
   */
  get cambiosDelRa(): readonly CambioDelRa[] {
    return this.cambios;
  }

  /** Si está en TA/RA: el modo que no se escribe. Ver `modoEnPantalla`. */
  get conManiobra(): boolean {
    return this.conRa;
  }

  /**
   * **Cómo ve a uno, para el banco**: si lo sigue, a cuántas millas y pies
   * lo midió en el último ciclo, y con qué banda, altura propia y cuántos
   * transpondedores se pintó la pantalla la última vez. Un avión que el banco
   * ve en la banda y la pantalla no pinta puede deberse a cuatro cosas, y sin
   * esto solo se podía adivinar cuál.
   */
  comoVeA(id: string): {
    readonly sigue: boolean;
    readonly millas: number | null;
    readonly pies: number | null;
    readonly banda: Banda | null;
    readonly y: number | null;
    readonly intrusos: number | null;
  } {
    const s = this.seguidos.get(id);
    return {
      sigue: !!s,
      millas: s ? +s.r.toFixed(1) : null,
      pies: s ? Math.round(s.a) : null,
      banda: this.ultimoPintado?.banda ?? null,
      y: this.ultimoPintado ? Math.round(this.ultimoPintado.y) : null,
      intrusos: this.ultimoPintado?.intrusos ?? null,
    };
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
    // Y la maniobra, sin decir nada: el vuelo en que estaba ya no existe.
    this.ra = null;
    this.aflojada = false;
    this.invertida = false;
    this.cambios = [];
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
    this.cambios = [];
    this.encendido = !!equipo && yo.pantalla;
    this.conRa = this.encendido && daLaManiobra(equipo) && !!yo.resuelve;
    if (!equipo) {
      if (this.seguidos.size || this.ahora.length || this.ra) this.reiniciar();
      return [];
    }
    // Con el selector fuera de TA/RA no hay maniobra, y la que hubiera se va.
    if (!this.conRa) this.quitar("retirada");
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
        hx: dx,
        hz: dz,
        hvx: 0,
        hvz: 0,
        hmd: Math.hypot(dx, dz) / PIE,
        enElSuelo: !!i.enElSuelo,
      };
      if (antes) {
        const lapso = this.reloj - antes.cuando;
        if (lapso > 0) {
          seguido.rPunto = (r - antes.r) / lapso;
          seguido.aPunto = (a - antes.a) / lapso;
          seguido.vIntruso = (yIntruso - antes.yIntruso) / lapso;
          seguido.hvx = (dx - antes.hx) / lapso;
          seguido.hvz = (dz - antes.hz) / lapso;
          seguido.conRitmo = true;
        }
        seguido.r = r;
        seguido.a = a;
        seguido.yIntruso = yIntruso;
        seguido.cuando = this.reloj;
        seguido.hx = dx;
        seguido.hz = dz;
        seguido.hmd = distanciaDeCruce(dx, dz, seguido.hvx, seguido.hvz) / PIE;
        seguido.enElSuelo = !!i.enElSuelo;
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
    this.resolver(yo, altitud, sobreElSuelo, posado, s);
  }

  /**
   * **La maniobra**, una vez por ciclo, detrás del aviso de tráfico.
   *
   * - Sin RA puesto, se busca el tráfico que la pida y llegue antes al máximo
   *   acercamiento, y se le da sentido y orden. Ver `elegirSentido` y
   *   `ordenPara`.
   * - Con uno puesto, contra ése y nadie más: si ya se aleja y no la pide,
   *   «clear of conflict»; si la separación ya está asegurada nivelando, la
   *   de subir o bajar se afloja a `levelOff`, una vez; si lo pedido ya no
   *   basta, se refuerza o se invierte —ver `reforzarOInvertir`—; y si se
   *   deja de poder dar maniobras —por debajo de mil pies, el terreno sonando,
   *   el otro posado o perdido—, se retira sin decir nada.
   *
   * Se quita solo con lo que cambia de verdad: que el otro se aleje, que se
   * baje, que suene el terreno. No hay reloj que rearme ni que retire: el de
   * `desdeLaOrden` solo dice si al piloto le ha dado tiempo a responder.
   */
  private resolver(
    yo: Propio,
    altitud: number,
    sobreElSuelo: number,
    posado: boolean,
    s: Sensibilidad,
  ): void {
    const puesta = this.ra;
    // Una puesta se aguanta hasta la tolerancia, con los umbrales del 3.
    const u =
      s.ra ??
      (puesta && sobreElSuelo >= SE_RETIRA_POR_DEBAJO
        ? sensibilidad(altitud, SIN_RA_POR_DEBAJO).ra
        : null);
    const puede =
      this.conRa &&
      !!u &&
      !posado &&
      !yo.terrenoAvisando &&
      sobreElSuelo >= (puesta ? SE_RETIRA_POR_DEBAJO : SIN_RA_POR_DEBAJO);
    if (!puede || !u) {
      this.quitar("retirada");
      return;
    }
    const vo = (yo.vertical ?? 0) / PIE;
    const geometria = (g: Seguido): GeometriaDeResolucion => ({
      r: g.r,
      rPunto: g.rPunto,
      a: g.a,
      aPunto: g.aPunto,
      hmd: g.hmd,
    });
    if (puesta) {
      const g = this.seguidos.get(puesta.id);
      if (!g || g.enElSuelo) {
        this.quitar("retirada");
        return;
      }
      if (g.rPunto >= 0 && !pideResolucion(u, geometria(g))) {
        this.quitar("libre");
        return;
      }
      if (this.aflojada) return;
      this.desdeLaOrden += CICLO;
      const t = hastaElCruce(g);
      const basta = ritmoQueBasta(puesta.sentido, g.a, g.vIntruso, t, u.alim);
      const nivelarBasta = puesta.sentido === "sube" ? basta <= 0 : basta >= 0;
      // Cualquier orden de bajar, también reforzada o invertida.
      const yaNoSeBaja = puesta.sentido === "baja" && sobreElSuelo < SIN_BAJAR_POR_DEBAJO;
      // Se afloja lo que pide subir o bajar; la preventiva ya nace floja.
      if (esPositiva(puesta.orden) && (nivelarBasta || yaNoSeBaja)) {
        this.aflojada = true;
        this.poner({
          ...puesta,
          orden: "levelOff",
          franja: franjaAlNivelar(puesta.sentido),
        });
        return;
      }
      const otra = reforzarOInvertir({
        orden: puesta.orden,
        sentido: puesta.sentido,
        a: g.a,
        vo,
        vi: g.vIntruso,
        t,
        alim: u.alim,
        sobreElSuelo,
        desdeLaOrden: this.desdeLaOrden,
        invertida: this.invertida,
      });
      if (otra) {
        if (otra.sentido !== puesta.sentido) this.invertida = true;
        this.poner({ id: puesta.id, ...otra, franja: franjaDe(otra.orden, otra.sentido) });
      }
      return;
    }
    let amenaza: { id: string; g: Seguido; t: number } | null = null;
    for (const [id, g] of this.seguidos) {
      if (!g.conRitmo || g.enElSuelo || !pideResolucion(u, geometria(g))) continue;
      const t = hastaElCruce(g);
      if (!amenaza || t < amenaza.t) amenaza = { id, g, t };
    }
    if (!amenaza) return;
    const { id, g, t } = amenaza;
    const sentido = elegirSentido(g.a, vo, g.vIntruso, t, u.alim, sobreElSuelo);
    const { orden, franja } = ordenPara(
      sentido,
      vo,
      ritmoQueBasta(sentido, g.a, g.vIntruso, t, u.alim),
      cruzaSuAltura(sentido, g.a),
    );
    // Ninguna nace aflojada: la preventiva también puede pasar a positiva.
    this.aflojada = false;
    this.invertida = false;
    this.resolucionesDadas += 1;
    this.poner({ id, sentido, orden, franja });
  }

  private poner(r: Resolucion): void {
    this.ra = r;
    this.desdeLaOrden = 0;
    this.cambios.push({ que: "orden", resolucion: r });
  }

  private quitar(que: "libre" | "retirada"): void {
    const r = this.ra;
    if (!r) return;
    this.ra = null;
    this.aflojada = false;
    this.invertida = false;
    this.cambios.push({ que, resolucion: r });
  }

  /**
   * Lo que se pinta, con las posiciones de este fotograma y el estado del
   * último ciclo: el símbolo cambia una vez por segundo, como en una cabina,
   * pero no salta de sitio a tirones.
   */
  private pintar(yo: Propio, intrusos: readonly Intruso[]): Blanco[] {
    const lista: Blanco[] = [];
    const banda = BANDAS[yo.banda ?? "NORM"];
    this.ultimoPintado = { banda: yo.banda ?? "NORM", y: yo.y, intrusos: intrusos.length };
    for (const i of intrusos) {
      const seguido = this.seguidos.get(i.id);
      // Posado, no se pinta. Ver la cabecera.
      if (!seguido || i.enElSuelo) continue;
      const dy = i.y - yo.y;
      const a = dy / PIE;
      const r = Math.hypot(i.x - yo.x, dy, i.z - yo.z) / MILLA;
      const clase: Clase =
        this.ra?.id === i.id
          ? "resolucion"
          : seguido.aviso
            ? "aviso"
            : r < CERCA_MILLAS && Math.abs(a) < CERCA_PIES
              ? "cerca"
              : "otro";
      // Fuera de la banda solo se pinta lo que avisa, que se pinta siempre.
      const avisa = clase === "aviso" || clase === "resolucion";
      if (!avisa && (a > banda.arriba || a < -banda.abajo)) continue;
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
