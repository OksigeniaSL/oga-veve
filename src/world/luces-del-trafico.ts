/**
 * Las luces de los demás aviones: el tráfico del aeródromo, los turbohélices
 * de las islas y los de la ruta.
 *
 * De noche el tráfico **no llevaba ni una**: un reactor rodando hacia la
 * cabecera era una silueta negra sobre la calle, y uno en el viento en cola,
 * nada. Y es justo al revés de como se aprende a mirar el cielo: de noche un
 * avión **es** un puñado de luces con un patrón, y ese patrón dice qué está
 * haciendo. Tu avión ya las llevaba —ver `luces-de-posicion.ts`—; los demás
 * llevan las mismas, con las mismas reglas.
 *
 * ## Qué lleva encendido cada uno, y por qué
 *
 * No es decoración: cada luz tiene su regla, y la regla es la de cualquier
 * manual de operaciones —y la del plan europeo contra incursiones en pista
 * (EAPPRI) y la circular de la FAA sobre luces exteriores (SAFO 11004)—:
 *
 * - **Navegación** —roja a la izquierda, verde a la derecha, blanca en la
 *   cola—, siempre que el avión tiene corriente. Es lo que dice hacia dónde
 *   va: si ves la verde y la roja a la vez, viene de frente.
 * - **La baliza roja** que parpadea, con los motores en marcha: «esto está
 *   vivo, no te acerques». Aparcado y parado, apagada.
 * - **Las estroboscópicas**, blancas y a destellos, **al entrar en la pista**
 *   y en vuelo; se apagan al dejar la pista después de aterrizar. Son las que
 *   dicen «estoy en la pista» a quien espera en la doble raya.
 * - **El faro de rodaje**, rodando; parado en el punto de espera se apaga,
 *   que deslumbra al que tiene delante.
 * - **Los focos de aterrizaje**, con la autorización de despegue —en la
 *   carrera— y en vuelo por debajo de diez mil pies, que es donde hay tráfico
 *   y pájaros. Alineado esperando, todavía no: encenderlos es decirle a la
 *   torre y a todos que ya se va.
 *
 * Ver `lucesDelTrafico`, que es la tabla escrita y comprobada sin navegador.
 *
 * ## Y cada uno lleva las suyas, que no son las mismas
 *
 * La norma de cuándo es una; **dónde van**, depende del avión. En uno de
 * pasaje —el turbohélice de las islas, el reactor, el grande— la baliza roja
 * va dos veces, encima y debajo del fuselaje, y los destellos en las dos
 * puntas y en la cola; el faro de rodaje, en la pata de morro. En una
 * avioneta de escuela de ala alta la baliza va una sola vez, en lo alto de la
 * deriva, los destellos solo en las puntas, y el faro de rodaje en el borde
 * del ala junto al de aterrizaje. Y el biplano fumigador no lleva destellos:
 * su luz anticolisión es la baliza. Ver `equipoDe`.
 *
 * Lo que manda en el cuándo y en el cuántos es la norma de certificación —el
 * 14 CFR 25.1385 a 25.1401 para los de transporte y su gemela de la parte 23
 * para los pequeños— y el Anexo 2 de la OACI, que fija los sectores de cada
 * luz de navegación y pide la anticolisión con los motores en marcha. La
 * cadencia de los destellos, entre cuarenta y cien por minuto, es la del
 * 25.1401: la baliza y los destellos de aquí van a cincuenta y cinco y a
 * cincuenta.
 *
 * Y **el tuyo lleva las mismas**, con las mismas reglas: es la misma clase
 * con el equipo de tu avión. Ver `luces-de-posicion.ts`.
 *
 * ## Y de día, las estroboscópicas son lo que se ve
 *
 * Un reactor a cuatro kilómetros mide siete píxeles y se confunde con el
 * mar. Lo que lo delata en un día claro, de verdad y aquí, es el destello
 * blanco de las puntas: se vio un rombo con su «+13» en la pantalla del TCAS y
 * nada por la ventanilla. Por eso las luces van **a tamaño fijo en pantalla**
 * —la luz que llega de lejos es un punto, no una bombilla que encoge— y el
 * destello es el más grande de todos.
 *
 * ## Lo que cuesta
 *
 * **Una llamada de dibujo por avión**, con sus once luces en un solo `Points`
 * colgado de su grupo: se mueven y giran con él sin tocar una coordenada. Lo
 * que cambia en cada fotograma es el tamaño de cada luz —cero es apagada—, y
 * solo se sube a la tarjeta cuando algo se enciende o se apaga. Un material
 * para todo el tráfico de cada clase.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  type Object3D,
  Points,
  PointsMaterial,
  Vector3,
} from "three";
import type { Silueta } from "../flight/flota";
import {
  destellaAhora,
  focoEncendido,
  laRedonda,
  puntasDe,
} from "./luces-de-posicion";

/**
 * En qué anda un avión del tráfico, **para sus luces**.
 *
 * - `aparcado`: en su puesto, con los motores parados.
 * - `rodando`: por las calles, moviéndose.
 * - `esperando`: parado en la doble raya, fuera de la pista.
 * - `entrando`: cruzando la doble raya hacia el eje, ya en la pista.
 * - `alineado`: en el eje, esperando el permiso de despegue.
 * - `carrera`: corriendo por la pista, para despegar o frenando tras tocar.
 * - `volando`: en el aire.
 */
