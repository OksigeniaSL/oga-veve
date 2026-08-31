#!/usr/bin/env node
/**
 * El aeródromo visto desde arriba, en caracteres.
 *
 *     node scripts/mapa-aerodromo.mjs pettirossi
 *
 * Existe porque hubo un fallo que costó cuatro intentos deducir desde
 * capturas de la cabina: el avión aparecía fuera del asfalto y desde dentro
 * del juego no había forma de ver **qué estaba girado respecto a qué**.
 *
 * Desde arriba se ve en un vistazo. Marca el pavimento, el eje de la pista,
 * los umbrales y el punto donde arranca el avión, todos en coordenadas del
 * mundo — que es donde tienen que coincidir.
 */

import { createServer } from 'vite';

const id = process.argv[2] ?? 'pettirossi';
const ANCHO = 78;
const ALTO = 38;

const s = await createServer({ root: process.cwd(), server: { middlewareMode: true } });
const { SCENARIOS } = await s.ssrLoadModule('/src/world/scenarios.ts');
const { createAerodrome } = await s.ssrLoadModule('/src/world/aerodrome.ts');

const esc = SCENARIOS.find((e) => e.id === id);
if (!esc?.aerodrome) {
  console.error(`El escenario "${id}" no tiene aeródromo extraído.`);
  process.exit(1);
}

const aero = esc.aerodrome;
const grupo = createAerodrome(aero);

// Triángulos del pavimento, en coordenadas de MUNDO (ya convertidas).
const triangulos = [];
for (const malla of grupo.children) {
  const pos = malla.geometry.attributes.position.array;
  const idx = malla.geometry.index.array;
  for (let i = 0; i < idx.length; i += 3) {
    triangulos.push(
      [0, 1, 2].map((k) => {
        const v = idx[i + k] * 3;
        return [pos[v], pos[v + 2]];
      }),
    );
  }
}

const dentro = ([px, pz], [a, b, c]) => {
  const d = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const d1 = d([px, pz], a, b);
  const d2 = d([px, pz], b, c);
  const d3 = d([px, pz], c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos2 = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos2);
};

// Encuadre: todo el pavimento, con margen.
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (const t of triangulos) for (const [x, z] of t) {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
}
const margen = Math.max(maxX - minX, maxZ - minZ) * 0.08;
minX -= margen; maxX += margen; minZ -= margen; maxZ += margen;

const aCelda = (x, z) => [
  Math.round(((x - minX) / (maxX - minX)) * (ANCHO - 1)),
  Math.round(((z - minZ) / (maxZ - minZ)) * (ALTO - 1)),
];

const lienzo = Array.from({ length: ALTO }, () => Array(ANCHO).fill(' '));

// Pavimento.
for (let fila = 0; fila < ALTO; fila++) {
  const z = minZ + ((maxZ - minZ) * fila) / (ALTO - 1);
  for (let col = 0; col < ANCHO; col++) {
    const x = minX + ((maxX - minX) * col) / (ANCHO - 1);
    if (triangulos.some((t) => dentro([x, z], t))) lienzo[fila][col] = '·';
  }
}

const poner = (x, z, c) => {
  const [col, fila] = aCelda(x, z);
  if (fila >= 0 && fila < ALTO && col >= 0 && col < ANCHO) lienzo[fila][col] = c;
};

// Umbrales, con su designador. La Y del fichero apunta al norte: mundo Z = -Y.
const pista = aero.runways[0];
const umbrales = Object.entries(pista.thresholds).filter(([, u]) => u?.xy);
for (const [nombre, u] of umbrales) poner(u.xy[0], -u.xy[1], nombre[0]);

// Centro de pista según el escenario, y punto de arranque según el juego.
poner(esc.runway.x, esc.runway.z, 'C');

const h = (esc.runway.heading * Math.PI) / 180;
const umbral = umbrales.find(
  ([, u]) => Math.abs((((u.headingTrue ?? 0) - esc.runway.heading + 540) % 360) - 180) < 20,
);
if (umbral) {
  const [ux, uy] = umbral[1].xy;
  poner(ux + Math.sin(h) * 60, -uy - Math.cos(h) * 60, 'A');
}

console.log(`\n${aero.name} — visto desde arriba`);
console.log(`arriba = ${minZ < 0 ? 'norte' : 'sur'} · ${Math.round(maxX - minX)} × ${Math.round(maxZ - minZ)} m\n`);
for (const fila of lienzo) console.log('  ' + fila.join(''));
console.log('\n  · pavimento   C centro de pista del escenario   A arranque del avión');
console.log('  ' + umbrales.map(([n, u]) => `${n[0]} = umbral ${n} (rumbo ${u.headingTrue}°)`).join('   '));
console.log(`\n  escenario: centro (${esc.runway.x.toFixed(0)}, ${esc.runway.z.toFixed(0)}) · rumbo ${esc.runway.heading}°`);

// La medida que decide: ¿cae el arranque dentro del asfalto?
const eje = pista.centerline.map(([x, y]) => [x, -y]);
const alEje = ([px, pz]) => {
  let mejor = Infinity;
  for (let i = 0; i < eje.length - 1; i++) {
    const [ax, az] = eje[i];
    const [bx, bz] = eje[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const l = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
    mejor = Math.min(mejor, Math.hypot(px - (ax + t * dx), pz - (az + t * dz)));
  }
  return mejor;
};

const media = (pista.widthM ?? 45) / 2;
if (umbral) {
  const [ux, uy] = umbral[1].xy;
  const A = [ux + Math.sin(h) * 60, -uy - Math.cos(h) * 60];
  console.log(`  umbral elegido: ${umbral[0]} · arranque en (${A[0].toFixed(0)}, ${A[1].toFixed(0)})`);
  const d = alEje(A);
  console.log(`  distancia del arranque al eje: ${d.toFixed(1)} m  ${d <= media ? '✓ dentro del asfalto' : `✗ FUERA (media anchura ${media.toFixed(1)} m)`}`);
}
const dc = alEje([esc.runway.x, esc.runway.z]);
console.log(`  distancia del centro al eje:   ${dc.toFixed(1)} m  ${dc <= media ? '✓' : '✗ FUERA'}`);

// Y hacia dónde mira el avión respecto a la pista.
const [u0, u1] = umbrales.map(([, u]) => [u.xy[0], -u.xy[1]]);
const rumboPista = (Math.atan2(u1[0] - u0[0], -(u1[1] - u0[1])) * 180) / Math.PI;
console.log(`  rumbo del eje medido en el mundo: ${((rumboPista + 360) % 360).toFixed(1)}° · el escenario dice ${esc.runway.heading}°`);

await s.close();
