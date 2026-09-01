/**
 * La prueba: el mundo fotorrealista de Google debajo de nuestros aeropuertos.
 *
 * Tres preguntas y nada más. ¿Tiene Asunción edificios fotogramétricos o solo
 * relieve? ¿A cuántos fotogramas va? ¿Y qué pinta tiene el asfalto que hemos
 * construido a mano puesto encima del mundo de verdad?
 *
 *     npx vite --port 5173
 *     → http://localhost:5173/spike/mundo-real.html?sitio=sgas
 *
 * La atribución de Google **es obligatoria** y la recoge el propio plugin tesela
 * a tesela: hay que pintarla siempre, y por eso está en la esquina desde la
 * primera versión de esta prueba y no como un apaño posterior.
 */

import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { TilesRenderer, WGS84_ELLIPSOID } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/core/plugins';

/** Dónde mirar. Las coordenadas son las de los aeródromos que ya tenemos. */
const SITIOS = {
  sgas: { nombre: 'Silvio Pettirossi', lat: -25.24016, lon: -57.51923, suelo: 89, rumbo: 192 },
  gcxo: { nombre: 'Tenerife Norte', lat: 28.482752, lon: -16.341707, suelo: 633, rumbo: 291 },
  // Un control: una ciudad que seguro tiene fotogrametría, para saber
  // distinguir «aquí no hay datos» de «esto está roto».
  madrid: { nombre: 'Madrid-Barajas', lat: 40.4936, lon: -3.5668, suelo: 610, rumbo: 140 },
  // Y a ras: es a baja altura donde se ve si hay volumen o solo una alfombra.
  'asuncion-bajo': { nombre: 'Asunción centro', lat: -25.282, lon: -57.635, suelo: 60, rumbo: 90 },
  'madrid-bajo': { nombre: 'Madrid centro', lat: 40.4168, lon: -3.7038, suelo: 650, rumbo: 90 },
  'laguna-bajo': { nombre: 'La Laguna', lat: 28.4874, lon: -16.3159, suelo: 545, rumbo: 90 },
};

const q = new URLSearchParams(location.search);
const sitio = SITIOS[q.get('sitio') ?? 'sgas'] ?? SITIOS.sgas;
const altura = Number(q.get('alt') ?? 700);
const clave = import.meta.env.VITE_GOOGLE_TILES;

const estado = document.getElementById('estado');
const credito = document.getElementById('credito');

if (!clave) {
  estado.textContent = 'Falta VITE_GOOGLE_TILES en .env';
  throw new Error('sin clave');
}

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const escena = new Scene();
// Luz de las cinco y media, que es la hora que propuse en la dirección de arte.
const sol = new DirectionalLight(0xfff0dd, 2.2);
sol.position.set(-1, 0.55, -0.4);
escena.add(sol);
escena.add(new HemisphereLight(0xbcd6ea, 0x6b6350, 1.1));

const camara = new PerspectiveCamera(62, innerWidth / innerHeight, 30, 260000);
escena.add(camara);

const teselas = new TilesRenderer();
teselas.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: clave }));
teselas.setCamera(camara);
teselas.setResolutionFromRenderer(camara, renderer);
escena.add(teselas.group);

/*
 * **Se coloca la cámara, no el mundo.**
 *
 * Las teselas vienen en coordenadas de la Tierra —centro del planeta en el
 * origen, ejes fijos—, así que aquí no hay un «suelo» donde poner nada: hay que
 * calcular el punto de la superficie y mirar desde arriba. Ese es exactamente
 * el trabajo que habrá que hacer en el juego para casar nuestro aeropuerto con
 * el mundo, y por eso esta prueba lo hace ya.
 */
const suelo = new Vector3();
const ojo = new Vector3();
WGS84_ELLIPSOID.getCartographicToPosition(
  MathUtils.degToRad(sitio.lat),
  MathUtils.degToRad(sitio.lon),
  sitio.suelo,
  suelo,
);
// Un punto atrás en el rumbo de la pista y arriba: la vista de la aproximación.
const atras = Number(q.get('atras') ?? 2600);
const rad = MathUtils.degToRad(sitio.rumbo);
// Norte y este locales, para desplazarse en metros sobre la superficie.
const arriba = suelo.clone().normalize();
const norte = new Vector3(0, 0, 1).sub(arriba.clone().multiplyScalar(arriba.z)).normalize();
const este = new Vector3().crossVectors(norte, arriba).normalize();
ojo
  .copy(suelo)
  .addScaledVector(norte, -Math.cos(rad) * atras)
  .addScaledVector(este, -Math.sin(rad) * atras)
  .addScaledVector(arriba, altura);
camara.position.copy(ojo);
camara.up.copy(arriba);
camara.lookAt(suelo);
camara.updateMatrixWorld();

let cuadros = 0;
let desde = performance.now();
let fps = 0;

function bucle() {
  requestAnimationFrame(bucle);
  camara.updateMatrixWorld();
  teselas.update();
  renderer.render(escena, camara);

  cuadros++;
  const ahora = performance.now();
  if (ahora - desde > 500) {
    fps = Math.round((cuadros * 1000) / (ahora - desde));
    cuadros = 0;
    desde = ahora;
  }

  const g = teselas.group;
  const stats = teselas.stats ?? {};
  estado.textContent =
    `${sitio.nombre}  ${sitio.lat.toFixed(4)}, ${sitio.lon.toFixed(4)}\n` +
    `altura ${altura} m · ${fps} fps\n` +
    `teselas visibles ${stats.visible ?? '?'} · activas ${stats.active ?? '?'}\n` +
    `descargando ${stats.downloading ?? '?'} · analizando ${stats.parsing ?? '?'}\n` +
    `objetos en el grupo ${g.children.length}`;

  // La atribución que exige Google, tesela a tesela.
  const attr = teselas.getAttributions?.() ?? [];
  credito.textContent = attr.map((a) => a.value).join(' · ');
}
bucle();

addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  teselas.setResolutionFromRenderer(camara, renderer);
});

// Para las comprobaciones desde fuera.
globalThis.__spike = { teselas, camara, fps: () => fps };
