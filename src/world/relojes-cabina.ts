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
 * años que los instrumentos son adorno. Así que hay dos clases y ninguna más:
 *
 * - **El régimen de cada motor**, que es el mando con el que se vuela: `rpm` en
 *   un pistón, `par` en un turbohélice —su hélice gira a vueltas constantes, lo
 *   que cambia es la fuerza— y `n1` en un turbofán.
 * - **Los flaps**, que es lo otro que quien juega mueve y puede ver moverse.
 *
 * El resto de la cabina —los interruptores del techo, las palancas del
 * pedestal— es escenografía y no finge ser otra cosa: en un avión de verdad
 * tampoco se toca casi nada de lo que se ve.
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
  Vector3,
  LinearFilter,
  MeshBasicMaterial,
  type Mesh,
  type Object3D,
} from "three";
import { LETRAS_DESDE, apunta, desdePara, type Peldano } from "../ui/familia";
import type { Cuadro } from "../ui/cuadro";

/** Lado del lienzo de cada reloj, en píxeles. */
const LADO = 256;

/** Cuántas veces por segundo se repintan. Lo mismo que las pantallas. */
const POR_SEGUNDO = 12;

/** Los colores de una esfera: fondo, marcas, aguja y el arco de tope. */
const FONDO = "#0d1113";
const MARCA = "#d7e0dc";
const TINTA = "#eef4f1";
const AGUJA = "#f2f1ec";
const TOPE = "#e8b13a";
const ARCO = "#7ec86a";

/** Lo que marca un reloj de motor. */
export type DeMotor = "n1" | "rpm" | "par" | "flaps";

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

/** El rótulo serigrafiado de cada uno. */
const ROTULO: Record<QueMide, string> = {
  n1: "N1",
  rpm: "RPM",
  par: "TRQ",
  flaps: "FLAPS",
  asi: "IAS",
  ai: "ATT",
  alt: "ALT",
  tc: "T/C",
  dg: "HDG",
  vsi: "V/S",
};

/** Los seis de vuelo, para poder preguntar si uno lo es. */
const DE_VUELO = new Set<string>(["asi", "ai", "alt", "tc", "dg", "vsi"]);

export interface DatosDeRelojes {
  /**
   * El régimen de los motores, de 0 a 1, **uno por motor**.
   *
   * Sale del mismo sitio que el sonido —ver `regimen` en `ui/cuadro.ts`—, y eso
   * no es una comodidad: si la aguja dijera una cosa y el motor sonara otra, el
   * instrumento dejaría de ser un instrumento.
   */
  readonly motores: readonly number[];
  /** Los flaps, de 0 a 1. */
  readonly flaps: number;
  /** Las vueltas de verdad, para poder escribir la cifra de un pistón. */
  readonly rpmMaximas: number;
  /**
   * El peldaño, de uno a cuatro. **Decide si el reloj lleva letras.**
   *
   * Un reloj de motor con su banda verde y su aguja se lee sin saber leer; el
   * «RPM 1» y el «2400» de debajo, no. Misma regla que las pantallas grandes y
   * que el cuadro plano. Ver `LETRAS_DESDE` en `ui/familia.ts`.
   */
  readonly peldano: Peldano;
  /** Velocidad indicada, en nudos. */
  readonly velocidad: number;
  /** Altitud, en pies. */
  readonly pies: number;
  /** Velocidad vertical, en pies por minuto. */
  readonly fpm: number;
  /** Rumbo magnético, en grados. */
  readonly rumbo: number;
  /** Cabeceo y alabeo, en grados. */
  readonly cabeceo: number;
  readonly alabeo: number;
  /** Las escalas de **este** avión: sin ellas la esfera miente. */
  readonly cuadro: Cuadro;
}

interface Esfera {
  readonly g: CanvasRenderingContext2D;
  readonly textura: CanvasTexture;
  readonly material: MeshBasicMaterial;
  readonly que: QueMide;
  /** Qué motor le toca, si mide un motor. */
  readonly motor: number;
}

export interface Relojes {
  /** Qué relojes hay y qué mide cada uno. Para comprobarlo desde fuera. */
  readonly hay: readonly { readonly uuid: string; readonly que: QueMide }[];
  actualizar(datos: DatosDeRelojes, dt: number): void;
  dispose(): void;
}

