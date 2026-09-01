/**
 * Proxy de METAR. Diez líneas para Cloudflare Workers, y son las que faltan.
 *
 *     npx wrangler deploy workers/meteo.js --name oga-veve-meteo
 *
 * ## Por qué hace falta
 *
 * Los METAR mundiales los sirve la NOAA y son **de dominio público** —agencia
 * del gobierno de los Estados Unidos—, así que no hay licencia que negociar ni
 * clave que pedir. Pero su servidor **no manda cabecera CORS**, y sin ella un
 * navegador no le pide nada. Esto la pone.
 *
 * No transforma nada, no guarda nada y no necesita cuenta en ningún sitio: pasa
 * el texto tal cual y lo cachea cinco minutos, que es más o menos lo que tarda
 * un METAR en cambiar.
 *
 * Luego se configura al construir el juego:
 *
 *     VITE_METEO=https://oga-veve-meteo.<lo-que-sea>.workers.dev npm run build
 *
 * Y sin configurarlo el juego vuela igual, con su tiempo de casa. Eso es a
 * propósito: **quien juega en un colegio con la conexión caída tiene que poder
 * despegar**.
 */

const FUENTE = 'https://tgftp.nws.noaa.gov/data/observations/metar/stations';

export default {
  async fetch(peticion) {
    const icao = new URL(peticion.url).searchParams.get('icao') ?? '';
    // Cuatro letras y nada más: esto no es un proxy de propósito general.
    if (!/^[A-Z]{4}$/.test(icao.toUpperCase())) {
      return new Response('icao?', { status: 400 });
    }

    const res = await fetch(`${FUENTE}/${icao.toUpperCase()}.TXT`, {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) return new Response('', { status: 404 });

    // El fichero trae la fecha en la primera línea y el METAR en la segunda.
    const texto = await res.text();
    const metar = texto.split('\n')[1]?.trim() ?? '';

    return new Response(metar, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=300',
      },
    });
  },
};
