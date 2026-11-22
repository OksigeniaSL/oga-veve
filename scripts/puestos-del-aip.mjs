#!/usr/bin/env node
/**
 * **Lo que el AIP publica de cada puesto de estacionamiento**, sacado de sus cartas
 * PDC y casado con los puestos de la ficha (ADR 0025, enmienda H60f).
 *
 *     node scripts/puestos-del-aip.mjs extraer GCXO carta.txt [otra.txt …]
 *     node scripts/puestos-del-aip.mjs juntar GCXO [GCLP …]
 *     node scripts/puestos-del-aip.mjs juntar GCLA GCRR --sin-mover   # solo `aip`, sin llevar puestos a su punto
 *
 * `extraer` lee el texto de las cartas PDC de la parte AD 2 del AIP de ENAIRE
 * (aip.enaire.es), pasado por `pdftotext -layout`, y guarda la tabla
 * «Características de los puestos de estacionamiento» en
 * `data/aerodromes/aip/<id>.pdc.json`, cada puesto con la hoja y la fecha (WEF) de
 * la que sale. `juntar` pone a cada puesto de la ficha lo suyo —`aip`: salida,
 * mayor avión, si es de contacto— y lleva a su punto publicado el que está lejos de
 * él (`LEJOS`): la regla de la H60e —el puesto va a su parada— con el AIP como
 * fuente de la parada.
 *
 * El AIP es una publicación oficial: de él se toman los hechos de cada puesto, no
 * se reproduce la carta.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SALIDA = "data/aerodromes";
const AIP = join(SALIDA, "aip");
/** El de `osm-a-aerodromo.mjs`, para que los puntos salgan en los mismos ejes que la ficha. */
const R = 6371008;
const redondear = (n) => Math.round(n * 10) / 10;
function proyector(lat0, lon0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return (lat, lon) => [
    redondear((R * (lon - lon0) * Math.PI * k) / 180),
    redondear((R * (lat - lat0) * Math.PI) / 180),
  ];
}

/**
 * **Lo que puede quedar el puesto de la ficha de su punto publicado**, m. Más allá
 * se lleva al publicado. Las coordenadas del AIP van a la centésima de segundo, unos
 * treinta centímetros; un nodo de OpenStreetMap puesto sobre la ortofoto, a uno o dos
 * metros de la parada. Los de las fichas de antes de #191, en el centro de su línea de
 * entrada, quedan a treinta, cincuenta o noventa metros (H60d): esos son los que se
 * mueven.
 */
const LEJOS = 10;

/** Lo que puede quedar el punto publicado al lado de la línea de entrada para estar en ella, m. */
const EN_LA_LINEA = 3;

/**
 * **Los puestos de contacto, por carta**: lo que dice cada AIP de cuáles tienen
 * pasarela, que no es la misma columna en todos. Los Rodeos y Gran Canaria lo ponen
 * como observación del puesto; Barajas, como una lista de puestos en la observación
 * (1) de cada carta. Los demás no lo dicen, y el puesto se queda sin saberlo (`null`):
 * manda la regla de siempre, la de la pared a lo que alcanza una pasarela.
 */
const CONTACTO = {
  // AD 2-GCXO PDC 1.3: «(2) Pasarela. // Boarding bridge.»
  GCXO: { observacion: "(2)" },
  // AD 2-GCLP PDC 1: «(4) Pasarela // Bridge.»
  GCLP: { observacion: "(4)" },
  // AD 2-LEMD PDC 1, observación (1): «posiciones de contacto con el edificio terminal
  // (T-1 a T-35 y 70 a 74)»; PDC 2, observación (1): «(PRKG 300 a 312, 330 a 394 y 500 a 586)».
  LEMD: {
    rangos: [
      ["T1", "T35"],
      ["70", "74"],
      ["300", "312"],
      ["330", "394"],
      ["500", "586"],
    ],
  },
};

/** `282913.9N` → grados. */
function grados(s) {
  const m = /^(\d{2,3})(\d{2})(\d{2}(?:\.\d+)?)([NSEW])$/.exec(s);
  if (!m) throw new Error(`coordenada que no se lee: ${s}`);
  const g = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
  return m[4] === "S" || m[4] === "W" ? -g : g;
}

/** Para casar el `ref` de la ficha con el del AIP: `T-01` y `T1`, `03` y `3`. */
export function refNormalizado(ref) {
  return String(ref ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/(^|[A-Z])0+(\d)/g, "$1$2");
}

