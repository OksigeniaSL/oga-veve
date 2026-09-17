/**
 * La aritmética de un instrumento **vivo**.
 *
 * Aquí no se dibuja nada: aquí se decide qué marca cae dónde, cuánto ha rodado
 * un tambor, dónde estará el avión dentro de seis segundos y cuánto tarda una
 * aguja de motor en despertar. Está separado del SVG porque es lo único de un
 * cuadro de mandos que se puede comprobar sin navegador, y porque son las
 * cuentas que, mal hechas, hacen que un panel tiemble a doce imágenes por
 * segundo.
 *
 * Las cuatro reglas que salen de aquí, en orden de importancia:
 *
 * 1. **La cinta se desplaza; el puntero no se mueve.** Velocidad, altitud y
 *    rumbo son ventanas sobre una magnitud que fluye: el mundo pasa por
 *    delante de la línea de fe. Así se entiende que el instrumento mide algo
 *    que sigue existiendo cuando no lo miras — que es justo lo que no enseña
 *    una cifra que salta.
 * 2. **Los dígitos ruedan.** Una cifra que cambia de golpe es invisible para
 *    la atención de un niño; una que rueda la captura. Los altímetros de
 *    tambor de verdad lo hacen, y por eso se lee la altitud de un vistazo.
 * 3. **Vectores de tendencia.** Una barra que nace del valor de ahora y llega
 *    hasta donde estarás dentro de seis segundos si no tocas nada. Es la
 *    animación más valiosa del cuadro, porque enseña anticipación, que es casi
 *    todo lo que es pilotar.
 * 4. **Cada motor tiene su carácter temporal.** Un pistón responde en tres
 *    décimas; un turbofán tarda tres segundos en subir de vueltas. Ese retardo
 *    es real, y enseñarlo es enseñar que un avión pesado se vuela con
 *    paciencia.
 *
 * Y una que es de las de no olvidar: **el estado va en coma flotante y solo se
 * redondea al dibujar**. Redondear antes acumula el error o hace temblar la
 * cinta, y un instrumento que tiembla en reposo miente sobre la calma.
 */

/** Una marca de la cinta: qué valor rotula y a cuántos píxeles del centro cae. */
export interface Marca {
  readonly valor: number;
  /** Positivo hacia abajo, que es como crecen las y en una pantalla. */
  readonly y: number;
  /** Si le toca llevar su número escrito. */
  readonly rotula: boolean;
}

export interface Cinta {
  /** Qué marca el instrumento ahora. */
  readonly valor: number;
  /** Cuántas unidades hay entre dos marcas pequeñas. */
  readonly paso: number;
  /** Una de cada cuántas lleva número. */
  readonly rotulaCada: number;
  /** Cuántos píxeles ocupa una unidad. */
  readonly porUnidad: number;
  /** Alto de la ventana, en píxeles. */
  readonly alto: number;
  /** Por debajo de esto no hay escala: la velocidad no baja de cero. */
  readonly minimo?: number;
}

/**
 * Las marcas visibles de una cinta, con el valor de ahora en el centro.
 *
 * Se generan **medio alto por arriba y medio por abajo, y una marca más de
 * cada lado**: sin ese margen, la marca que entra por el borde aparece de
 * golpe en mitad de la ventana en lugar de asomar, y la cinta parece saltar
 * aunque los números sean correctos.
 */
export function marcasDeCinta(c: Cinta): Marca[] {
  const medio = c.alto / 2;
  const alcance = medio / c.porUnidad + c.paso;
  const desde = Math.ceil((c.valor - alcance) / c.paso) * c.paso;
  const hasta = c.valor + alcance;
  const suelo = c.minimo ?? -Infinity;
  const marcas: Marca[] = [];
  for (let v = desde; v <= hasta; v += c.paso) {
    if (v < suelo) continue;
    /*
     * El redondeo del propio contador, no del valor: sumar 0,1 veinte veces no
     * da 2, y con pasos de diez o de veinte eso basta para que un rótulo diga
     * «119,99999» cuando toca «120».
     */
    const valor = Math.round(v / c.paso) * c.paso;
    marcas.push({
      valor,
      y: (c.valor - valor) * c.porUnidad,
      rotula: Math.round(valor / c.paso) % c.rotulaCada === 0,
    });
  }
  return marcas;
}

