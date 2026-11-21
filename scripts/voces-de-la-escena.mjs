/**
 * **Lo que dice una escena de pasaje, para los bancos** (H52): qué de lo que sonó en la boca es
 * de la escena y qué es una voz ajena. Lo usan `verificar-inicio-3.mjs` y `verificar-inicio-4.mjs`,
 * y lo prueba `voces-de-la-escena.test.mjs` contra la clave que pone el juego.
 *
 * Vive aparte porque cada banco tenía su copia y solo se arregló una. Desde que la llamada de cabina
 * pide turno en la boca (H29k, fa1d5084), delante de cada anuncio a la tripulación —y del de después
 * de aterrizar— suena en lo hablado una clave propia, `llamada:comandante.aproximacion`: es el
 * principio del anuncio, el tono de la megafonía. El banco de la tercera escena lo aprendió el mismo
 * día (a40a2fcf); el del vuelo largo, no, y contaba como voz ajena la llamada de los dos anuncios de
 * su guion que la llevan, la aproximación y la llegada.
 *
 * Y una llamada es de la escena solo si detrás suena su anuncio: un tono sin su voz, u otra voz
 * detrás de él, no es el anuncio de nadie.
 */

/** Lo que lleva delante la clave de una llamada en la boca: `laLlamadaDe` en `src/audio/tonos-de-cabina.ts`. */
export const DE_UNA_LLAMADA = "llamada:";

/** Las claves que dice la escena: las suyas, los anuncios de la megafonía y lo de la ventanilla. */
const DE_LA_ESCENA = /^(inicio\.|comandante\.|tripulacion\.|ventanilla)/;

/** La clave de una línea de lo hablado o de lo descartado, sin la hora delante: «748.6s llamada:…». */
export const sinLaHora = (linea) => String(linea).replace(/^\S+s /, "");

/**
 * La clave sin sus formas ni su receta: `tripulacion.llegada@…~3` es `tripulacion.llegada`. La voz
 * suena con la receta del día detrás y su llamada pide turno con la clave del anuncio a secas; es
 * `baseDeLaClave` en `game.ts`.
 */
export const baseDeLaClave = (clave) => clave.replace(/[@~].*$/, "");

/** El anuncio de una llamada, o `null` si la clave no es de una. */
export const anuncioDeLaLlamada = (clave) => (clave.startsWith(DE_UNA_LLAMADA) ? clave.slice(DE_UNA_LLAMADA.length) : null);

/**
 * **Si una clave de la boca es de la escena**: lo que dice, y la llamada de cabina de uno de sus
 * anuncios. Vale también para lo descartado, que lleva la clave delante del porqué.
 */
export function esDeLaEscena(clave) {
  return DE_LA_ESCENA.test(anuncioDeLaLlamada(clave) ?? clave);
}

/**
 * **Lo que sonó y no es de la escena**, de lo hablado tal como lo da la sonda (`"12.3s clave"`):
 * lo que no es suyo, y la llamada que no lleva detrás su anuncio. La voz va detrás de su tono sin
 * que nadie se meta en medio —la boca la pide antes de soltar el tono: `pedirLaLlamada`—, así que
 * es lo siguiente que suena.
 */
export function vocesAjenas(habladas) {
  const claves = habladas.map(sinLaHora);
  return habladas.filter((linea, i) => {
    const clave = claves[i];
    if (!esDeLaEscena(clave)) return true;
    const anuncio = anuncioDeLaLlamada(clave);
    return anuncio !== null && baseDeLaClave(claves[i + 1] ?? "") !== baseDeLaClave(anuncio);
  });
}

/** Las llamadas que sonaron, cada una con lo que sonó detrás: para el detalle del banco. */
export function llamadasConLoDeDetras(habladas) {
  const claves = habladas.map(sinLaHora);
  return habladas
    .map((linea, i) => ({ linea, anuncio: anuncioDeLaLlamada(claves[i]), detras: claves[i + 1] ?? "nada" }))
    .filter((l) => l.anuncio !== null)
    .map((l) => `${l.linea} → ${l.detras}`);
}
