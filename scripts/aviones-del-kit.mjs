/**
 * **Los aviones de «Armá tu avión»**, sacados de los modelos del juego.
 *
 * El juego del kit de viaje arma un avión por nivel, uno por tipo de la
 * flota, y cada pieza tiene que ir donde la lleva ese tipo de verdad (regla 4
 * del AGENTS.md). Dibujadas de memoria, las piezas acabaron con el motor
 * colgando del fuselaje delante del ala (Enrique, 19-10-2026). Así que no se
 * dibujan: se miden. Este guion abre los modelos de la flota
 * —`public/assets/aeronaves/jaz-*.glb`, los que vuela el juego, hechos con
 * `modelos/*.py` a partir de las medidas de su ficha— y saca de cada parte su
 * contorno, en una vista de tres cuartos por delante, desde poco por encima y por la derecha:
 * la que deja ver a la vez las dos alas, el motor debajo o encima del ala, el
 * tren y la forma de la cola.
 *
 * - El fuselaje y las góndolas son cuerpos de revolución: por rebanadas a lo
 *   largo, su techo, su panza y su ancho.
 * - El ala, el estabilizador y la deriva son superficies: por rebanadas a lo
 *   ancho (o a lo alto, la deriva), su borde de ataque y el de salida.
 * - Las ruedas, círculos de su tamaño; las patas, del pozo a la rueda.
 * - Las hélices, su disco.
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
const identidad = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
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

/** Los vértices de cada nodo con malla, en el mundo: `nombre → [[x, y, z], …]`. */
function vertices(fichero) {
  const { json, bin } = leerGlb(fichero);
  const padre = new Map();
  json.nodes.forEach((n, i) =>
    (n.children ?? []).forEach((c) => padre.set(c, i)),
  );
  const mundo = (i) => {
    let m = local(json.nodes[i]);
    for (let p = padre.get(i); p !== undefined; p = padre.get(p))
      m = multiplicar(local(json.nodes[p]), m);
    return m;
  };
  const r = new Map();
  json.nodes.forEach((n, i) => {
    if (n.mesh === undefined || !n.name) return;
    const m = mundo(i);
    const pts = [];
    for (const prim of json.meshes[n.mesh].primitives) {
      const acc = json.accessors[prim.attributes.POSITION];
      const vista = json.bufferViews[acc.bufferView];
      const paso = vista.byteStride ?? 12;
      const desde = (vista.byteOffset ?? 0) + (acc.byteOffset ?? 0);
      for (let k = 0; k < acc.count; k++) {
        const o = desde + k * paso;
        const x = bin.readFloatLE(o);
        const y = bin.readFloatLE(o + 4);
        const z = bin.readFloatLE(o + 8);
        pts.push([
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14],
        ]);
      }
    }
    r.set(n.name, pts);
  });
  return r;
}

// ── Los ejes del avión ───────────────────────────────────────────────────

/*
 * Los modelos van en los ejes de glTF, con el avión girado por su nodo raíz:
 * la primera coordenada es la envergadura —positiva a la derecha, la de
 * `pata-principal-derecha`—, la segunda es la altura y la tercera va a lo
 * largo, con el morro en negativo. Aquí se pasan a L (hacia el morro), Y (a
 * la derecha) y U (arriba).
 */
const aLYU = ([x, y, z]) => [-z, x, y];

// ── La vista ─────────────────────────────────────────────────────────────

/**
 * **Tres cuartos por delante y desde arriba, por la derecha**, como se ve un
 * avión desde la terminal: el morro a la derecha de la hoja, el ala derecha
 * delante, hacia abajo y hacia la cola, y la izquierda detrás, asomando por
 * encima del fuselaje hacia el morro, que así se lee como el ala del otro lado
 * y no como una segunda deriva. Desde poca altura —el ala se ve casi de canto—
 * el motor y el tren cuelgan por debajo de ella, sin quedar pintados encima;
 * y la cola en T se ve como una T.
 *
 * Una vista por clase de avión (Enrique, 24-10-2026): en los reactores, de ala
 * en flecha, la profundidad corre más hacia el morro, que si no el ala de
 * atrás se queda de pie como una chimenea. `elev`, grados por encima del ala;
 * `kx`, lo que corre cada metro de profundidad a lo largo, negativo hacia el
 * morro del ala de atrás.
 */
