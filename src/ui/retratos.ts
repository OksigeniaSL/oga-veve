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
 * `retratos.test.ts`, con las huellas que el guion guarda en
 * `retratos-huellas.json`.
 *
 * ## Y que no se quede viejo el que se ve
 *
 * Que el del repositorio sea el bueno no basta. Con el retrato nuevo del JAZ
 * 120 ya en el servidor, Enrique seguía viendo el de antes en «¿Con qué
 * volás?»: puntas rectas y sin el terracota. Se llamaba igual que el viejo, y
 * la caché del navegador, la de Cloudflare y la del service worker siguieron
 * dando el viejo. Por eso **cada retrato lleva la huella de su imagen en el
 * nombre** —`jaz-120-9db9a3c8.webp`—, y el nombre se lee de las huellas. Ver
 * `scripts/hacer-retratos.mjs`.
 *
 * Si una no carga, el hangar la quita y queda el nombre del avión, que es
 * peor pero no deja a nadie sin elegir.
 */

import huellas from "./retratos-huellas.json";

/** Dónde están, dentro de `public/`. */
export const CARPETA_DE_RETRATOS = "assets/aeronaves/retratos";

/** El tamaño al que se hacen: el doble del hueco de la tarjeta de tablet. */
export const TAMANO_DE_RETRATO = { ancho: 600, alto: 360 } as const;

/** El fichero del retrato de cada avión, con su huella. */
const FICHEROS: Readonly<Record<string, string | undefined>> = Object.fromEntries(
  Object.entries(huellas as Record<string, { retrato?: string }>).map(([id, h]) => [
    id,
    h.retrato,
  ]),
);

/** La dirección del retrato de un avión de la flota. */
export function retratoDe(id: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const fichero = FICHEROS[id] ?? `${id}.webp`;
  return `${base}${base.endsWith("/") ? "" : "/"}${CARPETA_DE_RETRATOS}/${fichero}`;
}
