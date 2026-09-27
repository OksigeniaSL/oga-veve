/**
 * De qué está hecho el cuadro de mandos **de este avión**.
 *
 * Jugando, con la flota ya en seis: «el cuadro de mandos del avión me salen
 * todos iguales; si estoy en un reactor o en un 747, el niño que juega quiere
 * fliparlo y ver botones y lucecitas, quiere un monstruo de avión, no una
 * avioneta».
 *
 * Y no era solo una cuestión de gusto: era **falso**. El anemómetro tenía el
 * fondo de escala en ciento sesenta nudos para los seis aviones, así que el de
 * fuselaje ancho —que cruza a cuatrocientos cuarenta y siete— volaba con la
 * aguja clavada en el tope desde poco después de despegar. Un instrumento
 * clavado no dice nada, y lo que enseñaba era mentira.
 *
 * Aquí se decide lo que cambia de un avión a otro, y sale todo de su ficha:
 *
 * - **Las escalas** de las esferas, para que la aguja viva dentro y no en el
 *   tope: anemómetro, variómetro y los arcos de color, que en un avión de
 *   verdad son sus velocidades y no un adorno.
 * - **Cuántos motores hay y qué marca cada uno.** Un pistón enseña vueltas, un
 *   turbohélice su par, un turbofán el régimen del fan — que es lo que se
 *   llama N1 y es el mando con el que se vuela de verdad un avión de línea.
 *
 * Lo que **no** cambia es la disposición de los seis instrumentos clásicos:
 * esa es la misma en una avioneta y en un Boeing, y ese es justo el hallazgo
 * que se lleva quien aprende aquí. Ver `six-pack.ts`.
 *
 * ## Una escala, dos dibujos
 *
 * Y aquí vive **la escala entera**, no solo su fondo: cada marca, cada cifra,
 * cada arco de color y el ángulo que barre la aguja. El avión se ve desde dos
 * sitios —el cuadro plano del HUD, que es SVG, y la cabina en tres
 * dimensiones, que es lienzo— y cada uno se hacía sus cuentas. Salió lo que
 * tenía que salir, y lo vio quien juega poniendo las dos vistas una al lado de
 * la otra: «los paneles de los aviones no coinciden en diferentes vistas». El
 * fumigador marcaba de treinta y cinco en treinta y cinco en un sitio y de
 * diecisiete y medio en el otro; el tacómetro era un tanto por ciento fuera y
 * vueltas dentro; el altímetro de fuera ni siquiera tenía el cero arriba.
 *
 * Así que ahora los dos dibujos **leen** la escala de aquí y no deciden nada:
 * dónde va la marca, qué pone al lado y de qué color es el arco. Pueden
 * diferir en el pincel —SVG o lienzo— y en el tamaño, nunca en lo que dicen.
 * Lo comprueba `cuadro-dos-vistas.test.ts`, avión por avión.
 */

import { esDeChorro, type AircraftConfig } from "../flight/aircraft";
import { ascensoMaximo } from "../flight/carrera";
import { loQueCabe, reservaEnKilos } from "../flight/combustible";
import { familiaDe, patasDe, type Familia } from "./familia";
import { PALETA } from "./paleta";
import { vfeDeAterrizaje } from "../flight/limites";

/**
 * Las tres conversiones del cuadro de mandos, en un solo sitio.
 *
 * Estaban escritas a pelo en cada fichero que las necesitaba —`1.94384`,
 * `3.28084`, `196.85`, repetidas en el HUD, en las pantallas de la cabina y
 * aquí— y ese es el camino conocido a que dos instrumentos del mismo avión
 * digan cifras distintas. Un cuadro de mandos tiene una escala; la conversión
 * es parte de la escala.
 */
export const NUDOS = 1.94384;
/** Un metro, en pies. */
export const PIES = 3.28084;
/** Un metro por segundo, en pies por minuto. */
export const PIES_POR_MINUTO = 196.85;

/** Qué marca cada aguja de motor, y cómo se llama en la cabina. */
export type Motor = "rpm" | "par" | "n1";

