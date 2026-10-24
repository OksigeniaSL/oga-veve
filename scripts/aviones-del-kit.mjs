/**
 * **Los aviones de «Armá tu avión»**, sacados de los modelos del juego.
 *
 * El juego del kit de viaje arma un avión por nivel, uno por tipo de la
 * flota, y cada pieza tiene que ir donde la lleva ese tipo de verdad (regla 4
 * del AGENTS.md). Dibujadas de memoria, las piezas acabaron con el motor
 * colgando del fuselaje delante del ala (Enrique, 19-10-2026). Así que no se
 * dibujan: se miden. Este guion abre los modelos de la flota
 * —`public/assets/aeronaves/jaz-*.glb`, los que vuela el juego, hechos con
 * `modelos/*.py` a partir de las medidas de su ficha— y saca de cada parte lo
 * que se ve de ella en **dos vistas de libro**:
 *
 * - **De perfil**, por la derecha y con el morro a la derecha, como se ve por
 *   la ventanilla y como se dibuja un avión en cualquier libro: ahí se arma.
 *   Es la vista que dice sin dudar dónde van las ruedas y el motor, y si el
 *   ala va arriba o abajo.
 * - **En planta**, desde arriba y con el morro hacia arriba: ahí se ponen las
 *   luces, porque la izquierda y la derecha del avión son las de quien mira.
 *
 * ## Por qué dos vistas y no una de tres cuartos
 *
 * Hasta el 24-10-2026 era una sola, de tres cuartos por delante y desde un
 * poco por encima, que enseñaba las dos alas a la vez. En la avioneta, el ala
 * alta salía como una tabla en diagonal de debajo de la cola a más allá del
 * morro, cruzando la cabina, y sin sombras ni nada que dijera qué iba delante:
 * «Un Picasso, vaya lujo de juego» (Enrique). Una vista ortográfica no tiene
 * ese problema: lo de delante tapa lo de detrás, y se sabe qué es cada cosa.
 *
 * ## Cómo se mide
 *
 * Cada parte se rasteriza con sus triángulos en una rejilla fina —un cuarto
 * de punto de la hoja— con su profundidad, como haría una tarjeta gráfica: así
 * de cada parte sale su contorno exacto y, dentro, lo que se ve de cada
 * material —la franja terracota, las ventanillas, las llantas—, sin que una
 * cara de dentro pinte encima de la de fuera. El orden entre partes, que es lo
 * que dice qué tapa qué, va por capas: ver `CAPAS_DE_PERFIL` y
 * `CAPAS_DE_PLANTA`. Las hélices no se miden pala a pala, que paradas dicen
 * poco: se dibuja su disco girando, de canto en las dos vistas.
 *
 * **Generado**: escribe `src/ui/aviones-del-kit.ts`, que no se edita a mano.
 *
 *     node scripts/aviones-del-kit.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const SALIDA = "src/ui/aviones-del-kit.ts";

// ── El glTF ──────────────────────────────────────────────────────────────

function leerGlb(fichero) {
  const b = readFileSync(fichero);
  const largoJson = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + largoJson).toString());
  const inicioBin = 20 + largoJson + 8;
  const bin = b.subarray(inicioBin);
  return { json, bin };
}

/** Matriz de 4×4 por columnas, como las de glTF. */
function multiplicar(a, b) {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
  return r;
}
function local(n) {
  if (n.matrix) return n.matrix;
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

/*
 * Los modelos van en los ejes de glTF, con el avión girado por su nodo raíz:
 * la primera coordenada es la envergadura —positiva a la derecha, la de
 * `pata-principal-derecha`—, la segunda es la altura y la tercera va a lo
 * largo, con el morro en negativo. Aquí se pasan a L (hacia el morro), Y (a
 * la derecha) y U (arriba).
 */
const aLYU = ([x, y, z]) => [-z, x, y];

/**
 * **Los triángulos de cada nodo con malla**, en el mundo y en L, Y, U:
 * `nombre → [{ material, tri: [[a, b, c], …] }]`.
 */
function triangulos(fichero) {
  const { json, bin } = leerGlb(fichero);
  const padre = new Map();
  json.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => padre.set(c, i)));
  const mundo = (i) => {
    let m = local(json.nodes[i]);
    for (let p = padre.get(i); p !== undefined; p = padre.get(p)) m = multiplicar(local(json.nodes[p]), m);
    return m;
  };
  const leerIndices = (acc) => {
    const vista = json.bufferViews[acc.bufferView];
    const desde = (vista.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    const tam = acc.componentType === 5125 ? 4 : acc.componentType === 5123 ? 2 : 1;
    return Array.from({ length: acc.count }, (_, k) =>
      tam === 4 ? bin.readUInt32LE(desde + k * 4) : tam === 2 ? bin.readUInt16LE(desde + k * 2) : bin.readUInt8(desde + k),
    );
  };
  const r = new Map();
  json.nodes.forEach((n, i) => {
    if (n.mesh === undefined || !n.name) return;
    const m = mundo(i);
    const prims = [];
    for (const prim of json.meshes[n.mesh].primitives) {
      if ((prim.mode ?? 4) !== 4) continue;
      const acc = json.accessors[prim.attributes.POSITION];
      const vista = json.bufferViews[acc.bufferView];
      const paso = vista.byteStride ?? 12;
      const desde = (vista.byteOffset ?? 0) + (acc.byteOffset ?? 0);
      const pts = [];
      for (let k = 0; k < acc.count; k++) {
        const o = desde + k * paso;
        const x = bin.readFloatLE(o);
        const y = bin.readFloatLE(o + 4);
        const z = bin.readFloatLE(o + 8);
        pts.push(
          aLYU([
            m[0] * x + m[4] * y + m[8] * z + m[12],
            m[1] * x + m[5] * y + m[9] * z + m[13],
            m[2] * x + m[6] * y + m[10] * z + m[14],
          ]),
        );
      }
      const idx = prim.indices !== undefined ? leerIndices(json.accessors[prim.indices]) : pts.map((_, k) => k);
      const tri = [];
      for (let k = 0; k + 2 < idx.length; k += 3) tri.push([pts[idx[k]], pts[idx[k + 1]], pts[idx[k + 2]]]);
      prims.push({ material: json.materials?.[prim.material]?.name ?? "casco", tri });
    }
    r.set(n.name, prims);
  });
  return r;
}

