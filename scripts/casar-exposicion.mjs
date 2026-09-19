/**
 * Casar la exposición del horizonte con la del mapa fino.
 *
 * ## Lo que se veía
 *
 * Contado jugando, con foto, dos veces: «las ortofotos siguen mal», «estas
 * ortofotos no es que estén muy bien». Y no era la nitidez: era **un cuadrado
 * dibujado en el suelo**. El mapa fino de dieciséis kilómetros y el anillo del
 * horizonte son dos fotografías distintas del mismo sitio —distinto vuelo,
 * distinto día, distinta compresión— y se juntan a tope, sin transición.
 *
 * Medido sobre el trozo que las dos cubren, en luminancia:
 *
 *   Fuerteventura   76,8 contra 112,2   ·  el horizonte un 47 % más claro
 *   Gran Canaria    72,8 contra 103,6   ·  un 42 %
 *   Tenerife Sur    63,4 contra  86,3   ·  un 36 %
 *   La Palma        48,1 contra  66,4   ·  un 38 %
 *   Lanzarote       55,1 contra  72,5   ·  un 32 %
 *
 * Nadie ve un 5 % de diferencia de exposición. Un 40 % se ve desde el aire
 * como una isla oscura dentro de un mar claro, con el borde recto.
 *
 * ## Lo que hace
 *
 * Mide la media de cada canal en el trozo común —el centro de la foto del
 * horizonte, recortado justo a lo que cubre la del mapa fino— y escribe en la
 * ficha del horizonte cuánto hay que multiplicarla para que las dos midan lo
 * mismo. El juego lo aplica al material, que es una multiplicación gratis.
 *
 * **Se corrige el horizonte y no el mapa fino**, por dos motivos: el fino es
 * el que se mira de cerca y es el que manda, y la corrección sale siempre
 * menor que uno —oscurecer— que es lo único que sabe hacer el color de un
 * material sin tocar la textura.
 *
 * ## Cómo se usa
 *
 *   node scripts/casar-exposicion.mjs            # todos
 *   node scripts/casar-exposicion.mjs la-palma   # uno
 *   node scripts/casar-exposicion.mjs --ver      # solo mide, no escribe
 *
 * Hace falta `ffmpeg`, como el extractor. Corre aquí una vez y lo que se
 * versiona es el número.
 */

import { spawn } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const CARPETA = 'data/ortho';

/**
 * Hasta dónde se deja oscurecer el horizonte.
 *
 * Medio es mucho más de lo que hace falta —el peor caso medido pide 0,68— y
 * está para que un fichero raro no apague el paisaje entero sin que nadie se
 * entere. Si alguna vez topa, el problema es la foto, no esto.
 */
const LO_MAS_OSCURO = 0.5;

/** Media de cada canal en un recorte central, en fracción del lado. */
function media(ruta, fraccion) {
  return new Promise((ok, mal) => {
    const filtro = `crop=iw*${fraccion}:ih*${fraccion},scale=64:64`;
    const p = spawn('ffmpeg', [
      '-hide_banner', '-v', 'error', '-i', ruta,
      '-vf', filtro, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
    ]);
    const trozos = [];
    p.stdout.on('data', (d) => trozos.push(d));
    p.on('error', mal);
    p.on('close', (codigo) => {
      if (codigo !== 0) return mal(new Error(`ffmpeg ${codigo} con ${ruta}`));
      const b = Buffer.concat(trozos);
      let r = 0, g = 0, a = 0;
      for (let i = 0; i < b.length; i += 3) { r += b[i]; g += b[i + 1]; a += b[i + 2]; }
      const n = b.length / 3;
      return ok([r / n, g / n, a / n]);
    });
  });
}

const luminancia = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const args = process.argv.slice(2);
const soloVer = args.includes('--ver');
const pedidos = args.filter((a) => !a.startsWith('--'));

const ficheros = await readdir(CARPETA);
const ids = [...new Set(
  ficheros
    .filter((f) => f.endsWith('-horizonte.json'))
    .map((f) => f.replace('-horizonte.json', '')),
)].filter((id) => pedidos.length === 0 || pedidos.includes(id));

let escritos = 0;
for (const id of ids.sort()) {
  const finaRuta = `${CARPETA}/${id}-lejos.json`;
  let fina;
  try { fina = JSON.parse(await readFile(finaRuta, 'utf8')); } catch {
    console.log(`${id.padEnd(18)} sin mapa fino: no hay con qué casar`);
    continue;
  }
  const lejosFicha = `${CARPETA}/${id}-horizonte.json`;
  const lejos = JSON.parse(await readFile(lejosFicha, 'utf8'));

  // El trozo que las dos cubren: el centro del horizonte, recortado a lo que
  // abarca la foto fina. Las dos están centradas en el mismo punto.
  const fraccion = fina.tamanoM / lejos.tamanoM;
  const aqui = await media(`${CARPETA}/${id}-lejos.jpg`, 0.999);
  const alli = await media(`${CARPETA}/${id}-horizonte.jpg`, fraccion);

  const crudo = luminancia(aqui) / luminancia(alli);
  const exposicion = Math.round(Math.min(1, Math.max(LO_MAS_OSCURO, crudo)) * 1000) / 1000;
  /*
   * Y se escribe también cuando sale exactamente uno. Comparando contra «uno
   * por defecto», las dos fotos que ya casaban se quedaban sin campo en la
   * ficha, y entonces no hay manera de distinguir «medido y no hace falta» de
   * «nadie lo ha medido todavía». La comprobación de que cada horizonte lleva
   * el suyo depende de eso.
   */
  const antes = lejos.exposicion;
  console.log(
    `${id.padEnd(18)} fino ${luminancia(aqui).toFixed(1).padStart(6)}` +
    ` · horizonte ${luminancia(alli).toFixed(1).padStart(6)}` +
    ` · ×${exposicion.toFixed(3)}${exposicion !== antes ? '  (cambia)' : ''}`,
  );
  if (soloVer || exposicion === antes) continue;
  await writeFile(lejosFicha, `${JSON.stringify({ ...lejos, exposicion }, null, 2)}\n`);
  escritos++;
}
if (!soloVer) console.log(`\n${escritos} ficha(s) escritas.`);
