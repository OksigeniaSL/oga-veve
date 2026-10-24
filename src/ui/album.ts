/**
 * **El álbum de los sellos con nombre**: sus dibujos y su página del cuaderno.
 *
 * Qué se gana y por qué lo dice `flight/sellos.ts`; esto lo dibuja.
 *
 * ## Un dibujo que se entiende sin leer
 *
 * Cada sello es lo que premia, dibujado: el avión que sale de la raya del
 * suelo en ¡Veve!, la tortuga sobre la pista en Karumbe, el picaflor con su
 * flor en Mainumby, la nube con el encaje dentro en Ñandutí, la luna sobre
 * las luces de la pista en Jasy, la senda que baja y se vuelve a ir arriba en
 * Mbarete —el mismo dibujo que la frustrada de la tarjeta de señal: un
 * significado, un dibujo—, las arcadas de Trinidad en la Ruta Jesuítica, el
 * Paraguay con sus nueve campos en la hazaña de Pettirossi…
 *
 * Y la forma dice de qué altura es, para quien no distingue colores: los de
 * escuela, un aro; los de piloto, dos; los de comandante, el borde festoneado
 * de un lacre. La tinta, lo mismo con color: verde, azul y oro viejo.
 *
 * ## La página: los ganados y los huecos
 *
 * Como un álbum de figuritas: **cada sello tiene su sitio**, y el que falta es
 * su hueco, con el borde a trazos y nada dentro. No va tachado, ni en gris, ni
 * con un candado, ni con lo que hay que hacer para ganarlo: es un sitio vacío
 * que se llenará, y lo que se ve es cuántos se tienen.
 *
 * Es la única página del cuaderno con huecos, y a propósito. La hoja de la
 * instructora no los lleva porque es la nota de **un** vuelo —una fila vacía
 * ahí es un reproche por lo que no salió hoy, ver `ui/hoja.ts`—; un álbum es
 * otra cosa, una colección de toda la vida, y su gracia es ver cómo se llena.
 * Los sellos de campo siguen sin huecos: ahí la colección es el mundo entero
 * y un hueco por cada aeropuerto sería una lista de deberes.
 *
 * Esto no toca el DOM: devuelve SVG y HTML, que se pueden probar sin
 * navegador.
 */

import { SCENARIOS } from "../world/scenarios";
import { CAMPOS_DEL_PARAGUAY, SELLOS, tramoDe, type Sello } from "../flight/sellos";
import { t, type TranslationKey } from "../i18n";
import { explicacionDe, registrarExplicacion } from "./explicaciones";
import { SILUETAS } from "./siluetas";

/* ── Las piezas de los dibujos ────────────────────────────────────────────
 *
 * Todo en `currentColor`: el mismo dibujo sale en la tinta de su altura en el
 * álbum, en la crema de la tarjeta de señal y en el ocre de la ventana de las
 * explicaciones, sin pintarlo tres veces.
 */

/** Un trazo, del grueso que se pida. */
export const trazo = (grueso: number): string =>
  `fill="none" stroke="currentColor" stroke-width="${grueso}" stroke-linecap="round" stroke-linejoin="round"`;
/** Lleno de tinta. */
export const LLENO = `fill="currentColor"`;
/** El tinte claro de dentro, como los paisajes de los sellos de campo. */
export const TINTE = `fill="currentColor" fill-opacity="0.22"`;

/** Un avión de lado, con el morro hacia la derecha, de unos dieciséis de largo. */
export const avionDeLado = (x: number, y: number, giro: number, escala: number): string =>
  `<path ${LLENO} transform="translate(${x} ${y}) rotate(${giro}) scale(${escala})"
     d="M-8 -0.9 L5.2 -1.3 Q8 -1.2 8.2 0 Q8 1.1 5.2 1.3 L-6.5 1.1 Z
        M-8 -0.9 L-9 -5 L-6.6 -5 L-4.6 -1 Z M-1.5 0.6 L-4.2 4 L-2 4 L2 0.8 Z" />`;

/** Un avión visto desde arriba, con el morro hacia arriba. */
const avionDesdeArriba = (x: number, y: number, giro: number, escala: number): string =>
  `<path ${LLENO} transform="translate(${x} ${y}) rotate(${giro}) scale(${escala})"
     d="M0 -7 Q1 -6.4 1 -4.5 V-1.2 L7 1.6 V3 L1 1.8 V4.6 L3 6.2 V7 L0 6.3 L-3 7 V6.2
        L-1 4.6 V1.8 L-7 3 V1.6 L-1 -1.2 V-4.5 Q-1 -6.4 0 -7 Z" />`;