export type FaseDeLuces =
  | "aparcado"
  | "rodando"
  | "esperando"
  | "entrando"
  | "alineado"
  | "carrera"
  | "volando";

/** Qué luces lleva encendidas. */
export interface Encendidas {
  readonly navegacion: boolean;
  readonly baliza: boolean;
  readonly estroboscopicas: boolean;
  readonly rodaje: boolean;
  readonly aterrizaje: boolean;
}

/**
 * Las luces de un avión del tráfico según lo que está haciendo. Ver la
 * cabecera, que es donde está el porqué de cada una.
 *
 * `altitud` es la del avión sobre el mar, m: la regla de los focos es por
 * debajo de diez mil pies de altitud, no de altura sobre el campo.
 */
export function lucesDelTrafico(
  fase: FaseDeLuces,
  altitud = 0,
  /** Con el tren fuera, los focos van encendidos a cualquier altura. */
  trenFuera = false,
): Encendidas {
  const motores = fase !== "aparcado";
  const enLaPista =
    fase === "entrando" || fase === "alineado" || fase === "carrera";
  return {
    navegacion: true,
    baliza: motores,
    estroboscopicas: enLaPista || fase === "volando",
    rodaje: fase === "rodando" || fase === "entrando",
    aterrizaje:
      fase === "carrera" ||
      (fase === "volando" && focoEncendido(altitud, trenFuera)),
  };
}

/** Lo que hace falta saber de tu avión para sus luces. */
export interface ComoVaElTuyo {
  /** Si el motor está en marcha. */
  readonly motor: boolean;
  readonly enElSuelo: boolean;
  /** Si las ruedas pisan la pista. */
  readonly enLaPista: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly velocidad: number;
}

/**
 * Más deprisa que esto sobre la pista es correr para despegar o frenar
 * después de tocar, m/s: unos treinta nudos. Por debajo se está entrando,
 * alineando o saliendo de ella.
 */
export const DE_CARRERA = 15;

/**
 * **En qué anda tu avión, para sus luces**: la misma tabla que el tráfico,
 * sacada de lo que tu avión está haciendo y no de un camino escrito.
 *
 * En el aire, volando, con el motor o sin él: la baliza y los destellos no se
 * apagan porque se pare un motor. En el suelo, con el motor parado, aparcado;
 * en la pista, corriendo o, despacio, entrando o saliendo, y parado en ella,
 * alineado; y fuera de la pista, rodando o parado esperando. Ver
 * `lucesDelTrafico`, que es quien decide qué se enciende en cada una.
 */
export function faseDelTuyo(a: ComoVaElTuyo): FaseDeLuces {
  if (!a.enElSuelo) return "volando";
  if (!a.motor) return "aparcado";
  if (a.enLaPista)
    return a.velocidad > DE_CARRERA
      ? "carrera"
      : a.velocidad > 1
        ? "entrando"
        : "alineado";
  return a.velocidad > 1 ? "rodando" : "esperando";
}