/**
 * Hasta dónde llega el vector de tendencia, en unidades.
 *
 * `null` cuando no pasa nada: por debajo del umbral la barra no aparece, y esa
 * ausencia también es información — significa «esto está quieto».
 */
export function tendencia(
  porSegundo: number,
  umbral: number,
  segundos = SEIS_SEGUNDOS,
): number | null {
  const salto = porSegundo * segundos;
  return Math.abs(salto) < umbral ? null : salto;
}

/** Los seis segundos de los vectores de tendencia. */
export const SEIS_SEGUNDOS = 6;
/** Por debajo de dos nudos en seis segundos, la velocidad está quieta. */
export const QUIETA_LA_VELOCIDAD = 2;
/** Y por debajo de sesenta pies por minuto, la altitud. */
export const QUIETA_LA_ALTITUD = 60;

/** Cómo va rodando un tambor de dígitos. */
export interface Rodillo {
  /** El número que hay ahora mismo en la ventana. */
  readonly centro: number;
  /**
   * Cuánto lleva rodado hacia el siguiente, de 0 a 1.
   *
   * Es lo que se traduce en un desplazamiento vertical del rollo: a 0 el
   * número está centrado y a 1 el de arriba ya ocupa su sitio.
   */
  readonly fraccion: number;
}

/**
 * El tambor de la altitud: los últimos dígitos ruedan en vez de saltar.
 *
 * `paso` es de cuánto en cuánto está grabado el rollo — veinte pies en un
 * altímetro de verdad, porque a menor detalle el tambor sería un borrón.
 *
 * ## Y rueda al final del paso, no a lo largo de él
 *
 * Con la fracción cruda —`(valor − centro) / paso`— el rollo se desplaza
 * proporcionalmente a la altitud, así que **en la mayor parte del recorrido la
 * ventana enseña dos medios dígitos**: a doscientos diez pies, medio «00»
 * abajo y medio «20» arriba. Parado en la pista de Tenerife Sur, que está a
 * doscientos, se veía un «2» y debajo un amasijo cortado — sale en cualquier
 * captura de cabina de los seis aviones.
 *
 * Un tambor de verdad no hace eso: se queda quieto enseñando su cifra y rueda
 * deprisa al final, cuando el diente engancha el siguiente. Lo decía ya el
 * comentario del dibujo —«un tambor de verdad enseña una cifra, y la de al
 * lado solo mientras está rodando»— y el recorte a la altura de un dígito se
 * puso para tapar justo esto. Se tapaba la mitad de un síntoma.
 *
 * ## Y quieto no rueda, por muy mal que caiga el número
 *
 * Aun rodando solo al final, quedaba el caso que se ve en toda captura de
 * cabina: **el avión parado**. Tenerife Sur está a ciento noventa y ocho pies,
 * que cae dentro de ese último cuarto, así que el altímetro de los seis
 * aviones enseñaba dos medias cifras cortadas de forma permanente. Y un
 * tambor parado a medio camino no existe: si la altitud no cambia, el diente
 * está encajado.
 *
 * `rodando` es si la altitud se está moviendo de verdad — la misma banda
 * muerta que ya usa la flecha de tendencia, ver `QUIETA_LA_ALTITUD`.
 */
export function rodillo(valor: number, paso: number, rodando = true): Rodillo {
  const centro = Math.floor(valor / paso) * paso;
  if (!rodando) return { centro, fraccion: 0 };
  return { centro, fraccion: rodandoAlFinal((valor - centro) / paso) };
}