/**
 * **La luna en cuarto**: el borde de un círculo y el mordisco de otro. Los
 * cuernos están sobre el primero, a menos sesenta y a veinte grados.
 */
function luna(cx: number, cy: number, r: number): string {
  const punta = (g: number): string =>
    `${(cx + r * Math.cos((g * Math.PI) / 180)).toFixed(2)} ${(cy + r * Math.sin((g * Math.PI) / 180)).toFixed(2)}`;
  return `<path ${LLENO} d="M${punta(-60)} A${r} ${r} 0 1 0 ${punta(20)} A${(r * 0.82).toFixed(2)} ${(r * 0.82).toFixed(2)} 0 0 1 ${punta(-60)} Z" />`;
}

/**
 * **El Paraguay con sus campos**, para la hazaña de Pettirossi: la silueta de
 * Natural Earth, la misma de los sellos de campo y del mapa del hangar, con
 * un punto en cada aeródromo del país. Encajada en su hueco con la longitud
 * acortada por el coseno de la latitud, o sale ancho.
 */
function paraguayConSusCampos(x: number, y: number, lado: number): string {
  const pais = SILUETAS.py[0];
  if (!pais) return "";
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lon, lat] of pais) {
    minX = Math.min(minX, lon);
    maxX = Math.max(maxX, lon);
    minY = Math.min(minY, lat);
    maxY = Math.max(maxY, lat);
  }
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const escala = Math.min(lado / ((maxX - minX) * k), lado / (maxY - minY));
  const dx = x + (lado - (maxX - minX) * k * escala) / 2;
  const dy = y + (lado - (maxY - minY) * escala) / 2;
  const a = (lon: number, lat: number): string =>
    `${(dx + (lon - minX) * k * escala).toFixed(1)} ${(dy + (maxY - lat) * escala).toFixed(1)}`;
  // Un punto de cada dos: a este tamaño no se ve la diferencia, y pesa la mitad.
  const silueta = `M${pais.filter((_, i) => i % 2 === 0).map(([lon, lat]) => a(lon, lat)).join("L")}Z`;
  const campos = CAMPOS_DEL_PARAGUAY.map((id) => SCENARIOS.find((e) => e.id === id)?.aerodrome?.origin)
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => {
      const [cx, cy] = a(o.lon, o.lat).split(" ");
      return `<circle ${LLENO} cx="${cx}" cy="${cy}" r="1.5" />`;
    })
    .join("");
  return `<path ${TINTE} d="${silueta}" /><path ${trazo(1.1)} d="${silueta}" />${campos}`;
}

/**
 * **El dibujo de cada sello**, en un lienzo de cuarenta con el centro en el
 * medio y todo dentro de un círculo de diecinueve: así cabe dentro del aro.
 */