let SE = 0;
let CE = 1;
let KX = 0;
function ponerVista(elev, kx) {
  SE = Math.sin((elev * Math.PI) / 180);
  CE = Math.cos((elev * Math.PI) / 180);
  KX = kx;
}
const ver = ([L, Y, U]) => [L + KX * Y, -U * CE + Y * SE];
/** Lo cerca que queda de quien mira: lo que está más cerca tapa lo de detrás. */
const cerca = ([, Y, U]) => Y * CE + U * SE;

// ── Las formas ───────────────────────────────────────────────────────────

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * **Un cuerpo de revolución**, por rebanadas a lo largo: su contorno en la
 * vista. Cada rebanada es una elipse de su ancho y su alto, y en la vista
 * ocupa de su centro a `±√((h·cos e)² + (a·sen e)²)`.
 */
function cuerpo(pts, rebanadas = 28, corte = null) {
  const L = pts.map((p) => p[0]);
  let l0 = Math.min(...L);
  let l1 = Math.max(...L);
  if (corte) {
    l0 = Math.max(l0, corte[0]);
    l1 = Math.min(l1, corte[1]);
  }
  const arriba = [];
  const abajo = [];
  const lomo = [];
  let cercania = [];
  for (let i = 0; i <= rebanadas; i++) {
    const l = l0 + ((l1 - l0) * i) / rebanadas;
    const ancho = (l1 - l0) / rebanadas;
    const en = pts.filter((p) => Math.abs(p[0] - l) <= ancho * 0.75);
    if (en.length < 3) continue;
    const Ys = en.map((p) => p[1]);
    const Us = en.map((p) => p[2]);
    const yc = (Math.min(...Ys) + Math.max(...Ys)) / 2;
    const a = (Math.max(...Ys) - Math.min(...Ys)) / 2;
    const uc = (Math.min(...Us) + Math.max(...Us)) / 2;
    const h = (Math.max(...Us) - Math.min(...Us)) / 2;
    const e = Math.hypot(h * CE, a * SE);
    const [sx, sy] = ver([l, yc, uc]);
    arriba.push([sx, sy - e]);
    abajo.push([sx, sy + e]);
    lomo.push(ver([l, yc, uc + h]));
    cercania.push(cerca([l, yc, uc]));
  }
  return {
    contorno: [...arriba, ...abajo.reverse()],
    lomo,
    cerca: media(cercania),
    arriba,
    abajo: [...abajo].reverse(),
  };
}

/**
 * **Una superficie**, por rebanadas a lo ancho (`eje` 1) o a lo alto (`eje`
 * 2): en cada una, el borde de ataque y el de salida, a la altura media.
 */
function superficie(pts, eje = 1, rebanadas = 10) {
  const S = pts.map((p) => p[eje]);
  const s0 = Math.min(...S);
  const s1 = Math.max(...S);
  const ataque = [];
  const salida = [];
  for (let i = 0; i <= rebanadas; i++) {
    const s = s0 + ((s1 - s0) * i) / rebanadas;
    const paso = (s1 - s0) / rebanadas;
    const en = pts.filter((p) => Math.abs(p[eje] - s) <= paso * 0.6);
    if (en.length < 2) continue;
    const Ls = en.map((p) => p[0]);
    const delante = en.reduce((a, b) => (b[0] > a[0] ? b : a));
    const detras = en.reduce((a, b) => (b[0] < a[0] ? b : a));
    const otro = eje === 1 ? 2 : 1;
    const m = media(en.map((p) => p[otro]));
    const punto = (l) => (eje === 1 ? [l, s, m] : [l, m, s]);
    ataque.push(punto(Math.max(...Ls)));
    salida.push(punto(Math.min(...Ls)));
    void delante;
    void detras;
  }
  const contorno3 = [...ataque, ...salida.reverse()];
  return {
    contorno: contorno3.map(ver),
    cerca: media(contorno3.map(cerca)),
    puntos3: contorno3,
  };
}

