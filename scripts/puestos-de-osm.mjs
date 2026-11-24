/**
 * **Los puestos de estacionamiento de OpenStreetMap: uno por puesto, y donde
 * para la rueda de morro.** Lo usa `osm-a-aerodromo.mjs`; lo prueba
 * `puestos-de-osm.test.mjs`.
 *
 * ## Por qué no el centro
 *
 * `aeroway=parking_position` se dibuja de dos maneras, y la wiki de
 * OpenStreetMap las describe así (Tag:aeroway=parking_position):
 *
 * - **Un nodo** donde para la rueda de morro: «Put a node where the nose wheel
 *   stops».
 * - **Una vía** desde la calle de rodaje hasta ese punto, la línea por la que
 *   el avión entra en el puesto: «the last node of the way should be where the
 *   nose wheel is parked».
 *
 * El extractor cogía de cada elemento su centro —la media de sus vértices—, y
 * el centro de una vía no es ningún puesto: es la mitad del camino entre la
 * calle y la parada. En Tenerife Sur sesenta y seis de los ciento diecinueve
 * puestos salían así. Cincuenta eran **el mismo puesto dos veces**, porque allí
 * se dibujó el nodo y además su línea, y la copia caía treinta o cuarenta
 * metros más afuera, a menudo en mitad de la calle de plataforma. Y los de
 * aviación general de la punta oeste caían en la hierba de entre dos
 * plataformas: ahí aparcaba el JAZ 90, con las ruedas en la tierra (#191).
 *
 * ## La regla
 *
 * 1. Un nodo es un puesto, en el nodo.
 * 2. Una vía con un nodo de su mismo `ref` en uno de sus vértices es la línea
 *    de entrada de ese nodo: el puesto ya está, no se repite. Y también la que
 *    empalma con esa línea y lleva su mismo `ref`, que es otro tramo de ella:
 *    en Tenerife Norte, la del 25 y la del 17 van en dos trozos, y el de fuera
 *    salía como otro 25 y otro 17 en su punta suelta. Y la que **no lleva
 *    `ref`** y pasa por un nodo: así está dibujado Silvio Pettirossi, con el
 *    número en el nodo y la línea sin nada, y cada puerta salía dos veces, una
 *    con su número y otra sin él (H83).
 * 3. Una vía sin nodo es un puesto en **su punta suelta**: la que no toca ni
 *    una calle ni otra vía de puesto. No se fía de que la última sea la
 *    parada, que es lo que pide la wiki, porque no siempre se dibuja así: en
 *    Tenerife Sur las hay trazadas del puesto a la calle, con la última punta
 *    encima de la calle.
 * 4. Si las dos puntas están sueltas, la que queda más lejos de las calles,
 *    que es por donde se llega.
 * 5. Si las dos tocan algo, no es un puesto: es un carril que lleva a otros.
 *    En Tenerife Sur, U1, U2 y U3 salen de la calle y se abren en los puestos
 *    de aviación general AG1 a AG5; donde se abren no para nadie.
 * 6. Una vía cerrada es un recinto, y ahí sí vale el centro.
 *
 * Sin dependencias, como el resto de los extractores.
 */

/** Lo que se da por tocar la red, m: un vértice compartido o casi. */
export const TOCA_LA_RED = 1;

/**
 * **Los puestos quitando las copias**: uno por `ref`, y todos los que no lo
 * tienen. Es la cuenta con la que `osm-a-aerodromo.mjs` compara lo que trae
 * con lo que había: la ficha vieja tenía cada puesto dibujado con nodo y línea
 * dos veces, y sin esto la primera extracción con `puestosDeOsm` se rechazaba
 * por «traer menos» puestos de los que había, cuando lo que traía eran menos
 * copias.
 */
export function puestosSinCopias(puestos) {
  const vistos = new Set();
  return puestos.filter((p) => {
    if (p.ref === null || p.ref === undefined) return true;
    if (vistos.has(p.ref)) return false;
    vistos.add(p.ref);
    return true;
  });
}