/**
 * **Qué luces lleva un avión, y dónde**, por su silueta. Ver la cabecera.
 *
 * - `baliza`: en lo alto de la deriva —una— o encima y debajo del fuselaje
 *   —dos—. La de abajo es la que se ve cuando te pasa por encima.
 * - `estroboscopicas`: ninguna, en las dos puntas, o en las puntas y en la
 *   cola.
 * - `rodaje`: el faro en la pata de morro, o en el borde del ala.
 * - `focos`: uno de aterrizaje en cada ala, o los dos faros juntos en el ala
 *   izquierda.
 */
export interface EquipoDeLuces {
  readonly baliza: "deriva" | "lomo-y-panza";
  readonly estroboscopicas: "ninguna" | "puntas" | "puntas-y-cola";
  readonly rodaje: "morro" | "ala";
  readonly focos: "dos-alas" | "ala-izquierda";
}

/** El de un avión de pasaje: el turbohélice, el reactor, el grande. */
export const DE_PASAJE: EquipoDeLuces = {
  baliza: "lomo-y-panza",
  estroboscopicas: "puntas-y-cola",
  rodaje: "morro",
  focos: "dos-alas",
};

/**
 * El equipo de cada silueta, con el avión de verdad de su clase:
 *
 * - **Ala alta** (la clase del Cessna 172S): la baliza en lo alto de la
 *   deriva, los destellos en las puntas y **los dos faros en el borde del ala
 *   izquierda**, el de aterrizaje y el de rodaje uno al lado del otro. Así
 *   los lleva el 172 de ahora, y de frente se le ven las dos luces en un ala
 *   y ninguna en la otra. Iban uno en cada ala, simétricos, que es otro
 *   avión.
 * - **Biplano** fumigador: la baliza en la deriva y nada de destellos; su
 *   anticolisión es la baliza, que es lo que pide la norma.
 * - **Bimotor de ala baja** (la clase del Seneca): la baliza en la deriva,
 *   los destellos en las puntas y el faro de rodaje en la pata de morro.
 * - **Los de pasaje** —el de cola en T, el reactor y el cuatrimotor—:
 *   `DE_PASAJE`.
 */
export function equipoDe(silueta: Silueta): EquipoDeLuces {
  switch (silueta) {
    case "ala-alta":
      return {
        baliza: "deriva",
        estroboscopicas: "puntas",
        rodaje: "ala",
        focos: "ala-izquierda",
      };
    case "biplano":
      return {
        baliza: "deriva",
        estroboscopicas: "ninguna",
        rodaje: "ala",
        focos: "dos-alas",
      };
    case "bimotor-ala-baja":
      return {
        baliza: "deriva",
        estroboscopicas: "puntas",
        rodaje: "morro",
        focos: "dos-alas",
      };
    default:
      return DE_PASAJE;
  }
}

/** Cada cuántos segundos destellan las estroboscópicas. */
export const CADA_ESTROBO = 1.2;

/** Y cuánto dura el destello: un flash de xenón, más corto que la baliza. */
export const DURA_EL_ESTROBO = 0.09;

/**
 * Si las estroboscópicas están en su destello en este instante. Fuera de la
 * clase por lo mismo que `destellaAhora`: es una cuenta sobre el reloj.
 */
export function estroboAhora(segundos: number): boolean {
  const t = ((segundos % CADA_ESTROBO) + CADA_ESTROBO) % CADA_ESTROBO;
  return t < DURA_EL_ESTROBO;
}

/**
 * Lo que mide cada luz en pantalla, px.
 *
 * Más pequeñas que las del avión propio —nueve— las de navegación, porque el
 * tráfico casi siempre se ve de lejos y a esa distancia una bola de nueve
 * píxeles es más grande que el avión. La grande es el destello, que es la que
 * tiene que verse de día.
 */