/** Los colores de un arco de instrumento. Son cuatro y no se inventan más. */
export type ColorDeArco = "blanco" | "verde" | "ambar" | "rojo";

/**
 * Y de qué color es cada uno en un lienzo, que no lee la hoja de estilo.
 *
 * Los de la paleta de cabina, los mismos que las variables `--cabina-*` del
 * cuadro plano: el blanco de un arco es el blanco de un valor.
 */
export const COLOR_DE_ARCO: Readonly<Record<ColorDeArco, string>> = {
  blanco: PALETA.valor,
  verde: PALETA.normal,
  ambar: PALETA.precaucion,
  rojo: PALETA.limite,
};

/** Un arco de color de una escala, en fracciones de su recorrido. */
export interface Arco {
  readonly color: ColorDeArco;
  readonly desde: number;
  readonly hasta: number;
}

/** Una marca de una escala. */
export interface Marca {
  /** Dónde cae, de 0 a 1 del recorrido. */
  readonly en: number;
  readonly larga: boolean;
  /** Lo que lleva escrito al lado, si lleva algo. */
  readonly cifra: string | null;
}

/**
 * Cuánto barre una aguja: **desde dónde y cuántos grados**, contados desde
 * las doce y en el sentido de las agujas del reloj.
 *
 * Es parte de la escala y no del dibujo: con el mismo fondo y otro barrido, la
 * misma velocidad cae en otro sitio de la esfera, y eso es justo lo que se ve
 * al comparar dos vistas del mismo avión.
 */
export interface Barrido {
  readonly desde: number;
  readonly recorrido: number;
}

/** Una escala entera: todo lo que un instrumento lleva serigrafiado. */
export interface Escala {
  /** El nombre del instrumento, en inglés aeronáutico: no se traduce. */
  readonly rotulo: string;
  /** Y la unidad, que es la glosa que se lee sin haber volado nunca. */
  readonly unidad: string | null;
  /** De dónde a dónde va, en su unidad. */
  readonly min: number;
  readonly max: number;
  readonly barrido: Barrido;
  readonly marcas: readonly Marca[];
  readonly arcos: readonly Arco[];
  /** La raya roja del límite, en fracción del recorrido, si la lleva. */
  readonly raya: number | null;
  /**
   * Dónde va el rótulo: abajo, en el hueco que deja el barrido, o **dentro**,
   * por encima del eje, en la esfera que da la vuelta entera y no tiene hueco.
   */
  readonly rotuloDentro?: boolean;
}

