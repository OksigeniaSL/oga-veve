/**
 * La librea de la casa: el sol entre las hojas en la cola, y la firma junto a
 * la puerta.
 *
 * Se pidió así: «¿los aviones podrían tener algún motivo alusivo a la Granja
 * Óga? […] Como hecho por un diseñador, no un logo pegado como si hubiéramos
 * hecho un vinilo de logo y ya». Y la diferencia entre las dos cosas es la que
 * hay entre una compañía aérea y una furgoneta rotulada:
 *
 * - **La cola lleva un motivo, no el logotipo.** El logotipo de Granja Óga es
 *   un tejado, un sol y dos hojas que lo recogen desde abajo. En la deriva va
 *   su mitad de abajo —el sol y las hojas— en grande, cortada por los bordes
 *   de la deriva y siguiendo su flecha: la cola es el campo del color del
 *   avión, el sol sale en medio y las hojas lo abrazan desde la raíz. Así es
 *   como se diseña una cola de verdad: un elemento de la marca que se deja
 *   cortar por la forma del plano, no un sello centrado.
 * - **El logotipo, entero y pequeño, donde lo firma una compañía**: detrás de
 *   la puerta de delante, sobre las ventanillas, con su nombre al lado. El
 *   logotipo no se recorta ni se recolorea —ver `CREDITOS.md`—, y por eso en
 *   la cola no va él: va el motivo que sale de él.
 * - **Y los huecos del color del casco.** El logotipo separa sus piezas con
 *   aire —el tejado de la casa, la casa del sol, una hoja de la otra—, y el
 *   motivo hace lo mismo: entre el sol y las hojas queda un filete del color
 *   del fuselaje. Es lo que despega el ocre del terracota en la cola del JAZ
 *   90, igual que en el logotipo, y lo que dice dónde acaba una hoja y
 *   empieza la otra.
 *
 * ## Quién decide qué
 *
 * El **guion de Blender** dice dónde: la deriva que lleva motivo tiene el
 * material `cola`, y el trozo de piel de la firma, `marca` —ver `exterior.py`—.
 * La **ficha** dice qué: los colores del avión y qué motivo lleva, en
 * `appearance.motivo`. Y **esto** lo dibuja. Es el mismo reparto que con los
 * colores (`pintarDeLaFlota`): si el dibujo viniera horneado en el `.glb`
 * habría dos verdades sobre de qué color es cada avión.
 *
 * ## Por qué en un lienzo y no en geometría
 *
 * La franja y los contornos de puerta son geometría, y está bien: son rayas.
 * Un sol con su filete y dos hojas cortadas por el borde de la deriva son
 * curvas que se cruzan, y en geometría serían recortes booleanos y cientos de
 * triángulos por hoja; en un lienzo son cuatro trazos. Cuesta una textura
 * pequeña por avión —la cola cabe en 512 píxeles— y ninguna llamada de dibujo
 * más en la cola, que ya era una malla con su material.
 */