const TAMANO = {
  navegacion: 6,
  baliza: 8,
  estroboscopicas: 12,
  aterrizaje: 10,
  rodaje: 8,
} as const;

/**
 * **Y cuánto de eso queda a pleno sol**, de uno.
 *
 * De día el sol se come las luces, y no a todas igual: las de navegación casi
 * desaparecen —por eso no se piden de día más que en vuelo—, la baliza y los
 * focos se quedan en un punto, y el destello no pierde nada, que para eso es
 * de xenón: es la luz que se pone en un avión **para que lo vean de día**.
 * Medido con la tarjeta del portátil: con todas a su tamaño de noche, un
 * turbohélice de frente a un kilómetro era una nube blanca del tamaño del
 * avión, con los dos focos fundidos encima del fuselaje.
 */
const DE_DIA = {
  navegacion: 0.35,
  baliza: 0.5,
  estroboscopicas: 1,
  aterrizaje: 0.5,
  rodaje: 0.4,
} as const;

/**
 * Cuánto es de día ahora, de 0 —noche— a 1, **compartido por todas las luces
 * del tráfico**: es el mismo sol para todos, y así cambia en la tarjeta con
 * un número y sin tocar un avión. Ver `ponerLaLuzDelDia`.
 */
const LUZ_DEL_DIA = { value: 0 };

/**
 * El sol de ahora: la componente vertical de su dirección, la que ya usan el
 * cielo y las luces del aeropuerto. Por debajo del horizonte es noche; a diez
 * grados, día.
 */
export function ponerLaLuzDelDia(alturaDelSol: number): void {
  const t = Math.max(0, Math.min(1, (alturaDelSol + 0.03) / 0.2));
  LUZ_DEL_DIA.value = t * t * (3 - 2 * t);
}

/**
 * **Pinta algo como si fuera de noche**, y deja el sol donde estaba.
 *
 * Lo usa la tarjeta del avión, que enciende las luces para enseñar por qué se
 * encienden: de día, en el mundo, una de navegación es un punto de dos
 * píxeles —que es lo que pasa de verdad—, y en la tarjeta sería un botón que
 * no enciende nada. El valor es de todos, así que se pone, se pinta y se
 * devuelve en el mismo instante: el mundo no llega a verlo.
 */
export function deNoche<T>(pintar: () => T): T {
  const antes = LUZ_DEL_DIA.value;
  LUZ_DEL_DIA.value = 0;
  try {
    return pintar();
  } finally {
    LUZ_DEL_DIA.value = antes;
  }
}

type Clase = keyof typeof TAMANO;

/** Los colores, en el orden en que se ven en la norma. */
const VERDE = 0x2ad04a;
const ROJA = 0xe8352c;
const BLANCA = 0xf2f4f0;
const BALIZA = 0xff2a18;
/** El xenón tira a azul; la halógena del foco, a amarillo. */
const ESTROBO = 0xf4f8ff;
const FOCO = 0xfff6e0;

/** Dónde va cada luz en un avión, en su marco: el morro mira a −Z. */
export interface SitiosDeLuz {
  readonly alaDerecha: Vector3;
  readonly alaIzquierda: Vector3;
  readonly cola: Vector3;
  readonly lomo: Vector3;
  readonly panza: Vector3;
  readonly foco: Vector3;
  readonly morro: Vector3;
  /** Lo alto de la deriva: donde va la baliza de una avioneta. */
  readonly deriva: Vector3;
}

/**
 * Los sitios de las luces de un cuerpo ya montado: **las puntas de verdad**,
 * con la misma cuenta que el avión propio —ver `puntasDe`—, y además la
 * panza, donde va la otra baliza, y el morro, donde va el faro de rodaje.
 *
 * La baliza de abajo no es un capricho: un avión que cruza por encima de ti
 * enseña la panza, y es la única que se le ve.
 */