const DIBUJO: Readonly<Record<Sello, () => string>> = {
  /* ¡Veve!: el avión que se va de la raya del suelo. Veve es volar. */
  veve: () => `
    <path ${trazo(2.6)} d="M5 30 H22" />
    <path ${trazo(1.6)} stroke-dasharray="2 2.4" d="M10 28.6 Q16 27.4 21 22.6" />
    ${avionDeLado(26, 17, -28, 1.05)}`,
  /* Karumbe: la tortuga, despacito y por el medio de la pista. */
  karumbe: () => `
    <rect ${TINTE} x="5" y="25" width="30" height="6.5" rx="1.2" />
    <path ${trazo(1.1)} stroke-dasharray="2.6 2.2" d="M8 28.25 H32" />
    <path ${TINTE} d="M9.5 24.5 Q10 13.5 18.5 12.8 Q27 13.5 27.5 24.5 Z" />
    <path ${trazo(1.8)} d="M9.5 24.5 Q10 13.5 18.5 12.8 Q27 13.5 27.5 24.5 Z" />
    <path ${trazo(1.2)} d="M15.5 21 L18.5 17.4 L21.5 21 L20.3 24.4 H16.7 Z" />
    <path ${TINTE} d="M27 22.5 Q30.5 18 33.5 20.2 Q33.6 23.4 28 24 Z" />
    <path ${trazo(1.6)} d="M27 22.5 Q30.5 18 33.5 20.2 Q33.6 23.4 28 24" />
    <circle ${LLENO} cx="31.3" cy="20.7" r="0.8" />
    <path ${trazo(2.2)} d="M12.6 24.6 v1.8 M24 24.6 v1.8" />
    <path ${trazo(1.5)} d="M9.6 23 L7.4 24.4" />`,
  /* Mainumby: el picaflor, quieto en el aire delante de su flor. */
  mainumby: () => `
    <path ${TINTE} d="M21 20 Q15 10 8.5 7.5 Q12.5 14.5 19 21.5 Z" />
    <path ${trazo(1.3)} d="M21 20 Q15 10 8.5 7.5 Q12.5 14.5 19 21.5" />
    <path ${TINTE} d="M22.2 19 Q22 10 19 5.6 Q25 11.5 24 19.6 Z" />
    <path ${trazo(1.3)} d="M22.2 19 Q22 10 19 5.6 Q25 11.5 24 19.6" />
    <circle ${LLENO} cx="25.5" cy="15" r="2.7" />
    <path ${trazo(1.5)} d="M28 14.2 L35.6 11.7" />
    <path ${LLENO} d="M24 17 Q20.5 18.5 17.5 23.5 Q16 26.5 13 29 L15.6 28.8 Q19.5 26.5 22 23 Q25.2 20 25.4 17.4 Z" />
    <path ${trazo(1.5)} d="M13.8 28.6 L9.8 32.4 M14.6 29.2 L12.8 33.6" />
    <path ${trazo(1.4)} d="M32.5 33 V25" />
    <circle ${TINTE} cx="32.5" cy="22.6" r="2.6" />
    <circle ${trazo(1.3)} cx="32.5" cy="22.6" r="2.6" />
    <path ${trazo(1.3)} d="M32.5 30 Q35 28.6 35.6 26.6" />`,
  /* Ñandutí: la nube, blanca por dentro como el encaje, y el avión que sale. */
  nanduti: () => `
    <path ${TINTE} d="M9 28 Q4.5 28 5.2 23.6 Q6 20 10 20.6 Q10.6 14.2 16.8 13.8 Q22.4 13.4 24.4 18 Q28 16.4 30.8 19.4 Q34.6 20.6 34 24.6 Q33.4 28 30 28 Z" />
    <path ${trazo(1.8)} d="M9 28 Q4.5 28 5.2 23.6 Q6 20 10 20.6 Q10.6 14.2 16.8 13.8 Q22.4 13.4 24.4 18 Q28 16.4 30.8 19.4 Q34.6 20.6 34 24.6 Q33.4 28 30 28 Z" />
    <circle ${trazo(0.9)} cx="19.5" cy="22.4" r="3.8" />
    <circle ${trazo(0.9)} cx="19.5" cy="22.4" r="1.6" />
    <path ${trazo(0.8)} d="M19.5 18.6 V26.2 M15.7 22.4 H23.3 M16.8 19.7 L22.2 25.1 M22.2 19.7 L16.8 25.1" />
    ${avionDeLado(27.5, 10, -22, 0.75)}`,
  /* La vuelta al tajamar: el agua de la granja y la vuelta entera alrededor. */
  tajamar: () => `
    <circle ${trazo(1.6)} stroke-dasharray="2.6 2.4" cx="20" cy="20" r="14.5" />
    <path ${TINTE} d="M12.5 21 Q12.5 15.5 20 15.5 Q27.8 15.5 27.6 21 Q27.4 25.8 20 25.8 Q12.6 25.8 12.5 21 Z" />
    <path ${trazo(1.6)} d="M12.5 21 Q12.5 15.5 20 15.5 Q27.8 15.5 27.6 21 Q27.4 25.8 20 25.8 Q12.6 25.8 12.5 21 Z" />
    <path ${trazo(1.1)} d="M15.6 20 q1.6 -1 3.2 0 t3.2 0 M17.6 23 q1.4 -0.9 2.8 0 t2.8 0" />
    ${avionDesdeArriba(30.25, 9.75, 135, 0.85)}`,
  /*
   * Tres toques: la flecha de la frustrada —la senda que baja y se vuelve a
   * ir arriba— pero tocando la pista, tres veces. Un significado, un dibujo.
   */
  "tres-toques": () => `
    <rect ${LLENO} x="4.5" y="28" width="31" height="3.4" rx="0.8" />
    ${[5, 15.5, 26]
      .map(
        (x) => `
    <path ${trazo(1.9)} d="M${x} 13.5 C${x + 1} 25 ${x + 3} 27.4 ${x + 4.5} 27.4 C${x + 6} 27.4 ${x + 8} 25 ${x + 8.6} 16.4" />
    <path ${LLENO} d="M${x + 9.2} 12.4 L${x + 6.4} 16.4 L${x + 10.6} 16.8 Z" />`,
      )
      .join("")}`,
  /* Primer solo: el circuito, el avión y una persona sola. */
  "primer-solo": () => `
    <path ${trazo(1.5)} stroke-dasharray="2.4 2.2" d="M12 11 H28 A7.5 7.5 0 0 1 28 26 H12 A7.5 7.5 0 0 1 12 11 Z" />
    <rect ${LLENO} x="12" y="27.6" width="16" height="2.6" rx="0.6" />
    ${avionDesdeArriba(20, 11, -90, 0.8)}
    <circle ${LLENO} cx="20" cy="16.6" r="2" />
    <path ${LLENO} d="M16.6 22 Q16.9 19.1 20 19.1 Q23.1 19.1 23.4 22 Z" />`,
  /* Chipa volandera: la chipa con alas, de un campo a otro. */
  "chipa-volandera": () => `
    <path ${trazo(2.6)} d="M5 31 H13 M27 31 H35" />
    <path ${trazo(1.4)} stroke-dasharray="2.2 2.2" d="M9 28.5 Q20 3 31 28.5" />
    <path ${TINTE} d="M15.4 14.5 Q10.5 9 7.5 11.2 Q9.4 12 10 13.5 Q11.5 15.6 15.6 16.6 Z
                      M24.6 14.5 Q29.5 9 32.5 11.2 Q30.6 12 30 13.5 Q28.5 15.6 24.4 16.6 Z" />
    <path ${trazo(1.3)} d="M15.4 14.5 Q10.5 9 7.5 11.2 Q9.4 12 10 13.5 Q11.5 15.6 15.6 16.6
                          M24.6 14.5 Q29.5 9 32.5 11.2 Q30.6 12 30 13.5 Q28.5 15.6 24.4 16.6" />
    <circle ${trazo(3.4)} cx="20" cy="15.5" r="4.3" />`,
  /* Jasy: la luna, las estrellas y las luces de la pista. */
  jasy: () => `
    ${luna(14, 12, 6.8)}
    <path ${LLENO} d="M27 5.6 L27.7 7.3 L29.4 8 L27.7 8.7 L27 10.4 L26.3 8.7 L24.6 8 L26.3 7.3 Z
                       M32 12.4 L32.5 13.5 L33.6 14 L32.5 14.5 L32 15.6 L31.5 14.5 L30.4 14 L31.5 13.5 Z" />
    <path ${trazo(1.2)} d="M6 22 H34" />
    <path ${TINTE} d="M13.5 36 L18.2 22 H21.8 L26.5 36 Z" />
    <path ${trazo(1.4)} d="M13.5 36 L18.2 22 H21.8 L26.5 36 Z" />
    <path ${trazo(1)} stroke-dasharray="1.8 1.6" d="M20 34 V24" />
    ${[
      [14.4, 33.3],
      [15.5, 30],
      [16.6, 26.8],
      [17.6, 23.8],
      [25.6, 33.3],
      [24.5, 30],
      [23.4, 26.8],
      [22.4, 23.8],
    ]
      .map(([x, y]) => `<circle ${LLENO} cx="${x}" cy="${y}" r="0.95" />`)
      .join("")}`,
  /* Mbarete: la frustrada de la tarjeta de señal. Fuerte es irse al aire. */
  mbarete: () => `
    <path ${trazo(2.6)} d="M6 32.6 H34.2" />
    <path ${trazo(2.4)} d="M6.7 9.5 Q20 31.2 33.3 12.3" />
    <path ${LLENO} d="M34.7 9.6 L29.4 11.9 L33.6 15.7 Z" />`,
  /* La Ruta Jesuítica: las arcadas en ruinas y el campanario de Trinidad. */
  "ruta-jesuitica": () => `
    <path ${TINTE} d="M8 17 H12 L13 18.6 L14.6 17.2 H27.5 V23 A3.25 3.25 0 0 0 21 23 A3.25 3.25 0 0 0 14.5 23 A3.25 3.25 0 0 0 8 23 Z" />
    <path ${trazo(1.7)} d="M8 32 V17 H12 L13 18.6 L14.6 17.2 H27.5 V32
                          M8 23 A3.25 3.25 0 0 1 14.5 23 V32 M14.5 23 A3.25 3.25 0 0 1 21 23 V32 M21 23 A3.25 3.25 0 0 1 27.5 23" />
    <path ${trazo(1.7)} d="M27.5 32 V13.5 H33 V32 M27 13.5 L30.25 10 L33.5 13.5" />
    <path ${trazo(1.5)} d="M30.25 10 V5.6 M28.5 7.2 H32" />
    <path ${LLENO} d="M29.2 18.2 A1.05 1.05 0 0 1 31.3 18.2 V20.4 H29.2 Z" />
    <path ${trazo(2)} d="M6 32 H34" />`,
  /* La hazaña de Pettirossi: el Paraguay, con todos sus campos. */
  pettirossi: () => paraguayConSusCampos(6.5, 6.5, 27),
  /* El planeador: alas largas y finas, y el aire que lo lleva. */
  planeador: () => `
    <path ${LLENO} d="M3.5 17.4 Q20 15.6 36.5 17.4 L36.5 19 Q20 20.2 3.5 19 Z" />
    <path ${LLENO} d="M20 9 Q21.3 10.5 21.1 15 L20.6 31 H19.4 L18.9 15 Q18.7 10.5 20 9 Z" />
    <path ${LLENO} d="M15.5 30.4 H24.5 V31.8 H15.5 Z" />
    <path ${trazo(1.2)} d="M7 26 q3 -1.6 6 0 M27 26 q3 -1.6 6 0 M10 31 q3 -1.6 6 0" />`,
  /*
   * Manos de seda: una pluma que se posa en la pista. Es el dibujo de lo
   * suave, y lo que se premia es eso: llegar por la senda y posarse sin un
   * golpe. La senda va a trazos, por donde bajó.
   */
  "manos-de-seda": () => `
    <rect ${LLENO} x="4.5" y="30" width="31" height="3.4" rx="0.8" />
    <path ${trazo(1.4)} stroke-dasharray="2 2" d="M5 8 L14 16" />
    <path ${TINTE} d="M33.5 9.5 Q35.5 17.5 27.5 23.5 Q21.5 28 12 28.6 Q14.6 22.4 20 17.4 Q26 12 33.5 9.5 Z" />
    <path ${trazo(1.6)} d="M33.5 9.5 Q35.5 17.5 27.5 23.5 Q21.5 28 12 28.6 Q14.6 22.4 20 17.4 Q26 12 33.5 9.5 Z" />
    <path ${trazo(1.5)} d="M9.5 29.4 L32 11" />
    <path ${trazo(1)} d="M17.6 23.4 L16 19.6 M22 19.8 L20.8 15.6 M26.4 16.2 L25.8 12.4 M21 25.6 L25 26.4 M25.2 22.2 L29.4 22.4 M29 18.4 L32.8 17.8" />`,
  /* Transchaco: la ruta derecha hasta el horizonte, el karanda'y y el cardón. */
  transchaco: () => `
    <path ${trazo(1.2)} d="M4 21 H36" />
    <path ${TINTE} d="M15 37 L19 21 H21 L25 37 Z" />
    <path ${trazo(1.4)} d="M15 37 L19 21 M21 21 L25 37" />
    <path ${trazo(1)} stroke-dasharray="2 1.8" d="M20 35 V23" />
    <path ${trazo(1.6)} d="M10 21 V12" />
    <path ${trazo(1.3)} d="M10 12 Q6.5 10.2 5 11.6 M10 12 Q13.5 10 15 11.4 M10 12 Q8 8.4 6.4 8 M10 12 Q12 8.2 13.8 7.8 M10 12 V7.4" />
    <path ${trazo(1.3)} d="M30 21 V15 Q30 13.5 31 13.5 Q32 13.5 32 15 V21 M30 18 H28.4 Q27.6 18 27.6 17 V15.6 M32 17 H33.4 Q34 17 34 16 V14.6" />
    ${avionDeLado(22, 9.5, -4, 0.7)}`,
  /* Cien horas: el reloj, con un sol y una luna, que son días y noches. */
  "cien-horas": () => `
    <circle ${TINTE} cx="20" cy="22" r="11" />
    <circle ${trazo(2)} cx="20" cy="22" r="11" />
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const dentro = i % 3 === 0 ? 7.6 : 8.6;
      const p = (r: number): string =>
        `${(20 + r * Math.sin(a)).toFixed(2)} ${(22 - r * Math.cos(a)).toFixed(2)}`;
      return `<path ${trazo(1.1)} d="M${p(dentro)} L${p(9.8)}" />`;
    }).join("")}
    <path ${trazo(1.8)} d="M20 22 V15.2 M20 22 L25 24.8" />
    <circle ${LLENO} cx="20" cy="22" r="1.2" />
    <circle ${LLENO} cx="9.5" cy="8.5" r="2.2" />
    <path ${trazo(1.2)} d="M9.5 4.9 V5.6 M9.5 11.4 V12.1 M5.9 8.5 H6.6 M12.4 8.5 H13.1" />
    ${luna(30.5, 8.5, 3.2)}`,
};