import {
  BufferAttribute,
  CanvasTexture,
  Matrix4,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import type { AircraftConfig, MotivoDeCola } from "../flight/aircraft";
import logotipo from "../assets/granja-oga.svg?raw";

/**
 * Los colores del logotipo que no cambian de un avión a otro.
 *
 * El fondo de la cola y el filete salen de la ficha de cada avión; el sol y
 * las hojas no, porque **son la marca**: el sol es ocre y las hojas verdes en
 * el logotipo, en la web de la granja y en toda la flota. Son los mismos que
 * `--ocre` y `--verde-bosque` de la hoja de estilos.
 */
const OCRE = "#dd923f";
const VERDE = "#2f5243";
/**
 * Y el verde claro de la casa, el `--verde-suave` de la web de la granja,
 * para las hojas cuando la cola es oscura. Ver `verdeSobre`.
 */
const VERDE_SUAVE = "#6e9484";

/**
 * El verde de las hojas sobre una cola de este color.
 *
 * Las hojas son verdes en toda la flota, y en la del JAZ 90 el verde es el
 * del logotipo: sobre terracota se lee como en el logotipo. En una cola azul
 * marino, no: el verde bosque y el azul tienen la misma luz, y las hojas
 * desaparecían — se veía un sol ocre flotando sobre una mancha oscura. Se
 * probaron tres salidas pintadas en las dos colas azules: las hojas en
 * terracota (se leen, pero el verde se pierde y la cola se come al sol), en
 * el verde medio de la casa (sigue sin leerse) y en el verde claro, que es la
 * que queda. Así que las hojas siguen siendo verdes, y es la marca la que
 * pone el tono: cuando el verde bosque no contrasta con la cola, se usa el
 * claro.
 */
function verdeSobre(fondo: string): string {
  return contraste(VERDE, fondo) < 1.5 ? VERDE_SUAVE : VERDE;
}

/** El contraste entre dos colores, como lo mide la WCAG: de 1 a 21. */
function contraste(a: string, b: string): number {
  const la = luz(a);
  const lb = luz(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function luz(css: string): number {
  const n = parseInt(css.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * El lado largo del lienzo de la cola, en píxeles.
 *
 * Quinientos doce da dos centímetros por píxel en la deriva del JAZ 90 y tres
 * en la del JAZ 120, que para un sol de dos metros y un filete de quince
 * centímetros sobra. Más grande sería memoria de la tablet para ver lo mismo.
 */
const LADO_COLA = 512;

/** El alto del lienzo de la firma. El ancho sale de la proporción del trozo. */
const ALTO_MARCA = 192;

/**
 * La firma es el logotipo solo si su trozo de piel es casi cuadrado, y el
 * logotipo con su nombre si es alargado. Ver `marca` en `exterior.py`.
 */
const PROPORCION_CON_NOMBRE = 1.8;

/**
 * La letra del nombre: la misma de la marca en las pantallas de antes de
 * volar (`--hud-fuente`), para que la firma del avión y la del hangar sean
 * la misma firma.
 */
const LETRA = '"Varela Round", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/**
 * Viste el avión: el motivo en la cola y la firma en su sitio.
 *
 * Se llama con el modelo recién cargado y ya repintado con los colores de su
 * ficha. Si no hay lienzo —no pasa en un navegador, pero el cargador tiene
 * prohibido dejar a nadie sin volar—, la cola se queda del color del capó,
 * que es como estaba, y la firma no aparece.
 */
export function vestirLaLibrea(raiz: Object3D, aircraft: AircraftConfig): void {
  const colas: Mesh[] = [];
  const marcas: Mesh[] = [];
  raiz.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const nombre = nombreDe(m.material);
    if (nombre === "cola") colas.push(m);
    else if (nombre === "marca") marcas.push(m);
  });
  if (!colas.length && !marcas.length) return;

  raiz.updateWorldMatrix(true, true);
  const aRaiz = new Matrix4().copy(raiz.matrixWorld).invert();
  const { body, accent } = aircraft.appearance;
  const motivo = aircraft.appearance.motivo;

  for (const malla of colas) {
    if (!motivo) continue;
    const perfil = perfilDe(malla, aRaiz);
    const lienzo = lienzoDeCola(perfil, motivo, hex(accent), hex(body));
    if (!lienzo) continue;
    ponerUV(malla, perfil.uv);
    ponerTextura(malla.material as MeshStandardMaterial, lienzo);
  }

  for (const malla of marcas) {
    const trozo = trozoDe(malla, aRaiz);
    const lienzo = lienzoDeMarca(trozo.proporcion);
    if (!lienzo) {
      malla.visible = false;
      continue;
    }
    ponerUV(malla, trozo.uv);
    const material = malla.material as MeshStandardMaterial;
    ponerTextura(material, lienzo);
    /*
     * **Transparente, y no un rectángulo del color del casco.** Un rectángulo
     * opaco pintado de crema tendría que dar el mismo tono que el crema del
     * fuselaje con cualquier luz, y no lo da del todo: su malla no es la de
     * la piel de debajo, y bastaría un pelo de diferencia en la normal para
     * que con el sol de lado apareciera un recuadro alrededor del logotipo —
     * la pegatina que no se quería—. Transparente, alrededor del logotipo se
     * ve el casco de verdad y no hay recuadro posible.
     */
    material.transparent = true;
    // Y un empujón hacia la cámara en el búfer de profundidad: va a un dedo
    // de la piel, y a cien metros un dedo ya no se distingue de cero.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
  }
}

function nombreDe(material: Material | Material[]): string | undefined {
  return (Array.isArray(material) ? material[0] : material)?.name;
}

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function ponerTextura(material: MeshStandardMaterial, lienzo: HTMLCanvasElement): void {
  const textura = new CanvasTexture(lienzo);
  // El lienzo se pinta en sRGB como todo color, y sin decírselo a three el
  // ocre sale pálido y el verde, gris: lo toma por lineal y lo aclara.
  textura.colorSpace = SRGBColorSpace;
  // Las coordenadas se ponen aquí, con la fila de arriba del lienzo en la
  // v cero, que es como las lee glTF.
  textura.flipY = false;
  textura.anisotropy = 4;
  material.map = textura;
  // El color multiplica a la textura: blanco, para que mande el dibujo.
  material.color.setHex(0xffffff);
  material.needsUpdate = true;
}

function ponerUV(malla: Mesh, uv: Float32Array): void {
  malla.geometry.setAttribute("uv", new BufferAttribute(uv, 2));
}

// ── La cola ─────────────────────────────────────────────────────────────

/**
 * La deriva vista de perfil: dónde está su borde de ataque y su borde de
 * salida a cada altura, en metros del avión, y sus coordenadas de textura.
 *
 * **Se mide en la malla, no se le pregunta al guion**, y así vale igual para
 * la deriva en flecha del reactor que para la de la cola en T: el motivo se
 * coloca en fracciones de la deriva —a qué altura, a qué fracción de su
 * cuerda— y cada deriva lo lleva a su forma.
 *
 * Las coordenadas de textura son la **proyección de perfil**, con la misma
 * escala a lo largo y a lo alto para que el sol sea redondo. Y las dos caras
 * de la deriva llevan las mismas, así que en el costado derecho el dibujo
 * sale en espejo: las hojas crecen hacia la cola por los dos lados, que es
 * como se pinta una cola de verdad. Por eso en la cola no va nada que se
 * lea.
 */
interface PerfilDeCola {
  /** Los límites de la deriva de perfil: z a lo largo, y arriba. */
  readonly z0: number;
  readonly z1: number;
  readonly y0: number;
  readonly y1: number;
  /** Cada altura con vértices, con su borde de ataque y de salida. */
  readonly anillos: readonly { y: number; ataque: number; salida: number }[];
  readonly uv: Float32Array;
}

function perfilDe(malla: Mesh, aRaiz: Matrix4): PerfilDeCola {
  const pos = malla.geometry.getAttribute("position");
  const aAvion = new Matrix4().multiplyMatrices(aRaiz, malla.matrixWorld);
  const v = new Vector3();
  const zs = new Float32Array(pos.count);
  const ys = new Float32Array(pos.count);
  let z0 = Infinity;
  let z1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  // Los anillos de la superficie están a alturas exactas: se agrupan por el
  // milímetro.
  const porAltura = new Map<number, { y: number; ataque: number; salida: number }>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(aAvion);
    zs[i] = v.z;
    ys[i] = v.y;
    z0 = Math.min(z0, v.z);
    z1 = Math.max(z1, v.z);
    y0 = Math.min(y0, v.y);
    y1 = Math.max(y1, v.y);
    const clave = Math.round(v.y * 1000);
    const a = porAltura.get(clave);
    if (a) {
      a.ataque = Math.min(a.ataque, v.z);
      a.salida = Math.max(a.salida, v.z);
    } else porAltura.set(clave, { y: v.y, ataque: v.z, salida: v.z });
  }
  const anillos = [...porAltura.values()].sort((a, b) => a.y - b.y);
  const uv = new Float32Array(pos.count * 2);
  const dz = Math.max(z1 - z0, 1e-6);
  const dy = Math.max(y1 - y0, 1e-6);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (zs[i]! - z0) / dz;
    uv[i * 2 + 1] = (y1 - ys[i]!) / dy;
  }
  return { z0, z1, y0, y1, anillos, uv };
}

/** El borde de ataque y el de salida a una altura, entre los dos anillos. */
function bordesA(p: PerfilDeCola, y: number): { ataque: number; salida: number } {
  const a = p.anillos;
  if (!a.length) return { ataque: p.z0, salida: p.z1 };
  // Los anillos de una sola punta —el vértice de la punta redondeada— no
  // tienen cuerda: se usa el de debajo.
  const conCuerda = a.filter((r) => r.salida - r.ataque > 1e-3);
  const lista = conCuerda.length ? conCuerda : a;
  const primero = lista[0]!;
  const ultimo = lista[lista.length - 1]!;
  if (y <= primero.y) return primero;
  if (y >= ultimo.y) return ultimo;
  for (let i = 0; i < lista.length - 1; i++) {
    const r = lista[i]!;
    const s = lista[i + 1]!;
    if (y <= s.y) {
      const f = (y - r.y) / Math.max(s.y - r.y, 1e-6);
      return {
        ataque: r.ataque + (s.ataque - r.ataque) * f,
        salida: r.salida + (s.salida - r.salida) * f,
      };
    }
  }
  return ultimo;
}

/**
 * El dibujo de la cola.
 *
 * **Lo único que pone la deriva es dónde cae el sol y de qué tamaño es**, y se
 * dice en fracciones de ella: `s` es la altura, de la raíz a la punta, y `c`
 * la fracción de la cuerda a esa altura, del borde de ataque al de salida.
 * Así el sol cae en medio de la deriva en flecha del reactor y en medio de la
 * de la cola en T, cada una con su forma.
 *
 * Las hojas, en cambio, se dibujan **en radios de sol** a partir de su centro,
 * con las proporciones del logotipo: están donde están respecto del sol, no
 * respecto de la deriva. Y se salen de ella por abajo, por delante y por
 * detrás, y es a propósito: que el borde de la deriva las corte es lo que las
 * hace motivo y no pegatina.
 */
function lienzoDeCola(
  p: PerfilDeCola,
  motivo: MotivoDeCola,
  fondo: string,
  filete: string,
): HTMLCanvasElement | null {
  const lienzo = nuevoLienzo();
  if (!lienzo) return null;
  const dz = p.z1 - p.z0;
  const dy = p.y1 - p.y0;
  const k = LADO_COLA / Math.max(dz, dy);
  lienzo.width = Math.max(8, Math.round(dz * k));
  lienzo.height = Math.max(8, Math.round(dy * k));
  const ctx = lienzo.getContext("2d");
  if (!ctx) return null;
  const sx = lienzo.width / dz;
  const sy = lienzo.height / dy;

  /** De fracciones de la deriva a píxeles del lienzo. */
  const P = (s: number, c: number): [number, number] => {
    const y = p.y0 + s * dy;
    const b = bordesA(p, y);
    const z = b.ataque + c * (b.salida - b.ataque);
    return [(z - p.z0) * sx, (p.y1 - y) * sy];
  };
  /** La cuerda a esa altura, en píxeles. */
  const cuerda = (s: number): number => {
    const b = bordesA(p, p.y0 + s * dy);
    return (b.salida - b.ataque) * sx;
  };

  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  if (motivo === "sol") {
    // El sol naciendo: medio sol en la raíz, sobre una cola que ya es verde.
    // Es la mitad de abajo del logotipo con la deriva haciendo de hojas.
    const radio = cuerda(0.12) * 0.3;
    sol(ctx, P(0.12, 0.56), radio, radio * 0.16, filete);
    return lienzo;
  }

  // El sol, en medio de la cuerda y algo por encima de la mitad de la
  // deriva: debajo tiene que caber el cuenco de las hojas y encima queda el
  // campo, como el tejado encima del sol en el logotipo.
  const centro = P(0.58, 0.52);
  // Un tercio de la cuerda, **o lo que quepa de alto**: en la deriva corta
  // de la cola en T, un tercio de la cuerda era un sol que llenaba la deriva
  // de borde a borde y dejaba las hojas aplastadas contra la raíz — un sello,
  // no un motivo.
  const radio = Math.min(cuerda(0.58) * 0.33, lienzo.height * 0.21);
  // El filete: lo que separa las piezas, del color del casco.
  const hueco = radio * 0.16;
  const hojas = verdeSobre(fondo);

  // La hoja grande, la de detrás: la punta delante y abajo, pasa por debajo
  // del sol haciendo el cuenco y sube por detrás hasta que la corta el borde
  // de salida. Por debajo se sale de la deriva.
  const grande = hoja(centro, radio, [
    [-2.7, 1.25],
    [-1.4, 1.55], [0.2, 1.7], [0.95, 0.9],
    [1.5, 0.3], [1.8, -0.2], [2.4, -0.45],
    [3.2, 1.2], [1.6, 3.4], [-0.6, 3.1],
    [-1.8, 2.9], [-2.4, 1.9], [-2.7, 1.25],
  ]);
  ctx.fillStyle = hojas;
  ctx.fill(grande);

  // La hoja chica, la de delante: su cabo romo lo corta el borde de ataque, y
  // la punta va hacia atrás, a apoyarse bajo el sol.
  const chica = hoja(centro, radio, [
    [-3.3, -0.35],
    [-2.2, -0.3], [-1.0, 0.45], [-0.35, 1.38],
    [-1.2, 1.62], [-2.5, 1.55], [-3.1, 1.15],
    [-3.4, 0.8], [-3.4, 0.2], [-3.3, -0.35],
  ]);
  // Con su filete **solo donde pisa a la otra**: es lo que separa una hoja de
  // otra en el logotipo. Contra el fondo no lleva, y es a propósito: una hoja
  // ribeteada de blanco sobre el terracota es una pegatina recortada; sin
  // ribete, es pintura.
  ctx.save();
  ctx.clip(grande);
  ctx.lineJoin = "round";
  ctx.lineWidth = hueco * 2;
  ctx.strokeStyle = filete;
  ctx.stroke(chica);
  ctx.restore();
  ctx.fillStyle = hojas;
  ctx.fill(chica);

  // Y el sol encima, con su filete: el filete muerde las hojas donde se
  // acercan, y así lo recogen a la misma distancia por todo el borde.
  sol(ctx, centro, radio, hueco, filete);
  return lienzo;
}

/**
 * Una hoja: un contorno cerrado de curvas de Bézier, en radios de sol desde
 * su centro. El primer punto es donde empieza y luego va de tres en tres —dos
 * de control y el siguiente punto del contorno—.
 */
function hoja(
  [cx, cy]: [number, number],
  radio: number,
  puntos: readonly (readonly [number, number])[],
): Path2D {
  const Q = (q: readonly [number, number]): [number, number] => [
    cx + q[0] * radio,
    cy + q[1] * radio,
  ];
  const camino = new Path2D();
  const [a, ...resto] = puntos;
  if (!a) return camino;
  camino.moveTo(...Q(a));
  for (let i = 0; i + 2 < resto.length; i += 3)
    camino.bezierCurveTo(...Q(resto[i]!), ...Q(resto[i + 1]!), ...Q(resto[i + 2]!));
  camino.closePath();
  return camino;
}

/** El sol, con su filete alrededor: el arco de la casa del logotipo. */
function sol(
  ctx: CanvasRenderingContext2D,
  [x, y]: [number, number],
  radio: number,
  hueco: number,
  filete: string,
): void {
  ctx.fillStyle = filete;
  ctx.beginPath();
  ctx.arc(x, y, radio + hueco, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OCRE;
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.fill();
}

// ── La firma ────────────────────────────────────────────────────────────

/**
 * El trozo de piel de la firma, con sus coordenadas de textura.
 *
 * **Del derecho en los dos costados.** En la cola da igual que el dibujo
 * salga en espejo; en la firma no, porque un logotipo del revés no es el
 * logotipo y un nombre del revés no se lee. Así que la `u` crece hacia la
 * cola en el costado izquierdo —donde el morro queda a la izquierda de quien
 * mira— y hacia el morro en el derecho. Visto desde fuera, en los dos lados
 * se lee de izquierda a derecha.
 */
function trozoDe(
  malla: Mesh,
  aRaiz: Matrix4,
): { proporcion: number; uv: Float32Array } {
  const pos = malla.geometry.getAttribute("position");
  const aAvion = new Matrix4().multiplyMatrices(aRaiz, malla.matrixWorld);
  const v = new Vector3();
  const puntos: [number, number, number][] = [];
  let z0 = Infinity;
  let z1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(aAvion);
    puntos.push([v.x, v.y, v.z]);
    z0 = Math.min(z0, v.z);
    z1 = Math.max(z1, v.z);
    y0 = Math.min(y0, v.y);
    y1 = Math.max(y1, v.y);
  }
  const dz = Math.max(z1 - z0, 1e-6);
  const dy = Math.max(y1 - y0, 1e-6);
  const uv = new Float32Array(pos.count * 2);
  puntos.forEach(([x, y, z], i) => {
    const hacia = (z - z0) / dz;
    uv[i * 2] = x < 0 ? hacia : 1 - hacia;
    uv[i * 2 + 1] = (y1 - y) / dy;
  });
  return { proporcion: dz / dy, uv };
}

/** Las piezas del logotipo, leídas una vez del SVG de verdad. */
let piezas: { fill: string; camino: Path2D }[] | null = null;
let cajaDelLogo: { x: number; y: number; lado: number } | null = null;

/**
 * El logotipo de Granja Óga como caminos de lienzo, desde el mismo SVG que
 * usa el hangar. **No se redibuja**: se leen sus tres trazos tal cual, con
 * sus colores, y se pintan. Ver `ui/marca.ts` y `CREDITOS.md`.
 */
function elLogotipo(): { fill: string; camino: Path2D }[] {
  if (piezas) return piezas;
  piezas = [];
  for (const m of logotipo.matchAll(/<path\b([^>]*)>/g)) {
    const atributos = m[1] ?? "";
    const fill = /\bfill="([^"]+)"/.exec(atributos)?.[1];
    const d = /\bd="([^"]+)"/.exec(atributos)?.[1];
    if (fill && d) piezas.push({ fill, camino: new Path2D(d) });
  }
  return piezas;
}