export function sitiosDeLuz(cuerpo: Object3D): SitiosDeLuz | null {
  const p = puntasDe(cuerpo);
  if (!p) return null;
  const ancho = Math.abs(p.ala.x - p.alaIzquierda.x);
  const panza = new Vector3(0, Infinity, p.lomo.z);
  const morro = new Vector3(0, 0, Infinity);
  const deriva = new Vector3(0, -Infinity, 0);
  const v = new Vector3();
  cuerpo.traverse((o) => {
    const pos = (o as Mesh).geometry?.getAttribute?.("position");
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      // En la franja del fuselaje: fuera de ella están las ruedas y los
      // motores, que bajan más que la panza.
      if (Math.abs(v.x) > ancho * 0.04) continue;
      if (v.z < morro.z) morro.copy(v);
      // Lo más alto por detrás del lomo: la punta de la deriva.
      if (v.z > p.lomo.z && v.y > deriva.y) deriva.copy(v);
      if (Math.abs(v.z - p.lomo.z) < ancho * 0.15 && v.y < panza.y)
        panza.copy(v);
    }
  });
  if (!Number.isFinite(panza.y)) panza.set(0, p.lomo.y - ancho * 0.1, p.lomo.z);
  if (!Number.isFinite(morro.z)) morro.set(0, p.foco.y, p.foco.z - ancho * 0.1);
  if (!Number.isFinite(deriva.y)) deriva.copy(p.cola).setY(p.lomo.y + ancho * 0.1);
  // Un dedo por fuera de la chapa, como las demás. Ver `puntasDe`.
  panza.y -= ancho * 0.01;
  morro.z -= ancho * 0.01;
  deriva.y += ancho * 0.01;
  return {
    alaDerecha: p.ala,
    alaIzquierda: p.alaIzquierda,
    cola: p.cola,
    lomo: p.lomo,
    panza,
    foco: p.foco,
    morro: new Vector3(0, morro.y - ancho * 0.02, morro.z),
    deriva,
  };
}

/** Lo mismo desde una geometría suelta, que es lo que trae la fábrica. */
export function sitiosDeGeometria(geo: BufferGeometry): SitiosDeLuz | null {
  const m = new Mesh(geo);
  m.updateMatrixWorld(true);
  return sitiosDeLuz(m);
}

/**
 * Y a ojo desde la envergadura, si no hay cuerpo del que sacarlas: las
 * pruebas, que no montan modelos.
 */
export function sitiosPorMedidas(envergadura: number): SitiosDeLuz {
  const m = envergadura / 2;
  return {
    alaDerecha: new Vector3(m, 0, 0.1 * m),
    alaIzquierda: new Vector3(-m, 0, 0.1 * m),
    cola: new Vector3(0, 0.15 * m, 0.85 * m),
    lomo: new Vector3(0, 0.2 * m, 0),
    panza: new Vector3(0, -0.12 * m, 0),
    foco: new Vector3(0.28 * m, 0, -0.15 * m),
    morro: new Vector3(0, -0.1 * m, -0.8 * m),
    deriva: new Vector3(0, 0.3 * m, 0.8 * m),
  };
}

/**
 * El material de todas las luces de una clase de tráfico.
 *
 * Es el de puntos de siempre, con **el tamaño por luz** en vez de uno para
 * todas: así las once de un avión van en una sola llamada de dibujo y la luz
 * apagada es un punto de tamaño cero, que no llega a pintarse. Apagarla con
 * el color en negro no valía: la niebla mezcla ese negro con su color y
 * dejaba de lejos un punto gris donde no había luz.
 */
export function materialDeLuces(): PointsMaterial {
  const material = new PointsMaterial({
    size: 1,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    map: laRedonda(),
  });
  material.onBeforeCompile = (s) => {
    s.uniforms.luzDelDia = LUZ_DEL_DIA;
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float tamano;\nattribute vec2 sector;\nattribute float deDia;\nuniform float luzDelDia;",
      )
      .replace("gl_PointSize = size;", HACIA_DONDE_ALUMBRA);
  };
  material.customProgramCacheKey = () => "luces-del-trafico";
  return material;
}

const grados = (g: number): number => (g * Math.PI) / 180;

/**
 * **Cuánto se pasa cada luz de su sector**, en radianes: entera hasta cinco
 * grados más allá del borde y apagándose del todo a los veinte. Ver
 * `HACIA_DONDE_ALUMBRA` y el 14 CFR 25.1395.
 */
