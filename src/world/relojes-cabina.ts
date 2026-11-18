/**
 * Los relojes del panel, encendidos.
 *
 * Los modelos traen instrumentos redondos en el tablero y eran **discos grises
 * lisos**: sin esfera, sin marcas, sin aguja y sin decir nada. Desde el asiento
 * lo que se veía eran manchas, y así se enseñó — se pusieron sin mirarlos nunca
 * desde el asiento. Quien lo jugó lo resumió en una línea: «sólo con ver los
 * cuadros de cabina me hago una idea de la respuesta».
 *
 * Aquí se encienden: escala, aguja, cifra y rótulo, dibujados por código sobre
 * un lienzo, igual que las dos pantallas grandes —ver `pantallas-cabina.ts`,
 * que es de donde sale toda la maquinaria de textura y espejo—.
 *
 * ## Y solo marcan lo que el juego sabe
 *
 * Un panel de verdad lleva decenas de instrumentos y este juego no calcula
 * decenas de cosas. Inventarlas sería peor que no ponerlas: un avión que enseña
 * una temperatura de aceite que no existe le está enseñando a alguien de cuatro
 * años que los instrumentos son adorno. Así que hay los seis de vuelo y, del
 * resto, solo lo que el juego sabe:
 *
 * - **El régimen de cada motor**, que es el mando con el que se vuela: `rpm` en
 *   un pistón, `par` en un turbohélice —su hélice gira a vueltas constantes, lo
 *   que cambia es la fuerza— y `n1` en un turbofán.
 * - **Los flaps**, que es lo otro que quien juega mueve y puede ver moverse.
 * - **El depósito**, que es lo primero que se mira antes de salir.
 * - **Las luces del tren**, en el avión que lo mete.
 *
 * El resto de la cabina —los interruptores del techo, las palancas del
 * pedestal— es escenografía y no finge ser otra cosa: en un avión de verdad
 * tampoco se toca casi nada de lo que se ve.
 *
 * ## Y cada reloj es el del cuadro plano
 *
 * Con las mismas marcas, las mismas cifras, los mismos arcos y el mismo
 * barrido, porque **no los decide este fichero**: los lee de la escala del
 * avión —ver `ui/cuadro.ts`— igual que el cuadro plano, y con las mismas
 * medidas en proporción. Cada vista se hacía sus cuentas y el mismo avión
 * llevaba un anemómetro de cuarenta en cuarenta dentro y otro de veinte en
 * veinte fuera, un tacómetro dentro y un tanto por ciento fuera, y un
 * variómetro con el cero arriba en un sitio y a las nueve en el otro: «los
 * paneles de los aviones no coinciden en diferentes vistas».
 *
 * ## Cómo se enchufa
 *
 * El modelo pinta cada esfera con un material `reloj_<qué>` —ver `reloj()` en
 * `modelos/comun.py`— y aquí se busca ese nombre. Lo que va detrás del guion
 * bajo dice qué dibujo le toca.
 */

import {
  CanvasTexture,
  DoubleSide,
  Vector2,
  Vector3,
  LinearFilter,
  MeshBasicMaterial,
  Raycaster,
  SRGBColorSpace,
  type Camera,
  type Mesh,
  type Object3D,
} from "three";
import { apunta, desdePara, type Peldano } from "../ui/familia";
import {
  CABECEO_POR_GRADO,
  COLOR_DE_ARCO,
  MEDIDAS,
  RAYAS_DE_CABECEO,
  anguloEn,
  bolaDelViraje,
  cifraDeMotor,
  enLaEscala,
  flapsEnLaEscala,
  puntoEn,
  rotuloDeMotor,
  valorDeMotor,
  VENTANA_DE_PRESION,
  type Cuadro,
  type Escala,
} from "../ui/cuadro";
import { PALETA } from "../ui/paleta";
import { enLaMuesca } from "../flight/flaps";
import { bienPuesta } from "../flight/altimetro";
import { luzDeTren } from "../flight/tren";
import { POR_SEGUNDO_DESDE_FUERA } from "./pantallas-cabina";
import type { LaRadioPintada } from "../ui/radio-en-la-rosa";

/** Lado del lienzo de cada reloj, en píxeles. */
const LADO = 256;

/** Cuántas veces por segundo se repintan. Lo mismo que las pantallas. */
const POR_SEGUNDO = 12;

/**
 * El radio de la cara, en píxeles del lienzo. Todo lo de dentro se mide en
 * fracciones de él —ver `MEDIDAS`—, igual que en el cuadro plano.
 */
const R = LADO * 0.42;
const C = LADO / 2;

/** La tipografía de la cabina, la misma que la del cuadro plano. */
const FUENTE = '"Roboto Condensed", "Arial Narrow", system-ui, sans-serif';

/** Lo que marca un reloj que no es de los seis de vuelo. */
export type DeMotor = "n1" | "rpm" | "par" | "flaps" | "fuel" | "tren";

/**
 * Y los seis de vuelo, **que son los que de verdad se vuelan**.
 *
 * Hasta hoy en el tablero de una avioneta había dos relojes de motor y dos
 * cristales de G1000, y un comentario que lo justificaba así: «no son
 * instrumentos que funcionen; lo que se lee de verdad está en el HUD». Eso
 * valía mientras el HUD se viera desde la cabina. Desde que ahí el cuadro es
 * el del avión, la decoración se quedó de único panel — y encima era la de
 * otra familia: un entrenador de escuela con pantallas de cristal.
 *
 * Son los mismos seis que `ui/six-pack.ts` dibuja en el cuadro plano, en el
 * mismo orden y con las mismas escalas. Ver `familiaDe` en `ui/familia.ts`.
 */
