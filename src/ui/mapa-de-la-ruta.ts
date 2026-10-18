/**
 * **El mapa de la ruta**: las islas, el camino y el avión en su sitio, en la
 * ventanita del juego.
 *
 * Es un dibujo del juego, en su marco de cristal, y no un objeto de la cabina:
 * el JAZ 90 no lleva pantallas en los respaldos —un regional en un salto de
 * media hora entre islas no las lleva—, y aquí no se le pone ninguna (AGENTS.md,
 * regla 4). Sale cuando la tripulante cuenta cómo sabe el avión el camino
 * —ver `dibujos-del-pasaje.ts`—, y mientras Ara duerme, que es como se ve que
 * el vuelo sigue —ver `ui/siesta.ts`—.
 *
 * ## Las islas de verdad (punto 292)
 *
 * Antes eran cuatro óvalos y un círculo, y Enrique lo dijo como lo diría
 * cualquiera que haya visto un mapa de Canarias: «¿Y esto es un mapa de
 * Canarias? JA JA JA». Quien aprende algo aquí tiene que reconocerlo el día
 * que lo vea (AGENTS.md, regla 4), y un mapa enseña la costa de verdad. Así
 * que las costas son las de Natural Earth 1:10m —dominio público, ver
 * `CREDITOS.md`—, las mismas del mapa del hangar y del plano del vuelo,
 * simplificadas a doscientos metros: a este tamaño un píxel son casi
 * quinientos, y la forma de cada isla se reconoce entera. Ver `siluetas.ts`.
 *
 * ## En las coordenadas del mundo
 *
 * El camino es el del plan que vuela la tripulación y el avión está donde
 * está, los dos en metros del mundo; las costas se pasan a esos mismos metros
 * con la misma proyección que el resto del juego —`dondeCae`—, que una costa
 * corrida respecto al camino enseñaría el avión volando por encima de tierra
 * cuando va por el mar.
 *
 * Esto es solo el dibujo: cadenas de SVG, sin DOM.
 */

import { dondeCae, type Sitio } from "../world/entre-aerodromos";
import { SILUETAS } from "./siluetas";

/** Un punto del mundo, m: `x` al este y `z` al sur. */
export interface PuntoXZ {
  readonly x: number;
  readonly z: number;
}

/** El avión, donde está y hacia dónde va: rumbo en rad, cero al norte y hacia el este. */
export interface AvionEnElMapa extends PuntoXZ {
  readonly rumbo: number;
}

/**
 * **Lo que se encuadra**: las cuatro islas de poniente —La Palma, La Gomera,
 * El Hierro y Tenerife—, de 18,2° O a 16,0° O y de 27,6° N a 28,9° N. A esta
 * latitud son unos 215 por 144 km, tres por dos como la ventanita, así que
 * las islas no salen estiradas.
 */
export const CANARIAS_DE_PONIENTE = { oeste: -18.2, este: -16.0, norte: 28.9, sur: 27.6 } as const;

/** El tamaño de la hoja, el de los dibujos de la ventanita. */
export const ANCHO_DEL_MAPA = 480;
export const ALTO_DEL_MAPA = 320;

/** Dónde cae la hoja en el mundo, m: la esquina de arriba a la izquierda y lo que mide. */
export interface Encuadre {
  readonly x0: number;
  readonly z0: number;
  readonly ancho: number;
  readonly alto: number;
}

/** El mapa de un mundo: su encuadre y sus islas, ya en metros. */
export interface MapaDeLaRuta {
  readonly encuadre: Encuadre;
  readonly islas: readonly (readonly PuntoXZ[])[];
}

/** Lo que va encima de las islas: el camino del plan, sus dos campos y el avión. */
export interface LoDelVuelo {
  readonly camino: readonly PuntoXZ[];
  readonly salida: PuntoXZ | null;
  readonly llegada: PuntoXZ | null;
  readonly avion: AvionEnElMapa | null;
  /** La torre hablando por radio, junto al campo de salida: lo que cuenta la tripulante. */
  readonly torre?: boolean;
}

/** Los colores de los dibujos del juego. Ver `dibujos-del-pasaje.ts`. */
const C = {
  mar: "#3f7fa6",
  tierra: "#b98a5a",
  tinta: "#2a1c14",
  blanco: "#ffffff",
  amarillo: "#f2c230",
  cielo: "#cfe6ee",
} as const;

const f = (n: number): string => n.toFixed(1);

