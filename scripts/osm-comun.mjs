/**
 * Lo que comparten los extractores de OpenStreetMap.
 *
 * Vive aparte porque hay dos —el del aeródromo y el de la ciudad— y la política
 * de reintentos de Overpass es de esas cosas que, duplicadas, se corrigen en una
 * copia y no en la otra.
 *
 * Cero dependencias, como todo lo de aquí.
 */

const OVERPASS = process.env.OVERPASS ?? 'https://overpass-api.de/api/interpreter';

/** Dónde preguntar, por orden. El principal se satura a diario. */
const ESPEJOS = [
  OVERPASS,
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Overpass es gratuito y lo mantienen voluntarios, así que se satura. Un 504 o
 * un 429 no significan que la consulta esté mal: significan «ahora no». Se
 * reintenta con espera creciente y, si el servidor principal sigue sin dar
 * señales, se prueba en un espejo. Sin esto, extraer era una tirada de dados a
 * media tarde.
 */
export async function overpass(query) {
  let ultimo;
  for (const servidor of ESPEJOS) {
    for (let intento = 0; intento < 3; intento++) {
      if (intento) await esperar(5000 * intento);
      let res;
      try {
        // El tipo de contenido y el identificador no son opcionales: sin ellos
        // Overpass devuelve 406 sin más explicación. Y el identificador es de
        // cortesía además de obligatorio.
        res = await fetch(servidor, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'oga-veve/0.1 (+https://github.com/OksigeniaSL/oga-veve)',
          },
          body: 'data=' + encodeURIComponent(query),
        });
      } catch (err) {
        ultimo = err;
        continue;
      }
      if (res.ok) return res.json();
      ultimo = new Error(`Overpass (${servidor}) respondió ${res.status}`);
      // Un 400 es culpa de la consulta: reintentar no la va a arreglar.
      if (res.status === 400) throw ultimo;
      console.warn(`  ⚠ ${ultimo.message}, reintentando…`);
    }
  }
  throw ultimo;
}

/** Distancia de un punto al segmento a-b. */
export function aLaRecta([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo = dx * dx + dy * dy;
  const t = largo === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas-Peucker. Se simplifica aquí y no en el juego: se hace una vez. */
export function simplificar(puntos, tol) {
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

/**
 * La proyección local: grados a metros con el origen en el aeródromo.
 *
 * Equirrectangular, que a veinte kilómetros del origen se desvía centímetros y
 * es la misma cuenta que usa el extractor de relieve. **Tienen que ser la
 * misma**: si el asfalto y el terreno no se proyectan igual, el aeropuerto
 * queda flotando.
 */
export const R_TIERRA = 6371000;
export function proyector(lat0, lon0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return (lat, lon) => [
    ((lon - lon0) * (R_TIERRA * Math.PI * k)) / 180,
    ((lat - lat0) * (R_TIERRA * Math.PI)) / 180,
  ];
}
