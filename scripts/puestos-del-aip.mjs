#!/usr/bin/env node
/**
 * **Lo que el AIP publica de cada puesto de estacionamiento**, sacado de sus cartas
 * PDC y casado con los puestos de la ficha (ADR 0025, enmienda H60f).
 *
 *     node scripts/puestos-del-aip.mjs extraer GCXO carta.txt [otra.txt …]
 *     node scripts/puestos-del-aip.mjs juntar GCXO [GCLP …]
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

/** Un designador de tipo, o varios separados por barra: «A333/AS32», el mayor avión y el mayor helicóptero. */
const ES_TIPO = /^[A-Z][A-Z0-9]{1,3}(\/[A-Z][A-Z0-9]{1,3})*$/;
/** La marca de cambio de la enmienda, que sale en medio del texto: «A21N/_<-_B3XM» es «A21N/B3XM». */
const MARCA_DE_CAMBIO = /_<-_/g;
/** La llamada a una observación pegada al tipo: «B738 (2)». */
const LLAMADA = /\s*\(\d+\)$/;
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
      const resto = m[6].replace(MARCA_DE_CAMBIO, "").trim().split(/\s{2,}/).filter(Boolean);
      let max = null;
      let aproar = null;
      let llamada = "";
      if (resto.length && (NADA.test(resto[0]) || ES_TIPO.test(resto[0].replace(LLAMADA, ""))) && !ES_APROAR.test(resto[0])) {
        const t = resto.shift();
        llamada = LLAMADA.exec(t)?.[0].trim() ?? "";
        max = NADA.test(t) ? null : t.replace(LLAMADA, "");
      }
      if (resto.length && (NADA.test(resto[0]) || ES_APROAR.test(resto[0]))) {
        const t = resto.shift();
        aproar = NADA.test(t) ? null : t;
      }
      const obs = [llamada, resto.join(" ").replace(/^[–—-]$/, "").trim()].filter(Boolean).join(" ");
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

/** Lo que mide la línea de entrada, m. */
function largo(linea) {
  let l = 0;
  for (let i = 1; i < linea.length; i++) l += Math.hypot(linea[i][0] - linea[i - 1][0], linea[i][1] - linea[i - 1][1]);
  return l;
}

/**
 * **Si el punto está en la otra mitad de la línea**: pasada la punta, por su prolongación y
 * a no más de lo que mide lo que hay, con `LEJOS` de margen. Un puesto de antes de #191 está
 * en el centro de su línea, así que la mitad que falta mide lo mismo que la que hay (H60):
 * la parada de ese puesto está ahí. Devuelve lo que se queda del final, m, o `null`.
 */
function enLaOtraMitad(linea, p) {
  if (!lineaHasta(linea, p)) return null;
  const [ax, ay] = linea.at(-2);
  const [bx, by] = linea.at(-1);
  const pasada = ((p[0] - bx) * (bx - ax) + (p[1] - by) * (by - ay)) / (Math.hypot(bx - ax, by - ay) || 1);
  const l = largo(linea);
  return pasada > 0 && pasada <= l + LEJOS ? Math.abs(l - pasada) : null;
}

/** Lo que puede quedar un punto sin nombre del puesto del que es un tramo, m: dos aviones no caben tan cerca. */
const REPETIDO = 20;

/** Si el punto cae dentro de una plataforma de la ficha. */
function enLaPlataforma(ficha, [x, y]) {
  return (ficha.aprons ?? []).some((a) => {
    let dentro = false;
    const g = a.polygon;
    for (let i = 0, j = g.length - 1; i < g.length; j = i++)
      if (g[i][1] > y !== g[j][1] > y && x < ((g[j][0] - g[i][0]) * (y - g[i][1])) / (g[j][1] - g[i][1]) + g[i][0]) dentro = !dentro;
    return dentro;
  });
}

