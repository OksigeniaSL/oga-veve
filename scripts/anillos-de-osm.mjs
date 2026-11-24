/**
 * Los contornos de lo que OpenStreetMap dibuja como superficie, para los
 * extractores: un `way` cerrado o una relación `multipolygon`.
 *
 * Vive aparte porque lo usan dos: la extracción entera (`osm-a-aerodromo.mjs`)
 * y la que solo añade las plataformas que faltan (`plataformas-de-osm.mjs`).
 */

/** Tolerancia de simplificación, m. Por debajo de esto no se ve la diferencia. */
const TOLERANCIA = 0.5;

/** Distancia de un punto al segmento a-b. */
export function aLaRecta([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo = dx * dx + dy * dy;
  const t =
    largo === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas-Peucker. Se simplifica aquí y no en el juego: se hace una vez. */
export function simplificar(puntos, tol = TOLERANCIA) {
  if (puntos.length < 3) return puntos;
  let peor = 0;
  let cual = 0;
  for (let i = 1; i < puntos.length - 1; i++) {
    const d = aLaRecta(puntos[i], puntos[0], puntos[puntos.length - 1]);
    if (d > peor) {
      peor = d;
      cual = i;
    }
  }
  if (peor <= tol) return [puntos[0], puntos[puntos.length - 1]];
  return [
    ...simplificar(puntos.slice(0, cual + 1), tol).slice(0, -1),
    ...simplificar(puntos.slice(cual), tol),
  ];
}

export const camino = (elemento, proj) =>
  simplificar((elemento.geometry ?? []).map((p) => proj(p.lat, p.lon)));

/**
 * **Los anillos de una superficie**: uno si es un `way` cerrado, y los
 * exteriores si es una relación `multipolygon`.
 *
 * Esto leía `geometry` y nada más, que es lo que trae un `way`; una relación
 * lo trae repartido en sus miembros, así que salía vacía. En Tenerife Sur la
 * plataforma de los puestos H37 a H43 es una relación de dos anillos, y el
 * fichero la guardaba como un polígono sin un solo punto: esos puestos
 * quedaban dibujados en mitad del campo. Se cosen los tramos exteriores punta
 * con punta hasta cerrar cada anillo; los interiores —los agujeros— se dejan,
 * que una plataforma con un parterre dentro sigue siendo plataforma.
 *
 * **Y la relación tiene que venir con sus miembros**: `out tags geom` no los
 * trae —el nivel `tags` de Overpass es «solo el identificador y las
 * etiquetas»— y `out body geom`, sí. Con la primera, la relación entraba aquí
 * sin tramos y salía sin un anillo y sin avisar: así le faltaban a Barajas las
 * seis de la plataforma de la T1, la T2 y la T3 (H81).
 */
export function anillos(elemento, proj) {
  if (elemento.type !== "relation") {
    const uno = camino(elemento, proj);
    return uno.length >= 3 ? [uno] : [];
  }
  const tramos = (elemento.members ?? [])
    .filter((m) => m.role === "outer" && m.geometry?.length > 1)
    .map((m) => m.geometry);
  const igual = (a, b) => a.lat === b.lat && a.lon === b.lon;
  const salida = [];
  while (tramos.length) {
    const anillo = [...tramos.shift()];
    for (let seguir = true; seguir && !igual(anillo[0], anillo[anillo.length - 1]); ) {
      seguir = false;
      for (let i = 0; i < tramos.length; i++) {
        const t = tramos[i];
        const ultimo = anillo[anillo.length - 1];
        if (igual(t[0], ultimo)) anillo.push(...t.slice(1));
        else if (igual(t[t.length - 1], ultimo)) anillo.push(...[...t].reverse().slice(1));
        else continue;
        tramos.splice(i, 1);
        seguir = true;
        break;
      }
    }
    const puntos = simplificar(anillo.map((p) => proj(p.lat, p.lon)));
    if (puntos.length >= 3) salida.push(puntos);
  }
  return salida;
}
