#!/usr/bin/env node
/**
 * **Las líneas de entrada pintadas de los puestos**, añadidas a la ficha de cada
 * aeródromo sin volver a extraerlo entero (H60).
 *
 *     node scripts/lineas-de-entrada.mjs GCXO GCTS
 *     node scripts/lineas-de-entrada.mjs GCXO --crudo carpeta   # guarda lo que trae Overpass
 *
 * Una consulta solo de puestos y calles del campo, como la que rehízo los puestos
 * el 15-11-2026 (#191): `puestosDeOsm` los vuelve a sacar de lo de hoy y
 * `entradasDeOsm` les pone su línea. Cada puesto de la ficha se casa con el suyo
 * por el `ref` y el punto —a menos de medio metro—, y solo se le añade `entrada`.
 * El que está en mitad de su línea con otra calle cruzándola por detrás de él se
 * lleva a su parada (H60d, abajo); los demás no se mueven, ni se quitan, ni se añaden.
 * Lo que no casa se cuenta.
 *
 * La extracción entera (`osm-a-aerodromo.mjs`) ya guarda las líneas por su cuenta;
 * esto es para no rehacer la geometría de nueve campos por una sola cosa.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { overpass } from "./osm-comun.mjs";
import { entradasDeOsm, puestosDeOsm } from "./puestos-de-osm.mjs";

const SALIDA = "data/aerodromes";
/** El de `osm-a-aerodromo.mjs`, para que los puntos salgan idénticos a los de la ficha. */
const R = 6371008;
const redondear = (n) => Math.round(n * 10) / 10;
function proyector(lat0, lon0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return (lat, lon) => [
    redondear((R * (lon - lon0) * Math.PI * k) / 180),
    redondear((R * (lat - lat0) * Math.PI) / 180),
  ];
}

/** Lo que puede quedar un puesto al lado de su línea para estar en ella, m. */
const EN_LA_LINEA = 1;

/**
 * **La línea de entrada hasta un punto que está sobre ella**, de fuera hacia él y
 * acabando en él; `null` si queda a más de `EN_LA_LINEA` o le dejan menos de tres
 * metros de raya.
 */
function hasta(linea, [px, py]) {
  let mejor = { d: Infinity, i: 0 };
  for (let i = 1; i < linea.length; i++) {
    const [ax, ay] = linea[i - 1];
    const [bx, by] = linea[i];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
    if (d < mejor.d) mejor = { d, i };
  }
  if (mejor.d > EN_LA_LINEA) return null;
  const out = [...linea.slice(0, mejor.i), [px, py]];
  let l = 0;
  for (let i = 1; i < out.length; i++) l += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
  return l >= 3 ? out : null;
}