export type DeVuelo = "asi" | "ai" | "alt" | "tc" | "dg" | "vsi";

export type QueMide = DeMotor | DeVuelo;

/** Los que se entienden aquí: lo que no esté en la lista no se enciende. */
const CONOCIDOS = new Set<string>([
  "n1",
  "rpm",
  "par",
  "flaps",
  "fuel",
  "tren",
  "asi",
  "ai",
  "alt",
  "tc",
  "dg",
  "vsi",
]);

/** Los de motor, que se numeran de izquierda a derecha. */
const DE_MOTOR = new Set<string>(["n1", "rpm", "par"]);

export interface DatosDeRelojes {
  /**
   * El régimen de los motores, de 0 a 1, **uno por motor**.
   *
   * Sale del mismo sitio que el sonido —ver `regimen` en `ui/cuadro.ts`—, y eso
   * no es una comodidad: si la aguja dijera una cosa y el motor sonara otra, el
   * instrumento dejaría de ser un instrumento.
   */
  readonly motores: readonly number[];
  /** Dónde están los flaps, de 0 a 1 del recorrido de la palanca. */
  readonly flaps: number;
  /**
   * El peldaño, de uno a cuatro. **Decide si el reloj lleva letras.**
   *
   * Un reloj de motor con su banda verde y su aguja se lee sin saber leer; el
   * «RPM 1» y el «2400» de debajo, no. Misma regla que las pantallas grandes y
   * que el cuadro plano. Ver `LETRAS_DESDE` en `ui/familia.ts`.
   */
  readonly peldano: Peldano;
  /** Velocidad **indicada**, en nudos: la que marca el cuadro plano. */
  readonly velocidad: number;
  /** Altitud, en pies. */
  readonly pies: number;
  /** Velocidad vertical, en pies por minuto. */
  readonly fpm: number;
  /** Rumbo **magnético**, en grados: el que va pintado en la cabecera. */
  readonly rumbo: number;
  /**
   * Cabeceo y alabeo, **en grados**.
   *
   * Llegaban en radianes a un dibujo que los leía en grados, así que el
   * horizonte de la cabina se movía cincuenta y siete veces menos que el del
   * cuadro plano: con el avión alabeado treinta grados, dentro se veía
   * nivelado.
   */
  readonly cabeceo: number;
  readonly alabeo: number;
  /** El derrape, en radianes: lo que mueve la bola. Ver `bolaDelViraje`. */
  readonly derrape: number;
  /** La ventanilla del altímetro: lo puesto y lo del sitio, hPa. */
  readonly presion: {
    readonly puesta: number;
    readonly delSitio: number;
  } | null;
  /** El depósito, el mismo que ve el cuadro plano. */
  readonly combustible: {
    readonly kilos: number;
    readonly estado: "bien" | "reserva" | "poco";
  } | null;
  /** Dónde está el tren: 0 dentro, 1 fuera y trabado. */
  readonly tren: number;
  /** Las escalas de **este** avión: sin ellas la esfera miente. */
  readonly cuadro: Cuadro;
  /**
   * **La radio de navegación, ya decidida**: la misma `LaRadioPintada` con la
   * que el cuadro plano hace HSI su direccional (`radioEnElDireccionalSvg`),
   * salida de la misma lectura de la NAV y del ADF. `null` o sin poner, el
   * avión no lleva caja o el peldaño no tiene radio: el direccional se queda
   * en giróscopo. Ver `radioEnElDireccional`.
   */
  readonly radio?: LaRadioPintada | null;
  /**
   * **El rumbo de la marca** del direccional, magnético, grados: el mismo que
   * pone el cuadro plano en el suyo (`SixPack.update`), del objetivo del
   * vuelo. `null` o sin poner, sin marca. Ver `direccional`.
   */
  readonly rumboPedido?: number | null;
  /**
   * **Lo que marca la brújula del parabrisas**, magnético, grados: la que
   * baila al virar y al acelerar (`flight/brujula.ts`, ADR 0031, enmienda
   * H26q). Solo la mueve a ella; el direccional sigue con `rumbo`. Sin poner,
   * la brújula marca `rumbo`, como antes.
   */
  readonly brujula?: number | null;
  /**
   * **Lo que marca el direccional**, grados: el rumbo magnético más lo que se
   * ha ido su giróscopo, que no está esclavizado a nada (`flight/direccional.ts`,
   * ADR 0031, enmienda H26r). Solo gira su rosa y lo que va en ella; la aguja
   * del ADF sigue apuntando a la estación con `rumbo`. Sin poner, `rumbo`.
   */
  readonly direccional?: number | null;
}

interface Esfera {
  readonly g: CanvasRenderingContext2D;
  readonly textura: CanvasTexture;
  readonly material: MeshBasicMaterial;
  readonly que: QueMide;
  /** Qué motor le toca, si mide un motor. */
  readonly motor: number;
  /**
   * **Si es la brújula** del parabrisas, que lleva la cara del direccional
   * (`reloj_dg`) pero es un imán: la radio no va en ella. Ver
   * `radioEnElDireccional`.
   */
  readonly brujula: boolean;
}

