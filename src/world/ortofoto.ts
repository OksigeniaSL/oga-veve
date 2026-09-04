/**
 * La ortofoto pública, estirada sobre el relieve.
 *
 * Es la manta del mundo, y sustituye a las teselas fotorrealistas de Google
 * para el terreno. Sale del PNOA del Instituto Geográfico Nacional bajo
 * **CC BY 4.0**, se extrae una vez con `scripts/pnoa-a-ortofoto.mjs` y se
 * versiona: en tiempo de juego no se le pide nada a nadie.
 *
 * Existe por una tarde concreta. Las teselas de Google dejaron de servirse con
 * un «no disponibles para tu cuenta y tu región» y el juego se quedó sin mundo
 * —sin avisar, además, porque caía al mundo dibujado en silencio—. Un
 * simulador que va a estar en aulas paraguayas no puede depender de que una
 * cuenta ajena siga diciendo que sí.
 *
 * ## Lo que se gana y lo que se pierde
 *
 * Se gana independencia, y se gana nitidez desde arriba: a un metro por píxel
 * se ve la pista con su eje y su raya de borde, mejor que la textura de la
 * fotogrametría. Se pierde el volumen — la fotogrametría traía los edificios
 * en tres dimensiones y una ortofoto es plana. La Laguna deja de tener casas
 * con tejado y pasa a ser un dibujo de casas visto desde arriba.
 *
 * Es una pérdida real y se acepta a cambio de que el mundo sea nuestro.
 *
 * ## Dos capas, como el relieve
 *
 * Una fina sobre el aeródromo y otra ancha sobre el escenario, por el mismo
 * motivo que el relieve tiene dos: el detalle que hace falta rodando es
 * absurdo a diez kilómetros, y una sola imagen para las dos cosas o pesa
 * veinte megas o es una acuarela.
 */

import {
  ClampToEdgeWrapping,
  LinearFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";

/** Lo que el extractor deja escrito al lado de cada imagen. */
export interface FichaDeOrtofoto {
  readonly id: string;
  readonly encuadre: "cerca" | "lejos";
  readonly fuente: string;
  readonly licencia: string;
  readonly esquina: { readonly col: number; readonly fila: number };
  readonly origen: { readonly lat: number; readonly lon: number };
  readonly zoom: number;
  readonly metrosPorPixel: number;
  readonly pixeles: { readonly ancho: number; readonly alto: number };
}

export interface Ortofoto {
  readonly textura: Texture;
  readonly ficha: FichaDeOrtofoto;
  /**
   * Dónde cae un punto del mundo dentro de la imagen, de 0 a 1.
   *
   * `x` y `z` en metros del marco local del juego, con la Z hacia el sur.
   */
  uv(x: number, z: number): { u: number; v: number };
}

/*
 * **Los ficheros, con `import.meta.glob`.**
 *
 * Igual que el relieve y las ciudades: así Vite los emite al empaquetar y les
 * pone su huella. Una ruta relativa a `import.meta.url` funciona en desarrollo
 * y desaparece en producción, que es la clase de fallo que solo se ve una vez
 * desplegado.
 */
const IMAGENES = import.meta.glob("../../data/ortho/*.jpg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FICHAS = import.meta.glob("../../data/ortho/*.json", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** El tamaño de una tesela WMTS. Lo mismo que usó el extractor. */
const TESELA = 256;

/**
 * Dónde está un punto del planeta dentro del mosaico de Web Mercator, en
 * píxeles de ese nivel.
 */
function enPixelesDelMundo(lat: number, lon: number, zoom: number) {
  const n = 2 ** zoom * TESELA;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
}

/**
 * Carga una capa de ortofoto, o `undefined` si no la hay.
 *
 * Que falte no puede dejar a nadie sin volar: sin ella el terreno se pinta con
 * sus bandas de color, que es lo que había antes y sigue funcionando.
 */
export async function cargarOrtofoto(
  id: string,
  encuadre: "cerca" | "lejos",
): Promise<Ortofoto | undefined> {
  const nombre = `${id}-${encuadre}`;
  const urlImagen = Object.entries(IMAGENES).find(([k]) =>
    k.endsWith(`/${nombre}.jpg`),
  )?.[1];
  const urlFicha = Object.entries(FICHAS).find(([k]) =>
    k.endsWith(`/${nombre}.json`),
  )?.[1];
  if (!urlImagen || !urlFicha) return undefined;

  try {
    const res = await fetch(urlFicha);
    if (!res.ok) return undefined;
    const ficha = (await res.json()) as FichaDeOrtofoto;

    const textura = await new TextureLoader().loadAsync(urlImagen);
    textura.colorSpace = SRGBColorSpace;
    // Sin repetición: fuera del encuadre se estira el borde, que es mejor que
    // ver el mosaico repetido hasta el horizonte.
    textura.wrapS = ClampToEdgeWrapping;
    textura.wrapT = ClampToEdgeWrapping;
    textura.minFilter = LinearFilter;
    textura.magFilter = LinearFilter;
    textura.generateMipmaps = false;

    /*
     * **De metros del juego a píxeles de la imagen.**
     *
     * El origen del marco local es el punto de referencia del aeródromo, y de
     * él se sabe su sitio exacto en el mosaico. La esquina de la imagen también
     * —la escribe el extractor—, así que el resto es una resta.
     *
     * Y la Z va al revés: en el mundo del juego el norte es la Z negativa, y en
     * un mosaico de mapas la fila crece hacia el sur. Se anulan, así que la V
     * sale directa. Es de las pocas veces en este proyecto que dos convenciones
     * opuestas se cancelan en vez de morderse.
     */
    const centro = enPixelesDelMundo(
      ficha.origen.lat,
      ficha.origen.lon,
      ficha.zoom,
    );
    const esquinaX = ficha.esquina.col * TESELA;
    const esquinaY = ficha.esquina.fila * TESELA;
    const mpp = ficha.metrosPorPixel;

    const uv = (x: number, z: number) => ({
      u: (centro.x - esquinaX + x / mpp) / ficha.pixeles.ancho,
      v: 1 - (centro.y - esquinaY + z / mpp) / ficha.pixeles.alto,
    });

    return { textura, ficha, uv };
  } catch {
    // Sin ortofoto se vuela igual. Ver la cabecera.
    return undefined;
  }
}