const lado = (pts, signo) =>
  pts.filter((p) => Math.sign(p[1]) === signo || Math.abs(p[1]) < 1e-3);
const solo = (pts, signo) => pts.filter((p) => p[1] * signo > 0.05);
const caja = (pts) => {
  const c = [0, 1, 2].map((k) => [
    Math.min(...pts.map((p) => p[k])),
    Math.max(...pts.map((p) => p[k])),
  ]);
  return { L: c[0], Y: c[1], U: c[2], centro: c.map(([a, b]) => (a + b) / 2) };
};

/**
 * **Lo que el tren se adelanta al tapar**, en metros de cercanía: nada. Desde
 * treinta y dos grados el ala baja lo tapaba y se dibujó encima, y quedaba
 * pintado sobre el ala como si estuviera posado en ella (Enrique, 24-10). Con
 * la vista baja cuelga por debajo del ala y se ve en su sitio. Lo usa todavía
 * el ala alta, que va encima de él.
 */
const POR_ENCIMA = 0;

/** Las ruedas de una pata: tantas como quepan en lo largo, de su radio. */
function ruedas(pts) {
  const c = caja(pts);
  const r = (c.U[1] - c.U[0]) / 2;
  const n = Math.max(1, Math.round((c.L[1] - c.L[0]) / (2 * r)));
  const paso = (c.L[1] - c.L[0]) / n;
  return Array.from({ length: n }, (_, i) => {
    const centro = [
      c.L[0] + paso * (i + 0.5),
      c.Y[1] - (c.Y[1] - c.Y[0]) * 0.25,
      c.centro[2],
    ];
    return { centro: ver(centro), r, cerca: cerca(centro) + POR_ENCIMA };
  });
}

/** Una pata: del punto más alto al centro de la rueda. */
function pata(pts, rueda) {
  const c = caja(pts);
  const arriba = pts.reduce((a, b) => (b[2] > a[2] ? b : a));
  const abajo = [caja(rueda).centro[0], arriba[1], caja(rueda).centro[2]];
  return {
    de: ver(arriba),
    a: ver(abajo),
    grueso: Math.min(0.16, Math.max(0.08, (c.Y[1] - c.Y[0]) * 0.5)),
    cerca: cerca(abajo) + POR_ENCIMA - 0.1,
  };
}

/** El disco de una hélice, en su plano: de lado se ve como una elipse estrecha. */
function helice(pts) {
  const c = caja(pts);
  const R = Math.max(c.Y[1] - c.Y[0], c.U[1] - c.U[0]) / 2;
  const centro = c.centro;
  const contorno = Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * 2 * Math.PI;
    return ver([
      centro[0],
      centro[1] + R * Math.cos(t),
      centro[2] + R * Math.sin(t),
    ]);
  });
  return { contorno, centro: ver(centro), R, cerca: cerca(centro) + 0.01 };
}

// ── La flota ─────────────────────────────────────────────────────────────

/*
 * **Cada tipo, con sus piezas.** El nombre de cada pieza es el de la parte del
 * modelo que la forma; `de` dice qué lado (+1 derecha, la de delante; −1
 * izquierda, la de detrás).
 */
const TIPOS = [
  { id: "jaz-20", corteMorro: -1.7, elev: 20, kx: -0.45 },
  { id: "jaz-25", corteMorro: -3.1, elev: 20, kx: -0.45 },
  { id: "jaz-40", elev: 20, kx: -0.45 },
  { id: "jaz-60", elev: 20, kx: -0.45 },
  { id: "jaz-90", elev: 16, kx: -0.9 },
  { id: "jaz-120", elev: 16, kx: -0.9 },
];

