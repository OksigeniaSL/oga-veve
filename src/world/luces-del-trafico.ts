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
      (fase === "volando" && focoEncendido(altitud, false)),
  };
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
      if (Math.abs(v.z - p.lomo.z) < ancho * 0.15 && v.y < panza.y)
        panza.copy(v);
    }
  });
  if (!Number.isFinite(panza.y)) panza.set(0, p.lomo.y - ancho * 0.1, p.lomo.z);
  if (!Number.isFinite(morro.z)) morro.set(0, p.foco.y, p.foco.z - ancho * 0.1);
  // Un dedo por fuera de la chapa, como las demás. Ver `puntasDe`.
  panza.y -= ancho * 0.01;
  morro.z -= ancho * 0.01;
  return {
    alaDerecha: p.ala,
    alaIzquierda: p.alaIzquierda,
    cola: p.cola,
    lomo: p.lomo,
    panza,
    foco: p.foco,
    morro: new Vector3(0, morro.y - ancho * 0.02, morro.z),
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
 */
const HACIA_DONDE_ALUMBRA = `
  float alumbra = 1.0;
  if ( sector.y < 3.1 ) {
    vec3 ojo = normalize( - mvPosition.xyz );
    vec3 derecha = normalize( ( modelViewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
    vec3 atras = normalize( ( modelViewMatrix * vec4( 0.0, 0.0, 1.0, 0.0 ) ).xyz );
    float desdeElMorro = atan( dot( ojo, derecha ), - dot( ojo, atras ) );
    float fuera = abs( mod( desdeElMorro - sector.x + PI, 2.0 * PI ) - PI );
    alumbra = 1.0 - smoothstep( sector.y, sector.y + 0.06, fuera );
  }
  gl_PointSize = size * tamano * alumbra * mix( 1.0, deDia, luzDelDia );
`;

const grados = (g: number): number => (g * Math.PI) / 180;

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

  constructor(
    sitios: SitiosDeLuz,
    material: PointsMaterial,
    private readonly desfase = 0,
  ) {
    const donde = [
      sitios.alaDerecha,
      sitios.alaIzquierda,
      sitios.cola,
      sitios.lomo,
      sitios.panza,
      sitios.alaDerecha,
      sitios.alaIzquierda,
      sitios.cola,
      new Vector3(Math.abs(sitios.foco.x), sitios.foco.y, sitios.foco.z),
      new Vector3(-Math.abs(sitios.foco.x), sitios.foco.y, sitios.foco.z),
      sitios.morro,
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
      this.tamanos.setX(i, ahora[clase] ? TAMANO[clase] : 0),
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