/**
 * Dónde está el dibujo dentro del cuadro del SVG, que trae su margen.
 *
 * Se mide pintándolo, no se escribe a mano: si mañana cambia el fichero, la
 * firma sigue alineada. Es una vez por partida y un lienzo de 328 píxeles.
 */
function laCajaDelLogo(): { x: number; y: number; lado: number } {
  if (cajaDelLogo) return cajaDelLogo;
  const vista = /viewBox="([^"]+)"/.exec(logotipo)?.[1]?.split(/\s+/).map(Number);
  const ancho = vista?.[2] ?? 328;
  const alto = vista?.[3] ?? 328;
  cajaDelLogo = { x: 0, y: 0, lado: Math.max(ancho, alto) };
  const lienzo = nuevoLienzo();
  const ctx = lienzo?.getContext("2d", { willReadFrequently: true });
  if (!lienzo || !ctx) return cajaDelLogo;
  lienzo.width = Math.ceil(ancho);
  lienzo.height = Math.ceil(alto);
  for (const p of elLogotipo()) {
    ctx.fillStyle = p.fill;
    ctx.fill(p.camino);
  }
  const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height).data;
  let x0 = lienzo.width;
  let y0 = lienzo.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < lienzo.height; y++)
    for (let x = 0; x < lienzo.width; x++)
      if ((datos[(y * lienzo.width + x) * 4 + 3] ?? 0) > 24) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 > x0 && y1 > y0) {
    const lado = Math.max(x1 - x0, y1 - y0);
    cajaDelLogo = {
      x: (x0 + x1) / 2 - lado / 2,
      y: (y0 + y1) / 2 - lado / 2,
      lado,
    };
  }
  return cajaDelLogo;
}