/** El número y la letra de un `ref`, para los rangos de Barajas: `T16` → [T, 16, ""]. */
function partes(ref) {
  const m = /^([A-Z]*)(\d+)([A-Z]*)$/.exec(refNormalizado(ref));
  return m ? { letra: m[1], n: Number(m[2]), sufijo: m[3] } : null;
}

function enRango(ref, [desde, hasta]) {
  const p = partes(ref);
  const a = partes(desde);
  const b = partes(hasta);
  if (!p || !a || !b || p.letra !== a.letra) return false;
  return p.n >= a.n && p.n <= b.n;
}

/** La salida publicada, en lo que entiende el juego: «R» empujado, «A» por sus medios, «AR» las dos. */
function salidaDe(s) {
  const t = s.replace(/\(\d+\)/g, "").trim().toUpperCase();
  if (/^PUSH-BACK R$/.test(t) || t === "R") return "R";
  if (t === "A") return "A";
  if (/^(A[-/]R|R[-/]A)$/.test(t)) return "AR";
  return null;
}

const ES_TIPO = /^[A-Z][A-Z0-9]{1,3}$/;
const ES_APROAR = /^([NSEW]{1,2}(\/[NSEW]{1,2})?)$/;
const NADA = /^[–—-]$/;

/**
 * **La tabla de una carta**: cada fila con coordenadas es un puesto. Las columnas no
 * van alineadas igual en todos los campos, así que se lee por campos separados por
 * dos espacios o más, después de la salida: el mayor avión, si parece un designador
 * de tipo; hacia dónde queda el morro, si son puntos cardinales; y lo demás, las
 * observaciones.
 */
function filasDe(texto) {
  const hojas = texto.split("\f");
  const filas = [];
  const FILA =
    /^\s*([A-Z0-9][A-Z0-9-]*)\s+(\S+)\s+(\d{6}(?:\.\d+)?[NS])\s+(\d{7}(?:\.\d+)?[EW])\s+(Push-Back R(?: \(\d+\))?|A\/R|A-R|R\/A|R-A|A|R)(?=\s|$)(.*)$/;
  for (const hoja of hojas) {
    const cabeza = hoja.split("\n").slice(0, 8).join("\n");
    const carta = /AD 2-[A-Z]{4} PDC [0-9.]+/.exec(cabeza)?.[0] ?? null;
    // La fecha va detrás de «WEF», salvo en alguna hoja en la que el texto sale sin él (GCTS PDC 1.4).
    const wef = /(?:WEF )?(\d{2}-[A-Z]{3}-\d{2})/.exec(cabeza)?.[1] ?? null;
    for (const linea of hoja.split("\n")) {
      const m = FILA.exec(linea);
      if (!m) continue;
      const salida = salidaDe(m[5]);
      if (!salida) continue;
      const resto = m[6].trim().split(/\s{2,}/).filter(Boolean);
      let max = null;
      let aproar = null;
      if (resto.length && (NADA.test(resto[0]) || ES_TIPO.test(resto[0])) && !ES_APROAR.test(resto[0])) {
        const t = resto.shift();
        max = NADA.test(t) ? null : t;
      }
      if (resto.length && (NADA.test(resto[0]) || ES_APROAR.test(resto[0]))) {
        const t = resto.shift();
        aproar = NADA.test(t) ? null : t;
      }
      const obs = resto.join(" ").replace(/^[–—-]$/, "").trim();
      filas.push({
        ref: m[1],
        lat: grados(m[3]),
        lon: grados(m[4]),
        salida,
        max,
        aproar,
        obs: obs || null,
        carta,
        wef,
      });
    }
  }
  return filas;
}

function contactoDe(id, fila) {
  const regla = CONTACTO[id];
  if (!regla) return null;
  if (regla.observacion) return (fila.obs ?? "").includes(regla.observacion);
  if (regla.rangos) return regla.rangos.some((r) => enRango(fila.ref, r));
  return null;
}

