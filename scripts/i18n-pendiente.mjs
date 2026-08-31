/**
 * Qué falta por traducir, listo para dárselo a alguien.
 *
 * El diccionario de guaraní es parcial **a propósito**: lo que no está
 * traducido y revisado cae al castellano en vez de enseñar una traducción
 * inventada, que sería peor que no traducir. Pero eso deja al usuario eligiendo
 * Avañe'ẽ y viendo castellano, así que conviene saber exactamente cuánto falta
 * y poder encargarlo.
 *
 * Sale en Markdown para pegarlo en un correo o en un issue. Se genera cada vez
 * en lugar de guardarse en un fichero, porque un fichero de esto se queda
 * viejo a la semana.
 *
 * Uso: `npx tsx scripts/i18n-pendiente.mjs [gug|en] > encargo.md`
 */
import { ES_PY } from '../src/i18n/es-PY.ts';
import { GUG } from '../src/i18n/gug.ts';
import { EN } from '../src/i18n/en.ts';

const idioma = process.argv[2] ?? 'gug';
const dicc = idioma === 'en' ? EN : GUG;
const nombre = idioma === 'en' ? 'inglés' : 'guaraní (avañe’ẽ)';

const claves = Object.keys(ES_PY);
const faltan = claves.filter((k) => !(k in dicc));

/** Dónde sale cada cosa, para que quien traduzca sepa el tono y el sitio. */
const ZONAS = [
  ['hangar.', 'El hangar: la primera pantalla, antes de volar'],
  ['scenario.', 'Nombres de los sitios adonde se vuela'],
  ['hud.', 'Instrumentos en vuelo. **Ojo: los rótulos cortos (IAS, ALT, HDG) no se traducen nunca** — son aeronáuticos y son iguales en todo el mundo'],
  ['tutor.', 'El tutor: la voz que dice qué hacer ahora. Frases muy cortas'],
  ['help.', 'Ayuda y explicaciones'],
  ['teclas.', 'La pantalla de mandos'],
  ['credits.', 'Créditos y licencias'],
  ['language.', 'Selector de idioma'],
  ['sound.', 'Sonido'],
  ['', 'Lo demás'],
];

const zonaDe = (k) => ZONAS.find(([p]) => k.startsWith(p))[1];

console.log(`# Traducción pendiente al ${nombre}`);
console.log();
console.log(
  `Hay **${claves.length} textos** en Óga Veve. En ${nombre} están **${claves.length - faltan.length}** ` +
    `(${Math.round(((claves.length - faltan.length) / claves.length) * 100)} %) y **faltan ${faltan.length}**.`,
);
console.log();
console.log('Reglas de la casa, que importan más que la literalidad:');
console.log();
console.log('- El público **empieza a los cuatro años y no sabe leer**. Los textos son para quien acompaña, o para quien ya lee. Frases cortas.');
console.log('- **Los rótulos aeronáuticos no se traducen**: IAS, ALT, HDG, THR, V/S, BRK. Son iguales en toda la aviación del mundo y aprenderlos es parte del juego.');
console.log('- Las llaves entre `{}` son huecos que rellena el programa y **tienen que quedarse tal cual**.');
console.log('- Si algo no tiene una traducción buena, **mejor dejarlo vacío que forzarlo**: se queda en castellano y no pasa nada.');
console.log();

for (const [, zona] of ZONAS) {
  const enZona = faltan.filter((k) => zonaDe(k) === zona);
  if (!enZona.length) continue;
  console.log(`## ${zona}`);
  console.log();
  console.log('| Clave | Castellano | Traducción |');
  console.log('| --- | --- | --- |');
  for (const k of enZona) {
    const texto = ES_PY[k].replace(/\|/g, '\\|').replace(/\n/g, ' ');
    console.log(`| \`${k}\` | ${texto} | |`);
  }
  console.log();
}