/**
 * El logotipo, y su nombre al lado si hay sitio.
 *
 * Es la misma firma que la de las pantallas de antes de volar —el sello y
 * «Granja Óga» en la letra del juego, ver `ui/marca.ts`—, en el verde de la
 * marca sobre el casco claro.
 */
function lienzoDeMarca(proporcion: number): HTMLCanvasElement | null {
  const lienzo = nuevoLienzo();
  if (!lienzo) return null;
  const alto = ALTO_MARCA;
  const ancho = Math.max(alto, Math.round(alto * proporcion));
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) return null;

  const caja = laCajaDelLogo();
  const lado = alto * 0.94;
  const escala = lado / caja.lado;
  const conNombre = proporcion >= PROPORCION_CON_NOMBRE;
  const x = conNombre ? (alto - lado) / 2 : (ancho - lado) / 2;
  const y = (alto - lado) / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(escala, escala);
  ctx.translate(-caja.x, -caja.y);
  for (const p of elLogotipo()) {
    ctx.fillStyle = p.fill;
    ctx.fill(p.camino);
  }
  ctx.restore();

  if (conNombre) {
    const desde = x + lado + alto * 0.24;
    const cabe = ancho - desde - alto * 0.06;
    let cuerpo = alto * 0.46;
    ctx.font = `600 ${cuerpo}px ${LETRA}`;
    const mide = ctx.measureText("Granja Óga").width;
    if (mide > cabe) {
      cuerpo *= cabe / mide;
      ctx.font = `600 ${cuerpo}px ${LETRA}`;
    }
    ctx.fillStyle = VERDE;
    ctx.textBaseline = "middle";
    ctx.fillText("Granja Óga", desde, alto * 0.54);
  }
  return lienzo;
}

function nuevoLienzo(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  return document.createElement("canvas");
}