export interface Relojes {
  /** Qué relojes hay y qué mide cada uno. Para comprobarlo desde fuera. */
  readonly hay: readonly { readonly uuid: string; readonly que: QueMide }[];
  /**
   * Con `desdeFuera`, a las mismas veces por segundo que las pantallas vistas
   * desde fuera, y por lo mismo: ver `POR_SEGUNDO_DESDE_FUERA` en
   * `pantallas-cabina.ts`.
   */
  actualizar(datos: DatosDeRelojes, dt: number, desdeFuera?: boolean): void;
  /**
   * **La rueda del altímetro, con el dedo**: si el punto de la pantalla
   * —coordenadas de −1 a 1, como `cualEsta` de los botones— cae en la esfera
   * del altímetro, −1 en su mitad izquierda y 1 en la derecha; si no, 0. Un
   * altímetro de verdad lleva la rueda abajo a la izquierda de la caja, que
   * en el modelo no es una pieza aparte: la esfera entera es la diana, que es
   * lo que se alcanza con un dedo desde el asiento. Ver `pulsarElMando` en
   * `game.ts`.
   */
  ruedaDelAltimetro(x: number, y: number, camara: Camera): -1 | 0 | 1;
  /**
   * **La perilla del direccional, con el dedo**, como la rueda del altímetro:
   * −1 en la mitad izquierda de su esfera y 1 en la derecha; 0 fuera. La
   * perilla de verdad va abajo a la izquierda de la caja, y aquí tampoco es
   * una pieza: la esfera entera es la diana. La brújula del parabrisas lleva
   * la misma cara y no cuenta, que es un imán y no se gira. Ver
   * `girarElDireccional` en `game.ts` y `flight/direccional.ts`.
   */
  perillaDelDireccional(x: number, y: number, camara: Camera): -1 | 0 | 1;
  dispose(): void;
}

function nuevaEsfera(que: QueMide, motor: number, brujula = false): Esfera | null {
  const lienzo = document.createElement("canvas");
  lienzo.width = LADO;
  lienzo.height = LADO;
  const g = lienzo.getContext("2d");
  if (!g) return null;
  const textura = new CanvasTexture(lienzo);
  textura.generateMipmaps = false;
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  textura.flipY = false;
  /*
   * **Y en sRGB, que es en lo que pinta un lienzo.** Sin decirlo, three.js la
   * toma por lineal y la aclara al sacarla a pantalla: el fondo casi negro de
   * la esfera salía gris azulado, y cada reloj parecía montado en una
   * baldosa cuadrada encima del tablero.
   */
  textura.colorSpace = SRGBColorSpace;
  // Básico, como las pantallas: un instrumento iluminado no se apaga con el
  // sol. Ver `pantallas-cabina.ts`.
  /*
   * **Y por las dos caras.** El cuadrado de la esfera sale de Blender mirando a
   * donde mira, y al montar la cabina puede quedar de espaldas al asiento: con
   * una sola cara, lo que se ve es el agujero y detrás la caja gris — que es
   * exactamente lo que este módulo venía a quitar. Dos caras cuestan lo mismo
   * en una malla de dos triángulos y quitan toda una clase de fallo.
   */
  const material = new MeshBasicMaterial({
    map: textura,
    toneMapped: false,
    side: DoubleSide,
  });
  return { g, textura, material, que, motor, brujula };
}

/** Estira las coordenadas de textura al lienzo entero. Ver `pantallas-cabina`. */
function estirarUV(malla: Mesh): void {
  const uv = malla.geometry.getAttribute("uv");
  if (!uv) return;
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    uMin = Math.min(uMin, uv.getX(i));
    uMax = Math.max(uMax, uv.getX(i));
    vMin = Math.min(vMin, uv.getY(i));
    vMax = Math.max(vMax, uv.getY(i));
  }
  const du = uMax - uMin;
  const dv = vMax - vMin;
  if (du <= 0 || dv <= 0) return;
  /*
   * **Y aquí se invierte la vertical y no la horizontal.**
   *
   * Las pantallas grandes invierten las dos y encima dibujan en espejo, porque
   * se ven por su cara de atrás. Estas no: son cuadrados del panel mirando al
   * asiento. Copiando aquello tal cual, los rótulos salían al revés —«N1»
   * escrito de derecha a izquierda— con el resto del dibujo bien, que es
   * exactamente la firma de un eje invertido de más.
   */
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - uMin) / du, 1 - (uv.getY(i) - vMin) / dv);
  }
  uv.needsUpdate = true;
}

/**
 * Enciende los relojes de un modelo. `null` si no trae ninguno.
 *
 * Los de motor se ordenan por su sitio en el avión —de izquierda a derecha—
 * para que el número 1 sea el de la izquierda, como en cualquier cabina.
 */