export const DESBORDA = { entera: grados(5), hasta: grados(20) } as const;

/**
 * **Cuánto alumbra una luz hacia un lado**, de 0 a 1: `angulo` es desde el
 * morro, a derechas, y `sector` su centro y su media apertura. Es la misma
 * cuenta que hace la tarjeta, escrita aquí para poder comprobarla.
 */
export function alumbraHacia(
  sector: readonly [number, number],
  angulo: number,
): number {
  if (sector[1] >= Math.PI - 1e-6) return 1;
  const d = Math.abs(
    ((((angulo - sector[0] + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
      (2 * Math.PI)) -
      Math.PI,
  );
  const a = sector[1] + DESBORDA.entera;
  const b = sector[1] + DESBORDA.hasta;
  const t = Math.max(0, Math.min(1, (d - a) / (b - a)));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * **Y cada luz alumbra hacia donde alumbra**, que es la mitad de lo que
 * enseñan.
 *
 * Las de navegación no se ven desde todas partes, y es a propósito: la roja
 * cubre de frente hasta ciento diez grados a la izquierda, la verde lo mismo a
 * la derecha y la blanca los ciento cuarenta de atrás —el Anexo 2 de la OACI,
 * igual que en los barcos—. Por eso **ver la roja y la verde a la vez quiere
 * decir que viene de frente**, y ver solo la blanca, que se aleja. Con las
 * tres encendidas hacia todos lados, uno que se iba se veía rojo, verde y
 * blanco, igual que uno que venía: la lección al revés. Y los focos alumbran
 * hacia delante: de cara deslumbran, de espaldas no se ven.
 *
 * Se mira en el plano del avión —la dirección del ojo contada desde el
 * morro, en horizontal— y se decide en la tarjeta, luz a luz: once vértices,
 * ni una cuenta en la CPU.
 *
 * **Y se desbordan un poco, como las de verdad.** Con el borde a cuchillo
 * justo en el morro, desde trescientos metros delante de un reactor no se
 * veía ni la roja ni la verde: cada punta de ala está diecisiete metros a su
 * lado, y desde ella el ojo queda cuatro grados hacia el otro lado del eje.
 * Las de verdad no son así: el 14 CFR 25.1395 deja que cada luz de delante
 * pase al lado contrario a toda potencia hasta diez grados, y la limita a una
 * cuarta parte hasta veinte. Aquí, entera hasta cinco y apagándose hasta
 * veinte. Por eso de frente, aunque no sea exactamente de frente, se ven las
 * dos. Ver `DESBORDA`.
 */
const HACIA_DONDE_ALUMBRA = `
  float alumbra = 1.0;
  if ( sector.y < 3.1 ) {
    vec3 ojo = normalize( - mvPosition.xyz );
    vec3 derecha = normalize( ( modelViewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
    vec3 atras = normalize( ( modelViewMatrix * vec4( 0.0, 0.0, 1.0, 0.0 ) ).xyz );
    float desdeElMorro = atan( dot( ojo, derecha ), - dot( ojo, atras ) );
    float fuera = abs( mod( desdeElMorro - sector.x + PI, 2.0 * PI ) - PI );
    alumbra = 1.0 - smoothstep( sector.y + ${DESBORDA.entera.toFixed(4)}, sector.y + ${DESBORDA.hasta.toFixed(4)}, fuera );
  }
  gl_PointSize = size * tamano * alumbra * mix( 1.0, deDia, luzDelDia );
`;


/** Hacia todos lados: la baliza y los destellos. */
const TODO = [0, Math.PI] as const;

/** El orden de las luces en la geometría: once, y siempre las mismas. */
const ORDEN: readonly {
  clase: Clase;
  color: number;
  /** Hacia dónde alumbra, desde el morro y a derechas, y su media apertura. */
  sector: readonly [number, number];
}[] = [
  { clase: "navegacion", color: VERDE, sector: [grados(55), grados(55)] },
  { clase: "navegacion", color: ROJA, sector: [grados(-55), grados(55)] },
  { clase: "navegacion", color: BLANCA, sector: [Math.PI, grados(70)] },
  { clase: "baliza", color: BALIZA, sector: TODO },
  { clase: "baliza", color: BALIZA, sector: TODO },
  { clase: "estroboscopicas", color: ESTROBO, sector: TODO },
  { clase: "estroboscopicas", color: ESTROBO, sector: TODO },
  { clase: "estroboscopicas", color: ESTROBO, sector: TODO },
  { clase: "aterrizaje", color: FOCO, sector: [0, grados(40)] },
  { clase: "aterrizaje", color: FOCO, sector: [0, grados(40)] },
  { clase: "rodaje", color: FOCO, sector: [0, grados(40)] },
];

/**
 * **Lo que se le ve a otro avión de noche**, desde donde se le mira: es la
 * lección de las luces de navegación dicha al revés, desde el lado de quien
 * las ve.
 *
 * - `de-frente`: la roja y la verde a la vez —la verde a tu izquierda y la
 *   roja a tu derecha—, que es que viene hacia ti.
 * - `cruza-izquierda`: solo la roja, la de su ala izquierda: le estás viendo
 *   el costado izquierdo, así que va pasando hacia tu izquierda.
 * - `cruza-derecha`: solo la verde, y va hacia tu derecha.
 * - `se-aleja`: solo la blanca de la cola.
 *
 * Con los mismos sectores y el mismo desborde que pinta la tarjeta —ver
 * `alumbraHacia`—: lo que dice la tarjeta es lo que se ve en el cielo.
 * `rumbo` en grados, como en todo el juego; el norte es la Z negativa.
 */
export type LoQueSeLeVe =
  | "de-frente"
  | "cruza-izquierda"
  | "cruza-derecha"
  | "se-aleja";

export function queLucesSeLeVen(
  otro: { readonly x: number; readonly z: number; readonly rumbo: number },
  yo: { readonly x: number; readonly z: number },
): LoQueSeLeVe | null {
  const dx = yo.x - otro.x;
  const dz = yo.z - otro.z;
  if (Math.hypot(dx, dz) < 1) return null;
  // Dónde estás tú visto desde su morro, a derechas.
  const haciaTi = Math.atan2(dx, -dz) - grados(otro.rumbo);
  const verde = alumbraHacia(ORDEN[0]!.sector, haciaTi) > 0.5;
  const roja = alumbraHacia(ORDEN[1]!.sector, haciaTi) > 0.5;
  const blanca = alumbraHacia(ORDEN[2]!.sector, haciaTi) > 0.5;
  if (verde && roja) return "de-frente";
  if (roja) return "cruza-izquierda";
  if (verde) return "cruza-derecha";
  if (blanca) return "se-aleja";
  return null;
}

/** Hacia dónde alumbra cada luz, en el orden de la geometría. Para las pruebas. */
export const SECTORES: readonly (readonly [number, number])[] = ORDEN.map(
  (l) => l.sector,
);

/**
 * Las luces de un avión del tráfico: un `Points` para colgar de su grupo.
 *
 * `desfase` separa los destellos de unos y otros: dos aviones con la baliza
 * en fase parpadean como un árbol de Navidad, y en el cielo de verdad no hay
 * dos que vayan a la par.
 */
export class LucesDeUnAvion {
  readonly puntos: Points;
  private readonly tamanos: BufferAttribute;
  /** Lo que se encendió la última vez, para no subir lo mismo otra vez. */
  private encendidoAntes = -1;

  /** Las que este avión lleva de verdad, en el orden de la geometría. */
  private readonly lleva: readonly boolean[];

  constructor(
    sitios: SitiosDeLuz,
    material: PointsMaterial,
    private readonly desfase = 0,
    /** Qué lleva y dónde. Ver `equipoDe`. */
    equipo: EquipoDeLuces = DE_PASAJE,
  ) {
    const derivaSola = equipo.baliza === "deriva";
    const focoIzquierdo = new Vector3(
      -Math.abs(sitios.foco.x),
      sitios.foco.y,
      sitios.foco.z,
    );
    const donde = [
      sitios.alaDerecha,
      sitios.alaIzquierda,
      sitios.cola,
      derivaSola ? sitios.deriva : sitios.lomo,
      sitios.panza,
      sitios.alaDerecha,
      sitios.alaIzquierda,
      sitios.cola,
      new Vector3(Math.abs(sitios.foco.x), sitios.foco.y, sitios.foco.z),
      focoIzquierdo,
      // En el ala, un poco por fuera del de aterrizaje, como en el 172.
      equipo.rodaje === "ala"
        ? focoIzquierdo.clone().setX(focoIzquierdo.x * 1.25)
        : sitios.morro,
    ];
    this.lleva = [
      true,
      true,
      true,
      true,
      !derivaSola,
      equipo.estroboscopicas !== "ninguna",
      equipo.estroboscopicas !== "ninguna",
      equipo.estroboscopicas === "puntas-y-cola",
      // El de aterrizaje de la derecha, salvo en la clase que los lleva los
      // dos en el ala izquierda. Ver `equipoDe`.
      equipo.focos !== "ala-izquierda",
      true,
      true,
    ];
    const pos = new Float32Array(ORDEN.length * 3);
    const col = new Float32Array(ORDEN.length * 3);
    const sectores = new Float32Array(ORDEN.length * 2);
    const deDia = new Float32Array(ORDEN.length);
    ORDEN.forEach(({ color, sector, clase }, i) => {
      const p = donde[i]!;
      pos.set([p.x, p.y, p.z], i * 3);
      sectores.set(sector, i * 2);
      deDia[i] = DE_DIA[clase];
      col.set(
        [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255],
        i * 3,
      );
    });
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("color", new BufferAttribute(col, 3));
    geo.setAttribute("sector", new BufferAttribute(sectores, 2));
    geo.setAttribute("deDia", new BufferAttribute(deDia, 1));
    this.tamanos = new BufferAttribute(new Float32Array(ORDEN.length), 1);
    geo.setAttribute("tamano", this.tamanos);
    this.puntos = new Points(geo, material);
    this.puntos.name = "luces-del-trafico";
    /*
     * El avión entero entra en pantalla antes que sus luces, y una caja de
     * once puntos que se recorta sola por el borde apagaba las puntas de ala
     * al asomar. Son once vértices: dibujarlos siempre no cuesta nada.
     */
    this.puntos.frustumCulled = false;
  }

  /** Cuánto mide cada luz ahora, de 0 —apagada— a su tamaño. Para las pruebas. */
  get tamanosAhora(): readonly number[] {
    return Array.from(this.tamanos.array as Float32Array);
  }

  /** Un fotograma: qué luces van encendidas en este instante. */
  paso(segundos: number, encendidas: Encendidas): void {
    const t = segundos + this.desfase;
    const ahora = {
      navegacion: encendidas.navegacion,
      baliza: encendidas.baliza && destellaAhora(t),
      estroboscopicas: encendidas.estroboscopicas && estroboAhora(t),
      aterrizaje: encendidas.aterrizaje,
      rodaje: encendidas.rodaje,
    };
    const clave =
      (ahora.navegacion ? 1 : 0) |
      (ahora.baliza ? 2 : 0) |
      (ahora.estroboscopicas ? 4 : 0) |
      (ahora.aterrizaje ? 8 : 0) |
      (ahora.rodaje ? 16 : 0);
    if (clave === this.encendidoAntes) return;
    this.encendidoAntes = clave;
    ORDEN.forEach(({ clase }, i) =>
      this.tamanos.setX(i, this.lleva[i] && ahora[clase] ? TAMANO[clase] : 0),
    );
    this.tamanos.needsUpdate = true;
  }

  dispose(): void {
    this.puntos.geometry.dispose();
  }
}

/**
 * Un número fijo por avión para separar sus destellos de los demás, s. Sale
 * del nombre, así que el mismo avión parpadea igual toda la partida.
 */
export function desfaseDe(nombre: string): number {
  let h = 0;
  for (let i = 0; i < nombre.length; i++)
    h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000 * CADA_ESTROBO;
}
