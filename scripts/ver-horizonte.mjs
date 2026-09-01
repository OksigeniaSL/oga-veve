/**
 * Una foto del horizonte lejano, para comprobar que está donde debe.
 *
 * Coloca el avión en el aire mirando a un punto lejano y lo clava ahí. En
 * Tenerife mira al Teide, que está a treinta y siete kilómetros y medio y es
 * justo lo que el mapa fino no alcanzaba; en Asunción, a la cordillera.
 *
 * Uso: `node scripts/ver-horizonte.mjs [carpeta] [escenario]`
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5219 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage({ viewport: { width: 1280, height: 720 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => {
  localStorage.setItem('oga-veve:teclas-vistas', '1');
  localStorage.setItem('oga-veve:tramo', 'taguato-ruvicha');
});
const ESC = process.argv[3] ?? 'tenerife-norte';
await page.goto(`http://localhost:5219/?escenario=${ESC}`);
await page.waitForTimeout(4000);

/** Adónde mirar en cada sitio, en grados de verdad. */
const MIRAR = {
  // La cumbre del Teide.
  'tenerife-norte': { nombre: 'el Teide', lat: 28.2724, lon: -16.6425, origen: [28.482752, -16.341707] },
  // El cerro Peró, lo más alto de la cordillera de los Altos.
  pettirossi: { nombre: 'la cordillera', lat: -25.4667, lon: -56.9, origen: [-25.239834, -57.518543] },
};
const objetivo = MIRAR[ESC] ?? MIRAR['tenerife-norte'];
const R = 6371000;
const [lat0, lon0] = objetivo.origen;
const k = Math.cos((lat0 * Math.PI) / 180);
const tx = ((objetivo.lon - lon0) * (R * Math.PI * k)) / 180;
const tz = -(((objetivo.lat - lat0) * (R * Math.PI)) / 180);

// Se coloca el avión mirando al volcán y **se clava ahí en cada fotograma**.
// Colocarlo una sola vez no sirve: la física lo suelta y en tres segundos se ha
// caído doscientos metros y ha cambiado de rumbo.
const medido = await page.evaluate(
  async ({ tx, tz, ALTURA }) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const o = globalThis.__oga;
    const s0 = o.estado();
    const px = -287;
    const pz = -372;
    const rumbo = Math.atan2(tx - px, -(tz - pz));
    o.pilotar((c) => {
      const s = o.estado();
      s.position.set(px, ALTURA, pz);
      s.orientation.setFromEuler(new THREE.Euler(0, -rumbo, 0, 'YXZ'));
      s.velocity.set(0, 0, 0);
      c.throttle = 0;
    });
    await new Promise((r) => setTimeout(r, 400));
    return {
      rumboPedido: ((rumbo * 180) / Math.PI + 360) % 360,
      rumboReal: ((o.estado().heading * 180) / Math.PI + 360) % 360,
      km: Math.hypot(tx - px, tz - pz) / 1000,
    };
  },
  { tx, tz, ALTURA: Number(process.argv[4] ?? 1700) },
);
console.log(
  `${ESC}: ${objetivo.nombre} a ${medido.km.toFixed(1)} km · rumbo pedido ${medido.rumboPedido.toFixed(0)}° · el avión mira a ${medido.rumboReal.toFixed(0)}°`,
);

// Un par de segundos para que la cámara de persecución se coloque detrás.
await page.waitForTimeout(2500);
await page.screenshot({ path: `${D}/horizonte-${ESC}.png` });
console.log('captura →', `${D}/horizonte-${ESC}.png`);
await b.close();
await server.close();