/* ── El sello entero ──────────────────────────────────────────────────── */

/** El borde de un lacre: arcos hacia fuera alrededor de un círculo. */
function feston(cuantos: number, r: number): string {
  const p = (i: number): string => {
    const a = (i / cuantos) * Math.PI * 2;
    return `${(24 + r * Math.cos(a)).toFixed(2)} ${(24 + r * Math.sin(a)).toFixed(2)}`;
  };
  const cuerda = 2 * r * Math.sin(Math.PI / cuantos);
  const radio = ((cuerda / 2) * 1.15).toFixed(2);
  let d = `M${p(0)}`;
  for (let i = 1; i <= cuantos; i++) d += ` A${radio} ${radio} 0 0 1 ${p(i)}`;
  return `${d} Z`;
}

/**
 * **El aro de cada altura**: uno, dos o el festón de un lacre. Es lo que
 * distingue la altura sin mirar el color.
 */
function aro(id: Sello): string {
  switch (tramoDe(id)) {
    case "escuela":
      return `<circle ${trazo(2.4)} cx="24" cy="24" r="21.4" />`;
    case "piloto":
      return `<circle ${trazo(2.4)} cx="24" cy="24" r="21.4" />
              <circle ${trazo(0.9)} cx="24" cy="24" r="18.6" />`;
    case "comandante":
      return `<path ${trazo(1.8)} d="${feston(22, 21)}" />
              <circle ${trazo(0.9)} cx="24" cy="24" r="18.6" />`;
  }
}