/**
 * **Un triángulo cortado por el plano `L = corte`**: lo que queda del lado
 * pedido, en triángulos. Es lo que separa el capó del motor del resto del
 * fuselaje en las avionetas, sin dientes de sierra.
 */
function cortar(t, corte, delante) {
  const dentro = (p) => (delante ? p[0] >= corte : p[0] < corte);
  const pol = [];
  for (let i = 0; i < 3; i++) {
    const a = t[i];
    const b = t[(i + 1) % 3];
    if (dentro(a)) pol.push(a);
    if (dentro(a) !== dentro(b)) {
      const f = (corte - a[0]) / (b[0] - a[0]);
      pol.push([corte, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
    }
  }
  const r = [];
  for (let i = 1; i + 1 < pol.length; i++) r.push([pol[0], pol[i], pol[i + 1]]);
  return r;
}

// ── Las vistas ───────────────────────────────────────────────────────────

/**
 * **Las dos vistas**, en metros: de un punto L, Y, U a la hoja (x a la
 * derecha, y hacia abajo) y su profundidad (más es más cerca de quien mira).
 */
const VISTAS = {
  // De perfil, por la derecha: el morro a la derecha, y lo de la derecha del avión, delante.
  perfil: { ver: ([L, , U]) => [L, -U], hondo: ([, Y]) => Y },
  // En planta, desde arriba: el morro arriba, la derecha del avión a la derecha de quien mira.
  planta: { ver: ([L, Y]) => [Y, -L], hondo: ([, , U]) => U },
};

/**
 * **Dónde cabe el avión en la hoja de 640 × 340**, lejos de los botones de
 * las esquinas: de perfil, encima de la bandeja de las piezas, que va abajo;
 * desde arriba, de alto entero, que con el morro arriba lo que manda es el
 * largo, y a la izquierda de la bandeja de las luces.
 */
const SITIOS = {
  perfil: { x0: 44, x1: 596, y0: 14, y1: 242 },
  // Y por debajo de la cola, sitio para el abanico de la luz blanca, que alumbra hacia atrás.
  planta: { x0: 30, x1: 540, y0: 14, y1: 284 },
};

/** Lo que mide una celda de la rejilla, en puntos de la hoja: un cuarto, que el contorno no tenga escalones. */
const CELDA = 0.25;

/**
 * **Rasteriza una parte**: cada celda se queda con el material del triángulo
 * más cercano. `tri` en puntos de la hoja, con su profundidad.
 */
function rasterizar(tris) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const t of tris)
    for (const p of t.p) {
      x0 = Math.min(x0, p[0]);
      y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]);
      y1 = Math.max(y1, p[1]);
    }
  x0 = Math.floor(x0) - 1;
  y0 = Math.floor(y0) - 1;
  const W = Math.ceil((x1 - x0) / CELDA) + 3;
  const H = Math.ceil((y1 - y0) / CELDA) + 3;
  const mat = new Int16Array(W * H).fill(-1);
  const z = new Float32Array(W * H).fill(-Infinity);
  for (const t of tris) {
    const [a, b, c] = t.p.map(([x, y]) => [(x - x0) / CELDA, (y - y0) / CELDA]);
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-9) continue;
    const i0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const i1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const j0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const j1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let j = j0; j <= j1; j++) {
      const py = j + 0.5;
      for (let i = i0; i <= i1; i++) {
        const px = i + 0.5;
        const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
        const w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const h = w0 * t.z[0] + w1 * t.z[1] + w2 * t.z[2];
        const k = j * W + i;
        if (h > z[k]) {
          z[k] = h;
          mat[k] = t.m;
        }
      }
    }
  }
  return { W, H, x0, y0, mat };
}