/**
 * **Cada puesto de la ficha, casado con el de la carta** (H75). Por su `ref`; y lo que no
 * casa así, por el sitio, que es lo único que dice una ficha de antes de #191 de una línea
 * sin nombre:
 *
 * - El que tiene otro `ref` que el de la carta y está donde la carta pone uno que la ficha
 *   no tiene, o en el centro de una línea cuya otra mitad llega a él, es ese: en Lanzarote el
 *   segundo «23» está en el 22, y en La Palma la línea del «2» acaba en el H2.
 * - El que no tiene `ref`, o su `ref` no está en la carta, y está en el centro de una línea
 *   cuya otra mitad llega al punto publicado de un puesto que la ficha trae como nodo y sin
 *   línea, es la línea de ese puesto, repetido: se le da y la copia se quita. Si a donde llega
 *   es al nodo, con el publicado en otra parte, también: el 7 de Lanzarote, publicado cinco
 *   segundos de longitud al oeste de la fila, detrás de la terminal.
 */
function casar(puestos, aip, proyectar) {
  const porRef = new Map();
  for (const p of aip.puestos) {
    const k = refNormalizado(p.ref);
    if (!porRef.has(k)) porRef.set(k, { ...p, xy: proyectar(p.lat, p.lon) });
  }
  const todos = [...porRef.values()];
  const lista = puestos.map((p) => ({ p, a: porRef.get(refNormalizado(p.ref)) ?? null, linea: null, copia: false }));
  const lejosDe = (x) => Math.hypot(x.p.xy[0] - x.a.xy[0], x.p.xy[1] - x.a.xy[1]);
  const enLaFicha = (a, menos) => lista.filter((x) => x !== menos && x.a === a);
  const cambiados = [];
  // El que se llama de otra manera y está donde la carta pone uno que la ficha no tiene.
  for (const x of lista) {
    if (!x.p.ref) continue;
    if (x.a && (lejosDe(x) <= LEJOS || !x.p.entrada || lineaHasta(x.p.entrada, x.a.xy) !== null)) continue;
    if (x.a && !enLaFicha(x.a, x).length) continue;
    const otro = todos
      .filter((a) => a !== x.a && !enLaFicha(a, x).length)
      .find(
        (a) =>
          Math.hypot(x.p.xy[0] - a.xy[0], x.p.xy[1] - a.xy[1]) <= LEJOS ||
          (x.p.entrada && enLaOtraMitad(x.p.entrada, a.xy) !== null),
      );
    if (!otro) continue;
    cambiados.push(`${x.p.ref} → ${otro.ref}`);
    x.a = otro;
    x.p = { ...x.p, ref: otro.ref };
  }
  // La línea sin nombre que llega a un puesto que la ficha trae como nodo y sin línea.
  const repetidos = [];
  for (const x of lista) {
    if (x.a || x.p.ref || !x.p.entrada) continue;
    const sinLinea = lista.filter((n) => n.a && !n.p.entrada && !n.linea && !n.copia);
    const candidatos = [];
    for (const n of sinLinea) {
      const enLaPunta = Math.hypot(x.p.xy[0] - n.a.xy[0], x.p.xy[1] - n.a.xy[1]) <= EN_LA_LINEA;
      const alPublicado = enLaPunta ? 0 : enLaOtraMitad(x.p.entrada, n.a.xy);
      if (alPublicado !== null) candidatos.push({ n, queda: alPublicado });
      else if (lejosDe(n) > LEJOS) {
        const alNodo = enLaOtraMitad(x.p.entrada, n.p.xy);
        if (alNodo !== null) candidatos.push({ n, queda: alNodo });
      }
    }
    candidatos.sort((a, b) => a.queda - b.queda);
    const n = candidatos[0]?.n;
    if (!n) continue;
    n.linea = x.p.entrada;
    x.copia = true;
    repetidos.push(n.p.ref);
  }
  return { lista, cambiados, repetidos };
}

/**
 * **La línea de entrada de un puesto al que se le lleva a su punto publicado**: la suya,
 * cortada o alargada hasta él (`lineaHasta`), y si ya acaba a menos de `EN_LA_LINEA`, con la
 * punta en él. `undefined` si no tiene línea, y `null` si el punto no cae en ella.
 */
function lineaAlPublicado(entrada, p) {
  if (!entrada || entrada.length < 2) return undefined;
  const [bx, by] = entrada.at(-1);
  if (Math.hypot(bx - p[0], by - p[1]) <= EN_LA_LINEA) return [...entrada.slice(0, -1), p];
  return lineaHasta(entrada, p);
}