function nuevaEsfera(que: QueMide, motor: number): Esfera | null {
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
  return { g, textura, material, que, motor };
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
  const otros: { malla: Mesh; que: QueMide }[] = [];
  raiz.updateWorldMatrix(true, true);
  raiz.traverse((o) => {
    const m = o as Mesh;
    const nombre = (m.material as { name?: string } | undefined)?.name ?? "";
    if (!m.isMesh || !nombre.startsWith("reloj_")) return;
    const que = nombre.slice("reloj_".length) as QueMide;
    if (!(que in ROTULO)) return;
    // Los de vuelo no se ordenan por su sitio: cada uno mide lo suyo y ya.
    // Los de motor sí, de izquierda a derecha, para que el número 1 sea el de
    // la izquierda como en cualquier cabina.
    if (que === "flaps" || DE_VUELO.has(que)) otros.push({ malla: m, que });
    else
      deMotor.push({ malla: m, que, x: m.getWorldPosition(new Vector3()).x });
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
  for (const { malla, que } of otros) {
    const e = nuevaEsfera(que, -1);
    if (!e) continue;
    estirarUV(malla);
    malla.material = e.material;
    esferas.push(e);
    hay.push({ uuid: malla.uuid, que });
  }
  if (!esferas.length) return null;

  let desde = 0;
  return {
    hay,
    actualizar(datos, dt) {
      desde += dt;
      if (desde < 1 / POR_SEGUNDO) return;
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
        if (DE_VUELO.has(e.que)) {
          pintarVuelo(e.g, e.que as DeVuelo, datos);
          e.textura.needsUpdate = true;
          continue;
        }
        const valor =
          e.que === "flaps" ? datos.flaps : (datos.motores[e.motor] ?? 0);
        pintarEsfera(e.g, e.que, valor, datos, e.motor);
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

/** Escribe centrado. Sin espejos: ver la nota de `actualizar`. */
/**
 * Escribe, **si a este peldaño le toca ese texto**.
 *
 * Igual que en las pantallas grandes: la cifra de un régimen es parte de la
 * medida y entra en el segundo peldaño; el «RPM 1» de al lado es un nombre y
 * espera al tercero. Ver `desdePara` en `ui/familia.ts`.
 */
function escribirSiToca(
  peldano: Peldano,
  g: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  fuente: string,
  color: string,
): void {
  if (peldano < desdePara(texto)) return;
  // Y se apunta, en el mismo sitio que las pantallas de cristal: el banco no
  // puede contar lo que hay en un lienzo, así que lo cuenta quien lo pinta.
  apunta(texto);
  escribir(g, texto, x, y, fuente, color);
}

function escribir(
  g: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  fuente: string,
  color: string,
): void {
  g.save();
  g.fillStyle = color;
  g.font = fuente;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(texto, x, y);
  g.restore();
}

/** El recorrido de una aguja de esfera completa, en radianes. */
const DESDE = (140 * Math.PI) / 180;
const RECORRIDO = (260 * Math.PI) / 180;

/** El aro de la caja, para que la esfera no se funda con el tablero. */
function aro(g: CanvasRenderingContext2D): { c: number; r: number } {
  const c = LADO / 2;
  const r = LADO * 0.42;
  g.fillStyle = FONDO;
  g.fillRect(0, 0, LADO, LADO);
  g.strokeStyle = "#39413f";
  g.lineWidth = LADO * 0.045;
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.stroke();
  return { c, r };
}

/** Cuánto barre una aguja de esfera completa, desde `DESDE`. */
function angulo(v: number): number {
  return DESDE + RECORRIDO * Math.max(0, Math.min(1, v));
}

function pintarEsfera(
  g: CanvasRenderingContext2D,
  que: QueMide,
  valor: number,
  datos: DatosDeRelojes,
  motor: number,
): void {
  const { c, r } = aro(g);

  const cuantas = que === "flaps" ? 4 : 10;

  /*
   * El arco de régimen normal y el de despegue, como los de un instrumento de
   * verdad: verde donde se vuela y ámbar donde se está poco rato. El corte en
   * el ochenta y cinco por ciento es el mismo que usa el cuadro del HUD y el
   * mismo en el que aparece el gruñido del fan — lo que se ve y lo que se oye
   * dicen lo mismo.
   */
  if (que !== "flaps") {
    g.lineWidth = LADO * 0.05;
    g.strokeStyle = ARCO;
    g.beginPath();
    g.arc(c, c, r * 0.82, angulo(0.2), angulo(0.85));
    g.stroke();
    g.strokeStyle = TOPE;
    g.beginPath();
    g.arc(c, c, r * 0.82, angulo(0.85), angulo(1));
    g.stroke();
  }

  // Las marcas.
  g.strokeStyle = MARCA;
  for (let i = 0; i <= cuantas; i++) {
    const a = angulo(i / cuantas);
    const larga = que === "flaps" || i % 2 === 0;
    g.lineWidth = larga ? LADO * 0.022 : LADO * 0.012;
    g.beginPath();
    g.moveTo(
      c + Math.cos(a) * r * (larga ? 0.6 : 0.68),
      c + Math.sin(a) * r * (larga ? 0.6 : 0.68),
    );
    g.lineTo(c + Math.cos(a) * r * 0.76, c + Math.sin(a) * r * 0.76);
    g.stroke();
  }

  // La aguja.
  const a = angulo(valor);
  g.strokeStyle = AGUJA;
  g.lineWidth = LADO * 0.035;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(c - Math.cos(a) * r * 0.12, c - Math.sin(a) * r * 0.12);
  g.lineTo(c + Math.cos(a) * r * 0.66, c + Math.sin(a) * r * 0.66);
  g.stroke();
  g.fillStyle = AGUJA;
  g.beginPath();
  g.arc(c, c, LADO * 0.045, 0, Math.PI * 2);
  g.fill();

  /*
   * Y la cifra, que es lo que de verdad se lee de un vistazo. En un pistón son
   * vueltas por minuto —el número que canta un piloto— y en una turbina el tanto
   * por ciento, que es como se dice N1 en todo el mundo.
   */
  const cifra =
    que === "flaps"
      ? `${Math.round(valor * 100)}%`
      : que === "rpm"
        ? String(Math.round((valor * datos.rpmMaximas) / 10) * 10)
        : `${Math.round(valor * 100)}%`;
  escribirSiToca(
    datos.peldano,
    g,
    cifra,
    c,
    c + r * 0.46,
    `600 ${LADO * 0.15}px system-ui, sans-serif`,
    TINTA,
  );
  const rotulo =
    que === "flaps" || motor < 0 ? ROTULO[que] : `${ROTULO[que]} ${motor + 1}`;
  escribirSiToca(
    datos.peldano,
    g,
    rotulo,
    c,
    c - r * 0.5,
    `600 ${LADO * 0.11}px system-ui, sans-serif`,
    MARCA,
  );
}

/**
 * Los seis de vuelo, pintados en la esfera que les toca.
 *
 * Cada uno es el mismo instrumento que dibuja `ui/six-pack.ts` en el cuadro
 * plano, con **las escalas de este avión** —ver `Cuadro`—: sin ellas la aguja
 * de velocidad de una avioneta y la de un reactor barrerían lo mismo, que es
 * el fallo que ya se arregló una vez en el HUD y que aquí habría vuelto a
 * entrar por la puerta de atrás.
 *
 * Y las letras solo desde el tercer peldaño, como todo lo demás.
 */
function pintarVuelo(
  g: CanvasRenderingContext2D,
  que: DeVuelo,
  d: DatosDeRelojes,
): void {
  const { c, r } = aro(g);
  const marcas = (cuantas: number, rotula: (i: number) => string | null) => {
    for (let i = 0; i <= cuantas; i++) {
      const a = angulo(i / cuantas);
      g.strokeStyle = MARCA;
      g.lineWidth = LADO * 0.02;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r * 0.62, c + Math.sin(a) * r * 0.62);
      g.lineTo(c + Math.cos(a) * r * 0.76, c + Math.sin(a) * r * 0.76);
      g.stroke();
      const texto = rotula(i);
      if (texto !== null)
        escribirSiToca(
          d.peldano,
          g,
          texto,
          c + Math.cos(a) * r * 0.46,
          c + Math.sin(a) * r * 0.46,
          `600 ${LADO * 0.1}px system-ui, sans-serif`,
          TINTA,
        );
    }
  };
  const aguja = (v: number, largo = 0.66, color = AGUJA) => {
    const a = angulo(v);
    g.strokeStyle = color;
    g.lineWidth = LADO * 0.032;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(c - Math.cos(a) * r * 0.1, c - Math.sin(a) * r * 0.1);
    g.lineTo(c + Math.cos(a) * r * largo, c + Math.sin(a) * r * largo);
    g.stroke();
    g.fillStyle = color;
    g.beginPath();
    g.arc(c, c, LADO * 0.04, 0, Math.PI * 2);
    g.fill();
  };

  if (que === "asi") {
    /*
     * El anemómetro, **con los arcos de este avión**: verde donde se vuela,
     * ámbar donde se está poco rato y rojo donde no se pasa. Es lo que hace
     * que la esfera enseñe el avión que se está volando y no un avión
     * genérico.
     */
    const { verde, ambar, rojo } = d.cuadro.arcos;
    for (const [tramo, color] of [
      [verde, ARCO],
      [ambar, TOPE],
      [rojo, "#d7503f"],
    ] as const) {
      g.strokeStyle = color;
      g.lineWidth = LADO * 0.05;
      g.beginPath();
      g.arc(c, c, r * 0.84, angulo(tramo[0]), angulo(tramo[1]));
      g.stroke();
    }
    marcas(8, (i) =>
      i % 2 === 0 ? String(Math.round((d.cuadro.asiMax * i) / 8)) : null,
    );
    aguja(d.velocidad / d.cuadro.asiMax);
    return;
  }

  if (que === "ai") {
    /*
     * El horizonte artificial, que no es una aguja: es el mundo girando
     * dentro de un agujero redondo. Se recorta al aro, que es lo que le da la
     * gracia — y sin recortar, el marrón se comía la esfera entera.
     */
    g.save();
    g.beginPath();
    g.arc(c, c, r * 0.9, 0, Math.PI * 2);
    g.clip();
    g.translate(c, c);
    g.rotate((-d.alabeo * Math.PI) / 180);
    const porGrado = (r * 0.9) / 25;
    g.translate(0, d.cabeceo * porGrado);
    g.fillStyle = "#4fb3e8";
    g.fillRect(-LADO, -LADO, LADO * 2, LADO);
    g.fillStyle = "#b98f56";
    g.fillRect(-LADO, 0, LADO * 2, LADO);
    g.strokeStyle = TINTA;
    g.lineWidth = LADO * 0.012;
    g.beginPath();
    g.moveTo(-r, 0);
    g.lineTo(r, 0);
    g.stroke();
    for (const grados of [-20, -10, 10, 20]) {
      const y = grados * porGrado;
      const ancho = grados % 20 === 0 ? r * 0.34 : r * 0.2;
      g.beginPath();
      g.moveTo(-ancho, y);
      g.lineTo(ancho, y);
      g.stroke();
    }
    g.restore();
    // Y el avioncito fijo por encima, que es contra lo que se lee todo.
    g.strokeStyle = "#f2c14e";
    g.lineWidth = LADO * 0.028;
    g.beginPath();
    g.moveTo(c - r * 0.42, c);
    g.lineTo(c - r * 0.14, c);
    g.moveTo(c + r * 0.14, c);
    g.lineTo(c + r * 0.42, c);
    g.stroke();
    g.beginPath();
    g.arc(c, c, LADO * 0.022, 0, Math.PI * 2);
    g.fillStyle = "#f2c14e";
    g.fill();
    return;
  }

  if (que === "alt") {
    // Dos agujas, como un altímetro de verdad: la corta son los miles y la
    // larga los cientos. Es lo único que lo distingue de un reloj.
    marcas(10, (i) => (i < 10 ? String(i) : null));
    aguja(((d.pies / 1000) % 10) / 10, 0.44);
    aguja(((d.pies / 100) % 10) / 10, 0.7);
    return;
  }

  if (que === "vsi") {
    // El variómetro barre a los dos lados del cero, que está arriba: subir es
    // a la derecha y bajar a la izquierda, como en cualquier avión.
    marcas(8, (i) =>
      i % 2 === 0
        ? String(Math.round((d.cuadro.vsiMax * (i / 4 - 1)) / 100) / 10)
        : null,
    );
    const f = Math.max(-1, Math.min(1, d.fpm / d.cuadro.vsiMax));
    aguja((f + 1) / 2);
    return;
  }

  if (que === "dg") {
    /*
     * La rosa de rumbos: **gira la rosa, no la aguja**. Es al revés que todos
     * los demás y es lo que la hace legible sin leer — lo que uno lleva
     * delante siempre está arriba.
     */
    g.save();
    g.translate(c, c);
    g.rotate((-d.rumbo * Math.PI) / 180);
    for (let k = 0; k < 36; k++) {
      const a = (k * 10 * Math.PI) / 180 - Math.PI / 2;
      const larga = k % 3 === 0;
      g.strokeStyle = MARCA;
      g.lineWidth = larga ? LADO * 0.02 : LADO * 0.01;
      g.beginPath();
      g.moveTo(
        Math.cos(a) * r * (larga ? 0.64 : 0.7),
        Math.sin(a) * r * (larga ? 0.64 : 0.7),
      );
      g.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      g.stroke();
      // Las cuatro letras de la rosa —N, E, S, W— son nombres, no cifras.
      if (k % 9 === 0 && d.peldano >= LETRAS_DESDE) {
        g.save();
        g.translate(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48);
        g.rotate((d.rumbo * Math.PI) / 180);
        escribir(
          g,
          ["N", "E", "S", "W"][k / 9] ?? "",
          0,
          0,
          `700 ${LADO * 0.12}px system-ui, sans-serif`,
          TINTA,
        );
        g.restore();
      }
    }
    g.restore();
    // El avioncito, fijo y mirando arriba: lo que se lee es lo que tiene
    // encima.
    g.strokeStyle = "#f2c14e";
    g.lineWidth = LADO * 0.026;
    g.beginPath();
    g.moveTo(c, c - r * 0.3);
    g.lineTo(c, c + r * 0.26);
    g.moveTo(c - r * 0.22, c);
    g.lineTo(c + r * 0.22, c);
    g.stroke();
    return;
  }

  /*
   * El coordinador de viraje: el avioncito se inclina con el alabeo y la bola
   * se va al lado de fuera si no se da pie. Es el instrumento que enseña que
   * girar no es solo mover el volante.
   */
  g.save();
  g.translate(c, c);
  g.rotate((d.alabeo * Math.PI) / 180);
  g.strokeStyle = "#f2c14e";
  g.lineWidth = LADO * 0.028;
  g.beginPath();
  g.moveTo(-r * 0.5, 0);
  g.lineTo(r * 0.5, 0);
  g.moveTo(0, 0);
  g.lineTo(0, -r * 0.22);
  g.stroke();
  g.restore();
  // Las dos marcas del viraje normalizado, a dos minutos la vuelta.
  g.strokeStyle = MARCA;
  g.lineWidth = LADO * 0.018;
  for (const lado of [-1, 1]) {
    g.beginPath();
    g.moveTo(c + lado * r * 0.62, c - r * 0.22);
    g.lineTo(c + lado * r * 0.62, c + r * 0.02);
    g.stroke();
  }
  // Y la bola, en su tubo curvo.
  const bola = Math.max(-1, Math.min(1, d.alabeo / 30));
  g.strokeStyle = "#39413f";
  g.lineWidth = LADO * 0.09;
  g.beginPath();
  g.arc(c, c - r * 0.5, r * 0.95, (65 * Math.PI) / 180, (115 * Math.PI) / 180);
  g.stroke();
  g.fillStyle = AGUJA;
  g.beginPath();
  g.arc(
    c + bola * r * 0.32,
    c - r * 0.5 + r * 0.95 * Math.cos((bola * 25 * Math.PI) / 180),
    LADO * 0.035,
    0,
    Math.PI * 2,
  );
  g.fill();
}