const r1 = (n) => Math.round(n * 10) / 10;

function tipo(t) {
  ponerVista(t.elev, t.kx);
  const v = vertices(`public/assets/aeronaves/${t.id}.glb`);
  const de = (nombre) => (v.get(nombre) ?? []).map(aLYU);
  const hay = (nombre) => v.has(nombre);
  const partes = []; // { pieza, forma, cerca, ... }
  const poner = (pieza, forma) => partes.push({ pieza, ...forma });

  // El fuselaje: el tablero. En los de motor en el morro, el morro hasta el cortafuegos es la pieza del motor.
  const fus = de("fuselaje");
  const cf = caja(fus);
  const corte = t.corteMorro !== undefined ? -t.corteMorro : null;
  const tablero = cuerpo(fus, 36, corte !== null ? [cf.L[0], corte] : null);
  poner(null, {
    tipo: "cuerpo",
    contorno: tablero.contorno,
    cerca: 0,
    lomo: tablero.lomo,
    arriba: tablero.arriba,
    abajo: tablero.abajo,
  });
  if (corte !== null) {
    const morro = cuerpo(fus, 8, [corte - 0.05, cf.L[1]]);
    poner("motor", { tipo: "cuerpo", contorno: morro.contorno, cerca: 0.02 });
    const h = [...de("helice"), ...de("helice-palas")];
    if (h.length) poner("motor", { tipo: "helice", ...helice(h) });
  }

  // Las alas: la derecha delante, la izquierda detrás. Las de un ala alta van enteras, por encima de todo.
  const alas = hay("ala")
    ? [["ala", de("ala")]]
    : [
        ["alaArriba", de("ala-alta")],
        ["alaAbajo", de("ala-baja")],
      ];
  const alta = caja(alas[0][1]).U[0] > cf.U[1] - 0.6 && alas.length === 1;
  for (const [nombre, pts] of alas) {
    if (alta) {
      const s = superficie(pts, 1, 14);
      // El ala alta, encima de todo, también del tren: una rueda pintada sobre el ala parecería posada en ella.
      poner("ala", { tipo: "superficie", contorno: s.contorno, cerca: 5 + POR_ENCIMA + 1 });
      continue;
    }
    const d = superficie(lado(pts, 1), 1, 6);
    const i = superficie(lado(pts, -1), 1, 6);
    if (nombre === "ala") {
      poner("alaDerecha", {
        tipo: "superficie",
        contorno: d.contorno,
        cerca: d.cerca,
      });
      poner("alaIzquierda", {
        tipo: "superficie",
        contorno: i.contorno,
        cerca: i.cerca,
      });
    } else {
      // El biplano: cada ala es una pieza entera, con sus dos lados.
      poner(nombre, {
        tipo: "superficie",
        contorno: d.contorno,
        cerca: d.cerca,
      });
      poner(nombre, {
        tipo: "superficie",
        contorno: i.contorno,
        cerca: i.cerca,
      });
    }
  }

  // La cola: el estabilizador, con sus dos lados en una pieza, y la deriva.
  const est = de("estabilizador");
  const ed = superficie(lado(est, 1), 1, 5);
  const ei = superficie(lado(est, -1), 1, 5);
  poner("estabilizador", {
    tipo: "superficie",
    contorno: ed.contorno,
    cerca: ed.cerca,
  });
  poner("estabilizador", {
    tipo: "superficie",
    contorno: ei.contorno,
    cerca: ei.cerca,
  });
  const der = superficie(de("deriva"), 2, 8);
  poner("deriva", { tipo: "superficie", contorno: der.contorno, cerca: 0.3 });

  // Los motores en el ala: góndolas de hélice o reactores colgados, el de la derecha y el de la izquierda.
  const motores = [];
  if (hay("gondola"))
    motores.push({
      cuerpo: de("gondola"),
      helice: (s) =>
        de(`helice-${s > 0 ? "derecha" : "izquierda"}`).concat(
          de(`helice-${s > 0 ? "derecha" : "izquierda"}-palas`),
        ),
    });
  if (hay("motor")) motores.push({ cuerpo: de("motor"), pilon: de("pilon") });
  for (const k of [0, 1])
    if (hay(`motor-${k}`))
      motores.push({ cuerpo: de(`motor-${k}`), pilon: de(`pilon-${k}`), k });
  for (const m of motores) {
    for (const s of [1, -1]) {
      const nombre = `motor${s > 0 ? "Derecho" : "Izquierdo"}${m.k !== undefined ? (m.k === 0 ? "Dentro" : "Fuera") : ""}`;
      const c = cuerpo(solo(m.cuerpo, s), 9);
      /*
       * La góndola de un motor de hélice va montada **sobre** el ala y asoma por
       * encima: se pinta después que su ala. El reactor cuelga debajo: antes.
       */
      const sobreElAla = !m.pilon;
      const alaSuya = partes.find(
        (p) => p.pieza === (s > 0 ? "alaDerecha" : "alaIzquierda"),
      );
      const cercaDeMotor =
        sobreElAla && alaSuya ? alaSuya.cerca + 0.05 : c.cerca;
      poner(nombre, {
        tipo: "cuerpo",
        contorno: c.contorno,
        cerca: cercaDeMotor,
        boca: m.pilon ? true : false,
      });
      if (m.pilon) {
        const p = superficie(solo(m.pilon, s), 0 + 2, 4);
        poner(nombre, {
          tipo: "superficie",
          contorno: p.contorno,
          cerca: cercaDeMotor - 0.01,
        });
      }
      if (m.helice) {
        const h = m.helice(s);
        if (h.length)
          poner(nombre, {
            tipo: "helice",
            ...helice(h),
            cerca: cercaDeMotor + 0.02,
          });
      }
    }
  }

  // El tren: las principales de la derecha y la izquierda en una pieza, y la de morro (o la de cola).
  const tren = (pieza, patas, ruedasDe) => {
    for (const [p, r] of patas.map((n, i) => [de(n), de(ruedasDe[i])])) {
      if (!r.length) continue;
      if (p.length) poner(pieza, { tipo: "pata", ...pata(p, r) });
      for (const w of ruedas(r)) poner(pieza, { tipo: "rueda", ...w });
    }
  };
  if (hay("pata-principal-derecha"))
    tren(
      "trenPrincipal",
      ["pata-principal-derecha", "pata-principal-izquierda"],
      ["rueda-principal-derecha", "rueda-principal-izquierda"],
    );
  if (hay("pata-principal")) {
    const p = de("pata-principal");
    const r = de("rueda-principal");
    tren("trenPrincipal", [], []);
    for (const s of [1, -1]) {
      poner("trenPrincipal", { tipo: "pata", ...pata(solo(p, s), solo(r, s)) });
      for (const w of ruedas(solo(r, s)))
        poner("trenPrincipal", { tipo: "rueda", ...w });
    }
  }
  if (hay("pata-ala-derecha")) {
    tren(
      "trenPrincipal",
      [
        "pata-ala-derecha",
        "pata-ala-izquierda",
        "pata-panza-derecha",
        "pata-panza-izquierda",
      ],
      [
        "rueda-ala-derecha",
        "rueda-ala-izquierda",
        "rueda-panza-derecha",
        "rueda-panza-izquierda",
      ],
    );
  }
  if (hay("pata-morro")) tren("trenMorro", ["pata-morro"], ["rueda-morro"]);
  if (hay("pata-de-morro"))
    tren("trenMorro", ["pata-de-morro"], ["rueda-de-morro"]);
  if (hay("pata-de-cola"))
    tren("trenCola", ["pata-de-cola"], ["rueda-de-cola"]);

  // Las luces: en la punta de cada ala —del ala de arriba en el biplano— y la blanca, lo más atrás de la cola.
  const alaDeLuces = alas[0][1];
  const punta = (s) => {
    const pts = solo(alaDeLuces, s);
    const extremo = pts.reduce((a, b) =>
      Math.abs(b[1]) > Math.abs(a[1]) ? b : a,
    );
    const cerca_ = pts.filter(
      (p) => Math.abs(p[1]) > Math.abs(extremo[1]) - 0.25,
    );
    const delante = cerca_.reduce((a, b) => (b[0] > a[0] ? b : a));
    return [delante[0], extremo[1], delante[2]];
  };
  const cola = fus.reduce((a, b) => (b[0] < a[0] ? b : a));
  const luces = {
    roja: ver(punta(-1)),
    verde: ver(punta(1)),
    blanca: ver([cola[0], 0, cola[2]]),
  };
  const morro = ver([
    cf.L[1],
    0,
    caja(fus.filter((p) => p[0] > cf.L[1] - 0.3)).centro[2],
  ]);

  // Las ventanillas, del lado de acá: una fila a media altura de la cabina.
  return { id: t.id, vista: { se: Math.round(SE * 1e4) / 1e4, ce: Math.round(CE * 1e4) / 1e4, kx: KX }, partes, luces, morro, fus: caja(fus) };
}