export function encenderRelojes(raiz: Object3D): Relojes | null {
  const deMotor: { malla: Mesh; que: QueMide; x: number }[] = [];
  const otros: { malla: Mesh; que: QueMide; brujula: boolean }[] = [];
  raiz.updateWorldMatrix(true, true);
  raiz.traverse((o) => {
    const m = o as Mesh;
    const nombre = (m.material as { name?: string } | undefined)?.name ?? "";
    if (!m.isMesh || !nombre.startsWith("reloj_")) return;
    const que = nombre.slice("reloj_".length) as QueMide;
    if (!CONOCIDOS.has(que)) return;
    // Los de motor, de izquierda a derecha, para que el número 1 sea el de
    // la izquierda como en cualquier cabina. El resto mide lo suyo y ya.
    if (DE_MOTOR.has(que))
      deMotor.push({ malla: m, que, x: m.getWorldPosition(new Vector3()).x });
    // La brújula cuelga del parabrisas con el nombre que le pone el modelo (`parabrisas_por_dentro`).
    else otros.push({ malla: m, que, brujula: m.name === "brujula" });
  });
  if (!deMotor.length && !otros.length) return null;
  deMotor.sort((a, b) => a.x - b.x);

  const esferas: Esfera[] = [];
  const hay: { uuid: string; que: QueMide }[] = [];
  deMotor.forEach(({ malla, que }, i) => {
    const e = nuevaEsfera(que, i);
    if (!e) return;
    estirarUV(malla);
    malla.material = e.material;
    esferas.push(e);
    hay.push({ uuid: malla.uuid, que });
  });
  for (const { malla, que, brujula } of otros) {
    const e = nuevaEsfera(que, -1, brujula);
    if (!e) continue;
    estirarUV(malla);
    malla.material = e.material;
    esferas.push(e);
    hay.push({ uuid: malla.uuid, que });
  }
  if (!esferas.length) return null;

  let desde = 0;
  const altimetros = [...deMotor, ...otros].filter((m) => m.que === "alt").map((m) => m.malla);
  const direccionales = otros.filter((m) => m.que === "dg" && !m.brujula).map((m) => m.malla);
  const rayo = new Raycaster();
  const punto = new Vector2();
  const mitad = (mallas: Mesh[], x: number, y: number, camara: Camera): -1 | 0 | 1 => {
    if (!mallas.length) return 0;
    punto.set(x, y);
    rayo.setFromCamera(punto, camara);
    const uv = rayo.intersectObjects(mallas, false)[0]?.uv;
    if (!uv) return 0;
    return uv.x < 0.5 ? -1 : 1;
  };
  return {
    hay,
    ruedaDelAltimetro(x, y, camara) {
      return mitad(altimetros, x, y, camara);
    },
    perillaDelDireccional(x, y, camara) {
      return mitad(direccionales, x, y, camara);
    },
    actualizar(datos, dt, desdeFuera = false) {
      desde += dt;
      if (desde < 1 / (desdeFuera ? POR_SEGUNDO_DESDE_FUERA : POR_SEGUNDO)) return;
      desde = 0;
      for (const e of esferas) {
        /*
         * **Y aquí no hay espejo que deshacer.**
         *
         * Las dos pantallas grandes se dibujan del revés porque se ven por su
         * cara de atrás —ver `pantallas-cabina.ts`—, y estas no: son cuadrados
         * del panel mirando al asiento. Copiar aquel espejo dejaba los rótulos
         * y las cifras al revés, que es como salió la primera versión: «N1» y
         * «3596» escritos de derecha a izquierda.
         */
        e.g.setTransform(1, 0, 0, 1, 0, 0);
        pintarReloj(
          e.g,
          e.que,
          e.motor,
          e.brujula ? loQueMarcaLaBrujula(datos) : datos,
        );
        e.textura.needsUpdate = true;
      }
    },
    dispose() {
      for (const e of esferas) {
        e.textura.dispose();
        e.material.dispose();
      }
    },
  };
}

/**
 * **Lo que pinta la brújula del parabrisas**, que lleva la cara del
 * direccional y es un imán: ni radio ni marca de rumbo, y su rumbo es el
 * suyo, el que baila (`DatosDeRelojes.brujula`). Aparte para probarlo sin
 * modelo. Ver `flight/brujula.ts`.
 */
export function loQueMarcaLaBrujula(d: DatosDeRelojes): DatosDeRelojes {
  return { ...d, rumbo: d.brujula ?? d.rumbo, radio: null, rumboPedido: null, direccional: null };
}

// ── El pincel ──────────────────────────────────────────────────────────

/**
 * Escribe, **si a este peldaño le toca ese texto**.
 *
 * Igual que en las pantallas grandes: la cifra de un régimen es parte de la
 * medida y entra en el primer peldaño; el «RPM 1» de al lado es un nombre y
 * espera al tercero. Ver `desdePara` en `ui/familia.ts`.
 */