/** Un ángulo de estampado, siempre el mismo para el mismo sello: así se estampan. */
export function torcido(id: string): number {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const a = (Math.abs(h) % 13) - 6;
  return a === 0 ? -3 : a;
}

export interface ComoSaleElSello {
  /** Con la tinta de su altura —el álbum— o con la de donde se pinte. */
  readonly tinta?: boolean;
  /** Torcido como sale de un tampón: solo en el álbum. */
  readonly torcido?: boolean;
  /** Clases de más, para donde se pinte. */
  readonly clase?: string;
}

/**
 * **El sello**, en SVG: el aro de su altura y su dibujo dentro.
 *
 * Sin nombre escrito encima, en ningún peldaño: el nombre va debajo en el
 * álbum, desde el peldaño de la palabra, y en la etiqueta para quien no ve.
 */
export function dibujoDelSello(id: Sello, como: ComoSaleElSello = {}): string {
  /*
   * `sello-nombrado` y no `sello` a secas: `.sello` es el logotipo de la
   * granja, con su contorno blanco de pegatina. Ver `ui/marca.ts`.
   */
  const clases = [
    "sello-nombrado",
    como.tinta ? `sello-nombrado--${tramoDe(id)}` : "",
    como.clase ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const giro = como.torcido ? ` transform="rotate(${torcido(id)} 24 24)"` : "";
  return `<svg class="${clases}" viewBox="0 0 48 48" aria-hidden="true" data-sello="${id}">
    <g${giro}>
      ${aro(id)}
      <g transform="translate(6 6) scale(0.9)">${DIBUJO[id]()}</g>
    </g>
  </svg>`;
}

/**
 * **Los dibujos para la tarjeta de señal**, con su nombre de tarjeta: es como
 * se celebran, igual que las gafas. Escritos uno a uno para que el nombre sea
 * un tipo y no una cadena cualquiera: pedir un sello que no existe es un error
 * de compilación, no una tarjeta en blanco. Ver `DIBUJOS` en `senal.ts`.
 */
export const DIBUJOS_DE_LOS_SELLOS = {
  "sello-veve": dibujoDelSello("veve"),
  "sello-karumbe": dibujoDelSello("karumbe"),
  "sello-mainumby": dibujoDelSello("mainumby"),
  "sello-nanduti": dibujoDelSello("nanduti"),
  "sello-tajamar": dibujoDelSello("tajamar"),
  "sello-tres-toques": dibujoDelSello("tres-toques"),
  "sello-primer-solo": dibujoDelSello("primer-solo"),
  "sello-chipa-volandera": dibujoDelSello("chipa-volandera"),
  "sello-jasy": dibujoDelSello("jasy"),
  "sello-mbarete": dibujoDelSello("mbarete"),
  "sello-ruta-jesuitica": dibujoDelSello("ruta-jesuitica"),
  "sello-pettirossi": dibujoDelSello("pettirossi"),
  "sello-planeador": dibujoDelSello("planeador"),
  "sello-manos-de-seda": dibujoDelSello("manos-de-seda"),
  "sello-transchaco": dibujoDelSello("transchaco"),
  "sello-cien-horas": dibujoDelSello("cien-horas"),
} as const satisfies Readonly<Record<`sello-${Sello}`, string>>;

/* ── Lo que dice ──────────────────────────────────────────────────────── */

/** El nombre del sello: «¡Veve!», «Karumbe». */
export const nombreDelSello = (id: Sello): string =>
  t(`explica.sello.${id}.corta` as TranslationKey);

/**
 * La clave de lo que dice la instructora de ese sello: al ganarlo y al
 * tocarlo en el álbum. Es la de su explicación, así que se graba una vez.
 */
export const claveDelSello = (id: Sello): TranslationKey =>
  `explica.sello.${id}.texto` as TranslationKey;

/**
 * **Cada sello, en el registro de las explicaciones**: se abre tocándolo en el
 * álbum, con su dibujo, su nombre desde el peldaño de la palabra, lo que
 * premia desde el de las cifras y la voz si está grabada. Sin rincón: se llega
 * desde el cuaderno.
 */
export function ponerLosSellosEnLasExplicaciones(): void {
  for (const { id } of SELLOS) {
    if (explicacionDe(`sello.${id}`)) continue;
    registrarExplicacion({
      id: `sello.${id}`,
      dibujo: { svg: dibujoDelSello(id, { clase: "ex-trazo" }) },
      corta: `explica.sello.${id}.corta` as TranslationKey,
      texto: claveDelSello(id),
    });
  }
}

/* ── La página ────────────────────────────────────────────────────────── */

/** El hueco de un sello que falta: el sitio, a trazos, y nada dentro. */
export const HUECO = `<svg class="album__vacio" viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="24" r="21.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3.4 3" />
</svg>`;

/**
 * **El álbum**: los dieciséis sitios, por alturas, en el orden del issue. Los
 * ganados con su sello, que se toca para que la instructora cuente qué es;
 * los que faltan, un hueco.
 *
 * Con `conNombres`, el nombre debajo de cada uno ganado: desde el peldaño de
 * la palabra, como el resto del cuaderno.
 */
export function album(ganados: readonly Sello[], conNombres: boolean): string {
  const tramos = (["escuela", "piloto", "comandante"] as const).map((tramo) => {
    const sitios = SELLOS.filter((s) => s.tramo === tramo)
      .map(({ id }) => {
        if (!ganados.includes(id))
          return `<li class="album__sitio album__sitio--hueco" aria-hidden="true">${HUECO}</li>`;
        const nombre = nombreDelSello(id);
        return `<li class="album__sitio">
          <button type="button" class="album__sello" data-sello="${id}" aria-label="${nombre}">
            ${dibujoDelSello(id, { tinta: true, torcido: true })}
            ${conNombres ? `<span class="album__nombre">${nombre}</span>` : ""}
          </button>
        </li>`;
      })
      .join("");
    return `<ul class="album__tramo album__tramo--${tramo}">${sitios}</ul>`;
  });
  return `<div class="album" role="group"
               aria-label="${t("cuaderno.album")}: ${ganados.length} / ${SELLOS.length}">${tramos.join("")}</div>`;
}