/** Dónde corta el segmento `a`–`b` al `c`–`d`, en tanto por uno de `a`–`b`; `null` si no lo corta. */
function corte(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/**
 * **Si alguna calle cruza la línea entre su principio y su final**: pasado el primer metro,
 * que es donde la línea sale de su calle.
 */
function laCruzaUnaCalle(linea, calles) {
  let andado = 0;
  for (let i = 1; i < linea.length; i++) {
    const l = Math.hypot(linea[i][0] - linea[i - 1][0], linea[i][1] - linea[i - 1][1]);
    for (const c of calles)
      for (let k = 1; k < c.length; k++) {
        const t = corte(linea[i - 1], linea[i], c[k - 1], c[k]);
        if (t !== null && andado + t * l >= 1) return true;
      }
    andado += l;
  }
  return false;
}

/**
 * **La ficha con sus puestos nuevos, y lo demás tal cual estaba escrito.** Hay fichas
 * con campos retocados a mano en una línea (`pasarelas`, `salidasPorInterseccion`);
 * reescribirlas enteras los desplegaba y ensuciaba el cambio. Se sustituye solo la
 * lista de `parkingPositions`, con la sangría del extractor.
 */
function conLosPuestos(texto, puestos) {
  const clave = '"parkingPositions": ';
  const desde = texto.indexOf(clave);
  if (desde < 0) throw new Error("la ficha no tiene parkingPositions");
  const abre = desde + clave.length;
  let nivel = 0;
  let cierra = -1;
  for (let i = abre, enCadena = false; i < texto.length; i++) {
    const c = texto[i];
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
  return texto.slice(0, abre) + lista + texto.slice(cierra);
}

const consulta = (icao) => `[out:json][timeout:180];
nwr["aeroway"="aerodrome"]["icao"="${icao}"];
map_to_area->.a;
nwr(area.a)["aeroway"~"^(parking_position|taxiway|taxilane)$"];
out tags geom;`;

const args = process.argv.slice(2);
/** El valor de una opción `--nombre valor`, y las posiciones que ocupa. */
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? { valor: args[i + 1], en: [i, i + 1] } : { valor: null, en: [] };
};
// `--crudo`: guarda lo que trae Overpass; `--de`: lo lee de ahí en vez de preguntar otra vez.
const crudo = opcion("--crudo");
const de = opcion("--de");
const icaos = args.filter((a, i) => !a.startsWith("--") && ![...crudo.en, ...de.en].includes(i));
if (!icaos.length) {
  console.error("Uso: node scripts/lineas-de-entrada.mjs GCXO [GCTS…] [--crudo carpeta | --de carpeta]");
  process.exit(1);
}

for (const icao of icaos.map((s) => s.toUpperCase())) {
  const destino = join(SALIDA, `${icao.toLowerCase()}.aero.json`);
  const texto = await readFile(destino, "utf8");
  const ficha = JSON.parse(texto);
  const puestos = ficha.parkingPositions ?? [];
  process.stdout.write(`→ ${icao}: ${puestos.length} puestos en la ficha\n`);
  if (!puestos.length) continue;
  const datos = de.valor
    ? JSON.parse(await readFile(join(de.valor, `${icao.toLowerCase()}.json`), "utf8"))
    : await overpass(consulta(icao));
  const elementos = datos.elements ?? [];
  if (crudo.valor) {
    await mkdir(crudo.valor, { recursive: true });
    await writeFile(join(crudo.valor, `${icao.toLowerCase()}.json`), JSON.stringify(datos));
  }
  // Un espejo saturado contesta vacío con un 200: sin puestos, no se toca nada.
  if (!elementos.some((e) => e.tags?.aeroway === "parking_position")) {
    process.stdout.write(`  ⚠ la respuesta no trae ningún puesto — no se escribe ${destino}\n`);
    continue;
  }
  const proj = proyector(ficha.origin.lat, ficha.origin.lon);
  const deHoy = entradasDeOsm(elementos, proj, puestosDeOsm(elementos, proj));
  let conLinea = 0;
  let enSuLinea = 0;
  let sinCasar = 0;
  let copias = 0;
  let aSuParada = 0;
  const llevados = [];
  const calles = elementos
    .filter(
      (e) =>
        e.type === "way" &&
        (e.tags?.aeroway === "taxiway" || e.tags?.aeroway === "taxilane") &&
        (e.geometry?.length ?? 0) > 1,
    )
    .map((w) => w.geometry.map((q) => proj(q.lat, q.lon)));
  const enSuSitio = (p, q) => q.ref === p.ref && Math.hypot(q.xy[0] - p.xy[0], q.xy[1] - p.xy[1]) <= 0.5;
  const nuevos = puestos.flatMap((p) => {
    const suyo = deHoy.find((q) => enSuSitio(p, q));
    const { entrada: _vieja, ...sinLinea } = p;
    if (!suyo) {
      /*
       * **El puesto de antes de #191, en mitad de su línea.** Las fichas que no se
       * rehicieron con `puestosDeOsm` —La Palma, Lanzarote, Gran Canaria, Pettirossi y
       * Barajas— traen el centro de cada línea de entrada como un puesto más: la media de
       * sus vértices, que no es ningún puesto, sino un sitio entre la calle y la parada.
       * Se le da la línea hasta él, que es la raya sobre la que está.
       *
       * **Y si otra calle cruza esa línea antes de llegar a él, va a su parada** (H60d).
       * Es un puesto que no existe: el avión queda con la calle por debajo, entre la rueda
       * de morro y el tren principal, y ningún tractor lo saca de ahí. En Barajas, la WI-6
       * pasa a 7 m por detrás del 312, la JI-6 a 6 m del 382 y la EB-2 a 4 m del 562. La
       * propia línea dice dónde para la rueda de morro —la wiki de OpenStreetMap: «the last
       * node of the way should be where the nose wheel is parked»—, y `puestosDeOsm` la lee
       * con la regla de #191: allí va el puesto, con su línea entera. Si allí ya hay uno con
       * su `ref`, el del centro era una copia, y se quita. Los demás del centro de su línea
       * se quedan donde están hasta que la ficha se rehaga entera con `puestosDeOsm`, que
       * mueve el puesto del que se sale en esos campos.
       */
      const linea = deHoy.find((q) => q.ref === p.ref && q.entrada && hasta(q.entrada, p.xy));
      if (!linea) {
        sinCasar++;
        return [sinLinea];
      }
      enSuLinea++;
      const suya = hasta(linea.entrada, p.xy);
      if (!laCruzaUnaCalle(suya, calles)) return [{ ...sinLinea, entrada: suya }];
      aSuParada++;
      if ([...puestos.filter((o) => o !== p), ...llevados].some((o) => enSuSitio(o, linea))) {
        copias++;
        return [];
      }
      llevados.push(linea);
      return [{ ...sinLinea, xy: [...linea.xy], entrada: linea.entrada }];
    }
    if (!suyo.entrada) return [sinLinea];
    conLinea++;
    return [{ ...sinLinea, entrada: suyo.entrada }];
  });
  const sobran = deHoy.filter(
    (q) => !puestos.some((p) => p.ref === q.ref && Math.hypot(q.xy[0] - p.xy[0], q.xy[1] - p.xy[1]) <= 0.5),
  ).length;
  if (JSON.stringify(nuevos) !== JSON.stringify(puestos)) await writeFile(destino, conLosPuestos(texto, nuevos));
  process.stdout.write(
    `  ${conLinea} con línea de entrada · ${enSuLinea} en mitad de la suya` +
      ` (${aSuParada} con una calle cruzándola por detrás, llevados a su parada;` +
      ` ${copias} de ellos, copias de uno que ya estaba allí, quitados) · ` +
      `${sinCasar} de la ficha sin su par en lo de hoy · ` +
      `${sobran} de hoy que no están en la ficha → ${destino}\n`,
  );
}