function escribir(
  d: DatosDeRelojes,
  g: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  alto: number,
  color: string,
  giro = 0,
): void {
  if (!texto || d.peldano < desdePara(texto)) return;
  // Y se apunta, en el mismo sitio que las pantallas de cristal: el banco no
  // puede contar lo que hay en un lienzo, así que lo cuenta quien lo pinta.
  apunta(texto);
  g.save();
  g.translate(x, y);
  if (giro) g.rotate(giro);
  g.fillStyle = color;
  g.font = `600 ${Math.round(alto)}px ${FUENTE}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(texto, 0, 0);
  g.restore();
}

/** Un punto de la esfera en el lienzo. */
function en(e: Escala, f: number, fraccionDeRadio: number) {
  const p = puntoEn(e.barrido, f, fraccionDeRadio * R);
  return { x: C + p.x, y: C + p.y };
}

/** Del ángulo de la escala —desde las doce— al del lienzo, que empieza a las tres. */
function alLienzo(grados: number): number {
  return ((grados - 90) * Math.PI) / 180;
}

/** La caja: fondo, cara y el aro, para que la esfera no se funda con el tablero. */
function cara(g: CanvasRenderingContext2D): void {
  g.fillStyle = PALETA.bisel;
  g.fillRect(0, 0, LADO, LADO);
  g.fillStyle = PALETA.esfera;
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PALETA.filo;
  g.lineWidth = R * 0.07;
  g.beginPath();
  g.arc(C, C, R * 1.05, 0, Math.PI * 2);
  g.stroke();
}

/**
 * La escala entera: arcos, marcas, cifras y raya roja. **La misma cuenta que
 * `escalaSvg`** en `ui/esfera-svg.ts`, con pincel en vez de con SVG.
 */
function escala(
  d: DatosDeRelojes,
  g: CanvasRenderingContext2D,
  e: Escala,
  radial = false,
): void {
  for (const a of e.arcos) {
    if (a.hasta <= a.desde) continue;
    g.strokeStyle = COLOR_DE_ARCO[a.color];
    g.lineWidth = R * MEDIDAS.anchoDeArco;
    g.lineCap = "butt";
    g.beginPath();
    g.arc(
      C,
      C,
      R * (a.color === "blanco" ? MEDIDAS.arcoBlanco : MEDIDAS.arco),
      alLienzo(anguloEn(e.barrido, a.desde)),
      alLienzo(anguloEn(e.barrido, a.hasta)),
    );
    g.stroke();
  }
  g.strokeStyle = PALETA.valor;
  for (const m of e.marcas) {
    const p1 = en(e, m.en, m.larga ? MEDIDAS.marcaLarga : MEDIDAS.marcaCorta);
    const p2 = en(e, m.en, MEDIDAS.marcaFuera);
    g.lineWidth = R * (m.larga ? 0.042 : 0.026);
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.stroke();
  }
  for (const m of e.marcas) {
    if (m.cifra === null) continue;
    const p = en(e, m.en, MEDIDAS.cifra);
    escribir(
      d,
      g,
      m.cifra,
      p.x,
      p.y,
      R * MEDIDAS.letra,
      PALETA.valor,
      radial ? (anguloEn(e.barrido, m.en) * Math.PI) / 180 : 0,
    );
  }
  if (e.raya !== null) {
    const p1 = en(e, e.raya, MEDIDAS.marcaLarga - 0.04);
    const p2 = en(e, e.raya, MEDIDAS.marcaFuera + 0.02);
    g.strokeStyle = PALETA.limite;
    g.lineWidth = R * 0.056;
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.stroke();
  }
}

/** La aguja, con la forma de la del cuadro plano, a esa fracción. */
function aguja(
  g: CanvasRenderingContext2D,
  e: Escala,
  f: number,
  largo: number = MEDIDAS.aguja,
  color: string = PALETA.valor,
): void {
  const l = largo * R;
  g.save();
  g.translate(C, C);
  g.rotate((anguloEn(e.barrido, f) * Math.PI) / 180);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(-R * 0.056, -l * 0.75);
  g.lineTo(0, -l);
  g.lineTo(R * 0.056, -l * 0.75);
  g.closePath();
  g.fill();
  g.restore();
}

function buje(g: CanvasRenderingContext2D): void {
  g.fillStyle = "#2a2f35";
  g.beginPath();
  g.arc(C, C, R * 0.079, 0, Math.PI * 2);
  g.fill();
}

/** El rótulo, abajo en el hueco del barrido o dentro si no lo hay. */
function rotulo(
  d: DatosDeRelojes,
  g: CanvasRenderingContext2D,
  texto: string,
  e: Escala | null,
): void {
  const y = e?.rotuloDentro ? MEDIDAS.rotuloDentro : MEDIDAS.rotulo;
  escribir(d, g, texto, C, C + y * R, R * MEDIDAS.letraMenuda * 1.15, PALETA.apagado);
}

function unidad(d: DatosDeRelojes, g: CanvasRenderingContext2D, e: Escala): void {
  if (!e.unidad) return;
  escribir(d, g, e.unidad, C, C + MEDIDAS.unidad * R, R * MEDIDAS.letraMenuda, PALETA.apagado);
}

/**
 * Pinta un reloj entero en su lienzo.
 *
 * Aparte y exportada porque **es lo que se compara**: la prueba de las dos
 * vistas le da un lienzo de mentira que apunta lo que se escribe, y lo pone al
 * lado de lo que lleva el SVG del cuadro plano. Ver `cuadro-dos-vistas.test.ts`.
 */
export function pintarReloj(
  g: CanvasRenderingContext2D,
  que: QueMide,
  motor: number,
  d: DatosDeRelojes,
): void {
  const c = d.cuadro;
  cara(g);
  switch (que) {
    case "asi":
      escala(d, g, c.anemometro);
      unidad(d, g, c.anemometro);
      aguja(g, c.anemometro, enLaEscala(c.anemometro, d.velocidad));
      rotulo(d, g, c.anemometro.rotulo, c.anemometro);
      break;
    case "alt":
      altimetro(d, g);
      break;
    case "vsi":
      escala(d, g, c.variometro);
      unidad(d, g, c.variometro);
      aguja(g, c.variometro, enLaEscala(c.variometro, d.fpm));
      rotulo(d, g, c.variometro.rotulo, c.variometro);
      break;
    case "dg":
      direccional(d, g);
      break;
    case "ai":
      horizonte(d, g);
      rotulo(d, g, "ATT", null);
      break;
    case "tc":
      viraje(d, g);
      rotulo(d, g, "T/C", null);
      break;
    case "tren":
      lucesDelTren(d, g);
      return;
    default:
      deMotor(d, g, que, motor);
      return;
  }
  buje(g);
}

/**
 * El altímetro: la vuelta entera, la larga de los cientos y la corta de los
 * miles, y **la ventanilla de Kollsman**, que la cabina no llevaba.
 */
function altimetro(d: DatosDeRelojes, g: CanvasRenderingContext2D): void {
  const e = d.cuadro.altimetro;
  escala(d, g, e);
  unidad(d, g, e);
  rotulo(d, g, e.rotulo, e);
  const v = VENTANA_DE_PRESION;
  g.fillStyle = "#0b0d10";
  g.strokeStyle = "#45484d";
  g.lineWidth = R * 0.014;
  g.fillRect(C + v.x * R, C + v.y * R, v.ancho * R, v.alto * R);
  g.strokeRect(C + v.x * R, C + v.y * R, v.ancho * R, v.alto * R);
  if (d.presion) {
    escribir(
      d,
      g,
      String(Math.round(d.presion.puesta)),
      C + (v.x + v.ancho / 2) * R,
      C + (v.y + v.alto / 2) * R,
      R * 0.186,
      bienPuesta(d.presion.puesta, d.presion.delSitio)
        ? PALETA.valor
        : PALETA.precaucion,
    );
  }
  const pies = Math.max(0, d.pies);
  aguja(g, e, (pies % 10000) / 10000, MEDIDAS.agujaCorta);
  aguja(g, e, (pies % 1000) / 1000);
}

/**
 * El direccional: **gira la rosa, no la aguja**. Es al revés que todos los
 * demás y es lo que lo hace legible sin leer — lo que uno lleva delante
 * siempre está arriba.
 */
function direccional(d: DatosDeRelojes, g: CanvasRenderingContext2D): void {
  const e = d.cuadro.rosa;
  // La rosa, con lo que se haya ido el giróscopo: ver `DatosDeRelojes.direccional`.
  const tarjeta = d.direccional ?? d.rumbo;
  g.save();
  g.translate(C, C);
  g.rotate((-tarjeta * Math.PI) / 180);
  g.translate(-C, -C);
  escala(d, g, e, true);
  g.restore();
  // La marca de rumbo, en el borde de la rosa, en magenta: la misma del cuadro plano. Va en la rosa, y se va con ella.
  if (d.rumboPedido != null) marcaDeRumbo(g, d.rumboPedido - tarjeta);
  // Y desde el peldaño de la radio, el curso y la aguja encima: un HSI, como en el cuadro plano.
  if (d.radio) radioEnElDireccional(g, d.radio, tarjeta, d.rumbo);
  // El avioncito, fijo y mirando arriba: lo que se lee es lo que tiene encima.
  g.strokeStyle = PALETA.simbolo;
  g.lineWidth = R * 0.042;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(C, C - 0.37 * R);
  g.lineTo(C, C + 0.28 * R);
  g.moveTo(C - 0.23 * R, C);
  g.lineTo(C + 0.23 * R, C);
  g.moveTo(C - 0.12 * R, C + 0.23 * R);
  g.lineTo(C + 0.12 * R, C + 0.23 * R);
  g.stroke();
  rotulo(d, g, e.rotulo, e);
}

/**
 * **La marca de rumbo**, girada `giro` grados desde arriba: la del cuadro plano
 * (`dg__marca` en `SixPack`), en las unidades de su esfera llevadas al lienzo.
 */
function marcaDeRumbo(g: CanvasRenderingContext2D, giro: number): void {
  const u = R / 43;
  g.save();
  g.translate(C, C);
  g.rotate((giro * Math.PI) / 180);
  g.fillStyle = PALETA.objetivo;
  g.beginPath();
  g.moveTo(-3.6 * u, -43 * u);
  g.lineTo(3.6 * u, -43 * u);
  g.lineTo(3.6 * u, -39.6 * u);
  g.lineTo(0, -36.4 * u);
  g.lineTo(-3.6 * u, -39.6 * u);
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * Lo que mide en el lienzo una unidad de la esfera del cuadro plano, que
 * dibuja su direccional en un cuadrado de cien con la cara de 43
 * (`radioEnElDireccionalSvg`): así cada raya, cada punto y cada rombo van en
 * la misma proporción de la cara en las dos vistas.
 */
const UNIDAD_DE_ESFERA = R / 43;

/**
 * **El direccional hecho HSI**, el del cuadro plano dicho en lienzo: el curso
 * del OBS con su barra, los cuatro puntos y el TO/FROM, girando con la rosa;
 * la aguja del ADF en cian; la bandera NAV; y a la derecha de la cara, sin
 * girar, la escala de la senda con su rombo, que baja cuando se va alto.
 *
 * **Es la misma lectura, no otra cuenta**: `LaRadioPintada` sale de
 * `pintarLaRadio` con la radio del avión una vez por imagen, y la mira igual
 * el cuadro plano. Desde el asiento el cuadro plano no se pinta, y sin esto el
 * bimotor volaba el ILS con un giróscopo sin agujas (ADR 0030, H26m).
 *
 * **Y sin las letras de las esquinas**: en el cuadro plano van en el cuadrado,
 * fuera de la cara redonda; aquí ese sitio queda detrás del bisel, que cierra
 * la esfera al 99 % de su radio. El curso se lee donde se lee en un HSI de
 * aguja: la punta de la flecha contra la rosa.
 */
function radioEnElDireccional(
  g: CanvasRenderingContext2D,
  p: LaRadioPintada,
  /** Lo que marca la rosa, grados: el curso va en ella. */
  rumbo: number,
  /** El magnético de verdad: la aguja del ADF apunta a la estación, no a la rosa. */
  deVerdad = rumbo,
): void {
  const r = 43;
  const punto = r * 0.17;
  const largo = r * 0.42;
  g.save();
  g.translate(C, C);
  g.scale(UNIDAD_DE_ESFERA, UNIDAD_DE_ESFERA);
  g.lineCap = "round";
  g.lineJoin = "round";
  if (p.curso !== null) {
    g.save();
    g.rotate(((p.curso - rumbo) * Math.PI) / 180);
    g.strokeStyle = PALETA.objetivo;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(0, -r + 4);
    g.lineTo(0, -largo - 3);
    g.moveTo(-3.5, -r + 11);
    g.lineTo(0, -r + 4);
    g.lineTo(3.5, -r + 11);
    g.moveTo(0, largo + 3);
    g.lineTo(0, r - 4);
    g.stroke();
    g.strokeStyle = PALETA.valor;
    g.lineWidth = 0.8;
    for (const i of [-2, -1, 1, 2]) {
      g.beginPath();
      g.arc(i * punto, 0, 1.5, 0, Math.PI * 2);
      g.stroke();
    }
    if (!p.bandera) {
      g.strokeStyle = PALETA.objetivo;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(p.barra * punto * 2, -largo);
      g.lineTo(p.barra * punto * 2, largo);
      g.stroke();
    }
    if (p.toFrom) {
      // Hacia la punta con TO y hacia la cola con FROM, como el triángulo girado del plano.
      const s = p.toFrom === "TO" ? 1 : -1;
      g.fillStyle = PALETA.valor;
      g.beginPath();
      g.moveTo(0, -largo * 0.7 * s);
      g.lineTo(-3, (-largo * 0.7 + 8.5) * s);
      g.lineTo(3, (-largo * 0.7 + 8.5) * s);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  if (p.adf !== null) {
    g.save();
    g.rotate(((p.adf - deVerdad) * Math.PI) / 180);
    g.strokeStyle = PALETA.auxiliar;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(0, -r + 2);
    g.lineTo(0, r - 2);
    g.moveTo(-4, -r + 10);
    g.lineTo(0, -r + 2);
    g.lineTo(4, -r + 10);
    g.moveTo(-3, r - 2);
    g.lineTo(0, r - 7);
    g.lineTo(3, r - 2);
    g.stroke();
    g.restore();
  }
  if (p.bandera) bandera(g, "NAV", -punto * 2 - 17, -largo * 0.3, 15, 8, 6);
  if (p.conSenda) {
    g.save();
    g.translate(r + 3.4, 0);
    g.strokeStyle = PALETA.valor;
    g.lineWidth = 0.8;
    for (const i of [-2, -1, 1, 2]) {
      g.beginPath();
      g.arc(0, i * punto, 1.5, 0, Math.PI * 2);
      g.stroke();
    }
    const rombo = 3.6;
    g.beginPath();
    g.moveTo(-rombo * 1.4, 0);
    g.lineTo(rombo * 1.4, 0);
    g.stroke();
    if (p.senda !== null) {
      const y = p.senda * punto * 2;
      g.strokeStyle = PALETA.objetivo;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(0, y - rombo);
      g.lineTo(rombo * 0.7, y);
      g.lineTo(0, y + rombo);
      g.lineTo(-rombo * 0.7, y);
      g.closePath();
      g.stroke();
    }
    if (p.banderaSenda) bandera(g, "GS", -3.5, -3, 7, 6, 5);
    g.restore();
  }
  g.restore();
}

/**
 * Una bandera de aviso de un instrumento: el rectángulo rojo con la palabra
 * en tinta oscura, como las del cuadro plano. En unidades de la esfera.
 */
function bandera(g: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number, alto: number, letra: number): void {
  g.fillStyle = PALETA.limite;
  g.fillRect(x, y, ancho, alto);
  g.fillStyle = "#14161a";
  g.font = `700 ${letra}px ${FUENTE}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(texto, x + ancho / 2, y + alto / 2);
}