/**
 * **Los contornos de una máscara**, por los bordes de las celdas: cada borde
 * entre una celda llena y una vacía, en el sentido de las agujas del reloj, y
 * encadenados en lazos. En un cruce en diagonal se gira a la derecha, que
 * deja separadas dos celdas que solo se tocan por la esquina.
 */
function contornos(mask, W, H) {
  const V = W + 1;
  const sale = new Uint8Array(V * (H + 1));
  const lleno = (i, j) => i >= 0 && j >= 0 && i < W && j < H && mask[j * W + i] === 1;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      if (!lleno(i, j)) continue;
      if (!lleno(i, j - 1)) sale[j * V + i] |= 1; // arriba, hacia la derecha
      if (!lleno(i + 1, j)) sale[j * V + i + 1] |= 2; // derecha, hacia abajo
      if (!lleno(i, j + 1)) sale[(j + 1) * V + i + 1] |= 4; // abajo, hacia la izquierda
      if (!lleno(i - 1, j)) sale[(j + 1) * V + i] |= 8; // izquierda, hacia arriba
    }
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  const lazos = [];
  for (let v0 = 0; v0 < sale.length; v0++) {
    while (sale[v0]) {
      let d = [0, 1, 2, 3].find((k) => sale[v0] & (1 << k));
      let v = v0;
      const pts = [];
      let antes = -1;
      for (let guarda = 0; guarda < 1e7; guarda++) {
        sale[v] &= ~(1 << d);
        if (d !== antes) pts.push([v % V, Math.floor(v / V)]);
        antes = d;
        v = v + DX[d] + DY[d] * V;
        if (v === v0) break;
        const s = sale[v];
        const derecha = (d + 1) % 4;
        const izquierda = (d + 3) % 4;
        d = s & (1 << derecha) ? derecha : s & (1 << d) ? d : izquierda;
        if (!(s & (1 << d))) break;
      }
      if (pts.length >= 3) lazos.push(pts);
    }
  }
  return lazos;
}

/** Ramer-Douglas-Peucker, en un trozo abierto. */
function simplificar(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const largo = Math.hypot(bx - ax, by - ay) || 1e-9;
  let peor = 0;
  let k = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / largo;
    if (d > peor) {
      peor = d;
      k = i;
    }
  }
  if (peor <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplificar(pts.slice(0, k + 1), eps).slice(0, -1), ...simplificar(pts.slice(k), eps)];
}

const areaDe = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
};

const r1 = (n) => Math.round(n * 10) / 10;

/** Un lazo cerrado, simplificado, en un camino de SVG; o nada si es una mota. */
function camino(lazos, ox, oy, minimo) {
  const trozos = [];
  for (const lazo of lazos) {
    const pts = lazo.map(([i, j]) => [ox + i * CELDA, oy + j * CELDA]);
    if (Math.abs(areaDe(pts)) < minimo) continue;
    // Cerrado: se parte por el punto más lejano del primero y se simplifica cada mitad.
    let k = 0;
    let lejos = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
      if (d > lejos) {
        lejos = d;
        k = i;
      }
    }
    const a = simplificar(pts.slice(0, k + 1), 0.3);
    const b = simplificar([...pts.slice(k), pts[0]], 0.3);
    const juntos = [...a.slice(0, -1), ...b.slice(0, -1)];
    if (juntos.length < 3) continue;
    trozos.push(`M${juntos.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(" L")}Z`);
  }
  return trozos.join("");
}