/** Lo que pueden no ser paralelas dos líneas de puestos vecinos, en grados. */
const PARALELAS = 5;

/**
 * **La línea de un puesto ancho entre dos estrechos** (H75): el que la carta da por incompatible
 * con los dos de al lado es el mismo hueco con otra línea en medio, y la carta la dibuja paralela
 * a las de ellos —el T7 de Lanzarote, entre el T3 y el T4 (AD 2-GCRR PDC 1-1)—. OpenStreetMap no
 * la trae. Solo si los incompatibles con línea quedan a los dos lados y sus líneas son paralelas:
 * es la del más cercano, llevada de lado hasta el punto publicado. `null` si no.
 */
function lineaEntreIncompatibles(xy, obs, conLinea) {
  const refs = /INCOMP\.?\s*(.*)$/.exec(obs ?? "")?.[1]?.split(/[,\s]+/) ?? [];
  const vecinos = refs
    .map((r) => conLinea.get(refNormalizado(r)))
    .filter(Boolean)
    .map((p) => {
      const [ax, ay] = p.entrada.at(-2);
      const [bx, by] = p.entrada.at(-1);
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const u = [(bx - ax) / l, (by - ay) / l];
      const lado = (xy[0] - bx) * -u[1] + (xy[1] - by) * u[0];
      return { p, u, lado };
    });
  if (vecinos.length < 2) return null;
  const [a] = vecinos;
  const paralelas = vecinos.every((v) => a.u[0] * v.u[0] + a.u[1] * v.u[1] >= Math.cos((PARALELAS * Math.PI) / 180));
  if (!paralelas || !vecinos.some((v) => v.lado > 0) || !vecinos.some((v) => v.lado < 0)) return null;
  const n = vecinos.reduce((m, v) => (Math.abs(v.lado) < Math.abs(m.lado) ? v : m));
  const w = [-n.u[1] * n.lado, n.u[0] * n.lado];
  const antes = n.p.entrada
    .map(([x, y]) => [redondear(x + w[0]), redondear(y + w[1])])
    .filter(([x, y]) => (xy[0] - x) * n.u[0] + (xy[1] - y) * n.u[1] >= 3);
  return antes.length ? [...antes, xy] : null;
}

