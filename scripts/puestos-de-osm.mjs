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
 *    de entrada de ese nodo: el puesto ya está, no se repite.
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

  const puestos = nodos.map((n) => ({ ref: ref(n), xy: proj(n.lat, n.lon) }));
  for (const v of vias) {
    const g = v.geometry;
    // 2. La línea de entrada de un nodo que ya está.
    if (nodos.some((n) => ref(n) === ref(v) && g.some((p) => p.lat === n.lat && p.lon === n.lon))) continue;
    const puntos = lineas.get(v);
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