// ── A la hoja ────────────────────────────────────────────────────────────

/**
 * **El sitio del avión en la hoja**, de 640 × 340: arriba y en el centro,
 * con sitio a los lados y debajo para las piezas.
 */
const SITIO = { x0: 125, x1: 515, y0: 34, y1: 240 };

function aLaHoja(a) {
  const todos = [];
  for (const p of a.partes) {
    if (p.contorno) todos.push(...p.contorno);
    if (p.tipo === "rueda")
      todos.push(
        [p.centro[0] - p.r, p.centro[1] - p.r * CE],
        [p.centro[0] + p.r, p.centro[1] + p.r * CE],
      );
  }
  todos.push(a.luces.roja, a.luces.verde, a.luces.blanca);
  const xs = todos.map((p) => p[0]);
  const ys = todos.map((p) => p[1]);
  const [ax, bx, ay, by] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const s = Math.min(
    (SITIO.x1 - SITIO.x0) / (bx - ax),
    (SITIO.y1 - SITIO.y0) / (by - ay),
  );
  const ox = (SITIO.x0 + SITIO.x1) / 2 - ((ax + bx) / 2) * s;
  const oy = (SITIO.y0 + SITIO.y1) / 2 - ((ay + by) / 2) * s;
  const P = ([x, y]) => [r1(x * s + ox), r1(y * s + oy)];
  const camino = (ps) =>
    `M${ps
      .map(P)
      .map(([x, y]) => `${x} ${y}`)
      .join(" L")}Z`;
  const partes = a.partes.map((p) => {
    const base = { pieza: p.pieza, cerca: Math.round(p.cerca * 100) / 100 };
    if (p.tipo === "rueda")
      return {
        ...base,
        tipo: "rueda",
        c: P(p.centro),
        r: r1(p.r * s),
        ry: r1(p.r * s * CE),
      };
    if (p.tipo === "pata")
      return {
        ...base,
        tipo: "pata",
        de: P(p.de),
        a: P(p.a),
        grueso: r1(Math.max(2.5, p.grueso * s)),
      };
    if (p.tipo === "helice")
      return {
        ...base,
        tipo: "helice",
        d: camino(p.contorno),
        c: P(p.centro),
        r: r1(p.R * s),
      };
    const extra = {};
    if (p.lomo)
      extra.lomo = `M${p.lomo
        .map(P)
        .map(([x, y]) => `${x} ${y}`)
        .join(" L")}`;
    if (p.arriba) {
      extra.arriba = p.arriba.map(P);
      extra.abajo = p.abajo.map(P);
    }
    if (p.boca) extra.boca = true;
    return { ...base, tipo: p.tipo, d: camino(p.contorno), ...extra };
  });
  return {
    id: a.id,
    vista: a.vista,
    escala: r1(s),
    partes,
    luces: {
      roja: P(a.luces.roja),
      verde: P(a.luces.verde),
      blanca: P(a.luces.blanca),
    },
    morro: P(a.morro),
  };
}