/**
 * **El encuadre en el mundo de ese origen**: las cuatro esquinas de la caja
 * pasadas a metros, y la caja que las contiene, centrada y en tres por dos.
 */
export function encuadreDe(origen: Sitio, caja = CANARIAS_DE_PONIENTE): Encuadre {
  const esquinas = [
    dondeCae(origen, { lat: caja.norte, lon: caja.oeste }),
    dondeCae(origen, { lat: caja.norte, lon: caja.este }),
    dondeCae(origen, { lat: caja.sur, lon: caja.oeste }),
    dondeCae(origen, { lat: caja.sur, lon: caja.este }),
  ];
  const xs = esquinas.map((p) => p.x);
  const zs = esquinas.map((p) => p.z);
  let ancho = Math.max(...xs) - Math.min(...xs);
  let alto = Math.max(...zs) - Math.min(...zs);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
  const proporcion = ANCHO_DEL_MAPA / ALTO_DEL_MAPA;
  if (ancho / alto > proporcion) alto = ancho / proporcion;
  else ancho = alto * proporcion;
  return { x0: cx - ancho / 2, z0: cz - alto / 2, ancho, alto };
}

const hechos = new Map<string, MapaDeLaRuta>();

/**
 * **El mapa para un mundo con ese origen**: el encuadre y las islas que caen
 * dentro, con la costa de Natural Earth. Una vez por origen: las costas no se
 * mueven.
 */
export function mapaPara(origen: Sitio): MapaDeLaRuta {
  const clave = `${origen.lat}:${origen.lon}`;
  const hecho = hechos.get(clave);
  if (hecho) return hecho;
  const caja = CANARIAS_DE_PONIENTE;
  const islas = SILUETAS.es
    .filter((anillo) =>
      anillo.some(([lon, lat]) => lon >= caja.oeste && lon <= caja.este && lat >= caja.sur && lat <= caja.norte),
    )
    .map((anillo) => anillo.map(([lon, lat]) => dondeCae(origen, { lat, lon })));
  const mapa = { encuadre: encuadreDe(origen), islas };
  hechos.set(clave, mapa);
  return mapa;
}

/** Un punto del mundo, en la hoja. */
export function enLaHoja(e: Encuadre, p: PuntoXZ): readonly [number, number] {
  return [((p.x - e.x0) / e.ancho) * ANCHO_DEL_MAPA, ((p.z - e.z0) / e.alto) * ALTO_DEL_MAPA];
}

/**
 * **Dónde y hacia dónde se pinta el avión**: el dibujo mira a la derecha, al
 * este, y se gira con el rumbo. En la hoja, como en el mundo, el sur va abajo.
 */
export function transformDelAvion(e: Encuadre, a: AvionEnElMapa): string {
  const [x, y] = enLaHoja(e, a);
  const grados = (a.rumbo * 180) / Math.PI - 90;
  return `translate(${f(x)} ${f(y)}) rotate(${grados.toFixed(0)})`;
}

/**
 * **El camino partido por el avión**: lo hecho, desde la salida hasta el
 * punto del camino más cerca del avión, y lo que falta, desde ahí: lo volado
 * con raya entera y lo que queda a puntos, que se ve de un vistazo cuánto se
 * lleva. Sin avión, todo falta.
 */
export function partirElCamino(
  camino: readonly PuntoXZ[],
  avion: PuntoXZ | null,
): { readonly hecho: readonly PuntoXZ[]; readonly falta: readonly PuntoXZ[] } {
  if (!avion || camino.length < 2) return { hecho: [], falta: camino };
  let mejor = { i: 0, t: 0, d: Infinity };
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const largo2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((avion.x - a.x) * dx + (avion.z - a.z) * dz) / largo2));
    const d = Math.hypot(a.x + dx * t - avion.x, a.z + dz * t - avion.z);
    if (d < mejor.d) mejor = { i, t, d };
  }
  const a = camino[mejor.i - 1]!;
  const b = camino[mejor.i]!;
  const corte = { x: a.x + (b.x - a.x) * mejor.t, z: a.z + (b.z - a.z) * mejor.t };
  return { hecho: [...camino.slice(0, mejor.i), corte], falta: [corte, ...camino.slice(mejor.i)] };
}

/** Los puntos de una línea, en la hoja, para un `points` de SVG. */
export function puntosEnLaHoja(e: Encuadre, puntos: readonly PuntoXZ[]): string {
  return puntos.map((p) => enLaHoja(e, p).map(f).join(",")).join(" ");
}