async function juntar(id) {
  const ruta = join(SALIDA, `${id.toLowerCase()}.aero.json`);
  const texto = await readFile(ruta, "utf8");
  const ficha = JSON.parse(texto);
  const aip = JSON.parse(await readFile(join(AIP, `${id.toLowerCase()}.pdc.json`), "utf8"));
  const proyectar = proyector(ficha.origin.lat, ficha.origin.lon);
  const cuenta = { puestos: ficha.parkingPositions.length, casan: 0, movidos: 0, sinLinea: 0, copias: 0, sinAip: [] };
  const movidos = [];
  const sueltos = [];
  const puestos = [];
  const { lista, cambiados, repetidos } = casar(ficha.parkingPositions, aip, proyectar);
  for (const { p, a, linea: suLinea, copia } of lista) {
    if (copia) {
      cuenta.copias++;
      continue;
    }
    /*
     * El que no tiene nombre ni línea, no está en la carta y la ficha lo trae a un paso de uno que
     * sí está, no es otro puesto: es el centro de un tramo de la raya de ese, que la ficha de antes
     * de #191 apuntaba aparte. En La Palma, el de la entrada del 14 quedaba a seis metros del eje
     * de la R, y con el 14 en su punto las avionetas salían de ahí; en Lanzarote, diez sobre las
     * líneas de los de salida autónoma.
     */
    if (
      !a &&
      !p.ref &&
      !p.entrada &&
      ficha.parkingPositions.some((q) => q.ref && q.aip?.carta && Math.hypot(q.xy[0] - p.xy[0], q.xy[1] - p.xy[1]) <= REPETIDO)
    ) {
      sueltos.push(`${p.xy}`);
      continue;
    }
    const { aip: _viejo, entradaDeducida, ...limpio } = p;
    // La que se dedujo en otra tirada se vuelve a deducir, abajo.
    if (entradaDeducida) delete limpio.entrada;
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
    const publicado = a.xy;
    const lejos = Math.hypot(p.xy[0] - publicado[0], p.xy[1] - publicado[1]);
    const nuevo = { ...limpio, aip: { salida: a.salida, max: a.max, contacto: a.contacto, carta: a.carta } };
    /*
     * Al punto publicado, por su raya: cortada o alargada hasta él. Si el puesto tiene raya y
     * el punto publicado no cae en ella ni en su prolongación, la ficha y el AIP no dicen el
     * mismo puesto —una raya de OpenStreetMap que es de otro, o un `ref` cambiado—, y no se
     * mueve: se cuenta, y lleva lo lejos que queda (`lejos`). El que no tiene raya, al punto
     * publicado si cae en la plataforma de la ficha; si no, tampoco. Y el que acaba de recibir
     * la suya, a donde ella acaba, aunque esté cerca: la raya acaba en el puesto.
     */
    const entrada = suLinea ?? limpio.entrada;
    const mover = lejos > LEJOS || suLinea !== null;
    const linea = mover ? lineaAlPublicado(entrada, publicado) : undefined;
    if (mover && (linea === null || (!entrada && !enLaPlataforma(ficha, publicado)))) {
      cuenta.sinLinea++;
      movidos.push(`${p.ref} ${lejos.toFixed(0)} m (fuera de su raya, sin mover)`);
      nuevo.aip.lejos = Math.round(lejos);
      if (suLinea) nuevo.entrada = lineaHasta(suLinea, p.xy) ?? suLinea;
    } else if (mover) {
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
      continue;
    }
    if (p.ref && p.aip) vistos.set(k, p);
    finales.push(p);
  }
  // Y el ancho entre dos incompatibles, sin línea en OpenStreetMap, con una paralela a las suyas.
  const conLinea = new Map(finales.filter((p) => p.ref && p.entrada && p.aip && !p.aip.lejos).map((p) => [refNormalizado(p.ref), p]));
  const deducidas = [];
  for (const { p: deAntes, a } of lista) {
    const p = a && finales.find((q) => q.ref === deAntes.ref && !q.entrada && q.aip?.carta === a.carta && q.aip.lejos === undefined);
    if (!p || a.salida === "A") continue;
    const linea = lineaEntreIncompatibles(p.xy, a.obs, conLinea);
    if (!linea) continue;
    p.entrada = linea;
    p.entradaDeducida = true;
    deducidas.push(p.ref);
  }
  const meta = { fuente: aip.fuente, url: aip.url, leido: aip.leido, cartas: aip.cartas };
  // Lo del AIP, al final de cada puesto: la ficha sale igual se junte las veces que se junte.
  const ordenados = finales.map(({ aip: suyo, ...p }) => (suyo ? { ...p, aip: suyo } : p));
  await writeFile(ruta, conLosPuestos(texto, ordenados, meta));
  console.log(
    `${id}: ${cuenta.casan} de ${cuenta.puestos} casan con el AIP; ${cuenta.movidos} a su punto publicado` +
      ` (${cuenta.sinLinea} lejos y fuera de su raya, sin mover), ${cuenta.copias} copias quitadas; sin AIP: ${cuenta.sinAip.join(" ") || "ninguno"}${CONTACTO[id] && cuenta.sinAip.length ? " (no son de contacto)" : ""}`,
  );
  if (cambiados.length) console.log(`  con otro nombre en la carta: ${cambiados.join(", ")}`);
  if (repetidos.length) console.log(`  con la línea de su copia sin nombre: ${repetidos.join(", ")}`);
  if (sueltos.length) console.log(`  sin nombre y sin línea, junto a uno de la carta, quitados: ${sueltos.join(" · ")}`);
  if (deducidas.length) console.log(`  con la línea deducida de sus incompatibles: ${deducidas.join(", ")}`);
  if (movidos.length) console.log(`  movidos: ${movidos.join(", ")}`);
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
  for (const i of [id, ...resto]) await juntar(i.toUpperCase());
}
else {
  console.error("uso: puestos-del-aip.mjs extraer ICAO carta.txt […] | juntar ICAO […]");
  process.exit(1);
}