/**
 * El horizonte artificial, que no es una aguja: es el mundo girando dentro de
 * un agujero redondo, con sus rayas de cabeceo a la misma escala que el del
 * cuadro plano.
 */
function horizonte(d: DatosDeRelojes, g: CanvasRenderingContext2D): void {
  g.save();
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.clip();
  g.translate(C, C);
  g.rotate((-d.alabeo * Math.PI) / 180);
  g.translate(0, d.cabeceo * CABECEO_POR_GRADO * R);
  g.fillStyle = PALETA.cielo;
  g.fillRect(-LADO, -LADO, LADO * 2, LADO);
  g.fillStyle = PALETA.tierra;
  g.fillRect(-LADO, 0, LADO * 2, LADO);
  g.strokeStyle = "#ffffff";
  g.lineWidth = R * 0.033;
  g.beginPath();
  g.moveTo(-LADO, 0);
  g.lineTo(LADO, 0);
  g.stroke();
  g.lineWidth = R * 0.022;
  for (const grados of RAYAS_DE_CABECEO) {
    const y = -grados * CABECEO_POR_GRADO * R;
    const medio = (grados % 10 === 0 ? 0.3 : 0.15) * R;
    g.beginPath();
    g.moveTo(-medio, y);
    g.lineTo(medio, y);
    g.stroke();
  }
  g.restore();
  // Y el avioncito fijo por encima, que es contra lo que se lee todo.
  g.strokeStyle = PALETA.simbolo;
  g.lineWidth = R * 0.047;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(C - 0.51 * R, C);
  g.lineTo(C - 0.19 * R, C);
  g.moveTo(C + 0.19 * R, C);
  g.lineTo(C + 0.51 * R, C);
  g.stroke();
  g.beginPath();
  g.arc(C, C, 0.07 * R, 0, Math.PI * 2);
  g.stroke();
}