/** Los materiales que se pintan, por su nombre en el modelo. Los demás no salen en el dibujo. */
const MATERIALES = ["casco", "capo", "detalle", "cola", "remate", "oscuro", "gris", "aluminio", "goma", "cristal"];

/**
 * **Una parte, dibujada en una vista**: su contorno, el color de lo que más
 * se ve de ella y, encima, lo que se ve de los otros materiales.
 */
function dibujarParte(tris, aHoja, hondo) {
  const enHoja = [];
  for (const { material, t, pintado } of tris) {
    const m = MATERIALES.indexOf(material);
    if (m < 0) continue;
    // Lo pintado sobre el casco gana al casco aunque vaya pegado a él: si no, la franja y las ventanillas se pierden.
    const sesgo = pintado ? 0.01 : 0;
    enHoja.push({ p: t.map(aHoja), z: t.map((q) => hondo(q) + sesgo), m });
  }
  if (!enHoja.length) return null;
  const { W, H, x0, y0, mat } = rasterizar(enHoja);
  const todo = new Uint8Array(W * H);
  const cuantas = new Array(MATERIALES.length).fill(0);
  for (let k = 0; k < mat.length; k++)
    if (mat[k] >= 0) {
      todo[k] = 1;
      cuantas[mat[k]]++;
    }
  const d = camino(contornos(todo, W, H), x0, y0, 2);
  if (!d) return null;
  const base = cuantas.indexOf(Math.max(...cuantas));
  const encima = [];
  for (let m = 0; m < MATERIALES.length; m++) {
    if (m === base || !cuantas[m]) continue;
    const solo = new Uint8Array(W * H);
    for (let k = 0; k < mat.length; k++) if (mat[k] === m) solo[k] = 1;
    const dm = camino(contornos(solo, W, H), x0, y0, 1.2);
    if (dm) encima.push({ color: MATERIALES[m], d: dm });
  }
  return { color: MATERIALES[base], d, encima };
}

// ── La flota ─────────────────────────────────────────────────────────────

/**
 * **Cada tipo**: dónde se corta el morro para hacer la pieza del motor en las
 * avionetas de motor delante (L del cortafuegos, en metros) y si lleva el sol
 * de la casa en la cola, como su ficha (`appearance.motivo` en `aircraft.ts`).
 */
const TIPOS = [
  { id: "jaz-20", corteMorro: 1.7, sol: false },
  { id: "jaz-25", corteMorro: 3.1, sol: false },
  { id: "jaz-40", sol: true },
  { id: "jaz-60", sol: true },
  { id: "jaz-90", sol: true },
  { id: "jaz-120", sol: true },
];

/** Lo que va pintado sobre el casco: la franja, la raya fina, los cristales y las puertas. */
/** Lo pintado en los costados, que desde arriba no se ve: de canto, solo serían rayitas en el borde. */
const DE_COSTADO = /^(cintura|cintura-fina|ventanillas|ventanita-puerta|puerta.*|salida-de-emergencia-.*|gondola-franja)$/;
const PINTADO = /^(cintura|cintura-fina|ventanillas|ventanita-puerta|parabrisas|parabrisas-lado|carlinga|puerta.*|salida-de-emergencia-.*|gondola-franja)$/;
const DEL_CASCO = /^(fuselaje|carenado|cintura|cintura-fina|ventanillas|ventanita-puerta|parabrisas|parabrisas-lado|carlinga|carlinga-arco|carlinga-marco|puerta.*|salida-de-emergencia-.*)$/;

/**
 * **Las capas de perfil**, de detrás a delante: la deriva y las ruedas detrás
 * del fuselaje, que sus raíces se metan en él; el fuselaje con su librea; y
 * delante, lo que está del lado de quien mira: el estabilizador, la riostra y
 * el ala, los motores del ala y sus hélices.
 */