async function extraer(id, textos) {
  const filas = [];
  for (const t of textos) filas.push(...filasDe(await readFile(t, "utf8")));
  const cartas = [...new Map(filas.map((f) => [f.carta, { carta: f.carta, wef: f.wef }])).values()];
  const puestos = filas.map((f) => ({ ...f, contacto: contactoDe(id, f) }));
  await mkdir(AIP, { recursive: true });
  const salida = {
    id,
    fuente: `AIP España (ENAIRE), AD 2-${id}, cartas PDC: características de los puestos de estacionamiento`,
    url: `https://aip.enaire.es/AIP/contenido_AIP/AD/AD2/${id}/`,
    leido: new Date().toISOString().slice(0, 10),
    cartas,
    contacto: CONTACTO[id] ?? null,
    puestos,
  };
  await writeFile(join(AIP, `${id.toLowerCase()}.pdc.json`), JSON.stringify(salida, null, 1) + "\n");
  console.log(`${id}: ${puestos.length} puestos de ${cartas.map((c) => `${c.carta} (WEF ${c.wef})`).join(", ")}`);
}

/** El punto de la línea más cercano a `p`, con su tramo y su distancia. */
function sobreLaLinea(linea, [px, py]) {
  let mejor = { d: Infinity, i: 0, q: null };
  for (let i = 1; i < linea.length; i++) {
    const [ax, ay] = linea[i - 1];
    const [bx, by] = linea[i];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    const q = [ax + t * dx, ay + t * dy];
    const d = Math.hypot(q[0] - px, q[1] - py);
    if (d < mejor.d) mejor = { d, i, q };
  }
  return mejor;
}

/**
 * **La línea de entrada que acaba en el punto publicado**: cortada allí si el punto
 * está sobre ella, o alargada hasta él si queda pasada su punta —la línea de un puesto
 * en el centro de su raya acaba en ese centro (H60)—. `undefined` si el puesto no tiene
 * raya, y `null` si el punto no está ni en la línea ni en su prolongación.
 */
function lineaHasta(linea, p) {
  if (!linea || linea.length < 2) return undefined;
  const s = sobreLaLinea(linea, p);
  if (s.d <= EN_LA_LINEA) {
    const out = [...linea.slice(0, s.i), p];
    return out.length >= 2 && Math.hypot(out[0][0] - p[0], out[0][1] - p[1]) >= 3 ? out : undefined;
  }
  // ¿Pasada la punta, por su prolongación?
  const a = linea.at(-2);
  const b = linea.at(-1);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const t = ((p[0] - b[0]) * dx + (p[1] - b[1]) * dy) / l;
  const lado = Math.abs((p[0] - b[0]) * dy - (p[1] - b[1]) * dx) / l;
  if (t > 0 && lado <= EN_LA_LINEA) return [...linea, p];
  return null;
}