/** El avioncito, mirando a la derecha: el mismo del kit de viaje. */
const AVIONCITO = `<path d="M-22 0 q0 -5 7 -5 h26 q8 0 12 5 q-4 5 -12 5 h-26 q-7 0 -7 -5z M-2 0 l-12 13 h7 l17 -13z M-2 0 l-12 -13 h7 l17 13z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>`;

/**
 * **El dibujo del mapa**, lo de dentro de un SVG de 480 × 320: el mar, las
 * islas con su costa, el camino —lo volado entero y lo que falta a puntos—,
 * los dos campos y el avión. Sin letras: se juega sin saber leer (regla 2), y
 * lo que hay que ver se ve. Las piezas que se mueven llevan su clase —
 * `mapa__hecho`, `mapa__falta` y `mapa__avion`—, para quien quiera moverlas
 * sin volver a pintar las islas.
 */
export function dibujoDelMapa(m: MapaDeLaRuta, v: LoDelVuelo): string {
  const e = m.encuadre;
  const islas = m.islas
    .map(
      (isla) =>
        `<path class="mapa__isla" d="M${isla.map((p) => enLaHoja(e, p).map(f).join(" ")).join(" L")} Z" fill="${C.tierra}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>`,
    )
    .join("\n");
  const { hecho, falta } = partirElCamino(v.camino, v.avion);
  const campo = (p: PuntoXZ | null): string => {
    if (!p) return "";
    const [x, y] = enLaHoja(e, p);
    return `<circle cx="${f(x)}" cy="${f(y)}" r="8" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3"/>`;
  };
  const torre = (() => {
    if (!v.torre || !v.salida) return "";
    const [x, y] = enLaHoja(e, v.salida);
    // En tierra, al sur del campo: la torre es del aeropuerto, no del mar.
    return `<g transform="translate(${f(x - 34)} ${f(y + 40)})">
<path d="M-8 30 L-4 0 h8 L8 30z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
<rect x="-12" y="-14" width="24" height="16" rx="3" fill="${C.cielo}" stroke="${C.tinta}" stroke-width="3"/>
<path d="M18 -18 q10 10 0 22 M26 -26 q18 18 0 38" fill="none" stroke="${C.blanco}" stroke-width="4" stroke-linecap="round" class="radio"/>
</g>`;
  })();
  const avion = v.avion ? `<g class="mapa__avion" transform="${transformDelAvion(e, v.avion)}">${AVIONCITO}</g>` : "";
  return `<rect width="${ANCHO_DEL_MAPA}" height="${ALTO_DEL_MAPA}" rx="18" fill="${C.mar}"/>
${islas}
<polyline class="mapa__falta" points="${puntosEnLaHoja(e, falta)}" fill="none" stroke="${C.blanco}" stroke-width="5" stroke-dasharray="2 11" stroke-linecap="round" stroke-linejoin="round"/>
<polyline class="mapa__hecho" points="${puntosEnLaHoja(e, hecho)}" fill="none" stroke="${C.amarillo}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
${campo(v.salida)}${campo(v.llegada)}
${torre}
${avion}`;
}

/**
 * **El vuelo de la escena sin el juego delante**: de Los Rodeos a La Palma en
 * línea, con el avión a mitad de camino. Es lo que sale en la ventanita si el
 * juego no le da el camino del plan y el avión de verdad —en las pruebas, por
 * ejemplo—; jugando, el juego le da los suyos. Los orígenes son los de los dos
 * aeródromos: ver `data/aerodromes/gcxo.aero.json` y `gcla.aero.json`.
 */
export const LOS_RODEOS: Sitio = { lat: 28.482752, lon: -16.341707 };
export const LA_PALMA: Sitio = { lat: 28.626499, lon: -17.7556 };

export function vueloDeMuestra(): { readonly mapa: MapaDeLaRuta; readonly vuelo: LoDelVuelo } {
  const mapa = mapaPara(LOS_RODEOS);
  const salida = dondeCae(LOS_RODEOS, LOS_RODEOS);
  const llegada = dondeCae(LOS_RODEOS, LA_PALMA);
  const mitad = { x: (salida.x + llegada.x) / 2, z: (salida.z + llegada.z) / 2 };
  const rumbo = Math.atan2(llegada.x - salida.x, -(llegada.z - salida.z));
  return {
    mapa,
    vuelo: { camino: [salida, llegada], salida, llegada, avion: { ...mitad, rumbo }, torre: true },
  };
}