const CAPAS_DE_PERFIL = {
  deriva: 10,
  tren: 20,
  casco: 30,
  cabanas: 35,
  motorDelMorro: 40,
  estabilizador: 50,
  puntal: 55,
  alaAbajo: 60,
  ala: 62,
  alaArriba: 64,
  motor: 70,
  helice: 76,
};

/**
 * **Las capas en planta**, de abajo arriba: los reactores, colgados, debajo
 * del ala; el ala baja y el estabilizador debajo del fuselaje; el ala alta y
 * las góndolas de hélice encima; la deriva encima del fuselaje, y la cola en T
 * encima de todo. Las ruedas no salen: desde arriba no se ven.
 */
const CAPAS_DE_PLANTA = {
  reactor: 10,
  estabilizador: 20,
  alaAbajo: 30,
  ala: 32,
  casco: 40,
  motorDelMorro: 45,
  alaAlta: 50,
  alaArriba: 52,
  gondola: 60,
  helice: 66,
  deriva: 70,
  colaEnT: 80,
};

const caja3 = (pts) => {
  const c = [0, 1, 2].map((k) => [Math.min(...pts.map((p) => p[k])), Math.max(...pts.map((p) => p[k]))]);
  return { L: c[0], Y: c[1], U: c[2], centro: c.map(([a, b]) => (a + b) / 2) };
};

