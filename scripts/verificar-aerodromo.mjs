/**
 * Revisión visual y métrica de un aeródromo, en el navegador de verdad.
 *
 * Nació de una tarde entera deduciendo de capturas de cabina por qué la
 * pintura salía torcida. Desde el suelo no se ve un aeródromo: se ve un trozo
 * de pista. Esto lo mira desde arriba y, sobre todo, **lo mide**.
 *
 * Tres cosas, y las tres hacían falta:
 *
 * - **Cuántas llamadas de dibujo cuesta.** El test de presupuesto corre en
 *   Node, donde no hay `canvas`, así que no ve las mallas con textura —los
 *   rótulos de rodadura, los designadores—. Aquí sí se ven.
 * - **Si la pintura está centrada en el asfalto.** Medida en los ejes de la
 *   pista, no a ojo. Tres veces salieron descentradas las rayas y las tres se
 *   descubrieron mirando, que es tarde y caro.
 * - **Dos imágenes**: el aeródromo entero desde arriba y un acercamiento a un
 *   rótulo, que a escala de aeródromo mide dos píxeles.
 *
 * Uso: `node scripts/verificar-aerodromo.mjs`
 */

import { chromium } from 'playwright';
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const server = await createServer({ root: process.cwd(), server: { port: 5191 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage();
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.goto('http://localhost:5191/?escenario=valle-cordillera');

for (const id of ['sgas', 'gcxo']) {
  const r = await page.evaluate(async (id) => {
    const { createAerodrome } = await import('/src/world/aerodrome.ts');
    const aero = await (await fetch(`/data/aerodromes/${id}.aero.json`)).json();
    const grupo = createAerodrome(aero, 0);
    let llamadas = 0;
    let triangulos = 0;
    let letreros = null;
    grupo.traverse((o) => {
      if (!o.geometry) return;
      llamadas++;
      const g = o.geometry;
      triangulos += (g.index ? g.index.count : g.attributes.position.count) / 3;
      if (o.name === 'letreros') {
        letreros = { rotulos: g.attributes.position.count / 4, tieneAtlas: !!o.material.map };
      }
    });
    const refs = [...new Set(aero.taxiways.map((t) => t.ref).filter(Boolean))];

    // ¿Está la pintura centrada en el asfalto? A ojo no se sabe: se mide la
    // separación de cada malla respecto al eje de la pista, en los ejes de la
    // propia pista. Es la comprobación que faltó las tres veces que las rayas
    // salieron descentradas.
    const { enEjesDePista } = await import('/src/world/rumbo.ts');
    const pista = aero.runways[0];
    const ejeA = pista.centerline[0];
    const ejeB = pista.centerline[pista.centerline.length - 1];
    const rumbo = ((Math.atan2(ejeB[0] - ejeA[0], ejeB[1] - ejeA[1]) * 180) / Math.PI + 360) % 360;
    const cx = (ejeA[0] + ejeB[0]) / 2;
    const cz = -(ejeA[1] + ejeB[1]) / 2;
    const anchos = {};
    grupo.traverse((o) => {
      if (!o.geometry || !o.geometry.attributes.position) return;
      if (o.name !== 'pintura') return;
      const q = o.geometry.attributes.position;
      for (let i = 0; i < q.count; i++) {
        const e = enEjesDePista(q.getX(i), q.getZ(i), cx, cz, rumbo);
        // Tres franjas: el centro de la pista, y las dos cabeceras, donde
        // están las teclas de piano —que son las que se salieron del asfalto.
        const zona =
          Math.abs(e.along) < 900 ? 'centro' : e.along > 0 ? 'cabecera lejana' : 'cabecera cercana';
        const z = (anchos[zona] ??= [Infinity, -Infinity]);
        z[0] = Math.min(z[0], e.across);
        z[1] = Math.max(z[1], e.across);
      }
    });

    // Y una vista cenital, que es la única forma de ver de un vistazo si el
    // amarillo va por donde debe. Las capturas de cabina no valen para esto:
    // desde el suelo no se ve más que un trozo de pista.
    const THREE = await import('/node_modules/three/build/three.module.js');
    const escena = new THREE.Scene();
    escena.background = new THREE.Color(0x2a3a22);
    escena.add(grupo);
    escena.add(new THREE.AmbientLight(0xffffff, 2.4));
    const caja = new THREE.Box3().setFromObject(grupo);
    const t = caja.getSize(new THREE.Vector3());
    const c = caja.getCenter(new THREE.Vector3());
    const r = Math.max(t.x, t.z) / 2 + 60;
    const cam = new THREE.OrthographicCamera(-r, r, r, -r, 1, 20000);
    cam.position.set(c.x, 4000, c.z);
    cam.lookAt(c.x, 0, c.z);
    const lienzo = document.createElement('canvas');
    lienzo.width = 1100;
    lienzo.height = 1100;
    const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
    render.setSize(1100, 1100, false);
    render.render(escena, cam);
    const png = lienzo.toDataURL('image/png');

    // Y un acercamiento a un rótulo, porque a escala de aeródromo un cuadrado
    // de seis metros mide dos píxeles y no se puede juzgar nada.
    let zoom = null;
    const rotulo = grupo.getObjectByName('letreros');
    if (rotulo) {
      const p = rotulo.geometry.attributes.position;
      const z = 120;
      const camZ = new THREE.OrthographicCamera(-z, z, z, -z, 1, 20000);
      camZ.position.set(p.getX(0), 4000, p.getZ(0));
      camZ.lookAt(p.getX(0), 0, p.getZ(0));
      render.render(escena, camZ);
      zoom = lienzo.toDataURL('image/png');
    }
    render.dispose();

    return { llamadas, triangulos: Math.round(triangulos), letreros, refs, png, zoom, anchos, ancho: pista.widthM };
  }, id);
  console.log(
    `${id.toUpperCase()}: ${r.llamadas} llamadas · ${r.triangulos} triángulos · ` +
      `letras en OSM: ${r.refs.join(' ')}`,
  );
  console.log(
    r.letreros
      ? `  ✓ ${r.letreros.rotulos} rótulos pintados en 1 llamada, atlas: ${r.letreros.tieneAtlas}`
      : '  ✗ sin letreros',
  );
  console.log(`  ancho de pista: ${r.ancho} m → el eje debería quedar en ±${r.ancho / 2}`);
  for (const [n, [a0, b0]] of Object.entries(r.anchos)) {
    const a = Math.round(a0 * 10) / 10;
    const b = Math.round(b0 * 10) / 10;
    const desvio = Math.round(((a + b) / 2) * 10) / 10;
    const fuera = Math.max(-a, b) > r.ancho / 2;
    console.log(
      `    ${n.padEnd(16)} de ${a} a ${b} m · centro ${desvio} m ` +
        `${Math.abs(desvio) > 0.6 ? '✗ descentrado' : fuera ? '✗ se sale del asfalto' : '✓'}`,
    );
  }
  const salida = `/tmp/claude-1000/-home-eraorahan-Downloads-flyjazz/b3dbfc3e-0835-4131-92f8-19dd24f3f2e3/scratchpad/cenital-${id}.png`;
  writeFileSync(salida, Buffer.from(r.png.split(',')[1], 'base64'));
  console.log(`  vista cenital → ${salida}`);
  if (r.zoom) {
    const cerca = salida.replace('cenital-', 'cerca-');
    writeFileSync(cerca, Buffer.from(r.zoom.split(',')[1], 'base64'));
    console.log(`  acercamiento  → ${cerca}`);
  }
}

await b.close();
await server.close();