/** Distancia de un punto a una polilínea, m. */
function aLaPolilinea([px, py], linea) {
  let mejor = Infinity;
  for (let i = 0; i < linea.length - 1; i++) {
    const [ax, ay] = linea[i];
    const [bx, by] = linea[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    mejor = Math.min(mejor, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
  }
  return mejor;
}

/**
 * Los puestos de un aeródromo a partir de los elementos que devuelve Overpass
 * con `out geom`, en el orden en que llegan: primero los que son nodos y
 * detrás los que salen de una vía. `proj(lat, lon)` da `[x, y]` en metros.
 */
export function puestosDeOsm(elementos, proj) {
  const esPuesto = (e) => e.tags?.aeroway === "parking_position";
  const ref = (e) => e.tags?.ref ?? null;
  const linea = (w) => w.geometry.map((p) => proj(p.lat, p.lon));
  const nodos = elementos.filter((e) => esPuesto(e) && e.type === "node" && e.lat !== undefined);
  const vias = elementos.filter((e) => esPuesto(e) && e.type === "way" && (e.geometry?.length ?? 0) > 1);
  const calles = elementos
    .filter(
      (e) =>
        e.type === "way" &&
        (e.tags?.aeroway === "taxiway" || e.tags?.aeroway === "taxilane") &&
        (e.geometry?.length ?? 0) > 1,
    )
    .map(linea);
  const lineas = new Map(vias.map((v) => [v, linea(v)]));
  const aLasCalles = (p) => Math.min(Infinity, ...calles.map((c) => aLaPolilinea(p, c)));

  const conSuNodo = (w) =>
    nodos.some(
      (n) => (ref(w) === null || ref(n) === ref(w)) && w.geometry.some((p) => p.lat === n.lat && p.lon === n.lon),
    );

  const puestos = nodos.map((n) => ({ ref: ref(n), xy: proj(n.lat, n.lon) }));
  for (const v of vias) {
    const g = v.geometry;
    const puntos = lineas.get(v);
    // 2. La línea de entrada de un nodo que ya está, o un tramo de ella.
    if (conSuNodo(v)) continue;
    const tramoDeOtra = vias.some(
      (w) =>
        w !== v &&
        ref(w) !== null &&
        ref(w) === ref(v) &&
        conSuNodo(w) &&
        [puntos[0], puntos[puntos.length - 1]].some((p) => aLaPolilinea(p, lineas.get(w)) <= TOCA_LA_RED),
    );
    if (tramoDeOtra) continue;
    const primero = puntos[0];
    const ultimo = puntos[puntos.length - 1];
    // 6. Un recinto cerrado: su centro.
    if (g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon) {
      const anillo = g.slice(0, -1);
      const lat = anillo.reduce((s, p) => s + p.lat, 0) / anillo.length;
      const lon = anillo.reduce((s, p) => s + p.lon, 0) / anillo.length;
      puestos.push({ ref: ref(v), xy: proj(lat, lon) });
      continue;
    }
    const otras = [...calles, ...vias.filter((w) => w !== v).map((w) => lineas.get(w))];
    const toca = (p) => otras.some((l) => aLaPolilinea(p, l) <= TOCA_LA_RED);
    const sueltas = [primero, ultimo].filter((p) => !toca(p));
    // 5. Un carril hacia otros puestos.
    if (!sueltas.length) continue;
    // 3 y 4. La punta suelta; si lo están las dos, la más alejada de las calles.
    const parada =
      sueltas.length === 1 ? sueltas[0] : aLasCalles(primero) > aLasCalles(ultimo) ? primero : ultimo;
    puestos.push({ ref: ref(v), xy: parada });
  }
  return puestos;
}

/** Lo que se da por el mismo punto al casar un puesto con su línea, m. */
const EN_EL_PUESTO = 0.5;

/** Largo de una polilínea, m. */
function largo(linea) {
  let l = 0;
  for (let i = 1; i < linea.length; i++) l += Math.hypot(linea[i][0] - linea[i - 1][0], linea[i][1] - linea[i - 1][1]);
  return l;
}

/**
 * **La línea de entrada pintada de cada puesto que la tenga** (H60), de fuera
 * hacia la parada: su último punto es el del puesto. Es la raya por la que el
 * avión entra y sobre la que se aparca, con el morro a la pasarela; `rumboEnElPuesto`
 * la prefiere a la ruta, que va hacia donde vaya la calle y no hacia donde está
 * pintado el puesto. En el 24 de Los Rodeos la ruta hasta la Z daba 76° y la raya
 * pintada va a 61°, como en el plano del AIP.
 *
 * `puestosDeOsm` ya las leía, y las tiraba: le servían para no contar dos veces
 * un puesto. De dónde sale cada una:
 *
 * 1. **La vía de `parking_position` que pasa por el puesto**, con su nodo en un
 *    vértice o con la parada en su punta. Si sigue un poco más allá de la parada
 *    —la del 24 de Los Rodeos lo hace—, eso es el final de la raya, por donde
 *    paran los aviones más cortos: la entrada es el lado largo. Y si empalma con
 *    otro tramo de su mismo `ref`, se sigue por él (el 17 y el 25 de Los Rodeos
 *    van en dos trozos).
 * 2. Si no la hay, **la `taxilane` o `taxiway` que acaba en el puesto**, si es
 *    una sola: así dibujan algunos campos la línea de entrada.
 *
 * Sin ninguna de las dos, el puesto se queda sin `entrada` y el avión se pone
 * por la ruta, como antes.
 */
export function entradasDeOsm(elementos, proj, puestos) {
  const esPuesto = (e) => e.tags?.aeroway === "parking_position";
  const ref = (e) => e.tags?.ref ?? null;
  const linea = (w) => w.geometry.map((p) => proj(p.lat, p.lon));
  const abierta = (w) => {
    const g = w.geometry;
    return !(g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon);
  };
  const vias = elementos
    .filter((e) => esPuesto(e) && e.type === "way" && (e.geometry?.length ?? 0) > 1 && abierta(e))
    .map((w) => ({ ref: ref(w), puntos: linea(w) }));
  const calles = elementos
    .filter(
      (e) =>
        e.type === "way" &&
        (e.tags?.aeroway === "taxiway" || e.tags?.aeroway === "taxilane") &&
        (e.geometry?.length ?? 0) > 1,
    )
    .map(linea);
  const cerca = (a, b, tope) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tope;

  /** Desde el vértice `i`, la rama más larga hacia una de las dos puntas. */
  const ramaLarga = (puntos, i) => {
    const atras = puntos.slice(0, i + 1).reverse();
    const delante = puntos.slice(i);
    return largo(atras) >= largo(delante) ? atras : delante;
  };

  /** La rama seguida por los tramos de su mismo `ref` que empalman con su punta. */
  const conSusTramos = (rama, suRef, usadas) => {
    let out = rama;
    for (let vuelta = 0; vuelta < 4 && suRef !== null; vuelta++) {
      const punta = out[out.length - 1];
      const sigue = vias.find(
        (v) =>
          !usadas.has(v) &&
          v.ref === suRef &&
          (cerca(v.puntos[0], punta, TOCA_LA_RED) || cerca(v.puntos[v.puntos.length - 1], punta, TOCA_LA_RED)),
      );
      if (!sigue) break;
      usadas.add(sigue);
      const orientada = cerca(sigue.puntos[0], punta, TOCA_LA_RED) ? sigue.puntos : [...sigue.puntos].reverse();
      out = [...out, ...orientada.slice(1)];
    }
    return out;
  };

  const entradaDe = (p) => {
    // 1. La vía del puesto, del mismo `ref` si lo tienen los dos. Si el nodo está donde
    // empalman dos tramos, los dos pasan por él: la entrada es el más largo.
    let mejor = null;
    for (const v of vias) {
      if (p.ref !== null && v.ref !== null && v.ref !== p.ref) continue;
      const i = v.puntos.findIndex((q) => cerca(q, p.xy, EN_EL_PUESTO));
      if (i < 0) continue;
      const rama = ramaLarga(v.puntos, i);
      if (rama.length < 2) continue;
      const entera = conSusTramos(rama, v.ref, new Set([v]));
      if (!mejor || largo(entera) > largo(mejor)) mejor = entera;
    }
    if (mejor) return mejor;
    // 2. La calle que acaba en el puesto, si es una sola.
    const suyas = calles.filter(
      (c) => cerca(c[0], p.xy, TOCA_LA_RED) || cerca(c[c.length - 1], p.xy, TOCA_LA_RED),
    );
    if (suyas.length !== 1) return null;
    const c = suyas[0];
    return cerca(c[0], p.xy, TOCA_LA_RED) ? c : [...c].reverse();
  };

  return puestos.map((p) => {
    const rama = entradaDe(p);
    if (!rama || largo(rama) < 3) return p;
    // De fuera hacia la parada, acabando justo en el punto del puesto.
    const entrada = [...rama].reverse();
    entrada[entrada.length - 1] = [p.xy[0], p.xy[1]];
    return { ...p, entrada };
  });
}