function tipo(t) {
  const nodos = triangulos(`public/assets/aeronaves/${t.id}.glb`);
  const hay = (n) => nodos.has(n);
  /** Los triángulos de unos nodos, con su material; `filtro` decide cuáles. */
  const de = (nombres, filtro = () => true) =>
    nombres.flatMap((n) =>
      (nodos.get(n) ?? []).flatMap((p) =>
        p.tri.filter(filtro).map((tri) => ({ material: p.material, t: tri, pintado: PINTADO.test(n), deCostado: DE_COSTADO.test(n) })),
      ),
    );
  const vertices = (nombres) => de(nombres).flatMap((x) => x.t);
  const nombres = [...nodos.keys()];

  const fus = vertices(["fuselaje"]);
  const cf = caja3(fus);
  const alaAlta = hay("ala") && caja3(vertices(["ala"])).U[0] > cf.U[1] - 0.6;
  const colaEnT = caja3(vertices(["estabilizador"])).U[0] > cf.U[1];
  const corte = t.corteMorro ?? null;

  /*
   * **Las partes**: `pieza` del juego o `null` si es del tablero, sus
   * triángulos y su capa en cada vista (sin capa, no sale en esa vista).
   */
  const partes = [];
  const parte = (pieza, tris, perfil, planta, extra = {}) => {
    if (tris.length) partes.push({ pieza, tris, perfil, planta, ...extra });
  };
  const delCasco = nombres.filter((n) => DEL_CASCO.test(n));
  const casco = de(delCasco);
  if (corte !== null) {
    // El morro hasta el cortafuegos es la pieza del motor; lo de detrás, el tablero.
    const detras = casco.flatMap((c) => cortar(c.t, corte, false).map((x) => ({ ...c, t: x })));
    const delante = casco.flatMap((c) => cortar(c.t, corte, true).map((x) => ({ ...c, t: x })));
    parte(null, detras, CAPAS_DE_PERFIL.casco, CAPAS_DE_PLANTA.casco);
    parte("motor", [...delante, ...de(["helice", "tomas"])], CAPAS_DE_PERFIL.motorDelMorro, CAPAS_DE_PLANTA.motorDelMorro);
  } else parte(null, casco, CAPAS_DE_PERFIL.casco, CAPAS_DE_PLANTA.casco);
  parte(null, de(["cabanas"]), CAPAS_DE_PERFIL.cabanas, null);

  // La cola: la deriva, y el estabilizador, que en la cola en T va encima de ella.
  parte("deriva", de(["deriva"]), CAPAS_DE_PERFIL.deriva, CAPAS_DE_PLANTA.deriva, { sol: t.sol });
  parte(
    "estabilizador",
    de(["estabilizador", "bala-de-cola"]),
    CAPAS_DE_PERFIL.estabilizador,
    colaEnT ? CAPAS_DE_PLANTA.colaEnT : CAPAS_DE_PLANTA.estabilizador,
  );

  // Las alas, con lo que llevan pegado: carenados de los flaps, aletas de las puntas y el tramo fijo.
  const delAla = nombres.filter((n) => /^(canoa-.*|remate|franja-fija)$/.test(n));
  if (hay("ala")) {
    parte("ala", de(["ala", ...delAla]), CAPAS_DE_PERFIL.ala, alaAlta ? CAPAS_DE_PLANTA.alaAlta : CAPAS_DE_PLANTA.ala);
    // La riostra del ala alta, que va de la panza al ala: delante del fuselaje y detrás del ala.
    parte("ala", de(["puntal-del-ala"]), CAPAS_DE_PERFIL.puntal, null);
  } else {
    parte("alaArriba", de(["ala-alta"]), CAPAS_DE_PERFIL.alaArriba, CAPAS_DE_PLANTA.alaArriba);
    parte("alaAbajo", de(["ala-baja"]), CAPAS_DE_PERFIL.alaAbajo, CAPAS_DE_PLANTA.alaAbajo);
    /*
     * Los montantes entre las dos alas no salen, como los cables: de perfil
     * son una placa en diagonal delante de la cabina entera, que tapa lo que
     * se quiere enseñar —dos alas que se parecen, una arriba y otra abajo— y
     * se comía la pieza del ala de arriba. Lo que la sujeta en el dibujo son
     * los montantes de la cabina, que sí salen.
     */
  }

  // Los motores del ala: las góndolas, encima del ala, o los reactores, colgados debajo. Cada uno en su capa, que se vea dónde acaba uno y empieza el otro.
  const helices = [];
  if (hay("gondola")) {
    parte("motor", de(["gondola", "gondola-franja", "escapes", "toma", "tomas", "helice-derecha", "helice-izquierda"]), CAPAS_DE_PERFIL.motor, CAPAS_DE_PLANTA.gondola);
    for (const lado of ["derecha", "izquierda"]) helices.push({ palas: [`helice-${lado}-palas`, `helice-${lado}-palas-puntas`], buje: `helice-${lado}` });
  }
  if (hay("motor")) parte("motor", de(["motor", "motor-cascada", "motor-manguito", "pilon"]), CAPAS_DE_PERFIL.motor, CAPAS_DE_PLANTA.reactor);
  for (const k of [0, 1])
    if (hay(`motor-${k}`))
      parte("motor", de([`motor-${k}`, `motor-${k}-cascada`, `motor-${k}-manguito`, `pilon-${k}`]), CAPAS_DE_PERFIL.motor + k, CAPAS_DE_PLANTA.reactor + k);
  if (corte !== null) helices.push({ palas: ["helice-palas", "helice-palas-puntas"], buje: "helice", delMorro: true });

  // El tren: cada pata con su rueda, su llanta y su polaina.
  const tren = (pieza, patron) => parte(pieza, de(nombres.filter((n) => patron.test(n))), CAPAS_DE_PERFIL.tren, null);
  tren("trenPrincipal", /^(pata|rueda)-(principal|ala|panza)|^rueda-polaina$|^rueda-principal-llanta/);
  tren("trenMorro", /^(pata|rueda)-(de-)?morro/);
  tren("trenCola", /^(pata|rueda)-de-cola/);

  // Las luces: en la punta de cada ala —del ala de arriba en el biplano— y la blanca, lo más atrás de la cola.
  const alaDeLuces = vertices([hay("ala") ? "ala" : "ala-alta"]);
  const punta = (s) => {
    const pts = alaDeLuces.filter((p) => p[1] * s > 0.05);
    const extremo = pts.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
    const cerca = pts.filter((p) => Math.abs(p[1]) > Math.abs(extremo[1]) - 0.25);
    const delante = cerca.reduce((a, b) => (b[0] > a[0] ? b : a));
    return [delante[0], extremo[1], delante[2]];
  };
  const cola = fus.reduce((a, b) => (b[0] < a[0] ? b : a));
  const luces = { roja: punta(-1), verde: punta(1), blanca: [cola[0], 0, cola[2]] };

  // Los discos de las hélices: su eje y su radio, de las palas.
  const discos = helices
    .filter((h) => hay(h.palas[0]))
    .map((h) => {
      const palas = vertices(h.palas);
      const buje = caja3(hay(h.buje) ? vertices([h.buje]) : palas);
      const c = [caja3(palas).centro[0], buje.centro[1], buje.centro[2]];
      const R = Math.max(...palas.map((p) => Math.hypot(p[1] - c[1], p[2] - c[2])));
      return { c, R, delMorro: !!h.delMorro };
    });

  return { id: t.id, partes, luces, discos, alaAlta, colaEnT };
}