const aviones = TIPOS.map((t) => aLaHoja(tipo(t)));

const cabecera = `/**
 * **Los aviones de «Armá tu avión»**, medidos en los modelos de la flota.
 *
 * **Generado** por \`scripts/aviones-del-kit.mjs\` desde
 * \`public/assets/aeronaves/jaz-*.glb\`. No se edita a mano: se regenera.
 *
 * Cada parte es su contorno en la hoja del kit (640 × 340), vista de tres
 * cuartos desde arriba por la derecha, con el morro a la derecha. \`pieza\` es
 * la pieza del juego a la que pertenece, o \`null\` si es del tablero; \`cerca\`,
 * lo cerca que queda de quien mira: se dibuja de lejos a cerca.
 */

export type PiezaDelModelo =
  | "ala"
  | "alaDerecha"
  | "alaIzquierda"
  | "alaArriba"
  | "alaAbajo"
  | "motor"
  | "motorDerecho"
  | "motorIzquierdo"
  | "motorDerechoDentro"
  | "motorDerechoFuera"
  | "motorIzquierdoDentro"
  | "motorIzquierdoFuera"
  | "estabilizador"
  | "deriva"
  | "trenPrincipal"
  | "trenMorro"
  | "trenCola";

export type ParteDelModelo =
  | { readonly pieza: PiezaDelModelo | null; readonly cerca: number; readonly tipo: "cuerpo" | "superficie"; readonly d: string; readonly lomo?: string; readonly arriba?: readonly (readonly [number, number])[]; readonly abajo?: readonly (readonly [number, number])[]; readonly boca?: boolean }
  | { readonly pieza: PiezaDelModelo | null; readonly cerca: number; readonly tipo: "helice"; readonly d: string; readonly c: readonly [number, number]; readonly r: number }
  | { readonly pieza: PiezaDelModelo | null; readonly cerca: number; readonly tipo: "rueda"; readonly c: readonly [number, number]; readonly r: number; readonly ry: number }
  | { readonly pieza: PiezaDelModelo | null; readonly cerca: number; readonly tipo: "pata"; readonly de: readonly [number, number]; readonly a: readonly [number, number]; readonly grueso: number };

export interface AvionDelModelo {
  readonly id: string;
  /** Su vista: lo que baja en la hoja un metro hacia quien mira, lo que se aplasta la altura y lo que corre a lo largo. */
  readonly vista: { readonly se: number; readonly ce: number; readonly kx: number };
  /** Puntos de la hoja por metro. */
  readonly escala: number;
  readonly partes: readonly ParteDelModelo[];
  /** Dónde va cada luz de navegación: las puntas de las alas y lo más atrás de la cola. */
  readonly luces: { readonly roja: readonly [number, number]; readonly verde: readonly [number, number]; readonly blanca: readonly [number, number] };
  /** La punta del morro, para las ventanillas y la cabina. */
  readonly morro: readonly [number, number];
}
`;

writeFileSync(
  SALIDA,
  `${cabecera}
export const AVIONES_DEL_MODELO: Readonly<Record<string, AvionDelModelo>> = ${JSON.stringify(Object.fromEntries(aviones.map((a) => [a.id, a])))};\n`,
);
console.log(
  `→ ${SALIDA}: ${aviones.map((a) => `${a.id} (${a.partes.length} partes, ${a.escala} pt/m)`).join(", ")}`,
);