/** De un valor en su unidad a la fracción del recorrido, recortada. */
export function enLaEscala(e: Escala, valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  const f = (valor - e.min) / (e.max - e.min);
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/** Los grados, desde las doce, a los que apunta la aguja en esa fracción. */
export function anguloEn(b: Barrido, fraccion: number): number {
  return b.desde + fraccion * b.recorrido;
}

/**
 * Un punto de la esfera, en coordenadas de pantalla —la y crece hacia
 * abajo—, a esa fracción del recorrido y a ese radio del centro. Vale igual
 * para el SVG y para el lienzo, que es la gracia.
 */
export function puntoEn(
  b: Barrido,
  fraccion: number,
  radio: number,
): { x: number; y: number } {
  const a = (anguloEn(b, fraccion) * Math.PI) / 180;
  return { x: Math.sin(a) * radio, y: -Math.cos(a) * radio };
}

/*
 * ── Los barridos de cada clase de instrumento ──
 *
 * Los de vuelo barren trescientos grados con el cero abajo a la izquierda,
 * como el anemómetro de cualquier avioneta. El variómetro es el mismo pero
 * girado un cuarto: **su cero va a las nueve**, subir es hacia arriba y bajar
 * hacia abajo, que es como está en todos los aviones del mundo — y como no
 * estaba en ninguna de las dos vistas: una lo tenía arriba y la otra dibujaba
 * el cero a las nueve y la aguja a las doce.
 */
const DE_VUELO: Barrido = { desde: -150, recorrido: 300 };
const DEL_VARIOMETRO: Barrido = { desde: -240, recorrido: 300 };
/** El altímetro y la rosa dan la vuelta entera, con el cero arriba. */
const VUELTA_ENTERA: Barrido = { desde: 0, recorrido: 360 };
/** Los de motor, doscientos cuarenta: los mismos en el reloj y en la pantalla. */
const DE_MOTOR: Barrido = { desde: -120, recorrido: 240 };
/**
 * Y los de depósito y flaps, un abanico arriba: vacío a las diez y lleno a
 * las dos, que es como es el indicador de combustible de una avioneta.
 */
const DE_ABANICO: Barrido = { desde: -60, recorrido: 120 };

/**
 * Las medidas de dentro de una esfera, **en fracciones del radio de su cara**.
 *
 * El anillo de color, dónde empiezan las marcas largas y las cortas, a qué
 * distancia van las cifras y cuánto mide la aguja. Las usan las dos vistas:
 * con el mismo dibujo en proporción, lo que se compara entre ellas es lo que
 * dicen y no un tamaño de letra. Cada una pone el radio que le toca —cuarenta
 * y tres en el cuadrado de cien del SVG, lo que mida el lienzo en la cabina—.
 */
export const MEDIDAS = {
  arco: 0.9,
  /** El blanco de los flaps va por dentro del verde: se solapan. */
  arcoBlanco: 0.79,
  anchoDeArco: 0.11,
  marcaFuera: 0.95,
  marcaLarga: 0.77,
  marcaCorta: 0.86,
  cifra: 0.6,
  /** Alto de la cifra de escala. */
  letra: 0.21,
  /** Y de la unidad y el rótulo, más pequeños: son la glosa. */
  letraMenuda: 0.16,
  /** Dónde va la unidad, **por debajo** del eje. */
  unidad: 0.36,
  /** Y el rótulo: abajo, en el hueco del barrido, o dentro si no lo hay. */
  rotulo: 0.78,
  rotuloDentro: -0.34,
  aguja: 0.88,
  /** La aguja corta del altímetro, la de los miles. */
  agujaCorta: 0.56,
  /** Lo que baja la cifra de un reloj de motor desde el centro. */
  lectura: 0.5,
} as const;

/**
 * Dónde va la ventanilla de Kollsman, en fracciones del radio de la cara.
 *
 * A las tres en punto, entre el 2 y el 3, que es donde está en todo altímetro
 * de aguja del mundo desde los años treinta. Las dos vistas la ponen aquí:
 * ver `ui/six-pack.ts` y `world/relojes-cabina.ts`.
 */
export const VENTANA_DE_PRESION = {
  x: 0.2,
  y: -0.12,
  ancho: 0.52,
  alto: 0.24,
} as const;

/**
 * Cuánto se desplaza el horizonte artificial por grado de cabeceo, en
 * fracción del radio de la esfera.
 *
 * Eran dos números, uno en cada vista —0,021 fuera y 0,036 dentro—, así que
 * el mismo morro arriba subía el cielo casi el doble en la cabina que en el
 * cuadro. Con un treintavo, treinta grados llegan justo al borde.
 */
export const CABECEO_POR_GRADO = 1 / 30;

/** Las rayas de la escala de cabeceo, en grados. Las cortas son las de cinco. */
export const RAYAS_DE_CABECEO: readonly number[] = [
  -20, -15, -10, -5, 5, 10, 15, 20,
];

/**
 * Dónde va la bola del coordinador de viraje, de −1 a 1, con este derrape.
 *
 * La bola dice **si el viraje está coordinado**, no cuánto se alabea: se va al
 * lado de fuera si falta pie. La cabina la movía con el alabeo, así que en un
 * viraje perfecto se iba al borde — enseñaba justo lo contrario.
 */
export function bolaDelViraje(derrape: number): number {
  const b = derrape * 9;
  return b < -1 ? -1 : b > 1 ? 1 : b;
}

/** Las velocidades que lleva pintadas el anemómetro, en nudos indicados. */
export interface Velocidades {
  /** Pérdida con los flaps a fondo: el pie del arco blanco. */
  readonly vso: number | null;
  /** Lo más rápido con flaps: la cabeza del arco blanco. */
  readonly vfe: number | null;
  /** Pérdida limpia: el pie del arco verde. */
  readonly vs1: number;
  /** Máxima de crucero estructural: donde acaba el verde y empieza el ámbar. */
  readonly vno: number;
  /** La de nunca pasar: la raya roja. */
  readonly vne: number;
}

export interface Cuadro {
  /** De qué familia es la cabina: esferas, cristal o línea. */
  readonly familia: Familia;
  /** Fondo de escala del anemómetro, en nudos. */
  readonly asiMax: number;
  /** Fondo de escala del variómetro, en pies por minuto. */
  readonly vsiMax: number;
  /** Las velocidades de la ficha que lleva pintadas. */
  readonly velocidades: Velocidades;
  /**
   * El anemómetro: sus marcas, sus cifras y **sus cuatro colores**.
   *
   * Blanco de la pérdida con flaps a la de flaps, verde de la pérdida limpia a
   * la de crucero estructural, ámbar de ahí a la de nunca pasar y la raya roja
   * en ella. Son las marcas de un anemómetro de verdad, y con ellas la esfera
   * enseña **este** avión: dónde empieza a volar, hasta dónde se sacan los
   * flaps y dónde deja de ser buena idea.
   */
  readonly anemometro: Escala;
  readonly altimetro: Escala;
  readonly variometro: Escala;
  /** La rosa del direccional. Gira ella; la aguja es el avión. */
  readonly rosa: Escala;
  /** Cuántas agujas de motor hay. */
  readonly motores: number;
  /** Y qué marcan. */
  readonly queMarca: Motor;
  /** El rótulo de esas agujas: `N1`, `RPM` o `TRQ`. */
  readonly rotulo: string;
  /** La escala de cada aguja de motor. */
  readonly motor: Escala;
  /** A cuánto equivale el régimen entero: las vueltas máximas, o el cien. */
  readonly maxDelMotor: number;
  /**
   * **Los grados de cada muesca de flaps**, para rotular su regla.
   *
   * Eran 0, 10, 20 y 30 en los seis, y en un reactor eso es enseñar un tope
   * que no tiene: el suyo primero son cinco. Salen de la ficha, como todo lo
   * de aquí. Ver `muescasDeFlaps` en `aircraft.ts`.
   *
   * **Vacía en el avión que no los lleva**, y entonces no hay regla: una
   * regla con su puntero quieto en el cero enseña un mando que no existe.
   */
  readonly flaps: readonly number[];
  /**
   * La escala del indicador de flaps: **cada muesca donde cae de verdad**.
   *
   * Las muescas iban repartidas a partes iguales, así que en el bimotor el
   * diez quedaba a un tercio y el veinticinco a dos tercios, cuando el
   * veinticinco está más cerca del cuarenta que del diez. Un indicador de
   * flaps marca cuánto ha bajado el flap, y eso es proporcional a los grados.
   * `null` en el avión que no los lleva.
   */
  readonly escalaDeFlaps: Escala | null;
  /** El depósito: vacío a la izquierda, lleno a la derecha, reserva en ámbar. */
  readonly combustible: Escala;
  /** Cuántas luces de tren: ninguna en el de tren fijo. Ver `patasDe`. */
  readonly patas: number;
}

/**
 * Qué instrumentos lleva este avión, **con los mismos nombres en las dos
 * vistas**.
 *
 * Es la lista contra la que se comparan el cuadro plano y la cabina. Los de
 * cristal no llevan esferas: lo suyo son las pantallas, que tienen su propia
 * lista de piezas y la misma regla —ver `pantallas-cabina.ts`—.
 */
export type Instrumento =
  | "asi"
  | "ai"
  | "alt"
  | "tc"
  | "dg"
  | "vsi"
  | Motor
  | "flaps"
  | "fuel"
  | "tren";

export function instrumentosDe(a: AircraftConfig): readonly Instrumento[] {
  const c = cuadroDe(a);
  if (c.familia !== "esferas") return [];
  return [
    "asi",
    "ai",
    "alt",
    "tc",
    "dg",
    "vsi",
    ...Array.from({ length: c.motores }, () => c.queMarca),
    "fuel",
    ...(c.escalaDeFlaps ? (["flaps"] as const) : []),
    ...(c.patas > 0 ? (["tren"] as const) : []),
  ];
}

/** La velocidad de pérdida con este coeficiente de sustentación, m/s. */
function perdidaCon(a: AircraftConfig, extra: number): number {
  const clMax = a.aero.cl0 + a.aero.clAlpha * a.aero.alphaStall + extra;
  return Math.sqrt((2 * a.mass * 9.81) / (1.225 * a.wingArea * clMax));
}

/**
 * Las velocidades del anemómetro, **de la ficha y del modelo de vuelo**.
 *
 * La raya roja estaba en el crucero más un quince por ciento, y eso no es la
 * de nunca pasar de nadie: al entrenador le salía en 134 nudos cuando su
 * ficha dice 163, y al reactor en 492 cuando su tope es 320. O sea que el
 * reactor volaba en verde con el aviso de exceso sonando. Ahora es la de la
 * ficha, la misma con la que salta ese aviso.
 */
function velocidadesDe(a: AircraftConfig): Velocidades {
  const vne = a.vmoKt;
  /*
   * La de crucero estructural no la lleva la ficha, y se saca como sale en las
   * avionetas de verdad: el ochenta por ciento de la de nunca pasar. Es la
   * proporción de una Cessna 172 —129 de 163— y la de una Seneca —163 de 204—,
   * y la norma no deja pasar del ochenta y nueve.
   */
  const vno = Math.round(vne * 0.8);
  const vs1 = perdidaCon(a, 0) * NUDOS;
  // Con flaps, del mismo modelo que los hace sustentar: lo que suma el flap
  // entero al coeficiente de sustentación. Ver `flapsLift`.
  const vso = a.llevaFlaps ? perdidaCon(a, a.flapsLift) * NUDOS : null;
  return {
    vso: vso === null ? null : Math.round(vso),
    // La cabeza del blanco es la VFE de los flaps de aterrizaje, la última de
    // la placa: la más baja. Ver `vfePorMuesca` en `aircraft.ts`.
    vfe: a.llevaFlaps ? vfeDeAterrizaje(a.vfePorMuesca) : null,
    vs1: Math.round(vs1),
    vno,
    vne,
  };
}

/** Marcas regulares entre dos valores, con cifra cada tanto. */
function marcasLineales(
  min: number,
  max: number,
  corta: number,
  larga: number,
  conCifra: number,
  cifra: (v: number) => string,
): Marca[] {
  const out: Marca[] = [];
  const n = Math.round((max - min) / corta);
  for (let i = 0; i <= n; i++) {
    const v = min + i * corta;
    const esLarga = Math.abs(v / larga - Math.round(v / larga)) < 1e-6;
    const lleva = Math.abs(v / conCifra - Math.round(v / conCifra)) < 1e-6;
    out.push({
      en: (v - min) / (max - min),
      larga: esLarga || lleva,
      cifra: lleva ? cifra(v) || null : null,
    });
  }
  return out;
}

/**
 * El anemómetro: el fondo por encima de la raya roja y **cifras redondas**.
 *
 * Las cifras eran octavos del fondo de escala, y el fondo sale de la ficha: en
 * el fumigador, 35, 53, 70, 88… Ningún anemómetro del mundo lleva un 53
 * serigrafiado. Ahora se busca el paso redondo —veinte, cuarenta, cincuenta o
 * cien— con el que caben seis cifras como mucho, que es lo que se lee en una
 * esfera del tamaño de una moneda; y el fondo es un múltiplo de ese paso, con
 * la raya roja dentro y sitio por encima para la aguja de un picado.
 */
function anemometroDe(v: Velocidades): Escala {
  let paso = 100;
  let max = 0;
  for (const p of [20, 40, 50, 100]) {
    const m = Math.ceil((v.vne * 1.08) / p) * p;
    if (m / p <= 6) {
      paso = p;
      max = m;
      break;
    }
  }
  if (!max) max = Math.ceil((v.vne * 1.08) / paso) * paso;
  const f = (kt: number) => Math.max(0, Math.min(1, kt / max));
  const arcos: Arco[] = [];
  if (v.vso !== null && v.vfe !== null)
    arcos.push({ color: "blanco", desde: f(v.vso), hasta: f(v.vfe) });
  arcos.push({ color: "verde", desde: f(v.vs1), hasta: f(v.vno) });
  arcos.push({ color: "ambar", desde: f(v.vno), hasta: f(v.vne) });
  return {
    rotulo: "IAS",
    unidad: "KT",
    min: 0,
    max,
    barrido: DE_VUELO,
    marcas: marcasLineales(0, max, 10, paso, paso, (kt) => String(kt)),
    arcos,
    raya: f(v.vne),
  };
}

/**
 * Las bandas de la cinta de velocidad de las pantallas, en fracciones del
 * fondo del anemómetro.
 *
 * **Las mismas que los arcos de la esfera**, y por encima de la raya roja,
 * rojo hasta el final de la cinta: en una esfera el límite es una raya porque
 * la aguja no pasa de ahí; en una cinta es una franja, porque la cinta sigue.
 */
export function bandasDeVelocidad(c: Cuadro): readonly Arco[] {
  const e = c.anemometro;
  return e.raya === null
    ? e.arcos
    : [...e.arcos, { color: "rojo", desde: e.raya, hasta: 2 }];
}

/**
 * El altímetro: **el cero arriba y la vuelta entera cada mil pies**.
 *
 * El del cuadro plano repartía del 0 al 10 en trescientos grados, con el cero
 * abajo a la izquierda, mientras su aguja daba la vuelta entera con el cero
 * arriba: a quinientos pies la aguja apuntaba al 6. El de la cabina era
 * coherente consigo mismo, pero tampoco era un altímetro: no hay ninguno con
 * un hueco abajo. Uno de verdad lleva del 0 al 9 en la vuelta entera, marcas
 * de veinte en veinte pies, la aguja larga de los cientos y la corta de los
 * miles.
 */
const ALTIMETRO: Escala = {
  rotulo: "ALT",
  unidad: "FT",
  rotuloDentro: true,
  min: 0,
  max: 1000,
  barrido: VUELTA_ENTERA,
  marcas: marcasLineales(0, 980, 20, 100, 100, (p) => String(p / 100)).map(
    (m) => ({ ...m, en: (m.en * 980) / 1000 }),
  ),
  arcos: [],
  raya: null,
};

/**
 * El variómetro: el cero a las nueve, **las cifras en miles y sin signo**.
 *
 * Lo de arriba es subir y lo de abajo es bajar, y eso es todo lo que hace
 * falta: ningún variómetro lleva un «−2» pintado, lleva un 2 debajo del cero.
 */
function variometroDe(vsiMax: number): Escala {
  const cifraCada = vsiMax > 4000 ? 2000 : 1000;
  return {
    rotulo: "V/S",
    unidad: "×1000 FPM",
    min: -vsiMax,
    max: vsiMax,
    barrido: DEL_VARIOMETRO,
    marcas: marcasLineales(-vsiMax, vsiMax, 100, 500, cifraCada, (fpm) =>
      String(Math.abs(fpm) / 1000),
    ),
    arcos: [],
    raya: null,
  };
}

/**
 * La rosa del direccional, **como la de verdad**: raya cada cinco grados,
 * larga cada diez y un número cada treinta —N, 3, 6, E, 12, 15, S…—.
 *
 * Las letras van en inglés (W, no O): así pone en toda rosa de compás del
 * mundo, y la regla 3 del AGENTS.md dice que la aeronáutica se aprende en su
 * idioma. Y los números sin el cero de las unidades, que es como se escriben
 * en una rosa: el 3 son los treinta grados.
 */
const ROSA: Escala = {
  rotulo: "HDG",
  unidad: null,
  min: 0,
  max: 360,
  barrido: VUELTA_ENTERA,
  marcas: marcasLineales(0, 355, 5, 10, 30, (g) =>
    g === 0 ? "N" : g === 90 ? "E" : g === 180 ? "S" : g === 270 ? "W" : String(g / 10),
  ).map((m) => ({ ...m, en: (m.en * 355) / 360 })),
  arcos: [],
  raya: null,
};

/**
 * La escala de las agujas de motor.
 *
 * **Un pistón lleva tacómetro, en vueltas.** Fuera era un tanto por ciento
 * —«100»— y dentro un «2700»: el mismo motor, dos instrumentos. El de verdad
 * es el tacómetro, rotulado en cientos de vueltas —«RPM ×100»—, con el arco
 * verde del régimen normal y la raya roja en las máximas. El verde empieza en
 * el setenta y ocho por ciento de las máximas, que es donde lo lleva la 172:
 * de 2100 a 2700.
 *
 * Un turbohélice marca su par y un turbofán su N1, los dos en tanto por
 * ciento, que es como se leen en cualquier cabina: verde hasta el noventa y
 * cinco, ámbar el último tramo y la raya roja en el cien.
 */
function motorDe(a: AircraftConfig, queMarca: Motor): Escala {
  if (queMarca === "rpm") {
    const { maxRpm } = a.sound;
    const max = Math.ceil((maxRpm * 1.1) / 500) * 500;
    const verde = Math.round((maxRpm * 0.78) / 100) * 100;
    return {
      rotulo: "RPM",
      unidad: "×100",
      min: 0,
      max,
      barrido: DE_MOTOR,
      marcas: marcasLineales(0, max, 100, 500, 500, (r) => String(r / 100)),
      arcos: [{ color: "verde", desde: verde / max, hasta: maxRpm / max }],
      raya: maxRpm / max,
    };
  }
  return {
    rotulo: queMarca === "n1" ? "N1" : "TRQ",
    unidad: "%",
    min: 0,
    max: 100,
    barrido: DE_MOTOR,
    marcas: marcasLineales(0, 100, 10, 50, 1000, () => ""),
    arcos: [
      { color: "verde", desde: 0, hasta: 0.95 },
      { color: "ambar", desde: 0.95, hasta: 1 },
    ],
    raya: 1,
  };
}

/** Lo que marca una aguja de motor con este régimen, en su unidad. */
export function valorDeMotor(c: Cuadro, regimen01: number): number {
  const r = Math.max(0, Math.min(1, Number.isFinite(regimen01) ? regimen01 : 0));
  return r * c.maxDelMotor;
}

/**
 * La cifra que va debajo de la aguja de motor.
 *
 * Las vueltas, de diez en diez como las dice el piloto; el tanto por ciento,
 * entero. Una sola función para las dos vistas: era el sitio exacto donde una
 * decía «100» y la otra «2700».
 */
export function cifraDeMotor(c: Cuadro, regimen01: number): string {
  const v = valorDeMotor(c, regimen01);
  return c.queMarca === "rpm"
    ? String(Math.round(v / 10) * 10)
    : String(Math.round(v));
}

/**
 * El rótulo de la aguja de motor número `i`, contando desde cero.
 *
 * Con el número solo si hay más de uno: «RPM 1» en un monomotor es un número
 * que no distingue nada.
 */
export function rotuloDeMotor(c: Cuadro, i: number): string {
  return c.motores > 1 ? `${c.rotulo} ${i + 1}` : c.rotulo;
}

function escalaDeFlapsDe(grados: readonly number[]): Escala | null {
  if (grados.length < 2) return null;
  const max = grados[grados.length - 1]!;
  if (!(max > 0)) return null;
  return {
    rotulo: "FLAPS",
    unidad: "°",
    min: 0,
    max,
    barrido: DE_ABANICO,
    marcas: grados.map((g) => ({ en: g / max, larga: true, cifra: String(g) })),
    arcos: [],
    raya: null,
  };
}

/** Dónde está la aguja de flaps con los flaps así, de 0 a 1. */
export function flapsEnLaEscala(c: Cuadro, grados: number): number {
  return c.escalaDeFlaps ? enLaEscala(c.escalaDeFlaps, grados) : 0;
}

/**
 * El indicador de combustible, **en los dos sitios**.
 *
 * En el cuadro plano había una regla y en la cabina nada: el depósito de una
 * avioneta, que es de lo primero que se mira antes de salir, no existía desde
 * el asiento. Ahora es la misma esfera en las dos: vacío a la izquierda con su
 * E, lleno a la derecha con su F, el cuarto, la mitad y los tres cuartos, y el
 * arco ámbar de la reserva de ley —los cuarenta y cinco minutos—, que es la
 * meta y no se mueve. Ver `reservaEnKilos`.
 */
function combustibleDe(a: AircraftConfig): Escala {
  const cabe = loQueCabe(a);
  const reserva = Math.min(1, reservaEnKilos(a) / Math.max(1, cabe));
  return {
    rotulo: "FUEL",
    unidad: "KG",
    min: 0,
    max: cabe,
    barrido: DE_ABANICO,
    marcas: [0, 0.25, 0.5, 0.75, 1].map((en) => ({
      en,
      larga: en === 0 || en === 0.5 || en === 1,
      cifra: en === 0 ? "E" : en === 1 ? "F" : null,
    })),
    arcos: [{ color: "ambar", desde: 0, hasta: reserva }],
    raya: 0,
  };
}

/**
 * Las escalas de cada avión, calculadas una vez.
 *
 * Esto se pregunta en cada imagen desde dos sitios —el cuadro de la cabina en
 * tres dimensiones y el del HUD—, y la respuesta no cambia nunca para un avión
 * dado: es su ficha. Calcularla sesenta veces por segundo no rompe nada, pero
 * es trabajo tirado, y sobre todo es la puerta a que alguien guarde una copia
 * «para no recalcular» y acabemos con dos cifras para lo mismo.
 */
const YA_CALCULADO = new WeakMap<AircraftConfig, Cuadro>();

export function cuadroDe(a: AircraftConfig): Cuadro {
  const guardado = YA_CALCULADO.get(a);
  if (guardado) return guardado;
  const hecho = calcularCuadro(a);
  YA_CALCULADO.set(a, hecho);
  return hecho;
}

function calcularCuadro(a: AircraftConfig): Cuadro {
  const velocidades = velocidadesDe(a);
  const anemometro = anemometroDe(velocidades);
  const vsiMax = Math.max(
    2000,
    Math.ceil((ascensoMaximo(a) * PIES_POR_MINUTO) / 500) * 500,
  );
  const queMarca: Motor = esDeChorro(a)
    ? "n1"
    : a.sound.engine === "turboprop"
      ? "par"
      : "rpm";
  const flaps = a.llevaFlaps ? a.muescasDeFlaps : [];
  return {
    familia: familiaDe(a),
    asiMax: anemometro.max,
    vsiMax,
    velocidades,
    anemometro,
    altimetro: ALTIMETRO,
    variometro: variometroDe(vsiMax),
    rosa: ROSA,
    motores: a.motores,
    queMarca,
    rotulo: queMarca === "n1" ? "N1" : queMarca === "par" ? "TRQ" : "RPM",
    motor: motorDe(a, queMarca),
    maxDelMotor: queMarca === "rpm" ? a.sound.maxRpm : 100,
    flaps,
    escalaDeFlaps: escalaDeFlapsDe(flaps),
    combustible: combustibleDe(a),
    patas: patasDe(a),
  };
}

/**
 * A cuánto va cada motor ahora mismo, de 0 a 1.
 *
 * **Sale del mismo sitio que el sonido**, y eso no es una casualidad que
 * convenga: si la aguja dijera una cosa y el motor sonara otra, el instrumento
 * dejaría de ser un instrumento. Ver `audio/audio.ts`.
 *
 * A ralentí no marca cero, que es lo que confunde a quien mira: un motor en
 * marcha gira, y un turbofán a ralentí anda por el veinte por ciento de N1.
 */
export function regimen(
  a: AircraftConfig,
  gas: number,
  encendido: boolean,
): number {
  if (!encendido) return 0;
  const { idleRpm, maxRpm } = a.sound;
  return (
    (idleRpm + Math.max(0, Math.min(1, gas)) * (maxRpm - idleRpm)) / maxRpm
  );
}