// ── A la hoja ────────────────────────────────────────────────────────────

/** **Una vista entera**: la escala que cabe en el sitio, y cada parte dibujada en su capa. */
function vista(a, nombre) {
  const { ver, hondo } = VISTAS[nombre];
  const SITIO = SITIOS[nombre];
  const enVista = a.partes.filter((p) => p[nombre] !== null && p[nombre] !== undefined);
  // De perfil, solo lo del lado de acá: lo de detrás queda tapado por su gemelo y por el fuselaje.
  const visible = (tri) => nombre === "planta" || (tri[0][1] + tri[1][1] + tri[2][1]) / 3 >= -0.02;
  const vale = (x) => visible(x.t) && !(nombre === "planta" && x.deCostado);
  const pts = enVista.flatMap((p) => p.tris.filter(vale).flatMap((x) => x.t.map(ver)));
  for (const disco of a.discos) {
    const [x, y] = ver(disco.c);
    pts.push([x - disco.R, y - disco.R], [x + disco.R, y + disco.R]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [ax, bx, ay, by] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((SITIO.x1 - SITIO.x0) / (bx - ax), (SITIO.y1 - SITIO.y0) / (by - ay));
  const ox = (SITIO.x0 + SITIO.x1) / 2 - ((ax + bx) / 2) * s;
  const oy = (SITIO.y0 + SITIO.y1) / 2 - ((ay + by) / 2) * s;
  const P = (p) => {
    const [x, y] = ver(p);
    return [x * s + ox, y * s + oy];
  };
  const dibujadas = [];
  for (const p of [...enVista].sort((x, y) => x[nombre] - y[nombre])) {
    const tris = p.tris.filter(vale);
    const dib = dibujarParte(tris, P, hondo);
    if (!dib) continue;
    const parte = { pieza: p.pieza, capa: p[nombre], color: dib.color, d: dib.d };
    if (dib.encima.length) parte.encima = dib.encima;
    if (p.sol && nombre === "perfil") parte.sol = solDeLaDeriva(tris.flatMap((x) => x.t), P);
    dibujadas.push(parte);
  }
  // Las hélices, de canto: de perfil solo la de este lado, que la otra queda detrás.
  for (const disco of a.discos) {
    if (nombre === "perfil" && disco.c[1] < -0.05) continue;
    const [x, y] = P(disco.c);
    const R = disco.R * s;
    const fino = Math.max(2.2, R * 0.08);
    // La del morro, justo encima de su capó; las del ala, encima de su góndola.
    const capas = nombre === "perfil" ? CAPAS_DE_PERFIL : CAPAS_DE_PLANTA;
    dibujadas.push({
      pieza: "motor",
      capa: disco.delMorro ? capas.motorDelMorro + 1 : capas.helice,
      color: "helice",
      d: elipse(x, y, nombre === "perfil" ? fino : R, nombre === "perfil" ? R : fino),
    });
  }
  dibujadas.sort((x, y) => x.capa - y.capa);
  const cajaDe = [SITIO.x0, SITIO.y0, SITIO.x1, SITIO.y1].map(r1);
  return { escala: r1(s), caja: cajaDe, partes: dibujadas.map(({ capa, ...resto }) => resto), P };
}

/** Una elipse como camino, para que se mida y se pinte como cualquier otra parte. */
function elipse(cx, cy, rx, ry) {
  const n = 28;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return `${r1(cx + rx * Math.cos(a))} ${r1(cy + ry * Math.sin(a))}`;
  });
  return `M${pts.join(" L")}Z`;
}

/**
 * **El sol de la casa en la deriva**, como lo pinta `world/librea.ts`: medio
 * sol naciendo en la raíz —al 12 % de la altura, al 56 % de la cuerda desde
 * el borde de ataque— y de radio, tres décimas de esa cuerda.
 */
function solDeLaDeriva(pts, P) {
  const U = pts.map((p) => p[2]);
  const u0 = Math.min(...U);
  const u1 = Math.max(...U);
  const u = u0 + 0.12 * (u1 - u0);
  const franja = pts.filter((p) => Math.abs(p[2] - u) < 0.06 * (u1 - u0));
  const ataque = Math.max(...franja.map((p) => p[0]));
  const salida = Math.min(...franja.map((p) => p[0]));
  const L = ataque + 0.56 * (salida - ataque);
  const [cx, cy] = P([L, 0, u]);
  const [bx] = P([L + 0.3 * (ataque - salida), 0, u]);
  return { c: [r1(cx), r1(cy)], r: r1(Math.abs(bx - cx)) };
}

