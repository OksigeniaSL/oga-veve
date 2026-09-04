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
  /**
   * De qué color es la fotografía en ese punto del mundo, o `null` fuera.
   *
   * Sirve para que lo que se dibuja **encima** del terreno pegue con lo que
   * hay debajo: las casas de la ciudad procedimental eran cajas claras sobre
   * una fotografía, y un barrio blanco sobre un tejado rojo se ve a un
   * kilómetro. Tomando el color del suelo, la caja deja de ser un añadido y
   * pasa a ser el volumen de lo que ya se veía plano.
   */
  color(x: number, z: number): { r: number; g: number; b: number } | null;
  /**
   * Hasta dónde llega la fotografía, en metros del mundo.
   *
   * Lo necesita la capa fina: se dibuja como una manta recortada sobre el
   * aeródromo, y una manta hay que saber dónde acaba. La ancha no lo usa
   * porque se estira sobre el relieve entero.
   */
  readonly limites: {
    readonly x0: number;
    readonly x1: number;
    readonly z0: number;
    readonly z1: number;
  };
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

    /*
     * **Y una copia pequeña en un lienzo, para poder mirarla desde el código.**
     *
     * La textura vive en la tarjeta gráfica y desde JavaScript no se lee. Para
     * saber de qué color es el suelo en un punto hace falta una copia en un
     * lienzo, y no hace falta que sea grande: se usa para teñir casas, no para
     * pintar el mundo. A doscientos cincuenta y seis de lado son dos décimas
     * de mega y basta y sobra — el color medio de una manzana no cambia porque
     * se mire con más detalle.
     */
    const LADO = 256;
    let datos: ImageData | null = null;
    try {
      const lienzo = document.createElement("canvas");
      lienzo.width = LADO;
      lienzo.height = LADO;
      const g = lienzo.getContext("2d", { willReadFrequently: true });
      if (g && textura.image) {
        g.drawImage(textura.image as CanvasImageSource, 0, 0, LADO, LADO);
        datos = g.getImageData(0, 0, LADO, LADO);
      }
    } catch {
      // Sin lienzo se sigue: lo que se dibuja encima usa sus colores de siempre.
    }

    const color = (x: number, z: number) => {
      if (!datos) return null;
      const { u, v } = uv(x, z);
      if (u < 0 || u > 1 || v < 0 || v > 1) return null;
      const cx = Math.min(LADO - 1, Math.max(0, Math.floor(u * LADO)));
      // La V del mundo de las texturas va de abajo arriba; la de un lienzo, al
      // revés. Aquí sí se muerden, así que hay que darle la vuelta.
      const cy = Math.min(LADO - 1, Math.max(0, Math.floor((1 - v) * LADO)));
      const i = (cy * LADO + cx) * 4;
      return {
        r: datos.data[i]! / 255,
        g: datos.data[i + 1]! / 255,
        b: datos.data[i + 2]! / 255,
      };
    };

    /*
     * **Los bordes, deshaciendo la cuenta de arriba.**
     *
     * La esquina del mosaico cae donde cae —es un borde de tesela, no el
     * aeródromo— así que la imagen no está centrada en el origen y no vale
     * suponer «medio lado a cada lado». Se despeja de la misma fórmula: la Z
     * pequeña es el norte, que en la imagen es la fila cero.
     */
    const dx = centro.x - esquinaX;
    const dy = centro.y - esquinaY;
    const limites = {
      x0: -dx * mpp,
      x1: (ficha.pixeles.ancho - dx) * mpp,
      z0: -dy * mpp,
      z1: (ficha.pixeles.alto - dy) * mpp,
    };

    return { textura, ficha, uv, color, limites };
  } catch {
    // Sin ortofoto se vuela igual. Ver la cabecera.
    return undefined;
  }
}
