/**
 * El retrato de cada avión de la flota, para el hangar.
 *
 * Elegir avión sin ver el avión es elegir una palabra, y este juego lo eligen
 * niños que no leen: lo que distingue un *Pykasu* de un *Mainumby* es que uno
 * tiene un ala y el otro dos, y eso hay que **verlo**.
 *
 * ## Es el avión que se vuela, fotografiado de antemano
 *
 * El retrato se dibujaba aquí, en el navegador, con la fábrica de siluetas:
 * cajas y cilindros normalizados a once metros y con los colores del hangar,
 * no los del avión. Se veía lo que era — los motores flotando separados del
 * ala, sin piel, sin librea: «esas imágenes de los aviones son cutres». Y lo
 * pagaba el teléfono: un contexto de WebGL y seis aviones montados al abrir
 * «¿Con qué volás?», trescientos milisegundos con la CPU de uno barato.
 *
 * Ahora son imágenes, hechas con `npm run retratos`: el `.glb` de verdad,
 * cargado y vestido por el propio juego —sus colores, el sol entre las hojas
 * en la cola, la firma junto a la puerta— y fotografiado con la tarjeta
 * gráfica. Aquí solo se dice dónde están. Que no se queden viejos lo vigila
 * `retratos.test.ts`, con las huellas que el guion guarda al lado.
 *
 * Si una no carga, el hangar la quita y queda el nombre del avión, que es
 * peor pero no deja a nadie sin elegir.
 */

/** Dónde están, dentro de `public/`. */
export const CARPETA_DE_RETRATOS = "assets/aeronaves/retratos";

/** El tamaño al que se hacen: el doble del hueco de la tarjeta de tablet. */
export const TAMANO_DE_RETRATO = { ancho: 600, alto: 360 } as const;

/** La dirección del retrato de un avión de la flota. */
export function retratoDe(id: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}${base.endsWith("/") ? "" : "/"}${CARPETA_DE_RETRATOS}/${id}.webp`;
}
