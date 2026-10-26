/**
 * **El caucho de los sellos**: lo que hace que un sello de `ui/sellos.ts` parezca estampado con goma y no impreso.
 *
 * Un sello de verdad no sale nunca perfecto, y una página de sellos perfectos parece una tabla. Hace cuatro cosas, y
 * aquí van todas en una máscara SVG por campo, decidida por una semilla sacada de su id, como la torcedura de
 * `torcido`: el mismo sello sale igual cada vez que se mira.
 *
 * - **La presión desigual**: la mano aprieta más de un lado, y la tinta carga más ahí y menos en el otro (un
 *   degradado lineal de lado a lado, con su propio ángulo).
 * - **Una mancha con poca tinta**: en algún sitio la goma no cogió bastante (una mancha gris suave).
 * - **Los bordes que se comen**: a lo largo del borde, mordiscos donde no llegó la tinta y algún tramo más claro.
 * - **Los poros**: puntitos sin tinta por todas partes.
 *
 * Barato en una tablet: sin filtros, solo degradados, círculos y elipses en una máscara que no cambia nunca, así que
 * el navegador la pinta una vez con el sello. Un centenar de formas pequeñas por sello, unos 6 KB.
 *
 * En `selloDe`, `defs` va dentro del `<svg>` y `mascara` en el `<g>` girado:
 *
 *   const c = caucho(escenario.id, campo.tinta);
 *   `<svg …>${c.defs}<g mask="${c.mascara}" transform="rotate(…)">…</g></svg>`
 *
 * La máscara vive en las coordenadas del sello de 120 × 120 antes de girarlo, para que los mordiscos caigan en su
 * borde.
 */

export type Tinta = "py" | "canarias" | "madrid" | "inventado";

/** Un generador pequeño con semilla (mulberry32), a partir de un hash del id con su propia sal. */
function semilla(id: string): () => number {
  let h = 0x9e3779b9;
  for (const c of `caucho:${id}`) h = Math.imul(h ^ c.charCodeAt(0), 0x85ebca6b) ^ (h >>> 13);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number): string => v.toFixed(1);

/** Un punto del borde de fuera del sello, a una fracción t de la vuelta (las formas de `borde` en sellos.ts). */
function enElBorde(tinta: Tinta, t: number): [number, number] {
  if (tinta === "canarias") {
    const a = t * Math.PI * 2;
    return [60 + 55 * Math.cos(a), 60 + 55 * Math.sin(a)];
  }
  const poly: [number, number][] =
    tinta === "madrid"
      ? [[38, 6], [82, 6], [114, 38], [114, 82], [82, 114], [38, 114], [6, 82], [6, 38]]
      : tinta === "py"
        ? [[6, 12], [114, 12], [114, 108], [6, 108]]
        : [[14, 14], [106, 14], [112, 30], [112, 90], [106, 106], [14, 106], [8, 90], [8, 30]];
  const lens = poly.map((p, i) => Math.hypot(poly[(i + 1) % poly.length]![0] - p[0], poly[(i + 1) % poly.length]![1] - p[1]));
  let d = t * lens.reduce((s, l) => s + l, 0);
  for (let i = 0; i < poly.length; i++) {
    if (d <= lens[i]!) {
      const [x0, y0] = poly[i]!;
      const [x1, y1] = poly[(i + 1) % poly.length]!;
      const f = d / lens[i]!;
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
    }
    d -= lens[i]!;
  }
  return poly[0]!;
}

/** La máscara de un campo: sus `<defs>` y el valor del atributo `mask`. */
export function caucho(id: string, tinta: Tinta): { defs: string; mascara: string } {
  const r = semilla(id);
  const nombre = `caucho-${id.replace(/[^a-z0-9-]/gi, "")}`;
  // La presión: entera de un lado y hasta unos dos tercios del otro, con su propio ángulo.
  const a = r() * Math.PI * 2;
  const [dx, dy] = [Math.cos(a) * 0.5, Math.sin(a) * 0.5];
  const flojo = Math.round(150 + r() * 40); // the grey of the light side: 150–190
  const presion =
    `<linearGradient id="${nombre}-p" x1="${n(0.5 - dx)}" y1="${n(0.5 - dy)}" x2="${n(0.5 + dx)}" y2="${n(0.5 + dy)}">` +
    `<stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#f2f2f2"/>` +
    `<stop offset="1" stop-color="rgb(${flojo},${flojo},${flojo})"/></linearGradient>` +
    `<radialGradient id="${nombre}-m"><stop offset="0" stop-color="#000" stop-opacity="0.45"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
  const piezas: string[] = [`<rect x="-10" y="-10" width="140" height="140" fill="url(#${nombre}-p)"/>`];
  // Una mancha con poca tinta, en algún sitio de dentro.
  piezas.push(`<ellipse cx="${n(30 + r() * 60)}" cy="${n(30 + r() * 60)}" rx="${n(10 + r() * 14)}" ry="${n(6 + r() * 10)}" ` +
    `transform="rotate(${Math.round(r() * 180)} 60 60)" fill="url(#${nombre}-m)"/>`);
  // Los bordes: mordiscos donde no llegó la tinta, y tramos más claros.
  const mordiscos = 12 + Math.floor(r() * 8);
  for (let i = 0; i < mordiscos; i++) {
    // Cada mordisco es un racimo de elipses desiguales, nunca un agujero redondo y limpio.
    const [x, y] = enElBorde(tinta, r());
    const trozos = 2 + Math.floor(r() * 2);
    for (let j = 0; j < trozos; j++) {
      const bx = x + (r() - 0.5) * 3.2;
      const by = y + (r() - 0.5) * 3.2;
      piezas.push(`<ellipse cx="${n(bx)}" cy="${n(by)}" rx="${n(0.8 + r() * 1.8)}" ry="${n(0.5 + r() * 1.1)}" ` +
        `transform="rotate(${Math.round(r() * 180)} ${n(bx)} ${n(by)})" fill="#000" fill-opacity="${n(0.7 + r() * 0.3)}"/>`);
    }
  }
  const tramos = 3 + Math.floor(r() * 3);
  for (let i = 0; i < tramos; i++) {
    const [x, y] = enElBorde(tinta, r());
    piezas.push(`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(5 + r() * 6)}" ry="${n(2 + r() * 2)}" ` +
      `transform="rotate(${Math.round(r() * 180)} ${n(x)} ${n(y)})" fill="#000" fill-opacity="${n(0.35 + r() * 0.25)}"/>`);
  }
  // Los poros: puntitos sin tinta por todas partes, alguno un poco más grande.
  for (let i = 0; i < 44; i++) {
    const big = r() < 0.12;
    piezas.push(`<circle cx="${n(10 + r() * 100)}" cy="${n(10 + r() * 100)}" r="${n(big ? 0.9 + r() * 0.5 : 0.35 + r() * 0.45)}" ` +
      `fill="#000" fill-opacity="${n(0.6 + r() * 0.4)}"/>`);
  }
  const defs = `<defs>${presion}<mask id="${nombre}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="140">` +
    `${piezas.join("")}</mask></defs>`;
  return { defs, mascara: `url(#${nombre})` };
}