async function juntar(id, sinMover = false) {
  const ruta = join(SALIDA, `${id.toLowerCase()}.aero.json`);
  const texto = await readFile(ruta, "utf8");
  const ficha = JSON.parse(texto);
  const aip = JSON.parse(await readFile(join(AIP, `${id.toLowerCase()}.pdc.json`), "utf8"));
  const proyectar = proyector(ficha.origin.lat, ficha.origin.lon);
  const porRef = new Map();
  for (const p of aip.puestos) {
    const k = refNormalizado(p.ref);
    if (!porRef.has(k)) porRef.set(k, p);
  }
  const cuenta = { puestos: ficha.parkingPositions.length, casan: 0, movidos: 0, sinLinea: 0, copias: 0, sinAip: [], lejos: [] };
  const movidos = [];
  const fuera = new Set();
  const puestos = [];
  for (const p of ficha.parkingPositions) {
    const { aip: _viejo, ...limpio } = p;
    const a = porRef.get(refNormalizado(p.ref));
    if (!a) {
      cuenta.sinAip.push(p.ref ?? "—");
      /*
       * Si el AIP dice cuáles son de contacto, uno que no está en la carta no lo es: el lavadero
       * y los puestos de prueba de motores de Barajas, o un nodo sin `ref` de OpenStreetMap junto
       * a los de pasarela de Los Rodeos. Lo demás de él no se sabe.
       */
      puestos.push(CONTACTO[id] ? { ...limpio, aip: { salida: null, max: null, contacto: false, carta: null } } : limpio);
      continue;
    }
    cuenta.casan++;
    const publicado = proyectar(a.lat, a.lon);
    const lejos = Math.hypot(p.xy[0] - publicado[0], p.xy[1] - publicado[1]);
    const nuevo = { ...limpio, aip: { salida: a.salida, max: a.max, contacto: a.contacto, carta: a.carta } };
    if (lejos > LEJOS) cuenta.lejos.push(`${p.ref} ${lejos.toFixed(0)} m`);
    /*
     * Al punto publicado, por su raya: cortada o alargada hasta él. Si el puesto tiene raya y
     * el punto publicado no cae en ella ni en su prolongación, la ficha y el AIP no dicen el
     * mismo puesto —una raya de OpenStreetMap que es de otro, o un `ref` cambiado—, y no se
     * mueve: se cuenta.
     */
    const linea = lejos > LEJOS && !sinMover ? lineaHasta(p.entrada, publicado) : undefined;
    if (lejos > LEJOS && !sinMover && linea === null) {
      cuenta.sinLinea++;
      movidos.push(`${p.ref} ${lejos.toFixed(0)} m (fuera de su raya, sin mover)`);
    } else if (lejos > LEJOS && !sinMover) {
      nuevo.xy = publicado;
      // La raya acaba en el punto del puesto; si de ella no quedan tres metros, sin raya.
      if (linea) nuevo.entrada = linea;
      else delete nuevo.entrada;
      cuenta.movidos++;
      movidos.push(`${p.ref} ${lejos.toFixed(0)} m`);
    }
    puestos.push(nuevo);
  }
  // Dos puestos con el mismo `ref` en el mismo punto: el del centro de su línea y el de
  // su nodo, que la ficha de antes de #191 repetía. Se queda el primero.
  const vistos = new Map();
  const finales = [];
  for (const p of puestos) {
    const k = refNormalizado(p.ref);
    const otro = p.ref ? vistos.get(k) : null;
    if (otro && Math.hypot(otro.xy[0] - p.xy[0], otro.xy[1] - p.xy[1]) < 1) {
      cuenta.copias++;
      fuera.add(p.ref);
      continue;
    }
    if (p.ref && p.aip) vistos.set(k, p);
    finales.push(p);
  }
  const meta = { fuente: aip.fuente, url: aip.url, leido: aip.leido, cartas: aip.cartas };
  await writeFile(ruta, conLosPuestos(texto, finales, meta));
  console.log(
    `${id}: ${cuenta.casan} de ${cuenta.puestos} casan con el AIP; ${cuenta.movidos} a su punto publicado` +
      ` (${cuenta.sinLinea} lejos y fuera de su raya, sin mover), ${cuenta.copias} copias quitadas; sin AIP: ${cuenta.sinAip.join(" ") || "ninguno"}${CONTACTO[id] && cuenta.sinAip.length ? " (no son de contacto)" : ""}`,
  );
  if (movidos.length) console.log(`  movidos: ${movidos.join(", ")}`);
  else if (cuenta.lejos.length) console.log(`  lejos del publicado, sin mover (--sin-mover): ${cuenta.lejos.join(", ")}`);
}

/**
 * **La ficha con estos puestos**, tocando solo su lista y la clave `aipPuestos` y
 * dejando el resto del texto como estaba (la ficha no es `JSON.stringify` entera). La
 * de `lineas-de-entrada.mjs`, con la fuente delante de la lista.
 */
function conLosPuestos(texto, puestos, meta) {
  let t = texto.replace(/\n  "aipPuestos": .*,\n/, "\n");
  const clave = '"parkingPositions": ';
  const desde = t.indexOf(clave);
  if (desde < 0) throw new Error("la ficha no tiene parkingPositions");
  const abre = desde + clave.length;
  let nivel = 0;
  let cierra = -1;
  for (let i = abre, enCadena = false; i < t.length; i++) {
    const c = t[i];
    if (enCadena) {
      if (c === "\\") i++;
      else if (c === '"') enCadena = false;
    } else if (c === '"') enCadena = true;
    else if (c === "[") nivel++;
    else if (c === "]" && --nivel === 0) {
      cierra = i + 1;
      break;
    }
  }
  if (cierra < 0) throw new Error("la lista de parkingPositions no se cierra");
  const lista = JSON.stringify(puestos, null, 2).replace(/\n/g, "\n  ");
  return t.slice(0, desde) + `"aipPuestos": ${JSON.stringify(meta)},\n  ` + clave + lista + t.slice(cierra);
}

const [modo, id, ...resto] = process.argv.slice(2);
if (modo === "extraer" && id && resto.length) await extraer(id.toUpperCase(), resto);
else if (modo === "juntar" && id) {
  const sinMover = [id, ...resto].includes("--sin-mover");
  for (const i of [id, ...resto].filter((a) => !a.startsWith("--"))) await juntar(i.toUpperCase(), sinMover);
}
else {
  console.error("uso: puestos-del-aip.mjs extraer ICAO carta.txt […] | juntar ICAO […]");
  process.exit(1);
}