function aLaHoja(a) {
  const perfil = vista(a, "perfil");
  const planta = vista(a, "planta");
  const luces = Object.fromEntries(Object.entries(a.luces).map(([k, p]) => [k, planta.P(p).map(r1)]));
  // Lo más bajo de las ruedas, de perfil: donde está el suelo para la sombra y el despegue.
  const ruedas = perfil.partes.filter((p) => p.pieza?.startsWith("tren"));
  const suelo = Math.max(...ruedas.flatMap((p) => [...p.d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]))));
  const { P: _p, ...soloPerfil } = perfil;
  const { P: _q, ...soloPlanta } = planta;
  return { id: a.id, perfil: { ...soloPerfil, suelo: r1(suelo) }, planta: { ...soloPlanta, luces } };
}

const aviones = TIPOS.map((t) => aLaHoja(tipo(t)));

const cabecera = `/**
 * **Los aviones de «Armá tu avión»**, medidos en los modelos de la flota.
 *
 * **Generado** por \`scripts/aviones-del-kit.mjs\` desde
 * \`public/assets/aeronaves/jaz-*.glb\`. No se edita a mano: se regenera.
 *
 * Cada avión, en dos vistas de libro sobre la hoja del kit (640 × 340): **de
 * perfil**, por la derecha y con el morro a la derecha, que es donde se arma,
 * y **en planta**, desde arriba y con el morro hacia arriba, que es donde se
 * ponen las luces. Las partes van **en el orden en que se pintan**, de
 * detrás a delante: lo que va después tapa lo de antes. \`pieza\` es la pieza
 * del juego a la que pertenece cada una, o \`null\` si es del tablero.
 */

export type PiezaDelModelo = "ala" | "alaArriba" | "alaAbajo" | "motor" | "estabilizador" | "deriva" | "trenPrincipal" | "trenMorro" | "trenCola";

/** Los colores, por el material del modelo; y \`helice\`, el disco de una hélice girando. */
export type ColorDelModelo = "casco" | "capo" | "detalle" | "cola" | "remate" | "oscuro" | "gris" | "aluminio" | "goma" | "cristal";

export interface ParteDelDibujo {
  readonly pieza: PiezaDelModelo | null;
  /** Lo que se ve de la parte, su color y su contorno. */
  readonly color: ColorDelModelo | "helice";
  readonly d: string;
  /** Lo que se ve de otro color, encima: la franja, las ventanillas, las llantas. */
  readonly encima?: readonly { readonly color: ColorDelModelo; readonly d: string }[];
  /** El sol de la casa, en la deriva de los que lo llevan. */
  readonly sol?: { readonly c: readonly [number, number]; readonly r: number };
}

export interface VistaDelModelo {
  /** Puntos de la hoja por metro. */
  readonly escala: number;
  /** El sitio de la hoja en que cabe: x0, y0, x1, y1. */
  readonly caja: readonly [number, number, number, number];
  readonly partes: readonly ParteDelDibujo[];
}

export interface AvionDelModelo {
  readonly id: string;
  /** De perfil, y dónde está el suelo: lo más bajo de las ruedas. */
  readonly perfil: VistaDelModelo & { readonly suelo: number };
  /** En planta, y dónde va cada luz de navegación: las puntas de las alas y lo más atrás de la cola. */
  readonly planta: VistaDelModelo & {
    readonly luces: { readonly roja: readonly [number, number]; readonly verde: readonly [number, number]; readonly blanca: readonly [number, number] };
  };
}
`;

writeFileSync(
  SALIDA,
  `${cabecera}
export const AVIONES_DEL_MODELO: Readonly<Record<string, AvionDelModelo>> = ${JSON.stringify(Object.fromEntries(aviones.map((a) => [a.id, a])))};\n`,
);
console.log(
  `→ ${SALIDA}: ${aviones.map((a) => `${a.id} (perfil ${a.perfil.partes.length} partes a ${a.perfil.escala} pt/m, planta ${a.planta.partes.length} a ${a.planta.escala})`).join(", ")}`,
);