/**
 * El coordinador de viraje: el avioncito se inclina con el alabeo y **la bola
 * se va al lado de fuera si no se da pie** — con el derrape, no con el alabeo,
 * que es lo que la movía aquí y la mandaba al borde en un viraje perfecto.
 */
function viraje(d: DatosDeRelojes, g: CanvasRenderingContext2D): void {
  const cy = C - 0.14 * R;
  g.save();
  g.translate(C, cy);
  g.rotate((d.alabeo * Math.PI) / 180);
  g.strokeStyle = PALETA.simbolo;
  g.lineWidth = R * 0.047;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-0.6 * R, 0);
  g.lineTo(0.6 * R, 0);
  g.moveTo(0, 0);
  g.lineTo(0, -0.14 * R);
  g.stroke();
  g.restore();
  // Las dos marcas del viraje normalizado, a dos minutos la vuelta.
  g.strokeStyle = PALETA.valor;
  g.lineWidth = R * 0.042;
  for (const lado of [-1, 1]) {
    g.beginPath();
    g.moveTo(C + lado * 0.62 * R, C - 0.34 * R);
    g.lineTo(C + lado * 0.62 * R, C - 0.12 * R);
    g.stroke();
  }
  // Y la bola, en su tubo.
  const x0 = C - 0.37 * R;
  const y0 = C + 0.37 * R;
  const w = 0.74 * R;
  const h = 0.3 * R;
  g.fillStyle = "rgba(184, 230, 255, 0.2)";
  g.strokeStyle = PALETA.filo;
  g.lineWidth = R * 0.019;
  g.beginPath();
  g.moveTo(x0 + h / 2, y0);
  g.lineTo(x0 + w - h / 2, y0);
  g.arc(x0 + w - h / 2, y0 + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
  g.lineTo(x0 + h / 2, y0 + h);
  g.arc(x0 + h / 2, y0 + h / 2, h / 2, Math.PI / 2, (3 * Math.PI) / 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = "#05070a";
  g.beginPath();
  g.arc(
    C + bolaDelViraje(d.derrape) * 0.256 * R,
    C + 0.52 * R,
    0.1 * R,
    0,
    Math.PI * 2,
  );
  g.fill();
}

/**
 * Los relojes que no son de vuelo: motor, flaps y depósito.
 *
 * Los tres igual: la escala de `cuadro.ts`, el rótulo y su unidad encima del
 * eje, y **la cifra de lo que marca** debajo — las vueltas del tacómetro, los
 * grados de los flaps y los kilos del depósito, las mismas que el cuadro plano.
 */
function deMotor(
  d: DatosDeRelojes,
  g: CanvasRenderingContext2D,
  que: QueMide,
  motor: number,
): void {
  const c = d.cuadro;
  let e: Escala | null;
  let f = 0;
  let cifra = "";
  let nombre = "";
  let color: string = PALETA.valor;
  if (que === "flaps") {
    e = c.escalaDeFlaps;
    const grados = enLaMuesca(c.flaps, d.flaps);
    f = flapsEnLaEscala(c, grados);
    cifra = `${Math.round(grados)}°`;
    nombre = e?.rotulo ?? "FLAPS";
  } else if (que === "fuel") {
    e = c.combustible;
    const kilos = d.combustible?.kilos ?? 0;
    f = enLaEscala(e, kilos);
    // Sin vuelo no hay señal, y un instrumento sin señal no marca cero: se
    // queda sin cifra. Ver `DatosDelTablero.combustible`.
    cifra = d.combustible ? String(Math.round(kilos)) : "";
    color =
      d.combustible?.estado === "poco"
        ? PALETA.limite
        : d.combustible?.estado === "reserva"
          ? PALETA.precaucion
          : PALETA.valor;
    nombre = e.rotulo;
  } else {
    e = c.motor;
    const regimen = d.motores[Math.max(0, motor)] ?? 0;
    f = enLaEscala(e, valorDeMotor(c, regimen));
    cifra = cifraDeMotor(c, regimen);
    nombre = rotuloDeMotor(c, Math.max(0, motor));
  }
  if (!e) return;
  escala(d, g, e);
  escribir(d, g, nombre, C, C - 0.34 * R, R * MEDIDAS.letraMenuda * 1.15, PALETA.apagado);
  if (e.unidad && e.unidad !== "°")
    escribir(d, g, e.unidad, C, C - 0.14 * R, R * MEDIDAS.letraMenuda, PALETA.apagado);
  aguja(g, e, f);
  buje(g);
  escribir(d, g, cifra, C, C + MEDIDAS.lectura * R, R * MEDIDAS.letra * 1.25, color);
}

/**
 * Las luces del tren: **tres ruedas**, verdes solo con el tren fuera y
 * trabado, ámbar mientras viaja y apagadas dentro. Las mismas que el cuadro
 * plano lleva en su placa —ver `lucesDeTren` en `ui/cristal.ts`—, y una rueda
 * con su llanta se reconoce sin saber leer.
 */
function lucesDelTren(d: DatosDeRelojes, g: CanvasRenderingContext2D): void {
  const luz = luzDeTren(d.tren);
  const patas = Math.max(1, d.cuadro.patas);
  const radio = R * 0.2;
  const paso = radio * 2.5;
  const x0 = C - ((patas - 1) * paso) / 2;
  for (let k = 0; k < patas; k++) {
    const x = x0 + k * paso;
    g.globalAlpha = luz === "dentro" ? 0.45 : 0.9;
    g.fillStyle =
      luz === "fuera"
        ? PALETA.normal
        : luz === "moviendose"
          ? PALETA.precaucion
          : PALETA.apagado;
    g.beginPath();
    g.arc(x, C, radio, 0, Math.PI * 2);
    g.fill();
    // El hueco de la llanta, del color del fondo: es lo que la vuelve una
    // rueda y no un punto.
    g.globalAlpha = 1;
    g.fillStyle = PALETA.esfera;
    g.beginPath();
    g.arc(x, C, radio * 0.42, 0, Math.PI * 2);
    g.fill();
  }
  escribir(d, g, "GEAR", C, C + 0.5 * R, R * MEDIDAS.letraMenuda * 1.15, PALETA.apagado);
}