/** Qué parte del paso se pasa rodando. El resto, quieto. */
export const RUEDA_EL_ULTIMO = 0.25;

/** La fracción cruda, apretada contra el final del paso. */
function rodandoAlFinal(f: number): number {
  const quieto = 1 - RUEDA_EL_ULTIMO;
  if (f <= quieto) return 0;
  return (f - quieto) / RUEDA_EL_ULTIMO;
}

/**
 * Un *bug* que viaja a su sitio nuevo en vez de aparecer allí.
 *
 * Aproximación exponencial: en `duracion` recorre el noventa y cinco por
 * ciento, que a ojo es haber llegado, y nunca se pasa de largo. El ojo sigue
 * lo que se mueve; lo que salta se pierde.
 */
export function deslizaBug(
  actual: number,
  objetivo: number,
  dt: number,
  duracion = VIAJE_DE_BUG,
): number {
  if (dt <= 0) return actual;
  const tau = duracion / 3;
  return objetivo + (actual - objetivo) * Math.exp(-dt / tau);
}

/** Lo que tarda un bug en llegar a su sitio nuevo, en segundos. */
export const VIAJE_DE_BUG = 0.35;

/**
 * El carácter temporal de cada motor, en segundos de constante de tiempo.
 *
 * Un pistón obedece casi al momento. Un turbohélice se toma un segundo. Un
 * turbofán tarda tres en despertar, y ese retardo —que es real y muy conocido
 * por cualquiera que haya volado uno— es lo que hace que un reactor se pilote
 * adelantándose. Que la aguja del EICAS lo enseñe no es un adorno: es la
 * lección.
 */
export const TARDA_EL_MOTOR = {
  rpm: 0.3,
  par: 1,
  n1: 3,
} as const;

/** Adónde ha llegado una magnitud que persigue a otra con retardo. */
export function conRetardo(
  actual: number,
  objetivo: number,
  dt: number,
  tau: number,
): number {
  if (dt <= 0 || tau <= 0) return dt <= 0 ? actual : objetivo;
  return objetivo + (actual - objetivo) * Math.exp(-dt / tau);
}

/**
 * Si una alerta recién nacida está encendida en este instante.
 *
 * Parpadea a un hercio durante cinco segundos y después **se queda fija
 * mientras la condición dure**. Lo que parpadea es el marco, nunca los
 * dígitos: el número tiene que poder leerse siempre, y un número que parpadea
 * es un número que la mitad del tiempo no está.
 */
export function parpadeo(edad: number, durante = PARPADEA_CINCO): boolean {
  if (edad >= durante) return true;
  return edad % 1 < 0.5;
}

/** Cuánto parpadea una alerta antes de quedarse fija, en segundos. */
const PARPADEA_CINCO = 5;

/**
 * La precesión de la carta de rumbo: un sobreimpulso amortiguado de un par de
 * grados al salir de un viraje.
 *
 * Es de las cosas pequeñas que hacen que un instrumento parezca de verdad; un
 * giróscopo tiene masa y la carta se pasa un poco. Muelle amortiguado con paso
 * fijo, para que a doce imágenes por segundo no explote ni tiemble.
 */
export function precesion(
  desviacion: number,
  velocidad: number,
  empuje: number,
  dt: number,
  frecuencia = 1.2,
  amortiguacion = 0.6,
): { desviacion: number; velocidad: number } {
  const w = 2 * Math.PI * frecuencia;
  const paso = Math.min(dt, 1 / 60);
  let d = desviacion;
  let v = velocidad;
  let queda = dt;
  while (queda > 1e-6) {
    const h = Math.min(paso, queda);
    const a = w * w * (empuje - d) - 2 * amortiguacion * w * v;
    v += a * h;
    d += v * h;
    queda -= h;
  }
  return { desviacion: d, velocidad: v };
}
